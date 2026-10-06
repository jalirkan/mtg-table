// mtg-table — the lab runner: metrics from the lab's own output files (D337).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A `metrics:` line names an EXTRACTOR and its paths (relative to the job's
// mtg-table checkout, or its first repo's), or `sh:` and a command whose
// stdout is a JSON object or a number.  The extractors read files only — they
// never start the engine — and give FACTS, flat numbers with snake_case names:
//
//   aibench <dir|glob>...     ai-bench run folders (shard-*.jsonl; shard-*.log for copier errors)
//   cubelab <dir|glob>...     cube-lab run folders (drafts.jsonl, run.json), nested folders included
//   cubelab-queue <root> [night N]   the overnight queue (tools/cubelab.sh queue): its night plans and run folders,
//                             per cube (`cubes.<id>.done`, `cubes.<id>.planned`) and the bridge share
//   evolve <dir>              a cube-lab evolve folder (evolve.json, gen-*/run/drafts.jsonl)
//   coachbench <file|glob>    a ForgeCoach coach-bench result .json (the newest match of a glob)
//   ladder <dir>              the AI ladder's results/*.jsonl
//   lines <glob>...           complete lines in the files (a number)
//   files <glob>...           how many files match (a number)
//   count <glob> "<text>"     lines containing the text (a number); {logs} is this job's own step logs
//
// Every reader takes complete lines only: a file being appended to, or one a
// killed process left with a torn last line, is read up to its last newline.
// Every metric is a number or a boolean; `progress:` reuses the same readers
// for done (and, where a file says it, total).

import fs from 'node:fs';
import path from 'node:path';

export type Flat = Record<string, number | boolean>;

/** `*` and `?` inside one path segment (`[` and `]` are literal); no `**`.  Sorted, existing paths only. */
export function expandGlob(cwd: string, pattern: string): string[] {
  const abs = path.isAbsolute(pattern);
  const parts = pattern.split('/').filter((p, i) => p !== '' || i === 0);
  let cur = [abs ? '/' : cwd];
  for (const part of parts) {
    if (part === '') continue;
    const next: string[] = [];
    if (!/[*?]/.test(part)) {
      for (const c of cur) { const p = path.join(c, part); if (fs.existsSync(p)) next.push(p); }
    } else {
      // Only * and ? are wild; everything else, [ and ] included, is literal.
      const re = new RegExp(`^${part.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]')}$`);
      for (const c of cur) {
        let ents: string[] = [];
        try { ents = fs.readdirSync(c); } catch { continue; }
        for (const e of ents.sort()) if (re.test(e) && !e.startsWith('.')) next.push(path.join(c, e));
      }
    }
    cur = next;
  }
  return cur.sort();
}

/** Bytes a line reader asks for at a time: memory stays at this plus the longest line, whatever the file's size. */
export const CHUNK_BYTES = 1 << 20;

/**
 * Call `onLine` with each complete, non-blank line of `file` from byte `from` up to `to`
 * (default: its size now), reading CHUNK_BYTES at a time; a line is decoded only once its
 * newline is in, so a UTF-8 character split across two reads is whole.  Returns the offset
 * just past the last newline read (`from` if none), where the next read starts: a torn last
 * line is left for later.  Synchronous, like the runner's tick.
 */
export function eachCompleteLine(file: string, onLine: (line: string) => void, from = 0, to?: number): number {
  let fd: number;
  try { fd = fs.openSync(file, 'r'); } catch { return from; }
  try {
    const end = to ?? fs.fstatSync(fd).size;
    const buf = Buffer.allocUnsafe(CHUNK_BYTES);
    let pos = from, consumed = from;
    let carry: Buffer[] = [];
    while (pos < end) {
      const n = fs.readSync(fd, buf, 0, Math.min(CHUNK_BYTES, end - pos), pos);
      if (n <= 0) break;
      pos += n;
      let start = 0;
      for (let nl = buf.indexOf(0x0a, 0); nl >= 0 && nl < n; nl = buf.indexOf(0x0a, start)) {
        const piece = buf.subarray(start, nl);
        const line = (carry.length ? Buffer.concat([...carry, piece]) : piece).toString('utf8');
        carry = [];
        consumed = pos - n + nl + 1;
        start = nl + 1;
        if (line.trim() !== '') onLine(line);
      }
      if (start < n) carry.push(Buffer.from(buf.subarray(start, n)));
    }
    return consumed;
  } finally {
    fs.closeSync(fd);
  }
}

