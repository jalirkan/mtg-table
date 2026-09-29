/*
 * mtg-table — arena/hud.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The chrome column over the canvas's top-left, as numbers** (the play-distance
 * audit, D265), pure.
 *
 * The arena's DOM layer stacks its widgets down the top-left of the canvas in
 * THREE in-flow rows — the decision bar (or, watching, the "watching" line), the
 * cue strip beside the camera switcher, and the credit line beside the inspect
 * chip — and everything that stands at the far end of the table is measured
 * against that column as `layout.ts`'s `HUD_TOP_PX` band (128 CSS px over the
 * canvas top: D85's carriers, D100's duelists, the seat plates). Nothing held the
 * column to its own band, so it grew past it: D241's inspect chip took a fourth
 * row under the credit line (137 px at a live seat whose prompt wraps), and the
 * sound and caption checkboxes widened the cue strip until, at 1280 × 800, the
 * switcher took a second row of its own (150 px); and the engine's prompt, which
 * the bar wraps, took it to 167 px on a 250-character targeting prompt (the
 * audit's fix pass). `hud.test.ts` now holds the column: the rows below,
 * measured in headless Chromium, sum under `HUD_TOP_PX`; the layer mounts
 * exactly these three in-flow rows; the prompt is at most two lines, whatever
 * the engine writes; and the cue strip keeps one row with the switcher from
 * 1280 px, idle and playing, because its status is a fixed width.
 *
 * `[NO three]`, `[NO React]`, `[NO DOM]`, no clock, no storage (`liveness.test.ts`).
 */

/**
 * **The column's rows, in CSS pixels** — each one's height as headless Chromium
 * drew it (`docs/evidence/play-distance-audit.md`, the live seat and the replay at
 * 1280 × 800 and 1600 × 1000), and the gaps between them from `styles.css`. The
 * decision bar is its WORST case: a prompt at {@link HUD_PROMPT}'s two lines
 * beside its buttons, which is as tall as the bar gets whatever the engine
 * writes — the corpus's 350 distinct prompts measured 28.2–46.4 px at both sizes
 * after the fix pass, and 28.2–100.9 before it.
 */
export const HUD_COLUMN_PX = Object.freeze({
  /** `.arena__layer`'s `padding-block-start` (0.4rem). */
  layerPad: 6.4,
  /** `.arena__decision`, a prompt at its two lines beside its buttons (one line is 28, a watching line 26). */
  decision: 46,
  /** `.arena__decision`'s `margin-block-end` (0.3rem). */
  decisionGap: 4.8,
  /** `.arena__cues` / `.arena__views`, one row. */
  strips: 29,
  /** `.arena__cues`' `margin-block-end` (0.3rem). */
  stripsGap: 4.8,
  /** `.arena__creditrow`: the credit line and the inspect chip, side by side. */
  credit: 21,
});

/** The column's height over the canvas top, at its worst case. */
export function hudColumnPx(): number {
  const r = HUD_COLUMN_PX;
  return r.layerPad + r.decision + r.decisionGap + r.strips + r.stripsGap + r.credit;
}

/**
 * **The engine's prompt, at most two lines** (the audit's fix pass). The prompt
 * is the engine's text and any length — a trigger's targeting prompt quotes the
 * card's whole ability before the question, 250 characters in the corpus — and
 * the bar wrapped all of it, so the column grew a line at a time past
 * `HUD_TOP_PX` (167 px at five lines) with the credit row over the very rank the
 * prompt asked you to target. `.arena__decision .prompt` starts from nothing
 * (`flex: 1 1 0`) and grows into the room the bar has beside its buttons, so a
 * short prompt keeps its buttons on its line and a long one takes the bar's
 * width; past `lines` it is cut with an ellipsis. It stays whole in the DOM, in
 * its tooltip, and in place on hover.
 *
 * `lineHeightPx` and `barPadPx` are the bar's as Chromium drew it (a prompt of n
 * lines is `n × 18.2 + 10` px tall, beside 16.6-px buttons); `charsPerLine` is a
 * floor for the per-line model `hud.test.ts` sweeps the corpus's prompts
 * through — the prompt's old fixed 46ch, which a long prompt now never gets less
 * than from 1280 px (the corpus's prompts over 100 characters measured 605–671 px
 * there).
 */
export const HUD_PROMPT = Object.freeze({
  lines: 2,
  lineHeightPx: 18.2,
  barPadPx: 10,
  charsPerLine: 46,
});

