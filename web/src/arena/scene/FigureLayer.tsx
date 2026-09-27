/*
 * mtg-table — arena/scene/FigureLayer.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The manifestation stage, mounted** (report 13 §3.2).
 *
 * One `<Figure>` per pose that resolved to a model, plus the one instanced
 * `DiscField` that draws every creature's stand disc in a single call. It mounts
 * objects and registers rigs; it **writes no transform and starts no frame
 * loop** — `CueRunner.tsx` is still the only `useFrame` in the arena, and it is
 * where `figurePose ⊕ offsets[id]` becomes an `Object3D` (§9.2, CLAUDE.md's M7
 * convention 5).
 *
 * ---------------------------------------------------------------------------
 * What is deliberately NOT here:
 *
 *  - **No `useAnimations`.** drei's hook registers `useFrame((s, delta) =>
 *    mixer.update(delta))` **per creature** (report 12 §5.4, measured in
 *    `@react-three/drei@9.122.0`): twelve frame callbacks on a busy board, and
 *    a mixer with its own wall clock, which would lose pause, 0.5×–4×, skip and
 *    reduced motion all at once (§3.4). The mixer is built by hand here and
 *    ticked with a zero delta from the one loop.
 *  - **No `useGLTF`.** See `models.ts` — it suspends inside the canvas and
 *    carries a gstatic DRACO default.
 *  - **No decision, no click.** A figure is never a raycast target
 *    (`instantiateFigure` clears `raycast` on every child); `HitProxy` sits at
 *    `layout(state)` and is the only thing the raycaster sees.
 *
 * And the rule that makes the whole tier optional: **a missing file still draws
 * the disc.** If `figures.glb` is absent, 404s or fails to parse, `library` is
 * `null` for the life of the page, no `<Figure>` mounts, and every creature is
 * its disc — which is exactly what a fresh checkout with no binaries gets.
 * ---------------------------------------------------------------------------
 */

