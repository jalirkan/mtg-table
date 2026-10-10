// mtg-table — tools/llm-seat/test/assign-damage.test.mjs
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Amendment M67 (D424) in the LLM seat: its assign_damage answer reads
// `defenderAllowed`, on REAL asks (fixtures/assign-probe/m67-frames.json, cut
// from tools/ws-assign-probe.mjs's run on the real engine) and on the shapes a
// bridge before M67 sends. Every answer it builds is one the bridge's rule takes.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { defaultAnswer } from '../lib/decision.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, '..', '..', '..', 'fixtures', 'assign-probe', 'm67-frames.json'), 'utf8'));
const firstAsk = (part) => fx[part].find((f) => f.type === 'ask' && f.body.kind === 'assign_damage').body;
const sum = (m) => Object.values(m).reduce((a, b) => a + b, 0);

test('M67: a blocked non-trampler (defenderAllowed false) gives the defender nothing, and the legal split the engine applied', () => {
  const ask = firstAsk('nonTrample');
  assert.equal(ask.defenderAllowed, false);
  const v = defaultAnswer('assign_damage', ask);
  assert.equal(v[0], undefined);
  assert.equal(sum(v), ask.total);
  // lethal to each 2/1 Razorgrass Screen: the split the probe's legal answer made, applied by the engine
  const applied = fx.nonTrample.filter((f) => f.type === 'answer').at(-1).body.value;
  assert.deepEqual(v, applied);
});

test('M67: a trampler (defenderAllowed true) puts lethal on each blocker and the excess on the defender', () => {
  const ask = firstAsk('trample');
  assert.equal(ask.defenderAllowed, true);
  const v = defaultAnswer('assign_damage', ask);
  const blockers = ask.targets.filter((t) => t.defender !== true);
  for (const t of blockers) assert.equal(v[t.id], t.lethal);
  assert.equal(v[0], ask.total - blockers.reduce((a, t) => a + t.lethal, 0));
  assert.ok(v[0] > 0);
  assert.equal(sum(v), ask.total);
});

test('M67: before M67 (no defenderAllowed) nothing goes to the defender while a creature blocks', () => {
  const ask = structuredClone(firstAsk('trample'));
  delete ask.defenderAllowed;
  delete ask.reason;
  const v = defaultAnswer('assign_damage', ask);
  assert.equal(v[0], undefined);
  assert.equal(sum(v), ask.total);
});

test('M67: a blocker already dealt lethal (lethal 0) takes nothing from a trampler', () => {
  const v = defaultAnswer('assign_damage', { total: 3, defenderAllowed: true,
    targets: [{ id: 0, defender: true, lethal: null }, { id: 1, defender: false, lethal: 0 }, { id: 2, defender: false, lethal: 2 }] });
  assert.deepEqual(v, { 2: 2, 0: 1 });
});
