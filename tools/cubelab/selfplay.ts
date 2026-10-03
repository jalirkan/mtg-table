// mtg-table — the cube lab: learned drafters against the baseline, and the self-play loop.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// D302.  Two halves:
//
// THE MIXED DRAFT (pure).  One draft, one seed, the same cards dealt as any
// other draft of that seed — but seat A values cards with the LEARNED ratings
// and pair table and seat B with the baseline ratings.  `mode` says how far
// A's knowledge goes: `draft+deck` (A drafts and builds with what was
// learned) or `deck` (both draft with the baseline; only A's deckbuilder uses
// the learned values and pairs — the deckbuilder's own head-to-head).  Seat B
// never sees a learned number.  Seats alternate who opens and who is on the
// play exactly as in any run, so a seat has no edge of its own; A's win rate
// over decisive games, with Wilson's interval, is the evidence.  The logged
// pick values are the baseline's (gridDraft logs with the shared weights);
// Winston's blind-card expectation is the baseline's for both seats.
//
// THE LOOP (`tools/cubelab.sh selfplay`).  Values v0 = the cube's ratings TSV
// (or learned from --from runs).  For each iteration i = 1..I: N self-play
// drafts with v(i-1) on both seats -> learn from every game so far (the
// --from runs, every self-play run, every head-to-head run; always against
// the ORIGINAL prior, so nothing compounds) -> v(i) -> H head-to-head drafts,
// A = v(i), B = baseline, on the same H seeds every iteration (common random
// numbers: the iterations differ only by the values).  Everything lands under
// <out>/: iter-<i>/{selfplay,h2h}/ (ordinary run folders, readable by
// `report`), values-<i>.ratings.tsv / .synergy.tsv / .learn.md, and
// summary.json + summary.md.

import fs from 'node:fs';
import path from 'node:path';

import type { LabCard } from './cards.ts';
import { buildDeck, checkDeck } from './deck.ts';
import { aiChooser, gridDraft, winstonDraft, type Chooser, type Drafter } from './draft.ts';
import type { DrafterOut, DraftOut, Format, LoadedCube } from './lab.ts';
import type { PairTable } from './pairs.ts';
import { wilson } from './report.ts';
import { rng } from './rng.ts';
import type { Weights } from './weights.ts';

export type MixedMode = 'draft+deck' | 'deck';

/** Seat A's chooser sees each card as its learned twin (same card, learned rating). */
function twinChooser(inner: Chooser, twin: (c: LabCard) => LabCard): Chooser {
  const view = (d: Drafter): Drafter => ({ ...d, state: { picks: d.state.picks.map(twin), expected: d.state.expected } });
  return {
    gridLine: (d, grid, taken) => inner.gridLine(view(d), grid.map((c) => (c ? twin(c) : null)), taken),
    takePile: (d, pile, index, blind) => inner.takePile(view(d), pile.map(twin), index, blind),
  };
}

/**
 * One draft where seat A uses `learned` (its ratings; its pairs for picking
 * under draft+deck, and for building when `deckPairs`), seat B the baseline.
 */
export function runMixedDraft(base: LoadedCube, learned: LoadedCube, mode: MixedMode, format: Format, seed: number,
  w: Weights, winstonCards = 90, deckPairs: PairTable | undefined = learned.pairs): DraftOut {
  const t0 = Date.now();
  const r = rng(seed, `draft:${format}`);
  const aOpens = seed % 2 === 0;
  const twin = (c: LabCard): LabCard => learned.byName.get(c.name) ?? c;
  const baseChooser = aiChooser(w);
  const aChooser = mode === 'draft+deck' ? twinChooser(aiChooser(w, learned.pairs), twin) : baseChooser;
  const chooser: Chooser = {
    gridLine: (d, g, t) => (d.seat === 'A' ? aChooser : baseChooser).gridLine(d, g, t),
    takePile: (d, p, i, b) => (d.seat === 'A' ? aChooser : baseChooser).takePile(d, p, i, b),
  };
  const d = format === 'grid'
    ? gridDraft(base.cards, r, chooser, w, aOpens)
    : winstonDraft(base.cards, r, chooser, w, aOpens, winstonCards);
  const t1 = Date.now();
  const outs = d.drafters.map((dr): DrafterOut => {
    const isA = dr.seat === 'A';
    const pool = isA ? dr.state.picks.map(twin) : dr.state.picks;
    const deck = buildDeck(pool, w, isA ? deckPairs : undefined);
    const byName = isA ? learned.byName : base.byName;
    const deckErrors = deck
      ? checkDeck(deck, pool, byName, deck.stretched ? w.maxSplashStretch : w.maxSplash)
      : ['no build reaches 22 castable spells, even with a wide splash, 18 lands or three colours'];
    return { seat: dr.seat, picks: dr.log, pool: pool.map((c) => c.name), deck, deckErrors };
  }) as [DrafterOut, DrafterOut];
  return { seed, format, dealt: d.dealt.length, aOpens, drafters: outs, ms: { draft: t1 - t0, build: Date.now() - t1 } };
}

