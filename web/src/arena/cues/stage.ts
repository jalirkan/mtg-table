/*
 * mtg-table — arena/cues/stage.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The seam between a cue and the scene** (report 09 §2.4, §5.1).
 *
 * A cue implementation computes plain numbers and hands them to a `Stage`; only
 * `Arena.tsx` and `scene/*` turn those numbers into `THREE.Object3D` mutations.
 * That split is what makes the whole cue engine testable in bare Node: the
 * fixture sweep (§10.3) runs every event of every committed recording through
 * the real queue against a {@link NullStage} that records ops instead of
 * touching WebGL.
 *
 * ---------------------------------------------------------------------------
 * Two rules hold this interface's shape, and both are §5.1:
 *
 *  1. **A cue writes offsets, never poses.** {@link Offset} is a *delta* from
 *     `layout(state)`, it starts at identity and it is back at identity when the
 *     cue ends. `replay-cues.test.ts` asserts the offset map is **empty** after
 *     every batch drains — that is the mechanical proof that skip, scrub and
 *     resync are all the same thing.
 *  2. **A cue knows no coordinates.** `layout.ts` is the only module in the
 *     codebase that does (§3.2). So a cue that wants to start a card "at the
 *     library" asks {@link Stage.deltaTo} for the displacement and decays it;
 *     an effect is positioned by an {@link AnchorRef}, never by an `x, y, z`
 *     the cue made up. Change the table size and every cue still aims.
 *
 * **Tier 2 adds one lane and obeys both rules with it** (report 13 §3.3): a
 * {@link ClipRequest} carries a clip name, a `t`, a weight and an optional alias
 * — numbers and strings from a closed set, no `Object3D`, no coordinate — and
 * {@link Stage.clearClip} is what returns the figure to the pose `figurePose`
 * says it holds. `replay-cues.test.ts` asserts the clip map is **empty** after
 * every batch drains, exactly as it does for offsets, and that assertion is the
 * mechanical proof that the lane was built on the right side of §1.1.
 * ---------------------------------------------------------------------------
 */

import { clipBeats, type ClipRequest } from '../figures/clips.ts';
import type { CueParams } from './types.ts';

export type Vec3 = readonly [number, number, number];

export const ZERO3: Vec3 = Object.freeze([0, 0, 0] as const);

// ---------------------------------------------------------------------------
// Offsets — the transient half of every pose
// ---------------------------------------------------------------------------

/**
 * The transient part of a card's transform (§5.1). **Identity means "the cue
 * contributes nothing"**, and every field's identity value is the one a
 * multiply or an add leaves alone.
 */
export interface Offset {
  /** World-space translation added to the resting position. */
  dx: number;
  dy: number;
  dz: number;
  /** Added to the card's pitch (rotation about X). */
  dRotX: number;
  /** Added to the card's in-plane spin. A tap is `TAP_ANGLE` of this. */
  dRotZ: number;
  /**
   * **Added to the card's FIGURE's facing** — a turn about y, radians (Tier 2
   * slice 3's second verification pass). It is the figure's vocabulary exactly as
   * `dRotZ` is the card's: a card IGNORES it (a card lying on the table has no
   * front), and a figure ignores `dRotZ` (a tapped creature kneels; it does not
   * pirouette). An attack turns its attacker toward its defender with it
   * ({@link Stage.yawTo}) for the length of the lunge and decays it to 0, so the
   * muzzle, the laser eye and the pistol point at what they fire at whichever way
   * the figure rests (`layout.ts`'s `seatFacingY`, PLAN question 13).
   */
  dRotY: number;
  /** Multiplies the resting scale. */
  scale: number;
  /** Squashes in the card's own x only — the "shatter" and "flip" shapes. */
  squashX: number;
  /** Squashes in the card's own y only — the "crush into the table" shape. */
  squashY: number;
  /** Multiplies material opacity. */
  opacity: number;
  /** A colour multiplied into the card, or `null` for none. */
  tint: string | null;
  /** 0…1 additive halo behind the card. */
  glow: number;
  /** The halo's colour. */
  glowColour: string | null;
  /** 0…1 noise-mask dissolve (the one shader Tier 1 writes, §12.1). */
  dissolve: number;
}

