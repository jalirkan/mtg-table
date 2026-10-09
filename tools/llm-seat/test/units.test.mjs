// mtg-table — tools/llm-seat/test/units.test.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// node --test tools/llm-seat/test/   -- the reply parser, the ask / auto-pass
// rules, the stop-setting, the model plumbing (no real model is ever called).

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Arm, parseArm } from '../lib/arms.mjs';
import { checkChoice, classifyAsk, classifyInput, movesFor, tokenFor } from '../lib/decision.mjs';
import { claudeArgs, fakeChoice, makeFakeModel, parseCliOutput, thinkingEnv } from '../lib/model.mjs';
import { hasNonManaActivated, oracleFromObjects } from '../lib/oracle.mjs';
import { snapshot } from '../lib/prompt.mjs';
import { parseReply } from '../lib/reply.mjs';
import { History } from '../lib/history.mjs';
import { defaultStops, desiredStops, stopActs } from '../lib/stops.mjs';
import { ORACLE, card, creature, input, land, priorityInput, state } from './helpers.mjs';

// ---------------------------------------------------------------- the reply parser

test('reply: one choice, several, none, with next stops', () => {
  assert.deepEqual(parseReply('choice: 3'), { ok: true, choice: [3], next: null });
  assert.deepEqual(parseReply('  Choice:2, 5 \n'), { ok: true, choice: [2, 5], next: null });
  assert.deepEqual(parseReply('choice: none'), { ok: true, choice: [], next: null });
  assert.deepEqual(parseReply('choice: 1\nnext: opp END_OF_TURN, own main1'),
    { ok: true, choice: [1], next: [{ turn: 'opp', phase: 'END_OF_TURN' }, { turn: 'own', phase: 'MAIN1' }] });
  assert.deepEqual(parseReply('next: default\nchoice: 2'), { ok: true, choice: [2], next: [] });
  assert.deepEqual(parseReply('```\nchoice: 4\n```'), { ok: true, choice: [4], next: null });
});

test('reply: malformed replies say why', () => {
  assert.match(parseReply('I think 3').error, /unexpected line/);
  assert.match(parseReply('choice: three').error, /option numbers/);
  assert.match(parseReply('next: opp END_OF_TURN').error, /no "choice:" line/);
  assert.match(parseReply('choice: 1\nchoice: 2').error, /more than one choice/);
  assert.match(parseReply('choice: 1\nnext: opp ENDSTEP').error, /not a phase/);
  assert.match(parseReply('choice: 1\nnext: theirs MAIN1').error, /own PHASE/);
  assert.equal(parseReply('').ok, false);
  assert.equal(parseReply(undefined).ok, false);
});

// ---------------------------------------------------------------- when to ask

test('priority with nothing playable passes with no call', () => {
  const s = state({ playable: [], me: { hand: [creature(11, 'Grizzly Bears', 2, 2)], battlefield: [land(1, 'Forest', { zone: 'battlefield' })] } });
  const d = classifyInput({ state: s, input: priorityInput(), me: 0, oracle: ORACLE });
  assert.equal(d.kind, 'priority');
  assert.equal(d.auto.reason, 'priority with nothing playable');
  assert.deepEqual(d.auto.moves, [{ type: 'act', action: 'passPriority' }]);
});

