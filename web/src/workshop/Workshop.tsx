/*
 * mtg-table — workshop/Workshop.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The workshop: a card viewer for workshopping the arena's identity work.**
 * `#workshop` or `?view=workshop`, lazily imported by `main.tsx` exactly as the
 * arena is (D49 — the 2D entry chunk carries none of it), with no engine and no
 * transport: every board on the pedestal is a synthetic `ClientState` built by
 * `synthetic.ts` and folded through the real reducer.
 *
 *   left    every card of `decks/*.dck`, the tokens, the generic archetypes and the
 *           two concealed shapes; a search box; each row's Scryfall thumbnail and
 *           the rung its identity came from (per-card / subtype / colour / default)
 *   middle  the pedestal (`Pedestal.tsx`): the card as a game draws it — card plane,
 *           body, props, disc, tile, overlay — close up, at table distance, or the
 *           whole table; your seat, or both seats side by side; either facing
 *   right   actions (every clip the body has, every rehearsal and the cues it
 *           resolves to, the queue's own controls), tuning (the traits row and the
 *           card's cue params as live, browser-local overrides), and the
 *           legibility meter
 *
 * It is a renderer and a data editor, never a game: there is no act, no answer,
 * no socket, and nothing here is written to the repo.
 *
 * Four things it shares with the rest of the app, each on purpose:
 *
 *  - **`App` unmounts the mode app to show it**, as it does for `#cards` (D94):
 *    a hidden board's or arena's `window` key listeners would act on a live game
 *    under the workshop's own keys. A live socket survives on `window`, a replay
 *    resumes at its frame (`replayCursors`), and `main.tsx` hands in `waiting` —
 *    the header's chip while the live game is waiting on the player.
 *  - **Its keys are a table of their own** (`keys.ts` here, each row carrying its
 *    action), the card browser's pattern: `web/src/keys.ts` is the board's and
 *    the arena's, and its `?` overlay would advertise `.` and `B`.
 *  - **The list's thumbnail is its one card image outside a renderer** — exempt
 *    from `CardTile` as the card browser's `CardView` is (CLAUDE.md, M4
 *    convention 2): public card data, a concealed entry never looked up.
 *  - **The tuning panel's copies are the committed text with the edit folded
 *    in** (`tuning.ts`), refused while the arena's validator refuses the row.
 *
 * And two links with the card browser (`links.ts`): the header's *card text*
 * goes to `#cards?open=<scryfall id>` when `art.json` has the id, and `#cards`'
 * *View in 3D* comes here as `#workshop?card=<exact name>` — read by
 * `initialSelection`, the hash's query first, as the browser reads its own; the
 * page then keeps `#workshop?card=…` in step with the list.
 *
 * ---------------------------------------------------------------------------
 * **The coupling to `web/src/arena/`, all of it, and why** — the list to
 * re-check whenever the arena moves (it was re-checked against Tier 2 slice 4:
 * the proportioned bodies, the costume palette in `figureMaterial`, the props
 * fitted per body family, the duelists). The workshop's code edits nothing under
 * `arena/`; every name below is an existing export, and
 * `web/test/workshop.test.ts` fails if a workshop file imports one that is not
 * named here.
 *
 *   arena/scene/     the pedestal draws with the arena's own scene (Pedestal.tsx)
 *     CueRunner, Frameloop (CueRunner.tsx)   THE frame loop: offsets, clip lane, binds
 *     FigureLayer (FigureLayer.tsx)          bodies, discs, props, departing bodies
 *     CardPlane (CardPlane.tsx)              THE card renderer (M7 convention 2)
 *     Table (Table.tsx)                      the felt, or the comic stage and its backdrop (D141)
 *     EffectPool, DiscField, TileField, CastingField, OverlayField, BustField
 *                                            the pose fields CueRunner binds
 *     SceneStage                             subclassed as facing.ts's PreviewStage (yawTo)
 *     Post (Post.tsx, lazy)                  bloom and the ink line, the arena's one composer
 *     instantiateFigure, clipFor, loadFigureModels, ModelLibrary (models.ts)
 *                                            the meter's bodies, the clips' lengths
 *     loadAssetBytes (models.ts)             D250: the clips' bytes, handed to the audio module
 *     sharedAudio, ArenaAudio (audio.ts)     D250: the page's one sound renderer — the
 *                                            rehearsal panel's sound checkbox turns it on
 *                                            and CueRunner binds it on the pedestal
 *     PropField, PropOffsetSource (props.ts) the meter reads the real prop field back
 *     COSTUME_ATTRIBUTE (figureMaterial.ts)  the meter finds a body's head by its slots
 *     FigureRig, FigureRigMap (figureRigs.ts), RigMap (rigs.ts)
 *   arena/figures/   the pose, the ladders and the validators — pure
 *     figurePose, FigureLayout, FigurePose (pose.ts) · figureFor (resolve.ts)
 *     traitFor, TRAITS, TraitData (traits.ts) · tileFor, tilePose (tiles.ts)
 *     attachFor (attach.ts) · combatFreeze, manaMotes, spellForms (casting.ts)
 *     DuelistBust (duelists.ts) — the pedestal hands CueRunner none: the
 *       duelists are a seat's, not a card's, and are not drawn here
 *     PROP_KINDS, FORMATIONS, IDLE_STYLES, BODY_STYLES, COSTUME_SLOTS,
 *     CostumeSlot, familyOf (props.ts)       the tuning panel's fields; the meter's head
 *       height per body family (prop-raster.ts's rule)
 *     HAIR_STYLES, FACE_STYLES, PALETTE_USES (props.ts) · REST_POSES, REST_KIT (rests.ts)
 *                                            lane BODIES' tuning rows: rest, hair, face, palette
 *     ArtPalette, artRow (palette.ts)        the palette row's swatch strip, and whether a
 *                                            hand-written row would outrank the art rung
 *     statusLayout, StatusLayout (status.ts) the status layer (D210): the pedestal lays
 *                                            out every strip exactly as Arena.tsx does and
 *                                            hands it to FigureLayer, which commits it
 *     clipEnvelope, clipForCue, ClipRequest, REST_CLIP_FOR, REST_PHASE_FOR (clips.ts)
 *     validateFigures, validateModels, validateTraits (validate.ts)
 *     FigureData, ModelData, FigureProblem, ClipName, isClipName, tileDataOf,
 *     attachDataOf, EMPTY_FIGURE_DATA, EMPTY_MODEL_DATA (types.ts)
 *   arena/art.ts     the art palette, read off the hot path (lane BODIES, D160)
 *     useArtPalettes, paletteNamesOf         the art rung as the arena draws it (D164, at
 *                                            the lanes' merge): the pedestal reads every
 *                                            face-up name on its board through
 *                                            `paletteNamesOf` and passes the palettes to
 *                                            `figurePose` and `tilePose` exactly as
 *                                            `Arena.tsx` does; the tuning panel's swatch
 *                                            strip and the framing's poses read this
 *                                            card's own, face up only
 *   arena/cues/      the cue engine — pure
 *     CueQueue (queue.ts) · REGISTRY (registry.ts)
 *     motionFromSearch, DEFAULT_MOTION, MotionFlags (motion.ts)
 *                                            the comic motion lane's comic FX and on
 *                                            twos: `?fx=` / `?twos=` where they start,
 *                                            the queue bar's two checkboxes after
 *     cuesFor, resolve, selectorsFor, subjectOf (resolve.ts)
 *     soundOfParams (sound.ts)               D250: the sound a planned cue carries, as words
 *     validateCues, mergeCueData, isCommentKey (validate.ts)
 *     clamp01, CueImpl, CueRegistry, AnchorRef (stage.ts)
 *     CueData, CueSpec, CueParams, Presence, Problem, EMPTY_CUE_DATA (types.ts)
 *   arena/           where things are, and how the camera sees them — pure
 *     layout, placementOf, anchorsFor, CARD_W, FIGURE_FRONT_Z, Layout (layout.ts)
 *     CAMERA, REST_POSE, VIEW_BY_ID, Pose, CameraDirector (subclassed, inert),
 *     CameraFrame, RequestOutcome (camera.ts)
 *     BLOOM_DEFAULT (perf.ts) · colourHex, colourIdOf (colour.ts)
 *     RELIEF_DEPTH, RELIEF_GRID, RELIEF_CLIFF (perf.ts)
 *                                            the relief window's three numbers (D226,
 *                                            D227): how far the painting's depth reaches
 *                                            behind the window, the planes' grid, and the
 *                                            jump at which the front layer is cut
 *                                            (relief.ts, Pedestal.tsx's InspectStage)
 *     lookFromSearch, lookSpecOf, LookSpec, COMIC, DEFAULT_LOOK, HOLO_BACKGROUND,
 *     combatStageOf, stageColoursOf, stageIdentitiesOf, wantsInkPass, wantsStage
 *     (look.ts)                              the look (D137): the toolbar's A/B over
 *                                            holo · comic and each comic option, and
 *                                            the stage exactly as Arena.tsx computes it
 *   the personal tier (D194–D196) — the user's own models, dev server only
 *     usePersonalOverlay, usePersonalModels, NO_PERSONAL_LOADED, PersonalLoaded
 *     (personalModels.ts)                   the index and the models, as Arena.tsx loads them
 *     EMPTY_PERSONAL, personalChoicesOf, dressPoses, PersonalOverlay (personal.ts)
 *                                            THE lookup and the dressed poses, as Arena.tsx
 *                                            dresses; the list's badge reads the overlay
 *     useCardTexture (useCardTexture.ts)     the inspect view's backdrop and frame: the
 *                                            texture CardPlane already fetched for the card;
 *                                            and the relief's back layer (D227), a
 *                                            card-sized sRGB image loaded the same way
 *   the relief cache (D225–D228) and the portrait standee (D260–D264) — dev server only
 *     ART_BOX, EMPTY_RELIEF, reliefIndexOf, isArtBox, ReliefEntry, ReliefIndex
 *     (arena/relief.ts)                     THE reader of the relief index, and the art
 *                                            box a map is cut with — the arena's since the
 *                                            standee; relief.ts and framing.ts re-export
 *     RELIEF_BASE, useReliefIndex, useDepthTexture, useStandees, NO_STANDEES,
 *     StandeesLoaded (scene/reliefCache.ts) the route's one name (DEV only), the index
 *                                            and the inspect view's depth maps, and the
 *                                            standees the pedestal wears, loaded as
 *                                            Arena.tsx loads them
 *     standeeChoicesOf, dressStandees (standee.ts)
 *                                            THE standee lookup and the dressed poses, as
 *                                            Arena.tsx stands them — behind the personal
 *                                            / repo toggle; and the list's standee badge,
 *                                            through relief.ts's standeeBadgesOf, which asks
 *                                            the same lookup of each creature's resting board
 *   the data         figures.json, models.json and cues.json (imported without
 *                    attributes, as Arena.tsx imports them), traits.json (with them,
 *                    as traits.ts does) — the bundler warns on a module imported
 *                    two ways
 *
 * **Slice 4's costume palette** reaches the pedestal with no code here: the pose
 * carries it (`figurePose` with the overridden traits) and the arena's own
 * `FigureLayer` writes it into each figure's material at commit. The tuning
 * panel's `costume` rows and its `body` flag are written out, as every field is,
 * and pass `validateTraits`, which decides what a row may say.
 * ---------------------------------------------------------------------------
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';

import { imageUrl, lookupArt, type ArtIndex } from '../art.ts';
import type { GameEvent, GameStateBody } from '../protocol.ts';
import type { ClientState } from '../reduce.ts';
import type { View } from '../useView.ts';
import { DEFAULT_MOTION, motionFromSearch, type MotionFlags } from '../arena/cues/motion.ts';
import { CueQueue } from '../arena/cues/queue.ts';
import type { CueData, Problem } from '../arena/cues/types.ts';
import { figurePose, type FigurePose } from '../arena/figures/pose.ts';
import { useArtPalettes } from '../arena/art.ts';
import { EMPTY_PERSONAL, dressPoses, personalChoicesOf, type PersonalOverlay } from '../arena/personal.ts';
import { usePersonalModels, usePersonalOverlay } from '../arena/scene/personalModels.ts';
import { RELIEF_BASE, useReliefIndex, useStandees } from '../arena/scene/reliefCache.ts';
import { EMPTY_RELIEF } from '../arena/relief.ts';
import { dressStandees, standeeChoicesOf } from '../arena/standee.ts';
import { artRow, type ArtPalette } from '../arena/figures/palette.ts';
import {
  BODY_STYLES,
  COSTUME_SLOTS,
  FACE_STYLES,
  HAIR_STYLES,
  PALETTE_USES,
  PROP_KINDS,
  FORMATIONS,
  IDLE_STYLES,
  type CostumeSlot,
} from '../arena/figures/props.ts';
import { REST_KIT, REST_POSES } from '../arena/figures/rests.ts';
import { figureFor } from '../arena/figures/resolve.ts';
import { traitFor, type TraitData } from '../arena/figures/traits.ts';
import type { FigureProblem } from '../arena/figures/types.ts';
import { layout } from '../arena/layout.ts';
import { lookFromSearch, lookSpecOf, type LookSpec } from '../arena/look.ts';
import { BLOOM_DEFAULT } from '../arena/perf.ts';
import { loadAssetBytes, loadFigureModels, type ModelLibrary } from '../arena/scene/models.ts';
import { sharedAudio } from '../arena/scene/audio.ts';
import { cardOf, matchesSearch, roleOf, rungsOf, workshopEntries, type WorkshopEntry } from './catalog.ts';
import { clipCueData, workshopRegistry } from './clipCue.ts';
import { cueRows, unreachedSelectors, type CueRow } from './cueRows.ts';
import { CUES_RAW, FIGURE_DATA, MODEL_DATA } from './data.ts';
import { PreviewStage, turnPoses } from './facing.ts';
import { framingOf, type CameraMode, type Framing } from './framing.ts';
import { WORKSHOP_KEYMAP, workshopActionFor, type WorkshopKeyAction } from './keys.ts';
import { LEGIBLE_PX, METER_HEIGHT, METER_WIDTH, drawnHeightPx, measure, type MeterRow } from './legibility.ts';
import { WORKSHOP_VIEW_INSPECT, cardFromLocation, cardsHref, workshopHref, workshopViewFromLocation } from './links.ts';
import { Pedestal } from './Pedestal.tsx';
import { inspectPlan, inspectSourceOf, standeeBadgesOf } from './relief.ts';
import {
  DEFAULT_OPTIONS,
  HOST_ENTRY,
  IDS,
  STANCE_CHOICES,
  clipBatch,
  figureIds,
  pedestalState,
  rehearse,
  type PedestalOptions,
  type Rehearsal,
  type RehearsalKind,
  type StanceChoice,
} from './synthetic.ts';
import {
  committedRow,
  cueEntryText,
  cueSelectorsOf,
  cuesWith,
  readOverrides,
  traitsRowText,
  traitsWith,
  withCueParams,
  withTraitRow,
  writeOverrides,
  type Overrides,
  type RawRow,
} from './tuning.ts';

export interface WorkshopProps {
  art: ArtIndex;
  /** Back to the board or the arena. `null` leaves the links inert. */
  onSetView: ((view: View) => void) | null;
  /**
   * A line from `main.tsx` while a live game is waiting on the player (an open
   * `ask`, or the engine's prompt, verbatim) — the mode app is unmounted under the
   * workshop, so this chip is the only thing on screen that says so. `null` or
   * absent: no live game, or nothing asked. The workshop never reads a transport.
   */
  waiting?: string | null;
}

