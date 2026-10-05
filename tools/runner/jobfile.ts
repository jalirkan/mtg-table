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
//   cores: 1                         NEW: the job's WIDTH, the cores it keeps busy (default: its workers);
//                                    a narrow heavy job lets the runner start the next job beside it
//   pilot_cores: 2                   NEW: the width while the job is in ## Pilot (default: the job's width);
//   prepare_cores: 1                 NEW: and while it is in prepare. A narrow step lets another job start
//                                    beside it; the main step then waits for its full width (D365)
//   mem_per_worker_gb: 1.5           NEW: a floor for the pilot's measured peak per worker
//   progress: aibench var/ai-bench/night-* of 2000      NEW: how done / total is counted
//   metrics: [name =] <extractor> <args> | sh: <command>  NEW: the job's metrics (aborts, final checks)
//   headline: games, control.a_win_rate                   NEW: the numbers the progress page shows when done
//   clean: var/ai-bench/night-*      NEW: moved aside (never deleted) before a non-resumable job restarts from run1
//   timeout: 8h                      NEW: a step running longer is stopped and the job fails
//   control: yes | no                NEW: the job's tools read the pool control file (default: detected)
//   public_title: Search AI bench    NEW: the title the PUBLIC status page may show (else the id only)
//   public_est: ~3 h                 NEW: the estimate it may show (letters, digits, space , : ; ( ) + % ~ # & - only)
//   public_cubes: yes                NEW: the public page may name the cube ids in its per-cube progress (else "cube 1", ...)
//   public_decides: Keep night 4 allocation     NEW (D384): the decision the PUBLIC ledger.json may show (PUBLIC_TEXT,
//                                    as public_title; else null there); the private `decides:` is never published
//   decides: promote evaluator v1 (gate 2)   NEW (D366): the decision this job informs (the ledger, ledger.ts)
//   hypothesis: ...                  NEW (D366): what we expect, and why
//   rule: D354 gate 2 (gates.py REGRET_RULE) NEW (D366): the pre-registered pass/fail rule, or a pointer to it
//   followup: jobs/J062-x.md, morning-read   NEW (D366): what to post when this job is done (a pc-jobs file or a template name)
//
//   ## Pilot      fenced bash blocks run in order; `metrics:` and `check:` lines; `progress:`
//   ## Commands   fenced bash blocks; `metrics:`, `check:` (final checks), `progress:`;
//                 a `cores: N` line sets the width of the NEXT block only (a single-process
//                 step of a wide job: `cores: 1`; {workers} in that block is at most N), a
//                 `mem_gb: G` line the memory it reserves (default: width × per-worker peak), and
//                 a `clean: <paths under var/>` line what that block makes: moved aside before
//                 a non-resumable retry runs the block again (D365; the header's clean: then
//                 applies only to a retry from run1)
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
  /** Each block's own `cores:` (the line before it), or null: the job's width. */
  blockCores: Array<number | null>;
  /** Each block's own `mem_gb:` (its whole reservation), or null: width × per-worker peak. */
  blockMemGb: Array<number | null>;
  /** Each block's own `clean:` paths (`## Commands` only): moved aside before a retry runs that block again (D365). */
  blockClean: string[][];
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
  /** `cores:`: the job's width (cores it keeps busy), or null: its workers. */
  cores: number | null;
  /** `pilot_cores:`: the width while the job is in its pilot (a pilot block's own `cores:` wins), or null: the job's width (D365). */
  pilotCores: number | null;
  /** `prepare_cores:`: the width while the job is in prepare, or null: the job's width (D365). */
  prepareCores: number | null;
  memPerWorkerGb: number | null;
  progress: ProgressSpec | null;
  metrics: MetricSpec[];
  headline: string[];
  clean: string[];
  timeoutSec: number | null;
  /** The public copy's title and estimate, opted in; null: the id only. */
  publicTitle: string | null;
  publicEst: string | null;
  /** `public_decides:` (D384): the decision the public ledger.json may show; null: none. */
  publicDecides: string | null;
  /** `public_cubes: yes`: the cube ids may appear in the public per-cube progress. */
  publicCubes: boolean;
  /** `control:` as written: true / false, or null (the runner detects it after prepare). */
  control: boolean | null;
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
  /** The decision ledger's lines (D366): `decides:`, `hypothesis:`, `rule:`, `followup:`; each optional. */
  ledger: LedgerHeaders;
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
  return { blocks: [], blockCores: [], blockMemGb: [], blockClean: [], checks: [], metrics: [], progress: null, text: '' };
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
  /** A section's `cores:` line waiting for its block. */
  let nextCores: number | null = null;
  let nextMem: number | null = null;
  let nextClean: string[] | null = null;
  const cleanOf = (v: string, where: string): string[] => {
    const out = v.split(/[,\s]+/).filter(Boolean);
    for (const c of out) if (!/^var\/[^\s]+$/.test(c) || c.includes('..')) errors.push(`${where}clean: "${c}" is not a path under var/`);
    return out;
  };
  const closeBlock = (sec: Section): void => {
    sec.blocks.push(fence.join('\n')); sec.blockCores.push(nextCores); sec.blockMemGb.push(nextMem); sec.blockClean.push(nextClean ?? []);
    nextCores = null; nextMem = null; nextClean = null;
  };
  const coresOf = (v: string, where: string): number | null => {
    const n = Number(v.trim());
    if (!Number.isInteger(n) || n <= 0) { errors.push(`${where}cores: "${v}" is not a positive whole number`); return null; }
    return n;
  };

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
      if (inFence) { closeBlock(cur); fence = []; inFence = false; } else { inFence = true; fence = []; }
      continue;
    }
    if (inFence) { fence.push(line); continue; }
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h) {
      if (nextCores !== null || nextMem !== null || nextClean !== null) errors.push(`## ${curName}: a cores:, mem_gb: or clean: line with no block after it`);
      nextCores = null;
      nextMem = null;
      nextClean = null;
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
    if (kv && kv[1] === 'cores' && (curName === 'pilot' || curName === 'commands')) {
      nextCores = coresOf(kv[2] as string, `## ${curName}: `);
      continue;
    }
    if (kv && kv[1] === 'mem_gb' && (curName === 'pilot' || curName === 'commands')) {
      const g = Number((kv[2] as string).trim());
      if (!Number.isFinite(g) || g <= 0) errors.push(`## ${curName}: mem_gb: "${kv[2]}" is not a positive number`);
      else nextMem = g;
      continue;
    }
    if (kv && kv[1] === 'clean' && curName === 'commands') {
      nextClean = [...(nextClean ?? []), ...cleanOf(kv[2] as string, '## commands: ')];
      continue;
    }
    if (kv && kv[1] === 'clean' && curName === 'pilot') {
      errors.push('## pilot: a clean: line before a block belongs in ## Commands (a retry never runs a passed pilot again)');
      continue;
    }
    if (kv && ['check', 'abort', 'metrics', 'progress', 'collect'].includes(kv[1] as string)) {
      machine(kv[1] as string, kv[2] as string, curName.startsWith('abort') || curName.startsWith('report') ? null : cur);
      continue;
    }
    cur.text += `${line}\n`;
  }
  if (inFence && cur) { closeBlock(cur); errors.push('a code block is never closed'); }
  if (nextCores !== null || nextMem !== null || nextClean !== null) errors.push(`## ${curName}: a cores:, mem_gb: or clean: line with no block after it`);

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
  const cores = header.cores !== undefined ? coresOf(header.cores, '') : null;
  const pilotCores = header.pilot_cores !== undefined ? coresOf(header.pilot_cores, 'pilot_') : null;
  const prepareCores = header.prepare_cores !== undefined ? coresOf(header.prepare_cores, 'prepare_') : null;
  const timeoutSec = header.timeout !== undefined ? parseDuration(header.timeout) : null;
  if (header.timeout !== undefined && timeoutSec === null) errors.push(`timeout: "${header.timeout}" is not a duration (90m, 8h)`);
  if (header.resumable !== undefined && !/^(yes|no|true|false)$/i.test(header.resumable.trim())) errors.push(`resumable: "${header.resumable}" is not yes or no`);
  const clean = header.clean !== undefined ? cleanOf(header.clean, '') : [];

  const PUBLIC_TEXT = /^[A-Za-z0-9 ,:;()+%~#&-]{1,80}$/;     // statusjson.ts's; no . / @ \ quotes or brackets
  for (const k of ['public_title', 'public_est', 'public_decides']) {
    if (header[k] !== undefined && !PUBLIC_TEXT.test(header[k] as string)) errors.push(`${k}: "${header[k]}" may hold only letters, digits, spaces and , : ; ( ) + % ~ # & - (80 at most)`);
  }
  if (header.public_cubes !== undefined && !/^(yes|no)$/i.test(header.public_cubes.trim())) errors.push(`public_cubes: "${header.public_cubes}" is not yes or no`);
  if (header.control !== undefined && !/^(yes|no)$/i.test(header.control.trim())) errors.push(`control: "${header.control}" is not yes or no`);
  const pilot = sections.get('pilot') ?? null;
  const commands = sections.get('commands') ?? null;
  const repos = parseRepos(header.repos ?? '');
  if (!repos.length && (pilot?.blocks.length || commands?.blocks.length)) errors.push(`repos: names neither ${KNOWN_REPOS.join(' nor ')}`);
  const { errors: ledgerErrors, ...ledger } = parseLedgerHeaders(header, id);
  errors.push(...ledgerErrors);
  return {
    ledger,
    id,
    file,
    title: header.title ?? id,
    cpu: cpu === 'light' ? 'light' : 'heavy',
    after: (header.after ?? '').split(/[,\s]+/).filter((x) => /^J\d+$/.test(x)),
    repos,
    est: header.est ?? '',
    resumable: yes(header.resumable),
    maxWorkers: maxWorkers === null ? null : Math.floor(maxWorkers),
    cores,
    pilotCores,
    prepareCores,
    memPerWorkerGb: intOf('mem_per_worker_gb'),
    progress: commands?.progress ?? headerProgress,
    metrics: headerMetrics,
    headline: (header.headline ?? '').split(/[,\s]+/).filter(Boolean),
    clean,
    timeoutSec,
    publicTitle: header.public_title !== undefined && PUBLIC_TEXT.test(header.public_title) ? header.public_title : null,
    publicEst: header.public_est !== undefined && PUBLIC_TEXT.test(header.public_est) ? header.public_est : null,
    publicDecides: header.public_decides !== undefined && PUBLIC_TEXT.test(header.public_decides) ? header.public_decides : null,
    publicCubes: /^yes$/i.test((header.public_cubes ?? '').trim()),
    control: header.control === undefined ? null : /^yes$/i.test(header.control.trim()),
    pilot,
    commands,
    aborts,
    collect,
    header,
    errors,
    machineChecked: !!pilot && pilot.checks.length > 0,
  };
}

