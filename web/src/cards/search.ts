/*
 * mtg-table — cards/search.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The card browser's search and filters, as pure functions.**
 *
 * Two callers, one set of rules:
 *
 *   - the dev route (`devApi.ts`) takes the FTS5 index's text matches and runs
 *     them through {@link applyFilters}, {@link dedupeByOracle} and
 *     {@link rankCards} — so set, colour, type, in-deck, one-row-per-card and
 *     the result order are decided HERE, in code `node --test` can reach;
 *   - `web/test/cards-ui.test.ts` runs {@link searchSlice} — the same filters
 *     plus {@link matchesText}, a reference implementation of the index's text
 *     match — over the committed fixture slice, with no SQLite and no network.
 *
 * {@link matchesText} is the reference semantics of the search box: every
 * word a PREFIX of some word in the name, type line or rules text, AND-ed —
 * what the library's `ftsQuery` asks FTS5 for (`"agent"* AND …`). It is what
 * the tests pin over the fixture slice, not a second index: the page never
 * searches in the browser. (The index's porter stemmer is a little looser —
 * `agents` also finds `agent` — and docs/evidence/card-library.md says so.)
 *
 * The filter state round-trips through the URL (`#cards?q=agent&set=msh`) with
 * {@link filtersToQuery} / {@link filtersFromQuery}, so a search is a link.
 *
 * Pure: no React, no DOM, no fetch.
 */

import { inDeck, type DeckIndex } from './decks.ts';
import type { LibraryCard } from './model.ts';

// ---------------------------------------------------------------------------
// The filter state
// ---------------------------------------------------------------------------

export interface CardFilters {
  /** The search box, verbatim. */
  q: string;
  /** Lower-case set codes; `[]` is every set. */
  sets: string[];
  /** `W U B R G`, plus `C` (colourless) and `M` (multicoloured); `[]` is any. */
  colors: string[];
  /** A card type, lower-case (`creature`); `null` is any. */
  type: string | null;
  /** `null` = no filter, `'any'` = in some deck under `decks/`, else a deck path. */
  deck: string | null;
}

export const EMPTY_FILTERS: CardFilters = { q: '', sets: [], colors: [], type: null, deck: null };

/** The two sets the user's deck is built from (report 03 §0.1). */
export const SET_OPTIONS: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'msh', label: 'MSH' },
  { code: 'msc', label: 'MSC' },
];

export const COLOR_OPTIONS: ReadonlyArray<{ code: string; label: string; glyph: string }> = [
  { code: 'W', label: 'white', glyph: 'ms-w' },
  { code: 'U', label: 'blue', glyph: 'ms-u' },
  { code: 'B', label: 'black', glyph: 'ms-b' },
  { code: 'R', label: 'red', glyph: 'ms-r' },
  { code: 'G', label: 'green', glyph: 'ms-g' },
  { code: 'C', label: 'colourless', glyph: 'ms-c' },
  { code: 'M', label: 'multicoloured', glyph: 'ms-multicolor' },
];

/** The card types the type filter offers, in Scryfall's type-line order. */
export const TYPE_OPTIONS: readonly string[] = [
  'creature',
  'artifact',
  'enchantment',
  'instant',
  'sorcery',
  'land',
  'planeswalker',
  'battle',
  'legendary',
];

const COLOR_CODES: ReadonlySet<string> = new Set(COLOR_OPTIONS.map((c) => c.code));

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

/**
 * Lower-case words, diacritics folded, periods and apostrophes deleted and any
 * other non-alphanumeric a separator — the library's own `normName` /
 * `ftsQuery` rule (`tools/card-library/model.ts`), so the search box's words
 * are the words the index is asked for:
 * `"S.H.I.E.L.D. Helicarrier"` → `["shield","helicarrier"]`,
 * `"Ant-Man's Air Force"` → `["ant","mans","air","force"]`.
 */
export function tokenize(text: string): string[] {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’.]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t !== '');
}

