// mtg-table — the cube lab: a library-wide card model fitted to recorded games, and a cube generator on it.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// `tools/cubelab.sh balance-model …` (balance-model-cmd.ts) is the command; this file is pure: decks and
// games in, card values, intervals, predicted payoffs and a selected 180 out.  No engine, no network, no
// dependency, and Math.random is never used (rng.ts), so the same records give the same numbers.
//
// THE MODEL.  A ridge-regularised LINEAR PROBABILITY model of a decisive game between decks a and b:
//
//   P(a wins) - 1/2 = sum_c beta_c (x_ac - x_bc)  +  sum_m gamma_m (z_am - z_bm)  +  pi * play
//
// x_dc = 1 when deck d's main holds nonland card c (a basic or a nonbasic land is not a feature: the
// census and the lab's builder choose lands by the deck's colours, so a land measures its colours);
// z_dm = 1 for deck d's MAKEUP group m; play = +1 when a was on the play, -1 when b was.  The two decks
// enter antisymmetrically, so the opponent is controlled exactly as the deck is (a D377-style null:
// a card is judged against what its deck's makeup and its opponent's would win without it).  beta_c is
// in win-rate points per game: "a deck holding c instead of the average card of its band wins beta_c
// more often".  Linear, not logistic, because every census rate sits in .35-.65 where the two agree to
// within a few per cent of the effect, and because a linear model makes a deck's predicted payoff the sum
// of its cards' values, which is what a cube generator has to add up.
//
// Two makeup groupings, because they answer different questions:
//   - `colour`: the deck's colours with 3+ spells (`WU`, `WUB` …), D377's own null.  beta_c is then a card's
//     value against the other cards of its colours: the right ranking WITHIN a colour, but a colour's
//     own level is in gamma, not in its cards.
//   - `makeup`: the deck's colour COUNT (colours with 3+ spells, 1-5) by its main colour's pip share
//     (<.5, .5-.7, .7-.9, .9-<1, mono): the structure D447/J149 found matters (one colour > .5, four and
//     five < .5, the main-share slope), and nothing about WHICH colours.  beta_c is then absolute within the
//     band, so a colour's strength is the sum of its cards', which is what the generator balances.
//
// Penalties: beta ~ ridge lambdaCard, chosen by K-fold cross-validation on held-out Brier score (folds by
// game; a deck's games are spread over the folds, so the choice is mildly optimistic, and the reported
// held-out skill with it); gamma ~ lambdaGroup = 20 pseudo-games, D377's shrinkage toward the mean; pi
// ~ 1 (essentially free).  Games are weighted as D377 weights them: every decisive game once; the deck is
// the unit of resampling.  Intervals: a deck bootstrap — multinomial weights over decks, a game weighted
// by the product of its two decks' weights (arm B of J145, where a game's two decks come from one draft,
// resamples drafts) — percentile 95%, warm-started from the full fit.
//
// The solver: conjugate gradients with a Jacobi preconditioner on (X'WX + Lambda) beta = X'W(y - 1/2),
// never forming X'WX, so a band of 1,400 cards and 20,000 games fits in a second.

import { bucketOf, nonlandGroupOf, selectSlots, landGroupsOf, sumOf, PAIRS, MONO, type SlotPlan } from './skeleton.ts';
import { rng, type Rng } from './rng.ts';

/** a[i] += v on a typed array (noUncheckedIndexedAccess reads a[i] as possibly undefined). */
const bump = (a: Float64Array | Int32Array, i: number, v = 1): void => { a[i] = (a[i] as number) + v; };

// ------------------------------------------------------------------ the records

export interface MDeck {
  id: string;
  /** Nonland cards of the main (one entry a copy; the census and the cubes are singleton). */
  spells: string[];
  /** Colours with 3+ spells, WUBRG order ('' for none). */
  colours: string;
  /** The main colour's share of the deck's coloured pips (1 for a mono deck). */
  mainShare: number;
  /** The resampling cluster (the deck itself, or its draft). */
  cluster: string;
  /** A stratum its makeup group is kept apart by (a band, in a fit over two bands); none by default. */
  stratum?: string;
}

export interface MGame { a: string; b: string; winner: 'a' | 'b'; first: 'a' | 'b' }

export type Grouping = 'colour' | 'makeup';

export function shareBin(s: number): string {
  if (s >= 0.9999) return 'mono';
  if (s >= 0.9) return '.9';
  if (s >= 0.7) return '.7';
  if (s >= 0.5) return '.5';
  return '<.5';
}

export function groupOf(d: Pick<MDeck, 'colours' | 'mainShare' | 'stratum'>, g: Grouping): string {
  const pre = d.stratum ? `${d.stratum}/` : '';
  if (g === 'colour') return pre + (d.colours || 'C');
  return `${pre}k${Math.max(1, d.colours.length)}:${shareBin(d.mainShare)}`;
}

// ------------------------------------------------------------------ the design