test('priority with playable cards asks, offering the engine list; the token is coach-grade\'s', () => {
  const s = state({
    me: { hand: [land(10), creature(11, 'Grizzly Bears', 2, 2)] },
    playable: [
      { cardId: 10, zone: 'hand', abilities: [{ abilityId: 1, label: 'Play land', isSpell: false }] },
      { cardId: 11, zone: 'hand', abilities: [{ abilityId: 2, label: 'Grizzly Bears', isSpell: true }] },
    ],
  });
  const d = classifyInput({ state: s, input: priorityInput(), me: 0, oracle: ORACLE });
  assert.equal(d.auto, null);
  assert.deepEqual(d.options.map((o) => o.n), [1, 2, 3]);
  assert.match(d.options[1].label, /^Play land Forest \[10\]/);
  assert.match(d.options[2].label, /^Cast Grizzly Bears \[11\]/);
  assert.equal(d.gradeType, 'spell');
  assert.equal(tokenFor(d, [1]), 'pass');
  assert.equal(tokenFor(d, [2]), 'land:10');
  assert.equal(tokenFor(d, [3]), 'cast:11');
  assert.deepEqual(movesFor(d, [3]), [{ type: 'act', action: 'clickCard', cardId: 11 }]);
});

test('a permanent with a non-mana activated ability is offered; a mana ability is not', () => {
  const s = state({
    playable: [],
    me: { battlefield: [creature(20, 'Prodigal Sorcerer', 1, 1, { zone: 'battlefield' }), creature(21, 'Llanowar Elves', 1, 1, { zone: 'battlefield' })] },
  });
  const d = classifyInput({ state: s, input: priorityInput(), me: 0, oracle: ORACLE });
  assert.equal(d.options.length, 2);
  assert.match(d.options[1].label, /Prodigal Sorcerer \[20\]/);
  const tapped = state({ playable: [], me: { battlefield: [creature(20, 'Prodigal Sorcerer', 1, 1, { zone: 'battlefield', tapped: true })] } });
  assert.ok(classifyInput({ state: tapped, input: priorityInput(), me: 0, oracle: ORACLE }).auto);
  assert.ok(classifyInput({ state: s, input: priorityInput(), me: 0, oracle: ORACLE, opts: { battlefieldAbilities: false } }).auto);
});

test('oracle hint: activated non-mana abilities', () => {
  assert.equal(hasNonManaActivated('{T}: Add {G}.'), false);
  assert.equal(hasNonManaActivated('{2}, {T}: Draw a card.'), true);
  assert.equal(hasNonManaActivated('Flying\nEquip {2}'), false);
  assert.equal(hasNonManaActivated('Equip {2}: Attach to target creature you control.'), true);
  assert.equal(hasNonManaActivated('When this enters, draw a card.'), false);
  assert.equal(hasNonManaActivated(null), false);
});

test('mana payment is the engine\'s Auto, never a call', () => {
  const s = state();
  const d = classifyInput({ state: s, input: input('Grizzly Bears - Creature 2 / 2\n\nPay Mana Cost: {1}{G}', { ok: ['Auto', true], cancel: ['Cancel', true] }), me: 0, oracle: ORACLE });
  assert.equal(d.kind, 'pay');
  assert.deepEqual(d.auto.moves, [{ type: 'act', action: 'buttonOk' }]);
  const off = classifyInput({ state: s, input: input('Pay Mana Cost: {X}', { ok: ['Auto', false], cancel: ['Cancel', true] }), me: 0, oracle: ORACLE });
  assert.deepEqual(off.auto.moves, [{ type: 'act', action: 'buttonCancel' }]);
});

test('the mulligan asks, keep first', () => {
  const d = classifyInput({ state: state({ turn: 0, phase: null, priority: null }), input: input('Forge AI is going first.\nHuman, you are going 2nd.\n\nDo you want to keep your hand?', { ok: ['Keep', true], cancel: ['Mulligan', true] }), me: 0, oracle: ORACLE });
  assert.equal(d.kind, 'mulligan');
  assert.equal(d.auto, null);
  assert.deepEqual(movesFor(d, [2]), [{ type: 'act', action: 'buttonCancel' }]);
});

