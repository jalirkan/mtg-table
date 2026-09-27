/*
 * mtg-table — tools/card-library/db.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The index: one SQLite file (`var/cards/cards.sqlite`) through Node 24's
 * built-in `node:sqlite`, with FTS5 — no native module, no npm dependency
 * (report 03 §4.4, verified again for this build: SQLite 3.53.4, FTS5 with the
 * porter tokenizer).
 *
 * Two layers, because they come from two places (report 03 §0.3, §4.3):
 *
 *   - `cards` — the RULES layer, one row per `oracle_id`, from the
 *     `oracle_cards` bulk file. Name, cost, type, Oracle text, P/T, legalities.
 *     This is what search runs over.
 *   - `prints` — the PRINT layer, one row per Scryfall id: set, collector
 *     number, artist, frame effects, images. Filled from the per-set
 *     `/cards/search?q=e:<set>&unique=prints` sync (source `set`) AND from each
 *     bulk row's own representative print (source `oracle`), so every card has at
 *     least one print and every print has images. `oracle_cards` alone is the
 *     wrong file for images — its Plains is the Star Trek one (§0.3) — which is
 *     why a synced set's print outranks the representative.
 *
 * `card_names` holds every name a card answers to (full name and each face's),
 * normalised, so an exact lookup survives case, punctuation and Forge's
 * front-face-only names (§3.4). `cards_fts` is the FTS5 index over the
 * normalised name, the type line and the Oracle text (external content: it
 * reads `cards`, so the text is stored once), rebuilt at the end of every build.
 *
 * Measured on the first real build, and why the print layer is lean: storing
 * each print's eleven image URLs verbatim was 48 MB of a 150 MB file and the
 * word `not_legal` another 19 MB. A print now keeps its image SIZES and the
 * cache-buster (model.ts `packImages`, verified URL-for-URL at ingest), a card
 * keeps only the formats it is legal / restricted / banned in, and rules text
 * lives on `cards` alone — 55 MB in all.
 *
 * The schema is versioned in `meta`; a build always writes a fresh file (see
 * build.ts), so there is no migration path to maintain.
 */

import { DatabaseSync, type StatementSync } from 'node:sqlite';

import {
  cnSort,
  compactLegalities,
  imageSides,
  isMainPrint,
  kindOf,
  namesOf,
  normName,
  oracleIdOf,
  packImages,
  searchText,
  type ScryCard,
  type ScrySet,
} from './model.ts';

export const SCHEMA_VERSION = 1;

