/*
 * mtg-table — arena/DecisionLayer.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The arena's seat** (report 09 §2.1 rule 2, §11 E6): plain DOM, stacked above
 * the `<canvas>`, holding the engine's prompt, the engine's two buttons and the
 * way out.
 *
 * ---------------------------------------------------------------------------
 * Three rules, and they are the whole file:
 *
 *  1. **Nothing here is re-implemented.** M5's twelve `ask` modals are one
 *     import — `<AskModal>`, the same component the board mounts, with the same
 *     `answerFromDraft` marshalling — so the arena inherits every ask kind on
 *     the day it opens and M5's *"nothing dead-ends"* exit criterion keeps
 *     holding. The same is true of the **end** of the game as of the
 *     verification pass: `<GameOverBanner>` and M6's `<NewGameRow>` moved to
 *     `render/GameOver.tsx` and are mounted by both renderers, so the winner,
 *     the reason and the way into the next game are one component each rather
 *     than two. The **strip** below is new; the **questions** and the
 *     **outcome** are not.
 *  2. **The engine's labels, verbatim** (CLAUDE.md, M5 convention 4). OK is
 *     sometimes `Auto`; Cancel is sometimes `Undo (2)` or `End Turn`. This file
 *     prints `input.buttons.*.label` and branches on nothing but the engine's
 *     own `enabled` and `focus` flags.
 *  3. **It reads `state` and sends acts, and that is all it can do.** It never
 *     imports the cue queue, the stage or anything under `cues/`, so no
 *     animation can gate, delay or swallow a click — a property
 *     `web/test/liveness.test.ts` asserts at the level of the import graph,
 *     because a comment saying it would be worth nothing in a year.
 * ---------------------------------------------------------------------------
 *
 * It is deliberately **not** drei's `<Html>`: that reprojects every widget every
 * frame and couples the modals to R3F for no benefit at all (§2.1).
 */

import { EMPTY_ART_INDEX, type ArtIndex } from '../art.ts';
import {
  buttonFocus,
  matchupOf,
  phaseStopsOf,
  seatMatchOf,
  type ActBody,
  type GameStateBody,
  type InputButton,
  type Matchup,
  type PlayerState,
  type SeatMatch,
} from '../protocol.ts';
import type { ClientState } from '../reduce.ts';
import { AskModal, type AnswerFn } from '../render/AskModal.tsx';
import { GameOverBanner, NewGameRow } from '../render/GameOver.tsx';
import { COMBAT_PHASES, PHASE_STRIP_LABELS, counterLabel } from '../render/labels.ts';
import { ManaPoolPips } from '../render/Mana.tsx';
import { ZoneCount } from '../render/PlayerRail.tsx';
import { viewerIdOf } from './layout.ts';

export interface DecisionLayerProps {
  state: ClientState;
  art?: ArtIndex;
  /** `null` in a replay: there is no server, so every control below is inert. */
  onAct: ((act: ActBody) => void) | null;
  onAnswer?: AnswerFn | null;
  /** The socket is open. A `newGame`/`concede` into a closed socket is a no-op. */
  connected?: boolean;
  /** The last thing a key did that did nothing, and why (`planKey`'s `inert`). */
  hint?: string | null;
  /** CTRL+Q armed the concede: the keyboard and the button share one state. */
  concedeArmed?: boolean;
  onArmConcede?: ((armed: boolean) => void) | null;
  /** Spectating: the log is followed as it is written (`Arena.tsx`'s `follow` prop, plain data). */
  follow?: 'following' | 'stalled' | 'finished' | 'lost' | null;
}

