// mtg-table — tools/llm-seat/test/activatable.test.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Amendment M63 (D420): the seat offers the battlefield's activations exactly
// from the engine's `state.activatable` -- a loyalty ability, a named equip, a
// Clue token with no card text -- and names one of several by its cost or its
// words; the card-text guess is only for an engine without the key.  Also the
// two smaller fixes of the same lane: consecutive target / choose steps fill a
// question that needs N, and delve is paid through the engine's own prompts.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { classifyAsk, classifyInput } from '../lib/decision.mjs';
import { engineActivations, fakePlan, makeFakeModel } from '../lib/model.mjs';
import { PlanAsker, PlanCore } from '../lib/plan-core.mjs';
import { offersText } from '../lib/plan-prompt.mjs';
import { abilityCost, abilitySplits, matchAbility } from '../lib/plan.mjs';
import { ORACLE, card, creature, input, land, priorityInput, state } from './helpers.mjs';

const reply = (...steps) => `PLAN: test plan.\nSTEPS:\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\nEND`;

function harness(script, { oracle = ORACLE } = {}) {
  const sent = [];
  const users = [];
  const logs = [];
  const fake = makeFakeModel({ script });
  const model = { name: 'fake', call: async (q) => { users.push(q.user); return fake.call(q); } };
  let t = 1000;
  let seq = 0;
  const core = new PlanCore({ send: (m) => sent.push(m), asker: new PlanAsker('fresh', model), oracle, now: () => t, log: (r) => logs.push(r) });
  const h = {
    sent, users, logs, core,
    feed(type, body) { seq += 1; core.onFrame({ v: 1, seq, type, body }); },
    async tick(ms = 200) { t += ms; await core.tick(); },
    moves: () => sent.filter((m) => m.action !== 'setPhaseStop'),
    last: () => h.moves().at(-1),
  };
  h.feed('hello_ok', { gameId: 'act-1', you: 0 });
  return h;
}

const islands = (n, from = 1) => Array.from({ length: n }, (_, i) => land(from + i, 'Island', { zone: 'battlefield', types: 'Basic Land - Island' }));
const JACE = card(30, 'Jace, the Mind Sculptor', { zone: 'battlefield', types: 'Legendary Planeswalker - Jace', manaCost: '{2}{U}{U}', loyalty: 3 });
const CLUE = card(31, 'Clue Token', { zone: 'battlefield', types: 'Artifact - Clue', token: true });
const KATANA = card(32, "Samurai's Katana", { zone: 'battlefield', types: 'Artifact - Equipment', manaCost: '{2}{R}' });
const JACE_ENTRY = { cardId: 30, zone: 'battlefield', abilities: [
  { abilityId: 533, label: "+2: Look at the top card of target player's library. You may put that card on the bottom of that player's library.", isSpell: false },
  { abilityId: 536, label: '0: Draw three cards, then put two cards from your hand on top of your library in any order. ', isSpell: false },
  { abilityId: 538, label: "-1: Return target creature to its owner's hand.", isSpell: false },
] };
const CLUE_ENTRY = { cardId: 31, zone: 'battlefield', abilities: [{ abilityId: 546, label: '{2}, Sacrifice this token: Draw a card.', isSpell: false }] };
const KATANA_ENTRY = { cardId: 32, zone: 'battlefield', abilities: [{ abilityId: 544, label: 'Murasame — Equip {5} ', isSpell: false }] };
const jaceMenu = (askId) => ({ askId, kind: 'ability_menu', cardId: 30, options: JACE_ENTRY.abilities.map((a, i) => ({ id: i, label: a.label, kind: 'ability', abilityId: a.abilityId, cardId: 30, canPlay: true, isSpell: false })) });

// ---------------------------------------------------------------- decision.mjs

