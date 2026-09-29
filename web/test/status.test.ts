/*
 * mtg-table — web/test/status.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The status layer** (amendment M49, D210–D212): a creature's keyword icons,
 * the bar of what is left of its toughness, its counter pips and its attachment
 * marks — on the board's tiles and above the arena's figures.
 *
 * What is held here, in order:
 *
 *  1. **The one reader**, `protocol.ts`'s `keywordsOf`: absent is `[]` (every
 *     committed recording predates M49), a stub and a face-down card are `[]`
 *     whatever they carry.
 *  2. **The shared data**, `status.ts`: the glyph kit, the labels, the bar, the
 *     pips, the marks — and `cardStatus` answering `null` for both concealed shapes.
 *  3. **The corpus sweep, as it is and HOSTILE**: every strip `statusLayout`
 *     lays out over every frame of every fixture belongs to a face-up card on the
 *     battlefield; then the corpus again with EVERY card handed keywords (stubs and
 *     face-down cards included), and every keyword still lands on a face-up card.
 *     The negative control is a layout with the gates taken out, which the hostile
 *     corpus catches putting keywords over concealed cards.
 *  4. **The pixels**: an icon is 16 CSS px (the owner's floor is 14 at the table
 *     view, 1600 × 1000); and, through `prop-raster.ts`'s camera and the real
 *     `figures.glb`, the strip's lowest pixel is above every figure's head — and
 *     what it wears — over a sample of the corpus, with a negative control (the
 *     strip at the head with no lift fails it).
 *  5. **The field**: one mesh, and `bind` carries each strip with its card's
 *     live offset.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import * as THREE from 'three';

import { VIEW_BY_ID } from '../src/arena/camera.ts';
import { STATUS_CELLS, STATUS_PX, statusLayout, stripBounds, stripQuads, strippable, type StatusLayout } from '../src/arena/figures/status.ts';
import type { FigureLayout } from '../src/arena/figures/pose.ts';
import { PROP_KIT } from '../src/arena/figures/props.ts';
import { layout, type Layout } from '../src/arena/layout.ts';
import { StatusField, cellRect } from '../src/arena/scene/status.ts';
import { isFaceDown, isHidden, keywordsOf, type AnyCard, type Card, type Frame, type StateFrame } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import {
  EVERGREEN_GLYPHS,
  GLYPHS,
  GLYPH_IDS,
  cardStatus,
  hpOf,
  keywordGlyph,
  keywordLabel,
  marksOf,
  pipsOf,
} from '../src/status.ts';
import { parseFrameLog } from '../src/transport/replay.ts';
import * as raster from './prop-raster.ts';

const GAMES = fileURLToPath(new URL('../../fixtures/games/', import.meta.url));
const SYNTHETIC = fileURLToPath(new URL('../../fixtures/synthetic/', import.meta.url));
const FILES = [
  ...readdirSync(GAMES).filter((n) => n.endsWith('.jsonl')).sort().map((n) => GAMES + n),
  ...readdirSync(SYNTHETIC).filter((n) => n.endsWith('.jsonl')).sort().map((n) => SYNTHETIC + n),
];

/** A full face-up creature on the battlefield, wire-shaped. */
function creature(extra: Partial<Card> & Record<string, unknown> = {}): Card {
  return {
    id: 7,
    name: 'Test Bear',
    setCode: 'MSH',
    manaCost: '{1}{G}',
    types: 'Creature - Bear',
    power: '2',
    toughness: '3',
    loyalty: null,
    damage: 0,
    counters: {},
    tapped: false,
    sick: false,
    attacking: false,
    blocking: false,
    faceDown: false,
    token: false,
    alt: null,
    attachedToId: null,
    attachmentIds: [],
    controller: 0,
    owner: 0,
    zone: 'battlefield',
    abilities: [],
    ...extra,
  } as Card;
}

// ---------------------------------------------------------------------------
// 1. The reader
// ---------------------------------------------------------------------------

