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
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  BEAT_RANK,
  CAMERA,
  COOLDOWN_EXEMPT,
  CameraDirector,
  DIRECTOR,
  DWELL,
  HAND_BAND,
  LIVE_ASPECTS,
  ORBIT_CLAMPS,
  PLAYER_PLATES,
  REST_DISTANCE,
  REST_POSE,
  SHAKE,
  SNAP_HOME_MS,
  SPECTATOR_CLAMPS,
  SPECTATOR_DWELL,
  VIEWS,
  VIEW_BY_ID,
  VIEW_EASE_MS,
  VIEW_IDS,
  beatsOf,
  clampOrbit,
  clearOfHand,
  directShot,
  effectiveView,
  framesSeat,
  insideClamps,
  keepOutTop,
  keepsSeat,
  lerpOrbit,
  lookupFor,
  moveEnvelope,
  orbitFromPose,
  poseFromOrbit,
  projectToNdc,
  ranksUncovered,
  shakeAt,
  solveFraming,
  startShot,
  underRect,
  viewAvailable,
  viewForBeat,
  viewOrbit,
  visibleShare,
  visibleShareOnCanvas,
  type Beat,
  type CanvasChrome,
  type CornerRect,
  type DirectorWorld,
  type Orbit,
  type Point3,
  type Pose,
  type SeatGeometry,
  type Shot,
  type ViewId,
} from '../src/arena/camera.ts';
import { CueQueue } from '../src/arena/cues/queue.ts';
import { REGISTRY } from '../src/arena/cues/registry.ts';
import { NullStage, type AnchorRef, type CameraRequest } from '../src/arena/cues/stage.ts';
import { validateCues } from '../src/arena/cues/validate.ts';
import duelistsJson from '../src/arena/figures/duelists.json' with { type: 'json' };
import {
  duelistBox,
  duelistFacing,
  duelistHeight,
  duelistSamples,
  duelistStand,
  validateDuelists,
} from '../src/arena/figures/duelists.ts';
import {
  HUD_TOP_PX,
  TABLE_ANCHOR,
  anchorsFor,
  fanCorners,
  playerAnchorFor,
  seatRankLines,
  viewerIdOf,
} from '../src/arena/layout.ts';
import type { GameEvent, GameStateBody } from '../src/protocol.ts';
import { initialState, reduce } from '../src/reduce.ts';
import { BASE_FRAME_INTERVAL_MS, parseFrameLog } from '../src/transport/replay.ts';

const SEAT = anchorsFor('you');
const HAND: Point3 = [SEAT.hand.x, SEAT.hand.y, SEAT.hand.z];
const FIELD: Point3 = [SEAT.creatures.x, SEAT.creatures.y, SEAT.creatures.z];
/**
 * The seat as `keepsSeat` checks a view against it (T8 fix): the two anchors,
 * the widest hand fan as an occluder, and the seat's own two rank centre lines.
 */
const SEAT_GEOMETRY: SeatGeometry = {
  hand: HAND,
  battlefield: FIELD,
  fan: fanCorners(7, 'you'),
  ranks: seatRankLines('you'),
};
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

  // **`reset()` SNAPS home** (T8). It used to drop the move and hand the
  // controls back wherever the swoop had got to, which left `K` / a scrub with
  // the camera frozen mid-air — and the first `OrbitControls` update after that
  // made the mid-air pose the new home. Now the next tick writes home, once.
  director.request(request(), 0, world());
  assert.ok(director.tick(300).holding, 'the swoop is out');
  director.reset();
  const snapped = director.tick(301);
  assert.deepEqual(snapped, { pose: poseFromOrbit(director.home), shake: [0, 0, 0], holding: false });
  assert.equal(director.active, false);
  assert.deepEqual(director.tick(302), { pose: null, shake: [0, 0, 0], holding: false });
  // With nothing in flight, a reset is nothing at all.
  director.reset();
  assert.equal(director.active, false);
});

// ---------------------------------------------------------------------------
// T8 — the five views
// ---------------------------------------------------------------------------

const near = (a: readonly number[], b: readonly number[], eps = 1e-6): boolean =>
  a.every((v, i) => Math.abs(v - (b[i] ?? Number.NaN)) < eps);

function samePose(a: Pose | null, b: Pose, eps = 1e-6): boolean {
  return a !== null && near(a.position, b.position, eps) && near(a.target, b.target, eps);
}

const fmt = (ndc: [number, number] | null): string =>
  ndc === null ? 'behind' : `(${ndc[0].toFixed(2)}, ${ndc[1].toFixed(2)})`;

test('camera: five views, keys 1–5, distinct, each inside the box it is used under', () => {
  assert.deepEqual(VIEWS.map((view) => view.id), [...VIEW_IDS]);
  assert.deepEqual(VIEWS.map((view) => view.key), ['1', '2', '3', '4', '5']);
  // View 1 is report 09 §3.5's rest pose, untouched: T8 adds views, it does not
  // move the one every earlier measurement was taken from.
  assert.deepEqual(VIEW_BY_ID.table.pose, REST_POSE);
  for (let i = 0; i < VIEWS.length; i++) {
    const view = VIEWS[i]!;
    const orbit = orbitFromPose(view.pose);
    // Every view is inside the spectator's box (where all five are offered)…
    assert.ok(insideClamps(orbit, SPECTATOR_CLAMPS), `${view.id} is outside SPECTATOR_CLAMPS`);
    // …and a view a live seat may use is inside the SEAT's box — or the first
    // drag after choosing it would snap the camera somewhere else.
    if (view.seatSafe) assert.ok(insideClamps(orbit, ORBIT_CLAMPS), `${view.id} is outside ORBIT_CLAMPS`);
    // Clamping a view into its own box changes nothing.
    const box = view.seatSafe ? ORBIT_CLAMPS : SPECTATOR_CLAMPS;
    assert.ok(samePose(poseFromOrbit(clampOrbit(orbit, box)), view.pose, 1e-9), `${view.id} moves when clamped`);
    for (let j = i + 1; j < VIEWS.length; j++) {
      const other = VIEWS[j]!;
      assert.ok(
        distance3(view.pose.position, other.pose.position) > 1,
        `${view.id} and ${other.id} are the same shot`,
      );
    }
  }
});

function distance3(a: readonly number[], b: readonly number[]): number {
  return Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0), (a[2] ?? 0) - (b[2] ?? 0));
}

test('camera: seatSafe IS rule 6 — recomputed from the real anchors at every aspect', () => {
  const lines: string[] = [];
  for (const view of VIEWS) {
    assert.equal(
      view.seatSafe,
      keepsSeat(view.pose, SEAT_GEOMETRY),
      `${view.id}.seatSafe says ${String(view.seatSafe)} and the geometry says otherwise`,
    );
    const at16x9 = projectToNdc(view.pose, HAND, CAMERA.fov, ASPECT);
    const orbit = orbitFromPose(view.pose);
    lines.push(
      `  ${view.key} ${view.id.padEnd(11)} az ${((orbit.azimuth * 180) / Math.PI).toFixed(1).padStart(6)}° ` +
        `polar ${((orbit.polar * 180) / Math.PI).toFixed(1)}° d ${orbit.distance.toFixed(2)} ` +
        `hand@16:9 ${fmt(at16x9)} ${view.seatSafe ? 'SEAT' : 'spectator only'}`,
    );
    if (!view.seatSafe) continue;
    // The half of rule 6 with teeth, stated for each aspect: on screen, and
    // below the midline — the viewer's own hand is at the bottom of the frame.
    for (const aspect of LIVE_ASPECTS) {
      const ndc = projectToNdc(view.pose, HAND, CAMERA.fov, aspect);
      assert.ok(ndc !== null, `${view.id} @${aspect.toFixed(2)}: the hand is behind the camera`);
      assert.ok(Math.abs(ndc[0]) <= 1, `${view.id} @${aspect.toFixed(2)}: hand x ${ndc[0].toFixed(2)}`);
      assert.ok(ndc[1] >= -1 && ndc[1] <= 0, `${view.id} @${aspect.toFixed(2)}: hand y ${ndc[1].toFixed(2)}`);
      assert.equal(framesSeat(view.pose, HAND, FIELD, CAMERA.fov, aspect), true);
    }
  }
  for (const line of lines) console.log(line);
  // Three of the five are playable at a seat; the other two are what spectating is for.
  assert.deepEqual(
    VIEWS.filter((view) => view.seatSafe).map((view) => view.id),
    ['table', 'shoulder', 'low'],
  );
});