export interface Design {
  cards: string[];
  groups: string[];
  /** Feature indices of each deck: its cards, then nCards + its group. */
  deckFeat: Int32Array[];
  deckIds: string[];
  deckCluster: Int32Array;
  clusters: number;
  ga: Int32Array;
  gb: Int32Array;
  /** 1 when a won. */
  y: Float64Array;
  /** +1 when a was on the play. */
  play: Float64Array;
  nFeat: number;
  /** Decks holding each card, and its decisive deck-games. */
  cardDecks: Int32Array;
  cardGames: Int32Array;
}

export function buildDesign(decks: MDeck[], games: MGame[], grouping: Grouping): Design {
  const deckIx = new Map<string, number>();
  decks.forEach((d, i) => deckIx.set(d.id, i));
  const used = games.filter((g) => deckIx.has(g.a) && deckIx.has(g.b));
  const cardIx = new Map<string, number>();
  const groupIx = new Map<string, number>();
  for (const d of decks) {
    for (const c of d.spells) if (!cardIx.has(c)) cardIx.set(c, cardIx.size);
    const g = groupOf(d, grouping);
    if (!groupIx.has(g)) groupIx.set(g, groupIx.size);
  }
  const nCards = cardIx.size;
  const clusterIx = new Map<string, number>();
  const deckCluster = new Int32Array(decks.length);
  const deckFeat = decks.map((d, i) => {
    if (!clusterIx.has(d.cluster)) clusterIx.set(d.cluster, clusterIx.size);
    deckCluster[i] = clusterIx.get(d.cluster) as number;
    const f = [...new Set(d.spells.map((c) => cardIx.get(c) as number))];
    f.push(nCards + (groupIx.get(groupOf(d, grouping)) as number));
    return Int32Array.from(f);
  });
  const ga = new Int32Array(used.length), gb = new Int32Array(used.length);
  const y = new Float64Array(used.length), play = new Float64Array(used.length);
  const cardDecks = new Int32Array(nCards), cardGames = new Int32Array(nCards);
  const deckGames = new Int32Array(decks.length);
  used.forEach((g, i) => {
    ga[i] = deckIx.get(g.a) as number; gb[i] = deckIx.get(g.b) as number;
    y[i] = g.winner === 'a' ? 1 : 0; play[i] = g.first === 'a' ? 1 : -1;
    bump(deckGames, ga[i] as number); bump(deckGames, gb[i] as number);
  });
  decks.forEach((_, i) => {
    const f = deckFeat[i] as Int32Array;
    for (let k = 0; k < f.length - 1; k++) { bump(cardDecks, f[k] as number); bump(cardGames, f[k] as number, deckGames[i] as number); }
  });
  return {
    cards: [...cardIx.keys()], groups: [...groupIx.keys()], deckFeat, deckIds: decks.map((d) => d.id), deckCluster, clusters: clusterIx.size,
    ga, gb, y, play, nFeat: nCards + groupIx.size + 1, cardDecks, cardGames,
  };
}

// ------------------------------------------------------------------ the solver

export interface Penalty { card: number; group: number; play: number }
export const DEFAULT_PENALTY: Omit<Penalty, 'card'> = { group: 20, play: 1 };

/** X v for every game (the model's prediction minus 1/2). */
export function predictRows(ds: Design, beta: Float64Array, out = new Float64Array(ds.y.length)): Float64Array {
  const P = ds.nFeat - 1;
  const dv = new Float64Array(ds.deckFeat.length);
  for (let d = 0; d < ds.deckFeat.length; d++) { const f = ds.deckFeat[d] as Int32Array; let s = 0; for (let k = 0; k < f.length; k++) s += beta[f[k] as number] as number; dv[d] = s; }
  for (let g = 0; g < ds.y.length; g++) out[g] = (dv[ds.ga[g] as number] as number) - (dv[ds.gb[g] as number] as number) + (beta[P] as number) * (ds.play[g] as number);
  return out;
}

/** X' u (u a vector over games). */
function xtv(ds: Design, u: Float64Array, out: Float64Array): void {
  out.fill(0);
  const P = ds.nFeat - 1;
  const du = new Float64Array(ds.deckFeat.length);
  let pl = 0;
  for (let g = 0; g < u.length; g++) { const v = u[g] as number; bump(du, ds.ga[g] as number, v); bump(du, ds.gb[g] as number, -v); pl += v * (ds.play[g] as number); }
  for (let d = 0; d < ds.deckFeat.length; d++) { const v = du[d] as number; if (v === 0) continue; const f = ds.deckFeat[d] as Int32Array; for (let k = 0; k < f.length; k++) bump(out, f[k] as number, v); }
  out[P] = pl;
}

function penaltyVector(ds: Design, pen: Penalty): Float64Array {
  const p = new Float64Array(ds.nFeat);
  const nc = ds.cards.length;
  for (let i = 0; i < ds.nFeat; i++) p[i] = i < nc ? pen.card : i < ds.nFeat - 1 ? pen.group : pen.play;
  return p;
}

