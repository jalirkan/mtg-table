// mtg-table — the cube lab: deck SHAPES for the lab drafter and builder, and the shape exploration share (D446).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The lab drafter leans to two colours and the builder plays two (D294, D298), so mono decks and decks
// of three or more colours appear only as accidents of a thin pool.  A seat may be given a SHAPE to draft
// and build to (`--shape-a`, `--shape-b`):
//
//   auto          today's drafter and builder, exactly (the default; with both seats auto and no
//                 --shape-explore, run.ts never enters this file)
//   two-colour    the same as auto, under a name: the randomised control arm of the exploration
//   mono          commits to ONE colour at its 3rd pick (the heaviest so far), then takes on-colour or
//                 colourless cards; builds one colour, a splash of at most 2 one-pip cards, 16 lands
//                 (17 when its spells average mana value 3.0 or more)
//   three-colour  commits to its three heaviest colours at commitAt, fixers weighted up (x2); builds
//                 exactly three colours, 17 lands with 3+ fixers for them in the pool, else 18
//   good-stuff    no colour lean, the highest-rated card (no synergy), fixers colour-blind; builds the
//                 most colours (3-5) its fixers support, 18 lands
//
// `--shape-explore share=x` forces a random shape on each auto seat with probability x, from the draft's
// own stream, uniformly over the four, never the same shape on both seats (no mirrors).  Every number is
// a field of SHAPE_RULES, recorded in run.json; D446 is the decision and writes each one down.  Grid only.
//
// Pure: no engine, no file system.

import { BASIC_OF, castableIn, COLOURS, type LabCard } from './cards.ts';
import { buildDeck, buildOne, checkDeck, colourTriples, countNames, DECK_SIZE, type BuildOpts, type DeckBuild } from './deck.ts';
import { aiChooser, gridDraft, lineCards, type Chooser, type Drafter } from './draft.ts';
import type { DraftOut, DrafterOut, LoadedCube } from './lab.ts';
import { pairPoints, type PairTable } from './pairs.ts';
import { colourMass, committed, splashColourOf, synergyCount, type ScoreParts } from './pick.ts';
import { rng } from './rng.ts';
import type { Weights } from './weights.ts';

/** The four shapes a seat can be forced to, in the order the exploration draws them. */
export const SHAPES = ['mono', 'two-colour', 'three-colour', 'good-stuff'] as const;
export type ForcedShape = (typeof SHAPES)[number];
export type Shape = 'auto' | ForcedShape;
export const SHAPE_NAMES: readonly Shape[] = ['auto', ...SHAPES];

/** D446's numbers, each written in the decision before any test. */
export const SHAPE_RULES = {
  /** mono: commits to one colour from this decision (that takes cards) on, the heaviest colour of the picks before it. */
  monoCommitPick: 3,
  /** mono: a splash of at most this many cards, each needing at most one pip of the splash colour. */
  monoMaxSplash: 2,
  /** mono: 17 lands (and 23 spells) instead of 16 (and 24) when those 24 spells average this mana value or more. */
  monoSeventeenAt: 3.0,
  /** three-colour: the drafter's fixing term is multiplied by this. */
  threeFixingMult: 2,
  /** three-colour: 17 lands with at least this many fixers for the triple in the pool, else 18. */
  threeFixers: 3,
  /** three-colour: each main colour is needed by at least this many spells. */
  threeMinPerColour: 3,
  /** good-stuff: the drafter's synergy points per theme (0: the highest-rated card). */
  goodSynergy: 0,
  /** good-stuff: a set of k colours needs this many fixers per colour beyond two. */
  goodFixersPerColour: 3,
  /** good-stuff: each main colour is needed by at least this many spells. */
  goodMinPerColour: 2,
  /** good-stuff: its land count. */
  goodLands: 18,
  /** `--shape-explore on`: the share. */
  exploreShareOn: 0.25,
} as const;
export type ShapeRules = typeof SHAPE_RULES;

