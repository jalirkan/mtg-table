/*
 * mtg-table — web/test/hooks-order.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **No React hook may be called after a component's early return.**
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
 *
 * ---------------------------------------------------------------------------
 * **M7 widened it from one file to two trees.** It used to read exactly
 * `render/Board.tsx` and anchor on that one `if (board === null)`, which left
 * the arena's eleven components — `Arena`, `Scene`, `CueRunner`, `CardPlane`,
 * `CardBack`, `HitProxy`, `Table`, `CueControls`, `DecisionLayer`,
 * `ArenaButton`, `ArtCredit` — covered by hand-checking. Hand-checking is
 * precisely the failure mode this file exists to replace, and vitest cannot
 * mount a `<Canvas>` in the node environment at all, so nothing else could see
 * it either. It now walks every `.tsx` under `web/src/render/` and
 * `web/src/arena/`, finds each component's own top-level `return`s by counting
 * braces, and flags any `use*(` below the first one.
 *
 * **The card browser's tree (`web/src/cards/`, `#cards`) joined it on
 * 2026-09-27**, so its components — `CardBrowser`, `CardDetail`, `CardView`,
 * `Pips` — are held by the same scan rather than by hand.
 * ---------------------------------------------------------------------------
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const TREES = ['../src/render/', '../src/arena/', '../src/cards/'];

/** Every hook this repo calls, plus React's own. `use…` in a comment is blanked. */
const HOOK =
  /\b(useState|useMemo|useCallback|useEffect|useRef|useLayoutEffect|useReducer|useContext|useSyncExternalStore|useImperativeHandle|useDeferredValue|useTransition|useId|useDebugValue|useInsertionEffect|useRects|useTargeting|useRectRegistry|useFrame|useThree|useLoader|useCardTexture|useCardBackTexture|useReducedMotion|useCueData|useView|useArt|useWindowKeydown)\s*\(/;

/**
 * A component declaration, in the four spellings this repo writes:
 * `function X(`, `export function X(`, `export default function X(`, and
 * `export const X = memo(function X(`.
 */
const COMPONENT =
  /^(?:export\s+)?(?:default\s+)?(?:function\s+([A-Z]\w*)\s*\(|const\s+([A-Z]\w*)\s*(?::[^=]+)?=\s*(?:memo\()?\s*(?:function\s*\w*\s*)?\()/;

function tsxFiles(): Array<{ path: string; source: string }> {
  const out: Array<{ path: string; source: string }> = [];
  const walk = (dir: string, prefix: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const full = dir + name;
      if (statSync(full).isDirectory()) {
        walk(full + '/', `${prefix}${name}/`);
        continue;
      }
      if (!name.endsWith('.tsx')) continue;
      out.push({ path: prefix + name, source: readFileSync(full, 'utf8') });
    }
  };
  for (const tree of TREES) {
    const root = fileURLToPath(new URL(tree, import.meta.url));
    walk(root, tree.replace('../src/', ''));
  }
  return out;
}

/**
 * Blank out comments and string/template literals, keeping every newline and
 * every character position, so brace counting and line numbers both survive.
 *
 * It is the smallest thing that works on this repo's source: the alternative is
 * a parser, and a parser is a dependency this test deliberately does not have.
 */
function blank(src: string): string {
  let out = '';
  let mode: 'code' | 'line' | 'block' | 'sq' | 'dq' | 'tpl' = 'code';
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    const next = src[i + 1];
    const keep = c === '\n' ? '\n' : ' ';
    if (mode === 'code') {
      if (c === '/' && next === '/') {
        mode = 'line';
        out += '  ';
        i += 1;
      } else if (c === '/' && next === '*') {
        mode = 'block';
        out += '  ';
        i += 1;
      } else if (c === "'") {
        mode = 'sq';
        out += ' ';
      } else if (c === '"') {
        mode = 'dq';
        out += ' ';
      } else if (c === '`') {
        mode = 'tpl';
        out += ' ';
      } else {
        out += c;
      }
      continue;
    }
    if (mode === 'line') {
      if (c === '\n') mode = 'code';
      out += keep;
      continue;
    }
    if (mode === 'block') {
      if (c === '*' && next === '/') {
        mode = 'code';
        out += '  ';
        i += 1;
        continue;
      }
      out += keep;
      continue;
    }
    // A string or template. `\x` never closes it.
    if (c === '\\') {
      out += '  ';
      i += 1;
      continue;
    }
    if ((mode === 'sq' && c === "'") || (mode === 'dq' && c === '"') || (mode === 'tpl' && c === '`')) {
      mode = 'code';
    }
    out += keep;
  }
  return out;
}

interface Component {
  file: string;
  name: string;
  /** 0-based line of the declaration. */
  start: number;
  /** 0-based line after the component's closing brace. */
  end: number;
  /** 0-based line of the first `return` at the component's own brace depth. */
  firstReturn: number | null;
}

/**
 * Is this block a control-flow block — an `if`, `else`, `for`, `while`,
 * `switch`, `try`/`catch` — rather than a function body, an object literal or a
 * JSX expression? A `return` is the component's own early exit only when every
 * block between it and the component body is one of these; a `return` inside a
 * `useCallback` is a callback's return and not an exit at all.
 */
function isControlFlow(before: string): boolean {
  const text = before.trimEnd();
  if (/=>\s*$/.test(text)) return false;
  if (/\b(?:if|else\s+if|for|while|switch|catch)\s*\([^()]*\)\s*$/.test(text)) return true;
  if (/(?:^|[^\w.])(?:else|try|do)\s*$/.test(text)) return true;
  // A multi-line condition — `if (\n  a &&\n  b\n) {` — closes on its own line.
  return /^\)\s*$/.test(text);
}

/** Every component in one file, with its body and its first top-level `return`. */
function componentsOf(file: string, source: string): Component[] {
  const lines = blank(source).split('\n');
  const out: Component[] = [];

  for (let i = 0; i < lines.length; i++) {
    const declaration = COMPONENT.exec(lines[i] ?? '');
    if (declaration === null) continue;
    const name = declaration[1] ?? declaration[2] ?? '?';

    // Walk forward counting braces. `stack` holds one flag per open block: is
    // it control flow (so a `return` inside it exits the COMPONENT) or not?
    const stack: boolean[] = [];
    let opened = false;
    let firstReturn: number | null = null;
    let end = lines.length;
    for (let j = i; j < lines.length; j++) {
      const line = lines[j] ?? '';
      // Reachable from the component's own statement level: the body itself, or
      // only control-flow blocks above it.
      const exits = opened && stack.slice(1).every(Boolean);
      if (exits && firstReturn === null && /(?:^|[^.\w])return\b/.test(line)) {
        firstReturn = j;
      }
      for (let k = 0; k < line.length; k++) {
        const ch = line[k];
        if (ch === '{') {
          stack.push(isControlFlow(line.slice(0, k)));
          opened = true;
        } else if (ch === '}') {
          stack.pop();
        }
      }
      if (opened && stack.length === 0) {
        end = j;
        break;
      }
    }
    // A one-expression arrow (`const X = () => <div/>`) never opens a body and
    // cannot hold a hook at all.
    if (!opened) continue;
    out.push({ file, name, start: i, end, firstReturn });
  }
  return out;
}

test('no React hook is called after a component’s early return', () => {
  const files = tsxFiles();
  assert.ok(
    files.length >= 20,
    `expected render/ and arena/ to hold the component tree, saw ${String(files.length)} .tsx files`,
  );
  // The two files whose defect wrote this test, by name, so a rename or a move
  // cannot quietly drop the coverage.
  const paths = files.map((f) => f.path);
  for (const required of ['render/Board.tsx', 'arena/Arena.tsx', 'arena/scene/CardPlane.tsx', 'cards/CardBrowser.tsx']) {
    assert.ok(paths.includes(required), `${required} is not being scanned — move this test with it`);
  }

  const offenders: string[] = [];
  let components = 0;
  let guarded = 0;

  for (const file of files) {
    const blanked = blank(file.source).split('\n');
    for (const component of componentsOf(file.path, file.source)) {
      components += 1;
      if (component.firstReturn === null) continue;
      guarded += 1;
      for (let i = component.firstReturn; i < component.end; i++) {
        const line = blanked[i] ?? '';
        if (!HOOK.test(line)) continue;
        // The line of the early return itself may legitimately read
        // `if (x === null) return useSomething(...)` — it never does here, but
        // the flag is about what comes *after* the branch.
        if (i === component.firstReturn) continue;
        offenders.push(
          `${file.path}:${String(i + 1)} (${component.name}) ${(file.source.split('\n')[i] ?? '').trim()}`,
        );
      }
    }
  }

  console.log(
    `hooks-order: ${String(files.length)} files, ${String(components)} components, ` +
      `${String(guarded)} with a top-level return`,
  );

  assert.deepEqual(
    offenders,
    [],
    'a React hook is called below a component’s early return, so the hook count differs between ' +
      'a render that takes the branch and one that does not — React throws "Rendered more hooks ' +
      'than during the previous render" the first time it changes. Move the hook above the guard, ' +
      'or make the value a plain expression:\n  ' + offenders.join('\n  '),
  );
});

/**
 * The original, narrow assertion, kept because it names the exact defect and
 * the exact line: `Board`'s guard is where it happened.
 */
test('Board still has the `board === null` guard the general scan was written for', () => {
  const src = readFileSync(fileURLToPath(new URL('../src/render/Board.tsx', import.meta.url)), 'utf8');
  assert.ok(
    src.split('\n').some((l) => l.trim().startsWith('if (board === null)')),
    'Board.tsx no longer has an `if (board === null)` early return — if the exit moved, say so here',
  );
});