test('status: keywordsOf is the one reader — absent, a stub and a face-down card are all []', () => {
  assert.deepEqual(keywordsOf(creature()), [], 'a pre-M49 card (no key) draws no icon');
  assert.deepEqual(keywordsOf(creature({ keywords: ['FLYING', 'FIRST_STRIKE'] })), ['FLYING', 'FIRST_STRIKE']);
  assert.deepEqual(keywordsOf(creature({ keywords: [] })), []);
  // Hostile shapes the bridge never writes: the reader is the second lock.
  const stub = { id: 3, zone: 'hand', owner: 1, controller: 1, hidden: true, keywords: ['FLYING'] } as unknown as AnyCard;
  assert.deepEqual(keywordsOf(stub), [], 'a stub with keywords showed them');
  assert.deepEqual(keywordsOf(creature({ faceDown: true, name: '', keywords: ['FLYING'] })), [], 'a face-down card showed keywords');
  assert.deepEqual(keywordsOf(creature({ keywords: 'FLYING' as unknown as string[] })), []);
  assert.deepEqual(keywordsOf(creature({ keywords: ['FLYING', 3 as unknown as string] })), ['FLYING']);
  assert.deepEqual(keywordsOf(null), []);
  assert.deepEqual(keywordsOf(undefined), []);
});

// ---------------------------------------------------------------------------
// 2. The shared data
// ---------------------------------------------------------------------------

