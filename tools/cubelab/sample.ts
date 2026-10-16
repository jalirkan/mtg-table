// mtg-table — the cube lab: the library census's stratified cube sampler (Phase 0, D445).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   tools/cubelab.sh sample --band <pauper|peasant|legacy|powered|all> --structure <mono-heavy|two-colour|three-colour|good-stuff>
//                           --seed S --count N --out <dir> [--cross-band 0.10] [--allow-ai-flagged]
//                           [--census cubes/library/census.tsv] [--pool cubes/library/library-pool.tsv]
//
// Writes N cube documents of 180 cards drawn from the census's population (census.tsv's bands joined to
// library-pool.tsv's engine facts and tags), each a uniform random draw within its band under a slot
// plan (skeleton.ts): the structure fixes the colour counts, the curve is Omega's (scaled to the
// structure's nonland count), and every count is exact.  Beside them, <band>-<structure>-<seed>.tsv
// lists the files with what each holds.
//
// THE STRUCTURES (each 180 cards; STRUCTURE_NOTES says the same in every document's header):
//   two-colour    Omega's skeleton exactly: 24 a colour, 2 gold a pair, 18 colourless; lands 2 a pair + 2 others.
//   mono-heavy    one main colour (they rotate W, U, B, R, G across a run's cubes from a seeded start) 60,
//                 the other four 18 each, 1 gold a pair, 22 colourless; lands 1 a pair + 6 others (light fixing).
//   three-colour  20 a colour, 3 gold a pair, 20 colourless; lands 3 a pair (30, no others).
//   good-stuff    24 a colour, 20 gold of any two or more colours (five-colour cards allowed), 18 colourless;
//                 lands 20 fixers (any land of two or more colours) + 2 of fewer.
//   A pair's land slot takes a land that makes exactly that pair, or failing that (a step down in
//   preference) one of three or more colours that includes it.
//
// THE BANDS.  Every eligible card (supported, not a basic land, and not AI:RemoveDeck:All unless
// --allow-ai-flagged) gets one uniform 32-bit key from rng(S, 'census-sample/<band>/<structure>/<i>')
// for cube i (1-based; so cube i is the same whatever --count is).  The selection is one min-cost flow
// (skeleton.ts's selectSlots) whose costs are tiers first and keys second:
//   - an in-band slot takes a card of the band (tier 0), or, only where the band cannot fill it, a card
//     of the nearest band that can (FILL_ORDER: down first, then up) -- listed in the header as FILL;
//   - the cross-band slice (--cross-band, 0.10 by default; 0 for --band all) is round(share x 180)
//     slots, spread by a seeded draw over the slot groups that a neighbouring band (NEIGHBOURS) has cards
//     for, and filled from those neighbours -- listed as CROSS.
//   So within its slots a cube is a uniform draw from its band; the powered band (41 cards) fills
//   most of a cube from legacy, which is what a vintage cube is.  --band all draws from every band
//   alike, with no slice and no fill.
//
// Deterministic: the same census, pool, flags and seed give the same bytes.  No engine.  Tested by
// web/test/cubelab-census.test.ts (every document parses with no warning and every card is a supported
// library card -- what `tools/cubelab.sh check` needs -- the plan exact, the cross-band share).

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { BANDS, parseCensus, recordedInputs, type Band, type CensusRow } from './census.ts';
import { parseCube } from './cube.ts';
import { parseLibraryPool, type LibraryCard } from './library-candidates.ts';
import { rng, shuffle } from './rng.ts';
import {
  bucketOf, cubeDocument, drawable, landGroupsOf, MONO, nonlandGroupOf, OMEGA_SKELETON, PAIRS, planErrors, planOf, scaleCurve, selectSlots, sumOf, type SlotPlan,
} from './skeleton.ts';

export const STRUCTURES = ['mono-heavy', 'two-colour', 'three-colour', 'good-stuff'] as const;
export type Structure = (typeof STRUCTURES)[number];
export type SampleBand = Band | 'all';
export const SAMPLE_BANDS: readonly SampleBand[] = [...BANDS, 'all'];

/** The bands a band's cross-band slice draws from: its neighbours in pauper < peasant < legacy < powered. */
export const NEIGHBOURS: Record<Band, Band[]> = { pauper: ['peasant'], peasant: ['pauper', 'legacy'], legacy: ['peasant', 'powered'], powered: ['legacy'] };
/** Where a band too small for a slot fills it from, nearest first: down a band, then up. */
export const FILL_ORDER: Record<Band, Band[]> = { pauper: ['peasant', 'legacy', 'powered'], peasant: ['pauper', 'legacy', 'powered'], legacy: ['peasant', 'pauper', 'powered'], powered: ['legacy', 'peasant', 'pauper'] };
export const DEFAULT_CROSS_BAND = 0.10;

