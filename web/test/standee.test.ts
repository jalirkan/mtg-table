/*
 * mtg-table — web/test/standee.test.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The portrait standee** (D260–D264; the personal tier is D190, its relief
 * cache D225–D228). Everything here is synthetic: no relief map of the user's,
 * no card art and no picture of either is read — the maps are PNGs this test
 * encodes itself, the art index and the relief index are spies.
 *
 *  1. **The cut** (`standeeCutOf`, D260): the box round a painting's near
 *     subjects and how near a texel must be, from the map's own channels — the
 *     occluders (the keep mask's blue, red over green by the cliff), a subject's
 *     interior past the back layer's reach kept by the depth test, a near floor
 *     outside the box and the frame's line never in it, a flat map and a speck no
 *     standee; the PNG decoder the dev route reads the maps with; the reader of
 *     the served cut; the dev route measuring it once per file.
 *  2. **Hard rule 8's renderer half for a second card-art surface** (D264): over
 *     every board frame of the committed corpus — plain, made HOSTILE, and the
 *     hostile placements under the plain poses — the art index is never asked
 *     about a concealed card, the relief index never about a concealed card's
 *     print, and a standee is chosen iff the card is face up, named, un-dressed
 *     (no personal model took it) and has a relief; the tier off chooses none;
 *     a lookup with the gates taken out does ask (the negative control).
 *  3. **The dressed pose** (`dressStandees`): the opaque id, no props, costume,
 *     hair or resting pose, the width clamp strict (D65), the status strip over
 *     its refitted height (D210–D212), the same map when nothing is dressed.
 *  4. **What was measured** (D261, D262): the facing — a standee turned to the
 *     camera shows its painting from every seat-safe view on BOTH seats, where
 *     D143's facing would show your own seat nothing but cardboard; the
 *     legibility — at least 48 px of subject at 1× from the table view on both
 *     seats (traits.test's bar), with the least subject fill and the widest cut
 *     the deck's maps measured; the tapped stance — shorter from the table view
 *     than standing, where leaning back reads taller; and the fall.
 *  5. **The mesh** (D263): two sheets, one draw call, 1,920 triangles.
 */

import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, existsSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

import figuresJson from '../src/arena/figures/figures.json' with { type: 'json' };
import modelsJson from '../src/arena/figures/models.json' with { type: 'json' };
import type { ArtEntry, ArtIndex } from '../src/art.ts';
import { VIEW_BY_ID, projectToNdc, type Pose } from '../src/arena/camera.ts';
import { figurePose, type FigureLayout, type FigurePose } from '../src/arena/figures/pose.ts';
import { statusLayout } from '../src/arena/figures/status.ts';
import { validateFigures, validateModels } from '../src/arena/figures/validate.ts';
import { FIGURE_HEIGHT, FIGURE_MAX_WIDTH, STATUS_LIFT, layout, seatFacingY, type Layout, type Placement } from '../src/arena/layout.ts';
import { RELIEF_CLIFF, STANDEE_BACK_GRID, STANDEE_FACES_CAMERA, STANDEE_GRID, STANDEE_MIN_SHARE } from '../src/arena/perf.ts';
import { ART_BOX, EMPTY_RELIEF, reliefIndexOf, standeeCutFrom, type ReliefEntry, type ReliefIndex, type StandeeCut } from '../src/arena/relief.ts';
import {
  STANDEE_FALL,
  STANDEE_FRAGMENT,
  STANDEE_STANCES,
  STANDEE_VERTEX,
  dressStandees,
  standeeAspectOf,
  standeeChoicesOf,
  standeeCutOf,
  standeeFallOf,
  standeeSheets,
  type StandeeChoice,
  type StandeeFit,
} from '../src/arena/standee.ts';
import { buildReliefIndex, standeeCutOfFile } from '../src/personal/devRoute.ts';
import { decodePng } from '../src/personal/png.ts';
import { isHidden, type AnyCard, type Frame } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const MODELS = validateModels(modelsJson).data;
const DATA = validateFigures(figuresJson, { modelIds: new Set(Object.keys(MODELS.models)) }).data;
const BASE = 'personal/relief/';

// ---------------------------------------------------------------------------
// A PNG encoder of the test's own (every filter the decoder undoes)
// ---------------------------------------------------------------------------

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([length, body, crc]);
}

