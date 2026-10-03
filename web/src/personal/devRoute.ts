/*
 * mtg-table — personal/devRoute.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The personal tier's route — Node only, dev server only** (phase 2, **D195**;
 * the tier is **D190**, the route rule the card library's **D92**).
 * `web/vite.config.ts` mounts {@link createPersonalMiddleware} in
 * `configureServer` and NOWHERE else — not `vite preview`, not the build — so the
 * user's own models, which are never committed and never published ("this can
 * never ever ever be sold or published"), are reachable exactly while their own
 * dev server is running on their own machine:
 *
 *     GET /personal/index.json                    the index (below)
 *     GET /personal/models/<slug>/model.glb       an ACTIVE model's prepared file
 *     GET /personal/models/<slug>/manifest.json   …and its manifest
 *     GET /personal/relief/index.json             the relief cache's index (D225)
 *     GET /personal/relief/<scryfall id>.png      a depth map that index lists
 *     GET /personal/relief/<scryfall id>.back.jpg its back layer's colour, when the index lists one (D227)
 *
 * Everything else under `/personal/` is a 404 — the download, `source/`, the
 * previews, `check.json`, a disabled or failing model's files, the relief
 * cache's kept card images (`relief/source/`) and its Python caches. Every answer
 * is `no-store`: the browser is not asked to keep a copy.
 *
 * **The relief cache** (D225) is `personal/relief/`: depth maps
 * `tools/personal/relief.mjs` computed from each card's painting — derived from
 * card art, so personal, gitignored and never published, like the models. Its
 * index is read from disk on every request (a map the tool adds while the dev
 * server runs is served at the next page load), sanitised to what the workshop's
 * inspect view needs — per map its file, size and the art box it was cut with,
 * and its back layer's file and size (D227) — and a file is served only when
 * that index lists it, by a Scryfall id, as `<id>.png` or `<id>.back.jpg`.
 *
 * **The index is built once, when the dev server starts**, from every
 * `personal/models/<slug>/manifest.json`. A model is ACTIVE when:
 *
 *  - its manifest is version 2 (phase 2's prepare: the model carries our clip
 *    set baked in) and dresses a card or a seat;
 *  - it is not `disabled` (true, or the reason as a sentence);
 *  - `check.json` beside it says `tools/personal/check.mjs` PASSED — a model that
 *    fails the check is never loaded — and names the very `model.glb` on disk
 *    (its sha256), so a model prepared again since its check is not loaded on an
 *    old pass;
 *  - it is within `arena/perf.ts`'s per-model caps (`PERSONAL_TRI_CAP`
 *    triangles; `PERSONAL_CALL_CAP` draw calls a figure — ONE since **D240**,
 *    counted as the primitives of the very `model.glb` on disk, read from its
 *    glTF JSON, so a model prepared before prepare folded every paint into one
 *    atlas is skipped with "prepare it again") — the arena's reader applies them
 *    too, and the start lines must say what the arena will draw.
 *
 * Every other model is listed under `skipped` with why, and the server prints the
 * same lines at start. When two active models dress the same card or seat, the
 * first in slug order keeps it and the other is said to be shadowed. What the
 * index carries per model is what the arena needs and nothing more: its path,
 * the cards and seats it dresses, its triangles and draw calls (the budget), and the
 * credit line its licence asks for.
 *
 * It fetches nothing and writes nothing. This file must never be imported by
 * browser code (`personal.test.ts` checks).
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join, resolve } from 'node:path';

import { PERSONAL_CALL_CAP, PERSONAL_TRI_CAP, RELIEF_MAP_VERSION } from '../arena/perf.ts';
import type { StandeeCut } from '../arena/relief.ts';
import { standeeCutOf } from '../arena/standee.ts';
import { decodePng } from './png.ts';

/** Where the personal tier lives, relative to the repo root (`.gitignore`'s `/personal/`). */
export const PERSONAL_MODELS_DIR = 'personal/models';
/** The relief cache (D225): depth maps derived from card art, relative to the repo root. */
export const PERSONAL_RELIEF_DIR = 'personal/relief';
/** A Scryfall id — the only name a depth map may have. */
const SCRYFALL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** The URL prefix the route answers. */
export const PERSONAL_PREFIX = '/personal/';
/** A slug: lowercase letters and digits in hyphen-separated runs (`tools/personal/lib.mjs`'s `isSlug`). */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** The manifest version phase 2's prepare writes: the model carries our clip set baked in. */
const MANIFEST_VERSION = 2;

