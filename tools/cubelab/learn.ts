// mtg-table — the cube lab: learn card values and pair synergy from game outcomes.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// `tools/cubelab.sh learn <run-dir...> --cube <cube.md> --out <ratings.tsv>`
// (D301).  Pure: drafts.jsonl records in, a fitted model and two TSVs out.  No
// engine, no network, no LLM, no dependency — a regularised logistic model in
// plain TypeScript, solved by Newton's method with a Cholesky factorisation, so
// the same records always give the same numbers.
//
// THE MODEL.  Every decisive game is one observation y = 1 when seat A won.
// The two decks enter antisymmetrically, the opponent's deck as negative
// features:
//
//   logit P(A wins) = beta * play            (+1 when A was on the play, -1 when B was)
//                   + alpha * (sum z_c over A's deck - sum z_c over B's)    the PRIOR
//                   + sum delta_c over A's deck - sum delta_c over B's     card values
//                   + sum s_p over A's pairs    - sum s_p over B's pairs   pair synergy
//
// z_c is the card's prior rating standardised over the cube (the ratings TSV
// the drafts used — Forge's ranks unless edited), so alpha says how well the
// prior predicts wins, and delta_c is how much better (or worse) the card did
// than its prior says.  delta_c ~ N(0, tauCard^2) and s_p ~ N(0, tauPair^2):
// an L2 penalty that is a Gaussian prior, so a card seen in four games stays
// near its prior and one seen in four hundred moves as far as the games say.
// Pairs are only the most frequent co-occurring nonland pairs (at least
// `minPairGames` decisive games together, at most `maxPairs`), because a pair
// seen twice says nothing.  Basic lands are not features.
//
// AI-LIMITED cards (Forge's AI:RemAIDeck) keep delta = 0 and are in no pair:
// Forge's AI plays them poorly or not at all, so their outcome is a fact about
// the AI and not the card (D301).  Every output marks them.
//
// THE OUTPUT.  A ratings TSV the lab already reads (`--ratings`): rating =
// prior + pointsPerLogit * delta (the prior's own columns kept, plus the
// evidence), and a synergy TSV (`--synergy`): pair points = pointsPerLogit *
// s_p.  Cards never seen in a decisive game stay at their prior and say so.
// Every number the fit decides by is a field of LearnOptions, recorded in the
// TSV headers and in learn.json.

import type { DraftRecord } from './run.ts';

export { pairPoints, parseSynergy, type PairTable } from './pairs.ts';

// ------------------------------------------------------------ options

export interface LearnOptions {
  /** Prior SD of a card's deviation from its rating, in logits per copy in a deck. */
  tauCard: number;
  /** Prior SD of a pair's synergy, in logits. */
  tauPair: number;
  /** Prior SD of alpha (logits per prior-rating SD per card) and of the play/draw term: weak. */
  tauFixed: number;
  /** A pair is a feature only with at least this many decisive games in one deck together. */
  minPairGames: number;
  /** At most this many pair features (the most frequent first). */
  maxPairs: number;
  /**
   * Rating points per logit when a learned value is written back as a rating.
   * 0 = auto: the prior's own exchange rate, ratingSD / alpha, when alpha is
   * at least two SDs above 0 (clamped to [autoMin, autoMax]); otherwise `fallback`.
   */
  pointsPerLogit: number;
  pointsPerLogitMin: number;
  pointsPerLogitMax: number;
  pointsPerLogitFallback: number;
  /** A pair is written to the synergy TSV only when |points| is at least this. */
  minPairPoints: number;
  /** Newton's method: at most this many steps, stopping when no parameter moves more than `tol`. */
  maxIter: number;
  tol: number;
  /** Cross-validation folds (by draft) for the honest held-out check; 0 = none. */
  folds: number;
}

export const DEFAULT_LEARN: LearnOptions = {
  tauCard: 0.25,
  tauPair: 0.15,
  tauFixed: 10,
  minPairGames: 8,
  maxPairs: 300,
  pointsPerLogit: 0,
  pointsPerLogitMin: 50,
  pointsPerLogitMax: 400,
  pointsPerLogitFallback: 150,
  minPairPoints: 1,
  maxIter: 50,
  tol: 1e-7,
  folds: 5,
};

