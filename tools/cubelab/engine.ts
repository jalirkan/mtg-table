// mtg-table — the cube lab: the engine processes (CubeLab.java), from Node.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// tools/cubelab.sh compiles CubeLab.java into var/cubelab/classes, builds one
// Forge home per worker with tools/config.sh's forge_home_make (D129's helper:
// res/ beside the jar, a userDir of its own, D14's overlay) and hands this
// process the classpath (CUBELAB_CP) and the homes' config files
// (CUBELAB_HOMES, comma-separated).  Every JVM runs under hard rule 6's flags.
//
// A WORKER is one `CubeLab play` JVM: a match per stdin line, a `CUBELAB {json}`
// line back per match on stdout, Forge's chatter on stderr (appended to
// <out>/logs/worker-<k>.log).  The pool hands each idle worker the next match.
// Its watchdog: the Java side ends a game that runs past --game-timeout as a
// draw and exits 3 if the game thread will not come back; this side kills a
// worker whose match is past its deadline (the job's `deadlineSec`, else
// games x (timeout + 40 s) + 120 s), or that died, records that match as an
// engine error with whatever games it finished, and starts a fresh worker for
// the rest.  The deadline is measured on a MONOTONIC clock (D459,
// `monotonicMs`): `Date.now()` is the wall clock, and on 2026-10-20 and 10-21 it
// jumped 4 h forward minutes after boot (Windows keeps local time in the RTC;
// NTP corrects it later), which "hung" every running worker at once.  A worker that dies before it is ready
// twice in a row stops the run: the engine cannot boot, and retrying is noise.
//
// The lab runner's control file (tools/runner/control.ts, D337): with
// LAB_CONTROL set, an idle worker gets no match while `paused`, and a worker
// whose match ended while more than `maxWorkers` JVMs are alive quits (its
// memory comes back); a parked worker starts again when the cap rises.
// Without LAB_CONTROL nothing here changes.
//
// D465: a worker may stream a match's progress before its answer (`CUBELAB {"type":"progress","id",...}`,
// the atlas's finished branches), which `hooks.onProgress` receives; and it may RETIRE: a match line
// carrying `retire` (its heap is exhausted) is the worker's last, it exits by itself, and the pool starts a
// fresh one for the rest -- neither a boot failure nor a death.  `onResult` may return follow-up jobs (the
// atlas's resume of an unfinished unit), queued first, before the pool counts the job done.

import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import readline from 'node:readline';

import type { Fact } from './cards.ts';
import { controlReader } from '../runner/control.ts';
import type { PlayExploreGame, PlayExploreTag } from './playexplore.ts';

/** `xmx`: the worker JVM's -Xmx when a command chose one (the atlas, below); absent, workerXmx() decides. */
export interface EngineEnv { cp: string; homes: string[]; repo: string; xmx?: string }

/** Every worker's -Xmx unless CUBELAB_WORKER_XMX or a command says otherwise: hard rule 6's value, unchanged. */
export const WORKER_XMX_DEFAULT = '4096m';

/**
 * The worker JVM's -Xmx: CUBELAB_WORKER_XMX when it is set (always wins), else the command's own
 * default, else 4096m.  A long-lived worker fills its heap to this cap -- the atlas's phase B workers
 * measured 3.9-4.1 GB RSS each under 4096m -- so the lab runner's mem_per_worker_gb is declared from
 * the cap, never from a short game's measurement.  A value Java would not take (`2560m`, `3g`) throws.
 */
export function workerXmx(commandDefault?: string): string {
  const v = (process.env.CUBELAB_WORKER_XMX ?? '').trim() || commandDefault || WORKER_XMX_DEFAULT;
  if (!/^[1-9][0-9]*[mMgG]$/.test(v)) throw new Error(`CUBELAB_WORKER_XMX: '${v}' is not a heap size like 2560m or 3g`);
  return v;
}