export function DecisionLayer({
  state,
  art = EMPTY_ART_INDEX,
  onAct,
  onAnswer = null,
  connected = true,
  hint = null,
  concedeArmed = false,
  onArmConcede = null,
  follow = null,
}: DecisionLayerProps): JSX.Element {
  const live = onAct !== null && state.gameOver === null;
  const input = state.input;
  const focus = buttonFocus(input);
  const notice = state.notices[state.notices.length - 1] ?? null;
  const matchup = matchupOf(state.hello);

  // The phase stops are the board's control and the same act (M6, D37): live only
  // at a seat, with no question open and the game not over.
  const stopsLive = onAct !== null && state.ask === null && state.gameOver === null;

  return (
    <>
      <SeatPlates state={state} />

      <TurnOrderBar
        board={state.board}
        you={viewerIdOf(state)}
        onSetPhaseStop={
          stopsLive ? (phase, turn, stop) => onAct?.({ action: 'setPhaseStop', phase, turn, stop }) : null
        }
      />

      <div className="arena__decision" role="group" aria-label="The engine">
        {matchup !== null && matchup.aiOnly ? (
          // Nobody at the table is human, so the engine never asks this seat
          // anything (§8.4): the strip says what is being WATCHED instead.
          <WatchLine matchup={matchup} follow={follow} />
        ) : input === null ? (
          <p className="muted">the engine has not asked for anything yet</p>
        ) : (
          <>
            {/* The engine's own words. `role="status"` and polite, because the
                prompt changes on nearly every priority pass. */}
            <p className="prompt" role="status">
              {input.prompt}
            </p>
            <ArenaButton
              button={input.buttons.ok}
              hint="SPACE"
              focused={focus === 'ok'}
              onClick={live ? () => onAct?.({ action: 'buttonOk' }) : null}
            />
            <ArenaButton
              button={input.buttons.cancel}
              hint="ESC"
              focused={focus === 'cancel'}
              onClick={live ? () => onAct?.({ action: 'buttonCancel' }) : null}
            />
            {/* §4.2's invariant, said out loud: a disabled OK with a non-empty
                selectable list is the engine asking for a CARD, not a button.
                In 3D that sentence matters more than it does on the board —
                there is no outlined row to glance at, only outlined cards. */}
            {!input.buttons.ok.enabled && input.selectable.cardIds.length > 0 && (
              <span className="muted">
                click one of the {input.selectable.cardIds.length} outlined cards
              </span>
            )}
          </>
        )}

        {/* **Two clicks, like the board's** (report 10 §7.2): it ends the game
            and there is no undo for it. The armed state is shared with CTRL+Q,
            so arming with the key and confirming with the mouse works, and the
            second press of either is the one that sends the act. Not drawn for
            a spectated game: nobody at that table can concede. */}
        {(matchup === null || !matchup.aiOnly) && (
          <button
            type="button"
            className={`btn btn--small btn--concede${concedeArmed && live ? ' btn--armed' : ''}`}
            disabled={!live || !connected}
            data-act="concede"
            title="act: concede — reachable from every state, an open question included (§9 invariant 6)"
            onClick={() => {
              if (concedeArmed) {
                onArmConcede?.(false);
                onAct?.({ action: 'concede' });
              } else {
                onArmConcede?.(true);
              }
            }}
          >
            {concedeArmed && live ? 'Concede — click again' : 'Concede'}{' '}
            <span className="btn__key">CTRL+Q</span>
          </button>
        )}

        {hint !== null && <span className="arena__hint">{hint}</span>}
        {notice !== null && (
          <span className={`arena__notice arena__notice--${notice.level}`} title={notice.text}>
            {notice.title}
          </span>
        )}
      </div>

      {/* **The end of the game** (verification fix). The arena used to show
          nothing at all here: conceding greyed the two buttons above out — that
          is `live === false`, i.e. `state.gameOver !== null` — and said not one
          word about who won, why, or what to do next, so M6's headline flow
          (three games back to back, New Game clicked where you are sitting) was
          reachable only by pressing `V`. Same banner, same row, same engine
          strings as the board; **D40**'s socket-linger rule comes with the row,
          which goes quiet the moment `connected` says the bridge has gone. */}
      {state.gameOver !== null && (
        <div className="arena__over" role="group" aria-label="Game over">
          <GameOverBanner state={state} />
          {onAct !== null && (
            <NewGameRow
              state={state}
              onNewGame={(mode) => {
                onAct({ action: 'newGame', mode });
              }}
              connected={connected}
            />
          )}
        </div>
      )}

      {/* Every one of M5's twelve ask kinds, unchanged, over the canvas. */}
      <AskModal ask={state.ask} onAnswer={live ? onAnswer : null} art={art} />
    </>
  );
}

