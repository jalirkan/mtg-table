/*
 * mtg-table — render/PlayerRail.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * One seat: name, life, poison, counters, zone counts, floating mana
 * (report 10 §3.2).
 *
 * Two rules it carries:
 *
 *   - **The opponent's hand is a count, never tiles**, and `library` is a count
 *     plus only the cards a continuous "may look" effect reveals (amendment P2,
 *     docs/protocol.md §3.4). The revealed slice is drawn as real tiles because
 *     those cards ride on no `ask` — nothing blocks for them — so before P2 they
 *     were invisible forever.
 *   - **The name is a `<button>`** that sends `act: clickPlayer`, with the same
 *     `aria-label` M1 gave it, whatever `selectable.mode` says: Forge is the
 *     judge of a click (amendment M8). `selectable.mode === 'players'` is the
 *     only signal the wire carries about seats — `selectable.playerIds` is a
 *     planned §10.2 field — so it drives the outline and nothing else.
 */

import type { ArtIndex } from '../art.ts';
import type { GameStateBody, InputBody, PlayerState } from '../protocol.ts';
import { CardTile, type Clicks } from './CardTile.tsx';
import { counterLabel } from './labels.ts';
import { ManaPoolPips } from './Mana.tsx';
import { playerKey, useRects } from './rects.ts';

export function PlayerRail({
  player,
  you,
  board,
  input,
  art,
  clicks,
}: {
  player: PlayerState;
  you: number | null;
  board: GameStateBody;
  input: InputBody | null;
  art: ArtIndex;
  clicks: Clicks | null;
}): JSX.Element {
  const rects = useRects();
  const isYou = you !== null && player.id === you;
  const active = board.activePlayer === player.id;
  const priority = board.priority === player.id;
  const selectable = input !== null && input.selectable.mode === 'players';
  // §3.1 / §10.2 — poison has its own key and is shown beside life; the map is
  // everything else, printed with Forge's own counter names.
  const counters = Object.entries(player.counters).filter(([name]) => name !== 'POISON');
  const revealed = player.zones.library.cards;

  return (
    <section
      className={`rail ${isYou ? 'rail--you' : 'rail--opp'}${active ? ' rail--active' : ''}`}
      aria-label={`${player.name} — ${isYou ? 'you' : 'opponent'}`}
    >
      {/* §9.1 — an attack arrow ends on the seat it is attacking, so the rail's
          vitals block is where `p:<id>` is measured. The whole rail would put the
          arrowhead somewhere the eye does not read as "the player". */}
      <h2 className="rail__head" ref={rects.register(playerKey(player.id))}>
        <button
          type="button"
          className={`rail__name${selectable ? ' rail__name--selectable' : ''}`}
          disabled={clicks === null}
          data-act="clickPlayer"
          aria-label={`${player.name} — player ${String(player.id)}`}
          title={`act: clickPlayer ${String(player.id)}`}
          onClick={() => {
            clicks?.player(player.id);
          }}
        >
          {player.name}
        </button>
        <span className="rail__tags">
          {player.isAi ? 'AI' : 'human'}
          {isYou && ' · you'}
        </span>
      </h2>

      <div className="rail__vitals">
        <span className="life" title="life">
          <span className="life__glyph" aria-hidden="true">
            ♥
          </span>
          <span className="life__n">{player.life}</span>
          <span className="sr-only">life</span>
        </span>
        <span className={`poison${player.poison > 0 ? ' poison--on' : ''}`} title="poison counters">
          <span aria-hidden="true">☠</span> {player.poison}
          <span className="sr-only">poison</span>
        </span>
        <span className="rail__turnmark">
          {active && (
            <span className="pill pill--active" title="active player">
              active
            </span>
          )}
          {priority && (
            <span className="pill pill--priority" title="has priority">
              priority
            </span>
          )}
        </span>
      </div>

      <div className="rail__zones">
        <Count glyph="▤" label="library" n={player.zones.library.count} />
        <Count glyph="✋" label="hand" n={player.zones.hand.count} />
        <Count glyph="⚰" label="graveyard" n={player.zones.graveyard.count} />
        <Count glyph="◇" label="exile" n={player.zones.exile.count} />
        {player.zones.command.count > 0 && (
          <Count glyph="⌘" label="command" n={player.zones.command.count} />
        )}
      </div>

      <div className="rail__mana">
        <ManaPoolPips pool={player.manaPool} />
      </div>

      {counters.length > 0 && (
        <div className="rail__counters">
          {counters.map(([name, n]) => (
            <span key={name} className={`ctr ${counterLabel(name).cls}`}>
              <span className="ctr__n">{n}</span>
              <span className="ctr__t">{counterLabel(name).text}</span>
            </span>
          ))}
        </div>
      )}

      {revealed.length > 0 && (
        <div className="rail__revealed">
          <span className="k">
            library — revealed {revealed.length} of {player.zones.library.count}
          </span>
          <ul className="row row--strip" style={{ '--slots': String(revealed.length) } as React.CSSProperties}>
            {revealed.map((card, i) => (
              <CardTile
                key={card.id}
                card={card}
                kind="strip"
                input={input}
                art={art}
                clicks={clicks}
                index={i}
                mine={isYou}
                zoom="down"
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Count({ glyph, label, n }: { glyph: string; label: string; n: number }): JSX.Element {
  return (
    <span className="zc" title={label}>
      <span className="zc__g" aria-hidden="true">
        {glyph}
      </span>
      <span className="zc__n">{n}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
