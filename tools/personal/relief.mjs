#!/usr/bin/env node
/*
 * mtg-table — tools/personal/relief.mjs
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The relief cache: a depth map of every card's painting** (D225; the
 * workshop's inspect view draws it as a displaced plane, D226;
 * `docs/guides/personal-tier.md`'s *The relief cache* is the manual).
 *
 *   node tools/personal/relief.mjs --all                  every card in art.json (and every personal model's card)
 *   node tools/personal/relief.mjs --card "Doctor Doom"   one card (repeatable)
 *        [--force]                 compute again what is already there
 *        [--device auto|cuda|cpu]  the GPU when torch sees one (~35 ms a card on the GTX 1080), else the CPU (~0.4–1 s)
 *        [--likeness <dir>]        the Python venv and its caches (default var/likeness, or $MTG_TABLE_LIKENESS)
 *        [--dry-run]               say what would be done; fetch nothing, run nothing, write nothing
 *
 * **PERSONAL TIER, and why.** A depth map is DERIVED FROM CARD ART, so it is
 * the personal tier's and never the repository's: it lives in the gitignored
 * `personal/relief/` beside `personal/models/`, it is never committed, never
 * published and never shown to anyone (D190's rule — the user's "this can never
 * ever ever be sold or published"), and only the Vite dev server serves it
 * (`web/src/personal/devRoute.ts`, D92's rule). It is a cache like `art.json`:
 * regenerate it, never edit it.
 *
 * What it does, per card:
 *
 *  1. **the image** — the card's `normal` image, the one `art.json` names and
 *     the workshop's inspect view draws (so the depth lines up with the painting
 *     pixel for pixel): from the card library's cache
 *     (`var/cards/images/<id>/normal.jpg`, read only) when it is there, else from
 *     `personal/relief/source/<id>.jpg` (an earlier run's copy), else FETCHED
 *     once from art.json's CDN URL through the card library's `ScryfallClient`
 *     (config.json's `scryfallUserAgent`, logged) at no more than 10 requests a
 *     second, and kept in `personal/relief/source/`;
 *  2. **the depth** — `relief_depth.py`, run with the likeness venv's python
 *     (torch, transformers < 5, Depth Anything V2 Small already in its Hugging
 *     Face cache; `HF_HUB_OFFLINE=1`, so nothing is downloaded), on the image's
 *     ART BOX (`web/src/workshop/framing.ts`'s `ART_BOX`, the crop the inspect
 *     view shows): `personal/relief/<id>.png`, 8-bit greyscale, near = 255;
 *  3. **the index** — `personal/relief/index.json`: Scryfall id → file, size,
 *     model, device, date, the art box it was cut with, where the image came
 *     from and how long it took.
 *
 * **Idempotent**: a card whose map is on disk and indexed with this model and
 * this art box is skipped; `--force` computes it again (from the kept image —
 * nothing is fetched twice).
 *
 * **It writes nothing outside `personal/relief/`** — every path goes through
 * {@link insideRelief} — and the Python step's caches are pinned too: the
 * Hugging Face, torch and XDG caches to the venv's own (`<likeness>/cache/…`,
 * read only in practice: the weights are there and the hub is offline), and
 * every other place a library might write (CUDA's JIT cache, TMPDIR, even HOME)
 * to `personal/relief/.cache/`. Bytecode is never written (`PYTHONDONTWRITEBYTECODE`).
 *
 * Run from the repository root (hard rule 9).
 */

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
/** The relief cache: gitignored with the rest of `/personal/` (D190, D225). */
export const RELIEF_DIR = join(REPO, 'personal', 'relief');
export const SOURCE_DIR = join(RELIEF_DIR, 'source');
export const CACHE_DIR = join(RELIEF_DIR, '.cache');
export const INDEX_FILE = join(RELIEF_DIR, 'index.json');
/** The one model the step runs — `relief_depth.py`'s `MODEL_ID`, recorded per map. */
export const MODEL_ID = 'depth-anything/Depth-Anything-V2-Small-hf';
/** What a map is, in one line, for the index. */
export const ENCODING = '8-bit greyscale PNG the size of the art box crop, near = 255: each map its own 1st-99th percentile of relative inverse depth, blurred 1.5 px; a flat image is 255 everywhere';
/** The blur and the flat gate (`relief_depth.py` reads both from the request). */
export const BLUR_PX = 1.5;
export const FLAT_BELOW = 2.0;
/**
 * The fetch pacing: at most 10 requests in any second, one at a time — the gap
 * between two STARTS, on the client's own log, with the card library's 2 ms margin
 * for timer jitter (`BUCKET_INTERVAL_MS`). At exactly 100 ms the first `--all`
 * run measured 11 starts in one second (a timer firing a millisecond early).
 */
