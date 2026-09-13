/*
 * mtg-table — web/test/camera.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The camera solver, as arithmetic** (report 09 §8, §10 — "camera solver unit
 * tests").
 *
 * `camera.ts` imports no three, no React and no DOM, so every one of §8's seven
 * rules is checkable here with plain numbers and an injected clock. That is the
 * whole reason the pose math lives outside `scene/`: an over-eager camera is the
 * fastest way to make a beautiful renderer unusable, and "we looked at it once
 * and it seemed fine" is not a guard against one.
 *
 * The anchors are the **real** ones out of `layout.ts` rather than invented
 * points, because rule 6 is a statement about this table and no other.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CAMERA,
  CameraDirector,
  DWELL,
  HAND_BAND,
  ORBIT_CLAMPS,
  REST_DISTANCE,
  REST_POSE,
  SHAKE,
  SNAP_HOME_MS,
  clampOrbit,
  framesSeat,
  lerpOrbit,
  moveEnvelope,
  orbitFromPose,
  poseFromOrbit,
  projectToNdc,
  shakeAt,
  solveFraming,
  type DirectorWorld,
  type Point3,
} from '../src/arena/camera.ts';
import type { AnchorRef, CameraRequest } from '../src/arena/cues/stage.ts';
import { TABLE_ANCHOR, anchorsFor } from '../src/arena/layout.ts';

const SEAT = anchorsFor('you');
const HAND: Point3 = [SEAT.hand.x, SEAT.hand.y, SEAT.hand.z];
const FIELD: Point3 = [SEAT.creatures.x, SEAT.creatures.y, SEAT.creatures.z];
const OPP_LANE: Point3 = [0, 0.01, -0.9];
const OPP_CREATURE: Point3 = [1.5, 0.01, -2.3];
const TABLE: Point3 = [TABLE_ANCHOR.x, TABLE_ANCHOR.y, TABLE_ANCHOR.z];
const ASPECT = 1920 / 1080;

function world(over: Partial<DirectorWorld> = {}): DirectorWorld {
  return {
    resolve: (ref: AnchorRef) =>
      ref.kind === 'table'
        ? [TABLE[0], TABLE[1], TABLE[2]]
        : ref.kind === 'combat'
          ? [OPP_LANE[0], OPP_LANE[1], OPP_LANE[2]]
          : ref.kind === 'card'
            ? [OPP_CREATURE[0], OPP_CREATURE[1], OPP_CREATURE[2]]
            : null,
    hand: HAND,
    battlefield: FIELD,
    aspect: ASPECT,
    awaitingHuman: false,
    mode: 'replay',
    reducedMotion: false,
    ...over,
  };
}

function request(over: Partial<CameraRequest> = {}): CameraRequest {
  return { frame: [{ kind: 'card', id: 1 }], padding: 1.4, tilt: 0.22, shake: 0, priority: 1, ms: 800, ...over };
}

// ---------------------------------------------------------------------------
// Orbit coordinates
// ---------------------------------------------------------------------------

test('camera: pose ⇄ orbit is a round trip, and the rest pose is inside §3.5’s box', () => {
  const orbit = orbitFromPose(REST_POSE);
  const back = poseFromOrbit(orbit);
  for (let i = 0; i < 3; i++) {
    assert.ok(Math.abs(back.position[i]! - REST_POSE.position[i]!) < 1e-9, `position[${String(i)}]`);
    assert.ok(Math.abs(back.target[i]! - REST_POSE.target[i]!) < 1e-9, `target[${String(i)}]`);
  }
  // If the rest pose were outside the clamps, the very first user drag would
  // jump the camera — which is the one thing `OrbitControls` cannot undo.
  assert.deepEqual(clampOrbit(orbit), orbit);
  assert.ok(orbit.distance > ORBIT_CLAMPS.minDistance && orbit.distance < ORBIT_CLAMPS.maxDistance);
  assert.ok(Math.abs(REST_DISTANCE - orbit.distance) < 1e-9);
});

test('camera: the clamps are §3.5’s, and they bite in both directions', () => {
  const far = clampOrbit({ azimuth: 3, polar: 0.01, distance: 999, target: [0, 0, 0] });
  assert.equal(far.azimuth, ORBIT_CLAMPS.maxAzimuthAngle);
  assert.equal(far.polar, ORBIT_CLAMPS.minPolarAngle);
  assert.equal(far.distance, ORBIT_CLAMPS.maxDistance);
  const near = clampOrbit({ azimuth: -3, polar: 3, distance: 0.1, target: [0, 0, 0] });
  assert.equal(near.azimuth, ORBIT_CLAMPS.minAzimuthAngle);
  assert.equal(near.polar, ORBIT_CLAMPS.maxPolarAngle);
  assert.equal(near.distance, ORBIT_CLAMPS.minDistance);
});

test('camera: lerpOrbit is a blend, and its ends are exact', () => {
  const a = orbitFromPose(REST_POSE);
  const b = clampOrbit({ azimuth: 0.2, polar: 1.1, distance: 10, target: [1, 2, 3] });
  assert.deepEqual(lerpOrbit(a, b, 0), a);
  assert.deepEqual(lerpOrbit(a, b, 1), b);
  // Out of range is clamped, not extrapolated: a blend that overshoots is a
  // camera that leaves the table.
  assert.deepEqual(lerpOrbit(a, b, 5), b);
  assert.deepEqual(lerpOrbit(a, b, -5), a);
});

// ---------------------------------------------------------------------------
// Projection and rule 6
// ---------------------------------------------------------------------------

test('camera: the rest pose really does frame the seat’s own hand, low', () => {
  const ndc = projectToNdc(REST_POSE, HAND, CAMERA.fov, ASPECT);
  assert.ok(ndc !== null, 'the hand is behind the rest camera');
  assert.ok(Math.abs(ndc[0]) < 0.2, `the hand is off to one side: x = ${String(ndc[0])}`);
  // §8's literal "lower 30%" holds HERE, which is the claim `HAND_BAND`'s note
  // makes when it relaxes the band for solved poses.
  assert.ok(ndc[1] < -0.4 && ndc[1] > -1, `the hand is at y = ${String(ndc[1])}`);
  assert.equal(framesSeat(REST_POSE, HAND, FIELD, CAMERA.fov, ASPECT), true);
});

test('camera: a pose that loses the hand is not framed, at any aspect', () => {
  // Behind the near plane: the classic way to lose it, and `projectToNdc` says
  // `null` rather than a number with the wrong sign.
  const behind = { position: [0, 2, -8] as [number, number, number], target: [0, 0, -12] as [number, number, number] };
  assert.equal(projectToNdc(behind, HAND, CAMERA.fov, ASPECT), null);
  assert.equal(framesSeat(behind, HAND, FIELD, CAMERA.fov, ASPECT), false);
  for (const aspect of [ASPECT, 4 / 3, 1]) {
    assert.equal(framesSeat(REST_POSE, HAND, FIELD, CAMERA.fov, aspect), true, `aspect ${String(aspect)}`);
  }
  // And the band is the one that is enforced, not a 30% one.
  assert.equal(HAND_BAND.max, 0);
});

// ---------------------------------------------------------------------------
// The solver (§8 rule 3 and rule 6)
// ---------------------------------------------------------------------------

test('camera: the solver frames what it is asked AND the seat, or returns null', () => {
  const home = orbitFromPose(REST_POSE);
  const opts = { aspect: ASPECT, hand: HAND, battlefield: FIELD };

  const swoop = solveFraming([OPP_CREATURE, OPP_LANE], home, { ...opts, padding: 1.4, tilt: 0.22 });
  assert.ok(swoop !== null, 'the attack swoop must be solvable — it is §8’s own camera cue');
  assert.equal(framesSeat(swoop, HAND, FIELD, CAMERA.fov, ASPECT), true);
  // It is a real move: lower than rest, and aimed toward the action.
  assert.ok(swoop.position[1] < REST_POSE.position[1], 'the swoop drops the camera');
  assert.ok(swoop.target[0] !== REST_POSE.target[0] || swoop.target[2] !== REST_POSE.target[2]);

  const pullBack = solveFraming([TABLE], home, { ...opts, padding: 3.4, tilt: 0.08 });
  assert.ok(pullBack !== null, 'the outcome pull-back must be solvable');
  assert.ok(
    pullBack.position[2] > REST_POSE.position[2],
    'a pull-back pulls back',
  );

  // Rule 3: the azimuth is HOME's. A cue may push in and tilt down; swinging
  // round the table is what makes a card game nauseating.
  for (const pose of [swoop, pullBack]) {
    assert.ok(Math.abs(orbitFromPose(pose).azimuth - home.azimuth) < 1e-9);
  }

  // Rule 6's teeth: something off the table cannot be framed without losing the
  // seat, and the move is DROPPED rather than corrected into a different shot.
  assert.equal(solveFraming([[40, 0, -40]], home, { ...opts, padding: 0.3, tilt: 0 }), null);
  assert.equal(solveFraming([], home, opts), null, 'nothing to frame is not a pose');
});

test('camera: the solved distance stays inside the orbit clamps', () => {
  const home = orbitFromPose(REST_POSE);
  for (const padding of [0, 0.5, 1.4, 3.4]) {
    const pose = solveFraming([OPP_LANE], home, {
      padding,
      tilt: 0,
      aspect: ASPECT,
      hand: HAND,
      battlefield: FIELD,
    });
    if (pose === null) continue;
    const d = orbitFromPose(pose).distance;
    assert.ok(
      d >= ORBIT_CLAMPS.minDistance - 1e-6 && d <= ORBIT_CLAMPS.maxDistance + 1e-6,
      `padding ${String(padding)}: distance ${String(d)} is outside the clamps`,
    );
  }
});

// ---------------------------------------------------------------------------
// The envelope and the shake (rules 1 and 7)
// ---------------------------------------------------------------------------

test('camera: every move’s envelope starts and ends at home', () => {
  assert.equal(moveEnvelope(0), 0);
  assert.equal(moveEnvelope(1), 0);
  assert.ok(moveEnvelope(0.5) > 0.99, 'it holds in the middle');
  // A cut is there on its first frame, and still eases home.
  assert.ok(moveEnvelope(0.02, true) > 0.9);
  assert.equal(moveEnvelope(1, true), 0);
});

test('camera: shake is bounded, decaying and over on time (§8 rule 7)', () => {
  for (let ms = 0; ms <= 400; ms += 7) {
    const [dx, dy, dz] = shakeAt(ms, SHAKE.maxAmplitude, SHAKE.maxMs);
    assert.ok(Math.abs(dx) <= SHAKE.maxAmplitude + 1e-9, `x at ${String(ms)} ms`);
    assert.equal(dy, 0, 'one axis PAIR: the camera never bobs vertically');
    assert.ok(Math.abs(dz) <= SHAKE.maxAmplitude + 1e-9, `z at ${String(ms)} ms`);
  }
  // A cue asking for ten times the cap gets the cap.
  const [big] = shakeAt(10, 10, SHAKE.maxMs);
  assert.ok(Math.abs(big) <= SHAKE.maxAmplitude);
  assert.deepEqual(shakeAt(SHAKE.maxMs, SHAKE.maxAmplitude, SHAKE.maxMs), [0, 0, 0]);
  assert.deepEqual(shakeAt(9999, SHAKE.maxAmplitude, SHAKE.maxMs), [0, 0, 0]);
});

// ---------------------------------------------------------------------------
// The director (rules 1, 2, 4, 5, and §3.5's user rule)
// ---------------------------------------------------------------------------

test('camera: one lane — a higher priority preempts, an equal one is DROPPED', () => {
  const director = new CameraDirector();
  assert.equal(director.request(request({ priority: 1 }), 0, world()), 'taken');
  assert.equal(director.request(request({ priority: 1 }), 10, world()), 'dropped');
  assert.equal(director.request(request({ priority: 0 }), 20, world()), 'dropped');
  assert.equal(director.request(request({ priority: 2 }), 30, world()), 'taken');
  // Dropped, not queued: nothing is waiting to play when the move ends.
  assert.equal(director.stats.dropped, 2);
  const done = director.tick(5000, { awaitingHuman: false, reducedMotion: false });
  assert.equal(done.holding, false);
  assert.equal(director.active, false);
  assert.deepEqual(done.pose, poseFromOrbit(director.home), 'the last frame of a move is HOME');
});

test('camera: the camera does not move while the engine waits on the human (rule 5)', () => {
  const director = new CameraDirector();
  assert.equal(director.request(request(), 0, world({ awaitingHuman: true })), 'dropped');
  assert.equal(director.active, false);

  // …and a move already running gets out of the way, fast.
  assert.equal(director.request(request({ ms: 1800 }), 0, world()), 'taken');
  assert.ok(director.tick(200, { awaitingHuman: false, reducedMotion: false }).holding);
  const retiring = director.tick(300, { awaitingHuman: true, reducedMotion: false });
  assert.ok(retiring.pose !== null);
  // It is home again within the snap window, not within the dwell limit.
  const home = poseFromOrbit(director.home);
  const after = director.tick(300 + SNAP_HOME_MS + 1, { awaitingHuman: true, reducedMotion: false });
  assert.deepEqual(after.pose, home);
  assert.equal(director.active, false);
});

test('camera: reduced motion drops every move, and every shake with it', () => {
  const director = new CameraDirector();
  assert.equal(director.request(request({ shake: 1 }), 0, world({ reducedMotion: true })), 'dropped');
  assert.equal(director.active, false);
  assert.deepEqual(director.tick(0), { pose: null, shake: [0, 0, 0], holding: false });
});

test('camera: a drag makes the user’s pose home, and holds the lane for 5 s (§3.5)', () => {
  const director = new CameraDirector();
  const theirs = { position: [2, 6, 7] as [number, number, number], target: [0, 0, 0] as [number, number, number] };
  director.noteUserInput(1000, theirs);
  assert.equal(director.userHolds(1000), true);
  assert.equal(director.request(request(), 1100, world()), 'dropped');
  assert.equal(director.request(request(), 1000 + DWELL.userOverrideMs - 1, world()), 'dropped');
  assert.equal(director.userHolds(1000 + DWELL.userOverrideMs), false);
  assert.equal(director.request(request(), 1000 + DWELL.userOverrideMs, world()), 'taken');

  // **Home is now THEIRS.** Returning to our own rest pose after they let go
  // would be the same as fighting them, five seconds later.
  const home = poseFromOrbit(director.home);
  const orbit = orbitFromPose(theirs);
  assert.deepEqual(home, poseFromOrbit(clampOrbit(orbit)));
});

test('camera: dwell is capped per mode (rule 4)', () => {
  const live = new CameraDirector();
  assert.equal(live.request(request({ ms: 5000 }), 0, world({ mode: 'live' })), 'taken');
  // Live: home again by 900 ms, whatever the cue asked for.
  assert.equal(live.tick(DWELL.liveMs + 1).holding, false);
  assert.equal(live.active, false);

  const replay = new CameraDirector();
  assert.equal(replay.request(request({ ms: 5000 }), 0, world({ mode: 'replay' })), 'taken');
  assert.equal(replay.tick(DWELL.liveMs + 1).holding, true, 'a replay may dwell longer');
  assert.equal(replay.tick(DWELL.replayMs + 1).holding, false);
});

test('camera: a shake-only request needs no frameable anchor, and moves nothing', () => {
  const director = new CameraDirector();
  const nowhere = world({ resolve: () => null });
  // `damage.lethal` asks for a jolt on a card that may not be in this frame at
  // all — §3.6 rule 1 — and that is still a legal request.
  assert.equal(director.request(request({ shake: 0.35, frame: [] }), 0, nowhere), 'taken');
  const frame = director.tick(30);
  assert.ok(frame.pose !== null);
  assert.deepEqual(frame.pose, poseFromOrbit(director.home), 'a shake does not re-aim');
  assert.ok(Math.hypot(...frame.shake) > 0);
  assert.ok(Math.hypot(...frame.shake) <= SHAKE.maxAmplitude * Math.SQRT2 + 1e-9);
  // With neither a shake nor an anchor there is nothing to do.
  assert.equal(director.request(request({ shake: 0, frame: [], priority: 9 }), 0, nowhere), 'dropped');
});

test('camera: releasing the lane and resetting both end at home', () => {
  const director = new CameraDirector();
  director.request(request({ ms: 1500 }), 0, world());
  assert.equal(director.active, true);
  // `turn.banner` hands the lane back: §8's "settle back to rest, no move".
  assert.equal(director.request(null, 100, world()), 'released');
  const after = director.tick(100 + SNAP_HOME_MS + 1);
  assert.deepEqual(after.pose, poseFromOrbit(director.home));

  director.request(request(), 0, world());
  director.reset();
  assert.equal(director.active, false);
  assert.deepEqual(director.tick(0), { pose: null, shake: [0, 0, 0], holding: false });
});
