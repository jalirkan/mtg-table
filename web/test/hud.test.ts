/*
 * mtg-table — web/test/hud.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The arena's chrome column, held** (the play-distance audit, D265–D267;
 * `web/src/arena/hud.ts`). What `node --test` can hold without a browser,
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
 *   - (the fix pass) the status sits behind a rule of its own, and the turn-order
 *     bar's head holds "R99 their turn" on one line;
 *   - (fix pass 2) the credit is DRAWN whole while the chip is above its floor —
 *     its rendered width through `hud.ts`'s `flexSizes`, the CSS flexible-lengths
 *     algorithm, held to three layouts Chromium drew — its notice never cut, and
 *     the chip's key whole at its floor; the first fix pass's shrink ratio (the
 *     credit 648.3 → 648.0 px, "…Fan Conte…") is the control;
 *   - (fix pass 2) the decision bar is ONE line of items, each one line that keeps
 *     its width or two lines that give way, so the longest prompt, the longest
 *     hint and the longest notice at once — and 400-character ones — hold it at
 *     two lines at 1280 and 1600 px; the wrapping bar (`human-ability-42`@1060
 *     with `I` pressed: 70.5 px, the column 136.7) is the control;
 *   - (fix pass 3) the director's shot widens nothing: the one-row check runs
 *     with the director on at every breakpoint, the switcher the width measured
 *     at each of its shots — and the shot drawn as text in the director's button,
 *     the longest one the director can cut to (" · Opp. shoulder") modelled from
 *     `camera.ts`'s own shot list, is the control that wraps (the column 146.3 px
 *     in Chromium); `arena-hud.test.tsx` renders the switcher at every shot;
 *   - (fix pass 3) the credit is cut only when the chip is at its floor — no cap
 *     of its own stops it sooner; M7's 980 px (the artist list cut by 90 px at
 *     `villain-masters-of-evil-33`@209, 1600 × 1000, the chip at 354) is the
 *     control; and the notice's tooltip carries the engine's text.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { BEAT_RANK, VIEWS, VIEW_BY_ID, startShot, viewForBeat, type BeatKind, type ViewId } from '../src/arena/camera.ts';
import {
  CREDIT_ROW,
  CUE_STRIP,
  DECISION_BAR,
  HUD_COLUMN_PX,
  HUD_PROMPT,
  TURN_BAR,
  creditRowOf,
  cueStatusOf,
  decisionBarOf,
  flexSizes,
  hudColumnPx,
  inspectFloorPx,
  promptBarPx,
  stripsRowPx,
} from '../src/arena/hud.ts';
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
  // The credit keeps its words; the chip gives way (D265 point 2, amended by the
  // second fix pass). A shrink factor cannot rank two items — it is weighted by
  // width, so the credit's 1 against the chip's 1,000 still cut the credit (and
  // its ellipsis the Fan Content Policy's words): the credit does not shrink at
  // all, and stops at the room the row leaves beside the chip's floor.
  assert.equal(rule('.arena__credit')['flex'], '0 0 auto', 'the credit shrinks — any shrink at all is an ellipsis over its last words');
  // No cap of the credit's own (fix pass 3): M7's 980px cut the artist list while the chip still held 354 px.
  assert.equal(rule('.arena__credit')['max-inline-size'], 'calc(100% - var(--inspect-floor) - 0.4rem)', 'the credit has a cap of its own — it is cut while the chip can still give way');
  assert.equal(rule('.arena__inspect')['flex'], '0 1 auto');
  assert.equal(rule('.arena__inspect')['min-inline-size'], 'var(--inspect-floor)');
  assert.equal(
    rule('.arena__creditrow')['--inspect-floor'],
    `calc(${String(CREDIT_ROW.floorChars)} * ${String(CREDIT_ROW.monoAdvanceEm)}em + 0.9rem + 2px)`,
    'the chip’s floor is not CREDIT_ROW’s',
  );
  assert.equal(px(rule('.arena__creditrow')['column-gap']), CREDIT_ROW.gapPx);
  assert.equal(px(rule('.arena__inspect')['padding']?.split(/\s+/)[1]) * 2, CREDIT_ROW.chipPadPx);
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

test('hud: the cue strip and the switcher keep one row from 1280 px, idle, playing and with the director on — the strip before the audit and the shot as text were the controls', () => {
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
  // The director on (fix pass 3): the switcher as Chromium drew it at each of the
  // director's four shots, at every breakpoint — it had been measured with the
  // director off, and its shot, drawn as text, wrapped the row.
  rows.push(
    ['1280 px, narrow, keys, the director on', need(w.narrow, w.switcherDirector), stripsRowPx(1280)],
    [`${String(narrowBelowPx - 1)} px, narrow, keys, the director on`, need(w.narrow, w.switcherDirector), stripsRowPx(narrowBelowPx - 1)],
    [`${String(narrowBelowPx)} px, wide, keys, the director on`, need(w.wide, w.switcherDirector), stripsRowPx(narrowBelowPx)],
    [`${String(labelsBelowPx - 1)} px, wide, keys, the director on`, need(w.wide, w.switcherDirector), stripsRowPx(labelsBelowPx - 1)],
    [`${String(labelsBelowPx)} px, wide, labels, the director on`, need(w.wide, w.switcherDirectorLabelled), stripsRowPx(labelsBelowPx)],
    ['1920 px, wide, labels, the director on', need(w.wide, w.switcherDirectorLabelled), stripsRowPx(1920)],
  );
  for (const [where, strips, row] of rows) {
    console.log(`  ${where}: the strips need ${strips.toFixed(1)} px of a ${row.toFixed(1)}-px row`);
    assert.ok(strips <= row, `${where}: the strips need ${strips.toFixed(1)} px of a ${row.toFixed(1)}-px row — two rows`);
  }
  // The director's shot is not text in the switcher: on, it is as wide as off.
  assert.ok(w.switcherDirector <= w.switcher && w.switcherDirectorLabelled <= w.switcherLabelled, 'the switcher is wider with the director on — its shot is text in the row again (DecisionLayer.tsx’s ViewSwitcher)');
  // THE CONTROL (fix pass 3): the shot as text in the director's button — every
  // shot the director can cut to (`camera.ts`'s shot list: every beat from both
  // seats, and where it starts), the longest with its separator, in the strip's
  // 11 px mono face. Chromium drew " · Table" at 283.1 px of switcher and
  // " · Opp. shoulder" at 336.0; it wrapped at 1280, 1400, 1840 and 1920 px.
  const shots = new Set<ViewId>([startShot(0).view]);
  for (const kind of Object.keys(BEAT_RANK) as BeatKind[]) for (const seat of ['you', 'opp', null] as const) shots.add(viewForBeat({ kind, seat }));
  const longest = Math.max(...[...shots].map((id) => [...` · ${VIEW_BY_ID[id].label}`].length));
  const asText = longest * CREDIT_ROW.monoAdvanceEm * 11;
  console.log(`  the director's shots: ${[...shots].map((id) => VIEW_BY_ID[id].label).join(', ')}; the longest as text is ${String(longest)} characters, ${asText.toFixed(1)} px — the switcher ${(w.switcher + asText).toFixed(1)} (Chromium drew 336.0)`);
  assert.ok(Math.abs(w.switcher + asText - 336) < 0.5, `the shot-as-text model (${(w.switcher + asText).toFixed(1)}) is not Chromium's 336.0`);
  assert.ok(shots.size >= 4, `the director cuts to ${String(shots.size)} views`);
  for (const [where, strips, row] of [
    ['1280 px', need(w.narrow, w.switcher + asText), stripsRowPx(1280)],
    [`${String(narrowBelowPx)} px`, need(w.wide, w.switcher + asText), stripsRowPx(narrowBelowPx)],
    [`${String(labelsBelowPx)} px, labels`, need(w.wide, w.switcherLabelled + asText), stripsRowPx(labelsBelowPx)],
    ['1920 px, labels', need(w.wide, w.switcherLabelled + asText), stripsRowPx(1920)],
  ] as const) {
    assert.ok(strips > row, `${where}: the shot as text fits the row (${strips.toFixed(1)} of ${row.toFixed(1)}) — the control has no teeth`);
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

// ---------------------------------------------------------------------------
// 5. The second fix pass: the credit's rendered width, and a bar of one line
// ---------------------------------------------------------------------------

test('hud: the credit is drawn whole while the chip is above its floor, its notice never cut, and the chip’s key whole at the floor — rendered widths, the shrink ratio its control', () => {
  // The model is the CSS flexible-lengths algorithm over Chromium's widths; it
  // agrees with Chromium's own layout where the verifier looked
  // (`human-sideboard-7`@1195 at 1280 × 800: the credit 648.3 px, the chip 697 —
  // "⌕ inspect · I" and its reason — laid out 648.3 and 366.1; `human-ability-42`@1060:
  // a 960-px credit capped at 905.3 beside the chip's 109.1-px floor; and the
  // audit's own first cut, 1 against the chip's 4, which Chromium laid out 585.7
  // and 428.7 — the case where the shrink's weighting by width shows).
  const sideboard = creditRowOf(1280, 648.3, 697);
  console.log(`  human-sideboard-7@1195, 1280 × 800: the credit ${sideboard.credit.toFixed(1)} of its 648.3 px, the chip ${sideboard.chip.toFixed(1)}`);
  assert.equal(sideboard.creditCut, false, `the credit is drawn ${sideboard.credit.toFixed(2)} px of its 648.3 — an ellipsis over its last words`);
  assert.ok(Math.abs(sideboard.chip - 366.1) < 0.5, `the model's chip (${sideboard.chip.toFixed(1)}) is not Chromium's 366.1`);
  const quake = creditRowOf(1280, 960, 697);
  assert.ok(Math.abs(quake.credit - 905.3) < 0.5 && Math.abs(quake.chip - 109.1) < 0.5, `the model (${quake.credit.toFixed(1)}, ${quake.chip.toFixed(1)}) is not Chromium's 905.3 beside 109.1`);
  // Whole wherever it fits beside the chip's floor: every credit width up to the
  // room the row leaves, at every viewport from 1280 to 1920 px — and cut only
  // when the chip is at its floor, whatever its length (fix pass 3: no cap of its own).
  const cutAboveFloor = (width: number, credit: number, chip: number, lay: (w: number, c: number, k: number) => { credit: number; chip: number; creditCut: boolean }): boolean => {
    const laid = lay(width, credit, chip);
    return laid.creditCut && laid.chip > inspectFloorPx() + 0.05;
  };
  for (let width = 1280; width <= 1920; width += 32) {
    const room = stripsRowPx(width) - inspectFloorPx() - CREDIT_ROW.gapPx;
    for (let credit = 200; credit <= room; credit += 25) {
      for (const chip of [inspectFloorPx(), 300, 697, 1200]) {
        const laid = creditRowOf(width, credit, chip);
        assert.equal(laid.creditCut, false, `${String(width)} px: a ${String(credit)}-px credit beside a ${String(chip)}-px chip is cut to ${laid.credit.toFixed(2)}`);
        assert.ok(laid.chip >= inspectFloorPx() - 0.01, `${String(width)} px: the chip below its floor`);
      }
    }
    for (let credit = 200; credit <= 2000; credit += 50) {
      for (const chip of [inspectFloorPx(), 300, 697, 1200]) {
        assert.equal(cutAboveFloor(width, credit, chip, creditRowOf), false, `${String(width)} px: a ${String(credit)}-px credit is cut while the ${String(chip)}-px chip is above its floor`);
      }
    }
    // A credit longer than its room gives way in its artist list only: the notice and Scryfall's opening words fit whatever it is cut to.
    assert.ok(creditRowOf(width, 2000, 697).credit >= CREDIT_ROW.noticePx + 200, `${String(width)} px: a long credit is cut into its notice`);
  }
  // The verifier's frame (fix pass 3): `villain-masters-of-evil-33`@209's table
  // credit, 1070.4 px, beside the inert chip — whole from 1500 px (Chromium: 1070.4
  // beside 264.1 at 1600 × 1000), and at 1366 × 768 cut only with the chip at its
  // floor (991.3 beside 109.1).
  const masters1600 = creditRowOf(1600, 1070.4, 697);
  assert.equal(masters1600.creditCut, false, `villain-masters-of-evil-33@209, 1600 px: the credit is cut to ${masters1600.credit.toFixed(1)}`);
  assert.ok(Math.abs(masters1600.chip - 264.1) < 0.5, `the model's chip (${masters1600.chip.toFixed(1)}) is not Chromium's 264.1`);
  const masters1366 = creditRowOf(1366, 1070.4, 697);
  assert.ok(Math.abs(masters1366.credit - 991.3) < 0.5 && Math.abs(masters1366.chip - 109.1) < 0.5, `the model (${masters1366.credit.toFixed(1)}, ${masters1366.chip.toFixed(1)}) is not Chromium's 991.3 beside 109.1`);
  // THE CONTROL: M7's 980-px cap on the credit, which Chromium laid out 980 beside
  // 354.4 at 1600 px — the artist list cut by 90 px while the chip held 354.
  const capped = (width: number, credit: number, chip: number): { credit: number; chip: number; creditCut: boolean } => {
    const row = Math.min(stripsRowPx(width), credit + CREDIT_ROW.gapPx + Math.min(chip, CREDIT_ROW.chipMaxPx));
    const [c, k] = flexSizes(
      [
        { basis: credit, grow: 0, shrink: 0, min: 0, max: Math.min(980, row - inspectFloorPx() - CREDIT_ROW.gapPx) },
        { basis: chip, grow: 0, shrink: 1, min: inspectFloorPx(), max: CREDIT_ROW.chipMaxPx },
      ],
      row - CREDIT_ROW.gapPx,
    );
    return { credit: c!, chip: k!, creditCut: c! < credit - 0.05 };
  };
  const cappedMasters = capped(1600, 1070.4, 697);
  assert.ok(Math.abs(cappedMasters.credit - 980) < 0.05 && Math.abs(cappedMasters.chip - 354.4) < 0.5, `the capped model (${cappedMasters.credit.toFixed(1)}, ${cappedMasters.chip.toFixed(1)}) is not Chromium's 980 beside 354.4`);
  assert.ok(cutAboveFloor(1600, 1070.4, 697, capped), 'the 980-px cap draws the credit whole beside a chip above its floor — the control has no teeth');
  assert.equal(rule('.arena__credit-notice')['flex'], 'none', 'the credit’s notice gives way — the Fan Content Policy’s words are what an ellipsis cuts first');
  assert.equal(rule('.arena__credit-lead')['text-overflow'], 'ellipsis');
  assert.equal(rule('.arena__credit-lead')['min-inline-size'], '0');
  assert.equal(rule('.arena__credit')['text-overflow'], undefined, 'an ellipsis over the whole credit cuts its notice');
  const credit = arena.slice(arena.indexOf('function ArtCredit('), arena.indexOf('function openInspect('));
  assert.equal((credit.match(/<span className="arena__credit-lead">/g) ?? []).length, 2, 'both credits — a card’s and the table’s — open with the part that gives way');
  assert.equal((credit.match(/<span className="arena__credit-notice">\{CREDIT_NOTICE_(CARD|TABLE)\}<\/span>/g) ?? []).length, 2, 'both credits close with their notice');
  assert.match(credit, /const CREDIT_NOTICE_TABLE = '\\u00a0· © Wizards of the Coast · Unofficial Fan Content';/);
  // The chip's key is a part that never shrinks, and the floor holds it whole.
  assert.equal(rule('.arena__inspect-key')['flex'], 'none');
  assert.equal(rule('.arena__inspect-what')['text-overflow'], 'ellipsis');
  assert.equal(rule('.arena__inspect')['text-overflow'], undefined, 'an ellipsis over the whole chip eats its key at the floor ("⌕ inspect · …")');
  const chip = arena.slice(arena.indexOf('function InspectChip('), arena.indexOf('function nameOf('));
  assert.match(chip, /<span className="arena__inspect-key">⌕ inspect · I<\/span>\s*<span className="arena__inspect-why arena__inspect-what">/);
  assert.match(chip, /<span className="arena__inspect-key">\{'⌕ inspect\\u00a0'\}<\/span>\s*<strong className="arena__inspect-what">/);
  const key = CREDIT_ROW.keyChars * CREDIT_ROW.monoAdvanceEm * CREDIT_ROW.fontPx;
  const content = (floor: number): number => floor - CREDIT_ROW.chipPadPx - CREDIT_ROW.chipBorderPx;
  assert.ok(content(inspectFloorPx()) >= key + 5.6, `the chip's floor holds ${content(inspectFloorPx()).toFixed(1)} px of content: not its ${key.toFixed(1)}-px key and the reason's 0.35rem`);
  // THE CONTROLS. The first fix pass's row: the credit 0 1 auto against the chip's
  // 0 1000 auto — 0.3 px off the credit, which the verifier saw ellipsised (648.3
  // → 648.0) — and its 13ch floor on a border-box, which held 69.7 px of an
  // 86.1-px key.
  const [firstCredit, firstChip] = flexSizes(
    [
      { basis: 648.3, grow: 0, shrink: 1, min: 0, max: 980 },
      { basis: 697, grow: 0, shrink: 4, min: 13 * 6.6226, max: 560 },
    ],
    stripsRowPx(1280) - CREDIT_ROW.gapPx,
  );
  assert.ok(Math.abs(firstCredit! - 585.7) < 0.5 && Math.abs(firstChip! - 428.7) < 0.5, `the model lays the audit's first cut out ${firstCredit!.toFixed(1)} and ${firstChip!.toFixed(1)}, Chromium 585.7 and 428.7`);
  const [shrunk] = flexSizes(
    [
      { basis: 648.3, grow: 0, shrink: 1, min: 0, max: 980 },
      { basis: 697, grow: 0, shrink: 1000, min: 13 * 6.6226, max: 560 },
    ],
    stripsRowPx(1280) - CREDIT_ROW.gapPx,
  );
  assert.ok(shrunk! < 648.3 - 0.05, `the shrink-ratio row draws the credit whole (${shrunk!.toFixed(2)}) — the control has no teeth`);
  assert.ok(content(13 * 6.6226) < key, 'a 13ch border-box holds the key — the control has no teeth');
});

/** Every hint the arena can show: `planKey`'s `why`s, `inspect.ts`'s reasons and `Arena.tsx`'s own, templates with their placeholders taken out. */
function arenaHints(): string[] {
  const out: string[] = [];
  const literal = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/y;
  const grab = (source: string, lead: RegExp): void => {
    for (const m of source.matchAll(lead)) {
      literal.lastIndex = m.index + m[0].length;
      const hit = literal.exec(source);
      if (hit !== null) out.push(hit[2]!.replace(/\$\{[^}]*\}/g, ''));
    }
  };
  grab(read('../src/keys.ts'), /\bwhy:\s*/g);
  grab(read('../src/arena/inspect.ts'), /\bwhy:\s*|export const [A-Z_]+ = /g);
  grab(arena, /\bsetHint\(/g);
  return out.filter((h) => h.length > 0);
}

