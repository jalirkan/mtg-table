/*
 * mtg-table — render/HandFan.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The viewer's own hand, fanned (report 10 §2.4's bottom row).
 *
 * **Only the viewer's hand is ever drawn as tiles.** The opponent's hand is a
 * count in their `PlayerRail` and nothing else — that is both the reference look
 * and the cheapest possible redaction posture (report 10 §3.2). The cards that
 * arrive in the opponent's hand zone are five-key stubs anyway (hard rule 8), so
 * this is belt and braces, and belt and braces is the correct posture for the
 * one failure mode that cannot be walked back.
 *
 * Every card in your hand is a `<button>` whether or not it is in
 * `input.selectable` (amendment M8): `selectable` is empty for the whole of your
 * main phase, which is exactly when you want to play a land.
 */

import type { ArtIndex } from '../art.ts';
import type { AnyCard, InputBody } from '../protocol.ts';
import { CardTile, type Clicks } from './CardTile.tsx';
import { CARD_ASPECT } from './ZoneRow.tsx';

export function HandFan({
  cards,
  input,
  art,
  clicks,
  count,
}: {
  cards: AnyCard[];
  input: InputBody | null;
  art: ArtIndex;
  clicks: Clicks | null;
  /** `zone.count` — authoritative even when fewer cards were serialised. */
  count: number;
}): JSX.Element {
  const tapped = cards.filter((card) => 'tapped' in card && card.tapped === true).length;
  const slots = cards.length - tapped + tapped * CARD_ASPECT;
  const n = Math.max(cards.length, 1);

  return (
    <div className="hand">
      <span className="hand__label" aria-hidden="true">
        your hand <span className="zonerow__n">{count}</span>
      </span>
      {cards.length === 0 ? (
        <p className="hand__empty muted">no cards in hand</p>
      ) : (
        <ul
          className="row row--hand hand__fan"
          style={
            {
              '--slots': String(Math.max(slots, 1)),
              '--n': String(n),
            } as React.CSSProperties
          }
          aria-label={`your hand (${String(count)})`}
        >
          {cards.map((card, i) => (
            <CardTile
              key={card.id}
              card={card}
              kind="hand"
              input={input}
              art={art}
              clicks={clicks}
              index={i}
              mine
              zoom="up"
            />
          ))}
        </ul>
      )}
      {count > cards.length && (
        <span className="hand__more muted">
          + {count - cards.length} not serialised (count is authoritative)
        </span>
      )}
    </div>
  );
}
