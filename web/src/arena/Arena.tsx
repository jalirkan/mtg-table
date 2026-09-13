/*
 * mtg-table — arena/Arena.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The arena: a second `render(state)` for the same frame stream** (M7,
 * `docs/research/09-arena-tier1-plan.md`).
 *
 * The whole seam is three rules (§2.1), and they are why this is cheap:
 *
 *  1. **`Arena` receives the props `Board` receives** — a `ClientState`, the art
 *     index, and a way to send an act. It never imports `transport/`, never
 *     imports `reduce`, never calls `fetch`. Switching views touches neither the
 *     socket nor the reducer: both renderers are pure functions of one live
 *     object, and `main.tsx` owns it.
 *  2. **The decision UI is not re-implemented.** M5's twelve `ask` modals are
 *     mounted, unchanged, in a plain-DOM sibling layer above this canvas
 *     (`DecisionLayer.tsx`) — not drei `<Html>`, which reprojects every frame
 *     and couples the modals to R3F for no benefit.
 *  3. **The arena is stateless with respect to the game.** Anything it remembers
 *     between frames — the cue queue, the transient offsets — is presentation,
 *     and is dropped on a scrub, a `resync` or a changed `gameId`.
 *
 * **The arena decides nothing** (PLAN.md's M7 hard rule). It plays back what the
 * engine said: a click is sent verbatim as `act: clickCard` and the next `state`
 * says what it meant. Nothing here is gated on `selectable` (amendment M8), and
 * **no cue can block a click**: the hit proxies sit at `layout(state)` and there
 * is no code path from the queue to `onAct`.
 *
 * ---------------------------------------------------------------------------
 * All six evenings of §11 are here. E1 built the table, the rig and the clamps;
 * E2 put every card in the frame on it as a textured plane at its resting pose;
 * **E3 added the cue engine** — the offset model, the queue, the stage, the
 * ladder; **E4 the whole §6 cue table, the primitive kit and the cue controls**;
 * **E5 the camera choreography (`camera.ts`) and the per-card `cues.json`**; and
 * **E6 the live seat** — the decision layer below, the keyboard from the one
 * keymap, and the performance pass.
 * ---------------------------------------------------------------------------
 */

import { AdaptiveDpr, OrbitControls, PerspectiveCamera, Stats } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { artEntryFor, type ArtIndex } from '../art.ts';
import { planKey, type KeyContext, type KeyEventLike } from '../keys.ts';
import { buttonFocus, type ActBody, type AnyCard } from '../protocol.ts';
import type { ClientState } from '../reduce.ts';
import type { AnswerFn } from '../render/AskModal.tsx';
import { HotkeysOverlay } from '../render/HotkeysOverlay.tsx';
import type { View } from '../useView.ts';
import { CAMERA, CameraDirector, ORBIT_CLAMPS, REST_POSE } from './camera.ts';
import { DecisionLayer } from './DecisionLayer.tsx';
import cuesJson from './cues/cues.json';
import { cursorOf, intakeFor, type StreamCursor } from './cues/intake.ts';
import { CueQueue, awaitingHuman, budgetFor, type QueueMode } from './cues/queue.ts';
import { REGISTRY } from './cues/registry.ts';
import { EMPTY_CUE_DATA, type CueData } from './cues/types.ts';
import { mergeCueData, validateCues } from './cues/validate.ts';
import {
  CARD_W,
  TABLE_HALF_X,
  TABLE_HALF_Z,
  layout,
  type Layout,
  type Placement,
} from './layout.ts';
import { DPR_FLOOR, GOVERNOR, dprCeiling, lateRate, rungFrom, worstOf } from './perf.ts';
import { CardPlane } from './scene/CardPlane.tsx';
import { CueRunner } from './scene/CueRunner.tsx';
import { EffectPool } from './scene/effects.ts';
import { HitProxy } from './scene/HitProxy.tsx';
import type { RigMap } from './scene/rigs.ts';
import { SceneStage } from './scene/SceneStage.ts';
import { Table } from './scene/Table.tsx';

