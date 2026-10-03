/*
 * mtg-table — web/test/anchors.test.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The anchor resolver allocates nothing, and moved no coordinate** (D275,
 * GPU-pass follow-up 12; `docs/evidence/anchor-scratch.md`).
 *
 * `layout.ts`'s `anchorPosition` built a `seatOfPlayer` closure and a fresh tuple
 * on every call, `placementOf` a `c:<id>` key string, `playerAnchorFor('opp')` an
 * object and `anchorsFor('opp')` nine — and `SceneStage.positionOf` hands it every
 * non-figure effect's anchor on every frame. It now writes into a tuple it is
 * handed (`anchorPositionInto`), the stage hands it one scratch, and the opponent's
 * anchors are built once. Three things are held here, in node with no GPU:
 *
 *  1. **Every answer is the one it was.** The resolver as it stood at `0a93c9d` is
 *     kept below as a test-local reference, verbatim (it is not in the app), and
 *     every anchor kind of every board frame of the 23 committed recordings — each
 *     card on the board, two ids that are not, every player, a stranger and none,
 *     every zone name and an unknown one, both `ground`s, heights and offsets — is
 *     resolved by it and by the new code three ways (`anchorPosition`,
 *     `anchorPositionInto`, `SceneStage.positionOf`), from four chairs (the
 *     stream's own seat, the other one, a stranger's and none), compared with
 *     `Object.is` per number, so a `-0` for a `0` is a difference. `placementOf`, `anchorDelta` and
 *     `figureYawTo`, which reach the same helpers, are compared too.
 *  2. **The scratch is shared, and every caller reads an answer before the next
 *     resolve.** `positionOf` answers the same tuple every call; the effect pool
 *     bound through it draws, slot for slot, what it draws through fresh tuples
 *     (random effects of every kind over corpus boards, beams, motes, clouds and
 *     speed lines resolving two or three anchors each); and the camera director,
 *     which KEEPS the points it frames, copies them — its shot through the scratch
 *     is the shot through fresh tuples, and the shot a director that kept the
 *     scratch would have taken is the control. The casting field's tethers, the
 *     third caller, are held the same way (D275's fix pass): drawn through the
 *     scratch, instance for instance, what they draw through fresh tuples, with a
 *     resolver that reads after its next resolve as the control.
 *
 * `liveness.test.ts` holds the source half: the resolver and every helper it
 * reaches are in the GPU pass's allocation scan, with spliced controls.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import * as THREE from 'three';

import { CAMERA, CameraDirector, REST_POSE, orbitFromPose, solveFraming, type DirectorWorld } from '../src/arena/camera.ts';
import type { AnchorRef, CameraRequest, Effect, EffectKind, EffectShape } from '../src/arena/cues/stage.ts';
import {
  CARD_W,
  STACK_ANCHOR,
  TABLE_ANCHOR,
  anchorDelta,
  anchorPosition,
  anchorPositionInto,
  anchorsFor,
  figureYawTo,
  layout,
  placementOf,
  playerAnchorFor,
  seatFacingY,
  standPointOf,
  yawToward,
  type Anchor,
  type Layout,
  type Placement,
  type Seat,
  type SeatAnchors,
} from '../src/arena/layout.ts';
import { FORM_KINDS, spellForms, type SpellForm, type TetherRef } from '../src/arena/figures/casting.ts';
import { CastingField } from '../src/arena/scene/casting.ts';
import { EffectPool } from '../src/arena/scene/effects.ts';
import { SceneStage } from '../src/arena/scene/SceneStage.ts';
import type { Frame } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));

type Tuple = [number, number, number];

// ---------------------------------------------------------------------------
// The reference: the resolver as it stood at 0a93c9d, verbatim but for names.
// The constants it read are the app's (the `you` branches return the very
// objects they did); `FAN_PITCH_OPP` is not exported and reaches no answer — a
// resolver answers x, y and z — so it is the value it had.
// ---------------------------------------------------------------------------

const YOU_ANCHORS: SeatAnchors = anchorsFor('you');
const YOU_PLAYER_ANCHOR: Anchor = playerAnchorFor('you');
const FAN_PITCH_OPP = -1.15;

function refSeatOf(playerId: number | null, viewerId: number | null): Seat {
  if (playerId === null || viewerId === null) return 'you';
  return playerId === viewerId ? 'you' : 'opp';
}

function refPlayerAnchorFor(seat: Seat): Anchor {
  return seat === 'you'
    ? YOU_PLAYER_ANCHOR
    : { x: YOU_PLAYER_ANCHOR.x, y: YOU_PLAYER_ANCHOR.y, z: -YOU_PLAYER_ANCHOR.z, pitch: -0.9 };
}

function refAnchorsFor(seat: Seat): SeatAnchors {
  if (seat === 'you') return YOU_ANCHORS;
  const mirror = (a: Anchor): Anchor => ({ x: a.x, y: a.y, z: -a.z, pitch: a.pitch });
  return {
    hand: { ...mirror(YOU_ANCHORS.hand), pitch: FAN_PITCH_OPP },
    creatures: mirror(YOU_ANCHORS.creatures),
    lands: mirror(YOU_ANCHORS.lands),
    combat: mirror(YOU_ANCHORS.combat),
    graveyard: mirror(YOU_ANCHORS.graveyard),
    exile: mirror(YOU_ANCHORS.exile),
    command: mirror(YOU_ANCHORS.command),
    library: mirror(YOU_ANCHORS.library),
    casting: mirror(YOU_ANCHORS.casting),
  };
}

function refZoneAnchor(anchors: SeatAnchors, zone: string): Anchor | null {
  switch (zone) {
    case 'hand':
      return anchors.hand;
    case 'battlefield':
      return anchors.creatures;
    case 'graveyard':
      return anchors.graveyard;
    case 'exile':
      return anchors.exile;
    case 'command':
      return anchors.command;
    case 'library':
      return anchors.library;
    case 'combat':
      return anchors.combat;
    case 'stack':
      return STACK_ANCHOR;
    default:
      return null;
  }
}

function refPlacementOf(placed: Layout, cardId: number): Placement | null {
  const direct = placed.byKey.get(`c:${String(cardId)}`);
  if (direct !== undefined) return direct;
  for (const placement of placed.placements) {
    if (placement.cardId === cardId) return placement;
  }
  return null;
}

function refRestPositionOf(placed: Layout, cardId: number): Tuple | null {
  return refPlacementOf(placed, cardId)?.position ?? null;
}

function refAnchorPosition(placed: Layout, ref: AnchorRef): Tuple | null {
  const seatOfPlayer = (playerId: number | null): Seat => {
    if (playerId === null) return 'you';
    return refSeatOf(playerId, placed.viewerId);
  };

  switch (ref.kind) {
    case 'card':
      return refRestPositionOf(placed, ref.id);
    case 'player': {
      const a = refPlayerAnchorFor(seatOfPlayer(ref.id));
      return [a.x, a.y, a.z];
    }
    case 'zone': {
      const anchors = refAnchorsFor(seatOfPlayer(ref.player));
      const anchor = refZoneAnchor(anchors, ref.zone);
      return anchor === null ? null : [anchor.x, anchor.y, anchor.z];
    }
    case 'combat': {
      const anchors = refAnchorsFor(seatOfPlayer(ref.player));
      return [anchors.combat.x, anchors.combat.y, anchors.combat.z];
    }
    case 'casting': {
      const anchors = refAnchorsFor(seatOfPlayer(ref.player));
      const y = ref.ground === true ? anchors.lands.y : anchors.casting.y;
      return [anchors.casting.x, y, anchors.casting.z];
    }
    case 'stack':
      return [STACK_ANCHOR.x, STACK_ANCHOR.y, STACK_ANCHOR.z];
    case 'table':
      return [TABLE_ANCHOR.x, TABLE_ANCHOR.y, TABLE_ANCHOR.z];
    case 'above': {
      const base = refRestPositionOf(placed, ref.id);
      return base === null ? null : [base[0], base[1] + ref.height, base[2]];
    }
    case 'beside': {
      const base = refRestPositionOf(placed, ref.id);
      return base === null ? null : [base[0] + ref.dx * (CARD_W + 0.08), base[1] + 0.02, base[2]];
    }
    default:
      return null;
  }
}

function refOwnSideOf(ref: AnchorRef, placement: Placement): AnchorRef {
  if (placement.playerId === null) return ref;
  if (ref.kind === 'zone' && ref.player === null) {
    return { kind: 'zone', player: placement.playerId, zone: ref.zone };
  }
  if (ref.kind === 'casting' && ref.player === null) {
    return ref.ground === true
      ? { kind: 'casting', player: placement.playerId, ground: true }
      : { kind: 'casting', player: placement.playerId };
  }
  return ref;
}

function refAnchorDelta(placed: Layout, cardId: number, ref: AnchorRef): Tuple {
  const placement = refPlacementOf(placed, cardId);
  if (placement === null) return [0, 0, 0];
  const to = refAnchorPosition(placed, refOwnSideOf(ref, placement));
  if (to === null) return [0, 0, 0];
  const from = placement.position;
  return [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
}

function refFigureYawTo(placed: Layout, cardId: number, ref: AnchorRef): number {
  const placement = refPlacementOf(placed, cardId);
  if (placement === null) return 0;
  const to = refAnchorPosition(placed, refOwnSideOf(ref, placement));
  if (to === null) return 0;
  const stand = standPointOf(placement);
  return yawToward(seatFacingY(placement.seat), stand[0], stand[2], to[0], to[2]);
}

// ---------------------------------------------------------------------------
// The corpus, and every anchor a board can be asked for
// ---------------------------------------------------------------------------

interface Board {
  file: string;
  index: number;
  state: ClientState;
  placed: Layout;
}

function corpusBoards(): Board[] {
  const out: Board[] = [];
  for (const dir of ['games/', 'synthetic/']) {
    for (const name of readdirSync(FIXTURES + dir).sort()) {
      if (!name.endsWith('.jsonl')) continue;
      const log = parseFrameLog(readFileSync(FIXTURES + dir + name, 'utf8'));
      let state = initialState(log.header);
      (log.frames as Frame[]).forEach((frame, index) => {
        state = reduce(state, frame);
        if (frame.type === 'state' && state.board !== null) out.push({ file: dir + name, index, state, placed: layout(state) });
      });
    }
  }
  return out;
}

const BOARDS = corpusBoards();

/** A card id no recording uses, and one below every id. */
const ABSENT_IDS = [-1, 987_654_321];
/** A player id no recording uses: every seat is the opponent's to a viewer by that id. */
const STRANGER = 99;
const ZONES = ['hand', 'battlefield', 'graveyard', 'exile', 'command', 'library', 'combat', 'stack', 'sideboard', ''];

