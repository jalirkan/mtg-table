/*
 * mtg-table — web/test/facing.test.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **One definition of a figure's FRONT, held by both tracks that use it** (Tier 2
 * slice 3's verification pass; D81).
 *
 * Two things draw ON a figure: the prop field (`scene/props.ts`, which turns
 * figure space — front at +Z — by the pose's `facingY`) and the effect binding's
 * `figure` anchor (`scene/effects.ts`, which resolves a cue's `fwd` / `side`).
 * They disagreed: the anchor resolved `fwd` along −(sin, cos), so every T11 beat
 * meant for the front of a body landed behind it — the Doombot's exhaust streamed
 * out of its face (`g1`@231→232, photographed from both sides). This file resolves
 * each beat and the prop it is about, for BOTH seats, and asserts they agree:
 *
 *  - `attack.jet`'s eye (and so its laser's origin) is on the drone's `laserEye` side;
 *  - its exhaust is on the drone's `jetpack` side;
 *  - `attack.lunge`'s muzzle flash is ON Agent 13's lit muzzle;
 *  - `fx.badge`'s flash is on Coulson's badge side;
 *
 * and it carries its own negative control: the old resolution fails every one.
 *
 * The second verification pass added the other half (D82): an attack turns its
 * attacker to FACE its defender (`Offset.dRotY`, `Stage.yawTo`) for the length
 * of the lunge — and this file runs the real cues against a `SceneStage` over a
 * two-seat board and asserts the muzzle flash and the laser fire AT the
 * defender, on both seats. Since **D126** (PLAN question 13, answered
 * 2026-09-28) both seats' figures rest facing the OTHER seat, so that turn is a
 * small one; the facing they had before — outward, toward their own player — is
 * this file's negative control, and it fires every beat out of the far side.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import * as THREE from 'three';

import { REGISTRY } from '../src/arena/cues/registry.ts';
import { NullStage, type AnchorRef } from '../src/arena/cues/stage.ts';
import { SceneStage } from '../src/arena/scene/SceneStage.ts';
import type { CueParamValue } from '../src/arena/cues/types.ts';
import { PISTOL_MUZZLE, anchorsOf, type Family, type PropKind } from '../src/arena/figures/props.ts';
import {
  FIGURE_FRONT_Z,
  anchorPosition,
  figureAnchorOf,
  figurePointInto,
  figureYawTo,
  layout,
  seatFacingY,
  yawToward,
  type Seat,
} from '../src/arena/layout.ts';
import type { AnyCard } from '../src/protocol.ts';
import { PRESENCE, onBattlefield, posesOf, twoSeatState } from './prop-raster.ts';

type V3 = [number, number, number];
type FigureRef = Extract<AnchorRef, { kind: 'figure' }>;

const SEATS: readonly Seat[] = ['you', 'opp'];
/** A figure at the origin, one unit tall: every point below is relative to its feet. */
const HEIGHT = 1;

/** The prop field's own transform (`scene/props.ts`): position ⊕ a turn of facingY about y ⊕ height. */
function propPoint(kind: PropKind, family: Family, facingY: number): V3 {
  const anchor = anchorsOf(kind, family)[0];
  assert.ok(anchor !== undefined, `${kind} has no anchor on a ${family}`);
  const root = new THREE.Matrix4().compose(
    new THREE.Vector3(0, 0, 0),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), facingY),
    new THREE.Vector3(HEIGHT, HEIGHT, HEIGHT),
  );
  // A joint prop at the bind pose is root × anchor (joint.matrixWorld × bind⁻¹ = root).
  const p = new THREE.Vector3(anchor.at[0], anchor.at[1], anchor.at[2]).applyMatrix4(root);
  return [p.x, p.y, p.z];
}

/** The effect binding's `figure` anchor (`scene/effects.ts`'s `#figurePoint`, at rest). */
function cuePoint(ref: FigureRef, facingY: number): V3 {
  return figurePointInto([0, 0, 0], 0, 0, 0, facingY, (ref.fwd ?? 0) * HEIGHT, ref.at * HEIGHT, (ref.side ?? 0) * HEIGHT);
}

/** Slice 3's first resolution, kept here only as the negative control. */
function oldCuePoint(ref: FigureRef, facingY: number): V3 {
  const fx = -Math.sin(facingY);
  const fz = -Math.cos(facingY);
  const fwd = (ref.fwd ?? 0) * HEIGHT;
  const side = (ref.side ?? 0) * HEIGHT;
  return [fx * fwd - fz * side, ref.at * HEIGHT, fz * fwd + fx * side];
}