test('status: the glyph kit is procedural path data, one per id, and the evergreen set is the owner’s fourteen', () => {
  assert.deepEqual([...GLYPH_IDS].sort(), Object.keys(GLYPHS).sort());
  for (const [id, glyph] of Object.entries(GLYPHS)) {
    assert.match(glyph.path, /^[MLHVCAZ0-9.,\s-]+$/i, `${id}: not plain SVG path data`);
    assert.match(glyph.path, /^M/, `${id}: a path starts with a move`);
    assert.match(glyph.colour, /^#[0-9a-f]{6}$/i, `${id}: colour`);
  }
  assert.deepEqual(Object.keys(EVERGREEN_GLYPHS).sort(), [
    'DEATHTOUCH', 'DEFENDER', 'DOUBLE_STRIKE', 'FIRST_STRIKE', 'FLASH', 'FLYING', 'HASTE', 'HEXPROOF',
    'INDESTRUCTIBLE', 'LIFELINK', 'MENACE', 'REACH', 'TRAMPLE', 'VIGILANCE',
  ]);
  // Each evergreen keyword has a glyph of its own — no two share one.
  const glyphs = Object.values(EVERGREEN_GLYPHS);
  assert.equal(new Set(glyphs).size, glyphs.length);
  assert.equal(keywordGlyph('FLYING'), 'flying');
  assert.equal(keywordGlyph('TEAMWORK'), 'ability', 'anything else is the generic glyph');
  assert.equal(keywordLabel('FIRST_STRIKE'), 'First strike');
  assert.equal(keywordLabel('TYPECYCLING'), 'Typecycling');
  // The atlas holds every glyph and the solid cell, and every cell's rect is inside the texture.
  assert.deepEqual(STATUS_CELLS, [...GLYPH_IDS, 'solid']);
  for (const cell of STATUS_CELLS) {
    const [u, v, du, dv] = cellRect(cell);
    assert.ok(u >= 0 && v >= 0 && u + du <= 1 && v + dv <= 1 && du > 0 && dv > 0, `${cell}: ${String([u, v, du, dv])}`);
  }
});

test('status: the bar is toughness − damage, drawn and never decided (D211); pips and marks read what they may', () => {
  assert.deepEqual(hpOf(creature({ toughness: '4', damage: 1 })), { toughness: 4, damage: 1, remaining: 3, fraction: 0.75 });
  // At 0 the bar is empty — it says nothing about death (an indestructible creature stands there).
  assert.deepEqual(hpOf(creature({ toughness: '2', damage: 5 })), { toughness: 2, damage: 5, remaining: 0, fraction: 0 });
  assert.equal(hpOf(creature({ toughness: '*' })), null, 'a non-integer toughness draws no bar');
  assert.equal(hpOf(creature({ toughness: '0' })), null);
  assert.equal(hpOf(creature({ zone: 'hand' })), null, 'only on the battlefield');
  assert.equal(hpOf(creature({ types: 'Artifact - Vehicle' })), null, 'only a creature');
  assert.deepEqual(
    pipsOf(creature({ counters: { '+1/+1': 2, Spore: 1, '-1/-1': 0 } })).map((p) => `${p.counter}:${String(p.count)}:${p.kind}`),
    ['+1/+1:2:plus', 'Spore:1:other'],
  );
  // A mark says Aura or Equipment only from a face-up attachment's type line.
  const aura = creature({ id: 11, types: 'Enchantment - Aura' });
  const kit = creature({ id: 12, types: 'Artifact - Equipment' });
  const hiddenAura = { id: 13, zone: 'battlefield', owner: 0, controller: 0, hidden: true } as unknown as AnyCard;
  const faceDownAura = creature({ id: 14, types: 'Enchantment - Aura', faceDown: true, name: '' });
  const host = creature({ attachmentIds: [11, 12, 13, 14, 15] });
  const lookup = new Map<number, AnyCard>([[11, aura], [12, kit], [13, hiddenAura], [14, faceDownAura]]);
  assert.deepEqual(marksOf(host, (id) => lookup.get(id)).map((m) => m.kind), ['aura', 'equipment', 'attachment', 'attachment', 'attachment']);
  // A concealed card has no status at all.
  assert.equal(cardStatus(hiddenAura), null);
  assert.equal(cardStatus(creature({ faceDown: true, name: '', keywords: ['FLYING'], damage: 1 })), null);
  assert.notEqual(cardStatus(creature()), null, 'a face-up creature has at least its bar');
  assert.equal(cardStatus(creature({ types: 'Instant', zone: 'hand', toughness: null, power: null })), null, 'nothing to show is null');
});

test('status: a strip’s quads — the icons fold to four, one generic icon for every keyword without a glyph', () => {
  const status = cardStatus(creature({ keywords: ['FLYING', 'TEAMWORK', 'ENCHANT', 'LIFELINK'], damage: 1, counters: { '+1/+1': 7 } }))!;
  const quads = stripQuads(status);
  const icons = quads.filter((q) => q.w === STATUS_PX.icon).map((q) => q.cell);
  assert.deepEqual(icons, ['flying', 'lifelink', 'ability'], 'two evergreen glyphs and ONE generic');
  const many = stripQuads(cardStatus(creature({ keywords: ['FLYING', 'HASTE', 'REACH', 'MENACE', 'TRAMPLE'] }))!);
  assert.deepEqual(many.filter((q) => q.w === STATUS_PX.icon).map((q) => q.cell), ['flying', 'haste', 'reach', 'more']);
  // Seven counters: five pips and a `more`.
  assert.equal(quads.filter((q) => q.cell === 'pip').length, 5);
  assert.equal(quads.filter((q) => q.cell === 'more').length, 1);
  // Every quad is above the anchor, by at least the lift.
  const [, minY] = stripBounds(quads);
  assert.ok(minY >= STATUS_PX.lift - 1e-9, `the strip reaches ${String(minY)} px`);
});

// ---------------------------------------------------------------------------
// 3. The corpus, as it is and hostile
// ---------------------------------------------------------------------------

/** Every `state` frame's client state, folded through the real reducer, with a callback per frame. */
function eachState(transform: ((frame: StateFrame) => StateFrame) | null, visit: (state: ClientState, file: string, i: number) => void): void {
  for (const path of FILES) {
    const log = parseFrameLog(readFileSync(path, 'utf8'));
    let state = initialState(log.header);
    for (let i = 0; i < log.frames.length; i++) {
      const frame = log.frames[i]!;
      state = reduce(state, (frame.type === 'state' && transform !== null ? transform(frame as StateFrame) : frame) as Frame);
      if (frame.type === 'state') visit(state, path.slice(path.lastIndexOf('/') + 1), i);
    }
  }
}

/** EVERY card of a frame handed keywords — stubs and face-down cards included. */
function hostile(frame: StateFrame): StateFrame {
  const copy = structuredClone(frame);
  const give = (cards: AnyCard[]): void => {
    for (const c of cards) (c as unknown as { keywords: string[] }).keywords = ['FLYING', 'DEATHTOUCH', 'TEAMWORK'];
  };
  for (const player of copy.body.players) for (const zone of Object.values(player.zones)) give(zone.cards);
  give(copy.body.stackCards);
  return copy;
}

/** The layout's placement for a card id (the battlefield one, as the strip reads it). */
function placementOf(placed: Layout, id: number): Layout['placements'][number] | undefined {
  return placed.placements.find((p) => p.cardId === id && p.kind !== 'stack');
}

test('status: over every frame of the corpus, every strip belongs to a face-up battlefield card — and hostile, no keyword reaches a concealed one', () => {
  const census = { frames: 0, strips: 0, withBar: 0, withPips: 0, withMarks: 0, concealedCreatures: 0 };
  eachState(null, (state) => {
    census.frames += 1;
    const placed = layout(state, raster.PRESENCE);
    const poses = raster.posesOf(state);
    const strips = statusLayout(placed, poses);
    for (const pose of poses.values()) {
      const p = placementOf(placed, pose.cardId);
      if (pose.anonymous || (p !== undefined && (p.back || isHidden(p.card) || isFaceDown(p.card)))) {
        census.concealedCreatures += 1;
        assert.ok(!strips.has(pose.cardId), `a concealed creature #${String(pose.cardId)} carries a strip`);
      }
    }
    for (const strip of strips.values()) {
      const p = placementOf(placed, strip.cardId);
      assert.ok(p !== undefined, 'a strip for a card not on the table');
      assert.equal(p.back, false, 'a strip over a back');
      assert.equal(isHidden(p.card) || isFaceDown(p.card), false, 'a strip over a concealed card');
      assert.equal(p.card.zone, 'battlefield');
      census.strips += 1;
      if (strip.hp !== null) census.withBar += 1;
      if (strip.pips > 0) census.withPips += 1;
      if (strip.marks > 0) census.withMarks += 1;
      assert.deepEqual(strip.keywords, [], 'the committed corpus predates M49 — no strip can carry a keyword');
    }
  });
  console.log(
    `status corpus: ${String(census.frames)} frames, ${String(census.strips)} strips ` +
      `(${String(census.withBar)} with a bar, ${String(census.withPips)} with pips, ${String(census.withMarks)} with marks), ` +
      `${String(census.concealedCreatures)} concealed creature instances with none`,
  );
  assert.ok(census.strips > 1000 && census.withPips > 0 && census.withMarks > 0 && census.concealedCreatures > 100);

  // HOSTILE: every card carries keywords. The gates are what keep them off concealed cards.
  let keyworded = 0;
  let naiveLeaks = 0;
  eachState(hostile, (state) => {
    const placed = layout(state, raster.PRESENCE);
    const poses = raster.posesOf(state);
    const strips: StatusLayout = statusLayout(placed, poses);
    for (const strip of strips.values()) {
      const p = placementOf(placed, strip.cardId)!;
      assert.ok(!isHidden(p.card) && !isFaceDown(p.card) && !p.back, `hostile: keywords over concealed card #${String(strip.cardId)}`);
      if (strip.keywords.length > 0) keyworded += 1;
    }
    // THE NEGATIVE CONTROL: the same poses with the gates taken out — the pose's
    // card read raw, no `strippable`, no `cardStatus` null. It leaks.
    for (const pose of poses.values()) {
      const p = placementOf(placed, pose.cardId);
      if (p === undefined) continue;
      const raw = (p.card as { keywords?: unknown }).keywords;
      const concealed = pose.anonymous || p.back || isHidden(p.card) || isFaceDown(p.card);
      if (concealed && Array.isArray(raw) && raw.length > 0) naiveLeaks += 1;
      assert.equal(strippable(pose, p) && concealed, false);
    }
  });
  console.log(`status hostile: ${String(keyworded)} keyworded strips, all face up; an ungated layout would have drawn ${String(naiveLeaks)} over concealed cards`);
  assert.ok(keyworded > 1000, 'the hostile corpus drew no keyword at all — the sweep proves nothing');
  assert.ok(naiveLeaks > 100, 'the hostile corpus has no concealed creature for the gates to stop — the control proves nothing');
});

// ---------------------------------------------------------------------------
// 4. The pixels
// ---------------------------------------------------------------------------

test('status: an icon is 16 CSS px — over the owner’s 14 at the table view, 1600 × 1000 — from every view, because it is a pixel quad', () => {
  const quads = stripQuads(cardStatus(creature({ keywords: ['FLYING', 'HASTE'], counters: { '+1/+1': 1 }, attachmentIds: [9] }))!);
  for (const q of quads.filter((x) => x.cell !== 'solid' && x.cell !== 'pip' && x.w > STATUS_PX.mark)) {
    assert.ok(q.w >= 14 && q.h >= 14, `${q.cell} is ${String(q.w)} px`);
  }
  assert.equal(STATUS_PX.icon, 16);
  // The shader maps a quad's px through the canvas's CSS size: at 1600 × 1000 a
  // 16 px quad covers 16 × 2 / 1600 of clip space — 16 pixels — whatever the depth.
  const clipW = (STATUS_PX.icon * 2) / 1600;
  assert.equal(Math.round(((clipW / 2) * 1600) * 1e6) / 1e6, 16);
});

/**
 * Which prop kinds a family wears on its head — anchored to the `Head` / `head`
 * joint — and so count as the head for "the strip never covers it".
 */
function headKinds(): Set<string> {
  const out = new Set<string>();
  for (const [kind, entry] of Object.entries(PROP_KIT)) {
    for (const anchors of Object.values(entry.anchors)) {
      if ((anchors ?? []).some((a) => /^head$/i.test(a.joint))) out.add(kind);
    }
  }
  return out;
}

test('status: at the table view the strip’s lowest pixel is above every figure’s head and what it wears — measured through the real figures.glb', async () => {
  const library = await raster.loadLibrary();
  const camera = raster.cameraAt(VIEW_BY_ID.table.pose, 1600, 1000);
  const V = new THREE.Vector3();
  const project = (x: number, y: number, z: number): [number, number] => {
    V.set(x, y, z).project(camera);
    return [((V.x + 1) / 2) * 1600, ((1 - V.y) / 2) * 1000];
  };
  const HEAD_KINDS = headKinds();
  let measured = 0;
  let worst = Infinity;
  let worstAt = '';
  let flat = Infinity;
  const seen = new Set<string>();
  eachState(null, (state, file, i) => {
    if (i % 25 !== 0) return;
    const placed = layout(state, raster.PRESENCE);
    const poses: FigureLayout = raster.posesOf(state);
    const strips = statusLayout(placed, poses);
    for (const [id, strip] of strips) {
      const pose = poses.get(id)!;
      const card = placementOf(placed, id)!.card as Card;
      const key = `${card.name}|${pose.seat}|${pose.stance}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const layers = raster.figureLayers(pose, library);
      const [ax, ay] = project(strip.anchor[0], strip.anchor[1], strip.anchor[2]);
      const [x0, y0, x1] = stripBounds(strip.quads);
      const bottom = ay - y0;
      // The head, and anything worn on it; for a carrier (no head) the whole hull.
      let top = Infinity;
      let topNoLift = Infinity;
      for (const layer of layers) {
        const kind = layer.tag.replace(/@.*$/, '');
        const counts = layer.tag === 'head' || HEAD_KINDS.has(kind) || (pose.silhouette !== null && kind === 'carrier');
        if (!counts) continue;
        for (let t = 0; t < layer.tris.length; t += 3) {
          const [px, py] = project(layer.tris[t]!, layer.tris[t + 1]!, layer.tris[t + 2]!);
          if (px < ax + x0 || px > ax + x1) continue;
          top = Math.min(top, py);
        }
      }
      if (top === Infinity) continue;
      measured += 1;
      const gap = top - bottom;
      if (gap < worst) {
        worst = gap;
        worstAt = `${key} @ ${file}#${String(i)}`;
      }
      // The control: the strip's bottom AT the anchor, with no pixel lift.
      topNoLift = top - ay;
      flat = Math.min(flat, topNoLift);
      assert.ok(gap >= 1, `${key} (${file}#${String(i)}): the strip's lowest pixel is ${gap.toFixed(1)} px below the head's top`);
    }
  });
  console.log(`status head clearance: ${String(measured)} figure poses measured at the table view, the closest strip ${worst.toFixed(1)} px above a head (${worstAt}); with no pixel lift the closest would be ${flat.toFixed(1)} px`);
  assert.ok(measured > 40, `only ${String(measured)} figure poses were measured`);
  assert.ok(flat < 1, 'with no pixel lift no head reached the strip — the measurement has no teeth');
});

