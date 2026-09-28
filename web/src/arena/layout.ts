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
/**
 * **UNDER its host, not over it** (the second verification pass). It was +0.002:
 * drawn behind the host by `renderOrder` but lying 2 mm ABOVE it, so its click
 * proxy — 10% larger than the card — was the nearer hit over most of the host,
 * and a click on Peggy Carter under the opponent's Quantum Reduction answered
 * "Not selectable: card 45" (live, seed 11, view 2); she could be declared an
 * attacker only through Alpha Strike. Below the host the host wins every click
 * on its own face, and the attachment keeps the strip it shows —
 * `layout.test.ts` raycasts both over every corpus attachment from the three
 * seat-safe views. (Never "route a click to the host": that would be gating a
 * click on `selectable`, amendment M8.)
 */
export const ATTACH_DY = -0.002;
const ATTACH_DZ = 0.14;
const ATTACH_FAN_X = 0.1;

/** §3.2 — summoning sickness is a small y drop and a desaturation, never a tint overlay. */
const SICK_DY = -0.015;

// ---------------------------------------------------------------------------
// Tier 2 — where a figure stands (report 13 §3.1)
// ---------------------------------------------------------------------------

/**
 * How far a figure stands off the front edge of its card, **toward the centre of
 * the table** (report 13 §3.1).
 *
 * Three reasons, in the order they matter. **The card stays readable:** the rest
 * camera is a steep three-quarter view (`camera.ts`'s `REST_POSE`) and a figure
 * standing *on* its card occludes the art from exactly that angle. **It stands
 * where it will fight:** the creature rank is at `z = 2.3` and the combat lane at
 * `z = 0.9`, so 0.52 puts the figure at `z ≈ 1.78` and the attack lunge is a
 * short step toward the centre line rather than a leap over its own card. **It
 * inherits `presence` for free**, because it is derived from
 * `placement.position`, which {@link applyPresence} has already lifted.
 */
export const FIGURE_STANDOFF = 0.52;

/**
 * A figure's nominal height in world units — about one card long.
 *
 * **Slice 4 — and now a figure is this tall.** A chibi was 1.07–1.15× wider than
 * tall, so the width clamp below held every humanoid to 0.63; a proportioned body
 * is 0.33× (the woman) and 0.37× (the man) in its widest resting stance — the
 * idle, measured by the build on the skinned mesh — so it stands its full 0.85,
 * 0.28–0.31 wide in a 0.72 slot. Unchanged here on purpose: a person
 * one card tall reads at 60–100 px from the table view, and a taller one would
 * cover the opponent's creature rank from yours.
 */
export const FIGURE_HEIGHT = 0.85;

/**
 * **How wide a figure may be, and it is a rank slot** (T7's tuning pass; report
 * 13 §3.1 gave a height and no width).
 *
 * The Kenney Mini characters are **chibis** — measured on the skinned mesh by
 * `tools/build-figures.mjs` (T8), 1.07–1.15× wider than tall in their widest
 * resting stance — and the Quaternius drone is a flying robot 1.66× wider than
 * tall. Normalising by HEIGHT alone to {@link FIGURE_HEIGHT} therefore makes a
 * figure wider than the creature-rank pitch of {@link RANK_PITCH} = 0.796: two
 * Soldier Tokens shoulder to shoulder in T2's own photograph.
 *
 * So the figure's drawn height is clamped so that its *width* fits one slot minus
 * a gutter, **for every archetype, with no exemption** (T8, Tier 2 follow-up 11).
 * The clamp lives here because the pitch lives here; it is applied by
 * `figures/pose.ts`, which is pure, so `web/test/figure-pose.test.ts` asserts the
 * footprint over the whole corpus with no browser.
 *
 * T7 floored the clamp (`FIGURE_MIN_FIT` 0.55) because the drone, measured then at
 * 2.97× wider than tall, would have been drawn 0.24 units tall. **That measurement
 * was the build's, not the drone's**: `getBounds()` applied the skinned mesh's own
 * node transform, which glTF ignores, and slice 1's join had carried the body's
 * primitives onto the eyes' skin, which moved them. Rebuilt and measured as three
 * draws it, the drone is 1.66× — so the strict clamp costs it 0.03 units of height
 * against the old floor, and the floor, and the one archetype allowed to overflow
 * its slot, are gone.
 */