export function mergeLearn(base: LearnOptions, over: Record<string, unknown>): LearnOptions {
  const out: LearnOptions = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (!(k in base)) throw new Error(`unknown learn option "${k}" (known: ${Object.keys(base).join(', ')})`);
    const n = typeof v === 'string' ? Number(v) : v;
    if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`learn option ${k} must be a number, got ${String(v)}`);
    (out as unknown as Record<string, number>)[k] = n;
  }
  return out;
}

// ------------------------------------------------------------ data

export const BASICS = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes',
  'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp', 'Snow-Covered Mountain', 'Snow-Covered Forest']);

/** One decisive game: the two played decks (nonbasic names), who was on the play, who won. */
export interface Game {
  /** Which draft it came from (folds split by this). */
  draft: string;
  a: string[];
  b: string[];
  aOnPlay: boolean;
  aWon: boolean;
}

/** A card the model knows: its prior rating and whether its outcomes are trusted. */
export interface PriorCard {
  name: string;
  rating: number;
  /** The prior TSV's forge and source columns, kept. */
  forge: string;
  source: string;
  aiLimited: boolean;
  land: boolean;
}

/** The deck a drafter played: the lab's, or Forge's builder's. */
export function playedDeck(dr: DraftRecord['drafters'][number]): Array<[number, string]> | null {
  if (dr.played === 'lab' && dr.deck) return dr.deck.main;
  return dr.forge?.main ?? null;
}

/** Every decisive game of these records (draws, timeouts and engine errors are left out). */
export function gamesOf(recs: DraftRecord[], tag = ''): Game[] {
  const out: Game[] = [];
  for (const r of [...recs].sort((x, y) => x.seed - y.seed)) {
    const da = playedDeck(r.drafters[0]);
    const db = playedDeck(r.drafters[1]);
    if (!da || !db) continue;
    const names = (d: Array<[number, string]>): string[] => [...new Set(d.filter(([, n]) => !BASICS.has(n)).map(([, n]) => n))].sort();
    const a = names(da);
    const b = names(db);
    for (const g of r.match.games) {
      if (g.winner !== 'A' && g.winner !== 'B') continue;
      out.push({ draft: `${tag}${r.seed}`, a, b, aOnPlay: g.onPlay === 'A', aWon: g.winner === 'A' });
    }
  }
  return out;
}

// ------------------------------------------------------------ linear algebra

/** In-place Cholesky of a symmetric positive-definite n x n matrix (row-major); returns L in the lower triangle. */
export function cholesky(a: Float64Array, n: number): Float64Array {
  const l = new Float64Array(n * n);
  for (let j = 0; j < n; j++) {
    let d = a[j * n + j] as number;
    for (let k = 0; k < j; k++) { const v = l[j * n + k] as number; d -= v * v; }
    if (!(d > 0)) throw new Error(`cholesky: matrix not positive definite at ${j}`);
    const ljj = Math.sqrt(d);
    l[j * n + j] = ljj;
    for (let i = j + 1; i < n; i++) {
      let s = a[i * n + j] as number;
      for (let k = 0; k < j; k++) s -= (l[i * n + k] as number) * (l[j * n + k] as number);
      l[i * n + j] = s / ljj;
    }
  }
  return l;
}

/** Solve L L^T x = b. */
export function cholSolve(l: Float64Array, n: number, b: Float64Array): Float64Array {
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = b[i] as number;
    for (let k = 0; k < i; k++) s -= (l[i * n + k] as number) * (y[k] as number);
    y[i] = s / (l[i * n + i] as number);
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i] as number;
    for (let k = i + 1; k < n; k++) s -= (l[k * n + i] as number) * (x[k] as number);
    x[i] = s / (l[i * n + i] as number);
  }
  return x;
}

