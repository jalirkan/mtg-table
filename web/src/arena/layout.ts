/*
 * mtg-table — arena/layout.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The resting pose of every object on the table, as a pure function of one
 * `ClientState`** (report 09 §3 and §5.1).
 *
 * This is the load-bearing file of the whole arena, and the reason is one line
 * from §5.1:
 *
 *     finalTransform(card) = layout(state)[card.id] ⊕ offsets[card.id]
 *
 * `layout()` is authoritative and pure; animation cues (E3 onwards) contribute
 * only *transient* offsets that decay back to identity. Because of that, a
 * skipped cue, a replay scrub and a `resync` are all the same thing — drop the
 * offsets and the scene is exactly `layout(state)` — and none of them needs a
 * rewind path. Every position in the arena comes from here, and **nothing else
 * in the codebase knows a coordinate** (§3.2).
 *
 * NO three, NO React, NO DOM: it is imported by `web/test/layout.test.ts` under
 * `node --test` with nothing but type stripping, which is what lets the geometry
 * be tested over all eighteen committed recordings with no browser.
 *
 * ---------------------------------------------------------------------------
 * Units and orientation (§3.1)
 *
 *   - **1 world unit = 1 card height.** A card is `CARD_W × 1.0`.
 *   - **Y is up; the table is the XZ plane at y = 0.** Permanents lie flat:
 *     `rotation = [-π/2, 0, θ]`, so `θ` is the in-plane spin and **tap is
 *     `θ += π/2`** — one scalar, trivially tweenable.
 *   - **You sit at +Z, the opponent at −Z.** The camera looks down −Z.
 *   - Each row gets a few thousandths of `y` so coplanar quads never z-fight.
 *
 * Two rules that are rules and not accidents:
 *
 *   - **A tapped card keeps its slot.** The rotation is the only change. A board
 *     that reflows every time a land taps is unreadable.
 *   - **Ordering is by card `id` ascending**, never by the order the engine
 *     happened to list a zone in, so a card never jumps rank because Forge
 *     re-sorted a list.
 * ---------------------------------------------------------------------------
 */

import {
  isFaceDown,
  isHidden,
  type AnyCard,
  type GameStateBody,
  type PlayerState,
  type StackItem,
} from '../protocol.ts';
import type { ClientState } from '../reduce.ts';
import { isLandTypeLine } from '../render/labels.ts';
import type { AnchorRef } from './cues/stage.ts';
import type { Presence } from './cues/types.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * The nominal card aspect, `63 mm / 88 mm` (§3.1). Layout uses the *physical*
 * ratio rather than a texture's, because layout is pure and runs before — and
 * without — any image: Scryfall's own `normal` is 488×680 = 0.717647, which
 * differs in the fourth decimal and would make the resting pose depend on
 * whether a JPEG had finished loading.
 */
export const CARD_W = 63 / 88;

/** The table quad's half-extent in x and z. Everything must fit inside it. */
export const TABLE_HALF_X = 6.4;
export const TABLE_HALF_Z = 6.2;

/** Flat on the table. */
const FLAT = -Math.PI / 2;

/** §3.1 — a tap is a quarter turn in the plane, and nothing else. */
export const TAP_ANGLE = Math.PI / 2;

/** Rank pitch: one card width plus a gutter (§3.2). */
const RANK_PITCH = CARD_W + 0.08;
/** The tighter pitch a wrapped rank uses. */
const RANK_PITCH_TIGHT = CARD_W + 0.04;
/** §3.2 — above this many cards a rank wraps to a second row. */
export const MAX_PER_RANK = 9;

/**
 * How far a wrapped rank sits from the first row, away from the table centre.
 *
 * **Deliberately 0.55 and not §3.2's 1.15.** The anchor table puts the creature
 * and land ranks 1.1 apart, and a card lying flat is 1.0 deep, so a second rank
 * 1.15 away from centre would land *exactly* on the neighbouring zone — a
 * tenth creature would be drawn on top of the lands. 0.55 keeps the wrapped row
 * inside the rank's own 1.1 band (0.55 + 0.5 = 1.05) and reads the way a real
 * crowded table reads: a second row overlapping the first, half a card back,
 * lifted a few thousandths so the overlap is unambiguous.
 */
const RANK_WRAP_Z = 0.55;
/** The y lift a wrapped row gets, so the overlap draws in the right order. */
const RANK_WRAP_Y = 0.004;

