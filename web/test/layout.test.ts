/*
 * mtg-table — web/test/layout.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The resting pose is a pure function** (report 09 §10.4).
 *
 * `layout(state)` is the arena's authority on where every object is, and §5.1's
 * whole animation model rests on it: cues contribute *transient offsets* that
 * decay to identity, so "skip", "scrub" and "resync" are all the same thing —
 * drop the offsets and the scene is exactly `layout(state)`. That only holds if
 * `layout` really is a function of the state and of nothing else, so the first
 * assertion here is that running it twice gives byte-identical output.
 *
 * Everything runs under `node --test` with type stripping and no browser, which
 * is the payoff for keeping `layout.ts` free of three (§2.4): the geometry of
 * **3,677 `state` frames across eighteen committed recordings** is checked with
 * no WebGL context anywhere.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CARD_W,
  MAX_PER_RANK,
  TABLE_HALF_X,
  TABLE_HALF_Z,
  TAP_ANGLE,
  anchorsFor,
  fanSlot,
  layout,
  seatSpin,
  viewerIdOf,
  type Placement,
} from '../src/arena/layout.ts';
import { isHidden, type AnyCard, type Frame } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));

// ---------------------------------------------------------------------------
// Hand-built frames — the cases the corpus does not happen to contain
// ---------------------------------------------------------------------------

const EMPTY = { count: 0, cards: [] as AnyCard[] };

function card(id: number, extra: Record<string, unknown> = {}): AnyCard {
  return {
    id,
    name: `Card ${String(id)}`,
    setCode: 'MSH',
    manaCost: '{1}{W}',
    types: 'Creature - Human Spy Hero',
    power: '2',
    toughness: '2',
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
  } as AnyCard;
}

function player(id: number, zones: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    name: `p${String(id)}`,
    isAi: id !== 0,
    life: 20,
    poison: 0,
    counters: {},
    manaPool: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
    zones: {
      hand: EMPTY,
      battlefield: EMPTY,
      graveyard: EMPTY,
      exile: EMPTY,
      command: EMPTY,
      library: { count: 30, cards: [] },
      ...zones,
    },
  };
}

/** One `state` frame's worth of board, folded through the real reducer. */
function stateWith(players: Array<Record<string, unknown>>, extra: Record<string, unknown> = {}): ClientState {
  const helloFrame = {
    v: 1,
    seq: 1,
    t: 1,
    type: 'hello_ok',
    body: { gameId: 'g', you: 0, players: [], protocol: 1 },
  } as unknown as Frame;
  const stateFrame = {
    v: 1,
    seq: 2,
    t: 2,
    type: 'state',
    body: {
      gameId: 'g',
      turn: 1,
      round: 1,
      phase: 'MAIN1',
      activePlayer: 0,
      priority: 0,
      gameOver: null,
      players,
      stack: [],
      stackCards: [],
      combat: null,
      events: [],
      ...extra,
    },
  } as unknown as Frame;
  return reduce(reduce(initialState(), helloFrame), stateFrame);
}

// ---------------------------------------------------------------------------

test('layout: the same state gives byte-identical placements, twice', () => {
  const state = stateWith([
    player(0, { battlefield: { count: 3, cards: [card(1), card(2), card(3, { types: 'Land' })] } }),
    player(1, { hand: { count: 2, cards: [card(9), card(10)] } }),
  ]);
  const a = layout(state);
  const b = layout(state);
  assert.deepEqual(
    a.placements.map(strip),
    b.placements.map(strip),
    'layout(state) is a function of state and of nothing else',
  );
});

test('layout: a null board lays out nothing and does not throw', () => {
  const empty = layout(initialState());
  assert.equal(empty.placements.length, 0);
  assert.equal(empty.byKey.size, 0);
});

test('layout: the viewer sits at +Z and the other seat at −Z', () => {
  const state = stateWith([
    player(0, { battlefield: { count: 1, cards: [card(1)] } }),
    player(1, { battlefield: { count: 1, cards: [card(2)] } }),
  ]);
  const placed = layout(state);
  assert.equal(viewerIdOf(state), 0);
  const mine = placed.byKey.get('c:1');
  const theirs = placed.byKey.get('c:2');
  assert.ok(mine && theirs);
  assert.equal(mine.seat, 'you');
  assert.equal(theirs.seat, 'opp');
  assert.ok(mine.position[2] > 0, `own creature at z=${String(mine.position[2])}`);
  assert.ok(theirs.position[2] < 0, `their creature at z=${String(theirs.position[2])}`);
});

