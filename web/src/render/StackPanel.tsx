/*
 * mtg-table — render/StackPanel.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The floating stack panel (report 10 §8), right of centre in the middle row.
 *
 *   - `board.stack` is ordered **bottom first**; the panel renders it reversed,
 *     so the item that resolves next is the top row and is tagged as such
 *     (docs/protocol.md §3.1).
 *   - **`stack[].id` is a `StackItemView` id and is a different id space from
 *     `Card.id`** — they collide, and `fixtures/games/g1.jsonl` has a hidden
 *     card #56 and a stack item #56 in the same frame (§10.1). The only correct
 *     way to reach the card is `sourceCardId`, resolved against `stackCards`
 *     first (a spell on the stack is in `ZoneType.Stack`, which is not one of the
 *     six zones a player carries).
 *   - **Target chips are text.** An arrow is decoration; a chip is information
 *     (§14 rule 4), and a target whose id does not resolve prints as an id,
 *     which is correct rather than a bug (§3.6 rule 1).
 *   - An empty stack collapses to a one-line strip rather than disappearing, so
 *     the panel's presence does not flicker on every priority pass.
 *
 * **M6 — auto-yield lives here** (report 11 §5), because this is the only place
 * it can: `StackItemView.getKey()` is the only key accessor in the view graph,
 * so an auto-yield can be offered for something **on the stack** and for nothing
 * else. Three rules:
 *
 *   - **The `yieldKey` is never rendered.** It is a bridge-minted handle
 *     (`"y7"`) standing in for a string that is literally a card name plus its
 *     id plus its rules text (§3, report 11 §5.2). It goes into the act and
 *     nowhere else — not into a label, not into a `title`, not into a `key`.
 *   - **The engine decides whether the control exists.** `isAbility` and a
 *     non-empty key are exactly the guards Forge's own Y/N shortcut checks
 *     (`KeyboardShortcuts.java:159-200`); `isOptionalTrigger` is what turns
 *     "stop asking" into "always yes / always no". None of that is inferred
 *     from the text.
 *   - **A yielded item says so**, from `stack[].yielded`, and the same button
 *     clears it (`mode: "clear"`). The client keeps no yield state of its own.
 */

import type { ArtIndex } from '../art.ts';
import { stackYield, type GameStateBody, type InputBody, type SetYieldMode, type StackItem } from '../protocol.ts';
import { CardTile, type Clicks } from './CardTile.tsx';
import { stackTextLabel } from './describe.ts';
import { stackKey, useRects } from './rects.ts';
import { cardLabel, findCard, playerName } from './resolve.ts';

export type SetYield = (yieldKey: string, mode: SetYieldMode) => void;

