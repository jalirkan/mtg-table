/*
 * mtg-table — render/PhaseStrip.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The right rail: the round/turn header and thirteen phase rows (report 10 §6),
 * and — **as of M6** — the live phase stops (report 11 §3).
 *
 * **Thirteen rows, not twelve.** Forge's own strip omits `UNTAP`
 * (`PhaseIndicator.java:22-33` starts at `UP`), but `PhaseType` has 13 constants
 * and the engine really does sit in `UNTAP`, so the row is drawn — with `·` in
 * both dot columns, because `CMatchUI.actuateMatchPreferences` loops `p = 1 … 12`
 * and **there is no `PHASE_*_UNTAP` preference at all**. Rendering a 13th toggle
 * that cannot exist would be a lie (report 10 §6.2).
 *
 * **Two dots per row**, because Forge keeps one indicator per player field: the
 * left dot is "stop here when it is *your* turn", the right is "when it is the
 * *opponent's*" — `players[].phaseStops.own` and `.opp` (§3.3). Filled `●`
 * versus hollow `○` is a **shape** difference, not only a colour one (§14 rule 3).
 *
 * **M6 made them live, and the markup barely moved** — which is what M4's header
 * promised: only `onClick` and the data source changed. Three rules hold:
 *
 *   1. **The dots render from `players[].phaseStops` and from nothing else.** A
 *      click is `act: setPhaseStop {phase, turn, stop}` and the next `state`
 *      says what happened; this component keeps no stop state of its own,
 *      because a client that remembered which phases it stops at would have put
 *      phase-stop logic in the browser (`CLAUDE.md` §Scope, **D31**).
 *   2. **A stream with no `phaseStops` still draws dots — Forge's documented
 *      defaults, disabled, and the legend says that is what they are.** That is
 *      every recording made before 2026-09-12, which `render.test.tsx` folds in
 *      full. `phaseStopsOf` is the one place the two cases are told apart.
 *   3. **The pass-to marker is drawn, not inferred.** `state.yield` (§3) says
 *      which of the three engine yields is running and, for a marker, on which
 *      seat and phase; the strip draws `⏩` on that cell and a line saying how it
 *      ends. It never computes a yield from the phase and the priority.
 *
 * `board.phase === null` in the pre-game frames (§10.5): no cell is active and
 * the header reads "before the game". A strip that assumed a phase string would
 * crash on frame 1 of every fixture.
 */

import {
  phaseStopsOf,
  yieldOf,
  type GameStateBody,
  type PhaseStops,
  type YieldState,
} from '../protocol.ts';
import {
  COMBAT_PHASES,
  FORGE_DEFAULT_STOPS_OPPONENT,
  FORGE_DEFAULT_STOPS_YOURS,
  PHASE_ORDER,
  PHASE_STRIP_LABELS,
  PHASE_WITHOUT_STOP,
} from './labels.ts';

/** Which column a dot belongs to: this seat's own turns, or the opponent's. */
export type StopTurn = 'own' | 'opp';

export type SetPhaseStop = (phase: string, turn: StopTurn, stop: boolean) => void;

const DEFAULTS_TOOLTIP =
  'this stream carries no players[].phaseStops (a recording made before M6, or a replay), so these ' +
  'are Forge’s own defaults from ForgePreferences.java:239-264 — not this session’s map';