export function isShape(s: string): s is Shape {
  return (SHAPE_NAMES as readonly string[]).includes(s);
}

/** A shape that is not today's drafter and builder (auto and two-colour are). */
export const isShaped = (s: Shape): boolean => s !== 'auto' && s !== 'two-colour';

// ---------------------------------------------------------------- the drafter

/** The `n` heaviest colours by colour mass (ties in WUBRG order), as a WUBRG-ordered string. */
export function topColours(m: Record<string, number>, n: number): string {
  const order = [...COLOURS].sort((a, b) => (m[b] ?? 0) - (m[a] ?? 0) || COLOURS.indexOf(a) - COLOURS.indexOf(b));
  const keep = new Set(order.slice(0, n));
  return COLOURS.filter((c) => keep.has(c)).join('');
}

/**
 * A mono drafter's colour: null before its `monoCommitPick`-th decision that takes cards; from then on the heaviest
 * colour of the picks of its first K taking decisions, K the smallest from monoCommitPick - 1 whose picks carry colour
 * mass (so it is fixed at the first such decision and never moves).
 */
export function monoColour(d: Drafter, R: ShapeRules = SHAPE_RULES): string | null {
  const taking = d.log.filter((p) => p.took.length > 0);
  const before = R.monoCommitPick - 1;
  if (taking.length < before) return null;
  let n = 0;
  for (let k = 0; k < taking.length; k++) {
    n += (taking[k] as { took: string[] }).took.length;
    if (k + 1 < before) continue;
    const m = colourMass(d.state.picks.slice(0, n));
    if (Object.values(m).some((x) => x > 0)) return topColours(m, 1);
  }
  return null;
}

/** The colours a shaped drafter is committed to (null: not committed; good-stuff never is). */
export function shapeColours(shape: Shape, d: Drafter, w: Weights, R: ShapeRules = SHAPE_RULES): string | null {
  if (shape === 'mono') return monoColour(d, R);
  if (shape === 'three-colour') return committed(d.state, w) ? topColours(colourMass(d.state.picks), 3) : null;
  return null;
}

/** A shaped drafter's value for a card (mono, three-colour, good-stuff; D446 point 2). */
export function scoreShaped(card: LabCard, d: Drafter, w: Weights, shape: ForcedShape, table?: PairTable, R: ShapeRules = SHAPE_RULES): ScoreParts {
  const s = d.state;
  const colours = shapeColours(shape, d, w, R);
  const rating = card.land ? card.rating * w.landScale : card.rating;
  const among = colours ? s.picks.filter((p) => castableIn(p, colours)) : s.picks;
  const synergy = (shape === 'good-stuff' ? R.goodSynergy : w.synergy) * synergyCount(card, among, w.synergyCap);
  let colour = 0;
  let fixing = 0;
  if (shape !== 'good-stuff' && !card.land && card.colors) {
    if (colours === null) {
      // before commitment: today's lean
      const m = colourMass(s.picks);
      const total = Object.values(m).reduce((a, b) => a + b, 0);
      if (total > 0) {
        let share = 0;
        for (const c of card.colors) share += (m[c] ?? 0) / total;
        colour = w.lean * (share / card.colors.length) * 2;
      }
    } else if (!castableIn(card, colours)) colour = -w.offColour;
  }
  if (card.land || card.fixer) {
    if (shape === 'mono' && colours !== null) {
      if (card.land && !card.produces.includes(colours)) fixing = -w.fixing;
    } else if (shape === 'three-colour' && colours !== null) {
      const makes = [...colours].filter((c) => card.produces.includes(c)).length;
      if (makes >= 2) fixing = w.fixing * R.threeFixingMult;
      else if (makes === 1 && card.produces.length >= 2) fixing = (w.fixing / 2) * R.threeFixingMult;
      else if (card.land) fixing = -w.fixing;
    } else if (shape === 'good-stuff') {
      if (card.produces.length >= 2) fixing = w.fixing;
    }
  }
  const ai = card.remAIDeck ? -w.remAIDeck : 0;
  const pairs = table ? pairPoints(table, card.name, among) : 0;
  return { rating, synergy, colour, fixing, ai, pairs, total: rating + synergy + colour + fixing + ai + pairs };
}

