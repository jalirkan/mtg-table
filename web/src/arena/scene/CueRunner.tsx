/*
 * mtg-table — arena/scene/CueRunner.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **THE `useFrame` of the arena.** There is one, it is here, and report 09 §11
 * (E3) asks for exactly that: "the offset model wired into `CardPlane` via a
 * ref map and one `useFrame`".
 *
 * Every frame it does five things, in this order:
 *
 *   1. `stage.beginFrame(layout)` — drop the previous frame's offsets, so this
 *      frame's are composed from scratch by whatever cues are still running;
 *   2. `queue.tick(now)` — advance the virtual clock and drive every live cue,
 *      which writes offsets and effects into the stage;
 *   3. write `layout(state) ⊕ offsets[card.id]` onto each card's mesh and
 *      material — the one place §5.1's equation becomes an `Object3D`;
 *   4. **write `figurePose ⊕ offsets[card.id]` onto each figure** and its stand
 *      disc — report 13 §1.1's generalisation of the same equation, and the
 *      reason Tier 2 needs no second frame loop;
 *   5. bind the pose layers that are not cues at all — the terrain, T5's
 *      attachment overlays, and T6's spell forms, tethers and mana;
 *   6. bind the live effects to the pooled primitives.
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

import {
  CameraDirector,
  USER_TAIL_MS,
  type CameraChoice,
  type DirectorWorld,
} from '../camera.ts';
import type { CueQueue } from '../cues/queue.ts';
import {
  BREATHING_STANCES,
  REST_CLIP_FOR,
  REST_PHASE_FOR,
  type ClipRequest,
} from '../figures/clips.ts';
import type { FigureLayout } from '../figures/pose.ts';
import type { ManaMote, SpellForm } from '../figures/casting.ts';
import type { DuelistBust } from '../figures/duelists.ts';
import type { TileLayout } from '../figures/tiles.ts';
import { anchorsFor, type Layout } from '../layout.ts';
import type { CastingField } from './casting.ts';
import type { DiscField } from './discs.ts';
import type { BustField } from './busts.ts';
import type { EffectPool } from './effects.ts';
import { actionFor, type FigureRig, type FigureRigMap } from './figureRigs.ts';
import type { OverlayField } from './overlays.ts';
import type { RigMap } from './rigs.ts';
import type { SceneStage } from './SceneStage.ts';
import type { TileField } from './tiles.ts';

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
/**
 * **T6's combat freeze** (report 13 §6.4): while a stack exists during combat the
 * figures hold their pose and the table washes out a little. The wash is a lerp
 * toward this, applied to the figure's own tint uniform — no second material, no
 * post pass, and nothing the HUD or the decision layer can see.
 */
const FREEZE_WASH = new THREE.Color('#8d949e');
const FREEZE_MIX = 0.45;

/**
 * **The two loop modes the arena uses, and why `<Canvas>` does not get a literal.**
 *
 * fiber 8.18's `configure` runs on every render of `<Canvas>` and does
 * `if (state.frameloop !== frameloop) state.setFrameloop(frameloop)` against the
 * PROP. With `frameloop="demand"` written as a literal, any re-render of `Arena`
 * that did not also re-run the sync below — a hint, a same-view key press, a
 * greyed switcher click — put the loop back to `demand` in the middle of a
 * batch, and the cues froze where they stood (measured on `human-auto-42`@717:
 * pressing `1` on the table view 120 ms into the batch left the frame counter at
 * 10 for 3 s with five cues still queued; in `g1` it cost the attack swoop). So
 * the prop is whatever this file decided last, read from a ref `Arena.tsx` owns:
 * a re-render re-states the current mode and `configure` changes nothing.
 */
export type Frameloop = 'always' | 'demand';

