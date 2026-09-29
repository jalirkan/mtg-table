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
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import { artEntryFor, type ArtIndex } from '../art.ts';
import { planKey, type KeyContext, type KeyEventLike } from '../keys.ts';
import { buttonFocus, type ActBody, type AnyCard } from '../protocol.ts';
import type { ClientState } from '../reduce.ts';
import type { AnswerFn } from '../render/AskModal.tsx';
import { HotkeysOverlay } from '../render/HotkeysOverlay.tsx';
import type { View } from '../useView.ts';
import {
  CAMERA,
  CameraDirector,
  ORBIT_CLAMPS,
  REST_POSE,
  SPECTATOR_CLAMPS,
  VIEWS,
  VIEW_BY_ID,
  beatsOf,
  effectiveView,
  isCameraChoice,
  lookupFor,
  viewAvailable,
  type CameraChoice,
  type OrbitClamps,
  type ViewId,
} from './camera.ts';
import { colourHex, colourIdOf } from './colour.ts';
import {
  CAPTION_STORE_KEY,
  captionChoiceOf,
  captionContextOf,
  storedCaptionWith,
  type ArenaCaption,
  type CaptionContext,
} from './caption.ts';
import { CaptionStrip } from './CaptionStrip.tsx';
import { DecisionLayer, ViewSwitcher, type ViewSwitcherItem } from './DecisionLayer.tsx';
import cuesJson from './cues/cues.json';
import figuresJson from './figures/figures.json';
import modelsJson from './figures/models.json';
import duelistsJson from './figures/duelists.json';
import { cursorOf, intakeFor, type StreamCursor } from './cues/intake.ts';
import { motionFromSearch, DEFAULT_MOTION, type MotionFlags } from './cues/motion.ts';
import { CueQueue, awaitingHuman, budgetFor, type QueueMode } from './cues/queue.ts';
import { REGISTRY } from './cues/registry.ts';
import { EMPTY_CUE_DATA, type CueData } from './cues/types.ts';
import { mergeCueData, validateCues } from './cues/validate.ts';
import { paletteNamesOf, useArtPalettes } from './art.ts';
import { combatFreeze, manaMotes, spellForms, type ManaMote, type SpellForm } from './figures/casting.ts';
import {
  duelistBusts,
  duelistPoses,
  validateDuelists,
  type DuelistBust,
  type DuelistData,
  type DuelistPose,
} from './figures/duelists.ts';
import { figurePose, type FigureLayout } from './figures/pose.ts';
import { statusLayout, type StatusLayout } from './figures/status.ts';
import { tilePose, type TileLayout } from './figures/tiles.ts';
import {
  EMPTY_FIGURE_DATA,
  EMPTY_MODEL_DATA,
  tileDataOf,
  type FigureData,
  type ModelData,
} from './figures/types.ts';
import { validateFigures, validateModels } from './figures/validate.ts';
import {
  CARD_W,
  TABLE_HALF_X,
  TABLE_HALF_Z,
  layout,
  viewerIdOf,
  type Layout,
  type Placement,
} from './layout.ts';
import {
  COMIC,
  DEFAULT_LOOK,
  HOLO_BACKGROUND,
  combatStageOf,
  lookFromSearch,
  stageColoursOf,
  stageIdentitiesOf,
  wantsInkPass,
  wantsStage,
  type LookSpec,
} from './look.ts';
import { BLOOM_DEFAULT, DPR_FLOOR, GOVERNOR, dprCeiling, lateRate, postOnFloor, rungFrom, worstOf } from './perf.ts';
import { CardPlane } from './scene/CardPlane.tsx';
import { CueRunner, type Frameloop } from './scene/CueRunner.tsx';
import { CastingField } from './scene/casting.ts';
import { DiscField } from './scene/discs.ts';
import { BustField } from './scene/busts.ts';
import { EffectPool } from './scene/effects.ts';
import { OverlayField } from './scene/overlays.ts';
import type { FigureRigMap } from './scene/figureRigs.ts';
import { DuelistLayer } from './scene/DuelistLayer.tsx';
import { NO_PERSONAL_LOADED, usePersonalModels, usePersonalOverlay, type PersonalLoaded } from './scene/personalModels.ts';
import { isSoundChoice, sharedAudio, soundOn, type ArenaAudio, type SoundChoice } from './scene/audio.ts';
import { loadAssetBytes } from './scene/models.ts';
import { dressPoses, personalChoicesOf } from './personal.ts';
import { dressStandees, standeeChoicesKeyOf, standeeChoicesOf, type StandeeCanvas } from './standee.ts';
import { NO_STANDEES, RELIEF_BASE, useReliefIndex, useStandees, type StandeesLoaded } from './scene/reliefCache.ts';
import { inspectContextOf, inspectTargetOf, type InspectTarget } from './inspect.ts';
import { FigureLayer } from './scene/FigureLayer.tsx';
import { HitProxy } from './scene/HitProxy.tsx';
import type { RigMap } from './scene/rigs.ts';
import { SceneStage } from './scene/SceneStage.ts';
import { Table } from './scene/Table.tsx';
import { TileField } from './scene/tiles.ts';

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
   * `?bloom=1` / `?bloom=0`, or `null` for {@link BLOOM_DEFAULT} — user decision 6.
   * Where the bloom toggle STARTS; the checkbox in the cue controls flips it.
   *
   * It is the one post pass the arena has and its default is **a measurement**,
   * not a preference: see `scene/Post.tsx` and `perf.ts`.
   */
  bloom?: boolean | null;
  /**
   * `?glinfo=1` — put `gl.info`'s six counters on `window.__mtgArena.info()`
   * **in a production build**, for `tools/arena-bench.mjs` (§9.1's draw-call
   * budget). Off by default and nothing else is exposed; see `CueRunner.tsx`.
   */
  glInfo?: boolean;
  /**
   * **Spectating** (amendment M47, D118): the frame log is being followed while
   * it is written — `following`, gone quiet (`stalled`), `finished`, or `lost`
   * (a 416: the file was re-recorded under the same name and following stopped
   * for good; polish-1's follow-up 2) — or `null` for anything else. Plain data
   * from `main.tsx`: the arena imports no transport and never polls (M7
   * convention 1, `liveness.test.ts`); it only prints the word on the
   * "watching" line.
   */
  follow?: ArenaFollow | null;
  /**
   * **The look** (Lane LOOK, D137): `main.tsx`'s `arenaFlagsFromQuery` keeps
   * `?look=` and its options as a query string, and it is parsed here once
   * (`look.ts`'s `lookFromSearch`); absent is {@link DEFAULT_LOOK} — the comic
   * look, `perf.ts`'s `LOOK_DEFAULT`. Presentation, like the cue speed: nothing
   * the engine sees.
   */
  lookQuery?: string | null;
  /**
   * **The caption** (D255): the narrator's moment for the frame on screen, with
   * the one or two before it and a turn marker — or `null` when no moment names
   * that frame (the strip hides). Plain data from `main.tsx`, which runs THE
   * narrator (`story/narrate.ts`) over the replay's frames or, at a live seat,
   * over the frames it records off the socket; the arena imports no narrator and
   * no `story/` module (`liveness.test.ts`), so it draws a sentence and decides
   * nothing.
   */
  caption?: ArenaCaption | null;
  /**
   * Called with whether the strip is on (`N`, the cue strip's checkbox, the
   * stored choice — D256), so `main.tsx` narrates only while someone is reading:
   * off by default at a live seat, where that is nobody.
   */
  onCaptionShown?: ((on: boolean) => void) | null;
}

