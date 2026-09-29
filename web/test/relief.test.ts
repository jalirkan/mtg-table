/*
 * mtg-table — web/test/relief.test.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The relief cache and its reader** (D225–D227). Nothing here reads card art:
 * every image is SYNTHETIC — a gradient, a flat grey and a red square on blue
 * this file makes itself — and every index is written into a temp dir. What is
 * held:
 *
 *  1. **The depth step** (`tools/personal/relief_depth.py`, CPU mode) on a
 *     generated gradient: the front map alone is the art box's crop, 8-bit
 *     greyscale, and spans the range; the two layers (D227) are an RGB PNG the
 *     crop's size — red never under blue, green never over it — and a back JPEG
 *     the crop plus its margin; on a flat grey every layer is flat (255 — the
 *     window) and says so; a job that names a file outside `--out-dir` writes
 *     nothing. **The two layers' own function**, `layers()`, on a synthetic
 *     depth — a near square on a far ground and a floor ramp: the cut holds none
 *     of the square's pixels when the near side is grown (and some when it is
 *     not: the control), the back layer stands at the far side under the square
 *     and wears the ground's colour there, the cut cells keep the painting's own
 *     pixels, and a smooth slope is neither cut nor grown. These need the
 *     likeness venv (numpy, and torch for the step), so they run only when
 *     `MTG_TABLE_LIKENESS` names one (never by finding it under `var/`: a test
 *     whose result depends on what lies in `var/` is not a test, web/CLAUDE.md)
 *     — `docs/evidence/relief-window.md` has their run.
 *  2. **The CLI's pure half** (`tools/personal/relief.mjs`): the write guard,
 *     the file names, the card selection, what counts as current (the recipe
 *     and both files), the offline and pinned environment.
 *  3. **THE reader** (`web/src/workshop/relief.ts`'s `reliefIndexOf`), the two
 *     layers' UV boxes, the window and the shaders' contract.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { crc32, deflateSync, inflateSync } from 'node:zlib';

import { RELIEF_CLIFF, RELIEF_DEPTH, RELIEF_GRID } from '../src/arena/perf.ts';
import { ART_BOX } from '../src/workshop/framing.ts';
import {
  RELIEF_FRAGMENT,
  RELIEF_VERTEX,
  artBoxUv,
  backBoxes,
  frontBoxes,
  isArtBox,
  reliefIndexOf,
  windowClipOf,
  type ReliefEntry,
} from '../src/workshop/relief.ts';

interface ReliefCli {
  REPO: string;
  RELIEF_DIR: string;
  MODEL_ID: string;
  insideRelief(path: string, root?: string): string;
  reliefFileOf(id: string, root?: string): string;
  reliefBackFileOf(id: string, root?: string): string;
  recipeOf(grid: readonly [number, number], cliff: number): Record<string, unknown>;
  sameRecipe(a: unknown, b: unknown): boolean;
  DILATE_PX: number;
  BLUR_PX: number;
  MARGIN: number;
  isScryfallId(id: unknown): boolean;
  sameBox(a: unknown, b: unknown): boolean;
  selectCards(
    art: unknown,
    personal: string[],
    options: { all: boolean; names: string[] },
  ): { cards: Array<{ name: string; id: string; front: string }>; missing: string[] };
  isCurrent(index: unknown, id: string, box: unknown, recipe: unknown, root?: string): boolean;
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
    recipe?: Record<string, unknown> | null;
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

/** Decode an 8-bit GREYSCALE PNG (every filter type), or say what it is instead. */
function decodeGrey(bytes: Buffer): { width: number; height: number; bitDepth: number; colorType: number; pixels: Uint8Array } {
  const png = decodePng(bytes);
  return { ...png, pixels: png.colorType === 0 ? png.pixels : new Uint8Array(png.width * png.height) };
}

