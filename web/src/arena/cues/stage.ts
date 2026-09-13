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
 * ---------------------------------------------------------------------------
 */

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
  | { kind: 'table' }
  | { kind: 'above'; id: number; height: number }
  /**
   * A card's own slot, shifted along the table's x. E5's one addition, for the
   * cues that happen *next to* a card rather than on it — Nick Fury's agents
   * materialising at his shoulder. `dx` is in card widths, not world units, so
   * it stays a relative statement (§8 rule 3) and `layout.ts` is still the only
   * module that knows what a card width is.
   */
  | { kind: 'beside'; id: number; dx: number };

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
 */
export type EffectKind = 'glow' | 'ring' | 'beam' | 'particles' | 'text' | 'plate';

export interface Effect {
  kind: EffectKind;
  at: AnchorRef;
  /** `beam` only: the far end. */
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
  /** Replace this cue's contribution for one card. */
  setOffset(cardId: number, offset: Partial<Offset>): void;
  clearOffset(cardId: number): void;
  setEffect(key: string, effect: Effect): void;
  clearEffect(key: string): void;
  /** §8 rule 2. `null` releases the lane. */
  requestCamera(request: CameraRequest | null): void;
  /** Drop everything: the scene is then exactly `layout(state)` (§5.1). */
  clearAll(): void;
}

// ---------------------------------------------------------------------------
// NullStage — the test double, and the definition of "nothing happened"
// ---------------------------------------------------------------------------

export interface RecordedOp {
  op: 'setOffset' | 'clearOffset' | 'setEffect' | 'clearEffect' | 'camera' | 'clearAll' | 'deltaTo';
  cardId?: number;
  key?: string;
  offset?: Offset;
  effect?: Effect;
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
  readonly ops: RecordedOp[] = [];
  camera: CameraRequest | null = null;
  /** Effects refused by the {@link MAX_LIVE_EFFECTS} cap, for the budget test. */
  refusedEffects = 0;

  deltaTo(): Vec3 {
    return ZERO3;
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
    if (!this.effects.has(key) && this.effects.size >= MAX_LIVE_EFFECTS) {
      this.refusedEffects += 1;
      return;
    }
    this.effects.set(key, effect);
    this.ops.push({ op: 'setEffect', key, effect });
  }

  clearEffect(key: string): void {
    this.effects.delete(key);
    this.ops.push({ op: 'clearEffect', key });
  }

  requestCamera(request: CameraRequest | null): void {
    this.camera = request;
    this.ops.push({ op: 'camera' });
  }

  clearAll(): void {
    this.offsets.clear();
    this.effects.clear();
    this.camera = null;
    this.ops.push({ op: 'clearAll' });
  }

  /** Every string this stage was ever handed — the redaction assertion's input. */
  strings(): string[] {
    const out: string[] = [];
    for (const op of this.ops) {
      if (op.effect?.text !== undefined) out.push(op.effect.text);
      if (op.effect?.colour !== undefined) out.push(op.effect.colour);
      if (op.offset?.tint != null) out.push(op.offset.tint);
      if (op.offset?.glowColour != null) out.push(op.offset.glowColour);
    }
    return out;
  }
}

// ---------------------------------------------------------------------------
// What a cue implementation is
// ---------------------------------------------------------------------------

/** Everything one running cue knows about itself. */
export interface CueContext {
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