/**
 * **The verification pass's finding, as a test: a seat's view may not let its own
 * hand cover its own ranks** (T8 fix). `framesSeat` only asks whether the anchors
 * are on screen; slice 2's first shoulder and low poses passed it at every aspect
 * while the seven-card fan covered most of the land rank (a raycast grid over a
 * Plains: 20 of 103 samples hit the Plains from the shoulder, 8 of 109 from low).
 * Those two poses are kept here as the negative control — they must FAIL
 * `keepsSeat`, and fail it on the new term alone.
 */
test('camera: a seat view keeps its own ranks visible above its hand — the old poses do not', () => {
  const lines: string[] = [];
  /** Rank samples the fan covers at 16:9, one at a time (a single-point `ranksUncovered`). */
  const coveredSamples = (pose: Pose): number =>
    SEAT_GEOMETRY.ranks.filter((p) => !ranksUncovered(pose, SEAT_GEOMETRY.fan, [p], CAMERA.fov, ASPECT)).length;
  const before: Record<'shoulder' | 'low', Pose> = {
    shoulder: { position: [1.27, 4.27, 10.45], target: [-0.4, 0, 1] },
    low: { position: [2.98, 3.59, 10.36], target: [-0.8, 0.7, 1] },
  };
  for (const [id, pose] of Object.entries(before)) {
    for (const aspect of LIVE_ASPECTS) {
      assert.equal(framesSeat(pose, HAND, FIELD, CAMERA.fov, aspect), true, `old ${id} frames the seat`);
    }
    const covered = coveredSamples(pose);
    lines.push(`  old ${id.padEnd(9)} the hand covers ${String(covered)} rank samples at 16:9`);
    assert.ok(covered > 0);
    assert.equal(keepsSeat(pose, SEAT_GEOMETRY), false, `old ${id} passes keepsSeat — the occlusion term has no teeth`);
    assert.ok(
      LIVE_ASPECTS.every((aspect) => !ranksUncovered(pose, SEAT_GEOMETRY.fan, SEAT_GEOMETRY.ranks, CAMERA.fov, aspect)),
      `old ${id}: the hand should cover the land rank at every aspect`,
    );
  }
  for (const view of VIEWS.filter((v) => v.seatSafe)) {
    for (const aspect of LIVE_ASPECTS) {
      assert.ok(
        ranksUncovered(view.pose, SEAT_GEOMETRY.fan, SEAT_GEOMETRY.ranks, CAMERA.fov, aspect),
        `${view.id} @${aspect.toFixed(2)}: the hand covers the seat's own ranks`,
      );
    }
    // Printed: how many of the rank samples are on screen at 16:9, and how many
    // of the old pose's the hand covered.
    const shown = SEAT_GEOMETRY.ranks.filter((p) => {
      const ndc = projectToNdc(view.pose, p, CAMERA.fov, ASPECT);
      return ndc !== null && Math.abs(ndc[0]) <= 1 && Math.abs(ndc[1]) <= 1;
    }).length;
    lines.push(`  ${view.id.padEnd(9)} ${String(shown)} of ${String(SEAT_GEOMETRY.ranks.length)} rank samples on screen at 16:9, none behind the hand`);
  }
  for (const line of lines) console.log(line);
});

test('camera: the spectator-only views lose the hand, and say how', () => {
  // The opponent's shoulder puts your hand ABOVE the midline — at the far side
  // of the table from where you are looking — and outside the seat's box.
  const opp = projectToNdc(VIEW_BY_ID.oppShoulder.pose, HAND, CAMERA.fov, ASPECT);
  assert.ok(opp !== null && opp[1] > 0, `oppShoulder puts the hand at ${fmt(opp)}`);
  assert.ok(!insideClamps(orbitFromPose(VIEW_BY_ID.oppShoulder.pose), ORBIT_CLAMPS));
  // Side-on is outside the seat's box by 60° of azimuth and 2° of polar: the
  // hand is at the frame's edge, edge-on to the lens.
  const side = orbitFromPose(VIEW_BY_ID.side.pose);
  assert.ok(Math.abs(side.azimuth) > ORBIT_CLAMPS.maxAzimuthAngle + 1);
  assert.ok(side.polar > ORBIT_CLAMPS.maxPolarAngle);
});

test('camera: a seat gets the seat-safe views; a spectator gets all five and the director', () => {
  for (const view of VIEWS) {
    assert.equal(viewAvailable(view.id, false), view.seatSafe, view.id);
    assert.equal(viewAvailable(view.id, true), true, view.id);
    assert.equal(effectiveView(view.id, false), view.seatSafe ? view.id : 'table');
    assert.equal(effectiveView(view.id, true), view.id);
  }
  assert.equal(viewAvailable('director', false), false);
  assert.equal(viewAvailable('director', true), true);
  assert.equal(effectiveView('director', false), 'table');
});

/** A director with a view applied at t = 0 and the cut already landed. */
function directorOn(view: ViewId | 'director', spectator = false): CameraDirector {
  const director = new CameraDirector();
  director.applyView({ view, spectator, pressed: false, reducedMotion: false, now: 0 });
  // The very first application is a CUT — the page opens on the stored view.
  const first = director.tick(0);
  assert.equal(first.holding, false);
  return director;
}

test('camera: a chosen view becomes HOME — a cue swoop leaves from it and returns to it', () => {
  const director = directorOn('table');
  assert.equal(
    director.applyView({ view: 'shoulder', spectator: false, pressed: true, reducedMotion: false, now: 1000 }),
    'moved',
  );
  // An ease, not a cut, at a seat: part-way there at half time…
  const mid = director.tick(1000 + VIEW_EASE_MS.seat / 2);
  assert.ok(mid.holding && mid.pose !== null);
  assert.ok(!samePose(mid.pose, VIEW_BY_ID.shoulder.pose, 1e-3), 'a seat’s view change is an ease');
  // …and exactly there, released, at the end.
  const there = director.tick(1000 + VIEW_EASE_MS.seat + 1);
  assert.ok(samePose(there.pose, VIEW_BY_ID.shoulder.pose), 'the view did not arrive');
  assert.equal(there.holding, false);
  assert.ok(samePose(poseFromOrbit(director.home), VIEW_BY_ID.shoulder.pose), 'home is the view');

  // The attack swoop, from the shoulder: it goes out (away from the view)…
  const start = 3000;
  assert.equal(director.request(request({ ms: 800 }), start, world({ mode: 'live' })), 'taken');
  const out = director.tick(start + 400);
  assert.ok(out.holding && !samePose(out.pose, VIEW_BY_ID.shoulder.pose, 1e-3), 'the swoop moved');
  // …keeps the view's azimuth (rule 3: in and down, never round the table)…
  assert.ok(Math.abs(orbitFromPose(out.pose!).azimuth - viewOrbit('shoulder').azimuth) < 1e-9);
  // …and comes back to the SHOULDER, not to the table it was designed from.
  const back = director.tick(start + DWELL.liveMs + 1);
  assert.ok(samePose(back.pose, VIEW_BY_ID.shoulder.pose), 'the swoop did not return to the chosen view');
  assert.equal(back.holding, false);
});

test('camera: reduced motion — a view change is a CUT, no shake, and every view is still there', () => {
  const director = directorOn('table', true);
  for (const view of VIEWS) {
    assert.equal(
      director.applyView({ view: view.id, spectator: true, pressed: true, reducedMotion: true, now: 5000 }),
      view.id === 'table' ? 'none' : 'moved',
    );
    const frame = director.tick(5000);
    if (view.id === 'table') continue;
    // On the new view on the very first frame, and already released.
    assert.ok(samePose(frame.pose, view.pose), `${view.id} was not a cut`);
    assert.equal(frame.holding, false);
    assert.deepEqual(frame.shake, [0, 0, 0]);
  }
  // …and every cue move and every shake is still dropped (§8 rule 7).
  assert.equal(
    director.request(request({ shake: 1 }), 6000, world({ reducedMotion: true })),
    'dropped',
  );
});

