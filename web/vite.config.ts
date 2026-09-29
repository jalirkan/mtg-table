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
import { PERSONAL_RELIEF_DIR, buildReliefIndex, createPersonalMiddleware, describeIndex, describeRelief } from './src/personal/devRoute.ts';
import { createSpectateMiddleware } from './src/spectate/devRoute.ts';

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

/**
 * The spectate recordings (`./scripts/spectate.sh`, decision D122):
 * `/spectate/<name>.jsonl[?from=<byte>]`, answered from `var/spectate/`.
 *
 * **Dev server only** — `configureServer` and nothing else, D92's rule for the
 * card browser's route: `var/` is never committed and never built, a production
 * page has no Node behind it, and `vite preview` serves a build. The route reads
 * complete lines from one directory and never fetches (`src/spectate/devRoute.ts`
 * says how follow mode reads a file that is still being written).
 */
function spectatePlugin(): Plugin {
  return {
    name: 'mtg-table-spectate',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(createSpectateMiddleware(REPO_ROOT));
    },
  };
}

/**
 * **The personal tier** (D190, phase 2 — D195): `/personal/index.json` and each
 * ACTIVE model's `model.glb` and `manifest.json`, answered from the gitignored
 * `personal/models/` (`src/personal/devRoute.ts`, which builds the index once, now);
 * and the relief cache's index and depth maps (D225), from `personal/relief/`.
 *
 * **Dev server only** — `configureServer` and nothing else, D92's rule: the
 * user's own models are never published, a production page has no Node behind
 * it, and `vite preview` serves a build. `MTG_TABLE_PERSONAL=off` starts a dev
 * server without it (the arena then draws the CC0 figures, as a checkout with no
 * `personal/` folder does); `MTG_TABLE_PERSONAL_DIR` points it at another folder
 * inside the repository.
 */
function personalPlugin(): Plugin {
  return {
    name: 'mtg-table-personal',
    configureServer(server: ViteDevServer) {
      if (process.env['MTG_TABLE_PERSONAL'] === 'off') return;
      // `MTG_TABLE_PERSONAL_DIR=<folder>` reads another folder of models instead —
      // inside the repository only (a scratch tier under the gitignored `var/`,
      // which is how D197's worst case was benched). Anything else: the tier is off.
      const other = process.env['MTG_TABLE_PERSONAL_DIR'];
      const dir = other === undefined || other === '' ? undefined : resolve(REPO_ROOT, other);
      if (dir !== undefined && !dir.startsWith(`${REPO_ROOT}${sep}`)) {
        server.config.logger.warn(`personal tier: MTG_TABLE_PERSONAL_DIR (${other}) is outside the repository — the tier is off`);
        return;
      }
      const { handle, index } = createPersonalMiddleware(REPO_ROOT, dir === undefined ? {} : { dir });
      for (const line of describeIndex(index)) server.config.logger.info(line);
      // The relief cache (D225): the workshop's inspect view's depth maps, read per request.
      server.config.logger.info(describeRelief(buildReliefIndex(resolve(REPO_ROOT, PERSONAL_RELIEF_DIR))));
      server.middlewares.use(handle);
    },
  };
}

export default defineConfig({
  plugins: [react(), fixturesPlugin(), cardsPlugin(), spectatePlugin(), personalPlugin()],
  server: {
    port: 5173,
    strictPort: false,
    host: '127.0.0.1',
    fs: { allow: [REPO_ROOT] },
  },
  preview: { port: 4173, host: '127.0.0.1' },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // **The arena's scene, named for what it is.** Two lazy pages draw with
        // it — `#arena` and `#workshop` — so Rollup hoists `three`, fiber, drei
        // and `web/src/arena/scene/` into one chunk they share, and would name it
        // after whichever module it happened to pick (`tiles-*.js`). A shared,
        // non-entry chunk that carries `three` is `arena-scene-*.js`, whatever
        // module Rollup picks: the evidence and CLAUDE.md quote it by that name.
        // It stays lazy (D49) — only the two lazy entries import it.
        chunkFileNames: (chunk) =>
          !chunk.isEntry && !chunk.isDynamicEntry && chunk.moduleIds.some((id) => id.includes('/node_modules/three/'))
            ? 'assets/arena-scene-[hash].js'
            : 'assets/[name]-[hash].js',
      },
    },
  },
});
