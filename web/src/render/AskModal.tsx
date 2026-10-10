/*
 * mtg-table — render/AskModal.tsx
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * §5 — the outstanding blocking question, and (M3) the form that answers it.
 *
 * **An `ask` parks the Forge game thread** until an `answer` arrives: it is the
 * only frame the server waits on, and while one is outstanding the game is doing
 * nothing at all. So it is drawn at the top of the board rather than in a column
 * beside the log, and while it is up the board's own clicks are inert (the board
 * enforces that, not this file) — a click that is not the answer is a click the
 * engine is not listening for.
 *
 * Three rules this file exists to keep:
 *
 * 1. **Answers address options by ask-local index** (§5.1). The bridge holds the
 *    `askId → Object[]` map; the client only ever echoes `option.id`, and never
 *    a Forge card id. A single ask's options can be colours, abilities, integers
 *    and cards at once, where `Integer 3` and `CardView 3` would collide.
 * 2. **Labels are the engine's and are printed verbatim** (§5.1, report 07 §7).
 *    An option whose card is concealed arrives labelled `"???"` because
 *    `String.valueOf(CardView)` prints the real name; a client that rebuilt the
 *    label from `option.card` would re-open exactly that hole.
 * 3. **Every ask can be answered with the kind's default, in one click**
 *    (§5.4). `defaultDraft` / `answerFromDraft` are pure and exported, the
 *    "Default" button sends `defaultAnswer(ask)`, and `web/test/ask-modal.test.tsx`
 *    drives all eleven kinds through the same two functions the button uses.
 *    Three kinds — `order`, `choose_list`, `manipulate_list` — have **no usable
 *    `null`**: their Forge call sites dereference the result, so this file never
 *    offers "cancel" for them and synthesises the documented default instead
 *    (§5.3, §5.4; the same default `AutoTransport.answerFor` computes).
 *
 * Read-only mode (no `onAnswer`) is what a replay gets: the same rows, the same
 * verbatim labels, every control disabled. M1's board rendered questions and
 * could not answer them; that is now a property of the transport, not of the
 * component.
 */

import { useEffect, useRef, useState } from 'react';

import { EMPTY_ART_INDEX, type ArtIndex } from '../art.ts';
import {
  assignDamageRuleOf,
  isFaceDownHidden,
  isHidden,
  type AnswerValue,
  type AnyCard,
  type AskBody,
  type AskOption,
} from '../protocol.ts';
import { CardTile } from './CardTile.tsx';
import { toggleChoice } from './picker.ts';

// ---------------------------------------------------------------------------
// The draft — what the user has built so far, before they press Answer
// ---------------------------------------------------------------------------

/**
 * One draft shape per answer shape (§5.2), not one per kind: the eleven kinds
 * produce six answer shapes between them.
 */
export type AskDraft =
  /** `ability_menu`, `options` — one option index. */
  | { shape: 'index'; index: number }
  /** `confirm` — true / false. */
  | { shape: 'bool'; yes: boolean }
  /** `text` — a string. */
  | { shape: 'text'; text: string }
  /** `choose_list`, `choose_entities`, `sideboard`, `manipulate_list` — indices. */
  | { shape: 'indices'; indices: number[] }
  /** `order` — `{ordered, remember}`, addressing `dest ++ source`. */
  | { shape: 'order'; ordered: number[]; remember: boolean }
  /** `assign_damage`, `assign_amount` — index → amount. */
  | { shape: 'amounts'; amounts: Record<string, number> };

/** Every option of an ask, flattened in the order the answer indexes them (§5.1). */
export function askOptions(ask: AskBody): AskOption[] {
  switch (ask.kind) {
    case 'ability_menu':
    case 'options':
    case 'choose_list':
    case 'choose_entities':
      return ask.options;
    // §5.1: two lists, ONE server-side option array. `dest ++ source`, in that order.
    case 'order':
      return [...ask.dest, ...ask.source];
    case 'sideboard':
      return [...ask.main, ...ask.side];
    case 'assign_damage':
    case 'assign_amount':
      return ask.targets;
    case 'manipulate_list':
      return ask.cards;
    case 'confirm':
    case 'text':
      return [];
  }
}

/**
 * `order`'s default (§5.3, report 07 §6.7, and `AutoTransport.answerFor`): the
 * first `k` of `dest ++ source`, where `k` is `dest.length` clamped into the
 * window Forge's `remainingMin` / `remainingMax` leave open. They constrain how
 * many options may be **left in `source`**, and `-1` means unconstrained.
 */
function defaultOrdered(dest: number, source: number, min: number, max: number): number[] {
  const total = dest + source;
  let lo = max >= 0 ? total - max : 0;
  let hi = min >= 0 ? total - min : total;
  lo = Math.max(0, Math.min(lo, total));
  hi = Math.max(lo, Math.min(hi, total));
  const k = Math.max(lo, Math.min(dest, hi));
  return range(k);
}

function range(n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(i);
  return out;
}

/**
 * The kind's default draft — the one the "Default" button sends and the one the
 * form opens on.
 *
 * It mirrors `AutoTransport.answerFor` (the scripted seat's "minimal legal
 * value"), with one deliberate difference: `assign_amount` honours Forge's
 * `atLeastOne`, giving every target one and the remainder to the first, because
 * a human looking at the form would otherwise see an illegal split pre-filled.
 */
