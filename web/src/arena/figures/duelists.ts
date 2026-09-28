/*
 * mtg-table — arena/figures/duelists.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The duelists** (Tier 2 slice 4, **T13**): a full figure per seat standing at
 * its side of the table, where slice 1 had a flat silhouette bust (report 13 §7,
 * user decision 8 — "avatars deferred"). `[NO three]`, `[NO React]`, `[NO DOM]`,
 * no clock: everything here is a pure function of the snapshot, the data file and
 * `layout.ts`'s anchors, so `web/test/duelists.test.ts` and `camera.test.ts` can
 * hold it to the corpus and to the camera under `node --test`.
 *
 * ---------------------------------------------------------------------------
 * **Three halves, and the pose/cue rule decides which is which (D56).**
 *
 *  1. **Who stands for a seat is data** — `duelists.json`, validated here like
 *     `cues.json` and `traits.json`: a look per seat (a body from the figure
 *     library, a scale, a tint mixed with the seat's colour, props from the shared
 *     kit and a costume palette). **A seat, never a player**: nothing here reads
 *     `PlayerState.name`, and a duelist carries no card and no name (hard rule 8's
 *     renderer half — the HUD plate is where the name is drawn).
 *  2. **Where it stands, which way it faces and how it rests are a POSE** —
 *     {@link duelistBusts}: present whenever the seat exists, its stance from the
 *     snapshot alone (`board.gameOver`: the winner holds a raised fist, the loser
 *     is slumped), so a skip, a scrub, a `resync` and a new `gameId` need no
 *     history.
 *  3. **What it does is a CUE** — a gesture on the clip lane, written by the cue
 *     that is already playing the event (`cues/registry.ts`'s `playGesture`, a
 *     PARAM on the existing ids, never a new cue): a raised hand when its seat
 *     casts, a flinch and a red pulse when its seat takes damage or loses life,
 *     and the entry into the end-of-game stance on `outcome.finish`. Each one
 *     decays to identity — the transients by `clipEnvelope`, the stance entry by
 *     arriving at the stance the pose already holds.
 *
 * **The clip lane is the gesture's channel, on a reserved id.** A gesture is a
 * `ClipRequest` like any other — scrubbed from the cue's `t`, arbitrated by
 * `clipBeats`, cleared by the cue's own `end()`, emptied by `beginFrame` — keyed
 * by {@link duelistLane}, which no card id can be (Forge's ids are non-negative
 * and every "no id" sentinel in the cue engine is `-1`). So `replay-cues.test.ts`'s
 * decay assertion ("`stage.clips` is empty after every batch") covers the duelists
 * with no line added to it. `SceneStage` is untouched; `Stage` gained one
 * OPTIONAL query (`clipOf`), so a cue that ends releases only its own request.
 *
 * **Where they stand is measured, and the opponent's is not where slice 1 put its
 * bust** (Tier 2 follow-up 10, T13's to move). Report 13 §7 said it first — "the
 * camera cannot afford them": from every seat-safe view the far end of the table
 * lies under the arena's own chrome (`layout.ts`'s `HUD_TOP_PX`). A 1.36-tall body
 * anywhere behind the opponent's hand is 0% visible from the table view on a
 * 1600 × 1000 window; the slice-1 bust was 37–89% covered. So the opponent's
 * duelist stands at the table's right-hand side, level with its own creature rank
 * and just past the end of a full one, where every seat-safe view sees ≥ 91% of it
 * at 16:10 and wider — and yours stands where your bust was, nudged 0.4 outboard
 * and 0.4 back so no card of a seven-card hand is ever behind it. The two face
 * each other across the table. `camera.test.ts` holds both to every seat-safe view
 * at every live aspect, with slice 1's two anchors as the negative controls.
 * ---------------------------------------------------------------------------
 */

import type { GameStateBody } from '../../protocol.ts';
import type { Effect } from '../cues/stage.ts';
import {
  FIGURE_HEIGHT,
  anchorsFor,
  playerAnchorFor,
  yawToward,
  type Seat,
} from '../layout.ts';
import { COSTUME_SLOTS, isPropKind, type CostumeSlot, type PropKind } from './props.ts';
import type { ClipName } from './types.ts';

// ---------------------------------------------------------------------------
// The gesture vocabulary, and the lane it travels on
// ---------------------------------------------------------------------------

/**
 * **What a duelist can do.** Closed: two transients and two stance entries.
 *
 * | gesture | when | shape |
 * |---|---|---|
 * | `cast` | its seat casts a spell or puts an ability on the stack (`cast`) | a hand raised toward the table, decaying to rest |
 * | `flinch` | its seat takes damage, or loses life with no damage in the batch | a recoil and a red pulse, decaying to rest |
 * | `win` | `outcome.finish`, for the winner | the arm comes up into the raised fist the pose then holds |
 * | `lose` | `outcome.finish`, for the loser | the body slumps into the stance the pose then holds |
 */
