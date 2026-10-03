// mtg-table — the lab runner: status.json, and its public, numbers-only copy (D334).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// status.json is the progress page's data (ForgeCoach `#lab`).  The runner
// writes it every minute to var/runner/status.json, pushes it with
// HEARTBEAT.md to pc-results (private), and pushes a SANITISED copy to the
// orphan branch `lab-status` of the PUBLIC jalirkan/ForgeCoach.  Schema 1:
//
//   { schema: 1, updated, paused,
//     host: { load1, memUsedGb, memTotalGb, swapUsedMb, pressure (some avg10, %), cpus, budgetGb },
//     running: [ { id, title, cpu, phase, started, elapsed (s), done, total, unit, ratePerHour, eta,
//                  workers, workersMax, errors, paused, dataUpdated, pressureEvents: [{ at, kind, workers, pressure }] } ],
//     queue:    [ { id, title, cpu, est } ],
//     waiting:  [ { id, title, reason, est } ],
//     finished: [ { id, title, status, finished, headline, numbers: { <metric>: <number> } } ] }
//
// Every timestamp is ISO 8601 with an offset; lists hold at most 50 items.
//
// THE PUBLIC COPY is rebuilt field by field from an explicit allowlist
// (`sanitise`): job ids (J###), titles (paths, URLs, hostnames and addresses
// cut out, 100 characters), numbers, timestamps, and words from fixed sets
// (status, phase, reason, event kind).  Anything else — a path, a host name, a
// card, deck or cube's contents, a line of any log — has no field to travel
// in.  The headline is re-made from the numbers, never copied.

export const LIST_MAX = 50;
export const EVENTS_MAX = 20;

export interface PressureEvent { at: string; kind: 'drop' | 'raise' | 'pause' | 'resume' | 'stop' | 'playing' | 'play-ended'; workers: number | null; pressure: number }

export interface RunningJob {
  id: string;
  title: string;
  cpu: 'heavy' | 'light';
  phase: string;
  started: string;
  elapsed: number;
  done: number | null;
  total: number | null;
  unit: string | null;
  ratePerHour: number | null;
  eta: string | null;
  workers: number | null;
  workersMax: number | null;
  errors: number | null;
  paused: boolean;
  dataUpdated: string | null;
  pressureEvents: PressureEvent[];
  /** Private only. */
  detail?: string;
}

export interface QueueItem { id: string; title: string; cpu: 'heavy' | 'light'; est: string }
export interface WaitingItem { id: string; title: string; reason: string; est: string; detail?: string }
export interface FinishedItem { id: string; title: string; status: 'done' | 'failed' | 'skipped'; finished: string; headline: string; numbers: Record<string, number>; detail?: string }

export interface StatusDoc {
  schema: 1;
  updated: string;
  paused: boolean;
  host: { load1: number; memUsedGb: number; memTotalGb: number; swapUsedMb: number; pressure: number; cpus: number; budgetGb: number };
  running: RunningJob[];
  queue: QueueItem[];
  waiting: WaitingItem[];
  finished: FinishedItem[];
  runner?: { commit: string; started: string; dryRun: boolean };
}

