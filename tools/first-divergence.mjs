#!/usr/bin/env node
// mtg-table — tools/first-divergence.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// WHERE do two games of the same seed stop being the same game, and WHO made
// the first different choice?
//
//   node tools/first-divergence.mjs var/games/cautious-44/frames.jsonl \
//                                   var/games/reckless-44/frames.jsonl
//
// Why this exists (match setup, docs/evidence/match-setup.md section P).  An A/B
// between two AI profiles -- or two seat policies -- at one seed is only
// evidence about the thing that differs if the FIRST difference is a decision
// by the side that differs.  Two of the ways a same-seed pair diverges are not:
//
//   * the bridge cuts a `state` snapshot wherever the game thread happens to be
//     when it flushes, so two identical games can batch the same events into
//     different frames (the first `state` of a game may or may not already hold
//     the opening hands).  So this compares the EVENT stream -- every
//     `state.events[]` entry, in order, flattened across frames -- and never the
//     frame boundaries;
//   * the automated seat acts on whatever `input` it holds, and Forge re-pushes
//     a prompt every 250 ms while it thinks (tools/fixture-multiset-diff.mjs's
//     header), so the SEAT can diverge on wall-clock alone -- measured: one
//     pair at seed 31 split at the seat's own mulligan.
//
// So it prints the first event that differs on each side, with the player whose
// card, turn or combat it is, and says whether that is the seat (the viewer) or
// the other player.  A pair whose first difference is the seat's is not
// evidence about the AI.  Only events are read; nothing here is rules logic.
//
// Also printed: the total attackers each side's non-viewing player declared,
// the number the match-setup review compared.
//
// Exit: 0 identical event streams, 1 they differ, 2 bad usage.

import { readFileSync } from 'node:fs';

const files = process.argv.slice(2).filter((a) => !a.startsWith('-'));
if (files.length !== 2) {
  process.stderr.write('usage: node tools/first-divergence.mjs <a/frames.jsonl> <b/frames.jsonl>\n');
  process.exit(2);
}