/** `xmxDefault`: this command's worker heap when CUBELAB_WORKER_XMX is not set (the atlas's; D451). */
export function engineEnv(repo: string, xmxDefault?: string): EngineEnv {
  const cp = process.env.CUBELAB_CP;
  const homes = (process.env.CUBELAB_HOMES ?? '').split(',').filter(Boolean);
  if (!cp || homes.length === 0) {
    throw new Error('CUBELAB_CP / CUBELAB_HOMES are not set -- run the lab through tools/cubelab.sh, which builds them');
  }
  return { cp, homes, repo, xmx: workerXmx(xmxDefault) };
}

/**
 * Hard rule 6's JVM (its -Xmx from env.xmx or workerXmx()), plus the Forge home's config, plus one
 * diagnostic flag (D497): -XX:-OmitStackTraceInFastThrow, so a crash a worker meets thousands of
 * times keeps its message and stack in the worker log -- HotSpot's default replaces an implicit
 * exception thrown hot at one site with a preallocated one that has neither (J180's s11: 13 of 77
 * NullPointerExceptions named their site, 64 were bare).  It changes no result.
 */
export function javaArgs(env: EngineEnv, home: string, main: string[]): string[] {
  return ['-u', 'DISPLAY', 'java', `-Xmx${env.xmx ?? workerXmx()}`, '-Djava.awt.headless=true',
    '-Dio.netty.tryReflectionSetAccessible=true', '-Dfile.encoding=UTF-8',
    '-Dsentry.uncaught.handler.enabled=false', '-XX:-OmitStackTraceInFastThrow', `-Dmtgtable.config=${home}`,
    '-cp', env.cp, 'mtgtable.cubelab.CubeLab', ...main];
}

