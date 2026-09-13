/*
 * mtg-table — arena/colour.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The one string the arena parses** (report 09 §7.3).
 *
 * `Card` has no `colors` field — the protocol ships `manaCost` as Forge wrote it
 * (`"{2}{W}{U}"`, or `null` for a land or a token) — so colour identity, which
 * the arena needs for a glow tint and for the `creature/W`-style archetype key,
 * has to be read off that string. It lives in its own module, with no three, no
 * DOM and its own test (`web/test/colour.test.ts`), because it is the input to
 * every archetype lookup and a silent mis-parse would be invisible: the wrong
 * colour glow looks like a design choice.
 *
 * CLAUDE.md's M5 convention 4 — "never decide what a control *does* by matching
 * an engine string" — is not in tension with this. Nothing here decides
 * anything: it picks a colour to draw. A cue can never change what the engine
 * did, and a card whose cost this module reads as `C` still animates.
 */

/** WUBRG, in the order Magic prints them. A colourless / land cost is `C`. */
export const COLOUR_LETTERS = ['W', 'U', 'B', 'R', 'G'] as const;
export type ColourLetter = (typeof COLOUR_LETTERS)[number];

/**
 * A colour identity: the WUBRG letters present, in WUBRG order, or `"C"` when
 * there are none. `"WU"` for Azorius, `"C"` for a land, `"WUBRG"` for the
 * five-colour case.
 */
export type ColourId = string;

const LETTER_SET: ReadonlySet<string> = new Set<string>(COLOUR_LETTERS);

/**
 * `manaCost` → colour identity.
 *
 * The grammar is Forge's, which is Magic's: a cost is a run of `{…}` symbols,
 * and a symbol contributes every WUBRG letter it contains. That one rule covers
 * every hybrid spelling without a special case:
 *
 * | cost | → | why |
 * |---|---|---|
 * | `{1}{W}` | `W` | the plain case |
 * | `{U/B}` | `UB` | hybrid: either half can pay it, so it is both colours |
 * | `{2/W}` | `W` | generic hybrid: the `2` is not a colour |
 * | `{W/P}` | `W` | Phyrexian: `P` is not a colour |
 * | `{X}{G}{G}` | `G` | `X` is not a colour; duplicates collapse |
 * | `{C}` | `C` | true colourless — no letters, so the fallback |
 * | `null` / `""` | `C` | every land, every token |
 *
 * Total by construction: anything it does not recognise contributes nothing,
 * and a cost that contributes nothing is `C`. It never throws.
 */
export function colourIdOf(manaCost: string | null | undefined): ColourId {
  if (manaCost === null || manaCost === undefined) return 'C';
  const found = new Set<string>();
  for (const ch of manaCost.toUpperCase()) {
    if (LETTER_SET.has(ch)) found.add(ch);
  }
  if (found.size === 0) return 'C';
  let out = '';
  for (const letter of COLOUR_LETTERS) {
    if (found.has(letter)) out += letter;
  }
  return out;
}

/** True when the cost names two or more colours — the gold case. */
export function isMulticolour(id: ColourId): boolean {
  return id !== 'C' && id.length > 1;
}

/**
 * The arena's palette, one hex per colour identity, for glows, rims and the
 * text-frame border. Gold for multicolour, grey for colourless — the same two
 * conventions the printed frames use, so nothing has to be explained.
 *
 * These are deliberately *light* (they are additive glows and border tints, not
 * fills) and they are the only colours the arena hard-codes.
 */
export const COLOUR_HEX: Readonly<Record<ColourLetter | 'C' | 'M', string>> = {
  W: '#f6f0d8',
  U: '#9ec7f0',
  B: '#a9a2b4',
  R: '#f0937f',
  G: '#8fca9a',
  C: '#c6ccd6',
  M: '#e3c46a',
};

/** The hex a colour identity draws as. Multicolour is gold; colourless is grey. */
export function colourHex(id: ColourId): string {
  if (id === 'C' || id === '') return COLOUR_HEX.C;
  if (isMulticolour(id)) return COLOUR_HEX.M;
  const letter = id as ColourLetter;
  return COLOUR_HEX[letter] ?? COLOUR_HEX.C;
}