export function StackPanel({
  board,
  input,
  art,
  clicks,
  you,
  open = true,
  onToggle,
  onSetYield = null,
}: {
  board: GameStateBody;
  input: InputBody | null;
  art: ArtIndex;
  clicks: Clicks | null;
  /** The viewer's seat, for the thumbnail's controller stripe (§4.5). */
  you: number | null;
  /** `S` — Forge's own `SHORTCUT_SHOWSTACK`. Collapsed, the arrows fall back to
   *  the source card's own tile rather than disappearing. */
  open?: boolean;
  onToggle?: () => void;
  /** M6 — `act: setYield`. `null` in a replay: the badges still render, inert. */
  onSetYield?: SetYield | null;
}): JSX.Element {
  const rects = useRects();
  const items = [...board.stack].reverse();
  return (
    <section className={`stackpanel${open ? '' : ' stackpanel--shut'}`} aria-label="The stack">
      <h2 className="stackpanel__head">
        <button
          type="button"
          className="stackpanel__toggle"
          aria-expanded={open}
          title="S — show or hide the stack panel (Forge's SHORTCUT_SHOWSTACK)"
          onClick={onToggle}
          disabled={onToggle === undefined}
        >
          The stack <span className="muted">({board.stack.length})</span>{' '}
          <span className="btn__key">S</span>
        </button>
      </h2>
      {!open ? null : items.length === 0 ? (
        <p className="stackpanel__empty muted">stack empty</p>
      ) : (
        <ol className="stackpanel__list">
          {items.map((item, i) => {
            const source = item.sourceCardId === null ? undefined : findCard(board, item.sourceCardId);
            return (
              <li
                key={item.id}
                className={`stackitem${i === 0 ? ' stackitem--next' : ''}`}
                // §9.1 — the arrow's tail. `s:` and not `c:`: a `StackItemView`
                // id and a `Card.id` collide (g1.jsonl has both as #56).
                ref={rects.register(stackKey(item.id))}
              >
                <span className="stackitem__thumb">
                  {source !== undefined && (
                    <ul className="row row--stack" style={{ '--slots': '1' } as React.CSSProperties}>
                      <CardTile
                        card={source}
                        kind="stack"
                        input={input}
                        art={art}
                        clicks={clicks}
                        mine={you !== null && item.controller === you}
                        zoom="down"
                        // The card's own tile on the battlefield owns `c:<id>`;
                        // this is the second copy of the same card.
                        anchor={false}
                      />
                    </ul>
                  )}
                </span>
                <span className="stackitem__body">
                  <span className="stackitem__text">{stackTextLabel(item.text)}</span>
                  <span className="stackitem__meta muted">
                    stack #{item.id} · {playerName(board, item.controller)}
                    {i === 0 && ' · resolves next'}
                  </span>
                  {(item.targetCardIds.length > 0 || item.targetPlayerIds.length > 0) && (
                    <span className="stackitem__targets">
                      {[
                        ...item.targetCardIds.map((id) => cardLabel(board, id)),
                        ...item.targetPlayerIds.map((id) => playerName(board, id)),
                      ].map((label) => (
                        <span key={label} className="chip chip--target">
                          {label}
                        </span>
                      ))}
                    </span>
                  )}
                  <YieldControls item={item} top={i === 0} onSetYield={onSetYield} />
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/**
 * **M6** — always-yes / always-no for one stack item (report 11 §5).
 *
 * What each button sends, and what the engine does with it:
 *
 * - `setYield {yieldKey, mode:"yes"}` → `setTriggerDecision(key, ACCEPT, scope)`
 *   followed by `setShouldAutoYield(key, true, scope)`. The scope is the
 *   controller's own `isAbilityScope()`, which the *bridge* reads — a client
 *   that hardcoded it would be guessing at `FPref.UI_AUTO_DECISION_MODE`.
 * - `"no"` is the same pair with `DECLINE`.
 * - `"clear"` puts the question back.
 *
 * The trigger decision half only means anything for an **optional** trigger of
 * this seat's own, which is why the labels differ: for a plain ability the pair
 * reads *auto / asking*, and for an optional trigger *always yes / always no*.
 * Both are the engine's distinction (`StackItemView.isOptionalTrigger()`), not a
 * reading of the text.
 *
 * The keyboard's `Y` / `N` act on the **top** item only, which is what Forge's
 * own shortcut does (`getGameView().peekStack()`), so the top row says so.
 */
function YieldControls({
  item,
  top,
  onSetYield,
}: {
  item: StackItem;
  top: boolean;
  onSetYield: SetYield | null;
}): JSX.Element | null {
  const info = stackYield(item);
  // The engine did not offer one: no ability, or no key. Nothing to draw, and
  // nothing to explain — a disabled control for a thing that cannot exist is
  // noise on every spell on the stack.
  if (!info.offered || info.yieldKey === null) return null;
  const key = info.yieldKey;
  const live = onSetYield !== null;
  const yesLabel = info.optionalTrigger ? 'Always yes' : 'Auto-yield';
  const noLabel = info.optionalTrigger ? 'Always no' : 'Never';
  const press = (mode: SetYieldMode) => () => {
    onSetYield?.(key, mode);
  };
  return (
    <span className="stackitem__yield" data-yielded={info.mode ?? 'ask'}>
      <button
        type="button"
        className={`btn btn--tiny${info.mode === 'yes' ? ' btn--on' : ''}`}
        disabled={!live}
        data-act="setYield"
        data-mode={info.mode === 'yes' ? 'clear' : 'yes'}
        aria-pressed={info.mode === 'yes'}
        title={
          info.mode === 'yes'
            ? 'act: setYield {mode:"clear"} — go back to being asked about this ability'
            : `act: setYield {mode:"yes"} — ${info.optionalTrigger ? 'accept this trigger and every later one from the same ability' : 'let this ability resolve without stopping for priority'} (setShouldAutoYield${info.optionalTrigger ? ' + setTriggerDecision ACCEPT' : ''})`
        }
        onClick={press(info.mode === 'yes' ? 'clear' : 'yes')}
      >
        {yesLabel}
        {top && <span className="btn__key">Y</span>}
      </button>
      <button
        type="button"
        className={`btn btn--tiny${info.mode === 'no' ? ' btn--on' : ''}`}
        disabled={!live}
        data-act="setYield"
        data-mode={info.mode === 'no' ? 'clear' : 'no'}
        aria-pressed={info.mode === 'no'}
        title={
          info.mode === 'no'
            ? 'act: setYield {mode:"clear"} — go back to being asked about this ability'
            : `act: setYield {mode:"no"} — ${info.optionalTrigger ? 'decline this trigger and every later one from the same ability' : 'stop offering it'} (setShouldAutoYield${info.optionalTrigger ? ' + setTriggerDecision DECLINE' : ''})`
        }
        onClick={press(info.mode === 'no' ? 'clear' : 'no')}
      >
        {noLabel}
        {top && <span className="btn__key">N</span>}
      </button>
      {info.mode !== null && (
        <span className="chip chip--yielded" title="stack[].yielded — the engine's own answer">
          {info.mode === 'yes' ? 'always yes' : 'always no'}
        </span>
      )}
    </span>
  );
}