/** The diagonal of (L L^T)^-1: sum over columns of L^-1 squared. */
export function cholInvDiag(l: Float64Array, n: number): Float64Array {
  const d = new Float64Array(n);
  const col = new Float64Array(n);
  for (let j = 0; j < n; j++) {
    // column j of L^-1: forward substitution of e_j
    col.fill(0);
    for (let i = j; i < n; i++) {
      let s = i === j ? 1 : 0;
      for (let k = j; k < i; k++) s -= (l[i * n + k] as number) * (col[k] as number);
      col[i] = s / (l[i * n + i] as number);
    }
    for (let i = j; i < n; i++) d[j] = (d[j] as number) + (col[i] as number) ** 2;
  }
  return d;
}

// ------------------------------------------------------------ the fit

/** A sparse observation row: indices and values, plus the label. */
interface Row { idx: number[]; val: number[]; y: number }

export interface Design {
  /** Parameter names: 'alpha', 'play', then 'card:<name>', then 'pair:<a>|<b>'. */
  params: string[];
  /** Prior precision of each parameter. */
  precision: number[];
  cards: string[];
  pairs: Array<[string, string]>;
  rows: Row[];
  /** The prior ratings' mean and SD (z = (rating - mean) / sd). */
  ratingMean: number;
  ratingSd: number;
}

const pairKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Which pairs become features: nonland, trusted, in one deck together in >= minPairGames games. */
export function selectPairs(games: Game[], priors: Map<string, PriorCard>, o: LearnOptions): Array<[string, string, number]> {
  const count = new Map<string, number>();
  const ok = (n: string): boolean => { const p = priors.get(n); return !!p && !p.aiLimited && !p.land; };
  for (const g of games) {
    for (const deck of [g.a, g.b]) {
      const cs = deck.filter(ok);
      for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
        const k = pairKey(cs[i] as string, cs[j] as string);
        count.set(k, (count.get(k) ?? 0) + 1);
      }
    }
  }
  return [...count.entries()].filter(([, n]) => n >= o.minPairGames)
    .sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1)).slice(0, o.maxPairs)
    .map(([k, n]) => { const [a, b] = k.split('|') as [string, string]; return [a, b, n]; });
}

export function design(games: Game[], priors: Map<string, PriorCard>, o: LearnOptions): Design {
  // z: the prior rating standardised over the cube's nonbasic cards.
  const rs = [...priors.values()].map((p) => p.rating);
  const mean = rs.reduce((s, x) => s + x, 0) / Math.max(1, rs.length);
  const sd = Math.sqrt(rs.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, rs.length)) || 1;
  const z = (n: string): number => { const p = priors.get(n); return p ? (p.rating - mean) / sd : 0; };
  const seen = new Set<string>();
  for (const g of games) for (const n of [...g.a, ...g.b]) seen.add(n);
  const cards = [...seen].filter((n) => { const p = priors.get(n); return !!p && !p.aiLimited; }).sort();
  const pairs = selectPairs(games, priors, o).map(([a, b]) => [a, b] as [string, string]);
  const params = ['alpha', 'play', ...cards.map((c) => `card:${c}`), ...pairs.map(([a, b]) => `pair:${a}|${b}`)];
  const ci = new Map(cards.map((c, i) => [c, 2 + i]));
  const pi = new Map(pairs.map(([a, b], i) => [pairKey(a, b), 2 + cards.length + i]));
  const precision = params.map((_, i) => (i < 2 ? 1 / o.tauFixed ** 2 : i < 2 + cards.length ? 1 / o.tauCard ** 2 : 1 / o.tauPair ** 2));
  const rows: Row[] = games.map((g) => {
    const x = new Map<number, number>();
    const add = (i: number | undefined, v: number): void => { if (i !== undefined) x.set(i, (x.get(i) ?? 0) + v); };
    let zsum = 0;
    for (const [deck, sign] of [[g.a, 1], [g.b, -1]] as Array<[string[], number]>) {
      for (const n of deck) { zsum += sign * z(n); add(ci.get(n), sign); }
      for (let i = 0; i < deck.length; i++) for (let j = i + 1; j < deck.length; j++) add(pi.get(pairKey(deck[i] as string, deck[j] as string)), sign);
    }
    x.set(0, zsum);
    x.set(1, g.aOnPlay ? 1 : -1);
    const idx = [...x.keys()].filter((k) => x.get(k) !== 0).sort((p, q) => p - q);
    return { idx, val: idx.map((k) => x.get(k) as number), y: g.aWon ? 1 : 0 };
  });
  return { params, precision, cards, pairs, rows, ratingMean: mean, ratingSd: sd };
}