/** An 8-bit PNG of `channels` (1, 3 or 4), each row filtered by `filters[y % filters.length]` (0–4). */
function encodePng(pixels: Uint8Array, width: number, height: number, channels: number, filters: readonly number[] = [0, 1, 2, 3, 4]): Buffer {
  const colour = channels === 1 ? 0 : channels === 3 ? 2 : 6;
  const stride = width * channels;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const filter = filters[y % filters.length]!;
    raw[y * (stride + 1)] = filter;
    for (let x = 0; x < stride; x++) {
      const value = pixels[y * stride + x]!;
      const left = x >= channels ? pixels[y * stride + x - channels]! : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x]! : 0;
      const upLeft = y > 0 && x >= channels ? pixels[(y - 1) * stride + x - channels]! : 0;
      let predicted = 0;
      if (filter === 1) predicted = left;
      else if (filter === 2) predicted = up;
      else if (filter === 3) predicted = (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        predicted = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      raw[y * (stride + 1) + 1 + x] = (value - predicted) & 0xff;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = colour;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// ---------------------------------------------------------------------------
// A synthetic relief map: a near subject over a far ground (the map's channels, D228)
// ---------------------------------------------------------------------------

const W = 100;
const H = 80;
const FAR = 60;
const NEAR = 220;
/** The subject: x 30–69, y 20–77 (a figure standing near the painting's bottom). */
const SUBJECT = { x0: 30, x1: 69, y0: 20, y1: 77 };
/** How far in from its silhouette the back layer still holds the far side (D228's reach, scaled down). */
const REACH = 8;
/** The band the red was grown across, outside the silhouette — cut by the keep mask. */
const BAND = 3;

interface MapOptions {
  /** A near FLOOR in the bottom-left corner that hides nothing (red = green): outside the occluders' box. */
  floor?: boolean;
  /** The subject touches the art box's left edge (the frame's line must stay out of the cut). */
  atEdge?: boolean;
}

/** The map as `relief_depth.py` writes it: red the front's depth, green the back's, blue the keep mask. */
function syntheticMap(options: MapOptions = {}): Uint8Array {
  const px = new Uint8Array(W * H * 3);
  const s = options.atEdge === true ? { ...SUBJECT, x0: 0 } : SUBJECT;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      const inside = x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.y1;
      const toEdge = inside ? Math.min(x - s.x0, s.x1 - x, y - s.y0, s.y1 - y) : -1;
      const inBand = !inside && x >= s.x0 - BAND && x <= s.x1 + BAND && y >= s.y0 - BAND && y <= s.y1 + BAND;
      let r = FAR;
      let g = FAR;
      let b = 255;
      if (inside) {
        r = NEAR;
        // Within reach of the silhouette the back layer holds the far side; past it, the painting's own depth.
        g = toEdge <= REACH ? FAR : NEAR;
      } else if (inBand) {
        r = NEAR; // the red grown past the silhouette…
        g = FAR;
        b = 0; // …and cut by the keep mask
      }
      if (options.floor === true && x < 14 && y > 66) {
        r = 235;
        g = 235;
      }
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
    }
  }
  return px;
}

function subjectOf(px: Uint8Array, cut: StandeeCut, x: number, y: number): boolean {
  const i = (y * W + x) * 3;
  if (x < cut.box.left * W || x >= cut.box.right * W || y < cut.box.top * H || y >= cut.box.bottom * H) return false;
  if (px[i + 2]! < 128) return false;
  return px[i]! - px[i + 1]! > RELIEF_CLIFF * 255 || px[i]! >= cut.near * 255;
}

// ---------------------------------------------------------------------------
// 1. The cut
// ---------------------------------------------------------------------------

test('standee: THE cut — the occluders’ box and the near depth; a subject past the back layer’s reach stays solid, a near floor and the frame’s line stay out, the band the keep mask cuts is never subject (D260)', () => {
  const px = syntheticMap({ floor: true });
  const cut = standeeCutOf(px, W, H, 3);
  assert.ok(cut !== null, 'a painting with a near subject stands a standee');
  // The box: the occluders (the subject's rim, within reach) padded by the painted contour.
  assert.ok(cut.box.left <= SUBJECT.x0 / W && cut.box.left >= (SUBJECT.x0 - 4) / W, `left ${String(cut.box.left)}`);
  assert.ok(cut.box.right >= (SUBJECT.x1 + 1) / W && cut.box.right <= (SUBJECT.x1 + 5) / W, `right ${String(cut.box.right)}`);
  assert.ok(cut.box.top <= SUBJECT.y0 / H, `top ${String(cut.box.top)}`);
  assert.ok(cut.box.bottom <= (H - 2) / H, 'the art box’s last two rows are the frame’s line, never the cut’s');
  // Near: what the occluders hide, plus the cliff.
  assert.ok(Math.abs(cut.near - (FAR + RELIEF_CLIFF * 255) / 255) < 0.01, `near ${String(cut.near)}`);
  let subject = 0;
  let interior = 0;
  let floor = 0;
  let band = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!subjectOf(px, cut, x, y)) continue;
      subject += 1;
      const inside = x >= SUBJECT.x0 && x <= SUBJECT.x1 && y >= SUBJECT.y0 && y <= SUBJECT.y1;
      if (inside && Math.min(x - SUBJECT.x0, SUBJECT.x1 - x, y - SUBJECT.y0, SUBJECT.y1 - y) > REACH) interior += 1;
      if (x < 14 && y > 66) floor += 1;
      if (!inside) band += 1;
    }
  }
  const area = (SUBJECT.x1 - SUBJECT.x0 + 1) * Math.min(SUBJECT.y1 - SUBJECT.y0 + 1, H - 2 - SUBJECT.y0);
  assert.equal(subject, area, 'the subject, whole, and nothing else');
  assert.ok(interior > 100, 'the interior past the back layer’s reach is kept by the depth test');
  assert.equal(floor, 0, 'a near floor outside the occluders’ box is not the standee');
  assert.equal(band, 0, 'the band the keep mask cuts is never the subject');
  assert.ok(Math.abs(cut.share - subject / (W * H)) < 1e-3);
  // The negative control: the occluder test alone holes the interior.
  let occludersOnly = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      if (px[i + 2]! >= 128 && px[i]! - px[i + 1]! > RELIEF_CLIFF * 255) occludersOnly += 1;
    }
  }
  assert.ok(occludersOnly < subject - 100, 'without the depth test the subject would be a ring');
  // The frame's line: a subject touching the art box's edge still leaves its two outermost columns out.
  const edge = standeeCutOf(syntheticMap({ atEdge: true }), W, H, 3);
  assert.ok(edge !== null && edge.box.left >= 2 / W, 'the frame’s line is never cut');
});

