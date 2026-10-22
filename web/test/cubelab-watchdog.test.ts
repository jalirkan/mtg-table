/*
 * mtg-table — web/test/cubelab-watchdog.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * D459: the cube lab's worker pool (tools/cubelab/engine.ts runPool) times a match on a MONOTONIC
 * clock.  J148's atlas lost seven units on 2026-10-20 and 10-21 to "no answer in 7960 s (hung)"
 * within a minute of their start: the wall clock jumped 4 h forward after boot, and the watchdog
 * compared Date.now() against each unit's start.
 *
 * No engine: a fake `java` first on PATH speaks the worker's protocol (`CUBELAB {"type":"ready"}`,
 * one job a line, a `match` line back), so `env -u DISPLAY java ...` runs it in place of the JVM.
 *
 *  - a wall-clock jump of 4 h while a unit plays does not trip the watchdog (Date.now() is patched
 *    to jump; with the watchdog on Date.now(), as before D459, this test fails);
 *  - a worker that never answers is still killed as hung at its deadline;
 *  - the deadline: a job's deadlineSec wins, else games x (gameTimeoutSec + 40) + 120 s.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

import { matchDeadlineMs, runPool, type MatchJob, type MatchResult } from '../../tools/cubelab/engine.ts';

const FAKE_JAVA = `#!/usr/bin/env node
// A cube-lab worker that is not one: ready at once; a job whose id starts "silent" is never answered,
// any other is answered with an empty match after its answerAfterMs.
const rl = require('node:readline').createInterface({ input: process.stdin });
process.stdout.write('CUBELAB {"type":"ready"}\\n');
rl.on('line', (line) => {
  const j = JSON.parse(line);
  if (j.type === 'quit') process.exit(0);
  if (String(j.id).startsWith('silent')) return;
  setTimeout(() => process.stdout.write('CUBELAB ' + JSON.stringify({ type: 'match', id: j.id, forge: [], games: [] }) + '\\n'), j.answerAfterMs || 0);
});
rl.on('close', () => process.exit(0));
`;

let dir = '';
let pathWas: string | undefined;
let controlWas: string | undefined;

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cubelab-watchdog-'));
  fs.mkdirSync(path.join(dir, 'bin'));
  fs.writeFileSync(path.join(dir, 'bin', 'java'), FAKE_JAVA, { mode: 0o755 });
  pathWas = process.env.PATH;
  process.env.PATH = `${path.join(dir, 'bin')}:${pathWas ?? ''}`;
  controlWas = process.env.LAB_CONTROL;      // the lab runner's control file would pause or cap the pool
  delete process.env.LAB_CONTROL;
});

after(() => {
  process.env.PATH = pathWas;
  if (controlWas !== undefined) process.env.LAB_CONTROL = controlWas;
  fs.rmSync(dir, { recursive: true, force: true });
});

function job(id: string, extra: Partial<MatchJob> & Record<string, unknown>): MatchJob {
  return { id, seed: 1, games: 1, gameTimeoutSec: 300, profileA: 'Default', profileB: 'Default', builder: 'lab',
    deckA: null, deckB: null, poolA: [], poolB: [], forgeDeckOutA: '', forgeDeckOutB: '', ...extra } as MatchJob;
}

async function pool(jobs: MatchJob[]): Promise<{ results: Map<string, MatchResult>; said: string[] }> {
  const results = new Map<string, MatchResult>();
  const said: string[] = [];
  const homes = jobs.map((_, k) => path.join(dir, `home-${k}`));
  await runPool({ cp: 'unused', homes, repo: dir }, jobs, path.join(dir, 'logs'), (j, r) => { results.set(j.id, r); }, (s) => said.push(s));
  return { results, said };
}

test('the deadline: deadlineSec when the job has one, else the game timeout\'s formula (J148: 7,960 s)', () => {
  assert.equal(matchDeadlineMs({ games: 1, gameTimeoutSec: 7800 }), 7960 * 1000, 'J148\'s hung units: 1 x (7800 + 40) + 120');
  assert.equal(matchDeadlineMs({ games: 3, gameTimeoutSec: 300 }), (3 * 340 + 120) * 1000);
  assert.equal(matchDeadlineMs({ games: 1, gameTimeoutSec: 7800, deadlineSec: 1800 }), 1800 * 1000);
});

test('a 4-hour jump of the wall clock while a unit plays does not trip the watchdog', async () => {
  const realNow = Date.now;
  // The jump lands after the unit started and before the pool's first 2-s tick; the unit answers
  // after that tick, so a watchdog on Date.now() would have called it hung (4 h > 60 s).
  const jump = setTimeout(() => { Date.now = () => realNow() + 4 * 3600_000; }, 300);
  try {
    const { results, said } = await pool([job('steady', { deadlineSec: 60, answerAfterMs: 2600 })]);
    const r = results.get('steady');
    assert.ok(r, 'the unit has a result');
    assert.equal(r.engineError, undefined, `no engine error: ${r.engineError} (${said.join('; ')})`);
    assert.ok(Date.now() - realNow() > 3600_000, 'the wall clock really did jump during the run');
  } finally {
    clearTimeout(jump);
    Date.now = realNow;
  }
});

test('a worker that never answers is still killed as hung at its deadline', async () => {
  const t0 = performance.now();
  const { results } = await pool([job('silent-unit', { deadlineSec: 1 })]);
  const r = results.get('silent-unit');
  assert.ok(r, 'the hung unit has a result');
  assert.match(r.engineError ?? '', /^no answer in 1 s \(hung\)$/);
  assert.deepEqual(r.games, []);
  const s = (performance.now() - t0) / 1000;
  assert.ok(s >= 1 && s < 10, `killed after its 1-s deadline, at the next tick (${s.toFixed(1)} s)`);
});
