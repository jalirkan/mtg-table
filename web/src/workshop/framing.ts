/*
 * mtg-table — workshop/framing.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Where the pedestal's camera stands**, as pure arithmetic over the arena's own
 * resting pose — `layout(state)` for the card, `figurePose` for the body — so the
 * workshop never invents a coordinate either (`layout.ts` stays the only module
 * that knows one).
 *
 * Four modes:
 *
 *  - **front (1×), the default** — the close-up from the side the figure FACES,
 *    at view 1's elevation: its identifying side. Since D126 a seat's figures face
 *    the other seat, so view 1's own direction shows your figure's BACK (the
 *    verification pass's finding: the judging tool opened on every figure from
 *    behind); `figurePose`'s `facingY` and `layout.ts`'s `FIGURE_FRONT_Z` say
 *    which way the front is, the preview turn and a trait's `turn` included;
 *  - **close (1×)** — the card and its figure filling the view, from the table
 *    view's own direction (report 09 §3.5's rest pose): what your seat sees, to
 *    orbit freely;
 *  - **table distance** — the figure at exactly the size it has in view 1 at
 *    **1600 × 900**: the camera keeps view 1's orientation and sits on the axis
 *    through the figure at `depth × canvasHeight / 900`, where `depth` is how far
 *    in front of view 1's camera the figure stands. Pixel size is
 *    `height × canvasHeight / (2 · depth · tan(fov/2))`, so scaling the depth by
 *    the canvas height makes it the 900-px frame's number on any canvas (the
 *    figure is then on the axis rather than where view 1 has it on screen — a few
 *    degrees of perspective, not a size);
 *  - **whole table** — view 1 itself.
 *
 * **What the caption says is not computed here.** `pose.height` is the figure's
 * NOMINAL height — the scale its model is drawn at — and {@link tablePixels} of it
 * is a perpendicular projection, which is neither the body's drawn extent (a rig
 * in its rest clip is shorter or taller than 1.0, a hat or a crouch changes it)
 * nor view 1's oblique angle on it: Peggy's nominal 70 px is 61 px drawn, the
 * Doombot's 50 is 56, the giant ant's 100 is 127 (`workshop.test.ts` prints them
 * every run). The caption's number is
 * `legibility.ts`'s `drawnHeightPx` — the real skinned vertices projected through
 * view 1 — and `workshop.test.ts` holds the table-distance camera to it.
 *
 * `[NO three]`: plain numbers, tested under `node --test`.
 */

import { CAMERA, REST_POSE, type Pose } from '../arena/camera.ts';
import type { FigureLayout, FigurePose } from '../arena/figures/pose.ts';
import { CARD_W, FIGURE_FRONT_Z, anchorsFor, placementOf, type Layout } from '../arena/layout.ts';

export type CameraMode = 'front' | 'close' | 'table' | 'wide';

/** The canvas height view 1's pixel sizes are quoted at. */
export const TABLE_FRAME_HEIGHT = 900;

export type Vec3 = [number, number, number];

export interface Framing {
  /** What the camera looks at: the figure's middle, or the card's. */
  centre: Vec3;
  /** A sphere about `centre` holding the card and its figure. */
  radius: number;
  /** Whether a body stands for the card (a spell, a land and a stub have none). */
  hasFigure: boolean;
  /** The body's NOMINAL height in world units — 0 for no body, and for a disc (no model). */
  figureHeight: number;
  /** The figure's resting pose, for the caption's drawn height; `null` for no figure. */
  pose: FigurePose | null;
}

const MIN_RADIUS = 0.42;

/**
 * The framing of one card on the pedestal: its card plane (and, for a spell, its
 * form at the casting anchor) and its figure, if it has one.
 */
