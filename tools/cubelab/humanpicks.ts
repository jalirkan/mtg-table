// mtg-table — the cube lab: a drafter that picks like 17Lands' human drafters (D416).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// ForgeCoach #119 fitted a pick model to 17Lands' public Powered Cube draft data
// (CC BY 4.0) and ships it per cube as `public/cubes/<cube>.picks.json` (schema 1,
// ForgeCoach docs/human-picks.md).  It is a conditional logit: each card on offer
// gets a utility
//
//   u = s · (1 + γ·t) + β · x
//
// s the card's pick strength (log-odds), t = min(1, pool size / tScale), x eleven
// features of the card against the drafter's pool (colour fit, off-colour count,
// gold, colourless, land, a dual in the pool's two colours, curve).  This file
// computes u EXACTLY as ForgeCoach's `src/cube/humanPicks.ts` (`pickPool`,
// `pickFeatures`, `humanPickChances`) and its fitter `scripts/human-picks/fit.py`
// do: same features, same order, same constants from the file.  The tests check
// it against both (fixtures/human-picks/).
//
// What the lab adds, and only here:
//
// FACTS.  The features read a card's colours, land, mana value and the colours
//   a land makes.  A card the file covers takes the file's colours for a nonland
//   card (what the model was fitted with: Scryfall's, ForgeCoach `modelFacts`);
//   everything else comes from the lab's own LabCard (Forge's colours, `cmc`,
//   `land`, `produces` -- cards.ts `producesOf`, the same rules as ForgeCoach's).
//
// FALLBACK.  A cube card the file does not cover (not on Arena) gets
//   s = a + b · rating, a and b the least-squares line of s on the lab rating
//   (the cube's ratings TSV, the number the current drafter uses) over the cube's
//   COVERED cards: the expected human strength given the lab's rating.  Fitted
//   per cube when the drafter is built, reported in run.json.
//
// GRID LINES.  The model scores single picks; a grid line is two or three cards
//   taken at once.  A line's value is Σ exp(u) over its cards, taken in pick
//   order: the card with the highest u against the pool first, then the next
//   highest against the pool plus that card, and so on.  exp(u) is the Luce
//   weight the model puts on a card, so the line's value is the chance mass a
//   human's single pick would put on it, with each later card seeing the
//   colours the earlier ones add.  Two properties make it the choice:
//   a logit's utility is defined only up to an additive constant, and Σ exp(u)
//   ranks lines the same whatever that constant (a plain Σ u would not, when a
//   crossing line holds 2 cards and a parallel one 3); and exp makes the best
//   card dominate, as the current drafter's own `setValue` (best card + 0.6 ×
//   the rest) does.  Ties go to the lower line number, as `aiChooser`'s.
//
// Grid only.  Winston's take-or-pass needs a value on the same scale as a blind
// card's expectation, which the model does not give; `humanChooser` refuses it.
// Pure: no I/O.

import type { LabCard } from './cards.ts';
import { buildDeck, checkDeck } from './deck.ts';
import { aiChooser, gridDraft, type Chooser } from './draft.ts';
import type { DrafterOut, DraftOut, LoadedCube } from './lab.ts';
import { rng } from './rng.ts';
import type { Weights } from './weights.ts';

export const PICKS_SCHEMA = 1;
export const PICK_FEATURES = ['fit', 'fitT', 'off', 'offT', 'goldT', 'colourlessT', 'landT', 'dual', 'dualT', 'curve', 'curveT'] as const;
export type PickFeature = (typeof PICK_FEATURES)[number];

export interface PicksModel { gamma: number; beta: Record<PickFeature, number>; tScale: number; offShare: number; offMinPool: number }