/** The complete lines of a file (up to its last newline).  Holds them all: for small files and tests; the extractors stream. */
export function completeLines(file: string): string[] {
  const out: string[] = [];
  eachCompleteLine(file, (l) => out.push(l));
  return out;
}

function eachJsonLine(file: string, onRow: (row: Record<string, unknown>) => void): void {
  eachCompleteLine(file, (l) => {
    let row: unknown;
    try { row = JSON.parse(l); } catch { return; /* a line we cannot read is not a game */ }
    onRow(row as Record<string, unknown>);
  });
}

const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
};
const r4 = (x: number): number => Math.round(x * 10000) / 10000;
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const numOr = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);

function dirsOf(cwd: string, args: string[]): string[] {
  return args.flatMap((a) => expandGlob(cwd, a)).filter((d) => { try { return fs.statSync(d).isDirectory(); } catch { return false; } });
}

// ---------------------------------------------------------------- ai-bench

/** ai-bench run folders: shard-*.jsonl lines (AiBench.java's play), copier errors from shard-*.log.  Streamed: a game is a few numbers. */
export function aibench(cwd: string, args: string[]): Flat {
  let copier = 0;
  let n = 0, aw = 0, bw = 0, yes = 0, no = 0, errors = 0, timeouts = 0, msSum = 0, msMax = -Infinity, turns = 0, evalTimeouts = 0;
  let fallback = 0, considered = 0;
  const ms: number[] = [];
  const dirs = dirsOf(cwd, args);
  for (const d of dirs) {
    for (const f of expandGlob(d, 'shard-*.jsonl')) {
      eachJsonLine(f, (g) => {
        if (g === null) return; // not a game, and the old reader threw on it
        n++;
        const m = numOr(g.ms);
        ms.push(m);
        msSum += m;
        if (m > msMax) msMax = m;
        if (g.winner === 'A') aw++;
        else if (g.winner === 'B') bw++;
        if (g.focusWon === 'yes') yes++;
        else if (g.focusWon === 'no') no++;
        if (typeof g.error === 'string' && g.error !== '') errors++;
        if (g.timeout === true) timeouts++;
        turns += numOr(g.turns);
        evalTimeouts += numOr(g.aiEvalTimeouts);
        for (const side of ['aStats', 'bStats']) {
          const counts = ((g[side] as Record<string, unknown> | undefined)?.counts ?? {}) as Record<string, unknown>;
          fallback += numOr(counts['search.fallback.budget']);
          for (const k of ['search.a.considered', 'search.b.considered', 'search.p.considered']) considered += numOr(counts[k]);
        }
      });
    }
    for (const f of expandGlob(d, 'shard-*.log')) eachCompleteLine(f, (l) => { if (l.includes("Couldn't map")) copier++; });
  }
  const out: Flat = {
    runs: dirs.length,
    games: n,
    a_wins: aw,
    b_wins: bw,
    draws: n - aw - bw,
    a_win_rate: aw + bw ? r4(aw / (aw + bw)) : 0,
    focus_win_rate: yes + no ? r4(yes / (yes + no)) : 0,
    errors,
    timeouts,
    error_rate: n ? r4((errors + timeouts) / n) : 0,
    copier_errors: copier,
    mean_game_s: n ? r4(msSum / n / 1000) : 0,
    median_game_s: r4(median(ms) / 1000),
    max_game_s: n ? r4(msMax / 1000) : 0,
    mean_turns: n ? r4(turns / n) : 0,
    ai_eval_timeouts: evalTimeouts,
    searched_decisions: considered,
  };
  if (considered > 0) out.fallback_rate = r4(fallback / considered);
  return out;
}

// ---------------------------------------------------------------- cube lab

interface GameRow { ms?: number; turns?: number; cpuMs?: number; timeout?: boolean; error?: string | null; winner?: string; recorded?: { bytes?: number; errors?: number } }
interface DraftLine { seed?: number; bridge?: unknown; match?: { games?: GameRow[]; engineError?: string } }

