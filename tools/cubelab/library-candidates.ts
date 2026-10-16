// mtg-table — the cube lab: the whole library as a seed pool, and candidate 180s drawn from it.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   tools/cubelab.sh library-candidates --fc <ForgeCoach checkout> [--out cubes/library] [--seed 180]
//                                       [--min-games 80] [--date YYYY-MM-DD]
//
// "The best 180 out of the whole library" (Justin, 2026-10-15): seed several candidate 180s by
// different ideas, play each on the same seeds, evolve each, and compare them on D441's
// pre-registered measures (`tools/cubelab.sh compare`).  This writes the candidates:
//
//   <out>/library-pool.tsv   THE LIBRARY: every card of every cube document ForgeCoach ships
//                            (public/cubes/*.md) plus its two proxy lists (docs/proxies/
//                            mtgo-vintage-cube-540.txt, old-school-93-94-360.txt), one row a card, in
//                            omega-seed-pool.tsv's columns (evolve's --pool reads it) plus five of its
//                            own: printed colours, what a land makes, and the lab's games, pooled
//                            shrunk win rate and cubes from ForgeCoach's metas.  Support and AI flags
//                            are the engine's own facts (CubeLab.java facts), so a card Forge 2.0.14
//                            lacks is listed, marked `no`, and never drawn.
//   <out>/hits-180.md        the greatest hits BY LAB RATING: among supported cards with at least
//                            --min-games lab games across the metas, the best games-weighted shrunk
//                            win rate under Omega's skeleton (below); no lab data, no slot.
//   <out>/random-180.md      the control: the same skeleton from every supported card, each card's
//                            key a seeded uniform draw (--seed, 180), so a legal, colour-balanced cube
//                            that nobody selected.  Cards Forge marks AI:RemoveDeck:All are drawn like
//                            any other (3 at --seed 180; the document lists them): leaving them out
//                            would make the control a selected cube.
//   <out>/synergy-v2-180.md  ForgeCoach's current Synergy Cube (version 2), copied with a provenance
//                            line under its title and nothing else changed.
//
// OMEGA'S SKELETON (cubes/omega-cube-180.md's header and list): 24 mono-coloured nonland cards a
// colour, 2 gold cards a colour pair (no card of three or more colours), 18 colourless nonland
// cards, and 22 lands: 2 a colour pair that make exactly that pair (Omega's original dual and
// fetchland) and 2 others (Omega's Mishra's Factory and Mutavault); the 158 nonland cards on
// Omega's curve, 3 / 24 / 32 / 34 / 30 / 17 / 11 / 7 at mana value 0 .. 6 and 7+.  Colours are the
// printed ones from the engine (as evolve's colour constraint counts them), basic lands never.
//
// THE SELECTION is one min-cost flow, so each candidate is the best choice its rule allows with the
// colour quotas AND the curve both exact: source -> colour class (its quota) -> one edge a card ->
// mana-value bucket (its count) -> sink, each card edge costing minus its key.  The lands are
// simpler: each pair's best two fixing lands by the same key, then the best two other lands.  The
// key is lexicographic and integer: the hits' pooled shrunk win rate (to 1e-4), then games; the
// random cube's a 32-bit draw from rng.ts.  Deterministic: the same inputs give the same files.
//
// Engine facts come through engine.ts (one JVM boot, cached under var/cubelab/facts/); everything
// else here is pure and is tested by web/test/cubelab-library.test.ts.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { producesOf, type Fact } from './cards.ts';
import { parseCube, type Cube } from './cube.ts';
import { engineEnv, engineFacts } from './engine.ts';
import { rng } from './rng.ts';

// ---------------------------------------------------------------- the sources

/** Every list the library is the union of: its label in `sources`, and its file under the ForgeCoach checkout. */
export const LIBRARY_SOURCES: ReadonlyArray<{ label: string; file: string }> = [
  { label: 'omega', file: 'public/cubes/omega-cube-180.md' },
  { label: 'synergy', file: 'public/cubes/synergy-cube-180.md' },
  { label: 'vintage180', file: 'public/cubes/vintage-cube-180.md' },
  { label: 'modern', file: 'public/cubes/modern-era-cube-180.md' },
  { label: 'fairfight', file: 'public/cubes/fair-fight-cube-180.md' },
  { label: 'pauper', file: 'public/cubes/pauper-cube-180.md' },
  { label: 'peasant', file: 'public/cubes/peasant-cube-180.md' },
  { label: 'evybaby', file: 'public/cubes/evybaby-cube-360.md' },
  { label: 'twobert', file: 'public/cubes/twobert-cube-180.md' },
  { label: 'mtgovc', file: 'docs/proxies/mtgo-vintage-cube-540.txt' },
  { label: 'oldschool', file: 'docs/proxies/old-school-93-94-360.txt' },
];

