/*
 * mtg-table — web/test/relief.test.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The relief cache and its reader** (D225, D226). Nothing here reads card art:
 * every image is SYNTHETIC — a gradient and a flat grey this file encodes itself
 * — and every index is written into a temp dir. What is held:
 *
 *  1. **The depth step** (`tools/personal/relief_depth.py`, CPU mode) on a
 *     generated gradient: the map is the art box's crop, 8-bit greyscale, and
 *     spans the range; on a flat grey it is flat (255 everywhere — the window)
 *     and says so; a job that names a file outside `--out-dir` writes nothing.
 *     This one needs the likeness venv, so it runs only when
 *     `MTG_TABLE_LIKENESS` names one (never by finding it under `var/`: a test
 *     whose result depends on what lies in `var/` is not a test, web/CLAUDE.md)
 *     — `docs/evidence/relief-window.md` has its run.
 *  2. **The CLI's pure half** (`tools/personal/relief.mjs`): the write guard,
 *     the file name, the card selection, what counts as current, the offline
 *     and pinned environment.
 *  3. **THE reader** (`web/src/workshop/relief.ts`'s `reliefIndexOf`) and the
 *     shaders' contract.
 */

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { crc32, deflateSync, inflateSync } from 'node:zlib';

import { RELIEF_DEPTH, RELIEF_GRID } from '../src/arena/perf.ts';
import { ART_BOX } from '../src/workshop/framing.ts';
import { RELIEF_FRAGMENT, RELIEF_VERTEX, artBoxUv, isArtBox, reliefIndexOf } from '../src/workshop/relief.ts';

interface ReliefCli {
  REPO: string;
  RELIEF_DIR: string;
  MODEL_ID: string;
  insideRelief(path: string, root?: string): string;
  reliefFileOf(id: string, root?: string): string;
  isScryfallId(id: unknown): boolean;
  sameBox(a: unknown, b: unknown): boolean;
  selectCards(
    art: unknown,
    personal: string[],
    options: { all: boolean; names: string[] },
  ): { cards: Array<{ name: string; id: string; front: string }>; missing: string[] };
  isCurrent(index: unknown, id: string, box: unknown, root?: string): boolean;
  FETCH_GAP_MS: number;
  fetchImage(client: unknown, url: string, clock?: { sleep: (ms: number) => Promise<void>; now: () => number }): Promise<Buffer>;
  pythonEnv(likeness: string, cacheDir?: string): Record<string, string>;
  runDepth(options: {
    python: string;
    jobs: unknown[];
    device: string;
    env: Record<string, string>;
    outDir: string;
    flatBelow?: number;
  }): Promise<{ code: number; lines: Array<Record<string, unknown>>; stderr: string }>;
}

const cli = (await import(new URL('../../tools/personal/relief.mjs', import.meta.url).href)) as ReliefCli;

const ID_A = '1f98293e-9d94-4185-8546-8beaf281dfa3';
const ID_B = '9b1f213a-e1d4-4a0f-954b-c83915698d98';
const BOX = { left: ART_BOX.left, right: ART_BOX.right, top: ART_BOX.top, bottom: ART_BOX.bottom };

// ---------------------------------------------------------------------------
// A PNG, both ways — no dependency: a signature, IHDR, one IDAT, IEND
// ---------------------------------------------------------------------------

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([head, body, crc]);
}

/** An 8-bit RGB PNG of `width × height`, each pixel from `rgb(x, y)`. */
function encodeRgb(width: number, height: number, rgb: (x: number, y: number) => [number, number, number]): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = rgb(x, y);
      raw[row + 1 + x * 3] = r;
      raw[row + 2 + x * 3] = g;
      raw[row + 3 + x * 3] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Decode an 8-bit GREYSCALE PNG (every filter type), or fail saying what it is. */
