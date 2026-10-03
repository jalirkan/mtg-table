/*
 * mtg-table — web/test/board-m5.test.tsx
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **M5 on the board**: the three things that stopped being dead ends, asserted
 * against the real `<Board/>` over the real fixtures.
 *
 *   1. **A board-shaped ask is not a modal.** The tiles are outlined, the
 *      decision panel holds the prompt, the count and the buttons, and
 *      `AskModal` is not mounted at all — while a non-card ask (a mode, a
 *      colour, a number, a card in a zone nobody is drawing) still gets the
 *      modal, unchanged. Both halves matter: a picker that swallowed the modal
 *      cases would be M5's own dead end.
 *   2. **A mana pip is a control.** `PLAN.md`: *"`useMana` — this is the one
 *      real dead end, and it goes first."* The click is driven for real here —
 *      `ManaPoolPips` is hook-free, so the element it returns can be walked and
 *      its `onClick` invoked — and what it produces is asserted to be the §2.2
 *      act, colour and all.
 *   3. **A zone can be opened.** `input.openZones` (a hint, never a question —
 *      §4.3) mounts the browser with no effect and no click, so
 *      `renderToStaticMarkup` sees exactly what a browser would, and the panel
 *      is asserted to list the zone through `CardTile` and to carry not one id
 *      or name from an opponent's hand.
 *
 * The harness is `render.test.tsx`'s: `renderToStaticMarkup`, no jsdom, and the
 * reasoning for that is written out in that file's header (M4 follow-up 4).
 * Every fixture still renders in both modes there — this file is the M5
 * behaviour, not a second corpus pass.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';

import { EMPTY_ART_INDEX } from '../src/art.ts';
import { isHidden, type ActBody, type AskBody, type ManaColor, type ManaPool } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { Board, type BoardActions } from '../src/render/Board.tsx';
import { ManaPoolPips } from '../src/render/Mana.tsx';
import { parseFrameLog } from '../src/transport/replay.ts';

const SYNTHETIC = fileURLToPath(
  new URL('../../fixtures/synthetic/sample-handwritten.jsonl', import.meta.url),
);

const FAKE_ACTIONS: BoardActions = {
  clickCard: () => undefined,
  clickPlayer: () => undefined,
  buttonOk: () => undefined,
  buttonCancel: () => undefined,
  useMana: () => undefined,
  concede: () => undefined,
  answer: () => undefined,
  // M6 — five more acts on the seam. The sink records nothing here on purpose;
  // `board-m6.test.tsx` is where each one is driven and its act asserted.
  undo: () => undefined,
  passPriority: () => undefined,
  alphaStrike: () => undefined,
  yieldTo: () => undefined,
  setYield: () => undefined,
  setPhaseStop: () => undefined,
  newGame: () => undefined,
};

function live(state: ClientState): string {
  return renderToStaticMarkup(<Board state={state} art={EMPTY_ART_INDEX} actions={FAKE_ACTIONS} />);
}

function replay(state: ClientState): string {
  return renderToStaticMarkup(<Board state={state} art={EMPTY_ART_INDEX} />);
}

/** The folded state at the frame that delivered `askId`, and that ask. */
function stateAtAsk(askId: string): { state: ClientState; ask: AskBody } {
  const log = parseFrameLog(readFileSync(SYNTHETIC, 'utf8'));
  let state = initialState(log.header);
  for (const frame of log.frames) {
    state = reduce(state, frame);
    if (frame.type === 'ask' && state.ask?.askId === askId) return { state, ask: state.ask };
  }
  throw new Error(`the synthetic fixture has no ask ${askId}`);
}

/** The first folded state whose `input` carries an `openZones` hint (§4.3). */
function stateWithOpenZones(): ClientState {
  const log = parseFrameLog(readFileSync(SYNTHETIC, 'utf8'));
  let state = initialState(log.header);
  for (const frame of log.frames) {
    state = reduce(state, frame);
    if ((state.input?.openZones.length ?? 0) > 0) return state;
  }
  throw new Error('the synthetic fixture carries no openZones hint');
}

// ---------------------------------------------------------------------------
// 1. The ask that is not a modal
// ---------------------------------------------------------------------------