/**
 * What the extractors need from one drafts.jsonl, and nothing else: counts, the draft seeds,
 * and a few numbers per game (kept per game, in file order, so every sum, mean and median is
 * computed exactly as it was from the parsed lines).  A real line is ~16 KB of picks and
 * decks; this is ~50 bytes a game.
 */
export interface DraftStats {
  drafts: number;
  /** Drafts whose match ended in an engineError. */
  engineErrorDrafts: number;
  bridgeDrafts: number;
  seeds: Set<unknown>;
  /** Per game, in file order. */
  ms: number[];
  turns: number[];
  cpuMs: number[];
  gameErrors: number;
  timeouts: number;
  draws: number;
  /** Per recorded game, in file order. */
  recBytes: number[];
  recErrors: number[];
}

const emptyStats = (): DraftStats => ({ drafts: 0, engineErrorDrafts: 0, bridgeDrafts: 0, seeds: new Set(), ms: [], turns: [], cpuMs: [], gameErrors: 0, timeouts: 0, draws: 0, recBytes: [], recErrors: [] });

function addDraft(st: DraftStats, d: DraftLine): void {
  st.drafts++;
  st.seeds.add(d.seed);
  if (d.match?.engineError) st.engineErrorDrafts++;
  if (d.bridge) st.bridgeDrafts++;
  const games = d.match?.games;
  for (const g of Array.isArray(games) ? games : []) {
    if (g === null || typeof g !== 'object') continue;
    st.ms.push(numOr(g.ms));
    st.turns.push(numOr(g.turns));
    st.cpuMs.push(numOr(g.cpuMs));
    if (g.error) st.gameErrors++;
    if (g.timeout) st.timeouts++;
    if (g.winner === 'draw') st.draws++;
    if (g.recorded) {
      st.recBytes.push(numOr(g.recorded.bytes));
      st.recErrors.push(numOr(g.recorded.errors));
    }
  }
}

/**
 * drafts.jsonl grows all night: each file is read INCREMENTALLY, from the end of its last
 * complete line read before, CHUNK_BYTES at a time, and memoised by size and mtime.  Each
 * line is parsed and dropped at once; only its DraftStats survive, so memory follows the
 * games, not the bytes.  A file that shrank or was replaced (its size below the offset, a
 * different inode, or rewritten at the same size) is read again from the top.  The runner
 * calls this on its minute metrics tick only (D337, amended for J059's heap).
 */
const draftCache = new Map<string, { ino: number; offset: number; size: number; mtimeMs: number; stats: DraftStats }>();

export function draftStats(file: string): DraftStats {
  let st: fs.Stats;
  try { st = fs.statSync(file); } catch { draftCache.delete(file); return emptyStats(); }
  let c = draftCache.get(file);
  if (c && c.ino === st.ino && c.size === st.size && c.mtimeMs === st.mtimeMs) return c.stats;
  if (!c || c.ino !== st.ino || st.size < c.offset || (st.size === c.size && st.mtimeMs !== c.mtimeMs)) c = { ino: st.ino, offset: 0, size: 0, mtimeMs: 0, stats: emptyStats() };
  const stats = c.stats;
  c.offset = eachCompleteLine(file, (l) => {
    let d: DraftLine;
    try { d = JSON.parse(l) as DraftLine; } catch { return; /* a line we cannot read is not a draft */ }
    if (d === null) return; // not a draft, and the old reader threw on it
    addDraft(stats, d);
  }, c.offset, st.size);
  c.size = st.size;
  c.mtimeMs = st.mtimeMs;
  draftCache.set(file, c);
  return stats;
}

function draftFiles(cwd: string, args: string[]): string[] {
  const out: string[] = [];
  const walk = (d: string, depth: number): void => {
    const f = path.join(d, 'drafts.jsonl');
    if (fs.existsSync(f)) out.push(f);
    if (depth >= 4) return;
    let ents: fs.Dirent[] = [];
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) if (e.isDirectory() && !['games', 'decks', 'logs', 'frames', 'homes'].includes(e.name) && !e.name.startsWith('.')) walk(path.join(d, e.name), depth + 1);
  };
  for (const d of dirsOf(cwd, args)) walk(d, 0);
  return [...new Set(out)].sort();
}

