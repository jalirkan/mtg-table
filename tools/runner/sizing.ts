// mtg-table — the lab runner: the memory budget, worker sizing and the systemd units (D337).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// THE BUDGET.  The lab gets the machine minus a reserve for the OS, the
// desktop, the Claude app and the runner: budget = total RAM − reserve
// (default 7 GB: 30 GB → 23 GB on Justin's 9700X).  The lab slice
// (forgecoach-lab.slice) is capped at the budget; a heavy job's unit gets the
// budget less what a light job beside it may use; a light job gets that share.
// MemoryHigh (reclaim and throttle) sits a little below MemoryMax (the kernel's
// OOM kill inside the unit), so the job slows before anything is killed.
//
// WORKERS.  The pilot records the peak resident size of each worker JVM
// (VmHWM, sampled from the unit's cgroup); the full run then gets
//   workers = min(job's max_workers, physical cores − 1, floor(budget / peak × 0.85))
// and at least 1.  The peak is max(measured, mem_per_worker_gb ?? 2.5 GB): a
// short pilot whose JVMs never reach their working size cannot talk the
// estimate down below the declared or default floor (2.5 GB: the cube lab's
// worst seen, 2.4).  A pilot runs at most PILOT_MAX_WORKERS.

export interface Machine {
  memTotalGb: number;
  physicalCores: number;
  threads: number;
}

export interface BudgetOptions {
  reserveGb: number;
  /** What a light job beside a heavy one may use. */
  lightGb: number;
}

export const DEFAULT_BUDGET: BudgetOptions = { reserveGb: 7, lightGb: 2 };

export interface Budget {
  /** The lab slice's MemoryMax. */
  labGb: number;
  heavyGb: number;
  lightGb: number;
}

export function budget(m: Machine, o: BudgetOptions = DEFAULT_BUDGET): Budget {
  const labGb = Math.max(1, Math.floor((m.memTotalGb - o.reserveGb) * 10) / 10);
  const lightGb = Math.min(o.lightGb, labGb / 4);
  return { labGb, heavyGb: Math.max(1, Math.round((labGb - lightGb) * 10) / 10), lightGb };
}

export const DEFAULT_PEAK_GB = 2.5;
export const SIZING_HEADROOM = 0.85;
/** A pilot is small: at most this many workers, whatever the job allows. */
export const PILOT_MAX_WORKERS = 3;

export interface Sizing {
  workers: number;
  peakGb: number;
  /** Which limit decided it. */
  by: 'max_workers' | 'cores' | 'memory' | 'cap';
  detail: string;
}

/**
 * Workers for the full run.  `cap` is a retry's lower limit after a memory
 * stop (null: none).
 */
export function sizeWorkers(o: { budgetGb: number; physicalCores: number; maxWorkers: number | null; measuredPeakGb: number | null; memPerWorkerGb: number | null; cap?: number | null }): Sizing {
  const floor = o.memPerWorkerGb ?? DEFAULT_PEAK_GB;
  const peakGb = Math.max(o.measuredPeakGb ?? 0, floor);
  const byMem = Math.floor((o.budgetGb / peakGb) * SIZING_HEADROOM);
  const cands: Array<[Sizing['by'], number]> = [['cores', Math.max(1, o.physicalCores - 1)], ['memory', byMem]];
  if (o.maxWorkers) cands.push(['max_workers', o.maxWorkers]);
  if (o.cap) cands.push(['cap', o.cap]);
  let best = cands[0] as [Sizing['by'], number];
  for (const c of cands) if (c[1] < best[1]) best = c;
  const workers = Math.max(1, best[1]);
  return {
    workers,
    peakGb,
    by: best[0],
    detail: `min(${cands.map(([k, v]) => `${k} ${v}`).join(', ')}); peak ${peakGb.toFixed(2)} GB per worker${o.measuredPeakGb !== null && o.measuredPeakGb > floor ? ' (measured)' : o.memPerWorkerGb ? ` (declared${o.measuredPeakGb ? `; measured ${o.measuredPeakGb.toFixed(2)}` : ''})` : ` (default${o.measuredPeakGb ? `; measured ${o.measuredPeakGb.toFixed(2)}` : ''})`}, budget ${o.budgetGb} GB`,
  };
}

export const SLICE = 'forgecoach-lab.slice';
export const SERVICE = 'forgecoach-runner.service';

