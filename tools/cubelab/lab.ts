// mtg-table — the cube lab: one draft, from a seed to two decks.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Pure: a cube's LabCards, a format, a seed and the weights in; the draft log,
// both pools and both decks out.  Nothing here starts the engine, so a draft
// and its decks are the same for a seed whatever --jobs is (D294); only the
// games that follow vary from run to run (Forge's own threads).

import { labCard, type Fact, type LabCard } from './cards.ts';
import type { Cube } from './cube.ts';
import { buildDeck, checkDeck, type DeckBuild } from './deck.ts';
import { aiChooser, gridDraft, winstonDraft, type DraftResult, type PickRecord } from './draft.ts';
import type { PairTable } from './pairs.ts';
import { initialRating } from './ratings.ts';
import { rng } from './rng.ts';
import type { Weights } from './weights.ts';

export type Format = 'grid' | 'winston';

export interface LoadedCube {
  cube: Cube;
  cards: LabCard[];
  byName: Map<string, LabCard>;
  missing: Fact[];
  /** Ratings that came from the file (the rest from the engine's rank). */
  ratedFromFile: number;
  /** Learned pair synergy for the drafters (`run --synergy`, D301). */
  pairs?: PairTable;
  /** ...and for the deckbuilder (`run --deck-synergy`). */
  deckPairs?: PairTable;
}

/** The cube's cards as LabCards: facts for what each is, the ratings file (or Forge's rank) for its rating. */
export function loadCube(cube: Cube, facts: Fact[], ratings: Map<string, number> | null, w: Weights): LoadedCube {
  const byListed = new Map(facts.map((f) => [f.listed, f]));
  const cards: LabCard[] = [];
  const missing: Fact[] = [];
  let ratedFromFile = 0;
  for (const c of cube.cards) {
    const f = byListed.get(c.name);
    if (!f || !f.found) { missing.push(f ?? { listed: c.name, found: false }); continue; }
    const fileRating = ratings?.get(f.name ?? c.name) ?? ratings?.get(c.name);
    if (fileRating !== undefined) ratedFromFile++;
    cards.push(labCard(f, c, fileRating ?? initialRating(f, w.unrated).rating));
  }
  return { cube, cards, byName: new Map(cards.map((c) => [c.name, c])), missing, ratedFromFile };
}

export interface DrafterOut {
  seat: 'A' | 'B';
  picks: PickRecord[];
  pool: string[];
  deck: DeckBuild | null;
  /** What the lab's deck checker says about `deck` (empty = legal). */
  deckErrors: string[];
}

export interface DraftOut {
  seed: number;
  format: Format;
  dealt: number;
  aOpens: boolean;
  drafters: [DrafterOut, DrafterOut];
  ms: { draft: number; build: number };
}

export function runDraft(lc: LoadedCube, format: Format, seed: number, w: Weights, winstonCards = 90): DraftOut {
  const t0 = Date.now();
  const r = rng(seed, `draft:${format}`);
  const aOpens = seed % 2 === 0;
  const chooser = aiChooser(w, lc.pairs);
  const d: DraftResult = format === 'grid'
    ? gridDraft(lc.cards, r, chooser, w, aOpens)
    : winstonDraft(lc.cards, r, chooser, w, aOpens, winstonCards);
  const t1 = Date.now();
  const outs = d.drafters.map((dr): DrafterOut => {
    const pool = dr.state.picks;
    const deck = buildDeck(pool, w, lc.deckPairs);
    const deckErrors = deck
      ? checkDeck(deck, pool, lc.byName, deck.stretched ? w.maxSplashStretch : w.maxSplash)
      : ['no build reaches 22 castable spells, even with a wide splash, 18 lands or three colours'];
    return { seat: dr.seat, picks: dr.log, pool: pool.map((c) => c.name), deck, deckErrors };
  }) as [DrafterOut, DrafterOut];
  return { seed, format, dealt: d.dealt.length, aOpens, drafters: outs, ms: { draft: t1 - t0, build: Date.now() - t1 } };
}