/** How far in FRONT of the figure a point is: its projection on the world front. */
function frontOf(point: V3, facingY: number): number {
  return point[0] * FIGURE_FRONT_Z * Math.sin(facingY) + point[2] * FIGURE_FRONT_Z * Math.cos(facingY);
}

/** A beat's anchor, from the registered cue itself at time `t`. */
function beat(id: string, suffix: string, t: number, params: Readonly<Record<string, CueParamValue>>): FigureRef {
  const impl = REGISTRY.get(id);
  assert.ok(impl !== undefined, id);
  const stage = new NullStage();
  impl.apply({ id, targets: [1], players: [0, 1], params, ms: 600, key: 'k', reducedMotion: false }, t, stage);
  const effect = stage.effects.get(`k:${suffix}`);
  assert.ok(effect !== undefined, `${id} drew no ${suffix} at t = ${String(t)}`);
  assert.equal(effect.at.kind, 'figure', `${id}:${suffix} is not on the body`);
  return effect.at as FigureRef;
}

const JET = { laser: true, defenderKind: 'player', defenderId: 1 };

test('facing: figure space faces +Z, and the kit agrees — the eye, badge and pistol in front, the thrusters behind', () => {
  assert.equal(FIGURE_FRONT_Z, 1);
  for (const [kind, family, front] of [
    ['laserEye', 'drone', true],
    ['jetpack', 'drone', false],
    ['exhaust', 'drone', false],
    ['badge', 'humanoid', true],
    ['pistol', 'humanoid', true],
    ['muzzle', 'humanoid', true],
    ['tie', 'humanoid', true],
  ] as const) {
    const z = anchorsOf(kind, family)[0]!.at[2] * FIGURE_FRONT_Z;
    assert.equal(z > 0, front, `${kind} on a ${family} is ${front ? 'not in front' : 'not behind'} (z ${z.toFixed(3)})`);
  }
  // The two seats face opposite ways — each toward the other (D126): the
  // opponent's figures face +Z, the viewer's camera, and yours face away from it.
  assert.equal(seatFacingY('you'), Math.PI);
  assert.equal(seatFacingY('opp'), 0);
});

test('facing: every T11 beat lands on the side of the prop it is about, for both seats (D81)', () => {
  const eye = beat('attack.jet', 'eye', 0.5, JET);
  const exhaust = beat('attack.jet', 'exhaust', 0.5, JET);
  const muzzle = beat('attack.lunge', 'muzzle', 0.36, { muzzle: true });
  const badge = beat('fx.badge', 'badge', 0.5, {});
  // The laser leaves the eye.
  const jet = new NullStage();
  REGISTRY.get('attack.jet')!.apply({ id: 'attack.jet', targets: [1], players: [0, 1], params: JET, ms: 600, key: 'k', reducedMotion: false }, 0.5, jet);
  assert.deepEqual(jet.effects.get('k:laser')?.at, eye, 'the laser does not leave the eye');

  const cases: Array<[string, FigureRef, PropKind, Family]> = [
    ['attack.jet eye', eye, 'laserEye', 'drone'],
    ['attack.jet exhaust', exhaust, 'jetpack', 'drone'],
    ['attack.lunge muzzle', muzzle, 'muzzle', 'humanoid'],
    ['fx.badge badge', badge, 'badge', 'humanoid'],
  ];
  let oldAgreed = 0;
  for (const seat of SEATS) {
    const facingY = seatFacingY(seat);
    for (const [name, ref, kind, family] of cases) {
      const prop = propPoint(kind, family, facingY);
      const cue = cuePoint(ref, facingY);
      const propFront = frontOf(prop, facingY);
      const cueFront = frontOf(cue, facingY);
      assert.ok(Math.abs(propFront) > 0.05, `${name}: the ${kind} is not clearly in front or behind`);
      assert.equal(
        Math.sign(cueFront),
        Math.sign(propFront),
        `${seat}: ${name} is ${cueFront > 0 ? 'in front' : 'behind'} but the ${kind} is ${propFront > 0 ? 'in front' : 'behind'}`,
      );
      // …and the same way in the WORLD, not just in the figure's own terms.
      assert.ok(cue[0] * prop[0] + cue[2] * prop[2] > 0, `${seat}: ${name} and the ${kind} are on opposite sides`);
      const old = oldCuePoint(ref, facingY);
      if (Math.sign(frontOf(old, facingY)) === Math.sign(propFront)) oldAgreed += 1;
    }
  }
  // The negative control: slice 3's first resolution put every one on the wrong side.
  assert.equal(oldAgreed, 0, 'the old resolution agreed with a prop — this test would not have caught the defect');
});

