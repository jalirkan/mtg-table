/*
 * mtg-table — status.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The status strip's data — one table, two renderers** (the status layer,
 * amendment M49, D210–D212).
 *
 * Watching a game should read like a turn-based RPG: each creature carries a
 * small strip of its keyword abilities, a bar of what is left of its toughness,
 * a pip per counter and a mark per attachment (the owner's Final Fantasy XIII
 * reference). The board's `CardTile` draws it as DOM and SVG; the arena's
 * `scene/status.ts` draws it as one instanced mesh over a glyph atlas painted
 * from the SAME path data. This file is the part both read, and it is pure — no
 * React, no DOM, no three, no clock — so `node --test` imports it.
 *
 * Everything here is a POSE: a function of one card on one frame, never
 * remembered, so a skip, a scrub, a `resync` and a new `gameId` draw it with no
 * history (report 13 §1.3's rule).
 *
 * Three rules hold it to the rest of the client:
 *
 *  - **Hard rule 8's renderer half.** {@link cardStatus} answers `null` for a
 *    redacted stub and for EVERY face-down card, whatever either carries, and it
 *    reads keywords only through `protocol.ts`'s {@link keywordsOf} — the one
 *    reader of `Card.keywords` — which answers `[]` for the same two. A keyword
 *    is not a name, but it is a fact about a card, and a concealed card shows none.
 *  - **The client decides nothing.** A keyword constant maps to a glyph and a
 *    label, never to a rule; the bar draws two numbers the wire carries
 *    (`toughness` and `damage`, D211) and asserts nothing about death — an
 *    indestructible creature at 0 is simply a bar at 0; a counter is a pip in the
 *    colour of its display name. An attachment's mark reads the attached card's
 *    TYPE LINE only when that card is face up.
 *  - **The glyphs are procedural** (D212): 24 × 24 SVG path data written here,
 *    filled with the even-odd rule, drawn by the board as inline SVG and by the
 *    arena into one canvas texture at mount. No third-party asset, so nothing to
 *    download and nothing to license; `tools/assets-manifest.json`'s `procedural`
 *    block records it.
 */

import { isFaceDown, isHidden, keywordsOf, type AnyCard, type Card } from './protocol.ts';
import { counterLabel, isCreatureTypeLine } from './render/labels.ts';

// ---------------------------------------------------------------------------
// The glyphs
// ---------------------------------------------------------------------------

/** Every glyph the strip draws. The order is the arena atlas's cell order. */
export const GLYPH_IDS = [
  'flying',
  'haste',
  'vigilance',
  'firstStrike',
  'doubleStrike',
  'lifelink',
  'deathtouch',
  'trample',
  'hexproof',
  'indestructible',
  'menace',
  'reach',
  'defender',
  'flash',
  'ability',
  'more',
  'aura',
  'equipment',
  'attachment',
  'pip',
] as const;

export type GlyphId = (typeof GLYPH_IDS)[number];

export interface Glyph {
  /** SVG path data in a 24 × 24 box, filled `evenodd` (a hole is a second sub-path). */
  path: string;
  /** The colour the glyph is tinted, `#rrggbb`. */
  colour: string;
}

/**
 * The procedural glyph kit (D212). Each shape is chosen to read at 14–16 px from
 * silhouette alone — the arena has no tooltip — and each keyword has a colour
 * of its own as a second cue, never the only one.
 */
