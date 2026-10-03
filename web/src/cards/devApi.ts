/*
 * mtg-table — cards/devApi.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The card browser's data route — Node only, dev server only.**
 * `web/vite.config.ts` mounts {@link createCardsMiddleware} in `configureServer`
 * (never in the production build, never in `vite preview`), so the page and its
 * data share one loopback origin:
 *
 *     GET /cards/api/status                 is there an index? how big? built when?
 *     GET /cards/api/search?q=&set=&color=&type=&deck=&limit=
 *     GET /cards/api/card/<scryfallId>      one print, plus the card's other prints
 *     GET /cards/api/decks                  every decks/*.dck, parsed
 *     GET /cards/img/<scryfallId>/<size>[?face=back]   a cached image from var/cards
 *
 * **Nothing here talks to Scryfall.** The index is the card library's
 * (`tools/card-library/query.ts`, built by `tools/card-library/build.ts` into
 * `var/cards/cards.sqlite`); a search is local FTS5, and an image is served only
 * if the library already cached it — a miss is a 404 and the page falls back to
 * Scryfall's CDN URL itself, so this server never proxies an image (report 03
 * §1.8, §4.5).
 *
 * `query.ts` is loaded with a runtime `import()` rather than bundled into the
 * Vite config: the dev server must come up — and the page must say "build the
 * index" — on a checkout where the library has never been built, or where it is
 * half-written. A missing index is a STATE (`ready: false`), never an exception.
 *
 * **Every filter goes into the SQL, not after it.** A search with words asks
 * the index for the chosen sets (`p.set_code IN (…)`), the chosen deck (its
 * cards resolved first and passed as an oracle-id allow-list), the colours
 * (any-of over the card's own `colors`) and the type (a substring superset),
 * and only then reads up to {@link SCAN_CAP} hits. Filtering in JS after the
 * cap is what made `creature` + MSH + MSC answer 1 card where MSH alone had
 * 374: the first 1,000 bm25 hits over all 38,690 cards held almost none of
 * them. `search.ts`'s pure functions still run over what comes back — type as
 * a whole word, one row per card, the order — and are the same ones
 * `web/test/cards-ui.test.ts` pins.
 *
 * This file must never be imported by browser code (`cards-ui.test.ts` checks).
 */

import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type {
  CardLibrary,
  CardRecord,
  PrintRecord,
  RulesFace,
} from '../../../tools/card-library/query.ts';
import { buildDeckIndex, parseDck } from './decks.ts';
import type { DeckFile, LibraryCard, LibraryFace, LibraryStatus, SearchResponse } from './model.ts';
import { applyFilters, dedupeByOracle, filtersFromQuery, rankCards, tokenize, type CardFilters } from './search.ts';

type QueryModule = typeof import('../../../tools/card-library/query.ts');

export const BUILD_COMMAND = 'node tools/card-library/build.ts';
/**
 * The most FTS hits one search reads before it says "N+" instead of a total.
 * The cap applies AFTER every filter the index answers (sets, deck, colour,
 * type), so it only ever trims a genuinely broad search. A test injects a
 * small one ({@link BackendOptions.scanCap}); the fixture index is far smaller
 * than this.
 */
export const SCAN_CAP = 1000;
const PAGE = 200;
const DEFAULT_LIMIT = 120;
const MAX_LIMIT = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** Scryfall's eleven `image_uris` keys (report 03 §2.1). */
const IMAGE_SIZES = ['small', 'normal', 'large', 'png', 'art_crop', 'border_crop', 'thumb', 'grid', 'display', 'crop', 'art'] as const;
type Size = (typeof IMAGE_SIZES)[number];

