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
 *    at view 1's elevation: its identifying side. Since D143 a seat's figures face
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

export type CameraMode = 'front' | 'close' | 'table' | 'wide' | 'inspect';

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

// ---------------------------------------------------------------------------
// INSPECT (the personal tier, D196): the card's art behind the figure
// ---------------------------------------------------------------------------

/**
 * **The art box of a card image**, as fractions of a Scryfall `normal` image
 * (488 × 680, the modern frame): left, right, top and bottom of the painting.
 * Measured on the frame, not per card; a full-art or showcase frame is a
 * follow-up (PLAN.md, the relief window). `tools/personal/relief.mjs` cuts its
 * depth maps with this same box and records it, so moving it makes every map
 * stale (`relief.ts`'s reader then draws the backdrop flat until the tool runs).
 */
export const ART_BOX = Object.freeze({ left: 0.08, right: 0.92, top: 0.112, bottom: 0.555 });
/** The art box's aspect (width over height) on a 488 × 680 image. */
export const ART_ASPECT = ((ART_BOX.right - ART_BOX.left) * 488) / ((ART_BOX.bottom - ART_BOX.top) * 680);
/** A card's aspect (width over height). */
export const CARD_ASPECT = 488 / 680;

/** A vertical plane: its centre, the Y turn that makes it face `front`, and its size. */
export interface Panel {
  position: Vec3;
  rotationY: number;
  width: number;
  height: number;
}

/** What the inspect view stands where: the camera, the art behind the figure, and the frame beside it. */
export interface InspectLayout {
  camera: Pose;
  /**
   * The painting: its plane is the WINDOW — where the flat picture stands, and
   * where the relief's nearest point stands (`relief.ts`'s vertex shader sends
   * every farther point back from it, along its ray from the camera).
   */
  backdrop: Panel;
  frame: Panel;
  /** How far behind the figure's stand point the window — the painting's NEAREST point — stands, in world units. */
  window: number;
  /** How far behind the window the painting's FARTHEST point stands, in world units — 0 when flat. */
  relief: number;
}

/**
 * **Where the window stands**: the painting's nearest point is this many figure
 * heights behind the figure's stand point (D226). Measured, not chosen: over every
 * figure the catalog stands (`workshop.test.ts`), the farthest any body or prop
 * reaches behind its stand point is 0.60 of its height at rest (the Air Force's
 * swarm) and 0.75 in a clip (a drone's attack wind-up) — so 0.8 clears both, where
 * the flat backdrop's 0.7 let the drone's wind-up through. The clip number is
 * dense, not sampled: every distinct body, every clip but `die`, at 61 phases and
 * every keyframe, every vertex (9,824 clip phases) gives 0.752, and the test holds
 * the window 0.02 clear of it (the fix pass: eleven phases and every second vertex
 * could have stepped over a peak). Only `die` reaches
 * past it (a body falls ~0.89 of its height backward, a drone ~1.46): a death
 * rehearsed on the inspect view falls into the painting, as it fell through the
 * flat one (PLAN.md, the relief window's follow-up).
 */
export const INSPECT_WINDOW = 0.8;

/**
 * **A flying hull is framed by its length**: the inspect view treats a Vehicle's
 * silhouette as a subject this many hull lengths tall, its middle 0.45 of that
 * above the composition's floor — so a 1.5-long carrier is framed as a 0.9-tall
 * figure, the size of a body, and its window stands behind the hull's middle.
 */
export const INSPECT_HULL = 0.6;

/**
 * **INSPECT**: the figure in its signature pose, the card's ART BOX enlarged as a
 * backdrop standing behind it, the card's frame and text as a panel floating at
 * its right, and a camera in front of the figure framing all three. Every
 * coordinate is from the framing — the pose's stand point, height and facing —
 * so the layout is `layout.ts`'s and the arena's, with the two planes added. A
 * card with no figure is framed as the close-up.
 *
 * **The relief** (D226): `reliefDepth` is `perf.ts`'s `RELIEF_DEPTH` when the
 * painting is drawn with its depth — a fraction of the backdrop's height — and 0
 * when it is flat. The painting then fills the slab from the window back: its
 * nearest point stays at the {@link INSPECT_WINDOW}, its farthest `relief`
 * behind it, so the figure is exactly as clear of it as of the flat picture. The
 * camera does not move with it: flat and relief are an A/B from one place.
 */
export function inspectLayout(framing: Framing, reliefDepth = 0): InspectLayout | null {
  const pose = framing.pose;
  if (pose === null) return null;
  // A Vehicle's silhouette flies, and its `height` is the hull's THICKNESS: it is
  // framed by its LENGTH (`width`) instead, standing on a floor below its middle —
  // sized by its thickness the composition was a quarter of the hull's length and
  // the camera sat inside the hull (the Helicarrier, measured by this lane).
  const hull = pose.silhouette !== null;
  const h = hull ? INSPECT_HULL * pose.width : Math.max(0.3, pose.height);
  const fx = Math.sin(pose.facingY) * FIGURE_FRONT_Z;
  const fz = Math.cos(pose.facingY) * FIGURE_FRONT_Z;
  const turn = Math.atan2(fx, fz);
  // The camera's right, looking back at the figure's front.
  const rx = fz;
  const rz = -fx;
  const [px, poseY, pz] = pose.position;
  const py = hull ? poseY - 0.45 * h : poseY;
  const backHeight = 1.45 * h;
  const backWidth = backHeight * ART_ASPECT;
  const windowAt = INSPECT_WINDOW * h;
  const relief = Math.max(0, reliefDepth) * backHeight;
  const backdrop: Panel = {
    position: [px - fx * windowAt, py + backHeight / 2 - 0.02 * h, pz - fz * windowAt],
    rotationY: turn,
    width: backWidth,
    height: backHeight,
  };
  const frameHeight = 0.95 * h;
  const frame: Panel = {
    position: [px + rx * (0.5 * backWidth + 0.1 * h) + fx * 0.3 * h, py + 0.6 * h, pz + rz * (0.5 * backWidth + 0.1 * h) + fz * 0.3 * h],
    rotationY: turn - 0.45,
    width: frameHeight * CARD_ASPECT,
    height: frameHeight,
  };
  // Frame the backdrop and the panel from a camera at the figure's chest height,
  // a little above, looking back along its front — so the face under a hood reads.
  const centre: Vec3 = [px + rx * 0.2 * backWidth, py + 0.66 * h, pz + rz * 0.2 * backWidth];
  const radius = Math.hypot(0.5 * backWidth + 0.55 * frameHeight * CARD_ASPECT, 0.5 * backHeight);
  const distance = (radius / TAN_HALF) * 0.92;
  const lift = 0.06;
  const camera: Pose = {
    position: [centre[0] + fx * distance, centre[1] + lift * distance, centre[2] + fz * distance],
    target: centre,
  };
  return { camera, backdrop, frame, window: windowAt, relief };
}

export function poseFor(mode: CameraMode, framing: Framing, canvasHeight: number): Pose {
  if (mode === 'wide') return REST_POSE;
  if (mode === 'inspect') return inspectLayout(framing)?.camera ?? frontPose(framing);
  if (mode === 'table') return tablePose(framing, canvasHeight);
  if (mode === 'front') return frontPose(framing);
  return closePose(framing);
}
