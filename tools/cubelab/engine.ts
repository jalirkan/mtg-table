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
// worker whose match is past games x (timeout + 40 s) + 120 s, or that died,
// records that match as an engine error with whatever games it finished, and
// starts a fresh worker for the rest.  A worker that dies before it is ready
// twice in a row stops the run: the engine cannot boot, and retrying is noise.
//
// The lab runner's control file (tools/runner/control.ts, D337): with
// LAB_CONTROL set, an idle worker gets no match while `paused`, and a worker
// whose match ended while more than `maxWorkers` JVMs are alive quits (its
// memory comes back); a parked worker starts again when the cap rises.
// Without LAB_CONTROL nothing here changes.

import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

import type { Fact } from './cards.ts';
import { controlReader } from '../runner/control.ts';

export interface EngineEnv { cp: string; homes: string[]; repo: string }

export function engineEnv(repo: string): EngineEnv {
  const cp = process.env.CUBELAB_CP;
  const homes = (process.env.CUBELAB_HOMES ?? '').split(',').filter(Boolean);
  if (!cp || homes.length === 0) {
    throw new Error('CUBELAB_CP / CUBELAB_HOMES are not set -- run the lab through tools/cubelab.sh, which builds them');
  }
  return { cp, homes, repo };
}

/** Hard rule 6's JVM, plus the Forge home's config. */
export function javaArgs(env: EngineEnv, home: string, main: string[]): string[] {
  return ['-u', 'DISPLAY', 'java', '-Xmx4096m', '-Djava.awt.headless=true',
    '-Dio.netty.tryReflectionSetAccessible=true', '-Dfile.encoding=UTF-8',
    '-Dsentry.uncaught.handler.enabled=false', `-Dmtgtable.config=${home}`,
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
  recorded?: { dir: string; bytes: number; frames: number; errors: number };
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
}

interface Slot {
  k: number;
  proc: ChildProcessWithoutNullStreams | null;
  ready: boolean;
  job: MatchJob | null;
  startedAt: number;
  last: MatchResult | null;
  bootFailures: number;
  /** Let go by the control file's maxWorkers; started again when the cap allows. */
  parked: boolean;
}

/**
 * Run every job on `env.homes.length` workers.  `onResult` gets each match as
 * it finishes (never in a promised order).  Resolves when every job has a result.
 */
export async function runPool(env: EngineEnv, jobs: MatchJob[], logDir: string,
  onResult: (job: MatchJob, r: MatchResult, worker: number) => void, say: (s: string) => void): Promise<void> {
  fs.mkdirSync(logDir, { recursive: true });
  const queue = [...jobs];
  let pending = jobs.length;
  if (pending === 0) return;
  const slots: Slot[] = env.homes.map((_, k) => ({ k, proc: null, ready: false, job: null, startedAt: 0, last: null, bootFailures: 0, parked: false }));
  let fatal: Error | null = null;
  const control = controlReader();
  const cap = (): number => Math.min(slots.length, control().maxWorkers ?? slots.length);
  const alive = (): number => slots.filter((x) => x.proc).length;

  return new Promise<void>((resolve, reject) => {
    const finish = (): void => {
      clearInterval(timer);
      for (const s of slots) if (s.proc) { s.proc.stdin.end(`${JSON.stringify({ type: 'quit' })}\n`); }
      if (fatal) reject(fatal); else resolve();
    };
    const deadlineMs = (j: MatchJob): number => (j.games * (j.gameTimeoutSec + 40) + 120) * 1000;

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
      const j = queue.shift();
      if (!j) {
        s.proc.stdin.end(`${JSON.stringify({ type: 'quit' })}\n`);
        s.proc = null;
        return;
      }
      s.job = j;
      s.startedAt = Date.now();
      s.proc.stdin.write(`${JSON.stringify(j)}\n`);
    };

    const fail = (s: Slot, why: string): void => {
      const j = s.job;
      s.job = null;
      if (j) {
        say(`worker ${s.k}: ${why} during ${j.id}; recorded as an engine error, starting a fresh worker`);
        onResult(j, { type: 'match', id: j.id, forge: [], games: [], engineError: why }, s.k);
        pending--;
      }
      if (pending === 0) { finish(); return; }
      if (queue.length > 0) restart(s);
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
      s.ready = false;
      s.job = null;
      proc.stderr.pipe(log);
      const rl = readline.createInterface({ input: proc.stdout });
      rl.on('line', (line) => {
        if (!line.startsWith('CUBELAB ')) { log.write(`${line}\n`); return; }
        let msg: { type?: string };
        try { msg = JSON.parse(line.slice(8)) as typeof msg; } catch { log.write(`unparsable: ${line}\n`); return; }
        if (msg.type === 'ready') { s.ready = true; s.bootFailures = 0; giveWork(s); return; }
        if (msg.type === 'match' && s.job) {
          const j = s.job;
          const r = msg as unknown as MatchResult;
          if (r.stuck) {
            // The Java watchdog gave up on a game thread; the worker exits 3 next.
            s.last = r;
            return;
          }
          s.job = null;
          pending--;
          onResult(j, r, s.k);
          if (pending === 0) { finish(); return; }
          giveWork(s);
        }
      });
      proc.on('exit', (code, signal) => {
        log.write(`==== worker ${s.k} exited ${code ?? ''}${signal ?? ''}\n`);
        if (s.proc !== proc && s.proc !== null) return;      // replaced already
        const wasReady = s.ready;
        s.proc = null;
        s.ready = false;
        if (s.job) {
          const j = s.job;
          if (s.last && s.last.id === j.id) {
            s.job = null;
            pending--;
            onResult(j, { ...s.last, engineError: 'a game thread would not stop after its timeout; the worker was restarted' }, s.k);
            s.last = null;
            if (pending === 0) { finish(); return; }
            if (queue.length > 0) restart(s);
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
        if (s.job && s.proc && Date.now() - s.startedAt > deadlineMs(s.job)) {
          const p = s.proc;
          s.proc = null;
          p.kill('SIGKILL');
          fail(s, `no answer in ${Math.round(deadlineMs(s.job) / 1000)} s (hung)`);
        }
      }
    }, 2000);

    const first = Math.min(slots.length, jobs.length);
    for (const s of slots.slice(0, first)) {
      if (alive() < cap() && !control().paused) start(s); else s.parked = true;      // paused: no JVM starts at all
    }
  });
}
