/*
 * mtg-table — story/caption.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The arena's caption, read off THE narrator** (D255). The user learns the
 * game by watching two AIs play; `#story` tells the game in words on a page of
 * its own, and at the table the moments scrolled past unnamed. This module picks,
 * for the frame on screen, the narrator's moments of that frame — plus the one or
 * two before them and a turn marker — as PLAIN DATA, which `main.tsx` hands the
 * arena. The arena draws it (`arena/CaptionStrip.tsx`) and imports no narrator,
 * no transport and nothing from `story/` (`liveness.test.ts`); nothing here is a
 * second narration: every sentence is `narrate.ts`'s, every card name one its
 * one face reader resolved (`page.ts`'s `segmentText` marks only those).
 *
 * `[NO React]`, `[NO DOM]`, no clock, no fetch, no storage: `web/test/caption.test.ts`
 * imports it under `node --test`. `main.tsx` reaches it only through `import()`,
 * so the 2D entry chunk carries no narrator (D49's rule, one level down).
 *
 * **"The frame on screen"** is the last `state` frame the cursor has applied: the
 * snapshot the arena is drawing. Its moments are every moment whose frame lies
 * between that snapshot and the cursor — the snapshot's own, and a seat's own
 * `concede` or sideboard answer after it — so a prompt or a toast between two
 * snapshots (an `input`, a `notice`) does not hide the caption, and the next
 * snapshot with nothing to say (a phase change, a pass) does. Before the first
 * snapshot of a game, and after a new game's `hello_ok`, there is no frame on
 * screen and no caption.
 *
 * **The same function in replay, in follow mode and at a live seat.** A replay
 * and a followed log hand it the transport's own frames (`LogReplayTransport.frames`,
 * which grows while a recording is followed) and its cursor. A live seat hands it
 * the frames `main.tsx` records off the socket for the game in progress
 * (`web/src/liveLog.ts`) and a cursor at their end: a live seat's frames ARE a
 * client log (M17), which the narrator already reads — a `resync`'s verbatim
 * re-delivery skipped by its `seq`, a disconnection's gap counted — so the
 * caption at a live seat is the sentence the CLI prints for the same frames.
 */

import { narrate, outlineGame, whoTag, type Moment, type Story } from './narrate.ts';
import { segmentText } from './page.ts';

/** A piece of a caption line: text, or a card the narrator named (face up, resolved by `faceOf`). */
export interface CaptionPiece {
  text: string;
  card: { id: number; name: string } | null;
}

/** One moment, as the strip draws it: its sentence, cut at the names it carries, and its turn. */
export interface CaptionLine {
  text: string;
  pieces: CaptionPiece[];
  frameIndex: number;
  /**
   * The turn it happened in, as the story page heads it — the strip prints a
   * marker wherever this changes from the line above, so an earlier line from
   * the turn before (or a flush that ends one turn and starts the next) is never
   * read under the wrong player's turn.
   */
  turn: string;
  side: 'you' | 'opp' | null;
}

/**
 * **What the arena is handed** — `arena/caption.ts`'s `ArenaCaption`, which this
 * matches field for field (`tsc` holds the two together at `main.tsx`'s one call
 * site, and `caption.test.ts` holds the names).
 */
export interface Caption {
  /** The frame on screen whose moments these are: a key for the strip, and nothing else. */
  frame: number;
  /**
   * The turn of the frame on screen — its last line's: `Turn 14 · AI-Seat1 (AI)`,
   * or `Before the game`, the story page's own heading.
   */
  turn: string;
  /** Whose turn that is, from the log's own seat: the viewer's (`you`) or the other seat's. */
  side: 'you' | 'opp' | null;
  /** The moments of the frame on screen, in the narrator's order (at most {@link CAPTION_NOW_MAX}). */
  now: CaptionLine[];
  /** The one or two moments before them, oldest first — the strip dims them. */
  before: CaptionLine[];
  /** How many of this frame's moments did not fit (a busy combat): `+N more`. */
  more: number;
}

/** The most lines of the frame on screen the strip draws; past it, `CAPTION_NOW_MAX - 1` and a count. */
export const CAPTION_NOW_MAX = 4;

/** A narrated log, indexed for {@link captionAt}. Built once per log (and again as a followed log grows). */
export interface CaptionIndex {
  story: Story;
  /**
   * Every moment with its game, in frame order and, within a frame, in the order
   * the story page lists them (`outlineGame`: a game's setup lines — the kept
   * hands, who goes first — before its turns), so a frame that holds turn 1's
   * first land and the setup told at the end of that batch reads as `#story`
   * reads it, and the marker is the turn the last line is in.
   */
  entries: ReadonlyArray<{ game: number; moment: Moment }>;
  /** The index of every server `state` frame, ascending. */
  stateFrames: readonly number[];
  /** The index of every server `hello_ok` frame, ascending — where a new game begins. */
  helloFrames: readonly number[];
}