/** diag(X'WX): a feature counts in a game when exactly one of the two decks holds it. */
function diagXtWX(ds: Design, w: Float64Array): Float64Array {
  const dg = new Float64Array(ds.nFeat);
  const stamp = new Int32Array(ds.nFeat).fill(-1);
  for (let g = 0; g < ds.y.length; g++) {
    const wg = w[g] as number;
    if (wg === 0) continue;
    const fa = ds.deckFeat[ds.ga[g] as number] as Int32Array, fb = ds.deckFeat[ds.gb[g] as number] as Int32Array;
    for (let k = 0; k < fb.length; k++) stamp[fb[k] as number] = g;
    for (let k = 0; k < fa.length; k++) if (stamp[fa[k] as number] !== g) bump(dg, fa[k] as number, wg);
    for (let k = 0; k < fa.length; k++) stamp[fa[k] as number] = -2 - g;
    for (let k = 0; k < fb.length; k++) if (stamp[fb[k] as number] !== -2 - g) bump(dg, fb[k] as number, wg);
    bump(dg, ds.nFeat - 1, wg);
  }
  return dg;
}

export interface SolveOptions { maxIter: number; tol: number }
export const DEFAULT_SOLVE: SolveOptions = { maxIter: 400, tol: 1e-7 };

/** The ridge fit under game weights w (1 each by default), warm-started from x0. */
export function solveRidge(ds: Design, pen: Penalty, w?: Float64Array, x0?: Float64Array, o: SolveOptions = DEFAULT_SOLVE): Float64Array {
  const n = ds.y.length, P = ds.nFeat;
  const W = w ?? new Float64Array(n).fill(1);
  const lam = penaltyVector(ds, pen);
  const dg = diagXtWX(ds, W);
  const Minv = new Float64Array(P);
  for (let i = 0; i < P; i++) Minv[i] = 1 / ((dg[i] as number) + (lam[i] as number));
  const r0 = new Float64Array(n);
  for (let g = 0; g < n; g++) r0[g] = (W[g] as number) * ((ds.y[g] as number) - 0.5);
  const b = new Float64Array(P);
  xtv(ds, r0, b);
  const x = x0 ? Float64Array.from(x0) : new Float64Array(P);
  const rows = new Float64Array(n);
  const Ax = (v: Float64Array, out: Float64Array): void => {
    predictRows(ds, v, rows);
    for (let g = 0; g < n; g++) rows[g] = (rows[g] as number) * (W[g] as number);
    xtv(ds, rows, out);
    for (let i = 0; i < P; i++) out[i] = (out[i] as number) + (lam[i] as number) * (v[i] as number);
  };
  const r = new Float64Array(P), z = new Float64Array(P), p = new Float64Array(P), q = new Float64Array(P);
  Ax(x, q);
  for (let i = 0; i < P; i++) r[i] = (b[i] as number) - (q[i] as number);
  let bn = 0;
  for (let i = 0; i < P; i++) bn += (b[i] as number) ** 2;
  bn = Math.sqrt(bn) || 1;
  for (let i = 0; i < P; i++) { z[i] = (Minv[i] as number) * (r[i] as number); p[i] = z[i] as number; }
  let rz = 0;
  for (let i = 0; i < P; i++) rz += (r[i] as number) * (z[i] as number);
  for (let it = 0; it < o.maxIter; it++) {
    let rn = 0;
    for (let i = 0; i < P; i++) rn += (r[i] as number) ** 2;
    if (Math.sqrt(rn) / bn < o.tol) break;
    Ax(p, q);
    let pq = 0;
    for (let i = 0; i < P; i++) pq += (p[i] as number) * (q[i] as number);
    const a = rz / pq;
    for (let i = 0; i < P; i++) { x[i] = (x[i] as number) + a * (p[i] as number); r[i] = (r[i] as number) - a * (q[i] as number); }
    let rz2 = 0;
    for (let i = 0; i < P; i++) { z[i] = (Minv[i] as number) * (r[i] as number); rz2 += (r[i] as number) * (z[i] as number); }
    const bt = rz2 / rz;
    rz = rz2;
    for (let i = 0; i < P; i++) p[i] = (z[i] as number) + bt * (p[i] as number);
  }
  return x;
}

// ------------------------------------------------------------------ cross-validation and fit quality

export interface CvResult { lambda: number; brier: number; brierGroupsOnly: number; brierNull: number; skill: number; byLambda: Array<{ lambda: number; brier: number }>; logLoss: number; accuracy: number }

const clip = (p: number): number => Math.min(0.99, Math.max(0.01, p));