// ---------------------------------------------------------------------------
// 5. The field
// ---------------------------------------------------------------------------

test('status: the field is one mesh, and bind carries each strip with its card’s live offset and allocates nothing new', () => {
  const field = new StatusField();
  const quad = stripQuads(cardStatus(creature({ keywords: ['FLYING'] }))!);
  const layoutOf: StatusLayout = new Map([
    [7, { cardId: 7, seat: 'you' as const, anchor: [1, 2, 3] as [number, number, number], bobAmp: 0, bobHz: 0, quads: quad, keywords: ['FLYING'], hp: null, pips: 0, marks: 0 }],
  ]);
  field.commit(layoutOf);
  assert.equal(field.mesh.count, quad.length);
  assert.equal(field.mesh.visible, true);
  const anchors = field.mesh.geometry.getAttribute('aAnchor').array as Float32Array;
  assert.deepEqual([...anchors.slice(0, 3)], [1, 2, 3]);
  const offset = { dx: 0.5, dy: 0.25, dz: -1, scale: 1, opacity: 1, dissolve: 0, glow: 0, dRotY: 0 };
  field.bind({ offsetOf: () => offset as never, clipOf: () => null }, 0);
  for (let i = 0; i < quad.length; i++) {
    assert.deepEqual([...anchors.slice(i * 3, i * 3 + 3)], [1.5, 2.25, 2], `instance ${String(i)} did not ride the offset`);
  }
  // The same layout object commits once; an empty one draws nothing.
  field.commit(new Map());
  assert.equal(field.mesh.count, 0);
  assert.equal(field.mesh.visible, false);
  field.dispose();
});
