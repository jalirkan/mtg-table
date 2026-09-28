/*
 * mtg-table — arena/scene/DuelistLayer.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The duelists, mounted** (Tier 2 slice 4, T13; `figures/duelists.ts` is the
 * pure half): one full figure per seat standing at its side of the table, drawn
 * through the SAME figure library, the SAME loader (`scene/models.ts`) and the
 * SAME figure material (`scene/figureMaterial.ts`, costume palette included)
 * as every creature — never a second loader and never a second program.
 *
 * ---------------------------------------------------------------------------
 * Four decisions, each with the budget line it keeps:
 *
 *  1. **One mesh per duelist — its props are baked INTO its body.** A creature's
 *     props are instanced per kind by `scene/props.ts`'s field (one draw call per
 *     kind on the table); a duelist's are few and never change, so at build time
 *     each prop's geometry is rigidly skinned to the joint its kit anchor names and
 *     appended to the body's own geometry, wearing one of the body's costume slots.
 *     Two duelists therefore cost **two draw calls and no program** — the busts
 *     they replace cost one — and the director's badge still rides his chest
 *     through every clip.
 *  2. **It writes no transform outside the one frame loop.** {@link DuelistField}
 *     is built and committed here, at commit time; its `bind()` is called from
 *     `scene/busts.ts`'s `BustField.bind`, i.e. from `CueRunner`'s single
 *     `useFrame` — the same route the departing bodies take through the disc field.
 *     It allocates nothing there (`liveness.test.ts` scans its body).
 *  3. **The clip lane is scrubbed, never ticked** (D57): every gesture is a clip
 *     request on the duelist's reserved lane (`figures/duelists.ts`'s
 *     `duelistLane`), its `t` the cue's own, applied with `mixer.update(0)`. The
 *     breathing idle reads the CUE QUEUE's virtual clock, which only runs while the
 *     queue has film to play — so an idle table still renders nothing (D58), and
 *     pause, speed and skip hold for the duelists with no clock of their own.
 *  4. **Never a click target, and never a name.** Every mesh has its raycast
 *     cleared (`HitProxy` is the only thing the raycaster sees), and a duelist is
 *     a seat: it carries no card, no player name and no string at all.
 *
 * **A missing library is a supported state.** Until `figures.glb` has loaded — and
 * forever if it cannot — no duelist is built and `BustField` draws slice 1's
 * silhouette busts at the same stand points, exactly as a fresh checkout does.
 * ---------------------------------------------------------------------------
 */

import { useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import * as THREE from 'three';

import type { ClipRequest } from '../figures/clips.ts';
import {
  GESTURES,
  costumeOf,
  duelistLane,
  gestureOfAlias,
  stanceEntry,
  stanceGesture,
  type DuelistData,
  type DuelistLook,
  type DuelistPose,
  type Gesture,
  type GestureSpec,
} from '../figures/duelists.ts';
import { COSTUME_SLOTS, anchorsOf, familyOf, wearsCostume, type PropKind } from '../figures/props.ts';
import type { ModelData } from '../figures/types.ts';
import type { Seat } from '../layout.ts';
import type { BustField, DuelistBinder } from './busts.ts';
import { COSTUME_ATTRIBUTE, applyCostume, applyLook, makeFigureMaterial, type FigureMaterial } from './figureMaterial.ts';
import {
  instantiateFigure,
  loadFigureModels,
  peekFigureModels,
  type FigureInstance,
  type LoadedModel,
  type ModelLibrary,
} from './models.ts';
import { baseName, buildKindGeometry } from './props.ts';

/** The clip lane, as the duelist field reads it — `SceneStage.clipOf`. */
export interface DuelistLaneSource {
  clipOf(id: number): ClipRequest | null;
}

/** The cue queue, as the duelist field reads it: its virtual clock and one question. */
export interface DuelistClock {
  readonly now: number;
  gesturePending(gesture: string): boolean;
}

export interface DuelistLayerProps {
  poses: DuelistPose[];
  bustField: BustField;
  models: ModelData;
  data: DuelistData;
  stage: DuelistLaneSource;
  queue: DuelistClock;
  /**
   * **The look** (D120): `uLook` for both bodies, written at COMMIT. A duelist is
   * a seat, never an anonymous card, so it always takes the table's look.
   */
  look?: number;
}

/** The library path this manifest names, or the default (as `FigureLayer` reads it). */
function libraryPathOf(models: ModelData): string {
  for (const entry of Object.values(models.models)) return entry.path;
  return 'models/figures.glb';
}

/**
 * `models.json` → the parsed library, or `null` while it loads and forever if it
 * fails. The loader caches by path, so this is the promise `FigureLayer` already
 * started — one parse of `figures.glb` for the page.
 */
function useDuelistLibrary(models: ModelData): ModelLibrary | null {
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
        invalidate();
      })
      .catch(() => {
        // `FigureLayer` already says so once; the busts stand in.
      });
    return () => {
      live = false;
    };
  }, [models, invalidate]);
  return library;
}

