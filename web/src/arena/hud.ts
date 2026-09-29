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
 * The second fix pass (a second verifier) found the bar could still grow: its
 * items wrapped, and a key that did nothing — `I` with no card under the pointer
 * — put its hint and the "Your turn" notice on a second line under a two-line
 * prompt (136.7 px of column at both sizes); and the credit was still cut by the
 * chip. So the bar is one line of items now ({@link DECISION_BAR}), the credit
 * does not shrink while the chip can ({@link CREDIT_ROW}), and
 * {@link flexSizes} — the CSS flexible-lengths algorithm, pure — is how
 * `hud.test.ts` lays both out from the widths Chromium measured.
 *
 * `[NO three]`, `[NO React]`, `[NO DOM]`, no clock, no storage (`liveness.test.ts`).
 */

/**
 * **The column's rows, in CSS pixels** — each one's height as headless Chromium
 * drew it (`docs/evidence/play-distance-audit.md`, the live seat and the replay at
 * 1280 × 800 and 1600 × 1000), and the gaps between them from `styles.css`. The
 * decision bar is its WORST case: a prompt at {@link HUD_PROMPT}'s two lines
 * beside its buttons — as tall as the bar gets whatever the engine writes and
 * whatever else is in it, because since the second fix pass the bar never wraps
 * and nothing in it is taller than two lines of prompt ({@link DECISION_BAR}).
 * The corpus's 350 distinct prompts measured 28.2–46.4 px at both sizes after
 * the first fix pass, 28.2–100.9 before it; and a hint and a notice beside a
 * two-line prompt took the bar to 70.5 px until the second (now 46.4).
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
 * through — the prompt's old fixed 46ch, which since the second fix pass is the
 * prompt's `min-inline-size` too, so nothing beside it squeezes it below that
 * (alone in the bar, the corpus's prompts over 100 characters measured 605–671 px
 * at 1280).
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

// ---------------------------------------------------------------------------
// The second fix pass: one line of items, and the credit before the chip
// ---------------------------------------------------------------------------

/** One item of a single-line flex container, as the CSS flexible-lengths algorithm sees it (CSS px). */
export interface FlexItem {
  /** `flex-basis` resolved: the content width for `auto`, 0 for a zero basis. */
  basis: number;
  grow: number;
  shrink: number;
  min: number;
  max: number;
}

/**
 * **The sizes a single-line flex container gives its items** — CSS Flexbox
 * §9.7, "resolving flexible lengths": grow or shrink by the sign of the free
 * space, the shrink WEIGHTED by each item's basis (why a factor of 1,000 still
 * cut the credit), the min/max violations frozen and the rest re-run. `room` is
 * the container's inner width less its gaps. Pure; `hud.test.ts` lays the
 * decision bar and the credit row out with it from the widths Chromium measured,
 * and checks it against Chromium's own layout (`human-ability-42`@1060: the hint
 * 194.1 px at 1280 × 800, both ways).
 */
export function flexSizes(items: readonly FlexItem[], room: number): number[] {
  const clamp = (v: number, it: FlexItem): number => Math.max(it.min, Math.min(it.max, v));
  const hypo = items.map((it) => clamp(it.basis, it));
  const growing = items.reduce((sum, it) => sum + it.basis, 0) < room;
  const target = hypo.slice();
  const frozen = items.map((it, i) => (growing ? it.grow === 0 || it.basis > hypo[i]! : it.shrink === 0 || it.basis < hypo[i]!));
  for (let pass = 0; pass <= items.length; pass++) {
    if (frozen.every(Boolean)) break;
    let free = room;
    for (let i = 0; i < items.length; i++) free -= frozen[i] ? target[i]! : items[i]!.basis;
    const weight = (i: number): number => (growing ? items[i]!.grow : items[i]!.shrink * items[i]!.basis);
    let total = 0;
    for (let i = 0; i < items.length; i++) if (!frozen[i]) total += weight(i);
    let violation = 0;
    const clampedBy: number[] = items.map(() => 0);
    for (let i = 0; i < items.length; i++) {
      if (frozen[i]) continue;
      const raw = items[i]!.basis + (total > 0 ? (free * weight(i)) / total : 0);
      const fit = clamp(raw, items[i]!);
      clampedBy[i] = fit - raw;
      violation += fit - raw;
      target[i] = fit;
    }
    for (let i = 0; i < items.length; i++) {
      if (frozen[i]) continue;
      if (violation === 0 || (violation > 0 && clampedBy[i]! > 0) || (violation < 0 && clampedBy[i]! < 0)) frozen[i] = true;
    }
  }
  return target;
}

