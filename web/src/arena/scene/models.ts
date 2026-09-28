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
  return library;
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