/** ISO 8601 with the local offset: 2026-10-03T10:55:00-04:00. */
export function isoLocal(ms: number, offsetMin = -new Date(ms).getTimezoneOffset()): string {
  const d = new Date(ms + offsetMin * 60_000);
  const sign = offsetMin >= 0 ? '+' : '-';
  const a = Math.abs(offsetMin);
  const p = (n: number, w = 2): string => String(n).padStart(w, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}${sign}${p(Math.floor(a / 60))}:${p(a % 60)}`;
}

/** "games 400 · a_win_rate 0.41" from the numbers, in the job's headline order. */
export function headlineOf(numbers: Record<string, number>): string {
  return Object.entries(numbers).map(([k, v]) => `${k} ${Math.round(v * 1000) / 1000}`).join(' · ');
}

// ------------------------------------------------------------- the public copy

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const ID = /^J\d{3,5}$/;
const METRIC = /^[a-z][a-z0-9_]{0,40}(\.[a-z0-9_]{1,40}){0,2}$/;
const PHASE = /^(prepare|pilot|commands|checks|collect|stopping)( \d{1,2}\/\d{1,2})?$/;
const UNITS = new Set(['games', 'drafts', 'lines', 'files', 'items', 'matches', 'answers']);
const STATUSES = new Set(['done', 'failed', 'skipped']);
const KINDS = new Set(['drop', 'raise', 'pause', 'resume', 'stop', 'playing', 'play-ended']);
/** The public words for why a job waits (schedule.ts's codes). */
export const REASONS: Record<string, string> = {
  after: 'waiting for an earlier job',
  'heavy-busy': 'after the running heavy job',
  'light-busy': 'after the running light job',
  playing: 'Justin is playing',
  paused: 'the runner is paused',
  'needs-check': 'pilot done; needs a check',
  memory: 'stopped for memory; will retry',
  invalid: 'the job file needs fixing',
  queued: 'queued',
};
const REASON_WORDS = new Set(Object.values(REASONS));

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null);
const iso = (v: unknown): string | null => (typeof v === 'string' && ISO.test(v) ? v : null);
const id = (v: unknown): string | null => (typeof v === 'string' && ID.test(v) ? v : null);

/** A title, with anything that looks like a path, URL, host, address or e-mail cut out. */
export function cleanTitle(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v
    .replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, '…')
    .replace(/\S*[\\/]\S*/g, '…')
    .replace(/\S+@\S+/g, '…')
    .replace(/\b\d{1,3}(\.\d{1,3}){3}\b/g, '…')
    .replace(/\b[\w-]+(\.[\w-]+)*\.(local|lan|home|internal|com|net|org|io|dev)\b/gi, '…')
    .replace(/[^\p{L}\p{N} ,.;:()#+&'’!?%~–—…-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

function numbers(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!v || typeof v !== 'object') return out;
  for (const [k, x] of Object.entries(v as Record<string, unknown>).slice(0, 12)) {
    const n = num(x);
    if (METRIC.test(k) && n !== null) out[k] = n;
  }
  return out;
}

/** The public copy: every field rebuilt from the allowlist; anything unknown is dropped. */
export function sanitise(doc: StatusDoc): StatusDoc {
  const h = doc.host ?? ({} as StatusDoc['host']);
  const running = (Array.isArray(doc.running) ? doc.running : []).slice(0, LIST_MAX).flatMap((r): RunningJob[] => {
    const rid = id(r.id);
    if (!rid) return [];
    const unit = typeof r.unit === 'string' && UNITS.has(r.unit) ? r.unit : null;
    return [{
      id: rid, title: cleanTitle(r.title), cpu: r.cpu === 'light' ? 'light' : 'heavy',
      phase: typeof r.phase === 'string' && PHASE.test(r.phase) ? r.phase : 'commands',
      started: iso(r.started) ?? '', elapsed: num(r.elapsed) ?? 0,
      done: num(r.done), total: num(r.total), unit, ratePerHour: num(r.ratePerHour), eta: iso(r.eta),
      workers: num(r.workers), workersMax: num(r.workersMax), errors: num(r.errors), paused: r.paused === true,
      dataUpdated: iso(r.dataUpdated),
      pressureEvents: (Array.isArray(r.pressureEvents) ? r.pressureEvents : []).slice(-EVENTS_MAX).flatMap((e): PressureEvent[] => {
        const at = iso(e.at);
        if (!at || !KINDS.has(e.kind)) return [];
        return [{ at, kind: e.kind, workers: num(e.workers), pressure: num(e.pressure) ?? 0 }];
      }),
    }];
  });
  const queue = (Array.isArray(doc.queue) ? doc.queue : []).slice(0, LIST_MAX).flatMap((q): QueueItem[] => {
    const qid = id(q.id);
    return qid ? [{ id: qid, title: cleanTitle(q.title), cpu: q.cpu === 'light' ? 'light' : 'heavy', est: cleanTitle(q.est).slice(0, 40) }] : [];
  });
  const waiting = (Array.isArray(doc.waiting) ? doc.waiting : []).slice(0, LIST_MAX).flatMap((w): WaitingItem[] => {
    const wid = id(w.id);
    return wid ? [{ id: wid, title: cleanTitle(w.title), reason: REASON_WORDS.has(w.reason) ? w.reason : 'waiting', est: cleanTitle(w.est).slice(0, 40) }] : [];
  });
  const finished = (Array.isArray(doc.finished) ? doc.finished : []).slice(0, LIST_MAX).flatMap((f): FinishedItem[] => {
    const fid = id(f.id);
    if (!fid || !STATUSES.has(f.status)) return [];
    const n = numbers(f.numbers);
    return [{ id: fid, title: cleanTitle(f.title), status: f.status, finished: iso(f.finished) ?? '', headline: headlineOf(n), numbers: n }];
  });
  return {
    schema: 1,
    updated: iso(doc.updated) ?? '',
    paused: doc.paused === true,
    host: {
      load1: num(h.load1) ?? 0, memUsedGb: num(h.memUsedGb) ?? 0, memTotalGb: num(h.memTotalGb) ?? 0,
      swapUsedMb: num(h.swapUsedMb) ?? 0, pressure: num(h.pressure) ?? 0, cpus: num(h.cpus) ?? 0, budgetGb: num(h.budgetGb) ?? 0,
    },
    running, queue, waiting, finished,
  };
}

/** The full (private) copy's size guard: trim lists until it fits under `maxBytes`. */
export function fit(doc: StatusDoc, maxBytes = 512 * 1024): StatusDoc {
  const d: StatusDoc = { ...doc, running: doc.running.slice(0, LIST_MAX), queue: doc.queue.slice(0, LIST_MAX), waiting: doc.waiting.slice(0, LIST_MAX), finished: doc.finished.slice(0, LIST_MAX) };
  while (JSON.stringify(d).length > maxBytes && d.finished.length) d.finished = d.finished.slice(0, Math.floor(d.finished.length / 2));
  return d;
}