export function DuelistLayer({ poses, bustField, models, data, stage, queue, look = 0 }: DuelistLayerProps): JSX.Element {
  const library = useDuelistLibrary(models);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  const field = useMemo(() => new DuelistField(), []);
  useEffect(() => {
    bustField.setDuelists(field);
    return () => {
      bustField.setDuelists(null);
    };
  }, [bustField, field]);

  useLayoutEffect(() => {
    field.setSources(stage, queue);
  }, [field, stage, queue]);

  // Build the bodies when the library or the data arrive — commit time, never the
  // frame loop — and let them go in THIS effect's cleanup, so a build and its
  // disposal are always one pair. (They were split across a layout and a passive
  // effect once, and a Fast Refresh — which re-runs every effect whatever its deps
  // — disposed the bodies after rebuilding them: the busts came back mid-game.)
  const [built, setBuilt] = useState(0);
  useLayoutEffect(() => {
    if (library === null) return;
    field.build(library, models, data);
    setBuilt((n) => n + 1);
    return () => {
      field.dispose();
    };
  }, [field, library, models, data]);
  useLayoutEffect(() => {
    field.commit(poses);
    invalidate();
  }, [field, poses, built, invalidate]);
  // The look, at commit — and a body built later takes the field's current one.
  useLayoutEffect(() => {
    field.setLook(look);
    invalidate();
  }, [field, look, invalidate]);

  // §8.3 rule 3: the duelists' program is the figures' own, and it is compiled at
  // mount — `compile` skips invisible objects, so the bodies are shown for it.
  useEffect(() => {
    if (built === 0) return;
    field.setPrimeVisible(true);
    gl.compile(scene, camera);
    field.setPrimeVisible(false);
    invalidate();
  }, [field, built, gl, scene, camera, invalidate]);

  return <primitive object={field.group} />;
}

// ---------------------------------------------------------------------------
// The field
// ---------------------------------------------------------------------------

/** The two seats, in the order the field's fixed slot array holds them. */
const SEATS: readonly Seat[] = ['you', 'opp'];

/** Scratch for the frame loop — module scope, never allocated per frame (§9.2 rule 6). */
const RED = new THREE.Color('#ff4a3a');
const GREY = new THREE.Color('#8b939e');
const GOLD = new THREE.Color('#ffd98a');

/** A gesture's aimed bone, resolved against one rig at build. */
interface ResolvedAim {
  bone: THREE.Object3D;
  child: THREE.Object3D;
  /** The direction, in figure space. */
  aim: THREE.Vector3;
}

/** Scratch for the aims — module scope, never allocated per frame (§9.2 rule 6). */
const POS_A = new THREE.Vector3();
const POS_B = new THREE.Vector3();
const SCALE_A = new THREE.Vector3();
const CUR = new THREE.Vector3();
const TGT = new THREE.Vector3();
const FIGURE_Q = new THREE.Quaternion();
const BONE_Q = new THREE.Quaternion();
const PARENT_Q = new THREE.Quaternion();
const DQ = new THREE.Quaternion();
const WQ = new THREE.Quaternion();
const NEW_Q = new THREE.Quaternion();