/** The engine's facts for these names, cached under var/cubelab/facts/ by jar, classes and names. */
export function engineFacts(env: EngineEnv, names: string[], log: (s: string) => void): Fact[] {
  const jar = process.env.FORGE_JAR ?? '';
  const helper = path.join(env.repo, 'var/cubelab/classes/mtgtable/cubelab/CubeLab.class');
  const stamp = fs.existsSync(helper) ? String(fs.statSync(helper).mtimeMs) : '';
  const key = createHash('sha1').update([jar, stamp, ...names].join('\n')).digest('hex').slice(0, 16);
  const dir = path.join(env.repo, 'var/cubelab/facts');
  let file = path.join(dir, `${key}.json`);
  // A cached lookup made for a superset of these names (the queue warms all cubes' union once) answers too.
  if (!fs.existsSync(file)) file = coveringFacts(dir, jar, stamp, names) ?? file;
  if (!fs.existsSync(file)) {
    fs.mkdirSync(dir, { recursive: true });
    const namesFile = path.join(dir, `${key}.${process.pid}.names.txt`);
    fs.writeFileSync(namesFile, `${names.join('\n')}\n`);
    log(`facts: booting the engine to look up ${names.length} cards ...`);
    const t0 = Date.now();
    const home = env.homes[0] as string;
    const part = `${file}.${process.pid}.part`;      // two runs at once never share a partial file
    const r = spawnSync('env', javaArgs(env, home, ['facts', '--names', namesFile, '--out', part]),
      { cwd: env.repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 600_000 });
    if (r.status !== 0 || !fs.existsSync(part)) {
      throw new Error(`the facts JVM failed (exit ${r.status}${r.signal ? `, ${r.signal}` : ''}):\n${(r.stderr ?? '').split('\n').slice(-25).join('\n')}`);
    }
    fs.renameSync(part, file);
    fs.writeFileSync(file.replace(/\.json$/, '.key'), `${jar}\n${stamp}\n`);
    log(`facts: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  const doc = JSON.parse(fs.readFileSync(file, 'utf8')) as { cards: Fact[] };
  for (const f of doc.cards) if (f.oracle) f.oracle = f.oracle.replace(/\\n/g, '\n');
  // Exactly the names asked for, in their order (a covering file holds more).
  const byListed = new Map(doc.cards.map((f) => [f.listed, f]));
  return names.map((n) => byListed.get(n)).filter((f): f is Fact => !!f);
}

/** A cached facts file for the same jar and helper that lists every one of `names`, if there is one. */
function coveringFacts(dir: string, jar: string, stamp: string, names: string[]): string | null {
  if (!fs.existsSync(dir)) return null;
  for (const f of fs.readdirSync(dir).filter((x) => /^[0-9a-f]{16}\.json$/.test(x))) {
    const stampFile = path.join(dir, f.replace(/\.json$/, '.key'));
    if (!fs.existsSync(stampFile) || fs.readFileSync(stampFile, 'utf8') !== `${jar}\n${stamp}\n`) continue;
    try {
      const listed = new Set((JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as { cards: Fact[] }).cards.map((c) => c.listed));
      if (names.every((n) => listed.has(n))) return path.join(dir, f);
    } catch { /* a file being written: skip it */ }
  }
  return null;
}

export interface MatchJob {
  id: string;
  seed: number;
  games: number;
  gameTimeoutSec: number;
  profileA: string;
  profileB: string;
  builder: 'lab' | 'forge';
  deckA: string | null;
  deckB: string | null;
  poolA: string[];
  poolB: string[];
  forgeDeckOutA: string;
  forgeDeckOutB: string;
  /** D315: record every game of this match, both chairs, in the worker (`run --record-all|--record-every N`). */
  record?: RecordSpec;
  /** D358: both seats of every game explore (playexplore.ts; CubeLab.java seeds each seat's draws). */
  playExplore?: PlayExploreTag;
  /**
   * D459: how long the pool waits for this match's answer before it kills the worker as hung,
   * in seconds of monotonic time.  Absent: games x (gameTimeoutSec + 40) + 120 (`matchDeadlineMs`).
   * The atlas sets it from `--unit-timeout <minutes>`; the Java side never reads it.
   */
  deadlineSec?: number;
}

/**
 * D459: the clock every duration that DECIDES something in the pool is read from -- milliseconds
 * since an arbitrary origin that only moves forward, at the rate of real time, whatever the wall
 * clock does.  `Date.now()` stays for timestamps and for durations that are only reported.
 */
export const monotonicMs = (): number => performance.now();

/** D459: the pool's watchdog deadline for a match, in milliseconds of `monotonicMs`. */
export function matchDeadlineMs(j: Pick<MatchJob, 'games' | 'gameTimeoutSec' | 'deadlineSec'>): number {
  if (j.deadlineSec !== undefined) return j.deadlineSec * 1000;
  return (j.games * (j.gameTimeoutSec + 40) + 120) * 1000;
}

/** Where and how a match's games are recorded (D315); CubeLab.java's `Recording` reads it. */
export interface RecordSpec {
  /** The draft's folder, absolute: `<out>/games/<seed>`. */
  dir: string;
  /** The same folder relative to the run. */
  rel: string;
  run: string;
  cube: string;
  /** The cube's markdown as copied into the run (`cube.md`), relative to the repo. */
  cubeFile: string;
  cubeSha: string;
  format: string;
  deckNameA: string;
  deckNameB: string;
  /** D341: the lab version that plays it, into every recording's header. */
  ver?: string;
}

export interface GameRow {
  n: number;
  onPlay: 'A' | 'B';
  onPlayVerified: string | null;
  winner: 'A' | 'B' | 'draw';
  turns: number;
  ms: number;
  timeout: boolean;
  reason: string | null;
  error: string | null;
  /** The worker JVM's CPU time over the game, all threads, and the game thread's own (D315; absent before it). */
  cpuMs?: number;
  gameCpuMs?: number;
  /** D315: the game's two frame logs (`<dir>/g<n>-seat{0,1}.jsonl.gz`), their bytes on disk, state frames, snapshot errors. */
  recorded?: { dir: string; bytes: number; frames: number; errors: number; decisions?: number; decisionErrors?: number };
  /** D358: what play exploration did in this game, both seats (an exploring draft only). */
  playExplore?: PlayExploreGame;
}

export interface ForgeBuild { side: 'A' | 'B'; colors?: string; spells?: number; lands?: number; value?: number; main?: Array<[number, string]>; error?: string }

export interface MatchResult {
  type: 'match';
  id: string;
  forge: ForgeBuild[];
  games: GameRow[];
  winsA?: number;
  winsB?: number;
  stuck?: boolean;
  /** Set on this side: the worker died or hung. */
  engineError?: string;
  /** D465: the worker retires after this answer (why: its heap is exhausted); the pool starts a fresh one. */
  retire?: string;
}

/** D465: a line a worker streams while a match plays (the atlas's finished branches). */
export interface ProgressMsg { type: 'progress'; id: string; [k: string]: unknown }

/** D465: what else the pool reports: a match's streamed progress, as it arrives. */
export interface PoolHooks {
  onProgress?: (job: MatchJob, msg: ProgressMsg, worker: number) => void;
  /**
   * D480: keep an idle worker alive while the queue is empty but matches are still out, because an answer may queue more
   * work (the atlas's checkpoint barriers: a decision's next units wait for all of its current ones).  Without it an idle
   * worker with nothing queued quits at once, as it always has; with it, the queued follow-ups wake every idle worker, and a
   * slot whose worker died while nothing was queued waits parked and starts again when work arrives.
   */
  holdIdle?: boolean;
}

interface Slot {
  k: number;
  proc: ChildProcessWithoutNullStreams | null;
  ready: boolean;
  job: MatchJob | null;
  /** When `job` was handed over, in `monotonicMs` (D459) -- never the wall clock. */
  startedAt: number;
  last: MatchResult | null;
  bootFailures: number;
  /** Let go by the control file's maxWorkers; started again when the cap allows. */
  parked: boolean;
  /** D465: it answered with `retire` and is exiting by itself; a fresh worker takes its place. */
  retiring: boolean;
}

/**
 * D376: the pool's load when a match finished: matches in progress at that moment (this one
 * included), worker JVMs alive, and the machine's 1-minute load average over its cores.
 * Forge's AI is wall-clock dependent (D311), so a game's outcome may depend on these.
 */
export interface PoolLoad { busy: number; alive: number; load1: number; cpus: number }

/**
 * Run every job on `env.homes.length` workers.  `onResult` gets each match as
 * it finishes (never in a promised order), with the pool's load then (D376).
 * Resolves when every job has a result.
 */
export async function runPool(env: EngineEnv, jobs: MatchJob[], logDir: string,
  onResult: (job: MatchJob, r: MatchResult, worker: number, load: PoolLoad) => MatchJob[] | void, say: (s: string) => void,
  hooks: PoolHooks = {}): Promise<void> {
  fs.mkdirSync(logDir, { recursive: true });
  const queue = [...jobs];
  let pending = jobs.length;
  if (pending === 0) return;
  const slots: Slot[] = env.homes.map((_, k) => ({ k, proc: null, ready: false, job: null, startedAt: 0, last: null, bootFailures: 0, parked: false, retiring: false }));
  let fatal: Error | null = null;
  const control = controlReader();
  const cap = (): number => Math.min(slots.length, control().maxWorkers ?? slots.length);
  const alive = (): number => slots.filter((x) => x.proc).length;
  /** Called while the finished match's slot still holds its job. */
  const loadNow = (): PoolLoad => ({ busy: slots.filter((x) => x.job).length, alive: alive(), load1: Math.round((os.loadavg()[0] ?? 0) * 100) / 100, cpus: os.cpus().length });

  return new Promise<void>((resolve, reject) => {
    /** A match is answered: its follow-up jobs (D465) go first in the queue, and count as pending. */
    const answered = (j: MatchJob, r: MatchResult, k: number, load: PoolLoad): void => {
      const more = onResult(j, r, k, load) ?? [];
      queue.unshift(...more);
      pending += more.length - 1;
      // no other slot is woken: this one goes on (giveWork), or retired, died or hung -- and each of those starts a fresh worker here.
      // D480: under holdIdle the other idle workers are woken too (a barrier's follow-ups are several units, not one resume)
      if (hooks.holdIdle && more.length) {
        for (const s of slots) if (s.k !== k) giveWork(s);
        // ...and a slot left parked (the first stage needed fewer workers, or its worker died while nothing was queued) starts now
        for (const s of slots) {
          if (s.k === k || !s.parked || s.proc || queue.length === 0 || control().paused || alive() >= cap()) continue;
          s.parked = false;
          start(s);
        }
      }
    };
    /** D480: under holdIdle, nothing queued yet but matches still out -- an answer may queue more. */
    const holding = (): boolean => !!hooks.holdIdle && queue.length === 0 && pending > 0;
    const finish = (): void => {
      clearInterval(timer);
      for (const s of slots) if (s.proc) { s.proc.stdin.end(`${JSON.stringify({ type: 'quit' })}\n`); }
      if (fatal) reject(fatal); else resolve();
    };
    const giveWork = (s: Slot): void => {
      if (!s.ready || s.job || !s.proc) return;
      if (queue.length > 0) {
        if (control().paused) return;                       // held: the timer offers the work again
        if (alive() > cap()) {                              // over the cap: this worker goes
          say(`worker ${s.k}: parked (maxWorkers ${cap()})`);
          s.proc.stdin.end(`${JSON.stringify({ type: 'quit' })}\n`);
          s.proc = null;
          s.parked = true;
          return;
        }
      }
      if (holding()) return;                                // D480: idle, alive, until an answer queues more
      const j = queue.shift();
      if (!j) {
        s.proc.stdin.end(`${JSON.stringify({ type: 'quit' })}\n`);
        s.proc = null;
        return;
      }
      s.job = j;
      s.startedAt = monotonicMs();
      s.proc.stdin.write(`${JSON.stringify(j)}\n`);
    };

    const fail = (s: Slot, why: string): void => {
      const j = s.job;
      const load = loadNow();
      s.job = null;
      if (j) {
        say(`worker ${s.k}: ${why} during ${j.id}; recorded as an engine error, starting a fresh worker`);
        answered(j, { type: 'match', id: j.id, forge: [], games: [], engineError: why }, s.k, load);
      }
      if (pending === 0) { finish(); return; }
      if (queue.length > 0) restart(s);
      else if (holding()) s.parked = true;                  // D480: the timer starts it when work is queued
    };

    /** A fresh worker after one died or hung: parked instead while paused or at the cap (the timer starts it later). */
    const restart = (s: Slot): void => {
      if (control().paused || alive() >= cap()) { s.parked = true; return; }
      start(s);
    };

    const start = (s: Slot): void => {
      const home = env.homes[s.k] as string;
      const log = fs.createWriteStream(path.join(logDir, `worker-${s.k}.log`), { flags: 'a' });
      log.write(`\n==== worker ${s.k} started ${new Date().toISOString()} (home ${home})\n`);
      const proc = spawn('env', javaArgs(env, home, ['play']), { cwd: env.repo, stdio: ['pipe', 'pipe', 'pipe'] });
      s.proc = proc;
      proc.stdin.on('error', () => { /* a worker that already exited (EPIPE): its close is handled below */ });
      s.ready = false;
      s.job = null;
      proc.stderr.pipe(log);
      const rl = readline.createInterface({ input: proc.stdout });
      rl.on('line', (line) => {
        if (!line.startsWith('CUBELAB ')) { log.write(`${line}\n`); return; }
        let msg: { type?: string; id?: string };
        try { msg = JSON.parse(line.slice(8)) as typeof msg; } catch { log.write(`unparsable: ${line}\n`); return; }
        if (msg.type === 'ready') { s.ready = true; s.bootFailures = 0; giveWork(s); return; }
        if (msg.type === 'progress') {
          if (s.job && msg.id === s.job.id) hooks.onProgress?.(s.job, msg as ProgressMsg, s.k);
          return;
        }
        if (msg.type === 'match' && s.job) {
          const j = s.job;
          const r = msg as unknown as MatchResult;
          if (r.stuck) {
            // The Java watchdog gave up on a game thread; the worker exits 3 next.
            s.last = r;
            return;
          }
          const load = loadNow();
          s.job = null;
          if (r.retire) {
            // D465: its last answer; it exits by itself and the close below starts a fresh worker
            s.retiring = true;
            s.ready = false;
            s.proc = null;      // not alive for the cap or for finish()'s quit: it is on its way out
            say(`worker ${s.k}: retiring after ${j.id} (${r.retire}); a fresh worker takes its place`);
          }
          answered(j, r, s.k, load);
          if (pending === 0) { finish(); return; }
          if (!s.retiring) giveWork(s);
        }
      });
      // 'close', not 'exit': every line the worker wrote has been read by then (a retiring worker's answer, D465)
      proc.on('close', (code, signal) => {
        log.write(`==== worker ${s.k} exited ${code ?? ''}${signal ?? ''}\n`);
        if (s.proc !== proc && s.proc !== null) return;      // replaced already
        const retired = s.retiring;
        if (retired) {
          s.retiring = false;
          if (!s.job && queue.length > 0) restart(s);
          else if (!s.job && holding()) s.parked = true;   // D480
          return;
        }
        const wasReady = s.ready;
        s.proc = null;
        s.ready = false;
        if (s.job) {
          const j = s.job;
          if (s.last && s.last.id === j.id) {
            s.job = null;
            answered(j, { ...s.last, engineError: 'a game thread would not stop after its timeout; the worker was restarted' }, s.k, loadNow());
            s.last = null;
            if (pending === 0) { finish(); return; }
            if (queue.length > 0) restart(s);
            else if (holding()) s.parked = true;            // D480
            return;
          }
          fail(s, `worker exited (${code ?? signal})`);
          return;
        }
        if (!wasReady && pending > 0) {
          s.bootFailures++;
          if (s.bootFailures >= 2) {
            fatal = new Error(`worker ${s.k} could not boot the engine twice in a row; see ${path.join(logDir, `worker-${s.k}.log`)}`);
            finish();
            return;
          }
          if (queue.length > 0) restart(s);
        }
      });
    };

    const timer = setInterval(() => {
      for (const s of slots) {
        if (s.proc && s.ready && !s.job) giveWork(s);       // released from a pause
        if (s.parked && !s.proc && queue.length > 0 && !control().paused && alive() < cap()) {
          s.parked = false;
          say(`worker ${s.k}: unparked (maxWorkers ${cap()})`);
          start(s);
        }
        if (s.job && s.proc && monotonicMs() - s.startedAt > matchDeadlineMs(s.job)) {
          const p = s.proc;
          s.proc = null;
          p.kill('SIGKILL');
          fail(s, `no answer in ${Math.round(matchDeadlineMs(s.job) / 1000)} s (hung)`);
        }
      }
    }, 2000);

    const first = Math.min(slots.length, jobs.length);
    for (const s of slots.slice(0, first)) {
      if (alive() < cap() && !control().paused) start(s); else s.parked = true;      // paused: no JVM starts at all
    }
    // D480: under holdIdle the first jobs may be fewer than the workers (a barrier's later units are not queued yet): the rest
    // wait parked, and the timer starts each when work is queued
    if (hooks.holdIdle) for (const s of slots.slice(first)) s.parked = true;
  });
}
