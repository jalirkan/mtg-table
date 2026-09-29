/*
 * mtg-table — arena/scene/models.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The figure loader** (report 13 §9.4) — `useCardTexture.ts` rewritten for
 * meshes, and deliberately so: that file already solved every problem this one
 * has (a module-level cache keyed by URL, a resolved map so a re-mount does not
 * flash, a failed set, and an `invalidate()` because a load is the one change
 * React does not cause under `frameloop='demand'`).
 *
 * ---------------------------------------------------------------------------
 * Five decisions, each with the thing it avoids:
 *
 *  1. **`GLTFLoader` directly, never drei's `useGLTF`.** `useGLTF` goes through
 *     `three-stdlib`, suspends inside the canvas, and carries a DRACO decoder
 *     path that defaults to `https://www.gstatic.com/draco/versioned/decoders/
 *     1.5.5/` (`@react-three/drei/core/Gltf.js:8`, measured). That is a
 *     third-party network fetch, which report 09 §2.1 rule 1 forbids the arena
 *     outright — the same trap `numberSprite.ts` documents for drei's `<Text>`
 *     and its `fonts.gstatic.com` font. `web/test/liveness.test.ts` asserts that
 *     no arena module names either host.
 *  2. **Meshopt, not Draco.** `EXT_meshopt_compression`'s decoder is 29 kB of
 *     JS with its wasm embedded as base64, so there is **no extra file to
 *     host**; Draco's is a 192 kB `.wasm` plus a 58 kB wrapper that must be
 *     served from somewhere (report 12 §5.2). The decoder is imported from the
 *     installed `three`, which is the same dependency the renderer already is.
 *  3. **One library file, cloned per figure.** `SkeletonUtils.clone` rebinds
 *     each `SkinnedMesh` to the cloned bones while **reusing geometries and
 *     materials by reference**, which is what makes 12 agents cost 12 draw
 *     calls and one geometry (measured in T0: 12 figures → 12 calls, 1 material,
 *     1 program, frame body p50 0.30 ms). A naive `Object3D.clone()` shares the
 *     skeleton and every copy animates identically.
 *  4. **Normalise at load, never in the data file.** The models are 1.914 and
 *     1.854 units tall in their own units (slice 4's proportioned man and woman,
 *     head ×1.3), 0.671–0.723 (the three chibi fallbacks), 0.771 (the drone) and
 *     1.881 (the bee) — measured on the skinned mesh by the build — and face
 *     whichever way their author modelled them. Measuring the bounding
 *     box and scaling to one world unit is the only way models from two libraries
 *     stand the same height; no amount of per-card fiddling in `figures.json`
 *     achieves it reliably. `Box3.setFromObject` on the loaded source measures a
 *     `SkinnedMesh` through its bones — which is what `tools/build-figures.mjs`
 *     now measures too; T8 checked in the browser that the two agree — at
 *     `g1.jsonl`@355 no drawn figure is wider than its pose says (all ≤ 0.720
 *     against a 0.720 slot), and a standing one is its pose's height to 0.01.
 *  5. **`null` is not an error state.** No manifest entry, no file, a 404, a
 *     parse failure, a clip that does not exist → the Tier-1 glow disc (§9.4).
 *     The card plane is untouched, every cue still plays, and the game is fully
 *     readable — which is what lets the repo ship with no binaries at all and
 *     lets this tier be built one model at a time.
 * ---------------------------------------------------------------------------
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

import { COSTUME_SLOTS } from '../figures/props.ts';
import { HOLD_JOINTS, REST_KIT, REST_POSES, restModelId, type RestPose, type RestSpec } from '../figures/rests.ts';
import type { ModelData, ModelEntry } from '../figures/types.ts';
import { COSTUME_ATTRIBUTE } from './holoMaterial.ts';

/** One archetype's mesh, its clips, and how to stand it on the table. */
export interface LoadedModel {
  id: string;
  entry: ModelEntry;
  /** The node in the loaded document. **Never added to a scene** — it is the stencil. */
  source: THREE.Object3D;
  /** The manifest's key (`idle`, `attack`, `pistolDraw`) → the clip. */
  clips: Map<string, THREE.AnimationClip>;
  /** Scale that makes this model exactly one world unit tall. */
  unitScale: number;
  /** How far to lift it so its lowest point is on the table. */
  offsetY: number;
  /** The Y turn that makes its `facing` become +Z. */
  rotationY: number;
  /**
   * **Lane BODIES (D157) — the body's own hair**, as triangle indices into its
   * source geometry (every vertex of them in the costume's `hair` slot), on a
   * proportioned BASE body; `null` on a variant and on every other model. The
   * prop field bakes the hair kinds from it (`scene/props.ts`'s `bakeHair`).
   */
  hairIndex?: Uint32Array | null;
  /**
   * **Lane BODIES (D156) — the resting pose of a VARIANT** (`agent@folded`): its
   * `clips.get('idle')` is that pose and its `source` is the body with the hair
   * carved off. `null` or absent on a base body, which is what the duelists, the
   * squads' followers and the rider are baked from — hair and all.
   */
  rest?: RestPose | null;
}