const pairsOf = (n: number): Record<string, number> => Object.fromEntries(PAIRS.map((p) => [p, n]));
const pairLands = (n: number): Record<string, number> => Object.fromEntries(PAIRS.map((p) => [`pair:${p}`, n]));
const monoOf = (n: number, main?: string, mainN = 0): Record<string, number> => Object.fromEntries(MONO.map((k) => [k, k === main ? mainN : n]));

/** A structure's slot plan; `main` is mono-heavy's main colour. */
export function structurePlan(s: Structure, main: string = 'W'): SlotPlan {
  switch (s) {
    case 'two-colour': return planOf(OMEGA_SKELETON);
    case 'mono-heavy': {
      const nonland = { ...monoOf(18, main, 60), ...pairsOf(1), '': 22 };
      return { nonland, curve: scaleCurve(sumOf(nonland)), lands: { ...pairLands(1), other: 6 } };
    }
    case 'three-colour': {
      const nonland = { ...monoOf(20), ...pairsOf(3), '': 20 };
      return { nonland, curve: scaleCurve(sumOf(nonland)), lands: pairLands(3) };
    }
    case 'good-stuff': {
      const nonland = { ...monoOf(24), gold: 20, '': 18 };
      return { nonland, curve: scaleCurve(sumOf(nonland)), lands: { fixer: 20, utility: 2 } };
    }
  }
}

export const STRUCTURE_NOTES: Record<Structure, string> = {
  'two-colour': 'Omega\'s skeleton (cubes/omega-cube-180.md): 24 mono-coloured nonland cards a colour, 2 gold a colour pair, 18 colourless; 22 lands, 2 a pair that make exactly that pair and 2 others.',
  'mono-heavy': 'One colour deep: the main colour 60 nonland cards, the other four 18 each (all five present), 1 gold a pair, 22 colourless; 16 lands, light fixing: 1 a pair and 6 others.',
  'three-colour': 'More gold and more fixing: 20 mono-coloured nonland cards a colour, 3 gold a pair, 20 colourless; 30 lands, 3 a pair.',
  'good-stuff': 'Colour-even, any gold: 24 mono-coloured nonland cards a colour, 20 gold cards of any two or more colours (five-colour allowed), 18 colourless; 22 lands, 20 fixers (any land of two or more colours) and 2 of fewer.',
};

export const GOLD_NOTE: Record<Structure, string> = {
  'two-colour': ' (2 per colour pair)', 'mono-heavy': ' (1 per colour pair)', 'three-colour': ' (3 per colour pair)', 'good-stuff': ' (two colours; 20 gold with the next section)',
};

export function planText(plan: SlotPlan): string {
  const g = (r: Record<string, number>): string => Object.entries(r).map(([k, n]) => `${k || 'colourless'} ${n}`).join(', ');
  return `nonland ${g(plan.nonland)}; curve ${plan.curve.map((n, b) => `${n} at ${b}${b === 7 ? '+' : ''}`).join(', ')}; lands ${g(plan.lands)}`;
}

// ---------------------------------------------------------------- the population

export type SampleCard = LibraryCard & { band: Band };

/** library-pool.tsv's cards with census.tsv's band; the two must list the same cards. */
export function joinCensus(pool: LibraryCard[], census: CensusRow[]): SampleCard[] {
  const bandOf = new Map(census.map((r) => [r.name, r.band]));
  const missing = pool.filter((c) => !bandOf.has(c.name)).map((c) => c.name);
  if (missing.length || census.length !== pool.length) throw new Error(`sample: census.tsv and library-pool.tsv list different cards (${missing.length} pool card(s) without a census row${missing.length ? `: ${missing.slice(0, 5).join(', ')}` : ''}); run tools/cubelab.sh census build`);
  return pool.map((c) => ({ ...c, band: bandOf.get(c.name) as Band }));
}

export const eligibleFor = (allowAiFlagged: boolean) => (c: SampleCard): boolean => drawable(c) && (allowAiFlagged || c.aiFlag !== 'All');

// ---------------------------------------------------------------- one cube

export interface SampleOptions { band: SampleBand; structure: Structure; seed: number; index: number; crossBand: number; allowAiFlagged: boolean }

export type Role = 'in' | 'cross' | 'fill';

