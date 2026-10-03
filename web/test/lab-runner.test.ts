/*
 * mtg-table — web/test/lab-runner.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The lab runner (tools/runner/, D337), engine-free.  systemd is a fake Sys
 * that runs each step's script with bash at once (or holds it "active"); git
 * is real, against bare repositories in a temp folder standing in for
 * jalirkan/mtg-table (pc-jobs, pc-results, main) and jalirkan/ForgeCoach
 * (lab-status):
 *
 *  - the check language: grammar, between and %, unknown metrics never pass,
 *    nothing evaluates code;
 *  - job files: the new keys, every older job file still parses, bad lines are errors;
 *  - scheduling (id order, after:, one heavy + one light, Justin playing, needs: check,
 *    retry_after, someone else's running job), worker sizing, the unit's systemd-run line;
 *  - the pressure backoff's decisions; the metric extractors over synthetic run folders,
 *    torn lines included; progress, rate and ETA;
 *  - status.json and the public sanitiser (no path, host or free text gets through);
 *  - the runner end to end: pilot -> checks -> sized commands -> final checks -> collect ->
 *    pushed STATUS / outputs / status.json / HEARTBEAT.md, the public copy on lab-status;
 *    an old-format job stopping after its pilot and `approve`; a failed pilot; an abort; a
 *    memory stop and its retry; a restart that adopts, resumes or restarts;
 *  - the pool control file in the cube lab's runPool (a fake `java` on PATH) and the AI
 *    ladder's drive: pause holds, maxWorkers caps, absent means unchanged.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { decide, DEFAULT_BACKOFF, initialBackoff, parsePressure, retryCap, type BackoffState } from '../../tools/runner/backoff.ts';
import { controlReader, parseControl, readControl, writeControl } from '../../tools/runner/control.ts';
import { evaluate, names, parse } from '../../tools/runner/expr.ts';
import { parseJobFile, parseRepos } from '../../tools/runner/jobfile.ts';
import { aibench, coachbench, completeLines, count, cubelab, cubelabQueue, expandGlob, progressOf, rateAndEta } from '../../tools/runner/metrics.ts';
import { DEFAULT_CONFIG, Runner, type RunnerConfig } from '../../tools/runner/runner.ts';
import { formatStatus, parseStatus, schedule, type Status } from '../../tools/runner/schedule.ts';
import { budget, sizeWorkers, sliceUnit, systemdRunArgs, unitName, type UnitSpec } from '../../tools/runner/sizing.ts';
import { cleanTitle, isoLocal, sanitise, type StatusDoc } from '../../tools/runner/statusjson.ts';
import { sanitiseLadder } from '../../tools/runner/ladder.ts';
import { establishedOn, physicalCores, readMeminfo, type HostSample, type Sys, type UnitState } from '../../tools/runner/sys.ts';
import { runPool, type MatchJob } from '../../tools/cubelab/engine.ts';
import { drive, type BatchResult, type BatchSpec, type Engine } from '../../tools/ai-ladder/bench.ts';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tmp = (p: string): string => fs.mkdtempSync(path.join(os.tmpdir(), `lab-runner-${p}-`));

// ------------------------------------------------------------------ the check language

test('check language: comparisons, between, %, and/or/not, arithmetic', () => {
  const m = { games: 40, errors: 0, median_game_s: 11.5, fallback_rate: 0.369, control: { a_win_rate: 0.3 }, 'search.games': 20, ok: true };
  const yes = ['games == 40', 'errors == 0', 'median_game_s between 4 and 12', 'fallback_rate <= 40%', 'fallback_rate <= 0.40',
    'control.a_win_rate < 0.5', 'search.games >= 20', 'games >= 40 and errors == 0', 'not (games < 40)', 'errors > 0 or games == 40',
    '(errors + 1) * 2 == 2', 'games / 4 == 10', '-errors == 0', 'ok', 'ok == true', 'games != 39'];
  for (const e of yes) assert.equal(evaluate(e, m).result, true, e);
  const no = ['games > 40', 'median_game_s between 4 and 10', 'fallback_rate <= 30%', 'not ok'];
  for (const e of no) assert.equal(evaluate(e, m).result, false, e);
  assert.match(evaluate('median_game_s between 4 and 10', m).values, /median_game_s = 11\.5/);
  assert.deepEqual(names('a.b + c > d and d between 1 and 2'), ['a.b', 'c', 'd']);
});

test('check language: missing data never passes, and nothing is evaluated as code', () => {
  for (const e of ['missing == 0', 'games / errors > 1', 'ok > 1', 'games', 'games and ok']) {
    const v = evaluate(e, { games: 40, errors: 0, ok: true });
    assert.equal(v.result, null, e);
    assert.ok(v.error, e);
  }
  for (const e of ['process.exit(1)', 'require("fs")', 'games; rm -rf /', 'games == `x`', 'a[0] == 1', '1 ==', 'games between 1', '"x" == "x"', 'constructor == 1']) {
    const v = evaluate(e, { games: 1 });
    assert.equal(v.result === true, false, e);
  }
  assert.equal(evaluate('__proto__ == 1', {}).result, null);
  assert.equal(evaluate('constructor.name == 1', {}).result, null);
  assert.throws(() => parse('games >'));
  assert.throws(() => parse('games == 1 2'));
});

// ------------------------------------------------------------------ job files

const NEW_JOB = `id: J010
title: A test job, new format
cpu: heavy
repos: mtg-table@main
est: ~1 min
resumable: yes
max_workers: 3
mem_per_worker_gb: 1.5
progress: lines var/out.jsonl of 3
metrics: n = lines var/out.jsonl
headline: n, final.w

## Pilot
\`\`\`bash
mkdir -p var
printf '{"g":1}\\n{"g":2}\\n{"g":3}\\n' > var/out.jsonl
\`\`\`
check: n == 3

## Commands
\`\`\`bash
echo "{\\"w\\": $JOBS, \\"p\\": {workers}}" > var/w.json
\`\`\`
metrics: final = sh: cat var/w.json
check: final.w == final.p

## Abort if
abort: n > 100

## Report
collect: var/w.json
`;

test('job file: the new keys and sections', () => {
  const j = parseJobFile('jobs/J010-test.md', NEW_JOB, parse);
  assert.deepEqual(j.errors, []);
  assert.equal(j.id, 'J010');
  assert.equal(j.cpu, 'heavy');
  assert.equal(j.resumable, true);
  assert.equal(j.maxWorkers, 3);
  assert.equal(j.memPerWorkerGb, 1.5);
  assert.deepEqual(j.repos, [{ repo: 'mtg-table', ref: 'main' }]);
  assert.equal(j.pilot?.blocks.length, 1);
  assert.deepEqual(j.pilot?.checks, ['n == 3']);
  assert.equal(j.commands?.metrics[0]?.kind, 'sh');
  assert.equal(j.commands?.metrics[0]?.name, 'final');
  assert.deepEqual(j.aborts, ['n > 100']);
  assert.deepEqual(j.collect, ['var/w.json']);
  assert.deepEqual(j.progress, { kind: 'lines', args: ['var/out.jsonl'], total: 3, line: 'lines var/out.jsonl of 3' });
  assert.deepEqual(j.headline, ['n', 'final.w']);
  assert.ok(j.machineChecked);
});

test('job file: every older job file parses, and none of them is machine-checked', () => {
  const r = spawnSync('git', ['-C', REPO, 'ls-tree', '--name-only', 'origin/pc-jobs', 'jobs/'], { encoding: 'utf8' });
  const files = r.status === 0 ? r.stdout.split('\n').filter(Boolean) : [];
  for (const f of files) {
    const j = parseJobFile(f, spawnSync('git', ['-C', REPO, 'show', `origin/pc-jobs:${f}`], { encoding: 'utf8' }).stdout, parse);
    // "repos: same as J006" names no repo the runner can check out: that job file needs fixing, and says so.
    assert.deepEqual(j.errors, /^repos: same as/m.test(j.header.repos ? `repos: ${j.header.repos}` : '') ? ['repos: names neither mtg-table nor ForgeCoach'] : [], f);
    assert.match(j.id, /^J\d{3}$/, f);
    if (!j.pilot?.checks.length) assert.equal(j.machineChecked, false, f);
  }
  assert.deepEqual(parseRepos('mtg-table@ee4d127 (pinned; see below)'), [{ repo: 'mtg-table', ref: 'ee4d127' }]);
  assert.deepEqual(parseRepos('ForgeCoach@bench/pre-prompt-fixes then ForgeCoach@main'), [{ repo: 'ForgeCoach', ref: 'bench/pre-prompt-fixes' }]);
  assert.deepEqual(parseRepos('mtg-table@main (e54aa16 or later), ForgeCoach@main (be989fa or later)'), [{ repo: 'mtg-table', ref: 'main' }, { repo: 'ForgeCoach', ref: 'main' }]);
});

test('job file: the example job files under tools/runner/jobs are valid and machine-checked', () => {
  for (const f of fs.readdirSync(path.join(REPO, 'tools/runner/jobs'))) {
    const j = parseJobFile(f, fs.readFileSync(path.join(REPO, 'tools/runner/jobs', f), 'utf8'), parse);
    assert.deepEqual(j.errors, [], f);
    assert.ok(j.machineChecked, f);
    assert.ok(j.progress, f);
  }
});

test('job file: an unparsable check, a bad key or a clean: outside var/ is an error', () => {
  const j = parseJobFile('J020.md', 'id: J020\ncpu: medium\nmax_workers: lots\nclean: /home ../x\nrepos: mtg-table@main\n## Pilot\n```bash\ntrue\n```\ncheck: games >\n', parse);
  assert.equal(j.errors.length, 5, j.errors.join('\n'));
});

// ------------------------------------------------------------------ STATUS and scheduling

const st = (text: string): Status => parseStatus(text) as Status;

test('STATUS: parse and format round-trip', () => {
  const s = st('waiting\nreason: needs a human/Claude check\nneeds: check\nstarted: 2026-10-03T10:00:00-04:00\n');
  assert.equal(s.state, 'waiting');
  assert.equal(s.fields.needs, 'check');
  assert.equal(formatStatus(s), 'waiting\nreason: needs a human/Claude check\nneeds: check\nstarted: 2026-10-03T10:00:00-04:00\n');
  assert.equal(parseStatus('# Heartbeat'), null);
});

test('schedule: id order, after:, one heavy and one light, Justin, holds, someone else running', () => {
  const job = (id: string, cpu: 'heavy' | 'light', after = ''): ReturnType<typeof parseJobFile> =>
    parseJobFile(`${id}.md`, `id: ${id}\ncpu: ${cpu}\n${after ? `after: ${after}\n` : ''}repos: mtg-table@main\n`, parse);
  const jobs = [job('J004', 'heavy', 'J005'), job('J003', 'heavy'), job('J005', 'heavy', 'J003'), job('J006', 'light'), job('J007', 'light', 'J006')];
  const base = { jobs, active: new Map<string, 'heavy' | 'light'>(), playing: false, paused: false, now: Date.parse('2026-10-03T12:00:00Z') };
  let r = schedule({ ...base, statuses: new Map() });
  assert.deepEqual(r.start.map((j) => j.id), ['J003', 'J006']);
  assert.deepEqual(Object.fromEntries(r.blocked.map((b) => [b.id, b.code])), { J004: 'after', J005: 'after', J007: 'after' });
  // J003 running by hand (no runner: line) blocks heavy work; light still runs.
  r = schedule({ ...base, statuses: new Map([['J003', st('running\nstarted: x\n')]]) });
  assert.deepEqual(r.start.map((j) => j.id), ['J006']);
  r = schedule({ ...base, statuses: new Map(), playing: true });
  assert.deepEqual(r.start.map((j) => j.id), ['J006']);
  assert.equal(r.blocked.find((b) => b.id === 'J003')?.code, 'playing');
  r = schedule({ ...base, statuses: new Map(), paused: true });
  assert.deepEqual(r.start, []);
  r = schedule({ ...base, statuses: new Map([['J003', st('waiting\nneeds: check\nrunner: x\n')], ['J006', st('waiting\nretry_after: 2026-10-03T12:10:00Z\n')]]) });
  assert.deepEqual(r.start, []);
  assert.deepEqual(r.blocked.filter((b) => ['J003', 'J006'].includes(b.id)).map((b) => b.code), ['needs-check', 'memory']);
  r = schedule({ ...base, statuses: new Map([['J003', st('done\n')], ['J005', st('done\n')], ['J006', st('waiting\nretry_after: 2026-10-03T11:50:00Z\n')]]) });
  assert.deepEqual(r.start.map((j) => j.id), ['J004', 'J006']);
});

// ------------------------------------------------------------------ sizing and units

test('sizing: the budget, min(max, cores - 1, budget / peak x 0.85), caps and floors', () => {
  const b = budget({ memTotalGb: 30, physicalCores: 8, threads: 16 });
  assert.equal(b.labGb, 23);
  assert.equal(b.heavyGb, 21);
  const s = (peak: number | null, max: number | null, extra: object = {}): ReturnType<typeof sizeWorkers> =>
    sizeWorkers({ budgetGb: 21, physicalCores: 8, maxWorkers: max, measuredPeakGb: peak, memPerWorkerGb: null, ...extra });
  assert.deepEqual([s(1.7, 7).workers, s(1.7, 7).by], [7, 'cores']);
  assert.deepEqual([s(1.7, 5).workers, s(1.7, 5).by], [5, 'max_workers']);
  assert.deepEqual([s(4.2, null).workers, s(4.2, null).by], [4, 'memory']);          // floor(21 / 4.2 x 0.85) = 4
  assert.equal(s(30, null).workers, 1);
  assert.equal(s(null, null).peakGb, 2.5);
  assert.equal(s(1.0, null, { memPerWorkerGb: 3 }).peakGb, 3);
  assert.deepEqual([s(1.7, 7, { cap: 3 }).workers, s(1.7, 7, { cap: 3 }).by], [3, 'cap']);
  assert.match(sliceUnit(b), /MemoryMax=23G[\s\S]*ManagedOOMMemoryPressure=kill/);
});

test('the unit: systemd-run --user in the lab slice, with the budget, Nice=10 and KillMode=control-group', () => {
  const u: UnitSpec = { unit: unitName('J003', 'run1'), memoryHighGb: 18.9, memoryMaxGb: 21, script: '/s/run1.sh', log: '/s/run1.log', cwd: '/lab/mtg-table', env: { JOBS: '6', LAB_CONTROL: '/s/c.json' } };
  const a = systemdRunArgs(u);
  for (const x of ['--user', '--unit=lab-J003-run1', '--slice=forgecoach-lab.slice', '--collect', 'MemoryHigh=18.9G', 'MemoryMax=21G', 'Nice=10', 'KillMode=control-group', 'ManagedOOMPreference=none', 'StandardOutput=append:/s/run1.log', '--setenv=JOBS=6', '--setenv=LAB_CONTROL=/s/c.json']) assert.ok(a.includes(x), x);
  assert.deepEqual(a.slice(-2), ['/bin/bash', '/s/run1.sh.wrap']);
});

// ------------------------------------------------------------------ backoff

test('backoff: drop a worker on sustained pressure, pause at one, stop past the hard line, restore when calm', () => {
  const at = (i: number): number => i * 10_000;
  let s: BackoffState = initialBackoff(4);
  const step = (i: number, some10: number, swapIn = 0, can = true, jobGb: number | null = null) => {
    const r = decide(s, { at: at(i), some10, swapIn, jobGb, jobMaxGb: 21 }, can);
    s = r.state;
    return r.action;
  };
  assert.equal(step(1, 12), null);                          // one high sample is not enough
  assert.deepEqual(step(2, 12), { kind: 'drop', workers: 3, why: 'some avg10 12.0%, swap-in 0/s' });
  assert.equal(step(3, 12), null);
  assert.equal(step(4, 12), null);                          // cooldown: 60 s between drops
  assert.equal(step(8, 12)?.kind, 'drop');                  // 2 workers
  assert.equal(step(14, 3, 5000), null);
  assert.equal(step(15, 3, 5000)?.kind, 'drop');            // swap-in counts as pressure: 1 worker
  step(21, 12);
  assert.equal(step(22, 12)?.kind, 'pause');                // at one worker: pause new games
  assert.equal(step(30, 45), null);
  assert.equal(step(31, 45), null);
  assert.equal(step(32, 45)?.kind, 'stop');                 // past the hard line with nothing left: stop
  s = { ...s, paused: true, workers: 1, lastDrop: -Infinity };
  let a = null;
  for (let i = 100; i < 140 && !a; i++) a = step(i, 0.5);
  assert.equal(a?.kind, 'resume');                          // calm: lift the pause first
  a = null;
  for (let i = 140; i < 200 && !a; i++) a = step(i, 0.5);
  assert.deepEqual([a?.kind, s.workers], ['raise', 2]);
  // A job that cannot be told: the hard line stops it after hardSamples.
  s = initialBackoff(6);
  assert.equal(step(300, 50, 0, false), null);
  assert.equal(step(301, 50, 0, false), null);
  assert.equal(step(302, 50, 0, false)?.kind, 'stop');
  // The unit's own memory near MemoryMax is hard too; with control it drops first, then stops anyway.
  s = initialBackoff(6);
  const acts = Array.from({ length: 14 }, (_, i) => step(400 + i * 7, 1, 0, true, 20.5)?.kind).filter(Boolean);
  assert.ok(acts.includes('stop'), acts.join(','));
  assert.equal(retryCap(6), 5);
  assert.equal(retryCap(1), 1);
  assert.deepEqual(parsePressure('some avg10=12.34 avg60=1.00 avg300=0.10 total=1\nfull avg10=3.50 avg60=0 avg300=0 total=0\n'), { some10: 12.34, full10: 3.5 });
  assert.equal(DEFAULT_BACKOFF.highSome, 10);
});

// ------------------------------------------------------------------ metrics

function writeLines(file: string, lines: unknown[], torn = ''): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.map((l) => JSON.stringify(l)).join('\n') + (lines.length ? '\n' : '') + torn);
}

test('metrics: ai-bench run folders, torn lines, copier errors, the fallback rate', () => {
  const d = tmp('aib');
  const g = (winner: string, ms: number, extra: object = {}) => ({ pair: 0, game: 0, seed: 1, a: 'A', b: 'B', aDeck: 'x', bDeck: 'y', focusDeck: 'x', winner, focusWon: winner === 'A' ? 'yes' : 'no', turns: 20, ms, timeout: false, error: '', aiEvalTimeouts: 1, ...extra });
  writeLines(path.join(d, 'var/ai-bench/night-a/shard-0.jsonl'), [g('A', 4000, { aStats: { counts: { 'search.fallback.budget': 3, 'search.p.considered': 10 } } }), g('B', 6000)], '{"pair":0,"ga');
  writeLines(path.join(d, 'var/ai-bench/night-a/shard-1.jsonl'), [g('A', 12000, { error: 'boom' }), g('draw', 300000, { timeout: true })]);
  fs.writeFileSync(path.join(d, 'var/ai-bench/night-a/shard-0.log'), "x\nCouldn't map a card\n");
  writeLines(path.join(d, 'var/ai-bench/night-b/shard-0.jsonl'), [g('B', 5000)]);
  const a = aibench(d, ['var/ai-bench/night-a']);
  assert.equal(a.games, 4);
  assert.equal(a.a_wins, 2);
  assert.equal(a.errors, 1);
  assert.equal(a.timeouts, 1);
  assert.equal(a.error_rate, 0.5);
  assert.equal(a.copier_errors, 1);
  assert.equal(a.median_game_s, 9);
  assert.equal(a.a_win_rate, 0.6667);
  assert.equal(a.fallback_rate, 0.3);
  assert.equal(aibench(d, ['var/ai-bench/night-*']).games, 5);
  assert.equal(progressOf(d, 'aibench', ['var/ai-bench/night-*'], 10).done, 5);
  assert.deepEqual(completeLines(path.join(d, 'var/ai-bench/night-a/shard-0.jsonl')).length, 2);
  assert.equal(count(d, ['var/ai-bench/night-a/*.log', "Couldn't map"]), 1);
  assert.deepEqual(expandGlob(d, 'var/ai-bench/*').map((x) => path.basename(x)), ['night-a', 'night-b']);
});

test('metrics: cube-lab runs and the overnight queue', () => {
  const d = tmp('cl');
  const draft = (seed: number, games: object[], engineError?: string) => ({ seed, match: { games, ...(engineError ? { engineError } : {}) } });
  const game = (ms: number, extra: object = {}) => ({ ms, turns: 10, cpuMs: ms * 2, timeout: false, error: null, ...extra });
  writeLines(path.join(d, 'var/cubelab/runs/r1/drafts.jsonl'), [draft(1, [game(1000)]), draft(2, [game(3000, { recorded: { bytes: 500, errors: 0, frames: 1, dir: 'x' } })]), draft(3, [], 'worker died')], '{"seed":4,');
  const c = cubelab(d, ['var/cubelab/runs/r1']);
  assert.deepEqual([c.drafts, c.games, c.engine_errors, c.mean_game_ms, c.ms_per_turn, c.cpu_ms_per_turn, c.recorded_games, c.recorded_bytes_per_game], [3, 2, 1, 2000, 200, 400, 1, 500]);
  // The queue: night-1.json's chunks, each a run folder <root>/<key> (tools/cubelab/queue.ts).
  const q = path.join(d, 'var/cubelab/queue');
  fs.mkdirSync(q, { recursive: true });
  fs.writeFileSync(path.join(q, 'night-1.json'), JSON.stringify({ night: 1, chunks: [{ key: 'normal/omega', seed: 100, drafts: 3 }, { key: 'bridge/omega+pauper', seed: 1, drafts: 2 }] }));
  writeLines(path.join(q, 'normal/omega/drafts.jsonl'), [draft(100, [game(1000)]), draft(101, [game(1000)]), draft(7, [game(1000)])]);
  writeLines(path.join(q, 'bridge/omega+pauper/drafts.jsonl'), [draft(1, [game(1000)])]);
  const qq = cubelabQueue(d, ['var/cubelab/queue', 'night', '1']);
  assert.deepEqual([qq.planned_drafts, qq.night_drafts_done, qq.drafts], [5, 3, 4]);
  assert.deepEqual(progressOf(d, 'cubelab-queue', ['var/cubelab/queue', 'night', '1'], null), { done: 3, total: 5, unit: 'drafts' });
});

test('metrics: a coach-bench result file', () => {
  const d = tmp('cb');
  const s = (verdict: string, latencyMs: number, extra: object = {}) => ({ verdict, latencyMs, score: 0, answer: null, canonical: null, text: '', ...extra });
  fs.writeFileSync(path.join(d, 'r.json'), JSON.stringify({ bench: 2, cases: [
    { id: 'a', samples: [s('acceptable', 10000, { stated: { confidence: 'high' } }), s('unacceptable', 20000), s('error', 1, { attempts: 3 })] },
    { id: 'b', samples: [s('missing', 6000), s('other', 8000, { attempts: 2 })] },
  ] }));
  const m = coachbench(d, ['*.json']);
  assert.deepEqual([m.calls, m.answers, m.transport_errors, m.format_failures, m.format_failure_rate, m.retries, m.median_latency_s, m.stated_confidence, m.blunders, m.mean_score],
    [5, 4, 1, 1, 0.25, 3, 10, 1, 1, 0]);
});

test('progress: rate per hour over the last 30 minutes, and the ETA', () => {
  const t0 = Date.parse('2026-10-03T10:00:00Z');
  const s = Array.from({ length: 13 }, (_, i) => ({ at: t0 + i * 5 * 60_000, done: i < 6 ? i * 10 : 50 + (i - 5) * 20 }));
  const r = rateAndEta(s, 1000, s.at(-1)!.at);
  assert.equal(r.ratePerHour, 240);                         // the last 30 min: 120 in 0.5 h
  assert.equal(new Date(r.eta!).toISOString(), new Date(s.at(-1)!.at + (1000 - 190) / 240 * 3600_000).toISOString());
  assert.deepEqual(rateAndEta(s.slice(0, 1), 10, t0), { ratePerHour: null, eta: null });
});

// ------------------------------------------------------------------ status.json and the public copy

const DOC: StatusDoc = {
  schema: 1, updated: '2026-10-03T10:55:00-04:00', paused: false,
  host: { load1: 6.2, memUsedGb: 14.1, memTotalGb: 30, swapUsedMb: 0, pressure: 1.5, cpus: 16, budgetGb: 23 },
  running: [{ id: 'J003', title: 'Search AI vs /home/justin-a/code/mtg-table on desk.local (Lightning Bolt)', cpu: 'heavy', phase: 'commands 1/1', started: '2026-10-03T10:34:23-04:00', elapsed: 1234,
    done: 212, total: 400, unit: 'games', ratePerHour: 310, eta: '2026-10-03T12:40:00-04:00', workers: 6, workersMax: 7, errors: 0, paused: false, dataUpdated: '2026-10-03T10:54:00-04:00',
    pressureEvents: [{ at: '2026-10-03T10:40:00-04:00', kind: 'drop', workers: 6, pressure: 12.3, why: 'some avg10 12% /proc' } as never], detail: 'lab-J003-run1 /home/justin-a' }],
  queue: [{ id: 'J004', title: 'Omega evolve', cpu: 'heavy', est: '~3 h' }],
  waiting: [{ id: 'J006', title: 'Coach', reason: 'pilot done; needs a check', est: '', detail: 'card Black Lotus in /tmp/x' }, { id: 'J007', title: 'x', reason: 'deck: 4 Island', est: '' }],
  finished: [{ id: 'J002', title: 'PR #27 coach-bench comparison', status: 'done', finished: '2026-10-03T09:53:39-07:00', headline: 'Lightning Bolt was great', numbers: { 'a_win_rate': 0.41, 'bad key!': 3, games: 400, 'control.games': 20 }, detail: 'from /home/x' }],
  runner: { commit: 'abc1234', started: '2026-10-03T10:00:00-04:00', dryRun: false },
};

test('public status: an allowlist — ids, cleaned titles, numbers, timestamps, fixed words; nothing else', () => {
  const p = sanitise(DOC);
  const text = JSON.stringify(p);
  for (const bad of ['/home', 'justin-a', 'desk.local', 'lab-J003', 'Black Lotus', 'Island', 'why', 'detail', 'runner', 'abc1234', 'bad key', 'great', 'proc']) assert.ok(!text.includes(bad), bad);
  assert.equal(p.running[0]?.title, 'Search AI vs … on … (Lightning Bolt)');
  assert.equal(p.waiting[0]?.reason, 'pilot done; needs a check');
  assert.equal(p.waiting[1]?.reason, 'waiting');
  assert.deepEqual(p.finished[0]?.numbers, { a_win_rate: 0.41, games: 400, 'control.games': 20 });
  assert.equal(p.finished[0]?.headline, 'a_win_rate 0.41 · games 400 · control.games 20');
  assert.deepEqual(p.running[0]?.pressureEvents, [{ at: '2026-10-03T10:40:00-04:00', kind: 'drop', workers: 6, pressure: 12.3 }]);
  assert.equal(p.host.cpus, 16);
  assert.equal(p.schema, 1);
  // Whatever arrives, the shape is the allowlist's.
  const hostile = sanitise({ ...DOC, running: [{ ...DOC.running[0]!, id: '../../etc', phase: 'rm -rf', unit: 'cards', eta: 'soon' }], extra: 'x' } as unknown as StatusDoc);
  assert.deepEqual(hostile.running, []);
  assert.ok(!('extra' in hostile));
  const h2 = sanitise({ ...DOC, running: [{ ...DOC.running[0]!, phase: 'rm -rf', unit: 'cards', eta: 'soon' }] });
  assert.deepEqual([h2.running[0]?.phase, h2.running[0]?.unit, h2.running[0]?.eta], ['commands', null, null]);
  assert.equal(cleanTitle('Run http://x.y/z and 10.0.0.2 and a@b.c'), 'Run … and … and …');
  assert.match(isoLocal(Date.parse('2026-10-03T14:55:00Z'), -240), /^2026-10-03T10:55:00-04:00$/);
});

const LADDER = {
  schema: 'mtg-table/ai-ladder', version: 1, generatedAt: '2026-10-03T12:00:00.000Z', anchor: { name: 'forge-default', rating: 1500 }, scale: 'elo', ci: 'bootstrap:200',
  totals: { games: 400, decisive: 390, draws: 10, hosts: ['justins-pc.local'], first: '2026-10-01T00:00:00Z', last: '2026-10-03T11:00:00Z' },
  players: [
    { name: 'search-ms3000', kind: 'search', params: { deck: '/home/justin-a/code/mtg-table/decks/x.dck', ms: 3000 }, hash: 'ab12cd34', anchor: false, registered: true, available: true, unavailable: null,
      rating: 1562.3, lo: 1520.1, hi: 1601.9, rated: true, games: 200, wins: 118, losses: 82, draws: 4, vsAnchor: { wins: 60, losses: 40, rate: 0.6, lo: 0.502, hi: 0.691 } },
    { name: '/etc/passwd', kind: 'x', rating: 1 },
    { name: 'old@1a2b3c4d', kind: 'Search Config!', params: {}, unavailable: 'kind removed: see /home/x', rating: 1490, lo: 1400, hi: 1580, rated: true, games: 20, wins: 9, losses: 11, draws: 0, vsAnchor: null },
  ],
  history: [{ at: 'x', run: 'justins-pc:run1', games: 1, ratings: {} }],
  sprt: [{ v: 1, at: '2026-10-03T10:00:00Z', id: 'justins-pc-17', host: 'justins-pc', a: 'search-ms3000', b: 'forge-default', ah: 'h', bh: 'h', elo0: 0, elo1: 30, alpha: 0.05, beta: 0.05, result: 'H1', llr: 3.1, lower: -2.9, upper: 2.9, games: 160, pairs: 40, score: 0.58, purpose: 'sprt' }],
  tune: [{ at: '2026-10-02T10:00:00Z', id: 't1', host: 'justins-pc', base: 'search-ms3000', vary: { ms: [1000, 3000] }, pool: ['forge-default'], eta: 0.5, games: 300, winner: { label: 'ms=1000 /tmp/x', params: { ms: 1000 }, hash: 'h', registeredAs: 'search-ms1000' }, rounds: [{ round: 1, blocks: 4, standings: [{ label: 'ms=1000', wins: 30, losses: 20, score: 0.6 }, { label: '/etc/x', wins: 1, losses: 1, score: 0.5 }] }] }],
  league: { best: 'search-ms3000', pool: ['forge-default', '../x'], promoted: [{ name: 'search-ms3000', at: '2026-10-02T12:00:00Z', reason: 'SPRT H1 vs best; see /home/justin-a/x on desk.local' }] },
  set: 'tools/ai-bench/pairs-confirm.txt',
  experiments: [{ at: 'x', id: 'e1', cmd: 'tools/ai-ladder.sh run --hosts justins-pc', purpose: 'dev', status: 'finished', sha: 'abc', dirty: false, set: 'x', hypothesis: 'free text', games: 3 }],
};

test('public ladder.json: an allowlist of names, kinds, ratings, records and outcomes', () => {
  const p = sanitiseLadder(LADDER)!;
  const text = JSON.stringify(p);
  for (const bad of ['/home', 'justin', 'passwd', 'hosts', 'params', 'hash', 'history', 'experiments', 'tools/', 'free text', 'desk.local', 'blocks', '/tmp', '/etc', 'unavailable', '../x', '"id"']) assert.ok(!text.includes(bad), bad);
  assert.equal(p.set, 'pairs-confirm.txt');
  assert.deepEqual(p.players.map((x) => [x.name, x.kind, x.rating, x.lo, x.hi]), [['search-ms3000', 'search', 1562.3, 1520.1, 1601.9], ['old@1a2b3c4d', '?', 1490, 1400, 1580]]);
  assert.deepEqual(p.players[0]?.vsAnchor, { wins: 60, losses: 40, rate: 0.6, lo: 0.502, hi: 0.691 });
  assert.deepEqual(p.sprt[0], { at: '2026-10-03T10:00:00Z', a: 'search-ms3000', b: 'forge-default', elo0: 0, elo1: 30, alpha: 0.05, beta: 0.05, result: 'H1', llr: 3.1, lower: -2.9, upper: 2.9, games: 160, pairs: 40, score: 0.58, purpose: 'sprt' });
  assert.deepEqual(p.tune[0], { at: '2026-10-02T10:00:00Z', base: 'search-ms3000', vary: { ms: [1000, 3000] }, pool: ['forge-default'], eta: 0.5, games: 300,
    winner: { label: null, registeredAs: 'search-ms1000' }, rounds: [{ round: 1, standings: [{ label: 'ms=1000', wins: 30, losses: 20, score: 0.6 }] }] });
  assert.deepEqual(p.league, { best: 'search-ms3000', pool: ['forge-default'], promoted: [{ name: 'search-ms3000', at: '2026-10-02T12:00:00Z', reason: 'SPRT H1 vs best; see … on …' }] });
  // Exactly ForgeCoach's LADDER_FIELDS (src/lab/ladder.ts on c/ladder-page): every published path is one of them.
  const FIELDS = new Set(['schema', 'version', 'generatedAt', 'anchor.name', 'anchor.rating', 'scale', 'ci', 'set', 'totals.games', 'totals.decisive', 'totals.draws', 'totals.first', 'totals.last',
    ...['name', 'kind', 'anchor', 'registered', 'available', 'rating', 'lo', 'hi', 'rated', 'games', 'wins', 'losses', 'draws', 'vsAnchor', 'vsAnchor.wins', 'vsAnchor.losses', 'vsAnchor.rate', 'vsAnchor.lo', 'vsAnchor.hi'].map((k) => `players[].${k}`),
    ...['at', 'a', 'b', 'elo0', 'elo1', 'alpha', 'beta', 'result', 'llr', 'lower', 'upper', 'games', 'pairs', 'score', 'purpose'].map((k) => `sprt[].${k}`),
    ...['at', 'base', 'vary', 'pool', 'eta', 'games', 'winner', 'winner.label', 'winner.registeredAs', 'rounds', 'rounds[].round', 'rounds[].standings', 'rounds[].standings[].label', 'rounds[].standings[].wins', 'rounds[].standings[].losses', 'rounds[].standings[].score'].map((k) => `tune[].${k}`),
    'anchor', 'totals', 'players', 'sprt', 'tune', 'league', 'league.best', 'league.pool', 'league.promoted', 'league.promoted[].name', 'league.promoted[].at', 'league.promoted[].reason']);
  const paths = (v: unknown, at: string, out: Set<string>): void => {
    if (Array.isArray(v)) { if (v.some((x) => x && typeof x === 'object')) for (const x of v) paths(x, `${at}[]`, out); return; }
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { const p2 = at ? `${at}.${k}` : k; if (at.endsWith('.vary')) continue; out.add(p2); paths(x, p2, out); }
  };
  const seen = new Set<string>();
  paths(p, '', seen);
  for (const s2 of seen) assert.ok(FIELDS.has(s2), `published ${s2}, which LADDER_FIELDS does not list`);
  assert.deepEqual(p.totals, { games: 400, decisive: 390, draws: 10, first: '2026-10-01T00:00:00Z', last: '2026-10-03T11:00:00Z' });
  assert.equal(sanitiseLadder({ ...LADDER, version: 2 }), null);
  assert.equal(sanitiseLadder('nope'), null);
});

test('sys parsers: meminfo, physical cores, sockets on the bridge port', () => {
  const mi = readMeminfo('MemTotal:       31457280 kB\nMemAvailable:   15728640 kB\nSwapTotal:       8388608 kB\nSwapFree:        8388608 kB\n');
  assert.deepEqual(mi, { totalGb: 30, availGb: 15, swapTotalMb: 8192, swapFreeMb: 8192 });
  const ci = Array.from({ length: 16 }, (_, i) => `processor\t: ${i}\nphysical id\t: 0\ncore id\t\t: ${i % 8}\n`).join('\n');
  assert.equal(physicalCores(ci, 16), 8);
  assert.equal(physicalCores('', 16), 8);
  const tcp = '  sl  local_address rem_address   st\n   0: 0100007F:21C2 00000000:0000 0A\n   1: 0100007F:21C2 0100007F:D3A0 01\n   2: 0100007F:21C3 0100007F:D3A1 01\n';
  assert.equal(establishedOn([tcp], 8642), 1);
  assert.equal(establishedOn([tcp], 8643), 1);
  assert.equal(establishedOn([tcp], 8644), 0);
});

// ------------------------------------------------------------------ the control file

test('control file: absent, torn or odd reads as no control; the cached reader re-reads after its interval', () => {
  const d = tmp('ctl');
  const f = path.join(d, 'c.json');
  assert.deepEqual(readControl(f), { paused: false, maxWorkers: null });
  assert.deepEqual(readControl(undefined), { paused: false, maxWorkers: null });
  assert.deepEqual(parseControl('{"paused":tr'), { paused: false, maxWorkers: null });
  assert.deepEqual(parseControl('{"paused":"yes","maxWorkers":0}'), { paused: false, maxWorkers: 1 });
  writeControl(f, { paused: true, maxWorkers: 3 });
  let t = 0;
  const rd = controlReader(f, 1000, () => t);
  assert.deepEqual(rd(), { paused: true, maxWorkers: 3 });
  writeControl(f, { paused: false, maxWorkers: 5 });
  assert.deepEqual(rd(), { paused: true, maxWorkers: 3 });
  t = 1000;
  assert.deepEqual(rd(), { paused: false, maxWorkers: 5 });
});

// ------------------------------------------------------------------ the runner, end to end

const git = (cwd: string, ...a: string[]): string => {
  const r = spawnSync('git', ['-C', cwd, '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'init.defaultBranch=main', ...a], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};

interface World { root: string; mtg: string; fc: string; seed: string; cfg: RunnerConfig; sys: FakeSys }

class FakeSys implements Sys {
  t = Date.parse('2026-10-03T14:00:00Z');
  /** 'run': a step runs at once (bash); 'hold': its unit stays active until release(). */
  mode: 'run' | 'hold' = 'run';
  held = new Map<string, UnitSpec>();
  states = new Map<string, UnitState>();
  started: UnitSpec[] = [];
  stopped: string[] = [];
  some10 = 0;
  isPlaying = false;
  lines: string[] = [];
  now(): number { return this.t; }
  run(argv: string[], o: { cwd?: string; timeoutMs?: number; env?: Record<string, string>; input?: string } = {}) {
    const r = spawnSync(argv[0] as string, argv.slice(1), { cwd: o.cwd, encoding: 'utf8', env: { ...process.env, ...(o.env ?? {}), GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } });
    return { code: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
  }
  machine() { return { memTotalGb: 30, physicalCores: 8, threads: 16 }; }
  host(): HostSample { return { at: this.t, load1: 1, memTotalGb: 30, memUsedGb: 10, swapUsedMb: 0, some10: this.some10, pswpin: 0 }; }
  exec(u: UnitSpec): void {
    spawnSync('bash', [`${u.script}.wrap`], { cwd: u.cwd, env: { ...process.env, ...u.env }, stdio: ['ignore', fs.openSync(u.log, 'a'), fs.openSync(u.log, 'a')] });
  }
  startUnit(u: UnitSpec) {
    this.started.push(u);
    if (this.mode === 'hold') { this.held.set(u.unit, u); this.states.set(u.unit, 'active'); } else this.exec(u);
    return { code: 0, stdout: '', stderr: '' };
  }
  /** The held unit ends: its script runs (ok) or it dies with no exit code (killed). */
  release(unit: string, how: 'ok' | 'killed'): void {
    const u = this.held.get(unit);
    if (u && how === 'ok') this.exec(u);
    this.held.delete(unit);
    this.states.set(unit, 'inactive');
  }
  stopUnit(unit: string) { this.stopped.push(unit); this.release(unit, 'killed'); return { code: 0, stdout: '', stderr: '' }; }
  unitState(unit: string): UnitState { return this.states.get(unit) ?? 'inactive'; }
  unitMemoryGb(): number | null { return 2; }
  unitJavaPeaksGb(): number[] { return [1.6, 1.9]; }
  playing(): boolean { return this.isPlaying; }
  log(s: string): void { this.lines.push(s); }
}