export interface ArenaProps {
  state: ClientState;
  art: ArtIndex;
  /** `null` in a replay: there is no server, exactly as `<Board>` gets no `actions`. */
  onAct: ((act: ActBody) => void) | null;
  /** §2.3 — one `answer` per open `ask`, marshalled by `AskModal` itself (M5). */
  onAnswer?: AnswerFn | null;
  /** The socket is open. Only the concede button reads it. */
  connected?: boolean;
  /** `V` — the arena's half of the view switch; `null` leaves the key inert. */
  onSetView?: ((view: View) => void) | null;
  /** `?stats=1` — drei's fps panel. */
  showStats?: boolean;
  /** `?grid=1` — the debug grid, in card-height units. */
  showGrid?: boolean;
  /** `?dpr=` — pin the render resolution and switch the adaptive ladder off. */
  dpr?: number | null;
  /**
   * `?glinfo=1` — put `gl.info`'s six counters on `window.__mtgArena.info()`
   * **in a production build**, for `tools/arena-bench.mjs` (§9.1's draw-call
   * budget). Off by default and nothing else is exposed; see `CueRunner.tsx`.
   */
  glInfo?: boolean;
}

/** The speeds the cue strip offers (§11, E4). */
const SPEEDS = [0.5, 1, 2, 4] as const;

/**
 * The governor itself: one `useFrame`, one ring buffer, and no allocation in it.
 *
 * §9.2 rule 7 says no React state updates from `useFrame`, and this is the
 * deliberate exception the rule always had — the resolution *is* React state
 * (`<Canvas dpr>`) — bounded to at most one update per
 * {@link GOVERNOR.cooldownMs}, three orders of magnitude less often than a
 * frame. The window is **cleared after every step**, so the next decision is
 * made about the resolution now on screen rather than the one just left behind.
 */
function DprGovernor({
  dpr,
  onStep,
}: {
  /** The rung the canvas is on, so a step that cannot move is not taken. */
  dpr: number;
  onStep: (direction: -1 | 1) => void;
}): null {
  const state = useRef({
    samples: [] as number[],
    at: 0,
    last: 0,
    lastStep: 0,
    skip: 0,
  }).current;

  /**
   * Take the step, and start measuring the resolution it produced.
   *
   * **A step that cannot move is not a step.** At the floor with frames still
   * late — or at the ceiling with room to spare — the trigger goes on firing,
   * and resetting the window each time would keep the *other* direction's
   * decision permanently out of reach (the climb needs a full window, and it
   * would never get one). Leaving the window alone means the ladder starts
   * climbing the moment the machine recovers.
   *
   * The test is a comparison against the ladder's two ends rather than a call to
   * `rungFrom`, which builds an array: this runs inside `useFrame` on the frame
   * the trigger fires, and §9.2 rule 6 is zero allocation there.
   */
  const step = (now: number, direction: -1 | 1): void => {
    const stuck = direction < 0 ? dpr <= DPR_FLOOR + 1e-6 : dpr >= dprCeiling() - 1e-6;
    if (stuck) return;
    state.lastStep = now;
    state.samples = [];
    state.at = 0;
    state.skip = GOVERNOR.settleFrames;
    onStep(direction);
  };

  useFrame(() => {
    const now = typeof performance === 'undefined' ? Date.now() : performance.now();
    const previous = state.last;
    state.last = now;
    if (previous === 0) return;

    const delta = now - previous;
    // `frameloop="demand"` parks the loop whenever the queue drains, so the
    // first frame after a batch arrives is a gap and not a slow frame. Counting
    // it would drop the resolution every time the board went quiet.
    if (delta > GOVERNOR.parkedMs) return;
    if (state.skip > 0) {
      state.skip -= 1;
      return;
    }

    if (state.samples.length < GOVERNOR.window) state.samples.push(delta);
    else {
      state.samples[state.at] = delta;
      state.at = (state.at + 1) % GOVERNOR.window;
    }

    if (state.samples.length < GOVERNOR.minSamples) return;
    if (now - state.lastStep < GOVERNOR.cooldownMs) return;

    if (lateRate(state.samples, GOVERNOR.downMs) > GOVERNOR.lateFraction) {
      step(now, -1);
      return;
    }
    if (
      state.samples.length === GOVERNOR.window &&
      worstOf(state.samples) <= GOVERNOR.upMs &&
      now - state.lastStep >= GOVERNOR.upQuietMs
    ) {
      step(now, 1);
    }
  });

  return null;
}