/** K folds by game (a seeded assignment); held-out Brier score for each lambda, and for the cards-off model. */
export function crossValidate(ds: Design, lambdas: number[], folds = 5, seed = 1, base: Omit<Penalty, 'card'> = DEFAULT_PENALTY): CvResult {
  const n = ds.y.length;
  const r = rng(seed, 'balance-model/cv');
  const fold = new Int32Array(n);
  for (let g = 0; g < n; g++) fold[g] = r.int(folds);
  const evalPen = (pen: Penalty): { brier: number; ll: number; acc: number } => {
    let se = 0, ll = 0, acc = 0;
    let x: Float64Array | undefined;
    for (let k = 0; k < folds; k++) {
      const w = new Float64Array(n);
      for (let g = 0; g < n; g++) w[g] = fold[g] === k ? 0 : 1;
      x = solveRidge(ds, pen, w, x);
      const pr = predictRows(ds, x);
      for (let g = 0; g < n; g++) {
        if (fold[g] !== k) continue;
        const p = clip(0.5 + (pr[g] as number)), yy = ds.y[g] as number;
        se += (p - yy) ** 2; ll -= yy ? Math.log(p) : Math.log(1 - p); acc += (p > 0.5) === (yy === 1) ? 1 : p === 0.5 ? 0.5 : 0;
      }
    }
    return { brier: se / n, ll: ll / n, acc: acc / n };
  };
  const byLambda = lambdas.map((lambda) => ({ lambda, ...evalPen({ ...base, card: lambda }) }));
  const best = byLambda.reduce((a, b) => (b.brier < a.brier ? b : a));
  const groupsOnly = evalPen({ ...base, card: 1e9 });
  let m = 0;
  for (let g = 0; g < n; g++) m += ds.y[g] as number;
  m /= n;
  const brierNull = m * (1 - m);
  return {
    lambda: best.lambda, brier: best.brier, brierGroupsOnly: groupsOnly.brier, brierNull,
    skill: (groupsOnly.brier - best.brier) / groupsOnly.brier, logLoss: best.ll, accuracy: best.acc,
    byLambda: byLambda.map((b) => ({ lambda: b.lambda, brier: b.brier })),
  };
}

// ------------------------------------------------------------------ the bootstrap

/** Multinomial(n, uniform) counts. */
export function multinomialWeights(n: number, r: Rng): Float64Array {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) bump(w, r.int(n));
  return w;
}

export interface Fit {
  design: Design;
  pen: Penalty;
  beta: Float64Array;
  /** reps x nFeat (row-major). */
  reps: Float64Array[];
}

/**
 * Bootstrap replicates: clusters (decks, or drafts) resampled with multinomial weights, and each game carried
 * by ONE of its two decks' clusters — deck a's for even-numbered games, deck b's for odd ones (or the shared
 * cluster when both decks share it, as a draft's two decks do).  Weighting a game by the PRODUCT of its two
 * decks' weights (the pigeonhole bootstrap) triples the variance of every game's weight and so inflates the
 * game-noise part of an interval about 1.6x here; a game-level bootstrap and this one agree on J144's legacy
 * band to the fourth decimal (median card SD .0069 each, against .0109 for the product), so deck clustering
 * is small beside game noise and this scheme keeps what there is of it on one side of each game.
 */
export function bootstrapFit(ds: Design, pen: Penalty, beta: Float64Array, reps: number, seed: number): Float64Array[] {
  const out: Float64Array[] = [];
  const r = rng(seed, 'balance-model/boot');
  for (let b = 0; b < reps; b++) {
    const wc = multinomialWeights(ds.clusters, r);
    const w = new Float64Array(ds.y.length);
    for (let g = 0; g < w.length; g++) {
      const ca = ds.deckCluster[ds.ga[g] as number] as number, cb = ds.deckCluster[ds.gb[g] as number] as number;
      w[g] = wc[g % 2 === 0 || ca === cb ? ca : cb] as number;
    }
    out.push(solveRidge(ds, pen, w, beta, { maxIter: 150, tol: 1e-5 }));
  }
  return out;
}

/**
 * Split-half reliability of the card values: the model fitted on the even-numbered games and on the odd ones,
 * the two sets of card values correlated (cards with 200+ deck-games), and Spearman-Brown's 2r/(1+r) for the
 * full data.  The reliability is the share of the values' spread that is the cards and not the games' noise,
 * so sd(values) x sqrt(reliability) is the spread of the cards' TRUE values on this scale.
 */
export function splitHalf(ds: Design, pen: Penalty, minGames = 200): { half: number; full: number; n: number } {
  const n = ds.y.length;
  const w1 = new Float64Array(n), w2 = new Float64Array(n);
  for (let g = 0; g < n; g++) (g % 2 ? w1 : w2)[g] = 1;
  const b1 = solveRidge(ds, pen, w1), b2 = solveRidge(ds, pen, w2);
  const ix = ds.cards.map((_, i) => i).filter((i) => (ds.cardGames[i] as number) >= minGames);
  const r = pearson(ix.map((i) => b1[i] as number), ix.map((i) => b2[i] as number));
  return { half: r, full: (2 * r) / (1 + r), n: ix.length };
}

export interface CardEffect { card: string; est: number; sd: number; lo: number; hi: number; decks: number; deckGames: number }

export function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  const i = (sorted.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
  return (sorted[lo] as number) + ((sorted[hi] as number) - (sorted[lo] as number)) * (i - lo);
}

