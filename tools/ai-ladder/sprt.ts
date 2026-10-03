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
  return llrMeans(xs, score(elo0), score(elo1));
}

/** The GSPRT statistic for "the mean of xs is mu1" against "it is mu0" (normal approximation, sample variance floored). */
export function llrMeans(xs: number[], mu0: number, mu1: number, varFloor = VAR_FLOOR): number {
  const N = xs.length;
  if (N === 0) return 0;
  const m = xs.reduce((s, x) => s + x, 0) / N;
  const v = Math.max(varFloor, xs.reduce((s, x) => s + (x - m) * (x - m), 0) / N);
  return (N * ((m - mu0) * (m - mu0) - (m - mu1) * (m - mu1))) / (2 * v);
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

// ---------------------------------------------------------------- non-inferiority
//
// The league's Forge check (D321): is the candidate NOT WORSE than the current
// best against forge-default by more than `margin` Elo?  Both play
// forge-default on the same deals; each observation is one shared mirror block:
// d = candidate's pair score − best's pair score (in [−1, 1]).  A sequential
// test of
//     H0: mean d = −δ   ("inferior by the margin")   against
//     H1: mean d =  0   ("as good as the best"),
// δ = score(margin) − ½ (30 Elo ≈ 0.043 in score), with the same GSPRT as
// above and Wald's bounds: accepting H1 ("non-inferior") when the candidate is
// truly δ worse happens with probability ≈ alpha; rejecting a candidate that is
// truly equal happens with probability ≈ beta (power 1 − beta).  When the best
// IS forge-default, d = candidate's pair score − ½.

export interface NiParams {
  /** The non-inferiority margin, Elo. */
  margin: number;
  alpha: number;
  beta: number;
  minPairs?: number;
  maxPairs?: number;
}

export const NI_DEFAULTS: NiParams = { margin: 30, alpha: 0.05, beta: 0.1, minPairs: 30, maxPairs: 3000 };

export interface NiState {
  llr: number;
  lower: number;
  upper: number;
  pairs: number;
  /** Mean paired difference in score, and its rough Elo equivalent at 50%. */
  diff: number;
  diffElo: number;
  result: 'non-inferior' | 'inferior' | 'continue' | 'inconclusive';
}

/** Elo -> score difference from 50%. */
export const scoreDelta = (elo: number): number => score(elo) - 0.5;

export function niState(diffs: number[], p: NiParams): NiState {
  const { lower, upper } = bounds(p);
  const delta = scoreDelta(p.margin);
  const L = llrMeans(diffs, -delta, 0, 0.02);
  const m = diffs.length ? diffs.reduce((s, x) => s + x, 0) / diffs.length : 0;
  let result: NiState['result'] = 'continue';
  if (diffs.length >= (p.minPairs ?? 30)) {
    if (L >= upper) result = 'non-inferior';
    else if (L <= lower) result = 'inferior';
  }
  if (result === 'continue' && p.maxPairs !== undefined && diffs.length >= p.maxPairs) result = 'inconclusive';
  return { llr: L, lower, upper, pairs: diffs.length, diff: m, diffElo: m * 1600 / Math.LN10, result };
}

/**
 * Pairs needed for a FIXED-size non-inferiority test at this margin, alpha and
 * power, given the SD of one paired difference (planning number; the
 * sequential test above needs fewer on average).
 */
export function niPairsNeeded(p: Pick<NiParams, 'margin' | 'alpha' | 'beta'>, sd: number): number {
  const z = (q: number): number => {
    // inverse normal CDF (Acklam), enough for planning
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    const pl = 0.02425;
    if (q < pl) { const t = Math.sqrt(-2 * Math.log(q)); return (((((c[0]! * t + c[1]!) * t + c[2]!) * t + c[3]!) * t + c[4]!) * t + c[5]!) / ((((d[0]! * t + d[1]!) * t + d[2]!) * t + d[3]!) * t + 1); }
    if (q > 1 - pl) return -z(1 - q);
    const t = q - 0.5, r = t * t;
    return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * t / (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  };
  const za = z(1 - p.alpha), zb = z(1 - p.beta);
  return Math.ceil(Math.pow(((za + zb) * sd) / scoreDelta(p.margin), 2));
}