/** Every anchor this board can be asked for, of every kind. */
function refsOf(board: Board): AnchorRef[] {
  const ids = [...new Set(board.placed.placements.map((p) => p.cardId)), ...ABSENT_IDS];
  const players: Array<number | null> = [...(board.state.board?.players.map((p) => p.id) ?? []), STRANGER, null];
  const refs: AnchorRef[] = [{ kind: 'stack' }, { kind: 'table' }, { kind: 'nowhere' } as unknown as AnchorRef];
  for (const id of ids) {
    refs.push({ kind: 'card', id });
    refs.push({ kind: 'above', id, height: 0.6 });
    refs.push({ kind: 'above', id, height: 1.25 });
    refs.push({ kind: 'beside', id, dx: -1 });
    refs.push({ kind: 'beside', id, dx: 0.5 });
    refs.push({ kind: 'figure', id, at: 0.5 });
  }
  for (const player of players) {
    // The wire's types say `player` and `combat` take a number; a `null` is still
    // resolved (the closure mapped it to `you`), so it is compared too.
    refs.push({ kind: 'player', id: player } as AnchorRef);
    refs.push({ kind: 'combat', player } as AnchorRef);
    refs.push({ kind: 'casting', player });
    refs.push({ kind: 'casting', player, ground: false });
    refs.push({ kind: 'casting', player, ground: true });
    for (const zone of ZONES) refs.push({ kind: 'zone', player, zone });
  }
  return refs;
}

