/*
 * mtg-table — cards/keys.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The card browser's keyboard: one table and one pure function** — the same
 * shape as `web/src/keys.ts` (CLAUDE.md, M4 convention 4), and for the same
 * reason: the handler and the help line both read {@link CARDS_KEYMAP}, so the
 * help cannot list a key nothing implements.
 *
 * It is a table of its own rather than rows in `web/src/keys.ts` because that
 * table is the board's and the arena's: `keys.test.ts` asserts every chord in it
 * appears in the board's `?` overlay, and `/` or `Enter` there would advertise a
 * key the board does not handle. This route mounts no board and no arena, so the
 * two tables never see the same keystroke.
 *
 * Pure: no React, no DOM types. `web/test/cards-ui.test.ts` imports it.
 */

export type CardsKeyAction = 'focusSearch' | 'move' | 'open' | 'close';

export interface CardsKeyRow {
  /** What the help line prints. */
  chord: string;
  /** `KeyboardEvent.key` values that trigger the row. */
  keys: readonly string[];
  action: CardsKeyAction;
  label: string;
}

export const CARDS_KEYMAP: readonly CardsKeyRow[] = [
  { chord: '/', keys: ['/'], action: 'focusSearch', label: 'search' },
  {
    chord: '← ↑ → ↓ Home End',
    keys: ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'Home', 'End'],
    action: 'move',
    label: 'move',
  },
  { chord: 'Enter', keys: ['Enter'], action: 'open', label: 'open' },
  { chord: 'Esc', keys: ['Escape'], action: 'close', label: 'close' },
];

/** Where the keystroke landed, and what the page looks like right now. */
export interface CardsKeyContext {
  key: string;
  /** Ctrl, Meta or Alt held — a browser shortcut, never ours. */
  modifier: boolean;
  /** Focus is in a text field (the search box). */
  inInput: boolean;
  /** Focus is on a button or link — it keeps `Enter` (a result tile is a button, and keeps the arrows). */
  inControl: boolean;
  /** Focus is on a `<select>` — it keeps the arrows and `Enter`; only `/` and `Esc` are ours. */
  inSelect: boolean;
  /** The selected result, `-1` for none. */
  index: number;
  total: number;
  /** Results per row of the grid, as laid out (at least 1). */
  columns: number;
  detailOpen: boolean;
}

export type CardsKeyPlan =
  | { kind: 'focusSearch' }
  /** Select `index`; `focusGrid` moves focus out of the search box. */
  | { kind: 'select'; index: number; focusGrid: boolean }
  | { kind: 'open'; index: number }
  | { kind: 'close' }
  | { kind: 'blur' }
  | { kind: 'none' };

/** The row a key belongs to, or `null`. */
export function cardsRowFor(key: string): CardsKeyRow | null {
  return CARDS_KEYMAP.find((row) => row.keys.includes(key)) ?? null;
}

/**
 * Arrow keys over a grid laid out `columns` wide: left/right step one, up/down
 * step a row, Home/End jump to the ends. Clamped, never wrapping; from no
 * selection every key lands on the first result.
 */
export function moveIndex(index: number, key: string, columns: number, total: number): number {
  if (total <= 0) return -1;
  if (index < 0) return key === 'End' ? total - 1 : 0;
  const cols = Math.max(1, Math.floor(columns));
  let next = index;
  if (key === 'ArrowRight') next = index + 1;
  else if (key === 'ArrowLeft') next = index - 1;
  else if (key === 'ArrowDown') next = index + cols;
  else if (key === 'ArrowUp') next = index - cols;
  else if (key === 'Home') next = 0;
  else if (key === 'End') next = total - 1;
  return Math.min(total - 1, Math.max(0, next));
}

/** Decide what one keystroke does. Total: anything unlisted is `none`. */
export function planCardsKey(ctx: CardsKeyContext): CardsKeyPlan {
  if (ctx.modifier) return { kind: 'none' };
  const row = cardsRowFor(ctx.key);
  if (row === null) return { kind: 'none' };

  if (ctx.inInput) {
    // Typing wins: `/` is a character, and left/right move the caret. Down (or
    // Enter) is how you leave the box for the results.
    if (ctx.key === 'ArrowDown') {
      return ctx.total > 0 ? { kind: 'select', index: Math.max(0, ctx.index), focusGrid: true } : { kind: 'none' };
    }
    if (ctx.key === 'Enter') {
      if (ctx.total <= 0) return { kind: 'none' };
      return { kind: 'open', index: Math.max(0, ctx.index) };
    }
    if (ctx.key === 'Escape') return { kind: 'blur' };
    return { kind: 'none' };
  }

  if (ctx.inControl && (ctx.key === 'Enter' || ctx.key === ' ')) return { kind: 'none' };
  // A dropdown's arrows choose an option; stealing them breaks the type and deck filters.
  if (ctx.inSelect && ctx.key !== '/' && ctx.key !== 'Escape') return { kind: 'none' };

  switch (row.action) {
    case 'focusSearch':
      return { kind: 'focusSearch' };
    case 'move': {
      const index = moveIndex(ctx.index, ctx.key, ctx.columns, ctx.total);
      return index < 0 ? { kind: 'none' } : { kind: 'select', index, focusGrid: false };
    }
    case 'open':
      return ctx.index >= 0 && ctx.index < ctx.total ? { kind: 'open', index: ctx.index } : { kind: 'none' };
    case 'close':
      return ctx.detailOpen ? { kind: 'close' } : { kind: 'none' };
  }
}
