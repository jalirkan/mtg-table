// mtg-table — the cube lab: BRIDGE drafts, a pool mixed from two or more cubes.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// `run --bridge fair-fight,modern-era` drafts from a pool sampled afresh for
// every draft: a share of each source cube (half each by default,
// `--bridge-ratio 0.7,0.3` to choose), stratified by the source's own sections
// (so each half keeps its cube's colour balance), deduplicated (a card two
// cubes share is taken once and the next card of the same section stands in),
// `--bridge-size` (180) cards in all.  The sample is a function of the draft's
// seed and nothing else (rng stream `bridge`, D294's rule), so the same seed
// gives the same pool, picks and decks on any machine and any --jobs.
//
// Why (the matchup model, tools/ml/matchup.py): a card's strength depends on
// the pool around it, and games between decks drafted from different cubes put
// every cube's cards on one shared scale, the way cross-pool games anchor Elo.
// Each draft line of a bridge run carries `bridge: {sources, shares, from}` —
// which cube every card of its pool came from — and run.json a `bridge` block,
// so the analysis can tell in-cube games from bridge games.  A run without
// --bridge writes exactly what it wrote before.
//
// Ratings: each card starts from its own cube's rating (`<cube>.ratings.tsv`
// beside it, else Forge's rank; a card two cubes share takes the mean).  Those
// scales differ from cube to cube, and a drafter comparing them would take
// mostly the stronger cube's cards, so the weaker cube's cards would rarely
// meet the other cube's in a game -- the very link a bridge is for.  So by
// default (`--bridge-ratings even`) each draft rescales each source's cards to
// the pool's own mean and SD: within a cube the order is kept, and between the
// cubes the drafters weigh the halves evenly.  `own` keeps the raw ratings.
// Either way the matchup model reads only what was PLAYED, so how the decks
// came to be does not bias it; it only decides which cards meet which.

import fs from 'node:fs';
import path from 'node:path';

import type { Fact } from './cards.ts';
import { parseCube, type Cube, type CubeCard } from './cube.ts';
import { engineFacts, type EngineEnv } from './engine.ts';
import { loadCube, runDraft, type DraftOut, type Format, type LoadedCube } from './lab.ts';
import { parseRatings } from './ratings.ts';
import { rng, shuffle, type Rng } from './rng.ts';
import type { Weights } from './weights.ts';

/** One source cube of a bridge run. */
export interface BridgeSource { id: string; file: string; ratingsFile: string | null }

/** What `run --bridge` asks for. */
export interface BridgeOptions { sources: BridgeSource[]; shares: number[]; size: number; ratings?: 'even' | 'own' }

/** A draft's pool: the cards (the names the cube lists) and which cube each came from. */
export interface BridgePool { names: string[]; from: Record<string, string[]> }

/** The tag every bridge draft line carries in drafts.jsonl. */
export interface BridgeTag { sources: string[]; shares: number[]; from: Record<string, string[]> }

/** run.json's block for a bridge run. */
export interface BridgeMeta { sources: Array<{ id: string; file: string; sha: string; ratingsFile: string | null; cards: number }>; shares: number[]; size: number; ratings: 'even' | 'own' }

/** A cube's short id: `cubes/fair-fight-cube-180.md` -> `fair-fight`. */
export function cubeId(file: string): string {
  return path.basename(file).replace(/\.md$/, '').replace(/-cube(-\d+)?$/, '');
}

/** `fair-fight`, `fair-fight-cube-180` or a path -> the cube file (relative to the repo when it is under cubes/). */
export function resolveCube(arg: string, repo: string): string {
  const tries = [arg, path.join('cubes', arg), path.join('cubes', `${arg}.md`), path.join('cubes', `${arg}-cube-180.md`)];
  for (const t of tries) if (fs.existsSync(path.resolve(repo, t)) && t.endsWith('.md')) return t;
  const known = fs.existsSync(path.join(repo, 'cubes')) ? fs.readdirSync(path.join(repo, 'cubes')).filter((f) => /-cube-\d+\.md$/.test(f)).map((f) => cubeId(f)) : [];
  throw new Error(`no cube "${arg}" (known: ${known.join(', ') || 'none'})`);
}

