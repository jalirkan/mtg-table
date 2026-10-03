/*
 * mtg-table — cards/text.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The card browser's text: rules text split into words and mana symbols (so
 * `{T}` and `{1}{W}` draw as `mana-font` pips inline), the stat line, the
 * legalities table, the credit and copyright lines, and which image URL to try.
 *
 * Pure: no React, no DOM. The components in this directory are thin over it.
 */

import type { LibraryCard, LibraryFace } from './model.ts';

// ---------------------------------------------------------------------------
// Mana symbols
// ---------------------------------------------------------------------------

/**
 * `mana-font` class for one symbol's contents. `render/Mana.tsx`'s rule
 * (`{W/U}` → `ms-wu`, `{2/W}` → `ms-2w`, `{X}` → `ms-x`) with the few symbols
 * whose class is not the lower-cased text: `{T}` is `ms-tap` (there is no
 * `ms-t`), `{Q}` is `ms-untap`, `{∞}` is `ms-infinity`, `{½}` is `ms-1-2`.
 */
export function pipClass(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  if (s === 'T') return 'ms-tap';
  if (s === 'Q') return 'ms-untap';
  if (s === '∞') return 'ms-infinity';
  if (s === '½') return 'ms-1-2';
  // The same rule as `render/Mana.tsx`'s `manaSymbolClass`, restated because a
  // `.tsx` cannot be imported under `node --test` (type stripping, no JSX).
  const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned === '' ? '' : `ms-${cleaned}`;
}

/** `"{1}{W}"` → `["1", "W"]`. Total: no braces is `[]`. */
export function costSymbols(cost: string | null): string[] {
  if (cost === null) return [];
  return [...cost.matchAll(/\{([^}]+)\}/g)].map((m) => m[1] ?? '');
}

export type TextSegment =
  | { kind: 'text'; text: string; reminder: boolean }
  | { kind: 'symbol'; symbol: string; reminder: boolean };

/**
 * One paragraph of rules text → runs of words and `{…}` symbols, each marked
 * `reminder` when it sits inside parentheses (reminder text reads in italics,
 * as on the card).
 */
export function segmentParagraph(paragraph: string): TextSegment[] {
  const out: TextSegment[] = [];
  let depth = 0;
  let buffer = '';
  const flush = (): void => {
    if (buffer !== '') out.push({ kind: 'text', text: buffer, reminder: depth > 0 });
    buffer = '';
  };
  for (let i = 0; i < paragraph.length; i++) {
    const c = paragraph[i] ?? '';
    if (c === '{') {
      const close = paragraph.indexOf('}', i + 1);
      if (close > i + 1) {
        flush();
        out.push({ kind: 'symbol', symbol: paragraph.slice(i + 1, close), reminder: depth > 0 });
        i = close;
        continue;
      }
    }
    if (c === '(') {
      flush();
      depth += 1;
      buffer = '(';
      continue;
    }
    if (c === ')') {
      buffer += ')';
      flush();
      depth = Math.max(0, depth - 1);
      continue;
    }
    buffer += c;
  }
  flush();
  return out;
}

/** Rules text → paragraphs (Scryfall separates abilities with `\n`). */
export function paragraphsOf(text: string): string[] {
  return text.split('\n').filter((p) => p.trim() !== '');
}

// ---------------------------------------------------------------------------
// Stats, rarity, legalities
// ---------------------------------------------------------------------------

type Stats = Pick<LibraryFace, 'power' | 'toughness' | 'loyalty' | 'defense'>;

/** `2/1`, `Loyalty 3`, `Defense 5`, or `null` for a card with none. */
export function statLine(stats: Stats): string | null {
  if (stats.power !== null && stats.toughness !== null) return `${stats.power}/${stats.toughness}`;
  if (stats.loyalty !== null) return `Loyalty ${stats.loyalty}`;
  if (stats.defense !== null) return `Defense ${stats.defense}`;
  return null;
}

