/*
 * mtg-table — render/wedge.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * docs/protocol.md §4.2's wedged-game-thread diagnostic, as a pure predicate.
 *
 * It lives in its own file for one reason: it is a *rule*, and a rule that has
 * already been wrong once needs a test. `Board.tsx` is JSX and cannot be
 * imported by `node --test` (type stripping does not transform JSX), so the
 * condition would otherwise be assertable only by mounting the component, which
 * this repo's vitest setup deliberately cannot do (no DOM).
 *
 * ---------------------------------------------------------------------------
 * §4.2 as shipped in M3 said: **OK disabled, `selectable` empty, no outstanding
 * ask, game not over** is the signature of a wedged game thread, render it
 * loudly. Those four clauses are also the ordinary state of *not holding
 * priority*, and the banner duly fired twice inside the first two turns of the
 * first real browser game — at turn 1 upkeep under Forge's own `Waiting for
 * Forge AI…` prompt, and under `Yielding until end of turn`.
 *
 * The rule needs two qualifiers, and neither weakens a real wedge:
 *
 *   1. **this seat holds priority** (`state.board.priority === hello.you`). A
 *      wedge is a thread that stopped while it was *your* decision; a seat
 *      without priority has nothing to do because it is not its turn to do
 *      anything;
 *   2. **and the stream has gone quiet** — a wedge persists by definition, an
 *      engine push in flight does not. That half is a wall-clock timer and lives
 *      in the component (`WedgeBanner`), because a pure reducer has no clock.
 *
 * This function is qualifier 1 plus the original four clauses. Amendment M21.
 * ---------------------------------------------------------------------------
 */

import type { ClientState } from '../reduce.ts';

/**
 * How long the s2c stream must be silent before the banner may appear.
 *
 * Long enough that a normal round trip never reaches it (the browser session in
 * `docs/evidence/m3-web.md` measured 7 frames within 5 ms of a card click),
 * short enough to name a real wedge while the user is still looking at it.
 */
export const WEDGE_QUIET_MS = 2500;

/** The seat this stream was redacted for, from whichever source knows it (§2.1, §8.1). */
export function viewerSeat(state: ClientState): number | null {
  return state.hello?.you ?? state.session?.seat ?? null;
}

/**
 * §4.2 + amendment M21: everything about a wedge that a *frame* can tell you.
 *
 * The caller adds the clock (see {@link WEDGE_QUIET_MS}) and the liveness — in a
 * replay there is no thread to be wedged and "no frame for 2.5 s" only means the
 * user stopped scrubbing.
 */
export function wedgeSuspected(state: ClientState): boolean {
  const input = state.input;
  if (input === null) return false;
  if (input.buttons.ok.enabled) return false;
  if (input.selectable.cardIds.length > 0) return false;
  if (state.ask !== null) return false;
  if (state.gameOver !== null) return false;
  const you = viewerSeat(state);
  return you !== null && state.board !== null && state.board.priority === you;
}

/**
 * The rule §4.2 stated before amendment M21, kept so the test can measure the
 * difference rather than assert it from memory. Not used by the UI.
 */
export function wedgeSuspectedPreM21(state: ClientState): boolean {
  const input = state.input;
  if (input === null) return false;
  return (
    !input.buttons.ok.enabled &&
    input.selectable.cardIds.length === 0 &&
    state.ask === null &&
    state.gameOver === null
  );
}