/** `Object.is` per number, so a `-0` for a `0` counts. */
function sameAnswer(a: readonly number[] | null, b: readonly number[] | null): boolean {
  if (a === null || b === null) return a === b;
  return a.length === 3 && b.length === 3 && Object.is(a[0], b[0]) && Object.is(a[1], b[1]) && Object.is(a[2], b[2]);
}

function describe(ref: AnchorRef): string {
  return JSON.stringify(ref);
}

// ---------------------------------------------------------------------------
// 1. Every answer is the one it was
// ---------------------------------------------------------------------------

test('anchors: every anchor kind of every board frame of the corpus resolves exactly as it did — old against new three ways, from four chairs (D275)', () => {
  const files = new Set(BOARDS.map((b) => b.file));
  assert.equal(files.size, 23, `expected the 23 committed recordings, saw ${String(files.size)}`);
  assert.ok(BOARDS.length > 3000, `expected every board frame, saw ${String(BOARDS.length)}`);

  const scratch: Tuple = [Number.NaN, Number.NaN, Number.NaN];
  const perKind = new Map<string, { resolved: number; nulls: number }>();
  const differences: string[] = [];
  let compared = 0;
  let layouts = 0;
  for (const board of BOARDS) {
    const refs = refsOf(board);
    const players = board.state.board?.players.map((p) => p.id) ?? [];
    const viewer = board.placed.viewerId;
    const other = players.find((id) => id !== viewer) ?? null;
    // The board as the stream's own seat saw it, from the other chair, from a
    // stranger's (every seat the opponent's) and from none (no hello yet).
    const chairs: Layout[] = [board.placed, { ...board.placed, viewerId: other }, { ...board.placed, viewerId: STRANGER }, { ...board.placed, viewerId: null }];
    for (const placed of chairs) {
      layouts += 1;
      const stage = new SceneStage(placed);
      for (const ref of refs) {
        const want = refAnchorPosition(placed, ref);
        const fresh = anchorPosition(placed, ref);
        const into = anchorPositionInto(scratch, placed, ref);
        const staged = stage.positionOf(ref);
        compared += 3;
        if (!sameAnswer(want, fresh)) differences.push(`${board.file}@${String(board.index)} viewer ${String(placed.viewerId)} anchorPosition ${describe(ref)}: ${JSON.stringify(fresh)} ≠ ${JSON.stringify(want)}`);
        if (!sameAnswer(want, into)) differences.push(`${board.file}@${String(board.index)} viewer ${String(placed.viewerId)} anchorPositionInto ${describe(ref)}: ${JSON.stringify(into)} ≠ ${JSON.stringify(want)}`);
        if (!sameAnswer(want, staged)) differences.push(`${board.file}@${String(board.index)} viewer ${String(placed.viewerId)} positionOf ${describe(ref)}: ${JSON.stringify(staged)} ≠ ${JSON.stringify(want)}`);
        // Into answers the tuple it was handed, and the stage its one scratch.
        if (into !== null && into !== scratch) differences.push(`${describe(ref)}: anchorPositionInto answered a tuple it was not handed`);
        const tally = perKind.get(ref.kind) ?? { resolved: 0, nulls: 0 };
        if (want === null) tally.nulls += 1;
        else tally.resolved += 1;
        perKind.set(ref.kind, tally);
      }
    }
  }
  console.log(
    `  anchors: ${String(compared)} answers compared over ${String(layouts)} layouts (${String(BOARDS.length)} board frames × 4 chairs) — ` +
      [...perKind].map(([kind, t]) => `${kind} ${String(t.resolved)}/${String(t.nulls)} null`).join(', ') +
      ` — ${String(differences.length)} differences`,
  );
  assert.deepEqual(differences.slice(0, 20), [], `${String(differences.length)} answers moved`);
  // Every kind the resolver knows was asked, and answered as well as refused.
  for (const kind of ['card', 'player', 'zone', 'combat', 'casting', 'stack', 'table', 'above', 'beside']) {
    const tally = perKind.get(kind);
    assert.ok(tally !== undefined && tally.resolved > 1000, `${kind} was resolved only ${String(tally?.resolved ?? 0)} times`);
  }
  for (const kind of ['card', 'above', 'beside', 'zone', 'figure', 'nowhere']) {
    assert.ok((perKind.get(kind)?.nulls ?? 0) > 0, `${kind} never resolved to null — the sweep does not reach that branch`);
  }
});

