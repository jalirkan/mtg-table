/*
 * mtg-table — arena/figures/attach.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Auras and Equipment as a manifestation on the host figure** (report 13 §4),
 * and the pure half of it: which overlay an attaching card gets, in what colour,
 * and what it does to the host's height. `[NO three]`, `[NO React]`, `[NO DOM]`,
 * no clock.
 *
 * ---------------------------------------------------------------------------
 * **The measurement that decides the design** (§4.1, re-measured over the whole
 * committed corpus on 2026-09-26):
 *
 *     28 `attach` EVENTS · 985 frames showing an attachment · max 4 at once
 *     Quantum Reduction 944 frame-instances · Super Suit 409 ·
 *     S.H.I.E.L.D. Spy Kit 362 · Robotics Mastery 315
 *     2,030 of 2,030 attachment instances have a CREATURE host; 0 unresolved
 *     exactly two type lines: `Enchantment - Aura` (1,259), `Artifact - Equipment` (771)
 *
 * An aura built as a cue is on screen for 500 ms out of a game and gone for the
 * 97% of the time it should be visible. **So the manifestation is a POSE and the
 * snap is a cue** (§1.3), and the pose is derived from `card.attachedToId` — the
 * snapshot field `layout.ts` already resolves across both seats — so it survives
 * `skip all`, a backwards scrub and a `resync` with no history at all.
 *
 * The two type lines are why the ladder's middle rung is a *subtype* rung and why
 * two rows (`subtype:aura`, `subtype:equipment`) cover every attachment this deck
 * has. The per-name rung above them is where Quantum Reduction's shrink lives,
 * and the `*` rung below is what makes an aura nobody wrote an entry for still
 * read (§4.4).
 * ---------------------------------------------------------------------------
 */

import { isHidden, type AnyCard } from '../../protocol.ts';
import { primaryTypeOf } from '../cues/archetype.ts';
import type { Station, StationKind } from '../cues/types.ts';
import { colourHex, colourIdOf } from '../colour.ts';
import { standPointOf, type Layout, type Placement, type Seat } from '../layout.ts';
import { artTint, type ArtPalette } from './palette.ts';
import type { AttachData, AttachKind, AttachSpec } from './types.ts';

/**
 * §4.3's recognised attachment subtypes, in the order a type line is searched.
 *
 * A closed list, for the reason `SUBTYPE_ORDER` and `LAND_SUBTYPE_ORDER` are
 * closed: an open-ended rung would make the data file a place to add an overlay
 * per card, which is Tier 3 arriving one row at a time inside Tier 2 (§12).
 *
 * `fortification` and `shrine` are deliberately absent: the corpus has neither,
 * and a rung that never fires is a rung nobody can see is wrong.
 */
export const ATTACH_SUBTYPE_ORDER = ['aura', 'equipment'] as const;
export type AttachSubtype = (typeof ATTACH_SUBTYPE_ORDER)[number];

/** The data key an attachment-subtype rung is written as. */
export function attachSubtypeKey(subtype: string): string {
  return `subtype:${subtype}`;
}

/** Which rung answered. A category, never a name (§3.10 rule 1). */
export type AttachRung = 'card' | `subtype:${string}` | 'any' | 'default';

export interface AttachMatch {
  spec: AttachSpec;
  rung: AttachRung;
}

/**
 * The attachment subtypes of a type line, lowercased.
 *
 * `primaryTypeOf` already answers `equipment` off the subtype half — it is the
 * one case `cues/archetype.ts` calls out by name — so this asks it rather than
 * writing a second scanner, and only `aura` needs reading here. One definition of
 * "is this an Equipment" in the app (CLAUDE.md M4 convention 6).
 */
export function attachSubtypesOf(card: AnyCard): AttachSubtype[] {
  if (isHidden(card)) return [];
  const out: AttachSubtype[] = [];
  const types = (card as { types?: string }).types ?? '';
  const dash = types.search(/[—–-]/);
  const sub = dash >= 0 ? types.slice(dash + 1).toLowerCase() : '';
  if (/\baura\b/.test(sub)) out.push('aura');
  if (primaryTypeOf(card) === 'equipment') out.push('equipment');
  return out;
}