test('camera: your free orbit is remembered per view, until you press that view again', () => {
  const director = directorOn('shoulder');
  const theirs: Pose = { position: [3, 5, 9], target: [0, 0, -0.2] };
  director.noteUserInput(100, theirs);
  const theirsHome = clampOrbit(orbitFromPose(theirs));
  assert.ok(director.hasFreeOrbit('shoulder'));

  // Away to the low angle and back: the shoulder is where they LEFT it.
  director.applyView({ view: 'low', spectator: false, pressed: true, reducedMotion: true, now: 200 });
  assert.ok(samePose(director.tick(200).pose, VIEW_BY_ID.low.pose));
  director.applyView({ view: 'shoulder', spectator: false, pressed: true, reducedMotion: true, now: 300 });
  assert.ok(samePose(director.tick(300).pose, poseFromOrbit(theirsHome)), 'the free orbit was forgotten');

  // Pressing the view you are on drops the orbit and goes back to the canonical shot…
  assert.equal(
    director.applyView({ view: 'shoulder', spectator: false, pressed: true, reducedMotion: true, now: 400 }),
    'reset',
  );
  assert.ok(samePose(director.tick(400).pose, VIEW_BY_ID.shoulder.pose));
  assert.equal(director.hasFreeOrbit('shoulder'), false);
  // …and pressing it again, with no orbit of your own, does nothing at all.
  assert.equal(
    director.applyView({ view: 'shoulder', spectator: false, pressed: true, reducedMotion: true, now: 500 }),
    'none',
  );
  // A re-render that re-derives the same choice is not a press.
  director.noteUserInput(600, theirs);
  assert.equal(
    director.applyView({ view: 'shoulder', spectator: false, pressed: false, reducedMotion: true, now: 700 }),
    'none',
  );
  assert.ok(director.hasFreeOrbit('shoulder'));
  // A spectator's orbit is kept apart from a seat's: the boxes differ.
  director.applyView({ view: 'shoulder', spectator: true, pressed: false, reducedMotion: true, now: 800 });
  assert.equal(director.hasFreeOrbit('shoulder'), false, 'the seat’s orbit leaked into the spectator box');
  assert.ok(samePose(director.tick(800).pose, VIEW_BY_ID.shoulder.pose));
});

test('camera: spectator mode — a wider box, slower longer moves, and no hand band', () => {
  assert.ok(SPECTATOR_CLAMPS.maxPolarAngle > ORBIT_CLAMPS.maxPolarAngle);
  assert.ok(SPECTATOR_CLAMPS.minPolarAngle < ORBIT_CLAMPS.minPolarAngle);
  assert.ok(SPECTATOR_CLAMPS.maxDistance > ORBIT_CLAMPS.maxDistance);
  assert.ok(SPECTATOR_CLAMPS.minDistance < ORBIT_CLAMPS.minDistance);
  assert.equal(SPECTATOR_CLAMPS.maxAzimuthAngle, Number.POSITIVE_INFINITY);
  assert.ok(SPECTATOR_DWELL.moveMs > DWELL.replayMs && SPECTATOR_DWELL.slow > 1);
  assert.ok(VIEW_EASE_MS.spectator > VIEW_EASE_MS.seat);

  // Something far off the table cannot be framed WITH the seat's hand (rule 6
  // drops it — asserted above), and a spectator has no hand to keep.
  const far: AnchorRef = { kind: 'card', id: 9 };
  const offTable = world({ resolve: (ref) => (ref.kind === 'card' ? [40, 0, -40] : null) });
  const seat = directorOn('table');
  assert.equal(seat.request(request({ frame: [far], padding: 0.3, tilt: 0 }), 0, offTable), 'dropped');
  const spectator = directorOn('table', true);
  assert.equal(spectator.request(request({ frame: [far], padding: 0.3, tilt: 0 }), 0, offTable), 'taken');

  // Slower and longer: an 800 ms cue holds past a replay's 1800 ms cap…
  const slow = directorOn('table', true);
  assert.equal(slow.request(request({ ms: 1600 }), 0, world()), 'taken');
  assert.ok(slow.tick(DWELL.replayMs + 1).holding, 'a spectator’s swoop is slower than a replay’s');
  // …but never past its own table's cap, and it still lands home.
  const end = slow.tick(SPECTATOR_DWELL.moveMs + 1);
  assert.equal(end.holding, false);
  assert.ok(samePose(end.pose, REST_POSE));
});

test('camera: a view the user chose is not a cue — rule 5, a release and a cue all leave it alone', () => {
  const director = directorOn('table');
  director.applyView({ view: 'low', spectator: false, pressed: true, reducedMotion: false, now: 0 });
  // The engine starts waiting on the human mid-move: a CUE would be retired,
  // the user's own choice is not (it is their input, like an orbit drag).
  const waiting = director.tick(VIEW_EASE_MS.seat / 2, { awaitingHuman: true, reducedMotion: false });
  assert.ok(waiting.holding);
  assert.equal(director.stats.retired, 0);
  assert.equal(director.request(null, 400, world()), 'released');
  assert.equal(director.request(request({ priority: 50 }), 410, world()), 'dropped');
  const there = director.tick(VIEW_EASE_MS.seat + 1, { awaitingHuman: true, reducedMotion: false });
  assert.ok(samePose(there.pose, VIEW_BY_ID.low.pose));
});

test('camera: a retiring move travels TO home, never back out', () => {
  // The old blend was `1 − ease(t)` over `current → home`: home on frame one,
  // then 200 ms drifting back OUT toward the swoop, then a jump home.
  const director = directorOn('table');
  director.request(request({ ms: 1800 }), 0, world());
  director.tick(600);
  const home = director.home;
  const gap = (pose: Pose | null): number => distance3(pose!.position, poseFromOrbit(home).position);
  const before = gap(director.tick(600).pose);
  let last = Number.POSITIVE_INFINITY;
  for (let t = 601; t <= 600 + SNAP_HOME_MS; t += 20) {
    const frame = director.tick(t, { awaitingHuman: true, reducedMotion: false });
    if (frame.pose === null) break;
    const d = gap(frame.pose);
    assert.ok(d <= last + 1e-9, `the retire moved AWAY from home at ${String(t)} ms`);
    assert.ok(d <= before + 1e-9);
    last = d;
  }
});

test('camera: lerpOrbit goes the short way round (a spectator can reach the far side)', () => {
  const a: Orbit = { azimuth: (22 * Math.PI) / 180, polar: 1, distance: 10, target: [0, 0, 0] };
  const b: Orbit = { azimuth: (-170 * Math.PI) / 180, polar: 1, distance: 10, target: [0, 0, 0] };
  const mid = lerpOrbit(a, b, 0.5);
  // 22° → −170° is 168° through +90°..+180°, not 192° through 0°..−90°.
  const midDeg = (mid.azimuth * 180) / Math.PI;
  assert.ok(Math.abs(midDeg - 106) < 1e-6, `mid azimuth ${midDeg.toFixed(2)}°`);
  const end = lerpOrbit(a, b, 1);
  assert.ok(Math.abs(Math.cos(end.azimuth) - Math.cos(b.azimuth)) < 1e-12);
  assert.ok(Math.abs(Math.sin(end.azimuth) - Math.sin(b.azimuth)) < 1e-12);
});

// ---------------------------------------------------------------------------
// T8 — the auto director, a pure function of (beats, shot, time)
// ---------------------------------------------------------------------------

