// mtg-table — the cube lab: the drafters one seat can be given (`--drafter`, D416, D439).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A plain run drafts both seats with the LAB DRAFTER (pick.ts, D294).  `--drafter <spec>` gives one
// seat (`--drafter-seat A|B`) another one; the other seat stays the lab drafter, and both build with
// the lab builder and the cube's ratings, so a mirrored pair of folders compares picking alone:
//
//   human-picks:<x.picks.json>   ForgeCoach's 17Lands human pick model (humanpicks.ts, D416)
//   forge-ranks                  Forge's own pick function as D294 describes it (below, D439)
//   llm:<model>[:thinking=...]   Claude, asked once a decision (llmdraft.ts, D439)
//
// FORGE RANKS.  D294 rejected Forge's `CardRanker` as the lab's pick function because it "commits on
// the first strong pick, ... and has no notion of the cube's themes".  This seat is that function in
// the lab's own terms, so it can be measured against the lab drafter: each card's rating is Forge's
// raw draft score of its best-ranked printing (what `ratings init` seeds the TSV with; a card Forge
// has no rank for at `unrated`, as there), whatever the cube's ratings file says; no theme synergy
// (synergy 0); no colour lean before committing (lean 0); and it commits to its two heaviest colours
// after its first line (commitAt 0.04: two picks of a 45-card grid draft), off-colour penalties as the
// lab's after that.  It is an approximation of Forge's behaviour, not Forge's code: Forge has no grid
// draft (D293), and its LimitedPlayerAI is not run here.  Where the cube's ratings are still Forge's
// ranks (Vintage: all but one card), the difference from the lab drafter is synergy, the lean and
// when it commits.

import type { Fact, LabCard } from './cards.ts';
import { aiChooser, gridDraft, type Chooser, type Drafter } from './draft.ts';
import { parseDrafterSpec } from './humanpicks.ts';
import { draftOuts, type DraftOut, type LoadedCube } from './lab.ts';
import { parseLlmSpec, type LlmSpec } from './llmdraft.ts';
import { initialRating } from './ratings.ts';
import { rng } from './rng.ts';
import type { Weights } from './weights.ts';

export type DrafterSpec = { kind: 'human-picks'; file: string } | { kind: 'forge-ranks' } | LlmSpec;

export const DRAFTER_SPECS = 'human-picks:<x.picks.json>, forge-ranks, or llm:<haiku|sonnet|opus|fake>[:thinking=off|low|default]';

/** `--drafter <spec>` -> the spec, or null (the caller refuses it). */
export function parseDrafter(spec: string): DrafterSpec | null {
  if (spec === 'forge-ranks') return { kind: 'forge-ranks' };
  if (spec.startsWith('llm:')) return parseLlmSpec(spec);
  return parseDrafterSpec(spec);
}

/** The weights the forge-ranks seat drafts with: the run's, with these three replaced. */
export const FORGE_RANKS_WEIGHTS = { synergy: 0, lean: 0, commitAt: 0.04 } as const;

export interface ForgeRanked {
  /** Each LabCard re-rated with Forge's draft score, by name. */
  byName: Map<string, LabCard>;
  /** How many of the cube's cards Forge ranks (the rest at `unrated`). */
  ranked: number;
  /** How many differ from the cube's own rating. */
  differ: number;
}

/** The cube's LabCards with Forge's draft scores in place of the cube's ratings. */
export function forgeRanked(lc: LoadedCube, facts: readonly Fact[], unrated: number): ForgeRanked {
  const score = new Map<string, { rating: number; ranked: boolean }>();
  for (const f of facts) if (f.found && f.name) { const r = initialRating(f, unrated); score.set(f.name, { rating: r.rating, ranked: r.forge !== null }); }
  const byName = new Map<string, LabCard>();
  let ranked = 0;
  let differ = 0;
  for (const c of lc.cards) {
    const s = score.get(c.name);
    const rating = s ? s.rating : unrated;
    if (s?.ranked) ranked++;
    if (rating !== c.rating) differ++;
    byName.set(c.name, { ...c, rating });
  }
  return { byName, ranked, differ };
}

/** The forge-ranks chooser: the lab's set value over the Forge-rated twins of the grid and the pool. */
export function forgeRanksChooser(fr: ForgeRanked, w: Weights): Chooser {
  const fw: Weights = { ...w, ...FORGE_RANKS_WEIGHTS };
  const inner = aiChooser(fw);
  const twin = (c: LabCard): LabCard => fr.byName.get(c.name) ?? c;
  const view = (d: Drafter): Drafter => ({ ...d, state: { picks: d.state.picks.map(twin), expected: d.state.expected } });
  return {
    gridLine: (d, grid, taken) => inner.gridLine(view(d), grid.map((c) => (c ? twin(c) : null)), taken),
    takePile: (d, pile, index, blind) => inner.takePile(view(d), pile.map(twin), index, blind),
  };
}

/** One grid draft with seat `seat` on forge-ranks and the other on the lab drafter; the rest is a plain run's. */
export function runForgeRanksDraft(lc: LoadedCube, fr: ForgeRanked, seat: 'A' | 'B', seed: number, w: Weights): DraftOut {
  const t0 = Date.now();
  const r = rng(seed, 'draft:grid');
  const aOpens = seed % 2 === 0;
  const fc = forgeRanksChooser(fr, w);
  const base = aiChooser(w, lc.pairs);
  const chooser: Chooser = {
    gridLine: (d, g, t) => (d.seat === seat ? fc : base).gridLine(d, g, t),
    takePile: (d, p, i, b) => (d.seat === seat ? fc : base).takePile(d, p, i, b),
  };
  const d = gridDraft(lc.cards, r, chooser, w, aOpens);
  const t1 = Date.now();
  return { seed, format: 'grid', dealt: d.dealt.length, aOpens, drafters: draftOuts(lc, d, w), ms: { draft: t1 - t0, build: Date.now() - t1 } };
}
