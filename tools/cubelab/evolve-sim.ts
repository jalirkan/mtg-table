// mtg-table — the cube lab: `evolve`'s statistics on a simulated cube, where the truth is known.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A seeded stand-in for a generation's drafts (no engine): every card is dealt,
// taken, sits on colour or not, is played or not, and plays the games of its
// deck's match -- best of three, so a card's games come in clumps of 2–3 from
// one deck against one opponent, and decks differ in strength.  The batch comes
// out as evolve.ts's CardStat map plus the design effect, so the real
// discovery and confirmation code runs on it unchanged.  D331's numbers, and
// web/test/cubelab-evolve-sim.test.ts, come from here:
//
//   node tools/cubelab/evolve-sim.ts [--sims 1000]     the before / after table
//
// Pure apart from that entry point: the same seed gives the same batch.

import path from 'node:path';

import { SHRINK_K } from './meta.ts';
import { wilson } from './report.ts';
import { rng, type Rng } from './rng.ts';
import { designEffect, type DeckGames } from './evolve-stats.ts';
import { confirmCandidates, discoveryStage, EVOLVE_DEFAULTS, type CardStat, type EvolveCard, type EvolveKnobs } from './evolve.ts';

export interface SimCard {
  name: string;
  /** 0..4: W U B R G. */
  colour: number;
  /** Chance it goes in the first line taken from its grid, when dealt. */
  firstRate: number;
  /** Chance a deck plays it when it sits in that deck's pool on colour. */
  playRate: number;
  /** What it adds to its deck's chance of winning a game (0: an average card). */
  effect: number;
}

export interface SimOptions {
  /** Chance a card is dealt into a draft (162 of 180 in a grid draft). */
  dealt: number;
  /** Chance a dealt card ends in one of the two pools. */
  taken: number;
  /** Spread of deck strength (SD, on the chance of winning a game). */
  deckSd: number;
  /** Best of this many games a match. */
  games: number;
}

/**
 * About 0.6 decisive games per card per draft (Omega's 30 drafts gave 10–25 a
 * card), and a deck spread whose design effect is about 1.15 -- the lab's own
 * best-of-three runs measure 1.08 (pauper, 20 drafts), 1.21 (synergy, 40) and
 * 1.10 pooled.
 */
export const SIM_DEFAULTS: SimOptions = { dealt: 0.9, taken: 0.9, deckSd: 0.15, games: 3 };

/** A cube of `n` cards where no card is better than another: the null.  `plant` overrides some. */
export function nullCube(n: number, seed: number, plant: Record<number, Partial<SimCard>> = {}): SimCard[] {
  const r = rng(seed, 'cube');
  return Array.from({ length: n }, (_, i) => ({
    name: `Card ${String(i + 1).padStart(3, '0')}`, colour: i % 5,
    firstRate: 0.2 + 0.3 * r.next(), playRate: 0.55 + 0.4 * r.next(), effect: 0, ...plant[i],
  }));
}

function gauss(r: Rng): number {
  const u = Math.max(1e-12, r.next());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r.next());
}

const PAIRS: Array<[number, number]> = [];
for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) PAIRS.push([a, b]);

export interface SimBatch { stats: Map<string, CardStat>; mean: number; deff: number; drafts: number; games: number }