/** A line taken at once, valued as pick.ts's setValue does, with the shaped score. */
export function setValueShaped(cards: LabCard[], d: Drafter, w: Weights, shape: ForcedShape, table?: PairTable, R: ShapeRules = SHAPE_RULES): number {
  const v = cards.map((c) => Math.max(0, scoreShaped(c, d, w, shape, table, R).total)).sort((a, b) => b - a);
  let sum = 0;
  v.forEach((x, i) => { sum += i === 0 ? x : x * w.setRest; });
  return sum;
}

/** The grid chooser for two seats with shapes: an auto or two-colour seat is aiChooser exactly. */
export function shapedChooser(w: Weights, shapes: Record<'A' | 'B', Shape>, table?: PairTable, R: ShapeRules = SHAPE_RULES): Chooser {
  const base = aiChooser(w, table);
  return {
    gridLine(d, grid, taken) {
      const shape = shapes[d.seat];
      if (!isShaped(shape)) return base.gridLine(d, grid, taken);
      let best = -1;
      let bv = -Infinity;
      for (let l = 0; l < 6; l++) {
        if (l === taken) continue;
        const cs = lineCards(grid, l);
        if (cs.length === 0) continue;
        const v = setValueShaped(cs, d, w, shape as ForcedShape, table, R);
        if (v > bv) { bv = v; best = l; }
      }
      return best;
    },
    takePile() { throw new Error('shapes are grid only (D446)'); },
  };
}

// ---------------------------------------------------------------- the builder

const makes = (card: LabCard, c: string): boolean => card.produces.includes(c);

/** Fixers for a colour set in a pool: lands and nonland fixers producing at least two of its colours. */
export function fixersFor(pool: LabCard[], set: string): number {
  return pool.filter((c) => (c.land || c.fixer) && [...set].filter((k) => makes(c, k)).length >= 2).length;
}

/** Every k-colour set, WUBRG-ordered strings. */
export function colourSets(k: number): string[] {
  const out: string[] = [];
  const rec = (start: number, acc: string): void => {
    if (acc.length === k) { out.push(acc); return; }
    for (let i = start; i < COLOURS.length; i++) rec(i + 1, acc + COLOURS[i]);
  };
  rec(0, '');
  return out;
}

function best(builds: DeckBuild[]): DeckBuild | null {
  if (builds.length === 0) return null;
  builds.sort((a, b) => b.score - a.score);
  const top = builds[0] as DeckBuild;
  top.alternatives = builds.slice(1, 4).map((b) => ({ colors: b.colors, splash: b.splash, score: b.score }));
  return top;
}

