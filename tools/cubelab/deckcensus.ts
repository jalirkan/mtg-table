// mtg-table — the cube lab: the DECK CENSUS's generator (D447): 40-card decks drawn straight from a
// band's pool at a random colour makeup, no drafter, no shape, no rating.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   tools/cubelab.sh decks --band <pauper|peasant|legacy|powered> --count N --seed S --out <dir>
//                          [--cross-band 0.10] [--census cubes/library/census.tsv] [--pool cubes/library/library-pool.tsv]
//                          [--scripts <Forge res/cardsfolder/cardsfolder.zip>]
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
//    colours (a hybrid symbol by either colour; a Phyrexian or a {2/C} symbol always).  25 spells
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
//    the deck's pip colours, drawn uniformly, the band's first, then FILL_ORDER's (D445's peasant has
//    one such land of its own); the other L - F lands are basics, each colour first given the
//    sources its most demanding spell needs (its largest count of that colour's plain pips, at least
//    1, less what the fixers give), then one at a time to the colour furthest below its pip share
//    of the basics (ties in WUBRG order).  Mono-coloured utility lands are never drawn.
// 4. CASTABILITY (castable).  A spell is castable when, for each colour, the deck's lands that
//    make it number at least the spell's plain pips of it, and each hybrid symbol has a source of
//    one of its colours.  A deck must have every spell castable; one that does not (the minimums
//    exceed L - F, or a list ran dry) is REJECTED and redrawn with the same makeup (a new stream),
//    up to 50 times, then with a new makeup; every rejection is counted.
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
import { parseLibraryPool } from './library-candidates.ts';
import { rng, shuffle, type Rng } from './rng.ts';
import { eligibleFor, FILL_ORDER, joinCensus, NEIGHBOURS, type SampleCard } from './sample.ts';
import { openForgeScripts } from '../forge-scripts.ts';

export const DECK_CENSUS_VERSION = 1;
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

/** The Synergy v3 study's 17 card-flow cards (pc-results/study/synergy-v3-design.md section 1); #153's rule replaces this list when it merges. */
export const CARD_FLOW_STUDY: readonly string[] = [
  'Opt', 'Consider', 'Brainstorm', 'Ponder', 'Thought Scour', 'Deep Analysis', 'Mulldrifter', 'Faithless Looting', 'Cathartic Reunion',
  'Unexpected Windfall', "Mishra's Bauble", 'Chromatic Star', 'Prophetic Prism', 'Ichor Wellspring', 'Candy Trail', 'Village Rites', 'Deadly Dispute',
];
const FLOW = new Set(CARD_FLOW_STUDY);

// ---------------------------------------------------------------- costs

/** A card's cost, symbol by symbol: plain pips per colour, hybrid symbols (each a colour set), and the pip share each colour gets. */
export interface Cost {
  plain: Partial<Record<Colour, number>>;
  hybrid: string[];
  share: Partial<Record<Colour, number>>;
}

export const NO_COST: Cost = { plain: {}, hybrid: [], share: {} };

/** A Forge script's `ManaCost:` (`1 W W`, `2 W/U`, `B/P`, `2/G`, `no cost`) as a Cost. */
export function parseManaCost(text: string): Cost {
  const plain: Partial<Record<Colour, number>> = {};
  const share: Partial<Record<Colour, number>> = {};
  const hybrid: string[] = [];
  const add = (r: Partial<Record<Colour, number>>, c: Colour, n: number): void => { r[c] = (r[c] ?? 0) + n; };
  for (const tok of text.trim().split(/\s+/)) {
    const up = tok.toUpperCase();
    if (!/[WUBRG]/.test(up)) continue;
    const cols = COLOURS.filter((c) => up.includes(c));
    if (up.includes('/')) {
      if (up.includes('P') || /(^|\/)2(\/|$)/.test(up)) { for (const c of cols) add(share, c, 1 / cols.length); continue; }   // Phyrexian, {2/C}: payable without the colour
      hybrid.push(cols.join(''));
      for (const c of cols) add(share, c, 1 / cols.length);
      continue;
    }
    for (const c of cols) { add(plain, c, 1); add(share, c, 1); }
  }
  return { plain, hybrid, share };
}

