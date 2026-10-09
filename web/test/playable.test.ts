/*
 * mtg-table — web/test/playable.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Amendment M61 (decision D413): `state.playable` through the fold and out of
 * its one reader, `playableOf`.
 *
 *   1. the list survives the reducer (the board is replaced, the key kept);
 *   2. absent (every committed recording predates it) and `null` (off the
 *      seat's priority) both read as `null` — "the frame does not say" —
 *      never as an empty list;
 *   3. a malformed entry (no abilities, a zone it may not name, a non-integer
 *      id) is dropped, the rest kept.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { initialState, reduce } from '../src/reduce.ts';
import { activatableOf, playableOf, type Frame, type GameStateBody } from '../src/protocol.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const FAMILIAR = {
  cardId: 41,
  zone: 'graveyard',
  abilities: [{ abilityId: 912, label: 'Return Cauldron Familiar from your graveyard to the battlefield.', isSpell: false }],
};

function stateBody(extra: Record<string, unknown>): GameStateBody {
  return {
    gameId: 'g', turn: 3, round: 2, phase: 'MAIN1', activePlayer: 0, priority: 0, gameOver: null,
    players: [], stack: [], stackCards: [], combat: null, events: [], ...extra,
  } as unknown as GameStateBody;
}

test('M61: state.playable survives the fold and reads back', () => {
  const f = { v: 1, seq: 1, t: 1757600000000, type: 'state', body: stateBody({ playable: [FAMILIAR] }) } as unknown as Frame;
  const s = reduce(initialState(), f);
  assert.deepEqual(playableOf(s.board), [FAMILIAR]);
});

test('M61: absent and null both read as null, and an empty list as an empty list', () => {
  assert.equal(playableOf(stateBody({})), null);
  assert.equal(playableOf(stateBody({ playable: null })), null);
  assert.equal(playableOf(null), null);
  assert.deepEqual(playableOf(stateBody({ playable: [] })), []);
});

test('M61: malformed entries are dropped, the rest kept', () => {
  const list = playableOf(stateBody({
    playable: [
      FAMILIAR,
      { cardId: 42, zone: 'graveyard', abilities: [] },
      { cardId: 43, zone: 'battlefield', abilities: FAMILIAR.abilities },
      { cardId: 'x', zone: 'hand', abilities: FAMILIAR.abilities },
      { cardId: 44, zone: 'exile', abilities: [{ abilityId: 1, label: 7, isSpell: true }] },
    ],
  }));
  assert.deepEqual(list?.map((e) => e.cardId), [41]);
});

test('M61: every committed recording predates the key, and reads null throughout', () => {
  const dir = fileURLToPath(new URL('../../fixtures/games/', import.meta.url));
  let states = 0;
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.jsonl'))) {
    const { frames } = parseFrameLog(readFileSync(dir + name, 'utf8'));
    for (const fr of frames) {
      if (fr.type !== 'state') continue;
      states += 1;
      assert.equal(playableOf(fr.body), null, `${name} seq ${String(fr.seq)}`);
    }
  }
  assert.ok(states > 0);
});

// Amendment M63 (decision D420): `state.activatable`, the battlefield's half,
// through the fold and out of its one reader, `activatableOf`.
const CLUE = {
  cardId: 7,
  zone: 'battlefield',
  abilities: [{ abilityId: 546, label: '{2}, Sacrifice this token: Draw a card.', isSpell: false }],
};

test('M63: state.activatable survives the fold and reads back; playable is untouched', () => {
  const f = { v: 1, seq: 1, t: 1757600000000, type: 'state', body: stateBody({ playable: [FAMILIAR], activatable: [CLUE] }) } as unknown as Frame;
  const s = reduce(initialState(), f);
  assert.deepEqual(activatableOf(s.board), [CLUE]);
  assert.deepEqual(playableOf(s.board), [FAMILIAR]);
});

test('M63: absent and null read as null, an empty list as an empty list, malformed entries dropped', () => {
  assert.equal(activatableOf(stateBody({})), null);
  assert.equal(activatableOf(stateBody({ activatable: null })), null);
  assert.deepEqual(activatableOf(stateBody({ activatable: [] })), []);
  const list = activatableOf(stateBody({
    activatable: [
      CLUE,
      { cardId: 8, zone: 'hand', abilities: CLUE.abilities },
      { cardId: 9, zone: 'battlefield', abilities: [] },
      { cardId: 10, zone: 'battlefield', abilities: [{ abilityId: 1, label: 'x', isSpell: true }] },
    ],
  }));
  assert.deepEqual(list?.map((e) => e.cardId), [7]);
});