function decodeGrey(bytes: Buffer): { width: number; height: number; bitDepth: number; colorType: number; pixels: Uint8Array } {
  assert.deepEqual([...bytes.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'not a PNG');
  let at = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  const idat: Buffer[] = [];
  while (at < bytes.length) {
    const length = bytes.readUInt32BE(at);
    const type = bytes.toString('ascii', at + 4, at + 8);
    const data = bytes.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8]!;
      colorType = data[9]!;
    } else if (type === 'IDAT') idat.push(data);
    at += 12 + length;
  }
  const pixels = new Uint8Array(width * height);
  if (bitDepth !== 8 || colorType !== 0) return { width, height, bitDepth, colorType, pixels };
  const raw = inflateSync(Buffer.concat(idat));
  let prev = new Uint8Array(width);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (width + 1)]!;
    const line = raw.subarray(y * (width + 1) + 1, (y + 1) * (width + 1));
    const out = new Uint8Array(width);
    for (let x = 0; x < width; x++) {
      const a = x > 0 ? out[x - 1]! : 0;
      const b = prev[x]!;
      const c = x > 0 ? prev[x - 1]! : 0;
      const p = a + b - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
      const paeth = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      const pred = [0, a, b, (a + b) >> 1, paeth][filter] ?? 0;
      out[x] = (line[x]! + pred) & 0xff;
    }
    pixels.set(out, y * width);
    prev = out;
  }
  return { width, height, bitDepth, colorType, pixels };
}

test('relief: the test’s own PNG codec round-trips a greyscale image (its negative control is the colour type)', () => {
  // A greyscale PNG written by hand: the decoder reads what was written.
  const width = 5;
  const height = 3;
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) raw[y * (width + 1) + 1 + x] = x * 40 + y;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 0;
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  const read = decodeGrey(png);
  assert.deepEqual([read.width, read.height, read.bitDepth, read.colorType], [5, 3, 8, 0]);
  assert.equal(read.pixels[2 * width + 4], 4 * 40 + 2);
  // An RGB image is not a depth map: the codec says what it is instead of decoding it.
  assert.equal(decodeGrey(encodeRgb(4, 4, () => [1, 2, 3])).colorType, 2);
});

// ---------------------------------------------------------------------------
// 1. The depth step, on synthetic images (CPU)
// ---------------------------------------------------------------------------

const LIKENESS = process.env['MTG_TABLE_LIKENESS'] ?? '';
const PYTHON = LIKENESS === '' ? '' : join(LIKENESS, 'venv', 'bin', 'python');