export interface SampleResult {
  cards: SampleCard[];
  role: Map<string, Role>;
  plan: SlotPlan;
  main: string | null;
  /** The slots the slice asked for, and the slots it could spread over neighbour cards. */
  crossAsked: number;
  crossSlots: number;
  eligible: number;
  inBand: number;
  neighbours: number;
}

const KEY = 2 ** 32;
const BIG = 2 ** 40;      // above 180 keys, so a tier always outweighs the keys

/** Mono-heavy's main colour for cube `index` of a run: the five rotate from a seeded start. */
export function mainColour(o: Pick<SampleOptions, 'band' | 'structure' | 'seed' | 'index'>): string {
  return MONO[(rng(o.seed, `census-sample/${o.band}/${o.structure}/main`).int(5) + o.index - 1) % 5] as string;
}

export function sampleCube(lib: SampleCard[], o: SampleOptions): SampleResult {
  const main = o.structure === 'mono-heavy' ? mainColour(o) : null;
  const plan = structurePlan(o.structure, main ?? undefined);
  const pool = lib.filter(eligibleFor(o.allowAiFlagged));
  const r = rng(o.seed, `census-sample/${o.band}/${o.structure}/${o.index}`);
  const key = new Map(pool.map((c) => [c.name, Math.floor(r.next() * KEY)]));
  const band = o.band;
  const nb: Band[] = band === 'all' ? [] : NEIGHBOURS[band];
  const total = sumOf(plan.nonland) + sumOf(plan.lands);

  // The cross-band slice: X slots spread uniformly over the slot groups neighbour cards can fill.
  const crossAsked = band === 'all' ? 0 : Math.round(o.crossBand * total);
  const cross: Record<string, number> = {};
  let crossSlots = 0;
  if (crossAsked > 0) {
    const ofNb = pool.filter((c) => nb.includes(c.band));
    const positions: string[] = [];
    for (const [g, q] of Object.entries(plan.nonland)) {
      const have = ofNb.filter((c) => !c.land && nonlandGroupOf(plan, c.colors) === g && (plan.curve[bucketOf(c.mv)] ?? 0) > 0).length;
      for (let k = 0; k < Math.min(q, have); k++) positions.push(`n|${g}`);
    }
    for (const [g, q] of Object.entries(plan.lands)) {
      const have = ofNb.filter((c) => c.land && landGroupsOf(plan, c.produces).some((x) => x.group === g)).length;
      for (let k = 0; k < Math.min(q, have); k++) positions.push(`l|${g}`);
    }
    for (const p of shuffle(positions, rng(o.seed, `census-sample/${o.band}/${o.structure}/${o.index}/cross`)).slice(0, crossAsked)) { cross[p] = (cross[p] ?? 0) + 1; crossSlots++; }
  }

  const tierIn = (c: SampleCard): number => (band === 'all' || c.band === band ? 0 : 2 * (1 + FILL_ORDER[band].indexOf(c.band)));
  const tierX = (c: SampleCard): number => (band !== 'all' && nb.includes(c.band) ? 0 : c.band === band ? 8 : 10);
  const cost = (tier: number, c: SampleCard): number => tier * BIG + (KEY - 1 - (key.get(c.name) as number));
  const split = (kind: 'n' | 'l', quotas: Record<string, number>): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const [g, q] of Object.entries(quotas)) { const x = cross[`${kind}|${g}`] ?? 0; out[`in|${g}`] = q - x; if (x) out[`x|${g}`] = x; }
    return out;
  };
  const optionsFor = (c: SampleCard, groups: Array<{ group: string; superset: boolean }>, quotas: Record<string, number>) => groups.flatMap(({ group, superset }) => {
    const s = superset ? 1 : 0;
    const out = [{ group: `in|${group}`, cost: cost(tierIn(c) + s, c) }];
    if (quotas[`x|${group}`]) out.push({ group: `x|${group}`, cost: cost(tierX(c) + s, c) });
    return out;
  });

  const nq = split('n', plan.nonland);
  const nonland = selectSlots(pool.filter((c) => !c.land), nq, plan.curve, (c) => {
    const g = nonlandGroupOf(plan, c.colors);
    return g === null ? [] : optionsFor(c, [{ group: g, superset: false }], nq);
  }, (c) => bucketOf(c.mv));
  const lq = split('l', plan.lands);
  const lands = selectSlots(pool.filter((c) => c.land), lq, [sumOf(plan.lands)], (c) => optionsFor(c, landGroupsOf(plan, c.produces), lq), () => 0);

  const role = new Map<string, Role>();
  for (const { item: c, group } of [...nonland, ...lands]) {
    const inX = group.startsWith('x|');
    role.set(c.name, band === 'all' || c.band === band ? 'in' : inX && nb.includes(c.band) ? 'cross' : 'fill');
  }
  const cards = [...nonland, ...lands].map((x) => x.item);
  const errs = planErrors(cards, plan);
  if (errs.length || cards.length !== total) throw new Error(`sample: cube ${o.index} misses its plan (a bug): ${errs.join('; ')}`);
  return {
    cards, role, plan, main, crossAsked, crossSlots,
    eligible: pool.length, inBand: band === 'all' ? pool.length : pool.filter((c) => c.band === band).length, neighbours: pool.filter((c) => nb.includes(c.band)).length,
  };
}