/** Decode an 8-bit PNG, greyscale (1 channel) or RGB (3), every filter type; `pixels` interleaved. */
function decodePng(bytes: Buffer): { width: number; height: number; bitDepth: number; colorType: number; channels: number; pixels: Uint8Array } {
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
  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : 0;
  const stride = width * channels;
  const pixels = new Uint8Array(stride * height);
  if (bitDepth !== 8 || channels === 0) return { width, height, bitDepth, colorType, channels, pixels };
  const raw = inflateSync(Buffer.concat(idat));
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[x - channels]! : 0;
      const b = prev[x]!;
      const c = x >= channels ? prev[x - channels]! : 0;
      const p = a + b - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
      const paeth = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      const pred = [0, a, b, (a + b) >> 1, paeth][filter] ?? 0;
      out[x] = (line[x]! + pred) & 0xff;
    }
    pixels.set(out, y * stride);
    prev = out;
  }
  return { width, height, bitDepth, colorType, channels, pixels };
}

/** The smallest and largest of many bytes — a loop, never a spread (a 410 × 301 map is past the argument limit). */
function range(values: Uint8Array): [number, number] {
  let lo = 255;
  let hi = 0;
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return [lo, hi];
}

/** A JPEG's size, from its first start-of-frame marker. */
function jpegSize(bytes: Buffer): { width: number; height: number } {
  assert.deepEqual([bytes[0], bytes[1]], [0xff, 0xd8], 'not a JPEG');
  let at = 2;
  while (at < bytes.length) {
    assert.equal(bytes[at], 0xff, 'a JPEG marker');
    const marker = bytes[at + 1]!;
    const length = bytes.readUInt16BE(at + 2);
    if (marker >= 0xc0 && marker <= 0xc2) return { height: bytes.readUInt16BE(at + 5), width: bytes.readUInt16BE(at + 7) };
    at += 2 + length;
  }
  throw new Error('no start-of-frame marker');
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
  // An RGB image is not a greyscale map: the codec says what it is instead of decoding it as one…
  assert.equal(decodeGrey(encodeRgb(4, 4, () => [1, 2, 3])).colorType, 2);
  // …and decodes it as RGB (the two layers' map, D227).
  const rgb = decodePng(encodeRgb(4, 2, (x, y) => [x * 10, y * 20, 7]));
  assert.deepEqual([rgb.channels, rgb.pixels[(1 * 4 + 3) * 3], rgb.pixels[(1 * 4 + 3) * 3 + 1], rgb.pixels[(1 * 4 + 3) * 3 + 2]], [3, 30, 20, 7]);
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
      const [min, max] = range(gradient.pixels);
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
      assert.ok(range(invented.pixels)[1] - range(invented.pixels)[0] > 100, 'ungated, a flat grey got a depth of its own — the gate is what makes it flat');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
);

const NEEDS_VENV = PYTHON !== '' && existsSync(PYTHON) ? false : 'set MTG_TABLE_LIKENESS to a venv root (torch, transformers < 5, Depth Anything V2 Small cached) to run the Python step';

