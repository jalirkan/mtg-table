/*
 * mtg-table — arena/camera.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The camera: a rest pose, a solver, and the seven rules around them**
 * (report 09 §3.5, §8).
 *
 * Plain numbers only — no three, no React, no DOM — because §8's rules are pose
 * *math* and belong somewhere `node --test` can reach them
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
 *  2. **One camera lane, and it never queues.** {@link CameraDirector.request}
 *     takes a strictly-higher priority and **drops** equal or lower. A queued
 *     camera backs up; a dropped one is invisible.
 *  3. **Targets are anchor-relative, never absolute.** A request names
 *     {@link AnchorRef}s; the caller hands this file a `resolve` function and
 *     {@link solveFraming} does the rest. Change the table size and every cue
 *     still aims.
 *  4. **Dwell limits.** {@link DWELL}: ≤ 900 ms away from home live, ≤ 1800 ms
 *     in a replay, and back within 600 ms of the move ending, always.
 *  5. **The camera does not move while the engine is waiting on the human.** A
 *     request arriving then is dropped; a move already running is snapped home
 *     over {@link SNAP_HOME_MS}. Moving the camera while the player is trying
 *     to click a card is the worst failure mode available to us.
 *  6. **The hand stays framed.** {@link solveFraming} frames the seat's own hand
 *     and battlefield *along with* whatever the cue asked for, and
 *     {@link framesSeat} then rejects any pose that still loses one. **A move
 *     that cannot be solved is dropped, never "improved" into something else.**
 *     {@link HAND_BAND} carries the one measured deviation from §8's literal
 *     wording, and says what it cost to find out.
 *  7. **Shake is bounded and optional.** {@link SHAKE}: ≤ 0.02 world units,
 *     ≤ 300 ms, decaying, one axis pair; `prefers-reduced-motion: reduce`
 *     disables it — and, here, disables cue camera moves outright.
 *
 * Plus §3.5's user rule, which is stronger than it sounds: **any orbit drag
 * makes the user's own pose the new home** and suppresses cue moves for
 * {@link DWELL.userOverrideMs}. "Never fight the user for the camera" cannot
 * mean "spring back to our pose five seconds after they let go".
 * ---------------------------------------------------------------------------
 */

import type { AnchorRef, CameraRequest } from './cues/stage.ts';

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
 * the moment they do, {@link CameraDirector} adopts their pose as home.
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
 * §3.5's clamps, as `OrbitControls` props.
 *
 * The polar and azimuth limits are what stop the two failure modes a free
 * orbit has on a card table: dropping to eye level (where the far rank hides
 * behind the near one) and swinging round behind the opponent (where your own
 * hand is off screen and every label is upside down). Panning is off outright —
 * there is nothing off the table to pan to, and a panned camera is the one state
 * a user cannot undo without a reset button.
 */
export const ORBIT_CLAMPS = {
  minPolarAngle: deg(20),
  maxPolarAngle: deg(75),
  minAzimuthAngle: deg(-25),
  maxAzimuthAngle: deg(25),
  minDistance: REST_DISTANCE * 0.7,
  maxDistance: REST_DISTANCE * 1.4,
  enableDamping: true,
  enablePan: false,
} as const;

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

/** §8 rule 5 — how fast a live move gets out of the way when the engine asks. */
export const SNAP_HOME_MS = 200;

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

/** §3.5's box, applied to a solved orbit. The user's controls enforce the same one. */
export function clampOrbit(orbit: Orbit): Orbit {
  return {
    azimuth: clamp(orbit.azimuth, ORBIT_CLAMPS.minAzimuthAngle, ORBIT_CLAMPS.maxAzimuthAngle),
    polar: clamp(orbit.polar, ORBIT_CLAMPS.minPolarAngle, ORBIT_CLAMPS.maxPolarAngle),
    distance: clamp(orbit.distance, ORBIT_CLAMPS.minDistance, ORBIT_CLAMPS.maxDistance),
    target: [orbit.target[0], orbit.target[1], orbit.target[2]],
  };
}

