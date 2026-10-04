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
 *  - co-scheduling: job widths (cores:), admission by cores and memory, memory backoff,
 *    order and no starvation, lanes with a shared var/, cores in use in status.json;
 *  - the pressure backoff's decisions; the metric extractors over synthetic run folders,
 *    torn lines included; progress, rate and ETA;
 *  - status.json and the public sanitiser (no path, host or free text gets through);
 *  - the runner end to end: pilot -> checks -> sized commands -> final checks -> collect ->
 *    pushed STATUS / outputs / status.json / HEARTBEAT.md, the public copy on lab-status;
 *    an old-format job stopping after its pilot and `approve`; a failed pilot; an abort; a
 *    memory stop and its retry; a restart that adopts, resumes or restarts;
 *  - the public copy's own clock (every minute while busy and changed, five minutes
 *    otherwise, backed off on failure); the local server's CORS allowlist, Private
 *    Network Access preflight, 127.0.0.1 bind and public-only paths;
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
import { aibench, CHUNK_BYTES, coachbench, completeLines, count, cubelab, cubelabQueue, draftStats, eachCompleteLine, expandGlob, ladder, lines, progressOf, rateAndEta } from '../../tools/runner/metrics.ts';
import { legacyAibench, legacyCount, legacyCubelabQueue, legacyLines } from './lab-runner-legacy-metrics.ts';
import { DEFAULT_CONFIG, publicSignature, Runner, THREAD_CAP_VARS, threadCaps, type RunnerConfig } from '../../tools/runner/runner.ts';
import { answer, originAllowed, serveStatus, type StatusSource } from '../../tools/runner/serve.ts';
import { formatStatus, parseStatus, reservationOf, schedule, widthOf, type Holding, type MachineBudget, type Status } from '../../tools/runner/schedule.ts';
import { budget, sizeWorkers, sliceUnit, systemdRunArgs, unitName, type UnitSpec } from '../../tools/runner/sizing.ts';
import { idleReasonOf, isoLocal, LIVE_MAX, liveOf, PUBLIC_TEXT, REASONS, sanitise, type RunningJob, type StatusDoc } from '../../tools/runner/statusjson.ts';
import { sanitiseLadder } from '../../tools/runner/ladder.ts';
import { cardName, sanitiseWarehouse } from '../../tools/runner/warehouse.ts';
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

test('job file: cores: in the header is the job\'s width; a cores: line in a section sets the next block\'s', () => {
  const j = parseJobFile('J060.md', 'id: J060\ncpu: heavy\nrepos: mtg-table@main\nmax_workers: 7\ncores: 2\n## Pilot\n```bash\ntrue\n```\n## Commands\n```bash\nwide\n```\ncores: 1\nmem_gb: 12\n```bash\nnarrow\n```\n```bash\nwide again\n```\n', parse);
  assert.deepEqual(j.errors, []);
  assert.equal(j.cores, 2);
  assert.deepEqual(j.pilot?.blockCores, [null]);
  assert.deepEqual(j.commands?.blockCores, [null, 1, null]);
  assert.deepEqual(j.commands?.blockMemGb, [null, 12, null]);
  assert.equal(parseJobFile('J061.md', 'id: J061\nrepos: mtg-table@main\n', parse).cores, null);
  const bad = parseJobFile('J062.md', 'id: J062\ncores: two\nrepos: mtg-table@main\n## Commands\ncores: 0\nmem_gb: lots\n```bash\nx\n```\ncores: 1\n', parse);
  assert.equal(bad.errors.length, 4, bad.errors.join('\n'));
});

test('co-scheduling: width and reservation defaults (cores:, else max_workers, else physical - 1; light 1; at most the budget)', () => {
  const j = (h: string): ReturnType<typeof parseJobFile> => parseJobFile('J070.md', `id: J070\nrepos: mtg-table@main\n${h}`, parse);
  const m = { cores: 8, defaultWidth: 7 };
  assert.equal(widthOf(j('cpu: heavy\n'), m), 7);
  assert.equal(widthOf(j('max_workers: 3\n'), m), 3);
  assert.equal(widthOf(j('max_workers: 1\ncores: 4\n'), m), 4);         // one process, several threads
  assert.equal(widthOf(j('cores: 12\n'), m), 8);
  assert.equal(widthOf(j('cpu: light\n'), m), 1);
  assert.equal(reservationOf(j('max_workers: 7\n'), 7), 17.5);              // 2.5 GB a worker by default
  assert.equal(reservationOf(j('mem_per_worker_gb: 3\n'), 2), 6);
  assert.equal(reservationOf(j('mem_per_worker_gb: 3\n'), 2, 4), 8);       // a measured peak above the floor counts
});

test('co-scheduling: a narrow running job lets the next job start beside it, within the cores and the memory', () => {
  const job = (id: string, h = '', after = ''): ReturnType<typeof parseJobFile> =>
    parseJobFile(`${id}.md`, `id: ${id}\ncpu: heavy\n${after ? `after: ${after}\n` : ''}repos: mtg-table@main\n${h}`, parse);
  const now = Date.parse('2026-10-03T12:00:00Z');
  const machine: MachineBudget = { cores: 8, memGb: 21, defaultWidth: 7, memoryBackoff: false, coSchedule: true };
  const run = (jobs: ReturnType<typeof parseJobFile>[], holdings: Record<string, Holding>, extra: Partial<Parameters<typeof schedule>[0]> = {}) => schedule({
    jobs, statuses: new Map(Object.keys(holdings).map((id) => [id, st('running\nrunner: x\n')])),
    active: new Map(Object.keys(holdings).map((id) => [id, 'heavy' as const])), holdings: new Map(Object.entries(holdings)),
    machine, playing: false, paused: false, now, ...extra,
  });
  const starts = (r: ReturnType<typeof schedule>): string[] => r.start.map((x) => x.id);
  const code = (r: ReturnType<typeof schedule>, id: string): string | undefined => r.blocked.find((b) => b.id === id)?.code;
  // J049-like: one core, 3 GB.  The SPRT (7 wide, 17.5 GB) fits beside it: 8 of 8 cores, 20.5 of 21 GB.
  const sprt = job('J053', 'max_workers: 7\n');
  let r = run([job('J049', 'cores: 1\n'), job('J050', 'max_workers: 7\n', 'J049'), sprt], { J049: { cores: 1, memGb: 3 } });
  assert.deepEqual(starts(r), ['J053']);
  assert.equal(code(r, 'J050'), 'after');                   // its dependency is not done: it does not hold the queue
  // Cores: two in use leave six; a seven-wide job waits.
  r = run([sprt], { J049: { cores: 2, memGb: 3 } });
  assert.deepEqual([starts(r), code(r, 'J053')], [[], 'cores']);
  assert.match(r.blocked[0]?.reason ?? '', /needs 7 core\(s\); 6 of 8 free/);
  // Memory: one core but 14 GB reserved; 14 + 17.5 > 21.
  r = run([sprt], { J049: { cores: 1, memGb: 14 } });
  assert.deepEqual([starts(r), code(r, 'J053')], [[], 'cores']);
  assert.match(r.blocked[0]?.reason ?? '', /needs 17\.5 GB; 7 of 21 GB free/);
  // A memory backoff on a running job: nothing starts beside it.
  r = run([sprt], { J049: { cores: 1, memGb: 3 } }, { machine: { ...machine, memoryBackoff: true } });
  assert.deepEqual([starts(r), r.blocked[0]?.reason], [[], 'a running job is in memory backoff']);
  // Justin first, and pause: nothing heavy starts beside either.
  assert.deepEqual(starts(run([sprt], { J049: { cores: 1, memGb: 3 } }, { playing: true })), []);
  assert.deepEqual(starts(run([sprt], { J049: { cores: 1, memGb: 3 } }, { paused: true })), []);
  // needs: check and retry_after still hold a job back (and it does not hold the queue).
  r = schedule({ jobs: [sprt, job('J054', 'cores: 1\n')], statuses: new Map([['J049', st('running\nrunner: x\n')], ['J053', st('waiting\nretry_after: 2026-10-03T12:10:00Z\n')]]),
    active: new Map([['J049', 'heavy']]), holdings: new Map([['J049', { cores: 1, memGb: 3 }]]), machine, playing: false, paused: false, now });
  assert.deepEqual([starts(r), code(r, 'J053')], [['J054'], 'memory']);
  // Someone else's running job (no holding): its width is unknown, so it fills the machine.
  r = schedule({ jobs: [job('J054', 'cores: 1\n')], statuses: new Map([['J003', st('running\nstarted: x\n')]]), active: new Map(), machine, playing: false, paused: false, now });
  assert.deepEqual([starts(r), code(r, 'J054')], [[], 'heavy-busy']);
  // Co-scheduling off: one heavy job at a time.
  r = run([job('J054', 'cores: 1\n')], { J049: { cores: 1, memGb: 3 } }, { machine: { ...machine, coSchedule: false } });
  assert.deepEqual([starts(r), code(r, 'J054')], [[], 'heavy-busy']);
  // No machine in the input: the old rule.
  r = run([job('J054', 'cores: 1\n')], { J049: { cores: 1, memGb: 3 } }, { machine: undefined });
  assert.deepEqual(starts(r), []);
});

