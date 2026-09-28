/*
 * mtg-table — story/keys.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The story page's keyboard: one table and one pure function** — the shape
 * of `web/src/keys.ts` (CLAUDE.md, M4 convention 4: "adding a key is a row,
 * never a new branch in a handler"), of the card browser's `cards/keys.ts` and
 * of the workshop's `workshop/keys.ts`, and for the same reason: the handler and
 * the legend both read {@link STORY_KEYMAP}, so the legend cannot list a key
 * nothing implements, and a key cannot work that the legend does not list.
 *
 * Each row carries its ACTION; `Story.tsx` maps actions to what they do with a
 * `Record<StoryKeyAction, () => void>`, so an action with no handler does not
 * compile and there is no `switch` on key names anywhere
 * (`web/test/story.test.ts` scans for one).
 *
 * It is a table of its own rather than rows in `web/src/keys.ts` because that
 * table is the board's and the arena's: `keys.test.ts` asserts every chord in it
 * appears in the board's `?` overlay, and `←` or `S` there would advertise a key
 * the board does not have. `#story` mounts no board and no arena (`App`
 * unmounts the mode app, D151), so the two tables never see the same keystroke.
 *
 * `[NO React]`, no DOM types: `node --test` imports it.
 */

import { isTypingTarget, ownsActivationKeys, type KeyTargetLike } from '../keys.ts';

export type StoryKeyAction =
  | 'toggle'
  | 'prevMoment'
  | 'nextMoment'
  | 'prevTurn'
  | 'nextTurn'
  | 'stepBack'
  | 'stepForward'
  | 'start'
  | 'end'
  | 'keepInView'
  | 'ahead'
  | 'arena'
  | 'board';

export interface StoryKeyRow {
  /** What the legend prints. */
  chord: string;
  /** `KeyboardEvent.key` values that trigger the row. */
  keys: readonly string[];
  action: StoryKeyAction;
  what: string;
}

export const STORY_KEYMAP: readonly StoryKeyRow[] = [
  { chord: 'SPACE', keys: [' '], action: 'toggle', what: 'play / pause the replay' },
  { chord: '←', keys: ['ArrowLeft'], action: 'prevMoment', what: 'the moment before' },
  { chord: '→', keys: ['ArrowRight'], action: 'nextMoment', what: 'the next moment' },
  { chord: '↑', keys: ['ArrowUp'], action: 'prevTurn', what: 'back to this turn’s start, then the turn before' },
  { chord: '↓', keys: ['ArrowDown'], action: 'nextTurn', what: 'the next turn' },
  { chord: ',', keys: [','], action: 'stepBack', what: 'one frame back' },
  { chord: '.', keys: ['.'], action: 'stepForward', what: 'one frame forward' },
  { chord: 'HOME', keys: ['Home'], action: 'start', what: 'the start of the log' },
  { chord: 'END', keys: ['End'], action: 'end', what: 'the end of what has arrived' },
  { chord: 'F', keys: ['f', 'F'], action: 'keepInView', what: 'keep the moment on screen in view (on / off)' },
  { chord: 'S', keys: ['s', 'S'], action: 'ahead', what: 'what comes after the cursor: dimmed / hidden' },
  { chord: 'V', keys: ['v', 'V'], action: 'arena', what: 'the 3D arena, at this frame' },
  { chord: 'B', keys: ['b', 'B'], action: 'board', what: 'the 2D board, at this frame' },
];

/** What the handler hands the planner: the event's fields, never the event. */
export interface StoryKeyEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  target: KeyTargetLike | null;
}

/** The row a key belongs to, or `null`. */
export function storyRowFor(key: string): StoryKeyRow | null {
  return STORY_KEYMAP.find((row) => row.keys.includes(key)) ?? null;
}

/**
 * **What one keystroke does**, or `null` for "not ours". A browser shortcut
 * (Ctrl, Meta, Alt) and anything typed into a field — the replay bar's speed
 * `<select>` and its scrubber, which keep their own arrows — is never ours;
 * and a focused button or link keeps `Space`, which the browser already turns
 * into a click (`keys.ts`'s rule for the board: pausing as well would be two
 * actions for one press).
 */
export function storyActionFor(event: StoryKeyEvent): StoryKeyAction | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (isTypingTarget(event.target)) return null;
  if (event.key === ' ' && ownsActivationKeys(event.target)) return null;
  return storyRowFor(event.key)?.action ?? null;
}
