// mtg-table — the lab runner: status.json, and its public, numbers-only copy (D337).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// status.json is the progress page's data (ForgeCoach `#lab`).  The runner
// writes it every minute to var/runner/status.json, pushes it with
// HEARTBEAT.md to pc-results (private), and pushes a SANITISED copy to the
// orphan branch `lab-status` of the PUBLIC jalirkan/ForgeCoach.  Schema 1:
//
//   { schema: 1, updated, heartbeat, paused, state (running|idle), idleSince, idleReason,
//     host: { load1, memUsedGb, memTotalGb, swapUsedMb, pressure (some avg10, %), cpus, budgetGb,
//             coresUsed, coresTotal (the running jobs' widths out of the core budget, D337 amended) },
//     running: [ { id, title, cpu, phase, started, elapsed (s), done, total, unit, ratePerHour, eta,
//                  workers, workersMax, cores (its width now), errors, paused, dataUpdated, pressureEvents: [{ at, kind, workers, pressure }],
//                  memGb, live: { <metric>: <number> }, cubes: [{ id, done, planned }] } ],
//     queue:    [ { id, title, cpu, est } ],
//     waiting:  [ { id, title, reason, est } ],
//     finished: [ { id, title, status, finished, headline, numbers: { <metric>: <number> } } ] }
//
// Every timestamp is ISO 8601 with an offset; lists hold at most 50 items.
//
// THE PUBLIC COPY is rebuilt field by field from an explicit allowlist
// (`sanitise`): job ids (J###), numbers, timestamps, and words from fixed sets
// (status, phase, reason, event kind).  A job's title and estimate are
// published ONLY when the job file opts in with `public_title:` (and
// `public_est:`), checked against PUBLIC_TEXT; otherwise the title is the id
// and the estimate is empty — a title may name a card, deck or cube.  Events
// that say whether Justin is at the table are dropped, and that wait reason
// reads "held".  Anything else — a path, a host name, a card, deck or cube's
// contents, a line of any log — has no field to travel in.  The headline is
// re-made from the numbers, never copied.

export const LIST_MAX = 50;
export const EVENTS_MAX = 20;

export interface PressureEvent { at: string; kind: 'drop' | 'raise' | 'pause' | 'resume' | 'stop' | 'playing' | 'play-ended'; workers: number | null; pressure: number }

export interface RunningJob extends Publicly {
  id: string;
  title: string;
  cpu: 'heavy' | 'light';
  phase: string;
  started: string | null;
  elapsed: number;
  done: number | null;
  total: number | null;
  unit: string | null;
  ratePerHour: number | null;
  eta: string | null;
  workers: number | null;
  workersMax: number | null;
  /** The job's width now: the cores it keeps busy (null: not known, someone else's job). */
  cores?: number | null;
  errors: number | null;
  paused: boolean;
  dataUpdated: string | null;
  pressureEvents: PressureEvent[];
  /** The job's unit's memory now (GB), as the backoff last read it. */
  memGb?: number | null;
  /** The job's current metric values (its `metrics:`, read every minute), headline keys first, plus `<counter>_per_h` rates. */
  live?: Record<string, number>;
  /** Which of `live`'s keys are the job's `headline:` metrics (names only), in its order. */
  liveHeadline?: string[];
  /** A cube-lab queue's per-cube progress (`cubes.<id>.done` / `.planned`). */
  cubes?: CubeProgress[];
  /** Private only: the job file opts its cube ids into the public copy (`public_cubes: yes`). */
  publicCubes?: boolean;
  /** Private only. */
  detail?: string;
}

export interface CubeProgress { id: string; done: number; planned: number }

export const LIVE_MAX = 40;
export const CUBES_MAX = 24;
const CUBE_KEY = /^(?:.+\.)?cubes\.([a-z0-9-]{1,40})\.(done|planned)$/;

/**
 * A running job's metrics, split: per-cube progress (from `cubes.<id>.done|planned` keys) and
 * every other NUMBER (booleans are dropped), the headline keys first, at most LIVE_MAX.
 */
export function liveOf(metrics: Record<string, number | boolean>, headline: string[] = []): { live: Record<string, number>; liveHeadline: string[]; cubes: CubeProgress[] } {
  const cubes = new Map<string, CubeProgress>();
  const rest: Array<[string, number]> = [];
  for (const [k, v] of Object.entries(metrics)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    const m = CUBE_KEY.exec(k);
    if (m) {
      const c = cubes.get(m[1] as string) ?? { id: m[1] as string, done: 0, planned: 0 };
      c[m[2] as 'done' | 'planned'] = v;
      cubes.set(c.id, c);
    } else rest.push([k, v]);
  }
  const rank = (k: string): number => { const i = headline.indexOf(k); return i < 0 ? headline.length : i; };
  rest.sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b));
  const live = Object.fromEntries(rest.slice(0, LIVE_MAX));
  return { live, liveHeadline: headline.filter((k) => k in live), cubes: [...cubes.values()].slice(0, CUBES_MAX) };
}

