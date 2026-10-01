#!/usr/bin/env node
// mtg-table — tools/wire-drift-selftest.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// tools/wire-drift.mjs's own controls, in both directions (decision D113).
//
// Gate step 6 stopped comparing byte for byte (under load the same game cuts
// its event stream into different frames), and a relaxed comparison is only
// worth having if it still fails on the things step 6 exists to catch -- the
// wire drifting because Snap.java changed.  So every case below is a one-edit
// copy of fixtures/games/g1.jsonl, written under var/wire-drift-selftest/, with
// the verdict the default mode and --strict must each give:
//
//   RE-PARTITIONS the default must accept and --strict must reject
//     (what a busy machine does to a recording: measured, docs/evidence/hardening.md)
//   a STATS-ID REORDER both must accept (decision D121: the ids inside a `stats`
//     event are a set; their order follows HotSpot identity hashes)
//   M49's newer key and M52's newer spelling of an unblocked attacker both
//     must accept, since g1 predates them
//   DRIFT both must reject
//     (what a changed emitter does: the step's reason to exist)
//
//   node tools/wire-drift-selftest.mjs        # exit 0 iff every verdict is the expected one
//
// Run from the repo root (hard rule 9).  It needs no engine: g1.jsonl is enough.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURE = 'fixtures/games/g1.jsonl';
const DIR = 'var/wire-drift-selftest';
mkdirSync(DIR, { recursive: true });

const base = readFileSync(FIXTURE, 'utf8').split('\n').filter((l) => l.length > 0).map((l) => JSON.parse(l));
const clone = () => JSON.parse(JSON.stringify(base));
const stateIdx = (L) => L.map((f, i) => (f.type === 'state' ? i : -1)).filter((i) => i >= 0);
/** Renumber every s2c `seq` in order, as the bridge would have. */
const renumber = (L) => {
  let n = 0;
  for (const f of L) if (f.dir === 's2c') f.seq = ++n;
  return L;
};
/** The event kinds a recorder frame is cut AT (wire-drift.mjs question 5). */
const BOUNDARY = new Set(['turn', 'phase', 'outcome']);
/** The state frame with the most events, which a split can halve. */
const busiest = (L) => stateIdx(L).reduce((a, i) => (L[i].body.events.length > L[a].body.events.length ? i : a));

