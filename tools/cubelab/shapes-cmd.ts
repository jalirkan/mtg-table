// mtg-table — the cube lab: `tools/cubelab.sh shapes`, the shape measures over many run folders by census band (D446 point 7).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   tools/cubelab.sh shapes <run-dir>... --out <dir> [--census cubes/library/census.tsv] [--boot 1000] [--boot-seed 1]
//       [--min-pair-games 30] [--viable 0.5] [--dominant 0.55] [--not-viable 0.45]
//
// Each run folder's cube is read from its run.json; a census sample (sample.ts, D445) names its band and structure
// in its first line and its CROSS and FILL cards in its header.  The folders are grouped by band (a cube that is not
// a census sample is the group `all`), each group's drafts pooled as one population, and for each group:
//
//   - the shape measures (shape-measures.ts), with a draft-clustered bootstrap over (folder, seed);
//   - the by-shape LABELS from each shape's interval: VIABLE iff it contains --viable, DOMINANT iff it lies wholly
//     above --dominant, NOT VIABLE iff wholly below --not-viable (J140's rule; labels only, they decide nothing);
//   - reported, deciding nothing: the BAND OFFSETS from the cross-band slice (the pooled win rate of the played
//     nonland CROSS cards of each other band minus that of the in-band cards; FILL cards are in neither; a deck-game
//     is the unit, the interval draft-clustered), and the ROUGH PER-CARD RATINGS within band.
//
// Writes <out>/shapes.json (numbers only, flat-readable), <out>/shapes.md and <out>/ratings-rough.tsv.  No engine.

import fs from 'node:fs';
import path from 'node:path';

import { assertNumbersOnly, readPopulation, type DraftUnit, type Population } from './compare.ts';
import { parseCensus } from './census.ts';
import { wilson } from './report.ts';
import { rng } from './rng.ts';
import { LABELS, labelKey, shapeJson, shapeLabels, shapeTable, shapeTableMd, type ShapeInterval } from './shape-measures.ts';
import { SHAPE_RULES } from './shapes.ts';
import { SHRINK_K } from './meta.ts';

const BANDS = ['pauper', 'peasant', 'legacy', 'powered'] as const;

export interface CubeOrigin { band: string; structure: string; cross: Map<string, string>; fill: Map<string, string> }

/** A census sample's band, structure and CROSS / FILL cards from its header (null: not a census sample). */
export function cubeOrigin(text: string): CubeOrigin | null {
  const first = text.split('\n', 1)[0] ?? '';
  const m = /^# Census sample — ([a-z]+), ([a-z-]+), seed/.exec(first);
  if (!m) return null;
  const head = text.slice(0, 20000);
  const items = (seg: string): Map<string, string> => {
    const out = new Map<string, string>();
    for (const x of seg.matchAll(/(?:^|; |: )([^;[\]]+?) \[(pauper|peasant|legacy|powered)\]/g)) out.set((x[1] as string).trim(), x[2] as string);
    return out;
  };
  const cross = /CROSS \d+ \([^)]*\)(?::\s*(.*?))?\. FILL \d+/s.exec(head);
  const fill = /FILL \d+, where[^\n]*?\)(?::\s*(.*?))?\.\*/s.exec(head);
  return { band: m[1] as string, structure: m[2] as string, cross: items(cross?.[1] ?? ''), fill: items(fill?.[1] ?? '') };
}

interface GroupDeck { names: string[]; land: boolean[]; wins: number; decisive: number }
interface Group { name: string; folders: string[]; structures: Map<string, number>; drafts: DraftUnit[]; decks: GroupDeck[][]; origins: Array<CubeOrigin | null>; engineErrors: number; exploreDropped: number }

export interface ShapesOptions { minPairGames: number; boot: number; bootSeed: number; viable: number; dominant: number; notViable: number }
export const SHAPES_DEFAULTS: ShapesOptions = { minPairGames: 30, boot: 1000, bootSeed: 1, viable: 0.5, dominant: 0.55, notViable: 0.45 };