export const IDENTITY: Offset = Object.freeze({
  dx: 0,
  dy: 0,
  dz: 0,
  dRotX: 0,
  dRotZ: 0,
  dRotY: 0,
  scale: 1,
  squashX: 1,
  squashY: 1,
  opacity: 1,
  tint: null,
  glow: 0,
  glowColour: null,
  dissolve: 0,
});

/** A partial offset merged onto identity. */
export function offsetFrom(partial: Partial<Offset>): Offset {
  return { ...IDENTITY, ...partial };
}

/** Wipe an offset back to identity, in place. See {@link composeInto}. */
export function resetOffset(target: Offset): void {
  target.dx = IDENTITY.dx;
  target.dy = IDENTITY.dy;
  target.dz = IDENTITY.dz;
  target.dRotX = IDENTITY.dRotX;
  target.dRotZ = IDENTITY.dRotZ;
  target.dRotY = IDENTITY.dRotY;
  target.scale = IDENTITY.scale;
  target.squashX = IDENTITY.squashX;
  target.squashY = IDENTITY.squashY;
  target.opacity = IDENTITY.opacity;
  target.tint = IDENTITY.tint;
  target.glow = IDENTITY.glow;
  target.glowColour = IDENTITY.glowColour;
  target.dissolve = IDENTITY.dissolve;
}

/**
 * {@link composeOffsets}, in place and from a **partial** — the allocation-free
 * spelling the frame loop uses (§9.2 rule 6).
 *
 * `composeInto(a, partial)` is exactly `composeOffsets(a, offsetFrom(partial))`,
 * and it is exact rather than approximately so because every operator in
 * `composeOffsets` has identity's own value as its neutral element: `+ 0`,
 * `* 1`, `Math.max(x, 0)`, `?? null`. An absent key therefore contributes
 * nothing, which is what lets the missing fields simply be skipped.
 *
 * `web/test/cues-exhaustive.test.ts` checks the two against each other rather
 * than trusting that paragraph.
 */
export function composeInto(a: Offset, b: Partial<Offset>): void {
  if (b.dx !== undefined) a.dx += b.dx;
  if (b.dy !== undefined) a.dy += b.dy;
  if (b.dz !== undefined) a.dz += b.dz;
  if (b.dRotX !== undefined) a.dRotX += b.dRotX;
  if (b.dRotZ !== undefined) a.dRotZ += b.dRotZ;
  if (b.dRotY !== undefined) a.dRotY += b.dRotY;
  if (b.scale !== undefined) a.scale *= b.scale;
  if (b.squashX !== undefined) a.squashX *= b.squashX;
  if (b.squashY !== undefined) a.squashY *= b.squashY;
  if (b.opacity !== undefined) a.opacity *= b.opacity;
  if (b.tint !== undefined && b.tint !== null) a.tint = b.tint;
  if (b.glow !== undefined) a.glow = Math.max(a.glow, b.glow);
  if (b.glowColour !== undefined && b.glowColour !== null) a.glowColour = b.glowColour;
  if (b.dissolve !== undefined) a.dissolve = Math.max(a.dissolve, b.dissolve);
}

/**
 * Compose two offsets, so two cues touching the same card do not fight.
 *
 * Translations and rotations add, scales and opacities multiply, glow takes the
 * larger, and the last non-null colour wins. Two cues on one card is not the
 * common case, but it is reachable in one batch (a creature that takes damage
 * *and* dies), and the alternative — last writer wins — makes an animation
 * depend on the order the queue happened to iterate.
 */