export interface CueRunnerProps {
  queue: CueQueue;
  stage: SceneStage;
  pool: EffectPool;
  rigs: RigMap;
  /** Tier 2 — the manifestation stage of the frame on screen (report 13 §3.8). */
  figures: FigureLayout;
  /** Tier 2 — cardId → the figure's group, mixer and material. */
  figureRigs: FigureRigMap;
  /** Tier 2 — the one instanced mesh that draws every stand disc. */
  discs: DiscField;
  /** Tier 2 (T4) — the land tiles of the frame on screen, and the field drawing them. */
  tiles: TileLayout;
  tileField: TileField;
  /** Tier 2 (T4) — the floating mana and the spell forms at each casting anchor. */
  motes: ManaMote[];
  forms: SpellForm[];
  castingField: CastingField;
  /**
   * Tier 2 (**T5**) — the attachment overlays of the frame on screen.
   *
   * It is handed the figure layout rather than the stage, because an overlay is a
   * **pose** (report 13 §4.1's 28 events against 985 frames) and has its own
   * budget: `MAX_POSE_OVERLAYS`, never one of the cue engine's eight slots.
   */
  overlays: OverlayField;
  /**
   * Tier 2 (**T7**, user decision 8) — the two silhouette busts at the HUD
   * anchors. One instanced mesh, no rig, and **never in the camera solver's
   * required set** (report 13 §7): they are decoration and may leave frame.
   */
  busts: DuelistBust[];
  bustField: BustField;
  placed: Layout;
  /** §8's camera lane. One per arena, created by `Arena.tsx` and kept in a ref. */
  director: CameraDirector;
  /** §5.3's predicate for the frame that is on screen — rule 5 reads it live. */
  awaitingHuman: boolean;
  mode: 'replay' | 'live';
  reducedMotion: boolean;
  /**
   * **T8 — the view the camera is on**: one of `camera.ts`'s five, or the auto
   * director — already filtered by `Arena.tsx` for what this seat may use.
   */
  cameraView?: CameraChoice;
  /** **T8 — spectator mode**: the wider box, the slower dwell table, no hand band. */
  spectator?: boolean;
  /**
   * **T8** — bumped on every press of a view key or button, so pressing the
   * view you are on is a command (drop your orbit of it) and a re-render is not.
   */
  viewPress?: number;
  /** `?glinfo=1` — expose `gl.info` from a PRODUCTION build, for the benchmark. */
  glInfo?: boolean;
  /**
   * **The loop mode `<Canvas>` is rendered with** (slice-2 verification fix).
   * `Arena.tsx` owns it and passes `frameloop={loopRef.current}`; this file is its
   * one writer. See {@link Frameloop}.
   */
  loopRef: { current: Frameloop };
  /**
   * **T7's program warm-up**: while this is above 0 the frame loop draws every
   * parked primitive once and counts it down. `Arena.tsx` starts it at mount and
   * `Post.tsx` resets it when the composer mounts (a second set of program
   * variants). See `EffectPool.prime`.
   */
  primeRef: { current: number };
}

