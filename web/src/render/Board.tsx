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
 *
 * ---------------------------------------------------------------------------
 * 2026-09-11 — M3: the board is now a seat.
 *
 * `actions` is the whole of the change. When it is `null` — a replay — every
 * affordance renders exactly as it did in M1/M2 and is inert; when it is a
 * transport, the same affordances send `act` frames:
 *
 *   - **clicking any card sends `clickCard`** (amendment M8), not only a
 *     selectable one. `selectable` is the EXPLICIT selection set and is empty
 *     for the whole of your main phase; 78 of the 86 `clickCard` acts in
 *     `human-auto-42.jsonl` name an id outside it. Forge is the judge: a click
 *     it will not take comes back as `notice{title:"Not selectable"}`, which the
 *     toast list shows. A board that greys out everything outside `selectable`
 *     cannot play a land;
 *   - **clicking a player name sends `clickPlayer`**;
 *   - the two buttons send `buttonOk` / `buttonCancel` and print
 *     `input.buttons.*.label` **verbatim** — `Undo (2)`, `End Turn` and `Auto`
 *     are the engine's labels, which is why there is no `undo` button and no
 *     `autoPay` act (§2.2, report 11 §0.1);
 *   - **Concede is reachable from every UI state** (§9 invariant 6), behind one
 *     confirming click, including while an ask is blocking the game thread;
 *   - **an outstanding `ask` blocks the board's clicks.** The engine is parked
 *     inside that call and is listening for exactly one thing.
 *
 * Keyboard (Space = OK, Escape = Cancel) lives in `main.tsx`, not here: it is a
 * window-level listener, and keeping this file free of effects is what lets
 * `web/test/render.test.tsx` render every frame of every fixture with
 * `renderToStaticMarkup`.
 * ---------------------------------------------------------------------------
 *
 * **`selectable` is not the clickable set** (protocol amendment M8). It is the
 * *explicit* selection set — what `setSelectables` names for targeting, discard
 * or declare-blockers — and `InputPassPriority` never calls it, so at your own
 * main phase it is `{cardIds: [], min: 0, max: 0, mode: 'none'}` while your
 * whole hand is clickable: 78 of the 86 `clickCard` acts in
 * `fixtures/games/human-auto-42.jsonl` name an id outside it. So the outline
 * below means "the engine is asking for these", and the click is **not** gated
 * on it: the board sends `act: clickCard` for any card and renders the
 * `notice {title: 'Not selectable'}` Forge sends back for a click it will not
 * take. Deciding that here would be rules logic.
 *
 * ---------------------------------------------------------------------------
 * 2026-09-11 — the `ask` block and the button labels.
 *
 * An `ask` **blocks the Forge game thread** until an answer arrives (§5): it is
 * the only frame the server waits on, and while one is outstanding the game is
 * doing nothing at all. Rendering that in a column beside the event log, the way
 * M1 did, is the wrong shape for the thing — a reader scrolling the board cannot
 * tell a stopped game from a slow one. So an outstanding question is drawn as a
 * **modal-like block at the top of the board**, before the seats. It moved to
 * `AskModal.tsx` in M3, where it grew the form that answers it; with no
 * transport attached it renders exactly as it did here, every control disabled.
 *
 * The option labels and `input.buttons.*.label` are rendered **verbatim**, and
 * that is a rule, not a default (§2.2, report 11 §0.1). `Undo (2)`, `End Turn`
 * and `Auto` are Forge's own labels on the OK/Cancel buttons — `InputPassPriority`
 * and `InputPayMana` write them — so a client that renders its own "Pass" and
 * invents an `autoPay` action has thrown the engine's answer away and built a
 * second source of truth for what the button does. The client sends `buttonOk` /
 * `buttonCancel` and prints what it was given.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useState } from 'react';

import { artFor, type ArtIndex } from '../art.ts';
import {
  altFace,
  isFaceDownHidden,
  isHidden,
  MANA_COLORS,
  type AltFace,
  type AnswerValue,
  type AnyCard,
  type Card,
  type CardZone,
  type Combat,
  type EntityRef,
  type FaceDownCard,
  type GameEvent,
  type GameStateBody,
  type InputBody,
  type InputButton,
  type LibraryZone,
  type PlayerState,
  type StackItem,
} from '../protocol.ts';
import type { ClientState, LogEntry, TimestampedNotice } from '../reduce.ts';
import { AskModal } from './AskModal.tsx';
import { describeEvent, phaseLabel, stackTextLabel } from './describe.ts';
import { WEDGE_QUIET_MS, wedgeSuspected } from './wedge.ts';

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

