// mtg-table — the AI ladder: league mode's promotion rule and its state file.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The league is the self-play loop (D320).  It keeps the CURRENT BEST (the last
// promoted version; forge-default before any promotion), a POOL of the last
// `poolSize` promoted versions plus every available stock-Forge anchor, and a
// queue of CANDIDATES (registry players marked `"candidate": true`, e.g. by
// `tune --candidate`, not yet decided).  Each batch is one of:
//
//   - the newest (the current best) against the pool member it has played
//     least — a fixed `share` of the batches;
//   - while a candidate is pending, its tests, in the cycle
//       candidate vs best (the SPRT), candidate vs best,
//       candidate vs forge-default, best vs forge-default
//     — the last two on the same deals (one --seed range per candidate), so the
//     regression check is paired;
//   - otherwise an ordinary ladder batch (schedule.ts).
//
// A candidate is PROMOTED only if both hold (`decide`):
//   1. the SPRT (sprt.ts) accepts H1, "candidate beats best by >= elo1"; and
//   2. against forge-default, on the shared deals, the candidate's Elo is not
//      below the best's by more than `forgeMargin` (0 by default) — with at
//      least `minForgeGames` decisive games each.  No "beats itself, forgets
//      Forge" promotions.
// H0 or an inconclusive SPRT, or a failed check 2, rejects it; every decision
// is kept in league.json and one line in sprt.jsonl.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { eloOf } from './rating.ts';
import type { SprtState } from './sprt.ts';
import type { Tally } from './tune.ts';

export interface LeagueOptions {
  poolSize: number;
  share: number;
  minForgeGames: number;
  forgeMargin: number;
}

export const LEAGUE_DEFAULTS: LeagueOptions = { poolSize: 4, share: 0.5, minForgeGames: 80, forgeMargin: 0 };

export interface Decision {
  verdict: 'promote' | 'reject' | 'continue';
  reason: string;
  candElo?: number;
  bestElo?: number;
}

/** Elo vs forge-default from a tally, with a half-game of smoothing so 10-0 is not infinite. */
export const eloVs = (t: Tally): number => eloOf((t.wins + 0.5) / (t.wins + t.losses + 1));

export function decide(sprt: SprtState, candVsForge: Tally, bestVsForge: Tally | null, opt: Pick<LeagueOptions, 'minForgeGames' | 'forgeMargin'>): Decision {
  if (sprt.result === 'H0') return { verdict: 'reject', reason: `SPRT accepted H0 after ${sprt.games} games (LLR ${sprt.llr.toFixed(2)})` };
  if (sprt.result === 'inconclusive') return { verdict: 'reject', reason: `SPRT inconclusive at its game limit (${sprt.games} games)` };
  const n = (t: Tally): number => t.wins + t.losses;
  const enough = n(candVsForge) >= opt.minForgeGames && (bestVsForge === null || n(bestVsForge) >= opt.minForgeGames);
  if (sprt.result === 'continue' || !enough) {
    return { verdict: 'continue', reason: sprt.result === 'continue' ? 'SPRT running' : `SPRT accepted H1; waiting for ${opt.minForgeGames} games each vs forge-default` };
  }
  const candElo = eloVs(candVsForge);
  const bestElo = bestVsForge === null ? 0 : eloVs(bestVsForge);   // best = forge-default itself: 0 by definition
  if (candElo < bestElo - opt.forgeMargin) {
    return { verdict: 'reject', reason: `beats the best but forgets Forge: ${candElo.toFixed(0)} vs ${bestElo.toFixed(0)} Elo against forge-default`, candElo, bestElo };
  }
  return { verdict: 'promote', reason: `SPRT H1 after ${sprt.games} games; vs forge-default ${candElo.toFixed(0)} >= ${bestElo.toFixed(0)} - ${opt.forgeMargin}`, candElo, bestElo };
}

export interface LeagueState {
  version: 1;
  best: string;
  promoted: Array<{ name: string; hash: string; at: string; reason: string }>;
  decided: Record<string, { verdict: 'promote' | 'reject'; at: string; reason: string; hash: string }>;
  /** Which seed range each candidate's tests use (assigned once, in order). */
  slots: Record<string, number>;
}

export function loadLeague(file: string, start: string): LeagueState {
  if (!existsSync(file)) return { version: 1, best: start, promoted: [], decided: {}, slots: {} };
  return JSON.parse(readFileSync(file, 'utf8')) as LeagueState;
}

export function saveLeague(file: string, s: LeagueState): void {
  writeFileSync(file, JSON.stringify(s, null, 2) + '\n');
}

/** The pool: the last `poolSize` promoted versions (newest last) and the anchors, without duplicates. */
export function poolOf(s: LeagueState, anchors: string[], poolSize: number): string[] {
  const recent = s.promoted.slice(-poolSize).map((p) => p.name);
  return [...new Set([...anchors, ...recent, s.best])];
}