test('standee: no standee for a flat map, a speck under STANDEE_MIN_SHARE, or bytes that are not a map; RGBA reads as RGB', () => {
  const flat = new Uint8Array(W * H * 3).fill(255);
  assert.equal(standeeCutOf(flat, W, H, 3), null, 'a flat map (255 everywhere, D225) has nothing in front of anything');
  const speck = new Uint8Array(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    speck[i * 3] = FAR;
    speck[i * 3 + 1] = FAR;
    speck[i * 3 + 2] = 255;
  }
  for (let y = 40; y < 44; y++) for (let x = 40; x < 44; x++) speck[(y * W + x) * 3] = NEAR;
  assert.ok(16 / (W * H) < STANDEE_MIN_SHARE);
  assert.equal(standeeCutOf(speck, W, H, 3), null, 'a speck is no standee');
  assert.equal(standeeCutOf(new Uint8Array(10), W, H, 3), null);
  assert.equal(standeeCutOf(syntheticMap(), W, H, 1), null);
  const rgb = syntheticMap();
  const rgba = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    rgba[i * 4] = rgb[i * 3]!;
    rgba[i * 4 + 1] = rgb[i * 3 + 1]!;
    rgba[i * 4 + 2] = rgb[i * 3 + 2]!;
    rgba[i * 4 + 3] = 255;
  }
  assert.deepEqual(standeeCutOf(rgba, W, H, 4), standeeCutOf(rgb, W, H, 3));
});

test('standee: the dev route’s PNG decoder reads what it was written — every filter, grey, RGB and RGBA — and refuses anything else', () => {
  for (const channels of [1, 3, 4]) {
    const px = new Uint8Array(37 * 23 * channels);
    for (let i = 0; i < px.length; i++) px[i] = (i * 73 + (i >> 3) * 11) & 0xff;
    const png = decodePng(encodePng(px, 37, 23, channels));
    assert.ok(png !== null);
    assert.equal(png.channels, channels);
    assert.deepEqual([...png.pixels], [...px], `${String(channels)} channel(s)`);
  }
  assert.equal(decodePng(Buffer.from('not a png')), null);
  const good = encodePng(syntheticMap(), W, H, 3);
  const interlaced = Buffer.from(good);
  interlaced[8 + 8 + 12] = 1;
  assert.equal(decodePng(interlaced), null, 'an interlaced PNG is not a map relief.mjs writes');
});

test('standee: the reader keeps a served cut only when it is one — four fractions with a size, a near and a share — and keeps the map either way', () => {
  const cut = { box: { left: 0.1, right: 0.8, top: 0.05, bottom: 0.99 }, near: 0.4, share: 0.3 };
  assert.deepEqual(standeeCutFrom(cut), cut);
  for (const bad of [
    null,
    { ...cut, near: 1.2 },
    { ...cut, share: 0 },
    { ...cut, box: { ...cut.box, right: 0.1 } },
    { ...cut, box: { ...cut.box, left: -0.1 } },
    { ...cut, box: 'x' },
    { box: cut.box },
  ]) {
    assert.equal(standeeCutFrom(bad), null, JSON.stringify(bad));
  }
  const id = '1f98293e-9d94-4185-8546-8beaf281dfa3';
  const entry = { file: `${id}.png`, width: 410, height: 301, box: ART_BOX, back: { file: `${id}.back.jpg`, width: 560, height: 451 } };
  assert.deepEqual(reliefIndexOf({ version: 1, reliefs: { [id]: { ...entry, standee: cut } } }).byId.get(id)?.standee, cut);
  const junk = reliefIndexOf({ version: 1, reliefs: { [id]: { ...entry, standee: { ...cut, near: 'x' } } } }).byId.get(id);
  assert.ok(junk !== undefined && junk.standee === null, 'a junk cut is no standee, and the map is still the inspect view’s');
});

