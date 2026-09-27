/*
 * mtg-table — cards/CardView.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The card browser's own card renderer.** It draws a library card — public
 * Scryfall data — and nothing from a game, which is why it exists at all rather
 * than reusing `render/CardTile.tsx`: that is THE board renderer, the renderer's
 * half of hard rule 8, and its importer list is closed at ten files (CLAUDE.md,
 * M4 convention 2). This file must never import it, and never be imported by
 * anything under `render/` or `arena/`.
 *
 * The image ladder is `text.ts`'s `imageSources`: the same-origin cache
 * (`/cards/img/<id>/normal`, from `var/cards`) first, Scryfall's CDN on a miss
 * or an error, and a generated text frame when both fail or Scryfall has no
 * image. The image is drawn whole — never cropped, stretched or recoloured
 * (Scryfall's image terms, NOTICE §2) — and every image carries the artist
 * credit line under it.
 */

import { useState } from 'react';

import type { LibraryCard } from './model.ts';
import { Pips, RulesText } from './Pips.tsx';
import { artistCredit, imageSources, statLine } from './text.ts';

/** The frame drawn when there is no image to show: name, cost, type, text, P/T. */
export function TextFrame({ card, full }: { card: LibraryCard; full: boolean }): JSX.Element {
  const stats = statLine(card);
  return (
    <div className="cardlib-frame">
      <div className="cardlib-frame__head">
        <span className="cardlib-frame__name">{card.name}</span>
        <Pips cost={card.manaCost} />
      </div>
      <div className="cardlib-frame__art" aria-hidden="true" />
      <div className="cardlib-frame__type">{card.typeLine}</div>
      {full ? (
        <RulesText text={card.oracleText} className="cardlib-frame__text" />
      ) : (
        <div className="cardlib-frame__text" />
      )}
      {stats !== null && <div className="cardlib-frame__stats">{stats}</div>}
    </div>
  );
}

/**
 * One card: its image (or the text frame) and the credit line.
 * `variant` only changes sizing classes; the ladder is the same everywhere.
 */
export function CardView({
  card,
  variant,
  side = 'front',
}: {
  card: LibraryCard;
  variant: 'tile' | 'detail';
  side?: 'front' | 'back';
}): JSX.Element {
  const { primary, fallback } = imageSources(card, side);
  // 0 = primary, 1 = fallback, 2 = both failed. The parent keys this component
  // by card id + side, so a new card starts again at 0.
  const [failed, setFailed] = useState(0);
  const src = failed === 0 ? primary : failed === 1 ? fallback : null;
  const noImage = src === null || card.imageStatus === 'missing';

  return (
    <figure className={`cardlib-card cardlib-card--${variant}`}>
      {noImage ? (
        <TextFrame card={card} full={variant === 'detail'} />
      ) : (
        <img
          className="cardlib-card__img"
          src={src}
          alt={card.name}
          loading={variant === 'tile' ? 'lazy' : 'eager'}
          decoding="async"
          referrerPolicy="no-referrer"
          width={488}
          height={680}
          data-source={src.startsWith('/cards/img/') ? 'cache' : 'scryfall'}
          onError={() => {
            setFailed((n) => (n === 0 && fallback !== null ? 1 : 2));
          }}
        />
      )}
      <figcaption className="cardlib-card__credit">{artistCredit(card)}</figcaption>
    </figure>
  );
}