test('camera: the shot list', () => {
  assert.equal(viewForBeat({ kind: 'combat', seat: 'you' }), 'side');
  assert.equal(viewForBeat({ kind: 'combat', seat: null }), 'side');
  assert.equal(viewForBeat({ kind: 'cast', seat: 'you' }), 'shoulder');
  assert.equal(viewForBeat({ kind: 'cast', seat: 'opp' }), 'oppShoulder');
  assert.equal(viewForBeat({ kind: 'strike', seat: 'opp' }), 'oppShoulder');
  assert.equal(viewForBeat({ kind: 'strike', seat: 'you' }), 'shoulder');
  assert.equal(viewForBeat({ kind: 'turn', seat: 'opp' }), 'table');
  assert.equal(viewForBeat({ kind: 'outcome', seat: null }), 'table');
  assert.ok(BEAT_RANK.outcome > BEAT_RANK.combat && BEAT_RANK.combat > BEAT_RANK.strike);
  assert.ok(BEAT_RANK.strike > BEAT_RANK.cast && BEAT_RANK.cast > BEAT_RANK.turn);
});

/**
 * Drive `directShot` over a list of `[time, beats]` and return every shot it
 * took, with its start time. The checker below holds the list to the rules.
 */
function film(script: ReadonlyArray<readonly [number, readonly Beat[]]>, userInputAt?: number): Shot[] {
  let shot = startShot(0);
  const shots: Shot[] = [shot];
  for (const [now, beats] of script) {
    const next = directShot(beats, shot, now, userInputAt === undefined ? {} : { userInputAt });
    if (next.view !== shot.view) shots.push(next);
    shot = next;
  }
  return shots;
}

/** The director's two promises, over a list of shots: minimum length, and the cooldown. */
function assertRules(shots: readonly Shot[], label: string): void {
  for (let i = 1; i < shots.length; i++) {
    const prev = shots[i - 1]!;
    const shot = shots[i]!;
    const length = shot.since - prev.since;
    assert.ok(
      length >= DIRECTOR.minShotMs,
      `${label}: ${prev.view} held ${String(length)} ms < ${String(DIRECTOR.minShotMs)} before ${shot.view}`,
    );
    const left = i >= 2 ? shots.slice(0, i - 1).reverse().find((s) => s.view === shot.view) : undefined;
    if (left !== undefined && !(shot.reason !== 'start' && COOLDOWN_EXEMPT.has(shot.reason))) {
      // When was that view last cut AWAY from? The shot after it started then.
      const idx = shots.indexOf(left);
      const leftAt = shots[idx + 1]!.since;
      assert.ok(
        shot.since - leftAt >= DIRECTOR.cooldownMs,
        `${label}: re-entered ${shot.view} ${String(shot.since - leftAt)} ms after leaving it`,
      );
    }
  }
}

const b = (kind: Beat['kind'], seat: Beat['seat'] = null): Beat => ({ kind, seat });

test('camera: directShot over a synthetic turn — cast, strike, combat, turn, outcome', () => {
  const shots = film([
    [1000, [b('turn', 'you')]], //                   already wide: no cut
    [3000, [b('cast', 'opp')]], //                   → their shoulder
    [4600, [b('strike', 'you')]], //                 the reverse shot, but 1.6 s in: held…
    [5000, []],
    [5500, []], //                                   …and taken once the shot has run
    [6000, [b('combat', 'you')]], //                 attackers: held (0.5 s into the strike)
    [6400, [b('combat', 'opp')]], //                 blockers: still held, still pending
    [8000, [b('combat', null)]], //                  damage: the shot has run → side-on
    [9000, [b('turn', 'opp')]], //                   held (1 s into combat)…
    [10200, []], //                                  …still held, still fresh…
    [10800, []], //                                  …and stale (1.8 s > 1.6 s): dropped, no cut
    [12000, [b('cast', 'you')]], //                  shoulder was left at 8000: 4 s < 4.8 s — cooling
    [13000, []], //                                  5 s since, and the beat is 1 s old: cut
    [14500, [b('outcome', null)]], //                held (1.5 s in)…
    [15500, []], //                                  …and taken at 2.5 s
  ]);
  assert.deepEqual(
    shots.map((shot) => `${String(shot.since)}:${shot.view}:${shot.reason}`),
    [
      '0:table:start',
      '3000:oppShoulder:cast',
      '5500:shoulder:strike',
      '8000:side:combat',
      '13000:shoulder:cast',
      '15500:table:outcome',
    ],
  );
  assertRules(shots, 'synthetic');
});

test('camera: a fight and the finish are the shots the cooldown does not stop', () => {
  assert.deepEqual([...COOLDOWN_EXEMPT].sort(), ['combat', 'outcome']);
  const shots = film([
    [3000, [b('combat', null)]], //   table → side, leaving table at 3000
    [5500, [b('outcome', null)]], //  back to table 2.5 s later: < cooldown, and taken anyway
  ]);
  assert.deepEqual(shots.map((shot) => shot.view), ['table', 'side', 'table']);
  // A turn would have been held by the same cooldown…
  const turn = film([
    [3000, [b('combat', null)]],
    [5500, [b('turn', 'you')]],
  ]);
  assert.deepEqual(turn.map((shot) => shot.view), ['table', 'side']);
  // …and a second combat is NOT: measured on g1.jsonl 322–347, a turn's second
  // fight was shot from the caster's shoulder because side-on had been left
  // 2.4 s before. A cutaway and back is film grammar; missing the fight is not.
  const second = film([
    [3000, [b('combat', null)]], //   → side
    [5500, [b('cast', 'you')]], //    → shoulder (a cutaway)
    [8000, [b('combat', 'opp')]], //  → side again, 2.5 s after leaving it
  ]);
  assert.deepEqual(second.map((shot) => shot.view), ['table', 'side', 'shoulder', 'side']);
  assertRules(second, 'second combat');
});

test('camera: the director never fights a user orbit for more than the override window', () => {
  const current = startShot(0);
  // Inside the window: nothing cuts, and nothing is queued to cut later.
  const held = directShot([b('combat')], current, 5000, { userInputAt: 4000 });
  assert.equal(held.view, 'table');
  assert.equal(held.pending, null);
  const still = directShot([b('combat')], current, 4000 + DIRECTOR.userOverrideMs - 1, { userInputAt: 4000 });
  assert.equal(still.view, 'table');
  // The window closes, and the next beat is the director's again.
  const after = directShot([b('combat')], current, 4000 + DIRECTOR.userOverrideMs, { userInputAt: 4000 });
  assert.equal(after.view, 'side');
  // Nothing changed → the same object: the caller can tell a hold from a cut.
  assert.equal(directShot([], current, 9000), current);
  assert.equal(directShot([b('turn')], current, 9000), current);
});

test('camera: the director class cuts (never eases) and backs off a drag', () => {
  const director = directorOn('director', true);
  assert.equal(director.view, 'director');
  assert.equal(director.shot?.view, 'table');
  // A cast by the opponent, 3 s in: a CUT — on the new shot in the first frame.
  assert.equal(director.direct([b('cast', 'opp')], 3000), true);
  const cut = director.tick(3000);
  assert.ok(samePose(cut.pose, VIEW_BY_ID.oppShoulder.pose), 'the director eased instead of cutting');
  assert.equal(cut.holding, false);
  // The user drags: the director holds for exactly the override window.
  director.noteUserInput(4000, { position: [2, 6, -9], target: [0, 0, 0] });
  assert.equal(director.direct([b('combat')], 7000), false);
  assert.equal(director.direct([b('combat')], 4000 + DWELL.userOverrideMs), true);
  assert.equal(director.shot?.view, 'side');
  assert.equal(director.stats.cuts, 2);
  // Not in director mode, beats are ignored.
  const plain = directorOn('shoulder', true);
  assert.equal(plain.direct([b('combat')], 9000), false);
});

// ---------------------------------------------------------------------------
// T8 — the auto director over the whole corpus
// ---------------------------------------------------------------------------

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));

function fixtureFiles(): string[] {
  const out: string[] = [];
  for (const dir of ['games/', 'synthetic/']) {
    for (const name of readdirSync(FIXTURES + dir).sort()) {
      if (name.endsWith('.jsonl')) out.push(dir + name);
    }
  }
  return out;
}