test('attack: candidates from the board, clicks then OK, the grade token sorted', () => {
  const s = state({ turn: 3, phase: 'COMBAT_DECLARE_ATTACKERS', me: { battlefield: [
    creature(31, 'Grizzly Bears', 2, 2, { zone: 'battlefield' }),
    creature(30, 'Grizzly Bears', 2, 2, { zone: 'battlefield' }),
    creature(32, 'Grizzly Bears', 2, 2, { zone: 'battlefield', sick: true }),
    creature(33, 'Grizzly Bears', 2, 2, { zone: 'battlefield', tapped: true }),
    creature(34, 'Raging Goblin', 1, 1, { zone: 'battlefield', sick: true, keywords: ['HASTE'] }),
  ] } });
  const d = classifyInput({ state: s, input: input('Select creatures to attack Forge AI or select player/card you wish to attack.', { ok: ['OK', true], cancel: ['Alpha Strike', true] }), me: 0, oracle: ORACLE });
  assert.equal(d.kind, 'attack');
  assert.deepEqual(d.options.map((o) => o.cardId ?? null), [null, 31, 30, 34]);
  assert.equal(checkChoice(d, [1, 2]), '"No attack" cannot be combined with other options');
  assert.equal(checkChoice(d, [2, 3]), null);
  assert.deepEqual(movesFor(d, [3, 2]), [{ type: 'act', action: 'clickCard', cardId: 30 }, { type: 'act', action: 'clickCard', cardId: 31 }, { type: 'act', action: 'buttonOk' }]);
  assert.equal(tokenFor(d, [3, 2]), 'attack:30,31');
  assert.equal(tokenFor(d, [1]), 'attack:none');
  assert.deepEqual(movesFor(d, [1]), [{ type: 'act', action: 'buttonOk' }]);
  // a creature the engine already declared is toggled off only when not wanted
  const pre = { ...d, current: [31] };
  assert.deepEqual(movesFor(pre, [2]), [{ type: 'act', action: 'buttonOk' }]);
  assert.deepEqual(movesFor(pre, [1]), [{ type: 'act', action: 'clickCard', cardId: 31 }, { type: 'act', action: 'buttonOk' }]);
});

test('block: pairs, one attacker per blocker, attacker then blocker clicks', () => {
  const s = state({
    turn: 4, phase: 'COMBAT_DECLARE_BLOCKERS', active: 1, priority: 0,
    me: { battlefield: [creature(31, 'Grizzly Bears', 2, 2, { zone: 'battlefield' }), creature(32, 'Grizzly Bears', 2, 2, { zone: 'battlefield' })] },
    opp: { battlefield: [creature(50, 'Hill Giant', 3, 3, { zone: 'battlefield', controller: 1, owner: 1, attacking: true })] },
    combat: { bands: [{ attackerIds: [50], defender: { kind: 'player', id: 0 }, blockerIds: [], damageOrder: [] }] },
  });
  const d = classifyInput({ state: s, input: input('Select creatures to block Hill Giant (50) or select another attacker to declare blockers for.'), me: 0, oracle: ORACLE });
  assert.equal(d.kind, 'block');
  assert.equal(d.options.length, 3);
  assert.equal(checkChoice(d, [2, 3]), null);   // a double block
  assert.deepEqual(movesFor(d, [2, 3]), [
    { type: 'act', action: 'clickCard', cardId: 50 }, { type: 'act', action: 'clickCard', cardId: 31 },
    { type: 'act', action: 'clickCard', cardId: 50 }, { type: 'act', action: 'clickCard', cardId: 32 },
    { type: 'act', action: 'buttonOk' }]);
  assert.equal(tokenFor(d, [3, 2]), 'block:31>50,32>50');
  assert.equal(tokenFor(d, [1]), 'block:none');
  const none = classifyInput({ state: { ...s, combat: null }, input: input('Select creatures to block Hill Giant (50)'), me: 0, oracle: ORACLE });
  assert.ok(none.auto);
});