export const FIGURE_MAX_WIDTH = RANK_PITCH - 0.076;

/**
 * **A wrapped rank's back row** (T8, Tier 2 follow-up 3).
 *
 * {@link RANK_WRAP_Z} is 0.55 and {@link FIGURE_STANDOFF} is 0.52, so a back-row
 * figure standing off its card's front edge lands on the FRONT row's cards — and
 * report 13 §3.1's own falloff (`0.52 × (1 − 0.45 × row)`) still left it there,
 * measured by the verification pass and by `figure-pose.test.ts`: 216 back-row
 * stand points inside another card over the corpus (g3, human-auto-2026 and
 * human-sideboard-7 all wrap).
 *
 * A back-row figure therefore stands **on its own card**, in the strip the front
 * row leaves uncovered: an untapped front-row card reaches `anchor + 0.5`, the
 * land rank starts at `anchor + 0.6`, and the back row's card centre is at
 * `anchor + 0.55`. The one card that can still lie there is a front-row host's
 * **attachment** (drawn 0.14 behind its host) — so if the centre is covered, the
 * figure steps back from the table's centre line by {@link BACK_ROW_STEP} until
 * it is clear, at most {@link BACK_ROW_MAX_STEPS} times. Measured over the corpus's
 * 200 back-row stand points (g3, human-auto-2026, human-sideboard-7): 189 stand on
 * their card's centre and 11 step back twice (0.10), all of them clearing an
 * Aura or Equipment on the front-row creature beside them.
 */
const BACK_ROW_STEP = 0.05;
const BACK_ROW_MAX_STEPS = 6;

/**
 * **The stand disc of a figure standing ON its card is drawn after the cards**
 * (T8 fix; the slice-2 verification pass). The disc is additive, transparent and
 * writes no depth, and a back-row card's `renderOrder` is `20 + i` (`rank`,
 * `+ 20` again while it hovers), so a back-row disc drawn in the front row's pass
 * (`renderOrder` 5) was painted over by its own card: at `human-sideboard-7`
 * frames 1181 and 1195, five discs a seat were invisible. The on-card discs get a
 * second instanced pass at this order — above every battlefield rank (at most
 * `2 × 20 + MAX_PER_RANK`, and a hover's `+ 20`) and below the hand fan's `100`.
 */
export const ON_CARD_DISC_ORDER = 70;

/**
 * **How far a dying body steps out of its rank** (T8 fix — `figures/pose.ts`'s
 * `departureStand`). A rank closes up in the snapshot a creature leaves it, so the
 * body cannot stay in its slot without its neighbours walking through it. One step
 * toward the centre line puts it in its own combat lane (a front-row figure stands
 * at `z ≈ 1.78`, the lane is at `0.9`): 0.85 is a proportioned body's whole height
 * (slice 4 — it was the chibi's clamped 0.63 plus a gutter), so a body that falls
 * on its back, as `Death01` does, lies clear of the figures it stepped out from —
 * its head toward the centre line, which it does not cross (a figure falls away
 * from the seat it faces, and your figures face you).
 */
export const DEPARTURE_STEP = 0.85;

/**
 * **The lowest a vehicle's silhouette flies** (Tier 2 slice 3, T10), world units
 * above the table. The carrier is posed at its stand point lifted by its trait's
 * `hover` — on top of the card's own `presence` hover (0.9 for the Helicarrier in
 * `cues.json`) — and never below this, so it is overhead whether or not a
 * presence rule lifts its card: its underside clears the tallest head on the
 * table (a hovering Wasp, ≈ 1.1) with room, which `figure-pose.test.ts` asserts
 * over the corpus. It lives here because an altitude is a coordinate.
 *
 * **2.05, not slice 3's first 1.65** (the verification pass, `g1`@323): at 1.65
 * a carrier over YOUR rank projected, from the table view's steep camera, straight
 * onto your own figures — a rotor disc sat on Wasp's head, and 352 of the corpus's
 * 799 carrier/own-figure pairs overlapped on screen by more than 5%. Raised 0.4
 * (and drawn 20% shorter, `figures/props.ts`'s `CARRIER_LENGTH`) it projects above
 * the rank it flies over: `figure-pose.test.ts` projects every carrier and every
 * figure through the table view's camera and asserts no overlap on either seat.
 * From the two over-the-shoulder views a carrier over your rank still projects
 * onto the FAR rank — that is what an aircraft between you and the far side of a
 * table does in perspective, the hull is translucent, and it was so before.
 */
