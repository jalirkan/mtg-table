/*
 * mtg-table — render/Board.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **M4: the board that looks like Magic** (report 10 §1, §2).
 *
 * M1 drew every zone as a list of card names. M4 is the same data, laid out as a
 * table: a CSS grid with the opponent's lands and permanents at the top, the
 * middle table with the graveyard strips and the stack, your permanents and
 * lands below, and your hand fanned along the bottom. Two rails: seats, life and
 * the decision panel on the left; the round header and the thirteen phase rows
 * on the right.
 *
 * ---------------------------------------------------------------------------
 * What M4 did NOT change, because M3 got it right and re-deriving it is how a
 * rule that took two verification passes gets lost:
 *
 *   - **`actions` is the seam.** `null` is a replay: every affordance renders,
 *     every affordance is inert, and the board says `Read-only`. Non-null is a
 *     seat. That is the whole of the difference between the two modes, and
 *     `web/test/render.test.tsx` asserts it over the fixture corpus.
 *   - **Never gate a click on `selectable`** (amendment M8). Every card with a
 *     real id is a `<button>` that sends `act: clickCard`; `selectable` drives an
 *     *outline*, because it is the explicit selection set and is empty for the
 *     whole of your own main phase. 78 of 86 clicks in the scripted game are
 *     outside it. Forge is the judge; a click it will not take comes back as
 *     `notice {title: "Not selectable"}`, which the toasts show.
 *   - **`input.buttons.*.label` and `input.prompt` are rendered verbatim**
 *     (`DecisionPanel`), and the acts are `buttonOk` / `buttonCancel`.
 *   - **The stall rule is `wedge.ts`** — six clauses after amendment M21 —
 *     imported by `DecisionPanel`, never re-derived from §4.2's prose.
 *   - **Concede is reachable from every UI state**, including inside an ask.
 *   - **An outstanding `ask` blocks the board's clicks**: the engine is parked
 *     inside that call and is listening for exactly one thing.
 *   - Two shapes the layout must not assume away: an `over` with no `gameOver`
 *     `state` in front of it (M11), and a `seq` that can arrive lower than the
 *     frame before it after a `resync` (M10). Nothing here counts frames or
 *     trusts `seq` for ordering.
 * ---------------------------------------------------------------------------
 *
 * Redaction, in the renderer (hard rule 8, report 10 §18.1):
 *   - every card anywhere goes through the one `CardTile`;
 *   - **the opponent's hand is a count in their rail and is never drawn as
 *     tiles**, even though the cards in it are five-key stubs already;
 *   - a face-down card shows its real face ONLY through `alt`, which the bridge
 *     emits only when `canFaceDownBeShownTo(viewer)` (P3);
 *   - every id is resolved against the frame being rendered and nothing is
 *     cached across frames (P5, `resolve.ts`);
 *   - the running log comes from `reduce()`, not from this component (P20), so
 *     stepping backwards re-derives it.
 *
 * The only effects in this tree are the wedge timer (`DecisionPanel`) and the
 * image `onLoad`/`onError` handlers; `renderToStaticMarkup` runs none of them,
 * which is what lets the render test fold every frame of every fixture.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ArtIndex } from '../art.ts';
import { planKey, type KeyContext, type KeyEventLike } from '../keys.ts';
import {
  isHidden,
  type AnswerValue,
  type AnyCard,
  type GameStateBody,
  type InputBody,
  type PlayerState,
} from '../protocol.ts';
import type { ClientState, TimestampedNotice } from '../reduce.ts';
import { ArrowsOverlay } from './ArrowsOverlay.tsx';
import { AskModal } from './AskModal.tsx';
import type { Clicks } from './CardTile.tsx';
import { CardZoom } from './CardZoom.tsx';
import { ConcedeButton, DecisionPanel, type KeyFlash } from './DecisionPanel.tsx';
import { HandFan } from './HandFan.tsx';
import { HotkeysOverlay } from './HotkeysOverlay.tsx';
import { isLandTypeLine } from './labels.ts';
import { LogDrawer } from './LogDrawer.tsx';
import { PhaseStrip } from './PhaseStrip.tsx';
import { PlayerRail } from './PlayerRail.tsx';
import { RectsContext, useRectRegistry } from './rects.ts';
import { cardLabel, entityLabel, findCard, playerName } from './resolve.ts';
import { StackPanel } from './StackPanel.tsx';
import { useWindowKeydown } from './useKeyboard.ts';
import { ZoneRow } from './ZoneRow.tsx';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * The seat's outbound half (§2.2, §2.3). One object, passed down as far as the
 * card tiles; `null` is a replay, and every affordance renders disabled.
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

export interface BoardProps {
  state: ClientState;
  art: ArtIndex;
  /** M3. `null`/absent → the read-only board. */
  actions?: BoardActions | null;
  /**
   * Client-side complaints from the transport (a dropped click, a socket
   * error). Kept apart from `state.notices`, which are the engine's (§6): a
   * toast that says "not connected" must not look like something Forge said.
   */
  clientNotices?: readonly TimestampedNotice[];
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