/** A shaped seat's deck (D446 point 3): null when the shape has no legal build (the seat then plays today's). */
export function buildShapedDeck(pool: LabCard[], w: Weights, shape: ForcedShape, table?: PairTable, R: ShapeRules = SHAPE_RULES): DeckBuild | null {
  if (shape === 'two-colour') return buildDeck(pool, w, table);
  const plain = { eighteen: false, stretched: false, table } as const;
  if (shape === 'mono') {
    const builds: DeckBuild[] = [];
    for (const c of COLOURS) {
      const splashes: Array<string | null> = [null];
      for (const s of COLOURS) {
        if (s === c) continue;
        const sources = pool.filter((x) => (x.land || x.fixer) && makes(x, s) && (x.fixer || makes(x, c))).length;
        const worth = pool.some((x) => !x.land && splashColourOf(x, c) === s && x.rating >= w.splashMinRating);
        if (sources >= 1 && worth) splashes.push(s);
      }
      for (const s of splashes) {
        const o: BuildOpts = { maxSplash: R.monoMaxSplash, ...plain, shaped: { lands: { monoAt: R.monoSeventeenAt }, shapeScore: true } };
        const b = buildOne(pool, c, s, w, o);
        if (b) builds.push(b);
      }
    }
    return best(builds);
  }
  if (shape === 'three-colour') {
    const builds: DeckBuild[] = [];
    for (const t of colourTriples()) {
      const lands = fixersFor(pool, t) >= R.threeFixers ? 17 : 18;
      const b = buildOne(pool, t, null, w, { maxSplash: 0, ...plain, shaped: { lands: { fixed: lands }, minPerColour: R.threeMinPerColour, shapeScore: true } });
      if (b) builds.push(b);
    }
    return best(builds);
  }
  // good-stuff: the largest k (5, 4, 3) whose supported sets have a build; the best of that size
  for (const k of [5, 4, 3]) {
    const builds: DeckBuild[] = [];
    for (const set of colourSets(k)) {
      if (fixersFor(pool, set) < R.goodFixersPerColour * (k - 2)) continue;
      const b = buildOne(pool, set, null, w, { maxSplash: 0, ...plain, shaped: { lands: { fixed: R.goodLands }, minPerColour: R.goodMinPerColour, shapeScore: true } });
      if (b) builds.push(b);
    }
    const top = best(builds);
    if (top) return top;
  }
  return null;
}

/** The deck rules of a shaped build (D446 point 3), as a list of what is wrong (empty = legal). */
export function checkShapedDeck(d: Pick<DeckBuild, 'main' | 'colors' | 'splash'>, pool: LabCard[], byName: Map<string, LabCard>, shape: ForcedShape, R: ShapeRules = SHAPE_RULES): string[] {
  if (shape === 'two-colour') return checkDeck(d, pool, byName, 3);
  const errs: string[] = [];
  const total = d.main.reduce((s, [n]) => s + n, 0);
  if (total !== DECK_SIZE) errs.push(`${total} cards, not ${DECK_SIZE}`);
  const basicNames = new Set(Object.values(BASIC_OF));
  const have = countNames(pool);
  let lands = 0;
  let splashN = 0;
  const [cMin, cMax, lMin, lMax, maxSplash] = shape === 'mono' ? [1, 1, 16, 17, R.monoMaxSplash]
    : shape === 'three-colour' ? [3, 3, 17, 18, 0] : [3, 5, R.goodLands, R.goodLands, 0];
  if (d.colors.length < cMin || d.colors.length > cMax) errs.push(`${shape}: main colours "${d.colors}"`);
  if (d.splash && (maxSplash === 0 || d.splash.length !== 1 || d.colors.includes(d.splash))) errs.push(`${shape}: splash "${d.splash}"`);
  for (const [n, name] of d.main) {
    if (basicNames.has(name)) { lands += n; continue; }
    const card = byName.get(name);
    if (!card) { errs.push(`unknown card ${name}`); continue; }
    if (n > (have.get(name) ?? 0)) errs.push(`${n} ${name} but the pool holds ${have.get(name) ?? 0}`);
    if (card.land) { lands += n; continue; }
    if (castableIn(card, d.colors)) continue;
    if (d.splash && splashColourOf(card, d.colors) === d.splash) { splashN += n; continue; }
    errs.push(`${name} (${card.colors}) is off-colour for ${d.colors}${d.splash ? `+${d.splash}` : ''}`);
  }
  if (lands < lMin || lands > lMax) errs.push(`${lands} lands, not ${lMin}-${lMax}`);
  if (splashN > maxSplash) errs.push(`${splashN} splash cards, more than ${maxSplash}`);
  return errs;
}

// ---------------------------------------------------------------- the exploration share

