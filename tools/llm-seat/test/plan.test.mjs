// mtg-table — tools/llm-seat/test/plan.test.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Plan mode (D419) with the fake model only: the reply parser, the name
// matcher, the mana words, and the executor driven frame by frame (no socket,
// a hand clock) -- a plan carried out, an unaffordable step and a refused click
// turned into corrections with the reason in words, the default after two
// corrections, a target named in the plan and one asked for, the re-ask on an
// opponent's spell and on blocks, no call for mana or an empty priority, and
// the loop guard (a cast the engine cancels is never tried a third time; an
// optional cost the seat cannot pay is never offered).

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { Arm } from '../lib/arms.mjs';
import { classifyAsk } from '../lib/decision.mjs';
import { availableMana, optionalCostPayable, parseCost, payProblem } from '../lib/mana.mjs';
import { fakePlan, makeFakeModel } from '../lib/model.mjs';
import { PlanAsker, PlanCore } from '../lib/plan-core.mjs';
import { PLAN_SYSTEM, planView } from '../lib/plan-prompt.mjs';
import { matchRef, parsePlan, parseRef, splitNames } from '../lib/plan.mjs';
import { SeatCore } from '../lib/seat-core.mjs';
import { parseArgs, runSeat } from '../seat.mjs';
import { startFakeBridge } from './fake-bridge.mjs';
import { ORACLE, card, creature, input, land, priorityInput, state } from './helpers.mjs';

const reply = (...steps) => `PLAN: test plan.\nSTEPS:\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\nEND`;

// ---------------------------------------------------------------- the parser

test('plan reply: valid, with reasoning before PLAN:, fences and decoration tolerated', () => {
  const p = parsePlan('I should develop.\n\nPLAN: Play a land and cast the bear.\nSTEPS:\n1. play land Forest\n2. cast Grizzly Bears -> opponent\n3. attack with Elf, Peggy Carter, Secret Agent\nEND\n');
  assert.equal(p.ok, true);
  assert.equal(p.plan, 'Play a land and cast the bear.');
  assert.equal(p.preamble, 'I should develop.');
  assert.deepEqual(p.steps.map((s) => s.verb), ['play land', 'cast', 'attack with']);
  assert.equal(p.steps[1].name, 'Grizzly Bears');
  assert.equal(p.steps[1].targets, 'opponent');
  assert.equal(parsePlan('```\nPLAN: x\nSTEPS:\n1. **block Ogre with Wall**\n2. pass.\nEND\n```').ok, true);
  assert.equal(parsePlan(reply('attack with none')).steps[0].names, null);
  assert.equal(parsePlan(reply('keep')).steps[0].verb, 'keep');
});

test('plan reply: invalid replies say exactly why', () => {
  assert.match(parsePlan('choice: 1').error, /no line starting with "PLAN:"/);
  assert.match(parsePlan('PLAN: x\n1. pass\nEND').error, /no "STEPS:" line/);
  assert.match(parsePlan('PLAN: x\nSTEPS:\n1. pass').error, /no END line/);
  assert.match(parsePlan('PLAN: x\nSTEPS:\n1. tap Forest\nEND').error, /step 1 "tap Forest": "tap" is not a verb .*play land, cast/);
  assert.match(parsePlan('PLAN: x\nSTEPS:\n1. play land Forest\n3. pass\nEND').error, /numbered 1, 2, 3 …: found 3 where 2/);
  assert.match(parsePlan('PLAN: x\nSTEPS:\n1. block Ogre\nEND').error, /block <attacker> with <your blocker>/);
  assert.match(parsePlan('PLAN: x\nSTEPS:\n1. cast\nEND').error, /which card/);
  assert.match(parsePlan('PLAN: x\nSTEPS:\n1. pass\n2. cast Shock\nEND').error, /"pass" must be the last step/);
  assert.match(parsePlan('PLAN: x\nSTEPS:\n1. keep\n2. pass\nEND').error, /"keep" must be the only step/);
  assert.match(parsePlan('PLAN: x\nSTEPS:\nEND').error, /lists no step/);
  assert.match(parsePlan('PLAN: x\nSTEPS:\n1. pass\nEND\nGood luck!').error, /nothing may follow END/);
  assert.match(parsePlan('PLAN: x\nSTEPS:\nplay a land\nEND').error, /is not a numbered step/);
  assert.match(parsePlan('PLAN:\nSTEPS:\n1. pass\nEND').error, /PLAN: line is empty/);
});

// ---------------------------------------------------------------- names

