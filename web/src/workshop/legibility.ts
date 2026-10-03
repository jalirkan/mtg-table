/*
 * mtg-table — workshop/legibility.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The legibility meter: how many pixels of each prop reach the screen from the
 * table view, on both seats.**
 *
 * This is `web/test/prop-raster.ts`'s idea (D83), re-implemented for the browser —
 * that file reads `figures.glb` with `node:fs`, so a page cannot import it. What is
 * measured is the same: the REAL bodies (the arena's `ModelLibrary`, cloned by its
 * own `instantiateFigure`, held in its resting stance by `REST_CLIP_FOR` /
 * `REST_PHASE_FOR` with a zero-delta mixer, exactly as `CueRunner` holds it) and the
 * REAL prop field (`scene/props.ts`'s `PropField`, committed and bound once at
 * rest, as `FigureLayer` and `DiscField.bind` do), projected through
 * `camera.ts`'s table view at **1600 × 1000** — the frame `traits.test.ts` judges —
 * and scan-converted into a depth buffer. A prop's pixel counts iff its fragment is
 * nearer the lens than every depth-writing layer that is not the prop.
 *
 * **The bar is 48 pixels of AREA**, `traits.test.ts`'s `IDENTITY_MIN_PX` — about a
 * 7 × 7 patch. The meter also prints each prop's visible HEIGHT in pixels, which is
 * the number a person reading a photograph thinks in; at the table view a whole
 * figure is 45–75 px tall (a chibi; slice 4's proportioned bodies 60–100 px), so a
 * height bar of 48 would fail nearly everything and is not the bar. Like the test,
 * it counts pixels, not contrast (slice 3 follow-up 12).
 *
 * It is not a frame loop: it runs when the panel asks, on objects it builds and
 * disposes itself, and draws nothing.
 */

import * as THREE from 'three';

import { CAMERA, VIEW_BY_ID, type Pose } from '../arena/camera.ts';
import type { Presence } from '../arena/cues/types.ts';
import { REST_CLIP_FOR, REST_PHASE_FOR } from '../arena/figures/clips.ts';
import { figurePose, type FigureLayout, type FigurePose } from '../arena/figures/pose.ts';
import { COSTUME_SLOTS, familyOf } from '../arena/figures/props.ts';
import type { TraitData } from '../arena/figures/traits.ts';
import type { FigureData, ModelData } from '../arena/figures/types.ts';
import { layout } from '../arena/layout.ts';
import type { FigureRig, FigureRigMap } from '../arena/scene/figureRigs.ts';
import { COSTUME_ATTRIBUTE } from '../arena/scene/figureMaterial.ts';
import { clipFor, instantiateFigure, type ModelLibrary } from '../arena/scene/models.ts';
import { PropField, type PropOffsetSource } from '../arena/scene/props.ts';
import type { WorkshopEntry } from './catalog.ts';
import { turnPoses } from './facing.ts';
import { TABLE_FRAME_HEIGHT } from './framing.ts';
import { soloFigureId, soloState } from './synthetic.ts';

export const METER_WIDTH = 1600;
export const METER_HEIGHT = 1000;
/** `traits.test.ts`'s `IDENTITY_MIN_PX`. */
export const LEGIBLE_PX = 48;

const V = new THREE.Vector3();
/** The figure-space height the Kenney head starts at (`prop-raster.ts`'s `HEAD_FROM`). */
const HEAD_FROM = 0.53;
/**
 * Tier 2 slice 4: where the proportioned (`human`) body's head starts — its chin
 * (`prop-raster.ts`'s `HUMAN_HEAD_FROM`).
 */
const HUMAN_HEAD_FROM = 0.79;
/** The costume slots a head is made of (`prop-raster.ts`'s `HEAD_SLOTS`): skin and hair. */
const HEAD_SLOTS: ReadonlySet<number> = new Set([COSTUME_SLOTS.indexOf('skin'), COSTUME_SLOTS.indexOf('hair')]);
/** How far below its standing chin a head may still be a head (`prop-raster.ts`'s `HEAD_DROP`). */
const HEAD_DROP = 0.4;

