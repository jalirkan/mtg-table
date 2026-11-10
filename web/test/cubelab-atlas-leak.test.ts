/*
 * mtg-table — web/test/cubelab-atlas-leak.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * D529, the move atlas's no-leak check read as D529 reads it, engine-free.  The verdict itself is the bridge's
 * (`LeakVerdict`, held on strings and a fake clock by `mtgtable.ai.DecisionSelfTest` in the build); here, what the atlas does
 * with it:
 *
 *  - `leakChecksReport`: a leak, a retest out of its budget, a fork the copier did not reproduce, a redeal that tested nothing,
 *    a control that did not move the digest are problems (all but the leak counted in `leakFaults`); a non-deterministic or
 *    unresolved check, a redeal with fewer than two cards to move, a control with nothing to swap are warnings, however many
 *    one run has; a row from before D529 is read as it was;
 *  - `nightLeakChecks` and `tools/cubelab.sh atlas-leaks`: the runs' counts summed, the night cap (LEAK_UNRESOLVED_CAP) over
 *    the night's non-deterministic plus unresolved checks, a run's leaks and faults passed through;
 *  - the bridge's constants and the TS copies agree (RETESTS, RETEST_BUDGET_MS); the switch's unknown value is refused;
 *  - the command, through the real pool and a fake `java` (as cubelab-atlas-only.test.ts), the worker reporting each kind of
 *    check: non-determinism (a warning, exit 0, `leaks` 0); a systematic redeal (a leak, exit 3); a moved fork digest (a leak,
 *    exit 3); unresolved (a warning, exit 0); a retest out of its budget (a fault, exit 3, `leaks` 0); an unstable fork (a
 *    fault, exit 3, `leaks` 0); a redeal that changed nothing (a fault, exit 3); a clean check.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  atlasCommand, atlasLeaksCommand, checkLeakRetestEnv, LEAK_RETEST_BUDGET_MS, LEAK_RETESTS, LEAK_UNRESOLVED_CAP, leakChecksReport, nightLeakChecks,
  type BranchRow, type DecisionListing, type LeakCounts, type LeakRetest,
} from '../../tools/cubelab/atlas.ts';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const row = (key: string, extra: Partial<BranchRow>): BranchRow => ({ v: 1, d: 0, kind: 'a', turn: 3, c: 'forge', o: 0, token: 'attack:none', label: '', i: 0, seed: 1,
  result: 1, score: 1, capped: false, timedOut: false, turns: 9, steps: 9, ms: 1, bytes: 1, standIns: 0, error: null, forkProblems: [], key, ...extra });
/** A D529 row: the redeal applied (40 cards to move), the control's digest moved (7 swapped), unless `extra` says otherwise. */
const d529 = (key: string, extra: Partial<BranchRow>): BranchRow => row(key, { leakSame: true, controlMoved: true, leakMoved: false, leakForkSame: true,
  leakRedealApplied: true, leakRedealable: 40, controlForkMoved: true, controlSwap: 7, ...extra });
const retest = (verdict: LeakRetest['verdict'], baseDistinct = 2, redealDistinct = 2, shared = 1): LeakRetest => ({ base: 5, redeal: 5, baseDistinct, redealDistinct, shared, verdict });

