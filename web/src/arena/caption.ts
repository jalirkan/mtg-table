/*
 * mtg-table — arena/caption.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The caption strip's data and its place on the canvas** (D255, D256), pure.
 *
 * The arena draws the narrator's moment for the frame on screen — and names no
 * card itself. What it is handed is {@link ArenaCaption}: plain data, which
 * `main.tsx` builds with `story/caption.ts` over THE narrator (`story/narrate.ts`)
 * and passes down as a prop, exactly as it passes the follow word. Nothing under
 * `arena/` imports the narrator, `story/` or a transport (`liveness.test.ts`), so
 * the arena still decides nothing: a sentence here is one the story page prints
 * for the same frame, and every card name in it one the narrator's one face
 * reader resolved (hard rule 8; `arena-caption.test.tsx` sweeps the corpus).
 *
 * `[NO three]`, `[NO React]`, `[NO DOM]`, no clock, no storage: the stored choice
 * is read and written by `Arena.tsx` inside `try` (the liveness clause), through
 * the two pure functions below.
 */

import type { CornerRect } from './camera.ts';

/** A piece of a caption line: text, or a card the narrator named. */
export interface ArenaCaptionPiece {
  text: string;
  card: { id: number; name: string } | null;
}

export interface ArenaCaptionLine {
  /** The whole sentence — the strip's tooltip when a line is clamped. */
  text: string;
  pieces: readonly ArenaCaptionPiece[];
  frameIndex: number;
  /** Its turn, as the story page heads it: the strip prints a marker wherever this changes. */
  turn: string;
  side: 'you' | 'opp' | null;
}

/**
 * **The moment for the frame on screen, as plain data** (`story/caption.ts`'s
 * `Caption`, field for field). `null` in its place means no moment names the
 * frame on screen — a quiet frame — and the strip hides.
 */
export interface ArenaCaption {
  /** The frame on screen: the strip's key, and nothing else. */
  frame: number;
  /** The frame's turn (its last line's): `Turn 14 · AI-Seat1 (AI)`, `Before the game`. */
  turn: string;
  /** Whose turn, from the log's seat — the strip's edge colour. */
  side: 'you' | 'opp' | null;
  /** The frame's moments, in the narrator's order. */
  now: readonly ArenaCaptionLine[];
  /** The one or two before them, oldest first, dimmed. */
  before: readonly ArenaCaptionLine[];
  /** The frame's moments that did not fit (`+N more`). */
  more: number;
}

// ---------------------------------------------------------------------------
// The choice: on or off, per context, in this browser (D256)

/** Where the choice is kept — `localStorage`, read and written only in `Arena.tsx`, inside `try`. */
export const CAPTION_STORE_KEY = 'mtg-table.arena.caption';

/**
 * **Two contexts, two defaults** (D256). Watching — a replay or a followed
 * spectate recording — the caption is ON: the user learns the game by watching
 * two AIs play, and the moment named is the point. At a live seat it is OFF: the
 * player is playing, not reading, and a strip over the table is a strip over the
 * table. Each context keeps its own choice, so turning it on at a seat does not
 * turn it on for every replay, nor off for one.
 */
export type CaptionContext = 'watch' | 'seat';

export const CAPTION_DEFAULT: Readonly<Record<CaptionContext, boolean>> = Object.freeze({ watch: true, seat: false });

/** The arena's context: a replay (no act to send) watches; a seat that can act plays. */
export function captionContextOf(canAct: boolean): CaptionContext {
  return canAct ? 'seat' : 'watch';
}

/** The choice for a context, from the stored text (`null`, garbage and a missing context are the default). */
export function captionChoiceOf(stored: string | null, context: CaptionContext): boolean {
  if (stored === null) return CAPTION_DEFAULT[context];
  try {
    const parsed: unknown = JSON.parse(stored);
    if (parsed !== null && typeof parsed === 'object') {
      const value = (parsed as Record<string, unknown>)[context];
      if (typeof value === 'boolean') return value;
    }
  } catch {
    // Not ours, or damaged: the default.
  }
  return CAPTION_DEFAULT[context];
}

/** The text to store after choosing `on` in `context`, keeping the other context's choice. */
export function storedCaptionWith(stored: string | null, context: CaptionContext, on: boolean): string {
  const other: CaptionContext = context === 'watch' ? 'seat' : 'watch';
  return JSON.stringify({ [other]: captionChoiceOf(stored, other), [context]: on });
}

// ---------------------------------------------------------------------------
// Where it sits (D256): the right edge, between the two seat plates, above yours

/**
 * **The strip's footprint on the canvas, as a keep-out** — `styles.css`'s
 * `.arena__caption`; `caption.test.ts` holds this to the stylesheet, as
 * `camera.test.ts` holds the seat plates. The
 * strip grows upward from 7.4rem above the canvas's bottom edge — 7.2 px above
 * your plate, whose top is `PLAYER_PLATES.you` (8 + 103.2 px) — 0.6rem in from
 * the right like the plates, `min(28rem, 19.5vw)` wide and at most 13rem tall
 * (`max-block-size`: the content's own bound — two turn markers, one earlier
 * line, four current ones — is 208 px, and a rarer third marker is cut at the
 * top, the oldest line first). The width follows the viewport, which is the canvas's width here (the
 * arena spans the page).
 *
 * Why there, and why that wide: over every board frame of the committed corpus,
 * at the table view, that corner of the frame is felt and nothing else at 1280
 * px and wider — the stack sits above it, the opponent's duelist and plate above
 * that, your hand and ranks to its left (`caption.test.ts` measures it and
 * prints the census; the bottom centre, the obvious subtitle spot, is its
 * negative control: your hand). The width is what the right end of a full land
 * rank leaves: its ninth card, tapped, reaches 79.6% of a 1600-px canvas, and
 * the first width tried (`min(22rem, 26vw)`) covered it in 126 frames at 1280,
 * 1440 and 1600 px. At 1024 px the rank reaches further than any useful strip is
 * narrow, and the census says so.
 */
export function captionRectOf(canvasWidthPx: number): CornerRect {
  return {
    corner: 'bottom-right',
    insetX: CAPTION_BOX.insetEndPx,
    insetY: CAPTION_BOX.insetBottomPx,
    width: Math.min(CAPTION_BOX.maxWidthPx, (CAPTION_BOX.widthVw / 100) * canvasWidthPx),
    height: CAPTION_BOX.maxHeightPx,
  };
}

/** The numbers {@link captionRectOf} reads — each one a declaration of `.arena__caption` (root font 16 px). */
export const CAPTION_BOX = Object.freeze({
  insetEndPx: 9.6,
  insetBottomPx: 118.4,
  maxWidthPx: 448,
  widthVw: 19.5,
  maxHeightPx: 208,
});