export function cubelabOf(files: string[]): Flat {
  const all = files.map((f) => draftStats(f));
  const drafts = sum(all.map((x) => x.drafts));
  const engineErrorDrafts = sum(all.map((x) => x.engineErrorDrafts));
  // Left folds over every game in file order, as the old flatMap-then-sum did.
  const fold = (pick: (x: DraftStats) => number[]): number => { let t = 0; for (const x of all) for (const v of pick(x)) t += v; return t; };
  const games = sum(all.map((x) => x.ms.length));
  const msSum = fold((x) => x.ms);
  const turns = fold((x) => x.turns);
  const recGames = sum(all.map((x) => x.recBytes.length));
  const recBytes = fold((x) => x.recBytes);
  const ms: number[] = [];
  for (const x of all) for (const v of x.ms) ms.push(v);
  return {
    runs: files.length,
    drafts,
    games,
    engine_errors: engineErrorDrafts + sum(all.map((x) => x.gameErrors)),
    engine_error_rate: drafts ? r4(engineErrorDrafts / drafts) : 0,
    timeouts: sum(all.map((x) => x.timeouts)),
    mean_game_s: games ? r4(msSum / games / 1000) : 0,
    median_game_s: r4(median(ms) / 1000),
    mean_game_ms: games ? Math.round(msSum / games) : 0,
    ms_per_turn: turns ? Math.round(msSum / turns) : 0,
    cpu_ms_per_turn: turns ? Math.round(fold((x) => x.cpuMs) / turns) : 0,
    recorded_games: recGames,
    recorded_errors: fold((x) => x.recErrors),
    recorded_bytes_per_game: recGames ? Math.round(recBytes / recGames) : 0,
    draws: sum(all.map((x) => x.draws)),
    mean_turns: games ? r4(turns / games) : 0,
    bridge_drafts: sum(all.map((x) => x.bridgeDrafts)),
    // The output on disk, cheaply: the drafts.jsonl files and the recordings their lines say they wrote.
    output_bytes: sum(files.map((f) => { try { return fs.statSync(f).size; } catch { return 0; } })) + recBytes,
  };
}

export function cubelab(cwd: string, args: string[]): Flat {
  return cubelabOf(draftFiles(cwd, args));
}

/** The overnight queue (tools/cubelab.sh queue, PR #26): night-<N>.json's chunks, each a run folder `<root>/<key>`. */
export function cubelabQueue(cwd: string, args: string[]): Flat {
  const root = path.resolve(cwd, args[0] ?? 'var/cubelab/queue');
  const ni = args.indexOf('night');
  const nights = ni >= 0 ? [Number(args[ni + 1])] : expandGlob(root, 'night-*.json').map((f) => Number(/night-(\d+)\.json$/.exec(f)?.[1])).filter(Number.isFinite);
  let planned = 0, done = 0, bridgePlanned = 0, bridgeDone = 0;
  const files = new Set<string>();
  // Per cube (a normal chunk's key is `normal/<cube>`; a bridge pair's `bridge/<a>+<b>` counts as bridge).
  const perCube = new Map<string, { done: number; planned: number }>();
  for (const n of nights) {
    let plan: { chunks?: Array<{ key: string; seed: number; drafts: number }> };
    try { plan = JSON.parse(fs.readFileSync(path.join(root, `night-${n}.json`), 'utf8')) as typeof plan; } catch { continue; }
    for (const c of plan.chunks ?? []) {
      planned += c.drafts;
      const f = path.join(root, c.key, 'drafts.jsonl');
      files.add(f);
      const seeds = draftStats(f).seeds;
      let got = 0;
      for (let s = c.seed; s < c.seed + c.drafts; s++) if (seeds.has(s)) got++;
      done += got;
      const cube = /^normal\/([a-z0-9-]{1,40})$/.exec(c.key)?.[1];
      if (cube) {
        const pc = perCube.get(cube) ?? { done: 0, planned: 0 };
        pc.done += got;
        pc.planned += c.drafts;
        perCube.set(cube, pc);
      } else if (c.key.startsWith('bridge/')) {
        bridgeDone += got;
        bridgePlanned += c.drafts;
      }
    }
  }
  const out: Flat = {
    ...cubelabOf([...files].filter((f) => fs.existsSync(f))), planned_drafts: planned, night_drafts_done: done, nights: nights.length,
    bridge_drafts_done: bridgeDone, bridge_drafts_planned: bridgePlanned, bridge_share: done ? r4(bridgeDone / done) : 0,
  };
  for (const [cube, pc] of [...perCube].sort(([a], [b]) => a.localeCompare(b))) {
    out[`cubes.${cube}.done`] = pc.done;
    out[`cubes.${cube}.planned`] = pc.planned;
  }
  return out;
}