/** §3.3 — the hand fan. */
const FAN_STEP_DEG = 7.5;
const FAN_MAX_DEG = 48;
const FAN_RADIUS_YOU = 6.2;
const FAN_RADIUS_OPP = 5;
const FAN_PITCH_YOU = -1.15;
/**
 * **Not §3.3's `+1.15`, and the sign is the whole point.** Pitch here is an
 * absolute rotation about X where **flat on the table is `-π/2`**, so `-1.15` is
 * a card tilted 24° up out of the table toward the camera, and `+1.15` is the
 * same card rotated 156° — face down, through the table, showing the viewer a
 * sliver. Measured in the browser at frame 120 of g1.jsonl before the fix: the
 * opponent's two hand cards were two dark slivers at the top edge.
 *
 * The opponent's hand gets the same tilt as ours because that is what a hand
 * held up across a table looks like: backs toward you, faces toward them.
 */
const FAN_PITCH_OPP = -1.15;
const FAN_SPIN = 0.55;

/** §3.4 — the stack column. */
const STACK_STEP_Y = 0.2;
const STACK_STEP_Z = 0.13;
const STACK_PITCH = -0.95;
const STACK_TOP_SCALE = 1.1;

/** A pile (graveyard, exile) fans by these per card so it reads as a pile. */
const PILE_STEP_Y = 0.012;
const PILE_STEP_X = 0.008;
const PILE_STEP_Z = -0.006;

/** §3.2 — an attachment sits behind and below-right of its host. */
const ATTACH_DX = 0.2;
const ATTACH_DY = 0.002;
const ATTACH_DZ = 0.14;
const ATTACH_FAN_X = 0.1;

/** §3.2 — summoning sickness is a small y drop and a desaturation, never a tint overlay. */
const SICK_DY = -0.015;

// ---------------------------------------------------------------------------
// Anchors
// ---------------------------------------------------------------------------

export type Seat = 'you' | 'opp';

/**
 * A named resting place. `layout()` reads anchors and emits placements; cue
 * camera targets are expressed *relative* to anchors (§8 rule 3), never as
 * absolute positions, so changing the table size cannot break a cue.
 */
export interface Anchor {
  x: number;
  y: number;
  z: number;
  /** Rotation about X. Flat on the table unless the zone tilts (hand, stack). */
  pitch: number;
}

export type AnchorName =
  | 'hand'
  | 'creatures'
  | 'lands'
  | 'combat'
  | 'graveyard'
  | 'exile'
  | 'command'
  | 'library';

/** Every anchor of one seat. The opponent's is this mirrored through z = 0. */
export interface SeatAnchors {
  hand: Anchor;
  creatures: Anchor;
  lands: Anchor;
  combat: Anchor;
  graveyard: Anchor;
  exile: Anchor;
  command: Anchor;
  library: Anchor;
}

/**
 * §3.2's table, for the seat at +Z. `anchorsFor('opp')` mirrors z.
 *
 * The one anchor §3.2 does not give a number for is `library`: it is needed as
 * the *source* of the `zone.draw` cue (§6) even though Tier 1 never draws a
 * deck, so it is parked beside the hand where a real deck sits, clear of the
 * stack column at x = +4.8.
 */
const YOU_ANCHORS: SeatAnchors = {
  hand: { x: 0, y: 0.36, z: 4.7, pitch: FAN_PITCH_YOU },
  // The creature rank sits a little higher than everything else for one
  // mechanical reason: a summoning-sick creature drops by `SICK_DY`, and a
  // resting pose that can go negative is a card under the table.
  creatures: { x: 0, y: 0.02, z: 2.3, pitch: FLAT },
  lands: { x: 0, y: 0.006, z: 3.4, pitch: FLAT },
  combat: { x: 0, y: 0.024, z: 0.9, pitch: FLAT },
  graveyard: { x: -4.8, y: 0.004, z: 1.5, pitch: FLAT },
  exile: { x: -4.8, y: 0.004, z: 2.8, pitch: FLAT },
  command: { x: -4.8, y: 0.004, z: 0, pitch: FLAT },
  library: { x: 3.9, y: 0.004, z: 4.55, pitch: FLAT },
};

/** §3.4 — the stack column is shared, at +X, climbing in +Y. */
export const STACK_ANCHOR: Anchor = { x: 4.8, y: 0.03, z: 0, pitch: STACK_PITCH };

