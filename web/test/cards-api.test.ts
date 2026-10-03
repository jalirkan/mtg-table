/*
 * mtg-table — web/test/cards-api.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The card browser's dev route, end to end, offline** (`web/src/cards/devApi.ts`).
 *
 * The route is what `web/vite.config.ts` mounts in development. Here it is
 * mounted on a bare `node:http` server on an ephemeral loopback port and asked
 * the same GETs the page makes, twice:
 *
 *   - with NO index — the state a fresh checkout is in. `status` must say
 *     `ready: false` with the build command, `search` must be a 503 that says
 *     the same, and nothing may throw: the page's empty state depends on it;
 *   - over an index built from the committed fixture slice (`fixtures/cards/`)
 *     by the library's own `indexFromManifest` into a temp directory — never
 *     `var/`, and never the network — with an empty temp image cache, so what
 *     the test sees does not depend on what is lying around on this machine.
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { indexFromManifest } from '../../tools/card-library/build.ts';
import { openLibrary } from '../../tools/card-library/query.ts';
import { BUILD_COMMAND, CardsBackend, createCardsMiddleware, SCAN_CAP, type BackendOptions } from '../src/cards/devApi.ts';
import { toDeckFiles, toLibraryCard, toSearchResponse, toStatus, type SearchResponse } from '../src/cards/model.ts';
import { COLOR_OPTIONS, matchesColors } from '../src/cards/search.ts';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const MANIFEST = join(REPO, 'fixtures', 'cards', 'manifest.json');
const TMP = mkdtempSync(join(tmpdir(), 'mtg-cards-api-'));
const PEGGY = '1f98293e-9d94-4185-8546-8beaf281dfa3';

after(() => {
  rmSync(TMP, { recursive: true, force: true });
});

/** The middleware on a real socket; `next()` is a 404 so a fall-through is visible. */
async function serve(options: BackendOptions): Promise<{ base: string; close: () => Promise<void> }> {
  const { handle, backend } = createCardsMiddleware(REPO, options);
  const server: Server = createServer((req, res) =>
    handle(req, res, () => {
      res.statusCode = 404;
      res.end('fell through');
    }),
  );
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address !== null ? address.port : 0;
  return {
    base: `http://127.0.0.1:${String(port)}`,
    close: async () => {
      backend.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

async function get(base: string, path: string): Promise<{ status: number; type: string; body: unknown; bytes: number }> {
  const response = await fetch(base + path);
  const type = response.headers.get('content-type') ?? '';
  const buffer = Buffer.from(await response.arrayBuffer());
  const body = type.includes('json') ? (JSON.parse(buffer.toString('utf8')) as unknown) : null;
  return { status: response.status, type, body, bytes: buffer.length };
}

describe('dev route: no index', () => {
  let server: Awaited<ReturnType<typeof serve>>;
  before(async () => {
    server = await serve({ dbPath: join(TMP, 'absent', 'cards.sqlite'), imagesDir: join(TMP, 'absent-images') });
  });
  after(async () => server.close());

  test('status is ready:false with the build command — a state, not an error', async () => {
    const r = await get(server.base, '/cards/api/status');
    assert.equal(r.status, 200);
    const status = toStatus(r.body);
    assert.ok(status !== null);
    assert.equal(status.ready, false);
    assert.equal(status.buildCommand, BUILD_COMMAND);
    assert.equal(BUILD_COMMAND, 'node tools/card-library/build.ts');
    assert.match(status.message, /no card index/);
    assert.deepEqual(status.sets, []);
  });

  test('search is a 503 naming the build; an image is a 404; decks still list', async () => {
    const search = await get(server.base, '/cards/api/search?q=agent');
    assert.equal(search.status, 503);
    assert.equal((search.body as Record<string, unknown>)['buildCommand'], BUILD_COMMAND);
    const image = await get(server.base, `/cards/img/${PEGGY}/normal`);
    assert.equal(image.status, 404);
    const decks = toDeckFiles((await get(server.base, '/cards/api/decks')).body);
    assert.equal(decks[0]?.file, 'decks/pacho-shield.dck', "config.json's deck is listed first");
  });

  test('anything outside the two prefixes falls through to the next handler', async () => {
    assert.equal((await get(server.base, '/cards/other')).status, 404);
    const r = await fetch(`${server.base}/index.html`);
    assert.equal(await r.text(), 'fell through');
  });
});

describe('dev route: over the fixture index', () => {
  const dbPath = join(TMP, 'fixture', 'cards.sqlite');
  const imagesDir = join(TMP, 'images');
  let server: Awaited<ReturnType<typeof serve>>;
  before(async () => {
    await indexFromManifest(MANIFEST, dbPath, () => undefined, '2026-09-27T00:00:00.000Z');
    mkdirSync(imagesDir, { recursive: true });
    server = await serve({ dbPath, imagesDir });
  });
  after(async () => server.close());

  test('status is ready, with counts and the two synced sets', async () => {
    const status = toStatus((await get(server.base, '/cards/api/status')).body);
    assert.ok(status !== null && status.ready);
    assert.deepEqual([...status.sets].sort(), ['msc', 'msh']);
    assert.ok((status.counts?.['cards'] ?? 0) > 100);
    assert.equal(status.counts?.['cachedImages'], 0);
  });

  test('search "agent": names first, AND-ed words, and a set expands to prints', async () => {
    const all = toSearchResponse((await get(server.base, '/cards/api/search?q=agent')).body);
    assert.ok(all.total > 0);
    assert.equal(all.cards.filter((c) => c.name === 'Agent Phil Coulson').length, 1);
    const msh = toSearchResponse((await get(server.base, '/cards/api/search?q=agent&set=msh')).body);
    assert.ok(msh.cards.every((c) => c.set === 'msh'));
    assert.deepEqual(
      msh.cards.filter((c) => c.name === 'Agent Phil Coulson').map((c) => c.collectorNumber).sort(),
      ['4', '402'],
    );
    const both = toSearchResponse((await get(server.base, '/cards/api/search?q=agent%20coulson')).body);
    assert.deepEqual(both.cards.map((c) => c.name), ['Agent Phil Coulson']);
  });

  test('search "shield" reaches S.H.I.E.L.D. — cards_fts indexes the period-free norm_name', async () => {
    const r = toSearchResponse((await get(server.base, '/cards/api/search?q=shield&set=msh,msc')).body);
    const hits = r.cards.map((c) => c.name);
    for (const name of ['S.H.I.E.L.D. Helicarrier', 'S.H.I.E.L.D. Spy Kit', 'Agents of S.H.I.E.L.D.']) {
      assert.ok(hits.includes(name), `${name} missing from ${hits.join(', ')}`);
    }
  });

  test('the in-deck filter is the 28 cards of decks/pacho-shield.dck, and narrows with colour and type', async () => {
    const deck = toSearchResponse((await get(server.base, '/cards/api/search?deck=decks/pacho-shield.dck')).body);
    assert.equal(deck.total, 28);
    const peggy = deck.cards.find((c) => c.name === 'Peggy Carter, Secret Agent');
    assert.deepEqual([peggy?.set, peggy?.collectorNumber], ['msc', '523'], 'no |SET in the deck: the synced MSC print');
    const blueCreatures = toSearchResponse(
      (await get(server.base, '/cards/api/search?deck=decks/pacho-shield.dck&color=U&type=creature')).body,
    );
    assert.ok(blueCreatures.total > 0);
    assert.ok(blueCreatures.cards.every((c) => c.colors.includes('U') && /\bCreature\b/.test(c.typeLine)));
    const none = toSearchResponse((await get(server.base, '/cards/api/search?color=W')).body);
    assert.equal(none.total, 0, 'colour alone is not a search — it would read every card');
    assert.equal(none.needsQuery, true);
  });

  test('a card: Peggy with her pips, stats, artist, legalities and prints; an unknown id is a 404', async () => {
    const r = await get(server.base, `/cards/api/card/${PEGGY}`);
    assert.equal(r.status, 200);
    const card = toLibraryCard((r.body as Record<string, unknown>)['card']);
    assert.ok(card !== null);
    assert.equal(card.name, 'Peggy Carter, Secret Agent');
    assert.equal(card.manaCost, '{1}{W}');
    assert.deepEqual([card.power, card.toughness], ['2', '1']);
    assert.equal(card.artist, 'Michael MacRae');
    assert.equal(card.legalities['commander'], 'legal');
    assert.match(card.imageRemote ?? '', /^https:\/\/cards\.scryfall\.io\/normal\/front\/1\/f\/1f98293e/);
    assert.equal(card.imageLocal, null, 'the temp cache is empty');
    assert.ok(Array.isArray((r.body as Record<string, unknown>)['prints']));
    assert.equal((await get(server.base, '/cards/api/card/00000000-0000-0000-0000-000000000000')).status, 404);
    assert.equal((await get(server.base, '/cards/api/card/not-an-id')).status, 400);
  });

  test('images: served from the cache when there, a 404 when not, and never outside it', async () => {
    assert.equal((await get(server.base, `/cards/img/${PEGGY}/normal`)).status, 404);
    // Put a file where the library's store would.
    mkdirSync(join(imagesDir, PEGGY), { recursive: true });
    writeFileSync(join(imagesDir, PEGGY, 'normal.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]));
    const hit = await get(server.base, `/cards/img/${PEGGY}/normal`);
    assert.equal(hit.status, 200);
    assert.equal(hit.type, 'image/jpeg');
    assert.equal(hit.bytes, 7);
    // …and the search now points the page at it.
    const peggy = toSearchResponse((await get(server.base, '/cards/api/search?q=peggy')).body).cards[0];
    assert.equal(peggy?.imageLocal, `/cards/img/${PEGGY}/normal`);
    for (const bad of [`/cards/img/${PEGGY}/huge`, '/cards/img/..%2F..%2Fetc%2Fpasswd/normal', `/cards/img/${PEGGY}/normal?face=back`]) {
      assert.equal((await get(server.base, bad)).status, 404, bad);
    }
  });
});

/**
 * **The scan cap applies AFTER the filters, never before them.** The route reads
 * at most `scanCap` text hits. It used to read them over the WHOLE library and
 * filter by set, deck and colour afterwards, so on the real 38,690-card index
 * `creature` answered 374 prints in MSH, 647 in MSC — and 1 with both chosen,
 * and "No cards match." inside a deck with 13 creatures. The fixture index is
 * far smaller than the real cap (1,000), so these tests inject one that the
 * word overruns: 130 hits for `creature` against a cap of 40.
 */
describe('dev route: the scan cap and the filters', () => {
  const dbPath = join(TMP, 'capped', 'cards.sqlite');
  const imagesDir = join(TMP, 'capped-images');
  const CAP = 40;
  let full: Awaited<ReturnType<typeof serve>>;
  let capped: Awaited<ReturnType<typeof serve>>;
  let tiny: Awaited<ReturnType<typeof serve>>;
  before(async () => {
    await indexFromManifest(MANIFEST, dbPath, () => undefined, '2026-09-27T00:00:00.000Z');
    mkdirSync(imagesDir, { recursive: true });
    full = await serve({ dbPath, imagesDir });
    capped = await serve({ dbPath, imagesDir, scanCap: CAP });
    tiny = await serve({ dbPath, imagesDir, scanCap: 4 });
  });
  after(async () => {
    await full.close();
    await capped.close();
    await tiny.close();
  });

  const search = async (server: { base: string }, query: string): Promise<SearchResponse> =>
    toSearchResponse((await get(server.base, `/cards/api/search?${query}&limit=500`)).body);
  const ids = (r: SearchResponse): string[] => r.cards.map((c) => c.id).sort();
  const distinct = (r: SearchResponse): number => new Set(r.cards.map((c) => c.oracleId)).size;

  test('the default cap is 1,000 and is bigger than the whole fixture — which is why this suite injects one', async () => {
    assert.equal(SCAN_CAP, 1000);
    assert.equal(new CardsBackend(REPO).scanCap, SCAN_CAP);
    assert.equal(new CardsBackend(REPO, { scanCap: 7 }).scanCap, 7);
    const all = await search(full, 'q=creature');
    assert.equal(all.approximate, undefined);
    assert.ok(all.total > CAP, `"creature" must overrun the injected cap: ${String(all.total)} hits`);
    const overrun = await search(capped, 'q=creature');
    assert.equal(overrun.total, CAP);
    assert.equal(overrun.approximate, true, 'a search stopped at the cap says so');
  });

  test('a common word with BOTH sets: every print the uncapped route finds, exactly', async () => {
    const want = await search(full, 'q=creature&set=msh,msc');
    assert.ok(distinct(want) > 20 && distinct(want) <= CAP, `precondition: ${String(distinct(want))} cards`);
    assert.ok(want.cards.some((c) => c.set === 'msh') && want.cards.some((c) => c.set === 'msc'));
    const got = await search(capped, 'q=creature&set=msh,msc');
    assert.equal(got.approximate, undefined, 'the cap was not reached once the sets were in the SQL');
    assert.deepEqual(ids(got), ids(want));
    // …and the same word one set at a time adds up to the pair.
    const msh = await search(capped, 'q=creature&set=msh');
    const msc = await search(capped, 'q=creature&set=msc');
    assert.equal(msh.total + msc.total, got.total);
  });

  test('a common word inside a deck: the deck is resolved first, so its 13 creatures all come back', async () => {
    const deckOnly = await search(full, 'type=creature&deck=decks/pacho-shield.dck');
    assert.equal(deckOnly.total, 13, 'the deck has 13 creatures (no words: the deck path)');
    const worded = await search(capped, 'q=creature&type=creature&deck=decks/pacho-shield.dck');
    assert.equal(worded.approximate, undefined);
    assert.deepEqual(
      worded.cards.map((c) => c.name).sort(),
      deckOnly.cards.map((c) => c.name).sort(),
      'words + deck ≡ the deck path narrowed by the same word',
    );
    const anyText = await search(capped, 'q=creature&deck=decks/pacho-shield.dck');
    assert.deepEqual(ids(anyText), ids(await search(full, 'q=creature&deck=decks/pacho-shield.dck')));
    assert.ok(anyText.total >= 13);
  });

  test('a cap smaller than the filtered answer trims AFTER the filters: every hit passes them, and it says "+"', async () => {
    for (const query of ['q=creature&set=msh,msc', 'q=creature&deck=decks/pacho-shield.dck', 'q=creature&set=msh,msc&color=W']) {
      const r = await search(tiny, query);
      assert.equal(r.approximate, true, query);
      assert.equal(distinct(r), 4, `${query}: the cap is 4 cards of the filtered answer, not 4 of the library`);
      if (query.includes('set=')) assert.ok(r.cards.every((c) => c.set === 'msh' || c.set === 'msc'), query);
      if (query.includes('color=W')) assert.ok(r.cards.every((c) => c.colors.includes('W')), query);
    }
  });

  test('colour in the SQL is exactly matchesColors — every option, multi-face cards included', () => {
    const lib = openLibrary(dbPath, { root: REPO, imagesDir });
    const backend = new CardsBackend(REPO, { dbPath, imagesDir });
    try {
      const every = (colorsAny?: string[]): Map<string, ReturnType<CardsBackend['toWire']>> => {
        const out = new Map<string, ReturnType<CardsBackend['toWire']>>();
        for (let offset = 0; ; offset += 200) {
          const page = lib.search('a', { includeExtras: true, limit: 200, offset, ...(colorsAny === undefined ? {} : { colorsAny }) });
          for (const hit of page) out.set(hit.oracleId, backend.toWire(lib, hit, hit.print));
          if (page.length < 200) break;
        }
        return out;
      };
      const base = every();
      assert.ok(base.size > 120, `"a" is a prefix of most cards: ${String(base.size)}`);
      assert.ok(
        [...base.values()].some((c) => c.faces.length > 1 && c.faces.some((f) => f.name.startsWith('Delver'))),
        'the fixture holds a transform card, whose colours live on its faces',
      );
      const combos = [...COLOR_OPTIONS.map((c) => [c.code]), ['W', 'M'], ['C', 'G'], ['U', 'R', 'C']];
      for (const combo of combos) {
        const want = [...base.entries()].filter(([, card]) => matchesColors(card, combo)).map(([id]) => id).sort();
        assert.deepEqual([...every(combo).keys()].sort(), want, combo.join(''));
      }
    } finally {
      backend.close();
      lib.close();
    }
  });

  test('the page never says "No cards match." for a search the cap stopped', async () => {
    // The route's own flag is what the page reads; `cards-render` holds the words.
    const r = await search(tiny, 'q=creature');
    assert.equal(r.approximate, true);
    assert.ok(r.total > 0);
  });
});
