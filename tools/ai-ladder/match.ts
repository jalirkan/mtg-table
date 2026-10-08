// mtg-table — the AI ladder: a fixed-size paired match with an interval (D398).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// `match A B --games N` plays N games of A against B on the confirm set in
// mirrored deals (ai-bench --mirror, like `sprt`), with NO stopping rule, and
// reports A's score with a 95% interval, the same in Elo, and each side's
// search counters (decisions searched, answers changed, fallbacks to Forge's
// answer by reason) with a 95% interval on the budget-fallback rate.
//
// Why a fixed N and not an SPRT: when the plausible effect is below any elo1
// worth testing (the outside review on J089: recovering budget fallbacks is
// worth ~10–13 Elo against an elo1 of 20), an SPRT spends its game limit to say
// H0. A fixed match says how big the effect is, within an interval, at a cost
// known before the run.
//
// The unit of evidence is the mirrored PAIR (sprt.ts's pairScores: A's share of
// the pair's decisive games, 0, ½ or 1), so the two correlated games of a deal
// count once. The interval is the normal one on the pairs' mean,
// x̄ ± z·s/√N with s the pairs' sample SD; the Elo interval maps its two ends
// through the logistic scale the ratings use (rating.ts), so it is not
// symmetric. With fewer than 2 pairs there is no interval.
//
// The fallback rate's interval is a ratio estimator clustered by GAME (one
// game's decisions share a board and a clock): r = Σb/Σc, its variance
// Σ(b_i − r·c_i)² / (Σc)² · n/(n−1) over the n games that searched.

import { existsSync, readFileSync } from 'node:fs';

import { score, type PairScore } from './sprt.ts';

/** Elo from a score on the logistic scale; ±Infinity at 0 and 1. */
export function eloOf(s: number): number {
  if (s <= 0) return -Infinity;
  if (s >= 1) return Infinity;
  return -400 * Math.log10(1 / s - 1) + 0;   // + 0: no -0 at 50%
}