interface DuelistBody {
  seat: Seat;
  /** `${look id}:${model id}` — what it was built from, so a rebuild is skipped when nothing changed. */
  key: string;
  /** Carries the pose: stand point, facing, height. */
  root: THREE.Group;
  /** Carries the gesture's whole-body lean, pivoting at the feet. */
  lean: THREE.Group;
  instance: FigureInstance;
  /** The one mesh drawn: the body with its props baked in. */
  mesh: THREE.SkinnedMesh;
  geometry: THREE.BufferGeometry;
  material: FigureMaterial;
  mixer: THREE.AnimationMixer;
  /** The breathing idle, or `null` (the bind pose). */
  rest: THREE.AnimationAction | null;
  /** Each gesture's first clip the model has, or `null` (§3.6 rung 3: the root and the tint still move). */
  actions: Record<Gesture, THREE.AnimationAction | null>;
  specs: Record<Gesture, GestureSpec>;
  /** Each gesture's aimed bones on THIS rig (a joint the rig lacks is skipped). */
  aims: Record<Gesture, ResolvedAim[]>;
  /** This frame's aims: the stance's and the transient's, and their weights (set by `drive`). */
  aimStance: Gesture | null;
  aimStanceWeight: number;
  aimGesture: Gesture | null;
  aimGestureWeight: number;
  /** The actions enabled last frame, so `enabled` is toggled only on a change. */
  onStance: THREE.AnimationAction | null;
  onGesture: THREE.AnimationAction | null;
  /** The hologram's edge colour: the look's tint with the seat's colour mixed in. */
  base: THREE.Color;
  /** Whether the shader carries the costume's drain uniforms. */
  drains: boolean;
  /** This snapshot's pose, or `null` — the seat is not at the table. */
  pose: DuelistPose | null;
  drawn: boolean;
}

/**
 * **The two duelist bodies, and the frame loop's half of them.**
 *
 * A fixed array of two slots (one per seat), each built once per (look, model)
 * and outliving every frame; `commit` hands each the pose of the snapshot on
 * screen, and `bind` — from `BustField.bind`, from `CueRunner`'s one `useFrame` —
 * writes the pose, the gesture, the stance, the lean and the tint, and scrubs the
 * mixer with a zero delta. Nothing it does in `bind` allocates.
 */
export class DuelistField implements DuelistBinder {
  readonly group = new THREE.Group();
  private readonly slots: Array<DuelistBody | null> = [null, null];
  private stage: DuelistLaneSource | null = null;
  private clock: DuelistClock | null = null;
  private drawnCount = 0;
  /** The look both bodies are drawn in — written at commit, applied to a body when it is built. */
  private look = 0;

  constructor() {
    this.group.name = 'arena-duelists';
  }

  setSources(stage: DuelistLaneSource, clock: DuelistClock): void {
    this.stage = stage;
    this.clock = clock;
  }

  /** **The look on both bodies** (D120) — commit time, never the frame loop. */
  setLook(look: number): void {
    this.look = look;
    for (let i = 0; i < this.slots.length; i++) {
      const body = this.slots[i] ?? null;
      if (body !== null) applyLook(body.material, look);
    }
  }

  /**
   * **Commit time**: build each seat's body from its look and the first body the
   * library has. Returns whether anything was (re)built. A seat whose look names
   * no model the library holds gets no body — `BustField` draws its bust.
   */
  build(library: ModelLibrary, models: ModelData, data: DuelistData): boolean {
    let changed = false;
    for (let i = 0; i < SEATS.length; i++) {
      const seat = SEATS[i]!;
      const lookId = data.seats[seat] ?? null;
      const look = lookId === null ? null : (data.looks[lookId] ?? null);
      let model: LoadedModel | null = null;
      if (look !== null) {
        for (const id of look.body) {
          const candidate = library.get(id);
          if (candidate !== undefined) {
            model = candidate;
            break;
          }
        }
      }
      const key = look === null || model === null ? '' : `${lookId ?? ''}:${model.id}`;
      const current = this.slots[i] ?? null;
      if (current !== null && current.key === key) continue;
      if (current !== null) this.drop(i);
      if (look !== null && model !== null) {
        const body = buildBody(seat, key, look, model, models, data);
        applyLook(body.material, this.look);
        this.slots[i] = body;
        this.group.add(body.root);
      }
      changed = true;
    }
    return changed;
  }

  /** Commit time: the poses of the snapshot on screen, matched to the slots by seat. */
  commit(poses: readonly DuelistPose[]): void {
    for (let i = 0; i < SEATS.length; i++) {
      const body = this.slots[i] ?? null;
      if (body === null) continue;
      body.pose = null;
      for (const pose of poses) if (pose.seat === body.seat && pose.look !== null) body.pose = pose;
    }
  }

