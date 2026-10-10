// mtg-table — tools/llm-seat/test/recorded.test.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Plan mode (D419) against REAL recorded wire frames (test/fixtures/, cut from
// Sonnet runs' `frames/` and `decisions.jsonl`; the source of each is in the
// fixture's `source`), with the fake model replaying the recorded replies:
//
//   - s2-search-p0-s7: "activate Crypt Rats" with X = 3 could not be paid, and
//     the correction quoted the Rats' casting cost {2}{B}, not its {X} ability;
//   - m20-search-p15: the Eldrazi Spawn token was sent to block Vampire
//     Nighthawk (flying), the engine refused it after it had already taken the
//     Amethyst Dragon's block of Writhing Chrysalis, and every later try's
//     "block … with Amethyst Dragon" was "cannot be selected now": the Dragon
//     was still declared (state 1041's combat);
//   - s2-search-p20-s6: Prophetic Prism ("{1}, {T}: Add one mana of any
//     color") was counted as a seventh mana of any colour, so Welcoming
//     Vampire {2}{W} was sent with no white source and Forge could not pay.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { classifyAsk, classifyInput } from '../lib/decision.mjs';
import { availableMana, isFilterCost, manaLines, payProblem } from '../lib/mana.mjs';
import { planView } from '../lib/plan-prompt.mjs';
import { makeFakeModel } from '../lib/model.mjs';
import { PlanAsker, PlanCore, payWords } from '../lib/plan-core.mjs';
import { card, land, state } from './helpers.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => JSON.parse(readFileSync(join(here, 'fixtures', name), 'utf8'));
const reply = (...steps) => `PLAN: test plan.\nSTEPS:\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\nEND`;
const oracleOf = (map) => ({ source: 'fixture', text: (n) => map?.[n] ?? null });

function harness(script, { oracle = oracleOf({}) } = {}) {
  const sent = [];
  const users = [];
  const fake = makeFakeModel({ script });
  const model = { name: 'fake', call: async (q) => { users.push(q.user); return fake.call(q); } };
  let t = 1000;
  const core = new PlanCore({ send: (m) => sent.push(m), asker: new PlanAsker('fresh', model), oracle, now: () => t, log: () => {}, say: process.env.SAY ? (x) => console.log(x) : () => {} });
  const h = {
    sent, users, core,
    frame(f) { core.onFrame({ v: 1, seq: f.seq, type: f.type, body: f.body }); },
    async tick(ms = 200) { t += ms; await core.tick(); },
    moves: () => sent.filter((m) => m.action !== 'setPhaseStop'),
  };
  core.onFrame({ v: 1, seq: 0, type: 'hello_ok', body: { gameId: 'recorded', you: 0 } });
  return h;
}

// ---------------------------------------------------------------- 1. the cost of an ability that could not be paid

test('s2-search-p0-s7: an activation the engine could not pay quotes the ability\'s cost and what the engine asked for, not the card\'s', async () => {
  const fx = fixture('s2-p0-s7-crypt-rats-pay.json');
  assert.match(fx.recordedFailure, /it costs \{2\}\{B\} \(3 mana\)/, 'the recorded message: the Rats\' casting cost');
  const at = (seq) => fx.frames.find((f) => f.seq === seq);
  // the recorded plan's steps from where the frames start (Plains played, the Rats cast)
  const steps = fx.planSteps.slice(2, 4);
  assert.deepEqual(steps, ['activate Crypt Rats', 'choose 3']);
  const h = harness([reply(...steps), reply('hold')], { oracle: oracleOf(fx.oracle) });
  h.frame(at(1106));
  h.frame(at(1111));
  await h.tick();
  assert.deepEqual(h.moves().at(-1), { type: 'act', action: 'clickCard', cardId: 37 });
  h.frame(at(1112));
  h.frame(at(1113));   // "Choose X for Crypt Rats"
  await h.tick();
  assert.deepEqual(h.moves().at(-1), { type: 'answer', askId: 'a16', value: [3] });
  h.frame(at(1117));   // "Crypt Rats (37) - {X}: … Pay Mana Cost: {B}{B}{B}", Auto disabled
  await h.tick();
  assert.deepEqual(h.moves().at(-1), { type: 'act', action: 'buttonCancel' });
  h.frame(at(1119));
  h.frame(at(1121));   // the payment prompt's buttons over a priority prompt: still paying
  await h.tick();
  h.frame(at(1122));
  await h.tick();
  assert.equal(h.users.length, 2);
  const why = h.users[1].split('\n')[0];
  assert.equal(why, "Step 1 'activate Crypt Rats' cannot be done: the engine could not pay for it from your untapped mana"
    + ' (its ability "{X}: Crypt Rats deals X damage to each creature and each player. Spend only black mana on X." costs {X};'
    + ' the engine asked for {B}{B}{B} (3 mana) and you have 2 untapped mana sources (Swamp, Plains)).');
  assert.doesNotMatch(why, /\{2\}\{B\}/);
});