/** Every `state` frame of a recording: its events, its board, the board before it, the viewer. */
function batchesOf(file: string): Array<{ events: GameEvent[]; board: GameStateBody | null; previous: GameStateBody | null; viewer: number | null }> {
  const log = parseFrameLog(readFileSync(FIXTURES + file, 'utf8'));
  let state = initialState(log.header);
  let previous: GameStateBody | null = null;
  const out: Array<{ events: GameEvent[]; board: GameStateBody | null; previous: GameStateBody | null; viewer: number | null }> = [];
  for (const frame of log.frames) {
    state = reduce(state, frame);
    if (frame.type !== 'state') continue;
    out.push({ events: state.events, board: state.board, previous, viewer: viewerIdOf(state) });
    previous = state.board;
  }
  return out;
}

test('camera: the auto director over every batch in the corpus — shot lengths and cooldown hold', () => {
  const files = fixtureFiles();
  assert.ok(files.length >= 10, `expected the corpus, saw ${String(files.length)} files`);
  const byView = new Map<string, number>();
  const byReason = new Map<string, number>();
  let batches = 0;
  let beats = 0;
  let cuts = 0;
  // Two paces: a replay at 1× (400 ms a frame) and at 4× — the faster one is
  // the one that leans on the minimum shot length and the cooldown hardest.
  for (const pace of [BASE_FRAME_INTERVAL_MS, BASE_FRAME_INTERVAL_MS / 4]) {
    for (const file of files) {
      let shot = startShot(0);
      const shots: Shot[] = [shot];
      batchesOf(file).forEach((batch, index) => {
        const now = (index + 1) * pace;
        const found = beatsOf(batch.events, lookupFor(batch.board, batch.previous, batch.viewer));
        batches += 1;
        beats += found.length;
        const next = directShot(found, shot, now);
        if (next.view !== shot.view) {
          shots.push(next);
          if (pace === BASE_FRAME_INTERVAL_MS) {
            byView.set(next.view, (byView.get(next.view) ?? 0) + 1);
            byReason.set(next.reason, (byReason.get(next.reason) ?? 0) + 1);
          }
        }
        shot = next;
      });
      cuts += shots.length - 1;
      assertRules(shots, `${file} @${String(pace)} ms/frame`);
    }
  }
  console.log(
    `  director: ${String(batches)} batches, ${String(beats)} beats, ${String(cuts)} cuts (both paces); ` +
      `at 1×, by view ${JSON.stringify(Object.fromEntries(byView))}, by beat ${JSON.stringify(Object.fromEntries(byReason))}`,
  );
  // It is not inert: over the corpus it uses every view it has a rule for.
  for (const view of ['table', 'shoulder', 'oppShoulder', 'side'] as const) {
    assert.ok((byView.get(view) ?? 0) > 0, `the director never cut to ${view}`);
  }
  assert.ok((byReason.get('combat') ?? 0) > 0 && (byReason.get('cast') ?? 0) > 0);
});

test('camera: beatsOf reads public facts only — seats, never names', () => {
  // A strike at a card: the target's controller decides the side.
  const board = {
    players: [],
    stack: [],
    stackCards: [],
  } as unknown as GameStateBody;
  const lookup = {
    seatOfPlayer: (id: number) => (id === 0 ? ('you' as const) : ('opp' as const)),
    seatOfCard: (id: number) => (id === 7 ? ('opp' as const) : null),
    strikeSeat: (id: number) => (id === 40 ? ('you' as const) : null),
  };
  const events = [
    { kind: 'cast', stackId: 1, cardId: 40, controller: 1, text: '' },
    { kind: 'resolved', cardId: 40, fizzled: false },
    { kind: 'resolved', cardId: 7, fizzled: false },
    { kind: 'damage', target: { kind: 'card', id: 7 }, sourceCardId: 1, amount: 2, combat: false, damageType: null },
    { kind: 'damage', target: { kind: 'player', id: 0 }, sourceCardId: 1, amount: 2, combat: true, damageType: null },
    { kind: 'attackers', player: 1, bands: [] },
    { kind: 'turn', player: 0, turn: 3 },
    { kind: 'tap', cardId: 7, tapped: true },
    { kind: 'outcome', winner: null, lastTurn: 9 },
  ] as unknown as GameEvent[];
  assert.deepEqual(beatsOf(events, lookup), [
    b('cast', 'opp'),
    b('strike', 'you'),
    b('cast', 'opp'),
    b('strike', 'opp'),
    b('combat', null),
    b('combat', 'opp'),
    b('turn', 'you'),
    b('outcome', null),
  ]);
  // The real lookup on an empty board knows no card, and says so rather than guessing.
  const real = lookupFor(board, null, 0);
  assert.equal(real.seatOfCard(7), null);
  assert.equal(real.strikeSeat(40), null);
  assert.equal(real.seatOfPlayer(0), 'you');
  assert.equal(real.seatOfPlayer(1), 'opp');
});

// ---------------------------------------------------------------------------
// T13 — the duelists against the seat-safe views (Tier 2 slice 4)
// ---------------------------------------------------------------------------

/**
 * The two canvases the chrome's keep-out band is checked on — a 1280 × 800 and a
 * 1600 × 1000 window, each less the app's 54 px header (as `figure-pose.test.ts`
 * checks the carriers) — and the aspects people play at. A square window and a
 * 4:3 one are printed, and 4:3 is held to the lower bar; 1:1 is not a table the
 * right-hand side of which fits, and the test says so rather than pretending.
 */
const CANVASES = [745, 946] as const;
/**
 * **The chrome as `camera.ts` models it** (slice-4 follow-up 3): the top band
 * (`HUD_TOP_PX`) and both seat plates (`PLAYER_PLATES`). Every duelist share
 * below is computed against all three.
 */
const CHROME: CanvasChrome = { topPx: HUD_TOP_PX, rects: [PLAYER_PLATES.opp, PLAYER_PLATES.you] };
const canvasOf = (height: number, aspect: number): { width: number; height: number } => ({
  width: height * aspect,
  height,
});
const pct = (share: number): string => `${(share * 100).toFixed(0)}%`;
const DUELISTS = validateDuelists(duelistsJson).data;
const heightOf = (seat: 'you' | 'opp'): number => {
  const id = DUELISTS.seats[seat];
  return duelistHeight(id === undefined ? null : (DUELISTS.looks[id] ?? null));
};

test('camera: your duelist is never behind your hand — every seat-safe view, every aspect (T13)', () => {
  const fan = fanCorners(7, 'you');
  const height = heightOf('you');
  const box = duelistBox('you', height);
  const lines: string[] = [];
  for (const view of VIEWS.filter((v) => v.seatSafe)) {
    for (const aspect of LIVE_ASPECTS) {
      assert.ok(
        clearOfHand(view.pose, box, fan, CAMERA.fov, aspect),
        `${view.id} @${aspect.toFixed(2)}: a card of a seven-card hand overlaps your duelist on screen`,
      );
    }
    // Printed: how much of your own duelist each seat view shows at 16:9 (it may
    // leave the frame — it is decoration and never in the solver's required set).
    const shown = visibleShareOnCanvas(view.pose, duelistSamples('you', height), canvasOf(946, ASPECT), CHROME);
    lines.push(`  ${view.id.padEnd(9)} your duelist clear of the hand at every aspect; ${(shown * 100).toFixed(0)}% on screen at 16:9`);
  }
  // It covers none of your own ranks either: the land and creature lines a seat
  // taps and targets on stay out of its silhouette in every seat view.
  const ranks = seatRankLines('you');
  for (const view of VIEWS.filter((v) => v.seatSafe)) {
    for (const aspect of LIVE_ASPECTS) {
      assert.ok(
        ranks.every((point) => clearOfHand(view.pose, box, [[point, point, point]], CAMERA.fov, aspect)),
        `${view.id} @${aspect.toFixed(2)}: your duelist covers your own ranks`,
      );
    }
  }
  // **The negative control: slice 1's bust anchor** (the HUD anchor, set back
  // 0.55). A body standing there puts its legs over the hand's leftmost card from
  // the shoulder and low views — which is why the duelist moved.
  const anchor = playerAnchorFor('you');
  const old = duelistBox('you', height, [anchor.x, 0, anchor.z + 0.55], duelistFacing('you'));
  const failures = VIEWS.filter((v) => v.seatSafe).flatMap((view) =>
    LIVE_ASPECTS.filter((aspect) => !clearOfHand(view.pose, old, fan, CAMERA.fov, aspect)).map(
      (aspect) => `${view.id}@${aspect.toFixed(2)}`,
    ),
  );
  lines.push(`  slice 1's bust anchor: behind the hand at ${String(failures.length)} of 18 (view, aspect) pairs — ${failures.join(' ')}`);
  for (const line of lines) console.log(line);
  assert.ok(failures.length > 0, 'the bust anchor passes clearOfHand — the check has no teeth');
});

