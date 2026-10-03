/*
 * mtg-table — render/CardZoom.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * `Z` — one big card (report 10 §1, §12.2; Forge's `SHORTCUT_CARD_ZOOM` = 90).
 *
 * The card under the pointer, or the focused one. It is the `display` variant
 * (672×936 WEBP, 50 KB — measured in report 10 §0 as *fewer bytes* than the
 * 488×680 `normal` JPG), which is the one place on the board where the extra
 * pixels are visible.
 *
 * Two rules it inherits rather than re-implements:
 *
 *   - **The card goes through `CardTile`** like every other card on the board,
 *     so a concealed card zooms to a card back with no name in the DOM and a
 *     face-down card the viewer may look at keeps its "you may look" ribbon. A
 *     second big-card renderer would be a second place to leak a name.
 *   - **The credit travels with the art.** The Fan Content Policy and Scryfall's
 *     terms both require it wherever the image is shown, and this is the largest
 *     the image ever gets.
 *
 * The tile is rendered inert (`clicks={null}`): the zoom is a look, not a
 * click, and a card click that had to travel through an overlay would be a
 * second path to `act: clickCard`.
 */

import { artEntryFor, type ArtIndex } from '../art.ts';
import type { AnyCard, InputBody } from '../protocol.ts';
import { CardTile } from './CardTile.tsx';

export function CardZoom({
  card,
  art,
  input,
  mine,
  onClose,
}: {
  card: AnyCard;
  art: ArtIndex;
  input: InputBody | null;
  /** Whose controller stripe to draw — the same cue the board tile carries. */
  mine: boolean;
  onClose: () => void;
}): JSX.Element {
  const entry = artEntryFor(art, card);
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Card zoom">
      <div className="overlay__scrim" onClick={onClose} aria-hidden="true" />
      <div className="overlay__panel cardzoom">
        <ul className="row row--zoom" style={{ '--slots': '1' } as React.CSSProperties}>
          <CardTile
            card={card}
            kind="zoom"
            input={input}
            art={art}
            clicks={null}
            zoom="none"
            mine={mine}
            // The row tile owns `c:<id>` for the arrows; this is a second copy.
            anchor={false}
          />
        </ul>
        {entry !== null && (
          <p className="cardzoom__credit muted">
            {entry.setCode} #{entry.collectorNumber} · art by {entry.artist} · © Wizards of the
            Coast
          </p>
        )}
        <button type="button" className="btn btn--small" onClick={onClose} autoFocus>
          close (ESC or Z)
        </button>
      </div>
    </div>
  );
}