export const GLYPHS: Readonly<Record<GlyphId, Glyph>> = {
  // A wing of three feathers.
  flying: {
    path: 'M2.5 17C5 9.5 11 5 21.5 3.5C19.5 6.8 17.6 8.2 14.6 9.2C17.2 9.4 18.6 9.6 20.2 9.8C17.8 12.6 15.4 13.1 12.4 13.2C14.4 14.1 15.7 14.3 17.2 14.6C12.8 17.4 7.8 18.1 2.5 17Z',
    colour: '#74c2ff',
  },
  // A lightning bolt.
  haste: { path: 'M13.8 1.5L4.5 13.8H11L9.4 22.5L19.5 9.4H13L13.8 1.5Z', colour: '#ff6a4d' },
  // An open eye with its pupil.
  vigilance: {
    path:
      'M1.5 12C4.5 6.4 8 4.4 12 4.4C16 4.4 19.5 6.4 22.5 12C19.5 17.6 16 19.6 12 19.6C8 19.6 4.5 17.6 1.5 12Z' +
      'M7.6 12A4.4 4.4 0 1 0 16.4 12A4.4 4.4 0 1 0 7.6 12Z' +
      'M10 12A2 2 0 1 0 14 12A2 2 0 1 0 10 12Z',
    colour: '#e8edf2',
  },
  // One upright sword.
  firstStrike: {
    path: 'M12 1.2L14.4 4.6V15H9.6V4.6ZM6 15H18V17.4H6ZM10.8 17.4H13.2V20.8H10.8ZM9.6 20.8H14.4V23H9.6Z',
    colour: '#ffae42',
  },
  // Two upright swords.
  doubleStrike: {
    path:
      'M7.5 1.5L9.4 4.4V14H5.6V4.4ZM3.4 14H11.6V15.8H3.4ZM6.6 15.8H8.4V21H6.6Z' +
      'M16.5 1.5L18.4 4.4V14H14.6V4.4ZM12.4 14H20.6V15.8H12.4ZM15.6 15.8H17.4V21H15.6Z',
    colour: '#ff7a2e',
  },
  // A heart with a cross cut out of it.
  lifelink: {
    path:
      'M12 21.4C12 21.4 2.6 15.6 2.6 9.3C2.6 6.3 4.9 4.1 7.7 4.1C9.6 4.1 11.1 5.1 12 6.7C12.9 5.1 14.4 4.1 16.3 4.1C19.1 4.1 21.4 6.3 21.4 9.3C21.4 15.6 12 21.4 12 21.4Z' +
      'M10.8 8.4H13.2V10.8H15.6V13.2H13.2V15.6H10.8V13.2H8.4V10.8H10.8Z',
    colour: '#ff8fb8',
  },
  // A skull: cranium, two eyes, a nose, a jaw.
  deathtouch: {
    path:
      'M12 2.2C6.9 2.2 3.8 5.8 3.8 10.4C3.8 13.2 5.1 15 6.9 16.1V18.8H17.1V16.1C18.9 15 20.2 13.2 20.2 10.4C20.2 5.8 17.1 2.2 12 2.2Z' +
      'M6.8 10.6A2.2 2.2 0 1 0 11.2 10.6A2.2 2.2 0 1 0 6.8 10.6Z' +
      'M12.8 10.6A2.2 2.2 0 1 0 17.2 10.6A2.2 2.2 0 1 0 12.8 10.6Z' +
      'M12 13.2L10.8 15.4H13.2Z' +
      'M7.6 19.6H16.4V22H7.6Z',
    colour: '#a8e05a',
  },
  // A footprint: a sole and four toes.
  trample: {
    path:
      'M8.8 10C8.8 7.9 10.6 6.8 12.5 7.1C15 7.5 16.1 9.4 15.7 12C15.4 14 14.7 15.6 14.9 17.6C15.1 20.1 13.9 22.2 11.8 22.2C9.4 22.2 8.5 20.2 8.8 18C9.1 15.4 8.8 12.6 8.8 10Z' +
      'M7.3 4.8A1.5 1.5 0 1 0 10.3 4.8A1.5 1.5 0 1 0 7.3 4.8Z' +
      'M10.4 3.2A1.6 1.6 0 1 0 13.6 3.2A1.6 1.6 0 1 0 10.4 3.2Z' +
      'M13.8 3.7A1.5 1.5 0 1 0 16.8 3.7A1.5 1.5 0 1 0 13.8 3.7Z' +
      'M16.5 6A1.3 1.3 0 1 0 19.1 6A1.3 1.3 0 1 0 16.5 6Z',
    colour: '#d6a868',
  },
  // A hexagon ring with a hexagon at its heart.
  hexproof: {
    path:
      'M12 1.5L21.1 6.75V17.25L12 22.5L2.9 17.25V6.75Z' +
      'M12 5L18 8.5V15.5L12 19L6 15.5V8.5Z' +
      'M12 9.3L14.4 10.65V13.35L12 14.7L9.6 13.35V10.65Z',
    colour: '#59d7e8',
  },
  // A shield with a diamond cut out of it.
  indestructible: {
    path: 'M12 1.8L20.4 5V11C20.4 16.2 16.8 20.1 12 22.3C7.2 20.1 3.6 16.2 3.6 11V5Z' + 'M12 7.6L15.2 11.6L12 15.6L8.8 11.6Z',
    colour: '#ffd75e',
  },
  // Horns over a face with slit eyes.
  menace: {
    path:
      'M2.6 2.6C3.6 8.9 6.9 12 12 12C17.1 12 20.4 8.9 21.4 2.6C19.3 5.9 16.2 7.9 12 7.9C7.8 7.9 4.7 5.9 2.6 2.6Z' +
      'M6.6 13.2C6.6 17.4 8.8 20.4 12 21.6C15.2 20.4 17.4 17.4 17.4 13.2Z' +
      'M8.4 14.6L11 15.8L8.6 16.6Z' +
      'M15.6 14.6L13 15.8L15.4 16.6Z',
    colour: '#e0506a',
  },
  // An arrow reaching up to a bar.
  reach: { path: 'M4 1.8H20V4.4H4ZM12 5.6L18.4 12H14.2V22.4H9.8V12H5.6Z', colour: '#3cc9a0' },
  // A crenellated brick wall.
  defender: {
    path:
      'M2 6H4.5V3H8V6H10.2V3H13.8V6H16V3H19.5V6H22V21H2Z' +
      'M2 10.2H22V11.2H2Z' +
      'M2 15.4H22V16.4H2Z' +
      'M11.5 6H12.5V10.2H11.5Z' +
      'M6.5 11.2H7.5V15.4H6.5Z' +
      'M16.5 11.2H17.5V15.4H16.5Z' +
      'M11.5 16.4H12.5V21H11.5Z',
    colour: '#9fb0c8',
  },
  // A four-point sparkle.
  flash: { path: 'M12 1.5L14.2 9.8L22.5 12L14.2 14.2L12 22.5L9.8 14.2L1.5 12L9.8 9.8Z', colour: '#b58cff' },
  // Three dots: "an ability the strip has no glyph for".
  ability: {
    path:
      'M2.6 12A2.6 2.6 0 1 0 7.8 12A2.6 2.6 0 1 0 2.6 12Z' +
      'M9.4 12A2.6 2.6 0 1 0 14.6 12A2.6 2.6 0 1 0 9.4 12Z' +
      'M16.2 12A2.6 2.6 0 1 0 21.4 12A2.6 2.6 0 1 0 16.2 12Z',
    colour: '#cfd6de',
  },
  // A plus: "and more than the strip has room for".
  more: { path: 'M9.8 3.5H14.2V9.8H20.5V14.2H14.2V20.5H9.8V14.2H3.5V9.8H9.8Z', colour: '#cfd6de' },
  // A halo ring and a spark under it: an Aura on this creature.
  aura: {
    path:
      'M12 4.6C17.2 4.6 21.4 6.5 21.4 8.9C21.4 11.3 17.2 13.2 12 13.2C6.8 13.2 2.6 11.3 2.6 8.9C2.6 6.5 6.8 4.6 12 4.6Z' +
      'M12 6.9C8.4 6.9 5.4 7.8 5.4 8.9C5.4 10 8.4 10.9 12 10.9C15.6 10.9 18.6 10 18.6 8.9C18.6 7.8 15.6 6.9 12 6.9Z' +
      'M12 14.2L13.1 17.6L16.5 18.7L13.1 19.8L12 23.2L10.9 19.8L7.5 18.7L10.9 17.6Z',
    colour: '#c18cff',
  },
  // A hammer: an Equipment on this creature.
  equipment: { path: 'M3.5 3H15.5V5H19.5V9H15.5V11H3.5ZM8 11H11V22H8Z', colour: '#b0bcc8' },
  // A ring: an attachment whose type this seat may not read (face down, or hidden).
  attachment: {
    path: 'M4 12A8 8 0 1 0 20 12A8 8 0 1 0 4 12Z' + 'M7.4 12A4.6 4.6 0 1 0 16.6 12A4.6 4.6 0 1 0 7.4 12Z',
    colour: '#aab4c0',
  },
  // A diamond: one counter.
  pip: { path: 'M12 2.5L21.5 12L12 21.5L2.5 12Z', colour: '#ffffff' },
};

