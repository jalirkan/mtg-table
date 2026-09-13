/*
 * mtg-table — arena/cues/intake.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **"Is this batch the next one, or did the stream jump?"** (report 09 §2.3).
 *
 * The 2D board never had to ask: it renders the snapshot and is done. The arena
 * queues animations, so a replay scrub, a `resync`, a reconnect or a new game
 * must **flush and snap** rather than play a batch from somewhere else in the
 * game. Pure, so `node --test` can drive every case.
 *
 * ---------------------------------------------------------------------------
 * §2.3 sketches `s !== last + 1 ⇒ flush`, and that cannot be right here.
 * `seq` numbers **every** frame (§1), so two consecutive `state` frames are
 * routinely 5 or 20 apart; and a `resync` re-delivers cached frames **verbatim**
 * — same `seq`, same `t` (amendments M10/M17) — so the series is neither
 * contiguous nor monotonic. PLAN's *"What M6 hands to M7"* says it outright:
 * `seq` is not an ordering primitive.
 *
 * What does hold, and what this file implements:
 *
 *   - **a changed `gameId` is a reset** (§2.1, D44, amendment M38) — every card
 *     id the scene holds died with the old game, so: flush;
 *   - **`eventSeq` going backwards** is a scrub or a new stream: flush;
 *   - **`eventSeq` standing still** is a re-delivered or non-`state` frame:
 *     nothing to do;
 *   - **`eventSeq` going forwards** is normally the next batch — but a forward
 *     *scrub* also goes forwards, and `seq` alone cannot tell them apart. The
 *     tie-breaker is `framesApplied`: live play and step-forward advance it a
 *     frame at a time, and a scrub jumps it by hundreds.
 * ---------------------------------------------------------------------------
 */

import type { ClientState } from '../../reduce.ts';

/** Everything the intake rule reads out of a `ClientState`. */
export interface StreamCursor {
  eventSeq: number;
  framesApplied: number;
  gameId: string | null;
}

export type Intake = 'nothing' | 'enqueue' | 'flush';

/**
 * How big a forward jump in `framesApplied` still counts as "playing".
 *
 * React can coalesce two or three states into one render — a `state` + `input`
 * pair arriving in one socket read is the common case — so the threshold cannot
 * be 1. A scrub moves by hundreds, so anything in between is arbitrary and
 * twelve is a comfortable middle. **The failure mode is a snap, never a wrong
 * animation**: guessing "jump" on a fast live burst costs one skipped
 * flourish, and guessing "play" on a scrub would animate a transition that did
 * not happen here.
 */
export const JUMP_FRAMES = 12;

export function cursorOf(state: ClientState): StreamCursor {
  return {
    eventSeq: state.eventSeq,
    framesApplied: state.framesApplied,
    gameId: state.hello?.gameId ?? null,
  };
}

export function intakeFor(previous: StreamCursor, next: StreamCursor): Intake {
  if (previous.gameId !== next.gameId) return 'flush';
  if (next.eventSeq < previous.eventSeq) return 'flush';
  if (next.framesApplied < previous.framesApplied) return 'flush';
  if (next.eventSeq === previous.eventSeq) return 'nothing';
  if (next.framesApplied - previous.framesApplied > JUMP_FRAMES) return 'flush';
  return 'enqueue';
}
