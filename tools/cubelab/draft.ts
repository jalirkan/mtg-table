// mtg-table — the cube lab: the two two-player drafts, both drafters AI.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// GRID (the cube file's recommended method): shuffle the cube, deal 162 cards
// into 18 grids of 3x3, face up.  For each grid the first drafter takes a row or
// a column (3 cards), the second takes a remaining row or column (3 cards if it
// is parallel to the first, 2 if it crosses it), and the rest is discarded.  The
// first pick alternates grid by grid; which drafter opens is the seed's parity.
//
// WINSTON (the modern cube's rules, section "Winston draft"): shuffle the cube
// and take `winstonCards` (90) as a face-down stack; deal three one-card piles.
// On a turn the drafter looks at pile 1 and takes it (all of it) or declines it;
// declining adds the stack's top card to that pile, and the drafter looks at pile
// 2, then pile 3.  A taken pile is replaced by one card from the stack.  Declining
// all three takes the stack's top card blind.  When the stack is empty a pile
// can no longer grow, so the last non-empty pile looked at must be taken (and if
// every pile was passed once the stack ran out mid-turn, the biggest is taken).
// Turns alternate until the stack and the piles are empty.  Who opens is the
// seed's parity.
//
// Every decision is logged with the cards the drafter saw: a grid's remaining
// cards, a pile's contents, a blind card after it is taken.  `Chooser` is the
// decision procedure, so the tests can drive the rules with a script.

import type { LabCard } from './cards.ts';
import type { PairTable } from './pairs.ts';
import { scoreCard, setValue, type DrafterState } from './pick.ts';
import { shuffle, type Rng } from './rng.ts';
import type { Weights } from './weights.ts';

export type Seat = 'A' | 'B';

export interface PickRecord {
  /** 1-based decision number for this drafter. */
  n: number;
  kind: 'grid' | 'pile' | 'blind' | 'forced';
  /** grid: which of the 18 grids; pile: which pile (1-3). */
  at: number;
  /** The cards the drafter saw at this decision (names). */
  seen: string[];
  /** What it took (empty when it passed a pile). */
  took: string[];
  /** grid: the line taken ("row 2", "col 1"); pile: "take" or "pass". */
  how: string;
  /** The value the drafter put on what it chose to take or pass. */
  value: number;
}

export interface Drafter {
  seat: Seat;
  state: DrafterState;
  log: PickRecord[];
  /** Every card this drafter has looked at (Winston's blind-card expectation reads it). */
  seen: Set<string>;
}

export interface Chooser {
  /** Pick a line 0-5 (rows 0-2, columns 3-5) among those with a card left, never `taken`. */
  gridLine(d: Drafter, grid: (LabCard | null)[], taken: number | null): number;
  /** Take this pile? `mustTake` is true when the rules leave no choice (the caller enforces it anyway). */
  takePile(d: Drafter, pile: LabCard[], index: number, blindValue: number): boolean;
}

export interface DraftResult {
  format: 'grid' | 'winston';
  /** The cards that took part (the 162 dealt to grids, the 90 of the Winston stack). */
  dealt: string[];
  drafters: [Drafter, Drafter];
}

export function newDrafter(seat: Seat, expected: number): Drafter {
  return { seat, state: { picks: [], expected }, log: [], seen: new Set() };
}

export const LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],      // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8],      // columns
];
export const lineName = (l: number): string => (l < 3 ? `row ${l + 1}` : `col ${l - 2}`);
const lineCards = (g: (LabCard | null)[], l: number): LabCard[] =>
  (LINES[l] ?? []).map((i) => g[i]).filter((c): c is LabCard => c != null);

/** The AI chooser: the line or pile with the best set value (pick.ts); `table` adds learned pair synergy (D301). */
export function aiChooser(w: Weights, table?: PairTable): Chooser {
  return {
    gridLine(d, grid, taken) {
      let best = -1;
      let bv = -Infinity;
      for (let l = 0; l < 6; l++) {
        if (l === taken) continue;
        const cs = lineCards(grid, l);
        if (cs.length === 0) continue;
        const v = setValue(cs, d.state, w, table);
        if (v > bv) { bv = v; best = l; }
      }
      return best;
    },
    takePile(d, pile, index, blindValue) {
      const margin = [w.winstonMargin1, w.winstonMargin2, w.winstonMargin3][index] ?? 0;
      return setValue(pile, d.state, w, table) >= blindValue + margin;
    },
  };
}

function record(d: Drafter, kind: PickRecord['kind'], at: number, seen: LabCard[], took: LabCard[], how: string, value: number): void {
  for (const c of seen) d.seen.add(c.name);
  d.log.push({ n: d.log.length + 1, kind, at, seen: seen.map((c) => c.name), took: took.map((c) => c.name), how, value: Math.round(value * 10) / 10 });
}

function take(d: Drafter, cards: LabCard[]): void {
  d.state.picks.push(...cards);
}