export const GESTURES = ['cast', 'flinch', 'win', 'lose'] as const;
export type Gesture = (typeof GESTURES)[number];

const GESTURE_SET: ReadonlySet<string> = new Set<string>(GESTURES);

export function isGesture(value: unknown): value is Gesture {
  return typeof value === 'string' && GESTURE_SET.has(value);
}

/**
 * **The `gesture` param's values** — what a cue carries (`cues/validate.ts`'s
 * `PARAM_SPECS`). `outcome` is not a gesture: it expands to `win` for the winner
 * and `lose` for everyone else at the table, so the one `outcome.finish` cue
 * plays both ends. `none` silences a cue a data row does not want to gesture.
 */
export const GESTURE_PARAMS = ['cast', 'flinch', 'outcome', 'none'] as const;
export type GestureParam = (typeof GESTURE_PARAMS)[number];

const GESTURE_PARAM_SET: ReadonlySet<string> = new Set<string>(GESTURE_PARAMS);

export function isGestureParam(value: unknown): value is GestureParam {
  return typeof value === 'string' && GESTURE_PARAM_SET.has(value);
}

/**
 * **The clip-lane rank each gesture arbitrates at** (`figures/clips.ts`'s
 * `CLIP_PRIORITY`): losing (`die`) beats a flinch (`hit`) beats the raised fist
 * (`grow`) beats a cast (`channel`). The request's `alias` carries the gesture's
 * own name, which is how the duelist field knows which of its data's clip ladders
 * to play — the rank is only the arbitration.
 */
export const GESTURE_CLIP: Readonly<Record<Gesture, ClipName>> = Object.freeze({
  cast: 'channel',
  flinch: 'hit',
  win: 'grow',
  lose: 'die',
});

/** The two gestures that ENTER a stance the pose then holds; the other two decay. */
export const STANCE_GESTURES: ReadonlySet<Gesture> = new Set<Gesture>(['win', 'lose']);

/**
 * **The reserved clip-lane ids.** A duelist's gestures are clip requests keyed by
 * `DUELIST_LANE_BASE − playerId`: far below every card id (Forge's are
 * non-negative) and every sentinel (`-1`) the cue engine uses for "no card".
 */
export const DUELIST_LANE_BASE = -1_000_000;

export function duelistLane(playerId: number): number {
  return DUELIST_LANE_BASE - playerId;
}

/** Is this clip-lane id a duelist's rather than a card's? */
export function isDuelistLane(id: number): boolean {
  return id <= DUELIST_LANE_BASE;
}

// ---------------------------------------------------------------------------
// The data file
// ---------------------------------------------------------------------------

/** A hex colour — the only colour spelling the arena accepts anywhere. */
const HEX = /^#[0-9a-fA-F]{6}$/;
/** A model id or a clip key: `agent`, `pistolDraw`. Never a sentence, never a name. */
const IDENT = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;
const COSTUME_SLOT_SET: ReadonlySet<string> = new Set<string>(COSTUME_SLOTS);

/** A duelist's scale against `FIGURE_HEIGHT` — "about 1.6 creature figures". */
export const DUELIST_SCALE_RANGE = [1.2, 2.2] as const;
/** How much of the seat's own colour a look mixes into its tint. */
const SEAT_MIX_RANGE = [0, 1] as const;
/** A stance's resting point in its clip. */
const HOLD_RANGE = [0, 1] as const;
/** A gesture's own root lean, radians — a recoil or a slump, never a somersault. */
const LEAN_RANGE = [-0.6, 0.6] as const;

/** One seat's identity: which body, how big, what colours, what it carries. */
export interface DuelistLook {
  /** Model ids to try in order against the figure library — the first one loaded wins. */
  body: string[];
  /** Multiplies `FIGURE_HEIGHT`. */
  scale: number;
  /** The hologram's edge colour (`uTint`: with a costume on, the silhouette's glow). */
  tint: string;
  /** 0…1 of the seat's own colour mixed into {@link DuelistLook.tint}. */
  seatMix: number;
  /**
   * The costume: one colour per `figures/props.ts` `COSTUME_SLOTS` slot — the
   * bodies' own palette (`scene/holoMaterial.ts`'s `applyCostume`). A slot the
   * look leaves out wears its `top`.
   */
  costume: Partial<Record<CostumeSlot, string>>;
  /**
   * Shared kinds from `figures/props.ts`'s closed kit, each with the costume slot
   * it is drawn in. A duelist's props are baked INTO its body (one mesh, one draw
   * call, one program — `scene/DuelistLayer.tsx`), so a prop wears one of the
   * body's own slot colours: the director's coat is his `top`, his badge his gold.
   */
  props: Partial<Record<PropKind, DuelistProp>>;
  /**
   * The slot a prop's TRIM wears — the parts the kit lights brighter than the
   * prop (a coat's lapels, collar and hem; a badge's rim) — and the slot its SHADE
   * wears — the parts the kit darkens (a hood's visor slot, a badge's roundel).
   * The kit draws those as a vertex colour over the kind's; a baked prop wears a
   * slot instead, so the trim and the shade are the look's to choose.
   */
  trim: CostumeSlot;
  shade: CostumeSlot;
}

