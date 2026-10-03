/*
 * mtg-table — tools/card-library/query.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The read side of the card index: a pure module (Node's built-in
 * `node:sqlite`, synchronous, read-only) that a Vite dev-server plugin imports
 * directly, plus a small JSON-over-stdout CLI for everything else:
 *
 *     node tools/card-library/query.ts name "Peggy Carter, Secret Agent" [--set msh]
 *     node tools/card-library/query.ts number msc 523
 *     node tools/card-library/query.ts id 1f98293e-9d94-4185-8546-8beaf281dfa3
 *     node tools/card-library/query.ts search shrink [--set msh] [--type creature] [--colors WU] [--limit 10]
 *     node tools/card-library/query.ts search creature --sets msh,msc [--color W,M]   (any-of, own colours)
 *     node tools/card-library/query.ts set msh [--limit 50] [--offset 0]
 *     node tools/card-library/query.ts image <scryfallId> [--size normal] [--face back]
 *     node tools/card-library/query.ts resolve decks/pacho-shield.dck
 *     node tools/card-library/query.ts stats
 *
 * **It never touches the network.** `search()` is local FTS5, so a type-ahead
 * cannot trip Scryfall's 2/s limit (report 03 §4.7); `imagePath()` answers from
 * the disk cache; fetching is `images.ts`'s job.
 *
 * The lookup ladder (report 03 §4.6), each rung reported as `match` / `printVia`
 * so a caller can tell a certain answer from a guess:
 *
 *   name:  `exact` (case-insensitive) → `normalized` (punctuation-free:
 *          "shield helicarrier") → `face` (a Forge front-face name like
 *          "Delver of Secrets", or the front of an `A // B`) → `fuzzy` (FTS5 over
 *          the name column, every word a prefix; then any word). A deck
 *          resolution NEVER accepts `fuzzy` silently — it comes back unresolved
 *          with the fuzzy hit as a `suggestion`.
 *   print: `number` (set + collector number) → `set` (the plain printing in the
 *          named set, or the Nth by Forge's art index) → `family` (the named set
 *          has no such card: widen to its parent / children, msh ↔ msc — the
 *          Peggy Carter case) → `synced` (no set named: a print from a set the
 *          library synced, so a Plains is MSH's and not Star Trek's) → `oracle`
 *          (Scryfall's own representative print from the bulk file).
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

import { flag, libraryPaths, parseArgs } from './config.ts';
import { parseDeck, type DeckEntry, type ParsedDeck } from './deck.ts';
import { imagePathFor } from './store.ts';
import {
  ftsQuery,
  IMAGE_EXT,
  imageUrlOf,
  isImageSize,
  MIME,
  normName,
  type Face,
  type ImageSize,
} from './model.ts';

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface PrintFaceRecord {
  name: string | null;
  artist: string | null;
  flavorText: string | null;
  illustrationId: string | null;
}

export interface PrintRecord {
  id: string;
  oracleId: string | null;
  name: string;
  set: string;
  setName: string | null;
  collectorNumber: string;
  lang: string | null;
  rarity: string | null;
  layout: string | null;
  releasedAt: string | null;
  /** Required wherever this print's art is shown (Scryfall / WotC Fan Content Policy, NOTICE §2). */
  artist: string | null;
  flavorText: string | null;
  watermark: string | null;
  frameEffects: string[];
  promoTypes: string[];
  borderColor: string | null;
  fullArt: boolean;
  promo: boolean;
  variation: boolean;
  /** The plain printing rather than a treatment (model.ts `isMainPrint`). */
  isMain: boolean;
  imageStatus: string | null;
  imageUpdatedAt: string | null;
  /** Which image sizes Scryfall has for each side; `back` is null for a one-sided card. */
  imageSizes: { front: ImageSize[]; back: ImageSize[] | null };
  faces: PrintFaceRecord[];
  /** `set`: from a per-set sync. `oracle`: the bulk file's representative print. */
  source: 'oracle' | 'set';
}

export interface RulesFace {
  name: string | null;
  mana_cost: string | null;
  type_line: string | null;
  oracle_text: string | null;
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
  defense: string | null;
  colors: string[] | null;
}

export type MatchKind = 'exact' | 'normalized' | 'face' | 'fuzzy' | 'number' | 'id';
export type PrintVia = 'number' | 'set' | 'family' | 'synced' | 'oracle' | 'any' | 'id';

