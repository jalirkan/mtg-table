// mtg-table — tools/llm-seat/test/selection.test.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Amendments M65 / M66 (D422, D423) in the seat, against REAL frames: the
// fixture (fixtures/select-probe/m64-m66-frames.json) is cut from tools/ws-select-probe.mjs's run on the real engine
// (seed 11, decks/select-probe.dck against Doom Legion; its `source` says so).
//
//   - a block declaration: Forge holds the Gray Ogre's block of Kang (input
//     625's `selectable.chosen.blocks`) while the state still shows no blocker
//     (state 615; only state 630, after OK, does) -- the seat's declared blocks
//     are the engine's, whatever the seat's own record says;
//   - Lightning Bolt ("any target"): the players offered are exactly
//     `selectable.playerIds`, no prompt guessing;
//   - Into the Void ("up to two target creatures"): after one click the input
//     holds the creature (input 353), and a choice that includes it does not
//     click it again (that would take it back);
//   - an attack declaration: the attacker already declared is the engine's
//     (input 834), not the state's.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { classifyInput, engineChosen, enginePlayers, inputKindOf, movesFor } from '../lib/decision.mjs';
import { SeatCore } from '../lib/seat-core.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, '..', '..', '..', 'fixtures', 'select-probe', 'm64-m66-frames.json'), 'utf8'));
const at = (part, seq) => {
  const f = fx[part].find((x) => x.seq === seq);
  assert.ok(f, `${part} frame ${seq} is in the fixture`);
  return f;
};
const first = (part, type) => fx[part].find((x) => x.type === type);

function seat() {
  const core = new SeatCore({ send: () => {}, arm: null, oracle: null, log: () => {}, say: () => {} });
  core.onFrame({ v: 1, seq: 0, type: 'hello_ok', body: { gameId: 'select-probe', you: 0 } });
  return core;
}

test('M65 block: the declared block is the engine\'s (chosen.blocks) while the state still shows none', () => {
  const before = at('block', 615).body;
  const declared = at('block', 625).body;
  assert.deepEqual(before.combat.bands.flatMap((b) => b.blockerIds), [], 'state 615: no blocker on the wire yet');
  assert.deepEqual(engineChosen(declared).blocks, [{ blockerId: 28, attackerId: 69 }]);
  assert.deepEqual(engineChosen(declared).cardIds, [28]);
  const after = at('block', 630).body;
  const engine = after.combat.bands.flatMap((b) => b.blockerIds.map((blockerId) => ({ attackerId: b.attackerIds[0], blockerId })));
  assert.deepEqual(engine, [{ attackerId: 69, blockerId: 28 }], 'state 630 (after OK) says the same');

  // The seat never clicked here (its own record is empty): the engine's word wins.
  const core = seat();
  core.onFrame({ v: 1, ...at('block', 615) });
  core.onFrame({ v: 1, ...at('block', 619) });
  assert.deepEqual(core.declaredBlocks(), [], 'input 619: nothing declared yet');
  core.onFrame({ v: 1, ...at('block', 625) });
  assert.deepEqual(core.declaredBlocks(), [{ attackerId: 69, blockerId: 28 }]);
  const d = core.currentInputDecision();
  assert.equal(d.kind, 'block');
  assert.deepEqual(d.declared, [{ attackerId: 69, blockerId: 28 }]);
});

test('M66 Lightning Bolt: the players offered are exactly selectable.playerIds', () => {
  const st = first('bolt', 'state').body;
  const inp = at('bolt', 72).body;
  assert.deepEqual(enginePlayers(inp), [0, 1]);
  const d = classifyInput({ state: st, input: inp, me: 0, oracle: null });
  assert.equal(d.kind, 'select');
  assert.deepEqual(d.options.filter((o) => o.token?.startsWith('target:player')).map((o) => o.moves[0].playerId), [0, 1]);
  // The same real frame with the engine listing only the opponent (Leyline of
  // Sanctity on the seat's side would do it; SelectionSelfTest holds that rule):
  // the seat offers the opponent alone, whatever the prompt's words say.
  const narrowed = structuredClone(inp);
  narrowed.selectable.playerIds = [1];
  const n = classifyInput({ state: st, input: narrowed, me: 0, oracle: null });
  assert.deepEqual(n.options.filter((o) => o.token?.startsWith('target:player')).map((o) => o.moves[0].playerId), [1]);
});

test('M66: a player-only choice with mode "none" and no cards is a selection when the engine lists players', () => {
  const st = first('bolt', 'state').body;
  const inp = structuredClone(at('bolt', 72).body);
  assert.equal(inp.selectable.mode, 'none');
  assert.deepEqual(inp.selectable.cardIds, []);
  inp.prompt = 'Duress (90) - Select target opponent';   // no "any target" words for the old guess to find
  inp.selectable.playerIds = [1];
  assert.equal(inputKindOf(inp, st, 0), 'select');
  const d = classifyInput({ state: st, input: inp, me: 0, oracle: null });
  assert.deepEqual(d.options.filter((o) => !o.button).map((o) => o.moves[0].playerId), [1]);
});

test('M66 Into the Void (creatures only): the engine lists no player, and none is offered', () => {
  const st = first('void', 'state').body;
  const inp = at('void', 351).body;
  assert.deepEqual(enginePlayers(inp), []);
  const d = classifyInput({ state: st, input: inp, me: 0, oracle: null });
  assert.ok(d.options.every((o) => !o.token?.startsWith('target:player')));
});

test('M65 Into the Void: after one click the input holds the creature, and a choice keeping it does not click it again', () => {
  const st = first('void', 'state').body;
  const held = at('void', 353).body;
  assert.deepEqual(engineChosen(held).cardIds, [52], 'input 353: 1 of up to 2 chosen');
  const d = classifyInput({ state: st, input: held, me: 0, oracle: null });
  assert.equal(d.multi, true);
  const n = d.options.find((o) => o.cardId === 52)?.n;
  assert.ok(n !== undefined);
  assert.deepEqual(movesFor(d, [n]).map((m) => m.action), ['buttonOk'], 'held and wanted: OK alone');
  // before the click (input 351) the same choice clicks it
  const fresh = classifyInput({ state: st, input: at('void', 351).body, me: 0, oracle: null });
  const m = movesFor(fresh, [fresh.options.find((o) => o.cardId === 52).n]);
  assert.deepEqual(m.map((x) => x.cardId ?? x.action), [52, 'buttonOk']);
});

test('M65 attack: the attacker already declared is the engine\'s (chosen.attacks), not the state\'s', () => {
  const st = first('attack', 'state').body;
  const inp = at('attack', 834).body;
  assert.deepEqual(engineChosen(inp).attacks, [{ attackerId: 20, defender: { kind: 'player', id: 1 } }]);
  assert.deepEqual(enginePlayers(inp), [1], 'InputAttack: the defending player is the one player a click is taken for');
  const card = st.players[0].zones.battlefield.cards.find((c) => c.id === 20);
  assert.equal(card.attacking, false, 'the state before the declaration does not show it');
  const d = classifyInput({ state: st, input: inp, me: 0, oracle: null });
  assert.equal(d.kind, 'attack');
  assert.deepEqual(d.current, [20]);
  // wanting exactly that attacker clicks nothing more than OK
  const n = d.options.find((o) => o.cardId === 20)?.n;
  if (n !== undefined) assert.deepEqual(movesFor(d, [n]).map((x) => x.action), ['buttonOk']);
});
