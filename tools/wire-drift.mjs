#!/usr/bin/env node
// mtg-table — tools/wire-drift.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Gate step 6's comparison: is a FRESH AI-vs-AI recording of a seed the same
// wire as the committed recording of that seed?
//
//   node tools/wire-drift.mjs fixtures/games/g1.jsonl var/check-all-record.jsonl
//   node tools/wire-drift.mjs --strict fixtures/games/g1.jsonl var/check-all-record.jsonl
//
// Both files are first normalised the way step 6 always did: the value of every
// PER-RUN key -- `t`, `startedAt`, `gameId` -- is replaced with a constant at
// any depth.  And ONE canonicalisation, in both modes (decision D121,
// spectating): the ORDER of the ids inside a `stats` event
// (GameEventCardStatsChanged) is sorted.  It is a hash-set iteration inside
// Forge over objects hashed by IDENTITY, so it follows HotSpot's identity-hash
// sequence, and that moves with code nobody would call a wire change: a few
// println lines added to RecordMatch's main thread before FModel.initialize
// reordered it in 11 of 14 seed-42 runs (ids, frames, events and game otherwise
// identical -- docs/evidence/spectate.md section D).  The SET of ids is still
// compared, and so is the order of every other array.  Nothing else is touched.
//
// --strict is the old step 6: the two normalised files must be byte-identical,
// line for line.  That was right on an idle machine and wrong under load
// (decision D113).  A recording's `state` frames are FLUSHES, and three of the
// forwarder's flush triggers are wall-clock or thread-dependent: 500 ms since
// the last flush, 50 pending events, and a batch posted off the game thread
// (deferred to the next game-thread flush).  On a busy machine the SAME game
// cuts its event stream into different frames, so a byte diff fails on an
// identical game.  Measured (docs/evidence/hardening.md): seed 42 with the JVM
// pinned to one core shared with 2, 4 and 8 busy loops recorded 383, 387 and
// 395 lines against g1's 377, and 9b's multiset comparison fails all three too
// (7/13, 13/23 and 26/44 frames only in the fixture / only in the fresh file),
// because a re-partitioned batch is a DIFFERENT frame, not a reordered one.
// Even the set of distinct card objects moved (4 and 10 cards at 2 and 8
// loops): an intermediate board catches a card mid-change or it does not.
// All six questions below held in every one of those runs.
//
// The default asks the questions that are invariant under a re-partition, and
// each one is invariant by construction rather than by luck:
//
//   1. every NON-state frame is identical and in the same order -- the session
//      header, `hello_ok`, `over` (no flush timing reaches them) -- apart from
//      its `seq`, which counts frames and so moves with every re-partition;
//   2. the EVENT STREAM is identical: every `state.events[]` entry, concatenated
//      in frame order.  A flush moves events between frames; it never drops,
//      duplicates or reorders one (deferred batches are prepended to the next
//      game-thread flush, which keeps post order);
//   3. the PHASE WALK is identical: the sequence of (turn, phase, activePlayer)
//      the frames pass through, consecutive repeats collapsed.  The recorder
//      flushes on every GameEventTurnPhase (RecordMatch.BoundaryFlusher), so
//      every phase has at least one frame;
//   4. the FINAL `state` is identical, events aside: it is flushed after
//      Match.startGame returns, on the game thread, with nothing left to move;
//   5. every BOUNDARY BOARD is identical, events aside, and in the same order: a
//      `state` whose last event is a `turn`, `phase` or `outcome`.  Those three
//      kinds are written only for GameEventTurnBegan, GameEventTurnPhase and
//      GameEventGameOutcome (Snap.java), and BoundaryFlusher flushes
//      synchronously AT each of them, so such a frame is cut at an engine event
//      and never by the clock or the 50-event threshold: its board is fixed by
//      the game.  This is where `priority`, the players, every public zone and
//      mid-game `combat` (attackers at the blockers step, blockers at the damage
//      step) are compared -- 347 boards in g1, at every phase of every turn;
//   6. the STACK is identical wherever both recordings caught the same items on
//      it: for every set of stack ids that appears in both files, `stack` and
//      `stackCards` -- order included -- are the same JSON.  A stack's order is
//      its push order, so one set of items has one order, and an item does not
//      change while it waits (measured: one serialisation per id-set in every
//      recording, docs/evidence/hardening.md §9).  At least one committed
//      id-set must appear in the fresh file: a fresh recording that caught none
//      of them, or a serialiser that stopped writing the stack, proves nothing.
//      A phase boundary never has anything on the stack (a step ends only once
//      it is empty), so question 5 cannot see the stack; this question is the
//      stack serialiser's only check.
//
// What the default gives up, and says so: a board field that differs only in a
// snapshot taken BETWEEN two phase boundaries, is in no event, is not on the
// stack, and has changed back by the next boundary (a creature tapped and
// untapped within one step, say).  Under an idle machine every frame is cut in
// the same place and --strict would pass too.  And the stack's ORDER is checked
// only on an id-set of two or more items that both files caught -- g1 has one
// (three items, turn 14's declare-attackers step); on an idle machine it is always caught, and
// under the heaviest load measured (8 busy loops) it still was.  --strict is one
// flag away (check-all: STRICT_G1=1).
//
// Output: a verdict line per question and the first difference of each, never
// piped through `head` (step 6 used to be `diff | head`, which exits 141 under
// `set -o pipefail` and killed the gate without a message).
//
// Exit: 0 the same wire, 1 a difference, 2 bad usage or unreadable input.

