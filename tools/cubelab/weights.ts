// mtg-table — the cube lab: every tunable number, in one place.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// docs/guides/cube-lab.md's "The weights" explains each one with an example.
// Override any of them with `--weights <file.json>` (a partial object) or
// `--weight name=value` (repeatable); the run's JSONL records the weights it
// used, so a report always says what it measured.

export interface Weights {
  // ---- ratings ----
  /** The rating of a card Forge has no draft rank for (Forge itself scores it -100, "draft it last"). */
  unrated: number;
  /** A nonbasic land's rating is multiplied by this before it competes with spells. */
  landScale: number;

  // ---- picking ----
  /** Points per theme a card shares with the drafter's on-colour picks, times sqrt(how many share it). */
  synergy: number;
  /** At most this many earlier picks count toward one theme's synergy. */
  synergyCap: number;
  /** Before commitment: points times the share of the drafter's colour weight the card's colours carry. */
  lean: number;
  /** Commit to two colours once this fraction of the expected picks is made (Forge commits on its first pick). */
  commitAt: number;
  /** After commitment: a card outside the two colours that cannot be splashed. */
  offColour: number;
  /** After commitment: a card that is one splashable colour off. */
  splash: number;
  /** A splash card must be rated at least this. */
  splashMinRating: number;
  /** ...and the drafter must already hold this many sources of the splash colour. */
  splashSources: number;
  /** A land or fixer that makes both committed colours (half for one committed colour plus another). */
  fixing: number;
  /** A card set taken at once (a grid line, a Winston pile) is worth its best card plus this times each other card. */
  setRest: number;
  /** Winston: take pile 1, 2, 3 when it is worth the blind card's expected value plus this. */
  winstonMargin1: number;
  winstonMargin2: number;
  winstonMargin3: number;
  /** A card Forge marks AI:RemAIDeck (the AI plays it poorly): subtracted when picking and building. */
  remAIDeck: number;

  // ---- deckbuilding ----
  /** A spell rated at least this is a "playable". */
  playable: number;
  /** Deck score: points per playable among the spells. */
  deckPlayable: number;
  /** Deck score: points per spell in the deck's best theme (half for the second best). */
  deckTheme: number;
  /** Deck score: points lost per spell away from the curve target. */
  deckCurve: number;
  /** Deck score: points lost per creature short of `creaturesMin`. */
  deckCreatures: number;
  creaturesMin: number;
  /** Deck score: points lost per splash card. */
  deckSplash: number;
  /** At most this many splash cards. */
  maxSplash: number;
  /** ...or this many, on the second pass, for a pool where no pair reaches 23 spells otherwise. */
  maxSplashStretch: number;
  /** A splash needs this many sources of its colour in the deck (basics included, at most 2 of them). */
  splashDeckSources: number;
  /** Spell choice: points per other candidate sharing a theme with this card (the same sqrt shape as picking). */
  buildSynergy: number;
  /** 16 lands instead of 17 when the spells' average mana value is at most this. */
  sixteenLandsAt: number;
}

export const DEFAULT_WEIGHTS: Weights = {
  unrated: 40,
  landScale: 0.45,
  synergy: 4,
  synergyCap: 6,
  lean: 10,
  commitAt: 1 / 3,
  offColour: 40,
  splash: 15,
  splashMinRating: 70,
  splashSources: 2,
  fixing: 12,
  setRest: 0.6,
  winstonMargin1: 10,
  winstonMargin2: 5,
  winstonMargin3: 0,
  remAIDeck: 0,
  playable: 45,
  deckPlayable: 2,
  deckTheme: 1.5,
  deckCurve: 1,
  deckCreatures: 1.5,
  creaturesMin: 13,
  deckSplash: 3,
  maxSplash: 3,
  maxSplashStretch: 7,
  splashDeckSources: 3,
  buildSynergy: 3,
  sixteenLandsAt: 2.5,
};

/** Merge overrides; an unknown name or a non-number is an error, not a silent no-op. */
export function mergeWeights(base: Weights, over: Record<string, unknown>): Weights {
  const out: Weights = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (!(k in base)) throw new Error(`unknown weight "${k}" (known: ${Object.keys(base).join(', ')})`);
    const n = typeof v === 'string' ? Number(v) : v;
    if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`weight ${k} must be a number, got ${String(v)}`);
    (out as unknown as Record<string, number>)[k] = n;
  }
  return out;
}

/** `name=value` strings -> an override object. */
export function parseWeightArgs(args: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of args) {
    const m = /^([A-Za-z0-9]+)=(.+)$/.exec(a);
    if (!m?.[1] || m[2] === undefined) throw new Error(`--weight wants name=value, got "${a}"`);
    out[m[1]] = Number(m[2]);
  }
  return out;
}