/** The front face's ManaCost line of a Forge script, or null. */
export function scriptManaCost(script: string): string | null {
  return /^ManaCost:(.*)$/m.exec(script)?.[1]?.trim() ?? null;
}

// ---------------------------------------------------------------- the population

export interface CensusCard extends SampleCard { cost: Cost }

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

export function makeupOf(r: Rng): Makeup {
  const k = 1 + r.int(5);
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

interface DrawCtx { lib: CensusCard[]; pool: Band[]; cross: Band[]; fill: Band[]; colourlessShare: number; crossBand: number }

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
    const makes2 = (c: CensusCard): boolean => c.land && [...c.produces].filter((x) => pipColours.includes(x)).length >= 2;
    for (const [bands, role] of [[ctx.pool, 'in'] as [Band[], Role], ...ctx.fill.map((b) => [[b], 'fill'] as [Band[], Role])]) {
      if (fixers.length >= fixerTarget) break;
      const list = shuffle(ctx.lib.filter((c) => makes2(c) && bands.includes(c.band)), r);
      for (const c of list) { if (fixers.length >= fixerTarget) break; fixers.push({ card: c, role }); }
    }
  }
  const nBasics = lands - fixers.length;
  const fixerSources = (c: Colour): number => fixers.filter((f) => f.card.produces.includes(c)).length;
  const basics = { W: 0, U: 0, B: 0, R: 0, G: 0 } as Record<Colour, number>;
  const basicColours = COLOURS.filter((c) => share(c) > 0);
  for (const c of basicColours) {
    const need = Math.max(1, ...spells.map((s) => s.cost.plain[c] ?? 0));
    basics[c] = Math.max(0, need - fixerSources(c));
  }
  let used = COLOURS.reduce((a, c) => a + basics[c], 0);
  if (used > nBasics) return null;
  for (; used < nBasics; used++) {
    let best: Colour | null = null, gap = -Infinity;
    for (const c of basicColours) { const g = nBasics * share(c) - basics[c]; if (g > gap + 1e-12) { gap = g; best = c; } }
    if (best === null) break;
    basics[best]++;
  }
  return { lands, fixers, basics, fixerTarget, sMax, pipColours };
}

// ---------------------------------------------------------------- 4. castability

/** The sources of each colour among a deck's lands (a basic makes its colour, a fixer what it produces). */
export function sourcesOf(plan: Pick<LandPlan, 'fixers' | 'basics'>): Record<Colour, number> {
  const s = { ...plan.basics };
  for (const f of plan.fixers) for (const c of COLOURS) if (f.card.produces.includes(c)) s[c]++;
  return s;
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
  band: Band;
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
  cardFlow: number;
  cross: string[];
  fill: string[];
  /** Every spell castable (rule 4); always the spell count. */
  castable: number;
  file: string;
}

export interface DeckOptions { band: Band; seed: number; crossBand: number }

export function deckId(band: Band, seed: number, i: number): string {
  return `${band}-${seed}-${String(i).padStart(5, '0')}`;
}