test('facing: Agent 13’s muzzle flash is ON her lit muzzle, and on her right, for both seats', () => {
  const muzzle = beat('attack.lunge', 'muzzle', 0.36, { muzzle: true });
  const expected = figureAnchorOf(PISTOL_MUZZLE);
  assert.deepEqual({ at: muzzle.at, fwd: muzzle.fwd, side: muzzle.side }, expected);
  for (const seat of SEATS) {
    const facingY = seatFacingY(seat);
    const cue = cuePoint(muzzle, facingY);
    const prop = propPoint('muzzle', 'humanoid', facingY);
    const gap = Math.hypot(cue[0] - prop[0], cue[1] - prop[1], cue[2] - prop[2]);
    assert.ok(gap < 1e-9, `${seat}: the flash is ${gap.toFixed(4)} from the muzzle`);
    // Her RIGHT hand is `front × up` — −X for a figure facing +Z. The pistol is on it.
    const right: V3 = [-FIGURE_FRONT_Z * Math.cos(facingY), 0, FIGURE_FRONT_Z * Math.sin(facingY)];
    const pistol = propPoint('pistol', 'humanoid', facingY);
    assert.ok(pistol[0] * right[0] + pistol[2] * right[2] > 0, `${seat}: the pistol is not on her right`);
    assert.ok(cue[0] * right[0] + cue[2] * right[2] > 0, `${seat}: the flash is not on her right`);
  }
});

test('facing: a flier on the jet lunge keeps the lunge and loses the robot eye (`eye: false`)', () => {
  const stage = new NullStage();
  const impl = REGISTRY.get('attack.jet')!;
  impl.apply({ id: 'attack.jet', targets: [1], players: [0, 1], params: { eye: false }, ms: 600, key: 'k', reducedMotion: false }, 0.5, stage);
  assert.equal(stage.effects.get('k:eye'), undefined, 'a flier drew the Doombot’s eye');
  assert.ok(stage.effects.get('k:exhaust') !== undefined, 'the wing-wash is gone too');
  assert.ok(stage.offsets.size > 0, 'the lunge is gone');
  impl.end({ id: 'attack.jet', targets: [1], players: [0, 1], params: { eye: false }, ms: 600, key: 'k', reducedMotion: false }, stage);
  assert.equal(stage.effects.size, 0);
  // …and the two fliers that attack on it say so.
  const cues = JSON.parse(readFileSync(fileURLToPath(new URL('../src/arena/cues/cues.json', import.meta.url)), 'utf8')) as {
    cards: Record<string, { attackers?: { cue: string; params?: Record<string, unknown> } }>;
  };
  for (const name of ['Wasp, Shrinking Savior', 'Giant-Sized Flying Ant']) {
    assert.equal(cues.cards[name]?.attackers?.cue, 'attack.jet');
    assert.equal(cues.cards[name]?.attackers?.params?.['eye'], false, `${name} still attacks with the robot eye`);
  }
  assert.notEqual(cues.cards['Aerial Doombot']?.attackers?.params?.['eye'], false, 'the Doombot lost its eye');
});

