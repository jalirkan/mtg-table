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

import { TAP_ANGLE } from '../layout.ts';
import {
  clamp01,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  outHoldBack,
  pulse,
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
 * Build a {@link CueImpl} whose `end` is total by construction: it clears every
 * target's offset and every declared effect key, whether the cue set them or
 * not. A cue cannot leak an offset by forgetting one branch.
 */
function cue(def: CueDef): CueImpl {
  const effects = def.effects ?? [];
  const alsoClears = def.alsoClears ?? [];
  return {
    lane: def.lane ?? 'card',
    apply: def.apply,
    end(ctx, stage) {
      for (const id of ctx.targets) stage.clearOffset(id);
      for (const key of alsoClears) {
        const id = num(ctx, key, -1);
        if (id >= 0) stage.clearOffset(id);
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
  return beam >= 0 ? beam : num(ctx, 'toId', -1);
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
): { dx: number; dy: number; dz: number; dRotX: number; k: number } {
  const player = ctx.players[0] ?? 0;
  const k = outHoldBack(t, 0.3, 0.7);
  const d = decay(stage, id, { kind: 'combat', player }, k * 0.9);
  return { dx: d[0], dy: d[1] + 0.06 * k, dz: d[2], dRotX: 0.21 * k * (d[2] <= 0 ? 1 : -1), k };
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
      effects: ['glow', 'beam'],
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
      },
    }),
  ],

  /** **resolved.pop** (320 ms) — the stack item flashes and pops. */
  [
    'resolved.pop',
    perTarget([], (ctx, t) => ({
      scale: 1 + 0.14 * pulse(t),
      glow: pulse(t),
      glowColour: colour(ctx, WHITE),
    })),
  ],

  /** **resolved.fizzle** (320 ms) — it greys and shrinks instead. */
  [
    'resolved.fizzle',
    perTarget([], (_ctx, t) => ({
      scale: 1 - 0.16 * pulse(t),
      tint: GREY,
      opacity: 1 - 0.35 * pulse(t),
    })),
  ],

  /** **unstacked.shatter** (380 ms) — a quick squash and fade, no flash. */
  [
    'unstacked.shatter',
    perTarget([], (_ctx, t) => ({
      squashX: 1 - 0.55 * pulse(t),
      squashY: 1 + 0.12 * pulse(t),
      opacity: 1 - 0.45 * pulse(t),
    })),
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
      effects: ['spot'],
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
          scale: 1 + 0.04 * k,
        });
        if (num(ctx, 'spotlight', 0) > 0) {
          stage.setEffect(`${ctx.key}:spot`, {
            kind: 'glow',
            at: { kind: 'card', id },
            colour: colour(ctx, GOLD),
            strength: 0.8 * k,
            radius: 1.3,
          });
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

  /** **attach.snap** (500 ms) — the Equipment flies to the host and snaps on. */
  [
    'attach.snap',
    cue({
      effects: ['ring'],
      apply(ctx, t, stage) {
        const id = ctx.targets[0];
        if (id === undefined) return;
        const k = 1 - easeOutBack(t, 1.4);
        const d = decay(stage, id, { kind: 'zone', player: null, zone: 'battlefield' }, k);
        stage.setOffset(id, { dx: d[0], dy: d[1] + 0.18 * Math.max(0, k), dz: d[2] });
        const host = num(ctx, 'toId', -1);
        if (host >= 0 && t > 0.55) {
          const u = clamp01((t - 0.55) / 0.45);
          stage.setEffect(`${ctx.key}:ring`, {
            kind: 'ring',
            at: { kind: 'card', id: host },
            colour: colour(ctx, GOLD),
            strength: 1 - u,
            radius: 0.2 + u * 0.45,
          });
        }
      },
    }),
  ],

  /** **attach.release** (420 ms) — `to: null` *is* the unattach event (§3.6). */
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

  /** `fx.shockwave` — a bigger ring and a bounded shake. Quake's cue. */
  [
    'fx.shockwave',
    cue({
      effects: ['ring', 'ring2'],
      apply(ctx, t, stage) {
        const id = ctx.targets[0];
        if (id === undefined) return;
        const at: AnchorRef = { kind: 'card', id };
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
        if (!ctx.reducedMotion && num(ctx, 'shake', 0) > 0) {
          stage.requestCamera({
            frame: [at],
            padding: 0.25,
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
    perTarget([], (ctx, t, stage, id) => {
      const move = lunge(ctx, t, stage, id);
      const to = num(ctx, 'scale', 0.2);
      return {
        dx: move.dx,
        dy: move.dy,
        dz: move.dz,
        dRotX: move.dRotX,
        scale: 1 + (to - 1) * outHoldBack(t, 0.25, 0.72),
        glow: 0.35 * pulse(t),
        glowColour: colour(ctx),
      };
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
      effects: ['halo', 'rim'],
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
          scale: 1 + 0.05 * move.k,
          glow: 0.8 * hold,
          glowColour: colour(ctx, GOLD),
        });
        stage.setEffect(`${ctx.key}:halo`, {
          kind: 'glow',
          at: { kind: 'card', id },
          colour: colour(ctx, GOLD),
          strength: hold,
          radius: 1.25 + 0.15 * hold,
        });
        stage.setEffect(`${ctx.key}:rim`, {
          kind: 'ring',
          at: { kind: 'card', id },
          colour: colour(ctx, GOLD),
          strength: 0.85 * hold,
          radius: 0.62 + 0.08 * Math.sin(t * Math.PI * 3),
        });
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
      effects: ['exhaust', 'eye'],
      apply(ctx, t, stage) {
        const id = ctx.targets[0];
        if (id === undefined) return;
        const move = lunge(ctx, t, stage, id);
        stage.setOffset(id, {
          dx: move.dx,
          dy: move.dy + 0.1 * move.k,
          dz: move.dz,
          dRotX: move.dRotX,
          scale: 1 + 0.03 * move.k,
        });
        stage.setEffect(`${ctx.key}:eye`, {
          kind: 'glow',
          at: { kind: 'card', id },
          colour: colour(ctx, RED),
          strength: 0.5 + 0.5 * Math.abs(Math.sin(t * Math.PI * 4)),
          radius: 0.3,
        });
        if (!ctx.reducedMotion && t < 0.8) {
          stage.setEffect(`${ctx.key}:exhaust`, {
            kind: 'particles',
            at: { kind: 'card', id },
            colour: colour(ctx, '#9ec7f0'),
            strength: 1 - t,
            radius: 0.45,
            burst: t,
          });
        }
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
      effects: ['reticle', 'beam', 'impact'],
      alsoClears: ['beamTo'],
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
        const at: AnchorRef = { kind: 'card', id: target };
        if (t < 0.55) {
          const u = clamp01(t / 0.55);
          stage.setEffect(`${ctx.key}:reticle`, {
            kind: 'ring',
            at,
            colour: colour(ctx, '#f6f0d8'),
            strength: 0.35 + 0.65 * u,
            // A reticle CLOSES: the radius runs down, which is the one ring in
            // the kit that does.
            radius: 1.6 - 1.05 * easeOutCubic(u),
            spin: u * 3.2,
          });
        } else {
          const u = clamp01((t - 0.55) / 0.45);
          stage.setEffect(`${ctx.key}:beam`, {
            kind: 'beam',
            at: { kind: 'above', id: target, height: num(ctx, 'height', 4) },
            to: at,
            colour: colour(ctx, '#f6f0d8'),
            strength: pulse(u),
            radius: 0.05 + 0.05 * (1 - u),
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
        }
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
      effects: ['strand', 'wrap'],
      alsoClears: ['beamTo'],
      apply(ctx, t, stage) {
        const source = ctx.targets[0];
        const target = beamTargetOf(ctx);
        if (source !== undefined) {
          stage.setOffset(source, { dy: 0.25 * pulse(t), glow: 0.5 * pulse(t), glowColour: colour(ctx, WHITE) });
          if (target >= 0) {
            stage.setEffect(`${ctx.key}:strand`, {
              kind: 'beam',
              at: { kind: 'card', id: source },
              to: { kind: 'card', id: target },
              colour: colour(ctx, WHITE),
              strength: pulse(clamp01(t * 1.6)),
              radius: 0.018,
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
        stage.setEffect(`${ctx.key}:wrap`, {
          kind: 'glow',
          at: { kind: 'card', id: target },
          colour: colour(ctx, WHITE),
          strength: 0.7 * hold,
          radius: 0.7,
        });
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
      effects: ['beam', 'flare'],
      alsoClears: ['beamTo'],
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
        if (source !== undefined && t > 0.15) {
          stage.setEffect(`${ctx.key}:beam`, {
            kind: 'beam',
            at: { kind: 'card', id: source },
            to: { kind: 'card', id: target },
            colour: colour(ctx),
            strength: pulse(clamp01((t - 0.15) / 0.85)),
            radius: num(ctx, 'width', 0.03),
          });
        }
        const to = num(ctx, 'targetScale', 0.55);
        const hold = outHoldBack(t, 0.35, 0.75);
        stage.setOffset(target, {
          scale: 1 + (to - 1) * hold,
          glow: 0.6 * hold,
          glowColour: colour(ctx),
        });
        stage.setEffect(`${ctx.key}:flare`, {
          kind: 'glow',
          at: { kind: 'card', id: target },
          colour: colour(ctx),
          strength: 0.8 * pulse(t),
          radius: 0.65,
        });
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
      alsoClears: ['beamTo'],
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
        stage.setEffect(`${ctx.key}:point`, {
          kind: 'glow',
          at: { kind: 'card', id: target },
          colour: WHITE,
          strength: wave * wave,
          radius: 0.12 + 0.9 * (1 - wave),
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
        const at: AnchorRef = { kind: 'card', id: first };
        stage.setEffect(`${ctx.key}:badge`, {
          kind: 'glow',
          at,
          colour: colour(ctx, GOLD),
          strength: pulse(t),
          radius: 0.55,
        });
        stage.setEffect(`${ctx.key}:flash`, {
          kind: 'ring',
          at,
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
      effects: ['grid', 'grid2', 'motes'],
      apply(ctx, t, stage) {
        const id = ctx.targets[0];
        if (id === undefined) return;
        const tone = colour(ctx, '#7fd4ff');
        const at: AnchorRef = { kind: 'card', id };
        stage.setOffset(id, {
          dy: 0.08 * pulse(t),
          glow: 0.75 * pulse(t),
          glowColour: tone,
          tint: '#dceefc',
        });
        const e = easeOutCubic(t);
        stage.setEffect(`${ctx.key}:grid`, {
          kind: 'ring',
          at,
          colour: tone,
          strength: (1 - e) * 0.9,
          radius: 0.25 + e * 1.1,
        });
        if (t > 0.3) {
          const u = easeOutCubic(clamp01((t - 0.3) / 0.7));
          stage.setEffect(`${ctx.key}:grid2`, {
            kind: 'ring',
            at,
            colour: tone,
            strength: (1 - u) * 0.6,
            radius: 0.25 + u * 0.7,
          });
        }
        if (!ctx.reducedMotion) {
          stage.setEffect(`${ctx.key}:motes`, {
            kind: 'particles',
            at,
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
      effects: ['left', 'right', 'call'],
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
        if (!ctx.reducedMotion) {
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
      effects: ['swarm', 'sweep'],
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
            at: { kind: 'card', id },
            colour: colour(ctx, '#9ec7f0'),
            strength: 1 - t,
            radius: num(ctx, 'radius', 1.2),
            burst: t,
          });
        }
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
      alsoClears: ['beamTo'],
      apply(ctx, t, stage) {
        const off = flag(ctx, 'off');
        const source = ctx.targets[0];
        if (source !== undefined) {
          stage.setOffset(source, { dy: 0.22 * pulse(t), glow: 0.55 * pulse(t), glowColour: colour(ctx) });
        }
        const target = beamTargetOf(ctx);
        const at: AnchorRef = target >= 0 ? { kind: 'card', id: target } : { kind: 'card', id: source ?? -1 };
        if (target < 0 && source === undefined) return;
        const flicker = off ? Math.max(0, Math.sin(t * Math.PI * 7)) * (1 - t) : 1;
        const e = easeOutCubic(t);
        stage.setEffect(`${ctx.key}:trace`, {
          kind: 'ring',
          at,
          colour: colour(ctx, off ? GREY : '#7fd4ff'),
          strength: (off ? flicker : 1 - e) * 0.95,
          radius: off ? 0.8 - 0.5 * e : 0.25 + e * 0.9,
        });
        stage.setEffect(`${ctx.key}:trace2`, {
          kind: 'glow',
          at,
          colour: colour(ctx, off ? GREY : '#7fd4ff'),
          strength: off ? flicker * 0.8 : 0.8 * pulse(t),
          radius: 0.55,
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
    effects: ['num', 'rim'],
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