/** One baked prop: the slot it wears, and a stretch of the kit's anchor for this look. */
export interface DuelistProp {
  slot: CostumeSlot;
  /** Multiplies the kit anchor's size, per axis — a hood worn as a helm is shorter. */
  scale: readonly [number, number, number];
}

/** A prop's stretch: a helm is a squashed bucket, never a building. */
const PROP_SCALE_RANGE = [0.4, 1.8] as const;

/** How one gesture is played on a body. */
export interface GestureSpec {
  /** The model's own clip keys, first present wins. Empty ⇒ root and tint only. */
  clips: string[];
  /** A stance gesture: where it rests in its clip once the game has ended, 0…1. */
  hold: number;
  /** The root's lean at full weight, radians: forward (+) or back (−). */
  lean: number;
  /**
   * **Bones aimed over the clip**, in order, at the gesture's weight: each turns
   * `joint` so the line from it to `child` points along `aim` — a direction in
   * FIGURE space (+Y up, +Z the figure's front, −X its right hand). The library
   * has no raised fist, so the winner's is the clip's arm aimed up; a body whose
   * rig names neither joint simply plays the clip.
   */
  aim: GestureAim[];
}

/** One aimed bone. */
export interface GestureAim {
  joint: string;
  child: string;
  aim: readonly [number, number, number];
}

export interface DuelistData {
  /** Seat → look id. */
  seats: Partial<Record<Seat, string>>;
  looks: Record<string, DuelistLook>;
  gestures: Record<Gesture, GestureSpec>;
}

export interface DuelistProblem {
  where: string;
  message: string;
}

export interface DuelistValidation {
  /** The usable subset. Never `null`: a seat whose look was dropped gets the bust. */
  data: DuelistData;
  errors: DuelistProblem[];
}

/** What a gesture does when the file says nothing about it. */
export const DEFAULT_GESTURES: Readonly<Record<Gesture, GestureSpec>> = Object.freeze({
  cast: { clips: ['channel'], hold: 0, lean: -0.06, aim: [] },
  flinch: { clips: ['hit'], hold: 0, lean: -0.22, aim: [] },
  win: { clips: ['grow'], hold: 0.85, lean: -0.08, aim: [] },
  lose: { clips: ['crouch'], hold: 0.8, lean: 0.34, aim: [] },
});

export const EMPTY_DUELIST_DATA: DuelistData = Object.freeze({
  seats: {},
  looks: {},
  gestures: DEFAULT_GESTURES,
}) as DuelistData;

const FILE_KEYS = new Set(['version', 'seats', 'looks', 'gestures']);
const LOOK_KEYS = new Set(['body', 'scale', 'tint', 'seatMix', 'costume', 'props', 'trim', 'shade']);
const PROP_KEYS = new Set(['slot', 'scale']);
const GESTURE_KEYS = new Set(['clips', 'hold', 'lean', 'aim']);
const AIM_KEYS = new Set(['joint', 'child', 'aim']);
const SEATS: readonly Seat[] = ['you', 'opp'];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isComment(key: string): boolean {
  return key.startsWith('_');
}

function inRange(value: unknown, range: readonly [number, number]): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= range[0] && value <= range[1];
}

function unknownKeys(where: string, value: Record<string, unknown>, allowed: ReadonlySet<string>, errors: DuelistProblem[]): void {
  for (const key of Object.keys(value)) {
    if (isComment(key) || allowed.has(key)) continue;
    errors.push({ where: `${where}.${key}`, message: 'unknown field' });
  }
}