/** One active model, as the index serves it. */
export interface PersonalIndexModel {
  slug: string;
  /** Same-origin, relative: the path the arena loads. */
  model: string;
  cards: string[];
  /** `you` / `opp` — a manifest's `director` / `villain` read as its seat. */
  seats: string[];
  triangles: number;
  /** The draw calls a figure costs: the primitives in `model.glb` (one since D240, prepare's paint step). */
  calls: number;
  bytes: number;
  credits: string;
  clips: string[];
  /**
   * The paint's exposure gain (`paint.exposure.gain`, D198), or `null` for a
   * model prepared before prepare exposed its paint — it still loads, and the
   * start lines say to prepare it again.
   */
  exposure: number | null;
}

export interface PersonalIndex {
  version: 1;
  builtAt: string;
  models: PersonalIndexModel[];
  skipped: { slug: string; why: string }[];
}

export interface PersonalRouteOptions {
  /** The folder of models; `<repoRoot>/personal/models` by default. A test points it at a temp dir. */
  dir?: string;
  /** The relief cache; `<repoRoot>/personal/relief` by default. A test points it at a temp dir. */
  reliefDir?: string;
  /** `duelists.json`'s seat → look map, read from the repo by default. */
  seatLooks?: Readonly<Record<string, string>>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `you` / `opp` for a seat named by itself or by its duelist look (`director` / `villain`), else `null`. */
export function seatOf(value: unknown, looks: Readonly<Record<string, string>>): string | null {
  if (typeof value !== 'string') return null;
  if (value in looks) return value;
  for (const [seat, look] of Object.entries(looks)) if (look === value) return seat;
  return null;
}

function readSeatLooks(repoRoot: string): Record<string, string> {
  try {
    const raw = JSON.parse(readFileSync(resolve(repoRoot, 'web/src/arena/figures/duelists.json'), 'utf8')) as { seats?: Record<string, unknown> };
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw.seats ?? {})) if (!k.startsWith('_') && typeof v === 'string') out[k] = v;
    return out;
  } catch {
    return { you: 'director', opp: 'villain' };
  }
}

/**
 * **What a `model.glb` draws** (D240): its meshes' primitives — one draw call a
 * figure each — and its materials, read from the file's own glTF JSON chunk (the
 * header, then the first chunk, which must be JSON). `null` for bytes that are
 * not a glTF 2 binary. Exported for a test.
 */
export function glbDrawsOf(bytes: Buffer): { primitives: number; materials: number } | null {
  if (bytes.byteLength < 20 || bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) return null;
  const length = bytes.readUInt32LE(12);
  if (bytes.readUInt32LE(16) !== 0x4e4f534a || 20 + length > bytes.byteLength) return null;
  let json: unknown;
  try {
    json = JSON.parse(bytes.subarray(20, 20 + length).toString('utf8'));
  } catch {
    return null;
  }
  if (!isRecord(json)) return null;
  const meshes = Array.isArray(json['meshes']) ? json['meshes'] : [];
  let primitives = 0;
  for (const mesh of meshes) if (isRecord(mesh) && Array.isArray(mesh['primitives'])) primitives += mesh['primitives'].length;
  const materials = Array.isArray(json['materials']) ? json['materials'].length : 0;
  return { primitives, materials };
}

/**
 * **Build the index** from every `<dir>/<slug>/manifest.json`. Pure apart from
 * the file reads, and exported so a test drives it over synthetic folders.
 */
