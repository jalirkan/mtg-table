/*
 * mtg-table — render/DecisionPanel.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The seat's controls (report 10 §7). Where the game is played from.
 *
 * Four rules, each with a failure behind it:
 *
 *   1. **`input.prompt` is rendered verbatim**, in a `role="status"` region. It
 *      is never rewritten, never summarised and never replaced by the title:
 *      the title says *where we are*, the prompt says *what the engine wants*
 *      (docs/protocol.md §4).
 *   2. **`input.buttons.*.label` is rendered verbatim too**, and the acts sent
 *      are `buttonOk` / `buttonCancel`. `Auto`, `Undo (2)` and `End Turn` are
 *      Forge's own labels — `InputPassPriority` and `InputPayMana` write them —
 *      so there is no `autoPay` act and no `endTurn` act, and a board that
 *      prints its own "Pass Priority" has thrown the engine's answer away
 *      (report 11 §0.1, report 10 §7.2, §16.4.1).
 *   3. **`ok.enabled === false` means "click a card", not "nothing to do"**
 *      (§4.2, §9 invariant 5). That is the documented hang: a button-only client
 *      stalls at the discard step with no error at all. The amber hint is the
 *      fix, and `web/test/render.test.tsx` asserts it on every fixture frame
 *      that reaches the condition.
 *   4. **Concede is reachable from every UI state** (§9 invariant 6) — including
 *      while an `ask` is blocking the game thread and while the board is wedged
 *      — behind one confirming click, because it ends the game and there is no
 *      undo for it.
 *
 * **M6 adds four controls, and every one of them is an engine call** (report 11):
 *
 *   5. **Pass-to** — three buttons for `YieldController`'s three mechanisms
 *      (§4.1): end of turn, a marker on my upkeep, a marker on the opponent's
 *      end step. While one is running, `state.yield` says which and the panel
 *      says so; **the way out is the engine's own Cancel button**, which
 *      `InputLockUI` keeps enabled for the whole of a yield. There is no
 *      `cancelYield` act, and a second path into `clearActiveYieldAndDispatch`
 *      is exactly what rule 2 exists to prevent.
 *   6. **Undo** — `act: undo`, enabled from `state.undo.can` and labelled with
 *      `state.undo.depth`. It sits *beside* the engine's own Cancel, which
 *      `InputPassPriority` frequently labels `Undo (n)` itself: the two agree
 *      because they ask the same question, and if they ever disagree the
 *      engine's label wins (report 11 §7.3).
 *   7. **New Game / Restart** — `act: newGame {mode}`, offered only once the
 *      game is over, because `nextGameDecision` is only meaningful then.
 *   8. **Pass priority** — `act: passPriority`, which the jar defines as "press
 *      OK *if* the current input is `InputPassPriority`", i.e. a no-op
 *      otherwise. That is why it is a separate control and not a second OK.
 *
 * The stall warning is {@link wedgeSuspected} from `wedge.ts`, imported rather
 * than re-derived: it is a rule that has already been wrong once (amendment
 * M21), it has its own test, and the two qualifiers it grew — *this seat holds
 * priority* and *the stream has gone quiet* — are exactly the ones a re-derived
 * copy would lose.
 */

import { useEffect, useState } from 'react';

import type { ArtIndex } from '../art.ts';
import {
  buttonFocus,
  isHidden,
  undoOf,
  yieldOf,
  type AnyCard,
  type GameStateBody,
  type InputBody,
  type InputButton,
  type YieldKind,
} from '../protocol.ts';
import { gameLabel, type ClientState } from '../reduce.ts';
import {
  chordFor,
  YIELD_MARKER_BEFORE_MY_TURN,
  YIELD_MARKER_BEFORE_MY_TURN_SIDE,
  YIELD_MARKER_MY_TURN,
  YIELD_MARKER_MY_TURN_SIDE,
  type KeyActionId,
} from '../keys.ts';
import type { BoardActions } from './Board.tsx';
import { AskPicker, type AskPickerProps } from './AskPicker.tsx';
import { CardTile, displayName, type Clicks } from './CardTile.tsx';
import { STEP_TITLE } from './labels.ts';
import { WEDGE_QUIET_MS, wedgeSuspected } from './wedge.ts';