/** Each run folder's population, grouped by its cube's census band. */
export function groupRuns(repo: string, dirs: string[]): Group[] {
  const groups = new Map<string, Group>();
  for (const dir of dirs) {
    const pop: Population = readPopulation(path.basename(dir), dir);
    const cubeFile = path.resolve(repo, pop.run.cubeFile);
    const origin = fs.existsSync(cubeFile) ? cubeOrigin(fs.readFileSync(cubeFile, 'utf8')) : null;
    const name = origin?.band ?? 'all';
    const g: Group = groups.get(name) ?? { name, folders: [], structures: new Map(), drafts: [], decks: [], origins: [], engineErrors: 0, exploreDropped: 0 };
    g.folders.push(dir);
    const st = origin?.structure ?? 'other';
    g.structures.set(st, (g.structures.get(st) ?? 0) + 1);
    g.engineErrors += pop.engineErrors;
    g.exploreDropped += pop.exploreDropped;
    for (const d of [...pop.drafts.values()].sort((a, b) => a.seed - b.seed)) {
      g.drafts.push(d);
      g.decks.push(d.decks.map((k) => ({ names: k.cards.map((i) => pop.names[i] as string), land: k.cards.map((i) => !!pop.land[i]), wins: k.wins, decisive: k.decisive })));
      g.origins.push(origin);
    }
    groups.set(name, g);
  }
  const order = (n: string): number => { const i = (BANDS as readonly string[]).indexOf(n); return i < 0 ? 99 : i; };
  return [...groups.values()].sort((a, b) => order(a.name) - order(b.name) || (a.name < b.name ? -1 : 1));
}

/** The class of a played card in a band's cube: `in`, a CROSS card's band, or `fill`. */
const classOf = (o: CubeOrigin | null, name: string): string => (o?.cross.get(name) ?? (o?.fill.has(name) ? 'fill' : 'in'));

/** Band offsets: each other band's CROSS cards' pooled win rate minus the in-band cards', draft-clustered. */
export function bandOffsets(g: Group, o: Pick<ShapesOptions, 'boot' | 'bootSeed'>): Record<string, ShapeInterval & { cards: number }> {
  const per: Array<Map<string, [number, number]>> = g.decks.map((decks, i) => {
    const m = new Map<string, [number, number]>();
    for (const d of decks) d.names.forEach((n, j) => {
      if (d.land[j] || d.decisive === 0) return;
      const c = classOf(g.origins[i] ?? null, n);
      const t = m.get(c) ?? [0, 0];
      t[0] += d.wins; t[1] += d.decisive;
      m.set(c, t);
    });
    return m;
  });
  const cardsOf = new Map<string, Set<string>>();
  g.decks.forEach((decks, i) => { for (const d of decks) d.names.forEach((n, j) => { if (!d.land[j] && d.decisive > 0) { const c = classOf(g.origins[i] ?? null, n); (cardsOf.get(c) ?? cardsOf.set(c, new Set()).get(c) as Set<string>).add(n); } }); });
  const offsets = (idx: number[]): Record<string, number> => {
    const t = new Map<string, [number, number]>();
    for (const i of idx) for (const [c, [w, n]] of per[i] as Map<string, [number, number]>) { const x = t.get(c) ?? [0, 0]; x[0] += w; x[1] += n; t.set(c, x); }
    const inb = t.get('in');
    const out: Record<string, number> = {};
    if (!inb || inb[1] === 0) return out;
    for (const [c, [w, n]] of t) if (c !== 'in' && c !== 'fill' && n > 0) out[c] = w / n - inb[0] / inb[1];
    return out;
  };
  const all = g.decks.map((_, i) => i);
  const est = offsets(all);
  const r = rng(o.bootSeed, 'shapes:offsets');
  const reps = Array.from({ length: o.boot }, () => offsets(all.map(() => r.int(all.length))));
  const out: Record<string, ShapeInterval & { cards: number }> = {};
  for (const c of Object.keys(est).sort()) {
    const ok = reps.map((x) => x[c]).filter((x): x is number => x !== undefined).sort((a, b) => a - b);
    const q = (p: number): number => { const pos = (ok.length - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos); return (ok[lo] as number) + ((ok[hi] as number) - (ok[lo] as number)) * (pos - lo); };
    const n = all.reduce((t, i) => t + ((per[i] as Map<string, [number, number]>).get(c)?.[1] ?? 0), 0);
    out[c] = { est: est[c] as number, valid: ok.length, n, cards: cardsOf.get(c)?.size ?? 0, ...(ok.length >= 2 ? { lo: q(0.025), hi: q(0.975) } : {}) };
  }
  return out;
}

export interface RoughRow { group: string; name: string; band: string; slot: string; land: boolean; decks: number; games: number; wins: number; rate: number | null; lo: number | null; hi: number | null; shrunk: number }

/** Every played card's games within its group (meta.json's counting: a card's decks' decisive games), shrunk 20 games toward the group's nonland mean. */
export function roughRatings(g: Group, bandOf: Map<string, string>): RoughRow[] {
  const acc = new Map<string, { decks: number; games: number; wins: number; land: boolean; slot: string }>();
  g.decks.forEach((decks, i) => {
    for (const d of decks) d.names.forEach((n, j) => {
      const a = acc.get(n) ?? { decks: 0, games: 0, wins: 0, land: !!d.land[j], slot: classOf(g.origins[i] ?? null, n) };
      a.decks++; a.games += d.decisive; a.wins += d.wins;
      acc.set(n, a);
    });
  });
  let tw = 0, tg = 0;
  for (const a of acc.values()) if (!a.land) { tw += a.wins; tg += a.games; }
  const m = tg ? tw / tg : 0.5;
  return [...acc.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([name, a]) => {
    const w = wilson(a.wins, a.games);
    return { group: g.name, name, band: bandOf.get(name) ?? '', slot: a.slot === 'in' || a.slot === 'fill' ? a.slot : 'cross', land: a.land, decks: a.decks, games: a.games, wins: a.wins,
      rate: a.games ? a.wins / a.games : null, lo: w.lo, hi: w.hi, shrunk: (a.wins + SHRINK_K * m) / (a.games + SHRINK_K) };
  });
}

