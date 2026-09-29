/*
 * mtg-table — web/test/hud.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The arena's chrome column, held** (the play-distance audit, D265;
 * `web/src/arena/hud.ts`). Four things `node --test` can hold without a browser,
 * each checked against the numbers headless Chromium measured
 * (`docs/evidence/play-distance-audit.md`):
 *
 *   - the column fits `HUD_TOP_PX`: the layer mounts exactly THREE in-flow rows —
 *     the decision bar, the strips, the credit row — every other widget it mounts
 *     is positioned out of the flow, and the rows' measured heights with the
 *     stylesheet's gaps sum under the band every far-end pose is measured against
 *     (D85, D100). The control is the column before the audit: the inspect chip on
 *     a row of its own, 137 px at a live seat.
 *   - the cue strip's status is a FIXED width — the box in `styles.css` is
 *     `CUE_STRIP.statusCh` characters, and `cueStatusOf` never writes more — so the
 *     strip is as wide playing as idle;
 *   - the cue strip and the camera switcher keep ONE row from 1280 px, at the
 *     narrow form, the wide form and the labelled switcher's breakpoints, with the
 *     strip's measured widths; the control is the strip before the audit, which
 *     took two rows at 1280 × 800 idle and while cues played at 1400;
 *   - the strip's contents are the ones measured: four buttons, the speed select,
 *     five checkboxes, the status, and a switcher of five views, the director and
 *     spectator — a control added to either fails here until the row is measured
 *     again;
 *   - (the fix pass) the engine's prompt is at most two lines, whatever it says:
 *     every distinct prompt of the committed corpus through a per-line model,
 *     Quake's 250-character targeting prompt the red case — 167 px of column in
 *     Chromium before the clamp;
 *   - (the fix pass) the credit keeps its room until the inspect chip is down to
 *     its label, the status sits behind a rule of its own, and the turn-order
 *     bar's head holds "R99 their turn" on one line.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { VIEWS } from '../src/arena/camera.ts';
import { CUE_STRIP, HUD_COLUMN_PX, HUD_PROMPT, TURN_BAR, cueStatusOf, hudColumnPx, promptBarPx, stripsRowPx } from '../src/arena/hud.ts';
import { HUD_TOP_PX } from '../src/arena/layout.ts';

const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const css = read('../src/styles.css');
const arena = read('../src/arena/Arena.tsx');
const decision = read('../src/arena/DecisionLayer.tsx');

/** A rule's declarations: the first `<selector> {` that starts a selector (not the tail of a list). */
function rule(selector: string, within: string = css): Record<string, string> {
  let at = -1;
  for (let from = 0; ; from = at + 1) {
    at = within.indexOf(`\n${selector} {`, from);
    if (at < 0) break;
    const before = within.slice(within.lastIndexOf('\n', at - 1) + 1, at).trim();
    if (before === '' || before.endsWith('}') || before.endsWith('*/')) break;
  }
  assert.ok(at >= 0, `styles.css has no ${selector} rule`);
  const body = within.slice(within.indexOf('{', at) + 1, within.indexOf('}', at)).replace(/\/\*[\s\S]*?\*\//g, '');
  const out: Record<string, string> = {};
  for (const declaration of body.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon > 0) out[declaration.slice(0, colon).trim()] = declaration.slice(colon + 1).trim();
  }
  return out;
}
const px = (value: string | undefined): number => {
  const m = /^([\d.]+)(rem|px)$/.exec(value ?? '');
  assert.ok(m !== null, `not a length in rem or px: ${String(value)}`);
  return Number(m[1]) * (m[2] === 'rem' ? 16 : 1);
};
/** The body of `@media (max-width: <n>px) { … }`, or null. */
function media(maxWidth: number): string | null {
  const at = css.indexOf(`@media (max-width: ${String(maxWidth)}px) {`);
  if (at < 0) return null;
  let depth = 0;
  for (let i = css.indexOf('{', at); i < css.length; i++) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return '\n' + css.slice(css.indexOf('{', at) + 1, i);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 1. The column fits its band
// ---------------------------------------------------------------------------

test('hud: the layer mounts three in-flow rows, and their measured heights sum under HUD_TOP_PX — the fourth row was the control', () => {
  // The layer's own JSX block, as liveness.test.ts finds it.
  const open = arena.indexOf('<div className="arena__layer">');
  assert.ok(open > 0, 'Arena.tsx no longer mounts `.arena__layer`');
  const indent = ' '.repeat(arena.slice(0, open).split('\n').pop()!.length);
  const block = arena.slice(open, arena.indexOf(`\n${indent}</div>`, open));
  // Its direct children: an element or component at exactly one indent step in.
  const step = indent + '  ';
  const lines = block.split('\n');
  const children: string[] = [];
  const named = (line: string): string | null => {
    const m = /<([A-Za-z][\w.]*)(?:\s+className="([^"]+)")?/.exec(line);
    return m === null ? null : m[2] !== undefined ? `${m[1]!}.${m[2]}` : m[1]!;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.startsWith(step) || line.startsWith(step + ' ')) continue;
    const rest = line.slice(step.length);
    if (rest.startsWith('<') && !rest.startsWith('</')) children.push(named(rest)!);
    // `{cond && <X …/>}` on one line, or `{cond && (` with the element on the next.
    else if (/^\{[^}]*&& </.test(rest)) children.push(named(rest.slice(rest.indexOf('&& <') + 3))!);
    else if (/^\{[^}]*&& \($/.test(rest)) children.push(named(lines[i + 1] ?? '') ?? '?');
  }
  assert.deepEqual(
    children,
    ['DecisionLayer', 'div.arena__strips', 'div.arena__creditrow', 'CaptionStrip', 'HotkeysOverlay'],
    'the arena layer mounts something new — an in-flow widget is a fourth row over the far end of the table (D265): put it on an existing row, or position it out of the flow, and measure the column again',
  );
  // Everything but the three rows is positioned out of the flow: the caption and
  // the overlay, and DecisionLayer's own plates, turn-order bar and game-over row.
  assert.equal(rule('.arena__caption')['position'], 'absolute');
  assert.match(rule('.overlay')['position'] ?? '', /^(fixed|absolute)$/);
  for (const cls of ['.arena__seats', '.arena__phases', '.arena__over']) {
    assert.match(rule(cls)['position'] ?? '', /^(fixed|absolute)$/, `${cls} is in the flow of the layer — it would be a row of the column`);
    assert.ok(decision.includes(`className="${cls.slice(1)}"`), `DecisionLayer no longer mounts ${cls}`);
  }
  // The gaps are the stylesheet's.
  assert.equal(px(rule('.arena__layer')['padding']?.split(/\s+/)[0]), HUD_COLUMN_PX.layerPad);
  assert.equal(px(rule('.arena__decision')['margin-block-end']), HUD_COLUMN_PX.decisionGap);
  assert.equal(px(rule('.arena__cues')['margin-block-end']), HUD_COLUMN_PX.stripsGap);
  assert.equal(px(rule('.arena__views')['margin-block-end']), HUD_COLUMN_PX.stripsGap);
  // The credit row: the credit and the chip side by side, the chip with no block margin of its own.
  assert.equal(rule('.arena__creditrow')['display'], 'flex');
  assert.equal(rule('.arena__inspect')['margin-block-start'], undefined, 'the inspect chip is back on a row of its own');
  // The chip gives way before the credit (D265 point 2): a shrink factor is
  // weighted by the item's width, so 4 against 1 cut the credit to 586 px while
  // the chip kept 429 of its 560 at 1280 (the fix pass). Now the credit keeps its
  // whole width until the chip is down to its label (measured: 648 of 648 px
  // beside a 367-px chip at human-sideboard-7@1195, 928 of 1,029 beside the chip
  // at its 86-px floor at villain-doom-248 seen from seat 1 @390).
  const [chipGrow, chipShrink] = (rule('.arena__inspect')['flex'] ?? '').split(/\s+/).map(Number);
  const [, creditShrink] = (rule('.arena__credit')['flex'] ?? '').split(/\s+/).map(Number);
  assert.equal(chipGrow, 0);
  assert.ok(chipShrink! >= 100 * creditShrink!, `the chip's shrink (${String(chipShrink)}) does not dwarf the credit's (${String(creditShrink)}) — both give way at once`);
  assert.equal(rule('.arena__inspect')['min-inline-size'], '13ch', 'the chip gives way down to its label, "⌕ inspect · I"');
  assert.match(block, /<div className="arena__creditrow">\s*<ArtCredit [^>]*\/>\s*<InspectChip [^>]*\/>\s*<\/div>/);

  const column = hudColumnPx();
  console.log(`  the chrome column at its worst (a prompt at its two lines, whatever the engine writes): ${column.toFixed(1)} px of HUD_TOP_PX ${String(HUD_TOP_PX)}`);
  assert.ok(column <= HUD_TOP_PX, `the chrome column is ${column.toFixed(1)} px, past HUD_TOP_PX (${String(HUD_TOP_PX)})`);
  // THE CONTROL: D241's chip on a row of its own under the credit (a 0.25rem margin and its 21 px).
  const before = column + 4 + 21;
  assert.ok(before > HUD_TOP_PX, 'the four-row column fits the band — the control has no teeth');
});

