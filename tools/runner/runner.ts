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
//  3. start what the schedule allows (schedule.ts): one heavy and one light, or
//     more heavy jobs side by side while their widths and memory fit (co-scheduling);
//  4. write var/runner/status.json; publish to pc-results every 4.5 minutes and
//     on every job state change; the public lab-status copy on its own clock:
//     on a state change, at most every minute when its content changed, and
//     every two minutes regardless, its heartbeat (publicEveryMs, publicHeartbeatMs).
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
// LANES.  Heavy jobs side by side never share a checkout: each running heavy job
// has a lane, lane 1 the clones as before (~/code/lab/<repo>), lane k > 1
// `<repo>-lane<k>`, its own checkout at its own pinned commit with its own build.
// A lane's mtg-table `var/` is a symlink to lane 1's, so every job's outputs land
// in the one var/ the next job (after:) and the ladder read.  Jobs side by side
// therefore share var/: they must not write the same paths.
//
// The runner's state lives in var/runner/ (jobs/<id>/run.json, the scripts,
// the logs, the control files) so a restarted runner RECONCILES: a step whose
// unit still runs is adopted; one that ended while the runner was down is read;
// one that died with it is resumed (resumable: yes: the step runs again and
// the tools skip what is done) or restarted (resumable: no: the `clean:` paths
// moved aside first), and the STATUS says which.
//
// BLOCKS DONE (D365).  A retry (after a memory stop or `stop`) and a restart
// begin at the `## Commands` block that was stopped: every block that finished
// is recorded (`blocksDone`: its exit code and its text's hash) and skipped,
// so long as the job file still has it unchanged.  A non-resumable job then
// moves aside the `clean:` lines of the blocks it runs again (a `clean:` line
// before a block); the header's `clean:` applies only when it starts from
// run1.  A job whose only `clean:` is the header's (every job file before
// D365) still starts from run1 when a later block stopped: the runner cannot
// tell which block made which path.
//
// The runner writes FACTS: states, numbers, exit codes, log tails.  Judgement
// (summary.md) stays with the PC's Claude session, which reads them.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_BACKOFF, decide, initialBackoff, retryCap, type Action, type BackoffConfig, type BackoffState } from './backoff.ts';
import { writeControl } from './control.ts';
import { evaluate, parse as parseExpr, type Verdict } from './expr.ts';
import { sanitiseLadder } from './ladder.ts';
import { sanitiseWarehouse } from './warehouse.ts';
import { parseJobFile, type JobFile, type MetricSpec, type ProgressSpec } from './jobfile.ts';
import { EXTRACTORS, expandGlob, flatten, place, progressOf, rateAndEta, type Flat, type RateSample } from './metrics.ts';
import { budget as budgetOf, DEFAULT_BUDGET, DEFAULT_PEAK_GB, PILOT_MAX_WORKERS, sizeWorkers, systemdRunLine, unitName, type BudgetOptions, type Sizing, type UnitSpec } from './sizing.ts';
import { formatStatus, isOurs, parseStatus, schedule, idOrder, widthOf, type Blocked, type Holding, type MachineBudget, type Status } from './schedule.ts';
import { fit, headlineOf, idleReasonOf, isoLocal, liveOf, REASONS, sanitise, type FinishedItem, type PressureEvent, type RunningJob, type StatusDoc } from './statusjson.ts';
import { GIT_ENV, LIVE_STATES, type HostSample, type Sys } from './sys.ts';

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
  /** pc-results (STATUS, outputs, HEARTBEAT.md): every this often, and on each state change. */
  publishEveryMs: number;
  /** The public copy on lab-status: when its content (the clock aside) changed, at most this often (a state change at once). */
  publicEveryMs: number;
  /** The public copy unchanged: this often anyway, so its heartbeat is never older than this (the page warns past 5 min). */
  publicHeartbeatMs: number;
  fetchEveryMs: number;
  metricsEveryMs: number;
  commit: string;
  /** Tests: never push. */
  push: boolean;
  /** The AI ladder's ladder.json to publish (sanitised) beside status.json; null: <lab>/mtg-table/var/ai-ladder/ladder.json. */
  ladderFile?: string | null;
  /** The lab warehouse's warehouse.json to publish (sanitised, D363); null: <lab>/mtg-table/var/warehouse/warehouse.json. */
  warehouseFile?: string | null;
  /** The core budget heavy jobs side by side share (`--cores`); null: the physical cores. */
  cores?: number | null;
  /** Heavy jobs side by side while their widths and memory fit (`--co-schedule on|off`); default on. */
  coSchedule?: boolean;
}

export const DEFAULT_CONFIG: Omit<RunnerConfig, 'runnerDir' | 'stateDir' | 'labRoot' | 'homeRepos' | 'urls' | 'commit'> = {
  bridgePort: 8642, budget: DEFAULT_BUDGET, backoff: DEFAULT_BACKOFF, publicStatus: true, cores: null, coSchedule: true,
  publishEveryMs: 4.5 * 60_000, publicEveryMs: 60_000, publicHeartbeatMs: 2 * 60_000, fetchEveryMs: 60_000, metricsEveryMs: 60_000, push: true,
};

type StepKind = 'shell' | 'pilot-checks' | 'final-checks' | 'collect';

/** A finished `## Commands` block (D365): its exit code, when it ended, and the hash of its text (blockSha). */
export interface BlockDone { rc: number; at: number; sha: string }

/** A block's identity for a retry: the hash of its text as the job file has it (before substitution). */
export function blockSha(text: string): string {
  return createHash('sha1').update(text).digest('hex').slice(0, 12);
}

/** The exit codes a process killed by SIGKILL leaves (bash: 128 + 9; a tool that reports the signal: 9). */
export const OOM_EXIT_CODES: ReadonlySet<number> = new Set([137, 9]);
interface Step {
  name: string; kind: StepKind; phase: 'prepare' | 'pilot' | 'commands' | 'checks' | 'collect'; block?: string; of?: string;
  /** The block's own `cores:` line: this step's width (and the most {workers} it gets). */
  cores?: number | null;
  /** The block's own `mem_gb:` line: this step's whole memory reservation. */
  memGb?: number | null;
}

export interface JobRun {
  id: string;
  title: string;
  cpu: 'heavy' | 'light';
  file: string;
  /** A heavy job's lane: 0 the clones as before, k > 0 `<repo>-lane<k+1>` (absent in an older run.json: 0). */
  lane?: number;
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
  /** The live counters' recent values (`drafts`, `games`), for their rates per hour. */
  liveHist?: Array<{ at: number; v: Record<string, number> }>;
  /** The unit's memory as the backoff last read it (GB). */
  memGb?: number | null;
  shas: Record<string, string>;
  /** Full commits the first prepare checked out: a retry or resume checks these out again, never a branch that moved (D341's version refusal). */
  pinned?: Record<string, string>;
  restarts: Array<{ at: number; how: 'resumed' | 'restarted' | 'adopted'; why: string }>;
  /** The `## Commands` blocks that finished (D365), by step name: exit code, when, and the block text's hash. */
  blocksDone?: Record<string, BlockDone>;
  /** The `.restart-*` copies beside the job's clean: paths, as last measured (never deleted, D365). */
  aside?: { copies: number; bytes: number } | null;
  approved: boolean;
  /** Why the next step waits to start, when it does (for the log, once). */
  heldFor?: string | null;
  /** The width the next step waits for, when it waits for cores other jobs hold (D365's per-step widths); null: not waiting. */
  waitingCores?: number | null;
  /** The width its last step started at (at first, the width it was admitted at): a step no wider never waits (D365). */
  lastWidth?: number | null;
  /** The job's tools read the control file: `control:` as written, else detected after prepare (null: not known yet). */
  canControl: boolean | null;
  /** Memory stops so far, this run and the ones before it; at backoff.maxMemoryStops the job fails. */
  memoryStops: number;
  stopping: null | { why: 'memory' | 'abort' | 'timeout' | 'user'; detail: string };
  outcome: null | { state: 'done' | 'failed' | 'waiting' | 'skipped'; at: number; reason: string; fields?: Record<string, string> };
  numbers: Record<string, number>;
  published: boolean;
  /** The STATUS text waiting to be pushed. */
  pendingStatus: string | null;
}

interface Persist {
  paused: boolean; lastPublish: number; lastFetch: number; dirty: boolean; lastHost: HostSample | null; started: number; ladderSig?: string;
  /** Failed publishes in a row, and when the next try may come (exponential: 30 s, 1, 2, 4 … 30 min). */
  publishFailures?: number; nextPublishAt?: number;
  /** The public copy's own clock: when it was last pushed, what it held (publicSig), and its failures and backoff. */
  lastPublic?: number; publicSig?: string; publicFailures?: number; nextPublicAt?: number;
  /** Since when nothing has run (null while something runs). */
  idleSince?: number | null;
}

/** The counters whose rate per hour the page shows: drafts and games (a metric line's `<name>.drafts`, ...). */
const LIVE_COUNTER = /(^|\.)(drafts|games|night_drafts_done)$/;

/** Exponential backoff after `failures` failed pushes in a row: 30 s, 1, 2, 4 … 30 minutes. */
export function retryAt(now: number, failures: number): number {
  return now + Math.min(30 * 60_000, 30_000 * 2 ** (failures - 1));
}

/**
 * What the public copy says, the clock aside: `updated`, and what moves with it alone
 * (`elapsed`, `ratePerHour` / `eta`, and the live `elapsed_s` and `*_per_h`, which follow
 * from the counters and the time).  A change
 * of this is worth a push; a new `done` changes it.
 */
export function publicSignature(doc: StatusDoc, ladderSig = ''): string {
  const clockless = (live: Record<string, number> | undefined) => Object.fromEntries(Object.entries(live ?? {}).filter(([k]) => k !== 'elapsed_s' && !k.endsWith('_per_h')));
  return JSON.stringify({ ...doc, updated: '', heartbeat: '', running: doc.running.map((r) => ({ ...r, elapsed: 0, ratePerHour: null, eta: null, live: clockless(r.live) })), ladder: ladderSig });
}

