// mtg-table — the lab runner: the loop (D337).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// One `tick()` (every 10 s under `tools/runner.sh daemon`, once under `once`):
//
//  1. fetch pc-jobs and pc-results (every minute), read the job files and STATUS files;
//  2. advance every job this runner runs: a step's unit still running is
//     MONITORED (pilot: the JVMs' peak RSS; always: memory pressure and the
//     backoff, Justin at the table, the timeout; every minute: progress,
//     metrics and the `abort:` lines); a step's unit that ended is READ (its
//     exit code file) and the next step starts;
//  3. start what the schedule allows (schedule.ts), one heavy and one light;
//  4. write var/runner/status.json; publish to pc-results (and the public
//     lab-status copy) every five minutes and on every job state change.
//
// A job is a list of STEPS, each a transient systemd unit in
// forgecoach-lab.slice (`lab-<id>-<step>`), except the runner's own checks:
//
//   prepare   check the job's refs out in the runner's own clones under the
//             lab root (~/code/lab/<repo>, `<repo>-light` for a light job, so a
//             light job beside a heavy one never moves its checkout) and build;
//   pilot<k>  the `## Pilot` blocks, at a sized {workers}; the JVMs' peak RSS is sampled;
//   pilot-checks  the pilot's metrics and `check:` lines, evaluated here (expr.ts).
//             No `check:` lines (an old job file): `waiting`, needs a human/Claude
//             check — nothing unchecked runs unattended.  Passed: the workers
//             for the full run are sized from the measured peak (sizing.ts);
//   run<k>    the `## Commands` blocks;
//   final-checks  the `## Commands` section's `check:` lines;
//   collect   `collect:` files and the logs into results/<id>/, the headline numbers.
//
// The runner's state lives in var/runner/ (jobs/<id>/run.json, the scripts,
// the logs, the control files) so a restarted runner RECONCILES: a step whose
// unit still runs is adopted; one that ended while the runner was down is read;
// one that died with it is resumed (resumable: yes: the step runs again and
// the tools skip what is done) or restarted from the top (resumable: no: the
// `clean:` paths moved aside first), and the STATUS says which.
//
// The runner writes FACTS: states, numbers, exit codes, log tails.  Judgement
// (summary.md) stays with the PC's Claude session, which reads them.

import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_BACKOFF, decide, initialBackoff, retryCap, type Action, type BackoffConfig, type BackoffState } from './backoff.ts';
import { writeControl } from './control.ts';
import { evaluate, parse as parseExpr, type Verdict } from './expr.ts';
import { sanitiseLadder } from './ladder.ts';
import { parseJobFile, type JobFile, type MetricSpec, type ProgressSpec } from './jobfile.ts';
import { EXTRACTORS, expandGlob, flatten, place, progressOf, rateAndEta, type Flat, type RateSample } from './metrics.ts';
import { budget as budgetOf, DEFAULT_BUDGET, sizeWorkers, unitName, type BudgetOptions, type Sizing, type UnitSpec } from './sizing.ts';
import { formatStatus, isOurs, parseStatus, schedule, idOrder, type Blocked, type Status } from './schedule.ts';
import { fit, headlineOf, isoLocal, REASONS, sanitise, type FinishedItem, type PressureEvent, type RunningJob, type StatusDoc } from './statusjson.ts';
import type { HostSample, Sys } from './sys.ts';

export interface RunnerConfig {
  /** The runner's own checkout (its commit is reported). */
  runnerDir: string;
  stateDir: string;
  /** ~/code/lab: the job clones, the pc-results worktree, the lab-status repo. */
  labRoot: string;
  /** Justin's checkouts: the clone reference and remote URL, and paths a job names that are rewritten to the lab's. */
  homeRepos: Record<string, string>;
  /** Remote URLs by repo; read from homeRepos' origin when absent. */
  urls: Record<string, string>;
  bridgePort: number;
  budget: BudgetOptions;
  backoff: BackoffConfig;
  publicStatus: boolean;
  publishEveryMs: number;
  fetchEveryMs: number;
  metricsEveryMs: number;
  commit: string;
  /** Tests: never push. */
  push: boolean;
  /** The AI ladder's ladder.json to publish (sanitised) beside status.json; null: <lab>/mtg-table/var/ai-ladder/ladder.json. */
  ladderFile?: string | null;
}

export const DEFAULT_CONFIG: Omit<RunnerConfig, 'runnerDir' | 'stateDir' | 'labRoot' | 'homeRepos' | 'urls' | 'commit'> = {
  bridgePort: 8642, budget: DEFAULT_BUDGET, backoff: DEFAULT_BACKOFF, publicStatus: true,
  publishEveryMs: 4.5 * 60_000, fetchEveryMs: 60_000, metricsEveryMs: 60_000, push: true,
};

type StepKind = 'shell' | 'pilot-checks' | 'final-checks' | 'collect';
interface Step { name: string; kind: StepKind; phase: 'prepare' | 'pilot' | 'commands' | 'checks' | 'collect'; block?: string; of?: string }

export interface JobRun {
  id: string;
  title: string;
  cpu: 'heavy' | 'light';
  file: string;
  startedAt: number;
  steps: Step[];
  stepIndex: number;
  unit: string | null;
  unitStartedAt: number;
  workers: number;
  sizing: Sizing | null;
  cap: number | null;
  peakRssGb: number | null;
  backoff: BackoffState | null;
  playingHeld: boolean;
  events: Array<PressureEvent & { why: string }>;
  progress: RateSample[];
  total: number | null;
  progressUnit: string | null;
  dataUpdated: number | null;
  metrics: Flat;
  metricsAt: number;
  shas: Record<string, string>;
  restarts: Array<{ at: number; how: 'resumed' | 'restarted' | 'adopted'; why: string }>;
  approved: boolean;
  stopping: null | { why: 'memory' | 'abort' | 'timeout' | 'user'; detail: string };
  outcome: null | { state: 'done' | 'failed' | 'waiting' | 'skipped'; at: number; reason: string; fields?: Record<string, string> };
  numbers: Record<string, number>;
  published: boolean;
  /** The STATUS text waiting to be pushed. */
  pendingStatus: string | null;
}

interface Persist { paused: boolean; lastPublish: number; lastFetch: number; dirty: boolean; lastHost: HostSample | null; started: number; ladderSig?: string }

