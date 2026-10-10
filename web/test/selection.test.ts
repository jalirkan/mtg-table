/*
 * mtg-table — web/test/selection.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Amendments M64–M66 (decisions D421–D423) through their readers, on REAL
 * frames (`fixtures/select-probe/m64-m66-frames.json`, cut from the bridge's
 * frame logs of `tools/ws-select-probe.mjs` against Forge 2.0.14):
 *
 *   1. `state.yield.kind` `endStepOrOpponent` folds and reads back through
 *      `yieldOf`, with the turn player and `END_OF_TURN`;
 *   2. `selectablePlayersOf` — Lightning Bolt lists both seats, Into the Void
 *      none (`[]`, a fact), an input the bridge cannot read `null`, and a frame
 *      from before M66 (no key) `null` too: never "no player";
 *   3. `chosenOf` — the block Forge holds while the state shows none, the
 *      creature chosen after one click, the attacker declared; `null` when the
 *      key is absent, `null` or malformed.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { initialState, reduce } from '../src/reduce.ts';
import {
  chosenOf,
  selectablePlayersOf,
  yieldOf,
  YIELD_KINDS,
  type Frame,
  type GameStateBody,
  type InputBody,
} from '../src/protocol.ts';

interface Cut { dir: string; seq: number; type: string; body: unknown }
const FX = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../fixtures/select-probe/m64-m66-frames.json', import.meta.url)), 'utf8'),
) as Record<string, Cut[]>;
const at = (part: string, seq: number, dir = 's2c'): Cut => {
  const f = (FX[part] ?? []).find((x) => x.seq === seq && x.dir === dir);
  assert.ok(f, `${part} ${dir} ${String(seq)} is in the fixture`);
  return f;
};
const inputOf = (part: string, seq: number): InputBody => at(part, seq).body as InputBody;
const stateOf = (part: string, seq: number): GameStateBody => at(part, seq).body as GameStateBody;

test('M64: endStepOrOpponent is a yield kind, and a real state carrying it folds and reads back', () => {
  assert.ok((YIELD_KINDS as readonly string[]).includes('endStepOrOpponent'));
  const f = { v: 1, t: 0, ...at('yieldEndStep', 150) } as unknown as Frame;
  const s = reduce(initialState(), f);
  assert.deepEqual(yieldOf(s.board), { kind: 'endStepOrOpponent', playerId: 1, phase: 'END_OF_TURN' });
  // the act that started it, and the stop: the end step, with the yield gone
  assert.deepEqual(at('yieldEndStep', 35, 'c2s').body, { action: 'yieldTo', kind: 'endStepOrOpponent' });
  const stop = stateOf('yieldEndStep', 156);
  assert.equal(stop.phase, 'END_OF_TURN');
  assert.equal(yieldOf(stop), null);
  // refused in the end step itself, with nothing else changed
  assert.deepEqual(at('yieldEndStep', 161).body, { level: 'warn', title: 'yieldTo', text: 'the end step has already begun: pass priority instead' });
  // ended by the opponent's spell (the bridge's own rule, Forge's interrupts off): the state 318 stack is theirs
  const before = stateOf('yieldOpponent', 317);
  const after = stateOf('yieldOpponent', 318);
  assert.equal(yieldOf(before)?.kind, 'endStepOrOpponent');
  assert.equal(yieldOf(after), null);
  assert.deepEqual(after.stack.map((x) => x.controller), [1]);
});

test('M66: selectablePlayersOf reads the engine\'s list, [] as a fact, null when the frame does not say', () => {
  assert.deepEqual(selectablePlayersOf(inputOf('bolt', 72)), [0, 1], 'Lightning Bolt: any target');
  assert.deepEqual(selectablePlayersOf(inputOf('void', 351)), [], 'Into the Void: creatures only');
  assert.deepEqual(selectablePlayersOf(inputOf('attack', 834)), [1], 'the attack: the defending player');
  const old = structuredClone(inputOf('bolt', 72)) as InputBody;
  delete (old.selectable as { playerIds?: unknown }).playerIds;
  assert.equal(selectablePlayersOf(old), null, 'before M66: the frame does not say');
  const unread = structuredClone(old);
  unread.selectable.playerIds = null;
  assert.equal(selectablePlayersOf(unread), null);
  const bad = structuredClone(old) as unknown as { selectable: { playerIds: unknown } };
  bad.selectable.playerIds = ['1'];
  assert.equal(selectablePlayersOf(bad as unknown as InputBody), null);
});

test('M65: chosenOf reads what the input already holds', () => {
  const block = chosenOf(inputOf('block', 625));
  assert.deepEqual(block?.blocks, [{ blockerId: 28, attackerId: 69 }]);
  assert.deepEqual(block?.cardIds, [28]);
  assert.deepEqual(
    stateOf('block', 615).combat?.bands.flatMap((b) => b.blockerIds),
    [],
    'the state before OK shows no blocker: the declaration is only in chosen',
  );
  assert.deepEqual(chosenOf(inputOf('void', 351))?.cardIds, [], 'before the click');
  assert.deepEqual(chosenOf(inputOf('void', 353))?.cardIds, [52], 'one of up to two chosen');
  assert.deepEqual(chosenOf(inputOf('attack', 834))?.attacks, [{ attackerId: 20, defender: { kind: 'player', id: 1 } }]);
  const none = structuredClone(inputOf('void', 351)) as InputBody;
  none.selectable.chosen = null;
  assert.equal(chosenOf(none), null);
  delete (none.selectable as { chosen?: unknown }).chosen;
  assert.equal(chosenOf(none), null, 'before M65');
  const bad = structuredClone(inputOf('void', 353)) as unknown as { selectable: { chosen: Record<string, unknown> } };
  delete bad.selectable.chosen.blocks;
  assert.equal(chosenOf(bad as unknown as InputBody), null, 'a malformed object is not read');
});