/** origin repos: mtg-table (main with stub build scripts, pc-jobs, pc-results) and ForgeCoach (empty, for lab-status). */
function world(jobs: Record<string, string>): World {
  const root = tmp('world');
  const mtg = path.join(root, 'origin-mtg-table.git');
  const fc = path.join(root, 'origin-forgecoach.git');
  const seed = path.join(root, 'seed');
  git(root, 'init', '--quiet', '--bare', mtg);
  git(root, 'init', '--quiet', '--bare', fc);
  git(root, 'init', '--quiet', seed);
  fs.mkdirSync(path.join(seed, 'bridge'), { recursive: true });
  fs.mkdirSync(path.join(seed, 'tools'), { recursive: true });
  fs.writeFileSync(path.join(seed, 'bridge/build.sh'), '#!/bin/bash\necho build OK\n', { mode: 0o755 });
  fs.writeFileSync(path.join(seed, 'tools/make-forge-home.sh'), '#!/bin/bash\nmkdir -p forge-home/res\n', { mode: 0o755 });
  fs.writeFileSync(path.join(seed, '.gitignore'), 'var/\nforge-home/\n');
  git(seed, 'add', '-A');
  git(seed, 'commit', '--quiet', '-m', 'main');
  git(seed, 'push', '--quiet', mtg, 'HEAD:refs/heads/main');
  git(seed, 'checkout', '--quiet', '--orphan', 'pc-jobs');
  git(seed, 'rm', '-rq', '--cached', '.');
  for (const f of fs.readdirSync(seed)) if (f !== '.git') fs.rmSync(path.join(seed, f), { recursive: true });
  fs.mkdirSync(path.join(seed, 'jobs'));
  for (const [name, text] of Object.entries(jobs)) fs.writeFileSync(path.join(seed, 'jobs', name), text);
  git(seed, 'add', '-A');
  git(seed, 'commit', '--quiet', '-m', 'jobs');
  git(seed, 'push', '--quiet', mtg, 'HEAD:refs/heads/pc-jobs');
  git(seed, 'checkout', '--quiet', '--orphan', 'pc-results');
  git(seed, 'rm', '-rq', '--cached', '.');
  fs.rmSync(path.join(seed, 'jobs'), { recursive: true });
  fs.writeFileSync(path.join(seed, 'HEARTBEAT.md'), '# Heartbeat\n\n- time: then\n- message for the cloud session: hello from the PC\n');
  git(seed, 'add', '-A');
  git(seed, 'commit', '--quiet', '-m', 'results');
  git(seed, 'push', '--quiet', mtg, 'HEAD:refs/heads/pc-results');
  const sys = new FakeSys();
  const cfg: RunnerConfig = {
    ...DEFAULT_CONFIG, runnerDir: REPO, stateDir: path.join(root, 'state'), labRoot: path.join(root, 'lab'), homeRepos: {},
    urls: { 'mtg-table': mtg, ForgeCoach: fc }, commit: 'test123', metricsEveryMs: 0,
  };
  return { root, mtg, fc, seed, cfg, sys };
}