// ---------------------------------------------------------------- the document

const pct = (n: number, d: number): string => `${((100 * n) / d).toFixed(1)}%`;

export function sampleDocument(res: SampleResult, o: SampleOptions & { count: number; censusSha: string; poolSha: string; themeNames: Record<string, string> }): string {
  const n = res.cards.length;
  const byRole = (r: Role): SampleCard[] => res.cards.filter((c) => res.role.get(c.name) === r).sort((a, b) => (a.name < b.name ? -1 : 1));
  const crossCards = byRole('cross'), fillCards = byRole('fill');
  const comp = BANDS.map((b) => `${b} ${res.cards.filter((c) => c.band === b).length}`).join(', ');
  const ai = o.allowAiFlagged ? 'AI:RemoveDeck:All cards allowed (--allow-ai-flagged)' : 'not AI:RemoveDeck:All';
  const made = [
    `Made by tools/cubelab.sh sample (tools/cubelab/sample.ts) for the library census (D445, Phase 0): band ${o.band}, structure ${o.structure}, seed ${o.seed}, cube ${o.index} of ${o.count}${res.main ? `, main colour ${res.main}` : ''}. rng.ts's rng(${o.seed}, 'census-sample/${o.band}/${o.structure}/${o.index}') gives every eligible card, in the pool's name order, one uniform 32-bit key, and the selection keeps the largest keys the plan allows; nothing about a card's quality is read. Deterministic: the same census, pool, flags and seed give the same bytes.`,
    `Population: cubes/library/census.tsv (sha256 ${o.censusSha}, its bands provisional) joined to cubes/library/library-pool.tsv (sha256 ${o.poolSha}). Eligible: ${res.eligible} cards (supported, not a basic land, ${ai}); the ${o.band === 'all' ? 'whole library' : `${o.band} band`} ${res.inBand}${o.band === 'all' ? '' : `, its neighbours (${NEIGHBOURS[o.band].join(', ')}) ${res.neighbours}`}.`,
    `Skeleton (${o.structure}): ${STRUCTURE_NOTES[o.structure]} The nonland curve is Omega's (3 / 24 / 32 / 34 / 30 / 17 / 11 / 7) scaled to ${sumOf(res.plan.nonland)} cards. Exactly: ${planText(res.plan)}.`,
    o.band === 'all'
      ? 'Bands: every band alike, no cross-band slice and no fill.'
      : `Cross-band slice: asked ${o.crossBand} of ${n} = ${res.crossAsked} slots, ${res.crossSlots} spread over the slot groups the neighbours have cards for; CROSS ${crossCards.length} (${pct(crossCards.length, n)})${crossCards.length ? `: ${crossCards.map((c) => `${c.name} [${c.band}]`).join('; ')}` : ''}. FILL ${fillCards.length}, where the band could not fill a slot (from ${FILL_ORDER[o.band].join(', then ')})${fillCards.length ? `: ${fillCards.map((c) => `${c.name} [${c.band}]`).join('; ')}` : ''}.`,
    `By band: ${comp}.`,
  ];
  return cubeDocument({
    title: `Census sample — ${o.band}, ${o.structure}, seed ${o.seed}, cube ${o.index}, version 1 (180 cards, two-player)`,
    made, cards: res.cards, themeNames: o.themeNames, goldNote: GOLD_NOTE[o.structure], madeBy: '`tools/cubelab.sh sample`',
    notes: ['A census cube, not a designed one: a uniform draw within its band and structure, for measuring cards in that context (the census programme, D445). It drafts on Forge\'s ranks unless a ratings file is given.'],
  });
}

// ---------------------------------------------------------------- the command

const sha12 = (s: string): string => createHash('sha256').update(s).digest('hex').slice(0, 12);

