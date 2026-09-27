/*
 * mtg-table — web/vite.config.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, type Connect, type Plugin, type ViteDevServer } from 'vite';

import { createCardsMiddleware } from './src/cards/devApi.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
/** Committed recordings live outside web/, so the dev server mounts them. */
const FIXTURES_DIR = resolve(REPO_ROOT, 'fixtures');

/**
 * Serve `fixtures/` at `/fixtures/` in dev and preview.
 *
 * An alias would not do: these are fetched at runtime by `?replay=`, not
 * imported, and copying them into `public/` would duplicate committed files that
 * `bridge/` writes. A ten-line middleware is the honest answer.
 */
function fixturesPlugin(): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url ?? '';
    if (!url.startsWith('/fixtures/')) {
      next();
      return;
    }
    const relative = decodeURIComponent(url.slice('/fixtures/'.length).split('?')[0] ?? '');
    const file = resolve(FIXTURES_DIR, normalize(relative));
    // Refuse anything that escapes fixtures/ — this server is loopback-only, but
    // a path-traversal hole is not worth the two lines it costs to close.
    if (!file.startsWith(FIXTURES_DIR + sep) || !existsSync(file) || !statSync(file).isFile()) {
      res.statusCode = 404;
      res.end(`not found: /fixtures/${relative}`);
      return;
    }
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    createReadStream(file).pipe(res);
  };

  return {
    name: 'mtg-table-fixtures',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

/**
 * The card browser's data route (`#cards`, web/src/cards/): `/cards/api/*` and
 * `/cards/img/<scryfallId>/<size>`, answered from the local card library in
 * `var/cards/` (docs/evidence/card-library.md).
 *
 * **Dev server only** — `configureServer` and nothing else: a production build
 * has no Node behind it, and the page says so rather than showing an empty
 * library. It reads the SQLite index and the image cache and never talks to
 * Scryfall; a cache miss is a 404 and the page falls back to the CDN URL.
 */
function cardsPlugin(): Plugin {
  return {
    name: 'mtg-table-cards',
    configureServer(server: ViteDevServer) {
      // `MTG_TABLE_CARDS_DB=var/cards/test.sqlite` points the route at another
      // index (a fixture build, or a path that does not exist — the empty state).
      const db = process.env['MTG_TABLE_CARDS_DB'];
      const { handle, backend } = createCardsMiddleware(
        REPO_ROOT,
        db === undefined || db.trim() === '' ? {} : { dbPath: resolve(REPO_ROOT, db) },
      );
      server.middlewares.use(handle);
      server.httpServer?.once('close', () => {
        backend.close();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), fixturesPlugin(), cardsPlugin()],
  server: {
    port: 5173,
    strictPort: false,
    host: '127.0.0.1',
    fs: { allow: [REPO_ROOT] },
  },
  preview: { port: 4173, host: '127.0.0.1' },
  build: { outDir: 'dist', sourcemap: true },
});