export function evolve(cwd: string, args: string[]): Flat {
  const dir = path.resolve(cwd, args[0] ?? '.');
  let st: { generations?: unknown[]; drafts?: number } = {};
  try { st = JSON.parse(fs.readFileSync(path.join(dir, 'evolve.json'), 'utf8')) as typeof st; } catch { /* not started */ }
  const gens = expandGlob(dir, 'gen-*');
  const doneGens = gens.filter((g) => fs.existsSync(path.join(g, 'result.json'))).length;
  const files = gens.map((g) => path.join(g, 'run', 'drafts.jsonl')).filter((f) => fs.existsSync(f));
  return { ...cubelabOf(files), generations_done: doneGens, generations_started: gens.length, drafts_per_generation: numOr(st.drafts) };
}

// ---------------------------------------------------------------- coach bench

interface CoachSample { verdict?: string; latencyMs?: number; attempts?: number; stated?: { confidence?: unknown } }

/** ForgeCoach's coach-bench result file (bench/coach/results/*.json, BenchReport bench 1 or 2). */
export function coachbench(cwd: string, args: string[]): Flat {
  const files = args.flatMap((a) => expandGlob(cwd, a)).filter((f) => f.endsWith('.json'));
  if (!files.length) return {};
  const file = files.map((f) => ({ f, t: fs.statSync(f).mtimeMs })).sort((a, b) => b.t - a.t)[0]!.f;
  const doc = JSON.parse(fs.readFileSync(file, 'utf8')) as { bench?: number; cases?: Array<Record<string, unknown>> };
  const samples: CoachSample[] = doc.bench === 1 ? (doc.cases ?? []) as CoachSample[] : (doc.cases ?? []).flatMap((c) => (c.samples ?? []) as CoachSample[]);
  const valid = (s: CoachSample): boolean => s.verdict === 'acceptable' || s.verdict === 'unacceptable' || s.verdict === 'other';
  const errors = samples.filter((s) => s.verdict === 'error').length;
  const answered = samples.length - errors;
  const fails = samples.filter((s) => s.verdict !== 'error' && !valid(s)).length;
  const lat = samples.filter((s) => s.verdict !== 'error').map((s) => numOr(s.latencyMs)).sort((a, b) => a - b);
  const at = (q: number): number => (lat.length ? (lat[Math.min(lat.length - 1, Math.floor(q * lat.length))] as number) : 0);
  const scored = samples.filter(valid).map((s) => (s.verdict === 'acceptable' ? 1 : s.verdict === 'unacceptable' ? -1 : 0));
  return {
    calls: samples.length,
    answers: answered,
    transport_errors: errors,
    format_failures: fails,
    format_failure_rate: answered ? r4(fails / answered) : 0,
    retries: sum(samples.map((s) => Math.max(0, numOr(s.attempts, 1) - 1))),
    median_latency_s: r4(at(0.5) / 1000),
    p90_latency_s: r4(at(0.9) / 1000),
    max_latency_s: r4((lat.at(-1) ?? 0) / 1000),
    min_latency_s: r4((lat[0] ?? 0) / 1000),
    stated_confidence: samples.filter((s) => s.stated?.confidence !== undefined).length,
    blunders: samples.filter((s) => s.verdict === 'unacceptable').length,
    mean_score: scored.length ? r4(sum(scored) / scored.length) : 0,
  };
}

// ---------------------------------------------------------------- AI ladder

export function ladder(cwd: string, args: string[]): Flat {
  const dir = path.resolve(cwd, args[0] ?? 'var/ai-ladder');
  let games = 0, errors = 0, timeouts = 0;
  const ms: number[] = [];
  for (const f of expandGlob(dir, 'results/*.jsonl')) {
    eachJsonLine(f, (r) => {
      if (r === null) return;
      games++;
      if (r.error === true) errors++;
      if (r.timeout === true) timeouts++;
      ms.push(numOr(r.ms));
    });
  }
  return { games, errors, timeouts, median_game_s: r4(median(ms) / 1000) };
}

// ---------------------------------------------------------------- generic