export const SILHOUETTE_ALTITUDE = 2.05;

/**
 * **Where the OPPONENT's carrier flies: over the table's centre line, low, and a
 * fifth smaller** (the second verification pass). From the table view (view 1)
 * the opponent's whole side is packed between the arena's own chrome and the
 * middle of the screen: its land rank starts some 15 px below the credit line
 * at 1600 × 1000, so anything flying over the opponent's rank is either under
 * the HUD (as the opponent's carrier at {@link SILHOUETTE_ALTITUDE} was — "half
 * hidden behind the camera strip and the attribution line", `g1`@316/355,
 * `g3`@270) or over the opponent's own figures. A grid of altitude, inboard shift
 * and scale over the corpus (every seat-safe view, every live aspect) found no
 * place over the opponent's half that satisfies both; the centre line does:
 * `figure-pose.test.ts` holds its projected top under {@link HUD_TOP_PX} at every
 * aspect in `LIVE_ASPECTS` and its cover of every figure under 5%. What it costs,
 * measured the same way: from the two over-the-shoulder views (2, 5) it projects
 * onto the far rank — the cost D77 already accepted for YOUR carrier there — and
 * where both players have one at the same x the two hulls overlap on screen.
 * Your own carrier is unchanged: over your rank at {@link SILHOUETTE_ALTITUDE}.
 */
export const OPP_SILHOUETTE_Z = 0.25;
export const OPP_SILHOUETTE_ALTITUDE = 0.8;
export const OPP_SILHOUETTE_SCALE = 0.8;

/**
 * **The chrome over the top of the canvas**, in CSS pixels below its top edge
 * (the second verification pass): the decision bar, the cue and camera strips,
 * the credit line and the opponent's seat card, measured in the browser at
 * 1600 × 1000, 1280 × 800, 1920 × 1080, 1000 × 1000 and 2560 × 1080 — fixed
 * pixel heights, so the band a pose must keep out of is `HUD_TOP_PX / canvas
 * height` of the frame. The canvas starts 54 px down the window, under the app's
 * own header.
 */
export const HUD_TOP_PX = 128;

/** Where a vehicle's silhouette flies: the ground point under it, how high above that, and its scale. */
export interface SilhouettePlacement {
  ground: [number, number, number];
  lift: number;
  scale: number;
}

/**
 * **A vehicle's silhouette, placed** (T10; the opponent's since the second
 * verification pass): YOUR carrier over your own rank, at least
 * {@link SILHOUETTE_ALTITUDE} up and no lower than its trait's `hover`; the
 * OPPONENT's over the centre line at {@link OPP_SILHOUETTE_ALTITUDE}, a fifth
 * smaller, at its card's x. Pure; `figures/pose.ts` reads it and
 * `figure-pose.test.ts` holds a pose to it.
 */
export function silhouettePlacementOf(placement: Placement, hover: number): SilhouettePlacement {
  const stand = standPointOf(placement);
  if (placement.seat === 'you') {
    return { ground: stand, lift: Math.max(hover, SILHOUETTE_ALTITUDE - stand[1]), scale: 1 };
  }
  const table = anchorsFor('opp').combat.y;
  return {
    ground: [stand[0], table, OPP_SILHOUETTE_Z],
    lift: OPP_SILHOUETTE_ALTITUDE - table,
    scale: OPP_SILHOUETTE_SCALE,
  };
}