export function buildPersonalIndex(repoRoot: string, options: PersonalRouteOptions = {}): PersonalIndex {
  const dir = options.dir ?? resolve(repoRoot, PERSONAL_MODELS_DIR);
  const looks = options.seatLooks ?? readSeatLooks(repoRoot);
  const models: PersonalIndexModel[] = [];
  const skipped: { slug: string; why: string }[] = [];
  const slugs = existsSync(dir) ? readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory()).sort() : [];
  const taken = new Map<string, string>();
  for (const slug of slugs) {
    const skip = (why: string): void => void skipped.push({ slug, why });
    if (!SLUG.test(slug)) {
      skip('the folder name is not a slug');
      continue;
    }
    const folder = join(dir, slug);
    let manifest: unknown;
    try {
      manifest = JSON.parse(readFileSync(join(folder, 'manifest.json'), 'utf8'));
    } catch {
      skip('no manifest.json — run tools/personal/prepare.mjs');
      continue;
    }
    if (!isRecord(manifest)) {
      skip('manifest.json is not an object');
      continue;
    }
    if (manifest['version'] !== MANIFEST_VERSION) {
      skip(
        manifest['version'] === 1
          ? 'prepared by phase 1 (no baked clips) — run tools/personal/prepare.mjs again'
          : `manifest version ${String(manifest['version'])}, not ${String(MANIFEST_VERSION)}`,
      );
      continue;
    }
    const disabled = manifest['disabled'];
    if (disabled === true || (typeof disabled === 'string' && disabled.trim() !== '')) {
      skip(`disabled${typeof disabled === 'string' ? `: ${disabled}` : ''}`);
      continue;
    }
    const file = typeof manifest['model'] === 'string' ? manifest['model'] : '';
    if (file !== 'model.glb') {
      skip('its manifest names no model.glb');
      continue;
    }
    let bytes: Buffer;
    try {
      bytes = readFileSync(join(folder, 'model.glb'));
    } catch {
      skip('no model.glb — run tools/personal/prepare.mjs');
      continue;
    }
    const sha = createHash('sha256').update(bytes).digest('hex');
    let check: unknown;
    try {
      check = JSON.parse(readFileSync(join(folder, 'check.json'), 'utf8'));
    } catch {
      skip('never checked — run tools/personal/check.mjs');
      continue;
    }
    if (!isRecord(check) || check['ok'] !== true) {
      const failures = isRecord(check) && Array.isArray(check['failures']) ? check['failures'].length : 0;
      skip(`failed tools/personal/check.mjs (${String(failures)} assertion(s)) — never loaded`);
      continue;
    }
    const checkedSha = isRecord(check['model']) ? check['model']['sha256'] : null;
    if (checkedSha !== sha) {
      skip('model.glb changed since it was checked — run tools/personal/check.mjs again');
      continue;
    }
    // The per-model caps (D195, perf.ts), applied HERE as well as in the arena's
    // reader, so the lines the server prints at start are what the arena draws —
    // and an over-cap model shadows no other model's card or seat.
    const triangles = isRecord(manifest['triangles']) && typeof manifest['triangles']['after'] === 'number' ? manifest['triangles']['after'] : -1;
    const draws = glbDrawsOf(bytes);
    if (draws === null) {
      skip('model.glb is not a glTF binary — run tools/personal/prepare.mjs again');
      continue;
    }
    if (triangles < 0) {
      skip('its manifest carries no triangle count — run tools/personal/prepare.mjs again');
      continue;
    }
    if (triangles > PERSONAL_TRI_CAP) {
      skip(`${String(triangles)} triangles, over PERSONAL_TRI_CAP (${String(PERSONAL_TRI_CAP)}) — never loaded; prepare it again with a smaller --budget`);
      continue;
    }
    // One draw call a figure (D240): the file itself, not the manifest's word for it.
    if (draws.primitives > PERSONAL_CALL_CAP || draws.materials > PERSONAL_CALL_CAP) {
      skip(
        `${String(draws.primitives)} primitive(s) under ${String(draws.materials)} material(s) — ${String(draws.primitives)} draw calls a figure, over PERSONAL_CALL_CAP (${String(PERSONAL_CALL_CAP)}): ` +
          'prepared before D240 folded every paint into one atlas — run tools/personal/prepare.mjs again, then check.mjs',
      );
      continue;
    }
    if (draws.primitives === 0) {
      skip('model.glb draws nothing — run tools/personal/prepare.mjs again');
      continue;
    }
    const dresses = Array.isArray(manifest['dresses']) ? manifest['dresses'].filter(isRecord) : [];
    const cards: string[] = [];
    const seats: string[] = [];
    const shadowed: string[] = [];
    for (const d of dresses) {
      const key = typeof d['card'] === 'string' ? `card:${d['card']}` : typeof d['seat'] === 'string' ? `seat:${seatOf(d['seat'], looks) ?? ''}` : null;
      if (key === null || key === 'seat:') continue;
      const holder = taken.get(key);
      if (holder !== undefined) {
        shadowed.push(`${key.slice(key.indexOf(':') + 1)} (kept by ${holder})`);
        continue;
      }
      taken.set(key, slug);
      if (key.startsWith('card:')) cards.push(key.slice(5));
      else seats.push(key.slice(5));
    }
    if (shadowed.length > 0) skip(`shadowed for ${shadowed.join(', ')}: another model dresses it first (slug order)`);
    if (cards.length === 0 && seats.length === 0) {
      if (shadowed.length === 0) skip('dresses no card and no seat');
      continue;
    }
    const clips = isRecord(manifest['clips']) && Array.isArray(manifest['clips']['keys']) ? manifest['clips']['keys'].filter((k): k is string => typeof k === 'string') : [];
    // An untextured model (paint null: the pipeline's own test figure) has nothing to expose.
    const exposed = !isRecord(manifest['paint']) ? 1 : isRecord(manifest['paint']['exposure']) ? manifest['paint']['exposure']['gain'] : null;
    models.push({
      slug,
      model: `personal/models/${slug}/model.glb`,
      cards,
      seats,
      triangles,
      calls: draws.primitives,
      bytes: bytes.byteLength,
      credits: typeof manifest['credits'] === 'string' ? manifest['credits'] : '',
      clips,
      exposure: typeof exposed === 'number' ? exposed : null,
    });
  }
  return { version: 1, builtAt: new Date().toISOString(), models, skipped };
}

