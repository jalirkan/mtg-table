/*
 * mtg-table — workshop/keys.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The workshop's keyboard: one table and one pure function** — the shape of
 * `web/src/keys.ts` (CLAUDE.md, M4 convention 4: "adding a key is a row, never a
 * new branch in a handler") and of the card browser's `cards/keys.ts`, and for
 * the same reason: the handler and the legend both read {@link WORKSHOP_KEYMAP},
 * so the legend cannot list a key nothing implements, and a key cannot work that
 * the legend does not list.
 *
 * Each row carries its ACTION; `Workshop.tsx` maps actions to what they do with a
 * `Record<WorkshopKeyAction, () => void>`, so an action with no handler does not
 * compile and there is no `switch` on key names anywhere (`workshop.test.ts`
 * scans for one).
 *
 * It is a table of its own rather than rows in `web/src/keys.ts` because that
 * table is the board's and the arena's: `keys.test.ts` asserts every chord in it
 * appears in the board's `?` overlay, and `.`, `,` or `B` there would advertise a
 * key the board does not have. The workshop mounts no board and no arena (`App`
 * unmounts the mode app), so the two tables never see the same keystroke.
 *
 * `[NO three]`, `[NO React]`, no DOM types: `node --test` imports it.
 */

import { isTypingTarget, ownsActivationKeys, type KeyTargetLike } from '../keys.ts';

export type WorkshopKeyAction =
  | 'pause'
  | 'step'
  | 'nudge'
  | 'skip'
  | 'slower'
  | 'faster'
  | 'both'
  | 'facing'
  | 'camera'
  | 'reducedMotion'
  | 'previous'
  | 'next'
  | 'arena';

export interface WorkshopKeyRow {
  /** What the legend prints. */
  chord: string;
  /** `KeyboardEvent.key` values that trigger the row. */
  keys: readonly string[];
  action: WorkshopKeyAction;
  what: string;
}

export const WORKSHOP_KEYMAP: readonly WorkshopKeyRow[] = [
  { chord: 'SPACE', keys: [' '], action: 'pause', what: 'pause / resume the cue clock' },
  { chord: '.', keys: ['.'], action: 'step', what: 'step: play the queued batch to its end' },
  { chord: ',', keys: [','], action: 'nudge', what: 'advance a paused clock by 50 ms' },
  { chord: 'K', keys: ['k', 'K'], action: 'skip', what: 'skip everything playing' },
  { chord: '[', keys: ['['], action: 'slower', what: 'slower' },
  { chord: ']', keys: [']'], action: 'faster', what: 'faster' },
  { chord: 'B', keys: ['b', 'B'], action: 'both', what: 'both seats on / off' },
  { chord: 'F', keys: ['f', 'F'], action: 'facing', what: 'facing: its own player / the other seat' },
  { chord: 'T', keys: ['t', 'T'], action: 'camera', what: 'camera: front → from your seat → table distance → whole table' },
  { chord: 'R', keys: ['r', 'R'], action: 'reducedMotion', what: 'reduced motion on / off' },
  { chord: '↑', keys: ['ArrowUp'], action: 'previous', what: 'previous card in the list' },
  { chord: '↓', keys: ['ArrowDown'], action: 'next', what: 'next card in the list' },
  { chord: 'V', keys: ['v', 'V'], action: 'arena', what: 'back to the arena' },
];

/** What the handler hands the planner: the event's fields, never the event. */
export interface WorkshopKeyEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  target: KeyTargetLike | null;
}

/** The row a key belongs to, or `null`. */
export function workshopRowFor(key: string): WorkshopKeyRow | null {
  return WORKSHOP_KEYMAP.find((row) => row.keys.includes(key)) ?? null;
}

/**
 * **What one keystroke does**, or `null` for "not ours". A browser shortcut
 * (Ctrl, Meta, Alt) and anything typed into a text field — the search box, a cue
 * params textarea — is never ours; and a focused button keeps `Space`, which the
 * browser already turns into a click (`keys.ts`'s rule for the board: pausing as
 * well would be two actions for one press).
 */
export function workshopActionFor(event: WorkshopKeyEvent): WorkshopKeyAction | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (isTypingTarget(event.target)) return null;
  if (event.key === ' ' && ownsActivationKeys(event.target)) return null;
  return workshopRowFor(event.key)?.action ?? null;
}
