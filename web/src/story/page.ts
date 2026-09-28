/*
 * mtg-table — story/page.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The `#story` page's own logic, pure** (D125): where the replay cursor sits
 * in the story, where the next and previous moment and turn are, and how a
 * moment's sentence is cut into text and card names. `Story.tsx` draws what
 * these return and decides nothing else.
 *
 * `[NO React]`, `[NO DOM]`, no clock, no fetch: `web/test/story.test.ts`
 * imports it under `node --test`.
 *
 * **The cursor is the replay transport's** (`LogReplayTransport.index`): the
 * number of frames applied, so frame `f` has happened when `f < cursor`. A
 * moment carries the index of the frame that produced it (`narrate.ts`'s
 * `frameIndex`), so "the moment on screen" is the latest moment whose frame has
 * happened, and moving to a moment is moving the cursor to just after its frame
 * -- the arena, the board and the story all read that same cursor, which is how
 * the story stays in step with the replay (`replayCursors` in `main.tsx`).
 */

import { outlineGame, type CardRef, type Moment, type Outline, type Story, type StoryGame } from './narrate.ts';

/** A story as the page lays it out: each game with its outline, and the cursor's landmarks. */
export interface StoryView {
  games: ReadonlyArray<{ game: StoryGame; outline: Outline }>;
  /** Every frame index that produced a moment, ascending, each once. */
  frames: readonly number[];
  /** The first frame of each turn's moments (the setup counts as one), ascending, each once. */
  turnStarts: readonly number[];
  /** How many moments in all. */
  count: number;
}

const ascendingUnique = (xs: readonly number[]): number[] => [...new Set(xs)].sort((a, b) => a - b);

export function storyViewOf(story: Story): StoryView {
  const games = story.games.map((game) => ({ game, outline: outlineGame(game) }));
  const frames: number[] = [];
  const turnStarts: number[] = [];
  let count = 0;
  for (const { outline } of games) {
    const setup = outline.setup.map((m) => m.frameIndex);
    frames.push(...setup);
    if (setup.length > 0) turnStarts.push(Math.min(...setup));
    count += setup.length;
    for (const t of outline.turns) {
      const own = t.runs.flatMap((r) => r.moments.map((m) => m.frameIndex));
      frames.push(...own);
      if (own.length > 0) turnStarts.push(Math.min(...own));
      count += own.length;
    }
  }
  return { games, frames: ascendingUnique(frames), turnStarts: ascendingUnique(turnStarts), count };
}

/**
 * The frame of the moment on screen: the latest moment-bearing frame that has
 * happened at this cursor (`f < cursor`), or `-1` before the first.
 */
export function nowFrameOf(frames: readonly number[], cursor: number): number {
  let lo = 0;
  let hi = frames.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid]! < cursor) {
      found = frames[mid]!;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/** Where a moment sits against the cursor. */
export type Placement = 'past' | 'now' | 'ahead';

export function placementOf(frameIndex: number, cursor: number, now: number): Placement {
  if (frameIndex === now) return 'now';
  return frameIndex < cursor ? 'past' : 'ahead';
}

/** The cursor that shows the next moment after the one on screen, or `null` at the last. */
export function nextMomentCursor(frames: readonly number[], cursor: number): number | null {
  const next = frames.find((f) => f >= cursor);
  return next === undefined ? null : next + 1;
}

/**
 * The cursor that shows the moment before the one on screen — or `0`, the
 * session header, from the first.
 */
export function prevMomentCursor(frames: readonly number[], cursor: number): number {
  const now = nowFrameOf(frames, cursor);
  const before = nowFrameOf(frames, now);
  return before < 0 ? 0 : before + 1;
}

/** The cursor at the next turn's first moment, or `null` in the last turn. */
export function nextTurnCursor(turnStarts: readonly number[], cursor: number): number | null {
  return nextMomentCursor(turnStarts, cursor);
}

/**
 * Back to the first moment of the turn on screen, or — already there — of the
 * turn before; `0` from the first.
 */
export function prevTurnCursor(turnStarts: readonly number[], frames: readonly number[], cursor: number): number {
  const now = nowFrameOf(frames, cursor);
  const start = nowFrameOf(turnStarts, now);
  return start < 0 ? 0 : start + 1;
}

/**
 * A turn's moments against the cursor, as ONE value: `past` and `ahead` when
 * every moment in it is, `live` otherwise. The page re-renders a `live` turn
 * with the cursor and leaves the others alone, so stepping through a long game
 * redraws one turn, not the whole column.
 */
export function turnPlacement(moments: readonly Moment[], cursor: number, now: number): 'past' | 'ahead' | 'live' {
  if (moments.length === 0) return 'ahead';
  let past = true;
  let ahead = true;
  for (const m of moments) {
    const p = placementOf(m.frameIndex, cursor, now);
    if (p !== 'past') past = false;
    if (p !== 'ahead') ahead = false;
  }
  return past ? 'past' : ahead ? 'ahead' : 'live';
}

/** The moments on screen: every moment of the frame {@link nowFrameOf} names. */
export function nowMoments(view: StoryView, now: number): Moment[] {
  if (now < 0) return [];
  const out: Moment[] = [];
  for (const { outline } of view.games) {
    for (const m of outline.setup) if (m.frameIndex === now) out.push(m);
    for (const t of outline.turns) for (const r of t.runs) for (const m of r.moments) if (m.frameIndex === now) out.push(m);
  }
  return out;
}

/** A piece of a moment's sentence: plain text, or a card the narrator named. */
export interface TextPiece {
  text: string;
  card: CardRef | null;
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Cut a moment's sentence at the card names the narrator put in it, so the page
 * can mark each one (`data-card-id`) and show its image. **Only the refs the
 * narrator resolved are candidates** — a ref with `name: null` (an unseen card,
 * a face-down one) has nothing to find, so no id is ever joined to a name here
 * that `narrate.ts`'s one face reader did not already join (hard rule 8). The
 * longest name wins where two overlap; a name must stand as a word of its own.
 */
export function segmentText(text: string, cards: readonly CardRef[]): TextPiece[] {
  const byName = new Map<string, CardRef>();
  for (const c of cards) if (c.name !== null && c.name !== '' && !byName.has(c.name)) byName.set(c.name, c);
  if (byName.size === 0) return [{ text, card: null }];
  const names = [...byName.keys()].sort((a, b) => b.length - a.length).map(escapeRe);
  const re = new RegExp(`(?<![A-Za-z0-9])(?:${names.join('|')})(?![A-Za-z0-9])`, 'g');
  const out: TextPiece[] = [];
  let at = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index;
    if (start > at) out.push({ text: text.slice(at, start), card: null });
    out.push({ text: m[0], card: byName.get(m[0]) ?? null });
    at = start + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at), card: null });
  return out;
}

/** The face-up cards a set of moments names, each once, in order — what the side panel shows. */
export function namedCardsOf(moments: readonly Moment[]): CardRef[] {
  const seen = new Set<string>();
  const out: CardRef[] = [];
  for (const m of moments) {
    for (const c of m.cards) {
      if (c.name === null || c.faceDown === true || seen.has(c.name)) continue;
      seen.add(c.name);
      out.push(c);
    }
  }
  return out;
}

/** A stable key for a moment: its game, its frame and its place among that frame's moments. */
export function momentKey(gameIndex: number, m: Moment, ordinal: number): string {
  return `${String(gameIndex)}:${String(m.frameIndex)}:${String(ordinal)}`;
}