export interface CardRecord {
  oracleId: string;
  name: string;
  /** `card`, or `extra` for tokens, emblems, art-series and theme cards. */
  kind: 'card' | 'extra';
  layout: string | null;
  manaCost: string | null;
  cmc: number | null;
  typeLine: string | null;
  oracleText: string | null;
  colors: string[] | null;
  colorIdentity: string[];
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
  defense: string | null;
  keywords: string[];
  /** Only the formats that are NOT `not_legal`; an absent format is not legal. */
  legalities: Record<string, string>;
  reserved: boolean;
  edhrecRank: number | null;
  /** The rules faces of a multi-face card (split, adventure, transform, …), or null. */
  faces: RulesFace[] | null;
  print: PrintRecord | null;
  match: MatchKind;
  printVia: PrintVia | null;
}

export interface SearchHit extends CardRecord {
  score: number;
  /** A fragment of the Oracle text with the matches wrapped in `[[` `]]`. */
  snippet: string;
}

export interface SearchFilters {
  /** Only cards with a print in this set; the hit's `print` is that set's. */
  set?: string;
  /**
   * Only cards with a print in ANY of these sets (`p.set_code IN (…)`), merged
   * with `set`. The hit's `print` is the first set's, else its family's. This
   * is how the card browser asks for "MSH + MSC" without reading the whole
   * library first and filtering afterwards (which dropped every card outside
   * the first 1,000 bm25 hits).
   */
  sets?: readonly string[];
  /**
   * Only these oracle ids — an allow-list, e.g. a deck resolved first. An empty
   * list matches nothing; absent is no filter.
   */
  oracleIds?: readonly string[];
  /** Substring of the type line, case-insensitive (`creature`, `aura`, `hero`). */
  type?: string;
  /** Colour identity within these colours, e.g. `WU` (Commander-style). `C` for colourless only. */
  colors?: string;
  /**
   * Any-of on the card's OWN colours (the pips, not identity): `W U B R G`,
   * plus `C` = no colour and `M` = two or more. A card Scryfall colours per face
   * (a transform card has no top-level `colors`) answers with the union of its
   * faces' — the same rule the card browser's `matchesColors` applies.
   */
  colorsAny?: readonly string[];
  /** Include tokens, emblems, art-series and theme cards. Default false. */
  includeExtras?: boolean;
  limit?: number;
  offset?: number;
}

export interface SetRecord {
  code: string;
  name: string;
  setType: string | null;
  releasedAt: string | null;
  cardCount: number | null;
  parentSetCode: string | null;
  syncedAt: string | null;
  syncedPrints: number | null;
  /** Downloaded, never hotlinked (report 03 §1.7). */
  iconSvg: string | null;
}

export interface DeckResolution {
  entry: DeckEntry;
  card: CardRecord | null;
  /** Why it did not resolve; null when it did. */
  reason: string | null;
  /** A fuzzy guess the user should confirm — never substituted silently. */
  suggestion: { name: string; set: string | null; collectorNumber: string | null } | null;
}

export interface ResolvedDeck {
  name: string | null;
  format: 'dck' | 'txt';
  cards: number;
  distinct: number;
  resolved: number;
  unresolved: number;
  entries: DeckResolution[];
}

export interface ImageTarget {
  id: string;
  size: ImageSize;
  face: Face;
  /** Where it lives (or will live) on disk. */
  path: string;
  /** Where it comes from. */
  url: string;
  mime: string;
  imageStatus: string | null;
}