// ------------------------------------------------------------------ the decision ledger (D366)

export type Followup =
  | { kind: 'job'; path: string; id: string }
  | { kind: 'template'; name: string };

export interface LedgerHeaders {
  decides: string | null;
  hypothesis: string | null;
  rule: string | null;
  followups: Followup[];
}

/** A follow-up job file: a path under jobs/ on pc-jobs, `jobs/J###-name.md`. */
const FOLLOWUP_JOB = /^jobs\/(J\d{3,})[A-Za-z0-9._-]*\.md$/;
/** A named template the cloud session turns into a job: letters, digits, `.`, `_`, `-`; no slash, not a `.md` file. */
const FOLLOWUP_TEMPLATE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/** The ledger's header lines from a job file's header map (as parseJobFile keeps it), and the problems with them. */
export function parseLedgerHeaders(header: Record<string, string>, ownId: string): LedgerHeaders & { errors: string[] } {
  const errors: string[] = [];
  const text = (k: string): string | null => {
    const v = (header[k] ?? '').trim();
    return v ? v : null;
  };
  const followups: Followup[] = [];
  for (const raw of (header.followup ?? '').split(',').map((x) => x.trim()).filter(Boolean)) {
    const job = FOLLOWUP_JOB.exec(raw);
    if (job) {
      if (job[1] === ownId) errors.push(`followup: "${raw}" is this job itself`);
      else followups.push({ kind: 'job', path: raw, id: job[1] as string });
    } else if (FOLLOWUP_TEMPLATE.test(raw) && !/\.md$/i.test(raw)) {
      followups.push({ kind: 'template', name: raw });
    } else {
      errors.push(`followup: "${raw}" is neither a job file (jobs/J###-name.md) nor a template name (letters, digits, . _ -)`);
    }
  }
  return { decides: text('decides'), hypothesis: text('hypothesis'), rule: text('rule'), followups, errors };
}
