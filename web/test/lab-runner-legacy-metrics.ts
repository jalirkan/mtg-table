/*
 * mtg-table — web/test/lab-runner-legacy-metrics.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The lab runner's file-reading extractors as they were before D337's streaming amendment
 * (tools/runner/metrics.ts at 246b450): every line read whole and parsed, every parsed line
 * kept.  A test reference only: lab-runner.test.ts checks that the streamed extractors give
 * the same keys and the same numbers.  The arithmetic below is copied unchanged.
 */

import fs from 'node:fs';
import path from 'node:path';

import { expandGlob, type Flat } from '../../tools/runner/metrics.ts';

function completeLines(file: string): string[] {
  let text: string;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return []; }
  const end = text.lastIndexOf('\n');
  if (end < 0) return [];
  return text.slice(0, end).split('\n').filter((l) => l.trim() !== '');
}

function jsonLines(file: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const l of completeLines(file)) {
    try { out.push(JSON.parse(l) as Record<string, unknown>); } catch { /* skip */ }
  }
  return out;
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
const dirsOf = (cwd: string, args: string[]): string[] => args.flatMap((a) => expandGlob(cwd, a)).filter((d) => { try { return fs.statSync(d).isDirectory(); } catch { return false; } });

export function legacyAibench(cwd: string, args: string[]): Flat {
  const games: Array<Record<string, unknown>> = [];
  let copier = 0;
  const dirs = dirsOf(cwd, args);
  for (const d of dirs) {
    for (const f of expandGlob(d, 'shard-*.jsonl')) games.push(...jsonLines(f));
    for (const f of expandGlob(d, 'shard-*.log')) for (const l of completeLines(f)) if (l.includes("Couldn't map")) copier++;
  }
  const n = games.length;
  const ms = games.map((g) => numOr(g.ms));
  const aw = games.filter((g) => g.winner === 'A').length;
  const bw = games.filter((g) => g.winner === 'B').length;
  const errors = games.filter((g) => typeof g.error === 'string' && g.error !== '').length;
  const timeouts = games.filter((g) => g.timeout === true).length;
  let fallback = 0, considered = 0;
  for (const g of games) {
    for (const side of ['aStats', 'bStats']) {
      const counts = ((g[side] as Record<string, unknown> | undefined)?.counts ?? {}) as Record<string, unknown>;
      fallback += numOr(counts['search.fallback.budget']);
      for (const k of ['search.a.considered', 'search.b.considered', 'search.p.considered']) considered += numOr(counts[k]);
    }
  }
  const out: Flat = {
    runs: dirs.length, games: n, a_wins: aw, b_wins: bw, draws: n - aw - bw,
    a_win_rate: aw + bw ? r4(aw / (aw + bw)) : 0,
    focus_win_rate: (() => { const y = games.filter((g) => g.focusWon === 'yes').length, no = games.filter((g) => g.focusWon === 'no').length; return y + no ? r4(y / (y + no)) : 0; })(),
    errors, timeouts, error_rate: n ? r4((errors + timeouts) / n) : 0, copier_errors: copier,
    mean_game_s: n ? r4(sum(ms) / n / 1000) : 0, median_game_s: r4(median(ms) / 1000), max_game_s: n ? r4(Math.max(...ms) / 1000) : 0,
    mean_turns: n ? r4(sum(games.map((g) => numOr(g.turns))) / n) : 0,
    ai_eval_timeouts: sum(games.map((g) => numOr(g.aiEvalTimeouts))), searched_decisions: considered,
  };
  if (considered > 0) out.fallback_rate = r4(fallback / considered);
  return out;
}

interface GameRow { ms?: number; turns?: number; cpuMs?: number; timeout?: boolean; error?: string | null; winner?: string; recorded?: { bytes?: number; errors?: number } }
interface DraftLine { seed?: number; bridge?: unknown; match?: { games?: GameRow[]; engineError?: string } }

const readDrafts = (f: string): DraftLine[] => jsonLines(f) as DraftLine[];