/**
 * The camera rig (§3.5).
 *
 * §3.5 draws it as three nested objects (`rigRoot` → `rigOrbit` → `rigShake` →
 * camera). **That nesting is deliberately not built yet, and the reason is
 * `OrbitControls`:** it writes the camera's *local* `position` and reads its own
 * spherical coordinates from it, so a camera under a non-identity parent group
 * makes every clamp below wrong by that parent's transform. The rig's real job
 * — a damped spring toward a rest pose, plus an additive bounded shake — is E5's
 * camera choreography, and E5 can do it by writing the camera directly after the
 * controls update, which is one `useFrame` and needs no parents.
 *
 * E3/E4 cues already *request* the camera (`stage.requestCamera`, §8 rule 2);
 * the requests are recorded and nothing acts on them, which is exactly the
 * budget §8 sets: four camera cues, chosen in E5, not five accreted here.
 */
function CameraRig(): JSX.Element {
  return (
    <>
      <PerspectiveCamera
        makeDefault
        fov={CAMERA.fov}
        near={CAMERA.near}
        far={CAMERA.far}
        position={REST_POSE.position}
      />
      <OrbitControls makeDefault target={REST_POSE.target} {...ORBIT_CLAMPS} />
    </>
  );
}

/** The scene graph. Everything below `<Canvas>` and nothing above it. */
function Scene({
  state,
  placed,
  art,
  onAct,
  showGrid,
  onHover,
  queue,
  stage,
  pool,
  rigs,
  director,
  waiting,
  mode,
  reducedMotion,
  glInfo,
}: {
  state: ClientState;
  placed: Layout;
  art: ArtIndex;
  onAct: ((act: ActBody) => void) | null;
  showGrid: boolean;
  onHover: (cardId: number | null) => void;
  queue: CueQueue;
  stage: SceneStage;
  pool: EffectPool;
  rigs: RigMap;
  director: CameraDirector;
  waiting: boolean;
  mode: QueueMode;
  reducedMotion: boolean;
  glInfo: boolean;
}): JSX.Element {
  const selectable = useMemo(
    () => new Set(state.input?.selectable.cardIds ?? []),
    [state.input],
  );
  const highlighted = useMemo(() => new Set(state.input?.highlighted ?? []), [state.input]);

  const clickCard = useCallback(
    (cardId: number) => {
      // Verbatim. The engine decides whether this click means anything — a click
      // it does not want comes back as `notice{title:"Not selectable"}`, which
      // is a fact the player is entitled to (amendment M8).
      onAct?.({ action: 'clickCard', cardId });
    },
    [onAct],
  );

  return (
    <>
      <color attach="background" args={['#0a0d12']} />
      <Table />
      {showGrid && (
        <gridHelper
          args={[Math.max(TABLE_HALF_X, TABLE_HALF_Z) * 2, 24, '#3a4550', '#232a33']}
          position={[0, 0.001, 0]}
        />
      )}

      {placed.placements.map((placement) => (
        <CardPlane
          key={placement.key}
          placement={placement}
          art={art}
          selectable={selectable.has(placement.cardId)}
          highlighted={highlighted.has(placement.cardId)}
          rigs={rigs}
        />
      ))}

      {/* The click targets are separate objects parked at the resting pose, so a
          card mid-cue is never a moving target (§5.5). They are invisible,
          which costs zero draw calls and nothing at all in the raycaster. */}
      {placed.placements.map((placement) => (
        <HitProxy
          key={`hit:${placement.key}`}
          placement={placement}
          width={CARD_W}
          onClickCard={clickCard}
          onHover={onHover}
        />
      ))}

      {/* The Tier-1 primitive kit: 26 meshes, parked invisible, bound to live
          effects once a frame. Invisible objects are skipped by the renderer
          outright, so an idle pool costs nothing (§9.1). */}
      <primitive object={pool.group} />
      <CueRunner
        queue={queue}
        stage={stage}
        pool={pool}
        rigs={rigs}
        placed={placed}
        director={director}
        awaitingHuman={waiting}
        mode={mode}
        reducedMotion={reducedMotion}
        glInfo={glInfo}
      />

      <CameraRig />
    </>
  );
}