export function composeOffsets(a: Offset, b: Offset): Offset {
  return {
    dx: a.dx + b.dx,
    dy: a.dy + b.dy,
    dz: a.dz + b.dz,
    dRotX: a.dRotX + b.dRotX,
    dRotZ: a.dRotZ + b.dRotZ,
    dRotY: a.dRotY + b.dRotY,
    scale: a.scale * b.scale,
    squashX: a.squashX * b.squashX,
    squashY: a.squashY * b.squashY,
    opacity: a.opacity * b.opacity,
    tint: b.tint ?? a.tint,
    glow: Math.max(a.glow, b.glow),
    glowColour: b.glowColour ?? a.glowColour,
    dissolve: Math.max(a.dissolve, b.dissolve),
  };
}

// ---------------------------------------------------------------------------
// Anchors — how a cue names a place without knowing where it is
// ---------------------------------------------------------------------------

/**
 * A place on the table, named rather than measured (§8 rule 3).
 *
 * `layout.ts` resolves these; a cue only ever composes them. `zone` uses the
 * protocol's own lowercased `ZoneType` vocabulary (§3.6) so a `zone` event's
 * `from.zone` can be handed straight through.
 */
export type AnchorRef =
  | { kind: 'card'; id: number }
  | { kind: 'player'; id: number }
  | { kind: 'zone'; player: number | null; zone: string }
  | { kind: 'stack' }
  | { kind: 'combat'; player: number }
  /**
   * **Report 13 §6.2's casting anchor** (T4): where a seat's floating mana hovers
   * and where the spell it is casting stands. `player: null` means *the card's
   * own side of the table*, which `ownSideOf` resolves exactly as it does for a
   * `zone` — so a mana mote from an opponent's land drifts to the **opponent's**
   * anchor with no cue naming a seat.
   *
   * `ground: true` is the **table surface directly under it** (T6) — where a
   * fizzled spell's form falls to, "through the table" (report 13 §6.3). It is a
   * flag rather than a number so the cue still names a place and `layout.ts` is
   * still the only module that knows how high the anchor hangs.
   */
  | { kind: 'casting'; player: number | null; ground?: boolean }
  | { kind: 'table' }
  | { kind: 'above'; id: number; height: number }
  /**
   * A card's own slot, shifted along the table's x. E5's one addition, for the
   * cues that happen *next to* a card rather than on it — Nick Fury's agents
   * materialising at his shoulder. `dx` is in card widths, not world units, so
   * it stays a relative statement (§8 rule 3) and `layout.ts` is still the only
   * module that knows what a card width is.
   */
  | { kind: 'beside'; id: number; dx: number }
  /**
   * **A point on the card's FIGURE** (Tier 2 slice 3, T11) — the one anchor a
   * per-card cue needed and the kit did not have.
   *
   * Every other anchor names a place on the table, and a `card` anchor is the
   * card's REST position: an effect put there stays behind while the cue's own
   * offset carries the card and its figure into the combat lane, and it hangs over
   * the card's art rather than on the body standing 0.52 in front of it. So Peggy's
   * shield, Agent 13's muzzle flash, Coulson's badge and the Doombot's exhaust were
   * all drawn somewhere the body was not.
   *
   * `at` is a fraction of the figure's drawn height (0 its feet, 0.5 its chest, 1
   * the top of its head); `fwd` and `side` are in figure heights along the way it
   * faces and to its right. **It is resolved by the effect binding, not by
   * `layout.ts`**, against the frame's figure poses and the card's live offset —
   * so it follows a lunge, a hover and a shrink — and it is a statement about a
   * body, not a coordinate: `layout.ts` still owns the stand point it starts from.
   * A card with no figure (an instant, a card on its way to the graveyard) falls
   * back to its card's rest position **plus its live offset**, which is how a
   * wrap follows a card to exile. `anchorPosition` answers `null` for it, so the
   * camera and `deltaTo` never see one.
   */
  | { kind: 'figure'; id: number; at: number; fwd?: number; side?: number };