/**
 * **The eleven phases a turn gives priority in, in order** — the turn-order bar's
 * cells (the status layer, D210). Forge's `PhaseType` has thirteen; `UNTAP` has
 * no priority and no stop preference, and `CLEANUP` gives none in the ordinary
 * turn, so the bar names them in its header when the game is in one instead of
 * lighting a cell (the board's strip keeps all thirteen rows).
 */
export const TURN_ORDER = [
  'UPKEEP',
  'DRAW',
  'MAIN1',
  'COMBAT_BEGIN',
  'COMBAT_DECLARE_ATTACKERS',
  'COMBAT_DECLARE_BLOCKERS',
  'COMBAT_FIRST_STRIKE_DAMAGE',
  'COMBAT_DAMAGE',
  'COMBAT_END',
  'MAIN2',
  'END_OF_TURN',
] as const;

/** A cell's short caption: the board's own label, shortened to fit a 60 px bar. */
const TURN_ORDER_SHORT: Readonly<Record<string, string>> = {
  UPKEEP: 'Upkeep',
  DRAW: 'Draw',
  MAIN1: 'Main 1',
  COMBAT_BEGIN: 'Begin',
  COMBAT_DECLARE_ATTACKERS: 'Attack',
  COMBAT_DECLARE_BLOCKERS: 'Block',
  COMBAT_FIRST_STRIKE_DAMAGE: '1st str.',
  COMBAT_DAMAGE: 'Damage',
  COMBAT_END: 'End cbt',
  MAIN2: 'Main 2',
  END_OF_TURN: 'End',
};

/**
 * **The turn-order bar** (the status layer, D210): the owner's RPG reading of
 * the phase strip — the eleven phases of a turn in order down the arena's left
 * edge, the active one lit in the colour of whoever's turn it is, and the seat's
 * stops marked on each: the left pip "stop here on MY turn", the right "on the
 * opponent's", filled when the engine stops.
 *
 * **A control that changes no behaviour.** It reads exactly the fields the
 * board's `PhaseStrip` reads — `state.phase`, `activePlayer` and, through the
 * one reader `phaseStopsOf`, `players[].phaseStops` — and a click sends the same
 * `act: setPhaseStop {phase, turn, stop}` the board's dots send; the next `state`
 * says what happened. It keeps no stop of its own (D31, D37): a stream with no
 * stops (a replay of an older recording, or two AIs) draws no pips at all, and
 * `onSetPhaseStop` is `null` in a replay, while a question is open and after the
 * game, which leaves the pips drawn and inert.
 */
