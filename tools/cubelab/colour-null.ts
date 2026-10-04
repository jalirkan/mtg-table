// mtg-table — the cube lab: D377's colour-adjusted null for evolve's dominant-win rule.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// D331's dominant-win rule tested a card against the batch's mean card win
// rate.  In a cube where one colour's decks win 54%, that flags the colour's
// cards as a class (D376, docs/evidence/evolve-calibration.md): the right
// question for a cut is whether a card wins more than its decks' colours would
// without it.  So, from D377 on, a card's null is:
//
//   p0   = the mean, over the card's decisive games, of the win rate of the
//          deck's colour pair (playedDeck(...).key) in the SAME batch.  Each
//          pair's rate leaves out BOTH decks of every match the card played
//          (its own deck, and the opponent whose losses are its wins), and is
//          shrunk toward the batch's deck mean by SHRINK_GAMES pseudo-games;
//   se0  = that baseline's standard error: sqrt(sum_k w_k^2 v_k), w_k the
//          card's share of its games in pair k, v_k = deff r_k (1 - r_k) /
//          (G_k + SHRINK_GAMES) over the left-in games G_k;
//   test = one-sided normal, with a continuity correction of half a win in
//          effective counts (n / deff):
//            z = (rate - p0 - 0.5 deff / n) / sqrt(p0 (1 - p0) deff / n + se0^2)
//   size = rate >= p0 + dominantMargin (the same knob, measured from p0).
//
// Leaving out only the card's own decks is not enough: in a mirror match the
// opponent's games are in the baseline and anticorrelated with the card's, and
// the simulation put the null z's sd at 1.06 (1.7x the nominal rate at p <=
// 0.002); leaving out both decks of the card's matches brings it to 0.98.
// Confirmation runs the same rule on its own batch, never pooled with
// discovery; D357's pooling sums the attempts' effective excess and variances.
//
// Every constant is here and none is a knob: a different rule is a new
// decision (pre-registration lives in code).  The simulation that chose them is
// docs/evidence/evolve-calibration-sim.py (rule `colour`); its numbers are in
// docs/evidence/evolve-calibration.md §7.

import { normalCdf } from './evolve-stats.ts';
import { playedDeck, type CardInfo } from './report.ts';
import type { DraftRecord } from './run.ts';

export const COLOUR_NULL = {
  decision: 'D377',
  /** The baseline's group: the played deck's main colours (its splash ignored). */
  group: 'pair',
  /** Pseudo-games of shrinkage of each pair's rate toward the batch's deck mean. */
  shrinkGames: 20,
  /** Half a win, in effective counts. */
  continuity: 0.5,
} as const;

/** Which null dominant-win tests against: D331's batch mean, or D377's colour pairs. */
export type WinNull = 'mean' | 'colour';

/** The null a NEW evolve run uses (evolve-run.ts; a folder started before D377 keeps 'mean'). */
export const WIN_NULL_NEW_RUNS: WinNull = 'colour';

/** A card's colour-adjusted null on one batch. */
export interface ColourBaseline {
  /** The expected win rate of the card's decks from their colour pairs. */
  p0: number;
  /** The baseline's standard error. */
  se0: number;
  /** The card's decisive games and wins the baseline was weighted by (equal to its CardStat's). */
  games: number;
  wins: number;
  /** The card's games by pair, and each pair's left-out-shrunk rate. */
  pairs: Record<string, { games: number; rate: number }>;
}

interface Tally { g: number; w: number }
const add = (m: Map<string, Tally>, k: string, g: number, w: number): void => {
  const t = m.get(k) ?? { g: 0, w: 0 };
  t.g += g; t.w += w;
  m.set(k, t);
};

/**
 * Every card's colour-adjusted null on a batch's records (the plain drafts the
 * game numbers read).  A card's decks are the played decks whose main holds it,
 * as meta.ts counts its games; `deff` is the batch's design effect.
 */
