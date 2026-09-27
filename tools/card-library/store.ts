/*
 * mtg-table — tools/card-library/store.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The image cache on disk (report 03 §4.5), keyed by what is immutable and
 * unambiguous — the Scryfall print id, the size and the side — never by name:
 *
 *     var/cards/images/<scryfallId>/<size>.<ext>          front (or the only side)
 *     var/cards/images/<scryfallId>/<size>.back.<ext>     back of a two-sided card
 *
 * e.g. `var/cards/images/1f98293e-…-8beaf281dfa3/normal.jpg` is Peggy Carter
 * (msc #523). One directory per print keeps every size of a card together.
 *
 * Rules, each with a reason:
 *   - **Fetched from `cards.scryfall.io` directly**, never through
 *     `api.scryfall.com`: the CDN has no rate limit; the API's image redirect is
 *     paced at 10/s and gains nothing (report 03 §2.4).
 *   - **Written to `<path>.<pid>.part`, then `rename()`d**, so a killed process
 *     never leaves a truncated JPEG where a reader would serve it.
 *   - **Checked before it is kept**: an `image/*` content type, a non-empty
 *     body, and — when the server sent one — exactly `Content-Length` bytes.
 *   - **Never fetched twice**: a present, non-empty file is the answer.
 *     Concurrent requests for the same file share one download.
 *   - The `?<version>` cache-buster is dropped from the stored name (it is the
 *     print's `image_updated_at`, which the index keeps).
 */

import { createWriteStream, existsSync, statSync } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

import { IMAGE_EXT, type Face, type ImageSize } from './model.ts';
import type { ScryfallClient } from './scryfall.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isScryfallId(id: string): boolean {
  return UUID.test(id);
}

/** THE cache path. Throws on anything that is not a Scryfall UUID, so no id can walk the tree. */
export function imagePathFor(imagesDir: string, id: string, size: ImageSize, face: Face = 'front'): string {
  if (!isScryfallId(id)) throw new Error(`not a Scryfall id: ${JSON.stringify(id)}`);
  const ext = IMAGE_EXT[size];
  return join(imagesDir, id, face === 'back' ? `${size}.back.${ext}` : `${size}.${ext}`);
}

export function isCached(path: string): boolean {
  return existsSync(path) && statSync(path).size > 0;
}

export interface DownloadResult {
  path: string;
  bytes: number;
  /** `false` when the file was already there and nothing was fetched. */
  fetched: boolean;
}

const inFlight = new Map<string, Promise<DownloadResult>>();

/**
 * Put one image in the cache. Present → nothing is fetched. Absent → one GET to
 * the CDN (through the client, so it carries our User-Agent and is logged),
 * streamed to a `.part` file, checked, renamed.
 */
export function downloadImage(client: ScryfallClient, url: string, path: string): Promise<DownloadResult> {
  if (isCached(path)) return Promise.resolve({ path, bytes: statSync(path).size, fetched: false });
  const pending = inFlight.get(path);
  if (pending !== undefined) return pending;
  const job = (async (): Promise<DownloadResult> => {
    const response = await client.request(url, { accept: 'image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8' });
    const type = response.headers.get('content-type') ?? '';
    if (!response.ok || response.body === null || !type.startsWith('image/')) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(`GET ${url} → HTTP ${String(response.status)} ${type}`);
    }
    const expected = Number.parseInt(response.headers.get('content-length') ?? '', 10);
    const part = `${path}.${String(process.pid)}.part`;
    await mkdir(dirname(path), { recursive: true });
    try {
      await pipeline(Readable.fromWeb(response.body as unknown as NodeReadableStream), createWriteStream(part));
      const bytes = statSync(part).size;
      if (bytes === 0 || (Number.isFinite(expected) && bytes !== expected)) {
        throw new Error(`GET ${url} → ${String(bytes)} B, expected ${Number.isFinite(expected) ? String(expected) : '> 0'}`);
      }
      await rename(part, path);
      return { path, bytes, fetched: true };
    } catch (error) {
      await rm(part, { force: true });
      throw error;
    }
  })();
  inFlight.set(path, job);
  const clear = (): void => {
    inFlight.delete(path);
  };
  job.then(clear, clear);
  return job;
}