// ------------------------------------------------------------ deck quality, offline

export interface DeckQuality {
  pools: number;
  /** Mean over pools of (learned build - baseline build), both judged by the learned model (rating points per card). */
  learnedView: number;
  /** ...and both judged by the baseline ratings (the cost, in the old currency, of following the learned values). */
  baselineView: number;
  /** Mean spells changed per deck. */
  cardsChanged: number;
  /** Pools where the two builds chose different colours. */
  coloursChanged: number;
}

/** Mean rating (in the given cube's ratings) plus the per-card pair points of a deck's spells. */
export function deckValue(main: Array<[number, string]>, lc: LoadedCube, table?: PairTable): number {
  const spells = main.map(([, n]) => lc.byName.get(n)).filter((c): c is LabCard => !!c && !c.land);
  if (spells.length === 0) return 0;
  let s = spells.reduce((a, c) => a + c.rating, 0);
  if (table) for (let i = 0; i < spells.length; i++) for (let j = i + 1; j < spells.length; j++) s += table.get((spells[i] as LabCard).name)?.get((spells[j] as LabCard).name) ?? 0;
  return s / spells.length;
}

/**
 * The deckbuilder's change on a set of pools (names): the baseline build (baseline
 * ratings, no pairs) against the learned build (learned ratings, pairs when given).
 */
export function deckQuality(pools: string[][], base: LoadedCube, learned: LoadedCube, w: Weights, table?: PairTable): DeckQuality {
  let lv = 0, bv = 0, changed = 0, colours = 0, n = 0;
  for (const names of pools) {
    const pb = names.map((x) => base.byName.get(x)).filter((c): c is LabCard => !!c);
    const pl = names.map((x) => learned.byName.get(x)).filter((c): c is LabCard => !!c);
    const db = buildDeck(pb, w);
    const dl = buildDeck(pl, w, table);
    if (!db || !dl) continue;
    n++;
    lv += deckValue(dl.main, learned, table) - deckValue(db.main, learned, table);
    bv += deckValue(dl.main, base) - deckValue(db.main, base);
    const sb = new Set(db.main.map(([, x]) => x).filter((x) => base.byName.get(x) && !base.byName.get(x)?.land));
    changed += dl.main.filter(([, x]) => learned.byName.get(x) && !learned.byName.get(x)?.land && !sb.has(x)).length;
    if (db.colors !== dl.colors || db.splash !== dl.splash) colours++;
  }
  const r = (x: number): number => Math.round(x * 100) / 100;
  return { pools: n, learnedView: r(lv / Math.max(1, n)), baselineView: r(bv / Math.max(1, n)), cardsChanged: r(changed / Math.max(1, n)), coloursChanged: colours };
}

/** A LoadedCube with other ratings (and pairs): the same cards, re-rated by name. */
export function reRated(lc: LoadedCube, ratings: Map<string, number>, pairs?: PairTable): LoadedCube {
  const cards = lc.cards.map((c) => ({ ...c, rating: ratings.get(c.name) ?? c.rating }));
  return { ...lc, cards, byName: new Map(cards.map((c) => [c.name, c])), ...(pairs ? { pairs, deckPairs: pairs } : {}) };
}

// ------------------------------------------------------------ head-to-head arithmetic

export interface H2H { drafts: number; games: number; winsA: number; winsB: number; draws: number; rate: number | null; lo: number | null; hi: number | null; matchesA: number; matchesB: number }

export function headToHead(recs: Array<{ match: { games: Array<{ winner: string }>; winner: string } }>): H2H {
  let a = 0, b = 0, d = 0, ma = 0, mb = 0;
  for (const r of recs) {
    for (const g of r.match.games) { if (g.winner === 'A') a++; else if (g.winner === 'B') b++; else d++; }
    if (r.match.winner === 'A') ma++; else if (r.match.winner === 'B') mb++;
  }
  const n = a + b;
  const { lo, hi } = wilson(a, n);
  return { drafts: recs.length, games: a + b + d, winsA: a, winsB: b, draws: d, rate: n ? a / n : null, lo, hi, matchesA: ma, matchesB: mb };
}

/** Decisive games needed for a 95% interval of half-width `h` around a rate near 0.5. */
export const gamesForHalfWidth = (h: number): number => Math.ceil((1.96 * 0.5 / h) ** 2);

export function writeJson(file: string, x: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(x, null, 1)}\n`);
}