test(
  'relief: the two layers through the step (D227) — an RGB map the crop’s size (red never under blue, green never over it) and a back JPEG the crop plus its margin; a flat grey is 255 in every layer; a back file that is not <id>.back.jpg is refused',
  { skip: NEEDS_VENV },
  async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mtg-relief-layers-'));
    try {
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
      const recipe = cli.recipeOf(RELIEF_GRID, RELIEF_CLIFF);
      const job = (id: string, src: string, backOut = join(out, `${id}.back.jpg`)) => ({ id, src: join(dir, src), out: join(out, `${id}.png`), backOut, box: BOX });
      const run = await cli.runDepth({
        python: PYTHON,
        jobs: [job(ID_A, 'gradient.png'), job(ID_B, 'flat.png'), job('11111111-1111-1111-1111-111111111111', 'flat.png', join(dir, 'escaped.back.jpg'))],
        device: 'cpu',
        env: cli.pythonEnv(LIKENESS, join(dir, 'cache')),
        outDir: out,
        recipe,
      });
      const byType = (type: string): Array<Record<string, unknown>> => run.lines.filter((l) => l['type'] === type);
      const done = new Map(byType('done').map((l) => [l['id'], l]));
      const margin = Math.round(cli.MARGIN * 301);
      // The map: RGB, the crop's size; blue the painting's own depth, spanning the range.
      const map = decodePng(readFileSync(join(out, `${ID_A}.png`)));
      assert.deepEqual([map.width, map.height, map.bitDepth, map.colorType], [410, 301, 8, 2], 'the two layers’ map is 8-bit RGB, the crop’s size');
      let blueMin = 255;
      let blueMax = 0;
      for (let i = 0; i < map.width * map.height; i++) {
        const [r, g, b] = [map.pixels[i * 3]!, map.pixels[i * 3 + 1]!, map.pixels[i * 3 + 2]!];
        assert.ok(r >= b - 1, `red (the front, grown at a silhouette) is never under blue at ${String(i)}: ${String(r)} < ${String(b)}`);
        assert.ok(g <= b + 1, `green (the back) is never nearer than blue at ${String(i)}: ${String(g)} > ${String(b)}`);
        blueMin = Math.min(blueMin, b);
        blueMax = Math.max(blueMax, b);
      }
      assert.ok(blueMin <= 8 && blueMax >= 247, `blue is the map normalised to its own range: ${String(blueMin)}–${String(blueMax)}`);
      // The back layer's colour: the crop plus its margin on every side.
      assert.deepEqual(jpegSize(readFileSync(join(out, `${ID_A}.back.jpg`))), { width: 410 + 2 * margin, height: 301 + 2 * margin });
      assert.deepEqual(
        [done.get(ID_A)?.['backWidth'], done.get(ID_A)?.['backHeight'], done.get(ID_A)?.['margin']],
        [410 + 2 * margin, 301 + 2 * margin, margin],
      );
      // A flat grey: every layer at the window, and nothing to fill.
      const flat = decodePng(readFileSync(join(out, `${ID_B}.png`)));
      assert.equal(done.get(ID_B)?.['flat'], true);
      assert.ok(flat.pixels.every((v) => v === 255), 'a flat image is 255 in every layer');
      assert.equal(done.get(ID_B)?.['cut'], 0);
      assert.equal(done.get(ID_B)?.['hidden'], 0);
      // A back file anywhere but beside its map is refused before anything is written.
      assert.match(String(byType('error')[0]?.['message']), /refusing to write .*escaped\.back\.jpg/);
      assert.ok(!existsSync(join(dir, 'escaped.back.jpg')) && !existsSync(join(out, '11111111-1111-1111-1111-111111111111.png')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
);

/** `relief_depth.py`'s `layers()` on a synthetic depth, in the venv's python (numpy only; no model). */
const LAYERS_PROBE = `
import json, sys
sys.path.insert(0, 'tools/personal')
import numpy as np
import relief_depth as rd
h, w = 301, 410
ys = np.arange(h)[:, None] * np.ones((1, w))
norm = np.where(ys > 230, np.minimum(1.0, 0.1 + (ys - 230) * 0.014), 0.1)
norm[80:180, 150:260] = 0.9
rgb = np.zeros((h, w, 3)); rgb[..., 2] = 1.0
rgb[80:180, 150:260] = [1.0, 0.0, 0.0]
square = np.zeros((h, w), bool); square[80:180, 150:260] = True
out = {}
for d in (DILATE, 0):
    m = rd.layers(norm, rgb, d, BLUR, CLIFF, [GX, GY], MARGIN)
    k = m['margin']
    inner = m['colour'][k:k + h, k:k + w]
    out[str(d)] = {
        'subjectInCut': int((m['cut'] & square).sum()),
        'cut': int(m['cut'].sum()),
        'frontBeside': float(m['front'][130, 145]), 'ownBeside': float(m['own'][130, 145]),
        'backUnder': float(m['back'][130, 205]), 'ownUnder': float(m['own'][130, 205]),
        'colourUnder': [float(v) for v in inner[130, 205]],
        'colourFar': [float(v) for v in inner[20, 20]],
        'rampCut': int(m['cut'][240:290, 20:110].sum()),
        'rampGrown': float(np.abs(m['front'][240:290, 20:110] - m['own'][240:290, 20:110]).max()),
        'backLeOwn': bool((m['back'] <= m['own'] + 1e-9).all()),
        'frontGeOwn': bool((m['front'] >= m['own'] - 1e-9).all()),
        'cutKeepsPainting': float(np.abs(inner[m['cut'] | m['band']] - rgb[m['cut'] | m['band']]).max()) if (m['cut'] | m['band']).any() else 0.0,
        'band': int(m['band'].sum()),
        'rampBand': int(m['band'][240:290, 20:110].sum()),
        'colourShape': list(m['colour'].shape), 'margin': k,
    }
seeds = np.zeros((5, 9), bool); seeds[2, 0] = True; seeds[2, 8] = True
vals = np.zeros((5, 9)); vals[2, 0] = 1.0; vals[2, 8] = 2.0
nv = rd.nearest_value(seeds, vals)
out['nearest'] = [float(nv[2, 1]), float(nv[2, 7]), float(nv[0, 2])]
v = np.zeros((8, 8, 3)); v[:, :4] = 0.2; v[:, 4:] = 0.8
k = np.zeros((8, 8), bool); k[:, 0] = True; k[:, 7] = True
f = rd.fill_in(v, k)
out['fill'] = [float(f[3, 0, 0]), float(f[3, 7, 0]), float(f[3, 3, 0]), float(f[3, 4, 0])]
print(json.dumps(out))
`;

test(
  'relief: layers() on a synthetic depth (D227) — grown, the cut holds none of the near square’s pixels (ungrown it does: the control); the back stands at the far side under it and wears the ground’s colour; the cut cells keep the painting; a floor ramp — 0.14 of the range over 10 px, 0.03 over 2 — is neither cut nor grown',
  { skip: NEEDS_VENV },
  () => {
    const dir = mkdtempSync(join(tmpdir(), 'mtg-relief-probe-'));
    try {
      const script = LAYERS_PROBE.replace('DILATE', String(cli.DILATE_PX))
        .replace('BLUR', String(cli.BLUR_PX))
        .replace('CLIFF', String(RELIEF_CLIFF))
        .replace('GX', String(RELIEF_GRID[0]))
        .replace('GY', String(RELIEF_GRID[1]))
        .replace('MARGIN', String(cli.MARGIN));
      const ran = spawnSync(PYTHON, ['-c', script], { cwd: cli.REPO, env: cli.pythonEnv(LIKENESS, join(dir, 'cache')), encoding: 'utf8' });
      assert.equal(ran.status, 0, ran.stderr);
      const probe = JSON.parse(ran.stdout.trim().split('\n').at(-1) ?? '{}') as Record<string, Record<string, unknown> & number[]>;
      const grown = probe[String(cli.DILATE_PX)]!;
      const bare = probe['0']!;
      assert.ok((grown['cut'] as number) > 0, 'the square’s silhouette is cut');
      assert.equal(grown['subjectInCut'], 0, 'grown, the cut falls on the ground’s pixels — the square keeps its edge');
      assert.ok((bare['subjectInCut'] as number) > 100, `ungrown, the cut takes the square’s edge (${String(bare['subjectInCut'])} px) — the control`);
      assert.ok(Math.abs((grown['frontBeside'] as number) - 0.9) < 0.02 && Math.abs((grown['ownBeside'] as number) - 0.1) < 0.02, 'red is grown past the silhouette; blue is not');
      assert.ok(Math.abs((bare['frontBeside'] as number) - 0.1) < 0.02);
      assert.ok(Math.abs((grown['backUnder'] as number) - 0.1) < 0.02 && Math.abs((grown['ownUnder'] as number) - 0.9) < 0.02, 'the back stands at the far side under the square');
      const [r, g, b] = grown['colourUnder'] as unknown as number[];
      assert.ok(r! < 0.05 && g! < 0.05 && b! > 0.95, `under the square the back wears the ground’s blue, not the square’s red: ${String([r, g, b])}`);
      assert.deepEqual(grown['colourFar'], [0, 0, 1], 'away from the square the back is the painting');
      assert.ok((grown['band'] as number) > 0, 'the grown band is cut pixel by pixel');
      assert.equal(grown['cutKeepsPainting'], 0, 'wherever the front is cut — cells and band — the back keeps the painting’s own pixels: from the seat the two layers are one picture');
      assert.equal(grown['rampCut'], 0, 'a smooth slope is not cut');
      assert.equal(grown['rampBand'], 0, 'nor cut pixel by pixel');
      assert.ok((grown['rampGrown'] as number) < 1e-9, 'a smooth slope is not grown');
      assert.equal(grown['backLeOwn'], true);
      assert.equal(grown['frontGeOwn'], true);
      const margin = Math.round(cli.MARGIN * 301);
      assert.deepEqual(grown['colourShape'], [301 + 2 * margin, 410 + 2 * margin, 3]);
      assert.deepEqual(probe['nearest'], [1, 2, 1], 'each texel takes the value of its nearest seed');
      const [k0, k7, f3, f4] = probe['fill'] as number[];
      assert.ok(Math.abs(k0! - 0.2) < 1e-9 && Math.abs(k7! - 0.8) < 1e-9, 'push-pull keeps what is known');
      assert.ok(f3! > 0.2 && f3! < 0.8 && f4! > 0.2 && f4! < 0.8 && f3! < f4!, 'and fills between it');
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
  assert.equal(cli.reliefBackFileOf(ID_A), join(cli.RELIEF_DIR, `${ID_A}.back.jpg`));
  for (const bad of ['../x', 'Doctor Doom', `${ID_A}/../x`, ID_A.toUpperCase(), '']) {
    assert.throws(() => cli.reliefFileOf(bad), /not a Scryfall id/, bad);
    assert.throws(() => cli.reliefBackFileOf(bad), /not a Scryfall id/, bad);
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
  assert.match(script, /back_out != out\[: -len\("\.png"\)\] \+ "\.back\.jpg"/, 'and the back layer only beside its map');
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

test('relief: a map is current only when both files are on disk and indexed with this model, this art box and this recipe — anything else is computed again', () => {
  const root = mkdtempSync(join(tmpdir(), 'mtg-relief-current-'));
  try {
    const recipe = cli.recipeOf(RELIEF_GRID, RELIEF_CLIFF);
    assert.deepEqual(recipe, { version: 2, dilatePx: cli.DILATE_PX, blurPx: cli.BLUR_PX, cliff: RELIEF_CLIFF, grid: [...RELIEF_GRID], margin: cli.MARGIN });
    const entry = (extra: Record<string, unknown> = {}) => ({ model: cli.MODEL_ID, box: BOX, recipe, back: `${ID_A}.back.jpg`, ...extra });
    const index = { version: 1, reliefs: { [ID_A]: entry(), [ID_B]: { ...entry({ back: `${ID_B}.back.jpg` }), box: { ...BOX, top: 0.1 } } } };
    assert.equal(cli.isCurrent(index, ID_A, BOX, recipe, root), false, 'no file yet');
    writeFileSync(join(root, `${ID_A}.png`), 'png');
    writeFileSync(join(root, `${ID_B}.png`), 'png');
    writeFileSync(join(root, `${ID_B}.back.jpg`), 'jpg');
    assert.equal(cli.isCurrent(index, ID_A, BOX, recipe, root), false, 'no back layer on disk yet');
    writeFileSync(join(root, `${ID_A}.back.jpg`), 'jpg');
    assert.equal(cli.isCurrent(index, ID_A, BOX, recipe, root), true);
    assert.equal(cli.isCurrent(index, ID_B, BOX, recipe, root), false, 'cut with another art box');
    assert.equal(cli.isCurrent({ version: 1, reliefs: { [ID_A]: entry({ model: 'another/model' }) } }, ID_A, BOX, recipe, root), false, 'another model');
    assert.equal(cli.isCurrent({ version: 1, reliefs: {} }, ID_A, BOX, recipe, root), false, 'not indexed');
    // D227: a map made before the back layer (no recipe, no back), or with another recipe, is stale.
    assert.equal(cli.isCurrent({ version: 1, reliefs: { [ID_A]: { model: cli.MODEL_ID, box: BOX } } }, ID_A, BOX, recipe, root), false, 'made before the back layer');
    assert.equal(cli.isCurrent({ version: 1, reliefs: { [ID_A]: entry({ back: undefined }) } }, ID_A, BOX, recipe, root), false, 'no back named');
    assert.equal(cli.isCurrent(index, ID_A, BOX, cli.recipeOf(RELIEF_GRID, RELIEF_CLIFF + 0.01), root), false, 'another cliff: the cut the back layer was built to meet moved');
    assert.equal(cli.isCurrent(index, ID_A, BOX, cli.recipeOf([64, 48], RELIEF_CLIFF), root), false, 'another grid');
    assert.equal(cli.sameRecipe(undefined, recipe), false);
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

test('relief: reliefIndexOf — THE reader keeps a map only when its file is <id>.png, it has a size, a back layer with one margin on every side, and it was cut with THIS art box', () => {
  const back = (id: string, extra: Record<string, unknown> = {}) => ({ file: `${id}.back.jpg`, width: 560, height: 451, ...extra });
  const good = { file: `${ID_A}.png`, width: 410, height: 301, box: BOX, back: back(ID_A) };
  const id = (n: number): string => `${String(n).repeat(8)}-${String(n).repeat(4)}-${String(n).repeat(4)}-${String(n).repeat(4)}-${String(n).repeat(12)}`;
  const index = reliefIndexOf({
    version: 1,
    reliefs: {
      [ID_A]: good,
      [ID_B]: { ...good, file: `${ID_B}.png`, box: { ...BOX, bottom: 0.6 }, back: back(ID_B) },
      'not-an-id': good,
      [id(1)]: { ...good, file: '../models/doctor-doom/model.glb', back: back(id(1)) },
      [id(2)]: { ...good, file: `${id(2)}.png`, width: 0, back: back(id(2)) },
      // D227: no back layer (a map made before it), a back that is not <id>.back.jpg, margins that differ
      [id(3)]: { ...good, file: `${id(3)}.png`, back: null },
      [id(4)]: { ...good, file: `${id(4)}.png`, back: back(id(4), { file: '../../web/src/x.jpg' }) },
      [id(5)]: { ...good, file: `${id(5)}.png`, back: back(id(5), { height: 460 }) },
      [id(6)]: { ...good, file: `${id(6)}.png`, back: back(id(6), { width: 561, height: 452 }) },
    },
  });
  assert.deepEqual([...index.byId.keys()], [ID_A]);
  assert.deepEqual(index.byId.get(ID_A), { id: ID_A, file: `${ID_A}.png`, width: 410, height: 301, back: { file: `${ID_A}.back.jpg`, width: 560, height: 451, margin: 75 } });
  assert.equal(index.dropped.length, 8);
  assert.ok(index.dropped.some((d) => /another art box/.test(d)));
  assert.equal(index.dropped.filter((d) => /made before the back layer/.test(d)).length, 2, 'no back, or a back that is not <id>.back.jpg');
  assert.equal(index.dropped.filter((d) => /one margin on every side/.test(d)).length, 2);
  for (const junk of [null, 1, 'x', { version: 2, reliefs: { [ID_A]: good } }, { version: 1 }, { version: 1, reliefs: [] }]) {
    assert.equal(reliefIndexOf(junk).byId.size, 0, JSON.stringify(junk));
  }
  assert.equal(isArtBox(BOX), true);
  assert.equal(isArtBox({ ...BOX, left: 0.081 }), false);
});

test('relief: the shaders — the vertex fetch recedes each vertex along its ray from the seat by (1 − depth) × uRelief; the fragment cuts the front at a silhouette and both layers at the window, and is the painting, unlit, through three’s colour space', () => {
  assert.match(RELIEF_VERTEX, /texture2D\( uDepth, clamp\( at, 0\.0, 1\.0 \) \)/, 'the depth map is sampled at the layer’s depth UV (its edge past it)');
  assert.match(RELIEF_VERTEX, /return mix\( d\.r, d\.g, uLayer \);/, 'red for the front layer, green for the back');
  assert.match(RELIEF_VERTEX, /vec2 at = \( uv - uDepthBox\.xy \) \/ uDepthBox\.zw;/);
  assert.match(RELIEF_VERTEX, /normalize\( world\.xyz - uEye \)/, 'along the ray from the inspect camera’s seat');
  assert.match(RELIEF_VERTEX, /\( 1\.0 - depth \) \* uRelief \/ across \+ uBehind/, 'the nearest texel stays on the window, the farthest uRelief behind it; the back a hair further');
  assert.match(RELIEF_VERTEX, /vArtUv = uArtBox\.xy \+ uv \* uArtBox\.zw/);
  // The silhouette test: the vertex and its four neighbours one cell away.
  for (const side of ['east', 'west', 'north', 'south']) assert.match(RELIEF_VERTEX, new RegExp(`float ${side} = depthAt\\( at [+-] vec2\\(`));
  assert.match(RELIEF_VERTEX, /vCut = max\(.*\) - min\(.*\);/);
  // The cuts (D227): the vertex's, the grown band's pixel by pixel, and the window's rectangle.
  assert.match(RELIEF_FRAGMENT, /if \( vCut > uCut \) discard;/);
  assert.match(RELIEF_FRAGMENT, /if \( d\.r - d\.b > uCut \) discard;/);
  assert.match(RELIEF_FRAGMENT, /vec3 ray = vWorld - cameraPosition;/, 'the window is seen from wherever the camera is');
  assert.match(RELIEF_FRAGMENT, /abs\( dot\( onWindow, uRight \) \) > uHalf\.x \|\| abs\( dot\( onWindow, uUp \) \) > uHalf\.y/);
  assert.match(RELIEF_FRAGMENT, /#include <colorspace_fragment>/);
  assert.doesNotMatch(RELIEF_FRAGMENT, /uLook|halftone|uKey|uTime/, 'the painting is drawn as it is (D226), and nothing reads a clock');
  // The art box's UV: the card image's art box, v bottom-up.
  const [u0, v0, du, dv] = artBoxUv();
  assert.ok(Math.abs(u0 - ART_BOX.left) < 1e-9 && Math.abs(v0 - (1 - ART_BOX.bottom)) < 1e-9);
  assert.ok(Math.abs(du - (ART_BOX.right - ART_BOX.left)) < 1e-9 && Math.abs(dv - (ART_BOX.bottom - ART_BOX.top)) < 1e-9);
  // The three numbers (perf.ts): a relief of 0.3 of the backdrop's height, a 128 × 96 grid, a cut at 0.12.
  assert.equal(RELIEF_DEPTH, 0.3);
  assert.deepEqual([...RELIEF_GRID], [128, 96]);
  assert.equal(RELIEF_CLIFF, 0.12);
});

test('relief: the two layers’ boxes and the window — the back grown by its margin reads the depth map inside it and its own image whole; the window is the backdrop’s rectangle on its plane', () => {
  const front = frontBoxes();
  assert.deepEqual(front.scale, [1, 1]);
  assert.deepEqual(front.depth, [0, 0, 1, 1]);
  assert.deepEqual(front.colour, artBoxUv());
  const entry: ReliefEntry = { id: ID_A, file: `${ID_A}.png`, width: 410, height: 301, back: { file: `${ID_A}.back.jpg`, width: 560, height: 451, margin: 75 } };
  const back = backBoxes(entry);
  assert.deepEqual(back.scale, [560 / 410, 451 / 301]);
  assert.deepEqual(back.colour, [0, 0, 1, 1]);
  // The window's edge on the back plane (the planes share a centre) is the depth map's edge, and the back image's pixel `margin`.
  const [ox, oy, sx, sy] = back.depth;
  const leftEdge = 0.5 - 0.5 / back.scale[0];
  const bottomEdge = 0.5 - 0.5 / back.scale[1];
  assert.ok(Math.abs((leftEdge - ox) / sx) < 1e-12 && Math.abs((1 - leftEdge - ox) / sx - 1) < 1e-12, 'across: 0 and 1 at the window’s edges');
  assert.ok(Math.abs((bottomEdge - oy) / sy) < 1e-12, 'up: 0 at the window’s edge');
  assert.ok(Math.abs(leftEdge * 560 - 75) < 1e-9, 'and that is the back image’s pixel 75 — the crop’s first column');
  // The window: the backdrop panel's centre, its normal toward the seat, its right, a hair over half its size.
  const clip = windowClipOf({ position: [1, 2, 3], rotationY: 0.4, width: 1.6, height: 1.2 });
  assert.deepEqual(clip.centre, [1, 2, 3]);
  assert.ok(Math.abs(clip.front[0] - Math.sin(0.4)) < 1e-12 && clip.front[1] === 0 && Math.abs(clip.front[2] - Math.cos(0.4)) < 1e-12);
  assert.ok(Math.abs(clip.front[0] * clip.right[0] + clip.front[2] * clip.right[2]) < 1e-12, 'right is square to the front');
  assert.ok(Math.abs(clip.right[0] - Math.cos(0.4)) < 1e-12 && Math.abs(clip.right[2] + Math.sin(0.4)) < 1e-12, 'a plane’s +X turned 0.4 about the vertical');
  assert.deepEqual(clip.up, [0, 1, 0]);
  assert.ok(clip.half[0] > 0.8 && clip.half[0] < 0.8 * 1.01 && clip.half[1] > 0.6 && clip.half[1] < 0.6 * 1.01);
});