/** Deck i (1-based) of a run: rules 1-4, redrawn on rejection. */
export function generateDeck(lib: CensusCard[], o: DeckOptions, i: number): DeckRecord {
  const pool = poolBands(lib, o.band);
  const ctx: DrawCtx = {
    lib: lib.filter(eligibleFor(false)) as CensusCard[], pool, cross: crossBands(pool), fill: FILL_ORDER[o.band].filter((b) => !pool.includes(b)),
    colourlessShare: 0, crossBand: o.crossBand,
  };
  ctx.colourlessShare = colourlessShareOf(ctx.lib, pool);
  let rejections = 0;
  for (let mk = 0; mk < 1000; mk++) {
    const makeup = makeupOf(rng(o.seed, `deck-census/${o.band}/${i}/makeup/${mk}`));
    for (let a = 0; a < MAX_CARD_ATTEMPTS; a++) {
      const r = rng(o.seed, `deck-census/${o.band}/${i}/cards/${mk}/${a}`);
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
      const id = deckId(o.band, o.seed, i);
      return {
        v: DECK_CENSUS_VERSION, id, band: o.band, seed: o.seed, index: i, makeup: { ...makeup, shares: roundShares(makeup.shares) }, rejections, makeupRedraws: mk,
        main, spells: spells.map((c) => c.name), fixers: plan.fixers.map((f) => f.card.name), basics: plan.basics,
        lands, fixerTarget: plan.fixerTarget, avgMv: r4(mean(spells.map((c) => c.mv))), avgMvDrawn: r4(avgMvDrawn),
        profile: profileOf(spells), cardFlow: spells.filter((c) => FLOW.has(c.name)).length,
        cross: [...kept, ...plan.fixers].filter((d) => d.role === 'cross').map((d) => d.card.name),
        fill: [...kept, ...plan.fixers].filter((d) => d.role === 'fill').map((d) => d.card.name),
        castable: ok, file: `decks/${id}.dck`,
      };
    }
  }
  throw new Error(`decks: deck ${i} could not be drawn in 1,000 makeups (a bug)`);
}