/**
 * What a key press that did nothing left behind (report 10 §12.2 rule 4): the
 * chord, and the engine's or the milestone's reason. A hint that lies is worse
 * than no hint, so a bound key that is not implemented yet says so here instead
 * of being swallowed.
 */
export interface KeyFlash {
  id: KeyActionId;
  chord: string;
  why: string;
}

export function DecisionPanel({
  state,
  board,
  you,
  input,
  art,
  actions,
  clicks,
  flash = null,
  onHotkeys,
  askPicker = null,
  picksSent = 0,
  manaProvisional = false,
  connected = null,
}: {
  state: ClientState;
  board: GameStateBody | null;
  you: number | null;
  input: InputBody | null;
  art: ArtIndex;
  actions: BoardActions | null;
  clicks: Clicks | null;
  flash?: KeyFlash | null;
  /** The mouse's way to the `?` overlay; the keyboard's is `H`. */
  onHotkeys?: () => void;
  /**
   * M5 — a board-shaped `ask` (`picker.ts`). Non-null means the tiles are the
   * control and this panel holds the prompt, the count and the two buttons;
   * `AskModal` is not mounted at all for that ask.
   */
  askPicker?: AskPickerProps | null;
  /**
   * M5 — how many clicks this seat has sent since the current `selectable`
   * prompt appeared. **Not the engine's count**: the wire carries no
   * "chosen so far" field, so this is what the browser did, labelled as such.
   */
  picksSent?: number;
  /**
   * M6 — an `undo` or a `useMana` has been sent and no `state` has arrived
   * since, so `state.undo` and the pool counts are a frame behind (the engine
   * pushes an `input` for both and a snapshot for neither). The Undo button says
   * so rather than printing a stale depth as fact.
   */
  manaProvisional?: boolean;
  /**
   * **M6 fix** — the socket's own state (`Board`'s `connected` prop). `false`
   * disables the New Game row and says why; `null` is a replay. Nothing else
   * reads it.
   */
  connected?: boolean | null;
}): JSX.Element {
  // §5: an outstanding ask owns the interaction. The buttons belong to the
  // `input` the engine pushed *before* it blocked, and pressing one now would
  // answer nothing.
  const asking = state.ask !== null;
  const live = actions !== null && !asking && state.gameOver === null;

  return (
    <section className="decision" aria-label="Decision">
      <h2 className="decision__title">{stepTitle(board, you)}</h2>

      {/* §5 — the question owns the panel while it is outstanding. The board's
          tiles are the control; these are the words and the buttons. */}
      {askPicker !== null && <AskPicker {...askPicker} />}

      {input === null ? (
        <p className="muted">the engine has not asked for anything yet</p>
      ) : (
        <>
          {/* The engine's own words, verbatim. `polite`, not `assertive`: the
              prompt changes on almost every priority pass (§14). */}
          <p className="prompt" role="status">
            {input.prompt}
          </p>

          <div className="decision__buttons">
            <EngineButton
              button={input.buttons.ok}
              act="buttonOk"
              hint="SPACE"
              // §4 (M6): SPACE presses whichever button the engine focused, so
              // the chip is on that one and not always on OK.
              focused={buttonFocus(input) === 'ok'}
              flashed={flash?.id === 'ok'}
              onClick={live ? actions.buttonOk : null}
            />
            <EngineButton
              button={input.buttons.cancel}
              act="buttonCancel"
              hint="ESC"
              focused={buttonFocus(input) === 'cancel'}
              flashed={flash?.id === 'cancel'}
              onClick={live ? actions.buttonCancel : null}
            />
            {/* **M6 — Undo is real.** `state.undo` is `canUndoLastAction()` plus
                `MagicStack.getUndoStackSize()`, both game-thread reads (report
                11 §7), and the button is enabled from `can` and labelled with
                `depth`. It undoes **mana abilities** — a tapped land, a mana
                rock — never a cast, and the title says so, because a button that
                promises more than the engine does is worse than no button.

                It sits beside the engine's own Cancel, which `InputPassPriority`
                labels `Undo (n)` itself. Two controls, one question; if they
                ever disagree the engine's label wins.

                **M4's third button is gone.** It said "Auto Pay", and there is
                no such client feature: Forge's `InputPayMana` writes `Auto` on
                its own OK button (`InputPayMana.java:376-395`), which is two
                buttons to the left, rendered verbatim. M5 wired the rest of
                mana payment where it actually lives — the lands are clicks and
                the floating pool is the rail's pips (`act: useMana`). */}
            <UndoButton
              board={board}
              onUndo={live ? actions.undo : null}
              flashed={flash?.id === 'undo'}
              provisional={manaProvisional}
            />
            {actions !== null && (
              <ConcedeButton onConcede={actions.concede} gameOver={state.gameOver !== null} />
            )}
            {onHotkeys !== undefined && (
              <button
                type="button"
                className="btn btn--small"
                title="the keyboard map, rendered from the same table the handler reads (report 10 §12)"
                onClick={onHotkeys}
              >
                ? keys
              </button>
            )}
          </div>

          {/* M6 — the three yields, and what is running. Both halves are engine
              state: the buttons send `yieldTo` and `state.yield` says what
              happened, which is the same shape as every other control here. */}
          <PassToRow live={live} actions={actions} board={board} flash={flash} />

          {/* M6 — after `over`, the two `nextGameDecision`s. Never before: the
              engine ignores the decision while a game is running, and a button
              that silently does nothing is the dead end M5 spent an evening
              removing. */}
          {actions !== null && state.gameOver !== null && (
            <NewGameRow state={state} actions={actions} connected={connected} />
          )}

          {flash !== null && (
            <p className="hint hint--flash" role="status">
              <span className="btn__key">{flash.chord}</span> {flash.why}
            </p>
          )}

          {asking && (
            <p className="hint">
              a question is outstanding — answer it above; the buttons belong to the input the engine
              pushed before it blocked
            </p>
          )}

          {/* §4.2 — the invariant that silently stalls a button-only client. */}
          {!input.buttons.ok.enabled && input.selectable.cardIds.length > 0 && (
            <p className="hint hint--loud">
              OK is disabled and cards are selectable: the engine wants a <strong>card click</strong>,
              not a button. Click a card — {input.selectable.min}
              {input.selectable.max > input.selectable.min ? `–${input.selectable.max}` : ''} of{' '}
              {input.selectable.cardIds.length} outlined.
            </p>
          )}

          <WedgeBanner
            live={actions !== null}
            suspect={wedgeSuspected(state)}
            framesApplied={state.framesApplied}
          />

          {/* M5 — "chosen k of min..max" while a selection is outstanding.
              The wire carries no running count (§4 has `min`/`max` and the id
              set, and nothing else), so this is the number of clicks THIS
              browser has sent since the prompt appeared, and it says so. It is
              never enforced: Forge judges, and a board that refused the click
              that completes a choice would be rules logic (CLAUDE.md §Scope). */}
          {input.selectable.mode !== 'none' && (
            <p className="decision__chosen">
              chosen <strong>{picksSent}</strong> of {input.selectable.min}
              {input.selectable.max > input.selectable.min ? `..${String(input.selectable.max)}` : ''}{' '}
              <span className="muted">
                — clicks sent since this prompt; the engine is the judge of every one
              </span>
            </p>
          )}

          <p className="decision__meta muted">
            selectable ({input.selectable.mode}): {input.selectable.cardIds.length} ids, choose{' '}
            {input.selectable.min}–{input.selectable.max}
            {input.highlighted.length > 0 && ` · highlighted ${String(input.highlighted.length)}`}
            {/* Report 07 A8 (P7): `setWeaklySelectable` — what Forge's own "Auto"
                would have tapped. Ids only; the client suggests nothing of its own. */}
            {input.weak.length > 0 && <> · weak {input.weak.map((id) => `#${String(id)}`).join(' ')}</>}
          </p>

          {/* P7 / report 06 §6.9: `setCard` is frequently pushed with a card that
              is NOT in the snapshot (a library card during surveil), so the focus
              card travels as a serialised card and the thumbnail prefers it over
              any id lookup. */}
          {input.focusCard !== null && (
            <div className="decision__focus">
              <span className="k">focus</span>
              <ul className="row row--strip" style={{ '--slots': '1' } as React.CSSProperties}>
                <CardTile
                  card={input.focusCard}
                  kind="strip"
                  input={input}
                  art={art}
                  clicks={clicks}
                  mine={false}
                  zoom="down"
                  // The card's own tile owns `c:<id>` for the arrows overlay;
                  // this thumbnail is a second copy of it (report 10 §9.1).
                  anchor={false}
                />
              </ul>
              <span className="muted">{focusLabel(input.focusCard)}</span>
            </div>
          )}

          {/* P6 / report 06 §3: `openZones` and `tempShowZones` reveal NOTHING —
              `PlayerZoneUpdate` is (PlayerView, Set<ZoneType>) and has no card
              accessor at all. They are "the engine would like this zone open"
              hints, answered locally, which is why they are no longer an ask. */}
          {input.openZones.length > 0 && (
            <p className="decision__zones">
              <span className="k">open zones</span>
              {input.openZones.map((hint) => (
                <span key={`${String(hint.playerId)}-${hint.zones.join('.')}`} className="pill">
                  player {hint.playerId} · {hint.zones.join(' / ')}
                </span>
              ))}
              <span className="muted"> — a view hint; it reveals no cards</span>
            </p>
          )}
        </>
      )}

      {input === null && actions !== null && (
        <>
          <div className="decision__buttons">
            <ConcedeButton onConcede={actions.concede} gameOver={state.gameOver !== null} />
          </div>
          {/* Amendment M11's shape: an `over` with no `input` and no `gameOver`
              `state` in front of it. New Game has to be reachable there too, or
              a session that ended before this seat was asked anything is a dead
              end with a JVM still running. */}
          {state.gameOver !== null && (
            <NewGameRow state={state} actions={actions} connected={connected} />
          )}
        </>
      )}
    </section>
  );
}

