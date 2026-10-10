// mtg-table — the cube lab: reading the A/B that verifies a ratings raise (D360; PC job J064).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   node tools/cubelab/ratings-verify.ts --a <runA1>,<runA2> --b <runB1>,<runB2> --raised <apply.json> [--md <report.md>]
//
// Arm A drafts with the old ratings, arm B with the raised ones, on the SAME
// fresh seeds, in two batches each (two run folders on disjoint seed blocks).
// Prints one JSON object of numbers for the lab runner's `metrics: x = sh: …`
// lines, and with --md writes the per-card table.  What it reads, all
// pre-registered in D360:
//
//   1. PLAYED: each raised card's on-colour play rate (the decks that could cast
//      it and did, over the pools it sat in), in A and in B; pooled over the
//      raised cards.
//   2. PERFORMANCE in B, by D357's pooled confirmation statistics: for each
//      raised card, "weak" = its win rate is shown under the batch mean −
//      margin, "dominant" = shown over the mean + margin; one-sided exact
//      binomials on effective counts (a batch's games and wins over its design
//      effect).  Look 1 is batch 1 alone at alpha (D331's test); look 2 is both
//      batches pooled (evolve.ts's pooledTest: effective counts add, the
//      boundary is their weighted mean) at alpha / 2 (D357's spend); Holm over
//      the raised cards and both directions at each look; a card is weak (or
//      dominant) if either look says so, so a card with no effect is
//      misjudged with chance at most 1.5 alpha.
//   3. BALANCE: the colour pairs' win rates in each arm (both batches): the
//      spread (best minus worst shrunk rate over pairs with >= minPairGames
//      games) and the between-pair SD by the method of moments (the variance of
//      the rates less their binomial noise times the design effect).
//
// Reads files only; never starts the engine.

import fs from 'node:fs';
import path from 'node:path';

import type { CardInfo } from './report.ts';
import { binomLower, binomUpper, holm } from './evolve-stats.ts';
import { balanceOf, batchStats, pooledTest, type CardStat, type Group } from './evolve.ts';
import { filterPlayExplore } from './playexplore.ts';
import type { DraftRecord, RunMeta } from './run.ts';
import { readJsonLines } from './lines.ts';

export interface VerifyOptions { margin: number; alpha: number; minPairGames: number }
export const VERIFY_DEFAULTS: VerifyOptions = { margin: 0.05, alpha: 0.05, minPairGames: 100 };

/** One batch (run folder) as the reading needs it. */
export interface BatchView {
  drafts: number;
  mean: number;
  deff: number;
  stats: Map<string, Pick<CardStat, 'onColour' | 'onColourDecks' | 'games' | 'wins' | 'inDecks' | 'picked'>>;
  pairs: Array<Pick<Group, 'key' | 'games' | 'wins'>>;
}

export interface CardVerdict {
  name: string; old: number; new: number;
  aOn: number; aPlayed: number; bOn: number; bPlayed: number;
  bGames: number; bWins: number; bRate: number;
  look1: { weakP: number; domP: number }; look2: { weakP: number; domP: number };
  weak: boolean; dominant: boolean;
}

const sumStat = (bs: BatchView[], name: string, k: 'onColour' | 'onColourDecks' | 'games' | 'wins'): number => bs.reduce((s, b) => s + (b.stats.get(name)?.[k] ?? 0), 0);

/** One batch's attempt on one direction: its counts, boundary, design effect and its own one-sided p (effective counts). */
function attempt(b: BatchView, name: string, dir: -1 | 1, margin: number): { n: number; x: number; p0: number; deff: number; p: number } {
  const g = b.stats.get(name)?.games ?? 0;
  const w = b.stats.get(name)?.wins ?? 0;
  const d = Math.max(1, b.deff);
  const p0 = b.mean + dir * margin;
  return { n: g, x: w, p0, deff: b.deff, p: g ? (dir < 0 ? binomLower(w / d, g / d, p0) : binomUpper(w / d, g / d, p0)) : 1 };
}