export function PhaseStrip({
  board,
  you,
  onSetPhaseStop = null,
}: {
  board: GameStateBody | null;
  you: number | null;
  /**
   * `null` in a replay, while an `ask` is outstanding, and after `over`: the
   * dots still render, they simply send nothing. The engine is the only writer.
   */
  onSetPhaseStop?: SetPhaseStop | null;
}): JSX.Element {
  const phase = board?.phase ?? null;
  const yourTurn = board !== null && you !== null && board.activePlayer === you;
  const seat = board?.players.find((p) => you !== null && p.id === you) ?? null;
  // §3.3 — `null` means "this bridge does not carry stops", which is a different
  // fact from "this seat stops nowhere" and is drawn differently.
  const stops: PhaseStops | null = phaseStopsOf(seat);
  const live = stops !== null && onSetPhaseStop !== null;
  const yielding = yieldOf(board);
  const markerPhase = yielding !== null && yielding.kind === 'marker' ? yielding.phase : null;
  const markerMine =
    yielding === null || yielding.playerId === null ? null : you !== null && yielding.playerId === you;

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
          const marked = markerPhase === name;
          const cls = [
            'phase',
            combat ? 'phase--combat' : '',
            active ? 'phase--active' : '',
            active ? (yourTurn ? 'phase--active-you' : 'phase--active-opp') : '',
            marked ? 'phase--marked' : '',
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
                {marked && (
                  <span
                    className="phase__marker"
                    data-marker={markerMine === true ? 'own' : markerMine === false ? 'opp' : 'any'}
                    title={`pass-to marker: the engine is passing priority until ${
                      markerMine === true ? 'your' : markerMine === false ? 'the opponent’s' : 'this'
                    } ${PHASE_STRIP_LABELS[name] ?? name} (state.yield) — the engine’s Cancel button stops it`}
                  >
                    ⏩<span className="sr-only"> pass-to marker</span>
                  </span>
                )}
                <span className="phase__dots">
                  <StopDot
                    phase={name}
                    turn="own"
                    on={
                      stops === null
                        ? FORGE_DEFAULT_STOPS_YOURS.has(name)
                        : stops.own.includes(name)
                    }
                    live={live}
                    onSetPhaseStop={onSetPhaseStop}
                  />
                  <StopDot
                    phase={name}
                    turn="opp"
                    on={
                      stops === null
                        ? FORGE_DEFAULT_STOPS_OPPONENT.has(name)
                        : stops.opp.includes(name)
                    }
                    live={live}
                    onSetPhaseStop={onSetPhaseStop}
                  />
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="strip__legend muted">
        ● stop · ○ pass · · no pref — left dot: your turn, right dot: theirs.
        {stops === null ? (
          <>
            {' '}
            <span title={DEFAULTS_TOOLTIP}>Forge defaults (this stream sends no stops).</span>
          </>
        ) : (
          <> Click one — the engine answers with the next state.</>
        )}
      </p>

      <YieldLine yielding={yielding} />
    </aside>
  );
}

/**
 * What `state.yield` says, in the engine's own three cases (report 11 §4.1), and
 * how it ends — which is always the same button, `InputLockUI`'s Cancel. There
 * is no `cancelYield` act and there must not be one.
 */
function YieldLine({ yielding }: { yielding: YieldState | null }): JSX.Element | null {
  if (yielding === null) return null;
  const what =
    yielding.kind === 'endOfTurn'
      ? 'until the end of this turn'
      : yielding.kind === 'endStepOrOpponent'
        ? 'until an opponent acts or the end step'
        : yielding.kind === 'stack'
        ? 'until the stack clears'
        : `until ${yielding.phase ?? 'the marked phase'}`;
  return (
    <p className="strip__yield" role="status" data-yield={yielding.kind}>
      <span className="strip__yieldglyph" aria-hidden="true">
        ⏩
      </span>{' '}
      passing {what} — press the engine’s Cancel to stop.
    </p>
  );
}

function StopDot({
  phase,
  turn,
  on,
  live,
  onSetPhaseStop,
}: {
  phase: string;
  turn: StopTurn;
  on: boolean;
  live: boolean;
  onSetPhaseStop: SetPhaseStop | null;
}): JSX.Element {
  if (phase === PHASE_WITHOUT_STOP) {
    return (
      <span className="dot dot--none" title={`${phase} has no stop preference in Forge`}>
        ·
      </span>
    );
  }
  const whose = turn === 'own' ? 'your' : 'the opponent’s';
  return (
    <button
      type="button"
      className={`dot dot--${turn === 'own' ? 'you' : 'opponent'}${on ? ' dot--on' : ''}`}
      disabled={!live}
      data-act="setPhaseStop"
      data-phase={phase}
      data-turn={turn}
      data-stop={on ? 'on' : 'off'}
      aria-pressed={on}
      aria-label={`${on ? 'stop' : 'pass through'} at ${phase} on ${whose} turn${
        live ? '' : ' (read-only)'
      }`}
      title={
        live
          ? `act: setPhaseStop {phase: ${phase}, turn: ${turn}, stop: ${String(!on)}} — ` +
            `${on ? 'stop here' : 'pass through'} on ${whose} turn`
          : DEFAULTS_TOOLTIP
      }
      onClick={() => {
        onSetPhaseStop?.(phase, turn, !on);
      }}
    >
      {on ? '●' : '○'}
    </button>
  );
}
