// mtg-table — the lab runner: the local status server on 127.0.0.1:8645 (D337).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The `#lab` page (ForgeCoach, on https://jalirkan.github.io) reads this first
// when it is opened on the PC itself, so Refresh shows what the runner wrote
// seconds ago rather than the last push to lab-status.  What it serves is the
// PUBLIC copy only — the same `sanitise`d status.json and `sanitiseLadder`ed
// ladder.json that lab-status carries — so nothing private is exposed even on
// loopback:
//
//   GET /public-status.json   the public status.json (also at /status.json, its old path)
//   GET /public-ladder.json   the public ladder.json, 404 when there is none
//
// CORS names the site's origin and localhost dev origins only, never `*`; an
// Origin outside the list is refused (403).  A request without an Origin
// (curl) is answered.  An https page reaching a loopback address sends a
// Private Network Access preflight; OPTIONS answers it with
// `Access-Control-Allow-Private-Network: true`.  The server binds 127.0.0.1
// and nothing else; a phone reaches it through `tailscale serve` (the
// lab-runner guide), whose requests arrive on loopback too.

import http from 'node:http';

import type { StatusDoc } from './statusjson.ts';
import { sanitise } from './statusjson.ts';

export const STATUS_HOST = '127.0.0.1';
export const SITE_ORIGINS = ['https://jalirkan.github.io'];
/** Vite's dev server and preview, on any port. */
const DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d{1,5}$/;

export function originAllowed(origin: string | undefined): boolean {
  return origin !== undefined && (SITE_ORIGINS.includes(origin) || DEV_ORIGIN.test(origin));
}

export interface StatusSource {
  /** The runner's status.json (private); sanitised here before it is served. */
  status(): StatusDoc | null;
  /** The sanitised ladder.json text, or null. */
  ladder(): string | null;
}

export interface Reply { status: number; headers: Record<string, string>; body: string }

/** One request, as a pure function: the tests call this and the real server alike. */
export function answer(method: string, url: string, headers: Record<string, string | string[] | undefined>, src: StatusSource): Reply {
  const origin = typeof headers.origin === 'string' ? headers.origin : undefined;
  const h: Record<string, string> = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json', Vary: 'Origin' };
  if (origin !== undefined && !originAllowed(origin)) return { status: 403, headers: h, body: '{"error":"origin not allowed"}' };
  if (origin !== undefined) h['Access-Control-Allow-Origin'] = origin;
  if (method === 'OPTIONS') {
    return {
      status: 204,
      headers: { ...h, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Allow-Private-Network': 'true', 'Access-Control-Max-Age': '600' },
      body: '',
    };
  }
  const p = url.split('?')[0];
  if (method !== 'GET' && method !== 'HEAD') return { status: 405, headers: h, body: '{}' };
  if (p === '/public-status.json' || p === '/status.json' || p === '/') {
    const doc = src.status();
    return doc ? { status: 200, headers: h, body: JSON.stringify(sanitise(doc)) } : { status: 503, headers: h, body: '{"error":"no status yet"}' };
  }
  if (p === '/public-ladder.json') {
    const text = src.ladder();
    return text ? { status: 200, headers: h, body: text.trimEnd() } : { status: 404, headers: h, body: '{"error":"no ladder"}' };
  }
  return { status: 404, headers: h, body: '{}' };
}

/** Listen on 127.0.0.1:<port> (0: any free port, for tests).  Resolves to the server once it listens. */
export function serveStatus(port: number, src: StatusSource): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    const r = answer(req.method ?? 'GET', req.url ?? '/', req.headers, src);
    res.writeHead(r.status, r.headers);
    res.end(req.method === 'HEAD' ? undefined : r.body);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, STATUS_HOST, () => { server.off('error', reject); server.on('error', (e) => console.error(`http: ${e.message}`)); resolve(server); });
  });
}
