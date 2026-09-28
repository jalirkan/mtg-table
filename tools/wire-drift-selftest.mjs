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
  // ---- drift: a different wire ----------------------------------------------
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
  + `${String(count(0, 0))} identical accepted by both, ${String(count(0, 1))} re-partitions accepted by `
  + `default and rejected by --strict, ${String(count(1, 1))} drifts rejected by both`);
