/*
 * mtg-table — render/useKeyboard.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * One `keydown` listener on `window`, registered once (report 10 §12.2 rule 1).
 *
 * The handler is read through a ref rather than through the dependency array,
 * because the board re-renders on every frame the engine pushes — roughly 600
 * times a game — and re-binding a window listener that often is 1,200 DOM
 * operations for no reason at all. The ref is updated in a layout effect, so the
 * listener always calls the current closure over the current state.
 *
 * The decision of *what* a key does is `keys.ts`, which is pure and tested from
 * `node --test`. This file is the plumbing that cannot be.
 */

import { useEffect, useRef } from 'react';

import { useIsomorphicLayoutEffect } from './rects.ts';

export function useWindowKeydown(onKey: (event: KeyboardEvent) => void): void {
  const current = useRef(onKey);

  useIsomorphicLayoutEffect(() => {
    current.current = onKey;
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent): void => {
      current.current(event);
    };
    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, []);
}