/**
 * **The half-turn the other side of the table already has** (verification fix).
 *
 * A card lying on the far side of a real table is the same card, rotated 180°
 * **in the table plane**: its face still points at the ceiling, its top edge
 * points away from you. That is an in-plane spin of π, and it is emphatically
 * *not* a negated pitch.
 *
 * `anchorsFor('opp')` used to mirror an anchor with `pitch: -a.pitch`, which
 * takes `FLAT` (−π/2) to **+π/2** — the same quad with its **normal flipped to
 * point down through the table**. The card is then drawn as a *mirror image*:
 * its top edge projects to the bottom of the screen while its left edge stays on
 * the left, so the name, the type line and the P/T all read backwards. Measured
 * in the browser at g1.jsonl frame 250: the opponent's Peggy Carter had corners
 * at NDC TL(−0.252, 0.412) BL(−0.241, 0.545) — top *below* bottom — while my own
 * Plains was the right way up, and 12 of the 30 placements in that frame had a
 * downward normal. A 180° rotation would have put the top-left corner at the
 * bottom **right**; a reflection does not.
 *
 * The file had already found and fixed exactly this sign for the hand
 * ({@link FAN_PITCH_OPP}, *"the sign is the whole point"*) and did not carry the
 * fix to the flat zones. So: **pitch is never mirrored**, and the opponent gets
 * this seat-level spin instead, which {@link place} adds to the in-plane `spin`
 * — composing with the tap angle rather than fighting it. (With the normal
 * flipped, a tapped opponent permanent appeared to turn anticlockwise while
 * yours turned clockwise, from the same `+TAP_ANGLE`.)
 *
 * The hand and the stack are deliberately **not** given it: both are tilted to
 * face the camera rather than lying flat, and a fanned hand spun by π is a fan
 * whose tilt reads the wrong way round.
 */
export function seatSpin(seat: Seat): number {
  return seat === 'opp' ? Math.PI : 0;
}

/** The anchors of one seat. `opp` is `you` mirrored through z = 0. */
export function anchorsFor(seat: Seat): SeatAnchors {
  if (seat === 'you') return YOU_ANCHORS;
  // **`pitch` is carried across unchanged** — see {@link seatSpin}. Mirroring an
  // anchor mirrors *where* it is, never which way its cards face.
  const mirror = (a: Anchor): Anchor => ({ x: a.x, y: a.y, z: -a.z, pitch: a.pitch });
  return {
    hand: { ...mirror(YOU_ANCHORS.hand), pitch: FAN_PITCH_OPP },
    creatures: mirror(YOU_ANCHORS.creatures),
    lands: mirror(YOU_ANCHORS.lands),
    combat: mirror(YOU_ANCHORS.combat),
    graveyard: mirror(YOU_ANCHORS.graveyard),
    exile: mirror(YOU_ANCHORS.exile),
    command: mirror(YOU_ANCHORS.command),
    library: mirror(YOU_ANCHORS.library),
  };
}

// ---------------------------------------------------------------------------
// Placements
// ---------------------------------------------------------------------------

export type SlotKind =
  | 'creature'
  | 'land'
  | 'attachment'
  | 'hand'
  | 'graveyard'
  | 'exile'
  | 'command'
  | 'stack';

/**
 * Where one drawable object rests, and what it is.
 *
 * `key` is namespaced the way M4's rect registry is (CLAUDE.md, M4 convention
 * 3): **the id spaces collide** — 40 frames in the committed corpus have a
 * `stack[].id` that is also a battlefield `Card.id` — and, separately, an
 * activated ability's source card is legitimately on the battlefield *and* on
 * the stack in the same frame. So a card placement is `c:<cardId>` and a stack
 * item is `s:<stackItemId>`, and the two never collide even when their numbers
 * do.
 */
export interface Placement {
  key: string;
  cardId: number;
  /** The card object from **this** frame. Never cached across frames (P5). */
  card: AnyCard;
  kind: SlotKind;
  /** The zone's player, or the stack item's controller; `null` where the wire says so. */
  playerId: number | null;
  seat: Seat;
  position: [number, number, number];
  /** XYZ Euler, radians. Flat permanents are `[-π/2, 0, θ]`. */
  rotation: [number, number, number];
  scale: number;
  /** Painter's order within a coplanar group; higher draws later (on top). */
  renderOrder: number;
  /**
   * Draw the procedural card back rather than a face. True for a redacted stub
   * (§3.3) and for any face-down card — the two cases the arena must never let
   * near `renderTextFrame`, because one has no name and the other's name is not
   * public (§4.4).
   */
  back: boolean;
  tapped: boolean;
  /** The stack item this placement came from, for `stack` placements only. */
  stackItemId: number | null;
  /**
   * §5.1's **one deliberate exception**: a persistent presentation rule from
   * the cue file, already folded into `position.y` above, plus the idle bob the
   * renderer adds each frame.
   *
   * A `presence` is **not a cue**. "The Helicarrier hovers above the board for
   * the rest of the game" cannot decay to identity, so it changes the *resting
   * pose* instead — which is why pressing **skip all** leaves it hovering and
   * why a scrub lands on it correctly with no history at all.
   */
  bobAmp: number;
  bobHz: number;
}

/** The whole resting pose of a frame. */
export interface Layout {
  /** In draw order: piles, ranks, stack, hands. */
  placements: Placement[];
  /** `key` → placement. */
  byKey: Map<string, Placement>;
  /** The seat the stream was redacted for, or `null` before `hello_ok`. */
  viewerId: number | null;
  /**
   * True when some placement bobs — the one thing on the table that moves with
   * no cue behind it, and therefore the one thing that keeps `frameloop` off
   * `demand` (§5.4). `false` on every frame of every recording that has no
   * `presence` card on the battlefield, which is almost all of them.
   */
  bobbing: boolean;
}