export interface MatchSummary {
  pairs: number;
  games: number;
  /** A's mean pair score. */
  score: number;
  se: number | null;
  lo: number | null;
  hi: number | null;
  elo: number;
  eloLo: number | null;
  eloHi: number | null;
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

export function matchSummary(ps: PairScore[], z = 1.96): MatchSummary {
  const n = ps.length;
  const games = ps.reduce((t, q) => t + q.games, 0);
  if (n === 0) return { pairs: 0, games, score: 0.5, se: null, lo: null, hi: null, elo: 0, eloLo: null, eloHi: null };
  const m = ps.reduce((t, q) => t + q.x, 0) / n;
  if (n < 2) return { pairs: n, games, score: m, se: null, lo: null, hi: null, elo: eloOf(m), eloLo: null, eloHi: null };
  const v = ps.reduce((t, q) => t + (q.x - m) * (q.x - m), 0) / (n - 1);
  const se = Math.sqrt(v / n);
  const lo = clamp01(m - z * se), hi = clamp01(m + z * se);
  return { pairs: n, games, score: m, se, lo, hi, elo: eloOf(m), eloLo: eloOf(lo), eloHi: eloOf(hi) };
}

/** A rough planning number: the pairs a fixed match needs for a 95% interval of ±`halfElo` Elo near 50%, given the pair scores' SD. */
export function pairsForHalfWidth(halfElo: number, sd: number, z = 1.96): number {
  const d = score(halfElo) - 0.5;
  return Math.ceil(Math.pow((z * sd) / d, 2));
}

// ---------------------------------------------------------------- the search's counters

export interface SearchTally {
  /** Games whose seat searched at least once. */
  games: number;
  /** Decisions searched (search.{p,a,b}.considered). */
  searched: number;
  /** Searched decisions where the search changed Forge's answer (search.{p,a,b}.changed). */
  changed: number;
  /** Fallbacks to Forge's answer, by reason (search.fallback.<reason>). */
  fallback: Record<string, number>;
  /** Per game: [searched, budget fallbacks], for the clustered interval. */
  perGame: Array<[number, number]>;
  /**
   * D416: per decision kind (p priority, a attacks, b blocks, m keep/mulligan, k the London bottom, t targets),
   * decisions searched (`search.<kind>.considered`) and changed (`search.<kind>.changed`), summed over every game.
   * `searched` and `changed` above stay p + a + b, as J102 counted them.
   */
  byKind: Record<string, { searched: number; changed: number }>;
}

/** The decision kinds the search counts (D312, D416). */
export const SEARCH_KINDS = ['p', 'a', 'b', 'm', 'k', 't'] as const;

export const emptyTally = (): SearchTally => ({ games: 0, searched: 0, changed: 0, fallback: {}, perGame: [], byKind: {} });

/** One seat's counters from an ai-bench line (`aStats.counts` / `bStats.counts`) into the tally. */
export function addCounts(t: SearchTally, counts: Record<string, unknown> | undefined): void {
  if (!counts) return;
  const n = (k: string): number => (typeof counts[k] === 'number' ? counts[k] as number : 0);
  for (const k of SEARCH_KINDS) {
    const c = n(`search.${k}.considered`), x = n(`search.${k}.changed`);
    if (c === 0 && x === 0) continue;
    const e = t.byKind[k] ?? (t.byKind[k] = { searched: 0, changed: 0 });
    e.searched += c;
    e.changed += x;
  }
  const searched = n('search.p.considered') + n('search.a.considered') + n('search.b.considered');
  if (searched === 0) return;
  t.games++;
  t.searched += searched;
  t.changed += n('search.p.changed') + n('search.a.changed') + n('search.b.changed');
  for (const [k, v] of Object.entries(counts)) {
    if (k.startsWith('search.fallback.') && typeof v === 'number') {
      const r = k.slice('search.fallback.'.length);
      t.fallback[r] = (t.fallback[r] ?? 0) + v;
    }
  }
  t.perGame.push([searched, n('search.fallback.budget')]);
}

/** The budget-fallback rate with its game-clustered 95% interval (null with fewer than 2 searching games). */
export function budgetRate(t: SearchTally, z = 1.96): { rate: number; lo: number | null; hi: number | null } {
  const C = t.perGame.reduce((s, [c]) => s + c, 0);
  const B = t.perGame.reduce((s, [, b]) => s + b, 0);
  if (C === 0) return { rate: 0, lo: null, hi: null };
  const r = B / C;
  const n = t.perGame.length;
  if (n < 2) return { rate: r, lo: null, hi: null };
  const v = t.perGame.reduce((s, [c, b]) => s + (b - r * c) * (b - r * c), 0) / (C * C) * (n / (n - 1));
  const se = Math.sqrt(v);
  return { rate: r, lo: clamp01(r - z * se), hi: clamp01(r + z * se) };
}

/** Read one batch's ai-bench output: config A's and config B's seat counters, into two tallies. A torn last line is skipped. */
export function tallyBatch(file: string, a: SearchTally, b: SearchTally): void {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let l: { aStats?: { counts?: Record<string, unknown> }; bStats?: { counts?: Record<string, unknown> } };
    try { l = JSON.parse(line); } catch { continue; }
    addCounts(a, l.aStats?.counts);
    addCounts(b, l.bStats?.counts);
  }
}

/** A tally as the match line keeps it (no per-game rows). */
export function tallyLine(t: SearchTally): { games: number; searched: number; changed: number; fallback: Record<string, number>; budgetRate: number; budgetLo: number | null; budgetHi: number | null; byKind: Record<string, { searched: number; changed: number; rate: number | null }> } {
  const br = budgetRate(t);
  const r6 = (x: number | null): number | null => (x === null ? null : Math.round(x * 1e6) / 1e6);
  const byKind: Record<string, { searched: number; changed: number; rate: number | null }> = {};
  for (const k of SEARCH_KINDS) {
    const e = t.byKind[k];
    if (e) byKind[k] = { searched: e.searched, changed: e.changed, rate: e.searched > 0 ? r6(e.changed / e.searched) : null };
  }
  return { games: t.games, searched: t.searched, changed: t.changed, fallback: { ...t.fallback }, budgetRate: r6(br.rate) as number, budgetLo: r6(br.lo), budgetHi: r6(br.hi), byKind };
}