interface Layer {
  tag: string;
  depthWrite: boolean;
  tris: number[];
}

/** No cue running: every offset identity, no clip. */
const RESTING: PropOffsetSource = {
  offsetOf: () => ({ dx: 0, dy: 0, dz: 0, scale: 1, opacity: 1, dissolve: 0, glow: 0, dRotY: 0 }),
  clipOf: () => null,
};

/** A living figure's rig in its resting stance — `FigureLayer`'s build plus `CueRunner`'s rest clip. */
function restingRig(pose: FigurePose, library: ModelLibrary): FigureRig | null {
  if (pose.modelId === null) return null;
  const model = library.get(pose.modelId);
  if (model === undefined) return null;
  const instance = instantiateFigure(model);
  const root = instance.object;
  root.position.set(pose.position[0], pose.position[1], pose.position[2]);
  root.rotation.set(0, pose.facingY, 0);
  root.scale.setScalar(pose.height);
  const restClip =
    clipFor(model, REST_CLIP_FOR[pose.stance], pose.clips[REST_CLIP_FOR[pose.stance]]) ??
    clipFor(model, 'idle', pose.clips['idle']);
  if (restClip !== null) {
    const action = instance.mixer.clipAction(restClip);
    action.play();
    action.time = REST_PHASE_FOR[pose.stance] * restClip.duration;
    action.setEffectiveWeight(1);
    // A zero delta scrubs and advances nothing (report 13 §3.4).
    instance.mixer.update(0);
  }
  const ring = pose.swarm > 0 && pose.formation === 'ring';
  for (const mesh of instance.meshes) mesh.visible = !ring;
  root.updateMatrixWorld(true);
  return {
    root,
    mixer: instance.mixer,
    actions: new Map(),
    restActions: new Map(),
    rest: null,
    clip: null,
    restTime: 0,
    material: { uniforms: { uOpacity: { value: pose.opacity } } } as unknown as FigureRig['material'],
    pose,
    appliedTint: null,
    appliedFrozen: false,
  };
}

/**
 * A rig's skinned meshes in world space, split at the head — `prop-raster.ts`'s
 * `bodyLayers`, rule for rule: a body whose vertices carry costume slots (slice 4's
 * `human` and the chibis) says where its head is by its skin and hair above
 * `headFrom − HEAD_DROP`; a body without them (the drone, the insect) splits at
 * its family's height. Both layers write depth, so the split moves no prop pixel
 * today — it is kept equal so that a meter row that ever reads the head alone
 * agrees with the test.
 */
function bodyLayers(rig: FigureRig, models: ModelData): Layer[] {
  const body: Layer = { tag: 'body', depthWrite: true, tris: [] };
  const head: Layer = { tag: 'head', depthWrite: true, tris: [] };
  const pose = rig.pose;
  const from = familyOf(pose.modelId, models) === 'human' ? HUMAN_HEAD_FROM : HEAD_FROM;
  rig.root.traverse((child) => {
    const mesh = child as THREE.SkinnedMesh;
    if (mesh.isSkinnedMesh !== true || !mesh.visible) return;
    const position = mesh.geometry.getAttribute('position');
    const slots = mesh.geometry.getAttribute(COSTUME_ATTRIBUTE) as THREE.BufferAttribute | undefined;
    const world = new Float32Array(position.count * 3);
    for (let i = 0; i < position.count; i++) {
      V.fromBufferAttribute(position, i);
      mesh.applyBoneTransform(i, V);
      V.applyMatrix4(mesh.matrixWorld);
      world[i * 3] = V.x;
      world[i * 3 + 1] = V.y;
      world[i * 3 + 2] = V.z;
    }
    const index = mesh.geometry.index;
    const count = index === null ? position.count : index.count;
    for (let t = 0; t + 2 < count; t += 3) {
      let y = 0;
      let onHead = 0;
      const tri: number[] = [];
      for (let k = 0; k < 3; k++) {
        const id = index === null ? t + k : index.getX(t + k);
        tri.push(world[id * 3]!, world[id * 3 + 1]!, world[id * 3 + 2]!);
        y += world[id * 3 + 1]!;
        if (slots !== undefined && HEAD_SLOTS.has(Math.round(slots.getX(id)))) onHead += 1;
      }
      const local = (y / 3 - pose.position[1]) / pose.height;
      const isHead = slots !== undefined ? onHead >= 2 && local >= from - HEAD_DROP : local >= from;
      (isHead ? head : body).tris.push(...tri);
    }
  });
  return [body, head];
}

