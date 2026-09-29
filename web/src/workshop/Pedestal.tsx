/*
 * mtg-table — workshop/Pedestal.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The pedestal: the arena's scene, pointed at one card.**
 *
 * Everything drawn here is the arena's own: `CardPlane` for the card (THE card
 * renderer of the arena, M7 convention 2), `FigureLayer` for the body, its props
 * and its disc, the tile, casting, overlay and effect fields, and `CueRunner` —
 * THE frame loop — writing `layout(state) ⊕ offsets` and `figurePose ⊕ offsets`
 * and driving the clip lane from the queue's virtual clock. The pose inputs are
 * computed exactly as `Arena.tsx` computes them (`layout`, `combatFreeze`,
 * `figurePose`, `tilePose`, `manaMotes`, `spellForms`), over the synthetic board
 * `synthetic.ts` built.
 *
 * What is the workshop's, and why each is small:
 *
 *  - **the camera** — `framing.ts`'s close / table-distance / whole-table poses,
 *    and an `OrbitControls` that is NOT `makeDefault`, so `CueRunner` never sees it
 *    and never applies the arena's camera views to it; the director it is handed
 *    is {@link PedestalDirector}, which takes no move (a camera cue's request is
 *    dropped: the pedestal's camera is the user's);
 *  - **the facing preview** — `facing.ts`'s `turnPoses` on the pose map;
 *  - **the split view** — {@link PedestalRenderer}, the workshop's one `useFrame`,
 *    at priority 1 so it runs after `CueRunner` (priority 0) has posed everything:
 *    it renders the scene once, or twice into the two halves of the canvas with a
 *    second camera, and allocates nothing.
 *
 * No `HitProxy` is mounted: the pedestal takes no click, so nothing here can reach
 * an act (there is no `onAct` to reach).
 */

import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import type { ArtIndex } from '../art.ts';
import type { AnyCard } from '../protocol.ts';
import type { ClientState } from '../reduce.ts';
import { CAMERA, CameraDirector, REST_POSE, type CameraFrame, type RequestOutcome } from '../arena/camera.ts';
import { paletteNamesOf, useArtPalettes } from '../arena/art.ts';
import { colourHex, colourIdOf } from '../arena/colour.ts';
import type { CueQueue } from '../arena/cues/queue.ts';
import type { CueData } from '../arena/cues/types.ts';
import { combatFreeze, manaMotes, spellForms } from '../arena/figures/casting.ts';
import type { DuelistBust } from '../arena/figures/duelists.ts';
import { figurePose } from '../arena/figures/pose.ts';
import { statusLayout } from '../arena/figures/status.ts';
import { tilePose } from '../arena/figures/tiles.ts';
import type { TraitData } from '../arena/figures/traits.ts';
import { tileDataOf, type FigureData, type ModelData } from '../arena/figures/types.ts';
import { layout } from '../arena/layout.ts';
import {
  COMIC,
  DEFAULT_LOOK,
  HOLO_BACKGROUND,
  combatStageOf,
  stageColoursOf,
  stageIdentitiesOf,
  wantsInkPass,
  wantsStage,
  type LookSpec,
} from '../arena/look.ts';
import { BustField } from '../arena/scene/busts.ts';
import { CardPlane } from '../arena/scene/CardPlane.tsx';
import { CastingField } from '../arena/scene/casting.ts';
import type { ArenaAudio } from '../arena/scene/audio.ts';
import { CueRunner, type Frameloop } from '../arena/scene/CueRunner.tsx';
import { DiscField } from '../arena/scene/discs.ts';
import { EffectPool } from '../arena/scene/effects.ts';
import type { FigureRigMap } from '../arena/scene/figureRigs.ts';
import { FigureLayer } from '../arena/scene/FigureLayer.tsx';
import { OverlayField } from '../arena/scene/overlays.ts';
import type { RigMap } from '../arena/scene/rigs.ts';
import { Table } from '../arena/scene/Table.tsx';
import { TileField } from '../arena/scene/tiles.ts';
import { EMPTY_PERSONAL, dressPoses, personalChoicesOf, type PersonalOverlay } from '../arena/personal.ts';
import { NO_PERSONAL_LOADED, type PersonalLoaded } from '../arena/scene/personalModels.ts';
import { useCardTexture } from '../arena/scene/useCardTexture.ts';
import { NO_STANDEES, useDepthTexture, type StandeesLoaded } from '../arena/scene/reliefCache.ts';
import { EMPTY_RELIEF, type ReliefIndex } from '../arena/relief.ts';
import { dressStandees, standeeChoicesOf } from '../arena/standee.ts';
import { RELIEF_CLIFF, RELIEF_GRID } from '../arena/perf.ts';
import { turnPoses, type PreviewStage } from './facing.ts';
import { ART_BOX, poseFor, type CameraMode, type Framing, type Panel } from './framing.ts';
import {
  RELIEF_FRAGMENT,
  RELIEF_VERTEX,
  backBoxes,
  frontBoxes,
  windowClipOf,
  type InspectPlan,
  type LayerBoxes,
} from './relief.ts';