// ---------------------------------------------------------------------------
// Keywords
// ---------------------------------------------------------------------------

/**
 * **The evergreen set the strip draws a glyph of its own for** — the owner's
 * list. Every other `Keyword` constant is the generic `ability` glyph, with its
 * name in a tooltip on the board.
 */
export const EVERGREEN_GLYPHS: Readonly<Record<string, GlyphId>> = {
  FLYING: 'flying',
  HASTE: 'haste',
  VIGILANCE: 'vigilance',
  FIRST_STRIKE: 'firstStrike',
  DOUBLE_STRIKE: 'doubleStrike',
  LIFELINK: 'lifelink',
  DEATHTOUCH: 'deathtouch',
  TRAMPLE: 'trample',
  HEXPROOF: 'hexproof',
  INDESTRUCTIBLE: 'indestructible',
  MENACE: 'menace',
  REACH: 'reach',
  DEFENDER: 'defender',
  FLASH: 'flash',
};

/** The glyph a keyword constant draws: its own, or the generic `ability`. */
export function keywordGlyph(keyword: string): GlyphId {
  return EVERGREEN_GLYPHS[keyword] ?? 'ability';
}

/**
 * A keyword constant as words — `FIRST_STRIKE` → `First strike`. A pure spelling
 * of the constant (the wire carries no display string, M49), so it is never
 * wrong about a constant the table has not met: `TYPECYCLING` → `Typecycling`.
 */