export type ModelLibrary = Map<string, LoadedModel>;

/** path → the in-flight or finished parse. Module scope: one per page. */
const libraryCache = new Map<string, Promise<ModelLibrary>>();
/** Resolved, so a component that re-mounts (every one, under StrictMode) is instant. */
const resolved = new Map<string, ModelLibrary>();
/** Paths that failed. A miss is cosmetic — the caller draws the disc (§9.4). */
const failed = new Set<string>();

/** The turn that takes each `facing` to +Z. */
const FACING_TURN: Readonly<Record<string, number>> = {
  '+z': 0,
  '-z': Math.PI,
  '+x': -Math.PI / 2,
  '-x': Math.PI / 2,
};

/** Already resolved? Then a re-mount draws the figure on its first frame. */
export function peekFigureModels(path: string): ModelLibrary | null {
  return resolved.get(path) ?? null;
}

export function figureModelsFailed(path: string): boolean {
  return failed.has(path);
}

function makeLoader(): GLTFLoader {
  const loader = new GLTFLoader();
  // The decoder is a plain object with `supported`/`ready`; three's own example
  // wires it exactly this way, and it embeds its wasm, so nothing is fetched.
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader;
}

/**
 * **A static asset's bytes** (D250) — same-origin, relative, through three's own
 * `FileLoader`: the arena's one way to a file, as the figure library and the
 * personal index are read (no arena module calls `fetch`; liveness holds it). The
 * audio module is handed this rather than importing it, so `scene/audio.ts`
 * imports no three. The caller's path is a literal its own file's allow-list names.
 */
export function loadAssetBytes(path: string): Promise<ArrayBuffer> {
  return new THREE.FileLoader().setResponseType('arraybuffer').loadAsync(path) as Promise<ArrayBuffer>;
}

/**
 * Load the merged figure library and index it by model id.
 *
 * Every path is **relative and same-origin** (`models/figures.glb` under
 * `web/public/`); `figures/validate.ts` refuses a manifest path with a scheme, a
 * leading slash or a `..`, so a model id cannot become a URL.
 */