test('anchors: placementOf, anchorDelta and figureYawTo answer as they did on every card of every board frame (D275)', () => {
  // The same helpers, reached by the cue layer's `deltaTo` and `yawTo` and by the
  // workshop's framing: `placementOf` is now an indexed walk, so it is compared
  // for IDENTITY — the very placement `byKey` gave.
  const asks: AnchorRef[] = [
    { kind: 'table' },
    { kind: 'stack' },
    { kind: 'zone', player: null, zone: 'graveyard' },
    { kind: 'zone', player: null, zone: 'battlefield' },
    { kind: 'zone', player: null, zone: 'exile' },
    { kind: 'zone', player: null, zone: 'unknown' },
    { kind: 'casting', player: null },
    { kind: 'casting', player: null, ground: true },
  ];
  const differences: string[] = [];
  let placements = 0;
  let deltas = 0;
  for (const board of BOARDS) {
    const placed = board.placed;
    const ids = [...new Set(placed.placements.map((p) => p.cardId)), ...ABSENT_IDS];
    const players = board.state.board?.players.map((p) => p.id) ?? [];
    const refs: AnchorRef[] = [...asks];
    for (const player of players) refs.push({ kind: 'player', id: player }, { kind: 'combat', player }, { kind: 'casting', player });
    for (const id of ids) {
      placements += 1;
      if (placementOf(placed, id) !== refPlacementOf(placed, id)) differences.push(`${board.file}@${String(board.index)} placementOf ${String(id)}`);
    }
    // Every card against the table's fixed anchors and the other cards' (a few,
    // spread over the rank), as a cue's `deltaTo` and `yawTo` ask.
    const targets = ids.filter((_, i) => i % 5 === 0);
    for (const id of ids) {
      for (const ref of [...refs, ...targets.map((t): AnchorRef => ({ kind: 'card', id: t }))]) {
        deltas += 1;
        if (!sameAnswer(anchorDelta(placed, id, ref), refAnchorDelta(placed, id, ref))) differences.push(`${board.file}@${String(board.index)} anchorDelta ${String(id)} ${describe(ref)}`);
        if (!Object.is(figureYawTo(placed, id, ref), refFigureYawTo(placed, id, ref))) differences.push(`${board.file}@${String(board.index)} figureYawTo ${String(id)} ${describe(ref)}`);
      }
    }
  }
  // Two cases no recording has, held by hand on a sample of boards: a card placed
  // TWICE under its `c:` key (`byKey` keeps the LAST, so the walk from the end
  // must find that one), and a card whose `c:` placement is gone (the forward
  // walk's fallback, the FIRST placement of it — a stack copy when it has one).
  let doubled = 0;
  for (const board of BOARDS.filter((_, i) => i % 50 === 0)) {
    for (const p of board.placed.placements) {
      if (!p.key.startsWith('c:')) continue;
      const twice = [...board.placed.placements, { ...p, position: [9, 9, 9] as Tuple }];
      const withTwice: Layout = { ...board.placed, placements: twice, byKey: new Map(twice.map((q) => [q.key, q])) };
      const gone = board.placed.placements.filter((q) => q !== p);
      const withGone: Layout = { ...board.placed, placements: gone, byKey: new Map(gone.map((q) => [q.key, q])) };
      for (const placed of [withTwice, withGone]) {
        doubled += 1;
        if (placementOf(placed, p.cardId) !== refPlacementOf(placed, p.cardId)) differences.push(`${board.file}@${String(board.index)} placementOf ${String(p.cardId)}, placed twice or not at all`);
      }
    }
  }
  console.log(`  anchors: placementOf ${String(placements)} lookups (+${String(doubled)} by hand), anchorDelta and figureYawTo ${String(deltas)} each — ${String(differences.length)} differences`);
  assert.deepEqual(differences.slice(0, 20), [], `${String(differences.length)} answers moved`);
});