export function sdOf(xs: number[]): number {
  if (xs.length < 2) return NaN;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

export function cardEffects(fit: Fit): CardEffect[] {
  const ds = fit.design;
  return ds.cards.map((card, i) => {
    const xs = fit.reps.map((r) => r[i] as number).sort((a, b) => a - b);
    return { card, est: fit.beta[i] as number, sd: sdOf(xs), lo: quantile(xs, 0.025), hi: quantile(xs, 0.975), decks: ds.cardDecks[i] as number, deckGames: ds.cardGames[i] as number };
  });
}

export function groupEffects(fit: Fit): Array<{ group: string; est: number; lo: number; hi: number }> {
  const ds = fit.design, nc = ds.cards.length;
  return ds.groups.map((group, j) => {
    const xs = fit.reps.map((r) => r[nc + j] as number).sort((a, b) => a - b);
    return { group, est: fit.beta[nc + j] as number, lo: quantile(xs, 0.025), hi: quantile(xs, 0.975) };
  });
}

// ------------------------------------------------------------------ agreement between two sources

export function pearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return NaN;
  const mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = (x[i] as number) - mx, dy = (y[i] as number) - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  return sxy / Math.sqrt(sxx * syy);
}

function ranks(x: number[]): number[] {
  const ix = x.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array(x.length).fill(0) as number[];
  for (let i = 0; i < ix.length;) {
    let j = i;
    while (j + 1 < ix.length && (ix[j + 1] as readonly [number, number])[0] === (ix[i] as readonly [number, number])[0]) j++;
    for (let k = i; k <= j; k++) r[(ix[k] as readonly [number, number])[1]] = (i + j) / 2;
    i = j + 1;
  }
  return r;
}

export const spearman = (x: number[], y: number[]): number => pearson(ranks(x), ranks(y));

/**
 * How well source A's estimates predict source B's on the cards both measured: the correlation, the regression
 * slope of B on A (attenuated by A's noise: exactly the factor to apply to an A-only card), and the correlation
 * of the TRUE values, disattenuated by each source's split-half reliability (r / sqrt(relA relB)).
 */
export interface Agreement { n: number; pearson: number; spearman: number; slope: number; intercept: number; trueCorrelation: number }

export function agreement(a: CardEffect[], b: CardEffect[], minGames = 0, relA = NaN, relB = NaN): Agreement {
  const bb = new Map(b.map((e) => [e.card, e]));
  const pairs = a.filter((e) => e.deckGames >= minGames && bb.has(e.card) && (bb.get(e.card) as CardEffect).deckGames >= minGames);
  const x = pairs.map((e) => e.est), y = pairs.map((e) => (bb.get(e.card) as CardEffect).est);
  const n = x.length;
  const mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += ((x[i] as number) - mx) * ((y[i] as number) - my); sxx += ((x[i] as number) - mx) ** 2; }
  const r = pearson(x, y);
  return { n, pearson: r, spearman: spearman(x, y), slope: sxy / sxx, intercept: my - (sxy / sxx) * mx, trueCorrelation: relA > 0 && relB > 0 ? r / Math.sqrt(relA * relB) : NaN };
}

/** The spread of the cards' TRUE values on a source's scale: sd(values) x sqrt(reliability). */
export function trueSpread(e: CardEffect[], reliability: number): number {
  if (e.length < 3 || !(reliability > 0)) return NaN;
  return sdOf(e.map((x) => x.est)) * Math.sqrt(reliability);
}

// ------------------------------------------------------------------ what a cube's decks are predicted to win

/**
 * A drafted two-colour deck, on average, as the lab's drafter and builder make it: this many nonland cards
 * of each of its two colours, of its pair's gold, and colourless (J145's lab decks give the numbers, the
 * command measures them).  A deck is assumed to play its classes' cards at random within the class: a
 * cube whose cards sit near one value per class makes that harmless, and it is the generator's design.
 */
export interface DeckMix { perColour: number; gold: number; colourless: number }

export interface PayoffPrediction {
  colour: Record<string, { est: number; lo: number; hi: number; sd: number }>;
  pair: Record<string, { est: number; lo: number; hi: number; sd: number }>;
  /** A pair deck's total predicted strength (sum of its expected card values), per replicate mean. */
  strength: Record<string, number>;
}

/**
 * Two-colour decks of each pair, opponents uniform over the other pairs (as J145's read counts a pair's
 * games against every deck that is not that pair): pair P's payoff = 1/2 + S_P - mean_{Q != P} S_Q, colour
 * c's = 1/2 + mean_{P ∋ c} S_P - mean_{Q ∌ c} S_Q.  S_P = perColour (m_X + m_Y) + gold g_P + colourless m_C,
 * m the class's mean card value, weighted by `weightOf` (how likely the lab's builder is to play the card: it
 * plays by rating, so a high-rated card is in more of its colour's decks; 1 for every card = played at random
 * within its class).  `value(card, rep)` gives a card's value in a replicate (rep -1: the point estimate).
 */
