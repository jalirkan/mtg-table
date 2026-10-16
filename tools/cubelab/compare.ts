// mtg-table — the cube lab: `compare`, which cube population drafts the more balanced decks (D441).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   tools/cubelab.sh compare <cubeA.md> <cubeB.md> ... [--variant name=<cube.md>[,ratings=<tsv>][,weight.<w>=<v>]...]...
//       [--drafts N] [--seed S] [--games 3] [--jobs K] [--out <dir>] [--boot 1000] [--boot-seed 1]
//       [--min-pair-games 30] [--rule <measure>:lower-better|higher-better[:margin=x]]... [--no-run]
//       [run's flags, passed to every population: --format, --profiles, --game-timeout, --weight, ...]
//
// Two to six POPULATIONS -- a cube file, or a cube file plus a ratings file and weights (a
// "variant") -- are each played through the lab's own `run` (cli.ts hands it in: nothing here
// drafts or plays) on THE SAME SEED BLOCK, into <out>/runs/<name>/, resumable like any run.
// Then every population's drafts are read back and these pre-registered measures computed
// (D441 is the decision; docs/guides/cube-lab.md's *Comparing cube populations* the manual):
//
//   flatness          the noise-corrected spread (true SD) of the cards' win rates, exactly as
//                     ForgeCoach's flatness.ts computes it from meta.json (flatness.ts here is the
//                     port; the units are built from the drafts as meta.ts would write them)
//   pair_spread       max - min of the two-colour pairs' win rates, over pairs with at least
//                     --min-pair-games decisive games
//   pair_within5      the share of those pairs within 5 points of 0.5
//   draw_rate         draws (timeouts included) per game; timeout_rate, timeouts per game
//   game_turns        mean turns a game
//   lands, colours    the played decks' mean land count and colour count (main colours + splash)
//   two_colour        the share of played decks with exactly two main colours (splash or not)
//   splash            the share of played decks with a splash
//   first_pick_top10  pick-order concentration: of every card in the first line taken from each
//                     grid (evolve's firstTakes; a Winston draft, each drafter's first take), the
//                     share held by the 10 cards taken there most
//
// Every estimate is the measure on all the drafts; its 95% interval the percentile interval of a
// DRAFT-CLUSTERED bootstrap: a replicate draws the common seeds with replacement and takes each
// drafted seed's whole line (both decks, every game) in EVERY population at once, so a pairwise
// difference is resampled as a paired statistic (the same seeds; for two variants of one cube the
// same deals) and its interval says whether it excludes 0.  No verdict is printed unless a --rule
// asks for one: "A beats B" when A is better by more than the margin (in the measure's display
// unit: points for rates and shares, plain for lands, colours and turns) AND the difference's
// interval excludes 0.  Without a rule the output ranks and intervals only.
//
// Outputs: <out>/compare.json (strict JSON: no NaN, no strings, no arrays -- a missing estimate is
// a missing key -- so the lab runner's `sh:` metrics read it flat) and <out>/compare.md.

import fs from 'node:fs';
import path from 'node:path';

import { firstTakes } from './evolve.ts';
import { spreadOf, spreadParts, CARD_MIN_GAMES, MIN_UNITS, type SpreadStats, type SpreadUnit } from './flatness.ts';
import { readJsonLines } from './lines.ts';
import { SHRINK_K } from './meta.ts';
import { filterPlayExplore } from './playexplore.ts';
import { playedDeck, type CardInfo } from './report.ts';
import { rng } from './rng.ts';
import type { DraftRecord, RunMeta } from './run.ts';
import { VERIFY_SEED_MIN } from './seeds.ts';
import { DEFAULT_WEIGHTS } from './weights.ts';

// ---------------------------------------------------------------- the measures

export interface MeasureDef { id: MeasureId; title: string; scale: number; unit: string; digits: number; /** The measure's natural range (a recentred replicate is clamped to it). */ max: number; /** Its bootstrap replicates are recentred on the estimate (compare()). */ recentre?: boolean }
export type MeasureId = 'flatness' | 'pair_spread' | 'pair_within5' | 'draw_rate' | 'timeout_rate' | 'game_turns'
  | 'lands' | 'colours' | 'two_colour' | 'splash' | 'first_pick_top10';

/** The measures, in report order. `scale` turns a value into its display unit (and a rule's margin's unit). */
export const MEASURES: MeasureDef[] = [
  { id: 'flatness', title: 'Card-rate flatness: true SD of the cards\' win rates', scale: 100, unit: 'pts', digits: 2, max: 1 , recentre: true },
  { id: 'pair_spread', title: 'Colour-pair spread: max - min pair win rate', scale: 100, unit: 'pts', digits: 1, max: 1 , recentre: true },
  { id: 'pair_within5', title: 'Colour pairs within 5 points of 50%', scale: 100, unit: '%', digits: 1, max: 1 },
  { id: 'draw_rate', title: 'Draws (timeouts included) per game', scale: 100, unit: '%', digits: 2, max: 1 },
  { id: 'timeout_rate', title: 'Timeouts per game', scale: 100, unit: '%', digits: 2, max: 1 },
  { id: 'game_turns', title: 'Mean game length, turns', scale: 1, unit: 'turns', digits: 2, max: Infinity },
  { id: 'lands', title: 'Mean lands in a played deck', scale: 1, unit: 'lands', digits: 3, max: Infinity },
  { id: 'colours', title: 'Mean colours in a played deck (main + splash)', scale: 1, unit: 'colours', digits: 3, max: Infinity },
  { id: 'two_colour', title: 'Played decks with exactly two main colours', scale: 100, unit: '%', digits: 1, max: 1 },
  { id: 'splash', title: 'Played decks with a splash', scale: 100, unit: '%', digits: 1, max: 1 },
  { id: 'first_pick_top10', title: 'First-pick concentration: share of first-line cards that are the top 10', scale: 100, unit: '%', digits: 1, max: 1 , recentre: true },
];
const MEASURE_IDS = new Set<string>(MEASURES.map((m) => m.id));