export const SCHEMA = `
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE sets (
  code            TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  set_type        TEXT,
  released_at     TEXT,
  card_count      INTEGER,
  parent_set_code TEXT,
  block           TEXT,
  digital         INTEGER,
  icon_svg_uri    TEXT,
  icon_svg        TEXT,
  synced_at       TEXT,
  synced_prints   INTEGER
);

CREATE TABLE cards (
  oracle_id        TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  norm_name        TEXT NOT NULL,
  kind             TEXT NOT NULL,
  layout           TEXT,
  mana_cost        TEXT,
  cmc              REAL,
  type_line        TEXT,
  oracle_text      TEXT,
  colors           TEXT,
  color_identity   TEXT,
  power            TEXT,
  toughness        TEXT,
  loyalty          TEXT,
  defense          TEXT,
  keywords         TEXT,
  legalities       TEXT,
  reserved         INTEGER,
  edhrec_rank      INTEGER,
  faces            TEXT,
  default_print_id TEXT NOT NULL
);
CREATE INDEX cards_norm_name ON cards(norm_name);
CREATE INDEX cards_name_nocase ON cards(name COLLATE NOCASE);

CREATE TABLE card_names (
  norm_name TEXT NOT NULL,
  oracle_id TEXT NOT NULL,
  kind      TEXT NOT NULL,
  PRIMARY KEY (norm_name, oracle_id)
) WITHOUT ROWID;

CREATE TABLE prints (
  id               TEXT PRIMARY KEY,
  oracle_id        TEXT,
  name             TEXT NOT NULL,
  norm_name        TEXT NOT NULL,
  set_code         TEXT NOT NULL,
  set_name         TEXT,
  collector_number TEXT NOT NULL,
  cn_sort          INTEGER NOT NULL,
  lang             TEXT,
  rarity           TEXT,
  layout           TEXT,
  released_at      TEXT,
  flavor_text      TEXT,
  artist           TEXT,
  watermark        TEXT,
  frame_effects    TEXT,
  promo_types      TEXT,
  border_color     TEXT,
  full_art         INTEGER,
  promo            INTEGER,
  variation        INTEGER,
  is_main          INTEGER NOT NULL,
  image_status     TEXT,
  image_updated_at TEXT,
  highres_image    INTEGER,
  front_sizes      TEXT,
  back_sizes       TEXT,
  image_version    TEXT,
  image_uris_raw   TEXT,
  source           TEXT NOT NULL
);
CREATE INDEX prints_set_cn ON prints(set_code, collector_number);
CREATE INDEX prints_oracle ON prints(oracle_id);
CREATE INDEX prints_norm_name ON prints(norm_name);

CREATE TABLE print_faces (
  print_id        TEXT NOT NULL,
  idx             INTEGER NOT NULL,
  name            TEXT,
  flavor_text     TEXT,
  artist          TEXT,
  illustration_id TEXT,
  PRIMARY KEY (print_id, idx)
) WITHOUT ROWID;

CREATE VIRTUAL TABLE cards_fts USING fts5(
  norm_name, type_line, oracle_text,
  content = 'cards', content_rowid = 'rowid',
  tokenize = 'porter unicode61 remove_diacritics 2'
);
`;

export function openDb(path: string, readOnly = false): DatabaseSync {
  const db = new DatabaseSync(path, readOnly ? { readOnly: true } : {});
  if (!readOnly) {
    db.exec('PRAGMA journal_mode = OFF; PRAGMA synchronous = OFF; PRAGMA temp_store = MEMORY;');
  }
  return db;
}

const json = (value: unknown): string | null => (value === undefined || value === null ? null : JSON.stringify(value));
const str = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const bool = (value: unknown): number | null => (typeof value === 'boolean' ? (value ? 1 : 0) : null);
const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

export type PrintSource = 'oracle' | 'set';

const PRINT_COLUMNS = [
  'id',
  'oracle_id',
  'name',
  'norm_name',
  'set_code',
  'set_name',
  'collector_number',
  'cn_sort',
  'lang',
  'rarity',
  'layout',
  'released_at',
  'flavor_text',
  'artist',
  'watermark',
  'frame_effects',
  'promo_types',
  'border_color',
  'full_art',
  'promo',
  'variation',
  'is_main',
  'image_status',
  'image_updated_at',
  'highres_image',
  'front_sizes',
  'back_sizes',
  'image_version',
  'image_uris_raw',
  'source',
] as const;

/** A print's own flavour text: the top level's, or its faces' joined. */
function flavourOf(card: ScryCard): string | null {
  if (typeof card.flavor_text === 'string') return card.flavor_text;
  const faces = (card.card_faces ?? []).map((f) => f.flavor_text).filter((t): t is string => typeof t === 'string');
  return faces.length === 0 ? null : faces.join('\n//\n');
}

/** A print's artist: the top level's, or its faces' distinct artists joined. */
function artistOf(card: ScryCard): string | null {
  if (typeof card.artist === 'string' && card.artist !== '') return card.artist;
  const faces = [...new Set((card.card_faces ?? []).map((f) => f.artist).filter((a): a is string => typeof a === 'string' && a !== ''))];
  return faces.length === 0 ? null : faces.join(' / ');
}

