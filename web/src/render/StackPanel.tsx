/*
 * mtg-table — render/StackPanel.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The floating stack panel (report 10 §8), right of centre in the middle row.
 *
 *   - `board.stack` is ordered **bottom first**; the panel renders it reversed,
 *     so the item that resolves next is the top row and is tagged as such
 *     (docs/protocol.md §3.1).
 *   - **`stack[].id` is a `StackItemView` id and is a different id space from
 *     `Card.id`** — they collide, and `fixtures/games/g1.jsonl` has a hidden
 *     card #56 and a stack item #56 in the same frame (§10.1). The only correct
 *     way to reach the card is `sourceCardId`, resolved against `stackCards`
 *     first (a spell on the stack is in `ZoneType.Stack`, which is not one of the
 *     six zones a player carries).
 *   - **Target chips are text.** An arrow is decoration; a chip is information
 *     (§14 rule 4), and a target whose id does not resolve prints as an id,
 *     which is correct rather than a bug (§3.6 rule 1).
 *   - An empty stack collapses to a one-line strip rather than disappearing, so
 *     the panel's presence does not flicker on every priority pass.
 */

import type { ArtIndex } from '../art.ts';
import type { GameStateBody, InputBody } from '../protocol.ts';
import { CardTile, type Clicks } from './CardTile.tsx';
import { stackTextLabel } from './describe.ts';
import { stackKey, useRects } from './rects.ts';
import { cardLabel, findCard, playerName } from './resolve.ts';

export function StackPanel({
  board,
  input,
  art,
  clicks,
  you,
  open = true,
  onToggle,
}: {
  board: GameStateBody;
  input: InputBody | null;
  art: ArtIndex;
  clicks: Clicks | null;
  /** The viewer's seat, for the thumbnail's controller stripe (§4.5). */
  you: number | null;
  /** `S` — Forge's own `SHORTCUT_SHOWSTACK`. Collapsed, the arrows fall back to
   *  the source card's own tile rather than disappearing. */
  open?: boolean;
  onToggle?: () => void;
}): JSX.Element {
  const rects = useRects();
  const items = [...board.stack].reverse();
  return (
    <section className={`stackpanel${open ? '' : ' stackpanel--shut'}`} aria-label="The stack">
      <h2 className="stackpanel__head">
        <button
          type="button"
          className="stackpanel__toggle"
          aria-expanded={open}
          title="S — show or hide the stack panel (Forge's SHORTCUT_SHOWSTACK)"
          onClick={onToggle}
          disabled={onToggle === undefined}
        >
          The stack <span className="muted">({board.stack.length})</span>{' '}
          <span className="btn__key">S</span>
        </button>
      </h2>
      {!open ? null : items.length === 0 ? (
        <p className="stackpanel__empty muted">stack empty</p>
      ) : (
        <ol className="stackpanel__list">
          {items.map((item, i) => {
            const source = item.sourceCardId === null ? undefined : findCard(board, item.sourceCardId);
            return (
              <li
                key={item.id}
                className={`stackitem${i === 0 ? ' stackitem--next' : ''}`}
                // §9.1 — the arrow's tail. `s:` and not `c:`: a `StackItemView`
                // id and a `Card.id` collide (g1.jsonl has both as #56).
                ref={rects.register(stackKey(item.id))}
              >
                <span className="stackitem__thumb">
                  {source !== undefined && (
                    <ul className="row row--stack" style={{ '--slots': '1' } as React.CSSProperties}>
                      <CardTile
                        card={source}
                        kind="stack"
                        input={input}
                        art={art}
                        clicks={clicks}
                        mine={you !== null && item.controller === you}
                        zoom="down"
                        // The card's own tile on the battlefield owns `c:<id>`;
                        // this is the second copy of the same card.
                        anchor={false}
                      />
                    </ul>
                  )}
                </span>
                <span className="stackitem__body">
                  <span className="stackitem__text">{stackTextLabel(item.text)}</span>
                  <span className="stackitem__meta muted">
                    stack #{item.id} · {playerName(board, item.controller)}
                    {i === 0 && ' · resolves next'}
                  </span>
                  {(item.targetCardIds.length > 0 || item.targetPlayerIds.length > 0) && (
                    <span className="stackitem__targets">
                      {[
                        ...item.targetCardIds.map((id) => cardLabel(board, id)),
                        ...item.targetPlayerIds.map((id) => playerName(board, id)),
                      ].map((label) => (
                        <span key={label} className="chip chip--target">
                          {label}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