test('facing: the effect binding resolves a figure anchor ONLY through layout.ts’s figurePointInto', () => {
  const source = readFileSync(fileURLToPath(new URL('../src/arena/scene/effects.ts', import.meta.url)), 'utf8');
  const start = source.indexOf('#figurePoint(ref');
  assert.ok(start > 0, 'could not find #figurePoint');
  const body = source.slice(start, source.indexOf('\n  }\n', start));
  assert.equal((body.match(/figurePointInto\(/g) ?? []).length, 2, 'both branches (the living and the dying body) go through figurePointInto');
  assert.ok(!/Math\.(sin|cos)\([^)]*facingY/.test(body), '#figurePoint computes a facing of its own again');
  assert.ok(/Math\.sin\(/.test(body), 'the presence bob moved — re-read this scan');
});

// ---------------------------------------------------------------------------
// The second verification pass: a front-anchored beat fires AT its target
// ---------------------------------------------------------------------------

/** A deck card, enough of it for the ladders (the name and the type line are what they read). */
function deckCard(name: string, types: string, manaCost: string): AnyCard {
  return {
    id: 0,
    name,
    setCode: 'MSH',
    manaCost,
    types,
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
  } as unknown as AnyCard;
}

const AGENT_13 = deckCard('Agent 13, Sharon Carter', 'Legendary Creature - Human Spy Hero', '{1}{W}');
const DOOMBOT = deckCard('Aerial Doombot', 'Artifact Creature - Robot Villain', '{2}{W}');

interface Beat {
  name: string;
  card: AnyCard;
  cue: string;
  suffix: string;
  /** The beat's peak — the first muzzle flash, the middle of the laser. */
  t: number;
  params: Record<string, CueParamValue>;
}

const BEATS: readonly Beat[] = [
  { name: 'Agent 13’s muzzle flash', card: AGENT_13, cue: 'attack.lunge', suffix: 'muzzle', t: 0.36, params: { muzzle: true } },
  { name: 'the Doombot’s eye', card: DOOMBOT, cue: 'attack.jet', suffix: 'eye', t: 0.5, params: { laser: true } },
  { name: 'the Doombot’s laser', card: DOOMBOT, cue: 'attack.jet', suffix: 'laser', t: 0.5, params: { laser: true } },
];

test('facing: yawToward is the short way round, and a figure turned by it faces the point', () => {
  for (const facing of [0, Math.PI, Math.PI / 2, -2.5]) {
    for (const [x, z] of [[0, -3], [2, 1], [-1, -0.2], [0.001, 4]] as const) {
      const turn = yawToward(facing, 0, 0, x, z);
      assert.ok(turn > -Math.PI - 1e-9 && turn <= Math.PI + 1e-9, `turn ${String(turn)} is not in (−π, π]`);
      const front: V3 = figurePointInto([0, 0, 0], 0, 0, 0, facing + turn, 1, 0, 0);
      const cosine = (front[0] * x + front[2] * z) / Math.hypot(x, z);
      assert.ok(cosine > 1 - 1e-9, `facing ${String(facing)} turned ${turn.toFixed(3)} does not face (${String(x)}, ${String(z)})`);
    }
  }
  assert.equal(yawToward(1, 2, 2, 2, 2), 0, 'a point on top of the figure asks for no turn');
});

test('facing: an attack turns its attacker to face the defender, fires the beat AT it, and turns back — both seats (second verification pass, D126)', () => {
  // Since D126 figures rest facing the OTHER seat, so an attack is a small turn
  // toward its defender. The facing they had before D126 — outward, toward their
  // own player — is the negative control: with no turn every one of these beats
  // fired out of the far side of the body, which the verifier photographed (g2@157,
  // g1@232 and g1@342). The turn is `Stage.yawTo` × the lunge's envelope.
  let outwardFires = 0;
  let cases = 0;
  for (const seat of SEATS) {
    const attacker = seat === 'you' ? 0 : 1;
    const defender = 1 - attacker;
    for (const beat of BEATS) {
      const card = onBattlefield(beat.card, 700, attacker);
      const state = twoSeatState(seat === 'you' ? [card] : [], seat === 'opp' ? [card] : []);
      const placed = layout(state, PRESENCE);
      const pose = posesOf(state).get(700);
      assert.ok(pose !== undefined && pose.modelId !== null, `${beat.name}: no figure`);
      assert.equal(pose.seat, seat);
      const target = anchorPosition(placed, { kind: 'player', id: defender });
      assert.ok(target !== null);

      const params = { ...beat.params, defenderKind: 'player', defenderId: defender };
      const ctx = { id: beat.cue, targets: [700], players: [attacker], params, ms: 800, key: 'k', reducedMotion: false };
      const stage = new SceneStage(placed);
      REGISTRY.get(beat.cue)!.apply(ctx, beat.t, stage);
      const offset = stage.offsetOf(700);
      const effect = stage.effects.get(`k:${beat.suffix}`);
      assert.ok(effect !== undefined && effect.at.kind === 'figure', `${beat.name} is not on the body`);
      const ref = effect.at as FigureRef;
      // The effect binding's own resolution (`#figurePoint`): the lunged body, its
      // facing plus the cue's turn.
      const h = pose.height * offset.scale;
      const centre: V3 = [pose.position[0] + offset.dx, pose.position[1] + offset.dy, pose.position[2] + offset.dz];
      const resolve = (turn: number): V3 =>
        figurePointInto([0, 0, 0], centre[0], centre[1], centre[2], pose.facingY + turn, (ref.fwd ?? 0) * h, ref.at * h, (ref.side ?? 0) * h);
      const toward = (point: V3): number => (point[0] - centre[0]) * (target[0] - centre[0]) + (point[2] - centre[2]) * (target[2] - centre[2]);

      assert.ok(
        Math.abs(offset.dRotY) < Math.PI / 2,
        `${seat}: ${beat.name} turns ${offset.dRotY.toFixed(3)} — a figure resting toward the other seat (D126) needs less than a quarter turn`,
      );
      assert.ok(Math.abs(offset.dRotY - figureYawTo(placed, 700, { kind: 'player', id: defender })) < 1e-9, 'the turn is not layout.ts’s');
      assert.ok(
        toward(resolve(offset.dRotY)) > 0,
        `${seat}: ${beat.name} fires from the far side of the body (${toward(resolve(offset.dRotY)).toFixed(4)})`,
      );
      // …and the body is turned to FACE it: its front within 10° of the line from
      // the LUNGED body (the turn is aimed from its stand point, and the lunge has
      // carried it most of a unit toward the lane since — 6° at most, measured).
      const front = resolve(offset.dRotY);
      const aim = figurePointInto([0, 0, 0], 0, 0, 0, pose.facingY + offset.dRotY, 1, 0, 0);
      const line = Math.hypot(target[0] - centre[0], target[2] - centre[2]);
      const cosine = (aim[0] * (target[0] - centre[0]) + aim[2] * (target[2] - centre[2])) / line;
      assert.ok(cosine > Math.cos((10 * Math.PI) / 180), `${seat}: ${beat.name}'s figure is ${(Math.acos(cosine) * 57.3).toFixed(1)}° off its defender`);
      assert.ok(front.every(Number.isFinite));
      // D126: at rest, with no turn at all, the figure already faces its defender's side.
      const rest = figurePointInto([0, 0, 0], 0, 0, 0, pose.facingY, 1, 0, 0);
      assert.ok(rest[0] * (target[0] - centre[0]) + rest[2] * (target[2] - centre[2]) > 0, `${seat}: ${beat.name}'s figure rests facing away from its defender`);
      // The control: the facing before D126 (outward, a half turn from this one)
      // with no turn — the defect D82 fixed — faces away, and a centre-line beat
      // (the eye, the laser) is on the far side of the body.
      const outward = figurePointInto([0, 0, 0], 0, 0, 0, pose.facingY + Math.PI, 1, 0, 0);
      if (outward[0] * (target[0] - centre[0]) + outward[2] * (target[2] - centre[2]) > 0) outwardFires += 1;
      if (ref.side === undefined || ref.side === 0) {
        const far = figurePointInto([0, 0, 0], centre[0], centre[1], centre[2], pose.facingY + Math.PI, (ref.fwd ?? 0) * h, ref.at * h, (ref.side ?? 0) * h);
        if (toward(far) > 0) outwardFires += 1;
      }
      cases += 1;

      // …and the turn decays to identity with the lunge: none at the start, none at the end.
      for (const edge of [0, 1]) {
        const at = new SceneStage(placed);
        REGISTRY.get(beat.cue)!.apply(ctx, edge, at);
        assert.ok(Math.abs(at.offsetOf(700).dRotY) < 1e-9, `${beat.cue} holds a turn at t = ${String(edge)}`);
      }
    }
  }
  assert.equal(cases, 6);
  // The negative control: facing outward with no turn, every attacker faces away
  // from its defender, and every centre-line beat is on the far side of its body.
  assert.equal(outwardFires, 0, 'an outward figure faced its defender with no turn — this test would not have caught the defect');
});

test('facing: every attack cue that lunges also turns, and the pure stage asks for no turn', () => {
  for (const id of ['attack.lunge', 'attack.jet', 'attack.aegis', 'attack.shrink']) {
    const stage = new NullStage();
    REGISTRY.get(id)!.apply({ id, targets: [1], players: [0, 1], params: {}, ms: 800, key: 'k', reducedMotion: false }, 0.5, stage);
    assert.equal(stage.offsets.get(1)?.dRotY, 0, `${id}: a NullStage has no geometry, so no turn`);
  }
  // With geometry, each of the four turns its attacker by the stage's own answer.
  // D126 put the figures facing the other seat, so the geometric turn toward a
  // player straight across can be ~0; a stage whose `yawTo` answers a fixed
  // angle tells "the cue applies the turn" apart from "the turn happens to be small".
  class FixedYawStage extends SceneStage {
    override yawTo(): number {
      return 1;
    }
  }
  const card = onBattlefield(AGENT_13, 700, 0);
  const state = twoSeatState([card], []);
  const placed = layout(state, PRESENCE);
  for (const id of ['attack.lunge', 'attack.jet', 'attack.aegis', 'attack.shrink']) {
    const stage = new FixedYawStage(placed);
    REGISTRY.get(id)!.apply(
      { id, targets: [700], players: [0], params: { defenderKind: 'player', defenderId: 1 }, ms: 800, key: 'k', reducedMotion: false },
      0.5,
      stage,
    );
    const turn = stage.offsetOf(700).dRotY;
    assert.ok(turn > 0.3 && turn <= 1 + 1e-9, `${id} does not turn its attacker by Stage.yawTo (${turn.toFixed(3)})`);
  }
});