/** One depth map, as the relief index serves it: what the inspect view needs and nothing more. */
export interface ReliefIndexEntry {
  file: string;
  width: number;
  height: number;
  box: { left: number; right: number; top: number; bottom: number };
  /**
   * The back layer's colour (D227): `<id>.back.jpg` and its size, or `null` for a
   * map made before it — or with a recipe other than `RELIEF_MAP_VERSION` (D228:
   * its blue is not the front's keep mask) — which the page draws flat.
   */
  back: { file: string; width: number; height: number } | null;
  /**
   * **The standee's cut** (D260): measured here, once per map file, from the
   * map's own pixels (`arena/standee.ts`'s `standeeCutOf`) — the box round the
   * painting's near subjects, how near a texel must be, and the share it keeps —
   * or `null`: no back layer of this recipe (the standee draws both layers), a
   * map this decoder does not read, or a painting with no near subject. Numbers
   * about a depth map, never a pixel of the painting.
   */
  standee: StandeeCut | null;
}

/** The relief cache's index, as served (`arena/relief.ts`'s `reliefIndexOf` reads it). */
export interface ReliefIndex {
  version: 1;
  model: string | null;
  reliefs: Record<string, ReliefIndexEntry>;
}

/**
 * **The relief index** from `<dir>/index.json` (written by
 * `tools/personal/relief.mjs`), read NOW: every entry whose key is a Scryfall id,
 * whose file is exactly `<id>.png` and on disk, with a size and an art box — and
 * its back layer when the entry names exactly `<id>.back.jpg`, on disk, with a
 * size, made with THIS recipe version (`perf.ts`'s `RELIEF_MAP_VERSION`; `null`
 * otherwise: a map made before the back layer, or before the keep mask, which the
 * page draws flat). The card's name, the image's source, the rest of the recipe
 * and the timings stay on disk — the page needs none of them. No folder, or no
 * index: an empty one.
 */