/** The one post pass, lazily — the arena's own `Post`, in the arena's own chunk. */
const Post = lazy(() => import('../arena/scene/Post.tsx').then((module) => ({ default: module.Post })));

const IDLE_FRAME: CameraFrame = Object.freeze({ pose: null, shake: [0, 0, 0], holding: false }) as CameraFrame;

/**
 * **The arena's director, with nothing to direct.** `CueRunner` asks it for a
 * camera every frame; on the pedestal the camera belongs to the orbit controls
 * and `framing.ts`, so every view is `none`, every cue's request is dropped and
 * every frame is "leave the camera alone". The row in the action panel says when
 * a cue would have moved the camera.
 */
export class PedestalDirector extends CameraDirector {
  override applyView(): 'moved' | 'reset' | 'none' {
    return 'none';
  }
  override request(): RequestOutcome {
    return 'dropped';
  }
  override tick(): CameraFrame {
    return IDLE_FRAME;
  }
}

const NO_BUSTS: DuelistBust[] = [];

/** The pedestal's standee (D260): where it looks a card up, the dev route's prefix, and what has loaded. */
export interface PedestalStandee {
  relief: ReliefIndex;
  base: string | null;
  loaded: StandeesLoaded;
}

const NO_PEDESTAL_STANDEE: PedestalStandee = Object.freeze({ relief: EMPTY_RELIEF, base: null, loaded: NO_STANDEES });

export interface PedestalProps {
  state: ClientState;
  art: ArtIndex;
  cueData: CueData;
  figures: FigureData;
  models: ModelData;
  traits: TraitData;
  /** The facing preview's turn: 0 (the arena, D143), or π for the facing before it. */
  turn: number;
  mode: CameraMode;
  /** Both seats: two viewports, your copy on the left and the opponent's on the right. */
  split: boolean;
  /** What each viewport frames — from the RESTING board, so a cue never moves the camera. */
  focus: readonly Framing[];
  /** Changes whenever the camera must be re-seated (a new card, a new mode). */
  seat: string;
  queue: CueQueue;
  stage: PreviewStage;
  reducedMotion: boolean;
  bloom: boolean;
  /** The look (D137) — the toolbar's A/B; the arena's default when absent. */
  look?: LookSpec;
  /**
   * **The personal tier** (D194–D196): the overlay the pedestal dresses with —
   * the page's own, or the empty one when the toolbar says "repo" — and what has
   * loaded (`Workshop.tsx` loads it, for the framing too). The pedestal looks each
   * face-up card up and dresses it exactly as `Arena.tsx` does.
   */
  personal?: PersonalOverlay;
  personalLoaded?: PersonalLoaded;
  /**
   * **The portrait standee** (D260): the relief index the pedestal looks its
   * cards up in — the page's, or the empty one when the toolbar says "repo" (the
   * same toggle as the models) — the dev route's prefix (`null`: none), and what
   * has loaded (`Workshop.tsx` loads it, for the framing too). The pedestal
   * chooses and dresses exactly as `Arena.tsx` does, after the personal models.
   */
  standee?: PedestalStandee;
  /**
   * **INSPECT** (D196, D226): `relief.ts`'s plan — the card image `CardPlane`
   * draws for this card (the same URL, so the same texture) for the art-box
   * backdrop and the frame panel, the depth map when there is one and the
   * toolbar says relief, and where each stands. `null` for a concealed entry or a
   * card with no figure or no art, which draws neither.
   */
  inspect?: InspectPlan | null;
  /**
   * **D250 — the arena's sound renderer**, the page's one (`sharedAudio`): the
   * rehearsal panel's sound checkbox turns it on, and `CueRunner` binds it here as
   * it does in the arena, so a cue's sound plays on the pedestal. `null` is silent.
   */
  audio?: ArenaAudio | null;
}