export function CueRunner({
  queue,
  stage,
  pool,
  rigs,
  figures,
  figureRigs,
  discs,
  tiles,
  tileField,
  motes,
  forms,
  castingField,
  overlays,
  busts,
  bustField,
  placed,
  director,
  awaitingHuman,
  mode,
  reducedMotion,
  cameraView = 'table',
  spectator = false,
  viewPress = 0,
  glInfo = false,
  primeRef,
  loopRef,
}: CueRunnerProps): null {
  const invalidate = useThree((s) => s.invalidate);
  const setFrameloop = useThree((s) => s.setFrameloop);
  const camera = useThree((s) => s.camera);
  const placedRef = useRef(placed);
  placedRef.current = placed;
  const figuresRef = useRef(figures);
  figuresRef.current = figures;
  const tilesRef = useRef(tiles);
  tilesRef.current = tiles;
  const motesRef = useRef(motes);
  motesRef.current = motes;
  const formsRef = useRef(forms);
  formsRef.current = forms;
  const bustsRef = useRef(busts);
  bustsRef.current = busts;
  /** The previous frame's `now`, for the one term that is a function of TIME. */
  const lastRef = useRef<number | null>(null);

  /**
   * §5.4 — `demand` when nothing is happening, `always` when something is.
   *
   * The subscription is the queue's own change signal, which fires on enqueue,
   * on skip, on flush and on the transition to idle — never per tick, so this
   * costs nothing while a cue is playing.
   *
   * **It writes `loopRef` as well as the store** (slice-2 verification fix):
   * `<Canvas>` is rendered with `frameloop={loopRef.current}`, so the next time
   * anything re-renders `Arena`, fiber's `configure` re-states this decision
   * instead of reverting it to a literal `demand` mid-batch ({@link Frameloop}).
   */
  useEffect(() => {
    const sync = (): void => {
      // A `presence` bob is the one thing on the table that moves with no cue
      // behind it (§5.1's exception), so it is also the one thing that can keep
      // the loop awake while the queue is empty. Nothing in the corpus bobs
      // until a Helicarrier or a Doombot is on the battlefield.
      const mode: Frameloop = queue.idle && !placedRef.current.bobbing ? 'demand' : 'always';
      loopRef.current = mode;
      setFrameloop(mode);
      // One more frame after going idle, so the last write — the one that puts
      // every card back at `layout(state)` — actually reaches the screen.
      invalidate();
    };
    sync();
    return queue.onChange(sync);
  }, [queue, setFrameloop, invalidate, placed, loopRef]);

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
  /** Read by the `?glinfo=1` handle, so the bench can see the freeze (T7). */
  const frozenRef = useRef(false);
  frozenRef.current = false;
  for (const pose of figures.values()) {
    // Any held figure: a ghosted creature spell is never frozen (§6.4), so the
    // first pose alone could be the one figure that is not.
    if (pose.frozen) {
      frozenRef.current = true;
      break;
    }
  }
  useEffect(() => {
    if (!import.meta.env.DEV && !glInfo) return;
    /**
     * **T7 adds `layers` to the production handle, and it is numbers only.**
     *
     * `tools/arena-bench.mjs` measures a production build and has to be able to
     * find a frame with figures on it — report 13 §8.5 says in as many words that
     * "the frame must have figures on it" — and the dev handle it would otherwise
     * read is `import.meta.env.DEV`-only. So the flag now also exposes how many
     * instances each pose layer drew last frame: a count of figures, discs, tiles,
     * motes, forms, tethers, overlays and busts, plus the freeze boolean.
     *
     * Every one of them is an integer written by the frame loop. **A counter is not
     * a card** (the same argument the `gl.info` half already makes): there is no
     * id, no name and no way back to one, so this cannot become a leak the way a
     * `queue` handle could — which is why the cue census stays behind DEV.
     */
    const info = (): {
      render: Record<string, number>;
      memory: Record<string, number>;
      layers: Record<string, number>;
    } => ({
      render: { ...gl.info.render },
      // `programs` is how many shader programs three has compiled so far: T7's
      // bench uses it to tell a first-use program compile from a texture upload
      // when one frame spikes.
      memory: { ...gl.info.memory, programs: gl.info.programs?.length ?? 0 },
      layers: {
        figures: figureRigs.size,
        ...discs.counts(),
        ...tileField.counts(),
        ...castingField.counts(),
        ...overlays.counts(),
        ...bustField.counts(),
        frozen: frozenRef.current ? 1 : 0,
      },
    });
    // **Child effects run before the parent's**, so `Arena.tsx` has not created
    // the handle yet on the first mount — assigning into it only when it already
    // existed meant `gl` was attached on a hot update and never on a fresh load.
    const handle = window as unknown as { __mtgArena?: Record<string, unknown> };
    const base = handle.__mtgArena ?? {};
    handle.__mtgArena = import.meta.env.DEV
      ? { ...base, gl, scene, camera, info }
      : { ...base, info };
  }, [gl, scene, camera, glInfo, figureRigs, discs, tileField, castingField, overlays, bustField]);

  /** True while the director owns the camera and the controls are disabled. */
  const heldRef = useRef(false);
  /**
   * **T8 — which `change` events are the user's.** `active` from `start` to
   * `end`, then {@link USER_TAIL_MS} of damping tail. Cleared the moment the
   * director takes the camera.
   */
  const userRef = useRef({ active: false, until: 0 });

  /**
   * §3.5 / §8 — **never fight the user for the camera.**
   *
   * `OrbitControls` fires `start` the instant a drag begins. That makes the
   * user's own pose the new *home* (so nothing springs back at them five
   * seconds later), remembers it as this view's free orbit (T8), and opens the
   * 5 s window in which every cue camera request is dropped. It is subscribed
   * once, here, because this is the only file that holds both the controls and
   * the director.
   *
   * **`change` counts only while the user is dragging, or in the damping tail
   * after they let go** (T8 fix). It used to count always, and `OrbitControls`
   * fires one `change` on its first update after the director hands the camera
   * back (its `lastPosition` is from before the move) — so every finished cue
   * move and every view change registered as a drag: home re-set to itself,
   * and cue camera moves dropped for the next five seconds. Harmless-looking
   * for a swoop; fatal for the auto director, which would have held every shot
   * for five seconds after every cut.
   */
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;
  useEffect(() => {
    if (controls === null) return;
    const note = (): void => {
      director.noteUserInput(nowMs(), {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
      });
    };
    const onStart = (): void => {
      userRef.current.active = true;
      note();
    };
    const onChange = (): void => {
      const user = userRef.current;
      if (heldRef.current) return;
      if (user.active || nowMs() < user.until) note();
    };
    const onEnd = (): void => {
      userRef.current.active = false;
      userRef.current.until = nowMs() + USER_TAIL_MS;
    };
    controls.addEventListener('start', onStart);
    controls.addEventListener('change', onChange);
    controls.addEventListener('end', onEnd);
    return () => {
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('change', onChange);
      controls.removeEventListener('end', onEnd);
    };
  }, [controls, camera, director]);

  /**
   * **T8 — the chosen view becomes home.** Runs when the view, the box
   * (spectator) or a press changes; `applyView` decides whether that is a move,
   * a reset of the user's orbit, or nothing.
   *
   * It waits for the controls: the first application is a CUT to the stored
   * view, and `OrbitControls` has to exist to take the target with it — a
   * camera placed at the shoulder while the controls still aim at the rest
   * target would be re-aimed by their first update.
   *
   * When it moves, it takes the controls **here**, before the next frame:
   * `OrbitControls`' own `useFrame` runs ahead of ours, and with the new box
   * already on its props it would clamp the camera into it for one frame
   * before the move started — a visible jump when spectator mode switches off.
   */
  const pressRef = useRef(viewPress);
  useEffect(() => {
    if (controls === null) return;
    const pressed = pressRef.current !== viewPress;
    pressRef.current = viewPress;
    const outcome = director.applyView({
      view: cameraView,
      spectator,
      pressed,
      reducedMotion,
      now: nowMs(),
      current: {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
      },
    });
    if (outcome === 'none') return;
    userRef.current.active = false;
    userRef.current.until = 0;
    controls.enabled = false;
    heldRef.current = true;
    invalidate();
  }, [cameraView, spectator, viewPress, reducedMotion, director, camera, controls, invalidate]);

  /**
   * **Rule 5 is about a SEAT** (T8 fix). In a replay nobody is waiting to click:
   * the recording's `input` is history, and the queue already ignores it
   * (`budgetFor` gives a replay its 2.5 s whatever the recorded buttons say).
   * The camera read it raw, so every camera cue in a replay of a human game was
   * dropped on any frame whose recorded OK happened to be enabled.
   */
  const worldRef = useRef<{ awaitingHuman: boolean; mode: 'replay' | 'live'; reducedMotion: boolean }>({
    awaitingHuman: mode === 'live' && awaitingHuman,
    mode,
    reducedMotion,
  });
  worldRef.current = { awaitingHuman: mode === 'live' && awaitingHuman, mode, reducedMotion };

  useFrame(() => {
    const now = nowMs();
    const last = lastRef.current;
    lastRef.current = now;
    // Clamped, because a tab that was hidden for a minute comes back with a
    // one-minute delta and a figure would take one breath a minute later.
    const dt = last === null ? 0 : Math.min(0.05, Math.max(0, (now - last) / 1000));
    stage.beginFrame(placedRef.current);
    queue.tick(now);
    // **The queue is asked AFTER the tick**, so "awake" means "something is
    // animating on this very frame" rather than "was animating last frame".
    const awake = !queue.idle;
    applyOffsets(rigs, stage, now);
    applyFigures(figureRigs, stage, now, dt, awake);
    // The queue is the departing bodies' death source (T8 fix): a creature that
    // has just died is drawn until its own death cue has ended, not only while
    // its `die` request is on the stage.
    discs.bind(figuresRef.current, stage, now / 1000, queue);
    tileField.bind(tilesRef.current, stage, awake ? dt : 0);
    // **T5/T6's pose layers.** `stage.positionOf` is a bound arrow property, so
    // the tether resolver is a stable reference rather than a closure built on
    // every frame (§9.2 rule 6) — the same argument as `pool.bind` below.
    castingField.bind(
      motesRef.current,
      formsRef.current,
      stage.positionOf,
      figuresRef.current,
      awake ? dt : 0,
    );
    overlays.bind(figuresRef.current, stage, camera, awake ? dt : 0);
    bustField.bind(bustsRef.current, camera, stage.effects);
    // `stage.positionOf` is a bound arrow property, passed rather than wrapped:
    // an arrow here would be a new closure on every frame (§9.2 rule 6).
    pool.bind(stage.effects, stage.positionOf, camera);
    if (primeRef.current > 0) {
      // §8.3 rule 3: compile now, at mount, not on the first cue that needs it.
      primeRef.current -= 1;
      pool.prime();
      castingField.prime();
      overlays.prime();
      bustField.prime();
      invalidate();
    }
    driveCamera(now, director, stage, camera, controls, worldRef.current, heldRef, userRef, invalidate);
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
  userRef: { current: { active: boolean; until: number } },
  invalidate: () => void,
): void {
  if (stage.cameraTouched) {
    // The viewer always sits at `you` by construction (`seatOf` maps the
    // viewer's id to that seat), so rule 6's anchors are that seat's.
    const own = anchorsFor('you');
    const directorWorld: DirectorWorld = {
      resolve: stage.positionOf,
      // Rule 6's two anchors. They are the *seat's* own, not a card's, so the
      // clamp holds on a frame with nothing in hand at all. A spectator has no
      // seat to frame, and the director ignores both then (T8).
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
    // The director has the camera: whatever `change` fires now is not a drag.
    userRef.current.active = false;
    userRef.current.until = 0;
  }
  // **Keep the loop awake while a move runs** (T8). `frameloop` is `demand`
  // whenever the cue queue is idle, and a view change, a director cut or a
  // spectator's 3.2 s swoop outlives the cue that started it — without this the
  // camera froze wherever the last cue frame left it until something else
  // asked for a frame. Idle is still zero: nothing is held, nothing is asked.
  if (frame.holding) invalidate();
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

/**
 * **Report 13 §1.1, as code:** `finalTransform(figure) = figurePose(placed)[id]
 * ⊕ offsets[id]`, which is `applyOffsets`' equation with one more term to come
 * (T3's clip lane writes `⊕ clip[id]` into the same pass).
 *
 * Every rig is written every frame for the same reason cards are: that is what
 * returns a figure to its resting pose the instant its cue ends, with no "was it
 * animating?" bookkeeping anywhere.
 *
 * The `mixer.update(0)` is the load-bearing line and it is deliberately a
 * **zero** delta (§3.4): `AnimationAction._updateTime` opens with
 * `if (deltaTime === 0) { if (loopCount === -1) return time; … }`, so the mixer
 * applies the bindings for whatever `action.time` says and advances no clock of
 * its own. The cue queue's virtual clock is the only clock in the arena, which
 * is what buys pause, 0.5×–4×, skip, the live budget and reduced motion for
 * figures without one line of new code.
 */
function applyFigures(
  rigs: FigureRigMap,
  stage: SceneStage,
  now: number,
  dt: number,
  awake: boolean,
): void {
  if (rigs.size === 0) return;
  const seconds = now / 1000;
  for (const rig of rigs.values()) {
    const pose = rig.pose;
    const offset = stage.offsetOf(pose.cardId);
    const bob = pose.bobAmp > 0 ? pose.bobAmp * Math.sin(seconds * 2 * Math.PI * pose.bobHz) : 0;

    rig.root.position.set(
      pose.position[0] + offset.dx,
      pose.position[1] + offset.dy + bob,
      pose.position[2] + offset.dz,
    );
    // **A figure takes the offset's translation and scale, and NOT its
    // in-plane spin** (§3.9).
    //
    // `dRotZ` is the *card's* vocabulary: `layout.ts` turns a tapped card by
    // `TAP_ANGLE` in the table plane and `tap.rotate` animates that turn, so a
    // figure that inherited it would pirouette every time its creature tapped —
    // and a figure that inherited the resting tap would lie down sideways. A
    // tap is a **stance** here (`crouch`), which is T3's clip lane. Same fact,
    // two vocabularies. The only rotation a figure has is which seat it faces.
    rig.root.rotation.set(0, pose.facingY, 0);
    rig.root.scale.setScalar(Math.max(0.0001, pose.height * offset.scale));

    const uniforms = rig.material.uniforms;
    // **§6.4's desaturation wash, and it is one `lerp` and no second material.**
    // The cache carries the freeze as well as the tint string: without it a
    // figure that froze while its tint was unchanged would keep its colour, and a
    // figure that thawed would keep the wash.
    // (Two fields rather than one concatenated key: a template string here would
    // allocate once per figure per frame for the whole of every frozen combat.)
    if (rig.appliedTint !== pose.tint || rig.appliedFrozen !== pose.frozen) {
      uniforms.uTint.value.set(pose.tint);
      if (pose.frozen) uniforms.uTint.value.lerp(FREEZE_WASH, FREEZE_MIX);
      rig.appliedTint = pose.tint;
      rig.appliedFrozen = pose.frozen;
    }
    uniforms.uOpacity.value = Math.max(
      0,
      Math.min(1, pose.opacity * offset.opacity * (1 - offset.dissolve)),
    );

    driveClips(rig, stage.clipOf(pose.cardId), dt, awake);
    rig.mixer.update(0);
  }
}

/**
 * **The fifth step of the frame** (report 13 §3.3, §3.4) — the clip lane, as two
 * blended actions and not one frame of wall-clock time.
 *
 * Two lanes meet here and the split is §1.3's:
 *
 *  - the **rest** action is the stance `figurePose` derived from the snapshot
 *    (`REST_CLIP_FOR`), so a tapped creature kneels after `skip all`, after a
 *    backwards scrub and after a `resync`, with no history at all;
 *  - the **clip** action is whatever cue is running, at the `t` **the cue
 *    computed** and a weight that reaches 0 at `t = 1` (`clipEnvelope`), so a
 *    skipped cue — applied once at `t = 1` and then ended — leaves the figure
 *    standing exactly where `figurePose` says it stands.
 *
 * `action.time` is written and `mixer.update(0)` applies the bindings without
 * advancing a clock: `AnimationAction._updateTime` opens with
 * `if (deltaTime === 0) { if (loopCount === -1) return time; … }` (verified in the
 * installed `three@0.186.0`). **That is the whole mechanism of the tier** — the
 * cue queue's virtual clock is the only clock, so pause, 0.5×–4×, "step one
 * batch", skip, the 2500/1200/250 ms budgets and `prefers-reduced-motion` all
 * apply to the animation because they already apply to the cue.
 *
 * The one thing here that is a function of TIME rather than of state is the
 * breathing, and it is **gated on `awake`** (user decision 7, §8.3 rule 1): the
 * idle advances only while the queue is non-idle, i.e. only while the frame loop
 * is running for some other reason, so `frameloop='demand'` keeps its measured
 * zero idle frames.
 */
function driveClips(
  rig: FigureRig,
  request: ClipRequest | null,
  dt: number,
  awake: boolean,
): void {
  const pose = rig.pose;
  const aliases = pose.clips;
  /**
   * **§6.4's freeze, and it is exactly two skipped writes.** While a stack exists
   * during a combat phase the clip's *weight* is kept — so a lunging attacker
   * stays leaning — and its `t` is not advanced, so nothing moves. It freezes
   * clips only: the spell form keeps turning (`CastingField` has its own clock),
   * the HUD is untouched, and there is no code path from here to a click.
   */
  const frozen = pose.frozen;

  // -- the transient -------------------------------------------------------
  const wanted =
    request === null || request.weight <= 0.001
      ? null
      : actionFor(rig, request.clip, request.alias, aliases);
  if (rig.clip !== wanted) {
    if (rig.clip !== null && rig.clip !== rig.rest) {
      rig.clip.stop();
      rig.clip.enabled = false;
    }
    rig.clip = wanted;
    if (wanted !== null) {
      wanted.enabled = true;
      wanted.setLoop(THREE.LoopOnce, 1);
      wanted.clampWhenFinished = true;
      wanted.play();
    }
  }
  const weight = wanted === null ? 0 : Math.max(0, Math.min(1, request!.weight));
  if (wanted !== null) {
    const duration = wanted.getClip().duration;
    if (!frozen) wanted.time = duration > 0 ? Math.min(duration, request!.t * duration) : 0;
    wanted.setEffectiveWeight(weight);
  }

  // -- the stance ----------------------------------------------------------
  const restClip = REST_CLIP_FOR[pose.stance];
  const rest = actionFor(rig, restClip, null, aliases) ?? actionFor(rig, 'idle', null, aliases);
  if (rig.rest !== rest) {
    if (rig.rest !== null && rig.rest !== wanted) {
      rig.rest.stop();
      rig.rest.enabled = false;
    }
    rig.rest = rest;
    if (rest !== null) {
      rest.enabled = true;
      rest.setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY);
      rest.play();
    }
  }
  if (rest === null || rest === wanted) return;
  const breathes = awake && !frozen && BREATHING_STANCES.has(pose.stance);
  if (breathes) rig.restTime += dt;
  const duration = rest.getClip().duration;
  const phase = REST_PHASE_FOR[pose.stance] * duration;
  if (!frozen) rest.time = duration > 0 ? (phase + rig.restTime) % duration : 0;
  rest.setEffectiveWeight(1 - weight);
}
