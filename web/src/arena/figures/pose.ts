/*
 * mtg-table — arena/figures/pose.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The manifestation stage as a pure function of the frame** (report 13 §3.8).
 *
 *     figurePose(layout(state), state.combat, data) → Map<cardId, FigurePose>
 *
 * `[NO three]`, `[NO React]`, `[NO DOM]`, no clock. It is total over a pre-game
 * frame, an empty board, a `null` combat and a card with a `null` controller, and
 * it never throws.
 *
 * ---------------------------------------------------------------------------
 * **It takes the already-computed `Layout`, not the `ClientState`**, and the
 * three reasons are the whole design (§3.8):
 *
 *  - `layout.ts` stays the only module that knows a coordinate (§1.1). The
 *    stand-point comes from {@link standPointOf}, which lives there because it
 *    has to compose with the wrapped-rank offset, which lives there.
 *  - `presence`, the wrap rows and the attachment host resolution across both
 *    seats have already happened, so a figure on a hovering Helicarrier hovers
 *    with no line of new code.
 *  - `Placement.back` is already decided, which is what §1.4 branches on.
 *
 * And the rule that decides what is in this file at all (§1.3): **if the
 * snapshot says it, it is a pose.** Everything here survives `skip all`, a
 * backwards scrub and a `resync`, because it is recomputed from the frame that
 * is on screen and never from a history.
 * ---------------------------------------------------------------------------
 */

import { isHidden, type AnyCard, type Combat } from '../../protocol.ts';
import { isCreatureTypeLine } from '../../render/labels.ts';
import { colourHex, colourIdOf } from '../colour.ts';
import {
  DEPARTURE_STEP,
  FIGURE_HEIGHT,
  FIGURE_MAX_WIDTH,
  anchorsFor,
  footprintContains,
  seatSign,
  standPointOf,
  type Layout,
  type Placement,
  type Seat,
} from '../layout.ts';
import {
  MAX_POSE_OVERLAYS,
  manifestationOf,
  type AttachmentManifestation,
} from './attach.ts';
import { figureFor, type FigureRung } from './resolve.ts';
import { attachDataOf, type FigureData, type ModelData, type Stance } from './types.ts';

/**
 * §8.2 — how many figures may carry a **model**.
 *
 * Sized for 12: only 5.6% of the corpus's 3,679 board frames reach 10 creatures
 * and the ceiling is 21 (`human-sideboard-7.jsonl`). Above the cap the surplus
 * degrade to discs, in placement order, which is deterministic — "degrade, don't
 * stutter" (report 09 §9.2 rule 9), applied to the new layer.
 */
export const MAX_FIGURES = 12;

/**
 * The stand disc's radius, in world units, at the smallest and largest creature
 * this scale distinguishes. A card is `CARD_W = 0.716` wide, so the biggest disc
 * is a little wider than the card it stands in front of and the smallest is
 * comfortably inside it.
 */
const DISC_MIN_RADIUS = 0.2;
const DISC_MAX_RADIUS = 0.44;
/** P/T average at which the disc reaches {@link DISC_MAX_RADIUS}. */
const DISC_MAX_AT = 8;

/** §3.9 — summoning sickness is a translucency, not a tint. */
const SICK_OPACITY = 0.72;