export function colourBaselines(recs: DraftRecord[], info: Record<string, CardInfo>, deff: number): Map<string, ColourBaseline> {
  const pair = new Map<string, Tally>();
  const own = new Map<string, Map<string, Tally>>();
  const out = new Map<string, Map<string, Tally>>();
  const mine = <T>(m: Map<string, Map<string, T>>, n: string): Map<string, T> => {
    let x = m.get(n);
    if (!x) { x = new Map(); m.set(n, x); }
    return x;
  };
  for (const rec of recs) {
    const dec = rec.match.games.filter((g) => g.winner === 'A' || g.winner === 'B');
    if (!dec.length) continue;
    const a = dec.filter((g) => g.winner === 'A').length;
    const decks = ([0, 1] as const).map((k) => {
      const pd = playedDeck(rec, k, info);
      return { key: pd.key, games: dec.length, wins: k === 0 ? a : dec.length - a, names: new Set(pd.main.map(([, n]) => n)) };
    });
    for (const d of decks) add(pair, d.key, d.games, d.wins);
    for (const name of new Set([...(decks[0] as { names: Set<string> }).names, ...(decks[1] as { names: Set<string> }).names])) {
      for (const d of decks) {
        if (d.names.has(name)) add(mine(own, name), d.key, d.games, d.wins);
        add(mine(out, name), d.key, d.games, d.wins);
      }
    }
  }
  let G = 0, W = 0;
  for (const t of pair.values()) { G += t.g; W += t.w; }
  const m = G ? W / G : 0.5;
  const K = COLOUR_NULL.shrinkGames;
  const d = Math.max(1, deff);
  const res = new Map<string, ColourBaseline>();
  for (const [name, byPair] of own) {
    let games = 0, wins = 0;
    for (const t of byPair.values()) { games += t.g; wins += t.w; }
    if (!games) continue;
    let p0 = 0, v0 = 0;
    const pairs: ColourBaseline['pairs'] = {};
    for (const [key, t] of byPair) {
      const tot = pair.get(key) as Tally;
      const o = out.get(name)?.get(key) ?? { g: 0, w: 0 };
      const g = tot.g - o.g, w = tot.w - o.w;
      const r = (w + K * m) / (g + K);
      const share = t.g / games;
      p0 += share * r;
      v0 += share * share * d * r * (1 - r) / (g + K);
      pairs[key] = { games: t.g, rate: r };
    }
    res.set(name, { p0, se0: Math.sqrt(v0), games, wins, pairs });
  }
  return res;
}

/** One or more batches' colour-adjusted test: `n` games, `x` wins, null `p0` with standard error `se0`, design effect `deff`. */
export interface ColourAttempt { n: number; x: number; p0: number; se0: number; deff: number }

/**
 * The test of one batch, or of several pooled (D357): the effective excess
 * sum_i n_i/deff_i (x_i/n_i - p0_i) over its standard error, less half a win.
 * One batch is exactly the header's z.  Returns the pooled p0 and se0
 * (effective-count weighted) with the one-sided p.
 */
export function colourTest(attempts: ColourAttempt[]): { p: number; p0: number; se0: number; z: number } {
  const a = attempts.filter((t) => t.n > 0);
  if (!a.length) return { p: 1, p0: 0, se0: 0, z: 0 };
  let ne = 0, excess = 0, varCard = 0, varBase = 0, p0w = 0;
  for (const t of a) {
    const e = t.n / Math.max(1, t.deff);
    ne += e;
    excess += e * (t.x / t.n - t.p0);
    varCard += e * t.p0 * (1 - t.p0);
    varBase += e * e * t.se0 * t.se0;
    p0w += e * t.p0;
  }
  const sd = Math.sqrt(varCard + varBase);
  const z = sd > 0 ? (excess - COLOUR_NULL.continuity) / sd : 0;
  return { p: sd > 0 ? 1 - normalCdf(z) : 1, p0: p0w / ne, se0: Math.sqrt(varBase) / ne, z };
}
