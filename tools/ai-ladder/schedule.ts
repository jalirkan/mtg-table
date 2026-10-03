// mtg-table — the AI ladder: which matchup to play next.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Pure: the current fit, the available players and what is already running in,
// one matchup out.  Three rules, in this order (D315):
//
//  1. NEW FIRST.  A player with fewer than `newGames` decisive games plays next
//     (the fewest first) — against forge-default until it has `newGames` there
//     too, then against the player closest to it in rating.
//  2. ANCHOR SHARE.  When fewer than `anchorShare` of this run's batches so far
//     involved a stock-Forge anchor, the next one does: the most informative
//     pair (rule 3's score) that has an anchor on one side.  So every night some
//     games tie the ladder to Forge, whatever else is uncertain.
//  3. MOST INFORMATIVE.  Otherwise the pair maximising
//        p(1−p) · (se_i² + se_j²) / (1 + running_ij)
//     — p(1−p) is a game's Fisher information about the rating difference (high
//     when the ratings are close), se² is how much there is still to learn about
//     the two players (uncertain players first), and a pair already running in
//     another worker is discounted so the workers spread out.
//
// Ties break on the names, so the same state gives the same choice.  Unavailable
// players (unknown kinds, unmerged AIs) are never offered here.
//
// Seeds: a batch of matchup {x,y} passes `--seed` = the host's base plus the
// number of batches that matchup has already played on this host
// (`nextBseed`), and its deck pairs are a fixed function of that number
// (`batchPairs`).  So batch k of x-vs-y and batch k of x-vs-z are the SAME deals
// — two players' results against a common opponent are paired, as the bench's
// are — and a second machine (another base) deals different games.

import { expected } from './rating.ts';

export interface SchedPlayer {
  name: string;
  anchor: boolean;
  rating: number;
  se: number;
  games: number;
}

export interface SchedOptions {
  anchor: string;
  newGames: number;
  anchorShare: number;
}

export interface SchedState {
  /** Batches started this run, and how many involved an anchor. */
  batches: number;
  anchorBatches: number;
  /** Decisive games per unordered matchup, all history: key `a|b`, names sorted. */
  pairGames: Map<string, number>;
  /** Batches running now per unordered matchup. */
  running: Map<string, number>;
}

export const mkey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

export const SCHED_DEFAULTS: Omit<SchedOptions, 'anchor'> = { newGames: 40, anchorShare: 0.25 };

function info(x: SchedPlayer, y: SchedPlayer, st: SchedState): number {
  const p = expected(x.rating, y.rating);
  const se2 = x.se * x.se + y.se * y.se;
  return (p * (1 - p) * Math.max(se2, 1)) / (1 + (st.running.get(mkey(x.name, y.name)) ?? 0));
}

function best(cands: Array<[SchedPlayer, SchedPlayer]>, st: SchedState): [SchedPlayer, SchedPlayer] | null {
  let top: [SchedPlayer, SchedPlayer] | null = null;
  let topScore = -1;
  for (const c of cands) {
    const s = info(c[0], c[1], st);
    if (s > topScore + 1e-12 || (Math.abs(s - topScore) <= 1e-12 && top && mkey(c[0].name, c[1].name) < mkey(top[0].name, top[1].name))) {
      top = c;
      topScore = s;
    }
  }
  return top;
}

export function choose(players: SchedPlayer[], st: SchedState, opt: SchedOptions): { a: string; b: string; why: string } | null {
  if (players.length < 2) return null;
  const byName = new Map(players.map((p) => [p.name, p]));
  const anchor = byName.get(opt.anchor);
  // 1. new players (counting what is already running for them as played, so two workers do not both feed one)
  const runningFor = (n: string): number => {
    let r = 0;
    for (const [k, v] of st.running) if (k.split('|').includes(n)) r += v;
    return r;
  };
  const fresh = players
    .filter((p) => p.games < opt.newGames && runningFor(p.name) === 0)
    .sort((x, y) => x.games - y.games || (x.name < y.name ? -1 : 1));
  for (const p of fresh) {
    if (anchor && p.name !== anchor.name && (st.pairGames.get(mkey(p.name, anchor.name)) ?? 0) < opt.newGames) {
      return { a: p.name, b: anchor.name, why: `new: ${p.name} has ${p.games} decisive games` };
    }
    const others = players.filter((q) => q.name !== p.name).sort((x, y) => Math.abs(x.rating - p.rating) - Math.abs(y.rating - p.rating) || (x.name < y.name ? -1 : 1));
    if (others[0]) return { a: p.name, b: others[0].name, why: `new: ${p.name} has ${p.games} decisive games` };
  }
  const all: Array<[SchedPlayer, SchedPlayer]> = [];
  for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) all.push([players[i]!, players[j]!]);
  // 2. the anchor share
  if (st.batches === 0 || st.anchorBatches / st.batches < opt.anchorShare) {
    const withAnchor = all.filter(([x, y]) => x.anchor !== y.anchor);
    const pick = best(withAnchor.length ? withAnchor : all.filter(([x, y]) => x.anchor || y.anchor), st);
    if (pick) {
      const [x, y] = pick[0].anchor ? [pick[1], pick[0]] : pick;
      return { a: x.name, b: y.name, why: 'anchor share' };
    }
  }
  // 3. the most informative pair
  const pick = best(all, st);
  return pick ? { a: pick[0].name, b: pick[1].name, why: 'most informative' } : null;
}

/** The --seed for the next batch of {a,b} on a host: base + the batches it has had (counted from the results and this run). */
export function nextBseed(base: number, used: Set<number>): number {
  let s = base;
  while (used.has(s)) s++;
  return s;
}

/** A host's seed base: a stable function of the host name, a multiple of 1,000,000, so machines deal different games. */
export function hostBase(host: string): number {
  let h = 2166136261;
  for (let i = 0; i < host.length; i++) h = Math.imul(h ^ host.charCodeAt(i), 16777619) >>> 0;
  return (1 + (h % 997)) * 1_000_000;
}

/** The pair-file indices batch `bseed` plays: `per` consecutive pairs (wrapping), a fixed function of the block number. */
export function batchPairs(bseed: number, nPairs: number, per: number): number[] {
  const n = Math.min(per, nPairs);
  const start = ((bseed % nPairs) * n) % nPairs;
  return Array.from({ length: n }, (_, k) => (start + k) % nPairs);
}
