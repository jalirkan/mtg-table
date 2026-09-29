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
 *     D143's facing would show your own seat nothing but cardboard; the tapped
 *     stance — shorter from the table view than standing but never the sliver the
 *     first stance was, where leaning back reads taller; and the fall.
 *  5. **THE legibility floor, rasterised on real frames** (D261, as the fix pass
 *     amended it): the standee rasterised through the table view at 1600 × 1000
 *     at every stand point of `g1`@316 and the Masters of Evil's @209 and @371 on
 *     both seats — the drones the verifier saw as slivers stand as their CC0
 *     bodies, the rank that read still stands — and over the corpus, the floor's
 *     number is what the raster draws, and no standee the lookup keeps draws under
 *     it in any stance.
 *  6. **The mesh** (D263): two sheets, one draw call, 1,920 triangles; the cut
 *     and its ink rim, drawn exactly.
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
import { figurePose, fitHeight, type FigureLayout, type FigurePose } from '../src/arena/figures/pose.ts';
import { statusLayout } from '../src/arena/figures/status.ts';
import { validateFigures, validateModels } from '../src/arena/figures/validate.ts';
import { FIGURE_HEIGHT, FIGURE_MAX_WIDTH, STATUS_LIFT, layout, seatFacingY, type Layout, type Placement } from '../src/arena/layout.ts';
import { COMIC } from '../src/arena/look.ts';
import { RELIEF_CLIFF, STANDEE_BACK_GRID, STANDEE_FACES_CAMERA, STANDEE_GRID, STANDEE_LEGIBLE_CANVAS, STANDEE_MIN_PX, STANDEE_MIN_SHARE } from '../src/arena/perf.ts';
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
  standeeFillOf,
  standeeLegibilityAt,
  standeeReads,
  standeeSheets,
  type StandeeChoice,
  type StandeeFit,
  type StandeeStance,
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

/**
 * The legibility floor, written apart from `standeeLegibilityAt`: the kneeling
 * standee's box (cut at the table) projected through the table view by this
 * test's own `toPx`, its area × the cut's fill, against `STANDEE_MIN_PX`.
 */