test('names: exact, case and punctuation, ids, ambiguous, missing; commas inside a name', () => {
  const cands = [
    { id: 3, name: 'Island', group: 'hand' }, { id: 4, name: 'Island', group: 'hand' },
    { id: 9, name: "Al'Abara, Lord of Magic", group: 'hand' },
    { id: 20, name: 'Grizzly Bears', group: 'battlefield:0' }, { id: 31, name: 'Grizzly Bears', group: 'battlefield:1' },
  ];
  assert.equal(matchRef(parseRef('island'), cands).pick.id, 3, 'two in one group are interchangeable');
  assert.equal(matchRef(parseRef('Island #4'), cands).pick.id, 4);
  assert.equal(matchRef(parseRef('Island [4]'), cands).pick.id, 4, 'the game log spelling');
  assert.equal(matchRef(parseRef('alabara lord of magic'), cands).pick.id, 9);
  assert.equal(matchRef(parseRef('Grizzly Bears'), cands).why, 'ambiguous');
  assert.equal(matchRef(parseRef('Grizzly Bears #31'), cands).pick.id, 31);
  assert.equal(matchRef(parseRef('Grizzly Bears (2/2)'), cands).why, 'ambiguous');
  assert.equal(matchRef(parseRef('Shivan Dragon'), cands).why, 'missing');
  assert.equal(matchRef(parseRef('Island #20'), cands).why, 'id');
  assert.deepEqual(splitNames('Elf, Peggy Carter, Secret Agent and Bear', ['Peggy Carter, Secret Agent']), ['Elf', 'Peggy Carter, Secret Agent', 'Bear']);
});

// ---------------------------------------------------------------- mana

