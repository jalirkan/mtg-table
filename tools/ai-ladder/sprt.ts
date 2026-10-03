// mtg-table — the AI ladder: the sequential probability ratio test.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// `sprt A B --elo0 0 --elo1 20` asks: is A stronger than B by at least elo1
// (H1), or by at most elo0 (H0)?  Games are played in mirrored pairs (ai-bench
// --mirror: one deal from both sides), and the two games of a pair are
// correlated — the deal favours one side — so the unit of evidence is the PAIR,
// scored as A's share of its decisive games (0, ½ or 1; a pair with one draw
// counts its one decisive game).  This is the generalized SPRT on those scores
// (the normal approximation Fishtest uses for its pentanomial test):
//
//   s0 = 1/(1+10^(-elo0/400)),  s1 likewise,
//   LLR = N · ((x̄ − s0)² − (x̄ − s1)²) / (2 σ²)
//
// with x̄ and σ² the mean and variance of the N pair scores.  Stop at
// LLR ≥ ln((1−β)/α) (accept H1, "A is stronger by ≥ elo1") or LLR ≤
// ln(β/(1−α)) (accept H0), or at `maxGames` (inconclusive).  The variance is
// floored, and no decision is taken before `minPairs`, so the first few pairs
// (σ² ≈ 0) cannot end a test by themselves.  Elo here is the logistic scale the
// ratings use (rating.ts), not "normalized" Elo.

export interface SprtParams {
  elo0: number;
  elo1: number;
  alpha: number;
  beta: number;
  minPairs?: number;
  maxGames?: number;
}

export interface PairScore {
  /** A's share of the pair's decisive games: 0, 0.5 or 1. */
  x: number;
  games: number;
}

export interface SprtState {
  llr: number;
  lower: number;
  upper: number;
  pairs: number;
  games: number;
  /** A's mean score over the pairs. */
  score: number;
  result: 'H1' | 'H0' | 'continue' | 'inconclusive';
}

export const score = (elo: number): number => 1 / (1 + Math.pow(10, -elo / 400));
const VAR_FLOOR = 0.01;

export function bounds(p: Pick<SprtParams, 'alpha' | 'beta'>): { lower: number; upper: number } {
  return { lower: Math.log(p.beta / (1 - p.alpha)), upper: Math.log((1 - p.beta) / p.alpha) };
}

export function llr(xs: number[], elo0: number, elo1: number): number {
  const N = xs.length;
  if (N === 0) return 0;
  const m = xs.reduce((s, x) => s + x, 0) / N;
  const v = Math.max(VAR_FLOOR, xs.reduce((s, x) => s + (x - m) * (x - m), 0) / N);
  const s0 = score(elo0), s1 = score(elo1);
  return (N * ((m - s0) * (m - s0) - (m - s1) * (m - s1))) / (2 * v);
}

export function sprtState(pairs: PairScore[], p: SprtParams): SprtState {
  const { lower, upper } = bounds(p);
  const xs = pairs.map((q) => q.x);
  const games = pairs.reduce((s, q) => s + q.games, 0);
  const L = llr(xs, p.elo0, p.elo1);
  const mean = xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0.5;
  let result: SprtState['result'] = 'continue';
  if (xs.length >= (p.minPairs ?? 8)) {
    if (L >= upper) result = 'H1';
    else if (L <= lower) result = 'H0';
  }
  if (result === 'continue' && p.maxGames !== undefined && games >= p.maxGames) result = 'inconclusive';
  return { llr: L, lower, upper, pairs: xs.length, games, score: mean, result };
}

/** Group A-vs-B games (from A's side: s = 1 when A won) into mirror-pair scores. Draws are dropped. */
export function pairScores(games: Array<{ block: string; aWon: boolean | null }>): PairScore[] {
  const by = new Map<string, { w: number; n: number }>();
  const order: string[] = [];
  for (const g of games) {
    if (g.aWon === null) continue;
    let e = by.get(g.block);
    if (!e) { e = { w: 0, n: 0 }; by.set(g.block, e); order.push(g.block); }
    e.n++;
    if (g.aWon) e.w++;
  }
  return order.map((k) => { const e = by.get(k) as { w: number; n: number }; return { x: e.w / e.n, games: e.n }; });
}