export function sampleCommand(repo: string, f: Map<string, string[]>, say: (s: string) => void): number {
  const one = (k: string): string | undefined => f.get(k)?.at(-1);
  const band = one('band') as SampleBand | undefined;
  const structure = one('structure') as Structure | undefined;
  if (!band || !SAMPLE_BANDS.includes(band)) throw new Error(`sample: --band wants one of ${SAMPLE_BANDS.join(', ')}`);
  if (!structure || !STRUCTURES.includes(structure)) throw new Error(`sample: --structure wants one of ${STRUCTURES.join(', ')}`);
  const seed = Number(one('seed'));
  const count = Number(one('count'));
  if (!Number.isInteger(seed) || seed < 0 || !Number.isInteger(count) || count < 1) throw new Error('sample: --seed wants a whole number and --count a positive one');
  const crossBand = one('cross-band') === undefined ? (band === 'all' ? 0 : DEFAULT_CROSS_BAND) : Number(one('cross-band'));
  if (!(crossBand >= 0 && crossBand <= 0.5)) throw new Error('sample: --cross-band wants a share from 0 to 0.5');
  if (band === 'all' && crossBand > 0) throw new Error('sample: --band all has no cross-band slice (leave --cross-band out)');
  const outArg = one('out');
  if (!outArg) throw new Error('sample: --out <dir> is required');
  const out = path.resolve(repo, outArg);
  const censusText = fs.readFileSync(path.resolve(repo, one('census') ?? 'cubes/library/census.tsv'), 'utf8');
  const poolText = fs.readFileSync(path.resolve(repo, one('pool') ?? 'cubes/library/library-pool.tsv'), 'utf8');
  const recorded = recordedInputs(censusText).get('library-pool.tsv');
  if (recorded !== sha12(poolText)) throw new Error(`sample: census.tsv was built from another library-pool.tsv (sha256 ${recorded ?? '?'}, this one ${sha12(poolText)}); run tools/cubelab.sh census build`);
  const lib = joinCensus(parseLibraryPool(poolText), parseCensus(censusText));
  const themeNames = parseCube(fs.readFileSync(path.join(repo, 'cubes/omega-cube-180.md'), 'utf8')).themeNames;
  const allowAiFlagged = f.has('allow-ai-flagged');
  fs.mkdirSync(out, { recursive: true });
  const rows: string[] = [];
  for (let i = 1; i <= count; i++) {
    const o: SampleOptions = { band, structure, seed, index: i, crossBand, allowAiFlagged };
    const res = sampleCube(lib, o);
    const text = sampleDocument(res, { ...o, count, censusSha: sha12(censusText), poolSha: sha12(poolText), themeNames });
    const cube = parseCube(text);
    if (cube.warnings.length || cube.cards.length !== res.cards.length) throw new Error(`sample: cube ${i} does not read back (a bug): ${cube.warnings.join('; ')}`);
    const file = `${band}-${structure}-${seed}-${String(i).padStart(3, '0')}.md`;
    fs.writeFileSync(path.join(out, file), text);
    const n = (r: Role): number => res.cards.filter((c) => res.role.get(c.name) === r).length;
    rows.push([file, band, structure, String(seed), String(i), res.main ?? '', String(res.cards.length), String(n('in')), String(n('cross')), String(n('fill')),
      String(res.cards.filter((c) => c.aiFlag === 'All').length), sha12(text)].join('\t'));
  }
  const manifest = `${band}-${structure}-${seed}.tsv`;
  fs.writeFileSync(path.join(out, manifest), `# tools/cubelab.sh sample --band ${band} --structure ${structure} --seed ${seed} --count ${count} --cross-band ${crossBand}${allowAiFlagged ? ' --allow-ai-flagged' : ''} (D445); census.tsv sha256 ${sha12(censusText)}\n`
    + `${['file', 'band', 'structure', 'seed', 'cube', 'main', 'cards', 'in_band', 'cross', 'fill', 'ai_flagged', 'sha256'].join('\t')}\n${rows.join('\n')}\n`);
  const tot = (col: number): number => rows.reduce((a, l) => a + Number(l.split('\t')[col]), 0);
  say(`sample: ${count} cube(s) of ${band} x ${structure}, seed ${seed}, into ${path.relative(repo, out) || '.'}: in-band ${pct(tot(7), tot(6))}, cross ${pct(tot(8), tot(6))} (asked ${crossBand}), fill ${pct(tot(9), tot(6))}; ${manifest} lists them`);
  return 0;
}