export interface CompareOptions {
  /** Two-colour pairs need this many decisive games to count in pair_spread and pair_within5. */
  minPairGames: number;
  boot: number;
  bootSeed: number;
}
export const COMPARE_DEFAULTS: CompareOptions = { minPairGames: 30, boot: 1000, bootSeed: 1 };

/** One played deck, reduced to what the measures read. */
export interface DeckUnit {
  /** Indices (into the population's card table) of the deck's distinct nonbasic cards, lands included (meta.ts's per-card count). */
  cards: number[];
  wins: number;
  decisive: number;
  /** The main colours, WUBRG order ("WU"; "?" for a Forge build without colours). */
  key: string;
  colours: number;
  splash: boolean;
  lands: number;
}
export interface GameUnit { draw: boolean; timeout: boolean; turns: number }
export interface DraftUnit { seed: number; decks: [DeckUnit, DeckUnit]; games: GameUnit[]; firstLine: number[] }

export interface Population {
  name: string;
  dir: string;
  run: RunMeta;
  /** Card names by index; `land[i]` is whether card i is a land (lands do not move the shrinkage mean, meta.ts). */
  names: string[];
  land: boolean[];
  /** One unit per draft, keyed by seed. */
  drafts: Map<number, DraftUnit>;
  /** Drafts left out because their games explored (D358). */
  exploreDropped: number;
  engineErrors: number;
}

const BASICS = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);
const r4 = (x: number): number => Math.round(x * 10000) / 10000;

/** Reduce one population's draft lines to units (pure; `info` is the run's cards.json). */
export function populationOf(name: string, dir: string, run: RunMeta, info: Record<string, CardInfo>, recs: DraftRecord[], exploreDropped = 0): Population {
  const names: string[] = [];
  const land: boolean[] = [];
  const index = new Map<string, number>();
  const idx = (n: string): number => {
    let i = index.get(n);
    if (i === undefined) { i = names.length; index.set(n, i); names.push(n); land.push(!!info[n]?.land); }
    return i;
  };
  const drafts = new Map<number, DraftUnit>();
  let engineErrors = 0;
  for (const rec of [...recs].sort((a, b) => a.seed - b.seed)) {
    if (drafts.has(rec.seed)) throw new Error(`${name}: seed ${rec.seed} is in ${path.join(dir, 'drafts.jsonl')} twice`);
    if (rec.match.engineError) engineErrors++;
    const decks = ([0, 1] as const).map((k): DeckUnit => {
      const pd = playedDeck(rec, k, info);
      const me = k === 0 ? 'A' : 'B';
      let wins = 0, decisive = 0;
      for (const g of rec.match.games) {
        if (g.winner === 'draw') continue;
        decisive++;
        if (g.winner === me) wins++;
      }
      const dr = rec.drafters[k];
      const lands = pd.source === 'lab' ? (dr.deck?.lands ?? 0)
        : pd.main.reduce((s, [n, c]) => s + (BASICS.has(c) || info[c]?.land ? n : 0), 0);
      const key = pd.key;
      const main = [...key].filter((c) => 'WUBRG'.includes(c)).length;
      return {
        cards: [...new Set(pd.main.filter(([, c]) => !BASICS.has(c)).map(([, c]) => c))].map(idx),
        wins, decisive, key, colours: main + (pd.splash ? pd.splash.length : 0), splash: pd.splash !== null && pd.splash !== '', lands,
      };
    }) as [DeckUnit, DeckUnit];
    const games = rec.match.games.map((g): GameUnit => ({ draw: g.winner === 'draw', timeout: !!g.timeout, turns: g.turns }));
    let firstLine: number[];
    if (rec.format === 'grid') {
      firstLine = [];
      for (const [n, c] of firstTakes([rec])) for (let j = 0; j < c; j++) firstLine.push(idx(n));
    } else {
      firstLine = rec.drafters.flatMap((dr) => (dr.picks[0]?.took ?? []).map(idx));
    }
    drafts.set(rec.seed, { seed: rec.seed, decks, games, firstLine });
  }
  return { name, dir, run, names, land, drafts, exploreDropped, engineErrors };
}

/** A run folder as a population (drafts whose games explored are left out, as every win-rate reader does, D358). */
export function readPopulation(name: string, dir: string): Population {
  const run = JSON.parse(fs.readFileSync(path.join(dir, 'run.json'), 'utf8')) as RunMeta;
  const info = JSON.parse(fs.readFileSync(path.join(dir, 'cards.json'), 'utf8')) as Record<string, CardInfo>;
  const jsonl = path.join(dir, 'drafts.jsonl');
  const all = fs.existsSync(jsonl) ? readJsonLines<DraftRecord>(jsonl) : [];
  const { recs, dropped } = filterPlayExplore(all, 'exclude');
  return populationOf(name, dir, run, info, recs, dropped);
}