  /** Does this seat have a body drawn — so its bust must not be? */
  covers(seat: Seat): boolean {
    for (let i = 0; i < this.slots.length; i++) {
      const body = this.slots[i] ?? null;
      if (body !== null && body.seat === seat && body.pose !== null) return true;
    }
    return false;
  }

  /**
   * **The frame loop's half** — once per frame, from `BustField.bind`, i.e. from
   * `CueRunner`'s single `useFrame`. An indexed walk over two slots; every write is
   * a number into an object built at commit.
   */
  bind(): void {
    const stage = this.stage;
    const clock = this.clock;
    let drawn = 0;
    for (let i = 0; i < this.slots.length; i++) {
      const body = this.slots[i] ?? null;
      if (body === null) continue;
      const pose = body.pose;
      if (pose === null) {
        body.root.visible = false;
        body.drawn = false;
        continue;
      }
      body.root.visible = true;
      body.drawn = true;
      drawn += 1;
      body.root.position.set(pose.stand[0], pose.stand[1], pose.stand[2]);
      body.root.rotation.set(0, pose.facingY, 0);
      body.root.scale.setScalar(pose.height);

      const request = stage === null ? null : stage.clipOf(duelistLane(pose.player));
      const gesture = request === null ? null : gestureOfAlias(request.alias);
      const own = stanceGesture(pose.stance);
      const pending = clock !== null && own !== null && clock.gesturePending('outcome');
      const entry = stanceEntry(pose.stance, gesture, request === null ? 0 : request.t, pending);
      // A request is a TRANSIENT unless it is this stance's own entry.
      const transient = gesture !== null && gesture !== own ? gesture : null;
      const weight = transient === null || request === null ? 0 : Math.max(0, Math.min(1, request.weight));
      const t = request === null ? 0 : request.t;
      this.drive(body, own, entry, transient, weight, t, clock === null ? 0 : clock.now);
      body.mixer.update(0);
      // The aims read the pose the clips just wrote and turn a bone or two over it;
      // the next `mixer.update(0)` writes every bone afresh, so they never pile up.
      if (body.rest !== null) this.aimBones(body);
    }
    this.drawnCount = drawn;
  }

  /** The clip lane on one body: the breathing idle, the stance, and a transient over both. */
  private drive(
    body: DuelistBody,
    own: Gesture | null,
    entry: number,
    transient: Gesture | null,
    weight: number,
    t: number,
    now: number,
  ): void {
    // -- the stance (win / lose), entered by the outcome cue, held by the pose --
    const stanceAction = own === null ? null : body.actions[own];
    const stanceWeight = own === null ? 0 : Math.min(1, entry * 2.5);
    if (body.onStance !== stanceAction) {
      if (body.onStance !== null && body.onStance !== body.onGesture) body.onStance.enabled = false;
      body.onStance = stanceAction;
      if (stanceAction !== null) {
        stanceAction.enabled = true;
        stanceAction.play();
      }
    }
    if (stanceAction !== null && own !== null) {
      const duration = stanceAction.getClip().duration;
      stanceAction.time = duration * body.specs[own].hold * entry;
      stanceAction.setEffectiveWeight(stanceWeight * (1 - weight));
    }

    // -- the transient (cast / flinch, or an entry the pose does not hold) --
    const gestureAction = transient === null ? null : body.actions[transient];
    if (body.onGesture !== gestureAction) {
      if (body.onGesture !== null && body.onGesture !== body.onStance) body.onGesture.enabled = false;
      body.onGesture = gestureAction;
      if (gestureAction !== null) {
        gestureAction.enabled = true;
        gestureAction.play();
      }
    }
    if (gestureAction !== null) {
      const duration = gestureAction.getClip().duration;
      gestureAction.time = duration * t;
      gestureAction.setEffectiveWeight(weight);
    }

    // -- the breathing idle: the queue's virtual clock, which runs only while there is film (D58) --
    const rest = body.rest;
    if (rest !== null) {
      const duration = rest.getClip().duration;
      rest.time = duration > 0 ? (now / 1000) % duration : 0;
      rest.setEffectiveWeight((1 - (stanceAction === null ? 0 : stanceWeight)) * (1 - (gestureAction === null ? 0 : weight)));
    }

    // -- the aims (a raised fist, a bowed head), over whatever the clips write --
    body.aimStance = own;
    body.aimStanceWeight = own === null ? 0 : stanceWeight * (1 - weight);
    body.aimGesture = transient;
    body.aimGestureWeight = transient === null ? 0 : weight;

    // -- the lean: a recoil, a slump, a raised chin — pivoting at the feet --
    const stanceLean = own === null ? 0 : body.specs[own].lean * stanceWeight * (1 - weight);
    const gestureLean = transient === null ? 0 : body.specs[transient].lean * weight;
    body.lean.rotation.set(stanceLean + gestureLean, 0, 0);

    // -- the colour: the seat's edge, a red pulse on a blow, the loser drained --
    const uniforms = body.material.uniforms;
    const pose = body.pose;
    uniforms.uTint.value.copy(body.base);
    if (own === 'win') uniforms.uTint.value.lerp(GOLD, 0.45 * stanceWeight);
    uniforms.uOpacity.value = pose === null ? 1 : 0.72 + 0.28 * pose.vigour;
    if (body.drains) {
      const hit = transient === 'flinch' ? weight : 0;
      const loss = own === 'lose' ? 0.5 * stanceWeight : 0;
      if (hit > 0) {
        uniforms.uDrainTo.value.copy(RED);
        uniforms.uDrain.value = 0.62 * hit;
      } else {
        uniforms.uDrainTo.value.copy(GREY);
        uniforms.uDrain.value = loss;
      }
    } else if (transient === 'flinch') {
      uniforms.uTint.value.lerp(RED, 0.75 * weight);
    }
  }