export function Board({ state, art, actions = null, clientNotices = [] }: BoardProps): JSX.Element {
  const { board, hello, input } = state;
  const you = hello?.you ?? state.session?.seat ?? null;

  // ---- view state. None of it is game state: every one of these is a panel
  // ---- that is open or shut, and a replay may toggle them all (they send
  // ---- nothing). The keys are Forge's own where Forge has one (`keys.ts`).
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stackOpen, setStackOpen] = useState(true);
  const [hotkeysOpen, setHotkeysOpen] = useState(false);
  const [combatEmphasis, setCombatEmphasis] = useState(false);
  const [zoomId, setZoomId] = useState<number | null>(null);
  const [flash, setFlash] = useState<KeyFlash | null>(null);
  const [concedeArmed, setConcedeArmed] = useState(false);

  // ---- the rect registry (report 10 §9.1). One provider, one
  // ---- `ResizeObserver`, on this root; under `renderToStaticMarkup` it
  // ---- measures nothing and the overlay draws nothing.
  const rootRef = useRef<HTMLDivElement>(null);
  const rects = useRectRegistry(rootRef);

  // A flash is a hint, not a state: it says why the last key press did nothing.
  useEffect(() => {
    if (flash === null) return;
    const timer = setTimeout(() => {
      setFlash(null);
    }, 4500);
    return () => {
      clearTimeout(timer);
    };
  }, [flash]);

  // Arming Ctrl+Q from the keyboard must not stay armed all game.
  useEffect(() => {
    if (!concedeArmed) return;
    const timer = setTimeout(() => {
      setConcedeArmed(false);
    }, 5000);
    return () => {
      clearTimeout(timer);
    };
  }, [concedeArmed]);

  const keyContext: KeyContext = {
    live: actions !== null && state.gameOver === null,
    askOpen: state.ask !== null,
    okEnabled: input?.buttons.ok.enabled === true,
    cancelEnabled: input?.buttons.cancel.enabled === true,
    haveSelectable: (input?.selectable.cardIds.length ?? 0) > 0,
    overlay: zoomId !== null ? 'zoom' : hotkeysOpen ? 'hotkeys' : 'none',
  };

  const onKey = useCallback(
    (event: KeyboardEvent): void => {
      const resolved = planKey(asKeyEvent(event), keyContext);
      // §12.2 rule 3: `preventDefault` ONLY for a key we actually consumed.
      // Space scrolls the page otherwise, and swallowing browser shortcuts we
      // do not use is hostile.
      if (resolved === null) return;
      event.preventDefault();
      const { binding, plan } = resolved;

      switch (plan.kind) {
        case 'buttonOk':
          setFlash(null);
          actions?.buttonOk();
          return;
        case 'buttonCancel':
          setFlash(null);
          actions?.buttonCancel();
          return;
        case 'answerNull':
          // §5.4 — always legal; the bridge substitutes Forge's own default.
          if (state.ask !== null) actions?.answer(state.ask.askId, null);
          return;
        case 'concede':
          // §9 invariant 6, with the same two-step the button has: it ends the
          // game and there is no undo for it.
          if (concedeArmed) {
            setConcedeArmed(false);
            setFlash(null);
            actions?.concede();
          } else {
            setConcedeArmed(true);
            setFlash({ id: binding.id, chord: binding.chord, why: 'press again to concede' });
          }
          return;
        case 'closeOverlay':
          setZoomId(null);
          setHotkeysOpen(false);
          return;
        case 'view':
          switch (plan.id) {
            case 'toggleStack':
              setStackOpen((open) => !open);
              return;
            case 'toggleLog':
              setDrawerOpen((open) => !open);
              return;
            case 'toggleHotkeys':
              setHotkeysOpen((open) => !open);
              return;
            case 'toggleCombat':
              setCombatEmphasis((on) => !on);
              return;
            case 'zoom': {
              const id = zoomId !== null ? null : pointedCardId();
              setZoomId(id);
              if (id === null && zoomId === null) {
                setFlash({
                  id: binding.id,
                  chord: binding.chord,
                  why: 'hover or focus a card first — Z zooms the one under the pointer',
                });
              }
              return;
            }
            default:
              return;
          }
        case 'inert':
          setFlash({ id: binding.id, chord: binding.chord, why: plan.why });
          return;
      }
    },
    // `keyContext` and `state.ask` are read fresh on every render; the listener
    // itself is registered once and reads this through a ref (`useKeyboard.ts`).
    [actions, concedeArmed, keyContext, state.ask, zoomId],
  );
  useWindowKeydown(onKey);

  // §5: while an ask is outstanding the game thread is parked inside that call
  // and is listening for exactly one thing. A board click then is a click into a
  // void, so the board stops taking them — and says why.
  const asking = state.ask !== null;
  const clicks: Clicks | null =
    actions === null || asking || state.gameOver !== null
      ? null
      : { card: actions.clickCard, player: actions.clickPlayer };

  const readOnly = actions === null;

  if (board === null) {
    return (
      <div className="board board--empty" data-readonly={readOnly ? 'true' : 'false'}>
        <div className="board__empty">
          <p className="muted">
            No <code>state</code> frame yet — step forward, press play, or wait for the bridge.
          </p>
          {readOnly && <span className="pill pill--readonly">Read-only</span>}
          {actions !== null && (
            <ConcedeButton onConcede={actions.concede} gameOver={state.gameOver !== null} />
          )}
        </div>
        <AskModal ask={state.ask} onAnswer={actions?.answer ?? null} />
        <Toasts notices={state.notices} clientNotices={clientNotices} yourTurn={false} />
        <div className="board__drawer">
          <LogDrawer
            state={state}
            board={null}
            clientNotices={clientNotices}
            open={drawerOpen}
            onToggle={() => {
              setDrawerOpen((wasOpen) => !wasOpen);
            }}
          />
        </div>
      </div>
    );
  }

  const seats = orderSeats(board.players, you);
  const opponents = seats.filter((p) => you === null || p.id !== you);
  const mine = you === null ? seats[0] : seats.find((p) => p.id === you);
  const opponent = opponents[0];
  // Resolved against THIS frame, like every other id (P5, `resolve.ts`): a card
  // that left the board while its zoom was open closes the zoom rather than
  // keeping a picture of something that is no longer there.
  const zoomCard = zoomId === null ? undefined : findCard(board, zoomId);

  return (
    <RectsContext.Provider value={rects}>
    <div className="board" data-readonly={readOnly ? 'true' : 'false'} ref={rootRef}>
      {/* ---- left rail: the seats and the decision -------------------------- */}
      <aside className="board__rail board__rail--left">
        {readOnly && (
          <span className="pill pill--readonly" title="a replay has no server to send an act to">
            Read-only
          </span>
        )}
        {opponents.map((player) => (
          <PlayerRail
            key={player.id}
            player={player}
            you={you}
            board={board}
            input={input}
            art={art}
            clicks={clicks}
          />
        ))}
        {mine !== undefined && (
          <PlayerRail
            player={mine}
            you={you}
            board={board}
            input={input}
            art={art}
            clicks={clicks}
          />
        )}
        <DecisionPanel
          state={state}
          board={board}
          you={you}
          input={input}
          art={art}
          actions={actions}
          clicks={clicks}
          flash={flash}
          onHotkeys={() => {
            setHotkeysOpen((open) => !open);
          }}
        />
        {concedeArmed && (
          <p className="hint hint--loud" role="status">
            CTRL+Q again to concede.
          </p>
        )}
        <div className="board__drawer">
          <LogDrawer
            state={state}
            board={board}
            clientNotices={clientNotices}
            open={drawerOpen}
            onToggle={() => {
              setDrawerOpen((wasOpen) => !wasOpen);
            }}
          />
        </div>
      </aside>

      {/* ---- the table ------------------------------------------------------ */}
      <main className="table">
        <Seat
          player={opponent}
          board={board}
          input={input}
          art={art}
          clicks={clicks}
          you={you}
          side="opponent"
        />

        <div className="table__middle">
          <SeatStrips player={opponent} board={board} input={input} art={art} clicks={clicks} you={you} />
          <SeatStrips player={mine} board={board} input={input} art={art} clicks={clicks} you={you} />
          <StackPanel
            board={board}
            input={input}
            art={art}
            clicks={clicks}
            you={you}
            open={stackOpen}
            onToggle={() => {
              setStackOpen((open) => !open);
            }}
          />
          <Toasts
            notices={state.notices}
            clientNotices={clientNotices}
            yourTurn={yourTurn(state)}
          />
          {state.gameOver !== null && <GameOverBanner state={state} board={board} />}
        </div>

        <Seat
          player={mine}
          board={board}
          input={input}
          art={art}
          clicks={clicks}
          you={you}
          side="you"
        />

        <div className="table__hand">
          <HandFan
            cards={mine?.zones.hand.cards ?? []}
            count={mine?.zones.hand.count ?? 0}
            input={input}
            art={art}
            clicks={clicks}
          />
        </div>
      </main>

      {/* ---- right rail: the phase strip ------------------------------------ */}
      <PhaseStrip board={board} you={you} />

      {/* §9.3 — one SVG over the whole board, `aria-hidden` and
          `pointer-events: none`. Every fact it draws is also text: the stack
          panel's target chips and the tiles' combat notes (§14 rule 4). */}
      <ArrowsOverlay board={board} emphasiseCombat={combatEmphasis} />

      {/* §5 — the game thread is parked inside this call, so it draws over
          everything: an outstanding question is the single most important thing
          on the board while it exists. */}
      <AskModal ask={state.ask} onAnswer={actions?.answer ?? null} />

      {zoomCard !== undefined && (
        <CardZoom
          card={zoomCard}
          art={art}
          input={input}
          mine={!isHidden(zoomCard) && you !== null && zoomCard.controller === you}
          onClose={() => {
            setZoomId(null);
          }}
        />
      )}
      {hotkeysOpen && (
        <HotkeysOverlay
          onClose={() => {
            setHotkeysOpen(false);
          }}
        />
      )}
    </div>
    </RectsContext.Provider>
  );
}