/**
 * **The shapes a billboard or a ring can be drawn in** (T11). A shape is a
 * texture, not a mesh: every one is drawn by the same pooled quad the soft glow
 * is, so a shape costs no draw call a glow would not, and a cue that asks for one
 * the pool has not drawn yet simply gets the soft glow.
 *
 * | shape | what reads | used by |
 * |---|---|---|
 * | `soft` | the radial glow (the default) | everything Tier 1 wrote |
 * | `badge` | a shield-shaped emblem | Coulson's +1/+1 flash on a Hero |
 * | `shield` | a hexagonal force-field bubble | Peggy's aegis |
 * | `reticle` | a crosshair ring | Helicarrier Strike's lock |
 * | `web` | radial strands and rings | Web Up's wrap |
 * | `circuit` | traces and pads | Robotics Mastery, Depower |
 * | `star` | a four-point glint | muzzle flash, vials, the Spy Kit |
 * | `hex` | a plated honeycomb | Super Suit's armour snapping on |
 */
export const EFFECT_SHAPES = ['soft', 'badge', 'shield', 'reticle', 'web', 'circuit', 'star', 'hex'] as const;
export type EffectShape = (typeof EFFECT_SHAPES)[number];

const EFFECT_SHAPE_SET: ReadonlySet<string> = new Set<string>(EFFECT_SHAPES);

export function isEffectShape(value: string): value is EffectShape {
  return EFFECT_SHAPE_SET.has(value);
}

// ---------------------------------------------------------------------------
// Effects — the Tier-1 primitive kit (§12.1)
// ---------------------------------------------------------------------------

/**
 * The six primitives Tier 1 has, and it has no others:
 *
 * | kind | what it is | cost |
 * |---|---|---|
 * | `glow` | an additive billboard with a radial-gradient alpha | 1 draw call |
 * | `ring` | an expanding ring flat on the table | 1 draw call |
 * | `beam` | a stretched additive quad between two anchors | 1 draw call |
 * | `particles` | one `THREE.Points` system with a soft sprite | 1 draw call |
 * | `text` | a number or a short banner, drawn to a cached canvas | 1 draw call |
 * | `plate` | a flat tinted quad — the HUD flash under a life total | 1 draw call |
 *
 * §9.3's first risk is transparency overdraw, not geometry: all six are blended
 * with `depthWrite: false`. Hence {@link MAX_LIVE_EFFECTS}.
 *
 * ---------------------------------------------------------------------------
 * **Tier 2 adds a seventh, and it is the only one** (report 13 §5.4, user
 * decision 9): `mote`, a small additive dot that **travels between two
 * anchors**. It is not a `beam` with a short radius — a beam is a line and a
 * mote is a thing that arrives — and it is not `particles`, whose burst is
 * centred on one anchor. The whole of the difference is {@link Effect.travel}.
 *
 * Its budget is separate ({@link MAX_LIVE_MOTES}) and §4.4 is the precedent: the
 * eight-slot cap exists to bound *overdraw*, and a 0.07-unit dot is not the
 * thing it was sized against. A five-land mana ability emits five ripples and
 * five motes in one step, which is 10 of 8 — so without a second bucket the
 * feature would have been capped out by its own step on the day it shipped.
 * ---------------------------------------------------------------------------
 */
export type EffectKind = 'glow' | 'ring' | 'beam' | 'particles' | 'text' | 'plate' | 'mote';