/**
 * §8 rule 7 — `prefers-reduced-motion: reduce`, which for a renderer whose whole
 * vocabulary is motion is not optional. Every cue collapses to a snap; the board
 * still arrives at `layout(state)`, which is the correct board either way.
 */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (): void => {
      setReduced(query.matches);
    };
    query.addEventListener('change', onChange);
    return () => {
      query.removeEventListener('change', onChange);
    };
  }, []);
  return reduced;
}

/**
 * The cue file (§7.1, §7.2), validated at import.
 *
 * **A broken entry is dropped and the ladder falls through**, so a cue file can
 * never stop the arena; the complaint goes to the console and to
 * `web/test/cues-exhaustive.test.ts`, which fails on it.
 *
 * **§7.1's `?cues=<url>` override is deliberately not built** (verification
 * fix — it used to say only "not wired here", which read like an oversight).
 * Fetching a cue file at runtime is a `fetch`, and §2.1 rule 1 says in as many
 * words that the arena *never calls `fetch`*: the whole seam is that this
 * renderer is handed a `ClientState` and asks the network for nothing. One dev
 * convenience is not worth the first exception to that. The iteration loop is
 * `window.__mtgArena` instead (see the dev handle below, and README's arena
 * section, which carries the two-line recipe), and editing `cues.json` is a hot
 * reload away — Vite re-imports it and this `useMemo` re-validates it.
 */
function useCueData(): CueData {
  return useMemo(() => {
    const cueIds = new Set(REGISTRY.keys());
    const { data, errors, warnings } = validateCues(cuesJson, { cueIds });
    for (const problem of errors) {
      console.warn(`[arena] cues.json ${problem.where}: ${problem.message} — entry dropped`);
    }
    for (const problem of warnings) {
      console.info(`[arena] cues.json ${problem.where}: ${problem.message}`);
    }
    return mergeCueData(EMPTY_CUE_DATA, data);
  }, []);
}

