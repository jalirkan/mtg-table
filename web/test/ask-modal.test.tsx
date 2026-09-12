/*
 * mtg-table — web/test/ask-modal.test.tsx
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **All eleven ask kinds, mounted, and each answerable with its default.**
 *
 * An `ask` parks the Forge game thread (§5). The consequence for the client is
 * blunt: a kind the board cannot answer is a game that stops, with no error and
 * no way out but Concede — and Forge dispatched only **three** of the eleven in
 * every recording ever made here (`choose_list`, `order`, `assign_damage`). So
 * for the other eight, `fixtures/synthetic/sample-handwritten.jsonl` and this
 * file are the whole of the contract on the TypeScript side, exactly as
 * `mtgtable.AskSelfTest` is on the Java side.
 *
 * What is asserted, per kind:
 *
 *   1. `<AskModal>` mounts with a live `onAnswer` and renders — no throw, no
 *      empty block, and **every option label the engine sent, verbatim** (§5.1:
 *      a concealed card's option arrives labelled `"???"`, so a client that
 *      rebuilt the label from `option.card` would re-open the leak);
 *   2. the **default answer is producible**: `answerFromDraft(ask,
 *      defaultDraft(ask))` — literally the two functions the "Default" button
 *      calls — returns a value of the shape §5.2 declares for that kind;
 *   3. the three kinds with **no usable `null`** (`order`, `choose_list`,
 *      `manipulate_list`, §5.3/§5.4) never produce one, and their form offers no
 *      cancel;
 *   4. the default has the **same shape** as the answer the fixture recorded for
 *      that ask — a cross-check against a file written from the spec rather than
 *      from this component.
 *
 * **What this cannot do, and why.** There is no DOM here (`vitest.config.ts`:
 * `environment: 'node'`, no jsdom in `devDependencies`), so the assertions above
 * drive the same pure functions the buttons call rather than clicking them. The
 * markup check is what proves those buttons are present and enabled; the click
 * wiring between the two is three lines and is exercised for real in
 * `docs/evidence/m3-web.md`'s browser transcript.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';

import { ASK_KINDS, type AnswerBody, type AnswerValue, type AskBody, type AskKind } from '../src/protocol.ts';
import {
  AskModal,
  answerFromDraft,
  askOptions,
  defaultAnswer,
  defaultDraft,
  draftIsSendable,
  nullIsLegal,
  toggleChoice,
} from '../src/render/AskModal.tsx';
import { parseFrameLog } from '../src/transport/replay.ts';

const SAMPLE = fileURLToPath(new URL('../../fixtures/synthetic/sample-handwritten.jsonl', import.meta.url));

const log = parseFrameLog(readFileSync(SAMPLE, 'utf8'));
const asks: AskBody[] = [];
const answers = new Map<string, AnswerValue>();
for (const frame of log.frames) {
  if (frame.type === 'ask') asks.push(frame.body);
  if (frame.type === 'answer') answers.set((frame.body as AnswerBody).askId, (frame.body as AnswerBody).value);
}

/** React escapes text nodes; the labels are real card names with apostrophes. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function render(ask: AskBody, live: boolean): string {
  return renderToStaticMarkup(
    <AskModal
      ask={ask}
      onAnswer={
        live
          ? () => {
              /* the click path; this test drives the pure half — see the header */
            }
          : null
      }
    />,
  );
}

/** §5.2's declared answer shape, per kind, as a predicate. */
function shapeOf(value: AnswerValue): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'indices';
  if (typeof value === 'object') return 'ordered' in value ? 'order' : 'amounts';
  return typeof value; // 'boolean' | 'number' | 'string'
}

const EXPECTED_SHAPE: Record<AskKind, string[]> = {
  ability_menu: ['number', 'null'],
  confirm: ['boolean'],
  options: ['number', 'null'],
  text: ['string'],
  choose_list: ['indices'],
  order: ['order'],
  choose_entities: ['indices'],
  assign_damage: ['amounts'],
  assign_amount: ['amounts'],
  manipulate_list: ['indices'],
  sideboard: ['indices'],
};

test('the fixture carries all eleven kinds — otherwise this file proves less than it claims', () => {
  const kinds = new Set(asks.map((a) => a.kind));
  expect([...kinds].sort()).toEqual([...ASK_KINDS].sort());
  expect(asks.length).toBeGreaterThanOrEqual(ASK_KINDS.length);
});