/** Grid draft: 18 grids of 9 (fewer if the cube is smaller), first pick alternating. */
export function gridDraft(cube: LabCard[], r: Rng, chooser: Chooser, w: Weights, aOpens: boolean, grids = 18): DraftResult {
  const deck = shuffle([...cube], r);
  const n = Math.min(grids, Math.floor(deck.length / 9));
  const dealt = deck.slice(0, n * 9);
  const a = newDrafter('A', n * 2.5);
  const b = newDrafter('B', n * 2.5);
  for (let g = 0; g < n; g++) {
    const grid: (LabCard | null)[] = dealt.slice(g * 9, g * 9 + 9);
    const first = (g % 2 === 0) === aOpens ? a : b;
    const second = first === a ? b : a;
    const seen1 = grid.filter((c): c is LabCard => c != null);
    const l1 = chooser.gridLine(first, grid, null);
    if (l1 < 0 || l1 > 5 || lineCards(grid, l1).length === 0) throw new Error(`grid ${g + 1}: illegal first line ${l1}`);
    const t1 = lineCards(grid, l1);
    record(first, 'grid', g + 1, seen1, t1, lineName(l1), setValue(t1, first.state, w));
    take(first, t1);
    for (const i of LINES[l1] ?? []) grid[i] = null;
    const seen2 = grid.filter((c): c is LabCard => c != null);
    const l2 = chooser.gridLine(second, grid, l1);
    if (l2 < 0 || l2 > 5 || l2 === l1 || lineCards(grid, l2).length === 0) throw new Error(`grid ${g + 1}: illegal second line ${l2}`);
    const t2 = lineCards(grid, l2);
    record(second, 'grid', g + 1, seen2, t2, lineName(l2), setValue(t2, second.state, w));
    take(second, t2);
    for (const i of LINES[l2] ?? []) grid[i] = null;
  }
  return { format: 'grid', dealt: dealt.map((c) => c.name), drafters: [a, b] };
}

/** The drafter's expected value of a blind card: the mean score of the dealt cards it has not seen. */
export function blindExpectation(d: Drafter, universe: LabCard[], w: Weights): number {
  let sum = 0;
  let n = 0;
  for (const c of universe) {
    if (d.seen.has(c.name)) continue;
    sum += Math.max(0, scoreCard(c, d.state, w).total);
    n++;
  }
  return n === 0 ? 0 : sum / n;
}

/** Winston draft over `cards` cards of the shuffled cube. */
export function winstonDraft(cube: LabCard[], r: Rng, chooser: Chooser, w: Weights, aOpens: boolean, cards = 90): DraftResult {
  const shuffled = shuffle([...cube], r);
  const dealt = shuffled.slice(0, Math.min(cards, shuffled.length));
  const stack = [...dealt].reverse();               // pop() is the top
  const piles: LabCard[][] = [[], [], []];
  for (const p of piles) { const c = stack.pop(); if (c) p.push(c); }
  const a = newDrafter('A', dealt.length / 2);
  const b = newDrafter('B', dealt.length / 2);
  let cur = aOpens ? a : b;
  let guard = 0;
  while (stack.length > 0 || piles.some((p) => p.length > 0)) {
    if (++guard > 10_000) throw new Error('winston: no progress');
    const blind = blindExpectation(cur, dealt, w);
    let took = false;
    let lookedAny: number | null = null;
    for (let i = 0; i < 3 && !took; i++) {
      const pile = piles[i] as LabCard[];
      if (pile.length === 0) continue;
      lookedAny = i;
      const laterEmpty = piles.slice(i + 1).every((p) => p.length === 0);
      const mustTake = stack.length === 0 && laterEmpty;
      const want = chooser.takePile(cur, pile, i, blind);
      const value = setValue(pile, cur.state, w);
      if (want || mustTake) {
        record(cur, mustTake && !want ? 'forced' : 'pile', i + 1, pile, pile, 'take', value);
        take(cur, pile);
        const c = stack.pop();
        piles[i] = c ? [c] : [];
        took = true;
      } else {
        record(cur, 'pile', i + 1, pile, [], 'pass', value);
        const c = stack.pop();
        if (c) pile.push(c);
      }
    }
    if (!took) {
      const c = stack.pop();
      if (c) {
        record(cur, 'blind', 0, [c], [c], 'blind', Math.max(0, scoreCard(c, cur.state, w).total));
        take(cur, [c]);
      } else {
        // The stack ran out mid-turn after every pile was passed: take the biggest pile.
        let bi = lookedAny ?? 0;
        for (let i = 0; i < 3; i++) if ((piles[i]?.length ?? 0) > (piles[bi]?.length ?? 0)) bi = i;
        const pile = piles[bi] as LabCard[];
        if (pile.length > 0) {
          record(cur, 'forced', bi + 1, pile, pile, 'take', setValue(pile, cur.state, w));
          take(cur, pile);
          piles[bi] = [];
        }
      }
    }
    cur = cur === a ? b : a;
  }
  return { format: 'winston', dealt: dealt.map((c) => c.name), drafters: [a, b] };
}