const show = (repo: string, spec: string): string => {
  const r = spawnSync('git', ['-C', repo, 'show', spec], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout : '';
};

test('runner: a new-format job runs pilot, checks, sized commands, final checks and collect, and publishes', () => {
  const w = world({ 'J010-test.md': NEW_JOB });
  const ladderFile = path.join(w.root, 'ladder.json');
  fs.writeFileSync(ladderFile, JSON.stringify(LADDER));
  const r = new Runner({ ...w.cfg, ladderFile }, w.sys);
  r.reconcile();
  r.tick();
  const run = r.runs.get('J010')!;
  assert.equal(run.outcome?.state, 'done', w.sys.lines.join('\n'));
  assert.deepEqual(w.sys.started.map((u) => u.unit), ['lab-J010-prepare', 'lab-J010-pilot1', 'lab-J010-run1']);
  // Steps that end at once are never sampled (the held tests measure the peak): sized from the declared 1.5 GB.
  assert.equal(run.workers, 3);
  assert.match(run.sizing?.detail ?? '', /min\(cores 7, memory 11, max_workers 3\); peak 1\.50 GB per worker \(declared\)/);
  assert.equal(w.sys.started[2]?.env.JOBS, '3');
  assert.deepEqual(run.numbers, { n: 3, 'final.w': 3 });
  // pc-results: STATUS, outputs, status.json, HEARTBEAT.md with the PC's message kept.
  const status = parseStatus(show(w.mtg, 'pc-results:results/J010/STATUS'))!;
  assert.equal(status.state, 'done');
  assert.match(status.fields.runner ?? '', /test123/);
  assert.match(status.fields['mtg-table'] ?? '', /^[0-9a-f]{7}/);
  assert.match(status.fields.workers ?? '', /^3 \(sized 3/);
  assert.equal(JSON.parse(show(w.mtg, 'pc-results:results/J010/w.json')).w, 3);
  assert.match(show(w.mtg, 'pc-results:results/J010/pilot-checks.txt'), /^PASS {2}n == 3/);
  assert.match(show(w.mtg, 'pc-results:results/J010/checks.txt'), /^PASS {2}final.w == final.p/);
  assert.match(show(w.mtg, 'pc-results:results/J010/run1.log'), /lab-J010-run1/);
  const hb = show(w.mtg, 'pc-results:HEARTBEAT.md');
  assert.match(hb, /last finished: J010 done/);
  assert.match(hb, /## Messages[\s\S]*hello from the PC/);
  const doc = JSON.parse(show(w.mtg, 'pc-results:status.json')) as StatusDoc;
  assert.equal(doc.finished[0]?.id, 'J010');
  assert.deepEqual(doc.finished[0]?.numbers, { n: 3, 'final.w': 3 });
  // The public copy: one parentless commit on lab-status holding status.json only, sanitised.
  assert.equal(git(w.fc, 'ls-tree', '--name-only', 'lab-status'), 'ladder.json\nstatus.json');
  assert.deepEqual(JSON.parse(show(w.fc, 'lab-status:ladder.json')), sanitiseLadder(LADDER));
  assert.equal(git(w.fc, 'rev-list', '--count', 'lab-status'), '1');
  const pub = JSON.parse(show(w.fc, 'lab-status:status.json')) as StatusDoc;
  assert.deepEqual(pub, sanitise(pub));
  assert.ok(!JSON.stringify(pub).includes(w.root));
  // A second publish replaces the commit rather than adding one.
  w.sys.t += 10 * 60_000;
  r.tick();
  assert.equal(git(w.fc, 'rev-list', '--count', 'lab-status'), '1');
  // A new ladder.json is published at the next tick, without waiting for the interval.
  fs.writeFileSync(ladderFile, JSON.stringify({ ...LADDER, generatedAt: '2026-10-03T13:00:00.000Z' }));
  fs.utimesSync(ladderFile, new Date(), new Date(Date.now() + 5000));
  w.sys.t += 60_000;
  r.tick();
  assert.equal(JSON.parse(show(w.fc, 'lab-status:ladder.json')).generatedAt, '2026-10-03T13:00:00.000Z');
  // Justin's checkout paths in a job are rewritten to the lab's.
  r.cfg.homeRepos['mtg-table'] = '/home/justin-a/code/mtg-table';
  assert.equal(r.substitute('cd /home/justin-a/code/mtg-table && ls ~/code/mtg-table/var /home/justin-a/code/mtg-table-main', run), `cd ${r.checkout('mtg-table', 'heavy')} && ls ${r.checkout('mtg-table', 'heavy')}/var /home/justin-a/code/mtg-table-main`);
});

const OLD_JOB = `id: J011
title: An old free-text job
cpu: light
repos: mtg-table@main
est: 1 min

## Pilot
\`\`\`bash
echo pilot > var-pilot.txt
\`\`\`
Checks:
- It printed pilot.

## Commands
\`\`\`bash
echo commands > var-commands.txt
\`\`\`
`;

test('runner: an old free-text job stops after its pilot (needs a check), and runs its commands once approved', () => {
  const w = world({ 'J011-old.md': OLD_JOB });
  const r = new Runner(w.cfg, w.sys);
  r.reconcile();
  r.tick();
  assert.equal(r.runs.get('J011')?.outcome?.state, 'waiting');
  const s = parseStatus(show(w.mtg, 'pc-results:results/J011/STATUS'))!;
  assert.equal(s.fields.needs, 'check');
  assert.match(s.fields.reason ?? '', /needs a human\/Claude check/);
  assert.deepEqual(w.sys.started.map((u) => u.unit), ['lab-J011-prepare', 'lab-J011-pilot1']);
  // Nothing more happens on its own.
  w.sys.t += 120_000;
  r.tick();
  assert.equal(w.sys.started.length, 2);
  // The PC session approves (what `tools/runner.sh approve J011` writes).
  delete s.fields.needs;
  s.fields.approved = '2026-10-03T10:00:00-04:00 by claude';
  fs.writeFileSync(path.join(w.seed, 'STATUS'), formatStatus(s));
  git(w.seed, 'fetch', '--quiet', w.mtg, 'pc-results');
  git(w.seed, 'reset', '--quiet', '--hard', 'FETCH_HEAD');
  fs.mkdirSync(path.join(w.seed, 'results/J011'), { recursive: true });
  fs.writeFileSync(path.join(w.seed, 'results/J011/STATUS'), formatStatus(s));
  git(w.seed, 'add', '-A');
  git(w.seed, 'commit', '--quiet', '-m', 'approve');
  git(w.seed, 'push', '--quiet', w.mtg, 'HEAD:refs/heads/pc-results');
  w.sys.t += 120_000;
  r.tick();
  assert.equal(r.runs.get('J011')?.outcome?.state, 'done', w.sys.lines.join('\n'));
  assert.deepEqual(w.sys.started.slice(2).map((u) => u.unit), ['lab-J011-prepare', 'lab-J011-run1']);
  assert.match(show(w.mtg, 'pc-results:results/J011/STATUS'), /^done\n[\s\S]*approved: pilot approved/);
});

test('runner: a failing pilot check fails the job and never runs the commands', () => {
  const w = world({ 'J012-bad.md': NEW_JOB.replace('id: J010', 'id: J012').replace('check: n == 3', 'check: n == 4') });
  const r = new Runner(w.cfg, w.sys);
  r.reconcile();
  r.tick();
  const run = r.runs.get('J012')!;
  assert.equal(run.outcome?.state, 'failed');
  assert.match(run.outcome?.reason ?? '', /^pilot: n == 4 \(n = 3/);
  assert.ok(!w.sys.started.some((u) => u.unit === 'lab-J012-run1'));
  assert.match(show(w.mtg, 'pc-results:results/J012/pilot-checks.txt'), /^FAIL {2}n == 4/);
});

test('runner: a failing command fails the job with its exit code and the log tail', () => {
  const w = world({ 'J013-x.md': NEW_JOB.replace('id: J010', 'id: J013').replace('echo "{\\"w\\"', 'echo nope; exit 7; echo "{\\"w\\"') });
  const r = new Runner(w.cfg, w.sys);
  r.reconcile();
  r.tick();
  assert.equal(r.runs.get('J013')?.outcome?.reason, 'step run1 exited 7');
  assert.match(show(w.mtg, 'pc-results:results/J013/failure.txt'), /exited 7[\s\S]*nope/);
});

test('runner: while a step runs, an abort line stops it (TERM) and fails the job', () => {
  const w = world({ 'J014-x.md': NEW_JOB.replace('id: J010', 'id: J014').replace('abort: n > 100', 'abort: n >= 3 and workers >= 1') });
  const r = new Runner(w.cfg, w.sys);
  r.reconcile();
  w.sys.mode = 'run';
  r.tick();                                  // prepare and pilot ran; the abort fires only while a step runs
  assert.equal(r.runs.get('J014')?.outcome?.state, 'done');
  const w2 = world({ 'J015-x.md': NEW_JOB.replace('id: J010', 'id: J015').replace('abort: n > 100', 'abort: n >= 3') });
  const r2 = new Runner(w2.cfg, w2.sys);
  r2.reconcile();
  w2.sys.mode = 'hold';
  r2.tick();                                 // prepare held
  w2.sys.release('lab-J015-prepare', 'ok');
  r2.tick();                                 // pilot1 held: the pilot's own files are not there yet
  w2.sys.release('lab-J015-pilot1', 'ok');
  r2.tick();                                 // checks pass; run1 held; n == 3 now: abort
  w2.sys.t += 61_000;
  r2.tick();
  assert.deepEqual(w2.sys.stopped, ['lab-J015-run1']);
  r2.tick();
  assert.equal(r2.runs.get('J015')?.outcome?.state, 'failed');
  assert.match(r2.runs.get('J015')?.outcome?.reason ?? '', /^aborted: n >= 3 \(n = 3/);
});

test('runner: memory pressure drops workers through the control file, then stops; the retry has fewer workers and skips the pilot', () => {
  const w = world({ 'J016-x.md': NEW_JOB.replace('id: J010', 'id: J016').replace('max_workers: 3', 'max_workers: 4').replace('resumable: yes', 'resumable: yes') });
  const r = new Runner({ ...w.cfg, backoff: { ...w.cfg.backoff, dropCooldownS: 0 } }, w.sys);
  r.reconcile();
  w.sys.mode = 'hold';
  r.tick();
  w.sys.release('lab-J016-prepare', 'ok');
  r.tick();
  w.sys.release('lab-J016-pilot1', 'ok');
  r.tick();
  const run = r.runs.get('J016')!;
  assert.equal(run.steps[run.stepIndex]?.name, 'run1');
  // Sized from the pilot's measured peak (the JVMs' VmHWM, 1.9 GB): min(4, cores 7, floor(21 / 1.9 x 0.85) = 9).
  assert.equal(run.peakRssGb, 1.9);
  assert.match(run.sizing?.detail ?? '', /peak 1\.90 GB per worker \(measured\)/);
  assert.equal(run.workers, 4);
  const ctl = (): unknown => JSON.parse(fs.readFileSync(r.controlFile('J016'), 'utf8'));
  assert.deepEqual(ctl(), { paused: false, maxWorkers: 4 });
  w.sys.some10 = 15;
  for (let i = 0; i < 4; i++) { w.sys.t += 10_000; r.tick(); }
  assert.deepEqual(ctl(), { paused: false, maxWorkers: 2 });
  assert.deepEqual(run.events.map((e) => [e.kind, e.workers]), [['drop', 3], ['drop', 2]]);
  w.sys.some10 = 50;
  for (let i = 0; i < 20 && !run.outcome; i++) { w.sys.t += 10_000; r.tick(); }
  assert.ok(w.sys.stopped.includes('lab-J016-run1'));
  assert.equal(run.outcome?.state, 'waiting');
  assert.match(run.outcome?.reason ?? '', /^memory: /);
  const s = parseStatus(show(w.mtg, 'pc-results:results/J016/STATUS'))!;
  assert.ok(Number(s.fields.workers_cap) < 4);
  assert.ok(s.fields['pressure-1']?.includes('drop to 3'));
  // Not before retry_after; then again, capped, without the pilot.
  w.sys.some10 = 0;
  w.sys.t += 5 * 60_000;
  r.tick();
  assert.equal(r.runs.get('J016')?.outcome?.state, 'waiting');
  w.sys.t += 15 * 60_000;
  w.sys.mode = 'run';
  r.tick();
  const again = r.runs.get('J016')!;
  assert.equal(again.outcome?.state, 'done', w.sys.lines.join('\n'));
  assert.ok(!again.steps.some((x) => x.phase === 'pilot'));
  assert.equal(again.workers, Number(s.fields.workers_cap));
  assert.match(show(w.mtg, 'pc-results:results/J016/STATUS'), /resumed: .*retry after "memory/);
});

test('runner: Justin at the table holds a running heavy job and starts none', () => {
  const w = world({ 'J017-x.md': NEW_JOB.replace('id: J010', 'id: J017'), 'J018-y.md': NEW_JOB.replace('id: J010', 'id: J018') });
  const r = new Runner(w.cfg, w.sys);
  r.reconcile();
  w.sys.mode = 'hold';
  r.tick();
  w.sys.release('lab-J017-prepare', 'ok');
  r.tick();
  w.sys.isPlaying = true;
  r.tick();
  assert.deepEqual(JSON.parse(fs.readFileSync(r.controlFile('J017'), 'utf8')).paused, true);
  assert.equal(r.runs.get('J017')?.events.at(-1)?.kind, 'playing');
  w.sys.isPlaying = false;
  r.tick();
  assert.equal(JSON.parse(fs.readFileSync(r.controlFile('J017'), 'utf8')).paused, false);
  assert.equal(r.runs.has('J018'), false);   // one heavy job at a time
});

test('runner: a restart adopts a running unit, resumes a resumable step, restarts a non-resumable job (clean: moved aside)', () => {
  const NONRES = NEW_JOB.replace('id: J010', 'id: J021').replace('resumable: yes', 'resumable: no\nclean: var/out*');
  const w = world({ 'J020-x.md': NEW_JOB.replace('id: J010', 'id: J020'), 'J021-y.md': NONRES.replace('cpu: heavy', 'cpu: light') });
  let r = new Runner(w.cfg, w.sys);
  r.reconcile();
  w.sys.mode = 'hold';
  r.tick();
  for (const id of ['J020', 'J021']) w.sys.release(`lab-${id}-prepare`, 'ok');
  r.tick();
  for (const id of ['J020', 'J021']) w.sys.release(`lab-${id}-pilot1`, 'ok');
  r.tick();
  assert.equal(r.runs.get('J020')?.unit, 'lab-J020-run1');
  assert.equal(r.runs.get('J021')?.unit, 'lab-J021-run1');
  // 1. the runner restarts while both units run: both adopted.
  r = new Runner(w.cfg, w.sys);
  r.reconcile();
  assert.equal(r.runs.get('J020')?.restarts.at(-1)?.how, 'adopted');
  assert.equal(r.runs.get('J021')?.restarts.at(-1)?.how, 'adopted');
  // 2. the machine went down with them (no exit code, no unit): resumable resumes, the other restarts.
  w.sys.held.clear();
  w.sys.states.clear();
  r = new Runner(w.cfg, w.sys);
  r.reconcile();
  const a = r.runs.get('J020')!, b = r.runs.get('J021')!;
  assert.equal(a.restarts.at(-1)?.how, 'resumed');
  assert.equal(a.steps[a.stepIndex]?.name, 'run1');
  assert.equal(b.restarts.at(-1)?.how, 'restarted');
  assert.equal(b.stepIndex, 0);
  assert.match(b.restarts.at(-1)?.why ?? '', /moved aside: var\/out.jsonl/);
  const lab = r.checkout('mtg-table', 'light');
  assert.ok(fs.readdirSync(path.join(lab, 'var')).some((f) => /^\.restart-.*-out\.jsonl$/.test(f)));
  w.sys.mode = 'run';
  r.tick();
  assert.equal(r.runs.get('J020')?.outcome?.state, 'done', w.sys.lines.join('\n'));
  assert.equal(r.runs.get('J021')?.outcome?.state, 'done', w.sys.lines.join('\n'));
  assert.match(show(w.mtg, 'pc-results:results/J021/STATUS'), /restarted: .*not resumable/);
  assert.match(show(w.mtg, 'pc-results:results/J020/STATUS'), /resumed: .*skips what is done/);
});

test('runner: someone else\'s running job (the PC session\'s own unit) blocks heavy work and shows in status.json', () => {
  const w = world({ 'J003-x.md': NEW_JOB.replace('id: J010', 'id: J003'), 'J004-y.md': NEW_JOB.replace('id: J010', 'id: J004') });
  fs.mkdirSync(path.join(w.seed, 'results/J003'), { recursive: true });
  git(w.seed, 'fetch', '--quiet', w.mtg, 'pc-results');
  git(w.seed, 'reset', '--quiet', '--hard', 'FETCH_HEAD');
  fs.mkdirSync(path.join(w.seed, 'results/J003'), { recursive: true });
  fs.writeFileSync(path.join(w.seed, 'results/J003/STATUS'), 'running\nstarted: 2026-10-03T10:34:23-04:00\nphase: full (systemd unit forgecoach-j003)\n');
  git(w.seed, 'add', '-A');
  git(w.seed, 'commit', '--quiet', '-m', 'J003 by hand');
  git(w.seed, 'push', '--quiet', w.mtg, 'HEAD:refs/heads/pc-results');
  const r = new Runner(w.cfg, w.sys);
  r.reconcile();
  r.tick();
  assert.equal(r.runs.size, 0);
  const doc = r.statusDoc();
  assert.deepEqual(doc.running.map((x) => x.id), ['J003']);
  assert.deepEqual(doc.queue.map((x) => x.id), ['J004']);
  assert.ok(Number.isFinite(Date.parse(doc.updated)) && /[+-]\d\d:\d\d$/.test(doc.updated));
});

// ------------------------------------------------------------------ the pools obey the control file

function fakeJava(dir: string): string {
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin, { recursive: true });
  // A CubeLab `play` worker: ready, then one match per stdin line, ~60 ms each; it records itself alive.
  fs.writeFileSync(path.join(bin, 'java'), `#!/usr/bin/env node
const fs = require('fs'); const path = require('path');
const alive = process.env.FAKE_ALIVE; const me = path.join(alive, String(process.pid));
fs.writeFileSync(me, ''); const bye = () => { try { fs.rmSync(me); } catch {} };
process.on('exit', bye);
process.stdout.write('CUBELAB {"type":"ready"}\\n');
let buf = '';
const queue = []; let busy = false;
const next = () => { if (busy || !queue.length) return; const j = queue.shift();
  if (j.type === 'quit') { bye(); process.exit(0); }
  busy = true; setTimeout(() => { fs.appendFileSync(process.env.FAKE_LOG, j.id + '\\n');
    process.stdout.write('CUBELAB ' + JSON.stringify({ type: 'match', id: j.id, forge: [], games: [] }) + '\\n'); busy = false; next(); }, 60); };
process.stdin.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); if (l.trim()) queue.push(JSON.parse(l)); } next(); });
process.stdin.on('end', () => { bye(); process.exit(0); });
`, { mode: 0o755 });
  return bin;
}

function matchJobs(n: number): MatchJob[] {
  return Array.from({ length: n }, (_, i) => ({ id: `m${i}`, seed: i, games: 1, gameTimeoutSec: 30, profileA: 'Default', profileB: 'Default', builder: 'lab', deckA: null, deckB: null, poolA: [], poolB: [], forgeDeckOutA: '', forgeDeckOutB: '' }));
}

async function poolRun(ctl: { paused: boolean; maxWorkers: number | null } | null, n: number, during?: (ctlFile: string, done: () => number) => Promise<void>): Promise<{ maxAlive: number; done: number; order: string[] }> {
  const d = tmp('pool');
  const bin = fakeJava(d);
  const alive = path.join(d, 'alive');
  fs.mkdirSync(alive);
  const log = path.join(d, 'done.log');
  fs.writeFileSync(log, '');
  const ctlFile = path.join(d, 'control.json');
  const saved = { PATH: process.env.PATH, LAB_CONTROL: process.env.LAB_CONTROL, FAKE_ALIVE: process.env.FAKE_ALIVE, FAKE_LOG: process.env.FAKE_LOG };
  process.env.PATH = `${bin}:${process.env.PATH}`;
  process.env.FAKE_ALIVE = alive;
  process.env.FAKE_LOG = log;
  if (ctl) { writeControl(ctlFile, ctl); process.env.LAB_CONTROL = ctlFile; } else delete process.env.LAB_CONTROL;
  let maxAlive = 0;
  const sampler = setInterval(() => { maxAlive = Math.max(maxAlive, fs.readdirSync(alive).length); }, 10);
  const results: string[] = [];
  try {
    const p = runPool({ cp: 'x', homes: ['h0', 'h1', 'h2'], repo: d }, matchJobs(n), path.join(d, 'logs'), (j) => { results.push(j.id); }, () => {});
    if (during) await during(ctlFile, () => results.length);
    await p;
  } finally {
    clearInterval(sampler);
    for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  return { maxAlive, done: results.length, order: results };
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

test('cube-lab pool: no control file = three workers, as before', async () => {
  const r = await poolRun(null, 9);
  assert.equal(r.done, 9);
  assert.equal(r.maxAlive, 3);
});

test('cube-lab pool: maxWorkers 1 runs one worker; raising it starts the parked ones', async () => {
  const r = await poolRun({ paused: false, maxWorkers: 1 }, 80, async (f, done) => {
    while (done() < 3) await sleep(20);
    writeControl(f, { paused: false, maxWorkers: 3 });
  });
  assert.equal(r.done, 80);
  assert.ok(r.maxAlive >= 2, `alive ${r.maxAlive}`);
  const r1 = await poolRun({ paused: false, maxWorkers: 1 }, 6);
  assert.equal(r1.done, 6);
  assert.equal(r1.maxAlive, 1);
});

test('cube-lab pool: lowering maxWorkers lets workers go after their match', async () => {
  let aliveAfter = -1;
  const r = await poolRun({ paused: false, maxWorkers: 3 }, 40, async (f, done) => {
    while (done() < 3) await sleep(10);
    writeControl(f, { paused: false, maxWorkers: 1 });
    await sleep(1500);
    aliveAfter = done();
  });
  assert.equal(r.done, 40);
  assert.ok(aliveAfter > 3);
});

test('cube-lab pool: paused holds every match until it is lifted', async () => {
  const r = await poolRun({ paused: true, maxWorkers: null }, 4, async (f, done) => {
    await sleep(800);
    assert.equal(done(), 0, 'nothing runs while paused');
    writeControl(f, { paused: false, maxWorkers: null });
  });
  assert.equal(r.done, 4);
});

test('AI ladder drive: maxWorkers caps the batches in flight; paused holds until lifted', async () => {
  let inFlight = 0, most = 0, ran = 0;
  const engine = {
    workers: 3, stopped: false,
    runBatch: async (spec: BatchSpec): Promise<BatchResult> => {
      inFlight++; most = Math.max(most, inFlight);
      await sleep(30);
      inFlight--; ran++;
      return { spec, batch: ran, recs: [], ms: 30, exit: 0 };
    },
  } as unknown as Engine;
  const spec = { a: { name: 'a' }, b: { name: 'b' }, bseed: 1, pairs: [0], purpose: 't' } as unknown as BatchSpec;
  let left = 6;
  await drive(engine, { deadline: Date.now() + 60_000, next: () => (left-- > 0 ? spec : null), done: () => {}, control: () => ({ paused: false, maxWorkers: 1 }), pollMs: 10 });
  assert.deepEqual([ran, most], [6, 1]);
  ran = 0; most = 0; left = 6;
  await drive(engine, { deadline: Date.now() + 60_000, next: () => (left-- > 0 ? spec : null), done: () => {}, control: () => ({ paused: false, maxWorkers: null }), pollMs: 10 });
  assert.deepEqual([ran, most], [6, 3]);
  ran = 0; left = 2;
  let paused = true;
  const t0 = Date.now();
  setTimeout(() => { paused = false; }, 200);
  await drive(engine, { deadline: Date.now() + 60_000, next: () => (left-- > 0 ? spec : null), done: () => {}, control: () => ({ paused, maxWorkers: null }), pollMs: 10 });
  assert.equal(ran, 2);
  assert.ok(Date.now() - t0 >= 190);
});
