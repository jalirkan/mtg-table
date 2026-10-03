/*
 * mtg-table — render/GameOver.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The end of a game, and the way out of it — once, for both renderers.**
 *
 * Both pieces were M1/M6 code inside `Board.tsx` and `DecisionPanel.tsx`, and
 * the arena had neither: conceding from the 3D table greyed its two buttons out
 * and said nothing at all — no winner, no reason, no New Game row — while the
 * same session on the board printed *"Game over. Winner: Forge AI.
 * AllOpponentsLost"* and offered both buttons. M6's headline flow (three games
 * back to back, New Game clicked from the renderer you are sitting in) was
 * therefore unreachable from the arena, and a player who conceded there was
 * left staring at a frozen table.
 *
 * So they live here and are mounted by both. Two rules travel with them:
 *
 *  1. **The engine's own `winner` and `reason`, verbatim** — no result text is
 *     rebuilt, no outcome is inferred (CLAUDE.md, M5 convention 4).
 *  2. **The row goes quiet when the socket does** (**D40**). `connected` is the
 *     wire, never game state: `false` disables both buttons and says why,
 *     `null` is a replay.
 */

import type { GameStateBody } from '../protocol.ts';
import { gameLabel, type ClientState } from '../reduce.ts';
import { playerName } from './resolve.ts';

/**
 * What the engine said when the game ended, rendered and not interpreted.
 *
 * `state.board` may be `null` here: amendment **M11**'s `over` can arrive with
 * no `gameOver` `state` in front of it (a concede before this seat was asked
 * anything), and the winner is then printed as the bare player id rather than
 * not printed at all.
 */
export function GameOverBanner({ state }: { state: ClientState }): JSX.Element {
  const over = state.gameOver;
  if (over === null) return <></>;
  const board: GameStateBody | null = state.board;
  return (
    <div className="banner banner--over" role="status">
      <strong>Game over.</strong>{' '}
      {over.winner !== null
        ? `Winner: ${
            board === null ? `player ${String(over.winner)}` : playerName(board, over.winner)
          }.`
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
 *
 * It takes the one act it sends rather than a whole `BoardActions`, because the
 * arena's seat is an `onAct` function and a second copy of this row is how the
 * two renderers would start disagreeing about what ends a match.
 */
export function NewGameRow({
  state,
  onNewGame,
  connected = null,
}: {
  state: ClientState;
  onNewGame: (mode: 'continue' | 'restart') => void;
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
          onNewGame('continue');
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
          onNewGame('restart');
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