/** The placement kinds that lie FLAT on the table — the footprints a figure may not stand in. */
const FLAT_KINDS: ReadonlySet<SlotKind> = new Set<SlotKind>([
  'creature',
  'land',
  'attachment',
  'graveyard',
  'exile',
  'command',
]);

/** Which way a seat faces: `you` stands at +Z and steps toward −Z, and back. */
export function seatSign(seat: Seat): number {
  return seat === 'you' ? 1 : -1;
}

// ---------------------------------------------------------------------------
// Tier 2 slice 3 — which way a figure's FRONT is (D81), one definition
// ---------------------------------------------------------------------------

/**
 * **A figure's front, in figure space: +Z.** `scene/models.ts` turns every model
 * so its face is at +Z (`models.json`'s `facing`, `FACING_TURN`), and
 * `figures/props.ts` writes every prop anchor in that space — the Kenney face
 * detail on the z = +0.25 plane, the drone's eye at +z, its thrusters at −z. The
 * figure pose then turns the whole body by `facingY` about y, so its front in the
 * WORLD is `FIGURE_FRONT_Z · (sin facingY, cos facingY)`.
 *
 * It is here, beside the rest of the arena's coordinates, because two tracks have
 * to agree on it and once did not: the prop field (`scene/props.ts`, which
 * rotates figure space by `facingY`) put the Doombot's eye at the front, and the
 * effect binding's `figure` anchor (`scene/effects.ts`) resolved `fwd` along
 * `−(sin, cos)` — so every T11 beat anchored in front of a body (the jet's eye and
 * laser, Agent 13's muzzle, Coulson's badge flash, the Power-up's vials) landed
 * BEHIND it, and the jet's exhaust streamed out of the drone's face (slice-3
 * verification, `g1`@231→232). {@link figurePointInto} is now the only
 * resolution of `fwd` / `side`, and `web/test/facing.test.ts` resolves both
 * tracks for both seats and asserts they land on the same side.
 */
export const FIGURE_FRONT_Z = 1;

/**
 * **The turn about y a seat's figures stand at**, before a trait's own `turn`.
 *
 * **A seat's own figures FACE THE OPPONENT** (**D143**, the user's answer to
 * PLAN question 13, 2026-09-28): `π` for `you` — with their fronts at +Z
 * ({@link FIGURE_FRONT_Z}) turned half round, your figures face the far seat and
 * show your camera their backs — and `0` for the opponent's, whose figures face
 * you. Two armies across a table, as the card art stages a confrontation; the
 * opponent's faces, badges, eyes and pistols read from your seat, yours from
 * theirs. Slice 3 measured the other answer and left it as D81's "one line"; this
 * is that line, and every prop, every T11 anchor and every attack turn moved with
 * it, because they all read this facing and nothing else.
 *
 * Two things never depended on the answer (the second verification pass):
 * an attack turns its attacker to FACE its defender for the length of the lunge
 * (`Stage.yawTo` → the offset's `dRotY`, {@link figureYawTo}) — now a small turn
 * toward the defender's side rather than a half turn — and every
 * identity-critical prop reads from behind as well as from the front
 * (`traits.test.ts` rasterises each from both seats; D83).
 */
export function seatFacingY(seat: Seat): number {
  return seat === 'you' ? Math.PI : 0;
}

/**
 * **A figure-space point → the `figure` anchor's terms** (`at` / `fwd` / `side`,
 * in figure heights): how a cue lands a beat ON a prop — Agent 13's muzzle flash
 * on `figures/props.ts`'s `PISTOL_MUZZLE` — with the same front and the same right
 * hand {@link figurePointInto} resolves them against. Right is `front × up`.
 */
export function figureAnchorOf(point: readonly [number, number, number]): { at: number; fwd: number; side: number } {
  return { at: point[1], fwd: point[2] * FIGURE_FRONT_Z, side: -point[0] * FIGURE_FRONT_Z };
}

/**
 * **A point on a figure → world**, written into `out` and returned (no
 * allocation: the effect binding calls it on the frame loop's path).
 *
 * `(px, py, pz)` is the figure's origin — its feet — and `facingY` its turn.
 * `fwd` is along its FRONT, `side` toward its RIGHT hand and `up` straight up,
 * all in world units. Its right hand is `front × up`: for a figure facing +Z
 * that is −X, which is where `figures/props.ts` puts the pistol's `arm-right`.
 */