const EMPTY_LAYOUT: Layout = {
  placements: [],
  byKey: new Map(),
  viewerId: null,
  bobbing: false,
};

/**
 * Which player id this stream belongs to (§2.1's `you`).
 *
 * `hello_ok` first, the frame log's session header second, and the first seat
 * last — an AI-vs-AI recording has no human seat at all, and it still has to
 * pick a side to sit on or the camera has nothing to look at.
 */
export function viewerIdOf(state: ClientState): number | null {
  const hello = state.hello?.you;
  if (typeof hello === 'number') return hello;
  const seat = state.session?.seat;
  if (typeof seat === 'number') return seat;
  const first = state.board?.players[0];
  return first?.id ?? null;
}

function seatOf(playerId: number | null, viewerId: number | null): Seat {
  if (playerId === null || viewerId === null) return 'you';
  return playerId === viewerId ? 'you' : 'opp';
}

/** §3.2 — `x` of slot `i` of `n`, centred on the anchor. */
function rankX(i: number, n: number, pitch: number): number {
  return (i - (n - 1) / 2) * pitch;
}

/**
 * §3.3, verbatim. `n === 1` puts the single card at the anchor; `n === 0` never
 * calls it.
 */
export function fanSlot(
  n: number,
  i: number,
  anchor: Anchor,
  radius: number,
): { x: number; y: number; z: number; spin: number } {
  const totalDeg = Math.min(FAN_STEP_DEG * n, FAN_MAX_DEG);
  const total = (totalDeg * Math.PI) / 180;
  const a = n <= 1 ? 0 : -total / 2 + total * (i / (n - 1));
  const away = anchor.z >= 0 ? 1 : -1;
  return {
    x: Math.sin(a) * radius,
    z: anchor.z + away * (1 - Math.cos(a)) * radius * 0.35,
    y: anchor.y + Math.cos(a) * 0.05,
    spin: a * FAN_SPIN,
  };
}

/**
 * Battlefield rows: lands in their own rank, everything else in the creature
 * rank.
 *
 * **The test is `render/labels.ts`'s, not a second one** (verification fix,
 * CLAUDE.md M4 convention 6). The arena used to carry its own `/\bland\b/i`
 * beside the board's `/(^|\s)Land(\s|$|—|-)/`; compared over all 34 distinct
 * type lines in the committed corpus the two never disagreed, so it was latent
 * rather than live — and two definitions of "is this card a land" for the same
 * card in the same app is exactly what that convention exists to stop. `labels.
 * ts` is pure, corpus-tested and already imported under `node --test`, so this
 * costs nothing.
 */
function isLand(card: AnyCard): boolean {
  if (isHidden(card)) return false;
  return isLandTypeLine((card as { types?: string }).types ?? '');
}

function byId(a: AnyCard, b: AnyCard): number {
  return a.id - b.id;
}

/**
 * The resting pose of every object in one frame.
 *
 * Total over every frame the protocol allows: a pre-game `state` with no
 * players, a redacted hand, an empty stack, a card whose `controller` is `null`.
 * It never throws and never returns `undefined`.
 */
export function layout(
  state: ClientState,
  presence: Readonly<Record<string, Presence>> = {},
): Layout {
  const board = state.board;
  if (board === null) return EMPTY_LAYOUT;

  const viewerId = viewerIdOf(state);
  const placements: Placement[] = [];

  // **Two passes, and the second one is the whole point** (verification fix).
  //
  // An attachment is placed on its HOST, and a host is not necessarily in the
  // same seat's zone array: an Aura or an Equipment can be controlled by one
  // player and attached to a creature the other one controls (Quantum Reduction
  // is in the deck in play, and the 2D board documents the same case in as many
  // words — `Board.tsx`'s `splitBattlefield`: *"looked up across both seats"*).
  // Resolving the host against the placements made SO FAR therefore worked in
  // one direction and not the other: over the committed corpus, 2,651 of 15,830
  // state frames (16.7%) drew an attachment more than a card width from its
  // host, and every one of them was an attachment whose controller was laid out
  // before its host's controller. Ranks, piles and hands first, then one
  // attachment pass over every seat, so the lookup always sees the whole table.
  const deferred: PendingAttachment[] = [];
  for (const player of board.players) {
    layoutPlayer(player, seatOf(player.id, viewerId), placements, deferred);
  }
  layoutAttachments(deferred, placements);
  layoutStack(board, viewerId, placements);

  const bobbing = applyPresence(placements, presence);

  const byKey = new Map<string, Placement>();
  for (const placement of placements) byKey.set(placement.key, placement);
  return { placements, byKey, viewerId, bobbing };
}