/** `--bridge a,b[,c]` and `--bridge-ratio 0.7,0.3` -> ids and shares that sum to 1 (equal by default). */
export function parseBridgeArgs(list: string, ratio?: string): { ids: string[]; shares: number[] } {
  const ids = list.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length < 2) throw new Error(`--bridge wants two or more cubes, comma-separated, got "${list}"`);
  if (new Set(ids).size !== ids.length) throw new Error(`--bridge names a cube twice: "${list}"`);
  let raw = ids.map(() => 1);
  if (ratio !== undefined) {
    raw = ratio.split(/[,:]/).map((s) => Number(s.trim()));
    if (raw.length !== ids.length || raw.some((x) => !Number.isFinite(x) || x <= 0)) {
      throw new Error(`--bridge-ratio wants ${ids.length} positive numbers (e.g. 0.7,0.3), got "${ratio}"`);
    }
  }
  const total = raw.reduce((a, b) => a + b, 0);
  return { ids, shares: raw.map((x) => x / total) };
}

/** Split `total` into integer parts proportional to `weights` (largest remainder; ties to the earlier part). */
export function apportion(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (w / sum) * total);
  const out = exact.map((x) => Math.floor(x));
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of order) { if (left <= 0) break; out[i] = (out[i] as number) + 1; left--; }
  return out;
}

/**
 * The pool of one bridge draft.  Each source gives `round(share * size)` cards
 * (largest remainder), spread over its sections in proportion to their sizes;
 * inside a section the cards are shuffled and taken in order, skipping one an
 * earlier source already gave (the next card of the section stands in, then
 * any card of the source).  `usable` drops cards the engine lacks.
 */
export function bridgePool(sources: Array<{ id: string; cube: Cube }>, shares: number[], size: number, seed: number,
  usable: (name: string) => boolean = () => true): BridgePool {
  const r: Rng = rng(seed, 'bridge');
  const quota = apportion(size, shares);
  const taken = new Set<string>();
  const from: Record<string, string[]> = {};
  sources.forEach((src, si) => {
    const got: string[] = [];
    const cards = src.cube.cards.filter((c) => usable(c.name));
    const sections = [...new Set(cards.map((c) => c.section))];
    const bySection = sections.map((s) => shuffle(cards.filter((c) => c.section === s), r));
    const want = apportion(Math.min(quota[si] as number, cards.length), bySection.map((s) => s.length));
    const leftovers: CubeCard[] = [];
    bySection.forEach((list, k) => {
      let need = want[k] as number;
      for (const c of list) {
        if (need > 0 && !taken.has(c.name)) { taken.add(c.name); got.push(c.name); need--; } else if (!taken.has(c.name)) leftovers.push(c);
      }
    });
    // A section short of cards (all its cards already taken by an earlier cube): fill from the rest of this cube.
    for (const c of leftovers) {
      if (got.length >= (quota[si] as number)) break;
      if (!taken.has(c.name)) { taken.add(c.name); got.push(c.name); }
    }
    from[src.id] = got;
  });
  return { names: sources.flatMap((s) => from[s.id] as string[]), from };
}

/** Several cubes as one, for the engine lookup and the run's cards.json: every card once (the first cube's tags), themes and plans merged. */
export function unionCube(sources: Array<{ id: string; cube: Cube }>): Cube {
  const cards: CubeCard[] = [];
  const seen = new Map<string, CubeCard>();
  const themeNames: Record<string, string> = {};
  const archetypes: Record<string, string> = {};
  const warnings: string[] = [];
  for (const { id, cube } of sources) {
    for (const c of cube.cards) {
      const had = seen.get(c.name);
      if (had) { had.themes = [...new Set([...had.themes, ...c.themes])]; continue; }
      const copy: CubeCard = { name: c.name, section: c.section, themes: [...c.themes], roles: [...c.roles], ...(c.pair ? { pair: c.pair } : {}) };
      seen.set(c.name, copy);
      cards.push(copy);
    }
    for (const [k, v] of Object.entries(cube.themeNames)) if (!(k in themeNames)) themeNames[k] = v;
    for (const [k, v] of Object.entries(cube.archetypes)) archetypes[k] = archetypes[k] ? `${archetypes[k]} / ${v}` : v;
    for (const w of cube.warnings) warnings.push(`${id}: ${w}`);
  }
  return { title: `Bridge: ${sources.map((s) => s.cube.title.replace(/\s+—.*$/, '')).join(' + ')}`, cards, sections: [], themeNames, archetypes, warnings };
}

/** Ratings of several cubes as one map; a card two files rate takes the mean. */
export function mergeRatings(maps: Array<Map<string, number> | null>): Map<string, number> | null {
  const sum = new Map<string, { s: number; n: number }>();
  for (const m of maps) if (m) for (const [k, v] of m) { const e = sum.get(k) ?? { s: 0, n: 0 }; e.s += v; e.n++; sum.set(k, e); }
  if (sum.size === 0) return null;
  return new Map([...sum].map(([k, e]) => [k, e.s / e.n]));
}