export function figurePointInto(
  out: [number, number, number],
  px: number,
  py: number,
  pz: number,
  facingY: number,
  fwd: number,
  up: number,
  side: number,
): [number, number, number] {
  const fx = FIGURE_FRONT_Z * Math.sin(facingY);
  const fz = FIGURE_FRONT_Z * Math.cos(facingY);
  out[0] = px + fx * fwd - fz * side;
  out[1] = py + up;
  out[2] = pz + fz * fwd + fx * side;
  return out;
}

/**
 * **The turn about y that brings a figure facing `facingY` round to face a
 * point** — radians in (−π, π], the short way round; `0` when the point is on
 * top of it. Pure, and written against {@link FIGURE_FRONT_Z}'s one definition
 * of a front, so a figure turned by it points its muzzle, its eye and its pistol
 * at `(toX, toZ)` whichever way its seat's figures stand.
 */
export function yawToward(facingY: number, fromX: number, fromZ: number, toX: number, toZ: number): number {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  if (dx * dx + dz * dz < 1e-9) return 0;
  // The front in the world is FIGURE_FRONT_Z · (sin θ, cos θ): solve for θ.
  const want = Math.atan2(FIGURE_FRONT_Z * dx, FIGURE_FRONT_Z * dz);
  let turn = want - facingY;
  while (turn > Math.PI) turn -= 2 * Math.PI;
  while (turn <= -Math.PI) turn += 2 * Math.PI;
  return turn;
}

/**
 * **`Stage.yawTo`, in coordinates** (Tier 2 slice 3's second verification pass):
 * the turn that faces the figure standing for `cardId` toward `ref`, from its
 * seat's facing ({@link seatFacingY}) at its stand point ({@link standPointOf}).
 *
 * A trait's own `turn` (the giant ant flies side-on) is deliberately NOT taken
 * out: the delta is measured from the seat's facing, so a side-on flier stays
 * side-on to its target rather than swinging nose-first — the one figure with a
 * `turn` attacks with no front-anchored beat (`attack.jet`'s `eye: false`).
 * `0` for a card with no placement or an anchor that does not resolve.
 */