test('anchors: the opponent’s anchors are built once and are the mirror they were (D275)', () => {
  // Built once: the same objects every call, where each call built its own.
  assert.equal(anchorsFor('opp'), anchorsFor('opp'));
  assert.equal(playerAnchorFor('opp'), playerAnchorFor('opp'));
  assert.equal(anchorsFor('you'), YOU_ANCHORS);
  // …and each the mirror the old call built, `-0` included (the command anchor's z).
  const was = refAnchorsFor('opp');
  const now = anchorsFor('opp');
  for (const name of Object.keys(was) as Array<keyof SeatAnchors>) {
    for (const axis of ['x', 'y', 'z', 'pitch'] as const) {
      assert.ok(Object.is(now[name][axis], was[name][axis]), `anchorsFor('opp').${name}.${axis}: ${String(now[name][axis])} ≠ ${String(was[name][axis])}`);
    }
  }
  assert.ok(Object.is(now.command.z, -0), 'the command anchor mirrors to −0, as it did');
  const player = refPlayerAnchorFor('opp');
  for (const axis of ['x', 'y', 'z', 'pitch'] as const) assert.ok(Object.is(playerAnchorFor('opp')[axis], player[axis]), `playerAnchorFor('opp').${axis}`);
});

// ---------------------------------------------------------------------------
// 2. The scratch is shared, and every caller reads an answer before the next
// ---------------------------------------------------------------------------