function roundShares(s: Partial<Record<Colour, number>>): Partial<Record<Colour, number>> {
  return Object.fromEntries(Object.entries(s).map(([c, v]) => [c, r4(v as number)]));
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

/** census.tsv joined to library-pool.tsv, each card with its cost from Forge's scripts.  `costOf` returns null for a card with no script. */
export function censusPopulation(poolText: string, censusText: string, costOf: (name: string) => string | null): { lib: CensusCard[]; noScript: string[] } {
  const recorded = recordedInputs(censusText).get('library-pool.tsv');
  if (recorded !== sha12(poolText)) throw new Error(`decks: census.tsv was built from another library-pool.tsv (sha256 ${recorded ?? '?'}, this one ${sha12(poolText)}); run tools/cubelab.sh census build`);
  const joined = joinCensus(parseLibraryPool(poolText), parseCensus(censusText));
  const noScript: string[] = [];
  const lib = joined.map((c): CensusCard => {
    if (c.land || !c.supported) return { ...c, cost: NO_COST };
    const mc = costOf(c.name);
    if (mc === null) noScript.push(c.name);
    return { ...c, cost: mc === null ? costFromColours(c.colors) : parseManaCost(mc) };
  });
  return { lib, noScript };
}

/** A card with no script: one plain pip of each printed colour. */
function costFromColours(colors: string): Cost {
  const plain: Partial<Record<Colour, number>> = {};
  for (const c of colors) plain[c as Colour] = 1;
  return { plain, hybrid: [], share: { ...plain } };
}

// ---------------------------------------------------------------- the command

export function decksCommand(repo: string, f: Map<string, string[]>, say: (s: string) => void): number {
  const one = (k: string): string | undefined => f.get(k)?.at(-1);
  const band = one('band') as Band | undefined;
  if (!band || !BANDS.includes(band)) throw new Error(`decks: --band wants one of ${BANDS.join(', ')}`);
  const seed = Number(one('seed'));
  const count = Number(one('count'));
  if (!Number.isInteger(seed) || seed < 0 || !Number.isInteger(count) || count < 1) throw new Error('decks: --seed wants a whole number and --count a positive one');
  const crossBand = one('cross-band') === undefined ? DEFAULT_DECK_CROSS : Number(one('cross-band'));
  if (!(crossBand >= 0 && crossBand <= 0.5)) throw new Error('decks: --cross-band wants a share from 0 to 0.5');
  const outArg = one('out');
  if (!outArg) throw new Error('decks: --out <dir> is required');
  const out = path.resolve(repo, outArg);
  const censusFile = path.resolve(repo, one('census') ?? 'cubes/library/census.tsv');
  const poolFile = path.resolve(repo, one('pool') ?? 'cubes/library/library-pool.tsv');
  const censusText = fs.readFileSync(censusFile, 'utf8');
  const poolText = fs.readFileSync(poolFile, 'utf8');
  const zip = path.resolve(repo, one('scripts') ?? defaultScriptsZip(repo));
  const scripts = openForgeScripts(zip);
  if (!scripts) throw new Error(`decks: no Forge card scripts at ${zip} (pass --scripts)`);
  const { lib, noScript } = censusPopulation(poolText, censusText, (n) => {
    const s = scripts.scriptOf(n) ?? (n.includes(' // ') ? scripts.scriptOf(n.split(' // ')[0] as string) : null);
    return s === null ? null : scriptManaCost(s);
  });
  fs.mkdirSync(path.join(out, 'decks'), { recursive: true });
  const o: DeckOptions = { band, seed, crossBand };
  const lines: string[] = [];
  let rej = 0, redraws = 0, forty = 0, allCastable = 0;
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
    byK[d.makeup.k] = (byK[d.makeup.k] as number) + 1;
  }
  const jsonl = `${lines.join('\n')}\n`;
  fs.writeFileSync(path.join(out, 'decks.jsonl'), jsonl);
  const pool = poolBands(lib, band);
  const manifest = {
    v: DECK_CENSUS_VERSION, decision: 'D447', band, seed, count, crossBand, poolBands: pool, crossBands: crossBands(pool), fillBands: FILL_ORDER[band].filter((b) => !pool.includes(b)),
    colourlessShare: r4(colourlessShareOf(lib.filter(eligibleFor(false)) as CensusCard[], pool)),
    rejections: rej, makeupRedraws: redraws, makeupK: { k1: byK[1], k2: byK[2], k3: byK[3], k4: byK[4], k5: byK[5] },
    decksOf40: forty, decksAllCastable: allCastable, coloursWith3: { c0: cc3[0], c1: cc3[1], c2: cc3[2], c3: cc3[3], c4: cc3[4], c5: cc3[5] }, mainShare: bins,
    meanCross: r4(lines.reduce((a, l) => a + (JSON.parse(l) as DeckRecord).cross.length, 0) / Math.max(1, count)),
    censusSha: sha12(censusText), poolSha: sha12(poolText), scripts: scripts.path, noScript, decksSha: sha12(jsonl),
    rules: RULES_TEXT,
  };
  fs.writeFileSync(path.join(out, 'decks.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  say(`decks: ${count} ${band} deck(s), seed ${seed}, into ${path.relative(repo, out) || '.'}: k = 1..5 ${byK.slice(1).join(' / ')}; ${rej} rejected draw(s), ${redraws} new makeup(s); pool ${pool.join('+')}, cross ${crossBands(pool).join('+') || '-'}${noScript.length ? `; ${noScript.length} card(s) with no script, costed by colour: ${noScript.slice(0, 5).join(', ')}` : ''}`);
  return 0;
}

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
  lands: `L = clamp(${LAND_BASE} + round(${LAND_SLOPE} x (mean mv of the first ${LAND_FROM_FIRST} drawn - ${LAND_MV_AT})), ${LAND_MIN}, ${LAND_MAX}); keep the first 40 - L spells; F = min(supply, round(L x (1 - s_max))) fixers making 2+ of the pip colours, uniform, band then FILL; basics: each colour its most demanding spell's pips less the fixers' sources (at least 1), then by largest deficit to its pip share`,
  castability: `every spell castable: per colour, sources >= its plain pips; a hybrid symbol a source of either colour; else rejected and redrawn (same makeup ${MAX_CARD_ATTEMPTS} times, then a new makeup)`,
  bands: `census.tsv's, exclusive; a band under ${MIN_BAND_POOL} eligible nonland cards (powered) is united with its FILL bands, nearest first`,
};