/** One look's tests for every raised card: [weak p, dominant p], pooled over the look's batches (D357) and spent. */
function lookPs(batches: BatchView[], names: string[], o: VerifyOptions, spend: number): Array<[number, number]> {
  return names.map((n) => {
    const weak = pooledTest('dead', batches.map((b) => attempt(b, n, -1, o.margin)));
    const dom = pooledTest('dominant-win', batches.map((b) => attempt(b, n, 1, o.margin)));
    return [Math.min(1, (weak?.p ?? 1) * spend), Math.min(1, (dom?.p ?? 1) * spend)];
  });
}

/** Holm over every card's two tests at one look: which cards are weak, which dominant. */
function holmLook(ps: Array<[number, number]>, alpha: number): Array<[boolean, boolean]> {
  const flat = ps.flatMap((x) => x);
  const h = holm(flat, alpha);
  return ps.map((_, i) => [h.reject[2 * i] as boolean, h.reject[2 * i + 1] as boolean]);
}

/** Pairs pooled over batches: shrunk rates, spread and method-of-moments SD (win-rate points). */
export function pairBalance(batches: BatchView[], o: VerifyOptions): { spread: number; sd: number; lo: number; hi: number; pairs: Array<{ key: string; games: number; rate: number; shrunk: number }> } {
  const t = new Map<string, { games: number; wins: number }>();
  for (const b of batches) for (const p of b.pairs) { const x = t.get(p.key) ?? { games: 0, wins: 0 }; x.games += p.games; x.wins += p.wins; t.set(p.key, x); }
  const games = [...t.values()].reduce((s, x) => s + x.games, 0);
  const mean = games ? [...t.values()].reduce((s, x) => s + x.wins, 0) / games : 0.5;
  const K = 20;
  const deff = batches.length ? batches.reduce((s, b) => s + b.deff, 0) / batches.length : 1;
  const pairs = [...t.entries()].map(([key, x]) => ({ key, games: x.games, rate: x.games ? x.wins / x.games : 0, shrunk: (x.wins + K * mean) / (x.games + K) }))
    .sort((a, b) => b.games - a.games || (a.key < b.key ? -1 : 1));
  const big = pairs.filter((p) => p.games >= o.minPairGames);
  if (big.length < 3) return { spread: NaN, sd: NaN, lo: NaN, hi: NaN, pairs };
  const r = big.map((p) => p.rate);
  const m = r.reduce((s, x) => s + x, 0) / r.length;
  const v = r.reduce((s, x) => s + (x - m) ** 2, 0) / (r.length - 1) - big.reduce((s, p) => s + p.rate * (1 - p.rate) * deff / p.games, 0) / big.length;
  const sh = big.map((p) => p.shrunk);
  return { spread: Math.max(...sh) - Math.min(...sh), sd: Math.sqrt(Math.max(0, v)) * 100, lo: Math.min(...sh), hi: Math.max(...sh), pairs };
}

export interface VerifyResult { flat: Record<string, number>; cards: CardVerdict[]; balanceA: ReturnType<typeof pairBalance>; balanceB: ReturnType<typeof pairBalance> }