/** The slice: the lab's memory budget, and oomd told to act on the lab before the desktop. */
export function sliceUnit(b: Budget): string {
  return `# Written by tools/runner.sh install (mtg-table, D337). Every lab job runs in this slice.
[Unit]
Description=ForgeCoach lab jobs (the lab runner's transient units)

[Slice]
MemoryHigh=${Math.max(1, Math.round((b.labGb - 1) * 10) / 10)}G
MemoryMax=${b.labGb}G
MemorySwapMax=2G
CPUWeight=50
IOWeight=50
# systemd-oomd: watch this slice on its own and kill inside it first; the
# desktop's scopes are asked to be avoided (see the drop-in install writes).
ManagedOOMMemoryPressure=kill
ManagedOOMMemoryPressureLimit=60%
ManagedOOMPreference=none
`;
}

/** The drop-in for every app-*.scope (the desktop's apps, Firefox and the Claude app among them). */
export const DESKTOP_DROPIN = `# Written by tools/runner.sh install (mtg-table, D337): ask systemd-oomd to
# pick the lab's units before the desktop's apps.  systemd honours this only
# where the cgroup is owned by root (systemd.resource-control(5)); the lab
# slice's own limits and the runner's pressure backoff do not depend on it.
[Scope]
ManagedOOMPreference=avoid
`;

export function serviceUnit(o: { runnerDir: string; node: string; args: string[] }): string {
  return `# Written by tools/runner.sh install (mtg-table, D337).
[Unit]
Description=ForgeCoach lab runner (runs the pc-jobs queue)
# A runner that cannot start (a bad install) gives up after five tries in ten minutes, not forever.
StartLimitIntervalSec=600
StartLimitBurst=5

[Service]
Type=simple
WorkingDirectory=${o.runnerDir}
ExecStart=${o.runnerDir}/tools/runner.sh daemon ${o.args.join(' ')}
Environment=PATH=${o.node}:/usr/local/bin:/usr/bin:/bin
# git never prompts and never waits on ssh: a push or fetch fails fast instead of stalling the loop.
Environment=GIT_TERMINAL_PROMPT=0
Environment="GIT_SSH_COMMAND=ssh -oBatchMode=yes -oConnectTimeout=10"
Restart=on-failure
RestartSec=30
# The runner is small; the jobs run in their own units in ${SLICE},
# so stopping or restarting the runner never stops a job.
MemoryMax=2G
ManagedOOMPreference=avoid
Nice=0

[Install]
WantedBy=default.target
`;
}

export interface UnitSpec {
  unit: string;
  memoryHighGb: number;
  memoryMaxGb: number;
  script: string;
  log: string;
  cwd: string;
  env: Record<string, string>;
}

/** The systemd-run argv for one step of a job.  The step's exit code lands in `<script>.rc` (written by the wrapper). */
export function systemdRunArgs(u: UnitSpec): string[] {
  const args = ['--user', `--unit=${u.unit}`, `--slice=${SLICE}`, '--collect', '--no-block',
    `--description=lab job step ${u.unit}`,
    '-p', `MemoryHigh=${u.memoryHighGb}G`, '-p', `MemoryMax=${u.memoryMaxGb}G`, '-p', 'MemorySwapMax=1G',
    '-p', 'Nice=10', '-p', 'KillMode=control-group', '-p', 'KillSignal=SIGTERM', '-p', 'TimeoutStopSec=90',
    '-p', 'ManagedOOMPreference=none',
    '-p', `WorkingDirectory=${u.cwd}`,
    '-p', `StandardOutput=append:${u.log}`, '-p', `StandardError=append:${u.log}`];
  for (const [k, v] of Object.entries(u.env).sort()) args.push(`--setenv=${k}=${v}`);
  args.push('/bin/bash', `${u.script}.wrap`);
  return args;
}

/** The systemd-run command line for one step, shell-quoted (what `plan` and --dry-run print). */
export function systemdRunLine(u: UnitSpec): string {
  const q = (a: string): string => (/^[\w@%+=:,./-]+$/.test(a) ? a : `'${a.replace(/'/g, `'\\''`)}'`);
  return `systemd-run ${systemdRunArgs(u).map(q).join(' ')}`;
}

/** A unit name systemd accepts: lab-J003-pilot1. */
export function unitName(id: string, step: string): string {
  return `lab-${id}-${step}`.replace(/[^A-Za-z0-9_.-]/g, '-');
}