function validateLook(where: string, raw: unknown, errors: DuelistProblem[]): DuelistLook | null {
  if (!isObject(raw)) {
    errors.push({ where, message: 'must be an object' });
    return null;
  }
  const before = errors.length;
  unknownKeys(where, raw, LOOK_KEYS, errors);
  const body = raw['body'];
  if (!Array.isArray(body) || body.length === 0 || !body.every((id) => typeof id === 'string' && IDENT.test(id))) {
    errors.push({ where: `${where}.body`, message: 'must be a non-empty list of model ids' });
  }
  if (!inRange(raw['scale'], DUELIST_SCALE_RANGE)) {
    errors.push({ where: `${where}.scale`, message: `must be within [${String(DUELIST_SCALE_RANGE[0])}, ${String(DUELIST_SCALE_RANGE[1])}]` });
  }
  if (typeof raw['tint'] !== 'string' || !HEX.test(raw['tint'])) errors.push({ where: `${where}.tint`, message: 'must be #rrggbb' });
  if (raw['seatMix'] !== undefined && !inRange(raw['seatMix'], SEAT_MIX_RANGE)) {
    errors.push({ where: `${where}.seatMix`, message: 'must be within [0, 1]' });
  }
  const costume = raw['costume'] ?? {};
  const cleanCostume: Partial<Record<CostumeSlot, string>> = {};
  if (!isObject(costume)) {
    errors.push({ where: `${where}.costume`, message: 'must be an object' });
  } else {
    for (const [slot, colour] of Object.entries(costume)) {
      if (isComment(slot)) continue;
      if (!COSTUME_SLOT_SET.has(slot)) errors.push({ where: `${where}.costume.${slot}`, message: 'not one of COSTUME_SLOTS' });
      else if (typeof colour !== 'string' || !HEX.test(colour)) {
        errors.push({ where: `${where}.costume.${slot}`, message: 'must be #rrggbb' });
      } else cleanCostume[slot as CostumeSlot] = colour;
    }
  }
  const props = raw['props'] ?? {};
  const cleanProps: Partial<Record<PropKind, DuelistProp>> = {};
  if (!isObject(props)) {
    errors.push({ where: `${where}.props`, message: 'must be an object: prop kind → costume slot' });
  } else {
    for (const [kind, spec] of Object.entries(props)) {
      if (isComment(kind)) continue;
      if (!isPropKind(kind)) {
        errors.push({ where: `${where}.props.${kind}`, message: 'not a prop kind from figures/props.ts' });
        continue;
      }
      const prop = validateProp(`${where}.props.${kind}`, spec, errors);
      if (prop !== null) cleanProps[kind] = prop;
    }
  }
  for (const key of ['trim', 'shade']) {
    const slot = raw[key];
    if (slot !== undefined && (typeof slot !== 'string' || !COSTUME_SLOT_SET.has(slot))) {
      errors.push({ where: `${where}.${key}`, message: 'must name one of COSTUME_SLOTS' });
    }
  }
  if (errors.length > before) return null;
  return {
    body: [...(body as string[])],
    scale: raw['scale'] as number,
    tint: raw['tint'] as string,
    seatMix: (raw['seatMix'] as number | undefined) ?? 0,
    costume: cleanCostume,
    props: cleanProps,
    trim: (raw['trim'] as CostumeSlot | undefined) ?? 'belt',
    shade: (raw['shade'] as CostumeSlot | undefined) ?? 'shoes',
  };
}

/** A prop is a slot name, or `{ slot, scale }`. */
function validateProp(where: string, spec: unknown, errors: DuelistProblem[]): DuelistProp | null {
  if (typeof spec === 'string') {
    if (!COSTUME_SLOT_SET.has(spec)) {
      errors.push({ where, message: 'must name one of COSTUME_SLOTS' });
      return null;
    }
    return { slot: spec as CostumeSlot, scale: [1, 1, 1] };
  }
  if (!isObject(spec)) {
    errors.push({ where, message: 'must be a costume slot or { slot, scale }' });
    return null;
  }
  const before = errors.length;
  unknownKeys(where, spec, PROP_KEYS, errors);
  const slot = spec['slot'];
  if (typeof slot !== 'string' || !COSTUME_SLOT_SET.has(slot)) {
    errors.push({ where: `${where}.slot`, message: 'must name one of COSTUME_SLOTS' });
  }
  const scale = spec['scale'] ?? [1, 1, 1];
  if (!Array.isArray(scale) || scale.length !== 3 || !scale.every((v) => inRange(v, PROP_SCALE_RANGE))) {
    errors.push({
      where: `${where}.scale`,
      message: `must be [x, y, z], each within [${String(PROP_SCALE_RANGE[0])}, ${String(PROP_SCALE_RANGE[1])}]`,
    });
  }
  if (errors.length > before) return null;
  const [x, y, z] = scale as number[];
  return { slot: slot as CostumeSlot, scale: [x!, y!, z!] };
}

/**
 * **A look's costume as the shader wants it**: one `#rrggbb` per slot, in
 * `COSTUME_SLOTS` order, a missing slot wearing the look's `top` (or its tint).
 */
export function costumeOf(look: DuelistLook): string[] {
  const fallback = look.costume.top ?? look.tint;
  return COSTUME_SLOTS.map((slot) => look.costume[slot] ?? fallback);
}

