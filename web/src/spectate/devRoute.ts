/*
 * mtg-table — spectate/devRoute.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The spectate recordings' route — Node only, dev server only** (decision
 * D122, the card library's D92 pattern). `web/vite.config.ts` mounts
 * {@link createSpectateMiddleware} in `configureServer` and NOWHERE else — not
 * `vite preview`, not the build — so `var/spectate/`, which is never committed,
 * is reachable exactly while a developer's own dev server is running:
 *
 *     GET /spectate/<name>.jsonl              every COMPLETE line of the file
 *     GET /spectate/<name>.jsonl?from=<byte>  the complete lines written since
 *                                             that byte offset, at most
 *                                             MAX_CHUNK_BYTES (follow mode)
 *
 * Every answer carries `X-Log-Next` (the offset just past the last line it
 * sent — where the next poll starts) and `X-Log-Size` (the file's size when it
 * was read). **A line the recorder is half way through writing is never sent**:
 * the body ends at the last `\n`, so the poller (`transport/follow.ts`) never
 * parses half a frame, and because a `\n` byte cannot occur inside a UTF-8
 * sequence the cut is always a character boundary.
 *
 * The answers that are not a body: **404** when the file does not exist yet —
 * the recorder is still booting, and follow mode treats it as "waiting" — and
 * **416** when `from` is past the end of the file, which can only mean the file
 * was re-recorded under the same name while a page was following it.
 *
 * The name is one path segment (`[A-Za-z0-9._-]+.jsonl`), so there is no
 * traversal to guard against beyond that pattern, and the route never reads
 * anything outside the one directory. **It never fetches**: a miss is a 404,
 * never a request to anywhere (D92's rule, for the same reason).
 *
 * This file must never be imported by browser code (`spectate.test.ts` checks).
 */

import { closeSync, existsSync, fstatSync, openSync, readSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';

/** Where `scripts/spectate.sh` writes its recordings, relative to the repo root. */
export const SPECTATE_DIR = 'var/spectate';
/** The URL prefix the recordings are served under. */
export const SPECTATE_PREFIX = '/spectate/';
/** One path segment ending in `.jsonl`: what `scripts/spectate.sh` names a recording. */
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.jsonl$/;
/** The most one answer carries, so a late join on a long game is several polls, not one huge body. */
export const MAX_CHUNK_BYTES = 4 * 1024 * 1024;

export interface SpectateRouteOptions {
  /** The directory served; `<repoRoot>/var/spectate` by default. A test points it at a temp dir. */
  dir?: string;
}

/** The complete lines of `file` from byte `from` on: the bytes and where the next read starts. */
export interface Chunk {
  status: 200 | 404 | 416;
  body: Buffer;
  next: number;
  size: number;
}

/**
 * Read the complete lines of `file` starting at byte `from`. Pure apart from the
 * file read, and exported so a test can drive it without a server.
 */
export function readCompleteLines(file: string, from: number, maxBytes = MAX_CHUNK_BYTES): Chunk {
  if (!existsSync(file) || !statSync(file).isFile()) return { status: 404, body: Buffer.alloc(0), next: from, size: 0 };
  let size: number;
  let buf: Buffer;
  let got = 0;
  const fd = openSync(file, 'r');
  try {
    size = fstatSync(fd).size;
    if (from > size) return { status: 416, body: Buffer.alloc(0), next: from, size };
    const want = Math.min(size - from, maxBytes);
    buf = Buffer.alloc(want);
    while (got < want) {
      const n = readSync(fd, buf, got, want - got, from + got);
      if (n <= 0) break;
      got += n;
    }
  } finally {
    closeSync(fd);
  }
  const cut = buf.subarray(0, got).lastIndexOf(0x0a);
  if (cut < 0 && got === maxBytes && size - from > maxBytes) {
    // One line longer than the cap (a frame is ~12 kB; this is a guard, not a
    // case): read to the end rather than answer "nothing new" for ever.
    return readCompleteLines(file, from, size - from);
  }
  const body = cut < 0 ? Buffer.alloc(0) : buf.subarray(0, cut + 1);
  return { status: 200, body, next: from + body.length, size };
}

/** The connect-style middleware `vite.config.ts` mounts in `configureServer`. */
export function createSpectateMiddleware(
  repoRoot: string,
  options: SpectateRouteOptions = {},
): (req: IncomingMessage, res: ServerResponse, next: () => void) => void {
  const dir = options.dir ?? resolve(repoRoot, SPECTATE_DIR);
  return (req, res, next) => {
    const url = req.url ?? '';
    if (!url.startsWith(SPECTATE_PREFIX)) {
      next();
      return;
    }
    const [pathPart, query = ''] = url.slice(SPECTATE_PREFIX.length).split('?', 2);
    let name: string;
    try {
      name = decodeURIComponent(pathPart ?? '');
    } catch {
      name = '';
    }
    res.setHeader('Cache-Control', 'no-store');
    if (!NAME.test(name)) {
      res.statusCode = 404;
      res.end(`not a spectate recording name: ${JSON.stringify(name)} (expected <name>.jsonl, one segment)`);
      return;
    }
    const fromRaw = new URLSearchParams(query).get('from');
    const from = fromRaw === null ? 0 : Number(fromRaw);
    if (!Number.isInteger(from) || from < 0) {
      res.statusCode = 400;
      res.end(`from must be a byte offset, got ${JSON.stringify(fromRaw)}`);
      return;
    }
    // The whole-file read (a finished recording, `?replay=` without `follow`)
    // is not capped; a poll is, so a late join is several polls, not one body.
    const chunk = readCompleteLines(resolve(dir, name), from, fromRaw === null ? Number.MAX_SAFE_INTEGER : MAX_CHUNK_BYTES);
    res.setHeader('X-Log-Next', String(chunk.next));
    res.setHeader('X-Log-Size', String(chunk.size));
    if (chunk.status === 404) {
      res.statusCode = 404;
      res.end(`not recorded yet: ${SPECTATE_DIR}/${name} (is ./scripts/spectate.sh running?)`);
      return;
    }
    if (chunk.status === 416) {
      res.statusCode = 416;
      res.end(`from=${String(from)} is past the end of ${SPECTATE_DIR}/${name} (${String(chunk.size)} bytes): re-recorded`);
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.end(chunk.body);
  };
}
