// mtg-table — the lab runner: the pc-jobs job file, parsed (D337).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A job file is `jobs/J###-name.md` on the pc-jobs branch.  The format is the
// README's (tools/runner/PC-JOBS-README.md is the text Justin publishes), and
// this parser reads every older job file too: the machine-readable lines are
// additions, and a file without them still parses.
//
//   id: J003                         header lines, before the first `##`
//   title: ...
//   cpu: heavy | light
//   after: J001, J002
//   repos: mtg-table@ee4d127, ForgeCoach@main
//   est: ~3 h
//   resumable: yes | no              NEW: a stopped run may be started again and continues
//   max_workers: 7                   NEW: the most workers the job may use ({workers} never exceeds it)
//   mem_per_worker_gb: 1.5           NEW: a floor for the pilot's measured peak per worker
//   progress: aibench var/ai-bench/night-* of 2000      NEW: how done / total is counted
//   metrics: [name =] <extractor> <args> | sh: <command>  NEW: the job's metrics (aborts, final checks)
//   headline: games, control.a_win_rate                   NEW: the numbers the progress page shows when done
//   clean: var/ai-bench/night-*      NEW: moved aside (never deleted) before a non-resumable job restarts
//   timeout: 8h                      NEW: a step running longer is stopped and the job fails
//
//   ## Pilot      fenced bash blocks run in order; `metrics:` and `check:` lines; `progress:`
//   ## Commands   fenced bash blocks; `metrics:`, `check:` (final checks), `progress:`
//   ## Abort if   `abort:` lines (checked every minute while the job runs) and prose for people
//   ## Report     prose for the PC session; `collect: <glob>` lines copy files into results/<id>/
//
// The text of every section stays with the job, so a person still reads it.

export type Cpu = 'heavy' | 'light';

export interface RepoRef { repo: string; ref: string }

export interface MetricSpec {
  /** The namespace: `control = aibench ...` puts `control.games`; a number goes under exactly this name. */
  name: string | null;
  /** `sh` runs a shell command; anything else is a built-in extractor (metrics.ts). */
  kind: string;
  args: string[];
  /** The command line for `sh`. */
  command?: string;
  line: string;
}

export interface ProgressSpec {
  kind: string;
  args: string[];
  total: number | null;
  line: string;
}

export interface Section {
  /** The fenced code blocks (bash), in order. */
  blocks: string[];
  checks: string[];
  metrics: MetricSpec[];
  progress: ProgressSpec | null;
  text: string;
}

export interface JobFile {
  id: string;
  file: string;
  title: string;
  cpu: Cpu;
  after: string[];
  repos: RepoRef[];
  est: string;
  resumable: boolean;
  maxWorkers: number | null;
  memPerWorkerGb: number | null;
  progress: ProgressSpec | null;
  metrics: MetricSpec[];
  headline: string[];
  clean: string[];
  timeoutSec: number | null;
  pilot: Section | null;
  commands: Section | null;
  aborts: string[];
  collect: string[];
  /** Every header key as written, the old ones included. */
  header: Record<string, string>;
  /** Problems the runner refuses the job for (an unparsable check, a bad key). */
  errors: string[];
  /** True when the pilot carries `check:` lines: the runner may go past it on its own. */
  machineChecked: boolean;
}

const KNOWN_REPOS = ['mtg-table', 'ForgeCoach'];

export function parseDuration(s: string): number | null {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(s|m|min|h|d)?\s*$/i.exec(s);
  if (!m) return null;
  const n = Number(m[1]);
  const u = (m[2] ?? 's').toLowerCase();
  return Math.round(n * (u === 'd' ? 86400 : u === 'h' ? 3600 : u === 'm' || u === 'min' ? 60 : 1));
}

/** `repos: mtg-table@ee4d127 (pinned; see below), ForgeCoach@main` -> the first ref of each known repo. */
export function parseRepos(s: string): RepoRef[] {
  const out: RepoRef[] = [];
  for (const m of s.matchAll(/\b(mtg-table|ForgeCoach)@([A-Za-z0-9._/-]+)/g)) {
    const repo = m[1] as string;
    if (!out.some((r) => r.repo === repo)) out.push({ repo, ref: (m[2] as string).replace(/[.,]+$/, '') });
  }
  return out;
}

/** Split a line into words, honouring "double quotes". */
export function words(s: string): string[] {
  const out: string[] = [];
  for (const m of s.matchAll(/"((?:[^"\\]|\\.)*)"|(\S+)/g)) out.push(m[1] !== undefined ? m[1].replace(/\\(.)/g, '$1') : (m[2] as string));
  return out;
}

export function parseMetric(line: string): MetricSpec {
  let rest = line.trim();
  let name: string | null = null;
  const named = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(rest);
  if (named) { name = named[1] as string; rest = named[2] as string; }
  const sh = /^sh:\s*(.+)$/.exec(rest);
  if (sh) return { name, kind: 'sh', args: [], command: sh[1] as string, line };
  const w = words(rest);
  if (!w.length) throw new Error(`an empty metrics line`);
  return { name, kind: w[0] as string, args: w.slice(1), line };
}

export function parseProgress(line: string): ProgressSpec {
  const m = /^(.*?)(?:\s+of\s+(\d+))?\s*$/.exec(line.trim());
  const w = words((m?.[1] ?? '').trim());
  if (!w.length) throw new Error('an empty progress line');
  return { kind: w[0] as string, args: w.slice(1), total: m?.[2] ? Number(m[2]) : null, line };
}