/** The parts of a `.picks.json` the drafter reads. */
export interface HumanPicksFile {
  schema: 1;
  cube: { file: string; cards: number; matched: number };
  model: PicksModel;
  cards: Record<string, { s: number; colors?: string }>;
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isNum = (x: unknown, lo: number, hi: number): x is number => typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi;

/** Validates a parsed `.picks.json` (ForgeCoach's schema 1); throws saying what is wrong. A malformed card is dropped. */
export function parsePicks(raw: unknown): HumanPicksFile {
  if (!isObj(raw)) throw new Error('picks.json is not a JSON object');
  if (raw.schema !== PICKS_SCHEMA) throw new Error(`picks.json schema ${String(raw.schema)} is not supported (want ${PICKS_SCHEMA})`);
  const c = raw.cube;
  if (!isObj(c) || typeof c.file !== 'string' || !isNum(c.cards, 0, 1e6) || !isNum(c.matched, 0, 1e6)) throw new Error('picks.json: cube must give file, cards and matched');
  const m = raw.model;
  if (!isObj(m) || !isNum(m.gamma, -10, 10) || !isNum(m.tScale, 1, 1000) || !isNum(m.offShare, 0, 1) || !isNum(m.offMinPool, 0, 1000) || !isObj(m.beta)) {
    throw new Error('picks.json: model must give gamma, beta, tScale, offShare and offMinPool');
  }
  const beta = {} as Record<PickFeature, number>;
  for (const f of PICK_FEATURES) {
    const v = m.beta[f];
    if (!isNum(v, -100, 100)) throw new Error(`picks.json: model.beta.${f} must be a number`);
    beta[f] = v;
  }
  if (!isObj(raw.cards)) throw new Error('picks.json has no cards');
  const cards: HumanPicksFile['cards'] = {};
  for (const [k, v] of Object.entries(raw.cards)) {
    if (!isObj(v) || !isNum(v.s, -50, 50)) continue;
    cards[k] = typeof v.colors === 'string' && /^W?U?B?R?G?$/.test(v.colors) ? { s: v.s, colors: v.colors } : { s: v.s };
  }
  return { schema: 1, cube: { file: c.file, cards: c.cards, matched: c.matched }, model: { gamma: m.gamma, beta, tScale: m.tScale, offShare: m.offShare, offMinPool: m.offMinPool }, cards };
}

// ------------------------------------------------------------ the model (humanPicks.ts / fit.py)

const COLOURS = 'WUBRG';

/** What the features read about a card. */
export interface PickFacts { colors: string; land: boolean; mv: number; produces: string }

/** A pool's colour shares, top pair and curve (fit.py `_pool_stats`, humanPicks.ts `pickPool`). */
export interface PickPool { t: number; share: number[]; coloured: number; top2: Set<string>; hasPair: boolean; nonland: number; mvCounts: number[] }

const mvBucket = (mv: number): number => Math.min(Math.max(Math.trunc(mv), 1), 6) - 1;
const coloursOf = (s: string): string[] => [...s].filter((c) => COLOURS.includes(c));

/** `pool` holds each pool card's facts (undefined: unknown, left out as fit.py does); its length is the pool size. */
export function pickPool(pool: ReadonlyArray<PickFacts | undefined>, tScale: number): PickPool {
  const mass = [0, 0, 0, 0, 0];
  let coloured = 0;
  let nonland = 0;
  const mvCounts = [0, 0, 0, 0, 0, 0];
  for (const f of pool) {
    if (!f || f.land) continue;
    nonland++;
    mvCounts[mvBucket(f.mv)]! += 1;
    const cs = coloursOf(f.colors);
    if (!cs.length) continue;
    coloured++;
    for (const c of cs) mass[COLOURS.indexOf(c)]! += 1 / cs.length;
  }
  const tot = mass.reduce((a, b) => a + b, 0);
  const share = mass.map((x) => (tot > 0 ? x / tot : 0));
  // Top two colours by mass, ties in WUBRG order, only colours with mass.
  const order = [0, 1, 2, 3, 4].sort((a, b) => mass[b]! - mass[a]! || a - b);
  const top2 = new Set(order.slice(0, 2).filter((i) => mass[i]! > 0).map((i) => COLOURS[i]!));
  return { t: Math.min(1, pool.length / tScale), share, coloured, top2, hasPair: top2.size === 2, nonland, mvCounts };
}

/** The eleven features of one card against a pool, in PICK_FEATURES order. */
export function pickFeatures(f: PickFacts | undefined, pp: PickPool, model: Pick<PicksModel, 'offShare' | 'offMinPool'>): number[] {
  if (!f) return PICK_FEATURES.map(() => 0);
  const t = pp.t;
  const cs = coloursOf(f.colors);
  const land = f.land;
  const coloured = !land && cs.length > 0;
  const shares = cs.map((c) => pp.share[COLOURS.indexOf(c)]!);
  const fit = coloured ? Math.min(...shares) : 0;
  const off = coloured && pp.coloured >= model.offMinPool ? shares.filter((x) => x < model.offShare).length : 0;
  const gold = coloured && cs.length >= 2 ? 1 : 0;
  const cless = !land && cs.length === 0 ? 1 : 0;
  const dual = land && pp.hasPair && [...pp.top2].every((c) => f.produces.includes(c)) ? 1 : 0;
  const curve = !land && pp.nonland > 0 ? pp.mvCounts[mvBucket(f.mv)]! / pp.nonland : 0;
  return [fit, fit * t, off, off * t, gold * t, cless * t, (land ? 1 : 0) * t, dual, dual * t, curve, curve * t];
}

/** u = s · (1 + γ·t) + β · x. */
export function utility(model: PicksModel, s: number, f: PickFacts | undefined, pp: PickPool): number {
  const x = pickFeatures(f, pp, model);
  let u = s * (1 + model.gamma * pp.t);
  PICK_FEATURES.forEach((k, i) => { u += x[i]! * model.beta[k]; });
  return u;
}

// ------------------------------------------------------------ the drafter

export interface Fallback { intercept: number; slope: number; n: number; r: number }

/** The model bound to one cube's LabCards: every card's strength (file or fallback) and facts. */
export interface HumanDrafter {
  model: PicksModel;
  /** Strength by LabCard name. */
  s: Map<string, number>;
  facts: Map<string, PickFacts>;
  /** LabCard names the file covers. */
  covered: Set<string>;
  fallback: Fallback;
}

/** Least squares s = a + b·rating over the covered cards (b = 0 and a = mean s when the ratings do not vary). */
export function fitFallback(rows: Array<{ rating: number; s: number }>): Fallback {
  const n = rows.length;
  if (n === 0) return { intercept: 0, slope: 0, n: 0, r: 0 };
  const mx = rows.reduce((a, r) => a + r.rating, 0) / n;
  const my = rows.reduce((a, r) => a + r.s, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (const r of rows) { sxx += (r.rating - mx) ** 2; sxy += (r.rating - mx) * (r.s - my); syy += (r.s - my) ** 2; }
  const slope = sxx > 0 ? sxy / sxx : 0;
  const r = sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
  return { intercept: my - slope * mx, slope, n, r };
}

/**
 * Binds a picks file to a cube's cards.  A card is covered when the file has its lab name, or its
 * cube-listed name (`listedOf`, lab name -> the cube document's name), as a key.
 */
export function humanDrafter(file: HumanPicksFile, cards: readonly LabCard[], listedOf: ReadonlyMap<string, string> = new Map()): HumanDrafter {
  const s = new Map<string, number>();
  const facts = new Map<string, PickFacts>();
  const covered = new Set<string>();
  const rows: Array<{ rating: number; s: number }> = [];
  for (const c of cards) {
    const hit = file.cards[c.name] ?? file.cards[listedOf.get(c.name) ?? ''];
    const colors = hit?.colors !== undefined && !c.land ? hit.colors : c.colors;
    facts.set(c.name, { colors, land: c.land, mv: c.cmc, produces: c.produces });
    if (hit) { covered.add(c.name); s.set(c.name, hit.s); rows.push({ rating: c.rating, s: hit.s }); }
  }
  const fallback = fitFallback(rows);
  for (const c of cards) if (!covered.has(c.name)) s.set(c.name, fallback.intercept + fallback.slope * c.rating);
  return { model: file.model, s, facts, covered, fallback };
}

const strengthOf = (hd: HumanDrafter, c: LabCard): number => hd.s.get(c.name) ?? 0;
const factsOf = (hd: HumanDrafter, c: LabCard): PickFacts => hd.facts.get(c.name) ?? { colors: c.colors, land: c.land, mv: c.cmc, produces: c.produces };

/** The utility of taking `card` with `pool` (LabCards). */
export function cardUtility(hd: HumanDrafter, card: LabCard, pool: readonly LabCard[]): number {
  return utility(hd.model, strengthOf(hd, card), factsOf(hd, card), pickPool(pool.map((p) => factsOf(hd, p)), hd.model.tScale));
}

/** A line's value: Σ exp(u) over its cards, taken in pick order (highest u first, each against the pool so far). */
export function lineValue(hd: HumanDrafter, line: readonly LabCard[], pool: readonly LabCard[]): { value: number; order: string[] } {
  const left = [...line];
  const p = pool.map((c) => factsOf(hd, c));
  let value = 0;
  const order: string[] = [];
  while (left.length > 0) {
    const pp = pickPool(p, hd.model.tScale);
    let bi = 0;
    let bu = -Infinity;
    left.forEach((c, i) => {
      const u = utility(hd.model, strengthOf(hd, c), factsOf(hd, c), pp);
      if (u > bu) { bu = u; bi = i; }
    });
    const c = left.splice(bi, 1)[0]!;
    value += Math.exp(bu);
    order.push(c.name);
    p.push(factsOf(hd, c));
  }
  return { value, order };
}

const LINES: number[][] = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8]];

