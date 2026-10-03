/*
 * mtg-table — web/test/prop-raster.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Test support, not a test** (the glob is `test/*.test.ts`, so this file is
 * never run on its own): a small software rasteriser over the REAL figure
 * pipeline, so a pure `node --test` can say how many pixels of a prop a player
 * sees from a camera view — which is the question the slice-3 verification
 * passes kept answering with a photograph.
 *
 * Nothing here re-implements the arena. The bodies are `figures.glb` parsed by
 * three's own `GLTFLoader` and indexed by `scene/models.ts`'s `indexLibrary`,
 * cloned by `instantiateFigure` and held in their resting stance by the same
 * clip and phase `CueRunner` uses (`REST_CLIP_FOR`, `REST_PHASE_FOR`); the props
 * are `scene/props.ts`'s own `PropField`, committed and bound exactly as
 * `FigureLayer` and `DiscField.bind` do, and read back out of its instanced
 * meshes. Only the last step is ours: every triangle is projected through a
 * `PerspectiveCamera` at `camera.ts`'s pose and scan-converted into a depth
 * buffer at 1600 × 1000 (the evidence photographs' size).
 *
 * **What "visible" means.** A body writes depth (`holoMaterial.ts`) and every
 * prop is drawn after the bodies (`scene/props.ts`'s `PROP_ORDER`), so a prop's
 * fragment reaches the screen iff it is nearer the lens than every body and every
 * depth-writing prop of another kind at that pixel. That is what is counted. It
 * says nothing about contrast, which is why the evidence still photographs.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import * as THREE from 'three';

import cuesJson from '../src/arena/cues/cues.json' with { type: 'json' };
import figuresJson from '../src/arena/figures/figures.json' with { type: 'json' };
import modelsJson from '../src/arena/figures/models.json' with { type: 'json' };
import { CAMERA, type Pose } from '../src/arena/camera.ts';
import { REST_CLIP_FOR, REST_PHASE_FOR } from '../src/arena/figures/clips.ts';
import { figurePose, type FigureLayout, type FigurePose } from '../src/arena/figures/pose.ts';
import { COSTUME_SLOTS, familyOf } from '../src/arena/figures/props.ts';
import { COSTUME_ATTRIBUTE } from '../src/arena/scene/figureMaterial.ts';
import { validateFigures, validateModels } from '../src/arena/figures/validate.ts';
import { layout } from '../src/arena/layout.ts';
import { COMIC } from '../src/arena/look.ts';
import type { FigureRig, FigureRigMap } from '../src/arena/scene/figureRigs.ts';
import { clipFor, indexLibrary, instantiateFigure, type ModelLibrary } from '../src/arena/scene/models.ts';
import { PropField, type PropOffsetSource } from '../src/arena/scene/props.ts';
import type { AnyCard, Frame } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';

export const MODELS = validateModels(modelsJson).data;
export const DATA = validateFigures(figuresJson, { modelIds: new Set(Object.keys(MODELS.models)) }).data;

/** The cue file's `presence` rules — what lifts the Helicarrier's card and Wasp's in the arena. */
export const PRESENCE: Record<string, { hoverY?: number; bobAmp?: number; bobHz?: number }> = (() => {
  const out: Record<string, { hoverY?: number; bobAmp?: number; bobHz?: number }> = {};
  for (const [name, entry] of Object.entries((cuesJson as { cards?: Record<string, unknown> }).cards ?? {})) {
    const presence = (entry as { presence?: { hoverY?: number; bobAmp?: number; bobHz?: number } }).presence;
    if (presence !== undefined) out[name] = presence;
  }
  return out;
})();

export const WIDTH = 1600;
export const HEIGHT = 1000;

// ---------------------------------------------------------------------------
// The library, parsed once per process
// ---------------------------------------------------------------------------

let libraryOnce: Promise<ModelLibrary> | null = null;

/** `figures.glb`, parsed in Node and indexed by the arena's own `indexLibrary`. */
export function loadLibrary(): Promise<ModelLibrary> {
  if (libraryOnce !== null) return libraryOnce;
  libraryOnce = (async () => {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
    const bytes = readFileSync(fileURLToPath(new URL('../public/models/figures.glb', import.meta.url)));
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await new Promise<{ scene: THREE.Object3D; animations: THREE.AnimationClip[] }>((ok, bad) =>
      loader.parse(buffer, '', ok as never, bad),
    );
    const path = Object.values(MODELS.models)[0]?.path ?? 'models/figures.glb';
    return indexLibrary(gltf.scene, gltf.animations, MODELS, path);
  })();
  return libraryOnce;
}

