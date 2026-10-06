#!/usr/bin/env node
// mtg-table -- tools/check-seat-pair.mjs must still catch every defect it exists for.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Amendment M59, D402.  A synthetic pair of seat logs (no engine): a clean pair
// passes, and each planted defect fails it -- a hidden card's name in a notice,
// an option label or a prompt; the other seat's card in full in a hand; two
// games passed off as one.  The cases a careless rule would flag pass: a name
// the viewer's own deck holds, a name inside a longer public one, a token's name,
// and a name once the viewer has legitimately seen the card.  Plain Node.

import { auditPair } from './check-seat-pair.mjs';

let checks = 0;
let failures = 0;
const check = (ok, what) => {
  checks++;
  if (!ok) {
    failures++;
    console.error(`FAIL ${what}`);
  }
};

const card = (id, name, owner, zone, extra = {}) => ({ id, name, owner, controller: owner, zone, token: false, ...extra });
const stub = (id, owner, zone) => ({ id, zone, owner, controller: owner, hidden: true });
const header = (seat) => ({ v: 1, kind: 'session', gameId: 'friend-m0000000000001', seed: 5, seat, transport: 'ws', humans: 2, decks: [] });
const state = (seq, cardsOf) => ({ v: 1, seq, t: 1, dir: 's2c', type: 'state', body: { players: cardsOf } });
const notice = (seq, text) => ({ v: 1, seq, t: 1, dir: 's2c', type: 'notice', body: { level: 'info', title: '', text } });

/** Seat 0 holds a Lightning Bolt (id 5) and a Grizzly Bears (id 6); seat 1 holds an Opt (id 50). */
function pair() {
  const a = { header: header(0), frames: [
    state(1, [{ id: 0, zones: { hand: [card(5, 'Lightning Bolt', 0, 'hand'), card(6, 'Grizzly Bears', 0, 'hand')] } },
              { id: 1, zones: { hand: [stub(50, 1, 'hand')] } }]),
    state(2, [{ id: 0, zones: { battlefield: [card(6, 'Grizzly Bears', 0, 'battlefield')] } }]),
  ] };
  const b = { header: header(1), frames: [
    state(1, [{ id: 0, zones: { hand: [stub(5, 0, 'hand'), stub(6, 0, 'hand')] } },
              { id: 1, zones: { hand: [card(50, 'Opt', 1, 'hand')] } }]),
    state(2, [{ id: 0, zones: { battlefield: [card(6, 'Grizzly Bears', 0, 'battlefield')] } }]),
  ] };
  return { a, b };
}

{
  const { a, b } = pair();
  const r = auditPair(a, b);
  check(r.problems.length === 0, `a clean pair passes: ${r.problems.join('; ')}`);
  check(r.ba.secret === 2, `seat 1 has two of seat 0's names to keep from (got ${r.ba.secret})`);
}
{
  const { a, b } = pair();
  b.frames.push(notice(3, 'Player 1 cast Lightning Bolt'));
  const r = auditPair(a, b);
  check(r.problems.some((p) => p.includes('"Lightning Bolt"') && p.includes('notice')), 'a hidden name in a notice fails');
}
{
  const { a, b } = pair();
  b.frames.push({ v: 1, seq: 3, t: 1, dir: 's2c', type: 'ask', body: { kind: 'choose_list', options: [{ id: 0, label: 'Lightning Bolt (5)' }] } });
  check(auditPair(a, b).problems.some((p) => p.includes('options[0].label')), 'a hidden name in an option label fails');
}
{
  const { a, b } = pair();
  b.frames.push({ v: 1, seq: 3, t: 1, dir: 's2c', type: 'input', body: { prompt: 'Opponent reveals Lightning Bolt' } });
  check(auditPair(a, b).problems.some((p) => p.includes('prompt')), 'a hidden name in a prompt fails');
}
{
  const { a, b } = pair();
  b.frames.push(state(3, [{ id: 0, zones: { hand: [card(5, 'Lightning Bolt', 0, 'hand')] } }]));
  check(auditPair(a, b).problems.some((p) => p.includes('in full in zone hand')), "the other seat's card in full in a hand fails");
}
{
  const { a, b } = pair();
  b.frames.push(notice(3, 'Grizzly Bears attacks'));
  check(auditPair(a, b).problems.length === 0, 'a name the viewer has seen on the battlefield passes');
}
{
  const { a, b } = pair();
  b.frames.unshift(notice(0, 'Grizzly Bears attacks'));
  check(auditPair(a, b).problems.some((p) => p.includes('"Grizzly Bears"')), 'the same name BEFORE the viewer saw the card fails');
}
{
  const { a, b } = pair();
  a.frames[0].body.players[0].zones.hand.push(card(7, 'Opt', 0, 'hand'));
  a.frames.push(notice(3, 'You cast Opt'));
  check(auditPair(a, b).problems.length === 0, "a name the viewer's own deck holds passes");
}
{
  const { a, b } = pair();
  a.frames[0].body.players[0].zones.hand.push(card(8, 'Bolt', 0, 'hand'));
  b.frames.push(state(3, [{ id: 0, zones: { stack: [card(5, 'Lightning Bolt', 0, 'stack')] } }]));
  b.frames.push(notice(4, 'Lightning Bolt resolves'));
  check(auditPair(a, b).problems.length === 0, 'a hidden name inside a longer name the viewer may see passes');
}
{
  const { a, b } = pair();
  a.frames.push(state(3, [{ id: 0, zones: { battlefield: [card(90, 'Soldier', 0, 'battlefield', { token: true })] } }]));
  b.frames.push(notice(3, 'create a 1/1 Soldier token'));
  check(auditPair(a, b).problems.length === 0, "a token's name passes");
}
{
  const { a, b } = pair();
  b.header = { ...b.header, gameId: 'friend-m0000000000002' };
  check(auditPair(a, b).problems.some((p) => p.includes('two games')), 'two games fail');
}
{
  const { a, b } = pair();
  b.header = { ...b.header, seat: 0 };
  check(auditPair(a, b).problems.some((p) => p.includes("both logs are seat")), 'the same seat twice fails');
}
{
  const { a, b } = pair();
  delete b.header.humans;
  check(auditPair(a, b).problems.some((p) => p.includes('humans: 2')), 'a log without humans: 2 fails');
}

console.log(`check-seat-pair selftest: ${checks} check(s), ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