test('co-scheduling: order is kept, and a wide job that is next is never overtaken by narrow ones (no starvation)', () => {
  const job = (id: string, h = ''): ReturnType<typeof parseJobFile> => parseJobFile(`${id}.md`, `id: ${id}\ncpu: heavy\nrepos: mtg-table@main\n${h}`, parse);
  const now = Date.parse('2026-10-03T12:00:00Z');
  const machine: MachineBudget = { cores: 8, memGb: 21, defaultWidth: 7, memoryBackoff: false, coSchedule: true };
  const run = (jobs: ReturnType<typeof parseJobFile>[], holdings: Record<string, Holding>) => schedule({
    jobs, statuses: new Map(Object.keys(holdings).map((id) => [id, st('running\nrunner: x\n')])),
    active: new Map(Object.keys(holdings).map((id) => [id, 'heavy' as const])), holdings: new Map(Object.entries(holdings)),
    machine, playing: false, paused: false, now,
  });
  // J031 (5 wide) does not fit beside 4 cores in use; J032 and J033 (1 wide) would, but they come after it: they wait.
  let r = run([job('J031', 'max_workers: 5\n'), job('J032', 'cores: 1\n'), job('J033', 'cores: 1\n')], { J030: { cores: 4, memGb: 4 } });
  assert.deepEqual(r.start, []);
  assert.deepEqual(r.blocked.map((b) => [b.id, b.code]), [['J031', 'cores'], ['J032', 'heavy-busy'], ['J033', 'heavy-busy']]);
  assert.match(r.blocked[1]?.reason ?? '', /after J031/);
  // When the narrow job ends, the wide one gets the machine; the narrow ones fill what is left, in order.
  r = run([job('J031', 'max_workers: 5\n'), job('J032', 'cores: 1\n'), job('J033', 'cores: 1\n'), job('J034', 'cores: 2\n'), job('J035', 'cores: 1\n')], {});
  assert.deepEqual(r.start.map((x) => x.id), ['J031', 'J032', 'J033']);     // 5 + 1 + 1 = 7; J034 (2) does not fit,
  assert.deepEqual(r.blocked.map((b) => [b.id, b.code]), [['J034', 'cores'], ['J035', 'heavy-busy']]);  // and J035 waits behind it
  // An earlier job that fits always starts before a later one.
  r = run([job('J041', 'cores: 3\n'), job('J042', 'cores: 3\n')], { J040: { cores: 4, memGb: 4 } });
  assert.deepEqual([r.start.map((x) => x.id), r.blocked.map((b) => b.id)], [['J041'], ['J042']]);
  // A job wider than the machine runs alone, at the machine's width.
  r = run([job('J050', 'cores: 16\n'), job('J051', 'cores: 1\n')], {});
  assert.deepEqual(r.start.map((x) => x.id), ['J050']);
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

test('the unit: BLAS / OpenMP / numexpr / vecLib thread pools capped at the step\'s width', () => {
  assert.deepEqual(THREAD_CAP_VARS, ['OMP_NUM_THREADS', 'OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS', 'NUMEXPR_NUM_THREADS', 'VECLIB_MAXIMUM_THREADS']);
  const args = (width: number): string[] => systemdRunArgs({ unit: 'lab-J060-run1', memoryHighGb: 18.9, memoryMaxGb: 21, script: '/s/run1.sh', log: '/s/run1.log', cwd: '/lab/mtg-table', env: { JOBS: String(width), ...threadCaps(width) } });
  for (const [width, n] of [[1, '1'], [7, '7']] as const) {
    const a = args(width);
    for (const k of THREAD_CAP_VARS) assert.ok(a.includes(`--setenv=${k}=${n}`), `${k} at width ${width}`);
    assert.equal(a.filter((x) => /_THREADS=/.test(x)).length, 5);
  }
  assert.deepEqual(threadCaps(0), threadCaps(1), 'never 0 (0 means "all" to some pools)');
});

// ------------------------------------------------------------------ backoff

test('backoff: drop a worker on sustained pressure, pause at one, stop past the hard line, restore when calm', () => {
  const at = (i: number): number => i * 10_000;
  let s: BackoffState = initialBackoff(4);
  let java: number | null = 4;                              // the unit's Java processes: a worker leaves only when its game ends
  const step = (i: number, some10: number, swapIn = 0, can = true, jobGb: number | null = null) => {
    const r = decide(s, { at: at(i), some10, swapIn, jobGb, jobMaxGb: 21, javaCount: java }, can);
    s = r.state;
    return r.action;
  };
  assert.equal(step(1, 12), null);                          // one high sample is not enough
  assert.deepEqual(step(2, 12), { kind: 'drop', workers: 3, why: 'some avg10 12.0%, swap-in 0/s' });
  assert.equal(step(3, 12), null);
  assert.equal(step(4, 12), null);                          // cooldown: 60 s between drops
  assert.equal(step(9, 12), null);                          // the cooldown passed, but 4 JVMs still run: the drop has not taken effect
  assert.equal(step(20, 12), null);
  java = 3;                                                 // a game ended and its worker left
  assert.equal(step(21, 12)?.kind, 'drop');                 // 2 workers
  java = null;                                              // unknown: the next drop waits dropSettleS (300 s)
  assert.equal(step(40, 3, 5000), null);
  assert.equal(step(51, 3, 5000)?.kind, 'drop');            // 300 s after the last drop; swap-in counts as pressure: 1 worker
  java = 1;
  step(61, 12);
  assert.equal(step(62, 12)?.kind, 'pause');                // at one worker: pause new games
  assert.equal(step(70, 45), null);
  assert.equal(step(71, 45), null);
  assert.equal(step(72, 45)?.kind, 'stop');                 // past the hard line with nothing left: stop
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
  java = 6;                                                 // a job whose JVMs never leave (it ignores the cap)
  const acts = Array.from({ length: 14 }, (_, i) => step(400 + i * 7, 1, 0, true, 20.5)?.kind).filter(Boolean);
  // A drop at once; a second only after dropSettleS (300 s), since the JVM count never fell; then the hard line's safety net stops it.
  assert.deepEqual(acts.slice(0, acts.indexOf('stop') + 1), ['drop', 'drop', 'stop']);
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

test('metrics: the queue per cube, bridge share, draws, turns, timeouts, recordings and output bytes; drafts.jsonl read incrementally', () => {
  const d = tmp('clq');
  const q = path.join(d, 'q');
  const g = (extra: object = {}) => ({ ms: 1000, turns: 8, timeout: false, error: null, winner: 'A', ...extra });
  const draft = (seed: number, games: object[], extra: object = {}) => ({ seed, match: { games }, ...extra });
  fs.mkdirSync(q, { recursive: true });
  fs.writeFileSync(path.join(q, 'night-1.json'), JSON.stringify({ chunks: [
    { key: 'normal/omega', seed: 100, drafts: 4 }, { key: 'normal/fair-fight', seed: 200, drafts: 2 }, { key: 'bridge/omega+pauper', seed: 300, drafts: 2 },
  ] }));
  writeLines(path.join(q, 'normal/omega/drafts.jsonl'), [draft(100, [g(), g({ winner: 'draw', turns: 12 })]), draft(101, [g({ timeout: true, recorded: { bytes: 1000, errors: 1, frames: 3, dir: 'x' } })])]);
  writeLines(path.join(q, 'normal/fair-fight/drafts.jsonl'), [draft(200, [g()])], '{"seed":201,');
  writeLines(path.join(q, 'bridge/omega+pauper/drafts.jsonl'), [draft(300, [g()], { bridge: { sources: ['omega', 'pauper'] } })]);
  const r = cubelabQueue(d, ['q', 'night', '1']);
  assert.equal(r['cubes.omega.done'], 2);
  assert.equal(r['cubes.omega.planned'], 4);
  assert.equal(r['cubes.fair-fight.done'], 1, 'a torn last line is not a draft');
  assert.equal(r['cubes.fair-fight.planned'], 2);
  assert.equal(r['cubes.omega+pauper.done'], undefined, 'a bridge pair is not a cube');
  assert.deepEqual([r.bridge_drafts_done, r.bridge_drafts_planned, r.bridge_share, r.bridge_drafts], [1, 2, 0.25, 1]);
  assert.deepEqual([r.games, r.draws, r.timeouts, r.mean_turns, r.recorded_games, r.recorded_errors], [5, 1, 1, 8.8, 1, 1]);
  const jsonl = ['normal/omega', 'normal/fair-fight', 'bridge/omega+pauper'].map((k) => fs.statSync(path.join(q, k, 'drafts.jsonl')).size);
  assert.equal(r.output_bytes, jsonl.reduce((a, b) => a + b) + 1000);
  // The torn line completes and a new one lands: only the new bytes are read.
  const ff = path.join(q, 'normal/fair-fight/drafts.jsonl');
  fs.appendFileSync(ff, `"match":{"games":[]}}\n${JSON.stringify(draft(999, []))}\n`);
  const before = draftStats(ff);
  assert.equal(before.drafts, 3);
  assert.equal(draftStats(ff), before, 'unchanged size: memoised');
  assert.equal(cubelabQueue(d, ['q', 'night', '1'])['cubes.fair-fight.done'], 2);
  // Rewritten smaller (a fresh run): read again from the top.
  writeLines(ff, [draft(200, [])]);
  assert.equal(draftStats(ff).drafts, 1);
  // Rewritten at the same size (a new mtime): read again from the top too.
  const same = JSON.stringify(draft(201, []));
  fs.writeFileSync(ff, `${same}\n`);
  const t = new Date(Date.now() + 5000);
  fs.utimesSync(ff, t, t);
  assert.deepEqual([...draftStats(ff).seeds], [201]);
});

// A real drafts.jsonl line (run.ts's DraftRecord, ~16 KB of picks and decks), re-seeded and re-played.
const DRAFT_TEMPLATE = JSON.parse(fs.readFileSync(path.join(REPO, 'fixtures/cubelab/decisions/drafts.jsonl'), 'utf8').split('\n')[0]!) as Record<string, unknown>;

function realisticDraft(key: string, seed: number, i: number): Record<string, unknown> {
  const games = Array.from({ length: 1 + (i % 3 === 0 ? 1 : 0) }, (_, n) => ({
    n: n + 1, onPlay: 'A', onPlayVerified: 'A', winner: i % 17 === 0 ? 'draw' : i % 2 ? 'A' : 'B', turns: 6 + (i % 13),
    // Some non-integer times: the sums must fold in the old order to give the old numbers.
    ms: 8000 + ((i * 7919) % 90000) + (i % 5 === 0 ? 0.37 : 0), timeout: i % 23 === 0, reason: null, error: i % 31 === 0 ? 'boom' : null,
    cpuMs: (i * 104729) % 200000, gameCpuMs: 100,
    ...(i % 4 === 0 ? { recorded: { dir: `games/${seed}`, bytes: 100000 + i * 13, frames: 300, errors: i % 8 === 0 ? 1 : 0, decisions: 10, decisionErrors: 0 } } : {}),
  }));
  return {
    ...DRAFT_TEMPLATE, cube: `${key} — “quoted”`, seed,
    match: { games, winsA: 1, winsB: 0, winner: 'A', ...(i % 29 === 0 ? { engineError: 'worker died' } : {}), worker: i % 7 },
    ...(key.startsWith('bridge/') ? { bridge: { sources: key.slice(7).split('+') } } : {}),
  };
}

/** A queue root: two nights over normal and bridge keys, torn and unreadable lines, one file over CHUNK_BYTES. */
function realisticQueue(d: string): string {
  const q = path.join(d, 'q');
  const keys: Array<[string, number]> = [['normal/omega', 90], ['normal/pauper', 25], ['normal/fair-fight', 12], ['bridge/omega+pauper', 15], ['bridge/pauper+vintage', 8]];
  const n1: object[] = [], n2: object[] = [];
  let i = 0;
  for (const [key, n] of keys) {
    const rows = Array.from({ length: n }, (_, k) => JSON.stringify(realisticDraft(key, k + 1, i++)));
    rows.splice(3, 0, '', '{"seed": not json', JSON.stringify(realisticDraft(key, 777777, i++)));
    const f = path.join(q, key, 'drafts.jsonl');
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, `${rows.join('\n')}\n{"seed":${n + 1},"match":{"ga`);
    n1.push({ key, seed: 1, drafts: Math.floor(n / 2) });
    n2.push({ key, seed: Math.floor(n / 2) + 1, drafts: n });
  }
  fs.writeFileSync(path.join(q, 'night-1.json'), JSON.stringify({ night: 1, chunks: n1 }));
  fs.writeFileSync(path.join(q, 'night-2.json'), JSON.stringify({ night: 2, chunks: n2 }));
  fs.writeFileSync(path.join(q, 'queue.json'), JSON.stringify({ games: 1, next: {} }));
  assert.ok(fs.statSync(path.join(q, 'normal/omega/drafts.jsonl')).size > CHUNK_BYTES, 'one file spans several reads');
  return q;
}

const QUEUE_ARGS = [['q'], ['q', 'night', '1'], ['q', 'night', '2']];

test('metrics: the streamed extractors give the old numbers (same keys, same values) on a realistic queue, aibench, lines and count', () => {
  const d = tmp('same');
  realisticQueue(d);
  for (const a of QUEUE_ARGS) {
    const now = cubelabQueue(d, a);
    assert.deepEqual(now, legacyCubelabQueue(d, a), a.join(' '));
    assert.deepEqual(cubelabQueue(d, a), now, 'memoised: the same again');
  }
  const two = cubelabQueue(d, ['q', 'night', '2']);
  assert.ok((two.games as number) > 100 && (two.engine_error_rate as number) > 0 && (two.recorded_errors as number) > 0 && (two.recorded_games as number) > 0);
  // ai-bench shards and the generic counters, against the old readers too.
  const b = path.join(d, 'var/ai-bench/n');
  const g = (i: number) => ({ winner: ['A', 'B', 'draw'][i % 3], focusWon: i % 2 ? 'yes' : 'no', turns: 10 + (i % 7), ms: 1000 + i * 37.5, timeout: i % 11 === 0, error: i % 13 === 0 ? 'x' : '', aiEvalTimeouts: i % 2, aStats: { counts: { 'search.fallback.budget': i % 3, 'search.p.considered': 5 } }, pad: 'é'.repeat(3000) });
  writeLines(path.join(b, 'shard-0.jsonl'), Array.from({ length: 400 }, (_, i) => g(i)), '{"winner":"A"');
  writeLines(path.join(b, 'shard-1.jsonl'), Array.from({ length: 50 }, (_, i) => g(i + 400)));
  fs.writeFileSync(path.join(b, 'shard-0.log'), "a\nCouldn't map x\n\nCouldn't map y\nCouldn't map torn");
  assert.deepEqual(aibench(d, ['var/ai-bench/*']), legacyAibench(d, ['var/ai-bench/*']));
  for (const a of [['var/ai-bench/n/*'], ['q/*/*/drafts.jsonl']]) assert.equal(lines(d, a), legacyLines(d, a));
  assert.equal(count(d, ['var/ai-bench/n/*', "Couldn't map"]), legacyCount(d, ['var/ai-bench/n/*', "Couldn't map"]));
  assert.equal(count(d, ['var/ai-bench/n/*', "Couldn't map"]), 2, 'the torn last line is not counted');
  writeLines(path.join(d, 'lad/results/a.jsonl'), [{ ms: 3000, error: true }, { ms: 1000 }, { ms: 2000, timeout: true }], '{"ms":9');
  assert.deepEqual(ladder(d, ['lad']), { games: 3, errors: 1, timeouts: 1, median_game_s: 2 });
});

test('metrics: drafts.jsonl appended to is read from where it stopped; truncated or replaced, from the top', () => {
  const d = tmp('inc');
  const q = realisticQueue(d);
  const f = path.join(q, 'normal/omega/drafts.jsonl');
  const a = ['q', 'night', '2'];
  cubelabQueue(d, a);
  const stats = draftStats(f);
  const drafts0 = stats.drafts;
  // The torn line completes and more land; at the same time, scribble over the first line in place.
  // The size grew, so only the new bytes are read: the scribble is never seen.
  const fd = fs.openSync(f, 'r+');
  fs.writeSync(fd, Buffer.from('X'.repeat(20)), 0, 20, 0);
  fs.closeSync(fd);
  fs.appendFileSync(f, `ames":[]}}\n${[200, 201, 202].map((s, k) => JSON.stringify(realisticDraft('normal/omega', s, k))).join('\n')}\n`);
  const after = draftStats(f);
  assert.equal(after, stats, 'the same running counts, added to');
  assert.equal(after.drafts, drafts0 + 4, 'the completed torn line and three new ones; the first line still counted');
  assert.ok(after.seeds.has(91) && after.seeds.has(202));
  // Put the first line back: from here on the old reader and the new agree again, append by append.
  const fd2 = fs.openSync(f, 'r+');
  fs.writeSync(fd2, Buffer.from(JSON.stringify(realisticDraft('normal/omega', 1, 0)).slice(0, 20)), 0, 20, 0);
  fs.closeSync(fd2);
  for (let k = 0; k < 3; k++) {
    fs.appendFileSync(f, `${JSON.stringify(realisticDraft('normal/omega', 300 + k, k))}\n{"seed":`.slice(0, k === 1 ? undefined : -9));
    assert.deepEqual(cubelabQueue(d, a), legacyCubelabQueue(d, a), `append ${k}`);
  }
  // Truncated (a fresh run in the same folder): read again from the top.
  const p = path.join(q, 'normal/pauper/drafts.jsonl');
  cubelabQueue(d, a);
  fs.truncateSync(p, 40_000);
  assert.deepEqual(cubelabQueue(d, a), legacyCubelabQueue(d, a), 'truncated');
  assert.ok(draftStats(p).drafts < 5);
  // Replaced by a new, larger file (rotation: a new inode): read again from the top.
  const big = Array.from({ length: 40 }, (_, k) => JSON.stringify(realisticDraft('normal/pauper', k + 1, k + 50))).join('\n');
  fs.writeFileSync(`${p}.new`, `${big}\n`);
  fs.renameSync(`${p}.new`, p);
  assert.deepEqual(cubelabQueue(d, a), legacyCubelabQueue(d, a), 'replaced');
  assert.equal(draftStats(p).drafts, 40);
  // Gone: nothing, and no stale numbers.
  fs.rmSync(p);
  assert.deepEqual(cubelabQueue(d, a), legacyCubelabQueue(d, a), 'removed');
});

test('metrics: the line reader decodes a character split across two reads and a line longer than a read', () => {
  const d = tmp('utf');
  const f = path.join(d, 'x.jsonl');
  // "—" is three bytes; put its middle byte on the read boundary.
  const first = `${'a'.repeat(CHUNK_BYTES - 1)}—b`;
  const long = 'é'.repeat(CHUNK_BYTES);
  fs.writeFileSync(f, `${first}\n\n${long}\nshort\ntorn`);
  const got: string[] = [];
  const end = eachCompleteLine(f, (l) => got.push(l));
  assert.deepEqual(got.map((l) => l.length), [first.length, long.length, 5]);
  assert.equal(got[0], first);
  assert.equal(got[1], long);
  assert.equal(end, fs.statSync(f).size - 4, 'stops after the last newline');
  const rest: string[] = [];
  fs.appendFileSync(f, 'ed\n');
  eachCompleteLine(f, (l) => rest.push(l), end);
  assert.deepEqual(rest, ['torned']);
  assert.deepEqual(completeLines(f).length, 4);
});

test('metrics: the queue extractor stays in a small heap whatever the file size (a child node capped at 48 MB reads 48 MB of drafts)', () => {
  const d = tmp('mem');
  const q = path.join(d, 'q');
  const f = path.join(q, 'normal/omega/drafts.jsonl');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const fd = fs.openSync(f, 'w');
  let bytes = 0, n = 0;
  while (bytes < 48 * 1024 * 1024) {
    const block = Array.from({ length: 100 }, (_, k) => `${JSON.stringify(realisticDraft('normal/omega', n + k + 1, n + k))}\n`).join('');
    fs.writeSync(fd, block);
    bytes += Buffer.byteLength(block);
    n += 100;
  }
  fs.closeSync(fd);
  fs.writeFileSync(path.join(q, 'night-1.json'), JSON.stringify({ chunks: [{ key: 'normal/omega', seed: 1, drafts: n }] }));
  // Parsed and kept whole, as before, these lines need several times their 48 MB of heap.
  const script = `
    const m = await import(${JSON.stringify(path.join(REPO, 'tools/runner/metrics.ts'))});
    const r = m.cubelabQueue(${JSON.stringify(d)}, ['q', 'night', '1']);
    globalThis.gc();
    process.stdout.write(JSON.stringify({ drafts: r.drafts, done: r.night_drafts_done, heapMb: process.memoryUsage().heapUsed / 1048576 }));`;
  const r = spawnSync(process.execPath, ['--max-old-space-size=48', '--expose-gc', '--input-type=module', '-e', script], { encoding: 'utf8', timeout: 120_000 });
  assert.equal(r.status, 0, r.stderr.slice(-2000));
  const out = JSON.parse(r.stdout) as { drafts: number; done: number; heapMb: number };
  assert.equal(out.drafts, n);
  assert.equal(out.done, n);
  assert.ok(out.heapMb < 24, `retained heap ${out.heapMb.toFixed(1)} MB`);
});

test('live numbers: metrics split into per-cube progress and numbers, headline first; the public copy keeps safe keys and numbers only; cube ids only on opt-in', () => {
  const { live, cubes, liveHeadline } = liveOf({ 'q.games': 10, 'q.drafts': 4, 'q.cubes.omega.done': 2, 'q.cubes.omega.planned': 4, 'q.cubes.fair-fight.done': 1, 'q.cubes.fair-fight.planned': 2, ok: true, 'q.engine_errors': 0 }, ['q.engine_errors', 'missing']);
  assert.deepEqual(Object.keys(live), ['q.engine_errors', 'q.drafts', 'q.games']);
  assert.deepEqual(liveHeadline, ['q.engine_errors']);
  assert.deepEqual(cubes, [{ id: 'omega', done: 2, planned: 4 }, { id: 'fair-fight', done: 1, planned: 2 }]);
  assert.equal(Object.keys(liveOf(Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`m${i}`, i]))).live).length, LIVE_MAX);
  const job = (extra: Partial<RunningJob>): RunningJob => ({ id: 'J020', title: 'x', cpu: 'heavy', phase: 'commands 1/1', started: null, elapsed: 0, done: 1, total: 2, unit: 'drafts', ratePerHour: null, eta: null, workers: 3, workersMax: 5, errors: 0, paused: false, dataUpdated: null, pressureEvents: [], ...extra });
  const base: StatusDoc = { schema: 1, updated: '2026-10-03T10:00:00-04:00', paused: false, host: { load1: 0, memUsedGb: 0, memTotalGb: 0, swapUsedMb: 0, pressure: 0, cpus: 0, budgetGb: 0 }, running: [], queue: [], waiting: [], finished: [] };
  const live2 = { 'q.drafts': 4, 'q.drafts_per_h': 12.34567, 'Bad Key': 1, 'a/b': 2, 'q.x': 'text' as unknown as number, 'q.inf': Infinity, 'a.b.c.d': 3, 'cubes.omega.done': 2, 'q.cubes.x': 1 };
  const pub = sanitise({ ...base, running: [job({ memGb: 7.25, live: live2, liveHeadline: ['q.drafts', 'Bad Key', 'q.gone', 7 as unknown as string], cubes, detail: 'lab-J020-run1' })] }).running[0]!;
  assert.deepEqual(pub.live, { 'q.drafts': 4, 'q.drafts_per_h': 12.346 }, 'safe keys, numbers only, no cube id in a key');
  assert.deepEqual(pub.liveHeadline, ['q.drafts'], 'headline names only for published keys');
  assert.ok(Object.values(pub.live ?? {}).every((v) => typeof v === 'number' && Number.isFinite(v)));
  assert.deepEqual(pub.cubes, [{ id: 'cube 1', done: 2, planned: 4 }, { id: 'cube 2', done: 1, planned: 2 }], 'no opt-in: anonymous');
  assert.equal(pub.memGb, 7.25);
  assert.equal(pub.publicCubes, undefined);
  const named = sanitise({ ...base, running: [job({ cubes: [...cubes, { id: '../etc', done: 1, planned: 1 }, { id: 'pauper', done: 'x' as unknown as number, planned: 1 }], publicCubes: true })] }).running[0]!;
  assert.deepEqual(named.cubes, [{ id: 'omega', done: 2, planned: 4 }, { id: 'fair-fight', done: 1, planned: 2 }, { id: 'cube 3', done: 1, planned: 1 }]);
  // An older private doc without them.
  assert.deepEqual(sanitise({ ...base, running: [job({})] }).running[0]!.live, {});
});