function validateGesture(where: string, raw: unknown, errors: DuelistProblem[], fallback: GestureSpec): GestureSpec {
  if (!isObject(raw)) {
    errors.push({ where, message: 'must be an object' });
    return fallback;
  }
  const before = errors.length;
  unknownKeys(where, raw, GESTURE_KEYS, errors);
  const clips = raw['clips'] ?? [];
  if (!Array.isArray(clips) || !clips.every((key) => typeof key === 'string' && IDENT.test(key))) {
    errors.push({ where: `${where}.clips`, message: 'must be a list of clip keys' });
  }
  if (raw['hold'] !== undefined && !inRange(raw['hold'], HOLD_RANGE)) {
    errors.push({ where: `${where}.hold`, message: 'must be within [0, 1]' });
  }
  if (raw['lean'] !== undefined && !inRange(raw['lean'], LEAN_RANGE)) {
    errors.push({ where: `${where}.lean`, message: `must be within [${String(LEAN_RANGE[0])}, ${String(LEAN_RANGE[1])}]` });
  }
  const aims: GestureAim[] = [];
  const rawAim = raw['aim'] ?? [];
  if (!Array.isArray(rawAim)) {
    errors.push({ where: `${where}.aim`, message: 'must be a list of { joint, child, aim }' });
  } else {
    rawAim.forEach((entry, i) => {
      const at = `${where}.aim[${String(i)}]`;
      if (!isObject(entry)) {
        errors.push({ where: at, message: 'must be { joint, child, aim }' });
        return;
      }
      unknownKeys(at, entry, AIM_KEYS, errors);
      const joint = entry['joint'];
      const child = entry['child'];
      const aim = entry['aim'];
      if (typeof joint !== 'string' || !IDENT.test(joint)) errors.push({ where: `${at}.joint`, message: 'must be a joint name' });
      if (typeof child !== 'string' || !IDENT.test(child)) errors.push({ where: `${at}.child`, message: 'must be a joint name' });
      if (
        !Array.isArray(aim) ||
        aim.length !== 3 ||
        !aim.every((v) => inRange(v, [-1, 1])) ||
        Math.hypot(aim[0] as number, aim[1] as number, aim[2] as number) < 0.5
      ) {
        errors.push({ where: `${at}.aim`, message: 'must be a direction [x, y, z], each within [-1, 1]' });
        return;
      }
      if (typeof joint === 'string' && typeof child === 'string') {
        aims.push({ joint, child, aim: [aim[0] as number, aim[1] as number, aim[2] as number] });
      }
    });
  }
  if (errors.length > before) return fallback;
  return {
    clips: [...(clips as string[])],
    hold: (raw['hold'] as number | undefined) ?? fallback.hold,
    lean: (raw['lean'] as number | undefined) ?? fallback.lean,
    aim: aims,
  };
}

/**
 * **`duelists.json`, validated** — the cue file's two behaviours, for the same
 * reasons: at runtime a bad entry is DROPPED (a seat whose look fails draws the
 * silhouette bust, a gesture that fails plays its default), and in the tests an
 * error is a failure (`duelists.test.ts`).
 */
export function validateDuelists(raw: unknown): DuelistValidation {
  const errors: DuelistProblem[] = [];
  if (!isObject(raw)) {
    return { data: EMPTY_DUELIST_DATA, errors: [{ where: '$', message: 'must be an object' }] };
  }
  unknownKeys('$', raw, FILE_KEYS, errors);
  if (raw['version'] !== 1) errors.push({ where: '$.version', message: 'must be 1' });

  const looks: Record<string, DuelistLook> = {};
  const rawLooks = raw['looks'];
  if (!isObject(rawLooks)) {
    errors.push({ where: '$.looks', message: 'must be an object' });
  } else {
    for (const [id, entry] of Object.entries(rawLooks)) {
      if (isComment(id)) continue;
      if (!IDENT.test(id)) {
        errors.push({ where: `$.looks.${id}`, message: 'not a look id' });
        continue;
      }
      const look = validateLook(`$.looks.${id}`, entry, errors);
      if (look !== null) looks[id] = look;
    }
  }

  const seats: Partial<Record<Seat, string>> = {};
  const rawSeats = raw['seats'];
  if (!isObject(rawSeats)) {
    errors.push({ where: '$.seats', message: 'must be an object' });
  } else {
    unknownKeys('$.seats', rawSeats, new Set<string>(SEATS), errors);
    for (const seat of SEATS) {
      const id = rawSeats[seat];
      if (id === undefined) continue;
      if (typeof id !== 'string' || looks[id] === undefined) {
        errors.push({ where: `$.seats.${seat}`, message: 'must name a look in $.looks' });
        continue;
      }
      seats[seat] = id;
    }
  }

  const gestures: Record<Gesture, GestureSpec> = { ...DEFAULT_GESTURES };
  const rawGestures = raw['gestures'] ?? {};
  if (!isObject(rawGestures)) {
    errors.push({ where: '$.gestures', message: 'must be an object' });
  } else {
    unknownKeys('$.gestures', rawGestures, GESTURE_SET, errors);
    for (const gesture of GESTURES) {
      if (rawGestures[gesture] === undefined) continue;
      gestures[gesture] = validateGesture(`$.gestures.${gesture}`, rawGestures[gesture], errors, DEFAULT_GESTURES[gesture]);
    }
  }
  return { data: { seats, looks, gestures }, errors };
}

