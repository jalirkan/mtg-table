// mtg-table — the AI ladder: the tuner (successive halving over a config's parameters).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// `tune <base> --param k=v1,v2 ...` varies a registered config's parameters —
// any int or enum parameter of its kind (kinds.ts) — over the full grid, or
// `--sample K` points of it drawn with the seeded generator, and races them:
//
//   round r: every surviving candidate plays `blocks · eta^r` batches against
//            EACH opponent of a fixed pool (default forge-default and
//            forge-reckless), all candidates on the SAME deals (the same
//            --seed per batch slot), so their differences are paired;
//   score:   a candidate's win rate over all its decisive games so far (every
//            round), pooled over the opponents — the pool is fixed, so this is
//            a fair common yardstick;
//   cut:     keep the best ceil(n / eta) (ties: the earlier grid point), until
//            one is left or `maxRounds` is reached (then the best score wins).
//
// The winner is written back to players.json under a NEW name (`<base>-t<n>`,
// or --name), never over an existing entry; if its config is already
// registered (same hash), the tuner says so and writes nothing.  The pure part
// here (`grid`, `halving`) is engine-free and unit-tested with synthetic play.

import { rng } from '../cubelab/rng.ts';

import type { Params, ParamValue } from './kinds.ts';

export interface Candidate {
  id: number;
  params: Params;
  /** Only the varied params, for display: "budgetMs=500,depth=2". */
  label: string;
}

export interface Tally { wins: number; losses: number; draws: number }

export interface RoundLog {
  round: number;
  blocks: number;
  standings: Array<{ id: number; label: string; wins: number; losses: number; draws: number; score: number }>;
  kept: number[];
}

export interface HalvingResult {
  winner: Candidate;
  rounds: RoundLog[];
  totals: Map<number, Tally>;
}

export interface HalvingOptions {
  eta: number;
  blocks: number;
  maxRounds: number;
}

export const TUNE_DEFAULTS: HalvingOptions = { eta: 2, blocks: 1, maxRounds: 6 };

/** The grid of `base` with each varied param taking each of its values (the first param varies slowest). */
export function grid(base: Params, vary: Array<[string, ParamValue[]]>): Candidate[] {
  let rows: Params[] = [{ ...base }];
  for (const [k, vs] of vary) rows = rows.flatMap((r) => vs.map((v) => ({ ...r, [k]: v })));
  return rows.map((params, id) => ({ id, params, label: vary.map(([k]) => `${k}=${params[k]}`).join(',') }));
}

/** K distinct grid points drawn with the seeded generator (the whole grid when K covers it), in grid order. */
export function sample(cands: Candidate[], k: number, seed: number): Candidate[] {
  if (k >= cands.length) return cands;
  const r = rng(seed, 'ladder-tune-sample');
  const idx = cands.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = r.int(i + 1);
    [idx[i], idx[j]] = [idx[j]!, idx[i]!];
  }
  return idx.slice(0, k).sort((a, b) => a - b).map((i) => cands[i]!);
}

export const scoreOf = (t: Tally): number => (t.wins + t.losses === 0 ? 0.5 : t.wins / (t.wins + t.losses));

/**
 * Successive halving.  `play(alive, round, blocks)` plays `blocks` batches of
 * every alive candidate against every opponent and returns each candidate's
 * tally FOR THAT ROUND; totals accumulate here.
 */
export async function halving(cands: Candidate[], opt: HalvingOptions,
  play: (alive: Candidate[], round: number, blocks: number) => Promise<Map<number, Tally>>): Promise<HalvingResult> {
  if (cands.length === 0) throw new Error('no candidates');
  const totals = new Map<number, Tally>(cands.map((c) => [c.id, { wins: 0, losses: 0, draws: 0 }]));
  const rounds: RoundLog[] = [];
  let alive = [...cands];
  for (let r = 0; r < opt.maxRounds && alive.length > 1; r++) {
    const blocks = opt.blocks * Math.pow(opt.eta, r);
    const got = await play(alive, r, blocks);
    for (const c of alive) {
      const t = totals.get(c.id) as Tally, g = got.get(c.id);
      if (g) { t.wins += g.wins; t.losses += g.losses; t.draws += g.draws; }
    }
    const ranked = [...alive].sort((x, y) => scoreOf(totals.get(y.id) as Tally) - scoreOf(totals.get(x.id) as Tally) || x.id - y.id);
    const keep = Math.max(1, Math.ceil(alive.length / opt.eta));
    alive = ranked.slice(0, keep);
    rounds.push({
      round: r, blocks,
      standings: ranked.map((c) => { const t = totals.get(c.id) as Tally; return { id: c.id, label: c.label, ...t, score: scoreOf(t) }; }),
      kept: alive.map((c) => c.id),
    });
  }
  const winner = [...alive].sort((x, y) => scoreOf(totals.get(y.id) as Tally) - scoreOf(totals.get(x.id) as Tally) || x.id - y.id)[0] as Candidate;
  return { winner, rounds, totals };
}