export function lines(cwd: string, args: string[]): number {
  let n = 0;
  for (const f of args.flatMap((a) => expandGlob(cwd, a))) eachCompleteLine(f, () => { n++; });
  return n;
}

export function files(cwd: string, args: string[]): number {
  return new Set(args.flatMap((a) => expandGlob(cwd, a))).size;
}

export function count(cwd: string, args: string[]): number {
  const text = args.at(-1) ?? '';
  if (!text) return 0;
  let n = 0;
  for (const f of args.slice(0, -1).flatMap((a) => expandGlob(cwd, a))) eachCompleteLine(f, (l) => { if (l.includes(text)) n++; });
  return n;
}

export const EXTRACTORS: Record<string, (cwd: string, args: string[]) => Flat | number> = {
  aibench, cubelab, 'cubelab-queue': cubelabQueue, evolve, coachbench, ladder, lines, files, count,
};

/** Flatten a nested object into dotted keys, numbers and booleans only. */
export function flatten(o: unknown, prefix = '', out: Flat = {}): Flat {
  if (typeof o === 'number' && Number.isFinite(o)) { if (prefix) out[prefix] = o; return out; }
  if (typeof o === 'boolean') { if (prefix) out[prefix] = o; return out; }
  if (o && typeof o === 'object' && !Array.isArray(o)) {
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (!/^[A-Za-z0-9_]+$/.test(k)) continue;
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
  }
  return out;
}

/** Put an extractor's result under its line's name. */
export function place(name: string | null, r: Flat | number, into: Flat): void {
  if (typeof r === 'number') {
    into[name ?? 'value'] = r;
    return;
  }
  for (const [k, v] of Object.entries(r)) into[name ? `${name}.${k}` : k] = v;
}

// ---------------------------------------------------------------- progress

export interface ProgressNow {
  done: number;
  total: number | null;
  unit: string;
}

/** done (and total, where the files say it) for a `progress:` line.  `metric` reads a metric by name. */
export function progressOf(cwd: string, kind: string, args: string[], total: number | null, metrics: Flat = {}): ProgressNow {
  switch (kind) {
    case 'aibench': return { done: numOr(aibench(cwd, args).games), total, unit: 'games' };
    case 'cubelab': return { done: numOr(cubelab(cwd, args).drafts), total, unit: 'drafts' };
    case 'cubelab-queue': {
      const q = cubelabQueue(cwd, args);
      return { done: numOr(q.night_drafts_done), total: total ?? (numOr(q.planned_drafts) || null), unit: 'drafts' };
    }
    case 'evolve': {
      const e = evolve(cwd, args);
      const ti = args.indexOf('generations');
      const gens = ti >= 0 ? Number(args[ti + 1]) : NaN;
      return { done: numOr(e.drafts), total: total ?? (Number.isFinite(gens) ? gens * numOr(e.drafts_per_generation) : null), unit: 'drafts' };
    }
    case 'lines': return { done: lines(cwd, args), total, unit: 'lines' };
    case 'files': return { done: files(cwd, args), total, unit: 'files' };
    case 'metric': return { done: numOr(metrics[args[0] ?? '']), total, unit: args[1] ?? 'items' };
    default: throw new Error(`progress: no counter called ${kind} (aibench, cubelab, cubelab-queue, evolve, lines, files, metric)`);
  }
}

export interface RateSample { at: number; done: number }

/** Rate per hour over the last `windowMs` (or since the first sample), and the ETA. */
export function rateAndEta(samples: RateSample[], total: number | null, now: number, windowMs = 30 * 60_000): { ratePerHour: number | null; eta: number | null } {
  if (samples.length < 2) return { ratePerHour: null, eta: null };
  const last = samples[samples.length - 1] as RateSample;
  let first = samples[0] as RateSample;
  for (const s of samples) if (last.at - s.at <= windowMs) { first = s; break; }
  const dt = last.at - first.at;
  if (dt < 60_000 || last.done <= first.done) return { ratePerHour: dt >= 60_000 ? 0 : null, eta: null };
  const perMs = (last.done - first.done) / dt;
  const ratePerHour = Math.round(perMs * 3_600_000 * 10) / 10;
  const eta = total !== null && total > last.done ? now + (total - last.done) / perMs : null;
  return { ratePerHour, eta };
}
