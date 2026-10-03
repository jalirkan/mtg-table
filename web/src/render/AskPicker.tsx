/*
 * mtg-table — render/AskPicker.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **M5: the decision panel's half of a board-shaped ask.**
 *
 * When {@link boardPick} says an `ask` can be answered on the table, the tiles
 * become the control (`CardTile` + `picker.ts`) and this is everything else the
 * question needs: the kind and the id, the engine's prompt verbatim, the running
 * count against the engine's `min`/`max`, the candidate list, and the two
 * buttons that send the answer.
 *
 * Why the candidate list is here at all, when the cards are outlined on the
 * board: **the engine's own option labels must reach the screen** (§5.1, report
 * 07 §7). A concealed card's option arrives labelled `"???"` because
 * `String.valueOf(CardView)` prints the real name, so the label is not
 * reconstructible from the card — it is a thing the bridge decided and the
 * client prints. A picker that drew only outlines would silently drop it, and
 * `web/test/render.test.tsx` asserts every label of every ask in the corpus
 * reaches the markup for exactly that reason.
 *
 * The list is also the keyboard's way in, and the answer for a candidate whose
 * tile has scrolled behind a panel.
 *
 * **It marshals nothing.** `answerFromDraft` / `defaultDraft` are the modal's
 * own functions (§5.2, §5.4): one marshaller, two surfaces.
 */

import type { ArtIndex } from '../art.ts';
import type { AnswerValue, AskBody, GameStateBody } from '../protocol.ts';
import {
  answerFromDraft,
  askPrompt,
  defaultAnswer,
  defaultDraft,
  nullIsLegal,
  type AskDraft,
} from './AskModal.tsx';
import { CardTile } from './CardTile.tsx';
import type { BoardPick, PickCandidate } from './picker.ts';
import { findCard } from './resolve.ts';

export interface AskPickerProps {
  ask: AskBody;
  pick: BoardPick;
  draft: AskDraft;
  board: GameStateBody;
  art: ArtIndex;
  /** A seat, not a replay. Read-only renders the same rows, inert. */
  live: boolean;
  onDraft: (draft: AskDraft) => void;
  onAnswer: (value: AnswerValue) => void;
  /** Toggle one candidate — the same function a tile click goes through. */
  onPick: (optionId: number) => void;
  onAmount: (optionId: number, n: number) => void;
}

function chosenIndices(draft: AskDraft): number[] {
  if (draft.shape === 'indices') return draft.indices;
  if (draft.shape === 'index') return draft.index < 0 ? [] : [draft.index];
  return [];
}

function amountOf(draft: AskDraft, optionId: number): number {
  return draft.shape === 'amounts' ? (draft.amounts[String(optionId)] ?? 0) : 0;
}

export function AskPicker({
  ask,
  pick,
  draft,
  board,
  art,
  live,
  onDraft,
  onAnswer,
  onPick,
  onAmount,
}: AskPickerProps): JSX.Element {
  const chosen = chosenIndices(draft);
  const assigned =
    draft.shape === 'amounts' ? Object.values(draft.amounts).reduce((a, b) => a + b, 0) : 0;

  return (
    <section className="askpick" data-ask-picker={ask.askId} aria-label={`The engine is asking: ${ask.kind}`}>
      <div className="askpick__head">
        <span className="k">{ask.kind}</span>{' '}
        <span className="muted">
          {ask.askId} · timeout {ask.timeoutMs} ms
        </span>
        {/* Amendment M14 — "waiting", not "blocked": an `ability_menu` is asked
            with no game thread parked on it and the client cannot tell. */}
        <span className="askpick__blocked">the engine is waiting for this</span>
      </div>

      {/* The engine's own words. Never rewritten. */}
      <p className="prompt" role="status">
        {askPrompt(ask)}
      </p>

      <p className="askpick__count">
        {pick.shape === 'damage' ? (
          <>
            assigned <strong>{assigned}</strong> of {pick.total}
            {assigned === pick.total ? ' ✓' : ' — the engine wants the total exactly'}
          </>
        ) : (
          <>
            chosen <strong>{chosen.length}</strong> of {pick.min}
            {pick.max > pick.min ? `–${String(pick.max)}` : ''} ·{' '}
            <span className="muted">click the outlined cards on the board</span>
          </>
        )}
      </p>

      <ul className="askpick__list">
        {pick.candidates.map((candidate) => (
          <li
            key={candidate.optionId}
            className={`askpick__row${chosen.includes(candidate.optionId) ? ' askpick__row--on' : ''}`}
          >
            <Candidate
              candidate={candidate}
              ask={ask}
              board={board}
              art={art}
              shape={pick.shape}
              chosen={chosen.includes(candidate.optionId)}
              amount={amountOf(draft, candidate.optionId)}
              live={live}
              onPick={onPick}
              onAmount={onAmount}
            />
          </li>
        ))}
      </ul>

      <div className="askpick__actions">
        <button
          type="button"
          className="btn btn--primary"
          disabled={!live}
          data-act="answer"
          title="send this answer — option indices, never Forge ids (§5.1)"
          onClick={() => {
            onAnswer(answerFromDraft(ask, draft));
          }}
        >
          Answer
        </button>
        <button
          type="button"
          className="btn"
          disabled={!live}
          data-act="answer"
          title="the kind's documented default (§5.4) — always legal, always one click away"
          onClick={() => {
            onAnswer(defaultAnswer(ask));
          }}
        >
          Default
        </button>
        {nullIsLegal(ask) && (
          <button
            type="button"
            className="btn"
            disabled={!live}
            data-act="answer"
            title="answer null — the bridge substitutes Forge's documented default (§5.4) · ESC"
            onClick={() => {
              onAnswer(null);
            }}
          >
            Cancel (null) <span className="btn__key">ESC</span>
          </button>
        )}
        <button
          type="button"
          className="btn"
          disabled={!live}
          onClick={() => {
            onDraft(defaultDraft(ask));
          }}
        >
          Reset
        </button>
      </div>

      {!live && (
        <p className="hint">
          Read-only: no transport is attached (this is a replay). The same picker renders, and every
          control is inert.
        </p>
      )}
    </section>
  );
}

