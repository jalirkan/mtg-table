/*
 * mtg-table — web/test/hooks-order.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **No React hook may be called after `<Board/>`'s early return.**
 *
 * `Board` has one conditional exit — `if (board === null) return <empty board/>`
 * (§3: there is no snapshot yet) — and a hook placed below it is called on the
 * frames that have a board and not on the frames that do not. React's answer is
 * to throw *"Rendered more hooks than during the previous render"* on the first
 * frame that crosses the boundary, which the board catches and renders as
 * "The board could not render frame 3."
 *
 * That shipped for the length of one browser session on 2026-09-12 (a `useMemo`
 * added below the early return while wiring the provisional mana pips), and
 * **the whole test suite stayed green**: `web/test/render.test.tsx` mounts each
 * frame with `renderToStaticMarkup`, which builds a fresh tree every time, so it
 * can never see a hook-count change *between* renders of one component — and
 * this repo's vitest setup has no DOM to re-render into.
 *
 * So the check is on the source. It is crude on purpose: no parser, no
 * dependency, and it fails loudly in the one place the defect can hide.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const BOARD = fileURLToPath(new URL('../src/render/Board.tsx', import.meta.url));

test('no hook is called after Board’s `board === null` early return', () => {
  const src = readFileSync(BOARD, 'utf8');
  const lines = src.split('\n');

  const guard = lines.findIndex((l) => l.trim().startsWith('if (board === null)'));
  assert.ok(
    guard >= 0,
    'Board.tsx no longer has an `if (board === null)` early return — if the exit moved, move this test with it',
  );
  // The component ends at the first line that is exactly `}` in column 0 after
  // the guard; everything below that belongs to the other components in the file.
  const end = lines.findIndex((l, i) => i > guard && l === '}');
  assert.ok(end > guard, 'could not find the end of the Board component');

  const offenders: string[] = [];
  for (let i = guard; i < end; i++) {
    const line = lines[i] ?? '';
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;
    const hook = /\b(useState|useMemo|useCallback|useEffect|useRef|useLayoutEffect|useReducer|useContext|useSyncExternalStore|useRects|useTargeting|useRectRegistry)\s*\(/.exec(line);
    if (hook !== null) offenders.push(`Board.tsx:${String(i + 1)}: ${line.trim()}`);
  }

  assert.deepEqual(
    offenders,
    [],
    'a React hook is called below Board’s early return, so the hook count differs between a frame ' +
      'with a board and a frame without one — React throws "Rendered more hooks than during the ' +
      'previous render" the first time the board appears. Move the hook above the guard, or make ' +
      'the value a plain expression:\n  ' + offenders.join('\n  '),
  );
});