/**
 * **M6 — Pass To** (report 11 §4). Three buttons for `YieldController`'s three
 * mechanisms, all of them through one act and one engine call,
 * `sendYieldUpdate(YieldUpdate)`:
 *
 * | button | act | engine |
 * |---|---|---|
 * | End of turn | `yieldTo {kind:"endOfTurn"}` | `SetAutoPassUntilEndOfTurn` |
 * | My next turn | `yieldTo {kind:"marker", phase:"UPKEEP"}` | `SetMarker(me, UPKEEP)` |
 * | Before my turn | `yieldTo {kind:"marker", phase:"END_OF_TURN"}` | `SetMarker(opponent, END_OF_TURN)` |
 *
 * `UPKEEP` rather than `UNTAP` is Forge's own choice and its own comment:
 * *UNTAP has no priority pass, so a marker on UNTAP could never fire*
 * (`InputPassPriority.java:248-255`).
 *
 * While a yield is running the three buttons go quiet and the line below says
 * what is happening. **Cancelling is the engine's Cancel button** — the panel
 * points at it rather than growing a fourth control, because `InputLockUI`
 * already labels it and `AbstractGuiGame.updateAutoPassPrompt` already writes
 * the prompt above it (§4.2).
 */
function PassToRow({
  live,
  actions,
  board,
  flash,
}: {
  live: boolean;
  actions: BoardActions | null;
  board: GameStateBody | null;
  flash: KeyFlash | null;
}): JSX.Element | null {
  if (actions === null) return null;
  const yielding = yieldOf(board);
  const running = yielding !== null;
  const send = (kind: YieldKind, phase?: string, turn?: 'own' | 'opp') => () => {
    actions.yieldTo(kind, phase, turn);
  };
  return (
    <div className="decision__passto">
      <span className="k">pass to</span>
      <button
        type="button"
        className={`btn btn--small${flash?.id === 'passEndTurn' ? ' btn--flash' : ''}`}
        disabled={!live || running}
        data-act="yieldTo"
        data-yield="endOfTurn"
        title="act: yieldTo {kind:'endOfTurn'} — YieldController.endTurn; the engine passes priority until this turn ends, and its Cancel button stops it"
        onClick={send('endOfTurn')}
      >
        End of turn <span className="btn__key">{chordFor('passEndTurn')}</span>
      </button>
      <button
        type="button"
        className={`btn btn--small${flash?.id === 'passMyTurn' ? ' btn--flash' : ''}`}
        disabled={!live || running}
        data-act="yieldTo"
        data-yield="marker"
        data-phase={YIELD_MARKER_MY_TURN}
        data-turn={YIELD_MARKER_MY_TURN_SIDE}
        title={`act: yieldTo {kind:'marker', phase:'${YIELD_MARKER_MY_TURN}', turn:'${YIELD_MARKER_MY_TURN_SIDE}'} — a marker on my own upkeep (UNTAP has no priority pass, so a marker there could never fire)`}
        onClick={send('marker', YIELD_MARKER_MY_TURN, YIELD_MARKER_MY_TURN_SIDE)}
      >
        My next turn <span className="btn__key">{chordFor('passMyTurn')}</span>
      </button>
      <button
        type="button"
        className={`btn btn--small${flash?.id === 'passBeforeTurn' ? ' btn--flash' : ''}`}
        disabled={!live || running}
        data-act="yieldTo"
        data-yield="marker"
        data-phase={YIELD_MARKER_BEFORE_MY_TURN}
        data-turn={YIELD_MARKER_BEFORE_MY_TURN_SIDE}
        title={`act: yieldTo {kind:'marker', phase:'${YIELD_MARKER_BEFORE_MY_TURN}', turn:'${YIELD_MARKER_BEFORE_MY_TURN_SIDE}'} — the opponent's end step, the last stop before my turn (a marker is per-(player, phase): on my own cell this would skip my whole turn too)`}
        onClick={send('marker', YIELD_MARKER_BEFORE_MY_TURN, YIELD_MARKER_BEFORE_MY_TURN_SIDE)}
      >
        Before my turn <span className="btn__key">{chordFor('passBeforeTurn')}</span>
      </button>
      <button
        type="button"
        className={`btn btn--small${flash?.id === 'passPriority' ? ' btn--flash' : ''}`}
        disabled={!live}
        data-act="passPriority"
        title="act: passPriority — IGameController.passPriority() presses OK only when the engine is actually asking for a priority pass, so it is a no-op the rest of the time"
        onClick={() => {
          actions.passPriority();
        }}
      >
        Pass <span className="btn__key">{chordFor('passPriority')}</span>
      </button>
      {running && (
        <p className="hint hint--yield" role="status" data-yield={yielding.kind}>
          <strong>Yielding</strong>{' '}
          {yielding.kind === 'endOfTurn'
            ? 'until the end of this turn'
            : yielding.kind === 'stack'
              ? 'until the stack clears'
              : `until ${yielding.phase ?? 'the marked phase'}`}
          {' — '}the engine keeps <strong>Cancel</strong> enabled above for as long as it runs; that
          is the way out (there is no separate act for it).
        </p>
      )}
    </div>
  );
}