  /**
   * **A gesture's aimed bones** (`duelists.json`'s `aim`): turn each joint so the
   * line to its child points along the aim, in figure space, by the gesture's
   * weight — `setFromUnitVectors` in the world, carried back into the joint's
   * parent frame. The library has no raised fist; this is the clip's arm, raised.
   */
  private aimBones(body: DuelistBody): void {
    const stance = body.aimStance;
    const gesture = body.aimGesture;
    const stanceOn = stance !== null && body.aimStanceWeight > 0.001;
    const gestureOn = gesture !== null && body.aimGestureWeight > 0.001;
    if (!stanceOn && !gestureOn) return;
    body.root.updateMatrixWorld(true);
    body.instance.object.matrixWorld.decompose(POS_A, FIGURE_Q, SCALE_A);
    if (stanceOn && stance !== null) this.aimList(body.aims[stance], body.aimStanceWeight);
    if (gestureOn && gesture !== null) this.aimList(body.aims[gesture], body.aimGestureWeight);
  }

  private aimList(list: readonly ResolvedAim[], weight: number): void {
    for (let i = 0; i < list.length; i++) {
      const entry = list[i]!;
      entry.bone.matrixWorld.decompose(POS_A, BONE_Q, SCALE_A);
      POS_B.setFromMatrixPosition(entry.child.matrixWorld);
      CUR.subVectors(POS_B, POS_A);
      if (CUR.lengthSq() < 1e-12) continue;
      CUR.normalize();
      TGT.copy(entry.aim).applyQuaternion(FIGURE_Q).normalize();
      DQ.setFromUnitVectors(CUR, TGT);
      WQ.identity().slerp(DQ, weight);
      NEW_Q.multiplyQuaternions(WQ, BONE_Q);
      const parent = entry.bone.parent;
      if (parent !== null) {
        parent.matrixWorld.decompose(POS_B, PARENT_Q, SCALE_A);
        entry.bone.quaternion.multiplyQuaternions(PARENT_Q.invert(), NEW_Q);
      } else {
        entry.bone.quaternion.copy(NEW_Q);
      }
      entry.bone.updateMatrixWorld(true);
    }
  }

  /** §8.3 rule 3 — show every body for one `gl.compile`, then park them again. */
  setPrimeVisible(on: boolean): void {
    for (let i = 0; i < this.slots.length; i++) {
      const body = this.slots[i] ?? null;
      if (body !== null) body.root.visible = on || body.drawn;
    }
  }