export interface Effect {
  kind: EffectKind;
  at: AnchorRef;
  /** `beam` and `mote`: the far end. `particles`: where a travelling cloud goes (T11). */
  to?: AnchorRef;
  colour: string;
  /** 0…1 — opacity for most kinds, emission for `glow`. */
  strength: number;
  /** World units. A radius for `glow`/`ring`, a half-width for `beam`. */
  radius: number;
  /**
   * `text` only. **Numbers and fixed words only** — never a card name. The
   * fixture sweep asserts it (§10.3): the arena is the first surface that draws
   * per-card *text* into a texture, and this is the field where a leak would
   * appear.
   */
  text?: string;
  /** `text` only: how far it has risen, in world units. */
  rise?: number;
  /** Extra in-plane rotation, radians. */
  spin?: number;
  /** World-unit drift along x — how a banner sweeps. */
  driftX?: number;
  /** `particles` only: 0…1 through the burst. */
  burst?: number;
  /**
   * `mote` only: 0…1 from {@link Effect.at} to {@link Effect.to} (report 13
   * §5.4).
   *
   * The two anchors are what keep rule 2: a mote cue says "from this land to
   * this player's casting anchor" and never learns where either is, so the mote
   * is correct on a wrapped rank, on the far side of the table and at whatever
   * table size `layout.ts` is using.
   */
  travel?: number;
  /**
   * `mote` only: how high it arcs above the straight line at mid-flight, in world
   * units. Absent is the mana mote's 0.55 — a thing that rises and lands. T6's
   * fizzle passes 0: a form that *falls* does not hop first.
   *
   * **`particles` too, since slice 3**: a burst given a {@link Effect.to} is a
   * cloud that TRAVELS — its centre goes from `at` to `to` over `travel`, arcing by
   * `arc` (absent is 0.35) — which is how Ant-Man's Air Force sweeps the table
   * rather than bursting in one place. One `Points` system, one draw call, the
   * same as a burst.
   */
  arc?: number;
  /**
   * `glow` and `ring` only: the texture the quad is drawn with ({@link EffectShape}).
   * Absent is `soft` for a glow and the plain annulus for a ring.
   */
  shape?: EffectShape;
  /**
   * `glow` only: width ÷ height of the billboard. Absent is 1. A shield around a
   * standing figure is taller than it is wide; a badge is not.
   */
  aspect?: number;
  /**
   * `glow` and `ring` at a `figure` anchor only: `radius` is in that figure's drawn
   * HEIGHTS rather than world units, so a shield or a wrap fits a figure Quantum
   * Reduction has shrunk as well as a full-size one — and shrinks with Ant-Man as
   * he does. Ignored at any other anchor.
   */
  fit?: boolean;
}

/**
 * §9.3 rule 1 — no more than eight blended effect objects alive at once. Ten
 * stacked additive layers is how an integrated GPU becomes a space heater; the
 * cap is enforced here rather than in a cue, so a cue cannot opt out of it.
 *
 * `particles` is dropped first: §9.2 rule 9's "degrade, don't stutter" means an
 * over-budget cue renders **without its particle layer**, not not at all.
 */
export const MAX_LIVE_EFFECTS = 8;

/**
 * Report 13 §5.4 / §4.4 — **the mote's own bucket.** See {@link EffectKind}: the
 * eight-slot cap bounds full-size blended quads, and a mana mote is a 0.07-unit
 * dot. Twelve is a five-land mana ability (5) plus the pool it lands in (up to
 * 6 floating mana) with one to spare.
 */
export const MAX_LIVE_MOTES = 12;

/** Which budget an effect kind is counted against. */
export function effectBucketOf(kind: EffectKind): 'mote' | 'effect' {
  return kind === 'mote' ? 'mote' : 'effect';
}

export function effectCapOf(kind: EffectKind): number {
  return kind === 'mote' ? MAX_LIVE_MOTES : MAX_LIVE_EFFECTS;
}

/**
 * How many live effects share `kind`'s bucket. Both `Stage` implementations
 * count this way rather than keeping a counter, because a counter has to be
 * maintained in four places (`setEffect`, `clearEffect`, `clearAll`, and the
 * replace-in-place path) and one missed decrement is a cap that silently tightens
 * over a session. The map is bounded at 20 by the two caps above, so the scan is
 * cheaper than the bookkeeping it replaces.
 */
export function bucketSize(effects: ReadonlyMap<string, Effect>, bucket: 'mote' | 'effect'): number {
  let n = 0;
  for (const effect of effects.values()) {
    if (effectBucketOf(effect.kind) === bucket) n += 1;
  }
  return n;
}

// ---------------------------------------------------------------------------
// The camera lane (§8) — recorded here, wired in E5
// ---------------------------------------------------------------------------

