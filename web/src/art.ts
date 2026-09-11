/*
 * mtg-table — art.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The read side of `tools/fetch-art.ts`. This is the entire v1 "card library"
 * (synthesis §7): a name → image-URL map generated once from the deck file.
 *
 * Two things it must never do:
 *   1. Block. A missing image renders a generated text card frame — name, cost,
 *      type, P/T are all already in the snapshot — and never stops a click.
 *   2. Key on anything but the name. The engine's view carries `Name` + `SetCode`
 *      and **no collector number**, so per-print art cannot be selected at
 *      runtime. `Agent Phil Coulson` is MSH #4 *and* #402; MSH has six Plains.
 *      v1 accepts whatever print the ladder landed on.
 *
 * Artist credit ships in every entry because the WotC Fan Content Policy and
 * Scryfall's attribution terms require it wherever the art is shown.
 */

import type { AnyCard } from './protocol.ts';
import { isHidden } from './protocol.ts';

export interface ArtEntry {
  front: string;
  back: string | null;
  artist: string;
  setCode: string;
  collectorNumber: string;
  scryfallId: string;
}

export interface ArtIndex {
  generatedAt: string | null;
  /** name → entry, exactly as written. */
  cards: Record<string, ArtEntry>;
  /** Lowercased name → entry, so lookup survives case drift between Forge and Scryfall. */
  byLowerName: Map<string, ArtEntry>;
  /** Names `fetch-art.ts` could not resolve. */
  misses: string[];
}

export const EMPTY_ART_INDEX: ArtIndex = {
  generatedAt: null,
  cards: {},
  byLowerName: new Map(),
  misses: [],
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toEntry(value: unknown): ArtEntry | null {
  if (!isObject(value)) return null;
  const front = value['front'];
  if (typeof front !== 'string' || front === '') return null;
  const back = value['back'];
  return {
    front,
    back: typeof back === 'string' && back !== '' ? back : null,
    artist: typeof value['artist'] === 'string' ? value['artist'] : 'unknown',
    setCode: typeof value['setCode'] === 'string' ? value['setCode'] : '',
    collectorNumber: typeof value['collectorNumber'] === 'string' ? value['collectorNumber'] : '',
    scryfallId: typeof value['scryfallId'] === 'string' ? value['scryfallId'] : '',
  };
}

/**
 * Parse whatever `art.json` holds. Pure, and deliberately tolerant of two
 * layouts, because the file is generated and gitignored:
 *
 *   { "cards": { "<name>": {…} }, "misses": [ … ] }   ← what fetch-art.ts writes
 *   { "<name>": {…}, "misses": [ … ] }                ← the flatter shape §7 sketches
 */
export function parseArtFile(raw: unknown): ArtIndex {
  if (!isObject(raw)) return EMPTY_ART_INDEX;

  const cardsSource = isObject(raw['cards']) ? raw['cards'] : raw;
  const cards: Record<string, ArtEntry> = {};
  const byLowerName = new Map<string, ArtEntry>();
  for (const [name, value] of Object.entries(cardsSource)) {
    if (name === 'cards' || name === 'misses' || name === 'resolvedVia') continue;
    const entry = toEntry(value);
    if (entry === null) continue;
    cards[name] = entry;
    byLowerName.set(name.toLowerCase(), entry);
  }

  const misses: string[] = [];
  const rawMisses = raw['misses'];
  if (Array.isArray(rawMisses)) {
    for (const miss of rawMisses) {
      if (typeof miss === 'string') misses.push(miss);
      else if (isObject(miss) && typeof miss['name'] === 'string') misses.push(miss['name']);
    }
  }

  return {
    generatedAt: typeof raw['generatedAt'] === 'string' ? raw['generatedAt'] : null,
    cards,
    byLowerName,
    misses,
  };
}

/**
 * One in-flight fetch per URL. `<StrictMode>` runs every effect twice in
 * development; without this the page fetches `art.json` twice on each load.
 */
const artCache = new Map<string, Promise<ArtIndex>>();

/**
 * Fetch `art.json`. A 404 is the normal state of a fresh checkout — the file is
 * gitignored and regenerated with `node tools/fetch-art.ts` — so this resolves
 * to an empty index rather than rejecting, and the board falls back to text cards.
 */
export async function loadArtIndex(url = '/art.json'): Promise<ArtIndex> {
  const cached = artCache.get(url);
  if (cached !== undefined) return cached;

  const pending = (async () => {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) return EMPTY_ART_INDEX;
      return parseArtFile(await response.json());
    } catch {
      return EMPTY_ART_INDEX;
    }
  })();
  artCache.set(url, pending);
  return pending;
}

/**
 * Name → art. Tries the name verbatim, then case-insensitively, then — for a
 * `A // B` split/transform name — the front face alone, which is how Scryfall
 * names the card in `card_faces[0].name`.
 */
export function lookupArt(index: ArtIndex, name: string): ArtEntry | null {
  const trimmed = name.trim();
  if (trimmed === '') return null;

  const direct = index.cards[trimmed];
  if (direct !== undefined) return direct;

  const lower = index.byLowerName.get(trimmed.toLowerCase());
  if (lower !== undefined) return lower;

  const slash = trimmed.indexOf('//');
  if (slash > 0) {
    const front = trimmed.slice(0, slash).trim();
    const faceHit = index.byLowerName.get(front.toLowerCase());
    if (faceHit !== undefined) return faceHit;
  }

  return null;
}

/** What the renderer should draw for a card: a thumbnail, or a text frame. */
export type CardArt =
  | { kind: 'image'; url: string; artist: string; setCode: string; collectorNumber: string }
  | { kind: 'text'; reason: 'hidden' | 'no-art' };

/**
 * The one entry point the board uses. A hidden card is never given art — that
 * would leak the very thing §3.3 redacts.
 */
export function artFor(index: ArtIndex, card: AnyCard): CardArt {
  if (isHidden(card)) return { kind: 'text', reason: 'hidden' };
  const entry = lookupArt(index, card.name);
  if (entry === null) return { kind: 'text', reason: 'no-art' };
  return {
    kind: 'image',
    url: entry.front,
    artist: entry.artist,
    setCode: entry.setCode,
    collectorNumber: entry.collectorNumber,
  };
}
