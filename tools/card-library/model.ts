/*
 * mtg-table — tools/card-library/model.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The Scryfall shapes the library reads, and the handful of pure rules that
 * turn one into a row. No I/O, no SQLite — `web/test/cards-lib.test.ts` tests
 * these as tables.
 *
 * The rules, each from report 03:
 *
 *   - **Multi-face images** (§2.3): PREFER the top-level `image_uris`; only when
 *     it is absent fall back to `card_faces[0]` / `card_faces[1]`. It is NOT
 *     "has `card_faces` → use face images": a split card (`Fire // Ice`) and an
 *     adventure (`Bonecrusher Giant // Stomp`) have two faces printed on ONE
 *     physical side and carry one top-level image; only a transform / modal DFC
 *     has a real back. {@link imageSides} is the one place this is decided.
 *   - **Collector numbers are strings** (§4.2): `287`, `4b`, `2w`, `F12`, `★`.
 *     {@link cnSort} gives an integer to order by and the string breaks ties.
 *   - **Name alone is not a key** (§3.2): Agent Phil Coulson is msh #4 and #402
 *     (extended art); MSH has six Plains. {@link isMainPrint} says which prints
 *     are the plain `[cards]` printing, so "the" print of a name is the lowest
 *     collector number among the main ones — deterministic, and msh #4 over #402.
 *   - **Names match loosely** (§1.3): case-insensitive and punctuation-optional,
 *     so `shield helicarrier` finds `S.H.I.E.L.D. Helicarrier`. {@link normName}.
 */

// ---------------------------------------------------------------------------
// Scryfall objects (only the fields we read; everything else is ignored)
// ---------------------------------------------------------------------------

export type ImageUris = Partial<Record<ImageSize, string>>;

export interface ScryFace {
  object?: string;
  name?: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  flavor_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  defense?: string;
  colors?: string[];
  color_indicator?: string[];
  artist?: string;
  illustration_id?: string;
  image_uris?: ImageUris;
  oracle_id?: string;
  layout?: string;
  cmc?: number;
}

export interface ScryCard {
  object?: string;
  id: string;
  oracle_id?: string;
  name: string;
  lang?: string;
  layout?: string;
  set: string;
  set_name?: string;
  set_type?: string;
  collector_number: string;
  rarity?: string;
  released_at?: string;
  mana_cost?: string;
  cmc?: number;
  type_line?: string;
  oracle_text?: string;
  flavor_text?: string;
  colors?: string[];
  color_identity?: string[];
  power?: string;
  toughness?: string;
  loyalty?: string;
  defense?: string;
  keywords?: string[];
  legalities?: Record<string, string>;
  reserved?: boolean;
  edhrec_rank?: number;
  game_changer?: boolean;
  image_uris?: ImageUris;
  image_status?: string;
  image_updated_at?: string;
  highres_image?: boolean;
  artist?: string;
  frame_effects?: string[];
  promo_types?: string[];
  border_color?: string;
  full_art?: boolean;
  promo?: boolean;
  variation?: boolean;
  watermark?: string;
  digital?: boolean;
  card_faces?: ScryFace[];
}

export interface ScrySet {
  object?: string;
  code: string;
  name: string;
  set_type?: string;
  released_at?: string;
  card_count?: number;
  parent_set_code?: string;
  block?: string;
  block_code?: string;
  digital?: boolean;
  icon_svg_uri?: string;
}

/**
 * **Every Scryfall field the library reads**, one list per object — exactly the
 * keys of {@link ScryCard}, {@link ScryFace} and {@link ScrySet} above, which
 * the type-level checks below hold to (a key added to an interface and not
 * here, or here and not there, does not compile). `make-fixture.ts` keeps only
 * these when it cuts `fixtures/cards/`, so the committed slice carries what the
 * tests exercise and nothing else of Scryfall's data (NOTICE §2, D90).
 */
export const SCRY_CARD_FIELDS = [
  'object', 'id', 'oracle_id', 'name', 'lang', 'layout', 'set', 'set_name', 'set_type', 'collector_number',
  'rarity', 'released_at', 'mana_cost', 'cmc', 'type_line', 'oracle_text', 'flavor_text', 'colors',
  'color_identity', 'power', 'toughness', 'loyalty', 'defense', 'keywords', 'legalities', 'reserved',
  'edhrec_rank', 'game_changer', 'image_uris', 'image_status', 'image_updated_at', 'highres_image', 'artist',
  'frame_effects', 'promo_types', 'border_color', 'full_art', 'promo', 'variation', 'watermark', 'digital',
  'card_faces',
] as const satisfies readonly (keyof ScryCard)[];