test('anchors: positionOf answers ONE tuple, overwritten by the next call — anchorPosition a fresh one (D275)', () => {
  const board = BOARDS.find((b) => b.file === 'games/g1.jsonl' && b.index >= 316)!;
  const stage = new SceneStage(board.placed);
  const first = stage.positionOf({ kind: 'table' });
  assert.ok(first !== null);
  const table = [first[0], first[1], first[2]];
  const second = stage.positionOf({ kind: 'stack' });
  // The hazard every caller is written against: the first answer IS the second.
  assert.equal(second, first, 'positionOf answers the stage’s one scratch tuple');
  assert.ok(!sameAnswer(first, table), 'the next call overwrote the first answer');
  assert.ok(sameAnswer(second, [STACK_ANCHOR.x, STACK_ANCHOR.y, STACK_ANCHOR.z]));
  // A card's answer is a copy, so no caller can write the layout through it.
  const card = board.placed.placements.find((p) => p.kind === 'creature')!;
  const at = stage.positionOf({ kind: 'card', id: card.cardId });
  assert.ok(at !== null && at !== card.position && sameAnswer(at, card.position));
  // The allocating form: a tuple of its own every call, for a caller that keeps it.
  const a = anchorPosition(board.placed, { kind: 'table' });
  const b = anchorPosition(board.placed, { kind: 'table' });
  assert.ok(a !== null && b !== null && a !== b && sameAnswer(a, b));
});

/** A seeded generator, so the random effects are the same every run. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KINDS: EffectKind[] = ['glow', 'ring', 'beam', 'particles', 'text', 'plate', 'mote', 'streak'];
const SHAPES: Array<EffectShape | undefined> = [undefined, 'soft', 'burst', 'splat', 'dots', 'reticle', 'star'];

function randomEffect(next: () => number, refs: readonly AnchorRef[], ids: readonly number[]): Effect {
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)]!;
  const kind = pick(KINDS);
  const figureAt = next() < 0.25;
  const at: AnchorRef = figureAt ? { kind: 'figure', id: pick(ids), at: next() } : pick(refs);
  const effect: Effect = { kind, at, colour: pick(['#ffffff', '#ffd166', '#ef476f', '#06d6a0']), strength: 0.2 + next(), radius: 0.1 + next() };
  if (kind === 'beam' || kind === 'mote' || kind === 'streak' || (kind === 'particles' && next() < 0.7)) effect.to = pick(refs);
  if (kind === 'streak' && next() < 0.6) effect.from = pick(refs);
  if (kind === 'mote' || kind === 'particles' || kind === 'streak') effect.travel = next();
  if (kind === 'glow' || kind === 'ring' || kind === 'plate') {
    const shape = pick(SHAPES);
    if (shape !== undefined) effect.shape = shape;
  }
  if (kind === 'glow' && effect.shape === 'burst' && figureAt && next() < 0.6) effect.aside = pick(refs);
  if (kind === 'text') {
    effect.text = pick(['TURN 9', '-3', '+1', 'WIN']);
    effect.rise = next();
    effect.driftX = next() - 0.5;
  }
  return effect;
}

/** Every slot's drawn state after a bind: visibility, transform, opacity, and a cloud's points. */
function slotsOf(pool: EffectPool): number[] {
  const out: number[] = [];
  for (const object of pool.group.children) {
    out.push(object.visible ? 1 : 0, ...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray());
    const material = (object as THREE.Mesh).material as THREE.Material | undefined;
    out.push(material?.opacity ?? -1);
    if (object instanceof THREE.Points) out.push(...(object.geometry.getAttribute('position').array as Float32Array));
  }
  return out;
}