for (const ask of asks) {
  test(`${ask.kind} (${ask.askId}): mounts, and its default answer is producible`, () => {
    // 1. It renders, and it renders the engine's labels verbatim.
    const html = render(ask, true);
    expect(html.length).toBeGreaterThan(64);
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('[object Object]');
    // Amendment M14: an `ability_menu` is usually asked with no game thread
    // parked on it, so the banner says what is true of every ask.
    expect(html).toContain('the engine is waiting for this');
    expect(html).toContain(ask.askId);
    for (const option of askOptions(ask)) {
      expect(
        html,
        `${ask.kind}: the form dropped or rewrote the engine's option label ${JSON.stringify(option.label)}`,
      ).toContain(escapeHtml(option.label));
    }
    if (ask.kind === 'confirm') {
      // No option array at all: the two labels are the engine's buttons.
      expect(html).toContain(escapeHtml(ask.yesLabel));
      expect(html).toContain(escapeHtml(ask.noLabel));
    }

    // The two affordances §5.4 requires. "Default" is always enabled — it is
    // the one-click way out of every kind. "Answer" is too, with exactly one
    // exception: a `numeric` `text` ask whose box is empty or not a number
    // (§5.3/M25 — sending that string is the infinite re-ask, and "Default"
    // sends `null` instead, which terminates).
    const numericText = ask.kind === 'text' && ask.numeric;
    expect(html).toMatch(/<button[^>]*>Answer<\/button>/);
    expect(html).toMatch(/<button[^>]*>Default<\/button>/);
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*>Default<\/button>/);
    if (!numericText || draftIsSendable(ask, defaultDraft(ask))) {
      expect(html).not.toMatch(/<button[^>]*disabled[^>]*>Answer<\/button>/);
    }

    // 2. The default answer is producible — through the same two functions the
    // "Default" button calls, not through a reimplementation of them.
    const fromDraft = answerFromDraft(ask, defaultDraft(ask));
    const canned = defaultAnswer(ask);
    if (numericText) {
      // The one kind whose one-click answer is NOT its draft: §5.4 as amended by
      // M25 says of it in as many words that `null` is the answer that
      // terminates and `""` is not, and `initial` is `""` whenever Forge has
      // none (§5.2). Measured in the browser: "Default" on this ask used to
      // produce a3, a4, a5, a6 — the same question every time.
      expect(canned, 'a numeric `text` ask defaults to null (§5.4, M25)').toBeNull();
    } else {
      expect(canned).toEqual(fromDraft);
    }
    expect(fromDraft).not.toBeUndefined();
    expect(
      EXPECTED_SHAPE[ask.kind],
      `${ask.kind}: default answer ${JSON.stringify(fromDraft)} has shape ${shapeOf(fromDraft)}`,
    ).toContain(shapeOf(fromDraft));

    // 3. The three kinds Forge dereferences unguarded never answer null (§5.3).
    if (!nullIsLegal(ask)) {
      expect(fromDraft, `${ask.kind} must never answer null (§5.4)`).not.toBeNull();
      expect(html, `${ask.kind} must not offer a cancel`).not.toContain('Cancel (null)');
    } else {
      expect(html).toContain('Cancel (null)');
    }

    // 4. …and it is the same shape the fixture recorded for this ask.
    const recorded = answers.get(ask.askId);
    expect(recorded, `${ask.askId} has no answer in the fixture`).not.toBeUndefined();
    expect(
      shapeOf(recorded as AnswerValue),
      `${ask.kind}: the fixture answered ${JSON.stringify(recorded)} but the default is ` +
        `${JSON.stringify(fromDraft)} — the two ends disagree about §5.2's answer shape`,
    ).toBe(shapeOf(fromDraft));
  });
}

test('a numeric `text` ask defaults to null, and an empty box is not sendable (§5.4, M25)', () => {
  // The regression this pins, in full: `defaultDraft` returns `{shape:'text',
  // text: ask.initial}` and §5.2 says `initial` is `""` when Forge has none, so
  // the board's "Default" button was sending `""` into
  // `AbstractGuiGame.getInteger`'s `while (true)` — the identical question back,
  // forever. Verified live in the browser on `decks/number-probe.dck` (Volcano
  // Hellion → choose_list → "Other…" → text a2): Default produced a3, a4, a5,
  // a6. `Cancel (null)` escaped, so it was recoverable and not a hard wedge —
  // but the tooltip said "always legal" and §5.4/M25 says the opposite.
  const numeric: AskBody = {
    kind: 'text',
    askId: 'a2',
    timeoutMs: 0,
    prompt: 'Enter a number between 0 and 99:',
    title: '',
    initial: '',
    suggestions: [],
    numeric: true,
  };
  expect(defaultAnswer(numeric)).toBeNull();
  expect(draftIsSendable(numeric, { shape: 'text', text: '' })).toBe(false);
  expect(draftIsSendable(numeric, { shape: 'text', text: '   ' })).toBe(false);
  expect(draftIsSendable(numeric, { shape: 'text', text: 'seven' })).toBe(false);
  expect(draftIsSendable(numeric, { shape: 'text', text: '7' })).toBe(true);
  // …and the free-text kind is untouched: `""` is a legal answer to
  // `showInputDialog` when it is not getInteger's box, and `defaultDraft`
  // still opens on the engine's own `initial`.
  const free: AskBody = { ...numeric, numeric: false, initial: 'Island' };
  expect(defaultAnswer(free)).toBe('Island');
  expect(draftIsSendable(free, { shape: 'text', text: '' })).toBe(true);
  // The draft is deliberately NOT changed: the form opens on `initial`.
  expect(defaultDraft(numeric)).toEqual({ shape: 'text', text: '' });
});