export interface ShapeSeat { shape: Shape; forced: boolean }
export type ShapePlan = Record<'A' | 'B', ShapeSeat>;

/** The exploration: each auto seat forced with probability `share`, to a shape drawn by `weights` (SHAPES order, summing to 1). */
export interface ShapeExplore { share: number; weights: number[] }

/** Equal weights: every forced shape uniform (D446 point 4's default). */
export const EQUAL_WEIGHTS: readonly number[] = SHAPES.map(() => 1 / SHAPES.length);

/** The index whose cumulative weight first exceeds x (x in [0, 1)), over `idx` with these weights renormalised. */
function drawIndex(x: number, idx: number[], weights: readonly number[]): number {
  const total = idx.reduce((t, i) => t + (weights[i] ?? 0), 0);
  let acc = 0;
  for (const i of idx) {
    acc += (weights[i] ?? 0) / total;
    if (x < acc) return i;
  }
  return idx[idx.length - 1] as number;
}

/**
 * The shapes of a draft's two seats (D446 point 4): a fixed (non-auto) seat keeps its shape; an auto seat is forced
 * when its draw u is under `share`, to a shape drawn by the weights from a second draw x; B never gets the shape a
 * forced A got (its weights renormalised over the other three).  Four draws always, from rng(seed, 'shape-explore')
 * alone, in the order uA, xA, uB, xB.
 */
export function shapePlan(seed: number, fixed: Record<'A' | 'B', Shape>, ex: ShapeExplore | number): ShapePlan {
  const { share, weights } = typeof ex === 'number' ? { share: ex, weights: EQUAL_WEIGHTS } : ex;
  const r = rng(seed, 'shape-explore');
  const uA = r.next(), xA = r.next(), uB = r.next(), xB = r.next();
  const all = SHAPES.map((_, i) => i);
  const A: ShapeSeat = fixed.A !== 'auto' ? { shape: fixed.A, forced: false }
    : uA < share ? { shape: SHAPES[drawIndex(xA, all, weights)] as ForcedShape, forced: true } : { shape: 'auto', forced: false };
  let B: ShapeSeat;
  if (fixed.B !== 'auto') B = { shape: fixed.B, forced: false };
  else if (uB < share) {
    const idx = A.forced ? all.filter((i) => SHAPES[i] !== A.shape) : all;
    B = { shape: SHAPES[drawIndex(xB, idx, weights)] as ForcedShape, forced: true };
  } else B = { shape: 'auto', forced: false };
  return { A, B };
}

/**
 * Each seat's probability of each forced shape under the exploration (exact: A's are share x weights; B's sum over A's
 * forced shapes), for a job's expected game counts.  Both seats auto.
 */
export function shapeMarginals(ex: ShapeExplore): { A: number[]; B: number[] } {
  const w = ex.weights, s = ex.share;
  const A = w.map((x) => s * x);
  const B = SHAPES.map((_, k) => {
    let p = (1 - s) * (w[k] ?? 0);
    for (let j = 0; j < SHAPES.length; j++) if (j !== k) p += s * (w[j] ?? 0) * (w[k] ?? 0) / (1 - (w[j] ?? 0));
    return s * p;
  });
  return { A, B };
}

/**
 * `--shape-explore on`, or `share=x` and optional weights `mono=a,two-colour=b,three-colour=c,good-stuff=d` (any that are
 * given; the rest 0 when one is given, every one equal when none is; normalised to sum 1).  Null when not given.
 */
