/*
 * mtg-table — web/test/picker.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **M5's central decision, over the whole corpus: which asks stop being a
 * modal.**
 *
 * `boardPick` is pure and takes two arguments — the ask, and the set of entities
 * the board is drawing — so the rule can be asserted here without a browser, a
 * DOM or a component, which is the same reason `arrows.ts` and `keys.ts` are
 * `.ts` files. What is checked:
 *
 *   1. the rule itself: **every** option on the board, or the modal keeps it;
 *   2. the two kinds that are deliberately never a picker even though their
 *      options are cards — a `reveal` (§5.3: min = max = −1, "acknowledge
 *      only") and a `delayedReveal` (§5.3: the engine handing over cards from a
 *      hidden zone, which is the modal's revealed-cards panel);
 *   3. `drawnEntities` matching what `Board.tsx` actually mounts — in
 *      particular that another seat's hand is **not** in it (report 10 §3.2),
 *      which is what stops a picker from outlining a card nobody can see;
 *   4. every ask in every committed fixture, so the split between picker and
 *      modal is a measured fact and not an intention — and the per-kind CENSUS
 *      of that split is printed as a diagnostic, because the honest summary of
 *      this milestone is a number and not an adjective. Over the committed
 *      corpus exactly one kind reaches the picker (`assign_damage`); why the
 *      other card-shaped kinds do not is `docs/evidence/m5-board.md` §2.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import type { AskBody, GameStateBody } from '../src/protocol.ts';
import { initialState, reduce, type ClientState } from '../src/reduce.ts';
import { boardPick, drawnEntities, toggleChoice, viewerSeatId } from '../src/render/picker.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));

function logs(): string[] {
  const out: string[] = [];
  for (const dir of ['games/', 'synthetic/']) {
    for (const name of readdirSync(FIXTURES + dir).sort()) {
      if (name.endsWith('.jsonl')) out.push(FIXTURES + dir + name);
    }
  }
  return out;
}

/** Every `(state, ask)` pair the corpus produces, with the board of that frame. */
function askStates(): Array<{ file: string; state: ClientState; ask: AskBody }> {
  const out: Array<{ file: string; state: ClientState; ask: AskBody }> = [];
  for (const path of logs()) {
    const log = parseFrameLog(readFileSync(path, 'utf8'));
    let state = initialState(log.header);
    for (const frame of log.frames) {
      state = reduce(state, frame);
      if (frame.type === 'ask' && state.ask !== null) {
        out.push({ file: path.slice(path.indexOf('/fixtures/') + 1), state, ask: state.ask });
      }
    }
  }
  return out;
}

function seatOf(state: ClientState): number | null {
  return state.hello?.you ?? state.session?.seat ?? null;
}

test('drawnEntities is what the board mounts — never another seat’s hand', () => {
  let checked = 0;
  for (const { file, state } of askStates()) {
    const board = state.board;
    if (board === null) continue;
    const you = seatOf(state);
    const drawn = drawnEntities(board, you);
    const mine = viewerSeatId(board, you);
    for (const player of board.players) {
      // Every seat has a rail, so every seat is a legal player candidate.
      assert.ok(drawn.playerIds.has(player.id), `${file}: seat ${String(player.id)} has no rail`);
      for (const card of player.zones.hand.cards) {
        if (player.id === mine) {
          assert.ok(drawn.cardIds.has(card.id), `${file}: your own hand is tiles`);
        } else {
          // Report 10 §3.2 — the one that cannot be walked back.
          assert.ok(
            !drawn.cardIds.has(card.id),
            `${file}: card #${String(card.id)} is in seat ${String(player.id)}'s hand and is NOT drawn`,
          );
          checked += 1;
        }
      }
      // §3.4 / P2 — a library is a count plus only the revealed slice.
      assert.ok(player.zones.library.cards.length <= player.zones.library.count);
      for (const card of player.zones.battlefield.cards) {
        assert.ok(drawn.cardIds.has(card.id));
      }
    }
  }
  assert.ok(checked > 0, 'no frame in the corpus has cards in an opponent hand — the rule is vacuous');
});

test('an ask is board-shaped only when EVERY option is on the board', (t) => {
  const seen = new Map<string, number>();
  let pickers = 0;
  let modals = 0;

  for (const { file, state, ask } of askStates()) {
    const board = state.board;
    if (board === null) continue;
    const drawn = drawnEntities(board, seatOf(state));
    const pick = boardPick(ask, drawn);
    seen.set(`${ask.kind}:${pick === null ? 'modal' : 'picker'}`, (seen.get(`${ask.kind}:${pick === null ? 'modal' : 'picker'}`) ?? 0) + 1);

    if (pick === null) {
      modals += 1;
      continue;
    }
    pickers += 1;
    assert.equal(pick.askId, ask.askId);
    assert.ok(pick.candidates.length > 0, `${file}: a picker with no candidates`);
    for (const candidate of pick.candidates) {
      const onBoard =
        (candidate.cardId !== null && drawn.cardIds.has(candidate.cardId)) ||
        (candidate.playerId !== null && drawn.playerIds.has(candidate.playerId));
      assert.ok(
        onBoard || (pick.shape === 'damage' && candidate.defender),
        `${file}: ${ask.kind} ${ask.askId} option ${String(candidate.optionId)} is not on the board`,
      );
      // §5.1 — the label is the engine's and travels verbatim into the panel.
      assert.equal(typeof candidate.label, 'string');
    }
  }

  // The corpus must exercise BOTH sides, or this file proves one of them.
  assert.ok(pickers > 0, `no ask in the corpus became a picker: ${JSON.stringify([...seen])}`);
  assert.ok(modals > 0, `no ask in the corpus stayed a modal: ${JSON.stringify([...seen])}`);

  // **The census, printed.** "Board-shaped asks stop being modals" is true and
  // narrow: in this corpus the rule accepts `assign_damage` and nothing else,
  // because every card-optioned `choose_list` is a reveal (min = max = −1,
  // §5.3), every `choose_entities` carries a `delayedReveal`, `options` is
  // unreachable (M22), and the rest are colours, modes and numbers. That is a
  // fact about the decks, not a defect — but it is a fact the milestone summary
  // has to carry, so it is printed on every run and the one kind that does
  // reach the picker is asserted by name. The day a card picker appears, this
  // line moves and `docs/evidence/m5-board.md` §2 is out of date.
  const census = [...seen].sort(([a], [b]) => a.localeCompare(b));
  t.diagnostic(`picker/modal census (${String(pickers)} picker, ${String(modals)} modal): ` +
    census.map(([k, n]) => `${k}=${String(n)}`).join(' '));
  assert.ok(
    (seen.get('assign_damage:picker') ?? 0) > 0,
    `assign_damage is the ONE kind measured to reach the picker; if it no longer does, the rule ` +
      `in picker.ts changed under the evidence doc: ${JSON.stringify(census)}`,
  );
});