test('camera: the opponent’s duelist is on screen and out from under the chrome — every seat-safe view (T13)', () => {
  const height = heightOf('opp');
  const samples = duelistSamples('opp', height);
  const lines: string[] = [];
  let worstPlay = 1;
  let worst43 = 1;
  // How much more the plates hide than the band alone, at worst (printed below).
  let platesHid = 0;
  for (const view of VIEWS.filter((v) => v.seatSafe)) {
    const row: string[] = [];
    for (const canvas of CANVASES) {
      const band = keepOutTop(HUD_TOP_PX, canvas);
      for (const aspect of LIVE_ASPECTS) {
        const share = visibleShareOnCanvas(view.pose, samples, canvasOf(canvas, aspect), CHROME);
        platesHid = Math.max(platesHid, visibleShare(view.pose, samples, band, CAMERA.fov, aspect) - share);
        row.push(`${(share * 100).toFixed(0).padStart(3)}`);
        if (aspect >= 1.6) {
          worstPlay = Math.min(worstPlay, share);
          assert.ok(
            share >= (canvas === 946 ? 0.9 : 0.7),
            `${view.id} @${aspect.toFixed(2)} on a ${String(canvas)} px canvas: ${(share * 100).toFixed(0)}% of the opponent's duelist is visible`,
          );
        } else if (aspect > 1.2) {
          worst43 = Math.min(worst43, share);
          assert.ok(share >= 0.7, `${view.id} @4:3 on ${String(canvas)} px: ${(share * 100).toFixed(0)}% visible`);
        }
      }
    }
    lines.push(`  ${view.id.padEnd(9)} % visible, 745 px | 946 px, at ${LIVE_ASPECTS.map((a) => a.toFixed(2)).join(' ')}: ${row.slice(0, 6).join(' ')} | ${row.slice(6).join(' ')}`);
  }
  // The spectator views see it too (asserted where it matters, printed here).
  for (const view of VIEWS.filter((v) => !v.seatSafe)) {
    const share = visibleShareOnCanvas(view.pose, samples, canvasOf(946, ASPECT), CHROME);
    lines.push(`  ${view.id.padEnd(9)} (spectator) ${(share * 100).toFixed(0)}% visible at 16:9, 946 px`);
  }
  // It covers none of the opponent's own ranks from the table view.
  const oppRanks = seatRankLines('opp');
  const box = duelistBox('opp', height);
  for (const aspect of LIVE_ASPECTS) {
    assert.ok(
      oppRanks.every((point) => clearOfHand(REST_POSE, box, [[point, point, point]], CAMERA.fov, aspect)),
      `table @${aspect.toFixed(2)}: the opponent's duelist covers the opponent's own ranks`,
    );
  }
  // **The negative control: slice 1's bust anchor**, behind the opponent's hand.
  // From the table view the whole of a body standing there is under the chrome.
  const anchor = playerAnchorFor('opp');
  const oldSamples = duelistSamples('opp', height, [anchor.x, 0, anchor.z - 0.55], duelistFacing('opp'));
  const oldShare = visibleShareOnCanvas(REST_POSE, oldSamples, canvasOf(946, ASPECT), CHROME);
  lines.push(
    `  worst at 16:10 and wider ${(worstPlay * 100).toFixed(0)}%, at 4:3 ${(worst43 * 100).toFixed(0)}% · ` +
      `slice 1's bust anchor from the table view: ${(oldShare * 100).toFixed(0)}% visible · stands ${JSON.stringify(duelistStand('you'))} / ${JSON.stringify(duelistStand('opp'))}`,
    `  the seat plates hide ${pct(platesHid)} more than the ${String(HUD_TOP_PX)}-px band at worst: the opponent's ends ` +
      `${(PLAYER_PLATES.opp.insetY + PLAYER_PLATES.opp.height).toFixed(1)} px below the canvas top`,
  );
  for (const line of lines) console.log(line);
  assert.ok(oldShare < 0.2, `the bust anchor is ${(oldShare * 100).toFixed(0)}% visible — the check has no teeth`);
});

/**
 * **The seat plates are keep-outs, and their rectangles are the stylesheet's**
 * (slice-4 follow-up 3). The anchors, the width and the plate's box come out of
 * `styles.css`. The rows are its fonts at `body`'s line height, except life and
 * the mana pips, whose height is a glyph box and was measured. Change the
 * plate's CSS and this fails until `PLAYER_PLATES` is measured again.
 *
 * **And the opponent's plate never leaves the top band** (the hardening pass's
 * rebase onto match setup). That is asserted, not printed: every row of the
 * plate is ONE line by the stylesheet — the name ellipsised, the opponent's name
 * row unwrappable, the deck, the profile and any player counters on the life
 * row — so its height is the four rows above whatever the frame says, and it
 * ends inside `HUD_TOP_PX`. `arena-hud.test.tsx` holds the markup to those four
 * rows. The negative control: the plates this replaces (a wrapped name row, and
 * match setup's deck line of its own) each hide enough of the opponent's
 * duelist to fail the duelist test's own threshold.
 */
