/*
 * mtg-table — web/test/cubelab-atlas-resume.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * D465: a move-atlas unit survives its worker.  J151's phase B lost whole units to one
 * OutOfMemoryError: the branches a unit had played were in the dead worker's memory, and the
 * unit was recorded as unfinished (69/75, 0/150).  Now each branch reaches the pool as it ends
 * (a `progress` line), a worker whose heap is exhausted RETIRES after its answer, and the pool's
 * fresh worker resumes the unit at the branches it has no row for (`atlas.skip`).
 *
 * No engine: a fake `java` first on PATH speaks the worker's protocol, playing each unit's
 * branches as the job lists them, except where FAKE_PLAN tells an attempt to die or retire.
 * The pool, the resume policy and the rows are the real ones (engine.ts runPool, atlas.ts
 * unitJob / unitProgress / unitResult); only the files are arrays here.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

import { runPool, type MatchJob } from '../../tools/cubelab/engine.ts';
import {
  branchKey, doneBranches, newUnitState, resumeUnit, unitId, unitJob, unitProgress, unitResult, UNIT_ATTEMPTS_MAX,
  type AtlasOptions, type BranchRow, type DecisionListing, type Unit, type UnitLine, type UnitSink, type UnitState,
} from '../../tools/cubelab/atlas.ts';

// The fake worker.  FAKE_PLAN: {"<unit id>": [attempt 1's plan, attempt 2's, ...]}, each
// {die?: n} (exit 1 after streaming n branches), {retire?: n, oom?: k} (stream n, the last k of
// them OutOfMemoryErrors, answer with `retire`, exit 4) or {} (play the rest and answer).  Every
// job's skip list is appended to FAKE_LOG, one JSON line per attempt.
const FAKE_JAVA = `#!/usr/bin/env node
const fs = require('node:fs');
const plan = JSON.parse(process.env.FAKE_PLAN || '{}');
const seen = (id) => fs.existsSync(process.env.FAKE_LOG) ? fs.readFileSync(process.env.FAKE_LOG, 'utf8').split('\\n').filter(Boolean).map((l) => JSON.parse(l)).filter((x) => x.id === id).length : 0;
const out = (o) => process.stdout.write('CUBELAB ' + JSON.stringify(o) + '\\n');
const rl = require('node:readline').createInterface({ input: process.stdin });
out({ type: 'ready' });
rl.on('line', (line) => {
  const j = JSON.parse(line);
  if (j.type === 'quit') process.exit(0);
  const a = j.atlas;
  const attempt = seen(j.id);
  fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify({ id: j.id, skip: a.skip || [] }) + '\\n');
  const p = (plan[j.id] || [])[attempt] || {};
  const skip = new Set(a.skip || []);
  const k = a.expect.length;
  const branches = [];
  for (let i = a.i0; i < a.i1; i++) for (let o = 0; o < k; o++) {
    if (skip.has('o' + o + ':b' + i)) continue;
    branches.push({ o, i, seed: i, result: (o + i) % 2 ? 1 : -1, capped: false, timedOut: false, turns: 9, steps: 99, ms: 5, bytes: 10, standIns: 0,
      key: 'atlas:d' + a.decision + ':' + a.continuation + ':o' + o + ':b' + i, error: null, forkProblems: [] });
  }
  const n = p.die ?? p.retire ?? branches.length;
  const played = branches.slice(0, n);
  played.forEach((b, x) => {
    if (p.oom && x >= n - p.oom) Object.assign(b, { error: 'OutOfMemoryError: Java heap space', engineError: true, result: 0 });
    out({ type: 'progress', id: j.id, branch: b });
  });
  if (p.die !== undefined) process.exit(1);
  const game = { n: 1, onPlay: 'A', onPlayVerified: 'A', winner: 'A', turns: 9, ms: 50, cpuMs: 60, timeout: false, reason: null, error: null,
    atlas: { decisions: [], branches: played, copiesRetained: 0 } };
  out({ type: 'match', id: j.id, forge: [], games: [game], ...(p.retire !== undefined ? { retire: '2 OutOfMemoryErrors in a row' } : {}) });
  if (p.retire !== undefined) process.exit(4);
});
rl.on('close', () => process.exit(0));
`;

let dir = '';
const envWas: Record<string, string | undefined> = {};

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cubelab-atlas-resume-'));
  fs.mkdirSync(path.join(dir, 'bin'));
  fs.writeFileSync(path.join(dir, 'bin', 'java'), FAKE_JAVA, { mode: 0o755 });
  for (const k of ['PATH', 'LAB_CONTROL', 'FAKE_PLAN', 'FAKE_LOG']) envWas[k] = process.env[k];
  process.env.PATH = `${path.join(dir, 'bin')}:${envWas.PATH ?? ''}`;
  delete process.env.LAB_CONTROL;      // the lab runner's control file would pause or cap the pool
});

after(() => {
  for (const [k, v] of Object.entries(envWas)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  fs.rmSync(dir, { recursive: true, force: true });
});

const OPTS = { deckA: 'decks/a.dck', deckB: 'decks/b.dck', seed: 452, turnCap: 40, rollouts: 0, branchRandom: 4, branchForge: 4, decisions: 'all',
  options: 8, chunk: 4, leakChecks: 0, branchTimeoutSec: 60, boot: 10, pair: null, unitTimeoutMin: 5 } as AtlasOptions;
const LISTING: DecisionListing = { d: 2, kind: 'p', turn: 6, tokens: ['cast:15', 'pass'], labels: ['Ponder', 'pass'] };
const ALL: DecisionListing[] = [LISTING, LISTING, LISTING];
const UNIT: Unit = { d: 2, c: 'forge', i0: 0, i1: 4 };   // 2 options x 4 branches = 8

/** One unit through the real pool and the real resume policy; the files are arrays. */
async function playUnit(plan: unknown[], tag: string): Promise<{ rows: BranchRow[]; lines: UnitLine[]; skips: string[][]; said: string[] }> {
  const log = path.join(dir, `${tag}.log`);
  process.env.FAKE_LOG = log;
  process.env.FAKE_PLAN = JSON.stringify({ [unitId(UNIT)]: plan });
  const rows: BranchRow[] = [];
  const lines: UnitLine[] = [];
  const said: string[] = [];
  const st: UnitState = newUnitState(UNIT, new Set());
  st.expected = LISTING.tokens.length * (UNIT.i1 - UNIT.i0);
  const sink: UnitSink = {
    branch: (row) => { rows.push(row); },
    unit: (line) => { lines.push(line); },
    resume: (s) => unitJob(OPTS, dir, s.u, LISTING, [...s.done]),
  };
  const jobs: MatchJob[] = [unitJob(OPTS, dir, UNIT, LISTING)];
  await runPool({ cp: 'unused', homes: [path.join(dir, `home-${tag}`)], repo: dir }, jobs, path.join(dir, `logs-${tag}`),
    (_job, r) => unitResult(st, ALL, r, sink), (s) => said.push(s),
    { onProgress: (_job, msg) => unitProgress(st, ALL, msg, sink) });
  const skips = fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).map((l) => (JSON.parse(l) as { skip: string[] }).skip);
  return { rows, lines, skips, said };
}