export function Pedestal(props: PedestalProps): JSX.Element {
  /**
   * **`<Canvas frameloop>` is React state here, written by `CueRunner`.**
   *
   * `CueRunner` writes the loop mode into the `loopRef` it is handed, and fiber
   * re-applies the `frameloop` prop on EVERY render of `<Canvas>` — including the
   * ones `<Canvas>` makes on its own (a resize) with the props it last received.
   * Read from a plain ref at this component's render, the prop is only as fresh as
   * that render: measured, a batch enqueued while the clock was paused left it at
   * the `demand` it was rendered with before the enqueue, the queue bar's status
   * line then changed the pedestal's height, the canvas re-rendered, fiber's
   * `configure` put the loop back to `demand` and the paused cue froze where it
   * stood (`store().frameloop` `demand`, the ref `always`). So the ref handed to
   * `CueRunner` is a setter onto state: every mode it decides re-renders this
   * component, and the prop is always the mode — D72's rule, carried one step
   * further. (A state update to the same mode is a no-op.)
   */
  const [frameloop, setFrameloop] = useState<Frameloop>('demand');
  const loopRef = useMemo(() => {
    let mode: Frameloop = 'demand';
    return {
      get current(): Frameloop {
        return mode;
      },
      set current(next: Frameloop) {
        mode = next;
        setFrameloop(next);
      },
    };
  }, []);
  const primeRef = useRef(2);
  const primeForComposer = useCallback(() => {
    primeRef.current = 2;
  }, []);
  // Bloom takes over the render loop (`EffectComposer`), so it is the single
  // view's; the split view renders twice by hand and draws without it.
  const single = !(props.split && props.mode !== 'wide');
  const bloomOn = props.bloom && single;
  // The ink line rides the same composer (D139), so it is single-view too.
  // …and only on bloom's composer, as in the arena (D146).
  const inkOn = wantsInkPass(props.look ?? DEFAULT_LOOK, bloomOn) && single;
  const postOn = bloomOn || inkOn;
  return (
    <Canvas
      className="workshop__canvas"
      dpr={[1, 1.5]}
      // Opaque, as the arena's (D146): a painted figure's alpha is the ink's mark.
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: false }}
      flat
      // `CueRunner` decides it, through `loopRef` above — never a literal, and
      // never a ref read at render (D72, `CueRunner.tsx`'s `Frameloop`).
      frameloop={frameloop}
    >
      <PedestalScene {...props} loopRef={loopRef} primeRef={primeRef} bloomOn={postOn} />
      {postOn && (
        <Suspense fallback={null}>
          <Post onMount={primeForComposer} bloom={bloomOn} ink={inkOn} />
        </Suspense>
      )}
    </Canvas>
  );
}

interface OrbitLike {
  enabled: boolean;
  target: THREE.Vector3;
  update(): unknown;
}

/** Where the second viewport's camera is: following the first, or a pose of its own. */
interface SecondCamera {
  follow: boolean;
  offset: [number, number, number];
  position: [number, number, number];
  target: [number, number, number];
}