/** The LoadedCube of one draft's pool, cut from the union's; `even` rescales each source's ratings to the pool's mean and SD. */
export function poolCube(lc: LoadedCube, facts: Fact[], pool: BridgePool, ratings: 'even' | 'own' = 'own'): LoadedCube {
  const forgeName = new Map(facts.filter((f) => f.found && f.name).map((f) => [f.listed, f.name as string]));
  const card = (n: string) => lc.byName.get(forgeName.get(n) ?? n);
  let cards = pool.names.map(card).filter((c): c is NonNullable<typeof c> => !!c);
  if (ratings === 'even') {
    const stats = (xs: number[]) => {
      const m = xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
      const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, xs.length - 1)) || 1;
      return { m, sd };
    };
    const all = stats(cards.filter((c) => !c.land).map((c) => c.rating));
    const scaled = new Map<string, number>();
    for (const names of Object.values(pool.from)) {
      const mine = names.map(card).filter((c): c is NonNullable<typeof c> => !!c && !c.land);
      const st = stats(mine.map((c) => c.rating));
      for (const c of mine) scaled.set(c.name, Math.round((all.m + (all.sd * (c.rating - st.m)) / st.sd) * 10) / 10);
    }
    cards = cards.map((c) => (scaled.has(c.name) ? { ...c, rating: scaled.get(c.name) as number } : c));
  }
  return { ...lc, cards, byName: new Map(cards.map((c) => [c.name, c])) };
}

export interface LoadedBridge {
  lc: LoadedCube;
  facts: Fact[];
  /** The source cubes' markdown, concatenated (what run.json's cubeSha hashes). */
  text: string;
  meta: BridgeMeta;
  /** One draft from its seed, tagged with its pool. */
  draft: (seed: number, format: Format, w: Weights, winstonCards: number) => DraftOut & { bridge: BridgeTag };
}

/** Load a bridge run's cubes, facts (one engine boot for the union, cached) and ratings. */
export function loadBridge(env: EngineEnv, o: BridgeOptions, w: Weights, say: (s: string) => void, sha: (s: string) => string): LoadedBridge {
  const texts = o.sources.map((s) => fs.readFileSync(path.resolve(env.repo, s.file), 'utf8'));
  const parsed = o.sources.map((s, i) => ({ id: s.id, cube: parseCube(texts[i] as string) }));
  const union = unionCube(parsed);
  for (const warn of union.warnings) say(`cube: ${warn}`);
  const facts = engineFacts(env, union.cards.map((c) => c.name), say);
  const ratings = mergeRatings(o.sources.map((s) => (s.ratingsFile ? parseRatings(fs.readFileSync(path.resolve(env.repo, s.ratingsFile), 'utf8')) : null)));
  const lc = loadCube(union, facts, ratings, w);
  const found = new Set(facts.filter((f) => f.found).map((f) => f.listed));
  const meta: BridgeMeta = {
    sources: o.sources.map((s, i) => ({ id: s.id, file: s.file, sha: sha(texts[i] as string), ratingsFile: s.ratingsFile, cards: parsed[i]?.cube.cards.length ?? 0 })),
    shares: o.shares.map((x) => Math.round(x * 1e6) / 1e6), size: o.size, ratings: o.ratings ?? 'even',
  };
  const draft = (seed: number, format: Format, wt: Weights, winstonCards: number): DraftOut & { bridge: BridgeTag } => {
    const pool = bridgePool(parsed, o.shares, o.size, seed, (n) => found.has(n));
    const d = runDraft(poolCube(lc, facts, pool, meta.ratings), format, seed, wt, winstonCards);
    return { ...d, bridge: { sources: o.sources.map((s) => s.id), shares: meta.shares, from: pool.from } };
  };
  return { lc, facts, text: texts.join('\n'), meta, draft };
}

/** `run --bridge …`'s options from the command line (cli.ts): the sources resolved, their ratings beside them. */
export function bridgeOptions(repo: string, list: string, ratio: string | undefined, size: number, ratings: string = 'even'): BridgeOptions {
  if (ratings !== 'even' && ratings !== 'own') throw new Error(`--bridge-ratings is even or own, got ${ratings}`);
  const { ids, shares } = parseBridgeArgs(list, ratio);
  const sources = ids.map((id) => {
    const file = resolveCube(id, repo);
    const tsv = file.replace(/\.md$/, '') + '.ratings.tsv';
    return { id: cubeId(file), file, ratingsFile: fs.existsSync(path.resolve(repo, tsv)) ? tsv : null };
  });
  if (size < 162) throw new Error(`--bridge-size ${size}: a grid draft deals 162 cards, so a pool needs at least that many`);
  return { sources, shares, size, ratings };
}