/**
 * Each map's standee cut, by its path — measured once and kept while the file
 * is the same size and age (`relief.mjs --force` rewrites it, and the next index
 * measures it again). The index is read per request; decoding 158 maps a
 * request would not be.
 */
const cutCache = new Map<string, { mtimeMs: number; size: number; cut: StandeeCut | null }>();

/** **The standee cut of one map file** (D260), cached (see {@link cutCache}); `null` for anything unread. */
export function standeeCutOfFile(file: string): StandeeCut | null {
  let stat: { mtimeMs: number; size: number };
  try {
    stat = statSync(file);
  } catch {
    return null;
  }
  const kept = cutCache.get(file);
  if (kept !== undefined && kept.mtimeMs === stat.mtimeMs && kept.size === stat.size) return kept.cut;
  let cut: StandeeCut | null = null;
  try {
    const png = decodePng(readFileSync(file));
    cut = png === null ? null : standeeCutOf(png.pixels, png.width, png.height, png.channels);
  } catch {
    cut = null;
  }
  cutCache.set(file, { mtimeMs: stat.mtimeMs, size: stat.size, cut });
  return cut;
}

export function buildReliefIndex(dir: string, options: { cuts?: boolean } = {}): ReliefIndex {
  const out: ReliefIndex = { version: 1, model: null, reliefs: {} };
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'));
  } catch {
    return out;
  }
  if (!isRecord(raw) || raw['version'] !== 1 || !isRecord(raw['reliefs'])) return out;
  out.model = typeof raw['model'] === 'string' ? raw['model'] : null;
  for (const [id, entry] of Object.entries(raw['reliefs'])) {
    if (!SCRYFALL_ID.test(id) || !isRecord(entry) || entry['file'] !== `${id}.png`) continue;
    const { width, height, box } = entry;
    if (typeof width !== 'number' || typeof height !== 'number' || !isRecord(box)) continue;
    const edges = ['left', 'right', 'top', 'bottom'].map((k) => box[k]);
    if (!edges.every((v) => typeof v === 'number')) continue;
    const file = join(dir, `${id}.png`);
    if (!existsSync(file) || statSync(file).size === 0) continue;
    const [left, right, top, bottom] = edges as number[];
    const { backWidth, backHeight } = entry;
    const backFile = join(dir, `${id}.back.jpg`);
    const recipe = entry['recipe'];
    const current = isRecord(recipe) && recipe['version'] === RELIEF_MAP_VERSION;
    const back =
      current &&
      entry['back'] === `${id}.back.jpg` &&
      typeof backWidth === 'number' &&
      typeof backHeight === 'number' &&
      existsSync(backFile) &&
      statSync(backFile).size > 0
        ? { file: `${id}.back.jpg`, width: backWidth, height: backHeight }
        : null;
    // D260: a standee draws both layers and the keep mask, so only this recipe's map stands one.
    const standee = back !== null && options.cuts !== false ? standeeCutOfFile(file) : null;
    out.reliefs[id] = { file: `${id}.png`, width, height, box: { left: left!, right: right!, top: top!, bottom: bottom! }, back, standee };
  }
  return out;
}

