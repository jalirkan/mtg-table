/*
 * mtg-table — arena/figures/resolve.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **Card → figure, by the same three-rung shape the cue ladder already has**
 * (report 13 §3.7). Pure: no three, no React, no DOM.
 *
 *     figureFor(card, data) →
 *       1. data.cards[card.name]                    "Aerial Doombot" → drone
 *       2. data.archetypes["creature/subtype:" + s] for each recognised subtype
 *       3. data.archetypes[archetypeKey(card)]      creature/W, creature/U, …
 *       4. data.archetypes[looserArchetypeKeys(…)]  creature/*, *​/W, *​/*
 *       5. data.default                             { model: null } → the disc
 *
 * Rungs 3 and 4 are `cues/archetype.ts`'s, **unchanged** — PLAN's *"the
 * archetype key is the Tier 2 model key"* is literally true and no new
 * classification code was needed for them.
 *
 * ---------------------------------------------------------------------------
 * Two things in here are measured findings rather than taste.
 *
 * **The subtype rung comes BEFORE the colour rung.** The deck's flavour is in
 * the subtype: a Robot Villain and a Human Spy Hero are both mono-white
 * artifacts-or-not, and the colour key cannot tell them apart (report 13 §3.7).
 *
 * **A token's `name` carries the word `Token`.** The wire says `"Soldier
 * Token"`, `"Robot Token"`, `"Hero Token"`, `"Saproling Token"` — sampled
 * straight out of `g1.jsonl`. A `figures.json` keyed on `"Soldier"` would never
 * match, exactly as the arena's `counters:P1P1` selector never matched until
 * `counterToken()` normalised the wire's spelling (amendment **M43**). So the
 * per-card rung is keyed on the wire's string verbatim and the *subtype* rung
 * does the work.
 *
 * And one rule that is hard rule 8 in a new shape (§1.4): **a concealed card
 * never reaches the per-card rung.** Picking a distinctive mesh for a card is a
 * statement about what that card is. The branch is explicit rather than
 * incidental, and `figures.test.ts` asserts it over the corpus's 1,138
 * face-down battlefield card-instances.
 * ---------------------------------------------------------------------------
 */

import { isHidden, type AnyCard } from '../../protocol.ts';
import { archetypeKey, looserArchetypeKeys } from '../cues/archetype.ts';
import { DEFAULT_FIGURE_SPEC, type FigureData, type FigureSpec } from './types.ts';

/**
 * §3.7's recognised subtypes, **most screen time first** (the census in report
 * 13 §2), so the first match is the most specific thing said about the card.
 *
 * It is a closed, ordered list rather than "any subtype" on purpose: an
 * open-ended rung would make `figures.json` a place to add a model per creature
 * type, which is Tier 3 arriving one row at a time inside Tier 2 (§12).
 */
export const SUBTYPE_ORDER = [
  'robot',
  'insect',
  'vehicle',
  'scientist',
  'spy',
  'hero',
  'soldier',
  'villain',
  'human',
] as const;
export type FigureSubtype = (typeof SUBTYPE_ORDER)[number];

/** The archetype key a subtype rung is written as. */
export function subtypeKey(subtype: string): string {
  return `creature/subtype:${subtype}`;
}

/**
 * The subtypes of a type line, lowercased, in the order the line prints them.
 *
 * §3.2 ships the whole line as one string — `"Legendary Creature - Human Spy
 * Hero"` — with **a plain hyphen, not an em dash** (the protocol pins that), so
 * this splits on the first of the three spellings and takes the words after it.
 * A line with no dash has no subtypes, which is the face-down case (`"Creature"`)
 * and is why that card can only reach the archetype rung.
 *
 * Total: a hidden card has no `types` at all and gets `[]`.
 */
export function subtypesOf(card: AnyCard): string[] {
  if (isHidden(card)) return [];
  const types = (card as { types?: string }).types ?? '';
  if (types === '') return [];
  const dash = types.search(/[—–-]/);
  if (dash < 0) return [];
  return types
    .slice(dash + 1)
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word !== '');
}

/** The recognised subtypes of this card, in {@link SUBTYPE_ORDER}. */
export function figureSubtypesOf(card: AnyCard): FigureSubtype[] {
  const present = new Set(subtypesOf(card));
  return SUBTYPE_ORDER.filter((subtype) => present.has(subtype));
}

/**
 * Which rung of the ladder answered. A **category**, never a card name: this
 * value travels with the pose into the scene, and §3.10 rule 1 is that a figure
 * never carries a name, a type line or oracle text.
 */
export type FigureRung =
  | 'card'
  | `subtype:${string}`
  | `archetype:${string}`
  | `looser:${string}`
  | 'default';

export interface FigureMatch {
  spec: FigureSpec;
  rung: FigureRung;
}

/**
 * The ladder. **Total, never `undefined`, never throws** — the last rung is the
 * declared default and the default's default is the glow disc.
 */
export function figureFor(card: AnyCard, data: FigureData): FigureMatch {
  const fallback: FigureMatch = { spec: data.default, rung: 'default' };

  // §1.4 rule 1 and rule 2, in one branch: a card whose identity is concealed
  // gets the anonymous figure. We are not allowed to know what it is, so we are
  // not allowed to choose a mesh for it.
  if (isHidden(card)) return fallback;

  const name = (card as { name?: string }).name;
  if (typeof name === 'string' && name !== '') {
    const byName = data.cards[name];
    if (byName !== undefined) return { spec: byName, rung: 'card' };
  }

  for (const subtype of figureSubtypesOf(card)) {
    const bySubtype = data.archetypes[subtypeKey(subtype)];
    if (bySubtype !== undefined) return { spec: bySubtype, rung: `subtype:${subtype}` };
  }

  const key = archetypeKey(card);
  const byArchetype = data.archetypes[key];
  if (byArchetype !== undefined) return { spec: byArchetype, rung: `archetype:${key}` };

  for (const looser of looserArchetypeKeys(card)) {
    const byLooser = data.archetypes[looser];
    if (byLooser !== undefined) return { spec: byLooser, rung: `looser:${looser}` };
  }

  return fallback;
}

/** The spec alone, for callers that do not care which rung answered. */
export function figureSpecFor(card: AnyCard, data: FigureData): FigureSpec {
  return figureFor(card, data).spec;
}

/** A spec with every field filled — the shape the pose function wants. */
export function completeSpec(partial: Partial<FigureSpec>): FigureSpec {
  return { ...DEFAULT_FIGURE_SPEC, ...partial };
}
