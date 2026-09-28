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
// any depth.  Nothing else is touched.
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
// All four questions below held in every one of those runs.
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
//      Match.startGame returns, on the game thread, with nothing left to move.
//
// What the default gives up, and says so: the board snapshots BETWEEN phase
// boundaries.  A Snap.java change to a field that only ever appears in an
// intermediate board (and in no event and not on the final board) would pass
// the default and fail --strict.  The final board carries every card in every
// public zone, and the events carry every id-level fact, so that is a narrow
// band -- and --strict is still one flag away (check-all: STRICT_G1=1).
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

/** Replace every per-run value, at any depth. Key order is kept: it is wire. */
function scrub(v) {
  if (Array.isArray(v)) return v.map(scrub);
  if (v !== null && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = PER_RUN.has(k) ? '<per-run>' : scrub(val);
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