/** Everything the text search reads: name, type line and rules text, every face. */
export function haystackOf(card: LibraryCard): string {
  const parts = [card.name, card.typeLine, card.oracleText];
  for (const face of card.faces) parts.push(face.name, face.typeLine, face.oracleText);
  return parts.join('\n');
}

/** Every token of the query is a PREFIX of some word of the card. An empty query matches all. */
export function matchesText(card: LibraryCard, q: string): boolean {
  const tokens = tokenize(q);
  if (tokens.length === 0) return true;
  const words = tokenize(haystackOf(card));
  return tokens.every((t) => words.some((w) => w.startsWith(t)));
}

// ---------------------------------------------------------------------------
// The structured filters
// ---------------------------------------------------------------------------

export function matchesSets(card: LibraryCard, sets: readonly string[]): boolean {
  return sets.length === 0 || sets.includes(card.set.toLowerCase());
}

/**
 * Any-of: a card passes if it has ANY selected colour. `C` is "has no colour"
 * (lands, most artifacts) and `M` is "two or more colours". Colour, not colour
 * identity — the pips on the card, which is what a learner is looking at.
 */
export function matchesColors(card: LibraryCard, colors: readonly string[]): boolean {
  if (colors.length === 0) return true;
  const own = card.colors;
  return colors.some((c) => {
    if (c === 'C') return own.length === 0;
    if (c === 'M') return own.length >= 2;
    return own.includes(c);
  });
}

/** A whole word of the type line (any face): `creature` matches `Artifact Creature — Robot`. */
export function matchesType(card: LibraryCard, type: string | null): boolean {
  if (type === null || type === '') return true;
  const want = type.toLowerCase();
  const lines = [card.typeLine, ...card.faces.map((f) => f.typeLine)];
  return lines.some((line) => tokenize(line).includes(want));
}

/** Every filter except the text, which the index answers. */
export function applyFilters(cards: readonly LibraryCard[], filters: CardFilters, decks: DeckIndex): LibraryCard[] {
  return cards.filter(
    (card) =>
      matchesSets(card, filters.sets) &&
      matchesColors(card, filters.colors) &&
      matchesType(card, filters.type) &&
      inDeck(decks, card, filters.deck),
  );
}

// ---------------------------------------------------------------------------
// One row per card, and the order
// ---------------------------------------------------------------------------

/**
 * With no set chosen the browser shows **cards**, one per `oracleId`; with a set
 * chosen it shows every **print** in it (Agent Phil Coulson is MSH #4 and the
 * extended-art #402). The print kept for a card is the first found in
 * `preferSets` (the deck's two sets), then one with a cached image, then the
 * first seen — so the user's own printing wins where there is one.
 */
export function dedupeByOracle(
  cards: readonly LibraryCard[],
  preferSets: readonly string[] = ['msh', 'msc'],
): LibraryCard[] {
  const score = (c: LibraryCard): number => {
    const setRank = preferSets.indexOf(c.set);
    return (setRank < 0 ? preferSets.length : setRank) * 2 + (c.imageLocal === null ? 1 : 0);
  };
  const best = new Map<string, LibraryCard>();
  const order: string[] = [];
  for (const card of cards) {
    const key = card.oracleId ?? `name:${card.name.toLowerCase()}`;
    const held = best.get(key);
    if (held === undefined) {
      best.set(key, card);
      order.push(key);
    } else if (score(card) < score(held)) {
      best.set(key, card);
    }
  }
  return order.map((k) => best.get(k)).filter((c): c is LibraryCard => c !== undefined);
}

/** `287` < `402` < `4b`… compared as numbers first, then as strings. */
export function compareCollector(a: string, b: string): number {
  const na = Number.parseInt(a, 10);
  const nb = Number.parseInt(b, 10);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return a.localeCompare(b);
}

