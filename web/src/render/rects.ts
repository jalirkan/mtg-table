/*
 * mtg-table — render/rects.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The rect registry (report 10 §9.1): "where on the board is entity X right
 * now", measured from the DOM, so `ArrowsOverlay` can draw between two things
 * without either of them knowing about the other.
 *
 * Four properties, each with a reason:
 *
 *   1. **Keys are namespaced — `c:` card, `p:` player, `s:` stack item**
 *      (report 10 §10.1, §18.2). `stack[].id` is a `StackItemView` id and
 *      `Card.id` is a card id: they are different id spaces and they **collide**
 *      — `fixtures/games/g1.jsonl` carries a hidden card #56 and a stack item
 *      #56 in the same frame. A registry keyed on bare numbers would point the
 *      targeting arrow at a random permanent, and report 10 §17's "watch for"
 *      says that is exactly how this goes wrong.
 *   2. **One `ResizeObserver`, on the board root** — not one per tile. Every
 *      tile moves together (the grid rows are fixed and the rows re-pack as a
 *      unit), so eighty observers would fire eighty times for one event and
 *      measure the same layout eighty times.
 *   3. **Measured after every render, in a layout effect, and only what
 *      changed.** A sweep that found no movement bumps nothing, so the
 *      `setState` inside it cannot loop: the second pass over an unchanged
 *      layout returns the identical numbers.
 *   4. **The isomorphic shim is not optional.** `renderToStaticMarkup` — which
 *      `web/test/render.test.tsx` calls for every frame of every fixture —
 *      prints *"useLayoutEffect does nothing on the server"* for a component
 *      that uses it, once per frame. Under SSR nothing registers, so `get()`
 *      returns `undefined` everywhere and the overlay draws no arrows at all,
 *      which is the correct empty-registry branch and is tested for free.
 *
 * Rects are **board-relative**: the root's own rect is subtracted, so the SVG
 * that is `position: absolute; inset: 0` over the board can use them directly as
 * user units with no viewBox arithmetic.
 *
 * No CSS import, no JSX: this file is `.ts` so that `node --test` can read the
 * key helpers without a JSX loader.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';

/** A namespaced registry key. Never a bare number — §10.1's id spaces collide. */
export type RectKey = `c:${number}` | `p:${number}` | `s:${number}`;

export const cardKey = (id: number): RectKey => `c:${id}`;
export const playerKey = (id: number): RectKey => `p:${id}`;
export const stackKey = (id: number): RectKey => `s:${id}`;

/** A measured box, in board-relative CSS pixels. */
export interface RectBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Rects {
  /** A ref callback for this key. Stable across renders, so refs do not churn. */
  register(key: RectKey): (el: HTMLElement | null) => void;
  /** The board-relative box, or `undefined` when nothing is registered. */
  get(key: RectKey): RectBox | undefined;
  /** Bumps whenever a sweep found movement; consumers re-render on it. */
  version: number;
}

/**
 * The registry a component gets when nobody provided one — a server render, a
 * unit test, the empty board. `register` still returns a callback so the ref
 * prop is never `undefined`, and `get` answers nothing, which draws no arrows.
 */
const NO_RECTS: Rects = {
  register: () => () => undefined,
  get: () => undefined,
  version: 0,
};

export const RectsContext = createContext<Rects>(NO_RECTS);

export function useRects(): Rects {
  return useContext(RectsContext);
}

/**
 * `useLayoutEffect` in the browser, `useEffect` on the server (report 10 §9.1).
 * Keep the shim in this one place; a second copy is a second chance to forget it
 * and put the SSR warning back into every fixture frame.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function same(a: RectBox, b: RectBox): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

/**
 * Own the registry. `Board` calls this once and publishes the result through
 * {@link RectsContext}; everything else only ever calls `register` and `get`.
 */
export function useRectRegistry(root: RefObject<HTMLElement | null>): Rects {
  /**
   * A **set** of elements per key, not one element.
   *
   * This is not defensive programming; it is a defect found in the browser. One
   * key can legitimately be claimed twice for a moment — the `Z` zoom drew the
   * same card the battlefield row was drawing — and with one element per key the
   * second registration overwrote the first, so when the overlay closed its ref
   * callback (`el === null`) deleted the key outright. The card stayed on the
   * board and all three of its arrows vanished until it next re-mounted.
   *
   * So a null callback removes nothing, duplicates queue up in registration
   * order (the board tile registers first, because it is earlier in the tree),
   * and {@link measure} prunes whatever has left the document. `anchor={false}`
   * on the secondary copies is still right — it says which tile IS the card —
   * but the registry no longer depends on nobody ever getting that wrong.
   */
  const elements = useRef(new Map<RectKey, Set<HTMLElement>>());
  const callbacks = useRef(new Map<RectKey, (el: HTMLElement | null) => void>());
  const rects = useRef(new Map<RectKey, RectBox>());
  const [version, setVersion] = useState(0);

  const measure = useCallback(() => {
    const rootEl = root.current;
    if (rootEl === null) return;
    const base = rootEl.getBoundingClientRect();
    let changed = false;
    const seen = new Set<RectKey>();

    for (const [key, set] of elements.current) {
      let chosen: HTMLElement | null = null;
      for (const el of set) {
        // Deleting from a Set while iterating it is defined behaviour in JS.
        if (!el.isConnected) {
          set.delete(el);
          continue;
        }
        chosen ??= el;
      }
      if (set.size === 0) {
        elements.current.delete(key);
        continue;
      }
      if (chosen === null) continue;
      const r = chosen.getBoundingClientRect();
      // A tile inside a `display: none` panel measures 0×0. Registering it would
      // draw an arrow into the top-left corner of the board.
      if (r.width === 0 && r.height === 0) continue;
      seen.add(key);
      const next: RectBox = { x: r.x - base.x, y: r.y - base.y, width: r.width, height: r.height };
      const prev = rects.current.get(key);
      if (prev === undefined || !same(prev, next)) {
        rects.current.set(key, next);
        changed = true;
      }
    }
    for (const key of [...rects.current.keys()]) {
      if (seen.has(key)) continue;
      rects.current.delete(key);
      changed = true;
    }
    // Only a sweep that found movement re-renders. This is what keeps the
    // layout effect from looping: the next sweep over the same layout is a
    // no-op.
    if (changed) setVersion((v) => v + 1);
  }, [root]);

  const register = useCallback((key: RectKey) => {
    const existing = callbacks.current.get(key);
    if (existing !== undefined) return existing;
    const made = (el: HTMLElement | null): void => {
      // `null` is "this element is going away", not "this key is going away".
      // The sweep prunes it, which is the only place that can tell the two
      // apart when a key is claimed twice. See the note on `elements`.
      if (el === null) return;
      const set = elements.current.get(key) ?? new Set<HTMLElement>();
      set.add(el);
      elements.current.set(key, set);
    };
    callbacks.current.set(key, made);
    return made;
  }, []);

  // After every render: the rows re-pack whenever a card enters or leaves, and
  // that is a layout change no observer reports (the board root did not resize).
  useIsomorphicLayoutEffect(() => {
    measure();
  });

  useEffect(() => {
    const rootEl = root.current;
    if (rootEl === null) return;
    const onResize = (): void => {
      measure();
    };
    window.addEventListener('resize', onResize);
    // ONE observer, on the root (report 10 §9.1). Guarded because a non-browser
    // environment that still defines `window` may not define this.
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize);
    observer?.observe(rootEl);
    return () => {
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
    };
  }, [measure, root]);

  return useMemo<Rects>(
    () => ({ register, get: (key) => rects.current.get(key), version }),
    [register, version],
  );
}