/** What {@link ArenaProps.follow} can say. Declared here, not imported: the arena knows no transport. */
export type ArenaFollow = 'following' | 'stalled' | 'finished' | 'lost';

/** The speeds the cue strip offers (§11, E4). */
const SPEEDS = [0.5, 1, 2, 4] as const;

/**
 * **The canvas's size, for the standee's legibility floor** (D261, as fix pass 2
 * amended it): fiber's own measurement of the canvas — `size`, CSS pixels, from the
 * ResizeObserver `<Canvas>` already runs — handed to `Arena` in an effect when it
 * changes. The floor is a POSE input: a resize re-runs the lookup at commit, and
 * nothing reads a size for it in the frame loop.
 */
function CanvasSizeReport({ onSize }: { onSize: (width: number, height: number) => void }): null {
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  useEffect(() => {
    onSize(width, height);
  }, [width, height, onSize]);
  return null;
}

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
  onFloor,
}: {
  /** The rung the canvas is on, so a step that cannot move is not taken. */
  dpr: number;
  onStep: (direction: -1 | 1) => void;
  /**
   * **T7 — the rung below the floor.** Called when frames are still late at
   * {@link DPR_FLOOR}: the one optional composer the arena has — bloom (user
   * decision 6) and the comic look's ink line riding it (D139) — is what goes
   * next. Returns whether it changed anything, so a governor with nothing left to
   * drop stays exactly as it was.
   */
  onFloor?: () => boolean;
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
    if (stuck) {
      // "Degrade, don't stutter" (§9.2 rule 9), one rung further: bloom was
      // measured at p95 82 ms under SwiftShader at this very floor (T7), so a
      // machine that is still late here gets its composer — bloom and the ink
      // line with it (D139) — turned off, and the window restarts, so the next
      // decision is about the table without it.
      if (direction < 0 && onFloor !== undefined && onFloor()) {
        state.lastStep = now;
        state.samples = [];
        state.at = 0;
        state.skip = GOVERNOR.settleFrames;
      }
      return;
    }
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
function CameraRig({ clamps }: { clamps: OrbitClamps }): JSX.Element {
  // **T8: the box follows the mode** — {@link ORBIT_CLAMPS} at a seat,
  // {@link SPECTATOR_CLAMPS} for a spectator. `position` and `target` are
  // module constants, so fiber applies them once at mount and never again; the
  // view the camera is on is `CueRunner`'s to write (`CameraDirector.home`).
  return (
    <>
      <PerspectiveCamera
        makeDefault
        fov={CAMERA.fov}
        near={CAMERA.near}
        far={CAMERA.far}
        position={REST_POSE.position}
      />
      <OrbitControls makeDefault target={REST_POSE.target} {...clamps} />
    </>
  );
}

/**
 * **T8 — where the chosen view is kept: this browser, and nothing else.**
 *
 * A per-viewer convenience, so `localStorage` and not the frame log or the
 * server; every read and write is inside `try` because the storage can throw
 * (a private window, blocked site data) and the arena must render the same
 * with nothing stored — which is the table view. The spectator toggle is
 * deliberately NOT stored: it is derived from the transport every time.
 */
const CAMERA_STORE_KEY = 'mtg-table.arena.camera';

function readStoredView(): CameraChoice {
  try {
    const stored = window.localStorage.getItem(CAMERA_STORE_KEY);
    return isCameraChoice(stored) ? stored : 'table';
  } catch {
    return 'table';
  }
}

function storeView(choice: CameraChoice): void {
  try {
    window.localStorage.setItem(CAMERA_STORE_KEY, choice);
  } catch {
    // Nothing to do: the choice still holds for this page.
  }
}

/**
 * **D251 — whether this browser turned the arena's sound on**, kept exactly as the
 * camera view is: a per-viewer convenience in `localStorage`, every access inside
 * `try`, and nothing stored means the default — muted (`scene/audio.ts`'s
 * `soundOn`, which is also where `prefers-reduced-motion` comes in).
 */
const SOUND_STORE_KEY = 'mtg-table.arena.sound';

function readSoundChoice(): SoundChoice {
  try {
    const stored = window.localStorage.getItem(SOUND_STORE_KEY);
    return isSoundChoice(stored) ? stored : null;
  } catch {
    return null;
  }
}

function storeSoundChoice(choice: 'on' | 'off'): void {
  try {
    window.localStorage.setItem(SOUND_STORE_KEY, choice);
  } catch {
    // Nothing to do: the choice still holds for this page.
  }
}

/**
 * **D256 — the caption's choice, in this browser**, per context (`caption.ts`'s
 * `CAPTION_DEFAULT`: on while watching, off at a live seat). A per-viewer
 * convenience like the camera's view, so `localStorage`, inside `try`, and the
 * context's default when nothing (or nothing readable) is stored.
 */
function readStoredCaption(context: CaptionContext): boolean {
  try {
    return captionChoiceOf(window.localStorage.getItem(CAPTION_STORE_KEY), context);
  } catch {
    return captionChoiceOf(null, context);
  }
}

function storeCaption(context: CaptionContext, on: boolean): void {
  try {
    const stored = window.localStorage.getItem(CAPTION_STORE_KEY);
    window.localStorage.setItem(CAPTION_STORE_KEY, storedCaptionWith(stored, context, on));
  } catch {
    // Nothing to do: the choice still holds for this page.
  }
}

/**
 * **The one post pass, lazily** (user decision 6). Nothing under `scene/Post.tsx`
 * is imported unless bloom is actually on, so the composer is not in the arena
 * chunk's critical path — measured: the arena chunk is 329.54 kB gzip with it
 * statically imported and 312.9 kB without.
 */
const Post = lazy(() =>
  import('./scene/Post.tsx').then((module) => ({ default: module.Post })),
);

/** The scene graph. Everything below `<Canvas>` and nothing above it. */
function Scene({
  state,
  placed,
  art,
  onAct,
  showGrid,
  onHover,
  onPicked,
  queue,
  stage,
  pool,
  rigs,
  figures,
  figureRigs,
  discs,
  strips,
  tiles,
  tileField,
  motes,
  forms,
  castingField,
  overlays,
  busts,
  bustField,
  duelists,
  duelistData,
  models,
  director,
  waiting,
  mode,
  reducedMotion,
  cameraView,
  spectator,
  viewPress,
  glInfo,
  primeRef,
  loopRef,
  look = DEFAULT_LOOK,
  composer = false,
  personal = NO_PERSONAL_LOADED,
  standees = NO_STANDEES,
  audio = null,
}: {
  state: ClientState;
  placed: Layout;
  art: ArtIndex;
  onAct: ((act: ActBody) => void) | null;
  showGrid: boolean;
  onHover: (cardId: number | null) => void;
  /** D241: a card was clicked — the arena remembers it for `I` and the inspect chip (a view note, never an act). */
  onPicked: (cardId: number) => void;
  queue: CueQueue;
  stage: SceneStage;
  pool: EffectPool;
  rigs: RigMap;
  figures: FigureLayout;
  figureRigs: FigureRigMap;
  discs: DiscField;
  /** The status layer (D210) — `figures/status.ts`'s strips for this snapshot. */
  strips: StatusLayout;
  tiles: TileLayout;
  tileField: TileField;
  motes: ManaMote[];
  forms: SpellForm[];
  castingField: CastingField;
  overlays: OverlayField;
  busts: DuelistBust[];
  bustField: BustField;
  duelists: DuelistPose[];
  duelistData: DuelistData;
  models: ModelData;
  director: CameraDirector;
  waiting: boolean;
  mode: QueueMode;
  reducedMotion: boolean;
  cameraView: CameraChoice;
  spectator: boolean;
  viewPress: number;
  glInfo: boolean;
  primeRef: { current: number };
  loopRef: { current: Frameloop };
  /** The look (D137) — the background, the stage, the figures and the duelists. */
  look?: LookSpec;
  /**
   * Whether a composer draws the frames (bloom or the ink): the layers' mount-time
   * primes compile for that target (`scene/prime.ts`), and again when it changes.
   */
  composer?: boolean;
  /** **The personal tier** (D194, D195): the loaded models, for the figure layer and the seats. */
  personal?: PersonalLoaded;
  /** **The portrait standee** (D260): the loaded standees, for the figure layer. */
  standees?: StandeesLoaded;
  /** **D250** — the sound renderer `CueRunner` binds once a frame (muted until the viewer says). */
  audio?: ArenaAudio | null;
}): JSX.Element {
  const selectable = useMemo(
    () => new Set(state.input?.selectable.cardIds ?? []),
    [state.input],
  );
  const highlighted = useMemo(() => new Set(state.input?.highlighted ?? []), [state.input]);

  // **The stage** (D141): each seat's half in the colour of what it has shown —
  // a pure function of the snapshot's public zones, repainted only when a seat's
  // identity changes (the memo is keyed on the two strings) — and the combat
  // burst, a pose of `state.combat`.
  const stageOn = wantsStage(look);
  const shown = stageIdentitiesOf(state.board?.players, viewerIdOf(state));
  const stageColours = useMemo(
    () => (stageOn ? stageColoursOf(shown.you, shown.opp) : null),
    [stageOn, shown.you, shown.opp],
  );
  const combat = stageOn && combatStageOf(state.board?.combat);

  const clickCard = useCallback(
    (cardId: number) => {
      onPicked(cardId);
      // Verbatim. The engine decides whether this click means anything — a click
      // it does not want comes back as `notice{title:"Not selectable"}`, which
      // is a fact the player is entitled to (amendment M8).
      onAct?.({ action: 'clickCard', cardId });
    },
    [onAct, onPicked],
  );

  return (
    <>
      <color attach="background" args={[stageOn ? COMIC.background : HOLO_BACKGROUND]} />
      <Table stage={stageColours} combat={combat} />
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

      {/* **Tier 2's manifestation stage** (report 13 §3): a figure standing at
          each battlefield creature's stand point, plus one instanced mesh
          drawing every creature's disc. It mounts objects and registers rigs;
          every transform in it is written by `CueRunner`'s single `useFrame`,
          and a missing `figures.glb` simply leaves the discs. */}
      {/* **T4's terrain** (report 13 §5): three instanced slabs and one rim, under
          the cards. It is mounted before the figures so the painter's order in
          the coplanar group is table → tile → card → disc → figure. */}
      <primitive object={tileField.group} />

      <FigureLayer
        poses={figures}
        rigs={figureRigs}
        discs={discs}
        models={models}
        look={look}
        composer={composer}
        status={strips}
        personal={personal.models}
        standees={standees.standees}
      />

      {/* **T4's casting anchor and T6's stack**: the floating mana of each seat,
          §6.2's five spell forms, and §6.3's tethers to what each one targets.
          Seven instanced meshes, none of them drawn while empty, every one a
          pose. The creature form is the ghosted FIGURE above, not a shape here. */}
      <primitive object={castingField.group} />

      {/* **T5's attachment manifestations** (report 13 §4): the ring at an
          enchanted figure's feet and the glow at its chest, for every attachment
          the snapshot says is there. Two instanced meshes, their own budget. */}
      <primitive object={overlays.group} />

      {/* **T13's duelists** (report 13 §7; Tier 2 slice 4): a full figure per
          seat at its side of the table, through the figure library's own loader
          and holographic material — and T7's silhouette busts as the fallback
          when the library is missing. `CueRunner` binds both through
          `bustField.bind`; neither is in the camera solver's required set, and
          neither is a click target. */}
      <primitive object={bustField.group} />
      <DuelistLayer
        poses={duelists}
        bustField={bustField}
        models={models}
        data={duelistData}
        stage={stage}
        queue={queue}
        look={look.look === 'comic' ? 1 : 0}
        composer={composer}
        personal={personal.seats}
      />

      {/* The Tier-1 primitive kit: 26 meshes, parked invisible, bound to live
          effects once a frame. Invisible objects are skipped by the renderer
          outright, so an idle pool costs nothing (§9.1). */}
      <primitive object={pool.group} />
      <CueRunner
        queue={queue}
        stage={stage}
        pool={pool}
        rigs={rigs}
        figures={figures}
        figureRigs={figureRigs}
        discs={discs}
        tiles={tiles}
        tileField={tileField}
        motes={motes}
        forms={forms}
        castingField={castingField}
        overlays={overlays}
        busts={busts}
        bustField={bustField}
        placed={placed}
        director={director}
        awaitingHuman={waiting}
        mode={mode}
        reducedMotion={reducedMotion}
        cameraView={cameraView}
        spectator={spectator}
        viewPress={viewPress}
        glInfo={glInfo}
        primeRef={primeRef}
        loopRef={loopRef}
        audio={audio}
      />

      <CameraRig clamps={spectator ? SPECTATOR_CLAMPS : ORBIT_CLAMPS} />
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

/**
 * The figure file and the model manifest (report 13 §3.2, §9.2), validated at
 * import, exactly as {@link useCueData} validates the cue file and for the same
 * reason: **a broken entry is dropped and the ladder falls through**, so an
 * art-direction file can never stop the renderer. The complaints go to the
 * console and to `web/test/models-data.test.ts`, which fails on them.
 *
 * `figures.json` is validated **against** `models.json`: a spec naming a model
 * the manifest does not define is dropped, and dropping it is what makes that
 * card fall through to the disc rather than to a figure that can never load.
 */
function useFigureData(): { figures: FigureData; models: ModelData } {
  return useMemo(() => {
    const modelResult = validateModels(modelsJson);
    for (const problem of modelResult.errors) {
      console.warn(`[arena] models.json ${problem.where}: ${problem.message} — entry dropped`);
    }
    const modelIds = new Set(Object.keys(modelResult.data.models));
    const figureResult = validateFigures(figuresJson, { modelIds });
    for (const problem of figureResult.errors) {
      console.warn(`[arena] figures.json ${problem.where}: ${problem.message} — entry dropped`);
    }
    return {
      figures: { ...EMPTY_FIGURE_DATA, ...figureResult.data },
      models: { ...EMPTY_MODEL_DATA, ...modelResult.data },
    };
  }, []);
}

/**
 * **T13 — who stands for each seat** (`figures/duelists.json`), validated at
 * import like the cue and figure files, and for the same reason: a broken look is
 * dropped and its seat draws the silhouette bust, so an art-direction file can
 * never stop the renderer. `web/test/duelists.test.ts` fails on any error.
 */
function useDuelistData(): DuelistData {
  return useMemo(() => {
    const { data, errors } = validateDuelists(duelistsJson);
    for (const problem of errors) {
      console.warn(`[arena] duelists.json ${problem.where}: ${problem.message} — entry dropped`);
    }
    return data;
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
  bloom = null,
  follow = null,
  lookQuery = null,
  caption = null,
  onCaptionShown = null,
}: ArenaProps): JSX.Element {
  /** The look, parsed once from the flags `main.tsx` kept (D137). */
  const look = useMemo<LookSpec>(() => (lookQuery === null ? DEFAULT_LOOK : lookFromSearch(lookQuery)), [lookQuery]);
  const [hoverId, setHoverId] = useState<number | null>(null);
  /**
   * **D241 — the card `I` and the inspect chip would open**: the one under the
   * pointer, else the last one clicked, else the last one pointed at (so the
   * pointer can travel from a card to the chip). View notes, like the hover:
   * nothing here reaches an act, and `arena/inspect.ts`'s planner gates every one
   * face up before a name is read.
   */
  const [clickedId, setClickedId] = useState<number | null>(null);
  const [pointedId, setPointedId] = useState<number | null>(null);
  const onHover = useCallback((cardId: number | null) => {
    setHoverId(cardId);
    if (cardId !== null) setPointedId(cardId);
  }, []);
  const [hotkeysOpen, setHotkeysOpen] = useState(false);
  /**
   * **D256 — the caption strip, on or off.** Presentation state like bloom:
   * `N`, the cue strip's checkbox and the stored choice for this context —
   * watching (a replay, a followed recording) or a live seat — whose defaults
   * are on and off. `main.tsx` is told, so it narrates only while it is on.
   */
  const captionContext = captionContextOf(onAct !== null);
  const [captionOn, setCaptionOn] = useState<boolean>(() => readStoredCaption(captionContext));
  const captionRef = useRef({ on: captionOn, context: captionContext });
  captionRef.current = { on: captionOn, context: captionContext };
  useEffect(() => {
    setCaptionOn(readStoredCaption(captionContext));
  }, [captionContext]);
  const setCaption = useCallback((on: boolean) => {
    setCaptionOn(on);
    storeCaption(captionRef.current.context, on);
  }, []);
  const toggleCaption = useCallback(() => {
    setCaption(!captionRef.current.on);
  }, [setCaption]);
  useEffect(() => {
    onCaptionShown?.(captionOn);
  }, [captionOn, onCaptionShown]);
  /**
   * **User decision 6's toggle.** The URL flag (`?bloom=1` / `?bloom=0`) sets where
   * it starts and {@link BLOOM_DEFAULT} — a measurement — is where it starts when the
   * URL says nothing; the checkbox in the cue controls flips it for this page. It
   * is presentation state like the cue speed, so it lives here and nowhere else.
   */
  const [bloomOn, setBloomOn] = useState<boolean>(bloom ?? BLOOM_DEFAULT);
  /**
   * **The ink line** (D139, D146) — on under the comic look while bloom is (it
   * rides bloom's composer: `wantsInkPass`; `?ink=always` draws it without bloom,
   * `?ink=none` never), and off with bloom on the governor's rung below the floor
   * (`perf.ts`'s `postOnFloor`). One composer, so a slow machine sheds both.
   */
  const [inkOn, setInkOn] = useState<boolean>(true);
  const inkPass = inkOn && wantsInkPass(look, bloomOn);
  /** The cue strip's bloom checkbox: ticking it back on brings the ink the floor rung shed with it. */
  const onBloom = useCallback((on: boolean) => {
    setBloomOn(on);
    if (on) setInkOn(true);
  }, []);
  /**
   * **The comic motion lane's two switches** (`cues/motion.ts`; D149,
   * D152): `?fx=classic|comic` and `?twos=0|1`, read once — where they
   * START. The cue strip's two checkboxes then flip them on the queue itself,
   * which is presentation state like its speed.
   */
  const motion = useMemo<MotionFlags>(() => {
    try {
      return motionFromSearch(window.location.search);
    } catch {
      return DEFAULT_MOTION;
    }
  }, []);
  /** T7's program warm-up counter — see `EffectPool.prime`. Two frames at mount. */
  const primeRef = useRef(2);
  /**
   * **The loop mode `<Canvas>` is rendered with** — `CueRunner` writes it, the
   * `frameloop` prop reads it (slice-2 verification fix; `CueRunner.tsx`'s
   * `Frameloop` says why a literal froze running cues). Read during render on
   * purpose: it is what the loop IS, so a re-render re-states it.
   *
   * **And a write re-renders `Arena`** (the workshop's finding, reproduced here
   * before this fix — docs/evidence/workshop.md). fiber re-applies the prop on
   * every render of `<Canvas>`, INCLUDING the ones `<Canvas>` makes on its own
   * when its container is resized, with the props of `Arena`'s LAST render — so a
   * plain ref read at render was only as fresh as that render. Measured on the
   * GTX 1080 at `g1`@100: a viewport resize 80 ms into a batch put the loop back
   * to the `demand` of the render before the enqueue and the cues froze (0 frames
   * in 700 ms, two steps stuck at 503 ms); a resize after a batch had drained put
   * back that batch's `always`, and the idle table drew 756 frames in 700 ms. So
   * the ref is backed by state: every mode `CueRunner` decides re-renders `Arena`
   * once (a same-mode write is React's no-op), and the prop is always the mode.
   */
  const [, setLoopMode] = useState<Frameloop>('demand');
  const loopRef = useMemo(() => {
    let mode: Frameloop = 'demand';
    return {
      get current(): Frameloop {
        return mode;
      },
      set current(next: Frameloop) {
        mode = next;
        setLoopMode(next);
      },
    };
  }, []);
  /**
   * The composer renders into its own target, which is a second set of program
   * variants: warm them too when it mounts. **Stable**, because `Post` runs its
   * mount effect on this identity and an inline arrow would re-prime every render.
   */
  const primeForComposer = useCallback(() => {
    primeRef.current = 2;
  }, []);
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
  /**
   * **D250/D251 — the arena's sound.** One audio module for the page
   * (`sharedAudio`), muted until the viewer turns it on — the cue strip's
   * checkbox or `M`, each a user gesture, which is what lets `unlock()` create
   * the page's `AudioContext` right there. The choice is kept in this browser;
   * a choice of ON from an earlier visit waits for the first pointer or key press
   * on the page, because a browser starts no sound before a gesture.
   */
  const audio = useMemo(() => sharedAudio(loadAssetBytes), []);
  const [soundChoice, setSoundChoice] = useState<SoundChoice>(readSoundChoice);
  const soundEnabled = soundOn(soundChoice, reducedMotion);
  useEffect(() => {
    audio.setEnabled(soundEnabled);
  }, [audio, soundEnabled]);
  useEffect(() => {
    if (!soundEnabled || audio.unlocked) return;
    const unlock = (): void => {
      audio.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [audio, soundEnabled]);
  // Leaving the arena — `V`, the workshop, another page — leaves nothing ringing.
  useEffect(() => () => audio.stopAll(), [audio]);
  /** The checkbox and `M`: always called from inside the gesture, so `unlock()` may start the context. */
  const setSound = useCallback(
    (on: boolean): void => {
      setSoundChoice(on ? 'on' : 'off');
      storeSoundChoice(on ? 'on' : 'off');
      if (on) audio.unlock();
      audio.setEnabled(on);
    },
    [audio],
  );
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;
  const toggleSound = useCallback((): void => {
    const next = !soundRef.current;
    setSound(next);
    setHint(next ? 'sound on — M to mute' : 'sound off — M to turn it on');
  }, [setSound]);
  const data = useCueData();
  const figureData = useFigureData();
  const duelistData = useDuelistData();
  // §5.1's one exception: `presence` is a LAYOUT rule, so it goes in here and
  // not into the queue. That is what makes the Helicarrier survive `skip all`.
  const placed = useMemo(() => layout(state, data.presence ?? {}), [state, data]);
  /**
   * §3.8 — the manifestation stage, over the layout that is already computed.
   *
   * It takes `state.board.combat` and not the `blockers` event, because
   * `state.combat` is the authority on who blocked what (amendment **M7**): an
   * unblocked attacker arrives as its own blocker, and a pose derived from the
   * event would have to un-derive that.
   */
  /**
   * **T6's combat freeze is a pose** (report 13 §6.4): a stack during a combat
   * phase, measured at **66 of the corpus's 3,679 board frames (1.8%)**. It is
   * computed from the snapshot by `combatFreeze` and passed in, because
   * `figurePose` takes a `Layout` rather than a `ClientState` and a phase name is
   * not a coordinate.
   */
  const frozen = useMemo(() => combatFreeze(state.board), [state.board]);
  // Lane BODIES (D160, switched on at its merge — D164): the ART RUNG. Each
  // face-up card's own painting, read once per card name off the hot path by
  // `art.ts` (an idle callback, cached for the page); `paletteNamesOf` is the only
  // source of names, so a back or a redacted stub is never looked up (hard rule
  // 8), and the hook hands back a NEW map only when a palette arrives — so the
  // poses below recompute once per arrival, at commit, never in the frame loop.
  const paletteNames = useMemo(() => paletteNamesOf(placed), [placed]);
  const palettes = useArtPalettes(paletteNames, art);
  const basePoses = useMemo(
    () =>
      figurePose(placed, state.board?.combat ?? null, figureData.figures, {
        frozen,
        // T7's width clamp needs the model's measured width/height ratio, and the
        // manifest is where the asset pipeline put it. Without it a pose is exactly
        // T1's — a square figure — which is the fallback a checkout with no
        // manifest gets.
        models: figureData.models,
        palettes,
      }),
    [placed, state.board?.combat, figureData, frozen, palettes],
  );
  /**
   * **The personal tier** (phase 2, D194, D195; the tier is D190): the dev
   * route's index (DEV only — a build asks for nothing), THE lookup of each
   * face-up named figure's card in it (`personalChoicesOf`, hard rule 8's renderer
   * half), the models those choices and the seats want, and the dressed poses —
   * a figure is dressed only once its model has loaded, so a failure is the CC0
   * figure. `?personal=0` draws the CC0 figures for an A/B.
   */
  const personalOn = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('personal') !== '0';
    } catch {
      return true;
    }
  }, []);
  const personalOverlay = usePersonalOverlay(personalOn);
  const personalChoices = useMemo(() => personalChoicesOf(placed, basePoses, personalOverlay), [placed, basePoses, personalOverlay]);
  const personal = usePersonalModels(personalOverlay, personalChoices);
  const personalPoses = useMemo(() => dressPoses(basePoses, personalChoices, personal.fits), [basePoses, personalChoices, personal.fits]);
  /**
   * **The portrait standee** (D260–D264; the personal tier's second renderer
   * path, dev server only): a face-up creature no personal model has taken, whose
   * painting the relief cache has cut, stands as its painting's near subjects
   * where its CC0 body would. THE lookup (`standeeChoicesOf`, hard rule 8's
   * renderer half for this surface: the pose's and the placement's gates, then
   * CardPlane's own art lookup, then the relief index) over the personal-dressed
   * poses; a standee dresses a pose only once its textures have loaded, so a
   * failure is the CC0 figure. `?standee=0` — or the tier off, `?personal=0` —
   * draws the CC0 figures for the A/B; a build has no route and stands none.
   * The legibility floor is judged on THIS canvas (D261, fix pass 2), whose size
   * `CanvasSizeReport` hands over at commit: `null` until it has one, and then
   * nothing stands.
   */
  const standeeOn = useMemo(() => {
    try {
      return personalOn && new URLSearchParams(window.location.search).get('standee') !== '0';
    } catch {
      return personalOn;
    }
  }, [personalOn]);
  const relief = useReliefIndex(standeeOn);
  const [canvasPx, setCanvasPx] = useState<StandeeCanvas | null>(null);
  const onCanvasSize = useCallback((width: number, height: number): void => {
    if (!(width > 0 && height > 0)) return;
    setCanvasPx((was) => (was !== null && was[0] === width && was[1] === height ? was : [width, height]));
  }, []);
  const standeeAnswer = useMemo(
    () =>
      standeeChoicesOf(placed, personalPoses, art, relief, {
        base: standeeOn ? RELIEF_BASE : null,
        taken: personalChoices,
        canvas: canvasPx,
      }),
    [placed, personalPoses, art, relief, standeeOn, personalChoices, canvasPx],
  );
  // A resize asks the floor again at commit; while its answer is the same, the
  // SAME map goes on (this memo is keyed by what the answer IS, not by the
  // canvas), so a drag of the window's edge re-dresses no figure on every step.
  const standeeAnswerKey = standeeChoicesKeyOf(standeeAnswer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const standeeChoices = useMemo(() => standeeAnswer, [standeeAnswerKey, placed, personalPoses, art, relief, standeeOn, personalChoices]);
  const standees = useStandees(standeeChoices);
  const figures = useMemo(() => dressStandees(personalPoses, standeeChoices, standees.fits), [personalPoses, standeeChoices, standees.fits]);
  /**
   * **The status layer** (D210): every creature's strip — keyword icons, the bar,
   * pips and marks — a pure function of this frame's layout and poses, handed to
   * `FigureLayer`, which commits it into one instanced field once per snapshot.
   * It reads the DRESSED poses, so a personal model's strip stands over that
   * model's own refitted height; `strippable` gates on the pose and the
   * placement, never on which model the figure wears.
   */
  const strips = useMemo(() => statusLayout(placed, figures), [placed, figures]);
  /**
   * T4 — **the terrain, and the casting anchor**, both pure functions of the
   * frame on screen (report 13 §5.1, §5.4). Every one of the three survives
   * `skip all`, a backwards scrub and a `resync`, because none of them is
   * derived from a history.
   */
  const tiles = useMemo(
    () => tilePose(placed, tileDataOf(figureData.figures), palettes),
    [placed, figureData, palettes],
  );
  const seatOfPlayer = useCallback(
    (playerId: number): 'you' | 'opp' =>
      placed.viewerId === null || playerId === placed.viewerId ? 'you' : 'opp',
    [placed.viewerId],
  );
  const motes = useMemo(
    () => manaMotes(state.board, seatOfPlayer),
    [state.board, seatOfPlayer],
  );
  const forms = useMemo(() => {
    // §3.3: a spell on the stack lives in `state.stackCards`, **never** in
    // `players[].zones` — the stack is not one of the six zones a player carries.
    const sourceOf = (cardId: number | null): AnyCard | null =>
      cardId === null ? null : (state.board?.stackCards.find((c) => c.id === cardId) ?? null);
    return spellForms(
      state.board,
      seatOfPlayer,
      (cardId) => {
        // The form takes the source card's colour identity through the arena's
        // one colour table. A `null` source or a card this seat may not see is
        // colourless, which is the honest answer rather than a guess.
        const cost = (sourceOf(cardId) as { manaCost?: string | null } | null)?.manaCost ?? null;
        return colourHex(colourIdOf(cost));
      },
      // §6.2's form ladder reads the source card's own type line, through
      // `cues/archetype.ts`'s `primaryTypeOf` — the app's one definition of it.
      sourceOf,
    );
  }, [state.board, seatOfPlayer]);
  /**
   * **T7's duelists** (report 13 §7; user decision 8). A pose like every other:
   * two seats, read from the snapshot, with no rig and no clip.
   */
  const busts = useMemo(
    () => duelistBusts(state.board, seatOfPlayer),
    [state.board, seatOfPlayer],
  );
  /**
   * **T13's duelists** — the busts' seats with a body, a stand point, a facing
   * and the stance `board.gameOver` gives them. A pose, like every other: two
   * seats, no history, no name.
   */
  const duelists = useMemo(
    () => duelistPoses(state.board, seatOfPlayer, duelistData),
    [state.board, seatOfPlayer, duelistData],
  );
  const hovered = useMemo(
    () => placed.placements.find((p) => p.cardId === hoverId) ?? null,
    [placed, hoverId],
  );
  /** D241: what `I` and the chip would inspect — THE planner, fed the card and its figure. */
  const inspectTarget = useMemo((): InspectTarget => {
    const id = hoverId ?? clickedId ?? pointedId;
    const placement = id === null ? null : (placed.placements.find((p) => p.cardId === id) ?? null);
    return inspectTargetOf(placement, placement === null ? undefined : figures.get(placement.cardId));
  }, [placed, figures, hoverId, clickedId, pointedId]);
  const waiting = useMemo(() => awaitingHuman(state), [state]);

  // The three objects that outlive every frame, and every one of them is
  // presentation: a ref map of meshes, the stage that collects offsets, and the
  // pool of effect primitives. None of them holds a card, a name or an id from
  // a frame that has gone (P5).
  const rigs = useRef<RigMap>(new Map()).current;
  const figureRigs = useRef<FigureRigMap>(new Map()).current;
  const stage = useMemo(() => new SceneStage(placed), []); // eslint-disable-line react-hooks/exhaustive-deps
  const pool = useMemo(() => new EffectPool(), []);
  const discs = useMemo(() => new DiscField(), []);
  /** T4's two fields. Both are pools of instanced meshes and hold no card (P5). */
  const tileField = useMemo(() => new TileField(), []);
  const castingField = useMemo(() => new CastingField(), []);
  /** T5's. A pose layer with its own budget, never the cue engine's eight slots. */
  const overlays = useMemo(() => new OverlayField(), []);
  /** T7's. One instanced mesh for both seats, and it holds no card (P5). */
  const bustField = useMemo(() => new BustField(), []);
  /**
   * §8's camera lane. One per arena, and like the queue it is *presentation*:
   * it holds a home pose and at most one live move, and `flushAndSnap()` resets
   * it with everything else.
   */
  const director = useMemo(() => new CameraDirector(), []);

  /**
   * **T8 — the camera views** (`camera.ts`'s `VIEWS`, keys `1`–`6`, the
   * switcher in the layer).
   *
   * Three pieces of state, all presentation, none of them the game's:
   *
   *  - **the choice** — what the viewer asked for, kept in this browser
   *    (`localStorage`, try/catch, the table when nothing is stored);
   *  - **spectator mode** — derived, not stored: ON by itself in a replay AND
   *    the moment a live game ends (verification fix: it used to wait for `O`,
   *    so the views the summary said "come back" stayed greyed), never while a
   *    seat is live (a seat's hand has to stay on screen, §8 rule 6), and `O`
   *    flips it whenever it is allowed. The flip is forgotten when the next game
   *    starts, so every finished game opens as a spectator's;
   *  - **the view on screen** — the choice if this mode allows it, else the
   *    table. A view that cannot keep the hand is greyed at a live seat and
   *    comes back the moment the game ends; the choice is not forgotten.
   *
   * `viewPress` counts presses so that pressing the view you are on is a
   * command (drop your orbit of it), and `shotView` is the auto director's
   * current shot, for the switcher to name.
   */
  const [cameraChoice, setCameraChoice] = useState<CameraChoice>(readStoredView);
  const [spectatorPref, setSpectatorPref] = useState<boolean | null>(null);
  const [viewPress, setViewPress] = useState(0);
  const [shotView, setShotView] = useState<ViewId>('table');
  const seatLive = onAct !== null && state.gameOver === null;
  const spectatorAllowed = !seatLive;
  // A replay, or a live seat whose game is over: nobody is waiting to click.
  const spectator = spectatorAllowed && (spectatorPref ?? true);
  // `O` pressed after one game says nothing about the next: a seat that goes
  // live again drops the flip, so the next game's end opens as a spectator's too.
  useEffect(() => {
    if (seatLive) setSpectatorPref(null);
  }, [seatLive]);
  const cameraView = effectiveView(cameraChoice, spectator);
  const cameraRef = useRef({ spectator, spectatorAllowed });
  cameraRef.current = { spectator, spectatorAllowed };

  const chooseView = useCallback((choice: CameraChoice): void => {
    const { spectator: spectating, spectatorAllowed: allowed } = cameraRef.current;
    if (!viewAvailable(choice, spectating)) {
      const what =
        choice === 'director'
          ? 'the director is spectator-only — it moves the camera by itself'
          : `${VIEW_BY_ID[choice].label} is spectator-only — your hand is off screen from there (§8 rule 6)`;
      setHint(allowed ? `${what}: press O` : `${what}: back in a replay or when this game ends`);
      return;
    }
    setHint(null);
    setCameraChoice(choice);
    storeView(choice);
    if (choice === 'director') setShotView('table');
    setViewPress((n) => n + 1);
  }, []);

  const toggleSpectator = useCallback((): void => {
    const { spectator: spectating, spectatorAllowed: allowed } = cameraRef.current;
    if (!allowed) {
      setHint('spectator mode is for replays and finished games — never while your seat is live (§8 rule 6)');
      return;
    }
    setHint(null);
    setSpectatorPref(!spectating);
  }, []);

  const viewItems = useMemo(
    (): ViewSwitcherItem[] => [
      ...VIEWS.map((view) => ({
        id: view.id,
        key: view.key,
        label: view.label,
        what: view.what,
        available: viewAvailable(view.id, spectator),
      })),
      {
        id: 'director',
        key: '6',
        label: 'Director',
        what: 'cuts between the five views on the game’s own events — combat side-on, a spell from its caster’s shoulder, a strike from its target’s side, a new turn wide',
        available: viewAvailable('director', spectator),
      },
    ],
    [spectator],
  );
  const queue = useMemo(
    () =>
      new CueQueue({
        stage,
        registry: REGISTRY,
        data,
        mode,
        reducedMotion,
        comic: motion.comic,
        onTwos: motion.twos,
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
  useEffect(() => () => discs.dispose(), [discs]);
  useEffect(() => () => tileField.dispose(), [tileField]);
  useEffect(() => () => castingField.dispose(), [castingField]);
  useEffect(() => () => overlays.dispose(), [overlays]);
  useEffect(() => () => bustField.dispose(), [bustField]);

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
    handle.__mtgArena = {
      ...(handle.__mtgArena ?? {}),
      queue,
      stage,
      pool,
      rigs,
      director,
      figureRigs,
      discs,
      // Tier 2's half of the tuning loop: the poses of the frame on screen,
      // which is what "which archetype is standing where" is read out of.
      figures,
      figureData,
      // T4's: the terrain and the casting anchor. `tileField.counts()` and
      // `castingField.counts()` are how the draw-call claims in
      // `docs/evidence/m7-tier2.md` are read out of a real frame.
      tiles,
      tileField,
      motes,
      forms,
      castingField,
      // T5's overlays and T6's freeze: `overlays.counts()` and `frozen` are how
      // the evidence document's numbers are read out of a real frame.
      overlays,
      frozen,
      busts,
      bustField,
      // T13: the duelists' poses (no name — a seat, a stand point, a stance).
      duelists,
      // T6's synthetic-event loop: the corpus has 0 fizzles, so the evidence for
      // `resolved.fizzle` is a hand-built event enqueued against the frame on
      // screen — `queue.enqueueBatch([...], state)` needs the `ClientState` the
      // ladder reads its subject from. DEV only, like everything on this handle.
      state,
      // D250: the sound renderer — `audio.stats` (requested / played / dropped /
      // silenced / cuts) and `audio.describe()` (the context's state, the voices,
      // the decoded clips) are how the evidence counted the sounds per batch.
      audio,
    };
  }, [
    state,
    audio,
    queue,
    stage,
    pool,
    rigs,
    director,
    figureRigs,
    discs,
    figures,
    figureData,
    tiles,
    tileField,
    motes,
    forms,
    castingField,
    overlays,
    frozen,
    busts,
    bustField,
    duelists,
  ]);

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
    // T8: this renderer has a camera, so `1`–`6` and `O` mean something here.
    arena: true,
    // D241: the card `I` would inspect, or why there is none.
    inspect: inspectContextOf(inspectTarget),
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
          } else if (plan.id === 'toggleCaption') {
            // D256: the caption strip — a picture control, sends nothing.
            toggleCaption();
          } else {
            // `Z`/`S`/`C`/`L` open board panels that have no 3D surface. **Say
            // so.** A key the `?` overlay lists, `planKey` consumed (so
            // `preventDefault` has already run) and the handler then drops is
            // the same silent swallow that made `V` dead on the board.
            setHint(`${resolved.binding.chord} opens a board panel — press V`);
          }
          return;
        // **T8 — the camera.** Local, sends nothing, legal on a replay; whether
        // a view may be used at a live seat is `chooseView`'s to say.
        case 'camera':
          chooseView(plan.choice);
          return;
        case 'spectator':
          toggleSpectator();
          return;
        // **D251 — the sound.** Local, sends nothing, legal on a replay; the key
        // press is the gesture that lets the page start its audio.
        case 'sound':
          toggleSound();
          return;
        // **D241 — inspect from the table.** Navigation to the workshop's
        // inspect view, and nothing else: no act, whatever the seat.
        case 'inspect':
          openInspect(plan.href);
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
  }, [onAct, onAnswer, onSetView, queue, director, state.ask, chooseView, toggleSpectator, toggleSound, toggleCaption]);

  // -- batch intake (§2.3) ---------------------------------------------------
  //
  // The arena consumes batches with no subscription of its own: it watches the
  // `ClientState` it is handed and asks `intakeFor` whether the stream moved on
  // or jumped. A jump is `flushAndSnap()`, and because offsets are transient the
  // scene is then exactly `layout(state)` — which is why scrubbing backwards
  // through a replay is correct by construction rather than by special case.
  const cursor = useRef<StreamCursor>({ eventSeq: -1, framesApplied: -1, gameId: null });
  /**
   * **The board of the last frame the intake saw** — T6's strike needs the other
   * end of the transition a batch describes (`cues/resolve.ts`'s `strikeParams`:
   * a `resolved` event names no target, and the frame before it does).
   *
   * It is replaced on every frame and read only by the next `enqueueBatch`, so it
   * is one frame of look-behind and not a history: a flush hands the planner
   * nothing, which is the snap a flush already is.
   */
  const previousBoard = useRef<ClientState['board']>(null);
  /**
   * **A LAYOUT effect, and the order is load-bearing** (T8 fix, **D64**). A
   * creature that dies leaves the snapshot's figures, and `FigureLayer` holds its
   * body at commit; the body's fate is decided on its first frame by asking the
   * queue whether a death cue for it is queued (`CueQueue.deathPending`). So this
   * batch must be in the queue before that frame. The scene is a SEPARATE React
   * root (`<Canvas>`'s reconciler, with its own scheduler): `<Canvas>`'s own layout
   * effect only *schedules* that root's render, and a passive effect here could
   * run after it — measured orderings are not guarantees. A layout effect runs
   * inside this root's commit, before anything the canvas root can do, so the
   * batch is always enqueued before the body it decides exists. (`liveness.test.ts`
   * holds the effect to this.)
   */
  useLayoutEffect(() => {
    const next = cursorOf(state);
    const action = intakeFor(cursor.current, next);
    cursor.current = next;
    const previous = previousBoard.current;
    previousBoard.current = state.board;
    /**
     * **T8 — the auto director reads the same batch the queue does**, at the
     * same moment, so a cut lands on the beat its cues play. An empty batch is
     * fed too: a beat held back by the minimum shot length is taken on the next
     * frame that arrives after the shot has run.
     */
    const feedDirector = (beats: Parameters<typeof director.direct>[0]): void => {
      if (director.view !== 'director') return;
      const now = typeof performance === 'undefined' ? Date.now() : performance.now();
      if (director.direct(beats, now) && director.shot !== null) setShotView(director.shot.view);
    };
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
      feedDirector([]);
      return;
    }
    queue.enqueueBatch(state.events, state, undefined, previous);
    if (director.view === 'director') {
      feedDirector(beatsOf(state.events, lookupFor(state.board, previous, viewerIdOf(state))));
    }
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
        // `alpha: false` (D146): the scene always paints an opaque background, and
        // a painted figure writes alpha 0 as the ink's mark (`figureMaterial.ts`'s
        // `markPainted`) — an opaque canvas never lets the page show through it
        // on a frame drawn without the composer.
        gl={{ antialias: true, alpha: false }}
        // The scene is unlit (§4.3), so there is nothing for tone mapping to do
        // except shift the card art away from what Scryfall drew.
        flat
        // §5.4 — start on demand. `CueRunner` switches to `always` the moment
        // the queue has something to play and back when it drains — and it is
        // a REF, never a literal: fiber re-applies this prop on every render of
        // `Arena`, so a literal `demand` froze a running batch whenever a hint or
        // a same-view key press re-rendered it (`CueRunner.tsx`'s `Frameloop`).
        frameloop={loopRef.current}
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
            onFloor={() => {
              const drop = postOnFloor(bloomOn, inkPass);
              if (drop === null) return false;
              setBloomOn(drop.bloom);
              setInkOn(drop.ink);
              console.info(
                '[arena] frames still late at the lowest render resolution — bloom and the ink line turned off (tick bloom in the cue controls to bring it back)',
              );
              return true;
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
        {/* The standee's legibility floor measures on this canvas (D261, fix pass 2). */}
        <CanvasSizeReport onSize={onCanvasSize} />
        <Scene
          state={state}
          placed={placed}
          art={art}
          onAct={onAct}
          showGrid={showGrid}
          onHover={onHover}
          onPicked={setClickedId}
          queue={queue}
          stage={stage}
          pool={pool}
          rigs={rigs}
          figures={figures}
          strips={strips}
          figureRigs={figureRigs}
          discs={discs}
          tiles={tiles}
          tileField={tileField}
          motes={motes}
          forms={forms}
          castingField={castingField}
          overlays={overlays}
          busts={busts}
          bustField={bustField}
          duelists={duelists}
          duelistData={duelistData}
          models={figureData.models}
          director={director}
          waiting={waiting}
          mode={mode}
          reducedMotion={reducedMotion}
          cameraView={cameraView}
          spectator={spectator}
          viewPress={viewPress}
          glInfo={glInfo}
          primeRef={primeRef}
          loopRef={loopRef}
          look={look}
          composer={bloomOn || inkPass}
          personal={personal}
          standees={standees}
          audio={audio}
        />
        {/* **The one post pass** (user decision 6, `scene/Post.tsx`), and three
            things about this line are deliberate. It is **last inside the
            `<Canvas>`**, because `<EffectComposer>` takes over the render loop
            from fiber and anything mounted after it would draw into a target
            nothing presents. It is **lazy**, so a table with bloom off never
            downloads the 16.6 kB gzip of `postprocessing` — the same argument
            **D49** makes for the whole arena chunk, one level in. And whether it
            starts on is a measurement, not a preference (`perf.ts`'s
            BLOOM_DEFAULT; the governor's `onFloor` drops it on a slow machine). */}
        {(bloomOn || inkPass) && (
          <Suspense fallback={null}>
            <Post onMount={primeForComposer} bloom={bloomOn} ink={inkPass} />
          </Suspense>
        )}
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
          follow={follow}
        />
        {/* **One row for the cue strip and the camera switcher** (slice-2
            verification fix): the switcher had added a fourth row of chrome to
            this column, over the opponent's bust (Tier 2 follow-up 10); slice 1
            had three. The wrapper is layout only and stays `pointer-events:
            none` — each strip opts in on its own. */}
        <div className="arena__strips">
          <CueControls
            queue={queue}
            bloom={bloomOn}
            onBloom={onBloom}
            sound={soundEnabled}
            onSound={setSound}
            caption={captionOn}
            onCaption={setCaption}
          />
          {/* **T8's view switcher.** Its root class is in liveness.test.ts's table
              and carries `pointer-events: auto` in styles.css — this layer is
              `none`, and a widget that forgets is inert. */}
          <ViewSwitcher
            items={viewItems}
            active={cameraView}
            shot={cameraView === 'director' ? VIEW_BY_ID[shotView].label : null}
            spectator={spectator}
            spectatorAllowed={spectatorAllowed}
            onChoose={(id) => {
              if (isCameraChoice(id)) chooseView(id);
            }}
            onToggleSpectator={toggleSpectator}
          />
        </div>
        <ArtCredit art={art} placements={placed.placements} hovered={hovered} />
        {/* **D255 — the caption strip**, at the mount point the story page's
            follow-up 1 named: the narrator's moment for the frame on screen, as
            plain data from `main.tsx`. It sits over the table's right edge,
            between the seat plates (`.arena__caption`, D256); its root class is
            in liveness.test.ts's widget table and opts back into pointer events. */}
        {captionOn && <CaptionStrip caption={caption} />}
        {/* D241: the inspect chip — the hover surface's button (the arena has no
            card zoom), the same target as `I`, and inert with its reason for a
            face-down or hidden card. */}
        <InspectChip target={inspectTarget} />
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
function CueControls({
  queue,
  bloom,
  onBloom,
  sound,
  onSound,
  caption,
  onCaption,
}: {
  queue: CueQueue;
  bloom: boolean;
  onBloom: (on: boolean) => void;
  /** D251 — the arena's sound, and its switch (the same one `M` flips). */
  sound: boolean;
  onSound: (on: boolean) => void;
  /** D256: the caption strip's switch — presentation, like bloom; `N` flips the same one. */
  caption: boolean;
  onCaption: (on: boolean) => void;
}): JSX.Element {
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
      {/* User decision 6: bloom's default is a measurement (`perf.ts`'s
          BLOOM_DEFAULT — ON on this machine's GTX 1080), and this is the toggle
          that decision asks for. It is a renderer setting and reaches nothing but
          the post pass. */}
      <label title="The one post pass: the holographic layer glows. The DPR governor turns it off by itself on a machine that cannot afford it — see perf.ts">
        <input
          type="checkbox"
          checked={bloom}
          onChange={(event) => {
            onBloom(event.currentTarget.checked);
          }}
        />{' '}
        bloom
      </label>
      {/* **The comic motion lane's two switches** (D149, D152): the new vocabulary
          (bursts, lettering, splats, dots, speed lines, the ink summon, impact
          shakes) against the film as it was, and the stepped motion. Both are the
          QUEUE's settings — presentation, like its speed — and reach no act. */}
      <label title="Comic FX: impact stars and their lettering, ink splats, halftone dots, speed lines, the hologram-to-ink summon and impact shakes — off is the film as it was (?fx=classic)">
        <input
          type="checkbox"
          checked={queue.comic}
          onChange={(event) => {
            queue.setComic(event.currentTarget.checked);
          }}
        />{' '}
        comic FX
      </label>
      <label
        title={
          queue.reducedMotion
            ? 'On twos is off while reduced motion is on (§8 rule 7)'
            : 'Animate on twos: every cue stepped to twelve drawings a second, the comic’s stepped motion (?twos=0 to start without it)'
        }
      >
        <input
          type="checkbox"
          checked={queue.twosActive}
          disabled={queue.reducedMotion}
          onChange={(event) => {
            queue.setOnTwos(event.currentTarget.checked);
          }}
        />{' '}
        on twos
      </label>
      {/* **D250/D251 — sound.** Muted until ticked (or `M`); the tick is the
          gesture that lets the page start its audio, and the choice is kept in
          this browser. Presentation, like bloom: it reaches no act. */}
      <label title="Sound: the cues' clips — an arrival, an attack, a hit, a death, a spell resolving, the outcome, and a few S.H.I.E.L.D. cards' own. Muted until you tick it (M does the same); kept in this browser">
        <input
          type="checkbox"
          checked={sound}
          onChange={(event) => {
            onSound(event.currentTarget.checked);
          }}
        />{' '}
        sound
      </label>
      {/* **D256 — the caption**: the story's moment for the frame on screen,
          over the table's right edge. On by default while watching, off at a
          live seat; the choice is kept per context in this browser. */}
      <label title="Caption: the story's moment for the frame on screen, with the one or two before it — on by default in a replay and while spectating, off at a live seat (N)">
        <input
          type="checkbox"
          checked={caption}
          onChange={(event) => {
            onCaption(event.currentTarget.checked);
          }}
        />{' '}
        caption
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

/**
 * **D241 — open the workshop's inspect view**: the hash is the view (`useView`),
 * so this is a link followed, and the page's `?` query — the look, `?personal=`
 * — rides along untouched. The workshop's ▣ arena link comes back to the frame
 * this replay was on (`main.tsx`'s `replayCursors`); a live socket survives.
 */
function openInspect(href: string): void {
  window.location.hash = href;
}

/**
 * **The inspect chip** (D241): a link to the workshop's inspect view for the
 * card `I` would open — named, because it is face up and has a figure — or an
 * inert chip that says why not (nothing pointed at, no figure, or a face-down or
 * hidden card, which is never named). Its class is in `liveness.test.ts`'s layer
 * table and opts back into pointer events in `styles.css`.
 */
function InspectChip({ target }: { target: InspectTarget }): JSX.Element {
  if (target.kind === 'inspect') {
    return (
      <a
        className="arena__inspect"
        href={target.href}
        title={`Inspect ${target.name} in the workshop — its figure in front of its painting (I); the workshop's ▣ arena link comes back to this frame`}
      >
        ⌕ inspect <strong>{target.name}</strong> · I
      </a>
    );
  }
  return (
    <span className="arena__inspect arena__inspect--inert" title={target.why} aria-disabled="true">
      ⌕ inspect · I <span className="arena__inspect-why">{target.why}</span>
    </span>
  );
}

function nameOf(card: AnyCard): string | null {
  const name = (card as { name?: string }).name;
  return typeof name === 'string' && name !== '' ? name : null;
}
