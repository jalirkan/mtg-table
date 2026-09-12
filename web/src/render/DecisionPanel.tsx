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
 * The stall warning is {@link wedgeSuspected} from `wedge.ts`, imported rather
 * than re-derived: it is a rule that has already been wrong once (amendment
 * M21), it has its own test, and the two qualifiers it grew — *this seat holds
 * priority* and *the stream has gone quiet* — are exactly the ones a re-derived
 * copy would lose.
 */

import { useEffect, useState } from 'react';

import type { ArtIndex } from '../art.ts';
import { isHidden, type AnyCard, type GameStateBody, type InputBody, type InputButton } from '../protocol.ts';
import type { ClientState } from '../reduce.ts';
import type { KeyActionId } from '../keys.ts';
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
              flashed={flash?.id === 'ok'}
              onClick={live ? actions.buttonOk : null}
            />
            <EngineButton
              button={input.buttons.cancel}
              act="buttonCancel"
              hint="ESC"
              flashed={flash?.id === 'cancel'}
              onClick={live ? actions.buttonCancel : null}
            />
            {/* Report 10 §7.2 / §2.2: `undo` is an engine feature that is not on
                the wire yet, and a hint that lies is worse than no hint. It
                renders disabled, naming the milestone that lights it up;
                pressing the key flashes it (§12.2 rule 4) rather than doing
                nothing.

                **M4's third button is gone.** It said "Auto Pay", and there is
                no such client feature: Forge's `InputPayMana` writes `Auto` on
                its own OK button (`InputPayMana.java:376-395`), which is two
                buttons to the left, rendered verbatim. M5 wired the rest of
                mana payment where it actually lives — the lands are clicks and
                the floating pool is the rail's pips (`act: useMana`). */}
            <button
              type="button"
              className={`btn btn--future${flash?.id === 'undo' ? ' btn--flash' : ''}`}
              disabled
              title="act: undo exists in docs/protocol.md §2.2 and is gated on IGameController.canUndoLastAction, which the wire does not carry yet (input.canUndo — M6)"
            >
              Undo <span className="btn__key">CTRL+Z</span>
            </button>
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
        <div className="decision__buttons">
          <ConcedeButton onConcede={actions.concede} gameOver={state.gameOver !== null} />
        </div>
      )}
    </section>
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
  flashed = false,
}: {
  button: InputButton;
  act: string;
  /** `null` → a replay: the label still shows, the button does nothing. */
  onClick: (() => void) | null;
  hint: string;
  /** Its key was pressed and the engine had it disabled (report 10 §12.2). */
  flashed?: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      className={`btn btn--engine${flashed ? ' btn--flash' : ''}`}
      disabled={!button.enabled || onClick === null}
      data-act={act}
      aria-label={button.label}
      title={`the engine's own label — sends act: ${act} · ${hint}`}
      onClick={() => {
        onClick?.();
      }}
    >
      {button.label} <span className="btn__key">{hint}</span>
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