/** Every clip key any gesture names — what the coverage test reads against `models.json`. */
export function gestureClipKeys(data: DuelistData): string[] {
  const out = new Set<string>();
  for (const gesture of GESTURES) for (const key of data.gestures[gesture].clips) out.add(key);
  return [...out].sort();
}

// ---------------------------------------------------------------------------
// Where they stand — layout arithmetic, held to the camera by camera.test.ts
// ---------------------------------------------------------------------------

/**
 * **Your duelist: at your HUD anchor, where your bust was** (`playerAnchorFor`),
 * **0.4 outboard and 0.4 back.** The bust's own point (`x −3.55, z 4.8`) put the
 * legs of a standing body across the leftmost card of a seven-card hand from the
 * shoulder and low views (a convex-hull test over every live aspect); this is
 * the nearest point to it from which no card of the widest fan is ever behind the
 * body, and it is 100% on screen at 16:9 in all three seat-safe views.
 */
export const YOU_STAND_DX = -0.4;
export const YOU_STAND_DZ = 0.4;

/**
 * **The opponent's duelist: beside its own creature rank, on the table's right**
 * — 0.66 past the end of a full nine-card rank (whose outer edge is at x 3.54),
 * level with the rank and 0.1 toward the centre line. Every point behind the
 * opponent's hand is under the arena's chrome from every seat-safe view (see the
 * header); from here a 1.36-tall body is ≥ 91% visible in all three at 16:10 and
 * wider on a 1600 × 1000 window, ≥ 73% on a 1280 × 800 one, and 100% from both
 * spectator views. It is clear of the stack column (x 4.8, which climbs toward
 * the centre line, never past z −0.6) and of the opponent's library (z −4.55).
 */
export const OPP_STAND_X = 4.2;
export const OPP_STAND_DZ = 0.1;

/**
 * A duelist's silhouette, as a fraction of its height: the width a long coat
 * flares to and the depth of a body. It is the box `camera.test.ts` projects —
 * CONSERVATIVE on purpose (a real body is narrower at the feet and the head), so a
 * stand that passes cannot be hiding a hand card behind the figure.
 */
export const DUELIST_BOX_WIDTH = 0.46;
export const DUELIST_BOX_DEPTH = 0.3;

/** Where a seat's duelist stands, on the table surface. */
export function duelistStand(seat: Seat): [number, number, number] {
  if (seat === 'you') {
    const anchor = playerAnchorFor('you');
    return [anchor.x + YOU_STAND_DX, 0, anchor.z + YOU_STAND_DZ];
  }
  const rank = anchorsFor('opp').creatures;
  return [rank.x + OPP_STAND_X, 0, rank.z + OPP_STAND_DZ];
}

/**
 * **They face each other.** The model faces +Z at `facingY = 0` (`layout.ts`'s
 * `FIGURE_FRONT_Z`), so this is `yawToward` from +Z toward the other seat's stand
 * point: yours turns three-quarters away from the camera toward the opponent's,
 * and the opponent's three-quarters toward the camera, toward yours.
 */
export function duelistFacing(seat: Seat): number {
  const from = duelistStand(seat);
  const to = duelistStand(seat === 'you' ? 'opp' : 'you');
  return yawToward(0, from[0], from[2], to[0], to[2]);
}

/** A duelist's drawn height, world units. */
export function duelistHeight(look: DuelistLook | null): number {
  return FIGURE_HEIGHT * (look?.scale ?? 1.6);
}

/**
 * **The box a duelist occupies**, as its eight world corners — what the camera
 * tests project. It is turned with the body, so a duelist standing three-quarters
 * on is as wide on screen as it really is. `stand` and `facingY` default to the
 * seat's own; the tests pass slice 1's bust anchors as their negative controls.
 */
