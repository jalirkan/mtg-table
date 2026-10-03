// mtg-table — the cube lab: controlled exploration in the deckbuilder, and how its games are read (D356).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// THE PROBLEM.  The lab's deckbuilder chooses spells by rating, so a card rated
// low (Delver of Secrets 19.7, Ephemerate 22.9 on Forge's ranks) sits in on-colour
// pools and is almost never played.  The evolve loop's "dead" rule then cannot
// tell a weak card from an underrated one (`rating-limited`, D299), and the card
// has no games for any other rule.  More drafts do not help: the builder is the
// limit, not the sample.
//
// THE FIX.  A seeded, logged, randomised experiment inside the drafts:
//
//   1. A draft is EXPLORED with probability `share` (its own stream,
//      rng(seed, 'explore')), else it is PLAIN and nothing below happens.
//   2. In an explored draft, each seat's lab deck (built exactly as always: the
//      CHOICE deck) has ELIGIBLE targets: pool cards that are not lands, are
//      rated under `below` (the evolve's deadMinRating: the cards the
//      rating-limited rule protects, chosen by attribute before any game), are
//      not AI:RemAIDeck (their outcome is about Forge's AI, D301), are castable
//      in the deck's main colours, and are not in the choice deck.
//   3. At most one target is FORCED into the deck: target c is drawn with
//      probability v_c / max(sum of v over the eligible, cap), v = `gold` for a
//      multicolour card and 1 otherwise (a pair's gold cards sit in about a
//      fifth as many on-colour pools as a mono card), else none (seat stream
//      rng(seed, 'explore:A' | 'explore:B')).  That probability is the card's
//      PROPENSITY in this deck, recorded with the eligible list.
//   4. The forced card replaces the lowest-rated spell of its mana-value bucket
//      in the choice deck (the lowest-rated spell when the bucket has none; ties:
//      the one the builder chose last).  Lands and basics stay; the deck stays
//      legal (checked, or the draft throws).
//
// The drafts, the picks and the CHOICE decks are bit for bit those of a run
// without exploration at the same seed (the exploration draws come from
// streams of their own, after the builder is done).  drafts.jsonl's `deck` is
// the deck that PLAYED (every reader of games -- report, meta, learn, the ML
// datasets -- sees the truth), and `explore.seats[k].choice` keeps the choice
// deck.
//
// HOW IT IS READ (evolve.ts's batchStats; this file's exploreTable):
//   - the counting rules (dead, dominant-pick, deck rates, on-colour pools) read
//     the CHOICE decks of every draft: exactly an unexplored run's numbers;
//   - the game rules (dominant-win, the mean, the balance, the design effect)
//     read the PLAIN drafts only: a coin-chosen subset of an unexplored run's
//     drafts, so unbiased, only smaller;
//   - a target's EXPLORED evidence is a randomised comparison inside the
//     explored drafts: the decks it was forced into against the decks where it
//     was eligible and not forced, each weighted by the inverse of its recorded
//     probability (Hajek), with the deck's match as the unit (its variance by
//     linearisation, so the clumps of 2-3 games need no design effect).  Both
//     groups face opponents from the same explored drafts.  delta is "this card
//     in place of the builder's lowest choice", in win rate.
//
// Pure: no engine, no file system.

import { castableIn, type LabCard } from './cards.ts';
import { bucketOf, checkDeck, type DeckBuild } from './deck.ts';
import { benjaminiHochberg } from './evolve-stats.ts';
import { rng } from './rng.ts';

export interface ExploreOptions {
  /** Share of drafts explored, 0..1 (0 = off). */
  share: number;
  /** A target is forced with probability v / max(sum of the eligible's v, cap): with one eligible mono card, 1/cap. */
  cap: number;
  /** v of a multicolour target (a mono or colourless one is 1). */
  gold: number;
  /** Targets are rated under this (the evolve's deadMinRating). */
  below: number;
}