/**
 * The seat's outbound half (§2.2, §2.3). One object, passed down as far as the
 * card lines; `null` is a replay, and every affordance renders disabled.
 *
 * There is deliberately **no `undo`, no `endTurn` and no `autoPay`**: those are
 * Forge's own labels on the OK and Cancel buttons, and the act to send is
 * `buttonOk` / `buttonCancel` (§2.2, §10.3, report 11 §0.1).
 */
export interface BoardActions {
  /** §2.2 — any card, not only a selectable one (amendment M8). */
  clickCard(cardId: number): void;
  clickPlayer(playerId: number): void;
  buttonOk(): void;
  buttonCancel(): void;
  /** §9 invariant 6 — reachable from every UI state, so a wedge is escapable. */
  concede(): void;
  /** §2.3 — exactly one per ask; the value is per-kind (§5.2). */
  answer(askId: string, value: AnswerValue): void;
}

/** What a card line may do when clicked, or `null` for "nothing, and say so". */
interface Clicks {
  card: (cardId: number) => void;
  player: (playerId: number) => void;
}

export interface BoardProps {
  state: ClientState;
  art: ArtIndex;
  /** M3. `null`/absent → the M1 read-only board. */
  actions?: BoardActions | null;
  /**
   * Client-side complaints from the transport (a dropped click, a socket
   * error). Kept apart from `state.notices`, which are the engine's (§6): a
   * toast that says "not connected" must not look like something Forge said.
   */
  clientNotices?: readonly TimestampedNotice[];
}

