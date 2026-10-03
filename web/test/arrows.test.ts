/*
 * mtg-table — web/test/arrows.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The arrows, as geometry and as a read of the frame** (report 10 §9, §15).
 *
 * `buildArrows` is pure — a `state` body plus a rect lookup in, a list of paths
 * out — which is why it lives in `arrows.ts` and not in `ArrowsOverlay.tsx`:
 * this file asserts it from `node --test`, with rects invented here, over every
 * committed recording. `web/test/render.test.tsx` then renders the same specs
 * through the real component.
 *
 * The three things that would actually go wrong, each asserted:
 *
 *   1. **The id spaces collide** (§10.1). `stack[].id` and `Card.id` are
 *      different id spaces — `fixtures/games/g1.jsonl` carries a hidden card #56
 *      and a stack item #56 in the same frame — so every arrow endpoint is
 *      checked to be namespaced, and the corpus is searched for a frame where
 *      the collision is real. An arrow that resolved a stack id against card
 *      rects points at a random permanent, which report 10 §17 names as the
 *      failure to watch for.
 *   2. **A missing endpoint is not an arrow.** The stack panel can be shut and a
 *      target can be in a zone this board does not draw; both must drop the
 *      arrow silently rather than drawing one to the origin.
 *   3. **The corpus really exercises both classes.** A test that never met a
 *      stack target or a combat band would pass while drawing nothing at all,
 *      so the counts are asserted to be non-zero and printed.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import type { GameStateBody } from '../src/protocol.ts';
import { arcBetween, buildArrows, edgePoint, type RectLookup } from '../src/render/arrows.ts';
import { cardKey, playerKey, stackKey, type RectBox, type RectKey } from '../src/render/rects.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const GAMES = fileURLToPath(new URL('../../fixtures/games/', import.meta.url));
const SYNTHETIC = fileURLToPath(new URL('../../fixtures/synthetic/', import.meta.url));

function files(): string[] {
  return [
    ...readdirSync(GAMES)
      .filter((n) => n.endsWith('.jsonl'))
      .sort()
      .map((n) => GAMES + n),
    ...readdirSync(SYNTHETIC)
      .filter((n) => n.endsWith('.jsonl'))
      .sort()
      .map((n) => SYNTHETIC + n),
  ];
}

/** Every `state` body in one recording. */
function boards(path: string): GameStateBody[] {
  const out: GameStateBody[] = [];
  for (const frame of parseFrameLog(readFileSync(path, 'utf8')).frames) {
    if (frame.type === 'state') out.push(frame.body);
  }
  return out;
}

/**
 * A rect for every entity the frame mentions, laid out on an invented grid. This
 * stands in for the DOM: the registry's contract is "a box, or nothing", and
 * nothing else about the browser reaches `buildArrows`.
 */