export const EXPLORE_DEFAULTS = { share: 0.3, cap: 4, gold: 4 } as const;

/** What one seat of an explored draft did. */
export interface ExploreSeat {
  /** The eligible targets, sorted, with each one's probability of being forced. */
  eligible: Array<[string, number]>;
  /** The forced card and the spell it replaced (null: none was drawn). */
  in: string | null;
  out: string | null;
  /** The deck the builder chose (drafter.deck is the one that played). */
  choice: DeckBuild;
}

/** drafts.jsonl's `explore`: present on an explored draft only. */
export interface ExploreRecord {
  share: number; cap: number; gold: number; below: number;
  /** Per seat; null when the seat had no legal lab deck. */
  seats: [ExploreSeat | null, ExploreSeat | null];
}

/** The draft shape this module needs (lab.ts's DraftOut, run.ts's DraftRecord). */
export interface ExplorableDraft {
  seed: number;
  drafters: Array<{ seat: 'A' | 'B'; pool: string[]; deck: DeckBuild | null; deckErrors: string[] }>;
  explore?: ExploreRecord;
}

export function checkExploreOptions(o: ExploreOptions): void {
  if (!(o.share >= 0 && o.share <= 1)) throw new Error(`explore share must be within 0..1, got ${o.share}`);
  if (!(o.cap >= 1)) throw new Error(`explore cap must be at least 1, got ${o.cap}`);
  if (!(o.gold > 0)) throw new Error(`explore gold must be above 0, got ${o.gold}`);
}