const cases = [
  // ---- re-partitions: the same game, different flush boundaries ----------
  ['identical copy', 0, 0, (L) => L],
  ['one batch flushed as two frames', 0, 1, (L) => {
    const i = busiest(L);
    const f = L[i];
    const half = Math.floor(f.body.events.length / 2);
    const first = JSON.parse(JSON.stringify(f));
    first.body.events = f.body.events.slice(0, half);
    f.body.events = f.body.events.slice(half);
    L.splice(i, 0, first);
    return renumber(L);
  }],
  ['an event moved to the next frame', 0, 1, (L) => {
    const s = stateIdx(L);
    const k = s.find((i, n) => n + 1 < s.length && L[i].body.events.length > 1);
    const next = s[s.indexOf(k) + 1];
    L[next].body.events.unshift(L[k].body.events.pop());
    return L;
  }],
  ['a phase flushed twice (an extra frame, no events)', 0, 1, (L) => {
    const i = stateIdx(L)[Math.floor(stateIdx(L).length / 2)];
    const dup = JSON.parse(JSON.stringify(L[i]));
    dup.body.events = [];
    L.splice(i + 1, 0, dup);
    return renumber(L);
  }],
  ['a mid-phase frame that caught a stack merged into the next', 0, 1, (L) => {
    // The fresh file then lacks that stack id-set: it is not compared, and the
    // other sixteen still are.
    const s = stateIdx(L);
    const k = s.find((i, n) => n + 1 < s.length && L[i].body.stack.length === 1
      && !BOUNDARY.has(L[i].body.events.at(-1)?.kind));
    const next = s[s.indexOf(k) + 1];
    L[next].body.events.unshift(...L[k].body.events);
    L.splice(k, 1);
    return renumber(L);
  }],
  ['an extra frame caught the stack one item short', 0, 1, (L) => {
    // An id-set the committed file never caught: not compared, not a failure.
    const i = stateIdx(L).find((j) => L[j].body.stack.length >= 2);
    const f = L[i];
    const half = Math.floor(f.body.events.length / 2);
    const first = JSON.parse(JSON.stringify(f));
    first.body.events = f.body.events.slice(0, half);
    first.body.stack = f.body.stack.slice(0, -1);
    f.body.events = f.body.events.slice(half);
    L.splice(i, 0, first);
    return renumber(L);
  }],
  // ---- D121 (spectating): the ids inside a `stats` event are a SET -----------
  // Their order is a hash-set iteration over identity-hashed objects inside
  // Forge; both modes sort them, so a reorder is the same wire.
  ['the ids inside every `stats` event reversed (D121)', 0, 0, (L) => {
    let n = 0;
    for (const i of stateIdx(L)) {
      for (const e of L[i].body.events) if (e.kind === 'stats' && e.cardIds.length >= 2) { e.cardIds.reverse(); n += 1; }
    }
    if (n === 0) throw new Error('no stats event with two or more ids');
    return L;
  }],
  // ---- amendment M49: a key the committed file predates ----------------------
  // g1 was recorded before `keywords` existed; a fresh recording carries it on
  // every full card.  Both modes remove it from the fresh file and compare the
  // rest -- and only because the committed file has none (see wire-drift.mjs).
  ['`keywords` on every full card (M49; g1 predates it)', 0, 0, (L) => {
    let n = 0;
    const add = (cards) => {
      for (const c of cards ?? []) if (c && c.hidden !== true) { c.keywords = c.faceDown ? [] : ['FLYING']; n += 1; }
    };
    for (const i of stateIdx(L)) {
      for (const p of L[i].body.players) for (const z of Object.values(p.zones)) add(z.cards);
      add(L[i].body.stackCards);
    }
    if (n === 0) throw new Error('no full card to give keywords to');
    return L;
  }],
  ['`keywords` added AND a zone move changed (the strip hides nothing else)', 1, 1, (L) => {
    for (const i of stateIdx(L)) {
      for (const p of L[i].body.players) for (const c of p.zones.battlefield.cards) if (c.hidden !== true) c.keywords = [];
    }
    const f = L[stateIdx(L).find((i) => L[i].body.events.some((e) => e.kind === 'zone'))];
    const e = f.body.events.find((x) => x.kind === 'zone');
    e.to = { ...e.to, zone: e.to.zone === 'graveyard' ? 'exile' : 'graveyard' };
    return L;
  }],
  // ---- amendment M52: an encoding the committed file predates -----------------
  // g1 relays an unblocked attacker as its own blocker; a fresh recording writes
  // `[]`.  Both modes read g1's spelling as `[]` in both files (wire-drift.mjs).
  ['unblocked attackers written as M52 does (`blockerIds: []`; g1 predates it)', 0, 0, (L) => {
    let n = 0;
    for (const i of stateIdx(L)) {
      for (const e of L[i].body.events) {
        if (e.kind !== 'blockers') continue;
        for (const b of e.blocks) {
          if (b.blockerIds.length === 1 && b.blockerIds[0] === b.attackerId) { b.blockerIds = []; n += 1; }
        }
      }
    }
    if (n === 0) throw new Error('no unblocked attacker in a blockers event');
    return L;
  }],
  ['M52 spelling AND a real block dropped (the rewrite hides nothing else)', 1, 1, (L) => {
    let real = false;
    for (const i of stateIdx(L)) {
      for (const e of L[i].body.events) {
        if (e.kind !== 'blockers') continue;
        for (const b of e.blocks) {
          if (b.blockerIds.length === 1 && b.blockerIds[0] === b.attackerId) b.blockerIds = [];
          else if (!real && b.blockerIds.length > 0) { b.blockerIds = []; real = true; }
        }
      }
    }
    if (!real) throw new Error('no real block in a blockers event');
    return L;
  }],
  // ---- drift: a different wire ----------------------------------------------
  ['one id dropped from a `stats` event (D121 compares the SET)', 1, 1, (L) => {
    const f = L[stateIdx(L).find((i) => L[i].body.events.some((e) => e.kind === 'stats' && e.cardIds.length >= 2))];
    f.body.events.find((e) => e.kind === 'stats' && e.cardIds.length >= 2).cardIds.pop();
    return L;
  }],
  ['one event dropped', 1, 1, (L) => {
    L[busiest(L)].body.events.splice(1, 1);
    return L;
  }],
  ['one event changed (a zone move lands elsewhere)', 1, 1, (L) => {
    const f = L[stateIdx(L).find((i) => L[i].body.events.some((e) => e.kind === 'zone'))];
    const e = f.body.events.find((x) => x.kind === 'zone');
    e.to = { ...e.to, zone: e.to.zone === 'graveyard' ? 'exile' : 'graveyard' };
    return L;
  }],
  ['phase names lowercased in every state', 1, 1, (L) => {
    for (const i of stateIdx(L)) if (typeof L[i].body.phase === 'string') L[i].body.phase = L[i].body.phase.toLowerCase();
    return L;
  }],
  ['`power` written as a number on the final board', 1, 1, (L) => {
    const last = L[stateIdx(L).pop()];
    let done = false;
    for (const p of last.body.players) {
      for (const c of p.zones.battlefield?.cards ?? p.zones.graveyard?.cards ?? []) {
        if (!done && typeof c.power === 'string') { c.power = Number(c.power); done = true; }
      }
    }
    if (!done) throw new Error('no card with a string power on the final board');
    return L;
  }],
  ['`over` names the other winner', 1, 1, (L) => {
    const o = L.find((f) => f.type === 'over');
    o.body.winner = o.body.winner === 0 ? 1 : 0;
    return L;
  }],
  ['`hello_ok` lists one more unsupported card', 1, 1, (L) => {
    L.find((f) => f.type === 'hello_ok').body.unsupportedCards.push('Nonesuch [XXX]');
    return L;
  }],
  ['no state frames at all', 1, 1, (L) => L.filter((f) => f.type !== 'state')],
  // The verifier's four (round 1): each passed the first four questions, because
  // g1's final board has an empty stack and no combat.  Questions 5 and 6 exist
  // for them.
  ['the stack reversed (top-first) in every state', 1, 1, (L) => {
    let n = 0;
    for (const i of stateIdx(L)) if (L[i].body.stack.length >= 2) { L[i].body.stack.reverse(); n += 1; }
    if (n === 0) throw new Error('no state with two or more stack items');
    return L;
  }],
  ['a stack-item key renamed in every state', 1, 1, (L) => {
    for (const i of stateIdx(L)) {
      L[i].body.stack = L[i].body.stack.map(({ sourceCardId, ...rest }) => ({ ...rest, sourceId: sourceCardId }));
    }
    return L;
  }],
  ['`priority` nulled in every state but the last', 1, 1, (L) => {
    const s = stateIdx(L);
    for (const i of s.slice(0, -1)) L[i].body.priority = null;
    return L;
  }],
  ['combat `blockerIds` renamed in every state but the last', 1, 1, (L) => {
    let n = 0;
    for (const i of stateIdx(L).slice(0, -1)) {
      for (const b of L[i].body.combat?.bands ?? []) {
        b.blockers = b.blockerIds;
        delete b.blockerIds;
        n += 1;
      }
    }
    if (n === 0) throw new Error('no combat band to rename');
    return L;
  }],
  ['the stack never written (every `stack` and `stackCards` empty)', 1, 1, (L) => {
    for (const i of stateIdx(L)) { L[i].body.stack = []; L[i].body.stackCards = []; }
    return L;
  }],
];