export function predictPayoffs(cards: Array<{ name: string; colors: string; land: boolean }>, value: (name: string, rep: number) => number, reps: number, mix: DeckMix, weightOf: (name: string) => number = () => 1): PayoffPrediction {
  const nonland = cards.filter((c) => !c.land && c.colors.length <= 2);
  const byClass = new Map<string, string[]>();
  for (const c of nonland) { const k = c.colors; byClass.set(k, [...(byClass.get(k) ?? []), c.name]); }
  const strengthOf = (rep: number): Record<string, number> => {
    const m = (k: string): number => { const xs = byClass.get(k) ?? []; let sw = 0, sv = 0; for (const n of xs) { const w = weightOf(n); sw += w; sv += w * value(n, rep); } return sw > 0 ? sv / sw : 0; };
    const mC = m('');
    return Object.fromEntries(PAIRS.map((p) => [p, mix.perColour * (m(p[0] as string) + m(p[1] as string)) + mix.gold * m(p) + mix.colourless * mC]));
  };
  const payoffs = (S: Record<string, number>): { colour: Record<string, number>; pair: Record<string, number> } => {
    const pair: Record<string, number> = {};
    for (const p of PAIRS) { const others = PAIRS.filter((q) => q !== p); pair[p] = 0.5 + (S[p] as number) - others.reduce((s, q) => s + (S[q] as number), 0) / others.length; }
    const colour: Record<string, number> = {};
    for (const c of MONO) {
      const has = PAIRS.filter((p) => p.includes(c)), not = PAIRS.filter((p) => !p.includes(c));
      colour[c] = 0.5 + has.reduce((s, p) => s + (S[p] as number), 0) / has.length - not.reduce((s, p) => s + (S[p] as number), 0) / not.length;
    }
    return { colour, pair };
  };
  const point = payoffs(strengthOf(-1));
  const rs = Array.from({ length: reps }, (_, b) => payoffs(strengthOf(b)));
  const cell = (key: 'colour' | 'pair', k: string): { est: number; lo: number; hi: number; sd: number } => {
    const xs = rs.map((r) => r[key][k] as number).sort((a, b) => a - b);
    return { est: point[key][k] as number, lo: quantile(xs, 0.025), hi: quantile(xs, 0.975), sd: sdOf(xs) };
  };
  return {
    colour: Object.fromEntries(MONO.map((c) => [c, cell('colour', c)])),
    pair: Object.fromEntries(PAIRS.map((p) => [p, cell('pair', p)])),
    strength: strengthOf(-1),
  };
}

/** max |payoff - .5| over a table's cells. */
export const maxGap = (t: Record<string, { est: number }>): number => Math.max(...Object.values(t).map((c) => Math.abs(c.est - 0.5)));

// ------------------------------------------------------------------ the generator

export interface GenCard {
  name: string;
  colors: string;
  mv: number;
  land: boolean;
  produces: string;
  creature: boolean;
  rating: number;
  /** The card's value on the band's scale, its SD, or null when the census never measured it. */
  value: number | null;
  sd: number | null;
  /** 0 for a card of the cube's own band(s), 1 for any other: costs `offBand` (a land: always a band card first). */
  tier?: number;
}

export interface GenOptions {
  /** The value every colour class's cards are pulled toward (win-rate points per game). */
  target: number;
  /** Cost per point of |value - target|, per point of SD, per rating point of |rating - ratingTarget|. */
  wValue: number;
  wSd: number;
  wRating: number;
  ratingTarget: number;
  /** An unmeasured card costs as if this far from the target (so it fills a slot only when nothing measured can). */
  unmeasuredGap: number;
  /** At least this many creatures among each colour's mono cards (a structural floor, D447's decks need bodies). */
  minCreaturesPerColour: number;
  /** Lands: cost per rating point below the best (lands are not in the model: chosen by the plan and the rating). */
  landRatingWeight: number;
  /** The cost of a nonland card from outside the cube's band(s), in value points (a land from outside is taken only when none inside fits). */
  offBand: number;
}

export const DEFAULT_GEN: GenOptions = {
  target: 0, wValue: 1000, wSd: 300, wRating: 0, ratingTarget: 60, unmeasuredGap: 0.06, minCreaturesPerColour: 10, landRatingWeight: 1, offBand: 0.04,
};

/**
 * 180 cards on a slot plan (sample.ts's `two-colour` structure: Omega's skeleton without its list — 24 a
 * colour, 2 gold a pair, 18 colourless, 2 lands a pair + 2 others, Omega's curve, every count exact), each
 * nonland slot filled at least cost:
 *
 *   cost = wValue |value - target| + wSd sd + wRating |rating - ratingTarget|
 *
 * so every colour class's cards sit near ONE value (its colour's predicted strength is then the same as
 * every other colour's, by construction) and near ONE Forge rating (the lab's drafter picks by rating, so
 * equal ratings is the lever on how evenly the bots draft each colour; human pull is not in any data).
 * A card outside the cube's band(s) (`tier` 1) costs `offBand` more, and a land from outside is taken only where no band land
 * fills the slot (lands are not in the model, so their band is the only thing that keeps a pauper cube's lands pauper).
 * The creature floor is enforced by a second pass: a colour short of creatures has its costliest
 * non-creature traded for its cheapest creature at the same mana-value bucket.  Integer costs for the
 * min-cost flow (skeleton.ts's selectSlots).
 */
