// mtg-table — tools/llm-seat/test/answer-rule.test.mjs
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Amendment M68 (D426) in the LLM seat: the answers it builds without the model
// are ones the bridge's rule takes (an assign_amount within each target's
// `min`/`max`, adding up to `total`), and a re-asked question carries the
// bridge's `reason` into the decision's context.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { classifyAsk, defaultAnswer } from '../lib/decision.mjs';

const sum = (m) => Object.values(m).reduce((a, b) => a + b, 0);

test('M68: assign_amount with atLeastOne gives every target its min and adds up to the total', () => {
  const ask = { kind: 'assign_amount', total: 3, atLeastOne: true, targets: [
    { id: 0, label: 'a', kind: 'entity', min: 1, max: 3 }, { id: 1, label: 'b', kind: 'entity', min: 1, max: 3 }] };
  const v = defaultAnswer('assign_amount', ask);
  assert.deepEqual(v, { 0: 2, 1: 1 });
  assert.equal(sum(v), 3);
});

test('M68: assign_amount over capped targets (mana of different colours) respects every max', () => {
  const ask = { kind: 'assign_amount', total: 2, atLeastOne: false, targets: [
    { id: 0, label: 'W', kind: 'color', min: 0, max: 1 }, { id: 1, label: 'U', kind: 'color', min: 0, max: 1 },
    { id: 2, label: 'B', kind: 'color', min: 0, max: 1 }] };
  assert.deepEqual(defaultAnswer('assign_amount', ask), { 0: 1, 1: 1, 2: 0 });
});

test('M68: a bridge before M68 (no min/max) still gets an answer that adds up', () => {
  const ask = { kind: 'assign_amount', total: 4, atLeastOne: true, targets: [{ id: 0, label: 'a', kind: 'entity' }, { id: 1, label: 'b', kind: 'entity' }] };
  const v = defaultAnswer('assign_amount', ask);
  assert.equal(sum(v), 4);
  assert.ok(v[1] >= 1);
});

test('M68: a re-asked question tells the model why its last answer was refused', () => {
  const state = { players: [] };
  const ask = { askId: 'a7', kind: 'choose_list', prompt: 'Choose a card', min: 1, max: 1, reveal: false,
    reason: 'Choose exactly 1 option (this answer chose 0).',
    options: [{ id: 0, label: 'Plains', kind: 'card' }, { id: 1, label: 'Island', kind: 'card' }] };
  const d = classifyAsk({ state, ask });
  assert.ok(d.context.some((c) => /refused your last answer: Choose exactly 1 option/.test(c)), JSON.stringify(d.context));
});