/**
 * A `KeyboardEvent` as `keys.ts` reads it (that module takes no DOM types, so it
 * can be imported from `node --test`).
 */
function asKeyEvent(event: KeyboardEvent): KeyEventLike {
  const target = event.target as (HTMLElement & { isContentEditable?: boolean }) | null;
  return {
    key: event.key,
    code: event.code,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    isComposing: event.isComposing,
    // A DOM element always has `tagName`; an event dispatched at `window` has a
    // target with none at all, which is the shape that used to throw here.
    target:
      target === null
        ? null
        : {
            tagName: typeof target.tagName === 'string' ? target.tagName : undefined,
            isContentEditable: target.isContentEditable === true,
          },
  };
}

/**
 * The card `Z` should zoom: the one under the pointer, else the focused one
 * (Forge's `SHORTCUT_CARD_ZOOM` zooms "the currently selected card").
 *
 * `:hover` is a real CSS selector and the browser already knows the answer, so
 * this needs no mouse-tracking state of its own — which is the whole reason the
 * board has no `onMouseEnter` handler on eighty tiles.
 */
function pointedCardId(): number | null {
  if (typeof document === 'undefined') return null;
  let element: Element | null = null;
  try {
    element = document.querySelector('.tile:hover');
  } catch {
    element = null;
  }
  if (element === null) {
    const active = document.activeElement;
    element = active === null ? null : active.closest('.tile');
  }
  const raw = element?.getAttribute('data-card-id') ?? null;
  if (raw === null) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) ? id : null;
}