test(
  'relief: the depth step on a generated gradient — the art box’s crop, 8-bit greyscale, the whole range; a flat grey gives a flat map at the window (and, ungated, does not); nothing outside --out-dir',
  { skip: PYTHON !== '' && existsSync(PYTHON) ? false : 'set MTG_TABLE_LIKENESS to a venv root (torch, transformers < 5, Depth Anything V2 Small cached) to run the Python step' },
  async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mtg-relief-'));
    try {
      // A card-sized image (Scryfall's `normal`, 488 × 680): a diagonal gradient with a
      // bright disc — something a depth model has an opinion about — and a flat grey.
      const W = 488;
      const H = 680;
      writeFileSync(
        join(dir, 'gradient.png'),
        encodeRgb(W, H, (x, y) => {
          const disc = Math.hypot(x - 240, y - 220) < 60 ? 90 : 0;
          const v = Math.min(255, Math.round((x / W) * 120 + (y / H) * 100) + disc);
          return [v, Math.round(v * 0.8), 255 - v];
        }),
      );
      writeFileSync(join(dir, 'flat.png'), encodeRgb(W, H, () => [128, 128, 128]));
      const out = join(dir, 'out');
      const { mkdirSync } = await import('node:fs');
      mkdirSync(out);
      const jobs = [
        { id: ID_A, src: join(dir, 'gradient.png'), out: join(out, `${ID_A}.png`), box: BOX },
        { id: ID_B, src: join(dir, 'flat.png'), out: join(out, `${ID_B}.png`), box: BOX },
        // Outside --out-dir: refused by the step itself, whatever the caller says.
        { id: 'escape', src: join(dir, 'flat.png'), out: join(dir, 'escaped.png'), box: BOX },
      ];
      const run = await cli.runDepth({ python: PYTHON, jobs, device: 'cpu', env: cli.pythonEnv(LIKENESS, join(dir, 'cache')), outDir: out });
      const byType = (type: string): Array<Record<string, unknown>> => run.lines.filter((l) => l['type'] === type);
      assert.equal(byType('ready')[0]?.['device'], 'cpu', run.stderr.slice(-2000));
      const done = new Map(byType('done').map((l) => [l['id'], l]));
      // The crop is the art box of a 488 × 680 image: 410 × 301.
      const cropW = Math.round(ART_BOX.right * W) - Math.round(ART_BOX.left * W);
      const cropH = Math.round(ART_BOX.bottom * H) - Math.round(ART_BOX.top * H);
      assert.deepEqual([cropW, cropH], [410, 301]);
      const gradient = decodeGrey(readFileSync(join(out, `${ID_A}.png`)));
      assert.deepEqual([gradient.width, gradient.height, gradient.bitDepth, gradient.colorType], [cropW, cropH, 8, 0], 'a map is the crop’s size, 8-bit greyscale');
      assert.deepEqual([done.get(ID_A)?.['width'], done.get(ID_A)?.['height'], done.get(ID_A)?.['flat']], [cropW, cropH, false]);
      const min = Math.min(...gradient.pixels);
      const max = Math.max(...gradient.pixels);
      assert.ok(min <= 8 && max >= 247, `each map is normalised to its own range (1st–99th percentile): ${String(min)}–${String(max)}`);
      const flat = decodeGrey(readFileSync(join(out, `${ID_B}.png`)));
      assert.deepEqual([flat.width, flat.height], [cropW, cropH]);
      assert.equal(done.get(ID_B)?.['flat'], true, 'a flat image is reported flat');
      assert.ok(flat.pixels.every((v) => v === 255), 'a flat image gives a flat map — 255, the window — not the depth model’s invented floor');
      assert.equal(byType('error').length, 1);
      assert.match(String(byType('error')[0]?.['message']), /refusing to write/);
      assert.ok(!existsSync(join(dir, 'escaped.png')), 'the step wrote outside --out-dir');
      assert.equal(byType('summary')[0]?.['done'], 2);
      // The negative control: without the flat gate the model is asked, and it invents a floor.
      const ungated = await cli.runDepth({
        python: PYTHON,
        jobs: [{ id: ID_B, src: join(dir, 'flat.png'), out: join(out, `${ID_B}.png`), box: BOX }],
        device: 'cpu',
        env: cli.pythonEnv(LIKENESS, join(dir, 'cache')),
        outDir: out,
        flatBelow: 0,
      });
      assert.equal(ungated.lines.find((l) => l['type'] === 'done')?.['flat'], false);
      const invented = decodeGrey(readFileSync(join(out, `${ID_B}.png`)));
      assert.ok(Math.max(...invented.pixels) - Math.min(...invented.pixels) > 100, 'ungated, a flat grey got a depth of its own — the gate is what makes it flat');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
);

// ---------------------------------------------------------------------------
// 2. The CLI's pure half
// ---------------------------------------------------------------------------

test('relief: the CLI writes only inside personal/relief/, names a map only by a Scryfall id, and runs Python offline with every cache pinned', () => {
  assert.equal(cli.RELIEF_DIR, join(cli.REPO, 'personal', 'relief'));
  assert.equal(cli.insideRelief('index.json'), join(cli.RELIEF_DIR, 'index.json'));
  assert.equal(cli.insideRelief('source/x.jpg'), join(cli.RELIEF_DIR, 'source', 'x.jpg'));
  for (const escape of ['../models/doctor-doom/model.glb', '../../web/src/x.ts', '/tmp/x.png', '..']) {
    assert.throws(() => cli.insideRelief(escape), /refusing to write/, escape);
  }
  assert.equal(cli.reliefFileOf(ID_A), join(cli.RELIEF_DIR, `${ID_A}.png`));
  for (const bad of ['../x', 'Doctor Doom', `${ID_A}/../x`, ID_A.toUpperCase(), '']) {
    assert.throws(() => cli.reliefFileOf(bad), /not a Scryfall id/, bad);
  }
  const env = cli.pythonEnv('/likeness', '/relief-cache');
  assert.equal(env['HF_HUB_OFFLINE'], '1', 'the step never downloads');
  assert.equal(env['TRANSFORMERS_OFFLINE'], '1');
  assert.equal(env['PYTHONDONTWRITEBYTECODE'], '1');
  assert.equal(env['HF_HOME'], '/likeness/cache/hf');
  assert.equal(env['TORCH_HOME'], '/likeness/cache/torch');
  assert.equal(env['XDG_CACHE_HOME'], '/likeness/cache/xdg');
  for (const key of ['HOME', 'TMPDIR', 'CUDA_CACHE_PATH', 'MPLCONFIGDIR', 'TRITON_CACHE_DIR', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME']) {
    assert.ok(env[key]?.startsWith('/relief-cache/'), `${key} is not pinned: ${String(env[key])}`);
  }
  assert.deepEqual(
    Object.keys(env).filter((k) => !['PATH', 'LANG'].includes(k) && !/^(HOME|HF_|TORCH_|XDG_|TRANSFORMERS_|PYTHON|CUDA_|TMPDIR|MPL|TRITON_)/.test(k)),
    [],
    'nothing else of the caller’s environment reaches the step',
  );
  // The committed script is what the CLI runs, and it knows the one model.
  const script = readFileSync(join(cli.REPO, 'tools/personal/relief_depth.py'), 'utf8');
  assert.match(script, new RegExp(`MODEL_ID = "${cli.MODEL_ID}"`));
  assert.match(script, /os\.path\.dirname\(out\) != out_dir/, 'the step’s own write guard');
});

test('relief: which cards — --all is art.json plus every personal model’s card, a missing one reported, one map per print; --card by name', () => {
  const art = {
    cards: {
      'Peggy Carter, Secret Agent': { front: 'https://cards.scryfall.io/normal/front/1/f/x.jpg', scryfallId: ID_A },
      'Doctor Doom': { front: 'https://cards.scryfall.io/normal/front/9/b/y.jpg', scryfallId: ID_B },
      'A Reprint Of Doom': { front: 'https://cards.scryfall.io/normal/front/9/b/y.jpg', scryfallId: ID_B },
      'No Id': { front: 'https://cards.scryfall.io/normal/front/z.jpg', scryfallId: '' },
    },
  };
  const all = cli.selectCards(art, ['Doctor Doom', 'Hulk, Gamma Goliath'], { all: true, names: [] });
  assert.deepEqual(all.cards.map((c) => c.id), [ID_A, ID_B], 'one map per Scryfall id');
  assert.deepEqual(all.missing, ['No Id', 'Hulk, Gamma Goliath']);
  const some = cli.selectCards(art, [], { all: false, names: ['doctor doom', 'Nobody'] });
  assert.deepEqual(some.cards.map((c) => c.name), ['Doctor Doom'], 'a name is matched without case');
  assert.deepEqual(some.missing, ['Nobody']);
});

test('relief: a map is current only when it is on disk and indexed with this model and this art box — anything else is computed again', () => {
  const root = mkdtempSync(join(tmpdir(), 'mtg-relief-current-'));
  try {
    const index = { version: 1, reliefs: { [ID_A]: { model: cli.MODEL_ID, box: BOX }, [ID_B]: { model: cli.MODEL_ID, box: { ...BOX, top: 0.1 } } } };
    assert.equal(cli.isCurrent(index, ID_A, BOX, root), false, 'no file yet');
    writeFileSync(join(root, `${ID_A}.png`), 'png');
    writeFileSync(join(root, `${ID_B}.png`), 'png');
    assert.equal(cli.isCurrent(index, ID_A, BOX, root), true);
    assert.equal(cli.isCurrent(index, ID_B, BOX, root), false, 'cut with another art box');
    assert.equal(cli.isCurrent({ version: 1, reliefs: { [ID_A]: { model: 'another/model', box: BOX } } }, ID_A, BOX, root), false, 'another model');
    assert.equal(cli.isCurrent({ version: 1, reliefs: {} }, ID_A, BOX, root), false, 'not indexed');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('relief: an image is fetched through the card library’s client at no more than 10 requests in any second — even when a timer fires early — and checked before it is kept', async () => {
  const { ScryfallClient, rateStats } = await import('../../tools/card-library/scryfall.ts');
  let clock = 1_000_000;
  const now = (): number => clock;
  // A timer that fires a millisecond EARLY — what put 11 starts in one second when the gap was 100 ms.
  const sleep = async (ms: number): Promise<void> => {
    clock += Math.max(1, ms - 1);
  };
  const jpeg = Buffer.from('JFIF-bytes');
  const fake = async (url: string): Promise<Response> => {
    clock += 7; // the response takes a little while
    if (url.includes('missing')) return new Response('no', { status: 404, headers: { 'content-type': 'text/plain' } });
    if (url.includes('html')) return new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } });
    if (url.includes('short')) return new Response(jpeg, { status: 200, headers: { 'content-type': 'image/jpeg', 'content-length': '999' } });
    return new Response(jpeg, { status: 200, headers: { 'content-type': 'image/jpeg', 'content-length': String(jpeg.length) } });
  };
  const client = new ScryfallClient({ userAgent: 'mtg-table test', fetch: fake as unknown as typeof fetch, now, sleep, log: () => {} });
  for (let i = 0; i < 30; i++) {
    const bytes = await cli.fetchImage(client, `https://cards.scryfall.io/normal/front/0/0/card-${String(i)}.jpg`, { sleep, now });
    assert.equal(bytes.toString(), 'JFIF-bytes');
  }
  const [file] = rateStats(client.log);
  assert.equal(file?.bucket, 'file');
  assert.equal(file?.requests, 30);
  assert.ok((file?.maxInAnySecond ?? 99) <= 10, `${String(file?.maxInAnySecond)} requests in one second`);
  assert.ok((file?.minGapMs ?? 0) >= cli.FETCH_GAP_MS, `the smallest gap is ${String(file?.minGapMs)} ms`);
  // The negative control: the same client with no pacing puts them all in one second.
  const unpaced = new ScryfallClient({ userAgent: 'mtg-table test', fetch: fake as unknown as typeof fetch, now, sleep, log: () => {} });
  for (let i = 0; i < 15; i++) await unpaced.request(`https://cards.scryfall.io/normal/front/0/0/x-${String(i)}.jpg`);
  assert.ok((rateStats(unpaced.log)[0]?.maxInAnySecond ?? 0) > 10, 'the rate check has teeth');
  // What is not an image is not kept.
  for (const bad of ['missing', 'html', 'short']) {
    await assert.rejects(cli.fetchImage(client, `https://cards.scryfall.io/normal/front/0/0/${bad}.jpg`, { sleep, now }), /HTTP/, bad);
  }
});

// ---------------------------------------------------------------------------
// 3. THE reader, and the shaders' contract
// ---------------------------------------------------------------------------

test('relief: reliefIndexOf — THE reader keeps a map only when its file is <id>.png, it has a size and it was cut with THIS art box', () => {
  const good = { file: `${ID_A}.png`, width: 410, height: 301, box: BOX };
  const index = reliefIndexOf({
    version: 1,
    reliefs: {
      [ID_A]: good,
      [ID_B]: { ...good, file: `${ID_B}.png`, box: { ...BOX, bottom: 0.6 } },
      'not-an-id': good,
      '11111111-1111-1111-1111-111111111111': { ...good, file: '../models/doctor-doom/model.glb' },
      '22222222-2222-2222-2222-222222222222': { ...good, file: '22222222-2222-2222-2222-222222222222.png', width: 0 },
    },
  });
  assert.deepEqual([...index.byId.keys()], [ID_A]);
  assert.deepEqual(index.byId.get(ID_A), { id: ID_A, file: `${ID_A}.png`, width: 410, height: 301 });
  assert.equal(index.dropped.length, 4);
  assert.ok(index.dropped.some((d) => /another art box/.test(d)));
  for (const junk of [null, 1, 'x', { version: 2, reliefs: { [ID_A]: good } }, { version: 1 }, { version: 1, reliefs: [] }]) {
    assert.equal(reliefIndexOf(junk).byId.size, 0, JSON.stringify(junk));
  }
  assert.equal(isArtBox(BOX), true);
  assert.equal(isArtBox({ ...BOX, left: 0.081 }), false);
});

test('relief: the shaders — the vertex fetch recedes each vertex along its ray from the seat by (1 − depth) × uRelief; the fragment is the painting, unlit, through three’s colour space', () => {
  assert.match(RELIEF_VERTEX, /texture2D\( uDepth, uv \)\.r/, 'the depth map is sampled at the plane’s own UV');
  assert.match(RELIEF_VERTEX, /normalize\( world\.xyz - uEye \)/, 'along the ray from the inspect camera’s seat');
  assert.match(RELIEF_VERTEX, /\( 1\.0 - depth \) \* uRelief \/ across/, 'the nearest texel stays on the window, the farthest uRelief behind it');
  assert.match(RELIEF_VERTEX, /vArtUv = uArtBox\.xy \+ uv \* uArtBox\.zw/);
  assert.match(RELIEF_FRAGMENT, /#include <colorspace_fragment>/);
  assert.doesNotMatch(RELIEF_FRAGMENT, /uLook|halftone|uKey/, 'the painting is drawn as it is (D226)');
  // The art box's UV: the card image's art box, v bottom-up.
  const [u0, v0, du, dv] = artBoxUv();
  assert.ok(Math.abs(u0 - ART_BOX.left) < 1e-9 && Math.abs(v0 - (1 - ART_BOX.bottom)) < 1e-9);
  assert.ok(Math.abs(du - (ART_BOX.right - ART_BOX.left)) < 1e-9 && Math.abs(dv - (ART_BOX.bottom - ART_BOX.top)) < 1e-9);
  // The two numbers (perf.ts): a relief of 0.3 of the backdrop's height, a 128 × 96 grid.
  assert.equal(RELIEF_DEPTH, 0.3);
  assert.deepEqual([...RELIEF_GRID], [128, 96]);
});