function TurnOrderBar({
  board,
  you,
  onSetPhaseStop,
}: {
  board: GameStateBody | null;
  you: number | null;
  onSetPhaseStop: ((phase: string, turn: 'own' | 'opp', stop: boolean) => void) | null;
}): JSX.Element | null {
  if (board === null) return null;
  const phase = board.phase;
  const yours = you !== null && board.activePlayer === you;
  const seat = board.players.find((p) => you !== null && p.id === you) ?? null;
  const stops = phaseStopsOf(seat);
  const inBar = phase !== null && (TURN_ORDER as readonly string[]).includes(phase);
  return (
    <nav className="arena__phases" aria-label="Turn order">
      <p className="arena__phases-head">
        <span className="arena__phases-round">R{board.round}</span>{' '}
        <span className={`arena__phases-whose arena__phases-whose--${yours ? 'you' : 'opp'}`}>
          {board.activePlayer === null ? 'pre-game' : yours ? 'your turn' : 'their turn'}
        </span>
        {phase !== null && !inBar && (
          <span className="arena__phases-off"> · {PHASE_STRIP_LABELS[phase] ?? phase}</span>
        )}
      </p>
      <ol className="arena__phases-list">
        {TURN_ORDER.map((name) => {
          const active = phase === name;
          const cls = [
            'arena__phase',
            COMBAT_PHASES.has(name) ? 'arena__phase--combat' : '',
            active ? `arena__phase--active arena__phase--active-${yours ? 'you' : 'opp'}` : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <li key={name} className={cls} data-phase={name} aria-current={active ? 'step' : undefined}>
              <span className="arena__phase-name" title={PHASE_STRIP_LABELS[name] ?? name}>
                {TURN_ORDER_SHORT[name] ?? name}
              </span>
              {stops !== null && (
                <span className="arena__phase-stops">
                  {(['own', 'opp'] as const).map((turn) => {
                    const on = (turn === 'own' ? stops.own : stops.opp).includes(name);
                    const whose = turn === 'own' ? 'your' : 'the opponent’s';
                    return (
                      <button
                        key={turn}
                        type="button"
                        className={`arena__stop arena__stop--${turn}${on ? ' arena__stop--on' : ''}`}
                        disabled={onSetPhaseStop === null}
                        data-act="setPhaseStop"
                        data-phase={name}
                        data-turn={turn}
                        data-stop={on ? 'on' : 'off'}
                        aria-pressed={on}
                        aria-label={`${on ? 'stop' : 'pass through'} at ${name} on ${whose} turn`}
                        title={`act: setPhaseStop {phase: ${name}, turn: ${turn}, stop: ${String(!on)}} — ${
                          on ? 'the engine stops here' : 'the engine passes through'
                        } on ${whose} turn`}
                        onClick={() => onSetPhaseStop?.(name, turn, !on)}
                      >
                        {on ? '●' : '○'}
                      </button>
                    );
                  })}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * **What is being watched** (spectating, amendment M47, D118): the two decks
 * and their Forge profiles, and — while `./scripts/spectate.sh` is still
 * recording — the word "following".
 *
 * Shown in the decision strip's place when every seat is an AI (`matchupOf`'s
 * `aiOnly`): an AI-vs-AI stream carries no `input` at all (§8.4), so the strip
 * would otherwise say "the engine has not asked for anything yet" for the whole
 * game. Every word comes from the handshake through `matchupOf`, which is
 * `seatMatchOf` per seat — the one reader of `hello_ok.match` — so the line can
 * print a deck NAME and a profile word and nothing else: never a card, never a
 * list, never a path (D105). The viewing seat is first and marked, because the
 * other seat's hand is hidden exactly as it would be at the table; this is that
 * seat's view of the game, not an omniscient one.
 *
 * The follow word after the matchup is `Arena.tsx`'s `follow`: the live dot
 * only while the log is being written (`following`, `stalled`), and none once
 * it ended or was LOST — a 416, the file re-recorded under the same name, after
 * which the follower polls no more (polish-1's follow-up 2).
 */
function WatchLine({ matchup, follow }: { matchup: Matchup; follow: 'following' | 'stalled' | 'finished' | 'lost' | null }): JSX.Element {
  return (
    <p className="arena__watch" role="status">
      <span className="arena__watch-label">watching</span>{' '}
      {matchup.seats.map((seat, i) => (
        <span key={seat.id}>
          {i > 0 && <span className="arena__watch-vs"> vs </span>}
          <span className="arena__watch-seat" title={seat.you ? 'the seat this recording sees from — its hand is shown, the other is hidden' : 'the other seat — its hand is hidden, as at the table'}>
            <strong>{seat.match?.deck ?? seat.name}</strong>
            {seat.match !== null && seat.match.aiProfile !== null && (
              <span className="muted"> ({seat.match.aiProfile})</span>
            )}
            {seat.you && <span className="muted"> · seen from here</span>}
          </span>
        </span>
      ))}
      {follow !== null && (
        <span className={`arena__watch-follow arena__watch-follow--${follow}`}>
          {' · '}
          {follow === 'following'
            ? '● following'
            : follow === 'stalled'
              ? '● following — no new frame yet'
              : follow === 'lost'
                ? 'recording lost — re-recorded under the same name; following stopped'
                : 'recording finished'}
        </span>
      )}
    </p>
  );
}

/**
 * **The life totals** (verification fix; report 09 §12.1's free option).
 *
 * The arena shipped with no persistent player HUD of any kind. The layer held
 * the prompt, the two engine buttons, Concede, the cue strip and the art credit
 * — and not one number about either seat. The `life.tick` and `damage.player`
 * cues put a plate in the 3D scene, but a cue *decays to identity* by
 * construction (§5.1), so the number existed for 400 ms when it changed and was
 * then gone: sitting on 11 life, the arena could not tell you so, and `V` to the
 * 2D board could, instantly. You cannot play Magic without the life totals.
 *
 * It is **plain DOM in the sibling layer**, which §12.1 prices at *free* and
 * §9.3's second risk argues for directly (troika re-tessellates an SDF string
 * every time it changes, and a life total changes often). The 3D alternative
 * exists — `playerAnchorFor(seat)` is already in `layout.ts` and
 * `numberSprite.ts` already draws cached canvas text — but a DOM strip costs
 * nothing, cannot be covered by a cue, and cannot be swung off-screen by the
 * camera.
 *
 * **Every number is the board's own component or the board's own formatting**
 * (`<ZoneCount>` from `PlayerRail`, `<ManaPoolPips>` from `Mana`,
 * `counterLabel` from `labels.ts`), so the two renderers cannot disagree about
 * what this frame says. Nothing here is a control: the plates read `state` and
 * send nothing, and the one reason they take pointer events at all is their
 * `title` tooltips.
 *
 * **What each seat is playing** (match setup, amendment M44) comes from
 * `seatMatchOf(state.hello, player.id)` — the one reader of `hello_ok.match`,
 * the same call the board's rail makes — and from nothing else: a deck NAME
 * (the AI's list is never on the wire, D105) and, on the AI's seat, Forge's
 * profile word. It is rendered, never compared; a stream without `match` (every
 * recording made before 2026-09-27) draws nothing.
 *
 * **Four rows, each ONE line, so a plate's height is fixed** (the 2026-09-27
 * hardening pass, rebased onto match setup). The opponent's plate sits under the
 * arena's top band, and `camera.ts`'s `PLAYER_PLATES` models it as a keep-out
 * over the opponent's duelist: a plate that grows is a plate that hides more of
 * it. So the name is one line and ellipsised (the whole name in its `title` —
 * `--ai-name` can be anything), the opponent's name row never wraps, and the
 * match (deck name, then the AI's profile) and any player counters ride the
 * life row rather than adding rows of their own. `camera.test.ts` holds the
 * stylesheet to that and asserts the plate ends inside `HUD_TOP_PX`;
 * `arena-hud.test.tsx` holds the markup to four rows.
 */
function SeatPlates({ state }: { state: ClientState }): JSX.Element | null {
  const board = state.board;
  if (board === null) return null;
  const you = viewerIdOf(state);
  // Opponents first: the plate order is the table order, top of the screen down.
  const seats = [...board.players].sort((a, b) => {
    const mine = (p: PlayerState): number => (you !== null && p.id === you ? 1 : 0);
    return mine(a) - mine(b) || a.id - b.id;
  });

  return (
    <div className="arena__seats" role="group" aria-label="Players">
      {seats.map((player) => (
        <SeatPlate
          key={player.id}
          player={player}
          isYou={you !== null && player.id === you}
          active={board.activePlayer === player.id}
          priority={board.priority === player.id}
          match={seatMatchOf(state.hello, player.id)}
        />
      ))}
    </div>
  );
}

function SeatPlate({
  player,
  isYou,
  active,
  priority,
  match,
}: {
  player: PlayerState;
  isYou: boolean;
  active: boolean;
  priority: boolean;
  /** M44 — `seatMatchOf(state.hello, player.id)`; `null` draws nothing. */
  match: SeatMatch | null;
}): JSX.Element {
  // §3.1 / §10.2 — poison has its own key and is shown beside life; the map is
  // everything else, printed with Forge's own counter names. Exactly as the
  // rail does it, because it is the rail's own helper.
  const counters = Object.entries(player.counters).filter(([name]) => name !== 'POISON');

  return (
    <div
      className={
        `arena__seat arena__seat--${isYou ? 'you' : 'opp'}` +
        `${active ? ' arena__seat--active' : ''}`
      }
      aria-label={`${player.name} — ${isYou ? 'you' : 'opponent'}`}
    >
      {/* One line: the name is ellipsised (whole in its `title`), and on the
          opponent's plate the tags never wrap under it (styles.css). */}
      <span className="arena__seat-who">
        <span className="arena__seat-name" title={player.name}>
          {player.name}
        </span>
        <span className="arena__seat-tags">
          {player.isAi ? 'AI' : 'human'}
          {isYou && ' · you'}
          {active && ' · active'}
          {priority && ' · priority'}
        </span>
      </span>

      <span className="arena__seat-vitals">
        <span className="life" title="life">
          <span className="life__glyph" aria-hidden="true">
            ♥
          </span>
          <span className="life__n">{player.life}</span>
          <span className="sr-only">life</span>
        </span>

        {/* **Poison only when it is not zero.** A permanent `☠ 0` on a plate
            this small is noise; the moment it moves it is the most important
            number on the table (§3.1 — poison is its own key on the wire, never
            a `counters` entry). */}
        {player.poison > 0 && (
          <span className="poison poison--on" title="poison counters">
            <span aria-hidden="true">☠</span> {player.poison}
            <span className="sr-only">poison</span>
          </span>
        )}

        {/* Player counters beside life and poison, on this row: a row of their
            own would grow the plate (see the component's note). */}
        {counters.length > 0 && (
          <span className="arena__seat-counters">
            {counters.map(([name, n]) => (
              <span key={name} className={`ctr ${counterLabel(name).cls}`}>
                <span className="ctr__n">{n}</span>
                <span className="ctr__t">{counterLabel(name).text}</span>
              </span>
            ))}
          </span>
        )}

        {/* M44 — the deck by NAME, ellipsised to what is left of the row (the
            whole name in the tooltip), then the AI's profile, which gives way
            only once the deck has. On this row, not one of its own: the plate
            sits beside the opponent's duelist (D100) and under the top band,
            and may not grow. */}
        {match !== null && match.deck !== null && (
          <span className="arena__seat-deck" title={`deck: ${match.deck} (hello_ok.match)`}>
            {match.deck}
          </span>
        )}
        {match !== null && match.aiProfile !== null && (
          <span className="arena__seat-profile" title="Forge AI profile (hello_ok.match)">
            {`AI (${match.aiProfile})`}
          </span>
        )}
      </span>

      <span className="arena__seat-zones">
        <ZoneCount glyph="✋" label="hand" n={player.zones.hand.count} />
        <ZoneCount glyph="▤" label="library" n={player.zones.library.count} />
        <ZoneCount glyph="⚰" label="graveyard" n={player.zones.graveyard.count} />
        {player.zones.exile.count > 0 && (
          <ZoneCount glyph="◇" label="exile" n={player.zones.exile.count} />
        )}
        {player.zones.command.count > 0 && (
          <ZoneCount glyph="⌘" label="command" n={player.zones.command.count} />
        )}
      </span>

      {/* Read-only: `onSpend` is the board's `useMana` control and the arena
          draws no mana pips (`Arena.tsx` keeps `poolColors` empty for exactly
          that reason). This is the pool as information. */}
      <ManaPoolPips pool={player.manaPool} />
    </div>
  );
}

/**
 * One engine button. **The label is the engine's** and is rendered verbatim;
 * `enabled` is the engine's and is the only thing that disables it.
 *
 * `focused` is `input.buttons.focus` (§4, M6/D45) — which button SPACE presses —
 * and it is shown rather than assumed, because "Space = OK" was never true.
 */
function ArenaButton({
  button,
  hint,
  focused,
  onClick,
}: {
  button: InputButton;
  hint: string;
  focused: boolean;
  onClick: (() => void) | null;
}): JSX.Element {
  return (
    <button
      type="button"
      className={`btn btn--small${focused ? ' btn--focused' : ''}`}
      disabled={onClick === null || !button.enabled}
      onClick={onClick ?? undefined}
      title={`the engine's own label: "${button.label}"`}
    >
      {button.label} <span className="btn__key">{hint}</span>
    </button>
  );
}

/**
 * One entry of the camera switcher: a view or the director, and whether this
 * mode allows it. Plain data from `Arena.tsx`, so this file needs nothing from
 * `camera.ts` and nothing at all from the cue engine or the scene.
 */
export interface ViewSwitcherItem {
  id: string;
  key: string;
  label: string;
  what: string;
  available: boolean;
}

/**
 * **T8 — the camera switcher**: the five views, the director and the
 * spectator toggle, with the one on screen marked.
 *
 * Three rules, each one a defect this layer has already had:
 *
 *  1. **It opts back into pointer events** (`.arena__views` in `styles.css`,
 *     and a row in `liveness.test.ts`'s table) — the layer is `none`.
 *  2. **It never takes keyboard focus from a click.** A mouse-focused button
 *     keeps SPACE for itself (`planKey`), so a switcher button that kept focus
 *     would turn the next SPACE — the player's "pass" — into "choose this
 *     camera again". `preventDefault` on `mousedown` stops the focus and not
 *     the click; Tab still reaches every button.
 *  3. **A greyed view is still clickable**, and says why: `aria-disabled`, not
 *     `disabled`, because a disabled button swallows the click and shows no
 *     tooltip, and "why can't I pick this?" deserves an answer (the arena's
 *     hint line gives it — spectator only, §8 rule 6).
 *
 * It shares one row with the cue strip (`.arena__strips`), and below 1900 px of
 * width (1400 until the caption's checkbox widened the cue strip, D256; 1800
 * until the sound checkbox joined it too) each
 * button collapses to its key — the label is a separate span that
 * `styles.css` hides, and the full name stays in the tooltip and the accessible
 * name. Both answer the slice-2 verification pass: as a row of its own the
 * switcher was a fourth row of chrome in the top-left column, over the
 * opponent's bust (Tier 2 follow-up 10, which is otherwise unchanged).
 */
export function ViewSwitcher({
  items,
  active,
  shot,
  spectator,
  spectatorAllowed,
  onChoose,
  onToggleSpectator,
}: {
  items: readonly ViewSwitcherItem[];
  /** The view actually on screen — the choice, or the table when it is not allowed here. */
  active: string;
  /** The auto director's current shot, while the director is on. */
  shot: string | null;
  spectator: boolean;
  spectatorAllowed: boolean;
  onChoose: (id: string) => void;
  onToggleSpectator: () => void;
}): JSX.Element {
  return (
    <div className="arena__views" role="group" aria-label="Camera">
      <span className="arena__views-title">camera</span>
      {items.map((item) => {
        const on = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            className={`arena__view${on ? ' arena__view--on' : ''}${item.available ? '' : ' arena__view--off'}`}
            aria-pressed={on}
            aria-disabled={!item.available}
            aria-label={`${item.label} (${item.key})`}
            data-view={item.id}
            title={
              item.available
                ? `${item.key} — ${item.what}`
                : `${item.key} — ${item.what}. Spectator only: from here your own hand is not on screen`
            }
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => {
              onChoose(item.id);
            }}
          >
            <span className="btn__key">{item.key}</span>
            <span className="arena__view-label"> {item.label}</span>
            {on && shot !== null && <span className="arena__view-shot"> · {shot}</span>}
          </button>
        );
      })}
      <button
        type="button"
        className={`arena__view arena__view--spectator${spectator ? ' arena__view--on' : ''}${spectatorAllowed ? '' : ' arena__view--off'}`}
        aria-pressed={spectator}
        aria-disabled={!spectatorAllowed}
        aria-label="Spectator mode (O)"
        data-view="spectator"
        title={
          spectatorAllowed
            ? 'O — spectator mode: a wider orbit, slower camera moves, every view and the director'
            : 'O — spectator mode is for replays and finished games, never while your seat is live'
        }
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onClick={onToggleSpectator}
      >
        <span className="btn__key">O</span>
        <span className="arena__view-label"> spectator</span>
        {spectator ? ' ✓' : ''}
      </button>
    </div>
  );
}