/** Prepared statements for a build, in one place so the per-row cost is one `run()`. */
export class IndexWriter {
  readonly db: DatabaseSync;
  readonly #card: StatementSync;
  readonly #cardExists: StatementSync;
  readonly #name: StatementSync;
  readonly #print: StatementSync;
  readonly #printKeep: StatementSync;
  readonly #face: StatementSync;
  readonly #faceClear: StatementSync;
  readonly #set: StatementSync;
  readonly #meta: StatementSync;
  /** Rules rows a synced print had to supply because the bulk file predates it. */
  rulesFromPrints = 0;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.#card = db.prepare(
      `INSERT OR REPLACE INTO cards (oracle_id, name, norm_name, kind, layout, mana_cost, cmc, type_line,
         oracle_text, colors, color_identity, power, toughness, loyalty, defense, keywords, legalities,
         reserved, edhrec_rank, faces, default_print_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    this.#cardExists = db.prepare('SELECT 1 AS hit FROM cards WHERE oracle_id = ?');
    this.#name = db.prepare('INSERT OR IGNORE INTO card_names (norm_name, oracle_id, kind) VALUES (?, ?, ?)');
    const cols = `(${PRINT_COLUMNS.join(', ')}) VALUES (${PRINT_COLUMNS.map(() => '?').join(', ')})`;
    // A set sync replaces whatever is there; the bulk's representative never
    // overwrites a synced print.
    this.#print = db.prepare(`INSERT OR REPLACE INTO prints ${cols}`);
    this.#printKeep = db.prepare(`INSERT OR IGNORE INTO prints ${cols}`);
    this.#face = db.prepare(
      `INSERT OR REPLACE INTO print_faces (print_id, idx, name, flavor_text, artist, illustration_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    this.#faceClear = db.prepare('DELETE FROM print_faces WHERE print_id = ?');
    this.#set = db.prepare(
      `INSERT INTO sets (code, name, set_type, released_at, card_count, parent_set_code, block, digital, icon_svg_uri)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(code) DO UPDATE SET name = excluded.name, set_type = excluded.set_type,
         released_at = excluded.released_at, card_count = excluded.card_count,
         parent_set_code = excluded.parent_set_code, block = excluded.block, digital = excluded.digital,
         icon_svg_uri = excluded.icon_svg_uri`,
    );
    this.#meta = db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
  }

  static create(path: string): IndexWriter {
    const db = openDb(path);
    db.exec(SCHEMA);
    const writer = new IndexWriter(db);
    writer.meta('schema_version', String(SCHEMA_VERSION));
    return writer;
  }

  meta(key: string, value: string): void {
    this.#meta.run(key, value);
  }

  /** The rules row and its names. */
  #addRules(card: ScryCard, oracleId: string): void {
    const faces = card.card_faces ?? [];
    const rulesFaces =
      faces.length === 0
        ? null
        : faces.map((f) => ({
            name: f.name ?? null,
            mana_cost: f.mana_cost ?? null,
            type_line: f.type_line ?? null,
            oracle_text: f.oracle_text ?? null,
            power: f.power ?? null,
            toughness: f.toughness ?? null,
            loyalty: f.loyalty ?? null,
            defense: f.defense ?? null,
            colors: f.colors ?? null,
          }));
    const { typeLine, oracleText } = searchText(card);
    this.#card.run(
      oracleId,
      card.name,
      normName(card.name),
      kindOf(card.layout, card.type_line),
      str(card.layout),
      str(card.mana_cost),
      num(card.cmc),
      typeLine === '' ? null : typeLine,
      oracleText === '' ? null : oracleText,
      json(card.colors),
      json(card.color_identity),
      str(card.power),
      str(card.toughness),
      str(card.loyalty),
      str(card.defense),
      json(card.keywords),
      json(compactLegalities(card.legalities)),
      bool(card.reserved),
      num(card.edhrec_rank),
      json(rulesFaces),
      card.id,
    );
    for (const { name, kind } of namesOf(card)) this.#name.run(normName(name), oracleId, kind);
  }

  /** One `oracle_cards` line: the rules row, its names, and its representative print. */
  addOracleCard(card: ScryCard): boolean {
    const oracleId = oracleIdOf(card);
    if (oracleId === null || typeof card.id !== 'string' || typeof card.name !== 'string') return false;
    this.#addRules(card, oracleId);
    this.addPrint(card, 'oracle');
    return true;
  }

  /**
   * One print. `oracle` never displaces a `set` row; `set` always replaces. A
   * synced print whose card the bulk file does not know yet (a set newer than
   * today's bulk) supplies the rules row itself, so it is still searchable.
   */
  addPrint(card: ScryCard, source: PrintSource): boolean {
    if (typeof card.id !== 'string' || typeof card.set !== 'string' || typeof card.collector_number !== 'string') {
      return false;
    }
    const oracleId = oracleIdOf(card);
    if (source === 'set' && oracleId !== null && this.#cardExists.get(oracleId) === undefined) {
      this.#addRules(card, oracleId);
      this.rulesFromPrints++;
    }
    const images = packImages(card.id, imageSides(card));
    const statement = source === 'set' ? this.#print : this.#printKeep;
    const result = statement.run(
      card.id,
      oracleId,
      card.name,
      normName(card.name),
      card.set.toLowerCase(),
      str(card.set_name),
      card.collector_number,
      cnSort(card.collector_number),
      str(card.lang),
      str(card.rarity),
      str(card.layout),
      str(card.released_at),
      flavourOf(card),
      artistOf(card),
      str(card.watermark),
      json(card.frame_effects),
      json(card.promo_types),
      str(card.border_color),
      bool(card.full_art),
      bool(card.promo),
      bool(card.variation),
      isMainPrint(card) ? 1 : 0,
      str(card.image_status),
      str(card.image_updated_at),
      bool(card.highres_image),
      images.frontSizes,
      images.backSizes,
      images.version,
      images.raw,
      source,
    );
    if (Number(result.changes) === 0) return false;
    this.#faceClear.run(card.id);
    (card.card_faces ?? []).forEach((f, idx) => {
      this.#face.run(card.id, idx, str(f.name), str(f.flavor_text), str(f.artist), str(f.illustration_id));
    });
    return true;
  }

  addSet(set: ScrySet): void {
    this.#set.run(
      set.code.toLowerCase(),
      set.name,
      str(set.set_type),
      str(set.released_at),
      num(set.card_count),
      set.parent_set_code === undefined ? null : set.parent_set_code.toLowerCase(),
      str(set.block),
      bool(set.digital),
      str(set.icon_svg_uri),
    );
  }

  markSynced(code: string, syncedAt: string, prints: number, iconSvg: string | null): void {
    this.db
      .prepare(
        `INSERT INTO sets (code, name, synced_at, synced_prints, icon_svg) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(code) DO UPDATE SET synced_at = excluded.synced_at, synced_prints = excluded.synced_prints,
           icon_svg = COALESCE(excluded.icon_svg, sets.icon_svg)`,
      )
      .run(code.toLowerCase(), code.toUpperCase(), syncedAt, prints, iconSvg);
  }

  /**
   * The FTS index, rebuilt from `cards` in one pass. Run once, after every row
   * is in: FTS5 is much faster bulk-loaded than maintained row by row.
   */
  finish(): { ftsRows: number } {
    // External content: the index reads `cards` itself (whose `type_line` and
    // `oracle_text` already carry every face's), so the text is stored once.
    // The name column is `norm_name`, so "shield" finds S.H.I.E.L.D. — the
    // tokenizer would otherwise index it as six one-letter words.
    this.db.exec(`
      INSERT INTO cards_fts (cards_fts) VALUES ('rebuild');
      INSERT INTO cards_fts (cards_fts) VALUES ('optimize');
      ANALYZE;
    `);
    const row = this.db.prepare('SELECT count(*) AS n FROM cards_fts_docsize').get();
    return { ftsRows: Number(row?.['n'] ?? 0) };
  }

  close(): void {
    this.db.close();
  }
}