/**
 * §5.1's `presence`, applied to the resting pose.
 *
 * Three deliberate narrowings, and each is a rule rather than a taste:
 *
 *  - **only on the battlefield.** A Helicarrier in the graveyard is a card in a
 *    pile; hovering it there would put it through the card above it.
 *  - **never on a card drawn as a back.** A concealed card has no `name` at all
 *    (§3.3's five keys), so it cannot match — and the branch is explicit rather
 *    than incidental, because "look this card up by name" is exactly the shape
 *    hard rule 8 exists to stop.
 *  - **the hover is folded into the position, the bob is not.** The hover is a
 *    resting pose and every consumer — the hit proxy, `deltaTo`, the camera
 *    solver — must see it. The bob is a function of *time*, and `layout()` is a
 *    pure function of *state*, so it is handed to the frame loop as two numbers
 *    instead (`CueRunner.tsx`).
 */
function applyPresence(
  placements: Placement[],
  presence: Readonly<Record<string, Presence>>,
): boolean {
  if (Object.keys(presence).length === 0) return false;
  let bobbing = false;
  for (const placement of placements) {
    if (placement.back) continue;
    if (placement.kind !== 'creature' && placement.kind !== 'land' && placement.kind !== 'attachment') {
      continue;
    }
    const name = (placement.card as { name?: string }).name;
    if (typeof name !== 'string' || name === '') continue;
    const rule = presence[name];
    if (rule === undefined) continue;
    const hover = rule.hoverY ?? 0;
    if (hover !== 0) {
      placement.position = [
        placement.position[0],
        placement.position[1] + hover,
        placement.position[2],
      ];
      // A hovering card is read from the side, not from directly above: it
      // tilts toward the camera so it does not become a line.
      placement.rotation = [placement.rotation[0] + 0.35, placement.rotation[1], placement.rotation[2]];
      // Drawn over everything else in its rank — it is above them now.
      placement.renderOrder += 20;
    }
    placement.bobAmp = rule.bobAmp ?? 0;
    placement.bobHz = rule.bobHz ?? 0.25;
    if (placement.bobAmp > 0) bobbing = true;
  }
  return bobbing;
}

/**
 * An attachment whose host has not been placed yet — see {@link layout}'s two
 * passes. It carries the seat it is *controlled* by, because that is what
 * `Placement.seat` means everywhere else; where it is *drawn* comes from the
 * host, which may belong to the other seat entirely.
 */
interface PendingAttachment {
  card: AnyCard;
  playerId: number;
  seat: Seat;
  /** The controller's own creature rank — the fallback when no host resolves. */
  anchors: SeatAnchors;
}

function layoutPlayer(
  player: PlayerState,
  seat: Seat,
  out: Placement[],
  deferred: PendingAttachment[],
): void {
  const anchors = anchorsFor(seat);
  const zones = player.zones;

  // -- battlefield ---------------------------------------------------------
  // Attachments do not take a rank slot (§3.2): they are parked on their host,
  // which `layout()` does in a second pass once every seat's ranks exist.
  const field = [...zones.battlefield.cards].sort(byId);
  const creatures: AnyCard[] = [];
  const lands: AnyCard[] = [];
  for (const card of field) {
    const host = (card as { attachedToId?: number | null }).attachedToId ?? null;
    if (host !== null) deferred.push({ card, playerId: player.id, seat, anchors });
    else if (isLand(card)) lands.push(card);
    else creatures.push(card);
  }

  rank(creatures, anchors.creatures, seat, 'creature', player.id, out);
  rank(lands, anchors.lands, seat, 'land', player.id, out);

  // -- piles ---------------------------------------------------------------
  pile([...zones.graveyard.cards].sort(byId), anchors.graveyard, seat, 'graveyard', player.id, out);
  pile([...zones.exile.cards].sort(byId), anchors.exile, seat, 'exile', player.id, out);
  pile([...zones.command.cards].sort(byId), anchors.command, seat, 'command', player.id, out);

  // -- hand ----------------------------------------------------------------
  const hand = [...zones.hand.cards].sort(byId);
  const radius = seat === 'you' ? FAN_RADIUS_YOU : FAN_RADIUS_OPP;
  for (let i = 0; i < hand.length; i++) {
    const card = hand[i]!;
    const slot = fanSlot(hand.length, i, anchors.hand, radius);
    out.push(
      place(card, `c:${String(card.id)}`, 'hand', player.id, seat, {
        position: [slot.x, slot.y, slot.z],
        // §3.3 — `order = i`, so the right-hand card overlaps the one left of it.
        renderOrder: 100 + i,
        pitch: anchors.hand.pitch,
        spin: slot.spin,
        // A hand card is never tap-rotated, whatever the snapshot says.
        ignoreTap: true,
      }),
    );
  }
}

