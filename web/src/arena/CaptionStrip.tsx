/*
 * mtg-table — arena/CaptionStrip.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The caption strip** (D255): the narrator's moment for the frame on screen,
 * over the table's right edge — the one or two moments before it dimmed above,
 * a turn marker over each turn's lines, and nothing else. It is the `#story` page's sentence for the
 * same frame, handed to the arena as plain data (`arena/caption.ts`'s
 * `ArenaCaption`, built in `main.tsx`), so this component narrates nothing,
 * names nothing, fetches nothing and starts no timer (`liveness.test.ts`). It
 * hides when no moment names the frame on screen (`caption === null`).
 *
 * A card name is marked (`data-card-id`) only where the narrator resolved it;
 * every other word is the sentence as told. `arena-caption.test.tsx` renders
 * this over every frame of every fixture against an oracle written apart from
 * the narrator, with a negative control (hard rule 8's renderer half).
 *
 * It is a widget in `.arena__layer` (`pointer-events: none`), so its root class
 * opts back in — the full sentence of a clamped line is its tooltip — and
 * `liveness.test.ts`'s widget table names it.
 */

import type { ArenaCaption, ArenaCaptionLine } from './caption.ts';

function Line({ line, kind }: { line: ArenaCaptionLine; kind: 'before' | 'now' }): JSX.Element {
  return (
    <p className={`arena__caption-line arena__caption-line--${kind}`} title={line.text}>
      {line.pieces.map((piece, i) =>
        piece.card === null ? (
          <span key={i}>{piece.text}</span>
        ) : (
          <strong
            key={i}
            className="arena__caption-card"
            data-card-id={piece.card.id}
            data-card-name={piece.card.name}
          >
            {piece.text}
          </strong>
        ),
      )}
    </p>
  );
}

/**
 * The lines in order, each turn's under its own marker — the story page's turn
 * heading — so an earlier line from the turn before, or a flush that ends one
 * turn and starts the next, is never read under the wrong player's turn.
 */
export function CaptionStrip({ caption }: { caption: ArenaCaption | null }): JSX.Element | null {
  if (caption === null) return null;
  const rows: JSX.Element[] = [];
  let turn: string | null = null;
  const add = (line: ArenaCaptionLine, kind: 'before' | 'now', i: number): void => {
    if (line.turn !== turn) {
      turn = line.turn;
      rows.push(
        <div
          key={`t${String(rows.length)}`}
          className={`arena__caption-turn arena__caption-turn--${line.side ?? 'none'} arena__caption-turn--${kind}`}
        >
          {line.turn}
        </div>,
      );
    }
    rows.push(<Line key={`${kind}${String(i)}:${String(line.frameIndex)}`} line={line} kind={kind} />);
  };
  caption.before.forEach((line, i) => {
    add(line, 'before', i);
  });
  caption.now.forEach((line, i) => {
    add(line, 'now', i);
  });
  return (
    <div
      className={`arena__caption arena__caption--${caption.side ?? 'none'}`}
      role="status"
      aria-live="polite"
      data-frame={caption.frame}
    >
      {rows}
      {caption.more > 0 && <p className="arena__caption-more">+{caption.more} more — ☰ story tells them all</p>}
    </div>
  );
}