/** The last card looked at, remembered in this browser (a convenience, like the arena's view). */
const SELECTED_KEY = 'mtg-table.workshop.card';

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * The entry a `card=` word names: an entry's key (`arch:robot`) or its exact
 * label, case aside, first — which is what the card browser's *View in 3D* and
 * this page's own URL write — then the first label containing it
 * (`?card=peggy`). `null` when nothing matches.
 */
function entryNamed(entries: readonly WorkshopEntry[], card: string | null): string | null {
  if (card === null) return null;
  const wanted = card.trim().toLowerCase();
  if (wanted === '') return null;
  const hit =
    entries.find((e) => e.key.toLowerCase() === wanted || e.label.toLowerCase() === wanted) ??
    entries.find((e) => e.label.toLowerCase().includes(wanted));
  return hit?.key ?? null;
}

/** What this page's URL calls an entry: a card by its name, anything else by its key. */
function cardWordOf(entry: WorkshopEntry): string {
  return entry.group === 'deck' || entry.group === 'token' ? entry.name : entry.key;
}

/** The location's `card=` — the hash's query first (`#workshop?card=…`), as `#cards` reads its own. */
function locationCard(): string | null {
  try {
    return cardFromLocation(window.location.hash, window.location.search);
  } catch {
    return null;
  }
}

/** D241 — whether the location asks for the inspect view (`view=inspect`: the arena's `I`). */
function locationInspects(): boolean {
  try {
    return workshopViewFromLocation(window.location.hash, window.location.search) === WORKSHOP_VIEW_INSPECT;
  } catch {
    return false;
  }
}

/**
 * The note for a `card=` the catalog has no exact entry for (D241: the arena's `I`
 * names a card on the table; a token no recording showed is not listed) — the
 * page then opens on the nearest match or the first card, and says so.
 */
function unlistedNote(entries: readonly WorkshopEntry[]): string | null {
  const card = locationCard();
  if (card === null) return null;
  const wanted = card.trim().toLowerCase();
  if (entries.some((e) => e.key.toLowerCase() === wanted || e.label.toLowerCase() === wanted)) return null;
  return `the workshop lists no card named “${card}” (it shows the decks under decks/ and the tokens the recordings saw)`;
}

function initialSelection(entries: readonly WorkshopEntry[]): string {
  const has = (key: string | null): key is string => key !== null && entries.some((e) => e.key === key);
  const named = entryNamed(entries, locationCard());
  if (named !== null) return named;
  try {
    const stored = storage()?.getItem(SELECTED_KEY) ?? null;
    if (has(stored)) return stored;
  } catch {
    // Nothing stored is the first card.
  }
  return entries[0]?.key ?? '';
}