export const FETCH_GAP_MS = 102;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Is this a Scryfall id — the only thing a relief file may be named by. */
export function isScryfallId(id) {
  return typeof id === 'string' && UUID.test(id);
}

/**
 * **The write guard.** Every path this tool writes goes through it: inside
 * `personal/relief/`, or the tool stops.
 */
export function insideRelief(path, root = RELIEF_DIR) {
  const full = resolve(root, path);
  if (full !== root && !full.startsWith(root + sep)) {
    throw new Error(`refusing to write ${full}: it is outside ${relative(REPO, root) || root}/`);
  }
  return full;
}

/** `personal/relief/<id>.png`, refusing anything that is not a Scryfall id. */
export function reliefFileOf(id, root = RELIEF_DIR) {
  if (!isScryfallId(id)) throw new Error(`not a Scryfall id: ${JSON.stringify(id)}`);
  return insideRelief(`${id}.png`, root);
}

/** Two art boxes equal to a millionth — a box moved in `framing.ts` makes every map stale. */
export function sameBox(a, b) {
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
  return ['left', 'right', 'top', 'bottom'].every((k) => typeof a[k] === 'number' && typeof b[k] === 'number' && Math.abs(a[k] - b[k]) < 1e-6);
}

/**
 * **Which cards**: `--all` is every card `art.json` indexes plus every card a
 * personal model's manifest dresses (a model's card missing from `art.json` is
 * reported — `tools/fetch-art.ts` is the tool that adds it); `--card` names
 * them. Pure over its inputs: `web/test/relief.test.ts` drives it.
 */
export function selectCards(art, personalCards, { all, names }) {
  const cards = art?.cards ?? {};
  const byLower = new Map(Object.keys(cards).map((n) => [n.toLowerCase(), n]));
  const wanted = all ? [...Object.keys(cards), ...personalCards] : names;
  const out = [];
  const missing = [];
  const seen = new Set();
  for (const asked of wanted) {
    const name = cards[asked] !== undefined ? asked : byLower.get(String(asked).toLowerCase());
    const entry = name === undefined ? undefined : cards[name];
    if (name === undefined || entry === undefined || !isScryfallId(entry.scryfallId) || typeof entry.front !== 'string') {
      if (!missing.includes(asked)) missing.push(asked);
      continue;
    }
    if (seen.has(entry.scryfallId)) continue;
    seen.add(entry.scryfallId);
    out.push({ name, id: entry.scryfallId, front: entry.front });
  }
  return { cards: out, missing };
}

/** Is this card's map current: on disk, indexed, this model, this art box? */
export function isCurrent(index, id, box, root = RELIEF_DIR) {
  const entry = index?.reliefs?.[id];
  if (entry === undefined || entry.model !== MODEL_ID || !sameBox(entry.box, box)) return false;
  const file = reliefFileOf(id, root);
  return existsSync(file) && statSync(file).size > 0;
}

/** The cards every personal model's manifest dresses (read only; the manifests are the user's). */
export function personalCardsOf(modelsDir = join(REPO, 'personal', 'models')) {
  const out = [];
  if (!existsSync(modelsDir)) return out;
  for (const slug of readdirSync(modelsDir).sort()) {
    try {
      const manifest = JSON.parse(readFileSync(join(modelsDir, slug, 'manifest.json'), 'utf8'));
      for (const d of Array.isArray(manifest.dresses) ? manifest.dresses : []) {
        if (typeof d?.card === 'string' && !out.includes(d.card)) out.push(d.card);
      }
    } catch {
      // No manifest yet: nothing it dresses.
    }
  }
  return out;
}

/** Write a file through `.part` + rename, inside the relief folder only. */
function writeAtomic(path, bytes) {
  const full = insideRelief(path);
  mkdirSync(dirname(full), { recursive: true });
  const part = insideRelief(`${full}.${String(process.pid)}.part`);
  writeFileSync(part, bytes);
  renameSync(part, full);
}

function readIndex() {
  try {
    const raw = JSON.parse(readFileSync(INDEX_FILE, 'utf8'));
    if (raw?.version === 1 && typeof raw.reliefs === 'object' && raw.reliefs !== null) return raw;
  } catch {
    // none yet, or unreadable: start again (every map on disk is re-indexed as it is recomputed)
  }
  return { version: 1, reliefs: {} };
}