/** `drafts` simulated drafts of the cube from `seed`: every card's numbers, the run's mean and the design effect. */
export function simBatch(cube: SimCard[], drafts: number, seed: number, o: SimOptions = SIM_DEFAULTS): SimBatch {
  const acc = cube.map(() => ({ seen: 0, picked: 0, first: 0, decks: 0, onColour: 0, onColourDecks: 0, games: 0, wins: 0 }));
  const decks: DeckGames[] = [];
  let games = 0;
  for (let d = 0; d < drafts; d++) {
    const r = rng(seed + d, 'evolve-sim');
    const pair = [PAIRS[r.int(10)] as [number, number], PAIRS[r.int(10)] as [number, number]];
    const inDeck: number[][] = [[], []];
    cube.forEach((c, i) => {
      if (r.next() >= o.dealt) return;
      const a = acc[i] as (typeof acc)[number];
      a.seen++;
      if (r.next() < c.firstRate) a.first++;
      if (r.next() >= o.taken) return;
      a.picked++;
      const seat = r.int(2);
      if (!(pair[seat] as [number, number]).includes(c.colour)) return;
      a.onColour++;
      if (r.next() >= c.playRate) return;
      a.onColourDecks++;
      a.decks++;
      (inDeck[seat] as number[]).push(i);
    });
    const strength = inDeck.map((ids) => o.deckSd * gauss(r) + ids.reduce((s, i) => s + (cube[i] as SimCard).effect, 0));
    const pA = Math.min(0.98, Math.max(0.02, 0.5 + (strength[0] as number) - (strength[1] as number)));
    let wA = 0, wB = 0;
    const need = Math.floor(o.games / 2) + 1;
    while (wA < need && wB < need) { if (r.next() < pA) wA++; else wB++; }
    const n = wA + wB;
    games += n;
    decks.push({ games: n, wins: wA }, { games: n, wins: wB });
    inDeck.forEach((ids, seat) => { for (const i of ids) { const a = acc[i] as (typeof acc)[number]; a.games += n; a.wins += seat === 0 ? wA : wB; } });
  }
  const tw = acc.reduce((s, a) => s + a.wins, 0), tg = acc.reduce((s, a) => s + a.games, 0);
  const mean = tg ? tw / tg : 0.5;
  const stats = new Map<string, CardStat>();
  cube.forEach((c, i) => {
    const a = acc[i] as (typeof acc)[number];
    const w = wilson(a.wins, a.games);
    stats.set(c.name, {
      name: c.name, seen: a.seen, picked: a.picked, pickRate: a.seen ? a.picked / a.seen : 0, firstTakes: a.first, firstPickRate: a.seen ? a.first / a.seen : 0,
      inDecks: a.decks, deckRate: a.seen ? a.decks / a.seen : 0, onColour: a.onColour, onColourDecks: a.onColourDecks,
      games: a.games, wins: a.wins, winRate: a.games ? a.wins / a.games : 0, shrunk: (a.wins + SHRINK_K * mean) / (a.games + SHRINK_K), ci: [w.lo ?? 0, w.hi ?? 1],
    });
  });
  return { stats, mean, deff: designEffect(decks), drafts, games };
}

/** The cube's cards as the loop sees them: all spells, rated well, no AI flag (every test is in the family). */
export function simCards(cube: SimCard[]): EvolveCard[] {
  return cube.map((c) => ({ name: c.name, section: 'WUBRG'[c.colour] as string, themes: [], roles: [], colors: 'WUBRG'[c.colour] as string, mv: 2, land: false, fixing: false, aiFlag: 'none', rating: 80 }));
}

/** The rule before D331: Wilson lower bound ≥ mean + 0.05 over ≥ 20 games (per card, no family, no confirmation). */
export function oldDominantFlags(b: SimBatch, minGames = 20, margin = 0.05): string[] {
  return [...b.stats.values()].filter((s) => s.games >= minGames && s.ci[0] >= b.mean + margin).map((s) => s.name);
}

export interface Outcome {
  /** Cards discovery flagged (candidates), and which of them confirmation kept. */
  candidates: string[];
  confirmed: string[];
  /** Drafts the confirmation batch took (0: none). */
  confirmDrafts: number;
}

/** One generation of the D331 procedure on the simulated cube: discovery on `drafts` from `seed`, confirmation on fresh seeds. */
export function simGeneration(cube: SimCard[], drafts: number, seed: number, k: EvolveKnobs = EVOLVE_DEFAULTS, o: SimOptions = SIM_DEFAULTS): Outcome {
  const cards = simCards(cube);
  const b = simBatch(cube, drafts, seed, o);
  const first = discoveryStage({ cards, stats: b.stats, balance: { mean: b.mean, colours: [], pairs: [], themes: [] }, drafts, notes: new Map(), knobs: k, deff: b.deff });
  const candidates = first.candidates.map((a) => a.name);
  if (!first.plan.drafts) return { candidates, confirmed: [], confirmDrafts: 0 };
  const cb = simBatch(cube, first.plan.drafts, seed + k.confirmSeedOffset, o);
  const conf = confirmCandidates(first.candidates, cards, { stats: cb.stats, mean: cb.mean, deff: cb.deff, drafts: cb.drafts, seeds: [seed + k.confirmSeedOffset, seed + k.confirmSeedOffset + cb.drafts - 1], games: cb.games }, k);
  return { candidates, confirmed: conf.filter((c) => c.confirmed).map((c) => c.name), confirmDrafts: first.plan.drafts };
}

export interface Rates { sims: number; anyCandidate: number; anyConfirmed: number; meanCandidates: number; meanConfirmDrafts: number; planted?: { found: number; confirmed: number } }