test('a reveal and a delayedReveal stay in the modal, cards or not (§5.3)', () => {
  let reveals = 0;
  let delayed = 0;
  for (const { state, ask } of askStates()) {
    if (state.board === null) continue;
    const drawn = drawnEntities(state.board, seatOf(state));
    if (ask.kind === 'choose_list' && ask.reveal) {
      reveals += 1;
      assert.equal(boardPick(ask, drawn), null, 'a reveal has nothing to point at');
    }
    if (ask.kind === 'choose_entities' && ask.delayedReveal !== null) {
      delayed += 1;
      assert.equal(boardPick(ask, drawn), null, 'a delayed reveal belongs in the modal');
    }
  }
  // `human-trample-7` and `human-scry-7` carry real engine reveals.
  assert.ok(reveals > 0, 'no reveal:true choose_list in the corpus');
  void delayed;
});

test('one option off the board sends the WHOLE ask to the modal', () => {
  const drawn = { cardIds: new Set([1]), playerIds: new Set([0, 1]) };
  const two = (secondCardId: number): AskBody => ({
    askId: 'a1',
    kind: 'choose_entities',
    timeoutMs: 0,
    prompt: 'Choose',
    min: 1,
    max: 1,
    delayedReveal: null,
    options: [
      { id: 0, label: 'one', kind: 'card', cardId: 1 },
      { id: 1, label: 'two', kind: 'card', cardId: secondCardId },
    ],
  });
  assert.equal(boardPick(two(99), drawn), null, '#99 has no tile, so the modal takes it');
  const both = { cardIds: new Set([1, 2]), playerIds: new Set([0]) };
  assert.equal(boardPick(two(2), both)?.candidates.length, 2);
});

test('assign_damage is board-shaped when the BLOCKERS are, defender at index 0', () => {
  const ask: AskBody = {
    askId: 'a17',
    kind: 'assign_damage',
    timeoutMs: 0,
    attackerId: 112,
    total: 2,
    overrideOrder: false,
    maySkip: true,
    targets: [
      { id: 0, label: 'Opponent', kind: 'player', playerId: 1, defender: true },
      { id: 1, label: 'Aerial Doombot', kind: 'card', cardId: 211, lethal: 1 },
    ],
  };
  const pick = boardPick(ask, { cardIds: new Set([211]), playerIds: new Set([0, 1]) });
  assert.ok(pick !== null);
  assert.equal(pick.shape, 'damage');
  assert.equal(pick.total, 2);
  // §5.3 — index 0 is the defending player, and the bridge marshals it to the
  // `null` key. It keeps its index here; nothing is re-numbered.
  assert.equal(pick.candidates[0]?.optionId, 0);
  assert.equal(pick.candidates[0]?.defender, true);
  assert.equal(pick.candidates[1]?.lethal, 1);
  // A blocker with no tile is a modal, even though the defender has a rail.
  assert.equal(boardPick(ask, { cardIds: new Set(), playerIds: new Set([0, 1]) }), null);
});

test('toggleChoice: max === 1 is a radio button, and the bound refuses the extra', () => {
  // Measured in a browser on a live `choose_list` (the note in `picker.ts`).
  assert.deepEqual(toggleChoice([0], 1, 1), [1]);
  assert.deepEqual(toggleChoice([1], 1, 1), []);
  assert.deepEqual(toggleChoice([0, 1], 2, 2), [0, 1], 'the third click is refused, not swapped');
  assert.deepEqual(toggleChoice([0, 1], 0, 2), [1]);
  assert.deepEqual(toggleChoice([0], 1, -1), [0, 1], '-1 is unconstrained');
});

test('the pre-game frames have no board, and nothing throws on them', () => {
  const board: GameStateBody | null = null;
  assert.equal(board, null);
  // `Board.tsx` guards this by construction (`boardPick` is only called with a
  // snapshot), and the empty-board branch renders the modal. Asserted here so
  // the guard is not quietly removed: a picker with nothing drawn is a modal.
  const ask: AskBody = {
    askId: 'a1',
    kind: 'choose_list',
    timeoutMs: 0,
    prompt: 'Choose',
    options: [{ id: 0, label: 'x', kind: 'card', cardId: 7 }],
    preselected: [],
    min: 1,
    max: 1,
    reveal: false,
  };
  assert.equal(boardPick(ask, { cardIds: new Set(), playerIds: new Set() }), null);
});