/** One kind's unit geometry under an instance matrix. */
function geometryLayer(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4, tag: string, depthWrite: boolean): Layer {
  const position = geometry.getAttribute('position');
  const layer: Layer = { tag, depthWrite, tris: [] };
  const index = geometry.index;
  const count = index === null ? position.count : index.count;
  for (let v = 0; v + 2 < count; v += 3) {
    for (let k = 0; k < 3; k++) {
      V.fromBufferAttribute(position, index === null ? v + k : index.getX(v + k));
      V.applyMatrix4(matrix);
      layer.tris.push(V.x, V.y, V.z);
    }
  }
  return layer;
}

/** The prop field's own output, read back: every instance of every kind it drew. */
function propLayers(poses: FigureLayout, rigs: FigureRigMap, library: ModelLibrary, models: ModelData): Layer[] {
  const field = new PropField();
  const out: Layer[] = [];
  try {
    field.setLibrary(library, models);
    field.commit(poses, rigs, models);
    field.bind(RESTING, 0);
    field.group.updateMatrixWorld(true);
    const instance = new THREE.Matrix4();
    for (const child of field.group.children) {
      const mesh = child as THREE.InstancedMesh;
      if (mesh.isInstancedMesh !== true || !mesh.visible || mesh.count === 0) continue;
      const kind = mesh.name.replace(/^props:/, '').replace(/:.*$/, '');
      const depthWrite = (mesh.material as THREE.Material).depthWrite;
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, instance);
        instance.premultiply(mesh.matrixWorld);
        out.push(geometryLayer(mesh.geometry, instance, `${kind}@${String(i)}`, depthWrite));
      }
    }
  } finally {
    field.dispose();
  }
  return out;
}

function cameraAt(pose: Pose, width = METER_WIDTH, height = METER_HEIGHT): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, width / height, CAMERA.near, CAMERA.far);
  camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
  camera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
}

function project(camera: THREE.PerspectiveCamera, x: number, y: number, z: number): [number, number, number] | null {
  V.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
  const depth = -V.z;
  if (depth <= CAMERA.near) return null;
  V.applyMatrix4(camera.projectionMatrix);
  return [((V.x + 1) / 2) * METER_WIDTH, ((1 - V.y) / 2) * METER_HEIGHT, depth];
}

type Buffer = Map<number, number>;

