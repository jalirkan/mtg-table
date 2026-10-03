/*
 * mtg-table — web/test/pool.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **`useMana` — the one real dead end M4 handed over** (`PLAN.md` "What M4 hands
 * to M5"). A state in which Forge expects floating mana to be spent could not be
 * resolved from the browser at all: the console seat had `m W|U|B|R|G|C` and the
 * board had six read-only pips.
 *
 * The act is `{action:"useMana", color}` and **nothing else** (§2.2 — "A
 * `cardId` is a `clickCard`, not a `useMana`"), so the whole of the new
 * behaviour is here plus three lines of markup in `Mana.tsx`, and both halves
 * are asserted: the mapping in this file, and the click that calls it in
 * `board-m5.test.tsx`.
 *
 * The keyboard half lives in `keys.test.ts`, where the rest of `planKey` is.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { MANA_COLORS, type ManaPool } from '../src/protocol.ts';
import { initialState, reduce } from '../src/reduce.ts';
import { manaColorForKey, manaPipAct, poolTotal, spendableColors } from '../src/render/pool.ts';
import { parseFrameLog } from '../src/transport/replay.ts';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));

function pool(partial: Partial<ManaPool>): ManaPool {
  return { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, ...partial };
}

test('a pip click is act useMana with a colour, and nothing else', () => {
  const act = manaPipAct(pool({ U: 2 }), 'U');
  assert.deepEqual(act, { action: 'useMana', color: 'U' });
  // Exactly two keys: a `cardId` here would be a second way to say `clickCard`.
  assert.deepEqual(Object.keys(act ?? {}).sort(), ['action', 'color']);
});

test('a colour the pool does not hold produces no act at all', () => {
  const empty = pool({});
  for (const color of MANA_COLORS) {
    assert.equal(manaPipAct(empty, color), null, `${color} is not floating`);
  }
  // The engine's own number, echoed (§3.1) — not a prediction of payability.
  assert.equal(manaPipAct(pool({ W: 1 }), 'U'), null);
  assert.deepEqual(manaPipAct(pool({ W: 1 }), 'W'), { action: 'useMana', color: 'W' });
});

test('spendableColors is W U B R G C order, zeros dropped', () => {
  assert.deepEqual(spendableColors(pool({ G: 1, W: 2, C: 3 })), ['W', 'G', 'C']);
  assert.deepEqual(spendableColors(pool({})), []);
  assert.equal(poolTotal(pool({ W: 2, C: 3 })), 5);
  assert.equal(poolTotal(pool({})), 0);
});

test('the six letters map to the six colours, and nothing else does', () => {
  for (const color of MANA_COLORS) {
    assert.equal(manaColorForKey(color.toLowerCase()), color);
    assert.equal(manaColorForKey(color), color);
  }
  for (const key of ['x', 'q', '', '1', 'Escape', 'ww']) {
    assert.equal(manaColorForKey(key), null, `${key} is not a colour`);
  }
});

test('every pool in the corpus has all six keys, zeros included (§3.1)', () => {
  let frames = 0;
  let nonEmpty = 0;
  for (const dir of ['games/', 'synthetic/']) {
    for (const name of readdirSync(FIXTURES + dir).sort()) {
      if (!name.endsWith('.jsonl')) continue;
      const log = parseFrameLog(readFileSync(FIXTURES + dir + name, 'utf8'));
      let state = initialState(log.header);
      for (const frame of log.frames) {
        state = reduce(state, frame);
        if (frame.type !== 'state' || state.board === null) continue;
        frames += 1;
        for (const player of state.board.players) {
          for (const color of MANA_COLORS) {
            assert.equal(
              typeof player.manaPool[color],
              'number',
              `${dir}${name}: manaPool.${color} is missing`,
            );
          }
          if (poolTotal(player.manaPool) > 0) nonEmpty += 1;
        }
      }
    }
  }
  assert.ok(frames > 0);
  // Not an assertion about the corpus, a note for whoever reads the evidence:
  // floating mana between frames is rare, because Forge empties the pool at
  // every step boundary and the recordings are snapshots.
  void nonEmpty;
});
