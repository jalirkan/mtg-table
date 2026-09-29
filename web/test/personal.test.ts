/*
 * mtg-table — web/test/personal.test.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The personal tier, phase 2 — the loader** (D194, D195, D196; the tier is
 * D190). Everything here is synthetic: no personal model, no picture of one and
 * no manifest of the user's is read (the folder may not even exist) — the index
 * and the route run over folders this test writes into a temp directory.
 *
 *  1. **The route is the dev server's alone** (D92's rule): `vite.config.ts`
 *     mounts it in `configureServer` and never in preview; no browser module
 *     imports it; a production build names neither the route nor any slug.
 *  2. **The index**: built from every manifest, a model ACTIVE only when its
 *     manifest is version 2, it is not disabled, and `check.json` says
 *     `check.mjs` passed the very `model.glb` on disk; everything else skipped
 *     with its reason; a card or a seat kept by the first slug; the route serves
 *     an active model's two files and nothing else.
 *  3. **The overlay reader** (`personalOverlayOf`): opaque ids, the caps, and a
 *     path that could leave the origin refused.
 *  4. **Hard rule 8's renderer half** (`personalChoicesOf`): over every frame of
 *     the committed corpus, made HOSTILE (every back and every stub given a
 *     name), the overlay is asked about no concealed name — and a lookup with the
 *     gates taken out, run over the same frames, is: the negative control.
 *  5. **The dressed pose** (`dressPoses`): the opaque id, no props, no costume,
 *     the width clamp strict, and the same map back when nothing is dressed.
 *  6. **The status layer over dressed poses** (D210–D212, met at the rebase onto
 *     the status layer): the arena lays the strips out from the DRESSED poses, so
 *     a dressed figure keeps its strip over its own refitted height — and a pose
 *     dressed on a back or a stub (the lookup's gates skipped on purpose) still
 *     gets none, because the strip's own gates never ask which model is worn.
 */

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import figuresJson from '../src/arena/figures/figures.json' with { type: 'json' };
import modelsJson from '../src/arena/figures/models.json' with { type: 'json' };
import { figurePose, type FigureLayout, type FigurePose } from '../src/arena/figures/pose.ts';
import { validateFigures, validateModels } from '../src/arena/figures/validate.ts';
import { FIGURE_MAX_WIDTH, STATUS_LIFT, layout, type Layout, type Placement } from '../src/arena/layout.ts';
import { statusLayout } from '../src/arena/figures/status.ts';
import { PERSONAL_CALL_CAP, PERSONAL_MAX_FIGURES, PERSONAL_TABLE_TRIS, PERSONAL_TRI_CAP, RELIEF_MAP_VERSION } from '../src/arena/perf.ts';
import {
  EMPTY_PERSONAL,
  dressPoses,
  isLocalModelPath,
  personalChoicesOf,
  seatTriangles,
  personalModelKey,
  personalOverlayOf,
  type PersonalEntry,
  type PersonalOverlay,
} from '../src/arena/personal.ts';
import { buildPersonalIndex, buildReliefIndex, createPersonalMiddleware, describeIndex, describeRelief } from '../src/personal/devRoute.ts';
import { isFaceDown, isHidden, type AnyCard, type Frame } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const MODELS = validateModels(modelsJson).data;
const DATA = validateFigures(figuresJson, { modelIds: new Set(Object.keys(MODELS.models)) }).data;
const LOOKS = { you: 'director', opp: 'villain' };

// ---------------------------------------------------------------------------
// 1. Dev server only
// ---------------------------------------------------------------------------

/** Every `.ts`/`.tsx` under `web/src/`. */
function sources(dir = join(REPO, 'web/src')): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? sources(full) : /\.tsx?$/.test(name) ? [full] : [];
  });
}

test('personal: the route is the dev server’s alone — configureServer, never preview, and no browser module imports it (D92, D190)', () => {
  for (const file of sources()) {
    if (file.endsWith('personal/devRoute.ts')) continue;
    const imports = [...readFileSync(file, 'utf8').matchAll(/^import[^;]*?from\s+'([^']+)'|import\('([^']+)'\)/gm)].map((m) => m[1] ?? m[2] ?? '');
    assert.ok(!imports.some((i) => i.includes('personal/devRoute')), `${file} imports the Node-only personal route`);
  }
  const config = readFileSync(join(REPO, 'web/vite.config.ts'), 'utf8');
  assert.match(config, /from '\.\/src\/personal\/devRoute\.ts'/);
  const plugin = config.split('function personalPlugin')[1]?.split('\nexport default')[0] ?? '';
  assert.ok(plugin.length > 100, 'personalPlugin is gone from vite.config.ts — move this check with it');
  assert.match(plugin, /configureServer/);
  assert.doesNotMatch(plugin, /configurePreviewServer/, 'the personal tier must never be reachable from `vite preview`');
  assert.match(config, /plugins: \[[^\]]*personalPlugin\(\)/);
  // The arena names the route behind import.meta.env.DEV, in one module.
  const loader = readFileSync(join(REPO, 'web/src/arena/scene/personalModels.ts'), 'utf8');
  assert.match(loader, /const INDEX_URL: string \| null = import\.meta\.env\.DEV \? 'personal\/index\.json' : null;/);
  // …and the relief cache (D225) the same way, in one module, and nowhere else — the arena's
  // since the portrait standee (D260): its standees and the workshop's inspect view both read it there.
  const reliefLoader = readFileSync(join(REPO, 'web/src/arena/scene/reliefCache.ts'), 'utf8');
  assert.match(reliefLoader, /export const RELIEF_BASE: string \| null = import\.meta\.env\.DEV \? 'personal\/relief\/' : null;/);
  const code = (file: string): string => readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const naming = sources().filter((file) => !file.endsWith('personal/devRoute.ts') && /['"`]personal\/relief/.test(code(file)));
  assert.deepEqual(naming.map((f) => f.slice(REPO.length)), ['web/src/arena/scene/reliefCache.ts'], 'the relief route is named in one browser module, behind the DEV gate');
});

/** Every string a personal build must not carry: the route's prefix, and any slug of this machine's folder. */
function leaksIn(text: string, slugs: readonly string[]): string[] {
  const out: string[] = [];
  if (text.includes('personal/')) out.push('personal/');
  for (const slug of slugs) if (text.includes(slug)) out.push(slug);
  return out;
}

test('personal: a production build carries no personal path — the route, a slug, a model (web/dist, when it is there)', (t) => {
  // The detector's negative controls first: each must be caught.
  assert.deepEqual(leaksIn('const u = "personal/index.json";', []), ['personal/']);
  assert.deepEqual(leaksIn('load("x/doctor-doom/y")', ['doctor-doom']), ['doctor-doom']);
  assert.deepEqual(leaksIn('models/figures.glb', ['doctor-doom']), []);
  const dist = join(REPO, 'web/dist');
  if (!existsSync(dist)) {
    t.skip('no web/dist (npm run build first; in check-all the node job waits for the build job)');
    return;
  }
  const personalDir = join(REPO, 'personal/models');
  // A slug too common to mean anything (the test's own fixtures use `selftest-…`) is not a leak.
  const slugs = existsSync(personalDir) ? readdirSync(personalDir).filter((s) => s.length >= 6 && !s.startsWith('selftest')) : [];
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else files.push(full);
    }
  };
  walk(dist);
  let scanned = 0;
  let maps = 0;
  for (const file of files) {
    const rel = file.slice(dist.length + 1);
    assert.ok(!rel.startsWith('personal'), `${rel}: a personal file in the build`);
    if (/\.glb$/.test(rel)) assert.equal(rel, 'models/figures.glb', `${rel}: a model in the build that is not the CC0 library`);
    if (!/\.(js|css|html|json|map|txt)$/.test(rel)) continue;
    scanned += 1;
    const text = readFileSync(file, 'utf8');
    // The source maps are grepped like the code (the standee's fix pass 2): they carry no copy of the sources —
    // `vite.config.ts`'s `sourcemapExcludeSources`, whose `sourcesContent` named the route in its comments and
    // DEV branches — so a path in one is a path in the build.
    if (rel.endsWith('.map')) {
      maps += 1;
      const content = (JSON.parse(text) as { sourcesContent?: unknown }).sourcesContent;
      assert.ok(content === undefined || (Array.isArray(content) && content.every((c) => c === null)), `${rel} carries its sources' text`);
    }
    assert.deepEqual(leaksIn(text, slugs), [], `${rel} carries a personal path`);
  }
  assert.ok(scanned > 3, `expected the built chunks, scanned ${String(scanned)}`);
  assert.ok(maps > 3, `expected the built chunks' source maps, scanned ${String(maps)}`);
});