export function parseShapeExplore(args: string[], R: ShapeRules = SHAPE_RULES): ShapeExplore | null {
  if (args.length === 0) return null;
  let share: number = R.exploreShareOn;
  const given = new Map<string, number>();
  for (const a of args.flatMap((x) => x.split(',')).map((x) => x.trim()).filter(Boolean)) {
    if (a === 'on') continue;
    const m = /^([a-z-]+)=(.+)$/.exec(a);
    if (!m) throw new Error(`--shape-explore wants on, share=<0..1> or <shape>=<weight>, got "${a}"`);
    const v = Number(m[2]);
    if (m[1] === 'share') share = v;
    else if ((SHAPES as readonly string[]).includes(m[1] as string)) {
      if (!(v >= 0 && Number.isFinite(v))) throw new Error(`--shape-explore ${m[1]} wants a weight >= 0, got ${m[2]}`);
      given.set(m[1] as string, v);
    } else throw new Error(`--shape-explore: unknown ${m[1]} (share, ${SHAPES.join(', ')})`);
  }
  if (!(share > 0 && share <= 1)) throw new Error(`--shape-explore share must be in (0, 1], got ${share}`);
  let weights = [...EQUAL_WEIGHTS];
  if (given.size > 0) {
    const raw = SHAPES.map((x) => given.get(x) ?? 0);
    const total = raw.reduce((t, x) => t + x, 0);
    if (!(total > 0)) throw new Error('--shape-explore: the weights sum to 0');
    if (raw.filter((x) => x > 0).length < 2) throw new Error('--shape-explore: give at least two shapes a weight (B never takes A\'s shape)');
    weights = raw.map((x) => Math.round((x / total) * 1e6) / 1e6);
  }
  return { share, weights };
}

/** `share=1,mono=0.5,...`: the form the flag takes. */
export function shapeExploreText(ex: ShapeExplore): string {
  return [`share=${ex.share}`, ...SHAPES.map((x, i) => `${x}=${ex.weights[i]}`)].join(',');
}

// ---------------------------------------------------------------- one draft

/** A drafter's line, with its shape (present whenever shapes are on). */
export interface ShapedDrafterOut extends DrafterOut { shape: Shape; shapeForced: boolean; shapeFallback?: true }

/** One grid draft with each seat's shape: today's draft for an auto or two-colour seat, the shaped one otherwise. */
export function runShapedDraft(lc: LoadedCube, seed: number, w: Weights, plan: ShapePlan, R: ShapeRules = SHAPE_RULES): DraftOut {
  const t0 = Date.now();
  const r = rng(seed, 'draft:grid');
  const aOpens = seed % 2 === 0;
  const chooser = shapedChooser(w, { A: plan.A.shape, B: plan.B.shape }, lc.pairs, R);
  const d = gridDraft(lc.cards, r, chooser, w, aOpens);
  const t1 = Date.now();
  const drafters = d.drafters.map((dr): ShapedDrafterOut => {
    const seat = plan[dr.seat];
    const pool = dr.state.picks;
    const shaped = isShaped(seat.shape);
    let deck = shaped ? buildShapedDeck(pool, w, seat.shape as ForcedShape, lc.deckPairs, R) : null;
    const fallback = shaped && !deck;
    let deckErrors: string[];
    if (deck) {
      deckErrors = checkShapedDeck(deck, pool, lc.byName, seat.shape as ForcedShape, R);
      if (deckErrors.length > 0) throw new Error(`seed ${seed} seat ${dr.seat}: a ${seat.shape} build broke its own rules: ${deckErrors.join('; ')}`);
    } else {
      deck = buildDeck(pool, w, lc.deckPairs);
      deckErrors = deck
        ? checkDeck(deck, pool, lc.byName, deck.stretched ? w.maxSplashStretch : w.maxSplash)
        : ['no build reaches 22 castable spells, even with a wide splash, 18 lands or three colours'];
    }
    return {
      seat: dr.seat, picks: dr.log, pool: pool.map((c) => c.name), deck, deckErrors,
      shape: seat.shape, shapeForced: seat.forced, ...(fallback ? { shapeFallback: true as const } : {}),
    };
  }) as [ShapedDrafterOut, ShapedDrafterOut];
  return { seed, format: 'grid', dealt: d.dealt.length, aOpens, drafters, ms: { draft: t1 - t0, build: Date.now() - t1 } };
}