test('M63: activations come from state.activatable, one option per ability, with the engine\'s label; no card-text guess', () => {
  const sorcerer = creature(20, 'Prodigal Sorcerer', 1, 1, { zone: 'battlefield' });
  const s = state({ playable: [], activatable: [JACE_ENTRY, CLUE_ENTRY], me: { battlefield: [JACE, CLUE, sorcerer, ...islands(2)] } });
  const d = classifyInput({ state: s, input: priorityInput(), me: 0, oracle: ORACLE });
  const acts = d.options.filter((o) => o.verb === 'activate');
  assert.equal(acts.length, 4, 'three loyalty abilities and the Clue; the Sorcerer is not listed by the engine, so not offered');
  assert.ok(acts.every((o) => o.engine && o.zone === 'battlefield'));
  assert.match(acts[0].label, /^Activate Jace, the Mind Sculptor \[30\].* -- \+2: Look at the top card/);
  assert.deepEqual(acts[2].intent, { cardId: 30, abilityId: 538, abilityLabel: "-1: Return target creature to its owner's hand." });
  assert.ok(!d.options.some((o) => o.cardId === 20), 'the oracle regex is not used when the key is present');
  // the key present but null (or empty): nothing to activate, and still no guess
  const none = state({ playable: [], activatable: null, me: { battlefield: [sorcerer] } });
  assert.ok(classifyInput({ state: none, input: priorityInput(), me: 0, oracle: ORACLE }).auto);
  // an older engine (no key): the card-text hint, as before
  const old = state({ playable: [], me: { battlefield: [sorcerer] } });
  const od = classifyInput({ state: old, input: priorityInput(), me: 0, oracle: ORACLE });
  assert.match(od.options[1].label, /^Activate an ability of Prodigal Sorcerer/);
});

// ---------------------------------------------------------------- plan.mjs

test('M63: a step names one ability by its loyalty cost or its words', () => {
  assert.deepEqual(abilitySplits('Jace, the Mind Sculptor: +2').slice(1).map((x) => [x.name, x.ability]),
    [['Jace, the Mind Sculptor', '+2'], ['Jace, the Mind Sculptor', '+2']]);
  assert.deepEqual(abilitySplits('Jace, the Mind Sculptor (-1)')[1], { name: 'Jace, the Mind Sculptor', ability: '-1' });
  assert.deepEqual(abilitySplits('Jace, the Mind Sculptor −1')[1], { name: 'Jace, the Mind Sculptor', ability: '-1' });
  assert.deepEqual(abilitySplits('Circle of Protection: Red')[1], { name: 'Circle of Protection', ability: 'Red' });
  const labels = JACE_ENTRY.abilities.map((a) => a.label);
  assert.equal(abilityCost(labels[0]), '+2');
  assert.equal(abilityCost('Equip {1} ({1}: Attach to target creature you control.)'), null, 'reminder text is not the cost');
  assert.deepEqual(matchAbility('+2', labels), { ok: true, index: 0 });
  assert.deepEqual(matchAbility('2', labels), { ok: true, index: 0 }, '"2" for "+2"');
  assert.deepEqual(matchAbility('0', labels), { ok: true, index: 1 });
  assert.deepEqual(matchAbility('−1', labels), { ok: true, index: 2 });
  assert.deepEqual(matchAbility('draw three cards', labels), { ok: true, index: 1 });
  assert.deepEqual(matchAbility('+5', labels).ok, false);
  assert.deepEqual(matchAbility('target', labels).why, 'ambiguous');
  // Elspeth, Knight-Errant's two +1s (measured in a fake game): the cost alone is ambiguous, cost and words are not
  const elspeth = ['+1: Create a 1/1 white Soldier creature token.', '+1: Target creature gets +3/+3 and gains flying until end of turn.', "-8: You get an emblem with \"Artifacts, creatures, enchantments, and lands you control have indestructible.\""];
  assert.equal(matchAbility('+1', elspeth).why, 'ambiguous');
  assert.deepEqual(matchAbility('+1 Create a 1/1 white Soldier creature token', elspeth), { ok: true, index: 0 });
  assert.deepEqual(matchAbility('+1: Target creature gets +3/+3', elspeth), { ok: true, index: 1 });
  assert.deepEqual(matchAbility('+1 soldier', elspeth), { ok: true, index: 0 });
  assert.deepEqual(matchAbility('flying', elspeth), { ok: true, index: 1 });
});

