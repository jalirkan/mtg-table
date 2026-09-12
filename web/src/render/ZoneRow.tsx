/*
 * mtg-table — render/ZoneRow.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * One horizontal row of tiles (report 10 §2.3, §3.3). One component for three
 * jobs — lands, permanents, the graveyard/exile strips — because they differ
 * only in `--cw` / `--ch` and in the filter that fed them. "Do not write three."
 *
 * **Rows never scroll; they overlap.** The row packs tighter as it fills, the
 * way a real table does, and the arithmetic lives in CSS (`--step` in
 * `styles.css`). What this component computes is a **slot count**, not a card
 * count, because a tapped tile is rotated and therefore wider:
 *
 *     slots = untapped + tapped × (CH / CW)      // CH/CW = 1.3934
 *
 * Past the point where the row is full the per-tile margin goes negative and the
 * cards shingle left-over-right; `--i` is handed down as the z-index so the
 * shingling stays consistent instead of letting DOM order fight `position`.
 */

import type { AnyCard, InputBody } from '../protocol.ts';
import { CardTile, type Clicks, type TileKind } from './CardTile.tsx';
import type { ArtIndex } from '../art.ts';

/** 488 : 680 — the exact Scryfall `grid`/`normal` ratio (report 10 §2.1). */
export const CARD_ASPECT = 680 / 488;

export interface ZoneRowProps {
  cards: AnyCard[];
  kind: TileKind;
  /** The faint caption at the row's left edge — "your lands", "opponent permanents". */
  label: string;
  input: InputBody | null;
  art: ArtIndex;
  clicks: Clicks | null;
  mine: boolean;
  zoom: 'up' | 'down' | 'none';
  /** §4.4 — Auras and Equipment hoisted into their host's tile. */
  attachmentsFor?: (hostId: number) => AnyCard[];
  /** One extra line of already-resolved combat text per card. */
  noteFor?: (card: AnyCard) => string | null;
  align?: 'centre' | 'start';
}

export function ZoneRow({
  cards,
  kind,
  label,
  input,
  art,
  clicks,
  mine,
  zoom,
  attachmentsFor,
  noteFor,
  align = 'centre',
}: ZoneRowProps): JSX.Element {
  const tapped = cards.filter((card) => 'tapped' in card && card.tapped === true).length;
  const slots = cards.length - tapped + tapped * CARD_ASPECT;

  return (
    <div className={`zonerow zonerow--${kind} zonerow--${align}`}>
      <span className="zonerow__label" aria-hidden="true">
        {label} <span className="zonerow__n">{cards.length}</span>
      </span>
      <ul
        className={`row row--${kind}`}
        style={{ '--slots': String(Math.max(slots, 1)) } as React.CSSProperties}
        aria-label={`${label} (${String(cards.length)})`}
      >
        {cards.map((card, i) => (
          <CardTile
            key={card.id}
            card={card}
            kind={kind}
            input={input}
            art={art}
            clicks={clicks}
            index={i}
            mine={mine}
            zoom={zoom}
            attachments={attachmentsFor?.(card.id) ?? []}
            note={noteFor?.(card) ?? null}
          />
        ))}
      </ul>
    </div>
  );
}