import { readFileSync } from 'node:fs';

const PER_RUN = new Set(['t', 'startedAt', 'gameId']);

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const files = args.filter((a) => !a.startsWith('--'));
if (files.length !== 2 || args.some((a) => a.startsWith('--') && a !== '--strict')) {
  process.stderr.write('usage: node tools/wire-drift.mjs [--strict] <committed.jsonl> <fresh.jsonl>\n');
  process.exit(2);
}

/**
 * Replace every per-run value, at any depth, and sort the ids inside a `stats`
 * event (D121). Key order is kept: it is wire.
 */
function scrub(v) {
  if (Array.isArray(v)) return v.map(scrub);
  if (v !== null && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      out[k] = PER_RUN.has(k) ? '<per-run>'
        : k === 'cardIds' && v.kind === 'stats' && Array.isArray(val) ? [...val].sort((a, b) => a - b)
        : scrub(val);
    }
    return out;
  }
  return v;
}

function load(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (e) {
    process.stderr.write(`wire-drift: cannot read ${path}: ${e.message}\n`);
    process.exit(2);
  }
  const lines = text.split('\n').filter((l) => l.length > 0);
  return lines.map((l, i) => {
    try {
      return scrub(JSON.parse(l));
    } catch (e) {
      process.stderr.write(`wire-drift: ${path}:${String(i + 1)} is not JSON: ${e.message}\n`);
      process.exit(2);
    }
  });
}

const [fa, fb] = files;
const A = load(fa);
const B = load(fb);
const clip = (s, n = 300) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** The first index at which two string arrays differ, or -1. */
function firstDiff(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return -1;
}

let failed = 0;
function report(name, a, b, what) {
  const i = firstDiff(a, b);
  if (i < 0) {
    console.log(`  same   ${name}: ${String(a.length)} ${what}`);
    return;
  }
  failed += 1;
  console.log(`  DIFFER ${name}: ${String(a.length)} vs ${String(b.length)} ${what}; first difference at #${String(i)}`);
  console.log(`         ${fa}: ${clip(a[i] ?? '(missing)')}`);
  console.log(`         ${fb}: ${clip(b[i] ?? '(missing)')}`);
}

const lineStrings = (L) => L.map((f) => JSON.stringify(f));
const strictSame = firstDiff(lineStrings(A), lineStrings(B)) < 0;