  /** T7's prime pass (`CueRunner`), for the composer's program variants too. */
  prime(): void {
    for (let i = 0; i < this.slots.length; i++) {
      const body = this.slots[i] ?? null;
      if (body !== null) body.root.visible = true;
    }
  }

  counts(): number {
    return this.drawnCount;
  }

  dispose(): void {
    for (let i = 0; i < this.slots.length; i++) this.drop(i);
    this.drawnCount = 0;
  }

  private drop(i: number): void {
    const body = this.slots[i] ?? null;
    if (body === null) return;
    this.slots[i] = null;
    this.group.remove(body.root);
    body.mixer.stopAllAction();
    // The merged geometry and the material are this body's own; the source
    // geometry is shared with every creature and is not touched.
    body.geometry.dispose();
    body.material.dispose();
  }
}

// ---------------------------------------------------------------------------
// Building a body — commit time only
// ---------------------------------------------------------------------------

/** A kit part lit at least this bright is the prop's TRIM (a coat's ×30 lapels); this dark, its SHADE. */
const TRIM_TONE = 4;
const SHADE_TONE = 0.3;

const M = new THREE.Matrix4();
const MI = new THREE.Matrix4();
const NM = new THREE.Matrix3();
const P = new THREE.Vector3();
const Q = new THREE.Quaternion();
const S = new THREE.Vector3();
const E = new THREE.Euler();
const V = new THREE.Vector3();

function buildBody(
  seat: Seat,
  key: string,
  look: DuelistLook,
  model: LoadedModel,
  models: ModelData,
  data: DuelistData,
): DuelistBody {
  const instance = instantiateFigure(model);
  const family = familyOf(model.id, models);
  // A costume needs a body whose vertices carry their slots (`costumeRegion`); a
  // body without them (an older library, the drone, the bee) is drawn in its tint.
  let regions = false;
  instance.object.traverse((child) => {
    const geometry = (child as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (geometry?.getAttribute(COSTUME_ATTRIBUTE) !== undefined) regions = true;
  });
  const costume = wearsCostume(family) && regions;

  const base = new THREE.Color(look.tint).lerp(new THREE.Color(seat === 'you' ? '#8fd3c4' : '#d68f9a'), look.seatMix);
  const material = makeFigureMaterial(`#${base.getHexString()}`, model.unitScale);
  if (costume) applyCostume(material, costumeOf(look), false);
  // Seen at twice a creature's size and from further off, a duelist wants a
  // firmer edge than a creature on its card.
  material.uniforms.uRim.value = 2.4;

  // The body: every skinned mesh of the clone. The first is the one the props are
  // baked into; it replaces itself in the clone, so the skeleton and the clips are
  // untouched.
  const skinned: THREE.SkinnedMesh[] = [];
  instance.object.traverse((child) => {
    if ((child as THREE.SkinnedMesh).isSkinnedMesh === true) skinned.push(child as THREE.SkinnedMesh);
  });
  instance.object.updateMatrixWorld(true);
  const target = skinned[0]!;
  const geometry = mergeProps(target, instance.object, look, family);
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = 'duelist';
  mesh.position.copy(target.position);
  mesh.quaternion.copy(target.quaternion);
  mesh.scale.copy(target.scale);
  mesh.frustumCulled = false;
  // §3.10 rule 2 — a duelist is never a click target. It stands beside the table,
  // where no card is, and the raycaster must still never see it.
  mesh.raycast = () => {};
  const parent = target.parent!;
  parent.add(mesh);
  mesh.bind(target.skeleton, target.bindMatrix);
  parent.remove(target);
  for (let i = 1; i < skinned.length; i++) skinned[i]!.material = material;

  const lean = new THREE.Group();
  lean.add(instance.object);
  const root = new THREE.Group();
  root.name = `duelist-${seat}`;
  root.add(lean);
  root.visible = false;

  const mixer = instance.mixer;
  const clip = (keys: readonly string[]): THREE.AnimationAction | null => {
    for (const k of keys) {
      const found = model.clips.get(k);
      if (found !== undefined) {
        const action = mixer.clipAction(found);
        action.enabled = false;
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        return action;
      }
    }
    return null;
  };
  const actions = {} as Record<Gesture, THREE.AnimationAction | null>;
  for (const gesture of GESTURES) actions[gesture] = clip(data.gestures[gesture].clips);
  // The aims, against THIS rig's joints by base name; a joint it lacks is skipped.
  const joints = new Map<string, THREE.Object3D>();
  instance.object.traverse((child) => {
    if ((child as THREE.Bone).isBone === true && !joints.has(baseName(child.name))) joints.set(baseName(child.name), child);
  });
  const aims = {} as Record<Gesture, ResolvedAim[]>;
  for (const gesture of GESTURES) {
    aims[gesture] = [];
    for (const spec of data.gestures[gesture].aim) {
      const bone = joints.get(spec.joint);
      const child = joints.get(spec.child);
      if (bone === undefined || child === undefined) continue;
      aims[gesture].push({ bone, child, aim: new THREE.Vector3(spec.aim[0], spec.aim[1], spec.aim[2]).normalize() });
    }
  }
  const idle = model.clips.get('idle');
  const rest = idle === undefined ? null : mixer.clipAction(idle);
  if (rest !== null) {
    rest.enabled = true;
    rest.setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY);
    rest.play();
    rest.time = 0;
    rest.setEffectiveWeight(1);
  }
  mixer.update(0);

  return {
    seat,
    key,
    root,
    lean,
    instance,
    mesh,
    geometry,
    material,
    mixer,
    rest,
    actions,
    specs: data.gestures,
    aims,
    aimStance: null,
    aimStanceWeight: 0,
    aimGesture: null,
    aimGestureWeight: 0,
    onStance: null,
    onGesture: null,
    base,
    drains: material.uniforms.uDrain !== undefined,
    pose: null,
    drawn: false,
  };
}