const keysOf = (rows: BranchRow[]): string[] => rows.map((r) => branchKey(r.o, r.i)).sort();
const ALL_KEYS = [0, 1, 2, 3].flatMap((i) => [0, 1].map((o) => branchKey(o, i))).sort();

test('a worker that dies mid-unit: the fresh one resumes at the branches it has no row for, each played once', async () => {
  const { rows, lines, skips } = await playUnit([{ die: 3 }, {}], 'die');
  assert.deepEqual(keysOf(rows), ALL_KEYS, 'every branch exactly once');
  assert.equal(skips.length, 2, 'two attempts');
  assert.deepEqual(skips[0], [], 'the first attempt skips nothing');
  assert.deepEqual([...(skips[1] ?? [])].sort(), ['o0:b0', 'o0:b1', 'o1:b0'], 'the second skips exactly the three branches streamed before the death');
  assert.equal(lines.length, 1, 'one units.jsonl line for the unit, when it is done -- none for the dead attempt');
  const l = lines[0] as UnitLine;
  assert.deepEqual([l.ok, l.branches, l.expected, l.attempts, l.engineErrors, l.error], [true, 8, 8, 2, 0, null]);
  assert.match((l.attemptErrors ?? [])[0] ?? '', /worker exited \(1\)/);
});