test('hud: the decision bar is one line of items, and a two-line prompt, the longest hint and the longest notice at once hold it at two lines — at 1280 and 1600 px, the wrapping bar its control', () => {
  // The stylesheet: no wrap; the prompt from its 46ch floor; the buttons their width; the rest two lines at most.
  assert.equal(rule('.arena__decision')['flex-wrap'], 'nowrap', 'the bar wraps — a hint and a notice beside a two-line prompt took it to 70.5 px, the column to 136.7');
  assert.equal(rule('.arena__decision .prompt')['min-inline-size'], 'min(46ch, 100%)', 'the prompt has no floor: from its zero basis anything beside it squeezes it to a sliver');
  assert.equal(rule('.arena__decision > .btn')['flex'], 'none');
  const giving = rule('.arena__decision > .muted,\n.arena__decision > .arena__hint,\n.arena__decision > .arena__notice');
  assert.equal(giving['-webkit-line-clamp'], String(DECISION_BAR.lines));
  assert.equal(giving['display'], '-webkit-box');
  assert.equal(giving['overflow'], 'hidden');
  assert.equal(giving['min-inline-size'], '0');
  assert.equal(px(rule('.arena__decision > .muted')['min-inline-size']?.replace('em', 'rem')) * 12 / 16, DECISION_BAR.outlinedFloorPx, 'the outlined-cards line’s floor is not DECISION_BAR’s');
  assert.equal(rule('.arena__decision > .arena__notice')['flex-shrink'], '0');
  assert.equal(px(rule('.arena__decision > .arena__notice')['max-inline-size']?.replace('em', 'rem')) * 11 / 16, DECISION_BAR.noticeMaxPx);
  const watch = rule('.arena__watch');
  assert.equal(watch['-webkit-line-clamp'], String(DECISION_BAR.lines));
  assert.equal(watch['min-inline-size'], 'min(46ch, 100%)');
  assert.equal(px(rule('.arena__decision')['gap']), DECISION_BAR.gapPx);
  // The markup: every child of the bar is one of those, and the two messages carry their whole text as a tooltip.
  const open = decision.indexOf('<div className="arena__decision"');
  const bar = decision.slice(open, decision.indexOf('\n      </div>', open));
  const children = [...bar.matchAll(/\n {8}(?: {2,6})?(?:\{[^\n<]*&& \(?\s*)?<([A-Za-z]+)(?:\s[^>]*?className=\{?[`"]([a-z_\- ]+))?/g)].map((m) => `${m[1]!}${m[2] !== undefined ? '.' + m[2].trim().split(/\s+/)[0]! : ''}`);
  for (const child of children) {
    assert.ok(
      ['WatchLine', 'p.muted', 'p.prompt', 'ArenaButton', 'span.muted', 'button.btn', 'span.arena__hint', 'span.arena__notice', 'span.btn__key'].includes(child),
      `the bar carries ${child} — an item with no line rule of its own can wrap it or grow it (D267): give it one, or put it elsewhere`,
    );
  }
  assert.ok(children.includes('span.arena__hint') && children.includes('span.arena__notice') && children.includes('p.prompt'), `the bar's children as parsed: ${children.join(', ')}`);
  assert.match(bar, /<span className="arena__hint" title=\{hint\}>/, 'the hint has no tooltip — its whole text is not reachable when it is cut');
  // The notice's tooltip is the title AND the engine's text (fix pass 3: this matched `title={` alone,
  // and `title={notice.title}` — "card 35 cannot be selected now" gone — stayed green). The rendered
  // title is `arena-hud.test.tsx`'s.
  assert.match(
    bar,
    /className=\{`arena__notice arena__notice--\$\{notice\.level\}`\} title=\{notice\.text === '' \? notice\.title : `\$\{notice\.title\} — \$\{notice\.text\}`\}>/,
    'the notice’s tooltip is not its title and the engine’s text — a notice cut to its title keeps only its tooltip, and the text is what it says',
  );

  // The model agrees with Chromium where the verifier looked: `human-ability-42`@1060, `I` pressed with nothing under the pointer.
  const recorded = { promptChars: 250, okPx: DECISION_BAR.buttonPx.ok, cancelPx: DECISION_BAR.buttonPx.cancel, concedePx: DECISION_BAR.buttonPx.concede, outlined: true };
  const inspectHint = 'no card under the pointer and none clicked — hover or click a face-up card, then press I'.length;
  for (const [width, drawn] of [[1280, 194.1], [1600, 273.3]] as const) {
    const laid = decisionBarOf(width, { ...recorded, hintChars: inspectHint, noticeChars: 'Your turn'.length });
    assert.ok(Math.abs(laid.widths['hint']! - drawn) < 0.5, `${String(width)} px: the model's hint (${laid.widths['hint']!.toFixed(1)}) is not Chromium's ${String(drawn)}`);
    assert.ok(Math.abs(laid.heightPx - 46.4) < 0.05, `${String(width)} px: the model's bar is ${laid.heightPx.toFixed(1)} px, Chromium's 46.4`);
  }

  // Everything at once, whatever the lengths: the longest prompt of the corpus,
  // the longest hint the arena writes and the longest notice the bridge names —
  // then the same with a 400-character hint and notice (an engine title is any
  // length), the widest button labels and Concede armed.
  const prompts = [...corpusPrompts().keys()];
  const longestPrompt = Math.max(...prompts.map((t) => t.length));
  const hints = arenaHints();
  const longestHint = Math.max(...hints.map((h) => h.length));
  const bridge = read('../../bridge/src/mtgtable/WireGuiGame.java');
  const titles = [...bridge.matchAll(/\bnotice\("(?:info|warn|error)", "([^"]*)"/g)].map((m) => m[1]!);
  const longestNotice = Math.max(...titles.map((t) => t.length));
  assert.ok(hints.length > 20 && titles.length > 10, `${String(hints.length)} hints, ${String(titles.length)} notice titles — the scans found too little`);
  const rest = hudColumnPx() - HUD_COLUMN_PX.decision;
  for (const width of [1280, 1600]) {
    for (const [what, content] of [
      ['the longest prompt, hint and notice', { ...recorded, promptChars: longestPrompt, hintChars: longestHint, noticeChars: longestNotice }],
      ['400-character hint and notice, the widest buttons, Concede armed', { promptChars: longestPrompt, okPx: DECISION_BAR.buttonPx.widestOk, cancelPx: DECISION_BAR.buttonPx.widestCancel, concedePx: DECISION_BAR.buttonPx.concedeArmed, outlined: true, hintChars: 400, noticeChars: 400 }],
    ] as const) {
      const laid = decisionBarOf(width, content);
      const column = rest + laid.heightPx;
      console.log(`  ${String(width)} px, ${what}: the bar ${laid.heightPx.toFixed(1)} px, the column ${column.toFixed(1)}; the prompt ${laid.widths['prompt']!.toFixed(0)} px, the hint ${laid.widths['hint']!.toFixed(0)} (${String(laid.lines['hint'])} lines), the notice ${laid.widths['notice']!.toFixed(0)}`);
      assert.ok(column <= HUD_TOP_PX, `${String(width)} px, ${what}: the column is ${column.toFixed(1)} px, past HUD_TOP_PX`);
      assert.ok(laid.widths['prompt']! >= DECISION_BAR.promptFloorPx - 0.01, `${String(width)} px, ${what}: the prompt is squeezed below its floor`);
      for (const n of Object.values(laid.lines)) assert.ok(n <= DECISION_BAR.lines);
    }
    // The recorded buttons beside the longest of everything still leave the hint
    // two lines of at least 15 characters — its opening words; the rest is its tooltip.
    const laid = decisionBarOf(width, { ...recorded, promptChars: longestPrompt, hintChars: longestHint, noticeChars: longestNotice });
    const perLine = (laid.widths['hint']! - DECISION_BAR.messagePadPx) / DECISION_BAR.monoPx;
    assert.ok(perLine >= 15, `${String(width)} px: the hint keeps ${laid.widths['hint']!.toFixed(0)} px, ${perLine.toFixed(0)} characters a line`);
  }
  console.log(`  the longest: a ${String(longestPrompt)}-character prompt, a ${String(longestHint)}-character hint (of ${String(hints.length)}), a ${String(longestNotice)}-character notice title (of ${String(titles.length)} the bridge names)`);

  // THE CONTROLS. The bar before the second fix pass wrapped: the hint and the
  // notice took a second line under the two-line prompt — 70.5 px of bar and
  // 136.7 of column in Chromium, at both sizes.
  const wrapped = promptBarPx(Number.POSITIVE_INFINITY) + DECISION_BAR.gapPx + DECISION_BAR.messageLinePx.one;
  assert.ok(Math.abs(wrapped - 70.5) < 0.5, `the wrapped bar models at ${wrapped.toFixed(1)} px, Chromium drew 70.5`);
  assert.ok(rest + wrapped > HUD_TOP_PX, 'the wrapping bar fits the band — the control has no teeth');
  // And with no floor the prompt is the one that gives way: the longest hint takes it to nothing.
  const inner = Math.min(DECISION_BAR.maxPx, stripsRowPx(1280)) - DECISION_BAR.padInlinePx;
  const [floorless] = flexSizes(
    [
      { basis: 0, grow: 1, shrink: 1, min: 0, max: Infinity },
      { basis: longestHint * DECISION_BAR.monoPx + DECISION_BAR.messagePadPx, grow: 0, shrink: 1, min: 0, max: Infinity },
      { basis: 63.5 + 69 + 97.8 + 185 + 5.6 * 5, grow: 0, shrink: 0, min: 0, max: Infinity },
    ],
    inner,
  );
  assert.ok(floorless! < DECISION_BAR.promptFloorPx, 'a floorless prompt keeps its 46ch beside the longest hint — the control has no teeth');
});