test('standee: the dev route measures the cut from the map on disk, once per file — served in the index beside the map, null for a map it cannot read or an older recipe’s', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mtg-standee-route-'));
  try {
    const a = '11111111-1111-1111-1111-111111111111';
    const b = '22222222-2222-2222-2222-222222222222';
    const c = '33333333-3333-3333-3333-333333333333';
    const entry = (id: string, version = 3): Record<string, unknown> => ({
      file: `${id}.png`,
      width: W,
      height: H,
      box: ART_BOX,
      back: `${id}.back.jpg`,
      backWidth: W + 20,
      backHeight: H + 20,
      recipe: { version },
    });
    writeFileSync(join(dir, 'index.json'), JSON.stringify({ version: 1, reliefs: { [a]: entry(a), [b]: entry(b), [c]: entry(c, 2) } }));
    writeFileSync(join(dir, `${a}.png`), encodePng(syntheticMap(), W, H, 3));
    writeFileSync(join(dir, `${b}.png`), 'not a png');
    writeFileSync(join(dir, `${c}.png`), encodePng(syntheticMap(), W, H, 3));
    for (const id of [a, b, c]) writeFileSync(join(dir, `${id}.back.jpg`), 'back');
    const index = buildReliefIndex(dir);
    assert.deepEqual(index.reliefs[a]?.standee, standeeCutOf(syntheticMap(), W, H, 3), 'the served cut is standeeCutOf of the map');
    assert.equal(index.reliefs[b]?.standee, null, 'a map the decoder cannot read stands no standee');
    assert.equal(index.reliefs[c]?.standee, null, 'an older recipe’s map has no keep mask and no back layer: no standee');
    assert.equal(buildReliefIndex(dir, { cuts: false }).reliefs[a]?.standee, null, 'a file request measures nothing');
    // Once per file: the same answer while the file is unchanged, measured again when it changes.
    const first = standeeCutOfFile(join(dir, `${a}.png`));
    assert.equal(standeeCutOfFile(join(dir, `${a}.png`)), first, 'cached');
    writeFileSync(join(dir, `${a}.png`), encodePng(new Uint8Array(W * H * 3).fill(255), W, H, 3));
    const later = new Date(Date.now() + 5000);
    utimesSync(join(dir, `${a}.png`), later, later);
    assert.equal(standeeCutOfFile(join(dir, `${a}.png`)), null, 'a map rewritten flat is measured again');
    // The reader on the page takes what the route serves.
    const read = reliefIndexOf(JSON.parse(JSON.stringify(buildReliefIndex(dir))));
    assert.equal(read.byId.get(a)?.standee, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 2. Hard rule 8 over the corpus, made hostile
// ---------------------------------------------------------------------------

const SECRET = '\u0000standee-secret-';
const CUT: StandeeCut = { box: { left: 0.1, right: 0.9, top: 0.05, bottom: 0.98 }, near: 0.3, share: 0.35 };

/** An art index that answers EVERY name (its print's id is the name's own) — and remembers each one it was asked. */
function spyArt(): { art: ArtIndex; asked: string[] } {
  const asked: string[] = [];
  const entryFor = (name: string): ArtEntry => ({ front: 'https://cards.example/x.jpg', back: null, artist: 'x', setCode: 'X', collectorNumber: '1', scryfallId: `print:${name}` });
  const cards = new Proxy({} as Record<string, ArtEntry>, {
    get(_target, key) {
      if (typeof key !== 'string') return undefined;
      asked.push(key);
      return entryFor(key);
    },
  });
  class ByLower extends Map<string, ArtEntry> {
    override get(name: string): ArtEntry {
      asked.push(name);
      return entryFor(name);
    }
  }
  return { art: { generatedAt: null, cards, byLowerName: new ByLower(), misses: [] }, asked };
}

/** A relief index with a cut for EVERY print — and the prints it was asked about. */
function spyRelief(): { relief: ReliefIndex; asked: string[] } {
  const asked: string[] = [];
  const byId = {
    get(id: string): ReliefEntry {
      asked.push(id);
      return { id, file: `${id}.png`, width: 410, height: 301, back: { file: `${id}.back.jpg`, width: 560, height: 451, margin: 75 }, standee: CUT };
    },
    has(): boolean {
      return true;
    },
    size: 1,
  } as unknown as ReadonlyMap<string, ReliefEntry>;
  return { relief: { byId, dropped: [] }, asked };
}

/** The corpus made HOSTILE: every back and stub named with a secret, every third face-up creature or stack card turned face down with one. */
function hostile(placed: Layout): Layout {
  const placements: Placement[] = placed.placements.map((p) => {
    const secret = `${SECRET}${String(p.cardId)}`;
    if (p.back || isHidden(p.card)) return { ...p, card: { ...p.card, name: secret } as AnyCard };
    if ((p.kind === 'creature' || p.kind === 'stack') && p.cardId % 3 === 0) return { ...p, back: true, card: { ...p.card, name: secret } as AnyCard };
    return p;
  });
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

/** Independently of the lookup: whether this placement may stand as a standee (face up, named, a body a CC0 figure stands in, not taken). */
function eligible(placement: Placement, pose: FigurePose | undefined, taken: ReadonlyMap<number, unknown>): boolean {
  if (pose === undefined || taken.has(placement.cardId)) return false;
  if (placement.kind !== 'creature' && placement.kind !== 'stack') return false;
  if (placement.back || isHidden(placement.card)) return false;
  const name = (placement.card as { name?: unknown }).name;
  if (typeof name !== 'string' || name.trim() === '') return false;
  return !pose.anonymous && pose.modelId !== null && pose.swarm === 0 && pose.silhouette === null && !pose.vehicle && pose.personal === undefined;
}

/** The lookup with its gates taken out: every placement with a pose, straight to the art and the relief. The negative control. */
function ungated(placed: Layout, poses: FigureLayout, art: ArtIndex, relief: ReliefIndex): void {
  for (const p of placed.placements) {
    if (!poses.has(p.cardId)) continue;
    const name = (p.card as { name?: unknown }).name;
    if (typeof name !== 'string') continue;
    const hit = art.cards[name];
    if (hit !== undefined) relief.byId.get(hit.scryfallId);
  }
}

test('standee: over every board frame of the corpus made HOSTILE, the art index is never asked about a concealed card nor the relief about its print; a standee iff face up, named, un-dressed, with a relief; the tier off stands none; an ungated lookup leaks (hard rule 8, D264)', () => {
  let frames = 0;
  let chosen = 0;
  let mismatched = 0;
  let asked = 0;
  let leaks = 0;
  let takenSkipped = 0;
  const files = new Set<string>();
  for (const { file, state } of corpusStates()) {
    frames += 1;
    files.add(file);
    const plain = layout(state);
    const plainPoses = figurePose(plain, state.board?.combat ?? null, DATA, { models: MODELS });
    const turned = hostile(plain);
    // Every fifth modelled figure is taken by a personal model: the model wins (D260).
    const taken = new Map<number, true>();
    let k = 0;
    for (const pose of plainPoses.values()) if (pose.modelId !== null && k++ % 5 === 0) taken.set(pose.cardId, true);
    for (const [placed, given] of [
      [plain, plainPoses],
      [turned, null],
      [turned, plainPoses],
    ] as const) {
      const poses = given ?? figurePose(placed, state.board?.combat ?? null, DATA, { models: MODELS });
      const art = spyArt();
      const relief = spyRelief();
      const choices = standeeChoicesOf(placed, poses, art.art, relief.relief, { base: BASE, taken });
      for (const name of art.asked) assert.ok(name !== '' && !name.startsWith(SECRET), `${file}: the art index was asked about a concealed card`);
      for (const id of relief.asked) assert.ok(!id.includes(SECRET), `${file}: the relief index was asked about a concealed card’s print`);
      asked += art.asked.length;
      // Iff: exactly the eligible placements (each card once, the first placement in layout order).
      const expected = new Set<number>();
      const seen = new Set<number>();
      for (const p of placed.placements) {
        if (p.kind !== 'creature' && p.kind !== 'stack') continue;
        if (seen.has(p.cardId)) continue;
        seen.add(p.cardId);
        if (eligible(p, poses.get(p.cardId), taken)) expected.add(p.cardId);
      }
      assert.deepEqual([...choices.keys()].sort((x, y) => x - y), [...expected].sort((x, y) => x - y), `${file}: the standees are not exactly the face-up, named, un-dressed figures`);
      for (const [cardId, choice] of choices) {
        assert.ok(!taken.has(cardId));
        assert.equal(choice.map, `${BASE}${choice.key}.png`);
        assert.equal(choice.back, `${BASE}${choice.key}.back.jpg`);
        chosen += 1;
      }
      if (given !== null && placed === turned) {
        mismatched += placed.placements.filter((p) => (p.back || isHidden(p.card)) && poses.get(p.cardId)?.anonymous === false).length;
      }
      takenSkipped += [...taken.keys()].filter((id) => !choices.has(id) && poses.get(id)?.anonymous === false).length;
      // The tier off, a build (no route) or `?standee=0`: nothing stands and nothing is asked.
      const off = spyArt();
      const offRelief = spyRelief();
      assert.equal(standeeChoicesOf(placed, poses, off.art, offRelief.relief, { base: null, taken }).size, 0);
      assert.equal(off.asked.length + offRelief.asked.length, 0, 'the tier off still looked a card up');
      assert.equal(standeeChoicesOf(placed, poses, off.art, EMPTY_RELIEF, { base: BASE }).size, 0);
      // The negative control.
      const control = spyArt();
      const controlRelief = spyRelief();
      ungated(placed, poses, control.art, controlRelief.relief);
      leaks += controlRelief.asked.filter((id) => id.includes(SECRET)).length;
    }
  }
  console.log(
    `standee: ${String(frames)} board frames of ${String(files.size)} recordings (× plain, hostile, hostile under the plain poses) — ` +
      `${String(asked)} face-up names looked up, ${String(chosen)} standees chosen, ${String(mismatched)} named poses on a back or a stub and ` +
      `${String(takenSkipped)} figures a personal model took never chosen; the ungated lookup asked the relief about ${String(leaks)} concealed prints`,
  );
  assert.equal(files.size, 23, 'the committed corpus is 22 recordings and the synthetic sample');
  assert.ok(frames > 3000, `expected every board frame of the corpus, saw ${String(frames)}`);
  assert.ok(chosen > 1000 && asked > 1000, 'the sweep chose nothing — it proves nothing');
  assert.ok(mismatched > 100, 'the pairing only the placement gate stops offered it no case');
  assert.ok(takenSkipped > 100, 'no personal model took a figure — the model-wins rule proves nothing');
  assert.ok(leaks > 100, 'the negative control: a lookup without the gates must reach concealed prints over this corpus');
});

test('standee: THE lookup on its own — a stub, a face-down card, a swarm, a silhouette, a vehicle, the anonymous figure, a personal model and a print with no cut each stand none; the card’s own art lookup is the key', () => {
  // A real board: the first corpus frame with three figures the lookup would stand.
  let placed: Layout | null = null;
  let poses: FigureLayout | null = null;
  for (const { state } of corpusStates()) {
    const p = layout(state);
    const f = figurePose(p, state.board?.combat ?? null, DATA, { models: MODELS });
    if (p.placements.filter((x) => eligible(x, f.get(x.cardId), new Map())).length >= 3) {
      placed = p;
      poses = f;
      break;
    }
  }
  assert.ok(placed !== null && poses !== null, 'no corpus frame has three standing figures');
  const art = spyArt();
  const relief = spyRelief();
  const all = standeeChoicesOf(placed, poses, art.art, relief.relief, { base: BASE });
  assert.ok(all.size >= 3);
  const [first, second] = [...all.keys()] as [number, number];
  const firstPlacement = placed.placements.find((p) => p.cardId === first)!;
  const firstName = (firstPlacement.card as { name: string }).name;
  assert.equal(all.get(first)?.key, `print:${firstName}`, 'the relief is asked about the print CardPlane’s own lookup answered');
  // A personal model wins.
  assert.ok(!standeeChoicesOf(placed, poses, art.art, relief.relief, { base: BASE, taken: new Map([[second, true]]) }).has(second));
  // A print with no cut stands none.
  const noCut: ReliefIndex = {
    byId: { get: (id: string) => ({ ...relief.relief.byId.get(id)!, standee: null }), size: 1 } as unknown as ReadonlyMap<string, ReliefEntry>,
    dropped: [],
  };
  assert.equal(standeeChoicesOf(placed, poses, art.art, noCut, { base: BASE }).size, 0);
  // Each figure gate, forced on a pose the lookup would otherwise stand.
  for (const [what, patch] of [
    ['anonymous', { anonymous: true }],
    ['modelless', { modelId: null }],
    ['a swarm', { swarm: 5 }],
    ['a silhouette', { silhouette: 'carrier' }],
    ['a vehicle', { vehicle: true }],
    ['dressed', { personal: 'p0' }],
  ] as const) {
    const forced = new Map(poses);
    forced.set(first, { ...poses.get(first)!, ...patch } as FigurePose);
    assert.ok(!standeeChoicesOf(placed, forced, art.art, relief.relief, { base: BASE }).has(first), what);
  }
  // A back and a stub under a named pose: only the placement gate stops them, and the art is never asked.
  for (const make of [
    (p: Placement): Placement => ({ ...p, back: true }),
    (p: Placement): Placement => ({ ...p, card: { id: p.cardId, zone: 'battlefield', owner: 0, controller: 0, hidden: true } as unknown as AnyCard }),
  ]) {
    const placements = placed.placements.map((p) => (p.cardId === first ? make(p) : p));
    const concealed: Layout = { ...placed, placements, byKey: new Map(placements.map((p) => [p.key, p])) };
    const spy = spyArt();
    assert.ok(!standeeChoicesOf(concealed, poses, spy.art, relief.relief, { base: BASE }).has(first));
    assert.ok(!spy.asked.includes(firstName), 'a concealed card’s art was looked up');
  }
});

// ---------------------------------------------------------------------------
// 3. The dressed pose, and the status strip over it
// ---------------------------------------------------------------------------

test('standee: dressStandees — only a loaded standee dresses; the opaque id, no props, costume, hair or rest; the width clamp strict; the strip over its refitted height; the same map when nothing is dressed', () => {
  let frames = 0;
  let dressed = 0;
  let strips = 0;
  for (const { state } of corpusStates()) {
    frames += 1;
    if (frames % 7 !== 0) continue;
    const placed = layout(state);
    const poses = figurePose(placed, state.board?.combat ?? null, DATA, { models: MODELS });
    const art = spyArt();
    const relief = spyRelief();
    const choices = standeeChoicesOf(placed, poses, art.art, relief.relief, { base: BASE });
    assert.equal(dressStandees(poses, choices, new Map()), poses, 'nothing loaded: the same map');
    const fits = new Map<string, StandeeFit>();
    let n = 0;
    for (const choice of choices.values()) if (!fits.has(choice.key)) fits.set(choice.key, { id: `s${String(n++)}`, aspect: n % 2 === 0 ? 2.25 : 0.68 });
    const out = dressStandees(poses, choices, fits);
    const layoutOut = statusLayout(placed, out);
    for (const [cardId] of choices) {
      const pose = out.get(cardId)!;
      assert.match(pose.standee ?? '', /^s\d+$/, 'an opaque id');
      assert.deepEqual(pose.props, []);
      assert.equal(pose.costume, null);
      assert.equal(pose.hair, null);
      assert.equal(pose.rest, null);
      assert.ok(pose.width <= FIGURE_MAX_WIDTH + 1e-9, 'D65: the cut’s own width inside the rank slot');
      assert.ok(pose.height <= poses.get(cardId)!.height + 1e-12, 'refitted, never grown');
      dressed += 1;
      const strip = layoutOut.get(cardId);
      if (strip !== undefined) {
        assert.ok(Math.abs(strip.anchor[1] - (pose.position[1] + pose.height + STATUS_LIFT)) < 1e-9, 'the strip stands over the standee’s refitted height');
        strips += 1;
      }
    }
  }
  console.log(`standee × status: ${String(dressed)} dressed standees in a seventh of the corpus's frames, ${String(strips)} with a strip over their refitted height`);
  assert.ok(dressed > 100 && strips > 100);
});

// ---------------------------------------------------------------------------
// 4. What was measured: the facing, the legibility, the tapped stance, the fall
// ---------------------------------------------------------------------------

const PX_W = 1600;
const PX_H = 1000;
/** The least subject fill of its box over the 158 maps measured (Castle Doom, 0.214 — docs/evidence/standee.md §1), rounded down. */
const LEAST_FILL = 0.2;
/** The widest cut measured (2.25 × its height), so the shortest standee the width clamp allows. */
const WIDEST_CUT = 2.25;
/** traits.test's bar for an identity detail (IDENTITY_MIN_PX). */
const LEGIBLE_PX = 48;

type V3 = [number, number, number];

function toPx(pose: Pose, point: V3): [number, number] | null {
  const ndc = projectToNdc(pose, point, undefined, PX_W / PX_H);
  if (ndc === null) return null;
  return [((ndc[0] + 1) / 2) * PX_W, ((1 - ndc[1]) / 2) * PX_H];
}

/** A standee's corners (its box, a unit tall × aspect wide) at `height`, its front toward `front` (a unit vector in xz), bowed/sunk by a stance. */
function corners(stand: V3, height: number, aspect: number, front: V3, lean = 0, sink = 0): V3[] {
  const right: V3 = [front[2], 0, -front[0]];
  const out: V3[] = [];
  for (const [x, y] of [
    [-aspect / 2, 0],
    [aspect / 2, 0],
    [aspect / 2, 1],
    [-aspect / 2, 1],
  ] as const) {
    const yy = y * Math.cos(lean) - sink;
    const zz = -y * Math.sin(lean);
    out.push([stand[0] + height * (right[0] * x + front[0] * zz), stand[1] + height * yy, stand[2] + height * (right[2] * x + front[2] * zz)]);
  }
  return out;
}

function areaPx(pose: Pose, quad: readonly V3[]): { area: number; height: number } | null {
  const pts = quad.map((p) => toPx(pose, p));
  if (pts.some((p) => p === null)) return null;
  const q = pts as Array<[number, number]>;
  let area = 0;
  for (let i = 0; i < q.length; i++) {
    const [x0, y0] = q[i]!;
    const [x1, y1] = q[(i + 1) % q.length]!;
    area += x0 * y1 - x1 * y0;
  }
  const ys = q.map((p) => p[1]);
  return { area: Math.abs(area) / 2, height: Math.max(...ys) - Math.min(...ys) };
}

/** Is the painted side toward the camera? */
function facesCamera(pose: Pose, stand: V3, front: V3): boolean {
  return (pose.position[0] - stand[0]) * front[0] + (pose.position[2] - stand[2]) * front[2] > 0;
}

test('standee: the facing (D261) — turned to the camera, every standee shows its painting from the seat-safe views on BOTH seats, at least 48 px of subject at 1× from the table view; D143’s facing would show your own seat cardboard', () => {
  assert.equal(STANDEE_FACES_CAMERA, true, 'the measured facing');
  const views = (['table', 'shoulder', 'low'] as const).map((id) => VIEW_BY_ID[id]);
  for (const view of views) assert.equal(view.seatSafe, true, `${view.id} is a seat-safe view`);
  const worst: Record<string, number> = {};
  const seatFront: Record<string, { shown: number; of: number }> = { you: { shown: 0, of: 0 }, opp: { shown: 0, of: 0 } };
  let measured = 0;
  let frames = 0;
  for (const { state } of corpusStates()) {
    frames += 1;
    if (frames % 5 !== 0) continue;
    const placed = layout(state);
    const poses = figurePose(placed, state.board?.combat ?? null, DATA, { models: MODELS });
    for (const pose of poses.values()) {
      if (pose.anonymous || pose.modelId === null || pose.swarm > 0 || pose.silhouette !== null || pose.vehicle || pose.ghost) continue;
      const height = Math.min(pose.height, FIGURE_MAX_WIDTH / WIDEST_CUT);
      for (const view of views) {
        const cam = view.pose;
        const toCam: V3 = [cam.position[0] - pose.position[0], 0, cam.position[2] - pose.position[2]];
        const len = Math.hypot(toCam[0], toCam[2]);
        const billboard: V3 = [toCam[0] / len, 0, toCam[2] / len];
        const got = areaPx(cam, corners(pose.position, height, WIDEST_CUT, billboard));
        if (got === null) continue;
        const key = `${view.id}:${pose.seat}`;
        worst[key] = Math.min(worst[key] ?? Infinity, got.area * LEAST_FILL);
        measured += 1;
        // D143: your figures face the opponent (π), the opponent's face you (0).
        const own: V3 = [Math.sin(seatFacingY(pose.seat)), 0, Math.cos(seatFacingY(pose.seat))];
        seatFront[pose.seat]!.of += 1;
        if (facesCamera(cam, pose.position, own)) seatFront[pose.seat]!.shown += 1;
      }
    }
  }
  console.log(
    `standee facing (D261): ${String(measured)} standee×view measurements — the least subject in px at 1600 × 1000 (fill ${String(LEAST_FILL)}, cut ${String(WIDEST_CUT)}× wide): ` +
      Object.entries(worst).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(', ') +
      ` · D143's facing shows its painting to the camera on ${String(seatFront['you']!.shown)} of ${String(seatFront['you']!.of)} of your seat's and ${String(seatFront['opp']!.shown)} of ${String(seatFront['opp']!.of)} of the opponent's`,
  );
  assert.ok(measured > 1000);
  for (const seat of ['you', 'opp']) {
    assert.ok((worst[`table:${seat}`] ?? 0) >= LEGIBLE_PX, `the table view: under ${String(LEGIBLE_PX)} px of subject on the ${seat} seat`);
  }
  assert.equal(seatFront['you']!.shown, 0, 'the control: under D143, your own standees show your seat only their backs');
  assert.ok(seatFront['opp']!.shown > 0);
  // The shader turns the front to the camera about the vertical (the root's own turn is the other answer).
  assert.match(STANDEE_VERTEX, /vec3 toEye = cameraPosition - origin;\s*toEye\.y = 0\.0;/);
  assert.match(STANDEE_VERTEX, /mix\( own, toEye, uFaceCamera \)/);
});

test('standee: the tapped stance (D262) — a sink and a bow read SHORTER from the table view than standing, and a lean back (refused) reads taller; its top stays under the strip; the fall is flat on its back by 0.7 of the death cue', () => {
  const cam = VIEW_BY_ID.table.pose;
  const aspect = 1.37; // the median cut (docs/evidence/standee.md §1)
  const height = Math.min(FIGURE_HEIGHT, FIGURE_MAX_WIDTH / aspect);
  const shortest: Record<string, number> = {};
  for (const stand of [
    [0, 0.02, 1.78],
    [1.6, 0.02, 1.78],
    [-1.6, 0.02, -1.78],
    [0.8, 0.02, -1.78],
  ] as V3[]) {
    const toCam: V3 = [cam.position[0] - stand[0], 0, cam.position[2] - stand[2]];
    const len = Math.hypot(toCam[0], toCam[2]);
    const front: V3 = [toCam[0] / len, 0, toCam[2] / len];
    const standing = areaPx(cam, corners(stand, height, aspect, front))!.height;
    const tapped = STANDEE_STANCES.crouch;
    const kneel = areaPx(cam, corners(stand, height, aspect, front, tapped.lean, tapped.sink))!.height;
    const leanBack = areaPx(cam, corners(stand, height, aspect, front, 0.95, 0))!.height;
    shortest['kneel'] = Math.min(shortest['kneel'] ?? Infinity, standing / kneel);
    shortest['lean back'] = Math.min(shortest['lean back'] ?? Infinity, standing / leanBack);
    assert.ok(kneel <= 0.8 * standing, `the tapped standee reads ${(kneel / standing).toFixed(2)} of its standing height`);
    assert.ok(leanBack >= standing, 'the refused lean back reads TALLER from a camera that looks down');
  }
  console.log(`standee tapped (D262): standing ÷ tapped ≥ ${shortest['kneel']!.toFixed(2)}; standing ÷ leaning back ≥ ${shortest['lean back']!.toFixed(3)} (under 1: taller)`);
  // The tapped top never rises: (1 − sink) cos(bow) of the standing height.
  const t = STANDEE_STANCES.crouch;
  assert.ok((1 - t.sink) * Math.cos(t.lean) < 0.8 && t.sink > 0 && t.lean < 0);
  for (const stance of ['ready', 'sick', 'attacking', 'blocking'] as const) assert.deepEqual({ ...STANDEE_STANCES[stance] }, { lean: 0, sink: 0 }, stance);
  // The fall.
  assert.equal(standeeFallOf(0), 0);
  assert.equal(standeeFallOf(0.7), STANDEE_FALL);
  assert.equal(standeeFallOf(1), STANDEE_FALL);
  let last = 0;
  for (let k = 1; k <= 20; k++) {
    const v = standeeFallOf(k / 20);
    assert.ok(v >= last - 1e-12, 'the fall never stands back up');
    last = v;
  }
  assert.ok(STANDEE_FALL > 1.2 && STANDEE_FALL < Math.PI / 2, 'flat on its back, not through the table');
});

// ---------------------------------------------------------------------------
// 5. The mesh and the program
// ---------------------------------------------------------------------------

test('standee: ONE mesh, two sheets, 1,920 triangles (D263); the program draws exactly the cut, and nothing reads a clock', () => {
  const sheets = standeeSheets();
  const triangles = sheets.indices.length / 3;
  assert.equal(triangles, 2 * STANDEE_GRID[0] * STANDEE_GRID[1] + 2 * STANDEE_BACK_GRID[0] * STANDEE_BACK_GRID[1]);
  assert.equal(triangles, 1920);
  const vertices = sheets.positions.length / 3;
  assert.equal(sheets.uvs.length / 2, vertices);
  assert.equal(sheets.layers.length, vertices);
  assert.ok(sheets.indices.every((i) => i >= 0 && i < vertices));
  const back = sheets.layers.filter((l) => l === 1).length;
  assert.equal(back, (STANDEE_BACK_GRID[0] + 1) * (STANDEE_BACK_GRID[1] + 1));
  assert.equal(sheets.layers[sheets.indices[0]!], 1, 'the back first, so the front is drawn over it in the same call');
  // The fragment is standeeCutOf's test: the keep mask, red over green by the cliff, or at least near.
  assert.match(STANDEE_FRAGMENT, /if \( d\.b < 0\.5 \|\| \( d\.r - d\.g <= uCut && d\.r < uNear \) \) discard;/);
  assert.match(STANDEE_FRAGMENT, /if \( d\.g < uNear \) discard;/, 'the back only where what it shows is the subject');
  assert.match(STANDEE_FRAGMENT, /#include <colorspace_fragment>/);
  assert.doesNotMatch(`${STANDEE_VERTEX}${STANDEE_FRAGMENT}`, /uTime|uLook|halftone|uKey/, 'unlit, unmarked, and no clock');
  assert.match(STANDEE_VERTEX, /float depth = max\( mix\( d\.r, d\.g, aLayer \), uNear \);/, 'a triangle across a silhouette never stretches back to the background');
  // The aspect a pose is refitted to: the cut's own pixels.
  const entry = { width: 410, height: 301 };
  assert.ok(Math.abs(standeeAspectOf(entry, CUT) - ((0.8 * 410) / (0.93 * 301))) < 1e-9);
});

test('standee: the choice carries no name — a choice is a print id, the dev route’s two addresses and the cut; a dressed pose carries only the opaque id', () => {
  const art = spyArt();
  const relief = spyRelief();
  let checked = 0;
  for (const { state } of corpusStates()) {
    const placed = layout(state);
    const poses = figurePose(placed, state.board?.combat ?? null, DATA, { models: MODELS });
    const choices: ReadonlyMap<number, StandeeChoice> = standeeChoicesOf(placed, poses, art.art, relief.relief, { base: BASE });
    for (const choice of choices.values()) {
      assert.deepEqual(Object.keys(choice).sort(), ['back', 'cut', 'entry', 'image', 'key', 'map']);
      checked += 1;
    }
    if (checked > 200) break;
  }
  assert.ok(checked > 200);
  assert.ok(statSync(fileURLToPath(new URL('../src/arena/standee.ts', import.meta.url))).size > 1000);
});
