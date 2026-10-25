// mtg-table — the cube lab: the move atlas's arithmetic (D451), pure and engine-free.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A branch game ends in a result from the atlas seat's side: 1 a win, 0.5 a draw (the turn cap, a
// drawn game), 0 a loss.  An option's value under a continuation is the mean over its branches, with a
// Wilson interval on (wins + draws / 2) of n.  Branch i of every option shares its seed (the same redeal,
// engine stream and random seats' draws), so options are compared PAIRED, branch by branch:
//
//   regret = max over options of the mean - the mean of the option played (option 0, Forge's answer in
//            the baseline game), with a 95% interval from a paired bootstrap over branches (the whole
//            vector of options resampled together).  The max is taken after the fact, so the point value
//            leans high on noisy options; the interval is the honest part.
//   the two maps' agreement at a decision = Spearman's rank correlation between the options' means under
//            the random continuation and under Forge's, with a bootstrap interval (each continuation's
//            branches resampled on their own); and whether the two name the same best option.
//
// Phase A: the outcome distribution of random-vs-random games from the opening, the game length, and how
// many games put a 95% interval of +/- 2 points on the first seat's score (n = 1.96^2 * var / 0.02^2, the
// variance of the per-game score, draws counted half).
//
// The deck pair (--pair auto): the line of tools/ai-bench/pairs-confirm.txt with the most ladder games and
// the most even record, as ONE rule: the smallest |p - 1/2| + 1.96 * sqrt(p (1 - p) / n), p the A deck's
// share of the decisive games (every pilot, both seats) -- the pair we are most sure is even.  Ties: more
// games, then the earlier line.

import { rng } from './rng.ts';

export const Z = 1.959963984540054;

export interface ScoreStat { n: number; wins: number; draws: number; losses: number; mean: number | null; lo: number | null; hi: number | null }

const r4 = (x: number): number => Math.round(x * 1e4) / 1e4;

/** Wilson's 95% interval for `k` of `n` (k may be fractional: draws count half). */
export function wilson(k: number, n: number): { lo: number | null; hi: number | null } {
  if (n <= 0) return { lo: null, hi: null };
  const p = k / n;
  const d = 1 + (Z * Z) / n;
  const c = (p + (Z * Z) / (2 * n)) / d;
  const h = (Z * Math.sqrt((p * (1 - p)) / n + (Z * Z) / (4 * n * n))) / d;
  return { lo: r4(Math.max(0, c - h)), hi: r4(Math.min(1, c + h)) };
}

/** A result (+1 / 0 / -1, the atlas seat's side) as a score (1 / 0.5 / 0). */
export const scoreOf = (result: number): number => (result > 0 ? 1 : result < 0 ? 0 : 0.5);

export function scoreStat(scores: number[]): ScoreStat {
  const wins = scores.filter((s) => s === 1).length;
  const losses = scores.filter((s) => s === 0).length;
  const draws = scores.length - wins - losses;
  const n = scores.length;
  const k = wins + draws / 2;
  return { n, wins, draws, losses, mean: n ? r4(k / n) : null, ...wilson(k, n) };
}

/** Average ranks (1-based), ties sharing their mean rank. */
export function ranks(xs: number[]): number[] {
  const idx = xs.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(xs.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && (idx[j + 1] as readonly [number, number])[0] === (idx[i] as readonly [number, number])[0]) j++;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[(idx[k] as readonly [number, number])[1]] = r;
    i = j + 1;
  }
  return out;
}