export function keywordLabel(keyword: string): string {
  const words = keyword.toLowerCase().split('_').filter((w) => w !== '');
  if (words.length === 0) return keyword;
  const first = words[0]!;
  return [first.charAt(0).toUpperCase() + first.slice(1), ...words.slice(1)].join(' ');
}

// ---------------------------------------------------------------------------
// One card's status
// ---------------------------------------------------------------------------

export interface StatusIcon {
  glyph: GlyphId;
  /** The keyword constant, verbatim. */
  keyword: string;
  /** What a tooltip says. */
  label: string;
}

/**
 * **The bar: what is left of the toughness** (D211) — `toughness − damage`, the
 * two numbers the wire carries, clamped at 0. It draws; it does not decide: the
 * bar at 0 asserts nothing about death (an indestructible creature stands there),
 * and the P/T pill and the damage chip stay verbatim beside it.
 */
export interface StatusHp {
  toughness: number;
  damage: number;
  /** `max(0, toughness − damage)`. */
  remaining: number;
  /** `remaining / toughness`, 0…1. */
  fraction: number;
}

export type PipKind = 'plus' | 'minus' | 'other';

export interface StatusPip {
  /** The counter's display name, verbatim (`+1/+1`, `Spore` — amendment M43). */
  counter: string;
  count: number;
  kind: PipKind;
  label: string;
}

export type MarkKind = 'aura' | 'equipment' | 'attachment';

export interface StatusMark {
  kind: MarkKind;
  cardId: number;
}

export interface CardStatus {
  icons: StatusIcon[];
  hp: StatusHp | null;
  pips: StatusPip[];
  marks: StatusMark[];
}

/** The colour a pip is drawn in, by kind. */
export const PIP_COLOURS: Readonly<Record<PipKind, string>> = {
  plus: '#5fd46e',
  minus: '#ff5a4d',
  other: '#f0c24a',
};

