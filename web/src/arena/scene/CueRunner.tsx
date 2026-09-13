/*
 * mtg-table — arena/scene/CueRunner.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **THE `useFrame` of the arena.** There is one, it is here, and report 09 §11
 * (E3) asks for exactly that: "the offset model wired into `CardPlane` via a
 * ref map and one `useFrame`".
 *
 * Every frame it does four things, in this order:
 *
 *   1. `stage.beginFrame(layout)` — drop the previous frame's offsets, so this
 *      frame's are composed from scratch by whatever cues are still running;
 *   2. `queue.tick(now)` — advance the virtual clock and drive every live cue,
 *      which writes offsets and effects into the stage;
 *   3. write `layout(state) ⊕ offsets[card.id]` onto each card's mesh and
 *      material — the one place §5.1's equation becomes an `Object3D`;
 *   4. bind the live effects to the pooled primitives.
 *
 * Three performance rules from §9.2 are kept here and nowhere else:
 *
 *   - **no allocation** (rule 6): the scratch `Color`s are module scope, the
 *     anchor resolver handed to `pool.bind` is `SceneStage`'s own bound
 *     property rather than a closure built per frame, `EffectPool.bind` stamps
 *     a generation counter onto its slots instead of building a `Set` and a
 *     sorted key array, and `SceneStage.setOffset` composes into one pooled
 *     `Offset` per card id. All four were allocating every frame until the M7
 *     verification pass measured it: a few hundred short-lived objects a second
 *     at 60 fps, in the one function the whole frame budget lives in;
 *   - **no React state updates from the frame loop** (rule 7): offsets live in
 *     a plain `Map` and meshes are mutated directly, so React re-renders only
 *     when `ClientState` changes — about once a second;
 *   - **`frameloop` is `demand` while the queue is idle** (§5.4). A card game is
 *     static most of the time and the correct number of rendered frames while
 *     the AI thinks is zero.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { CameraDirector, type DirectorWorld } from '../camera.ts';
import type { CueQueue } from '../cues/queue.ts';
import { anchorsFor, type Layout } from '../layout.ts';
import type { EffectPool } from './effects.ts';
import type { RigMap } from './rigs.ts';
import type { SceneStage } from './SceneStage.ts';

/**
 * The slice of `OrbitControls` this file touches. Typed by hand rather than
 * imported so nothing here depends on drei's own declaration shape.
 */
interface OrbitLike {
  enabled: boolean;
  target: THREE.Vector3;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
  update(): boolean | void;
}

/** §9.2 rule 6 — allocated once for the life of the page, not once per card per frame. */
const SCRATCH = new THREE.Color();
const SCRATCH_2 = new THREE.Color();

export interface CueRunnerProps {
  queue: CueQueue;
  stage: SceneStage;
  pool: EffectPool;
  rigs: RigMap;
  placed: Layout;
  /** §8's camera lane. One per arena, created by `Arena.tsx` and kept in a ref. */
  director: CameraDirector;
  /** §5.3's predicate for the frame that is on screen — rule 5 reads it live. */
  awaitingHuman: boolean;
  mode: 'replay' | 'live';
  reducedMotion: boolean;
  /** `?glinfo=1` — expose `gl.info` from a PRODUCTION build, for the benchmark. */
  glInfo?: boolean;
}