// ---------------------------------------------------------------------------
// One seat's two rows: permanents above lands for you, lands above permanents
// for the opponent — the way a table looks from your chair.
// ---------------------------------------------------------------------------

function Seat({
  player,
  board,
  input,
  art,
  clicks,
  you,
  side,
}: {
  player: PlayerState | undefined;
  board: GameStateBody;
  input: InputBody | null;
  art: ArtIndex;
  clicks: Clicks | null;
  you: number | null;
  side: 'you' | 'opponent';
}): JSX.Element {
  const mine = side === 'you';
  const split = useMemo(() => splitBattlefield(board, player), [board, player]);
  const notes = useMemo(() => combatNotes(board), [board]);
  const noteFor = (card: AnyCard): string | null => notes.get(card.id) ?? null;
  const attachmentsFor = (hostId: number): AnyCard[] => split.attachments.get(hostId) ?? [];
  const who = player?.name ?? (mine ? 'you' : 'opponent');

  const lands = (
    <ZoneRow
      cards={split.lands}
      kind="land"
      label={`${who} · lands`}
      input={input}
      art={art}
      clicks={clicks}
      mine={mine}
      zoom={mine ? 'up' : 'down'}
      attachmentsFor={attachmentsFor}
      noteFor={noteFor}
    />
  );
  const permanents = (
    <ZoneRow
      cards={split.permanents}
      kind="bf"
      label={`${who} · permanents`}
      input={input}
      art={art}
      clicks={clicks}
      mine={mine}
      zoom={mine ? 'up' : 'down'}
      attachmentsFor={attachmentsFor}
      noteFor={noteFor}
    />
  );

  return (
    <div className={`table__seat table__seat--${side}`} data-seat={player?.id ?? 'none'}>
      {/* The opponent's lands sit furthest from you and their permanents nearest,
          which is what a table looks like across a table (report 10 §2.4). */}
      {side === 'opponent' ? (
        <>
          <div className="table__row table__row--lands">{lands}</div>
          <div className="table__row table__row--perms">{permanents}</div>
        </>
      ) : (
        <>
          <div className="table__row table__row--perms">{permanents}</div>
          <div className="table__row table__row--lands">{lands}</div>
        </>
      )}
      <span className="sr-only">
        {who}: {split.permanents.length} permanents, {split.lands.length} lands
        {you !== null && player?.id === you ? ' (yours)' : ''}
      </span>
    </div>
  );
}

