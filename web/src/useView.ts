/*
 * mtg-table — useView.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Which renderer is on screen.** M7 adds a second `render(state)` — the 3D
 * arena — over the same `ClientState` the 2D board gets, and this is the whole
 * of the switch between them (report 09 §2.2).
 *
 * Two spellings, because two different things want to say it:
 *
 *   - `#arena` / `#/arena` — the hash, which is what a *toggle* writes: changing
 *     it fires `hashchange` and re-renders without touching the transport, the
 *     socket or the reducer. A live game survives switching views because the
 *     page never reloads.
 *   - `?view=arena` — the query, which is what a *command* writes:
 *     `npm run dev:arena` opens a URL, and a query string is what
 *     `./scripts/play.sh --arena` would pass through to vite later.
 *
 * The hash wins when both are present, because the hash is the one a human just
 * clicked. No router dependency (decision D9 is "React with plain hooks"), and
 * no persistence: report 09 §14 question 3 assumes the hash and no memory, and
 * a view that remembers is a view that opens in the wrong one after a crash.
 *
 * Pure enough to import anywhere: {@link viewFromLocation} takes the two strings
 * rather than reading `window`, so `node --test` can exercise every spelling.
 */

import { useCallback, useEffect, useState } from 'react';

export type View = 'board' | 'arena';

/** The hash spellings that mean "arena". Anything else is the board. */
const ARENA_HASHES: ReadonlySet<string> = new Set(['arena', '/arena', '!arena', '#arena']);

/**
 * Decide the view from a location's `hash` and `search`, in that order.
 *
 * Total: an unknown hash, an empty hash and a malformed query all mean `board`,
 * because a URL typo must not blank the page.
 */
export function viewFromLocation(hash: string, search: string): View {
  const cleanedHash = hash.replace(/^#+/, '').trim().toLowerCase();
  if (cleanedHash !== '') {
    return ARENA_HASHES.has(cleanedHash) ? 'arena' : 'board';
  }
  let view: string | null = null;
  try {
    view = new URLSearchParams(search).get('view');
  } catch {
    view = null;
  }
  return view !== null && view.trim().toLowerCase() === 'arena' ? 'arena' : 'board';
}

/** The hash a view is written as. `board` clears the hash rather than writing `#board`. */
export function hashForView(view: View): string {
  return view === 'arena' ? '#arena' : '';
}

/**
 * `[view, setView]`, backed by `location.hash` and kept in step with the Back
 * button through `hashchange`.
 *
 * The setter writes the hash and lets the listener do the state update, so there
 * is exactly one path from "the URL says arena" to "the arena is mounted" — a
 * `setState` here as well would let the two disagree after a Back.
 */
export function useView(): [View, (view: View) => void] {
  const [view, setViewState] = useState<View>(() =>
    typeof window === 'undefined'
      ? 'board'
      : viewFromLocation(window.location.hash, window.location.search),
  );

  useEffect(() => {
    const onHashChange = (): void => {
      setViewState(viewFromLocation(window.location.hash, window.location.search));
    };
    window.addEventListener('hashchange', onHashChange);
    // The hash may have changed between the initial `useState` and this effect
    // (a `--open` URL, a StrictMode remount), so read it once more here.
    onHashChange();
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  const setView = useCallback((next: View) => {
    const hash = hashForView(next);
    if (hash === '') {
      // Going back to the board has to clear BOTH spellings, or `?view=arena`
      // (which is how `npm run dev:arena` opens the page) would win the moment
      // the hash went away and the toggle would do nothing.
      //
      // `location.hash = ''` also leaves a bare `#` in the bar and fires no
      // event on some browsers, so this path updates the state by hand.
      const params = new URLSearchParams(window.location.search);
      params.delete('view');
      const query = params.toString();
      const url = window.location.pathname + (query === '' ? '' : `?${query}`);
      window.history.replaceState(null, '', url);
      setViewState('board');
      return;
    }
    window.location.hash = hash;
  }, []);

  return [view, setView];
}