/**
 * §3.2's attachments, placed once every seat's ranks exist.
 *
 * The host lookup is over the **whole** placement list, which is the fix: an
 * Aura I control on a creature the opponent controls is drawn on the opponent's
 * row, where the card actually is, exactly as the 2D board draws it. Two
 * attachments on one host fan apart whoever controls them, so the counter is
 * keyed by host id across both seats rather than per player.
 *
 * A host that does not resolve at all — attached to a *player* (a Curse), or an
 * id this viewer cannot see — still gets a place: its controller's own creature
 * anchor. A card in a slightly odd spot, never a crash and never a missing card.
 */
function layoutAttachments(deferred: PendingAttachment[], out: Placement[]): void {
  if (deferred.length === 0) return;
  const byKey = new Map<string, Placement>();
  for (const placement of out) byKey.set(placement.key, placement);

  const hostFan = new Map<number, number>();
  for (const pending of deferred) {
    const card = pending.card;
    const hostId = (card as { attachedToId?: number | null }).attachedToId ?? null;
    const host = hostId === null ? undefined : byKey.get(`c:${String(hostId)}`);
    const seen = hostId === null ? 0 : (hostFan.get(hostId) ?? 0);
    if (hostId !== null) hostFan.set(hostId, seen + 1);
    const anchors = pending.anchors;
    const base: [number, number, number] = host
      ? [host.position[0], host.position[1], host.position[2]]
      : [anchors.creatures.x, anchors.creatures.y, anchors.creatures.z];
    // **The host's seat, not the controller's** (verification fix). An
    // attachment is drawn lying on its host, so it has to lie the same way up
    // and the same way round as the host does — including when the two seats
    // disagree, which they legitimately do (an Equipment I control on a creature
    // the opponent controls). `layoutAttachments` used to hardcode `FLAT` and no
    // spin, which was right by accident on my side and left an opponent's Super
    // Suit reading perfectly normally two centimetres from the mirrored card it
    // was bolted to.
    const hostSeat: Seat = host?.seat ?? pending.seat;
    const spin = seatSpin(hostSeat);
    // The offset is in the HOST's frame, so it turns with it: "behind and to the
    // right" is behind and to the right *from that seat*, which is what the
    // overlap has to mean for it to read as one object on a table.
    const away = hostSeat === 'opp' ? -1 : 1;
    out.push(
      place(card, `c:${String(card.id)}`, 'attachment', pending.playerId, pending.seat, {
        position: [
          base[0] + away * (ATTACH_DX + seen * ATTACH_FAN_X),
          base[1] + ATTACH_DY,
          base[2] + away * ATTACH_DZ,
        ],
        // Drawn *behind* the host: a lower renderOrder, exactly as a real table
        // overlaps (§3.2).
        renderOrder: (host?.renderOrder ?? 0) - 1,
        pitch: FLAT,
        spin,
      }),
    );
  }
}

function rank(
  cards: AnyCard[],
  anchor: Anchor,
  seat: Seat,
  kind: SlotKind,
  playerId: number,
  out: Placement[],
): void {
  const n = cards.length;
  if (n === 0) return;
  const rows = Math.ceil(n / MAX_PER_RANK);
  const pitch = rows > 1 ? RANK_PITCH_TIGHT : RANK_PITCH;
  const perRow = rows > 1 ? Math.ceil(n / rows) : n;
  const away = anchor.z >= 0 ? 1 : -1;

  for (let i = 0; i < n; i++) {
    const card = cards[i]!;
    const row = Math.floor(i / perRow);
    const indexInRow = i - row * perRow;
    const inRow = Math.min(perRow, n - row * perRow);
    const sick = !isHidden(card) && (card as { sick?: boolean }).sick === true;
    out.push(
      place(card, `c:${String(card.id)}`, kind, playerId, seat, {
        position: [
          anchor.x + rankX(indexInRow, inRow, pitch),
          anchor.y + row * RANK_WRAP_Y + (sick ? SICK_DY : 0),
          anchor.z + away * row * RANK_WRAP_Z,
        ],
        renderOrder: row * 20 + indexInRow,
        pitch: anchor.pitch,
        // The across-the-table half-turn, in the plane (see {@link seatSpin}).
        spin: seatSpin(seat),
      }),
    );
  }
}

function pile(
  cards: AnyCard[],
  anchor: Anchor,
  seat: Seat,
  kind: SlotKind,
  playerId: number,
  out: Placement[],
): void {
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]!;
    out.push(
      place(card, `c:${String(card.id)}`, kind, playerId, seat, {
        position: [anchor.x + i * PILE_STEP_X, anchor.y + i * PILE_STEP_Y, anchor.z + i * PILE_STEP_Z],
        renderOrder: i,
        pitch: anchor.pitch,
        spin: seatSpin(seat),
      }),
    );
  }
}