/**
 * **The plane's normal, which is the difference between a rotation and a
 * reflection** (verification fix).
 *
 * A card is a quad whose local normal is `+Z`; after the Euler `[pitch, 0, spin]`
 * its world normal is `(0, −sin(pitch), cos(pitch))`, so `−sin(rotation[0])` is
 * its `y` component. **Flat on the table is `pitch = −π/2` → `+1`.** A *mirrored*
 * anchor — the old `pitch: -a.pitch` — gives `+π/2` → `−1`: the same quad with
 * its face pointing down through the table, drawn on screen as a reflection with
 * the top edge below the bottom one and the left edge still on the left.
 */
function normalY(p: Placement): number {
  return -Math.sin(p.rotation[0]);
}

/**
 * **Nothing on the table is a mirror image** (verification fix).
 *
 * Before it, 12 of the 30 placements at g1.jsonl frame 250 pointed down — every
 * opponent creature and every opponent land, plus their graveyard, exile,
 * command and combat piles. The opponent sits across the table, so their cards
 * are the same cards **rotated π in the table plane**, which is
 * {@link seatSpin}; a negated pitch is a different operation with a different
 * result, and it was the one that shipped.
 */
test('layout: the opponent’s side is rotated 180°, not mirrored', () => {
  const state = stateWith([
    player(0, { battlefield: { count: 1, cards: [card(1)] } }),
    player(1, { battlefield: { count: 1, cards: [card(2)] } }),
  ]);
  const placed = layout(state);
  const mine = placed.byKey.get('c:1');
  const theirs = placed.byKey.get('c:2');
  assert.ok(mine && theirs);

  // Same pitch, so both faces point at the ceiling…
  assert.equal(theirs.rotation[0], mine.rotation[0], 'the two seats must share a pitch');
  assert.ok(normalY(mine) > 0.99 && normalY(theirs) > 0.99, 'both faces point up');
  // …and the whole difference is a half-turn in the plane.
  assert.equal(theirs.rotation[2] - mine.rotation[2], Math.PI);
  assert.equal(seatSpin('you'), 0);
  assert.equal(seatSpin('opp'), Math.PI);
});

/** …and a tap is still the same quarter-turn on that seat, in the same direction. */
test('layout: a tap turns the opponent’s card the same way it turns yours', () => {
  const state = (tapped: boolean): ClientState =>
    stateWith([
      player(0, { battlefield: { count: 1, cards: [card(1, { tapped })] } }),
      player(1, { battlefield: { count: 1, cards: [card(2, { tapped, controller: 1, owner: 1 })] } }),
    ]);
  const before = layout(state(false));
  const after = layout(state(true));
  for (const key of ['c:1', 'c:2']) {
    const a = before.byKey.get(key);
    const b = after.byKey.get(key);
    assert.ok(a && b);
    assert.equal(b.rotation[2] - a.rotation[2], TAP_ANGLE, `${key} taps the wrong way`);
    assert.ok(normalY(b) > 0.99, `${key} is face-down after a tap`);
  }
});

test('layout: a tapped card keeps its slot and only rotates', () => {
  const untapped = stateWith([player(0, { battlefield: { count: 2, cards: [card(1), card(2)] } })]);
  const tapped = stateWith([
    player(0, { battlefield: { count: 2, cards: [card(1), card(2, { tapped: true })] } }),
  ]);
  const before = layout(untapped).byKey.get('c:2');
  const after = layout(tapped).byKey.get('c:2');
  assert.ok(before && after);
  assert.deepEqual(after.position, before.position, 'a tap must not move the card');
  assert.equal(after.rotation[2] - before.rotation[2], TAP_ANGLE);
  assert.equal(after.tapped, true);
  // …and it must not move its neighbour either.
  assert.deepEqual(layout(tapped).byKey.get('c:1')?.position, layout(untapped).byKey.get('c:1')?.position);
});

test('layout: lands and creatures are separate ranks', () => {
  const state = stateWith([
    player(0, {
      battlefield: {
        count: 2,
        cards: [card(1), card(2, { types: 'Basic Land - Plains', manaCost: null })],
      },
    }),
  ]);
  const placed = layout(state);
  const creature = placed.byKey.get('c:1');
  const land = placed.byKey.get('c:2');
  assert.ok(creature && land);
  assert.equal(creature.kind, 'creature');
  assert.equal(land.kind, 'land');
  assert.notEqual(creature.position[2], land.position[2]);
});