/** A proxy list: `1 Name` a line, `#` comments; a trailing `(SET)` is dropped. */
export function parseListTxt(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
    .map((l) => l.replace(/^\d+\s*x?\s+/, '').replace(/\s*\(.*$/, '').trim()).filter(Boolean);
}

/** The listed names of one source, in list order. */
export function sourceNames(file: string, text: string): string[] {
  return file.endsWith('.txt') ? parseListTxt(text) : parseCube(text).cards.map((c) => c.name);
}

// ---------------------------------------------------------------- the pool

export const POOL_COLUMNS = ['name', 'colour_identity', 'type', 'mana_value', 'theme_tags', 'sources', 'forge_supported', 'forge_ai_flag',
  'colors', 'produces', 'lab_games', 'lab_wr_shrunk', 'lab_cubes'] as const;

export interface LibraryCard {
  name: string;
  /** Every spelling a source listed it by. */
  listed: string[];
  identity: string;
  type: string;
  mv: number;
  tags: string[];
  sources: string[];
  supported: boolean;
  aiFlag: 'All' | 'Random' | 'none';
  /** Printed colours, WUBRG; '' for a land or a colourless card. */
  colors: string;
  produces: string;
  land: boolean;
  basic: boolean;
  /** Lab games across the metas, their games-weighted shrunk win rate (null with no games), the metas with games. */
  labGames: number;
  labWr: number | null;
  labCubes: string[];
}

const WUBRG = 'WUBRG';
export const wubrg = (s: string): string => [...new Set(s)].filter((c) => WUBRG.includes(c)).sort((a, b) => WUBRG.indexOf(a) - WUBRG.indexOf(b)).join('');
const SUPERTYPES = new Set(['Legendary', 'Basic', 'Snow', 'World', 'Ongoing', 'Host', 'Elite']);

/** Forge's type line (`Legendary Creature - Human Wizard`) cut to its card types (`Creature`), as omega-seed-pool.tsv writes them. */
export function cardTypes(type: string): string {
  const head = (type.split(/\s+[-—]\s+/)[0] ?? '').trim();
  return head.split(/\s+/).filter((w) => w && !SUPERTYPES.has(w)).join(' ');
}

/** One meta.json's card rows: name -> { games, winRateShrunk }. */
export type MetaCards = Record<string, { games?: number; winRateShrunk?: number }>;

/**
 * The library: the sources' union keyed by the engine's name (two spellings of one card are one
 * row), the engine's facts, the tags (omega-seed-pool.tsv's first, then Synergy's own) and the
 * lab's numbers pooled over the metas, each meta's card matched by any spelling of it.
 */
export function buildLibrary(sources: Array<{ label: string; names: string[] }>, facts: Fact[],
  tagsOf: (names: string[]) => string[], metas: Array<{ label: string; cards: MetaCards }>): { cards: LibraryCard[]; unmatchedMeta: string[] } {
  const factOf = new Map(facts.map((f) => [f.listed, f]));
  const byKey = new Map<string, LibraryCard>();
  const keyOfListed = new Map<string, string>();
  for (const s of sources) {
    for (const n of s.names) {
      const f = factOf.get(n);
      const key = f?.found && f.name ? f.name : n;
      keyOfListed.set(n, key);
      let c = byKey.get(key);
      if (!c) {
        const land = !!f?.found && !!f.land;
        c = {
          name: key, listed: [], identity: f?.found ? wubrg(f.identity ?? '') : '', type: f?.found ? cardTypes(f.type ?? '') : '',
          mv: f?.found && !land ? (f.cmc ?? 0) : 0, tags: [], sources: [], supported: !!f?.found && !f.unsupported,
          aiFlag: f?.remAIDeck ? 'All' : f?.remRandomDeck ? 'Random' : 'none', colors: f?.found && !land ? wubrg(f.colors ?? '') : '',
          produces: f?.found ? producesOf(f) : '', land, basic: !!f?.basicLand, labGames: 0, labWr: null, labCubes: [],
        };
        byKey.set(key, c);
      }
      if (!c.listed.includes(n)) c.listed.push(n);
      if (!c.sources.includes(s.label)) c.sources.push(s.label);
    }
  }
  const unmatchedMeta: string[] = [];
  const sums = new Map<string, number>();
  for (const m of metas) {
    for (const [n, row] of Object.entries(m.cards)) {
      const key = keyOfListed.get(n) ?? (byKey.has(n) ? n : undefined);
      if (!key) { unmatchedMeta.push(`${m.label}: ${n}`); continue; }
      const g = row.games ?? 0;
      if (!(g > 0) || typeof row.winRateShrunk !== 'number') continue;
      const c = byKey.get(key) as LibraryCard;
      c.labGames += g;
      sums.set(key, (sums.get(key) ?? 0) + g * row.winRateShrunk);
      if (!c.labCubes.includes(m.label)) c.labCubes.push(m.label);
    }
  }
  const cards = [...byKey.values()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const c of cards) {
    if (c.labGames > 0) c.labWr = (sums.get(c.name) as number) / c.labGames;
    c.tags = tagsOf([c.name, ...c.listed]);
  }
  return { cards, unmatchedMeta };
}

export function poolTsv(cards: LibraryCard[], comments: string[]): string {
  const rows = cards.map((c) => [c.name, c.identity, c.type, String(c.mv), c.tags.join(' '), c.sources.join(' '), c.supported ? 'yes' : 'no',
    c.aiFlag, c.colors, c.produces, String(c.labGames), c.labWr === null ? '' : c.labWr.toFixed(4), c.labCubes.join(' ')].join('\t'));
  return `${comments.map((l) => `# ${l}`.trimEnd()).join('\n')}\n${POOL_COLUMNS.join('\t')}\n${rows.join('\n')}\n`;
}

/** library-pool.tsv back into cards (what the test reads; every column above). */
export function parseLibraryPool(text: string): LibraryCard[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
  const head = (lines.shift() ?? '').split('\t');
  const at = (n: string): number => {
    const i = head.indexOf(n);
    if (i < 0) throw new Error(`library pool: no ${n} column`);
    return i;
  };
  const ix = Object.fromEntries(POOL_COLUMNS.map((c) => [c, at(c)])) as Record<(typeof POOL_COLUMNS)[number], number>;
  return lines.map((l) => {
    const f = l.split('\t');
    const g = (k: (typeof POOL_COLUMNS)[number]): string => f[ix[k]] ?? '';
    const type = g('type');
    const ai = g('forge_ai_flag');
    return {
      name: g('name'), listed: [g('name')], identity: g('colour_identity'), type, mv: Number(g('mana_value')) || 0,
      tags: g('theme_tags').split(/\s+/).filter(Boolean), sources: g('sources').split(/\s+/).filter(Boolean), supported: g('forge_supported') === 'yes',
      aiFlag: ai === 'All' || ai === 'Random' ? ai : 'none', colors: g('colors'), produces: g('produces'),
      land: /\bLand\b/.test(type), basic: false, labGames: Number(g('lab_games')) || 0, labWr: g('lab_wr_shrunk') === '' ? null : Number(g('lab_wr_shrunk')),
      labCubes: g('lab_cubes').split(/\s+/).filter(Boolean),
    } satisfies LibraryCard;
  });
}

// ---------------------------------------------------------------- Omega's skeleton

export const MONO = ['W', 'U', 'B', 'R', 'G'] as const;
export const PAIRS = ['WU', 'WB', 'WR', 'WG', 'UB', 'UR', 'UG', 'BR', 'BG', 'RG'] as const;
export const SECTION_OF: Record<string, string> = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' };
export const GUILD_OF: Record<string, string> = {
  WU: 'Azorius', UB: 'Dimir', BR: 'Rakdos', RG: 'Gruul', WG: 'Selesnya', WB: 'Orzhov', UR: 'Izzet', BG: 'Golgari', WR: 'Boros', UG: 'Simic',
};

export interface Skeleton {
  /** Nonland cards a colour class: 'W'..'G', each pair, and '' (colourless). */
  classes: Record<string, number>;
  /** Nonland cards a mana-value bucket, 0 .. 6 and 7 (7+). */
  curve: number[];
  /** Lands a pair makes, exactly that pair. */
  fixersPerPair: number;
  otherLands: number;
}

export const OMEGA_SKELETON: Skeleton = {
  classes: { W: 24, U: 24, B: 24, R: 24, G: 24, ...Object.fromEntries(PAIRS.map((p) => [p, 2])), '': 18 },
  curve: [3, 24, 32, 34, 30, 17, 11, 7],
  fixersPerPair: 2,
  otherLands: 2,
};

export const bucketOf = (mv: number): number => Math.min(7, Math.max(0, Math.floor(mv)));
/** The colour class a nonland card fills, or null for one of three or more colours. */
export const classOf = (colors: string): string | null => (colors.length <= 2 ? colors : null);
/** The pair a land fixes, or null for an other land. */
export const fixesPair = (c: Pick<LibraryCard, 'produces'>): string | null => ((PAIRS as readonly string[]).includes(c.produces) ? c.produces : null);

/** What a list holds, in the skeleton's terms (the test's reading and the headers'). */
export function shapeOf(cards: Array<Pick<LibraryCard, 'colors' | 'mv' | 'land' | 'produces'>>): { classes: Record<string, number>; curve: number[]; fixers: Record<string, number>; otherLands: number; threePlus: number } {
  const classes: Record<string, number> = {};
  const curve = new Array(8).fill(0) as number[];
  const fixers: Record<string, number> = {};
  let otherLands = 0, threePlus = 0;
  for (const c of cards) {
    if (c.land) {
      const p = fixesPair(c);
      if (p) fixers[p] = (fixers[p] ?? 0) + 1; else otherLands++;
      continue;
    }
    const k = classOf(c.colors);
    if (k === null) { threePlus++; continue; }
    classes[k] = (classes[k] ?? 0) + 1;
    curve[bucketOf(c.mv)] = (curve[bucketOf(c.mv)] as number) + 1;
  }
  return { classes, curve, fixers, otherLands, threePlus };
}

/** Every way a list misses the skeleton (empty: it fits exactly). */
export function skeletonErrors(cards: Array<Pick<LibraryCard, 'colors' | 'mv' | 'land' | 'produces'>>, sk: Skeleton = OMEGA_SKELETON): string[] {
  const s = shapeOf(cards);
  const out: string[] = [];
  for (const [k, n] of Object.entries(sk.classes)) if ((s.classes[k] ?? 0) !== n) out.push(`class ${k || 'colourless'}: ${s.classes[k] ?? 0}, want ${n}`);
  for (const k of Object.keys(s.classes)) if (!(k in sk.classes)) out.push(`class ${k}: not in the skeleton`);
  sk.curve.forEach((n, b) => { if (s.curve[b] !== n) out.push(`mana value ${b}${b === 7 ? '+' : ''}: ${s.curve[b]}, want ${n}`); });
  for (const p of PAIRS) if ((s.fixers[p] ?? 0) !== sk.fixersPerPair) out.push(`${p} fixing lands: ${s.fixers[p] ?? 0}, want ${sk.fixersPerPair}`);
  if (s.otherLands !== sk.otherLands) out.push(`other lands: ${s.otherLands}, want ${sk.otherLands}`);
  if (s.threePlus) out.push(`${s.threePlus} card(s) of three or more colours`);
  return out;
}

// ---------------------------------------------------------------- the selection

/**
 * The nonland cards that fill `classes` and `curve` exactly with the largest total key: a min-cost
 * flow (successive shortest paths, Bellman-Ford on the residual graph; the graph is 26 nodes and an
 * edge a card, so it is instant).  `key` is an integer, larger better; ties go to the earlier card.
 */
export function selectNonland<T extends Pick<LibraryCard, 'colors' | 'mv'>>(cards: T[], key: (c: T) => number, sk: Skeleton = OMEGA_SKELETON): T[] {
  const classNames = Object.keys(sk.classes);
  const S = 0, T0 = 1 + classNames.length + sk.curve.length;
  const N = T0 + 1;
  const to: number[] = [], cap: number[] = [], cost: number[] = [], card: number[] = [];
  const adj: number[][] = Array.from({ length: N }, () => []);
  const edge = (u: number, v: number, c: number, w: number, ci = -1): void => {
    adj[u]!.push(to.length); to.push(v); cap.push(c); cost.push(w); card.push(ci);
    adj[v]!.push(to.length); to.push(u); cap.push(0); cost.push(-w); card.push(-1);
  };
  classNames.forEach((k, i) => edge(S, 1 + i, sk.classes[k] as number, 0));
  sk.curve.forEach((n, b) => edge(1 + classNames.length + b, T0, n, 0));
  cards.forEach((c, ci) => {
    const k = classOf(c.colors);
    const i = k === null ? -1 : classNames.indexOf(k);
    if (i >= 0) edge(1 + i, 1 + classNames.length + bucketOf(c.mv), 1, -key(c), ci);
  });
  const want = sk.curve.reduce((a, b) => a + b, 0);
  let flow = 0;
  while (flow < want) {
    const dist = new Array(N).fill(Infinity) as number[];
    const via = new Array(N).fill(-1) as number[];
    dist[S] = 0;
    for (let round = 0; round < N; round++) {
      let moved = false;
      for (let u = 0; u < N; u++) {
        if (dist[u] === Infinity) continue;
        for (const e of adj[u]!) {
          if (cap[e]! <= 0) continue;
          const d = dist[u]! + cost[e]!;
          if (d < dist[to[e]!]!) { dist[to[e]!] = d; via[to[e]!] = e; moved = true; }
        }
      }
      if (!moved) break;
    }
    if (dist[T0] === Infinity) throw new Error(`selectNonland: the skeleton cannot be filled from these cards (${flow} of ${want} placed)`);
    for (let v = T0; v !== S; v = to[via[v]! ^ 1]!) { cap[via[v]!]!--; cap[via[v]! ^ 1]!++; }
    flow++;
  }
  const out: T[] = [];
  for (let e = 0; e < to.length; e += 2) if (card[e]! >= 0 && cap[e] === 0) out.push(cards[card[e]!] as T);
  return out;
}

/** Each pair's best `fixersPerPair` fixing lands, then the best `otherLands` others, by `key`. */
export function selectLands<T extends Pick<LibraryCard, 'produces' | 'name'>>(lands: T[], key: (c: T) => number, sk: Skeleton = OMEGA_SKELETON): T[] {
  const order = [...lands].sort((a, b) => key(b) - key(a) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const out: T[] = [];
  for (const p of PAIRS) {
    const got = order.filter((c) => fixesPair(c) === p).slice(0, sk.fixersPerPair);
    if (got.length < sk.fixersPerPair) throw new Error(`selectLands: ${got.length} fixing land(s) for ${p}, the skeleton wants ${sk.fixersPerPair}`);
    out.push(...got);
  }
  const others = order.filter((c) => fixesPair(c) === null).slice(0, sk.otherLands);
  if (others.length < sk.otherLands) throw new Error(`selectLands: ${others.length} other land(s), the skeleton wants ${sk.otherLands}`);
  return [...out, ...others];
}

/** Drawable at all: the engine has it and supports it, and it is not a basic land. */
export const drawable = (c: LibraryCard): boolean => c.supported && !c.basic && !(c.land && /\bBasic\b/.test(c.type));

/**
 * The hits' key: the pooled shrunk win rate to four decimals (as library-pool.tsv writes it, so the
 * committed pool reproduces the cube), then games (which stay under 1e7).
 */
export const hitsKey = (c: LibraryCard): number => Math.round((c.labWr ?? 0) * 1e4) * 1e7 + Math.min(c.labGames, 1e7 - 1);

export function selectHits(lib: LibraryCard[], minGames: number, sk: Skeleton = OMEGA_SKELETON): LibraryCard[] {
  const ok = lib.filter((c) => drawable(c) && c.labGames >= minGames && c.labWr !== null);
  return [...selectLands(ok.filter((c) => c.land), hitsKey, sk), ...selectNonland(ok.filter((c) => !c.land), hitsKey, sk)];
}

export function selectRandom(lib: LibraryCard[], seed: number, sk: Skeleton = OMEGA_SKELETON): LibraryCard[] {
  const ok = lib.filter(drawable);
  const r = rng(seed, 'library-random-180');
  const keys = new Map(ok.map((c) => [c.name, Math.floor(r.next() * 4294967296)]));
  const key = (c: LibraryCard): number => keys.get(c.name) as number;
  return [...selectLands(ok.filter((c) => c.land), key, sk), ...selectNonland(ok.filter((c) => !c.land), key, sk)];
}

// ---------------------------------------------------------------- the documents

const item = (c: LibraryCard): string => (c.tags.length ? `${c.name} — ${c.tags.join(' ')}` : c.name);
const byCurve = (a: LibraryCard, b: LibraryCard): number => a.mv - b.mv || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

/** A cube document in the lab's format (cube.ts), Omega's sections, theme table and format-counts table. */
export function cubeDocument(o: { title: string; made: string[]; cards: LibraryCard[]; themeNames: Record<string, string>; notes: string[] }): string {
  const shape = shapeOf(o.cards);
  const nonland = o.cards.filter((c) => !c.land);
  const sections: Array<[string, string[]]> = [];
  for (const k of MONO) sections.push([SECTION_OF[k] as string, [nonland.filter((c) => c.colors === k).sort(byCurve).map(item).join(' · ')]]);
  sections.push(['Gold', PAIRS.map((p) => `${p}: ${nonland.filter((c) => c.colors === p).sort(byCurve).map(item).join(' · ')}`)]);
  sections.push(['Colorless', [nonland.filter((c) => c.colors === '').sort(byCurve).map(item).join(' · ')]]);
  const lands = o.cards.filter((c) => c.land);
  const landLines = PAIRS.map((p) => `${GUILD_OF[p]} lands: ${lands.filter((c) => fixesPair(c) === p).sort(byCurve).map(item).join(' · ')}`);
  landLines.push(`Other lands: ${lands.filter((c) => fixesPair(c) === null).sort(byCurve).map(item).join(' · ')}`);
  sections.push(['Lands', landLines]);
  const count = (name: string): number => (name === 'Lands' ? lands.length : name === 'Gold' ? nonland.filter((c) => c.colors.length === 2).length
    : name === 'Colorless' ? nonland.filter((c) => c.colors === '').length : nonland.filter((c) => c.colors === Object.keys(SECTION_OF).find((k) => SECTION_OF[k] === name)).length);
  const creatures = nonland.filter((c) => /\bCreature\b/.test(c.type)).length;
  const walkers = nonland.filter((c) => /\bPlaneswalker\b/.test(c.type)).length;
  const ai = o.cards.filter((c) => c.aiFlag === 'All').map((c) => c.name);
  const L: string[] = [`# ${o.title}`, '', ...o.made.map((l) => `*${l}*`).flatMap((l) => [l, '']), '## Format counts', '', '| Section | Cards |', '|---|---|'];
  for (const [name] of sections) L.push(`| ${name}${name === 'Gold' ? ' (2 per colour pair)' : ''} | ${count(name)} |`);
  L.push(`| **Total** | **${o.cards.length}** |`, '');
  L.push(`${creatures} creatures, ${walkers} planeswalkers. Nonland mana-value curve: ${shape.curve.map((n, b) => `${n} at ${b}${b === 7 ? '+' : ''}`).join(', ')}.`, '');
  L.push(`Forge marks ${ai.length} of these AI:RemoveDeck:All (its AI plays them poorly or not at all)${ai.length ? `: ${ai.join(', ')}` : ''}.`, '');
  for (const n of o.notes) L.push(n, '');
  L.push('## The themes', '', 'Tags are omega-seed-pool.tsv\'s where it has the card, else the Synergy Cube\'s, else none; a card with no tag is listed bare.', '',
    '| Code | Theme |', '|---|---|');
  for (const [k, v] of Object.entries(o.themeNames)) L.push(`| ${k} | ${v} |`);
  L.push('', '## The list (name — themes)', '');
  for (const [name, lines] of sections) L.push(`### ${name} (${count(name)})`, ...lines, '');
  L.push('## Iteration log', '', '- version 1: made by `tools/cubelab.sh library-candidates` (above).', '');
  return L.join('\n');
}

/** ForgeCoach's Synergy document with one provenance paragraph under its title; its list untouched. */
export function withProvenance(text: string, line: string): string {
  const lines = text.split('\n');
  const t = lines.findIndex((l) => /^#\s+/.test(l));
  lines.splice(t + 1, 0, '', `*${line}*`);
  return lines.join('\n');
}

// ---------------------------------------------------------------- the command

const sha256 = (s: string | Buffer): string => createHash('sha256').update(s).digest('hex');

export async function libraryCandidates(repo: string, f: Map<string, string[]>, say: (s: string) => void): Promise<number> {
  const one = (k: string): string | undefined => f.get(k)?.at(-1);
  const fc = one('fc');
  if (!fc) throw new Error('library-candidates needs --fc <a ForgeCoach checkout> (its public/cubes and docs/proxies are the library)');
  const out = path.resolve(repo, one('out') ?? 'cubes/library');
  const seed = Number(one('seed') ?? 180);
  const minGames = Number(one('min-games') ?? 80);
  const date = one('date') ?? new Date().toISOString().slice(0, 10);
  if (!Number.isInteger(seed) || !Number.isInteger(minGames) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('--seed and --min-games want whole numbers, --date YYYY-MM-DD');
  const git = (...a: string[]): string => (spawnSync('git', ['-C', fc, ...a], { encoding: 'utf8' }).stdout ?? '').trim();
  const fcHead = git('rev-parse', '--short=8', 'HEAD') || 'unknown';
  const fcDirty = git('status', '--porcelain', '--', 'public/cubes', 'docs/proxies') !== '';

  const extra = fs.readdirSync(path.join(fc, 'public/cubes')).filter((x) => x.endsWith('.md') && !LIBRARY_SOURCES.some((s) => s.file === `public/cubes/${x}`));
  if (extra.length) say(`NOTE: ForgeCoach ships cube(s) the library does not list: ${extra.join(', ')} (add them to LIBRARY_SOURCES to include them)`);
  const sources = LIBRARY_SOURCES.map((s) => {
    const text = fs.readFileSync(path.join(fc, s.file), 'utf8');
    return { ...s, names: sourceNames(s.file, text), sha: sha256(text).slice(0, 12) };
  });
  const listed = [...new Set(sources.flatMap((s) => s.names))].sort();
  say(`library: ${sources.map((s) => `${s.label} ${s.names.length}`).join(', ')}; ${listed.length} distinct names`);

  const facts = engineFacts(engineEnv(repo), listed, say);

  // Tags: Omega's seed pool first (the shared vocabulary), then the Synergy Cube's own.
  const omegaPool = fs.readFileSync(path.join(repo, 'cubes/omega-seed-pool.tsv'), 'utf8').split('\n');
  const head = (omegaPool[0] ?? '').split('\t');
  const tagMap = new Map<string, string[]>();
  for (const l of omegaPool.slice(1)) {
    const c = l.split('\t');
    const tags = (c[head.indexOf('theme_tags')] ?? '').split(/\s+/).filter(Boolean);
    if (c[0] && tags.length) tagMap.set(c[0], tags);
  }
  const synText = fs.readFileSync(path.join(fc, 'public/cubes/synergy-cube-180.md'), 'utf8');
  for (const c of parseCube(synText).cards) if (!tagMap.has(c.name) && (c.themes.length || c.roles.length)) tagMap.set(c.name, [...c.themes, ...c.roles]);
  const tagsOf = (names: string[]): string[] => names.map((n) => tagMap.get(n)).find(Boolean) ?? [];

  const metaFiles = fs.readdirSync(path.join(fc, 'public/cubes')).filter((x) => x.endsWith('.meta.json')).sort();
  const metas = metaFiles.map((x) => ({ label: x.replace(/\.meta\.json$/, ''), cards: (JSON.parse(fs.readFileSync(path.join(fc, 'public/cubes', x), 'utf8')) as { cards: MetaCards }).cards }));
  const { cards: lib, unmatchedMeta } = buildLibrary(sources, facts, tagsOf, metas);
  if (unmatchedMeta.length) say(`WARNING: ${unmatchedMeta.length} meta row(s) match no library card: ${unmatchedMeta.slice(0, 10).join('; ')}`);

  const supported = lib.filter((c) => c.supported);
  const draw = lib.filter(drawable);
  const withData = draw.filter((c) => c.labGames > 0);
  const eligible = draw.filter((c) => c.labGames >= minGames && c.labWr !== null);
  const counts = {
    cards: lib.length, supported: supported.length, unsupported: lib.length - supported.length, basics: supported.length - draw.length,
    withData: withData.length, under: withData.length - eligible.length, noData: draw.length - withData.length, eligible: eligible.length,
    threePlus: draw.filter((c) => !c.land && c.colors.length >= 3).length,
  };
  const prov = `ForgeCoach@${fcHead}${fcDirty ? ' (its public/cubes or docs/proxies had uncommitted changes)' : ''}`;
  const srcLine = sources.map((s) => `${s.label} = ${s.file} (${s.names.length}, sha256 ${s.sha})`).join('; ');
  const poolComments = [
    `mtg-table cubes/library/library-pool.tsv: the whole library as an evolve seed pool. Written ${date} by tools/cubelab.sh library-candidates`,
    `(tools/cubelab/library-candidates.ts) from ${prov}; do not edit by hand, run it again.`,
    `Sources (the union, one row a card by Forge's name): ${srcLine}.`,
    `${counts.cards} cards: ${counts.supported} in Forge 2.0.14 and supported, ${counts.unsupported} not (forge_supported = no: never drawn, never added by evolve).`,
    `colour_identity, type, mana_value, forge_supported, forge_ai_flag (All = AI:RemoveDeck:All, Random = AI:RemoveDeck:Random), colors (printed)`,
    `and produces (what a land makes or fetches, as the lab's producesOf reads it) are the engine's facts (CubeLab.java facts).`,
    `theme_tags: omega-seed-pool.tsv's where it lists the card, else the Synergy Cube v2's tags, else empty.`,
    `lab_games, lab_wr_shrunk, lab_cubes: the cube lab's metas in ForgeCoach's public/cubes (${metas.map((m) => m.label).join(', ')}):`,
    `games summed over every meta that played the card, winRateShrunk averaged with those games as weights.`,
  ];
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'library-pool.tsv'), poolTsv(lib, poolComments));

  const omegaCube: Cube = parseCube(fs.readFileSync(path.join(repo, 'cubes/omega-cube-180.md'), 'utf8'));
  const skelLine = 'Omega\'s skeleton (cubes/omega-cube-180.md): 24 mono-coloured nonland cards a colour, 2 gold cards a colour pair and none of three colours or more, 18 colourless nonland cards, and 22 lands -- 2 a colour pair that make exactly that pair, and 2 others; the 158 nonland cards on Omega\'s curve, 3 / 24 / 32 / 34 / 30 / 17 / 11 / 7 at mana value 0 to 6 and 7+, every count exact. Colours are the printed ones from Forge\'s facts. Lands: each pair\'s best two fixing lands by the key, then the best two others; nonland cards: the one selection with the largest total key that fills every colour quota and every curve count exactly (a min-cost flow).';
  const common = `Drawn from cubes/library/library-pool.tsv (${counts.cards} cards, the union of ForgeCoach's nine cube documents and its two proxy lists, ${prov}); ${counts.unsupported} cards Forge 2.0.14 lacks or does not support and ${counts.basics} basic lands are never drawn, and ${counts.threePlus} supported cards of three or more colours have no slot in the skeleton.`;

  const hits = selectHits(lib, minGames);
  const hitsAi = hits.filter((c) => c.aiFlag === 'All').length;
  fs.writeFileSync(path.join(out, 'hits-180.md'), cubeDocument({
    title: 'Library hits — the greatest hits by lab rating, version 1 (180 cards, two-player)',
    made: [
      `Made ${date} by tools/cubelab.sh library-candidates (tools/cubelab/library-candidates.ts), for the "best 180 out of the whole library" comparison (lab job J136). Deterministic: no seed; ties go to more games, then the name.`,
      common,
      `The rule: a card is eligible when Forge supports it and the cube lab played it in at least ${minGames} games across ForgeCoach's metas (${metas.map((m) => m.label).join(', ')}). Its key is its games-weighted shrunk win rate pooled across those metas (each meta's winRateShrunk, weighted by that meta's games for the card), to four decimals as library-pool.tsv writes it. Of the ${draw.length} drawable cards, ${eligible.length} are eligible; ${counts.under} have lab data under ${minGames} games and ${counts.noData} have none, and those ${counts.under + counts.noData} are ineligible.`,
      skelLine,
    ],
    cards: hits, themeNames: omegaCube.themeNames,
    notes: [`A lab win rate is the rate of the decks the lab's AI built with the card, against the other drafter, in the cube it was measured in. A card that won in a weak cube can rate above a card that held its own in a strong one; that is what this candidate tests. ${hitsAi} card(s) here are AI:RemoveDeck:All.`],
  }));
  const rand = selectRandom(lib, seed);
  fs.writeFileSync(path.join(out, 'random-180.md'), cubeDocument({
    title: `Library random — the seeded control, version 1 (180 cards, two-player)`,
    made: [
      `Made ${date} by tools/cubelab.sh library-candidates (tools/cubelab/library-candidates.ts), the control of the "best 180 out of the whole library" comparison (lab job J136). Seed ${seed}: rng.ts's rng(${seed}, 'library-random-180') gives every drawable card, in the pool's name order, one uniform 32-bit key.`,
      common,
      `The rule: every drawable card (${draw.length}) is eligible, lab data or not; the selection keeps the largest keys under the skeleton, so within each colour class and mana value the cards are a uniform draw, and only the counts are fixed. Nothing about a card's quality is read.`,
      skelLine,
    ],
    cards: rand, themeNames: omegaCube.themeNames,
    notes: [`A legal, colour-balanced cube that nobody selected: the baseline every selected candidate should beat. ${rand.filter((c) => c.aiFlag === 'All').length} card(s) here are AI:RemoveDeck:All, and ${rand.filter((c) => c.labGames === 0).length} have no lab data at all.`],
  }));
  const synLine = `Copied ${date} by tools/cubelab.sh library-candidates from ${prov}'s public/cubes/synergy-cube-180.md (sha256 ${sha256(synText).slice(0, 12)}), ForgeCoach's current Synergy Cube, version 2, for the "best 180 out of the whole library" comparison (lab job J136). Nothing below this line is changed. J136 itself does not read this copy: its Synergy population is ForgeCoach's v2 only, copied from its pinned clone and checked by sha256. Synergy v2 against a v3 is lab job J137.`;
  fs.writeFileSync(path.join(out, 'synergy-v2-180.md'), withProvenance(synText, synLine));

  say(`pool: ${counts.cards} cards, ${counts.supported} supported, ${counts.unsupported} unsupported; drawable ${draw.length} (${counts.basics} basics left out); lab data ${counts.withData} (${eligible.length} with >= ${minGames} games, ${counts.under} under, ${counts.noData} none); ${counts.threePlus} of three+ colours`);
  for (const [n, cs] of [['hits-180', hits], ['random-180', rand]] as const) {
    const errs = skeletonErrors(cs);
    say(`${n}: ${cs.length} cards, skeleton ${errs.length ? `MISSED: ${errs.join('; ')}` : 'exact'}; AI:RemoveDeck:All ${cs.filter((c) => c.aiFlag === 'All').length}; no lab data ${cs.filter((c) => c.labGames === 0).length}`);
  }
  say(`wrote ${['library-pool.tsv', 'hits-180.md', 'random-180.md', 'synergy-v2-180.md'].map((x) => path.join(path.relative(repo, out), x)).join(', ')}`);
  return 0;
}
