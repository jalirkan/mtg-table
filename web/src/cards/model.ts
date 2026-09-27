/*
 * mtg-table — cards/model.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The card browser's data model** — the JSON the dev-only `/cards/api/*`
 * route answers with (`web/src/cards/devApi.ts`) and the one shape every
 * component under `web/src/cards/` reads.
 *
 * This is *public* card data: Scryfall's oracle text, type line, cost, artist
 * and legalities for any card in the library. Hard rule 8 is about the engine's
 * wire (what a seat may know about another seat's cards) and does not reach a
 * page that shows no game at all — which is also why the browser draws its own
 * `CardView` from this model and never imports `render/CardTile.tsx`, whose
 * importer list is closed (CLAUDE.md, M4 convention 2).
 *
 * Pure: no React, no DOM, no fetch. `node --test` imports it.
 */

/** One face of a multi-face card (transform, modal DFC, split, adventure…). */
export interface LibraryFace {
  name: string;
  /** Scryfall's brace string (`"{1}{W}"`); `null` when the face has none. */
  manaCost: string | null;
  typeLine: string;
  oracleText: string;
  flavorText: string | null;
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
  defense: string | null;
  artist: string | null;
}

/**
 * One card, as the browser sees it: a Scryfall **print** (an `id`) with its
 * oracle data folded in. Strings stay strings — `power` can be `*` or `1+*`,
 * and a collector number can be `287`, `4b` or `F12` (report 03 §4.2).
 */
export interface LibraryCard {
  /** Scryfall print id — the image cache key. */
  id: string;
  oracleId: string | null;
  /** Full Scryfall name; `A // B` for a multi-face card. */
  name: string;
  /** Lower-case Scryfall set code (`msh`, `msc`). */
  set: string;
  setName: string | null;
  collectorNumber: string;
  rarity: string | null;
  manaCost: string | null;
  cmc: number | null;
  typeLine: string;
  oracleText: string;
  flavorText: string | null;
  /** `W U B R G`; for a multi-face card, the union of the faces' colours. */
  colors: string[];
  colorIdentity: string[];
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
  defense: string | null;
  keywords: string[];
  layout: string;
  artist: string | null;
  releasedAt: string | null;
  /** `format → legal | not_legal | banned | restricted`, Scryfall's own spelling. */
  legalities: Record<string, string>;
  /** `[]` for a single-faced card. */
  faces: LibraryFace[];
  /** `missing | placeholder | lowres | highres_scan` (report 03 §2.1), or null. */
  imageStatus: string | null;
  /** The Scryfall CDN URL of the front (`normal`), or null when Scryfall has no image. */
  imageRemote: string | null;
  /** The back face's CDN URL, for a card whose faces are printed on two sides. */
  imageRemoteBack: string | null;
  /** Same-origin `/cards/img/<id>/normal` when the image is in `var/cards`, else null. */
  imageLocal: string | null;
  imageLocalBack: string | null;
  /** Scryfall's page for the card (a link, never an endorsement). */
  scryfallUri: string | null;
}

/** `GET /cards/api/status` — is there an index to search at all? */
export interface LibraryStatus {
  /** `true` only when the SQLite index exists and opened. */
  ready: boolean;
  /** One sentence the empty state prints verbatim. */
  message: string;
  /** The command that builds the index, run from the repo root. */
  buildCommand: string;
  /** Repo-relative path of the index file. */
  dbPath: string;
  /** Row counts, when the index is ready. */
  counts: Record<string, number> | null;
  /** When the index was built (ISO), when it says. */
  builtAt: string | null;
  /** Lower-case set codes the index holds prints for. */
  sets: string[];
}

/** `GET /cards/api/search` */
export interface SearchResponse {
  cards: LibraryCard[];
  /** How many matched before the limit. */
  total: number;
  /** `true` when `cards.length < total`. */
  truncated: boolean;
  /** The route stopped reading the index at its scan cap: `total` is a floor ("1,000+"). */
  approximate?: boolean;
  /** Colour or type alone is not a search — the route asks for a word, a set or a deck. */
  needsQuery?: boolean;
}

/** One `<count> <request>` line of a `.dck` file. */
export interface DeckLine {
  count: number;
  name: string;
  /** The `|MSH` suffix, as written (upper-case in Forge's files), or null. */
  set: string | null;
  section: string;
}

/** One deck file under `decks/`, as `GET /cards/api/decks` lists it. */
export interface DeckFile {
  /** Repo-relative: `decks/pacho-shield.dck`. */
  file: string;
  /** `[metadata] Name=`, or the file's base name. */
  name: string;
  lines: DeckLine[];
}

// ---------------------------------------------------------------------------
// Tolerant readers — the page must not blank on a drifted payload
// ---------------------------------------------------------------------------

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function strOrNull(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function strList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function numOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function strRecord(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isObject(value)) return out;
  for (const [k, v] of Object.entries(value)) if (typeof v === 'string') out[k] = v;
  return out;
}