/** The human-pick chooser: the grid line with the highest `lineValue`.  Grid only. */
export function humanChooser(hd: HumanDrafter): Chooser {
  return {
    gridLine(d, grid, taken) {
      let best = -1;
      let bv = -Infinity;
      for (let l = 0; l < 6; l++) {
        if (l === taken) continue;
        const cs = (LINES[l] ?? []).map((i) => grid[i]).filter((c): c is LabCard => c != null);
        if (cs.length === 0) continue;
        const v = lineValue(hd, cs, d.state.picks).value;
        if (v > bv) { bv = v; best = l; }
      }
      return best;
    },
    takePile() {
      throw new Error('the human-pick drafter drafts grid only (its utilities have no blind-card scale for Winston)');
    },
  };
}

/** `--drafter human-picks:<file>` -> the file (null for any other spec, which the caller refuses). */
export function parseDrafterSpec(spec: string): { kind: 'human-picks'; file: string } | null {
  const m = /^human-picks:(.+)$/.exec(spec);
  return m && m[1] ? { kind: 'human-picks', file: m[1] } : null;
}

/**
 * One grid draft where seat `seat` drafts with the human pick model and the other seat with the current
 * drafter (`aiChooser`, the cube's ratings and weights).  The cards dealt, who opens each grid and the
 * deckbuilder are exactly a plain run's for that seed (lab.ts `runDraft`): only the one seat's line choices
 * differ.  Both seats build with the lab builder and the cube's ratings.  The logged pick values are the
 * current drafter's (gridDraft logs with the shared weights), for both seats.
 */
