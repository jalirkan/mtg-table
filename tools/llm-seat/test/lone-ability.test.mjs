// mtg-table — tools/llm-seat/test/lone-ability.test.mjs
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Amendment M69 (D427) in the LLM seat: a click on one of its own permanents
// whose only ability gives something up (Carrion Feeder's "Sacrifice a
// creature") now raises a one-option `ability_menu` instead of activating at
// once. The seat clicks a permanent only for an activation it chose, so that
// menu is answered with the ability -- on the REAL asks of
// fixtures/cost-probe/m69-frames.json, cut from tools/ws-cost-probe.mjs's run.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { classifyAsk } from '../lib/decision.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, '..', '..', '..', 'fixtures', 'cost-probe', 'm69-frames.json'), 'utf8'));
const menuOf = (key) => fx[key].frames.find((f) => f.type === 'ask' && f.body.kind === 'ability_menu').body;
const stateBefore = (key) => fx[key].frames.find((f) => f.type === 'state')?.body ?? { players: [] };

for (const key of ['Carrion Feeder:look', 'Sakura-Tribe Elder:look', 'Wild Mongrel:look', 'Greed:look']) {
  test(`M69: ${key.split(':')[0]}'s one-option menu (a real ask) is answered with the ability the seat chose`, () => {
    const ask = menuOf(key);
    assert.equal(ask.options.length, 1, 'a lone ability raises a one-option menu');
    const opt = ask.options[0];
    const d = classifyAsk({ state: stateBefore(key), ask, intent: { cardId: ask.cardId, abilityId: opt.abilityId, abilityLabel: opt.label } });
    assert.deepEqual(d.auto?.moves, [{ type: 'answer', askId: ask.askId, value: opt.id }]);
  });
}

test('M69: with no intent, a one-option menu still answers with its one ability (the seat never clicks to look)', () => {
  const ask = menuOf('Carrion Feeder:look');
  const d = classifyAsk({ state: stateBefore('Carrion Feeder:look'), ask });
  assert.deepEqual(d.auto?.moves, [{ type: 'answer', askId: ask.askId, value: ask.options[0].id }]);
});