export default function Arena({
  state,
  art,
  onAct,
  onAnswer = null,
  connected = true,
  onSetView = null,
  showStats = false,
  showGrid = false,
  dpr: pinnedDpr = null,
  glInfo = false,
}: ArenaProps): JSX.Element {
  const [hoverId, setHoverId] = useState<number | null>(null);
  const [hotkeysOpen, setHotkeysOpen] = useState(false);
  /** `planKey`'s `inert` reason, shown for a moment in the strip. */
  const [hint, setHint] = useState<string | null>(null);
  /** Shared by CTRL+Q and the button: conceding takes two presses of either. */
  const [concedeArmed, setConcedeArmed] = useState(false);
  /**
   * §9.2 rule 9 — the resolution, which is what this scene gives back first.
   *
   * It starts at the **device's own** ratio capped at 1.5, which is exactly
   * what `dpr={[1, 1.5]}` meant before this became adaptive: a plain `1.5` on a
   * dpr-1 display renders 2.25× the pixels the screen can show, and measured
   * under SwiftShader that alone took p50 from 19.6 ms to 21.6 ms and p95 from
   * 29.3 to 58.6. A ceiling is not a target.
   */
  const [dpr, setDpr] = useState(() => pinnedDpr ?? dprCeiling());
  const mode: QueueMode = onAct === null ? 'replay' : 'live';
  const reducedMotion = useReducedMotion();
  const data = useCueData();
  // §5.1's one exception: `presence` is a LAYOUT rule, so it goes in here and
  // not into the queue. That is what makes the Helicarrier survive `skip all`.
  const placed = useMemo(() => layout(state, data.presence ?? {}), [state, data]);
  const hovered = useMemo(
    () => placed.placements.find((p) => p.cardId === hoverId) ?? null,
    [placed, hoverId],
  );
  const waiting = useMemo(() => awaitingHuman(state), [state]);

  // The three objects that outlive every frame, and every one of them is
  // presentation: a ref map of meshes, the stage that collects offsets, and the
  // pool of effect primitives. None of them holds a card, a name or an id from
  // a frame that has gone (P5).
  const rigs = useRef<RigMap>(new Map()).current;
  const stage = useMemo(() => new SceneStage(placed), []); // eslint-disable-line react-hooks/exhaustive-deps
  const pool = useMemo(() => new EffectPool(), []);
  /**
   * §8's camera lane. One per arena, and like the queue it is *presentation*:
   * it holds a home pose and at most one live move, and `flushAndSnap()` resets
   * it with everything else.
   */
  const director = useMemo(() => new CameraDirector(), []);
  const queue = useMemo(
    () =>
      new CueQueue({
        stage,
        registry: REGISTRY,
        data,
        mode,
        reducedMotion,
        onNote: (message) => {
          console.info(`[arena] ${message}`);
        },
      }),
    // Built once: the queue owns a running timeline, and rebuilding it mid-game
    // would drop cues on a prop change. The three mutable settings below are
    // pushed into it instead.
    [stage], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    queue.setMode(mode);
    queue.setReducedMotion(reducedMotion);
    queue.data = data;
  }, [queue, mode, reducedMotion, data]);

  useEffect(() => () => pool.dispose(), [pool]);

  /**
   * **The dev handle** (§10.7, "not automated, and honest about it").
   *
   * A cue *looking right* is not testable here, so the iteration loop is: pause
   * the queue, advance the virtual clock by hand, look. `queue.advance(ms)`
   * moves the clock whether or not the queue is paused, which means a cue can be
   * frozen at any point of its arc — and that is also the only way to photograph
   * the middle of a cue in an environment whose animation frames do not fire
   * (the browser pane repaints on demand, not on a clock).
   *
   *     const q = window.__mtgArena.queue
   *     q.setPaused(true); q.advance(220)   // a tap, a third of the way through
   *
   * `import.meta.env.DEV` is a compile-time constant, so the block is dropped
   * from the production bundle entirely.
   */
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const handle = window as unknown as { __mtgArena?: Record<string, unknown> };
    // **Merge, and never delete.** `CueRunner` puts the renderer, the scene and
    // the camera on the same handle, and it lives inside the `<Canvas>` — a
    // different reconciler, whose effects do not interleave with this tree's the
    // way a parent and child in one tree do. A cleanup that deleted the whole
    // handle therefore raced the renderer half away on every mount, and
    // `__mtgArena.gl` was `undefined` on a fresh load and present after a hot
    // update, which is the most confusing possible version of this bug. It is a
    // dev-only handle on `window`; leaving it there costs nothing.
    handle.__mtgArena = { ...(handle.__mtgArena ?? {}), queue, stage, pool, rigs, director };
  }, [queue, stage, pool, rigs, director]);

  /**
   * **The keyboard, from the one table** (`web/src/keys.ts`, CLAUDE.md M4
   * convention 4).
   *
   * Not a second handler and not a second map: `planKey` is the same pure
   * function the board drives, given a `KeyContext` built from the same engine
   * fields, and the `?` overlay is the same component rendering the same rows.
   * A help screen built from a second list is a help screen that will one day
   * list a key nothing implements — and M7 adds two rows (`V`, `K`) rather than
   * a branch, so the overlay gained them for free.
   *
   * What the arena does **not** implement is `Z`/`S`/`C`/`L`: those open board
   * panels that have no 3D surface. They resolve to a `view` plan, and the
   * switch below answers each one with the strip's `inert` hint — *"S opens a
   * board panel — press V"* — rather than dropping it. Dropping it was the
   * original behaviour and it is exactly the defect the board shipped with `V`:
   * `planKey` has already consumed the key, `preventDefault` has already run,
   * and a key the `?` overlay lists that then does nothing at all, with no
   * feedback, is indistinguishable from a broken keyboard.
   */
  const contextRef = useRef<KeyContext | null>(null);
  contextRef.current = {
    live: onAct !== null && state.gameOver === null,
    askOpen: state.ask !== null,
    okEnabled: state.input?.buttons.ok.enabled === true,
    cancelEnabled: state.input?.buttons.cancel.enabled === true,
    haveSelectable: (state.input?.selectable.cardIds.length ?? 0) > 0,
    // The arena has no mana pips, so no letter is ever borrowed by the pool and
    // `C`/`B` keep their table meanings. Reading the pool anyway would bind six
    // keys to an act with no control behind it.
    poolColors: [],
    focus: buttonFocus(state.input),
    overlay: hotkeysOpen ? 'hotkeys' : 'none',
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const ctx = contextRef.current;
      if (ctx === null) return;
      const target = event.target as (HTMLElement & { isContentEditable?: boolean }) | null;
      const resolved = planKey(
        {
          key: event.key,
          code: event.code,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          isComposing: event.isComposing,
          target:
            target === null
              ? null
              : { tagName: target.tagName, isContentEditable: target.isContentEditable },
        } satisfies KeyEventLike,
        ctx,
      );
      // Report 10 §12.2 rule 3: `preventDefault` only for a key we consumed.
      if (resolved === null) return;
      event.preventDefault();
      setHint(null);
      const plan = resolved.plan;
      switch (plan.kind) {
        case 'buttonOk':
          onAct?.({ action: 'buttonOk' });
          return;
        case 'buttonCancel':
          onAct?.({ action: 'buttonCancel' });
          return;
        case 'answerNull':
          // §5.4 — always legal, and the bridge substitutes Forge's own default.
          if (state.ask !== null) onAnswer?.(state.ask.askId, null);
          return;
        case 'concede':
          // §9 invariant 6, with the board's own two-step: it ends the game and
          // there is no undo for it.
          setConcedeArmed((armed) => {
            if (armed) onAct?.({ action: 'concede' });
            else setHint('press CTRL+Q again to concede');
            return !armed;
          });
          return;
        case 'closeOverlay':
          setHotkeysOpen(false);
          return;
        case 'undo':
          onAct?.({ action: 'undo' });
          return;
        case 'passPriority':
          onAct?.({ action: 'passPriority' });
          return;
        case 'alphaStrike':
          onAct?.({ action: 'alphaStrike' });
          return;
        case 'view':
          if (plan.id === 'toggleHotkeys') setHotkeysOpen((open) => !open);
          // **The accessibility key** (§11 E6): everything playing snaps, and
          // the board lands on exactly `layout(state)` — which is the board the
          // engine described, so there is nothing to be "missed" by skipping.
          else if (plan.id === 'skipCues') {
            queue.skipAll();
            director.reset();
          } else if (plan.id === 'toggleView') {
            if (onSetView === null) setHint('there is no board to switch to');
            else onSetView('board');
          } else {
            // `Z`/`S`/`C`/`L` open board panels that have no 3D surface. **Say
            // so.** A key the `?` overlay lists, `planKey` consumed (so
            // `preventDefault` has already run) and the handler then drops is
            // the same silent swallow that made `V` dead on the board.
            setHint(`${resolved.binding.chord} opens a board panel — press V`);
          }
          return;
        case 'inert':
          setHint(plan.why);
          return;
        default:
          // `useMana`, `yieldTo` and `setYield` need controls the arena does not
          // draw (the mana pips, the pass-to row, the stack's yield chips). They
          // are the board's, and saying so is better than half-sending one.
          setHint(`${resolved.binding.chord} is a board control — press V`);
          return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [onAct, onAnswer, onSetView, queue, director, state.ask]);

  // -- batch intake (§2.3) ---------------------------------------------------
  //
  // The arena consumes batches with no subscription of its own: it watches the
  // `ClientState` it is handed and asks `intakeFor` whether the stream moved on
  // or jumped. A jump is `flushAndSnap()`, and because offsets are transient the
  // scene is then exactly `layout(state)` — which is why scrubbing backwards
  // through a replay is correct by construction rather than by special case.
  const cursor = useRef<StreamCursor>({ eventSeq: -1, framesApplied: -1, gameId: null });
  useEffect(() => {
    const next = cursorOf(state);
    const action = intakeFor(cursor.current, next);
    cursor.current = next;
    if (action === 'flush') {
      queue.flushAndSnap();
      pool.clear();
      // A scrub, a `resync` or a new `gameId` invalidates every card id the
      // scene holds — including the ones a camera move was framing.
      director.reset();
      return;
    }
    if (action === 'nothing') {
      // Still re-budget: "the engine started waiting on the human" arrives as a
      // new `input`, not as a new event batch (§5.3).
      queue.retimeToBudget(budgetFor(state, mode));
      return;
    }
    queue.enqueueBatch(state.events, state);
  }, [state, queue, pool, mode, director]);

  return (
    <div className="arena">
      <Canvas
        // §9.2 rule 4 — MSAA is essentially free on a hundred quads; a 4K
        // display at dpr 2 is not. **Adaptive as of E6**: `<PerformanceMonitor>`
        // below moves this between 0.75 and 1.5 from measured frame times, and
        // §9.3's first risk is exactly what it is protecting — this scene is
        // FILL-rate bound, not geometry bound.
        dpr={dpr}
        gl={{ antialias: true }}
        // The scene is unlit (§4.3), so there is nothing for tone mapping to do
        // except shift the card art away from what Scryfall drew.
        flat
        // §5.4 — start on demand. `CueRunner` switches to `always` the moment
        // the queue has something to play and back when it drains.
        frameloop="demand"
        // `performance.min` is the floor drei's PerformanceMonitor would drop to
        // (§9.2 rule 9); it is set now so the number has one home.
        performance={{ min: 0.5 }}
      >
        {/**
         * §9.2 rule 9 — **degrade, don't stutter.**
         *
         * Measured under the software rasteriser §9.4 asks for (SwiftShader,
         * `tools/arena-bench.mjs`, production build): at 1920×993 and device
         * dpr 1 the arena rendered p50 19.40 ms / **p95 22.40 ms**, and the
         * same URL at `?dpr=0.75` — 44% fewer pixels — p50 12.20 / **p95
         * 14.20**. Same scene both times: 35 draw calls, 70 triangles, one
         * geometry. The cost is **pixels**, which is what an unlit, quad-only,
         * blended scene is bound by and what a CPU rasteriser is worst at. So
         * the number to give back under load is the resolution, and
         * `<DprGovernor>` is the control that gives it back — stepping on the
         * **p95 of the frame interval**, which is what §9.4's gate measures and
         * what drei's smoothed fps average could not see (see {@link GOVERNOR}).
         *
         * `<AdaptiveDpr>` is the second half and is unchanged: it drops the
         * resolution further while the user is actively orbiting and restores
         * it when they stop.
         */}
        {/* A pinned `?dpr=` is the user's answer and the ladder does not argue. */}
        {pinnedDpr === null && (
          <DprGovernor
            dpr={dpr}
            onStep={(direction) => {
              setDpr((current: number) => rungFrom(current, direction));
            }}
          />
        )}
        {/* **Dormant in this configuration, and kept so the next reader knows
            it is.** §9.2 rule 9 names `<AdaptiveDpr>` as the second half of the
            ladder — it lowers the resolution while the user drags and restores
            it when they stop. It acts on `performance.current`, which only ever
            moves when something calls `regress()`, and the only thing here that
            would is drei's `<OrbitControls regress>` — a prop this file does not
            pass. So it runs its effect once at mount and never again. It is left
            in place because it is harmless and because the plan asks for it; the
            trap it hides is that it writes `current * viewport.initialDpr`, i.e.
            the resolution the canvas STARTED at, so turning `regress` on would
            make it undo a governor decision on every mouse-up. Turn one on and
            the other off. */}
        <AdaptiveDpr />
        <Scene
          state={state}
          placed={placed}
          art={art}
          onAct={onAct}
          showGrid={showGrid}
          onHover={setHoverId}
          queue={queue}
          stage={stage}
          pool={pool}
          rigs={rigs}
          director={director}
          waiting={waiting}
          mode={mode}
          reducedMotion={reducedMotion}
          glInfo={glInfo}
        />
        {showStats && <Stats />}
      </Canvas>

      {/* The DOM sibling layer (§2.1 rule 2): `pointer-events: none` on the
          container, `auto` on the widgets, so the canvas keeps every click the
          layer does not want. */}
      <div className="arena__layer">
        <DecisionLayer
          state={state}
          art={art}
          onAct={onAct}
          onAnswer={onAnswer}
          connected={connected}
          hint={hint}
          concedeArmed={concedeArmed}
          onArmConcede={setConcedeArmed}
        />
        <CueControls queue={queue} />
        <ArtCredit art={art} placements={placed.placements} hovered={hovered} />
        {hotkeysOpen && (
          <HotkeysOverlay
            onClose={() => {
              setHotkeysOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * **The cue controls** (§11, E4): play / pause / step one batch / speed / skip
 * cue / skip all.
 *
 * They drive the **cue queue**, not the transport. `<ReplayControls>` above the
 * canvas already moves the frame log; these move the film played *over* it, and
 * the two are independent on purpose — pausing the cues while the log keeps
 * running is how you read a busy board, and stepping a batch with the log
 * paused is how you watch one transition.
 *
 * Every one of them is safe at any moment because skipping is `apply(t = 1)`
 * followed by `end()`: the scene lands on `layout(state)`, which is the board
 * the engine actually described (§5.1).
 */
function CueControls({ queue }: { queue: CueQueue }): JSX.Element {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => queue.onChange(bump), [queue]);

  const pending = queue.pendingSteps;
  const remaining = Math.round(queue.totalRemainingMs());

  return (
    <div className="arena__cues" role="group" aria-label="Cue playback">
      <button
        type="button"
        onClick={() => {
          queue.setPaused(!queue.paused);
          bump();
        }}
        title="Pause or resume the animation clock (the frame log keeps its own play state)"
      >
        {queue.paused ? '▶ cues' : '⏸ cues'}
      </button>
      <button
        type="button"
        onClick={() => {
          queue.stepBatch();
        }}
        disabled={pending === 0}
        title="Play the earliest queued batch through to its end"
      >
        step batch
      </button>
      <button
        type="button"
        onClick={() => {
          queue.skipCurrent();
        }}
        disabled={pending === 0}
        title="Snap the cue that is playing and pull the rest forward"
      >
        skip cue
      </button>
      <button
        type="button"
        onClick={() => {
          queue.skipAll();
        }}
        disabled={pending === 0}
        title="Snap everything — the board jumps to exactly what the engine described"
      >
        skip all
      </button>
      <label>
        speed{' '}
        <select
          value={String(queue.speed)}
          onChange={(event) => {
            queue.setSpeed(Number(event.currentTarget.value));
            bump();
          }}
        >
          {SPEEDS.map((s) => (
            <option key={s} value={String(s)}>
              {s}×
            </option>
          ))}
        </select>
      </label>
      <span className="muted">
        {pending > 0 ? `${String(pending)} step${pending === 1 ? '' : 's'} · ${String(remaining)} ms` : 'idle'}
      </span>
    </div>
  );
}

/**
 * **The credit travels with the art** — the same rule the board's `CardTile` and
 * `CardZoom` follow (the Fan Content Policy and Scryfall's attribution terms,
 * `NOTICE` §2 and §3), applied to a renderer that has no markup to hang it on.
 *
 * Hovering a card names that card's printing and artist; with nothing hovered it
 * credits the artists of the faces currently on the table. A card drawn as a
 * **back** is never named here — `Placement.back` is the same gate `CardPlane`
 * uses, so the credit line cannot become a channel for a card the viewer may not
 * see.
 */
function ArtCredit({
  art,
  placements,
  hovered,
}: {
  art: ArtIndex;
  placements: Placement[];
  hovered: Placement | null;
}): JSX.Element {
  const entry = hovered !== null && !hovered.back ? artEntryFor(art, hovered.card) : null;
  const name = hovered !== null && !hovered.back ? nameOf(hovered.card) : null;

  const artists = useMemo(() => {
    const seen = new Set<string>();
    for (const placement of placements) {
      if (placement.back) continue;
      const hit = artEntryFor(art, placement.card);
      if (hit !== null && hit.artist !== '') seen.add(hit.artist);
    }
    return [...seen].sort();
  }, [art, placements]);

  if (entry !== null && name !== null) {
    return (
      <span className="arena__credit" title={`${name} — art by ${entry.artist}`}>
        <strong>{name}</strong> · {entry.setCode} #{entry.collectorNumber} · art by {entry.artist} ·
        © Wizards of the Coast
      </span>
    );
  }

  const shown = artists.slice(0, 6);
  const rest = artists.length - shown.length;
  return (
    <span className="arena__credit" title={artists.join(', ')}>
      Card images and data from <a href="https://scryfall.com">Scryfall</a>
      {shown.length > 0 && <> · art by {shown.join(', ')}</>}
      {rest > 0 && <> +{rest} more</>} · © Wizards of the Coast · Unofficial Fan Content
    </span>
  );
}

function nameOf(card: AnyCard): string | null {
  const name = (card as { name?: string }).name;
  return typeof name === 'string' && name !== '' ? name : null;
}