/** Spearman's rank correlation (Pearson's on average ranks); null when either side is constant or n < 2. */
export function spearman(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 2) return null;
  const rx = ranks(x), ry = ranks(y);
  const mx = rx.reduce((a, b) => a + b, 0) / rx.length, my = ry.reduce((a, b) => a + b, 0) / ry.length;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < rx.length; i++) {
    const a = (rx[i] as number) - mx, b = (ry[i] as number) - my;
    sxy += a * b; sxx += a * a; syy += b * b;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

/** The `q` quantile of an ascending list, linear between neighbours; null when empty. */
export function quantile(sorted: number[], q: number): number | null {
  if (!sorted.length) return null;
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return (sorted[lo] as number) + ((sorted[hi] as number) - (sorted[lo] as number)) * (pos - lo);
}

/** Column means of a [branch][option] matrix of scores (NaN = missing). */
export function means(m: number[][], options: number): Array<number | null> {
  const out: Array<number | null> = [];
  for (let o = 0; o < options; o++) {
    let s = 0, n = 0;
    for (const row of m) { const v = row[o]; if (v !== undefined && !Number.isNaN(v)) { s += v; n++; } }
    out.push(n ? s / n : null);
  }
  return out;
}

/** max of the means - the mean of option `chosen`; null when anything is missing. */
export function regretOf(mean: Array<number | null>, chosen = 0): { regret: number | null; best: number | null } {
  if (mean.some((x) => x === null) || mean.length === 0) return { regret: null, best: null };
  let best = 0;
  for (let o = 1; o < mean.length; o++) if ((mean[o] as number) > (mean[best] as number)) best = o;
  return { regret: (mean[best] as number) - (mean[chosen] as number), best };
}

/** The regret and a paired bootstrap 95% interval over branches (rows of `m`). */
export function regretInterval(m: number[][], options: number, boot: number, seed: number, chosen = 0): { regret: number | null; best: number | null; lo: number | null; hi: number | null } {
  const point = regretOf(means(m, options), chosen);
  if (point.regret === null || m.length < 2) return { ...point, lo: null, hi: null };
  const r = rng(seed, 'atlas/regret');
  const xs: number[] = [];
  for (let b = 0; b < boot; b++) {
    const sample: number[][] = [];
    for (let i = 0; i < m.length; i++) sample.push(m[r.int(m.length)] as number[]);
    const g = regretOf(means(sample, options), chosen).regret;
    if (g !== null) xs.push(g);
  }
  xs.sort((a, b) => a - b);
  const q = (p: number): number | null => { const v = quantile(xs, p); return v === null ? null : r4(v); };
  return { regret: r4(point.regret), best: point.best, lo: q(0.025), hi: q(0.975) };
}

/** Spearman between two continuations' option means, with a bootstrap interval (each side's branches resampled). */
export function agreement(ma: number[][], mb: number[][], options: number, boot: number, seed: number): { rho: number | null; lo: number | null; hi: number | null; sameBest: boolean | null } {
  const a = means(ma, options), b = means(mb, options);
  if (a.some((x) => x === null) || b.some((x) => x === null)) return { rho: null, lo: null, hi: null, sameBest: null };
  const rho = spearman(a as number[], b as number[]);
  const ba = regretOf(a).best, bb = regretOf(b).best;
  const r = rng(seed, 'atlas/agreement');
  const xs: number[] = [];
  if (ma.length >= 2 && mb.length >= 2) {
    for (let k = 0; k < boot; k++) {
      const sa: number[][] = [], sb: number[][] = [];
      for (let i = 0; i < ma.length; i++) sa.push(ma[r.int(ma.length)] as number[]);
      for (let i = 0; i < mb.length; i++) sb.push(mb[r.int(mb.length)] as number[]);
      const v = spearman(means(sa, options) as number[], means(sb, options) as number[]);
      if (v !== null) xs.push(v);
    }
  }
  xs.sort((x, y) => x - y);
  const q = (p: number): number | null => { const v = quantile(xs, p); return v === null ? null : r4(v); };
  return { rho: rho === null ? null : r4(rho), lo: q(0.025), hi: q(0.975), sameBest: ba !== null && bb !== null ? ba === bb : null };
}

/** The mean of the per-decision values and a bootstrap interval over decisions. */
export function meanInterval(xs: number[], boot: number, seed: number): { mean: number | null; lo: number | null; hi: number | null; n: number } {
  if (!xs.length) return { mean: null, lo: null, hi: null, n: 0 };
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const r = rng(seed, 'atlas/mean');
  const bs: number[] = [];
  for (let k = 0; k < boot; k++) {
    let s = 0;
    for (let i = 0; i < xs.length; i++) s += xs[r.int(xs.length)] as number;
    bs.push(s / xs.length);
  }
  bs.sort((a, b) => a - b);
  return { mean: r4(mean), lo: xs.length > 1 ? r4(quantile(bs, 0.025) as number) : null, hi: xs.length > 1 ? r4(quantile(bs, 0.975) as number) : null, n: xs.length };
}

/** How many games put a 95% interval of +/- `halfWidth` on a mean whose per-game variance is `v`. */
export function gamesFor(v: number, halfWidth = 0.02): number {
  return Math.ceil((Z * Z * v) / (halfWidth * halfWidth));
}

export function variance(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1);
}

// ------------------------------------------------------------------
// The deck pair (--pair auto)
// ------------------------------------------------------------------

export interface LadderGame { pair: number; aDeck: string; bDeck: string; w: 'a' | 'b' | 'd'; set?: string }
export interface PairRow { pair: number; deckA: string; deckB: string; games: number; decisive: number; aWins: number; p: number | null; score: number | null }

/** The pairs file's lines (comments and blanks skipped), as [deckA, deckB]: the ladder's `pair` is the index here. */
export function pairLines(text: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const [a, b] = line.split(/\s+/);
    if (a && b) out.push([a, b]);
  }
  return out;
}

/** Every pair's ladder record, deck A's side, and the rule's score; sorted best first. */
export function rankPairs(pairs: Array<[string, string]>, games: LadderGame[], set = 'tools/ai-bench/pairs-confirm.txt'): PairRow[] {
  const rows: PairRow[] = pairs.map(([a, b], pair) => ({ pair, deckA: a, deckB: b, games: 0, decisive: 0, aWins: 0, p: null, score: null }));
  for (const g of games) {
    if (g.set !== undefined && g.set !== set) continue;
    const r = rows[g.pair];
    if (!r) continue;
    r.games++;
    if (g.w === 'd') continue;
    const winner = g.w === 'a' ? g.aDeck : g.bDeck;
    r.decisive++;
    if (winner === r.deckA) r.aWins++;
  }
  for (const r of rows) {
    if (r.decisive === 0) continue;
    const p = r.aWins / r.decisive;
    r.p = r4(p);
    r.score = r4(Math.abs(p - 0.5) + Z * Math.sqrt((p * (1 - p)) / r.decisive));
  }
  return [...rows].sort((x, y) => (x.score ?? Infinity) - (y.score ?? Infinity) || y.games - x.games || x.pair - y.pair);
}

/** Evenly spaced picks of `k` of `n` indices (all when k >= n). */
export function spread(n: number, k: number): number[] {
  if (k >= n) return Array.from({ length: n }, (_, i) => i);
  if (k <= 0) return [];
  if (k === 1) return [Math.floor((n - 1) / 2)];
  const out = new Set<number>();
  for (let j = 0; j < k; j++) out.add(Math.round((j * (n - 1)) / (k - 1)));
  return [...out].sort((a, b) => a - b);
}