// ---------------------------------------------------------------------------
// 2. A fixed-width status
// ---------------------------------------------------------------------------

test('hud: the cue strip’s status never writes past its fixed box, in either form', () => {
  let widest = 0;
  let narrowest = 0;
  for (const pending of [0, 1, 2, 9, 10, 99, 100, 101, 999, 12_345]) {
    for (const ms of [0, 1, 999, 4155, 9_999, 10_000, 99_999, 100_000, 1_234_567, -3, Number.NaN]) {
      const s = cueStatusOf(pending, ms);
      widest = Math.max(widest, [...s.wide].length);
      narrowest = Math.max(narrowest, [...s.narrow].length);
      assert.ok([...s.wide].length <= CUE_STRIP.statusCh.wide, `"${s.wide}" is past ${String(CUE_STRIP.statusCh.wide)}ch`);
      assert.ok([...s.narrow].length <= CUE_STRIP.statusCh.narrow, `"${s.narrow}" is past ${String(CUE_STRIP.statusCh.narrow)}ch`);
      assert.ok(s.title.length > 0);
    }
  }
  assert.equal(widest, CUE_STRIP.statusCh.wide, 'the wide box is larger than any status needs');
  assert.equal(cueStatusOf(0, 0).wide, 'idle');
  assert.equal(cueStatusOf(12, 4155).wide, '12 steps · 4155 ms');
  assert.equal(cueStatusOf(1, 800).wide, '1 step · 800 ms');
  assert.equal(cueStatusOf(12, 4155).narrow, '4.2 s');
  // The boxes are the stylesheet's, and they cut rather than grow.
  assert.equal(rule('.arena__cues-status-wide')['inline-size'], `${String(CUE_STRIP.statusCh.wide)}ch`);
  assert.equal(rule('.arena__cues-status-narrow')['inline-size'], `${String(CUE_STRIP.statusCh.narrow)}ch`);
  const both = rule('.arena__cues-status-wide,\n.arena__cues-status-narrow');
  assert.equal(both['overflow'], 'hidden');
  assert.equal(both['white-space'], 'nowrap');
  // Behind a rule of its own (the fix pass): beside the caption checkbox with
  // nothing between them it read as that checkbox's label, "caption idle".
  assert.match(rule('.arena__cues-status')['border-inline-start'] ?? '', /^1px solid /, 'the status has no rule before it — it reads as the caption checkbox’s label');
  assert.ok(px(rule('.arena__cues-status')['padding-inline-start']) > 0);
  assert.match(arena.slice(arena.indexOf('function CueControls('), arena.indexOf('function ArtCredit(')), /caption\s*<\/label>\s*<span className="arena__cues-status muted"/, 'the status no longer follows the caption checkbox — look at the strip again');
  // The component writes the formatter's two forms into the two boxes, and nothing else.
  const controls = arena.slice(arena.indexOf('function CueControls('), arena.indexOf('function ArtCredit('));
  assert.match(controls, /const status = cueStatusOf\(queue\.pendingSteps, queue\.totalRemainingMs\(\)\);/);
  assert.match(controls, /<span className="arena__cues-status-wide">\{status\.wide\}<\/span>/);
  assert.match(controls, /<span className="arena__cues-status-narrow">\{status\.narrow\}<\/span>/);
});