interface FrameLike {
  type?: unknown;
  dir?: unknown;
}

/** Narrate a log's frames and index them. `header` is the session header (or a live seat's stand-in). */
export function captionIndexOf(header: unknown, frames: readonly unknown[]): CaptionIndex {
  const story = narrate({ header, frames });
  const entries: Array<{ game: number; moment: Moment }> = [];
  story.games.forEach((game, g) => {
    const outline = outlineGame(game);
    for (const moment of outline.setup) entries.push({ game: g, moment });
    for (const turn of outline.turns) for (const run of turn.runs) for (const moment of run.moments) entries.push({ game: g, moment });
  });
  // Stable: the page's order within a frame, frame order across them (the
  // lookups below are binary searches on `frameIndex`).
  entries.sort((a, b) => a.moment.frameIndex - b.moment.frameIndex);
  const stateFrames: number[] = [];
  const helloFrames: number[] = [];
  frames.forEach((raw, i) => {
    if (raw === null || typeof raw !== 'object') return;
    const f = raw as FrameLike;
    if ((f.dir ?? 's2c') !== 's2c') return;
    if (f.type === 'state') stateFrames.push(i);
    else if (f.type === 'hello_ok') helloFrames.push(i);
  });
  return { story, entries, stateFrames, helloFrames };
}

/** The last element of an ascending list that is `< cursor`, or `-1`. */
function lastBelow(sorted: readonly number[], cursor: number): number {
  let lo = 0;
  let hi = sorted.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid]! < cursor) {
      found = sorted[mid]!;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/** The first entry whose frame is `>= frame`, or `entries.length`. */
function firstAtOrAfter(entries: CaptionIndex['entries'], frame: number): number {
  let lo = 0;
  let hi = entries.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (entries[mid]!.moment.frameIndex < frame) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function lineOf(game: Story['games'][number], m: Moment): CaptionLine {
  return {
    text: m.text,
    pieces: segmentText(m.text, m.cards).map((piece) => ({
      text: piece.text,
      card: piece.card !== null && piece.card.name !== null ? { id: piece.card.id, name: piece.card.name } : null,
    })),
    frameIndex: m.frameIndex,
    ...turnOf(game, m.turn),
  };
}

/**
 * **The caption at a cursor** (the number of frames applied — the replay
 * transport's `index`, or a live log's length), or `null` when no moment names
 * the frame on screen: the strip then hides.
 */
export function captionAt(index: CaptionIndex, cursor: number): Caption | null {
  const onScreen = lastBelow(index.stateFrames, cursor);
  if (onScreen < 0) return null;
  // A new game's handshake after the last snapshot: the board is gone (D44).
  if (lastBelow(index.helloFrames, cursor) > onScreen) return null;
  const { entries } = index;
  const first = firstAtOrAfter(entries, onScreen);
  let end = first;
  while (end < entries.length && entries[end]!.moment.frameIndex < cursor) end += 1;
  if (end === first) return null;
  const game = entries[first]!.game;
  const nowAll = entries.slice(first, end).filter((e) => e.game === game);
  const fits = nowAll.length <= CAPTION_NOW_MAX ? nowAll : nowAll.slice(0, CAPTION_NOW_MAX - 1);
  const told = index.story.games[game]!;
  const wanted = fits.length === 1 ? 2 : 1;
  const before: CaptionLine[] = [];
  for (let i = first - 1; i >= 0 && before.length < wanted; i -= 1) {
    if (entries[i]!.game !== game) break;
    before.unshift(lineOf(told, entries[i]!.moment));
  }
  const now = fits.map((e) => lineOf(told, e.moment));
  const last = now[now.length - 1]!;
  return { frame: onScreen, turn: last.turn, side: last.side, now, before, more: nowAll.length - fits.length };
}

/** The turn marker: the story page's heading for the turn, and whose turn it is from this log's seat. */
function turnOf(game: Story['games'][number], turn: number): { turn: string; side: Caption['side'] } {
  if (turn === 0) return { turn: 'Before the game', side: null };
  const player = game.turns.find((t) => t.turn === turn)?.player ?? null;
  if (typeof player !== 'number') return { turn: `Turn ${String(turn)}`, side: null };
  return {
    turn: `Turn ${String(turn)} · ${whoTag(game, player)}`,
    side: game.you === null ? null : player === game.you ? 'you' : 'opp',
  };
}