/**
 * One candidate row: the engine's label, the ask-local index, and — for a card
 * this frame is drawing — a thumbnail through the one card renderer.
 *
 * The thumbnail is looked up in **this** frame (`resolve.findCard`, P5) and is
 * `anchor={false}`: the board's own tile is where the card is.
 */
function Candidate({
  candidate,
  ask,
  board,
  art,
  shape,
  chosen,
  amount,
  live,
  onPick,
  onAmount,
}: {
  candidate: PickCandidate;
  ask: AskBody;
  board: GameStateBody;
  art: ArtIndex;
  shape: BoardPick['shape'];
  chosen: boolean;
  amount: number;
  live: boolean;
  onPick: (optionId: number) => void;
  onAmount: (optionId: number, n: number) => void;
}): JSX.Element {
  const card = candidate.cardId === null ? undefined : findCard(board, candidate.cardId);
  const thumb =
    card === undefined ? null : (
      <ul className="row row--strip askpick__thumb" style={{ '--slots': '1' } as React.CSSProperties}>
        <CardTile card={card} kind="strip" input={null} art={art} clicks={null} zoom="down" anchor={false} />
      </ul>
    );

  const detail = [
    candidate.defender ? 'the defender (option 0, §5.3)' : '',
    candidate.lethal === null ? '' : `lethal ${String(candidate.lethal)}`,
    candidate.playerId === null ? '' : `player ${String(candidate.playerId)}`,
    candidate.cardId === null ? '' : `card #${String(candidate.cardId)}`,
  ]
    .filter((bit) => bit !== '')
    .join(' · ');

  if (shape === 'damage') {
    return (
      <>
        <span className="ask-modal__index">[{candidate.optionId}]</span>
        {thumb}
        {/* Verbatim. Always. */}
        <span className="ask-modal__label">{candidate.label}</span>
        <span className="muted"> — {detail}</span>
        <input
          className="ask-modal__amount"
          type="number"
          min={0}
          max={ask.kind === 'assign_damage' ? ask.total : undefined}
          value={amount}
          disabled={!live}
          aria-label={`amount for option ${String(candidate.optionId)}`}
          onChange={(event) => {
            const n = Number.parseInt(event.target.value, 10);
            onAmount(candidate.optionId, Number.isFinite(n) && n > 0 ? n : 0);
          }}
        />
      </>
    );
  }

  return (
    <>
      {/* Outside the button: a `<ul>` inside one is not phrasing content, and
          the tile is a list item by construction. */}
      {thumb}
      <button
        type="button"
        className="ask-modal__pick"
        disabled={!live}
        aria-pressed={chosen}
        aria-label={`option ${String(candidate.optionId)}: ${candidate.label}`}
        onClick={() => {
          onPick(candidate.optionId);
        }}
      >
        <span className="ask-modal__tick">{chosen ? '☑' : '☐'}</span>{' '}
        <span className="ask-modal__index">[{candidate.optionId}]</span>{' '}
        {/* Verbatim. Always. */}
        <span className="ask-modal__label">{candidate.label}</span>
        {detail !== '' && <span className="muted"> — {detail}</span>}
      </button>
    </>
  );
}