/** The start line for the relief cache: how many maps, and that they are personal. */
export function describeRelief(index: ReliefIndex): string {
  const all = Object.values(index.reliefs);
  const layered = all.filter((r) => r.back !== null).length;
  const stale = all.length - layered;
  const standees = all.filter((r) => r.standee !== null).length;
  return (
    `personal relief: ${String(all.length)} depth map(s) for the workshop's inspect view and ${String(standees)} standee cut(s) for the table (card-art-derived, dev server only — D225, D260)` +
    (stale > 0
      ? `; ${String(stale)} made before the back layer or with an older recipe than version ${String(RELIEF_MAP_VERSION)} (D227, D228), drawn flat — run tools/personal/relief.mjs --all`
      : '')
  );
}

/** The lines the dev server prints at start: what is active, and what was skipped and why. */
export function describeIndex(index: PersonalIndex): string[] {
  const out = [`personal tier: ${String(index.models.length)} active model(s), ${String(index.skipped.length)} skipped (dev server only, D190)`];
  for (const m of index.models) {
    const paint = m.exposure === null ? ' — its paint was never exposed: prepare it again (D198)' : m.exposure === 1 ? '' : `, exposed ×${String(m.exposure)}`;
    out.push(`  active   ${m.slug}: ${[...m.cards, ...m.seats.map((s) => `seat ${s}`)].join(', ')} — ${String(m.triangles)} triangles, ${String(m.calls)} draw call(s) a figure${paint}`);
  }
  for (const s of index.skipped) out.push(`  skipped  ${s.slug}: ${s.why}`);
  return out;
}

/** The connect-style middleware `vite.config.ts` mounts in `configureServer` — and nowhere else. */
export function createPersonalMiddleware(
  repoRoot: string,
  options: PersonalRouteOptions = {},
): { handle: (req: IncomingMessage, res: ServerResponse, next: () => void) => void; index: PersonalIndex } {
  const dir = options.dir ?? resolve(repoRoot, PERSONAL_MODELS_DIR);
  const reliefDir = resolve(options.reliefDir ?? resolve(repoRoot, PERSONAL_RELIEF_DIR));
  const index = buildPersonalIndex(repoRoot, options);
  const active = new Set(index.models.map((m) => m.slug));
  const body = JSON.stringify(index);
  const handle = (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const url = (req.url ?? '').split('?')[0] ?? '';
    if (!url.startsWith(PERSONAL_PREFIX)) {
      next();
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    const rest = url.slice(PERSONAL_PREFIX.length);
    if (rest === 'index.json') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(body);
      return;
    }
    // The relief cache (D225): its index, read now, and a map it lists (or that
    // map's back layer, D227) — nothing else.
    if (rest === 'relief/index.json') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(buildReliefIndex(reliefDir)));
      return;
    }
    if (rest.startsWith('relief/')) {
      const map = /^relief\/([^/.]+)(\.png|\.back\.jpg)$/.exec(rest);
      const id = map?.[1] ?? '';
      const back = map?.[2] === '.back.jpg';
      const file = resolve(reliefDir, `${id}${back ? '.back.jpg' : '.png'}`);
      const listed = map === null || !SCRYFALL_ID.test(id) ? undefined : buildReliefIndex(reliefDir, { cuts: false }).reliefs[id];
      if (listed === undefined || !file.startsWith(reliefDir + '/') || (back && listed.back === null)) {
        res.statusCode = 404;
        res.end('not a served relief file (only a depth map the relief index lists, and its back layer, are)');
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', back ? 'image/jpeg' : 'image/png');
      res.end(readFileSync(file));
      return;
    }
    const match = /^models\/([^/]+)\/(model\.glb|manifest\.json)$/.exec(rest);
    const slug = match?.[1] ?? '';
    if (match === null || !SLUG.test(slug) || !active.has(slug)) {
      res.statusCode = 404;
      res.end('not a served personal file (only an active model\'s model.glb and manifest.json are)');
      return;
    }
    const file = resolve(dir, slug, match[2] ?? '');
    if (!file.startsWith(resolve(dir) + '/') || !existsSync(file)) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', match[2] === 'model.glb' ? 'model/gltf-binary' : 'application/json; charset=utf-8');
    res.end(readFileSync(file));
  };
  return { handle, index };
}