export function defaultDraft(ask: AskBody): AskDraft {
  switch (ask.kind) {
    case 'ability_menu':
      return { shape: 'index', index: ask.options.length > 0 ? 0 : -1 };
    case 'options': {
      const n = ask.options.length;
      const d = ask.defaultIndex;
      return { shape: 'index', index: n === 0 ? -1 : d >= 0 && d < n ? d : 0 };
    }
    case 'confirm':
      // §5.2: `defaultYes` is what a `null` answer means for this call, so it is
      // the honest pre-selection — the engine already told us its default.
      return { shape: 'bool', yes: ask.defaultYes };
    case 'text':
      return { shape: 'text', text: ask.initial };
    case 'choose_list': {
      // Report 07 A7: `reveal` means min/max were -1 — "show these, select
      // nothing" — and the answer is `[]`.
      if (ask.reveal) return { shape: 'indices', indices: [] };
      const want = Math.max(0, Math.min(ask.min, ask.options.length));
      const preselected = ask.preselected.filter((i) => i >= 0 && i < ask.options.length);
      const usable = preselected.length >= want && preselected.length <= Math.max(ask.max, want);
      return { shape: 'indices', indices: usable && preselected.length > 0 ? [...preselected] : range(want) };
    }
    case 'choose_entities': {
      const want = Math.max(0, Math.min(ask.min, ask.options.length));
      return { shape: 'indices', indices: range(want) };
    }
    case 'order':
      return {
        shape: 'order',
        ordered: defaultOrdered(ask.dest.length, ask.source.length, ask.min, ask.max),
        remember: false,
      };
    case 'manipulate_list':
      // §5.4: never null — `PlayerControllerHuman` indexes the result. The
      // documented default is the input list in its original order.
      return { shape: 'indices', indices: range(ask.cards.length) };
    case 'sideboard':
      return { shape: 'indices', indices: range(ask.main.length) };
    case 'assign_damage': {
      // §5.3: index 0 is the DEFENDER and a blocker follows whenever there is
      // one. All of it on the first blocker; piling it on the defending player
      // while a creature is blocking is the one answer the rules forbid.
      const n = ask.targets.length;
      if (n === 0) return { shape: 'amounts', amounts: {} };
      return { shape: 'amounts', amounts: { [String(n > 1 ? 1 : 0)]: ask.total } };
    }
    case 'assign_amount': {
      const n = ask.targets.length;
      if (n === 0) return { shape: 'amounts', amounts: {} };
      const amounts: Record<string, number> = {};
      if (ask.atLeastOne && n > 1 && ask.total >= n) {
        for (let i = 0; i < n; i++) amounts[String(i)] = 1;
        amounts['0'] = ask.total - (n - 1);
      } else {
        amounts['0'] = ask.total;
      }
      return { shape: 'amounts', amounts };
    }
  }
}

/**
 * The `answer.value` for a draft (§5.2). Total over the eleven kinds; a draft of
 * the wrong shape for its kind falls back to the kind's default rather than
 * inventing a value the bridge would have to guess at.
 */
export function answerFromDraft(ask: AskBody, draft: AskDraft): AnswerValue {
  switch (ask.kind) {
    case 'ability_menu':
    case 'options':
      if (draft.shape !== 'index') break;
      return draft.index < 0 ? null : draft.index;
    case 'confirm':
      if (draft.shape !== 'bool') break;
      return draft.yes;
    case 'text':
      if (draft.shape !== 'text') break;
      return draft.text;
    case 'choose_list':
    case 'choose_entities':
    case 'manipulate_list':
    case 'sideboard':
      if (draft.shape !== 'indices') break;
      return [...draft.indices];
    case 'order':
      if (draft.shape !== 'order') break;
      // §5.3: never null. `OrderResult` is `(List ordered, boolean remember)`.
      return { ordered: [...draft.ordered], remember: draft.remember };
    case 'assign_damage':
    case 'assign_amount': {
      if (draft.shape !== 'amounts') break;
      const out: Record<string, number> = {};
      for (const [key, value] of Object.entries(draft.amounts)) {
        if (value > 0) out[key] = value;
      }
      return out;
    }
  }
  return answerFromDraft(ask, defaultDraft(ask));
}

/**
 * The one-click answer — `answerFromDraft(ask, defaultDraft(ask))`, with **one
 * kind that is not its draft**.
 *
 * A `text` ask with `numeric: true` is `AbstractGuiGame.getInteger`'s "Other…"
 * branch, and §5.4 as amended by M25 says of it in as many words: *"`null` —
 * cancel — is the answer that terminates and `""` is not."* Its `initial` is
 * `""` whenever Forge has none (§5.2), so a button whose tooltip promises "the
 * kind's documented default, always legal" was sending the one string the
 * documented default explicitly is not. Verified in the browser, 2026-09-12
 * (`decks/number-probe.dck`, Volcano Hellion): pressing **Default** on the
 * resulting `text` ask produced `a3`, `a4`, `a5`, `a6` — the identical question
 * every time — because the engine's loop is `while (true)` and the body carries
 * neither `min` nor `max` for the client to check against.
 *
 * The draft is left alone: the form still opens on `initial`, because a form
 * pre-filled with "nothing" is what a numeric box should look like. It is the
 * one-click answer that must be the terminating one.
 */
export function defaultAnswer(ask: AskBody): AnswerValue {
  if (ask.kind === 'text' && ask.numeric) return null;
  return answerFromDraft(ask, defaultDraft(ask));
}