// ---------------------------------------------------------------------------
// A synthetic two-seat board
// ---------------------------------------------------------------------------

const EMPTY = { count: 0, cards: [] as AnyCard[] };

/** A corpus card, reset to a plain untapped permanent on `controller`'s battlefield. */
export function onBattlefield(card: AnyCard, id: number, controller: number, extra: Record<string, unknown> = {}): AnyCard {
  return {
    ...(card as unknown as Record<string, unknown>),
    id,
    tapped: false,
    sick: false,
    attacking: false,
    blocking: false,
    faceDown: false,
    damage: 0,
    counters: {},
    attachedToId: null,
    attachmentIds: [],
    controller,
    owner: controller,
    zone: 'battlefield',
    ...extra,
  } as unknown as AnyCard;
}

function player(id: number, battlefield: AnyCard[]): Record<string, unknown> {
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
      battlefield: { count: battlefield.length, cards: battlefield },
      graveyard: EMPTY,
      exile: EMPTY,
      command: EMPTY,
      library: { count: 30, cards: [] },
    },
  };
}

/** A board with these permanents on the viewer's seat (player 0) and the opponent's (player 1). */
export function twoSeatState(you: AnyCard[], opp: AnyCard[]): ClientState {
  const hello = {
    v: 1,
    seq: 1,
    t: 1,
    type: 'hello_ok',
    body: { gameId: 'raster', you: 0, players: [], protocol: 1 },
  } as unknown as Frame;
  const frame = {
    v: 1,
    seq: 2,
    t: 2,
    type: 'state',
    body: {
      gameId: 'raster',
      turn: 3,
      round: 2,
      phase: 'MAIN1',
      activePlayer: 0,
      priority: 0,
      gameOver: null,
      players: [player(0, you), player(1, opp)],
      stack: [],
      stackCards: [],
      combat: null,
      events: [],
    },
  } as unknown as Frame;
  return reduce(reduce(initialState(), hello), frame);
}

/** The arena's poses for a state, with the cue file's presence rules, as `Arena.tsx` computes them. */
export function posesOf(state: ClientState): FigureLayout {
  return figurePose(layout(state, PRESENCE), state.board?.combat ?? null, DATA, { models: MODELS });
}

// ---------------------------------------------------------------------------
// A figure, built the way FigureLayer builds it
// ---------------------------------------------------------------------------