const sigmoid = (t: number): number => (t >= 0 ? 1 / (1 + Math.exp(-t)) : Math.exp(t) / (1 + Math.exp(t)));

export interface FitResult { theta: Float64Array; sd: Float64Array; iterations: number; logLik: number }

/** MAP fit by Newton's method; sd = sqrt(diag of the inverse Hessian), the posterior SDs. */
export function fit(d: Design, o: LearnOptions, wantSd = true): FitResult {
  const n = d.params.length;
  const theta = new Float64Array(n);
  let it = 0;
  let l: Float64Array = new Float64Array(0);
  for (; it < o.maxIter; it++) {
    const g = new Float64Array(n);
    const h = new Float64Array(n * n);
    for (let i = 0; i < n; i++) { g[i] = -(d.precision[i] as number) * (theta[i] as number); h[i * n + i] = d.precision[i] as number; }
    for (const r of d.rows) {
      let t = 0;
      for (let k = 0; k < r.idx.length; k++) t += (theta[r.idx[k] as number] as number) * (r.val[k] as number);
      const p = sigmoid(t);
      const wgt = p * (1 - p);
      for (let k = 0; k < r.idx.length; k++) {
        const ik = r.idx[k] as number;
        const vk = r.val[k] as number;
        g[ik] = (g[ik] as number) + (r.y - p) * vk;
        for (let m = 0; m < r.idx.length; m++) {
          const im = r.idx[m] as number;
          h[ik * n + im] = (h[ik * n + im] as number) + wgt * vk * (r.val[m] as number);
        }
      }
    }
    l = cholesky(h, n);
    const step = cholSolve(l, n, g);
    let max = 0;
    for (let i = 0; i < n; i++) { theta[i] = (theta[i] as number) + (step[i] as number); max = Math.max(max, Math.abs(step[i] as number)); }
    if (max < o.tol) { it++; break; }
  }
  let logLik = 0;
  for (const r of d.rows) logLik += logLoss(predictRow(theta, r), r.y);
  const sd = wantSd ? cholInvDiag(l, n).map(Math.sqrt) : new Float64Array(n);
  return { theta, sd, iterations: it, logLik: -logLik };
}

function predictRow(theta: Float64Array, r: Row): number {
  let t = 0;
  for (let k = 0; k < r.idx.length; k++) t += (theta[r.idx[k] as number] as number) * (r.val[k] as number);
  return sigmoid(t);
}
const logLoss = (p: number, y: number): number => -Math.log(Math.max(1e-12, y ? p : 1 - p));

// ------------------------------------------------------------ learning, end to end

export interface CardOut {
  name: string;
  prior: number;
  rating: number;
  /** delta and its posterior SD, in logits. */
  delta: number;
  sd: number;
  /** Decisive games the card was in exactly one deck of (its effective sample). */
  games: number;
  wins: number;
  forge: string;
  source: string;
  status: 'learned' | 'ai-limited' | 'unseen';
}

export interface PairOut { a: string; b: string; logit: number; sd: number; points: number; games: number }

export interface CvResult {
  folds: number; games: number; logLossPrior: number; logLossLearned: number; logLossCoin: number; accPrior: number; accLearned: number;
  /** Standard error of the per-game difference (learned - prior-only log loss): the improvement is noise unless it is about 2 of these. */
  diffSe: number;
}

export interface Learned {
  options: LearnOptions;
  drafts: number;
  games: number;
  alpha: { value: number; sd: number };
  /** The exchange rate used for ratings and pair points, and where it came from. */
  pointsPerLogit: number;
  pointsPerLogitSource: string;
  play: { value: number; sd: number };
  cards: CardOut[];
  pairs: PairOut[];
  pairsConsidered: number;
  iterations: number;
  cv: CvResult | null;
  /** Spearman rank correlation of learned ratings with the prior, over learned cards. */
  rankCorrWithPrior: number | null;
}