/**
 * Is this draft a legal thing to send for this ask?
 *
 * One kind only, and for the same reason as above: a `numeric` `text` ask whose
 * box is empty or not a number is the infinite re-ask. The client does **not**
 * range-check (it has no `[min,max]` — §5.3, and CLAUDE.md §Scope: no rules
 * logic in the client); it only refuses to send something that cannot possibly
 * be a number.
 */
export function draftIsSendable(ask: AskBody, draft: AskDraft): boolean {
  if (ask.kind !== 'text' || !ask.numeric) return true;
  if (draft.shape !== 'text') return true;
  return draft.text.trim() !== '' && Number.isFinite(Number(draft.text));
}

/**
 * Re-exported from `picker.ts`, which is where it lives now that M5 gave it a
 * second caller (the board picker). **One function**: the modal and the tiles
 * cannot disagree about what a click does to a multi-select draft.
 */
export { toggleChoice };

/**
 * May this kind be answered with a literal `null`?
 *
 * §5.4 and §5.3: `order`, `choose_list` and `manipulate_list` have no usable
 * null default — `IGuiGame.java:229,232`, `AbstractGuiGame.java:767,780-781` and
 * `PlayerControllerHuman.java:986` all dereference the result — so the client
 * sends the synthesised default instead of a cancel the bridge would have to
 * repair.
 */
export function nullIsLegal(ask: AskBody): boolean {
  return ask.kind !== 'order' && ask.kind !== 'choose_list' && ask.kind !== 'manipulate_list';
}

/** How many the answer needs, as a sentence, or `''` when the kind has no count. */
function countHint(ask: AskBody, chosen: number): string {
  switch (ask.kind) {
    case 'choose_list':
      return ask.reveal
        ? 'reveal — acknowledge only, the answer is []'
        : `${String(chosen)} of ${String(ask.min)}–${String(ask.max)}`;
    case 'choose_entities':
      return `${String(chosen)} of ${String(ask.min)}–${String(ask.max)}`;
    case 'order':
      return `${String(chosen)} in the destination · min/max constrain what is LEFT in source: ` +
        `${String(ask.min)}/${String(ask.max)} (-1 = unconstrained)`;
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Card and option labels
// ---------------------------------------------------------------------------

/** A card inside an ask body, through the same three-shape discipline the board uses. */
function cardOptionLabel(card: AnyCard): string {
  if (isFaceDownHidden(card)) return `face-down card #${String(card.id)}`;
  if (isHidden(card)) return `card back #${String(card.id)}`;
  if (card.name !== '') return `${card.name} #${String(card.id)}`;
  return card.faceDown ? `face-down card #${String(card.id)}` : `(unnamed card) #${String(card.id)}`;
}

/**
 * What the client may add beside one option's label. The option already carries
 * the label the engine wants shown — `"???"` when the card behind it is
 * concealed — so this adds only the resolved reference, never a name of its own.
 */
function optionDetail(option: AskOption): string {
  if (option.card !== undefined) return cardOptionLabel(option.card);
  if (option.cardId !== undefined) return `card #${String(option.cardId)}`;
  if (option.playerId !== undefined) return `player ${String(option.playerId)}`;
  if (option.abilityId !== undefined) return `ability #${String(option.abilityId)}`;
  return option.kind === 'other' ? '' : option.kind;
}

/** `[3]` — the ask-local index, which is the whole of what an answer echoes. */
function IndexTag({ id }: { id: number }): JSX.Element {
  return <span className="ask-modal__index">[{id}]</span>;
}

/**
 * M5 — one option's card, drawn as a card.
 *
 * Through `CardTile` and nothing else (hard rule 8's renderer half): the cards
 * in an ask body come off the wire through the same gated serialiser as every
 * other card, and a concealed one is a five-key stub that the tile draws as a
 * card back. `anchor={false}` — if this card is also on the board, the board's
 * tile is where it *is* for the arrows overlay (report 10 §9.1); `clicks={null}`
 * because inside an ask the only thing the engine is listening for is the
 * answer, and the row's own controls are what send it.
 */
function OptionCard({ option, art }: { option: AskOption; art: ArtIndex }): JSX.Element | null {
  if (option.card === undefined) return null;
  return (
    <ul className="row row--strip ask-modal__thumb" style={{ '--slots': '1' } as React.CSSProperties}>
      <CardTile
        card={option.card}
        kind="strip"
        input={null}
        art={art}
        clicks={null}
        zoom="down"
        anchor={false}
      />
    </ul>
  );
}

function OptionLabel({ option, extra = '' }: { option: AskOption; extra?: string }): JSX.Element {
  const detail = [optionDetail(option), extra].filter((bit) => bit !== '').join(' · ');
  return (
    <>
      {/* Verbatim. Always. */}
      <span className="ask-modal__label">{option.label}</span>
      {detail !== '' && <span className="muted"> — {detail}</span>}
    </>
  );
}

// ---------------------------------------------------------------------------
// The component
// ---------------------------------------------------------------------------

export type AnswerFn = (askId: string, value: AnswerValue) => void;

export interface AskModalProps {
  ask: AskBody | null;
  /**
   * Send one `answer` (§2.3). `null`/absent is read-only — a replay has no
   * server, and a control that did nothing would be worse than a disabled one.
   */
  onAnswer?: AnswerFn | null;
  /**
   * M5 — the art index, so the cards in an ask body are drawn as cards.
   * Optional and defaulted, because a missing image is cosmetic by
   * construction (`CardTile` renders the generated text frame underneath) and
   * every existing caller that only wanted the labels still gets them.
   */
  art?: ArtIndex;
}

export function AskModal({
  ask,
  onAnswer = null,
  art = EMPTY_ART_INDEX,
}: AskModalProps): JSX.Element | null {
  // `null` renders NOTHING, deliberately: an empty "no outstanding question"
  // panel at the top of every frame trains the reader to ignore the place the
  // question appears.
  if (ask === null) return null;
  return (
    <>
      {/* M4 §11 — a scrim, so the dialog reads as blocking (it is: the Forge
          game thread is parked inside this call). It is not a click target:
          there is no "dismiss" for an ask, only an answer, and `Esc` sends the
          one that is always legal. */}
      <div className="ask-modal__scrim" aria-hidden="true" />
      <FocusTrap
        className="ask-modal"
        modal={onAnswer !== null}
        label={`The engine is asking: ${ask.kind}`}
        // Remounting the trap on a new askId re-runs the focus move, so a second
        // question that arrives while the first is on screen takes the focus.
        key={ask.askId}
      >
      <div className="ask-modal__head">
        <span className="k">{ask.kind}</span>{' '}
        <span className="muted">
          {ask.askId} · timeout {ask.timeoutMs} ms
        </span>
        {/* Not "the game thread is blocked on this" any more. Amendment M14:
            an `ability_menu` is usually asked with NO game thread parked on it
            — Forge asks it from inside a click, where the bridge may not block
            — and the client cannot tell the two apart from the frame. "Waiting"
            is true of both, and a UI that states something false about the
            engine is worse than one that states less. */}
        <span className="ask-modal__blocked">the engine is waiting for this</span>
      </div>
      {/* §5 — advisory for the client, enforced by the server: show it, do not
          enforce it. A bar that ran out and then did nothing would be a lie
          about who is counting, so this is a static width, not a countdown. */}
      {ask.timeoutMs > 0 && (
        <div
          className="ask-modal__timeout"
          role="img"
          aria-label={`the server will substitute the default after ${String(ask.timeoutMs)} ms`}
          title={`timeout ${String(ask.timeoutMs)} ms — advisory here, enforced by the bridge (§5)`}
        >
          <span className="ask-modal__timeoutbar" />
        </div>
      )}
      <p className="prompt">{askPrompt(ask)}</p>
      {/* Remounting on a new askId is how the draft resets: no effect, no
          derived-state dance, and a second ask can never inherit the first's
          half-built answer. */}
      <AskForm key={ask.askId} ask={ask} onAnswer={onAnswer} art={art} />
      </FocusTrap>
    </>
  );
}

/**
 * The dialog shell (report 10 §11): focus moves in on open, returns to whatever
 * had it on close, and Tab cycles inside.
 *
 * **`CTRL+Q` is deliberately outside this trap** (§5.2, §9 invariant 6): concede
 * is bound at `window` in `Board`, so a question you cannot answer is still a
 * game you can leave. `Esc` is handled there too, and answers `null` — which
 * §5.4 guarantees is always legal.
 *
 * No `useLayoutEffect`: this is one focus call, and `renderToStaticMarkup` runs
 * no effects at all, so the render test sees the markup and none of this.
 */
function FocusTrap({
  className,
  modal,
  label,
  children,
}: {
  className: string;
  modal: boolean;
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  const box = useRef<HTMLElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    focusables(box.current)[0]?.focus();
    return () => {
      // Returning focus matters more than taking it: a keyboard user who
      // answers an ask must land back on the board, not at the top of the page.
      previous?.focus?.();
    };
  }, []);

  return (
    <section
      className={className}
      role="dialog"
      aria-modal={modal}
      aria-label={label}
      ref={box}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const stops = focusables(box.current);
        if (stops.length === 0) return;
        const first = stops[0]!;
        const last = stops[stops.length - 1]!;
        const active = document.activeElement;
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      {children}
    </section>
  );
}

function focusables(root: HTMLElement | null): HTMLElement[] {
  if (root === null) return [];
  return [...root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]')].filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('tabindex') !== '-1',
  );
}

