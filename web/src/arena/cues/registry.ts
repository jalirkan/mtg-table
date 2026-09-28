/*
 * mtg-table — arena/cues/registry.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Cue id → implementation** (report 09 §2.4, §6, §12.1): the whole default
 * cue table, written as arithmetic over `t ∈ [0, 1]`.
 *
 * Nothing here imports three. A cue computes plain numbers — offsets, anchors,
 * colours, strengths — and hands them to a {@link Stage}; only `Arena.tsx` and
 * `scene/*` turn those into `Object3D` mutations. That is the whole reason
 * `web/test/replay-cues.test.ts` can run every event of every committed
 * recording through the real cues, in bare Node, with no browser.
 *
 * ---------------------------------------------------------------------------
 * The contract every entry keeps (§5.1), and the reason skip / scrub / resync
 * need no code of their own:
 *
 *   - `apply(ctx, t, stage)` writes **offsets and effects only**. It never
 *     computes a pose; `layout(state)` is the pose and this is a delta from it.
 *   - `apply(ctx, 1, stage)` is the cue's final frame, and every cue is written
 *     so that its final frame is **identity** — the values a `clearOffset`
 *     would restore. A skipped cue is therefore indistinguishable from a
 *     finished one, which is what makes "skip" one line in the queue.
 *   - `end(ctx, stage)` releases every offset and every effect the cue set. It
 *     is total: it clears by key, not by remembering what it did.
 *
 * Offsets live in world units where **1 unit = 1 card height** (§3.1), and
 * every displacement comes from `stage.deltaTo(...)` rather than from a number
 * in this file: `layout.ts` is the only module that knows a coordinate.
 * ---------------------------------------------------------------------------
 */

import { clipEnvelope, clipForCue, type ClipRequest } from '../figures/clips.ts';
import { GESTURE_CLIP, duelistLane, type Gesture } from '../figures/duelists.ts';
import { isClipName, type ClipName } from '../figures/types.ts';
import { PISTOL_MUZZLE } from '../figures/props.ts';
import { TAP_ANGLE, figureAnchorOf } from '../layout.ts';
import {
  clamp01,
  easeInCubic,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  outHoldBack,
  pulse,
  isEffectShape,
  type AnchorRef,
  type CueContext,
  type CueImpl,
  type CueRegistry,
  type Stage,
  type Vec3,
} from './stage.ts';
import { counterToken, type Lane } from './types.ts';

// ---------------------------------------------------------------------------
// Reading params. A cue file is JSON written by a human; every read has a default.
// ---------------------------------------------------------------------------