test('anchors: the effect pool draws, slot for slot, what it drew through fresh tuples — every body reads an answer before its next resolve (D275)', () => {
  // Random effects of every kind over boards from every recording, bound twice:
  // through the stage's one scratch tuple (as the arena does) and through a fresh
  // tuple an answer (as `anchorPosition` gave before). A body that read an answer
  // after resolving another anchor — a beam's `at` after its `to`, a streak's
  // `to` after its `from` — would draw the second place twice through the scratch.
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1600 / 1000, CAMERA.near, CAMERA.far);
  camera.position.set(...REST_POSE.position);
  camera.lookAt(...REST_POSE.target);
  camera.updateMatrixWorld(true);
  const next = rng(275);
  const viaScratch = new EffectPool();
  const viaFresh = new EffectPool();
  let binds = 0;
  let twoAnchor = 0;
  const differences: string[] = [];
  const sample = BOARDS.filter((_, i) => i % 23 === 0);
  for (const board of sample) {
    const stage = new SceneStage(board.placed);
    const fresh = (ref: AnchorRef): Tuple | null => anchorPosition(board.placed, ref);
    const refs = refsOf(board).filter((r) => r.kind !== 'figure');
    const ids = board.placed.placements.map((p) => p.cardId);
    if (ids.length === 0) continue;
    for (let frame = 0; frame < 20; frame++) {
      const effects = new Map<string, Effect>();
      const n = 1 + Math.floor(next() * 14);
      for (let i = 0; i < n; i++) {
        const effect = randomEffect(next, refs, ids);
        if (effect.to !== undefined) twoAnchor += 1;
        effects.set(`fx:${String(i).padStart(2, '0')}`, effect);
      }
      viaScratch.setFigures(null, null, frame / 60, null, board.placed);
      viaFresh.setFigures(null, null, frame / 60, null, board.placed);
      viaScratch.bind(effects, stage.positionOf, camera);
      viaFresh.bind(effects, fresh, camera);
      binds += 1;
      const a = slotsOf(viaScratch);
      const b = slotsOf(viaFresh);
      const at = a.findIndex((v, i) => !Object.is(v, b[i]));
      if (at >= 0 || a.length !== b.length) differences.push(`${board.file}@${String(board.index)} frame ${String(frame)}: slot value ${String(at)}`);
    }
  }
  console.log(`  anchors: the pool bound ${String(binds)} times over ${String(sample.length)} boards, ${String(twoAnchor)} effects with a second anchor — ${String(differences.length)} differences`);
  assert.ok(binds > 2500 && twoAnchor > 5000, 'the sweep is too small to say anything');
  assert.deepEqual(differences.slice(0, 10), []);
});

test('anchors: the camera director copies the points it frames — its shot through the scratch is its shot through fresh tuples (D275)', () => {
  const board = BOARDS.find((b) => b.file === 'games/g1.jsonl' && b.index >= 316)!;
  const stage = new SceneStage(board.placed);
  const mine = board.placed.placements.find((p) => p.kind === 'creature' && p.seat === 'you')!;
  const theirs = board.placed.placements.find((p) => p.kind === 'creature' && p.seat === 'opp')!;
  const frame: AnchorRef[] = [{ kind: 'card', id: mine.cardId }, { kind: 'card', id: theirs.cardId }, { kind: 'table' }];
  const request: CameraRequest = { frame, padding: 1.4, tilt: 0.22, shake: 0, priority: 1, ms: 800 };
  const own = anchorsFor('you');
  const world = (resolve: DirectorWorld['resolve']): DirectorWorld => ({
    resolve,
    hand: [own.hand.x, own.hand.y, own.hand.z],
    battlefield: [own.creatures.x, own.creatures.y, own.creatures.z],
    aspect: 1600 / 1000,
    awaitingHuman: false,
    mode: 'replay',
    reducedMotion: false,
  });
  const shots: number[][] = [];
  for (const resolve of [stage.positionOf, (ref: AnchorRef): Tuple | null => anchorPosition(board.placed, ref)]) {
    const director = new CameraDirector();
    assert.equal(director.request(request, 0, world(resolve)), 'taken');
    const pose = director.tick(400).pose;
    assert.ok(pose !== null);
    shots.push([...pose.position, ...pose.target]);
  }
  assert.ok(shots[0]!.every((v, i) => Object.is(v, shots[1]![i])), `the shot through the scratch moved: ${JSON.stringify(shots)}`);
  // The control: what a director that KEPT the scratch would have framed — the
  // last anchor three times — is a different shot, so the comparison has teeth.
  const options = { padding: 1.4, tilt: 0.22, aspect: 1600 / 1000, hand: world(stage.positionOf).hand, battlefield: world(stage.positionOf).battlefield };
  const points = frame.map((ref) => anchorPosition(board.placed, ref)!);
  const kept = points.map(() => points[points.length - 1]!);
  const right = solveFraming(points, orbitFromPose(REST_POSE), options);
  const wrong = solveFraming(kept, orbitFromPose(REST_POSE), options);
  assert.ok(right !== null && wrong !== null);
  assert.ok(!right.position.every((v, i) => Math.abs(v - wrong.position[i]!) < 1e-6), 'a kept scratch would frame the same shot — the control is blind');
});

