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
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import {
  REST_CLIP_FOR,
  REST_PHASE_FOR,
  departureDrain,
  departureOpacity,
  departureWeight,
  keepDeparture,
  stepDeparture,
  type ClipRequest,
  type DepartureLane,
} from '../figures/clips.ts';
import {
  departedFigures,
  departureStand,
  type FigureLayout,
  type FigurePose,
} from '../figures/pose.ts';
import type { ModelData } from '../figures/types.ts';
import { DEFAULT_LOOK, HOLO_MATERIAL, figureLookOf, materialLookOf, wantsShadows, type LookSpec, type MaterialLook } from '../look.ts';
import type { DeathSource, DepartureBinder, DiscField, OffsetSource } from './discs.ts';
import { personalModelKey } from '../personal.ts';
import {
  applyComicGlobals,
  applyCostume,
  applyLook,
  dressFigureMeshes,
  type FigureMaterial,
} from './figureMaterial.ts';
import type { FigureRig, FigureRigMap } from './figureRigs.ts';
import { compileFor } from './prime.ts';
import {
  clipFor,
  instantiateFigure,
  loadFigureModels,
  peekFigureModels,
  restTwin,
  type FigureInstance,
  type LoadedModel,
  type ModelLibrary,
} from './models.ts';
import { PropField, type PropBody } from './props.ts';
import {
  applyStandeeRim,
  applyStandeeStance,
  makeStandeeMaterial,
  makeStandeeMesh,
  type LoadedStandee,
  type StandeeMaterial,
} from './reliefCache.ts';
import { STANDEE_STANCES, standeeFallOf } from '../standee.ts';
import type { StatusLayout } from '../figures/status.ts';
import { StatusField } from './status.ts';

export interface FigureLayerProps {
  poses: FigureLayout;
  rigs: FigureRigMap;
  discs: DiscField;
  models: ModelData;
  /**
   * **The look** (`arena/look.ts`, D137): the comic look (the default) or the
   * hologram, and its options. Applied at COMMIT — every figure's material
   * (through `figureLookOf`, so an anonymous figure and a ghost stay holograms,
   * D142), the departing bodies, the comic block's shared uniforms, the disc
   * field (the contact shadows, D140) and the prop field — never from the frame
   * loop (`liveness.test.ts`).
   */
  look?: LookSpec;
  /**
   * **Whether a composer draws the frames** (bloom or the ink, `Post.tsx`): the
   * mount-time primes below compile for the target the scene is drawn into
   * (`prime.ts`), and run again when it changes.
   */
  composer?: boolean;
  /**
   * **The status layer** (D210): every creature's strip — keyword icons, bar,
   * pips, marks — as `figures/status.ts`'s `statusLayout(layout(state), poses)`
   * computed it for THIS snapshot. Committed below into one instanced field;
   * absent draws no strip.
   */
  status?: StatusLayout;
  /**
   * **The personal tier** (phase 2, D195): the loaded personal models and their
   * resting-pose variants, by opaque id (`scene/personalModels.ts`). A pose that
   * `arena/personal.ts` dressed (`pose.personal`) mounts its model from here;
   * every other pose, and a dressed one whose model is missing, the CC0 library's.
   */
  personal?: ReadonlyMap<string, LoadedModel>;
  /**
   * **The portrait standee** (D260): the loaded standees, by opaque id
   * (`scene/reliefCache.ts`'s `useStandees`). A pose `arena/standee.ts` dressed
   * (`pose.standee`) stands as its standee — the painting's near subjects, cut —
   * and mounts no model; the living one and the falling body alike.
   */
  standees?: ReadonlyMap<string, LoadedStandee>;
}

/**
 * **The model a pose mounts** — the one place the figure layer chooses a source:
 * a dressed pose's personal model (its resting variant, else its base), else the
 * CC0 library's `modelId`.
 */