function lookupFor(board: GameStateBody, omit: ReadonlySet<string> = new Set()): {
  get: RectLookup;
  keys: Set<RectKey>;
} {
  const keys = new Set<RectKey>();
  const boxes = new Map<RectKey, RectBox>();
  let n = 0;
  const put = (key: RectKey): void => {
    if (boxes.has(key) || omit.has(key)) return;
    keys.add(key);
    boxes.set(key, { x: (n % 10) * 100 + 5, y: Math.floor(n / 10) * 140 + 5, width: 95, height: 132 });
    n += 1;
  };
  for (const player of board.players) {
    put(playerKey(player.id));
    for (const zone of [player.zones.battlefield, player.zones.graveyard, player.zones.exile]) {
      for (const card of zone.cards) put(cardKey(card.id));
    }
  }
  for (const item of board.stack) put(stackKey(item.id));
  return { get: (key) => boxes.get(key), keys };
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

test('edgePoint leaves the box on the side that faces the target', () => {
  const box: RectBox = { x: 0, y: 0, width: 100, height: 200 };
  const centre = { x: 50, y: 100 };
  assert.deepEqual(edgePoint(box, centre, { x: 500, y: 100 }), { x: 100, y: 100 });
  assert.deepEqual(edgePoint(box, centre, { x: -500, y: 100 }), { x: 0, y: 100 });
  assert.deepEqual(edgePoint(box, centre, { x: 50, y: -500 }), { x: 50, y: 0 });
  assert.deepEqual(edgePoint(box, centre, { x: 50, y: 900 }), { x: 50, y: 200 });
  // Degenerate: a target exactly at the centre has no direction to leave on.
  assert.deepEqual(edgePoint(box, centre, centre), centre);
});

test('an arc is one quadratic with a head, and the three classes bow differently', () => {
  const a: RectBox = { x: 0, y: 0, width: 100, height: 100 };
  const b: RectBox = { x: 400, y: 0, width: 100, height: 100 };
  const shapes = (['target', 'attack', 'block'] as const).map((cls) => arcBetween(a, b, cls));
  for (const shape of shapes) {
    assert.match(shape.path, /^M[-\d. ]+ ?Q[-\d. ]+$/, `unexpected path: ${shape.path}`);
    assert.equal(shape.head.split(' ').length, 3, 'the head is a triangle');
    for (const value of [...shape.path.matchAll(/-?\d+(\.\d+)?/g)].map((m) => Number(m[0]))) {
      assert.ok(Number.isFinite(value), `non-finite coordinate in ${shape.path}`);
    }
  }
  const ctrlY = (path: string): number => Number(/Q(-?[\d.]+) (-?[\d.]+)/.exec(path)![2]);
  // A block is nearly straight, a target is fully bowed (§9.2's three shapes).
  assert.ok(Math.abs(ctrlY(shapes[0]!.path)) > Math.abs(ctrlY(shapes[1]!.path)));
  assert.ok(Math.abs(ctrlY(shapes[1]!.path)) > Math.abs(ctrlY(shapes[2]!.path)));
});

// ---------------------------------------------------------------------------
// The corpus
// ---------------------------------------------------------------------------

test('every committed frame builds arrows without throwing, and only to real rects', () => {
  let targets = 0;
  let attacks = 0;
  let blocks = 0;
  let frames = 0;
  let collisions = 0;

  for (const path of files()) {
    for (const board of boards(path)) {
      frames += 1;
      const { get, keys } = lookupFor(board);
      const arrows = buildArrows(board, get);
      for (const arrow of arrows) {
        assert.match(arrow.from, /^[cps]:\d+$/, 'an un-namespaced endpoint');
        assert.match(arrow.to, /^[cps]:\d+$/, 'an un-namespaced endpoint');
        assert.ok(keys.has(arrow.from), `${arrow.from} was never registered`);
        assert.ok(keys.has(arrow.to), `${arrow.to} was never registered`);
        assert.ok(arrow.path.startsWith('M'), 'no path');
        assert.ok(!arrow.path.includes('NaN'), `NaN in ${arrow.path}`);
        if (arrow.cls === 'target') targets += 1;
        if (arrow.cls === 'attack') attacks += 1;
        if (arrow.cls === 'block') blocks += 1;
      }
      // §10.1 — the collision, counted where it is real: an id that is both a
      // stack item and a card in the same frame.
      const cardIds = new Set<number>();
      for (const player of board.players) {
        for (const card of player.zones.battlefield.cards) cardIds.add(card.id);
      }
      for (const item of board.stack) if (cardIds.has(item.id)) collisions += 1;
    }
  }

  assert.ok(frames > 500, `only ${String(frames)} state frames`);
  assert.ok(targets > 0, 'no fixture frame has a stack item with a target');
  assert.ok(attacks > 0, 'no fixture frame has a combat band with a defender');
  assert.ok(blocks > 0, 'no fixture frame has a blocked band');
  assert.ok(
    collisions > 0,
    'no frame in the corpus has a stack id that is also a card id, so the ' +
      'namespacing this test checks is unexercised (report 10 §10.1)',
  );
  console.log(
    `arrows: ${String(targets)} target, ${String(attacks)} attack, ${String(blocks)} block ` +
      `over ${String(frames)} state frames; ${String(collisions)} real id collisions`,
  );
});

test('a stack item whose panel is shut falls back to its source card', () => {
  // The `S` toggle unmounts the rows, so `s:<id>` stops resolving. The arrow
  // must move to the source card's own tile rather than disappearing — an
  // activated ability's source is usually a permanent on the battlefield.
  let checked = 0;
  for (const path of files()) {
    for (const board of boards(path)) {
      const withTargets = board.stack.filter((item) => item.targetCardIds.length > 0);
      if (withTargets.length === 0) continue;
      const open = lookupFor(board);
      const shut = lookupFor(board, new Set(board.stack.map((item) => stackKey(item.id))));
      const fromOpen = buildArrows(board, open.get).filter((a) => a.cls === 'target');
      const fromShut = buildArrows(board, shut.get).filter((a) => a.cls === 'target');
      if (fromOpen.length === 0) continue;
      assert.ok(fromOpen.every((a) => a.from.startsWith('s:')));
      // Every arrow the shut panel still draws comes off a card, not a stack row.
      assert.ok(fromShut.every((a) => a.from.startsWith('c:')));
      checked += 1;
    }
  }
  assert.ok(checked > 0, 'no frame with a resolvable stack target');
});

test('a missing endpoint drops the arrow instead of drawing one to the origin', () => {
  for (const path of files()) {
    for (const board of boards(path)) {
      if ((board.combat?.bands.length ?? 0) === 0) continue;
      const full = buildArrows(board, lookupFor(board).get);
      if (full.length === 0) continue;
      // Nothing registered at all: the empty-registry branch, which is exactly
      // what a server render produces.
      assert.deepEqual(buildArrows(board, () => undefined), []);
      // One endpoint gone: that arrow goes, the others stay.
      const victim = full[0]!;
      const without = buildArrows(board, lookupFor(board, new Set([victim.to])).get);
      assert.ok(!without.some((a) => a.to === victim.to));
      return;
    }
  }
  assert.fail('no frame with combat arrows in the corpus');
});
