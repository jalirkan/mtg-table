#!/usr/bin/env node
// mtg-table — tools/adversary/selftest.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The adversarial seat's own checks (decision D428), with no engine:
//
//   1. the rules (answers.mjs answerRefusal) refuse a hand-written answer of
//      each illegal family per kind, and take a legal one -- the JS copy of
//      AnswerRule.java's cases, so the log checker and the seat cannot drift
//      from the bridge unnoticed;
//   2. over EVERY ask in the committed recordings and fixtures (fixtures/games,
//      the M67 and M69 probe cuts, the hand-written sample): legalAnswer is
//      taken, and every kind that can be cheated gets at least one illegal
//      answer to try;
//   3. the state machine (core.mjs) against two fake bridges: an honest one
//      (it refuses by the same rules and re-asks with a reason) gives no leak;
//      a leaky one (it applies whatever comes back) is caught on every kind,
//      and so is an engine that takes an illegal act without a notice.
//
// Exit 0 when every check holds, 1 otherwise. About a second.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { answerRefusal, illegalAnswers, legalAnswer } from './answers.mjs';
import { createAdversary } from './core.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
let checks = 0;
const failures = [];
const expect = (what, ok) => {
  checks += 1;
  if (!ok) failures.push(what);
};
const refused = (what, ask, v) => expect(`${what} is refused`, answerRefusal(ask, v) !== null);
const taken = (what, ask, v) => expect(`${what} is taken (${answerRefusal(ask, v)})`, answerRefusal(ask, v) === null);

// --- 1. the rules, by hand ----------------------------------------------------------
const opts = (n) => Array.from({ length: n }, (_, i) => ({ id: i, label: `o${i}`, kind: 'card' }));
{
  const one = { kind: 'choose_list', options: opts(3), min: 1, max: 1, reveal: false };
  taken('choose_list [1] of a `one`', one, [1]);
  refused('choose_list [] of a `one`', one, []);
  refused('choose_list [0,1] of a `one`', one, [0, 1]);
  refused('choose_list [3], not offered', one, [3]);
  refused('choose_list "0"', one, '0');
  refused('choose_list [0,0] of up to 3', { ...one, min: 0, max: 3 }, [0, 0]);
  taken('a reveal acknowledged with []', { ...one, min: -1, max: -1, reveal: true }, []);
  refused('a reveal answered "ok"', { ...one, min: -1, max: -1, reveal: true }, 'ok');
  const many = { kind: 'choose_entities', options: opts(4), min: 1, max: 2 };
  taken('choose_entities [0,3] of 1..2', many, [0, 3]);
  refused('choose_entities [0,1,2] of 1..2', many, [0, 1, 2]);
  const order = { kind: 'order', dest: [], source: opts(3), min: 0, max: 0 };
  taken('order all three', order, { ordered: [2, 0, 1], remember: false });
  refused('order two of three when all must move', order, { ordered: [0, 1], remember: false });
  refused('order an item twice', order, { ordered: [0, 0, 1], remember: false });
  refused('order a bare list', order, [0, 1, 2]);
  const side = { kind: 'sideboard', main: opts(3), side: opts(2), mainMin: 3, sideMax: 15 };
  taken('sideboard: one swapped', side, [0, 1, 3]);
  refused('sideboard: a card three times', side, [0, 0, 0]);
  refused('sideboard: a main deck too small', side, [0, 1]);
  const amount = { kind: 'assign_amount', total: 2, atLeastOne: true, targets: [{ id: 0, min: 1, max: 2 }, { id: 1, min: 1, max: 2 }] };
  taken('a divided 2 as 1+1', amount, { 0: 1, 1: 1 });
  refused('a divided 2 as 5+5', amount, { 0: 5, 1: 5 });
  refused('a divided 2 as 2+0 (atLeastOne)', amount, { 0: 2 });
  refused('an amount to a target not offered', amount, { 0: 1, 1: 1, 2: 1 });
  refused('a fractional amount', amount, { 0: 1.5, 1: 0.5 });
  const text = { kind: 'text', numeric: true, min: 0, max: 10 };
  taken('text "7" in 0..10', text, '7');
  refused('text "11"', text, '11');
  refused('text "-1"', text, '-1');
  refused('text 7 (a number)', text, 7);
  taken('free text', { kind: 'text', numeric: false }, 'anything');
  const menu = { kind: 'ability_menu', options: opts(2) };
  taken('menu 1 of 2', menu, 1);
  refused('menu 2 of 2', menu, 2);
  refused('menu "0"', menu, '0');
  taken('confirm false', { kind: 'confirm' }, false);
  refused('confirm 1', { kind: 'confirm' }, 1);
  const manip = { kind: 'manipulate_list', cards: opts(3), manipulable: [1, 2] };
  taken('manipulate: the offered two swap', manip, [0, 2, 1]);
  refused('manipulate: a card not offered moves', manip, [1, 0, 2]);
  const dmg = { kind: 'assign_damage', total: 2, overrideOrder: true, defenderAllowed: false,
    targets: [{ id: 0, defender: true }, { id: 1, lethal: 1 }, { id: 2, lethal: 2 }] };
  taken('damage 1+1 to the blockers', dmg, { 1: 1, 2: 1 });
  refused('damage to the player without trample', dmg, { 0: 2 });
  refused('damage short of the total', dmg, { 1: 1 });
  const trample = { ...dmg, total: 5, defenderAllowed: true };
  taken('a trampler: lethal, then the player', trample, { 1: 1, 2: 2, 0: 2 });
  refused('a trampler: the player before lethal', trample, { 1: 1, 0: 4 });
}