test('a target selection asks unless one target is the only answer', () => {
  const s = state({ me: { battlefield: [creature(31, 'Grizzly Bears', 2, 2, { zone: 'battlefield' })] }, opp: { battlefield: [creature(50, 'Hill Giant', 3, 3, { zone: 'battlefield', controller: 1 })] } });
  const two = classifyInput({ state: s, input: input('Shock - Select target creature', { ok: ['OK', false], cancel: ['Cancel', true], sel: { cardIds: [31, 50], min: 1, max: 1, mode: 'cards' } }), me: 0, oracle: ORACLE });
  assert.equal(two.kind, 'select');
  assert.equal(two.auto, null);
  assert.deepEqual(two.options.map((o) => o.token ?? null), ['target:31', 'target:50', null]);
  assert.equal(two.gradeType, 'target');
  const one = classifyInput({ state: s, input: input('Shock - Select target creature', { ok: ['OK', false], cancel: ['Cancel', true], sel: { cardIds: [50], min: 1, max: 1, mode: 'cards' } }), me: 0, oracle: ORACLE });
  assert.deepEqual(one.auto.moves, [{ type: 'act', action: 'clickCard', cardId: 50 }]);
});

test('waiting, yielding and an empty targeting prompt are not decisions', () => {
  const s = state();
  assert.deepEqual(classifyInput({ state: s, input: input('Waiting for Forge AI...', { ok: ['OK', false] }), me: 0, oracle: ORACLE }).auto.moves, []);
  assert.deepEqual(classifyInput({ state: s, input: input('Yielding until end of turn.', { ok: ['OK', false], cancel: ['Cancel', true] }), me: 0, oracle: ORACLE }).auto.moves, []);
  assert.equal(classifyInput({ state: s, input: input('Shock - Select target creature', { ok: ['OK', false], cancel: ['Cancel', true] }), me: 0, oracle: ORACLE }).kind, 'target-wait');
});

test('asks: every engine question goes to the model unless one answer is legal', () => {
  const s = state();
  const opts = ['White', 'Blue', 'Green'].map((l, i) => ({ id: i, label: l, kind: 'color' }));
  const single = classifyAsk({ state: s, ask: { askId: 'a1', kind: 'choose_list', prompt: 'Choose a color', options: opts, preselected: [], min: 1, max: 1, reveal: false } });
  assert.equal(single.auto, null);
  assert.deepEqual(movesFor(single, [2]), [{ type: 'answer', askId: 'a1', value: [1] }]);
  const optional = classifyAsk({ state: s, ask: { askId: 'a2', kind: 'choose_list', prompt: 'Choose optional costs', options: opts.slice(0, 1), preselected: [], min: 0, max: 1, reveal: false } });
  assert.deepEqual(optional.options.map((o) => o.label), ['White', 'None']);
  assert.deepEqual(movesFor(optional, [2]), [{ type: 'answer', askId: 'a2', value: [] }]);
  const multi = classifyAsk({ state: s, ask: { askId: 'a3', kind: 'choose_entities', prompt: 'Choose two', options: opts, min: 2, max: 2 } });
  assert.equal(multi.multi, true);
  assert.equal(checkChoice(multi, [1]), 'choose between 2 and 2 options');
  assert.deepEqual(movesFor(multi, [1, 3]), [{ type: 'answer', askId: 'a3', value: [0, 2] }]);
  assert.deepEqual(classifyAsk({ state: s, ask: { askId: 'a4', kind: 'choose_list', prompt: 'Looking at', options: opts, min: -1, max: -1, reveal: true } }).auto.moves, [{ type: 'answer', askId: 'a4', value: [] }]);
  assert.deepEqual(classifyAsk({ state: s, ask: { askId: 'a5', kind: 'choose_list', prompt: 'Pick', options: opts.slice(0, 1), min: 1, max: 1 } }).auto.moves, [{ type: 'answer', askId: 'a5', value: [0] }]);
  const conf = classifyAsk({ state: s, ask: { askId: 'a6', kind: 'confirm', prompt: 'Pass priority with mana in pool?', yesLabel: 'Yes', noLabel: 'No', defaultYes: true, card: null } });
  assert.deepEqual(conf.fallback, [1]);
  assert.deepEqual(movesFor(conf, [2]), [{ type: 'answer', askId: 'a6', value: false }]);
  assert.deepEqual(classifyAsk({ state: s, ask: { askId: 'a7', kind: 'order', prompt: 'Order', source: opts, dest: [], min: -1, max: -1 } }).auto.moves[0].value, { ordered: [], remember: false });
  assert.deepEqual(classifyAsk({ state: s, ask: { askId: 'a8', kind: 'text', prompt: 'n', numeric: true } }).auto.moves[0].value, null);
});