export function framingOf(placed: Layout, poses: FigureLayout, cardId: number): Framing {
  const points: Vec3[] = [];
  const pose = poses.get(cardId);
  const placement = placementOf(placed, cardId);
  if (placement !== null) {
    const [x, y, z] = placement.position;
    // The card lies flat: its four edges, a card height long and CARD_W wide.
    points.push([x - CARD_W / 2, y, z - 0.5], [x + CARD_W / 2, y, z + 0.5]);
    if (placement.kind === 'stack') {
      const casting = anchorsFor(placement.seat).casting;
      points.push([casting.x, casting.y, casting.z], [casting.x, casting.y + 0.6, casting.z]);
    }
  }
  if (pose !== undefined) {
    const [x, y, z] = pose.position;
    const half = Math.max(pose.width, 0.2) / 2;
    points.push([x - half, y, z - half], [x + half, y + pose.height, z + half]);
  }
  if (points.length === 0) return { centre: [0, 0, 0], radius: 1, hasFigure: false, figureHeight: 0, pose: null };
  const lo: Vec3 = [Infinity, Infinity, Infinity];
  const hi: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let i = 0; i < 3; i++) {
      lo[i] = Math.min(lo[i]!, p[i]!);
      hi[i] = Math.max(hi[i]!, p[i]!);
    }
  }
  // With a figure, look at the figure's middle — it is what is being workshopped;
  // the card's centre is in the sphere either way.
  const centre: Vec3 =
    pose !== undefined
      ? [pose.position[0], pose.position[1] + pose.height / 2, pose.position[2]]
      : [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  let radius = MIN_RADIUS;
  for (const p of points) radius = Math.max(radius, Math.hypot(p[0] - centre[0], p[1] - centre[1], p[2] - centre[2]));
  return {
    centre,
    radius,
    hasFigure: pose !== undefined,
    figureHeight: pose !== undefined && pose.modelId !== null ? pose.height : 0,
    pose: pose ?? null,
  };
}

/** View 1's forward direction, unit length. */
export function tableForward(): Vec3 {
  const [px, py, pz] = REST_POSE.position;
  const [tx, ty, tz] = REST_POSE.target;
  const d: Vec3 = [tx - px, ty - py, tz - pz];
  const n = Math.hypot(d[0], d[1], d[2]);
  return [d[0] / n, d[1] / n, d[2] / n];
}

const TAN_HALF = Math.tan((CAMERA.fov * Math.PI) / 360);

/** Close-up: the sphere fills about 90% of the height, from view 1's direction. */
export function closePose(framing: Framing): Pose {
  const f = tableForward();
  const distance = (framing.radius / TAN_HALF) * 1.08;
  const [cx, cy, cz] = framing.centre;
  return { position: [cx - f[0] * distance, cy - f[1] * distance, cz - f[2] * distance], target: [cx, cy, cz] };
}

/**
 * **Front (1×)**: the close-up's distance and elevation, from the side the
 * figure faces — view 1's forward turned about the vertical so that it looks
 * AGAINST the figure's front. A card with no figure is framed as the close-up.
 */
export function frontPose(framing: Framing): Pose {
  if (framing.pose === null) return closePose(framing);
  const f = tableForward();
  const across = Math.hypot(f[0], f[2]);
  const facing = framing.pose.facingY;
  // The figure's front in the world (figure space faces FIGURE_FRONT_Z · +Z).
  const fx = Math.sin(facing) * FIGURE_FRONT_Z;
  const fz = Math.cos(facing) * FIGURE_FRONT_Z;
  const forward: Vec3 = [-fx * across, f[1], -fz * across];
  const distance = (framing.radius / TAN_HALF) * 1.08;
  const [cx, cy, cz] = framing.centre;
  return {
    position: [cx - forward[0] * distance, cy - forward[1] * distance, cz - forward[2] * distance],
    target: [cx, cy, cz],
  };
}

/** How far in front of view 1's camera a point stands, along its axis. */
export function tableDepthOf(point: readonly [number, number, number]): number {
  const f = tableForward();
  const [px, py, pz] = REST_POSE.position;
  return (point[0] - px) * f[0] + (point[1] - py) * f[1] + (point[2] - pz) * f[2];
}

/** Table distance: the view-1 pixel size at 1600 × 900, on a canvas `canvasHeight` CSS px tall. */
export function tablePose(framing: Framing, canvasHeight: number): Pose {
  const f = tableForward();
  const depth = tableDepthOf(framing.centre) * (Math.max(1, canvasHeight) / TABLE_FRAME_HEIGHT);
  const [cx, cy, cz] = framing.centre;
  return { position: [cx - f[0] * depth, cy - f[1] * depth, cz - f[2] * depth], target: [cx, cy, cz] };
}

/**
 * How tall something `height` world units tall at `point` would be in view 1 at
 * 1600 × 900, in CSS px, **seen square-on** — the scale the table-distance camera
 * is set from. Not a figure's drawn height: see the header.
 */
export function tablePixels(height: number, point: readonly [number, number, number]): number {
  return (height * TABLE_FRAME_HEIGHT) / (2 * tableDepthOf(point) * TAN_HALF);
}

export function poseFor(mode: CameraMode, framing: Framing, canvasHeight: number): Pose {
  if (mode === 'wide') return REST_POSE;
  if (mode === 'table') return tablePose(framing, canvasHeight);
  if (mode === 'front') return frontPose(framing);
  return closePose(framing);
}