export function legacyCubelabOf(files: string[]): Flat {
  const drafts = files.flatMap((f) => readDrafts(f));
  const games = drafts.flatMap((d) => d.match?.games ?? []);
  const ms = games.map((g) => numOr(g.ms));
  const turns = sum(games.map((g) => numOr(g.turns)));
  const rec = games.filter((g) => g.recorded);
  return {
    runs: files.length,
    drafts: drafts.length,
    games: games.length,
    engine_errors: drafts.filter((d) => d.match?.engineError).length + games.filter((g) => g.error).length,
    engine_error_rate: drafts.length ? r4(drafts.filter((d) => d.match?.engineError).length / drafts.length) : 0,
    timeouts: games.filter((g) => g.timeout).length,
    mean_game_s: games.length ? r4(sum(ms) / games.length / 1000) : 0,
    median_game_s: r4(median(ms) / 1000),
    mean_game_ms: games.length ? Math.round(sum(ms) / games.length) : 0,
    ms_per_turn: turns ? Math.round(sum(ms) / turns) : 0,
    cpu_ms_per_turn: turns ? Math.round(sum(games.map((g) => numOr(g.cpuMs))) / turns) : 0,
    recorded_games: rec.length,
    recorded_errors: sum(rec.map((g) => numOr(g.recorded?.errors))),
    recorded_bytes_per_game: rec.length ? Math.round(sum(rec.map((g) => numOr(g.recorded?.bytes))) / rec.length) : 0,
    draws: games.filter((g) => g.winner === 'draw').length,
    mean_turns: games.length ? r4(turns / games.length) : 0,
    bridge_drafts: drafts.filter((d) => d.bridge).length,
    output_bytes: sum(files.map((f) => { try { return fs.statSync(f).size; } catch { return 0; } })) + sum(rec.map((g) => numOr(g.recorded?.bytes))),
  };
}

export function legacyCubelabQueue(cwd: string, args: string[]): Flat {
  const root = path.resolve(cwd, args[0] ?? 'var/cubelab/queue');
  const ni = args.indexOf('night');
  const nights = ni >= 0 ? [Number(args[ni + 1])] : expandGlob(root, 'night-*.json').map((f) => Number(/night-(\d+)\.json$/.exec(f)?.[1])).filter(Number.isFinite);
  let planned = 0, done = 0, bridgePlanned = 0, bridgeDone = 0;
  const files = new Set<string>();
  const perCube = new Map<string, { done: number; planned: number }>();
  for (const n of nights) {
    let plan: { chunks?: Array<{ key: string; seed: number; drafts: number }> };
    try { plan = JSON.parse(fs.readFileSync(path.join(root, `night-${n}.json`), 'utf8')) as typeof plan; } catch { continue; }
    for (const c of plan.chunks ?? []) {
      planned += c.drafts;
      const f = path.join(root, c.key, 'drafts.jsonl');
      files.add(f);
      const seeds = new Set(readDrafts(f).map((d) => d.seed));
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
    ...legacyCubelabOf([...files].filter((f) => fs.existsSync(f))), planned_drafts: planned, night_drafts_done: done, nights: nights.length,
    bridge_drafts_done: bridgeDone, bridge_drafts_planned: bridgePlanned, bridge_share: done ? r4(bridgeDone / done) : 0,
  };
  for (const [cube, pc] of [...perCube].sort(([a], [b]) => a.localeCompare(b))) {
    out[`cubes.${cube}.done`] = pc.done;
    out[`cubes.${cube}.planned`] = pc.planned;
  }
  return out;
}

export const legacyLines = (cwd: string, args: string[]): number => sum(args.flatMap((a) => expandGlob(cwd, a)).map((f) => completeLines(f).length));
export const legacyCount = (cwd: string, args: string[]): number => {
  const text = args.at(-1) ?? '';
  if (!text) return 0;
  return sum(args.slice(0, -1).flatMap((a) => expandGlob(cwd, a)).map((f) => completeLines(f).filter((l) => l.includes(text)).length));
};