function AskForm({
  ask,
  onAnswer,
  art,
}: {
  ask: AskBody;
  onAnswer: AnswerFn | null;
  art: ArtIndex;
}): JSX.Element {
  const [draft, setDraft] = useState<AskDraft>(() => defaultDraft(ask));
  const live = onAnswer !== null;
  /** §5.3/M25 — the one kind whose "default" is a cancel and whose box can lie. */
  const numericText = ask.kind === 'text' && ask.numeric;
  const send = (value: AnswerValue): void => {
    onAnswer?.(ask.askId, value);
  };

  return (
    <>
      <div className="ask-modal__body">{body(ask, draft, setDraft, live, art)}</div>

      <div className="ask-modal__actions">
        <button
          type="button"
          className="btn btn--primary"
          // A numeric `text` box that is empty or not a number is the M25
          // re-ask loop, and the engine's own dialog does not accept it either.
          disabled={!live || !draftIsSendable(ask, draft)}
          title={
            draftIsSendable(ask, draft)
              ? 'send this draft as the answer (§5.2)'
              : 'this ask is numeric — an empty or non-numeric answer comes back as the same question (§5.3, M25)'
          }
          onClick={() => {
            send(answerFromDraft(ask, draft));
          }}
        >
          Answer
        </button>
        <button
          type="button"
          className="btn"
          disabled={!live}
          title={
            numericText
              ? 'cancel (null) — §5.4/M25: for a numeric ask this is the only answer that terminates'
              : 'the kind’s documented default (§5.4) — always legal, always one click away'
          }
          onClick={() => {
            send(defaultAnswer(ask));
          }}
        >
          Default
        </button>
        {nullIsLegal(ask) && (
          <button
            type="button"
            className="btn"
            disabled={!live}
            title="answer null — the bridge substitutes Forge's documented default (§5.4)"
            onClick={() => {
              send(null);
            }}
          >
            Cancel (null)
          </button>
        )}
        <button
          type="button"
          className="btn"
          disabled={!live}
          onClick={() => {
            setDraft(defaultDraft(ask));
          }}
        >
          Reset
        </button>
        <span className="muted">{countHint(ask, draftSize(draft))}</span>
      </div>

      {!live && (
        <p className="hint">
          Read-only: no transport is attached (this is a replay). Every ask must be answerable
          with <code>null</code> (§5.4), and Concede must be reachable from every UI state — so a
          wedge is always escapable.
        </p>
      )}
      {live && numericText && (
        <p className="hint">
          This is <code>getInteger</code>&rsquo;s &ldquo;Other&hellip;&rdquo; box (§5.3, amendment
          M25). Forge re-asks in a <code>while (true)</code> until the string is a number inside a
          range <em>this frame does not carry</em>, so <strong>a number outside the engine&rsquo;s
          range comes back as the same question</strong>. &ldquo;Default&rdquo; sends{' '}
          <code>null</code> — cancel — which is the answer that terminates.
        </p>
      )}
      {live && !nullIsLegal(ask) && (
        <p className="hint">
          This kind has no usable <code>null</code> (§5.3): Forge dereferences the result, so
          &ldquo;Default&rdquo; sends the documented default order instead of a cancel.
        </p>
      )}
    </>
  );
}