export function figureYawTo(placed: Layout, cardId: number, ref: AnchorRef): number {
  const placement = placementOf(placed, cardId);
  if (placement === null) return 0;
  const to = anchorPosition(placed, ownSideOf(ref, placement));
  if (to === null) return 0;
  const stand = standPointOf(placement);
  return yawToward(seatFacingY(placement.seat), stand[0], stand[2], to[0], to[2]);
}

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
  | 'library'
  | 'casting';

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
  /**
   * **Report 13 §6.2's casting anchor** (T4): where this seat's floating mana
   * hovers and where a spell it is casting stands.
   *
   * It is above the seat's own land rank and inboard of the library, so it is
   * clear of the hand fan, of the stack column at `x = +4.8` and of the
   * graveyard/exile column at `x = −4.8`. It is a *layout* fact like
   * {@link playerAnchorFor}, which is why the mana cue can aim at it without
   * learning a number.
   */
  casting: Anchor;
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
  casting: { x: 1.9, y: 0.75, z: 3.6, pitch: -0.6 },
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
    casting: mirror(YOU_ANCHORS.casting),
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
  /**
   * Which row of a wrapped rank this placement is in — 0 for everything that is
   * not a wrapped battlefield rank. Read by {@link standPointOf} and by nothing
   * else, because the row is the only thing a figure needs that the position
   * alone cannot tell it (report 13 §3.1).
   */
  row: number;
  /**
   * **T8 — where a figure stands for this placement**, decided by `layout()` once
   * every card on the table has been placed (a back-row stand point depends on
   * its neighbours' attachments). `null` for everything that is not a creature
   * rank slot; read through {@link standPointOf}, never directly.
   */
  stand: [number, number, number] | null;
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
 * **T8 fix — the hand fan as an OCCLUDER** (`camera.ts`'s `keepsSeat`).
 *
 * The world corners of every card of an `n`-card fan at `seat`, exactly as
 * `layout()` places it and `CardPlane` draws it: `UNIT_PLANE` scaled to
 * `CARD_W × 1`, turned by the Euler `[pitch, 0, spin]` (three's default `XYZ`
 * order, so the in-plane spin first and the tilt toward the camera second), at the
 * {@link fanSlot} position. The slice-2 verification pass found the shoulder and
 * low views letting the fan cover most of the viewer's own land rank; the camera
 * now proves a seat's view keeps the ranks visible above it, and this is the
 * geometry it proves that against. Pure; seven cards is the widest fan there is
 * (`FAN_MAX_DEG` is reached at seven).
 */
export function fanCorners(n: number, seat: Seat): Array<Array<[number, number, number]>> {
  const anchors = anchorsFor(seat);
  const radius = seat === 'you' ? FAN_RADIUS_YOU : FAN_RADIUS_OPP;
  const out: Array<Array<[number, number, number]>> = [];
  for (let i = 0; i < n; i++) {
    const slot = fanSlot(n, i, anchors.hand, radius);
    const pitch = anchors.hand.pitch;
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const cs = Math.cos(slot.spin);
    const ss = Math.sin(slot.spin);
    const corners: Array<[number, number, number]> = [];
    for (const [lx, ly] of [
      [-CARD_W / 2, -0.5],
      [CARD_W / 2, -0.5],
      [CARD_W / 2, 0.5],
      [-CARD_W / 2, 0.5],
    ] as const) {
      // Rz(spin), then Rx(pitch): the card's own plane is z = 0.
      const x1 = lx * cs - ly * ss;
      const y1 = lx * ss + ly * cs;
      corners.push([x1 + slot.x, y1 * cp + slot.y, y1 * sp + slot.z]);
    }
    out.push(corners);
  }
  return out;
}

/**
 * How far toward its seat each of {@link seatRankLines}' two lines is drawn from
 * the rank's own centre line. The verification pass asked for the centre lines;
 * a view tuned against exactly that clears them by a rounding error (the first
 * one did, by 0.002 of the frame's height) and shows half a land. At 0.15 the far
 * 65% of every card in either rank is above the hand — measured live on a Plains
 * with a raycast grid, 41 of 96 samples on the card from the shoulder where slice
 * 2 had 20 of 103 (the table view, which nothing covers: 81 of 92). A larger
 * margin buys the rest of the card only by lifting both views most of the way
 * back to the table view.
 */
export const SIGHTLINE_MARGIN = 0.15;

/**
 * **T8 fix — the two lines a seat has to be able to see**: the centre lines of its
 * own land rank and creature rank ({@link SIGHTLINE_MARGIN} toward the seat),
 * sampled every `step` across the widest rank (`MAX_PER_RANK` slots at
 * `RANK_PITCH`). `camera.ts`'s `keepsSeat` requires none of these points to be
 * covered by the hand fan in a view a live seat may use — tapping a land, reading
 * which are tapped and targeting your own creatures all happen on these two lines,
 * so the far two-thirds of every card in either rank is above the hand.
 */
export function seatRankLines(seat: Seat, step = 0.2): Array<[number, number, number]> {
  const anchors = anchorsFor(seat);
  const half = rankX(MAX_PER_RANK - 1, MAX_PER_RANK, RANK_PITCH);
  const toward = seatSign(seat) * SIGHTLINE_MARGIN;
  const out: Array<[number, number, number]> = [];
  for (const rank of [anchors.lands, anchors.creatures]) {
    for (let x = -half; x <= half + 1e-9; x += step) out.push([rank.x + x, rank.y, rank.z + toward]);
  }
  return out;
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
  // **After** presence: a hovering card's figure hovers with it (§3.1).
  placeStands(placements);

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
        row,
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
  row?: number;
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
    row: options.row ?? 0,
    stand: null,
  };
}

