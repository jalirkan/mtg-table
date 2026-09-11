/*
 * mtg-table — render/Board.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The M1 board: deliberately plain text. Every zone is a list of card names with
 * markers; hidden cards are "card back"; a library is a count plus the cards a
 * continuous "may look" effect reveals (amendment P2). The only non-text element
 * allowed in M1 is the small art thumbnail next to a visible card name
 * (synthesis §9-M1 / §7).
 *
 * Three amendment-shaped rules live in here:
 *   - a face-down card shows its real face ONLY through `alt`, which the bridge
 *     emits only when `canFaceDownBeShownTo(viewer)` (P3);
 *   - every card id is resolved against the frame being rendered and nothing is
 *     cached across frames, because ids are stable and a cache would keep naming
 *     a card that went back into a hidden zone (P5);
 *   - the running log comes from `reduce()`, not from this component, so
 *     stepping backwards re-derives it (P20).
 *
 * `render(state)` is total: `input` and `ask` live inside the one `ClientState`
 * (docs/protocol.md §4.1), so there is no correlation state machine here and no
 * rules logic anywhere. A card is outlined iff the engine put its id in
 * `input.selectable.cardIds`; a button is enabled iff the engine said so.
 * Nothing is clickable yet — that is M3.
 */

import { artFor, type ArtIndex } from '../art.ts';
import {
  altFace,
  isFaceDownHidden,
  isHidden,
  MANA_COLORS,
  type AltFace,
  type AnyCard,
  type AskBody,
  type AskOption,
  type Card,
  type CardZone,
  type Combat,
  type EntityRef,
  type FaceDownCard,
  type GameEvent,
  type GameStateBody,
  type InputBody,
  type LibraryZone,
  type PlayerState,
  type StackItem,
} from '../protocol.ts';
import type { ClientState, LogEntry, TimestampedNotice } from '../reduce.ts';
import { describeEvent, phaseLabel, stackTextLabel } from './describe.ts';

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

export interface BoardProps {
  state: ClientState;
  art: ArtIndex;
}

export function Board({ state, art }: BoardProps): JSX.Element {
  const { board, hello, input } = state;
  const you = hello?.you ?? state.session?.seat ?? null;

  if (board === null) {
    return (
      <div className="board board--empty">
        <p className="muted">
          No <code>state</code> frame yet — step forward, or press play.
        </p>
        {state.hello !== null && <HelloPanel state={state} />}
        <NoticeList notices={state.notices} />
      </div>
    );
  }

  // The opponent goes on top, the way a table looks from your chair.
  const seated = orderSeats(board.players, you);

  return (
    <div className="board">
      <TurnStrip board={board} you={you} />
      {state.gameOver !== null && (
        <div className="banner banner--over" role="status">
          <strong>Game over.</strong>{' '}
          {state.gameOver.winner === null
            ? 'Draw.'
            : `Winner: ${playerName(board, state.gameOver.winner)}.`}{' '}
          {state.gameOver.reason ?? '(the engine had not published a win condition yet)'}
          {!state.gameOver.matchOver && ' (the match continues)'}
        </div>
      )}

      {seated.map((player) => (
        <PlayerPanel
          key={player.id}
          player={player}
          you={you}
          board={board}
          input={input}
          art={art}
        />
      ))}

      <div className="columns">
        <StackPanel stack={board.stack} board={board} input={input} art={art} />
        <CombatPanel combat={board.combat} board={board} />
      </div>

      <div className="columns">
        <InputPanel input={input} />
        <AskPanel ask={state.ask} />
      </div>

      <div className="columns">
        <EventList events={state.events} dropped={state.droppedEventKinds} />
        <NoticeList notices={state.notices} />
      </div>

      <GameLogPanel log={state.log} board={board} />

      <HelloPanel state={state} />
    </div>
  );
}

/** The viewer's own seat first from the bottom: opponent(s) on top, you below. */
function orderSeats(players: PlayerState[], you: number | null): PlayerState[] {
  if (you === null) return players;
  return [...players.filter((p) => p.id !== you), ...players.filter((p) => p.id === you)];
}

function playerName(board: GameStateBody, id: number | null): string {
  if (id === null) return '—';
  return board.players.find((p) => p.id === id)?.name ?? `player ${String(id)}`;
}

// ---------------------------------------------------------------------------
// Turn / phase strip
// ---------------------------------------------------------------------------