/**
 * The card units of a multiset of drafts, as meta.json would carry them (meta.ts): games and wins over
 * the decisive games of the played decks a card is in, inDecks its decks, the shrinkage mean m over the
 * NONLAND card-game observations, winRateShrunk = r4((w + 20m)/(g + 20)) and the prior's mean r4(m) --
 * the rounding is meta.json's, so these are the numbers ForgeCoach would read.
 */
export function cardUnits(pop: Pick<Population, 'names' | 'land'>, drafts: DraftUnit[]): { units: SpreadUnit[]; priorMean: number } {
  const n = pop.names.length;
  const games = new Float64Array(n), wins = new Float64Array(n), decks = new Float64Array(n);
  for (const d of drafts) for (const deck of d.decks) for (const i of deck.cards) {
    games[i] = (games[i] as number) + deck.decisive;
    wins[i] = (wins[i] as number) + deck.wins;
    decks[i] = (decks[i] as number) + 1;
  }
  let tw = 0, tg = 0;
  for (let i = 0; i < n; i++) if (!pop.land[i]) { tw += wins[i] as number; tg += games[i] as number; }
  const m = tg ? tw / tg : 0.5;
  const units: SpreadUnit[] = [];
  for (let i = 0; i < n; i++) {
    const g = games[i] as number;
    if (g <= 0) continue;
    units.push({ name: pop.names[i] as string, games: g, wins: wins[i] as number, shrunk: r4(((wins[i] as number) + SHRINK_K * m) / (g + SHRINK_K)), clumps: decks[i] as number });
  }
  return { units, priorMean: r4(m) };
}

/** Card-rate flatness of a multiset of drafts: ForgeCoach's spread of the card units (null: no card has 10 games). */
export function flatnessOf(pop: Pick<Population, 'names' | 'land'>, drafts: DraftUnit[]): SpreadStats | null {
  const { units, priorMean } = cardUnits(pop, drafts);
  return spreadOf(units, { minGames: CARD_MIN_GAMES, priorMean, priorStrength: SHRINK_K });
}

export type Values = Partial<Record<MeasureId, number>>;

/**
 * The card flatness of a multiset of drafts on the VARIANCE scale, unfloored: (obsVar − noiseVar) / lam2,
 * whose floored square root is ForgeCoach's trueSd.  The bootstrap works on this (compare(), below).
 */
export function flatnessVariance(pop: Pick<Population, 'names' | 'land'>, drafts: DraftUnit[]): number | undefined {
  const { units, priorMean } = cardUnits(pop, drafts);
  const p = spreadParts(units, { minGames: CARD_MIN_GAMES, priorMean, priorStrength: SHRINK_K });
  return p && p.lam2 > 0 ? (p.obsVar - p.noiseVar) / p.lam2 : undefined;
}

/** Every measure on a multiset of drafts.  A measure with nothing to measure is absent.  `replicate`: a bootstrap replicate, whose flatness is flatnessVariance's (compare() finishes it). */
export function measuresOf(pop: Pick<Population, 'names' | 'land'>, drafts: DraftUnit[], o: Pick<CompareOptions, 'minPairGames'>, replicate = false): Values {
  const v: Values = {};
  if (replicate) {
    // a replicate's flatness stays on the variance scale until compare() recentres it
    const x = flatnessVariance(pop, drafts);
    if (x !== undefined) v.flatness = x;
  } else {
    const fl = flatnessOf(pop, drafts);
    if (fl) v.flatness = fl.trueSd;
  }
  // colour pairs
  const pairs = new Map<string, { w: number; g: number }>();
  let nDecks = 0, lands = 0, colours = 0, two = 0, splash = 0;
  for (const d of drafts) for (const deck of d.decks) {
    nDecks++;
    lands += deck.lands;
    colours += deck.colours;
    const main = [...deck.key].filter((c) => 'WUBRG'.includes(c)).length;
    if (main === 2) {
      two++;
      const p = pairs.get(deck.key) ?? { w: 0, g: 0 };
      p.w += deck.wins; p.g += deck.decisive;
      pairs.set(deck.key, p);
    }
    if (deck.splash) splash++;
  }
  const rates = [...pairs.values()].filter((p) => p.g >= o.minPairGames && p.g > 0).map((p) => p.w / p.g);
  if (rates.length >= 2) v.pair_spread = Math.max(...rates) - Math.min(...rates);
  if (rates.length >= 1) v.pair_within5 = rates.filter((r) => Math.abs(r - 0.5) <= 0.05 + 1e-12).length / rates.length;
  if (nDecks) {
    v.lands = lands / nDecks;
    v.colours = colours / nDecks;
    v.two_colour = two / nDecks;
    v.splash = splash / nDecks;
  }
  // games
  let nGames = 0, draws = 0, timeouts = 0, turns = 0, nTurns = 0;
  for (const d of drafts) for (const g of d.games) {
    nGames++;
    if (g.draw) draws++;
    if (g.timeout) timeouts++;
    if (g.turns > 0) { turns += g.turns; nTurns++; }
  }
  if (nGames) { v.draw_rate = draws / nGames; v.timeout_rate = timeouts / nGames; }
  if (nTurns) v.game_turns = turns / nTurns;
  // first picks
  const counts = new Map<number, number>();
  let slots = 0;
  for (const d of drafts) for (const i of d.firstLine) { counts.set(i, (counts.get(i) ?? 0) + 1); slots++; }
  if (slots) v.first_pick_top10 = [...counts.values()].sort((a, b) => b - a).slice(0, 10).reduce((s, x) => s + x, 0) / slots;
  return v;
}