export function generateCube<T extends GenCard>(pool: T[], plan: SlotPlan, o: GenOptions): T[] {
  const costOf = (c: GenCard): number => {
    const gap = c.value === null ? o.unmeasuredGap : Math.abs(c.value - o.target);
    const sd = c.sd ?? o.unmeasuredGap;
    return Math.round(1000 * (o.wValue * (gap + (c.tier ?? 0) * o.offBand) + o.wSd * sd + o.wRating * Math.abs(c.rating - o.ratingTarget) / 100));
  };
  const nonland = selectSlots(pool.filter((c) => !c.land), plan.nonland, plan.curve, (c) => {
    const g = nonlandGroupOf(plan, c.colors);
    return g === null ? [] : [{ group: g, cost: costOf(c) }];
  }, (c) => bucketOf(c.mv)).map((x) => x.item);
  // The creature floor, per colour, by swaps within one class and one bucket (the plan stays exact).
  const chosen = new Set(nonland.map((c) => c.name));
  for (const col of MONO) {
    for (let guard = 0; guard < 30; guard++) {
      const mine = nonland.filter((c) => c.colors === col);
      if (mine.filter((c) => c.creature).length >= o.minCreaturesPerColour) break;
      let best: { out: T; inn: T; d: number } | null = null;
      for (const out of mine.filter((c) => !c.creature)) {
        for (const inn of pool) {
          if (inn.land || !inn.creature || inn.colors !== col || chosen.has(inn.name) || bucketOf(inn.mv) !== bucketOf(out.mv)) continue;
          const d = costOf(inn) - costOf(out);
          if (!best || d < best.d) best = { out, inn, d };
        }
      }
      if (!best) break;
      nonland.splice(nonland.indexOf(best.out), 1, best.inn);
      chosen.delete(best.out.name); chosen.add(best.inn.name);
    }
  }
  const maxRating = Math.max(...pool.filter((c) => c.land).map((c) => c.rating), 0);
  const lands = selectSlots(pool.filter((c) => c.land), plan.lands, [sumOf(plan.lands)],
    (c) => landGroupsOf(plan, c.produces).map(({ group, superset }) => ({ group, cost: Math.round(1000 * ((c.tier ?? 0) * 1000 + (superset ? 50 : 0) + o.landRatingWeight * (maxRating - c.rating))) })), () => 0).map((x) => x.item);
  return [...nonland, ...lands];
}

/** Per colour class: the cards, their mean value and the measured share — the generator's own check. */
export function classSummary(cards: GenCard[]): Array<{ cls: string; n: number; measured: number; meanValue: number; meanRating: number; creatures: number }> {
  const classes = [...MONO, ...PAIRS, ''] as string[];
  return classes.map((cls) => {
    const xs = cards.filter((c) => !c.land && c.colors === cls);
    const m = xs.filter((c) => c.value !== null);
    return {
      cls: cls || 'C', n: xs.length, measured: m.length,
      meanValue: m.length ? m.reduce((s, c) => s + (c.value as number), 0) / m.length : NaN,
      meanRating: xs.length ? xs.reduce((s, c) => s + c.rating, 0) / xs.length : NaN,
      creatures: xs.filter((c) => c.creature).length,
    };
  });
}

/**
 * After the flow: best-improvement swaps that even the predicted payoffs out.  A move trades a nonland card for
 * a measured library card of the same colour class and mana-value bucket (so the plan stays exact), keeps the
 * colour's creature floor, and stays within `band` of the generator's level; the objective is max |colour - .5|
 * + max |pair - .5| on the point estimates (shrunk by the ridge already).  Stops when no move helps by `tol`.
 */
export function balanceSearch<T extends GenCard>(start: T[], pool: T[], value: (name: string) => number, mix: DeckMix, weightOf: (name: string) => number,
  o: { target: number; band: number; minCreaturesPerColour: number; maxSwaps: number; tol: number }): { cards: T[]; swaps: Array<{ out: string; in: string; gain: number }> } {
  let cards = [...start];
  const obj = (cs: T[]): number => { const p = predictPayoffs(cs, (n) => value(n), 0, mix, weightOf); return maxGap(p.colour) + maxGap(p.pair); };
  const swaps: Array<{ out: string; in: string; gain: number }> = [];
  const candidates = pool.filter((c) => !c.land && c.value !== null && Math.abs(c.value - o.target) <= o.band);
  for (let it = 0; it < o.maxSwaps; it++) {
    const inCube = new Set(cards.map((c) => c.name));
    const base = obj(cards);
    let best: { i: number; p: T; v: number } | null = null;
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i] as T;
      if (c.land) continue;
      const creatures = c.colors.length === 1 ? cards.filter((x) => !x.land && x.colors === c.colors && x.creature).length : Infinity;
      for (const p of candidates) {
        if (p.colors !== c.colors || bucketOf(p.mv) !== bucketOf(c.mv) || inCube.has(p.name)) continue;
        if (c.creature && !p.creature && creatures - 1 < o.minCreaturesPerColour) continue;
        const next = cards.slice();
        next[i] = p;
        const v = obj(next);
        if (!best || v < best.v) best = { i, p, v };
      }
    }
    if (!best || base - best.v < o.tol) break;
    swaps.push({ out: (cards[best.i] as T).name, in: best.p.name, gain: base - best.v });
    cards = cards.slice();
    cards[best.i] = best.p;
  }
  return { cards, swaps };
}