test('camera: the seat plates are keep-outs — held to styles.css, and a point under one counts as hidden (slice-4 follow-up 3)', () => {
  const css = readFileSync(fileURLToPath(new URL('../src/styles.css', import.meta.url)), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  const rule = (selector: string): Record<string, string> => {
    const at = css.indexOf(`\n${selector} {`);
    assert.ok(at >= 0, `styles.css has no top-level ${selector} rule`);
    const body = css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
    const out: Record<string, string> = {};
    for (const declaration of body.split(';')) {
      const colon = declaration.indexOf(':');
      if (colon > 0) out[declaration.slice(0, colon).trim()] = declaration.slice(colon + 1).trim();
    }
    return out;
  };
  const px = (value: string | undefined): number => {
    const m = /^([\d.]+)(rem|px)$/.exec(value ?? '');
    assert.ok(m !== null, `not a length in rem or px: ${String(value)}`);
    return Number(m[1]) * (m[2] === 'rem' ? 16 : 1);
  };
  const seats = rule('.arena__seats');
  const plate = rule('.arena__seat');
  const who = rule('.arena__seat-who');
  const tags = rule('.arena__seat-tags');
  const zones = rule('.arena__seat-zones');
  for (const [name, r] of [['.arena__seat', plate], ['.arena__seat-who', who], ['.arena__seat-tags', tags], ['.arena__seat-zones', zones]] as const) {
    assert.equal(r['line-height'], undefined, `${name} sets its own line-height; the rows below assume body's`);
  }
  const font = /^(\d+)px\/([\d.]+)\s/.exec(rule('body')['font'] ?? '');
  assert.ok(font !== null, 'body is no longer `font: <px>/<line-height> …`');
  const [uiPx, lineHeight] = [Number(font[1]), Number(font[2])];
  const [insetTop, insetBottom] = (seats['inset-block'] ?? '').split(/\s+/).map(px);
  const insetRight = px(seats['inset-inline-end']);
  const width = px(plate['max-inline-size']);
  const padBlock = px((plate['padding'] ?? '').split(/\s+/)[0]);
  const border = px((plate['border'] ?? '').split(/\s+/)[0]);
  const gap = px(plate['gap']);
  /** Measured in Chromium on `g1`@355, identical at 1600 × 1000 and 1024 × 768. */
  const LIFE_ROW = 21.8;
  const POOL_ROW = 14.0;
  const nameRow = uiPx * lineHeight;
  const rows = [nameRow, LIFE_ROW, px(zones['font-size']) * lineHeight, POOL_ROW];
  const oneLine = 2 * padBlock + 2 * border + (rows.length - 1) * gap + rows.reduce((a, b) => a + b, 0);
  // The name row wrapped: the name, `.arena__seat-who`'s row gap, then the tags.
  const wrapped = oneLine - nameRow + (nameRow + px(who['gap']) + px(tags['font-size']) * lineHeight);
  const expectRect = (got: CornerRect, want: CornerRect, label: string): void => {
    assert.equal(got.corner, want.corner, `${label}.corner`);
    for (const key of ['insetX', 'insetY', 'width', 'height'] as const) {
      assert.ok(
        Math.abs(got[key] - want[key]) < 1e-6,
        `${label}.${key} is ${String(got[key])}; styles.css and the measured rows say ${want[key].toFixed(2)}`,
      );
    }
  };
  expectRect(PLAYER_PLATES.opp, { corner: 'top-right', insetX: insetRight, insetY: insetTop!, width, height: oneLine }, 'PLAYER_PLATES.opp');
  expectRect(PLAYER_PLATES.you, { corner: 'bottom-right', insetX: insetRight, insetY: insetBottom!, width, height: wrapped }, 'PLAYER_PLATES.you');

  // **Every row is one line, so the height above is a bound and not a sample.**
  // A long `--ai-name` is ellipsised, never wrapped; the opponent's name row
  // cannot wrap its tags under the name; the deck name and the profile give way
  // on the life row; and nothing on the life row, the zone counts or the pips can
  // wrap. Take any of these away and a frame can grow the plate past the band.
  const oneLineRules: ReadonlyArray<readonly [string, Record<string, string>]> = [
    ['.arena__seat-name', { 'white-space': 'nowrap', overflow: 'hidden', 'text-overflow': 'ellipsis', 'min-inline-size': '0' }],
    ['.arena__seat--opp .arena__seat-who', { 'flex-wrap': 'nowrap' }],
    ['.arena__seat-tags', { 'white-space': 'nowrap', flex: 'none' }],
    ['.arena__seat-vitals', { 'flex-wrap': 'nowrap' }],
    ['.arena__seat-deck', { 'white-space': 'nowrap', overflow: 'hidden', 'text-overflow': 'ellipsis', 'min-inline-size': '0' }],
    ['.arena__seat-profile', { 'white-space': 'nowrap', overflow: 'hidden', 'text-overflow': 'ellipsis', 'min-inline-size': '0' }],
    ['.arena__seat-counters', { 'flex-wrap': 'nowrap' }],
  ];
  for (const [selector, want] of oneLineRules) {
    const got = rule(selector);
    for (const [property, value] of Object.entries(want)) {
      assert.equal(got[property], value, `${selector} { ${property} } is ${String(got[property])}: a plate row that can wrap can grow the plate past the band`);
    }
  }
  for (const [selector, r] of [['.arena__seat-zones', zones], ['.pool', rule('.pool')]] as const) {
    assert.notEqual(r['flex-wrap'], 'wrap', `${selector} wraps: a plate row that can wrap can grow the plate past the band`);
  }
  assert.ok(
    PLAYER_PLATES.opp.insetY + PLAYER_PLATES.opp.height <= HUD_TOP_PX,
    `the opponent's plate ends ${(PLAYER_PLATES.opp.insetY + PLAYER_PLATES.opp.height).toFixed(1)} px down, below the ${String(HUD_TOP_PX)}-px band`,
  );

  // `underRect`, pixel by pixel, on a 1600 × 946 canvas.
  const W = 1600;
  const H = 946;
  const at = (x: number, y: number): [number, number] => [(2 * x) / W - 1, 1 - (2 * y) / H];
  const opp = PLAYER_PLATES.opp;
  const oppLeft = W - opp.insetX - opp.width;
  assert.ok(underRect(at(oppLeft + opp.width / 2, opp.insetY + opp.height / 2), opp, W, H), 'the centre of the opponent’s plate is not under it');
  assert.ok(!underRect(at(oppLeft - 1, opp.insetY + 10), opp, W, H), 'a pixel left of the opponent’s plate is under it');
  assert.ok(!underRect(at(oppLeft + 10, opp.insetY + opp.height + 1), opp, W, H), 'a pixel below the opponent’s plate is under it');
  assert.ok(!underRect(at(oppLeft + 10, opp.insetY - 1), opp, W, H), 'a pixel above the opponent’s plate is under it');
  const you = PLAYER_PLATES.you;
  const youTop = H - you.insetY - you.height;
  assert.ok(underRect(at(W - you.insetX - 1, H - you.insetY - 1), you, W, H), 'the corner of your plate is not under it');
  assert.ok(!underRect(at(W - you.insetX - 10, youTop - 1), you, W, H), 'a pixel above your plate is under it');
  assert.ok(!underRect(at(W - you.insetX + 1, H - 20), you, W, H), 'a pixel right of your plate is under it');

  // **The negative control: the verifier's sighting.** On a 1024 × 768 window (a
  // 1024 × 714 canvas) in the shoulder view, the opponent's helm is under its
  // plate. With the band taken away, the plate alone must hide exactly the
  // samples that project under it.
  const shoulder = VIEW_BY_ID.shoulder;
  const verifier = { width: 1024, height: 714 };
  const samples = duelistSamples('opp', heightOf('opp'));
  const under = samples.filter((point) => {
    const ndc = projectToNdc(shoulder.pose, point, CAMERA.fov, verifier.width / verifier.height);
    return ndc !== null && underRect(ndc, opp, verifier.width, verifier.height);
  });
  const bare = visibleShareOnCanvas(shoulder.pose, samples, verifier, { topPx: 0, rects: [] });
  const plated = visibleShareOnCanvas(shoulder.pose, samples, verifier, { topPx: 0, rects: [opp] });
  const banded = visibleShareOnCanvas(shoulder.pose, samples, verifier, { topPx: HUD_TOP_PX, rects: [] });
  const both = visibleShareOnCanvas(shoulder.pose, samples, verifier, CHROME);
  assert.ok(under.length > 0, 'no sample of the opponent’s body projects under its plate at 1024 × 714 in the shoulder view');
  assert.ok(
    Math.abs(bare - plated - under.length / samples.length) < 1e-9,
    `${String(under.length)} samples are under the plate but it hid ${pct(bare - plated)} — a point under the plate must count as hidden`,
  );
  const lines = [
    `  1024 × 714, shoulder: ${String(under.length)} of ${String(samples.length)} samples under the opponent's plate · ` +
      `visible ${pct(bare)} bare, ${pct(plated)} plate only, ${pct(banded)} band only, ${pct(both)} band and plates · ` +
      `the plate ends ${(opp.insetY + opp.height).toFixed(1)} px down, inside the ${String(HUD_TOP_PX)}-px band`,
  ];

  // **The negative control for the one-line rules: the plates they replace.** A
  // name row that wraps (a long `--ai-name`, or match setup's profile in the
  // tags on the AI's own turn) and match setup's deck on a line of its own each
  // end below the band, and each must fail the opponent-duelist test's own
  // threshold somewhere a seat plays (16:10 and wider: 90% at 946 px, 70% at
  // 745). If one stopped failing, the band assertion above would be decoration.
  const deckRow = px(rule('.arena__seat-deck')['font-size']) * lineHeight;
  const grownPlates: ReadonlyArray<readonly [string, number]> = [
    ['a wrapped name row', wrapped],
    ["match setup's deck line of its own", oneLine + gap + deckRow],
    ["match setup's plate on the AI's turn (deck line, profile wrapping the name row)", wrapped + gap + deckRow],
  ];
  for (const [label, height] of grownPlates) {
    const grown: CanvasChrome = { topPx: HUD_TOP_PX, rects: [{ ...opp, height }, you] };
    let failures = 0;
    for (const view of VIEWS.filter((v) => v.seatSafe)) {
      const row = CANVASES.flatMap((canvas) =>
        LIVE_ASPECTS.map((aspect) => {
          const share = visibleShareOnCanvas(view.pose, samples, canvasOf(canvas, aspect), grown);
          if (aspect >= 1.6 && share < (canvas === 946 ? 0.9 : 0.7)) failures += 1;
          return pct(share).padStart(4);
        }),
      );
      lines.push(
        `  ${label} (${(opp.insetY + height).toFixed(1)} px): ${view.id.padEnd(9)} 745 px | 946 px: ` +
          `${row.slice(0, 6).join(' ')} | ${row.slice(6).join(' ')}`,
      );
    }
    assert.ok(opp.insetY + height > HUD_TOP_PX, `${label} ends inside the band — the control has no teeth`);
    assert.ok(failures > 0, `${label} hides no more of the opponent's duelist than the band — the one-line rules protect nothing`);
    lines.push(`  ${label}: ${String(failures)} seat-safe view × canvas × aspect cell(s) below the duelist threshold`);
  }
  for (const line of lines) console.log(line);
});

test('camera: the duelists are never in the solver’s required set (report 13 §7)', () => {
  // `framesSeat` and `keepsSeat` take the seat's hand, battlefield, fan and ranks
  // and nothing else: a view's safety is the same with or without a duelist.
  for (const view of VIEWS) assert.equal(view.seatSafe, keepsSeat(view.pose, SEAT_GEOMETRY));
  const source = readFileSync(fileURLToPath(new URL('../src/arena/camera.ts', import.meta.url)), 'utf8');
  assert.ok(!/duelist/i.test(source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')), 'camera.ts names a duelist in code');
});

// ---------------------------------------------------------------------------
// The comic motion lane's impact shakes (report 15 §5.1; D134 on branch `motion`)
// ---------------------------------------------------------------------------

/** A shake-only request, as the lane's `impactShake` makes one. */
function impact(key: string, over: Partial<CameraRequest> = {}): CameraRequest {
  return { frame: [], padding: 0, tilt: 0, shake: 0.3, priority: 0, ms: 260, key, ...over };
}

test('camera: an impact shake is one per cue, never re-aims, never preempts a move, and is bounded (D134)', () => {
  const nowhere = world({ resolve: () => null });
  const director = new CameraDirector();
  const home = director.home;
  assert.equal(director.request(impact('q1'), 0, nowhere), 'taken');
  const frame = director.tick(100);
  assert.deepEqual(frame.pose, poseFromOrbit(home), 'a shake re-aimed the camera');
  assert.ok(Math.hypot(...frame.shake) > 0 && Math.hypot(...frame.shake) <= SHAKE.maxAmplitude * Math.SQRT2 + 1e-9);
  assert.deepEqual(director.home, home, 'a shake moved home');
  // Over within SHAKE.maxMs, and the camera is handed straight back.
  assert.equal(director.tick(100 + SHAKE.maxMs).holding, false);
  assert.equal(director.active, false);
  // The same cue re-asking on a later frame of its window does not shake again…
  assert.equal(director.request(impact('q1'), 600, nowhere), 'dropped', 'one impact shook twice');
  // …and the next cue's impact does.
  assert.equal(director.request(impact('q2'), 610, nowhere), 'taken');

  // Priority 0: a live move is never preempted — not a swoop, not a view change.
  const swooping = new CameraDirector();
  assert.equal(swooping.request(request({ priority: 1 }), 0, world()), 'taken');
  assert.equal(swooping.request(impact('q3'), 50, nowhere), 'dropped');
  const viewing = directorOn('table');
  viewing.applyView({ view: 'side', spectator: true, pressed: true, reducedMotion: false, now: 1000 });
  assert.equal(viewing.request(impact('q4'), 1100, nowhere), 'dropped', 'a shake cut into a view change');
});

test('camera: an impact shake obeys the director’s rules — never within 5 s of the user’s drag, never while the engine waits, never under reduced motion', () => {
  const nowhere = world({ resolve: () => null });
  const director = new CameraDirector();
  director.noteUserInput(1000);
  assert.equal(director.request(impact('q1'), 1001, nowhere), 'dropped');
  assert.equal(director.request(impact('q1'), 1000 + DWELL.userOverrideMs - 1, nowhere), 'dropped');
  assert.equal(director.request(impact('q1'), 1000 + DWELL.userOverrideMs, nowhere), 'taken', 'the window closed and the shake still dropped');
  const spectating = directorOn('director', true);
  spectating.noteUserInput(2000);
  assert.equal(spectating.request(impact('q2'), 2000 + SPECTATOR_DWELL.userOverrideMs - 1, nowhere), 'dropped');
  const waiting = new CameraDirector();
  assert.equal(waiting.request(impact('q3'), 0, world({ resolve: () => null, awaitingHuman: true })), 'dropped');
  assert.equal(waiting.request(impact('q3'), 0, world({ resolve: () => null, reducedMotion: true })), 'dropped');
  // The director's shot is untouched by a shake: no cut, no pending beat consumed.
  const directed = directorOn('director', true);
  const shot = directed.shot;
  assert.equal(directed.request(impact('q5'), 3000, nowhere), 'taken');
  directed.tick(3100);
  assert.equal(directed.shot, shot, 'a shake changed the director’s shot');
  assert.equal(directed.stats.cuts, 0);
});

test('camera: the auto director over the corpus with the comic lane’s shakes in play — the shot rules hold and no shake cuts', () => {
  const cues = validateCues(
    JSON.parse(readFileSync(fileURLToPath(new URL('../src/arena/cues/cues.json', import.meta.url)), 'utf8')) as unknown,
    { cueIds: new Set(REGISTRY.keys()) },
  ).data;
  let shakesTaken = 0;
  let shakesDropped = 0;
  let files = 0;
  for (const file of fixtureFiles()) {
    files += 1;
    const director = directorOn('director', true);
    const asked: CameraRequest[] = [];
    class Recorder extends NullStage {
      override requestCamera(request: CameraRequest | null): void {
        if (request !== null) asked.push(request);
        super.requestCamera(request);
      }
    }
    const stage = new Recorder();
    const queue = new CueQueue({ stage, registry: REGISTRY, data: cues, mode: 'replay', comic: true });
    const log = parseFrameLog(readFileSync(FIXTURES + file, 'utf8'));
    let state = initialState(log.header);
    let previous: GameStateBody | null = null;
    let now = 0;
    const shots: Shot[] = [director.shot!];
    for (const frame of log.frames) {
      state = reduce(state, frame);
      if (frame.type !== 'state') continue;
      const found = beatsOf(state.events, lookupFor(state.board, previous, viewerIdOf(state)));
      director.direct(found, now);
      queue.enqueueBatch(state.events, state, undefined, previous);
      previous = state.board;
      // One replay frame's worth of film (1×, 400 ms), in 25 ms ticks: every request
      // the cues make is handed to the director at the moment it is made.
      for (let tick = 0; tick < BASE_FRAME_INTERVAL_MS; tick += 25) {
        now += 25;
        queue.tick(now);
        for (const request of asked.splice(0)) {
          const homeBefore = director.home;
          const shotBefore = director.shot;
          const outcome = director.request(request, now, world({ resolve: () => null }));
          if (request.frame.length === 0 && request.key !== undefined) {
            if (outcome === 'taken') shakesTaken += 1;
            else shakesDropped += 1;
            assert.deepEqual(director.home, homeBefore, `${file}: a shake moved home`);
            assert.equal(director.shot, shotBefore, `${file}: a shake changed the shot`);
          }
        }
        director.tick(now);
        if (director.shot !== null && director.shot !== shots[shots.length - 1] && director.shot.view !== shots[shots.length - 1]!.view) {
          shots.push(director.shot);
        }
      }
    }
    assertRules(shots, `${file} (with shakes)`);
  }
  console.log(`  director with the comic lane's shakes: ${String(files)} recordings · ${String(shakesTaken)} shakes taken · ${String(shakesDropped)} dropped`);
  assert.ok(shakesTaken > 0, 'no impact shake was ever taken — the test tested nothing');
});