/** A living figure's rig in its resting stance — `FigureLayer`'s build plus `CueRunner`'s rest clip. */
export function rigOf(pose: FigurePose, library: ModelLibrary, yaw = 0): FigureRig | null {
  if (pose.modelId === null) return null;
  const model = library.get(pose.modelId);
  if (model === undefined) return null;
  const instance = instantiateFigure(model);
  const root = instance.object;
  root.position.set(pose.position[0], pose.position[1], pose.position[2]);
  root.rotation.set(0, pose.facingY + yaw, 0);
  root.scale.setScalar(pose.height);
  const restClip =
    clipFor(model, REST_CLIP_FOR[pose.stance], pose.clips[REST_CLIP_FOR[pose.stance]]) ??
    clipFor(model, 'idle', pose.clips['idle']);
  if (restClip !== null) {
    const action = instance.mixer.clipAction(restClip);
    action.play();
    action.time = REST_PHASE_FOR[pose.stance] * restClip.duration;
    action.setEffectiveWeight(1);
    instance.mixer.update(0);
  }
  // A ring swarm's rig stands at the centre for the clip lane and is not drawn.
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

/** No cue running: every offset is identity, no clip. */
const RESTING: PropOffsetSource = {
  offsetOf: () => ({ dx: 0, dy: 0, dz: 0, scale: 1, opacity: 1, dissolve: 0, glow: 0, dRotY: 0 }),
  clipOf: () => null,
};

// ---------------------------------------------------------------------------
// Triangles
// ---------------------------------------------------------------------------

/**
 * A soup of world-space triangles with a tag — `body` / `head` for a figure's own
 * mesh, `<kind>@<instance>` for a prop (`badge@1` is Coulson's back emblem), and
 * `squad@<i>` / `squad@<i>:head` for a squad follower. `depthWrite` says whether
 * it hides what is behind it.
 */
export interface Layer {
  tag: string;
  depthWrite: boolean;
  /** 9 floats per triangle. */
  tris: number[];
}

const V = new THREE.Vector3();

/** The figure-space height a body's head starts at: the Kenney head is y 0.511–1.0. */
export const HEAD_FROM = 0.53;
/**
 * Slice 4: the proportioned body's head (heroic ×1.3) starts at its chin — y
 * 0.79 in the resting idle (0.81 in the bind pose), measured.
 */
export const HUMAN_HEAD_FROM = 0.79;

/** The costume slots a head is made of: skin (the face — the neck is skin too) and hair. */
const HEAD_SLOTS: ReadonlySet<number> = new Set([COSTUME_SLOTS.indexOf('skin'), COSTUME_SLOTS.indexOf('hair')]);
/**
 * How far below its standing chin a head may be and still be a head: a kneeling
 * figure's is ~0.35 lower (measured), and the hands — skin-coloured by default,
 * but the `gloves` slot — are never counted. Keeps the neck of a standing figure
 * (skin, just under the chin) out of its head.
 */
const HEAD_DROP = 0.4;

/** Where a body of this model's family starts its head, in figure units. */
export function headFromOf(modelId: string | null): number {
  return familyOf(modelId, MODELS) === 'human' ? HUMAN_HEAD_FROM : HEAD_FROM;
}

/** Every visible skinned mesh of a body, in world space, split into its head (figure-space y ≥ {@link HEAD_FROM}) and the rest. */
export function bodyLayers(rig: FigureRig): Layer[] {
  const body: Layer = { tag: 'body', depthWrite: true, tris: [] };
  const head: Layer = { tag: 'head', depthWrite: true, tris: [] };
  const pose = rig.pose;
  const from = headFromOf(pose.modelId);
  rig.root.updateMatrixWorld(true);
  rig.root.traverse((child) => {
    const mesh = child as THREE.SkinnedMesh;
    if (mesh.isSkinnedMesh !== true || !mesh.visible) return;
    const position = mesh.geometry.getAttribute('position');
    // Slice 4: a body that carries costume slots says where its head is — its
    // skin and hair above the collar — whatever its pose (a kneeling figure's
    // head is below any fixed height). A body without them splits by height.
    const slots = mesh.geometry.getAttribute(COSTUME_ATTRIBUTE);
    const world: number[] = [];
    for (let i = 0; i < position.count; i++) {
      V.fromBufferAttribute(position, i);
      mesh.applyBoneTransform(i, V);
      V.applyMatrix4(mesh.matrixWorld);
      world.push(V.x, V.y, V.z);
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

/**
 * **The prop field's own output**, read back: a `PropField` committed with these
 * poses and rigs and bound once at rest, then every instance of every kind it
 * drew, as world-space triangles tagged `<kind>@<instance>` — a squad follower's
 * top half is its `:head`.
 */
export function propLayers(
  poses: FigureLayout,
  rigs: FigureRigMap,
  library: ModelLibrary,
  offsets: PropOffsetSource = RESTING,
): Layer[] {
  const field = new PropField();
  field.setLibrary(library, MODELS);
  field.commit(poses, rigs, MODELS);
  field.bind(offsets, 0);
  field.group.updateMatrixWorld(true);
  const out: Layer[] = [];
  const instance = new THREE.Matrix4();
  for (const child of field.group.children) {
    const mesh = child as THREE.InstancedMesh;
    if (mesh.isInstancedMesh !== true || !mesh.visible || mesh.count === 0) continue;
    const kind = mesh.name.replace(/^props:/, '').replace(/:.*$/, '');
    const depthWrite = (mesh.material as THREE.ShaderMaterial).depthWrite;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, instance);
      instance.premultiply(mesh.matrixWorld);
      // A squad follower is its body baked: its head starts where that body's does.
      const from = kind === 'squad' ? headFromOf(mesh.name.replace(/^props:squad:/, '')) : HEAD_FROM;
      out.push(...geometryLayers(mesh.geometry, instance, `${kind}@${String(i)}`, depthWrite, kind === 'squad', from));
    }
  }
  field.dispose();
  return out;
}

/**
 * A kind's unit geometry under one instance matrix, as layers. A baked body (a
 * squad follower: one unit tall, feet at 0) is split at {@link HEAD_FROM} into
 * `<tag>` and `<tag>:head`.
 */
export function geometryLayers(
  geometry: THREE.BufferGeometry,
  matrix: THREE.Matrix4,
  tag: string,
  depthWrite: boolean,
  splitHead = false,
  headFrom = HEAD_FROM,
): Layer[] {
  const position = geometry.getAttribute('position');
  const layer: Layer = { tag, depthWrite, tris: [] };
  const head: Layer = { tag: `${tag}:head`, depthWrite, tris: [] };
  for (let v = 0; v + 2 < position.count; v += 3) {
    let y = 0;
    const tri: number[] = [];
    for (let k = 0; k < 3; k++) {
      V.fromBufferAttribute(position, v + k);
      y += V.y;
      V.applyMatrix4(matrix);
      tri.push(V.x, V.y, V.z);
    }
    (splitHead && y / 3 >= headFrom ? head : layer).tris.push(...tri);
  }
  return head.tris.length > 0 ? [layer, head] : [layer];
}

/** The layers of one pose — its body (if it has a model) and its props — on its own. */
export function figureLayers(pose: FigurePose, library: ModelLibrary): Layer[] {
  const rig = rigOf(pose, library);
  const rigs: FigureRigMap = new Map();
  if (rig !== null) rigs.set(pose.cardId, rig);
  return [...(rig === null ? [] : bodyLayers(rig)), ...propLayers(new Map([[pose.cardId, pose]]), rigs, library)];
}

/** Every prop kind among these layers → its instance tags (a kind's group). */
export function kindGroups(layers: readonly Layer[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const layer of layers) {
    const at = layer.tag.indexOf('@');
    if (at < 0) continue;
    const kind = layer.tag.slice(0, at);
    (out[kind] ??= []).push(layer.tag);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The raster
// ---------------------------------------------------------------------------

export function cameraAt(pose: Pose, width = WIDTH, height = HEIGHT): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, width / height, CAMERA.near, CAMERA.far);
  camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
  camera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
}

type Buffer = Map<number, number>;

function project(camera: THREE.PerspectiveCamera, x: number, y: number, z: number, width: number, height: number): [number, number, number] | null {
  V.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
  const depth = -V.z;
  if (depth <= CAMERA.near) return null;
  V.applyMatrix4(camera.projectionMatrix);
  return [((V.x + 1) / 2) * width, ((1 - V.y) / 2) * height, depth];
}

/** Scan-convert a layer into `into` (per pixel centre, the nearest depth). */
function rasterise(camera: THREE.PerspectiveCamera, layer: Layer, into: Buffer, width: number, height: number): void {
  const t = layer.tris;
  for (let i = 0; i + 8 < t.length; i += 9) {
    const a = project(camera, t[i]!, t[i + 1]!, t[i + 2]!, width, height);
    const b = project(camera, t[i + 3]!, t[i + 4]!, t[i + 5]!, width, height);
    const c = project(camera, t[i + 6]!, t[i + 7]!, t[i + 8]!, width, height);
    if (a === null || b === null || c === null) continue;
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (Math.abs(area) < 1e-12) continue;
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
    const x1 = Math.min(width - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
    const y1 = Math.min(height - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const sx = px + 0.5;
        const sy = py + 0.5;
        const w0 = ((b[0] - sx) * (c[1] - sy) - (b[1] - sy) * (c[0] - sx)) / area;
        const w1 = ((c[0] - sx) * (a[1] - sy) - (c[1] - sy) * (a[0] - sx)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const depth = w0 * a[2] + w1 * b[2] + w2 * c[2];
        const key = py * width + px;
        const held = into.get(key);
        if (held === undefined || depth < held) into.set(key, depth);
      }
    }
  }
}

export interface Visible {
  /** Pixels at which the group is nearer the lens than everything that hides it. */
  pixels: number;
  /** Pixels the group covers at all, hidden or not. */
  covered: number;
  /** The centroid of its visible pixels, or `null`. */
  centre: [number, number] | null;
}

/**
 * **How much of each group reaches the screen** from `camera`. A group is a set
 * of layer tags (a prop kind's instances; a squad member's head); a pixel is its
 * iff one of its fragments there is nearer the lens than every depth-writing
 * layer OUTSIDE the group.
 */
export function visibility(
  camera: THREE.PerspectiveCamera,
  layers: readonly Layer[],
  groups: Readonly<Record<string, readonly string[]>>,
  width = WIDTH,
  height = HEIGHT,
): Map<string, Visible> {
  const own = new Map<string, Buffer>();
  const writes = new Set<string>();
  for (const layer of layers) {
    let buffer = own.get(layer.tag);
    if (buffer === undefined) {
      buffer = new Map();
      own.set(layer.tag, buffer);
    }
    if (layer.depthWrite) writes.add(layer.tag);
    rasterise(camera, layer, buffer, width, height);
  }
  const out = new Map<string, Visible>();
  for (const [name, tags] of Object.entries(groups)) {
    const inside = new Set(tags);
    const blockers = [...writes].filter((tag) => !inside.has(tag)).map((tag) => own.get(tag)!);
    const seen = new Set<number>();
    const covered = new Set<number>();
    for (const tag of tags) {
      const mine = own.get(tag);
      if (mine === undefined) continue;
      for (const [key, depth] of mine) {
        covered.add(key);
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
    let cx = 0;
    let cy = 0;
    for (const key of seen) {
      cx += key % width;
      cy += Math.floor(key / width);
    }
    out.set(name, {
      pixels: seen.size,
      covered: covered.size,
      centre: seen.size === 0 ? null : [cx / seen.size + 0.5, cy / seen.size + 0.5],
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The comic look over the raster: what the ink and the halftone leave
// ---------------------------------------------------------------------------

/**
 * **What the comic look does to a prop's pixels** (Lane LOOK's verification pass:
 * "the both-seats raster measures coverage only; it never renders the ink or the
 * halftone"). Per group, of its {@link Visible} pixels:
 *
 *  - `inked` — the ones `Post.tsx`'s `InkEffect` paints black: the Laplacian of
 *    1/z over samples `COMIC.inkCssPx` apart OFF a painted surface (±2 px at dpr
 *    1, the nearest texel of a 1.6-texel offset) and `COMIC.inkInnerCssPx` apart
 *    ON one (±1 px), relative to 1/z, past the smoothstep's midpoint (1.75 ×
 *    `COMIC.inkThreshold`), where a PAINTED surface is among the five samples
 *    (D146) — every depth-writing layer here is a painted body or prop; a pixel
 *    no layer covers is the table plane (y = 0) behind; and never a pixel a
 *    LIGHT is drawn on (see `lightsInked` below);
 *  - `dotted` — the ones the halftone darkens: in the core-shadow band (`N·L`
 *    under the umbra band's midpoint, the nearest fragment's FLAT face normal
 *    against the lens-fixed key, D138) and on a dot of the 45° screen
 *    (`COMIC.dotCssPx` cells, the shader's own formula in `gl_FragCoord`).
 *
 * A dot darkens by at most `COMIC.dotDepth`; the ink replaces the colour. So
 * `pixels − inked` is what still shows the prop's paint, and
 * `pixels − inked − dotted` what shows it undarkened.
 */
export interface ComicVisible extends Visible {
  inked: number;
  dotted: number;
}

/** The nearest depth-writing fragment at a pixel: its view depth and its view-space face normal. */
type Nearest = Map<number, [number, number, number, number]>;

const A = new THREE.Vector3();
const B = new THREE.Vector3();
const C = new THREE.Vector3();

function rasteriseNearest(camera: THREE.PerspectiveCamera, layer: Layer, into: Nearest, width: number, height: number): void {
  const t = layer.tris;
  for (let i = 0; i + 8 < t.length; i += 9) {
    const a = project(camera, t[i]!, t[i + 1]!, t[i + 2]!, width, height);
    const b = project(camera, t[i + 3]!, t[i + 4]!, t[i + 5]!, width, height);
    const c = project(camera, t[i + 6]!, t[i + 7]!, t[i + 8]!, width, height);
    if (a === null || b === null || c === null) continue;
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (Math.abs(area) < 1e-12) continue;
    // The face normal in VIEW space, turned toward the lens (the shader's normal faces it).
    A.set(t[i]!, t[i + 1]!, t[i + 2]!).applyMatrix4(camera.matrixWorldInverse);
    B.set(t[i + 3]!, t[i + 4]!, t[i + 5]!).applyMatrix4(camera.matrixWorldInverse);
    C.set(t[i + 6]!, t[i + 7]!, t[i + 8]!).applyMatrix4(camera.matrixWorldInverse);
    B.sub(A);
    C.sub(A);
    B.cross(C).normalize();
    if (B.dot(A) > 0) B.negate();
    const nx = B.x;
    const ny = B.y;
    const nz = B.z;
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
    const x1 = Math.min(width - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
    const y1 = Math.min(height - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const sx = px + 0.5;
        const sy = py + 0.5;
        const w0 = ((b[0] - sx) * (c[1] - sy) - (b[1] - sy) * (c[0] - sx)) / area;
        const w1 = ((c[0] - sx) * (a[1] - sy) - (c[1] - sy) * (a[0] - sx)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const depth = w0 * a[2] + w1 * b[2] + w2 * c[2];
        const key = py * width + px;
        const held = into.get(key);
        if (held === undefined || depth < held[0]) into.set(key, [depth, nx, ny, nz]);
      }
    }
  }
}

const RAY = new THREE.Vector3();

/** The view depth of the table plane (y = 0) at a pixel centre, or +∞ where the ray misses it. */
function tableDepthAt(camera: THREE.PerspectiveCamera, px: number, py: number, width: number, height: number): number {
  RAY.set(((px + 0.5) / width) * 2 - 1, 1 - ((py + 0.5) / height) * 2, 0.5).unproject(camera).sub(camera.position).normalize();
  if (RAY.y >= -1e-6) return Number.POSITIVE_INFINITY;
  const distance = -camera.position.y / RAY.y;
  // View depth: the distance along the camera's own axis.
  camera.getWorldDirection(A);
  return distance * RAY.dot(A);
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Is this pixel on a halftone dot (the shader's screen, at dpr 1)? */
export function onHalftoneDot(px: number, py: number, height: number): boolean {
  const fx = px + 0.5;
  const fy = height - py - 0.5;
  const cellPx = Math.max(1, COMIC.dotCssPx);
  const u = (0.7071 * fx + 0.7071 * fy) / cellPx;
  const v = (-0.7071 * fx + 0.7071 * fy) / cellPx;
  const du = u - Math.floor(u) - 0.5;
  const dv = v - Math.floor(v) - 0.5;
  return 1 - smooth(0.26, 0.34, Math.hypot(du, dv)) > 0.5;
}

/**
 * {@link visibility}, then the comic look's two subtractions — see
 * {@link ComicVisible}. `visibility`'s own numbers are unchanged (the workshop's
 * `legibility.ts` is held equal to them pixel for pixel).
 */
export function comicVisibility(
  camera: THREE.PerspectiveCamera,
  layers: readonly Layer[],
  groups: Readonly<Record<string, readonly string[]>>,
  width = WIDTH,
  height = HEIGHT,
  options: { inkPx?: number; inkInnerPx?: number; lightsInked?: boolean } = {},
  // `lightsInked` false is the default and the shader's own rule: a light burns
  // through the line (`Post.tsx`, D146) — where an additive light has lifted the
  // frame past paper white the ink steps back. The raster does not model
  // brightness, so it takes every pixel a light is drawn on over the paint as
  // lifted past white; `true` is the pessimistic bound (every light inked).
): Map<string, ComicVisible> {
  const own = new Map<string, Buffer>();
  const writes = new Set<string>();
  const nearest: Nearest = new Map();
  for (const layer of layers) {
    let buffer = own.get(layer.tag);
    if (buffer === undefined) {
      buffer = new Map();
      own.set(layer.tag, buffer);
    }
    rasterise(camera, layer, buffer, width, height);
    if (layer.depthWrite) {
      writes.add(layer.tag);
      rasteriseNearest(camera, layer, nearest, width, height);
    }
  }
  // The ink (D139, D146): offsets ±2 px — `inkCssPx` 1.6 at dpr 1, the nearest texel.
  // Offsets in whole pixels: the nearest texel of a fractional offset at dpr 1
  // (1.6 → ±2 outside a painted surface, 1.0 → ±1 on one, D146).
  const outer = Math.floor(0.5 + (options.inkPx ?? COMIC.inkCssPx));
  const innerStep = Math.floor(0.5 + (options.inkInnerPx ?? COMIC.inkInnerCssPx));
  // The pixels a LIGHT (an additive prop, no depth) is drawn on, over everything that writes depth.
  const lights = new Set<number>();
  for (const layer of layers) {
    if (layer.depthWrite) continue;
    for (const [pixel, depth] of own.get(layer.tag) ?? new Map<number, number>()) {
      const held = nearest.get(pixel);
      if (held === undefined || depth <= held[0] + 1e-5) lights.add(pixel);
    }
  }
  const depthAt = (px: number, py: number): number => {
    const held = nearest.get(py * width + px);
    return held !== undefined ? held[0] : tableDepthAt(camera, px, py, width, height);
  };
  // A light drawn over paint may lift the mark (its alpha adds): counted as
  // UNpainted, so it takes the wider outer step — the conservative side.
  const paintedAt = (px: number, py: number): boolean => nearest.has(py * width + px) && !lights.has(py * width + px);
  const inked = (key: number): boolean => {
    if (options.lightsInked !== true && lights.has(key)) return false;
    const px = key % width;
    const py = Math.floor(key / width);
    const step = paintedAt(px, py) ? innerStep : outer;
    if (px < step || py < step || px >= width - step || py >= height - step) return false;
    const around: Array<[number, number]> = [
      [px - step, py],
      [px + step, py],
      [px, py - step],
      [px, py + step],
    ];
    if (!paintedAt(px, py) && !around.some(([x, y]) => paintedAt(x, y))) return false;
    const c = 1 / Math.max(1e-4, depthAt(px, py));
    let sum = 0;
    for (const [x, y] of around) sum += 1 / Math.max(1e-4, depthAt(x, y));
    const bend = Math.abs(sum - 4 * c) / c;
    return smooth(COMIC.inkThreshold, COMIC.inkThreshold * 2.5, bend) >= 0.5;
  };
  // The halftone: the core shadow band on a dot.
  const key = new THREE.Vector3(COMIC.key[0], COMIC.key[1], COMIC.key[2]).normalize();
  const umbraMid = (COMIC.bands[2] + COMIC.bands[3]) / 2;
  const dotted = (pixel: number): boolean => {
    const held = nearest.get(pixel);
    if (held === undefined) return false;
    const ndl = held[1] * key.x + held[2] * key.y + held[3] * key.z;
    return ndl < umbraMid && onHalftoneDot(pixel % width, Math.floor(pixel / width), height);
  };
  const out = new Map<string, ComicVisible>();
  for (const [name, tags] of Object.entries(groups)) {
    const inside = new Set(tags);
    const blockers = [...writes].filter((tag) => !inside.has(tag)).map((tag) => own.get(tag)!);
    const seen = new Set<number>();
    const covered = new Set<number>();
    for (const tag of tags) {
      const mine = own.get(tag);
      if (mine === undefined) continue;
      for (const [pixel, depth] of mine) {
        covered.add(pixel);
        if (seen.has(pixel)) continue;
        let hidden = false;
        for (const blocker of blockers) {
          const other = blocker.get(pixel);
          if (other !== undefined && other < depth - 1e-5) {
            hidden = true;
            break;
          }
        }
        if (!hidden) seen.add(pixel);
      }
    }
    let cx = 0;
    let cy = 0;
    let ink = 0;
    let dots = 0;
    for (const pixel of seen) {
      cx += pixel % width;
      cy += Math.floor(pixel / width);
      if (inked(pixel)) ink += 1;
      else if (dotted(pixel)) dots += 1;
    }
    out.set(name, {
      pixels: seen.size,
      covered: covered.size,
      centre: seen.size === 0 ? null : [cx / seen.size + 0.5, cy / seen.size + 0.5],
      inked: ink,
      dotted: dots,
    });
  }
  return out;
}