export const SCRY_FACE_FIELDS = [
  'object', 'name', 'mana_cost', 'type_line', 'oracle_text', 'flavor_text', 'power', 'toughness', 'loyalty',
  'defense', 'colors', 'color_indicator', 'artist', 'illustration_id', 'image_uris', 'oracle_id', 'layout', 'cmc',
] as const satisfies readonly (keyof ScryFace)[];

export const SCRY_SET_FIELDS = [
  'object', 'code', 'name', 'set_type', 'released_at', 'card_count', 'parent_set_code', 'block', 'block_code',
  'digital', 'icon_svg_uri',
] as const satisfies readonly (keyof ScrySet)[];

// Exhaustive both ways: `satisfies` above rejects a key the interface lacks, and
// these reject an interface key the list lacks.
type Unlisted<T, L extends readonly unknown[]> = Exclude<keyof T, L[number]>;
const cardFieldsComplete: [Unlisted<ScryCard, typeof SCRY_CARD_FIELDS>] extends [never] ? true : never = true;
const faceFieldsComplete: [Unlisted<ScryFace, typeof SCRY_FACE_FIELDS>] extends [never] ? true : never = true;
const setFieldsComplete: [Unlisted<ScrySet, typeof SCRY_SET_FIELDS>] extends [never] ? true : never = true;
void [cardFieldsComplete, faceFieldsComplete, setFieldsComplete];

function pick(raw: Record<string, unknown>, keep: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  // The source's own key order, so a reduced line still reads like the real one.
  for (const [key, value] of Object.entries(raw)) if (keep.includes(key)) out[key] = value;
  return out;
}

/** A card object with only {@link SCRY_CARD_FIELDS} (and each face with only {@link SCRY_FACE_FIELDS}). */
export function readFieldsOfCard(raw: Record<string, unknown>): Record<string, unknown> {
  const out = pick(raw, SCRY_CARD_FIELDS);
  if (Array.isArray(out['card_faces'])) {
    out['card_faces'] = out['card_faces'].map((face: unknown) =>
      typeof face === 'object' && face !== null ? pick(face as Record<string, unknown>, SCRY_FACE_FIELDS) : face,
    );
  }
  return out;
}

/** A set object with only {@link SCRY_SET_FIELDS}. */
export function readFieldsOfSet(raw: Record<string, unknown>): Record<string, unknown> {
  return pick(raw, SCRY_SET_FIELDS);
}

export interface BulkItem {
  object?: string;
  type: string;
  updated_at: string;
  jsonl_download_uri: string;
  compressed_size: number;
}

// ---------------------------------------------------------------------------
// Image sizes
// ---------------------------------------------------------------------------

/**
 * Scryfall's eleven `image_uris` keys and the file type each one is (report 03
 * §2.1). The five WEBP keys are the newer replacements for the JPG ones.
 */
export const IMAGE_EXT = {
  small: 'jpg',
  normal: 'jpg',
  large: 'jpg',
  png: 'png',
  art_crop: 'jpg',
  border_crop: 'jpg',
  thumb: 'webp',
  grid: 'webp',
  display: 'webp',
  crop: 'webp',
  art: 'webp',
} as const;

export type ImageSize = keyof typeof IMAGE_EXT;
export type Face = 'front' | 'back';

export const IMAGE_SIZES: readonly ImageSize[] = Object.keys(IMAGE_EXT) as ImageSize[];

export function isImageSize(value: string): value is ImageSize {
  return Object.prototype.hasOwnProperty.call(IMAGE_EXT, value);
}

export const MIME: Readonly<Record<'jpg' | 'png' | 'webp', string>> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** `art_crop` and `art` cut the frame — and with it the printed artist line (§1.8). */
export const CROPPED_ART_SIZES: ReadonlySet<ImageSize> = new Set<ImageSize>(['art_crop', 'art']);

export interface ImageSides {
  front: ImageUris | null;
  /** Only a card with two PHYSICAL faces has one: transform, modal DFC, reversible, battle-with-back. */
  back: ImageUris | null;
}

/** THE multi-face rule (report 03 §2.3). Top-level first; faces only when it is absent. */
export function imageSides(card: Pick<ScryCard, 'image_uris' | 'card_faces'>): ImageSides {
  if (card.image_uris !== undefined && card.image_uris !== null) return { front: card.image_uris, back: null };
  const faces = card.card_faces ?? [];
  return {
    front: faces[0]?.image_uris ?? null,
    back: faces[1]?.image_uris ?? null,
  };
}

/** `https://cards.scryfall.io/normal/front/1/3/<id>.jpg?1783902979` → without the cache-buster. */
export function stripQuery(url: string): string {
  const q = url.indexOf('?');
  return q < 0 ? url : url.slice(0, q);
}

/**
 * The CDN URL Scryfall's own `image_uris` use, built from an id (report 03 §2.2,
 * Forge's `CdnUuidCache.cdnUrl`). Only a fallback: the stored `image_uris` are
 * authoritative, and a back face lives under the CARD's id with `side=back`.
 */
