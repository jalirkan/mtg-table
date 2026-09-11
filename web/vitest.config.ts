/*
 * mtg-table — web/vitest.config.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Vitest exists in this repo for exactly one reason: **Node's type stripping
 * does not transform JSX.** `npm test` is `node --test test/*.test.ts` plus
 * this, and everything that can be written without JSX stays on `node --test`
 * — the reducer, the protocol shapes, the fixture contract — because that is
 * zero dependencies and a millisecond of startup.
 *
 * What it could not do is mount `<Board/>`. M1 shipped a `TypeError` that
 * blanked the page on the primary fixture while 122 tests stayed green, because
 * nothing in the suite ever rendered a component: `fixtures.test.ts` worked
 * around it by calling `describeEvent` directly, which covers one leaf of the
 * tree and nothing above it. `test/render.test.tsx` is the fix, and this file is
 * the minimum configuration it needs.
 *
 * `include` is narrow on purpose. Vitest's default glob would also pick up the
 * five `node --test` files, whose `test()` comes from `node:test` and takes
 * different arguments — they would run twice, under the wrong runner, and the
 * failures would be about the harness rather than the code.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only the JSX suites. Everything else is node --test; see the header.
    include: ['test/**/*.test.tsx'],
    // The board is a tree of pure function components with no effects, no refs
    // and no browser API beyond `<img>`, so it renders under
    // `react-dom/server`'s `renderToStaticMarkup` and needs no DOM at all.
    // `environment: 'node'` is the default; it is written down because the
    // absence of jsdom here is a decision, not an oversight.
    environment: 'node',
    // Folding six recordings (~1,600 state frames) and rendering the board once
    // per frame is the slowest thing in `npm test`. It runs in about ten
    // seconds; the default 5 s per-test timeout is not enough for g1 alone.
    testTimeout: 120_000,
    reporters: ['default'],
  },
});