/** The bar's colours: the fill by how much is left, and the damaged part. */
export const HP_COLOURS = Object.freeze({
  high: '#56d06a',
  mid: '#f0b43c',
  low: '#ff5a46',
  damage: '#7a2424',
  back: '#0b0f13',
});

/** The fill colour of a bar at this fraction — a picture of a number, never a verdict. */
export function hpColour(fraction: number): string {
  if (fraction > 0.6) return HP_COLOURS.high;
  if (fraction > 0.3) return HP_COLOURS.mid;
  return HP_COLOURS.low;
}

/** A toughness string as an integer, or `null` (`"*"`, `"1+*"`, `null`). */
function integerOf(value: string | null | undefined): number | null {
  if (typeof value !== 'string' || !/^-?\d+$/.test(value)) return null;
  return Number.parseInt(value, 10);
}

/**
 * The bar for a face-up creature on the battlefield, or `null`: not a creature,
 * not on the battlefield, or a toughness that is not a positive integer.
 */
export function hpOf(card: Card): StatusHp | null {
  if (card.zone !== 'battlefield' || !isCreatureTypeLine(card.types)) return null;
  const toughness = integerOf(card.toughness);
  if (toughness === null || toughness <= 0) return null;
  const damage = Math.max(0, typeof card.damage === 'number' ? card.damage : 0);
  const remaining = Math.max(0, toughness - damage);
  return { toughness, damage, remaining, fraction: remaining / toughness };
}

/** The counter pips, in the wire's order: one entry per counter type. */
export function pipsOf(card: Card): StatusPip[] {
  const out: StatusPip[] = [];
  for (const [counter, count] of Object.entries(card.counters ?? {})) {
    if (typeof count !== 'number' || count <= 0) continue;
    const kind: PipKind = counter === '+1/+1' ? 'plus' : counter === '-1/-1' ? 'minus' : 'other';
    out.push({ counter, count, kind, label: `${counterLabel(counter).text} ×${String(count)}` });
  }
  return out;
}

/**
 * The attachment marks: one per attached card, its kind read from the attached
 * card's type line ONLY when that card is face up — a concealed attachment is a
 * plain ring, so the mark never says what a hidden card is.
 */
export function marksOf(card: Card, attachment: (id: number) => AnyCard | undefined): StatusMark[] {
  const out: StatusMark[] = [];
  for (const id of card.attachmentIds ?? []) {
    const other = attachment(id);
    let kind: MarkKind = 'attachment';
    if (other !== undefined && !isHidden(other) && !isFaceDown(other)) {
      const types = (other as Card).types;
      if (/(^|\s|-)Aura(\s|$)/.test(types)) kind = 'aura';
      else if (/(^|\s|-)Equipment(\s|$)/.test(types)) kind = 'equipment';
    }
    out.push({ kind, cardId: id });
  }
  return out;
}

/** The keyword icons, in the card's own order: an evergreen glyph, or `ability`. */
export function iconsOf(card: AnyCard): StatusIcon[] {
  return keywordsOf(card).map((keyword) => ({
    glyph: keywordGlyph(keyword),
    keyword,
    label: keywordLabel(keyword),
  }));
}

/**
 * **One card's strip, or `null`** — THE decision both renderers draw from.
 * `null` for a redacted stub and for any face-down card (hard rule 8), and for a
 * card with nothing to show.
 *
 * @param attachment resolves an `attachmentIds` entry to the card on the board
 *   (absent: every attachment is a plain ring)
 */
export function cardStatus(
  card: AnyCard,
  attachment: (id: number) => AnyCard | undefined = () => undefined,
): CardStatus | null {
  if (isHidden(card) || isFaceDown(card)) return null;
  const full = card as Card;
  const status: CardStatus = {
    icons: iconsOf(full),
    hp: hpOf(full),
    pips: pipsOf(full),
    marks: marksOf(full, attachment),
  };
  if (status.icons.length === 0 && status.hp === null && status.pips.length === 0 && status.marks.length === 0) {
    return null;
  }
  return status;
}