function PedestalScene({
  state,
  art,
  cueData,
  figures: figureData,
  models,
  traits,
  turn,
  mode,
  split,
  focus,
  seat,
  queue,
  stage,
  reducedMotion,
  loopRef,
  primeRef,
  bloomOn,
  look = DEFAULT_LOOK,
  personal = EMPTY_PERSONAL,
  personalLoaded = NO_PERSONAL_LOADED,
  standee = NO_PEDESTAL_STANDEE,
  inspect = null,
  audio = null,
}: PedestalProps & {
  loopRef: { current: Frameloop };
  primeRef: { current: number };
  /** The composer is mounted — bloom OR the ink line (D139): the canvas's own renderer steps aside, and the primes compile for its target. */
  bloomOn: boolean;
}): JSX.Element {
  // -- the poses, exactly as Arena.tsx computes them ---------------------------
  const placed = useMemo(() => layout(state, cueData.presence ?? {}), [state, cueData]);
  const frozen = useMemo(() => combatFreeze(state.board), [state.board]);
  // Lane BODIES (D160, D164): the art rung, exactly as `Arena.tsx` reads it — the
  // pedestal must draw what the arena draws.
  const paletteNames = useMemo(() => paletteNamesOf(placed), [placed]);
  const palettes = useArtPalettes(paletteNames, art);
  const basePoses = useMemo(
    () =>
      turnPoses(
        figurePose(placed, state.board?.combat ?? null, figureData, { frozen, models, traits, palettes }),
        turn,
      ),
    [placed, state.board?.combat, figureData, frozen, models, traits, turn, palettes],
  );
  // The personal tier (D195), exactly as `Arena.tsx` dresses: THE lookup over the
  // face-up named figures, then the dressed poses once a model has loaded.
  const personalChoices = useMemo(() => personalChoicesOf(placed, basePoses, personal), [placed, basePoses, personal]);
  const personalPoses = useMemo(
    () => dressPoses(basePoses, personalChoices, personalLoaded.fits),
    [basePoses, personalChoices, personalLoaded.fits],
  );
  // The portrait standee (D260), exactly as `Arena.tsx` stands it: THE lookup over
  // the poses the personal models left, then the dressed poses once it has loaded.
  const standeeChoices = useMemo(
    () => standeeChoicesOf(placed, personalPoses, art, standee.relief, { base: standee.base, taken: personalChoices }),
    [placed, personalPoses, art, standee.relief, standee.base, personalChoices],
  );
  const figures = useMemo(
    () => dressStandees(personalPoses, standeeChoices, standee.loaded.fits),
    [personalPoses, standeeChoices, standee.loaded.fits],
  );
  // The status layer (D210), exactly as `Arena.tsx` lays it out.
  const strips = useMemo(() => statusLayout(placed, figures), [placed, figures]);
  const tiles = useMemo(() => tilePose(placed, tileDataOf(figureData), palettes), [placed, figureData, palettes]);
  const seatOfPlayer = useCallback(
    (playerId: number): 'you' | 'opp' =>
      placed.viewerId === null || playerId === placed.viewerId ? 'you' : 'opp',
    [placed.viewerId],
  );
  const motes = useMemo(() => manaMotes(state.board, seatOfPlayer), [state.board, seatOfPlayer]);
  const forms = useMemo(() => {
    const sourceOf = (cardId: number | null): AnyCard | null =>
      cardId === null ? null : (state.board?.stackCards.find((c) => c.id === cardId) ?? null);
    return spellForms(
      state.board,
      seatOfPlayer,
      (cardId) => colourHex(colourIdOf((sourceOf(cardId) as { manaCost?: string | null } | null)?.manaCost ?? null)),
      sourceOf,
    );
  }, [state.board, seatOfPlayer]);

  // -- the objects that outlive a frame: presentation only (P5) ---------------
  const rigs = useRef<RigMap>(new Map()).current;
  const figureRigs = useRef<FigureRigMap>(new Map()).current;
  const pool = useMemo(() => new EffectPool(), []);
  const discs = useMemo(() => new DiscField(), []);
  const tileField = useMemo(() => new TileField(), []);
  const castingField = useMemo(() => new CastingField(), []);
  const overlays = useMemo(() => new OverlayField(), []);
  const bustField = useMemo(() => new BustField(), []);
  const director = useMemo(() => new PedestalDirector(), []);
  useEffect(() => () => pool.dispose(), [pool]);
  useEffect(() => () => discs.dispose(), [discs]);
  useEffect(() => () => tileField.dispose(), [tileField]);
  useEffect(() => () => castingField.dispose(), [castingField]);
  useEffect(() => () => overlays.dispose(), [overlays]);
  useEffect(() => () => bustField.dispose(), [bustField]);

  // The dev handle's renderer half: fiber's store, for the evidence's driver
  // (DEV only; `import.meta.env.DEV` is a compile-time constant).
  const getStore = useThree((s) => s.get);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const handle = window as unknown as { __mtgWorkshop?: Record<string, unknown> };
    handle.__mtgWorkshop = { ...(handle.__mtgWorkshop ?? {}), store: getStore, loopRef };
  }, [getStore, loopRef]);

  // -- the camera ---------------------------------------------------------------
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const controlsRef = useRef<OrbitLike | null>(null);
  const second = useRef<SecondCamera>({ follow: true, offset: [0, 0, 0], position: [0, 0, 0], target: [0, 0, 0] });
  const splitting = split && mode !== 'wide' && focus.length > 1;
  const first = focus[0];
  const other = focus[1];
  useEffect(() => {
    if (first === undefined) return;
    const pose = poseFor(mode, first, size.height);
    camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
    camera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
    const controls = controlsRef.current;
    if (controls !== null) {
      controls.target.set(pose.target[0], pose.target[1], pose.target[2]);
      controls.update();
    }
    if (other !== undefined) {
      const b = second.current;
      // From your seat the opponent's copy is seen from the same angle as yours;
      // from the front, each copy from its own front (they face opposite ways).
      b.follow = mode === 'close';
      b.offset = [other.centre[0] - first.centre[0], other.centre[1] - first.centre[1], other.centre[2] - first.centre[2]];
      const pb = poseFor(mode, other, size.height);
      b.position = [pb.position[0], pb.position[1], pb.position[2]];
      b.target = [pb.target[0], pb.target[1], pb.target[2]];
    }
    invalidate();
    // `seat` is the re-seat signal; the framings are read through it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seat, mode, size.height, camera, invalidate]);

  // The dev handle's orbit, for the evidence's parallax pictures (D226): turn the
  // camera about the vertical through the orbit's target by `deg`, as a drag
  // would. DEV only, and never from a frame loop.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const handle = window as unknown as { __mtgWorkshop?: Record<string, unknown> };
    handle.__mtgWorkshop = {
      ...(handle.__mtgWorkshop ?? {}),
      orbitBy: (deg: number) => {
        const controls = controlsRef.current;
        if (controls === null) return;
        const t = controls.target;
        const dx = camera.position.x - t.x;
        const dz = camera.position.z - t.z;
        const a = (deg * Math.PI) / 180;
        camera.position.set(t.x + dx * Math.cos(a) + dz * Math.sin(a), camera.position.y, t.z - dx * Math.sin(a) + dz * Math.cos(a));
        camera.lookAt(t);
        controls.update();
        invalidate();
      },
    };
  }, [camera, invalidate]);

  // The stage exactly as `Arena.tsx` computes it (D141): the seats' shown colours
  // and the combat burst, from the synthetic board.
  const stageOn = wantsStage(look);
  const shown = stageIdentitiesOf(state.board?.players, placed.viewerId);
  const stageColours = useMemo(
    () => (stageOn ? stageColoursOf(shown.you, shown.opp) : null),
    [stageOn, shown.you, shown.opp],
  );
  const combat = stageOn && combatStageOf(state.board?.combat);

  return (
    <>
      <color attach="background" args={[stageOn ? COMIC.background : HOLO_BACKGROUND]} />
      <Table stage={stageColours} combat={combat} />
      {placed.placements.map((placement) => (
        <CardPlane
          key={placement.key}
          placement={placement}
          art={art}
          selectable={false}
          highlighted={false}
          rigs={rigs}
        />
      ))}
      <primitive object={tileField.group} />
      <FigureLayer
        poses={figures}
        rigs={figureRigs}
        discs={discs}
        models={models}
        look={look}
        composer={bloomOn}
        status={strips}
        personal={personalLoaded.models}
        standees={standee.loaded.standees}
      />
      {mode === 'inspect' && inspect !== null && <InspectStage plan={inspect} />}
      <primitive object={castingField.group} />
      <primitive object={overlays.group} />
      <primitive object={bustField.group} />
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
        busts={NO_BUSTS}
        bustField={bustField}
        placed={placed}
        director={director}
        awaitingHuman={false}
        mode="replay"
        reducedMotion={reducedMotion}
        primeRef={primeRef}
        loopRef={loopRef}
        audio={audio}
      />
      <PerspectiveCamera makeDefault fov={CAMERA.fov} near={CAMERA.near} far={CAMERA.far} position={REST_POSE.position} />
      <OrbitControls
        ref={controlsRef as never}
        enabled={mode !== 'table'}
        enableDamping={false}
        target={REST_POSE.target}
      />
      {!bloomOn && <PedestalRenderer split={splitting} second={second} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// INSPECT (D196, D226): the card's art behind the figure — a window with depth
// — and its frame beside it
// ---------------------------------------------------------------------------

// The relief cache's address (`RELIEF_BASE`, DEV only), its index and the
// inspect view's depth maps are the arena's since the portrait standee (D260):
// `arena/scene/reliefCache.ts` names the route once, for the table's standees and
// this inspect view alike (the arena cannot import the workshop, D102).

/** One plane, UV-mapped to the art box of a card image (texture v runs bottom-up). */
function artBoxGeometry(): THREE.PlaneGeometry {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const uv = geometry.getAttribute('uv');
  const u0 = ART_BOX.left;
  const u1 = ART_BOX.right;
  const v0 = 1 - ART_BOX.bottom;
  const v1 = 1 - ART_BOX.top;
  // PlaneGeometry's corners: top-left, top-right, bottom-left, bottom-right.
  uv.setXY(0, u0, v1);
  uv.setXY(1, u1, v1);
  uv.setXY(2, u0, v0);
  uv.setXY(3, u1, v0);
  uv.needsUpdate = true;
  return geometry;
}

/** An alpha map with the art box cut out: the frame and the text stay, the painting is the backdrop's. */
function frameAlphaMap(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 244;
  canvas.height = 340;
  const g = canvas.getContext('2d');
  if (g !== null) {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#000000';
    g.fillRect(
      ART_BOX.left * canvas.width,
      ART_BOX.top * canvas.height,
      (ART_BOX.right - ART_BOX.left) * canvas.width,
      (ART_BOX.bottom - ART_BOX.top) * canvas.height,
    );
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * The back layer's step behind the front, as a fraction of the relief: where the
 * two coincide (the background, away from any silhouette) the front is nearer
 * and wins the depth test (with a polygon offset besides). Along the seat's rays,
 * so from the seat it moves nothing.
 */
const BACK_BEHIND = 0.01;

/**
 * **The inspect view's planes**, from `relief.ts`'s plan and the card image
 * `CardPlane` already fetched (`useCardTexture`, the same URL — one texture):
 *
 *  - **the painting** — the ART BOX enlarged behind the figure. With a depth map
 *    (and the toolbar's relief on) it is TWO subdivided planes on one grid
 *    (`RELIEF_GRID`, built once per mount) at the window (D227): the FRONT, the
 *    painting at its depth and cut at every silhouette, and the BACK behind it,
 *    grown by its margin, coloured by the back layer's image — what the
 *    subjects hide, filled in. Their vertex shader sends every vertex back along
 *    its ray from the inspect camera's seat by how far its texel is
 *    (`relief.ts`'s `RELIEF_VERTEX`); their fragment shader cuts the front at a
 *    silhouette (the vertex's jump and the map's keep mask, D228) and both at
 *    the window's rectangle (`RELIEF_FRAGMENT`). From the seat it is the
 *    card's painting (but for a pixel here and there along a cut: the back
 *    image is a JPEG, and a triangle interpolates), and orbiting shows its
 *    depth behind a still frame. The materials are built once per card, at
 *    commit, when the three textures have arrived. Without them — no map, the
 *    toggle off, a build, a map that did not load — it is the flat plane at the
 *    window, as D196 drew it.
 *  - **the frame** — the card's frame and text with the art box cut out, floating
 *    at the figure's right.
 *
 * Both take no click and neither is a card: `CardPlane` draws the card, and
 * this is its painting pulled out behind the figure (D196, D225). Nothing here
 * runs per frame — the orbit moves the camera, the planes stand still, and the
 * parallax is the geometry's (three sets `cameraPosition` for the window's cut
 * at every render; nothing of ours runs).
 */
function InspectStage({ plan }: { plan: InspectPlan }): JSX.Element | null {
  const texture = useCardTexture(plan.image);
  const depth = useDepthTexture(plan.depth?.url ?? null);
  // The back layer's colour: a card-sized sRGB image, loaded and cached as a card image is.
  const backTexture = useCardTexture(plan.depth?.backUrl ?? null);
  const layout = plan.layout;
  const backdrop = layout.backdrop;
  const entry = plan.depth?.entry ?? null;
  const artGeometry = useMemo(() => artBoxGeometry(), []);
  const alphaMap = useMemo(() => frameAlphaMap(), []);
  // The relief's grid: one geometry for both layers of every card this mount
  // shows (its UVs are 0–1 over the plane; each layer's boxes map them).
  const reliefGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1, RELIEF_GRID[0], RELIEF_GRID[1]), []);
  const relief = plan.depth !== null ? layout.relief : 0;
  const [eyeX, eyeY, eyeZ] = layout.camera.position;
  // The two materials, once per card at commit: the painting (or its back
  // layer), the depth, how far it reaches, the seat whose rays it recedes along,
  // the silhouette cut and the window.
  const layers = useMemo(() => {
    if (texture === null || depth === null || backTexture === null || entry === null || relief <= 0) return null;
    const clip = windowClipOf(backdrop);
    const make = (map: THREE.Texture, boxes: LayerBoxes, back: boolean): THREE.ShaderMaterial =>
      new THREE.ShaderMaterial({
        uniforms: {
          map: { value: map },
          uDepth: { value: depth },
          uRelief: { value: relief },
          uLayer: { value: back ? 1 : 0 },
          uBehind: { value: back ? BACK_BEHIND * relief : 0 },
          uEye: { value: new THREE.Vector3(eyeX, eyeY, eyeZ) },
          uArtBox: { value: new THREE.Vector4(...boxes.colour) },
          uDepthBox: { value: new THREE.Vector4(...boxes.depth) },
          uCell: { value: new THREE.Vector2(1 / RELIEF_GRID[0], 1 / RELIEF_GRID[1]) },
          // The silhouette's cut: the front's alone — the shader never cuts the
          // back layer (`uLayer` 1), because it is what the cut shows.
          uCut: { value: RELIEF_CLIFF },
          uWindow: { value: new THREE.Vector3(...clip.centre) },
          uFront: { value: new THREE.Vector3(...clip.front) },
          uRight: { value: new THREE.Vector3(...clip.right) },
          uUp: { value: new THREE.Vector3(...clip.up) },
          uHalf: { value: new THREE.Vector2(...clip.half) },
        },
        vertexShader: RELIEF_VERTEX,
        fragmentShader: RELIEF_FRAGMENT,
        side: THREE.DoubleSide,
        ...(back ? { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 } : {}),
      });
    const backBox = backBoxes(entry);
    return { front: make(texture, frontBoxes(), false), back: make(backTexture, backBox, true), backScale: backBox.scale };
  }, [texture, depth, backTexture, entry, relief, eyeX, eyeY, eyeZ, backdrop]);
  useEffect(
    () => () => {
      layers?.front.dispose();
      layers?.back.dispose();
    },
    [layers],
  );
  useEffect(
    () => () => {
      artGeometry.dispose();
      alphaMap.dispose();
      reliefGeometry.dispose();
    },
    [artGeometry, alphaMap, reliefGeometry],
  );
  if (texture === null) return null;
  const plane = (panel: Panel, key: string, geometry: THREE.BufferGeometry | null, frame: boolean): JSX.Element => (
    <mesh
      key={key}
      position={panel.position}
      rotation={[0, panel.rotationY, 0]}
      scale={[panel.width, panel.height, 1]}
      raycast={() => {}}
      {...(geometry === null ? {} : { geometry })}
    >
      {geometry === null && <planeGeometry args={[1, 1]} />}
      <meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} {...(frame ? { alphaMap, alphaTest: 0.5 } : {})} />
    </mesh>
  );
  return (
    <group name="inspect">
      {layers !== null ? (
        <>
          <mesh
            key="relief"
            name="inspect:relief"
            position={backdrop.position}
            rotation={[0, backdrop.rotationY, 0]}
            scale={[backdrop.width, backdrop.height, 1]}
            geometry={reliefGeometry}
            material={layers.front}
            // The receding vertices leave the plane's own bounds (up to `relief` behind it).
            frustumCulled={false}
            raycast={() => {}}
          />
          <mesh
            key="relief-back"
            name="inspect:relief-back"
            position={backdrop.position}
            rotation={[0, backdrop.rotationY, 0]}
            scale={[backdrop.width * layers.backScale[0], backdrop.height * layers.backScale[1], 1]}
            geometry={reliefGeometry}
            material={layers.back}
            frustumCulled={false}
            raycast={() => {}}
          />
        </>
      ) : (
        // Flat: the picture at the window, where the relief's nearest point stands.
        plane(backdrop, 'art', artGeometry, false)
      )}
      {plane(layout.frame, 'frame', null, true)}
    </group>
  );
}

const B_POSITION = new THREE.Vector3();
const B_TARGET = new THREE.Vector3();

/**
 * **The workshop's one `useFrame`** — rendering, and nothing else. Priority 1, so
 * it runs after `CueRunner` has written every transform this frame; and because a
 * positive priority exists, fiber leaves the render to it. One view: one render.
 * Both seats: the left half from the orbiting camera, the right half from a second
 * camera that follows it by the offset between the two figures (close-up) or
 * stands at its own table-distance pose — so the opponent's copy is seen from the
 * same angle yours is, which is what shows their facing. No allocation: the
 * second camera and its two vectors are made once.
 */
function PedestalRenderer({ split, second }: { split: boolean; second: { current: SecondCamera } }): null {
  const cameraB = useMemo(() => new THREE.PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far), []);
  const splitRef = useRef(split);
  splitRef.current = split;
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    invalidate();
  }, [split, invalidate]);
  // Whatever renders after this one (bloom's composer, when it is switched on)
  // must find the whole canvas and an unsquashed camera, not the right half.
  useEffect(
    () => () => {
      gl.setScissorTest(false);
      gl.setViewport(0, 0, size.width, size.height);
      const perspective = camera as THREE.PerspectiveCamera;
      perspective.aspect = size.width / Math.max(1, size.height);
      perspective.updateProjectionMatrix();
    },
    [gl, camera, size],
  );
  useFrame((frame) => {
    const gl = frame.gl;
    const scene = frame.scene;
    const camera = frame.camera as THREE.PerspectiveCamera;
    const width = frame.size.width;
    const height = frame.size.height;
    if (!splitRef.current) {
      const aspect = width / Math.max(1, height);
      if (camera.aspect !== aspect) {
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      }
      gl.setScissorTest(false);
      gl.setViewport(0, 0, width, height);
      gl.render(scene, camera);
      return;
    }
    const half = Math.floor(width / 2);
    const aspect = half / Math.max(1, height);
    if (camera.aspect !== aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    if (cameraB.aspect !== aspect) {
      cameraB.aspect = aspect;
      cameraB.updateProjectionMatrix();
    }
    const b = second.current;
    if (b.follow) {
      cameraB.position.set(camera.position.x + b.offset[0], camera.position.y + b.offset[1], camera.position.z + b.offset[2]);
      cameraB.quaternion.copy(camera.quaternion);
    } else {
      B_POSITION.set(b.position[0], b.position[1], b.position[2]);
      B_TARGET.set(b.target[0], b.target[1], b.target[2]);
      cameraB.position.copy(B_POSITION);
      cameraB.lookAt(B_TARGET);
    }
    cameraB.updateMatrixWorld();
    gl.setScissorTest(true);
    gl.setViewport(0, 0, half, height);
    gl.setScissor(0, 0, half, height);
    gl.render(scene, camera);
    gl.setViewport(half, 0, width - half, height);
    gl.setScissor(half, 0, width - half, height);
    gl.render(scene, cameraB);
    gl.setScissorTest(false);
    gl.setViewport(0, 0, width, height);
  }, 1);
  return null;
}