// ---------------------------------------------------------------------------
// 3. One row, from 1280 px
// ---------------------------------------------------------------------------

test('hud: the cue strip and the switcher keep one row from 1280 px, idle and playing — the strip before the audit was the control', () => {
  const { px: w, gap, narrowBelowPx, labelsBelowPx } = CUE_STRIP;
  // The breakpoints are the stylesheet's.
  const narrow = media(narrowBelowPx - 1);
  assert.ok(narrow !== null, `styles.css has no @media (max-width: ${String(narrowBelowPx - 1)}px)`);
  assert.equal(rule('.arena__cues-speed,\n.arena__cues-status-wide', narrow.replace(/\n {2}/g, '\n'))['display'], 'none');
  const labels = media(labelsBelowPx - 1);
  assert.ok(labels !== null, `styles.css has no @media (max-width: ${String(labelsBelowPx - 1)}px)`);
  assert.match(labels, /\.arena__view-label,\s*\.arena__views-title\s*\{\s*display: none;/);
  assert.equal(px(rule('.arena__strips')['column-gap']), gap);
  assert.equal(rule('.arena__strips')['max-inline-size'], 'calc(100% - 15rem)');
  assert.equal(rule('.arena__cues')['gap'], '0.25rem');
  const need = (strip: number, switcher: number): number => strip + gap + switcher;
  const rows: Array<[string, number, number]> = [
    ['1280 px, narrow, keys', need(w.narrow, w.switcher), stripsRowPx(1280)],
    [`${String(narrowBelowPx - 1)} px, narrow, keys`, need(w.narrow, w.switcher), stripsRowPx(narrowBelowPx - 1)],
    [`${String(narrowBelowPx)} px, wide, keys`, need(w.wide, w.switcher), stripsRowPx(narrowBelowPx)],
    [`${String(labelsBelowPx)} px, wide, labels`, need(w.wide, w.switcherLabelled), stripsRowPx(labelsBelowPx)],
  ];
  for (const [where, strips, row] of rows) {
    console.log(`  ${where}: the strips need ${strips.toFixed(1)} px of a ${row.toFixed(1)}-px row`);
    assert.ok(strips <= row, `${where}: the strips need ${strips.toFixed(1)} px of a ${row.toFixed(1)}-px row — two rows`);
  }
  // THE CONTROL: the strip before the audit (0.35rem gaps, the status growing
  // from "idle" to "12 steps · 4155 ms") — 789.7 px idle, 882.4 playing — with the
  // switcher's 5.6-px gap (0.35rem) against the same rows.
  assert.ok(789.7 + 6.4 + w.switcher > stripsRowPx(1280), 'the old strip fits at 1280 idle — the control has no teeth');
  assert.ok(882.4 + 6.4 + w.switcher > stripsRowPx(1280), 'the old strip fits at 1280 playing — the control has no teeth');
});

test('hud: the strip and the switcher hold the controls that were measured', () => {
  const controls = arena.slice(arena.indexOf('function CueControls('), arena.indexOf('function ArtCredit('));
  const count = (re: RegExp): number => (controls.match(re) ?? []).length;
  assert.equal(count(/<button\b/g), 4, 'the cue strip’s buttons changed — measure its width again (arena/hud.ts CUE_STRIP.px)');
  assert.equal(count(/<select\b/g), 1, 'the cue strip’s speed select changed — measure its width again');
  assert.equal(count(/type="checkbox"/g), 5, 'the cue strip’s checkboxes changed — measure its width again');
  assert.equal(count(/className="arena__cues-status /g), 1);
  assert.match(controls, /<span className="arena__cues-speed">speed<\/span>/);
  // The switcher: the five views and the director (`viewItems`), and spectator.
  assert.equal(VIEWS.length, 5, 'a view was added — the switcher is wider: measure it again (CUE_STRIP.px.switcher)');
  const items = arena.slice(arena.indexOf('const viewItems = useMemo('), arena.indexOf('const queue = useMemo('));
  assert.equal((items.match(/id: '/g) ?? []).length, 1, 'the switcher gained an item besides the views and the director');
});

// ---------------------------------------------------------------------------
// 4. The engine's prompt, two lines at most (the fix pass)
// ---------------------------------------------------------------------------

/** Every distinct `input` prompt of the committed corpus, with where it first appears. */
function corpusPrompts(): Map<string, string> {
  const dir = fileURLToPath(new URL('../../fixtures/games/', import.meta.url));
  const out = new Map<string, string>();
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort()) {
    readFileSync(dir + name, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        if (!line.includes('"type":"input"')) return;
        const prompt = (JSON.parse(line) as { body?: { prompt?: unknown } }).body?.prompt;
        if (typeof prompt === 'string' && prompt !== '' && !out.has(prompt)) out.set(prompt, `${name}@${String(index)}`);
      });
  }
  return out;
}

test('hud: the engine’s prompt is at most two lines, whatever it says — every prompt of the corpus through a per-line model, Quake’s targeting prompt the red case', () => {
  // The stylesheet clamps it at HUD_PROMPT.lines, and it starts from nothing and grows into the bar's room.
  const prompt = rule('.arena__decision .prompt');
  assert.equal(prompt['-webkit-line-clamp'], String(HUD_PROMPT.lines), 'the prompt is not clamped at HUD_PROMPT.lines');
  assert.equal(prompt['display'], '-webkit-box');
  assert.equal(prompt['-webkit-box-orient'], 'vertical');
  assert.equal(prompt['overflow'], 'hidden');
  assert.equal(prompt['flex'], '1 1 0', 'a prompt with a basis of its own pushes its buttons onto a second line of the bar when it is short (46ch did, on 27 of the corpus’s prompts at 1280 px)');
  assert.equal(prompt['max-inline-size'], undefined, 'a width cap on the prompt: a long one wraps into more lines than the bar has room for');
  // Whole on hover, whole in its tooltip, verbatim in the DOM.
  assert.equal(rule('.arena__decision .prompt:hover')['-webkit-line-clamp'], 'unset');
  assert.match(decision, /<p className="prompt" role="status" title=\{input\.prompt\}>\s*\{input\.prompt\}\s*<\/p>/);
  // The bar's two-line height is the column's row.
  assert.ok(Math.abs(promptBarPx(Number.POSITIVE_INFINITY) - HUD_COLUMN_PX.decision) < 1, 'HUD_COLUMN_PX.decision is not a prompt at its two lines');

  const prompts = corpusPrompts();
  const rest = hudColumnPx() - HUD_COLUMN_PX.decision;
  let clamped = 0;
  let pastBefore = 0;
  let longest = ['', ''];
  for (const [text, where] of prompts) {
    const column = rest + promptBarPx(text.length);
    assert.ok(column <= HUD_TOP_PX, `${where}: a ${String(text.length)}-character prompt takes the column to ${column.toFixed(1)} px`);
    if (promptBarPx(text.length, Number.POSITIVE_INFINITY) > promptBarPx(text.length)) clamped += 1;
    if (rest + promptBarPx(text.length, Number.POSITIVE_INFINITY) > HUD_TOP_PX) pastBefore += 1;
    if (text.length > longest[0]!.length) longest = [text, where];
  }
  console.log(
    `  ${String(prompts.size)} distinct prompts in the corpus; the model cuts ${String(clamped)} at ${String(HUD_PROMPT.lines)} lines of ${String(HUD_PROMPT.charsPerLine)} characters, ` +
      `and unclamped ${String(pastBefore)} would take the column past HUD_TOP_PX — the longest, ${String(longest[0]!.length)} characters at ${longest[1]!}, to ` +
      `${(rest + promptBarPx(longest[0]!.length, Number.POSITIVE_INFINITY)).toFixed(1)} px (Chromium drew it at 167.1 before the clamp, 112.5 after)`,
  );
  assert.ok(prompts.size > 300, `the corpus has ${String(prompts.size)} distinct prompts`);
  // THE RED CASE: Quake's targeting trigger, unclamped, is past the band — in the model as it was in the browser.
  const quake = [...prompts.keys()].find((t) => t.startsWith('Quake, Agent of S.H.I.E.L.D.') && t.includes('Select target creature or land'));
  assert.ok(quake !== undefined, 'the corpus lost Quake’s targeting prompt');
  assert.ok(rest + promptBarPx(quake.length, Number.POSITIVE_INFINITY) > HUD_TOP_PX, 'Quake’s prompt fits the band unclamped — the red case has no teeth');
  assert.ok(pastBefore > 0 && clamped >= pastBefore);
});

test('hud: the turn-order bar’s head holds "R99 their turn" on one line — at the bar’s own 10.5 px it did not', () => {
  const bar = rule('.arena__phases');
  const head = rule('.arena__phases-head');
  assert.equal(px(bar['inline-size']), TURN_BAR.widthPx);
  assert.equal(px(bar['padding']?.split(/\s+/)[1] ?? bar['padding']), TURN_BAR.padInlinePx);
  assert.equal(px(head['font-size']), TURN_BAR.headFontPx);
  assert.equal(head['white-space'], 'nowrap');
  assert.match(decision, /yours \? 'your turn' : 'their turn'/, 'the head’s words changed — measure it again (TURN_BAR.longestHead)');
  const room = TURN_BAR.widthPx - 2 * TURN_BAR.padInlinePx;
  const width = (fontPx: number): number => [...TURN_BAR.longestHead].length * TURN_BAR.monoAdvanceEm * fontPx;
  console.log(`  "${TURN_BAR.longestHead}": ${width(TURN_BAR.headFontPx).toFixed(1)} px of the head's ${String(room)}`);
  assert.ok(width(TURN_BAR.headFontPx) <= room, `"${TURN_BAR.longestHead}" is ${width(TURN_BAR.headFontPx).toFixed(1)} px, past the head's ${String(room)}`);
  // THE CONTROL: the head at the bar's 10.5 px, which cut every opponent's turn from round 10.
  assert.ok(width(px(bar['font-size'])) > room, 'the head fits at the bar’s own size — the control has no teeth');
});