// ---------------------------------------------------------------------------
// 2. The index and the route, over synthetic folders
// ---------------------------------------------------------------------------

interface Fake {
  slug: string;
  version?: number;
  dresses?: unknown[];
  disabled?: boolean | string;
  check?: 'ok' | 'fail' | 'none' | 'stale';
  model?: boolean;
  triangles?: number;
  /** The primitives (one per paint) in the fake `model.glb` — one since D240. */
  paints?: number;
  /** A `model.glb` that is not a glTF binary at all. */
  junk?: boolean;
  /** `paint.exposure.gain` (D198); absent: a model prepared before the exposure step. */
  exposure?: number;
}

/**
 * **A `model.glb` of a few bytes that IS a glTF binary** (D240: the route counts the
 * primitives and materials in the file it would serve) — a header and a JSON chunk
 * naming one mesh of `primitives` primitives and as many materials, nothing more.
 */
function fakeGlb(slug: string, primitives = 1): Buffer {
  const json = Buffer.from(
    JSON.stringify({
      asset: { version: '2.0', generator: `fake ${slug}` },
      meshes: [{ primitives: Array.from({ length: primitives }, (_, i) => ({ attributes: {}, material: i })) }],
      materials: Array.from({ length: primitives }, (_, i) => ({ name: `paint-${String(i)}` })),
    }),
  );
  const padded = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + padded.length, 8);
  header.writeUInt32LE(padded.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  return Buffer.concat([header, padded]);
}

/** A folder of synthetic models: a manifest, a `model.glb` of a few bytes, a `check.json` as asked. */
function fakeTier(models: readonly Fake[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'mtg-personal-'));
  for (const m of models) {
    const folder = join(dir, m.slug);
    mkdirSync(folder, { recursive: true });
    const glb = m.junk === true ? Buffer.from(`not-a-glb-${m.slug}`) : fakeGlb(m.slug, m.paints ?? 1);
    if (m.model !== false) writeFileSync(join(folder, 'model.glb'), glb);
    writeFileSync(join(folder, 'SOURCE.txt'), 'the download, never served');
    mkdirSync(join(folder, 'preview'), { recursive: true });
    writeFileSync(join(folder, 'preview/front.png'), 'a picture, never served');
    writeFileSync(
      join(folder, 'manifest.json'),
      JSON.stringify({
        version: m.version ?? 2,
        slug: m.slug,
        dresses: m.dresses ?? [{ card: `Card ${m.slug}` }],
        model: 'model.glb',
        credits: `credit for ${m.slug}`,
        triangles: { after: m.triangles ?? 5000 },
        paint: {
          primitives: Array.from({ length: m.paints ?? 1 }, (_, i) => ({ material: `paint-${String(i)}` })),
          ...(m.exposure === undefined ? {} : { exposure: { mode: 'auto', gain: m.exposure } }),
        },
        clips: { keys: ['idle', 'attack'], fps: 24 },
        ...(m.disabled === undefined ? {} : { disabled: m.disabled }),
      }),
    );
    const sha = createHash('sha256').update(glb).digest('hex');
    if (m.check !== 'none') {
      writeFileSync(
        join(folder, 'check.json'),
        JSON.stringify({ ok: m.check !== 'fail', failures: m.check === 'fail' ? ['a limb is folded'] : [], model: { sha256: m.check === 'stale' ? '0'.repeat(64) : sha } }),
      );
    }
  }
  return dir;
}