/**
 * **M6 — Undo** (report 11 §7). `state.undo`, and nothing derived.
 *
 * The label carries the depth because Forge's own Cancel does (`Undo (2)`), and
 * the title says what is actually undoable, which is narrower than the word:
 * mana abilities in the current priority window, cleared at every phase change.
 */
function UndoButton({
  board,
  onUndo,
  flashed,
  provisional = false,
}: {
  board: GameStateBody | null;
  onUndo: (() => void) | null;
  flashed: boolean;
  /** An act was sent and no snapshot has arrived since; the depth may be behind. */
  provisional?: boolean;
}): JSX.Element {
  const undo = undoOf(board);
  const enabled = undo.can && onUndo !== null;
  return (
    <button
      type="button"
      className={`btn${enabled ? '' : ' btn--future'}${flashed ? ' btn--flash' : ''}${
        provisional ? ' btn--provisional' : ''
      }`}
      disabled={!enabled}
      data-act="undo"
      data-undo-depth={String(undo.depth)}
      data-provisional={provisional ? 'true' : 'false'}
      title={
        (provisional
          ? 'the engine has not sent a snapshot since your last undo or mana action, so this depth may be one step behind — its own Cancel button is the live answer. '
          : '') +
        (undo.can
          ? `act: undo — IGameController.undoLastAction(), ${String(undo.depth)} step${undo.depth === 1 ? '' : 's'} on the engine's undo stack. It rolls back MANA abilities (a tapped land, a mana rock), never a cast, and a phase change clears it.`
          : 'state.undo.can is false — the engine has nothing undoable right now (undo holds mana abilities only, and it is cleared at every phase change and when priority leaves you)')
      }
      onClick={() => {
        onUndo?.();
      }}
    >
      Undo{undo.depth > 0 ? ` (${String(undo.depth)})` : ''}
      {provisional && (
        <span className="muted" title="provisional — no snapshot since the act">
          {' '}
          ·
        </span>
      )}{' '}
      <span className="btn__key">{chordFor('undo')}</span>
    </button>
  );
}

