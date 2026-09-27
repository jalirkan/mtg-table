/*
 * mtg-table — cards/api.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The browser half of the card browser's data route: four same-origin GETs
 * against `/cards/api/*`, which `web/vite.config.ts` serves in development from
 * the SQLite index in `var/cards` (`devApi.ts`). The browser never talks to
 * Scryfall's API — only its image CDN, and only for an image the local cache
 * does not hold (report 03 §4.7: "`search()` hits local FTS5 — never the
 * network").
 *
 * The route is dev-only. In a production build or `vite preview` it does not
 * exist, and every path answers with the SPA's `index.html` or a 404 — so
 * {@link fetchStatus} treats "not JSON" as "not here" and says so, rather than
 * pretending the library is empty.
 *
 * {@link CardsApi} is an interface so the vitest render suite can mount the
 * page with a fake one.
 */

import {
  toDeckFiles,
  toLibraryCard,
  toSearchResponse,
  toStatus,
  type DeckFile,
  type LibraryCard,
  type LibraryStatus,
  type SearchResponse,
} from './model.ts';
import { filtersToQuery, type CardFilters } from './search.ts';

/** The command the empty state prints when nobody told it better. */
export const DEFAULT_BUILD_COMMAND = 'node tools/card-library/build.ts';

/** Results asked for per search; the grid says when there are more. */
export const SEARCH_LIMIT = 120;

export interface CardsApi {
  status(): Promise<LibraryStatus>;
  search(filters: CardFilters, signal?: AbortSignal): Promise<SearchResponse>;
  /** One print, and every print of the same card the library holds. */
  card(id: string): Promise<{ card: LibraryCard; prints: LibraryCard[] } | null>;
  decks(): Promise<DeckFile[]>;
}

/** What the page shows when the route itself is missing (a production build). */
export function routeMissingStatus(detail: string): LibraryStatus {
  return {
    ready: false,
    message:
      'The card library route is not running here. It is served by the Vite dev server ' +
      `(npm --prefix web run dev), which reads var/cards/ — ${detail}.`,
    buildCommand: DEFAULT_BUILD_COMMAND,
    dbPath: 'var/cards/cards.sqlite',
    counts: null,
    builtAt: null,
    sets: [],
  };
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal });
  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) {
    throw new Error(`${url} answered ${String(response.status)} ${type === '' ? 'with no type' : type}`);
  }
  const body: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && typeof (body as Record<string, unknown>)['error'] === 'string'
        ? ((body as Record<string, unknown>)['error'] as string)
        : `HTTP ${String(response.status)}`;
    throw new Error(message);
  }
  return body;
}

export async function fetchStatus(): Promise<LibraryStatus> {
  try {
    const status = toStatus(await getJson('/cards/api/status'));
    return status ?? routeMissingStatus('/cards/api/status answered with something that is not a status');
  } catch (error) {
    return routeMissingStatus((error as Error).message);
  }
}

export const fetchApi: CardsApi = {
  status: fetchStatus,
  async search(filters, signal) {
    const query = filtersToQuery(filters, { limit: String(SEARCH_LIMIT) });
    return toSearchResponse(await getJson(`/cards/api/search?${query}`, signal));
  },
  async card(id) {
    const body = await getJson(`/cards/api/card/${encodeURIComponent(id)}`);
    if (typeof body !== 'object' || body === null) return null;
    const record = body as Record<string, unknown>;
    const card = toLibraryCard(record['card']);
    if (card === null) return null;
    const prints = Array.isArray(record['prints'])
      ? record['prints'].map(toLibraryCard).filter((c): c is LibraryCard => c !== null)
      : [];
    return { card, prints };
  },
  async decks() {
    try {
      return toDeckFiles(await getJson('/cards/api/decks'));
    } catch {
      return [];
    }
  },
};