test('an ability menu after a priority choice is answered by that choice (id, else label)', () => {
  const s = state();
  const ask = { askId: 'a9', kind: 'ability_menu', cardId: 11, options: [
    { id: 0, label: 'Adventure: Stomp', abilityId: 70, canPlay: true, isSpell: true },
    { id: 1, label: 'Bonecrusher Giant', abilityId: 71, canPlay: true, isSpell: true }] };
  assert.deepEqual(classifyAsk({ state: s, ask, intent: { cardId: 11, abilityId: 71 } }).auto.moves, [{ type: 'answer', askId: 'a9', value: 1 }]);
  assert.deepEqual(classifyAsk({ state: s, ask, intent: { cardId: 11, abilityId: 99, abilityLabel: 'Adventure: Stomp' } }).auto.moves, [{ type: 'answer', askId: 'a9', value: 0 }]);
  const posed = classifyAsk({ state: s, ask });
  assert.equal(posed.auto, null);
  assert.equal(posed.options.at(-1).label, 'Never mind (play nothing)');
});

// ---------------------------------------------------------------- the stops

test('default stops follow the board; setPhaseStop acts are the difference', () => {
  const bare = state();
  const d0 = defaultStops(bare, 0, ORACLE);
  assert.deepEqual([...d0.own], ['MAIN1', 'MAIN2']);
  assert.deepEqual([...d0.opp], []);
  const acts = stopActs(bare, 0, d0);
  assert.deepEqual(acts.map((a) => `${a.turn} ${a.phase} ${a.stop}`), [
    'own COMBAT_DECLARE_BLOCKERS false',
    'opp COMBAT_BEGIN false', 'opp COMBAT_DECLARE_ATTACKERS false', 'opp COMBAT_DECLARE_BLOCKERS false', 'opp END_OF_TURN false']);
  const board = state({ me: {
    battlefield: [creature(31, 'Grizzly Bears', 2, 2, { zone: 'battlefield' }), land(1, 'Mountain', { zone: 'battlefield' })],
    hand: [card(40, 'Shock', { types: 'Instant', manaCost: '{R}' })],
  } });
  const d1 = defaultStops(board, 0, ORACLE);
  assert.deepEqual([...d1.opp].sort(), ['COMBAT_DECLARE_BLOCKERS', 'END_OF_TURN']);
  const tappedOut = state({ me: { battlefield: [land(1, 'Mountain', { zone: 'battlefield', tapped: true })], hand: [card(40, 'Shock', { types: 'Instant' })] } });
  assert.equal(defaultStops(tappedOut, 0, ORACLE).opp.has('END_OF_TURN'), false);
  const want = desiredStops(bare, 0, [{ turn: 'opp', phase: 'UPKEEP' }], ORACLE);
  assert.ok(want.opp.has('UPKEEP'));
  assert.deepEqual(stopActs(bare, 0, want).filter((a) => a.stop), [{ type: 'act', action: 'setPhaseStop', phase: 'UPKEEP', turn: 'opp', stop: true }]);
  const old = state();
  delete old.players[0].phaseStops;
  assert.deepEqual(stopActs(old, 0, want), []);
});

// ---------------------------------------------------------------- the model plumbing

