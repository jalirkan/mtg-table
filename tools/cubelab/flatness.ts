// mtg-table — the cube lab: how flat a cube's power is, ForgeCoach's arithmetic (D441).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A port of ForgeCoach's `src/cube/flatness.ts` (its `spreadOf` / `cubeSpread`, at
// ForgeCoach@2f05b15; the file last changed in 968d4fc, "count games in their match
// clumps"), numbers only: no plain-language reading, histogram or comparison text.
// Both repositories are GPL-3.0-or-later.  The arithmetic is copied, not re-derived, so
// that `compare`'s card-rate flatness is the number ForgeCoach's spread view prints for
// the same meta.json; `fixtures/cubelab/compare/flatness-golden.json` holds ForgeCoach's
// own output on two metas and `web/test/cubelab-compare.test.ts` holds this file to it.
//
// In ForgeCoach's words, briefly: included units are cards (archetypes) with at least
// `minGames` (10; 5) decisive games; their shrunk win rates (wins + k·m)/(games + k)
// spread with an observed SD; the noise SD is what the shrunk rates would show if every
// unit had the prior's true rate m, the binomial at each unit's own game count times a
// Kish design effect 1 + (c − 1)·ρ for its games per clump c (games / inDecks; ρ = 0.35),
// or scaled to the lab's permutation-null SD when meta.json carries one (mtg-table's
// meta.json carries none); the TRUE SD is the observed variance less the noise variance,
// floored at 0, divided by the mean of (g/(g+k))² to undo the shrinkage; its interval is
// the chi-square interval on the observed variance less the noise (the low end with the
// clumped noise, the high end with the independent-games noise when the design effect is
// assumed).  Verdict: flat when the interval's top is at most 3 points, uneven when its
// bottom is above 3, else unclear; fewer than 12 units, unreadable.
//
// Do not "fix" anything here without the same change in ForgeCoach: the golden test
// would fail, and the two numbers would stop being one number.

/** A true SD at or under this many points counts as flat. */
export const FLAT_SD = 0.03;
export const ABOVE_MARGIN = 0.05;
export const CARD_MIN_GAMES = 10;
export const ARCHETYPE_MIN_GAMES = 5;
/** Fewer included units than this: no verdict. */
export const MIN_UNITS = 12;
/** Correlation between two games of one match (the clumping), used when the lab gives no empirical noise. */
export const MATCH_ICC = 0.35;
/** The design effect for a unit whose clump size is unknown (no inDecks / decks count). */
export const DEFAULT_DESIGN_EFFECT = 1.5;

/** Kish's design effect for a unit with `games` games in `clumps` matches: 1 + (c − 1)·ρ, else the default. */
export function designEffectOf(games: number, clumps: number | null | undefined, icc = MATCH_ICC): number {
  if (!clumps || clumps <= 0 || !(games > 0)) return DEFAULT_DESIGN_EFFECT;
  return 1 + Math.max(0, games / clumps - 1) * icc;
}

export type NoiseSource = 'empirical' | 'clumps' | 'default';
export type Verdict = 'flat' | 'uneven' | 'unclear' | 'unreadable';

export interface SpreadUnit {
  name: string;
  games: number;
  wins: number;
  /** The shrunk win rate. */
  shrunk: number;
  /** How many matches (decks) the games came in, when known. */
  clumps?: number | null;
}

/** ForgeCoach's SpreadStats, numbers only (no units list, outliers or interval-side counts). */
export interface SpreadStats {
  total: number;
  n: number;
  minGames: number;
  meanRate: number;
  sd: number;
  q1: number;
  q3: number;
  iqr: number;
  aboveShare: number;
  aboveCount: number;
  noiseAboveShare: number;
  noiseSd: number;
  binomialNoiseSd: number;
  designEffect: number;
  noiseSource: NoiseSource;
  excessVar: number;
  trueSd: number;
  trueSdCi: [number, number];
  verdict: Verdict;
}

const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);

const Z: Record<number, number> = { 0.025: -1.959964, 0.975: 1.959964 };

/** Chi-square quantile by the Wilson–Hilferty approximation (p = 0.025 or 0.975). */
function chi2Quantile(p: 0.025 | 0.975, nu: number): number {
  const c = 2 / (9 * nu);
  return nu * Math.pow(1 - c + (Z[p] as number) * Math.sqrt(c), 3);
}

/** Standard normal upper tail P(Z > z) (Abramowitz–Stegun 7.1.26). */
export function normalTail(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  const upper = 0.5 * (1 - erf);
  return z >= 0 ? upper : 1 - upper;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return (sorted[lo] as number) + ((sorted[hi] as number) - (sorted[lo] as number)) * (pos - lo);
}

const binomVar = (u: SpreadUnit, m: number, k: number): number => (u.games * m * (1 - m)) / (u.games + k) ** 2;

