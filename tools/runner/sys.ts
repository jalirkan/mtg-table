// mtg-table — the lab runner: the machine, behind one interface (D334).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Everything the runner does to the machine goes through `Sys`: systemd
// (systemd-run / systemctl --user), /proc and /sys/fs/cgroup, git, and the
// clock.  runner.ts takes a Sys, so its logic runs in node's tests against a
// fake one (web/test/lab-runner.test.ts); `realSys()` is the PC's, and
// `dryRunSys()` prints every systemd-run and systemctl command instead of
// running it.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';

import { parsePressure } from './backoff.ts';
import type { Machine, UnitSpec } from './sizing.ts';
import { systemdRunArgs } from './sizing.ts';

export interface Run { code: number; stdout: string; stderr: string }

export interface HostSample {
  at: number;
  load1: number;
  memTotalGb: number;
  memUsedGb: number;
  swapUsedMb: number;
  some10: number;
  /** /proc/vmstat pswpin, cumulative pages. */
  pswpin: number;
}

export type UnitState = 'active' | 'activating' | 'deactivating' | 'inactive' | 'failed' | 'unknown';

export interface Sys {
  now(): number;
  /** Run a program (never a shell string): git, systemctl, the extractors' `sh:` lines go through `bash -c`. */
  run(argv: string[], o?: { cwd?: string; timeoutMs?: number; env?: Record<string, string>; input?: string }): Run;
  machine(): Machine;
  host(): HostSample;
  startUnit(u: UnitSpec): Run;
  stopUnit(unit: string): Run;
  unitState(unit: string): UnitState;
  /** The unit's memory.current, GB. */
  unitMemoryGb(unit: string): number | null;
  /** Peak resident set (VmHWM, GB) of every java process in the unit's cgroup now. */
  unitJavaPeaksGb(unit: string): number[];
  /** Someone holds a socket to the bridge (Justin playing, or watching). */
  playing(port: number): boolean;
  log(s: string): void;
}

const GB = 1024 * 1024 * 1024;

export function readMeminfo(text: string): { totalGb: number; availGb: number; swapTotalMb: number; swapFreeMb: number } {
  const kb = (k: string): number => Number(new RegExp(`^${k}:\\s+(\\d+)`, 'm').exec(text)?.[1] ?? 0);
  return { totalGb: kb('MemTotal') / 1048576, availGb: kb('MemAvailable') / 1048576, swapTotalMb: kb('SwapTotal') / 1024, swapFreeMb: kb('SwapFree') / 1024 };
}

/** Physical cores from /proc/cpuinfo ("physical id" x "core id"), else threads / 2. */
export function physicalCores(cpuinfo: string, threads: number): number {
  const set = new Set<string>();
  let phys = '0';
  for (const l of cpuinfo.split('\n')) {
    const p = /^physical id\s*:\s*(\d+)/.exec(l);
    if (p) phys = p[1] as string;
    const c = /^core id\s*:\s*(\d+)/.exec(l);
    if (c) set.add(`${phys}/${c[1]}`);
  }
  return set.size || Math.max(1, Math.floor(threads / 2));
}

/** Established TCP connections whose local port is `port` (/proc/net/tcp and tcp6). */
export function establishedOn(tables: string[], port: number): number {
  const hex = port.toString(16).toUpperCase().padStart(4, '0');
  let n = 0;
  for (const t of tables) {
    for (const l of t.split('\n').slice(1)) {
      const f = l.trim().split(/\s+/);
      if (f.length > 3 && (f[1] ?? '').endsWith(`:${hex}`) && f[3] === '01') n++;
    }
  }
  return n;
}

function readOr(file: string, d = ''): string {
  try { return fs.readFileSync(file, 'utf8'); } catch { return d; }
}

function run(argv: string[], o: { cwd?: string; timeoutMs?: number; env?: Record<string, string>; input?: string } = {}): Run {
  const r = spawnSync(argv[0] as string, argv.slice(1), {
    cwd: o.cwd, encoding: 'utf8', timeout: o.timeoutMs ?? 120_000, maxBuffer: 64 * 1024 * 1024,
    env: o.env ? { ...process.env, ...o.env } : process.env, input: o.input,
  });
  return { code: r.status ?? (r.error ? 127 : 1), stdout: r.stdout ?? '', stderr: (r.stderr ?? '') + (r.error ? String(r.error) : '') };
}