test('claude args: fresh has no session; a session starts with its id and resumes it', () => {
  const sys = ['--system-prompt', 'S'];
  const fresh = claudeArgs({ model: 'sonnet', systemArg: sys, session: null });
  assert.ok(fresh.includes('--no-session-persistence'));
  assert.ok(!fresh.includes('--resume'));
  assert.deepEqual(fresh.slice(0, 5), ['-p', '--output-format', 'json', '--model', 'sonnet']);
  assert.ok(fresh.includes('--tools') && fresh[fresh.indexOf('--tools') + 1] === '');
  const start = claudeArgs({ model: 'sonnet', systemArg: sys, session: { id: 'u1', resume: false } });
  assert.deepEqual(start.slice(-2), ['--session-id', 'u1']);
  const resume = claudeArgs({ model: 'sonnet', systemArg: sys, session: { id: 'u1', resume: true } });
  assert.deepEqual(resume.slice(-2), ['--resume', 'u1']);
  assert.ok(!resume.includes('--no-session-persistence'));
  assert.deepEqual(thinkingEnv('low'), { MAX_THINKING_TOKENS: '1024', CLAUDE_CODE_EFFORT_LEVEL: 'low' });
  assert.deepEqual(thinkingEnv('default'), {});
});

test('the CLI\'s JSON result: text, usage, session id', () => {
  const r = parseCliOutput(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'choice: 2', session_id: 's-9',
    total_cost_usd: 0.01, usage: { input_tokens: 12, cache_creation_input_tokens: 3000, cache_read_input_tokens: 900, output_tokens: 7 }, modelUsage: { 'claude-sonnet-x': {} } }));
  assert.deepEqual(r, { text: 'choice: 2', usage: { input: 12, cacheCreate: 3000, cacheRead: 900, output: 7 }, sessionId: 's-9', costUsd: 0.01, model: 'claude-sonnet-x' });
  const arr = parseCliOutput(JSON.stringify([{ type: 'system' }, { type: 'result', is_error: false, result: 'choice: 1' }]));
  assert.equal(arr.text, 'choice: 1');
  assert.throws(() => parseCliOutput(JSON.stringify({ type: 'result', is_error: true, result: 'Not logged in' })), /Not logged in/);
});

test('the fake model picks the first option that is not the default', () => {
  const msg = 'DECISION (priority): You have priority.\nOPTIONS:\n1. Pass priority (do nothing now)\n2. Cast X [3]\n';
  assert.equal(fakeChoice(msg), 'choice: 2');
  assert.equal(fakeChoice('DECISION (attack): x\nOPTIONS:\n1. No attack\n'), 'choice: 1');
  assert.equal(fakeChoice('DECISION (select): Choose 0 to 2 option(s), comma-separated, or "none".\nOPTIONS:\n1. None\n'), 'choice: none');
});

function posed() {
  const h = new History(0);
  const s = state({ me: { hand: [land(10), creature(11, 'Grizzly Bears', 2, 2)] }, playable: [
    { cardId: 10, zone: 'hand', abilities: [{ abilityId: 1, label: 'Play land', isSpell: false }] }] });
  h.push({ type: 'hello_ok', body: { you: 0 } });
  h.push({ type: 'state', seq: 2, body: s });
  const d = classifyInput({ state: s, input: priorityInput(), me: 0, oracle: ORACLE });
  return { snap: snapshot({ history: h, state: s, me: 0, decision: d, oracle: ORACLE }), d };
}

test('an arm retries once on a malformed reply, then plays the default (counted)', async () => {
  const { snap, d } = posed();
  const ok = await new Arm('fresh', makeFakeModel({ script: ['I would play the land.', 'choice: 2'] })).decide(snap, d);
  assert.equal(ok.how, 'model');
  assert.deepEqual(ok.chosen, [2]);
  assert.equal(ok.retries, 1);
  assert.match(ok.calls[0].error, /unexpected line/);
  const bad = await new Arm('fresh', makeFakeModel({ script: ['choice: 9', 'choice: 0'] })).decide(snap, d);
  assert.equal(bad.how, 'fallback');
  assert.deepEqual(bad.chosen, [1]);
  assert.equal(bad.calls.length, 2);
});