/** The pre-registered reading (D360) of arms A and B, two batches each. */
export function verifyRaise(a: BatchView[], b: BatchView[], raised: Array<{ name: string; old: number; new: number }>, o: VerifyOptions = VERIFY_DEFAULTS): VerifyResult {
  if (b.length < 1 || b.length > 2) throw new Error('arm B: one or two batches');
  const names = raised.map((r) => r.name);
  const l1 = lookPs(b.slice(0, 1), names, o, 1);
  const l2 = b.length === 2 ? lookPs(b, names, o, 2) : names.map((): [number, number] => [1, 1]);
  const h1 = holmLook(l1, o.alpha);
  const h2 = holmLook(l2, o.alpha);
  const cards: CardVerdict[] = raised.map((r, i) => {
    const bGames = sumStat(b, r.name, 'games');
    const bWins = sumStat(b, r.name, 'wins');
    return {
      name: r.name, old: r.old, new: r.new,
      aOn: sumStat(a, r.name, 'onColour'), aPlayed: sumStat(a, r.name, 'onColourDecks'),
      bOn: sumStat(b, r.name, 'onColour'), bPlayed: sumStat(b, r.name, 'onColourDecks'),
      bGames, bWins, bRate: bGames ? bWins / bGames : NaN,
      look1: { weakP: (l1[i] as [number, number])[0], domP: (l1[i] as [number, number])[1] },
      look2: { weakP: (l2[i] as [number, number])[0], domP: (l2[i] as [number, number])[1] },
      weak: !!(h1[i]?.[0] || h2[i]?.[0]), dominant: !!(h1[i]?.[1] || h2[i]?.[1]),
    };
  });
  const tot = (k: 'aOn' | 'aPlayed' | 'bOn' | 'bPlayed' | 'bGames' | 'bWins'): number => cards.reduce((s, c) => s + c[k], 0);
  const bMean = b.length ? b.reduce((s, x) => s + x.mean * x.drafts, 0) / b.reduce((s, x) => s + x.drafts, 0) : NaN;
  const balanceA = pairBalance(a, o);
  const balanceB = pairBalance(b, o);
  const rate = (x: number, n: number): number => (n ? x / n : 0);
  const playedRates = cards.map((c) => rate(c.bPlayed, c.bOn)).sort((x, y) => x - y);
  const r4 = (x: number): number => (Number.isFinite(x) ? Math.round(x * 1e4) / 1e4 : -1);
  const flat: Record<string, number> = {
    raised: cards.length,
    a_drafts: a.reduce((s, x) => s + x.drafts, 0), b_drafts: b.reduce((s, x) => s + x.drafts, 0),
    a_batches: a.length, b_batches: b.length,
    a_played_rate: r4(rate(tot('aPlayed'), tot('aOn'))), b_played_rate: r4(rate(tot('bPlayed'), tot('bOn'))),
    played_rate_gain: r4(rate(tot('bPlayed'), tot('bOn')) - rate(tot('aPlayed'), tot('aOn'))),
    b_median_card_played_rate: r4(playedRates[Math.floor(playedRates.length / 2)] ?? 0),
    b_cards_played_half: cards.filter((c) => rate(c.bPlayed, c.bOn) >= 0.5).length,
    b_raised_games: tot('bGames'), b_raised_rate: r4(rate(tot('bWins'), tot('bGames'))), b_mean: r4(bMean),
    b_raised_minus_mean: r4(rate(tot('bWins'), tot('bGames')) - bMean),
    weak: cards.filter((c) => c.weak).length, dominant: cards.filter((c) => c.dominant).length,
    weak_look1: h1.filter((x) => x[0]).length, weak_look2: h2.filter((x) => x[0]).length,
    dominant_look1: h1.filter((x) => x[1]).length, dominant_look2: h2.filter((x) => x[1]).length,
    b_cards_100_games: cards.filter((c) => c.bGames >= 100).length,
    a_pair_spread: r4(balanceA.spread), b_pair_spread: r4(balanceB.spread), pair_spread_change: r4(balanceB.spread - balanceA.spread),
    a_pair_sd_pts: r4(balanceA.sd), b_pair_sd_pts: r4(balanceB.sd), pair_sd_change_pts: r4(balanceB.sd - balanceA.sd),
    a_pair_lo: r4(balanceA.lo), a_pair_hi: r4(balanceA.hi), b_pair_lo: r4(balanceB.lo), b_pair_hi: r4(balanceB.hi),
    a_mean_min: r4(Math.min(...a.map((x) => x.mean))), a_mean_max: r4(Math.max(...a.map((x) => x.mean))),
    b_mean_min: r4(Math.min(...b.map((x) => x.mean))), b_mean_max: r4(Math.max(...b.map((x) => x.mean))),
    deff_max: r4(Math.max(...[...a, ...b].map((x) => x.deff))),
  };
  return { flat, cards, balanceA, balanceB };
}