/** The bar's height, modelled, for a prompt of `chars` characters clamped at `lines` (or not, with `Infinity`). */
export function promptBarPx(chars: number, lines: number = HUD_PROMPT.lines): number {
  const wrapped = Math.max(1, Math.ceil(chars / HUD_PROMPT.charsPerLine));
  return Math.min(wrapped, lines) * HUD_PROMPT.lineHeightPx + HUD_PROMPT.barPadPx;
}

/**
 * **The turn-order bar's head** (D210's `TurnOrderBar`; the audit's fix pass):
 * `R<round> your turn` / `R<round> their turn` in a monospace face, on one line
 * inside the bar's fixed width. At the bar's 10.5 px "R12 their turn" was 88.5
 * px against 88 px of content and every opponent's turn from round 10 read
 * "R12 their tu…"; the head is 10 px. `monoAdvanceEm` is the face's advance
 * (DejaVu Sans Mono, 1233/2048, what Chromium resolved `--mono` to here).
 */
export const TURN_BAR = Object.freeze({
  widthPx: 100,
  padInlinePx: 6,
  headFontPx: 10,
  monoAdvanceEm: 0.602,
  longestHead: 'R99 their turn',
});

/**
 * **The cue strip and the camera switcher share one row** (slice 2's
 * verification fix, D256), and three numbers keep them in it:
 *
 * - `narrowBelowPx`: below it the strip is its NARROW form — the word *speed*
 *   folds into the select's tooltip and the status is the seconds of film left
 *   (`narrow`); from it, the status says steps and milliseconds (`wide`);
 * - `labelsBelowPx`: below it each view button is its key (the names stay in the
 *   tooltips and the accessible names — D256 point 4, 1900 until this audit);
 * - the status is a FIXED width, so the strip is as wide playing as idle: a batch
 *   never wraps the switcher onto a row of its own over the opponent's rank.
 *
 * The widths are headless Chromium's (the audit's measuring driver), for the
 * strip as `CueControls` mounts it — four buttons, the speed select, five
 * checkboxes and the status behind its rule (`hud.test.ts` holds the markup to
 * that list, so a control added to the strip fails until the row is measured
 * again). The rule came on the fix pass — beside the caption checkbox the status
 * read as its label, "caption idle" — and added 5.8 px to each form.
 */
export const CUE_STRIP = Object.freeze({
  narrowBelowPx: 1400,
  labelsBelowPx: 1840,
  /** The status box, in `ch` of the strip's 11 px mono face. */
  statusCh: Object.freeze({ wide: 21, narrow: 6 }),
  /** Measured widths, CSS px: the cue strip in each form and the switcher both ways. */
  px: Object.freeze({ wide: 892.1, narrow: 756.5, switcher: 230.1, switcherLabelled: 672 }),
  /** `.arena__strips`' `column-gap` (0.4rem). */
  gap: 6.4,
  /** What the strips' row keeps back: `.arena__layer`'s inline padding and the opponent's plate's 15rem. */
  reservePx: 19.2 + 240,
});

/** The strips' row on a viewport `widthPx` wide: the layer less its padding and the plate's reserve. */
export function stripsRowPx(widthPx: number): number {
  return widthPx - CUE_STRIP.reservePx;
}

/** The cue strip's status, both forms, and the whole of it for the tooltip. */
export interface CueStatus {
  /** `idle`, or `12 steps · 4155 ms` — at most `CUE_STRIP.statusCh.wide` characters. */
  wide: string;
  /** `idle`, or `4.2 s` — at most `CUE_STRIP.statusCh.narrow` characters. */
  narrow: string;
  title: string;
}

/**
 * **The queue's status in words**: how many steps are queued and how much film
 * they hold. Both forms are clamped so the fixed-width box never cuts one: past
 * 99 steps the count reads `99+`, past 99,999 ms the time reads `99999+`, and the
 * narrow form's seconds stop at `99.9`.
 */
export function cueStatusOf(pending: number, remainingMs: number): CueStatus {
  if (!(pending > 0)) return { wide: 'idle', narrow: 'idle', title: 'idle — no cue is queued' };
  const steps = `${pending > 99 ? '99+' : String(pending)} step${pending === 1 ? '' : 's'}`;
  const ms = Math.max(0, Math.round(remainingMs));
  const wideMs = ms > 99_999 ? '99999+' : String(ms);
  const seconds = Math.min(99.9, ms / 1000).toFixed(1);
  return {
    wide: `${steps} · ${wideMs} ms`,
    narrow: `${seconds} s`,
    title: `${String(pending)} step${pending === 1 ? '' : 's'} queued · ${String(ms)} ms of film`,
  };
}