function toFace(raw: unknown): LibraryFace | null {
  if (!isObject(raw)) return null;
  const name = str(raw['name']);
  if (name === '') return null;
  return {
    name,
    manaCost: strOrNull(raw['manaCost']),
    typeLine: str(raw['typeLine']),
    oracleText: str(raw['oracleText']),
    flavorText: strOrNull(raw['flavorText']),
    power: strOrNull(raw['power']),
    toughness: strOrNull(raw['toughness']),
    loyalty: strOrNull(raw['loyalty']),
    defense: strOrNull(raw['defense']),
    artist: strOrNull(raw['artist']),
  };
}

/** Read one card off the wire. `null` for anything without an id and a name. */
export function toLibraryCard(raw: unknown): LibraryCard | null {
  if (!isObject(raw)) return null;
  const id = str(raw['id']);
  const name = str(raw['name']);
  if (id === '' || name === '') return null;
  const faces = Array.isArray(raw['faces'])
    ? raw['faces'].map(toFace).filter((f): f is LibraryFace => f !== null)
    : [];
  return {
    id,
    oracleId: strOrNull(raw['oracleId']),
    name,
    set: str(raw['set']).toLowerCase(),
    setName: strOrNull(raw['setName']),
    collectorNumber: str(raw['collectorNumber']),
    rarity: strOrNull(raw['rarity']),
    manaCost: strOrNull(raw['manaCost']),
    cmc: numOrNull(raw['cmc']),
    typeLine: str(raw['typeLine']),
    oracleText: str(raw['oracleText']),
    flavorText: strOrNull(raw['flavorText']),
    colors: strList(raw['colors']),
    colorIdentity: strList(raw['colorIdentity']),
    power: strOrNull(raw['power']),
    toughness: strOrNull(raw['toughness']),
    loyalty: strOrNull(raw['loyalty']),
    defense: strOrNull(raw['defense']),
    keywords: strList(raw['keywords']),
    layout: str(raw['layout'], 'normal'),
    artist: strOrNull(raw['artist']),
    releasedAt: strOrNull(raw['releasedAt']),
    legalities: strRecord(raw['legalities']),
    faces,
    imageStatus: strOrNull(raw['imageStatus']),
    imageRemote: strOrNull(raw['imageRemote']),
    imageRemoteBack: strOrNull(raw['imageRemoteBack']),
    imageLocal: strOrNull(raw['imageLocal']),
    imageLocalBack: strOrNull(raw['imageLocalBack']),
    scryfallUri: strOrNull(raw['scryfallUri']),
  };
}

export function toStatus(raw: unknown): LibraryStatus | null {
  if (!isObject(raw) || typeof raw['ready'] !== 'boolean') return null;
  const counts: Record<string, number> = {};
  if (isObject(raw['counts'])) {
    for (const [k, v] of Object.entries(raw['counts'])) if (typeof v === 'number') counts[k] = v;
  }
  return {
    ready: raw['ready'],
    message: str(raw['message']),
    buildCommand: str(raw['buildCommand']),
    dbPath: str(raw['dbPath'], 'var/cards/cards.sqlite'),
    counts: isObject(raw['counts']) ? counts : null,
    builtAt: strOrNull(raw['builtAt']),
    sets: strList(raw['sets']).map((s) => s.toLowerCase()),
  };
}

export function toSearchResponse(raw: unknown): SearchResponse {
  if (!isObject(raw)) return { cards: [], total: 0, truncated: false };
  const cards = Array.isArray(raw['cards'])
    ? raw['cards'].map(toLibraryCard).filter((c): c is LibraryCard => c !== null)
    : [];
  const total = typeof raw['total'] === 'number' ? raw['total'] : cards.length;
  const out: SearchResponse = { cards, total, truncated: raw['truncated'] === true || cards.length < total };
  if (raw['approximate'] === true) out.approximate = true;
  if (raw['needsQuery'] === true) out.needsQuery = true;
  return out;
}

export function toDeckFiles(raw: unknown): DeckFile[] {
  const list = isObject(raw) && Array.isArray(raw['decks']) ? raw['decks'] : [];
  const out: DeckFile[] = [];
  for (const deck of list) {
    if (!isObject(deck) || typeof deck['file'] !== 'string') continue;
    const lines: DeckLine[] = [];
    if (Array.isArray(deck['lines'])) {
      for (const line of deck['lines']) {
        if (!isObject(line) || typeof line['name'] !== 'string') continue;
        lines.push({
          count: typeof line['count'] === 'number' ? line['count'] : 1,
          name: line['name'],
          set: strOrNull(line['set']),
          section: str(line['section'], 'main'),
        });
      }
    }
    out.push({ file: deck['file'], name: str(deck['name'], deck['file']), lines });
  }
  return out;
}