/** Scan-convert a layer: per pixel centre, the nearest depth. */
function rasterise(camera: THREE.PerspectiveCamera, layer: Layer, into: Buffer): void {
  const t = layer.tris;
  for (let i = 0; i + 8 < t.length; i += 9) {
    const a = project(camera, t[i]!, t[i + 1]!, t[i + 2]!);
    const b = project(camera, t[i + 3]!, t[i + 4]!, t[i + 5]!);
    const c = project(camera, t[i + 6]!, t[i + 7]!, t[i + 8]!);
    if (a === null || b === null || c === null) continue;
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (Math.abs(area) < 1e-12) continue;
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
    const x1 = Math.min(METER_WIDTH - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
    const y1 = Math.min(METER_HEIGHT - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const sx = px + 0.5;
        const sy = py + 0.5;
        const w0 = ((b[0] - sx) * (c[1] - sy) - (b[1] - sy) * (c[0] - sx)) / area;
        const w1 = ((c[0] - sx) * (a[1] - sy) - (c[1] - sy) * (a[0] - sx)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const depth = w0 * a[2] + w1 * b[2] + w2 * c[2];
        const key = py * METER_WIDTH + px;
        const held = into.get(key);
        if (held === undefined || depth < held) into.set(key, depth);
      }
    }
  }
}

export interface Seen {
  /** Visible pixels — the test's number. */
  pixels: number;
  /** Rows the visible pixels span. */
  height: number;
}

/** How much of each group reaches the screen: nearer than every depth-writer outside it. */
function visibility(camera: THREE.PerspectiveCamera, layers: readonly Layer[], groups: Readonly<Record<string, readonly string[]>>): Map<string, Seen> {
  const own = new Map<string, Buffer>();
  const writes = new Set<string>();
  for (const layer of layers) {
    let buffer = own.get(layer.tag);
    if (buffer === undefined) {
      buffer = new Map();
      own.set(layer.tag, buffer);
    }
    if (layer.depthWrite) writes.add(layer.tag);
    rasterise(camera, layer, buffer);
  }
  const out = new Map<string, Seen>();
  for (const [name, tags] of Object.entries(groups)) {
    const inside = new Set(tags);
    const blockers = [...writes].filter((tag) => !inside.has(tag)).map((tag) => own.get(tag)!);
    const seen = new Set<number>();
    for (const tag of tags) {
      for (const [key, depth] of own.get(tag) ?? []) {
        if (seen.has(key)) continue;
        let hidden = false;
        for (const blocker of blockers) {
          const other = blocker.get(key);
          if (other !== undefined && other < depth - 1e-5) {
            hidden = true;
            break;
          }
        }
        if (!hidden) seen.add(key);
      }
    }
    let top = Number.POSITIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;
    for (const key of seen) {
      const y = Math.floor(key / METER_WIDTH);
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
    out.set(name, { pixels: seen.size, height: seen.size === 0 ? 0 : bottom - top + 1 });
  }
  return out;
}

export type Seat = 'you' | 'opp';
export type MeterStance = 'standing' | 'kneeling';

export interface MeterRow {
  /** A prop kind, or `figure` for the body itself (its head and body). */
  kind: string;
  /** seat → stance → what reached the screen. */
  seen: Record<Seat, Record<MeterStance, Seen>>;
  /** The fewest pixels over both seats and stances — what the test would judge. */
  least: number;
}

export interface MeterInput {
  entry: WorkshopEntry;
  figures: FigureData;
  models: ModelData;
  traits: TraitData;
  presence: Readonly<Record<string, Presence>>;
  library: ModelLibrary;
  /** The facing preview's turn, so the meter answers question 13 too. */
  turn: number;
}

/**
 * Measure every prop of the card, alone on each seat, standing and kneeling, from
 * the table view. `[]` for a card with no figure (a spell, a land, a stub).
 */
export function measure(input: MeterInput): MeterRow[] {
  const table = cameraAt(VIEW_BY_ID.table.pose);
  const rows = new Map<string, MeterRow>();
  const blank = (): Record<Seat, Record<MeterStance, Seen>> => ({
    you: { standing: { pixels: 0, height: 0 }, kneeling: { pixels: 0, height: 0 } },
    opp: { standing: { pixels: 0, height: 0 }, kneeling: { pixels: 0, height: 0 } },
  });
  for (const seat of ['you', 'opp'] as const) {
    for (const stance of ['standing', 'kneeling'] as const) {
      const state = soloState(input.entry, seat, stance === 'kneeling' ? 'tapped' : 'ready');
      const poses = turnPoses(
        figurePose(layout(state, input.presence), state.board?.combat ?? null, input.figures, {
          models: input.models,
          traits: input.traits,
        }),
        input.turn,
      );
      const pose = poses.get(soloFigureId(input.entry, seat));
      if (pose === undefined) continue;
      const rig = restingRig(pose, input.library);
      const rigs: FigureRigMap = new Map();
      if (rig !== null) rigs.set(pose.cardId, rig);
      const layers = [
        ...(rig === null ? [] : bodyLayers(rig, input.models)),
        ...propLayers(new Map([[pose.cardId, pose]]), rigs, input.library, input.models),
      ];
      rig?.mixer.stopAllAction();
      const groups: Record<string, string[]> = {};
      if (rig !== null) groups['figure'] = ['body', 'head'];
      for (const layer of layers) {
        const at = layer.tag.indexOf('@');
        if (at < 0) continue;
        const kind = layer.tag.slice(0, at);
        (groups[kind] ??= []).push(layer.tag);
      }
      const seen = visibility(table, layers, groups);
      for (const [kind, value] of seen) {
        const row = rows.get(kind) ?? { kind, seen: blank(), least: Number.POSITIVE_INFINITY };
        row.seen[seat][stance] = value;
        rows.set(kind, row);
      }
    }
  }
  for (const row of rows.values()) {
    row.least = Math.min(row.seen.you.standing.pixels, row.seen.you.kneeling.pixels, row.seen.opp.standing.pixels, row.seen.opp.kneeling.pixels);
  }
  // The body first, then the props in the order they were found.
  return [...rows.values()].sort((a, b) => (a.kind === 'figure' ? -1 : b.kind === 'figure' ? 1 : 0));
}

// ---------------------------------------------------------------------------
// The pedestal caption's number: how tall the body is DRAWN in view 1
// ---------------------------------------------------------------------------

/** The frame the caption quotes: view 1 at 1600 × 900 (`framing.ts`'s `TABLE_FRAME_HEIGHT`). */
export const CAPTION_WIDTH = 1600;
export const CAPTION_HEIGHT = TABLE_FRAME_HEIGHT;

/**
 * **How tall a figure's body is drawn in view 1 at 1600 × 900**, in CSS px: its
 * resting rig — the real model, the real rest clip, the pose's own position,
 * facing and scale, exactly as the meter builds it — with every visible skinned
 * vertex projected through view 1's camera, top row to bottom row. `null` when
 * nothing is drawn: no model (a disc), a model not in the library, or a rig the
 * arena hides (a ring swarm's, `FigureLayer`'s rule — the bees are procedural).
 *
 * This replaces the caption's nominal number (`pose.height` seen square-on),
 * which was off by 10–30% because a rig's rest clip is not 1.0 tall and view 1
 * looks down at the table at an angle (framing.ts's header has the figures).
 * The body only: props (a hat, wings) are the meter's business.
 */
export function drawnHeightPx(pose: FigurePose, library: ModelLibrary): number | null {
  const rig = restingRig(pose, library);
  if (rig === null) return null;
  const camera = cameraAt(VIEW_BY_ID.table.pose, CAPTION_WIDTH, CAPTION_HEIGHT);
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  rig.root.traverse((child) => {
    const mesh = child as THREE.SkinnedMesh;
    if (mesh.isSkinnedMesh !== true || !mesh.visible) return;
    const position = mesh.geometry.getAttribute('position');
    // Only the vertices a triangle draws: lane BODIES' bald body keeps its carved
    // hair's vertices in the buffer and drops them from the index (D157).
    const index = mesh.geometry.getIndex();
    const count = index === null ? position.count : index.count;
    for (let k = 0; k < count; k++) {
      const i = index === null ? k : index.getX(k);
      V.fromBufferAttribute(position, i);
      mesh.applyBoneTransform(i, V);
      V.applyMatrix4(mesh.matrixWorld);
      V.applyMatrix4(camera.matrixWorldInverse);
      if (-V.z <= CAMERA.near) continue;
      V.applyMatrix4(camera.projectionMatrix);
      const y = ((1 - V.y) / 2) * CAPTION_HEIGHT;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  });
  rig.mixer.stopAllAction();
  return Number.isFinite(top) && Number.isFinite(bottom) ? bottom - top : null;
}
