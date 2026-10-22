// mtg-table — the lab runner: STATUS files and which job runs next (D337).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A STATUS file (pc-results `results/<id>/STATUS`): the first line is the
// state, the lines after it `key: value`.  The README's rules, as code:
//
//  1. a job is OPEN when it has no STATUS, or its STATUS is `waiting`;
//  2. open jobs are taken in id order, and a job whose `after:` jobs are not
//     all `done` waits;
//  3. one heavy job at a time; one light job may run beside it — unless the
//     running heavy jobs are NARROW (CO-SCHEDULING, below);
//  4. Justin first: no heavy job starts while he plays or the runner is paused;
//  5. the runner never picks a `waiting` job it may not run on its own:
//     `needs: check` (an old-format pilot ran and waits for a person or the PC
//     session to approve it) and `retry_after:` in the future (a memory stop);
//  6. a `running` STATUS the runner did not write (no `runner:` line) is
//     someone else's job — the PC session's hand-started unit — and counts as
//     a running job of its cpu class, so nothing heavy starts over it.
//
// CO-SCHEDULING (D337, amended).  A heavy job has a WIDTH, the cores it keeps
// busy: its `cores:` header, else its max_workers, else the default workers
// (physical cores − 1); a running job's width is its current step's (a block's
// own `cores:` line), never more than the machine's core budget.  A heavy job
// may start BESIDE running heavy jobs when
//   - the widths, its own included, sum to at most the core budget;
//   - the memory reservations (width × the per-worker peak: measured, or
//     mem_per_worker_gb, or 2.5 GB) sum to at most the heavy memory budget;
//   - no running job is in memory backoff (a dropped worker or a pause) and
//     the host's memory pressure is not high;
//   - and Justin first, pause, needs-check and retry_after hold as above.
// ORDER and STARVATION: the first open heavy job that could run but does not
// fit stops the queue — nothing after it starts beside the running jobs — so a
// wide job is never overtaken by narrow ones; it gets the machine when the
// running jobs end.  A job whose `after:` is not done does not stop the queue
// (it cannot run anyway).  Someone else's running job has an unknown width: it
// fills the machine.  Without `machine` in the input, the old rule: one heavy.

import type { JobFile } from './jobfile.ts';
import { DEFAULT_PEAK_GB } from './sizing.ts';
import { retryHolds } from './clock.ts';

/** A memory stop's `retry_after:` is this far ahead of the stop (runner.ts `memoryStop`); D461 reads it back against it. */
export const MEMORY_RETRY_MS = 15 * 60_000;

export type State = 'waiting' | 'running' | 'done' | 'failed' | 'skipped';
export const STATES: State[] = ['waiting', 'running', 'done', 'failed', 'skipped'];

export interface Status {
  state: State;
  fields: Record<string, string>;
  /** Keys in their written order (for a faithful rewrite). */
  order: string[];
}

export function parseStatus(text: string): Status | null {
  const lines = text.split('\n').map((l) => l.replace(/\r$/, ''));
  const first = (lines[0] ?? '').trim().toLowerCase();
  if (!STATES.includes(first as State)) return null;
  const fields: Record<string, string> = {};
  const order: string[] = [];
  for (const l of lines.slice(1)) {
    const m = /^([A-Za-z][\w -]*?):\s?(.*)$/.exec(l);
    if (!m) continue;
    const k = (m[1] as string).trim();
    if (!(k in fields)) order.push(k);
    fields[k] = m[2] as string;
  }
  return { state: first as State, fields, order };
}

export function formatStatus(s: Status): string {
  const keys = [...s.order.filter((k) => k in s.fields), ...Object.keys(s.fields).filter((k) => !s.order.includes(k))];
  return `${s.state}\n${keys.map((k) => `${k}: ${String(s.fields[k]).replace(/\n/g, ' ')}`).join('\n')}\n`;
}

/** Ours: a STATUS this runner wrote. */
export const isOurs = (s: Status | null | undefined): boolean => !!s && 'runner' in s.fields;

export interface Pick {
  job: JobFile;
}

export interface Blocked {
  id: string;
  title: string;
  est: string;
  cpu: 'heavy' | 'light';
  /** A short code the public page may show. */
  code: 'after' | 'heavy-busy' | 'light-busy' | 'cores' | 'playing' | 'paused' | 'needs-check' | 'memory' | 'invalid' | 'queued';
  reason: string;
}

/** What a running job holds: its width now (cores) and its memory reservation (GB). */
export interface Holding { cores: number; memGb: number }

/** The machine, for co-scheduling heavy jobs. */
export interface MachineBudget {
  /** The core budget: the widths of the heavy jobs running at once sum to at most this. */
  cores: number;
  /** The heavy jobs' memory budget (sizing.ts budget().heavyGb). */
  memGb: number;
  /** A heavy job's width when it names neither cores: nor max_workers (physical cores − 1). */
  defaultWidth: number;
  /** Memory backoff: a running job dropped a worker or paused, or the host's pressure is high. No job starts beside another. */
  memoryBackoff: boolean;
  /** Off: one heavy job at a time, as before. */
  coSchedule: boolean;
}