export class LibraryMissingError extends Error {
  constructor(path: string) {
    super(`no card index at ${path} — build it with: node tools/card-library/build.ts`);
    this.name = 'LibraryMissingError';
  }
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

const s = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const n = (v: unknown): number | null => (typeof v === 'number' ? v : typeof v === 'bigint' ? Number(v) : null);
const b = (v: unknown): boolean => v === 1 || v === 1n || v === true;
function arr(v: unknown): string[] {
  if (typeof v !== 'string') return [];
  const parsed = JSON.parse(v) as unknown;
  return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
}
function sizes(v: unknown): ImageSize[] {
  return typeof v === 'string' && v !== '' ? v.split(',').filter(isImageSize) : [];
}

function toPrint(row: Row, faces: PrintFaceRecord[]): PrintRecord {
  return {
    id: String(row['id']),
    oracleId: s(row['oracle_id']),
    name: String(row['name']),
    set: String(row['set_code']),
    setName: s(row['set_name']),
    collectorNumber: String(row['collector_number']),
    lang: s(row['lang']),
    rarity: s(row['rarity']),
    layout: s(row['layout']),
    releasedAt: s(row['released_at']),
    artist: s(row['artist']),
    flavorText: s(row['flavor_text']),
    watermark: s(row['watermark']),
    frameEffects: arr(row['frame_effects']),
    promoTypes: arr(row['promo_types']),
    borderColor: s(row['border_color']),
    fullArt: b(row['full_art']),
    promo: b(row['promo']),
    variation: b(row['variation']),
    isMain: b(row['is_main']),
    imageStatus: s(row['image_status']),
    imageUpdatedAt: s(row['image_updated_at']),
    imageSizes: {
      front: sizes(row['front_sizes']),
      back: row['back_sizes'] === null || row['back_sizes'] === undefined ? null : sizes(row['back_sizes']),
    },
    faces,
    source: row['source'] === 'set' ? 'set' : 'oracle',
  };
}

function toCard(row: Row, print: PrintRecord | null, match: MatchKind, printVia: PrintVia | null): CardRecord {
  const legalities = typeof row['legalities'] === 'string' ? (JSON.parse(row['legalities']) as Record<string, string>) : {};
  const faces = typeof row['faces'] === 'string' ? (JSON.parse(row['faces']) as RulesFace[]) : null;
  const colors = typeof row['colors'] === 'string' ? arr(row['colors']) : null;
  return {
    oracleId: String(row['oracle_id']),
    name: String(row['name']),
    kind: row['kind'] === 'extra' ? 'extra' : 'card',
    layout: s(row['layout']),
    manaCost: s(row['mana_cost']),
    cmc: n(row['cmc']),
    typeLine: s(row['type_line']),
    oracleText: s(row['oracle_text']),
    colors,
    colorIdentity: arr(row['color_identity']),
    power: s(row['power']),
    toughness: s(row['toughness']),
    loyalty: s(row['loyalty']),
    defense: s(row['defense']),
    keywords: arr(row['keywords']),
    legalities,
    reserved: b(row['reserved']),
    edhrecRank: n(row['edhrec_rank']),
    faces,
    print,
    match,
    printVia,
  };
}

/** Plain printing first, then collector number as a number, then as a string. */
function comparePrints(a: Row, c: Row): number {
  return (
    Number(b(c['is_main'])) - Number(b(a['is_main'])) ||
    Number(a['cn_sort']) - Number(c['cn_sort']) ||
    String(a['collector_number']).localeCompare(String(c['collector_number']))
  );
}

// ---------------------------------------------------------------------------
// The library
// ---------------------------------------------------------------------------

export interface LibraryOptions {
  /** `var/cards/images` by default (relative to `root`). */
  imagesDir?: string;
  root?: string;
}

export class CardLibrary {
  readonly path: string;
  readonly imagesDir: string;
  readonly db: DatabaseSync;
  readonly #st: Record<string, StatementSync>;
  /** Synced sets, in sync order — the `synced` rung prefers the first. */
  readonly #synced: string[];