function folderBytes(dir) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    total += s.isDirectory() ? folderBytes(full) : s.size;
  }
  return total;
}

const realSleep = (ms) => new Promise((done) => setTimeout(done, ms));

/**
 * **One image, through the card library's client, paced.** No more than 10
 * requests in any second, one at a time — the CDN is not rate-limited and the
 * client does not pace its file bucket, so this does: it waits until
 * {@link FETCH_GAP_MS} after the previous request's START, as the client logged
 * it, on the client's own clock. Checked before it is kept: a 200, an image, a
 * body, and exactly `Content-Length` bytes when the server sent one. `sleep` and
 * `now` are the test's to fake (`web/test/relief.test.ts`).
 */
export async function fetchImage(client, url, { sleep = realSleep, now = Date.now } = {}) {
  const previous = client.log.at(-1);
  if (previous !== undefined) {
    for (let wait = previous.t + FETCH_GAP_MS - now(); wait > 0; wait = previous.t + FETCH_GAP_MS - now()) await sleep(wait);
  }
  const response = await client.request(url, { accept: 'image/jpeg,image/*;q=0.8' });
  const type = response.headers.get('content-type') ?? '';
  const bytes = Buffer.from(await response.arrayBuffer());
  const expected = Number.parseInt(response.headers.get('content-length') ?? '', 10);
  if (!response.ok || !type.startsWith('image/') || bytes.length === 0 || (Number.isFinite(expected) && bytes.length !== expected)) {
    throw new Error(`HTTP ${String(response.status)} ${type}, ${String(bytes.length)} B`);
  }
  return bytes;
}

function parseArgs(argv) {
  const out = { all: false, names: [], force: false, device: 'auto', likeness: process.env['MTG_TABLE_LIKENESS'] ?? join(REPO, 'var', 'likeness'), dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === '--all') out.all = true;
    else if (a === '--card') out.names.push(value());
    else if (a === '--force') out.force = true;
    else if (a === '--device') out.device = value();
    else if (a === '--likeness') out.likeness = resolve(value());
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`unknown argument ${a}`);
  }
  if (!['auto', 'cuda', 'cpu'].includes(out.device)) throw new Error(`--device is auto, cuda or cpu, not ${out.device}`);
  return out;
}

/**
 * The environment the Python step runs in: offline, and every cache pinned (see
 * the header) — the model's caches to the venv's own, everything else a library
 * might write to `cacheDir` (the CLI's is `personal/relief/.cache/`; the test's a
 * temp dir). Nothing of the caller's environment is passed on but `PATH` and `LANG`.
 */
export function pythonEnv(likeness, cacheDir = CACHE_DIR) {
  const cache = (name) => join(cacheDir, name);
  return {
    PATH: process.env['PATH'] ?? '/usr/bin:/bin',
    LANG: process.env['LANG'] ?? 'C.UTF-8',
    HOME: cache('home'),
    HF_HOME: join(likeness, 'cache', 'hf'),
    TORCH_HOME: join(likeness, 'cache', 'torch'),
    XDG_CACHE_HOME: join(likeness, 'cache', 'xdg'),
    HF_HUB_OFFLINE: '1',
    TRANSFORMERS_OFFLINE: '1',
    HF_HUB_DISABLE_TELEMETRY: '1',
    PYTHONDONTWRITEBYTECODE: '1',
    PYTHONNOUSERSITE: '1',
    CUDA_CACHE_PATH: cache('cuda'),
    TMPDIR: cache('tmp'),
    MPLCONFIGDIR: cache('mpl'),
    TRITON_CACHE_DIR: cache('triton'),
    XDG_CONFIG_HOME: cache('config'),
    XDG_DATA_HOME: cache('data'),
  };
}