export interface ScheduleInput {
  jobs: JobFile[];
  statuses: Map<string, Status>;
  /** Jobs this runner runs now (by id), with their cpu class. */
  active: Map<string, 'heavy' | 'light'>;
  /** What each of this runner's running jobs holds (by id); a heavy job missing here fills the machine. */
  holdings?: Map<string, Holding>;
  /** Present: heavy jobs may run side by side within it (co-scheduling); absent: one heavy job at a time. */
  machine?: MachineBudget;
  playing: boolean;
  paused: boolean;
  /** D401: admissions held (tools/runner/holds.ts, `play.sh --pause-lab`): no job starts, running ones carry on. The words why, or null. */
  held?: string | null;
  now: number;
}

/** A job's width before it runs: `cores:`, else max_workers, else the default; at most the budget. */
export function widthOf(job: JobFile, m: { cores: number; defaultWidth: number }): number {
  const w = job.cores ?? (job.cpu === 'light' ? 1 : job.maxWorkers ?? m.defaultWidth);
  return Math.max(1, Math.min(w, m.cores));
}

/** A job's memory reservation before it runs: width × max(mem_per_worker_gb ?? 2.5, a peak measured before). */
export function reservationOf(job: JobFile, width: number, measuredPeakGb: number | null = null): number {
  return width * Math.max(job.memPerWorkerGb ?? DEFAULT_PEAK_GB, measuredPeakGb ?? 0);
}

export function idOrder(a: string, b: string): number {
  return Number(a.slice(1)) - Number(b.slice(1)) || a.localeCompare(b);
}

/**
 * The jobs to start now (at most one heavy and one light), and why each other
 * open job waits.  Pure.
 */
export function schedule(inp: ScheduleInput): { start: JobFile[]; blocked: Blocked[] } {
  const start: JobFile[] = [];
  const blocked: Blocked[] = [];
  const running = new Map(inp.active);
  const m = inp.machine;
  const holdings = new Map(inp.holdings ?? []);
  for (const [id, st] of inp.statuses) {
    if (st.state === 'running' && !running.has(id)) {
      const j = inp.jobs.find((x) => x.id === id);
      running.set(id, j?.cpu ?? 'heavy');
      holdings.delete(id);              // someone else's: its width is not known
    }
  }
  const busy = (c: 'heavy' | 'light'): boolean => [...running.values()].includes(c);
  // The heavy jobs' cores and memory in use; one of unknown width fills the machine.
  const used = { cores: 0, memGb: 0 };
  for (const [id, cpu] of running) {
    if (cpu !== 'heavy') continue;
    const h = holdings.get(id);
    used.cores += h ? h.cores : Infinity;
    used.memGb += h ? h.memGb : Infinity;
  }
  /** The first open heavy job that could run but did not fit: nothing after it starts beside (order, starvation). */
  let firstUnfit: string | null = null;
  for (const job of [...inp.jobs].sort((a, b) => idOrder(a.id, b.id))) {
    const st = inp.statuses.get(job.id);
    if (st && st.state !== 'waiting') continue;
    if (running.has(job.id)) continue;
    const b = (code: Blocked['code'], reason: string): void => {
      blocked.push({ id: job.id, title: job.title, est: job.est, cpu: job.cpu, code, reason });
    };
    if (job.errors.length) { b('invalid', `the job file has errors: ${job.errors[0]}`); continue; }
    if (st && /^(check|human)/i.test(st.fields.needs ?? '')) { b('needs-check', st.fields.reason ?? 'needs a human/Claude check'); continue; }
    // D461: a wall time, read defensively: further ahead than the runner ever writes, the clock went backwards: due.
    const retry = st?.fields.retry_after ? Date.parse(st.fields.retry_after) : NaN;
    if (retryHolds(retry, inp.now, MEMORY_RETRY_MS + 60_000)) { b('memory', `${st?.fields.reason ?? 'memory'}; retry after ${st?.fields.retry_after}`); continue; }
    const notDone = job.after.filter((a) => inp.statuses.get(a)?.state !== 'done');
    if (notDone.length) { b('after', `after ${notDone.join(', ')}`); continue; }
    if (inp.paused) { b('paused', 'the runner is paused'); continue; }
    // D401: people are playing (play.sh --pause-lab): no admission, heavy or light; the public copy says "held".
    if (inp.held) { b('playing', inp.held); continue; }
    if (job.cpu === 'heavy') {
      if (inp.playing) { b('playing', 'Justin is playing'); continue; }
      if (busy('heavy')) {
        if (!m || !m.coSchedule || used.cores === Infinity) { b('heavy-busy', 'a heavy job is running'); continue; }
        if (firstUnfit) { b('heavy-busy', `after ${firstUnfit}, which waits for the machine first`); continue; }
        const w = widthOf(job, m);
        const mem = reservationOf(job, w);
        const why = m.memoryBackoff ? 'a running job is in memory backoff'
          : used.cores + w > m.cores ? `needs ${w} core(s); ${Math.max(0, m.cores - used.cores)} of ${m.cores} free`
            : used.memGb + mem > m.memGb ? `needs ${round1(mem)} GB; ${round1(Math.max(0, m.memGb - used.memGb))} of ${m.memGb} GB free` : null;
        if (why) { firstUnfit = job.id; b('cores', why); continue; }
      }
      if (m) {
        const w = widthOf(job, m);
        used.cores += w;
        used.memGb += reservationOf(job, w);
      }
    } else if (busy('light')) { b('light-busy', 'a light job is running'); continue; }
    start.push(job);
    running.set(job.id, job.cpu);
  }
  return { start, blocked };
}

const round1 = (x: number): number => Math.round(x * 10) / 10;