export interface FigurePose {
  cardId: number;
  seat: Seat;
  /** The stand point: `layout.ts`'s, never computed here (§1.1). */
  position: [number, number, number];
  /** It faces the other seat. */
  facingY: number;
  /**
   * World units, after the archetype's and the card's own scale, every
   * attachment's `hostScale`, **and T7's width clamp** — see {@link FigurePose.width}.
   */
  height: number;
  /**
   * How wide this figure is drawn, in world units: `height × the model's own
   * width/height ratio`, or the stand disc's diameter when no model resolved.
   *
   * It is on the pose rather than left to the renderer because the *clamp* is a
   * layout fact (`FIGURE_MAX_WIDTH` is a rank slot) and because a pure test can
   * then assert the footprint over the whole corpus — which is how T7's tuning
   * pass proved the overlap gone rather than photographing it gone.
   */
  width: number;
  /** The stand disc's radius, from power/toughness. */
  radius: number;
  /** `null` ⇒ the glow disc is the whole figure (§9.4). */
  modelId: string | null;
  /** §3.6 rung 1: `ClipName` → this card's alias. Read by the clip lane (T3). */
  clips: Readonly<Record<string, string>>;
  /** Colour identity, or the file's override. */
  tint: string;
  stance: Stance;
  /** Pose-derived opacity: summoning sickness is a translucency (§3.9). */
  opacity: number;
  /**
   * The attacker this figure is blocking, from **`state.combat`** and never from
   * the `blockers` event (§3.9). Amendment **M7** is protocol law here: an
   * unblocked attacker arrives as `{attackerId: n, blockerIds: [n]}` — Forge's
   * own encoding — and `state.combat` is the authority on who blocked what.
   */
  interposesId: number | null;
  /**
   * The `presence` bob of the card this figure stands for (`layout.ts`'s
   * {@link Placement.bobAmp}), carried through so the figure hovers with its
   * card rather than beside it. It is a function of TIME, so like the card's own
   * bob it is added in the frame loop and not here — `figurePose` is a pure
   * function of STATE (`CueRunner.tsx` makes the same distinction for cards).
   */
  bobAmp: number;
  bobHz: number;
  /** Which rung of the ladder answered. A category, never a name (§3.10 rule 1). */
  rung: FigureRung;
  /** True when this card is drawn as a back: the anonymous figure (§1.4). */
  anonymous: boolean;
  /**
   * **T5 — the attachments on this host, manifested** (report 13 §4.2).
   *
   * Pose-derived from `card.attachedToId`, which `layout.ts` already resolves
   * across both seats, so a scrub to any of the corpus's 985 attachment frames
   * shows the aura with no cue history. Empty for all but 985 of 3,679 frames,
   * and never longer than 4 in the committed corpus.
   */
  attachments: AttachmentManifestation[];
  /**
   * The product of every manifestation's `hostScale`, already folded into
   * {@link FigurePose.height} and {@link FigurePose.radius}. Carried so the
   * overlay layer can size a ring against the figure it is on rather than
   * recomputing it.
   */
  hostScale: number;
  /**
   * **T6's combat freeze** (report 13 §6.4): a stack exists and the phase is a
   * combat phase, so the figures hold. Pose-derived, so it costs one boolean and
   * no asset; `CueRunner` reads it to stop advancing `action.time` and the
   * breathing, and **nothing else in the app reads it** — never the HUD, never
   * the decision layer, never a click. **Always `false` for a {@link ghost}**:
   * the ghost is the spell form, and §6.4 says the form is not frozen.
   */
  frozen: boolean;
  /**
   * **T6's ghosted creature spell** (report 13 §6.2): this figure is a spell on
   * the stack standing at its caster's casting anchor, not a permanent on the
   * battlefield. It is translucent, it takes no combat stance, and it is what
   * makes the stack read as Magic — the creature you are casting is already
   * standing there and it solidifies when it resolves.
   */
  ghost: boolean;
  /**
   * **The figure stands ON its own card** — a wrapped rank's back row (T8,
   * `layout.ts`'s back-row stand rule), where the stand point lies inside the
   * card's own footprint. The stand disc is transparent and writes no depth, so
   * a disc drawn in the same pass as the front row's (before the back-row card,
   * whose `renderOrder` is `20 + i`) is painted over by its own card: the disc
   * field draws these in a second, later pass (`layout.ts`'s
   * `ON_CARD_DISC_ORDER`). Always `false` for a ghost and for the front row.
   */
  onCard: boolean;
}

/** The whole stage for one frame, keyed by card id. */
export type FigureLayout = Map<number, FigurePose>;

