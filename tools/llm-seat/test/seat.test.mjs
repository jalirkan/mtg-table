// mtg-table — tools/llm-seat/test/seat.test.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The seat end to end over a real socket, against test/fake-bridge.mjs (a
// scripted engine, not Forge) with the fake model: a land at priority (a
// model call, phase stops synced first), priority with nothing playable
// (auto-pass, no call), a choose_list ask (a call), an attack (clicks, then OK
// on the re-pushed prompt), a refused click (the default on the same input),
// and the `over`.  Then the files: decisions.jsonl, games.jsonl, the frame log.

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { makeFakeModel } from '../lib/model.mjs';
import { parseArgs, runSeat } from '../seat.mjs';
import { startFakeBridge } from './fake-bridge.mjs';
import { ORACLE, creature, input, land, priorityInput, state } from './helpers.mjs';

const isAct = (action, extra = {}) => (f) => f.type === 'act' && f.body.action === action && Object.entries(extra).every(([k, v]) => f.body[k] === v);

test('a whole (scripted) game through the socket', async () => {
  const bear = (extra = {}) => creature(11, 'Grizzly Bears', 2, 2, extra);
  const bridge = await startFakeBridge(async (c) => {
    c.send('hello_ok', { gameId: 'fake-1', you: 0, seed: 1, forgeVersion: 'test', players: [{ id: 0, name: 'Human', isAi: false }, { id: 1, name: 'Forge AI', isAi: true }] });
    // 1. turn 1: a land and a creature in hand; Forge lists only the land
    c.send('state', state({ turn: 1, me: { hand: [land(10), bear()] }, events: [{ kind: 'turn', player: 0, turn: 1 }],
      playable: [{ cardId: 10, zone: 'hand', abilities: [{ abilityId: 1, label: 'Play land', isSpell: false }] }] }));
    c.send('input', priorityInput(1));
    await c.next(isAct('clickCard', { cardId: 10 }));
    c.send('input', priorityInput(1));   // the bridge's echo of the old prompt (awaitNextInput) comes first
    // 2. the land is down; nothing else playable: the seat passes with no call
    c.send('state', state({ turn: 1, me: { hand: [bear()], battlefield: [land(10, 'Forest', { zone: 'battlefield' })] },
      events: [{ kind: 'land', player: 0, cardId: 10 }], playable: [] }));
    c.send('input', priorityInput(1));
    await c.next(isAct('passPriority'));
    c.send('input', priorityInput(1));   // the echo again, now with priority gone to the AI: not a question
    // 3. an ask with three answers
    c.send('state', state({ turn: 2, phase: 'MAIN1', active: 1, priority: 1, me: { hand: [bear()], battlefield: [land(10, 'Forest', { zone: 'battlefield' })] }, events: [{ kind: 'turn', player: 1, turn: 2 }] }));
    await new Promise((r) => setTimeout(r, 400));   // the AI thinks; the stale prompt must not be answered
    c.send('ask', { askId: 'a1', kind: 'choose_list', timeoutMs: 0, prompt: 'Choose a color', options: ['White', 'Blue', 'Green'].map((l, i) => ({ id: i, label: l, kind: 'color' })), preselected: [], min: 1, max: 1, reveal: false });
    const ans = await c.next((f) => f.type === 'answer');
    assert.deepEqual(ans.body, { askId: 'a1', value: [0] });
    // 4. turn 3: the bear attacks -- a click, then OK on the re-pushed prompt
    const bf = [land(10, 'Forest', { zone: 'battlefield' }), bear({ zone: 'battlefield' })];
    c.send('state', state({ turn: 3, phase: 'COMBAT_DECLARE_ATTACKERS', me: { battlefield: bf }, events: [{ kind: 'turn', player: 0, turn: 3 }] }));
    const atk = 'Select creatures to attack Forge AI or select player/card you wish to attack.';
    c.send('input', input(atk, { ok: ['OK', true], cancel: ['Alpha Strike', true] }));
    await c.next(isAct('clickCard', { cardId: 11 }));
    c.send('input', input(`${atk}\n(1 attacking)`, { ok: ['OK', true], cancel: ['Call Back', true] }));
    await c.next(isAct('buttonOk'));
    // 5. main 2: Forge lists the bear but refuses the click; the seat plays the default (pass)
    c.send('state', state({ turn: 3, phase: 'MAIN2', me: { battlefield: bf, hand: [creature(12, 'Grizzly Bears', 2, 2)] },
      playable: [{ cardId: 12, zone: 'hand', abilities: [{ abilityId: 3, label: 'Grizzly Bears', isSpell: true }] }] }));
    c.send('input', priorityInput(3, 'Main phase, postcombat'));
    await c.next(isAct('clickCard', { cardId: 12 }));
    c.send('notice', { level: 'warn', title: 'Not selectable', text: 'card 12 cannot be selected now' });
    c.send('input', priorityInput(3, 'Main phase, postcombat'));
    await c.next(isAct('passPriority'));
    // 6. the end
    c.send('state', state({ turn: 3, phase: 'MAIN2', me: { battlefield: bf }, gameOver: { winner: 0, reason: 'AllOpponentsLost' }, events: [{ kind: 'outcome', winner: 0, lastTurn: 3 }] }));
    c.send('over', { winner: 0, reason: 'AllOpponentsLost', matchOver: true });
  });
  let scriptError = null;
  bridge.server.on('script-error', (e) => { scriptError = e; });
  const out = mkdtempSync(join(tmpdir(), 'llm-seat-e2e-'));
  const a = { ...parseArgs(['--port', String(bridge.port), '--mode', 'decision', '--run', 'e2e', '--quiet', '--timeout', '30']), out };
  const summary = await runSeat(a, { model: makeFakeModel(), oracle: ORACLE });
  await bridge.close();
  assert.equal(scriptError, null, scriptError?.message);
  assert.equal(summary.result, 'win');
  assert.equal(summary.exit, 0);
  assert.equal(summary.modelCalls, 4, 'land, choose_list, attack, the refused cast');
  assert.equal(summary.refused, 1);
  assert.equal(summary.fallbacks, 1);

  // phase stops were synced before the first model decision's move
  const sent = bridge.received.filter((f) => f.type === 'act');
  const firstClick = sent.findIndex(isAct('clickCard', { cardId: 10 }));
  const stopActs = sent.slice(0, firstClick).filter((f) => f.body.action === 'setPhaseStop');
  assert.deepEqual(stopActs.map((f) => `${f.body.turn} ${f.body.phase} ${f.body.stop}`).sort(), [
    'opp COMBAT_BEGIN false', 'opp COMBAT_DECLARE_ATTACKERS false', 'opp COMBAT_DECLARE_BLOCKERS false', 'opp END_OF_TURN false', 'own COMBAT_DECLARE_BLOCKERS false']);

  const decisions = readFileSync(join(out, 'e2e', 'decisions.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(decisions.map((d) => `${d.kind}:${d.how}`), ['priority:model', 'priority:auto', 'ask:choose_list:model', 'attack:model', 'priority:model', 'priority:fallback']);
  const first = decisions[0];
  for (const k of ['game', 'seat', 'stateSeq', 'kind', 'options', 'chosen', 'how', 'arm', 'sessionPos', 'retries', 'calls']) assert.ok(k in first, `decision field ${k}`);
  assert.equal(first.game, 'fake-1');
  assert.equal(first.token, 'land:10');
  assert.ok(first.calls[0].promptBytes > 500);
  assert.equal(decisions[3].token, 'attack:11');
  const games = readFileSync(join(out, 'e2e', 'games.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(games.length, 1);
  assert.equal(games[0].turns, 3);
  const log = readFileSync(join(out, 'e2e', 'frames', 'fake-1.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(log[0].kind, 'session');
  assert.equal(log[0].recordedBy, 'client');
  assert.ok(log.some((f) => f.dir === 'c2s' && f.type === 'answer'));
  assert.equal(log.at(-1).type, 'over');
});