export function rarityLabel(rarity: string | null): string {
  if (rarity === null || rarity === '') return '';
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

/** Formats a learner is likely to ask about, first; everything else follows A–Z. */
const FORMAT_ORDER: readonly string[] = [
  'standard',
  'pioneer',
  'modern',
  'legacy',
  'vintage',
  'commander',
  'pauper',
  'brawl',
  'historic',
  'timeless',
];

const FORMAT_LABELS: Record<string, string> = {
  standardbrawl: 'Standard Brawl',
  paupercommander: 'Pauper Commander',
  predh: 'PreDH',
  oldschool: 'Old School',
  duel: 'Duel Commander',
  penny: 'Penny Dreadful',
  oathbreaker: 'Oathbreaker',
  gladiator: 'Gladiator',
  premodern: 'Premodern',
  alchemy: 'Alchemy',
  explorer: 'Explorer',
  future: 'Future Standard',
  competitivebrawl: 'Competitive Brawl',
  tlr: 'TLR',
};

export function formatLabel(format: string): string {
  return FORMAT_LABELS[format] ?? format.charAt(0).toUpperCase() + format.slice(1);
}

export function legalityLabel(status: string): string {
  if (status === 'not_legal') return 'not legal';
  return status.replace(/_/g, ' ');
}

export interface LegalityRow {
  format: string;
  label: string;
  status: string;
}

/**
 * The legalities table: the common formats ALWAYS, in that order — a format the
 * map does not mention is `not_legal`, because the library stores only the
 * formats a card is legal, banned or restricted in (`query.ts`'s `CardRecord`)
 * — then every other format the map names, A–Z.
 */
export function legalityRows(legalities: Readonly<Record<string, string>>): LegalityRow[] {
  const rest = Object.keys(legalities)
    .filter((f) => !FORMAT_ORDER.includes(f))
    .sort();
  return [...FORMAT_ORDER, ...rest].map((format) => ({
    format,
    label: formatLabel(format),
    status: legalities[format] ?? 'not_legal',
  }));
}

// ---------------------------------------------------------------------------
// Credit and copyright
// ---------------------------------------------------------------------------

/** Sets whose cards also carry Marvel's copyright line (NOTICE §4). */
const MARVEL_SETS: ReadonlySet<string> = new Set(['msh', 'msc', 'mar']);

/** `Illus. Marc Aspinall` — shown under EVERY image the browser draws. */
export function artistCredit(card: Pick<LibraryCard, 'artist' | 'faces'>): string {
  const names: string[] = [];
  if (card.artist !== null) names.push(card.artist);
  for (const face of card.faces) {
    if (face.artist !== null && !names.includes(face.artist)) names.push(face.artist);
  }
  return names.length === 0 ? 'Illus. unknown' : `Illus. ${names.join(' & ')}`;
}

/**
 * The copyright line printed on the card, which Scryfall's data does not carry
 * as a field: Wizards of the Coast's, dated by the set's release year, and
 * Marvel's for the two Marvel sets the deck is built from.
 */
export function copyrightLine(card: Pick<LibraryCard, 'set' | 'releasedAt'>): string {
  const year = card.releasedAt !== null && /^\d{4}/.test(card.releasedAt) ? card.releasedAt.slice(0, 4) : null;
  const dated = year === null ? '' : ` ${year}`;
  const wotc = `™ & ©${dated} Wizards of the Coast, LLC`;
  return MARVEL_SETS.has(card.set.toLowerCase()) ? `${wotc} · MARVEL ©${dated} MARVEL` : wotc;
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

/**
 * Which URL an `<img>` should try first, and which to fall back to on error:
 * the same-origin cache (`/cards/img/<id>/normal`, served from `var/cards`) when
 * it holds the file, else Scryfall's CDN. `null` both ways means "draw the text
 * frame" — Scryfall has no image (`image_status: missing`), or both failed.
 */
export function imageSources(
  card: Pick<LibraryCard, 'imageLocal' | 'imageRemote' | 'imageLocalBack' | 'imageRemoteBack'>,
  side: 'front' | 'back' = 'front',
): { primary: string | null; fallback: string | null } {
  const local = side === 'front' ? card.imageLocal : card.imageLocalBack;
  const remote = side === 'front' ? card.imageRemote : card.imageRemoteBack;
  if (local !== null) return { primary: local, fallback: remote };
  return { primary: remote, fallback: null };
}

/** `MSH #4 · Rare` */
export function printLabel(card: Pick<LibraryCard, 'set' | 'collectorNumber' | 'rarity'>): string {
  const rarity = rarityLabel(card.rarity);
  return `${card.set.toUpperCase()} #${card.collectorNumber}${rarity === '' ? '' : ` · ${rarity}`}`;
}