export interface FigurePoseOptions {
  /**
   * §6.4's combat freeze, computed by `figures/casting.ts`'s `combatFreeze` from
   * the same snapshot. It is passed in rather than derived here because this
   * function takes a `Layout` and not a `ClientState` (§3.8), and `phase` is not
   * a coordinate.
   */
  frozen?: boolean;
  /**
   * The model manifest, for **T7's width clamp** (`FIGURE_MAX_WIDTH`): a model's
   * measured width/height ratio is the only thing that says how wide a figure of a
   * given height will be, and it is measured by the asset pipeline rather than
   * guessed here.
   *
   * Optional, and absent means "assume square": a pose computed with no manifest
   * is exactly the pose T1 computed, which is what keeps every existing caller and
   * every test that does not care about the clamp working unchanged.
   */
  models?: ModelData;
}

/**
 * **The width clamp**: the drawn height of a figure whose model is `ratio` times
 * wider than it is tall (T7; strict for every archetype since T8).
 *
 * `FIGURE_MAX_WIDTH` is a rank slot minus a gutter, so no resting figure is wider
 * than its slot and no two neighbours overlap. T7 floored the result so the drone
 * — measured then at 2.97× wider than tall — would be "squat rather than
 * invisible"; T8 found that number was the build's mistake (`layout.ts`'s
 * {@link FIGURE_MAX_WIDTH} says how), measured the drone again as three draws it
 * (1.66×), and dropped the floor with the exemption. Pure, and exported so the
 * test can assert the arithmetic rather than the pixels.
 */
export function fitHeight(nominal: number, ratio: number): number {
  if (!(ratio > 0) || !Number.isFinite(ratio)) return nominal;
  return Math.min(nominal, FIGURE_MAX_WIDTH / ratio);
}

const EMPTY_CLIPS: Readonly<Record<string, string>> = Object.freeze({});
const EMPTY_ATTACHING: readonly AnyCard[] = Object.freeze([]);

/** §6.2 — a spell is a little smaller and a lot fainter than the thing it becomes. */
const GHOST_SCALE = 0.82;
const GHOST_OPACITY = 0.4;
/** How far a second spell's ghost climbs above the first, matching the forms' step. */
const GHOST_STEP_Y = 0.3;

/**
 * Where a ghosted creature spell stands: **its caster's own casting anchor**, and
 * the anchor comes from `layout.ts` because that is the only module in the arena
 * that knows a coordinate (§1.1, §3.8).
 *
 * `placement.seat` is the stack placement's own seat, which `layout()` derives
 * from the stack item's controller — so an opponent's creature spell forms on the
 * opponent's side with no cue and no reader naming a seat.
 */
function ghostPointOf(placement: Placement, index: number): [number, number, number] {
  const anchor = anchorsFor(placement.seat).casting;
  return [anchor.x, anchor.y + index * GHOST_STEP_Y, anchor.z];
}

/**
 * host card id → the cards attached to it, in placement order.
 *
 * `layout.ts` has already resolved the host **across both seats** (its own
 * verification fix: an Aura one player controls on a creature the other controls
 * was being drawn a card-width from its host in 16.7% of frames), so this is a
 * read of `attachedToId` and nothing more. Measured: 2,030 of 2,030 attachment
 * instances in the corpus have a creature host and none is unresolved.
 */
function attachmentsByHost(placed: Layout): Map<number, AnyCard[]> {
  const out = new Map<number, AnyCard[]>();
  for (const placement of placed.placements) {
    if (placement.kind !== 'attachment') continue;
    const hostId = (placement.card as { attachedToId?: number | null }).attachedToId ?? null;
    if (hostId === null) continue;
    const list = out.get(hostId);
    if (list === undefined) out.set(hostId, [placement.card]);
    else list.push(placement.card);
  }
  return out;
}