/** The per-card and per-pair tables. */
export function verifyReport(r: VerifyResult, o: VerifyOptions = VERIFY_DEFAULTS): string {
  const pc = (x: number, n: number): string => (n ? `${x}/${n} (${(x / n).toFixed(2)})` : '–');
  const p = (x: number): string => (x < 0.001 ? x.toExponential(1) : x.toFixed(3));
  const out = [
    '# Omega ratings raise: A/B verification (D360)', '',
    `Arm A: old ratings; arm B: raised. Performance tests in B against the batch mean ± ${o.margin}: look 1 batch 1 alone at ${o.alpha}, look 2 both batches pooled (D357) at ${o.alpha} / 2, Holm over the cards at each look.`, '',
    `Pooled on-colour play rate of the raised cards: A ${r.flat.a_played_rate}, B ${r.flat.b_played_rate}. Raised cards in B: ${r.flat.b_raised_rate} over ${r.flat.b_raised_games} games, batch mean ${r.flat.b_mean}. Weak: ${r.flat.weak}; dominant: ${r.flat.dominant}.`, '',
    '| Card | Old → new | A played on colour | B played on colour | B win rate (games) | Look 1 p weak / dom | Look 2 p weak / dom (spent) | Verdict |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const c of r.cards) {
    out.push(`| ${c.name} | ${c.old} → ${c.new} | ${pc(c.aPlayed, c.aOn)} | ${pc(c.bPlayed, c.bOn)} | ${Number.isFinite(c.bRate) ? c.bRate.toFixed(3) : '–'} (${c.bGames}) | ${p(c.look1.weakP)} / ${p(c.look1.domP)} | ${p(c.look2.weakP)} / ${p(c.look2.domP)} | ${c.weak ? 'WEAK' : c.dominant ? 'DOMINANT' : 'neither shown'} |`);
  }
  out.push('', `## Colour pairs (spread A ${r.flat.a_pair_spread}, B ${r.flat.b_pair_spread}; between-pair SD A ${r.flat.a_pair_sd_pts} pts, B ${r.flat.b_pair_sd_pts} pts)`, '', '| Pair | A games | A shrunk | B games | B shrunk |', '|---|---|---|---|---|');
  const keys = [...new Set([...r.balanceA.pairs, ...r.balanceB.pairs].map((x) => x.key))].sort();
  for (const k of keys) {
    const x = r.balanceA.pairs.find((y) => y.key === k);
    const y = r.balanceB.pairs.find((z) => z.key === k);
    out.push(`| ${k} | ${x?.games ?? 0} | ${x ? x.shrunk.toFixed(3) : '–'} | ${y?.games ?? 0} | ${y ? y.shrunk.toFixed(3) : '–'} |`);
  }
  out.push('');
  return out.join('\n');
}

/** A run folder as a batch: the evolve's own numbers (batchStats, balanceOf). */
export function readBatch(dir: string): BatchView {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'run.json'), 'utf8')) as RunMeta;
  const info = JSON.parse(fs.readFileSync(path.join(dir, 'cards.json'), 'utf8')) as Record<string, CardInfo>;
  // Complete lines only: a run still appending may leave a torn last line.
  const all = readJsonLines<DraftRecord>(path.join(dir, 'drafts.jsonl'), { complete: true });
  const recs = filterPlayExplore(all, 'exclude').recs;
  const b = batchStats(meta, info, recs, null);
  const bal = balanceOf(b.metaDoc);
  return { drafts: recs.length, mean: bal.mean, deff: b.deff, stats: b.stats, pairs: bal.pairs };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const arg = (k: string): string | undefined => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
  const A = arg('a'), B = arg('b'), R = arg('raised');
  if (!A || !B || !R) { process.stderr.write('usage: node tools/cubelab/ratings-verify.ts --a <runA1>[,<runA2>] --b <runB1>[,<runB2>] --raised <apply.json> [--md <report.md>]\n'); process.exit(2); }
  const raised = (JSON.parse(fs.readFileSync(R, 'utf8')) as { changes: Array<{ name: string; old: number; new: number }> }).changes;
  // A batch not started yet is skipped (the runner reads these numbers every minute while the arms run).
  const have = (list: string): string[] => list.split(',').filter((d) => fs.existsSync(path.join(d, 'drafts.jsonl')));
  const [as, bs] = [have(A), have(B)];
  if (!as.length || !bs.length) {
    process.stdout.write(`${JSON.stringify({ raised: raised.length, a_batches: as.length, b_batches: bs.length, a_drafts: 0, b_drafts: 0 })}\n`);
    process.exit(0);
  }
  const r = verifyRaise(as.map(readBatch), bs.map(readBatch), raised);
  const md = arg('md');
  if (md) fs.writeFileSync(md, verifyReport(r));
  process.stdout.write(`${JSON.stringify(r.flat)}\n`);
}