/**
 * **The body's geometry with the look's props baked in** — each prop's unit
 * geometry (`scene/props.ts`'s `buildKindGeometry`) placed where the kit's anchor
 * puts it on this body family (`figures/props.ts`'s `anchorsOf`), rigidly skinned
 * to that anchor's joint, and wearing the costume slot the look names for it.
 *
 * The placement is the prop field's own convention, solved for a skinned vertex:
 * a joint prop sits at `joint.matrixWorld · bind · anchor`, where `bind` is the
 * inverse of the joint's rest world matrix (`PropField`'s `b.local = bind ×
 * anchorMatrix`), and a vertex skinned wholly to that joint is drawn at
 * `joint.matrixWorld · boneInverse · bindMatrix · v` (three's attached bind mode,
 * whose `bindMatrixInverse` follows the mesh), so
 * `v = (boneInverse · bindMatrix)⁻¹ · bind · anchor · u`. It is
 * computed once, on the fresh clone, and then the prop follows every clip the
 * joint plays. Every attribute is written as `Float32`, so a quantised source
 * (meshopt) merges with a procedural prop.
 */
function mergeProps(
  target: THREE.SkinnedMesh,
  object: THREE.Object3D,
  look: DuelistLook,
  family: ReturnType<typeof familyOf>,
): THREE.BufferGeometry {
  const source = target.geometry;
  const bones = target.skeleton.bones;
  const inverses = target.skeleton.boneInverses;
  const byName = new Map<string, number>();
  for (let i = 0; i < bones.length; i++) {
    const name = baseName(bones[i]!.name);
    if (!byName.has(name)) byName.set(name, i);
  }
  const rootBone = bones.findIndex((bone) => !(bone.parent as THREE.Bone | null)?.isBone);

  const hasRegion = source.getAttribute(COSTUME_ATTRIBUTE) !== undefined;
  const positions: number[] = [];
  const normals: number[] = [];
  const skinIndex: number[] = [];
  const skinWeight: number[] = [];
  const regions: number[] = [];
  const index: number[] = [];

  const pos = source.getAttribute('position');
  const nor = source.getAttribute('normal');
  const si = source.getAttribute('skinIndex');
  const sw = source.getAttribute('skinWeight');
  const reg = source.getAttribute(COSTUME_ATTRIBUTE);
  for (let i = 0; i < pos.count; i++) {
    positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    if (nor !== undefined) normals.push(nor.getX(i), nor.getY(i), nor.getZ(i));
    else normals.push(0, 1, 0);
    skinIndex.push(si.getX(i), si.getY(i), si.getZ(i), si.getW(i));
    skinWeight.push(sw.getX(i), sw.getY(i), sw.getZ(i), sw.getW(i));
    if (hasRegion) regions.push(reg!.getX(i));
  }
  const sourceIndex = source.getIndex();
  if (sourceIndex !== null) for (let i = 0; i < sourceIndex.count; i++) index.push(sourceIndex.getX(i));
  else for (let i = 0; i < pos.count; i++) index.push(i);

  // The fresh clone is at rest with its root at the origin: the frame every kit
  // anchor is written in (figure space — one unit tall, feet at 0, facing +Z).
  object.updateMatrixWorld(true);
  const kinds = Object.keys(look.props) as PropKind[];
  const trim = COSTUME_SLOTS.indexOf(look.trim);
  const shade = COSTUME_SLOTS.indexOf(look.shade);
  for (const kind of kinds) {
    const prop = look.props[kind];
    const unit = buildKindGeometry(kind);
    if (unit === null || prop === undefined) continue;
    const region = COSTUME_SLOTS.indexOf(prop.slot);
    // The kit lights a prop's trim and darkens its shade as a vertex colour over
    // the kind's (`scene/props.ts`'s `part`); baked, each wears a slot instead.
    const tone = unit.getAttribute('color');
    for (const anchor of anchorsOf(kind, family)) {
      const joint = anchor.joint === 'root' || anchor.joint === 'stand' ? rootBone : (byName.get(anchor.joint) ?? -1);
      if (joint < 0) continue;
      const bone = bones[joint]!;
      // anchor · u, in figure space — the kit's anchor, stretched by the look.
      const turn = anchor.turn ?? [0, 0, 0];
      E.set(turn[0], turn[1], turn[2]);
      Q.setFromEuler(E);
      if (typeof anchor.size === 'number') S.setScalar(anchor.size);
      else S.set(anchor.size[0], anchor.size[1], anchor.size[2]);
      S.set(S.x * prop.scale[0], S.y * prop.scale[1], S.z * prop.scale[2]);
      const anchorM = new THREE.Matrix4().compose(P.set(anchor.at[0], anchor.at[1], anchor.at[2]), Q, S);
      // PropField's `bind` for this joint: the inverse of its world matrix on a
      // fresh clone at the origin (the joint's rest frame, inverted).
      const restInverse = bone.matrixWorld.clone().invert();
      // v = (boneInverse · bindMatrix)⁻¹ · bind · anchor · u
      MI.multiplyMatrices(inverses[joint]!, target.bindMatrix).invert();
      M.multiplyMatrices(MI, restInverse).multiply(anchorM);
      NM.getNormalMatrix(M);

      const upos = unit.getAttribute('position');
      const unor = unit.getAttribute('normal');
      const base = positions.length / 3;
      for (let i = 0; i < upos.count; i++) {
        V.set(upos.getX(i), upos.getY(i), upos.getZ(i)).applyMatrix4(M);
        positions.push(V.x, V.y, V.z);
        if (unor !== undefined) V.set(unor.getX(i), unor.getY(i), unor.getZ(i)).applyMatrix3(NM).normalize();
        else V.set(0, 1, 0);
        normals.push(V.x, V.y, V.z);
        skinIndex.push(joint, 0, 0, 0);
        skinWeight.push(1, 0, 0, 0);
        if (hasRegion) {
          const lum = tone === undefined ? 1 : (tone.getX(i) + tone.getY(i) + tone.getZ(i)) / 3;
          regions.push(lum >= TRIM_TONE ? trim : lum <= SHADE_TONE ? shade : region);
        }
      }
      const uindex = unit.getIndex();
      if (uindex !== null) for (let i = 0; i < uindex.count; i++) index.push(base + uindex.getX(i));
      else for (let i = 0; i < upos.count; i++) index.push(base + i);
    }
    unit.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  merged.setAttribute('skinIndex', new THREE.Float32BufferAttribute(skinIndex, 4));
  merged.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
  if (hasRegion) merged.setAttribute(COSTUME_ATTRIBUTE, new THREE.Float32BufferAttribute(regions, 1));
  merged.setIndex(index);
  merged.computeBoundingSphere();
  return merged;
}