/** Every mesh of the casting field as drawn: visibility, count, and each drawn instance's matrix and colour. */
function castingOf(field: CastingField): number[] {
  const out: number[] = [];
  for (const object of field.group.children) {
    const mesh = object as THREE.InstancedMesh;
    out.push(mesh.visible ? 1 : 0, mesh.count, ...mesh.instanceMatrix.array.slice(0, mesh.count * 16));
    if (mesh.instanceColor !== null) out.push(...mesh.instanceColor.array.slice(0, mesh.count * 3));
  }
  return out;
}

test('anchors: the casting field draws its tethers through the scratch as it did through fresh tuples — each is read before the next resolve (D275)', () => {
  // The third caller of `stage.positionOf` (D275's fix pass; the verifier spliced a
  // second resolve between a tether's resolve and its read, and nothing went red).
  // Every board frame's own stack, as `Arena.tsx` builds its forms, and on a sample
  // of boards random forms at both seats with one to three tethers each — to cards
  // on the board, an id that is not, every player and a stranger — bound through
  // the stage's one scratch tuple and through a fresh tuple an answer. No body has
  // a figure (an empty figure layout), so every tether's far end is resolved.
  const next = rng(2750);
  const viaScratch = new CastingField();
  const viaFresh = new CastingField();
  const sloppyField = new CastingField();
  let binds = 0;
  let tethers = 0;
  let sloppyDiffers = 0;
  const differences: string[] = [];
  for (const [i, board] of BOARDS.entries()) {
    const viewer = board.placed.viewerId;
    const seatOfPlayer = (id: number): Seat => (viewer === null || id === viewer ? 'you' : 'opp');
    const corpus = spellForms(board.state.board, seatOfPlayer, () => '#ffd166');
    const random: SpellForm[] = [];
    if (i % 7 === 0) {
      const ids = [...board.placed.placements.map((p) => p.cardId), ...ABSENT_IDS];
      const players = [...(board.state.board?.players.map((p) => p.id) ?? []), STRANGER];
      const n = 1 + Math.floor(next() * 3);
      for (let index = 0; index < n; index++) {
        const aims: TetherRef[] = [];
        const m = 1 + Math.floor(next() * 3);
        for (let t = 0; t < m; t++) {
          aims.push(next() < 0.7 ? { kind: 'card', id: ids[Math.floor(next() * ids.length)]! } : { kind: 'player', id: players[Math.floor(next() * players.length)]! });
        }
        const player = players[Math.floor(next() * players.length)]!;
        random.push({
          stackItemId: 9_000 + index,
          sourceCardId: null,
          player,
          seat: seatOfPlayer(player),
          index,
          kind: FORM_KINDS[Math.floor(next() * FORM_KINDS.length)]!,
          colour: '#06d6a0',
          tethers: aims,
        });
      }
    }
    for (const forms of [corpus, random]) {
      if (forms.length === 0) continue;
      const stage = new SceneStage(board.placed);
      const fresh = (ref: AnchorRef): Tuple | null => anchorPosition(board.placed, ref);
      // The control: a resolver whose caller would read its answer after the next
      // resolve — the scratch then holds the table's point, not the target's.
      const sloppy = (ref: AnchorRef): Tuple | null => {
        const at = stage.positionOf(ref);
        stage.positionOf({ kind: 'table' });
        return at;
      };
      viaScratch.bind([], forms, stage.positionOf, new Map(), 0);
      viaFresh.bind([], forms, fresh, new Map(), 0);
      sloppyField.bind([], forms, sloppy, new Map(), 0);
      binds += 1;
      tethers += viaFresh.counts()['tethers']!;
      const a = castingOf(viaScratch);
      const b = castingOf(viaFresh);
      const at = a.findIndex((v, k) => !Object.is(v, b[k]));
      if (at >= 0 || a.length !== b.length) differences.push(`${board.file}@${String(board.index)}: value ${String(at)}`);
      const c = castingOf(sloppyField);
      if (c.length !== b.length || c.some((v, k) => !Object.is(v, b[k]))) sloppyDiffers += 1;
    }
  }
  console.log(`  anchors: the casting field bound ${String(binds)} times, ${String(tethers)} tethers drawn — ${String(differences.length)} differences; a resolver read late differs on ${String(sloppyDiffers)}`);
  assert.ok(binds > 500 && tethers > 1000, 'the sweep is too small to say anything');
  assert.deepEqual(differences.slice(0, 10), []);
  assert.ok(sloppyDiffers > binds / 2, 'a resolver read after its next resolve draws the same tethers — the comparison is blind');
});