/** Names a `collect:` file may not take: they are the runner's own facts in results/<id>/. */
export const RESERVED_OUTPUTS = new Set(['STATUS', 'summary.md', 'failure.txt', 'checks.txt', 'metrics.json', 'pilot-checks.txt', 'pilot-metrics.json', 'events.jsonl', 'collect-skipped.txt']);

/** After a memory stop, how long before another job may be stopped for memory: the freed memory shows in avg10. */
export const MEMORY_STOP_SETTLE_MS = 60_000;

/** A network git call is cut off after this long, so one dead fetch or push never stalls the loop. */
export const GIT_TIMEOUT_MS = 30_000;

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
  /** Job files that vanished from a successful read of pc-jobs: the reads in a row they were missing, and their last text. */
  missing = new Map<string, number>();
  retained = new Map<string, JobFile>();
  /** When the last memory stop was sent (one at a time: `apply`). */
  lastMemoryStop = -Infinity;

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
  checkout(repo: string, cpu: 'heavy' | 'light', lane = 0): string {
    return path.join(this.cfg.labRoot, cpu === 'light' ? `${repo}-light` : lane > 0 ? `${repo}-lane${lane + 1}` : repo);
  }
  /** A run's own checkout of a repo: its cpu class and its lane. */
  checkoutOf(r: Pick<JobRun, 'cpu' | 'lane'>, repo: string): string { return this.checkout(repo, r.cpu, r.cpu === 'heavy' ? r.lane ?? 0 : 0); }
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
  /** Every git call: no prompt, ssh in batch mode, a stalled transfer cut off, and a hard timeout. */
  private git(dir: string, ...args: string[]): { code: number; stdout: string; stderr: string } {
    return this.sys.run(['git', '-C', dir, '-c', 'http.lowSpeedLimit=1000', '-c', 'http.lowSpeedTime=20', ...args], { timeoutMs: GIT_TIMEOUT_MS, env: GIT_ENV });
  }

  // ------------------------------------------------------------------ the queue

  /**
   * Clone the queue repo if needed, fetch pc-jobs and pc-results, read jobs and STATUS files.  A git
   * failure keeps what was read before; a job file must be missing from two successful reads in a
   * row before its running job is stopped (retained, below).
   */
  readQueue(force = false): void {
    if (!force && this.sys.now() - this.p.lastFetch < this.cfg.fetchEveryMs && this.jobs.length) return;
    const repo = this.queueRepo();
    try { this.ensureClone('mtg-table', repo); } catch (e) { this.sys.log(`queue: ${(e as Error).message}`); return; }
    const f = this.git(repo, 'fetch', '--quiet', 'origin', '+refs/heads/pc-jobs:refs/remotes/origin/pc-jobs', '+refs/heads/pc-results:refs/remotes/origin/pc-results');
    if (f.code !== 0) this.sys.log(`fetch failed: ${f.stderr.trim().split('\n').at(-1)}`);
    this.p.lastFetch = this.sys.now();
    const ls = this.git(repo, 'ls-tree', '--name-only', 'origin/pc-jobs', 'jobs/');
    if (ls.code === 0) {
      const prev = new Map(this.jobs.map((j) => [j.id, j]));
      const next: JobFile[] = [];
      for (const n of ls.stdout.split('\n').filter((x) => /^jobs\/J\d+[^/]*\.md$/.test(x))) {
        const show = this.git(repo, 'show', `origin/pc-jobs:${n}`);
        const id = /\b(J\d{3,})/.exec(n)?.[1] ?? '';
        if (show.code !== 0) { const old = prev.get(id); if (old) next.push(old); continue; }
        const j = parseJobFile(n, show.stdout, parseExpr);
        if (j.id) next.push(j);
      }
      // Every job known before — read last time, or already retained as missing — counts one more missing read.
      for (const [id, j] of new Map([...this.retained, ...prev])) {
        if (next.some((x) => x.id === id)) { this.missing.delete(id); this.retained.delete(id); continue; }
        this.missing.set(id, (this.missing.get(id) ?? 0) + 1);
        this.retained.set(id, j);
      }
      for (const id of next.map((x) => x.id)) { this.missing.delete(id); this.retained.delete(id); }
      // A removed job nothing runs any more is forgotten after a few reads.
      for (const [id, n] of this.missing) if (n >= 3 && !this.active().some((x) => x.id === id)) { this.missing.delete(id); this.retained.delete(id); }
      this.jobs = next.sort((a, b) => idOrder(a.id, b.id));
    } else {
      this.sys.log(`queue: git ls-tree pc-jobs failed (exit ${ls.code}); keeping the ${this.jobs.length} job(s) read before`);
    }
    const st = this.git(repo, 'ls-tree', '-r', '--name-only', 'origin/pc-results', 'results/');
    if (st.code !== 0) { this.sys.log(`queue: git ls-tree pc-results failed (exit ${st.code}); keeping the STATUS files read before`); return; }
    const origin = new Map<string, Status>();
    for (const n of st.stdout.split('\n')) {
      const m = /^results\/(J\d+)\/STATUS$/.exec(n);
      if (!m) continue;
      const show = this.git(repo, 'show', `origin/pc-results:${n}`);
      const s = show.code === 0 ? parseStatus(show.stdout) : this.origin.get(m[1] as string) ?? null;
      if (s) origin.set(m[1] as string, s);
    }
    this.origin = origin;
  }

  ensureClone(repo: string, dest: string): void {
    if (fs.existsSync(path.join(dest, '.git'))) return;
    const home = this.cfg.homeRepos[repo];
    const url = this.cfg.urls[repo] ?? (home ? this.sys.run(['git', '-C', home, 'remote', 'get-url', 'origin']).stdout.trim() : '');
    if (!url) throw new Error(`no remote URL for ${repo}: pass --home-${repo} or --url-${repo}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    this.sys.log(`cloning ${repo} into ${dest}`);
    const r = this.sys.run(['git', 'clone', '--quiet', ...(home ? ['--reference-if-able', home, '--dissociate'] : []), url, dest], { timeoutMs: 1_800_000, env: GIT_ENV });
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
    // The jobs first: a slow or dead network (the fetch, the publish) never delays monitoring them.
    this.sampleHost();
    this.handleRequests();
    for (const r of this.active()) this.advance(r);
    this.readQueue();
    const st = this.statuses();
    const { start, blocked } = schedule({
      jobs: this.jobs, statuses: st, active: new Map(this.active().map((r) => [r.id, r.cpu])),
      holdings: new Map(this.active().map((r) => [r.id, this.holding(r)])), machine: this.machineBudget(),
      playing: this.sys.playing(this.cfg.bridgePort), paused: this.isPaused(), now: this.sys.now(),
    });
    this.blocked = blocked;
    for (const job of start) this.begin(job, st.get(job.id) ?? null);
    const doc = this.writeStatusJson();
    if (this.ladderSig() !== (this.p.ladderSig ?? '')) this.p.dirty = true;
    const now = this.sys.now();
    const stateChanged = this.p.dirty;
    const due = this.p.dirty || now - this.p.lastPublish >= this.cfg.publishEveryMs;
    if (due && now >= (this.p.nextPublishAt ?? 0)) this.publish();
    if (this.cfg.publicStatus) this.maybePublishPublic(sanitise(doc), stateChanged);
    this.save();
  }

  /** A start: the steps, a STATUS of `running`. */
  begin(job: JobFile, st: Status | null): JobRun {
    const prev = this.runs.get(job.id);
    if (prev && !prev.outcome) throw new Error(`${job.id} is already running`);
    const approved = !!st && st.state === 'waiting' && 'approved' in st.fields;
    const cap = st?.fields.workers_cap ? Number(st.fields.workers_cap) : null;
    // A retry after a memory stop or a `stop`: a pilot that already passed is not run again, and
    // neither is a `## Commands` block that finished (D365): the retry starts at the block that was stopped.
    const retry = !!prev && prev.outcome?.state === 'waiting' && /^(memory|stopped)/.test(prev.outcome.reason) && !!prev.sizing;
    const resume = retry ? this.resumeBlock(job, this.doneBlocks(prev as JobRun)) : null;
    const from = resume?.from ?? 0;
    const steps = this.stepsFor(job, approved || retry, from);
    const moved = retry && !job.resumable ? this.cleanAside(prev as JobRun, job, from) : [];
    const lanes = new Set(this.active().filter((x) => x.cpu === 'heavy').map((x) => x.lane ?? 0));
    let lane = 0;
    while (job.cpu === 'heavy' && lanes.has(lane)) lane++;
    const r: JobRun = {
      lane: job.cpu === 'heavy' ? lane : 0,
      canControl: job.control, memoryStops: prev?.outcome?.state === 'waiting' ? prev.memoryStops ?? 0 : 0,
      id: job.id, title: job.title, cpu: job.cpu, file: job.file, startedAt: this.sys.now(), steps, stepIndex: 0,
      unit: null, unitStartedAt: 0, workers: 1, sizing: null, cap: Number.isFinite(cap) ? cap : null,
      pinned: retry ? prev?.pinned : undefined,
      peakRssGb: prev?.peakRssGb ?? null, backoff: null, playingHeld: false, events: [], progress: [], total: null, progressUnit: null, dataUpdated: null,
      metrics: {}, metricsAt: 0, shas: {}, restarts: [], approved, stopping: null, outcome: null, numbers: {}, published: false, pendingStatus: null,
      blocksDone: resume?.kept ?? {}, aside: prev?.aside ?? null, lastWidth: widthOf(job, this.machineBudget()),
    };
    if (retry) {
      r.restarts.push({ at: this.sys.now(), how: job.resumable ? 'resumed' : 'restarted', why: `retry after "${prev?.outcome?.reason}"; the pilot had passed; ${resume?.why}${moved.length ? `; moved aside: ${moved.join(', ')}` : ''}${job.resumable ? '; the tools skip what is done' : ''}` });
    }
    fs.rmSync(path.join(this.jobDir(job.id), 'out'), { recursive: true, force: true });
    fs.mkdirSync(path.join(this.jobDir(job.id), 'out'), { recursive: true });
    this.runs.set(job.id, r);
    this.sys.log(`${job.id}: start (${job.cpu}${lane ? `, lane ${lane + 1}` : ''}; ${steps.map((s) => s.name).join(', ')})`);
    this.setStatus(r, 'running', { phase: 'prepare' });
    this.save(r);
    this.advance(r);
    return r;
  }

  /** The job's steps; `fromBlock` > 0: a retry that starts at that `## Commands` block (0-based), the ones before it done. */
  stepsFor(job: JobFile, approved: boolean, fromBlock = 0): Step[] {
    // prepare_cores: / pilot_cores: (D365): the width those steps hold beside other jobs; absent: the job's width.
    const steps: Step[] = [{ name: 'prepare', kind: 'shell', phase: 'prepare', cores: job.prepareCores ?? null }];
    const pb = job.pilot?.blocks ?? [];
    if (!approved) {
      pb.forEach((b, i) => steps.push({ name: `pilot${i + 1}`, kind: 'shell', phase: 'pilot', block: b, of: `${i + 1}/${pb.length}`, cores: job.pilot?.blockCores?.[i] ?? job.pilotCores ?? null, memGb: job.pilot?.blockMemGb?.[i] ?? null }));
      steps.push({ name: 'pilot-checks', kind: 'pilot-checks', phase: 'checks' });
    }
    const cb = job.commands?.blocks ?? [];
    cb.forEach((b, i) => { if (i >= fromBlock) steps.push({ name: `run${i + 1}`, kind: 'shell', phase: 'commands', block: b, of: `${i + 1}/${cb.length}`, cores: job.commands?.blockCores?.[i] ?? null, memGb: job.commands?.blockMemGb?.[i] ?? null }); });
    steps.push({ name: 'final-checks', kind: 'final-checks', phase: 'checks' });
    steps.push({ name: 'collect', kind: 'collect', phase: 'collect' });
    return steps;
  }

  /**
   * The `## Commands` blocks a run finished (D365): its record, and -- a run.json written before
   * D365 has none -- every commands step before the one it stopped at (a step is passed only on exit 0).
   */
  doneBlocks(r: JobRun): Record<string, BlockDone> {
    const out: Record<string, BlockDone> = { ...(r.blocksDone ?? {}) };
    r.steps.forEach((s, i) => {
      if (i < r.stepIndex && s.phase === 'commands' && s.block !== undefined && !out[s.name]) out[s.name] = { rc: 0, at: r.startedAt, sha: blockSha(s.block) };
    });
    return out;
  }

  /**
   * Where a retry starts (D365): the first `## Commands` block not done with the same text (0-based; 0 =
   * from run1).  A non-resumable job whose only clean: is the header's starts from run1 whatever is done:
   * nothing says which block made which path, and moving them all aside would lose the done blocks' work.
   */
  resumeBlock(job: JobFile, done: Record<string, BlockDone>): { from: number; kept: Record<string, BlockDone>; why: string } {
    const blocks = job.commands?.blocks ?? [];
    let from = 0;
    while (from < blocks.length && done[`run${from + 1}`]?.rc === 0 && done[`run${from + 1}`]?.sha === blockSha(blocks[from] as string)) from++;
    const list = (n: number): string => Array.from({ length: n }, (_, i) => `run${i + 1}`).join(', ');
    const blockClean = (job.commands?.blockClean ?? []).some((c) => c.length > 0);
    if (from > 0 && !job.resumable && job.clean.length && !blockClean) {
      return { from: 0, kept: {}, why: `starts again at run1: ${list(from)} ${from > 1 ? 'are' : 'is'} done, but the job's clean: is job-wide (no clean: line before a block), so the runner cannot tell what they made` };
    }
    const kept = Object.fromEntries(Object.entries(done).filter(([n]) => Number(n.slice(3)) <= from));
    if (from === 0) return { from, kept, why: 'starts again at run1' };
    const at = from < blocks.length ? `resumes at run${from + 1}` : `resumes after run${from}, the last block: the checks run again`;
    return { from, kept, why: `${at} (${list(from)} done, exit 0)` };
  }

  /** The job file: from the last read, or retained while it has been missing from fewer than two reads. */
  jobOf(r: JobRun): JobFile | null {
    return this.jobs.find((j) => j.id === r.id) ?? ((this.missing.get(r.id) ?? 0) < 2 ? this.retained.get(r.id) ?? null : null);
  }

  // ------------------------------------------------------------------ advancing

  advance(r: JobRun): void {
    const job = this.jobOf(r);
    if (!job) {
      // The job file is gone from two successful reads of pc-jobs: stop what runs, and say so.
      if (r.unit && this.sys.unitState(r.unit) !== 'gone') { this.sys.stopUnit(r.unit); return; }
      this.finish(r, 'skipped', 'the job file was removed from pc-jobs');
      return;
    }
    for (let guard = 0; guard < 50 && !r.outcome; guard++) {
      if (r.unit) {
        const state = this.sys.unitState(r.unit);
        // `unknown` (systemctl did not answer) is still running: never orphan a step on a timeout.
        if (LIVE_STATES.has(state)) {
          this.monitor(r, job, state === 'unknown');
          return;
        }
        if (!this.stepEnded(r, job, state)) return;
        continue;
      }
      const step = r.steps[r.stepIndex];
      if (!step) { this.finish(r, 'done', ''); return; }
      if (step.kind === 'shell') { if (!this.startStep(r, job, step)) return; continue; }
      this.internalStep(r, job, step);
    }
  }

  private rcFile(r: JobRun, step: Step): string { return path.join(this.jobDir(r.id), `${step.name}.sh.rc`); }
  /** The unit's memory.events `oom_kill` line, written by the wrapper before the exit code (D365). */
  private oomFile(r: JobRun, step: Step): string { return path.join(this.jobDir(r.id), `${step.name}.sh.oom`); }
  logFile(r: JobRun, step: Step): string { return path.join(this.jobDir(r.id), `${step.name}.log`); }

  /**
   * A step's unit is no longer live.  Returns false when the runner must wait: an unloaded-or-not
   * answer without an exit code is acted on only once systemd says LoadState=not-found (`gone`).
   */
  private stepEnded(r: JobRun, job: JobFile, state: string): boolean {
    const step = r.steps[r.stepIndex] as Step;
    let rc: number | null = null;
    try { rc = Number(fs.readFileSync(this.rcFile(r, step), 'utf8').trim()); } catch { rc = null; }
    if (rc !== null && !Number.isFinite(rc)) rc = null;
    if (rc === null && state !== 'gone') return false;
    r.unit = null;
    this.collectLogTail(r, step);
    if (step.phase === 'prepare' && rc === 0) {
      this.readShas(r, job);
      r.canControl ??= this.detectControl(r, job);
    }
    if (r.stopping) {
      const s = r.stopping;
      r.stopping = null;
      if (s.why === 'memory') this.memoryStop(r, s.detail);
      else if (s.why === 'user') {
        this.finish(r, 'waiting', `stopped: ${s.detail}`);
      } else {
        this.finish(r, 'failed', `${s.why === 'abort' ? 'aborted' : 'timeout'}: ${s.detail}`);
      }
      return true;
    }
    if (rc === 0) {
      if (step.phase === 'commands') r.blocksDone = { ...(r.blocksDone ?? {}), [step.name]: { rc: 0, at: this.sys.now(), sha: blockSha(step.block ?? '') } };
      r.stepIndex++;
      this.save(r);
      return true;
    }
    if (rc === null) {
      // No exit code and the unit unloaded: it was killed from outside (systemd-oomd, the OOM killer, a reboot).
      this.memoryStop(r, `step ${step.name} was killed without an exit code (oomd or the OOM killer?)`);
      return true;
    }
    // SIGKILL's exit code, and evidence of an OOM kill in the unit: a memory stop, retried, not a failure (D365).
    const oom = OOM_EXIT_CODES.has(rc) ? this.oomEvidence(r, step) : null;
    if (oom) {
      this.memoryStop(r, `step ${step.name} exited ${rc} after an OOM kill (${oom})`);
      return true;
    }
    this.writeOut(r, 'failure.txt', `step ${step.name} exited ${rc}\n\n${this.tail(this.logFile(r, step), 60)}`);
    this.finish(r, 'failed', `${step.phase === 'pilot' ? 'pilot: ' : step.phase === 'prepare' ? 'prepare: ' : ''}step ${step.name} exited ${rc}`, { exit: String(rc) });
    return true;
  }

  /**
   * Evidence that the kernel's OOM killer killed a process in the step's unit (D365), or null: the
   * wrapper's own read of the unit's memory.events (`oom_kill N`, N > 0) as the step ended, else (a
   * wrapper from before D365, or a global OOM the counter missed) systemd's Result or the unit's journal.
   */
  oomEvidence(r: JobRun, step: Step): string | null {
    let n = NaN;
    try { n = Number(/^oom_kill\s+(\d+)/m.exec(fs.readFileSync(this.oomFile(r, step), 'utf8'))?.[1]); } catch { /* none */ }
    if (n > 0) return `the unit's memory.events: oom_kill ${n}`;
    return this.sys.unitOomEvidence(unitName(r.id, step.name), r.unitStartedAt);
  }

  /** A memory stop: waiting, retried later with one worker fewer — or failed, at the configured number of stops. */
  memoryStop(r: JobRun, detail: string): void {
    r.memoryStops = (r.memoryStops ?? 0) + 1;
    const stops = String(r.memoryStops);
    if (r.memoryStops >= this.cfg.backoff.maxMemoryStops) {
      this.finish(r, 'failed', `memory: stopped ${stops} times (last: ${detail})`, { memory_stops: stops });
      return;
    }
    const cap = retryCap(r.backoff?.workers ?? r.workers);
    this.finish(r, 'waiting', `memory: ${detail}`, { workers_cap: String(cap), retry_after: isoLocal(this.sys.now() + 15 * 60_000), memory_stops: stops });
  }

  /**
   * After prepare: the job's tools read the control file when the checkout has tools/runner/control.ts
   * (D337's pools) and the job runs ai-bench, the cube lab or the AI ladder; otherwise drop and pause
   * events would be fiction, and memory pressure can only stop the job.
   */
  detectControl(r: JobRun, job: JobFile): boolean {
    const mtg = this.checkoutOf(r, 'mtg-table');
    const has = fs.existsSync(path.join(mtg, 'tools', 'runner', 'control.ts'));
    const blocks = [...(job.pilot?.blocks ?? []), ...(job.commands?.blocks ?? [])].join('\n');
    return has && /\b(ai-bench\.sh|cubelab\.sh|ai-ladder\.sh)\b/.test(blocks);
  }

  private readShas(r: JobRun, job: JobFile): void {
    r.pinned ??= {};
    for (const { repo } of job.repos) {
      const sha = this.git(this.checkoutOf(r, repo), 'rev-parse', 'HEAD').stdout.trim();
      if (!sha) continue;
      r.shas[repo] = sha.slice(0, 7);
      r.pinned[repo] ??= sha;
    }
  }

  /** The cwd for a job's commands: the mtg-table checkout when the job names it, else its first repo's. */
  cwdOf(r: JobRun, job: JobFile): string {
    const repo = job.repos.find((x) => x.repo === 'mtg-table')?.repo ?? job.repos[0]?.repo ?? 'mtg-table';
    return this.checkoutOf(r, repo);
  }

  /**
   * {workers}, {mtg-table}, {ForgeCoach}, and Justin's own checkout paths rewritten to the lab's:
   * the literal path, `~/code/<repo>`, `$HOME/code/<repo>` and `${HOME}/code/<repo>`.
   */
  substitute(text: string, r: JobRun, step?: Step): string {
    let t = text.replace(/\{workers\}/g, String(this.stepWorkers(r, step)));
    for (const repo of ['mtg-table', 'ForgeCoach']) {
      const lab = this.checkoutOf(r, repo);
      t = t.split(`{${repo}}`).join(lab);
      const home = this.cfg.homeRepos[repo];
      const esc = (x: string): string => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (home) t = t.replace(new RegExp(`${esc(home)}(?![\\w-])`, 'g'), lab);
      t = t.replace(new RegExp(`(~|\\$HOME|\\$\\{HOME\\})/code/${esc(repo)}(?![\\w-])`, 'g'), lab);
    }
    return t;
  }

  /**
   * A script that still reaches Justin's checkouts after substitution (a quoted split, a variable, a
   * relative climb): refused, never run.  Returns what it found, or null.
   */
  homeReference(script: string): string | null {
    let t = script.split(this.cfg.labRoot).join('{lab}');
    for (const repo of Object.keys(this.cfg.homeRepos)) t = t.split(this.checkout(repo, 'heavy')).join('{lab}');
    const homes = Object.values(this.cfg.homeRepos);
    for (const h of [...homes, ...homes.map((x) => path.dirname(x))]) if (h && t.includes(h)) return h;
    const m = /(~|\$HOME|\$\{HOME\})\/code\b/.exec(t);
    return m ? m[0] : null;
  }

  prepareScript(r: JobRun, job: JobFile): string {
    const lines = ['set -eo pipefail'];
    for (const { repo, ref: asked } of job.repos) {
      // A retry or a restart checks out the commit the job first ran on, not where its branch is now.
      const ref = r.pinned?.[repo] ?? asked;
      if (!/^[A-Za-z0-9._/-]+$/.test(ref)) throw new Error(`a ref the runner will not pass to git: ${ref}`);
      const dest = this.checkoutOf(r, repo);
      const home = this.cfg.homeRepos[repo];
      const url = this.cfg.urls[repo] ?? (home ? this.sys.run(['git', '-C', home, 'remote', 'get-url', 'origin']).stdout.trim() : '');
      lines.push(`# ${repo}@${ref}`,
        `if [ ! -d ${q(dest)}/.git ]; then git clone --quiet ${home ? `--reference-if-able ${q(home)} --dissociate ` : ''}${q(url)} ${q(dest)}; fi`,
        `cd ${q(dest)}`,
        // A lane's var/ is lane 1's: every job's outputs in one place (the header's LANES).
        ...(repo === 'mtg-table' && r.cpu === 'heavy' && (r.lane ?? 0) > 0 ? [
          `mkdir -p ${q(path.join(this.checkout(repo, 'heavy'), 'var'))}`,
          `if [ ! -L var ]; then if [ -e var ]; then mv var ".var-before-lane-$(date +%Y%m%d%H%M%S)"; fi; ln -s ${q(path.join(this.checkout(repo, 'heavy'), 'var'))} var; fi`,
          // .gitignore's `var/` matches a directory, not a symlink: keep the tree clean for the version stamps.
          `grep -qx var .git/info/exclude 2>/dev/null || echo var >> .git/info/exclude`,
        ] : []),
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
    if (step.phase !== 'prepare') {
      const found = this.homeReference(this.substitute(step.block ?? '', r, step));
      if (found) throw new Error(`step ${step.name} still names Justin's checkout (${found}) after rewriting it to the lab's clones; the runner never runs a job there`);
    }
    const body = step.phase === 'prepare' ? this.prepareScript(r, job) : `set -eo pipefail\ncd ${q(this.cwdOf(r, job))}\n${this.substitute(step.block ?? '', r, step)}`;
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
        JOBS: String(this.stepWorkers(r, step)), LAB_WORKERS: String(this.stepWorkers(r, step)), LAB_CONTROL: this.controlFile(r.id), LAB_JOB: r.id, LAB_STEP: step.name,
        MTG_TABLE: this.checkoutOf(r, 'mtg-table'), FORGECOACH: this.checkoutOf(r, 'ForgeCoach'),
        // The step's width (the cores the runner reserved for it) caps BLAS / OpenMP / numexpr pools: numpy at
        // width 1 gets one thread, not all 16 (J060).  Java ignores these; a block's own export wins.
        ...threadCaps(this.stepWidth(r, step, job)),
      },
    };
  }

  /**
   * `tools/runner.sh plan`: for each waiting job (or `only`), the scripts, the thread cap and the
   * systemd-run line its next start would use.  Starts nothing.  Returns the exit code.
   */
  plan(only: string | null, print: (line: string) => void): number {
    this.readQueue(true);
    const st = this.statuses();
    const jobs = only ? this.jobs.filter((j) => j.id === only) : this.jobs;
    if (!jobs.length) { print(only ? `no job ${only} on origin/pc-jobs` : 'no jobs on origin/pc-jobs'); return 1; }
    const m = this.sys.machine();
    print(`machine: ${m.memTotalGb.toFixed(1)} GB, ${m.physicalCores} cores / ${m.threads} threads; lab budget ${JSON.stringify(budgetOf(m, this.cfg.budget))}`);
    for (const job of jobs) {
      const s = st.get(job.id);
      if (!only && s && s.state !== 'waiting') continue;
      print(`\n== ${job.id} ${job.title} (${job.cpu}; STATUS ${s?.state ?? 'none'})`);
      if (job.errors.length) { print(`   job file errors:\n     ${job.errors.join('\n     ')}`); continue; }
      const run: JobRun = { id: job.id, title: job.title, cpu: job.cpu, file: job.file, startedAt: this.sys.now(), steps: this.stepsFor(job, !!s && 'approved' in s.fields), stepIndex: 0, canControl: job.control, memoryStops: 0, unit: null, unitStartedAt: 0, workers: this.maxWorkersOf(job) ?? Math.max(1, m.physicalCores - 1), sizing: null, cap: null, peakRssGb: null, backoff: null, playingHeld: false, events: [], progress: [], total: null, progressUnit: null, dataUpdated: null, metrics: {}, metricsAt: 0, shas: {}, restarts: [], approved: false, stopping: null, outcome: null, numbers: {}, published: false, pendingStatus: null };
      for (const step of run.steps) {
        if (step.kind !== 'shell') { print(`\n-- ${step.name}: the runner's own step${step.kind === 'pilot-checks' ? `: ${job.pilot?.checks.length ? job.pilot.checks.join(' | ') : 'NO check: lines -> waiting, needs a human/Claude check'}` : step.kind === 'final-checks' ? `: ${job.commands?.checks.join(' | ') || 'none'}` : ''}`); continue; }
        const u = this.unitSpec(run, job, step);
        print(`\n-- ${step.name} (${u.script}):\n${this.stepScript(run, job, step).split('\n').map((l) => `   | ${l}`).join('\n')}`);
        print(`   threads: ${u.env.OMP_NUM_THREADS} (the step's width; ${THREAD_CAP_VARS.join(', ')}; an export in the block wins)`);
        print(`[dry-run] ${systemdRunLine(u)}`);
      }
      if (job.aborts.length) print(`\n-- abort (every minute): ${job.aborts.join(' | ')}`);
    }
    return 0;
  }

  /** Why a step may not start now (the runner is paused, Justin is at the table, the backoff paused the job), or null. */
  holdReason(r: JobRun): string | null {
    if (this.isPaused()) return 'the runner is paused';
    if (r.cpu === 'heavy' && this.sys.playing(this.cfg.bridgePort)) return 'Justin is at the table';
    if (r.backoff?.paused) return 'paused for memory';
    return null;
  }

  /** Start a shell step's unit.  False: not started now (held, or a unit of this job is still alive); the next tick tries again. */
  private startStep(r: JobRun, job: JobFile, step: Step): boolean {
    const hold = this.holdReason(r);
    if (hold) {
      if (r.heldFor !== hold) { r.heldFor = hold; this.sys.log(`${r.id}: ${step.name} waits: ${hold}`); this.save(r); }
      return false;
    }
    // A step wider than the cores the other jobs leave (a narrow pilot_cores: pilot let one start beside
    // this job) waits for them; nothing is stopped or killed (D365).
    // The first commands step was sized at the pilot's end against the memory the others held then; one
    // that waits for cores is sized again when it starts, so meanwhile it claims the job's full width.
    if (r.cpu === 'heavy' && step.phase === 'commands' && r.sizing && r.stepIndex === r.steps.findIndex((s) => s.phase === 'commands') && this.coresWait(r, job, step)) r.sizing = null;
    const need = this.coresWait(r, job, step);
    if (need) {
      const hold2 = `needs ${need.need} core(s) for ${step.name}; ${need.free} of ${need.total} free (it waits for them; nothing is stopped)`;
      if (r.heldFor !== hold2) {
        r.heldFor = hold2; r.waitingCores = need.need;
        this.sys.log(`${r.id}: ${step.name} waits: ${hold2}`);
        this.setStatus(r, 'running', { phase: this.phaseOf(r) });
        this.save(r);
      }
      return false;
    }
    r.heldFor = null;
    r.waitingCores = null;
    const live = this.sys.liveUnits(`lab-${r.id}-`);
    if (live === null || live.length) {
      this.sys.log(`${r.id}: ${step.name} not started: ${live === null ? 'systemctl did not answer' : `${live.join(', ')} still alive`}`);
      return false;
    }
    if (step.phase === 'pilot' && r.stepIndex === r.steps.findIndex((s) => s.phase === 'pilot')) {
      r.workers = Math.min(PILOT_MAX_WORKERS, sizeWorkers({ budgetGb: this.heavyBudget(r), physicalCores: this.sys.machine().physicalCores, maxWorkers: this.maxWorkersOf(job), measuredPeakGb: null, memPerWorkerGb: job.memPerWorkerGb, cap: r.cap }).workers);
    }
    if (step.phase === 'commands' && !r.sizing) this.size(r, job);
    if (step.phase !== 'prepare') {
      r.backoff ??= initialBackoff(r.workers);
      if (step.phase === 'commands' && r.backoff.sized !== r.workers) r.backoff = initialBackoff(r.workers);
      this.writeEffectiveControl(r);
    }
    const u = this.unitSpec(r, job, step);
    let script: string;
    try { script = this.stepScript(r, job, step); } catch (e) {
      this.finish(r, 'failed', (e as Error).message);
      return false;
    }
    fs.writeFileSync(u.script, script);
    const rc = this.rcFile(r, step);
    const oom = this.oomFile(r, step);
    fs.rmSync(rc, { force: true });
    fs.rmSync(oom, { force: true });
    fs.writeFileSync(`${u.script}.wrap`, wrapScript(u.script, rc, oom));
    fs.appendFileSync(u.log, `==== ${r.id} ${step.name} started ${isoLocal(this.sys.now())} in unit ${u.unit}, ${this.stepWorkers(r, step)} worker(s), ${this.holding(r).cores} core(s), BLAS/OpenMP threads ${u.env.OMP_NUM_THREADS}${r.lane ? `, lane ${r.lane + 1}` : ''}\n`);
    const res = this.sys.startUnit(u);
    if (res.code !== 0) {
      this.finish(r, 'failed', `systemd-run failed for ${u.unit}: ${(res.stderr || res.stdout).trim().split('\n').at(-1)}`);
      return false;
    }
    r.unit = u.unit;
    r.unitStartedAt = this.sys.now();
    r.lastWidth = this.stepWidth(r, step, job);
    this.setStatus(r, 'running', { phase: this.phaseOf(r) });
    this.save(r);
    return true;
  }

  /**
   * The memory a run is sized against: a light job's share; a heavy job's budget less what
   * the other heavy jobs running beside it reserve (co-scheduling), at least 1 GB.
   */
  heavyBudget(r: JobRun): number {
    const b = budgetOf(this.sys.machine(), this.cfg.budget);
    if (r.cpu === 'light') return b.lightGb;
    const others = this.othersHolding(r).reduce((a, h) => a + h.memGb, 0);
    return Math.max(1, Math.round((b.heavyGb - others) * 10) / 10);
  }

  /**
   * What the other heavy jobs hold, as `r` sees it before starting a step: their holdings, except a job
   * later in order (by id) that is itself waiting for cores to widen (D365): it runs nothing, and the
   * earlier job goes first, so two waiting jobs never wait for each other.
   */
  othersHolding(r: JobRun): Holding[] {
    return this.active().filter((x) => x.id !== r.id && x.cpu === 'heavy' && !(x.waitingCores && idOrder(x.id, r.id) > 0)).map((x) => this.holding(x));
  }

  /**
   * D365 (per-step widths): a heavy step needing more cores than the other heavy jobs leave waits, or null.
   * Only when jobs run side by side; a job alone always has the machine.  While it waits, its holding is
   * the waiting step's width, so the scheduler starts nothing new beside it (no starvation).
   */
  coresWait(r: JobRun, job: JobFile, step: Step): { need: number; free: number; total: number } | null {
    if (r.cpu !== 'heavy') return null;
    // Only a step WIDER than the one before it waits: the job already held those cores (or was admitted
    // with them), so a job that is not widening never waits for one that is (no deadlock).  A run from
    // before D365 has no lastWidth: it never waits, as before.
    const need0 = this.stepWidth(r, step, job);
    if (r.lastWidth == null || need0 <= r.lastWidth) return null;
    const m = this.machineBudget();
    if (!m.coSchedule) return null;
    const others = this.othersHolding(r);
    if (!others.length) return null;
    const used = others.reduce((a, h) => a + h.cores, 0);
    const need = need0;
    return used + need > m.cores ? { need, free: Math.max(0, m.cores - used), total: m.cores } : null;
  }

  /** The workers a job may have: max_workers, and never more than its `cores:` width. */
  maxWorkersOf(job: JobFile): number | null {
    const c = [job.maxWorkers, job.cores].filter((x): x is number => typeof x === 'number');
    return c.length ? Math.min(...c) : null;
  }

  /** {workers} (and JOBS) in a step: the run's workers, at most the block's own `cores:`. */
  stepWorkers(r: JobRun, step: Step | undefined = r.steps[r.stepIndex]): number {
    return step?.cores ? Math.max(1, Math.min(r.workers, step.cores)) : r.workers;
  }

  /** The core budget heavy jobs share, the memory they share, and whether one may start beside another now. */
  machineBudget(): MachineBudget {
    const m = this.sys.machine();
    const backoff = this.active().some((r) => !!r.backoff && (r.backoff.paused || r.backoff.workers < r.backoff.sized))
      || (this.host?.some10 ?? 0) >= this.cfg.backoff.highSome;
    return {
      cores: Math.max(1, this.cfg.cores ?? m.physicalCores), memGb: budgetOf(m, this.cfg.budget).heavyGb,
      defaultWidth: Math.max(1, m.physicalCores - 1), memoryBackoff: backoff, coSchedule: this.cfg.coSchedule !== false,
    };
  }

  /**
   * What a running job holds now: its width — its current step's `cores:`, else its `cores:` header, else
   * its workers (sized, or what it may be sized to) — and its memory: the step's `mem_gb:`, else that many
   * workers at its per-worker peak.
   */
  holding(r: JobRun): Holding {
    const job = this.jobOf(r);
    const step = r.steps[r.stepIndex];
    const cores = this.stepWidth(r, step, job);
    const peak = r.sizing?.peakGb ?? Math.max(r.peakRssGb ?? 0, job?.memPerWorkerGb ?? DEFAULT_PEAK_GB);
    return { cores, memGb: Math.round((step?.memGb ?? cores * peak) * 10) / 10 };
  }

  /**
   * A step's width: the cores the runner reserves for it beside other jobs (`holding`) and the thread
   * cap its unit gets — the block's `cores:`, else the job's, else its sized workers, else the width it
   * was admitted at (max_workers, else physical cores − 1; light 1); at most the core budget.
   */
  stepWidth(r: JobRun, step: Step | undefined, job: JobFile | null = this.jobOf(r)): number {
    const mb = { cores: Math.max(1, this.cfg.cores ?? this.sys.machine().physicalCores), defaultWidth: Math.max(1, this.sys.machine().physicalCores - 1) };
    if (step?.cores) return Math.min(step.cores, mb.cores);
    if (job?.cores) return Math.min(job.cores, mb.cores);
    if (r.sizing) return Math.min(r.sizing.workers, mb.cores);
    return job ? widthOf(job, mb) : mb.cores;
  }

  size(r: JobRun, job: JobFile): void {
    r.sizing = sizeWorkers({ budgetGb: this.heavyBudget(r), physicalCores: this.sys.machine().physicalCores, maxWorkers: this.maxWorkersOf(job), measuredPeakGb: r.peakRssGb, memPerWorkerGb: job.memPerWorkerGb, cap: r.cap });
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

  private monitor(r: JobRun, job: JobFile, unknown = false): void {
    const step = r.steps[r.stepIndex] as Step;
    const now = this.sys.now();
    if (step.phase === 'pilot' && r.unit) {
      const peaks = this.sys.unitJavaPeaksGb(r.unit);
      if (peaks.length) r.peakRssGb = Math.max(r.peakRssGb ?? 0, ...peaks);
    }
    if (r.stopping || unknown) return;           // stopping, or systemctl did not answer: wait for the next tick
    if (job.timeoutSec && now - r.unitStartedAt > job.timeoutSec * 1000) {
      this.stop(r, 'timeout', `step ${step.name} ran past ${job.timeoutSec} s`);
      return;
    }
    const canControl = r.canControl === true;
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
      r.memGb = this.sys.unitMemoryGb(r.unit);
      const { state, action } = decide(r.backoff, { at: now, some10: this.host.some10, swapIn: this.swapInRate, jobGb: r.memGb, jobMaxGb: maxGb, javaCount: this.sys.unitJavaCount(r.unit) }, canControl, this.cfg.backoff);
      r.backoff = state;
      // The job's own memory at its cap is the job's alone: no other job's stop relieves it.
      const ownHard = r.memGb !== null && r.memGb !== undefined && maxGb > 0 && r.memGb >= this.cfg.backoff.hardFraction * maxGb;
      if (action) this.apply(r, action, ownHard);
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

  private apply(r: JobRun, a: Action, ownHard = false): void {
    const kind = a.kind;
    if (kind === 'stop' && !ownHard) {
      // One memory stop at a time.  The pressure is the host's, so jobs side by side reach
      // the hard line in the same tick; stopping every one of them throws away all their
      // work when stopping one frees the memory.  Another job stopping (or just stopped)
      // for memory: this one waits, and its own hard line has to hold again from zero.
      // (Not when this job's own memory is at its cap: only stopping it helps that.)
      const now = this.sys.now();
      const other = this.active().find((x) => x !== r && x.stopping?.why === 'memory');
      if (other || now - this.lastMemoryStop < MEMORY_STOP_SETTLE_MS) {
        this.sys.log(`${r.id}: memory stop held back (${other ? `${other.id} is stopping for memory` : 'a job was just stopped for memory'}): ${a.why}`);
        return;
      }
    }
    if (kind === 'stop') this.lastMemoryStop = this.sys.now();
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
    const step = r.steps[r.stepIndex];
    const maxWorkers = Math.min(r.backoff?.workers ?? r.workers, step?.cores ?? Infinity);
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
    const counters: Record<string, number> = {};
    for (const [k, v] of Object.entries(r.metrics)) if (typeof v === 'number' && LIVE_COUNTER.test(k)) counters[k] = v;
    r.liveHist = [...(r.liveHist ?? []), { at: this.sys.now(), v: counters }].filter((s) => this.sys.now() - s.at <= 2 * 3600_000).slice(-200);
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

  /** The running job's live numbers for status.json: its metrics, headline first, and the counters' rates per hour. */
  liveFor(r: JobRun, job: JobFile | undefined, now: number): ReturnType<typeof liveOf> {
    const m: Flat = { ...r.metrics };
    const hist = r.liveHist ?? [];
    for (const k of Object.keys(hist.at(-1)?.v ?? {})) {
      const samples = hist.filter((s) => typeof s.v[k] === 'number').map((s) => ({ at: s.at, done: s.v[k] as number }));
      const { ratePerHour } = rateAndEta(samples, null, now);
      if (ratePerHour !== null) m[`${k}_per_h`] = ratePerHour;
    }
    return liveOf(m, job?.headline ?? []);
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
          const cmd = this.substitute(s.command ?? '', r);
          const found = this.homeReference(cmd);
          if (found) throw new Error(`names Justin's checkout (${found}); not run`);
          // In the lab slice, like the job: a metrics command is the job's code, under the job's budget.
          const res = this.sys.runInSlice(cmd, cwd, 300_000);
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
          if (RESERVED_OUTPUTS.has(path.basename(f)) || /^(pilot|run)\d+\.log$|^prepare\.log$/.test(path.basename(f))) {
            this.writeOut(r, 'collect-skipped.txt', `${path.basename(f)}: a name the runner reserves for its own outputs\n`, true);
            continue;
          }
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
    const done = Object.entries(r.blocksDone ?? {}).sort((a, b) => Number(a[0].slice(3)) - Number(b[0].slice(3)));
    if (done.length) f.blocks_done = done.map(([n, d]) => `${n} exit ${d.rc} at ${isoLocal(d.at)}`).join(', ');
    if (r.heldFor && r.waitingCores) f.waits = r.heldFor;
    if (r.aside?.copies) f.set_aside = `${r.aside.copies} cop${r.aside.copies === 1 ? 'y' : 'ies'}, ${(r.aside.bytes / 1024 ** 3).toFixed(2)} GB beside the job's clean: paths (never deleted: remove them by hand)`;
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
        if (state === 'unknown') continue;                                   // systemctl did not answer: decide at a later tick
        const step = r.steps[r.stepIndex] as Step;
        if (fs.existsSync(this.rcFile(r, step)) || r.stopping) continue;     // ended while we were down: the next tick reads it
        if (state !== 'gone') continue;                                      // loaded and not yet unloaded: wait for systemd
        r.unit = null;
      }
      const step = r.steps[r.stepIndex];
      if (!step || step.kind !== 'shell' || step.phase === 'prepare') {
        r.restarts.push({ at: this.sys.now(), how: 'resumed', why: `the runner restarted at ${step?.name ?? 'the end'}` });
      } else if (job.resumable || step.phase === 'pilot') {
        // No exit code: maybe memory; the step runs again with one worker fewer.
        if (step.phase === 'commands') { r.cap = retryCap(r.backoff?.workers ?? r.workers); r.sizing = null; }
        r.restarts.push({ at: this.sys.now(), how: 'resumed', why: `the runner restarted during ${step.name}; it runs again${job.resumable ? ' and skips what is done' : ' (a pilot is short)'}${step.phase === 'commands' ? `, at most ${r.cap} worker(s)` : ''}` });
      } else {
        // A non-resumable job's commands block died with the runner: it starts again at that block (D365),
        // after prepare, its pilot passed; what that block (and those after it) make is moved aside.
        const resume = this.resumeBlock(job, this.doneBlocks(r));
        const moved = this.cleanAside(r, job, resume.from);
        r.cap = retryCap(r.backoff?.workers ?? r.workers);
        r.steps = this.stepsFor(job, true, resume.from);
        r.blocksDone = resume.kept;
        r.stepIndex = 0;
        r.sizing = null;
        r.restarts.push({ at: this.sys.now(), how: 'restarted', why: `the runner restarted during ${step.name}; the job is not resumable, so it ${resume.from ? resume.why.replace(/^resumes (at|after)/, 'starts again $1') : 'starts again from the top'}${moved.length ? ` (moved aside: ${moved.join(', ')})` : ''}` });
      }
      this.setStatus(r, 'running', { phase: this.phaseOf(r) });
      this.save(r);
    }
    // A running STATUS of ours the runner has no record of: its state is gone; start it again.
    for (const [id, st] of this.origin) {
      if (st.state === 'running' && isOurs(st) && !this.runs.get(id)?.outcome && !this.runs.has(id)) {
        const job = this.jobs.find((j) => j.id === id);
        if (!job || job.errors.length) continue;
        const r = this.begin(job, null);
        r.restarts.push({ at: this.sys.now(), how: 'restarted', why: 'STATUS said running but the runner had no record of it' });
        this.setStatus(r, 'running', { phase: this.phaseOf(r) });
      }
    }
  }

  /**
   * The clean: paths a restart at `fromBlock` (0-based) moves aside: from run1, the header's and every
   * block's; from a later block, that block's and the ones after it (D365).
   */
  cleanPaths(job: JobFile, fromBlock = 0): string[] {
    const blocks = (job.commands?.blockClean ?? []).filter((_, i) => i >= fromBlock).flat();
    return [...new Set([...(fromBlock === 0 ? job.clean : []), ...blocks])];
  }

  /**
   * `clean:` paths moved to `.restart-<time>-<name>` beside them, NEVER deleted (D365; the job README's
   * promise); only under the job's checkout's var/.  Their disk use is in STATUS (`set_aside:`).
   */
  cleanAside(r: JobRun, job: JobFile, fromBlock = 0): string[] {
    const cwd = this.cwdOf(r, job);
    const moved: string[] = [];
    const stamp = isoLocal(this.sys.now()).replace(/[:]/g, '').slice(0, 17);
    for (const c of this.cleanPaths(job, fromBlock)) {
      for (const p of expandGlob(cwd, c)) {
        const rel = path.relative(cwd, p);
        if (!rel.startsWith('var/') || rel.includes('..')) continue;
        // A dot name: the job's own globs (night-*) never match it again.
        let dest = path.join(path.dirname(p), `.restart-${stamp}-${path.basename(p)}`);
        for (let k = 2; fs.existsSync(dest); k++) dest = path.join(path.dirname(p), `.restart-${stamp}.${k}-${path.basename(p)}`);
        fs.renameSync(p, dest);
        moved.push(rel);
      }
    }
    if (this.cleanPaths(job, 0).length) r.aside = this.asideUsage(r, job);
    return moved;
  }

  /** Every `.restart-*` copy beside any of the job's clean: paths (the header's and every block's), and their bytes. */
  asideUsage(r: JobRun, job: JobFile): { copies: number; bytes: number } {
    const cwd = this.cwdOf(r, job);
    let copies = 0, bytes = 0;
    const seen = new Set<string>();
    for (const c of this.cleanPaths(job, 0)) {
      const base = path.basename(c);
      const re = new RegExp(`^\\.restart-[0-9T-]+(?:\\.\\d+)?-${base.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]')}$`);
      const dirs = path.dirname(c) === '.' ? [cwd] : expandGlob(cwd, path.dirname(c));
      for (const d of dirs) {
        let ents: string[] = [];
        try { ents = fs.readdirSync(d); } catch { continue; }
        for (const e of ents) {
          const p = path.join(d, e);
          if (!re.test(e) || seen.has(p)) continue;
          seen.add(p);
          copies++;
          bytes += diskBytes(p);
        }
      }
    }
    return { copies, bytes };
  }

  /**
   * At daemon start, under its lock: a git *.lock left in the runner's own repositories (the pc-results
   * worktree's git dir, lab-status) by a runner killed mid-commit.  Never in the job clones, where a
   * prepare may be running.
   */
  clearStaleGitLocks(): string[] {
    const out: string[] = [];
    const sweep = (dir: string, deep: boolean): void => {
      let ents: fs.Dirent[] = [];
      try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of ents) {
        const p = path.join(dir, e.name);
        if (e.isFile() && e.name.endsWith('.lock')) { fs.rmSync(p, { force: true }); out.push(p); }
        else if (deep && e.isDirectory() && e.name !== 'objects') sweep(p, true);
      }
    };
    const wt = this.resultsDir();
    const gd = fs.existsSync(path.join(wt, '.git')) ? this.git(wt, 'rev-parse', '--absolute-git-dir').stdout.trim() : '';
    if (gd && gd.includes(`${path.sep}worktrees${path.sep}`)) sweep(gd, false);
    sweep(path.join(this.publicDir(), '.git'), true);
    for (const f of out) this.sys.log(`removed a stale git lock: ${f}`);
    return out;
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
        ...this.publicOf(r.id),
        id: r.id, title: r.title, cpu: r.cpu, phase: this.phaseOf(r), started: isoLocal(r.startedAt), elapsed: Math.round((now - r.startedAt) / 1000),
        done: r.progress.at(-1)?.done ?? null, total: r.total, unit: r.progressUnit, ratePerHour, eta: eta ? isoLocal(eta) : null,
        workers: r.backoff?.workers ?? r.workers, workersMax: r.sizing?.workers ?? r.workers, cores: this.holding(r).cores, errors: errors ?? null,
        paused: this.isPaused() || r.playingHeld || !!r.backoff?.paused,
        dataUpdated: r.dataUpdated ? isoLocal(r.dataUpdated) : null,
        memGb: typeof r.memGb === 'number' ? Math.round(r.memGb * 100) / 100 : null,
        ...this.liveFor(r, this.jobs.find((j) => j.id === r.id) ?? this.retained.get(r.id), now),
        publicCubes: (this.jobs.find((j) => j.id === r.id) ?? this.retained.get(r.id))?.publicCubes === true,
        pressureEvents: r.events.slice(-20).map(({ at, kind, workers, pressure }) => ({ at, kind, workers, pressure })),
        detail: r.unit ?? undefined,
      };
    });
    // A job someone else runs (the PC session's own unit): shown, with what its STATUS says.
    for (const [id, st] of this.statuses()) {
      if (st.state !== 'running' || this.runs.get(id) && !this.runs.get(id)?.outcome) continue;
      const job = this.jobs.find((j) => j.id === id);
      const started = Date.parse(st.fields.started ?? '');
      running.push({ ...this.publicOf(id), id, title: job?.title ?? id, cpu: job?.cpu ?? 'heavy', phase: 'commands', started: Number.isFinite(started) ? isoLocal(started) : null, elapsed: Number.isFinite(started) ? Math.round((now - started) / 1000) : 0,
        done: null, total: null, unit: null, ratePerHour: null, eta: null, workers: null, workersMax: null, cores: null, errors: null, paused: false, dataUpdated: null, pressureEvents: [], detail: 'not run by the runner' });
    }
    const queueCodes = new Set(['after', 'heavy-busy', 'light-busy', 'cores', 'queued']);
    if (running.length) this.p.idleSince = null;
    else this.p.idleSince ??= now;
    const finished: FinishedItem[] = [];
    for (const [id, st] of this.statuses()) {
      if (st.state !== 'done' && st.state !== 'failed' && st.state !== 'skipped') continue;
      const at = Date.parse(st.fields.finished ?? st.fields.started ?? '');
      const numbers = this.runs.get(id)?.numbers ?? {};
      finished.push({ ...this.publicOf(id), id, title: this.jobs.find((j) => j.id === id)?.title ?? id, status: st.state, finished: Number.isFinite(at) ? isoLocal(at) : null, headline: headlineOf(numbers), numbers, detail: st.fields.reason });
    }
    // Newest first, by the instant (offsets differ between STATUS files), undated last.
    const t = (x: FinishedItem): number => (x.finished ? Date.parse(x.finished) : -Infinity);
    finished.sort((a, b) => t(b) - t(a));
    return fit({
      schema: 1,
      updated: isoLocal(now),
      heartbeat: isoLocal(now),
      paused: this.isPaused(),
      state: running.length ? 'running' : 'idle',
      idleSince: running.length || this.p.idleSince == null ? null : isoLocal(this.p.idleSince),
      idleReason: running.length ? null : idleReasonOf(this.blocked, this.isPaused()),
      host: {
        load1: Math.round(h.load1 * 100) / 100, memUsedGb: Math.round(h.memUsedGb * 10) / 10, memTotalGb: Math.round(h.memTotalGb * 10) / 10,
        swapUsedMb: Math.round(h.swapUsedMb), pressure: Math.round(h.some10 * 100) / 100, cpus: m.threads, budgetGb: b.labGb,
        // Cores in use: the widths of the jobs this runner runs (a light job's too), out of the core budget.
        coresUsed: running.reduce((a, x) => a + (x.cores ?? 0), 0), coresTotal: this.machineBudget().cores,
      },
      running,
      queue: this.blocked.filter((x) => queueCodes.has(x.code)).map((x) => ({ ...this.publicOf(x.id), id: x.id, title: x.title, cpu: x.cpu, est: x.est })),
      waiting: this.blocked.filter((x) => !queueCodes.has(x.code)).map((x) => ({ ...this.publicOf(x.id), id: x.id, title: x.title, reason: REASONS[x.code] ?? 'waiting', est: x.est, detail: x.reason })),
      finished,
      runner: { commit: this.cfg.commit, started: isoLocal(this.p.started), dryRun: false },
    });
  }

  /** The job file's opted-in public title and estimate (`public_title:`, `public_est:`), for `sanitise`. */
  publicOf(id: string): { publicTitle: string | null; publicEst: string | null } {
    const j = this.jobs.find((x) => x.id === id) ?? this.retained.get(id);
    return { publicTitle: j?.publicTitle ?? null, publicEst: j?.publicEst ?? null };
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
    const run = doc.running.map((r) => `${r.id} ${r.phase}${r.done !== null ? `, ${r.done}${r.total ? `/${r.total}` : ''} ${r.unit ?? ''}` : ''}${r.ratePerHour ? `, ${r.ratePerHour}/h` : ''}${r.eta ? `, ETA ${r.eta}` : ''}${r.workers ? `, ${r.workers} worker(s)` : ''}${r.cores ? `, ${r.cores} core(s)` : ''}${r.paused ? ', PAUSED' : ''}${r.detail === 'not run by the runner' ? ' (not run by the runner)' : ''}`);
    const last = doc.finished[0];
    return `# Heartbeat

Written by the lab runner (tools/runner, D337) every few minutes and on every job state change.

- time: ${doc.updated}
- runner: ${this.cfg.commit}, up since ${isoLocal(this.p.started)}${doc.paused ? ', PAUSED (tools/runner.sh resume)' : ''}
- running: ${run.length ? run.join('; ') : 'nothing'}
- cores: ${doc.host.coresUsed ?? '?'} of ${doc.host.coresTotal ?? '?'} in use (the running jobs' widths; ${doc.host.cpus} threads)
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
    if (!this.cfg.publicStatus) this.p.ladderSig = this.ladderSig();
    if (ok) {
      this.p.dirty = false;
      this.p.lastPublish = this.sys.now();
      this.p.publishFailures = 0;
      this.p.nextPublishAt = 0;
    } else {
      // Exponential backoff: 30 s, 1, 2, 4 … 30 minutes; never a push every tick while the network is down.
      this.p.publishFailures = (this.p.publishFailures ?? 0) + 1;
      this.p.nextPublishAt = retryAt(this.sys.now(), this.p.publishFailures);
      this.sys.log(`publish failed ${this.p.publishFailures} time(s) in a row; next try at ${isoLocal(this.p.nextPublishAt)}`);
    }
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
      const fetched = this.git(wt, 'fetch', '--quiet', 'origin', '+refs/heads/pc-results:refs/remotes/origin/pc-results');
      if (fetched.code !== 0) { this.sys.log(`publish: fetch failed: ${fetched.stderr.trim().split('\n').at(-1)}`); return false; }
      if (this.git(wt, 'reset', '--quiet', '--hard', 'origin/pc-results').code !== 0) { this.sys.log('publish: reset failed'); return false; }
      const changed: string[] = [];
      for (const r of this.runs.values()) {
        if (r.published) continue;
        const d = path.join(wt, 'results', r.id);
        fs.mkdirSync(d, { recursive: true });
        const out = path.join(this.jobDir(r.id), 'out');
        for (const f of fs.existsSync(out) ? fs.readdirSync(out) : []) {
          if (f === 'STATUS' || f === 'summary.md') continue;          // the runner's STATUS, and the PC session's summary, are never overwritten by an output
          const src = path.join(out, f);
          if (fs.statSync(src).isFile() && fs.statSync(src).size <= 5 * MB) fs.copyFileSync(src, path.join(d, f));
        }
        // STATUS last: nothing copied above can stand in for it.
        if (r.pendingStatus) fs.writeFileSync(path.join(d, 'STATUS'), r.pendingStatus);
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

  /**
   * The public copy runs on its own clock (the page's freshness), running or idle alike: at
   * once on a state change; when what it says changed, at most every publicEveryMs (60 s);
   * unchanged, every publicHeartbeatMs (2 min), so it is never more than about 2 min old.
   * A failed push backs off as pc-results does.
   */
  maybePublishPublic(doc: StatusDoc, stateChanged: boolean): void {
    const now = this.sys.now();
    if (now < (this.p.nextPublicAt ?? 0)) return;
    const sig = publicSignature(doc, this.ladderSig());
    const since = now - (this.p.lastPublic ?? 0);
    const changed = sig !== this.p.publicSig;
    const due = since >= this.cfg.publicHeartbeatMs || (changed && (stateChanged || since >= this.cfg.publicEveryMs));
    if (!due) return;
    if (!this.cfg.push) { this.p.lastPublic = now; this.p.publicSig = sig; this.p.ladderSig = this.ladderSig(); return; }
    if (this.publishPublic(doc)) {
      this.p.lastPublic = now;
      this.p.publicSig = sig;
      this.p.publicFailures = 0;
      this.p.nextPublicAt = 0;
    } else {
      this.p.publicFailures = (this.p.publicFailures ?? 0) + 1;
      this.p.nextPublicAt = retryAt(now, this.p.publicFailures);
      this.sys.log(`public status: failed ${this.p.publicFailures} time(s) in a row; next try at ${isoLocal(this.p.nextPublicAt)}`);
    }
  }

  /** The numbers-only copy: one commit on the orphan branch lab-status of ForgeCoach, replaced on every push.  True when pushed. */
  publishPublic(doc: StatusDoc): boolean {
    const dir = this.publicDir();
    try {
      if (!fs.existsSync(path.join(dir, '.git'))) {
        const home = this.cfg.homeRepos.ForgeCoach;
        const url = this.cfg.urls.ForgeCoach ?? (home ? this.sys.run(['git', '-C', home, 'remote', 'get-url', 'origin']).stdout.trim() : '');
        if (!url) { this.sys.log('public status: no ForgeCoach URL'); return false; }
        fs.mkdirSync(dir, { recursive: true });
        this.sys.run(['git', 'init', '--quiet', dir]);
        this.git(dir, 'remote', 'add', 'origin', url);
        this.git(dir, 'checkout', '--quiet', '--orphan', 'lab-status');
      }
      fs.writeFileSync(path.join(dir, 'status.json'), `${JSON.stringify(doc)}\n`);
      const ladder = this.publicLadder();
      if (ladder) fs.writeFileSync(path.join(dir, 'ladder.json'), ladder);
      const warehouse = this.publicWarehouse();
      if (warehouse) fs.writeFileSync(path.join(dir, 'warehouse.json'), warehouse);
      this.git(dir, 'add', 'status.json', ...['ladder.json', 'warehouse.json'].filter((f) => fs.existsSync(path.join(dir, f))));
      const id = ['-c', 'user.name=forgecoach-runner', '-c', 'user.email=runner@localhost'];
      // One commit, replaced each time: the branch is a value, not a history.
      const parentless = this.git(dir, ...id, 'commit-tree', this.git(dir, 'write-tree').stdout.trim(), '-m', `lab status ${doc.updated}`).stdout.trim();
      if (!parentless) return false;
      this.git(dir, 'reset', '--quiet', '--soft', parentless);
      const p = this.git(dir, 'push', '--quiet', '--force', 'origin', 'HEAD:refs/heads/lab-status');
      if (p.code !== 0) { this.sys.log(`public status: push failed: ${p.stderr.trim().split('\n').at(-1)}`); return false; }
      this.p.ladderSig = this.ladderSig();
      return true;
    } catch (e) {
      this.sys.log(`public status: ${(e as Error).message}`);
      return false;
    }
  }

  ladderPath(): string {
    return this.cfg.ladderFile ?? path.join(this.checkout('mtg-table', 'heavy'), 'var', 'ai-ladder', 'ladder.json');
  }

  warehousePath(): string {
    return this.cfg.warehouseFile ?? path.join(this.checkout('mtg-table', 'heavy'), 'var', 'warehouse', 'warehouse.json');
  }

  /** Size and mtime of the ladder's ladder.json and the warehouse's warehouse.json: a change to either publishes. */
  ladderSig(): string {
    const sig = (f: string): string => { try { const st = fs.statSync(f); return `${st.size}:${st.mtimeMs}`; } catch { return ''; } };
    const w = sig(this.warehousePath());
    return w ? `${sig(this.ladderPath())}|${w}` : sig(this.ladderPath());
  }

  /** The sanitised warehouse.json text (warehouse.ts's allowlist, D363), or null when there is none or it is not schema 1. */
  publicWarehouse(): string | null {
    try {
      const doc = sanitiseWarehouse(JSON.parse(fs.readFileSync(this.warehousePath(), 'utf8')));
      return doc ? `${JSON.stringify(doc)}\n` : null;
    } catch { return null; }
  }

  /** The sanitised ladder.json text (ladder.ts's allowlist), or null when there is none or it is not schema 1. */
  publicLadder(): string | null {
    try {
      const doc = sanitiseLadder(JSON.parse(fs.readFileSync(this.ladderPath(), 'utf8')));
      return doc ? `${JSON.stringify(doc)}\n` : null;
    } catch { return null; }
  }

  /**
   * `tools/runner.sh approve J###`: a job waiting after its pilot (needs: check) may run its commands.
   * In a temporary worktree of its own (never the daemon's pc-results worktree), every git step
   * checked; a refused push is fetched, re-applied and retried.  Throws unless it was pushed.
   */
  approve(id: string, by: string, note = ''): void {
    if (!/^J\d+$/.test(id)) throw new Error('approve J###');
    const repo = this.queueRepo();
    this.ensureClone('mtg-table', repo);
    const tmp = path.join(this.cfg.stateDir, `approve-${id}-${process.pid}`);
    const must = (what: string, r: { code: number; stderr: string }): void => {
      if (r.code !== 0) throw new Error(`approve ${id}: ${what} failed: ${r.stderr.trim().split('\n').at(-1) ?? ''}`);
    };
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        must('git fetch', this.git(repo, 'fetch', '--quiet', 'origin', '+refs/heads/pc-results:refs/remotes/origin/pc-results'));
        fs.rmSync(tmp, { recursive: true, force: true });
        this.git(repo, 'worktree', 'prune');
        must('git worktree add', this.git(repo, 'worktree', 'add', '--quiet', '--detach', tmp, 'origin/pc-results'));
        const file = path.join(tmp, 'results', id, 'STATUS');
        const st = fs.existsSync(file) ? parseStatus(fs.readFileSync(file, 'utf8')) : null;
        if (!st || st.state !== 'waiting') throw new Error(`${id}'s STATUS is ${st?.state ?? 'missing'}; approve is for a job waiting after its pilot`);
        delete st.fields.needs;
        st.fields.approved = `${isoLocal(this.sys.now())} by ${by}${note ? `: ${note}` : ''}`;
        st.fields.reason = 'pilot approved; the runner runs the commands';
        fs.writeFileSync(file, formatStatus(st));
        must('git add', this.git(tmp, 'add', path.join('results', id, 'STATUS')));
        must('git commit', this.git(tmp, '-c', 'user.name=forgecoach-runner', '-c', 'user.email=runner@localhost', 'commit', '--quiet', '-m', `${id}: approved after its pilot`));
        if (!this.cfg.push) return;
        const p = this.git(tmp, 'push', '--quiet', 'origin', 'HEAD:refs/heads/pc-results');
        if (p.code === 0) { this.p.lastFetch = 0; return; }
        this.sys.log(`approve ${id}: push refused (attempt ${attempt + 1}); fetching and trying again`);
        this.git(repo, 'worktree', 'remove', '--force', tmp);
      }
      throw new Error(`approve ${id}: the push was refused three times`);
    } finally {
      this.git(repo, 'worktree', 'remove', '--force', tmp);
      fs.rmSync(tmp, { recursive: true, force: true });
      this.git(repo, 'worktree', 'prune');
    }
  }

  // ------------------------------------------------------------------ outputs

  writeOut(r: JobRun, name: string, text: string, append = false): void {
    const d = path.join(this.jobDir(r.id), 'out');
    fs.mkdirSync(d, { recursive: true });
    if (append) fs.appendFileSync(path.join(d, name), text); else fs.writeFileSync(path.join(d, name), text);
    r.published = false;
  }

  /** The last n lines of a file, read from its last 4 MB at most (a step log can be large). */
  tail(file: string, n: number): string {
    try {
      const fd = fs.openSync(file, 'r');
      try {
        const size = fs.fstatSync(fd).size;
        const len = Math.min(size, 4 << 20);
        const buf = Buffer.alloc(len);
        fs.readSync(fd, buf, 0, len, size - len);
        return buf.toString('utf8').split('\n').slice(-n - 1).join('\n');
      } finally { fs.closeSync(fd); }
    } catch { return ''; }
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

/**
 * A step's wrapper: runs the script, then -- still inside the unit's cgroup, before the exit code that says the
 * step ended -- copies the unit's memory.events `oom_kill` line beside it (D365: a step whose java was killed by
 * the OOM killer exits 137 and is a memory stop, not a failure), then writes the exit code.  A read that fails
 * writes nothing; the exit code is written whatever happens.
 */
export function wrapScript(script: string, rc: string, oom: string): string {
  return `#!/usr/bin/env bash
bash ${q(script)}
rc=$?
cg=$(sed -n 's/^0:://p' /proc/self/cgroup 2>/dev/null)
if [ -n "$cg" ] && [ -r "/sys/fs/cgroup$cg/memory.events" ]; then grep '^oom_kill ' "/sys/fs/cgroup$cg/memory.events" > ${q(`${oom}.part`)} 2>/dev/null && mv ${q(`${oom}.part`)} ${q(oom)} || rm -f ${q(`${oom}.part`)}; fi
printf '%s\\n' "$rc" > ${q(`${rc}.part`)} && mv ${q(`${rc}.part`)} ${q(rc)}
exit "$rc"
`;
}

/** Bytes under a path (files' sizes, symlinks not followed); 0 when it is gone. */
export function diskBytes(p: string): number {
  let st: fs.Stats;
  try { st = fs.lstatSync(p); } catch { return 0; }
  if (!st.isDirectory()) return st.isFile() ? st.size : 0;
  let n = 0;
  let ents: string[] = [];
  try { ents = fs.readdirSync(p); } catch { return 0; }
  for (const e of ents) n += diskBytes(path.join(p, e));
  return n;
}

/** The thread-pool variables the runner sets in every step's unit to the step's width. */
export const THREAD_CAP_VARS = ['OMP_NUM_THREADS', 'OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS', 'NUMEXPR_NUM_THREADS', 'VECLIB_MAXIMUM_THREADS'] as const;

/** Each of THREAD_CAP_VARS set to a step's width (at least 1). */
export function threadCaps(width: number): Record<string, string> {
  const n = String(Math.max(1, Math.floor(width) || 1));
  return Object.fromEntries(THREAD_CAP_VARS.map((k) => [k, n]));
}

export function verdictText(vs: Verdict[]): string {
  if (!vs.length) return 'no check: lines\n';
  return vs.map((v) => `${v.result === true ? 'PASS' : v.result === false ? 'FAIL' : 'UNKNOWN'}  ${v.expr}${v.values ? `   [${v.values}]` : ''}${v.error ? `   (${v.error})` : ''}`).join('\n') + '\n';
}