function modelOf(pose: FigurePose, library: ModelLibrary | null, personal: ReadonlyMap<string, LoadedModel> | undefined): LoadedModel | undefined {
  // A standee (D260) is not a model: it mounts no body of either tier.
  if (pose.standee !== undefined) return undefined;
  const key = personalModelKey(pose);
  if (key !== null && personal !== undefined) {
    const own = personal.get(key) ?? (pose.personal === undefined ? undefined : personal.get(pose.personal));
    if (own !== undefined) return own;
  }
  return pose.modelId === null || library === null ? undefined : library.get(pose.modelId);
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

const NO_STATUS: StatusLayout = new Map();

export function FigureLayer({
  poses,
  rigs,
  discs,
  models,
  look = DEFAULT_LOOK,
  composer = false,
  status = NO_STATUS,
  personal,
  standees,
}: FigureLayerProps): JSX.Element {
  const library = useFigureLibrary(models);
  // The look's numbers, rebuilt only when the look itself changes: every write
  // below is keyed on this object, so a new snapshot writes nothing.
  const tableLook = useMemo(() => materialLookOf(look), [look]);
  const shadows = wantsShadows(look);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const dpr = useThree((s) => s.viewport.dpr);
  const invalidate = useThree((s) => s.invalidate);

  /**
   * **T8 — the departing figures** (Tier 2 follow-up 2; see {@link DepartureField}).
   * Built once, installed into the disc field for the layer's lifetime so the one
   * `useFrame` binds them, and fed at COMMIT time — never from the frame loop —
   * with the figures that left between the previous frame and this one.
   */
  const departures = useMemo(() => new DepartureField(), []);
  // **The look, at COMMIT** (D137): the comic block's shared uniforms (the
  // halftone, the key's frame, the dot size at this render dpr), the bodies
  // that fall from now on, and the disc field — its contact shadows and how far
  // a modelled figure's glowing disc steps back. Only when the look or the dpr
  // changes; the frame loop reads numbers.
  useLayoutEffect(() => {
    applyComicGlobals(tableLook, dpr);
    // D261 (amended): the standees' ink rim, the figures' outer ink at this dpr.
    applyStandeeRim(dpr);
    departures.setLook(tableLook);
    discs.setLook(tableLook, shadows, camera);
    invalidate();
  }, [departures, discs, tableLook, shadows, dpr, camera, invalidate]);
  useEffect(() => {
    discs.setDepartures(departures);
    return () => {
      discs.setDepartures(null);
      departures.dispose();
    };
  }, [discs, departures]);
  const previousPoses = useRef<FigureLayout | null>(null);
  useLayoutEffect(() => {
    const before = previousPoses.current;
    previousPoses.current = poses;
    departures.commit(poses);
    if ((library === null && personal === undefined && standees === undefined) || before === null || before === poses) return;
    for (const pose of departedFigures(before, poses)) {
      // Slice 3: a ring swarm's body is never drawn, so it has no body to die.
      if (pose.swarm > 0 && pose.formation === 'ring') continue;
      // D260: a standee falls as a standee — the same slot, the same queue decision.
      if (pose.standee !== undefined) {
        const standee = standees?.get(pose.standee);
        if (standee !== undefined) departures.addStandee(pose, standee, departureStand(pose, poses));
        continue;
      }
      const model = modelOf(pose, library, personal);
      // Where it is drawn is decided here, at commit, from the frame it left and
      // the frame it left for: out of the rank that has just closed up.
      if (model !== undefined) departures.add(pose, model, departureStand(pose, poses));
    }
  }, [poses, library, departures, personal, standees]);

  /**
   * **Slice 3 — the prop field** (`scene/props.ts`): every figure's props, the
   * swarms and squads, and the vehicle silhouettes, one instanced mesh per kind.
   * Built once, installed into the disc field for the layer's lifetime so the one
   * `useFrame` binds it (after the rigs are posed), handed the library when it
   * loads, and COMMITTED here, once per snapshot, after every `<Figure>` below has
   * registered its rig (a child's layout effect runs before its parent's).
   */
  const props = useMemo(() => new PropField(), []);
  useEffect(() => {
    discs.setProps(props);
    return () => {
      discs.setProps(null);
      props.dispose();
    };
  }, [discs, props]);
  /**
   * **The status layer** (`scene/status.ts`, D210): every strip on the table in
   * one instanced mesh. Built once, installed into the disc field for the
   * layer's lifetime so the one `useFrame` binds it (after the props), and
   * COMMITTED here, once per snapshot. The viewport it measures pixels against
   * it reads from the renderer as it is drawn (`StatusField.track`).
   */
  const strips = useMemo(() => new StatusField(), []);
  useEffect(() => {
    discs.setStatus(strips);
    return () => {
      discs.setStatus(null);
      strips.dispose();
    };
  }, [discs, strips]);
  useLayoutEffect(() => {
    strips.commit(status);
    invalidate();
  }, [strips, status, invalidate]);
  useEffect(() => {
    // §8.3 rule 3: one compile of the prop program — and of the contact shadows'
    // (D140) and the status strips' — at mount, not on the frame the first prop,
    // shadow or strip appears. `compile` skips invisible objects, so show them for it.
    props.setPrimeVisible(true);
    discs.setPrimeVisible(true);
    strips.setPrimeVisible(true);
    // For the target the frames are drawn into — the composer's, or the canvas (`prime.ts`).
    compileFor(gl, scene, camera, composer);
    props.setPrimeVisible(false);
    discs.setPrimeVisible(false);
    strips.setPrimeVisible(false);
  }, [props, discs, strips, gl, scene, camera, composer]);
  const mounted = useMemo(() => {
    const out: Array<{ pose: FigurePose; model: LoadedModel }> = [];
    if (library === null && personal === undefined) return out;
    for (const pose of poses.values()) {
      if (pose.modelId === null) continue;
      const model = modelOf(pose, library, personal);
      if (model === undefined) continue;
      out.push({ pose, model });
    }
    return out;
  }, [poses, library, personal]);
  /** D260: the poses that stand as standees, each with its loaded standee (a pose only carries one once it has loaded). */
  const standing = useMemo(() => {
    const out: Array<{ pose: FigurePose; standee: LoadedStandee }> = [];
    if (standees === undefined) return out;
    for (const pose of poses.values()) {
      if (pose.standee === undefined) continue;
      const standee = standees.get(pose.standee);
      if (standee !== undefined) out.push({ pose, standee });
    }
    return out;
  }, [poses, standees]);

  /**
   * §8.3 rule 3 — **warm the programs.** The first-draw hitch is already
   * measured (M7 follow-up 1); a skinned figure adds a program compile to the
   * frame a creature first appears on, which is the worst frame to add one to.
   */
  useEffect(() => {
    // D260: a standee's program too, on the commit the first one mounts.
    if ((library === null || mounted.length === 0) && standing.length === 0) return;
    compileFor(gl, scene, camera, composer);
  }, [library, mounted.length, standing.length, gl, scene, camera, composer]);

  // The props of THIS snapshot, bound against the rigs its figures registered —
  // and against the bodies dying in it (added by the departures' layout effect
  // above, which runs first), so a falling figure keeps what it carried.
  useLayoutEffect(() => {
    if (library !== null) props.setLibrary(library, models);
    props.commit(poses, rigs, models, departures.bodies());
  }, [props, poses, rigs, models, library, mounted, departures]);
  // The prop kinds' look — only when the look changes (a kind built later by
  // `setLibrary` takes the field's current look itself).
  useLayoutEffect(() => {
    props.setLook(tableLook);
    invalidate();
  }, [props, tableLook, invalidate]);

  return (
    <>
      {/* One draw call for every stand disc on the table (§9.4) — and a second,
          after the cards, for the discs of a wrapped rank's back row, which stand
          ON their own card (T8 fix; empty on any frame that does not wrap). */}
      {/* D140: the contact shadows, one call for all, empty under the hologram. */}
      <primitive object={discs.shadowMesh} />
      <primitive object={discs.mesh} />
      <primitive object={discs.onCardMesh} />
      {/* T8: the bodies of the creatures that just died, drawn until their deaths end. */}
      <primitive object={departures.group} />
      {/* Slice 3: what every figure carries, and the vehicles overhead — one draw call per kind. */}
      <primitive object={props.group} />
      {/* The status layer (D210): every creature's strip — one draw call for the table. */}
      <primitive object={strips.mesh} />
      {mounted.map(({ pose, model }) => (
        <Figure
          key={`${String(pose.cardId)}:${model.id}`}
          pose={pose}
          model={model}
          rigs={rigs}
          look={figureLookOf(pose, tableLook).look}
        />
      ))}
      {/* D260: the portrait standees — one mesh, one call each, on one program. */}
      {standing.map(({ pose, standee }) => (
        <Standee key={`${String(pose.cardId)}:${standee.id}`} pose={pose} standee={standee} rigs={rigs} />
      ))}
    </>
  );
}

/**
 * **One standee on the table** (D260): its painting's near subjects, cut, on
 * the shared two-sheet geometry with a material of its own. It registers a rig
 * the one frame loop writes as it writes a figure's — the pose's stand point ⊕
 * the cue's offset, its height as the scale, and the numbers `uTint`,
 * `uOpacity` and `uMaterialize` — and its rig has NO actions: a clip request on
 * it plays nothing (there is no skeleton to play it on), so the clip lane is
 * simply absent. The stance is written at COMMIT (`applyStandeeStance`, D262),
 * the textures are uploaded at mount, and it takes no click.
 */
const Standee = memo(function Standee({
  pose,
  standee,
  rigs,
}: {
  pose: FigurePose;
  standee: LoadedStandee;
  rigs: FigureRigMap;
}): JSX.Element {
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  const built = useMemo(() => {
    const material = makeStandeeMaterial(standee, pose.tint);
    const mesh = makeStandeeMesh(material);
    return { mesh, material, mixer: new THREE.AnimationMixer(mesh) };
    // `pose.tint` is the initial value; the frame loop writes the live one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standee]);
  // Uploaded at mount, never on the frame a standee is first drawn.
  useLayoutEffect(() => {
    gl.initTexture(standee.map);
    gl.initTexture(standee.depth);
    gl.initTexture(standee.back);
  }, [gl, standee]);
  useLayoutEffect(() => {
    const cardId = pose.cardId;
    rigs.set(cardId, standeeRig(built, pose));
    return () => {
      if (rigs.get(cardId)?.root === built.mesh) rigs.delete(cardId);
    };
    // Keyed on the card, as a figure's registration is (see `Figure`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rigs, built, pose.cardId]);
  useLayoutEffect(() => {
    const rig = rigs.get(pose.cardId);
    if (rig !== undefined && rig.root === built.mesh) rig.pose = pose;
    applyStandeeStance(built.material, pose);
    invalidate();
  }, [rigs, built, pose, invalidate]);
  useEffect(
    () => () => {
      // The geometry is the page's and the textures the loader's: the material is this standee's own.
      built.material.dispose();
    },
    [built],
  );
  return <primitive object={built.mesh} />;
});

/** **A standee's rig** — the figure rig's shape with no actions, so the clip lane finds nothing to play. */
export function standeeRig(built: { mesh: THREE.Object3D; material: StandeeMaterial; mixer: THREE.AnimationMixer }, pose: FigurePose): FigureRig {
  return {
    root: built.mesh,
    mixer: built.mixer,
    actions: new Map(),
    restActions: new Map(),
    material: built.material,
    pose,
    appliedTint: null,
    appliedFrozen: false,
    rest: null,
    clip: null,
    restTime: 0,
  };
}

/**
 * **The first frame's pose, and nothing more.** From T3 the clip lane owns every
 * weight and every `action.time` (`CueRunner.driveClips`); this is here so that
 * a figure that mounts between two `useFrame` passes is standing in its idle
 * rather than in its bind pose for one frame. §8.3 rule 1 and user decision 7
 * still hold — the idle only *advances* while the queue is awake, so
 * `frameloop='demand'` keeps its measured zero idle frames. It is the REST
 * lane's idle (its `restTwin`), and the action it returns is the one the clip
 * lane ADOPTS as `rest` ({@link newFigureRig}) — never a second, unowned action.
 */
export function mountRestLane(restActions: ReadonlyMap<string, THREE.AnimationAction>): THREE.AnimationAction | null {
  const idle = restActions.get('idle');
  if (idle === undefined) return null;
  idle.enabled = true;
  idle.setEffectiveWeight(1);
  idle.play();
  idle.time = 0;
  return idle;
}

/** What one {@link Figure}'s build hands the rig map. */
export interface BuiltFigure {
  instance: Pick<FigureInstance, 'object' | 'mixer'>;
  material: FigureMaterial;
  actions: Map<string, THREE.AnimationAction>;
  restActions: Map<string, THREE.AnimationAction>;
  /** The action {@link mountRestLane} started, or `null` for a model with no idle. */
  mounted: THREE.AnimationAction | null;
}

/**
 * **The rig a mounted figure registers** — the clip lane's state starts from what
 * the mount actually left playing.
 *
 * `rest` is the action {@link mountRestLane} started, not `null`. The first cut
 * of the rig said `null` ("nothing is selected yet"), and `driveClips` stops
 * only the `rest` it knows about — so a figure that MOUNTED tapped, attacking or
 * blocking played its stance at full weight on top of the mount's idle, also at
 * full weight, and three normalised the pair to a 50/50 blend for as long as the
 * figure lived. With Lane BODIES' variants that idle IS the signature pose (a
 * kneeling Fury with his arms still folded), and Fury's own ability — a card put
 * onto the battlefield tapped and attacking — takes exactly this path. Adopting
 * it, the lane's first pass sees a different stance clip, stops the idle and
 * lands in the stance alone (`test/clip-lane.test.tsx`, negative-controlled).
 */
export function newFigureRig(built: BuiltFigure, pose: FigurePose): FigureRig {
  return {
    root: built.instance.object,
    mixer: built.instance.mixer,
    actions: built.actions,
    restActions: built.restActions,
    material: built.material,
    pose,
    appliedTint: null,
    appliedFrozen: false,
    rest: built.mounted,
    // The transient: `null` until a cue asks for one.
    clip: null,
    restTime: 0,
  };
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
  look = 0,
}: {
  pose: FigurePose;
  model: LoadedModel;
  rigs: FigureRigMap;
  /** `uLook` for this figure (`look.ts`'s `figureLookOf`: 0 for a ghost, D142). */
  look?: number;
}): JSX.Element {
  const invalidate = useThree((s) => s.invalidate);

  const built = useMemo(() => {
    const instance = instantiateFigure(model);
    // One material on every mesh — a personal model is one paint too since D240.
    const material = dressFigureMeshes(instance.meshes, pose.tint, model.unitScale);

    // Two actions per clip: the cue lane's and the rest lane's (on the clip's
    // `restTwin`), so a stance and a cue on the same clip are never one action.
    const actions = new Map<string, THREE.AnimationAction>();
    const restActions = new Map<string, THREE.AnimationAction>();
    for (const [key, clip] of model.clips) {
      const action = instance.mixer.clipAction(clip);
      action.enabled = false;
      actions.set(key, action);
      const rest = instance.mixer.clipAction(restTwin(clip));
      rest.enabled = false;
      restActions.set(key, rest);
    }

    const mounted = mountRestLane(restActions);
    // A zero delta scrubs without advancing: `AnimationAction._updateTime`
    // returns `this.time` untouched for `deltaTime === 0` (three 0.186).
    instance.mixer.update(0);

    return { instance, material, actions, restActions, mounted };
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
    rigs.set(cardId, newFigureRig(built, pose));
    return () => {
      if (rigs.get(cardId)?.root === built.instance.object) rigs.delete(cardId);
    };
    // The pose is written by the effect below; taking it as a dep here is what
    // caused the rebuild described above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rigs, built, pose.cardId]);

  /**
   * **Slice 4 — the costume, written at COMMIT** (never in the frame loop): the
   * pose's palette, washed if the pose is frozen, into this figure's own material.
   * A new pose object arrives every snapshot; the key skips the ones whose palette
   * did not change, so the strings are parsed about once a game.
   */
  const costumeKey = useRef<string | null>(null);
  useLayoutEffect(() => {
    const rig = rigs.get(pose.cardId);
    if (rig !== undefined && rig.root === built.instance.object) rig.pose = pose;
    costumeKey.current = applyCostume(built.material, pose.costume ?? null, pose.frozen, costumeKey.current);
    invalidate();
  }, [rigs, built, pose, invalidate]);

  // **The look, at COMMIT** (D137, D142): one uniform on this figure's own
  // material — only when the number changes, never in the frame loop.
  useLayoutEffect(() => {
    applyLook(built.material, look);
    invalidate();
  }, [built, look, invalidate]);

  // **Slice 3 — a ring swarm is its members, not its body** (Ant-Man's Air Force):
  // the rig still stands at the centre for the clip lane and the camera, but is
  // not drawn — the prop field draws the five bees round it.
  const ring = pose.swarm > 0 && pose.formation === 'ring';
  useLayoutEffect(() => {
    for (const mesh of built.instance.meshes) mesh.visible = !ring;
  }, [built, ring]);

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

// ---------------------------------------------------------------------------
// T8 — the departing figures (Tier 2 follow-up 2; the blink fixed in D64)
// ---------------------------------------------------------------------------

/**
 * At most this many departing bodies are held at once — the length of the fixed
 * slot array the frame loop walks. A board wipe of more drops the oldest.
 */
export const MAX_DEPARTURES = 8;
/** The dissolve cue's own grey (`cues/registry.ts`'s `GREY`): a dying hologram drains toward it. */
const DYING_GREY = new THREE.Color('#8b939e');

interface Departure {
  cardId: number;
  /** Commit order, for "drop the oldest" when every slot is full. */
  seq: number;
  instance: FigureInstance;
  material: FigureMaterial | StandeeMaterial;
  /**
   * D260: the falling STANDEE's material (the same object as `material`), or
   * `null` for a body — it falls back on its base (`standeeFallOf`) where a body
   * plays its `die` clip.
   */
  standee: StandeeMaterial | null;
  /** A standee's lean when it left the table (its last stance's, D262): it falls from there. */
  lean: number;
  /** Every clip of the model, as an action on this body — built at commit. */
  actions: Map<string, THREE.AnimationAction>;
  /** The model's `die` clip, or `null` (§3.6 rung 3: the body still fades). */
  die: THREE.AnimationAction | null;
  /** The stance it held on its last frame, which every clip plays over. */
  rest: THREE.AnimationAction | null;
  /**
   * The transient playing on the body before its death cue starts — the `hit`
   * of the blow that killed it, usually — or `null`. When the die clip takes
   * over it is held where it was and faded out with the stance, so the fall
   * starts from the recoil rather than snapping back to the stance first.
   */
  clip: THREE.AnimationAction | null;
  /** The weight {@link Departure.clip} was last drawn at. */
  clipWeight: number;
  /** Its last pose — the previous frame's, and the only thing it remembers. */
  pose: FigurePose;
  /** Its tint, parsed once at commit so the frame loop never parses a string. */
  base: THREE.Color;
  /** Its fate: `figures/clips.ts`'s `stepDeparture` is the whole rule. */
  lane: DepartureLane;
  /** Snapshots since it departed, while its fate is undecided. */
  age: number;
}

/**
 * **The body of a creature that has just died, from the snapshot it dies in
 * until its death cue has ended** (Tier 2 follow-up 2, D56's clause superseded,
 * **D64** — see `figures/clips.ts`).
 *
 * `figurePose` is a pure function of the snapshot, and the snapshot that carries
 * a `zone → graveyard` event already shows the creature in the graveyard: no pose,
 * no figure. This field holds the body the last frame had — built at COMMIT time
 * from the previous frame's pose, never from the frame loop — and decides its fate
 * on its first frame from the queue (`CueQueue.deathPending`): a creature whose
 * death cue is queued or running is **dying**, and is drawn on every frame from
 * then until that cue has ended —
 *
 *   - at its last stance, one step out of the rank that has closed up behind it
 *     (`departureStand`), while the batch's earlier cues play: the `hit` of the
 *     blow that killed it plays on the body, on that cue's `t`;
 *   - then the die clip takes over (`departureWeight`) from whatever the body was
 *     doing, and never hands back — a death does not stand up again;
 *   - it fades out over the death cue's last 40% (`departureOpacity`) and drains
 *     toward grey, so it is already gone when the cue is;
 *   - the frame the death cue has ended — played out, or skipped, flushed,
 *     scrubbed away, a new `gameId` — the lane is `done` and the body is not
 *     drawn again.
 *
 * A departure with no death cue — bounced, flickered, turned face down — is
 * never drawn and is let go at the next snapshot. The slice-2 version drew a body
 * only while its `die` REQUEST was on the stage, and every death blinked: the
 * creature vanished when the blow landed and popped back to fall (verification
 * pass, `g1.jsonl` frames 202, 298 and 359). `clips.test.ts` now walks the queue's
 * timeline over every death in the corpus with this rule.
 *
 * Everything the frame loop does here is a weight, a time, an opacity and a colour
 * lerp against objects built at commit — an indexed walk over a fixed array of
 * {@link MAX_DEPARTURES} slots, no iterator, no allocation, no React state, and
 * `mixer.update(0)`: the cue's clock is the only clock (§3.4).
 */
export class DepartureField implements DepartureBinder {
  readonly group = new THREE.Group();
  /** Fixed length for the life of the field: the frame loop walks it by index. */
  private readonly slots: Array<Departure | null> = new Array<Departure | null>(MAX_DEPARTURES).fill(null);
  private seq = 0;
  private shown = 0;
  /** The table's look, which a body falling from now on is built in — written at commit. */
  private look: MaterialLook = HOLO_MATERIAL;

  constructor() {
    this.group.name = 'departures';
  }

  /**
   * **The look, at COMMIT** (`FigureLayer`'s layout effect — never the frame
   * loop): the bodies falling now keep what they fell in, one uniform each, and
   * a body added from now on is built in it.
   */
  setLook(look: MaterialLook): void {
    this.look = look;
    for (let i = 0; i < MAX_DEPARTURES; i++) {
      const entry = this.slots[i] ?? null;
      // A standee is the painting under either look (D260): no look to write.
      if (entry !== null && entry.standee === null) applyLook(entry.material as FigureMaterial, figureLookOf(entry.pose, look).look);
    }
  }

  /**
   * Commit phase: a figure that was on the table last frame and is not now,
   * drawn at `stand` (`departureStand`) if it turns out to be dying.
   */
  add(pose: FigurePose, model: LoadedModel, stand: readonly [number, number, number]): void {
    this.dropCard(pose.cardId);
    const instance = instantiateFigure(model);
    const material = dressFigureMeshes(instance.meshes, pose.tint, model.unitScale);
    // The body falls in what it wore (slice 4) — its palette, as its last frame had it.
    applyCostume(material, pose.costume ?? null, false);
    applyLook(material, figureLookOf(pose, this.look).look);
    material.uniforms.uDrainTo.value.copy(DYING_GREY);
    const object = instance.object;
    object.position.set(stand[0], stand[1], stand[2]);
    object.rotation.set(0, pose.facingY, 0);
    object.scale.setScalar(Math.max(0.0001, pose.height));
    object.visible = false;

    const mixer = instance.mixer;
    const actions = new Map<string, THREE.AnimationAction>();
    for (const [key, clip] of model.clips) {
      const action = mixer.clipAction(clip);
      action.enabled = false;
      actions.set(key, action);
    }
    const restClip =
      clipFor(model, REST_CLIP_FOR[pose.stance], pose.clips[REST_CLIP_FOR[pose.stance]]) ??
      clipFor(model, 'idle', pose.clips['idle']);
    const rest = restClip === null ? null : mixer.clipAction(restClip);
    if (rest !== null) {
      rest.enabled = true;
      rest.setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY);
      rest.play();
      rest.time = REST_PHASE_FOR[pose.stance] * rest.getClip().duration;
      rest.setEffectiveWeight(1);
    }
    const dieClip = clipFor(model, 'die', pose.clips['die']);
    const die = dieClip === null ? null : mixer.clipAction(dieClip);
    if (die !== null) {
      die.enabled = true;
      die.setLoop(THREE.LoopOnce, 1);
      die.clampWhenFinished = true;
      die.play();
      die.time = 0;
      die.setEffectiveWeight(0);
    }
    mixer.update(0);

    this.group.add(object);
    const entry: Departure = {
      cardId: pose.cardId,
      seq: this.seq++,
      instance,
      material,
      standee: null,
      lean: 0,
      actions,
      die,
      rest,
      clip: null,
      clipWeight: 0,
      pose,
      base: new THREE.Color(pose.tint),
      lane: { dying: null, done: false },
      age: 0,
    };
    this.place(entry);
  }

  /**
   * **Commit phase — a STANDEE that has just left the table** (D260), drawn at
   * `stand` if it turns out to be dying: its own mesh and material on the loaded
   * standee's textures, its last stance's lean, no actions. It takes the same
   * slot, the same queue decision (`stepDeparture`) and the same fade and drain as
   * a body — and where a body plays `die`, it falls back on its base.
   */
  addStandee(pose: FigurePose, standee: LoadedStandee, stand: readonly [number, number, number]): void {
    this.dropCard(pose.cardId);
    const material = makeStandeeMaterial(standee, pose.tint);
    applyStandeeStance(material, pose);
    material.uniforms.uWash.value = 0;
    const mesh = makeStandeeMesh(material);
    mesh.position.set(stand[0], stand[1], stand[2]);
    mesh.rotation.set(0, pose.facingY, 0);
    mesh.scale.setScalar(Math.max(0.0001, pose.height));
    mesh.visible = false;
    this.group.add(mesh);
    this.place({
      cardId: pose.cardId,
      seq: this.seq++,
      instance: { object: mesh, meshes: [mesh], mixer: new THREE.AnimationMixer(mesh) },
      material,
      standee: material,
      lean: STANDEE_STANCES[pose.stance].lean,
      actions: new Map(),
      die: null,
      rest: null,
      clip: null,
      clipWeight: 0,
      pose,
      base: new THREE.Color(pose.tint),
      lane: { dying: null, done: false },
      age: 0,
    });
  }

  /** Into a free slot, or the oldest body's (a board wipe bigger than the field drops the oldest first). */
  private place(entry: Departure): void {
    let free = -1;
    let oldest = 0;
    for (let i = 0; i < MAX_DEPARTURES; i++) {
      const slot = this.slots[i] ?? null;
      if (slot === null) {
        if (free < 0) free = i;
        continue;
      }
      if (slot.seq < (this.slots[oldest]?.seq ?? Number.POSITIVE_INFINITY)) oldest = i;
    }
    // A board wipe bigger than the field drops the oldest body first.
    if (free < 0) {
      this.dropSlot(oldest);
      free = oldest;
    }
    this.slots[free] = entry;
  }

  /**
   * Commit phase: the figures standing now. A departed card that is back on the
   * table is the living figure's again; a body whose death has played, or that
   * was never dying, is disposed; an undecided one ages out
   * (`figures/clips.ts`'s `keepDeparture`).
   */
  commit(present: FigureLayout): void {
    for (let i = 0; i < MAX_DEPARTURES; i++) {
      const entry = this.slots[i] ?? null;
      if (entry === null) continue;
      if (entry.lane.dying === null) entry.age += 1;
      if (!keepDeparture(entry.lane, present.has(entry.cardId), entry.age)) this.dropSlot(i);
    }
  }

  /**
   * **The frame loop's half** — called once per frame from `DiscField.bind`,
   * i.e. from `CueRunner`'s one `useFrame`, after the queue has ticked.
   */
  bind(source: OffsetSource, deaths: DeathSource): void {
    let shown = 0;
    for (let i = 0; i < MAX_DEPARTURES; i++) {
      const entry = this.slots[i] ?? null;
      if (entry === null) continue;
      const object = entry.instance.object;
      const request = source.clipOf(entry.cardId);
      if (!stepDeparture(entry.lane, deaths.deathPending(entry.cardId), request)) {
        object.visible = false;
        continue;
      }
      shown += 1;
      object.visible = true;
      const uniforms = entry.material.uniforms;
      // **The reverse summon** (report 15 §2.3; D148): the dying card's own
      // dissolve cue ramps `Offset.materialize` 1 → 0 over the first half of the
      // fall, and the falling body's ink drains back to hologram with it — the same
      // number `CueRunner`'s `applyMaterialize` writes on a living figure, into the
      // same handle (`uLook × uMaterialize`); identity 1 whenever no cue says
      // otherwise (reduced motion, comic FX off, before the death cue starts). A
      // number in the frame loop like `uDrain` below, never the look itself (the
      // Lane LOOK liveness clause), and it allocates nothing.
      const materialize = source.offsetOf(entry.cardId).materialize;
      uniforms.uMaterialize.value = materialize >= 1 ? 1 : Math.max(0, materialize);
      if (request !== null && request.clip === 'die') {
        // The death cue is running: the fall, on its own clock.
        const t = request.t;
        const weight = departureWeight(t);
        const others = 1 - weight;
        if (entry.die !== null) {
          const duration = entry.die.getClip().duration;
          entry.die.time = duration > 0 ? Math.min(duration, t * duration) : 0;
          entry.die.setEffectiveWeight(entry.rest === null && entry.clip === null ? 1 : weight);
        }
        // Whatever the body was doing hands over to the fall: the transient is
        // HELD where it was (its time is not written) and both fade together.
        const held = entry.die === null ? 1 : others;
        if (entry.clip !== null) entry.clip.setEffectiveWeight(entry.clipWeight * held);
        if (entry.rest !== null) entry.rest.setEffectiveWeight((1 - entry.clipWeight) * held);
        uniforms.uOpacity.value = entry.pose.opacity * departureOpacity(t);
        // The drain reaches every costume slot through the shader (slice 4):
        // a number here, the grey is the material's own `uDrainTo`.
        uniforms.uTint.value.copy(entry.base);
        uniforms.uDrain.value = departureDrain(t);
        // D260: a standee has no `die` clip — it falls back on its base, a number.
        if (entry.standee !== null) {
          const fall = standeeFallOf(t);
          entry.standee.uniforms.uLean.value = fall > entry.lean ? fall : entry.lean;
        }
      } else {
        // Before its death cue: the body as it last stood, taking the blow.
        this.driveTransient(entry, request);
        if (entry.die !== null) entry.die.setEffectiveWeight(0);
        uniforms.uOpacity.value = entry.pose.opacity;
        uniforms.uTint.value.copy(entry.base);
        uniforms.uDrain.value = 0;
        if (entry.standee !== null) entry.standee.uniforms.uLean.value = entry.lean;
      }
      entry.instance.mixer.update(0);
    }
    this.shown = shown;
  }

  drawn(): number {
    return this.shown;
  }

  /**
   * Commit phase: the bodies held now, for the prop field (`scene/props.ts`'s
   * `PropBody`) — so a dying Doombot falls with its eye and thrusters. Built at
   * commit, never in the frame loop; the field draws a body's props only while
   * the body itself is drawn.
   */
  bodies(): PropBody[] {
    const out: PropBody[] = [];
    for (let i = 0; i < MAX_DEPARTURES; i++) {
      const entry = this.slots[i] ?? null;
      // A standee carries no props (D260): the prop field has nothing to hang on it.
      if (entry !== null && entry.standee === null) out.push({ root: entry.instance.object, material: entry.material, pose: entry.pose });
    }
    return out;
  }

  /** Let every body go (unmount, or StrictMode's rehearsal of one). The group survives. */
  dispose(): void {
    for (let i = 0; i < MAX_DEPARTURES; i++) this.dropSlot(i);
    this.shown = 0;
  }

  /**
   * A cue's transient on a dying body before its death cue starts — the same
   * two-action blend `CueRunner.driveClips` gives a living figure, and the same
   * three-rung alias ladder (`actionFor`): the cue's alias, this card's alias,
   * the generic clip. `enabled` is toggled only when the selection changes.
   */
  private driveTransient(entry: Departure, request: ClipRequest | null): void {
    const wanted =
      request === null || request.weight <= 0.001 ? null : this.actionOf(entry, request.clip, request.alias);
    const next = wanted === entry.rest || wanted === entry.die ? null : wanted;
    if (entry.clip !== next) {
      if (entry.clip !== null) {
        entry.clip.stop();
        entry.clip.enabled = false;
      }
      entry.clip = next;
      if (next !== null) {
        next.enabled = true;
        next.setLoop(THREE.LoopOnce, 1);
        next.clampWhenFinished = true;
        next.play();
      }
    }
    const weight = next === null || request === null ? 0 : Math.max(0, Math.min(1, request.weight));
    if (next !== null && request !== null) {
      const duration = next.getClip().duration;
      next.time = duration > 0 ? Math.min(duration, request.t * duration) : 0;
      next.setEffectiveWeight(weight);
    }
    entry.clipWeight = weight;
    if (entry.rest !== null) entry.rest.setEffectiveWeight(1 - weight);
  }

  private actionOf(entry: Departure, clip: string, alias: string | null): THREE.AnimationAction | null {
    if (alias !== null) {
      const byCue = entry.actions.get(alias);
      if (byCue !== undefined) return byCue;
    }
    const byCard = entry.pose.clips[clip];
    if (byCard !== undefined) {
      const found = entry.actions.get(byCard);
      if (found !== undefined) return found;
    }
    return entry.actions.get(clip) ?? null;
  }

  private dropCard(cardId: number): void {
    for (let i = 0; i < MAX_DEPARTURES; i++) if (this.slots[i]?.cardId === cardId) this.dropSlot(i);
  }

  private dropSlot(i: number): void {
    const entry = this.slots[i] ?? null;
    if (entry === null) return;
    this.slots[i] = null;
    this.group.remove(entry.instance.object);
    entry.instance.mixer.stopAllAction();
    // Geometry and the source material are shared by every clone; the holographic
    // material is this body's own.
    entry.material.dispose();
  }
}