test('layout: a rank wraps above MAX_PER_RANK and stays on the table', () => {
  const many = Array.from({ length: 14 }, (_, i) => card(i + 1));
  const placed = layout(stateWith([player(0, { battlefield: { count: many.length, cards: many } })]));
  const rows = new Set(placed.placements.filter((p) => p.kind === 'creature').map((p) => p.position[2]));
  assert.equal(rows.size, 2, `14 creatures should wrap to 2 rows, saw ${String(rows.size)}`);
  for (const placement of placed.placements) {
    assert.ok(Math.abs(placement.position[0]) <= TABLE_HALF_X, `x off the table: ${placement.key}`);
    assert.ok(Math.abs(placement.position[2]) <= TABLE_HALF_Z, `z off the table: ${placement.key}`);
  }
  assert.ok(MAX_PER_RANK === 9);
});

test('layout: an attachment does not take a rank slot and sits on its host', () => {
  const host = card(1);
  const gear = card(2, { types: 'Artifact - Equipment', attachedToId: 1 });
  const withGear = layout(
    stateWith([player(0, { battlefield: { count: 2, cards: [host, gear] } })]),
  );
  const without = layout(stateWith([player(0, { battlefield: { count: 1, cards: [host] } })]));
  const hostWith = withGear.byKey.get('c:1');
  const hostWithout = without.byKey.get('c:1');
  const attached = withGear.byKey.get('c:2');
  assert.ok(hostWith && hostWithout && attached);
  assert.deepEqual(hostWith.position, hostWithout.position, 'equipping must not reflow the rank');
  assert.equal(attached.kind, 'attachment');
  assert.ok(Math.abs(attached.position[0] - hostWith.position[0]) < 0.5);
  assert.ok(Math.abs(attached.position[2] - hostWith.position[2]) < 0.5);
  assert.ok(attached.renderOrder < hostWith.renderOrder, 'the attachment draws behind its host');
});

/**
 * **The asymmetric case, in both directions** (verification fix).
 *
 * An Aura or Equipment can be controlled by one seat and attached to a creature
 * the *other* seat controls — Quantum Reduction is in the deck in play, and the
 * 2D board resolves the host "across both seats" in as many words. `layout()`
 * used to resolve the host against the placements made so far and walk
 * `board.players` in order, so seat 1's attachment on a seat 0 host worked and
 * seat 0's attachment on a seat 1 host silently fell back to its own creature
 * rank — measured at 16.7% of the committed corpus. The test runs the pair.
 */
test('layout: an attachment sits on its host even when the host is the OTHER seat’s', () => {
  for (const [owner, other] of [
    [0, 1],
    [1, 0],
  ] as Array<[number, number]>) {
    const host = card(44, { controller: other, owner: other });
    const aura = card(5, {
      types: 'Enchantment - Aura',
      attachedToId: 44,
      controller: owner,
      owner,
    });
    const placed = layout(
      stateWith([
        player(0, {
          battlefield: {
            count: 1,
            cards: owner === 0 ? [aura] : [host],
          },
        }),
        player(1, {
          battlefield: {
            count: 1,
            cards: owner === 0 ? [host] : [aura],
          },
        }),
      ]),
    );
    const hostAt = placed.byKey.get('c:44');
    const auraAt = placed.byKey.get('c:5');
    assert.ok(hostAt && auraAt, `seat ${String(owner)}: both cards are on the table`);
    assert.equal(auraAt.kind, 'attachment');
    const d = Math.hypot(
      auraAt.position[0] - hostAt.position[0],
      auraAt.position[1] - hostAt.position[1],
      auraAt.position[2] - hostAt.position[2],
    );
    assert.ok(
      d < CARD_W,
      `seat ${String(owner)} controls the aura on seat ${String(other)}'s creature and it is ` +
        `drawn ${d.toFixed(2)} units away — it must be ON the host, on the host's own row`,
    );
    // Whose card it is does not change: `playerId`/`seat` stay the controller's,
    // which is what every other consumer of a `Placement` means by them.
    assert.equal(auraAt.playerId, owner);
    assert.equal(auraAt.seat, owner === 0 ? 'you' : 'opp');
  }
});