import { useThree } from '@react-three/fiber';
import { memo, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type * as THREE from 'three';

import type { FigureLayout, FigurePose } from '../figures/pose.ts';
import type { ModelData } from '../figures/types.ts';
import type { DiscField } from './discs.ts';
import type { FigureRigMap } from './figureRigs.ts';
import { makeHoloMaterial } from './holoMaterial.ts';
import {
  instantiateFigure,
  loadFigureModels,
  peekFigureModels,
  type LoadedModel,
  type ModelLibrary,
} from './models.ts';

export interface FigureLayerProps {
  poses: FigureLayout;
  rigs: FigureRigMap;
  discs: DiscField;
  models: ModelData;
}

/** The library path this manifest names, or the default. */
function libraryPathOf(models: ModelData): string {
  for (const entry of Object.values(models.models)) return entry.path;
  return 'models/figures.glb';
}

/**
 * `models.json` → the parsed library, or `null` while it loads **and forever if
 * it fails**. `null` is not an error state the caller handles specially: it is
 * the disc, which is a complete and readable board (§9.4).
 */
function useFigureLibrary(models: ModelData): ModelLibrary | null {
  const invalidate = useThree((s) => s.invalidate);
  const path = libraryPathOf(models);
  const [library, setLibrary] = useState<ModelLibrary | null>(() => peekFigureModels(path));

  useEffect(() => {
    if (Object.keys(models.models).length === 0) return;
    let live = true;
    loadFigureModels(models)
      .then((loaded) => {
        if (!live) return;
        setLibrary(loaded);
        // Under `frameloop='demand'` a load is the one change React does not
        // cause, so it has to ask for the repaint itself — the same line
        // `useCardTexture.ts` needs for the same reason.
        invalidate();
      })
      .catch((error: unknown) => {
        console.info(
          `[arena] figures: no model library (${String(error)}) — every creature draws its disc`,
        );
      });
    return () => {
      live = false;
    };
  }, [models, invalidate]);

  return library;
}

export function FigureLayer({ poses, rigs, discs, models }: FigureLayerProps): JSX.Element {
  const library = useFigureLibrary(models);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  const mounted = useMemo(() => {
    const out: Array<{ pose: FigurePose; model: LoadedModel }> = [];
    if (library === null) return out;
    for (const pose of poses.values()) {
      if (pose.modelId === null) continue;
      const model = library.get(pose.modelId);
      if (model === undefined) continue;
      out.push({ pose, model });
    }
    return out;
  }, [poses, library]);

  /**
   * §8.3 rule 3 — **warm the programs.** The first-draw hitch is already
   * measured (M7 follow-up 1); a skinned figure adds a program compile to the
   * frame a creature first appears on, which is the worst frame to add one to.
   */
  useEffect(() => {
    if (library === null || mounted.length === 0) return;
    gl.compile(scene, camera);
  }, [library, mounted.length, gl, scene, camera]);

  return (
    <>
      {/* One draw call for every stand disc on the table (§9.4). */}
      <primitive object={discs.mesh} />
      {mounted.map(({ pose, model }) => (
        <Figure key={`${String(pose.cardId)}:${model.id}`} pose={pose} model={model} rigs={rigs} />
      ))}
    </>
  );
}

/**
 * One figure.
 *
 * The instance is built **once per (card, model)** and outlives every frame: a
 * `Placement` is a new object each frame (P5) and so is a `FigurePose`, but the
 * mesh, the skeleton, the mixer and the material are not, and rebuilding them
 * per frame is exactly the cost report 09 §9.3 rule 2 ("mount once, mutate") is
 * about.
 */
const Figure = memo(function Figure({
  pose,
  model,
  rigs,
}: {
  pose: FigurePose;
  model: LoadedModel;
  rigs: FigureRigMap;
}): JSX.Element {
  const invalidate = useThree((s) => s.invalidate);

  const built = useMemo(() => {
    const instance = instantiateFigure(model);
    const material = makeHoloMaterial(pose.tint);
    for (const mesh of instance.meshes) mesh.material = material;

    const actions = new Map<string, THREE.AnimationAction>();
    for (const [key, clip] of model.clips) {
      const action = instance.mixer.clipAction(clip);
      action.enabled = false;
      actions.set(key, action);
    }

    // **The first frame's pose, and nothing more.** From T3 the clip lane owns
    // every weight and every `action.time` (`CueRunner.driveClips`); this is here
    // so that a figure that mounts between two `useFrame` passes is standing in
    // its idle rather than in its bind pose for one frame. §8.3 rule 1 and user
    // decision 7 still hold — the idle only *advances* while the queue is awake,
    // so `frameloop='demand'` keeps its measured zero idle frames.
    const idle = actions.get('idle');
    if (idle !== undefined) {
      idle.enabled = true;
      idle.setEffectiveWeight(1);
      idle.play();
      idle.time = 0;
    }
    // A zero delta scrubs without advancing: `AnimationAction._updateTime`
    // returns `this.time` untouched for `deltaTime === 0` (three 0.186).
    instance.mixer.update(0);

    return { instance, material, actions };
    // `pose.tint` is read once for the initial value; the live one is written by
    // `CueRunner` into the uniform every frame, so it is not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  /**
   * **Registration is keyed on the CARD, not on the pose** (T3), and the split
   * into two effects is load-bearing.
   *
   * A `FigurePose` is a new object every frame the state changes (P5), so an
   * effect with `pose` in its deps re-runs about once a second — and React runs
   * the **cleanup first**, so a single effect that both registered the rig and
   * deleted it on cleanup would delete and rebuild the rig on every snapshot.
   * That resets the clip lane's `rest`/`clip` selection and its `restTime`, i.e.
   * every figure re-`play()`s its idle from frame 0 whenever anything on the
   * table changes. The lane's state belongs to the *figure*, which outlives the
   * frame; only `pose` is replaced.
   *
   * `pose.cardId` is stable for the life of this component — it is half the
   * `key` — so this effect runs on mount and unmount and at no other time.
   */
  useLayoutEffect(() => {
    const cardId = pose.cardId;
    rigs.set(cardId, {
      root: built.instance.object,
      mixer: built.instance.mixer,
      actions: built.actions,
      material: built.material,
      pose,
      appliedTint: null,
      appliedFrozen: false,
      // T3's clip lane adopts these on its first pass: `null` means "nothing is
      // selected yet", which is how the runner knows to call `play()` once.
      rest: null,
      clip: null,
      restTime: 0,
    });
    return () => {
      if (rigs.get(cardId)?.root === built.instance.object) rigs.delete(cardId);
    };
    // The pose is written by the effect below; taking it as a dep here is what
    // caused the rebuild described above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rigs, built, pose.cardId]);

  useLayoutEffect(() => {
    const rig = rigs.get(pose.cardId);
    if (rig !== undefined && rig.root === built.instance.object) rig.pose = pose;
    invalidate();
  }, [rigs, built, pose, invalidate]);

  useEffect(
    () => () => {
      built.instance.mixer.stopAllAction();
      // The geometry and the source material are SHARED by every clone
      // (`SkeletonUtils.clone` reuses them by reference) and must not be
      // disposed here. The holographic material is this figure's own.
      built.material.dispose();
    },
    [built],
  );

  return <primitive object={built.instance.object} />;
});
