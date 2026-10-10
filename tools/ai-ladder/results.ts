// mtg-table — the AI ladder: the append-only results log.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Every game the ladder plays is one line of `<dir>/results/<host>.jsonl`
// (default dir var/ai-ladder/), appended as each batch ends and never rewritten.
// One file per machine, so a second PC's file is simply copied in beside the
// first and both accumulate (`id` is unique across machines: host, run, batch,
// pair, game; a line read twice is counted once).  `fromBench()` turns one
// ai-bench game line (tools/ai-bench/AiBench.java's `play` output) into a
// ladder line; nothing else writes them.
//
// GameRecord, version 1:
//   v      1
//   id     "<host>:<run>:<batch>:<pair>:<game>"
//   at     ISO time the batch ended
//   host, run (the ladder invocation), batch (its batch number), purpose
//          ("ladder" | "sprt:<id>" | "tune:<id>" | "league")
//   a, b   player names (a = ai-bench's config A); ah, bh their config hashes;
//   ac, bc the ai-bench seat configs actually played
//   set    the deck-pair file; pair its line index (0-based, comments skipped);
//          g the game within the pair's mirrored block (0..3); seed the deal;
//          bseed the --seed the batch passed to ai-bench (the ladder's block
//          number for the matchup, offset per host: see schedule.ts)
//   aDeck, bDeck, aSeat
//   w      "a" | "b" | "d" (a draw: ai-bench's timeout or engine error)
//   turns, ms, timeout, error (boolean)
//   evalTimeouts  Forge's "AI eval thread at timeout" count in the game (ai-bench's aiEvalTimeouts)
//   load   the machine's 1-minute load average when the batch ended — a busy
//          machine weakens Forge's AI (its 5 s timeout) and a wall-clock search

import { appendFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { Player } from './registry.ts';
import { fileLines } from '../cubelab/lines.ts';

export interface GameRecord {
  v: 1;
  id: string;
  at: string;
  host: string;
  run: string;
  batch: number;
  purpose: string;
  a: string;
  b: string;
  ah: string;
  bh: string;
  ac: string;
  bc: string;
  set: string;
  pair: number;
  g: number;
  seed: number;
  bseed: number;
  aDeck: string;
  bDeck: string;
  aSeat: number;
  w: 'a' | 'b' | 'd';
  turns: number;
  ms: number;
  timeout: boolean;
  error: boolean;
  evalTimeouts?: number;
  load?: number;
}

/** The ai-bench line's fields the ladder reads. */
export interface BenchLine {
  pair: number; game: number; seed: number; a: string; b: string; aDeck: string; bDeck: string; aSeat: number;
  winner: string; turns: number; ms: number; timeout: boolean; error: string; aiEvalTimeouts?: number;
}

export interface BatchInfo {
  host: string; run: string; batch: number; purpose: string; set: string; bseed: number;
  /** The pair-file line index of each line of the batch's own pairs file. */
  pairIndex: number[];
  a: Player; b: Player; at: string; load?: number;
}

export function fromBench(l: BenchLine, info: BatchInfo): GameRecord {
  const pair = info.pairIndex[l.pair] ?? l.pair;
  return {
    v: 1,
    id: `${info.host}:${info.run}:${info.batch}:${pair}:${l.game}`,
    at: info.at, host: info.host, run: info.run, batch: info.batch, purpose: info.purpose,
    a: info.a.name, b: info.b.name, ah: info.a.hash, bh: info.b.hash, ac: l.a, bc: l.b,
    set: info.set, pair, g: l.game, seed: l.seed, bseed: info.bseed, aDeck: l.aDeck, bDeck: l.bDeck, aSeat: l.aSeat,
    w: l.winner === 'A' ? 'a' : l.winner === 'B' ? 'b' : 'd',
    turns: l.turns, ms: l.ms, timeout: !!l.timeout, error: !!l.error,
    evalTimeouts: l.aiEvalTimeouts ?? 0, load: info.load ?? -1,
  };
}

export function resultsDir(dir: string): string {
  return join(dir, 'results');
}

export function appendResults(dir: string, host: string, recs: GameRecord[]): void {
  if (recs.length === 0) return;
  mkdirSync(resultsDir(dir), { recursive: true });
  appendFileSync(join(resultsDir(dir), `${host}.jsonl`), recs.map((r) => JSON.stringify(r)).join('\n') + '\n');
}

/** Every machine's lines, deduplicated by id, in time order (then id). A torn last line is skipped. */
export function readResults(dir: string): GameRecord[] {
  const d = resultsDir(dir);
  if (!existsSync(d)) return [];
  const byId = new Map<string, GameRecord>();
  for (const f of readdirSync(d).filter((x) => x.endsWith('.jsonl')).sort()) {
    for (const line of fileLines(join(d, f))) {
      if (!line.trim()) continue;
      let r: GameRecord;
      try {
        r = JSON.parse(line) as GameRecord;
      } catch {
        continue;
      }
      if (r.v === 1 && r.id && !byId.has(r.id)) byId.set(r.id, r);
    }
  }
  return [...byId.values()].sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}

/**
 * The rated identity of one side of a game is its CONFIG: the registered player
 * whose config hash it played (whatever name the line carries — a tuner's
 * candidate that is later registered keeps its games), else `name@hash`, an
 * unregistered or since-edited config, rated but listed apart.
 */
export function identity(name: string, hash: string, byHash: Map<string, Player>): string {
  const p = byHash.get(hash);
  return p ? p.name : `${name}@${hash}`;
}

/** hash -> the first registered player with that config. */
export function hashIndex(ps: Player[]): Map<string, Player> {
  const m = new Map<string, Player>();
  for (const p of ps) if (!m.has(p.hash)) m.set(p.hash, p);
  return m;
}

export interface Outcome {
  /** Rated identities. */
  a: string;
  b: string;
  /** 1 = a won, 0 = b won; draws are not outcomes. */
  s: 0 | 1;
  /** Mirror block key: games of one deal from both sides share it (bootstrap clusters, SPRT pairs). */
  block: string;
}

export function outcomes(recs: GameRecord[], byHash: Map<string, Player>): Outcome[] {
  const out: Outcome[] = [];
  for (const r of recs) {
    if (r.w === 'd') continue;
    out.push({ a: identity(r.a, r.ah, byHash), b: identity(r.b, r.bh, byHash), s: r.w === 'a' ? 1 : 0, block: blockKey(r) });
  }
  return out;
}

/** Games 4k/4k+3 and 4k+1/4k+2 of one pair in one batch are one deal from both sides (ai-bench --mirror). */
export function blockKey(r: Pick<GameRecord, 'host' | 'run' | 'batch' | 'pair' | 'g'>): string {
  const m = r.g % 4;
  const half = m === 0 || m === 3 ? 0 : 1;
  return `${r.host}:${r.run}:${r.batch}:${r.pair}:${r.g - m}:${half}`;
}
