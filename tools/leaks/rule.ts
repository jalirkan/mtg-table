// mtg-table — the leak report's pre-registered honesty rule (D438, J129).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Pure: no I/O, no clock, no Math.random.  Every number the verdict depends on
// is a field of RULE, written before any of the owner's decisions was graded,
// and leaks.json carries RULE so a reader can check the arithmetic.
//
//   a MISTAKE  is one graded decision whose regret interval excludes zero:
//              regretLo > 0 (the post-game review's own "mistake", D353);
//   a LEAK     is a kind with at least 5 mistakes, in at least 3 different
//              games, and a mean regret over ALL its graded decisions whose 95%
//              interval excludes zero (its lower end above 0);
//   anything else is "not shown".
//
// The mean's interval is a parametric game-cluster bootstrap: each resample
// draws the kind's games with replacement and, for every decision in them,
// a regret from that decision's own interval, Normal(regret, se) with
// se = (regretHi - regretLo) / (2 * 1.959964), not clamped at 0.  So the
// interval carries both the spread between games and each decision's own
// measurement noise; a percentile interval of the point regrets alone would
// exclude zero for any kind with a few positive regrets, because a review's
// regret is >= 0 by construction (best minus played, the best picked on the
// same noisy numbers).

export const RULE = Object.freeze({
  /** A decision is a mistake when its regretLo is above this. */
  mistakeLoAbove: 0,
  /** A leak needs at least this many mistakes of its kind ... */
  minMistakes: 5,
  /** ... in at least this many different games ... */
  minGames: 3,
  /** ... and its mean regret's interval at this level above zero. */
  level: 0.95,
  bootstrapB: 10000,
  bootstrapSeed: 129,
  /** The classifier's "open mana": the opponent has at least this many untapped lands. */
  openManaMin: 2,
  /** Example moments listed per leak. */
  examples: 5,
});

/** The review settings J129 grades with (coach-grade.sh review's flags), fixed before the run. */
export const REVIEW = Object.freeze({
  triageS: 60,
  deepK: 50,
  deepS: 600,
  deepOptions: 5,
  seed: 1,
});

const Z975 = 1.959963984540054;

export interface GradedRow {
  game: string;
  regret: number;
  regretLo: number;
  regretHi: number;
}

export interface KindStats {
  n: number;
  games: number;
  mistakes: number;
  mistakeGames: number;
  meanRegret: number | null;
  meanLo: number | null;
  meanHi: number | null;
  leak: 0 | 1;
}

export function isMistake(r: { regretLo: number }): boolean {
  return Number.isFinite(r.regretLo) && r.regretLo > RULE.mistakeLoAbove;
}

/** The rule's last step, on the three numbers it reads. An interval touching zero is not above it. */
export function isLeak(s: { mistakes: number; mistakeGames: number; meanLo: number | null }): boolean {
  return s.mistakes >= RULE.minMistakes && s.mistakeGames >= RULE.minGames && s.meanLo !== null && s.meanLo > 0;
}

/** mulberry32: a small seeded generator, the same stream on every machine. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(next: () => number): number {
  // Box-Muller; u1 is never 0
  const u1 = (Math.floor(next() * 4294967295) + 1) / 4294967296;
  const u2 = next();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** The decision's own standard error, read off its 95% interval. */
export function seOf(r: GradedRow): number {
  const w = r.regretHi - r.regretLo;
  return Number.isFinite(w) && w > 0 ? w / (2 * Z975) : 0;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = sorted[lo] as number;
  const b = sorted[hi] as number;
  return a + (b - a) * (pos - lo);
}

/** The kind's mean regret and its parametric game-cluster bootstrap interval (see the header). */
export function meanInterval(rows: GradedRow[], b: number = RULE.bootstrapB, seed: number = RULE.bootstrapSeed):
    { mean: number | null; lo: number | null; hi: number | null } {
  if (rows.length === 0) return { mean: null, lo: null, hi: null };
  const mean = rows.reduce((s, r) => s + r.regret, 0) / rows.length;
  const byGame = new Map<string, GradedRow[]>();
  for (const r of rows) {
    const g = byGame.get(r.game);
    if (g) g.push(r);
    else byGame.set(r.game, [r]);
  }
  const games = [...byGame.keys()].sort();
  const next = rng(seed);
  const means: number[] = [];
  for (let i = 0; i < b; i++) {
    let sum = 0;
    let n = 0;
    for (let j = 0; j < games.length; j++) {
      const g = games[Math.floor(next() * games.length)] as string;
      for (const r of byGame.get(g) as GradedRow[]) {
        sum += r.regret + seOf(r) * normal(next);
        n++;
      }
    }
    means.push(sum / n);
  }
  means.sort((x, y) => x - y);
  const tail = (1 - RULE.level) / 2;
  return { mean, lo: quantile(means, tail), hi: quantile(means, 1 - tail) };
}

const round = (x: number | null): number | null => (x === null ? null : Math.round(x * 1e6) / 1e6);

/** Every number of one kind, and the verdict, from its graded decisions. */
export function kindStats(rows: GradedRow[], b: number = RULE.bootstrapB, seed: number = RULE.bootstrapSeed): KindStats {
  const mistakes = rows.filter(isMistake);
  const iv = meanInterval(rows, b, seed);
  const s = {
    n: rows.length,
    games: new Set(rows.map((r) => r.game)).size,
    mistakes: mistakes.length,
    mistakeGames: new Set(mistakes.map((r) => r.game)).size,
    meanRegret: round(iv.mean),
    meanLo: round(iv.lo),
    meanHi: round(iv.hi),
  };
  return { ...s, leak: isLeak(s) ? 1 : 0 };
}

/**
 * What a verdict would need: the kind with the most mistakes, and at its rate per
 * graded game, about how many games in all before it could reach the rule's
 * counts (never fewer than minGames).  Null when no kind has a mistake.
 */
export function needed(byKind: Record<string, KindStats>, gamesGraded: number):
    { bestKindMistakes: number; bestKindMistakeGames: number; mistakesPerGame: number | null; gamesNeededAtBestRate: number | null } {
  let best: KindStats | null = null;
  for (const s of Object.values(byKind)) {
    if (!best || s.mistakes > best.mistakes || (s.mistakes === best.mistakes && s.mistakeGames > best.mistakeGames)) best = s;
  }
  const m = best?.mistakes ?? 0;
  const rate = gamesGraded > 0 && m > 0 ? m / gamesGraded : null;
  return {
    bestKindMistakes: m,
    bestKindMistakeGames: best?.mistakeGames ?? 0,
    mistakesPerGame: rate === null ? null : Math.round(rate * 1000) / 1000,
    gamesNeededAtBestRate: rate === null ? null : Math.max(RULE.minGames, Math.ceil(RULE.minMistakes / rate)),
  };
}
