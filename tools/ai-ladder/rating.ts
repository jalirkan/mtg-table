// mtg-table — the AI ladder: Bradley-Terry ratings on the Elo scale.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The model: P(i beats j) = 1 / (1 + 10^((R_j - R_i) / 400)), i.e. Bradley-Terry
// with log-strength θ = R · ln10 / 400.  The anchor (forge-default) is FIXED at
// 1500; every other rating is the maximum a posteriori estimate under a weak
// normal prior centred on the anchor (sd `priorSd`, 350 Elo by default), which
// only matters for a player with very few or one-sided games: without it a
// player who has never lost has no finite rating.  Draws (ai-bench timeouts and
// engine errors) carry no outcome and are left out; the report counts them.
//
// Confidence intervals, two ways:
//   - `fit()` gives the Hessian's: the inverse of the posterior's curvature at
//     the optimum (the anchor's row removed), ±1.96 se.  Quick, and the default.
//   - `bootstrap()` resamples MIRROR BLOCKS (a deal played from both sides is
//     one unit, because its two games are correlated) with replacement and
//     refits; the 2.5% and 97.5% quantiles.  Use it when the Hessian's normal
//     approximation is doubtful (few games, ratings near the prior).
// A player with no decisive game is `rated: false`: its rating is the prior.

import { rng } from '../cubelab/rng.ts';

import type { Outcome } from './results.ts';

export const ELO = 400 / Math.LN10;   // Elo points per unit of log-strength

export interface FitOptions {
  anchor: string;
  anchorRating?: number;
  priorSd?: number;
  maxIter?: number;
}

export interface Rating {
  name: string;
  rating: number;
  se: number;
  lo: number;
  hi: number;
  games: number;
  wins: number;
  losses: number;
  rated: boolean;
}

export interface Fit {
  ratings: Map<string, Rating>;
  iterations: number;
  converged: boolean;
}

/** P(a beats b) from two Elo ratings. */
export const expected = (ra: number, rb: number): number => 1 / (1 + Math.pow(10, (rb - ra) / 400));
/** The Elo difference whose expected score is s. */
export const eloOf = (s: number): number => -400 * Math.log10(1 / s - 1);

interface Counts { names: string[]; idx: Map<string, number>; w: number[][]; n: number[][] }

function counts(names: string[], games: Outcome[]): Counts {
  const all = [...new Set([...names, ...games.flatMap((g) => [g.a, g.b])])];
  const idx = new Map(all.map((n, i) => [n, i]));
  const P = all.length;
  const w = Array.from({ length: P }, () => new Array<number>(P).fill(0));
  const n = Array.from({ length: P }, () => new Array<number>(P).fill(0));
  for (const g of games) {
    const i = idx.get(g.a) as number, j = idx.get(g.b) as number;
    if (i === j) continue;
    n[i]![j]! += 1; n[j]![i]! += 1;
    if (g.s === 1) w[i]![j]! += 1; else w[j]![i]! += 1;
  }
  return { names: all, idx, w, n };
}

/** Solve A x = b (A symmetric positive definite, small) by Gaussian elimination with partial pivoting. */
export function solve(A: number[][], b: number[]): number[] {
  const m = b.length;
  const M = A.map((row, i) => [...row, b[i] as number]);
  for (let c = 0; c < m; c++) {
    let p = c;
    for (let r = c + 1; r < m; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[p]![c]!)) p = r;
    [M[c], M[p]] = [M[p]!, M[c]!];
    const piv = M[c]![c]!;
    if (Math.abs(piv) < 1e-300) throw new Error('singular system');
    for (let r = c + 1; r < m; r++) {
      const f = M[r]![c]! / piv;
      if (f === 0) continue;
      for (let k = c; k <= m; k++) M[r]![k]! -= f * M[c]![k]!;
    }
  }
  const x = new Array<number>(m).fill(0);
  for (let r = m - 1; r >= 0; r--) {
    let s = M[r]![m]!;
    for (let k = r + 1; k < m; k++) s -= M[r]![k]! * x[k]!;
    x[r] = s / M[r]![r]!;
  }
  return x;
}

function invert(A: number[][]): number[][] {
  const m = A.length;
  const cols = Array.from({ length: m }, (_, j) => solve(A, Array.from({ length: m }, (_, i) => (i === j ? 1 : 0))));
  return Array.from({ length: m }, (_, i) => Array.from({ length: m }, (_, j) => cols[j]![i]!));
}