// --- 2. every recorded ask -----------------------------------------------------------
function asksIn(path) {
  const text = readFileSync(path, 'utf8');
  const out = [];
  const walk = (f) => { if (f && f.type === 'ask' && f.body && typeof f.body.kind === 'string') out.push(f.body); };
  if (path.endsWith('.json')) {
    const j = JSON.parse(text);
    const visit = (v) => {
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object') { if (v.type === 'ask') walk(v); else Object.values(v).forEach(visit); }
    };
    visit(j);
  } else {
    for (const line of text.split('\n')) {
      if (line.trim() === '') continue;
      try { walk(JSON.parse(line)); } catch { /* a header or a torn line */ }
    }
  }
  return out;
}
const files = [
  ...readdirSync(join(repo, 'fixtures', 'games')).filter((f) => f.endsWith('.jsonl')).map((f) => join(repo, 'fixtures', 'games', f)),
  join(repo, 'fixtures', 'synthetic', 'sample-handwritten.jsonl'),
  join(repo, 'fixtures', 'assign-probe', 'm67-frames.json'),
  join(repo, 'fixtures', 'cost-probe', 'm69-frames.json'),
];
const seenKinds = new Map();
let asks = 0;
for (const f of files) {
  for (const ask of asksIn(f)) {
    asks += 1;
    const k = ask.kind;
    const s = seenKinds.get(k) ?? { asks: 0, illegal: 0 };
    s.asks += 1;
    const legal = legalAnswer(ask);
    if (legal !== null) taken(`${f.split('/').pop()} ${ask.askId} ${k}: the legal answer ${JSON.stringify(legal)}`, ask, legal);
    const ill = illegalAnswers(ask);
    s.illegal += ill.length;
    for (const { label, value } of ill) refused(`${ask.askId} ${k}: ${label}`, ask, value);
    if (k !== 'choose_list' || !(ask.min < 0)) {
      expect(`${f.split('/').pop()} ${ask.askId} ${k}: at least one illegal answer to try`, ill.length > 0);
    }
    seenKinds.set(k, s);
  }
}
expect(`the recordings carry asks (${asks})`, asks > 100);