function prefersReducedMotion(): boolean {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;

/** `?fx=` / `?twos=` — where the comic motion lane's two switches start (`cues/motion.ts`). */
function initialMotion(): MotionFlags {
  try {
    return motionFromSearch(window.location.search);
  } catch {
    return DEFAULT_MOTION;
  }
}
const HALF_TURN = Math.PI;

interface Shown {
  state: ClientState;
  batch: { events: GameEvent[]; previous: GameStateBody | null; data: CueData | null; label: string } | null;
  /** Bumped for every batch, so the same rehearsal twice is two batches. */
  n: number;
}

export default function Workshop({ art, onSetView, waiting = null }: WorkshopProps): JSX.Element {
  const entries = useMemo(() => workshopEntries(), []);
  const [selected, setSelected] = useState<string>(() => initialSelection(entries));
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<PedestalOptions>(DEFAULT_OPTIONS);
  // The figure's FRONT by default (D143: from your own seat you see its back —
  // `1× from your seat` is one click away) — or INSPECT when the location asks for
  // it (D241: the arena's `I`, `#workshop?card=<name>&view=inspect`).
  const [mode, setMode] = useState<CameraMode>(() => (locationInspects() ? 'inspect' : 'front'));
  const [turn, setTurn] = useState(0);
  const [reducedMotion, setReducedMotion] = useState<boolean>(prefersReducedMotion);
  const [bloom, setBloom] = useState<boolean>(BLOOM_DEFAULT);
  /**
   * **D250 — sound on the pedestal**: the arena's own audio module (the page's
   * one), muted until the rehearsal panel's checkbox is ticked — the tick is the
   * gesture that lets the page start its audio. Page state, never stored: the
   * arena's kept choice is the arena's (D251).
   */
  const audio = useMemo(() => sharedAudio(loadAssetBytes), []);
  const [soundOn, setSoundOn] = useState(false);
  useEffect(() => {
    audio.setEnabled(soundOn);
  }, [audio, soundOn]);
  useEffect(() => () => audio.stopAll(), [audio]);
  const onSound = useCallback(
    (on: boolean) => {
      if (on) audio.unlock();
      audio.setEnabled(on);
      setSoundOn(on);
    },
    [audio],
  );
  /**
   * **The look** (D137) — the toolbar's A/B over holo · comic and every comic
   * option. It starts where the page's own `?look=` query says (the arena's
   * default, the comic look, when it says nothing) and is presentation only: it
   * never reaches `traits.json`, `cues.json` or the arena (D103's rule).
   */
  const [look, setLook] = useState<LookSpec>(() => {
    try {
      return lookFromSearch(window.location.search);
    } catch {
      return lookFromSearch('');
    }
  });
  const [autoRest, setAutoRest] = useState(true);
  /**
   * **The personal tier's A/B** (D196): the pedestal dressed in the user's own
   * models where a card has one (`personal`, the default — as the arena draws it
   * on this dev server), or in the CC0 figures (`repo`). The list's badge says
   * which cards have one either way.
   */
  // As the arena reads it (`?personal=0` draws the CC0 figures), so `I` from a
  // table in either state opens the inspect view in the same one (D241).
  const [personalOn, setPersonalOn] = useState<boolean>(() => {
    try {
      return new URLSearchParams(window.location.search).get('personal') !== '0';
    } catch {
      return true;
    }
  });
  const overlay = usePersonalOverlay(true);
  const pedestalOverlay: PersonalOverlay = personalOn ? overlay : EMPTY_PERSONAL;
  /**
   * **The relief window's A/B** (D226, D227): the inspect view's painting in two
   * layers behind a still window (`relief`, the default wherever the personal tier
   * has a map), or the flat picture D196 drew. The index is the dev route's, read once a page —
   * empty in a build, where every backdrop is flat.
   */
  const [reliefOn, setReliefOn] = useState(true);
  const reliefIndex = useReliefIndex();
  const [overrides, setOverrides] = useState<Overrides>(() => readOverrides(storage()));
  const [library, setLibrary] = useState<ModelLibrary | null>(null);
  const [note, setNote] = useState<string | null>(() => unlistedNote(entries));

  const entry = useMemo(
    () => entries.find((e) => e.key === selected) ?? entries[0]!,
    [entries, selected],
  );

  useEffect(() => {
    try {
      storage()?.setItem(SELECTED_KEY, entry.key);
    } catch {
      // Remembered for this page only.
    }
  }, [entry.key]);

  // **The URL says which card is up**, as `#cards` keeps its own state in its
  // hash: `#workshop?card=<name>` (a card by its name, anything else by its key),
  // rewritten in place — no history entry and no `hashchange`, so `useView` stays
  // where it is — so a reload or a copied link opens this card.
  useEffect(() => {
    try {
      // The inspect view rides in the URL too (D241), so a reload keeps it.
      const hash = workshopHref(cardWordOf(entry), mode === 'inspect' ? WORKSHOP_VIEW_INSPECT : null);
      if (window.location.hash === hash) return;
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
    } catch {
      // No history to write to: the selection stands without it.
    }
  }, [entry, mode]);

  // A hand-edited hash (`#workshop?card=coulson`) selects its card.
  useEffect(() => {
    const onHash = (): void => {
      const named = entryNamed(entries, locationCard());
      if (named !== null) setSelected(named);
      if (locationInspects()) setMode('inspect');
    };
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('hashchange', onHash);
    };
  }, [entries]);

  useEffect(() => {
    writeOverrides(storage(), overrides);
  }, [overrides]);

  // The body library, once — the same cached parse FigureLayer uses.
  useEffect(() => {
    let live = true;
    loadFigureModels(MODEL_DATA)
      .then((loaded) => {
        if (live) setLibrary(loaded);
      })
      .catch(() => {
        if (live) setNote('no figures.glb — every creature is its disc (a supported state)');
      });
    return () => {
      live = false;
    };
  }, []);

  // -- the data, with this browser's overrides, through the arena's validators --
  const traitResult = useMemo(() => traitsWith(overrides), [overrides]);
  const cueResult = useMemo(() => cuesWith(overrides, CUES_RAW), [overrides]);
  const traits = traitResult.data;
  const cueData = cueResult.data;

  // -- the resting board, and what the camera frames on it ---------------------
  const rest = useMemo(() => pedestalState(entry, options), [entry, options]);
  const presence = cueData.presence;
  // Lane BODIES (D160, D164): the card's own art palette, read once off the hot
  // path by the arena's `art.ts` — never for a concealed entry — for the tuning
  // panel's swatch strip and for the framing's poses, which take it as the
  // pedestal's do (the pedestal reads its whole board's, through `paletteNamesOf`),
  // so the panel's "drawn" tint and accent are the ones on the pedestal.
  const paletteNames = useMemo(() => (entry.concealed === null && entry.name !== '' ? [entry.name] : []), [entry]);
  const palettes = useArtPalettes(paletteNames, art);
  const restPoses = useMemo(() => {
    const placed = layout(rest, presence ?? {});
    const poses = turnPoses(
      figurePose(placed, rest.board?.combat ?? null, FIGURE_DATA, { models: MODEL_DATA, traits, palettes }),
      turn,
    );
    return { placed, poses };
  }, [rest, presence, traits, turn, palettes]);
  // The personal tier (D195): the same lookup the pedestal makes, so the models it
  // wants load here (once, for the page) and the framing is the dressed figure's.
  const personalChoices = useMemo(
    () => personalChoicesOf(restPoses.placed, restPoses.poses, pedestalOverlay),
    [restPoses, pedestalOverlay],
  );
  const personalLoaded = usePersonalModels(pedestalOverlay, personalChoices, false);
  const personalPoses = useMemo(
    () => dressPoses(restPoses.poses, personalChoices, personalLoaded.fits),
    [restPoses, personalChoices, personalLoaded.fits],
  );
  /**
   * **The portrait standee on the pedestal** (D260): the arena's own standee path
   * — `standeeChoicesOf`, `useStandees`, `dressStandees` — behind the SAME toggle as
   * the models (`personal` stands a card's standee where no model dresses it,
   * `repo` the CC0 figure), so one card's standee can be inspected up close. The
   * relief index is the one the inspect view reads.
   */
  const standeeRelief = personalOn ? reliefIndex : EMPTY_RELIEF;
  const standeeBase = personalOn ? RELIEF_BASE : null;
  const standeeChoices = useMemo(
    () => standeeChoicesOf(restPoses.placed, personalPoses, art, standeeRelief, { base: standeeBase, taken: personalChoices }),
    [restPoses, personalPoses, art, standeeRelief, standeeBase, personalChoices],
  );
  const standeesLoaded = useStandees(standeeChoices);
  const pedestalStandee = useMemo(
    () => ({ relief: standeeRelief, base: standeeBase, loaded: standeesLoaded }),
    [standeeRelief, standeeBase, standeesLoaded],
  );
  const focus = useMemo((): Framing[] => {
    const dressed = dressStandees(personalPoses, standeeChoices, standeesLoaded.fits);
    return figureIds(entry, options).map((id) => framingOf(restPoses.placed, dressed, id));
  }, [restPoses, personalPoses, standeeChoices, standeesLoaded.fits, entry, options]);
  const personalNames = useMemo(() => new Set(overlay.cards.keys()), [overlay]);
  /**
   * The list's *standee* badge (D260): what the pedestal stands at its default
   * options, decided by THE lookup — `relief.ts`'s `standeeBadgesOf` asks the
   * arena's `standeeChoicesOf` of each creature's own resting board, the models
   * the overlay dresses taken first — so the badge's gates, its art lookup, its
   * relief and its legibility floor are the lookup's (face up only; empty in a
   * build: no index).
   */
  const standeeNames = useMemo(
    () =>
      standeeBadgesOf(entries, {
        art,
        relief: reliefIndex,
        base: RELIEF_BASE,
        overlay,
        figures: FIGURE_DATA,
        models: MODEL_DATA,
        traits,
        presence: presence ?? {},
      }),
    [entries, art, reliefIndex, overlay, traits, presence],
  );
  const standeeCount = useMemo(() => [...reliefIndex.byId.values()].filter((r) => r.standee !== null).length, [reliefIndex]);
  // INSPECT (D196, D226): the pedestal's backdrop and frame draw the image CardPlane
  // draws for this card — the same URL, so the same texture — face up only, through
  // relief.ts's one way in; the plan adds the depth map when the relief cache has one.
  const inspectSource = useMemo(() => inspectSourceOf(entry, art), [entry, art]);
  const reliefAvailable = inspectSource !== null && RELIEF_BASE !== null && reliefIndex.byId.has(inspectSource.scryfallId);
  const inspect = useMemo(
    () => (mode === 'inspect' ? inspectPlan(focus[0], inspectSource, reliefIndex, { on: reliefOn, base: RELIEF_BASE }) : null),
    [mode, focus, inspectSource, reliefIndex, reliefOn],
  );
  const seat = `${entry.key}|${String(options.both)}|${mode}|${options.stance}`;
  // The caption's number: each framed body's DRAWN height in view 1 — its resting
  // rig projected through the table camera (legibility.ts), not the nominal scale.
  const drawn = useMemo(
    () => (library === null ? null : focus.map((f) => (f.pose === null ? null : drawnHeightPx(f.pose, library)))),
    [focus, library],
  );

  // -- the cue engine: one queue and one stage for the page ---------------------
  const stage = useMemo(() => new PreviewStage(layout(rest, presence ?? {})), []); // eslint-disable-line react-hooks/exhaustive-deps
  const queue = useMemo(
    () =>
      new CueQueue({
        stage,
        registry: workshopRegistry(),
        data: cueData,
        mode: 'replay',
        reducedMotion,
        // The comic motion lane (D149, D152): where comic FX and on twos START —
        // the queue bar's checkboxes flip them on the queue itself.
        comic: initialMotion().comic,
        onTwos: initialMotion().twos,
        onNote: (message) => {
          console.info(`[workshop] ${message}`);
        },
      }),
    [stage], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    queue.data = cueData;
    queue.setReducedMotion(reducedMotion);
    stage.turn = turn;
  }, [queue, stage, cueData, reducedMotion, turn]);

  const [shown, setShown] = useState<Shown>(() => ({ state: rest, batch: null, n: 0 }));
  const restRef = useRef(rest);
  restRef.current = rest;
  const autoRestRef = useRef(autoRest);
  autoRestRef.current = autoRest;
  const enqueueing = useRef(false);

  // A new card, stance or seat: everything playing snaps, and the pedestal rests.
  useEffect(() => {
    enqueueing.current = true;
    queue.flushAndSnap();
    enqueueing.current = false;
    setShown((s) => ({ state: rest, batch: null, n: s.n }));
  }, [rest, queue]);

  /**
   * **The batch goes in before the canvas renders the board it belongs to** — a
   * layout effect, for `Arena.tsx`'s reason (D64): a creature that dies leaves the
   * snapshot, and `FigureLayer` decides its body's fate on its first frame by asking
   * the queue whether a death cue for it is queued.
   */
  useLayoutEffect(() => {
    const batch = shown.batch;
    if (batch === null) return;
    enqueueing.current = true;
    queue.flushAndSnap();
    const saved = queue.data;
    if (batch.data !== null) queue.data = batch.data;
    const steps = queue.enqueueBatch(batch.events, shown.state, undefined, batch.previous);
    queue.data = saved;
    enqueueing.current = false;
    setNote(steps === 0 ? `${batch.label}: no cue — only the snapshot changed` : null);
    // `n` is the batch's identity; the state and the batch arrive with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown.n]);

  // When the film runs out, the pedestal goes back to rest (unless asked not to).
  useEffect(
    () =>
      queue.onChange(() => {
        if (enqueueing.current || !queue.idle || !autoRestRef.current) return;
        setShown((s) => (s.batch === null ? s : { state: restRef.current, batch: null, n: s.n }));
      }),
    [queue],
  );

  const play = useCallback((rehearsal: Rehearsal, data: CueData | null = null, label?: string) => {
    setShown((s) => ({
      state: rehearsal.after,
      batch: { events: rehearsal.events, previous: rehearsal.before.board, data, label: label ?? rehearsal.label },
      n: s.n + 1,
    }));
  }, []);

  const playKind = useCallback(
    (kind: RehearsalKind) => {
      play(rehearse(entry, kind, options));
    },
    [entry, options, play],
  );

  // -- the body: its model, its clips and their lengths ------------------------
  // An Aura or Equipment has no body of its own: the clips are its host's.
  const bodyEntry = roleOf(entry) === 'attached' ? HOST_ENTRY : entry;
  const spec = useMemo(() => figureFor(cardOf(bodyEntry, IDS.subject, 0), FIGURE_DATA).spec, [bodyEntry]);
  const bodied = roleOf(bodyEntry) === 'creature';
  const modelId = entry.concealed !== null || !bodied ? null : spec.model;
  const clipKeys = useMemo(
    () => (modelId === null ? [] : Object.keys(MODEL_DATA.models[modelId]?.clips ?? {})),
    [modelId],
  );
  const clipMs = useCallback(
    (key: string): number => {
      const clip = modelId === null ? undefined : library?.get(modelId)?.clips.get(key);
      return clip === undefined ? 800 : Math.round(clip.duration * 1000);
    },
    [library, modelId],
  );
  const playClip = useCallback(
    (key: string) => {
      play(clipBatch(entry, options), clipCueData(cueData, bodyEntry.name, key, clipMs(key), spec.clips), `clip ${key}`);
    },
    [entry, bodyEntry.name, options, cueData, clipMs, spec.clips, play],
  );

  // D88: a ring swarm's rig stands at the centre for the clip lane and is NOT
  // drawn (`FigureLayer`'s `pose.swarm > 0 && pose.formation === 'ring'`) — the
  // bees are procedural, so a clip played on it moves nothing on screen.
  const restPose = focus[0]?.pose ?? null;
  const hiddenRig = restPose !== null && restPose.swarm > 0 && restPose.formation === 'ring';

  const rows = useMemo(
    () => cueRows(entry, cueData, FIGURE_DATA, MODEL_DATA, options),
    [entry, cueData, options],
  );

  // -- the list ----------------------------------------------------------------
  const visible = useMemo(() => {
    if (search.trim() === '') return entries;
    return entries.filter((e) => matchesSearch(e, search));
  }, [entries, search]);

  // -- the page's own keys: one table (keys.ts), each row carrying its action ----
  // A `Record` over every action, so a row with no handler does not compile; the
  // listener looks the key up in the table and runs the row's action — there is
  // no branch per key here (M4 convention 4, `workshop.test.ts` scans for one).
  const keyRef = useRef({ visible, entry, onSetView });
  keyRef.current = { visible, entry, onSetView };
  useEffect(() => {
    const step = (by: number): void => {
      const { visible: list, entry: current } = keyRef.current;
      const at = list.findIndex((e) => e.key === current.key);
      const next = list[Math.max(0, Math.min(list.length - 1, (at < 0 ? 0 : at) + by))];
      if (next !== undefined) setSelected(next.key);
    };
    const speedBy = (by: number): void => {
      const at = SPEEDS.indexOf(queue.speed as (typeof SPEEDS)[number]);
      queue.setSpeed(SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, (at < 0 ? SPEEDS.indexOf(1) : at) + by))] ?? 1);
    };
    const actions: Record<WorkshopKeyAction, () => void> = {
      pause: () => queue.setPaused(!queue.paused),
      step: () => queue.stepBatch(),
      nudge: () => queue.advance(50),
      skip: () => queue.skipAll(),
      slower: () => speedBy(-1),
      faster: () => speedBy(1),
      both: () => setOptions((o) => ({ ...o, both: !o.both })),
      facing: () => setTurn((t) => (t === 0 ? HALF_TURN : 0)),
      camera: () => setMode((m) => (m === 'front' ? 'close' : m === 'close' ? 'table' : m === 'table' ? 'wide' : 'front')),
      reducedMotion: () => setReducedMotion((r) => !r),
      previous: () => step(-1),
      next: () => step(1),
      arena: () => keyRef.current.onSetView?.('arena'),
    };
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target as (HTMLElement & { isContentEditable?: boolean }) | null;
      const action = workshopActionFor({
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        target: target === null ? null : { tagName: target.tagName, isContentEditable: target.isContentEditable },
      });
      if (action === null) return;
      event.preventDefault();
      actions[action]();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [queue]);

  // -- the dev handle, for the evidence's screenshot driver ---------------------
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const handle = window as unknown as { __mtgWorkshop?: Record<string, unknown> };
    handle.__mtgWorkshop = {
      ...(handle.__mtgWorkshop ?? {}),
      queue,
      select: (key: string) => {
        setSelected(key);
      },
      setOptions: (next: Partial<PedestalOptions>) => {
        setOptions((o) => ({ ...o, ...next }));
      },
      setMode,
      setTurn,
      setBloom,
      setLook,
      setAutoRest,
      setPersonal: setPersonalOn,
      setRelief: setReliefOn,
      play: (kind: RehearsalKind) => {
        playKind(kind);
      },
      clip: (key: string) => {
        playClip(key);
      },
      // D250: the pedestal's sound — `audio.stats` and `audio.describe()`, as on
      // `__mtgArena` (the same module: the page has one).
      audio,
    };
  }, [queue, playKind, playClip, audio]);

  const attached = roleOf(entry) === 'attached';
  const art0 = entry.concealed === null ? lookupArt(art, entry.name) : null;

  return (
    <div className="workshop">
      <header className="workshop__bar">
        <h1>mtg-table — workshop</h1>
        <span className="muted">
          {entry.label} · {entry.facts.types || '—'}
          {attached ? ' · shown on a Soldier token host' : ''}
        </span>
        {waiting !== null && (
          <span className="workshop__waiting" role="status">
            {waiting} — the game is kept; go back with ▣ arena or ▤ board
          </span>
        )}
        <span className="workshop__links">
          {art0 !== null && art0.scryfallId !== '' && (
            // The card's printed text is the card browser's: its own deep link,
            // from the id `art.json` already carries (no request is made here).
            <a
              href={cardsHref(art0.scryfallId)}
              title={`${entry.name} in the card browser (#cards) — its rules text, prints and legalities`}
            >
              ≡ card text
            </a>
          )}
          <a
            href="#arena"
            onClick={(event) => {
              event.preventDefault();
              onSetView?.('arena');
            }}
            title="Back to the arena — a replay resumes at the frame it was on, a live game keeps its socket (the way back from I, D241)"
          >
            ▣ arena
          </a>
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              onSetView?.('board');
            }}
          >
            ▤ board
          </a>
        </span>
        <span className="workshop__credit">
          Card images and data from <a href="https://scryfall.com">Scryfall</a>
          {art0 !== null && <> · {entry.name} · art by {art0.artist}</>} · © Wizards of the Coast · Unofficial
          Fan Content
        </span>
      </header>

      <CardList
        entries={visible}
        all={entries.length}
        selected={entry.key}
        search={search}
        onSearch={setSearch}
        onSelect={setSelected}
        art={art}
        traits={traits}
        personalNames={personalNames}
        standeeNames={standeeNames}
      />

      <section className="workshop__stage" aria-label="Pedestal">
        <Toolbar
          options={options}
          onOptions={setOptions}
          mode={mode}
          onMode={setMode}
          turn={turn}
          onTurn={setTurn}
          bloom={bloom}
          onBloom={setBloom}
          look={look}
          onLook={setLook}
          personal={personalOn}
          onPersonal={setPersonalOn}
          personalCount={overlay.entries.length}
          standeeCount={RELIEF_BASE === null ? 0 : standeeCount}
          inspectable={inspectSource !== null && focus[0]?.pose !== null && focus[0]?.pose !== undefined}
          relief={reliefOn}
          onRelief={setReliefOn}
          reliefAvailable={reliefAvailable}
        />
        <div className="workshop__pedestal">
          <Pedestal
            state={shown.state}
            art={art}
            cueData={cueData}
            figures={FIGURE_DATA}
            models={MODEL_DATA}
            traits={traits}
            turn={turn}
            mode={mode}
            split={options.both}
            focus={focus}
            seat={seat}
            queue={queue}
            stage={stage}
            reducedMotion={reducedMotion}
            bloom={bloom}
            look={look}
            audio={audio}
            personal={pedestalOverlay}
            personalLoaded={personalLoaded}
            standee={pedestalStandee}
            inspect={inspect}
          />
          <PedestalCaption
            focus={focus}
            drawn={drawn}
            mode={mode}
            both={options.both}
            turn={turn}
            relief={inspect === null ? null : inspect.depth !== null}
          />
        </div>
        <QueueBar
          queue={queue}
          reducedMotion={reducedMotion}
          onReducedMotion={setReducedMotion}
          autoRest={autoRest}
          onAutoRest={setAutoRest}
          playing={shown.batch?.label ?? null}
          onRest={() => {
            queue.skipAll();
            setShown((s) => ({ state: rest, batch: null, n: s.n }));
          }}
          note={note}
        />
      </section>

      <aside className="workshop__panel" aria-label="Actions and tuning">
        <ClipsPanel
          entry={entry}
          modelId={modelId}
          dressed={restPose?.personal !== undefined}
          hiddenRig={hiddenRig}
          clipKeys={clipKeys}
          aliases={spec.clips}
          clipMs={clipMs}
          onClip={playClip}
          stance={options.stance}
          onStance={(stance) => {
            setOptions((o) => ({ ...o, stance }));
          }}
        />
        <CuesPanel
          rows={rows}
          unreached={unreachedSelectors(entry, rows, cueData)}
          onPlay={playKind}
          sound={soundOn}
          onSound={onSound}
        />
        <TuningPanel
          entry={entry}
          pose={restPose}
          artPalette={entry.concealed === null ? (palettes.get(entry.name) ?? null) : null}
          traits={traits}
          overrides={overrides}
          onOverrides={setOverrides}
          traitErrors={traitResult.errors}
        />
        <CueTuningPanel entry={entry} overrides={overrides} onOverrides={setOverrides} cueErrors={cueResult.errors} />
        <LegibilityPanel entry={entry} traits={traits} cueData={cueData} library={library} turn={turn} />
        <KeyLegend />
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The list
// ---------------------------------------------------------------------------