/** The MAP Bradley-Terry fit with the anchor fixed; `names` are listed even with no games. */
export function fit(names: string[], games: Outcome[], opt: FitOptions): Fit {
  const anchorRating = opt.anchorRating ?? 1500;
  const tau = (opt.priorSd ?? 350) / ELO;          // prior sd in log-strength units
  const C = counts(names.includes(opt.anchor) ? names : [opt.anchor, ...names], games);
  const P = C.names.length;
  const a0 = C.idx.get(opt.anchor) as number;
  const free = C.names.map((_, i) => i).filter((i) => i !== a0);
  const theta = new Array<number>(P).fill(0);
  const sig = (x: number): number => 1 / (1 + Math.exp(-x));
  let it = 0, converged = false;
  let H: number[][] = [];
  const hessGrad = (): { H: number[][]; g: number[] } => {
    const g = new Array<number>(free.length).fill(0);
    const h = Array.from({ length: free.length }, () => new Array<number>(free.length).fill(0));
    const pos = new Map(free.map((i, k) => [i, k]));
    for (let i = 0; i < P; i++) {
      for (let j = i + 1; j < P; j++) {
        const nij = C.n[i]![j]!;
        if (!nij) continue;
        const p = sig(theta[i]! - theta[j]!);
        const info = nij * p * (1 - p);
        const gi = C.w[i]![j]! - nij * p;         // d/dθi
        const ki = pos.get(i), kj = pos.get(j);
        if (ki !== undefined) { g[ki]! += gi; h[ki]![ki]! += info; }
        if (kj !== undefined) { g[kj]! -= gi; h[kj]![kj]! += info; }
        if (ki !== undefined && kj !== undefined) { h[ki]![kj]! -= info; h[kj]![ki]! -= info; }
      }
    }
    free.forEach((i, k) => { g[k]! -= theta[i]! / (tau * tau); h[k]![k]! += 1 / (tau * tau); });
    return { H: h, g };
  };
  for (it = 0; it < (opt.maxIter ?? 100); it++) {
    const { H: h, g } = hessGrad();
    H = h;
    if (free.length === 0) { converged = true; break; }
    const step = solve(h, g);                       // h is the NEGATIVE Hessian: θ += h⁻¹ g
    let maxStep = 0;
    free.forEach((i, k) => { const s = Math.max(-2, Math.min(2, step[k]!)); theta[i]! += s; maxStep = Math.max(maxStep, Math.abs(s)); });
    if (maxStep < 1e-9) { converged = true; H = hessGrad().H; break; }
  }
  const cov = free.length ? invert(H) : [];
  const ratings = new Map<string, Rating>();
  for (let i = 0; i < P; i++) {
    const k = free.indexOf(i);
    const se = k < 0 ? 0 : Math.sqrt(Math.max(0, cov[k]![k]!)) * ELO;
    let wins = 0, losses = 0;
    for (let j = 0; j < P; j++) { wins += C.w[i]![j]!; losses += C.w[j]![i]!; }
    const rating = anchorRating + theta[i]! * ELO;
    ratings.set(C.names[i]!, { name: C.names[i]!, rating, se, lo: rating - 1.96 * se, hi: rating + 1.96 * se, games: wins + losses, wins, losses, rated: i === a0 || wins + losses > 0 });
  }
  return { ratings, iterations: it, converged };
}

/** Bootstrap CIs over mirror blocks: replaces each rating's lo/hi with the 2.5%/97.5% quantiles of `samples` refits. */
export function bootstrap(base: Fit, names: string[], games: Outcome[], opt: FitOptions, samples = 200, seed = 1): Fit {
  const blocks = new Map<string, Outcome[]>();
  for (const g of games) {
    const b = blocks.get(g.block);
    if (b) b.push(g); else blocks.set(g.block, [g]);
  }
  const list = [...blocks.values()];
  const r = rng(seed, 'ladder-bootstrap');
  const draws = new Map<string, number[]>();
  for (let s = 0; s < samples; s++) {
    const sample: Outcome[] = [];
    for (let k = 0; k < list.length; k++) sample.push(...(list[r.int(list.length)] as Outcome[]));
    const f = fit(names, sample, opt);
    for (const [n, v] of f.ratings) {
      const d = draws.get(n);
      if (d) d.push(v.rating); else draws.set(n, [v.rating]);
    }
  }
  const q = (xs: number[], p: number): number => {
    const s = [...xs].sort((x, y) => x - y);
    const pos = (s.length - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos);
    return s[lo]! + (s[hi]! - s[lo]!) * (pos - lo);
  };
  const ratings = new Map<string, Rating>();
  for (const [n, v] of base.ratings) {
    const d = draws.get(n) ?? [v.rating];
    while (d.length < samples) d.push(1500);           // a player absent from a resample is at the prior
    ratings.set(n, { ...v, lo: q(d, 0.025), hi: q(d, 0.975), se: (q(d, 0.975) - q(d, 0.025)) / (2 * 1.96) });
  }
  return { ...base, ratings };
}