/**
 * **Where a figure stands for this placement** (report 13 §3.1, T8).
 *
 * Off the front edge of its card, toward the centre of the table — and, for a
 * wrapped rank's back row, on its own card behind the front row (see
 * {@link BACK_ROW_STEP}). `layout.ts` answers this rather than `figures/pose.ts`
 * because `layout.ts` is the only module in the arena that knows a coordinate
 * (§3.2), and because both rules compose with {@link RANK_WRAP_Z} and with where
 * the other cards lie, which live here.
 *
 * The y is the placement's own, so a `presence` hover (the Helicarrier, the
 * Doombot) lifts the figure with the card for free.
 */
export function standPointOf(placement: Placement): [number, number, number] {
  return placement.stand ?? frontStand(placement);
}

function frontStand(placement: Placement): [number, number, number] {
  if (placement.row > 0) return [placement.position[0], placement.position[1], placement.position[2]];
  return [
    placement.position[0],
    placement.position[1],
    placement.position[2] - seatSign(placement.seat) * FIGURE_STANDOFF,
  ];
}

/**
 * Does this card's footprint on the table contain the point `(x, z)`?
 *
 * A flat card is `CARD_W × 1` in its own plane, turned by its in-plane spin
 * (`rotation[2]`: the seat's half-turn plus `TAP_ANGLE` when tapped), so a tapped
 * card is one unit wide in x and `CARD_W` deep in z.
 */
export function footprintContains(placement: Placement, x: number, z: number): boolean {
  const spin = placement.rotation[2];
  const dx = x - placement.position[0];
  const dz = z - placement.position[2];
  const c = Math.cos(spin);
  const s = Math.sin(spin);
  const along = c * dx + s * dz;
  const across = -s * dx + c * dz;
  return (
    Math.abs(along) < (CARD_W * placement.scale) / 2 - 1e-9 &&
    Math.abs(across) < 0.5 * placement.scale - 1e-9
  );
}

/** Is `other` one of `host`'s own attachments? A figure may stand on its own aura. */
function attachedTo(other: Placement, host: Placement): boolean {
  if (other.kind !== 'attachment') return false;
  return ((other.card as { attachedToId?: number | null }).attachedToId ?? null) === host.cardId;
}

/**
 * T8's stand points, for every creature-rank slot of the frame.
 *
 * The front row needs no search — 0.52 off a card that is 0.5 deep is clear of
 * everything by construction — and the back row is rare (four fixtures ever wrap
 * a rank), so the O(n²) footprint scan runs only for it.
 */
function placeStands(placements: Placement[]): void {
  let flat: Placement[] | null = null;
  for (const placement of placements) {
    if (placement.kind !== 'creature') continue;
    if (placement.row === 0) {
      placement.stand = frontStand(placement);
      continue;
    }
    flat ??= placements.filter((p) => FLAT_KINDS.has(p.kind));
    const [x, y, z0] = frontStand(placement);
    const away = seatSign(placement.seat);
    let stand: [number, number, number] = [x, y, z0];
    for (let step = 0; step <= BACK_ROW_MAX_STEPS; step += 1) {
      const z = z0 + away * step * BACK_ROW_STEP;
      const covered = flat.some(
        (other) => other !== placement && !attachedTo(other, placement) && footprintContains(other, x, z),
      );
      if (!covered) {
        stand = [x, y, z];
        break;
      }
    }
    placement.stand = stand;
  }
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
    case 'casting': {
      const anchors = anchorsFor(seatOfPlayer(ref.player));
      // `ground` is the table under the anchor (T6's fizzle): the land rank's own
      // height, so a falling form meets the terrain rather than stopping in air.
      const y = ref.ground === true ? anchors.lands.y : anchors.casting.y;
      return [anchors.casting.x, y, anchors.casting.z];
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
  // T4's casting anchor takes the same rule, and needs it for the same reason: a
  // mana mote rises from a land to **that land's controller's** anchor, and the
  // cue is not allowed to name a seat (report 13 §5.4 — "no invented link").
  if (ref.kind === 'casting' && ref.player === null) {
    return ref.ground === true
      ? { kind: 'casting', player: placement.playerId, ground: true }
      : { kind: 'casting', player: placement.playerId };
  }
  return ref;
}