function load(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (err) {
    process.stderr.write(`first-divergence: cannot read ${path}: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(2);
  }
  const events = [];
  const names = new Map();
  const controllers = new Map();
  let viewer = null;
  let attackers = 0;
  for (const line of text.split('\n')) {
    if (line === '') continue;
    const f = JSON.parse(line);
    if (f.type === 'hello_ok') viewer = f.body.you;
    if (f.type !== 'state') continue;
    const b = f.body;
    for (const p of b.players) {
      for (const z of Object.values(p.zones)) {
        for (const c of z.cards) {
          if (typeof c.name === 'string' && c.name !== '') names.set(c.id, c.name);
          if (typeof c.controller === 'number') controllers.set(c.id, c.controller);
        }
      }
    }
    for (const raw of b.events ?? []) {
      // Amendment M52: an unblocked attacker is `blockerIds: []`; a recording
      // made before it wrote the attacker as its own one blocker.  Read both as
      // the newer form, so a pair across the change compares the game alone.
      const e = raw.kind === 'blockers'
        ? { ...raw, blocks: raw.blocks.map((x) => ({ ...x, blockerIds: x.blockerIds.filter((id) => id !== x.attackerId) })) }
        : raw;
      events.push({ e, turn: b.turn, phase: b.phase, active: b.activePlayer });
      if (e.kind === 'attackers' && e.player !== viewer) {
        attackers += e.bands.reduce((n, band) => n + band.attackerIds.length, 0);
      }
    }
  }
  if (viewer === null) {
    process.stderr.write(`first-divergence: ${path} has no hello_ok, so no viewing seat\n`);
    process.exit(2);
  }
  return { path, events, names, controllers, viewer, attackers };
}

const a = load(files[0]);
const b = load(files[1]);

/**
 * Whose CHOICE an event is: a player id, or null when the event is a consequence
 * (a phase, a life total, a stats change, damage) that names no chooser.  A
 * card's controller is the chooser only for the events a controller makes: a
 * cast, a card leaving its hand, a tap, a land drop, a declaration.
 */
function actor(g, e) {
  switch (e.kind) {
    case 'attackers': case 'land': case 'mulligan': return e.player;
    case 'blockers': return e.defendingPlayer;
    case 'cast': return e.controller;
    case 'tap': return g.controllers.get(e.cardId) ?? null;
    case 'zone': return e.from?.zone === 'hand' ? (g.controllers.get(e.cardId) ?? null) : null;
    default: return null;
  }
}

function describe(g, k) {
  if (k >= g.events.length) return { text: '(the game ended here)', who: null };
  const { e, turn, phase, active } = g.events[k];
  const nm = (id) => g.names.get(id) ?? `card ${String(id)}`;
  let text;
  if (e.kind === 'attackers') {
    const ids = e.bands.flatMap((band) => band.attackerIds);
    text = `declares attackers [${ids.map(nm).join(', ') || 'none'}]`;
  } else if (e.kind === 'blockers') {
    const blocked = e.blocks.filter((x) => x.blockerIds.length > 0);
    text = `declares blockers [${blocked.map((x) => `${x.blockerIds.map(nm).join('+')} on ${nm(x.attackerId)}`).join('; ') || 'none'}]`;
  } else if (e.kind === 'cast') {
    text = `casts ${nm(e.cardId)}`;
  } else if (e.kind === 'zone') {
    text = `moves ${nm(e.cardId)} ${e.from?.zone ?? '?'} -> ${e.to?.zone ?? '?'}`;
  } else if (e.kind === 'tap') {
    text = `${e.tapped ? 'taps' : 'untaps'} ${nm(e.cardId)}`;
  } else {
    text = JSON.stringify(e).slice(0, 120);
  }
  const who = actor(g, e);
  const whoText = who === null ? 'no player named' : who === g.viewer ? `player ${String(who)} (the SEAT)` : `player ${String(who)} (the AI)`;
  return { text: `turn ${String(turn)} ${phase ?? '-'} (active ${String(active)}): ${text}   <- ${whoText}`, who };
}

const n = Math.min(a.events.length, b.events.length);
let i = 0;
while (i < n && JSON.stringify(a.events[i].e) === JSON.stringify(b.events[i].e)) i++;

console.log('first-divergence');
console.log(`  A = ${a.path}  ${String(a.events.length)} events, the AI declared ${String(a.attackers)} attacker(s)`);
console.log(`  B = ${b.path}  ${String(b.events.length)} events, the AI declared ${String(b.attackers)} attacker(s)`);
if (i === n && a.events.length === b.events.length) {
  console.log(`IDENTICAL: all ${String(n)} events equal -- the two runs played the same game`);
  process.exit(0);
}
const da = describe(a, i);
const db = describe(b, i);
console.log(`  first differing event: #${String(i)}`);
console.log(`    A: ${da.text}`);
console.log(`    B: ${db.text}`);
// The first differing event is often a consequence (a `tap` before the
// `attackers` it belongs to, a `phase` where the other side cast something), so
// each side's next DECISION-shaped event from there is printed too.
const CHOICE = (e) => e.kind === 'attackers' || e.kind === 'blockers' || e.kind === 'cast' ||
  (e.kind === 'zone' && e.from?.zone === 'hand');
const next = [];
for (const [label, g] of [['A', a], ['B', b]]) {
  const k = g.events.findIndex((x, j) => j >= i && CHOICE(x.e));
  const d = k >= 0 ? describe(g, k) : { text: '(none)', who: null };
  next.push(d);
  console.log(`    ${label} next choice: ${d.text}`);
}
// Attribute by the first differing events when either names a chooser, else by
// the next choice on each side.
const firstNamed = da.who !== null || db.who !== null;
const whos = firstNamed ? [da.who, db.who] : [next[0].who, next[1].who];
const seat = whos.some((w) => w === a.viewer);
const ai = whos.some((w) => w !== null && w !== a.viewer);
console.log(
  seat && !ai
    ? 'DIVERGED on the SEAT\'s side first: not evidence about the AI (a wall-clock re-push can do this)'
    : ai && !seat
      ? 'DIVERGED on the AI\'s side first: the first different choice is the AI\'s'
      : 'DIVERGED: the first difference does not name one side -- read the events around it',
);
process.exit(1);