/** The graveyard and exile strips for one seat, in the middle row. */
function SeatStrips({
  player,
  board,
  input,
  art,
  clicks,
  you,
}: {
  player: PlayerState | undefined;
  board: GameStateBody;
  input: InputBody | null;
  art: ArtIndex;
  clicks: Clicks | null;
  you: number | null;
}): JSX.Element {
  if (player === undefined) return <div className="middle__strips" />;
  const mine = you !== null && player.id === you;
  return (
    <div className={`middle__strips${mine ? ' middle__strips--you' : ''}`}>
      <ZoneRow
        cards={player.zones.graveyard.cards}
        kind="strip"
        label={`${player.name} · graveyard`}
        input={input}
        art={art}
        clicks={clicks}
        mine={mine}
        zoom={mine ? 'up' : 'down'}
        align="start"
      />
      {player.zones.exile.cards.length > 0 && (
        <ZoneRow
          cards={player.zones.exile.cards}
          kind="strip"
          label={`${player.name} · exile`}
          input={input}
          art={art}
          clicks={clicks}
          mine={mine}
          zoom={mine ? 'up' : 'down'}
          align="start"
        />
      )}
      {player.zones.command.cards.length > 0 && (
        <ZoneRow
          cards={player.zones.command.cards}
          kind="strip"
          label={`${player.name} · command`}
          input={input}
          art={art}
          clicks={clicks}
          mine={mine}
          zoom={mine ? 'up' : 'down'}
          align="start"
        />
      )}
      {board.combat !== null && board.combat.bands.length > 0 && mine && (
        <span className="middle__combat muted">
          {board.combat.bands.length} attacking band
          {board.combat.bands.length === 1 ? '' : 's'} — see the log drawer
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Battlefield partitioning (report 10 §3.3)
// ---------------------------------------------------------------------------

interface Split {
  lands: AnyCard[];
  permanents: AnyCard[];
  /** host card id → the Auras / Equipment hoisted into its tile (§4.4). */
  attachments: Map<number, AnyCard[]>;
}

/**
 * Split one seat's battlefield into the two rows, and hoist attachments.
 *
 * The land/permanent split is a **presentation bucket** over `card.types` —
 * Forge's `CardType.toString()` verbatim, plain hyphen and all (§10.4) — exactly
 * like a phase label. It never affects what is clickable, and a creature-land
 * (matching both) goes in the permanents row, which is a layout choice and not a
 * rules one.
 *
 * An attachment is looked up **across both seats**, because an Aura on the
 * opponent's creature lives in the caster's `attachmentIds` but must draw on the
 * opponent's row. If the host does not resolve — hidden, or gone — the
 * attachment falls back to a standalone tile. Never drop it.
 */
function splitBattlefield(board: GameStateBody, player: PlayerState | undefined): Split {
  const attachments = new Map<number, AnyCard[]>();
  const hoisted = new Set<number>();

  for (const seat of board.players) {
    for (const card of seat.zones.battlefield.cards) {
      if (isHidden(card) || card.attachedToId === null) continue;
      const host = hostOnBattlefield(board, card.attachedToId);
      if (host === null) continue;
      const list = attachments.get(host) ?? [];
      list.push(card);
      attachments.set(host, list);
      hoisted.add(card.id);
    }
  }

  const lands: AnyCard[] = [];
  const permanents: AnyCard[] = [];
  for (const card of player?.zones.battlefield.cards ?? []) {
    if (hoisted.has(card.id)) continue;
    const types = isHidden(card) ? '' : card.types;
    if (types !== '' && isLandTypeLine(types) && !/Creature/.test(types)) lands.push(card);
    else permanents.push(card);
  }
  return { lands, permanents, attachments };
}

/** The host id, but only when the host is really on a battlefield row. */
function hostOnBattlefield(board: GameStateBody, hostId: number): number | null {
  for (const seat of board.players) {
    const hit = seat.zones.battlefield.cards.find((card) => card.id === hostId);
    if (hit !== undefined) return hit.id;
  }
  return null;
}

/**
 * One line of already-resolved combat text per card, so a tile can say what it
 * is doing without the reader chasing the combat panel. Every fact the arrows
 * will draw in evening 3 is also text (§14 rule 4) — this is the first half of
 * that, and `board.combat` is `null` outside a combat phase, which this is total
 * over.
 */
function combatNotes(board: GameStateBody): Map<number, string> {
  const notes = new Map<number, string>();
  for (const band of board.combat?.bands ?? []) {
    const defender = entityLabel(board, band.defender);
    for (const attacker of band.attackerIds) notes.set(attacker, `→ ${defender}`);
    for (const blocker of band.blockerIds) {
      notes.set(blocker, `blocks ${band.attackerIds.map((id) => cardLabel(board, id)).join(', ')}`);
    }
  }
  return notes;
}

// ---------------------------------------------------------------------------
// Small pieces kept from M1/M3
// ---------------------------------------------------------------------------

/** The viewer's own seat at the bottom: opponent(s) on top, you below. */
function orderSeats(players: PlayerState[], you: number | null): PlayerState[] {
  if (you === null) return players;
  return [...players.filter((p) => p.id !== you), ...players.filter((p) => p.id === you)];
}

/**
 * Is it this seat's move? Derived from the snapshot the engine sent — `priority`
 * is a player id (§3.1) — and nothing else. It decides what a toast says, never
 * what is legal (§9 invariant 8).
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

function GameOverBanner({ state, board }: { state: ClientState; board: GameStateBody }): JSX.Element {
  const over = state.gameOver;
  if (over === null) return <></>;
  return (
    <div className="banner banner--over" role="status">
      <strong>Game over.</strong>{' '}
      {over.winner !== null
        ? `Winner: ${playerName(board, over.winner)}.`
        : // §7 + amendment M11: `winner: null` is a draw — EXCEPT when `reason`
          // is null too, which is the one path where the engine never published
          // an outcome at all (a concede before this seat was asked for
          // anything). Printing "Draw" there would report a result nobody
          // played for.
          over.reason === null
          ? 'No result — the session ended before the engine published an outcome.'
          : 'Draw.'}{' '}
      {over.reason ?? ''}
      {!over.matchOver && ' (the match continues)'}
    </div>
  );
}

/**
 * The toast strip: the engine's recent notices (§6), the transport's own
 * complaints, and "Your turn".
 *
 * Capped and newest-first, and **briefly** is done in CSS (`animation:
 * toast-fade`) rather than with a timer, because a timer here would be an effect
 * the render test cannot run. The full history stays in the log drawer — a toast
 * that disappears is not allowed to be the only copy of "Not selectable".
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
        <span key={`${String(notice.seq)}-${String(notice.t)}`} className={`toast toast--${notice.level}`}>
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
 * it hands back, and five identical toasts in a row is a strip that stops being
 * read. The drawer still lists every one of them individually — this is
 * presentation, not filtering, and the strings are never rewritten (§6).
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