/**
 * **M6 — New Game** (report 11 §8.2). `act: newGame {mode}` →
 * `nextGameDecision(CONTINUE | NEW)` → `HostedMatch.continueMatch()` /
 * `restartMatch()`, both on the EDT, neither of them paying `FModel.initialize`
 * again.
 *
 * `continue` is the next game of **this** match — the one that makes a
 * `--games 3` session three games and lets the `sideboard` ask fire between
 * them. Once `over.matchOver` is true there is no next game to continue to, so
 * that button goes quiet and Restart is the live one; `matchOver` is a typed
 * field on the wire (§7), not something read out of the result text.
 */
function NewGameRow({
  state,
  actions,
  connected = null,
}: {
  state: ClientState;
  actions: BoardActions;
  /** The socket's state; `null` is a replay. See `BoardProps.connected`. */
  connected?: boolean | null;
}): JSX.Element {
  const matchOver = state.gameOver?.matchOver === true;
  const label = gameLabel(state);
  // **M6 verification fix.** This row appears at `over`, which is the one moment
  // in a session when the bridge may already have gone: the found defect was a
  // 30-second fuse in `MtgTable` that closed the socket under a connected
  // client, and the browser half of it was a row that stayed ENABLED afterwards
  // and answered a click with a toast — "Not connected — act was not sent".
  // The bridge no longer arms that fuse while somebody is attached; this is the
  // other half, because a socket can always go away for other reasons (the JVM
  // was stopped, the machine slept) and a button that cannot do what it says is
  // a dead end whatever closed the socket.
  const offline = connected === false;
  const disableTitle =
    'the bridge is not connected — `act: newGame` has nowhere to go. Reconnect from the ' +
    'status bar, or start a session again with ./scripts/play.sh';
  return (
    <div className="decision__newgame">
      {label !== null && <span className="pill pill--game">{label}</span>}
      <button
        type="button"
        className={`btn btn--small${matchOver || offline ? '' : ' btn--primary'}`}
        disabled={matchOver || offline}
        data-act="newGame"
        data-mode="continue"
        title={
          offline
            ? disableTitle
            : matchOver
              ? 'the match is over — there is no next game to continue to; Restart starts a fresh match'
              : "act: newGame {mode:'continue'} — nextGameDecision(CONTINUE) → HostedMatch.continueMatch(): the next game of this match, with the same JVM and the same card database"
        }
        onClick={() => {
          actions.newGame('continue');
        }}
      >
        New game
      </button>
      <button
        type="button"
        className={`btn btn--small${matchOver && !offline ? ' btn--primary' : ''}`}
        disabled={offline}
        data-act="newGame"
        data-mode="restart"
        title={
          offline
            ? disableTitle
            : 'act: newGame {mode:\'restart\'} — nextGameDecision(NEW) → HostedMatch.restartMatch(): a fresh match from the same rules and players'
        }
        onClick={() => {
          actions.newGame('restart');
        }}
      >
        Restart match
      </button>
      {offline ? (
        <span className="hint hint--loud hint--offline" role="status" data-newgame="offline">
          <strong>The bridge is not connected.</strong> Neither button can send{' '}
          <code>act: newGame</code> — reconnect from the status bar above, or run{' '}
          <code>./scripts/play.sh</code> again.
        </span>
      ) : (
        <span className="muted">
          a new game means a new <code>hello_ok</code>: every card id the board holds is dropped and
          rebuilt (§2.1).
        </span>
      )}
    </div>
  );
}