test('personal: the index — active only when version 2, not disabled, and checked on the very file; every skip says why; a card is the first slug’s', () => {
  const dir = fakeTier([
    { slug: 'doctor-doom', dresses: [{ card: 'Doctor Doom' }, { seat: 'villain' }], exposure: 7.491 },
    { slug: 'doctor-doom-v2', dresses: [{ card: 'Doctor Doom' }] },
    { slug: 'hulk', dresses: [{ card: 'Hulk, Gamma Goliath' }, { card: 'Hulk, Brutal Brawler' }], exposure: 1 },
    { slug: 'nick-fury', disabled: 'its jacket is akimbo' },
    { slug: 'peggy', disabled: true },
    { slug: 'wasp', check: 'fail' },
    { slug: 'coulson', check: 'none' },
    { slug: 'quake', check: 'stale' },
    { slug: 'phase-one', version: 1 },
    { slug: 'no-model', model: false },
    { slug: 'director', dresses: [{ seat: 'you' }] },
    { slug: 'Bad Slug' },
    // Over a per-model cap (D195): skipped HERE, with why, and shadowing nothing —
    // 'a-big-doom' sorts before 'doctor-doom' and dresses the same card.
    { slug: 'a-big-doom', dresses: [{ card: 'Doctor Doom' }], triangles: PERSONAL_TRI_CAP + 1 },
    // D240: a file of two primitives — Doom as he was prepared before the atlas held every paint.
    { slug: 'many-paints', paints: PERSONAL_CALL_CAP + 1 },
    { slug: 'not-a-glb', junk: true },
  ]);
  try {
    const index = buildPersonalIndex(REPO, { dir, seatLooks: LOOKS });
    assert.equal(index.version, 1);
    assert.deepEqual(index.models.map((m) => m.slug), ['director', 'doctor-doom', 'hulk']);
    const doom = index.models.find((m) => m.slug === 'doctor-doom')!;
    assert.deepEqual([doom.cards, doom.seats, doom.model, doom.calls], [['Doctor Doom'], ['opp'], 'personal/models/doctor-doom/model.glb', 1]);
    assert.equal(index.models.find((m) => m.slug === 'hulk')!.calls, 1, 'one draw call a figure, counted in the file');
    assert.deepEqual(index.models.find((m) => m.slug === 'director')!.seats, ['you']);
    const why = Object.fromEntries(index.skipped.map((s) => [s.slug, s.why]));
    assert.match(why['doctor-doom-v2'] ?? '', /shadowed for Doctor Doom \(kept by doctor-doom\)/);
    assert.match(why['nick-fury'] ?? '', /^disabled: its jacket is akimbo$/);
    assert.match(why['peggy'] ?? '', /^disabled$/);
    assert.match(why['wasp'] ?? '', /failed tools\/personal\/check\.mjs \(1 assertion\(s\)\) — never loaded/);
    assert.match(why['coulson'] ?? '', /never checked/);
    assert.match(why['quake'] ?? '', /changed since it was checked/);
    assert.match(why['phase-one'] ?? '', /phase 1/);
    assert.match(why['no-model'] ?? '', /no model\.glb/);
    assert.match(why['Bad Slug'] ?? '', /not a slug/);
    assert.match(why['a-big-doom'] ?? '', new RegExp(`^${String(PERSONAL_TRI_CAP + 1)} triangles, over PERSONAL_TRI_CAP \\(${String(PERSONAL_TRI_CAP)}\\) — never loaded`));
    assert.match(why['many-paints'] ?? '', /^2 primitive\(s\) under 2 material\(s\) — 2 draw calls a figure, over PERSONAL_CALL_CAP \(1\): prepared before D240 .* run tools\/personal\/prepare\.mjs again, then check\.mjs$/);
    assert.match(why['not-a-glb'] ?? '', /not a glTF binary/);
    const lines = describeIndex(index);
    assert.match(lines[0] ?? '', /3 active model\(s\), 12 skipped/);
    assert.ok(lines.some((l) => /^ {2}skipped {2}a-big-doom: \d+ triangles, over PERSONAL_TRI_CAP/.test(l)), 'the start lines list an over-cap model as skipped, with why');
    // D198: the start lines say how each model's paint was exposed, and which was never exposed.
    assert.ok(lines.some((l) => /^ {2}active {3}doctor-doom: .*, exposed ×7\.491$/.test(l)), lines.join('\n'));
    assert.ok(lines.some((l) => /^ {2}active {3}hulk: .* 1 draw call\(s\) a figure$/.test(l)), 'a gain of 1 says nothing');
    assert.ok(lines.some((l) => /^ {2}active {3}director: .*never exposed: prepare it again \(D198\)$/.test(l)));
    // No folder at all is an empty index, not an error.
    assert.deepEqual(buildPersonalIndex(REPO, { dir: join(dir, 'nowhere'), seatLooks: LOOKS }).models, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('personal: the route — the index, an active model’s model.glb and manifest.json, and nothing else; no-store; not ours goes next', async () => {
  const dir = fakeTier([{ slug: 'doctor-doom', dresses: [{ card: 'Doctor Doom' }] }, { slug: 'nick-fury', disabled: true }]);
  const { handle } = createPersonalMiddleware(REPO, { dir, seatLooks: LOOKS });
  const server = createServer((req, res) =>
    handle(req, res, () => {
      res.statusCode = 418;
      res.end();
    }),
  );
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  const address = server.address();
  const origin = `http://127.0.0.1:${String(typeof address === 'object' && address !== null ? address.port : 0)}`;
  try {
    const index = await fetch(`${origin}/personal/index.json`);
    assert.equal(index.status, 200);
    assert.equal(index.headers.get('cache-control'), 'no-store');
    const body = (await index.json()) as { models: Array<{ slug: string }> };
    assert.deepEqual(body.models.map((m) => m.slug), ['doctor-doom']);
    const glb = await fetch(`${origin}/personal/models/doctor-doom/model.glb`);
    assert.equal(glb.status, 200);
    assert.equal(glb.headers.get('content-type'), 'model/gltf-binary');
    assert.equal(glb.headers.get('cache-control'), 'no-store');
    assert.deepEqual(Buffer.from(await glb.arrayBuffer()), fakeGlb('doctor-doom'));
    assert.equal((await fetch(`${origin}/personal/models/doctor-doom/manifest.json`)).status, 200);
    for (const path of [
      '/personal/models/doctor-doom/SOURCE.txt',
      '/personal/models/doctor-doom/check.json',
      '/personal/models/doctor-doom/preview/front.png',
      '/personal/models/nick-fury/model.glb',
      '/personal/models/%2e%2e/doctor-doom/model.glb',
      '/personal/models/doctor-doom%2f..%2f..%2fpackage.json/model.glb',
      '/personal/models/Doctor-Doom/model.glb',
      '/personal/anything',
    ]) {
      assert.equal((await fetch(`${origin}${path}`)).status, 404, path);
    }
    assert.equal((await fetch(`${origin}/fixtures/games/g1.jsonl`)).status, 418, 'not ours: handed to the next middleware');
  } finally {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

const RELIEF_A = '1f98293e-9d94-4185-8546-8beaf281dfa3';
const RELIEF_B = '9b1f213a-e1d4-4a0f-954b-c83915698d98';
const RELIEF_BOX = { left: 0.08, right: 0.92, top: 0.112, bottom: 0.555 };

/** A synthetic relief cache: an index as `relief.mjs` writes it, and what else lies in the folder. */
function fakeRelief(): string {
  const dir = mkdtempSync(join(tmpdir(), 'mtg-relief-route-'));
  const entry = (id: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
    card: `the card ${id.slice(0, 4)}`,
    file: `${id}.png`,
    width: 410,
    height: 301,
    bytes: 20000,
    model: 'depth-anything/Depth-Anything-V2-Small-hf',
    box: RELIEF_BOX,
    source: 'library',
    sourceSha256: '0'.repeat(64),
    ...extra,
  });
  writeFileSync(
    join(dir, 'index.json'),
    JSON.stringify({
      version: 1,
      model: 'depth-anything/Depth-Anything-V2-Small-hf',
      reliefs: {
        // D227: a map with its back layer, made with this recipe (D228)…
        [RELIEF_A]: entry(RELIEF_A, { back: `${RELIEF_A}.back.jpg`, backWidth: 560, backHeight: 451, backBytes: 30000, recipe: { version: RELIEF_MAP_VERSION } }),
        // …a map and a back layer made with the recipe before the keep mask (D228): the map is served, its back is not
        '55555555-5555-5555-5555-555555555555': entry('55555555-5555-5555-5555-555555555555', { back: '55555555-5555-5555-5555-555555555555.back.jpg', backWidth: 560, backHeight: 451, recipe: { version: RELIEF_MAP_VERSION - 1 } }),
        // …listed, but its file is missing (and it names no back layer: a map made before D227)
        [RELIEF_B]: entry(RELIEF_B),
        // …a back layer that is not <id>.back.jpg: the map is served, its "back" is not
        '44444444-4444-4444-4444-444444444444': entry('44444444-4444-4444-4444-444444444444', { back: '../models/doctor-doom/model.glb', backWidth: 560, backHeight: 451 }),
        'not-an-id': entry('not-an-id'),
        '11111111-1111-1111-1111-111111111111': entry('11111111-1111-1111-1111-111111111111', { file: '../models/doctor-doom/model.glb' }),
        '22222222-2222-2222-2222-222222222222': entry('22222222-2222-2222-2222-222222222222', { box: null }),
      },
    }),
  );
  writeFileSync(join(dir, `${RELIEF_A}.png`), 'depth-map-a');
  writeFileSync(join(dir, `${RELIEF_A}.back.jpg`), 'back-layer-a');
  writeFileSync(join(dir, '44444444-4444-4444-4444-444444444444.png'), 'depth-map-4');
  writeFileSync(join(dir, '55555555-5555-5555-5555-555555555555.png'), 'depth-map-5, recipe 2');
  writeFileSync(join(dir, '55555555-5555-5555-5555-555555555555.back.jpg'), 'back-layer-5, recipe 2');
  // On disk beside a map that names no back layer: never served.
  writeFileSync(join(dir, `${RELIEF_B}.back.jpg`), 'back-layer-b, unlisted');
  writeFileSync(join(dir, '22222222-2222-2222-2222-222222222222.png'), 'boxless');
  // On disk and never served: an unlisted map, the kept card image, the Python caches.
  writeFileSync(join(dir, '33333333-3333-3333-3333-333333333333.png'), 'unlisted');
  mkdirSync(join(dir, 'source'));
  writeFileSync(join(dir, 'source', `${RELIEF_A}.jpg`), 'card art, never served');
  mkdirSync(join(dir, '.cache', 'tmp'), { recursive: true });
  writeFileSync(join(dir, '.cache', 'tmp', 'x'), 'x');
  return dir;
}

test('personal: the relief cache (D225, D227, D228) — its index read per request and cut down to what the page needs, a map it lists and its back layer (this recipe’s only) served, nothing else; no-store', async () => {
  const models = fakeTier([]);
  const reliefDir = fakeRelief();
  const { handle } = createPersonalMiddleware(REPO, { dir: models, reliefDir, seatLooks: LOOKS });
  const server = createServer((req, res) =>
    handle(req, res, () => {
      res.statusCode = 418;
      res.end();
    }),
  );
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  const address = server.address();
  const origin = `http://127.0.0.1:${String(typeof address === 'object' && address !== null ? address.port : 0)}`;
  try {
    const index = await fetch(`${origin}/personal/relief/index.json`);
    assert.equal(index.status, 200);
    assert.equal(index.headers.get('cache-control'), 'no-store');
    const body = (await index.json()) as { version: number; model: string; reliefs: Record<string, Record<string, unknown>> };
    assert.equal(body.version, 1);
    assert.deepEqual(
      Object.keys(body.reliefs),
      [RELIEF_A, '55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444'],
      'only a Scryfall id, as <id>.png, on disk, with a size and a box',
    );
    assert.deepEqual(
      body.reliefs[RELIEF_A],
      { file: `${RELIEF_A}.png`, width: 410, height: 301, box: RELIEF_BOX, back: { file: `${RELIEF_A}.back.jpg`, width: 560, height: 451 }, standee: null },
      'the card, the source, the recipe and the timings stay on disk (and a map that is not a PNG stands no standee, D260)',
    );
    assert.equal(body.reliefs['44444444-4444-4444-4444-444444444444']?.['back'], null, 'a back layer that is not <id>.back.jpg is not served');
    assert.equal(
      body.reliefs['55555555-5555-5555-5555-555555555555']?.['back'],
      null,
      'a map made with an older recipe is served without its back layer — its blue is not the keep mask (D228) — and the page draws it flat',
    );
    const back = await fetch(`${origin}/personal/relief/${RELIEF_A}.back.jpg`);
    assert.equal(back.status, 200);
    assert.equal(back.headers.get('content-type'), 'image/jpeg');
    assert.equal(back.headers.get('cache-control'), 'no-store');
    assert.equal(Buffer.from(await back.arrayBuffer()).toString(), 'back-layer-a');
    const map = await fetch(`${origin}/personal/relief/${RELIEF_A}.png`);
    assert.equal(map.status, 200);
    assert.equal(map.headers.get('content-type'), 'image/png');
    assert.equal(map.headers.get('cache-control'), 'no-store');
    assert.equal(Buffer.from(await map.arrayBuffer()).toString(), 'depth-map-a');
    for (const path of [
      `/personal/relief/${RELIEF_B}.png`,
      '/personal/relief/33333333-3333-3333-3333-333333333333.png',
      '/personal/relief/22222222-2222-2222-2222-222222222222.png',
      `/personal/relief/source/${RELIEF_A}.jpg`,
      '/personal/relief/.cache/tmp/x',
      `/personal/relief/${RELIEF_A.toUpperCase()}.png`,
      `/personal/relief/%2e%2e/models/${RELIEF_A}.png`,
      `/personal/relief/..%2f${RELIEF_A}.png`,
      '/personal/relief/index.json.bak',
      '/personal/relief/',
      // D227: a back layer only when the index lists it, and only as <id>.back.jpg
      `/personal/relief/${RELIEF_B}.back.jpg`,
      '/personal/relief/44444444-4444-4444-4444-444444444444.back.jpg',
      `/personal/relief/${RELIEF_A}.back.png`,
      `/personal/relief/${RELIEF_A}.jpg`,
      `/personal/relief/${RELIEF_A}.back.jpg.part`,
      `/personal/relief/source/${RELIEF_A}.back.jpg`,
      // D228: an older recipe's back layer, on disk and listed, is not served
      '/personal/relief/55555555-5555-5555-5555-555555555555.back.jpg',
    ]) {
      const res = await fetch(`${origin}${path}`);
      assert.equal(res.status, 404, path);
      assert.equal(res.headers.get('cache-control'), 'no-store', path);
    }
    // Read per request: a map relief.mjs adds while the server runs is served on the next ask.
    writeFileSync(join(reliefDir, `${RELIEF_B}.png`), 'depth-map-b');
    const again = (await (await fetch(`${origin}/personal/relief/index.json`)).json()) as { reliefs: Record<string, unknown> };
    assert.deepEqual(Object.keys(again.reliefs).sort(), [RELIEF_A, RELIEF_B, '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555'].sort());
    assert.equal((await fetch(`${origin}/personal/relief/${RELIEF_B}.png`)).status, 200);
    assert.equal((await fetch(`${origin}/personal/relief/${RELIEF_B}.back.jpg`)).status, 404, 'a map made before the back layer has none to serve');
    assert.equal((await fetch(`${origin}/personal/index.json`)).status, 200, 'the models’ index is still the models’');
    assert.equal((await fetch(`${origin}/fixtures/games/g1.jsonl`)).status, 418, 'not ours: handed to the next middleware');
    assert.match(
      describeRelief(buildReliefIndex(reliefDir)),
      /^personal relief: 4 depth map\(s\) for the workshop's inspect view and 0 standee cut\(s\).*; 3 made before the back layer or with an older recipe than version 3 \(D227, D228\), drawn flat/,
    );
    // No folder, or no index: an empty one, not an error.
    assert.deepEqual(buildReliefIndex(join(reliefDir, 'nowhere')), { version: 1, model: null, reliefs: {} });
  } finally {
    server.close();
    rmSync(models, { recursive: true, force: true });
    rmSync(reliefDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 3. The overlay reader
// ---------------------------------------------------------------------------

test('personal: personalOverlayOf — THE reader: opaque ids, the caps, the seats by look, a path that could leave the origin refused', () => {
  const overlay = personalOverlayOf({
    version: 1,
    models: [
      { slug: 'doctor-doom', model: 'personal/models/doctor-doom/model.glb', cards: ['Doctor Doom'], seats: ['opp'], triangles: 5996, calls: 1, credits: 'c' },
      { slug: 'too-big', model: 'personal/models/too-big/model.glb', cards: ['Big'], seats: [], triangles: PERSONAL_TRI_CAP + 1, calls: 1 },
      { slug: 'too-many', model: 'personal/models/too-many/model.glb', cards: ['Many'], seats: [], triangles: 10, calls: PERSONAL_CALL_CAP + 1 },
      { slug: 'offsite', model: 'https://example.com/model.glb', cards: ['Offsite'], seats: [], triangles: 10, calls: 1 },
      { slug: 'root', model: '/personal/models/x/model.glb', cards: ['Root'], seats: [], triangles: 10, calls: 1 },
      { slug: 'climb', model: 'personal/models/../../secret.glb', cards: ['Climb'], seats: [], triangles: 10, calls: 1 },
      { slug: 'second-doom', model: 'personal/models/second-doom/model.glb', cards: ['Doctor Doom', 'Hulk, Gamma Goliath'], seats: ['director'], triangles: 10, calls: 1 },
      'garbage',
    ],
    skipped: [{ slug: 'wasp', why: 'disabled' }],
  });
  assert.deepEqual(overlay.entries.map((e) => e.id), ['p0', 'p1'], 'ids are opaque and dense');
  for (const e of overlay.entries) assert.doesNotMatch(`${e.id}`, /doom|hulk|wasp/i, 'an id is never a slug');
  assert.equal(overlay.cards.get('Doctor Doom')?.id, 'p0', 'the first entry keeps a card');
  assert.equal(overlay.cards.get('Hulk, Gamma Goliath')?.id, 'p1');
  assert.equal(overlay.seats.get('opp')?.id, 'p0');
  assert.equal(overlay.seats.get('you')?.id, 'p1', 'a seat by its look (director)');
  for (const name of ['Big', 'Many', 'Offsite', 'Root', 'Climb']) assert.equal(overlay.cards.has(name), false, name);
  assert.equal(overlay.skipped.length, 6);
  assert.ok(overlay.skipped.some((s) => /PERSONAL_TRI_CAP/.test(s)) && overlay.skipped.some((s) => /PERSONAL_CALL_CAP/.test(s)));
  // D240: one draw call a figure — a two-call entry (a model prepared before the atlas held every paint) is left out.
  assert.equal(PERSONAL_CALL_CAP, 1);
  assert.ok(overlay.skipped.some((s) => /2 draw calls a figure, over PERSONAL_CALL_CAP \(1\) — prepare it again \(D240\)/.test(s)), overlay.skipped.join('; '));
  assert.deepEqual(overlay.withheld, ['disabled']);
  for (const junk of [null, 'x', { version: 2, models: [] }, { version: 1 }]) assert.equal(personalOverlayOf(junk), EMPTY_PERSONAL);
  for (const bad of ['https://x/y.glb', '//x/y.glb', '/a.glb', 'a/../b.glb', 'a//b.glb', 'a.glb?x=1', 'a.gltf', 'javascript:a.glb']) {
    assert.equal(isLocalModelPath(bad), false, bad);
  }
  assert.equal(isLocalModelPath('personal/models/doctor-doom/model.glb'), true);
});

// ---------------------------------------------------------------------------
// 4. Hard rule 8 over the corpus, made hostile
// ---------------------------------------------------------------------------

const SECRET = '\u0000personal-secret-';

/** An overlay that answers EVERY name and remembers each one it was asked. */
function spyOverlay(): { overlay: PersonalOverlay; asked: string[] } {
  const asked: string[] = [];
  const entry: PersonalEntry = { id: 'p0', url: 'personal/models/x/model.glb', triangles: 10, calls: 1, credits: '' };
  class Spy extends Map<string, PersonalEntry> {
    override get(name: string): PersonalEntry {
      asked.push(name);
      return entry;
    }
    override get size(): number {
      return 1;
    }
  }
  return { overlay: { ...EMPTY_PERSONAL, entries: [entry], cards: new Spy() }, asked };
}

/**
 * **The corpus, HOSTILE**: every back and every redacted stub gets a real name
 * (a secret), every third face-up creature or stack card is turned face down
 * with one, and one face-up creature a frame keeps the face-down empty name —
 * so a lookup that skipped a gate would ask the overlay about a secret.
 */
function hostile(placed: Layout): Layout {
  const placements: Placement[] = placed.placements.map((p) => {
    const secret = `${SECRET}${String(p.cardId)}`;
    if (p.back || isHidden(p.card)) return { ...p, card: { ...p.card, name: secret } as AnyCard };
    if ((p.kind === 'creature' || p.kind === 'stack') && p.cardId % 3 === 0) return { ...p, back: true, card: { ...p.card, name: secret } as AnyCard };
    return p;
  });
  const at = placements.findIndex((p) => p.kind === 'creature' && !p.back && !isHidden(p.card));
  if (at >= 0) placements[at] = { ...placements[at]!, card: { ...placements[at]!.card, name: '' } as AnyCard };
  return { ...placed, placements, byKey: new Map(placements.map((p) => [p.key, p])) };
}

function* corpusStates(): Generator<{ file: string; state: ClientState }> {
  for (const dir of ['games', 'synthetic']) {
    const root = join(REPO, 'fixtures', dir);
    if (!existsSync(root)) continue;
    for (const name of readdirSync(root).filter((f) => f.endsWith('.jsonl')).sort()) {
      const log = parseFrameLog(readFileSync(join(root, name), 'utf8'));
      let state = initialState();
      for (const frame of log.frames as Frame[]) {
        state = reduce(state, frame);
        if (frame.type === 'state') yield { file: `${dir}/${name}`, state };
      }
    }
  }
}

/** The lookup with its gates taken out: every placement with a pose, by its name. The negative control. */
function ungatedLookups(placed: Layout, poses: FigureLayout, overlay: PersonalOverlay): void {
  for (const p of placed.placements) {
    if (!poses.has(p.cardId)) continue;
    const name = (p.card as { name?: unknown }).name;
    if (typeof name === 'string') overlay.cards.get(name);
  }
}

test('personal: over the whole corpus made HOSTILE, the overlay is never asked about a face-down or redacted card — and a lookup without the gates is (hard rule 8, negative control)', () => {
  let frames = 0;
  let asked = 0;
  let dressed = 0;
  let ungatedLeaks = 0;
  let anonymous = 0;
  let mismatched = 0;
  for (const { file, state } of corpusStates()) {
    frames += 1;
    const plain = layout(state);
    const plainPoses = figurePose(plain, state.board?.combat ?? null, DATA, { models: MODELS });
    const turned = hostile(plain);
    // Three pairings: the frame as it is; the hostile frame with its own poses (a back is anonymous there,
    // so the POSE gate stops it); and the hostile placements under the PLAIN poses — a named, modelled pose
    // on a placement drawn as a back or a stub, which only the PLACEMENT gate stops.
    for (const [placed, given] of [
      [plain, plainPoses],
      [turned, null],
      [turned, plainPoses],
    ] as const) {
      const poses = given ?? figurePose(placed, state.board?.combat ?? null, DATA, { models: MODELS });
      const spy = spyOverlay();
      const choices = personalChoicesOf(placed, poses, spy.overlay, Number.POSITIVE_INFINITY);
      for (const name of spy.asked) {
        assert.ok(name !== '' && !name.startsWith(SECRET), `${file}: the overlay was asked about a concealed name`);
      }
      asked += spy.asked.length;
      for (const [cardId] of choices) {
        const p = placed.placements.find((x) => x.cardId === cardId && (x.kind === 'creature' || x.kind === 'stack'))!;
        assert.ok(!p.back && !isHidden(p.card), `${file}: card ${String(cardId)} was dressed as a back or a stub`);
        const pose = poses.get(cardId)!;
        assert.ok(!pose.anonymous && pose.modelId !== null, `${file}: an anonymous or modelless figure was dressed`);
        dressed += 1;
      }
      if (given !== null && placed === turned) {
        // The pairing only the placement gate stops has to OFFER it a case, or it proves nothing.
        mismatched += placed.placements.filter((p) => (p.back || isHidden(p.card)) && poses.get(p.cardId)?.anonymous === false).length;
      }
      for (const pose of poses.values()) if (pose.anonymous) anonymous += 1;
      const control = spyOverlay();
      ungatedLookups(placed, poses, control.overlay);
      ungatedLeaks += control.asked.filter((name) => name === '' || name.startsWith(SECRET)).length;
    }
  }
  console.log(
    `personal: ${String(frames)} corpus frames (× plain, hostile, hostile under the plain poses) — ${String(asked)} face-up names looked up, ${String(dressed)} figures dressed, ` +
      `${String(anonymous)} anonymous figures and ${String(mismatched)} named poses on a back or a stub never asked about; the ungated lookup asked about ${String(ungatedLeaks)} concealed names`,
  );
  assert.ok(mismatched > 100, 'the pairing only the placement gate stops offered it no case');
  assert.ok(frames > 1000, `expected the committed corpus, saw ${String(frames)} frames`);
  assert.ok(asked > 1000 && dressed > 1000, 'the sweep looked nothing up — it proves nothing');
  assert.ok(anonymous > 100, 'the corpus offered no anonymous figure');
  assert.ok(ungatedLeaks > 100, 'the negative control: a lookup without the gates must ask about concealed names over this corpus');
});

test('personal: THE lookup on its own — the pose’s gates before the name, the card’s after, and the count cap', () => {
  const card = (id: number, name: string, extra: Record<string, unknown> = {}): AnyCard =>
    ({ id, name, zone: 'battlefield', owner: 0, controller: 0, types: 'Creature - Human', power: '2', toughness: '2', ...extra }) as unknown as AnyCard;
  const place = (id: number, c: AnyCard, back = false): Placement =>
    ({ key: `c:${String(id)}`, cardId: id, card: c, kind: 'creature', back, seat: 'you' }) as unknown as Placement;
  const pose = (id: number, over: Partial<FigurePose> = {}): FigurePose =>
    ({ cardId: id, anonymous: false, modelId: 'agent', silhouette: null, swarm: 0, vehicle: false, ...over }) as unknown as FigurePose;
  const placed = {
    placements: [
      place(1, card(1, 'Doctor Doom')),
      place(2, card(2, 'Doctor Doom'), true),
      place(3, { id: 3, zone: 'battlefield', owner: 0, controller: 0, hidden: true, name: 'Doctor Doom' } as unknown as AnyCard),
      place(4, card(4, 'Doctor Doom')),
      place(5, card(5, 'Doctor Doom')),
      place(6, card(6, 'Doctor Doom')),
      place(7, card(7, 'Doctor Doom')),
    ],
    byKey: new Map(),
    viewerId: 0,
    bobbing: false,
  } as unknown as Layout;
  const poses: FigureLayout = new Map([
    [1, pose(1)],
    [2, pose(2)],
    [3, pose(3)],
    [4, pose(4, { anonymous: true, modelId: null })],
    [5, pose(5, { swarm: 3 })],
    [6, pose(6, { silhouette: 'carrier' })],
    [7, pose(7)],
  ]);
  const spy = spyOverlay();
  const choices = personalChoicesOf(placed, poses, spy.overlay);
  assert.deepEqual([...choices.keys()], [1, 7]);
  assert.deepEqual(spy.asked, ['Doctor Doom', 'Doctor Doom'], 'asked only for the two face-up, named, single-bodied figures');
  assert.deepEqual([...personalChoicesOf(placed, poses, spy.overlay, 1).keys()], [1], 'the count cap, in placement order');
  assert.equal(personalChoicesOf(placed, poses, EMPTY_PERSONAL).size, 0);
  assert.ok(PERSONAL_MAX_FIGURES >= 2);
});

test('personal: THE lookup spends the table’s personal triangle line — the seats first, then creatures in placement order, a smaller model later still fitting (D197)', () => {
  const card = (id: number, name: string): AnyCard =>
    ({ id, name, zone: 'battlefield', owner: 0, controller: 0, types: 'Creature - Human', power: '2', toughness: '2' }) as unknown as AnyCard;
  const place = (id: number, name: string): Placement =>
    ({ key: `c:${String(id)}`, cardId: id, card: card(id, name), kind: 'creature', back: false, seat: 'you' }) as unknown as Placement;
  const pose = (id: number): FigurePose =>
    ({ cardId: id, anonymous: false, modelId: 'agent', silhouette: null, swarm: 0, vehicle: false }) as unknown as FigurePose;
  const names = ['Big A', 'Big B', 'Big C', 'Small D', 'Big E'];
  const placed = {
    placements: names.map((n, i) => place(i + 1, n)),
    byKey: new Map(),
    viewerId: 0,
    bobbing: false,
  } as unknown as Layout;
  const poses: FigureLayout = new Map(names.map((_, i) => [i + 1, pose(i + 1)]));
  const at = (id: string, triangles: number): PersonalEntry => ({ id, url: `personal/models/${id}/model.glb`, triangles, calls: 1, credits: '' });
  const big = at('p0', PERSONAL_TRI_CAP);
  const small = at('p1', 1000);
  const seat = at('p2', PERSONAL_TRI_CAP);
  const cards = new Map<string, PersonalEntry>([
    ['Big A', big],
    ['Big B', big],
    ['Big C', big],
    ['Small D', small],
    ['Big E', big],
  ]);
  const both = { ...EMPTY_PERSONAL, entries: [big, small, seat], cards, seats: new Map([['you', seat], ['opp', seat]]) } as PersonalOverlay;
  assert.equal(seatTriangles(both), 2 * PERSONAL_TRI_CAP, 'each seat draws its own instance');
  // 36,000 − 16,000 for the seats = 20,000: two 8,000s, then Big C would cross, Small D still fits.
  const chosen = personalChoicesOf(placed, poses, both);
  assert.deepEqual([...chosen.keys()], [1, 2, 4], 'the budget in placement order, a smaller model later still fitting');
  let sum = seatTriangles(both);
  for (const e of chosen.values()) sum += e.triangles;
  assert.ok(sum <= PERSONAL_TABLE_TRIS, `${String(sum)} personal triangles on the table, over the line`);
  // No seats dressed: the count cap is what stops it.
  const noSeats = { ...both, seats: new Map() } as PersonalOverlay;
  assert.deepEqual([...personalChoicesOf(placed, poses, noSeats).keys()], [1, 2, 3, 4].slice(0, PERSONAL_MAX_FIGURES));
  // The worst case the caps allow is the line itself: both seats and the count cap, every model at its cap, never pass it.
  assert.ok(PERSONAL_TABLE_TRIS >= 2 * PERSONAL_TRI_CAP + PERSONAL_TRI_CAP, 'the line cannot hold the two duelists and one creature at the cap');
  assert.ok(PERSONAL_TABLE_TRIS < (2 + PERSONAL_MAX_FIGURES) * PERSONAL_TRI_CAP, 'the line is no line: the count and per-model caps already stop short of it');
  // An explicit budget of 0 dresses nothing.
  assert.equal(personalChoicesOf(placed, poses, both, PERSONAL_MAX_FIGURES, 0).size, 0);
});

// ---------------------------------------------------------------------------
// 5. The dressed pose
// ---------------------------------------------------------------------------

test('personal: dressPoses — only a loaded model dresses; the opaque id, no props, no costume, no hair; the width clamp strict; the same map when nothing is dressed', () => {
  const state = [...corpusStates()].find(({ state }) => (state.board?.players ?? []).some((p) => p.zones.battlefield.cards.length >= 4))!.state;
  const placed = layout(state);
  const poses = figurePose(placed, state.board?.combat ?? null, DATA, { models: MODELS });
  const person = [...poses.values()].find((p) => p.modelId !== null && !p.anonymous && p.props.length > 0 && p.costume !== null)!;
  assert.ok(person !== undefined, 'no dressed-able figure in the frame');
  const entry: PersonalEntry = { id: 'p3', url: 'personal/models/x/model.glb', triangles: 10, calls: 1, credits: '' };
  const choices = new Map([[person.cardId, entry]]);
  assert.equal(dressPoses(poses, choices, new Map()), poses, 'a model that has not loaded dresses nothing: the same map');
  assert.equal(dressPoses(poses, new Map(), new Map([['p3', { ratio: 0.5 }]])), poses);
  const wide = 3.2;
  const dressed = dressPoses(poses, choices, new Map([['p3', { ratio: wide }]]));
  assert.notEqual(dressed, poses);
  const d = dressed.get(person.cardId)!;
  assert.equal(d.personal, 'p3');
  assert.deepEqual([d.props.length, d.costume, d.hair], [0, null, null]);
  assert.ok(d.width <= FIGURE_MAX_WIDTH + 1e-9, `a wide model overflows its slot: ${String(d.width)} > ${String(FIGURE_MAX_WIDTH)}`);
  assert.ok(d.height <= person.height + 1e-9, 'the refit only ever shrinks');
  assert.deepEqual(d.position, person.position, 'the stand point is layout.ts’s');
  assert.equal(d.stance, person.stance);
  assert.equal(personalModelKey(d), d.rest === null ? 'p3' : `p3@${d.rest}`);
  assert.equal(personalModelKey(person), null);
  for (const [id, other] of dressed) if (id !== person.cardId) assert.equal(other, poses.get(id), 'an undressed pose is the same object');
});

// ---------------------------------------------------------------------------
// 6. The status layer over dressed poses
// ---------------------------------------------------------------------------

test('personal: the status strip over DRESSED poses — a dressed figure keeps its strip over its refitted height, and a back or a stub dressed on purpose still gets none (D195, D212, hard rule 8)', () => {
  // A wide model, so the refit shrinks most figures and the anchor's height is the dressed one.
  const fits = new Map([['p0', { ratio: 3.2 }]]);
  const anyone: PersonalEntry = { id: 'p0', url: 'personal/models/x/model.glb', triangles: 10, calls: 1, credits: '' };
  let frames = 0;
  let dressedStrips = 0;
  let refitted = 0;
  let offered = 0;
  for (const { file, state } of corpusStates()) {
    frames += 1;
    const plain = layout(state);
    const poses = figurePose(plain, state.board?.combat ?? null, DATA, { models: MODELS });
    for (const placed of [plain, hostile(plain)]) {
      const battlefield = new Map(placed.placements.filter((p) => p.kind !== 'stack').map((p) => [p.cardId, p]));
      // As the arena asks it: THE lookup (every name answered), then the dressing, then the strips.
      const choices = personalChoicesOf(placed, poses, spyOverlay().overlay, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
      const dressed = dressPoses(poses, choices, fits);
      const strips = statusLayout(placed, dressed);
      for (const strip of strips.values()) {
        const p = battlefield.get(strip.cardId);
        assert.ok(p !== undefined && !p.back && !isHidden(p.card) && !isFaceDown(p.card), `${file}: a strip over a concealed card #${String(strip.cardId)}`);
      }
      for (const cardId of choices.keys()) {
        const strip = strips.get(cardId);
        if (strip === undefined) continue;
        const d = dressed.get(cardId)!;
        assert.equal(d.personal, 'p0');
        assert.ok(Math.abs(strip.anchor[1] - (d.position[1] + d.height + STATUS_LIFT)) < 1e-9, `${file}: a dressed figure's strip is not over its own height`);
        dressedStrips += 1;
        if (d.height < poses.get(cardId)!.height - 1e-9) refitted += 1;
      }
      // HOSTILE dressing: every modelled pose dressed, the lookup's gates skipped. The strip's gates hold alone.
      const everyone = new Map([...poses.values()].filter((pose) => pose.modelId !== null).map((pose) => [pose.cardId, anyone]));
      const overDressed = dressPoses(poses, everyone, fits);
      const hostileStrips = statusLayout(placed, overDressed);
      for (const [cardId, pose] of overDressed) {
        const p = battlefield.get(cardId);
        if (p === undefined || pose.personal === undefined) continue;
        if (!(p.back || isHidden(p.card) || isFaceDown(p.card))) continue;
        offered += 1;
        assert.ok(!hostileStrips.has(cardId), `${file}: a back or a stub dressed on purpose drew a strip (#${String(cardId)})`);
      }
    }
  }
  console.log(
    `personal × status: ${String(frames)} corpus frames (plain and hostile) — ${String(dressedStrips)} dressed figures carry a strip, ` +
      `${String(refitted)} of them over a refitted height; ${String(offered)} backs and stubs dressed on purpose, none with a strip`,
  );
  assert.ok(frames > 1000, `expected the committed corpus, saw ${String(frames)} frames`);
  assert.ok(dressedStrips > 1000 && refitted > 100, 'no dressed figure drew a strip over a refitted height — the sweep proves nothing');
  assert.ok(offered > 100, 'the hostile dressing offered the strip no concealed card — the control proves nothing');
  // And the two callers hand the strips the DRESSED poses, declared before them (a const read in a
  // useMemo's first run would be in its temporal dead zone otherwise).
  for (const file of ['web/src/arena/Arena.tsx', 'web/src/workshop/Pedestal.tsx']) {
    const src = readFileSync(join(REPO, file), 'utf8');
    // The personal models dress first, the portrait standee (D260) over what they left.
    const dress = src.search(/const personalPoses = useMemo\(\s*\(\) => dressPoses\(basePoses,/);
    const stand = src.search(/const figures = useMemo\(\s*\(\) => dressStandees\(personalPoses,/);
    const lay = src.search(/const strips = useMemo\(\(\) => statusLayout\(placed, figures\), \[placed, figures\]\);/);
    assert.ok(dress >= 0 && stand > dress && lay > stand, `${file}: the strips are not laid out from the dressed poses`);
  }
});