const GROUP_TITLE: Readonly<Record<WorkshopEntry['group'], string>> = {
  deck: 'Deck',
  token: 'Tokens the corpus has seen',
  archetype: 'Generic archetypes',
  hidden: 'Concealed (hard rule 8)',
};

function CardList({
  entries,
  all,
  selected,
  search,
  onSearch,
  onSelect,
  art,
  traits,
  personalNames,
  standeeNames,
}: {
  entries: readonly WorkshopEntry[];
  all: number;
  selected: string;
  search: string;
  onSearch: (value: string) => void;
  onSelect: (key: string) => void;
  art: ArtIndex;
  traits: TraitData;
  /** The cards an active personal model dresses (D196) — the overlay's names; empty in a build. */
  personalNames: ReadonlySet<string>;
  /** D260: the face-up cards the relief cache can stand as a standee (no personal model dresses them); empty in a build. */
  standeeNames: ReadonlySet<string>;
}): JSX.Element {
  let lastHeading = '';
  return (
    <nav className="workshop__list" aria-label="Cards">
      <input
        className="workshop__search"
        type="search"
        placeholder={`search ${String(all)} cards — name, type, deck`}
        value={search}
        onChange={(event) => {
          onSearch(event.currentTarget.value);
        }}
        aria-label="Search cards"
      />
      <ul>
        {entries.map((entry) => {
          const heading = entry.group === 'deck' ? (entry.deck ?? 'Deck') : GROUP_TITLE[entry.group];
          const showHeading = heading !== lastHeading;
          lastHeading = heading;
          const rung = rungsOf(entry, FIGURE_DATA, traits);
          const hit = entry.concealed === null ? lookupArt(art, entry.name) : null;
          return (
            <li key={entry.key}>
              {showHeading && <h3 className="workshop__heading">{heading}</h3>}
              <button
                type="button"
                className={`workshop__row${entry.key === selected ? ' workshop__row--on' : ''}`}
                onClick={() => {
                  onSelect(entry.key);
                }}
                title={rung.details.join('\n')}
                aria-pressed={entry.key === selected}
              >
                {/*
                  **The list's thumbnail is the one card image the workshop draws
                  outside a renderer, and it is not a `CardTile`** — exempt the way
                  the card browser's `CardView` is (D94, CLAUDE.md M4 convention 2):
                  the list is public card data, never a game. Every entry is a card
                  a committed deck names, a token or an archetype, with facts read
                  only from FACE-UP sightings (`catalogBuild.ts`), and a concealed
                  entry never looks its art up at all (`entry.concealed === null`
                  above) — it draws a card back. The pedestal itself draws every
                  card through the arena's `CardPlane`. `workshop.test.ts` holds
                  both: one `imageUrl(` in the workshop, and every `lookupArt(`
                  guarded by `concealed === null`.
                */}
                {hit !== null ? (
                  <img
                    className="workshop__thumb"
                    src={imageUrl(hit, 'thumb')}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    title={`art by ${hit.artist}`}
                  />
                ) : (
                  <span className={`workshop__thumb workshop__thumb--none${entry.concealed !== null ? ' workshop__thumb--back' : ''}`} aria-hidden="true" />
                )}
                <span className="workshop__rowtext">
                  <span className="workshop__name">
                    {entry.label}
                    {entry.count !== null && entry.count > 1 && <span className="muted"> ×{entry.count}</span>}
                    {entry.section === 'sideboard' && <span className="muted"> (sb)</span>}
                  </span>
                  <span className="workshop__types muted">
                    {entry.concealed === null && personalNames.has(entry.name) && (
                      <span className="workshop__personal" title="an active personal model dresses this card on this machine (D190: never committed, never published)">
                        personal
                      </span>
                    )}
                    {entry.concealed === null && standeeNames.has(entry.name) && (
                      <span className="workshop__personal" title="the relief cache stands this card's painting as a standee on this machine (D260: card-art-derived, never committed, never published)">
                        standee
                      </span>
                    )}
                    {entry.facts.types || entry.note || '—'}
                  </span>
                </span>
                <span className={`workshop__rung workshop__rung--${rung.level}`}>{rung.level}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// The toolbar over the pedestal
// ---------------------------------------------------------------------------

function Toolbar({
  options,
  onOptions,
  mode,
  onMode,
  turn,
  onTurn,
  bloom,
  onBloom,
  look,
  onLook,
  personal,
  onPersonal,
  personalCount,
  standeeCount,
  inspectable,
  relief,
  onRelief,
  reliefAvailable,
}: {
  options: PedestalOptions;
  onOptions: (next: PedestalOptions | ((o: PedestalOptions) => PedestalOptions)) => void;
  mode: CameraMode;
  onMode: (mode: CameraMode) => void;
  turn: number;
  onTurn: (turn: number) => void;
  bloom: boolean;
  onBloom: (on: boolean) => void;
  look: LookSpec;
  onLook: (look: LookSpec) => void;
  personal: boolean;
  onPersonal: (on: boolean) => void;
  /** Active personal models on this dev server — none in a build. */
  personalCount: number;
  /** D260: how many standee cuts the relief cache has (0 in a build). */
  standeeCount: number;
  /** Whether the card has a figure and an image to inspect. */
  inspectable: boolean;
  /** The relief window (D226): the inspect view's painting displaced by its depth map, or flat. */
  relief: boolean;
  onRelief: (on: boolean) => void;
  /** Whether this dev server's relief cache has a depth map for this card — never in a build. */
  reliefAvailable: boolean;
}): JSX.Element {
  const modes: ReadonlyArray<{ id: CameraMode; label: string; what: string }> = [
    {
      id: 'front',
      label: '1× front',
      what: 'the card and its figure filling the view, from the side the figure FACES — its identifying side — drag to orbit',
    },
    {
      id: 'close',
      label: '1× from your seat',
      what: 'the same close-up from the table view’s direction — what your seat sees (D143: a figure’s back) — drag to orbit',
    },
    { id: 'table', label: 'table distance', what: 'exactly the size it has in view 1 at 1600×900 (fixed camera)' },
    { id: 'wide', label: 'whole table', what: 'view 1 itself — drag to orbit' },
    {
      id: 'inspect',
      label: 'inspect',
      what: 'the figure in its signature pose, the card’s art box enlarged behind it — a window with depth where the relief cache has the painting’s depth map — and its frame and text floating beside it (D196, D226); drag to orbit',
    },
  ];
  return (
    <div className="workshop__toolbar" role="group" aria-label="Pedestal view">
      <span className="workshop__seg">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            className={m.id === mode ? 'on' : ''}
            aria-pressed={m.id === mode}
            title={m.id === 'inspect' && !inspectable ? 'this card has no figure or no image to inspect' : m.what}
            disabled={m.id === 'inspect' && !inspectable}
            onClick={() => {
              onMode(m.id);
            }}
          >
            {m.label}
          </button>
        ))}
      </span>
      <label
        title={
          !reliefAvailable
            ? 'no depth map for this card on this dev server, or one made before the back layer — the relief tool (relief.mjs) makes them: the personal tier’s relief cache, D225, card-art-derived and never committed'
            : mode !== 'inspect'
              ? 'the inspect view’s painting with depth (D226, D227) — switch to inspect'
              : 'the painting in two layers behind a still window, parallax as you orbit (D226, D227) — off: the flat picture'
        }
      >
        <input
          type="checkbox"
          checked={relief && reliefAvailable}
          disabled={!reliefAvailable || mode !== 'inspect'}
          onChange={(event) => {
            onRelief(event.currentTarget.checked);
          }}
        />{' '}
        relief
      </label>
      <span
        className="workshop__seg"
        title={
          personalCount === 0 && standeeCount === 0
            ? 'no personal model and no standee on this dev server (the gitignored personal tier, D190 — never committed)'
            : `the pedestal in your own models (${String(personalCount)} active) and standees (${String(standeeCount)} cut from the relief cache, D260) on this dev server — D190: never committed, never published — or in the CC0 figures`
        }
      >
        <button type="button" className={personal ? 'on' : ''} aria-pressed={personal} disabled={personalCount === 0 && standeeCount === 0} onClick={() => onPersonal(true)}>
          personal
        </button>
        <button type="button" className={!personal ? 'on' : ''} aria-pressed={!personal} disabled={personalCount === 0 && standeeCount === 0} onClick={() => onPersonal(false)}>
          repo
        </button>
      </span>
      <label title="Your copy on the left, the opponent's on the right, seen from the same angle">
        <input
          type="checkbox"
          checked={options.both}
          onChange={(event) => {
            const both = event.currentTarget.checked;
            onOptions((o) => ({ ...o, both }));
          }}
        />{' '}
        both seats
      </label>
      <span className="workshop__seg" title="D143 (PLAN question 13, decided): a seat's figures face the other seat — the arena. 'faces its player' previews the facing before D143">
        <button
          type="button"
          className={turn === 0 ? 'on' : ''}
          aria-pressed={turn === 0}
          title="the arena since D143: your figures show you their backs, the opponent's their fronts"
          onClick={() => onTurn(0)}
        >
          faces the other seat
        </button>
        <button
          type="button"
          className={turn !== 0 ? 'on' : ''}
          aria-pressed={turn !== 0}
          title="the facing before D143, previewed: every figure turned to face its own player"
          onClick={() => onTurn(HALF_TURN)}
        >
          faces its player
        </button>
      </span>
      <label title="An opposing creature for attacks, blocks and spells to aim at (single seat)">
        <input
          type="checkbox"
          checked={options.dummy}
          disabled={options.both}
          onChange={(event) => {
            const dummy = event.currentTarget.checked;
            onOptions((o) => ({ ...o, dummy }));
          }}
        />{' '}
        target dummy
      </label>
      <label title="The arena's one post pass (single view only)">
        <input
          type="checkbox"
          checked={bloom}
          onChange={(event) => {
            onBloom(event.currentTarget.checked);
          }}
        />{' '}
        bloom
      </label>
      <span className="workshop__seg" title="The look (D137): the comic look (the arena's default) against D53's hologram">
        <button
          type="button"
          className={look.look === 'holo' ? 'on' : ''}
          aria-pressed={look.look === 'holo'}
          title="D53's hologram — still the anonymous figure's and the ghosted spell's under the comic look (D142)"
          onClick={() => onLook(lookSpecOf('holo'))}
        >
          holo
        </button>
        <button
          type="button"
          className={look.look === 'comic' ? 'on' : ''}
          aria-pressed={look.look === 'comic'}
          title="three cel bands from a lens-fixed key, rim, specular dot, halftone, ink, contact shadow, the stage"
          onClick={() => onLook(lookSpecOf('comic'))}
        >
          comic
        </button>
      </span>
      <span className="workshop__seg" title="The comic look's parts, one at a time (report 15 §9.1's A/B)">
        {(
          [
            [
              'ink',
              bloom
                ? 'the depth-edge ink line on figures (D139, D146; single view only — it rides bloom’s composer)'
                : 'the ink line rides bloom’s composer (D146): tick bloom to see it',
              look.ink !== 'none' && bloom,
              { ink: look.ink !== 'none' ? 'none' : 'post' },
            ],
            ['halftone', 'the halftone screen in the core shadow', look.halftone, { halftone: !look.halftone }],
            ['shadow', 'the contact shadow under each figure (D140)', look.shadow, { shadow: !look.shadow }],
            ['stage', 'the comic stage and backdrop (D141) — off is the hologram\'s felt', look.stage === 'comic', { stage: look.stage === 'comic' ? 'felt' : 'comic' }],
            ['world key', 'the key light fixed to the world instead of the lens (D138)', look.key === 'world', { key: look.key === 'world' ? 'lens' : 'world' }],
          ] as const
        ).map(([label, what, on, next]) => (
          <button
            key={label}
            type="button"
            className={on && look.look === 'comic' ? 'on' : ''}
            aria-pressed={on}
            disabled={look.look !== 'comic' || (label === 'ink' && !bloom)}
            title={what}
            onClick={() => onLook({ ...look, ...next })}
          >
            {label}
          </button>
        ))}
      </span>
    </div>
  );
}

function PedestalCaption({
  focus,
  drawn,
  mode,
  both,
  turn,
  relief,
}: {
  focus: readonly Framing[];
  /** Each framed body's drawn height in view 1 at 1600×900, px; `null` until figures.glb is in. */
  drawn: ReadonlyArray<number | null> | null;
  mode: CameraMode;
  both: boolean;
  turn: number;
  /**
   * INSPECT: whether the painting is drawn with its depth (D226); `null` outside
   * inspect, and in inspect when there is nothing to inspect (a concealed entry,
   * or no figure).
   */
  relief: boolean | null;
}): JSX.Element {
  const size = (i: number): string => {
    const f = focus[i];
    if (f === undefined || f.figureHeight <= 0) return '';
    if (drawn === null) return 'measuring…';
    const px = drawn[i];
    // The body as drawn — its rest clip's real vertices through view 1's camera
    // (a hidden swarm rig, or a disc, has none).
    return px === null || px === undefined ? '' : `body ${String(Math.round(px))} px tall in view 1`;
  };
  return (
    <div className="workshop__caption" aria-hidden="true">
      {both && mode !== 'wide' ? (
        <>
          <span className="workshop__divider" />
          <span>your seat{size(0) !== '' ? ` · ${size(0)}` : ''}</span>
          <span>the opponent’s seat{size(1) !== '' ? ` · ${size(1)}` : ''}</span>
        </>
      ) : (
        <span>
          {mode === 'table'
            ? 'table distance (view 1, 1600×900)'
            : mode === 'wide'
              ? 'view 1'
              : mode === 'front'
                ? '1× close-up, from the front'
                : mode === 'inspect'
                  ? relief === null
                    ? 'inspect: no art to inspect (concealed or no figure)'
                    : relief
                      ? 'inspect: the card’s art behind the figure, with depth — orbit for the parallax — its frame beside it'
                      : 'inspect: the card’s art behind the figure (flat), its frame beside it'
                  : '1× close-up, from your seat'}
          {size(0) !== '' ? ` · ${size(0)}` : ''}
          {turn !== 0 ? ' · facing preview: the other seat' : ''}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The queue's own controls
// ---------------------------------------------------------------------------

function QueueBar({
  queue,
  reducedMotion,
  onReducedMotion,
  autoRest,
  onAutoRest,
  playing,
  onRest,
  note,
}: {
  queue: CueQueue;
  reducedMotion: boolean;
  onReducedMotion: (on: boolean) => void;
  autoRest: boolean;
  onAutoRest: (on: boolean) => void;
  playing: string | null;
  onRest: () => void;
  note: string | null;
}): JSX.Element {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => queue.onChange(bump), [queue]);
  const pending = queue.pendingSteps;
  return (
    <div className="workshop__queue" role="group" aria-label="Cue playback">
      <button
        type="button"
        onClick={() => {
          queue.setPaused(!queue.paused);
        }}
      >
        {queue.paused ? '▶ play' : '⏸ pause'}
      </button>
      <button type="button" disabled={pending === 0} onClick={() => queue.stepBatch()}>
        step
      </button>
      <button
        type="button"
        disabled={pending === 0}
        onClick={() => {
          // `advance` moves the clock without a change signal; say what it did.
          queue.advance(50);
          bump();
        }}
        title="advance the cue clock 50 ms"
      >
        +50 ms
      </button>
      <button type="button" disabled={pending === 0} onClick={() => queue.skipCurrent()}>
        skip cue
      </button>
      <button type="button" disabled={pending === 0} onClick={() => queue.skipAll()}>
        skip all
      </button>
      <label>
        speed{' '}
        <select
          value={String(queue.speed)}
          onChange={(event) => {
            queue.setSpeed(Number(event.currentTarget.value));
          }}
        >
          {SPEEDS.map((s) => (
            <option key={s} value={String(s)}>
              {s}×
            </option>
          ))}
        </select>
      </label>
      <label title="§8 rule 7: cues at 30%, no clip, no shake, no camera">
        <input type="checkbox" checked={reducedMotion} onChange={(event) => onReducedMotion(event.currentTarget.checked)} />{' '}
        reduced motion
      </label>
      {/* The comic motion lane's two switches (D149, D152): the queue's own
          settings, as in the arena's cue strip. */}
      <label title="Comic FX: impact stars and their lettering, ink splats, halftone dots, speed lines, the hologram-to-ink summon (seen under the comic look) — off is the film as it was. (A camera shake is dropped here: the pedestal's camera is yours.)">
        <input
          type="checkbox"
          checked={queue.comic}
          onChange={(event) => {
            queue.setComic(event.currentTarget.checked);
          }}
        />{' '}
        comic FX
      </label>
      <label title={reducedMotion ? 'On twos is off while reduced motion is on (§8 rule 7)' : 'Animate on twos: every cue stepped to twelve drawings a second'}>
        <input
          type="checkbox"
          checked={queue.twosActive}
          disabled={reducedMotion}
          onChange={(event) => {
            queue.setOnTwos(event.currentTarget.checked);
          }}
        />{' '}
        on twos
      </label>
      <label title="Put the card back at rest when the film runs out">
        <input type="checkbox" checked={autoRest} onChange={(event) => onAutoRest(event.currentTarget.checked)} /> back to
        rest
      </label>
      <button type="button" onClick={onRest}>
        rest
      </button>
      <span className="muted workshop__status">
        {pending > 0
          ? `${playing ?? 'playing'} · ${String(pending)} step${pending === 1 ? '' : 's'} · ${String(Math.round(queue.totalRemainingMs()))} ms${queue.paused ? ' · paused' : ''}`
          : (note ?? (queue.paused ? 'paused — idle' : 'idle'))}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Actions: clips and cues
// ---------------------------------------------------------------------------

function ClipsPanel({
  entry,
  modelId,
  dressed,
  hiddenRig,
  clipKeys,
  aliases,
  clipMs,
  onClip,
  stance,
  onStance,
}: {
  entry: WorkshopEntry;
  modelId: string | null;
  /**
   * The pedestal stands the card in the user's own model (D195): the clips are the
   * ones baked into it (D194), so the panel names no CC0 body — and no slug.
   */
  dressed: boolean;
  /** The body is posed but not drawn (a ring swarm's rig, D88): its clips move nothing visible. */
  hiddenRig: boolean;
  clipKeys: readonly string[];
  aliases: Readonly<Record<string, string>>;
  clipMs: (key: string) => number;
  onClip: (key: string) => void;
  stance: StanceChoice;
  onStance: (stance: StanceChoice) => void;
}): JSX.Element {
  const aliased = new Map<string, string>();
  for (const [generic, alias] of Object.entries(aliases)) aliased.set(alias, generic);
  const role = roleOf(entry);
  const bodied = role === 'creature' || role === 'attached';
  return (
    <details className="workshop__box" open>
      <summary>
        Clips{' '}
        <span className="muted">
          —{' '}
          {modelId === null
            ? 'no body with a model: nothing to play'
            : dressed
              ? 'your model (the personal tier: our clips, baked into it)'
              : `the ${modelId} body${entry.name !== '' && roleOf(entry) === 'attached' ? ' of its host' : ''}`}
          {hiddenRig ? ' · hidden rig: the swarm is procedural' : ''}
        </span>
      </summary>
      {hiddenRig && (
        <p className="workshop__warn">
          Hidden rig: the swarm is procedural. The {modelId} rig stands at the centre for the clip lane and is not
          drawn (D88) — the bees are instances of one prop kind — so a clip below plays on a body you cannot see.
        </p>
      )}
      {bodied && (
        <div className="workshop__stances" role="group" aria-label="Stance">
          <span className="muted">stance (from the snapshot):</span>
          {STANCE_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              className={choice === stance ? 'on' : ''}
              aria-pressed={choice === stance}
              onClick={() => onStance(choice)}
              title={choice === 'tapped' ? 'the crouch: a tapped creature kneels, it does not turn with its card' : undefined}
            >
              {choice === 'tapped' ? 'tapped (kneel)' : choice}
            </button>
          ))}
        </div>
      )}
      {modelId !== null && (
        <div className="workshop__clips">
          {clipKeys.map((key) => {
            const cardAlias = aliased.get(key);
            const overridden = aliases[key];
            return (
              <button
                key={key}
                type="button"
                className={hiddenRig ? 'workshop__clip--hidden' : undefined}
                onClick={() => onClip(key)}
                title={
                  hiddenRig
                    ? `${String(clipMs(key))} ms — hidden rig: the swarm is procedural, so nothing visible moves`
                    : `${String(clipMs(key))} ms — played through the real clip lane, no offset`
                }
              >
                ▶ {key}
                {cardAlias !== undefined && <span className="muted"> (this card’s {cardAlias})</span>}
                {overridden !== undefined && <span className="muted"> → {overridden}</span>}
              </button>
            );
          })}
        </div>
      )}
      {role === 'attached' && <p className="muted">The host (a Soldier token) wears the look; its body’s clips play under it.</p>}
    </details>
  );
}

const SOURCE_TITLE: Readonly<Record<string, string>> = {
  card: "the card's own cues.json entry",
  archetype: 'an archetype entry of cues.json',
  default: 'the §6 default (defaults.ts)',
  none: 'nothing: animates as nothing',
};

function CuesPanel({
  rows,
  unreached,
  onPlay,
  sound,
  onSound,
}: {
  rows: readonly CueRow[];
  unreached: readonly string[];
  onPlay: (kind: RehearsalKind) => void;
  /** D250 — the pedestal's sound, through the arena's own audio module. */
  sound: boolean;
  onSound: (on: boolean) => void;
}): JSX.Element {
  return (
    <details className="workshop__box" open>
      <summary>
        Cues <span className="muted">— a synthetic batch through the real queue</span>
      </summary>
      <label
        className="workshop__sound"
        title="Play each cue's sound on the pedestal, through the arena's own audio module — muted until ticked. A face-down or hidden card plays only its event's default sound (hard rule 8)."
      >
        <input
          type="checkbox"
          checked={sound}
          onChange={(event) => {
            onSound(event.currentTarget.checked);
          }}
        />{' '}
        sound
      </label>
      <table className="workshop__cues">
        <tbody>
          {rows.map((row) => (
            <tr key={row.kind}>
              <td>
                <button type="button" onClick={() => onPlay(row.kind)} title={row.fiction ?? undefined}>
                  ▶ {row.label}
                </button>
              </td>
              <td>
                {row.lines.length === 0 && <span className="muted">no cue</span>}
                {row.lines.map((line, i) => (
                  <div key={`${line.cue}:${String(i)}`} className="workshop__cueline">
                    <code className={line.known ? '' : 'bad'}>{line.cue}</code>{' '}
                    <span className={`workshop__src workshop__src--${line.source}`} title={SOURCE_TITLE[line.source]}>
                      {line.source}
                    </span>{' '}
                    <span className="muted">
                      {line.selector} · {line.ms} ms{line.on !== 'subject' ? ` · on ${line.on}` : ''}
                      {line.clip !== '—' ? ` · clip ${line.clip}` : ''}
                      {line.sound !== '—' ? ` · sound ${line.sound}` : ''}
                    </span>
                    {line.outranks !== null && (
                      <span
                        className="workshop__outranks"
                        title="§7.3 resolves rung first, then selector: this rung's less specific key wins over a more specific one below it. Intended or not is the cue file's call."
                      >
                        {' '}
                        ⚠ outranks the {line.outranks.source}’s <code>{line.outranks.selector}</code> →{' '}
                        <code>{line.outranks.cue}</code>
                      </span>
                    )}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {unreached.length > 0 && (
        <p className="workshop__warn">
          cues.json keys no rehearsal reaches: {unreached.map((s) => <code key={s}>{s} </code>)}
        </p>
      )}
      <p className="muted workshop__fine">
        What a spell or trigger targets is the engine’s to say; here the workshop aims it at the target dummy, the other
        seat’s copy, or an Aura’s host. A cue that asks for a camera move is dropped: the pedestal’s camera is yours.
      </p>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function TuningPanel({
  entry,
  pose,
  artPalette,
  traits,
  overrides,
  onOverrides,
  traitErrors,
}: {
  entry: WorkshopEntry;
  /** The card's resting pose on the pedestal — the body it stands in and the palette it is drawn in. */
  pose: FigurePose | null;
  /** Lane BODIES: the card's art palette (`arena/art.ts`), or `null` while unread / with no art. */
  artPalette: ArtPalette | null;
  traits: TraitData;
  overrides: Overrides;
  onOverrides: (next: Overrides) => void;
  traitErrors: readonly FigureProblem[];
}): JSX.Element {
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    setCopied(null);
  }, [entry.key]);

  if (entry.concealed !== null) {
    return (
      <details className="workshop__box" open>
        <summary>Tuning</summary>
        <p className="muted">A concealed card never reaches traits.json — it is anonymous by rule (hard rule 8).</p>
      </details>
    );
  }
  const role = roleOf(entry);
  if (role !== 'creature' && role !== 'vehicle') {
    const where =
      role === 'attached'
        ? 'its look on the host is figures.json’s attachments table'
        : role === 'land'
          ? 'its tile is figures.json’s lands table'
          : 'it has no body on the table';
    return (
      <details className="workshop__box" open>
        <summary>Tuning</summary>
        <p className="muted">traits.json is identity for a body — a creature’s, or a Vehicle’s silhouette; {where}.</p>
      </details>
    );
  }
  const name = entry.name;
  const overridden = overrides.traits[name] !== undefined;
  const row: RawRow = overrides.traits[name] ?? committedRow(name);
  const resolved = traitFor(cardOf(entry, IDS.subject, 0), traits);
  const s = resolved.spec;
  const set = (key: string, value: unknown): void => {
    const next: RawRow = { ...row };
    if (value === undefined) delete next[key];
    else next[key] = value;
    onOverrides(withTraitRow(overrides, name, next));
  };
  const num = (key: string, value: number, min: number, max: number, stepBy: number): JSX.Element => (
    <label className="workshop__field">
      <span>{key}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={stepBy}
        value={String(row[key] ?? value)}
        onChange={(event) => {
          const n = Number.parseFloat(event.currentTarget.value);
          set(key, Number.isFinite(n) ? n : undefined);
        }}
      />
      <em className="muted">{row[key] === undefined ? 'inherited' : 'this card'}</em>
    </label>
  );
  const colour = (key: 'tint' | 'accent', value: string | null): JSX.Element => {
    const current = typeof row[key] === 'string' ? (row[key] as string) : value;
    return (
      <label className="workshop__field">
        <span>{key}</span>
        <input
          type="color"
          value={current ?? '#ffffff'}
          onChange={(event) => {
            set(key, event.currentTarget.value);
          }}
        />
        <code>{current ?? 'inherit'}</code>
        {row[key] !== undefined && (
          <button type="button" onClick={() => set(key, undefined)} title="inherit from the rung below">
            ×
          </button>
        )}
      </label>
    );
  };
  const props = Array.isArray(row['props']) ? (row['props'] as string[]) : [...s.props];
  // `validateTraits`: a row that turns its figure must say its turned width/height
  // ratio in the SAME row — a ratio on a rung below does not count — or the whole
  // row is dropped and the card loses every per-card field it had.
  const turnsHere = typeof row['turn'] === 'number' && row['turn'] !== 0;
  const ratioMissing = turnsHere && row['turnedRatio'] === undefined;
  /**
   * Setting `turn` carries the ratio with it when one is already known — the
   * resolved one, from a rung below — because the validator wants it in this row.
   * With none known the field says it is required rather than inventing a number
   * (the ratio is a measurement of the model, `traits.test.ts`'s).
   */
  const setTurnRow = (value: number | undefined): void => {
    const next: RawRow = { ...row };
    if (value === undefined) delete next['turn'];
    else next['turn'] = value;
    if (value !== undefined && value !== 0 && next['turnedRatio'] === undefined && s.turnedRatio !== null) {
      next['turnedRatio'] = s.turnedRatio;
    }
    onOverrides(withTraitRow(overrides, name, next));
  };
  const mine = traitErrors.filter((problem) => problem.where.startsWith(`$.cards[${JSON.stringify(name)}]`));
  /**
   * **Slice 4's costume** (D97): this row's `costume` block, slot by slot, merged
   * down the ladder by `traits.ts` and filled by `pose.ts`'s `costumeOf` — so the
   * swatch is what the body is DRAWN in (the pose's palette), the code is what the
   * data says, and the label says where it came from. A slot left out of the row
   * is inherited; the block goes when its last slot does.
   */
  const costumeRow: Partial<Record<CostumeSlot, string>> =
    typeof row['costume'] === 'object' && row['costume'] !== null && !Array.isArray(row['costume'])
      ? (row['costume'] as Partial<Record<CostumeSlot, string>>)
      : {};
  const setSlot = (slot: CostumeSlot, value: string | undefined): void => {
    const next: Partial<Record<CostumeSlot, string>> = { ...costumeRow };
    if (value === undefined) delete next[slot];
    else next[slot] = value;
    set('costume', Object.keys(next).length === 0 ? undefined : next);
  };
  const palette = pose?.costume ?? null;
  // `"body": "chibi"` stands the card in `<model>-chibi` only when the library has
  // one (pose.ts); otherwise the proportioned body stays, and the panel says so.
  const chibiMissing = s.body === 'chibi' && pose !== null && pose.modelId !== null && !pose.modelId.endsWith('-chibi');

  return (
    <details className="workshop__box" open>
      <summary>
        Tuning <span className="muted">— {overridden ? 'OVERRIDDEN in this browser' : 'the committed traits.json'}</span>
      </summary>
      <p className="muted workshop__fine">
        rungs: {resolved.rungs.length === 0 ? 'default' : resolved.rungs.join(' + ')} · edits apply live, stay in this
        browser (localStorage) and are never written to the repo.
      </p>
      <div className="workshop__fields">
        {num('scale', s.scale, 0.2, 4, 0.05)}
        {num('hover', s.hover, 0, 2, 0.01)}
        <label className="workshop__field">
          <span>idle</span>
          <select value={String(row['idle'] ?? s.idle)} onChange={(event) => set('idle', event.currentTarget.value)}>
            {IDLE_STYLES.map((style) => (
              <option key={style}>{style}</option>
            ))}
          </select>
        </label>
        {colour('tint', s.tint)}
        {colour('accent', s.accent)}
        {num('shade', s.shade, 0.3, 1.5, 0.02)}
        <label className="workshop__field">
          <span>turn</span>
          <input
            type="number"
            min={-180}
            max={180}
            step={5}
            value={String(row['turn'] ?? s.turn)}
            onChange={(event) => {
              const n = Number.parseFloat(event.currentTarget.value);
              setTurnRow(Number.isFinite(n) ? n : undefined);
            }}
          />
          <em className="muted">{row['turn'] === undefined ? 'inherited' : 'this card'}</em>
        </label>
        <label className="workshop__field">
          <span>turnedRatio</span>
          <input
            type="number"
            min={0.1}
            max={4}
            step={0.01}
            placeholder="—"
            value={row['turnedRatio'] !== undefined ? String(row['turnedRatio']) : s.turnedRatio !== null ? String(s.turnedRatio) : ''}
            onChange={(event) => {
              const n = Number.parseFloat(event.currentTarget.value);
              set('turnedRatio', Number.isFinite(n) ? n : undefined);
            }}
          />
          <em className={ratioMissing ? 'workshop__need' : 'muted'}>
            {row['turnedRatio'] !== undefined
              ? 'this card'
              : ratioMissing
                ? 'required, not set — measure the turned width/height'
                : s.turnedRatio !== null
                  ? 'inherited'
                  : 'not set'}
          </em>
        </label>
        {num('swarm', s.swarm, 0, 8, 1)}
        <label className="workshop__field">
          <span>formation</span>
          <select value={String(row['formation'] ?? s.formation)} onChange={(event) => set('formation', event.currentTarget.value)}>
            {FORMATIONS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="workshop__field">
          <span>silhouette</span>
          <select
            value={String(row['silhouette'] === undefined ? (s.silhouette ?? 'none') : (row['silhouette'] ?? 'none'))}
            onChange={(event) => set('silhouette', event.currentTarget.value === 'none' ? null : event.currentTarget.value)}
          >
            <option value="none">none</option>
            <option value="carrier">carrier</option>
          </select>
        </label>
        {num('shrink', s.shrink ?? 1, 0.05, 1, 0.01)}
        <div className="workshop__field workshop__field--wide">
          <span>props</span>
          <span className="workshop__props">
            {PROP_KINDS.map((kind) => (
              <label key={kind}>
                <input
                  type="checkbox"
                  checked={props.includes(kind)}
                  onChange={(event) => {
                    const on = event.currentTarget.checked;
                    set('props', on ? [...props.filter((k) => k !== kind), kind] : props.filter((k) => k !== kind));
                  }}
                />
                {kind}
              </label>
            ))}
          </span>
        </div>
        <label className="workshop__field">
          <span>body</span>
          <select value={String(row['body'] ?? s.body)} onChange={(event) => set('body', event.currentTarget.value)}>
            {BODY_STYLES.map((style) => (
              <option key={style}>{style}</option>
            ))}
          </select>
          <em className={chibiMissing ? 'workshop__need' : 'muted'}>
            {row['body'] === undefined ? 'inherited' : 'this card'}
            {chibiMissing ? ` · no ${String(pose?.modelId)}-chibi in the library: the body stays` : ''}
          </em>
          {row['body'] !== undefined && (
            <button type="button" onClick={() => set('body', undefined)} title="inherit from the rung below">
              ×
            </button>
          )}
        </label>
        {/* Lane BODIES (D156–D160): the resting pose, the hair, the face, the art rung. */}
        <label className="workshop__field">
          <span>rest</span>
          <select
            value={String(row['rest'] ?? s.rest ?? 'stand')}
            onChange={(event) => set('rest', event.currentTarget.value)}
            title={REST_KIT[(row['rest'] ?? s.rest ?? 'stand') as keyof typeof REST_KIT]?.what ?? ''}
          >
            {REST_POSES.map((pose) => (
              <option key={pose} value={pose}>
                {pose} — {REST_KIT[pose].what}
              </option>
            ))}
          </select>
          <em className="muted">
            {row['rest'] === undefined ? 'inherited' : 'this card'}
            {pose !== null && pose.modelId !== null && pose.rest === null ? ' · this body has no resting poses' : ''}
          </em>
          {row['rest'] !== undefined && (
            <button type="button" onClick={() => set('rest', undefined)} title="inherit from the rung below">
              ×
            </button>
          )}
        </label>
        <label className="workshop__field">
          <span>hair</span>
          <select value={String(row['hair'] ?? s.hair ?? 'the body’s own')} onChange={(event) => set('hair', event.currentTarget.value)}>
            {row['hair'] === undefined && s.hair === null && <option value="the body’s own">the body’s own ({pose?.hair ?? 'none'})</option>}
            {HAIR_STYLES.map((style) => (
              <option key={style}>{style}</option>
            ))}
          </select>
          <em className="muted">{row['hair'] === undefined ? 'inherited' : 'this card'}</em>
          {row['hair'] !== undefined && (
            <button type="button" onClick={() => set('hair', undefined)} title="inherit from the rung below">
              ×
            </button>
          )}
        </label>
        <label className="workshop__field">
          <span>face</span>
          <select value={String(row['face'] ?? s.face)} onChange={(event) => set('face', event.currentTarget.value)}>
            {FACE_STYLES.map((style) => (
              <option key={style}>{style}</option>
            ))}
          </select>
          <em className="muted">{row['face'] === undefined ? 'inherited' : 'this card'}</em>
          {row['face'] !== undefined && (
            <button type="button" onClick={() => set('face', undefined)} title="inherit from the rung below">
              ×
            </button>
          )}
        </label>
        <div className="workshop__field workshop__field--wide">
          <span>palette</span>
          <select value={String(row['palette'] ?? s.palette)} onChange={(event) => set('palette', event.currentTarget.value)}>
            {PALETTE_USES.map((use) => (
              <option key={use}>{use}</option>
            ))}
          </select>
          {artPalette === null ? (
            <em className="muted">no art palette read yet (a token, an art.json miss, or still loading)</em>
          ) : (
            <span className="workshop__swatches" title="the card art's colours, largest first — the art rung (D160)">
              {artPalette.swatches.map((swatch) => (
                <i
                  key={swatch.hex}
                  className="workshop__swatch"
                  style={{ background: swatch.hex, width: `${String(Math.max(6, Math.round(swatch.share * 90)))}px` }}
                  title={`${swatch.hex} · ${String(Math.round(swatch.share * 100))}%`}
                />
              ))}
              <em className="muted">
                accent <code>{artPalette.accent}</code>
                {artPalette.vivid ? '' : ' (nothing vivid)'} ·{' '}
                {s.palette === 'off'
                  ? 'off for this card'
                  : traitFor(cardOf(entry, IDS.subject, 0), traits, artRow(artPalette)).spec.accent !== artPalette.accent
                    ? 'a hand-written accent outranks it'
                    : 'the lowest rung here'}
                {artPalette.vivid ? '' : ' — nothing vivid, so no art tint (the colour identity speaks)'}
              </em>
              {pose !== null && (
                <em className="muted" title="what the pedestal and the arena draw for this card, the art rung included: its tint (a figure with no hand-written tint) and its accent — never a costume (D160, D164)">
                  drawn: tint{' '}
                  <i className="workshop__swatch" style={{ background: pose.tint, width: '12px' }} /> <code>{pose.tint}</code> accent{' '}
                  <i className="workshop__swatch" style={{ background: pose.accent, width: '12px' }} /> <code>{pose.accent}</code>
                </em>
              )}
            </span>
          )}
          {row['palette'] !== undefined && (
            <button type="button" onClick={() => set('palette', undefined)} title="inherit from the rung below">
              ×
            </button>
          )}
        </div>
        <div className="workshop__field workshop__field--wide">
          <span>costume</span>
          {palette === null ? (
            <em className="muted">
              {pose === null || pose.modelId === null
                ? 'no body with a model on the pedestal — nothing wears it'
                : `the ${pose.modelId} body carries no costume slots — only a person wears one (the drone, the insect and the disc never do)`}
            </em>
          ) : (
            <em className="muted">
              one colour per slot, <code>#rrggbb</code> or <code>tint</code>; a slot this row leaves out is inherited down the
              ladder, or filled from the top (costumeOf)
            </em>
          )}
        </div>
        {palette !== null && (
          <div className="workshop__costume" role="group" aria-label="Costume">
            {COSTUME_SLOTS.map((slot, i) => {
              const own = costumeRow[slot];
              const ladder = s.costume[slot];
              const drawn = palette?.[i] ?? null;
              const source = own !== undefined ? 'this card' : ladder !== undefined ? 'inherited' : 'filled';
              const swatch = drawn ?? (own !== undefined && own !== 'tint' ? own : (s.tint ?? '#ffffff'));
              return (
                <div key={slot} className={`workshop__slot workshop__slot--${source.replace(' ', '-')}`}>
                  <label title={`${slot}: ${own ?? ladder ?? `not named — drawn ${drawn ?? 'as the top'}`}`}>
                    <span>{slot}</span>
                    <input
                      type="color"
                      value={swatch.toLowerCase()}
                      onChange={(event) => {
                        setSlot(slot, event.currentTarget.value);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className={own === 'tint' ? 'on' : ''}
                    aria-pressed={own === 'tint'}
                    onClick={() => setSlot(slot, own === 'tint' ? undefined : 'tint')}
                    title="the figure’s own tint"
                  >
                    tint
                  </button>
                  <code>{own ?? ladder ?? '—'}</code>
                  <em className="muted">{source}</em>
                  {own !== undefined && (
                    <button type="button" onClick={() => setSlot(slot, undefined)} title="inherit from the rung below">
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {mine.length > 0 && (
        <ul className="workshop__errors">
          {mine.map((problem) => (
            <li key={problem.where + problem.message}>
              <code>{problem.where}</code> {problem.message} — the row is dropped, as the arena would
            </li>
          ))}
        </ul>
      )}
      <div className="workshop__buttons">
        <button
          type="button"
          disabled={mine.length > 0}
          title={
            mine.length > 0
              ? 'the validator refuses this row (above) — the arena would drop it, so there is nothing to copy yet'
              : 'the committed row with your edits folded in, in the file’s own style'
          }
          onClick={() => {
            const text = traitsRowText(name, row);
            void copyText(text).then((ok) => setCopied(ok ? 'traits row copied' : text));
          }}
        >
          copy as traits.json row
        </button>
        <button type="button" disabled={!overridden} onClick={() => onOverrides(withTraitRow(overrides, name, null))}>
          reset
        </button>
      </div>

      {copied !== null && (
        <textarea className="workshop__copied" readOnly rows={copied.includes('\n') ? 8 : 1} value={copied} />
      )}
    </details>
  );
}

/**
 * **A card's own `cues.json` params**, as JSON, applied live through
 * `validateCues` — the second half of "tuning", for every card with a row in the
 * cue file (a spell and an enchantment as much as a creature).
 */
function CueTuningPanel({
  entry,
  overrides,
  onOverrides,
  cueErrors,
}: {
  entry: WorkshopEntry;
  overrides: Overrides;
  onOverrides: (next: Overrides) => void;
  cueErrors: readonly Problem[];
}): JSX.Element | null {
  const [copied, setCopied] = useState<string | null>(null);
  const [cueDraft, setCueDraft] = useState<Record<string, string>>({});
  useEffect(() => {
    setCopied(null);
    setCueDraft({});
  }, [entry.key]);
  const name = entry.name;
  const cueEntry = name === '' ? {} : cueSelectorsOf(name, CUES_RAW);
  const mine = cueErrors.filter((problem) => problem.where.startsWith(`$.cards[${JSON.stringify(name)}]`));
  const cueOverrides = overrides.cues[name] ?? {};
  if (Object.keys(cueEntry).length === 0) return null;
  return (
    <details className="workshop__box" open>
      <summary>
        Cue params <span className="muted">— {Object.keys(cueOverrides).length > 0 ? 'OVERRIDDEN in this browser' : 'the committed cues.json'}</span>
      </summary>
      <div className="workshop__cueparams">
        {Object.entries(cueEntry).map(([selector, specRow]) => {
          const current = cueOverrides[selector] ?? (specRow['params'] as RawRow | undefined) ?? {};
          const draft = cueDraft[selector] ?? JSON.stringify(current);
          return (
            <label key={selector} className="workshop__param">
              <span>
                <code>{selector}</code> → <code>{String(specRow['cue'])}</code>
                {cueOverrides[selector] !== undefined && <em> overridden</em>}
              </span>
              <textarea
                rows={2}
                value={draft}
                spellCheck={false}
                onChange={(event) => {
                  const text = event.currentTarget.value;
                  setCueDraft((d) => ({ ...d, [selector]: text }));
                  try {
                    const parsed: unknown = JSON.parse(text);
                    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                      onOverrides(withCueParams(overrides, name, selector, parsed as RawRow));
                    }
                  } catch {
                    // Half-typed JSON: wait for the rest.
                  }
                }}
              />
              {cueOverrides[selector] !== undefined && (
                <button
                  type="button"
                  onClick={() => {
                    setCueDraft((d) => {
                      const next = { ...d };
                      delete next[selector];
                      return next;
                    });
                    onOverrides(withCueParams(overrides, name, selector, null));
                  }}
                >
                  reset
                </button>
              )}
            </label>
          );
        })}
        {mine.length > 0 && (
          <ul className="workshop__errors">
            {mine.map((problem) => (
              <li key={problem.where + problem.message}>
                <code>{problem.where}</code> {problem.message} — the entry is dropped, as the arena would
              </li>
            ))}
          </ul>
        )}
        <div className="workshop__buttons">
          <button
            type="button"
            disabled={mine.length > 0}
            title={
              mine.length > 0
                ? 'the validator refuses an overridden entry (above) — the arena would drop it, so there is nothing to copy yet'
                : 'the whole committed entry — notes, presence and station included — with your params folded in'
            }
            onClick={() => {
              const text = cueEntryText(name, cueOverrides, CUES_RAW);
              void copyText(text).then((ok) => setCopied(ok ? 'cues entry copied' : text));
            }}
          >
            copy as cues.json entry
          </button>
        </div>
      </div>
      {copied !== null && (
        <textarea className="workshop__copied" readOnly rows={copied.includes('\n') ? 8 : 1} value={copied} />
      )}
    </details>
  );
}

// ---------------------------------------------------------------------------
// Legibility
// ---------------------------------------------------------------------------

function LegibilityPanel({
  entry,
  traits,
  cueData,
  library,
  turn,
}: {
  entry: WorkshopEntry;
  traits: TraitData;
  cueData: CueData;
  library: ModelLibrary | null;
  turn: number;
}): JSX.Element {
  const [rows, setRows] = useState<MeterRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ms, setMs] = useState(0);
  const bodied = roleOf(entry) === 'creature' || roleOf(entry) === 'vehicle';
  useEffect(() => {
    if (library === null || !bodied) {
      setRows(null);
      return;
    }
    try {
      const started = performance.now();
      setRows(
        measure({
          entry,
          figures: FIGURE_DATA,
          models: MODEL_DATA,
          traits,
          presence: cueData.presence ?? {},
          library,
          turn,
        }),
      );
      setMs(performance.now() - started);
      setError(null);
    } catch (thrown) {
      setError(String(thrown));
      setRows(null);
    }
  }, [entry, traits, cueData, library, turn, bodied]);

  const cell = (seen: { pixels: number; height: number }): JSX.Element => (
    <td className={seen.pixels < LEGIBLE_PX ? 'bad' : 'good'} title={`${String(seen.pixels)} px visible, ${String(seen.height)} px tall`}>
      {seen.pixels}
      <span className="muted"> · {seen.height}h</span>
    </td>
  );
  return (
    <details className="workshop__box" open>
      <summary>
        Legibility <span className="muted">— pixels on screen from the table view</span>
      </summary>
      {!bodied && <p className="muted">No body to measure.</p>}
      {bodied && library === null && <p className="muted">Waiting for figures.glb…</p>}
      {error !== null && <p className="workshop__warn">{error}</p>}
      {rows !== null && rows.length === 0 && (
        <p className="muted">Nothing with a model to measure — the disc (or the anonymous disc) carries no props.</p>
      )}
      {rows !== null && rows.length > 0 && (
        <>
          <table className="workshop__meter">
            <thead>
              <tr>
                <th scope="col">prop</th>
                <th scope="col">you</th>
                <th scope="col">you, kneeling</th>
                <th scope="col">opp.</th>
                <th scope="col">opp., kneeling</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.kind} className={row.kind === 'figure' ? 'workshop__meter--body' : ''}>
                  <th scope="row">{row.kind}</th>
                  {cell(row.seen.you.standing)}
                  {cell(row.seen.you.kneeling)}
                  {cell(row.seen.opp.standing)}
                  {cell(row.seen.opp.kneeling)}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted workshop__fine">
            Visible pixels (area) · visible height, table view at {METER_WIDTH}×{METER_HEIGHT} — traits.test.ts’s frame
            and its bar: red under {LEGIBLE_PX} px of area. The real bodies and the real prop field, alone on each seat,
            {turn !== 0 ? ' with the facing preview applied,' : ''} measured in {ms.toFixed(0)} ms. It counts pixels, not
            contrast. The test forgives four one-sided details (tie, laserEye, exhaust, eyepatch) whose partner carries
            the card on the other side.
          </p>
        </>
      )}
    </details>
  );
}

function KeyLegend(): JSX.Element {
  return (
    <details className="workshop__box">
      <summary>Keys</summary>
      <table className="workshop__keys">
        <tbody>
          {WORKSHOP_KEYMAP.map((row) => (
            <tr key={row.action}>
              <th scope="row">
                <kbd>{row.chord}</kbd>
              </th>
              <td>{row.what}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