/**
 * §3.4 — `state.stack` is ordered **bottom first; the last element resolves
 * next**, so the last element is the highest and the only one scaled up.
 *
 * The source card comes from `state.stackCards` through `sourceCardId`, never
 * from `players[].zones` (protocol §3.1: a spell on the stack is in
 * `ZoneType.Stack`, which is not one of the six zones a player carries), and
 * never by matching `stack[].id` against a card id — the two id spaces collide.
 */
function layoutStack(board: GameStateBody, viewerId: number | null, out: Placement[]): void {
  const items: StackItem[] = board.stack;
  const n = items.length;
  if (n === 0) return;
  const cards = new Map<number, AnyCard>();
  for (const card of board.stackCards) cards.set(card.id, card);

  for (let i = 0; i < n; i++) {
    const item = items[i]!;
    const card = item.sourceCardId === null ? undefined : cards.get(item.sourceCardId);
    if (card === undefined) continue;
    out.push(
      place(card, `s:${String(item.id)}`, 'stack', item.controller, seatOf(item.controller, viewerId), {
        position: [STACK_ANCHOR.x, STACK_ANCHOR.y + i * STACK_STEP_Y, STACK_ANCHOR.z - i * STACK_STEP_Z],
        renderOrder: 200 + i,
        pitch: STACK_ANCHOR.pitch,
        spin: 0,
        scale: i === n - 1 ? STACK_TOP_SCALE : 1,
        ignoreTap: true,
        stackItemId: item.id,
      }),
    );
  }
}

interface PlaceOptions {
  position: [number, number, number];
  renderOrder: number;
  pitch: number;
  spin: number;
  scale?: number;
  ignoreTap?: boolean;
  stackItemId?: number;
}

function place(
  card: AnyCard,
  key: string,
  kind: SlotKind,
  playerId: number | null,
  seat: Seat,
  options: PlaceOptions,
): Placement {
  const tapped = (card as { tapped?: boolean }).tapped === true;
  const spin = options.spin + (tapped && options.ignoreTap !== true ? TAP_ANGLE : 0);
  return {
    key,
    cardId: card.id,
    card,
    kind,
    playerId,
    seat,
    position: options.position,
    rotation: [options.pitch, 0, spin],
    scale: options.scale ?? 1,
    renderOrder: options.renderOrder,
    // The one branch that matters for hard rule 8 in 3D: a concealed card and a
    // face-down card are drawn as the shared card back and can never reach the
    // text frame, which renders a name (§4.4).
    back: isHidden(card) || isFaceDown(card),
    tapped,
    stackItemId: options.stackItemId ?? null,
    // Identity until `applyPresence` says otherwise: no card hovers by default.
    bobAmp: 0,
    bobHz: 0,
  };
}

// ---------------------------------------------------------------------------
// M7 E3 — resolving an anchor, so a cue never learns a coordinate
// ---------------------------------------------------------------------------

/**
 * **The HUD anchor of one seat**: where that player's life total, damage plate
 * and poison pip are drawn.
 *
 * It is a *layout* fact and not a HUD fact, which is why it is here: the `life`
 * and `damage` cues position their number by asking for `{kind:'player', id}`
 * and never by knowing a number. Placed on the −X side, clear of the library
 * (+X, beside the hand) and above the graveyard/exile column so nothing
 * overlaps a pile.
 */
const YOU_PLAYER_ANCHOR: Anchor = { x: -3.55, y: 0.25, z: 4.25, pitch: -0.9 };

export function playerAnchorFor(seat: Seat): Anchor {
  return seat === 'you'
    ? YOU_PLAYER_ANCHOR
    : { x: YOU_PLAYER_ANCHOR.x, y: YOU_PLAYER_ANCHOR.y, z: -YOU_PLAYER_ANCHOR.z, pitch: -0.9 };
}

/**
 * Where a banner lives: above the centre of the table, facing the camera. The
 * `turn` and `outcome` cues are the only things that use it.
 */
export const TABLE_ANCHOR: Anchor = { x: 0, y: 1.05, z: 0.2, pitch: -0.55 };

/** §3.6's lowercased `ZoneType` vocabulary → this seat's anchor. */
function zoneAnchor(anchors: SeatAnchors, zone: string): Anchor | null {
  switch (zone) {
    case 'hand':
      return anchors.hand;
    case 'battlefield':
      return anchors.creatures;
    case 'graveyard':
      return anchors.graveyard;
    case 'exile':
      return anchors.exile;
    case 'command':
      return anchors.command;
    case 'library':
      return anchors.library;
    case 'combat':
      return anchors.combat;
    case 'stack':
      return STACK_ANCHOR;
    default:
      return null;
  }
}