/**
 * Name hits before rules-text hits: an exact name, then a name that starts with
 * the query, then a name that holds every token (each of those three A–Z), then
 * everything else **in the order it came** — which, from the index, is FTS5's
 * bm25 relevance. With an empty query nothing moves: a set arrives in
 * collector-number order and a deck in the order its file lists it.
 */
export function rankCards(cards: readonly LibraryCard[], q: string): LibraryCard[] {
  const query = q.trim().toLowerCase();
  if (tokenize(q).length === 0) return [...cards];
  const tokens = tokenize(q);
  const tier = (card: LibraryCard): number => {
    const name = card.name.toLowerCase();
    if (name === query) return 0;
    if (name.startsWith(query)) return 1;
    const words = tokenize(card.name);
    if (tokens.every((t) => words.some((w) => w.startsWith(t)))) return 2;
    return 3;
  };
  return cards
    .map((card, index) => ({ card, index, tier: tier(card) }))
    .sort(
      (x, y) =>
        x.tier - y.tier ||
        (x.tier < 3
          ? x.card.name.localeCompare(y.card.name) ||
            x.card.set.localeCompare(y.card.set) ||
            compareCollector(x.card.collectorNumber, y.card.collectorNumber)
          : 0) ||
        x.index - y.index,
    )
    .map((x) => x.card);
}

/** The whole pipeline over an in-memory slice — what the tests run. */
export function searchSlice(
  cards: readonly LibraryCard[],
  filters: CardFilters,
  decks: DeckIndex,
  limit = Number.POSITIVE_INFINITY,
): { cards: LibraryCard[]; total: number } {
  const text = cards.filter((card) => matchesText(card, filters.q));
  const filtered = applyFilters(text, filters, decks);
  const unique = filters.sets.length === 0 ? dedupeByOracle(filtered) : filtered;
  const ranked = rankCards(unique, filters.q);
  return { cards: ranked.slice(0, limit), total: ranked.length };
}

/** `true` when there is nothing to search for — the page then shows a prompt, not the whole library. */
export function isBlank(filters: CardFilters): boolean {
  return (
    filters.q.trim() === '' &&
    filters.sets.length === 0 &&
    filters.colors.length === 0 &&
    filters.type === null &&
    filters.deck === null
  );
}

// ---------------------------------------------------------------------------
// The URL
// ---------------------------------------------------------------------------

function listParam(value: string | null): string[] {
  if (value === null) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v !== '');
}

/** `q=agent&set=msh,msc&color=W,U&type=creature&deck=any` → the filter state. Total. */
export function filtersFromQuery(query: string): CardFilters {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(query.replace(/^[?#]+/, ''));
  } catch {
    return EMPTY_FILTERS;
  }
  const type = (params.get('type') ?? '').trim().toLowerCase();
  const deck = (params.get('deck') ?? '').trim();
  return {
    q: params.get('q') ?? '',
    sets: listParam(params.get('set')).map((s) => s.toLowerCase()),
    colors: listParam(params.get('color'))
      .map((c) => c.toUpperCase())
      .filter((c) => COLOR_CODES.has(c)),
    type: type === '' ? null : type,
    deck: deck === '' ? null : deck,
  };
}

/** The inverse of {@link filtersFromQuery}; empty filters are left out. */
export function filtersToQuery(filters: CardFilters, extra: Record<string, string | null> = {}): string {
  const params = new URLSearchParams();
  if (filters.q.trim() !== '') params.set('q', filters.q);
  if (filters.sets.length > 0) params.set('set', filters.sets.join(','));
  if (filters.colors.length > 0) params.set('color', filters.colors.join(','));
  if (filters.type !== null) params.set('type', filters.type);
  if (filters.deck !== null) params.set('deck', filters.deck);
  for (const [k, v] of Object.entries(extra)) if (v !== null && v !== '') params.set(k, v);
  return params.toString();
}

/** Toggle one member of a list filter (a set chip, a colour chip). */
export function toggle(list: readonly string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