const MB = 1024 * 1024;
const q = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`;

export class Runner {
  readonly cfg: RunnerConfig;
  readonly sys: Sys;
  jobs: JobFile[] = [];
  origin = new Map<string, Status>();
  runs = new Map<string, JobRun>();
  blocked: Blocked[] = [];
  p: Persist;
  host: HostSample | null = null;
  swapInRate = 0;

  constructor(cfg: RunnerConfig, sys: Sys) {
    this.cfg = cfg;
    this.sys = sys;
    fs.mkdirSync(path.join(cfg.stateDir, 'jobs'), { recursive: true });
    this.p = this.readJson<Persist>('runner.json') ?? { paused: false, lastPublish: 0, lastFetch: 0, dirty: true, lastHost: null, started: sys.now() };
    this.p.started = sys.now();
    for (const id of fs.readdirSync(path.join(cfg.stateDir, 'jobs'))) {
      const r = this.readJson<JobRun>(path.join('jobs', id, 'run.json'));
      if (r) this.runs.set(id, r);
    }
  }

  // ------------------------------------------------------------------ paths

  jobDir(id: string): string { return path.join(this.cfg.stateDir, 'jobs', id); }
  controlFile(id: string): string { return path.join(this.cfg.stateDir, 'control', `${id}.json`); }
  checkout(repo: string, cpu: 'heavy' | 'light'): string { return path.join(this.cfg.labRoot, cpu === 'light' ? `${repo}-light` : repo); }
  resultsDir(): string { return path.join(this.cfg.labRoot, 'pc-results'); }
  publicDir(): string { return path.join(this.cfg.labRoot, 'lab-status'); }
  /** The clone the queue is read from: the heavy mtg-table clone. */
  queueRepo(): string { return this.checkout('mtg-table', 'heavy'); }
  pausedFlag(): string { return path.join(this.cfg.stateDir, 'paused'); }

  private readJson<T>(rel: string): T | null {
    try { return JSON.parse(fs.readFileSync(path.join(this.cfg.stateDir, rel), 'utf8')) as T; } catch { return null; }
  }
  private writeJson(rel: string, v: unknown): void {
    const f = path.join(this.cfg.stateDir, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(`${f}.part`, `${JSON.stringify(v, null, 1)}\n`);
    fs.renameSync(`${f}.part`, f);
  }
  save(r?: JobRun): void {
    if (r) this.writeJson(path.join('jobs', r.id, 'run.json'), r);
    this.writeJson('runner.json', this.p);
  }
  private git(dir: string, ...args: string[]): { code: number; stdout: string; stderr: string } {
    return this.sys.run(['git', '-C', dir, ...args], { timeoutMs: 180_000 });
  }

  // ------------------------------------------------------------------ the queue

  /** Clone the queue repo if needed, fetch pc-jobs and pc-results, read jobs and STATUS files. */
  readQueue(force = false): void {
    if (!force && this.sys.now() - this.p.lastFetch < this.cfg.fetchEveryMs && this.jobs.length) return;
    const repo = this.queueRepo();
    this.ensureClone('mtg-table', repo);
    const f = this.git(repo, 'fetch', '--quiet', 'origin', '+refs/heads/pc-jobs:refs/remotes/origin/pc-jobs', '+refs/heads/pc-results:refs/remotes/origin/pc-results');
    if (f.code !== 0) this.sys.log(`fetch failed: ${f.stderr.trim().split('\n').at(-1)}`);
    this.p.lastFetch = this.sys.now();
    const names = this.git(repo, 'ls-tree', '--name-only', 'origin/pc-jobs', 'jobs/').stdout.split('\n').filter((n) => /^jobs\/J\d+[^/]*\.md$/.test(n));
    this.jobs = names.map((n) => parseJobFile(n, this.git(repo, 'show', `origin/pc-jobs:${n}`).stdout, parseExpr))
      .filter((j) => j.id).sort((a, b) => idOrder(a.id, b.id));
    this.origin.clear();
    const st = this.git(repo, 'ls-tree', '-r', '--name-only', 'origin/pc-results', 'results/').stdout.split('\n');
    for (const n of st) {
      const m = /^results\/(J\d+)\/STATUS$/.exec(n);
      if (!m) continue;
      const s = parseStatus(this.git(repo, 'show', `origin/pc-results:${n}`).stdout);
      if (s) this.origin.set(m[1] as string, s);
    }
  }

  ensureClone(repo: string, dest: string): void {
    if (fs.existsSync(path.join(dest, '.git'))) return;
    const home = this.cfg.homeRepos[repo];
    const url = this.cfg.urls[repo] ?? (home ? this.sys.run(['git', '-C', home, 'remote', 'get-url', 'origin']).stdout.trim() : '');
    if (!url) throw new Error(`no remote URL for ${repo}: pass --home-${repo} or --url-${repo}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    this.sys.log(`cloning ${repo} into ${dest}`);
    const r = this.sys.run(['git', 'clone', '--quiet', ...(home ? ['--reference-if-able', home, '--dissociate'] : []), url, dest], { timeoutMs: 1_800_000 });
    if (r.code !== 0) throw new Error(`git clone ${url} failed: ${r.stderr.trim()}`);
  }

  /** STATUS as the runner sees it: what it has not pushed yet, else origin's. */
  statuses(): Map<string, Status> {
    const m = new Map(this.origin);
    for (const r of this.runs.values()) {
      if (r.pendingStatus) { const s = parseStatus(r.pendingStatus); if (s) m.set(r.id, s); }
    }
    return m;
  }

  active(): JobRun[] {
    return [...this.runs.values()].filter((r) => !r.outcome).sort((a, b) => idOrder(a.id, b.id));
  }

  isPaused(): boolean {
    return fs.existsSync(this.pausedFlag());
  }

  // ------------------------------------------------------------------ one tick

  tick(): void {
    this.readQueue();
    this.sampleHost();
    this.handleRequests();
    for (const r of this.active()) this.advance(r);
    const st = this.statuses();
    const { start, blocked } = schedule({
      jobs: this.jobs, statuses: st, active: new Map(this.active().map((r) => [r.id, r.cpu])),
      playing: this.sys.playing(this.cfg.bridgePort), paused: this.isPaused(), now: this.sys.now(),
    });
    this.blocked = blocked;
    for (const job of start) this.begin(job, st.get(job.id) ?? null);
    this.writeStatusJson();
    if (this.ladderSig() !== (this.p.ladderSig ?? '')) this.p.dirty = true;
    if (this.p.dirty || this.sys.now() - this.p.lastPublish >= this.cfg.publishEveryMs) this.publish();
    this.save();
  }

  /** A start: the steps, a STATUS of `running`. */
  begin(job: JobFile, st: Status | null): JobRun {
    const prev = this.runs.get(job.id);
    if (prev && !prev.outcome) throw new Error(`${job.id} is already running`);
    const approved = !!st && st.state === 'waiting' && 'approved' in st.fields;
    const cap = st?.fields.workers_cap ? Number(st.fields.workers_cap) : null;
    // A retry after a memory stop or a `stop`: a pilot that already passed is not run again.
    const retry = !!prev && prev.outcome?.state === 'waiting' && /^(memory|stopped)/.test(prev.outcome.reason) && !!prev.sizing;
    const steps = this.stepsFor(job, approved || retry);
    const moved = retry && !job.resumable ? this.cleanAside(prev as JobRun, job) : [];
    const r: JobRun = {
      id: job.id, title: job.title, cpu: job.cpu, file: job.file, startedAt: this.sys.now(), steps, stepIndex: 0,
      unit: null, unitStartedAt: 0, workers: 1, sizing: null, cap: Number.isFinite(cap) ? cap : null,
      peakRssGb: prev?.peakRssGb ?? null, backoff: null, playingHeld: false, events: [], progress: [], total: null, progressUnit: null, dataUpdated: null,
      metrics: {}, metricsAt: 0, shas: {}, restarts: [], approved, stopping: null, outcome: null, numbers: {}, published: false, pendingStatus: null,
    };
    if (retry) r.restarts.push({ at: this.sys.now(), how: job.resumable ? 'resumed' : 'restarted', why: `retry after "${prev?.outcome?.reason}"; the pilot had passed${moved.length ? `; moved aside: ${moved.join(', ')}` : ''}${job.resumable ? '; the tools skip what is done' : ''}` });
    fs.rmSync(path.join(this.jobDir(job.id), 'out'), { recursive: true, force: true });
    fs.mkdirSync(path.join(this.jobDir(job.id), 'out'), { recursive: true });
    this.runs.set(job.id, r);
    this.sys.log(`${job.id}: start (${job.cpu}; ${steps.map((s) => s.name).join(', ')})`);
    this.setStatus(r, 'running', { phase: 'prepare' });
    this.save(r);
    this.advance(r);
    return r;
  }

  stepsFor(job: JobFile, approved: boolean): Step[] {
    const steps: Step[] = [{ name: 'prepare', kind: 'shell', phase: 'prepare' }];
    const pb = job.pilot?.blocks ?? [];
    if (!approved) {
      pb.forEach((b, i) => steps.push({ name: `pilot${i + 1}`, kind: 'shell', phase: 'pilot', block: b, of: `${i + 1}/${pb.length}` }));
      steps.push({ name: 'pilot-checks', kind: 'pilot-checks', phase: 'checks' });
    }
    const cb = job.commands?.blocks ?? [];
    cb.forEach((b, i) => steps.push({ name: `run${i + 1}`, kind: 'shell', phase: 'commands', block: b, of: `${i + 1}/${cb.length}` }));
    steps.push({ name: 'final-checks', kind: 'final-checks', phase: 'checks' });
    steps.push({ name: 'collect', kind: 'collect', phase: 'collect' });
    return steps;
  }

  jobOf(r: JobRun): JobFile | null {
    return this.jobs.find((j) => j.id === r.id) ?? null;
  }

  // ------------------------------------------------------------------ advancing

  advance(r: JobRun): void {
    const job = this.jobOf(r);
    if (!job) {
      // The job file is gone from pc-jobs: stop what runs, and say so.
      if (r.unit && this.sys.unitState(r.unit) !== 'inactive') { this.sys.stopUnit(r.unit); return; }
      this.finish(r, 'skipped', 'the job file was removed from pc-jobs');
      return;
    }
    for (let guard = 0; guard < 50 && !r.outcome; guard++) {
      if (r.unit) {
        const state = this.sys.unitState(r.unit);
        if (state === 'active' || state === 'activating' || state === 'deactivating') {
          this.monitor(r, job);
          return;
        }
        this.stepEnded(r, job);
        continue;
      }
      const step = r.steps[r.stepIndex];
      if (!step) { this.finish(r, 'done', ''); return; }
      if (step.kind === 'shell') { this.startStep(r, job, step); continue; }
      this.internalStep(r, job, step);
    }
  }

  private rcFile(r: JobRun, step: Step): string { return path.join(this.jobDir(r.id), `${step.name}.sh.rc`); }
  logFile(r: JobRun, step: Step): string { return path.join(this.jobDir(r.id), `${step.name}.log`); }

  private stepEnded(r: JobRun, job: JobFile): void {
    const step = r.steps[r.stepIndex] as Step;
    let rc: number | null = null;
    try { rc = Number(fs.readFileSync(this.rcFile(r, step), 'utf8').trim()); } catch { rc = null; }
    if (rc !== null && !Number.isFinite(rc)) rc = null;
    r.unit = null;
    this.collectLogTail(r, step);
    if (step.phase === 'prepare' && rc === 0) this.readShas(r, job);
    if (r.stopping) {
      const s = r.stopping;
      r.stopping = null;
      if (s.why === 'memory') {
        const cap = retryCap(r.backoff?.workers ?? r.workers);
        this.finish(r, 'waiting', `memory: ${s.detail}`, { workers_cap: String(cap), retry_after: isoLocal(this.sys.now() + 15 * 60_000) });
      } else if (s.why === 'user') {
        this.finish(r, 'waiting', `stopped: ${s.detail}`);
      } else {
        this.finish(r, 'failed', `${s.why === 'abort' ? 'aborted' : 'timeout'}: ${s.detail}`);
      }
      return;
    }
    if (rc === 0) {
      r.stepIndex++;
      this.save(r);
      return;
    }
    if (rc === null) {
      // No exit code: the unit was killed from outside (systemd-oomd, the kernel's OOM killer, a reboot).
      const cap = retryCap(r.backoff?.workers ?? r.workers);
      this.finish(r, 'waiting', `memory: step ${step.name} was killed without an exit code (oomd or the OOM killer?)`, { workers_cap: String(cap), retry_after: isoLocal(this.sys.now() + 15 * 60_000) });
      return;
    }
    this.writeOut(r, 'failure.txt', `step ${step.name} exited ${rc}\n\n${this.tail(this.logFile(r, step), 60)}`);
    this.finish(r, 'failed', `${step.phase === 'pilot' ? 'pilot: ' : step.phase === 'prepare' ? 'prepare: ' : ''}step ${step.name} exited ${rc}`, { exit: String(rc) });
  }

  private readShas(r: JobRun, job: JobFile): void {
    for (const { repo } of job.repos) {
      const sha = this.git(this.checkout(repo, r.cpu), 'rev-parse', '--short', 'HEAD').stdout.trim();
      if (sha) r.shas[repo] = sha;
    }
  }

  /** The cwd for a job's commands: the mtg-table checkout when the job names it, else its first repo's. */
  cwdOf(r: JobRun, job: JobFile): string {
    const repo = job.repos.find((x) => x.repo === 'mtg-table')?.repo ?? job.repos[0]?.repo ?? 'mtg-table';
    return this.checkout(repo, r.cpu);
  }

  /** {workers}, {mtg-table}, {ForgeCoach}, and Justin's own checkout paths rewritten to the lab's. */
  substitute(text: string, r: JobRun): string {
    let t = text.replace(/\{workers\}/g, String(r.workers));
    for (const repo of ['mtg-table', 'ForgeCoach']) {
      const lab = this.checkout(repo, r.cpu);
      t = t.split(`{${repo}}`).join(lab);
      const home = this.cfg.homeRepos[repo];
      if (home) {
        t = t.replace(new RegExp(`${home.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`, 'g'), lab);
        t = t.replace(new RegExp(`~/code/${repo}(?![\\w-])`, 'g'), lab);
      }
    }
    return t;
  }

  prepareScript(r: JobRun, job: JobFile): string {
    const lines = ['set -eo pipefail'];
    for (const { repo, ref } of job.repos) {
      if (!/^[A-Za-z0-9._/-]+$/.test(ref)) throw new Error(`a ref the runner will not pass to git: ${ref}`);
      const dest = this.checkout(repo, r.cpu);
      const home = this.cfg.homeRepos[repo];
      const url = this.cfg.urls[repo] ?? (home ? this.sys.run(['git', '-C', home, 'remote', 'get-url', 'origin']).stdout.trim() : '');
      lines.push(`# ${repo}@${ref}`,
        `if [ ! -d ${q(dest)}/.git ]; then git clone --quiet ${home ? `--reference-if-able ${q(home)} --dissociate ` : ''}${q(url)} ${q(dest)}; fi`,
        `cd ${q(dest)}`,
        `git fetch --quiet origin '+refs/heads/*:refs/remotes/origin/*'`,
        `if git rev-parse -q --verify ${q(`origin/${ref}^{commit}`)} >/dev/null; then sha=$(git rev-parse ${q(`origin/${ref}^{commit}`)}); else sha=$(git rev-parse --verify ${q(`${ref}^{commit}`)}); fi`,
        `git checkout --quiet --force --detach "$sha"`,
        `echo "lab: ${repo} at $sha"`);
      if (repo === 'mtg-table') lines.push('[ -e forge-home/res ] || ./tools/make-forge-home.sh', './bridge/build.sh');
      if (repo === 'ForgeCoach') lines.push(`want=$(sha1sum package-lock.json | cut -c1-40); if [ "$(cat node_modules/.lab-lock 2>/dev/null)" != "$want" ]; then npm ci; echo "$want" > node_modules/.lab-lock; fi`);
    }
    return lines.join('\n');
  }

  stepScript(r: JobRun, job: JobFile, step: Step): string {
    const body = step.phase === 'prepare' ? this.prepareScript(r, job) : `set -eo pipefail\ncd ${q(this.cwdOf(r, job))}\n${this.substitute(step.block ?? '', r)}`;
    return `#!/usr/bin/env bash\n# lab runner: ${r.id} ${step.name} (generated from ${job.file}; do not edit)\n${body}\n`;
  }

  unitSpec(r: JobRun, job: JobFile, step: Step): UnitSpec {
    const b = budgetOf(this.sys.machine(), this.cfg.budget);
    const maxGb = r.cpu === 'light' ? b.lightGb : b.heavyGb;
    const script = path.join(this.jobDir(r.id), `${step.name}.sh`);
    return {
      unit: unitName(r.id, step.name),
      memoryMaxGb: maxGb,
      memoryHighGb: Math.max(0.5, Math.round(maxGb * 0.9 * 10) / 10),
      script,
      log: this.logFile(r, step),
      cwd: step.phase === 'prepare' ? this.cfg.labRoot : this.cwdOf(r, job),
      env: {
        JOBS: String(r.workers), LAB_WORKERS: String(r.workers), LAB_CONTROL: this.controlFile(r.id), LAB_JOB: r.id, LAB_STEP: step.name,
        MTG_TABLE: this.checkout('mtg-table', r.cpu), FORGECOACH: this.checkout('ForgeCoach', r.cpu),
      },
    };
  }

  private startStep(r: JobRun, job: JobFile, step: Step): void {
    if (step.phase === 'pilot' && r.stepIndex === r.steps.findIndex((s) => s.phase === 'pilot')) {
      r.workers = sizeWorkers({ budgetGb: this.heavyBudget(r), physicalCores: this.sys.machine().physicalCores, maxWorkers: job.maxWorkers, measuredPeakGb: null, memPerWorkerGb: job.memPerWorkerGb, cap: r.cap }).workers;
    }
    if (step.phase === 'commands' && !r.sizing) this.size(r, job);
    if (step.phase !== 'prepare') {
      r.backoff ??= initialBackoff(r.workers);
      if (step.phase === 'commands' && r.backoff.sized !== r.workers) r.backoff = initialBackoff(r.workers);
      this.writeEffectiveControl(r);
    }
    const u = this.unitSpec(r, job, step);
    fs.writeFileSync(u.script, this.stepScript(r, job, step));
    const rc = this.rcFile(r, step);
    fs.rmSync(rc, { force: true });
    fs.writeFileSync(`${u.script}.wrap`, `#!/usr/bin/env bash\nbash ${q(u.script)}\nrc=$?\nprintf '%s\\n' "$rc" > ${q(`${rc}.part`)} && mv ${q(`${rc}.part`)} ${q(rc)}\nexit "$rc"\n`);
    fs.appendFileSync(u.log, `==== ${r.id} ${step.name} started ${isoLocal(this.sys.now())} in unit ${u.unit}, ${r.workers} worker(s)\n`);
    const res = this.sys.startUnit(u);
    if (res.code !== 0) {
      this.finish(r, 'failed', `systemd-run failed for ${u.unit}: ${(res.stderr || res.stdout).trim().split('\n').at(-1)}`);
      return;
    }
    r.unit = u.unit;
    r.unitStartedAt = this.sys.now();
    this.setStatus(r, 'running', { phase: this.phaseOf(r) });
    this.save(r);
  }

  heavyBudget(r: JobRun): number {
    const b = budgetOf(this.sys.machine(), this.cfg.budget);
    return r.cpu === 'light' ? b.lightGb : b.heavyGb;
  }

  size(r: JobRun, job: JobFile): void {
    r.sizing = sizeWorkers({ budgetGb: this.heavyBudget(r), physicalCores: this.sys.machine().physicalCores, maxWorkers: job.maxWorkers, measuredPeakGb: r.peakRssGb, memPerWorkerGb: job.memPerWorkerGb, cap: r.cap });
    r.workers = r.sizing.workers;
    r.backoff = initialBackoff(r.workers);
  }

  phaseOf(r: JobRun): string {
    const s = r.steps[r.stepIndex];
    if (!s) return 'collect';
    if (r.stopping) return 'stopping';
    return s.of ? `${s.phase} ${s.of}` : s.phase;
  }

  // ------------------------------------------------------------------ monitoring

  private monitor(r: JobRun, job: JobFile): void {
    const step = r.steps[r.stepIndex] as Step;
    const now = this.sys.now();
    if (step.phase === 'pilot' && r.unit) {
      const peaks = this.sys.unitJavaPeaksGb(r.unit);
      if (peaks.length) r.peakRssGb = Math.max(r.peakRssGb ?? 0, ...peaks);
    }
    if (r.stopping) return;
    if (job.timeoutSec && now - r.unitStartedAt > job.timeoutSec * 1000) {
      this.stop(r, 'timeout', `step ${step.name} ran past ${job.timeoutSec} s`);
      return;
    }
    const canControl = (job.header.control ?? 'yes').trim().toLowerCase() !== 'no';
    // Justin at the table: hold a heavy job (its games in flight finish), never start one (schedule.ts).
    if (r.cpu === 'heavy' && step.phase !== 'prepare') {
      const playing = this.sys.playing(this.cfg.bridgePort);
      if (playing !== r.playingHeld) {
        r.playingHeld = playing;
        this.event(r, playing ? 'playing' : 'play-ended', playing ? 'Justin is at the table: new games wait' : 'Justin left the table');
      }
    }
    if (this.host && r.backoff && step.phase !== 'prepare' && r.unit) {
      const maxGb = this.unitSpec(r, job, step).memoryMaxGb;
      const { state, action } = decide(r.backoff, { at: now, some10: this.host.some10, swapIn: this.swapInRate, jobGb: this.sys.unitMemoryGb(r.unit), jobMaxGb: maxGb }, canControl, this.cfg.backoff);
      r.backoff = state;
      if (action) this.apply(r, action);
    }
    this.writeEffectiveControl(r);
    if (now - r.metricsAt >= this.cfg.metricsEveryMs) {
      r.metricsAt = now;
      this.measure(r, job, step);
      for (const a of job.aborts) {
        const v = evaluate(a, r.metrics);
        if (v.result === true) { this.stop(r, 'abort', `${a} (${v.values})`); return; }
      }
    }
    this.save(r);
  }

  private apply(r: JobRun, a: Action): void {
    const kind = a.kind;
    this.event(r, kind, a.why);
    if (kind === 'stop') this.stop(r, 'memory', a.why);
  }

  event(r: JobRun, kind: PressureEvent['kind'], why: string): void {
    const e = { at: isoLocal(this.sys.now()), kind, workers: r.backoff?.workers ?? r.workers, pressure: Math.round((this.host?.some10 ?? 0) * 10) / 10, why };
    r.events.push(e);
    this.sys.log(`${r.id}: ${kind} (${why})`);
    fs.appendFileSync(path.join(this.jobDir(r.id), 'out', 'events.jsonl'), `${JSON.stringify(e)}\n`);
    this.setStatus(r, 'running', { phase: this.phaseOf(r) });
  }

  writeEffectiveControl(r: JobRun): void {
    const paused = this.isPaused() || r.playingHeld || !!r.backoff?.paused;
    const maxWorkers = r.backoff?.workers ?? r.workers;
    const f = this.controlFile(r.id);
    let cur = '';
    try { cur = fs.readFileSync(f, 'utf8'); } catch { /* none yet */ }
    const want = `${JSON.stringify({ paused, maxWorkers })}\n`;
    if (cur !== want) writeControl(f, { paused, maxWorkers });
  }

  stop(r: JobRun, why: 'memory' | 'abort' | 'timeout' | 'user', detail: string): void {
    if (r.stopping) return;
    r.stopping = { why, detail };
    this.sys.log(`${r.id}: stopping (${why}: ${detail})`);
    if (r.unit) this.sys.stopUnit(r.unit);
    this.setStatus(r, 'running', { phase: 'stopping' });
    this.save(r);
  }

  /** Progress and the job's metrics (the header's and the running phase's section). */
  measure(r: JobRun, job: JobFile, step: Step): void {
    const cwd = this.cwdOf(r, job);
    const sec = step.phase === 'pilot' ? job.pilot : job.commands;
    const specs = [...job.metrics, ...(sec?.metrics ?? [])];
    r.metrics = { ...this.metricsOf(specs, cwd, r), ...this.runnerFacts(r) };
    const prog: ProgressSpec | null = step.phase === 'pilot' ? job.pilot?.progress ?? null : job.progress;
    if (prog) {
      try {
        const p = progressOf(cwd, prog.kind, prog.args.map((a) => this.substitute(a, r)), prog.total, r.metrics);
        const last = r.progress.at(-1);
        if (!last || last.done !== p.done) r.dataUpdated = this.sys.now();
        r.progress.push({ at: this.sys.now(), done: p.done });
        r.progress = r.progress.filter((s) => this.sys.now() - s.at <= 2 * 3600_000).slice(-200);
        r.total = p.total;
        r.progressUnit = p.unit;
      } catch (e) {
        this.sys.log(`${r.id}: progress: ${(e as Error).message}`);
      }
    }
  }

  runnerFacts(r: JobRun): Flat {
    const f: Flat = { elapsed_s: Math.round((this.sys.now() - r.startedAt) / 1000), workers: r.backoff?.workers ?? r.workers, pressure_events: r.events.length };
    if (r.peakRssGb !== null) f.peak_worker_rss_gb = Math.round(r.peakRssGb * 100) / 100;
    return f;
  }

  metricsOf(specs: MetricSpec[], cwd: string, r: JobRun): Flat {
    const out: Flat = {};
    const logs = path.join(this.jobDir(r.id), '*.log');
    for (const s of specs) {
      try {
        const args = s.args.map((a) => this.substitute(a === '{logs}' ? logs : a, r));
        if (s.kind === 'sh') {
          const res = this.sys.run(['bash', '-c', this.substitute(s.command ?? '', r)], { cwd, timeoutMs: 300_000 });
          if (res.code !== 0) throw new Error(`exit ${res.code}: ${res.stderr.trim().split('\n').at(-1)}`);
          const v = JSON.parse(res.stdout.trim()) as unknown;
          place(s.name, typeof v === 'number' ? v : flatten(v), out);
        } else {
          const ex = EXTRACTORS[s.kind];
          if (!ex) throw new Error(`no extractor called ${s.kind}`);
          place(s.name, ex(cwd, args), out);
        }
      } catch (e) {
        out.metrics_errors = (typeof out.metrics_errors === 'number' ? out.metrics_errors : 0) + 1;
        this.sys.log(`${r.id}: metrics "${s.line}": ${(e as Error).message}`);
      }
    }
    return out;
  }

  // ------------------------------------------------------------------ the runner's own steps

  private internalStep(r: JobRun, job: JobFile, step: Step): void {
    const cwd = this.cwdOf(r, job);
    if (step.kind === 'pilot-checks') {
      const m = { ...this.metricsOf([...job.metrics, ...(job.pilot?.metrics ?? [])], cwd, r), ...this.runnerFacts(r) };
      r.metrics = m;
      const verdicts = (job.pilot?.checks ?? []).map((c) => evaluate(c, m));
      this.writeOut(r, 'pilot-metrics.json', `${JSON.stringify(m, null, 1)}\n`);
      this.writeOut(r, 'pilot-checks.txt', verdictText(verdicts));
      if (!job.machineChecked) {
        this.finish(r, 'waiting', 'needs a human/Claude check: the job file has no check: lines, so the runner ran the pilot only', { needs: 'check' });
        return;
      }
      const bad = verdicts.filter((v) => v.result !== true);
      if (bad.length) {
        this.finish(r, 'failed', `pilot: ${bad.map((v) => `${v.expr} (${v.error ?? v.values})`).join('; ')}`);
        return;
      }
      this.size(r, job);
      this.sys.log(`${r.id}: pilot passed; ${r.workers} worker(s): ${r.sizing?.detail}`);
      r.stepIndex++;
      this.save(r);
      return;
    }
    if (step.kind === 'final-checks') {
      const m = { ...this.metricsOf([...job.metrics, ...(job.commands?.metrics ?? [])], cwd, r), ...this.runnerFacts(r) };
      r.metrics = m;
      const verdicts = (job.commands?.checks ?? []).map((c) => evaluate(c, m));
      this.writeOut(r, 'metrics.json', `${JSON.stringify(m, null, 1)}\n`);
      this.writeOut(r, 'checks.txt', verdictText(verdicts));
      const nums: Record<string, number> = {};
      for (const h of job.headline) { const v = m[h]; if (typeof v === 'number') nums[h] = v; }
      r.numbers = nums;
      const bad = verdicts.filter((v) => v.result !== true);
      if (bad.length) {
        this.finish(r, 'failed', `check: ${bad.map((v) => `${v.expr} (${v.error ?? v.values})`).join('; ')}`);
        return;
      }
      r.stepIndex++;
      this.save(r);
      return;
    }
    // collect
    for (const g of job.collect) {
      for (const f of expandGlob(cwd, this.substitute(g, r))) {
        try {
          const st = fs.statSync(f);
          if (!st.isFile()) continue;
          if (st.size > 5 * MB) { this.writeOut(r, 'collect-skipped.txt', `${path.basename(f)}: ${(st.size / MB).toFixed(1)} MB, over 5 MB\n`, true); continue; }
          fs.copyFileSync(f, path.join(this.jobDir(r.id), 'out', path.basename(f)));
        } catch { /* gone */ }
      }
    }
    r.stepIndex++;
    this.save(r);
  }

  // ------------------------------------------------------------------ outcomes and STATUS

  finish(r: JobRun, state: 'done' | 'failed' | 'waiting' | 'skipped', reason: string, fields: Record<string, string> = {}): void {
    r.outcome = { state, at: this.sys.now(), reason, fields };
    r.unit = null;
    r.published = false;
    try { fs.rmSync(this.controlFile(r.id), { force: true }); } catch { /* none */ }
    this.sys.log(`${r.id}: ${state}${reason ? ` (${reason})` : ''}`);
    this.setStatus(r, state, { ...(reason ? { reason } : {}), ...fields });
    this.save(r);
  }

  setStatus(r: JobRun, state: string, extra: Record<string, string>): void {
    const f: Record<string, string> = { runner: `forgecoach-runner ${this.cfg.commit}`, started: isoLocal(r.startedAt) };
    for (const [repo, sha] of Object.entries(r.shas)) f[repo] = sha;
    if (state !== 'running') f.finished = isoLocal(r.outcome?.at ?? this.sys.now());
    if (r.sizing) f.workers = `${r.backoff?.workers ?? r.workers} (sized ${r.sizing.workers}: ${r.sizing.detail})`;
    else if (r.workers) f.workers = String(r.workers);
    if (r.peakRssGb !== null) f.peak_worker_rss_gb = (Math.round(r.peakRssGb * 100) / 100).toString();
    if (r.approved) f.approved = 'pilot approved; the runner skipped it';
    for (const x of r.restarts) f[x.how] = `${isoLocal(x.at)}: ${x.why}`;
    r.events.slice(-30).forEach((e, i) => { f[`pressure-${i + 1}`] = `${e.at} ${e.kind}${e.workers !== null ? ` to ${e.workers} worker(s)` : ''}: ${e.why}`; });
    Object.assign(f, extra);
    const st: Status = { state: state as Status['state'], fields: f, order: ['reason', 'needs', 'runner', 'started', 'finished', 'phase', 'mtg-table', 'ForgeCoach', 'workers', 'peak_worker_rss_gb'] };
    r.pendingStatus = formatStatus(st);
    r.published = false;
    this.p.dirty = true;
  }

  // ------------------------------------------------------------------ restart

  /** On start: adopt, read, resume or restart every job that was running. */
  reconcile(): void {
    this.readQueue(true);
    for (const r of this.active()) {
      const job = this.jobOf(r);
      if (!job) continue;
      if (r.unit) {
        const state = this.sys.unitState(r.unit);
        if (state === 'active' || state === 'activating' || state === 'deactivating') {
          r.restarts.push({ at: this.sys.now(), how: 'adopted', why: `the runner restarted; ${r.unit} was still running` });
          this.setStatus(r, 'running', { phase: this.phaseOf(r) });
          continue;
        }
        const step = r.steps[r.stepIndex] as Step;
        if (fs.existsSync(this.rcFile(r, step)) || r.stopping) continue;     // ended while we were down: the next tick reads it
        r.unit = null;
      }
      const step = r.steps[r.stepIndex];
      if (!step || step.kind !== 'shell' || step.phase === 'prepare') {
        r.restarts.push({ at: this.sys.now(), how: 'resumed', why: `the runner restarted at ${step?.name ?? 'the end'}` });
      } else if (job.resumable || step.phase === 'pilot') {
        r.restarts.push({ at: this.sys.now(), how: 'resumed', why: `the runner restarted during ${step.name}; it runs again${job.resumable ? ' and skips what is done' : ' (a pilot is short)'}` });
      } else {
        const moved = this.cleanAside(r, job);
        r.stepIndex = 0;
        r.sizing = null;
        r.restarts.push({ at: this.sys.now(), how: 'restarted', why: `the runner restarted during ${step.name}; the job is not resumable, so it starts again from the top${moved.length ? ` (moved aside: ${moved.join(', ')})` : ''}` });
      }
      this.setStatus(r, 'running', { phase: this.phaseOf(r) });
      this.save(r);
    }
    // A running STATUS of ours the runner has no record of: its state is gone; start it again.
    for (const [id, st] of this.origin) {
      if (st.state === 'running' && isOurs(st) && !this.runs.get(id)?.outcome && !this.runs.has(id)) {
        const job = this.jobs.find((j) => j.id === id);
        if (!job) continue;
        const r = this.begin(job, null);
        r.restarts.push({ at: this.sys.now(), how: 'restarted', why: 'STATUS said running but the runner had no record of it' });
        this.setStatus(r, 'running', { phase: this.phaseOf(r) });
      }
    }
  }

  /** `clean:` paths moved to `.restart-<time>-<name>` beside them, never deleted; only under the job's checkout's var/. */
  cleanAside(r: JobRun, job: JobFile): string[] {
    const cwd = this.cwdOf(r, job);
    const moved: string[] = [];
    const stamp = isoLocal(this.sys.now()).replace(/[:]/g, '').slice(0, 17);
    for (const c of job.clean) {
      for (const p of expandGlob(cwd, c)) {
        const rel = path.relative(cwd, p);
        if (!rel.startsWith('var/') || rel.includes('..')) continue;
        // A dot name: the job's own globs (night-*) never match it again.
        fs.renameSync(p, path.join(path.dirname(p), `.restart-${stamp}-${path.basename(p)}`));
        moved.push(rel);
      }
    }
    return moved;
  }

  // ------------------------------------------------------------------ requests from the CLI

  handleRequests(): void {
    const dir = path.join(this.cfg.stateDir, 'requests');
    let names: string[] = [];
    try { names = fs.readdirSync(dir).sort(); } catch { return; }
    for (const n of names) {
      const f = path.join(dir, n);
      let req: { op?: string; id?: string } = {};
      try { req = JSON.parse(fs.readFileSync(f, 'utf8')) as typeof req; } catch { /* torn: drop */ }
      fs.rmSync(f, { force: true });
      if (req.op === 'stop') {
        for (const r of this.active()) if (!req.id || r.id === req.id) {
          if (r.unit) this.stop(r, 'user', 'tools/runner.sh stop');
          else this.finish(r, 'waiting', 'stopped: tools/runner.sh stop');
        }
      }
    }
  }

  // ------------------------------------------------------------------ host, status.json, publishing

  sampleHost(): void {
    const h = this.sys.host();
    const prev = this.host ?? this.p.lastHost;
    if (prev && h.at > prev.at) this.swapInRate = Math.max(0, (h.pswpin - prev.pswpin) / ((h.at - prev.at) / 1000));
    this.host = h;
    this.p.lastHost = h;
  }

  statusDoc(): StatusDoc {
    const now = this.sys.now();
    const h = this.host ?? this.sys.host();
    const m = this.sys.machine();
    const b = budgetOf(m, this.cfg.budget);
    const running: RunningJob[] = this.active().map((r) => {
      const { ratePerHour, eta } = rateAndEta(r.progress, r.total, now);
      const errors = ['errors', 'engine_errors', 'transport_errors'].map((k) => r.metrics[k]).find((v) => typeof v === 'number') as number | undefined;
      return {
        id: r.id, title: r.title, cpu: r.cpu, phase: this.phaseOf(r), started: isoLocal(r.startedAt), elapsed: Math.round((now - r.startedAt) / 1000),
        done: r.progress.at(-1)?.done ?? null, total: r.total, unit: r.progressUnit, ratePerHour, eta: eta ? isoLocal(eta) : null,
        workers: r.backoff?.workers ?? r.workers, workersMax: r.sizing?.workers ?? r.workers, errors: errors ?? null,
        paused: this.isPaused() || r.playingHeld || !!r.backoff?.paused,
        dataUpdated: r.dataUpdated ? isoLocal(r.dataUpdated) : null,
        pressureEvents: r.events.slice(-20).map(({ at, kind, workers, pressure }) => ({ at, kind, workers, pressure })),
        detail: r.unit ?? undefined,
      };
    });
    // A job someone else runs (the PC session's own unit): shown, with what its STATUS says.
    for (const [id, st] of this.statuses()) {
      if (st.state !== 'running' || this.runs.get(id) && !this.runs.get(id)?.outcome) continue;
      const job = this.jobs.find((j) => j.id === id);
      const started = Date.parse(st.fields.started ?? '');
      running.push({ id, title: job?.title ?? id, cpu: job?.cpu ?? 'heavy', phase: 'commands', started: Number.isFinite(started) ? isoLocal(started) : '', elapsed: Number.isFinite(started) ? Math.round((now - started) / 1000) : 0,
        done: null, total: null, unit: null, ratePerHour: null, eta: null, workers: null, workersMax: null, errors: null, paused: false, dataUpdated: null, pressureEvents: [], detail: 'not run by the runner' });
    }
    const queueCodes = new Set(['after', 'heavy-busy', 'light-busy', 'queued']);
    const finished: FinishedItem[] = [];
    for (const [id, st] of this.statuses()) {
      if (st.state !== 'done' && st.state !== 'failed' && st.state !== 'skipped') continue;
      const at = Date.parse(st.fields.finished ?? st.fields.started ?? '');
      const numbers = this.runs.get(id)?.numbers ?? {};
      finished.push({ id, title: this.jobs.find((j) => j.id === id)?.title ?? id, status: st.state, finished: Number.isFinite(at) ? isoLocal(at) : '', headline: headlineOf(numbers), numbers, detail: st.fields.reason });
    }
    finished.sort((a, b) => (b.finished > a.finished ? 1 : b.finished < a.finished ? -1 : 0));
    return fit({
      schema: 1,
      updated: isoLocal(now),
      paused: this.isPaused(),
      host: {
        load1: Math.round(h.load1 * 100) / 100, memUsedGb: Math.round(h.memUsedGb * 10) / 10, memTotalGb: Math.round(h.memTotalGb * 10) / 10,
        swapUsedMb: Math.round(h.swapUsedMb), pressure: Math.round(h.some10 * 100) / 100, cpus: m.threads, budgetGb: b.labGb,
      },
      running,
      queue: this.blocked.filter((x) => queueCodes.has(x.code)).map((x) => ({ id: x.id, title: x.title, cpu: x.cpu, est: x.est })),
      waiting: this.blocked.filter((x) => !queueCodes.has(x.code)).map((x) => ({ id: x.id, title: x.title, reason: REASONS[x.code] ?? 'waiting', est: x.est, detail: x.reason })),
      finished,
      runner: { commit: this.cfg.commit, started: isoLocal(this.p.started), dryRun: false },
    });
  }

  writeStatusJson(): StatusDoc {
    const doc = this.statusDoc();
    this.writeJson('status.json', doc);
    this.writeJson('status.public.json', sanitise(doc));
    return doc;
  }

  heartbeat(doc: StatusDoc, old: string): string {
    const keep = /^## Messages[\s\S]*$/m.exec(old)?.[0]
      ?? `## Messages\n\nThe PC session's and Justin's notes, and messages for the cloud session. The runner keeps this section as written.\n${(/^- message for the cloud session:.*$/m.exec(old)?.[0] ?? '').replace(/^- /, '\n- ')}\n`;
    const run = doc.running.map((r) => `${r.id} ${r.phase}${r.done !== null ? `, ${r.done}${r.total ? `/${r.total}` : ''} ${r.unit ?? ''}` : ''}${r.ratePerHour ? `, ${r.ratePerHour}/h` : ''}${r.eta ? `, ETA ${r.eta}` : ''}${r.workers ? `, ${r.workers} worker(s)` : ''}${r.paused ? ', PAUSED' : ''}${r.detail === 'not run by the runner' ? ' (not run by the runner)' : ''}`);
    const last = doc.finished[0];
    return `# Heartbeat

Written by the lab runner (tools/runner, D337) every few minutes and on every job state change.

- time: ${doc.updated}
- runner: ${this.cfg.commit}, up since ${isoLocal(this.p.started)}${doc.paused ? ', PAUSED (tools/runner.sh resume)' : ''}
- running: ${run.length ? run.join('; ') : 'nothing'}
- load: ${doc.host.load1}; memory ${doc.host.memUsedGb}/${doc.host.memTotalGb} GB, swap ${doc.host.swapUsedMb} MB, pressure ${doc.host.pressure}% (lab budget ${doc.host.budgetGb} GB)
- queue: ${doc.queue.map((x) => x.id).join(', ') || 'empty'}
- waiting: ${doc.waiting.map((w) => `${w.id} (${w.detail ?? w.reason})`).join('; ') || 'nothing'}
- last finished: ${last ? `${last.id} ${last.status} at ${last.finished}${last.headline ? `: ${last.headline}` : ''}` : 'none'}

${keep.trimEnd()}
`;
  }

  /** Push STATUS files, outputs, status.json and HEARTBEAT.md to pc-results; the public copy to lab-status. */
  publish(): void {
    const doc = this.writeStatusJson();
    if (!this.cfg.push) { this.p.dirty = false; this.p.lastPublish = this.sys.now(); this.p.ladderSig = this.ladderSig(); return; }
    const ok = this.publishResults(doc);
    if (this.cfg.publicStatus) this.publishPublic(sanitise(doc)); else this.p.ladderSig = this.ladderSig();
    if (ok) { this.p.dirty = false; this.p.lastPublish = this.sys.now(); }
  }

  ensureResultsWorktree(): string {
    const wt = this.resultsDir();
    if (!fs.existsSync(path.join(wt, '.git'))) {
      const repo = this.queueRepo();
      this.git(repo, 'fetch', '--quiet', 'origin', '+refs/heads/pc-results:refs/remotes/origin/pc-results');
      const r = this.git(repo, 'worktree', 'add', '--force', '-B', 'lab-pc-results', wt, 'origin/pc-results');
      if (r.code !== 0) throw new Error(`git worktree add ${wt}: ${r.stderr.trim()}`);
    }
    return wt;
  }

  publishResults(doc: StatusDoc): boolean {
    let wt: string;
    try { wt = this.ensureResultsWorktree(); } catch (e) { this.sys.log(`publish: ${(e as Error).message}`); return false; }
    for (let attempt = 0; attempt < 3; attempt++) {
      this.git(wt, 'fetch', '--quiet', 'origin', '+refs/heads/pc-results:refs/remotes/origin/pc-results');
      this.git(wt, 'reset', '--quiet', '--hard', 'origin/pc-results');
      const changed: string[] = [];
      for (const r of this.runs.values()) {
        if (r.published) continue;
        const d = path.join(wt, 'results', r.id);
        fs.mkdirSync(d, { recursive: true });
        if (r.pendingStatus) fs.writeFileSync(path.join(d, 'STATUS'), r.pendingStatus);
        const out = path.join(this.jobDir(r.id), 'out');
        for (const f of fs.existsSync(out) ? fs.readdirSync(out) : []) {
          const src = path.join(out, f);
          if (fs.statSync(src).isFile() && fs.statSync(src).size <= 5 * MB) fs.copyFileSync(src, path.join(d, f));
        }
        changed.push(r.id);
      }
      fs.writeFileSync(path.join(wt, 'status.json'), `${JSON.stringify(doc, null, 1)}\n`);
      let old = '';
      try { old = fs.readFileSync(path.join(wt, 'HEARTBEAT.md'), 'utf8'); } catch { /* none */ }
      fs.writeFileSync(path.join(wt, 'HEARTBEAT.md'), this.heartbeat(doc, old));
      this.git(wt, 'add', '-A');
      if (this.git(wt, 'diff', '--cached', '--quiet').code !== 0) {
        const msg = changed.length ? `runner: ${changed.map((id) => `${id} ${parseStatus(this.runs.get(id)?.pendingStatus ?? '')?.state ?? ''}`).join(', ')}` : 'runner: heartbeat';
        const c = this.git(wt, '-c', 'user.name=forgecoach-runner', '-c', 'user.email=runner@localhost', 'commit', '--quiet', '-m', msg);
        if (c.code !== 0) { this.sys.log(`publish: commit failed: ${c.stderr.trim()}`); return false; }
        const p = this.git(wt, 'push', '--quiet', 'origin', 'HEAD:refs/heads/pc-results');
        if (p.code !== 0) { this.sys.log(`publish: push refused (attempt ${attempt + 1}): ${p.stderr.trim().split('\n').at(-1)}`); continue; }
      }
      for (const id of changed) { const r = this.runs.get(id); if (r) { r.published = true; if (r.outcome) r.pendingStatus = null; this.save(r); } }
      if (changed.length) this.p.lastFetch = 0;      // read the STATUS just pushed back at the next tick, not a minute later
      return true;
    }
    return false;
  }

  /** The numbers-only copy: one commit on the orphan branch lab-status of ForgeCoach, replaced on every push. */
  publishPublic(doc: StatusDoc): void {
    const dir = this.publicDir();
    try {
      if (!fs.existsSync(path.join(dir, '.git'))) {
        const home = this.cfg.homeRepos.ForgeCoach;
        const url = this.cfg.urls.ForgeCoach ?? (home ? this.sys.run(['git', '-C', home, 'remote', 'get-url', 'origin']).stdout.trim() : '');
        if (!url) { this.sys.log('public status: no ForgeCoach URL'); return; }
        fs.mkdirSync(dir, { recursive: true });
        this.sys.run(['git', 'init', '--quiet', dir]);
        this.git(dir, 'remote', 'add', 'origin', url);
        this.git(dir, 'checkout', '--quiet', '--orphan', 'lab-status');
      }
      fs.writeFileSync(path.join(dir, 'status.json'), `${JSON.stringify(doc)}\n`);
      const ladder = this.publicLadder();
      if (ladder) fs.writeFileSync(path.join(dir, 'ladder.json'), ladder);
      this.git(dir, 'add', 'status.json', ...(fs.existsSync(path.join(dir, 'ladder.json')) ? ['ladder.json'] : []));
      const id = ['-c', 'user.name=forgecoach-runner', '-c', 'user.email=runner@localhost'];
      // One commit, replaced each time: the branch is a value, not a history.
      const parentless = this.git(dir, ...id, 'commit-tree', this.git(dir, 'write-tree').stdout.trim(), '-m', `lab status ${doc.updated}`).stdout.trim();
      if (!parentless) return;
      this.git(dir, 'reset', '--quiet', '--soft', parentless);
      const p = this.git(dir, 'push', '--quiet', '--force', 'origin', 'HEAD:refs/heads/lab-status');
      if (p.code !== 0) this.sys.log(`public status: push failed: ${p.stderr.trim().split('\n').at(-1)}`);
      else this.p.ladderSig = this.ladderSig();
    } catch (e) {
      this.sys.log(`public status: ${(e as Error).message}`);
    }
  }

  ladderPath(): string {
    return this.cfg.ladderFile ?? path.join(this.checkout('mtg-table', 'heavy'), 'var', 'ai-ladder', 'ladder.json');
  }

  /** Size and mtime of the ladder's ladder.json: a change publishes. */
  ladderSig(): string {
    try { const st = fs.statSync(this.ladderPath()); return `${st.size}:${st.mtimeMs}`; } catch { return ''; }
  }

  /** The sanitised ladder.json text (ladder.ts's allowlist), or null when there is none or it is not schema 1. */
  publicLadder(): string | null {
    try {
      const doc = sanitiseLadder(JSON.parse(fs.readFileSync(this.ladderPath(), 'utf8')));
      return doc ? `${JSON.stringify(doc)}\n` : null;
    } catch { return null; }
  }

  // ------------------------------------------------------------------ outputs

  writeOut(r: JobRun, name: string, text: string, append = false): void {
    const d = path.join(this.jobDir(r.id), 'out');
    fs.mkdirSync(d, { recursive: true });
    if (append) fs.appendFileSync(path.join(d, name), text); else fs.writeFileSync(path.join(d, name), text);
    r.published = false;
  }

  tail(file: string, n: number): string {
    try { return fs.readFileSync(file, 'utf8').split('\n').slice(-n - 1).join('\n'); } catch { return ''; }
  }

  /** A step's log into results/<id>/: whole up to 2 MB, else its last 2 MB. */
  collectLogTail(r: JobRun, step: Step): void {
    const f = this.logFile(r, step);
    try {
      const st = fs.statSync(f);
      const fd = fs.openSync(f, 'r');
      const len = Math.min(st.size, 2 * MB);
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, st.size - len);
      fs.closeSync(fd);
      this.writeOut(r, `${step.name}.log`, (len < st.size ? `[... the first ${st.size - len} bytes are in var/runner on the PC]\n` : '') + buf.toString('utf8'));
    } catch { /* no log */ }
  }
}

export function verdictText(vs: Verdict[]): string {
  if (!vs.length) return 'no check: lines\n';
  return vs.map((v) => `${v.result === true ? 'PASS' : v.result === false ? 'FAIL' : 'UNKNOWN'}  ${v.expr}${v.values ? `   [${v.values}]` : ''}${v.error ? `   (${v.error})` : ''}`).join('\n') + '\n';
}