const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
const pct = (x: number | undefined | null): string => (x === undefined || x === null ? '-' : (x * 100).toFixed(1));

/** The land and colour rule each shape plays under, for the report (D446 point 3). */
export const LAND_RULE: Record<string, string> = {
  mono: `one colour, a splash of at most ${SHAPE_RULES.monoMaxSplash} one-pip cards; 16 lands, 17 when the spells average mana value ${SHAPE_RULES.monoSeventeenAt.toFixed(1)} or more`,
  'two-colour': 'today\'s builder: two colours, a splash of at most 3 one-pip cards; 16 lands when the spells average 2.5 or less, else 17 (18 or three colours only for a thin pool)',
  'three-colour': `exactly three colours, no splash; 17 lands with ${SHAPE_RULES.threeFixers}+ fixers for them in the pool, else 18`,
  'good-stuff': `three to five colours (the most its fixers support: ${SHAPE_RULES.goodFixersPerColour} per colour beyond two), no splash; ${SHAPE_RULES.goodLands} lands`,
  auto: 'today\'s builder (an unforced seat)',
};

export async function shapesCommand(repo: string, pos: string[], f: Map<string, string[]>, say: (s: string) => void): Promise<number> {
  const one = (k: string): string | undefined => f.get(k)?.at(-1);
  const num = (k: string, d: number): number => { const v = one(k); if (v === undefined) return d; const n = Number(v); if (!Number.isFinite(n)) throw new Error(`--${k} wants a number, got ${v}`); return n; };
  const out = one('out');
  if (!out) throw new Error('shapes needs --out <dir>');
  if (pos.length === 0) throw new Error('shapes needs one or more run folders');
  const o: ShapesOptions = {
    minPairGames: num('min-pair-games', SHAPES_DEFAULTS.minPairGames), boot: num('boot', SHAPES_DEFAULTS.boot), bootSeed: num('boot-seed', SHAPES_DEFAULTS.bootSeed),
    viable: num('viable', SHAPES_DEFAULTS.viable), dominant: num('dominant', SHAPES_DEFAULTS.dominant), notViable: num('not-viable', SHAPES_DEFAULTS.notViable),
  };
  if (o.boot < 100) throw new Error('shapes: --boot wants at least 100 replicates');
  const censusFile = path.resolve(repo, one('census') ?? 'cubes/library/census.tsv');
  const bandOf = new Map(parseCensus(fs.readFileSync(censusFile, 'utf8')).map((r) => [r.name, r.band as string]));
  const groups = groupRuns(repo, pos);
  const doc: Record<string, unknown> = {
    schema: 1, groups: groups.length, folders: pos.length, drafts: groups.reduce((t, g) => t + g.drafts.length, 0),
    thresholds: { viable: o.viable, dominant: o.dominant, not_viable: o.notViable }, boot: { replicates: o.boot, seed: o.bootSeed }, min_pair_games: o.minPairGames,
  };
  const groupDoc: Record<string, unknown> = {};
  const md: string[] = ['# Shapes per band (D446)', '',
    `${pos.length} run folder(s), grouped by the census band of each cube. 95% intervals: percentile, ${o.boot} draft-clustered bootstrap replicates (seed ${o.bootSeed}). `
    + `Labels from each shape's interval alone: VIABLE iff it contains ${o.viable}, DOMINANT iff it lies wholly above ${o.dominant}, NOT VIABLE iff wholly below ${o.notViable}. `
    + 'They are labels: they decide nothing.', ''];
  const tsv: string[] = ['# ratings-rough.tsv (D446): every played card\'s games within its band\'s cubes, REPORT ONLY -- J141 stratifies on these; its rule is written before they are read.',
    '# columns: group, card, its census band, its slot in the cube (in, cross, fill), land, decks, decisive games, wins, raw rate, Wilson 95% lo, hi, shrunk (wins + 20m)/(games + 20), m the group\'s nonland mean',
    'group\tname\tcensus_band\tslot\tland\tdecks\tgames\twins\trate\tlo\thi\tshrunk'];
  for (const g of groups) {
    const t = shapeTable(g.drafts, o);
    const offsets = bandOffsets(g, o);
    const rough = roughRatings(g, bandOf);
    const games = g.drafts.reduce((s, d) => s + d.games.length, 0);
    const label: Record<string, unknown> = {};
    md.push(`## ${g.name}`, '', `${g.folders.length} folder(s) (${[...g.structures.entries()].map(([k, v]) => `${k} ${v}`).join(', ')}), ${g.drafts.length} drafts, ${games} games; engine errors ${g.engineErrors}.`, '');
    md.push('| shape | match win rate | 95% interval | decisive matches | fallback rate | label | land and colour rule |', '|---|---|---|---|---|---|---|');
    for (const s of LABELS) {
      const k = labelKey(s);
      const iv = t[`label_${k}`];
      const lab = shapeLabels(iv, { ...o, minN: o.minPairGames });
      const fb = t[`fallback_${k}`];
      label[k] = { ...lab, n: iv?.n ?? 0, ...(iv?.est !== undefined ? { est: r6(iv.est) } : {}), ...(iv?.lo !== undefined ? { lo: r6(iv.lo), hi: r6(iv.hi as number) } : {}), ...(fb?.est !== undefined ? { fallback: r6(fb.est), seats: fb.n } : {}) };
      const words = lab.read ? [lab.viable ? 'VIABLE' : '', lab.dominant ? 'DOMINANT' : '', lab.not_viable ? 'NOT VIABLE' : ''].filter(Boolean).join(', ') || '(none)' : `(under ${o.minPairGames} decisive matches: no label)`;
      md.push(`| ${s} | ${pct(iv?.est)} | ${iv?.lo !== undefined ? `[${pct(iv.lo)}, ${pct(iv.hi)}]` : '-'} | ${iv?.n ?? 0} | ${s === 'auto' ? '-' : pct(fb?.est)} | ${s === 'auto' ? '(not labelled)' : words} | ${LAND_RULE[s]} |`);
    }
    md.push('', '### The shape measures', '', ...shapeTableMd(t, true), '');
    md.push('### Band offsets from the cross-band slice (reported; deciding nothing)', '', '| CROSS cards from | offset vs in-band, points | 95% interval | cards | deck-games |', '|---|---|---|---|---|');
    for (const [c, x] of Object.entries(offsets)) md.push(`| ${c} | ${pct(x.est)} | ${x.lo !== undefined ? `[${pct(x.lo)}, ${pct(x.hi)}]` : '-'} | ${x.cards} | ${x.n} |`);
    if (Object.keys(offsets).length === 0) md.push('| (none) | - | - | 0 | 0 |');
    md.push('', `Rough per-card ratings: ${rough.length} cards in ratings-rough.tsv (report only).`, '');
    for (const r of rough) {
      tsv.push([r.group, r.name, r.band, r.slot, r.land ? 1 : 0, r.decks, r.games, r.wins, r.rate === null ? '' : r.rate.toFixed(4), r.lo === null ? '' : r.lo.toFixed(4), r.hi === null ? '' : r.hi.toFixed(4), r.shrunk.toFixed(4)].join('\t'));
    }
    const off: Record<string, unknown> = {};
    for (const [c, x] of Object.entries(offsets)) off[c] = { valid: x.valid, n: x.n, cards: x.cards, ...(x.est !== undefined ? { est: r6(x.est) } : {}), ...(x.lo !== undefined ? { lo: r6(x.lo), hi: r6(x.hi as number) } : {}) };
    const st: Record<string, number> = {};
    for (const [k, v] of g.structures) st[labelKey(k)] = v;
    groupDoc[g.name] = {
      folders: g.folders.length, drafts: g.drafts.length, games, decisive: g.drafts.reduce((s, d) => s + d.games.filter((x) => !x.draw).length, 0),
      engine_errors: g.engineErrors, explore_dropped: g.exploreDropped, structures: st, shape: shapeJson(t), label, offset: off,
      rated_cards: rough.length, rated_cards_100: rough.filter((r) => r.games >= 100).length,
      median_card_games: rough.length ? [...rough.map((r) => r.games)].sort((a, b) => a - b)[Math.floor(rough.length / 2)] as number : 0,
    };
  }
  doc.group = groupDoc;
  assertNumbersOnly(doc, 'shapes.json');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'shapes.json'), `${JSON.stringify(doc, null, 1)}\n`);
  fs.writeFileSync(path.join(out, 'shapes.md'), `${md.join('\n')}\n`);
  fs.writeFileSync(path.join(out, 'ratings-rough.tsv'), `${tsv.join('\n')}\n`);
  for (const g of groups) say(`${g.name}: ${g.folders.length} folder(s), ${g.drafts.length} drafts`);
  say(`wrote ${path.join(out, 'shapes.json')}, shapes.md and ratings-rough.tsv`);
  return 0;
}