function isSize(value: string): value is Size {
  return (IMAGE_SIZES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Opening the library — lazily, and again after a rebuild
// ---------------------------------------------------------------------------

interface Opened {
  lib: CardLibrary;
  /** The index file's identity when it was opened; a rebuild `rename()`s a new one over it. */
  ino: number;
  mtimeMs: number;
}

export interface BackendOptions {
  /** The index; `var/cards/cards.sqlite` under the root by default. */
  dbPath?: string;
  /** The image cache; the library's own default (`var/cards/images`) when absent. */
  imagesDir?: string;
  /** The most text hits one search reads; {@link SCAN_CAP} when absent. */
  scanCap?: number;
}

export class CardsBackend {
  readonly root: string;
  readonly dbPath: string;
  readonly imagesDir: string | undefined;
  readonly scanCap: number;
  #opened: Opened | null = null;
  #module: QueryModule | null = null;
  #lastError: string | null = null;

  constructor(root: string, options: BackendOptions = {}) {
    this.root = root;
    this.dbPath = options.dbPath ?? resolve(root, 'var', 'cards', 'cards.sqlite');
    this.imagesDir = options.imagesDir;
    this.scanCap = Math.max(1, Math.floor(options.scanCap ?? SCAN_CAP));
  }

  /** Repo-relative, for messages. */
  get dbRelative(): string {
    return relative(this.root, this.dbPath) || this.dbPath;
  }

  async #load(): Promise<QueryModule> {
    if (this.#module !== null) return this.#module;
    const file = resolve(this.root, 'tools', 'card-library', 'query.ts');
    if (!existsSync(file)) throw new Error(`tools/card-library/query.ts is missing`);
    this.#module = (await import(pathToFileURL(file).href)) as QueryModule;
    return this.#module;
  }

  /** The open library, or null with {@link lastError} saying why. Reopens after a rebuild. */
  async library(): Promise<CardLibrary | null> {
    if (!existsSync(this.dbPath)) {
      this.close();
      this.#lastError = `There is no card index at ${this.dbRelative}.`;
      return null;
    }
    const stat = statSync(this.dbPath);
    if (this.#opened !== null && (this.#opened.ino !== stat.ino || this.#opened.mtimeMs !== stat.mtimeMs)) {
      this.close();
    }
    if (this.#opened !== null) return this.#opened.lib;
    try {
      const mod = await this.#load();
      const lib = mod.openLibrary(this.dbPath, {
        root: this.root,
        ...(this.imagesDir === undefined ? {} : { imagesDir: this.imagesDir }),
      });
      this.#opened = { lib, ino: stat.ino, mtimeMs: stat.mtimeMs };
      this.#lastError = null;
      return lib;
    } catch (error) {
      this.#lastError = `The card index at ${this.dbRelative} could not be opened: ${(error as Error).message}`;
      return null;
    }
  }

  get lastError(): string | null {
    return this.#lastError;
  }

  close(): void {
    try {
      this.#opened?.lib.close();
    } catch {
      // already closed
    }
    this.#opened = null;
  }

  // -- decks ----------------------------------------------------------------

  /** Every `decks/*.dck`, the one `config.json` names first. */
  decks(): DeckFile[] {
    const dir = resolve(this.root, 'decks');
    if (!existsSync(dir)) return [];
    let primary = '';
    try {
      const config = JSON.parse(readFileSync(resolve(this.root, 'config.json'), 'utf8')) as Record<string, unknown>;
      if (typeof config['deck'] === 'string') primary = config['deck'];
    } catch {
      primary = '';
    }
    return readdirSync(dir)
      .filter((name) => name.toLowerCase().endsWith('.dck'))
      .sort()
      .map((name) => `decks/${name}`)
      .sort((a, b) => Number(b === primary) - Number(a === primary))
      .map((file) => parseDck(file, readFileSync(resolve(this.root, file), 'utf8')));
  }

  // -- status ---------------------------------------------------------------

  async status(): Promise<LibraryStatus> {
    const lib = await this.library();
    const base = { buildCommand: BUILD_COMMAND, dbPath: this.dbRelative };
    if (lib === null) {
      return {
        ...base,
        ready: false,
        message: this.#lastError ?? `There is no card index at ${this.dbRelative}.`,
        counts: null,
        builtAt: null,
        sets: [],
      };
    }
    const stats = lib.stats();
    const counts: Record<string, number> = {};
    for (const key of ['cards', 'playableCards', 'prints', 'syncedPrints', 'sets']) {
      const value = stats[key];
      if (typeof value === 'number') counts[key] = value;
    }
    counts['cachedImages'] = countCachedImages(lib.imagesDir);
    const meta = lib.meta();
    const builtAt = meta['built_at'] ?? meta['builtAt'] ?? meta['build_date'] ?? null;
    return {
      ...base,
      ready: true,
      message: `${String(counts['cards'] ?? 0)} cards, ${String(counts['prints'] ?? 0)} prints.`,
      counts,
      builtAt,
      sets: lib.syncedSets().map((set) => set.code),
    };
  }

  // -- the wire shape -------------------------------------------------------

  /** A rules row plus one print → the browser's {@link LibraryCard}. */
  toWire(lib: CardLibrary, card: CardRecord, print: PrintRecord | null): LibraryCard {
    const rulesFaces: RulesFace[] = card.faces ?? [];
    const faces: LibraryFace[] = rulesFaces.map((face, i) => ({
      name: face.name ?? '',
      manaCost: face.mana_cost,
      typeLine: face.type_line ?? '',
      oracleText: face.oracle_text ?? '',
      flavorText: print?.faces[i]?.flavorText ?? null,
      power: face.power,
      toughness: face.toughness,
      loyalty: face.loyalty,
      defense: face.defense,
      artist: print?.faces[i]?.artist ?? null,
    }));
    const faceColors = rulesFaces.flatMap((f) => f.colors ?? []);
    const colors = card.colors ?? [...new Set(faceColors)];
    const id = print?.id ?? card.oracleId;
    const hasBack = print !== null && print.imageSizes.back !== null && print.imageSizes.back.length > 0;
    const remote = (face: 'front' | 'back'): string | null => {
      if (print === null) return null;
      try {
        return lib.imageUrl(print.id, 'normal', face);
      } catch {
        return null;
      }
    };
    const local = (face: 'front' | 'back'): string | null => {
      if (print === null || !UUID.test(print.id)) return null;
      try {
        return lib.imagePath(print.id, 'normal', face) === null
          ? null
          : `/cards/img/${print.id}/normal${face === 'back' ? '?face=back' : ''}`;
      } catch {
        return null;
      }
    };
    return {
      id,
      oracleId: card.oracleId,
      name: card.name,
      set: print?.set ?? '',
      setName: print?.setName ?? null,
      collectorNumber: print?.collectorNumber ?? '',
      rarity: print?.rarity ?? null,
      manaCost: card.manaCost ?? (faces.length === 0 ? null : (faces[0]?.manaCost ?? null)),
      cmc: card.cmc,
      typeLine: card.typeLine ?? faces.map((f) => f.typeLine).join(' // '),
      oracleText: card.oracleText ?? '',
      flavorText: print?.flavorText ?? null,
      colors,
      colorIdentity: card.colorIdentity,
      power: card.power,
      toughness: card.toughness,
      loyalty: card.loyalty,
      defense: card.defense,
      keywords: card.keywords,
      layout: card.layout ?? print?.layout ?? 'normal',
      artist: print?.artist ?? null,
      releasedAt: print?.releasedAt ?? null,
      legalities: card.legalities,
      faces,
      imageStatus: print?.imageStatus ?? null,
      imageRemote: remote('front'),
      imageRemoteBack: hasBack ? remote('back') : null,
      imageLocal: local('front'),
      imageLocalBack: hasBack ? local('back') : null,
      scryfallUri:
        print === null || print.set === ''
          ? null
          : `https://scryfall.com/card/${encodeURIComponent(print.set)}/${encodeURIComponent(print.collectorNumber)}`,
    };
  }

  // -- search ---------------------------------------------------------------

  /**
   * The search box and the four filters, over the index.
   *
   *   - words → the library's FTS5 search with every filter in its SQL — the
   *     sets, the deck (resolved first, as an oracle-id allow-list), the
   *     colours, the type as a superset — paged up to {@link scanCap} hits,
   *     and the type then narrowed to a whole word here;
   *   - no words but a deck → that deck's lines, resolved by name (and set hint);
   *   - no words but a set → every print in it, in collector-number order;
   *   - nothing else → no search (colour or type alone would read every card).
   *
   * With a set chosen every card is expanded to its prints in the chosen sets
   * (Agent Phil Coulson is MSH #4 and #402); without one, one row per card.
   */
  async search(filters: CardFilters, limit: number): Promise<SearchResponse & { tookMs: number }> {
    const started = performance.now();
    const lib = await this.library();
    if (lib === null) throw new Error(this.#lastError ?? 'no card index');
    const decks = this.decks();
    const deckIndex = buildDeckIndex(decks);
    const text = filters.q.trim();
    const sets = filters.sets;
    const wanted = Math.min(Math.max(limit, 1), MAX_LIMIT);

    let records: CardRecord[] = [];
    let approximate = false;
    if (tokenize(text).length > 0) {
      // A deck is a short list: resolve it first and let the index filter by it.
      const allow = filters.deck === null ? undefined : this.#deckRecords(lib, decks, filters.deck).map((r) => r.oracleId);
      const asked = {
        ...(sets.length === 0 ? {} : { sets }),
        ...(allow === undefined ? {} : { oracleIds: allow }),
        ...(filters.type === null ? {} : { type: filters.type }),
        ...(filters.colors.length === 0 ? {} : { colorsAny: filters.colors }),
      };
      // One hit past the cap is read, so "exactly the cap" and "more" differ.
      const cap = this.scanCap;
      for (let offset = 0; offset <= cap; offset += PAGE) {
        const take = Math.min(PAGE, cap + 1 - offset);
        const page = lib.search(text, { ...asked, limit: take, offset });
        records.push(...page);
        if (page.length < take) break;
      }
      if (records.length > cap) {
        approximate = true;
        records = records.slice(0, cap);
      }
    } else if (filters.deck !== null) {
      records = this.#deckRecords(lib, decks, filters.deck);
    } else if (sets.length > 0) {
      for (const set of sets) records.push(...lib.browseSet(set, { limit: 1000 }).filter((r) => r.kind === 'card'));
    } else {
      return { cards: [], total: 0, truncated: false, needsQuery: true, tookMs: Math.round(performance.now() - started) };
    }

    let cards: LibraryCard[];
    if (sets.length > 0 && tokenize(text).length > 0) {
      // Every print of each hit in the chosen sets.
      cards = [];
      const seen = new Set<string>();
      for (const record of records) {
        if (seen.has(record.oracleId)) continue;
        seen.add(record.oracleId);
        for (const print of lib.printsOf(record.oracleId)) {
          if (sets.includes(print.set)) cards.push(this.toWire(lib, record, print));
        }
      }
    } else if (sets.length > 0 && filters.deck !== null) {
      cards = [];
      for (const record of records) {
        for (const print of lib.printsOf(record.oracleId)) {
          if (sets.includes(print.set)) cards.push(this.toWire(lib, record, print));
        }
      }
    } else {
      cards = records.map((record) => this.toWire(lib, record, record.print));
    }

    const filtered = applyFilters(cards, filters, deckIndex);
    const unique = sets.length === 0 ? dedupeByOracle(filtered) : filtered;
    const ranked = rankCards(unique, text);
    return {
      cards: ranked.slice(0, wanted),
      total: ranked.length,
      truncated: ranked.length > wanted || approximate,
      approximate,
      tookMs: Math.round(performance.now() - started),
    };
  }

  #deckRecords(lib: CardLibrary, decks: readonly DeckFile[], deck: string): CardRecord[] {
    const out: CardRecord[] = [];
    const seen = new Set<string>();
    for (const file of decks) {
      if (deck !== 'any' && file.file !== deck) continue;
      for (const line of file.lines) {
        const record = lib.getByName(line.name, {
          fuzzy: false,
          ...(line.set === null ? {} : { set: line.set.toLowerCase() }),
        });
        if (record === null || seen.has(record.oracleId)) continue;
        seen.add(record.oracleId);
        out.push(record);
      }
    }
    return out;
  }

  // -- one card -------------------------------------------------------------

  async card(id: string): Promise<{ card: LibraryCard; prints: LibraryCard[] } | null> {
    const lib = await this.library();
    if (lib === null) throw new Error(this.#lastError ?? 'no card index');
    const record = lib.getById(id);
    if (record === null) return null;
    const prints = lib.printsOf(record.oracleId).map((print) => this.toWire(lib, record, print));
    return { card: this.toWire(lib, record, record.print), prints };
  }

  /** `{path, mime}` of a cached image, or null. Never fetches. */
  async image(id: string, size: string, face: 'front' | 'back'): Promise<{ path: string; mime: string } | null> {
    if (!UUID.test(id) || !isSize(size)) return null;
    const lib = await this.library();
    if (lib === null) return null;
    const path = lib.imagePath(id, size, face);
    if (path === null) return null;
    const mime = lib.imageTarget(id, size, face)?.mime ?? mimeOf(path);
    return { path, mime };
  }
}

function mimeOf(path: string): string {
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function countCachedImages(imagesDir: string): number {
  if (!existsSync(imagesDir)) return 0;
  let n = 0;
  for (const entry of readdirSync(imagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    try {
      n += readdirSync(resolve(imagesDir, entry.name)).filter((f) => !f.includes('.part')).length;
    } catch {
      // a directory vanished mid-count
    }
  }
  return n;
}

// ---------------------------------------------------------------------------
// The HTTP half
// ---------------------------------------------------------------------------

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

type Next = (error?: unknown) => void;

/**
 * The Connect middleware `vite.config.ts` mounts. Anything outside `/cards/api/`
 * and `/cards/img/` goes to `next()` untouched.
 */
export function createCardsMiddleware(
  root: string,
  options: BackendOptions = {},
): {
  handle: (req: IncomingMessage, res: ServerResponse, next: Next) => void;
  backend: CardsBackend;
} {
  const backend = new CardsBackend(root, options);
  const handle = (req: IncomingMessage, res: ServerResponse, next: Next): void => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const path = url.pathname;
    if (!path.startsWith('/cards/api/') && !path.startsWith('/cards/img/')) {
      next();
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendJson(res, 405, { error: 'GET only' });
      return;
    }
    void route(backend, path, url.searchParams, res).catch((error: unknown) => {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    });
  };
  return { handle, backend };
}

async function route(backend: CardsBackend, path: string, params: URLSearchParams, res: ServerResponse): Promise<void> {
  if (path === '/cards/api/status') {
    sendJson(res, 200, await backend.status());
    return;
  }
  if (path === '/cards/api/decks') {
    sendJson(res, 200, { decks: backend.decks() });
    return;
  }
  if (path === '/cards/api/search') {
    const status = await backend.library();
    if (status === null) {
      sendJson(res, 503, { error: backend.lastError ?? 'no card index', buildCommand: BUILD_COMMAND });
      return;
    }
    const limit = Number.parseInt(params.get('limit') ?? '', 10);
    const filters = filtersFromQuery(params.toString());
    sendJson(res, 200, await backend.search(filters, Number.isFinite(limit) ? limit : DEFAULT_LIMIT));
    return;
  }
  const cardMatch = /^\/cards\/api\/card\/([^/]+)$/.exec(path);
  if (cardMatch !== null) {
    const id = decodeURIComponent(cardMatch[1] ?? '');
    if (!UUID.test(id)) {
      sendJson(res, 400, { error: `not a Scryfall id: ${id}` });
      return;
    }
    const found = await backend.card(id);
    if (found === null) sendJson(res, 404, { error: `no print ${id} in the index` });
    else sendJson(res, 200, found);
    return;
  }
  const imgMatch = /^\/cards\/img\/([^/]+)\/([^/]+)$/.exec(path);
  if (imgMatch !== null) {
    const face = params.get('face') === 'back' ? 'back' : 'front';
    const found = await backend.image(decodeURIComponent(imgMatch[1] ?? ''), imgMatch[2] ?? '', face);
    if (found === null) {
      // A miss is not an error the page shows: `<img onError>` falls back to
      // Scryfall's CDN URL, which the search result already carries.
      sendJson(res, 404, { error: 'not in the image cache' });
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', found.mime);
    res.setHeader('Content-Length', String(statSync(found.path).size));
    // Keyed by print id + size: the file never changes under a name.
    res.setHeader('Cache-Control', 'public, max-age=86400');
    createReadStream(found.path).pipe(res);
    return;
  }
  sendJson(res, 404, { error: `no such route: ${path}` });
}