/** Fit on everything; optionally cross-validate by draft (prior-only model vs the full one). */
export function learn(games: Game[], priors: Map<string, PriorCard>, o: LearnOptions): Learned {
  const d = design(games, priors, o);
  const f = fit(d, o);
  const alpha = f.theta[0] as number;
  const alphaSd = f.sd[0] as number;
  let k = o.pointsPerLogit;
  let kSource = 'fixed (--learn pointsPerLogit)';
  if (k <= 0) {
    if (alpha > 2 * alphaSd) {
      k = Math.min(o.pointsPerLogitMax, Math.max(o.pointsPerLogitMin, d.ratingSd / alpha));
      kSource = `auto: rating SD ${d.ratingSd.toFixed(1)} / alpha ${alpha.toFixed(4)}${k === d.ratingSd / alpha ? '' : ', clamped'}`;
    } else {
      k = o.pointsPerLogitFallback;
      kSource = `fallback: alpha ${alpha.toFixed(4)} is not two SDs (${alphaSd.toFixed(4)}) above 0, so the prior's exchange rate is unknown`;
    }
  }
  k = Math.round(k * 10) / 10;
  const idx = new Map(d.params.map((p, i) => [p, i]));
  const ev = new Map<string, { games: number; wins: number }>();
  for (const g of games) {
    const inA = new Set(g.a);
    const inB = new Set(g.b);
    for (const n of new Set([...g.a, ...g.b])) {
      if (inA.has(n) && inB.has(n)) continue;
      const e = ev.get(n) ?? { games: 0, wins: 0 };
      e.games++;
      if (inA.has(n) === g.aWon) e.wins++;
      ev.set(n, e);
    }
  }
  const cards: CardOut[] = [...priors.values()].sort((x, y) => (x.name < y.name ? -1 : 1)).map((p) => {
    const i = idx.get(`card:${p.name}`);
    const e = ev.get(p.name) ?? { games: 0, wins: 0 };
    const delta = i === undefined ? 0 : (f.theta[i] as number);
    const sd = i === undefined ? o.tauCard : (f.sd[i] as number);
    const status: CardOut['status'] = p.aiLimited ? 'ai-limited' : i === undefined ? 'unseen' : 'learned';
    return {
      name: p.name, prior: p.rating, rating: round1(p.rating + k * delta), delta, sd,
      games: e.games, wins: e.wins, forge: p.forge, source: p.source, status,
    };
  });
  const pairCount = new Map(selectPairs(games, priors, o).map(([a, b, n]) => [pairKey(a, b), n]));
  const pairs: PairOut[] = d.pairs.map(([a, b]) => {
    const i = idx.get(`pair:${a}|${b}`) as number;
    const logit = f.theta[i] as number;
    return { a, b, logit, sd: f.sd[i] as number, points: round1(k * logit), games: pairCount.get(pairKey(a, b)) ?? 0 };
  }).sort((x, y) => Math.abs(y.points) - Math.abs(x.points) || (x.a + x.b < y.a + y.b ? -1 : 1));
  const learnedCards = cards.filter((c) => c.status === 'learned');
  return {
    options: o,
    drafts: new Set(games.map((g) => g.draft)).size,
    games: games.length,
    alpha: { value: alpha, sd: alphaSd },
    pointsPerLogit: k, pointsPerLogitSource: kSource,
    play: { value: f.theta[1] as number, sd: f.sd[1] as number },
    cards, pairs, pairsConsidered: d.pairs.length, iterations: f.iterations,
    cv: o.folds >= 2 ? crossValidate(games, priors, o) : null,
    rankCorrWithPrior: learnedCards.length >= 3 ? spearman(learnedCards.map((c) => c.prior), learnedCards.map((c) => c.rating)) : null,
  };
}