test('D529, leakChecksReport: what is a problem, what a warning, and what leakFaults counts', () => {
  const clean = leakChecksReport([d529('k-same', {}), row('k-old', { leakSame: true, controlMoved: true })]);
  assert.deepEqual([clean.problems, clean.warnings], [[], []], 'a clean D529 row and a row from before D529');
  assert.equal(clean.counts.leakForkChecked, 1, 'only the D529 row compared digests');
  // non-determinism: one warning
  const nd = leakChecksReport([d529('k-nd', { leakMoved: true, leakRetest: retest('nondeterministic') })]);
  assert.deepEqual(nd.problems, []);
  assert.equal(nd.warnings.length, 1);
  assert.match(nd.warnings[0] ?? '', /^1 of 1 no-leak check\(s\) moved on the first redealt replay but are not a leak.*k-nd \(5 base \/ 5 redeal replays, 2 \/ 2 distinct outcomes, 1 shared\)/);
  assert.deepEqual([nd.counts.leakNondeterministic, nd.counts.leakFaults, nd.counts.leaks], [1, 0, 0]);
  // unresolved: its own warning
  const un = leakChecksReport([d529('k-un', { leakMoved: true, leakRetest: retest('unresolved', 3, 4, 0) })]);
  assert.deepEqual(un.problems, []);
  assert.match(un.warnings[0] ?? '', /unresolved: the outcome sets were disjoint but the base itself varied/);
  assert.deepEqual([un.counts.leakUnresolved, un.counts.leakFaults], [1, 0]);
  // the faults: each a problem, none a leak
  const faults = leakChecksReport([
    d529('k-inc', { leakMoved: true, leakRetest: retest('incomplete') }),
    d529('k-fu', { leakMoved: true, leakRetest: retest('forkUnstable') }),
    d529('k-rd', { leakRedealApplied: false, leakRedealable: 33 }),
    d529('k-ct', { controlForkMoved: false, controlSwap: 6 }),
  ]);
  assert.equal(faults.counts.leaks, 0);
  assert.equal(faults.counts.leakFaults, 4);
  assert.equal(faults.problems.length, 4);
  assert.match(faults.problems[0] ?? '', /^1 no-leak check\(s\) moved, retest incomplete: the retest ran out of its 10-minute budget.*k-inc/);
  assert.match(faults.problems[1] ?? '', /the copier did not reproduce the fork from its seed, not a leak.*k-fu/);
  assert.match(faults.problems[2] ?? '', /redeal left seat B's hand and library where they were on the copy, with 33 card\(s\) it could move: the check tested nothing.*k-rd/);
  assert.match(faults.problems[3] ?? '', /control swapped 6 card\(s\).*left the fork digest where it was.*k-ct/);
  // the legitimate stand-stills: warnings
  const still = leakChecksReport([d529('k-1card', { leakRedealApplied: false, leakRedealable: 1 }), d529('k-empty', { controlForkMoved: false, controlSwap: 0 })]);
  assert.deepEqual(still.problems, []);
  assert.equal(still.warnings.length, 2);
  assert.match(still.warnings[0] ?? '', /fewer than two cards the redeal could move.*k-1card/);
  assert.match(still.warnings[1] ?? '', /nothing to swap.*k-empty/);
  assert.deepEqual([still.counts.leakRedealNothing, still.counts.leakControlEmpty, still.counts.leakFaults], [1, 1, 0]);
  // a leak, by the digest and by the retest
  const lk = leakChecksReport([d529('k-lk', { leakSame: false, leakMoved: true, leakRetest: retest('leak', 1, 1, 0) }), d529('k-fd', { leakSame: false, leakForkSame: false })]);
  assert.deepEqual([lk.counts.leaks, lk.counts.leakFaults], [2, 0]);
  assert.match(lk.problems[0] ?? '', /^2 of 2 no-leak check\(s\) moved when only seat B's hidden cards did \(k-lk: 5 base and 5 redeal replays share no outcome, the base reproduced\)$/);
});

test('D529, one run carries no cap: LEAK_UNRESOLVED_CAP or more moves in one atlas run are warnings, its leakFaults 0', () => {
  assert.equal(LEAK_UNRESOLVED_CAP, 3);
  const moves = (n: number): BranchRow[] => Array.from({ length: n }, (_, k) => d529(`k${k}`, { leakMoved: true, leakRetest: retest(k % 2 ? 'unresolved' : 'nondeterministic', 2, 2, k % 2 ? 0 : 1) }));
  const at = leakChecksReport(moves(LEAK_UNRESOLVED_CAP + 1));
  assert.deepEqual([at.problems, at.counts.leakFaults, at.counts.leaks], [[], 0, 0]);
  assert.deepEqual([at.counts.leakNondeterministic, at.counts.leakUnresolved, at.warnings.length], [2, 2, 2]);
});

/** One run's atlas.json checks as leakChecksReport writes them, every count 0 but what `c` says. */
const runChecks = (c: Partial<LeakCounts>): Partial<LeakCounts> => ({ leakChecks: 2, leaks: 0, leakControlsMoved: 2, leakMoved: 0, leakNondeterministic: 0, leakUnresolved: 0,
  leakRetestIncomplete: 0, leakForkUnstable: 0, leakForkChecked: 2, leakRedealApplied: 2, leakRedealNothing: 0, leakControlForkMoved: 2, leakControlEmpty: 0, leakFaults: 0, ...c });

test('D529, the night cap: nightLeakChecks sums the runs and applies LEAK_UNRESOLVED_CAP over the night', () => {
  // ten non-deterministic checks over ten runs trip it
  const ten = nightLeakChecks(Array.from({ length: 10 }, (_, k) => ({ name: `s${k}/atlas.json`, checks: runChecks({ leakMoved: 1, leakNondeterministic: 1 }) })));
  assert.equal(ten.capped, true);
  assert.equal(ten.ok, false);
  assert.deepEqual([ten.runs, ten.runsWithChecks, ten.counts.leakChecks, ten.counts.leakNondeterministic, ten.counts.leaks, ten.counts.leakFaults], [10, 10, 20, 10, 0, 1]);
  assert.equal(ten.problems.length, 1);
  assert.match(ten.problems[0] ?? '', /^10 no-leak checks over the night's 10 atlas run\(s\) moved and were not resolved as a leak \(10 non-deterministic, 0 unresolved\): 3 or more is a problem.*the night cap.*s0\/atlas\.json \(1\)/);
  // two over two runs do not: a warning
  const two = nightLeakChecks([{ name: 'a', checks: runChecks({ leakNondeterministic: 1 }) }, { name: 'b', checks: runChecks({ leakNondeterministic: 1 }) }]);
  assert.deepEqual([two.capped, two.ok, two.problems, two.counts.leakFaults], [false, true, [], 0]);
  assert.match(two.warnings[0] ?? '', /^2 no-leak check\(s\) over the night moved .* under the night cap of 3/);
  // unresolved counts with non-deterministic
  const mix = nightLeakChecks([{ name: 'a', checks: runChecks({ leakNondeterministic: 1 }) }, { name: 'b', checks: runChecks({ leakUnresolved: 2 }) }]);
  assert.deepEqual([mix.capped, mix.counts.leakNondeterministic, mix.counts.leakUnresolved, mix.counts.leakFaults], [true, 1, 2, 1]);
  assert.match(mix.problems[0] ?? '', /\(1 non-deterministic, 2 unresolved\)/);
  // leaks and leakFaults pass through, summed, each run named
  const bad = nightLeakChecks([
    { name: 'a', checks: runChecks({ leaks: 1 }) }, { name: 'b', checks: runChecks({ leaks: 2, leakFaults: 1, leakRetestIncomplete: 1 }) },
    { name: 'c', checks: runChecks({ leakFaults: 2, leakForkUnstable: 2 }) }, { name: 'd', checks: null },
  ]);
  assert.deepEqual([bad.runs, bad.runsWithChecks, bad.counts.leaks, bad.counts.leakFaults, bad.counts.leakRetestIncomplete, bad.counts.leakForkUnstable, bad.capped, bad.ok],
    [4, 3, 3, 3, 1, 2, false, false]);
  assert.deepEqual(bad.problems.map((p) => p.split(':')[0]), ['a', 'b', 'b', 'c']);
  assert.match(bad.warnings[0] ?? '', /^d: no checks in its atlas\.json, not read/);
  // a run from before D529 (no new keys) counts 0 for them; a clean night is ok
  const old = nightLeakChecks([{ name: 'old', checks: { leakChecks: 2, leaks: 0, leakControlsMoved: 2 } }, { name: 'new', checks: runChecks({}) }]);
  assert.deepEqual([old.ok, old.problems, old.warnings, old.counts.leakChecks, old.counts.leakFaults], [true, [], [], 4, 0]);
});

test('D529, atlas-leaks: every spine\'s atlas.json read (a folder means its atlas.json), one JSON object, exit 0 / 3 / 2', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cubelab-atlas-leaks-'));
  try {
    const put = (name: string, c: Partial<LeakCounts>): string => {
      fs.mkdirSync(path.join(root, name), { recursive: true });
      fs.writeFileSync(path.join(root, name, 'atlas.json'), JSON.stringify({ checks: { problems: [], ...runChecks(c) } }));
      return path.join(root, name);
    };
    const s = Array.from({ length: 3 }, (_, k) => put(`s${k}`, { leakNondeterministic: 1 }));
    const said: string[] = [];
    assert.equal(atlasLeaksCommand(REPO, [s[0]!, path.join(s[1]!, 'atlas.json')], (x) => said.push(x)), 0);
    const ok = JSON.parse(said[0] ?? '') as Record<string, unknown>;
    assert.deepEqual([ok.runs, ok.leakChecks, ok.leaks, ok.leakFaults, ok.leakNondeterministic, ok.capped, ok.ok], [2, 4, 0, 0, 2, false, true]);
    said.length = 0;
    assert.equal(atlasLeaksCommand(REPO, s, (x) => said.push(x)), 3, 'three over three runs: the night cap');
    const capped = JSON.parse(said[0] ?? '') as Record<string, unknown>;
    assert.deepEqual([capped.leaks, capped.leakFaults, capped.capped, capped.ok, (capped.problems as string[]).length], [0, 1, true, false, 1]);
    assert.equal(atlasLeaksCommand(REPO, [path.join(root, 'missing')], () => undefined), 2);
    assert.equal(atlasLeaksCommand(REPO, [], () => undefined), 2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('D529, the bridge\'s constants and the TS copies agree; the switch takes unset, always or perturb only', () => {
  const java = fs.readFileSync(path.join(REPO, 'bridge/src/mtgtable/ai/LeakVerdict.java'), 'utf8');
  assert.equal(Number(/public static final int RETESTS = (\d+);/.exec(java)?.[1]), LEAK_RETESTS);
  assert.equal(Number(/public static final long RETEST_BUDGET_MS = ([\d_]+)L;/.exec(java)?.[1]?.replaceAll('_', '')), LEAK_RETEST_BUDGET_MS);
  const atlasJava = fs.readFileSync(path.join(REPO, 'bridge/src/mtgtable/ai/Atlas.java'), 'utf8');
  for (const v of ['"always"', '"perturb"', '"MTGTABLE_ATLAS_LEAK_RETEST"']) assert.ok(atlasJava.includes(v), `Atlas.java reads ${v}`);
  for (const v of [undefined, '', 'always', 'perturb']) checkLeakRetestEnv(v);
  for (const v of ['on', 'ALWAYS', '1']) assert.throws(() => checkLeakRetestEnv(v), /MTGTABLE_ATLAS_LEAK_RETEST=.* is not always or perturb or unset/);
});

// ------------------------------------------------------------------
// The command, through the real pool and a fake `java`
// ------------------------------------------------------------------

// The fake worker plays every job's branches and, on option 0's first branch of a unit with leak checks, reports the check as
// FAKE_LEAK says: what a D529 bridge writes for that kind (Atlas.writeBranch).
const FAKE_JAVA = `#!/usr/bin/env node
const out = (o) => process.stdout.write('CUBELAB ' + JSON.stringify(o) + '\\n');
const rl = require('node:readline').createInterface({ input: process.stdin });
const ok = { leakSame: true, controlMoved: true, leakMoved: false, leakForkSame: true, leakRedealApplied: true, leakRedealable: 40, controlForkMoved: true, controlSwap: 7 };
const rt = (verdict, bd, rd, shared) => ({ base: 5, redeal: 5, baseDistinct: bd, redealDistinct: rd, shared, verdict });
const LEAK = {
  same: ok,
  nondeterministic: { ...ok, leakMoved: true, leakRetest: rt('nondeterministic', 2, 2, 2) },
  leak: { ...ok, leakSame: false, leakMoved: true, leakRetest: rt('leak', 1, 1, 0) },
  fork: { ...ok, leakSame: false, leakForkSame: false },
  unresolved: { ...ok, leakMoved: true, leakRetest: rt('unresolved', 3, 2, 0) },
  incomplete: { ...ok, leakMoved: true, leakRetest: { ...rt('incomplete', 1, 2, 1), base: 3, redeal: 3 } },
  forkUnstable: { ...ok, leakMoved: true, leakForkSame: false, leakRetest: rt('forkUnstable', 1, 2, 1) },
  redealNothing: { ...ok, leakRedealApplied: false },
};
out({ type: 'ready' });
rl.on('line', (line) => {
  const j = JSON.parse(line);
  if (j.type === 'quit') process.exit(0);
  const a = j.atlas;
  const opts = a.options || a.expect.map((_, o) => o);
  const branches = [];
  for (let i = a.i0; i < a.i1; i++) for (const o of opts) {
    const b = { o, i, seed: i, result: o === 0 ? -1 : 1, capped: false, timedOut: false, turns: 9, steps: 99, ms: 5, bytes: 10, standIns: 0,
      key: 'atlas:d' + a.decision + ':' + a.continuation + ':o' + o + ':b' + i, error: null, forkProblems: [] };
    if (o === 0 && i - a.i0 < (a.leakChecks || 0)) Object.assign(b, LEAK[process.env.FAKE_LEAK]);
    branches.push(b);
  }
  for (const b of branches) out({ type: 'progress', id: j.id, branch: b });
  const game = { n: 1, onPlay: 'A', onPlayVerified: 'A', winner: 'A', turns: 9, ms: 50, cpuMs: 60, timeout: false, reason: null, error: null,
    atlas: { decisions: [], branches, copiesRetained: 0 } };
  out({ type: 'match', id: j.id, forge: [], games: [game] });
});
rl.on('close', () => process.exit(0));
`;

let dir = '';
const envWas: Record<string, string | undefined> = {};
const BASELINE: DecisionListing[] = [{ d: 0, kind: 'a', turn: 3, tokens: ['attack:none', 'attack:5'], labels: ['attack none', 'attack 5'] }];

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cubelab-atlas-leak-'));
  fs.mkdirSync(path.join(dir, 'bin'));
  fs.writeFileSync(path.join(dir, 'bin', 'java'), FAKE_JAVA, { mode: 0o755 });
  fs.writeFileSync(path.join(dir, 'a.dck'), '[metadata]\nName=A\n[Main]\n20 Mountain\n');
  fs.writeFileSync(path.join(dir, 'b.dck'), '[metadata]\nName=B\n[Main]\n20 Island\n');
  for (const k of ['PATH', 'LAB_CONTROL', 'LAB_DATA_DIR', 'FAKE_LEAK', 'CUBELAB_CP', 'CUBELAB_HOMES', 'MTGTABLE_ATLAS_LEAK_RETEST']) envWas[k] = process.env[k];
  process.env.PATH = `${path.join(dir, 'bin')}:${envWas.PATH ?? ''}`;
  process.env.CUBELAB_CP = 'unused';
  process.env.CUBELAB_HOMES = path.join(dir, 'home0');
  delete process.env.LAB_CONTROL;      // the lab runner's control file would pause or cap the pool
  delete process.env.LAB_DATA_DIR;
  delete process.env.MTGTABLE_ATLAS_LEAK_RETEST;
});

after(() => {
  for (const [k, v] of Object.entries(envWas)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  fs.rmSync(dir, { recursive: true, force: true });
});

interface Checks {
  problems: string[]; warnings: string[]; leakChecks: number; leaks: number; leakControlsMoved: number; leakMoved: number; leakNondeterministic: number;
  leakUnresolved: number; leakRetestIncomplete: number; leakForkUnstable: number; leakForkChecked: number; leakRedealApplied: number; leakControlForkMoved: number; leakFaults: number;
}

/** One spine on the Forge map alone at d0, its baseline already played, the fake worker's no-leak check as `kind` says. */
async function run(kind: string): Promise<{ rc: number; checks: Checks; leakRow: BranchRow; said: string[] }> {
  const out = path.join(dir, kind);
  fs.mkdirSync(path.join(out, 'phaseB'), { recursive: true });
  fs.writeFileSync(path.join(out, 'phaseB', 'baseline.json'), `${JSON.stringify({ v: 1, seed: 7, winner: 'A', first: 'A', turns: 12, capped: false, ms: 1, decisions: BASELINE }, null, 2)}\n`);
  const listFile = path.join(dir, `${kind}.json`);
  fs.writeFileSync(listFile, `${JSON.stringify([{ d: 0, options: [0, 1], tokens: BASELINE[0]!.tokens }])}\n`);
  process.env.FAKE_LEAK = kind;
  const flags = new Map<string, string[]>([
    ['deck-a', [path.join(dir, 'a.dck')]], ['deck-b', [path.join(dir, 'b.dck')]], ['seed', ['7']], ['phase', ['b']], ['branch-random', ['0']], ['branch-forge', ['2']],
    ['chunk', ['2']], ['leak-checks', ['1']], ['boot', ['50']], ['jobs', ['1']], ['out', [out]], ['only', [listFile]],
  ]);
  const said: string[] = [];
  const rc = await atlasCommand(REPO, flags, (s) => said.push(s));
  const checks = (JSON.parse(fs.readFileSync(path.join(out, 'atlas.json'), 'utf8')) as { checks: Checks }).checks;
  const rows = fs.readFileSync(path.join(out, 'phaseB', 'branches.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as BranchRow);
  const leakRow = rows.find((r) => r.leakSame !== undefined);
  assert.ok(leakRow, `${kind}: a row carries the no-leak check`);
  return { rc, checks, leakRow, said };
}

test('D529, the command: a branch non-deterministic on both sides over the same outcomes is a warning, never a leak', async () => {
  const { rc, checks, leakRow, said } = await run('nondeterministic');
  assert.equal(rc, 0, said.join('\n'));
  assert.deepEqual([checks.leakChecks, checks.leaks, checks.leakMoved, checks.leakNondeterministic, checks.leakForkChecked, checks.leakControlsMoved, checks.leakFaults], [1, 0, 1, 1, 1, 1, 0]);
  assert.deepEqual(checks.problems, []);
  assert.equal(checks.warnings.length, 1);
  assert.match(checks.warnings[0] ?? '', /not a leak.*D529/);
  assert.equal(leakRow.leakSame, true, 'leakSame keeps meaning "no leak"');
  assert.equal(leakRow.leakMoved, true, 'the first redealt replay moved, said apart');
  assert.deepEqual(leakRow.leakRetest, { base: 5, redeal: 5, baseDistinct: 2, redealDistinct: 2, shared: 2, verdict: 'nondeterministic' });
  assert.ok(said.some((s) => /atlas warning: 1 of 1 no-leak check/.test(s)), said.join('\n'));
});

test('D529, the command: a redeal systematically different from a base that reproduced is a leak, a problem naming the retest', async () => {
  const { rc, checks, leakRow } = await run('leak');
  assert.equal(rc, 3);
  assert.deepEqual([checks.leakChecks, checks.leaks, checks.leakMoved, checks.leakNondeterministic, checks.leakFaults], [1, 1, 1, 0, 0]);
  assert.equal(checks.problems.length, 1);
  assert.match(checks.problems[0] ?? '', /^1 of 1 no-leak check\(s\) moved when only seat B's hidden cards did \(atlas:d0:forge:o0:b0: 5 base and 5 redeal replays share no outcome, the base reproduced\)$/);
  assert.deepEqual(checks.warnings, []);
  assert.equal(leakRow.leakSame, false);
});

test('D529, the command: a fork digest that moved is a leak though no outcome moved', async () => {
  const { rc, checks, leakRow } = await run('fork');
  assert.equal(rc, 3);
  assert.deepEqual([checks.leakChecks, checks.leaks, checks.leakMoved, checks.leakNondeterministic, checks.leakForkChecked], [1, 1, 0, 0, 1]);
  assert.match(checks.problems[0] ?? '', /\(atlas:d0:forge:o0:b0: the fork digest moved\)$/);
  assert.deepEqual([leakRow.leakSame, leakRow.leakMoved, leakRow.leakForkSame, leakRow.leakRetest], [false, false, false, undefined]);
});

test('D529, the command: disjoint sets with a varying base are unresolved, a warning, exit 0', async () => {
  const { rc, checks } = await run('unresolved');
  assert.equal(rc, 0);
  assert.deepEqual([checks.leaks, checks.leakUnresolved, checks.leakFaults, checks.problems.length, checks.warnings.length], [0, 1, 0, 0, 1]);
});

test('D529, the command: a retest out of its budget, an unstable fork and a redeal that changed nothing are faults: exit 3, no leak', async () => {
  for (const [kind, count, re] of [
    ['incomplete', 'leakRetestIncomplete', /moved, retest incomplete/],
    ['forkUnstable', 'leakForkUnstable', /the copier did not reproduce the fork from its seed, not a leak/],
    ['redealNothing', 'leakRedealApplied', /the check tested nothing/],
  ] as Array<[string, keyof Checks, RegExp]>) {
    const { rc, checks } = await run(kind);
    assert.equal(rc, 3, kind);
    assert.deepEqual([checks.leaks, checks.leakFaults, checks.problems.length], [0, 1, 1], kind);
    assert.match(checks.problems[0] ?? '', re, kind);
    assert.equal(checks[count], kind === 'redealNothing' ? 0 : 1, `${kind}: ${count}`);
  }
});

test('D529, the command: a check that did not move is clean, and carries the digest\'s, the redeal\'s and the control\'s words', async () => {
  const { rc, checks, leakRow, said } = await run('same');
  assert.equal(rc, 0, said.join('\n'));
  assert.deepEqual([checks.leakChecks, checks.leaks, checks.leakMoved, checks.leakNondeterministic, checks.leakForkChecked, checks.leakRedealApplied, checks.leakControlForkMoved, checks.leakFaults],
    [1, 0, 0, 0, 1, 1, 1, 0]);
  assert.deepEqual([checks.problems, checks.warnings], [[], []]);
  assert.deepEqual([leakRow.leakSame, leakRow.leakMoved, leakRow.leakForkSame, leakRow.leakRedealApplied, leakRow.leakRedealable, leakRow.controlForkMoved, leakRow.controlSwap],
    [true, false, true, true, 40, true, 7]);
});

test('D529, the command: an unknown MTGTABLE_ATLAS_LEAK_RETEST is refused before anything runs', async () => {
  process.env.MTGTABLE_ATLAS_LEAK_RETEST = 'sometimes';
  try {
    await assert.rejects(run('same'), /MTGTABLE_ATLAS_LEAK_RETEST=sometimes is not always or perturb or unset/);
  } finally {
    delete process.env.MTGTABLE_ATLAS_LEAK_RETEST;
  }
});
