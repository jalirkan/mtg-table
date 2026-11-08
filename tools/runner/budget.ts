// mtg-table — the lab runner: the core and memory budgets, and their two modes (D519).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// THE CORE BUDGET is what the widths of the heavy jobs running side by side may sum to
// (schedule.ts).  Before D519 it was the physical cores (8 on the 9700X), so a 7-wide job
// left one core and every other heavy job waited behind it while 8 of the 16 threads sat
// idle all night.  Two modes, the owner's words:
//
//   whole   all the machine's threads but DESKTOP_THREADS (2) for the desktop: 14 of 16.
//           The default.
//   shared  the physical cores: 8 — the runner's numbers before D519, for when the owner
//           wants the machine to himself as well.
//
// A job's own width is unchanged by either (its `cores:`, else `max_workers`, else
// physical cores − 1; sizing.ts caps its workers at physical cores − 1): the budget only
// says how many such widths may run at once.
//
// THE MEMORY BUDGET is the lab's as before (sizing.ts `budget`: RAM − the 7 GB reserve, less
// a light job's 2 GB), and the slice's MemoryHigh/MemoryMax stay the hard stop.  `--mem-gb`
// may only LOWER the runner's accounting under it: raising it is `install --reserve-gb`,
// which rewrites the slice.  Separately, before any step starts the runner reads the host's
// MemAvailable and starts it only when its expected peak fits in that less AVAIL_RESERVE_GB
// (runner.ts `memoryFree`): a GPU painter or a browser outside the slice counts there.
//
// Where it lives: `<state>/budget.json`, written by `tools/runner.sh budget`, read by the
// daemon every tick (no restart).  Absent, the daemon's `--cores N` flag, else `whole`.

import fs from 'node:fs';
import path from 'node:path';

import type { Machine } from './sizing.ts';

export const BUDGET_FILE = 'budget.json';
/** Threads `whole` leaves for the desktop, the Claude app and the runner. */
export const DESKTOP_THREADS = 2;
/** Before a step starts: its expected peak must fit in MemAvailable less this (GB). */
export const AVAIL_RESERVE_GB = 2;

export type BudgetMode = 'whole' | 'shared' | 'custom';

export interface BudgetFile {
  mode: BudgetMode;
  /** `custom` only: the core budget. */
  cores?: number | null;
  /** A lower cap on the heavy jobs' memory budget (GB); null: the lab's as installed. */
  memGb?: number | null;
  setAt?: string;
  by?: string;
}

export interface Resolved {
  mode: BudgetMode;
  cores: number;
  coresFrom: 'budget.json' | '--cores' | 'default';
  memGb: number;
  memFrom: 'budget.json' | 'install';
}

/** The core budget a mode gives on this machine. */
export function modeCores(mode: 'whole' | 'shared', m: Pick<Machine, 'physicalCores' | 'threads'>): number {
  return mode === 'shared' ? Math.max(1, m.physicalCores) : Math.max(1, m.threads - DESKTOP_THREADS);
}

/** The budgets in force: budget.json, else the `--cores` flag, else `whole`; the memory cap only ever lowers the lab's. */
export function resolveBudget(o: { file: BudgetFile | null; flagCores: number | null | undefined; machine: Pick<Machine, 'physicalCores' | 'threads'>; heavyGb: number }): Resolved {
  const f = o.file;
  let mode: BudgetMode;
  let cores: number;
  let coresFrom: Resolved['coresFrom'];
  if (f && (f.mode === 'whole' || f.mode === 'shared')) { mode = f.mode; cores = modeCores(f.mode, o.machine); coresFrom = 'budget.json'; }
  else if (f && f.mode === 'custom' && Number.isFinite(f.cores) && (f.cores as number) >= 1) { mode = 'custom'; cores = Math.floor(f.cores as number); coresFrom = 'budget.json'; }
  else if (o.flagCores && o.flagCores >= 1) {
    cores = Math.floor(o.flagCores);
    mode = cores === modeCores('shared', o.machine) ? 'shared' : cores === modeCores('whole', o.machine) ? 'whole' : 'custom';
    coresFrom = '--cores';
  } else { mode = 'whole'; cores = modeCores('whole', o.machine); coresFrom = 'default'; }
  const cap = f && Number.isFinite(f.memGb) && (f.memGb as number) > 0 ? (f.memGb as number) : null;
  return { mode, cores, coresFrom, memGb: cap !== null && cap < o.heavyGb ? cap : o.heavyGb, memFrom: cap !== null && cap < o.heavyGb ? 'budget.json' : 'install' };
}