/** K-fold by draft: the held-out log loss of the prior-only model (alpha, play) against the full model. */
export function crossValidate(games: Game[], priors: Map<string, PriorCard>, o: LearnOptions): CvResult | null {
  const drafts = [...new Set(games.map((g) => g.draft))].sort();
  const k = Math.min(o.folds, drafts.length);
  if (k < 2) return null;
  const foldOf = new Map(drafts.map((dr, i) => [dr, i % k]));
  let lp = 0, ll = 0, ap = 0, al = 0, n = 0;
  const diffs: number[] = [];
  const priorOnly: LearnOptions = { ...o, tauCard: 1e-6, tauPair: 1e-6, maxPairs: 0 };
  for (let f = 0; f < k; f++) {
    const train = games.filter((g) => foldOf.get(g.draft) !== f);
    const test = games.filter((g) => foldOf.get(g.draft) === f);
    if (test.length === 0 || train.length === 0) continue;
    const fullD = design(train, priors, o);
    const full = fit(fullD, o, false);
    const baseD = design(train, priors, priorOnly);
    const base = fit(baseD, priorOnly, false);
    for (const g of test) {
      const pFull = predictGame(fullD, full.theta, g, priors);
      const pBase = predictGame(baseD, base.theta, g, priors);
      const y = g.aWon ? 1 : 0;
      ll += logLoss(pFull, y); lp += logLoss(pBase, y);
      diffs.push(logLoss(pFull, y) - logLoss(pBase, y));
      al += (pFull >= 0.5) === g.aWon ? 1 : 0; ap += (pBase >= 0.5) === g.aWon ? 1 : 0;
      n++;
    }
  }
  const md = diffs.reduce((s, x) => s + x, 0) / n;
  const diffSe = Math.sqrt(diffs.reduce((s, x) => s + (x - md) ** 2, 0) / Math.max(1, n - 1) / n);
  return { folds: k, games: n, logLossPrior: lp / n, logLossLearned: ll / n, logLossCoin: Math.log(2), accPrior: ap / n, accLearned: al / n, diffSe };
}

/** P(A wins) for a game under a design's parameters (cards and pairs the design never saw count 0). */
export function predictGame(d: Design, theta: Float64Array, g: Game, priors: Map<string, PriorCard>): number {
  const one = design([g], priors, { ...DEFAULT_LEARN, maxPairs: 0 });
  // Re-map the single game's z-sum and play onto d's parameters, and its cards and pairs by name.
  const idx = new Map(d.params.map((p, i) => [p, i]));
  let t = 0;
  const r = one.rows[0] as Row;
  for (let k = 0; k < r.idx.length; k++) {
    const name = one.params[r.idx[k] as number] as string;
    const i = idx.get(name);
    if (i !== undefined) t += (theta[i] as number) * (r.val[k] as number);
  }
  for (const [deck, sign] of [[g.a, 1], [g.b, -1]] as Array<[string[], number]>) {
    for (let i = 0; i < deck.length; i++) for (let j = i + 1; j < deck.length; j++) {
      const pi = idx.get(`pair:${pairKey(deck[i] as string, deck[j] as string)}`);
      if (pi !== undefined) t += sign * (theta[pi] as number);
    }
  }
  return sigmoid(t);
}

// ------------------------------------------------------------ statistics

const round1 = (x: number): number => Math.round(x * 10) / 10;

function ranks(xs: number[]): number[] {
  const order = xs.map((x, i) => [x, i] as [number, number]).sort((p, q) => p[0] - q[0]);
  const r = new Array<number>(xs.length);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && (order[j + 1] as [number, number])[0] === (order[i] as [number, number])[0]) j++;
    for (let k = i; k <= j; k++) r[(order[k] as [number, number])[1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}

/** Spearman's rank correlation (ties averaged). */
export function spearman(x: number[], y: number[]): number {
  const rx = ranks(x);
  const ry = ranks(y);
  const n = x.length;
  const mx = rx.reduce((s, v) => s + v, 0) / n;
  const my = ry.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const a = (rx[i] as number) - mx;
    const b = (ry[i] as number) - my;
    sxy += a * b; sxx += a * a; syy += b * b;
  }
  return sxx === 0 || syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
}

// ------------------------------------------------------------ files