function noiseVars(units: SpreadUnit[], m: number, k: number, opts: { designEffect?: number; noiseSdEmpirical?: number | null }): { vars: number[]; source: NoiseSource; binom: number } {
  const binom = units.map((u) => binomVar(u, m, k));
  const meanBinom = binom.reduce((s, x) => s + x, 0) / Math.max(1, units.length);
  const emp = opts.noiseSdEmpirical;
  if (typeof emp === 'number' && Number.isFinite(emp) && emp > 0 && meanBinom > 0) {
    const f = (emp * emp) / meanBinom;
    return { vars: binom.map((v) => v * f), source: 'empirical', binom: meanBinom };
  }
  if (typeof opts.designEffect === 'number') return { vars: binom.map((v) => v * Math.max(1, opts.designEffect as number)), source: 'default', binom: meanBinom };
  const known = units.some((u) => u.clumps && u.clumps > 0);
  return { vars: units.map((u, i) => (binom[i] as number) * designEffectOf(u.games, u.clumps)), source: known ? 'clumps' : 'default', binom: meanBinom };
}

function moments(units: SpreadUnit[], noise: number[], k: number): { obsVar: number; noiseVar: number; excess: number; trueSd: number; lam2: number } {
  const n = units.length;
  const mean = units.reduce((s, u) => s + u.shrunk, 0) / n;
  const obsVar = n > 1 ? units.reduce((s, u) => s + (u.shrunk - mean) ** 2, 0) / (n - 1) : 0;
  const noiseVar = noise.reduce((s, v) => s + v, 0) / n;
  const lam2 = units.reduce((s, u) => s + (u.games / (u.games + k)) ** 2, 0) / n;
  const excess = Math.max(0, obsVar - noiseVar);
  return { obsVar, noiseVar, excess, trueSd: lam2 > 0 ? Math.sqrt(excess / lam2) : 0, lam2 };
}

export interface SpreadOf {
  minGames: number;
  priorMean: number;
  priorStrength: number;
  designEffect?: number;
  noiseSdEmpirical?: number | null;
}

/** The spread statistics for a list of units (ForgeCoach's `spreadOf`). Null when no unit has games. */
export function spreadOf(all: SpreadUnit[], opts: SpreadOf): SpreadStats | null {
  const { minGames, priorMean: m, priorStrength: k } = opts;
  const withGames = all.filter((u) => u.games > 0);
  const units = withGames.filter((u) => u.games >= minGames).sort((a, b) => a.shrunk - b.shrunk || a.name.localeCompare(b.name));
  const n = units.length;
  if (n === 0) return null;
  const rates = units.map((u) => u.shrunk);
  const meanRate = rates.reduce((s, x) => s + x, 0) / n;
  const nv = noiseVars(units, m, k, opts);
  const mo = moments(units, nv.vars, k);
  const q1 = quantile(rates, 0.25);
  const q3 = quantile(rates, 0.75);
  const aboveCount = units.filter((u) => u.shrunk > meanRate + ABOVE_MARGIN).length;
  const noiseAboveShare = nv.vars.reduce((s, v) => s + normalTail(ABOVE_MARGIN / Math.sqrt(v)), 0) / n;
  const lam2 = mo.lam2;
  const nu = n - 1;
  const noiseHi = mo.noiseVar;
  const noiseLo = nv.source === 'empirical' ? mo.noiseVar : Math.min(mo.noiseVar, nv.binom);
  const trueSdCi: [number, number] =
    nu >= 1 && lam2 > 0
      ? [
          Math.sqrt(Math.max(0, (mo.obsVar * nu) / chi2Quantile(0.975, nu) - noiseHi) / lam2),
          Math.sqrt(Math.max(0, (mo.obsVar * nu) / chi2Quantile(0.025, nu) - noiseLo) / lam2),
        ]
      : [0, 1];
  trueSdCi[0] = Math.min(trueSdCi[0], mo.trueSd);
  trueSdCi[1] = Math.max(trueSdCi[1], mo.trueSd);
  let verdict: Verdict;
  if (n < MIN_UNITS) verdict = 'unreadable';
  else if (trueSdCi[1] <= FLAT_SD) verdict = 'flat';
  else if (trueSdCi[0] > FLAT_SD) verdict = 'uneven';
  else verdict = 'unclear';
  return {
    total: withGames.length, n, minGames, meanRate, sd: Math.sqrt(mo.obsVar), q1, q3, iqr: q3 - q1,
    aboveShare: aboveCount / n, aboveCount, noiseAboveShare, noiseSd: Math.sqrt(mo.noiseVar), binomialNoiseSd: Math.sqrt(nv.binom),
    designEffect: nv.binom > 0 ? mo.noiseVar / nv.binom : 1, noiseSource: nv.source, excessVar: mo.excess, trueSd: mo.trueSd, trueSdCi, verdict,
  };
}

