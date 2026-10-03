// mtg-table — the AI ladder: batches of ai-bench games on a pool of workers.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The ladder plays NO game itself: a batch is one `mtgtable.bench.AiBench play`
// JVM (tools/ai-bench/AiBench.java, D309) — `--a <cfg> --b <cfg> --games 4
// --mirror --seed <bseed>` over a few deck pairs — and its JSON lines become
// ladder lines (results.ts).  tools/ai-ladder.sh compiles AiBench into
// var/ai-ladder/classes/ and makes one Forge home per worker with
// forge_home_make (D129's rule: no two JVMs share a Forge profile), and hands
// them over as LADDER_CP and LADDER_HOMES; every JVM runs under hard rule 6's
// flags.  A worker runs one JVM at a time, so `--jobs J` is J JVMs.
//
// A batch is the unit of scheduling: 4 games per deck pair (both decks on both
// seats, each deal from both sides), `pairsPerBatch` pairs.  On Justin's PC
// (3.8 s a game) ten pairs are a 40-game, ~2.5-minute batch, of which the JVM's
// start (FModel.initialize, ~5–20 s) is a small part.

import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { loadavg } from 'node:os';
import { join, relative } from 'node:path';

import type { Player } from './registry.ts';
import { appendResults, fromBench, type BenchLine, type GameRecord } from './results.ts';

export interface EngineEnv {
  repo: string;
  cp: string;
  homes: string[];
  dir: string;
  host: string;
  run: string;
  set: string;
  pairs: string[][];
  gameTimeoutSec: number;
}

export interface BatchSpec {
  a: Player;
  b: Player;
  bseed: number;
  pairs: number[];
  purpose: string;
}

export interface BatchResult {
  spec: BatchSpec;
  batch: number;
  recs: GameRecord[];
  ms: number;
  exit: number | null;
}

export function readPairs(file: string): string[][] {
  return readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split(/\s+/).slice(0, 2)).filter((p) => p.length === 2);
}

export function engineEnv(repo: string, dir: string, host: string, run: string, pairsFile: string, gameTimeoutSec: number): EngineEnv {
  const cp = process.env.LADDER_CP;
  const homes = (process.env.LADDER_HOMES ?? '').split(',').filter(Boolean);
  if (!cp || homes.length === 0) throw new Error('LADDER_CP / LADDER_HOMES are not set -- run through tools/ai-ladder.sh, which builds them');
  return { repo, cp, homes, dir, host, run, set: relative(repo, pairsFile) || pairsFile, pairs: readPairs(pairsFile), gameTimeoutSec };
}

function javaArgs(env: EngineEnv, home: string, args: string[]): string[] {
  return ['-u', 'DISPLAY', 'java', '-Xmx4096m', '-Djava.awt.headless=true',
    '-Dio.netty.tryReflectionSetAccessible=true', '-Dfile.encoding=UTF-8',
    '-Dsentry.uncaught.handler.enabled=false', `-Dmtgtable.config=${home}`,
    '-cp', env.cp, 'mtgtable.bench.AiBench', ...args];
}

/** A pool of `homes.length` workers; `drive()` keeps them busy. */
export class Engine {
  readonly env: EngineEnv;
  private batchNo = 0;
  private readonly live = new Set<ChildProcess>();
  private stopping = false;

  constructor(env: EngineEnv) {
    this.env = env;
  }

  get workers(): number {
    return this.env.homes.length;
  }

  /** Kill every JVM this process started (and only those). */
  stop(): void {
    this.stopping = true;
    for (const c of this.live) c.kill('SIGTERM');
  }

  get stopped(): boolean {
    return this.stopping;
  }