/** How many things the draft currently names — for the count hint only. */
function draftSize(draft: AskDraft): number {
  switch (draft.shape) {
    case 'indices':
      return draft.indices.length;
    case 'order':
      return draft.ordered.length;
    case 'amounts':
      return Object.values(draft.amounts).reduce((a, b) => a + b, 0);
    case 'index':
      return draft.index < 0 ? 0 : 1;
    case 'bool':
    case 'text':
      return 1;
  }
}

type SetDraft = (draft: AskDraft) => void;

/**
 * The per-kind form. The `switch` has no `default`, so a twelfth ask kind fails
 * the typecheck here rather than rendering a blank question at runtime — the
 * same discipline `reduce()` applies to an unknown kind at the other end.
 */
function body(
  ask: AskBody,
  draft: AskDraft,
  setDraft: SetDraft,
  live: boolean,
  art: ArtIndex,
): JSX.Element {
  switch (ask.kind) {
    case 'ability_menu':
      return (
        <RadioList
          options={ask.options}
          extra={(o) => ((o as { canPlay?: boolean }).canPlay === true ? 'can play' : 'cannot play')}
          selected={draft.shape === 'index' ? draft.index : -1}
          live={live}
          onPick={(index) => {
            setDraft({ shape: 'index', index });
          }}
        />
      );

    case 'options':
      return (
        <>
          {ask.card !== null && <CardNote card={ask.card} note="the card in question" />}
          <RadioList
            options={ask.options}
            extra={(o) => (o.id === ask.defaultIndex ? 'default' : '')}
            selected={draft.shape === 'index' ? draft.index : -1}
            live={live}
            onPick={(index) => {
              setDraft({ shape: 'index', index });
            }}
          />
        </>
      );

    case 'confirm': {
      const yes = draft.shape === 'bool' && draft.yes;
      return (
        <>
          {ask.card !== null && <CardNote card={ask.card} note="the card in question" />}
          <div className="ask-modal__choices">
            {/* The engine's own two labels. They answer true / false, not an index. */}
            <button
              type="button"
              className={`btn${yes ? ' btn--on' : ''}`}
              disabled={!live}
              onClick={() => {
                setDraft({ shape: 'bool', yes: true });
              }}
            >
              {ask.yesLabel}
            </button>
            <button
              type="button"
              className={`btn${yes ? '' : ' btn--on'}`}
              disabled={!live}
              onClick={() => {
                setDraft({ shape: 'bool', yes: false });
              }}
            >
              {ask.noLabel}
            </button>
            <span className="muted">
              answers {yes ? 'true' : 'false'} · engine default{' '}
              {ask.defaultYes ? ask.yesLabel : ask.noLabel}
            </span>
          </div>
        </>
      );
    }

    case 'text':
      return (
        <div className="ask-modal__choices">
          <input
            className="ask-modal__text"
            type={ask.numeric ? 'number' : 'text'}
            value={draft.shape === 'text' ? draft.text : ''}
            disabled={!live}
            aria-label={ask.title === '' ? 'answer' : ask.title}
            onChange={(e) => {
              setDraft({ shape: 'text', text: e.target.value });
            }}
          />
          <span className="muted">
            initial {ask.initial === '' ? '(empty)' : JSON.stringify(ask.initial)}
            {ask.numeric && ' · numeric'}
          </span>
          {ask.suggestions.length > 0 && (
            <span className="ask-modal__suggestions">
              {ask.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="btn btn--small"
                  disabled={!live}
                  onClick={() => {
                    setDraft({ shape: 'text', text: s });
                  }}
                >
                  {s}
                </button>
              ))}
            </span>
          )}
        </div>
      );

    case 'choose_list':
      return (
        <CheckList
          options={ask.options}
          extra={(o) => (ask.preselected.includes(o.id) ? 'preselected' : '')}
          chosen={draft.shape === 'indices' ? draft.indices : []}
          max={ask.reveal ? 0 : ask.max}
          live={live && !ask.reveal}
          onChange={(indices) => {
            setDraft({ shape: 'indices', indices });
          }}
        />
      );

    case 'choose_entities':
      return (
        <>
          <CheckList
            options={ask.options}
            extra={() => ''}
            chosen={draft.shape === 'indices' ? draft.indices : []}
            max={ask.max}
            live={live}
            onChange={(indices) => {
              setDraft({ shape: 'indices', indices });
            }}
          />
          {/* §5.3: the delayed reveal is the CONTEXT — "here is what you are
              looking at" — as distinct from the options, "here is what you may
              pick". It is the single largest legitimate reveal on the wire. */}
          {ask.delayedReveal !== null && (
            <div className="ask-modal__reveal">
              <h4>
                {ask.delayedReveal.messagePrefix === ''
                  ? 'Revealed'
                  : ask.delayedReveal.messagePrefix}{' '}
                <span className="muted">
                  {ask.delayedReveal.zones.join('/')} of player{' '}
                  {ask.delayedReveal.owner === null ? '—' : ask.delayedReveal.owner}
                </span>
              </h4>
              {/* M5 — the revealed cards, as cards. This is the single largest
                  legitimate reveal on the wire (§5.3), and every one of them
                  came through the one gated serialiser; drawing them as tiles
                  adds no name the frame did not carry, and the `sr-only` label
                  under each keeps the text rendering that a screen reader and a
                  pasted screenshot both need (§14 rule 4). */}
              <ul className="ask-modal__reveal-cards">
                {ask.delayedReveal.cards.map((card, i) => (
                  <CardTile
                    key={card.id}
                    card={card}
                    kind="strip"
                    input={null}
                    art={art}
                    clicks={null}
                    index={i}
                    zoom="down"
                    anchor={false}
                  />
                ))}
              </ul>
              <ul className="cards">
                {ask.delayedReveal.cards.map((card) => (
                  <li key={card.id} className="card">
                    {cardOptionLabel(card)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      );

    case 'order': {
      const all = askOptions(ask);
      const ordered = draft.shape === 'order' ? draft.ordered : [];
      const remember = draft.shape === 'order' && draft.remember;
      const pool = all.map((o) => o.id).filter((id) => !ordered.includes(id));
      const move = (from: number, to: number): void => {
        if (to < 0 || to >= ordered.length) return;
        const next = [...ordered];
        const [moved] = next.splice(from, 1);
        if (moved === undefined) return;
        next.splice(to, 0, moved);
        setDraft({ shape: 'order', ordered: next, remember });
      };
      return (
        <div className="ask-modal__two">
          <div>
            <h4>
              {ask.destLabel === '' ? 'Destination' : ask.destLabel}{' '}
              <span className="muted">(the answer, in this order)</span>
            </h4>
            <ol className="ask-modal__list">
              {ordered.map((id, i) => {
                const option = all.find((o) => o.id === id);
                return (
                  <li key={id} className="ask-modal__row">
                    <IndexTag id={id} />{' '}
                    {option === undefined ? (
                      <span className="muted">#{id}</span>
                    ) : (
                      <>
                        <OptionCard option={option} art={art} />
                        <OptionLabel option={option} />
                      </>
                    )}
                    <span className="ask-modal__row-actions">
                      <button
                        type="button"
                        className="btn btn--small"
                        disabled={!live || i === 0}
                        aria-label={`move ${String(id)} up`}
                        onClick={() => {
                          move(i, i - 1);
                        }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn btn--small"
                        disabled={!live || i === ordered.length - 1}
                        aria-label={`move ${String(id)} down`}
                        onClick={() => {
                          move(i, i + 1);
                        }}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="btn btn--small"
                        disabled={!live}
                        aria-label={`remove ${String(id)}`}
                        onClick={() => {
                          setDraft({
                            shape: 'order',
                            ordered: ordered.filter((x) => x !== id),
                            remember,
                          });
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                );
              })}
            </ol>
            {ordered.length === 0 && <p className="muted">empty</p>}
          </div>
          <div>
            <h4>
              Source <span className="muted">(what is left behind)</span>
            </h4>
            <ol className="ask-modal__list">
              {pool.map((id) => {
                const option = all.find((o) => o.id === id);
                return (
                  <li key={id} className="ask-modal__row">
                    <IndexTag id={id} />{' '}
                    {option === undefined ? (
                      <span className="muted">#{id}</span>
                    ) : (
                      <>
                        <OptionCard option={option} art={art} />
                        <OptionLabel option={option} />
                      </>
                    )}
                    <button
                      type="button"
                      className="btn btn--small"
                      disabled={!live}
                      aria-label={`add ${String(id)}`}
                      onClick={() => {
                        setDraft({ shape: 'order', ordered: [...ordered, id], remember });
                      }}
                    >
                      →
                    </button>
                  </li>
                );
              })}
            </ol>
            {pool.length === 0 && <p className="muted">empty</p>}
            {ask.showRemember && (
              <label className="ask-modal__remember">
                <input
                  type="checkbox"
                  checked={remember}
                  disabled={!live}
                  onChange={(e) => {
                    setDraft({ shape: 'order', ordered, remember: e.target.checked });
                  }}
                />{' '}
                remember this decision
              </label>
            )}
            {ask.referenceCardId !== null && (
              <p className="muted">reference card #{ask.referenceCardId}</p>
            )}
          </div>
        </div>
      );
    }

    case 'manipulate_list': {
      const order = draft.shape === 'indices' ? draft.indices : range(ask.cards.length);
      const move = (from: number, to: number): void => {
        if (to < 0 || to >= order.length) return;
        const next = [...order];
        const [moved] = next.splice(from, 1);
        if (moved === undefined) return;
        next.splice(to, 0, moved);
        setDraft({ shape: 'indices', indices: next });
      };
      return (
        <>
          <p className="muted">
            the whole list, in the order it will be returned{' '}
            {ask.toTop && '· to top '}
            {ask.toBottom && '· to bottom '}
            {ask.toAnywhere && '· to anywhere'}
          </p>
          <ol className="ask-modal__list">
            {order.map((id, i) => {
              const option = ask.cards.find((o) => o.id === id);
              const movable = ask.manipulable.includes(id);
              return (
                <li key={id} className="ask-modal__row ask-modal__row--card">
                  <IndexTag id={id} />{' '}
                  {option === undefined ? (
                    <span className="muted">#{id}</span>
                  ) : (
                    <>
                      {/* M5 — the list you are re-ordering is a list of cards,
                          so it is drawn as cards. No drag: two buttons, which
                          is the accessible gesture and the testable one. */}
                      <OptionCard option={option} art={art} />
                      <OptionLabel option={option} extra={movable ? 'movable' : 'fixed'} />
                    </>
                  )}
                  <span className="ask-modal__row-actions">
                    <button
                      type="button"
                      className="btn btn--small"
                      disabled={!live || !movable || i === 0}
                      aria-label={`move ${String(id)} up`}
                      onClick={() => {
                        move(i, i - 1);
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn--small"
                      disabled={!live || !movable || i === order.length - 1}
                      aria-label={`move ${String(id)} down`}
                      onClick={() => {
                        move(i, i + 1);
                      }}
                    >
                      ↓
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      );
    }

    case 'sideboard': {
      const chosen = draft.shape === 'indices' ? draft.indices : [];
      const all = askOptions(ask);
      const mainIds = new Set(ask.main.map((o) => o.id));
      const toggle = (id: number): void => {
        setDraft({
          shape: 'indices',
          indices: chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id],
        });
      };
      return (
        <div className="ask-modal__two">
          <div>
            <h4>
              Main deck <span className="muted">({chosen.length} cards — this is the answer)</span>
            </h4>
            <ul className="ask-modal__list">
              {chosen.map((id) => {
                const option = all.find((o) => o.id === id);
                return (
                  <li key={id} className="ask-modal__row">
                    <IndexTag id={id} />{' '}
                    {option === undefined ? (
                      <span className="muted">#{id}</span>
                    ) : (
                      <OptionLabel option={option} extra={mainIds.has(id) ? 'main' : 'from side'} />
                    )}
                    <button
                      type="button"
                      className="btn btn--small"
                      disabled={!live}
                      aria-label={`remove ${String(id)}`}
                      onClick={() => {
                        toggle(id);
                      }}
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h4>
              Pool <span className="muted">(main ++ side, ask-local indices across both)</span>
            </h4>
            <ul className="ask-modal__list">
              {all
                .filter((o) => !chosen.includes(o.id))
                .map((option) => (
                  <li key={option.id} className="ask-modal__row">
                    <IndexTag id={option.id} />{' '}
                    <OptionLabel
                      option={option}
                      extra={mainIds.has(option.id) ? 'main' : 'sideboard'}
                    />
                    <button
                      type="button"
                      className="btn btn--small"
                      disabled={!live}
                      aria-label={`add ${String(option.id)}`}
                      onClick={() => {
                        toggle(option.id);
                      }}
                    >
                      →
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      );
    }

    case 'assign_damage': {
      // M67 (D424): the defender's row only when the bridge says it may take
      // damage; the bridge refuses any other answer and says why (`reason`).
      const rule = assignDamageRuleOf(ask);
      return (
        <AmountRows
          targets={rule.defenderAllowed === false ? ask.targets.filter((t) => t.defender !== true) : ask.targets}
          total={ask.total}
          amounts={draft.shape === 'amounts' ? draft.amounts : {}}
          live={live}
          extra={(t) =>
            [
              (t as { defender?: boolean }).defender === true ? 'the defender' : '',
              typeof (t as { lethal?: number | null }).lethal !== 'number'
                ? ''
                : `lethal ${String((t as { lethal?: number }).lethal)}`,
            ]
              .filter((bit) => bit !== '')
              .join(' · ')
          }
          onChange={(amounts) => {
            setDraft({ shape: 'amounts', amounts });
          }}
          note={
            `${rule.reason === null ? '' : `refused: ${rule.reason} · `}` +
            `${ask.overrideOrder ? 'order overridden · ' : ''}${ask.maySkip ? 'may skip · ' : ''}` +
            (rule.defenderAllowed === false
              ? 'the defender may take no damage (M67)'
              : `index 0 is the defending player or planeswalker (§5.3)`)
          }
        />
      );
    }

    case 'assign_amount':
      return (
        <AmountRows
          targets={ask.targets}
          total={ask.total}
          amounts={draft.shape === 'amounts' ? draft.amounts : {}}
          live={live}
          extra={(t) =>
            (t as { max?: number }).max === undefined
              ? ''
              : `max ${String((t as { max?: number }).max)}`
          }
          onChange={(amounts) => {
            setDraft({ shape: 'amounts', amounts });
          }}
          note={`${ask.label} · ${ask.atLeastOne ? 'every target must get at least one' : 'zero is allowed'}`}
        />
      );
  }
}

// ---------------------------------------------------------------------------
// Shared controls
// ---------------------------------------------------------------------------

function CardNote({ card, note }: { card: AnyCard; note: string }): JSX.Element {
  return (
    <p className="ask-modal__card">
      <span className="k">{note}</span> {cardOptionLabel(card)}
    </p>
  );
}

function RadioList({
  options,
  extra,
  selected,
  live,
  onPick,
}: {
  options: AskOption[];
  extra: (option: AskOption) => string;
  selected: number;
  live: boolean;
  onPick: (index: number) => void;
}): JSX.Element {
  if (options.length === 0) return <p className="muted">this ask carries no options</p>;
  return (
    <ol className="ask-modal__list">
      {options.map((option) => (
        <li
          key={option.id}
          className={`ask-modal__row${option.id === selected ? ' ask-modal__row--on' : ''}`}
        >
          <button
            type="button"
            className="ask-modal__pick"
            disabled={!live}
            aria-pressed={option.id === selected}
            aria-label={`option ${String(option.id)}: ${option.label}`}
            onClick={() => {
              onPick(option.id);
            }}
          >
            <IndexTag id={option.id} /> <OptionLabel option={option} extra={extra(option)} />
          </button>
        </li>
      ))}
    </ol>
  );
}

function CheckList({
  options,
  extra,
  chosen,
  max,
  live,
  onChange,
}: {
  options: AskOption[];
  extra: (option: AskOption) => string;
  chosen: number[];
  max: number;
  live: boolean;
  onChange: (indices: number[]) => void;
}): JSX.Element {
  if (options.length === 0) return <p className="muted">this ask carries no options</p>;
  return (
    <ol className="ask-modal__list">
      {options.map((option) => {
        const on = chosen.includes(option.id);
        // `max` is the engine's own bound (§5.2). Refusing an over-count click is
        // not rules logic: it is the number Forge sent, echoed back.
        //
        // **`max === 1` is a radio button, not a checkbox.** "Choose a color" is
        // `min = max = 1` with one option already picked, and disabling every
        // other option — which is what a literal reading of the bound does —
        // left the user unable to change their mind without first finding the
        // deselect. Measured in the browser on a live `choose_list`.
        const full = !on && max !== 1 && max >= 0 && chosen.length >= max;
        return (
          <li key={option.id} className={`ask-modal__row${on ? ' ask-modal__row--on' : ''}`}>
            <button
              type="button"
              className="ask-modal__pick"
              disabled={!live || full}
              aria-pressed={on}
              aria-label={`option ${String(option.id)}: ${option.label}`}
              onClick={() => {
                onChange(toggleChoice(chosen, option.id, max));
              }}
            >
              <span className="ask-modal__tick">{on ? '☑' : '☐'}</span> <IndexTag id={option.id} />{' '}
              <OptionLabel option={option} extra={extra(option)} />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function AmountRows({
  targets,
  total,
  amounts,
  live,
  extra,
  onChange,
  note,
}: {
  targets: AskOption[];
  total: number;
  amounts: Record<string, number>;
  live: boolean;
  extra: (target: AskOption) => string;
  onChange: (amounts: Record<string, number>) => void;
  note: string;
}): JSX.Element {
  const assigned = Object.values(amounts).reduce((a, b) => a + b, 0);
  return (
    <>
      <p className="muted">{note}</p>
      <ul className="ask-modal__list">
        {targets.map((target) => (
          <li key={target.id} className="ask-modal__row">
            <IndexTag id={target.id} /> <OptionLabel option={target} extra={extra(target)} />
            <input
              className="ask-modal__amount"
              type="number"
              min={0}
              max={total}
              value={amounts[String(target.id)] ?? 0}
              disabled={!live}
              aria-label={`amount for option ${String(target.id)}`}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                onChange({ ...amounts, [String(target.id)]: Number.isFinite(n) && n > 0 ? n : 0 });
              }}
            />
          </li>
        ))}
      </ul>
      <p className={assigned === total ? 'muted' : 'hint'}>
        assigned {assigned} of {total}
        {assigned === total ? ' ✓' : ' — the engine wants the total exactly'}
      </p>
    </>
  );
}

// ---------------------------------------------------------------------------
// The prompt line
// ---------------------------------------------------------------------------

/** The engine's own prompt, or the sentence the kind implies when it has none. */
export function askPrompt(ask: AskBody): string {
  switch (ask.kind) {
    case 'confirm':
    case 'options':
    case 'text':
    case 'order':
    case 'choose_entities':
    case 'manipulate_list':
      return ask.prompt;
    case 'assign_amount':
      return `Assign ${String(ask.total)} ${ask.label}${ask.sourceCardId === null ? '' : ` from #${String(ask.sourceCardId)}`}`;
    case 'choose_list':
      return ask.reveal ? `${ask.prompt} (reveal — acknowledge only)` : ask.prompt;
    case 'ability_menu':
      return `Choose an ability of card #${String(ask.cardId)}`;
    case 'assign_damage':
      return (
        `Assign ${String(ask.total)} combat damage` +
        `${ask.attackerId === null ? '' : ` from #${String(ask.attackerId)}`}` +
        `${ask.overrideOrder ? ' (order overridden)' : ''}${ask.maySkip ? ' (may skip)' : ''}`
      );
    case 'sideboard':
      return ask.prompt;
  }
}