test('the indices a default answer names are ask-local and in range (§5.1)', () => {
  for (const ask of asks) {
    const value = defaultAnswer(ask);
    const ids = new Set(askOptions(ask).map((o) => o.id));
    const check = (index: number): void => {
      expect(
        ids.has(index) || ids.size === 0,
        `${ask.kind}: answer index ${String(index)} is not an ask-local option id ` +
          `(ids: ${[...ids].join(',')}) — an answer must never carry a Forge card id`,
      ).toBe(true);
    };
    if (Array.isArray(value)) value.forEach(check);
    else if (typeof value === 'number') check(value);
    else if (value !== null && typeof value === 'object') {
      if ('ordered' in value) (value.ordered as number[]).forEach(check);
      else for (const key of Object.keys(value)) check(Number.parseInt(key, 10));
    }
  }
});

test('assign_damage and assign_amount defaults total exactly what the engine asked for', () => {
  for (const ask of asks) {
    if (ask.kind !== 'assign_damage' && ask.kind !== 'assign_amount') continue;
    const value = defaultAnswer(ask) as Record<string, number>;
    const sum = Object.values(value).reduce((a, b) => a + b, 0);
    expect(sum, `${ask.kind}: assigned ${String(sum)} of ${String(ask.total)}`).toBe(ask.total);
    if (ask.kind === 'assign_damage' && ask.targets.length > 1) {
      // §5.3: index 0 is the DEFENDER and a blocker follows. Piling the damage
      // on the defending player while a creature is blocking is the one answer
      // the rules do not allow.
      expect(
        value['0'] ?? 0,
        'the default put damage on the defender while a blocker exists',
      ).toBe(0);
    }
  }
});

test('order defaults to a non-null {ordered, remember} inside Forge\'s remaining-min/max window', () => {
  for (const ask of asks) {
    if (ask.kind !== 'order') continue;
    const value = defaultAnswer(ask) as { ordered: number[]; remember: boolean };
    expect(value.remember).toBe(false);
    const total = ask.dest.length + ask.source.length;
    const left = total - value.ordered.length;
    // min/max constrain what is LEFT IN SOURCE, and -1 means unconstrained.
    if (ask.min >= 0) expect(left).toBeGreaterThanOrEqual(ask.min);
    if (ask.max >= 0) expect(left).toBeLessThanOrEqual(ask.max);
    expect(new Set(value.ordered).size).toBe(value.ordered.length);
  }
});

test('a reveal answers [] — min/max of -1 is "look at these", not "pick minus one"', () => {
  const reveals = asks.filter((a) => a.kind === 'choose_list' && a.reveal);
  expect(reveals.length, 'the fixture has no reveal-shaped choose_list').toBeGreaterThan(0);
  for (const ask of reveals) {
    expect(defaultAnswer(ask)).toEqual([]);
    expect(render(ask, true)).toContain('acknowledge only');
  }
});

test('with no transport the same form is inert, and says which mode it is in', () => {
  // A replay has no server. A control that did nothing would be worse than a
  // disabled one — and this is the assertion `web/test/render.test.tsx` has been
  // making since M1, kept here now that the component can also be live.
  for (const ask of asks) {
    const html = render(ask, false);
    expect(html).toContain('Read-only');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Answer<\/button>/);
  }
});

test('a null ask renders nothing at all', () => {
  expect(renderToStaticMarkup(<AskModal ask={null} />)).toBe('');
});

test('max === 1 is a radio button: clicking another option MOVES the choice', () => {
  /*
   * Found in a browser on a live `choose_list` ("Choose a color", min = max = 1,
   * `kind: "color"` options). The form opens with option 0 chosen — the default
   * draft is the first `min` indices — and a literal reading of `max` then
   * disabled every other option, so the only way to pick white was to find the
   * deselect first. The engine's number is still obeyed: one, exactly one.
   */
  expect(toggleChoice([0], 3, 1)).toEqual([3]);
  expect(toggleChoice([0], 0, 1)).toEqual([]);
  expect(toggleChoice([], 2, 1)).toEqual([2]);

  // Above one, the bound is enforced by refusing the extra click rather than by
  // silently dropping an earlier choice.
  expect(toggleChoice([0, 1], 2, 2)).toEqual([0, 1]);
  expect(toggleChoice([0], 2, 2)).toEqual([0, 2]);
  expect(toggleChoice([0, 1], 1, 2)).toEqual([0]);
  // -1 is Forge's "unconstrained" (§5.3).
  expect(toggleChoice([0, 1, 2], 3, -1)).toEqual([0, 1, 2, 3]);
});
