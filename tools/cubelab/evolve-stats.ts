// mtg-table — the cube lab: `evolve`'s statistics — p-values, false-discovery control, confirmation, clustering.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Pure arithmetic for the evolve loop's two-stage rule (D326):
//
//   - one-sided binomial tail p-values (exact, through the regularised incomplete
//     beta, so a fractional "effective" count works too);
//   - Benjamini–Hochberg over a generation's family of tests (discovery), and
//     Holm over the candidates' fresh-seed tests (confirmation);
//   - the design effect of a card's games: they come in matches of about 2.4
//     games of one deck against one opponent, so the unit is the deck, and the
//     variance of a win rate over n games is D times the binomial one;
//   - the sample size a one-sided test needs for a given power.
//
// No engine, no file system, no randomness.

/** Φ(x), the standard normal CDF, through erfc (Numerical Recipes' erfcc: fractional error under 1.2e-7 everywhere). */
export function normalCdf(x: number): number {
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.5 * z);
  const erfc = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806
    + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? 1 - erfc / 2 : erfc / 2;
}

/** Φ⁻¹(p) (Acklam's rational approximation, relative error under 1.2e-9). */
export function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  const poly = (k: number[], x: number): number => k.reduce((s, v) => s * x + v, 0);
  if (p < lo) { const q = Math.sqrt(-2 * Math.log(p)); return poly(c, q) / (poly(d, q) * q + 1); }
  if (p > 1 - lo) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -poly(c, q) / (poly(d, q) * q + 1); }
  const q = p - 0.5, r = q * q;
  return (poly(a, r) * q) / (poly(b, r) * r + 1);
}

function logGamma(x: number): number {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (const v of g) ser += v / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/** The continued fraction of the incomplete beta (Numerical Recipes' betacf). */
function betacf(a: number, b: number, x: number): number {
  const TINY = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-14) break;
  }
  return h;
}

/** I_x(a, b), the regularised incomplete beta function, for a, b > 0. */
export function incBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/**
 * P(X ≥ k) for X ~ Binomial(n, p): I_p(k, n − k + 1).  k and n may be
 * fractional (an effective count after a design effect); the beta form is the
 * smooth extension, exact at whole numbers.
 */
export function binomUpper(k: number, n: number, p: number): number {
  if (k <= 0) return 1;
  if (k > n) return 0;
  return Math.min(1, Math.max(0, incBeta(p, k, n - k + 1)));
}

/** P(X ≤ k) for X ~ Binomial(n, p). */
export function binomLower(k: number, n: number, p: number): number {
  if (k >= n) return 1;
  if (k < 0) return 0;
  return 1 - binomUpper(k + 1, n, p);
}

export interface FdrResult {
  /** Rejected (a discovery), index for index with the input. */
  reject: boolean[];
  /** BH-adjusted p-values (q-values). */
  q: number[];
  /** The largest p-value rejected (0 when none is): every p at or under it is a discovery. */
  cutoff: number;
}

/** Benjamini–Hochberg at level q: the false-discovery rate is at most q (independent or positively dependent tests). */
export function benjaminiHochberg(ps: number[], q: number): FdrResult {
  const m = ps.length;
  const order = ps.map((p, i) => [p, i] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let kMax = -1;
  order.forEach(([p], r) => { if (p <= ((r + 1) / m) * q) kMax = r; });
  const cutoff = kMax >= 0 ? (order[kMax] as readonly [number, number])[0] : 0;
  const adj = new Array<number>(m).fill(1);
  let run = 1;
  for (let r = m - 1; r >= 0; r--) {
    const [p, i] = order[r] as readonly [number, number];
    run = Math.min(run, (p * m) / (r + 1));
    adj[i] = Math.min(1, run);
  }
  return { reject: ps.map((_, i) => kMax >= 0 && (adj[i] as number) <= q && (ps[i] as number) <= cutoff), q: adj, cutoff };
}

/** Holm's step-down at level alpha: the chance of any false rejection is at most alpha, under any dependence. */
export function holm(ps: number[], alpha: number): { reject: boolean[]; adjusted: number[] } {
  const m = ps.length;
  const order = ps.map((p, i) => [p, i] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const adjusted = new Array<number>(m).fill(1);
  let run = 0;
  order.forEach(([p, i], r) => { run = Math.max(run, Math.min(1, (m - r) * p)); adjusted[i] = run; });
  return { reject: adjusted.map((a) => a <= alpha), adjusted };
}

/** A played deck's decisive games in its match, and its wins. */
export interface DeckGames { games: number; wins: number }

/**
 * The design effect of a game-level win rate when games come in decks: D =
 * Σ(wᵢ − p̄·nᵢ)² / (p̄(1 − p̄)·Σnᵢ) over every played deck, p̄ the pooled rate.
 * A win rate over n games has the variance of one over n / D independent
 * games.  D is 1 for independent games, best-of-three's stopping included (a
 * 2–0 and a 2–1 carry the binomial variance exactly), and grows with how much
 * decks differ in strength.  At least 1: a lower estimate is noise.
 */
export function designEffect(decks: DeckGames[]): number {
  const n = decks.reduce((s, d) => s + d.games, 0);
  if (n === 0) return 1;
  const p = decks.reduce((s, d) => s + d.wins, 0) / n;
  if (p <= 0 || p >= 1) return 1;
  const ss = decks.reduce((s, d) => s + (d.wins - p * d.games) ** 2, 0);
  return Math.max(1, ss / (p * (1 - p) * n));
}

/**
 * Observations a one-sided test at level alpha needs to tell p1 from the null
 * boundary p0 with the given power (normal approximation).  Infinity when p1
 * is on the null's side.
 */
export function requiredN(p0: number, p1: number, alpha: number, power: number): number {
  const gap = Math.abs(p1 - p0);
  if (gap === 0) return Infinity;
  const za = normalQuantile(1 - alpha);
  const zb = normalQuantile(power);
  const num = za * Math.sqrt(p0 * (1 - p0)) + zb * Math.sqrt(p1 * (1 - p1));
  return num <= 0 ? 1 : Math.ceil((num / gap) ** 2);
}