/** A play-weight curve: how often the lab's builder plays a card of this rating in a deck of its colours (least squares, clipped). */
export function playCurve(points: Array<{ rating: number; rate: number }>): { a: number; b: number; weight: (rating: number) => number } {
  const n = points.length;
  if (n < 3) return { a: 1, b: 0, weight: () => 1 };
  const mx = points.reduce((s, p) => s + p.rating, 0) / n, my = points.reduce((s, p) => s + p.rate, 0) / n;
  let sxy = 0, sxx = 0;
  for (const p of points) { sxy += (p.rating - mx) * (p.rate - my); sxx += (p.rating - mx) ** 2; }
  const b = sxx > 0 ? sxy / sxx : 0, a = my - b * mx;
  return { a, b, weight: (r: number) => Math.min(1, Math.max(0.05, a + b * r)) };
}

// ------------------------------------------------------------------ the measurement programme, simulated

export interface ProgrammeOptions {
  /** Candidate cubes measured a night (J145-shaped measurements). */
  perNight: number;
  /** The model's error on a candidate's colour and pair payoff at night 0 (SD), before any refit. */
  sigmaColour: number;
  sigmaPair: number;
  /** Each night's refit divides the model's error variance by (1 + kappa x nights so far). */
  kappa: number;
  /** One measurement's deck-games per colour cell and per pair cell (J145's arm B shape), and the design effect. */
  colourN: number;
  pairN: number[];
  deff: number;
  band: number;
  /** Pairs below this many deck-games are not judged (J145's swap rule: 400). */
  minPairN: number;
  /** 'no-off': every colour EVEN and no judged pair OFF; 'all-even': every colour and every judged pair EVEN. */
  rule: 'no-off' | 'all-even';
  maxNights: number;
  sims: number;
  seed: number;
}

function gauss(r: Rng): number {
  let u = 0;
  while (u === 0) u = r.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r.next());
}

/**
 * Nights until a generated cube passes a fresh-seed measurement AND a second fresh-seed confirmation (D447
 * point 9), when each candidate's true payoff deviations are the model's error (normal, SD sigma, shrinking
 * with each refit) and each measurement adds binomial noise at the measured n.  A night measures `perNight`
 * candidates; a pass takes one slot of the next night to confirm.  Returns the distribution of nights and
 * how often the confirmed cube is truly inside the band in every cell (what a pass is worth).
 */
export function simulateProgramme(o: ProgrammeOptions): { median: number; p80: number; within: number; truePass: number; byNight: number[] } {
  const r = rng(o.seed, 'balance-model/programme');
  const label = (est: number, hw: number): 'OFF' | 'EVEN' | 'UNCLEAR' => {
    const lo = est - hw, hi = est + hw;
    if ((lo > 0.5 || hi < 0.5) && Math.abs(est - 0.5) >= o.band) return 'OFF';
    if (lo >= 0.5 - o.band && hi <= 0.5 + o.band) return 'EVEN';
    return 'UNCLEAR';
  };
  const colourSd = Math.sqrt((0.25 * o.deff) / o.colourN);
  const pairSd = o.pairN.map((n) => Math.sqrt((0.25 * o.deff) / Math.max(1, n)));
  const measure = (truth: { c: number[]; p: number[] }): boolean => {
    for (const c of truth.c) if (label(0.5 + c + colourSd * gauss(r), 1.96 * colourSd) !== 'EVEN') return false;
    for (let j = 0; j < truth.p.length; j++) {
      if ((o.pairN[j] as number) < o.minPairN) continue;
      const sd = pairSd[j] as number;
      const l = label(0.5 + (truth.p[j] as number) + sd * gauss(r), 1.96 * sd);
      if (o.rule === 'no-off' ? l === 'OFF' : l !== 'EVEN') return false;
    }
    return true;
  };
  const nights: number[] = [];
  let trueOk = 0, done = 0;
  for (let s = 0; s < o.sims; s++) {
    let pending: { c: number[]; p: number[] } | null = null;
    let finished = 0;
    for (let night = 1; night <= o.maxNights && !finished; night++) {
      const shrink = 1 / Math.sqrt(1 + o.kappa * (night - 1));
      let slots = o.perNight;
      if (pending) {
        slots--;
        if (measure(pending)) {
          finished = night;
          if (pending.c.every((x) => Math.abs(x) < o.band) && pending.p.every((x) => Math.abs(x) < o.band)) trueOk++;
          break;
        }
        pending = null;
      }
      for (let k = 0; k < slots && !pending; k++) {
        const truth = { c: MONO.map(() => o.sigmaColour * shrink * gauss(r)), p: PAIRS.map(() => o.sigmaPair * shrink * gauss(r)) };
        if (measure(truth)) pending = truth;
      }
    }
    if (finished) { done++; nights.push(finished); } else nights.push(o.maxNights + 1);
  }
  nights.sort((a, b) => a - b);
  const byNight = Array.from({ length: o.maxNights }, (_, i) => nights.filter((n) => n <= i + 1).length / o.sims);
  return { median: quantile(nights, 0.5), p80: quantile(nights, 0.8), within: done / o.sims, truePass: done ? trueOk / done : NaN, byNight };
}