/**
 * A card's placement, preferring the battlefield copy over the stack one.
 *
 * One card can be placed twice — an activated ability's source is on the
 * battlefield *and* on the stack — and `c:<id>` is the battlefield one. A cue
 * that moves "the card" means the one you can see, and for a spell that is only
 * on the stack the stack copy is the only one there is.
 */
export function placementOf(placed: Layout, cardId: number): Placement | null {
  const direct = placed.byKey.get(`c:${String(cardId)}`);
  if (direct !== undefined) return direct;
  for (const placement of placed.placements) {
    if (placement.cardId === cardId) return placement;
  }
  return null;
}

/** A card's resting position, or `null` when this frame does not place it. */
export function restPositionOf(placed: Layout, cardId: number): [number, number, number] | null {
  return placementOf(placed, cardId)?.position ?? null;
}

/**
 * **Anchor → position**, and the only function that turns one into numbers.
 *
 * Report 09 §8 rule 3: cue camera targets and effect positions are expressed
 * *relative to anchors*, never as absolute positions, so changing the table
 * size cannot break a cue. This is the other end of that rule — everything in
 * `cues/` composes {@link AnchorRef}s, and this resolves them against the frame
 * that is actually on screen.
 *
 * Returns `null` for an anchor this frame cannot place (a card that is not
 * here, a zone name from a future protocol). A cue that gets `null` contributes
 * nothing, which is §3.6 rule 1 again: an id that does not resolve is a card
 * the viewer may not see, and that is correct rather than an error.
 */
export function anchorPosition(
  placed: Layout,
  ref: AnchorRef,
): [number, number, number] | null {
  const seatOfPlayer = (playerId: number | null): Seat => {
    if (playerId === null) return 'you';
    return seatOf(playerId, placed.viewerId);
  };

  switch (ref.kind) {
    case 'card':
      return restPositionOf(placed, ref.id);
    case 'player': {
      const a = playerAnchorFor(seatOfPlayer(ref.id));
      return [a.x, a.y, a.z];
    }
    case 'zone': {
      // A `zone` anchor with no player is the card's own side of the table:
      // an Equipment flying "from the battlefield" means from *its* rank.
      const anchors = anchorsFor(seatOfPlayer(ref.player));
      const anchor = zoneAnchor(anchors, ref.zone);
      return anchor === null ? null : [anchor.x, anchor.y, anchor.z];
    }
    case 'combat': {
      const anchors = anchorsFor(seatOfPlayer(ref.player));
      return [anchors.combat.x, anchors.combat.y, anchors.combat.z];
    }
    case 'stack':
      return [STACK_ANCHOR.x, STACK_ANCHOR.y, STACK_ANCHOR.z];
    case 'table':
      return [TABLE_ANCHOR.x, TABLE_ANCHOR.y, TABLE_ANCHOR.z];
    case 'above': {
      const base = restPositionOf(placed, ref.id);
      return base === null ? null : [base[0], base[1] + ref.height, base[2]];
    }
    case 'beside': {
      // `dx` is in CARD WIDTHS: a cue says "one card to the left", never "0.72
      // units to the left", so this stays the only file that owns the number.
      const base = restPositionOf(placed, ref.id);
      return base === null ? null : [base[0] + ref.dx * (CARD_W + 0.08), base[1] + 0.02, base[2]];
    }
    default:
      return null;
  }
}

/**
 * §5.1's displacement query, in coordinates: how far a card would have to move
 * from its resting pose to sit at `ref`.
 *
 * This is what `Stage.deltaTo` answers, and it is why a cue can say "start at
 * the library and decay to identity" without knowing where either place is.
 */
export function anchorDelta(
  placed: Layout,
  cardId: number,
  ref: AnchorRef,
): [number, number, number] {
  const placement = placementOf(placed, cardId);
  if (placement === null) return [0, 0, 0];
  const to = anchorPosition(placed, ownSideOf(ref, placement));
  if (to === null) return [0, 0, 0];
  const from = placement.position;
  return [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
}

/**
 * **A zone or combat anchor with no player is the card's OWN side of the
 * table.**
 *
 * An Equipment flying "from the battlefield" means from *its* rank, and a
 * creature moving "to its combat lane" means the lane in front of its own seat.
 * Without this, every such cue aimed at the viewer's side and an opponent's
 * Equipment flew in from across the table — measured in the browser at frame 30
 * of g1.jsonl, where the opponent's S.H.I.E.L.D. Spy Kit rose out of the
 * viewer's hand.
 *
 * A cue that genuinely means a *named* player's zone passes the id and is left
 * alone; `null` is the wire's "shared zone" (§3.6) and is the only case this
 * touches.
 */
function ownSideOf(ref: AnchorRef, placement: Placement): AnchorRef {
  if (placement.playerId === null) return ref;
  if (ref.kind === 'zone' && ref.player === null) {
    return { kind: 'zone', player: placement.playerId, zone: ref.zone };
  }
  return ref;
}