export interface CameraRequest {
  /** The anchors the pose must frame. */
  frame: AnchorRef[];
  padding: number;
  tilt: number;
  /** ≤ `SHAKE.maxAmplitude` (camera.ts), enforced by the stage, not by the cue. */
  shake: number;
  /** §8 rule 2: strictly higher preempts; equal or lower is DROPPED, not queued. */
  priority: number;
  ms: number;
  /**
   * **A cut, not an ease** (E5). A cut is on the new pose in its first frame and
   * still eases *home*, so rule 1 holds either way. Only `outcome.finish` asks
   * for one — the game is over and the pull-back is the shot, not the move.
   */
  cut?: boolean;
}

// ---------------------------------------------------------------------------
// The interface
// ---------------------------------------------------------------------------

export interface Stage {
  /**
   * The world-space displacement from a card's **resting pose** to an anchor,
   * or `[0,0,0]` when either end is unknown.
   *
   * This is the whole of a cue's access to geometry, and it is a *query*: a
   * "slide in from the library" cue is `offset = deltaTo(id, library) × (1 − t)`,
   * which decays to identity by construction and is correct however the table
   * is laid out. A `NullStage` answers `[0,0,0]`, which is why the pure tests
   * see every cue run its full arithmetic with no scene behind it.
   */
  deltaTo(cardId: number, anchor: AnchorRef): Vec3;
  /**
   * **The turn about y that faces this card's FIGURE toward an anchor** —
   * radians in (−π, π], measured from the way its seat's figures stand, or `0`
   * when either end is unknown (Tier 2 slice 3's second verification pass).
   *
   * The second geometry query a cue has, and a query for the same reason
   * {@link deltaTo} is: a cue knows no coordinates and no facing, so "turn toward
   * the player you attack" is asked of `layout.ts` and scaled by the cue's own
   * envelope into {@link Offset.dRotY}, which decays to 0 by construction. A
   * `NullStage` answers 0.
   */
  yawTo(cardId: number, anchor: AnchorRef): number;
  /** Replace this cue's contribution for one card. */
  setOffset(cardId: number, offset: Partial<Offset>): void;
  clearOffset(cardId: number): void;
  setEffect(key: string, effect: Effect): void;
  clearEffect(key: string): void;
  /**
   * **The fifth transient** (report 13 §3.3): the pose a figure holds while this
   * cue runs.
   *
   * It decays exactly like an {@link Offset} — identity is *no request at all*,
   * {@link ClipRequest.weight} reaches 0 at `t = 1` (`clipEnvelope`), and
   * `clearClip` releases it — but it **arbitrates** rather than composing,
   * because a figure cannot be 30% dying and 70% attacking. The winner is a pure
   * function of the requests (`figures/clips.ts`'s `chooseClip`), never of the
   * order the queue iterated.
   */
  setClip(cardId: number, request: ClipRequest): void;
  clearClip(cardId: number): void;
  /**
   * **The request a lane holds right now, or `null`** (Tier 2 slice 4, T13) —
   * optional, and read by exactly one caller: a cue releasing a DUELIST's lane
   * (`registry.ts`'s `endGesture`) asks whose request is there before it clears,
   * because two cues gesture on one duelist in one batch as a matter of course
   * and the one that ends must not blank the one still playing. `SceneStage`
   * already had it (its frame loop reads it); `NullStage` answers from its map.
   */
  clipOf?(cardId: number): ClipRequest | null;
  /** §8 rule 2. `null` releases the lane. */
  requestCamera(request: CameraRequest | null): void;
  /** Drop everything: the scene is then exactly `layout(state)` (§5.1). */
  clearAll(): void;
}

// ---------------------------------------------------------------------------
// NullStage — the test double, and the definition of "nothing happened"
// ---------------------------------------------------------------------------

export interface RecordedOp {
  op:
    | 'setOffset'
    | 'clearOffset'
    | 'setEffect'
    | 'clearEffect'
    | 'setClip'
    | 'clearClip'
    | 'camera'
    | 'clearAll'
    | 'deltaTo';
  cardId?: number;
  key?: string;
  offset?: Offset;
  effect?: Effect;
  clip?: ClipRequest;
}