export function cdnUrl(id: string, size: ImageSize, face: Face = 'front'): string {
  return `https://cards.scryfall.io/${size}/${face}/${id.charAt(0)}/${id.charAt(1)}/${id}.${IMAGE_EXT[size]}`;
}

/**
 * How a print's images are stored. Measured on the 2026-09-27 build: every one
 * of 461,956 `image_uris` entries (41,996 sides, all eleven sizes each) was
 * exactly {@link cdnUrl}`(id, size, side)` plus a `?<version>` cache-buster, and
 * the version was the same for every size of a print — it is the print's
 * `image_updated_at` as a Unix timestamp (report 03 §5 left that open). Storing
 * the eleven URLs verbatim was 48 MB of a 150 MB index, so a print keeps the
 * list of sizes per side and the version; a print whose URIs do NOT follow the
 * pattern keeps them verbatim in `raw` instead, so the compaction can never
 * change a URL. {@link imageUrlOf} is the inverse.
 */
export interface PackedImages {
  frontSizes: string | null;
  backSizes: string | null;
  version: string | null;
  raw: string | null;
}

export function packImages(id: string, sides: ImageSides): PackedImages {
  let version: string | null = null;
  let exact = true;
  const pack = (uris: ImageUris | null, face: Face): string | null => {
    if (uris === null) return null;
    const sizes: string[] = [];
    for (const [size, url] of Object.entries(uris)) {
      if (!isImageSize(size) || typeof url !== 'string') {
        exact = false;
        continue;
      }
      sizes.push(size);
      const q = url.indexOf('?');
      const v = q < 0 ? '' : url.slice(q + 1);
      if (version === null) version = v;
      else if (version !== v) exact = false;
      if (stripQuery(url) !== cdnUrl(id, size, face)) exact = false;
    }
    return sizes.join(',');
  };
  const frontSizes = pack(sides.front, 'front');
  const backSizes = pack(sides.back, 'back');
  return {
    frontSizes,
    backSizes,
    version: version === '' ? null : version,
    raw: exact ? null : JSON.stringify(sides),
  };
}

/** The remote URL of one image of a stored print, or `null` if Scryfall lists none. */
export function imageUrlOf(print: { id: string } & PackedImages, size: ImageSize, face: Face = 'front'): string | null {
  if (print.raw !== null) {
    const sides = JSON.parse(print.raw) as ImageSides;
    const url = sides[face]?.[size];
    return typeof url === 'string' ? url : null;
  }
  const sizes = face === 'front' ? print.frontSizes : print.backSizes;
  if (sizes === null || !sizes.split(',').includes(size)) return null;
  return print.version === null ? cdnUrl(print.id, size, face) : `${cdnUrl(print.id, size, face)}?${print.version}`;
}

/**
 * Legalities without the `not_legal` entries — 19 MB of the first index was the
 * word `not_legal`. An absent format reads as not legal.
 */
export function compactLegalities(legalities: Record<string, string> | undefined): Record<string, string> | null {
  if (legalities === undefined) return null;
  const out: Record<string, string> = {};
  for (const [format, status] of Object.entries(legalities)) if (status !== 'not_legal') out[format] = status;
  return out;
}

// ---------------------------------------------------------------------------
// Names, numbers, prints
// ---------------------------------------------------------------------------

/**
 * Case-, accent- and punctuation-insensitive name key. Periods and apostrophes
 * vanish (`S.H.I.E.L.D.` → `shield`, `Ant-Man's` → `ant mans`), other
 * punctuation is a space, and the ` // ` face separator survives as itself.
 */
export function normName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s*\/\/\s*/g, ' // ')
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Leading integer of a collector number, for ordering; non-numeric numbers sort last. */
export function cnSort(collectorNumber: string): number {
  const m = /^\D*(\d+)/.exec(collectorNumber);
  return m === null ? 1_000_000_000 : Number.parseInt(m[1]!, 10);
}

/** Frame effects that mark an alternate-art treatment of a card, not its plain printing. */
const VARIANT_FRAME_EFFECTS: ReadonlySet<string> = new Set([
  'extendedart',
  'showcase',
  'etched',
  'inverted',
  'shatteredglass',
  'fullart',
  'textless',
]);

/**
 * Promo types that mark a treatment (a foil process, a booster-fun frame, a
 * serialised or textured card) rather than the plain printing. `universesbeyond`
 * is NOT one — every MSH/MSC card carries it.
 */
const TREATMENT_PROMO = /foil$|^(boosterfun|serialized|textured|embossed|gilded|neonink|invisibleink|thick|doublerainbow|oilslick|stepandcompleat|headliner|stamped)$/;

