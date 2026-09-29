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
 *     again.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { VIEWS } from '../src/arena/camera.ts';
import { CUE_STRIP, HUD_COLUMN_PX, cueStatusOf, hudColumnPx, stripsRowPx } from '../src/arena/hud.ts';
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
  assert.match(block, /<div className="arena__creditrow">\s*<ArtCredit [^>]*\/>\s*<InspectChip [^>]*\/>\s*<\/div>/);

  const column = hudColumnPx();
  console.log(`  the chrome column at its worst ordinary case (a live seat, a two-line prompt): ${column.toFixed(1)} px of HUD_TOP_PX ${String(HUD_TOP_PX)}`);
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