function systemctlShow(unit: string, props: string[]): Record<string, string> {
  const r = run(['systemctl', '--user', 'show', unit, ...props.map((p) => `-p${p}`)], { timeoutMs: 10_000 });
  const out: Record<string, string> = {};
  for (const l of r.stdout.split('\n')) { const i = l.indexOf('='); if (i > 0) out[l.slice(0, i)] = l.slice(i + 1); }
  return out;
}

export function realSys(): Sys {
  return {
    now: () => Date.now(),
    run,
    machine() {
      const threads = os.cpus().length;
      return { memTotalGb: os.totalmem() / GB, physicalCores: physicalCores(readOr('/proc/cpuinfo'), threads), threads };
    },
    host() {
      const mi = readMeminfo(readOr('/proc/meminfo'));
      return {
        at: Date.now(),
        load1: os.loadavg()[0] ?? 0,
        memTotalGb: mi.totalGb,
        memUsedGb: mi.totalGb - mi.availGb,
        swapUsedMb: mi.swapTotalMb - mi.swapFreeMb,
        some10: parsePressure(readOr('/proc/pressure/memory')).some10,
        pswpin: Number(/^pswpin (\d+)/m.exec(readOr('/proc/vmstat'))?.[1] ?? 0),
      };
    },
    startUnit: (u) => run(['systemd-run', ...systemdRunArgs(u)], { timeoutMs: 30_000 }),
    stopUnit: (unit) => run(['systemctl', '--user', 'stop', '--no-block', unit], { timeoutMs: 30_000 }),
    unitState(unit) {
      const s = systemctlShow(unit, ['ActiveState', 'LoadState']);
      if (s.LoadState === 'not-found') return 'inactive';
      return (['active', 'activating', 'deactivating', 'inactive', 'failed'].includes(s.ActiveState ?? '') ? s.ActiveState : 'unknown') as UnitState;
    },
    unitMemoryGb(unit) {
      const v = Number(systemctlShow(unit, ['MemoryCurrent']).MemoryCurrent);
      return Number.isFinite(v) && v < 2 ** 60 ? v / GB : null;
    },
    unitJavaPeaksGb(unit) {
      const cg = systemctlShow(unit, ['ControlGroup']).ControlGroup;
      if (!cg) return [];
      const pids: string[] = [];
      const walk = (dir: string): void => {
        pids.push(...readOr(`${dir}/cgroup.procs`).split('\n').filter(Boolean));
        let ents: fs.Dirent[] = [];
        try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const e of ents) if (e.isDirectory()) walk(`${dir}/${e.name}`);
      };
      walk(`/sys/fs/cgroup${cg}`);
      const out: number[] = [];
      for (const pid of pids) {
        const st = readOr(`/proc/${pid}/status`);
        if (!/^Name:\s+java$/m.test(st)) continue;
        const kb = Number(/^VmHWM:\s+(\d+)/m.exec(st)?.[1] ?? 0);
        if (kb) out.push(kb / 1048576);
      }
      return out;
    },
    playing: (port) => establishedOn([readOr('/proc/net/tcp'), readOr('/proc/net/tcp6')], port) > 0,
    log: (s) => process.stdout.write(`${new Date().toISOString()} ${s}\n`),
  };
}

/** The real machine for reading; every systemd action printed instead of done. */
export function dryRunSys(print: (s: string) => void = (s) => process.stdout.write(`${s}\n`)): Sys {
  const r = realSys();
  const q = (a: string): string => (/^[\w@%+=:,./-]+$/.test(a) ? a : `'${a.replace(/'/g, `'\\''`)}'`);
  return {
    ...r,
    startUnit(u) {
      print(`[dry-run] systemd-run ${systemdRunArgs(u).map(q).join(' ')}`);
      return { code: 0, stdout: '', stderr: '' };
    },
    stopUnit(unit) {
      print(`[dry-run] systemctl --user stop --no-block ${unit}`);
      return { code: 0, stdout: '', stderr: '' };
    },
    unitState: () => 'inactive',
  };
}