// ---------------------------------------------------------------- seeds, bootstrap, comparison

/** The seeds every population drafted; throws unless every population holds exactly the same seeds (and `expect`, when given). */
export function commonSeeds(pops: Population[], expect?: { seed: number; drafts: number }): number[] {
  if (pops.length === 0) throw new Error('compare: no populations');
  const key = (p: Population): number[] => [...p.drafts.keys()].sort((a, b) => a - b);
  const first = key(pops[0] as Population);
  for (const p of pops.slice(1)) {
    const s = key(p);
    const a = new Set(first), b = new Set(s);
    const onlyA = first.filter((x) => !b.has(x)), onlyB = s.filter((x) => !a.has(x));
    if (onlyA.length || onlyB.length) {
      throw new Error(`compare: the populations did not draft the same seeds: ${(pops[0] as Population).name} has ${onlyA.length} seed(s) ${p.name} lacks`
        + `${onlyA.length ? ` (${onlyA.slice(0, 5).join(', ')}${onlyA.length > 5 ? ', ...' : ''})` : ''}, ${p.name} has ${onlyB.length} it lacks`
        + `${onlyB.length ? ` (${onlyB.slice(0, 5).join(', ')}${onlyB.length > 5 ? ', ...' : ''})` : ''} -- finish every run (run it again: it resumes) before comparing`);
    }
  }
  if (expect) {
    const want = Array.from({ length: expect.drafts }, (_, i) => expect.seed + i);
    if (want.length !== first.length || want.some((x, i) => x !== first[i])) {
      throw new Error(`compare: the populations hold ${first.length} draft(s) (seeds ${first[0] ?? '-'}..${first.at(-1) ?? '-'}), not the block ${expect.seed}..${expect.seed + expect.drafts - 1} asked for`);
    }
  }
  if (first.length === 0) throw new Error('compare: the populations hold no drafts');
  return first;
}

export interface Interval { est?: number; lo?: number; hi?: number; valid: number }
export interface Comparison {
  seeds: number[];
  options: CompareOptions;
  pops: Array<{ name: string; est: Values; ci: Record<string, Interval>; flat: SpreadStats | null; drafts: number; games: number; decisive: number; pairsIncluded: number }>;
  /** diff[a][b][measure]: population a's value minus b's (a before b in the input order). */
  diff: Record<string, Record<string, Record<string, Interval & { excludesZero: boolean }>>>;
}