/** The targets a seat's choice deck leaves eligible, sorted by name. */
export function eligibleTargets(pool: string[], deck: DeckBuild, byName: Map<string, LabCard>, below: number): LabCard[] {
  const inDeck = new Set(deck.main.map(([, n]) => n));
  const out = new Map<string, LabCard>();
  for (const n of pool) {
    const c = byName.get(n);
    if (!c || c.land || c.remAIDeck || c.rating >= below || inDeck.has(n)) continue;
    if (castableIn(c, deck.colors)) out.set(n, c);
  }
  return [...out.values()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** Each eligible target's probability of being forced: v / max(sum v, cap). */
export function propensities(eligible: LabCard[], o: Pick<ExploreOptions, 'cap' | 'gold'>): Array<[string, number]> {
  const v = (c: LabCard): number => (c.colors.length >= 2 ? o.gold : 1);
  const total = Math.max(eligible.reduce((s, c) => s + v(c), 0), o.cap);
  return eligible.map((c) => [c.name, v(c) / total]);
}

/** The deck with `inCard` forced in: the spell it replaces, and the new DeckBuild. */
export function forceInto(deck: DeckBuild, inCard: LabCard, byName: Map<string, LabCard>): { out: string; deck: DeckBuild } {
  const spells = deck.main.map(([, n], i) => ({ n, i, c: byName.get(n) })).filter((x) => x.c && !x.c.land) as Array<{ n: string; i: number; c: LabCard }>;
  if (!spells.length) throw new Error(`explore: a deck with no spells (${deck.colors})`);
  const lowest = (xs: typeof spells): { n: string; i: number; c: LabCard } =>
    xs.reduce((a, b) => (b.c.rating < a.c.rating || (b.c.rating === a.c.rating && b.i > a.i) ? b : a));
  const same = spells.filter((x) => bucketOf(x.c.cmc) === bucketOf(inCard.cmc));
  const victim = lowest(same.length ? same : spells);
  const main = deck.main.map(([k, n], i): [number, string] => (i === victim.i ? [k, inCard.name] : [k, n]));
  const cards = main.map(([, n]) => byName.get(n)).filter((c): c is LabCard => !!c && !c.land);
  const curve = [0, 0, 0, 0, 0, 0];
  for (const c of cards) { const b = bucketOf(c.cmc); curve[b] = (curve[b] ?? 0) + 1; }
  const tc = new Map<string, number>();
  for (const c of cards) for (const t of c.themes) tc.set(t, (tc.get(t) ?? 0) + 1);
  return {
    out: victim.n,
    deck: {
      ...deck, main, curve,
      avgCmc: Math.round(cards.reduce((s, c) => s + c.cmc, 0) / cards.length * 100) / 100,
      creatures: cards.filter((c) => c.creature).length,
      themes: [...tc.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)),
    },
  };
}

/**
 * Explore one draft (after the builder): unchanged when the coin says plain or
 * the share is 0, else each seat's forced card and the decks that will play.
 */
export function exploreDraft<D extends ExplorableDraft>(d: D, o: ExploreOptions, byName: Map<string, LabCard>, maxSplash: (stretched: boolean) => number): D {
  if (o.share <= 0) return d;
  if (rng(d.seed, 'explore').next() >= o.share) return d;
  const seats = d.drafters.map((dr): ExploreSeat | null => {
    if (!dr.deck || dr.deckErrors.length) return null;
    const choice = dr.deck;
    const elig = eligibleTargets(dr.pool, choice, byName, o.below);
    const props = propensities(elig, o);
    const u = rng(d.seed, `explore:${dr.seat}`).next();
    let acc = 0;
    let pick: LabCard | null = null;
    for (let i = 0; i < elig.length; i++) {
      acc += (props[i] as [string, number])[1];
      if (u < acc) { pick = elig[i] as LabCard; break; }
    }
    if (!pick) return { eligible: props, in: null, out: null, choice };
    const f = forceInto(choice, pick, byName);
    const pool = dr.pool.map((n) => byName.get(n)).filter((c): c is LabCard => !!c);
    const errs = checkDeck(f.deck, pool, byName, maxSplash(f.deck.stretched));
    if (errs.length) throw new Error(`explore: seed ${d.seed} seat ${dr.seat}: forcing ${pick.name} for ${f.out} made an illegal deck: ${errs.join('; ')}`);
    return { eligible: props, in: pick.name, out: f.out, choice };
  }) as [ExploreSeat | null, ExploreSeat | null];
  const drafters = d.drafters.map((dr, k) => {
    const s = seats[k];
    if (!s?.in || !dr.deck) return dr;
    return { ...dr, deck: forceInto(s.choice, byName.get(s.in) as LabCard, byName).deck };
  });
  return { ...d, drafters, explore: { share: o.share, cap: o.cap, gold: o.gold, below: o.below, seats } };
}

// ------------------------------------------------------------------ reading the records

/** A plain draft: no exploration coin came up (its games are an unexplored run's). */
export const isPlain = (r: { explore?: ExploreRecord }): boolean => !r.explore;

/** The record as the builder chose it: every explored seat's deck put back to its choice deck. */
export function choiceRecord<R extends { explore?: ExploreRecord; drafters: Array<{ deck: DeckBuild | null }> }>(r: R): R {
  if (!r.explore) return r;
  const seats = r.explore.seats;
  return { ...r, drafters: r.drafters.map((dr, k) => (seats[k]?.in ? { ...dr, deck: seats[k]?.choice ?? dr.deck } : dr)) };
}

/** Additive sums for a Hajek ratio sum(w W) / sum(w G) and its linearised variance. */
export interface RatioSums { decks: number; games: number; wins: number; w: number; wG: number; wW: number; w2W2: number; w2WG: number; w2G2: number }
const zero = (): RatioSums => ({ decks: 0, games: 0, wins: 0, w: 0, wG: 0, wW: 0, w2W2: 0, w2WG: 0, w2G2: 0 });
function add(s: RatioSums, w: number, G: number, W: number): void {
  s.decks++; s.games += G; s.wins += W; s.w += w; s.wG += w * G; s.wW += w * W;
  s.w2W2 += w * w * W * W; s.w2WG += w * w * W * G; s.w2G2 += w * w * G * G;
}
export function addSums(a: RatioSums, b: RatioSums): RatioSums {
  const o = zero();
  for (const k of Object.keys(o) as Array<keyof RatioSums>) o[k] = a[k] + b[k];
  return o;
}

/** One target's explored evidence: the decks it was forced into, and the eligible decks it was not. */
export interface ExploreCell {
  treated: RatioSums;
  control: RatioSums;
  /** The sum of its propensities over the decks it was eligible in (the expected number of treated decks). */
  expected: number;
  /** Choice-deck mean rating, IPW-weighted, for the balance check (a pre-treatment covariate). */
  covT: number; covC: number;
}

export interface ExploreTable {
  drafts: number;
  explored: number;
  cells: Record<string, ExploreCell>;
}

/** Every target's sums over a batch's records (explored drafts only; plain drafts count toward `drafts`). */
export function exploreTable(recs: Array<{ explore?: ExploreRecord; match: { games: Array<{ winner: string }> } }>): ExploreTable {
  const cells: Record<string, ExploreCell> = {};
  let explored = 0;
  for (const r of recs) {
    if (!r.explore) continue;
    explored++;
    const decisive = r.match.games.filter((g) => g.winner === 'A' || g.winner === 'B');
    r.explore.seats.forEach((s, k) => {
      if (!s) return;
      const me = k === 0 ? 'A' : 'B';
      const G = decisive.length;
      const W = decisive.filter((g) => g.winner === me).length;
      const cov = s.choice.parts.meanRating ?? 0;
      for (const [name, p] of s.eligible) {
        const c = cells[name] ?? (cells[name] = { treated: zero(), control: zero(), expected: 0, covT: 0, covC: 0 });
        c.expected += p;
        if (name === s.in) { add(c.treated, 1 / p, G, W); c.covT += cov / p; } else if (p < 1) { add(c.control, 1 / (1 - p), G, W); c.covC += cov / (1 - p); }
      }
    });
  }
  return { drafts: recs.length, explored, cells };
}

/** Two tables' sums (generations pooled for the report). */
export function mergeTables(a: ExploreTable, b: ExploreTable): ExploreTable {
  const cells: Record<string, ExploreCell> = {};
  for (const t of [a, b]) for (const [n, c] of Object.entries(t.cells)) {
    const o = cells[n];
    cells[n] = o ? { treated: addSums(o.treated, c.treated), control: addSums(o.control, c.control), expected: o.expected + c.expected, covT: o.covT + c.covT, covC: o.covC + c.covC } : c;
  }
  return { drafts: a.drafts + b.drafts, explored: a.explored + b.explored, cells };
}

/** The Hajek ratio and its linearised variance (deck = cluster). */
export function ratio(s: RatioSums): { r: number; v: number } {
  if (s.wG <= 0) return { r: NaN, v: NaN };
  const r = s.wW / s.wG;
  const v = (s.w2W2 - 2 * r * s.w2WG + r * r * s.w2G2) / (s.wG * s.wG);
  return { r, v: Math.max(0, v) };
}

const phi = (z: number): number => {
  // Standard normal CDF (Abramowitz-Stegun 7.1.26 through erf), |error| < 1.5e-7.
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
};

export interface ExploreJudgeOptions {
  /** "Holds its own": delta's one-sided test rejects delta <= -margin. */
  margin: number;
  /** A target is judged only with at least this many treated decks (and as many control decks). */
  minDecks: number;
  /** Benjamini-Hochberg over every judged target's two one-sided tests. */
  q: number;
}

export const EXPLORE_JUDGE_DEFAULTS: ExploreJudgeOptions = { margin: 0.1, minDecks: 10, q: 0.1 };

export type ExploreVerdict = 'holds' | 'weak' | 'undecided' | 'too-few';

export interface ExploreJudgement {
  name: string;
  treatedDecks: number; treatedGames: number; treatedWins: number; controlDecks: number;
  expected: number;
  /** Win rate with the card forced in, without it (both IPW), their difference and its 95% interval. */
  withIt: number; without: number; delta: number; se: number; lo: number; hi: number;
  /** One-sided p of "delta >= 0" (weak) and of "delta <= -margin" (holds), and their BH q-values. */
  pWeak: number; pHolds: number; qWeak?: number; qHolds?: number;
  verdict: ExploreVerdict;
}

/** Every target's delta, and a verdict: holds its own when played, weak when played, undecided, or too few decks. */
export function judgeExplored(t: ExploreTable, o: ExploreJudgeOptions = EXPLORE_JUDGE_DEFAULTS): ExploreJudgement[] {
  const out: ExploreJudgement[] = [];
  for (const [name, c] of Object.entries(t.cells)) {
    const a = ratio(c.treated);
    const b = ratio(c.control);
    const delta = a.r - b.r;
    const se = Math.sqrt(a.v + b.v);
    const ok = c.treated.decks >= o.minDecks && c.control.decks >= o.minDecks && Number.isFinite(delta) && se > 0;
    out.push({
      name, treatedDecks: c.treated.decks, treatedGames: c.treated.games, treatedWins: c.treated.wins, controlDecks: c.control.decks,
      expected: c.expected, withIt: a.r, without: b.r, delta, se, lo: delta - 1.96 * se, hi: delta + 1.96 * se,
      pWeak: ok ? phi(delta / se) : 1, pHolds: ok ? 1 - phi((delta + o.margin) / se) : 1,
      verdict: ok ? 'undecided' : 'too-few',
    });
  }
  const judged = out.filter((j) => j.verdict !== 'too-few');
  const bh = benjaminiHochberg(judged.flatMap((j) => [j.pWeak, j.pHolds]), o.q);
  judged.forEach((j, i) => {
    j.qWeak = bh.q[2 * i] as number;
    j.qHolds = bh.q[2 * i + 1] as number;
    if (bh.reject[2 * i] && j.delta < 0) j.verdict = 'weak';
    else if (bh.reject[2 * i + 1]) j.verdict = 'holds';
  });
  return out.sort((x, y) => (x.name < y.name ? -1 : x.name > y.name ? 1 : 0));
}

/**
 * The pre-registered "is it broken" numbers (D356): the explored share against
 * its binomial interval, treated decks against the sum of propensities, the
 * pooled delta of every forced card, and the balance of a pre-treatment
 * covariate (the choice deck's mean rating) between treated and control.
 */
export interface ExploreHealth {
  drafts: number; explored: number; share: number; shareZ: number;
  treated: number; expected: number; treatedZ: number;
  pooledDelta: number; pooledSe: number;
  balanceDiff: number;
}

export function exploreHealth(t: ExploreTable, share: number): ExploreHealth {
  const n = t.drafts;
  const shareZ = n && share > 0 && share < 1 ? (t.explored - n * share) / Math.sqrt(n * share * (1 - share)) : 0;
  let treated = 0, expected = 0, varT = 0;
  let T = zero(), C = zero();
  let covT = 0, wT = 0, covC = 0, wC = 0;
  for (const c of Object.values(t.cells)) {
    treated += c.treated.decks; expected += c.expected;
    T = addSums(T, c.treated); C = addSums(C, c.control);
    covT += c.covT; wT += c.treated.w; covC += c.covC; wC += c.control.w;
  }
  // Treated decks are a sum of Bernoulli(propensity) draws, at most one per deck: variance <= expected.
  varT = expected;
  const a = ratio(T), b = ratio(C);
  return {
    drafts: n, explored: t.explored, share: n ? t.explored / n : 0, shareZ,
    treated, expected, treatedZ: varT > 0 ? (treated - expected) / Math.sqrt(varT) : 0,
    pooledDelta: a.r - b.r, pooledSe: Math.sqrt(a.v + b.v),
    balanceDiff: wT > 0 && wC > 0 ? covT / wT - covC / wC : 0,
  };
}