export function Board({ state, art, actions = null, clientNotices = [] }: BoardProps): JSX.Element {
  const { board, hello, input } = state;
  const you = hello?.you ?? state.session?.seat ?? null;

  // §5: while an ask is outstanding the game thread is parked inside that call
  // and is listening for exactly one thing. A board click then is a click into
  // a void, so the board stops taking them — and says why.
  const asking = state.ask !== null;
  const clicks: Clicks | null =
    actions === null || asking || state.gameOver !== null
      ? null
      : { card: actions.clickCard, player: actions.clickPlayer };

  if (board === null) {
    return (
      <div className="board board--empty">
        <p className="muted">
          No <code>state</code> frame yet — step forward, press play, or wait for the bridge.
        </p>
        <AskModal ask={state.ask} onAnswer={actions?.answer ?? null} />
        {actions !== null && (
          <ConcedeButton onConcede={actions.concede} gameOver={state.gameOver !== null} />
        )}
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
      <Toasts notices={state.notices} clientNotices={clientNotices} yourTurn={yourTurn(state)} />
      {state.gameOver !== null && (
        <div className="banner banner--over" role="status">
          <strong>Game over.</strong>{' '}
          {state.gameOver.winner !== null
            ? `Winner: ${playerName(board, state.gameOver.winner)}.`
            : // §7 + amendment M11: `winner: null` is a draw — EXCEPT when
              // `reason` is null too, which is the one path where the engine
              // never published an outcome at all (a concede before this seat
              // was asked for anything: `applyAct`'s pre-`inputSeen` guard ends
              // the session without reaching Forge's game-over). Printing
              // "Draw" there would report a result nobody played for.
              state.gameOver.reason === null
              ? 'No result — the session ended before the engine published an outcome.'
              : 'Draw.'}{' '}
          {state.gameOver.reason ?? ''}
          {!state.gameOver.matchOver && ' (the match continues)'}
        </div>
      )}

      {/* §5 — the game thread is parked inside this call. It goes above the
          seats, not beside the log: an outstanding question is the single most
          important thing on the board while it exists. */}
      <AskModal ask={state.ask} onAnswer={actions?.answer ?? null} />

      {/* The seat's controls: the engine's prompt, the engine's two buttons, and
          Concede — at the top, because in M3 this is where the game is played
          from. The panel itself is unchanged from M1 apart from being wired. */}
      <InputPanel input={input} state={state} actions={actions} />

      {seated.map((player) => (
        <PlayerPanel
          key={player.id}
          player={player}
          you={you}
          board={board}
          input={input}
          art={art}
          clicks={clicks}
        />
      ))}

      <div className="columns">
        <StackPanel stack={board.stack} board={board} input={input} art={art} clicks={clicks} />
        <CombatPanel combat={board.combat} board={board} />
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

/**
 * Is it this seat's move?
 *
 * Derived from the snapshot the engine sent — `priority` is a player id (§3.1)
 * — and nothing else. It decides what a toast says, never what is legal:
 * §9 invariant 8, the client computes no rules answers.
 */
function yourTurn(state: ClientState): boolean {
  const you = state.hello?.you ?? state.session?.seat ?? null;
  return (
    you !== null &&
    state.board !== null &&
    state.board.priority === you &&
    state.gameOver === null &&
    state.ask === null
  );
}

/**
 * The toast strip: the engine's recent notices (§6), the transport's own
 * complaints, and "Your turn".
 *
 * Capped and newest-first, and **briefly** is done in CSS (`animation:
 * toast-fade`) rather than with a timer, because a timer here would be the first
 * effect in this file and `web/test/render.test.tsx` renders every frame of
 * every fixture with `renderToStaticMarkup`, which runs no effects at all. The
 * full history stays in the Notices panel below — a toast that disappears is not
 * allowed to be the only copy of "Not selectable".
 */
function Toasts({
  notices,
  clientNotices,
  yourTurn: myTurn,
}: {
  notices: TimestampedNotice[];
  clientNotices: readonly TimestampedNotice[];
  yourTurn: boolean;
}): JSX.Element | null {
  const recent = collapse([...notices, ...clientNotices]).slice(-3);
  if (recent.length === 0 && !myTurn) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {myTurn && <span className="toast toast--turn">Your turn</span>}
      {recent.map(({ notice, count }) => (
        <span
          key={`${String(notice.seq)}-${String(notice.t)}`}
          className={`toast toast--${notice.level}`}
        >
          {/* §6: both strings are gated and either may be "" — render verbatim
              and be total over an empty one. */}
          {notice.title !== '' && <strong>{notice.title}</strong>}
          {notice.title !== '' && notice.text !== '' && ' '}
          {notice.text}
          {count > 1 && <span className="muted"> ×{count}</span>}
        </span>
      ))}
    </div>
  );
}

/**
 * Collapse a run of identical notices into one, with a count.
 *
 * Forge repeats itself: it pushes `notice{title:"Your turn"}` at every priority
 * it hands back, which is several times a turn, and five identical toasts in a
 * row is a strip that stops being read. The Notices panel below still lists
 * every one of them individually — this is presentation, not filtering, and the
 * strings themselves are never rewritten (§6).
 */
function collapse(
  notices: readonly TimestampedNotice[],
): Array<{ notice: TimestampedNotice; count: number }> {
  const out: Array<{ notice: TimestampedNotice; count: number }> = [];
  for (const notice of notices) {
    const last = out[out.length - 1];
    if (
      last !== undefined &&
      last.notice.level === notice.level &&
      last.notice.title === notice.title &&
      last.notice.text === notice.text
    ) {
      // Keep the LATEST of the run, so the fade animation restarts on a repeat.
      out[out.length - 1] = { notice, count: last.count + 1 };
      continue;
    }
    out.push({ notice, count: 1 });
  }
  return out;
}

/**
 * §9 invariant 6 — **Concede must be reachable from every UI state**, so a wedge
 * is always escapable. Two clicks, because it ends the game and there is no undo
 * for it; the second click is the confirmation and it says so.
 *
 * Every UI state except one: **a game that is already over**. The button used to
 * stay armed across `over`, so a finished game offered "Concede — click again to
 * confirm" over its own result banner — a second irreversible-looking click on a
 * game that no longer exists (observed in the live browser session immediately
 * after `Game over. Winner: Forge AI`). It disarms and disables itself instead.
 */
function ConcedeButton({
  onConcede,
  gameOver,
}: {
  onConcede: () => void;
  gameOver: boolean;
}): JSX.Element {
  const [armed, setArmed] = useState(false);
  const live = !gameOver;
  return (
    <button
      type="button"
      className={`btn btn--concede${armed && live ? ' btn--armed' : ''}`}
      disabled={!live}
      title={
        live
          ? 'act: concede — reachable from every UI state (§9 invariant 6)'
          : 'the game is over; there is nothing left to concede'
      }
      onClick={() => {
        if (!live) return;
        if (armed) onConcede();
        else setArmed(true);
      }}
    >
      {armed && live ? 'Concede — click again to confirm' : 'Concede'}
    </button>
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
  clicks: Clicks | null;
}

function PlayerPanel({ player, you, board, input, art, clicks }: PlayerPanelProps): JSX.Element {
  const isYou = you !== null && player.id === you;
  const mana = MANA_COLORS.map((c) => `${c}:${String(player.manaPool[c])}`).join(' ');
  const counters = Object.entries(player.counters);
  // §4: `mode: "players"` is the engine naming seats as the explicit selection
  // set. `selectable.playerIds` is a planned §10.2 field and is not on the wire,
  // so this is the only signal there is — and, like a card, a player click is
  // sent whatever the mode says (M8: Forge is the judge).
  const selectable = input !== null && input.selectable.mode === 'players';

  return (
    <section className={`player${isYou ? ' player--you' : ''}`}>
      <h2>
        <button
          type="button"
          className={`player__name${selectable ? ' player__name--selectable' : ''}`}
          disabled={clicks === null}
          aria-label={`${player.name} — player ${String(player.id)}`}
          title={`act: clickPlayer ${String(player.id)}`}
          onClick={() => {
            clicks?.player(player.id);
          }}
        >
          {player.name}
        </button>
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

      <ZoneList label="Battlefield" zone={player.zones.battlefield} input={input} art={art} board={board} clicks={clicks} />
      <ZoneList label="Hand" zone={player.zones.hand} input={input} art={art} board={board} clicks={clicks} />
      <ZoneList label="Graveyard" zone={player.zones.graveyard} input={input} art={art} board={board} clicks={clicks} />
      <ZoneList label="Exile" zone={player.zones.exile} input={input} art={art} board={board} clicks={clicks} />
      <ZoneList label="Command" zone={player.zones.command} input={input} art={art} board={board} clicks={clicks} />
      <LibraryPanel library={player.zones.library} input={input} art={art} board={board} clicks={clicks} />
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
  clicks,
}: {
  library: LibraryZone;
  input: InputBody | null;
  art: ArtIndex;
  board: GameStateBody;
  clicks: Clicks | null;
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
          <CardLine key={card.id} card={card} input={input} art={art} board={board} clicks={clicks} />
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
  clicks: Clicks | null;
}

function ZoneList({ label, zone, input, art, board, clicks }: ZoneListProps): JSX.Element | null {
  if (zone.count === 0 && zone.cards.length === 0) return null;
  return (
    <div className="zone">
      <h3>
        {label} <span className="muted">({zone.count})</span>
      </h3>
      <ul className="cards">
        {zone.cards.map((card) => (
          <CardLine key={card.id} card={card} input={input} art={art} board={board} clicks={clicks} />
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
  clicks: Clicks | null;
}

/**
 * The click affordance on one card line (M3, amendment M8).
 *
 * It wraps the name rather than the whole `<li>` so it is a real `<button>`:
 * focusable, reachable by keyboard, and announced as a button — which also means
 * a card click and the window-level Space/Escape handler in `main.tsx` cannot
 * fight over the same key, because that handler ignores events whose target is
 * a control.
 *
 * **Any card, not only a selectable one.** The title says which act it sends,
 * because "why did clicking my land do nothing" is otherwise answerable only by
 * reading the frame log.
 */
function CardButton({
  card,
  label,
  clicks,
  children,
}: {
  card: AnyCard;
  /**
   * What this tile says, in words — the accessible name. Given explicitly
   * rather than left to the button's contents, because the contents are a
   * thumbnail (`aria-hidden`), a name, a mana cost and a `#id` fragment, and a
   * `title` that explains the *act* would otherwise be the best name a reader
   * could compute. A concealed card names itself as concealed and nothing else:
   * §3.3's five-key stub has no name to announce.
   */
  label: string;
  clicks: Clicks | null;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      className="card__btn"
      disabled={clicks === null}
      aria-label={`${label} — card ${String(card.id)}`}
      title={`act: clickCard ${String(card.id)} — Forge is the judge of every click (§4.1)`}
      onClick={() => {
        clicks?.card(card.id);
      }}
    >
      {children}
    </button>
  );
}

function CardLine({ card, input, art, board, clicks }: CardLineProps): JSX.Element {
  // The engine's answer, echoed. The client computes no legality (§9 invariant 8).
  //
  // This is the EXPLICIT selection set (§4.1, amendment M8): the engine is
  // asking for these cards right now. It is not "what may be clicked" — that
  // set is larger and Forge is its only judge — so this drives an outline and
  // nothing else.
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
        <CardButton card={card} label="face-down card" clicks={clicks}>
          <span className="thumb thumb--back" aria-hidden="true" />
          <span className="card__name">face-down card</span>
          <span className="muted"> #{card.id}</span>
        </CardButton>
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
        <CardButton card={card} label="card back" clicks={clicks}>
          <span className="thumb thumb--back" aria-hidden="true" />
          <span className="card__name">card back</span>
          <span className="muted">
            {' '}
            #{card.id}
            {card.owner !== null && card.owner !== undefined && card.owner !== card.controller && (
              <> · owned by {playerName(board, card.owner)}</>
            )}
          </span>
        </CardButton>
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
      <CardButton
        card={card}
        label={`${shownName}${card.manaCost !== null ? ` ${card.manaCost}` : ''}`}
        clicks={clicks}
      >
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
      </CardButton>
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
  clicks,
}: {
  stack: StackItem[];
  board: GameStateBody;
  input: InputBody | null;
  art: ArtIndex;
  clicks: Clicks | null;
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
              <CardLine key={card.id} card={card} input={input} art={art} board={board} clicks={clicks} />
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

/**
 * One of the engine's two buttons (§2.2, §4).
 *
 * **The label is Forge's and is printed exactly as it arrived.** `Undo (2)`,
 * `End Turn` and `Auto` are not client features: `InputPassPriority` labels the
 * *Cancel* button `Undo (n)` or `End Turn` depending on what is undoable and
 * whose turn it is, and `InputPayMana` labels the *OK* button `Auto`
 * (report 11 §0.1). The client sends `buttonOk` / `buttonCancel` and lets the
 * engine say what they mean — which is why **there is no `autoPay` act and no
 * `endTurn` act** (§10.3). Inventing a parallel action for a button the engine
 * already labelled is the "the board threw the engine's answer away" failure
 * mode, and it is a rules decision made in the client, which §9 invariant 8
 * forbids outright.
 *
 * `disabled` is likewise the engine's answer and nothing else — and a disabled
 * OK is not "nothing to do", it is "click a card" (§4.2, the invariant that
 * silently stalls a button-only client at the discard step).
 */
function EngineButton({
  button,
  act,
  onClick,
  hint,
}: {
  button: InputButton;
  act: string;
  /** `null` → a replay: the label still shows, the button does nothing. */
  onClick: (() => void) | null;
  /** The keyboard shortcut this button also answers to (`main.tsx`). */
  hint: string;
}): JSX.Element {
  return (
    <button
      type="button"
      className="btn btn--engine"
      // The engine's answer and nothing else. A disabled OK is not "nothing to
      // do", it is "click a card" (§4.2).
      disabled={!button.enabled || onClick === null}
      // The title says whose label this is, because "Auto" and "Undo (2)" read
      // like client features and are not -- and the aria-label keeps the
      // ENGINE's word as the accessible name, so a reader is not told the
      // footnote instead of the button.
      aria-label={button.label}
      title={`the engine's own label — sends act: ${act} · ${hint}`}
      onClick={() => {
        onClick?.();
      }}
    >
      {button.label}
    </button>
  );
}

function InputPanel({
  input,
  state,
  actions,
}: {
  input: InputBody | null;
  state: ClientState;
  actions: BoardActions | null;
}): JSX.Element {
  // §5: an outstanding ask owns the interaction. The buttons belong to the
  // `input` the engine pushed *before* it blocked, and pressing one now would
  // answer nothing.
  const asking = state.ask !== null;
  const live = actions !== null && !asking && state.gameOver === null;
  return (
    <section className="panel panel--input">
      <h2>Input</h2>
      {input === null ? (
        <p className="muted">the engine has not asked for anything yet</p>
      ) : (
        <>
          {/* The engine's own prompt text, rendered verbatim and never
              rewritten (§4). */}
          <p className="prompt">{input.prompt}</p>
          <div className="buttons">
            <EngineButton
              button={input.buttons.ok}
              act="buttonOk"
              hint="Space"
              onClick={live ? actions.buttonOk : null}
            />
            <EngineButton
              button={input.buttons.cancel}
              act="buttonCancel"
              hint="Escape"
              onClick={live ? actions.buttonCancel : null}
            />
            {actions !== null && (
              <ConcedeButton onConcede={actions.concede} gameOver={state.gameOver !== null} />
            )}
            {asking && (
              <span className="muted">
                a question is outstanding — answer it above; the buttons belong to the input the
                engine pushed before it blocked
              </span>
            )}
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
          {/* §4.2's narrower diagnostic, and report 10 §5.2: OK disabled, the
              selection set empty, no outstanding ask and the game not over is
              the signature of a WEDGED GAME THREAD — *on your own priority,
              after the stream has gone quiet*. Those last two clauses are M3's
              review fix and they are not decoration: without them the banner
              fires on every ordinary opponent priority window (measured twice
              inside the first two turns of a live browser game — at turn 1
              upkeep under `Waiting for Forge AI…`, and under `Yielding until
              end of turn`), which is exactly the same four clauses and is the
              normal state of simply not holding priority. See `WedgeBanner`. */}
          <WedgeBanner
            live={actions !== null}
            suspect={wedgeSuspected(state)}
            framesApplied={state.framesApplied}
          />
        </>
      )}
    </section>
  );
}

/**
 * §4.2's wedged-game-thread diagnostic, with the two qualifiers the rule was
 * missing.
 *
 * `suspect` is {@link wedgeSuspected}: the four-clause condition §4.2 states (OK
 * disabled, `selectable` empty, no ask, game not over) **plus** "and this seat
 * holds priority". A seat that does not hold priority has nothing to do
 * *because it is not its turn to do anything*, which is not a wedge and is the
 * commonest state in the game.
 *
 * The timer is the other half. A wedge is a thread that has stopped; an engine
 * push in flight is a thread that has not. Every fold of a frame resets the
 * clock ({@link ClientState.framesApplied} counts them), so the banner only
 * appears when the seat owns the decision *and* nothing at all has arrived for
 * {@link WEDGE_QUIET_MS}.
 *
 * `live` keeps it out of a replay, where "no frame for 2.5 s" means the user
 * stopped scrubbing and there is no thread to be wedged in the first place.
 */
function WedgeBanner({
  live,
  suspect,
  framesApplied,
}: {
  live: boolean;
  suspect: boolean;
  framesApplied: number;
}): JSX.Element | null {
  const [quiet, setQuiet] = useState(false);
  useEffect(() => {
    setQuiet(false);
    const timer = setTimeout(() => {
      setQuiet(true);
    }, WEDGE_QUIET_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [framesApplied]);
  if (!live || !suspect || !quiet) return null;
  return (
    <p className="banner banner--error" role="alert">
      <strong>Nothing to do.</strong> You have priority, OK is disabled, nothing is selectable, no
      question is outstanding and nothing has arrived from the bridge for{' '}
      {(WEDGE_QUIET_MS / 1000).toFixed(1)} s — docs/protocol.md §4.2 calls that the signature of a
      wedged game thread. Resync; if that does not help, concede.
    </p>
  );
}

/** A card inside an ask/input body, through the same three-shape discipline. */
function cardOptionLabel(card: AnyCard): string {
  if (isFaceDownHidden(card)) return `face-down card #${String(card.id)}`;
  if (isHidden(card)) return `card back #${String(card.id)}`;
  return `${displayName(card)} #${String(card.id)}`;
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
