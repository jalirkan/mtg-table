/*
 * mtg-table — render/ZoneBrowser.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **M5: something to open.** The graveyard and exile strips are 45 px tall and
 * shingle as they fill; a graveyard of twelve is a smear. This is the panel that
 * lists one zone properly — *"click a graveyard or exile strip (or the library's
 * revealed slice) to open a panel listing that zone's cards as `CardTile`s"*.
 *
 * Three rules:
 *
 *   1. **Every card goes through `CardTile`** (hard rule 8's renderer half,
 *      `PLAN.md`: *"a zone browser … that draws its own card component is how a
 *      name for a `hidden: true` id gets back onto the screen"*). The tiles are
 *      `anchor={false}`: the strip's own tile is where the card **is** for the
 *      arrows overlay, and this is a second copy of it (report 10 §9.1).
 *   2. **Which zones may be opened is `zones.ts`, not this file.** The rule that
 *      another seat's hand is never drawn is pure, tested from `node --test`
 *      over the corpus, and this component simply cannot express a panel that
 *      breaks it: {@link panelCards} answers `[]`.
 *   3. **It is a view, not a question.** `input.openZones` is a hint and was
 *      never a question (§4.3), so nothing here sends anything; clicks on the
 *      tiles are the ordinary `act: clickCard`, which is how Forge's own
 *      floating zone panels behave.
 */

import type { ArtIndex } from '../art.ts';
import type { GameStateBody } from '../protocol.ts';
import { CardTile, type Clicks } from './CardTile.tsx';
import { panelCards, panelCount, panelTitle, type ZonePanelRef } from './zones.ts';

export function ZoneBrowser({
  panels,
  board,
  you,
  art,
  clicks,
  fromHint,
  onClose,
}: {
  panels: readonly ZonePanelRef[];
  board: GameStateBody;
  you: number | null;
  art: ArtIndex;
  clicks: Clicks | null;
  /** The engine asked for these (§4.3), rather than the player clicking a strip. */
  fromHint: boolean;
  onClose: () => void;
}): JSX.Element | null {
  if (panels.length === 0) return null;
  return (
    <div className="zonebrowser" aria-label="Zone browser">
      <div className="zonebrowser__head">
        <h2>
          {fromHint ? 'Zones the engine opened' : 'Zone'}{' '}
          <span className="muted">
            {fromHint
              ? '— input.openZones is a view hint; it reveals no cards (§4.3)'
              : '— everything in it, at a readable size'}
          </span>
        </h2>
        <button type="button" className="btn btn--small" onClick={onClose}>
          close (ESC)
        </button>
      </div>
      <div className="zonebrowser__panels">
        {panels.map((ref) => {
          const cards = panelCards(board, ref, you);
          const count = panelCount(board, ref);
          return (
            <section key={`${String(ref.playerId)}:${ref.zone}`} className="zonebrowser__panel">
              <h3>
                {panelTitle(board, ref)}{' '}
                <span className="muted">
                  {cards.length === count
                    ? `${String(count)} card${count === 1 ? '' : 's'}`
                    : // §3.4 / P2: a library carries `count` plus only the cards
                      // the viewer may see. Saying so is the honest rendering;
                      // drawing `count` card backs would invent cards.
                      `${String(cards.length)} shown of ${String(count)}`}
                </span>
              </h3>
              {cards.length === 0 ? (
                <p className="muted">
                  {count === 0 ? 'empty' : 'nothing in this zone is visible from this seat'}
                </p>
              ) : (
                <ul className="zonebrowser__cards">
                  {cards.map((card, i) => (
                    <CardTile
                      key={card.id}
                      card={card}
                      kind="bf"
                      input={null}
                      art={art}
                      clicks={clicks}
                      index={i}
                      mine={you !== null && ref.playerId === you}
                      zoom="none"
                      // The strip's tile owns `c:<id>`; this is a second copy.
                      anchor={false}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