/**
 * Is this placement something a figure stands for?
 *
 * The battlefield rank kind is `creature` for *everything* that is not a land
 * and not an attachment — artifacts, enchantments and planeswalkers included —
 * so the type line is asked as well, through the app's one definition of it
 * (`render/labels.ts`, CLAUDE.md M4 convention 6).
 *
 * A **redacted** battlefield permanent (the five-key stub) has no type line at
 * all and therefore gets no figure: drawing a creature for it would assert that
 * it is one. Measured: the committed corpus has **0** of those on a battlefield,
 * so this is a branch rather than a behaviour — but it is the branch that is
 * wrong to leave implicit (§1.4).
 */
function isFigureCard(placement: Placement): boolean {
  if (placement.kind !== 'creature') return false;
  const card = placement.card;
  if (isHidden(card)) return false;
  return isCreatureTypeLine((card as { types?: string }).types ?? '');
}

/**
 * Is this placement a creature spell on the stack, i.e. a ghost (§6.2)?
 *
 * A stack placement whose source card is already on the battlefield is an
 * *ability*, not a creature spell, and `figurePose`'s duplicate guard drops it
 * because `layout()` emits the ranks before the stack — so this predicate does
 * not have to know about that case and deliberately does not try to.
 */
function isGhostCard(placement: Placement): boolean {
  if (placement.kind !== 'stack') return false;
  const card = placement.card;
  if (isHidden(card)) return false;
  return isCreatureTypeLine((card as { types?: string }).types ?? '');
}