function TurnStrip({ board, you }: { board: GameStateBody; you: number | null }): JSX.Element {
  return (
    <div className="strip">
      <span className="strip__cell">
        <span className="k">game</span> {board.gameId}
      </span>
      <span className="strip__cell">
        {/* §3.1: `turn` counts player turns; `round` is ceil(turn/2). Label both. */}
        <span className="k">turn</span> {board.turn} <span className="k">round</span> {board.round}
      </span>
      <span className="strip__cell strip__cell--phase">
        <span className="k">phase</span> {phaseLabel(board.phase)}{' '}
        {board.phase !== null && <span className="muted">({board.phase})</span>}
      </span>
      <span className="strip__cell">
        <span className="k">active</span> {playerName(board, board.activePlayer)}
      </span>
      <span className="strip__cell">
        <span className="k">priority</span> {playerName(board, board.priority)}
      </span>
      <span className="strip__cell">
        <span className="k">you</span> {you === null ? '—' : playerName(board, you)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

interface PlayerPanelProps {
  player: PlayerState;
  you: number | null;
  board: GameStateBody;
  input: InputBody | null;
  art: ArtIndex;
}

function PlayerPanel({ player, you, board, input, art }: PlayerPanelProps): JSX.Element {
  const isYou = you !== null && player.id === you;
  const mana = MANA_COLORS.map((c) => `${c}:${String(player.manaPool[c])}`).join(' ');
  const counters = Object.entries(player.counters);

  return (
    <section className={`player${isYou ? ' player--you' : ''}`}>
      <h2>
        {player.name}
        <span className="muted">
          {' '}
          #{player.id} {player.isAi ? 'AI' : 'human'}
          {isYou && ' — you'}
          {player.id === board.activePlayer && ' · active'}
          {player.id === board.priority && ' · priority'}
        </span>
      </h2>

      <div className="vitals">
        <span>
          <span className="k">life</span> {player.life}
        </span>
        <span>
          <span className="k">poison</span> {player.poison}
        </span>
        <span>
          <span className="k">mana</span> <code>{mana}</code>
        </span>
        {counters.length > 0 && (
          <span>
            <span className="k">counters</span>{' '}
            {counters.map(([name, n]) => `${name}×${String(n)}`).join(' ')}
          </span>
        )}
        <span>
          <span className="k">library</span> {player.zones.library.count} cards
        </span>
      </div>

      <ZoneList label="Battlefield" zone={player.zones.battlefield} input={input} art={art} board={board} />
      <ZoneList label="Hand" zone={player.zones.hand} input={input} art={art} board={board} />
      <ZoneList label="Graveyard" zone={player.zones.graveyard} input={input} art={art} board={board} />
      <ZoneList label="Exile" zone={player.zones.exile} input={input} art={art} board={board} />
      <ZoneList label="Command" zone={player.zones.command} input={input} art={art} board={board} />
      <LibraryPanel library={player.zones.library} input={input} art={art} board={board} />
    </section>
  );
}

/**
 * §3.4 amended (P2). The library is a count **plus** whatever a continuous
 * "may look" effect reveals — Future Sight, Bolas's Citadel, Oracle of Mul Daya.
 * Those cards ride on no `ask` (nothing blocks), so before the amendment they
 * were invisible forever.
 *
 * The array is never a redacted stub and never completes the count, so the
 * panel is only drawn when there is something in it, and it says out loud how
 * much of the library it is showing.
 */
function LibraryPanel({
  library,
  input,
  art,
  board,
}: {
  library: LibraryZone;
  input: InputBody | null;
  art: ArtIndex;
  board: GameStateBody;
}): JSX.Element | null {
  const cards = library.cards;
  if (cards.length === 0) return null;
  return (
    <div className="zone zone--library">
      <h3>
        Library — revealed{' '}
        <span className="muted">
          ({cards.length} of {library.count})
        </span>
      </h3>
      <ul className="cards">
        {cards.map((card) => (
          <CardLine key={card.id} card={card} input={input} art={art} board={board} />
        ))}
      </ul>
      <p className="muted">
        a continuous effect lets this seat look at {cards.length === 1 ? 'this card' : 'these cards'}
        ; the other {library.count - cards.length} are a count and nothing else
      </p>
    </div>
  );
}

interface ZoneListProps {
  label: string;
  zone: CardZone;
  input: InputBody | null;
  art: ArtIndex;
  board: GameStateBody;
}

function ZoneList({ label, zone, input, art, board }: ZoneListProps): JSX.Element | null {
  if (zone.count === 0 && zone.cards.length === 0) return null;
  return (
    <div className="zone">
      <h3>
        {label} <span className="muted">({zone.count})</span>
      </h3>
      <ul className="cards">
        {zone.cards.map((card) => (
          <CardLine key={card.id} card={card} input={input} art={art} board={board} />
        ))}
      </ul>
      {zone.count > zone.cards.length && (
        <p className="muted">
          + {zone.count - zone.cards.length} not serialised (count is authoritative)
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// One card
// ---------------------------------------------------------------------------

interface CardLineProps {
  card: AnyCard;
  input: InputBody | null;
  art: ArtIndex;
  board: GameStateBody;
}

function CardLine({ card, input, art, board }: CardLineProps): JSX.Element {
  // The engine's answer, echoed. The client computes no legality (§9 invariant 8).
  const selectable =
    input !== null && input.selectable.mode === 'cards' && input.selectable.cardIds.includes(card.id);
  const highlighted = input !== null && input.highlighted.includes(card.id);
  const focused = input !== null && input.focusCardId === card.id;

  const className = [
    'card',
    isHidden(card) ? 'card--hidden' : '',
    selectable ? 'card--selectable' : '',
    highlighted ? 'card--highlighted' : '',
    focused ? 'card--focus' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // §3.3 gate 2: a face-down permanent. Its *state* is public — everyone can see
  // that it is tapped, attacking, damaged — but not which card it is, so it gets
  // its markers and no name and no art.
  if (isFaceDownHidden(card)) {
    return (
      <li className={className}>
        <span className="thumb thumb--back" aria-hidden="true" />
        <span className="card__name">face-down card</span>
        <span className="muted"> #{card.id}</span>
        <FaceDownMarkers card={card} board={board} />
      </li>
    );
  }

  // §3.3 gate 1: the viewer may not see this card at all. Five keys (P1) — the
  // owner is one of them, because `canBeShownTo` compares controllers while the
  // zone arrays are keyed by the zone's player, and the two can differ.
  if (isHidden(card)) {
    return (
      <li className={className}>
        <span className="thumb thumb--back" aria-hidden="true" />
        <span className="card__name">card back</span>
        <span className="muted">
          {' '}
          #{card.id}
          {card.owner !== null && card.owner !== undefined && card.owner !== card.controller && (
            <> · owned by {playerName(board, card.owner)}</>
          )}
        </span>
      </li>
    );
  }

  const thumb = artFor(art, card);
  // §3.2: a face-down card's `getCurrentState()` name is "" — Forge's own
  // face-down characteristic, not a missing value. Never print it bare.
  const shownName = displayName(card);
  // P3: the real face, and ONLY when this seat may look at it. `alt` present
  // means `canFaceDownBeShownTo(viewer)` was true — this is the viewer's own
  // morph, the one thing M1 could not render at all.
  const alt = altFace(card);

  return (
    <li className={className}>
      {card.faceDown ? (
        <span className="thumb thumb--back" aria-hidden="true" />
      ) : thumb.kind === 'image' ? (
        <img
          className="thumb"
          src={thumb.url}
          alt=""
          loading="lazy"
          decoding="async"
          title={`${card.name} — ${thumb.setCode} #${thumb.collectorNumber} — art by ${thumb.artist}`}
        />
      ) : (
        <span className="thumb thumb--text" aria-hidden="true">
          {shownName.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="card__name">{shownName}</span>
      {/* §3.2: null is the one spelling of "no mana cost" — every land, every
          token. There is no "" and no "no cost" to paper over any more. */}
      {card.manaCost !== null && <span className="cost"> {card.manaCost}</span>}
      <span className="muted"> #{card.id}</span>
      <Markers card={card} board={board} />
      {alt !== null && <AltBlock alt={alt} />}
      {/* §3.2: "" is the one spelling of "no type line" — a face-down card
          outside battlefield/stack has no public body at all. */}
      {card.types !== '' && <div className="card__types muted">{card.types}</div>}
      {card.abilities.length > 0 && (
        <ul className="abilities">
          {card.abilities.map((ability) => (
            <li key={ability.id} className={ability.canPlay ? 'ability ability--can' : 'ability'}>
              {ability.canPlay ? '▸ ' : '· '}
              {ability.text}
              {ability.isSpell && <span className="muted"> (spell)</span>}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * What to call a card that has a shape but may have no name. A face-down card
 * comes through with `name: ""` — Forge's face-down characteristic verbatim
 * (`CardUtil.getFaceDownCharacteristic`), not a missing value — so printing it
 * raw leaves a blank line where a 2/2 is standing.
 */
function displayName(card: Card): string {
  if (card.name !== '') return card.name;
  if (card.faceDown) return 'face-down card';
  return '(unnamed card)';
}

/**
 * P3 — the real face of a face-down card this seat may look at. Rendered as a
 * separate, visibly-marked block rather than as the card's name, because the
 * *table* sees a 2/2 with no name and only this seat sees what it is.
 */
function AltBlock({ alt }: { alt: AltFace }): JSX.Element {
  const pt = alt.power !== null || alt.toughness !== null
    ? ` ${alt.power ?? '?'}/${alt.toughness ?? '?'}`
    : '';
  return (
    <div className="card__alt">
      <span className="k">you may look</span> {alt.name}
      {alt.manaCost !== null && <span className="cost"> {alt.manaCost}</span>}
      {alt.types !== '' && <span className="muted"> — {alt.types}</span>}
      {pt !== '' && <span className="muted">{pt}</span>}
    </div>
  );
}

function Markers({ card, board }: { card: Card; board: GameStateBody }): JSX.Element {
  const marks: string[] = [];
  if (card.power !== null || card.toughness !== null) {
    marks.push(`${card.power ?? '?'}/${card.toughness ?? '?'}`);
  }
  if (card.loyalty !== null) marks.push(`loyalty ${card.loyalty}`);
  if (card.tapped) marks.push('tapped');
  if (card.sick) marks.push('summoning sick');
  if (card.attacking) marks.push('attacking');
  if (card.blocking) marks.push('blocking');
  if (card.faceDown) marks.push('face down');
  // P15: a token has a card id but no printing behind it, so an art miss for one
  // is expected rather than a hole in art.json.
  if (card.token) marks.push('token');
  if (card.damage > 0) marks.push(`${String(card.damage)} damage`);
  for (const [name, n] of Object.entries(card.counters)) marks.push(`${name}×${String(n)}`);
  if (card.attachedToId !== null) marks.push(`attached to #${String(card.attachedToId)}`);
  if (card.attachmentIds.length > 0) {
    marks.push(`attachments ${card.attachmentIds.map((id) => `#${String(id)}`).join(' ')}`);
  }
  return <MarkList marks={marks} card={card} board={board} />;
}

/** §3.3 gate 2. The public half of a face-down permanent, and nothing else. */
function FaceDownMarkers({ card, board }: { card: FaceDownCard; board: GameStateBody }): JSX.Element {
  const marks: string[] = [];
  if (card.power !== null || card.toughness !== null) {
    marks.push(`${card.power ?? '?'}/${card.toughness ?? '?'}`);
  }
  if (card.tapped) marks.push('tapped');
  if (card.attacking) marks.push('attacking');
  if (card.blocking) marks.push('blocking');
  if (card.damage > 0) marks.push(`${String(card.damage)} damage`);
  for (const [name, n] of Object.entries(card.counters)) marks.push(`${name}×${String(n)}`);
  return <MarkList marks={marks} card={card} board={board} />;
}

function MarkList({
  marks,
  card,
  board,
}: {
  marks: string[];
  card: AnyCard;
  board: GameStateBody;
}): JSX.Element {
  const all = [...marks];
  const defended = board.combat?.bands.find((band) => band.blockerIds.includes(card.id));
  if (defended !== undefined) {
    all.push(`blocks ${defended.attackerIds.map((id) => `#${String(id)}`).join(', ')}`);
  }

  if (all.length === 0) return <span />;
  return (
    <span className="marks">
      {all.map((mark) => (
        <span key={mark} className="mark">
          {mark}
        </span>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Stack and combat
// ---------------------------------------------------------------------------

function StackPanel({
  stack,
  board,
  input,
  art,
}: {
  stack: StackItem[];
  board: GameStateBody;
  input: InputBody | null;
  art: ArtIndex;
}): JSX.Element {
  return (
    <section className="panel">
      <h2>
        Stack <span className="muted">({stack.length})</span>
      </h2>
      {stack.length === 0 ? (
        <p className="muted">empty</p>
      ) : (
        <ol className="stack">
          {/* §3.1: bottom first; the LAST element resolves next. */}
          {stack.map((item, i) => (
            <li key={item.id} className={i === stack.length - 1 ? 'stack__top' : undefined}>
              {/* §10.1: stack ids and card ids are different spaces and collide.
                  Label this one "stack" and reach the card via sourceCardId. */}
              <span className="muted">stack #{item.id}</span> {stackTextLabel(item.text)}
              <span className="muted">
                {' '}
                {/* §3.3: the card is in state.stackCards, not in a player zone —
                    a spell on the stack is in ZoneType.Stack. cardLabel looks
                    there first. */}
                — from {cardLabel(board, item.sourceCardId)}, controlled by{' '}
                {playerName(board, item.controller)}
                {i === stack.length - 1 && ' · resolves next'}
              </span>
              {(item.targetCardIds.length > 0 || item.targetPlayerIds.length > 0) && (
                <div className="targets">
                  targets:{' '}
                  {[
                    ...item.targetCardIds.map((id) => cardLabel(board, id)),
                    ...item.targetPlayerIds.map((id) => playerName(board, id)),
                  ].join(', ')}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      {/* §3.3: the cards the stack items came from. A spell on the stack is in
          ZoneType.Stack, which is not one of the six zones a player carries, so
          without this the card that is *currently resolving* — the one moment a
          player most needs to see it — would have only `text`. */}
      {board.stackCards.length > 0 && (
        <div className="zone">
          <h3>
            Cards on the stack <span className="muted">({board.stackCards.length})</span>
          </h3>
          <ul className="cards">
            {board.stackCards.map((card) => (
              <CardLine key={card.id} card={card} input={input} art={art} board={board} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function CombatPanel({ combat, board }: { combat: Combat | null; board: GameStateBody }): JSX.Element {
  return (
    <section className="panel">
      <h2>Combat</h2>
      {combat === null ? (
        <p className="muted">not in combat</p>
      ) : combat.bands.length === 0 ? (
        <p className="muted">no attackers declared</p>
      ) : (
        <ul className="bands">
          {combat.bands.map((band, i) => (
            <li key={`${String(i)}-${band.attackerIds.join('.')}`}>
              <strong>{band.attackerIds.map((id) => cardLabel(board, id)).join(', ')}</strong>
              {' → '}
              {entityLabel(board, band.defender)}
              {band.blockerIds.length === 0 ? (
                <span className="muted"> · unblocked</span>
              ) : (
                <>
                  {' blocked by '}
                  {band.blockerIds.map((id) => cardLabel(board, id)).join(', ')}
                  {band.damageOrder.length > 0 && (
                    <span className="muted">
                      {' '}
                      · damage order {band.damageOrder.map((id) => `#${String(id)}`).join(' → ')}
                    </span>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Resolve a card id against this frame. An id that does not resolve is a card
 * the viewer may not see, which is correct, not a bug (§3.6 rule 1).
 *
 * `stackCards` first: a spell on the stack is in `ZoneType.Stack` and is in no
 * player zone at all, and the stack is exactly where a player most wants to know
 * what the card is.
 */
function cardLabel(board: GameStateBody, id: number | null): string {
  if (id === null) return '—';
  const hit = findCard(board, id);
  if (hit === undefined) return `#${String(id)}`;
  if (isFaceDownHidden(hit)) return `face-down card #${String(id)}`;
  if (isHidden(hit)) return `card back #${String(id)}`;
  return `${displayName(hit)} #${String(id)}`;
}

/**
 * Look a card up **in the frame being rendered**, and nowhere else.
 *
 * §9 invariant 10 (P5): card ids are stable across zone changes, so a lookup
 * table that outlived a frame would keep naming a card after it went back to a
 * hidden zone. This walks the current snapshot every time; a game's board is a
 * few dozen cards and the cost is nothing next to the guarantee.
 */
function findCard(board: GameStateBody, id: number): AnyCard | undefined {
  const onStack = board.stackCards.find((card) => card.id === id);
  if (onStack !== undefined) return onStack;
  for (const player of board.players) {
    for (const zone of [
      player.zones.battlefield,
      player.zones.hand,
      player.zones.graveyard,
      player.zones.exile,
      player.zones.command,
    ]) {
      const hit = zone.cards.find((card) => card.id === id);
      if (hit !== undefined) return hit;
    }
    // P2: the revealed slice of a library is a real place a card can be.
    const revealed = player.zones.library.cards?.find((card) => card.id === id);
    if (revealed !== undefined) return revealed;
  }
  return undefined;
}

/** §3.1: every `defender` on the wire is nullable, so this is total over null. */
function entityLabel(board: GameStateBody, ref: EntityRef | null): string {
  if (ref === null) return '—';
  return ref.kind === 'player' ? playerName(board, ref.id) : cardLabel(board, ref.id);
}

// ---------------------------------------------------------------------------
// input / ask / notices / events
// ---------------------------------------------------------------------------

function InputPanel({ input }: { input: InputBody | null }): JSX.Element {
  return (
    <section className="panel">
      <h2>Input</h2>
      {input === null ? (
        <p className="muted">the engine has not asked for anything yet</p>
      ) : (
        <>
          <p className="prompt">{input.prompt}</p>
          <div className="buttons">
            <button type="button" disabled={!input.buttons.ok.enabled}>
              {input.buttons.ok.label}
            </button>
            <button type="button" disabled={!input.buttons.cancel.enabled}>
              {input.buttons.cancel.label}
            </button>
          </div>
          <p className="muted">
            selectable ({input.selectable.mode}): {input.selectable.cardIds.length} ids, choose{' '}
            {input.selectable.min}–{input.selectable.max}
            {input.focusCardId !== null && ` · focus #${String(input.focusCardId)}`}
            {/* Report 07 A8 (P7): `setWeaklySelectable` — what Forge's own
                "Auto" would have tapped. Ids only; the client suggests nothing
                of its own. */}
            {input.weak.length > 0 && (
              <> · weak {input.weak.map((id) => `#${String(id)}`).join(' ')}</>
            )}
          </p>
          {/* P7 / report 06 §6.9: `setCard` and `setPanelSelection` are pushed
              with cards that are frequently NOT in the snapshot (a library card
              during surveil), so the focus card travels as a serialised card,
              not just an id. */}
          {input.focusCard !== null && (
            <p className="muted">
              focus card: {isHidden(input.focusCard) ? `card back #${String(input.focusCard.id)}` : cardOptionLabel(input.focusCard)}
            </p>
          )}
          {/* P6 / report 06 §3: `openZones` and `tempShowZones` reveal NOTHING —
              `PlayerZoneUpdate` is (PlayerView, Set<ZoneType>) and has no card
              accessor. They are "open a floating zone panel" hints, answered
              locally, which is why they are no longer an ask kind. */}
          {input.openZones.length > 0 && (
            <p className="muted">
              open zones:{' '}
              {input.openZones
                .map((hint) => `player ${String(hint.playerId)} ${hint.zones.join('/')}`)
                .join(', ')}
            </p>
          )}
          {/* §4.2 — the invariant that stalls a button-only client. */}
          {!input.buttons.ok.enabled && input.selectable.cardIds.length > 0 && (
            <p className="hint">
              OK is disabled and cards are selectable: the engine wants a <strong>card click</strong>,
              not a button.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function AskPanel({ ask }: { ask: AskBody | null }): JSX.Element {
  return (
    <section className="panel">
      <h2>Ask</h2>
      {ask === null ? (
        <p className="muted">no outstanding question</p>
      ) : (
        <div className="ask">
          <p>
            <span className="k">{ask.kind}</span> <span className="muted">{ask.askId}</span>{' '}
            <span className="muted">timeout {ask.timeoutMs} ms</span>
          </p>
          <p className="prompt">{askPrompt(ask)}</p>
          <ul className="ask__options">
            {askOptions(ask).map((line, i) => (
              <li key={`${String(i)}-${line}`}>{line}</li>
            ))}
          </ul>
          <p className="hint">
            The game thread is blocked on this. M1 renders it; M2/M5 answer it.
          </p>
        </div>
      )}
    </section>
  );
}

function askPrompt(ask: AskBody): string {
  switch (ask.kind) {
    case 'confirm':
    case 'options':
    case 'text':
    case 'order':
    case 'choose_entities':
    case 'manipulate_list':
      return ask.prompt;
    case 'assign_amount':
      // This kind has no prompt of its own: Forge gives an `amountLabel` for
      // what the amount IS ("damage", "counters"), and the source card.
      return `Assign ${String(ask.total)} ${ask.label}${ask.sourceCardId === null ? '' : ` from #${String(ask.sourceCardId)}`}`;
    case 'choose_list':
      // Report 07 A7 (P7): `AbstractGuiGame.reveal` is `getChoices(msg, -1, -1,
      // items)`. A min/max of -1 is not a choice — it is "look at these" — and a
      // client that renders it literally asks the user to pick minus one card.
      return ask.reveal ? `${ask.prompt} (reveal — acknowledge only)` : ask.prompt;
    case 'ability_menu':
      return `Choose an ability of card #${String(ask.cardId)}`;
    case 'assign_damage':
      return `Assign ${String(ask.total)} combat damage from #${String(ask.attackerId)}` +
        `${ask.overrideOrder ? ' (order overridden)' : ''}${ask.maySkip ? ' (may skip)' : ''}`;
    case 'sideboard':
      return ask.prompt ?? 'Sideboard';
  }
}

/**
 * A label for one ask option (P7). The option already carries the label the
 * engine wants shown — `"???"` when the card behind it is concealed — so this
 * only adds the ask-local index and, when the option carries a serialised card,
 * the card's own line. It never builds a name of its own: report 07 §7 notes
 * that `String.valueOf(CardView)` prints the card's name, and an option label is
 * the one place outside `Snap.card` where that can leak.
 */
function askOptionLine(option: AskOption): string {
  const bits: string[] = [`[${String(option.id)}]`, option.label];
  if (option.card !== undefined) bits.push(`— ${cardOptionLabel(option.card)}`);
  else if (option.cardId !== undefined) bits.push(`— card #${String(option.cardId)}`);
  else if (option.playerId !== undefined) bits.push(`— player ${String(option.playerId)}`);
  else if (option.abilityId !== undefined) bits.push(`— ability #${String(option.abilityId)}`);
  return bits.join(' ');
}

/** A card inside an ask/input body, through the same three-shape discipline. */
function cardOptionLabel(card: AnyCard): string {
  if (isFaceDownHidden(card)) return `face-down card #${String(card.id)}`;
  if (isHidden(card)) return `card back #${String(card.id)}`;
  return `${displayName(card)} #${String(card.id)}`;
}

function askOptions(ask: AskBody): string[] {
  switch (ask.kind) {
    case 'ability_menu':
      return ask.options.map(askOptionLine);
    case 'confirm':
      return [
        ask.yesLabel,
        ask.noLabel,
        // §5.2: `confirm(CardView, …)` is how surveil's single-card case,
        // willPutCardOnTop and confirmAction ask about a card that is usually in
        // a LIBRARY — not in the snapshot at all, so the card itself travels.
        ...(ask.card !== null && ask.card !== undefined ? [`about ${cardOptionLabel(ask.card)}`] : []),
      ];
    case 'options':
      return ask.options.map((o) =>
        o.id === ask.defaultIndex ? `${askOptionLine(o)} (default)` : askOptionLine(o),
      );
    case 'text':
      return [`initial: ${JSON.stringify(ask.initial)}`];
    case 'choose_list':
      return ask.options.map(askOptionLine);
    case 'choose_entities':
      return [
        ...ask.options.map(askOptionLine),
        // P7 / report 06 §6.8: the delayed reveal is the CONTEXT — "here is what
        // you are looking at" — as distinct from the options, "here is what you
        // may pick". A deck search reveals a library and offers a few targets.
        ...(ask.delayedReveal !== null
          ? [
              `${ask.delayedReveal.messagePrefix} (${ask.delayedReveal.zones.join('/')} of player ` +
                `${String(ask.delayedReveal.owner ?? -1)}): ` +
                ask.delayedReveal.cards.map(cardOptionLabel).join(', '),
            ]
          : []),
      ];
    case 'order':
      // Report 07 A2 (P7): the jar's OrderResult is (List ordered, boolean
      // remember), not {top, bottom}; indices address `dest ++ source`.
      return [
        `${ask.destLabel ?? 'destination'}: ${ask.dest.map(askOptionLine).join(', ')}`,
        `source: ${ask.source.map(askOptionLine).join(', ')}`,
      ];
    case 'assign_damage':
      // P7: the defender is index 0, flagged, and marshals back to the `null`
      // key PlayerControllerHuman reads as "the defending player".
      return ask.targets.map(
        (t) =>
          `${askOptionLine(t)}${t.lethal === undefined ? '' : ` (lethal ${String(t.lethal)})`}` +
          `${t.defender === true ? ' — the defender' : ''}`,
      );
    case 'assign_amount':
      return ask.targets.map((t) =>
        t.max === undefined ? askOptionLine(t) : `${askOptionLine(t)} (max ${String(t.max)})`,
      );
    case 'manipulate_list':
      return ask.cards.map((c) =>
        ask.manipulable.includes(c.id) ? `${askOptionLine(c)} (movable)` : askOptionLine(c),
      );
    case 'sideboard':
      return [
        `main: ${ask.main.map((o) => o.label).join(', ')}`,
        `side: ${ask.side.map((o) => o.label).join(', ')}`,
      ];
  }
}

/**
 * The running log (P20). It is folded in `reduce()` — the only function that
 * sees every frame — so stepping backwards re-derives it instead of leaving the
 * log ahead of the board.
 *
 * Ids are resolved against the frame **currently** on screen, which is the whole
 * point: a card that was named ten frames ago and is now back in a hidden zone
 * prints as `#42` here, not as the name the client used to know.
 */
function GameLogPanel({ log, board }: { log: LogEntry[]; board: GameStateBody }): JSX.Element {
  const recent = log.slice(-40).reverse();
  return (
    <section className="panel panel--log">
      <h2>
        Log <span className="muted">({log.length} entries, newest first, capped at 500)</span>
      </h2>
      {recent.length === 0 ? (
        <p className="muted">nothing has happened yet</p>
      ) : (
        <ol className="log">
          {recent.map((entry, i) => (
            <li key={`${String(entry.seq)}-${String(log.length - i)}-${entry.kind}`}>
              <span className="muted">#{entry.seq}</span> <span className="k">{entry.kind}</span>{' '}
              {[
                ...entry.cardIds.map((id) => cardLabel(board, id)),
                ...entry.playerIds.map((id) => playerName(board, id)),
              ].join(', ')}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function NoticeList({ notices }: { notices: TimestampedNotice[] }): JSX.Element {
  return (
    <section className="panel">
      <h2>
        Notices <span className="muted">({notices.length})</span>
      </h2>
      {notices.length === 0 ? (
        <p className="muted">none</p>
      ) : (
        <ul className="notices">
          {notices.map((notice) => (
            <li key={`${String(notice.seq)}-${String(notice.t)}`} className={`notice notice--${notice.level}`}>
              <strong>{notice.title}</strong> {notice.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EventList({
  events,
  dropped,
}: {
  events: GameEvent[];
  dropped: string[];
}): JSX.Element {
  return (
    <section className="panel">
      <h2>
        Events in this frame <span className="muted">({events.length})</span>
      </h2>
      {events.length === 0 ? (
        <p className="muted">none</p>
      ) : (
        <ol className="events">
          {events.map((event, i) => (
            <li key={`${String(i)}-${event.kind}`}>
              <span className="k">{event.kind}</span> {describeEvent(event)}
            </li>
          ))}
        </ol>
      )}
      {dropped.length > 0 && (
        <p className="hint">
          dropped unknown event kinds: {dropped.join(', ')} (docs/protocol.md §3.6 rule 3)
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Session / handshake footer
// ---------------------------------------------------------------------------

function HelloPanel({ state }: { state: ClientState }): JSX.Element {
  const { hello, session } = state;
  return (
    <section className="panel panel--meta">
      <h2>Session</h2>
      <dl>
        {session !== null && (
          <>
            <dt>log</dt>
            <dd>
              {session.gameId} · started {session.startedAt} · seed{' '}
              {session.seed === null ? 'none' : session.seed} · seat {session.seat}
            </dd>
            <dt>decks</dt>
            <dd>
              {/* §8.1: only the viewing seat's entry names a file — a path plus
                  a sha256 identifies a decklist, and this log is one seat's. */}
              {session.decks
                .map((deck) =>
                  deck.path === null
                    ? `p${String(deck.player)} ${String(deck.cards)} cards`
                    : `p${String(deck.player)} ${deck.path} (${(deck.sha256 ?? '').slice(0, 8)}…, ` +
                      `${String(deck.cards)} cards)`,
                )
                .join(', ')}
            </dd>
          </>
        )}
        {hello !== null && (
          <>
            <dt>engine</dt>
            <dd>
              Forge {hello.forgeVersion} · jar {hello.forgeJarSha256.slice(0, 12)}…
            </dd>
            <dt>players</dt>
            <dd>
              {hello.players
                .map((p) => `${p.name} (#${String(p.id)}, ${p.isAi ? 'AI' : 'human'})`)
                .join(' vs ')}
            </dd>
            {hello.unsupportedCards.length > 0 && (
              <>
                <dt>unsupported cards</dt>
                <dd className="notice notice--warn">{hello.unsupportedCards.join(', ')}</dd>
              </>
            )}
          </>
        )}
        <dt>frames applied</dt>
        <dd>{state.framesApplied}</dd>
      </dl>
    </section>
  );
}
