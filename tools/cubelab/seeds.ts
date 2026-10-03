// mtg-table — the cube lab: which draft seeds belong to whom.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A draft is a pure function of its cube, ratings, weights, format and seed
// (D294), so two tools that draft one cube at one seed make the SAME two decks.
// That is what makes seeds dangerous: the AI ladder's dev and confirm deck sets
// (tools/ai-bench/pairs-dev.txt, pairs-confirm.txt, D318) were drafted at seeds
// 9100-9109 of each cube, and the overnight queue counts each cube's seeds up
// from 1 with the same settings, so by night 2 it would draft the confirm decks
// again, record their games and hand them to the position evaluator -- which the
// search would then be confirmed on (methodology review 2, N4).
//
// So the seed line is split, once, here (D332):
//
//   1 .. 799,999,999            LAB: plain runs, the queue (its ledger counts up from 1),
//                               selfplay, evolve (evolve's confirmation seeds sit at
//                               S + 1,000,000 and up)
//   800,000,000 .. 899,999,999  VERIFY: fresh seeds for a pre-registered verification
//                               (`matchup.py design` prints its job here); a plain run
//                               may use them, the queue never reaches them
//   900,000,000 .. 999,999,999  RESERVED: the AI ladder's deck sets.  `run` refuses them
//                               unless `--deckset` (which also requires `--games 0`: a
//                               reserved deck is never played by the lab); the queue
//                               refuses a plan that reaches them
//
// Seeds are not the only guard: the dataset builders (tools/ml/reserved.py)
// also drop any game whose deck is a deck-set deck card for card, whatever its
// seed, because a cube or ratings change can move a deck to another seed and an
// old run folder can predate this file.

export const VERIFY_SEED_MIN = 800_000_000;
export const RESERVED_SEED_MIN = 900_000_000;
export const RESERVED_SEED_MAX = 999_999_999;

/** True when `seed` is one of the deck sets' reserved seeds. */
export function isReservedSeed(seed: number): boolean {
  return seed >= RESERVED_SEED_MIN && seed <= RESERVED_SEED_MAX;
}

/** The part of seeds [seed, seed + drafts) that is reserved, or null. */
export function reservedOverlap(seed: number, drafts: number): [number, number] | null {
  const lo = Math.max(seed, RESERVED_SEED_MIN);
  const hi = Math.min(seed + drafts - 1, RESERVED_SEED_MAX);
  return drafts > 0 && lo <= hi ? [lo, hi] : null;
}

/**
 * A run's seed range is allowed: a reserved seed only for a deck-set run that plays nothing.
 * Throws with the reason otherwise.
 */
export function assertRunSeeds(seed: number, drafts: number, o: { deckset?: boolean; games: number }): void {
  if (!Number.isInteger(seed) || seed < 0) throw new Error(`--seed wants a whole number, got ${seed}`);
  if (seed + drafts - 1 > RESERVED_SEED_MAX) throw new Error(`seeds above ${RESERVED_SEED_MAX} are not used (seeds.ts)`);
  const hit = reservedOverlap(seed, drafts);
  if (o.deckset) {
    if (!hit || hit[0] !== seed || hit[1] !== seed + drafts - 1) {
      throw new Error(`--deckset drafts the AI ladder's deck sets, which live at seeds ${RESERVED_SEED_MIN}..${RESERVED_SEED_MAX} only (seeds.ts); got ${seed}..${seed + drafts - 1}`);
    }
    if (o.games !== 0) throw new Error('--deckset drafts and builds only: it needs --games 0 (a reserved deck is never played by the lab, D332)');
    return;
  }
  if (hit) {
    throw new Error(`seeds ${hit[0]}..${hit[1]} are RESERVED for the AI ladder's deck sets (${RESERVED_SEED_MIN}..${RESERVED_SEED_MAX}, seeds.ts, D332): `
      + 'drafting them would re-create the confirm decks -- pick a seed below ' + VERIFY_SEED_MIN + ' (or ' + VERIFY_SEED_MIN + '+ for a verification)');
  }
}

/** The queue's seeds stay in the LAB range: a chunk at or past VERIFY_SEED_MIN is refused. */
export function assertQueueSeeds(key: string, seed: number, drafts: number): void {
  if (seed < 1 || seed + drafts - 1 >= VERIFY_SEED_MIN) {
    throw new Error(`queue: ${key} seeds ${seed}..${seed + drafts - 1} leave the lab range 1..${VERIFY_SEED_MIN - 1} (seeds.ts, D332) -- the ledger is broken or exhausted`);
  }
}
