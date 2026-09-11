/*
 * mtg-table — web/vite.config.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, type Connect, type Plugin, type ViteDevServer } from 'vite';

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

export default defineConfig({
  plugins: [react(), fixturesPlugin()],
  server: {
    port: 5173,
    strictPort: false,
    host: '127.0.0.1',
    fs: { allow: [REPO_ROOT] },
  },
  preview: { port: 4173, host: '127.0.0.1' },
  build: { outDir: 'dist', sourcemap: true },
});