test('layout: a hidden card is placed, and is routed to the card back', () => {
  const stub = { id: 7, zone: 'hand', controller: 1, owner: 1, hidden: true } as unknown as AnyCard;
  const placed = layout(stateWith([player(0), player(1, { hand: { count: 1, cards: [stub] } })]));
  const back = placed.byKey.get('c:7');
  assert.ok(back, 'a redacted card still gets a placement — it is on the table');
  assert.equal(back.back, true, 'and it is drawn as the card back, never as a text frame');
  // The placement carries the five-key stub and nothing more: there is no name
  // in it for a renderer to reach.
  assert.equal((back.card as { name?: string }).name, undefined);
});

test('layout: a face-down card is a back too, however it is spelled', () => {
  const faceDown = card(3, { faceDown: true, name: '', types: 'Creature' });
  const superseded = { id: 4, zone: 'battlefield', controller: 0, faceDownHidden: true } as unknown as AnyCard;
  const placed = layout(
    stateWith([player(0, { battlefield: { count: 2, cards: [faceDown, superseded] } })]),
  );
  assert.equal(placed.byKey.get('c:3')?.back, true);
  assert.equal(placed.byKey.get('c:4')?.back, true);
});

test('layout: the hand fan stays inside its anchor for n = 0…12', () => {
  const anchors = anchorsFor('you');
  for (let n = 0; n <= 12; n++) {
    const cards = Array.from({ length: n }, (_, i) => card(100 + i, { zone: 'hand' }));
    const placed = layout(stateWith([player(0, { hand: { count: n, cards } })]));
    const hand = placed.placements.filter((p) => p.kind === 'hand');
    assert.equal(hand.length, n);
    for (const slot of hand) {
      assert.ok(Math.abs(slot.position[0]) <= TABLE_HALF_X, `hand x off table at n=${String(n)}`);
      assert.ok(slot.position[2] >= anchors.hand.z - 0.01, `hand z in front of its anchor at n=${String(n)}`);
      assert.ok(slot.position[2] <= TABLE_HALF_Z, `hand z off the table at n=${String(n)}`);
      assert.ok(slot.position[1] > 0, 'a hand card is above the table');
      // Never tap-rotated, whatever the snapshot says.
      assert.ok(Math.abs(slot.rotation[2]) < 1, 'a hand card is not spun 90°');
    }
    if (n === 1) {
      assert.equal(hand[0]?.position[0], 0, 'a single card sits at the anchor');
    }
  }
  // **Both hands tilt up out of the table, toward the camera.** Pitch is an
  // absolute rotation about X where flat is -π/2, so §3.3's literal "+1.15" for
  // the opponent is a card rotated 156° — face down through the table, a sliver
  // from any camera above. Caught in the browser at frame 120 of g1.jsonl; this
  // is the net under it.
  const opp = anchorsFor('opp');
  // Rotating about X by θ takes the card's normal to (0, -sin θ, cos θ), so flat
  // is θ = -π/2 and θ > -π/2 tilts the face toward +Z — the camera's side.
  assert.ok(anchors.hand.pitch > -Math.PI / 2, 'the viewer hand tilts up toward the camera');
  assert.ok(opp.hand.pitch > -Math.PI / 2, 'and so does the opponent hand: backs toward the camera');
  assert.ok(Math.abs(opp.hand.pitch - anchors.hand.pitch) < 1e-9);
  assert.ok(opp.hand.z < 0 && anchors.hand.z > 0, 'the two hands are on opposite sides');

  // The fan is symmetric about the anchor.
  const anchor = anchors.hand;
  const left = fanSlot(5, 0, anchor, 6.2);
  const right = fanSlot(5, 4, anchor, 6.2);
  assert.ok(Math.abs(left.x + right.x) < 1e-9);
  assert.ok(Math.abs(left.z - right.z) < 1e-9);
});

test('layout: the stack column climbs, bottom first, and the top item is biggest', () => {
  const spell = card(20, { zone: 'stack' });
  const other = card(21, { zone: 'stack' });
  const placed = layout(
    stateWith([player(0)], {
      stack: [
        { id: 1, sourceCardId: 20, controller: 0, text: 'a', targetCardIds: [], targetPlayerIds: [] },
        { id: 2, sourceCardId: 21, controller: 0, text: 'b', targetCardIds: [], targetPlayerIds: [] },
      ],
      stackCards: [spell, other],
    }),
  );
  const bottom = placed.byKey.get('s:1');
  const top = placed.byKey.get('s:2');
  assert.ok(bottom && top);
  assert.ok(top.position[1] > bottom.position[1], 'the last element resolves next and sits highest');
  assert.ok(top.scale > bottom.scale);
  assert.equal(bottom.kind, 'stack');
});

