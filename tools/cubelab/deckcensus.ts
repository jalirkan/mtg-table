// mtg-table — the cube lab: the DECK CENSUS's generator (D447): 40-card decks drawn straight from a
// band's pool at a random colour makeup, no drafter, no shape, no rating.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   tools/cubelab.sh decks --band <pauper|peasant|legacy|powered> --count N --seed S --out <dir>
//                          [--cross-band 0.10] [--census cubes/library/census.tsv] [--pool cubes/library/library-pool.tsv]
//                          [--scripts <Forge res/cardsfolder/cardsfolder.zip>]
//   tools/cubelab.sh decks --cube <cube.md> --count N --seed S --out <dir> [--k 1,2,3] [--max-share-k1 0.25]
//                          the same rules on one cube's own list (D456, cubeDecksCommand below)
//
// Justin's amendment of 2026-10-17 (pc-results/HEARTBEAT.md): the census plays decks drawn at random
// colour makeups over the whole spectrum, and "mono", "two-colour", "mostly red with a little white"
// are READ off the realised profiles afterwards.  Nothing here knows a shape.  The only rules are
// the four below, written in D447 before the first game, and the same for every deck.
//
// 1. THE PRIOR (makeupOf).  k, the number of colours, is uniform over 1..5; the k colours are a
//    uniformly random k-subset of WUBRG; their shares are a flat Dirichlet(1, ..., 1) (k unit
//    exponentials, normalised).  So a two-colour makeup's main share is uniform on [0.5, 1]: 100/0,
//    85/15 and 50/50 are all as likely, and 40/30/30 and five-colour piles occur.
// 2. THE DRAW (drawSpells).  A card is ELIGIBLE for a makeup when it is drawable (supported, not a
//    basic land), not AI:RemoveDeck:All, every one of its printed colours is a colour of the makeup
//    (colourless always), and every coloured mana symbol of its cost can be paid by the makeup's
//    colours (a hybrid symbol by either colour; a Phyrexian or a {2/C} symbol always; a split card's
//    two faces both; parseManaCost reads Forge's own tokens, GW, BP, 2W, with no slash).  25 spells
//    are drawn one at a time, without replacement (the library holds one of each card): a draw is
//    colourless with probability q, the band pool's own share of colourless cards among its
//    eligible nonland cards (a property of the pool, the same for every deck of the band), else it
//    picks a colour c by the makeup's shares and draws uniformly among the eligible cards that
//    are c (a gold card is in each of its colours' lists).  A draw is CROSS-BAND with probability
//    --cross-band (0.10): it draws from the neighbouring bands instead (sample.ts's NEIGHBOURS), for
//    the band offsets.  A list that is empty falls back: the band, then FILL_ORDER's bands nearest
//    first (FILL), then the other colours by share.  No rating, no curve, no synergy, no theme.
// 3. THE LANDS (landPlan), ONE formula.  L = clamp(17 + round(2 x (m - 3)), 15, 18), m the mean
//    mana value of the first 23 spells drawn; the deck keeps its first 40 - L spells.  From the
//    kept spells' pips (a plain pip 1 to its colour, a hybrid 1/2 to each, a Phyrexian or {2/C}
//    1 to its colour): s_max, the largest colour's share.  With two or more coloured pips' colours,
//    F = min(supply, round(L x (1 - s_max))) FIXERS: lands of the pool that make at least two of
//    the deck's pip colours (directly or by what it can fetch), drawn uniformly, the band's first,
//    then FILL_ORDER's (D445's peasant has one such land of its own); the other L - F lands are
//    basics, each colour first given the sources its most demanding spell needs (its largest count
//    of that colour's plain pips, at least 1), counting the fixers as landSources does, one basic at
//    a time; then one at a time to the colour furthest below its pip share of the basics (ties in
//    WUBRG order).  A FETCHER or CYCLER (a fetchland, a Landscape, Evolving Wilds, Ash Barrens) is a
//    source only of the colours of the deck's lands it can find: a basic of a type it searches for,
//    or a typed nonbasic when it is not basics-only.  Mono-coloured utility lands are never drawn.
// 4. CASTABILITY (castable).  A spell is castable when, for each colour, the deck's lands that
//    make it (landSources) number at least the spell's plain pips of it, and each hybrid symbol has a source of
//    one of its colours.  A deck must have every spell castable; one that does not (the minimums
//    exceed L - F, or a list ran dry) is REJECTED and redrawn with the same makeup (a new stream),
//    up to 50 times, then with a new makeup; every rejection is counted.
//
// EACH DECK'S ROW (decks.jsonl, version 2) carries, beside its list and realised profile, the variables
// the model needs to tell a card's value from a deck that happened to cohere (deckVars): the number of
// colours, creatures, the mana-value histogram (0..5, 6+), X spells, card flow (#153's rule, isCardFlow
// on the script's front face: 40 library cards) and the fixers that reach two of its colours.
//
// THE BANDS are census.tsv's (D445), exclusive, as `sample` draws them.  The powered band has 41
// cards (37 eligible), too few for a deck, so its pool is powered united with legacy, its FILL band,
// drawn as one uniform pool (MIN_BAND_POOL); its cross-band neighbour is then peasant.
//
// Deterministic: deck i is rng(S, 'deck-census/<band>/<i>/makeup/<m>') and '.../cards/<a>', so a
// larger --count extends a run without changing its first decks.  No engine: the mana costs are
// Forge's own card scripts, read from the zip beside the jar (forge-scripts.ts).

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { BANDS, parseCensus, recordedInputs, type Band } from './census.ts';
import { BASIC_OF, COLOURS, type Colour } from './cards.ts';
import { dckText } from './deck.ts';
import { parseCube } from './cube.ts';
import { parseLibraryPool } from './library-candidates.ts';
import { rng, shuffle, type Rng } from './rng.ts';
import { eligibleFor, FILL_ORDER, joinCensus, NEIGHBOURS, type SampleCard } from './sample.ts';
import { openForgeScripts, type ForgeScripts } from '../forge-scripts.ts';
import { isCardFlow } from './cardflow.ts';
import { labPath, shownPath } from './labdata.ts';

export const DECK_CENSUS_VERSION = 2;
export const DECK_SIZE = 40;
export const SPELLS_DRAWN = 25;
export const LAND_BASE = 17;
export const LAND_SLOPE = 2;
export const LAND_MV_AT = 3.0;
export const LAND_MIN = 15;
export const LAND_MAX = 18;
export const LAND_FROM_FIRST = 23;
export const MAX_CARD_ATTEMPTS = 50;
export const MIN_BAND_POOL = 200;
export const DEFAULT_DECK_CROSS = 0.10;

/**
 * The Synergy v3 study's 17 card-flow cards (pc-results/study/synergy-v3-design.md section 1).  Card flow
 * is counted by #153's oracle-text rule (cardflow.ts isCardFlow, D446 point 5: 40 library cards), read
 * here off each card's Forge script; this list is the test's check that the rule still covers the study.
 */
export const CARD_FLOW_STUDY: readonly string[] = [
  'Opt', 'Consider', 'Brainstorm', 'Ponder', 'Thought Scour', 'Deep Analysis', 'Mulldrifter', 'Faithless Looting', 'Cathartic Reunion',
  'Unexpected Windfall', "Mishra's Bauble", 'Chromatic Star', 'Prophetic Prism', 'Ichor Wellspring', 'Candy Trail', 'Village Rites', 'Deadly Dispute',
];

/** isCardFlow's facts from a Forge script's front face (name, Types, Oracle), as the engine's facts call gives them. */
export function scriptFlowFact(script: string): { name: string; oracle: string; type: string; land: boolean; creature: boolean; planeswalker: boolean } {
  const front = script.split(/\nALTERNATE\n/)[0] as string;
  const type = /^Types:(.*)$/m.exec(front)?.[1]?.trim() ?? '';
  return {
    name: /^Name:(.*)$/m.exec(front)?.[1]?.trim() ?? '', oracle: /^Oracle:(.*)$/m.exec(front)?.[1] ?? '', type,
    land: /\bLand\b/.test(type), creature: /\bCreature\b/.test(type), planeswalker: /\bPlaneswalker\b/.test(type),
  };
}

