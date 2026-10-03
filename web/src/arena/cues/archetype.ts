/*
 * mtg-table — arena/cues/archetype.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **`Card` → `"creature/W"`** (report 09 §7.3), the middle rungs of the cue
 * ladder. Pure, no three, no DOM.
 *
 * Both halves come from fields the protocol already ships, and neither is a
 * decision about the *game*: the primary type is the first word of `card.types`
 * we recognise, and the colour is `colour.ts`'s parse of `manaCost`. CLAUDE.md's
 * M5 convention 4 — never decide what a control **does** by matching an engine
 * string — is untouched: nothing here changes what a click means or what the
 * engine did. It picks which animation to draw, and the worst outcome of a
 * mis-parse is the wrong glow colour.
 *
 * A **hidden** card (the five-key stub, §3.3) has no `types` and no `manaCost`
 * at all, so it archetypes as the colourless wildcard and takes the defaults.
 * That is correct: we are not allowed to know what it is.
 */

import { isHidden, type AnyCard } from '../../protocol.ts';
import { colourIdOf, isMulticolour, type ColourId } from '../colour.ts';

/** The primary types the ladder distinguishes, in Magic's own precedence order. */
export const PRIMARY_TYPES = [
  'creature',
  'land',
  'instant',
  'sorcery',
  'planeswalker',
  'battle',
  'enchantment',
  'artifact',
] as const;
export type PrimaryType = (typeof PRIMARY_TYPES)[number] | 'equipment' | 'token' | 'unknown';

/**
 * The type line's primary type, lowercased.
 *
 * §3.2 ships the whole line as one string — `"Legendary Creature — Human Spy
 * Hero"`, `"Artifact — Equipment"` — so this is a scan for the first recognised
 * word, with `artifact` last so an Equipment is an Equipment and a creature
 * artifact is a creature. **Equipment is detected from the subtype after the em
 * dash**, which is the one case §7.3 calls out by name, because the whole
 * `equipment/*` archetype (and `attach.snap` with it) hangs off it.
 */
export function primaryTypeOf(card: AnyCard): PrimaryType {
  if (isHidden(card)) return 'unknown';
  const types = (card as { types?: string }).types ?? '';
  if (types === '') return 'unknown';
  const lower = types.toLowerCase();
  // The subtype half first: "Artifact — Equipment" is equipment, not artifact.
  const dash = lower.search(/[—–-]/);
  const sub = dash >= 0 ? lower.slice(dash + 1) : '';
  if (/\bequipment\b/.test(sub)) return 'equipment';
  for (const type of PRIMARY_TYPES) {
    if (new RegExp(`\\b${type}\\b`).test(lower)) return type;
  }
  return 'unknown';
}

/**
 * `"<primaryType>/<colourId>"` — the exact key `cues.json`'s `archetypes` block
 * is written against.
 */
export function archetypeKey(card: AnyCard): string {
  return `${primaryTypeOf(card)}/${colourIdOf(colourCostOf(card))}`;
}

/**
 * The looser keys, in the order §7.3 tries them: `creature/*` before the
 * colour-only key (`*` over `W`).
 *
 * **Multi-colour falls back to `creature/*` before the colourless key**
 * (§7.3's last line): a gold card is not a colourless one, so the type rule wins and the
 * colour-shaped rule is skipped entirely rather than lying about the colour.
 */
export function looserArchetypeKeys(card: AnyCard): string[] {
  const type = primaryTypeOf(card);
  const colour: ColourId = colourIdOf(colourCostOf(card));
  const keys = [`${type}/*`];
  if (!isMulticolour(colour)) keys.push(`*/${colour}`);
  keys.push('*/*');
  return keys;
}

/** `manaCost`, guarded for the stub shape that has no such key. */
function colourCostOf(card: AnyCard): string | null {
  if (isHidden(card)) return null;
  return (card as { manaCost?: string | null }).manaCost ?? null;
}
