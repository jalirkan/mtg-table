// mtg-table — the AI ladder: league mode's promotion rule and its state file.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The league is the self-play loop (D321).  It keeps the CURRENT BEST (the last
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
//   2. a NON-INFERIORITY test against forge-default (sprt.ts `niState`): on the
//      same deals, the candidate's mirror-pair score minus the best's must be
//      shown to be above −δ, δ = `margin` Elo (30): a sequential test of
//      "inferior by δ" (H0) against "equal" (H1) with alpha 0.05 (a candidate
//      truly δ worse passes 5% of the time) and beta 0.1 (a truly equal one
//      passes 90% of the time).  No "beats itself, forgets Forge" promotions,
//      and no coin-flip rejections of good candidates (the first version
//      compared two 80-game point estimates: it rejected about half of the
//      candidates equal to the best).
// H0 or an inconclusive SPRT, or an "inferior" or inconclusive Forge test,
// rejects it; every decision is kept in league.json and one line in sprt.jsonl.
// Tests are played on the CONFIRM deck set; candidates come from tuning on DEV.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { NI_DEFAULTS, type NiParams, type NiState, type SprtState } from './sprt.ts';

export interface LeagueOptions {
  poolSize: number;
  share: number;
  ni: NiParams;
}

export const LEAGUE_DEFAULTS: LeagueOptions = { poolSize: 4, share: 0.5, ni: NI_DEFAULTS };

export interface Decision {
  verdict: 'promote' | 'reject' | 'continue';
  reason: string;
}

export function decide(sprt: SprtState, ni: NiState, margin: number): Decision {
  if (sprt.result === 'H0') return { verdict: 'reject', reason: `SPRT accepted H0 after ${sprt.games} games (LLR ${sprt.llr.toFixed(2)}): not shown to beat the best by the test's elo1 -- not "no gain"` };
  if (sprt.result === 'inconclusive') return { verdict: 'reject', reason: `SPRT inconclusive at its game limit (${sprt.games} games)` };
  const vs = `${ni.diffElo >= 0 ? '+' : ''}${ni.diffElo.toFixed(0)} Elo vs the best against forge-default over ${ni.pairs} shared deals`;
  if (ni.result === 'inferior') return { verdict: 'reject', reason: `forgets Forge: shown worse than the best by ${margin} Elo against forge-default (${vs})` };
  if (ni.result === 'inconclusive') return { verdict: 'reject', reason: `Forge non-inferiority inconclusive at its limit (${vs})` };
  if (sprt.result === 'H1' && ni.result === 'non-inferior') {
    return { verdict: 'promote', reason: `SPRT H1 after ${sprt.games} games; non-inferior to the best against forge-default within ${margin} Elo (${vs})` };
  }
  return { verdict: 'continue', reason: sprt.result === 'continue' ? 'SPRT running' : 'SPRT accepted H1; Forge non-inferiority test running' };
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