/** Run the Python step over `jobs`; resolve with every JSON line it printed. */
export function runDepth({ python, jobs, device, env, outDir, blurPx = BLUR_PX, flatBelow = FLAT_BELOW, onLine = () => {} }) {
  return new Promise((done, fail) => {
    for (const dir of [env.HOME, env.CUDA_CACHE_PATH, env.TMPDIR, env.MPLCONFIGDIR, env.TRITON_CACHE_DIR, env.XDG_CONFIG_HOME, env.XDG_DATA_HOME]) {
      if (dir !== undefined) mkdirSync(dir, { recursive: true });
    }
    const script = join(REPO, 'tools', 'personal', 'relief_depth.py');
    const child = spawn(python, [script, '--out-dir', outDir, '--device', device], { env, stdio: ['pipe', 'pipe', 'pipe'] });
    const lines = [];
    let buffer = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      buffer += String(chunk);
      let nl;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (line === '') continue;
        try {
          const obj = JSON.parse(line);
          lines.push(obj);
          onLine(obj);
        } catch {
          // a library printed to stdout; not ours
        }
      }
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', fail);
    child.on('close', (code) => done({ code, lines, stderr }));
    child.stdin.end(JSON.stringify({ jobs, blurPx, flatBelow }));
  });
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`relief: ${String(error.message ?? error)}`);
    process.exit(2);
  }
  if (args.help || (!args.all && args.names.length === 0)) {
    console.log('usage: node tools/personal/relief.mjs --all | --card "<name>" [--card …] [--force] [--device auto|cuda|cpu] [--likeness <dir>] [--dry-run]');
    process.exit(args.help ? 0 : 2);
  }
  if (resolve(process.cwd()) !== REPO) {
    console.error(`relief: run from the repository root, ${REPO} (hard rule 9)`);
    process.exit(2);
  }
  const t0 = Date.now();
  const { ART_BOX } = await import(pathToFileURL(join(REPO, 'web/src/workshop/framing.ts')).href);
  const box = { left: ART_BOX.left, right: ART_BOX.right, top: ART_BOX.top, bottom: ART_BOX.bottom };
  let art;
  try {
    art = JSON.parse(readFileSync(join(REPO, 'web/public/art.json'), 'utf8'));
  } catch {
    console.error('relief: no web/public/art.json — run `node tools/fetch-art.ts` first (it is the card list and the image URLs)');
    process.exit(2);
  }
  const personalCards = personalCardsOf();
  const { cards, missing } = selectCards(art, personalCards, { all: args.all, names: args.names });
  for (const name of missing) console.log(`  missing  ${name}: not in web/public/art.json — run \`node tools/fetch-art.ts\` for it`);
  const index = readIndex();
  const todo = cards.filter((c) => args.force || !isCurrent(index, c.id, box));
  console.log(`relief: ${String(cards.length)} card(s), ${String(cards.length - todo.length)} current, ${String(todo.length)} to compute (personal tier, D225 — never committed)`);
  if (todo.length === 0) process.exit(missing.length > 0 && !args.all ? 1 : 0);

  // 1. The images: the card library's cache, an earlier run's copy, or one fetch.
  const { imagePathFor, isCached } = await import(pathToFileURL(join(REPO, 'tools/card-library/store.ts')).href);
  const { libraryPaths, userAgent, userAgentWarning } = await import(pathToFileURL(join(REPO, 'tools/card-library/config.ts')).href);
  const { ScryfallClient, rateStats } = await import(pathToFileURL(join(REPO, 'tools/card-library/scryfall.ts')).href);
  const images = libraryPaths(REPO).imagesDir;
  let client = null;
  const sources = new Map();
  const origin = { library: 0, kept: 0, fetched: 0 };
  for (const card of todo) {
    const library = imagePathFor(images, card.id, 'normal');
    const kept = insideRelief(join(SOURCE_DIR, `${card.id}.jpg`));
    if (isCached(library)) {
      sources.set(card.id, { path: library, from: 'library' });
      origin.library += 1;
      continue;
    }
    if (isCached(kept)) {
      sources.set(card.id, { path: kept, from: 'kept' });
      origin.kept += 1;
      continue;
    }
    if (args.dryRun) {
      console.log(`  would fetch  ${card.name}: ${card.front}`);
      continue;
    }
    if (client === null) {
      client = new ScryfallClient({ userAgent: userAgent(REPO) });
      const warning = userAgentWarning(client.userAgent);
      if (warning !== null) console.log(`  ${warning}`);
    }
    try {
      const bytes = await fetchImage(client, card.front);
      writeAtomic(kept, bytes);
      sources.set(card.id, { path: kept, from: 'fetched' });
      origin.fetched += 1;
    } catch (error) {
      console.log(`  failed   ${card.name}: the image did not arrive (${String(error.message ?? error)})`);
    }
  }
  if (client !== null) {
    for (const s of rateStats(client.log)) {
      console.log(`  scryfall ${s.bucket}: ${String(s.requests)} request(s), at most ${String(s.maxInAnySecond)} in any second, smallest gap ${String(s.minGapMs)} ms, statuses ${JSON.stringify(s.statuses)}`);
    }
  }
  const jobs = todo
    .filter((c) => sources.has(c.id))
    .map((c) => ({ id: c.id, src: sources.get(c.id).path, out: reliefFileOf(c.id), box }));
  if (args.dryRun) {
    for (const job of jobs) console.log(`  would compute  ${todo.find((c) => c.id === job.id)?.name}: ${relative(REPO, job.src)} → ${relative(REPO, job.out)}`);
    process.exit(0);
  }
  if (jobs.length === 0) {
    console.error('relief: no image to compute from');
    process.exit(1);
  }

  // 2. The depth, in one Python process (the model loads once).
  const python = join(args.likeness, 'venv', 'bin', 'python');
  if (!existsSync(python)) {
    console.error(`relief: no Python at ${python} — the step needs a venv with torch, transformers < 5 and the Depth Anything V2 Small weights in its Hugging Face cache (--likeness <dir>, or $MTG_TABLE_LIKENESS)`);
    process.exit(2);
  }
  mkdirSync(RELIEF_DIR, { recursive: true });
  const env = pythonEnv(args.likeness, insideRelief(CACHE_DIR));
  const nameOf = new Map(todo.map((c) => [c.id, c.name]));
  const tDepth = Date.now();
  let ready = null;
  let summary = null;
  let failed = 0;
  const { code, stderr } = await runDepth({
    python,
    jobs,
    device: args.device,
    env,
    outDir: RELIEF_DIR,
    onLine: (line) => {
      if (line.type === 'ready') {
        ready = line;
        console.log(`  model    ${line.model} on ${line.device}${line.gpu ? ` (${line.gpu})` : ''}: import ${String(line.importS)} s, load ${String(line.loadS)} s`);
      } else if (line.type === 'done') {
        const source = sources.get(line.id);
        const bytes = readFileSync(source.path);
        index.reliefs[line.id] = {
          card: nameOf.get(line.id) ?? null,
          file: `${line.id}.png`,
          width: line.width,
          height: line.height,
          bytes: line.bytes,
          model: MODEL_ID,
          device: ready?.device ?? null,
          date: new Date().toISOString(),
          box,
          crop: line.crop,
          flat: line.flat,
          ms: line.ms,
          source: source.from,
          sourceSha256: createHash('sha256').update(bytes).digest('hex'),
        };
        console.log(`  relief   ${nameOf.get(line.id)}: ${String(line.width)}×${String(line.height)}, ${String(line.ms)} ms${line.flat ? ', FLAT (no contrast in the art box)' : ''}`);
      } else if (line.type === 'error') {
        failed += 1;
        console.log(`  failed   ${nameOf.get(line.id) ?? line.id}: ${line.message}`);
      } else if (line.type === 'summary') {
        summary = line;
      } else if (line.type === 'fatal') {
        console.log(`  fatal    ${line.message}`);
      }
    },
  });
  // 3. The index — written even after a partial run, so what finished is kept.
  index.version = 1;
  index._note = 'personal tier (D225): depth maps derived from card art — gitignored, never committed, never published; regenerate with tools/personal/relief.mjs, never edit';
  index.model = MODEL_ID;
  index.encoding = ENCODING;
  index.box = box;
  writeAtomic(INDEX_FILE, `${JSON.stringify(index, null, 2)}\n`);
  if (ready === null) {
    const tail = stderr.trim().split('\n').slice(-4).join('\n');
    console.error(`relief: the Python step did not start (exit ${String(code)}):\n${tail}`);
    if (/offline|LocalEntryNotFoundError|couldn't connect|not.*cached/i.test(stderr)) {
      console.error(`relief: the model's weights are not in ${env.HF_HOME} — this tool never downloads them`);
    }
    process.exit(1);
  }
  const depthS = (Date.now() - tDepth) / 1000;
  const size = folderBytes(RELIEF_DIR);
  console.log(
    `relief: ${String(summary?.done ?? 0)} computed, ${String(failed)} failed — images ${String(origin.library)} from the card library, ${String(origin.kept)} kept, ${String(origin.fetched)} fetched; ` +
      `depth ${depthS.toFixed(1)} s (median ${String(summary?.inferMsMedian)} ms a card on ${String(ready.device)}), total ${((Date.now() - t0) / 1000).toFixed(1)} s; personal/relief/ is ${(size / 1024 / 1024).toFixed(2)} MiB`,
  );
  process.exit(code === 0 && failed === 0 ? 0 : 1);
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}