// ---------------------------------------------------------------- costs

/** A card's cost, symbol by symbol: plain pips per colour, hybrid symbols (each a colour set), and the pip share each colour gets. */
export interface Cost {
  plain: Partial<Record<Colour, number>>;
  hybrid: string[];
  share: Partial<Record<Colour, number>>;
  /** X symbols. */
  x: number;
}

export const NO_COST: Cost = { plain: {}, hybrid: [], share: {}, x: 0 };

/**
 * A Forge script's `ManaCost:` as a Cost, token by token as Forge writes them (no braces, no slash):
 * `W` a plain pip; `GW` a hybrid (either colour); `BP`, `GWP`, `PRG` Phyrexian (payable with life, so
 * always payable; its share split over its colours); `2W` a two-brid (payable with {2}, so always
 * payable; share 1 to its colour); `CW` colourless-hybrid, counted as a plain pip of its colour (this
 * deck's lands make no {C} on purpose; no library card has one).  `X` counts in `x`.  A plain `C` and
 * snow `S` need a colourless or a snow source; no library card has either, so they are not counted
 * (latent, D447).  The slash spellings (`W/U`, `B/P`, `2/G`: three tokens in the whole zip) read the
 * same.  Generic numbers and `no cost` are nothing.
 */
export function parseManaCost(text: string): Cost {
  const plain: Partial<Record<Colour, number>> = {};
  const share: Partial<Record<Colour, number>> = {};
  const hybrid: string[] = [];
  let x = 0;
  const add = (r: Partial<Record<Colour, number>>, c: Colour, n: number): void => { r[c] = (r[c] ?? 0) + n; };
  for (const tok of text.trim().split(/\s+/)) {
    const up = tok.toUpperCase().replace(/\//g, '');
    if (up === 'X') { x++; continue; }
    const cols = COLOURS.filter((c) => up.includes(c));
    if (!cols.length) continue;                                                        // generic, C, S, `no cost`
    if (up.includes('P') || /\d/.test(up)) { for (const c of cols) add(share, c, 1 / cols.length); continue; }   // Phyrexian, two-brid: always payable
    if (cols.length >= 2) { hybrid.push(cols.join('')); for (const c of cols) add(share, c, 1 / cols.length); continue; }
    add(plain, cols[0] as Colour, 1); add(share, cols[0] as Colour, 1);                 // a plain pip (and CW, counted as one)
  }
  return { plain, hybrid, share, x };
}

/** Faces cast on their own, merged: each colour's plain pips the most any face needs (each face must be castable), every hybrid, the shares summed. */
export function mergeFaces(faces: Cost[]): Cost {
  const plain: Partial<Record<Colour, number>> = {};
  const share: Partial<Record<Colour, number>> = {};
  for (const f of faces) {
    for (const [c, n] of Object.entries(f.plain)) plain[c as Colour] = Math.max(plain[c as Colour] ?? 0, n as number);
    for (const [c, n] of Object.entries(f.share)) share[c as Colour] = (share[c as Colour] ?? 0) + (n as number);
  }
  return { plain, hybrid: faces.flatMap((f) => f.hybrid), share, x: faces.reduce((a, f) => a + f.x, 0) };
}

/** The front face's ManaCost line of a Forge script, or null. */
export function scriptManaCost(script: string): string | null {
  return /^ManaCost:(.*)$/m.exec(script)?.[1]?.trim() ?? null;
}

/** A spell's cost from its script: the front face, and a SPLIT card's second face too (Fire // Ice needs both); an adventure's, a modal or a transforming card's other face is an option, not a requirement. */
export function scriptCost(script: string): Cost {
  const costs = [...script.matchAll(/^ManaCost:(.*)$/gm)].map((m) => (m[1] ?? '').trim());
  if (!costs.length) return NO_COST;
  const split = /^AlternateMode:\s*Split\s*$/m.test(script);
  return split ? mergeFaces(costs.map(parseManaCost)) : parseManaCost(costs[0] as string);
}

// ---------------------------------------------------------------- the population

/**
 * What a land gives a deck, from its script.  `direct`: the colours it taps for (its `Add` clauses, "any
 * color", its basic land types; a Pathway's two faces).  `fetch`: what it can search for (a fetchland, a
 * Landscape, Evolving Wilds, Ash Barrens' basic landcycling): the basic land types, as colours, and
 * whether only basics.  `types`: its own basic land types, as colours (a fetchable typed land).  A
 * fetcher is a source of a colour only through a land of the deck it can find (landSources).
 */
export interface LandMana { direct: string; fetch: { types: string; basicOnly: boolean } | null; types: string }

export interface CensusCard extends SampleCard {
  cost: Cost;
  mana?: LandMana;
  /** Card flow by #153's rule (isCardFlow on the script's front face). */
  flow?: boolean;
}

const TYPE_COLOUR: Record<string, Colour> = { Plains: 'W', Island: 'U', Swamp: 'B', Mountain: 'R', Forest: 'G' };
const colourSet = (s: Iterable<string>): string => { const x = new Set(s); return COLOURS.filter((c) => x.has(c)).join(''); };

/** A land's LandMana from its Forge script (every face's `Types:` and `Oracle:`). */
export function landManaOf(script: string): LandMana {
  const types = colourSet([...script.matchAll(/^Types:(.*)$/gm)].flatMap((m) => (m[1] ?? '').split(/\s+/)).map((w) => TYPE_COLOUR[w] ?? ''));
  const oracle = [...script.matchAll(/^Oracle:(.*)$/gm)].map((m) => (m[1] ?? '').replace(/\\n/g, '\n')).join('\n');
  const direct = new Set<string>(types);
  for (const m of oracle.matchAll(/\badd ([^.]*)/gi)) {
    const clause = m[1] ?? '';
    if (/any colou?r/i.test(clause)) COLOURS.forEach((c) => direct.add(c));
    for (const x of clause.matchAll(/\{([WUBRG])\}/g)) direct.add(x[1] ?? '');
  }
  let fetch: LandMana['fetch'] = null;
  for (const m of oracle.matchAll(/search your library for (?:an? |up to \w+ )?([^.]*?)cards?\b/gi)) {
    const what = m[1] ?? '';
    const ft = /basic land/i.test(what) ? COLOURS.join('') : colourSet(Object.entries(TYPE_COLOUR).filter(([t]) => new RegExp(`\\b${t}\\b`).test(what)).map(([, c]) => c));
    if (!ft) continue;
    const basicOnly = /\bbasic\b/i.test(what);
    fetch = fetch ? { types: colourSet([...fetch.types, ...ft]), basicOnly: fetch.basicOnly && basicOnly } : { types: ft, basicOnly };
  }
  return { direct: colourSet(direct), fetch, types };
}

/** The deck pool of a band: its own cards, or (a band under MIN_BAND_POOL eligible nonland cards: powered) united with its FILL bands, nearest first, until it is not. */
export function poolBands(lib: CensusCard[], band: Band): Band[] {
  const out: Band[] = [band];
  const nonland = (bs: Band[]): number => lib.filter((c) => bs.includes(c.band) && !c.land).length;
  for (const b of FILL_ORDER[band]) { if (nonland(out) >= MIN_BAND_POOL) break; out.push(b); }
  return out;
}

/** The cross-band slice's bands: the neighbours of the pool's bands that are not in it. */
export function crossBands(pool: Band[]): Band[] {
  return BANDS.filter((b) => !pool.includes(b) && pool.some((p) => NEIGHBOURS[p].includes(b)));
}

// ---------------------------------------------------------------- 1. the prior

export interface Makeup { k: number; colours: string; shares: Partial<Record<Colour, number>> }

/** D447's k: uniform on 1..5.  A cube's census (D456) draws k uniform on its own list, 1..3. */
export const BAND_KS: readonly number[] = [1, 2, 3, 4, 5];

export function makeupOf(r: Rng, ks: readonly number[] = BAND_KS): Makeup {
  const k = ks[r.int(ks.length)] as number;   // with BAND_KS this is D447's 1 + r.int(5), draw for draw
  const cols = shuffle([...COLOURS], r).slice(0, k);
  const e = cols.map(() => -Math.log(1 - r.next()));
  const sum = e.reduce((a, b) => a + b, 0);
  const shares: Partial<Record<Colour, number>> = {};
  cols.forEach((c, i) => { shares[c] = (e[i] as number) / sum; });
  return { k, colours: COLOURS.filter((c) => cols.includes(c)).join(''), shares };
}

// ---------------------------------------------------------------- 2. the draw

/** The castability rule's half that a card meets alone: printed colours and every cost symbol payable by the makeup's colours. */
export function eligibleIn(c: Pick<CensusCard, 'colors' | 'cost'>, colours: string): boolean {
  for (const x of c.colors) if (!colours.includes(x)) return false;
  for (const x of Object.keys(c.cost.plain)) if (!colours.includes(x)) return false;
  for (const h of c.cost.hybrid) if (![...h].some((x) => colours.includes(x))) return false;
  return true;
}

/** The colours a nonland card counts under in a draw: its printed colours and its pips' colours. */
export function coloursOf(c: Pick<CensusCard, 'colors' | 'cost'>): string {
  const s = new Set([...c.colors, ...Object.keys(c.cost.share)]);
  return COLOURS.filter((x) => s.has(x)).join('');
}

export type Role = 'in' | 'cross' | 'fill';
export interface Drawn { card: CensusCard; role: Role }

export interface DrawCtx { lib: CensusCard[]; pool: Band[]; cross: Band[]; fill: Band[]; colourlessShare: number; crossBand: number }

/** The band pool's colourless share among its eligible nonland cards (q in rule 2). */
export function colourlessShareOf(lib: CensusCard[], pool: Band[]): number {
  const nl = lib.filter((c) => pool.includes(c.band) && !c.land);
  return nl.length ? nl.filter((c) => coloursOf(c) === '').length / nl.length : 0;
}

function pickColour(shares: Partial<Record<Colour, number>>, r: Rng, skip: Set<string>): Colour | null {
  const cols = COLOURS.filter((c) => (shares[c] ?? 0) > 0 && !skip.has(c));
  const tot = cols.reduce((a, c) => a + (shares[c] as number), 0);
  if (!cols.length || tot <= 0) return null;
  let x = r.next() * tot;
  for (const c of cols) { x -= shares[c] as number; if (x < 0) return c; }
  return cols[cols.length - 1] as Colour;
}

/** SPELLS_DRAWN spells for a makeup (rule 2), or null when every list ran dry. */
export function drawSpells(ctx: DrawCtx, m: Makeup, r: Rng): Drawn[] | null {
  const taken = new Set<string>();
  const elig = ctx.lib.filter((c) => !c.land && eligibleIn(c, m.colours));
  const listOf = (bands: Band[], colour: Colour | ''): CensusCard[] => elig.filter((c) => bands.includes(c.band) && !taken.has(c.name)
    && (colour === '' ? coloursOf(c) === '' : coloursOf(c).includes(colour)));
  const out: Drawn[] = [];
  for (let i = 0; i < SPELLS_DRAWN; i++) {
    const isCross = ctx.cross.length > 0 && r.next() < ctx.crossBand;
    const colourless = r.next() < ctx.colourlessShare;
    const skip = new Set<string>();
    let got: Drawn | null = null;
    for (let tries = 0; tries < 6 && !got; tries++) {
      const col: Colour | '' | null = colourless && tries === 0 ? '' : pickColour(m.shares, r, skip);
      if (col === null) break;
      const tiers: Array<[Band[], Role]> = [...(isCross ? [[ctx.cross, 'cross'] as [Band[], Role]] : []), [ctx.pool, 'in'], ...ctx.fill.map((b) => [[b], 'fill'] as [Band[], Role])];
      for (const [bands, role] of tiers) {
        const list = listOf(bands, col);
        if (list.length) { const c = list[r.int(list.length)] as CensusCard; got = { card: c, role }; break; }
      }
      if (col !== '') skip.add(col);
    }
    if (!got) return null;
    taken.add(got.card.name);
    out.push(got);
  }
  return out;
}

// ---------------------------------------------------------------- 3. the lands

export function landCount(meanMv: number): number {
  return Math.min(LAND_MAX, Math.max(LAND_MIN, LAND_BASE + Math.floor(LAND_SLOPE * (meanMv - LAND_MV_AT) + 0.5)));
}

export const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Pip totals per colour (rule 3's shares) over spells. */
export function pipTotals(spells: Array<Pick<CensusCard, 'cost'>>): Record<Colour, number> {
  const t = { W: 0, U: 0, B: 0, R: 0, G: 0 } as Record<Colour, number>;
  for (const s of spells) for (const [c, n] of Object.entries(s.cost.share)) t[c as Colour] += n as number;
  return t;
}

export interface LandPlan { lands: number; fixers: Drawn[]; basics: Record<Colour, number>; fixerTarget: number; sMax: number | null; pipColours: string }

/** Rule 3: L, the fixers and the basics for these kept spells, or null when the basics cannot give every colour its minimum. */
export function landPlan(ctx: Pick<DrawCtx, 'lib' | 'pool' | 'fill'>, spells: CensusCard[], lands: number, makeup: Makeup, r: Rng): LandPlan | null {
  const pips = pipTotals(spells);
  const totalPips = COLOURS.reduce((a, c) => a + pips[c], 0);
  const pipColours = COLOURS.filter((c) => pips[c] > 0).join('');
  // a deck with no coloured pip at all splits its basics by the makeup's shares
  const share = (c: Colour): number => (totalPips > 0 ? pips[c] / totalPips : (makeup.shares[c] ?? 0));
  const sMax = totalPips > 0 ? Math.max(...COLOURS.map((c) => pips[c] / totalPips)) : null;
  let fixers: Drawn[] = [];
  let fixerTarget = 0;
  if (pipColours.length >= 2 && sMax !== null) {
    fixerTarget = Math.floor(lands * (1 - sMax) + 0.5);
    // a fixer can make (directly, or by what it can find) two or more of the pip colours; whether it does
    // depends on the basics, and landSources counts only what it really reaches
    const makes2 = (c: CensusCard): boolean => c.land && [...reachable(c)].filter((x) => pipColours.includes(x)).length >= 2;
    for (const [bands, role] of [[ctx.pool, 'in'] as [Band[], Role], ...ctx.fill.map((b) => [[b], 'fill'] as [Band[], Role])]) {
      if (fixers.length >= fixerTarget) break;
      const list = shuffle(ctx.lib.filter((c) => makes2(c) && bands.includes(c.band)), r);
      for (const c of list) { if (fixers.length >= fixerTarget) break; fixers.push({ card: c, role }); }
    }
  }
  const nBasics = lands - fixers.length;
  const basics = { W: 0, U: 0, B: 0, R: 0, G: 0 } as Record<Colour, number>;
  const basicColours = COLOURS.filter((c) => share(c) > 0);
  // each colour's minimum: the sources its most demanding spell needs (at least 1), counted as landSources
  // counts them, so a fetcher counts toward a colour only once a land it can find of that colour is in
  // the deck; one basic at a time to the first colour short of its minimum (WUBRG order)
  const need = Object.fromEntries(basicColours.map((c) => [c, Math.max(1, ...spells.map((s) => s.cost.plain[c] ?? 0))])) as Partial<Record<Colour, number>>;
  let used = 0;
  for (;;) {
    const src = landSources(fixers.map((f) => f.card), basics).sources;
    const short = basicColours.find((c) => src[c] < (need[c] as number));
    if (short === undefined) break;
    if (used >= nBasics) return null;
    basics[short]++;
    used++;
  }
  for (; used < nBasics; used++) {
    let best: Colour | null = null, gap = -Infinity;
    for (const c of basicColours) { const g = nBasics * share(c) - basics[c]; if (g > gap + 1e-12) { gap = g; best = c; } }
    if (best === null) break;
    basics[best]++;
  }
  return { lands, fixers, basics, fixerTarget, sMax, pipColours };
}

// ---------------------------------------------------------------- 4. castability

/** Every colour a land could ever give a deck: what it taps for and every basic type it can find. */
function reachable(c: Pick<CensusCard, 'produces' | 'mana'>): string {
  return c.mana ? colourSet([...c.mana.direct, ...(c.mana.fetch?.types ?? '')]) : c.produces;
}

/**
 * The sources of each colour among a deck's lands, and each nonbasic land's REALISED colours.  A basic
 * makes its colour.  A nonbasic makes what it taps for, plus, for a fetcher or a cycler, the colours of
 * the deck's lands it can find: a basic of a type it searches for, or (when it is not basics-only) a
 * typed nonbasic of the deck with such a type (Flooded Strand finding a Tundra), never itself.  So
 * Evolving Wilds in a deck with Plains and Islands only is a source of W and U, and a Landscape whose
 * three types meet one basic of the deck is a source of one colour.
 */
export function landSources(nonbasics: Array<Pick<CensusCard, 'name' | 'produces' | 'mana'>>, basics: Record<Colour, number>): { sources: Record<Colour, number>; reach: string[] } {
  const s = { ...basics };
  const reach = nonbasics.map((l, i) => {
    const m = l.mana ?? { direct: l.produces, fetch: null, types: '' };
    const out = new Set<string>(m.direct);
    if (m.fetch) {
      for (const t of m.fetch.types) {
        if (basics[t as Colour] > 0) out.add(t);
        if (!m.fetch.basicOnly) nonbasics.forEach((o, j) => { if (j !== i && o.mana?.types.includes(t)) for (const c of o.mana.direct) out.add(c); });
      }
    }
    return colourSet(out);
  });
  for (const r of reach) for (const c of r) s[c as Colour]++;
  return { sources: s, reach };
}

/** The sources of each colour among a deck's lands (landSources). */
export function sourcesOf(plan: Pick<LandPlan, 'fixers' | 'basics'>): Record<Colour, number> {
  return landSources(plan.fixers.map((f) => f.card), plan.basics).sources;
}

export function castable(spell: Pick<CensusCard, 'cost'>, sources: Record<Colour, number>): boolean {
  for (const [c, n] of Object.entries(spell.cost.plain)) if (sources[c as Colour] < (n as number)) return false;
  for (const h of spell.cost.hybrid) if (![...h].some((c) => sources[c as Colour] > 0)) return false;
  return true;
}

// ---------------------------------------------------------------- one deck

export interface Profile {
  /** Each colour's share of the spells' pips (rule 3's counting); zeros with no pip at all. */
  pipShare: Record<Colour, number>;
  mainColour: Colour | null;
  mainShare: number | null;
  /** Colours with at least 3 spells of that colour (printed or by pips). */
  coloursWith3: number;
  /** Colours with any pip. */
  pipColours: string;
  spellsByColour: Record<Colour, number>;
  colourless: number;
}

export function profileOf(spells: CensusCard[]): Profile {
  const pips = pipTotals(spells);
  const tot = COLOURS.reduce((a, c) => a + pips[c], 0);
  const pipShare = Object.fromEntries(COLOURS.map((c) => [c, tot > 0 ? r4(pips[c] / tot) : 0])) as Record<Colour, number>;
  const spellsByColour = Object.fromEntries(COLOURS.map((c) => [c, spells.filter((s) => coloursOf(s).includes(c)).length])) as Record<Colour, number>;
  let mainColour: Colour | null = null;
  for (const c of COLOURS) if (tot > 0 && (mainColour === null || pips[c] > pips[mainColour] + 1e-12)) mainColour = c;
  return {
    pipShare, mainColour, mainShare: mainColour === null ? null : r4(pips[mainColour] / tot),
    coloursWith3: COLOURS.filter((c) => spellsByColour[c] >= 3).length,
    pipColours: COLOURS.filter((c) => pips[c] > 0).join(''), spellsByColour, colourless: spells.filter((s) => coloursOf(s) === '').length,
  };
}

const r4 = (x: number): number => Math.round(x * 10000) / 10000;

export interface DeckRecord {
  v: number;
  id: string;
  /** The pool: a census band (D447), or `cube:<name>` for a cube's census (D456). */
  band: DeckGroup;
  seed: number;
  index: number;
  makeup: Makeup;
  /** Rejected card draws before this deck, and new makeups drawn after MAX_CARD_ATTEMPTS. */
  rejections: number;
  makeupRedraws: number;
  /** The 40 cards, as [count, name] (basics counted), the .dck's order: spells, fixers, basics. */
  main: Array<[number, string]>;
  spells: string[];
  fixers: string[];
  basics: Record<Colour, number>;
  lands: number;
  fixerTarget: number;
  avgMv: number;
  /** Mean mana value of the first 23 spells drawn, which set the land count. */
  avgMvDrawn: number;
  profile: Profile;
  /** The deck's variables beside its profile (v2, the #154 review; the model separates a card's value from a deck that happened to cohere): */
  /** colours with any pip (profile.pipColours' length); the colour shares are profile.pipShare */
  nColours: number;
  /** creature spells */
  creatures: number;
  /** the spells' mana values: 0, 1, 2, 3, 4, 5, 6+ */
  mvHist: number[];
  /** spells with X in their cost */
  xSpells: number;
  /** card-flow spells, by #153's rule (isCardFlow, 40 library cards) */
  cardFlow: number;
  /** the fixers that reach two or more of the deck's pip colours in this deck (landSources); the rest count as one colour's source */
  fixersReal: number;
  cross: string[];
  fill: string[];
  /** Every spell castable (rule 4); always the spell count. */
  castable: number;
  file: string;
}

export interface DeckOptions { band: Band; seed: number; crossBand: number }

/** A cube's census group (D456): `cube:<the cube file's name>`, in a deck's `band` field and its streams. */
export type CubeBand = `cube:${string}`;
export type DeckGroup = Band | CubeBand;

export function deckId(band: DeckGroup, seed: number, i: number): string {
  return `${band.startsWith('cube:') ? band.slice(5) : band}-${seed}-${String(i).padStart(5, '0')}`;
}

/** Deck i (1-based) of a run: rules 1-4, redrawn on rejection. */
export function generateDeck(lib: CensusCard[], o: DeckOptions, i: number): DeckRecord {
  const pool = poolBands(lib, o.band);
  const ctx: DrawCtx = {
    lib: lib.filter(eligibleFor(false)) as CensusCard[], pool, cross: crossBands(pool), fill: FILL_ORDER[o.band].filter((b) => !pool.includes(b)),
    colourlessShare: 0, crossBand: o.crossBand,
  };
  ctx.colourlessShare = colourlessShareOf(ctx.lib, pool);
  return drawDeck(ctx, o.band, o.seed, i, BAND_KS);
}

/**
 * Rules 1-4 on one pool: deck i of `group` at `seed`, its makeup's k from `ks`, redrawn on rejection.
 * The streams are rng(seed, 'deck-census/<group>/<i>/makeup/<m>') and '.../cards/<m>/<a>', so a band's
 * decks are D447's byte for byte.
 */
export function drawDeck(ctx0: DrawCtx, group: DeckGroup, seed: number, i: number, ks: readonly number[], blocked?: (k: number) => ReadonlySet<string>): DeckRecord {
  let rejections = 0;
  for (let mk = 0; mk < 1000; mk++) {
    const makeup = makeupOf(rng(seed, `deck-census/${group}/${i}/makeup/${mk}`), ks);
    // D456's repeat cap: the cards that reached it are out of this makeup's pool (q stays the pool's own)
    const out = blocked?.(makeup.k);
    const ctx = out && out.size ? { ...ctx0, lib: ctx0.lib.filter((c) => !out.has(c.name)) } : ctx0;
    for (let a = 0; a < MAX_CARD_ATTEMPTS; a++) {
      const r = rng(seed, `deck-census/${group}/${i}/cards/${mk}/${a}`);
      const drawn = drawSpells(ctx, makeup, r);
      if (!drawn) { rejections++; continue; }
      const avgMvDrawn = mean(drawn.slice(0, LAND_FROM_FIRST).map((d) => d.card.mv));
      const lands = landCount(avgMvDrawn);
      const kept = drawn.slice(0, DECK_SIZE - lands);
      const plan = landPlan(ctx, kept.map((d) => d.card), lands, makeup, r);
      if (!plan) { rejections++; continue; }
      const src = sourcesOf(plan);
      const ok = kept.filter((d) => castable(d.card, src)).length;
      if (ok < kept.length) { rejections++; continue; }
      const spells = kept.map((d) => d.card);
      const main: Array<[number, string]> = [...spells.map((c): [number, string] => [1, c.name]), ...plan.fixers.map((f): [number, string] => [1, f.card.name]),
        ...COLOURS.filter((c) => plan.basics[c] > 0).map((c): [number, string] => [plan.basics[c], BASIC_OF[c]])];
      const id = deckId(group, seed, i);
      return {
        v: DECK_CENSUS_VERSION, id, band: group, seed, index: i, makeup: { ...makeup, shares: roundShares(makeup.shares) }, rejections, makeupRedraws: mk,
        main, spells: spells.map((c) => c.name), fixers: plan.fixers.map((f) => f.card.name), basics: plan.basics,
        lands, fixerTarget: plan.fixerTarget, avgMv: r4(mean(spells.map((c) => c.mv))), avgMvDrawn: r4(avgMvDrawn),
        profile: profileOf(spells), ...deckVars(spells, plan),
        cross: [...kept, ...plan.fixers].filter((d) => d.role === 'cross').map((d) => d.card.name),
        fill: [...kept, ...plan.fixers].filter((d) => d.role === 'fill').map((d) => d.card.name),
        castable: ok, file: `decks/${id}.dck`,
      };
    }
  }
  throw new Error(`decks: deck ${i} could not be drawn in 1,000 makeups (a bug)`);
}

/** The per-deck variables beside the profile (DeckRecord's v2 fields). */
export function deckVars(spells: CensusCard[], plan: Pick<LandPlan, 'fixers' | 'basics'>): Pick<DeckRecord, 'nColours' | 'creatures' | 'mvHist' | 'xSpells' | 'cardFlow' | 'fixersReal'> {
  const pipColours = profileOf(spells).pipColours;
  const mvHist = [0, 0, 0, 0, 0, 0, 0];
  for (const c of spells) { const b = Math.min(6, Math.max(0, Math.floor(c.mv))); mvHist[b] = (mvHist[b] as number) + 1; }
  const reach = landSources(plan.fixers.map((f) => f.card), plan.basics).reach;
  return {
    nColours: pipColours.length, creatures: spells.filter((c) => /\bCreature\b/.test(c.type)).length, mvHist,
    xSpells: spells.filter((c) => c.cost.x > 0).length, cardFlow: spells.filter((c) => c.flow).length,
    fixersReal: reach.filter((r) => [...r].filter((x) => pipColours.includes(x)).length >= 2).length,
  };
}

function roundShares(s: Partial<Record<Colour, number>>): Partial<Record<Colour, number>> {
  return Object.fromEntries(Object.entries(s).map(([c, v]) => [c, r4(v as number)]));
}

// ---------------------------------------------------------------- a cube's census (D456)

/** A cube's census draws k uniform on these (D456): 4- and 5-colour decks are not what a 180-card cube for two plays. */
export const CUBE_KS: readonly number[] = [1, 2, 3];

/** A cube's deck pool: its document's cards that the library knows, Forge supports and the AI may play; the rest named. */
export interface CubePool {
  name: string;
  /** The drawable cards (spells and nonbasic lands), each one copy, the document's order. */
  cards: CensusCard[];
  /** Every card the document lists. */
  listed: number;
  notInLibrary: string[];
  unsupported: string[];
  aiRemoved: string[];
  /** Basic lands the document lists: the decks take basics as they need them, so these are not drawn. */
  basics: string[];
}

/** The cube's name from its file: `cubes/omega-cube-180.md` -> `omega-cube-180`, the deck ids' prefix. */
export function cubeNameOf(file: string): string {
  const name = path.basename(file).replace(/\.md$/i, '');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new Error(`decks: a cube's file name must be lower-case letters, digits and hyphens (it names the decks), got ${name}`);
  if ((BANDS as readonly string[]).includes(name)) throw new Error(`decks: a cube may not be named after a band (${name})`);
  return name;
}

/** Rule 2's eligibility on a cube's own list (D456): the census's population, restricted to the document's cards. */
export function cubePool(cubeText: string, lib: CensusCard[], name: string): CubePool {
  const cube = parseCube(cubeText);
  if (!cube.cards.length) throw new Error(`decks: ${name} lists no card (${cube.warnings.join('; ') || 'no "## The list" section'})`);
  const byName = new Map(lib.map((c) => [c.name, c]));
  const out: CubePool = { name, cards: [], listed: cube.cards.length, notInLibrary: [], unsupported: [], aiRemoved: [], basics: [] };
  const seen = new Set<string>();
  for (const { name: n } of cube.cards) {
    if (seen.has(n)) continue;
    seen.add(n);
    const c = byName.get(n);
    if (!c) { out.notInLibrary.push(n); continue; }
    if (c.basic || (c.land && /\bBasic\b/.test(c.type))) { out.basics.push(n); continue; }
    if (!c.supported) { out.unsupported.push(n); continue; }
    if (!eligibleFor(false)(c)) { out.aiRemoved.push(n); continue; }
    out.cards.push(c);
  }
  return out;
}

/** The draw's context for a cube: one pool, no cross-band slice, nothing to fill from; q is the cube's own colourless share. */
export function cubeCtx(pool: Pick<CubePool, 'cards'>): DrawCtx {
  const ctx: DrawCtx = { lib: pool.cards, pool: [...BANDS], cross: [], fill: [], colourlessShare: 0, crossBand: 0 };
  ctx.colourlessShare = colourlessShareOf(pool.cards, ctx.pool);
  return ctx;
}

// ---------------------------------------------------------------- the population, from files

/** The jar's directory's res/cardsfolder/cardsfolder.zip: $FORGE_JAR, else config.json's forgeJar (hard rule 9). */
export function defaultScriptsZip(repo: string): string {
  let jar = process.env.FORGE_JAR;
  if (!jar) { try { jar = (JSON.parse(fs.readFileSync(path.join(repo, 'config.json'), 'utf8')) as { forgeJar?: string }).forgeJar; } catch { /* none */ } }
  if (!jar) throw new Error('decks: no FORGE_JAR and no forgeJar in config.json; pass --scripts <Forge res/cardsfolder/cardsfolder.zip>');
  return path.join(path.dirname(jar), 'res', 'cardsfolder', 'cardsfolder.zip');
}

export const sha12 = (s: string | Buffer): string => createHash('sha256').update(s).digest('hex').slice(0, 12);

/** A card's script by its library name (a split card by its first half too), from Forge's zip. */
export function scriptLookup(scripts: Pick<ForgeScripts, 'scriptOf'>): (name: string) => string | null {
  return (n) => scripts.scriptOf(n) ?? (n.includes(' // ') ? scripts.scriptOf(n.split(' // ')[0] as string) : null);
}

/** census.tsv joined to library-pool.tsv, each card with its cost from its Forge script.  `scriptOf` returns null for a card with no script. */
export function censusPopulation(poolText: string, censusText: string, scriptOf: (name: string) => string | null): { lib: CensusCard[]; noScript: string[] } {
  const recorded = recordedInputs(censusText).get('library-pool.tsv');
  if (recorded !== sha12(poolText)) throw new Error(`decks: census.tsv was built from another library-pool.tsv (sha256 ${recorded ?? '?'}, this one ${sha12(poolText)}); run tools/cubelab.sh census build`);
  const joined = joinCensus(parseLibraryPool(poolText), parseCensus(censusText));
  const noScript: string[] = [];
  const lib = joined.map((c): CensusCard => {
    if (c.land && c.supported) {
      const script = scriptOf(c.name);
      if (script === null) noScript.push(c.name);
      return { ...c, cost: NO_COST, mana: script === null ? { direct: c.produces, fetch: null, types: '' } : landManaOf(script) };
    }
    if (c.land || !c.supported) return { ...c, cost: NO_COST };
    const script = scriptOf(c.name);
    if (script === null) noScript.push(c.name);
    return { ...c, cost: script === null ? costFromColours(c.colors) : scriptCost(script), flow: script !== null && isCardFlow(scriptFlowFact(script)) };
  });
  return { lib, noScript };
}

/** A card with no script: one plain pip of each printed colour. */
function costFromColours(colors: string): Cost {
  const plain: Partial<Record<Colour, number>> = {};
  for (const c of colors) plain[c as Colour] = 1;
  return { plain, hybrid: [], share: { ...plain }, x: 0 };
}

// ---------------------------------------------------------------- the command

export function decksCommand(repo: string, f: Map<string, string[]>, say: (s: string) => void): number {
  const one = (k: string): string | undefined => f.get(k)?.at(-1);
  if (f.has('cube')) return cubeDecksCommand(repo, f, say);
  for (const k of ['k', 'max-share-k1']) if (f.has(k)) throw new Error(`decks: --${k} is for --cube (D456); a band's census is D447's, k on 1..5`);
  const band = one('band') as Band | undefined;
  if (!band || !BANDS.includes(band)) throw new Error(`decks: --band wants one of ${BANDS.join(', ')}`);
  const seed = Number(one('seed'));
  const count = Number(one('count'));
  if (!Number.isInteger(seed) || seed < 0 || !Number.isInteger(count) || count < 1) throw new Error('decks: --seed wants a whole number and --count a positive one');
  const crossBand = one('cross-band') === undefined ? DEFAULT_DECK_CROSS : Number(one('cross-band'));
  if (!(crossBand >= 0 && crossBand <= 0.5)) throw new Error('decks: --cross-band wants a share from 0 to 0.5');
  const outArg = one('out');
  if (!outArg) throw new Error('decks: --out <dir> is required');
  const out = labPath(repo, outArg, 'write');   // D450: LAB_DATA_DIR re-roots var/ paths
  const censusFile = path.resolve(repo, one('census') ?? 'cubes/library/census.tsv');
  const poolFile = path.resolve(repo, one('pool') ?? 'cubes/library/library-pool.tsv');
  const censusText = fs.readFileSync(censusFile, 'utf8');
  const poolText = fs.readFileSync(poolFile, 'utf8');
  const zip = path.resolve(repo, one('scripts') ?? defaultScriptsZip(repo));
  const scripts = openForgeScripts(zip);
  if (!scripts) throw new Error(`decks: no Forge card scripts at ${zip} (pass --scripts)`);
  const { lib, noScript } = censusPopulation(poolText, censusText, scriptLookup(scripts));
  fs.mkdirSync(path.join(out, 'decks'), { recursive: true });
  const o: DeckOptions = { band, seed, crossBand };
  const lines: string[] = [];
  let rej = 0, redraws = 0, forty = 0, allCastable = 0, redrawn = 0;
  const sums = Object.fromEntries(MEAN_KEYS.map((k) => [k, 0])) as Record<(typeof MEAN_KEYS)[number], number>;
  const mvHist = [0, 0, 0, 0, 0, 0, 0];
  const byK = [0, 0, 0, 0, 0, 0];
  const cc3 = [0, 0, 0, 0, 0, 0];
  const bins: Record<string, number> = Object.fromEntries(MAIN_SHARE_KEYS.map((k) => [k, 0]));
  for (let i = 1; i <= count; i++) {
    const d = generateDeck(lib, o, i);
    if (d.main.reduce((a, [n]) => a + n, 0) !== DECK_SIZE || d.castable !== d.spells.length) throw new Error(`decks: deck ${d.id} is not ${DECK_SIZE} castable cards (a bug)`);
    forty++; allCastable++;
    cc3[d.profile.coloursWith3] = (cc3[d.profile.coloursWith3] as number) + 1;
    const bin = mainShareKey(d.profile.mainShare);
    if (bin) bins[bin] = (bins[bin] as number) + 1;
    fs.writeFileSync(path.join(out, d.file), dckText(`census ${d.id}`, d.main, []));
    lines.push(JSON.stringify(d));
    rej += d.rejections; redraws += d.makeupRedraws;
    if (d.rejections > 0 || d.makeupRedraws > 0) redrawn++;
    for (const k of MEAN_KEYS) sums[k] += k === 'fixers' ? d.fixers.length : d[k];
    d.mvHist.forEach((n, b) => { mvHist[b] = (mvHist[b] as number) + n; });
    byK[d.makeup.k] = (byK[d.makeup.k] as number) + 1;
  }
  const jsonl = `${lines.join('\n')}\n`;
  fs.writeFileSync(path.join(out, 'decks.jsonl'), jsonl);
  const pool = poolBands(lib, band);
  const manifest = {
    v: DECK_CENSUS_VERSION, decision: 'D447', band, seed, count, crossBand, poolBands: pool, crossBands: crossBands(pool), fillBands: FILL_ORDER[band].filter((b) => !pool.includes(b)),
    colourlessShare: r4(colourlessShareOf(lib.filter(eligibleFor(false)) as CensusCard[], pool)),
    rejections: rej, makeupRedraws: redraws, decksRedrawn: redrawn, makeupK: { k1: byK[1], k2: byK[2], k3: byK[3], k4: byK[4], k5: byK[5] },
    decksOf40: forty, decksAllCastable: allCastable, coloursWith3: { c0: cc3[0], c1: cc3[1], c2: cc3[2], c3: cc3[3], c4: cc3[4], c5: cc3[5] }, mainShare: bins,
    meanCross: r4(lines.reduce((a, l) => a + (JSON.parse(l) as DeckRecord).cross.length, 0) / Math.max(1, count)),
    means: Object.fromEntries(MEAN_KEYS.map((k) => [k, r4(sums[k] / count)])), mvHist,
    censusSha: sha12(censusText), poolSha: sha12(poolText), scripts: scripts.path, noScript, decksSha: sha12(jsonl),
    rules: RULES_TEXT,
  };
  fs.writeFileSync(path.join(out, 'decks.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  say(`decks: ${count} ${band} deck(s), seed ${seed}, into ${shownPath(repo, out) || '.'}: k = 1..5 ${byK.slice(1).join(' / ')}; ${rej} rejected draw(s), ${redraws} new makeup(s); pool ${pool.join('+')}, cross ${crossBands(pool).join('+') || '-'}${noScript.length ? `; ${noScript.length} card(s) with no script, costed by colour: ${noScript.slice(0, 5).join(', ')}` : ''}`);
  return 0;
}

// ---------------------------------------------------------------- a cube's census: the command (D456)

/** D456's repeat cap: a card is in at most this share of the run's k = 1 decks. */
export const DEFAULT_MAX_SHARE_K1 = 0.25;
/** ...but never under this many decks, so a short run (a pilot, a test) is not starved. */
export const REPEAT_CAP_FLOOR = 10;

/** The repeat cap as a count: a card is in at most max(floor, floor(share x N1)) of a run's k = 1 decks. */
export function repeatCapCount(share: number, n1: number): number {
  return Math.max(REPEAT_CAP_FLOOR, Math.floor(share * n1 + 1e-9));
}

/**
 * A cube's run under the repeat cap.  Round 1 caps at the count the run's FIRST makeups give N1 (the decks
 * whose makeup 0 is k = 1); a round whose cap removed decks (k = 1 makeups that could not be drawn and
 * were redrawn) ends with fewer k = 1 decks, so the run is drawn again from deck 1 with the cap of the N1
 * it got, until the cap is the run's own: max(REPEAT_CAP_FLOOR, floor(share x N1)) for its N1.  While no
 * card reaches the cap, the decks are the uncapped draw's, deck for deck, and there is one round.
 */
export function drawCubeRun(ctx: DrawCtx, group: CubeBand, seed: number, count: number, ks: readonly number[], share: number): {
  decks: DeckRecord[]; capCount: number; capped: Set<string>; decksUnderCap: number; k1Uses: Map<string, number>; rounds: number;
} {
  const none: ReadonlySet<string> = new Set();
  const n1First = ks.includes(1) ? Array.from({ length: count }, (_, j) => makeupOf(rng(seed, `deck-census/${group}/${j + 1}/makeup/0`), ks).k).filter((k) => k === 1).length : 0;
  let capCount = repeatCapCount(share, n1First);
  for (let round = 1; ; round++) {
    const k1Uses = new Map<string, number>();
    const capped = new Set<string>();
    let decksUnderCap = 0;
    const decks: DeckRecord[] = [];
    for (let i = 1; i <= count; i++) {
      const d = drawDeck(ctx, group, seed, i, ks, (k) => (k === 1 ? capped : none));
      if (d.makeup.k === 1) {
        if (capped.size) decksUnderCap++;
        for (const n of [...d.spells, ...d.fixers]) {
          const u = (k1Uses.get(n) ?? 0) + 1;
          k1Uses.set(n, u);
          if (u >= capCount) capped.add(n);
        }
      }
      decks.push(d);
    }
    const own = repeatCapCount(share, decks.filter((d) => d.makeup.k === 1).length);
    if (own >= capCount || round >= 50) return { decks, capCount, capped, decksUnderCap, k1Uses, rounds: round };
    capCount = own;
  }
}

/** One card's deck shares over a run (card-shares.tsv). */
export interface CardShare {
  card: string; colours: string; mv: number; land: boolean;
  decks: number; share: number;
  /** Per k: the decks of that k holding it, their share of that k's decks, the decks of that k whose makeup admits it, and its share of those. */
  byK: Record<string, { decks: number; share: number | null; admitting: number; shareOfAdmitting: number | null }>;
}

/** Each card's share of the decks, overall and per k (of that k's decks, and of the decks whose makeup admits it). */
export function cardShares(pool: CensusCard[], decks: DeckRecord[], ks: readonly number[]): CardShare[] {
  const byK = new Map<number, DeckRecord[]>(ks.map((k) => [k, decks.filter((d) => d.makeup.k === k)]));
  return pool.map((c) => {
    const holds = (d: DeckRecord): boolean => d.spells.includes(c.name) || d.fixers.includes(c.name);
    const n = decks.filter(holds).length;
    const per: CardShare['byK'] = {};
    for (const k of ks) {
      const ds = byK.get(k) as DeckRecord[];
      const h = ds.filter(holds).length;
      const adm = ds.filter((d) => (c.land ? [...reachable(c)].filter((x) => d.makeup.colours.includes(x)).length >= 2 : eligibleIn(c, d.makeup.colours))).length;
      per[`k${k}`] = { decks: h, share: ds.length ? r4(h / ds.length) : null, admitting: adm, shareOfAdmitting: adm ? r4(h / adm) : null };
    }
    return { card: c.name, colours: coloursOf(c), mv: c.mv, land: c.land, decks: n, share: decks.length ? r4(n / decks.length) : 0, byK: per };
  });
}

export function cardSharesTsv(rows: CardShare[], ks: readonly number[]): string {
  const head = ['card', 'colours', 'mv', 'land', 'decks', 'share', ...ks.flatMap((k) => [`k${k}_decks`, `k${k}_share`, `k${k}_admitting`, `k${k}_share_of_admitting`])];
  const v = (x: number | null): string => (x === null ? '' : String(x));
  return `${head.join('\t')}\n${rows.map((r) => [r.card, r.colours, r.mv, r.land ? 1 : 0, r.decks, r.share,
    ...ks.flatMap((k) => { const b = r.byK[`k${k}`]; return b ? [b.decks, v(b.share), b.admitting, v(b.shareOfAdmitting)] : ['', '', '', '']; })].join('\t')).join('\n')}\n`;
}

/**
 * `decks --cube <cube.md>` (D456): D447's rules 1-4 on one cube's own list instead of a band's pool.
 * The pool is the document's cards that the library knows, Forge supports and the AI may play (the
 * rest are named in decks.json); k is uniform on --k (1,2,3); the colourless share q is the cube's own;
 * there is no cross-band slice and nothing to fill from (a list that runs dry rejects the draw, as in
 * D447).  THE REPEAT CAP: a card is in at most max(10, floor(--max-share-k1 x N1)) of the run's N1
 * k = 1 decks (0.25 by default); a card that reached it is out of every later k = 1 deck's pool, and a
 * deck that cannot then be drawn is rejected and redrawn as D447 says, counted (drawCubeRun: the run is
 * drawn again until the cap is the one its own N1 gives).  Until a card reaches it the decks are the
 * uncapped draw's, deck for deck.  decks.json and card-shares.tsv report every card's share of the decks, overall, per k,
 * and of the decks whose makeup admits it.
 */
export function cubeDecksCommand(repo: string, f: Map<string, string[]>, say: (s: string) => void): number {
  const one = (k: string): string | undefined => f.get(k)?.at(-1);
  for (const k of ['band', 'cross-band']) if (f.has(k)) throw new Error(`decks: --${k} is a band's (D447); a cube's census draws from the cube alone (D456)`);
  const cubeFile = path.resolve(repo, one('cube') as string);
  const seed = Number(one('seed'));
  const count = Number(one('count'));
  if (!Number.isInteger(seed) || seed < 0 || !Number.isInteger(count) || count < 1) throw new Error('decks: --seed wants a whole number and --count a positive one');
  const ks = (one('k') ?? CUBE_KS.join(',')).split(',').map(Number);
  if (!ks.length || ks.some((k) => !Number.isInteger(k) || k < 1 || k > 5) || new Set(ks).size !== ks.length) throw new Error('decks: --k wants distinct numbers of colours from 1 to 5, as 1,2,3');
  const maxShare = Number(one('max-share-k1') ?? DEFAULT_MAX_SHARE_K1);
  if (!(maxShare > 0 && maxShare <= 1)) throw new Error('decks: --max-share-k1 wants a share above 0 and at most 1');
  const outArg = one('out');
  if (!outArg) throw new Error('decks: --out <dir> is required');
  const out = labPath(repo, outArg, 'write');   // D450
  const censusText = fs.readFileSync(path.resolve(repo, one('census') ?? 'cubes/library/census.tsv'), 'utf8');
  const poolText = fs.readFileSync(path.resolve(repo, one('pool') ?? 'cubes/library/library-pool.tsv'), 'utf8');
  const zip = path.resolve(repo, one('scripts') ?? defaultScriptsZip(repo));
  const scripts = openForgeScripts(zip);
  if (!scripts) throw new Error(`decks: no Forge card scripts at ${zip} (pass --scripts)`);
  const { lib, noScript } = censusPopulation(poolText, censusText, scriptLookup(scripts));
  const cubeText = fs.readFileSync(cubeFile, 'utf8');
  const name = cubeNameOf(cubeFile);
  const pool = cubePool(cubeText, lib, name);
  const ctx = cubeCtx(pool);
  const group: CubeBand = `cube:${name}`;
  const run = drawCubeRun(ctx, group, seed, count, ks, maxShare);
  const { decks, capCount, capped, decksUnderCap, k1Uses } = run;
  fs.mkdirSync(path.join(out, 'decks'), { recursive: true });
  for (const d of decks) {
    if (d.main.reduce((a, [n]) => a + n, 0) !== DECK_SIZE || d.castable !== d.spells.length) throw new Error(`decks: deck ${d.id} is not ${DECK_SIZE} castable cards (a bug)`);
    fs.writeFileSync(path.join(out, d.file), dckText(`census ${d.id}`, d.main, []));
  }
  const jsonl = `${decks.map((d) => JSON.stringify(d)).join('\n')}\n`;
  fs.writeFileSync(path.join(out, 'decks.jsonl'), jsonl);
  const shares = cardShares(pool.cards, decks, ks);
  fs.writeFileSync(path.join(out, 'card-shares.tsv'), cardSharesTsv(shares, ks));
  const cnt = (f2: (d: DeckRecord) => number, n: number): number[] => { const a = new Array(n).fill(0) as number[]; for (const d of decks) a[f2(d)] = (a[f2(d)] as number) + 1; return a; };
  const cc3 = cnt((d) => d.profile.coloursWith3, 6);
  const byK = cnt((d) => d.makeup.k, 6);
  const bins: Record<string, number> = Object.fromEntries(MAIN_SHARE_KEYS.map((k) => [k, 0]));
  for (const d of decks) { const b = mainShareKey(d.profile.mainShare); if (b) bins[b] = (bins[b] as number) + 1; }
  const sums = Object.fromEntries(MEAN_KEYS.map((k) => [k, decks.reduce((a, d) => a + (k === 'fixers' ? d.fixers.length : d[k]), 0)])) as Record<(typeof MEAN_KEYS)[number], number>;
  const mvHist = [0, 0, 0, 0, 0, 0, 0];
  for (const d of decks) d.mvHist.forEach((n, b) => { mvHist[b] = (mvHist[b] as number) + n; });
  const stat = (xs: number[]): { max: number | null; median: number | null } => {
    const s2 = [...xs].sort((a, b) => a - b);
    return { max: s2.length ? s2[s2.length - 1] as number : null, median: s2.length ? s2[Math.floor((s2.length - 1) / 2)] as number : null };
  };
  const top = (key: (r: CardShare) => number | null): Array<[string, number]> => shares.filter((r) => key(r) !== null).sort((a, b) => (key(b) as number) - (key(a) as number) || (a.card < b.card ? -1 : 1)).slice(0, 10).map((r) => [r.card, key(r) as number]);
  const manifest = {
    v: DECK_CENSUS_VERSION, decision: 'D456', cube: shownPath(repo, cubeFile), cubeName: name, cubeSha: sha12(cubeText), group, seed, count, ks,
    pool: { listed: pool.listed, drawable: pool.cards.length, nonland: pool.cards.filter((c) => !c.land).length, lands: pool.cards.filter((c) => c.land).length,
      notInLibrary: pool.notInLibrary, unsupported: pool.unsupported, aiRemoved: pool.aiRemoved, basicsListed: pool.basics },
    colourlessShare: r4(ctx.colourlessShare),
    rejections: decks.reduce((a, d) => a + d.rejections, 0), makeupRedraws: decks.reduce((a, d) => a + d.makeupRedraws, 0),
    decksRedrawn: decks.filter((d) => d.rejections > 0 || d.makeupRedraws > 0).length,
    makeupK: Object.fromEntries(ks.map((k) => [`k${k}`, byK[k]])),
    decksOf40: decks.length, decksAllCastable: decks.length,
    coloursWith3: { c0: cc3[0], c1: cc3[1], c2: cc3[2], c3: cc3[3], c4: cc3[4], c5: cc3[5] }, mainShare: bins,
    means: Object.fromEntries(MEAN_KEYS.map((k) => [k, r4(sums[k] / count)])), mvHist,
    repeatCap: { k: 1, maxShare, floor: REPEAT_CAP_FLOOR, rounds: run.rounds, k1Decks: byK[1] ?? 0, perCard: capCount, cardsAtCap: [...capped].sort(), decksDrawnUnderCap: decksUnderCap,
      maxK1Uses: Math.max(0, ...k1Uses.values()), maxShareOfK1: (byK[1] ?? 0) ? r4(Math.max(0, ...k1Uses.values()) / (byK[1] as number)) : null },
    cardShares: {
      file: 'card-shares.tsv', cards: shares.length, neverDrawn: shares.filter((r) => r.decks === 0).map((r) => r.card),
      all: { ...stat(shares.map((r) => r.share)), top: top((r) => r.share) },
      ...Object.fromEntries(ks.map((k) => [`k${k}`, {
        ofDecks: { ...stat(shares.map((r) => r.byK[`k${k}`]?.share ?? 0)), top: top((r) => r.byK[`k${k}`]?.share ?? null) },
        ofAdmitting: { ...stat(shares.filter((r) => (r.byK[`k${k}`]?.admitting ?? 0) > 0).map((r) => r.byK[`k${k}`]?.shareOfAdmitting as number)), top: top((r) => r.byK[`k${k}`]?.shareOfAdmitting ?? null) },
      }])),
    },
    censusSha: sha12(censusText), poolSha: sha12(poolText), scripts: scripts.path, noScript: noScript.filter((n) => pool.cards.some((c) => c.name === n)), decksSha: sha12(jsonl),
    rules: { ...RULES_TEXT, prior: `k uniform on ${ks.join(', ')}; the colours a uniform k-subset of WUBRG; shares Dirichlet(1,...,1)`,
      draw: `${SPELLS_DRAWN} spells without replacement from the cube's own drawable cards; a draw is colourless with the cube's colourless share, else a colour by the shares and a uniform eligible card of it; no cross-band slice; an empty list falls back to the other colours by share, else the draw is rejected`,
      bands: 'none: the pool is the cube document cards (D456)',
      repeatCap: `a card is in at most max(${REPEAT_CAP_FLOOR}, floor(${maxShare} x N1)) of the run's N1 k = 1 decks; once there it is out of every later k = 1 deck's pool; the run is drawn again with the cap of its own N1 until the cap holds` },
  };
  fs.writeFileSync(path.join(out, 'decks.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  say(`decks: ${count} deck(s) from ${name} (${pool.cards.length} of its ${pool.listed} cards drawable), seed ${seed}, into ${shownPath(repo, out) || '.'}: k = ${ks.join(' / ')} ${ks.map((k) => byK[k]).join(' / ')}; ${manifest.rejections} rejected draw(s), ${manifest.makeupRedraws} new makeup(s); repeat cap ${capCount} of ${byK[1] ?? 0} k=1 decks, ${capped.size} card(s) reached it; a card's share of k=1 decks at most ${manifest.repeatCap.maxShareOfK1 ?? '-'}`);
  return 0;
}

/** The per-deck variables decks.json averages. */
const MEAN_KEYS = ['lands', 'fixers', 'fixersReal', 'nColours', 'creatures', 'xSpells', 'cardFlow', 'avgMv'] as const;

/** The main-share bins census-read reports (its SHARE_BINS), counted in decks.json for the prior's coverage. */
export const MAIN_SHARE_KEYS = ['lt40', 's40_50', 's50_60', 's60_70', 's70_80', 's80_90', 's90_100', 'eq100'] as const;
export function mainShareKey(s: number | null): string | null {
  if (s === null) return null;
  if (s >= 1 - 1e-9) return 'eq100';
  if (s < 0.4) return 'lt40';
  return MAIN_SHARE_KEYS[Math.min(9, Math.floor(s * 10 + 1e-9)) - 3] as string;
}

export const RULES_TEXT = {
  prior: 'k uniform on 1..5; the colours a uniform k-subset of WUBRG; shares Dirichlet(1,...,1)',
  draw: `${SPELLS_DRAWN} spells without replacement; a draw is colourless with the band pool's colourless share, else a colour by the shares and a uniform eligible card of it; cross-band with probability --cross-band from the pool's neighbours; empty lists fall back band, FILL, other colours`,
  lands: `L = clamp(${LAND_BASE} + round(${LAND_SLOPE} x (mean mv of the first ${LAND_FROM_FIRST} drawn - ${LAND_MV_AT})), ${LAND_MIN}, ${LAND_MAX}); keep the first 40 - L spells; F = min(supply, round(L x (1 - s_max))) fixers that can make 2+ of the pip colours, uniform, band then FILL; basics: one at a time to the first colour with fewer sources than its most demanding spell's pips (at least 1), then by largest deficit to its pip share; a fetcher or cycler is a source only of the colours of the deck's lands it can find (a basic of a type it searches for; a typed nonbasic unless basics-only)`,
  castability: `every spell castable: per colour, sources >= its plain pips; a hybrid symbol a source of either colour; else rejected and redrawn (same makeup ${MAX_CARD_ATTEMPTS} times, then a new makeup)`,
  bands: `census.tsv's, exclusive; a band under ${MIN_BAND_POOL} eligible nonland cards (powered) is united with its FILL bands, nearest first`,
};
