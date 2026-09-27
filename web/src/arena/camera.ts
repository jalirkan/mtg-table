/*
 * mtg-table — arena/camera.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The camera: a rest pose, a solver, and the seven rules around them**
 * (report 09 §3.5, §8) — **and, as of Tier 2's T8, five named views, a
 * spectator mode and an auto-cutting director.**
 *
 * Plain numbers only — no three, no React, no DOM, no clock — because §8's rules
 * are pose *math* and belong somewhere `node --test` can reach them
 * (`web/test/camera.test.ts`). `CueRunner.tsx` is the only file that turns what
 * this computes into an actual `PerspectiveCamera`, in the arena's one
 * `useFrame`, after `OrbitControls` has had its say.
 *
 * ---------------------------------------------------------------------------
 * §8's seven rules, and where each one lives:
 *
 *  1. **A rest pose, always returned to.** {@link REST_POSE}, and
 *     {@link CameraDirector.home} — every move is a *temporary* blend away from
 *     home and the blend's own last frame is home again, so the camera can
 *     never be "stuck" and a dropped frame cannot leave it somewhere odd.
 *     **T8: the selected view IS home** ({@link VIEWS}), so a cue swoop leaves
 *     from the view you chose and comes back to it; `reset()` now *snaps* home
 *     rather than abandoning the camera mid-swoop.
 *  2. **One camera lane, and it never queues.** {@link CameraDirector.request}
 *     takes a strictly-higher priority and **drops** equal or lower. A queued
 *     camera backs up; a dropped one is invisible. A view change outranks every
 *     cue ({@link VIEW_PRIORITY}).
 *  3. **Targets are anchor-relative, never absolute.** A request names
 *     {@link AnchorRef}s; the caller hands this file a `resolve` function and
 *     {@link solveFraming} does the rest. Change the table size and every cue
 *     still aims.
 *  4. **Dwell limits.** {@link DWELL}: ≤ 900 ms away from home live, ≤ 1800 ms
 *     in a replay, and back within 600 ms of the move ending, always.
 *     {@link SPECTATOR_DWELL} is the second table: slower, longer moves for a
 *     viewer who is only watching.
 *  5. **The camera does not move while the engine is waiting on the human.** A
 *     request arriving then is dropped; a move already running is snapped home
 *     over {@link SNAP_HOME_MS}. Moving the camera while the player is trying
 *     to click a card is the worst failure mode available to us. **A view the
 *     player chose is not a cue** and is exempt, exactly as their own orbit
 *     drag is.
 *  6. **The hand stays framed.** {@link solveFraming} frames the seat's own hand
 *     and battlefield *along with* whatever the cue asked for, and
 *     {@link framesSeat} then rejects any pose that still loses one. **A move
 *     that cannot be solved is dropped, never "improved" into something else.**
 *     {@link HAND_BAND} carries the one measured deviation from §8's literal
 *     wording, and says what it cost to find out. **T8: a view that cannot keep
 *     the hand is `seatSafe: false` and is offered only to a spectator** — see
 *     {@link ViewSpec.seatSafe} for why that and not a DOM hand strip.
 *  7. **Shake is bounded and optional.** {@link SHAKE}: ≤ 0.02 world units,
 *     ≤ 300 ms, decaying, one axis pair; `prefers-reduced-motion: reduce`
 *     disables it — and, here, disables cue camera moves outright, and turns a
 *     view change into a cut.
 *
 * Plus §3.5's user rule, which is stronger than it sounds: **any orbit drag
 * makes the user's own pose the new home** and suppresses cue moves for
 * {@link DWELL.userOverrideMs}. "Never fight the user for the camera" cannot
 * mean "spring back to our pose five seconds after they let go". T8 adds the
 * other half: that free orbit is **remembered per view** until a view key is
 * pressed, and pressing the key of the view you are on drops it.
 * ---------------------------------------------------------------------------
 */

import type { GameEvent, GameStateBody } from '../protocol.ts';
import { findCard } from '../render/resolve.ts';
import type { AnchorRef, CameraRequest } from './cues/stage.ts';
import type { Seat } from './layout.ts';

/** A camera pose: where it is and what it looks at. */
export interface Pose {
  position: [number, number, number];
  target: [number, number, number];
}

export type Point3 = readonly [number, number, number];

/**
 * §3.5 — the framing that fits both battlefields and your own hand.
 *
 * The numbers are the report's, and they are a *starting* pose rather than a
 * constraint: `OrbitControls` lets the user move inside the clamps below, and
 * the moment they do, {@link CameraDirector} adopts their pose as home. It is
 * also view **1**, "table" ({@link VIEWS}).
 */
export const REST_POSE: Pose = {
  position: [0, 9.3, 8.3],
  target: [0, 0, 0.8],
};

/** §3.5 — `PerspectiveCamera`, and these are all of its parameters. */
export const CAMERA = { fov: 40, near: 0.1, far: 60 } as const;

const deg = (d: number): number => (d * Math.PI) / 180;