/**
 * A `Stage` that touches nothing and remembers everything.
 *
 * Two live maps — {@link NullStage.offsets} and {@link NullStage.effects} — are
 * what §10.3's decay assertion reads: after a batch drains, both must be empty,
 * because that is the same statement as "the scene is exactly `layout(state)`".
 * {@link NullStage.ops} is the append-only history, which is what the redaction
 * assertion scans for strings.
 */
export class NullStage implements Stage {
  readonly offsets = new Map<number, Offset>();
  readonly effects = new Map<string, Effect>();
  /**
   * The clip lane's live map, and the third thing §10.2's decay assertion reads.
   * Same rule as {@link NullStage.offsets}: empty after a batch drains.
   */
  readonly clips = new Map<number, ClipRequest>();
  readonly ops: RecordedOp[] = [];
  camera: CameraRequest | null = null;
  /** Effects refused by the {@link MAX_LIVE_EFFECTS} cap, for the budget test. */
  refusedEffects = 0;
  /** Motes refused by {@link MAX_LIVE_MOTES}, counted separately for the same reason. */
  refusedMotes = 0;

  deltaTo(): Vec3 {
    return ZERO3;
  }

  yawTo(): number {
    return 0;
  }

  setOffset(cardId: number, offset: Partial<Offset>): void {
    const full = offsetFrom(offset);
    this.offsets.set(cardId, full);
    this.ops.push({ op: 'setOffset', cardId, offset: full });
  }

  clearOffset(cardId: number): void {
    this.offsets.delete(cardId);
    this.ops.push({ op: 'clearOffset', cardId });
  }

  setEffect(key: string, effect: Effect): void {
    const bucket = effectBucketOf(effect.kind);
    if (!this.effects.has(key) && bucketSize(this.effects, bucket) >= effectCapOf(effect.kind)) {
      if (bucket === 'mote') this.refusedMotes += 1;
      else this.refusedEffects += 1;
      return;
    }
    this.effects.set(key, effect);
    this.ops.push({ op: 'setEffect', key, effect });
  }

  clearEffect(key: string): void {
    this.effects.delete(key);
    this.ops.push({ op: 'clearEffect', key });
  }

  setClip(cardId: number, request: ClipRequest): void {
    const incumbent = this.clips.get(cardId);
    // The same arbitration the real stage does, and deliberately the same code:
    // `web/test/clips.test.ts` checks the winner is order-independent, and a test
    // double with a different rule would make that check worthless.
    if (incumbent !== undefined && !clipBeats(request, incumbent)) return;
    // **A copy, because the caller may hand us a scratch object.** `registry.ts`
    // fills one module-scope `ClipRequest` per `setClip` call rather than
    // allocating per target per frame (§9.2 rule 6), and `SceneStage` copies it
    // into its own pooled object; a test double that stored the caller's
    // reference would alias every entry in the map to the last write.
    const stored: ClipRequest = { ...request };
    this.clips.set(cardId, stored);
    this.ops.push({ op: 'setClip', cardId, clip: stored });
  }

  clearClip(cardId: number): void {
    this.clips.delete(cardId);
    this.ops.push({ op: 'clearClip', cardId });
  }

  clipOf(cardId: number): ClipRequest | null {
    return this.clips.get(cardId) ?? null;
  }

  requestCamera(request: CameraRequest | null): void {
    this.camera = request;
    this.ops.push({ op: 'camera' });
  }

  clearAll(): void {
    this.offsets.clear();
    this.effects.clear();
    this.clips.clear();
    this.camera = null;
    this.ops.push({ op: 'clearAll' });
  }