/** The part of a meta.json (schema 1, meta.ts) the spread reads. */
export interface SpreadMeta {
  sample?: { shrinkage?: { mean?: unknown; strength?: unknown } };
  cards: Record<string, { games?: unknown; wins?: unknown; winRate?: unknown; winRateShrunk?: unknown; inDecks?: unknown }>;
  archetypes: Array<{ id: string; games?: unknown; winRate?: unknown; winRateShrunk?: unknown; decks?: unknown }>;
  noise?: { sdEmpirical?: unknown; archetypeSdEmpirical?: unknown; minGames?: unknown; archetypeMinGames?: unknown };
}

const shrinkRate = (winRate: number, games: number, strength: number, mean: number): number => (winRate * games + strength * mean) / (games + strength);

/** The prior the lab used: sample.shrinkage, else 20 games on the games-weighted mean raw rate (ForgeCoach's priorOf). */
export function priorOf(meta: SpreadMeta): { mean: number; strength: number } {
  const sh = meta.sample?.shrinkage;
  const strength = num(sh?.strength) ?? 20;
  const mean = num(sh?.mean);
  if (mean !== null) return { mean, strength };
  let g = 0;
  let w = 0;
  for (const c of Object.values(meta.cards)) {
    const games = num(c.games) ?? 0;
    g += games;
    w += num(c.wins) ?? (num(c.winRate) ?? 0) * games;
  }
  return { mean: g > 0 ? w / g : 0.5, strength };
}

/** Card-level and archetype-level spread of one meta (ForgeCoach's `cubeSpread`, default options). */
export function cubeSpread(meta: SpreadMeta, opts: { cardMinGames?: number; archetypeMinGames?: number; designEffect?: number } = {}): { cards: SpreadStats | null; archetypes: SpreadStats | null } {
  const prior = priorOf(meta);
  const cardUnits: SpreadUnit[] = [];
  for (const [name, c] of Object.entries(meta.cards)) {
    const games = num(c.games) ?? 0;
    if (games <= 0) continue;
    const raw = num(c.winRate);
    const wins = num(c.wins) ?? (raw !== null ? raw * games : null);
    const shrunk = num(c.winRateShrunk) ?? (raw !== null ? shrinkRate(raw, games, prior.strength, prior.mean) : null);
    if (shrunk === null || wins === null) continue;
    cardUnits.push({ name, games, wins, shrunk, clumps: num(c.inDecks) });
  }
  const archUnits: SpreadUnit[] = [];
  for (const a of meta.archetypes) {
    const games = num(a.games) ?? 0;
    const raw = num(a.winRate);
    if (games <= 0 || raw === null) continue;
    const shrunk = num(a.winRateShrunk) ?? shrinkRate(raw, games, prior.strength, prior.mean);
    archUnits.push({ name: a.id, games, wins: raw * games, shrunk, clumps: num(a.decks) });
  }
  const base = { priorMean: prior.mean, priorStrength: prior.strength, designEffect: opts.designEffect };
  const cardMin = opts.cardMinGames ?? CARD_MIN_GAMES;
  const archMin = opts.archetypeMinGames ?? ARCHETYPE_MIN_GAMES;
  const nz = opts.designEffect === undefined ? meta.noise : undefined;
  const fits = (want: number, got: unknown): boolean => num(got) === null || num(got) === want;
  return {
    cards: spreadOf(cardUnits, { ...base, minGames: cardMin, noiseSdEmpirical: fits(cardMin, nz?.minGames) ? num(nz?.sdEmpirical) : null }),
    archetypes: spreadOf(archUnits, { ...base, minGames: archMin, noiseSdEmpirical: fits(archMin, nz?.archetypeMinGames) ? num(nz?.archetypeSdEmpirical) : null }),
  };
}

/**
 * Not in ForgeCoach (an addition for `compare`'s bootstrap, D441): the parts `spreadOf` combines --
 * the included units, the observed variance of their shrunk rates, the mean noise variance and the
 * mean (g/(g+k))² -- with the same inclusion rule and noise model, so a caller can form
 * (obsVar − c·noiseVar) / lam2 for c other than 1.  Null when no unit is included.
 */
export function spreadParts(all: SpreadUnit[], opts: SpreadOf): { n: number; obsVar: number; noiseVar: number; lam2: number } | null {
  const units = all.filter((u) => u.games > 0 && u.games >= opts.minGames).sort((a, b) => a.shrunk - b.shrunk || a.name.localeCompare(b.name));
  if (units.length === 0) return null;
  const nv = noiseVars(units, opts.priorMean, opts.priorStrength, opts);
  const mo = moments(units, nv.vars, opts.priorStrength);
  return { n: units.length, obsVar: mo.obsVar, noiseVar: mo.noiseVar, lam2: mo.lam2 };
}