/**
 * **The decision bar is ONE line of items** (D267 as the second fix pass amended
 * it). Every item is either one line that keeps its width (`flex: none` — the
 * engine's two buttons and Concede, widths as Chromium drew them) or at most two
 * lines that give way (`-webkit-line-clamp: 2` — the prompt from its 46ch floor,
 * the watching line from its own, the outlined-cards line down to 11em, the hint
 * to nothing, the notice kept up to 16em), and `.arena__decision` does not wrap,
 * so the bar is never taller than two lines of prompt. The numbers are headless
 * Chromium's at `human-ability-42`@1060 (`docs/evidence/play-distance-audit.md`
 * §11): the widest button labels in the corpus, Concede armed, the line heights,
 * the prompt's floor, and the mono face's advance for the hint and the notice.
 */
export const DECISION_BAR = Object.freeze({
  /** `.arena__decision`'s inline padding and border, and its block ones. */
  padInlinePx: 18,
  padBlockPx: 10,
  gapPx: 5.6,
  /** The bar's own cap: `min(1100px, 100% - 15rem)` of the layer's content box (`CUE_STRIP.reservePx` less the plate's 15rem is the layer's padding). */
  maxPx: 1100,
  /** One-line items: the engine's buttons (the corpus's widest labels) and Concede, both ways. */
  buttonPx: Object.freeze({ ok: 63.5, cancel: 69, widestOk: 105.8, widestCancel: 79.9, concede: 97.8, concedeArmed: 161.8 }),
  /** The prompt's floor, `min(46ch, 100%)` at its 12 px, and one line of it. */
  promptFloorPx: 342,
  promptLinePx: 18.2,
  /** The outlined-cards line: "click one of the 99 outlined cards" whole, its 11em floor, a line. */
  outlinedPx: 185,
  outlinedFloorPx: 132,
  outlinedLinePx: 16.8,
  /** The hint and the notice: 11 px mono in 0.35rem of padding a side; one line and two. */
  monoPx: 11 * 0.60205,
  messagePadPx: 11.2,
  messageLinePx: Object.freeze({ one: 18.6, two: 34 }),
  noticeMaxPx: 176,
  lines: 2,
});

/** What the bar carries, for {@link decisionBarOf}. */
export interface DecisionBarContent {
  promptChars: number;
  okPx: number;
  cancelPx: number;
  concedePx: number;
  outlined: boolean;
  hintChars: number | null;
  noticeChars: number | null;
}

/** The bar laid out on a viewport `widthPx` wide: each item's width and lines, and the bar's height. */
export function decisionBarOf(widthPx: number, c: DecisionBarContent): { widths: Record<string, number>; lines: Record<string, number>; heightPx: number } {
  const b = DECISION_BAR;
  const bar = Math.min(b.maxPx, stripsRowPx(widthPx));
  const names: string[] = [];
  const items: FlexItem[] = [];
  const add = (name: string, it: FlexItem): void => {
    names.push(name);
    items.push(it);
  };
  const inner = bar - b.padInlinePx;
  add('prompt', { basis: 0, grow: 1, shrink: 1, min: Math.min(b.promptFloorPx, inner), max: Infinity });
  add('ok', { basis: c.okPx, grow: 0, shrink: 0, min: 0, max: Infinity });
  add('cancel', { basis: c.cancelPx, grow: 0, shrink: 0, min: 0, max: Infinity });
  if (c.outlined) add('outlined', { basis: b.outlinedPx, grow: 0, shrink: 1, min: b.outlinedFloorPx, max: Infinity });
  add('concede', { basis: c.concedePx, grow: 0, shrink: 0, min: 0, max: Infinity });
  const message = (chars: number): number => chars * b.monoPx + b.messagePadPx;
  if (c.hintChars !== null) add('hint', { basis: message(c.hintChars), grow: 0, shrink: 1, min: 0, max: Infinity });
  if (c.noticeChars !== null) add('notice', { basis: message(c.noticeChars), grow: 0, shrink: 0, min: 0, max: b.noticeMaxPx });
  const sizes = flexSizes(items, inner - b.gapPx * (items.length - 1));
  const widths: Record<string, number> = {};
  const lines: Record<string, number> = {};
  let tallest = 0;
  names.forEach((name, i) => {
    const w = sizes[i]!;
    widths[name] = w;
    let n = 1;
    let px = 16.6;
    if (name === 'prompt') {
      n = Math.min(b.lines, Math.max(1, Math.ceil((c.promptChars * b.promptFloorPx) / 46 / Math.max(1, w))));
      px = n * b.promptLinePx;
    } else if (name === 'outlined') {
      n = w >= b.outlinedPx ? 1 : b.lines;
      px = n * b.outlinedLinePx;
    } else if (name === 'hint' || name === 'notice') {
      const need = message(name === 'hint' ? (c.hintChars ?? 0) : (c.noticeChars ?? 0));
      n = w >= need ? 1 : b.lines;
      px = n === 1 ? b.messageLinePx.one : b.messageLinePx.two;
    }
    lines[name] = n;
    tallest = Math.max(tallest, px);
  });
  return { widths, lines, heightPx: tallest + b.padBlockPx };
}