  /**
   * Every string this stage was ever handed — the redaction assertion's input.
   *
   * **Tier 2 widened it to clip names and aliases** (report 13 §1.4): a model id
   * like `"helicarrier"` or an alias like `"pistolDraw"` in an op log is a name
   * by another spelling, and `figures.json` is a file whose keys *are* card
   * names. The alias is the field an author could most easily paste one into.
   */
  strings(): string[] {
    const out: string[] = [];
    for (const op of this.ops) {
      if (op.effect?.text !== undefined) out.push(op.effect.text);
      if (op.effect?.colour !== undefined) out.push(op.effect.colour);
      if (op.effect?.shape !== undefined) out.push(op.effect.shape);
      if (op.offset?.tint != null) out.push(op.offset.tint);
      if (op.offset?.glowColour != null) out.push(op.offset.glowColour);
      if (op.clip !== undefined) {
        out.push(op.clip.clip);
        if (op.clip.alias !== null) out.push(op.clip.alias);
      }
    }
    return out;
  }
}

// ---------------------------------------------------------------------------
// What a cue implementation is
// ---------------------------------------------------------------------------

/** Everything one running cue knows about itself. */
export interface CueContext {
  /**
   * **The registry id of the cue that is running** — `zone.enters`,
   * `attack.shrink` (report 13 §3.5).
   *
   * Tier 2's addition, and the reason the clip lane needs no new data at all:
   * the ladder has already run by the time a cue exists, so the cue id is the
   * most specific thing anyone said about this card and this event, and
   * `figures/clips.ts`'s `CLIP_FOR` is keyed on it. Ant-Man's
   * `attackers:alone → attack.shrink` and Peggy's `attackers:alone →
   * attack.aegis` are different entries for the same kind and get `shrink` and
   * `attack` with nothing added to `cues.json`.
   */
  id: string;
  /** Card ids this cue moves. */
  targets: number[];
  /** Player ids this cue is about. */
  players: number[];
  params: CueParams;
  /** The compressed duration actually being played, in ms. */
  ms: number;
  /** Unique per running cue — the prefix every effect key uses. */
  key: string;
  /** `prefers-reduced-motion: reduce` — no shake, no camera, no particles. */
  reducedMotion: boolean;
}

/**
 * A cue implementation: **plain arithmetic over `t ∈ [0,1]`**, plus the promise
 * that `end()` returns the stage to identity.
 *
 * `apply` is called with `t = 1` exactly once before `end()` for a cue that is
 * skipped or snapped, so a cue never has to distinguish "finished" from
 * "skipped" — which is §5.1's whole point.
 */
export interface CueImpl {
  lane: import('./types.ts').Lane;
  /** Progress is linear; easing is the implementation's own business. */
  apply(ctx: CueContext, t: number, stage: Stage): void;
  /** Release every offset and effect this cue set. Must be total. */
  end(ctx: CueContext, stage: Stage): void;
}

/** The registry's shape. `registry.ts` builds the one the arena uses. */
export type CueRegistry = ReadonlyMap<string, CueImpl>;

// ---------------------------------------------------------------------------
// Easing — shared by every cue, so the vocabulary of motion is one file
// ---------------------------------------------------------------------------

export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInCubic = (t: number): number => Math.pow(clamp01(t), 3);
export const easeInOutCubic = (t: number): number =>
  clamp01(t) < 0.5 ? 4 * Math.pow(clamp01(t), 3) : 1 - Math.pow(-2 * clamp01(t) + 2, 3) / 2;

/** Overshoots and settles — the shape a tap and a landing card want. */
export function easeOutBack(t: number, overshoot = 1.7): number {
  const x = clamp01(t) - 1;
  return 1 + (overshoot + 1) * x * x * x + overshoot * x * x;
}

/** 0 → 1 → 0. The shape of a flash, a pulse and a lunge-and-return. */
export const pulse = (t: number): number => Math.sin(clamp01(t) * Math.PI);

/** 0 → 1 → 0, but with a flat top: out fast, hold, back. */
export function outHoldBack(t: number, out = 0.25, back = 0.75): number {
  const x = clamp01(t);
  if (x < out) return easeOutCubic(x / out);
  if (x < back) return 1;
  return 1 - easeInOutCubic((x - back) / (1 - back));
}

/** Scale a displacement by a factor. */
export function scaled(v: Vec3, k: number): Vec3 {
  return [v[0] * k, v[1] * k, v[2] * k];
}