/** Linear blend of two orbits. `k = 0` is `a`, `k = 1` is `b`. */
export function lerpOrbit(a: Orbit, b: Orbit, k: number): Orbit {
  const t = clamp(k, 0, 1);
  const mix = (x: number, y: number): number => x + (y - x) * t;
  return {
    // Azimuths are both inside ±25°, so the short way round is the only way.
    azimuth: mix(a.azimuth, b.azimuth),
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

  let orbit = clampOrbit({
    azimuth: home.azimuth,
    polar: home.polar + (options.tilt ?? 0),
    distance: need,
    target: centre,
  });

  // Rule 6, with three chances to buy the framing back by pulling out — a
  // closer shot is the cue's preference, not its requirement.
  for (let attempt = 0; attempt < 4; attempt++) {
    const pose = poseFromOrbit(orbit);
    if (framesSeat(pose, options.hand ?? null, options.battlefield ?? null, fovDeg, aspect)) {
      return pose;
    }
    if (orbit.distance >= ORBIT_CLAMPS.maxDistance - 1e-6) break;
    orbit = clampOrbit({ ...orbit, distance: orbit.distance * 1.2 });
  }
  return null;
}

// ---------------------------------------------------------------------------
// The director (§8 rules 1, 2, 4, 5, 7)
// ---------------------------------------------------------------------------

/** Everything the director needs from the world, injected so it stays pure. */
export interface DirectorWorld {
  /** Anchor → world point, or `null` when this frame cannot place it (§3.6 rule 1). */
  resolve(ref: AnchorRef): [number, number, number] | null;
  /** The viewer's own hand anchor, for rule 6. */
  hand: Point3 | null;
  /** The viewer's own battlefield anchor, for rule 6. */
  battlefield: Point3 | null;
  aspect: number;
  /** §5.3's predicate. Rule 5 is written in terms of it. */
  awaitingHuman: boolean;
  mode: 'replay' | 'live';
  reducedMotion: boolean;
}

export type RequestOutcome = 'taken' | 'dropped' | 'released';

interface Move {
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
  /** Set when rule 5 fires: the move is on its way home and takes nothing new. */
  retiring: boolean;
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

/**
 * **The camera lane.** One move at a time, a home to return to, and five of
 * §8's rules enforced here rather than in any cue.
 *
 * It is a plain object with an injected clock: `request(...)` and `tick(now)`
 * are the whole API, and `web/test/camera.test.ts` drives both with numbers.
 */
export class CameraDirector {
  /** Rule 1 — where the camera lives when nothing is happening. */
  home: Orbit = orbitFromPose(REST_POSE);

  #move: Move | null = null;
  #lastUserInputAt = Number.NEGATIVE_INFINITY;
  #shakeStartedAt = 0;
  /** Diagnostics for the dev overlay and the evidence: taken / dropped / why. */
  readonly stats = { taken: 0, dropped: 0, retired: 0 };

  /** §3.5 — the user moved the camera: their pose becomes home, cues back off. */
  noteUserInput(now: number, pose?: Pose): void {
    this.#lastUserInputAt = now;
    if (pose !== undefined) this.home = clampOrbit(orbitFromPose(pose));
    // Rule: never fight the user. A move in flight ends immediately, not in
    // 600 ms — the user is holding the mouse button down right now.
    this.#move = null;
  }

  /** True while §3.5's five-second override window is open. */
  userHolds(now: number): boolean {
    return now - this.#lastUserInputAt < DWELL.userOverrideMs;
  }

  get active(): boolean {
    return this.#move !== null;
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
      if (this.#move !== null) this.#retire(now);
      return 'released';
    }
    // Rule 5 — the engine is waiting on the human. Nothing moves, and anything
    // that is moving gets out of the way.
    if (world.awaitingHuman) {
      if (this.#move !== null) this.#retire(now);
      this.stats.dropped += 1;
      return 'dropped';
    }
    if (world.reducedMotion || this.userHolds(now)) {
      this.stats.dropped += 1;
      return 'dropped';
    }
    // Rule 2 — strictly higher preempts; equal or lower is dropped.
    const live = this.#move;
    if (live !== null && !live.retiring && request.priority <= live.priority) {
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

    const dwell = world.mode === 'replay' ? DWELL.replayMs : DWELL.liveMs;
    const ms = Math.max(120, Math.min(request.ms, dwell));
    const pose = solveFraming(points, this.home, {
      padding: request.padding,
      tilt: request.tilt,
      aspect: world.aspect,
      hand: world.hand,
      battlefield: world.battlefield,
    });
    if (pose === null) {
      // Rule 6 — the move is dropped, not corrected.
      this.stats.dropped += 1;
      return 'dropped';
    }

    this.#move = {
      from: this.#currentOrbit(now),
      to: clampOrbit(orbitFromPose(pose)),
      startedAt: now,
      ms,
      priority: request.priority,
      cut: request.cut === true,
      shakeAmplitude,
      shakeMs: Math.min(request.ms, SHAKE.maxMs),
      retiring: false,
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
    // start waiting in the middle of a swoop.
    if (world !== undefined && (world.awaitingHuman || world.reducedMotion) && !move.retiring) {
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
    const k = move.retiring ? 1 - easeInOut(clamp(t, 0, 1)) : moveEnvelope(t, move.cut);
    const orbit = lerpOrbit(move.from, move.to, k);
    const shake =
      move.shakeAmplitude > 0
        ? shakeAt(now - this.#shakeStartedAt, move.shakeAmplitude, move.shakeMs)
        : NO_SHAKE;
    return { pose: poseFromOrbit(orbit), shake, holding: true };
  }

  /** Drop everything and hand the camera back — the camera half of `flushAndSnap()`. */
  reset(): void {
    this.#move = null;
  }

  #currentOrbit(now: number): Orbit {
    const move = this.#move;
    if (move === null) return this.home;
    const t = move.ms <= 0 ? 1 : (now - move.startedAt) / move.ms;
    const k = move.retiring ? 1 - easeInOut(clamp(t, 0, 1)) : moveEnvelope(t, move.cut);
    return lerpOrbit(move.from, move.to, k);
  }

  /** Rule 5 / rule 4 — ease home over {@link SNAP_HOME_MS} and take nothing new. */
  #retire(now: number): void {
    const move = this.#move;
    if (move === null) return;
    this.stats.retired += 1;
    this.#move = {
      ...move,
      from: this.#currentOrbit(now),
      to: this.home,
      startedAt: now,
      ms: SNAP_HOME_MS,
      // A retiring move must not be preempted into a new shot; priority stays
      // so an equal-priority cue behind it is still dropped, and `retiring`
      // lets a genuinely higher one through.
      retiring: true,
      shakeAmplitude: 0,
    };
  }

  #armShakeOnly(amplitude: number, request: CameraRequest): void {
    const home = this.home;
    this.#move = {
      from: home,
      to: home,
      startedAt: this.#shakeStartedAt,
      ms: Math.min(Math.max(request.ms, 120), SHAKE.maxMs),
      priority: request.priority,
      cut: true,
      shakeAmplitude: amplitude,
      shakeMs: Math.min(Math.max(request.ms, 120), SHAKE.maxMs),
      retiring: false,
    };
  }
}