// ---------------------------------------------------------------- the prompt

test('M63: "what the engine lets you do now" lists each activatable ability by permanent and the engine\'s label', () => {
  const s = state({ playable: [], activatable: [JACE_ENTRY, CLUE_ENTRY, KATANA_ENTRY], me: { battlefield: [JACE, CLUE, KATANA, ...islands(1)] } });
  const d = classifyInput({ state: s, input: priorityInput(), me: 0, oracle: ORACLE });
  const text = offersText(s, 0, d.options.filter((o) => o.verb), { oracle: ORACLE });
  assert.match(text, /^ {2}activate on the battlefield \(the engine's list; for a permanent with more than one, write "activate <card>: <cost or words of the ability>"\):$/m);
  assert.match(text, /^ {4}Jace, the Mind Sculptor: \+2: Look at the top card of target player's library\./m);
  assert.match(text, /^ {4}Jace, the Mind Sculptor: -1: Return target creature to its owner's hand\.$/m);
  assert.match(text, /^ {4}Clue Token: \{2\}, Sacrifice this token: Draw a card\. \(your untapped mana cannot pay for it now\)$/m, 'one Island: the Clue is marked');
  assert.match(text, /^ {4}Samurai's Katana: Murasame — Equip \{5\} \(your untapped mana cannot pay for it now\)$/m);
  assert.doesNotMatch(text, /^ {2}activate: /m, 'no card-text line beside the engine\'s list');
  const acts = engineActivations(text);
  assert.equal(acts.length, 5);
  assert.deepEqual(acts.filter((a) => a.payable).map((a) => a.card), ['Jace, the Mind Sculptor', 'Jace, the Mind Sculptor', 'Jace, the Mind Sculptor']);
});

// ---------------------------------------------------------------- the executor

test('M63: "activate Jace, the Mind Sculptor: +2" clicks Jace and the engine\'s menu is answered with the +2 (no call)', async () => {
  const h = harness([reply('activate Jace, the Mind Sculptor: +2 -> opponent')]);
  h.feed('state', state({ turn: 5, playable: [], activatable: [JACE_ENTRY, CLUE_ENTRY], me: { battlefield: [JACE, CLUE, ...islands(3)] } }));
  h.feed('input', priorityInput(5));
  await h.tick();
  assert.equal(h.users.length, 1);
  assert.match(h.users[0], /^ {4}Jace, the Mind Sculptor: 0: Draw three cards/m);
  assert.deepEqual(h.last(), { type: 'act', action: 'clickCard', cardId: 30 });
  h.feed('ask', jaceMenu('m1'));
  await h.tick();
  assert.deepEqual(h.last(), { type: 'answer', askId: 'm1', value: 0 });
  h.feed('input', input('Select target player', { ok: ['OK', false], cancel: ['Cancel', true], sel: { cardIds: [], min: 1, max: 1, mode: 'players' } }));
  await h.tick();
  assert.deepEqual(h.last(), { type: 'act', action: 'clickPlayer', playerId: 1 });
  assert.equal(h.users.length, 1);
});

test('M63: with several abilities and none named, the engine\'s menu is asked, and "-1" answers it', async () => {
  const h = harness([reply('activate Jace, the Mind Sculptor'), reply('choose -1')]);
  h.feed('state', state({ turn: 5, playable: [], activatable: [JACE_ENTRY], me: { battlefield: [JACE, ...islands(3)] } }));
  h.feed('input', priorityInput(5));
  await h.tick();
  assert.deepEqual(h.last(), { type: 'act', action: 'clickCard', cardId: 30 });
  h.feed('ask', jaceMenu('m2'));
  await h.tick();
  assert.equal(h.users.length, 2);
  assert.match(h.users[1], /^The engine asks you: /);
  assert.deepEqual(h.last(), { type: 'answer', askId: 'm2', value: 2 });
});

test('M63: an ability the engine does not list is a correction that lists the ones it does', async () => {
  const h = harness([reply('activate Jace, the Mind Sculptor: -12'), reply('hold')]);
  h.feed('state', state({ turn: 5, playable: [], activatable: [JACE_ENTRY], me: { battlefield: [JACE, ...islands(3)] } }));
  h.feed('input', priorityInput(5));
  await h.tick();
  assert.equal(h.users.length, 2);
  assert.match(h.users[1], /^Step 1 'activate Jace, the Mind Sculptor: -12' cannot be done: "-12" is not one of the abilities the engine allows Jace, the Mind Sculptor now: "\+2: Look/);
});

test('M63: a Clue token (no card text) is activated from the engine list; a permanent the list leaves out is refused in words', async () => {
  const h = harness([reply('activate Clue Token'), reply('activate Jace, the Mind Sculptor: +2'), reply('hold')]);
  h.feed('state', state({ turn: 5, phase: 'MAIN2', playable: [], activatable: [CLUE_ENTRY], me: { battlefield: [JACE, CLUE, ...islands(2)] }, events: [] }));
  h.feed('input', priorityInput(5, 'Main phase, postcombat'));
  await h.tick();
  assert.deepEqual(h.last(), { type: 'act', action: 'clickCard', cardId: 31 });
  // the Clue went; Jace was used this turn: the engine lists nothing
  h.feed('state', state({ turn: 5, phase: 'MAIN2', playable: [], activatable: [], me: { battlefield: [JACE, ...islands(2)] } }));
  h.feed('input', priorityInput(5, 'Main phase, postcombat'));
  await h.tick();
  assert.equal(h.users.length, 1, 'the plan is used up: nothing to ask');
  // a fresh plan naming Jace when the engine lists nothing for it
  const j = harness([reply('activate Jace, the Mind Sculptor: +2'), reply('hold')]);
  j.feed('state', state({ turn: 5, playable: [], activatable: [CLUE_ENTRY], me: { battlefield: [JACE, CLUE, ...islands(2)] } }));
  j.feed('input', priorityInput(5));
  await j.tick();
  assert.match(j.users[1], /cannot be done: .*the engine offers no ability of Jace, the Mind Sculptor now \(a planeswalker uses one loyalty ability a turn, in your main phase with an empty stack\)/);
});

test('M63: the fake model plays a loyalty ability first, and a Clue at the opponent\'s end step', () => {
  const s = state({ turn: 5, playable: [], activatable: [JACE_ENTRY, CLUE_ENTRY], me: { battlefield: [JACE, CLUE, ...islands(3)] } });
  const d = classifyInput({ state: s, input: priorityInput(), me: 0, oracle: ORACLE });
  const offers = offersText(s, 0, d.options.filter((o) => o.verb), { oracle: ORACLE });
  assert.match(fakePlan(`It is your turn 5. What do you do this turn?\n\n${offers}`), /^1\. activate Jace, the Mind Sculptor: \+2$/m);
  const eot = state({ turn: 6, active: 1, phase: 'END_OF_TURN', playable: [], activatable: [CLUE_ENTRY], me: { battlefield: [CLUE, ...islands(3)] } });
  const ed = classifyInput({ state: eot, input: priorityInput(6, 'End of turn'), me: 0, oracle: ORACLE });
  assert.match(fakePlan(`It is the opponent's end step (turn 6). x\n\n${offersText(eot, 0, ed.options.filter((o) => o.verb), { oracle: ORACLE })}`), /^1\. activate Clue Token$/m);
});

// ---------------------------------------------------------------- N choices from consecutive steps

test('a question that needs two targets is filled by two consecutive target steps (Ghostly Flicker)', async () => {
  const flicker = card(60, 'Ghostly Flicker', { manaCost: '{2}{U}', types: 'Instant' });
  const a = creature(21, 'Thraben Inspector', 1, 2, { zone: 'battlefield' });
  const b = land(22, 'Island', { zone: 'battlefield', types: 'Basic Land - Island' });
  const h = harness([reply('cast Ghostly Flicker -> Thraben Inspector', 'target Island #22')]);
  h.feed('state', state({ turn: 5, playable: [{ cardId: 60, zone: 'hand', abilities: [{ abilityId: 600, label: 'Ghostly Flicker', isSpell: true }] }], activatable: [], me: { hand: [flicker], battlefield: [a, b, ...islands(3, 1)] } }));
  h.feed('input', priorityInput(5));
  await h.tick();
  assert.deepEqual(h.last(), { type: 'act', action: 'clickCard', cardId: 60 });
  h.feed('input', input('Ghostly Flicker - Select two target artifacts, creatures, and/or lands you control', { ok: ['OK', false], cancel: ['Cancel', true], sel: { cardIds: [21, 22, 1, 2, 3], min: 2, max: 2, mode: 'cards' } }));
  await h.tick();
  // the clicks go one per tick (the rest queued to the same input)
  await h.tick();
  await h.tick();
  assert.deepEqual(h.moves().slice(-3), [
    { type: 'act', action: 'clickCard', cardId: 21 },
    { type: 'act', action: 'clickCard', cardId: 22 },
    { type: 'act', action: 'buttonOk' },
  ]);
  assert.equal(h.users.length, 1, 'no correction: the two steps filled the two targets');
  assert.equal(h.core.plans[0].i, 2, 'both steps are used: the target step after the cast is not left for later');
});

test('a real shortfall keeps its message', async () => {
  const h = harness([]);
  h.feed('state', state({ turn: 5 }));
  const d = classifyInput({ state: h.core.state, input: input('Select two targets', { ok: ['OK', false], cancel: ['Cancel', true], sel: { cardIds: [1, 2, 3], min: 2, max: 2, mode: 'cards' } }), me: 0, oracle: ORACLE });
  const plan = { kind: 'question', steps: [{ n: 1, verb: 'target', names: 'card 1', raw: 'target card 1' }, { n: 2, verb: 'pass', raw: 'pass' }], i: 0 };
  const r = h.core.answerWith(d, plan, plan.steps[0], 'card 1');
  assert.match(r.fail.why, /^this question needs exactly 2 choices and you named 1/);
});

// ---------------------------------------------------------------- delve, through the engine's own prompts

const CRUISE_ORACLE = { source: 'test', text: (n) => (n === 'Treasure Cruise' ? 'Delve\nDraw three cards.' : ORACLE.text(n)) };

test('delve: "Delve how many cards?" is answered by the seat -- what the mana cannot cover, keeping the plan\'s later spells', async () => {
  const { payProblem } = await import('../lib/mana.mjs');
  const cruise = card(8, 'Treasure Cruise', { manaCost: '{7}{U}', types: 'Sorcery' });
  const gy = [1, 2, 3, 4, 5, 6].map((i) => card(100 + i, i % 2 ? 'Island' : 'Thought Scour', { zone: 'graveyard', types: i % 2 ? 'Basic Land - Island' : 'Instant' }));
  const s = state({ turn: 7, me: { hand: [cruise], battlefield: islands(3), graveyard: gy } });
  const ask = { askId: 'd1', kind: 'choose_list', prompt: 'Delve how many cards?', options: [0, 1, 2, 3, 4, 5, 6].map((n) => ({ id: n, label: String(n), kind: 'number' })), preselected: [], min: 1, max: 1, reveal: false };
  const d = classifyAsk({ state: s, ask, me: 0, oracle: CRUISE_ORACLE, delve: { casting: cruise, reserve: 0, keep: new Set() } });
  assert.deepEqual(d.auto.moves, [{ type: 'answer', askId: 'd1', value: [5] }], '8 mana, 3 untapped: delve 5');
  assert.match(d.auto.reason, /^delve: exile 5 cards/);
  const withLater = classifyAsk({ state: s, ask, me: 0, oracle: CRUISE_ORACLE, delve: { casting: cruise, reserve: 1, keep: new Set() } });
  assert.deepEqual(withLater.auto.moves[0].value, [6], 'one mana kept for a later spell: delve 6');
  assert.deepEqual(classifyAsk({ state: s, ask, me: 0 }).auto.moves[0].value, [6], 'the spell unknown: as many as allowed');
  // which card: a land first, never one the engine lists as playable from the graveyard, never "none"
  const exile = { askId: 'd2', kind: 'choose_list', prompt: 'Exile which card(1/5)?', options: gy.map((c, i) => ({ id: i, label: c.name, kind: 'card', cardId: c.id })), preselected: [], min: 0, max: 1, reveal: false };
  const e1 = classifyAsk({ state: s, ask: exile, me: 0, delve: { casting: cruise, reserve: 0, keep: new Set([101]) } });
  assert.deepEqual(e1.auto.moves, [{ type: 'answer', askId: 'd2', value: [2] }], 'Island 103: 101 is kept (playable from the graveyard)');
  // the mana words know delve: with 6 cards in the graveyard and 3 Islands, Treasure Cruise is castable; with 2 cards it is not
  assert.equal(payProblem(cruise, s, 0, CRUISE_ORACLE), null);
  const thin = state({ turn: 7, me: { hand: [cruise], battlefield: islands(3), graveyard: gy.slice(0, 2) } });
  assert.equal(payProblem(cruise, thin, 0, CRUISE_ORACLE), 'it costs {7}{U}, 6 mana even with delve exiling 2 cards of your graveyard (2 there), and you have 3 untapped mana sources (Island, Island, Island)');
});

test('delve in a plan: the cast step\'s spell is paid with delve, with no model call', async () => {
  const cruise = card(8, 'Treasure Cruise', { manaCost: '{7}{U}', types: 'Sorcery' });
  const gy = [1, 2, 3, 4, 5].map((i) => card(100 + i, 'Island', { zone: 'graveyard', types: 'Basic Land - Island' }));
  const h = harness([reply('cast Treasure Cruise')], { oracle: CRUISE_ORACLE });
  h.feed('state', state({ turn: 7, playable: [{ cardId: 8, zone: 'hand', abilities: [{ abilityId: 80, label: 'Treasure Cruise', isSpell: true }] }], activatable: [], me: { hand: [cruise], battlefield: islands(3), graveyard: gy } }));
  h.feed('input', priorityInput(7));
  await h.tick();
  assert.deepEqual(h.last(), { type: 'act', action: 'clickCard', cardId: 8 });
  h.feed('ask', { askId: 'd1', kind: 'choose_list', prompt: 'Delve how many cards?', options: [0, 1, 2, 3, 4, 5].map((n) => ({ id: n, label: String(n), kind: 'number' })), preselected: [], min: 1, max: 1, reveal: false });
  await h.tick();
  assert.deepEqual(h.last(), { type: 'answer', askId: 'd1', value: [5] });
  h.feed('ask', { askId: 'd2', kind: 'choose_list', prompt: 'Exile which card(1/5)?', options: gy.map((c, i) => ({ id: i, label: c.name, kind: 'card', cardId: c.id })), preselected: [], min: 0, max: 1, reveal: false });
  await h.tick();
  assert.deepEqual(h.last(), { type: 'answer', askId: 'd2', value: [0] });
  assert.equal(h.users.length, 1, 'no question to the model for the delve');
});

test('M63: the end-step stop counts a permanent the engine listed at instant speed (a Clue with no card text)', async () => {
  const { defaultStops } = await import('../lib/stops.mjs');
  const { instantActivatable } = await import('../lib/seat-core.mjs');
  const s = state({ me: { battlefield: [JACE, CLUE, ...islands(2)] } });
  assert.equal(defaultStops(s, 0, ORACLE).opp.has('END_OF_TURN'), false, 'no card text for a Clue: no stop from the hint');
  const listed = instantActivatable([JACE_ENTRY, CLUE_ENTRY, KATANA_ENTRY]);
  assert.deepEqual([...listed], [31], 'loyalty and equip are sorcery speed; the Clue is not');
  assert.equal(defaultStops(s, 0, ORACLE, listed).opp.has('END_OF_TURN'), true);
});