function readsApart(pose: FigurePose, cut: StandeeCut): boolean {
  const aspect = ((cut.box.right - cut.box.left) * 410) / ((cut.box.bottom - cut.box.top) * 301);
  const fill = cut.share / ((cut.box.right - cut.box.left) * (cut.box.bottom - cut.box.top));
  const height = Math.min(pose.height, FIGURE_MAX_WIDTH / aspect);
  const got = areaPx(VIEW_BY_ID.table.pose, keptCorners(pose.position, height, aspect, towardTable(pose.position), STANDEE_STANCES.crouch));
  return got !== null && Math.sqrt(got.area * fill) >= STANDEE_MIN_PX;
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

test('standee: over every board frame of the corpus made HOSTILE, the art index is never asked about a concealed card nor the relief about its print; a standee iff face up, named, un-dressed, with a relief, and it reads; the tier off stands none; an ungated lookup leaks (hard rule 8, D264)', () => {
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
        if (eligible(p, poses.get(p.cardId), taken) && readsApart(poses.get(p.cardId)!, CUT)) expected.add(p.cardId);
      }
      assert.deepEqual([...choices.keys()].sort((x, y) => x - y), [...expected].sort((x, y) => x - y), `${file}: the standees are not exactly the face-up, named, un-dressed figures that read`);
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
    if (p.placements.filter((x) => eligible(x, f.get(x.cardId), new Map()) && readsApart(f.get(x.cardId)!, CUT)).length >= 3) {
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
// 4. What was measured: the facing, the tapped stance, the fall
// ---------------------------------------------------------------------------

const [PX_W, PX_H] = STANDEE_LEGIBLE_CANVAS;

type V3 = [number, number, number];

function toPx(pose: Pose, point: V3): [number, number] | null {
  const ndc = projectToNdc(pose, point, undefined, PX_W / PX_H);
  if (ndc === null) return null;
  return [((ndc[0] + 1) / 2) * PX_W, ((1 - ndc[1]) / 2) * PX_H];
}

/** The unit front of a standee at `stand` turned to the table view's camera about the vertical (D261). */
function towardTable(stand: readonly number[]): V3 {
  const cam = VIEW_BY_ID.table.pose;
  const x = cam.position[0] - stand[0]!;
  const z = cam.position[2] - stand[2]!;
  const len = Math.hypot(x, z);
  return [x / len, 0, z / len];
}

/** A point of a standee's box — `u` across (−½…½ of its width), `v` up (0…1 of its height) — bowed and sunk by a stance, as `STANDEE_VERTEX` poses it. */
function boxPoint(stand: readonly number[], height: number, aspect: number, front: V3, stance: StandeeStance, u: number, v: number): V3 {
  const right: V3 = [front[2], 0, -front[0]];
  const x = u * aspect;
  const yy = v * Math.cos(stance.lean) - stance.sink;
  const zz = -v * Math.sin(stance.lean);
  return [stand[0]! + height * (right[0] * x + front[0] * zz), stand[1]! + height * yy, stand[2]! + height * (right[2] * x + front[2] * zz)];
}

/** The corners of what a standee DRAWS: its box from the table's plane up (the fragment shader's `vAbove` cut). */
function keptCorners(stand: readonly number[], height: number, aspect: number, front: V3, stance: StandeeStance = { lean: 0, sink: 0 }): V3[] {
  const from = Math.min(1, stance.sink / Math.cos(stance.lean));
  return [
    boxPoint(stand, height, aspect, front, stance, -0.5, from),
    boxPoint(stand, height, aspect, front, stance, 0.5, from),
    boxPoint(stand, height, aspect, front, stance, 0.5, 1),
    boxPoint(stand, height, aspect, front, stance, -0.5, 1),
  ];
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
function facesCamera(pose: Pose, stand: readonly number[], front: V3): boolean {
  return (pose.position[0] - stand[0]!) * front[0] + (pose.position[2] - stand[2]!) * front[2] > 0;
}

test('standee: the facing (D261) — turned to the camera, every standee shows its painting from the seat-safe views on BOTH seats; D143’s facing would show your own seat cardboard', () => {
  assert.equal(STANDEE_FACES_CAMERA, true, 'the measured facing');
  const views = (['table', 'shoulder', 'low'] as const).map((id) => VIEW_BY_ID[id]);
  for (const view of views) assert.equal(view.seatSafe, true, `${view.id} is a seat-safe view`);
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
      for (const view of views) {
        const cam = view.pose;
        const toCam: V3 = [cam.position[0] - pose.position[0], 0, cam.position[2] - pose.position[2]];
        const len = Math.hypot(toCam[0], toCam[2]);
        const billboard: V3 = [toCam[0] / len, 0, toCam[2] / len];
        assert.ok(facesCamera(cam, pose.position, billboard), 'turned to the camera, the painted side is toward it');
        measured += 1;
        // D143: your figures face the opponent (π), the opponent's face you (0).
        const own: V3 = [Math.sin(seatFacingY(pose.seat)), 0, Math.cos(seatFacingY(pose.seat))];
        seatFront[pose.seat]!.of += 1;
        if (facesCamera(cam, pose.position, own)) seatFront[pose.seat]!.shown += 1;
      }
    }
  }
  console.log(
    `standee facing (D261): ${String(measured)} standee×view measurements from the three seat-safe views — ` +
      `D143's facing shows its painting to the camera on ${String(seatFront['you']!.shown)} of ${String(seatFront['you']!.of)} of your seat's and ${String(seatFront['opp']!.shown)} of ${String(seatFront['opp']!.of)} of the opponent's`,
  );
  assert.ok(measured > 1000);
  assert.equal(seatFront['you']!.shown, 0, 'the control: under D143, your own standees show your seat only their backs');
  assert.ok(seatFront['opp']!.shown > 0);
  // The shader turns the front to the camera about the vertical (the root's own turn is the other answer).
  assert.match(STANDEE_VERTEX, /vec3 toEye = cameraPosition - origin;\s*toEye\.y = 0\.0;/);
  assert.match(STANDEE_VERTEX, /mix\( own, toEye, uFaceCamera \)/);
});

test('standee: the tapped stance (D262, amended) — a small sink and bow read SHORTER from the table view than standing but never the sliver the first stance was; a lean back (refused) reads taller; the fall is flat on its back by 0.7 of the death cue', () => {
  const cam = VIEW_BY_ID.table.pose;
  const aspect = 1.37; // the median cut (docs/evidence/standee.md §1)
  const height = Math.min(FIGURE_HEIGHT, FIGURE_MAX_WIDTH / aspect);
  const FIRST: StandeeStance = { lean: -0.3, sink: 0.25 }; // D262 as the lane first chose it: the verifier's sliver
  const worst: Record<string, [number, number]> = {};
  const note = (key: string, v: number): void => {
    const was = worst[key] ?? [Infinity, -Infinity];
    worst[key] = [Math.min(was[0], v), Math.max(was[1], v)];
  };
  for (const stand of [
    [0, 0.02, 1.78],
    [1.6, 0.02, 1.78],
    [0.4, 0.02, 2.85],
    [-1.6, 0.02, -1.78],
    [0.8, 0.02, -2.85],
    [0, 0.02, -3.6],
  ] as V3[]) {
    const front = towardTable(stand);
    const standing = areaPx(cam, keptCorners(stand, height, aspect, front))!;
    const kneel = areaPx(cam, keptCorners(stand, height, aspect, front, STANDEE_STANCES.crouch))!;
    const first = areaPx(cam, keptCorners(stand, height, aspect, front, FIRST))!;
    const leanBack = areaPx(cam, keptCorners(stand, height, aspect, front, { lean: 0.95, sink: 0 }))!;
    note('kneel height', kneel.height / standing.height);
    note('kneel area', kneel.area / standing.area);
    note('first height', first.height / standing.height);
    note('first area', first.area / standing.area);
    assert.ok(kneel.height <= 0.8 * standing.height, `the tapped standee reads ${(kneel.height / standing.height).toFixed(2)} of its standing height: not shorter`);
    assert.ok(kneel.height >= 0.65 * standing.height && kneel.area >= 0.6 * standing.area, `the tapped standee reads ${(kneel.height / standing.height).toFixed(2)} of its standing height: a sliver`);
    // The control: the first stance was the sliver the verifier saw (MoE@209, g1@316).
    assert.ok(first.height < 0.6 * standing.height, 'the first stance no longer reads as the sliver it was');
    assert.ok(leanBack.height >= standing.height, 'the refused lean back reads TALLER from a camera that looks down');
  }
  const fmt = (k: string): string => `${worst[k]![0].toFixed(2)}–${worst[k]![1].toFixed(2)}`;
  console.log(`standee tapped (D262, amended): kneeling reads ${fmt('kneel height')} of its standing height and ${fmt('kneel area')} of its area from the table view; the first stance ${fmt('first height')} and ${fmt('first area')}`);
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
// 5. THE legibility floor, rasterised on real frames
// ---------------------------------------------------------------------------

/**
 * **A standee, rasterised** through the table view at the floor's canvas: the
 * pixels whose CENTRE lies inside the drawn subject. The subject is a synthetic
 * figure — the full height of the cut's box and `fill` of its width, centred, cut
 * at the table — so its area is the box's × `fill`, as the floor counts it.
 */
function rasterSubject(stand: readonly number[], height: number, aspect: number, fill: number, stance: StandeeStance): { size: number; height: number } {
  const cam = VIEW_BY_ID.table.pose;
  const front = towardTable(stand);
  const from = Math.min(1, stance.sink / Math.cos(stance.lean));
  const half = fill / 2;
  const quad = [
    [-half, from],
    [half, from],
    [half, 1],
    [-half, 1],
  ].map(([u, v]) => toPx(cam, boxPoint(stand, height, aspect, front, stance, u!, v!)));
  if (quad.some((p) => p === null)) return { size: 0, height: 0 };
  const q = quad as Array<[number, number]>;
  const xs = q.map((p) => p[0]);
  const ys = q.map((p) => p[1]);
  // A convex quad: a pixel centre is inside iff it is on the same side of all four edges.
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const [x0, y0] = q[i]!;
    const [x1, y1] = q[(i + 1) % 4]!;
    const [x2, y2] = q[(i + 2) % 4]!;
    sign += Math.sign((x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0));
  }
  let pixels = 0;
  let top = Infinity;
  let bottom = -Infinity;
  for (let py = Math.floor(Math.min(...ys)); py <= Math.ceil(Math.max(...ys)); py++) {
    for (let px = Math.floor(Math.min(...xs)); px <= Math.ceil(Math.max(...xs)); px++) {
      const cx = px + 0.5;
      const cy = py + 0.5;
      let inside = true;
      for (let i = 0; i < 4 && inside; i++) {
        const [x0, y0] = q[i]!;
        const [x1, y1] = q[(i + 1) % 4]!;
        inside = Math.sign((x1 - x0) * (cy - y0) - (y1 - y0) * (cx - x0)) * Math.sign(sign) >= 0;
      }
      if (!inside) continue;
      pixels += 1;
      top = Math.min(top, py);
      bottom = Math.max(bottom, py);
    }
  }
  return { size: Math.sqrt(pixels), height: pixels === 0 ? 0 : bottom - top + 1 };
}

/** The state after the first `n` frames of a recording — the replay cursor's `@n`. */
function stateAt(file: string, n: number): ClientState {
  const log = parseFrameLog(readFileSync(join(REPO, 'fixtures', 'games', file), 'utf8'));
  let state = initialState();
  for (const frame of (log.frames as Frame[]).slice(0, n)) state = reduce(state, frame);
  return state;
}

/** A relief index whose every print is cut at `aspect` × `fill` (410 × 301, the modern frame's art box). */
function reliefWith(aspect: number, fill: number): ReliefIndex {
  const h = 0.9;
  const w = Math.min(0.98, (aspect * h * 301) / 410);
  const hh = (w * 410) / (aspect * 301);
  const cut: StandeeCut = { box: { left: 0.01, right: 0.01 + w, top: 0.05, bottom: 0.05 + hh }, near: 0.3, share: fill * w * hh };
  const byId = {
    get: (id: string): ReliefEntry => ({ id, file: `${id}.png`, width: 410, height: 301, back: { file: `${id}.back.jpg`, width: 560, height: 451, margin: 75 }, standee: cut }),
    has: (): boolean => true,
    size: 1,
  } as unknown as ReadonlyMap<string, ReliefEntry>;
  return { byId, dropped: [] };
}

test('standee: THE legibility floor, rasterised on real frames (D261, amended) — g1@316 and the Masters of Evil’s @209 and @371 from the table view on both seats: a drone’s flight is its CC0 body, the rank that read still stands; over the corpus the floor is what the raster draws, and nothing it keeps draws under it in any stance', () => {
  assert.equal(STANDEE_MIN_PX, 30, 'the floor the pictures chose (docs/evidence/standee.md §9)');
  assert.deepEqual([...STANDEE_LEGIBLE_CANVAS], [1600, 1000], 'traits.test’s raster canvas');
  const FLIGHT = { aspect: 1.31, fill: 0.35 }; // a flight scene: the deck's drone paintings measure this (evidence §9)
  const PORTRAIT = { aspect: 0.8, fill: 0.66 }; // a figure in a doorway
  const MEDIAN = { aspect: 1.37, fill: 0.5 }; // the deck's median cut (evidence §1)
  const art = spyArt().art;
  const lines: string[] = [];
  const at = (file: string, n: number, cut: { aspect: number; fill: number }) => {
    const state = stateAt(file, n);
    const placed = layout(state);
    const poses = figurePose(placed, state.board?.combat ?? null, DATA, { models: MODELS });
    const chosen = standeeChoicesOf(placed, poses, art, reliefWith(cut.aspect, cut.fill), { base: BASE });
    const rows: Array<{ pose: FigurePose; kept: boolean; kneel: { size: number; height: number }; now: { size: number; height: number } }> = [];
    for (const p of placed.placements) {
      if (p.kind !== 'creature') continue;
      const pose = poses.get(p.cardId);
      if (!eligible(p, pose, new Map())) continue;
      const h = fitHeight(pose!.height, cut.aspect);
      rows.push({
        pose: pose!,
        kept: chosen.has(p.cardId),
        kneel: rasterSubject(pose!.position, h, cut.aspect, cut.fill, STANDEE_STANCES.crouch),
        now: rasterSubject(pose!.position, h, cut.aspect, cut.fill, STANDEE_STANCES[pose!.stance]),
      });
    }
    lines.push(
      `  ${file}@${String(n)} (${String(cut.aspect)} × ${String(cut.fill)}): ` +
        rows.map((r) => `${r.pose.seat} ${String(r.pose.modelId)} ${r.pose.stance} ${r.kneel.size.toFixed(0)}/${r.now.size.toFixed(0)}px ${r.kept ? 'STANDS' : 'cc0'}`).join(', '),
    );
    return rows;
  };
  // g1@316: the drones on both seats — the verifier's slivers — are their CC0 bodies.
  const g1 = at('g1.jsonl', 316, FLIGHT);
  const drones = g1.filter((r) => r.pose.modelId === 'drone');
  assert.deepEqual([...new Set(drones.map((r) => r.pose.seat))].sort(), ['opp', 'you'], 'g1@316 no longer has a drone on each seat');
  for (const r of drones) {
    assert.equal(r.kept, false, `g1@316: the ${r.pose.seat} seat's drone still stands as a standee`);
    assert.ok(r.kneel.size < STANDEE_MIN_PX, 'the raster agrees: under the floor');
  }
  // MoE@209: the opponent's sick drone is its CC0 body; the opponent's tapped figure in a doorway reads, rimmed.
  const moe209 = at('villain-masters-of-evil-33.jsonl', 209, FLIGHT);
  const sickDrone = moe209.find((r) => r.pose.modelId === 'drone' && r.pose.seat === 'opp' && r.pose.stance === 'sick');
  assert.ok(sickDrone !== undefined && !sickDrone.kept, 'MoE@209: the opponent’s sick drone still stands as a standee');
  const doorway = at('villain-masters-of-evil-33.jsonl', 209, PORTRAIT).find((r) => r.pose.seat === 'opp' && r.pose.stance === 'crouch');
  assert.ok(doorway !== undefined && doorway.kept && doorway.now.size >= STANDEE_MIN_PX, 'MoE@209: the opponent’s tapped portrait no longer reads');
  // MoE@371: your seat's rank, with the median cut, still stands — every one.
  const rank = at('villain-masters-of-evil-33.jsonl', 371, MEDIAN).filter((r) => r.pose.seat === 'you');
  assert.ok(rank.length >= 5 && rank.every((r) => r.kept), 'MoE@371: your seat’s rank no longer stands');
  // The control: every drone passed the lane's first measure — at least 48 px of subject (traits.test's bar
  // for a prop, D261 as first written) — which is why it stood as a sliver; each passes every gate but the floor.
  assert.ok(drones.every((r) => r.kneel.size * r.kneel.size >= 48), 'the first measure would have stood the drones down too — the control proves nothing');
  console.log(`standee legibility (D261, amended) — kneeling/now subject px at 1× from the table view, 1600 × 1000:\n${lines.join('\n')}`);

  // Over a sample of the corpus: the floor's number IS the raster's, and nothing kept draws under it.
  let compared = 0;
  let kept = 0;
  let worstDiff = 0;
  let frames = 0;
  for (const { state } of corpusStates()) {
    frames += 1;
    if (frames % 11 !== 0) continue;
    const placed = layout(state);
    const poses = figurePose(placed, state.board?.combat ?? null, DATA, { models: MODELS });
    for (const cut of [FLIGHT, PORTRAIT, MEDIAN, { aspect: 2.25, fill: 0.5 }, { aspect: 0.68, fill: 0.45 }]) {
      const chosen = standeeChoicesOf(placed, poses, art, reliefWith(cut.aspect, cut.fill), { base: BASE });
      for (const [cardId] of chosen) {
        const pose = poses.get(cardId)!;
        const h = fitHeight(pose.height, cut.aspect);
        const analytic = standeeLegibilityAt(pose.position, h, cut.aspect, cut.fill);
        const raster = rasterSubject(pose.position, h, cut.aspect, cut.fill, STANDEE_STANCES.crouch);
        worstDiff = Math.max(worstDiff, Math.abs(analytic.size - raster.size) / raster.size);
        compared += 1;
        assert.ok(Math.abs(analytic.size - raster.size) <= Math.max(1.5, 0.04 * raster.size), `the floor measures ${analytic.size.toFixed(1)} px where the raster draws ${raster.size.toFixed(1)}`);
        for (const stance of ['ready', 'crouch', 'sick', 'attacking', 'blocking'] as const) {
          assert.ok(rasterSubject(pose.position, h, cut.aspect, cut.fill, STANDEE_STANCES[stance]).size >= STANDEE_MIN_PX - 1.5, `a kept standee draws under the floor ${stance}`);
        }
        assert.ok(standeeReads(pose, cut.aspect, cut.fill));
        kept += 1;
      }
    }
  }
  console.log(`standee legibility: ${String(compared)} kept standees over an eleventh of the corpus's frames × five cuts — the floor within ${(worstDiff * 100).toFixed(1)}% of the raster, none under ${String(STANDEE_MIN_PX)} px in any stance`);
  assert.ok(kept > 1000, 'the sweep kept nothing — it proves nothing');
  // The fill a lookup reads: the share over the box.
  assert.ok(Math.abs(standeeFillOf({ box: { left: 0, right: 0.5, top: 0, bottom: 0.5 }, near: 0.3, share: 0.1 }) - 0.4) < 1e-12);
});

// ---------------------------------------------------------------------------
// 6. The mesh and the program
// ---------------------------------------------------------------------------

test('standee: ONE mesh, two sheets, 1,920 triangles (D263); the program draws exactly the cut and its ink rim — the figures’ own outer ink — and nothing reads a clock', () => {
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
  assert.match(STANDEE_FRAGMENT, /bool subject = d\.b >= 0\.5 && \( d\.r - d\.g > uCut \|\| d\.r >= uNear \);/);
  assert.match(STANDEE_FRAGMENT, /return t\.b >= 0\.5 && \( t\.r - t\.g > uCut \|\| t\.r >= uNear \);/, 'the rim’s taps ask the same test');
  // The ink rim (D261, amended): eight taps `uRim` pixels out, their coordinates from the pixel's own
  // footprint, all computed before any branch; the taps read only where the front is not the subject.
  assert.match(STANDEE_FRAGMENT, /vec2 reach = fwidth\( vMapUv \) \* uRim;/);
  const taps = STANDEE_FRAGMENT.match(/subjectAt\( (e|w|n|s|ne|sw|se|nw) \)/g) ?? [];
  assert.equal(new Set(taps).size, 8, 'eight taps round the pixel');
  assert.match(STANDEE_FRAGMENT, /if \( !rim \) discard;\s*colour = uInk;/);
  const main = STANDEE_FRAGMENT.slice(STANDEE_FRAGMENT.indexOf('void main()'));
  const firstBranch = main.indexOf('if (');
  for (const coord of ['vec2 e =', 'vec2 w =', 'vec2 n =', 'vec2 s =', 'vec2 ne =', 'vec2 sw =', 'vec2 se =', 'vec2 nw =', 'vec4 d = texture2D( uDepth, vMapUv );']) {
    assert.ok(main.indexOf(coord) > 0 && main.indexOf(coord) < firstBranch, `${coord} is computed after a branch: a sample's mip level would be undefined where the cut divides a quad`);
  }
  assert.doesNotMatch(STANDEE_FRAGMENT, /textureGrad|textureLod/, 'the explicit forms cost SwiftShader 3–9 ms a frame for nine standees (evidence §9)');
  const cache = readFileSync(fileURLToPath(new URL('../src/arena/scene/reliefCache.ts', import.meta.url)), 'utf8');
  assert.match(cache, /const STANDEE_RIM = \{ value: Math\.max\(1, COMIC\.inkCssPx\) \};/, 'the rim is the figures’ outer ink');
  assert.match(cache, /STANDEE_RIM\.value = Math\.max\(1, COMIC\.inkCssPx \* dpr\);/, 'the rim follows the render dpr');
  assert.match(cache, /const STANDEE_INK = \{ value: new THREE\.Color\(COMIC\.ink\) \};/);
  assert.ok(COMIC.inkCssPx >= 1 && /^#[0-9a-f]{6}$/.test(COMIC.ink));
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