const run = (flags, file) => {
  try {
    execFileSync(process.execPath, ['tools/wire-drift.mjs', ...flags, FIXTURE, file], { stdio: 'pipe' });
    return 0;
  } catch (e) {
    return typeof e.status === 'number' ? e.status : -1;
  }
};

let bad = 0;
cases.forEach(([name, wantDefault, wantStrict, edit], n) => {
  const file = join(DIR, `case-${String(n + 1).padStart(2, '0')}.jsonl`);
  writeFileSync(file, `${edit(clone()).map((f) => JSON.stringify(f)).join('\n')}\n`);
  const gotDefault = run([], file);
  const gotStrict = run(['--strict'], file);
  const ok = gotDefault === wantDefault && gotStrict === wantStrict;
  if (!ok) bad += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}: default exit ${String(gotDefault)} (want ${String(wantDefault)}), `
    + `--strict exit ${String(gotStrict)} (want ${String(wantStrict)})`);
});
if (bad > 0) {
  console.log(`wire-drift-selftest: ${String(bad)} of ${String(cases.length)} case(s) gave the wrong verdict`);
  process.exit(1);
}
const count = (d, st) => cases.filter(([, a, b]) => a === d && b === st).length;
console.log(`wire-drift-selftest: ${String(cases.length)} cases, every verdict as expected -- `
  + `${String(count(0, 0))} accepted by both (the identical copy, D121's reordered stats ids, M49's newer keywords and M52's unblocked attackers), `
  + `${String(count(0, 1))} re-partitions accepted by `
  + `default and rejected by --strict, ${String(count(1, 1))} drifts rejected by both`);