test('job file: public_cubes opts in, yes or no', () => {
  const head = (x: string) => parseJobFile('J099-x.md', `id: J099\ntitle: t\ncpu: light\n${x}\n`, parse);
  assert.equal(head('public_cubes: yes').publicCubes, true);
  assert.equal(head('').publicCubes, false);
  assert.match(head('public_cubes: maybe').errors.join(), /public_cubes/);
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

/** What must never reach the public copy: card, deck and cube names, e-mail addresses, host names, paths, presence. */
const LEAKS = ['Lightning Bolt', 'Black Lotus', 'Island', 'Omega', 'Doom Legion', 'justin@example.com', 'example.com', 'desk.local', 'justins-pc', '/home', 'justin-a', '/tmp', 'proc', 'lab-J003', 'abc1234', 'Justin', 'playing', 'play-ended', 'at the table'];

const DOC: StatusDoc = {
  schema: 1, updated: '2026-10-03T10:55:00-04:00', paused: false,
  host: { load1: 6.2, memUsedGb: 14.1, memTotalGb: 30, swapUsedMb: 0, pressure: 1.5, cpus: 16, budgetGb: 23 },
  running: [{ id: 'J003', title: 'Search AI with Lightning Bolt decks, mail justin@example.com from desk.local', cpu: 'heavy', phase: 'commands 1/1', started: '2026-10-03T10:34:23-04:00', elapsed: 1234,
    done: 212, total: 400, unit: 'games', ratePerHour: 310, eta: '2026-10-03T12:40:00-04:00', workers: 6, workersMax: 7, errors: 0, paused: true, dataUpdated: '2026-10-03T10:54:00-04:00',
    pressureEvents: [
      { at: '2026-10-03T10:40:00-04:00', kind: 'drop', workers: 6, pressure: 12.3, why: 'some avg10 12% /proc' } as never,
      { at: '2026-10-03T10:41:00-04:00', kind: 'playing', workers: 6, pressure: 0, why: 'Justin is at the table' } as never,
      { at: '2026-10-03T10:50:00-04:00', kind: 'play-ended', workers: 6, pressure: 0, why: 'Justin left the table' } as never,
    ], detail: 'lab-J003-run1 /home/justin-a' }],
  queue: [{ id: 'J004', title: 'Omega evolve', cpu: 'heavy', est: '~3 h' }, { id: 'J008', title: 'Search vs Doom Legion', publicTitle: 'Search bench (40 deals)', publicEst: '~3 h', cpu: 'heavy', est: '~3 h' },
    { id: 'J009', title: 'x', publicTitle: 'Evolve at desk.local', publicEst: 'see /tmp', cpu: 'light', est: '' }],
  waiting: [{ id: 'J006', title: 'Coach', reason: 'pilot done; needs a check', est: '', detail: 'card Black Lotus in /tmp/x' }, { id: 'J007', title: 'x', reason: 'deck: 4 Island', est: '' },
    { id: 'J010', title: 'y', reason: 'held', est: '', detail: 'Justin is playing' }],
  finished: [{ id: 'J002', title: 'PR #27 coach-bench comparison', status: 'done', finished: '2026-10-03T09:53:39-07:00', headline: 'Lightning Bolt was great', numbers: { 'a_win_rate': 0.41, 'bad key!': 3, games: 400, 'control.games': 20 }, detail: 'from /home/x' }],
  runner: { commit: 'abc1234', started: '2026-10-03T10:00:00-04:00', dryRun: false },
};

test('public status (the spec): ids; a title or estimate only when the job opts in, in the strict set; numbers, timestamps, fixed words; no presence', () => {
  const p = sanitise(DOC);
  const text = JSON.stringify(p);
  for (const bad of LEAKS) assert.ok(!text.includes(bad), `the public copy holds "${bad}"`);
  for (const k of ['why', 'detail', 'runner', 'publicTitle', 'publicEst']) assert.ok(!text.includes(`"${k}"`), k);
  // No opt-in: the title is the id and there is no estimate.
  assert.deepEqual([p.running[0]?.title, p.queue[0]?.title, p.queue[0]?.est, p.finished[0]?.title, p.waiting[0]?.title], ['J003', 'J004', '', 'J002', 'J006']);
  // Opted in, in the strict set: shown.  Opted in with a host name or a path: the id, no estimate.
  assert.deepEqual([p.queue[1]?.title, p.queue[1]?.est], ['Search bench (40 deals)', '~3 h']);
  assert.deepEqual([p.queue[2]?.title, p.queue[2]?.est], ['J009', '']);
  // Presence: the events that say Justin sat down or left are dropped; the reason is the neutral "held".
  assert.deepEqual(p.running[0]?.pressureEvents, [{ at: '2026-10-03T10:40:00-04:00', kind: 'drop', workers: 6, pressure: 12.3 }]);
  assert.equal(REASONS.playing, 'held');
  assert.deepEqual(p.waiting.map((w) => w.reason), ['pilot done; needs a check', 'waiting', 'held']);
  assert.deepEqual(p.finished[0]?.numbers, { a_win_rate: 0.41, games: 400, 'control.games': 20 });
  assert.equal(p.finished[0]?.headline, 'a_win_rate 0.41 · games 400 · control.games 20');
  assert.equal(p.host.cpus, 16);
  assert.equal(p.schema, 1);
  // A missing timestamp is null, never ''.
  const undated = sanitise({ ...DOC, running: [{ ...DOC.running[0]!, started: 'soon' }], finished: [{ ...DOC.finished[0]!, finished: null }] });
  assert.deepEqual([undated.running[0]?.started, undated.finished[0]?.finished], [null, null]);
  // Whatever arrives, the shape is the allowlist's.
  const hostile = sanitise({ ...DOC, running: [{ ...DOC.running[0]!, id: '../../etc', phase: 'rm -rf', unit: 'cards', eta: 'soon' }], extra: 'x' } as unknown as StatusDoc);
  assert.deepEqual(hostile.running, []);
  assert.ok(!('extra' in hostile));
  const h2 = sanitise({ ...DOC, running: [{ ...DOC.running[0]!, phase: 'rm -rf', unit: 'cards', eta: 'soon' }] });
  assert.deepEqual([h2.running[0]?.phase, h2.running[0]?.unit, h2.running[0]?.eta], ['commands', null, null]);
  for (const ok of ['Search bench (40 deals)', '~3 h', 'J003: control vs search, 2000 games']) assert.ok(PUBLIC_TEXT.test(ok), ok);
  for (const bad of ['a.b', 'x/y', 'a@b', 'C:\\x', '"q"', '[x]', 'é']) assert.ok(!PUBLIC_TEXT.test(bad), bad);
  assert.match(isoLocal(Date.parse('2026-10-03T14:55:00Z'), -240), /^2026-10-03T10:55:00-04:00$/);
});

test('job file: public_title and public_est opt in, and only in the strict character set', () => {
  const ok = parseJobFile('J030.md', 'id: J030\npublic_title: Search bench (400 deals)\npublic_est: ~3 h\n', parse);
  assert.deepEqual([ok.publicTitle, ok.publicEst, ok.errors], ['Search bench (400 deals)', '~3 h', []]);
  const bad = parseJobFile('J031.md', 'id: J031\npublic_title: Lightning Bolt at desk.local\n', parse);
  assert.equal(bad.publicTitle, null);
  assert.equal(bad.errors.length, 1);
  assert.equal(parseJobFile('J032.md', 'id: J032\ntitle: Lightning Bolt\n', parse).publicTitle, null);
});

const LADDER = {
  schema: 'mtg-table/ai-ladder', version: 1, generatedAt: '2026-10-03T12:00:00.000Z', anchor: { name: 'forge-default', rating: 1500 }, scale: 'elo', ci: 'bootstrap:200',
  totals: { games: 400, decisive: 390, draws: 10, hosts: ['justins-pc.local'], first: '2026-10-01T00:00:00Z', last: '2026-10-03T11:00:00Z' },
  players: [
    { name: 'search-ms3000', kind: 'search', params: { deck: '/home/justin-a/code/mtg-table/decks/x.dck', ms: 3000 }, hash: 'ab12cd34', anchor: false, registered: true, available: true, unavailable: null,
      rating: 1562.3, lo: 1520.1, hi: 1601.9, rated: true, games: 200, wins: 118, losses: 82, draws: 4, vsAnchor: { wins: 60, losses: 40, rate: 0.6, lo: 0.502, hi: 0.691 } },
    { name: '/etc/passwd', kind: 'x', rating: 1 },
    { name: 'old@1a2b3c4d', kind: 'Search Config!', params: {}, unavailable: 'kind removed: see /home/x', rating: 1490, lo: 1400, hi: 1580, rated: true, games: 20, wins: 9, losses: 11, draws: 0, vsAnchor: null },
    { name: 'justin@example.com', kind: 'search', rating: 1500, lo: 1400, hi: 1600, rated: true, games: 1, wins: 1, losses: 0, draws: 0, vsAnchor: null },
    { name: 'desk.local', kind: 'search', rating: 1500, lo: 1400, hi: 1600, rated: true, games: 1, wins: 1, losses: 0, draws: 0, vsAnchor: null },
  ],
  history: [{ at: 'x', run: 'justins-pc:run1', games: 1, ratings: {} }],
  sprt: [{ v: 1, at: '2026-10-03T10:00:00Z', id: 'justins-pc-17', host: 'justins-pc', a: 'search-ms3000', b: 'forge-default', ah: 'h', bh: 'h', elo0: 0, elo1: 30, alpha: 0.05, beta: 0.05, result: 'H1', llr: 3.1, lower: -2.9, upper: 2.9, games: 160, pairs: 40, score: 0.58, purpose: 'sprt' }],
  tune: [{ at: '2026-10-02T10:00:00Z', id: 't1', host: 'justins-pc', base: 'search-ms3000', vary: { ms: [1000, 3000] }, pool: ['forge-default'], eta: 0.5, games: 300, winner: { label: 'ms=1000 /tmp/x', params: { ms: 1000 }, hash: 'h', registeredAs: 'search-ms1000' }, rounds: [{ round: 1, blocks: 4, standings: [{ label: 'ms=1000', wins: 30, losses: 20, score: 0.6 }, { label: '/etc/x', wins: 1, losses: 1, score: 0.5 }, { label: 'mail justin@example', wins: 1, losses: 1, score: 0.5 }, { label: 'host desk.local', wins: 1, losses: 1, score: 0.5 }] }] }],
  league: { best: 'search-ms3000', pool: ['forge-default', '../x'], promoted: [{ name: 'search-ms3000', at: '2026-10-02T12:00:00Z', reason: 'SPRT H1 vs best; see /home/justin-a/x on desk.local' }] },
  set: 'var/cubelab/runs/omega-lightning-bolt.txt',
  experiments: [{ at: 'x', id: 'e1', cmd: 'tools/ai-ladder.sh run --hosts justins-pc', purpose: 'dev', status: 'finished', sha: 'abc', dirty: false, set: 'x', hypothesis: 'free text', games: 3 }],
};

test('public ladder.json: an allowlist of names, kinds, ratings, records and outcomes', () => {
  const p = sanitiseLadder(LADDER)!;
  const text = JSON.stringify(p);
  for (const bad of [...LEAKS, 'lightning', 'omega', 'passwd', 'hosts', 'params', 'hash', 'history', 'experiments', 'tools/', 'free text', 'blocks', '/etc', 'unavailable', '../x', '"id"', '@example', '.local']) assert.ok(!text.toLowerCase().includes(bad.toLowerCase()), bad);
  // A set outside the fixed list is null; the fixed ones publish their file name.
  assert.equal(p.set, null);
  assert.equal(sanitiseLadder({ ...LADDER, set: 'tools/ai-bench/pairs-confirm.txt' })?.set, 'pairs-confirm.txt');
  assert.equal(sanitiseLadder({ ...LADDER, set: 'all' })?.set, 'all');
  // An e-mail address and a host name are not player names (no `.`, and `@` only before a hex hash).
  assert.deepEqual(p.players.map((x) => [x.name, x.kind, x.rating, x.lo, x.hi]), [['search-ms3000', 'search', 1562.3, 1520.1, 1601.9], ['old@1a2b3c4d', '?', 1490, 1400, 1580]]);
  assert.deepEqual(p.players[0]?.vsAnchor, { wins: 60, losses: 40, rate: 0.6, lo: 0.502, hi: 0.691 });
  assert.deepEqual(p.sprt[0], { at: '2026-10-03T10:00:00Z', a: 'search-ms3000', b: 'forge-default', elo0: 0, elo1: 30, alpha: 0.05, beta: 0.05, result: 'H1', llr: 3.1, lower: -2.9, upper: 2.9, games: 160, pairs: 40, score: 0.58, purpose: 'sprt' });
  assert.deepEqual(p.tune[0], { at: '2026-10-02T10:00:00Z', base: 'search-ms3000', vary: { ms: [1000, 3000] }, pool: ['forge-default'], eta: 0.5, games: 300,
    winner: { label: null, registeredAs: 'search-ms1000' }, rounds: [{ round: 1, standings: [{ label: 'ms=1000', wins: 30, losses: 20, score: 0.6 }] }] });
  // A reason not in league.ts's one shape is the fixed word; the real shape passes.
  assert.deepEqual(p.league, { best: 'search-ms3000', pool: ['forge-default'], promoted: [{ name: 'search-ms3000', at: '2026-10-02T12:00:00Z', reason: 'promoted' }] });
  const real = 'SPRT H1 after 160 games; non-inferior to the best against forge-default within 20 Elo (+12 Elo vs the best against forge-default over 40 shared deals)';
  assert.equal(sanitiseLadder({ ...LADDER, league: { best: 'a', pool: [], promoted: [{ name: 'a', at: '2026-10-02T12:00:00Z', reason: real }] } })?.league?.promoted[0]?.reason, real);
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

const WAREHOUSE_SAMPLE = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'lab', 'warehouse-sample.json'), 'utf8'));

test('public warehouse.json (D363): schema 1 exactly, numbers in range, cube-document card names only', () => {
  // warehouse.py export's own sample passes unchanged.
  assert.deepEqual(sanitiseWarehouse(WAREHOUSE_SAMPLE), WAREHOUSE_SAMPLE);
  assert.ok(WAREHOUSE_SAMPLE.cards.length > 0 && WAREHOUSE_SAMPLE.pairs.length > 0 && WAREHOUSE_SAMPLE.nights.length > 0);
  const hostile = {
    ...WAREHOUSE_SAMPLE, seeds: [7], decks: [{ main: [[1, 'Snapcaster Mage']] }], path: '/home/justin-a/code/mtg-table/var/cubelab/queue',
    tables: [{ name: 'drafts', rows: 3, bytes: 9, path: '/x' }, { name: '../etc', rows: 1, bytes: 1 }, { name: 'picks', rows: -1, bytes: 1 }],
    nights: [{ night: 3, drafts: 1, games: 1, recorded: 1, quarantined: 0, engineErrors: 0, seeds: [1, 2] }, { night: 'n/../4', drafts: 1, games: 1, recorded: 1, quarantined: 0, engineErrors: 0 }, { night: 'other', drafts: 1.5, games: 1, recorded: 1, quarantined: 0, engineErrors: 0 }],
    archive: { gzipBytes: 10, zstdBytes: 5, dir: '/var' }, disk: { freeGB: 12.5, usedPct: 140 },
    cubes: [{ cube: 'synergy', drafts: 1, games: 1, avgTurns: 12, onPlayWinRate: 0.5, title: 'x' }, { cube: 'Synergy Cube', drafts: 1, games: 1, avgTurns: 1, onPlayWinRate: 0.5 }],
    pairs: [{ cube: 'synergy', pair: 'WU', games: 10, winRate: 0.5, lo: 0.2, hi: 0.8 }, { cube: 'synergy', pair: 'WX', games: 10, winRate: 0.5, lo: 0.2, hi: 0.8 }, { cube: 'synergy', pair: 'UB', games: 10, winRate: 1.2, lo: 0.2, hi: 0.8 }],
    cards: [{ cube: 'synergy', card: 'Fire // Ice', games: 100, winRate: 0.5, lo: 0.4, hi: 0.6, seat: 'A' }, ...['/etc/passwd', 'justin@example.com', 'a\u0000b', 'x'.repeat(61), '../x', 'C:\\x'].map((card) => ({ cube: 'synergy', card, games: 100, winRate: 0.5, lo: 0.4, hi: 0.6 })),
      { cube: 'synergy', card: 'Snapcaster Mage', games: 100, winRate: 0.5, lo: 0.7, hi: 0.6 }],
  };
  const p = sanitiseWarehouse(hostile)!;
  assert.deepEqual(Object.keys(p), ['schema', 'generatedAt', 'warehouseVer', 'tables', 'nights', 'archive', 'disk', 'cubes', 'pairs', 'cards']);
  assert.deepEqual(p.tables, [{ name: 'drafts', rows: 3, bytes: 9 }]);
  assert.deepEqual(p.nights, [{ night: 3, drafts: 1, games: 1, recorded: 1, quarantined: 0, engineErrors: 0 }]);
  assert.deepEqual(p.archive, { gzipBytes: 10, zstdBytes: 5 });
  assert.equal(p.disk, null);
  assert.deepEqual(p.cubes, [{ cube: 'synergy', drafts: 1, games: 1, avgTurns: 12, onPlayWinRate: 0.5 }]);
  assert.deepEqual(p.pairs.map((x) => x.pair), ['WU']);
  assert.deepEqual(p.cards.map((x) => x.card), ['Fire // Ice']);
  const text = JSON.stringify(p);
  for (const bad of ['/home', 'seeds', 'decks', 'justin', 'passwd', '"path"', '"dir"', '"title"', '"seat"']) assert.ok(!text.includes(bad), bad);
  assert.equal(cardName("Jace, Vryn's Prodigy"), "Jace, Vryn's Prodigy");
  assert.equal(cardName('Lim-Dûl the Necromancer'), 'Lim-Dûl the Necromancer');
  assert.equal(cardName('a/b'), null);
  assert.equal(sanitiseWarehouse({ ...WAREHOUSE_SAMPLE, schema: 2 }), null);
  assert.equal(sanitiseWarehouse({ ...WAREHOUSE_SAMPLE, generatedAt: 'yesterday' }), null);
  assert.equal(sanitiseWarehouse('nope'), null);
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
  javaCount: number | null = null;
  /** liveUnits answers: null = systemctl did not answer. */
  live: string[] | null = [];
  inSlice: string[] = [];
  /** git subcommands that fail (exit 128), e.g. ['fetch', 'push', 'ls-tree']. */
  gitFails = new Set<string>();
  now(): number { return this.t; }
  run(argv: string[], o: { cwd?: string; timeoutMs?: number; env?: Record<string, string>; input?: string } = {}) {
    if (argv[0] === 'git') {
      const sub = argv.slice(1).find((a, i, all) => !a.startsWith('-') && all[i - 1] !== '-C' && all[i - 1] !== '-c');
      if (sub && this.gitFails.has(sub)) return { code: 128, stdout: '', stderr: `fatal: ${sub}: unable to access (fake network down)` };
    }
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
    this.states.set(unit, 'gone');
  }
  stopUnit(unit: string) { this.stopped.push(unit); this.release(unit, 'killed'); return { code: 0, stdout: '', stderr: '' }; }
  unitState(unit: string): UnitState { return this.states.get(unit) ?? 'gone'; }
  unitMemoryGb(): number | null { return 2; }
  unitJavaCount(): number | null { return this.javaCount; }
  liveUnits(prefix: string): string[] | null { return this.live === null ? null : [...this.live, ...[...this.held.keys()].filter((u) => u.startsWith(prefix))]; }
  runInSlice(command: string, cwd: string) { this.inSlice.push(command); return this.run(['bash', '-c', command], { cwd }); }
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
  const warehouseFile = path.join(w.root, 'warehouse.json');
  fs.writeFileSync(warehouseFile, JSON.stringify({ ...WAREHOUSE_SAMPLE, seeds: [1, 2], cards: [...WAREHOUSE_SAMPLE.cards, { cube: 'synergy', card: '/home/justin-a/x', games: 200, winRate: 0.5, lo: 0.4, hi: 0.6 }] }));
  const r = new Runner({ ...w.cfg, ladderFile, warehouseFile }, w.sys);
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
  assert.equal(git(w.fc, 'ls-tree', '--name-only', 'lab-status'), 'ladder.json\nstatus.json\nwarehouse.json');
  assert.deepEqual(JSON.parse(show(w.fc, 'lab-status:ladder.json')), sanitiseLadder(LADDER));
  // D363: the warehouse summary, sanitised: the sample passes whole; the extra key and the path-like card do not.
  assert.deepEqual(JSON.parse(show(w.fc, 'lab-status:warehouse.json')), WAREHOUSE_SAMPLE);
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
  const w = world({ 'J016-x.md': NEW_JOB.replace('id: J010', 'id: J016').replace('max_workers: 3', 'max_workers: 4\ncontrol: yes') });
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
  w.sys.javaCount = 4;
  for (let i = 0; i < 4; i++) { w.sys.t += 10_000; r.tick(); }
  assert.deepEqual(ctl(), { paused: false, maxWorkers: 3 });   // one drop: the next waits until a JVM has left
  w.sys.javaCount = 3;
  for (let i = 0; i < 2; i++) { w.sys.t += 10_000; r.tick(); }
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

test('runner: memory pressure stops one co-scheduled job at a time, never every job at once', () => {
  // Two one-worker heavy jobs side by side (a single-worker job cannot shed a worker: past the hard line it is stopped).
  const one = (id: string): string => NEW_JOB.replace('id: J010', `id: ${id}`).replace('max_workers: 3', 'max_workers: 1\ncores: 1\ncontrol: yes').replace('resumable: yes', 'resumable: no');
  const w = world({ 'J080-a.md': one('J080'), 'J081-b.md': one('J081') });
  const r = new Runner(w.cfg, w.sys);
  r.reconcile();
  w.sys.mode = 'hold';
  r.tick();
  for (const step of ['prepare', 'pilot1']) { for (const id of ['J080', 'J081']) w.sys.release(`lab-${id}-${step}`, 'ok'); r.tick(); }
  assert.deepEqual(['J080', 'J081'].map((id) => r.runs.get(id)?.unit), ['lab-J080-run1', 'lab-J081-run1']);
  // The host's pressure goes past the hard line and stays there.
  w.sys.some10 = 50;
  const stoppedAt = new Map<string, number>();
  const step = (): void => { w.sys.t += 10_000; r.tick(); for (const u of w.sys.stopped) if (!stoppedAt.has(u)) stoppedAt.set(u, w.sys.t); };
  for (let i = 0; i < 4; i++) step();
  assert.deepEqual(w.sys.stopped, ['lab-J080-run1'], 'one job stopped, the other keeps running while memory is freed');
  assert.equal(r.runs.get('J081')?.unit, 'lab-J081-run1');
  assert.equal(r.runs.get('J081')?.outcome, null);
  assert.equal(r.runs.get('J080')?.outcome?.state, 'waiting');
  assert.ok(w.sys.lines.some((l) => /^J081: memory stop held back \(J080 is stopping for memory\)/.test(l)), w.sys.lines.join('\n'));
  // Pressure that stays high after the first has gone and settled stops the next, in its turn: not within a minute.
  for (let i = 0; i < 12 && w.sys.stopped.length < 2; i++) step();
  assert.deepEqual(w.sys.stopped, ['lab-J080-run1', 'lab-J081-run1']);
  const gap = (stoppedAt.get('lab-J081-run1') ?? 0) - (stoppedAt.get('lab-J080-run1') ?? 0);
  assert.ok(gap >= 60_000 && gap <= 100_000, `${gap} ms between the two stops`);
  // A job whose OWN memory is at its unit's cap is stopped whatever the other does: no other stop relieves it.
  const w2 = world({ 'J080-a.md': one('J080'), 'J081-b.md': one('J081') });
  const r2 = new Runner(w2.cfg, w2.sys);
  r2.reconcile();
  w2.sys.mode = 'hold';
  r2.tick();
  for (const st of ['prepare', 'pilot1']) { for (const id of ['J080', 'J081']) w2.sys.release(`lab-${id}-${st}`, 'ok'); r2.tick(); }
  w2.sys.unitMemoryGb = () => 20.5;     // past 95 % of the 21 GB MemoryMax
  for (let i = 0; i < 4; i++) { w2.sys.t += 10_000; r2.tick(); }
  assert.deepEqual(w2.sys.stopped, ['lab-J080-run1', 'lab-J081-run1']);
});

test('runner: Justin at the table holds a running heavy job and starts none', () => {
  // J018 is 7 wide: it would wait for cores beside J017 (3 + 7 > 8) anyway; while Justin plays, the reason is him.
  const w = world({ 'J017-x.md': NEW_JOB.replace('id: J010', 'id: J017'), 'J018-y.md': NEW_JOB.replace('id: J010', 'id: J018').replace('max_workers: 3', 'max_workers: 7') });
  const r = new Runner(w.cfg, w.sys);
  r.reconcile();
  w.sys.mode = 'hold';
  w.sys.isPlaying = true;
  r.tick();
  assert.equal(r.runs.size, 0);                 // nothing heavy starts while Justin plays
  w.sys.isPlaying = false;
  r.tick();
  assert.deepEqual([...r.runs.keys()], ['J017']);
  assert.equal(r.blocked.find((b) => b.id === 'J018')?.code, 'cores');
  w.sys.release('lab-J017-prepare', 'ok');
  r.tick();
  w.sys.isPlaying = true;
  r.tick();
  assert.deepEqual(JSON.parse(fs.readFileSync(r.controlFile('J017'), 'utf8')).paused, true);
  assert.equal(r.runs.get('J017')?.events.at(-1)?.kind, 'playing');
  assert.equal(r.blocked.find((b) => b.id === 'J018')?.code, 'playing');
  w.sys.isPlaying = false;
  r.tick();
  assert.equal(JSON.parse(fs.readFileSync(r.controlFile('J017'), 'utf8')).paused, false);
  assert.equal(r.runs.has('J018'), false);
  // With co-scheduling off, one heavy job at a time, however narrow.
  const w2 = world({ 'J017-x.md': NEW_JOB.replace('id: J010', 'id: J017'), 'J018-y.md': NEW_JOB.replace('id: J010', 'id: J018') });
  const r2 = new Runner({ ...w2.cfg, coSchedule: false }, w2.sys);
  r2.reconcile();
  w2.sys.mode = 'hold';
  r2.tick();
  assert.deepEqual([...r2.runs.keys()], ['J017']);
  assert.equal(r2.blocked.find((b) => b.id === 'J018')?.code, 'heavy-busy');
});

const NARROW_JOB = `id: J060
title: A wide step, then a narrow one
cpu: heavy
repos: mtg-table@main
max_workers: 7
mem_per_worker_gb: 2
metrics: n = lines var/p60.jsonl

## Pilot
\`\`\`bash
mkdir -p var
echo '{}' > var/p60.jsonl
\`\`\`
check: n == 1

## Commands
\`\`\`bash
echo "wide {workers} $JOBS" >> var/j060.txt
\`\`\`
cores: 1
\`\`\`bash
echo "narrow {workers} $JOBS" >> var/j060.txt
\`\`\`
`;

test('runner: co-scheduling end to end: a wide job waits, then starts beside a narrow step, in a lane of its own sharing var/', () => {
  // J061: the same two blocks with no cores: line (both 7 wide), 2.5 GB a worker; J062: one core.
  const wide = NARROW_JOB.replace('id: J060', 'id: J061').replace('mem_per_worker_gb: 2', 'mem_per_worker_gb: 2.5').replace(/p60/g, 'p61').replace(/j060/g, 'j061').replace(/cores: 1\n/, '');
  const w = world({ 'J060-a.md': NARROW_JOB, 'J061-b.md': wide, 'J062-c.md': NARROW_JOB.replace('id: J060', 'id: J062').replace('max_workers: 7', 'cores: 1').replace(/p60/g, 'p62') });
  const r = new Runner(w.cfg, w.sys);
  r.reconcile();
  w.sys.mode = 'hold';
  r.tick();
  // J060 starts alone, 7 wide: J061 (7) does not fit and J062 waits behind it (order, no starvation).
  assert.deepEqual([...r.runs.keys()], ['J060']);
  assert.deepEqual(r.blocked.map((b) => [b.id, b.code]), [['J061', 'cores'], ['J062', 'heavy-busy']]);
  w.sys.release('lab-J060-prepare', 'ok'); r.tick();
  w.sys.release('lab-J060-pilot1', 'ok'); r.tick();
  assert.equal(r.runs.get('J060')?.unit, 'lab-J060-run1');
  assert.equal(r.runs.has('J061'), false);
  w.sys.release('lab-J060-run1', 'ok'); r.tick();
  // J060's narrow step (cores: 1) leaves 7 of 8 cores, and 2 + 17.5 of 21 GB: J061 starts beside it, in lane 2.
  const a = r.runs.get('J060')!, b = r.runs.get('J061')!;
  assert.equal(a.unit, 'lab-J060-run2');
  assert.equal(b.lane, 1);
  assert.equal(r.blocked.find((x) => x.id === 'J062')?.code, 'cores');
  assert.equal(w.sys.started.find((u) => u.unit === 'lab-J060-run1')?.env.JOBS, '7');
  assert.equal(w.sys.started.find((u) => u.unit === 'lab-J060-run2')?.env.JOBS, '1');
  // Every step's BLAS / OpenMP threads are capped at its width: the narrow block's 1, the wide one's 7.
  assert.equal(w.sys.started.find((u) => u.unit === 'lab-J060-run2')?.env.OMP_NUM_THREADS, '1');
  assert.equal(w.sys.started.find((u) => u.unit === 'lab-J060-run1')?.env.OMP_NUM_THREADS, '7');
  const doc = r.statusDoc();
  assert.deepEqual([doc.host.coresUsed, doc.host.coresTotal], [8, 8]);
  assert.deepEqual(doc.running.map((x) => [x.id, x.cores]), [['J060', 1], ['J061', 7]]);
  assert.deepEqual([sanitise(doc).host.coresUsed, sanitise(doc).host.coresTotal, sanitise(doc).running[1]?.cores], [8, 8, 7]);
  // J061's prepare: its own clone, var/ a symlink to lane 1's.
  const lane2 = path.join(w.cfg.labRoot, 'mtg-table-lane2');
  assert.equal(w.sys.started.find((u) => u.unit === 'lab-J061-prepare')?.env.MTG_TABLE, lane2);
  w.sys.release('lab-J061-prepare', 'ok'); r.tick();
  assert.ok(fs.lstatSync(path.join(lane2, 'var')).isSymbolicLink());
  assert.equal(fs.readlinkSync(path.join(lane2, 'var')), path.join(w.cfg.labRoot, 'mtg-table', 'var'));
  assert.equal(git(lane2, 'status', '--porcelain'), '');                                  // the link is not an untracked file
  w.sys.release('lab-J061-pilot1', 'ok'); r.tick();
  assert.ok(fs.existsSync(path.join(w.cfg.labRoot, 'mtg-table', 'var', 'p61.jsonl')));     // written through the symlink
  // J061's pilot passed beside J060: it was sized against the memory J060 leaves (21 - 2 GB: 6 workers at 2.5 GB).
  assert.equal(b.unit, 'lab-J061-run1');
  assert.equal(b.workers, 6);
  assert.match(b.sizing?.detail ?? '', /memory 6.*budget 19 GB/);
  // Now J061 holds 6: J062 (one core) fits too (1 + 6 + 1 = 8), in a third lane.
  assert.equal(r.runs.get('J062')?.lane, 2);
  assert.deepEqual([r.statusDoc().host.coresUsed, r.statusDoc().running.length], [8, 3]);
  w.sys.release('lab-J060-run2', 'ok'); r.tick();
  assert.equal(a.outcome?.state, 'done', w.sys.lines.join('\n'));
  assert.equal(fs.readFileSync(path.join(w.cfg.labRoot, 'mtg-table', 'var', 'j060.txt'), 'utf8'), 'wide 7 7\nnarrow 1 1\n');
  w.sys.release('lab-J061-run1', 'ok'); r.tick();
  w.sys.release('lab-J061-run2', 'ok'); r.tick();
  assert.equal(b.outcome?.state, 'done', w.sys.lines.join('\n'));
  // J061's second block has no cores: line of its own: its width and {workers} are the job's.
  assert.equal(fs.readFileSync(path.join(w.cfg.labRoot, 'mtg-table', 'var', 'j061.txt'), 'utf8'), 'wide 6 6\nnarrow 6 6\n');
  // A narrow block that declares its memory (mem_gb: 15) reserves it: J061's 17.5 GB does not fit beside it.
  const w2 = world({ 'J060-a.md': NARROW_JOB.replace('cores: 1\n', 'cores: 1\nmem_gb: 15\n'), 'J061-b.md': wide });
  const r2 = new Runner(w2.cfg, w2.sys);
  r2.reconcile();
  w2.sys.mode = 'hold';
  r2.tick();
  for (const u of ['prepare', 'pilot1', 'run1']) { w2.sys.release(`lab-J060-${u}`, 'ok'); r2.tick(); }
  assert.equal(r2.runs.get('J060')?.unit, 'lab-J060-run2');
  assert.deepEqual(r2.holding(r2.runs.get('J060')!), { cores: 1, memGb: 15 });
  assert.equal(r2.runs.has('J061'), false);
  assert.match(r2.blocked.find((x) => x.id === 'J061')?.reason ?? '', /needs 17\.5 GB; 6 of 21 GB free/);
});


test('runner: the thread cap is the step\'s width (max_workers: 1, a 7-worker block, a cores: 1 block); plan shows it; a block\'s own export wins', () => {
  // J070: width 1 from max_workers: 1, no cores: line (a width the old cap, declared cores: only, missed).
  const one = NARROW_JOB.replace('id: J060', 'id: J070').replace('max_workers: 7', 'max_workers: 1').replace(/p60/g, 'p70').replace(/j060/g, 'j070').replace(/cores: 1\n/, '')
    .replace('echo "narrow {workers} $JOBS" >> var/j070.txt', 'echo "narrow $OMP_NUM_THREADS $VECLIB_MAXIMUM_THREADS" >> var/j070.txt\nexport OPENBLAS_NUM_THREADS=3\necho "own $OPENBLAS_NUM_THREADS" >> var/j070.txt');
  const w = world({ 'J060-a.md': NARROW_JOB, 'J070-b.md': one });
  const out: string[] = [];
  assert.equal(new Runner(w.cfg, w.sys).plan('J060', (l) => out.push(l)), 0);
  const text = out.join('\n');
  const unitLine = (step: string): string => out.find((l) => l.startsWith('[dry-run] systemd-run') && l.includes(`--unit=lab-J060-${step} `)) ?? '';
  for (const k of THREAD_CAP_VARS) {
    assert.ok(unitLine('run1').includes(`--setenv=${k}=7 `), `run1 (7 workers): ${k}`);
    assert.ok(unitLine('run2').includes(`--setenv=${k}=1 `), `run2 (cores: 1): ${k}`);
    assert.ok(unitLine('pilot1').includes(`--setenv=${k}=7 `), `pilot1 (admitted at 7): ${k}`);
  }
  assert.match(text, /-- run1 [^\n]*\n(?:   \| [^\n]*\n)*   threads: 7 \(the step's width; OMP_NUM_THREADS, OPENBLAS_NUM_THREADS, MKL_NUM_THREADS, NUMEXPR_NUM_THREADS, VECLIB_MAXIMUM_THREADS; an export in the block wins\)/);
  assert.match(text, /-- run2 [^\n]*\n(?:   \| [^\n]*\n)*   threads: 1 /);
  // J070 (max_workers: 1) is width 1 in every step, and runs that way: the unit's caps reach the block, its own export wins.
  const r = new Runner(w.cfg, w.sys);
  const p70: string[] = [];
  r.plan('J070', (l) => p70.push(l));
  assert.ok(p70.filter((l) => l.startsWith('[dry-run] systemd-run')).every((l) => l.includes('--setenv=OMP_NUM_THREADS=1 ') && l.includes('--setenv=OPENBLAS_NUM_THREADS=1 ')));
  r.reconcile();
  for (let i = 0; i < 12 && !fs.existsSync(path.join(w.cfg.labRoot, 'mtg-table', 'var', 'j070.txt')); i++) { w.sys.t += 61_000; r.tick(); }
  for (let i = 0; i < 12 && !/own/.test(fs.readFileSync(path.join(w.cfg.labRoot, 'mtg-table', 'var', 'j070.txt'), 'utf8')); i++) { w.sys.t += 61_000; r.tick(); }
  assert.equal(fs.readFileSync(path.join(w.cfg.labRoot, 'mtg-table', 'var', 'j070.txt'), 'utf8'), 'wide 1 1\nnarrow 1 1\nown 3\n');
  const started = w.sys.started.filter((u) => u.unit.startsWith('lab-J070-'));
  assert.ok(started.length >= 3 && started.every((u) => u.env.OMP_NUM_THREADS === '1'), started.map((u) => `${u.unit} ${u.env.OMP_NUM_THREADS}`).join(', '));
  assert.match(fs.readFileSync(path.join(r.jobDir('J070'), 'run2.log'), 'utf8'), /1 worker\(s\), 1 core\(s\), BLAS\/OpenMP threads 1/);
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

// ------------------------------------------------------------------ the review's fixes (D337)

/** A runner held at run1 of a job, under the fake systemd. */
function heldAtRun1(id: string, jobText = NEW_JOB, cfg: Partial<RunnerConfig> = {}): { w: World; r: Runner } {
  const w = world({ [`${id}-x.md`]: jobText.replace('id: J010', `id: ${id}`) });
  const r = new Runner({ ...w.cfg, ...cfg }, w.sys);
  r.reconcile();
  w.sys.mode = 'hold';
  r.tick();
  w.sys.release(`lab-${id}-prepare`, 'ok');
  r.tick();
  w.sys.release(`lab-${id}-pilot1`, 'ok');
  r.tick();
  return { w, r };
}

test('review: a unit whose state is unknown (systemctl timed out) is still running — never orphaned, never started twice', () => {
  const { w, r } = heldAtRun1('J040');
  const run = r.runs.get('J040')!;
  assert.equal(run.unit, 'lab-J040-run1');
  w.sys.states.set('lab-J040-run1', 'unknown');
  for (let i = 0; i < 3; i++) { w.sys.t += 10_000; r.tick(); }
  assert.equal(run.unit, 'lab-J040-run1');
  assert.equal(run.outcome, null);
  assert.equal(w.sys.started.filter((u) => u.unit === 'lab-J040-run1').length, 1);
  // Loaded but inactive, no exit code yet: wait for LoadState=not-found before calling it killed.
  w.sys.states.set('lab-J040-run1', 'inactive');
  w.sys.t += 10_000; r.tick();
  assert.equal(run.outcome, null);
  // A restart while systemctl does not answer: nothing is restarted either.
  w.sys.states.set('lab-J040-run1', 'unknown');
  const r2 = new Runner(w.cfg, w.sys);
  r2.reconcile();
  assert.equal(r2.runs.get('J040')?.unit, 'lab-J040-run1');
  assert.equal(r2.runs.get('J040')?.restarts.length, 0);
});

test('review: a step is never started while a unit of the same job is alive, or when systemctl cannot say', () => {
  const w = world({ 'J041-x.md': NEW_JOB.replace('id: J010', 'id: J041') });
  const r = new Runner(w.cfg, w.sys);
  r.reconcile();
  w.sys.live = ['lab-J041-pilot1'];
  r.tick();
  assert.deepEqual(w.sys.started.map((u) => u.unit), []);
  w.sys.live = null;
  w.sys.t += 10_000; r.tick();
  assert.deepEqual(w.sys.started.map((u) => u.unit), []);
  w.sys.live = [];
  w.sys.t += 10_000; r.tick();
  assert.equal(r.runs.get('J041')?.outcome?.state, 'done');
});

test('review: steps do not start while the runner is paused, Justin is at the table, or the backoff paused the job', () => {
  const w = world({ 'J042-x.md': NEW_JOB.replace('id: J010', 'id: J042') });
  const r = new Runner(w.cfg, w.sys);
  r.reconcile();
  w.sys.mode = 'hold';
  r.tick();
  assert.deepEqual(w.sys.started.map((u) => u.unit), ['lab-J042-prepare']);
  fs.writeFileSync(r.pausedFlag(), 'x');
  w.sys.release('lab-J042-prepare', 'ok');
  for (let i = 0; i < 3; i++) { w.sys.t += 10_000; r.tick(); }
  assert.deepEqual(w.sys.started.map((u) => u.unit), ['lab-J042-prepare']);
  fs.rmSync(r.pausedFlag());
  w.sys.isPlaying = true;
  w.sys.t += 10_000; r.tick();
  assert.deepEqual(w.sys.started.map((u) => u.unit), ['lab-J042-prepare']);
  w.sys.isPlaying = false;
  const run = r.runs.get('J042')!;
  run.backoff = { ...initialBackoff(2), paused: true };
  w.sys.t += 10_000; r.tick();
  assert.deepEqual(w.sys.started.map((u) => u.unit), ['lab-J042-prepare']);
  run.backoff = null;
  w.sys.t += 10_000; r.tick();
  assert.deepEqual(w.sys.started.map((u) => u.unit), ['lab-J042-prepare', 'lab-J042-pilot1']);
});

test('review: a stale pid file (a reused pid after a reboot) does not block the daemon; a live runner does', async () => {
  const { acquireLock, releaseLock } = await import('../../tools/runner/lock.ts');
  const f = path.join(tmp('lock'), 'daemon.pid');
  fs.writeFileSync(f, '4242');
  assert.equal(acquireLock(f, 100, () => null), null);                          // dead
  fs.writeFileSync(f, '4242');
  assert.equal(acquireLock(f, 100, () => '/usr/bin/firefox --new-window'), null); // alive, but not a runner
  assert.equal(fs.readFileSync(f, 'utf8'), '100');
  assert.equal(acquireLock(f, 200, () => 'node tools/runner/cli.ts daemon'), 100);  // a real runner holds it
  releaseLock(f, 200);
  assert.ok(fs.existsSync(f));
  releaseLock(f, 100);
  assert.ok(!fs.existsSync(f));
});

test('review: a dead network neither stalls monitoring nor makes the queue vanish; publishing backs off', () => {
  const { w, r } = heldAtRun1('J043');
  const run = r.runs.get('J043')!;
  w.sys.gitFails = new Set(['fetch', 'push', 'ls-tree', 'show']);
  const before = r.jobs.length;
  for (let i = 0; i < 8; i++) { w.sys.t += 70_000; r.tick(); }
  assert.equal(r.jobs.length, before);                      // kept, not emptied
  assert.equal(run.outcome, null);                          // the running job was not skipped as "removed"
  assert.equal(run.unit, 'lab-J043-run1');
  assert.ok((r.p.publishFailures ?? 0) >= 2, String(r.p.publishFailures));
  assert.ok((r.p.nextPublishAt ?? 0) > w.sys.t, 'the next publish waits');
  const tries = w.sys.lines.filter((l) => /publish failed/.test(l)).length;
  for (let i = 0; i < 6; i++) { w.sys.t += 10_000; r.tick(); }
  assert.ok(w.sys.lines.filter((l) => /publish failed/.test(l)).length - tries <= 1, 'not a push every tick');
  w.sys.gitFails.clear();
  w.sys.t += 31 * 60_000;
  r.tick();
  assert.equal(r.p.publishFailures, 0);
});

test('review: a job file must be missing from two successful reads before its running job stops', () => {
  const { w, r } = heldAtRun1('J044');
  git(w.seed, 'fetch', '--quiet', w.mtg, 'pc-jobs');
  git(w.seed, 'checkout', '--quiet', '-B', 'jobs-edit', 'FETCH_HEAD');
  git(w.seed, 'rm', '-q', 'jobs/J044-x.md');
  git(w.seed, 'commit', '--quiet', '-m', 'remove');
  git(w.seed, 'push', '--quiet', '--force', w.mtg, 'HEAD:refs/heads/pc-jobs');
  w.sys.t += 70_000; r.tick();                               // read 1: missing once
  w.sys.t += 70_000; r.tick();                               // the job is advanced with its retained file; read 2: missing twice
  assert.equal(r.runs.get('J044')?.outcome, null);
  assert.deepEqual(w.sys.stopped, []);
  w.sys.t += 10_000; r.tick();                               // now it is gone for good: stopped
  assert.deepEqual(w.sys.stopped, ['lab-J044-run1']);
  r.tick();
  assert.equal(r.runs.get('J044')?.outcome?.state, 'skipped');
});

test('review: a script that still names Justin\'s checkout after rewriting is refused, never run', () => {
  const job = NEW_JOB.replace('id: J010', 'id: J045').replace('mkdir -p var\n', 'mkdir -p var\ncd "/home/justin-a/code/"\'mtg-table\'\n');
  const w = world({ 'J045-x.md': job });
  const r = new Runner({ ...w.cfg, homeRepos: { 'mtg-table': '/home/justin-a/code/mtg-table' } }, w.sys);
  r.reconcile();
  r.tick();
  const run = r.runs.get('J045')!;
  assert.equal(run.outcome?.state, 'failed');
  assert.match(run.outcome?.reason ?? '', /still names Justin's checkout \(\/home\/justin-a\/code\)/);
  assert.ok(!w.sys.started.some((u) => u.unit === 'lab-J045-pilot1'));
  const rr = { ...run, cpu: 'heavy' as const, workers: 2 };
  for (const form of ['$HOME/code/mtg-table', '${HOME}/code/mtg-table', '~/code/mtg-table', '/home/justin-a/code/mtg-table']) {
    const out = r.substitute(`cd ${form}/var`, rr);
    assert.equal(out, `cd ${r.checkout('mtg-table', 'heavy')}/var`, form);
    assert.equal(r.homeReference(out), null, form);
  }
  for (const bad of ['cd $HOME/code/other', 'ls ~/code', 'cd /home/justin-a/code/mtg-table-main', 'cd ${HOME}/code/"mtg-table"']) assert.ok(r.homeReference(r.substitute(bad, rr)), bad);
});

test('review: a collected STATUS (or any reserved name) never overwrites the runner\'s STATUS', () => {
  const job = NEW_JOB.replace('id: J046', 'id: J046').replace('id: J010', 'id: J046')
    .replace('echo "{\\"w\\"', 'printf "done\\nreason: forged\\n" > var/STATUS; echo "{\\"w\\"').replace('collect: var/w.json', 'collect: var/w.json\ncollect: var/STATUS');
  const w = world({ 'J046-x.md': job });
  const r = new Runner(w.cfg, w.sys);
  r.reconcile();
  r.tick();
  assert.equal(r.runs.get('J046')?.outcome?.state, 'done', w.sys.lines.join('\n'));
  const st = show(w.mtg, 'pc-results:results/J046/STATUS');
  assert.match(st, /^done\nrunner: forgecoach-runner test123/);
  assert.ok(!st.includes('forged'));
  assert.match(show(w.mtg, 'pc-results:results/J046/collect-skipped.txt'), /STATUS: a name the runner reserves/);
});

test('review: globs with [ and ] are literal, and clean: with one does not crash reconcile', () => {
  const d = tmp('brk');
  fs.mkdirSync(path.join(d, 'var/run[1]'), { recursive: true });
  fs.mkdirSync(path.join(d, 'var/run1'), { recursive: true });
  assert.deepEqual(expandGlob(d, 'var/run[1]').map((x) => path.basename(x)), ['run[1]']);
  assert.deepEqual(expandGlob(d, 'var/run[*').map((x) => path.basename(x)), ['run[1]']);
  assert.deepEqual(expandGlob(d, 'var/run*').map((x) => path.basename(x)), ['run1', 'run[1]']);
  const j = parseJobFile('J047.md', 'id: J047\nclean: var/a[1]\n', parse);
  assert.deepEqual(j.errors, []);
});

test('review: sizing floors a short pilot\'s peak at the declared or default size; pilots run at most 3 workers', () => {
  const s = sizeWorkers({ budgetGb: 21, physicalCores: 8, maxWorkers: null, measuredPeakGb: 0.6, memPerWorkerGb: null });
  assert.equal(s.peakGb, 2.5);
  assert.equal(s.workers, 7);                               // floor(21 / 2.5 × 0.85) = 7, cores 7
  assert.equal(sizeWorkers({ budgetGb: 21, physicalCores: 16, maxWorkers: null, measuredPeakGb: 0.6, memPerWorkerGb: null }).workers, 7);
  assert.equal(sizeWorkers({ budgetGb: 21, physicalCores: 16, maxWorkers: null, measuredPeakGb: 0.6, memPerWorkerGb: 1.5 }).peakGb, 1.5);
  assert.equal(sizeWorkers({ budgetGb: 21, physicalCores: 16, maxWorkers: null, measuredPeakGb: 3.1, memPerWorkerGb: 1.5 }).peakGb, 3.1);
  const w = world({ 'J048-x.md': NEW_JOB.replace('id: J010', 'id: J048').replace('max_workers: 3', 'max_workers: 7') });
  const r = new Runner(w.cfg, w.sys);
  r.reconcile();
  r.tick();
  assert.equal(w.sys.started.find((u) => u.unit === 'lab-J048-pilot1')?.env.JOBS, '3');
  assert.equal(w.sys.started.find((u) => u.unit === 'lab-J048-run1')?.env.JOBS, '7');
});

test('review: control is detected after prepare (an old checkout has no control file); a job that cannot be told is only stopped', () => {
  const { w, r } = heldAtRun1('J049');
  const run = r.runs.get('J049')!;
  assert.equal(run.canControl, false);                      // NEW_JOB says nothing, and the fake checkout has no tools/runner/control.ts
  w.sys.some10 = 15;
  w.sys.javaCount = 3;
  for (let i = 0; i < 6; i++) { w.sys.t += 10_000; r.tick(); }
  assert.deepEqual(run.events.map((e) => e.kind), []);      // no fictional drops
  const job = parseJobFile('x.md', `${NEW_JOB}`, parse);
  const lab = r.checkout('mtg-table', 'heavy');
  fs.mkdirSync(path.join(lab, 'tools/runner'), { recursive: true });
  fs.writeFileSync(path.join(lab, 'tools/runner/control.ts'), '');
  assert.equal(r.detectControl(run, job), false);           // the job runs none of ai-bench, the cube lab, the ladder
  const cube = parseJobFile('x.md', NEW_JOB.replace('mkdir -p var', 'mkdir -p var\ntrue tools/cubelab.sh run'), parse);
  assert.equal(r.detectControl(run, cube), true);
  assert.equal(parseJobFile('x.md', NEW_JOB.replace('max_workers', 'control: no\nmax_workers'), parse).control, false);
});

test('review: three memory stops fail the job instead of retrying it forever; a retry checks out the same commit', () => {
  const job = NEW_JOB.replace('max_workers: 3', 'max_workers: 4\ncontrol: yes');
  const { w, r } = heldAtRun1('J050', job);
  const first = r.runs.get('J050')!;
  const pinned = first.pinned?.['mtg-table'];
  assert.match(pinned ?? '', /^[0-9a-f]{40}$/);
  // main moves on: a retry must not pick the new commit up (D341: runs refuse to resume across code changes).
  git(w.seed, 'fetch', '--quiet', w.mtg, 'main');
  git(w.seed, 'checkout', '--quiet', '-B', 'main-edit', 'FETCH_HEAD');
  fs.writeFileSync(path.join(w.seed, 'moved.txt'), 'x');
  git(w.seed, 'add', 'moved.txt');
  git(w.seed, 'commit', '--quiet', '-m', 'main moved');
  git(w.seed, 'push', '--quiet', w.mtg, 'HEAD:refs/heads/main');
  for (let stop = 1; stop <= 3; stop++) {
    const run = r.runs.get('J050')!;
    w.sys.release(run.unit as string, 'killed');            // no exit code, unit gone: a memory stop
    w.sys.t += 10_000; r.tick();
    const st = parseStatus(show(w.mtg, 'pc-results:results/J050/STATUS'))!;
    if (stop < 3) {
      assert.equal(st.state, 'waiting', `stop ${stop}`);
      assert.equal(st.fields.memory_stops, String(stop));
      w.sys.t += 16 * 60_000; r.tick();                       // the retry: prepare (held), then run1
      const again = r.runs.get('J050')!;
      w.sys.release('lab-J050-prepare', 'ok');
      r.tick();
      assert.equal(again.unit, 'lab-J050-run1');
      assert.equal(again.pinned?.['mtg-table'], pinned);
      assert.equal(git(r.checkout('mtg-table', 'heavy'), 'rev-parse', 'HEAD'), pinned);
    } else {
      assert.equal(st.state, 'failed');
      assert.match(st.fields.reason ?? '', /^memory: stopped 3 times/);
    }
  }
});

test('review: approve works in its own worktree, checks every git step, and says so when it cannot push', () => {
  const w = world({ 'J051-old.md': OLD_JOB.replace('J011', 'J051') });
  const r = new Runner(w.cfg, w.sys);
  r.reconcile();
  r.tick();
  assert.equal(r.runs.get('J051')?.outcome?.state, 'waiting');
  w.sys.gitFails = new Set(['push']);
  assert.throws(() => r.approve('J051', 'claude'), /refused three times/);
  assert.ok(!/approved:/.test(show(w.mtg, 'pc-results:results/J051/STATUS')));
  w.sys.gitFails.clear();
  r.approve('J051', 'claude', 'pilot looks right');
  assert.match(show(w.mtg, 'pc-results:results/J051/STATUS'), /approved: .* by claude: pilot looks right/);
  assert.equal(fs.readdirSync(w.cfg.stateDir).filter((f) => f.startsWith('approve-')).length, 0);
  assert.throws(() => r.approve('J999', 'claude'), /STATUS is missing/);
});

test('review: sh: metrics run in the lab slice; a stale git lock in the runner\'s own repos is cleared at start', () => {
  const w = world({ 'J052-x.md': NEW_JOB.replace('id: J010', 'id: J052') });
  const r = new Runner(w.cfg, w.sys);
  r.reconcile();
  r.tick();
  assert.equal(r.runs.get('J052')?.outcome?.state, 'done');
  assert.deepEqual(w.sys.inSlice, ['cat var/w.json']);
  const lockFile = path.join(r.publicDir(), '.git', 'index.lock');
  fs.writeFileSync(lockFile, '');
  const removed = r.clearStaleGitLocks();
  assert.ok(removed.includes(lockFile));
  assert.ok(!fs.existsSync(lockFile));
});

// ------------------------------------------------------------------ the public copy's clock, the local server

/** A FakeSys whose load can be moved, so the public copy's content changes without a state change. */
function movableLoad(w: World): (load: number) => void {
  let load = 1;
  const base = w.sys.host.bind(w.sys);
  w.sys.host = () => ({ ...base(), load1: load });
  return (x: number) => { load = x; };
}

test('public copy: at most every minute when its content changed; every two minutes unchanged (the heartbeat); a failed push backs off', () => {
  const { w, r } = heldAtRun1('J060');
  const setLoad = movableLoad(w);
  const pushedAt = (): number | undefined => r.p.lastPublic;
  const t0 = pushedAt();
  assert.equal(t0, w.sys.t, 'the start (a state change) was pushed');
  assert.match(git(w.fc, 'log', '-1', '--format=%s', 'lab-status'), /^lab status /);
  // Changed, but under a minute: no push.
  w.sys.t += 30_000; setLoad(2); r.tick();
  assert.equal(pushedAt(), t0);
  // A minute on, still changed since the last push: pushed.
  w.sys.t += 31_000; r.tick();
  assert.equal(pushedAt(), w.sys.t);
  assert.equal(JSON.parse(show(w.fc, 'lab-status:status.json')).host.load1, 2);
  assert.equal(git(w.fc, 'rev-list', '--count', 'lab-status'), '1', 'one commit, replaced');
  const t1 = w.sys.t;
  // Nothing changed but the clock: no push at a minute, nor just under two.
  w.sys.t += 61_000; r.tick();
  w.sys.t += 58_000; r.tick();
  assert.equal(pushedAt(), t1);
  // At two minutes, a push anyway: the heartbeat is never older than that.
  w.sys.t += 1_000; r.tick();
  assert.equal(pushedAt(), w.sys.t);
  const pub = JSON.parse(show(w.fc, 'lab-status:status.json')) as StatusDoc;
  assert.equal(pub.heartbeat, isoLocal(w.sys.t));
  assert.equal(pub.state, 'running');
  assert.equal(pub.idleReason, null);
  // A failed push backs off (30 s, then 1 minute ...), and is not retried every tick.
  w.sys.gitFails = new Set(['push']);
  w.sys.t += 61_000; setLoad(3); r.tick();
  assert.equal(r.p.publicFailures, 1);
  assert.ok((r.p.nextPublicAt ?? 0) > w.sys.t);
  const fails = w.sys.lines.filter((l) => /^public status: failed/.test(l)).length;
  w.sys.t += 10_000; setLoad(4); r.tick();
  assert.equal(w.sys.lines.filter((l) => /^public status: failed/.test(l)).length, fails, 'waited out the backoff');
  w.sys.gitFails.clear();
  w.sys.t += 30_000; r.tick();
  assert.equal(r.p.publicFailures, 0);
  assert.equal(pushedAt(), w.sys.t);
  assert.equal(JSON.parse(show(w.fc, 'lab-status:status.json')).host.load1, 4);
});

test('public copy: idle says IDLE, since when and why; a change goes out within a minute; the intervals are config', () => {
  const w = world({ 'README.txt': 'no jobs\n' });
  const setLoad = movableLoad(w);
  const r = new Runner({ ...w.cfg, publicEveryMs: 30_000, publicHeartbeatMs: 10 * 60_000 }, w.sys);
  r.reconcile();
  r.tick();
  const t0 = r.p.lastPublic;
  assert.equal(t0, w.sys.t);
  const pub = JSON.parse(show(w.fc, 'lab-status:status.json')) as StatusDoc;
  assert.equal(pub.state, 'idle');
  assert.equal(pub.idleReason, 'queue empty');
  assert.equal(pub.idleSince, isoLocal(t0!));
  w.sys.t += 20_000; setLoad(5); r.tick();
  assert.equal(r.p.lastPublic, t0, 'under the configured 30 s');
  w.sys.t += 10_000; r.tick();
  assert.equal(r.p.lastPublic, w.sys.t, 'the configured 30 s');
  w.sys.t += 9 * 60_000; r.tick();
  assert.equal(r.p.lastPublic, w.sys.t - 9 * 60_000, 'unchanged: waits for the configured heartbeat');
  // idleSince holds across ticks.
  assert.equal(r.statusDoc().idleSince, isoLocal(t0!));
  assert.equal(DEFAULT_CONFIG.publicEveryMs, 60_000);
  assert.equal(DEFAULT_CONFIG.publicHeartbeatMs, 2 * 60_000);
});

test('idle reasons: paused, Justin (held in public), memory, blocked after J###, needs a check, a broken file, queue empty', () => {
  const b = (code: string, reason = '') => ({ code, reason });
  assert.equal(idleReasonOf([], false), 'queue empty');
  assert.equal(idleReasonOf([b('after', 'after J003')], true), 'paused');
  assert.equal(idleReasonOf([b('after', 'after J003'), b('playing', 'Justin is playing')], false), 'Justin playing');
  assert.equal(idleReasonOf([b('after', 'after J003'), b('memory', 'memory; retry after x')], false), 'memory backoff');
  assert.equal(idleReasonOf([b('needs-check'), b('after', 'after J003, J004')], false), 'blocked after J003');
  assert.equal(idleReasonOf([b('needs-check')], false), 'needs a check');
  assert.equal(idleReasonOf([b('invalid')], false), 'job file needs fixing');
  assert.equal(idleReasonOf([b('queued')], false), 'waiting');
  const base: StatusDoc = { schema: 1, updated: '2026-10-03T10:00:00-04:00', paused: false, host: { load1: 0, memUsedGb: 0, memTotalGb: 0, swapUsedMb: 0, pressure: 0, cpus: 0, budgetGb: 0 }, running: [], queue: [], waiting: [], finished: [] };
  const idle = (idleReason: string) => sanitise({ ...base, heartbeat: '2026-10-03T10:00:05-04:00', state: 'idle', idleSince: '2026-10-03T09:00:00-04:00', idleReason });
  assert.equal(idle('Justin playing').idleReason, 'held', 'no presence in public');
  assert.equal(idle('blocked after J012').idleReason, 'blocked after J012');
  assert.equal(idle('blocked after /home/x').idleReason, 'waiting');
  assert.equal(idle('free text with a card name').idleReason, 'waiting');
  assert.equal(idle('queue empty').heartbeat, '2026-10-03T10:00:05-04:00');
  assert.equal(idle('queue empty').idleSince, '2026-10-03T09:00:00-04:00');
  // An older private doc without the fields: derived, heartbeat from updated.
  const old = sanitise(base);
  assert.equal(old.state, 'idle');
  assert.equal(old.heartbeat, base.updated);
  assert.equal(old.idleReason, null);
});

test('public copy: its signature ignores the clock (updated, elapsed, rate, ETA) and nothing else', () => {
  const doc = sanitise({ schema: 1, updated: '2026-10-03T10:00:00-04:00', paused: false, host: { load1: 1, memUsedGb: 1, memTotalGb: 2, swapUsedMb: 0, pressure: 0, cpus: 4, budgetGb: 1 },
    running: [{ id: 'J001', title: 'J001', cpu: 'heavy', phase: 'commands', started: '2026-10-03T09:00:00-04:00', elapsed: 3600, done: 5, total: 10, unit: 'games', ratePerHour: 5, eta: null, workers: 2, workersMax: 2, errors: 0, paused: false, dataUpdated: null, pressureEvents: [] }],
    queue: [], waiting: [], finished: [] });
  const later = { ...doc, updated: '2026-10-03T10:01:00-04:00', running: [{ ...doc.running[0]!, elapsed: 3660, ratePerHour: 4.9, eta: '2026-10-03T11:02:00-04:00' }] };
  assert.equal(publicSignature(later), publicSignature(doc));
  assert.notEqual(publicSignature({ ...later, running: [{ ...later.running[0]!, done: 6 }] }), publicSignature(doc));
  assert.notEqual(publicSignature(doc, '10:1'), publicSignature(doc, '10:2'), 'a new ladder.json is a change');
});

const PRIVATE_DOC = (): StatusDoc => ({
  schema: 1, updated: '2026-10-03T10:00:00-04:00', paused: false,
  host: { load1: 1, memUsedGb: 1, memTotalGb: 2, swapUsedMb: 0, pressure: 0, cpus: 4, budgetGb: 1 },
  running: [{ id: 'J001', title: 'Secret deck /home/justin-a/x', cpu: 'heavy', phase: 'commands', started: null, elapsed: 0, done: 1, total: 2, unit: 'games', ratePerHour: null, eta: null, workers: 1, workersMax: 1, errors: 0, paused: false, dataUpdated: null, pressureEvents: [], detail: 'lab-J001-run1' }],
  queue: [], waiting: [], finished: [], runner: { commit: 'abc', started: '2026-10-03T09:00:00-04:00', dryRun: false },
});
const SRC = (ladder: string | null = null): StatusSource => ({ status: PRIVATE_DOC, ladder: () => ladder });

test('local server: CORS names the site and localhost dev origins only, never *; others are refused', () => {
  assert.ok(originAllowed('https://jalirkan.github.io'));
  for (const o of ['http://localhost:5173', 'http://127.0.0.1:4173', 'http://[::1]:5173']) assert.ok(originAllowed(o), o);
  for (const o of ['https://evil.example', 'https://jalirkan.github.io.evil.example', 'http://jalirkan.github.io', 'https://localhost.evil.example:5173', 'null', '*', '']) assert.ok(!originAllowed(o), o);
  const ok = answer('GET', '/public-status.json', { origin: 'https://jalirkan.github.io' }, SRC());
  assert.equal(ok.status, 200);
  assert.equal(ok.headers['Access-Control-Allow-Origin'], 'https://jalirkan.github.io');
  assert.equal(ok.headers.Vary, 'Origin');
  const bad = answer('GET', '/public-status.json', { origin: 'https://evil.example' }, SRC());
  assert.equal(bad.status, 403);
  assert.equal(bad.headers['Access-Control-Allow-Origin'], undefined);
  assert.ok(!bad.body.includes('J001'));
  const curl = answer('GET', '/public-status.json?t=1', {}, SRC());
  assert.equal(curl.status, 200);
  assert.equal(curl.headers['Access-Control-Allow-Origin'], undefined);
  for (const r of [ok, bad, curl]) assert.ok(!Object.values(r.headers).includes('*'));
});

test('local server: the Private Network Access preflight is answered', () => {
  const pre = answer('OPTIONS', '/public-status.json', { origin: 'https://jalirkan.github.io', 'access-control-request-method': 'GET', 'access-control-request-private-network': 'true' }, SRC());
  assert.equal(pre.status, 204);
  assert.equal(pre.headers['Access-Control-Allow-Private-Network'], 'true');
  assert.equal(pre.headers['Access-Control-Allow-Origin'], 'https://jalirkan.github.io');
  assert.equal(pre.headers['Access-Control-Allow-Methods'], 'GET');
  assert.equal(answer('OPTIONS', '/public-status.json', { origin: 'https://evil.example', 'access-control-request-private-network': 'true' }, SRC()).status, 403);
});

test('local server: only the public copies — status sanitised, ladder as sanitised, nothing else', () => {
  const st = answer('GET', '/public-status.json', {}, SRC());
  const doc = JSON.parse(st.body) as StatusDoc;
  assert.deepEqual(doc, sanitise(PRIVATE_DOC()));
  assert.equal(doc.running[0]?.title, 'J001');
  for (const leak of ['Secret', 'justin-a', 'lab-J001-run1', '"runner"', 'detail']) assert.ok(!st.body.includes(leak), leak);
  assert.equal(answer('GET', '/status.json', {}, SRC()).body, st.body, 'the old path is the same public copy');
  assert.equal(answer('GET', '/public-ladder.json', {}, SRC()).status, 404);
  assert.equal(answer('GET', '/public-ladder.json', {}, SRC('{"schema":1}\n')).body, '{"schema":1}');
  assert.equal(answer('GET', '/public-warehouse.json', {}, SRC()).status, 404);
  assert.equal(answer('GET', '/public-warehouse.json', {}, { ...SRC(), warehouse: () => '{"schema":1}\n' }).body, '{"schema":1}');
  for (const p of ['/warehouse.json', '/status.public.json', '/runner.json', '/../status.json', '/jobs/J001/run1.log', '/ladder.json']) assert.equal(answer('GET', p, {}, SRC()).status, 404, p);
  assert.equal(answer('POST', '/public-status.json', {}, SRC()).status, 405);
  assert.equal(answer('GET', '/public-status.json', {}, { status: () => null, ladder: () => null }).status, 503);
});

test('local server: binds 127.0.0.1 and answers over HTTP with the same headers', async () => {
  const server = await serveStatus(0, SRC('{"schema":1}\n'));
  try {
    const a = server.address();
    assert.ok(a && typeof a === 'object');
    assert.equal(a.address, '127.0.0.1');
    const base = `http://127.0.0.1:${a.port}`;
    const pre = await fetch(`${base}/public-status.json`, { method: 'OPTIONS', headers: { Origin: 'https://jalirkan.github.io', 'Access-Control-Request-Private-Network': 'true', 'Access-Control-Request-Method': 'GET' } });
    assert.equal(pre.status, 204);
    assert.equal(pre.headers.get('access-control-allow-private-network'), 'true');
    const res = await fetch(`${base}/public-status.json`, { headers: { Origin: 'http://localhost:5173' } });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.equal(((await res.json()) as StatusDoc).running[0]?.title, 'J001');
    const lad = await fetch(`${base}/public-ladder.json`);
    assert.equal(await lad.text(), '{"schema":1}');
    assert.equal((await fetch(`${base}/public-status.json`, { headers: { Origin: 'https://evil.example' } })).status, 403);
  } finally {
    await new Promise((res) => server.close(res));
  }
});

test('runner: a running job publishes its live metrics (headline first), its memory and its step', () => {
  const { w, r } = heldAtRun1('J061');
  w.sys.t += 61_000;
  r.tick();
  const pub = JSON.parse(show(w.fc, 'lab-status:status.json')) as StatusDoc;
  const job = pub.running[0]!;
  assert.equal(job.id, 'J061');
  assert.equal(job.phase, 'commands 1/1');
  assert.equal(Object.keys(job.live ?? {})[0], 'n');
  assert.equal(job.live?.n, 3);
  assert.equal(typeof job.live?.elapsed_s, 'number');
  assert.equal(job.memGb, 2);
  assert.deepEqual(job.cubes, []);
  assert.ok(!JSON.stringify(job).includes('lab-J061'), 'no unit name');
});