/**
 * **The credit keeps its words; the chip gives way** (D265 point 2 as the second
 * fix pass amended it). A shrink factor cannot rank two items — it is weighted by
 * each one's width, so the credit's 1 against the chip's 1,000 still took 0.3 px
 * off the credit at `human-sideboard-7`@1195 (648.3 → 648.0 at 1280 × 800) and
 * its ellipsis cut the Fan Content Policy's words. So `.arena__credit` does not
 * shrink (`flex: 0 0 auto`) and stops at the room the row leaves beside the
 * chip's floor; the chip (`flex: 0 1 auto`) gives way down to that floor —
 * `--inspect-floor`, `floorChars` of the mono face plus its padding and border —
 * whose key, "⌕ inspect · I", is a part that never shrinks. A credit longer than
 * its room gives way in its artist list only (`.arena__credit-lead`); its notice
 * (`.arena__credit-notice`, `noticePx` wide as Chromium drew it) never does.
 *
 * **No cap of the credit's own** (the third fix pass): M7's `max-inline-size:
 * 980px`, from when the credit stood alone on its row, stopped it sooner than
 * the chip's floor — at `villain-masters-of-evil-33`@209, 1600 × 1000, the artist
 * list was cut by 90 px while the chip still held 354 — so the credit's room is
 * the row less the chip's floor and nothing else.
 */
export const CREDIT_ROW = Object.freeze({
  keyChars: 13,
  floorChars: 14,
  monoAdvanceEm: 0.6021,
  fontPx: 11,
  chipPadPx: 14.4,
  chipBorderPx: 2,
  gapPx: 6.4,
  chipMaxPx: 560,
  /** "\u00a0· © Wizards of the Coast · Unofficial Fan Content", the table credit's notice. */
  noticePx: 249.9,
});

/** The chip's floor, CSS px: `--inspect-floor`. */
export function inspectFloorPx(): number {
  const r = CREDIT_ROW;
  return r.floorChars * r.monoAdvanceEm * r.fontPx + r.chipPadPx + r.chipBorderPx;
}

/** The credit row on a viewport `widthPx` wide, for a credit and a chip of these max-content widths (border-box). */
export function creditRowOf(widthPx: number, creditPx: number, chipPx: number): { credit: number; chip: number; creditCut: boolean } {
  const r = CREDIT_ROW;
  const row = Math.min(stripsRowPx(widthPx), creditPx + r.gapPx + Math.min(chipPx, r.chipMaxPx));
  const floor = inspectFloorPx();
  const [credit, chip] = flexSizes(
    [
      { basis: creditPx, grow: 0, shrink: 0, min: 0, max: row - floor - r.gapPx },
      // The flex BASE size is the content's, not clamped by the max: the shrink is weighted by it.
      { basis: chipPx, grow: 0, shrink: 1, min: floor, max: r.chipMaxPx },
    ],
    row - r.gapPx,
  );
  return { credit: credit!, chip: chip!, creditCut: credit! < creditPx - 0.05 };
}

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
 *
 * **Nothing a key does widens the row** (the third fix pass). The switcher was
 * measured with the director OFF, and the director drew its shot as text in its
 * button (" · Table", " · Opp. shoulder"): pressing `6` took the switcher from
 * 230.1 px to 283.1–336.0 and wrapped it under the cue strip at 1280, 1400,
 * 1840 and — for the longest shot — 1920 px, the column to 126.1 px (143.9 with
 * `I`, 146.3 beside a two-line prompt). The shot is a mark on its own view's
 * button now (`DecisionLayer.tsx`'s `ViewSwitcher`, a dashed border in place of
 * the solid one) and a name in the director's tooltip, so `switcherDirector` —
 * measured with the director on at each of its four shots — is the switcher's
 * own width. The widths are the widest the strips draw under every key the
 * sweep pressed: spectator on (its ✓; off is 13.3 px narrower), the cues
 * playing (the pause button's "⏸ cues"; "▶ cues" is 3.4 px narrower), every
 * view, the caption and the sound either way, the status at its widest.
 */
export const CUE_STRIP = Object.freeze({
  narrowBelowPx: 1400,
  labelsBelowPx: 1840,
  /** The status box, in `ch` of the strip's 11 px mono face. */
  statusCh: Object.freeze({ wide: 21, narrow: 6 }),
  /** Measured widths, CSS px: the cue strip in each form, and the switcher both ways with the director off and on. */
  px: Object.freeze({ wide: 892.1, narrow: 756.5, switcher: 230.1, switcherLabelled: 672, switcherDirector: 230.1, switcherDirectorLabelled: 672 }),
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