/** budget.json, or null when absent or unreadable (an unreadable one is ignored, never fatal). */
export function readBudgetFile(stateDir: string): BudgetFile | null {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(stateDir, BUDGET_FILE), 'utf8')) as Partial<BudgetFile>;
    if (raw.mode !== 'whole' && raw.mode !== 'shared' && raw.mode !== 'custom') return null;
    return { mode: raw.mode, cores: typeof raw.cores === 'number' ? raw.cores : null, memGb: typeof raw.memGb === 'number' ? raw.memGb : null, setAt: String(raw.setAt ?? ''), by: String(raw.by ?? '') };
  } catch { return null; }
}

export function writeBudgetFile(stateDir: string, f: BudgetFile): void {
  fs.mkdirSync(stateDir, { recursive: true });
  const file = path.join(stateDir, BUDGET_FILE);
  fs.writeFileSync(`${file}.part`, `${JSON.stringify(f, null, 1)}\n`);
  fs.renameSync(`${file}.part`, file);
}

export function clearBudgetFile(stateDir: string): boolean {
  const file = path.join(stateDir, BUDGET_FILE);
  if (!fs.existsSync(file)) return false;
  fs.rmSync(file, { force: true });
  return true;
}

/** `tools/runner.sh budget`'s report. */
export function budgetText(o: { r: Resolved; file: BudgetFile | null; machine: Machine; labGb: number; heavyGb: number; reserveGb: number; availGb: number | null; availReserveGb: number; daemonCores?: number | null }): string {
  const m = o.machine;
  const why = o.r.mode === 'whole' ? `all ${m.threads} threads but ${DESKTOP_THREADS} for the desktop` : o.r.mode === 'shared' ? 'the physical cores: the runner\'s budget before D519' : 'set by hand';
  const from = o.r.coresFrom === 'budget.json' ? `budget.json${o.file?.setAt ? `, set ${o.file.setAt}${o.file.by ? ` by ${o.file.by}` : ''}` : ''}` : o.r.coresFrom === '--cores' ? 'the --cores flag' : 'the default, no budget.json';
  return [
    `cores:  ${o.r.cores} of ${m.threads} threads (${m.physicalCores} physical cores): mode ${o.r.mode}, ${why} (from ${from})`,
    `        the heavy jobs running side by side keep at most this many busy; one job's own width is unchanged (its cores:, else max_workers, else ${Math.max(1, m.physicalCores - 1)})`,
    `        shared = ${modeCores('shared', m)}, whole = ${modeCores('whole', m)}${o.daemonCores != null && o.daemonCores !== o.r.cores ? `; the daemon's last status.json says ${o.daemonCores} (it reads budget.json every tick: an older runner ignores it)` : ''}`,
    `memory: ${o.r.memGb} GB for heavy jobs${o.r.memFrom === 'budget.json' ? ` (budget.json caps it; the lab's is ${o.heavyGb} GB)` : ''}: the lab slice's MemoryMax ${o.labGb} G (${m.memTotalGb.toFixed(1)} GB less the ${o.reserveGb} GB reserve), less a light job's share`,
    `        before any step starts, its expected peak must also fit in MemAvailable less ${o.availReserveGb} GB${o.availGb !== null ? ` (now ${(Math.round(o.availGb * 10) / 10)} GB available)` : ''}`,
    'set:    tools/runner.sh budget whole | shared | default    (default: remove budget.json; the --cores flag, else whole)',
    `        tools/runner.sh budget --cores N    tools/runner.sh budget --mem-gb N (at most ${o.heavyGb}; more is tools/runner.sh install --reserve-gb N, which rewrites the slice)`,
  ].join('\n');
}
