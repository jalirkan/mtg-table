/*
 * mtg-table — arena/cues/defaults.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The default cue table — report 09 §6, and the bottom rung of §7.3's
 * ladder.** Pure data: no three, no React, no clock.
 *
 * Two tables, because a selector is not a kind:
 *
 *   - {@link DEFAULT_CUES} is `Record<EventKind, CueSpec>` and is **exhaustive
 *     by type**. That is §10.1's compile-time half: `EVENT_KINDS` in
 *     `protocol.ts` is one `const` that is both the runtime list and the TS
 *     union, so adding a kind to the protocol and forgetting it here does not
 *     compile. The four kinds amendment P4 added — `scry`, `surveil`, `phased`,
 *     `foretold` — are not in §6's table at all, and this is exactly how we
 *     found that out.
 *   - {@link DEFAULT_SELECTOR_CUES} holds the **sub-selectors**: the same event
 *     kind animating differently depending on its body. `zone` alone is four
 *     different films — a card entering the battlefield, a creature dying, a
 *     spell being exiled, a card being drawn — and §6 spells all four out.
 *
 * Durations are nominal, i.e. what a *replay* plays at. A live game compresses
 * them (§5.3): 1200 ms of budget while the engine is thinking, **250 ms while
 * it is waiting on the human**. Nothing here has to know that.
 */

import type { CueSpec, CueTable, EventKind } from './types.ts';

/**
 * §6, one row per protocol kind. Every `cue` must exist in `registry.ts` —
 * `cues-exhaustive.test.ts` asserts it for all 25 kinds plus the unknown-kind
 * case, and `validate.ts` asserts it for anything a cue file adds.
 */
export const DEFAULT_CUES: Readonly<Record<EventKind, CueSpec>> = Object.freeze({
  // The film — six kinds carry the cinematic (PLAN, "What M6 hands to M7").
  cast: { cue: 'cast.rise', ms: 700 },
  zone: { cue: 'zone.slide', ms: 300 },
  attackers: { cue: 'attack.lunge', ms: 850 },
  blockers: { cue: 'block.interpose', ms: 600 },
  damage: { cue: 'damage.hit', ms: 500 },
  life: { cue: 'life.tick', ms: 400 },

  // The rest of §6's table.
  resolved: { cue: 'resolved.pop', ms: 480 },
  unstacked: { cue: 'unstacked.shatter', ms: 380 },
  poison: { cue: 'poison.tick', ms: 400 },
  tap: { cue: 'tap.rotate', ms: 180 },
  counters: { cue: 'counters.pop', ms: 420 },
  attach: { cue: 'attach.snap', ms: 500 },
  sacrificed: { cue: 'sacrifice.crush', ms: 520 },
  land: { cue: 'land.rise', ms: 550 },
  stats: { cue: 'stats.flash', ms: 260 },
  turn: { cue: 'turn.banner', ms: 700 },
  /**
   * **Zero duration and never queued.** §3.6 warns that `GameEventTurnPhase`
   * fires on every step — 4,049 of them across the committed corpus, the second
   * commonest kind in the stream — so a queued phase cue would dominate the
   * queue and nothing else would ever play. The planner drops it before it
   * reaches the timeline; it resolves to a real cue id anyway so the coverage
   * table reads `phase → phase.strip` rather than `phase → noop`.
   */
  phase: { cue: 'phase.strip', ms: 0 },
  combat_end: { cue: 'combat.return', ms: 450 },
  shuffle: { cue: 'shuffle.riffle', ms: 500 },
  mulligan: { cue: 'mulligan.sweep', ms: 600 },
  /**
   * §6: **uncompressible.** The game is over, so by definition nothing is
   * waiting on the human and the live budget has nothing to protect.
   */
  outcome: { cue: 'outcome.finish', ms: 1600 },

  // Amendment P4's four. §6 predates them; they carry counts and ids only and
  // each is one small, honest gesture at the zone it is about.
  scry: { cue: 'library.peek', ms: 420 },
  surveil: { cue: 'library.peek', ms: 420 },
  phased: { cue: 'phased.fade', ms: 420 },
  foretold: { cue: 'foretell.glimmer', ms: 480 },
});

/**
 * The sub-selectors (§6, §7.3). Keys are `kind:qualifier`; the ladder tries
 * them most-specific-first and falls through to {@link DEFAULT_CUES}.
 *
 * The qualifier grammar is deliberately tiny (§7.3): a zone transition
 * (`hand>battlefield`, `*>graveyard`), `alone`, `lethal`, a counter name with an
 * optional `+`/`-`, or `*`.
 */
export const DEFAULT_SELECTOR_CUES: CueTable = Object.freeze({
  // -- zone, which is four different films -------------------------------
  'zone:*>battlefield': { cue: 'zone.enters', ms: 450 },
  'zone:battlefield>graveyard': { cue: 'zone.dissolve', ms: 650 },
  'zone:*>graveyard': { cue: 'zone.dissolve', ms: 560 },
  'zone:*>exile': { cue: 'zone.exile', ms: 600 },
  'zone:library>hand': { cue: 'zone.draw', ms: 380 },
  /**
   * §6 folds this into `cast` — the planner suppresses it when a `cast` for the
   * same card is in the same batch, because otherwise the card animates twice.
   * It keeps a cue of its own for the case where there is no `cast` event: a
   * copy put on the stack, or a trigger whose source moved.
   */
  'zone:*>stack': { cue: 'zone.toStack', ms: 220 },
  'zone:*>hand': { cue: 'zone.slide', ms: 300 },
  'zone:*>library': { cue: 'zone.slide', ms: 300 },

  // -- damage: a player and a creature are different shots ----------------
  'damage:player': { cue: 'damage.player', ms: 550 },
  'damage:lethal': { cue: 'damage.lethal', ms: 620 },

  // -- the rest ----------------------------------------------------------
  'resolved:fizzled': { cue: 'resolved.fizzle', ms: 460 },
  'attackers:alone': { cue: 'attack.lunge', ms: 850, params: { spotlight: 1 } },
  'stats:transform': { cue: 'stats.flip', ms: 400 },
  'counters:-': { cue: 'counters.drop', ms: 380 },
  'attach:off': { cue: 'attach.release', ms: 420 },
});

/** Every cue id the two tables above name — `validate.ts`'s cross-check. */
export function defaultCueIds(): string[] {
  const ids = new Set<string>();
  for (const spec of Object.values(DEFAULT_CUES)) ids.add(spec.cue);
  for (const spec of Object.values(DEFAULT_SELECTOR_CUES)) ids.add(spec.cue);
  return [...ids].sort();
}