/**
 * "Your first main phase" / "Forge AI's declare attackers" (report 10 §7.1).
 * Total over the pre-game frames, where `phase` and `activePlayer` are both
 * `null` (§10.5), and over a `PhaseType` constant we have never seen, which
 * prints its raw Forge name rather than `undefined`.
 */
function stepTitle(board: GameStateBody | null, you: number | null): string {
  if (board === null || board.phase === null) return 'Before the game';
  const step = STEP_TITLE[board.phase] ?? board.phase;
  if (board.activePlayer === null) return step;
  if (you !== null && board.activePlayer === you) return `Your ${step}`;
  const name = board.players.find((p) => p.id === board.activePlayer)?.name ?? 'the opponent';
  return `${name}'s ${step}`;
}

/** A card inside an input body, through the same concealment discipline. */
function focusLabel(card: AnyCard): string {
  if (isHidden(card)) return `card back #${String(card.id)}`;
  return `${displayName(card)} #${String(card.id)}`;
}

/**
 * One of the engine's two buttons (§2.2, §4).
 *
 * The label is Forge's and is printed exactly as it arrived; `disabled` is
 * likewise the engine's answer and nothing else. The `aria-label` keeps the
 * ENGINE's word as the accessible name so a reader is told the button, not the
 * footnote; the keyboard hint is a separate chip.
 */
