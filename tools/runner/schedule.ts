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
//  3. one heavy job at a time; one light job may run beside it;
//  4. Justin first: no heavy job starts while he plays or the runner is paused;
//  5. the runner never picks a `waiting` job it may not run on its own:
//     `needs: check` (an old-format pilot ran and waits for a person or the PC
//     session to approve it) and `retry_after:` in the future (a memory stop);
//  6. a `running` STATUS the runner did not write (no `runner:` line) is
//     someone else's job — the PC session's hand-started unit — and counts as
//     a running job of its cpu class, so nothing heavy starts over it.

import type { JobFile } from './jobfile.ts';

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
  code: 'after' | 'heavy-busy' | 'light-busy' | 'playing' | 'paused' | 'needs-check' | 'memory' | 'invalid' | 'queued';
  reason: string;
}

export interface ScheduleInput {
  jobs: JobFile[];
  statuses: Map<string, Status>;
  /** Jobs this runner runs now (by id), with their cpu class. */
  active: Map<string, 'heavy' | 'light'>;
  playing: boolean;
  paused: boolean;
  now: number;
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
  for (const [id, st] of inp.statuses) {
    if (st.state === 'running' && !running.has(id)) {
      const j = inp.jobs.find((x) => x.id === id);
      running.set(id, j?.cpu ?? 'heavy');
    }
  }
  const busy = (c: 'heavy' | 'light'): boolean => [...running.values()].includes(c);
  for (const job of [...inp.jobs].sort((a, b) => idOrder(a.id, b.id))) {
    const st = inp.statuses.get(job.id);
    if (st && st.state !== 'waiting') continue;
    if (running.has(job.id)) continue;
    const b = (code: Blocked['code'], reason: string): void => {
      blocked.push({ id: job.id, title: job.title, est: job.est, cpu: job.cpu, code, reason });
    };
    if (job.errors.length) { b('invalid', `the job file has errors: ${job.errors[0]}`); continue; }
    if (st && /^(check|human)/i.test(st.fields.needs ?? '')) { b('needs-check', st.fields.reason ?? 'needs a human/Claude check'); continue; }
    const retry = st?.fields.retry_after ? Date.parse(st.fields.retry_after) : NaN;
    if (Number.isFinite(retry) && retry > inp.now) { b('memory', `${st?.fields.reason ?? 'memory'}; retry after ${st?.fields.retry_after}`); continue; }
    const notDone = job.after.filter((a) => inp.statuses.get(a)?.state !== 'done');
    if (notDone.length) { b('after', `after ${notDone.join(', ')}`); continue; }
    if (inp.paused) { b('paused', 'the runner is paused'); continue; }
    if (job.cpu === 'heavy') {
      if (inp.playing) { b('playing', 'Justin is playing'); continue; }
      if (busy('heavy')) { b('heavy-busy', 'a heavy job is running'); continue; }
    } else if (busy('light')) { b('light-busy', 'a light job is running'); continue; }
    start.push(job);
    running.set(job.id, job.cpu);
  }
  return { start, blocked };
}