test('an ask whose options are all cards on the board renders as a PICKER', () => {
  // a11 — "Choose a card to discard", three cards in the viewer's own hand.
  const { state, ask } = stateAtAsk('a11');
  const html = live(state);

  // The picker is mounted, in the decision panel, naming the ask.
  expect(html).toContain(`data-ask-picker="${ask.askId}"`);
  // ...and the modal is NOT. This is the whole of M5's second bullet: the
  // dialog that used to cover the board for a question about cards on it.
  expect(html, 'the modal is still mounted over a board-shaped ask').not.toContain('ask-modal__scrim');
  expect(html).not.toContain('class="ask-modal"');

  // The candidates are outlined ON THE BOARD, through `CardTile`'s one markup.
  const optionIds = (ask as unknown as { options: Array<{ id: number; label: string }> }).options;
  for (const option of optionIds) {
    expect(html, `option ${String(option.id)} is not outlined on a tile`).toContain(
      `data-ask-option="${String(option.id)}"`,
    );
  }
  expect(html).toContain('tile--ask');

  // A candidate tile answers instead of sending an act, and says so.
  expect(html).toMatch(/data-act="answer"/);

  // Everything §5 requires of an outstanding question is still on screen: the
  // kind, the id, that the engine is waiting, and every label verbatim.
  expect(html).toContain(ask.kind);
  expect(html).toContain('the engine is waiting for this');
  for (const option of optionIds) {
    expect(html).toContain(option.label.replace(/&/g, '&amp;').replace(/'/g, '&#x27;'));
  }
  // The running count (§5.2's min/max, printed, never enforced).
  expect(html).toMatch(/chosen <strong>\d+<\/strong> of 1/);
});

test('a non-card ask still renders the MODAL, unchanged', () => {
  // a3 — `options`, a modal spell's three modes. `kind: "other"`: there is
  // nothing on the board to point at, and a picker would be a dead end.
  const { state, ask } = stateAtAsk('a3');
  const html = live(state);
  expect(html).toContain('ask-modal__scrim');
  expect(html).toContain('role="dialog"');
  expect(html).not.toContain('data-ask-picker');
  for (const option of (ask as { options: Array<{ label: string }> }).options) {
    expect(html).toContain(option.label);
  }

  // And the library search, whose options are cards nobody is drawing: the
  // `delayedReveal` panel is the modal's, and §5.3 says so.
  const search = stateAtAsk('a15');
  const searchHtml = live(search.state);
  expect(searchHtml).toContain('ask-modal__scrim');
  expect(searchHtml).not.toContain('data-ask-picker');
});

test('the picker is read-only on a replay, like every other affordance', () => {
  const { state, ask } = stateAtAsk('a11');
  const html = replay(state);
  expect(html).toContain(`data-ask-picker="${ask.askId}"`);
  expect(html).toContain('Read-only');
  // Report 10 §1 / PLAN M4: every affordance renders, every affordance is inert.
  for (const button of html.match(/<button[^>]*data-act="[^"]*"[^>]*>/g) ?? []) {
    expect(button, 'a live affordance on the replay board').toContain('disabled');
  }
});

test('assign_damage puts its number inputs on the blockers (§5.3)', () => {
  // a17 — two targets: the defending player (index 0, a rail) and one blocker
  // that is on the battlefield.
  const { state } = stateAtAsk('a17');
  const html = live(state);
  expect(html).toContain('data-ask-picker="a17"');
  expect(html).not.toContain('ask-modal__scrim');
  // The input on the blocker's own tile...
  expect(html).toContain('tile__amount');
  // ...the remaining toughness the engine computed, beside it...
  expect(html).toContain('lethal 1');
  // ...and the defender keeps its row in the panel, at index 0.
  expect(html).toContain('the defender (option 0, §5.3)');
  expect(html).toMatch(/assigned <strong>\d+<\/strong> of 2/);
});

// ---------------------------------------------------------------------------
// 2. useMana — the one real dead end
// ---------------------------------------------------------------------------

interface ElementLike {
  props?: Record<string, unknown>;
}

/** Walk a React element tree without a renderer. Only safe for hook-free components. */
function walk(node: unknown, visit: (el: ElementLike) => void): void {
  if (node === null || node === undefined || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  const el = node as ElementLike;
  if (el.props === undefined) return;
  visit(el);
  walk(el.props.children, visit);
}

function pool(partial: Partial<ManaPool>): ManaPool {
  return { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, ...partial };
}

test('clicking a mana pip produces act useMana for that colour', () => {
  const sent: ActBody[] = [];
  const actions: BoardActions = {
    ...FAKE_ACTIONS,
    useMana: (color: ManaColor) => {
      sent.push({ action: 'useMana', color });
    },
  };

  // `ManaPoolPips` has no hooks, so the element it returns can be walked and
  // its handler invoked — a real click, with no DOM.
  const element = ManaPoolPips({ pool: pool({ U: 2, C: 1 }), onSpend: actions.useMana });
  const pips = new Map<string, ElementLike>();
  walk(element, (el) => {
    const mana = el.props?.['data-mana'];
    if (typeof mana === 'string') pips.set(mana, el);
  });

  // Only the colours the pool holds are controls (§3.1 — the engine's count).
  expect([...pips.keys()].sort()).toEqual(['C', 'U']);

  (pips.get('U')?.props?.onClick as () => void)();
  (pips.get('C')?.props?.onClick as () => void)();
  expect(sent).toEqual([
    { action: 'useMana', color: 'U' },
    { action: 'useMana', color: 'C' },
  ]);

  // A pool with nothing in it is the M4 row: six read-only pips, no buttons.
  const dead = ManaPoolPips({ pool: pool({}), onSpend: actions.useMana });
  let buttons = 0;
  walk(dead, (el) => {
    if (typeof el.props?.['data-act'] === 'string') buttons += 1;
  });
  expect(buttons).toBe(0);
});

test('the pips are controls on your rail only, and never during an ask', () => {
  const { state } = stateAtAsk('a11');
  const board = structuredClone(state.board!);
  const you = state.hello?.you ?? 0;
  for (const player of board.players) {
    player.manaPool = pool({ W: 1, U: 1 });
  }

  // With a question outstanding the engine is parked inside it (§5): the pool
  // is drawn, and it is not a control.
  const asking = live({ ...state, board });
  expect(asking).toContain('pool__pip');
  expect(asking).not.toContain('data-act="useMana"');

  // With no ask, your own rail's pips are buttons — and only yours.
  const free = live({ ...state, board, ask: null });
  const manaButtons = [...free.matchAll(/data-mana="([WUBRGC])"/g)].map((m) => m[1]);
  expect(manaButtons.sort()).toEqual(['U', 'W']);
  expect(board.players.filter((p) => p.id !== you).length).toBeGreaterThan(0);

  // A replay renders the same pips with no control at all.
  expect(replay({ ...state, board, ask: null })).not.toContain('data-act="useMana"');
});

// ---------------------------------------------------------------------------
// 3. The zone browser
// ---------------------------------------------------------------------------

test('openZones opens the browser, drawn with CardTile, with no opponent hand', () => {
  const state = stateWithOpenZones();
  const hint = state.input!.openZones[0]!;
  const html = live(state);

  expect(html).toContain('zonebrowser');
  expect(html).toContain('Zones the engine opened');
  // §4.3 — the hint reveals nothing, and the panel says so rather than implying
  // the engine handed over cards.
  expect(html).toContain('it reveals no cards');

  const board = state.board!;
  const seat = board.players.find((p) => p.id === hint.playerId)!;
  expect(hint.zones).toContain('graveyard');

  // The zone's cards are listed, through the ONE card renderer: `CardTile`'s
  // own markup, not a list of names this panel built.
  const panel = html.slice(html.indexOf('zonebrowser'));
  for (const card of seat.zones.graveyard.cards) {
    expect(panel, `card #${String(card.id)} is missing from the browser`).toContain(
      `data-card-id="${String(card.id)}"`,
    );
  }
  expect(panel).toContain('class="tile tile--bf');

  // Not one id or name from another seat's hand, anywhere on the page.
  const forbiddenIds = new Set<number>();
  const forbiddenNames = new Set<string>();
  const you = state.hello?.you ?? null;
  for (const player of board.players) {
    if (player.id === you) continue;
    for (const card of player.zones.hand.cards) {
      forbiddenIds.add(card.id);
      if (!isHidden(card) && card.name !== '') forbiddenNames.add(card.name);
    }
  }
  expect(forbiddenIds.size, 'no opponent hand in this frame — the check is vacuous').toBeGreaterThan(
    0,
  );
  for (const id of forbiddenIds) expect(html).not.toContain(`data-card-id="${String(id)}"`);
  for (const name of forbiddenNames) expect(html).not.toContain(name);
});

test('with no hint and nothing clicked, no browser is mounted at all', () => {
  const log = parseFrameLog(readFileSync(SYNTHETIC, 'utf8'));
  let state = initialState(log.header);
  let checked = 0;
  for (const frame of log.frames) {
    state = reduce(state, frame);
    if (state.board === null) continue;
    if ((state.input?.openZones.length ?? 0) > 0) continue;
    expect(live(state)).not.toContain('class="zonebrowser"');
    checked += 1;
    if (checked > 6) break;
  }
  expect(checked).toBeGreaterThan(0);
});

test('every strip and the revealed library carry a way to open it', () => {
  const state = stateWithOpenZones();
  const html = live(state);
  // The caption is the affordance (report 10 §2.3's 45 px strips are unchanged).
  expect(html).toContain('zonerow__open');
  expect(html).toMatch(/open [^"]*graveyard/);
});