/** The prior: a ratings TSV (name, rating, forge, source, ...), with the run's cards.json for AI limits and lands. */
export function priorsFrom(tsv: string | null, cardsJson: Record<string, { rating: number; remAIDeck: boolean; land: boolean }>): Map<string, PriorCard> {
  const out = new Map<string, PriorCard>();
  for (const [name, c] of Object.entries(cardsJson)) {
    out.set(name, { name, rating: c.rating, forge: '', source: 'run', aiLimited: !!c.remAIDeck, land: !!c.land });
  }
  if (tsv) {
    tsv.split(/\r?\n/).forEach((line, i) => {
      if (!line.trim() || line.startsWith('#')) return;
      const [name, rating, forge, source] = line.split('\t');
      const n = Number(rating);
      if (!name || !Number.isFinite(n)) throw new Error(`prior ratings line ${i + 1}: want name<TAB>rating, got "${line}"`);
      const p = out.get(name);
      if (!p) return;                      // a card the runs never dealt keeps no row here
      out.set(name, { ...p, rating: n, forge: forge ?? '', source: source ?? '' });
    });
  }
  return out;
}

export function learnedRatingsTsv(title: string, l: Learned, inputs: string[]): string {
  const o = l.options;
  const head = [
    `# cube lab LEARNED ratings for: ${title}`,
    `# Written by \`tools/cubelab.sh learn\` (D301) from ${l.drafts} draft(s), ${l.games} decisive game(s): ${inputs.join(', ')}`,
    `# rating = prior + ${l.pointsPerLogit} x delta (${l.pointsPerLogitSource}), delta in logits per card in a deck, shrunk toward 0 by a N(0, ${o.tauCard}^2) prior.`,
    `# alpha (logits per prior-rating SD per card) = ${l.alpha.value.toFixed(4)} +/- ${l.alpha.sd.toFixed(4)}; play/draw = ${l.play.value.toFixed(3)} +/- ${l.play.sd.toFixed(3)}`,
    `# status: learned | ai-limited (Forge AI:RemAIDeck: kept at the prior, its outcomes are the AI's) | unseen (no decisive game: kept at the prior)`,
    `# Only the first two columns are read back (--ratings); games = decisive games in exactly one of the two decks.`,
    '# name\trating\tforge\tsource\tprior\tdelta\tsd\tgames\twins\tstatus',
  ];
  const rows = l.cards.map((c) => [c.name, c.rating, c.forge, c.source, c.prior, c.delta.toFixed(4), c.sd.toFixed(4), c.games, c.wins, c.status].join('\t'));
  return `${[...head, ...rows].join('\n')}\n`;
}

export function synergyTsv(title: string, l: Learned): string {
  const o = l.options;
  const head = [
    `# cube lab LEARNED pair synergy for: ${title}`,
    `# Written by \`tools/cubelab.sh learn\` (D301): ${l.pairsConsidered} pair(s) fitted (>= ${o.minPairGames} decisive games in one deck, at most ${o.maxPairs}),`,
    `# each shrunk by a N(0, ${o.tauPair}^2) prior; points = ${l.pointsPerLogit} x logit; pairs with |points| < ${o.minPairPoints} left out.`,
    '# Read by `run --synergy` (picking) and `run --deck-synergy` (deckbuilding). AI-limited cards and lands are in no pair.',
    '# a\tb\tpoints\tlogit\tsd\tgames',
  ];
  const rows = l.pairs.filter((p) => Math.abs(p.points) >= o.minPairPoints).map((p) => [p.a, p.b, p.points, p.logit.toFixed(4), p.sd.toFixed(4), p.games].join('\t'));
  return `${[...head, ...rows].join('\n')}\n`;
}