test('payWords: a fixed ability cost and an Equip label are judged as written; a cast keeps the card\'s cost; flashback its own', () => {
  const s = state({ me: { battlefield: [land(1, 'Island', { zone: 'battlefield', types: 'Basic Land - Island' })] } });
  const step = (verb) => ({ n: 1, verb, raw: `${verb} x` });
  const clue = card(31, 'Clue Token', { zone: 'battlefield', types: 'Artifact - Clue', token: true });
  // the labels as the engine sends them (activatable.test.mjs: Clue from M63, Samurai's Katana from sk2)
  assert.equal(payWords({ step: step('activate'), card: clue, ability: { abilityLabel: '{2}, Sacrifice this token: Draw a card.' } }, null, s, 0, null),
    ' (its ability "{2}, Sacrifice this token: Draw a card." costs {2} (2 mana) and you have 1 untapped mana source (Island))');
  const katana = card(32, "Samurai's Katana", { zone: 'battlefield', types: 'Artifact - Equipment', manaCost: '{2}{R}' });
  const w = payWords({ step: step('activate'), card: katana, ability: { abilityLabel: 'Murasame — Equip {5} ' } }, null, s, 0, null);
  assert.match(w, /^ \(its ability "Murasame — Equip \{5\}" costs \{5\} \(5 mana\)/);
  assert.doesNotMatch(w, /\{2\}\{R\}/, 'never the equipment\'s own cost');
  // a cast from the hand: the card's cost, as before
  assert.match(payWords({ step: step('cast'), card: card(9, 'Robotics Mastery', { manaCost: '{4}{U}' }), zone: 'hand' }, null, s, 0, null), /^ \(it costs \{4\}\{U\} \(5 mana\)/);
  // from the graveyard: the flashback cost
  const blink = card(7, 'Momentary Blink', { manaCost: '{1}{W}', zone: 'graveyard' });
  const ora = { text: (n) => (n === 'Momentary Blink' ? 'Target creature you control gets exiled, then returns.\nFlashback {3}{U}' : null) };
  assert.match(payWords({ step: step('cast'), card: blink, zone: 'graveyard' }, null, s, 0, ora), /^ \(from your graveyard it is cast by flashback: it costs \{3\}\{U\}/);
});

// ---------------------------------------------------------------- 3. blocks

test('m20-search-p15: a block the wire rules out (flying) is not offered, and a plan naming it is corrected before any click', async () => {
  const fx = fixture('m20-p15-amethyst-dragon-blocks.json');
  const at = (seq) => fx.frames.find((f) => f.seq === seq);
  const d = classifyInput({ state: at(984).body, input: at(987).body, me: 0, oracle: null });
  const pairs = d.options.filter((o) => !o.none).map((o) => `${o.blockerId}>${o.attackerId}`);
  for (const flier of [89, 75, 159]) {
    assert.ok(!pairs.includes(`138>${flier}`), `the Spawn token cannot block flier ${flier}`);
    assert.ok(pairs.includes(`3>${flier}`), `the Dragon (flying) can block flier ${flier}`);
  }
  assert.ok(pairs.includes('138>28') && pairs.includes('138>104'));
  assert.match(d.context.join('\n'), /Blocks the rules rule out: Eldrazi Spawn Token cannot block Vampire Nighthawk, Mulldrifter, Thopter Token \(flying\)/);

  // the recorded replies: Spawn on Nighthawk (now refused before a click), then Spawn on Chrysalis + Dragon on Mulldrifter
  const h = harness([fx.replies[0], fx.replies[1]]);
  h.frame(at(984));
  h.frame(at(987));
  await h.tick();
  assert.match(h.users[0], /By the rules: Eldrazi Spawn Token cannot block Vampire Nighthawk, Mulldrifter, Thopter Token \(flying\)\./);
  assert.equal(h.users.length, 2);
  assert.match(h.users[1].split('\n')[0], /^Step 2 'block Vampire Nighthawk with Eldrazi Spawn Token' cannot be done: Eldrazi Spawn Token cannot block Vampire Nighthawk: Vampire Nighthawk has flying and Eldrazi Spawn Token has neither flying nor reach\.$/);
  for (let i = 0; i < 6; i++) { h.frame(at(987)); await h.tick(); }
  const clicks = h.moves().map((m) => m.cardId ?? m.action);
  assert.deepEqual(clicks, [28, 138, 75, 3, 'buttonOk'], 'the corrected blocks, no stale click');
});

test('m20-search-p15: the seat\'s record of the declaration, fed the recorded clicks and refusals, is the engine\'s own (state 1041)', () => {
  const fx = fixture('m20-p15-amethyst-dragon-blocks.json');
  const at = (seq) => fx.frames.find((f) => f.seq === seq);
  const h = harness([]);
  h.frame(at(984));
  h.frame(at(987));
  const notices = [at(1004), at(1021), at(1038)];
  const names = { 138: 'Eldrazi Spawn Token', 3: 'Amethyst Dragon' };
  fx.attempts.forEach((moves, i) => {
    const refusedId = Number(Object.keys(names).find((id) => notices[i].body.text.startsWith(names[id])));
    // one click per tick up to the one the engine refused (the queue is dropped there)
    for (const m of moves) {
      h.core.emit(m, 'recorded');
      if (m.cardId === refusedId) break;
    }
    h.frame(notices[i]);
  });
  const engine = at(1041).body.combat.bands.flatMap((b) => (b.blockerIds ?? []).map((blockerId) => ({ attackerId: b.attackerIds[0], blockerId })));
  assert.deepEqual(engine, [{ attackerId: 28, blockerId: 3 }], 'Forge kept the Dragon on Writhing Chrysalis from the first try');
  assert.deepEqual(h.core.declaredBlocks(), engine);
  // so the Dragon's refusal had a cause readable from the seat's own clicks: the decision now says so
  const d = h.core.currentInputDecision();
  assert.deepEqual(d.declared, engine);
  assert.match(d.context.join('\n'), /Already declared in this declaration: Amethyst Dragon blocks Writhing Chrysalis/);
  assert.deepEqual(d.fallback.map((n) => d.options[n - 1].blockerId), [3], 'the default keeps the block the engine took');
});

test('m20-search-p15: after a half-refused try the next blocks build on what was declared (no click takes a wanted block back)', async () => {
  const fx = fixture('m20-p15-amethyst-dragon-blocks.json');
  const at = (seq) => fx.frames.find((f) => f.seq === seq);
  const h = harness([fx.replies[1]]);
  h.frame(at(984));
  h.frame(at(987));
  // the recorded first try: Dragon on Chrysalis taken, the Spawn refused
  for (const m of fx.attempts[0].slice(0, 4)) h.core.emit(m, 'recorded');
  h.frame(at(1004));
  h.sent.length = 0;
  await h.tick();
  assert.match(h.users[0], /Already declared: Amethyst Dragon blocks Writhing Chrysalis\. Your block steps are the whole declaration/);
  for (let i = 0; i < 8; i++) { h.frame(at(987)); await h.tick(); }
  const clicks = h.moves().map((m) => m.cardId ?? m.action);
  // the Dragon's block of Chrysalis is taken back (Chrysalis, Dragon), then Spawn on Chrysalis and Dragon on Mulldrifter
  assert.deepEqual(clicks, [28, 3, 28, 138, 75, 3, 'buttonOk']);
  assert.deepEqual(h.core.declaredBlocks().sort((a, b) => a.blockerId - b.blockerId), [{ attackerId: 75, blockerId: 3 }, { attackerId: 28, blockerId: 138 }]);
});

// ---------------------------------------------------------------- 2. filter mana: a converter, not extra mana

test('s2-search-p20-s6: Prophetic Prism (a mana ability whose cost needs mana) is no extra mana, but it can make the white: 6 lands, 6 mana', () => {
  const fx = fixture('s2-p20-s6-prophetic-prism.json');
  const st = fx.frames.find((f) => f.seq === 694).body;
  const oracle = oracleOf(fx.oracle);
  assert.equal(fx.oracle['Prophetic Prism'], 'When this artifact enters, draw a card.\n{1}, {T}: Add one mana of any color.');
  assert.match(fx.recordedFailure, /could not pay/);
  const avail = availableMana(st, 0, oracle);
  assert.equal(avail.total, 6, 'the recorded prompt said 7');
  assert.deepEqual(avail.sources.map((x) => x.name), ['Island', 'Swamp', 'Swamp', 'Swamp', 'Island', 'Swamp']);
  assert.ok(!avail.sources.some((x) => x.colors === 'any' || x.colors.has('W')));
  assert.deepEqual(avail.filters.map((f) => [f.name, f.colors, f.cost]), [['Prophetic Prism', 'any', '{1}']]);
  const vampire = st.players[0].zones.hand.cards.find((c) => c.name === 'Welcoming Vampire');
  assert.equal(payProblem(vampire, st, 0, oracle), null, 'the white comes from the Prism, which smart pay clicks');
  assert.match(planView(st, 0, { oracle }), /Untapped mana: 6 \(Island, Swamp, Swamp, Swamp, Island, Swamp: U B B B U B\); Prophetic Prism \(\{1\}: turns one of it into any colour\)\./);
  // the payment the engine could not make by itself: no Auto (frame 701)
  assert.equal(fx.frames.find((f) => f.seq === 701).body.buttons.ok.enabled, false);
});

test('filter mana: a land keeps its free line; a generic-cost filter counts at its net (a Signet +1), a net-0 one is a converter, a board-count or hybrid one nothing (card-index texts)', () => {
  assert.equal(isFilterCost('{1}, {T}'), true);
  assert.equal(isFilterCost('{W/U}, {T}'), true);
  assert.equal(isFilterCost('{T}, Sacrifice this artifact'), false);
  assert.equal(isFilterCost('{T}'), false);
  const texts = {
    'Mystic Gate': '{T}: Add {C}.\n{W/U}, {T}: Add {W}{W}, {W}{U}, or {U}{U}.',
    'Sungrass Prairie': '{1}, {T}: Add {G}{W}.',
    'Dimir Signet': '{1}, {T}: Add {U}{B}.',
    'Prophetic Prism': 'When this artifact enters, draw a card.\n{1}, {T}: Add one mana of any color.',
    'Cabal Coffers': '{2}, {T}: Add {B} for each Swamp you control.',
  };
  assert.deepEqual(manaLines(texts['Mystic Gate']), { free: '{T}: Add {C}.', filter: true, generic: null });
  assert.equal(manaLines(texts['Cabal Coffers']).generic.produced, null, 'the board decides: no net');
  const oracle = oracleOf(texts);
  const s = state({ me: { battlefield: [
    land(1, 'Mystic Gate', { zone: 'battlefield', types: 'Land - Gate' }), land(2, 'Sungrass Prairie', { zone: 'battlefield', types: 'Land' }),
    card(3, 'Dimir Signet', { zone: 'battlefield', types: 'Artifact' }), card(4, 'Prophetic Prism', { zone: 'battlefield', types: 'Artifact' }),
    land(5, 'Cabal Coffers', { zone: 'battlefield', types: 'Land' }),
  ] } });
  const avail = availableMana(s, 0, oracle);
  assert.equal(avail.total, 3, 'Gate 1 + Prairie net 1 + Signet net 1; the Prism and the Coffers add none');
  assert.deepEqual(avail.sources.map((x) => [x.name, [...x.colors].sort().join(''), x.amount, x.filter === true]),
    [['Mystic Gate', 'C', 1, false], ['Sungrass Prairie', 'GW', 1, true], ['Dimir Signet', 'BU', 1, true]]);
  assert.deepEqual(avail.filters.map((f) => [f.name, f.colors, f.cost]), [['Prophetic Prism', 'any', '{1}']]);
  assert.equal(avail.known, true);
  assert.equal(payProblem(card(10, 'Azorius Charm', { manaCost: '{W}{U}' }), s, 0, oracle), null, 'W from the Prairie, U from the Signet');
  assert.match(payProblem(card(11, 'Ugin', { manaCost: '{8}' }), s, 0, oracle), /\(8 mana\) and you have 3 untapped mana sources/);
});

test('Prism probe (real Forge): smart pay clicks Prophetic Prism for {W}, the engine asks the Prism\'s own {1}, Auto pays it, and Savannah Lions is cast -- no correction', async () => {
  const fx = fixture('probe-prism-pay.json');
  assert.deepEqual(fx.probeMoves.map((m) => m.body.cardId ?? m.body.action), [22, 4, 36, 'passPriority'], 'what the probe did');
  const h = harness([reply('cast Savannah Lions'), reply('hold')], { oracle: oracleOf(fx.oracle) });
  const frames = fx.frames;
  for (let i = 0; i < frames.length; i++) {
    h.frame(frames[i]);
    // the seat decides once the stream is quiet (SETTLE_MS 120): where the real stream paused
    const quiet = i === frames.length - 1 || frames[i + 1].t - frames[i].t >= 120;
    if (quiet) await h.tick();
  }
  const moves = h.moves().map((m) => m.cardId ?? m.action);
  // the Lions' click, the Prism's click at "Pay Mana Cost: {W}", Auto for the Prism's {1}, pass with the Lions on the stack, pass when the plan is done
  assert.deepEqual(moves, [22, 4, 'buttonOk', 'passPriority', 'passPriority']);
  assert.equal(h.users.length, 1, 'no correction');
  assert.equal(h.core.stats.stepsFailed, 0);
  // the frame the Prism click answered, and the one it opened
  assert.match(frames.find((f) => f.seq === 138).body.prompt, /Savannah Lions - Creature 2 \/ 1\n\nPay Mana Cost: \{W\}/);
  assert.equal(frames.find((f) => f.seq === 138).body.buttons.ok.enabled, false, 'Forge\'s Auto cannot pay {W} here');
  assert.match(frames.find((f) => f.seq === 144).body.prompt, /^Prophetic Prism \(4\) - \{1\}, \{T\}: Add one mana of any color\.\n\nPay Mana Cost: \{1\}$/);
  assert.ok(frames.find((f) => f.seq === 154).body.events.some((e) => e.kind === 'cast' && e.cardId === 22), 'the Lions were cast');
});

test('Prism probe (real Forge, the Prism clicked at priority): its "Select Mana to Produce" is answered with the colour smart pay wanted', async () => {
  const fx = fixture('probe-prism-pay.json');
  const h = harness([], { oracle: oracleOf(fx.oracle) });
  h.frame(fx.frames.find((f) => f.seq === 128));
  h.core.filterColour = 'W';
  // the ask as probe-prism-B's frame 143 carried it
  h.frame({ seq: 900, type: 'ask', body: { askId: 'a1', kind: 'choose_list', timeoutMs: 0, prompt: 'Select Mana to Produce', options: ['white', 'blue', 'black', 'red', 'green'].map((label, id) => ({ id, label, kind: 'color' })), preselected: [], min: 1, max: 1, reveal: false } });
  await h.tick();
  assert.deepEqual(h.moves().at(-1), { type: 'answer', askId: 'a1', value: [0] });
  assert.equal(h.users.length, 0, 'no question to the model');
});

test('Signet probe (real Forge): Azorius Signet counts +1 and smart pay clicks it -- for Savannah Lions\' {W}, and for Pristine Talisman {3} beside two Swamps', async () => {
  const fx = fixture('probe-signet-pay.json');
  const oracle = oracleOf(fx.oracle);
  assert.equal(fx.oracle['Azorius Signet'], '{1}, {T}: Add {W}{U}.');
  const replay = async (frames, plan) => {
    const h = harness([reply(plan), reply('hold')], { oracle });
    for (let i = 0; i < frames.length; i++) {
      h.frame(frames[i]);
      if (i === frames.length - 1 || frames[i + 1].t - frames[i].t >= 120) await h.tick();
    }
    return h;
  };
  // try C: Swamp, Swamp, Signet untapped; Forge's Auto is off for {W} (the Signet's white is the only one)
  const c0 = fx.tryC[0].body;
  const ac = availableMana(c0, 0, oracle);
  assert.equal(ac.total, 3, 'two Swamps and the Signet\'s net 1');
  assert.equal(payProblem(c0.players[0].zones.hand.cards.find((x) => x.name === 'Savannah Lions'), c0, 0, oracle), null);
  assert.equal(fx.tryC.find((f) => f.seq === 129).body.buttons.ok.enabled, false, 'no Auto for {W}');
  const hc = await replay(fx.tryC, 'cast Savannah Lions');
  assert.deepEqual(hc.moves().slice(0, 3).map((m) => m.cardId ?? m.action), [18, 4, 'buttonOk'], 'the Lions, the Signet, Auto for the Signet\'s {1}');
  assert.equal(hc.users.length, 1, 'no correction');
  assert.ok(fx.tryC.find((f) => f.seq === 145).body.events.some((e) => e.kind === 'cast' && e.cardId === 18));
  assert.equal(fx.tryC.find((f) => f.seq === 145).body.players[0].manaPool.U, 1, 'the Signet\'s blue left in the pool');
  // try D: {3} with two Swamps and the Signet; Auto is off: the Signet's net mana is needed
  assert.equal(fx.tryD.find((f) => f.seq === 193).body.buttons.ok.enabled, false, 'no Auto for {3} either');
  const hd = await replay(fx.tryD, 'cast Pristine Talisman');
  assert.deepEqual(hd.moves().slice(0, 4).map((m) => m.cardId ?? m.action), [22, 4, 'buttonOk', 'buttonOk'], 'the Talisman, the Signet, Auto for its {1}, Auto for the last {1}');
  assert.equal(hd.users.length, 1, 'no correction');
  assert.ok(fx.tryD.find((f) => f.seq === 212).body.events.some((e) => e.kind === 'cast' && e.cardId === 22));
});

test('Signet probe: Forge\'s "mana floating … could be lost" confirm after a pass is answered yes with no call', () => {
  const d = classifyAsk({ state: state(), ask: { askId: 'a1', kind: 'confirm', timeoutMs: 0, prompt: 'You have mana floating in your mana pool that could be lost if you pass priority now.' }, me: 0 });
  assert.deepEqual(d.auto.moves, [{ type: 'answer', askId: 'a1', value: true }]);
});