  constructor(dbPath: string, options: LibraryOptions = {}) {
    if (!existsSync(dbPath)) throw new LibraryMissingError(dbPath);
    this.path = dbPath;
    this.imagesDir = options.imagesDir ?? libraryPaths(options.root ?? process.cwd()).imagesDir;
    this.db = new DatabaseSync(dbPath, { readOnly: true });
    const p = (sql: string): StatementSync => this.db.prepare(sql);
    this.#st = {
      cardByOracle: p('SELECT rowid, * FROM cards WHERE oracle_id = ?'),
      exactName: p(`SELECT * FROM cards WHERE name = ? COLLATE NOCASE ORDER BY kind = 'card' DESC, edhrec_rank IS NULL, edhrec_rank`),
      namesByNorm: p(
        `SELECT c.*, n.kind AS name_kind FROM card_names n JOIN cards c ON c.oracle_id = n.oracle_id
         WHERE n.norm_name = ? ORDER BY n.kind = 'full' DESC, c.kind = 'card' DESC, c.edhrec_rank IS NULL, c.edhrec_rank`,
      ),
      printsByNorm: p('SELECT * FROM prints WHERE norm_name = ?'),
      fuzzy: p(
        `SELECT c.* FROM cards_fts JOIN cards c ON c.rowid = cards_fts.rowid
         WHERE cards_fts MATCH ? AND c.kind = 'card'
         ORDER BY bm25(cards_fts, 10.0, 1.0, 1.0), length(c.name) LIMIT 1`,
      ),
      printById: p('SELECT * FROM prints WHERE id = ?'),
      printBySetNumber: p(`SELECT * FROM prints WHERE set_code = ? AND collector_number = ? ORDER BY lang = 'en' DESC LIMIT 1`),
      printsByOracle: p('SELECT * FROM prints WHERE oracle_id = ?'),
      faces: p('SELECT * FROM print_faces WHERE print_id = ? ORDER BY idx'),
      set: p('SELECT * FROM sets WHERE code = ?'),
      family: p('SELECT code FROM sets WHERE code = ? OR parent_set_code = ? OR code = (SELECT parent_set_code FROM sets WHERE code = ?) OR parent_set_code = (SELECT parent_set_code FROM sets WHERE code = ?)'),
      syncedSets: p('SELECT * FROM sets WHERE synced_at IS NOT NULL ORDER BY rowid'),
      setPrints: p(
        `SELECT p.* FROM prints p WHERE p.set_code = ? ORDER BY p.cn_sort, p.collector_number LIMIT ? OFFSET ?`,
      ),
      setCount: p('SELECT count(*) AS n FROM prints WHERE set_code = ?'),
      meta: p('SELECT key, value FROM meta ORDER BY key'),
    };
    this.#synced = this.#st['syncedSets']!.all().map((r) => String(r['code']));
  }

  close(): void {
    this.db.close();
  }

  meta(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const row of this.#st['meta']!.all()) out[String(row['key'])] = String(row['value']);
    return out;
  }

  // -- prints ---------------------------------------------------------------