if (strict) {
  console.log(`wire-drift --strict: ${fa} vs ${fb}`);
  report('normalised lines (byte for byte)', lineStrings(A), lineStrings(B), 'lines');
} else {
  console.log(`wire-drift: ${fa} vs ${fb} (flush boundaries aside; --strict for byte for byte)`);
  const states = (L) => L.filter((f) => f.type === 'state');
  // `seq` counts frames, so it moves with every re-partitioned batch: the
  // `over` of a run that flushed ten more `state`s is ten further on.
  const nonState = (L) => L.filter((f) => f.type !== 'state').map(({ seq: _seq, ...f }) => JSON.stringify(f));
  const events = (L) => states(L).flatMap((f) => (Array.isArray(f.body?.events) ? f.body.events : [])).map((e) => JSON.stringify(e));
  const walk = (L) => {
    const out = [];
    for (const f of states(L)) {
      const k = `turn ${String(f.body?.turn)} ${String(f.body?.phase)} active ${String(f.body?.activePlayer)}`;
      if (out[out.length - 1] !== k) out.push(k);
    }
    return out;
  };
  const finalBoard = (L) => {
    const s = states(L);
    if (s.length === 0) return [];
    const { events: _events, ...board } = s[s.length - 1].body ?? {};
    return [JSON.stringify(board)];
  };
  report('non-state frames (header, hello_ok, over, ...)', nonState(A), nonState(B), 'frames');
  report('event stream (every state.events[] entry, in order)', events(A), events(B), 'events');
  report('phase walk (turn, phase, active player)', walk(A), walk(B), 'steps');
  report('final state (events aside)', finalBoard(A), finalBoard(B), 'frame');
  // 5. Boards cut AT an engine boundary event.  The `@` suffix names the event,
  // so a difference prints where in the game it is.
  const BOUNDARY = new Set(['turn', 'phase', 'outcome']);
  const boundaryBoards = (L) => {
    const out = [];
    for (const f of states(L)) {
      const ev = Array.isArray(f.body?.events) ? f.body.events : [];
      const last = ev[ev.length - 1];
      if (last === undefined || !BOUNDARY.has(last?.kind)) continue;
      const { events: _events, ...board } = f.body;
      out.push(`@${JSON.stringify(last)} ${JSON.stringify(board)}`);
    }
    return out;
  };
  report('boundary boards (every turn, phase and outcome flush)', boundaryBoards(A), boundaryBoards(B), 'boards');
  // 6. The stack, keyed by the SET of ids on it (sorted), valued by the ordered
  // `stack` and `stackCards`.  Every serialisation seen for an id-set is kept,
  // so an id-set that meant two different stacks in one file would show.
  const stacks = (L) => {
    const m = new Map();
    for (const f of states(L)) {
      const st = Array.isArray(f.body?.stack) ? f.body.stack : [];
      if (st.length === 0) continue;
      const key = st.map((x) => Number(x?.id)).sort((x, y) => x - y).join(',');
      if (!m.has(key)) m.set(key, new Set());
      m.get(key).add(JSON.stringify({ stack: st, stackCards: f.body.stackCards ?? null }));
    }
    return m;
  };
  const sA = stacks(A);
  const sB = stacks(B);
  const shared = [...sA.keys()].filter((k) => sB.has(k)).sort();
  const serial = (m, k) => [...m.get(k)].sort().join(' | ');
  report(
    `stack (the ${String(shared.length)} id-set(s) both caught, of ${String(sA.size)} and ${String(sB.size)}; order included)`,
    shared.map((k) => `[${k}] ${serial(sA, k)}`),
    shared.map((k) => `[${k}] ${serial(sB, k)}`),
    'id-sets',
  );
  if (sA.size > 0 && shared.length === 0) {
    failed += 1;
    console.log(`  DIFFER stack: none of the committed file's ${String(sA.size)} stack id-set(s) is in the fresh one, `
      + 'so the stack was never compared');
  }
  if (states(A).length === 0 || states(B).length === 0) {
    failed += 1;
    console.log('  DIFFER a recording with no `state` frame proves nothing');
  }
  if (failed === 0) {
    console.log(
      strictSame
        ? `  and byte for byte too: ${String(A.length)} normalised lines identical`
        : `  frame boundaries moved: ${String(states(A).length)} vs ${String(states(B).length)} state frames ` +
            '(a busy machine re-partitions the same event stream; STRICT_G1=1 makes that a failure)',
    );
  }
}

if (failed > 0) {
  console.log(`wire-drift: DIFFERENT (${String(failed)} question(s) failed)`);
  process.exit(1);
}
console.log('wire-drift: SAME');