/** Linear-interpolated quantile of sorted values (R's type 7). */
export function quantileSorted(xs: number[], q: number): number {
  const pos = (xs.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return (xs[lo] as number) + ((xs[hi] as number) - (xs[lo] as number)) * (pos - lo);
}

function interval(est: number | undefined, reps: Array<number | undefined>): Interval {
  const ok = reps.filter((x): x is number => x !== undefined && Number.isFinite(x)).sort((a, b) => a - b);
  const out: Interval = { valid: ok.length };
  if (est !== undefined && Number.isFinite(est)) out.est = est;
  if (ok.length >= 2) { out.lo = quantileSorted(ok, 0.025); out.hi = quantileSorted(ok, 0.975); }
  return out;
}

/** The comparison: every measure per population with its draft-clustered, paired bootstrap interval, and every pairwise difference. */
export function compare(pops: Population[], o: CompareOptions, expect?: { seed: number; drafts: number }): Comparison {
  const seeds = commonSeeds(pops, expect);
  const aligned = pops.map((p) => seeds.map((s) => p.drafts.get(s) as DraftUnit));
  const est = pops.map((p, k) => measuresOf(p, aligned[k] as DraftUnit[], o));
  const reps: Values[][] = pops.map(() => []);
  const r = rng(o.bootSeed, 'compare:bootstrap');
  const n = seeds.length;
  for (let b = 0; b < o.boot; b++) {
    const pick = Array.from({ length: n }, () => r.int(n));
    pops.forEach((p, k) => {
      const ds = aligned[k] as DraftUnit[];
      (reps[k] as Values[]).push(measuresOf(p, pick.map((i) => ds[i] as DraftUnit), o, true));
    });
  }
  // Three measures' replicates are RECENTRED on their estimate: each population's replicates, less their
  // mean, plus the estimate, clamped to the measure's range, so the interval is the percentile interval of
  // the estimate's bootstrap spread about the estimate itself.  These three are not averages, and a
  // resample biases them away from the estimate whatever the truth:
  //  - Flatness: a resample carries the games' sampling noise twice (the noise the original's card rates
  //    already hold, and the resampling's, about as large again), so the replicates' noise-corrected
  //    variances sit about one noise variance above the estimate: left alone, a flat cube's interval can lie
  //    wholly above its own estimate of 0 (it did in 2 of 30 synthetic repeats), and coverage rests on luck.  Its replicates are recentred on the VARIANCE scale,
  //    unfloored, and only then floored and square-rooted.
  //  - pair_spread (a max minus a min) and first_pick_top10 (the top 10 of counts): a resample's duplicated
  //    drafts make both larger.
  // The others are averages and shares, whose resampling shift is about 0, and keep the plain percentile
  // interval (recentring a share of ten pairs, which moves in steps, made its intervals too narrow).  The
  // shift is measured, not modelled (D441, with its coverage on synthetic populations).
  pops.forEach((p, k) => {
    const rs = reps[k] as Values[];
    for (const m of MEASURES.filter((d) => d.recentre)) {
      const e0 = m.id === 'flatness' ? flatnessVariance(p, aligned[k] as DraftUnit[]) : est[k]?.[m.id];
      const ok = rs.map((v) => v[m.id]).filter((x): x is number => x !== undefined);
      const shift = e0 !== undefined && ok.length ? ok.reduce((t, x) => t + x, 0) / ok.length - e0 : 0;
      for (const v of rs) {
        const x = v[m.id];
        if (x === undefined) continue;
        v[m.id] = m.id === 'flatness' ? Math.sqrt(Math.max(0, x - shift)) : Math.min(m.max, Math.max(0, x - shift));
      }
    }
  });
  const out: Comparison = { seeds, options: o, pops: [], diff: {} };
  pops.forEach((p, k) => {
    const ci: Record<string, Interval> = {};
    for (const m of MEASURES) ci[m.id] = interval(est[k]?.[m.id], (reps[k] as Values[]).map((v) => v[m.id]));
    const ds = aligned[k] as DraftUnit[];
    const pairs = new Map<string, number>();
    for (const d of ds) for (const deck of d.decks) if ([...deck.key].filter((c) => 'WUBRG'.includes(c)).length === 2) pairs.set(deck.key, (pairs.get(deck.key) ?? 0) + deck.decisive);
    out.pops.push({
      name: p.name, est: est[k] as Values, ci, flat: flatnessOf(p, ds), drafts: ds.length,
      games: ds.reduce((s, d) => s + d.games.length, 0), decisive: ds.reduce((s, d) => s + d.games.filter((g) => !g.draw).length, 0),
      pairsIncluded: [...pairs.values()].filter((g) => g >= o.minPairGames && g > 0).length,
    });
  });
  for (let a = 0; a < pops.length; a++) for (let b = a + 1; b < pops.length; b++) {
    const A = (pops[a] as Population).name, B = (pops[b] as Population).name;
    const row: Record<string, Interval & { excludesZero: boolean }> = {};
    for (const m of MEASURES) {
      const ea = est[a]?.[m.id], eb = est[b]?.[m.id];
      const d = ea !== undefined && eb !== undefined ? ea - eb : undefined;
      const rd = (reps[a] as Values[]).map((v, i) => {
        const x = v[m.id], y = (reps[b] as Values[])[i]?.[m.id];
        return x !== undefined && y !== undefined ? x - y : undefined;
      });
      const iv = interval(d, rd);
      row[m.id] = { ...iv, excludesZero: iv.lo !== undefined && iv.hi !== undefined && (iv.lo > 0 || iv.hi < 0) };
    }
    (out.diff[A] ??= {})[B] = row;
  }
  return out;
}

// ---------------------------------------------------------------- rules

export interface Rule { measure: MeasureId; better: 'lower' | 'higher'; margin: number }

/** `flatness:lower-better:margin=1.0` (the margin in the measure's display unit; default 0). */
export function parseRule(s: string): Rule {
  const parts = s.split(':');
  const [measure, dir, ...rest] = parts;
  if (!measure || !MEASURE_IDS.has(measure)) throw new Error(`--rule: unknown measure "${measure ?? ''}" (known: ${[...MEASURE_IDS].join(', ')})`);
  if (dir !== 'lower-better' && dir !== 'higher-better') throw new Error(`--rule ${s}: the second part is lower-better or higher-better`);
  let margin = 0;
  for (const kv of rest) {
    const m = /^margin=(.+)$/.exec(kv);
    const v = m ? Number(m[1]) : NaN;
    if (!m || !Number.isFinite(v) || v < 0) throw new Error(`--rule ${s}: expected margin=<number >= 0>, got "${kv}"`);
    margin = v;
  }
  return { measure: measure as MeasureId, better: dir === 'lower-better' ? 'lower' : 'higher', margin };
}

/** +1: a beats b under the rule; -1: b beats a; 0: neither.  A beats B when it is better by more than the margin AND the difference's interval excludes 0. */
export function ruleOutcome(rule: Rule, d: Interval): -1 | 0 | 1 {
  const def = MEASURES.find((m) => m.id === rule.measure) as MeasureDef;
  if (d.est === undefined || d.lo === undefined || d.hi === undefined) return 0;
  const x = d.est * def.scale;
  const sign = rule.better === 'lower' ? -1 : 1;
  if (sign * x > rule.margin && (sign > 0 ? d.lo > 0 : d.hi < 0)) return 1;
  if (-sign * x > rule.margin && (sign > 0 ? d.hi < 0 : d.lo > 0)) return -1;
  return 0;
}

// ---------------------------------------------------------------- output

const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
const NAME = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

/** A population's name from a cube file: its basename without `-cube-NNN.md` / `.md`, lower-case, [a-z0-9_]. */
export function nameOf(file: string): string {
  return path.basename(file).replace(/\.md$/, '').replace(/-cube-\d+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
export function checkName(n: string): void {
  if (!NAME.test(n)) throw new Error(`compare: population name "${n}" must be lower-case letters and digits joined by single underscores (it is a key in compare.json)`);
}

/** compare.json: numbers only -- no strings, arrays, NaN or infinities; an undefined estimate is an absent key. */
export function compareJson(c: Comparison, rules: Rule[]): Record<string, unknown> {
  const iv = (x: Interval): Record<string, number> => {
    const o: Record<string, number> = { valid: x.valid };
    if (x.est !== undefined) o.est = r6(x.est);
    if (x.lo !== undefined) o.lo = r6(x.lo);
    if (x.hi !== undefined) o.hi = r6(x.hi);
    return o;
  };
  const pop: Record<string, unknown> = {};
  c.pops.forEach((p, i) => {
    const m: Record<string, unknown> = {};
    for (const d of MEASURES) m[d.id] = iv(p.ci[d.id] as Interval);
    const flat: Record<string, number> = {};
    if (p.flat) {
      Object.assign(flat, { n: p.flat.n, total: p.flat.total, sd: r6(p.flat.sd), noise_sd: r6(p.flat.noiseSd), design_effect: r6(p.flat.designEffect),
        true_sd: r6(p.flat.trueSd), fc_lo: r6(p.flat.trueSdCi[0]), fc_hi: r6(p.flat.trueSdCi[1]), mean_rate: r6(p.flat.meanRate),
        readable: p.flat.n >= MIN_UNITS ? 1 : 0 });
    }
    pop[p.name] = { index: i + 1, drafts: p.drafts, games: p.games, decisive: p.decisive, pairs_included: p.pairsIncluded, m, flatness_detail: flat };
  });
  const diff: Record<string, Record<string, Record<string, unknown>>> = {};
  for (const [a, row] of Object.entries(c.diff)) for (const [b, ms] of Object.entries(row)) {
    const o: Record<string, unknown> = {};
    for (const [id, x] of Object.entries(ms)) o[id] = { ...iv(x), excludes_zero: x.excludesZero ? 1 : 0 };
    (diff[a] ??= {})[b] = o;
  }
  const rank: Record<string, Record<string, number>> = {};
  for (const d of MEASURES) {
    const have = c.pops.filter((p) => p.est[d.id] !== undefined).sort((x, y) => (x.est[d.id] as number) - (y.est[d.id] as number));
    rank[d.id] = Object.fromEntries(have.map((p, i) => [p.name, i + 1]));
  }
  const out: Record<string, unknown> = {
    schema: 1, populations: c.pops.length, drafts: c.seeds.length, seed_first: c.seeds[0] ?? 0, seed_last: c.seeds.at(-1) ?? 0, same_seeds: 1,
    boot: { replicates: c.options.boot, seed: c.options.bootSeed, level: 0.95 }, min_pair_games: c.options.minPairGames, card_min_games: CARD_MIN_GAMES,
    pop, diff, rank,
  };
  if (rules.length) {
    const verdict: Record<string, unknown> = {};
    for (const r of rules) {
      const v: Record<string, unknown> = { lower_better: r.better === 'lower' ? 1 : 0, margin: r.margin };
      for (const [a, row] of Object.entries(c.diff)) for (const [b, ms] of Object.entries(row)) ((v[a] ??= {}) as Record<string, number>)[b] = ruleOutcome(r, ms[r.measure] as Interval);
      verdict[r.measure] = v;
    }
    out.verdict = verdict;
  }
  assertNumbersOnly(out);
  return out;
}

/** Throws unless every leaf is a finite number (no string, array, null, NaN or infinity): what `compare.json` promises. */
export function assertNumbersOnly(o: unknown, at = 'compare.json'): void {
  if (typeof o === 'number') { if (!Number.isFinite(o)) throw new Error(`${at} is ${o}: not strict JSON`); return; }
  if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error(`${at} is ${Array.isArray(o) ? 'an array' : JSON.stringify(o)}: compare.json holds numbers only`);
  for (const [k, v] of Object.entries(o)) {
    if (!/^[A-Za-z0-9_]+$/.test(k)) throw new Error(`${at}.${k}: a key the lab runner's metrics cannot read`);
    assertNumbersOnly(v, `${at}.${k}`);
  }
}

export interface PopulationLabel { name: string; cube: string; cubeSha: string; ratings: string; weights: string; dir: string; exploreDropped: number; engineErrors: number }

/** The changed weights of a run, as text ("defaults" when none). */
export function weightsText(run: RunMeta): string {
  const w = run.weights as unknown as Record<string, number>;
  const changed = Object.entries(DEFAULT_WEIGHTS).filter(([k, v]) => w && k in w && w[k] !== v).map(([k]) => `${k}=${w[k]}`);
  return changed.length ? changed.join(', ') : 'defaults';
}

export function labelOf(p: Population): PopulationLabel {
  return { name: p.name, cube: p.run.cubeFile, cubeSha: (p.run.cubeSha ?? '').slice(0, 12), ratings: p.run.ratingsFile ?? "Forge's ranks", weights: weightsText(p.run), dir: p.dir, exploreDropped: p.exploreDropped, engineErrors: p.engineErrors };
}

/** compare.md: provenance, then per measure a table of each population's estimate and interval, and every pairwise difference. */
export function compareMd(c: Comparison, labels: PopulationLabel[], rules: Rule[]): string {
  const L: string[] = [];
  const f = (d: MeasureDef, x: number | undefined, signed = false): string => (x === undefined ? '-' : `${signed && x * d.scale > 0 ? '+' : ''}${(x * d.scale).toFixed(d.digits)}`);
  const ci = (d: MeasureDef, x: Interval, signed = false): string => (x.lo === undefined || x.hi === undefined ? '-' : `[${f(d, x.lo, signed)}, ${f(d, x.hi, signed)}]`);
  L.push('# Cube populations compared');
  L.push('');
  L.push(`${c.pops.length} populations, the same ${c.seeds.length} draft seeds each (${c.seeds[0]}..${c.seeds.at(-1)}). `
    + `95% intervals: percentile, ${c.options.boot} draft-clustered bootstrap replicates (seed ${c.options.bootSeed}), the seeds resampled jointly across populations, so a difference is paired; `
    + `the replicates of flatness, pair_spread and first_pick_top10 are recentred on their estimate, because a resample biases those three upward (D441). `
    + `Colour pairs count with ${c.options.minPairGames}+ decisive games; card flatness is ForgeCoach's (flatness.ts) over cards with ${CARD_MIN_GAMES}+ decisive games.`);
  L.push('');
  L.push('| # | population | cube | sha | ratings | weights | drafts | games | decisive | engine errors | run folder |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|');
  c.pops.forEach((p, i) => {
    const l = labels[i] as PopulationLabel;
    L.push(`| ${i + 1} | ${p.name} | ${l.cube} | ${l.cubeSha} | ${l.ratings} | ${l.weights} | ${p.drafts} | ${p.games} | ${p.decisive} | ${l.engineErrors} | ${l.dir} |`);
  });
  L.push('');
  if (!rules.length) L.push('No `--rule` was given: the tables rank and give intervals; they deliver no verdict.');
  L.push('');
  for (const d of MEASURES) {
    L.push(`## ${d.title} (\`${d.id}\`, ${d.unit})`);
    L.push('');
    const order = [...c.pops].sort((x, y) => (x.est[d.id] ?? Infinity) - (y.est[d.id] ?? Infinity));
    L.push('| rank (1 = lowest) | population | estimate | 95% interval | replicates |');
    L.push('|---|---|---|---|---|');
    order.forEach((p, i) => {
      const x = p.ci[d.id] as Interval;
      L.push(`| ${p.est[d.id] === undefined ? '-' : i + 1} | ${p.name} | ${f(d, x.est)} | ${ci(d, x)} | ${x.valid} |`);
    });
    if (d.id === 'flatness') {
      L.push('');
      L.push('ForgeCoach\'s own reading of each (its chi-square interval on the observed variance, not the bootstrap): '
        + c.pops.map((p) => (p.flat ? `${p.name} ${(p.flat.trueSd * 100).toFixed(2)} [${(p.flat.trueSdCi[0] * 100).toFixed(2)}, ${(p.flat.trueSdCi[1] * 100).toFixed(2)}], ${p.flat.verdict}, ${p.flat.n} cards` : `${p.name} -`)).join('; ') + '.');
    }
    if (d.id === 'pair_spread') {
      L.push('');
      L.push(`Pairs with ${c.options.minPairGames}+ decisive games: ${c.pops.map((p) => `${p.name} ${p.pairsIncluded}`).join(', ')}.`);
    }
    L.push('');
    L.push('| difference | estimate | 95% interval | excludes 0 |');
    L.push('|---|---|---|---|');
    const shown: string[] = [];
    for (const [a, row] of Object.entries(c.diff)) for (const [b, ms] of Object.entries(row)) {
      const x = ms[d.id] as Interval & { excludesZero: boolean };
      L.push(`| ${a} - ${b} | ${f(d, x.est, true)} | ${ci(d, x, true)} | ${x.excludesZero ? 'yes' : 'no'} |`);
      if (x.excludesZero) shown.push(`${a} - ${b} ${f(d, x.est, true)}`);
    }
    L.push('');
    L.push(shown.length ? `Differences whose interval excludes 0: ${shown.join('; ')}.` : 'No difference\'s interval excludes 0.');
    const rule = rules.find((r) => r.measure === d.id);
    if (rule) {
      const wins: string[] = [];
      for (const [a, row] of Object.entries(c.diff)) for (const [b, ms] of Object.entries(row)) {
        const o = ruleOutcome(rule, ms[d.id] as Interval);
        if (o === 1) wins.push(`${a} beats ${b}`);
        if (o === -1) wins.push(`${b} beats ${a}`);
      }
      L.push('');
      L.push(`**Verdict** (rule ${d.id}:${rule.better}-better:margin=${rule.margin} ${d.unit}): ${wins.length ? wins.join('; ') : 'no population beats another'}.`);
    }
    L.push('');
  }
  return `${L.join('\n')}\n`;
}

// ---------------------------------------------------------------- the command

export interface PopulationSpec { name: string; cube: string; ratings?: string; weights: string[] }

/** `name=<cube.md>[,ratings=<tsv>][,weight.<w>=<v>]...` */
export function parseVariant(s: string): PopulationSpec {
  const m = /^([^=]+)=(.+)$/.exec(s);
  if (!m) throw new Error(`--variant wants name=<cube.md>[,ratings=<tsv>][,weight.<w>=<v>]..., got "${s}"`);
  const [cube, ...opts] = (m[2] as string).split(',');
  const spec: PopulationSpec = { name: m[1] as string, cube: cube as string, weights: [] };
  for (const o of opts) {
    const r = /^ratings=(.+)$/.exec(o), w = /^weight\.([A-Za-z0-9]+)=(.+)$/.exec(o);
    if (r) spec.ratings = r[1] as string;
    else if (w) spec.weights.push(`${w[1]}=${w[2]}`);
    else throw new Error(`--variant ${spec.name}: unknown option "${o}" (ratings=<tsv> or weight.<name>=<value>)`);
  }
  return spec;
}

/** The flags compare keeps for itself; every other flag goes to each population's `run`. */
const OWN = new Set(['variant', 'boot', 'boot-seed', 'min-pair-games', 'rule', 'no-run', 'out', 'drafts', 'seed']);
const REFUSED = ['bridge', 'deckset', 'play-explore', 'ratings', 'record', 'record-all', 'record-every', 'drafter', 'drafter-seat', 'profile-mix'];

export type RunOne = (cubeFile: string, f: Map<string, string[]>) => Promise<number>;

export async function compareCommand(repo: string, pos: string[], f: Map<string, string[]>, say: (s: string) => void, runOne: RunOne): Promise<number> {
  const one = (k: string): string | undefined => f.get(k)?.at(-1);
  const int = (k: string, d: number): number => {
    const v = one(k);
    if (v === undefined) return d;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) throw new Error(`--${k} wants a whole number, got "${v}"`);
    return n;
  };
  for (const k of REFUSED) if (f.has(k)) throw new Error(`compare: --${k} is not a compare flag${k === 'ratings' ? ' (give each population its own: --variant name=<cube.md>,ratings=<tsv>)' : ''}`);
  const specs: PopulationSpec[] = [...pos.map((c) => ({ name: nameOf(c), cube: c, weights: [] })), ...(f.get('variant') ?? []).map(parseVariant)];
  if (specs.length < 2 || specs.length > 6) throw new Error(`compare: 2 to 6 populations, got ${specs.length}`);
  const seen = new Set<string>();
  for (const s of specs) {
    checkName(s.name);
    if (seen.has(s.name)) throw new Error(`compare: two populations are named ${s.name} (name one with --variant name=<cube.md>)`);
    seen.add(s.name);
    if (!fs.existsSync(path.resolve(repo, s.cube))) throw new Error(`compare: ${s.name}: no cube file ${s.cube}`);
    if (s.ratings && !fs.existsSync(path.resolve(repo, s.ratings))) throw new Error(`compare: ${s.name}: no ratings file ${s.ratings}`);
  }
  const rules = (f.get('rule') ?? []).map(parseRule);
  const o: CompareOptions = { minPairGames: int('min-pair-games', COMPARE_DEFAULTS.minPairGames), boot: int('boot', COMPARE_DEFAULTS.boot), bootSeed: int('boot-seed', COMPARE_DEFAULTS.bootSeed) };
  if (o.boot < 100) throw new Error('compare: --boot wants at least 100 replicates');
  const drafts = int('drafts', 10);
  const seed = int('seed', VERIFY_SEED_MIN + 1);
  const out = one('out') ?? path.join('var/cubelab/compare', `${specs.map((s) => s.name).join('-')}-${seed}`);
  const dirOf = (s: PopulationSpec): string => path.join(out, 'runs', s.name);
  const noRun = f.has('no-run');
  say(`cube lab compare: ${specs.map((s) => s.name).join(', ')}; ${drafts} draft(s) each from seed ${seed} (the same block for every population); out ${out}${noRun ? '; --no-run: reading the run folders only' : ''}`);
  if (!noRun) {
    const passed = new Map([...f.entries()].filter(([k]) => !OWN.has(k)));
    for (const s of specs) {
      const g = new Map(passed);
      g.set('drafts', [String(drafts)]);
      g.set('seed', [String(seed)]);
      g.set('out', [dirOf(s)]);
      if (s.ratings) g.set('ratings', [s.ratings]);
      if (s.weights.length) g.set('weight', [...(g.get('weight') ?? []), ...s.weights]);
      say(`== population ${s.name}: ${s.cube}${s.ratings ? `, ratings ${s.ratings}` : ''}${s.weights.length ? `, weight ${s.weights.join(' ')}` : ''}`);
      const rc = await runOne(s.cube, g);
      if (rc !== 0) throw new Error(`compare: population ${s.name}'s run exited ${rc}`);
    }
  }
  const pops = specs.map((s) => readPopulation(s.name, dirOf(s)));
  const c = compare(pops, o, noRun && !f.has('drafts') && !f.has('seed') ? undefined : { seed, drafts });
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'compare.json'), `${JSON.stringify(compareJson(c, rules), null, 1)}\n`);
  fs.writeFileSync(path.join(out, 'compare.md'), compareMd(c, pops.map(labelOf), rules));
  say(`same seeds in every population: ${c.seeds.length} (${c.seeds[0]}..${c.seeds.at(-1)})`);
  for (const d of MEASURES) {
    say(`${d.id.padEnd(17)} ${c.pops.map((p) => {
      const x = p.ci[d.id] as Interval;
      return `${p.name} ${x.est === undefined ? '-' : (x.est * d.scale).toFixed(d.digits)}${x.lo !== undefined && x.hi !== undefined ? ` [${(x.lo * d.scale).toFixed(d.digits)}, ${(x.hi * d.scale).toFixed(d.digits)}]` : ''}`;
    }).join('   ')}`);
  }
  say(`wrote ${path.join(out, 'compare.json')} and ${path.join(out, 'compare.md')}`);
  return 0;
}