/**
 * The ladder: **per-name → attachment subtype → `*` → the declared default.**
 * Total, never `undefined`, never throws.
 *
 * A **concealed** attaching card never reaches the per-name rung, for the reason
 * §1.4 gives for figures: choosing a distinctive overlay for a card is a
 * statement about what that card is. It still gets the default halo in the
 * colourless grey, because "something is attached here" is public information —
 * the card is face up on the battlefield and the wire says what it is attached
 * to. (Measured: the corpus has no concealed attachment, so this is a branch
 * rather than a behaviour.)
 */
export function attachFor(card: AnyCard, data: AttachData): AttachMatch {
  const fallback: AttachMatch = { spec: data.default, rung: 'default' };
  if (isHidden(card)) return fallback;

  const name = (card as { name?: string }).name;
  if (typeof name === 'string' && name !== '') {
    const byName = data.attachments[name];
    if (byName !== undefined) return { spec: byName, rung: 'card' };
  }
  for (const subtype of attachSubtypesOf(card)) {
    const bySubtype = data.attachments[attachSubtypeKey(subtype)];
    if (bySubtype !== undefined) return { spec: bySubtype, rung: `subtype:${subtype}` };
  }
  const any = data.attachments['*'];
  if (any !== undefined) return { spec: any, rung: 'any' };
  return fallback;
}

/**
 * §4.2 — one attaching card, manifested on its host.
 *
 * It carries `cardId` because the snap cue keys its effect off the *attaching*
 * card's id, and it carries no name, no type line and nothing else that could
 * name a card (§3.10 rule 1).
 */
export interface AttachmentManifestation {
  /** The attaching card's id. */
  cardId: number;
  kind: AttachKind;
  /** The attaching card's own colour identity, or the file's override. */
  colour: string;
  /** Multiplies the host figure's height. The product is applied by `figurePose`. */
  hostScale: number;
  strength: number;
  metal: boolean;
  rung: AttachRung;
}

/**
 * §4.4 — **the overlay budget, and it is NOT the cue budget.**
 *
 * `MAX_LIVE_EFFECTS = 8` (`cues/stage.ts`) caps *blended transients* and was
 * sized against full-size additive quads; a pose overlay is steady state and
 * predictable, and the measured ceiling is **4 attachments in one frame**. Taking
 * one of the cue engine's eight slots per aura would starve it of its own budget
 * for a thing that is not a cue at all, which is the same argument `discs.ts`
 * makes for the stand disc and `MAX_LIVE_MOTES` makes for a mote.
 *
 * Over the cap the halo is drawn and nothing else is — "degrade, don't stutter"
 * (report 09 §9.2 rule 9).
 */
export const MAX_POSE_OVERLAYS = 12;

/**
 * The manifestation of one attaching card. Total: a card nobody described gets the halo.
 *
 * `art` is the attaching card's own art palette (lane BODIES, D144), which the
 * caller looks up only for a card drawn face up: its vivid accent colours the
 * aura where no hand-written row gives a tint, over the bare colour identity.
 */
export function manifestationOf(card: AnyCard, data: AttachData, art: ArtPalette | null = null): AttachmentManifestation {
  const match = attachFor(card, data);
  const spec = match.spec;
  const colour = isHidden(card)
    ? colourHex('C')
    : (spec.tint ??
      (art === null ? null : artTint(art)) ??
      colourHex(colourIdOf((card as { manaCost?: string | null }).manaCost ?? null)));
  return {
    cardId: card.id,
    kind: spec.kind,
    colour,
    hostScale: spec.hostScale,
    strength: spec.strength,
    metal: spec.metal,
    rung: match.rung,
  };
}

// ---------------------------------------------------------------------------
// T12 — the stations: what a non-creature, unattached permanent keeps in its own slot
// ---------------------------------------------------------------------------

/**
 * **A station on the table this frame** (Tier 2 slice 3, T12; `cues/types.ts`'s
 * {@link Station}). Two cards in this deck are enchantments that are neither a
 * creature (no figure) nor attached to one (no aura overlay), and each carries one
 * thing the source material says it IS: Strategic Intervention's ops console,
 * Web Up's cocoon. It stands in the card's OWN rank slot — at the slot's stand
 * point, where a creature's figure would stand, and no wider than a figure — and
 * it names nothing else: the wire never relates Web Up to the card it exiled
 * (measured over the whole committed corpus: `attachedToId` is `null` on Web Up and on every card in
 * an exile zone, in every frame), and a cocoon over the exile pile would be a
 * renderer asserting a link the engine did not state (report 13 §4.5).
 *
 * Ids, a seat, a coordinate `layout.ts` computed, a kind and a colour — never a
 * name (§3.10 rule 1).
 */