test('mana: sources and colours, a cost the untapped mana cannot pay, in words', () => {
  assert.deepEqual(parseCost('{4}{U}').mv, 5);
  const s = state({ me: { battlefield: [land(1, 'Island', { zone: 'battlefield', types: 'Basic Land - Island' }), land(2, 'Island', { zone: 'battlefield', types: 'Basic Land - Island' }), land(3, 'Forest', { zone: 'battlefield', tapped: true })] } });
  assert.equal(availableMana(s, 0).total, 2);
  assert.equal(payProblem(card(9, 'Robotics Mastery', { manaCost: '{4}{U}' }), s, 0), 'it costs {4}{U} (5 mana) and you have 2 untapped mana sources (Island, Island)');
  assert.match(payProblem(card(8, 'Shock', { manaCost: '{R}' }), s, 0), /needs 1 red mana, and your untapped mana makes no red/);
  assert.equal(payProblem(card(7, 'Opt', { manaCost: '{U}' }), s, 0), null);
  const view = planView(s, 0, {});
  assert.match(view, /Untapped mana: 2 \(Island, Island: U U\)/);
  assert.match(view, /Lands: Island #1, Island #2, Forest \(tapped\) -- 2 untapped/);
  assert.match(view, /OPPONENT \(Forge AI\): life 20, hand 0 \(hidden\)/);
});

test('optional costs: one the seat cannot pay is never offered (the 1,900-cast loop)', () => {
  const teamwork = 'Teamwork – Tap any number of untapped creatures you control other than CARDNAME with total power 2 or greater';
  const ask = { askId: 'a1', kind: 'choose_list', prompt: 'Choose optional costs', options: [{ id: 0, label: teamwork, kind: 'other' }], preselected: [], min: 0, max: 1, reveal: false };
  const none = state({ me: { battlefield: [creature(5, 'Elf', 1, 1, { zone: 'battlefield' })] } });
  assert.equal(optionalCostPayable(teamwork, none, 0), false);
  const d = classifyAsk({ state: none, ask, me: 0 });
  assert.equal(d.auto.reason, 'optional costs: none can be paid now');
  assert.deepEqual(d.auto.moves, [{ type: 'answer', askId: 'a1', value: [] }]);
  const two = state({ me: { battlefield: [creature(5, 'Bear', 2, 2, { zone: 'battlefield' })] } });
  assert.equal(optionalCostPayable(teamwork, two, 0), true);
  assert.equal(classifyAsk({ state: two, ask, me: 0 }).auto, null, 'payable: the choice is the player\'s');
  assert.equal(optionalCostPayable('Kicker {2}{R}', two, 0), false);
});

// ---------------------------------------------------------------- the executor, frame by frame

function harness(script, { me = 0, oracle = ORACLE } = {}) {
  const sent = [];
  const users = [];
  const logs = [];
  const fake = makeFakeModel({ script });
  const model = { name: 'fake', call: async (q) => { users.push(q.user); return fake.call(q); } };
  const asker = new PlanAsker('fresh', model);
  let t = 1000;
  let seq = 0;
  const core = new PlanCore({ send: (m) => sent.push(m), asker, oracle, now: () => t, log: (r) => logs.push(r) });
  const h = {
    sent, users, logs, core,
    feed(type, body) { seq += 1; core.onFrame({ v: 1, seq, type, body }); },
    async tick(ms = 200) { t += ms; await core.tick(); },
    moves: () => sent.filter((m) => m.action !== 'setPhaseStop'),
    last: () => h.moves().at(-1),
  };
  h.feed('hello_ok', { gameId: 'plan-1', you: me });
  return h;
}

const mountains = (n, from = 1) => Array.from({ length: n }, (_, i) => land(from + i, 'Mountain', { zone: 'battlefield', types: 'Basic Land - Mountain' }));
const plains = (n, from = 1) => Array.from({ length: n }, (_, i) => land(from + i, 'Plains', { zone: 'battlefield', types: 'Basic Land - Plains' }));
const shock = (id = 50) => card(id, 'Shock', { manaCost: '{R}', types: 'Instant' });
const playable = (...entries) => entries.map(([cardId, isSpell = true, zone = 'hand']) => ({ cardId, zone, abilities: [{ abilityId: cardId * 10, label: 'x', isSpell }] }));

test('a turn plan runs; an unaffordable step comes back with the reason in words; no call for the rest', async () => {
  const h = harness([reply('play land Forest', 'cast Grizzly Bears'), reply('hold')]);
  const bear = creature(11, 'Grizzly Bears', 2, 2);
  h.feed('state', state({ turn: 1, me: { hand: [land(10), bear] }, events: [{ kind: 'turn', player: 0, turn: 1 }], playable: playable([10, false], [11]) }));
  h.feed('input', priorityInput(1));
  await h.tick();
  assert.equal(h.users.length, 1);
  assert.match(h.users[0], /^It is your turn 1\. What do you do this turn\?/);
  assert.match(h.users[0], /play a land: Forest/);
  assert.match(h.users[0], /GAME SO FAR/);
  assert.deepEqual(h.last(), { type: 'act', action: 'clickCard', cardId: 10 });
  // the land is down; step 2 cannot be paid
  h.feed('state', state({ turn: 1, me: { hand: [bear], battlefield: [land(10, 'Forest', { zone: 'battlefield' })] }, events: [{ kind: 'land', player: 0, cardId: 10 }], playable: playable([11]) }));
  h.feed('input', priorityInput(1));
  await h.tick();
  assert.equal(h.users.length, 2);
  assert.match(h.users[1], /^Step 2 'cast Grizzly Bears' cannot be done: it costs \{1\}\{G\} \(2 mana\) and you have 1 untapped mana source \(Forest\)\./);
  assert.match(h.users[1], /Done so far: step 1 'play land Forest'\./);
  assert.match(h.users[1], /Correction 1 of 2/);
  assert.deepEqual(h.last(), { type: 'act', action: 'passPriority' });
  // second main phase: the plan is used up -- passed with no call
  h.feed('state', state({ turn: 1, phase: 'MAIN2', me: { hand: [bear], battlefield: [land(10, 'Forest', { zone: 'battlefield' })] }, playable: playable([11]) }));
  h.feed('input', priorityInput(1, 'Main phase, postcombat'));
  await h.tick();
  assert.equal(h.users.length, 2);
  assert.deepEqual(h.last(), { type: 'act', action: 'passPriority' });
  assert.equal(h.core.stats.corrections, 1);
  assert.deepEqual(h.core.stats.moments, { turn: 2 });
});

test('a refused click is a correction with the engine\'s words; after two corrections the default', async () => {
  const h = harness([reply('cast Shock -> opponent'), reply('cast Shock -> opponent'), reply('cast Shock -> opponent')]);
  const s = state({ turn: 3, me: { hand: [shock()], battlefield: mountains(3) }, playable: playable([50]) });
  h.feed('state', s);
  h.feed('input', priorityInput(3));
  for (let i = 0; i < 3; i++) {
    await h.tick();
    assert.deepEqual(h.last(), { type: 'act', action: 'clickCard', cardId: 50 });
    h.feed('notice', { level: 'warn', title: 'Not selectable', text: 'card 50 cannot be selected now' });
    h.feed('input', priorityInput(3));
  }
  await h.tick();
  assert.equal(h.users.length, 3, 'one plan, two corrections, then no more calls');
  assert.match(h.users[1], /^Step 1 'cast Shock -> opponent' cannot be done: the engine refused it: "Not selectable: card 50 cannot be selected now"\./);
  assert.deepEqual(h.last(), { type: 'act', action: 'passPriority' });
  assert.equal(h.core.stats.fallback, 1);
  assert.equal(h.core.stats.refused, 3);
  assert.equal(h.logs.at(-1).how, 'fallback');
});

test('an unreadable reply is sent back with the reason; a second one too; then the default', async () => {
  const h = harness(['choice: 2', 'PLAN: x\nSTEPS:\n1. cast Shock\n', 'I pass.']);
  h.feed('state', state({ turn: 3, me: { hand: [shock()], battlefield: mountains(1) }, playable: playable([50]) }));
  h.feed('input', priorityInput(3));
  await h.tick();
  assert.equal(h.users.length, 3);
  assert.match(h.users[1], /^Your last reply could not be read by the program: there is no line starting with "PLAN:"\.\nYour reply was:\nchoice: 2/);
  assert.match(h.users[2], /there is no END line/);
  assert.deepEqual(h.last(), { type: 'act', action: 'passPriority' });
  assert.equal(h.core.stats.invalid, 3);
  assert.equal(h.core.stats.fallback, 1);
});

test('a target in the plan answers the target question; mana is the engine\'s Auto (no call)', async () => {
  const h = harness([reply('cast Shock -> opponent')]);
  h.feed('state', state({ turn: 3, me: { hand: [shock()], battlefield: mountains(1) }, playable: playable([50]) }));
  h.feed('input', priorityInput(3));
  await h.tick();
  h.feed('input', input('Select targets for Shock', { ok: ['OK', false], cancel: ['Cancel', true], sel: { cardIds: [], min: 1, max: 1, mode: 'players' } }));
  await h.tick();
  assert.deepEqual(h.last(), { type: 'act', action: 'clickPlayer', playerId: 1 });
  h.feed('input', input('Pay Mana Cost: {R}', { ok: ['Auto', true], cancel: ['Cancel', true] }));
  await h.tick();
  assert.deepEqual(h.last(), { type: 'act', action: 'buttonOk' });
  assert.equal(h.users.length, 1);
});

test('a target named "Name #id" picks that card among same-named choices of both players', async () => {
  const h = harness([reply('cast Shock -> Grizzly Bears #31')]);
  const mine = creature(20, 'Grizzly Bears', 2, 2, { zone: 'battlefield' });
  const theirs = creature(31, 'Grizzly Bears', 2, 2, { zone: 'battlefield', controller: 1, owner: 1 });
  const s = state({ turn: 3, me: { hand: [shock()], battlefield: [...mountains(1), mine] }, opp: { battlefield: [theirs] }, playable: playable([50]) });
  h.feed('state', s);
  h.feed('input', priorityInput(3));
  await h.tick();
  h.feed('input', input('Shock (50) - Select target creature', { ok: ['OK', false], cancel: ['Cancel', true], sel: { cardIds: [20, 31], min: 1, max: 1, mode: 'cards' } }));
  await h.tick();
  assert.deepEqual(h.last(), { type: 'act', action: 'clickCard', cardId: 31 });
  assert.equal(h.users.length, 1);
});

test('a target the step did not name is asked as one plain question', async () => {
  const h = harness([reply('cast Shock'), reply('target opponent')]);
  h.feed('state', state({ turn: 3, me: { hand: [shock()], battlefield: mountains(1) }, playable: playable([50]) }));
  h.feed('input', priorityInput(3));
  await h.tick();
  h.feed('input', input('Select targets for Shock', { ok: ['OK', false], cancel: ['Cancel', true], sel: { cardIds: [], min: 1, max: 1, mode: 'players' } }));
  await h.tick();
  assert.equal(h.users.length, 2);
  assert.match(h.users[1], /^Shock needs a target: which\?\nLegal targets: me; opponent; Cancel\./);
  assert.deepEqual(h.last(), { type: 'act', action: 'clickPlayer', playerId: 1 });
  assert.deepEqual(h.core.stats.moments, { turn: 1, question: 1 });
});

test('the opponent\'s spell: asked once when the seat can respond, never when it cannot', async () => {
  const h = harness([reply('pass')]);
  const bear = creature(44, 'Grizzly Bears', 2, 2, { controller: 1, owner: 1, zone: 'stack' });
  const item = { id: 8, sourceCardId: 44, controller: 1, text: 'Grizzly Bears - Creature 2 / 2', targetCardIds: [], targetPlayerIds: [], isAbility: false };
  const opp = (extra) => state({ turn: 2, active: 1, priority: 0, me: { hand: [shock()], battlefield: mountains(1) }, stack: [item], stackCards: [bear], ...extra });
  h.feed('state', opp({ playable: playable([50]) }));
  h.feed('input', priorityInput(2));
  await h.tick();
  assert.equal(h.users.length, 1);
  assert.match(h.users[0], /^This just happened: the opponent cast Grizzly Bears\. It is on the stack now\./);
  assert.match(h.users[0], /STACK \(top first\): the opponent's Grizzly Bears/);
  assert.deepEqual(h.last(), { type: 'act', action: 'passPriority' });
  // the same item again (a new frame): no second question
  h.feed('state', opp({ playable: playable([50]) }));
  h.feed('input', priorityInput(2));
  await h.tick();
  assert.equal(h.users.length, 1);
  // a new item, nothing to respond with: no call
  h.feed('state', opp({ stack: [{ ...item, id: 9 }], playable: [] }));
  h.feed('input', priorityInput(2));
  await h.tick();
  assert.equal(h.users.length, 1);
  assert.deepEqual(h.last(), { type: 'act', action: 'passPriority' });
});

test('blocks are asked, and "block A with B" is the attacker click, the blocker click, then OK', async () => {
  const h = harness([reply('block Grizzly Bears with Wall of Stone')]);
  const atk = creature(44, 'Grizzly Bears', 2, 2, { controller: 1, owner: 1, zone: 'battlefield', attacking: true });
  const wall = creature(12, 'Wall of Stone', 0, 8, { zone: 'battlefield' });
  h.feed('state', state({ turn: 2, phase: 'COMBAT_DECLARE_BLOCKERS', active: 1, priority: 0, me: { battlefield: [wall] }, opp: { battlefield: [atk] },
    combat: { bands: [{ attackerIds: [44], blockerIds: [], defender: { kind: 'player', id: 0 } }] } }));
  const blk = input('Select creatures to block Forge AI\'s attackers.', { ok: ['OK', true] });
  h.feed('input', blk);
  await h.tick();
  assert.equal(h.users.length, 1);
  assert.match(h.users[0], /^The opponent attacks with: Grizzly Bears 2\/2 \(attacking\)\.\nYour untapped creatures: Wall of Stone 0\/8\./);
  assert.deepEqual(h.last(), { type: 'act', action: 'clickCard', cardId: 44 });
  h.feed('input', blk);
  await h.tick();
  assert.deepEqual(h.last(), { type: 'act', action: 'clickCard', cardId: 12 });
  h.feed('input', blk);
  await h.tick();
  assert.deepEqual(h.last(), { type: 'act', action: 'buttonOk' });
  assert.equal(h.users.length, 1);
});

test('attack: the plan\'s attackers at the declaration; a sick creature named is a correction', async () => {
  const h = harness([reply('attack with Grizzly Bears, Elf'), reply('attack with Grizzly Bears')]);
  const bf = [creature(11, 'Grizzly Bears', 2, 2, { zone: 'battlefield' }), creature(12, 'Elf', 1, 1, { zone: 'battlefield', sick: true })];
  h.feed('state', state({ turn: 3, me: { battlefield: bf, hand: [card(60, 'Mystery', { manaCost: '{9}' })] }, playable: playable([60]) }));
  h.feed('input', priorityInput(3));
  await h.tick();
  assert.deepEqual(h.last(), { type: 'act', action: 'passPriority' }, 'on to combat');
  h.feed('state', state({ turn: 3, phase: 'COMBAT_DECLARE_ATTACKERS', me: { battlefield: bf } }));
  const atk = input('Select creatures to attack Forge AI or select player/card you wish to attack.', { ok: ['OK', true], cancel: ['Alpha Strike', true] });
  h.feed('input', atk);
  await h.tick();
  assert.match(h.users[1], /^Step 1 'attack with Grizzly Bears, Elf' cannot be done: Elf is summoning sick/);
  assert.deepEqual(h.last(), { type: 'act', action: 'clickCard', cardId: 11 });
  h.feed('input', atk);
  await h.tick();
  assert.deepEqual(h.last(), { type: 'act', action: 'buttonOk' });
});

test('"cast" a card with several abilities answers the engine\'s ability menu with the spell (no call)', async () => {
  const h = harness([reply('cast A.I.M. Scientists')]);
  const aim = card(2, 'A.I.M. Scientists', { manaCost: '{3}{U}', types: 'Creature - Human Scientist Villain', power: '3', toughness: '3' });
  h.feed('state', state({ turn: 5, me: { hand: [aim], battlefield: [1, 2, 3, 4].map((i) => land(10 + i, 'Island', { zone: 'battlefield', types: 'Basic Land - Island' })) } }));   // an engine before M61: no playable list
  h.feed('input', priorityInput(5));
  await h.tick();
  assert.deepEqual(h.last(), { type: 'act', action: 'clickCard', cardId: 2 });
  h.feed('ask', { askId: 'a4', kind: 'ability_menu', cardId: 2, options: [
    { id: 0, label: 'A.I.M. Scientists - Creature 3 / 3', kind: 'ability', abilityId: 444, cardId: 2, canPlay: true, isSpell: true },
    { id: 1, label: 'Basic landcycling {2}', kind: 'ability', abilityId: 443, cardId: 2, canPlay: true, isSpell: false }] });
  await h.tick();
  assert.deepEqual(h.last(), { type: 'answer', askId: 'a4', value: 0 });
  assert.equal(h.users.length, 1);
});

// ---------------------------------------------------------------- the loop guard

const cancelGame = (h) => async () => {
  // back at priority, the card still in hand: the engine cancelled the cast
  h.feed('state', state({ turn: 3, me: { hand: [card(70, 'Helicarrier Strike', { manaCost: '{1}{W}', types: 'Sorcery' })], battlefield: plains(2) }, playable: playable([70]) }));
  h.feed('input', priorityInput(3));
  await h.tick();
};

test('loop guard, plan mode: a cancelled cast is a correction, never tried a third time', async () => {
  const h = harness([reply('cast Helicarrier Strike'), reply('cast Helicarrier Strike'), reply('cast Helicarrier Strike')]);
  const back = cancelGame(h);
  await back();
  assert.deepEqual(h.last(), { type: 'act', action: 'clickCard', cardId: 70 });
  await back();
  assert.match(h.users[1], /^Step 1 'cast Helicarrier Strike' cannot be done: that cast was cancelled: Helicarrier Strike went back/);
  await back();
  assert.match(h.users[2], /cancelled 2 times this turn and is not tried again/);
  const clicks = h.moves().filter((m) => m.action === 'clickCard' && m.cardId === 70).length;
  assert.equal(clicks, 2);
  assert.deepEqual(h.last(), { type: 'act', action: 'passPriority' });
  for (let i = 0; i < 3; i++) await back();
  assert.equal(h.moves().filter((m) => m.action === 'clickCard' && m.cardId === 70).length, 2, 'never a third time');
  assert.equal(h.users.length, 3);
});

test('loop guard, decision mode: a card whose cast was cancelled twice is not offered again this turn', async () => {
  const sent = [];
  let t = 1000;
  let seq = 0;
  const core = new SeatCore({ send: (m) => sent.push(m), arm: new Arm('fresh', makeFakeModel()), oracle: ORACLE, now: () => t, useStops: false });
  const feed = (type, body) => { seq += 1; core.onFrame({ v: 1, seq, type, body }); };
  feed('hello_ok', { gameId: 'loop', you: 0 });
  for (let i = 0; i < 5; i++) {
    feed('state', state({ turn: 3, me: { hand: [card(70, 'Helicarrier Strike', { manaCost: '{1}{W}', types: 'Sorcery' })], battlefield: mountains(2) }, playable: playable([70]) }));
    feed('input', priorityInput(3));
    t += 200;
    await core.tick();
  }
  assert.equal(sent.filter((m) => m.action === 'clickCard').length, 2);
  assert.deepEqual(sent.at(-1), { type: 'act', action: 'passPriority' });
});

// ---------------------------------------------------------------- the fake model and the system prompt

test('the system prompt opens with the reply format; the fake plans from the plain words', () => {
  assert.match(PLAN_SYSTEM, /^REPLY FORMAT\. Every reply/);
  assert.match(PLAN_SYSTEM, /sent back to you as invalid, and that costs a turn of conversation/);
  const example = PLAN_SYSTEM.slice(PLAN_SYSTEM.indexOf('Example:') + 9, PLAN_SYSTEM.indexOf('\nEND', PLAN_SYSTEM.indexOf('Example:')) + 4);
  assert.equal(parsePlan(example).ok, true, 'the worked example is itself a valid reply');
  const r = parsePlan(fakePlan('It is your turn 3. What do you do this turn?\n\nWHAT THE ENGINE LETS YOU DO NOW\n  play a land: Island\n  cast: Shock {R}; Opt {U}\n  can attack this turn: Grizzly Bears 2/2\n'));
  assert.deepEqual(r.steps.map((s) => s.raw), ['play land Island', 'cast Shock', 'attack with Grizzly Bears']);
});

// ---------------------------------------------------------------- end to end over the socket

test('plan mode end to end over a socket: files and the game summary', async () => {
  const isAct = (action) => (f) => f.type === 'act' && f.body.action === action;
  const bridge = await startFakeBridge(async (c) => {
    c.send('hello_ok', { gameId: 'plan-e2e', you: 0, seed: 1, forgeVersion: 'test', players: [] });
    c.send('state', state({ turn: 0, phase: null, me: { hand: [land(10), creature(11, 'Grizzly Bears', 2, 2)] } }));
    c.send('input', input('Human, you are going first!\n\nDo you want to keep your hand?', { ok: ['Keep', true], cancel: ['Mulligan', true] }));
    await c.next(isAct('buttonOk'));
    c.send('state', state({ turn: 1, me: { hand: [land(10), creature(11, 'Grizzly Bears', 2, 2)] }, events: [{ kind: 'turn', player: 0, turn: 1 }], playable: playable([10, false], [11]) }));
    c.send('input', priorityInput(1));
    await c.next((f) => f.type === 'act' && f.body.action === 'clickCard' && f.body.cardId === 10);
    c.send('input', priorityInput(1));
    c.send('state', state({ turn: 1, me: { hand: [creature(11, 'Grizzly Bears', 2, 2)], battlefield: [land(10, 'Forest', { zone: 'battlefield' })] }, events: [{ kind: 'land', player: 0, cardId: 10 }], playable: playable([11]) }));
    c.send('input', priorityInput(1));
    await c.next(isAct('passPriority'));   // the bear cannot be paid (the fake leaves it out): the plan is used up
    c.send('state', state({ turn: 1, gameOver: { winner: 1, reason: 'Concede' }, events: [{ kind: 'outcome', winner: 1, lastTurn: 1 }] }));
    c.send('over', { winner: 1, reason: 'Concede', matchOver: true });
  });
  let scriptError = null;
  bridge.server.on('script-error', (e) => { scriptError = e; });
  const out = mkdtempSync(join(tmpdir(), 'llm-seat-plan-'));
  const a = { ...parseArgs(['--port', String(bridge.port), '--run', 'p', '--quiet', '--timeout', '30']), out };
  assert.equal(a.mode, 'plan', 'plan is the default mode');
  const summary = await runSeat(a, { model: makeFakeModel(), oracle: ORACLE });
  await bridge.close();
  assert.equal(scriptError, null, scriptError?.message);
  assert.equal(summary.result, 'loss');
  assert.equal(summary.mode, 'plan');
  assert.deepEqual(summary.moments, { mulligan: 1, turn: 1 });
  assert.equal(summary.corrections, 0);
  assert.equal(summary.modelCalls, 2);
  const recs = readFileSync(join(out, 'p', 'decisions.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const plans = recs.filter((r) => r.kind === 'plan');
  assert.deepEqual(plans.map((r) => r.moment), ['mulligan', 'turn']);
  for (const k of ['calls', 'steps', 'plan', 'how', 'question']) assert.ok(k in plans[1], k);
  assert.equal(plans[1].calls[0].parse, 'ok');
  assert.deepEqual(plans[1].steps, ['play land Forest']);
  assert.ok(recs.some((r) => r.kind === 'step' && r.status === 'sent' && r.text === 'play land Forest'));
  assert.ok(recs.some((r) => r.how === 'auto' && /used up/.test(r.reason)), 'no call once the plan is used up');
});

test('faceNamesOf reads both halves of an adventure card (s20 Swift End)', async () => {
  const { faceNamesOf } = await import('../lib/plan-core.mjs');
  assert.deepEqual(faceNamesOf('Murderous Rider: Lifelink. When this dies, put it on the bottom. // Swift End: Destroy target creature or planeswalker. You lose 2 life.'), ['Murderous Rider', 'Swift End']);
  assert.deepEqual(faceNamesOf('Flying'), []);
});

test('mana is paid keeping the colour a later cast step needs (sk1: Overseer then Hard Evidence)', async () => {
  const h = harness([reply('cast Inspiring Overseer\n2. cast Hard Evidence')]);
  const island = land(9, 'Island', { zone: 'battlefield', types: 'Basic Land - Island' });
  const overseer = card(60, 'Inspiring Overseer', { manaCost: '{2}{W}', types: 'Creature - Human Cleric' });
  const evidence = card(61, 'Hard Evidence', { manaCost: '{U}', types: 'Sorcery' });
  h.feed('state', state({ turn: 3, me: { hand: [overseer, evidence], battlefield: [...plains(3), island] }, playable: playable([60], [61]) }));
  h.feed('input', priorityInput(3));
  await h.tick();
  h.feed('input', input('Inspiring Overseer (60)\n\nPay Mana Cost: {2}{W}', { ok: ['Auto', true], cancel: ['Cancel', true] }));
  await h.tick();
  const first = h.last();
  assert.equal(first.action, 'clickCard');
  assert.notEqual(first.cardId, 9, 'the Island is kept for Hard Evidence');
});

test('a payment never taps the same land twice while the state lags, and keeps W for a later Swords (sk5)', async () => {
  const h = harness([reply('cast Solitude\n2. cast Swords to Plowshares')]);
  const islands = [7, 8, 9].map((id) => land(id, 'Island', { zone: 'battlefield', types: 'Basic Land - Island' }));
  const solitude = card(60, 'Solitude', { manaCost: '{3}{W}{W}', types: 'Creature - Elemental Incarnation' });
  const swords = card(61, 'Swords to Plowshares', { manaCost: '{W}', types: 'Instant' });
  h.feed('state', state({ turn: 3, me: { hand: [solitude, swords], battlefield: [...plains(3), ...islands] }, playable: playable([60], [61]) }));
  h.feed('input', priorityInput(3));
  await h.tick();
  h.feed('input', input('Solitude (60)\n\nPay Mana Cost: {3}{W}{W}', { ok: ['Auto', true], cancel: ['Cancel', true] }));
  await h.tick();
  const a = h.last();
  h.feed('input', input('Solitude (60)\n\nPay Mana Cost: {3}{W}', { ok: ['Auto', true], cancel: ['Cancel', true] }));
  await h.tick();
  const b = h.last();
  h.feed('input', input('Solitude (60)\n\nPay Mana Cost: {3}', { ok: ['Auto', true], cancel: ['Cancel', true] }));
  await h.tick();
  const c = h.last();
  assert.equal(a.action, 'clickCard'); assert.equal(b.action, 'clickCard'); assert.equal(c.action, 'clickCard');
  assert.notEqual(a.cardId, b.cardId, 'two different Plains');
  assert.ok([1, 2, 3].includes(a.cardId) && [1, 2, 3].includes(b.cardId));
  assert.ok([7, 8, 9].includes(c.cardId), 'generic from an Island, the third Plains kept for Swords');
});

test('a token named with or without "Token", with its number, matches (sk6 Insect Token #148)', async () => {
  const { matchRef, parseRef } = await import('../lib/plan.mjs');
  const cands = [{ id: 148, name: 'Insect', group: 'battlefield:1' }, { id: 95, name: 'Snapcaster Mage', group: 'battlefield:1' }];
  assert.equal(matchRef(parseRef('Insect Token #148'), cands).pick?.id, 148);
  assert.equal(matchRef(parseRef('Insect Token'), cands).pick?.id, 148);
  assert.equal(matchRef(parseRef('Grizzly Bears #148'), cands).ok, false);
});

test('a card cast from the graveyard shows and checks its flashback cost (sk7 Momentary Blink)', async () => {
  const { zoneCost } = await import('../lib/mana.mjs');
  const blink = card(25, 'Momentary Blink', { manaCost: '{1}{W}', types: 'Instant', zone: 'graveyard' });
  const oracle = { text: (n) => (n === 'Momentary Blink' ? 'Exile target creature you control, then return it.\nFlashback {3}{U}' : null) };
  assert.deepEqual(zoneCost(blink, 'graveyard', oracle), { cost: '{3}{U}', how: 'flashback' });
  assert.equal(zoneCost(blink, 'hand', oracle), null);
});

test('options that differ only in a bracketed cost: a full copy or one distinguishing word picks (sk8 Bone Shards)', async () => {
  const { classifyAsk } = await import('../lib/decision.mjs');
  const h = harness([]);
  h.feed('state', state({ turn: 3 }));
  const ask = { askId: 'a9', kind: 'ability_menu', cardId: 40, options: [
    { id: 0, label: 'Destroy target creature or planeswalker. (Additional cost: Sacrifice a creature)', kind: 'ability', cardId: 40, canPlay: true, isSpell: true },
    { id: 1, label: 'Destroy target creature or planeswalker. (Additional cost: Discard a card)', kind: 'ability', cardId: 40, canPlay: true, isSpell: true },
  ] };
  const d = classifyAsk({ state: h.core.state, ask, me: 0 });
  const plan = { steps: [{ verb: 'choose', names: 'x' }], i: 0 };
  const full = h.core.answerWith(d, plan, plan.steps[0], 'Destroy target creature or planeswalker. (Additional cost: Discard a card)');
  assert.deepEqual(full.moves, [{ type: 'answer', askId: 'a9', value: 1 }]);
  plan.i = 0;
  const word = h.core.answerWith(d, plan, plan.steps[0], 'discard');
  assert.deepEqual(word.moves, [{ type: 'answer', askId: 'a9', value: 1 }]);
  plan.i = 0;
  assert.ok(h.core.answerWith(d, plan, plan.steps[0], 'Destroy target creature or planeswalker').fail, 'ambiguous stays a correction');
});

test('a yes/no question takes plain words: "don\'t pay" is No, "pay" is Yes (sk9 shockland)', async () => {
  const { classifyAsk } = await import('../lib/decision.mjs');
  const h = harness([]);
  h.feed('state', state({ turn: 3 }));
  const ask = { askId: 'a4', kind: 'confirm', prompt: 'Do you want to pay 2 life?', yesLabel: 'Yes', noLabel: 'No', defaultYes: false };
  const d = classifyAsk({ state: h.core.state, ask, me: 0 });
  const plan = { steps: [{ verb: 'choose', names: 'x' }], i: 0 };
  assert.deepEqual(h.core.answerWith(d, plan, plan.steps[0], "don't pay").moves, [{ type: 'answer', askId: 'a4', value: false }]);
  plan.i = 0;
  assert.deepEqual(h.core.answerWith(d, plan, plan.steps[0], 'pay').moves, [{ type: 'answer', askId: 'a4', value: true }]);
});
