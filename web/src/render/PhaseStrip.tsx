/*
 * mtg-table — render/PhaseStrip.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The right rail: the round/turn header and thirteen phase rows (report 10 §6).
 *
 * **Thirteen rows, not twelve.** Forge's own strip omits `UNTAP`
 * (`PhaseIndicator.java:22-33` starts at `UP`), but `PhaseType` has 13 constants
 * and the engine really does sit in `UNTAP`, so the row is drawn — with `·` in
 * both dot columns, because `CMatchUI.actuateMatchPreferences` loops `p = 1 … 12`
 * and **there is no `PHASE_*_UNTAP` preference at all**. Rendering a 13th toggle
 * that cannot exist would be a lie (report 10 §6.2).
 *
 * **Two dots per row**, because Forge keeps one indicator per player field: the
 * left dot is "stop here when it is *your* turn" (`FPref.PHASES_HUMAN`), the
 * right is "when it is the *opponent's*" (`FPref.PHASES_AI`). Filled `●` versus
 * hollow `○` is a **shape** difference, not only a colour one (§14 rule 3).
 *
 * **In M4 the dots are a read-only preview and say so.** The write side exists
 * on paper — `act: setPhaseStop {playerId, phase, stop}` is in
 * `docs/protocol.md` §2.2 — but it is a **M6** row that `WireGuiGame` does not
 * implement yet, and the *read* side (`players[].phaseStops`, §10) is not on the
 * wire at all. A toggle with no read-back would have to remember its own state,
 * and a client that remembers which phases it stops on has put phase-stop logic
 * in the browser, which `CLAUDE.md` §Scope forbids outright. So the dots render
 * from Forge's own documented defaults (`ForgePreferences.java:239-264`), the
 * strip says out loud that that is what they are, and the buttons are disabled
 * with a tooltip naming the act and the milestone. M6 makes them live; the
 * markup does not change, only `onClick` and the data source.
 *
 * `board.phase === null` in the pre-game frames (§10.5): no cell is active and
 * the header reads "before the game". A strip that assumed a phase string would
 * crash on frame 1 of every fixture.
 */

import type { GameStateBody } from '../protocol.ts';
import {
  COMBAT_PHASES,
  FORGE_DEFAULT_STOPS_OPPONENT,
  FORGE_DEFAULT_STOPS_YOURS,
  PHASE_ORDER,
  PHASE_STRIP_LABELS,
  PHASE_WITHOUT_STOP,
} from './labels.ts';

const STOP_TOOLTIP =
  'read-only in M4: act setPhaseStop is docs/protocol.md §2.2 but lands in M6, and the read side ' +
  '(players[].phaseStops, §10) is not on the wire — these are Forge’s own defaults from ' +
  'ForgePreferences.java:239-264, not this session’s map';

export function PhaseStrip({
  board,
  you,
}: {
  board: GameStateBody | null;
  you: number | null;
}): JSX.Element {
  const phase = board?.phase ?? null;
  const yourTurn = board !== null && you !== null && board.activePlayer === you;

  return (
    <aside className="strip" aria-label="Turn and phases">
      <header className="strip__turn">
        {/* §3.1 is explicit: show `round` large and `turn` small. `turn` counts
            PLAYER turns (17 of them for a game the log calls "Turn 9"), and
            showing one where the player expects the other is a bug report
            waiting to happen. */}
        <span className="strip__round">ROUND {board?.round ?? 0}</span>
        <span className="strip__turnno muted">turn {board?.turn ?? 0}</span>
        <span className={`strip__whose ${yourTurn ? 'strip__whose--you' : 'strip__whose--opp'}`}>
          {board === null || board.activePlayer === null
            ? 'before the game'
            : yourTurn
              ? 'your turn'
              : 'opponent’s turn'}
        </span>
      </header>

      <ol className="strip__list">
        {PHASE_ORDER.map((name) => {
          const combat = COMBAT_PHASES.has(name);
          const active = phase === name;
          const cls = [
            'phase',
            combat ? 'phase--combat' : '',
            active ? 'phase--active' : '',
            active ? (yourTurn ? 'phase--active-you' : 'phase--active-opp') : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <li key={name}>
              {name === 'COMBAT_BEGIN' && (
                <span className="strip__divider" aria-hidden="true">
                  combat
                </span>
              )}
              <div className={cls} data-phase={name} aria-current={active ? 'step' : undefined}>
                <span className="phase__label">{PHASE_STRIP_LABELS[name] ?? name}</span>
                <span className="phase__dots">
                  <StopDot phase={name} whose="you" on={FORGE_DEFAULT_STOPS_YOURS.has(name)} />
                  <StopDot phase={name} whose="opponent" on={FORGE_DEFAULT_STOPS_OPPONENT.has(name)} />
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="strip__legend muted">
        ● stop · ○ pass · · no pref — Forge defaults, read-only until M6
      </p>

      {/* Report 10 §6.4: there is no "hold priority" in Forge at all. The honest
          mapping is the INVERSE of its auto-yield
          (`YieldController.setDisableAutoYields`), which is M6. It must never
          become a client-side state machine: a client that swallowed a priority
          pass because a toggle was on would have put rules in the browser. */}
      <button
        type="button"
        className="btn btn--future strip__hold"
        disabled
        title="Forge has no hold-priority feature; the honest mapping is the inverse of its auto-yield (YieldController.setDisableAutoYields) — M6"
      >
        Hold priority <span className="btn__key">OFF</span>
      </button>
    </aside>
  );
}

function StopDot({
  phase,
  whose,
  on,
}: {
  phase: string;
  whose: 'you' | 'opponent';
  on: boolean;
}): JSX.Element {
  if (phase === PHASE_WITHOUT_STOP) {
    return (
      <span className="dot dot--none" title={`${phase} has no stop preference in Forge`}>
        ·
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`dot dot--${whose}${on ? ' dot--on' : ''}`}
      disabled
      aria-label={`${on ? 'stop' : 'pass through'} at ${phase} on ${whose === 'you' ? 'your' : 'the opponent’s'} turn (read-only)`}
      title={STOP_TOOLTIP}
    >
      {on ? '●' : '○'}
    </button>
  );
}