/** `publicTitle` / `publicEst`: the job file's opt-in public words (jobfile.ts); private copy only, read by `sanitise`. */
export interface Publicly { publicTitle?: string | null; publicEst?: string | null }
export interface QueueItem extends Publicly { id: string; title: string; cpu: 'heavy' | 'light'; est: string }
export interface WaitingItem extends Publicly { id: string; title: string; reason: string; est: string; detail?: string }
export interface FinishedItem extends Publicly { id: string; title: string; status: 'done' | 'failed' | 'skipped'; finished: string | null; headline: string; numbers: Record<string, number>; detail?: string }

export type RunState = 'running' | 'idle';

export interface StatusDoc {
  schema: 1;
  updated: string;
  /** When the runner's loop last ran (each tick, every 10 s): a quiet job's page still sees it alive. */
  heartbeat?: string;
  paused: boolean;
  /** Something runs (this runner's job or someone else's), or nothing does. */
  state?: RunState;
  /** Since when nothing has run (null while running). */
  idleSince?: string | null;
  /** Why nothing runs (idleReasonOf; null while running). */
  idleReason?: string | null;
  host: { load1: number; memUsedGb: number; memTotalGb: number; swapUsedMb: number; pressure: number; cpus: number; budgetGb: number; coresUsed?: number; coresTotal?: number };
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
export const METRIC = /^[a-z][a-z0-9_]{0,40}(\.[a-z0-9_]{1,40}){0,2}$/;
const PHASE = /^(prepare|pilot|commands|checks|collect|stopping)( \d{1,2}\/\d{1,2})?$/;
const UNITS = new Set(['games', 'drafts', 'lines', 'files', 'items', 'matches', 'answers']);
const STATUSES = new Set(['done', 'failed', 'skipped']);
/** Public event kinds: `playing` / `play-ended` say whether Justin is at the table, and are never published. */
const KINDS = new Set(['drop', 'raise', 'pause', 'resume', 'stop']);
/** A cube id the public copy may name (only when the job opts in): `fair-fight`, `omega`. */
const CUBE_ID = /^[a-z][a-z0-9-]{0,39}$/;
/** What an opted-in public title or estimate may contain: no `.`, `/`, `@`, `\`, quotes or brackets. */
export const PUBLIC_TEXT = /^[A-Za-z0-9 ,:;()+%~#&-]{1,80}$/;
/** The public words for why a job waits (schedule.ts's codes). */
export const REASONS: Record<string, string> = {
  after: 'waiting for an earlier job',
  'heavy-busy': 'after the running heavy job',
  'light-busy': 'after the running light job',
  cores: 'waiting for free cores',
  playing: 'held',
  paused: 'the runner is paused',
  'needs-check': 'pilot done; needs a check',
  memory: 'stopped for memory; will retry',
  invalid: 'the job file needs fixing',
  queued: 'queued',
};
const REASON_WORDS = new Set(Object.values(REASONS));

/** The idle reasons, private words; `sanitise` maps "Justin playing" to "held" (no presence in public). */
export const IDLE_WORDS = ['queue empty', 'paused', 'Justin playing', 'held', 'memory backoff', 'needs a check', 'job file needs fixing', 'waiting'] as const;
const IDLE_AFTER = /^blocked after J\d{3,5}$/;

/**
 * Why nothing runs, from the schedule's blocked list: the runner paused; Justin at the table;
 * a job held back for memory; a job blocked after an earlier one (named); a pilot waiting for a
 * check; a broken job file; else the queue is empty (or only waiting).
 */
export function idleReasonOf(blocked: Array<{ code: string; reason: string }>, paused: boolean): string {
  if (paused) return 'paused';
  if (!blocked.length) return 'queue empty';
  const has = (c: string) => blocked.find((b) => b.code === c);
  if (has('playing')) return 'Justin playing';
  if (has('paused')) return 'paused';
  if (has('memory')) return 'memory backoff';
  const after = has('after');
  const dep = after && /\b(J\d{3,5})\b/.exec(after.reason)?.[1];
  if (dep) return `blocked after ${dep}`;
  if (has('needs-check')) return 'needs a check';
  if (has('invalid')) return 'job file needs fixing';
  return 'waiting';
}

function publicIdleReason(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  if (v === 'Justin playing') return 'held';
  return (IDLE_WORDS as readonly string[]).includes(v) || IDLE_AFTER.test(v) ? v : 'waiting';
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null);
const iso = (v: unknown): string | null => (typeof v === 'string' && ISO.test(v) ? v : null);
const id = (v: unknown): string | null => (typeof v === 'string' && ID.test(v) ? v : null);
const pubTitle = (x: Publicly, fallback: string): string => (typeof x.publicTitle === 'string' && PUBLIC_TEXT.test(x.publicTitle) ? x.publicTitle : fallback);
const pubEst = (x: Publicly): string => (typeof x.publicEst === 'string' && PUBLIC_TEXT.test(x.publicEst) ? x.publicEst : '');

/** A `live` key that names a cube (`cubes.<id>.…`): cube ids go out only through `cubes`, opted in. */
const CUBE_SEGMENT = /(^|\.)cubes\./;

/** `live`: METRIC keys and finite numbers only, at most LIVE_MAX; never a per-cube key. */
function liveNumbers(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  for (const [k, x] of Object.entries(v as Record<string, unknown>).slice(0, LIVE_MAX)) {
    const n = num(x);
    if (METRIC.test(k) && !CUBE_SEGMENT.test(k) && n !== null) out[k] = n;
  }
  return out;
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
    const live = liveNumbers(r.live);
    return [{
      id: rid, title: pubTitle(r, rid), cpu: r.cpu === 'light' ? 'light' : 'heavy',
      phase: typeof r.phase === 'string' && PHASE.test(r.phase) ? r.phase : 'commands',
      started: iso(r.started), elapsed: num(r.elapsed) ?? 0,
      done: num(r.done), total: num(r.total), unit, ratePerHour: num(r.ratePerHour), eta: iso(r.eta),
      workers: num(r.workers), workersMax: num(r.workersMax), cores: num(r.cores), errors: num(r.errors), paused: r.paused === true,
      dataUpdated: iso(r.dataUpdated),
      memGb: num(r.memGb),
      live,
      liveHeadline: (Array.isArray(r.liveHeadline) ? r.liveHeadline : []).filter((k): k is string => typeof k === 'string' && k in live).slice(0, LIVE_MAX),
      cubes: (Array.isArray(r.cubes) ? r.cubes : []).slice(0, CUBES_MAX).flatMap((c, i): CubeProgress[] => {
        const done = num(c?.done), planned = num(c?.planned);
        if (done === null || planned === null) return [];
        const named = r.publicCubes === true && typeof c.id === 'string' && CUBE_ID.test(c.id);
        return [{ id: named ? c.id : `cube ${i + 1}`, done, planned }];
      }),
      pressureEvents: (Array.isArray(r.pressureEvents) ? r.pressureEvents : []).slice(-EVENTS_MAX).flatMap((e): PressureEvent[] => {
        const at = iso(e.at);
        if (!at || !KINDS.has(e.kind)) return [];
        return [{ at, kind: e.kind, workers: num(e.workers), pressure: num(e.pressure) ?? 0 }];
      }),
    }];
  });
  const queue = (Array.isArray(doc.queue) ? doc.queue : []).slice(0, LIST_MAX).flatMap((q): QueueItem[] => {
    const qid = id(q.id);
    return qid ? [{ id: qid, title: pubTitle(q, qid), cpu: q.cpu === 'light' ? 'light' : 'heavy', est: pubEst(q) }] : [];
  });
  const waiting = (Array.isArray(doc.waiting) ? doc.waiting : []).slice(0, LIST_MAX).flatMap((w): WaitingItem[] => {
    const wid = id(w.id);
    return wid ? [{ id: wid, title: pubTitle(w, wid), reason: REASON_WORDS.has(w.reason) ? w.reason : 'waiting', est: pubEst(w) }] : [];
  });
  const finished = (Array.isArray(doc.finished) ? doc.finished : []).slice(0, LIST_MAX).flatMap((f): FinishedItem[] => {
    const fid = id(f.id);
    if (!fid || !STATUSES.has(f.status)) return [];
    const n = numbers(f.numbers);
    return [{ id: fid, title: pubTitle(f, fid), status: f.status, finished: iso(f.finished), headline: headlineOf(n), numbers: n }];
  });
  const state: RunState = doc.state === 'idle' || doc.state === 'running' ? doc.state : running.length ? 'running' : 'idle';
  return {
    schema: 1,
    updated: iso(doc.updated) ?? '',
    heartbeat: iso(doc.heartbeat) ?? iso(doc.updated) ?? '',
    paused: doc.paused === true,
    state,
    idleSince: state === 'idle' ? iso(doc.idleSince) : null,
    idleReason: state === 'idle' ? publicIdleReason(doc.idleReason) : null,
    host: {
      load1: num(h.load1) ?? 0, memUsedGb: num(h.memUsedGb) ?? 0, memTotalGb: num(h.memTotalGb) ?? 0,
      swapUsedMb: num(h.swapUsedMb) ?? 0, pressure: num(h.pressure) ?? 0, cpus: num(h.cpus) ?? 0, budgetGb: num(h.budgetGb) ?? 0,
      coresUsed: num(h.coresUsed) ?? 0, coresTotal: num(h.coresTotal) ?? 0,
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