export interface StationPose {
  cardId: number;
  seat: Seat;
  /**
   * Its rank slot's stand point (`layout.ts`'s `standPointOf`) — where a figure
   * would stand for this card, so the overlay covers nothing a figure would not.
   */
  position: [number, number, number];
  kind: StationKind;
  colour: string;
  /** World units from the stand point to the overlay's centre. */
  lift: number;
  /** Multiplies the kind's own size. */
  scale: number;
}

/**
 * How high each kind's centre stands when the data does not say, in world units
 * above its stand point: low enough that it sits in its own slot like a figure.
 *
 * **Not slice 3's first 0.85 / 0.6 over the CARD** (the verification pass, `g2`@224
 * and `g1`@323): a 1.1-wide console 0.85 above a card on YOUR creature rank
 * projected, from the table view's steep camera, onto the figures standing in
 * front of the cards beside it — it was drawn over your Ant-Man. At the stand
 * point and figure-sized ({@link STATION_SIZE}) it stands where
 * a creature of that card would, and `attach.test.ts` projects it through the
 * table camera and asserts it covers no figure.
 */
export const STATION_LIFT: Readonly<Record<StationKind, number>> = Object.freeze({
  missionControl: 0.3,
  cocoon: 0.4,
});

/**
 * Each kind's drawn size at `scale` 1, world units — a camera-facing quad
 * (`scene/overlays.ts`). Neither is wider than a figure (`layout.ts`'s
 * `FIGURE_MAX_WIDTH`, 0.72): a station occupies its own rank slot and no other.
 */
export const STATION_SIZE: Readonly<Record<StationKind, { w: number; h: number }>> = Object.freeze({
  missionControl: { w: 0.68, h: 0.425 },
  cocoon: { w: 0.34, h: 0.68 },
});

/** A frame can hold at most this many (the deck has one of each card). */
export const MAX_STATIONS = 8;

/** A station's point: its slot's stand point, copied (a placement's own array is layout's). */
function stationPoint(placement: Placement): [number, number, number] {
  const stand = standPointOf(placement);
  return [stand[0], stand[1], stand[2]];
}

/**
 * **The stations of one frame, as a pure function of it** — `layout(state)` and
 * the cue file's `stations` table, and nothing else, so a scrub, a `skip all` and
 * a `resync` show the console exactly when the snapshot shows the card.
 *
 * Only a card that is **face up, not redacted and on the battlefield** — the
 * battlefield rank, which is where `layout.ts` puts every permanent that is not a
 * land and not attached (`kind === 'creature'`, whatever its type line) — may
 * carry one: a station is a statement about what a card is, and hard rule 8 says
 * a face-down or concealed card makes none (§1.4 one layer down). An attached
 * card is the aura overlay's (`attachments`), never a station's.
 */
export function stationsOf(
  placed: Layout,
  stations: Readonly<Record<string, Station>> | undefined,
): StationPose[] {
  const out: StationPose[] = [];
  if (stations === undefined || placed.placements.length === 0) return out;
  for (const placement of placed.placements) {
    if (out.length >= MAX_STATIONS) break;
    if (placement.kind !== 'creature' || placement.back) continue;
    const card = placement.card;
    if (isHidden(card)) continue;
    if (((card as { attachedToId?: number | null }).attachedToId ?? null) !== null) continue;
    const name = (card as { name?: string }).name;
    if (typeof name !== 'string' || name === '') continue;
    const station = stations[name];
    if (station === undefined) continue;
    out.push({
      cardId: placement.cardId,
      seat: placement.seat,
      position: stationPoint(placement),
      kind: station.kind,
      colour:
        station.colour ?? colourHex(colourIdOf((card as { manaCost?: string | null }).manaCost ?? null)),
      lift: station.lift ?? STATION_LIFT[station.kind],
      scale: station.scale ?? 1,
    });
  }
  return out;
}