test('layout: a stack item and a battlefield card with the same id do not collide', () => {
  // An activated ability's source is on the battlefield AND on the stack, and
  // §10.1 of the protocol says the two id spaces collide outright. The keys are
  // namespaced for exactly this.
  const source = card(56);
  const placed = layout(
    stateWith([player(0, { battlefield: { count: 1, cards: [source] } })], {
      stack: [
        { id: 56, sourceCardId: 56, controller: 0, text: '', targetCardIds: [], targetPlayerIds: [] },
      ],
      stackCards: [card(56, { zone: 'stack' })],
    }),
  );
  assert.ok(placed.byKey.get('c:56'), 'the permanent is still on the battlefield');
  assert.ok(placed.byKey.get('s:56'), 'and its ability is on the stack');
  assert.equal(placed.placements.length, 2);
});

// ---------------------------------------------------------------------------
// The corpus sweep
// ---------------------------------------------------------------------------

function fixtureStates(): Array<{ file: string; state: ClientState }> {
  const out: Array<{ file: string; state: ClientState }> = [];
  for (const dir of ['games/', 'synthetic/']) {
    for (const name of readdirSync(FIXTURES + dir).sort()) {
      if (!name.endsWith('.jsonl')) continue;
      const log = parseFrameLog(readFileSync(FIXTURES + dir + name, 'utf8'));
      let state = initialState(log.header);
      for (const frame of log.frames) {
        state = reduce(state, frame);
        if (frame.type === 'state') out.push({ file: dir + name, state });
      }
    }
  }
  return out;
}

test('layout: every `state` frame of every committed recording lays out', () => {
  const frames = fixtureStates();
  assert.ok(frames.length > 1000, `expected the whole corpus, saw ${String(frames.length)} frames`);

  let placements = 0;
  let backs = 0;
  const kinds = new Map<string, number>();

  for (const { file, state } of frames) {
    const placed = layout(state);
    placements += placed.placements.length;

    const keys = new Set<string>();
    for (const p of placed.placements) {
      assert.ok(!keys.has(p.key), `${file}: two placements share the key ${p.key}`);
      keys.add(p.key);
      kinds.set(p.kind, (kinds.get(p.kind) ?? 0) + 1);
      if (p.back) backs += 1;

      for (const n of [...p.position, ...p.rotation, p.scale]) {
        assert.ok(Number.isFinite(n), `${file}: ${p.key} has a non-finite transform`);
      }
      assert.ok(Math.abs(p.position[0]) <= TABLE_HALF_X + 0.5, `${file}: ${p.key} x off the table`);
      assert.ok(Math.abs(p.position[2]) <= TABLE_HALF_Z + 0.5, `${file}: ${p.key} z off the table`);
      assert.ok(p.position[1] >= 0, `${file}: ${p.key} is under the table`);

      // **Every placement's plane normal points up** — no card anywhere on the
      // table is a mirror image (see {@link normalY}). This went red on 12 of
      // the 30 placements of g1.jsonl frame 250 while `anchorsFor('opp')`
      // negated the pitch, and on nothing at all once the opponent's half-turn
      // became an in-plane `seatSpin`.
      assert.ok(
        normalY(p) >= 0,
        `${file}: ${p.key} (${p.kind}, seat ${p.seat}) has its face pointing DOWN — ` +
          `pitch ${p.rotation[0].toFixed(3)} gives normal.y ${normalY(p).toFixed(3)}. ` +
          'That is a reflection, not a rotation: the card reads backwards on screen.',
      );

      // Hard rule 8, in the renderer: a concealed card is drawn as a back, and
      // `layout` is where that is decided for every surface at once.
      if (isHidden(p.card)) {
        assert.equal(p.back, true, `${file}: ${p.key} is hidden but not drawn as a back`);
      }
    }

    // Every card in every zone the arena draws is placed exactly once.
    const board = state.board;
    if (board === null) continue;
    for (const seat of board.players) {
      for (const zone of [
        seat.zones.hand,
        seat.zones.battlefield,
        seat.zones.graveyard,
        seat.zones.exile,
        seat.zones.command,
      ]) {
        for (const c of zone.cards) {
          assert.ok(placed.byKey.has(`c:${String(c.id)}`), `${file}: card ${String(c.id)} not placed`);
        }
      }
    }
  }

  // Two ranks never overlap in x on the same row (§10.4).
  for (const { file, state } of frames.slice(0, 400)) {
    const placed = layout(state);
    const rows = new Map<string, Placement[]>();
    for (const p of placed.placements) {
      if (p.kind !== 'creature' && p.kind !== 'land') continue;
      const row = `${p.seat}|${p.kind}|${p.position[2].toFixed(3)}`;
      rows.set(row, [...(rows.get(row) ?? []), p]);
    }
    for (const [row, group] of rows) {
      const xs = group.map((p) => p.position[0]).sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) {
        assert.ok(
          xs[i]! - xs[i - 1]! >= 0.5 * CARD_W,
          `${file}: ${row} has two cards ${String(xs[i]! - xs[i - 1]!)} apart`,
        );
      }
    }
  }

  console.log(
    `layout: ${String(frames.length)} state frames, ${String(placements)} placements, ` +
      `${String(backs)} drawn as card backs`,
  );
  for (const [kind, n] of [...kinds].sort(([, a], [, b]) => b - a)) {
    console.log(`  ${kind.padEnd(11)} ${String(n)}`);
  }
});

