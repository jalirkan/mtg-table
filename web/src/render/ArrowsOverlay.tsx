/*
 * mtg-table — render/ArrowsOverlay.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * One SVG over the whole board (report 10 §9.3): targeting arrows from a stack
 * item to what it targets, attack arrows from an attacker to what it is
 * attacking, block arrows from a blocker to the attacker it stopped.
 *
 * **Arrows are decoration** (§14 rule 4, §18.8). The SVG is `aria-hidden` and
 * `pointer-events: none`, and every fact it draws is also text somewhere a
 * screen reader — or a screenshot pasted into a bug report — can find it:
 * stack targets are chips in `StackPanel`, combat is the `→ defender` /
 * `blocks …` note on the tile and the band list in the log drawer. An arrow that
 * cannot be drawn (a collapsed stack panel, a target in a zone this board does
 * not show) therefore loses nothing.
 *
 * The geometry is in `arrows.ts`, which is `.ts` and is unit-tested from
 * `node --test`. This file is the twenty lines that could not be: the context
 * read, the `<svg>`, and the two strokes — a 4 px dark under-stroke and a 2 px
 * coloured one — that keep an arrow readable over card art.
 */

import type { GameStateBody } from '../protocol.ts';
import { buildArrows, type ArrowSpec } from './arrows.ts';
import { useRects } from './rects.ts';

export function ArrowsOverlay({
  board,
  emphasiseCombat = false,
}: {
  board: GameStateBody;
  /** `C` — Forge's own SHORTCUT_SHOWCOMBAT, as an emphasis rather than a panel. */
  emphasiseCombat?: boolean;
}): JSX.Element {
  const rects = useRects();
  // Deliberately not memoised on `rects.version`: the registry object is
  // replaced whenever a sweep found movement, so this component re-renders
  // exactly when the numbers changed, and a few dozen arcs cost less than the
  // dependency array that would track them.
  const arrows = buildArrows(board, (key) => rects.get(key));
  return <ArrowPaths arrows={arrows} emphasiseCombat={emphasiseCombat} />;
}

/**
 * The rendering half, taking the specs directly.
 *
 * Exported because a server render registers no rects — nothing has a DOM node
 * to measure — so `<ArrowsOverlay/>` under `renderToStaticMarkup` correctly
 * draws nothing, and the only way to test that the *paths* come out right is to
 * hand this the specs. `web/test/render.test.tsx` does that with a rect lookup
 * built from the fixture frame itself.
 */
export function ArrowPaths({
  arrows,
  emphasiseCombat = false,
}: {
  arrows: ArrowSpec[];
  emphasiseCombat?: boolean;
}): JSX.Element {
  return (
    <svg
      className={`arrows${emphasiseCombat ? ' arrows--combat' : ''}`}
      aria-hidden="true"
      focusable="false"
      data-arrows={String(arrows.length)}
    >
      {arrows.map((arrow) => (
        <g key={arrow.key} className={`arrow arrow--${arrow.cls}`} data-arrow={arrow.key}>
          <title>{arrow.title}</title>
          <path className="arrow__under" d={arrow.path} />
          <path className="arrow__line" d={arrow.path} />
          <polygon className="arrow__head" points={arrow.head} />
        </g>
      ))}
    </svg>
  );
}