function emptySection(): Section {
  return { blocks: [], checks: [], metrics: [], progress: null, text: '' };
}

const yes = (s: string | undefined): boolean => /^(yes|true|1)$/i.test((s ?? '').trim());

/**
 * Parse one job file.  `checkParse` validates `check:` / `abort:` lines (expr.ts's parse);
 * it is injected so this module has no other import.
 */
export function parseJobFile(file: string, text: string, checkParse: (src: string) => unknown = () => undefined): JobFile {
  const errors: string[] = [];
  const header: Record<string, string> = {};
  const sections = new Map<string, Section>();
  let cur: Section | null = null;
  let curName = '';
  let inFence = false;
  let fence: string[] = [];
  const headerMetrics: MetricSpec[] = [];
  let headerProgress: ProgressSpec | null = null;
  const aborts: string[] = [];
  const collect: string[] = [];

  const machine = (key: string, val: string, where: Section | null): boolean => {
    try {
      if (key === 'check' && where) { checkParse(val); where.checks.push(val); return true; }
      if (key === 'abort') { checkParse(val); aborts.push(val); return true; }
      if (key === 'metrics') { (where ? where.metrics : headerMetrics).push(parseMetric(val)); return true; }
      if (key === 'progress') { const p = parseProgress(val); if (where) where.progress = p; else headerProgress = p; return true; }
      if (key === 'collect') { collect.push(val.trim()); return true; }
    } catch (e) {
      errors.push(`${key}: ${val} -- ${(e as Error).message}`);
      return true;
    }
    return false;
  };

  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (cur && /^\s*```/.test(line)) {
      if (inFence) { cur.blocks.push(fence.join('\n')); fence = []; inFence = false; } else { inFence = true; fence = []; }
      continue;
    }
    if (inFence) { fence.push(line); continue; }
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h) {
      curName = (h[1] as string).toLowerCase();
      cur = sections.get(curName) ?? emptySection();
      sections.set(curName, cur);
      continue;
    }
    const kv = /^\s*(?:[-*]\s+)?([a-z_]+):\s*(.*?)\s*$/.exec(line);
    if (!cur) {
      if (kv && !header[kv[1] as string]) {
        const key = kv[1] as string, val = kv[2] as string;
        if (machine(key, val, null)) continue;
        header[key] = val;
      }
      continue;
    }
    if (kv && ['check', 'abort', 'metrics', 'progress', 'collect'].includes(kv[1] as string)) {
      machine(kv[1] as string, kv[2] as string, curName.startsWith('abort') || curName.startsWith('report') ? null : cur);
      continue;
    }
    cur.text += `${line}\n`;
  }
  if (inFence && cur) { cur.blocks.push(fence.join('\n')); errors.push('a code block is never closed'); }

  const id = header.id ?? (/\b(J\d{3,})/.exec(file)?.[1] ?? '');
  if (!/^J\d{3,}$/.test(id)) errors.push(`id: "${id}" is not J followed by three digits`);
  const cpu = (header.cpu ?? 'heavy').trim().toLowerCase();
  if (cpu !== 'heavy' && cpu !== 'light') errors.push(`cpu: "${header.cpu}" is not heavy or light`);
  const intOf = (k: string): number | null => {
    if (header[k] === undefined) return null;
    const n = Number(header[k]);
    if (!Number.isFinite(n) || n <= 0) { errors.push(`${k}: "${header[k]}" is not a positive number`); return null; }
    return n;
  };
  const maxWorkers = intOf('max_workers');
  const timeoutSec = header.timeout !== undefined ? parseDuration(header.timeout) : null;
  if (header.timeout !== undefined && timeoutSec === null) errors.push(`timeout: "${header.timeout}" is not a duration (90m, 8h)`);
  if (header.resumable !== undefined && !/^(yes|no|true|false)$/i.test(header.resumable.trim())) errors.push(`resumable: "${header.resumable}" is not yes or no`);
  const clean = (header.clean ?? '').split(/[,\s]+/).filter(Boolean);
  for (const c of clean) if (!/^var\/[^\s]+$/.test(c) || c.includes('..')) errors.push(`clean: "${c}" is not a path under var/`);

  const pilot = sections.get('pilot') ?? null;
  const commands = sections.get('commands') ?? null;
  const repos = parseRepos(header.repos ?? '');
  if (!repos.length && (pilot?.blocks.length || commands?.blocks.length)) errors.push(`repos: names neither ${KNOWN_REPOS.join(' nor ')}`);
  return {
    id,
    file,
    title: header.title ?? id,
    cpu: cpu === 'light' ? 'light' : 'heavy',
    after: (header.after ?? '').split(/[,\s]+/).filter((x) => /^J\d+$/.test(x)),
    repos,
    est: header.est ?? '',
    resumable: yes(header.resumable),
    maxWorkers: maxWorkers === null ? null : Math.floor(maxWorkers),
    memPerWorkerGb: intOf('mem_per_worker_gb'),
    progress: commands?.progress ?? headerProgress,
    metrics: headerMetrics,
    headline: (header.headline ?? '').split(/[,\s]+/).filter(Boolean),
    clean,
    timeoutSec,
    pilot,
    commands,
    aborts,
    collect,
    header,
    errors,
    machineChecked: !!pilot && pilot.checks.length > 0,
  };
}