/**
 * **The corpus half of the cross-seat attachment fix.**
 *
 * Before it, 2,651 of the 15,830 state frames here (16.7%) drew an attachment
 * more than a card width from the host it was attached to — g1.jsonl frame 250
 * put Quantum Reduction on my own Wasp while its host, Peggy Carter, sat 4.3
 * units away on the other side of the table. The host is resolved from
 * `state.board` across **both** seats, which is the thing `layout()` itself has
 * to do and the thing it used not to.
 */
test('layout: no attachment in the corpus is drawn away from its host', () => {
  const frames = fixtureStates();
  let checked = 0;
  let crossSeat = 0;
  const worst = { file: '', key: '', d: 0 };

  for (const { file, state } of frames) {
    const board = state.board;
    if (board === null) continue;
    const placed = layout(state);

    // The host lookup a renderer must do: every battlefield of every seat.
    const hosts = new Map<number, { controller: number | null }>();
    for (const seat of board.players) {
      for (const c of seat.zones.battlefield.cards) {
        hosts.set(c.id, { controller: seat.id });
      }
    }

    for (const p of placed.placements) {
      if (p.kind !== 'attachment') continue;
      const hostId = (p.card as { attachedToId?: number | null }).attachedToId ?? null;
      if (hostId === null) continue;
      const hostSeat = hosts.get(hostId);
      const hostAt = placed.byKey.get(`c:${String(hostId)}`);
      if (hostSeat === undefined || hostAt === undefined) continue; // attached to a player, or unseen
      checked += 1;
      if (hostSeat.controller !== p.playerId) crossSeat += 1;
      const d = Math.hypot(
        p.position[0] - hostAt.position[0],
        p.position[1] - hostAt.position[1],
        p.position[2] - hostAt.position[2],
      );
      if (d > worst.d) {
        worst.file = file;
        worst.key = p.key;
        worst.d = d;
      }
      assert.ok(
        d <= CARD_W,
        `${file}: ${p.key} is drawn ${d.toFixed(2)} units from its host c:${String(hostId)} ` +
          `(controller ${String(p.playerId)}, host's controller ${String(hostSeat.controller)})`,
      );
    }
  }

  assert.ok(checked > 0, 'the corpus contains no attachment at all — this test proves nothing');
  assert.ok(
    crossSeat > 0,
    'the corpus contains no CROSS-SEAT attachment — the case this test exists for is unexercised',
  );
  console.log(
    `layout: ${String(checked)} attachment placements checked (${String(crossSeat)} cross-seat), ` +
      `worst host distance ${worst.d.toFixed(3)} on ${worst.key} in ${worst.file}`,
  );
});

/** Placements carry the frame's own card objects; compare the geometry. */
function strip(p: Placement): Record<string, unknown> {
  return {
    key: p.key,
    kind: p.kind,
    seat: p.seat,
    position: p.position,
    rotation: p.rotation,
    scale: p.scale,
    renderOrder: p.renderOrder,
    back: p.back,
    tapped: p.tapped,
  };
}