/**
 * Is this the plain printing — a `[cards]` line of Forge's edition file —
 * rather than a promo, a variation, a borderless, extended-art or foil-process
 * treatment? Checked against `res/editions/Marvel Super Heroes.txt`: msh #4 is
 * (`[cards]`), msh #402 (`frame_effects: ["legendary","extendedart"]`) is not
 * (`[extended art]`); of MSH's six Plains, #277, #278, #287 and #288 are
 * (`[cards]`, the first two full-art) and the surge-foil #433 and #434 are not.
 * So the lowest-numbered main print of a name is Forge's art index 1.
 */
export function isMainPrint(
  card: Pick<ScryCard, 'promo' | 'variation' | 'full_art' | 'border_color' | 'frame_effects' | 'type_line' | 'promo_types'>,
): boolean {
  if (card.promo === true || card.variation === true) return false;
  if (card.border_color === 'borderless') return false;
  for (const effect of card.frame_effects ?? []) if (VARIANT_FRAME_EFFECTS.has(effect)) return false;
  for (const promo of card.promo_types ?? []) if (TREATMENT_PROMO.test(promo)) return false;
  // A full-art basic is still the plain printing of a basic; a full-art anything else is a treatment.
  if (card.full_art === true && !/\bBasic\b/.test(card.type_line ?? '')) return false;
  return true;
}

/** Layouts that are not a card you put in a deck. `search` leaves them out unless asked. */
const EXTRA_LAYOUTS: ReadonlySet<string> = new Set([
  'token',
  'double_faced_token',
  'emblem',
  'art_series',
  'vanguard',
  'scheme',
  'planar',
  'augment',
  'host',
]);

export type CardKind = 'card' | 'extra';

export function kindOf(layout: string | undefined, typeLine: string | undefined): CardKind {
  if (layout !== undefined && EXTRA_LAYOUTS.has(layout)) return 'extra';
  if (typeLine !== undefined && /^(Token|Emblem|Card)\b/.test(typeLine)) return 'extra';
  return 'card';
}

/** The oracle id of a card, including a reversible card whose top level has none. */
export function oracleIdOf(card: ScryCard): string | null {
  if (typeof card.oracle_id === 'string' && card.oracle_id !== '') return card.oracle_id;
  const face = card.card_faces?.[0]?.oracle_id;
  return typeof face === 'string' && face !== '' ? face : null;
}

/** Every name a card answers to: its full name, and each face's for a multi-face card. */
export function namesOf(card: Pick<ScryCard, 'name' | 'card_faces'>): { name: string; kind: 'full' | 'face' }[] {
  const out: { name: string; kind: 'full' | 'face' }[] = [{ name: card.name, kind: 'full' }];
  for (const face of card.card_faces ?? []) {
    if (typeof face.name === 'string' && face.name !== '' && face.name !== card.name) {
      out.push({ name: face.name, kind: 'face' });
    }
  }
  return out;
}

/** The text FTS indexes: a multi-face card's faces joined, since its top level may carry none. */
export function searchText(card: ScryCard): { typeLine: string; oracleText: string } {
  const faces = card.card_faces ?? [];
  if (faces.length === 0) return { typeLine: card.type_line ?? '', oracleText: card.oracle_text ?? '' };
  return {
    typeLine: card.type_line ?? faces.map((f) => f.type_line ?? '').join(' // '),
    oracleText:
      typeof card.oracle_text === 'string' && card.oracle_text !== ''
        ? card.oracle_text
        : faces.map((f) => f.oracle_text ?? '').join('\n//\n'),
  };
}

/**
 * User text → an FTS5 query. Each whitespace-separated word becomes a quoted
 * PREFIX term, and a word that punctuation splits into several tokens becomes
 * a prefix PHRASE, so `ant-man` is `"ant man"*` (the two tokens adjacent, as
 * in the name) rather than "any card with `ant…` and `man…` somewhere". Terms
 * are AND-ed (or OR-ed for the fuzzy fallback). Quoting every token is also
 * what makes arbitrary input safe: FTS5 syntax typed into a search box (`NEAR`,
 * `-`, `:`, `*`, parentheses) would otherwise be a syntax error or a different
 * query. Returns `null` when there are no words.
 */
export function ftsQuery(text: string, op: 'AND' | 'OR' = 'AND', column: string | null = null): string | null {
  const terms: string[] = [];
  for (const word of text.split(/\s+/)) {
    const tokens = word
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/['’.]/g, '')
      .split(/[^a-z0-9]+/)
      .filter((t) => t !== '');
    if (tokens.length > 0) terms.push(`"${tokens.join(' ')}"*`);
  }
  if (terms.length === 0) return null;
  const body = terms.join(` ${op} `);
  return column === null ? body : `${column} : (${body})`;
}