export function learnSummaryMd(title: string, l: Learned, top = 15): string {
  const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;
  const out: string[] = [];
  out.push(`# Learned ratings — ${title}`, '');
  out.push(`${l.drafts} drafts, ${l.games} decisive games; ${l.cards.filter((c) => c.status === 'learned').length} cards learned, ${l.cards.filter((c) => c.status === 'ai-limited').length} AI-limited kept at prior, ${l.cards.filter((c) => c.status === 'unseen').length} unseen; ${l.pairsConsidered} pairs fitted; Newton converged in ${l.iterations} steps.`, '');
  out.push(`- **alpha** (how much the prior ratings predict wins, logits per rating SD per card): ${l.alpha.value.toFixed(4)} ± ${(1.96 * l.alpha.sd).toFixed(4)} (95%)`);
  out.push(`- **on the play**: ${l.play.value >= 0 ? '+' : ''}${l.play.value.toFixed(3)} logits ± ${(1.96 * l.play.sd).toFixed(3)} (P(win) ${pct(1 / (1 + Math.exp(-2 * l.play.value)))} on the play vs on the draw, same decks)`);
  out.push(`- **points per logit** (learned values written back as ratings): ${l.pointsPerLogit} — ${l.pointsPerLogitSource}`);
  if (l.rankCorrWithPrior !== null) out.push(`- rank correlation of learned ratings with the prior: ${l.rankCorrWithPrior.toFixed(3)}`);
  const ess = l.cards.filter((c) => c.status === 'learned').map((c) => c.games).sort((a, b) => a - b);
  if (ess.length) out.push(`- effective sample per learned card (decisive games in one deck): median ${ess[Math.floor(ess.length / 2)]}, min ${ess[0]}, max ${ess[ess.length - 1]}`);
  const sds = l.cards.filter((c) => c.status === 'learned').map((c) => c.sd).sort((a, b) => a - b);
  if (sds.length) out.push(`- posterior SD of a card's delta: median ${(sds[Math.floor(sds.length / 2)] as number).toFixed(3)} logits (prior SD ${l.options.tauCard}) — ${(100 * (1 - (sds[Math.floor(sds.length / 2)] as number) / l.options.tauCard)).toFixed(0)}% of the prior uncertainty removed`);
  if (l.cv) {
    out.push(`- **held-out check** (${l.cv.folds}-fold by draft, ${l.cv.games} games): log loss prior-only ${l.cv.logLossPrior.toFixed(4)}, learned ${l.cv.logLossLearned.toFixed(4)}, coin ${l.cv.logLossCoin.toFixed(4)}; accuracy prior-only ${pct(l.cv.accPrior)}, learned ${pct(l.cv.accLearned)}. difference ${(l.cv.logLossLearned - l.cv.logLossPrior).toFixed(4)} ± ${(1.96 * l.cv.diffSe).toFixed(4)} (95%). ${l.cv.logLossLearned + 1.96 * l.cv.diffSe < l.cv.logLossPrior ? 'The learned values predict held-out games better than the prior, beyond noise.' : l.cv.logLossLearned < l.cv.logLossPrior ? 'The learned values predict held-out games better than the prior, but within noise.' : 'The learned values do NOT predict held-out games better than the prior: the sample is too small for them to be signal yet.'}`);
  }
  out.push('');
  const learned = l.cards.filter((c) => c.status === 'learned');
  const row = (c: CardOut): string => `| ${c.name} | ${c.prior} | ${c.rating} | ${c.delta >= 0 ? '+' : ''}${c.delta.toFixed(3)} ± ${(1.96 * c.sd).toFixed(3)} | ${c.games} | ${c.wins} |`;
  out.push(`## Up most (top ${top})`, '', '| card | prior | learned | delta (logit, 95%) | games | wins |', '|---|---|---|---|---|---|');
  for (const c of [...learned].sort((a, b) => b.delta - a.delta).slice(0, top)) out.push(row(c));
  out.push('', `## Down most (top ${top})`, '', '| card | prior | learned | delta (logit, 95%) | games | wins |', '|---|---|---|---|---|---|');
  for (const c of [...learned].sort((a, b) => a.delta - b.delta).slice(0, top)) out.push(row(c));
  out.push('', `## Strongest pairs (top ${top} by |points|)`, '', '| a | b | points | logit (95%) | games |', '|---|---|---|---|---|');
  for (const p of l.pairs.slice(0, top)) out.push(`| ${p.a} | ${p.b} | ${p.points} | ${p.logit.toFixed(3)} ± ${(1.96 * p.sd).toFixed(3)} | ${p.games} |`);
  const ai = l.cards.filter((c) => c.status === 'ai-limited');
  if (ai.length) out.push('', `## AI-limited, kept at the prior (${ai.length})`, '', ai.map((c) => `${c.name} (${c.games} games, ${c.wins} wins)`).join(' · '));
  return `${out.join('\n')}\n`;
}