function EngineButton({
  button,
  act,
  onClick,
  hint,
  focused = false,
  flashed = false,
}: {
  button: InputButton;
  act: string;
  /** `null` → a replay: the label still shows, the button does nothing. */
  onClick: (() => void) | null;
  hint: string;
  /**
   * **M6** — `input.buttons.focus` named this one, so SPACE presses it (§4).
   * It draws a ring and the SPACE chip moves here; nothing else changes, and in
   * particular the *label* and `enabled` are still the engine's alone.
   */
  focused?: boolean;
  /** Its key was pressed and the engine had it disabled (report 10 §12.2). */
  flashed?: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      className={`btn btn--engine${focused ? ' btn--focus' : ''}${flashed ? ' btn--flash' : ''}`}
      disabled={!button.enabled || onClick === null}
      data-act={act}
      data-focus={focused ? 'true' : 'false'}
      aria-label={button.label}
      title={
        `the engine's own label — sends act: ${act}` +
        (focused ? ` · the engine focused this button, so SPACE presses it` : ` · ${hint}`)
      }
      onClick={() => {
        onClick?.();
      }}
    >
      {button.label}{' '}
      <span className="btn__key">{focused && act === 'buttonCancel' ? `SPACE / ${hint}` : hint}</span>
    </button>
  );
}

/**
 * §9 invariant 6 — Concede must be reachable from every UI state, so a wedge is
 * always escapable. Two clicks, because it ends the game and there is no undo
 * for it; the second click is the confirmation and says so.
 *
 * Every UI state except one: **a game that is already over**. The button used to
 * stay armed across `over`, so a finished game offered "click again to confirm"
 * over its own result banner.
 */
export function ConcedeButton({
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
      data-act="concede"
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

/**
 * §4.2's wedged-game-thread diagnostic, with the two qualifiers amendment M21
 * added.
 *
 * `suspect` is {@link wedgeSuspected}: the four clauses §4.2 states (OK
 * disabled, `selectable` empty, no ask, game not over) **plus** "and this seat
 * holds priority". The timer is the other half — a wedge is a thread that has
 * stopped, an engine push in flight is a thread that has not — and every folded
 * frame resets it. `live` keeps it out of a replay, where "no frame for 2.5 s"
 * only means the user stopped scrubbing.
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