test('a worker that retires after two OutOfMemoryErrors: the pool starts a fresh one, which resumes; the OOM branches stay as engine errors', async () => {
  const { rows, lines, skips, said } = await playUnit([{ retire: 5, oom: 2 }, {}], 'retire');
  assert.deepEqual(keysOf(rows), ALL_KEYS, 'every branch exactly once (streamed, then again in the match line: written once)');
  assert.equal(rows.filter((r) => r.engineError).length, 2, 'the two OOM branches are rows, marked engine errors -- never dropped');
  assert.ok(rows.filter((r) => r.engineError).every((r) => /OutOfMemoryError/.test(String(r.error))));
  assert.equal((skips[1] ?? []).length, 5, 'the resume skips the five recorded branches, OOM ones included');
  const l = lines[0] as UnitLine;
  assert.deepEqual([lines.length, l.ok, l.branches, l.attempts, l.engineErrors], [1, true, 8, 2, 2]);
  assert.match((l.attemptErrors ?? [])[0] ?? '', /retired/);
  assert.ok(said.some((s) => /retiring after d2-forge-0/.test(s)), said.join('\n'));
  assert.ok(!said.some((s) => /could not boot/.test(s)), 'a retirement is not a boot failure');
});

test('a unit that dies at the same place every time is given up after two attempts, recorded unfinished', async () => {
  const { rows, lines, skips } = await playUnit([{ die: 2 }, { die: 0 }, {}], 'stuck');
  assert.equal(skips.length, 2, 'the third attempt is not made: the second recorded nothing');
  assert.equal(rows.length, 2);
  const l = lines[0] as UnitLine;
  assert.deepEqual([lines.length, l.ok, l.branches, l.expected, l.attempts], [1, false, 2, 8, 2]);
  assert.match(String(l.error), /worker exited/);
});

test('the resume policy, and the branches a unit already holds', () => {
  assert.equal(resumeUnit(1, 0, false), true, 'the second attempt always runs');
  assert.equal(resumeUnit(2, 0, false), false, 'a later one only after progress');
  assert.equal(resumeUnit(2, 3, false), true);
  assert.equal(resumeUnit(UNIT_ATTEMPTS_MAX, 9, false), false, 'never past the cap');
  assert.equal(resumeUnit(1, 4, true), false, 'a complete unit is done');
  const r = (d: number, c: 'random' | 'forge', o: number, i: number) => ({ d, c, o, i });
  const done = doneBranches([r(2, 'forge', 0, 1), r(2, 'forge', 1, 3), r(2, 'random', 0, 2), r(3, 'forge', 0, 1), r(2, 'forge', 0, 4)], UNIT);
  assert.deepEqual([...done].sort(), ['o0:b1', 'o1:b3'], 'its decision, continuation and branch range only');
  assert.deepEqual((unitJob(OPTS, dir, UNIT, LISTING, ['o0:b1']).atlas as { skip?: string[] }).skip, ['o0:b1']);
  assert.equal('skip' in (unitJob(OPTS, dir, UNIT, LISTING).atlas as object), false, 'a first attempt carries no skip');
});