function num(ctx: CueContext, key: string, fallback: number): number {
  const value = ctx.params[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function str(ctx: CueContext, key: string, fallback: string): string {
  const value = ctx.params[key];
  return typeof value === 'string' ? value : fallback;
}

function flag(ctx: CueContext, key: string, fallback = false): boolean {
  const value = ctx.params[key];
  return typeof value === 'boolean' ? value : fallback;
}

/** The cue's colour: the card's own colour identity unless the data overrode it. */
function colour(ctx: CueContext, fallback = '#c6ccd6'): string {
  return str(ctx, 'colour', fallback);
}

/** The zone anchor a `zone` event came from, or `null` when it came from nowhere. */
function fromAnchor(ctx: CueContext, fallbackZone = ''): AnchorRef | null {
  const zone = str(ctx, 'fromZone', '') || fallbackZone;
  if (zone === '') return null;
  const player = num(ctx, 'fromPlayer', -1);
  return { kind: 'zone', player: player < 0 ? null : player, zone };
}

/** `delta × k`, or zero when the anchor is unknown. */
function decay(stage: Stage, id: number, anchor: AnchorRef | null, k: number): Vec3 {
  if (anchor === null) return [0, 0, 0];
  const d = stage.deltaTo(id, anchor);
  return [d[0] * k, d[1] * k, d[2] * k];
}

function lengthOf(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

/**
 * Stagger *inside* one cue, for a cue that moves several cards at once
 * (`mulligan.sweep`, `stats.flash`, `outcome.finish`). Between cues the queue
 * staggers; within one, this does.
 */
function staggered(t: number, index: number, count: number, spread = 0.35): number {
  if (count <= 1) return clamp01(t);
  const step = spread / (count - 1 || 1);
  return clamp01((t - index * step) / (1 - spread));
}

const RED = '#ff6b5a';
const GREEN = '#7fd39a';
const WHITE = '#ffffff';
const GREY = '#8b939e';
const GOLD = '#e3c46a';
const POISON = '#7fb07f';

// ---------------------------------------------------------------------------
// The builder
// ---------------------------------------------------------------------------

interface CueDef {
  lane?: Lane;
  /** Effect key suffixes this cue may set; `end()` clears every one of them. */
  effects?: readonly string[];
  /**
   * **Param names that hold a card id this cue also offsets** (E5).
   *
   * A handful of the per-card cues move a card that is not their target: Pym
   * Particles shrinks *the creature it beams at*, Web Up lifts *the card it
   * wraps*. `end()` has to be total over those too, or the fixture sweep's
   * decay assertion catches a stranded offset — which is exactly what it is
   * for. Naming the params here rather than remembering what was written keeps
   * `end()` total by construction, the same way `effects` does.
   */
  alsoClears?: readonly string[];
  apply(ctx: CueContext, t: number, stage: Stage): void;
}

/**
 * §9.2 rule 6 — one {@link ClipRequest} for the whole page.
 *
 * `setClip` is called once per running cue per target per frame and both `Stage`
 * implementations **copy** what they are handed (`SceneStage` into its pooled
 * object, `NullStage` into a fresh one), so filling one scratch object is exact
 * and allocates nothing in the hot path.
 */
const CLIP_SCRATCH: ClipRequest = { clip: 'idle', t: 0, weight: 0, alias: null, key: '' };

/**
 * **The clip lane, driven from the cue id and from nothing else** (report 13
 * §3.5).
 *
 * It is here, in the shared builder, rather than in each cue's own `apply` for
 * the same reason `end()` is total by construction: a cue cannot forget to play
 * its clip, and a cue that has no entry in `CLIP_FOR` cannot accidentally grow
 * one. **`params.clip` is the per-card override** — `CueParamValue` is already
 * `number | string | boolean` and `validate.ts` already type-checks it, so
 * `{"cue": "attack.lunge", "params": {"clip": "pistolDraw"}}` is legal in
 * `cues.json` today and needs no new cue id (§3.5, report 09 §12.2's "the pose
 * is the point, and the pose is a model").
 */
function playClip(ctx: CueContext, t: number, stage: Stage): void {
  // **Reduced motion collapses every clip to a snap** (T7; §8 rule 7). The cue
  // still runs — at 30% of its length, and it may carry a fact — but the figure
  // does not animate a body: it holds the stance `figurePose` derived from the
  // snapshot, which is exactly where the clip would have ended (`clipEnvelope`
  // is 0 at t = 1). No request is written, so there is nothing for `end()` to
  // release and nothing for the decay assertion to find.
  if (ctx.reducedMotion) return;
  const clip = clipForCue(ctx.id);
  if (clip === null) return;
  const alias = ctx.params['clip'];
  CLIP_SCRATCH.clip = clip;
  CLIP_SCRATCH.t = clamp01(t);
  CLIP_SCRATCH.weight = clipEnvelope(t);
  CLIP_SCRATCH.alias = typeof alias === 'string' && alias !== '' ? alias : null;
  CLIP_SCRATCH.key = ctx.key;
  for (const id of ctx.targets) stage.setClip(id, CLIP_SCRATCH);
}

/** The same scratch, for the one cue that poses a card it does not target. */
const CLIP_SCRATCH_2: ClipRequest = { clip: 'idle', t: 0, weight: 0, alias: null, key: '' };

/**
 * **A clip on a card this cue does not target** (T5, report 13 §4.3).
 *
 * Two cues need it and both are about a *host*: `attach.snap` (an Equipment flies
 * onto a creature — the creature is the body that reacts) and `fx.collapse`
 * (Quantum Reduction shrinks the creature it beams at). The card the cue
 * *targets* in both cases is the Aura or the Equipment, which has no figure at
 * all, so the clip has to be addressed to the second id.
 *
 * **The id must be named in the cue's `alsoClears`**, which is what makes `end()`
 * total over it — exactly the discipline `alsoClears` already exists for on the
 * offset lane, and what `replay-cues.test.ts`'s decay assertion checks.
 */
function clipOn(ctx: CueContext, t: number, stage: Stage, id: number, clip: ClipName): void {
  if (id < 0 || ctx.reducedMotion) return;
  CLIP_SCRATCH_2.clip = clip;
  CLIP_SCRATCH_2.t = clamp01(t);
  CLIP_SCRATCH_2.weight = clipEnvelope(t);
  CLIP_SCRATCH_2.alias = null;
  CLIP_SCRATCH_2.key = ctx.key;
  stage.setClip(id, CLIP_SCRATCH_2);
}

// ---------------------------------------------------------------------------
// T13 — the duelists' gestures, on the clip lane's reserved ids
// ---------------------------------------------------------------------------

/** One scratch request for every gesture, for the same reason as {@link CLIP_SCRATCH}. */
const GESTURE_SCRATCH: ClipRequest = { clip: 'idle', t: 0, weight: 0, alias: null, key: '' };

/**
 * **A seat's duelist, answering the event this cue is playing** (Tier 2 slice 4,
 * T13; `figures/duelists.ts`).
 *
 * It is here, in the shared builder, for the reason {@link playClip} is: every
 * cue on a `cast`, a player's damage, a life loss and the `outcome` gestures
 * whichever id the ladder chose for it — `cast.rise`, Wasp's `fx.scaleBeam`,
 * Helicarrier Strike's `fx.strike` — because the gesture is a PARAM the ladder
 * writes as a fact of the event (`resolve.ts`), not a property of the cue. No cue
 * id was added for it and none can forget it.
 *
 * The request is a clip request on {@link duelistLane} — `clip` the gesture's
 * arbitration rank, `alias` the gesture's own name, `t` the cue's own progress —
 * and it decays like every other: `weight` is `clipEnvelope(t)`, 0 at `t = 1`.
 * The two stance gestures arrive at a stance the POSE then holds (`board.gameOver`),
 * so their identity at `t = 1` is that stance; the duelist field reads `t` for the
 * entry (`duelists.ts`'s `stanceEntry`). Reduced motion writes nothing, exactly as
 * `playClip` does: the duelist snaps to the stance its pose says it holds.
 */
function playGesture(ctx: CueContext, t: number, stage: Stage): void {
  if (ctx.reducedMotion) return;
  const param = ctx.params['gesture'];
  if (param === 'outcome') {
    // A draw moves nobody: there is no winner to raise a fist.
    const winner = num(ctx, 'winner', -1);
    if (winner < 0) return;
    for (let i = 0; i < ctx.players.length; i++) {
      const player = ctx.players[i]!;
      gestureOn(ctx, t, stage, player, player === winner ? 'win' : 'lose');
    }
    return;
  }
  if (param !== 'cast' && param !== 'flinch') return;
  // `gesturePlayer` is set only where the planner carried a gesture to another
  // cue (`queue.ts` rule 5: an arrival that absorbed its own `cast`); otherwise the
  // duelist is the one the event is about — the caster, the struck player.
  const player = num(ctx, 'gesturePlayer', ctx.players[0] ?? -1);
  if (player < 0) return;
  gestureOn(ctx, t, stage, player, param);
}

function gestureOn(ctx: CueContext, t: number, stage: Stage, player: number, gesture: Gesture): void {
  GESTURE_SCRATCH.clip = GESTURE_CLIP[gesture];
  GESTURE_SCRATCH.t = clamp01(t);
  GESTURE_SCRATCH.weight = clipEnvelope(t);
  GESTURE_SCRATCH.alias = gesture;
  GESTURE_SCRATCH.key = ctx.key;
  stage.setClip(duelistLane(player), GESTURE_SCRATCH);
}

/**
 * `end()`'s half for the gestures: release every duelist lane this cue could have
 * written — each player it names and a carried `gesturePlayer` — **but only its
 * own request.** Two cues gesture on one duelist in one batch as a matter of
 * course (the killing blow's flinch and the outcome's slump), and a stage clears
 * a lane whole; the flinch ending in the same pass as the slump's frame would
 * blank the slump for that frame, which the stance entry reads as "not started"
 * and draws as a one-frame stand-up. A stage that can say whose request it holds
 * (`Stage.clipOf`) is asked; one that cannot is cleared outright, which is what
 * every card lane does.
 */
function endGesture(ctx: CueContext, stage: Stage): void {
  const param = ctx.params['gesture'];
  if (param !== 'cast' && param !== 'flinch' && param !== 'outcome') return;
  for (let i = 0; i < ctx.players.length; i++) releaseLane(ctx, stage, duelistLane(ctx.players[i]!));
  const carried = num(ctx, 'gesturePlayer', -1);
  if (carried >= 0) releaseLane(ctx, stage, duelistLane(carried));
}

function releaseLane(ctx: CueContext, stage: Stage, lane: number): void {
  const held = stage.clipOf === undefined ? null : stage.clipOf(lane);
  if (held === null || held.key === ctx.key) stage.clearClip(lane);
}

/**
 * Build a {@link CueImpl} whose `end` is total by construction: it clears every
 * target's offset, **every target's clip** and every declared effect key,
 * whether the cue set them or not. A cue cannot leak an offset or a pose by
 * forgetting one branch — which is exactly what `replay-cues.test.ts`'s decay
 * assertion, now reading `stage.clips` as well, is the proof of. **T13**: and
 * every duelist lane its gesture could have written (`endGesture`).
 */
function cue(def: CueDef): CueImpl {
  const effects = def.effects ?? [];
  const alsoClears = def.alsoClears ?? [];
  return {
    lane: def.lane ?? 'card',
    apply(ctx, t, stage) {
      def.apply(ctx, t, stage);
      playClip(ctx, t, stage);
      playGesture(ctx, t, stage);
    },
    end(ctx, stage) {
      endGesture(ctx, stage);
      for (const id of ctx.targets) {
        stage.clearOffset(id);
        stage.clearClip(id);
      }
      for (const key of alsoClears) {
        const id = num(ctx, key, -1);
        if (id >= 0) {
          stage.clearOffset(id);
          stage.clearClip(id);
        }
      }
      for (const suffix of effects) stage.clearEffect(`${ctx.key}:${suffix}`);
    },
  };
}

/**
 * The **beamed-at card**, as an id: `beamTo` when the frame's stack item named
 * a target (§3.6 rule 2 — an id, never a name), `toId` for the cues whose event
 * carries its own, `-1` for neither. Every per-card cue that reaches across to
 * a second card goes through this one reader, so `alsoClears` above can name
 * the same two params and be sure it is total.
 */
function beamTargetOf(ctx: CueContext): number {
  const beam = num(ctx, 'beamTo', -1);
  if (beam >= 0) return beam;
  const to = num(ctx, 'toId', -1);
  if (to >= 0) return to;
  // **T11: a `resolved` aims too** — `strikeCard` is what the PREVIOUS frame's
  // stack item targeted (T6's one frame of look-behind, D63), so Wasp's shrink,
  // Pym's beam, Web Up's wrap and Depower's flicker land on the thing the engine
  // said they were aimed at when they RESOLVE, not only when they are cast.
  return num(ctx, 'strikeCard', -1);
}

/**
 * Every param {@link beamTargetOf} can read an id from — the `alsoClears` of any
 * cue that offsets or poses the card it aims at, so `end()` stays total over all
 * three (the fixture sweep's decay assertion is the proof).
 */
const AIMED: readonly string[] = ['beamTo', 'toId', 'strikeCard'];

/**
 * **T11 — a point on a card's figure** (`stage.ts`'s `figure` anchor): `at` in
 * figure heights from its feet, `fwd`/`side` in figure heights along its facing
 * and to its right. It follows the figure through a lunge, a hover and a shrink,
 * because the effect binding resolves it against the live offset; a card with no
 * figure resolves to its card plus that offset.
 */
function figureAt(id: number, at: number, fwd = 0, side = 0): AnchorRef {
  return { kind: 'figure', id, at, fwd, side };
}

/** Agent 13's muzzle flash sits on her pistol's lit tip (`figures/props.ts`). */
const MUZZLE_ANCHOR = figureAnchorOf(PISTOL_MUZZLE);

/** A flash that is on for `width` of `t` around `centre`, 0 elsewhere — a muzzle, a flicker. */
function blip(t: number, centre: number, width: number): number {
  const d = Math.abs(t - centre);
  return d >= width ? 0 : 1 - d / width;
}

/**
 * §6's lunge, factored out: the translate to the combat lane, the tilt toward
 * the defender and the small lift, as an offset the per-card attack cues below
 * add their own signature to.
 *
 * They have to *contain* the lunge rather than sit beside it: the ladder
 * resolves **one** cue per event, so Ant-Man's `attackers:alone` entry replaces
 * `attack.lunge` outright — an attacker that shrank but never moved would be a
 * cue file quietly turning combat off.
 */
function lunge(
  ctx: CueContext,
  t: number,
  stage: Stage,
  id: number,
): { dx: number; dy: number; dz: number; dRotX: number; dRotY: number; k: number } {
  const player = ctx.players[0] ?? 0;
  const k = outHoldBack(t, 0.3, 0.7);
  const d = decay(stage, id, { kind: 'combat', player }, k * 0.9);
  return {
    dx: d[0],
    dy: d[1] + 0.06 * k,
    dz: d[2],
    dRotX: 0.21 * k * (d[2] <= 0 ? 1 : -1),
    dRotY: stage.yawTo(id, defenderOf(ctx)) * k,
    k,
  };
}

/**
 * **What an attacker turns to face** (Tier 2 slice 3's second verification
 * pass): the player or planeswalker its attack BAND names — the `attackers`
 * event's own `defenderKind` / `defenderId`, the same fields the Doombot's laser
 * aims at — else its own combat lane, which is always toward the other seat.
 *
 * The turn itself is `Stage.yawTo` (`layout.ts` knows where both ends are and
 * which way the figure rests) scaled by the lunge's envelope into the offset's
 * `dRotY`, so it is 0 at the start and the end of the cue, whichever way a
 * seat's figures stand (PLAN question 13): the muzzle, the eye and the laser
 * fire at the target instead of out of the far side of the body.
 */
function defenderOf(ctx: CueContext): AnchorRef {
  const id = num(ctx, 'defenderId', -1);
  const kind = str(ctx, 'defenderKind', 'none');
  if (id >= 0 && kind === 'player') return { kind: 'player', id };
  if (id >= 0 && kind === 'card') return { kind: 'card', id };
  return { kind: 'combat', player: ctx.players[0] ?? 0 };
}

/** The commonest shape: one offset per target, computed from `t` and the index. */
function perTarget(
  effects: readonly string[],
  fn: (
    ctx: CueContext,
    t: number,
    stage: Stage,
    id: number,
    index: number,
  ) => Parameters<Stage['setOffset']>[1] | null,
  lane: Lane = 'card',
): CueImpl {
  return cue({
    lane,
    effects,
    apply(ctx, t, stage) {
      for (let i = 0; i < ctx.targets.length; i++) {
        const id = ctx.targets[i]!;
        const offset = fn(ctx, t, stage, id, i);
        if (offset === null) stage.clearOffset(id);
        else stage.setOffset(id, offset);
      }
    },
  });
}

// ---------------------------------------------------------------------------
// §6, row by row
// ---------------------------------------------------------------------------

const ENTRIES: Array<[string, CueImpl]> = [
  /**
   * `noop` — §7.3's last rung and §3.6 rule 3's renderer half. An unknown event
   * kind resolves here, is logged once, and animates nothing.
   */
  ['noop', cue({ lane: 'hud', apply() {} })],

  /**
   * **tap.rotate** (180 ms) — `θ ± π/2`, ease-out-back.
   *
   * The snapshot in hand already shows the card tapped, so the cue starts a
   * quarter-turn *back* from the resting pose and decays to identity. That is
   * the offset model in one line, and it is why a skipped tap is simply a
   * tapped card.
   */
  [
    'tap.rotate',
    perTarget([], (ctx, t) => ({
      dRotZ: -num(ctx, 'dir', 1) * TAP_ANGLE * (1 - easeOutBack(t)),
      dy: 0.012 * pulse(t),
    })),
  ],

  /** **zone.slide** (300 ms) — a straight tween from the old anchor to the new. */
  [
    'zone.slide',
    perTarget([], (ctx, t, stage, id) => {
      const d = decay(stage, id, fromAnchor(ctx), 1 - easeInOutCubic(t));
      return { dx: d[0], dy: d[1] + 0.04 * pulse(t), dz: d[2] };
    }),
  ],

  /**
   * **zone.enters** (450 ms) — drops from `+0.6 y` with a slight overshoot,
   * 1.15 → 1.0 scale, and a short dust ring at the landing point.
   */
  [
    'zone.enters',
    cue({
      effects: ['ring'],
      apply(ctx, t, stage) {
        const drop = 1 - easeOutBack(t, 2.1);
        for (const id of ctx.targets) {
          stage.setOffset(id, {
            dy: 0.6 * Math.max(0, drop),
            scale: 1 + 0.15 * (1 - easeOutCubic(t)),
            glow: 0.5 * (1 - easeOutCubic(t)),
            glowColour: colour(ctx),
          });
        }
        const first = ctx.targets[0];
        if (first !== undefined && t > 0.45) {
          const u = clamp01((t - 0.45) / 0.55);
          stage.setEffect(`${ctx.key}:ring`, {
            kind: 'ring',
            at: { kind: 'card', id: first },
            colour: colour(ctx),
            strength: (1 - u) * num(ctx, 'impact', 1),
            radius: 0.3 + u * 0.9,
          });
        }
      },
    }),
  ],

  /**
   * **zone.dissolve** (650 ms) — the noise-mask dissolve, the card sinking and
   * drifting toward the graveyard, then **re-forming there**.
   *
   * §6 says "fades to 0", and a cue that ended at zero opacity would be a cue
   * that does not decay to identity: the card really is in the graveyard in
   * this very frame, and it has to be visible there when the cue ends. So the
   * dissolve runs out over the first 55% and back in over the rest, at the
   * destination. Same beat, and skippable.
   */
  [
    'zone.dissolve',
    perTarget([], (ctx, t, stage, id) => {
      const k = 1 - easeInOutCubic(t);
      const d = decay(stage, id, fromAnchor(ctx, 'battlefield'), k);
      const wave = pulse(t);
      return {
        dx: d[0],
        dy: d[1] - 0.25 * wave,
        dz: d[2],
        dissolve: 0.92 * wave,
        opacity: 1 - 0.5 * wave,
        tint: GREY,
      };
    }),
  ],

  /** **zone.exile** (600 ms) — scale → 0 about its centre with a white flash. */
  [
    'zone.exile',
    perTarget(['glow'], (ctx, t, stage, id) => {
      const wave = pulse(t);
      const d = decay(stage, id, fromAnchor(ctx), 1 - easeInOutCubic(t));
      stage.setEffect(`${ctx.key}:glow`, {
        kind: 'glow',
        at: { kind: 'card', id },
        colour: WHITE,
        strength: wave,
        radius: 0.8 + wave * 0.5,
      });
      return {
        dx: d[0],
        dy: d[1] + 0.2 * wave,
        dz: d[2],
        scale: 1 - 0.85 * wave,
        glow: wave,
        glowColour: WHITE,
      };
    }),
  ],

  /** **zone.draw** (380 ms) — from the library anchor into the fan slot. */
  [
    'zone.draw',
    perTarget([], (ctx, t, stage, id) => {
      const d = decay(stage, id, fromAnchor(ctx, 'library'), 1 - easeOutCubic(t));
      return { dx: d[0], dy: d[1] + 0.05 * pulse(t), dz: d[2], scale: 1 + 0.08 * pulse(t) };
    }),
  ],

  /**
   * **zone.toStack** (220 ms) — the small rise a card takes onto the stack when
   * there is **no** `cast` event to fold it into (a copy, a trigger whose source
   * moved). The planner suppresses it whenever a `cast` for the same card is in
   * the same batch, because otherwise the card animates twice.
   */
  [
    'zone.toStack',
    perTarget([], (ctx, t, stage, id) => {
      const d = decay(stage, id, fromAnchor(ctx), 1 - easeOutCubic(t));
      return { dx: d[0], dy: d[1] + 0.15 * pulse(t), dz: d[2], glow: 0.4 * pulse(t), glowColour: colour(ctx) };
    }),
  ],

  /**
   * **cast.rise** (700 ms) — the card lifts toward the stack column, glows in
   * its colour identity, and throws a beam at what it targets.
   *
   * The target comes from `stack[].targetCardIds` of the same frame, passed in
   * as an **id** by `resolve.ts` (§3.6 rule 2). No name, no `targetDescription`
   * — that accessor is banned at field level and the arena never sees one.
   */
  [
    'cast.rise',
    cue({
      effects: ['glow', 'beam', 'spend', 'freeze', 'banner'],
      apply(ctx, t, stage) {
        const id = ctx.targets[0];
        if (id === undefined) return;
        const speed = num(ctx, 'speed', 1);
        const u = clamp01(t * speed);
        const k = 1 - easeOutCubic(u);
        const d = decay(stage, id, fromAnchor(ctx, 'hand'), k);
        const wave = pulse(u);
        stage.setOffset(id, {
          dx: d[0],
          dy: d[1] + 0.5 * wave,
          dz: d[2],
          scale: 1 + 0.08 * wave,
          glow: Math.max(wave, num(ctx, 'glowFloor', 0)),
          glowColour: colour(ctx),
        });
        stage.setEffect(`${ctx.key}:glow`, {
          kind: 'glow',
          at: { kind: 'card', id },
          colour: colour(ctx),
          strength: wave,
          radius: 1.1,
        });
        const beamCard = num(ctx, 'beamTo', -1);
        const beamPlayer = num(ctx, 'beamToPlayer', -1);
        const to: AnchorRef | null =
          beamCard >= 0
            ? { kind: 'card', id: beamCard }
            : beamPlayer >= 0
              ? { kind: 'player', id: beamPlayer }
              : null;
        if (to !== null && u > 0.25) {
          stage.setEffect(`${ctx.key}:beam`, {
            kind: 'beam',
            at: { kind: 'card', id },
            to,
            colour: colour(ctx),
            strength: pulse(clamp01((u - 0.25) / 0.75)),
            radius: 0.02,
          });
        }
        /**
         * **The mana being consumed** (T4, report 13 §5.4; user decision 9).
         *
         * A ring at the caster's own casting anchor, closing **inward** — the
         * mirror of the mote's outward flight, and the beat that ties the two
         * together. `ctx.players[0]` is `CastEvent.controller`, so the only claim
         * made is "this player cast a spell", which is exactly what the engine
         * said.
         *
         * It deliberately does **not** reach for the motes themselves. The motes
         * are a pose read from `manaPool`, and by this frame the pool is already
         * empty — they are gone because the snapshot says they are gone. A
         * renderer that remembered "there were three motes here" in order to
         * animate them into the spell would be remembering something the engine
         * never stated.
         */
        /**
         * **T11 — Strategic Intervention's freeze-frame** (`params.freeze`): the
         * table flashes as if the shot had frozen, a fixed banner — two words, no
         * name, the same rule as `turn.banner` — reads MISSION CONTROL over the ops
         * console its card already carries (its T12 station). It never stops
         * anything: the queue keeps its clock, the board keeps every click. (The
         * FIGURES do hold while its trigger waits on the stack in combat — that is
         * T6's combat freeze, a pose, and it is the literal freeze-frame.)
         */
        if (flag(ctx, 'freeze') && t < 0.9) {
          const v = clamp01(t / 0.9);
          stage.setEffect(`${ctx.key}:freeze`, {
            kind: 'plate',
            at: { kind: 'table' },
            colour: colour(ctx, WHITE),
            strength: 0.55 * (1 - easeOutCubic(clamp01(v / 0.35))),
            radius: 3.2,
          });
          stage.setEffect(`${ctx.key}:banner`, {
            kind: 'text',
            at: { kind: 'table' },
            colour: '#7fd4ff',
            strength: 1.2 * pulse(v),
            radius: 0.5,
            text: 'MISSION CONTROL',
            rise: 0.35 + 0.2 * easeOutCubic(v),
          });
        } else if (flag(ctx, 'freeze')) {
          stage.clearEffect(`${ctx.key}:freeze`);
          stage.clearEffect(`${ctx.key}:banner`);
        }
        const caster = ctx.players[0];
        if (caster === undefined) return;
        stage.setEffect(`${ctx.key}:spend`, {
          kind: 'ring',
          at: { kind: 'casting', player: caster },
          colour: colour(ctx),
          strength: 0.85 * (1 - easeOutCubic(u)),
          radius: 0.45 * (1 - 0.8 * easeOutCubic(u)),
        });
      },
    }),
  ],

  /**
   * **resolved.pop** — the stack item flashes and pops, and **T6's strike**: the
   * form leaves the caster's casting anchor, travels the tether and bursts at the
   * target (report 13 §6.3).
   *
   * ---------------------------------------------------------------------------
   * **Where the aim comes from.** `ResolvedEvent` is `{cardId, fizzled}` — no
   * stack id, no targets — and by the frame that carries it the item has left
   * `state.stack`. The planner therefore hands `resolve.ts` the board of the frame
   * **immediately before** the batch, and `strikeParams` reads the resolving
   * item's first target out of it as `strikeCard` / `strikePlayer`. Measured over
   * the corpus on 2026-09-26: **333 of 412** resolutions have their item on the
   * previous frame's stack and **41** of those carry a target — against **7** if
   * the same frame is read, which is why the earlier version of this cue (T6's
   * first draft) concluded the strike could not be aimed at all.
   *
   * **An untargeted spell discharges into its own card** — a beam from the anchor
   * to the spell — because it has nothing to strike, and the rest of what it did
   * (damage, counters, a zone move) arrives as its own events in the same batch
   * with cues of their own. The strike claims one thing: *this spell was aimed at
   * that*, which the previous frame said in ids.
   *
   * The struck figure plays `hit` when it belongs to someone other than the caster
   * and `channel` when it does not (`strikeFoe`, two `controller` fields read by
   * the planner). Its clip is addressed through `alsoClears: ['strikeCard']`, which
   * is what keeps `end()` total over it (T5's `clipOn` discipline).
   * ---------------------------------------------------------------------------
   */
  [
    'resolved.pop',
    cue({
      effects: ['ring', 'beam', 'bolt', 'burst', 'impact'],
      alsoClears: ['strikeCard'],
      apply(ctx, t, stage) {
        const id = ctx.targets[0];
        if (id === undefined) return;
        const wave = pulse(t);
        stage.setOffset(id, {
          scale: 1 + 0.14 * wave,
          glow: wave,
          glowColour: colour(ctx, WHITE),
        });
        // `players[0]` is the source card's controller, read off the SNAPSHOT by
        // `resolve.ts` — the `resolved` event carries no player at all, exactly as
        // `tap` carries none (T4's precedent). 365 of the corpus's 412 resolutions
        // have one; the other 47 simply flash, which is the honest fallback.
        const caster = ctx.players[0];
        if (caster === undefined) return;
        const at: AnchorRef = { kind: 'casting', player: caster };
        // The form lets go: a ring at the anchor it stood at, over the first half.
        stage.setEffect(`${ctx.key}:ring`, {
          kind: 'ring',
          at,
          colour: colour(ctx, WHITE),
          strength: 0.9 * (1 - easeOutCubic(clamp01(t / 0.6))),
          radius: 0.18 + 0.6 * easeOutCubic(clamp01(t / 0.6)),
        });

        const strikeCard = num(ctx, 'strikeCard', -1);
        const strikePlayer = num(ctx, 'strikePlayer', -1);
        const to: AnchorRef | null =
          strikeCard >= 0
            ? { kind: 'card', id: strikeCard }
            : strikePlayer >= 0
              ? { kind: 'player', id: strikePlayer }
              : null;
        if (to === null) {
          // Untargeted: the form discharges into the card it was.
          stage.setEffect(`${ctx.key}:beam`, {
            kind: 'beam',
            at,
            to: { kind: 'card', id },
            colour: colour(ctx, WHITE),
            strength: 0.85 * wave,
            radius: 0.025,
          });
          return;
        }

        // **The strike.** 0 → 0.55: the form travels the tether (a `mote` is the
        // one primitive that interpolates between two anchors) with the tether
        // flaring behind it; 0.5 → 1: it bursts at the target.
        const travel = clamp01(t / 0.55);
        if (t < 0.6) {
          stage.setEffect(`${ctx.key}:bolt`, {
            kind: 'mote',
            at,
            to,
            colour: colour(ctx, WHITE),
            strength: 1,
            radius: 0.17,
            travel: easeInCubic(travel) * 0.35 + travel * 0.65,
          });
          stage.setEffect(`${ctx.key}:beam`, {
            kind: 'beam',
            at,
            to,
            colour: colour(ctx, WHITE),
            strength: 0.7 * (1 - 0.6 * travel),
            radius: 0.03,
          });
        }
        if (t > 0.5) {
          const u = clamp01((t - 0.5) / 0.5);
          stage.setEffect(`${ctx.key}:impact`, {
            kind: 'ring',
            at: to,
            colour: colour(ctx, WHITE),
            strength: 1 - easeOutCubic(u),
            radius: 0.2 + 0.75 * easeOutCubic(u),
          });
          if (!ctx.reducedMotion) {
            stage.setEffect(`${ctx.key}:burst`, {
              kind: 'particles',
              at: to,
              colour: colour(ctx, WHITE),
              strength: 1 - easeOutCubic(u),
              radius: 0.5,
              burst: u,
            });
          }
          // The struck figure reacts as the burst lands. `strikeCard` is named in
          // `alsoClears`, so `end()` releases this clip whether or not it ran.
          if (strikeCard >= 0) {
            clipOn(ctx, u, stage, strikeCard, flag(ctx, 'strikeFoe') ? 'hit' : 'channel');
          }
        }
      },
    }),
  ],

  /**
   * **resolved.fizzle** — it greys and shrinks instead, and the form **goes grey
   * and drops through the table** (§6.3).
   *
   * The form itself is a pose and is already gone from the snapshot, so the fall
   * is drawn by a grey `mote` from the caster's casting anchor to the table
   * directly under it (`{kind: 'casting', ground: true}` — a named place, so the
   * cue still knows no coordinate), and a dull ring where it lands.
   *
   * **The corpus has no fizzle at all** — 0 of 412 `resolved` events carry
   * `fizzled: true` — so this cue is exercised by `cues-exhaustive.test.ts` and by
   * a synthetic event in the browser evidence, and by nothing a real game has
   * produced here yet. That is said rather than hidden.
   */
  [
    'resolved.fizzle',
    cue({
      effects: ['sink', 'drop', 'grey'],
      apply(ctx, t, stage) {
        for (const id of ctx.targets) {
          stage.setOffset(id, {
            scale: 1 - 0.16 * pulse(t),
            tint: GREY,
            opacity: 1 - 0.35 * pulse(t),
          });
        }
        const caster = ctx.players[0];
        if (caster === undefined) return;
        const at: AnchorRef = { kind: 'casting', player: caster };
        const ground: AnchorRef = { kind: 'casting', player: caster, ground: true };
        // The form goes grey where it stood…
        if (t < 0.35) {
          stage.setEffect(`${ctx.key}:grey`, {
            kind: 'glow',
            at,
            colour: GREY,
            strength: 0.9 * pulse(t / 0.35),
            radius: 0.34,
          });
        }
        // …and falls through the table.
        if (t > 0.12 && t < 0.88) {
          const fall = clamp01((t - 0.12) / 0.76);
          stage.setEffect(`${ctx.key}:drop`, {
            kind: 'mote',
            at,
            to: ground,
            colour: GREY,
            strength: 1 - 0.35 * fall,
            radius: 0.21 * (1 - 0.35 * fall),
            travel: easeInCubic(fall),
            arc: 0,
          });
        }
        if (t > 0.7) {
          const u = clamp01((t - 0.7) / 0.3);
          stage.setEffect(`${ctx.key}:sink`, {
            kind: 'ring',
            at: ground,
            colour: GREY,
            strength: 0.8 * (1 - u),
            radius: 0.15 + 0.35 * easeOutCubic(u),
          });
        }
      },
    }),
  ],

  /**
   * **unstacked.shatter** (380 ms) — a quick squash and fade, and **the form
   * cracks** (§6.3).
   *
   * Note the planner's existing suppression rule 2 (`queue.ts`): `unstacked` fires
   * for *every* spell that leaves the stack, resolution included (412 of each in
   * the corpus), and is dropped when a `resolved` covers it. Tier 2 inherits that
   * for free and must not re-derive it — which is why this cue may assume it is a
   * **counter**, not a resolution.
   */
  [
    'unstacked.shatter',
    cue({
      effects: ['shards', 'crack'],
      apply(ctx, t, stage) {
        for (const id of ctx.targets) {
          stage.setOffset(id, {
            squashX: 1 - 0.55 * pulse(t),
            squashY: 1 + 0.12 * pulse(t),
            opacity: 1 - 0.45 * pulse(t),
          });
        }
        const caster = ctx.players[0];
        if (caster === undefined) return;
        const at: AnchorRef = { kind: 'casting', player: caster };
        // The crack: a hard ring that snaps outward and is gone — the one shape
        // that still reads under reduced motion, where the shards are not drawn.
        stage.setEffect(`${ctx.key}:crack`, {
          kind: 'ring',
          at,
          colour: colour(ctx, GREY),
          strength: 0.9 * (1 - easeOutCubic(t)),
          radius: 0.12 + 0.5 * easeOutCubic(t),
        });
        if (ctx.reducedMotion) return;
        stage.setEffect(`${ctx.key}:shards`, {
          kind: 'particles',
          at,
          colour: colour(ctx, GREY),
          strength: 1 - easeOutCubic(t),
          radius: 0.4,
          burst: clamp01(t),
        });
      },
    }),
  ],

  /**
   * **attack.lunge** (850 ms) — each attacker translates to its combat lane,
   * tilts toward its defender, holds, and comes back.
   *
   * §6 describes the translate; the return is this file's addition and it is
   * forced by §5.1: a cue decays to identity, so an attacker that *stayed* in
   * the lane would be a cue that never ends. Standing in the lane for the rest
   * of combat is a **layout** rule (`card.attacking` is on the wire) and is
   * E5's to take if it wants it.
   */
  [
    'attack.lunge',
    cue({
      effects: ['spot', 'cone', 'muzzle'],
      apply(ctx, t, stage) {
        const id = ctx.targets[0];
        if (id === undefined) return;
        const player = ctx.players[0] ?? 0;
        const k = outHoldBack(t, 0.3, 0.7);
        const d = decay(stage, id, { kind: 'combat', player }, k * 0.9);
        const tilt = 0.21 * k * (d[2] <= 0 ? 1 : -1);
        stage.setOffset(id, {
          dx: d[0],
          dy: d[1] + 0.06 * k,
          dz: d[2],
          dRotX: tilt,
          // The figure turns to face what it attacks, and back (the second
          // verification pass): Agent 13's muzzle flash below fires AT the
          // defender, not out of the far side of her body.
          dRotY: stage.yawTo(id, defenderOf(ctx)) * k,
          scale: 1 + 0.04 * k,
        });
        /**
         * **The lone attacker's spotlight** (T11 — the Agents' "the lone attacker
         * gets a spotlight", and every `attackers:alone` default with it). Tier 1
         * drew it as a glow at the CARD's rest position, which stayed behind while
         * the lunge carried the card and its figure into the lane; it is now a cone
         * of light from above onto the FIGURE, with a pool of light at its feet,
         * and both follow it out and back.
         */
        const spot = num(ctx, 'spotlight', 0);
        if (spot > 0) {
          stage.setEffect(`${ctx.key}:spot`, {
            kind: 'ring',
            at: figureAt(id, 0),
            colour: colour(ctx, GOLD),
            strength: 0.9 * k * Math.min(1, spot),
            radius: 0.62,
            fit: true,
          });
          stage.setEffect(`${ctx.key}:cone`, {
            kind: 'beam',
            at: figureAt(id, 3.4),
            to: figureAt(id, 0),
            colour: colour(ctx, GOLD),
            strength: 0.55 * k * Math.min(1, spot),
            radius: 0.1,
          });
        }
        /**
         * **Agent 13's pistol draw, fired** (T11, `params.muzzle`). The draw itself
         * is the model's two-handed shooting pose through her `attack → pistolDraw`
         * alias (T3); this is the two shots it fires in the hold — a four-point
         * glint just in front of the figure's hands, a flash and gone.
         */
        if (flag(ctx, 'muzzle')) {
          const flash = Math.max(blip(t, 0.36, 0.05), blip(t, 0.52, 0.05));
          if (flash > 0) {
            stage.setEffect(`${ctx.key}:muzzle`, {
              kind: 'glow',
              // ON the pistol's lit muzzle — the prop's own point, through the
              // one definition of a figure's front and right (D81).
              at: figureAt(id, MUZZLE_ANCHOR.at, MUZZLE_ANCHOR.fwd, MUZZLE_ANCHOR.side),
              colour: colour(ctx, '#ffe9b0'),
              strength: 1.2 * flash,
              radius: 0.3,
              shape: 'star',
            });
          } else {
            stage.clearEffect(`${ctx.key}:muzzle`);
          }
        }
        /**
         * **§8's first camera cue: the low swoop down the combat lane.**
         *
         * One request per attacker, all at the same priority — so the first
         * attacker takes the lane and the rest are *dropped*, not queued (rule
         * 2), which is why a five-attacker alpha strike is one shot and not
         * five. The director drops it outright if the engine is waiting on the
         * human (rule 5) or if the pose would lose the viewer's hand (rule 6).
         */
        if (!ctx.reducedMotion && t < 0.5) {
          stage.requestCamera({
            frame: [
              { kind: 'card', id },
              { kind: 'combat', player },
            ],
            padding: 1.4,
            tilt: 0.22,
            shake: 0,
            priority: 1,
            ms: ctx.ms,
          });
        }
      },
    }),
  ],

  /** **block.interpose** (600 ms) — the blocker steps in front of its attacker. */
  [
    'block.interpose',
    cue({
      effects: ['impact'],
      apply(ctx, t, stage) {
        const id = ctx.targets[0];
        if (id === undefined) return;
        const attacker = num(ctx, 'attackerId', -1);
        const k = outHoldBack(t, 0.35, 0.7);
        const d =
          attacker >= 0 ? decay(stage, id, { kind: 'card', id: attacker }, k * 0.45) : [0, 0, 0];
        stage.setOffset(id, { dx: d[0], dy: d[1] + 0.05 * k, dz: d[2], scale: 1 + 0.03 * k });
        if (attacker >= 0 && t > 0.35 && t < 0.8) {
          const u = clamp01((t - 0.35) / 0.45);
          stage.setEffect(`${ctx.key}:impact`, {
            kind: 'ring',
            at: { kind: 'card', id: attacker },
            colour: colour(ctx, WHITE),
            strength: 1 - u,
            radius: 0.25 + u * 0.5,
          });
        }
      },
    }),
  ],

  /**
   * **damage.hit** (500 ms) — the target jolts *away from* the source, a red rim
   * flashes, and the number rises and fades.
   *
   * The jolt direction is `deltaTo(target, source)` negated and normalised: the
   * cue never learns where either card is, only which way one is from the other.
   */
  ['damage.hit', damageCue(1)],
  /** **damage.lethal** (620 ms) — the same, harder, plus a bounded shake. */
  ['damage.lethal', damageCue(1.7)],

  /**
   * **damage.player** (550 ms) — the HUD plate flashes red and the number flies
   * toward the life total.
   */
  [
    'damage.player',
    cue({
      lane: 'hud',
      effects: ['plate', 'num'],
      apply(ctx, t, stage) {
        const player = ctx.players[0];
        if (player === undefined) return;
        const at: AnchorRef = { kind: 'player', id: player };
        stage.setEffect(`${ctx.key}:plate`, {
          kind: 'plate',
          at,
          colour: RED,
          strength: 0.75 * pulse(t),
          radius: 0.9,
        });
        stage.setEffect(`${ctx.key}:num`, {
          kind: 'text',
          at,
          colour: RED,
          strength: 1 - easeInOutCubic(clamp01((t - 0.35) / 0.65)),
          radius: 0.42,
          text: `-${String(Math.abs(num(ctx, 'amount', 0)))}`,
          rise: 0.5 * easeOutCubic(t),
        });
      },
    }),
  ],

  /**
   * **life.tick** (400 ms) — the life total counts from `from` to `to`, green on
   * gain and red on loss.
   *
   * §6: it fires *after* `damage` in the same batch, so the number and the
   * counter agree. That ordering is the engine's, relayed: the planner keeps
   * the batch in engine order and never sorts it.
   */
  ['life.tick', tickCue((delta) => (delta >= 0 ? GREEN : RED), '')],
  /** **poison.tick** (400 ms) — the same beat, green-black, with a poison pip. */
  ['poison.tick', tickCue(() => POISON, '☠')],

  /** **counters.pop** (420 ms) — a pip pops at the card corner and settles. */
  ['counters.pop', counterCue(false)],
  /** **counters.drop** (380 ms) — the same, reversed and grey. */
  ['counters.drop', counterCue(true)],

  /**
   * **attach.snap** (500 ms) — the Equipment flies to the host and snaps on.
   *
   * **T5 adds the host's own reaction and nothing else** (report 13 §4.3): the
   * creature plays `channel` while the thing lands on it. The *manifestation* —
   * the halo, the metallic rim, Quantum Reduction's shrink — is a **pose** read
   * from `card.attachedToId` (`figures/attach.ts`), because the corpus has 28
   * `attach` events against 985 frames that show an attachment. This cue is the
   * 500 ms; the aura is the other 984 frames.
   */
  [
    'attach.snap',
    cue({
      effects: ['ring', 'flourish'],
      alsoClears: ['toId'],
      apply(ctx, t, stage) {
        const id = ctx.targets[0];
        if (id === undefined) return;
        const k = 1 - easeOutBack(t, 1.4);
        const d = decay(stage, id, { kind: 'zone', player: null, zone: 'battlefield' }, k);
        stage.setOffset(id, { dx: d[0], dy: d[1] + 0.18 * Math.max(0, k), dz: d[2] });
        const host = num(ctx, 'toId', -1);
        // **The host's reaction is data** (T5, report 13 §4.3): `channel` by
        // default, and `params.hostClip` for an attachment whose landing is a
        // different body — Quantum Reduction's is `shrink`. A name outside the
        // closed clip vocabulary falls back rather than failing (§3.6 rung 3).
        const wanted = str(ctx, 'hostClip', 'channel');
        clipOn(ctx, t, stage, host, isClipName(wanted) ? wanted : 'channel');
        if (host >= 0 && t > 0.55) {
          const u = clamp01((t - 0.55) / 0.45);
          // `params.collapse`: the ring closes INTO the host instead of opening
          // out of it — Quantum Reduction's "collapsing ring" as the transition,
          // over the contracting ring its pose keeps at the host's feet.
          const collapse = flag(ctx, 'collapse');
          stage.setEffect(`${ctx.key}:ring`, {
            kind: 'ring',
            at: figureAt(host, 0),
            colour: colour(ctx, GOLD),
            strength: 1 - u,
            radius: collapse ? 0.65 - u * 0.5 : 0.2 + u * 0.45,
          });
        }
        /**
         * **T11 — the HUD flourish** (`params.flourish`, a shape): as the gear
         * lands, a billboard in that shape closes onto the host's chest and fades —
         * Super Suit's plating (`hex`) snapping shut, the Spy Kit's gadgets
         * (`star`) blinking on. It is the TRANSITION into the look the attachment
         * then keeps as a pose (`scene/overlays.ts`, T12), and it is on the figure,
         * not on the card.
         */
        const flourish = str(ctx, 'flourish', '');
        if (host >= 0 && isEffectShape(flourish) && t > 0.35) {
          const u = clamp01((t - 0.35) / 0.65);
          stage.setEffect(`${ctx.key}:flourish`, {
            kind: 'glow',
            at: figureAt(host, 0.52),
            colour: colour(ctx, GOLD),
            strength: 1.1 * pulse(u),
            radius: 1.3 - 0.5 * easeOutCubic(u),
            shape: flourish,
            aspect: flourish === 'star' ? 1 : 0.78,
            fit: true,
          });
        } else {
          stage.clearEffect(`${ctx.key}:flourish`);
        }
      },
    }),
  ],

  /**
   * **attach.release** (420 ms) — `to: null` *is* the unattach event (§3.6).
   *
   * The host is **not** posed here, and that is deliberate: an `attach:off` names
   * no host (`AttachEvent.to` is `null`, which is the whole of the event), so
   * there is no id to react and inventing one would mean guessing which creature
   * had been carrying it. The snapshot has already dropped the manifestation,
   * which is the fact the player needs.
   */
  [
    'attach.release',
    perTarget([], (_ctx, t, stage, id) => {
      const d = decay(stage, id, { kind: 'zone', player: null, zone: 'battlefield' }, 1 - easeOutCubic(t));
      return { dx: d[0], dy: d[1] + 0.1 * pulse(t), dz: d[2], tint: GREY };
    }),
  ],

  /** **sacrifice.crush** (520 ms) — a downward squash into the table. */
  [
    'sacrifice.crush',
    perTarget([], (_ctx, t) => {
      const wave = pulse(t);
      return { squashY: 1 - 0.5 * wave, squashX: 1 + 0.18 * wave, dy: -0.02 * wave, tint: GREY };
    }),
  ],

  /** **land.rise** (550 ms) — the tile rises from *under* the table, with a ripple. */
  [
    'land.rise',
    cue({
      effects: ['ripple'],
      apply(ctx, t, stage) {
        const rise = easeOutCubic(t);
        for (const id of ctx.targets) {
          stage.setOffset(id, { dy: -0.4 * (1 - rise), scale: 0.94 + 0.06 * rise });
        }
        const first = ctx.targets[0];
        if (first !== undefined && t > 0.5) {
          const u = clamp01((t - 0.5) / 0.5);
          stage.setEffect(`${ctx.key}:ripple`, {
            kind: 'ring',
            at: { kind: 'card', id: first },
            colour: colour(ctx),
            strength: 1 - u,
            radius: 0.3 + u * 1.1,
          });
        }
      },
    }),
  ],

  /**
   * **stats.flash** (260 ms) — a brief white rim on every card the event names.
   *
   * `stats` is the **commonest** kind in the stream by a wide margin (8,232 of
   * 19,184 across the committed corpus), so this one is deliberately the
   * quietest cue in the table: a rim at a third strength and nothing else. The
   * planner also drops any target another cue in the same batch already owns,
   * which is what stops a combat turn from strobing.
   */
  [
    'stats.flash',
    perTarget([], (ctx, t, _stage, _id, i) => {
      const u = staggered(t, i, ctx.targets.length, 0.3);
      return { glow: 0.33 * pulse(u), glowColour: colour(ctx, WHITE) };
    }),
  ],

  /** **stats.flip** (400 ms) — `transform: true` plays a flip instead. */
  [
    'stats.flip',
    perTarget([], (_ctx, t) => ({
      // A full turn, so the cue's last frame is identity: a half turn would end
      // at −1 and leave the card mirrored for the rest of the game.
      squashX: Math.cos(2 * Math.PI * clamp01(t)),
      glow: 0.5 * pulse(t),
      glowColour: WHITE,
    })),
  ],

  /**
   * **turn.banner** (700 ms) — a banner rises and fades across the table.
   *
   * The text is `Turn <n>` and, when it is the viewer's own turn, `your turn`.
   * Both are fixed words and a number; there is no player *name* in it, which
   * keeps the one text surface in the arena free of anything that could carry a
   * card or a seat identity it should not.
   */
  [
    'turn.banner',
    cue({
      lane: 'hud',
      effects: ['banner'],
      apply(ctx, t, stage) {
        const own = flag(ctx, 'own');
        // **§8's second camera cue, and it is a *release*, not a move**: a new
        // turn ends whatever shot the last one left running and the camera
        // eases home. §8 asks for "a 300 ms settle back to rest, no move", and
        // the honest way to write that is to hand the lane back.
        if (t < 0.2) stage.requestCamera(null);
        stage.setEffect(`${ctx.key}:banner`, {
          kind: 'text',
          at: { kind: 'table' },
          colour: own ? GOLD : GREY,
          strength: pulse(clamp01(t)) * 1.2,
          radius: 0.8,
          text: `Turn ${String(num(ctx, 'turn', 0))}${own ? ' — your turn' : ''}`,
          rise: 0.3 + 0.5 * easeOutCubic(t),
          driftX: -0.6 + 1.2 * easeInOutCubic(t),
        });
      },
    }),
  ],

  /**
   * **phase.strip** (0 ms) — HUD only, and **never queued**. §3.6 warns that
   * phase events fire on every step; the planner drops them before the timeline
   * so the second commonest kind in the stream cannot dominate the queue.
   */
  ['phase.strip', cue({ lane: 'hud', apply() {} })],

  /** **combat.return** (450 ms) — everyone eases back to their rank. */
  [
    'combat.return',
    perTarget([], (ctx, t, _stage, _id, i) => {
      const u = staggered(t, i, ctx.targets.length, 0.25);
      return { dy: 0.03 * pulse(u), scale: 1 + 0.02 * pulse(u) };
    }),
  ],

  /** **shuffle.riffle** (500 ms) — a riffle at the library anchor. */
  [
    'shuffle.riffle',
    cue({
      lane: 'particle',
      effects: ['glow', 'dust'],
      apply(ctx, t, stage) {
        const player = ctx.players[0];
        if (player === undefined) return;
        const at: AnchorRef = { kind: 'zone', player, zone: 'library' };
        stage.setEffect(`${ctx.key}:glow`, {
          kind: 'glow',
          at,
          colour: colour(ctx, GREY),
          strength: 0.7 * pulse(t),
          radius: 0.7,
        });
        if (!ctx.reducedMotion) {
          stage.setEffect(`${ctx.key}:dust`, {
            kind: 'particles',
            at,
            colour: WHITE,
            strength: 1 - t,
            radius: 0.5,
            burst: t,
          });
        }
      },
    }),
  ],

  /**
   * **mulligan.sweep** (600 ms) — the new hand deals in from the library.
   *
   * §6 says the old hand sweeps off and a new fan deals in. The old hand is not
   * in this frame — the snapshot already reflects the mulligan — so animating
   * it would mean remembering a hand across frames, which is the one thing
   * amendment P5 forbids. The deal-in is the half that is honestly available.
   */
  [
    'mulligan.sweep',
    perTarget([], (ctx, t, stage, id, i) => {
      const u = staggered(t, i, ctx.targets.length, 0.5);
      const player = ctx.players[0] ?? null;
      const d = decay(stage, id, { kind: 'zone', player, zone: 'library' }, 1 - easeOutCubic(u));
      return { dx: d[0], dy: d[1], dz: d[2], opacity: 0.3 + 0.7 * easeOutCubic(u) };
    }),
  ],

  /**
   * **outcome.finish** (1600 ms) — the losing side desaturates and a banner
   * lands. Exempt from the live budget: the game is over, so by definition
   * nothing is waiting on the human.
   */
  [
    'outcome.finish',
    cue({
      lane: 'hud',
      effects: ['banner'],
      apply(ctx, t, stage) {
        const fade = easeInOutCubic(clamp01(t / 0.6));
        for (const id of ctx.targets) {
          stage.setOffset(id, { tint: GREY, opacity: 1 - 0.45 * fade * (1 - clamp01((t - 0.8) / 0.2)) });
        }
        const draw = flag(ctx, 'draw');
        const won = flag(ctx, 'won');
        stage.setEffect(`${ctx.key}:banner`, {
          kind: 'text',
          at: { kind: 'table' },
          colour: draw ? GREY : won ? GOLD : RED,
          strength: easeOutCubic(clamp01(t / 0.35)) * (1 - clamp01((t - 0.85) / 0.15)) * 1.4,
          radius: 1.1,
          text: draw ? 'Draw' : won ? 'Victory' : 'Defeat',
          rise: 0.55 + 0.25 * easeOutCubic(t),
        });
        /**
         * **§8's fourth camera cue: the slow pull-back to a wide shot.**
         *
         * A **cut** rather than an ease (`cut: true`): the game is over, the
         * next thing on screen is a result, and a two-second glide into it is
         * the kind of camera move §8's preamble calls "the fastest way to make
         * a beautiful renderer unusable". It still eases *home* at the end, so
         * rule 1 holds. Priority 4 — the highest anything asks for, because
         * nothing that happens after an outcome outranks it.
         */
        if (!ctx.reducedMotion && t < 0.85) {
          stage.requestCamera({
            frame: [{ kind: 'table' }],
            padding: num(ctx, 'padding', 3.4),
            tilt: num(ctx, 'tilt', 0.08),
            shake: 0,
            priority: 4,
            cut: true,
            ms: ctx.ms,
          });
        }
      },
    }),
  ],

  /**
   * **library.peek** (420 ms) — scry and surveil, which amendment P4 added after
   * §6's table was written. Both carry **counts only** and are genuinely public
   * (§3.6), so the arena says exactly what the wire says: how many went where.
   */
  [
    'library.peek',
    cue({
      lane: 'hud',
      effects: ['glow', 'num'],
      apply(ctx, t, stage) {
        const player = ctx.players[0];
        if (player === undefined) return;
        const toGraveyard = flag(ctx, 'graveyard');
        const at: AnchorRef = { kind: 'zone', player, zone: 'library' };
        stage.setEffect(`${ctx.key}:glow`, {
          kind: 'glow',
          at,
          colour: colour(ctx, '#9ec7f0'),
          strength: pulse(t),
          radius: 0.75,
        });
        stage.setEffect(`${ctx.key}:num`, {
          kind: 'text',
          at,
          colour: '#9ec7f0',
          strength: 1 - easeInOutCubic(clamp01((t - 0.4) / 0.6)),
          radius: 0.3,
          text: `${String(num(ctx, 'toTop', 0))}▲ ${String(num(ctx, 'toBottom', 0))}${toGraveyard ? '✝' : '▼'}`,
          rise: 0.35 * easeOutCubic(t),
        });
      },
    }),
  ],

  /** **phased.fade** (420 ms) — phasing is otherwise invisible in `state`. */
  [
    'phased.fade',
    perTarget([], (ctx, t) => {
      const out = flag(ctx, 'phasedOut');
      const wave = pulse(t);
      return { opacity: 1 - 0.6 * wave, scale: 1 + (out ? -0.06 : 0.06) * wave, tint: '#9ec7f0' };
    }),
  ],

  /**
   * **foretell.glimmer** (480 ms) — the event carries **no card at all**
   * (`GameEventCardForetold(PlayerView)`), which is what makes it safe by
   * construction. So the cue is a glimmer at that player's exile pile, where
   * the face-down card is, and it names nothing.
   */
  [
    'foretell.glimmer',
    cue({
      lane: 'hud',
      effects: ['glow'],
      apply(ctx, t, stage) {
        const player = ctx.players[0];
        if (player === undefined) return;
        stage.setEffect(`${ctx.key}:glow`, {
          kind: 'glow',
          at: { kind: 'zone', player, zone: 'exile' },
          colour: colour(ctx, '#a9a2b4'),
          strength: pulse(t),
          radius: 0.65,
        });
      },
    }),
  ],

  // -------------------------------------------------------------------------
  // The generic primitives, for `cues.json` to reach for (§7.2, §12.2)
  // -------------------------------------------------------------------------

  /** `fx.glow` — an additive halo in `colour`, for any event. */
  [
    'fx.glow',
    cue({
      effects: ['glow'],
      apply(ctx, t, stage) {
        const id = ctx.targets[0];
        if (id === undefined) return;
        const wave = pulse(t);
        stage.setOffset(id, { glow: wave, glowColour: colour(ctx) });
        stage.setEffect(`${ctx.key}:glow`, {
          kind: 'glow',
          at: { kind: 'card', id },
          colour: colour(ctx),
          strength: wave,
          radius: num(ctx, 'radius', 1.1),
        });
      },
    }),
  ],

  /** `fx.ripple` — a ring on the table. The lands' tap cue. */
  [
    'fx.ripple',
    cue({
      effects: ['ring'],
      apply(ctx, t, stage) {
        const id = ctx.targets[0];
        if (id === undefined) return;
        stage.setEffect(`${ctx.key}:ring`, {
          kind: 'ring',
          at: { kind: 'card', id },
          colour: colour(ctx),
          strength: 1 - easeOutCubic(t),
          radius: 0.2 + easeOutCubic(t) * num(ctx, 'radius', 0.9),
        });
        stage.setOffset(id, { dRotZ: -num(ctx, 'dir', 1) * TAP_ANGLE * (1 - easeOutBack(t)) });
      },
    }),
  ],

  /**
   * **`land.tap`** (T4, report 13 §5.4 and user decision 9) — the ripple, **and
   * the mana mote**.
   *
   * It is a cue of its own rather than a widening of `fx.ripple` because the mote
   * is a statement that *this card is a land*, and a cue is not allowed to decide
   * that: the **ladder** decided it, at the `land/*` archetype rung, and the cue
   * id is where that decision is recorded. `fx.ripple` stays exactly what it was
   * and is still what a tapping *creature* gets.
   *
   * The mote's two anchors are the whole of its honesty. It goes from **this
   * card** to **`ctx.players[0]`'s casting anchor**, and `ctx.players[0]` is the
   * land's own `controller` off the snapshot (`cues/resolve.ts`'s `tap` case) —
   * so the reading is "the mana this land made went to the player who owns it",
   * which is two facts the engine stated and no link it did not. §5.4 measured the
   * alternative: a `cast` shares a batch with a land `tap` in only **234 of 414**
   * casts, so a land→spell beam would show nothing at all 43.5% of the time.
   */
  [
    'land.tap',
    cue({
      effects: ['ring', 'mote'],
      apply(ctx, t, stage) {
        const id = ctx.targets[0];
        if (id === undefined) return;
        const e = easeOutCubic(t);
        stage.setEffect(`${ctx.key}:ring`, {
          kind: 'ring',
          at: { kind: 'card', id },
          colour: colour(ctx),
          strength: 1 - e,
          radius: 0.2 + e * num(ctx, 'radius', 0.9),
        });
        // The tile's own quarter-turn back, exactly as `fx.ripple` does it: the
        // snapshot already shows the land tapped, so the cue starts a turn back
        // and decays to identity.
        stage.setOffset(id, {
          dRotZ: -num(ctx, 'dir', 1) * TAP_ANGLE * (1 - easeOutBack(t)),
          // The tile lights up as it is spent. `TileField` reads this glow, which
          // is how the cue reaches the terrain without knowing a tile exists.
          glow: 0.8 * pulse(t),
          glowColour: colour(ctx),
        });
        // **An untap emits no mote** — `dir` is −1 then, and mana does not flow
        // out of a land that is being untapped.
        const player = ctx.players[0];
        if (player === undefined || num(ctx, 'dir', 1) < 0) return;
        // The mote leaves once the ring is on its way, and the last 15% is it
        // arriving: `travel` reaches 1 before `t` does, so the mote is *at* the
        // anchor for a moment rather than winking out in flight.
        const travel = clamp01((t - 0.12) / 0.73);
        if (travel <= 0) return;
        stage.setEffect(`${ctx.key}:mote`, {
          kind: 'mote',
          at: { kind: 'card', id },
          to: { kind: 'casting', player },
          colour: colour(ctx),
          strength: 0.6 + 0.4 * pulse(travel),
          radius: num(ctx, 'mote', 0.075),
          travel,
        });
      },
    }),
  ],

  /**
   * **`land.untap`** (T4) — the tile comes back.
   *
   * Tapped is a **pose** (`figures/tiles.ts`), so the dimming and the brightening
   * are both free and correct after a scrub; this is the *transition*, and it is
   * deliberately the quietest cue in the file. Untaps arrive in rows — every
   * permanent a player controls, in one batch — so anything louder than a short
   * inward ring makes the beginning of every turn strobe.
   */
  [
    'land.untap',
    cue({
      effects: ['ring'],
      apply(ctx, t, stage) {
        const id = ctx.targets[0];
        if (id === undefined) return;
        const e = easeOutCubic(t);
        stage.setOffset(id, {
          dRotZ: -num(ctx, 'dir', -1) * TAP_ANGLE * (1 - easeOutBack(t)),
          glow: 0.4 * pulse(t),
          glowColour: colour(ctx),
        });
        stage.setEffect(`${ctx.key}:ring`, {
          kind: 'ring',
          at: { kind: 'card', id },
          colour: colour(ctx),
          strength: 0.7 * (1 - e),
          // Inward, which is the shape that reads as "coming back" rather than
          // as "being spent".
          radius: num(ctx, 'radius', 0.7) * (1 - 0.75 * e),
        });
      },
    }),
  ],

  /**
   * `fx.shockwave` — a bigger ring and a bounded shake. Quake's cue.
   *
   * **T11: centred on HER, and aimed where the engine said.** The rings leave her
   * figure's feet; with `params.fissure`, a crack runs along the table from her
   * to the card her trigger was aimed at and it jolts when the crack arrives. The
   * aim is `beamTargetOf` — this frame's stack target on a `cast`, and on a
   * `resolved` the PREVIOUS frame's (`strikeCard`, T6's look-behind, D63) — so the
   * crack is drawn only when the wire said what "Seismic Takedown" targeted, and
   * never from the batch's `tap` events: the engine does not say which card caused
   * another card's tap, and pairing them up would be rules logic in a renderer.
   */
  [
    'fx.shockwave',
    cue({
      effects: ['ring', 'ring2', 'crack', 'hit'],
      alsoClears: AIMED,
      apply(ctx, t, stage) {
        const id = ctx.targets[0];
        if (id === undefined) return;
        const at: AnchorRef = figureAt(id, 0);
        const e = easeOutCubic(t);
        stage.setEffect(`${ctx.key}:ring`, {
          kind: 'ring',
          at,
          colour: colour(ctx, '#7fd4ff'),
          strength: 1 - e,
          radius: 0.3 + e * num(ctx, 'radius', 2.6),
        });
        if (t > 0.25) {
          const u = easeOutCubic(clamp01((t - 0.25) / 0.75));
          stage.setEffect(`${ctx.key}:ring2`, {
            kind: 'ring',
            at,
            colour: colour(ctx, '#7fd4ff'),
            strength: (1 - u) * 0.7,
            radius: 0.3 + u * num(ctx, 'radius', 2.6) * 0.7,
          });
        }
        stage.setOffset(id, { dy: 0.05 * pulse(t), glow: 0.7 * pulse(t), glowColour: colour(ctx, '#7fd4ff') });
        const target = flag(ctx, 'fissure') ? beamTargetOf(ctx) : -1;
        if (target >= 0 && target !== id) {
          const run = clamp01(t / 0.45);
          stage.setEffect(`${ctx.key}:crack`, {
            kind: 'beam',
            at,
            to: figureAt(target, 0),
            colour: colour(ctx, '#7fd4ff'),
            strength: 0.95 * pulse(clamp01(t * 1.25)) * run,
            radius: 0.035,
          });
          if (t > 0.4) {
            const u = clamp01((t - 0.4) / 0.6);
            stage.setEffect(`${ctx.key}:hit`, {
              kind: 'ring',
              at: figureAt(target, 0),
              colour: colour(ctx, '#7fd4ff'),
              strength: 1 - easeOutCubic(u),
              radius: 0.2 + 0.7 * easeOutCubic(u),
            });
            stage.setOffset(target, { dy: 0.04 * pulse(u), squashY: 1 - 0.08 * pulse(u) });
            clipOn(ctx, u, stage, target, 'hit');
          }
        }
        if (!ctx.reducedMotion && num(ctx, 'shake', 0) > 0) {
          stage.requestCamera({
            // The camera frames the CARDS — `figure` anchors are the effect
            // binding's, and the director resolves through `layout.ts` alone — and
            // with an aim it frames BOTH ends of the fissure, so the push-in never
            // crops the thing her trigger struck.
            frame: target >= 0 && target !== id ? [{ kind: 'card', id }, { kind: 'card', id: target }] : [{ kind: 'card', id }],
            padding: target >= 0 && target !== id ? 0.7 : 0.25,
            tilt: 0,
            shake: Math.min(num(ctx, 'shake', 0), 1),
            priority: 2,
            ms: ctx.ms,
          });
        }
      },
    }),
  ],

  /** `fx.scaleTo` — Ant-Man shrinking, Pym Particles' target growing. */
  [
    'fx.scaleTo',
    perTarget([], (ctx, t) => {
      const to = num(ctx, 'scale', 0.5);
      return { scale: 1 + (to - 1) * easeInOutCubic(t) * (1 - clamp01((t - 0.85) / 0.15)) };
    }),
  ],

  /** `fx.beam` — a beam to a named card or player. */
  [
    'fx.beam',
    cue({
      effects: ['beam'],
      apply(ctx, t, stage) {
        const id = ctx.targets[0];
        if (id === undefined) return;
        const toId = num(ctx, 'toId', -1);
        if (toId < 0) return;
        stage.setEffect(`${ctx.key}:beam`, {
          kind: 'beam',
          at: { kind: 'card', id },
          to: str(ctx, 'toKind', 'card') === 'player' ? { kind: 'player', id: toId } : { kind: 'card', id: toId },
          colour: colour(ctx),
          strength: pulse(t),
          radius: num(ctx, 'width', 0.025),
        });
      },
    }),
  ],

  // -------------------------------------------------------------------------
  // E5 — the S.H.I.E.L.D. deck's own cues (report 09 §12.2,
  // `docs/ideas/arena-mode.md`'s table)
  //
  // Every one of them is built from the Tier-1 primitive kit and nothing else:
  // transform, tint, glow, ring, beam, particles, camera (§12.1). There is no
  // model, no rig, no pose and no art asset anywhere below — which is the whole
  // claim Tier 1 makes, and the reason these are cues rather than a shopping
  // list.
  //
  // They are **implementations**; which card gets which is `cues.json`, and a
  // card that names none of them still animates, because the ladder falls
  // through to §6. Deleting this whole block would cost the deck its
  // personality and cost the arena nothing.
  // -------------------------------------------------------------------------

  /**
   * **`attack.shrink`** — *Ant-Man, Reformed Rogue*, `attackers:alone`.
   *
   * Scott Lang shrinks to a speck to slip past. The lunge is §6's; the shrink
   * is `params.scale` (0.18 in the data), held through the middle of the swing
   * and released at the end, because the *card* has not changed size — only the
   * shot has.
   */
  [
    'attack.shrink',
    cue({
      effects: ['speck', 'trail'],
      apply(ctx, t, stage) {
        const to = num(ctx, 'scale', 0.2);
        const hold = outHoldBack(t, 0.25, 0.72);
        for (const id of ctx.targets) {
          const move = lunge(ctx, t, stage, id);
          stage.setOffset(id, {
            dx: move.dx,
            dy: move.dy,
            dz: move.dz,
            dRotX: move.dRotX,
            dRotY: move.dRotY,
            scale: 1 + (to - 1) * hold,
            glow: 0.35 * pulse(t),
            glowColour: colour(ctx),
          });
        }
        /**
         * **The speck** (T11, `params.speck`). The offset's `scale` already takes
         * his figure down to 0.18 of itself — `CueRunner` multiplies a figure's
         * height by it — and at 0.18 a hologram is a few pixels: what reads at
         * table distance is a bright point where he was, darting down the lane with
         * him, and a faint trail behind. Both hang on the FIGURE anchor, so they go
         * where he goes and are gone when he is full size again.
         */
        const speck = num(ctx, 'speck', 0);
        const id = ctx.targets[0];
        if (speck <= 0 || id === undefined) return;
        const twinkle = 0.75 + 0.25 * Math.sin(t * Math.PI * 10);
        stage.setEffect(`${ctx.key}:speck`, {
          kind: 'glow',
          at: figureAt(id, 0.5),
          colour: colour(ctx),
          strength: Math.min(1.4, speck * hold * twinkle),
          radius: 0.2,
          shape: 'star',
        });
        if (!ctx.reducedMotion && hold > 0.4) {
          stage.setEffect(`${ctx.key}:trail`, {
            kind: 'particles',
            at: figureAt(id, 0.3, -0.6),
            colour: colour(ctx),
            strength: 0.55 * hold,
            radius: 0.16,
            burst: t,
          });
        } else {
          stage.clearEffect(`${ctx.key}:trail`);
        }
      },
    }),
  ],

  /**
   * **`attack.aegis`** — *Peggy Carter, Secret Agent*, `attackers:alone`.
   *
   * She is indestructible while she attacks alone, and the shield is the whole
   * of the read: a halo that holds for as long as the lunge does, plus a rim on
   * the card. Two blended objects, both inside §9.3's cap.
   */
  [
    'attack.aegis',
    cue({
      effects: ['halo', 'rim', 'rim2'],
      apply(ctx, t, stage) {
        const id = ctx.targets[0];
        if (id === undefined) return;
        const move = lunge(ctx, t, stage, id);
        const hold = outHoldBack(t, 0.2, 0.75);
        stage.setOffset(id, {
          dx: move.dx,
          dy: move.dy,
          dz: move.dz,
          dRotX: move.dRotX,
          dRotY: move.dRotY,
          scale: 1 + 0.05 * move.k,
          glow: 0.8 * hold,
          glowColour: colour(ctx, GOLD),
        });
        /**
         * **The shield is on HER** (T11). Tier 1 drew the halo at her card's rest
         * position, which stayed behind as she charged; it is now a hexagonal
         * force-field bubble around her figure — sized in her own heights, so it
         * fits her after Quantum Reduction too — that goes down the lane with her,
         * and a ring at her feet. Still two blended objects, inside §9.3's cap.
         */
        const shape = str(ctx, 'shape', 'shield');
        stage.setEffect(`${ctx.key}:halo`, {
          kind: 'glow',
          at: figureAt(id, 0.5),
          colour: colour(ctx, GOLD),
          strength: hold,
          radius: 1.05 + 0.12 * hold,
          shape: isEffectShape(shape) ? shape : 'shield',
          aspect: 0.82,
          fit: true,
        });
        stage.setEffect(`${ctx.key}:rim`, {
          kind: 'ring',
          at: figureAt(id, 0),
          colour: str(ctx, 'rim', '') || colour(ctx, GOLD),
          strength: 0.85 * hold,
          radius: 0.58 + 0.06 * Math.sin(t * Math.PI * 3),
          fit: true,
        });
        /**
         * **Her shield's own colours** (the second verification pass): with a
         * `rim2` the rings at her feet are two — `rim` and `rim2`, red and white in
         * the data, round a blue bubble — because a white-gold bubble merged with
         * the white armour shell Super Suit leaves on her as a pose (`g1`@142).
         */
        const rim2 = str(ctx, 'rim2', '');
        if (rim2 !== '') {
          stage.setEffect(`${ctx.key}:rim2`, {
            kind: 'ring',
            at: figureAt(id, 0),
            colour: rim2,
            strength: 0.9 * hold,
            radius: 0.8 + 0.06 * Math.sin(t * Math.PI * 3 + 1.4),
            fit: true,
          });
        } else {
          stage.clearEffect(`${ctx.key}:rim2`);
        }
      },
    }),
  ],

  /**
   * **`attack.jet`** — *Aerial Doombot*, `attackers`.
   *
   * §12.2 calls the drone, the laser eye and the exhaust all model-bound, and
   * names the honest Tier-1 substitute: hover plus a small additive eye. This
   * is that, with the exhaust as a particle burst behind the lunge — the hover
   * itself is a `presence`, not a cue, so it outlives the attack.
   */
  [
    'attack.jet',
    cue({
      lane: 'particle',
      effects: ['exhaust', 'eye', 'laser'],
      apply(ctx, t, stage) {
        const id = ctx.targets[0];
        if (id === undefined) return;
        const move = lunge(ctx, t, stage, id);
        stage.setOffset(id, {
          dx: move.dx,
          dy: move.dy + 0.1 * move.k,
          dz: move.dz,
          dRotX: move.dRotX,
          // Turned to face the defender for the length of the lunge, so the eye
          // and the laser below leave the side of the drone that faces it.
          dRotY: move.dRotY,
          scale: 1 + 0.03 * move.k,
        });
        // **T11: on the body, not on the card.** The eye burns at the front of the
        // figure's head and the exhaust streams from BEHIND it — both on the
        // `figure` anchor, so they fly down the lane with it (Tier 1 put both at
        // the card's rest position, which stayed behind). Front and behind are the
        // prop field's own (D81): the eye on the drone's `laserEye`, the exhaust
        // on its `jetpack` side — `facing.test.ts` holds them there, both seats.
        //
        // `eye: false` is a FLIER on the same cue (Wasp, the giant ant): the lunge
        // and the wing-wash behind it, and no robot's eye — slice 3 gave them the
        // Doombot's star (the verification pass).
        const eye = figureAt(id, 0.62, 0.32);
        if (flag(ctx, 'eye', true)) {
          stage.setEffect(`${ctx.key}:eye`, {
            kind: 'glow',
            at: eye,
            colour: colour(ctx, RED),
            strength: 0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI * 4)),
            radius: 0.16,
            shape: 'star',
          });
        } else {
          stage.clearEffect(`${ctx.key}:eye`);
        }
        if (!ctx.reducedMotion && t < 0.8) {
          stage.setEffect(`${ctx.key}:exhaust`, {
            kind: 'particles',
            at: figureAt(id, 0.3, -0.55),
            colour: colour(ctx, '#9ec7f0'),
            strength: 1 - t,
            radius: 0.3,
            burst: t,
          });
        } else {
          stage.clearEffect(`${ctx.key}:exhaust`);
        }
        /**
         * **The Doombot's laser eye, fired** (T11, `params.laser`) — at the
         * player or planeswalker its attack BAND names (`defenderKind` /
         * `defenderId`, the `attackers` event's own fields), in the hold of the
         * lunge. It aims at what the engine said it attacks and at nothing else.
         */
        if (!flag(ctx, 'laser')) return;
        const defender = num(ctx, 'defenderId', -1);
        const kind = str(ctx, 'defenderKind', 'none');
        const to: AnchorRef | null =
          defender < 0 ? null : kind === 'player' ? { kind: 'player', id: defender } : kind === 'card' ? { kind: 'card', id: defender } : null;
        const on = t > 0.34 && t < 0.72 ? 0.6 + 0.4 * Math.abs(Math.sin(t * Math.PI * 14)) : 0;
        if (to === null || on <= 0) {
          stage.clearEffect(`${ctx.key}:laser`);
          return;
        }
        stage.setEffect(`${ctx.key}:laser`, {
          kind: 'beam',
          at: eye,
          to,
          colour: RED,
          strength: on,
          radius: 0.014,
        });
      },
    }),
  ],

  /**
   * **`fx.flyIn`** — *S.H.I.E.L.D. Helicarrier*, `zone:*>battlefield`.
   *
   * It comes down out of the sky, turning, and lands in a ring of dust — and
   * then it **keeps hovering**, which is the half that is not here: that is the
   * card's `presence` (§5.1), a layout rule, so pressing *skip all* leaves the
   * carrier in the air instead of dropping it back into the rank.
   *
   * It is one of §8's four camera cues, at priority 3 — above the shake cues,
   * below nothing. `frame` is the card itself; the solver does the rest.
   */
  [
    'fx.flyIn',
    cue({
      effects: ['dust', 'downwash'],
      apply(ctx, t, stage) {
        const id = ctx.targets[0];
        if (id === undefined) return;
        const drop = 1 - easeOutCubic(t);
        // **2.2 is a measured ceiling, not a taste.** At the rest pose a card on
        // the OPPONENT's rank leaves the top of the frame above world `y ≈ 2.4`
        // (projected in the browser, 2026-09-13: y 2.0 → ndc 0.93, y 2.4 → 1.00,
        // y 4.3 → 1.43), and the carrier already rests 0.9 up on its `presence`.
        // A fly-in from 4.6 was a card descending from somewhere nobody could
        // see; from 2.2 it enters through the top edge, which is what "flies in
        // overhead" is supposed to look like.
        stage.setOffset(id, {
          dy: num(ctx, 'height', 2.2) * drop,
          dz: -1.2 * drop,
          dRotZ: 0.9 * drop,
          scale: 1 + 0.22 * drop,
          glow: 0.35 * pulse(t),
          glowColour: colour(ctx, '#9ec7f0'),
        });
        if (t > 0.55) {
          const u = clamp01((t - 0.55) / 0.45);
          stage.setEffect(`${ctx.key}:dust`, {
            kind: 'ring',
            at: { kind: 'card', id },
            colour: colour(ctx, '#9ec7f0'),
            strength: 1 - u,
            radius: 0.4 + u * 2.2,
          });
        }
        if (!ctx.reducedMotion && t < 0.75) {
          stage.setEffect(`${ctx.key}:downwash`, {
            kind: 'particles',
            at: { kind: 'card', id },
            colour: WHITE,
            strength: 0.8 * (1 - t),
            radius: 0.9,
            burst: t,
          });
        }
        if (!ctx.reducedMotion && flag(ctx, 'camera', true)) {
          stage.requestCamera({
            frame: [{ kind: 'card', id }],
            padding: 1.1,
            tilt: -0.12,
            shake: 0.25,
            priority: 3,
            ms: ctx.ms,
          });
        }
      },
    }),
  ],

  /**
   * **`fx.strike`** — *Helicarrier Strike*, `cast`.
   *
   * A reticle closes on the target from above, then the beam comes down and the
   * ground rings. The target is `beamTo` — an **id** out of this frame's
   * `stack[].targetCardIds` (§3.6 rule 2), never a description — so with no
   * target on the wire the cue is just the spell rising, which is correct: we
   * were not told what it was aimed at.
   */
  [
    'fx.strike',
    cue({
      effects: ['reticle', 'beam', 'impact', 'flash'],
      alsoClears: AIMED,
      apply(ctx, t, stage) {
        const source = ctx.targets[0];
        if (source !== undefined) {
          stage.setOffset(source, {
            dy: 0.3 * pulse(t),
            glow: 0.6 * pulse(t),
            glowColour: colour(ctx, '#f6f0d8'),
          });
        }
        const target = beamTargetOf(ctx);
        if (target < 0) return;
        // **T11 — the reticle is a crosshair, and it is on the BODY** (the
        // `figure` anchor): it closes on the creature standing in front of the card
        // rather than on the card's art, and follows it if it moves.
        const at: AnchorRef = figureAt(target, 0);
        /**
         * `params.lock` is the CAST: the reticle closes and HOLDS on its target —
         * "target acquired", for as long as the spell waits on the stack — and the
         * beam is the RESOLUTION's (`resolved`, aimed by `strikeCard`). Two beats
         * of one strike, each on the event that is about it. With `lock` off it is
         * Tier 1's whole shot: a short lock, then the beam.
         */
        const lock = flag(ctx, 'lock');
        const closeUntil = lock ? 1 : 0.55;
        if (t < closeUntil) {
          const u = clamp01(t / (lock ? 0.6 : 0.55));
          stage.setEffect(`${ctx.key}:reticle`, {
            kind: 'ring',
            at,
            colour: colour(ctx, '#f6f0d8'),
            strength: lock ? (0.35 + 0.65 * u) * (1 - clamp01((t - 0.82) / 0.18)) : 0.35 + 0.65 * u,
            // A reticle CLOSES: the radius runs down, which is the one ring in
            // the kit that does.
            radius: 1.6 - 1.05 * easeOutCubic(u),
            spin: u * 3.2,
            shape: 'reticle',
          });
        } else {
          stage.clearEffect(`${ctx.key}:reticle`);
        }
        if (lock) return;
        /**
         * **The resolution reads from the table** (the second verification pass:
         * at `g3`@116 a 0.05 beam came down behind the giant ant and nobody saw
         * it). The beam is twice as thick and a star flashes on the body as it
         * lands. No camera move: the struck card is usually in the graveyard by the
         * snapshot the resolution arrives in, and a camera frames CARDS — it
         * swung away to the graveyard when this was tried.
         */
        if (t < 0.55) return;
        const u = clamp01((t - 0.55) / 0.45);
        stage.setEffect(`${ctx.key}:beam`, {
          kind: 'beam',
          // From high over the BODY (the `figure` anchor, in its heights), so the
          // beam comes straight down on it — on a dying body too.
          at: figureAt(target, num(ctx, 'height', 4) / 0.85),
          to: figureAt(target, 0.4),
          colour: colour(ctx, '#f6f0d8'),
          strength: pulse(u),
          radius: 0.1 + 0.08 * (1 - u),
        });
        stage.setEffect(`${ctx.key}:flash`, {
          kind: 'glow',
          at: figureAt(target, 0.6),
          colour: colour(ctx, '#f6f0d8'),
          strength: 1.4 * pulse(clamp01(u * 1.6)),
          radius: 0.62,
          shape: 'star',
          fit: true,
        });
        stage.setEffect(`${ctx.key}:impact`, {
          kind: 'ring',
          at,
          colour: colour(ctx, '#f6f0d8'),
          strength: 1 - u,
          radius: 0.2 + u * 1.3,
        });
        stage.setOffset(target, {
          dy: -0.05 * pulse(u),
          squashY: 1 - 0.12 * pulse(u),
          glow: pulse(u),
          glowColour: colour(ctx, '#f6f0d8'),
        });
        clipOn(ctx, u, stage, target, 'hit');
      },
    }),
  ],

  /**
   * **`fx.webWrap`** — *Web Up*, `cast`.
   *
   * The target is wrapped and lifted off the table. §12.2 is honest that actual
   * webbing geometry is Tier 2; what Tier 1 has is the *lift*, a squash that
   * reads as being bound, and a pale tint. The card is exiled a beat later by
   * the engine, and that arrives as its own `zone`→exile event with its own cue.
   */
  [
    'fx.webWrap',
    cue({
      effects: ['strand', 'strand2', 'wrap'],
      alsoClears: AIMED,
      apply(ctx, t, stage) {
        const source = ctx.targets[0];
        const target = beamTargetOf(ctx);
        if (source !== undefined) {
          stage.setOffset(source, { dy: 0.25 * pulse(t), glow: 0.5 * pulse(t), glowColour: colour(ctx, WHITE) });
          if (target >= 0) {
            // Two strands from the web to the thing it catches — from above Web
            // Up's card, where its cocoon station hangs (T12), to the body.
            const reach = pulse(clamp01(t * 1.6));
            stage.setEffect(`${ctx.key}:strand`, {
              kind: 'beam',
              at: { kind: 'above', id: source, height: 0.55 },
              to: figureAt(target, 0.62),
              colour: colour(ctx, WHITE),
              strength: reach,
              radius: 0.016,
            });
            stage.setEffect(`${ctx.key}:strand2`, {
              kind: 'beam',
              at: { kind: 'card', id: source },
              to: figureAt(target, 0.28),
              colour: colour(ctx, WHITE),
              strength: 0.7 * reach,
              radius: 0.012,
            });
          }
        }
        if (target < 0) return;
        const hold = outHoldBack(t, 0.3, 0.7);
        stage.setOffset(target, {
          dy: num(ctx, 'lift', 0.55) * hold,
          dRotZ: 0.25 * hold,
          squashX: 1 - 0.22 * hold,
          scale: 1 - 0.08 * hold,
          tint: '#d8dde6',
          opacity: 1 - 0.1 * hold,
        });
        /**
         * **T11/T12 — the cocoon closes over the BODY**: a web-shaped billboard on
         * the `figure` anchor, sized in the figure's own heights and closing from
         * wide strands to a tight wrap, lifted with it. On a `resolved` the target
         * is usually already on its way to exile (its own `zone` cue), and the
         * anchor's card-plus-offset fallback is what carries the wrap along with it.
         */
        stage.setEffect(`${ctx.key}:wrap`, {
          kind: 'glow',
          at: figureAt(target, 0.5),
          colour: colour(ctx, WHITE),
          strength: 0.9 * hold,
          radius: 1.35 - 0.45 * hold,
          shape: 'web',
          aspect: 0.72,
          fit: true,
        });
        clipOn(ctx, t, stage, target, 'shrink');
      },
    }),
  ],

  /**
   * **`fx.scaleBeam`** — *Pym Particles*, *Wasp, Shrinking Savior*, `cast`.
   *
   * A beam out of the card and the thing it hits changes size: `targetScale`
   * below 1 is the shrink (Wasp's −3/−0, Pym's reduction), above 1 is the grow.
   * The size change is an **offset** and decays, because the card's real size
   * never changed — only its power did, and that is `stats`' business.
   */
  [
    'fx.scaleBeam',
    cue({
      effects: ['beam', 'flare', 'ring'],
      alsoClears: AIMED,
      apply(ctx, t, stage) {
        const source = ctx.targets[0];
        if (source !== undefined) {
          stage.setOffset(source, {
            dy: 0.35 * pulse(t),
            scale: 1 + 0.06 * pulse(t),
            glow: pulse(t),
            glowColour: colour(ctx),
          });
        }
        const target = beamTargetOf(ctx);
        if (target < 0) return;
        // T11: from the caster's BODY (Wasp hovering on her figure) to the target's
        // — a card with no figure (Pym Particles, a sorcery) beams from its card.
        if (source !== undefined && t > 0.15) {
          stage.setEffect(`${ctx.key}:beam`, {
            kind: 'beam',
            at: figureAt(source, 0.62),
            to: figureAt(target, 0.5),
            colour: colour(ctx),
            strength: pulse(clamp01((t - 0.15) / 0.85)),
            radius: num(ctx, 'width', 0.03),
          });
        }
        /**
         * **Which way the target changes size** (T11). By default the data says —
         * Wasp's `targetScale: 0.6` is her −3/−0. With `params.follow` the SNAPSHOT
         * says: `strikeGrew` is the sign of the struck card's P/T change across this
         * very transition (`resolve.ts`'s `sizeChange`), so Pym Particles' target
         * grows when it got bigger and shrinks when it got smaller, by the data's
         * magnitude — and when nothing about it changed (a cast, before anything
         * has; the vigilance mode) it only pulses, claiming no change at all.
         */
        const magnitude = Math.abs(num(ctx, 'targetScale', 0.55) - 1);
        const grew = num(ctx, 'strikeGrew', 0);
        const to = flag(ctx, 'follow')
          ? grew > 0
            ? 1 + magnitude
            : grew < 0
              ? 1 / (1 + magnitude)
              : 1 + 0.18 * magnitude
          : num(ctx, 'targetScale', 0.55);
        const hold = outHoldBack(t, 0.35, 0.75);
        stage.setOffset(target, {
          scale: 1 + (to - 1) * hold,
          glow: 0.6 * hold,
          glowColour: colour(ctx),
        });
        stage.setEffect(`${ctx.key}:flare`, {
          kind: 'glow',
          at: figureAt(target, 0.5),
          colour: colour(ctx),
          strength: 0.8 * pulse(t),
          radius: 0.65,
        });
        // The ring at its feet says which way: it CLOSES on a shrink and opens on
        // a grow, exactly as `attach.snap`'s collapse does for Quantum Reduction.
        const e = easeOutCubic(t);
        stage.setEffect(`${ctx.key}:ring`, {
          kind: 'ring',
          at: figureAt(target, 0),
          colour: colour(ctx),
          strength: 0.9 * pulse(t),
          radius: to < 1 ? 0.95 - 0.6 * e : 0.3 + 0.7 * e,
          fit: true,
        });
        clipOn(ctx, t, stage, target, to < 1 ? 'shrink' : 'grow');
      },
    }),
  ],

  /**
   * **`fx.collapse`** — *Quantum Reduction*, `cast`.
   *
   * The Quantum Realm takes it: the target collapses toward a point of light
   * and the light goes out. Structurally the same beat as `zone.exile` and
   * deliberately so — Quantum Reduction's victim usually *is* exiled, and the
   * two cues have to read as one gesture when they land in the same batch.
   */
  [
    'fx.collapse',
    cue({
      effects: ['point'],
      alsoClears: AIMED,
      apply(ctx, t, stage) {
        const source = ctx.targets[0];
        if (source !== undefined) {
          stage.setOffset(source, { dy: 0.2 * pulse(t), glow: 0.7 * pulse(t), glowColour: colour(ctx) });
        }
        const target = beamTargetOf(ctx);
        if (target < 0) return;
        const wave = pulse(t);
        stage.setOffset(target, {
          scale: 1 - 0.92 * wave,
          dy: 0.18 * wave,
          dRotZ: 2.4 * wave,
          glow: wave,
          glowColour: WHITE,
        });
        // **T5** (report 13 §4.3): the victim's figure crouches as the Realm
        // pulls. The *lasting* shrink is the pose — `figures.json`'s
        // `"Quantum Reduction": { kind: "shrink", hostScale: 0.45 }` — and this is
        // the 520 ms of it happening. `alsoClears: ['beamTo']` above is what makes
        // `end()` total over the clip as well as the offset.
        clipOn(ctx, t, stage, target, 'shrink');
        // T11: the point of light the Realm leaves is where the BODY was.
        stage.setEffect(`${ctx.key}:point`, {
          kind: 'glow',
          at: figureAt(target, 0.4),
          colour: WHITE,
          strength: wave * wave,
          radius: 0.12 + 0.9 * (1 - wave),
          shape: wave > 0.6 ? 'star' : 'soft',
        });
      },
    }),
  ],

  /**
   * **`fx.badge`** — *Agent Phil Coulson*, `counters:P1P1+`.
   *
   * The badge flash §12.2 describes: an additive rim plus a ring on **the card
   * that got the counter**. It replaces `counters.pop`'s pip, which is a
   * deliberate trade — the pip says how many, the badge says who, and Coulson's
   * counters are always exactly one.
   *
   * **What the arena cannot know**, and does not pretend to: §3.6's `counters`
   * event carries the card, the counter type and the two values, and **no
   * source**. So "Coulson did this" is not on the wire and no cue can claim it;
   * the file keys this on the *receiving* card instead, which is the honest
   * version of the same shot.
   */
  [
    'fx.badge',
    cue({
      effects: ['badge', 'flash'],
      apply(ctx, t, stage) {
        for (const id of ctx.targets) {
          stage.setOffset(id, {
            dy: 0.05 * pulse(t),
            scale: 1 + 0.07 * pulse(t),
            glow: 0.9 * pulse(t),
            glowColour: colour(ctx, GOLD),
          });
        }
        const first = ctx.targets[0];
        if (first === undefined) return;
        /**
         * **T11 — the badge is on the Hero's CHEST**: a shield-shaped emblem on the
         * figure (`figure` anchor, a little in front of it), flashing up and out,
         * and a ring at its feet. Tier 1's soft glow sat on the card's art. Still
         * keyed to the card that RECEIVED the counter — the only card §3.6's
         * `counters` event names — and never to Coulson as its cause.
         */
        const shape = str(ctx, 'shape', 'badge');
        const up = easeOutBack(clamp01(t / 0.45), 2.2);
        stage.setEffect(`${ctx.key}:badge`, {
          kind: 'glow',
          at: figureAt(first, 0.62 + 0.25 * clamp01(t), 0.22),
          colour: colour(ctx, GOLD),
          strength: 1.1 * pulse(t),
          radius: 0.3 + 0.14 * Math.max(0, up),
          shape: isEffectShape(shape) ? shape : 'badge',
        });
        stage.setEffect(`${ctx.key}:flash`, {
          kind: 'ring',
          at: figureAt(first, 0),
          colour: colour(ctx, GOLD),
          strength: 1 - easeOutCubic(t),
          radius: 0.25 + easeOutCubic(t) * 0.65,
        });
      },
    }),
  ],

  /**
   * **`fx.hologram`** — *A.I.M. Scientists*, *Bold Biochemist*.
   *
   * §12.2 splits this row: the lab bench is Tier 2, the glowing vials are Tier
   * 1, and "cards fly to hand" is **already** Tier 1 because `zone.draw`
   * animates every draw the engine reports. So this is the vials and the bench
   * *light* — a cyan tint pulse, two ranging rings on the table, and a dust of
   * particles — and the draw stays the draw.
   */
  [
    'fx.hologram',
    cue({
      effects: ['grid', 'grid2', 'motes', 'vial0', 'vial1', 'vial2', 'card0', 'card1', 'card2', 'card3'],
      apply(ctx, t, stage) {
        const id = ctx.targets[0];
        if (id === undefined) return;
        const tone = colour(ctx, '#7fd4ff');
        const feet = figureAt(id, 0);
        stage.setOffset(id, {
          dy: 0.08 * pulse(t),
          glow: 0.75 * pulse(t),
          glowColour: tone,
          tint: '#dceefc',
        });
        const e = easeOutCubic(t);
        stage.setEffect(`${ctx.key}:grid`, {
          kind: 'ring',
          at: feet,
          colour: tone,
          strength: (1 - e) * 0.9,
          radius: 0.25 + e * 1.1,
        });
        // The second ring gives way to the vials: six blended objects in one cue
        // was over half of §9.3's eight, and the power-up is the vials.
        if (t > 0.3 && !flag(ctx, 'vials')) {
          const u = easeOutCubic(clamp01((t - 0.3) / 0.7));
          stage.setEffect(`${ctx.key}:grid2`, {
            kind: 'ring',
            at: feet,
            colour: tone,
            strength: (1 - u) * 0.6,
            radius: 0.25 + u * 0.7,
          });
        }
        /**
         * **T11 — the Power-up: the vials glow in turn** (`params.vials`). Three
         * glints at the figure's hands — left, centre, right, a little in front of
         * it, where the lab bench stands — each lighting up a beat after the last.
         */
        if (flag(ctx, 'vials')) {
          for (let i = 0; i < 3; i++) {
            const lit = pulse(clamp01((t - 0.08 - i * 0.16) / 0.5));
            stage.setEffect(`${ctx.key}:vial${String(i)}`, {
              kind: 'glow',
              at: figureAt(id, 0.4, 0.34, (i - 1) * 0.36),
              colour: tone,
              strength: 1.1 * lit,
              radius: 0.13,
              shape: 'star',
            });
          }
        }
        /**
         * **…and the cards fly to hand** (`params.toHand`, the count the card's own
         * text draws — art direction, like every number in this file). Each is a
         * mote from the figure to ITS CONTROLLER's hand anchor — `ctx.players[0]`,
         * read off the snapshot by `resolve.ts`, so an opponent's scientist sends
         * them across the table. The draws themselves still arrive as their own
         * `zone` events with their own `zone.draw`; this is the scientist's half.
         */
        const toHand = Math.min(4, Math.max(0, Math.round(num(ctx, 'toHand', 0))));
        const player = ctx.players[0];
        if (player !== undefined) {
          for (let i = 0; i < toHand; i++) {
            const travel = clamp01((t - 0.3 - i * 0.12) / 0.5);
            const key = `${ctx.key}:card${String(i)}`;
            if (travel <= 0 || travel >= 1) {
              stage.clearEffect(key);
              continue;
            }
            // A card-sized light, not a dot, that appears OVER the scientist's head
            // and holds there for a beat before it goes: the second verification
            // pass found the 0.09 flight to the opponent's hand — off the top of the
            // table view — a faint line that was gone before it read, and a mote
            // leaving the figure's chest starts inside the body, which hides it.
            stage.setEffect(key, {
              kind: 'mote',
              at: figureAt(id, 1.2),
              to: { kind: 'zone', player, zone: 'hand' },
              colour: '#eef8ff',
              strength: 0.85 + 0.15 * pulse(travel),
              radius: 0.16,
              travel: easeInOutCubic(clamp01((travel - 0.3) / 0.7)),
              arc: 1.1,
            });
          }
        }
        if (!ctx.reducedMotion) {
          stage.setEffect(`${ctx.key}:motes`, {
            kind: 'particles',
            at: figureAt(id, 0.5),
            colour: tone,
            strength: 0.7 * (1 - t),
            radius: 0.5,
            burst: t,
          });
        }
      },
    }),
  ],

  /**
   * **`fx.agents`** — *Nick Fury, Spymaster*.
   *
   * §12.2: the radio-call gesture is a pose and therefore Tier 2; what Tier 1
   * has is the *arrival*, beside him. Two glows one card-width either side (the
   * `beside` anchor, which is the only coordinate-free way to say "next to"),
   * a sweep of particles, and Fury himself lifting on the call.
   *
   * The **agents themselves** are tokens, and each one enters the battlefield
   * with its own `zone`→battlefield event and its own `zone.enters`. This cue
   * does not create them, name them or know how many there are — it could not,
   * and a renderer that guessed would be a renderer doing rules.
   */
  [
    'fx.agents',
    cue({
      effects: ['left', 'right', 'call', 'beamL', 'beamR', 'wave'],
      apply(ctx, t, stage) {
        const id = ctx.targets[0];
        if (id === undefined) return;
        const tone = colour(ctx, GOLD);
        // On an `attackers` event he leads the charge as well as calling it in:
        // the ladder gives one cue per event, so a cue that replaced the lunge
        // would be a cue file quietly turning combat off (see `lunge` above).
        const move = flag(ctx, 'lunge') ? lunge(ctx, t, stage, id) : null;
        stage.setOffset(id, {
          dx: move?.dx ?? 0,
          dy: (move?.dy ?? 0) + 0.1 * pulse(t),
          dz: move?.dz ?? 0,
          dRotX: move?.dRotX ?? 0,
          dRotY: move?.dRotY ?? 0,
          glow: 0.6 * pulse(t),
          glowColour: tone,
        });
        const spread = num(ctx, 'spread', 1);
        const rise = easeOutCubic(t);
        for (const [suffix, side] of [
          ['left', -spread],
          ['right', spread],
        ] as const) {
          stage.setEffect(`${ctx.key}:${suffix}`, {
            kind: 'glow',
            at: { kind: 'beside', id, dx: side },
            colour: tone,
            strength: pulse(t),
            radius: 0.3 + rise * 0.5,
          });
        }
        /**
         * **T11 — the call goes OUT from him** (`params.beams`): the radio call is
         * his figure's own gesture (`params.clip: "radioCall"`, an alias of the
         * rig's `interact-left`), a broadcast ring at his feet, and a beam from him
         * to each place an agent materialises. The beams go to the `beside`
         * anchors, not to any token: which card made a token is not on the wire,
         * and each token still enters with its own `zone` event and its own cue.
         */
        if (flag(ctx, 'beams') && t > 0.12 && t < 0.8) {
          const u = clamp01((t - 0.12) / 0.68);
          stage.setEffect(`${ctx.key}:beamL`, {
            kind: 'beam',
            at: figureAt(id, 0.7),
            to: { kind: 'beside', id, dx: -spread },
            colour: tone,
            strength: 0.8 * pulse(u),
            radius: 0.02,
          });
          stage.setEffect(`${ctx.key}:beamR`, {
            kind: 'beam',
            at: figureAt(id, 0.7),
            to: { kind: 'beside', id, dx: spread },
            colour: tone,
            strength: 0.8 * pulse(u),
            radius: 0.02,
          });
        } else {
          stage.clearEffect(`${ctx.key}:beamL`);
          stage.clearEffect(`${ctx.key}:beamR`);
        }
        if (flag(ctx, 'beams')) {
          const w = (t * 2.2) % 1;
          stage.setEffect(`${ctx.key}:wave`, {
            kind: 'ring',
            at: figureAt(id, 0),
            colour: tone,
            strength: 0.7 * (1 - w) * (1 - clamp01((t - 0.8) / 0.2)),
            radius: 0.2 + 0.9 * w,
          });
        }
        // With the beams on, the broadcast ring is the call and the particles
        // give way (§9.3's eight-object cap).
        if (!ctx.reducedMotion && !flag(ctx, 'beams')) {
          stage.setEffect(`${ctx.key}:call`, {
            kind: 'particles',
            at: { kind: 'card', id },
            colour: tone,
            strength: 1 - t,
            radius: 0.8,
            burst: t,
          });
        }
      },
    }),
  ],

  /**
   * **`fx.swarm`** — *Ant-Man's Air Force*, `cast` / `resolved`.
   *
   * §12.2's one unqualified "Tier 1, fully" for a swarm: a `Points` system
   * sweeping the table. Two bursts, one at the card and one across the middle,
   * plus the card riding up on them.
   */
  [
    'fx.swarm',
    cue({
      lane: 'particle',
      effects: ['swarm', 'sweep', 'core'],
      apply(ctx, t, stage) {
        const id = ctx.targets[0];
        if (id !== undefined) {
          stage.setOffset(id, {
            dy: 0.3 * pulse(t),
            dRotZ: 0.12 * Math.sin(t * Math.PI * 6),
            glow: 0.5 * pulse(t),
            glowColour: colour(ctx),
          });
        }
        if (ctx.reducedMotion) return;
        if (id !== undefined) {
          stage.setEffect(`${ctx.key}:swarm`, {
            kind: 'particles',
            at: figureAt(id, 0.5),
            colour: colour(ctx, '#9ec7f0'),
            strength: 1 - t,
            radius: num(ctx, 'radius', 1.2),
            burst: t,
          });
        }
        /**
         * **T11 — the swarm SWEEPS** (`params.sweep`): one travelling cloud that
         * leaves the card and crosses the table — to what the trigger was aimed
         * at when the wire says (`beamTargetOf`: this frame's stack target on a
         * cast, the previous frame's on a resolution), and otherwise across to the
         * other seat's creature rank (`foe`, a direction and not a claim). Tier 1's
         * sweep was a burst parked in the middle of the table.
         */
        const aimed = beamTargetOf(ctx);
        const foe = num(ctx, 'foe', -1);
        const to: AnchorRef | null = !flag(ctx, 'sweep')
          ? null
          : aimed >= 0
            ? figureAt(aimed, 0.5)
            : foe >= 0
              ? { kind: 'zone', player: foe, zone: 'battlefield' }
              : null;
        if (to !== null && id !== undefined) {
          const travel = easeInOutCubic(clamp01((t - 0.1) / 0.75));
          stage.setEffect(`${ctx.key}:sweep`, {
            kind: 'particles',
            at: figureAt(id, 0.5),
            to,
            colour: colour(ctx, '#9ec7f0'),
            strength: pulse(clamp01(t * 1.1)),
            radius: 0.8,
            burst: 0.35 + 0.25 * Math.sin(t * Math.PI * 5),
            travel,
            arc: 0.7,
          });
          // …and a bright core riding the same arc (the second verification pass:
          // at `g2`@219 the cloud alone was a faint dust nobody saw cross the
          // table). A mote, so it costs the mote bucket, not the eight-slot cap.
          stage.setEffect(`${ctx.key}:core`, {
            kind: 'mote',
            at: figureAt(id, 0.5),
            to,
            colour: '#e4f2ff',
            strength: pulse(clamp01(t * 1.1)),
            radius: 0.2,
            travel,
            arc: 0.7,
          });
          return;
        }
        stage.clearEffect(`${ctx.key}:core`);
        stage.setEffect(`${ctx.key}:sweep`, {
          kind: 'particles',
          at: { kind: 'table' },
          colour: colour(ctx, '#9ec7f0'),
          strength: 0.8 * pulse(t),
          radius: 2.4,
          burst: clamp01(t * 1.3),
        });
      },
    }),
  ],

  /**
   * **`fx.circuit`** — *Robotics Mastery* (`on`) and *Depower* (`off`).
   *
   * §12.2 wants a hand-made generic circuit mask animated as an additive
   * overlay. Tier 1 without that asset is the same *behaviour* with the kit's
   * own primitives: traces of light running out from the target (`off: false`),
   * or the lights flickering and going out (`off: true`). The flicker is a
   * deterministic function of `t`, not a random, so two frames of the same
   * instant agree and a skipped cue still ends dark-then-identity.
   */
  [
    'fx.circuit',
    cue({
      effects: ['trace', 'trace2'],
      alsoClears: AIMED,
      apply(ctx, t, stage) {
        const off = flag(ctx, 'off');
        const source = ctx.targets[0];
        if (source !== undefined) {
          stage.setOffset(source, { dy: 0.22 * pulse(t), glow: 0.55 * pulse(t), glowColour: colour(ctx) });
        }
        const target = beamTargetOf(ctx);
        const hit = target >= 0 ? target : (source ?? -1);
        if (target < 0 && source === undefined) return;
        const flicker = off ? Math.max(0, Math.sin(t * Math.PI * 7)) * (1 - t) : 1;
        const e = easeOutCubic(t);
        stage.setEffect(`${ctx.key}:trace`, {
          kind: 'ring',
          at: figureAt(hit, 0),
          colour: colour(ctx, off ? GREY : '#7fd4ff'),
          strength: (off ? flicker : 1 - e) * 0.95,
          radius: off ? 0.8 - 0.5 * e : 0.25 + e * 0.9,
        });
        // **T11 — the traces are ON the body**: a circuit-board billboard over the
        // figure, sized in its heights, lighting up (Robotics Mastery) or
        // flickering out (Depower, `off`). The same shape the Aura keeps as a pose
        // on its host once it is attached (T12, `scene/overlays.ts`).
        stage.setEffect(`${ctx.key}:trace2`, {
          kind: 'glow',
          at: figureAt(hit, 0.5),
          colour: colour(ctx, off ? GREY : '#7fd4ff'),
          strength: off ? flicker * 0.9 : 0.9 * pulse(t),
          radius: 1.05,
          shape: 'circuit',
          aspect: 0.7,
          fit: true,
        });
        if (target >= 0) {
          stage.setOffset(target, {
            tint: off ? GREY : null,
            opacity: off ? 1 - 0.35 * pulse(t) : 1,
            glow: off ? 0 : 0.7 * pulse(t),
            glowColour: off ? null : colour(ctx, '#7fd4ff'),
            scale: 1 + (off ? -0.05 : 0.05) * pulse(t),
          });
        }
      },
    }),
  ],

  /**
   * **`fx.terrain`** — the *Thriving* lands, `zone:*>battlefield`.
   *
   * §6's `land.rise` with the terrain half turned up: the tile comes up out of
   * the table and the ground ripples out twice, which is what makes a dual land
   * read as a piece of *place* rather than a card being put down.
   */
  [
    'fx.terrain',
    cue({
      effects: ['near', 'far'],
      apply(ctx, t, stage) {
        const rise = easeOutBack(t, 1.2);
        for (const id of ctx.targets) {
          stage.setOffset(id, {
            dy: -num(ctx, 'depth', 0.55) * (1 - clamp01(rise)),
            scale: 0.9 + 0.1 * clamp01(rise),
            glow: 0.4 * pulse(t),
            glowColour: colour(ctx),
          });
        }
        const first = ctx.targets[0];
        if (first === undefined) return;
        const at: AnchorRef = { kind: 'card', id: first };
        const e = easeOutCubic(t);
        stage.setEffect(`${ctx.key}:near`, {
          kind: 'ring',
          at,
          colour: colour(ctx),
          strength: 1 - e,
          radius: 0.3 + e * num(ctx, 'radius', 1.5),
        });
        if (t > 0.35) {
          const u = easeOutCubic(clamp01((t - 0.35) / 0.65));
          stage.setEffect(`${ctx.key}:far`, {
            kind: 'ring',
            at,
            colour: colour(ctx),
            strength: (1 - u) * 0.55,
            radius: 0.3 + u * num(ctx, 'radius', 1.5) * 1.6,
          });
        }
      },
    }),
  ],

];

// ---------------------------------------------------------------------------
// The two shapes that are used twice
// ---------------------------------------------------------------------------

/** §6's `damage.hit` / `damage.lethal`: one function, two intensities. */
function damageCue(intensity: number): CueImpl {
  return cue({
    effects: ['num', 'rim', 'pop'],
    apply(ctx, t, stage) {
      const id = ctx.targets[0];
      if (id === undefined) return;
      const source = num(ctx, 'sourceId', -1);
      const wave = pulse(t);
      let jolt: Vec3 = [0, 0, 0];
      if (source >= 0 && source !== id) {
        const d = stage.deltaTo(id, { kind: 'card', id: source });
        const len = lengthOf(d);
        if (len > 1e-4) {
          const k = (-0.13 * intensity * wave) / len;
          jolt = [d[0] * k, 0, d[2] * k];
        }
      }
      stage.setOffset(id, {
        dx: jolt[0],
        dy: jolt[1] + 0.02 * wave,
        dz: jolt[2],
        glow: wave * intensity,
        glowColour: RED,
        tint: intensity > 1 ? GREY : null,
        // `popScale` is E5's one addition to §6's damage shot, and it exists for
        // Ant-Man: "pops back to size on damage" is a scale *overshoot* on the
        // hit, not a separate cue — writing it as one would have cost him the
        // damage number, which is the part that carries information.
        scale: (1 - 0.04 * wave * intensity) * (1 + (num(ctx, 'popScale', 1) - 1) * wave),
      });
      // **T11 — "pops back to size on damage"**, made visible: a card whose data
      // gives it a `popScale` over 1 (Ant-Man) throws a ring out from its figure's
      // feet as it overshoots, so the pop reads as a pop and not as a flinch.
      if (num(ctx, 'popScale', 1) > 1) {
        const u = easeOutCubic(t);
        stage.setEffect(`${ctx.key}:pop`, {
          kind: 'ring',
          at: figureAt(id, 0),
          colour: colour(ctx, WHITE),
          strength: 0.9 * (1 - u),
          radius: 0.25 + 0.75 * u,
          fit: true,
        });
      }
      stage.setEffect(`${ctx.key}:num`, {
        kind: 'text',
        at: { kind: 'card', id },
        colour: RED,
        strength: 1 - easeInOutCubic(clamp01((t - 0.3) / 0.7)),
        radius: 0.34,
        text: `-${String(Math.abs(num(ctx, 'amount', 0)))}`,
        rise: 0.4 * easeOutCubic(t),
      });
      if (intensity > 1 && !ctx.reducedMotion) {
        stage.requestCamera({
          frame: [{ kind: 'card', id }],
          padding: 0.3,
          tilt: 0,
          shake: 0.35,
          priority: 2,
          ms: ctx.ms,
        });
      }
    },
  });
}

/** §6's `life.tick` / `poison.tick`: a counting number over a coloured plate. */
function tickCue(colourFor: (delta: number) => string, pip: string): CueImpl {
  return cue({
    lane: 'hud',
    effects: ['plate', 'num'],
    apply(ctx, t, stage) {
      const player = ctx.players[0];
      if (player === undefined) return;
      const from = num(ctx, 'from', 0);
      const to = num(ctx, 'to', from + num(ctx, 'amount', 0));
      const delta = to - from;
      const at: AnchorRef = { kind: 'player', id: player };
      const shown = Math.round(from + delta * easeOutCubic(t));
      const tone = colourFor(delta);
      stage.setEffect(`${ctx.key}:plate`, {
        kind: 'plate',
        at,
        colour: tone,
        strength: 0.6 * pulse(t),
        radius: 0.85,
      });
      stage.setEffect(`${ctx.key}:num`, {
        kind: 'text',
        at,
        colour: tone,
        strength: 1 - easeInOutCubic(clamp01((t - 0.5) / 0.5)),
        radius: 0.46,
        text: `${pip}${String(shown)}`,
        rise: 0.28 * easeOutCubic(t),
      });
    },
  });
}

/** §6's `counters.pop` / `counters.drop`. */
function counterCue(removal: boolean): CueImpl {
  return cue({
    effects: ['pip'],
    apply(ctx, t, stage) {
      const id = ctx.targets[0];
      if (id === undefined) return;
      const wave = pulse(t);
      stage.setOffset(id, {
        scale: 1 + (removal ? -0.05 : 0.06) * wave,
        glow: 0.4 * wave,
        glowColour: removal ? GREY : colour(ctx, GREEN),
      });
      const delta = num(ctx, 'delta', removal ? -1 : 1);
      stage.setEffect(`${ctx.key}:pip`, {
        kind: 'text',
        at: { kind: 'card', id },
        colour: removal ? GREY : colour(ctx, GREEN),
        strength: 1 - easeInOutCubic(clamp01((t - 0.4) / 0.6)),
        radius: 0.26,
        text: counterLabel(str(ctx, 'counter', ''), delta),
        rise: 0.22 * easeOutCubic(t),
      });
    },
  });
}

/**
 * A `CounterType` name as a pip. `P1P1` is `+1/+1` and `M1M1` is `-1/-1`; every
 * other counter type prints its own name, which is an **enum name** (§3.6 puts
 * every enum on the wire as `.name()`), not free text and not a card name.
 */
export function counterLabel(counter: string, delta: number): string {
  const sign = delta >= 0 ? '+' : '−';
  const count = Math.abs(delta);
  const many = count > 1 ? `${String(count)}× ` : '';
  // The wire spells this `+1/+1`, not `P1P1` — see `counterToken` in
  // `resolve.ts` for the measurement. Without the normalisation this printed
  // `++1/+1`, which is the sort of thing that survives a green suite forever.
  const token = counterToken(counter);
  if (token === 'P1P1') return `${many}${sign}1/+1`;
  if (token === 'M1M1') return `${many}${sign}1/−1`;
  return `${many}${sign}${counter}`;
}

/**
 * **The registry.** Every id `defaults.ts` names is in it — `cues-exhaustive.test.ts`
 * asserts exactly that for all 25 protocol kinds plus the unknown-kind case —
 * and `validate.ts` rejects a cue file that names one that is not.
 */
export const REGISTRY: CueRegistry = new Map<string, CueImpl>(ENTRIES);

export const CUE_IDS: readonly string[] = [...REGISTRY.keys()].sort();
