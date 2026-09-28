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
import { HOLO_LOOK, lookValue, materialLookOf, wantsHull, type LookSpec } from '../look.ts';
import type { DeathSource, DepartureBinder, DiscField, OffsetSource } from './discs.ts';
import type { FigureRigMap } from './figureRigs.ts';
import { applyCostume, applyLook, inkHullMaterial, makeHoloMaterial, type HoloMaterial } from './figureMaterial.ts';
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

export interface FigureLayerProps {
  poses: FigureLayout;
  rigs: FigureRigMap;
  discs: DiscField;
  models: ModelData;
  /**
   * **The art-direction spike** (`arena/look.ts`, report 15): the hologram (the
   * default) or the comic look, and how its ink is drawn. Applied at COMMIT to
   * every figure's material, the departing bodies, the disc field (the contact
   * shadows) and the prop field — never from the frame loop.
   */
  look?: LookSpec;
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

export function FigureLayer({ poses, rigs, discs, models, look = HOLO_LOOK }: FigureLayerProps): JSX.Element {
  const library = useFigureLibrary(models);
  const lookNumber = lookValue(look);
  const hull = wantsHull(look);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  /**
   * **T8 — the departing figures** (Tier 2 follow-up 2; see {@link DepartureField}).
   * Built once, installed into the disc field for the layer's lifetime so the one
   * `useFrame` binds them, and fed at COMMIT time — never from the frame loop —
   * with the figures that left between the previous frame and this one.
   */
  const departures = useMemo(() => new DepartureField(), []);
  // Spike: the look reaches the pose fields at commit — the contact shadows
  // (`discs`), the dying bodies and (below, once it exists) the prop field.
  useLayoutEffect(() => {
    departures.look = lookNumber;
    discs.setLook(lookNumber);
  }, [departures, discs, lookNumber]);
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
    if (library === null || before === null || before === poses) return;
    for (const pose of departedFigures(before, poses)) {
      // Slice 3: a ring swarm's body is never drawn, so it has no body to die.
      if (pose.swarm > 0 && pose.formation === 'ring') continue;
      const model = pose.modelId === null ? undefined : library.get(pose.modelId);
      // Where it is drawn is decided here, at commit, from the frame it left and
      // the frame it left for: out of the rank that has just closed up.
      if (model !== undefined) departures.add(pose, model, departureStand(pose, poses));
    }
  }, [poses, library, departures]);

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
  useEffect(() => {
    // §8.3 rule 3: one compile of the prop program at mount, not on the frame the
    // first prop appears. `compile` skips invisible objects, so show them for it.
    props.setPrimeVisible(true);
    gl.compile(scene, camera);
    props.setPrimeVisible(false);
  }, [props, gl, scene, camera]);
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

  // The props of THIS snapshot, bound against the rigs its figures registered —
  // and against the bodies dying in it (added by the departures' layout effect
  // above, which runs first), so a falling figure keeps what it carried.
  const propLook = useMemo(() => materialLookOf(look), [look]);
  useLayoutEffect(() => {
    if (library !== null) props.setLibrary(library, models);
    props.setLook(propLook);
    props.commit(poses, rigs, models, departures.bodies());
  }, [props, poses, rigs, models, library, mounted, departures, propLook]);

  return (
    <>
      {/* One draw call for every stand disc on the table (§9.4) — and a second,
          after the cards, for the discs of a wrapped rank's back row, which stand
          ON their own card (T8 fix; empty on any frame that does not wrap). */}
      {/* Spike (report 15 §3.5): the contact shadows, one call for all, empty under the hologram. */}
      <primitive object={discs.shadowMesh} />
      <primitive object={discs.mesh} />
      <primitive object={discs.onCardMesh} />
      {/* T8: the bodies of the creatures that just died, drawn until their deaths end. */}
      <primitive object={departures.group} />
      {/* Slice 3: what every figure carries, and the vehicles overhead — one draw call per kind. */}
      <primitive object={props.group} />
      {mounted.map(({ pose, model }) => (
        <Figure
          key={`${String(pose.cardId)}:${model.id}`}
          pose={pose}
          model={model}
          rigs={rigs}
          look={lookNumber}
          hull={hull}
        />
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
  look = 0,
  hull = false,
}: {
  pose: FigurePose;
  model: LoadedModel;
  rigs: FigureRigMap;
  /** Spike: `uLook` for this figure's material (report 15 §3.1). */
  look?: number;
  /** Spike: draw the inverted-hull ink line (report 15 §3.4, option A). */
  hull?: boolean;
}): JSX.Element {
  const invalidate = useThree((s) => s.invalidate);

  const built = useMemo(() => {
    const instance = instantiateFigure(model);
    const material = makeHoloMaterial(pose.tint, model.unitScale);
    for (const mesh of instance.meshes) mesh.material = material;

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

    // **The first frame's pose, and nothing more.** From T3 the clip lane owns
    // every weight and every `action.time` (`CueRunner.driveClips`); this is here
    // so that a figure that mounts between two `useFrame` passes is standing in
    // its idle rather than in its bind pose for one frame. §8.3 rule 1 and user
    // decision 7 still hold — the idle only *advances* while the queue is awake,
    // so `frameloop='demand'` keeps its measured zero idle frames. It is the
    // REST lane's idle, the one the clip lane then adopts as `rest`.
    const idle = restActions.get('idle');
    if (idle !== undefined) {
      idle.enabled = true;
      idle.setEffectiveWeight(1);
      idle.play();
      idle.time = 0;
    }
    // A zero delta scrubs without advancing: `AnimationAction._updateTime`
    // returns `this.time` untouched for `deltaTime === 0` (three 0.186).
    instance.mixer.update(0);

    // **Spike — the inverted hull** (report 15 §3.4, option A): each skinned mesh
    // drawn again in ink, back faces only, pushed out along its normals, on the
    // SAME skeleton (so every clip carries it) and the same shared geometry. A
    // child of its mesh with an identity transform, so its bind is the mesh's.
    // Hidden unless the look asks for it; never a click target.
    const hulls: THREE.Object3D[] = [];
    for (const mesh of instance.meshes) {
      const skinned = mesh as THREE.SkinnedMesh;
      if (skinned.isSkinnedMesh !== true) continue;
      const shell = new THREE.SkinnedMesh(skinned.geometry, inkHullMaterial());
      shell.bind(skinned.skeleton, skinned.bindMatrix);
      shell.bindMode = skinned.bindMode;
      shell.frustumCulled = false;
      shell.visible = false;
      shell.raycast = () => {};
      shell.name = 'ink-hull';
      skinned.add(shell);
      hulls.push(shell);
    }

    return { instance, material, actions, restActions, hulls };
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
      restActions: built.restActions,
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


  // **Slice 3 — a ring swarm is its members, not its body** (Ant-Man's Air Force):
  // the rig still stands at the centre for the clip lane and the camera, but is
  // not drawn — the prop field draws the five bees round it.
  const ring = pose.swarm > 0 && pose.formation === 'ring';
  useLayoutEffect(() => {
    for (const mesh of built.instance.meshes) mesh.visible = !ring;
  }, [built, ring]);

  // Spike (report 15): the look, at commit — one uniform, and the hull's visibility.
  useLayoutEffect(() => {
    applyLook(built.material, look);
    for (const shell of built.hulls) shell.visible = hull && look > 0 && !ring;
    invalidate();
  }, [built, look, hull, ring, invalidate]);

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
  material: HoloMaterial;
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
  /** Spike (report 15): the look a body is built in — written at commit by `FigureLayer`. */
  look = 0;

  constructor() {
    this.group.name = 'departures';
  }

  /**
   * Commit phase: a figure that was on the table last frame and is not now,
   * drawn at `stand` (`departureStand`) if it turns out to be dying.
   */
  add(pose: FigurePose, model: LoadedModel, stand: readonly [number, number, number]): void {
    this.dropCard(pose.cardId);
    const instance = instantiateFigure(model);
    const material = makeHoloMaterial(pose.tint, model.unitScale);
    // The body falls in what it wore (slice 4) — its palette, as its last frame had it.
    applyCostume(material, pose.costume ?? null, false);
    applyLook(material, this.look);
    material.uniforms.uDrainTo.value.copy(DYING_GREY);
    for (const mesh of instance.meshes) mesh.material = material;
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
      } else {
        // Before its death cue: the body as it last stood, taking the blow.
        this.driveTransient(entry, request);
        if (entry.die !== null) entry.die.setEffectiveWeight(0);
        uniforms.uOpacity.value = entry.pose.opacity;
        uniforms.uTint.value.copy(entry.base);
        uniforms.uDrain.value = 0;
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
      if (entry !== null) out.push({ root: entry.instance.object, material: entry.material, pose: entry.pose });
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