// --- 3. the state machine against fake bridges ----------------------------------------
function play(asksToPose, bridge) {
  // bridge: 'honest' | 'leaky'
  const sent = [];
  let current = null;
  let n = 0;
  const queue = [];
  const adv = createAdversary({
    answer: (askId, kind, prompt, value) => { sent.push({ askId, kind, value }); queue.push({ askId, kind, value }); },
    act: () => {},
  });
  const pose = (body) => { current = body; adv.onAsk(body, (b) => legalAnswer(b)); };
  for (const ask of asksToPose) {
    pose({ ...ask, askId: `q${++n}`, reason: null });
    while (queue.length) {
      const a = queue.shift();
      const why = a.value === null ? null : answerRefusal(current, a.value);
      if (why !== null && bridge === 'honest') pose({ ...current, askId: `q${++n}`, reason: why });
    }
  }
  // One more question, so the last kind's leak is judged by the ask after it.
  pose({ kind: 'confirm', defaultYes: true, prompt: 'end', askId: `q${++n}`, reason: null });
  adv.onFrame({ type: 'over', body: {} });
  return adv.report;
}
const sampleAsks = [
  { kind: 'choose_list', options: opts(3), min: 1, max: 1, reveal: false, prompt: 'p' },
  { kind: 'order', dest: [], source: opts(3), min: 0, max: 0, prompt: 'p' },
  { kind: 'sideboard', main: opts(3), side: opts(2), mainMin: 3, sideMax: 15, prompt: 'p' },
  { kind: 'assign_amount', total: 2, atLeastOne: true, targets: [{ id: 0, min: 1, max: 2 }, { id: 1, min: 1, max: 2 }] },
  { kind: 'assign_damage', total: 2, overrideOrder: true, defenderAllowed: false, targets: [{ id: 0, defender: true }, { id: 1, lethal: 1 }, { id: 2, lethal: 2 }] },
  { kind: 'text', numeric: true, min: 1, max: 5, prompt: 'p' },
  { kind: 'confirm', defaultYes: true, prompt: 'p' },
  { kind: 'ability_menu', options: opts(2), cardId: 1 },
  { kind: 'choose_entities', options: opts(2), min: 1, max: 1, prompt: 'p' },
];
{
  const r = play(sampleAsks, 'honest');
  expect(`an honest bridge: no leak (${JSON.stringify(r.leaks)})`, r.leaks.length === 0);
  expect(`an honest bridge: no legal answer refused (${JSON.stringify(r.legalRefused)})`, r.legalRefused.length === 0);
  for (const a of sampleAsks) {
    expect(`an honest bridge: ${a.kind} had illegal answers refused`, (r.asks[a.kind]?.refused ?? 0) > 0);
    expect(`an honest bridge: ${a.kind}'s legal answer taken`, (r.asks[a.kind]?.legalAccepted ?? 0) === 1);
  }
}
{
  const r = play(sampleAsks, 'leaky');
  for (const a of sampleAsks) expect(`a leaky bridge is caught on ${a.kind}`, (r.asks[a.kind]?.leaks ?? 0) > 0);
}
{
  // an engine that takes an illegal act: no refusal notice within the window
  const acts = [];
  const adv = createAdversary({ answer: () => {}, act: (a, e) => acts.push([a, e]) });
  const state = { turn: 3, priority: 0, players: [
    { id: 0, zones: { battlefield: { cards: [{ id: 5, types: 'Land', tapped: false }] }, hand: { cards: [] } } },
    { id: 1, zones: { battlefield: { cards: [{ id: 9, types: 'Creature' }] }, hand: { cards: [{ id: 40, hidden: true }] }, graveyard: { cards: [] } } }] };
  adv.onFrame({ type: 'state', body: state });
  expect('an attack input is probed with the opponent\'s creature',
    adv.inputProbe({ prompt: 'Select creatures to attack', selectable: { cardIds: [] } }, state, 0) === true && acts.at(-1)?.[1]?.cardId === 9);
  adv.tick(Date.now() + 10000);
  expect('an act with no refusal notice is a leak', adv.report.leaks.some((l) => l.input === 'declare attackers'));
  adv.onFrame({ type: 'state', body: { ...state, turn: 4 } });
  adv.inputProbe({ prompt: 'Priority: Human', selectable: { cardIds: [] } }, { ...state, turn: 4 }, 0);
  adv.onFrame({ type: 'notice', body: { title: 'Unknown card', text: 'card 40 is not in the last snapshot' } });
  expect('a refusal notice settles the act', adv.report.inputs.priority?.refused === 1);
}

process.stdout.write(`adversary selftest: ${checks} check(s) over ${asks} recorded ask(s) of ${seenKinds.size} kind(s) `
  + `(${[...seenKinds].map(([k, s]) => `${k} ${s.asks}/${s.illegal}`).join(', ')}), ${failures.length} failure(s)\n`);
for (const f of failures.slice(0, 40)) process.stdout.write(`  FAIL ${f}\n`);
process.exit(failures.length === 0 ? 0 : 1);