  runBatch(spec: BatchSpec, worker: number): Promise<BatchResult> {
    const env = this.env;
    const batch = this.batchNo++;
    const bdir = join(env.dir, 'batches', env.run);
    mkdirSync(bdir, { recursive: true });
    const pairsFile = join(bdir, `b${batch}.pairs`);
    const out = join(bdir, `b${batch}.jsonl`);
    const log = join(bdir, `b${batch}.log`);
    writeFileSync(pairsFile, spec.pairs.map((i) => (env.pairs[i] as string[]).join(' ')).join('\n') + '\n');
    if (existsSync(out)) rmSync(out);
    if (!spec.a.cfg || !spec.b.cfg) throw new Error(`batch of an unavailable player: ${spec.a.name} / ${spec.b.name}`);
    const args = ['play', '--pairs', pairsFile, '--a', spec.a.cfg, '--b', spec.b.cfg, '--games', '4', '--mirror',
      '--seed', String(spec.bseed), '--timeout', String(env.gameTimeoutSec), '--out', out];
    const t0 = Date.now();
    return new Promise((resolve) => {
      const proc = spawn('env', javaArgs(env, env.homes[worker] as string, args), { cwd: env.repo, stdio: ['ignore', 'pipe', 'pipe'] });
      this.live.add(proc);
      const chunks: Buffer[] = [];
      proc.stdout.on('data', (d: Buffer) => chunks.push(d));
      proc.stderr.on('data', (d: Buffer) => chunks.push(d));
      proc.on('close', (code) => {
        this.live.delete(proc);
        writeFileSync(log, Buffer.concat(chunks));
        const recs = ingest(env, spec, batch, out);
        resolve({ spec, batch, recs, ms: Date.now() - t0, exit: code });
      });
    });
  }
}

/** Read a batch's ai-bench lines (complete ones only: a killed JVM leaves a torn last line) and append them to the results log. */
export function ingest(env: Pick<EngineEnv, 'dir' | 'host' | 'run' | 'set'>, spec: BatchSpec, batch: number, out: string): GameRecord[] {
  if (!existsSync(out)) return [];
  const at = new Date().toISOString();
  const recs: GameRecord[] = [];
  for (const line of readFileSync(out, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let l: BenchLine;
    try {
      l = JSON.parse(line) as BenchLine;
    } catch {
      continue;
    }
    recs.push(fromBench(l, { host: env.host, run: env.run, batch, purpose: spec.purpose, set: env.set, bseed: spec.bseed, pairIndex: spec.pairs, a: spec.a, b: spec.b, at, load: Math.round(loadavg()[0]! * 100) / 100 }));
  }
  appendResults(env.dir, env.host, recs);
  return recs;
}

export interface DriveOptions {
  /** Epoch ms after which no batch starts (a batch is started only if it is expected to end by then). */
  deadline: number;
  /** The next batch to run, or null for "nothing now" (drive waits for a running one, or ends if none runs). */
  next: () => BatchSpec | null;
  done: (r: BatchResult) => void;
  log?: (s: string) => void;
}

/** Keep every worker busy until `next()` runs dry or the deadline nears; resolves when the last batch ends. */
export async function drive(engine: Engine, opt: DriveOptions): Promise<void> {
  const free = Array.from({ length: engine.workers }, (_, i) => i);
  const running = new Map<number, Promise<void>>();
  const times: number[] = [];
  const estimate = (): number => (times.length ? times.slice(-8).reduce((s, x) => s + x, 0) / Math.min(8, times.length) : 0);
  const fill = (): void => {
    while (free.length && !engine.stopped) {
      if (Date.now() + estimate() > opt.deadline) return;
      const spec = opt.next();
      if (!spec) return;
      const w = free.shift() as number;
      opt.log?.(`  start  w${w} ${spec.a.name} vs ${spec.b.name} (${spec.purpose}, seed ${spec.bseed}, ${spec.pairs.length} pair(s))`);
      const p = engine.runBatch(spec, w).then((r) => {
        times.push(r.ms);
        running.delete(w);
        free.push(w);
        const aw = r.recs.filter((x) => x.w === 'a').length, bw = r.recs.filter((x) => x.w === 'b').length;
        opt.log?.(`  done   w${w} ${spec.a.name} ${aw}-${bw} ${spec.b.name} (${r.recs.length - aw - bw} draws) in ${(r.ms / 1000).toFixed(0)} s${r.exit ? ` (exit ${r.exit})` : ''}`);
        opt.done(r);
      });
      running.set(w, p);
    }
  };
  fill();
  while (running.size) {
    await Promise.race(running.values());
    fill();
  }
}