  #print(row: Row | undefined): PrintRecord | null {
    if (row === undefined) return null;
    const faces = this.#st['faces']!.all(String(row['id'])).map((f) => ({
      name: s(f['name']),
      artist: s(f['artist']),
      flavorText: s(f['flavor_text']),
      illustrationId: s(f['illustration_id']),
    }));
    return toPrint(row, faces);
  }

  #family(set: string): Set<string> {
    const out = new Set<string>([set]);
    for (const row of this.#st['family']!.all(set, set, set, set)) out.add(String(row['code']));
    return out;
  }

  /** The print ladder: `set` → `family` → `synced` → `oracle` → `any`. */
  #choosePrint(card: Row, set: string | null, artIndex: number | null): { row: Row | undefined; via: PrintVia | null } {
    const all = this.#st['printsByOracle']!.all(String(card['oracle_id'])).sort(comparePrints);
    if (set !== null) {
      const inSet = all.filter((p) => p['set_code'] === set);
      if (inSet.length > 0) {
        if (artIndex !== null) {
          const mains = inSet.filter((p) => b(p['is_main']));
          const pool = mains.length > 0 ? mains : inSet;
          return { row: pool[Math.min(Math.max(artIndex, 1), pool.length) - 1], via: 'set' };
        }
        return { row: inSet[0], via: 'set' };
      }
      const family = this.#family(set);
      const inFamily = all.filter((p) => family.has(String(p['set_code'])));
      if (inFamily.length > 0) return { row: inFamily[0], via: 'family' };
    }
    for (const code of this.#synced) {
      const synced = all.filter((p) => p['set_code'] === code && p['source'] === 'set');
      if (synced.length > 0) return { row: synced[0], via: 'synced' };
    }
    const rep = all.find((p) => p['id'] === card['default_print_id']);
    if (rep !== undefined) return { row: rep, via: 'oracle' };
    return { row: all[0], via: all.length > 0 ? 'any' : null };
  }

  #card(row: Row, match: MatchKind, set: string | null, artIndex: number | null = null): CardRecord {
    const { row: printRow, via } = this.#choosePrint(row, set, artIndex);
    return toCard(row, this.#print(printRow), match, via);
  }

  #cardForPrint(printRow: Row, match: MatchKind, via: PrintVia): CardRecord | null {
    const oracleId = s(printRow['oracle_id']);
    const cardRow = oracleId === null ? undefined : this.#st['cardByOracle']!.get(oracleId);
    if (cardRow === undefined) return null;
    return toCard(cardRow, this.#print(printRow), match, via);
  }

  // -- the API ----------------------------------------------------------------

  /** The rules row for a name, without choosing a print. `fuzzy` only when asked. */
  #findByName(name: string, fuzzy: boolean): { row: Row; match: MatchKind } | null {
    const trimmed = name.trim().replace(/\+$/, '').trim();
    if (trimmed === '') return null;
    const exact = this.#st['exactName']!.get(trimmed);
    if (exact !== undefined) return { row: exact, match: 'exact' };
    const norm = normName(trimmed);
    const named = this.#st['namesByNorm']!.get(norm);
    if (named !== undefined) return { row: named, match: named['name_kind'] === 'face' ? 'face' : 'normalized' };
    // `A // B` where only the front is known under that spelling (report 03 §3.4).
    const slash = trimmed.indexOf('//');
    if (slash > 0) {
      const front = this.#st['namesByNorm']!.get(normName(trimmed.slice(0, slash)));
      if (front !== undefined) return { row: front, match: 'face' };
    }
    // A print whose card the rules layer does not have under that name.
    const print = this.#st['printsByNorm']!.get(norm);
    if (print !== undefined && typeof print['oracle_id'] === 'string') {
      const row = this.#st['cardByOracle']!.get(print['oracle_id']);
      if (row !== undefined) return { row, match: 'normalized' };
    }
    if (!fuzzy) return null;
    for (const op of ['AND', 'OR'] as const) {
      const q = ftsQuery(trimmed, op, 'norm_name');
      if (q === null) return null;
      const hit = this.#st['fuzzy']!.get(q);
      if (hit !== undefined) return { row: hit, match: 'fuzzy' };
    }
    return null;
  }

  /**
   * Exact (case-insensitive), then punctuation-free, then a face name, then —
   * unless `fuzzy: false` — FTS5 over names. `set` chooses the print (and widens
   * to its family when the card is not in it).
   */
  getByName(name: string, options: { set?: string; fuzzy?: boolean; artIndex?: number } = {}): CardRecord | null {
    const found = this.#findByName(name, options.fuzzy !== false);
    if (found === null) return null;
    return this.#card(found.row, found.match, options.set?.toLowerCase() ?? null, options.artIndex ?? null);
  }

  /** The exact print `(set, collector number)` — the only true key besides the id (report 03 §3.3). */
  getBySetNumber(set: string, collectorNumber: string): CardRecord | null {
    const row = this.#st['printBySetNumber']!.get(set.toLowerCase(), collectorNumber.trim());
    return row === undefined ? null : this.#cardForPrint(row, 'number', 'number');
  }

  getById(id: string): CardRecord | null {
    const row = this.#st['printById']!.get(id);
    return row === undefined ? null : this.#cardForPrint(row, 'id', 'id');
  }

  /** Every print of a card the library knows, plain printings first. */
  printsOf(oracleId: string): PrintRecord[] {
    return this.#st['printsByOracle']!
      .all(oracleId)
      .sort((a, c) => String(a['set_code']).localeCompare(String(c['set_code'])) || comparePrints(a, c))
      .map((r) => this.#print(r)!);
  }

  /**
   * Local full-text search over the name (weight 10), type line (3) and Oracle
   * text (1): every word a prefix term, all of them required, phrase matches
   * first. `set` restricts to cards with a print in that set (and returns that
   * print). Never the network.
   */
  search(text: string, filters: SearchFilters = {}): SearchHit[] {
    const query = ftsQuery(text, 'AND');
    const sets = [
      ...new Set(
        [filters.set ?? '', ...(filters.sets ?? [])].map((code) => code.trim().toLowerCase()).filter((code) => code !== ''),
      ),
    ];
    const set = sets[0] ?? null;
    const limit = Math.min(Math.max(filters.limit ?? 25, 1), 200);
    const offset = Math.max(filters.offset ?? 0, 0);
    if (query === null) {
      // No words: a set (or several, one after the other) in collector-number order.
      if (sets.length <= 1) return set === null ? [] : this.browseSet(set, filters);
      return sets.flatMap((code) => this.browseSet(code, { limit: 1000 })).slice(offset, offset + limit);
    }
    const where: string[] = [];
    const params: (string | number)[] = [];
    if (filters.includeExtras !== true) where.push(`c.kind = 'card'`);
    if (sets.length > 0) {
      where.push(
        `EXISTS (SELECT 1 FROM prints p WHERE p.oracle_id = c.oracle_id AND p.set_code IN (${sets.map(() => '?').join(', ')}))`,
      );
      params.push(...sets);
    }
    if (filters.oracleIds !== undefined) {
      // One parameter however long the list is: a JSON array, unpacked by SQLite.
      where.push('c.oracle_id IN (SELECT value FROM json_each(?))');
      params.push(JSON.stringify(filters.oracleIds));
    }
    if (filters.type !== undefined && filters.type.trim() !== '') {
      where.push(`c.type_line LIKE '%' || ? || '%'`);
      params.push(filters.type.trim());
    }
    if (filters.colors !== undefined && filters.colors.trim() !== '') {
      const allowed = filters.colors.toUpperCase().replace(/[^WUBRG]/g, '');
      where.push(`NOT EXISTS (SELECT 1 FROM json_each(c.color_identity) j WHERE instr(?, j.value) = 0)`);
      params.push(allowed);
    }
    const colour = colourAnySql(filters.colorsAny ?? []);
    if (colour !== null) {
      where.push(colour.sql);
      params.push(...colour.params);
    }
    const run = (match: string, take: number): Row[] =>
      this.db
        .prepare(
          `SELECT c.*, bm25(cards_fts, 10.0, 3.0, 1.0) AS score,
                  snippet(cards_fts, 2, '[[', ']]', '…', 16) AS snippet
           FROM cards_fts JOIN cards c ON c.rowid = cards_fts.rowid
           WHERE cards_fts MATCH ?${where.length > 0 ? ` AND ${where.join(' AND ')}` : ''}
           ORDER BY score, length(c.name), c.rowid LIMIT ?`,
        )
        .all(match, ...params, take);
    // Several words: the cards where they occur AS A PHRASE come first
    // ("attacks alone" is Peggy Carter's and Nick Fury's text before it is a
    // card named "…, Alone"), then every card that has them all.
    const phrase = ftsQuery(text.replace(/\s+/g, '-'), 'AND');
    const first = phrase !== null && phrase !== query ? run(phrase, offset + limit) : [];
    const seen = new Set(first.map((r) => String(r['oracle_id'])));
    const rest = run(query, offset + limit + first.length).filter((r) => !seen.has(String(r['oracle_id'])));
    return [...first, ...rest].slice(offset, offset + limit).map((row) => ({
      ...this.#card(row, 'fuzzy', set),
      score: Number(row['score']),
      snippet: String(row['snippet'] ?? ''),
    }));
  }

  /** Every print of one set, in collector-number order — the card browser's "show me MSH". */
  browseSet(set: string, filters: Pick<SearchFilters, 'limit' | 'offset'> = {}): SearchHit[] {
    const limit = Math.min(Math.max(filters.limit ?? 100, 1), 1000);
    const offset = Math.max(filters.offset ?? 0, 0);
    const out: SearchHit[] = [];
    for (const printRow of this.#st['setPrints']!.all(set.toLowerCase(), limit, offset)) {
      const card = this.#cardForPrint(printRow, 'number', 'set');
      if (card !== null) out.push({ ...card, score: 0, snippet: '' });
    }
    return out;
  }

  setSize(set: string): number {
    return Number(this.#st['setCount']!.get(set.toLowerCase())?.['n'] ?? 0);
  }

  getSet(code: string): SetRecord | null {
    const row = this.#st['set']!.get(code.toLowerCase());
    return row === undefined ? null : toSet(row);
  }

  /** The sets whose every print the library holds (`build.ts --sets`). */
  syncedSets(): SetRecord[] {
    return this.#st['syncedSets']!.all().map(toSet);
  }

  /** Where an image lives on disk and where it comes from; null if Scryfall has no such image. */
  imageTarget(id: string, size: ImageSize = 'normal', face: Face = 'front'): ImageTarget | null {
    const row = this.#st['printById']!.get(id);
    if (row === undefined) return null;
    const url = imageUrlOf(
      {
        id,
        frontSizes: s(row['front_sizes']),
        backSizes: s(row['back_sizes']),
        version: s(row['image_version']),
        raw: s(row['image_uris_raw']),
      },
      size,
      face,
    );
    if (url === null) return null;
    return {
      id,
      size,
      face,
      path: imagePathFor(this.imagesDir, id, size, face),
      url,
      mime: MIME[IMAGE_EXT[size]],
      imageStatus: s(row['image_status']),
    };
  }

  /** The cached file for an image, or null when it has not been fetched (see images.ts). */
  imagePath(id: string, size: ImageSize = 'normal', face: Face = 'front'): string | null {
    const path = imagePathFor(this.imagesDir, id, size, face);
    return existsSync(path) && statSync(path).size > 0 ? path : null;
  }

  /** The remote URL (Scryfall's CDN) — for a caller that wants it; the app serves the cache. */
  imageUrl(id: string, size: ImageSize = 'normal', face: Face = 'front'): string | null {
    return this.imageTarget(id, size, face)?.url ?? null;
  }

  /** One deck entry through both ladders. Never throws: a deck list is user input. */
  resolveEntry(entry: DeckEntry): DeckResolution {
    if (entry.set !== null && entry.collectorNumber !== null) {
      const card = this.getBySetNumber(entry.set, entry.collectorNumber);
      if (card !== null) return { entry, card, reason: null, suggestion: null };
    }
    const found = this.#findByName(entry.name, false);
    if (found !== null) {
      return { entry, card: this.#card(found.row, found.match, entry.set, entry.artIndex), reason: null, suggestion: null };
    }
    const guess = this.getByName(entry.name, { fuzzy: true, ...(entry.set === null ? {} : { set: entry.set }) });
    return {
      entry,
      card: null,
      reason: `no card named "${entry.name}"`,
      suggestion:
        guess === null
          ? null
          : { name: guess.name, set: guess.print?.set ?? null, collectorNumber: guess.print?.collectorNumber ?? null },
    };
  }

  resolveDeck(deck: ParsedDeck): ResolvedDeck {
    const entries = deck.entries.map((entry) => this.resolveEntry(entry));
    return {
      name: deck.name,
      format: deck.format,
      cards: deck.entries.reduce((sum, e) => sum + e.count, 0),
      distinct: deck.entries.length,
      resolved: entries.filter((e) => e.card !== null).length,
      unresolved: entries.filter((e) => e.card === null).length,
      entries,
    };
  }

  resolveDeckFile(path: string): ResolvedDeck {
    return this.resolveDeck(parseDeck(readFileSync(path, 'utf8'), path));
  }

  stats(): Record<string, unknown> {
    const count = (sql: string): number => Number(this.db.prepare(sql).get()?.['n'] ?? 0);
    return {
      path: this.path,
      bytes: statSync(this.path).size,
      cards: count('SELECT count(*) AS n FROM cards'),
      playableCards: count(`SELECT count(*) AS n FROM cards WHERE kind = 'card'`),
      prints: count('SELECT count(*) AS n FROM prints'),
      syncedPrints: count(`SELECT count(*) AS n FROM prints WHERE source = 'set'`),
      sets: count('SELECT count(*) AS n FROM sets'),
      syncedSets: this.syncedSets().map((set) => ({ code: set.code, name: set.name, prints: set.syncedPrints, syncedAt: set.syncedAt })),
      meta: this.meta(),
    };
  }
}

/**
 * The card's own colours as SQL over `cards` aliased `c`: its `colors` array,
 * or — when Scryfall colours it per face and `colors` is NULL — every face's
 * (the rules faces' `colors`, stored in `c.faces`).
 */
const FACE_COLOURS =
  `json_each(CASE WHEN c.colors IS NULL THEN COALESCE(c.faces, '[]') ELSE '[]' END) f ` +
  `JOIN json_each(COALESCE(json_extract(f.value, '$.colors'), '[]')) fc`;

/** {@link SearchFilters.colorsAny} as one OR-ed predicate, or null for no filter. */
export function colourAnySql(colorsAny: readonly string[]): { sql: string; params: string[] } | null {
  const wanted = [...new Set(colorsAny.map((c) => c.trim().toUpperCase()))].filter((c) => /^[WUBRGCM]$/.test(c));
  if (wanted.length === 0) return null;
  const clauses: string[] = [];
  const params: string[] = [];
  const specific = wanted.filter((c) => c !== 'C' && c !== 'M');
  if (specific.length > 0) {
    const ph = specific.map(() => '?').join(', ');
    clauses.push(
      `EXISTS (SELECT 1 FROM json_each(COALESCE(c.colors, '[]')) oc WHERE oc.value IN (${ph}))`,
      `EXISTS (SELECT 1 FROM ${FACE_COLOURS} WHERE fc.value IN (${ph}))`,
    );
    params.push(...specific, ...specific);
  }
  if (wanted.includes('C')) {
    clauses.push(`(json_array_length(COALESCE(c.colors, '[]')) = 0 AND NOT EXISTS (SELECT 1 FROM ${FACE_COLOURS}))`);
  }
  if (wanted.includes('M')) {
    clauses.push(
      `(json_array_length(COALESCE(c.colors, '[]')) >= 2 OR (SELECT count(DISTINCT fc.value) FROM ${FACE_COLOURS}) >= 2)`,
    );
  }
  return { sql: `(${clauses.join(' OR ')})`, params };
}

function toSet(row: Row): SetRecord {
  return {
    code: String(row['code']),
    name: String(row['name']),
    setType: s(row['set_type']),
    releasedAt: s(row['released_at']),
    cardCount: n(row['card_count']),
    parentSetCode: s(row['parent_set_code']),
    syncedAt: s(row['synced_at']),
    syncedPrints: n(row['synced_prints']),
    iconSvg: s(row['icon_svg']),
  };
}

/** Open the index read-only. Throws {@link LibraryMissingError} when it has not been built. */
export function openLibrary(dbPath?: string, options: LibraryOptions = {}): CardLibrary {
  const root = options.root ?? process.cwd();
  return new CardLibrary(dbPath ?? libraryPaths(root).db, { ...options, root });
}

// ---------------------------------------------------------------------------
// CLI: one JSON document on stdout, errors as {"error": …} with exit code 1
// ---------------------------------------------------------------------------

function cli(argv: readonly string[]): unknown {
  const args = parseArgs(argv);
  const [command, ...rest] = args.positional;
  const root = process.cwd();
  const dbFlag = flag(args, 'db');
  const lib = openLibrary(dbFlag === undefined ? undefined : resolve(root, dbFlag), { root });
  try {
    const int = (key: string): number | undefined => {
      const v = flag(args, key);
      return v === undefined ? undefined : Number.parseInt(v, 10);
    };
    const opt = <T extends object>(o: T): T =>
      Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
    switch (command) {
      case 'name': {
        const set = flag(args, 'set');
        return lib.getByName(rest.join(' '), opt({ set, fuzzy: flag(args, 'fuzzy') !== 'false' }));
      }
      case 'number':
        return lib.getBySetNumber(rest[0] ?? '', rest[1] ?? '');
      case 'id':
        return lib.getById(rest[0] ?? '');
      case 'prints':
        return lib.printsOf(rest[0] ?? '');
      case 'search':
        return lib.search(
          rest.join(' '),
          opt({
            set: flag(args, 'set'),
            sets: flag(args, 'sets')?.split(','),
            type: flag(args, 'type'),
            colors: flag(args, 'colors'),
            colorsAny: flag(args, 'color')?.split(','),
            limit: int('limit'),
            offset: int('offset'),
            includeExtras: flag(args, 'extras') === 'true' ? true : undefined,
          }),
        );
      case 'set':
        return { set: lib.getSet(rest[0] ?? ''), size: lib.setSize(rest[0] ?? ''), cards: lib.browseSet(rest[0] ?? '', opt({ limit: int('limit'), offset: int('offset') })) };
      case 'image': {
        const size = flag(args, 'size') ?? 'normal';
        if (!isImageSize(size)) throw new Error(`unknown size ${size}`);
        const face = flag(args, 'face') === 'back' ? 'back' : 'front';
        const target = lib.imageTarget(rest[0] ?? '', size, face);
        return target === null ? null : { ...target, cached: lib.imagePath(target.id, size, face) !== null };
      }
      case 'resolve':
        return lib.resolveDeckFile(resolve(root, rest[0] ?? 'decks/pacho-shield.dck'));
      case 'stats':
        return lib.stats();
      default:
        throw new Error('usage: query.ts name|number|id|prints|search|set|image|resolve|stats …');
    }
  } finally {
    lib.close();
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(`${JSON.stringify(cli(process.argv.slice(2)), null, 2)}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n`);
    process.exitCode = 1;
  }
}