test('session arms: full message first, deltas after, restart after N calls', async () => {
  assert.deepEqual(parseArm('session:3'), { name: 'session:3', kind: 'session', n: 3 });
  assert.equal(parseArm('game').n, Infinity);
  assert.throws(() => parseArm('session:0'));
  const seen = [];
  const arm = new Arm('session:2', makeFakeModel(), { onPrompt: (p) => seen.push(p) });
  const { snap, d } = posed();
  const r = [];
  for (let i = 0; i < 5; i++) r.push(await arm.decide(snap, d));
  assert.deepEqual(r.map((x) => x.sessionPos), [0, 1, 0, 1, 0]);
  assert.deepEqual(r.map((x) => x.full), [true, false, true, false, true]);
  assert.deepEqual(seen.map((p) => p.session.resume), [false, true, false, true, false]);
  assert.equal(new Set(seen.filter((p) => !p.session.resume).map((p) => p.session.id)).size, 3);
  assert.match(seen[1].user, /^SINCE YOUR LAST DECISION/);
  assert.equal(arm.resets, 2);
});

test('oracle from Scryfall objects: reminder text dropped, faces joined, a print with text wins', () => {
  const o = oracleFromObjects([
    { name: 'Pym Particles', layout: 'front_card', oracle_text: '' },
    { name: 'Pym Particles', layout: 'normal', oracle_text: 'Flash (You may cast this any time.)\nTarget creature gets +2/+2.' },
    { name: 'Fire // Ice', card_faces: [{ name: 'Fire', oracle_text: 'Fire deals 2 damage.' }, { name: 'Ice', oracle_text: 'Tap target permanent.' }] },
  ]);
  assert.equal(o.text('Pym Particles'), 'Flash\nTarget creature gets +2/+2.');
  assert.equal(o.text('fire // ice'), 'Fire: Fire deals 2 damage. // Ice: Tap target permanent.');
  assert.equal(o.text('Ice'), 'Fire: Fire deals 2 damage. // Ice: Tap target permanent.');
  assert.equal(o.text('Nope'), null);
});

// ---------------------------------------------------------------- the match runner (no engine)

test('run-match: seeds, mirrored deals per arm, the bridge command', async () => {
  const { bridgeCommand, parseArgs, parseSeeds, readPairs, schedule } = await import('../run-match.mjs');
  assert.deepEqual(parseSeeds('1-3,7'), [1, 2, 3, 7]);
  assert.deepEqual(readPairs('# c\na.dck b.dck   # x\n\n'), [{ a: 'a.dck', b: 'b.dck' }]);
  const a = parseArgs(['--deck', 'A.dck', '--ai-deck', 'B.dck', '--seeds', '1-2', '--mirror', '--context', 'fresh,game', '--run', 't']);
  const g = schedule(a);
  assert.equal(g.length, 8);
  assert.deepEqual(g.slice(0, 4).map((x) => `${x.arm} ${x.seed} ${x.deck}>${x.aiDeck}`), ['fresh 1 A.dck>B.dck', 'fresh 1 B.dck>A.dck', 'fresh 2 A.dck>B.dck', 'fresh 2 B.dck>A.dck']);
  assert.deepEqual(bridgeCommand(a, g[1]), ['./bridge/run.sh', 'mtgtable.MtgTable', '--transport', 'ws', '--port', '8650', '--seed', '1',
    '--deck', 'B.dck', '--ai-deck', 'A.dck', '--ai-profile', 'Default', '--ai-policy', 'plain', '--game-id', 'llm-t-002', '--games', '1']);
});