export function duelistBox(
  seat: Seat,
  height: number,
  stand: readonly [number, number, number] = duelistStand(seat),
  facingY: number = duelistFacing(seat),
): Array<[number, number, number]> {
  const [x, , z] = stand;
  const c = Math.cos(facingY);
  const s = Math.sin(facingY);
  const hw = (DUELIST_BOX_WIDTH * height) / 2;
  const hd = (DUELIST_BOX_DEPTH * height) / 2;
  const out: Array<[number, number, number]> = [];
  for (const lx of [-hw, hw]) {
    for (const lz of [-hd, hd]) {
      for (const y of [0, height]) out.push([x + lx * c + lz * s, y, z - lx * s + lz * c]);
    }
  }
  return out;
}

/**
 * **Sample points over a duelist's silhouette** (its front plane, 7 × 11): what
 * "visible" means in `camera.test.ts` — the share of these that land on screen
 * below the chrome's keep-out band.
 */
export function duelistSamples(
  seat: Seat,
  height: number,
  stand: readonly [number, number, number] = duelistStand(seat),
  facingY: number = duelistFacing(seat),
): Array<[number, number, number]> {
  const [x, , z] = stand;
  const c = Math.cos(facingY);
  const s = Math.sin(facingY);
  const w = DUELIST_BOX_WIDTH * height;
  const out: Array<[number, number, number]> = [];
  for (let i = 0; i <= 6; i++) {
    const lx = -w / 2 + (w * i) / 6;
    for (let j = 0; j <= 10; j++) out.push([x + lx * c, (height * j) / 10, z - lx * s]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The pose
// ---------------------------------------------------------------------------

/** How a duelist rests: at the table, or — once the snapshot says the game is over — won or lost. */
export type DuelistStance = 'ready' | 'won' | 'lost';

/** The seat colours: the viewer's warmer, the opponent's rose, so the two read apart. */
export const SEAT_COLOUR: Readonly<Record<Seat, string>> = Object.freeze({ you: '#8fd3c4', opp: '#d68f9a' });

/**
 * **The silhouette bust of one seat** (slice 1, and T13's fallback when the
 * figure library is missing). It carries a seat, a player id and a colour — and
 * **no name**: the player's name is drawn by the HUD in the DOM layer, where the
 * 2D board already draws it (§3.10 rule 1's spirit, one surface further out).
 * `stack.test.ts` holds it to exactly these five keys.
 */
export interface DuelistBust {
  player: number;
  seat: Seat;
  /** The rim colour. The viewer's own seat is warmer, so the two read apart. */
  colour: string;
  /** Whether this seat is the AI, from the snapshot's own flag. */
  isAi: boolean;
  /** 0…1 — this seat's life against the highest life at the table. */
  vigour: number;
}

/**
 * **One duelist, posed** (T13) — the bust's five facts and where the body stands,
 * which way it faces, how tall it is, which look `duelists.json` gives its seat
 * and the stance the snapshot says it holds. Still **no name and no card**.
 */
export interface DuelistPose extends DuelistBust {
  /** From `board.gameOver` alone: `won` / `lost` once the game has ended, else `ready`. */
  stance: DuelistStance;
  /** The look id `duelists.json` gives this seat, or `null` ⇒ the silhouette bust. */
  look: string | null;
  /** Where it stands, on the table surface. */
  stand: [number, number, number];
  /** Its turn about y: facing the other seat. */
  facingY: number;
  /** Its drawn height, world units. */
  height: number;
}

/** A pose's name for the stance the snapshot gives one player. */
export function stanceOf(board: GameStateBody | null, playerId: number): DuelistStance {
  const over = board?.gameOver ?? null;
  if (over === null) return 'ready';
  if (over.winner === null) return 'ready';
  return over.winner === playerId ? 'won' : 'lost';
}

/**
 * **The busts of one frame, in seating order.**
 *
 * `vigour` is life relative to the highest life at the table, which is a
 * *rendering* of `PlayerState.life` and not a judgement about the game: nothing
 * here decides who is winning, and the number the player reads is still the
 * engine's own life total in the HUD.
 */
export function duelistBusts(
  board: GameStateBody | null,
  seatOf: (playerId: number) => Seat,
): DuelistBust[] {
  if (board === null) return [];
  let top = 0;
  for (const player of board.players) top = Math.max(top, player.life);
  const out: DuelistBust[] = [];
  for (const player of board.players) {
    const seat = seatOf(player.id);
    out.push({
      player: player.id,
      seat,
      colour: SEAT_COLOUR[seat],
      isAi: player.isAi,
      vigour: top > 0 ? Math.max(0, Math.min(1, player.life / top)) : 1,
    });
  }
  return out;
}

/**
 * **The duelists of one frame** — a pure function of the snapshot, the seat
 * mapping and the data file: one per seat (two players, two seats — README's
 * NON-GOALS; a second player mapped to a seat already taken would be two bodies
 * on one stand point, so it is not posed).
 */
export function duelistPoses(
  board: GameStateBody | null,
  seatOf: (playerId: number) => Seat,
  data: DuelistData = EMPTY_DUELIST_DATA,
): DuelistPose[] {
  const out: DuelistPose[] = [];
  const taken = new Set<Seat>();
  for (const bust of duelistBusts(board, seatOf)) {
    if (taken.has(bust.seat)) continue;
    taken.add(bust.seat);
    const lookId = data.seats[bust.seat] ?? null;
    const look = lookId === null ? null : (data.looks[lookId] ?? null);
    out.push({
      ...bust,
      stance: stanceOf(board, bust.player),
      look: look === null ? null : lookId,
      stand: duelistStand(bust.seat),
      facingY: duelistFacing(bust.seat),
      height: duelistHeight(look),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The gesture on a body — the pure half of the duelist field's clip lane
// ---------------------------------------------------------------------------

/** The gesture a stance is entered by, or `null` for `ready`. */
export function stanceGesture(stance: DuelistStance): Gesture | null {
  return stance === 'won' ? 'win' : stance === 'lost' ? 'lose' : null;
}

/** The gesture a lane request carries (its `alias`), or `null` for a request that is not a duelist's. */
export function gestureOfAlias(alias: string | null): Gesture | null {
  return isGesture(alias) ? alias : null;
}

/**
 * **How far into its stance a duelist is, 0…1** — the pose's half of the
 * `win` / `lose` entry, and the one rule that keeps the end of the game from
 * blinking (the D64 lesson, for a body that does not die).
 *
 * The snapshot that ends the game already carries `gameOver`, so the pose says
 * `won` before the batch's damage cues and the outcome cue have played. Held at
 * once, the loser would slump while it was still being hit and then stand up for
 * the outcome cue to slump it again. So:
 *
 *  - the outcome cue is RUNNING (its request is on the lane, entering this very
 *    stance): the entry is its `t`, over the first 70% of the cue;
 *  - it is QUEUED behind the rest of its batch (`CueQueue.gesturePending`): 0 —
 *    the body is still at the table, taking the blows;
 *  - otherwise (it played out, was skipped, flushed or scrubbed away): 1 — the
 *    stance is a pose and needs no history.
 */
export function stanceEntry(stance: DuelistStance, request: Gesture | null, t: number, pending: boolean): number {
  const own = stanceGesture(stance);
  if (own === null) return 0;
  if (request === own) return t <= 0 ? 0 : t >= 0.7 ? 1 : t / 0.7;
  return pending ? 0 : 1;
}

// ---------------------------------------------------------------------------
// The fallback bust's reaction (slice 1, unchanged)
// ---------------------------------------------------------------------------

/**
 * **What the fallback bust is reacting to this frame** — §7's "a body for
 * `damage:player` and `life.tick` to play on — a flinch, a red rim". Read off the
 * live effects anchored at this player (the `plate` that `damage.player` and
 * `life.tick` flash under the life total, and the burst and ring of a spell that
 * strikes a player), so a flinch is exactly as long as the cue that caused it.
 * The duelist figure reads its flinch off its own clip lane instead.
 *
 * It writes into `out` rather than returning a fresh object, because it runs once
 * per bust per frame (report 09 §9.2 rule 6).
 */
export interface BustReaction {
  /** 0…1 — the strongest live effect anchored at this player. */
  strength: number;
  /** That effect's colour: red for damage, green for a gain. `null` when idle. */
  colour: string | null;
}

/** Effect kinds a bust reacts to. A `text` number is the HUD's, not a blow. */
const REACTS_TO: ReadonlySet<Effect['kind']> = new Set<Effect['kind']>(['plate', 'particles', 'ring']);

export function bustReactionInto(
  out: BustReaction,
  effects: ReadonlyMap<string, Effect>,
  player: number,
): BustReaction {
  out.strength = 0;
  out.colour = null;
  // `forEach` over a module-scope visitor rather than `for…of effects.values()`:
  // this runs once per bust per frame, and an iterator is an allocation (§9.2
  // rule 6; `liveness.test.ts`'s scan reads the fallback bust's frame-loop body).
  REACTION_OUT = out;
  REACTION_PLAYER = player;
  effects.forEach(visitEffect);
  REACTION_OUT = null;
  return out;
}

let REACTION_OUT: BustReaction | null = null;
let REACTION_PLAYER = -1;

function visitEffect(effect: Effect): void {
  const out = REACTION_OUT;
  if (out === null) return;
  const at = effect.at;
  if (at.kind !== 'player' || at.id !== REACTION_PLAYER) return;
  if (!REACTS_TO.has(effect.kind)) return;
  const strength = Math.max(0, Math.min(1, effect.strength));
  if (strength > out.strength) {
    out.strength = strength;
    out.colour = effect.colour;
  }
}