/** `sims` generations, each on a fresh cube and fresh seeds; `plant` card i is the one whose power is measured. */
export function simRates(sims: number, drafts: number, seed: number, opts: { plant?: Partial<SimCard>; plantIndex?: number; cards?: number; k?: EvolveKnobs; o?: SimOptions } = {}): Rates {
  const n = opts.cards ?? 180;
  const pi = opts.plantIndex ?? 7;
  let anyC = 0, anyF = 0, sumC = 0, sumD = 0, found = 0, conf = 0;
  for (let s = 0; s < sims; s++) {
    const cube = nullCube(n, seed + s * 7919, opts.plant ? { [pi]: opts.plant } : {});
    const out = simGeneration(cube, drafts, (seed + s) * 10000019, opts.k ?? EVOLVE_DEFAULTS, opts.o ?? SIM_DEFAULTS);
    const planted = (cube[pi] as SimCard).name;
    const falseC = out.candidates.filter((c) => !opts.plant || c !== planted);
    const falseF = out.confirmed.filter((c) => !opts.plant || c !== planted);
    if (falseC.length) anyC++;
    if (falseF.length) anyF++;
    sumC += falseC.length;
    sumD += out.confirmDrafts;
    if (opts.plant && out.candidates.includes(planted)) found++;
    if (opts.plant && out.confirmed.includes(planted)) conf++;
  }
  return { sims, anyCandidate: anyC / sims, anyConfirmed: anyF / sims, meanCandidates: sumC / sims, meanConfirmDrafts: sumD / sims, ...(opts.plant ? { planted: { found: found / sims, confirmed: conf / sims } } : {}) };
}

/** The rule before D331 on the null cube: the chance of a false "dominant" after one look, and after `looks` pooled looks. */
export function oldRates(sims: number, drafts: number, looks: number, seed: number, o: SimOptions = SIM_DEFAULTS): { oneLook: number; pooled: number; meanPooled: number } {
  let one = 0, pooled = 0, sumP = 0;
  for (let s = 0; s < sims; s++) {
    const cube = nullCube(180, seed + s * 7919);
    // Pooling `looks` generations of `drafts` is one batch of looks·drafts read after each generation.
    const ever = new Set<string>();
    for (let l = 1; l <= looks; l++) {
      const b = simBatch(cube, drafts * l, (seed + s) * 10000019, o);
      const f = oldDominantFlags(b);
      if (l === 1 && f.length) one++;
      for (const x of f) ever.add(x);
    }
    if (ever.size) pooled++;
    sumP += ever.size;
  }
  return { oneLook: one / sims, pooled: pooled / sims, meanPooled: sumP / sims };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const i = process.argv.indexOf('--sims');
  const sims = i > 0 ? Number(process.argv[i + 1]) : 1000;
  const f = (x: number): string => `${(x * 100).toFixed(1)}%`;
  const old30 = oldRates(sims, 30, 3, 11);
  process.stdout.write(`before (Wilson lo >= mean + 0.05, >= 20 games), null cube, 30 drafts a generation, ${sims} sims:\n`);
  process.stdout.write(`  one look: ${f(old30.oneLook)} any false dominant;  three pooled looks: ${f(old30.pooled)} (mean ${old30.meanPooled.toFixed(2)} cards)\n`);
  process.stdout.write('after (D331: BH discovery, then confirmation on fresh seeds), per generation:\n');
  for (const drafts of [30, 100, 200, 400]) {
    const r = simRates(sims, drafts, 21);
    process.stdout.write(`  null, ${drafts} drafts: any false candidate ${f(r.anyCandidate)}, any false cut ${f(r.anyConfirmed)}; confirmation ${r.meanConfirmDrafts.toFixed(1)} drafts on average\n`);
  }
  const plants: Array<[string, Partial<SimCard>, number[]]> = [
    ['dominant +0.10', { effect: 0.1 }, [200, 400, 600]], ['dominant +0.15', { effect: 0.15 }, [200, 400, 600]], ['dead (played 5%)', { playRate: 0.05 }, [100, 200]],
  ];
  for (const [label, plant, sizes] of plants) {
    for (const drafts of sizes) {
      const r = simRates(sims, drafts, 31, { plant });
      process.stdout.write(`  planted ${label}, ${drafts} drafts: found ${f(r.planted?.found ?? 0)}, confirmed and cut ${f(r.planted?.confirmed ?? 0)}; any false cut ${f(r.anyConfirmed)}; confirmation ${r.meanConfirmDrafts.toFixed(1)} drafts on average\n`);
    }
  }
}