export function runHumanDraft(lc: LoadedCube, hd: HumanDrafter, seat: 'A' | 'B', seed: number, w: Weights): DraftOut {
  const t0 = Date.now();
  const r = rng(seed, 'draft:grid');
  const aOpens = seed % 2 === 0;
  const human = humanChooser(hd);
  const base = aiChooser(w, lc.pairs);
  const chooser: Chooser = {
    gridLine: (d, g, t) => (d.seat === seat ? human : base).gridLine(d, g, t),
    takePile: (d, p, i, b) => (d.seat === seat ? human : base).takePile(d, p, i, b),
  };
  const d = gridDraft(lc.cards, r, chooser, w, aOpens);
  const t1 = Date.now();
  const outs = d.drafters.map((dr): DrafterOut => {
    const pool = dr.state.picks;
    const deck = buildDeck(pool, w, lc.deckPairs);
    const deckErrors = deck
      ? checkDeck(deck, pool, lc.byName, deck.stretched ? w.maxSplashStretch : w.maxSplash)
      : ['no build reaches 22 castable spells, even with a wide splash, 18 lands or three colours'];
    return { seat: dr.seat, picks: dr.log, pool: pool.map((c) => c.name), deck, deckErrors };
  }) as [DrafterOut, DrafterOut];
  return { seed, format: 'grid', dealt: d.dealt.length, aOpens, drafters: outs, ms: { draft: t1 - t0, build: Date.now() - t1 } };
}