export function loadFigureModels(data: ModelData): Promise<ModelLibrary> {
  const paths = new Set(Object.values(data.models).map((m) => m.path));
  // One merged library is the design (report 12 §8.3 commitment 1); more than
  // one path is a manifest that has grown a second file, and each is loaded the
  // same way. In practice this loop runs once.
  const path = [...paths][0] ?? 'models/figures.glb';

  const cached = libraryCache.get(path);
  if (cached !== undefined) return cached;

  const pending = new Promise<ModelLibrary>((resolve, reject) => {
    makeLoader().load(
      path,
      (gltf) => {
        resolve(indexLibrary(gltf.scene, gltf.animations, data, path));
      },
      undefined,
      (error) => {
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  })
    .then((library) => {
      resolved.set(path, library);
      return library;
    })
    .catch((error: unknown) => {
      // A fresh checkout has no `web/public/models/figures.glb` at all, and that
      // is a supported state, not a broken one.
      failed.add(path);
      libraryCache.delete(path);
      throw error;
    });

  libraryCache.set(path, pending);
  return pending;
}

const BOX = new THREE.Box3();
const SIZE = new THREE.Vector3();

// ---------------------------------------------------------------------------
// The personal tier (phase 2, D195): one user-downloaded model, on this loader
// ---------------------------------------------------------------------------

/**
 * A personal model, loaded: its base and its resting-pose variants (`p0`,
 * `p0@folded`, …, the same `figures/rests.ts` table the CC0 bodies use), keyed
 * by the OPAQUE id `arena/personal.ts` gave it, and its widest resting width
 * over its height — what `dressPoses` refits the width clamp with.
 */
export interface PersonalModelSet {
  models: Map<string, LoadedModel>;
  ratio: number;
}

const personalCache = new Map<string, Promise<PersonalModelSet>>();

/**
 * **Load one personal model** through THIS file's loader — three's own
 * `GLTFLoader` and `MeshoptDecoder`, never drei's `useGLTF` — from the dev
 * route's same-origin path. The file carries our clip set baked in (prepare's
 * step 8, D194), so its clips are its own animations by key and nothing is
 * retargeted here. A failure rejects, and the caller draws the CC0 figure: a
 * missing or broken file is a supported state, as a missing `figures.glb` is.
 * Cached per path for the page.
 */
export function loadPersonalModel(url: string, id: string): Promise<PersonalModelSet> {
  const key = `${id}|${url}`;
  const cached = personalCache.get(key);
  if (cached !== undefined) return cached;
  const pending = new Promise<PersonalModelSet>((resolve, reject) => {
    makeLoader().load(
      url,
      (gltf) => {
        try {
          resolve(indexPersonalModel(gltf.scene, gltf.animations, id, url));
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      },
      undefined,
      (error) => {
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  }).catch((error: unknown) => {
    personalCache.delete(key);
    throw error;
  });
  personalCache.set(key, pending);
  return pending;
}

/** The resting stances whose width a neighbour must clear (`tools/build-figures.mjs`'s WIDTH_STANCES). */
const WIDTH_STANCES: ReadonlyArray<readonly [clip: string, phase: number]> = [
  ['idle', 0],
  ['crouch', 0.85],
];

/**
 * A parsed personal model → its {@link PersonalModelSet}. Exported for a test
 * that loads a prepared file in Node. Throws when the file is not a prepared
 * personal model (no skinned mesh, no `idle`): the caller keeps the CC0 figure.
 */
export function indexPersonalModel(scene: THREE.Object3D, animations: THREE.AnimationClip[], id: string, path: string): PersonalModelSet {
  const source = scene.children.length === 1 ? scene.children[0]! : scene;
  let skinned = false;
  source.traverse((child) => {
    if ((child as THREE.SkinnedMesh).isSkinnedMesh === true) skinned = true;
  });
  if (!skinned) throw new Error('a personal model has no skinned mesh');
  const clips = new Map<string, THREE.AnimationClip>();
  for (const clip of animations) if (!hasRootMotion(clip, source.name)) clips.set(clip.name, clip);
  if (!clips.has('idle')) throw new Error('a personal model has no baked idle (prepare it again)');
  source.updateMatrixWorld(true);
  BOX.setFromObject(source);
  BOX.getSize(SIZE);
  const height = SIZE.y > 1e-6 ? SIZE.y : 1;
  const entry: ModelEntry = {
    path,
    node: source.name,
    height,
    width: SIZE.x,
    facing: '+z',
    rootMotion: false,
    bones: 23,
    triangles: 0,
    clips: Object.fromEntries([...clips.keys()].map((k) => [k, k])),
    rig: 'ubc',
    retargeted: {},
    source: '',
    licence: '',
    licenceUrl: '',
    licenceBadge: '',
    retrieved: '',
    committable: false,
  };
  const base: LoadedModel = {
    id,
    entry,
    source,
    clips,
    unitScale: 1 / height,
    offsetY: -BOX.min.y / height,
    rotationY: 0,
    rest: null,
  };
  // The widest RESTING stance, as three draws it (the build's rule for the CC0
  // bodies): the idle's first frame and the kneel's held phase, on the skinned mesh.
  let width = 0;
  for (const [clipName, phase] of WIDTH_STANCES) {
    const clip = clips.get(clipName) ?? clips.get('idle')!;
    const instance = instantiateFigure(base, { pose: 'bind' });
    sampleClipInto(instance.object, clip, phase * clip.duration);
    instance.object.updateMatrixWorld(true);
    BOX.setFromObject(instance.object, true);
    width = Math.max(width, BOX.max.x - BOX.min.x);
  }
  const models = new Map<string, LoadedModel>([[id, base]]);
  for (const variant of restVariantsOf(base)) models.set(variant.id, variant);
  return { models, ratio: width > 0 ? width : SIZE.x / height };
}

/**
 * A parsed document → the library, one {@link LoadedModel} per manifest entry.
 * Exported for the tests that load `figures.glb` in Node (`web/test/prop-raster.ts`
 * parses it with the same loader and indexes it HERE, so a test measures exactly
 * the normalisation the arena draws with).
 */
export function indexLibrary(
  scene: THREE.Object3D,
  animations: THREE.AnimationClip[],
  data: ModelData,
  path: string,
): ModelLibrary {
  const byName = new Map<string, THREE.AnimationClip>();
  for (const clip of animations) byName.set(clip.name, clip);

  const library: ModelLibrary = new Map();
  for (const [id, entry] of Object.entries(data.models)) {
    if (entry.path !== path) continue;
    const source = scene.getObjectByName(entry.node);
    if (source === undefined) {
      console.warn(`[arena] figures: no node "${entry.node}" in ${path} — "${id}" falls back to the disc`);
      continue;
    }

    // §3.4's lint, enforced at load rather than trusted: a clip that translates
    // the root fights `figurePose ⊕ offset`, which owns position.
    const clips = new Map<string, THREE.AnimationClip>();
    for (const [key, name] of Object.entries(entry.clips)) {
      const clip = byName.get(name);
      if (clip === undefined) {
        console.warn(`[arena] figures: "${id}" names clip "${name}", which ${path} does not have`);
        continue;
      }
      if (hasRootMotion(clip, entry.node)) {
        console.warn(`[arena] figures: "${id}" clip "${name}" moves the root — dropped (§3.4)`);
        continue;
      }
      clips.set(key, clip);
    }

    // Slice 4: the costume slots arrive as `_region` (GLTFLoader's name for the
    // file's `_REGION`); the shader reads them as `costumeRegion`. Renamed once
    // here, on the geometry every clone of this model shares.
    source.traverse((child) => {
      const geometry = (child as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
      const region = geometry?.getAttribute('_region');
      if (geometry === undefined || region === undefined) return;
      geometry.setAttribute(COSTUME_ATTRIBUTE, region);
      geometry.deleteAttribute('_region');
    });

    BOX.setFromObject(source);
    BOX.getSize(SIZE);
    const height = SIZE.y > 1e-6 ? SIZE.y : 1;
    library.set(id, {
      id,
      entry,
      source,
      clips,
      unitScale: 1 / height,
      offsetY: -BOX.min.y / height,
      rotationY: FACING_TURN[entry.facing] ?? 0,
    });
  }
  // Lane BODIES: every proportioned body's resting-pose variants, bald under a
  // hairstyle prop. After the loop, so a variant is built from its finished base.
  for (const model of [...library.values()]) {
    if (model.entry.rig !== 'ubc') continue;
    for (const variant of restVariantsOf(model)) library.set(variant.id, variant);
  }
  return library;
}

// ---------------------------------------------------------------------------
// Lane BODIES — the resting-pose variants (D156) and the carved hair (D157)
// ---------------------------------------------------------------------------

/** `head_1` → `head`, `spine_03_1` → `spine_03` (the prop field's rule, `scene/props.ts`). */
export function baseName(name: string): string {
  return name.replace(/_[1-9]\d*$/, '');
}

const HAIR_SLOT = COSTUME_SLOTS.indexOf('hair');

/**
 * **Split a body's hair off** — its triangles whose three vertices all carry the
 * costume's `hair` slot (the pack's hairstyle is a mesh of its own, weighted 100%
 * to `Head`; the build joined it into the body and kept its slot). Returns the
 * hair's triangle indices and the rest, or `null` if the body has no hair slot.
 */
export function carveHair(geometry: THREE.BufferGeometry): { hair: Uint32Array; body: Uint32Array } | null {
  const region = geometry.getAttribute(COSTUME_ATTRIBUTE) ?? geometry.getAttribute('_region');
  const index = geometry.getIndex();
  if (region === undefined || index === null) return null;
  const hair: number[] = [];
  const body: number[] = [];
  for (let t = 0; t + 2 < index.count; t += 3) {
    const a = index.getX(t);
    const b = index.getX(t + 1);
    const c = index.getX(t + 2);
    const isHair =
      Math.round(region.getX(a)) === HAIR_SLOT && Math.round(region.getX(b)) === HAIR_SLOT && Math.round(region.getX(c)) === HAIR_SLOT;
    (isHair ? hair : body).push(a, b, c);
  }
  if (hair.length === 0) return null;
  return { hair: Uint32Array.from(hair), body: Uint32Array.from(body) };
}

/**
 * A proportioned body's resting-pose variants — one per `figures/rests.ts` pose,
 * `agent@stand` (the body's own idle) included. Built once per library, at load.
 *
 * Each shares the base's manifest entry, normalisation and every clip but one:
 * its `idle` is the pose (`deriveRestClip`), so the figure layer's first frame,
 * the clip lane's resting stance and a baked prop anchor all read the pose with
 * no code of their own. Each draws the body with its hair CARVED off — one bald
 * geometry per body, sharing every attribute buffer with the base's — because the
 * figure wears its hair as a prop kind (D157).
 */
export function restVariantsOf(model: LoadedModel): LoadedModel[] {
  const out: LoadedModel[] = [];
  let bald: THREE.Object3D = model.source;
  let hairIndex: Uint32Array | null = null;
  model.source.traverse((child) => {
    const mesh = child as THREE.SkinnedMesh;
    if (mesh.isSkinnedMesh !== true || hairIndex !== null) return;
    const carved = carveHair(mesh.geometry);
    if (carved === null) return;
    hairIndex = carved.hair;
    const geometry = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(mesh.geometry.attributes)) geometry.setAttribute(name, attribute);
    geometry.setIndex(new THREE.BufferAttribute(carved.body, 1));
    geometry.name = `${mesh.geometry.name}:bald`;
    // The stencil: a clone of the whole source (so its skeleton is its own), with
    // the one mesh's geometry swapped for the bald one.
    const stencil = cloneSkeleton(model.source);
    stencil.traverse((node) => {
      const m = node as THREE.SkinnedMesh;
      if (m.isSkinnedMesh === true && m.geometry === mesh.geometry) m.geometry = geometry;
    });
    bald = stencil;
  });
  model.hairIndex = hairIndex;
  for (const rest of REST_POSES) {
    const clip = rest === 'stand' ? (model.clips.get('idle') ?? null) : deriveRestClip(model, REST_KIT[rest], rest);
    const clips = new Map(model.clips);
    if (clip !== null) clips.set('idle', clip);
    out.push({
      ...model,
      id: restModelId(model.id, rest),
      source: bald,
      clips,
      hairIndex: null,
      rest,
    });
  }
  return out;
}

const AIM_J = new THREE.Vector3();
const AIM_C = new THREE.Vector3();
const AIM_WANT = new THREE.Vector3();
const AIM_Q = new THREE.Quaternion();
const AIM_WORLD = new THREE.Quaternion();
const AIM_PARENT = new THREE.Quaternion();
const AIM_TWIST = new THREE.Quaternion();

/**
 * **One resting pose as a clip** (D156): the `from` clip's frame at `phase` on
 * the joints the pose holds, each `aim` turned on top (a world-space swing of the
 * joint so the line to its child points along the aim, parents first), and every
 * other joint looping with the `breathe` clip — so a folded-arms figure still
 * breathes while the queue is awake (D58) and its arms stay folded. Sampled by
 * hand, at load, on a fresh instance; no mixer (the arena ticks mixers in three
 * files, liveness). `null` if the body has neither clip.
 */
export function deriveRestClip(model: LoadedModel, spec: RestSpec, name: string): THREE.AnimationClip | null {
  const breathe = model.clips.get(spec.breathe) ?? model.clips.get('idle') ?? null;
  if (breathe === null) return null;
  const from = model.clips.get(spec.from) ?? breathe;
  const instance = instantiateFigure(model, { pose: 'bind' });
  const root = instance.object;
  sampleClipInto(root, from, Math.max(0, Math.min(1, spec.phase)) * from.duration);
  root.updateMatrixWorld(true);

  const bones = new Map<string, THREE.Object3D>();
  root.traverse((node) => {
    if ((node as THREE.Bone).isBone === true && !bones.has(baseName(node.name))) bones.set(baseName(node.name), node);
  });
  const held = new Set<string>(spec.hold === 'all' ? [...bones.keys()] : HOLD_JOINTS[spec.hold]);
  for (const aim of spec.aims) {
    const bone = bones.get(aim.joint);
    const child = bones.get(aim.child);
    if (bone === undefined || child === undefined || bone.parent === null) continue;
    held.add(aim.joint);
    bone.getWorldPosition(AIM_J);
    child.getWorldPosition(AIM_C);
    AIM_C.sub(AIM_J);
    if (AIM_C.lengthSq() < 1e-12) continue;
    AIM_C.normalize();
    AIM_WANT.set(aim.aim[0], aim.aim[1], aim.aim[2]).normalize();
    AIM_Q.setFromUnitVectors(AIM_C, AIM_WANT);
    // …then the roll about that line, if the pose names one.
    if (aim.twist !== undefined && aim.twist !== 0) AIM_Q.premultiply(AIM_TWIST.setFromAxisAngle(AIM_WANT, aim.twist));
    bone.getWorldQuaternion(AIM_WORLD);
    bone.parent.getWorldQuaternion(AIM_PARENT);
    // local' = parentWorld⁻¹ · roll · swing · world
    bone.quaternion.copy(AIM_PARENT.invert().multiply(AIM_Q.multiply(AIM_WORLD)));
    bone.updateMatrixWorld(true);
  }

  const tracks: THREE.KeyframeTrack[] = [];
  const covered = new Set<string>();
  const end = breathe.duration > 0 ? breathe.duration : 1;
  const hold = (node: THREE.Object3D, property: string): THREE.KeyframeTrack | null => {
    const trackName = `${node.name}.${property}`;
    if (property === 'quaternion') {
      const q = node.quaternion;
      return new THREE.QuaternionKeyframeTrack(trackName, [0, end], [q.x, q.y, q.z, q.w, q.x, q.y, q.z, q.w]);
    }
    if (property === 'position') {
      const p = node.position;
      return new THREE.VectorKeyframeTrack(trackName, [0, end], [p.x, p.y, p.z, p.x, p.y, p.z]);
    }
    return null;
  };
  for (const track of breathe.tracks) {
    const parsed = THREE.PropertyBinding.parseTrackName(track.name);
    const node = root.getObjectByName(parsed.nodeName);
    const key = baseName(parsed.nodeName);
    covered.add(`${key}.${parsed.propertyName}`);
    if (node !== undefined && held.has(key)) {
      const constant = hold(node, parsed.propertyName);
      if (constant !== null) {
        tracks.push(constant);
        continue;
      }
    }
    tracks.push(track.clone());
  }
  // A held joint the breathing clip never moves still has to hold the pose.
  for (const key of held) {
    if (covered.has(`${key}.quaternion`)) continue;
    const node = bones.get(key);
    const constant = node === undefined ? null : hold(node, 'quaternion');
    if (constant !== null) tracks.push(constant);
  }
  instance.mixer.stopAllAction();
  return new THREE.AnimationClip(`rest:${name}`, end, tracks);
}

/** Does this clip translate the model's own root node? */
function hasRootMotion(clip: THREE.AnimationClip, rootName: string): boolean {
  for (const track of clip.tracks) {
    if (!track.name.endsWith('.position')) continue;
    if (track.name.startsWith(`${rootName}.`)) return true;
  }
  return false;
}

/**
 * One figure, ready to stand on the table.
 *
 * The clone is wrapped in a group that carries the normalisation, so the caller
 * writes the *pose* onto the group's parent and never has to know that one pack
 * models in metres and another in centimetres.
 */
export interface FigureInstance {
  /** Add this to the scene. One unit tall, feet at y = 0, facing +Z. */
  object: THREE.Object3D;
  /** Every `SkinnedMesh` in the clone, for the material swap. */
  meshes: THREE.Mesh[];
  mixer: THREE.AnimationMixer;
}

export interface InstantiateOptions {
  /**
   * **Slice 4 — which pose the clone's bones START in**: `rest` (the default) is
   * the model's `idle` at frame 0, `bind` the pose its skin was bound in.
   *
   * It matters because three's mixer blends every bone toward the pose it found
   * when an action was first played whenever the actions' weights sum below 1 —
   * and they do, for the ramp of every cue whose clip is also the stance's own
   * (an attacker's `attack`, a blocker's `block`). A chibi's bind pose is a
   * stubby A-pose nobody noticed; a proportioned body's is a T-pose, and every
   * attack ended in a flash of outstretched arms (photographed at `g2`@157).
   * Starting at rest makes that pose the idle. The skin's bind (its inverse bind
   * matrices) is untouched. `PropField` asks for `bind`: its anchors are written
   * in the bind pose.
   */
  pose?: 'rest' | 'bind';
}

/**
 * Hold `root`'s nodes in one frame of `clip`: each track's own interpolant,
 * evaluated at `time` — no mixer, so no clock (the arena's mixers are ticked in
 * exactly two files). Used at mount and at load, never in the frame loop.
 */
export function sampleClipInto(root: THREE.Object3D, clip: THREE.AnimationClip, time: number): void {
  for (const track of clip.tracks) {
    const parsed = THREE.PropertyBinding.parseTrackName(track.name);
    const node = root.getObjectByName(parsed.nodeName);
    if (node === undefined) continue;
    // `createInterpolant` is installed per track by `setInterpolation` (three's
    // own KeyframeTrack.js) and is missing from @types/three's declaration.
    const values = (track as unknown as { createInterpolant(): THREE.Interpolant }).createInterpolant().evaluate(time);
    if (parsed.propertyName === 'quaternion') node.quaternion.fromArray(values);
    else if (parsed.propertyName === 'position') node.position.fromArray(values);
    else if (parsed.propertyName === 'scale') node.scale.fromArray(values);
  }
}

export function instantiateFigure(model: LoadedModel, options: InstantiateOptions = {}): FigureInstance {
  const clone = cloneSkeleton(model.source);
  clone.position.set(0, model.offsetY, 0);
  clone.scale.setScalar(model.unitScale);
  clone.rotation.y = model.rotationY;
  if ((options.pose ?? 'rest') === 'rest') {
    const idle = model.clips.get('idle');
    if (idle !== undefined) sampleClipInto(clone, idle, 0);
  }

  const object = new THREE.Group();
  object.add(clone);

  const meshes: THREE.Mesh[] = [];
  clone.traverse((child) => {
    // §3.10 rule 2 — **a figure is never a click target.** `HitProxy` sits at
    // `layout(state)` and is the only thing the raycaster sees, so a lunging
    // creature can neither steal a click nor move one.
    child.raycast = () => {};
    const mesh = child as THREE.Mesh;
    if ((mesh as unknown as { isMesh?: boolean }).isMesh === true) meshes.push(mesh);
  });

  // The mixer is built **by hand** and advanced from `CueRunner`'s single
  // `useFrame`. drei's `useAnimations` registers its own `useFrame` per creature
  // (`mixer.update(delta)`, measured in `@react-three/drei@9.122.0`), which
  // would be twelve frame callbacks on a busy board and would break report 09
  // §9.2's "one `useFrame`, and it is in `CueRunner.tsx`".
  const mixer = new THREE.AnimationMixer(clone);
  return { object, meshes, mixer };
}

/**
 * §3.6's clip ladder, rungs 1 and 2. Rung 3 is `null` — **a missing clip never
 * removes the animation**, it removes only the part a model was going to add.
 */
export function clipFor(
  model: LoadedModel,
  name: string,
  alias: string | undefined,
): THREE.AnimationClip | null {
  if (alias !== undefined) {
    const byAlias = model.clips.get(alias);
    if (byAlias !== undefined) return byAlias;
  }
  return model.clips.get(name) ?? null;
}

const REST_TWINS = new WeakMap<THREE.AnimationClip, THREE.AnimationClip>();

/**
 * **The clip lane's REST twin of a model clip**: the same tracks under a clip of
 * its own, so a mixer gives it an action of its own (`clipAction` keys its
 * actions by clip). `FigureLayer` builds one rest action per clip from these,
 * and `CueRunner.driveClips` holds the stance on them, so the stance and a cue
 * that play the SAME clip — an attack cue on an attacking figure, a block cue on
 * a blocking one — are two actions at two times whose weights sum to 1, exactly
 * as a stance and a cue on different clips are. One shared action had one time
 * and only the cue's ramp weight, and three filled the rest of the weight with
 * the clone's original pose: the bind pose on a model with no `idle` (slice-4
 * follow-up 8), and a jump away from the held stance at both ends of every such
 * cue on every model (the hardening pass's first verification round).
 *
 * Built at commit and cached per source clip: every figure of a model shares one
 * twin, no keyframe is copied, and the frame loop never makes one.
 */
export function restTwin(clip: THREE.AnimationClip): THREE.AnimationClip {
  let twin = REST_TWINS.get(clip);
  if (twin === undefined) {
    twin = new THREE.AnimationClip(clip.name, clip.duration, clip.tracks, clip.blendMode);
    REST_TWINS.set(clip, twin);
  }
  return twin;
}

/**
 * §8.3 rule 3 — **preload the whole archetype set at arena mount and warm the
 * programs**, because the first-draw hitch is already a measured problem (M7
 * follow-up 1: 1–3 frames over 50 ms in the first ~40, on the first GPU upload
 * of a card's texture) and a model adds a parse, a geometry upload and a
 * skeleton bind on the frame a creature first appears.
 *
 * `renderer.compile(scene, camera)` is verified present in the installed
 * `three@0.186.0` (`WebGLRenderer.js:1396`).
 */
export function warmFigurePrograms(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
): void {
  gl.compile(scene, camera);
}