/** `"3"`, `"*"`, `"1+*"`, `null` → a number or `null`. `"*"` is not a size. */
function statOf(value: string | null | undefined): number | null {
  if (typeof value !== 'string' || value === '') return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * The disc's radius from power/toughness, clamped.
 *
 * A creature whose P/T is `*` or absent gets the smallest disc, which is the
 * honest answer: the wire did not say how big it is.
 */
export function discRadiusFor(card: AnyCard): number {
  const power = statOf((card as { power?: string | null }).power);
  const toughness = statOf((card as { toughness?: string | null }).toughness);
  if (power === null && toughness === null) return DISC_MIN_RADIUS;
  const size = (Math.max(0, power ?? 0) + Math.max(0, toughness ?? 0)) / (power !== null && toughness !== null ? 2 : 1);
  const t = Math.min(1, Math.max(0, (size - 1) / (DISC_MAX_AT - 1)));
  return DISC_MIN_RADIUS + t * (DISC_MAX_RADIUS - DISC_MIN_RADIUS);
}

/**
 * §3.9's stance, and **the precedence is not the order the table prints**.
 *
 * An attacking creature is almost always tapped, so a `tapped`-first rule would
 * put every attacker on its knees at the moment it charges. Combat wins, then
 * summoning sickness (a creature that is not really there yet), then the tap.
 */
function stanceOf(card: AnyCard, interposesId: number | null): Stance {
  const c = card as { tapped?: boolean; sick?: boolean; attacking?: boolean; blocking?: boolean };
  if (c.attacking === true) return 'attacking';
  if (c.blocking === true || interposesId !== null) return 'blocking';
  if (c.sick === true) return 'sick';
  if (c.tapped === true) return 'crouch';
  return 'ready';
}

/**
 * blocker id → the attacker it blocks, from `state.combat`.
 *
 * The self-block guard is amendment **M7**'s: an *unblocked* attacker is
 * relayed as its own blocker, and rendering that as "blocks itself" is the
 * defect `cues/resolve.ts` already documents on the event side.
 */
function interposeMap(combat: Combat | null): Map<number, number> {
  const out = new Map<number, number>();
  if (combat === null) return out;
  for (const band of combat.bands) {
    for (const attacker of band.attackerIds) {
      for (const blocker of band.blockerIds) {
        if (blocker === attacker) continue;
        if (!out.has(blocker)) out.set(blocker, attacker);
      }
    }
  }
  return out;
}

/**
 * The manifestation stage of one frame.
 *
 * One pose per battlefield creature, at most {@link MAX_FIGURES} of them
 * carrying a model, in placement order.
 */
export function figurePose(
  placed: Layout,
  combat: Combat | null,
  data: FigureData,
  options: FigurePoseOptions = {},
): FigureLayout {
  const out: FigureLayout = new Map();
  if (placed.placements.length === 0) return out;
  const interposes = interposeMap(combat);
  const attachData = attachDataOf(data);
  const byHost = attachmentsByHost(placed);
  const frozen = options.frozen === true;
  let overlays = 0;
  let ghostIndex = 0;

  let withModel = 0;
  for (const placement of placed.placements) {
    const ghost = isGhostCard(placement);
    if (!ghost && !isFigureCard(placement)) continue;
    // One card is placed at most once as a `creature` (the stack copy is `s:`
    // keyed and a different kind), but the map is keyed by card id and the test
    // asserts one pose per creature, so a duplicate would be a silent overwrite.
    if (out.has(placement.cardId)) continue;

    const card = placement.card;
    const match = figureFor(card, data);
    const spec = match.spec;

    // §1.4 rule 1, explicit: **a model is only ever chosen for a card drawn face
    // up.** A face-down creature is a figure — it is on the battlefield and it
    // fights — but it is the anonymous one, and its tint is the colourless grey,
    // because a mesh and a colour are both statements about what a card is.
    const anonymous = placement.back;
    const overBudget = withModel >= MAX_FIGURES;
    const modelId = anonymous || overBudget ? null : spec.model;
    if (modelId !== null) withModel += 1;

    const interposesId = ghost ? null : (interposes.get(placement.cardId) ?? null);
    const sick = !anonymous && (card as { sick?: boolean }).sick === true;

    // **T5 — the host's attachments, and the height they leave it at.** The
    // product is what keeps a shrunk creature shrunk through `skip all`: it is
    // recomputed from the snapshot that still says the Aura is attached (§4.2).
    const attachments: AttachmentManifestation[] = [];
    let hostScale = 1;
    for (const attaching of byHost.get(placement.cardId) ?? EMPTY_ATTACHING) {
      const manifestation = manifestationOf(attaching, attachData);
      hostScale *= manifestation.hostScale;
      // §4.4's cap, and it is the OVERLAY budget rather than the cue engine's.
      // Over it, the aura still shrinks its host — the pose is the fact — and
      // only the drawn overlay is dropped.
      if (overlays >= MAX_POSE_OVERLAYS) continue;
      attachments.push(manifestation);
      overlays += 1;
    }

    // **T7's width clamp**, and it is why `width` is on the pose: a figure's drawn
    // height depends on how wide its model is, and only the manifest knows.
    const baseline = FIGURE_HEIGHT * hostScale * (ghost ? GHOST_SCALE : 1);
    const nominal = baseline * spec.scale;
    const entry = modelId === null ? undefined : options.models?.models[modelId];
    const ratio = entry === undefined || entry.height <= 0 ? 0 : entry.width / entry.height;
    const height = ratio > 0 ? fitHeight(nominal, ratio) : nominal;
    const width = ratio > 0 ? height * ratio : discRadiusFor(card) * hostScale * 2;

    const position = ghost ? ghostPointOf(placement, ghostIndex) : standPointOf(placement);
    out.set(placement.cardId, {
      cardId: placement.cardId,
      seat: placement.seat,
      position,
      facingY: placement.seat === 'you' ? 0 : Math.PI,
      height,
      width,
      radius: discRadiusFor(card) * hostScale,
      modelId,
      clips: anonymous ? EMPTY_CLIPS : spec.clips,
      tint: anonymous
        ? colourHex('C')
        : (spec.tint ?? colourHex(colourIdOf((card as { manaCost?: string | null }).manaCost ?? null))),
      // A spell is not on the battlefield, so it has no combat stance and it is
      // not summoning-sick: it rests, and it solidifies when it resolves.
      stance: ghost ? 'ready' : stanceOf(card, interposesId),
      opacity: ghost ? GHOST_OPACITY : sick ? SICK_OPACITY : 1,
      interposesId,
      bobAmp: ghost ? 0 : placement.bobAmp,
      bobHz: placement.bobHz,
      rung: anonymous ? 'default' : match.rung,
      anonymous,
      attachments,
      hostScale,
      // §6.4's second guard: the freeze "must not freeze the spell form, which is
      // the thing the player is being asked to look at" — and a ghosted creature
      // spell IS the spell form (§6.2's creature row). It keeps breathing while
      // the battlefield holds.
      frozen: frozen && !ghost,
      ghost,
      onCard: !ghost && footprintContains(placement, position[0], position[2]),
    });
    if (ghost) ghostIndex += 1;
  }

  return out;
}

/**
 * **T8 — the figures that left between two frames** (Tier 2 follow-up 2).
 *
 * Every pose of `before` that carried a model and has no pose in `after`, in
 * `before`'s order. A departure is not yet a death: the renderer holds each one,
 * and **the queue decides its fate** (**D64**) — `figures/clips.ts`'s
 * `stepDeparture`, asked on the body's first frame whether a death cue for its
 * card is queued or running (`CueQueue.deathPending`). A dying body is drawn from
 * that first frame until its death cue ends, its own `hit` included; a figure
 * that left for the hand, the library or a face-down turn has no death cue
 * queued and is never drawn. (The first slice-2 rule — drawn only while the
 * card's `die` REQUEST was on the stage — blinked on every death, and was
 * replaced by the verification fix: `docs/evidence/m7-tier2-slice2.md`, fix §1.)
 *
 * Ghosts are excluded — a creature spell that leaves the stack either becomes
 * the battlefield figure (the same card id, still posed) or fizzles, which has a
 * cue of its own — and so is anything without a model, because the disc has no
 * body to die.
 */
export function departedFigures(before: FigureLayout, after: FigureLayout): FigurePose[] {
  const out: FigurePose[] = [];
  for (const pose of before.values()) {
    if (pose.modelId === null || pose.ghost || pose.anonymous) continue;
    if (after.has(pose.cardId)) continue;
    out.push(pose);
  }
  return out;
}

/**
 * **T8 fix — where a dying body stands** (the slice-2 verification pass).
 *
 * `layout()` re-centres a rank in the snapshot a creature leaves it, so both of
 * its neighbours move half a slot toward where it stood: a body drawn at its last
 * stand point overlaps each of them by about a third of a figure for the whole of
 * its death. The rank does not wait for it — `layout(state)` is authoritative, and
 * holding the slot would be a layout that remembers — so the BODY moves: it is
 * drawn one {@link DEPARTURE_STEP} toward the table's centre line, out of the rank
 * and into its own combat lane, where it falls. If that spot is taken too (a
 * figure standing there), it steps back toward its own seat instead; if both are,
 * it takes the lane anyway. A body with nothing beside it stays where it stood.
 *
 * Pure, over the previous frame's pose of the body and the new frame's figures,
 * and computed once, at commit — never in the frame loop.
 */
export function departureStand(departed: FigurePose, present: FigureLayout): [number, number, number] {
  const [x, y, z] = departed.position;
  if (!crowded(present, departed, x, z)) return [x, y, z];
  const towardCentre = -seatSign(departed.seat);
  for (const direction of [towardCentre, -towardCentre]) {
    const stepped = z + direction * DEPARTURE_STEP;
    if (!crowded(present, departed, x, stepped)) return [x, y, stepped];
  }
  return [x, y, z + towardCentre * DEPARTURE_STEP];
}

/** Does any figure of the new frame stand within one step of `(x, z)`, overlapping in x? */
function crowded(present: FigureLayout, body: FigurePose, x: number, z: number): boolean {
  for (const pose of present.values()) {
    if (pose.cardId === body.cardId) continue;
    if (Math.abs(pose.position[2] - z) >= DEPARTURE_STEP - 1e-9) continue;
    if (Math.abs(pose.position[0] - x) < (pose.width + body.width) / 2) return true;
  }
  return false;
}