/** Euclidean distance between two points. */
export function distance(a: readonly number[], b: readonly number[]): number {
  const dx = (a[0] ?? 0) - (b[0] ?? 0);
  const dy = (a[1] ?? 0) - (b[1] ?? 0);
  const dz = (a[2] ?? 0) - (b[2] ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** How far the rest pose sits from its target — the unit the distance clamp uses. */
export const REST_DISTANCE = distance(REST_POSE.position, REST_POSE.target);

/**
 * The box a free orbit lives in, as `OrbitControls` props — the same eight
 * names, so `Arena.tsx` spreads it straight onto the controls.
 */
export interface OrbitClamps {
  readonly minPolarAngle: number;
  readonly maxPolarAngle: number;
  readonly minAzimuthAngle: number;
  readonly maxAzimuthAngle: number;
  readonly minDistance: number;
  readonly maxDistance: number;
  readonly enableDamping: boolean;
  readonly enablePan: boolean;
}

/**
 * §3.5's clamps, as `OrbitControls` props — **the seat's box**.
 *
 * The polar and azimuth limits are what stop the two failure modes a free
 * orbit has on a card table: dropping to eye level (where the far rank hides
 * behind the near one) and swinging round behind the opponent (where your own
 * hand is off screen and every label is upside down). Panning is off outright —
 * there is nothing off the table to pan to, and a panned camera is the one state
 * a user cannot undo without a reset button.
 */
export const ORBIT_CLAMPS: OrbitClamps = {
  minPolarAngle: deg(20),
  maxPolarAngle: deg(75),
  minAzimuthAngle: deg(-25),
  maxAzimuthAngle: deg(25),
  minDistance: REST_DISTANCE * 0.7,
  maxDistance: REST_DISTANCE * 1.4,
  enableDamping: true,
  enablePan: false,
};

/**
 * **T8 — the spectator's box.** A replay has no seat to protect, so the two
 * failure modes {@link ORBIT_CLAMPS} exists for are a *choice* here rather than
 * an accident: the azimuth is free all the way round (the opponent's shoulder
 * is a view), the polar range reaches down to figure height, and the distance
 * doubles. Panning stays off for the same reason as at a seat.
 *
 * `maxPolarAngle` is 86° and not 90°: a camera *in* the table plane sees the
 * felt as a line and every card edge-on, and the one view that goes that low
 * ({@link VIEWS} "side") sits at 77.4°, inside it with most of a cue's tilt to
 * spare.
 */
export const SPECTATOR_CLAMPS: OrbitClamps = {
  minPolarAngle: deg(6),
  maxPolarAngle: deg(86),
  minAzimuthAngle: Number.NEGATIVE_INFINITY,
  maxAzimuthAngle: Number.POSITIVE_INFINITY,
  minDistance: REST_DISTANCE * 0.45,
  maxDistance: REST_DISTANCE * 1.9,
  enableDamping: true,
  enablePan: false,
};

/**
 * §8 rule 7 — shake is bounded and optional: ≤ 0.02 world units, ≤ 300 ms,
 * decaying, and disabled entirely under `prefers-reduced-motion: reduce`.
 * The constants live here so the cue registry cannot quietly exceed them.
 */
export const SHAKE = { maxAmplitude: 0.02, maxMs: 300 } as const;

/**
 * §8 rule 4 / §3.5 — how long a cue may hold the camera away from home, and how
 * long any drag suppresses cue camera moves.
 */
export const DWELL = { liveMs: 900, replayMs: 1800, returnMs: 600, userOverrideMs: 5000 } as const;

/**
 * **T8 — the second dwell table: a spectator's.** Nobody is waiting to click,
 * so a cue's camera move may run {@link SPECTATOR_DWELL.slow}× slower than the
 * cue asked for and hold up to {@link SPECTATOR_DWELL.moveMs} — the swoop reads
 * as a camera operator rather than a flinch. The return is still part of the
 * move's own envelope (its last 28%), so `returnMs` is what that comes to at
 * the cap, and rule 1 is unchanged: the last frame of every move is home.
 */
export const SPECTATOR_DWELL = {
  moveMs: 3200,
  returnMs: 900,
  userOverrideMs: 5000,
  slow: 1.6,
} as const;

/**
 * **T8 — how long a chosen view takes to arrive.** Short at a seat (you pressed
 * a key mid-game and want to be there), long for a spectator ("slower and longer
 * moves"). Reduced motion and the auto director use `0`: a **cut**.
 */
export const VIEW_EASE_MS = { seat: 650, spectator: 1400 } as const;

/**
 * **T8 — how long after the user lets go of the mouse their orbit is still
 * theirs.** `OrbitControls` damps: the camera keeps gliding for about a second
 * and a half after `end` (dampingFactor 0.05 per frame decays below 1% in ~90
 * frames), and every `change` in that tail is the user's pose settling, not ours.
 */
export const USER_TAIL_MS = 1500;

/** §8 rule 5 — how fast a live move gets out of the way when the engine asks. */
export const SNAP_HOME_MS = 200;

/** A view change outranks every cue: the lane is the user's while it runs. */
export const VIEW_PRIORITY = 100;

/**
 * §8 rule 6 — where the viewer's own hand must land on screen, in normalised
 * device coordinates (`-1` is the bottom edge, `+1` the top).
 *
 * ---------------------------------------------------------------------------
 * **This is §8's one measured deviation, and it is here rather than in a
 * footnote because it changes behaviour.**
 *
 * Rule 6 as written is "the own-hand anchor projects inside the lower 30% of
 * the viewport", i.e. `y ∈ [-1, -0.4]`, *and* "if the clamp cannot be satisfied,
 * the move is dropped". Enforced literally on every solved pose, that drops
 * **both** of §8's own camera moves — measured, 2026-09-13, at 1920×1080:
 *
 *   - the attack swoop, because framing the opponent's combat lane at all puts
 *     the viewer's hand behind the camera (`projectToNdc` → `null`);
 *   - the outcome pull-back, because a wide shot lifts the hand to `y ≈ -0.35`,
 *     which is *more* of the hand on screen and still outside a 30% band.
 *
 * So rule 6 is enforced in the half that has teeth — **the hand is on screen,
 * and it is below the midline** — and in the half that made it true by
 * construction: {@link solveFraming} puts the seat's own anchors into the set of
 * points it frames, so a pose that loses the hand is not corrected, it is never
 * solved. The literal 30% property still holds where it matters most: the rest
 * pose puts the hand at `y = -0.84`.
 * ---------------------------------------------------------------------------
 */
export const HAND_BAND = { min: -1, max: 0 } as const;

// ---------------------------------------------------------------------------
// Orbit coordinates — the same three numbers `OrbitControls` thinks in
// ---------------------------------------------------------------------------

/**
 * A pose as `OrbitControls` sees it: an azimuth, a polar angle and a distance
 * about a target.
 *
 * Every clamp in §3.5 is a clamp on one of these three, and every blend is a
 * lerp of all four fields — which is why a cue move can be interrupted at any
 * instant and still be somewhere sensible.
 */
export interface Orbit {
  /** Radians about +Y, measured from the +Z axis toward +X. 0 is straight on. */
  azimuth: number;
  /** Radians from +Y. 0 is directly overhead, π/2 is at table level. */
  polar: number;
  distance: number;
  target: [number, number, number];
}

export function orbitFromPose(pose: Pose): Orbit {
  const dx = pose.position[0] - pose.target[0];
  const dy = pose.position[1] - pose.target[1];
  const dz = pose.position[2] - pose.target[2];
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
  return {
    azimuth: Math.atan2(dx, dz),
    polar: Math.acos(Math.max(-1, Math.min(1, dy / dist))),
    distance: dist,
    target: [pose.target[0], pose.target[1], pose.target[2]],
  };
}

export function poseFromOrbit(orbit: Orbit): Pose {
  const sinPolar = Math.sin(orbit.polar);
  return {
    position: [
      orbit.target[0] + orbit.distance * sinPolar * Math.sin(orbit.azimuth),
      orbit.target[1] + orbit.distance * Math.cos(orbit.polar),
      orbit.target[2] + orbit.distance * sinPolar * Math.cos(orbit.azimuth),
    ],
    target: [orbit.target[0], orbit.target[1], orbit.target[2]],
  };
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/**
 * §3.5's box, applied to a solved orbit. The user's controls enforce the same
 * one — {@link ORBIT_CLAMPS} at a seat, {@link SPECTATOR_CLAMPS} for a spectator.
 */
export function clampOrbit(orbit: Orbit, clamps: OrbitClamps = ORBIT_CLAMPS): Orbit {
  return {
    azimuth: clamp(orbit.azimuth, clamps.minAzimuthAngle, clamps.maxAzimuthAngle),
    polar: clamp(orbit.polar, clamps.minPolarAngle, clamps.maxPolarAngle),
    distance: clamp(orbit.distance, clamps.minDistance, clamps.maxDistance),
    target: [orbit.target[0], orbit.target[1], orbit.target[2]],
  };
}

/** Whether an orbit is inside a clamp box, to a tolerance — the test a view has to pass. */
export function insideClamps(orbit: Orbit, clamps: OrbitClamps, eps = 1e-6): boolean {
  return (
    orbit.azimuth >= clamps.minAzimuthAngle - eps &&
    orbit.azimuth <= clamps.maxAzimuthAngle + eps &&
    orbit.polar >= clamps.minPolarAngle - eps &&
    orbit.polar <= clamps.maxPolarAngle + eps &&
    orbit.distance >= clamps.minDistance - eps &&
    orbit.distance <= clamps.maxDistance + eps
  );
}

/**
 * Linear blend of two orbits. `k = 0` is `a`, `k = 1` is `b`.
 *
 * **The azimuth goes the short way round** (T8). Inside a seat's ±25° box
 * there was only one way; a spectator swinging from the low corner (+22°) to the
 * opponent's shoulder (−171°) would otherwise sweep 193° through the far side
 * of the table instead of 167° through the near one. The wrap is applied only
 * when the plain difference is more than half a turn, so every blend inside the
 * seat's box is bit-for-bit the one it always was.
 */
export function lerpOrbit(a: Orbit, b: Orbit, k: number): Orbit {
  const t = clamp(k, 0, 1);
  const mix = (x: number, y: number): number => x + (y - x) * t;
  let dAz = b.azimuth - a.azimuth;
  if (dAz > Math.PI) dAz -= 2 * Math.PI;
  else if (dAz < -Math.PI) dAz += 2 * Math.PI;
  return {
    azimuth: a.azimuth + dAz * t,
    polar: mix(a.polar, b.polar),
    distance: mix(a.distance, b.distance),
    target: [
      mix(a.target[0], b.target[0]),
      mix(a.target[1], b.target[1]),
      mix(a.target[2], b.target[2]),
    ],
  };
}

// ---------------------------------------------------------------------------
// Projection — what "the hand stays framed" is actually testing
// ---------------------------------------------------------------------------

function sub(a: Point3, b: Point3): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function cross(a: Point3, b: Point3): [number, number, number] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a: Point3, b: Point3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function norm(v: Point3): [number, number, number] {
  const len = Math.hypot(v[0], v[1], v[2]) || 1e-6;
  return [v[0] / len, v[1] / len, v[2] / len];
}

const WORLD_UP: Point3 = [0, 1, 0];

/**
 * Where a world point lands on screen, in normalised device coordinates.
 *
 * `null` means "behind the camera", which for our purposes is the same as off
 * screen. This is three's own perspective projection written out in twelve
 * lines, and it is here rather than in `scene/` for one reason: §8 rule 6 is a
 * *constraint on a pose we have not adopted yet*, so it has to be checkable
 * without a camera object.
 */
export function projectToNdc(
  pose: Pose,
  point: Point3,
  fovDeg: number = CAMERA.fov,
  aspect = 16 / 9,
): [number, number] | null {
  const forward = norm(sub(pose.target, pose.position));
  const right = norm(cross(forward, WORLD_UP));
  const up = cross(right, forward);
  const v = sub(point, pose.position);
  const z = dot(v, forward);
  if (z <= CAMERA.near) return null;
  const f = 1 / Math.tan((deg(fovDeg) * 0.5) as number);
  return [(dot(v, right) / z) * (f / aspect), (dot(v, up) / z) * f];
}

/**
 * §8 rule 6 — **the hand stays framed.**
 *
 * The viewer's own hand must project inside the lower {@link HAND_BAND} of the
 * viewport and the viewer's own battlefield rank must be on screen at all. A
 * pose that fails either is not clamped into shape; it is **dropped** by
 * {@link solveFraming}, because a "corrected" swoop that no longer frames what
 * the cue asked for is a camera move with no reason to exist.
 */
export function framesSeat(
  pose: Pose,
  hand: Point3 | null,
  battlefield: Point3 | null,
  fovDeg: number = CAMERA.fov,
  aspect = 16 / 9,
): boolean {
  if (hand !== null) {
    const ndc = projectToNdc(pose, hand, fovDeg, aspect);
    if (ndc === null) return false;
    if (Math.abs(ndc[0]) > 1) return false;
    if (ndc[1] < HAND_BAND.min || ndc[1] > HAND_BAND.max) return false;
  }
  if (battlefield !== null) {
    const ndc = projectToNdc(pose, battlefield, fovDeg, aspect);
    if (ndc === null) return false;
    if (Math.abs(ndc[0]) > 1 || Math.abs(ndc[1]) > 1) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// The solver (§8 rule 3)
// ---------------------------------------------------------------------------

export interface FramingOptions {
  /** Extra world units of room around the points. */
  padding?: number;
  /** Radians added to the home polar angle. Negative tilts the camera lower. */
  tilt?: number;
  fovDeg?: number;
  aspect?: number;
  /** The seat anchors rule 6 checks. `null` skips that half of the check. */
  hand?: Point3 | null;
  battlefield?: Point3 | null;
  /** The box the solved pose must land in. {@link ORBIT_CLAMPS} unless spectating. */
  clamps?: OrbitClamps;
}

/**
 * **Frame these points**, from roughly where the camera already is.
 *
 * The azimuth is the *home* azimuth — a cue may move the camera in and down,
 * never round the table, because swinging the azimuth is what makes a card game
 * nauseating. Distance comes from the points' own bounding radius and the
 * vertical field of view; the polar angle is home's plus the cue's tilt. Then
 * §3.5's clamps, then §8 rule 6.
 *
 * Returns `null` when the pose cannot be made to keep the seat framed, at which
 * point the move is dropped (rule 6, last sentence).
 */
export function solveFraming(
  points: readonly Point3[],
  home: Orbit,
  options: FramingOptions = {},
): Pose | null {
  if (points.length === 0) return null;
  const fovDeg = options.fovDeg ?? CAMERA.fov;
  const aspect = options.aspect ?? 16 / 9;
  const padding = options.padding ?? 0.25;
  const clamps = options.clamps ?? ORBIT_CLAMPS;

  /**
   * **Rule 6, by construction.** The seat's own anchors join the set being
   * framed, so the solved pose keeps them on screen because it was *solved to*
   * — not because a clamp afterwards happened to allow it. The cue's own
   * anchors still pull the shot: they move the centroid and the tilt lowers the
   * angle, which is what makes a swoop read as a swoop.
   */
  const all: Point3[] = [...points];
  if (options.hand != null) all.push(options.hand);
  if (options.battlefield != null) all.push(options.battlefield);

  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (const p of all) {
    cx += p[0];
    cy += p[1];
    cz += p[2];
  }
  const centre: [number, number, number] = [cx / all.length, cy / all.length, cz / all.length];

  let radius = 0;
  for (const p of all) radius = Math.max(radius, distance(p, centre));
  // One card height of subject even for a single point: framing a point is
  // framing the card that is at it.
  radius = Math.max(radius, 0.6) + padding;

  const vfov = deg(fovDeg);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
  const need = Math.max(radius / Math.tan(vfov / 2), radius / Math.tan(hfov / 2));

  let orbit = clampOrbit(
    {
      azimuth: home.azimuth,
      polar: home.polar + (options.tilt ?? 0),
      distance: need,
      target: centre,
    },
    clamps,
  );

  // Rule 6, with three chances to buy the framing back by pulling out — a
  // closer shot is the cue's preference, not its requirement.
  for (let attempt = 0; attempt < 4; attempt++) {
    const pose = poseFromOrbit(orbit);
    if (framesSeat(pose, options.hand ?? null, options.battlefield ?? null, fovDeg, aspect)) {
      return pose;
    }
    if (orbit.distance >= clamps.maxDistance - 1e-6) break;
    orbit = clampOrbit({ ...orbit, distance: orbit.distance * 1.2 }, clamps);
  }
  return null;
}

// ---------------------------------------------------------------------------
// T8 — the five named views
// ---------------------------------------------------------------------------

/** The five views, in key order (`1`–`5`). */
export type ViewId = 'table' | 'shoulder' | 'oppShoulder' | 'side' | 'low';

/** What the camera can be set to: a view, or the auto director that cuts between them. */
export type CameraChoice = ViewId | 'director';

export const VIEW_IDS: readonly ViewId[] = ['table', 'shoulder', 'oppShoulder', 'side', 'low'];
export const CAMERA_CHOICES: readonly CameraChoice[] = [...VIEW_IDS, 'director'];

export function isCameraChoice(value: unknown): value is CameraChoice {
  return typeof value === 'string' && (CAMERA_CHOICES as readonly string[]).includes(value);
}

export interface ViewSpec {
  id: ViewId;
  /** The key that selects it — `keys.ts`'s `CAMERA_KEYS` spells the same map (D49). */
  key: string;
  /** What the switcher prints. */
  label: string;
  /** One line: what you see from here. */
  what: string;
  pose: Pose;
  /**
   * **Whether a live seat may use this view** — §8 rule 6 as a property of a
   * pose rather than of a move.
   *
   * `true` iff the pose is inside {@link ORBIT_CLAMPS}, frames the seat's own
   * hand and battlefield ({@link framesSeat}) **and** keeps the seat's own land
   * and creature ranks uncovered by its hand ({@link ranksUncovered}, the
   * verification pass's addition) at every aspect in {@link LIVE_ASPECTS} —
   * {@link keepsSeat}. It is written out as a literal so the arena needs no
   * anchors to grey a button, and `web/test/camera.test.ts` recomputes it from
   * the real `layout.ts` geometry for every view, so the flag cannot drift from
   * the geometry it stands for.
   *
   * **Why a view that fails is "spectator only" and not "allowed, with a DOM
   * hand strip".** The strip would be a second card renderer — a new surface
   * drawing the viewer's hand beside `CardPlane`, which is exactly what M7
   * convention 2 closes (or an eleventh `CardTile` importer, which M4
   * convention 2 calls a decision), and hard rule 8's renderer half is carried
   * by there being one. It would also be a second place to click the same card
   * while the 3D one sits at a different angle, which is the split attention
   * §8 rule 6 exists to prevent. And the two views that fail are the two whose
   * whole point is *watching*: from the opponent's shoulder your hand is at the
   * top of the screen and upside down; side-on it is edge-on. So they are
   * greyed while a seat is live and say why, and every one of the five is there
   * the moment nobody is waiting to click.
   */
  seatSafe: boolean;
}

/**
 * **The five views** (T8). Each becomes {@link CameraDirector.home} while it is
 * selected, so a cue's swoop leaves from it and returns to it (rule 1), and each
 * is inside the clamp box it is used under — asserted, not assumed.
 *
 * The seat is at +Z, the opponent at −Z, the stack column at x = +4.8 and the
 * piles at x = −4.8 (`layout.ts`). Every pose is written as a position and a
 * target because that is what a person tuning one reads; the orbit numbers in
 * each comment are `orbitFromPose` of it.
 */
export const VIEWS: readonly ViewSpec[] = [
  {
    // az 0°, polar 38.9°, d 11.95 — report 09 §3.5's rest pose, unchanged.
    id: 'table',
    key: '1',
    label: 'Table',
    what: 'the whole table from above — both battlefields, both hands, the stack',
    pose: REST_POSE,
    seatSafe: true,
  },
  {
    // az 10°, polar 55°, d 9.3 — behind the viewer's right shoulder. Tuned so a
    // full SEVEN-card fan is inside the frame at 4:3 and wider (x −0.93…0.94,
    // y −0.93…−0.22) AND, since the verification pass, so that fan covers no
    // point of the seat's own land and creature rank lines at any live aspect
    // (`ranksUncovered`, with `layout.ts`'s `SIGHTLINE_MARGIN`). Slice 2's first
    // pose (polar 66°, eye 4.27 up) passed rule 6 while a raycast grid over a
    // Plains in the land rank hit the Plains 20 times in 103 and the hand the
    // rest; this one is a unit higher and aimed at the ranks rather than past
    // them — 41 of 96, the far two-thirds of the card — and the hand is as large.
    id: 'shoulder',
    key: '2',
    label: 'Shoulder',
    what: 'over your shoulder — your hand in the foreground, the opponent across the table',
    pose: { position: [0.9, 5.35, 9.5], target: [-0.4, 0, 2] },
    seatSafe: true,
  },
  {
    // az −170°, polar 55°, d 9.3 — the shoulder shot mirrored through the table
    // centre (re-mirrored when the verification pass raised the shoulder). Your
    // hand is at the top of the frame, facing away.
    id: 'oppShoulder',
    key: '3',
    label: 'Opp. shoulder',
    what: "over the opponent's shoulder — their side in the foreground, yours across the table",
    pose: { position: [-0.9, 5.35, -9.5], target: [0.4, 0, -2] },
    seatSafe: false,
  },
  {
    // az −86.9°, polar 77.4°, d 7.6 — at the graveyard end, the lens a little
    // above figure height (figures are 0.85 tall) and close enough that they
    // read as figures: the first cut, at d 9.7 and polar 83.5°, left them a
    // row of specks with two thirds of the frame empty table. From −X rather
    // than +X because the piles there lie flat and the stack column at +4.8
    // would stand in the foreground. The opponent is on the left, you on the
    // right, and the combat lanes meet in the middle of the frame.
    id: 'side',
    key: '4',
    label: 'Side-on',
    what: 'side-on at figure height — the two battle lines face each other across the frame',
    pose: { position: [-7.4, 2.05, 0.6], target: [0, 0.4, 0.2] },
    seatSafe: false,
  },
  {
    // az 22°, polar 59°, d 10.5 — a three-quarter angle from the viewer's right
    // corner, aimed left of centre and up at the figures so the whole fan stays
    // in frame at 4:3 (x −0.96…0.44). It is about the lowest pose from that
    // corner whose hand covers none of the seat's own rank lines at any live
    // aspect (verification fix): slice 2's first cut sat at polar 74°, a degree
    // inside the seat box's floor, with the hand over all but 8 of 109 raycast
    // samples of a Plains (34 of 86 now). Low is a corner rather than a crouch
    // since — the rule costs the angle 15° of polar — and it still puts a
    // front-row figure at 0.14 of the frame's height at 16:9 (table: 0.09).
    id: 'low',
    key: '5',
    label: 'Low',
    what: 'a low three-quarter angle from your corner, looking up the table at the figures',
    pose: { position: [3.35, 5.8, 10.1], target: [0, 0.4, 1.75] },
    seatSafe: true,
  },
];

export const VIEW_BY_ID: Readonly<Record<ViewId, ViewSpec>> = Object.fromEntries(
  VIEWS.map((view) => [view.id, view]),
) as Record<ViewId, ViewSpec>;

/**
 * The aspects rule 6 is checked at for {@link ViewSpec.seatSafe}: square to
 * ultrawide. A browser window below 1:1 is not a table anyone plays at.
 */
export const LIVE_ASPECTS: readonly number[] = [1, 4 / 3, 16 / 10, 16 / 9, 2, 21 / 9];

/**
 * **What a view is checked against at a seat** — `layout.ts`'s geometry, handed
 * in so this file stays free of it (it imports `layout.ts` for a type only).
 */
export interface SeatGeometry {
  /** The seat's hand anchor — rule 6's first half. */
  hand: Point3;
  /** The seat's creature-rank anchor — rule 6's second half. */
  battlefield: Point3;
  /** Every card of the widest hand fan, as its four world corners (`fanCorners`). */
  fan: readonly (readonly Point3[])[];
  /** Points on the seat's own land-rank and creature-rank centre lines (`seatRankLines`). */
  ranks: readonly Point3[];
}

/**
 * **T8 fix — the hand does not cover the seat's own ranks.** Every point of
 * `ranks` that is on screen must fall outside every projected card of `fan`.
 *
 * `framesSeat` only asks whether the anchors are INSIDE the frame; the slice-2
 * verification pass raycast a grid over a Plains on the viewer's own battlefield
 * and found the shoulder and low views sending 80–90% of it into cards 18 and 22 of
 * the hand. The seat could still act — a click on a hand card is a click on a hand
 * card — but reading tapped lands, tapping them and targeting your own permanents
 * all happen on the ranks the fan was covering. The test is deliberately
 * CONSERVATIVE: a rank point that projects inside a card counts as covered
 * whether the card is in front of it or not, so a pose that passes cannot be
 * hiding a rank behind its hand.
 */
export function ranksUncovered(
  pose: Pose,
  fan: readonly (readonly Point3[])[],
  ranks: readonly Point3[],
  fovDeg: number = CAMERA.fov,
  aspect = 16 / 9,
): boolean {
  const quads: Array<Array<[number, number]>> = [];
  for (const card of fan) {
    const quad: Array<[number, number]> = [];
    for (const corner of card) {
      const ndc = projectToNdc(pose, corner, fovDeg, aspect);
      if (ndc === null) break;
      quad.push(ndc);
    }
    if (quad.length === card.length) quads.push(quad);
  }
  for (const point of ranks) {
    const ndc = projectToNdc(pose, point, fovDeg, aspect);
    if (ndc === null) return false;
    if (Math.abs(ndc[0]) > 1 || Math.abs(ndc[1]) > 1) continue;
    for (const quad of quads) if (insideConvex(ndc, quad)) return false;
  }
  return true;
}

/** Is `p` inside the convex polygon `poly` (either winding)? */
function insideConvex(p: readonly [number, number], poly: ReadonlyArray<readonly [number, number]>): boolean {
  let sign = 0;
  for (let k = 0; k < poly.length; k++) {
    const a = poly[k]!;
    const b = poly[(k + 1) % poly.length]!;
    const cross2 = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (cross2 === 0) continue;
    const s = cross2 > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

/**
 * **§8 rule 6 for a view**: inside the seat's clamps, the hand and the
 * battlefield framed, **and the seat's own ranks not covered by its hand** (T8
 * fix), at every one of {@link LIVE_ASPECTS}. What {@link ViewSpec.seatSafe} has
 * to agree with.
 */
export function keepsSeat(
  pose: Pose,
  seat: SeatGeometry,
  aspects: readonly number[] = LIVE_ASPECTS,
): boolean {
  if (!insideClamps(orbitFromPose(pose), ORBIT_CLAMPS)) return false;
  return aspects.every(
    (aspect) =>
      framesSeat(pose, seat.hand, seat.battlefield, CAMERA.fov, aspect) &&
      ranksUncovered(pose, seat.fan, seat.ranks, CAMERA.fov, aspect),
  );
}

/**
 * Whether this choice may be used right now. A spectator may use every view
 * and the director; a seat only the views that keep its hand.
 */
export function viewAvailable(choice: CameraChoice, spectator: boolean): boolean {
  if (spectator) return true;
  if (choice === 'director') return false;
  return VIEW_BY_ID[choice].seatSafe;
}

/** The choice actually shown: what was asked for, or the table when it is not allowed here. */
export function effectiveView(choice: CameraChoice, spectator: boolean): CameraChoice {
  return viewAvailable(choice, spectator) ? choice : 'table';
}

/** A view's canonical orbit. */
export function viewOrbit(view: ViewId): Orbit {
  return orbitFromPose(VIEW_BY_ID[view].pose);
}

// ---------------------------------------------------------------------------
// T8 — the auto director: a pure function of (event batch, current shot, time)
// ---------------------------------------------------------------------------

/**
 * What a batch *means* to a camera operator. Five beats, ranked: the game
 * ending outranks a fight, a fight outranks a spell landing, a spell landing
 * outranks one being cast, and a new turn is the quietest.
 */
export type BeatKind = 'outcome' | 'combat' | 'strike' | 'cast' | 'turn';

export interface Beat {
  kind: BeatKind;
  /** Whose side of the table the beat belongs to, when it has one. */
  seat: Seat | null;
}

/**
 * The beats that are *the scene* rather than a cutaway: they may re-enter a
 * view the cooldown would otherwise hold. Never the minimum shot length.
 */
export const COOLDOWN_EXEMPT: ReadonlySet<BeatKind> = new Set<BeatKind>(['combat', 'outcome']);

export const BEAT_RANK: Readonly<Record<BeatKind, number>> = {
  outcome: 5,
  combat: 4,
  strike: 3,
  cast: 2,
  turn: 1,
};

/**
 * The director's three numbers.
 *
 *  - **`minShotMs`** — a shot, once cut to, is held at least this long. Nothing
 *    cuts sooner, not even the game ending.
 *  - **`cooldownMs`** — a view is not re-entered within this long of being cut
 *    away from (no A → B → A ping-pong between two shoulders, or a shoulder and
 *    the wide shot). **A fight and the finish are exempt** ({@link
 *    COOLDOWN_EXEMPT}): measured in the browser on `g1.jsonl` 322–347, the
 *    second combat of a turn (index 342–345) was shot entirely from the
 *    caster's shoulder because side-on had been left 2.4 s earlier — the
 *    cooldown was protecting the viewer from the one shot they came for.
 *  - **`pendingMs`** — a beat that arrives during `minShotMs` is remembered for
 *    this long and taken as soon as the shot has run, so a combat declared a
 *    second after a spell is still shot as combat.
 *
 * At a replay's 400 ms a frame, `minShotMs` is six frames.
 */
export const DIRECTOR = {
  minShotMs: 2400,
  cooldownMs: 4800,
  pendingMs: 1600,
  userOverrideMs: DWELL.userOverrideMs,
} as const;

export type DirectorRules = { readonly [K in keyof typeof DIRECTOR]: number };

export interface Shot {
  view: ViewId;
  /** When this shot was cut to, on the director's clock (ms). */
  since: number;
  /** When each view was last cut AWAY from — the cooldown's whole memory. */
  leftAt: Readonly<Partial<Record<ViewId, number>>>;
  /** A beat held back by `minShotMs` or the cooldown, with when it arrived. */
  pending: { beat: Beat; at: number } | null;
  /** Why this shot was taken. */
  reason: BeatKind | 'start';
}

/** Where the director starts: wide. */
export function startShot(now: number): Shot {
  return { view: 'table', since: now, leftAt: {}, pending: null, reason: 'start' };
}

/**
 * **The shot list** — a beat and whose it is → a view.
 *
 *  - **combat** → side-on: the two battle lines face each other across the frame;
 *  - **cast** → the caster's shoulder (a resolution with no target is the
 *    caster's too);
 *  - **strike** → the target's side: the shoulder of whoever is being hit,
 *    which after a cast is the reverse shot;
 *  - **turn** and **outcome** → wide.
 */
export function viewForBeat(beat: Beat): ViewId {
  switch (beat.kind) {
    case 'combat':
      return 'side';
    case 'cast':
    case 'strike':
      return beat.seat === 'opp' ? 'oppShoulder' : 'shoulder';
    case 'turn':
    case 'outcome':
      return 'table';
  }
}

function strongest(beats: readonly Beat[]): Beat | null {
  let best: Beat | null = null;
  // Strictly greater: of equal rank the FIRST wins, i.e. engine order.
  for (const beat of beats) if (best === null || BEAT_RANK[beat.kind] > BEAT_RANK[best.kind]) best = beat;
  return best;
}

function withoutPending(shot: Shot): Shot {
  return shot.pending === null ? shot : { ...shot, pending: null };
}

/**
 * **The auto-cut, as a pure function** of the batch's beats, the shot on
 * screen and the time. Returns `current` itself (the same object) when nothing
 * changes, so a caller can tell a cut from a hold with `!==`.
 *
 * Three rules, and the tests hold it to each of them over every batch in the
 * corpus: no shot is shorter than `minShotMs`; no view is re-entered within
 * `cooldownMs` of leaving it (bar a fight and the finish); and **the user's orbit wins for
 * exactly the override window §3.5 already gives it** — within
 * `userOverrideMs` of their last drag nothing cuts and nothing waits to.
 */
export function directShot(
  beats: readonly Beat[],
  current: Shot,
  now: number,
  options: { userInputAt?: number; rules?: DirectorRules } = {},
): Shot {
  const rules = options.rules ?? DIRECTOR;
  const userInputAt = options.userInputAt ?? Number.NEGATIVE_INFINITY;
  if (now - userInputAt < rules.userOverrideMs) return withoutPending(current);

  let best = strongest(beats);
  let at = now;
  const pending =
    current.pending !== null && now - current.pending.at <= rules.pendingMs ? current.pending : null;
  if (pending !== null && (best === null || BEAT_RANK[pending.beat.kind] > BEAT_RANK[best.kind])) {
    best = pending.beat;
    at = pending.at;
  }
  if (best === null) return withoutPending(current);

  const view = viewForBeat(best);
  if (view === current.view) return withoutPending(current);

  const held = now - current.since < rules.minShotMs;
  const left = current.leftAt[view];
  const cooling = !COOLDOWN_EXEMPT.has(best.kind) && left !== undefined && now - left < rules.cooldownMs;
  if (held || cooling) {
    if (current.pending !== null && current.pending.beat === best) return current;
    return { ...current, pending: { beat: best, at } };
  }
  return {
    view,
    since: now,
    leftAt: { ...current.leftAt, [current.view]: now },
    pending: null,
    reason: best.kind,
  };
}

/** What the beat extractor needs to know about the table — injected, so it stays pure. */
export interface BeatLookup {
  seatOfPlayer(playerId: number): Seat;
  /** The seat of a card's controller, or `null` when this frame cannot say. */
  seatOfCard(cardId: number): Seat | null;
  /** The seat of whatever a resolving card's stack item targeted, one frame earlier. */
  strikeSeat(cardId: number): Seat | null;
}

/**
 * **A batch → its beats**, in engine order. Only facts the wire already states
 * publicly are read: a player id, a card's `controller` (protocol §3.3's field,
 * present on every card, redacted or not) and the previous frame's
 * `stack[].target*Ids`. The director never learns a card's name, so a cut can
 * never say more than the table already does.
 */
export function beatsOf(events: readonly GameEvent[], lookup: BeatLookup): Beat[] {
  const out: Beat[] = [];
  for (const event of events) {
    switch (event.kind) {
      case 'attackers':
        out.push({ kind: 'combat', seat: lookup.seatOfPlayer(event.player) });
        break;
      case 'blockers':
        out.push({ kind: 'combat', seat: lookup.seatOfPlayer(event.defendingPlayer) });
        break;
      case 'damage': {
        if (event.combat) {
          out.push({ kind: 'combat', seat: null });
          break;
        }
        const seat =
          event.target.kind === 'player'
            ? lookup.seatOfPlayer(event.target.id)
            : lookup.seatOfCard(event.target.id);
        if (seat !== null) out.push({ kind: 'strike', seat });
        break;
      }
      case 'cast':
        out.push({ kind: 'cast', seat: lookup.seatOfPlayer(event.controller) });
        break;
      case 'resolved': {
        const target = lookup.strikeSeat(event.cardId);
        if (target !== null) {
          out.push({ kind: 'strike', seat: target });
          break;
        }
        const caster = lookup.seatOfCard(event.cardId);
        if (caster !== null) out.push({ kind: 'cast', seat: caster });
        break;
      }
      case 'turn':
        out.push({ kind: 'turn', seat: lookup.seatOfPlayer(event.player) });
        break;
      case 'outcome':
        out.push({ kind: 'outcome', seat: null });
        break;
      default:
        break;
    }
  }
  return out;
}

/**
 * The {@link BeatLookup} for a real frame: the board on screen, the board one
 * frame before it (the strike's aim, exactly as T6's `strikeParams` reads it),
 * and the viewer's id — the seat at +Z.
 */
export function lookupFor(
  board: GameStateBody | null,
  previous: GameStateBody | null,
  viewerId: number | null,
): BeatLookup {
  const seatOfPlayer = (playerId: number): Seat =>
    viewerId === null || playerId === viewerId ? 'you' : 'opp';
  const controllerSeat = (on: GameStateBody | null, cardId: number): Seat | null => {
    if (on === null) return null;
    const card = findCard(on, cardId) as { controller?: number | null } | undefined;
    const controller = card?.controller ?? null;
    return controller === null ? null : seatOfPlayer(controller);
  };
  const seatOfCard = (cardId: number): Seat | null =>
    controllerSeat(board, cardId) ?? controllerSeat(previous, cardId);
  return {
    seatOfPlayer,
    seatOfCard,
    strikeSeat(cardId: number): Seat | null {
      if (previous === null) return null;
      for (let i = previous.stack.length - 1; i >= 0; i--) {
        const item = previous.stack[i];
        if (item === undefined || item.sourceCardId !== cardId) continue;
        const card = item.targetCardIds[0];
        if (card !== undefined) return seatOfCard(card);
        const player = item.targetPlayerIds[0];
        return player === undefined ? null : seatOfPlayer(player);
      }
      return null;
    },
  };
}

// ---------------------------------------------------------------------------
// The director (§8 rules 1, 2, 4, 5, 7)
// ---------------------------------------------------------------------------

/** Everything the director needs from the world, injected so it stays pure. */
export interface DirectorWorld {
  /** Anchor → world point, or `null` when this frame cannot place it (§3.6 rule 1). */
  resolve(ref: AnchorRef): [number, number, number] | null;
  /** The viewer's own hand anchor, for rule 6. Ignored while spectating. */
  hand: Point3 | null;
  /** The viewer's own battlefield anchor, for rule 6. Ignored while spectating. */
  battlefield: Point3 | null;
  aspect: number;
  /** §5.3's predicate. Rule 5 is written in terms of it. */
  awaitingHuman: boolean;
  mode: 'replay' | 'live';
  reducedMotion: boolean;
}

export type RequestOutcome = 'taken' | 'dropped' | 'released';

/**
 * - `cue` — a cue's out-hold-back swoop (§8), which ends at home;
 * - `retire` — rule 5 / a release getting a cue move out of the way;
 * - `view` — T8: the camera travelling to a newly chosen home (a cut when
 *   `ms` is 0), which ends *at* the new home.
 */
type MoveKind = 'cue' | 'retire' | 'view';

interface Move {
  kind: MoveKind;
  from: Orbit;
  to: Orbit;
  startedAt: number;
  /** How long the whole in-hold-out envelope lasts. */
  ms: number;
  priority: number;
  /** A cut has no ease-in: frame 1 is already there. */
  cut: boolean;
  shakeAmplitude: number;
  shakeMs: number;
}

/** What the renderer should do with the camera this frame. */
export interface CameraFrame {
  /**
   * The pose to write, or `null` for "leave the camera to `OrbitControls`".
   * `null` is the common case: most frames have no camera cue at all.
   */
  pose: Pose | null;
  /** Additive shake offset in world units, already bounded by {@link SHAKE}. */
  shake: [number, number, number];
  /** True while the director owns the camera — the controls are disabled. */
  holding: boolean;
}

const NO_SHAKE: [number, number, number] = [0, 0, 0];

const easeInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** The envelope of a camera move: out, hold, back. Its last value is always 0. */
export function moveEnvelope(t: number, cut = false): number {
  const x = clamp(t, 0, 1);
  const out = cut ? 0.001 : 0.3;
  const back = 0.72;
  if (x < out) return easeInOut(x / out);
  if (x < back) return 1;
  return 1 - easeInOut((x - back) / (1 - back));
}

/**
 * §8 rule 7 — a decaying two-axis wobble, deterministic in `elapsed` so it is
 * testable and so two frames of the same instant agree.
 */
export function shakeAt(elapsedMs: number, amplitude: number, ms: number): [number, number, number] {
  if (amplitude <= 0 || ms <= 0 || elapsedMs >= ms) return NO_SHAKE;
  const decay = 1 - elapsedMs / ms;
  const a = Math.min(amplitude, SHAKE.maxAmplitude) * decay * decay;
  return [a * Math.sin(elapsedMs * 0.061), 0, a * Math.sin(elapsedMs * 0.083 + 1.7)];
}

/** How a move blends at `t`: a cue's out-hold-back, or a straight ease for the rest. */
function blendOf(move: Move, t: number): number {
  return move.kind === 'cue' ? moveEnvelope(t, move.cut) : easeInOut(clamp(t, 0, 1));
}

/** The free-orbit memory is per view AND per box: a spectator's orbit is not a seat's. */
function freeKey(view: ViewId, spectator: boolean): string {
  return spectator ? `${view}/spectator` : view;
}

/** What {@link CameraDirector.applyView} was asked to do. */
export interface ViewCommand {
  view: CameraChoice;
  spectator: boolean;
  /** A key or a button was pressed — as opposed to the choice being re-derived. */
  pressed: boolean;
  reducedMotion: boolean;
  now: number;
  /** Where the camera actually is, so the move starts there and not at a stale home. */
  current?: Pose | null;
}

/**
 * **The camera lane.** One move at a time, a home to return to, and five of
 * §8's rules enforced here rather than in any cue.
 *
 * It is a plain object with an injected clock: `request(...)`, `applyView(...)`,
 * `direct(...)` and `tick(now)` are the whole API, and `web/test/camera.test.ts`
 * drives all four with numbers.
 */
export class CameraDirector {
  /** Rule 1 — where the camera lives when nothing is happening: the selected view. */
  home: Orbit = orbitFromPose(REST_POSE);
  /** The box the user's orbit and every solved pose live in. */
  clamps: OrbitClamps = ORBIT_CLAMPS;
  /** T8 — spectator mode: wider clamps, the second dwell table, no hand band. */
  spectator = false;
  /** T8 — what is selected. */
  view: CameraChoice = 'table';
  /** T8 — the auto director's shot, while {@link view} is `director`. */
  shot: Shot | null = null;

  #move: Move | null = null;
  #lastUserInputAt = Number.NEGATIVE_INFINITY;
  #shakeStartedAt = 0;
  #applied = false;
  /** T8 — the last free orbit of each view, until its key is pressed again. */
  readonly #free = new Map<string, Orbit>();
  /** Diagnostics for the dev overlay and the evidence: taken / dropped / why. */
  readonly stats = { taken: 0, dropped: 0, retired: 0, views: 0, cuts: 0 };

  /**
   * §3.5 — the user moved the camera: their pose becomes home, cues back off.
   * **T8:** it is also remembered as that view's free orbit, so leaving the
   * view and coming back finds the camera where they left it.
   */
  noteUserInput(now: number, pose?: Pose): void {
    this.#lastUserInputAt = now;
    if (pose !== undefined) {
      this.home = clampOrbit(orbitFromPose(pose), this.clamps);
      if (this.view !== 'director') this.#free.set(freeKey(this.view, this.spectator), this.home);
    }
    // Rule: never fight the user. A move in flight ends immediately, not in
    // 600 ms — the user is holding the mouse button down right now.
    this.#move = null;
  }

  /** When the user last touched the camera — the director's override clock. */
  get lastUserInputAt(): number {
    return this.#lastUserInputAt;
  }

  /** True while §3.5's five-second override window is open. */
  userHolds(now: number): boolean {
    const window = this.spectator ? SPECTATOR_DWELL.userOverrideMs : DWELL.userOverrideMs;
    return now - this.#lastUserInputAt < window;
  }

  /** Whether a remembered free orbit exists for this view in the current box. */
  hasFreeOrbit(view: ViewId): boolean {
    return this.#free.has(freeKey(view, this.spectator));
  }

  get active(): boolean {
    return this.#move !== null;
  }

  /**
   * **T8 — select a view, or the auto director**, and make it home.
   *
   * - a different view: travel to its remembered free orbit if there is one,
   *   else to its canonical pose — over {@link VIEW_EASE_MS}, or a cut under
   *   reduced motion (rule 7) and on the very first call (the page opens there);
   * - **the view you are on, pressed again**: drop your free orbit of it and go
   *   back to the canonical pose; with no free orbit there is nothing to do;
   * - a change of box (spectator on/off): re-seat into the new box's memory.
   *
   * Returns what it did, so the renderer knows whether to take the controls.
   */
  applyView(command: ViewCommand): 'moved' | 'reset' | 'none' {
    const { view, spectator, pressed, reducedMotion, now } = command;
    const boxChanged = spectator !== this.spectator;
    const viewChanged = view !== this.view;
    const first = !this.#applied;
    this.spectator = spectator;
    this.clamps = spectator ? SPECTATOR_CLAMPS : ORBIT_CLAMPS;
    this.#applied = true;
    if (!first && !boxChanged && !viewChanged && !pressed) return 'none';
    this.view = view;

    let target: Orbit;
    let outcome: 'moved' | 'reset' = 'moved';
    if (view === 'director') {
      if (this.shot === null || viewChanged || first) this.shot = startShot(now);
      else if (!boxChanged) return 'none';
      target = viewOrbit(this.shot.view);
    } else {
      this.shot = null;
      const key = freeKey(view, spectator);
      const remembered = this.#free.get(key);
      const again = pressed && !viewChanged && !boxChanged && !first;
      if (again) {
        if (remembered === undefined) return 'none';
        this.#free.delete(key);
        target = viewOrbit(view);
        outcome = 'reset';
      } else {
        target = remembered ?? viewOrbit(view);
      }
    }
    const ms = first || reducedMotion ? 0 : spectator ? VIEW_EASE_MS.spectator : VIEW_EASE_MS.seat;
    this.#startViewMove(clampOrbit(target, this.clamps), now, ms, command.current ?? null);
    return outcome;
  }

  /**
   * **T8 — the auto director's half**: feed it a batch's beats. Returns `true`
   * when it cut. A cut is a cut — never an ease — and a cue swoop in flight is
   * abandoned for it, because the shot changed under it.
   */
  direct(beats: readonly Beat[], now: number): boolean {
    if (this.view !== 'director' || this.shot === null) return false;
    const next = directShot(beats, this.shot, now, { userInputAt: this.#lastUserInputAt });
    if (next === this.shot) return false;
    const cut = next.view !== this.shot.view;
    this.shot = next;
    if (!cut) return false;
    this.stats.cuts += 1;
    this.#startViewMove(clampOrbit(viewOrbit(next.view), this.clamps), now, 0, null);
    return true;
  }

  /**
   * §8 rules 2, 4, 5, 6 and 7, in one method.
   *
   * `null` releases the lane. A request is **dropped** (not queued) when a
   * higher- or equal-priority move is live, when the user has the camera, when
   * the engine is waiting on the human, under reduced motion, or when the
   * solved pose would lose the viewer's own hand.
   */
  request(request: CameraRequest | null, now: number, world: DirectorWorld): RequestOutcome {
    if (request === null) {
      // A release ends a CUE's shot. A view the user chose is not a shot.
      if (this.#move !== null && this.#move.kind === 'cue') this.#retire(now);
      return 'released';
    }
    // Rule 5 — the engine is waiting on the human. Nothing moves, and anything
    // that is moving gets out of the way.
    if (world.awaitingHuman) {
      if (this.#move !== null && this.#move.kind === 'cue') this.#retire(now);
      this.stats.dropped += 1;
      return 'dropped';
    }
    if (world.reducedMotion || this.userHolds(now)) {
      this.stats.dropped += 1;
      return 'dropped';
    }
    // Rule 2 — strictly higher preempts; equal or lower is dropped.
    const live = this.#move;
    if (live !== null && live.kind !== 'retire' && request.priority <= live.priority) {
      this.stats.dropped += 1;
      return 'dropped';
    }

    const shakeAmplitude = Math.min(Math.max(request.shake, 0), 1) * SHAKE.maxAmplitude;
    const points: Array<[number, number, number]> = [];
    for (const ref of request.frame) {
      const point = world.resolve(ref);
      if (point !== null) points.push(point);
    }

    // A shake-only request (no frameable anchor) is legal and common: the
    // lethal-damage cue asks for a jolt, not a shot.
    if (points.length === 0) {
      if (shakeAmplitude <= 0) {
        this.stats.dropped += 1;
        return 'dropped';
      }
      this.#shakeStartedAt = now;
      this.#armShakeOnly(shakeAmplitude, request);
      this.stats.taken += 1;
      return 'taken';
    }

    // Rule 4, and T8's second table: a spectator's moves are slower and may
    // hold longer, because nobody is waiting to click.
    const dwell = this.spectator
      ? SPECTATOR_DWELL.moveMs
      : world.mode === 'replay'
        ? DWELL.replayMs
        : DWELL.liveMs;
    const slow = this.spectator ? SPECTATOR_DWELL.slow : 1;
    const ms = Math.max(120, Math.min(request.ms * slow, dwell));
    const pose = solveFraming(points, this.home, {
      padding: request.padding,
      tilt: request.tilt,
      aspect: world.aspect,
      // A spectator has no seat to keep framed (T8): no hand band.
      hand: this.spectator ? null : world.hand,
      battlefield: this.spectator ? null : world.battlefield,
      clamps: this.clamps,
    });
    if (pose === null) {
      // Rule 6 — the move is dropped, not corrected.
      this.stats.dropped += 1;
      return 'dropped';
    }

    this.#move = {
      kind: 'cue',
      from: this.#currentOrbit(now),
      to: clampOrbit(orbitFromPose(pose), this.clamps),
      startedAt: now,
      ms,
      priority: request.priority,
      cut: request.cut === true,
      shakeAmplitude,
      shakeMs: Math.min(request.ms, SHAKE.maxMs),
    };
    this.#shakeStartedAt = now;
    this.stats.taken += 1;
    return 'taken';
  }

  /** What the camera should be this frame. Allocation is two small arrays. */
  tick(now: number, world?: Pick<DirectorWorld, 'awaitingHuman' | 'reducedMotion'>): CameraFrame {
    const move = this.#move;
    if (move === null) return { pose: null, shake: NO_SHAKE, holding: false };

    // Rule 5, checked every frame and not only at request time: the engine can
    // start waiting in the middle of a swoop. A view the user chose is exempt.
    if (world !== undefined && (world.awaitingHuman || world.reducedMotion) && move.kind === 'cue') {
      this.#retire(now);
      return this.tick(now);
    }

    const t = move.ms <= 0 ? 1 : (now - move.startedAt) / move.ms;
    if (t >= 1) {
      this.#move = null;
      // Rule 1's guarantee, stated as code: the last frame of every move is
      // home, so releasing the lane can never leave the camera adrift.
      return { pose: poseFromOrbit(this.home), shake: NO_SHAKE, holding: false };
    }
    const orbit = lerpOrbit(move.from, move.to, blendOf(move, t));
    const shake =
      move.shakeAmplitude > 0
        ? shakeAt(now - this.#shakeStartedAt, move.shakeAmplitude, move.shakeMs)
        : NO_SHAKE;
    return { pose: poseFromOrbit(orbit), shake, holding: true };
  }

  /**
   * Drop everything and **snap home** — the camera half of `flushAndSnap()`
   * and of `K`.
   *
   * It used to drop the move and hand the controls back wherever the camera
   * happened to be, which left a skipped swoop frozen mid-air — and the first
   * `OrbitControls` update after that fired `change`, which made the mid-air
   * pose the new home. Rule 1 says the camera always returns: the next `tick`
   * writes home, once, and releases.
   */
  reset(): void {
    if (this.shot !== null && this.shot.pending !== null) this.shot = { ...this.shot, pending: null };
    if (this.#move === null) return;
    this.#move = {
      kind: 'view',
      from: this.home,
      to: this.home,
      startedAt: 0,
      ms: 0,
      priority: VIEW_PRIORITY,
      cut: true,
      shakeAmplitude: 0,
      shakeMs: 0,
    };
  }

  #currentOrbit(now: number): Orbit {
    const move = this.#move;
    if (move === null) return this.home;
    const t = move.ms <= 0 ? 1 : (now - move.startedAt) / move.ms;
    // A finished move of any kind has put the camera at home (rule 1).
    if (t >= 1) return this.home;
    return lerpOrbit(move.from, move.to, blendOf(move, t));
  }

  #startViewMove(to: Orbit, now: number, ms: number, current: Pose | null): void {
    const from = current !== null ? orbitFromPose(current) : this.#currentOrbit(now);
    this.home = to;
    this.stats.views += 1;
    this.#move = {
      kind: 'view',
      from,
      to,
      startedAt: now,
      ms,
      priority: VIEW_PRIORITY,
      cut: ms <= 0,
      shakeAmplitude: 0,
      shakeMs: 0,
    };
  }

  /**
   * Rule 5 / rule 4 — ease home over {@link SNAP_HOME_MS} and take nothing new.
   *
   * **From where the camera is, TO home** (T8 fix). The blend used to be
   * `1 − ease(t)` over `from → home`, which put the camera at home on the first
   * frame and then drifted it back OUT toward the swoop for 200 ms before the
   * last frame jumped it home again — a flick, on exactly the frame the engine
   * started waiting on the player.
   */
  #retire(now: number): void {
    const move = this.#move;
    if (move === null) return;
    this.stats.retired += 1;
    this.#move = {
      ...move,
      kind: 'retire',
      from: this.#currentOrbit(now),
      to: this.home,
      startedAt: now,
      ms: SNAP_HOME_MS,
      shakeAmplitude: 0,
    };
  }

  #armShakeOnly(amplitude: number, request: CameraRequest): void {
    const home = this.home;
    this.#move = {
      kind: 'cue',
      from: home,
      to: home,
      startedAt: this.#shakeStartedAt,
      ms: Math.min(Math.max(request.ms, 120), SHAKE.maxMs),
      priority: request.priority,
      cut: true,
      shakeAmplitude: amplitude,
      shakeMs: Math.min(Math.max(request.ms, 120), SHAKE.maxMs),
    };
  }
}