export function CueRunner({
  queue,
  stage,
  pool,
  rigs,
  placed,
  director,
  awaitingHuman,
  mode,
  reducedMotion,
  glInfo = false,
}: CueRunnerProps): null {
  const invalidate = useThree((s) => s.invalidate);
  const setFrameloop = useThree((s) => s.setFrameloop);
  const camera = useThree((s) => s.camera);
  const placedRef = useRef(placed);
  placedRef.current = placed;

  /**
   * §5.4 — `demand` when nothing is happening, `always` when something is.
   *
   * The subscription is the queue's own change signal, which fires on enqueue,
   * on skip, on flush and on the transition to idle — never per tick, so this
   * costs nothing while a cue is playing.
   */
  useEffect(() => {
    const sync = (): void => {
      // A `presence` bob is the one thing on the table that moves with no cue
      // behind it (§5.1's exception), so it is also the one thing that can keep
      // the loop awake while the queue is empty. Nothing in the corpus bobs
      // until a Helicarrier or a Doombot is on the battlefield.
      setFrameloop(queue.idle && !placedRef.current.bobbing ? 'demand' : 'always');
      // One more frame after going idle, so the last write — the one that puts
      // every card back at `layout(state)` — actually reaches the screen.
      invalidate();
    };
    sync();
    return queue.onChange(sync);
  }, [queue, setFrameloop, invalidate, placed]);

  /** A new snapshot is the one change React causes that the frame loop does not. */
  useEffect(() => {
    invalidate();
  }, [placed, invalidate]);

  /**
   * The dev handle's renderer half (see `Arena.tsx`). `gl.info.render` is where
   * §9.1's draw-call budget is actually read from — a **real** number, unlike a
   * frame rate in an environment that only paints when something asks it to.
   * `import.meta.env.DEV` is a compile-time constant, so the dev half is not in
   * the production bundle at all.
   *
   * **`?glinfo=1` is the production half, and it exists because the benchmark
   * needs it** (verification fix). `tools/arena-bench.mjs` measures a *production*
   * build — that is the point of it — and the handle being DEV-only meant its
   * draw-call and triangle line came out blank, so the numbers in
   * `docs/evidence/m7-arena.md` were quietly taken from a dev build while the
   * frame times beside them came from the built one. The flag exposes **one
   * function returning six numbers** and nothing else: no `scene`, no `camera`,
   * no queue — `gl.info` counts primitives, and a counter is not a card.
   */
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    if (!import.meta.env.DEV && !glInfo) return;
    const info = (): { render: Record<string, number>; memory: Record<string, number> } => ({
      render: { ...gl.info.render },
      memory: { ...gl.info.memory },
    });
    // **Child effects run before the parent's**, so `Arena.tsx` has not created
    // the handle yet on the first mount — assigning into it only when it already
    // existed meant `gl` was attached on a hot update and never on a fresh load.
    const handle = window as unknown as { __mtgArena?: Record<string, unknown> };
    const base = handle.__mtgArena ?? {};
    handle.__mtgArena = import.meta.env.DEV
      ? { ...base, gl, scene, camera, info }
      : { ...base, info };
  }, [gl, scene, camera, glInfo]);

  /**
   * §3.5 / §8 — **never fight the user for the camera.**
   *
   * `OrbitControls` fires `start` the instant a drag begins. That makes the
   * user's own pose the new *home* (so nothing springs back at them five
   * seconds later) and opens the 5 s window in which every cue camera request
   * is dropped. It is subscribed once, here, because this is the only file that
   * holds both the controls and the director.
   */
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;
  useEffect(() => {
    if (controls === null) return;
    const onStart = (): void => {
      director.noteUserInput(nowMs(), {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
      });
    };
    controls.addEventListener('start', onStart);
    controls.addEventListener('change', onStart);
    return () => {
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('change', onStart);
    };
  }, [controls, camera, director]);

  const worldRef = useRef<{ awaitingHuman: boolean; mode: 'replay' | 'live'; reducedMotion: boolean }>({
    awaitingHuman,
    mode,
    reducedMotion,
  });
  worldRef.current = { awaitingHuman, mode, reducedMotion };
  const heldRef = useRef(false);

  useFrame(() => {
    const now = nowMs();
    stage.beginFrame(placedRef.current);
    queue.tick(now);
    applyOffsets(rigs, stage, now);
    // `stage.positionOf` is a bound arrow property, passed rather than wrapped:
    // an arrow here would be a new closure on every frame (§9.2 rule 6).
    pool.bind(stage.effects, stage.positionOf, camera);
    driveCamera(now, director, stage, camera, controls, worldRef.current, heldRef);
  });

  return null;
}

