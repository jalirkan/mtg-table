// mtg-table — the AI ladder: the committed experiment log.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Every engine command (run, sprt, tune, league) appends a START line to
// `docs/evidence/experiments.jsonl` (committed; `--experiments FILE` elsewhere)
// BEFORE its first game, and an END line when it stops — finished, stopped by
// Ctrl-C or its deadline, or failed.  A start with no end is an abandoned run
// (a killed process): the log keeps it, so the record of what was tried cannot
// lose the runs that did not work out (D318).  The game results themselves stay
// in var/ (too big to commit); this log is the index that says which runs exist
// and what each was for — light pre-registration:
//
//   start: { v:1, id, kind:"start", at, host, cmd, args, git:{sha, dirty},
//            purpose: "pilot"|"dev"|"confirm", hypothesis, set, setHash,
//            players:[{name, hash, cfg}], seedBase }
//   end:   { v:1, id, kind:"end", at, status:"finished"|"stopped"|"failed",
//            games, decisive, draws, bseeds:[min, max] | null, result }
//
// `purpose` is the deck set's role unless --purpose says otherwise: tuning is
// "dev"; a run on the confirm set is "confirm"; anything else is "pilot".
// Write the hypothesis (--hypothesis "...") before a confirm run; sprt, tune
// and league write their own.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { Player } from './registry.ts';
import type { GameRecord } from './results.ts';
import { fileLines } from '../cubelab/lines.ts';

export interface ExpStart {
  v: 1; id: string; kind: 'start'; at: string; host: string; cmd: string; args: string[];
  git: { sha: string; dirty: boolean }; purpose: 'pilot' | 'dev' | 'confirm'; hypothesis: string;
  set: string; setHash: string; players: Array<{ name: string; hash: string; cfg: string | null }>; seedBase: number;
}

export interface ExpEnd {
  v: 1; id: string; kind: 'end'; at: string; status: 'finished' | 'stopped' | 'failed';
  games: number; decisive: number; draws: number; bseeds: [number, number] | null; result: unknown;
}

export type ExpLine = ExpStart | ExpEnd;

export function gitInfo(repo: string): { sha: string; dirty: boolean } {
  try {
    const sha = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const st = execFileSync('git', ['-C', repo, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' });
    // the log and the registry are written by the tools themselves: they do not make a run "dirty"
    const dirty = st.split('\n').filter((l) => l.trim() && !/experiments\.jsonl|players\.json/.test(l)).length > 0;
    return { sha, dirty };
  } catch {
    return { sha: 'unknown', dirty: true };
  }
}

export const fileHash = (file: string): string => createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 12);

export function append(file: string, line: ExpLine): void {
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, JSON.stringify(line) + '\n');
}

export function readLog(file: string): ExpLine[] {
  if (!existsSync(file)) return [];
  return [...fileLines(file)].filter((l) => l.trim()).flatMap((l) => {
    try { return [JSON.parse(l) as ExpLine]; } catch { return []; }
  });
}

export interface ExpRow { start: ExpStart; end: ExpEnd | null; status: ExpEnd['status'] | 'abandoned' | 'running?' }

/** Starts joined to their ends; a start with no end is "abandoned" (or still running, if it is the newest and recent). */
export function joinLog(lines: ExpLine[], now = Date.now()): ExpRow[] {
  const ends = new Map<string, ExpEnd>();
  for (const l of lines) if (l.kind === 'end') ends.set(l.id, l);
  return lines.filter((l): l is ExpStart => l.kind === 'start').map((s) => {
    const e = ends.get(s.id) ?? null;
    const recent = now - Date.parse(s.at) < 12 * 3600_000;
    return { start: s, end: e, status: e ? e.status : recent ? 'running?' : 'abandoned' };
  });
}

export function startLine(o: { id: string; host: string; cmd: string; args: string[]; repo: string; purpose: ExpStart['purpose']; hypothesis: string; set: string; setFile: string; players: Player[]; seedBase: number }): ExpStart {
  return {
    v: 1, id: o.id, kind: 'start', at: new Date().toISOString(), host: o.host, cmd: o.cmd, args: o.args,
    git: gitInfo(o.repo), purpose: o.purpose, hypothesis: o.hypothesis, set: o.set, setHash: fileHash(o.setFile),
    players: o.players.map((p) => ({ name: p.name, hash: p.hash, cfg: p.cfg })), seedBase: o.seedBase,
  };
}

export function endLine(id: string, status: ExpEnd['status'], recs: GameRecord[], result: unknown): ExpEnd {
  const seeds = recs.map((r) => r.bseed);
  const decisive = recs.filter((r) => r.w !== 'd').length;
  return {
    v: 1, id, kind: 'end', at: new Date().toISOString(), status, games: recs.length, decisive, draws: recs.length - decisive,
    bseeds: seeds.length ? [Math.min(...seeds), Math.max(...seeds)] : null, result,
  };
}