function nowMs(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

/** §9.2 rule 6 again: the camera's scratch vectors are module scope, not per frame. */
const CAM_POS = new THREE.Vector3();
const CAM_TARGET = new THREE.Vector3();

/**
 * **§8, applied to the one real camera**, after `OrbitControls` has updated (its
 * own `useFrame` runs at priority −1, ours at the default 0).
 *
 * The director owns the camera only while a move is live; the rest of the time
 * this function does nothing at all and the user's controls are untouched. That
 * asymmetry is the point: a camera that is "managed" every frame is a camera
 * that fights the mouse.
 */
function driveCamera(
  now: number,
  director: CameraDirector,
  stage: SceneStage,
  camera: THREE.Camera,
  controls: OrbitLike | null,
  world: { awaitingHuman: boolean; mode: 'replay' | 'live'; reducedMotion: boolean },
  heldRef: { current: boolean },
): void {
  if (stage.cameraTouched) {
    // The viewer always sits at `you` by construction (`seatOf` maps the
    // viewer's id to that seat), so rule 6's anchors are that seat's.
    const own = anchorsFor('you');
    const directorWorld: DirectorWorld = {
      resolve: (ref) => stage.positionOf(ref),
      // Rule 6's two anchors. They are the *seat's* own, not a card's, so the
      // clamp holds on a frame with nothing in hand at all.
      hand: [own.hand.x, own.hand.y, own.hand.z],
      battlefield: [own.creatures.x, own.creatures.y, own.creatures.z],
      aspect:
        camera instanceof THREE.PerspectiveCamera && camera.aspect > 0 ? camera.aspect : 16 / 9,
      awaitingHuman: world.awaitingHuman,
      mode: world.mode,
      reducedMotion: world.reducedMotion,
    };
    director.request(stage.camera, now, directorWorld);
  }

  const frame = director.tick(now, world);
  if (frame.pose === null) {
    if (heldRef.current && controls !== null) {
      controls.enabled = true;
      heldRef.current = false;
    }
    return;
  }
  if (controls !== null && frame.holding && !heldRef.current) {
    controls.enabled = false;
    heldRef.current = true;
  }
  CAM_POS.set(
    frame.pose.position[0] + frame.shake[0],
    frame.pose.position[1] + frame.shake[1],
    frame.pose.position[2] + frame.shake[2],
  );
  CAM_TARGET.set(frame.pose.target[0], frame.pose.target[1], frame.pose.target[2]);
  camera.position.copy(CAM_POS);
  camera.lookAt(CAM_TARGET);
  if (controls !== null) controls.target.copy(CAM_TARGET);
  if (!frame.holding && controls !== null) {
    // The last frame of a move is home; hand the camera straight back.
    controls.enabled = true;
    heldRef.current = false;
  }
}

/**
 * §5.1, as code: `finalTransform(card) = layout(state)[card.id] ⊕ offsets[card.id]`.
 *
 * Every rig is written every frame, including the ones with no offset — that is
 * what returns a card to its resting pose the instant its cue ends, with no
 * "was it animating?" bookkeeping anywhere. Forty objects of float math is well
 * inside §9.1's 2 ms CPU budget, and the loop does not run at all while the
 * queue is idle.
 */
function applyOffsets(rigs: RigMap, stage: SceneStage, now: number): void {
  const seconds = now / 1000;
  for (const rig of rigs.values()) {
    const placement = rig.placement;
    const offset = stage.offsetOf(placement.cardId);
    const mesh = rig.mesh;

    // §5.1's exception, and the only motion in the scene with no cue behind it:
    // a `presence` bob. It is added here rather than inside `layout()` because
    // `layout()` is a pure function of STATE and this is a function of TIME —
    // and it is added to the *rig* and not to an offset, so `skip all` and
    // `flushAndSnap()` leave the Helicarrier hovering exactly as they found it.
    const bob =
      placement.bobAmp > 0
        ? placement.bobAmp * Math.sin(seconds * 2 * Math.PI * placement.bobHz)
        : 0;

    mesh.position.set(
      placement.position[0] + offset.dx,
      placement.position[1] + offset.dy + bob,
      placement.position[2] + offset.dz,
    );
    mesh.rotation.set(
      placement.rotation[0] + offset.dRotX,
      placement.rotation[1],
      placement.rotation[2] + offset.dRotZ,
    );
    const scale = placement.scale * offset.scale;
    mesh.scale.set(rig.width * scale * offset.squashX, scale * offset.squashY, 1);

    const material = rig.material;
    SCRATCH.set(rig.baseColour);
    if (offset.tint !== null) SCRATCH.multiply(SCRATCH_2.set(offset.tint));
    if (offset.glow > 0 && offset.glowColour !== null) {
      // Lighting up in its own colour, not washing out to white: the glow
      // colour is the card's colour identity (§7.3) unless a cue file says
      // otherwise, which is what makes a white creature and a blue one read
      // differently entering the battlefield.
      SCRATCH.lerp(SCRATCH_2.set(offset.glowColour), Math.min(0.6, offset.glow * 0.45));
      SCRATCH.multiplyScalar(1 + Math.min(0.5, offset.glow * 0.35));
    }
    material.color.copy(SCRATCH);
    material.opacity = offset.opacity;
    rig.uniforms.uDissolve.value = offset.dissolve;
  }
}
