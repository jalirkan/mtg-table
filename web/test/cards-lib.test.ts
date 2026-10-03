/*
 * mtg-table — web/test/cards-lib.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The card library (`tools/card-library/`), offline. Everything here runs
 * against `fixtures/cards/` — real lines of a real `oracle_cards` bulk file and
 * real MSH / MSC print syncs, cut by `tools/card-library/make-fixture.ts` and
 * reduced to the fields the library reads (model.ts `SCRY_CARD_FIELDS`; the
 * index built from them has the same content digest as one built from the
 * verbatim lines) — and against a Scryfall that is a fake `fetch` with a fake
 * clock. Nothing in this file touches the network.
 *
 * What it holds the library to, each from report 03:
 *   - the multi-face image rule (§2.3), table-driven over real rows;
 *   - the compact image storage gives back EXACTLY the URL Scryfall sent,
 *     for every size and side of every fixture print;
 *   - the rate limiter (§1.2): 500 ms on search, 100 ms elsewhere, a 429's
 *     Retry-After closes the API but not the CDN, and both headers always;
 *   - the build: a fetch phase against the fake Scryfall, then an index phase;
 *     a second fetch downloads no bulk file; two builds from the same files
 *     have the same content digest; a failed build leaves the old index;
 *   - the queries: the name ladder, the print ladder (Peggy Carter is MSC's,
 *     `Plains|MSH` is MSH's plain printing, Forge's art index picks the Nth),
 *     FTS search, and input that is FTS5 syntax;
 *   - the image store: keyed by id + size + side, `.part` then rename, never
 *     fetched twice, and a short body leaves nothing behind.
 */

import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { contentDigest, fetchSources, indexFromManifest, readManifest } from '../../tools/card-library/build.ts';
import { userAgent, userAgentWarning } from '../../tools/card-library/config.ts';
import { parseCardRequest, parseDck, parseDeck, parseTxt, totalCards } from '../../tools/card-library/deck.ts';
import {
  cdnUrl,
  cnSort,
  compactLegalities,
  ftsQuery,
  imageSides,
  imageUrlOf,
  isMainPrint,
  kindOf,
  normName,
  packImages,
  SCRY_CARD_FIELDS,
  SCRY_FACE_FIELDS,
  SCRY_SET_FIELDS,
  type ImageSize,
  type ScryCard,
} from '../../tools/card-library/model.ts';
import { CardLibrary, LibraryMissingError, openLibrary } from '../../tools/card-library/query.ts';
import { bucketOf, rateStats, retryAfterMs, ScryfallClient, ScryfallError } from '../../tools/card-library/scryfall.ts';
import { downloadImage, imagePathFor } from '../../tools/card-library/store.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const FIXTURE = resolve(ROOT, 'fixtures', 'cards');
const MANIFEST = resolve(FIXTURE, 'manifest.json');

const TMP = mkdtempSync(join(tmpdir(), 'mtg-cards-test-'));
after(() => rmSync(TMP, { recursive: true, force: true }));

function jsonl(file: string): ScryCard[] {
  return readFileSync(resolve(FIXTURE, file), 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as ScryCard);
}

const ORACLE = jsonl('oracle-cards.slice.jsonl');
const MSH = jsonl('prints-msh.slice.jsonl');
const MSC = jsonl('prints-msc.slice.jsonl');
const byName = (rows: ScryCard[], name: string): ScryCard => {
  const hit = rows.find((c) => c.name === name);
  assert.ok(hit !== undefined, `fixture has no ${name}`);
  return hit;
};

// ---------------------------------------------------------------------------
// A fake clock and a fake Scryfall
// ---------------------------------------------------------------------------

class FakeClock {
  t = 0;
  now = (): number => this.t;
  sleep = (ms: number): Promise<void> => {
    this.t += Math.max(0, ms);
    return Promise.resolve();
  };
}

/**
 * Virtual time for CONCURRENT callers: `sleep` parks on a timer and
 * {@link VirtualClock.drive} advances to the earliest timer only once nothing
 * else can run — so three callers that each reserved a slot really do start at
 * their slots, which the jump-ahead {@link FakeClock} cannot show.
 */
class VirtualClock {
  t = 0;
  readonly #timers: { at: number; resolve: () => void }[] = [];
  now = (): number => this.t;
  sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      this.#timers.push({ at: this.t + Math.max(0, ms), resolve });
    });
  async drive<T>(work: Promise<T>): Promise<T> {
    let done = false;
    const result = work.finally(() => {
      done = true;
    });
    for (let idle = 0; !done; ) {
      await new Promise((r) => setImmediate(r));
      if (done) break;
      this.#timers.sort((a, b) => a.at - b.at);
      const next = this.#timers.shift();
      if (next === undefined) {
        if (++idle > 100) throw new Error('virtual clock: nothing left to wait for');
        continue;
      }
      this.t = Math.max(this.t, next.at);
      next.resolve();
    }
    return result;
  }
}

interface Seen {
  url: string;
  at: number;
  headers: Record<string, string>;
}

type Route = (url: URL) => Response | null;

function fakeFetch(clock: { t: number }, routes: Route[], seen: Seen[]): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    seen.push({ url: url.href, at: clock.t, headers: { ...(init?.headers as Record<string, string>) } });
    for (const route of routes) {
      const response = route(url);
      if (response !== null) return response;
    }
    return new Response(JSON.stringify({ object: 'error', code: 'not_found', details: 'no route' }), { status: 404 });
  }) as typeof fetch;
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// ---------------------------------------------------------------------------
// model.ts — pure rules
// ---------------------------------------------------------------------------

test('fixture: the committed slice carries only the fields the library reads — no more of Scryfall than the tests use', () => {
  const card = new Set<string>(SCRY_CARD_FIELDS);
  const face = new Set<string>(SCRY_FACE_FIELDS);
  const extra: string[] = [];
  for (const row of [...ORACLE, ...MSH, ...MSC] as unknown as Record<string, unknown>[]) {
    for (const key of Object.keys(row)) if (!card.has(key)) extra.push(`${String(row['name'])}: ${key}`);
    for (const f of (row['card_faces'] ?? []) as Record<string, unknown>[]) {
      for (const key of Object.keys(f)) if (!face.has(key)) extra.push(`${String(row['name'])} (face): ${key}`);
    }
  }
  const setKeys = new Set<string>(SCRY_SET_FIELDS);
  for (const set of JSON.parse(readFileSync(resolve(FIXTURE, 'sets.slice.json'), 'utf8')) as Record<string, unknown>[]) {
    for (const key of Object.keys(set)) if (!setKeys.has(key)) extra.push(`set ${String(set['code'])}: ${key}`);
  }
  assert.deepEqual(extra.slice(0, 10), [], 'regenerate with node tools/card-library/make-fixture.ts');
  // …and it is still the real thing where it matters: images, legalities, faces.
  assert.ok(MSH.every((c) => c.image_uris !== undefined || (c.card_faces?.length ?? 0) > 1));
  assert.ok(ORACLE.every((c) => c.legalities !== undefined));
});

describe('model: the multi-face image rule (report 03 §2.3)', () => {
  const cases: [string, 'top' | 'faces', boolean][] = [
    ['Delver of Secrets // Insectile Aberration', 'faces', true], // transform: two physical sides
    ['Witch Enchanter // Witch-Blessed Meadow', 'faces', true], // modal DFC
    ['Fire // Ice', 'top', false], // split: two faces on ONE side
    ['Bonecrusher Giant // Stomp', 'top', false], // adventure
    ['Adventurous Eater // Have a Bite', 'top', false], // prepare (a layout newer than report 03)
    ['Agent Phil Coulson', 'top', false],
  ];
  for (const [name, where, hasBack] of cases) {
    test(`${name}: ${where === 'top' ? 'top-level image_uris' : 'card_faces image_uris'}, back ${String(hasBack)}`, () => {
      const card = byName(ORACLE, name);
      const sides = imageSides(card);
      assert.ok(sides.front !== null);
      if (where === 'top') assert.equal(sides.front, card.image_uris);
      else assert.equal(sides.front, card.card_faces?.[0]?.image_uris);
      assert.equal(sides.back !== null, hasBack);
    });
  }
});

describe('model: compact image storage is lossless', () => {
  test('every size and side of every fixture card round-trips to the exact URL Scryfall sent', () => {
    let urls = 0;
    for (const card of [...ORACLE, ...MSH, ...MSC]) {
      const sides = imageSides(card);
      const packed = { id: card.id, ...packImages(card.id, sides) };
      assert.equal(packed.raw, null, `${card.name}: URIs off the CDN pattern`);
      for (const face of ['front', 'back'] as const) {
        for (const [size, url] of Object.entries(sides[face] ?? {})) {
          assert.equal(imageUrlOf(packed, size as ImageSize, face), url);
          urls++;
        }
      }
      assert.equal(imageUrlOf(packed, 'normal', 'back') === null, sides.back === null);
    }
    assert.ok(urls > 2500, `only ${String(urls)} URLs checked`);
  });

  test('a URI that does not follow the pattern is kept verbatim', () => {
    const odd = 'https://example.invalid/odd.jpg?7';
    const packed = { id: 'x', ...packImages('x', { front: { normal: odd }, back: null }) };
    assert.notEqual(packed.raw, null);
    assert.equal(imageUrlOf(packed, 'normal'), odd);
  });

  test('the cache-buster is the print’s image_updated_at as a Unix timestamp', () => {
    const peggy = byName(MSC, 'Peggy Carter, Secret Agent');
    const version = packImages(peggy.id, imageSides(peggy)).version;
    assert.equal(Number(version) * 1000, Date.parse(peggy.image_updated_at ?? ''));
  });
});

describe('model: names, numbers, prints', () => {
  test('normName is case-, accent- and punctuation-insensitive and keeps " // "', () => {
    assert.equal(normName('S.H.I.E.L.D. Helicarrier'), 'shield helicarrier');
    assert.equal(normName("Ant-Man's Air Force"), 'ant mans air force');
    assert.equal(normName('A.I.M. Scientists'), 'aim scientists');
    assert.equal(normName('Lim-Dûl the Necromancer'), 'lim dul the necromancer');
    assert.equal(normName('Fire//Ice'), 'fire // ice');
    assert.equal(normName("  Smuggler's   Copter "), 'smugglers copter');
  });

  test('collector numbers are strings that order as numbers', () => {
    const sorted = ['402', '4', '287', '4b', '★1', 'F12', 'A'].sort((a, b) => cnSort(a) - cnSort(b) || a.localeCompare(b));
    assert.deepEqual(sorted, ['★1', '4', '4b', 'F12', '287', '402', 'A']);
  });

  test("isMainPrint agrees with Forge's edition sections (msh #4 [cards], #402 [extended art])", () => {
    const coulson = MSH.filter((c) => c.name === 'Agent Phil Coulson');
    assert.deepEqual(new Map(coulson.map((c) => [c.collector_number, isMainPrint(c)])), new Map([['4', true], ['402', false]]));
    const plains = new Map(MSH.filter((c) => c.name === 'Plains').map((c) => [c.collector_number, isMainPrint(c)]));
    assert.deepEqual(plains, new Map([['277', true], ['278', true], ['287', true], ['288', true], ['433', false], ['434', false]]));
  });

  test('tokens, art-series, theme and plane cards are extras', () => {
    for (const name of ['Wasp', 'Surprise!', 'Shrinking Plane', 'Brightglass Gearhulk // Brightglass Gearhulk']) {
      const card = byName(ORACLE, name);
      assert.equal(kindOf(card.layout, card.type_line), 'extra', name);
    }
    const peggy = byName(ORACLE, 'Peggy Carter, Secret Agent');
    assert.equal(kindOf(peggy.layout, peggy.type_line), 'card');
  });

  test('legalities keep only what is not "not_legal"', () => {
    assert.deepEqual(compactLegalities({ standard: 'not_legal', commander: 'legal', vintage: 'restricted' }), {
      commander: 'legal',
      vintage: 'restricted',
    });
  });

  test('ftsQuery quotes every token, so FTS5 syntax typed by a user is inert', () => {
    assert.equal(ftsQuery('shrink'), '"shrink"*');
    assert.equal(ftsQuery('Ant-Man'), '"ant man"*');
    assert.equal(ftsQuery('S.H.I.E.L.D. helicarrier'), '"shield"* AND "helicarrier"*');
    assert.equal(ftsQuery('peggy carter', 'OR', 'norm_name'), 'norm_name : ("peggy"* OR "carter"*)');
    assert.equal(ftsQuery('  ***  '), null);
    assert.equal(ftsQuery('NEAR( "a" OR b:c -d )'), '"near"* AND "a"* AND "or"* AND "b c"* AND "d"*');
  });
});

// ---------------------------------------------------------------------------
// deck.ts
// ---------------------------------------------------------------------------

describe('deck: both formats in decks/ (report 03 §4.9)', () => {
  test('pacho-shield.dck: 28 lines, 40 cards, and the ten without |MSH are exactly the MSC ten', () => {
    const deck = parseDck(readFileSync(resolve(ROOT, 'decks/pacho-shield.dck'), 'utf8'));
    assert.equal(deck.name, 'Pacho SHIELD (Marvel Super Heroes)');
    assert.equal(deck.entries.length, 28);
    assert.equal(totalCards(deck), 40);
    assert.deepEqual(deck.skipped, []);
    const unsuffixed = deck.entries.filter((e) => e.set === null).map((e) => e.name);
    assert.equal(unsuffixed.length, 10);
    for (const name of unsuffixed) assert.ok(MSC.some((c) => c.name === name), `${name} is not an MSC print`);
    assert.equal(deck.entries.find((e) => e.name === 'Plains')?.count, 7);
  });

  test('pacho-shield.txt is the same 40 cards', () => {
    const txt = parseTxt(readFileSync(resolve(ROOT, 'decks/pacho-shield.txt'), 'utf8'));
    const dck = parseDck(readFileSync(resolve(ROOT, 'decks/pacho-shield.dck'), 'utf8'));
    assert.equal(totalCards(txt), 40);
    assert.deepEqual(txt.entries.map((e) => [e.count, e.name]), dck.entries.map((e) => [e.count, e.name]));
  });

  test("Forge's CardRequest forms", () => {
    assert.deepEqual(parseCardRequest('Plains|MSH|3'), { name: 'Plains', set: 'msh', artIndex: 3, collectorNumber: null, foil: false });
    assert.deepEqual(parseCardRequest('Captain America, Super-Soldier|MSH|[316]'), {
      name: 'Captain America, Super-Soldier',
      set: 'msh',
      artIndex: null,
      collectorNumber: '316',
      foil: false,
    });
    assert.deepEqual(parseCardRequest('Island+'), { name: 'Island', set: null, artIndex: null, collectorNumber: null, foil: true });
  });

  test('sections are case-insensitive; text lists take counts, x, comments and SB:', () => {
    const dck = parseDeck('[metadata]\nName=X\n[Main]\n2 Opt\n[SideBoard]\n1 Shock|M19\n', 'x.dck');
    assert.deepEqual(dck.entries.map((e) => [e.section, e.count, e.name, e.set]), [
      ['main', 2, 'Opt', null],
      ['sideboard', 1, 'Shock', 'm19'],
    ]);
    const txt = parseDeck('// a comment\n4x Island\nFire // Ice\n# another\nSB: 2 Shock\n\nSideboard\n1 Negate\n');
    assert.equal(txt.format, 'txt');
    assert.deepEqual(txt.entries.map((e) => [e.section, e.count, e.name]), [
      ['main', 4, 'Island'],
      ['main', 1, 'Fire // Ice'],
      ['sideboard', 2, 'Shock'],
      ['sideboard', 1, 'Negate'],
    ]);
  });

  test('every deck in decks/ parses with nothing skipped', () => {
    // A deck is a `.dck` or a `.txt` list; decks/README.md (match setup) is not
    // one, and every tool that lists decks/ filters the same way.
    const decks = readdirSync(resolve(ROOT, 'decks')).filter((f) => /\.(dck|txt)$/i.test(f));
    assert.ok(decks.length >= 2, `decks/ holds ${String(decks.length)} deck file(s)`);
    for (const file of decks) {
      const deck = parseDeck(readFileSync(resolve(ROOT, 'decks', file), 'utf8'), file);
      assert.deepEqual(deck.skipped, [], file);
      assert.ok(totalCards(deck, 'main') >= 40, `${file}: ${String(totalCards(deck, 'main'))} main cards`);
    }
  });
});

// ---------------------------------------------------------------------------
// scryfall.ts — headers and the rate limiter, on a fake clock
// ---------------------------------------------------------------------------

describe('scryfall: headers, pacing and 429 (report 03 §1.1, §1.2)', () => {
  test('buckets', () => {
    assert.equal(bucketOf('https://api.scryfall.com/cards/search?q=e:msh'), 'search');
    assert.equal(bucketOf('https://api.scryfall.com/cards/named?exact=x'), 'search');
    assert.equal(bucketOf('https://api.scryfall.com/cards/collection'), 'search');
    assert.equal(bucketOf('https://api.scryfall.com/cards/msh/4'), 'api');
    assert.equal(bucketOf('https://api.scryfall.com/bulk-data'), 'api');
    assert.equal(bucketOf('https://api.scryfall.com/sets'), 'api');
    assert.equal(bucketOf('https://api.scryfall.com/cards/manifest'), 'manifest');
    assert.equal(bucketOf('https://cards.scryfall.io/normal/front/1/f/x.jpg'), 'file');
    assert.equal(bucketOf('https://data.scryfall.io/oracle-cards/x.jsonl.gz'), 'file');
  });

  test('search is >= 500 ms apart, other API calls >= 100 ms, files unpaced; both headers every time', async () => {
    const clock = new FakeClock();
    const seen: Seen[] = [];
    const client = new ScryfallClient({
      userAgent: 'mtg-table-test/1',
      fetch: fakeFetch(clock, [() => json({ object: 'list', data: [] })], seen),
      now: clock.now,
      sleep: clock.sleep,
    });
    for (let i = 0; i < 4; i++) await client.request('https://api.scryfall.com/cards/search?q=x');
    for (let i = 0; i < 3; i++) await client.request('https://api.scryfall.com/sets');
    for (let i = 0; i < 3; i++) await client.request('https://cards.scryfall.io/normal/front/a/b/c.jpg');
    const at = (host: string, path: string): number[] => seen.filter((s) => s.url.includes(host) && s.url.includes(path)).map((s) => s.at);
    const gaps = (xs: number[]): number[] => xs.slice(1).map((x, i) => x - xs[i]!);
    assert.ok(gaps(at('api.scryfall.com', '/cards/search')).every((g) => g >= 500));
    assert.ok(gaps(at('api.scryfall.com', '/sets')).every((g) => g >= 100));
    assert.deepEqual(gaps(at('cards.scryfall.io', '')), [0, 0]);
    for (const s of seen) {
      assert.equal(s.headers['User-Agent'], 'mtg-table-test/1');
      assert.ok(typeof s.headers['Accept'] === 'string' && s.headers['Accept'] !== '');
      if (s.url.includes('api.scryfall.com')) assert.equal(s.headers['Accept'], 'application/json');
    }
    const stats = rateStats(client.log);
    assert.equal(stats.find((s) => s.bucket === 'search')?.maxInAnySecond, 2);
    assert.ok((stats.find((s) => s.bucket === 'search')?.minGapMs ?? 0) >= 500);
  });

  test('concurrent callers cannot share a slot', async () => {
    const clock = new VirtualClock();
    const seen: Seen[] = [];
    const client = new ScryfallClient({
      userAgent: 't',
      fetch: fakeFetch(clock, [() => json({})], seen),
      now: clock.now,
      sleep: clock.sleep,
    });
    await clock.drive(
      Promise.all([
        client.request('https://api.scryfall.com/cards/named?exact=x'),
        client.request('https://api.scryfall.com/cards/named?exact=y'),
        client.request('https://api.scryfall.com/cards/named?exact=z'),
        client.request('https://api.scryfall.com/sets'),
      ]),
    );
    const named = seen.filter((s) => s.url.includes('/cards/named')).map((s) => s.at);
    assert.deepEqual(named, [0, 502, 1004], 'reserved in call order, 500 ms (+2 ms margin) apart');
    assert.deepEqual(seen.filter((s) => s.url.endsWith('/sets')).map((s) => s.at), [0], 'another bucket is not held up');
  });

  test("a 429's Retry-After closes the API, not the CDN, and the request is retried", async () => {
    const clock = new FakeClock();
    const seen: Seen[] = [];
    let first = true;
    const client = new ScryfallClient({
      userAgent: 't',
      fetch: fakeFetch(
        clock,
        [
          (url) => {
            if (url.pathname === '/sets' && first) {
              first = false;
              return new Response('slow down', { status: 429, headers: { 'retry-after': '5' } });
            }
            return json({ ok: true });
          },
        ],
        seen,
      ),
      now: clock.now,
      sleep: clock.sleep,
      log: () => undefined,
    });
    const response = await client.request('https://api.scryfall.com/sets');
    assert.equal(response.status, 200);
    const setsCalls = seen.filter((s) => s.url.endsWith('/sets')).map((s) => s.at);
    assert.equal(setsCalls.length, 2);
    assert.ok(setsCalls[1]! - setsCalls[0]! >= 5000, `retried after ${String(setsCalls[1]! - setsCalls[0]!)} ms`);
    assert.deepEqual(client.log.map((l) => l.status), [429, 200]);
  });

  test('Retry-After: seconds, an HTTP date, or the 30 s fallback', () => {
    assert.equal(retryAfterMs('5', 0), 5000);
    assert.equal(retryAfterMs(new Date(60_000).toUTCString(), 0), 60_000);
    assert.equal(retryAfterMs(null, 0), 30_000);
    assert.equal(retryAfterMs('soon', 0), 30_000);
  });

  test('errors carry Scryfall’s own type (ambiguous vs not found)', async () => {
    const clock = new FakeClock();
    const client = new ScryfallClient({
      userAgent: 't',
      fetch: fakeFetch(clock, [() => json({ object: 'error', type: 'ambiguous', details: 'Too many cards match' }, 404)], []),
      now: clock.now,
      sleep: clock.sleep,
    });
    await assert.rejects(client.json('https://api.scryfall.com/cards/named?fuzzy=agent'), (error: unknown) => {
      assert.ok(error instanceof ScryfallError);
      assert.equal(error.status, 404);
      assert.equal(error.type, 'ambiguous');
      return true;
    });
  });

  test('a client without a User-Agent refuses to exist', () => {
    assert.throws(() => new ScryfallClient({ userAgent: '  ' }));
  });

  test("a placeholder contact in the User-Agent is warned about on every run — config.json's is one today", () => {
    assert.match(userAgentWarning('mtg-table/0.1 (local hobby client; github.com/<user>/mtg-table)') ?? '', /placeholder contact/);
    assert.equal(userAgentWarning('mtg-table/0.1 (local hobby client; https://example.org/contact)'), null);
    // The committed value: this assertion flips to `null` the day the user fills it in.
    const committed = userAgent(ROOT);
    assert.equal(userAgentWarning(committed) !== null, committed.includes('<user>'));
  });
});

// ---------------------------------------------------------------------------
// build.ts — fetch (against a fake Scryfall) and index
// ---------------------------------------------------------------------------

/** How the fake serves the bulk file: whole, cut short, or failing mid-stream. */
type BulkMode = 'whole' | 'short' | 'broken';

function bulkResponse(gz: Buffer, mode: BulkMode): Response {
  const headers = { 'content-type': 'application/gzip' };
  if (mode === 'whole') return new Response(new Uint8Array(gz), { status: 200, headers });
  if (mode === 'short') return new Response(new Uint8Array(gz.subarray(0, Math.floor(gz.length / 2))), { status: 200, headers });
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(gz.subarray(0, 1024)));
      controller.error(new Error('connection reset'));
    },
  });
  return new Response(body, { status: 200, headers });
}

function fakeScryfall(clock: { t: number }, seen: Seen[], bulk: BulkMode = 'whole'): typeof fetch {
  const gz = gzipSync(readFileSync(resolve(FIXTURE, 'oracle-cards.slice.jsonl')));
  const bulkUri = 'https://data.scryfall.io/oracle-cards/oracle-cards-20260927210157.jsonl.gz';
  const sets = JSON.parse(readFileSync(resolve(FIXTURE, 'sets.slice.json'), 'utf8')) as unknown[];
  const pages = (code: string, rows: ScryCard[]): Route => (url) => {
    if (url.hostname !== 'api.scryfall.com' || url.pathname !== '/cards/search') return null;
    if (url.searchParams.get('q') !== `e:${code}`) return null;
    // Two pages, the second one reached only through next_page.
    const page = Number(url.searchParams.get('page') ?? '1');
    const half = Math.ceil(rows.length / 2);
    const data = page === 1 ? rows.slice(0, half) : rows.slice(half);
    const next = new URL(url.href);
    next.searchParams.set('page', '2');
    return json({ object: 'list', total_cards: rows.length, has_more: page === 1, ...(page === 1 ? { next_page: next.href } : {}), data });
  };
  return fakeFetch(
    clock,
    [
      (url) =>
        url.href === 'https://api.scryfall.com/bulk-data'
          ? json({
              object: 'list',
              data: [
                { object: 'bulk_data', type: 'oracle_cards', updated_at: '2026-09-27T21:01:57.440+00:00', jsonl_download_uri: bulkUri, compressed_size: gz.length },
              ],
            })
          : null,
      (url) => (url.href === bulkUri ? bulkResponse(gz, bulk) : null),
      (url) => (url.href === 'https://api.scryfall.com/sets' ? json({ object: 'list', has_more: false, data: sets }) : null),
      (url) => (url.hostname === 'svgs.scryfall.io' ? new Response('<svg/>', { status: 200, headers: { 'content-type': 'image/svg+xml' } }) : null),
      pages('msh', MSH),
      pages('msc', MSC),
    ],
    seen,
  );
}

describe('build: fetch then index, idempotently', () => {
  const dir = join(TMP, 'fetch', 'var', 'cards');
  const db = join(dir, 'cards.sqlite');
  const quiet = (): void => undefined;

  test('phase 1 fetches the bulk file, the sets and every page of both syncs, all paced', async () => {
    const clock = new FakeClock();
    const seen: Seen[] = [];
    const client = new ScryfallClient({ userAgent: 't', fetch: fakeScryfall(clock, seen), now: clock.now, sleep: clock.sleep });
    const manifestPath = await fetchSources({ client, dir, sets: ['msh', 'msc'], say: quiet, now: () => '2026-09-27T00:00:00Z' });
    const manifest = await readManifest(manifestPath);
    assert.equal(manifest.oracle.updated_at, '2026-09-27T21:01:57.440+00:00');
    assert.deepEqual(manifest.prints.map((p) => [p.code, p.pages, p.total_cards]), [
      ['msh', 2, MSH.length],
      ['msc', 2, MSC.length],
    ]);
    assert.equal(readFileSync(resolve(dir, 'sync', 'prints-msh.jsonl'), 'utf8').trim().split('\n').length, MSH.length);
    const searches = seen.filter((s) => s.url.includes('/cards/search')).map((s) => s.at);
    assert.equal(searches.length, 4);
    assert.ok(searches.slice(1).every((t, i) => t - searches[i]! >= 500));

    // Second run: same updated_at, same file on disk → the bulk file is not downloaded again.
    const again: Seen[] = [];
    const client2 = new ScryfallClient({ userAgent: 't', fetch: fakeScryfall(clock, again), now: clock.now, sleep: clock.sleep });
    await fetchSources({ client: client2, dir, sets: ['msh', 'msc'], say: quiet, now: () => '2026-09-27T00:00:00Z' });
    assert.equal(again.filter((s) => s.url.includes('data.scryfall.io')).length, 0);
    assert.equal(again.filter((s) => s.url.endsWith('/bulk-data')).length, 1);
  });

  test('phase 2 indexes the gzipped download; a rebuild has the same content digest', async () => {
    const manifestPath = resolve(dir, 'sync', 'manifest.json');
    const first = await indexFromManifest(manifestPath, db, () => undefined, '2026-09-27T01:00:00Z');
    assert.equal(first.oracleRows, ORACLE.length);
    assert.deepEqual(first.printsBySet, { msh: MSH.length, msc: MSC.length });
    assert.equal(first.ftsRows, ORACLE.length);
    const second = await indexFromManifest(manifestPath, db, () => undefined, '2026-09-27T02:00:00Z');
    assert.equal(second.contentSha256, first.contentSha256);
    assert.equal(contentDigest(db), first.contentSha256);
    // …and the same digest as indexing the committed plain-JSONL fixture: gzip is transparent.
    const plain = await indexFromManifest(MANIFEST, join(TMP, 'plain.sqlite'), () => undefined);
    assert.equal(plain.contentSha256, first.contentSha256);
    const lib = new CardLibrary(db, { imagesDir: join(TMP, 'images') });
    const meta = lib.meta();
    lib.close();
    assert.equal(meta['oracle_bulk_updated_at'], '2026-09-27T21:01:57.440+00:00');
    assert.equal(meta['built_at'], '2026-09-27T02:00:00Z');
    assert.equal(meta['schema_version'], '1');
    assert.equal(meta['content_sha256'], first.contentSha256);
  });

  test('a short or broken bulk download leaves nothing behind — no file at the real name, no .part', async () => {
    const bulkDir = join(TMP, 'short', 'var', 'cards', 'bulk');
    for (const mode of ['short', 'broken'] as const) {
      const clock = new FakeClock();
      const client = new ScryfallClient({ userAgent: 't', fetch: fakeScryfall(clock, [], mode), now: clock.now, sleep: clock.sleep });
      await assert.rejects(
        fetchSources({ client, dir: join(TMP, 'short', 'var', 'cards'), sets: [], say: quiet }),
        mode === 'short' ? /expected \d+ B/ : /connection reset/,
      );
      assert.deepEqual(readdirSync(bulkDir), [], `${mode}: the bulk directory must be empty`);
    }
    // A `.part` a dead run left behind is swept by the next good fetch; a live one is not.
    writeFileSync(join(bulkDir, 'oracle-cards-20260101000000.jsonl.gz.999999999.part'), 'x');
    writeFileSync(join(bulkDir, `oracle-cards-20260101000000.jsonl.gz.${String(process.pid)}.part`), 'x');
    const clock = new FakeClock();
    const client = new ScryfallClient({ userAgent: 't', fetch: fakeScryfall(clock, []), now: clock.now, sleep: clock.sleep });
    await fetchSources({ client, dir: join(TMP, 'short', 'var', 'cards'), sets: [], say: quiet });
    assert.deepEqual(readdirSync(bulkDir).sort(), [
      'oracle-cards-20260927210157.jsonl.gz',
      `oracle-cards-20260101000000.jsonl.gz.${String(process.pid)}.part`,
    ].sort());
  });

  test('a failed build leaves the previous index untouched', async () => {
    const before = statSync(db).mtimeMs;
    const broken = join(TMP, 'broken.json');
    writeFileSync(broken, JSON.stringify({ oracle: { file: 'nope.jsonl' }, sets: null, prints: [] }));
    await assert.rejects(indexFromManifest(broken, db, () => undefined));
    assert.equal(statSync(db).mtimeMs, before);
    assert.equal(contentDigest(db).length, 64);
  });
});

// ---------------------------------------------------------------------------
// query.ts — over the fixture index
// ---------------------------------------------------------------------------

describe('query: the name and print ladders (report 03 §4.6)', () => {
  const dbPath = join(TMP, 'query.sqlite');
  const imagesDir = join(TMP, 'query-images');
  let lib: CardLibrary;
  before(async () => {
    await indexFromManifest(MANIFEST, dbPath, () => undefined);
    lib = openLibrary(dbPath, { imagesDir });
  });
  after(() => lib.close());

  test("getByName('Peggy Carter, Secret Agent') is MSC #523 — and with set msh, widens to the family", () => {
    const peggy = lib.getByName('Peggy Carter, Secret Agent');
    assert.ok(peggy !== null);
    assert.equal(peggy.match, 'exact');
    assert.deepEqual([peggy.print?.set, peggy.print?.collectorNumber, peggy.printVia], ['msc', '523', 'synced']);
    assert.equal(peggy.print?.artist, 'Michael MacRae');
    assert.equal(peggy.manaCost, '{1}{W}');
    assert.equal(peggy.legalities['standard'], undefined, 'not legal in standard');
    const viaMsh = lib.getByName('Peggy Carter, Secret Agent', { set: 'msh' });
    assert.deepEqual([viaMsh?.print?.set, viaMsh?.print?.collectorNumber, viaMsh?.printVia], ['msc', '523', 'family']);
  });

  test('exact → normalized → face → fuzzy, each labelled', () => {
    assert.equal(lib.getByName('peggy carter, secret agent')?.match, 'exact');
    assert.deepEqual([lib.getByName('shield helicarrier')?.match, lib.getByName('shield helicarrier')?.print?.collectorNumber], ['normalized', '249']);
    const delver = lib.getByName('Delver of Secrets');
    assert.deepEqual([delver?.match, delver?.name], ['face', 'Delver of Secrets // Insectile Aberration']);
    assert.equal(lib.getByName('Ice')?.name, 'Fire // Ice');
    assert.deepEqual([lib.getByName('peggy secret')?.match, lib.getByName('peggy secret')?.name], ['fuzzy', 'Peggy Carter, Secret Agent']);
    assert.equal(lib.getByName('peggy secret', { fuzzy: false }), null);
    assert.equal(lib.getByName('zzzz qqqq'), null);
    assert.equal(lib.getByName('   '), null);
  });

  test('a card beats a theme card or token of the same name', () => {
    assert.equal(lib.getByName('Agents of S.H.I.E.L.D.')?.kind, 'card');
    assert.equal(lib.getByName('Pym Particles')?.typeLine, 'Sorcery');
  });

  test('getBySetNumber is the exact print; #402 is the extended art, not the plain printing', () => {
    const plain = lib.getBySetNumber('MSH', '4');
    const extended = lib.getBySetNumber('msh', '402');
    assert.equal(plain?.name, 'Agent Phil Coulson');
    assert.equal(extended?.name, 'Agent Phil Coulson');
    assert.equal(plain?.print?.isMain, true);
    assert.equal(extended?.print?.isMain, false);
    assert.ok(extended?.print?.frameEffects.includes('extendedart'));
    assert.equal(lib.getBySetNumber('msh', '99999'), null);
    assert.equal(lib.getById(plain?.print?.id ?? '')?.print?.collectorNumber, '4');
  });

  test('Plains with no set is MSH’s (a synced set), not the bulk file’s Star Trek print', () => {
    const plains = lib.getByName('Plains');
    assert.deepEqual([plains?.print?.set, plains?.print?.collectorNumber, plains?.printVia], ['msh', '277', 'synced']);
    const bulkRep = ORACLE.find((c) => c.name === 'Plains');
    assert.notEqual(bulkRep?.set, 'msh', 'the fixture should show the bulk file picking another set');
  });

  test('pacho-shield.dck resolves 28/28 to the prints report 03 §2.5 lists', () => {
    const deck = lib.resolveDeckFile(resolve(ROOT, 'decks/pacho-shield.dck'));
    assert.equal(deck.cards, 40);
    assert.equal(deck.resolved, 28);
    const where = new Map(deck.entries.map((e) => [e.entry.name, `${e.card?.print?.set ?? '?'} ${e.card?.print?.collectorNumber ?? '?'}`]));
    const expected: Record<string, string> = {
      'Agent Phil Coulson': 'msh 4',
      'Peggy Carter, Secret Agent': 'msc 523',
      'Nick Fury, Spymaster': 'msc 603',
      'Strategic Intervention': 'msc 609',
      'Wasp, Shrinking Savior': 'msc 646',
      'Ant-Man, Reformed Rogue': 'msc 739',
      "Ant-Man's Air Force": 'msc 759',
      'Robotics Mastery': 'msc 786',
      'Quantum Reduction': 'msc 635',
      'Thriving Heath': 'msc 580',
      'Thriving Isle': 'msc 581',
      'S.H.I.E.L.D. Helicarrier': 'msh 249',
      'Giant-Sized Flying Ant': 'msh 56',
      Plains: 'msh 277',
      Island: 'msh 279',
    };
    for (const [name, print] of Object.entries(expected)) assert.equal(where.get(name), print, name);
  });

  test("Forge's art index and bracketed collector number choose the print; a typo is a suggestion, not a card", () => {
    const deck = lib.resolveDeck(
      parseDeck('[main]\n1 Plains|MSH|3\n1 Agent Phil Coulson|MSH|[402]\n1 Peggy Carter, Secret Agnet\n1 Peggy Carter, Secret Agent|MSH\n', 'x.dck'),
    );
    const [art3, bracket, typo, family] = deck.entries;
    assert.equal(art3?.card?.print?.collectorNumber, '287', 'main prints 277, 278, 287, 288 → the third');
    assert.equal(bracket?.card?.print?.collectorNumber, '402');
    assert.equal(typo?.card, null);
    assert.equal(typo?.suggestion?.name, 'Peggy Carter, Secret Agent');
    assert.deepEqual([family?.card?.print?.set, family?.card?.printVia], ['msc', 'family']);
    assert.equal(deck.unresolved, 1);
  });

  test("search('shrink') finds the deck's shrinker; search('ant-man') finds every Ant-Man", () => {
    const shrink = lib.search('shrink').map((h) => h.name);
    assert.ok(shrink.includes('Wasp, Shrinking Savior'), shrink.join(', '));
    assert.ok(!shrink.includes('Shrinking Plane'), 'a plane is an extra');
    assert.ok(lib.search('shrink', { includeExtras: true }).some((h) => h.name === 'Shrinking Plane'));
    const antMan = lib.search('ant-man').map((h) => h.name);
    const expected = [...new Set([...MSH, ...MSC].filter((c) => /Ant-Man/.test(c.name)).map((c) => c.name))];
    for (const name of expected) assert.ok(antMan.includes(name), `${name} missing from ${antMan.join(', ')}`);
    const wasp = lib.search('shrink').find((h) => h.name === 'Wasp, Shrinking Savior');
    assert.deepEqual([wasp?.print?.set, wasp?.print?.collectorNumber], ['msc', '646']);
  });

  test('filters: set, type, colour identity; and phrase matches rank first', () => {
    const inMsh = lib.search('ant-man', { set: 'msh' });
    assert.ok(inMsh.length > 0 && inMsh.every((h) => h.print?.set === 'msh'));
    assert.ok(lib.search('agent', { type: 'creature' }).every((h) => /creature/i.test(h.typeLine ?? '')));
    assert.ok(lib.search('hero', { colors: 'W' }).every((h) => h.colorIdentity.every((c) => c === 'W')));
    const alone = lib.search('attacks alone', { set: 'msc' }).map((h) => h.name);
    assert.ok(alone.indexOf('Peggy Carter, Secret Agent') >= 0 && alone.indexOf('Nick Fury, Spymaster') >= 0, alone.join(', '));
    assert.ok(lib.search('hero', { limit: 3 }).length <= 3);
    const page1 = lib.search('hero', { limit: 4 }).map((h) => h.oracleId);
    const page2 = lib.search('hero', { limit: 4, offset: 4 }).map((h) => h.oracleId);
    assert.equal(new Set([...page1, ...page2]).size, page1.length + page2.length, 'pages do not overlap');
  });

  test('FTS5 syntax in the box is just words', () => {
    for (const q of ['NEAR(', '"', '*', 'a:b', '-x', 'AND', '(((', "'"]) {
      assert.doesNotThrow(() => lib.search(q), q);
    }
    assert.deepEqual(lib.search(''), []);
    assert.ok(lib.search('', { set: 'msc' }).length > 0, 'an empty query with a set browses the set');
  });

  test('browseSet walks a set in collector-number order', () => {
    const msh = lib.browseSet('msh', { limit: 1000 });
    assert.equal(msh.length, MSH.length);
    const numbers = msh.map((h) => h.print?.collectorNumber ?? '');
    assert.deepEqual(numbers, [...numbers].sort((a, b) => cnSort(a) - cnSort(b) || a.localeCompare(b)));
    assert.deepEqual(lib.syncedSets().map((s) => s.code), ['msh', 'msc']);
  });

  test('images: a path per id + size + side; the URL is the one Scryfall sent; a back only for two sides', () => {
    const peggy = lib.getByName('Peggy Carter, Secret Agent')!;
    const target = lib.imageTarget(peggy.print!.id, 'normal');
    assert.equal(target?.path, join(imagesDir, peggy.print!.id, 'normal.jpg'));
    assert.equal(target?.url, byName(MSC, 'Peggy Carter, Secret Agent').image_uris?.normal);
    assert.equal(target?.mime, 'image/jpeg');
    assert.equal(lib.imageTarget(peggy.print!.id, 'grid')?.path, join(imagesDir, peggy.print!.id, 'grid.webp'));
    assert.equal(lib.imageTarget(peggy.print!.id, 'normal', 'back'), null);
    const dfc = MSH.find((c) => c.image_uris === undefined && (c.card_faces?.length ?? 0) > 1)!;
    const back = lib.imageTarget(dfc.id, 'normal', 'back');
    assert.equal(back?.path, join(imagesDir, dfc.id, 'normal.back.jpg'));
    assert.equal(back?.url, dfc.card_faces?.[1]?.image_uris?.normal);
    assert.equal(lib.imagePath(peggy.print!.id, 'normal'), null, 'nothing cached yet');
    mkdirSync(dirname(target!.path), { recursive: true });
    writeFileSync(target!.path, 'jpeg');
    assert.equal(lib.imagePath(peggy.print!.id, 'normal'), target!.path);
    assert.equal(lib.imageUrl(peggy.print!.id, 'normal'), target!.url);
  });

  test('an index that was never built is a typed error', () => {
    assert.throws(() => openLibrary(join(TMP, 'nope.sqlite')), LibraryMissingError);
  });
});

// ---------------------------------------------------------------------------
// store.ts — the image cache
// ---------------------------------------------------------------------------

describe('store: the image cache (report 03 §4.5)', () => {
  const dir = join(TMP, 'store');
  const id = '1f98293e-9d94-4185-8546-8beaf281dfa3';

  test('the path is keyed by id, size and side, and refuses anything that is not a Scryfall id', () => {
    assert.equal(imagePathFor(dir, id, 'normal'), join(dir, id, 'normal.jpg'));
    assert.equal(imagePathFor(dir, id, 'png', 'back'), join(dir, id, 'png.back.png'));
    assert.equal(imagePathFor(dir, id, 'display'), join(dir, id, 'display.webp'));
    assert.throws(() => imagePathFor(dir, '../../etc/passwd', 'normal'));
    assert.equal(cdnUrl(id, 'normal'), `https://cards.scryfall.io/normal/front/1/f/${id}.jpg`);
  });

  test('fetched once, into place by rename; concurrent requests share one fetch', async () => {
    const clock = new FakeClock();
    const seen: Seen[] = [];
    const body = Buffer.from('not really a jpeg, but bytes');
    const client = new ScryfallClient({
      userAgent: 't',
      fetch: fakeFetch(clock, [() => new Response(body, { status: 200, headers: { 'content-type': 'image/jpeg', 'content-length': String(body.length) } })], seen),
      now: clock.now,
      sleep: clock.sleep,
    });
    const path = imagePathFor(dir, id, 'normal');
    const url = cdnUrl(id, 'normal');
    const [a, b] = await Promise.all([downloadImage(client, url, path), downloadImage(client, url, path)]);
    assert.equal(seen.length, 1);
    assert.equal(a.fetched, true);
    assert.equal(b.bytes, body.length);
    const again = await downloadImage(client, url, path);
    assert.deepEqual([again.fetched, seen.length], [false, 1]);
    assert.deepEqual(readdirSync(dirname(path)), ['normal.jpg'], 'no .part left behind');
    assert.equal(seen[0]?.headers['User-Agent'], 't');
  });

  test('a short body or a non-image leaves nothing on disk', async () => {
    const clock = new FakeClock();
    const client = new ScryfallClient({
      userAgent: 't',
      fetch: fakeFetch(
        clock,
        [
          (url) =>
            url.pathname.includes('/small/')
              ? new Response('abc', { status: 200, headers: { 'content-type': 'image/jpeg', 'content-length': '999' } })
              : new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } }),
        ],
        [],
      ),
      now: clock.now,
      sleep: clock.sleep,
    });
    const short = imagePathFor(dir, id, 'small');
    await assert.rejects(downloadImage(client, cdnUrl(id, 'small'), short));
    const html = imagePathFor(dir, id, 'large');
    await assert.rejects(downloadImage(client, cdnUrl(id, 'large'), html));
    assert.equal(existsSync(short) || existsSync(html), false);
    assert.ok(readdirSync(dirname(short)).every((f) => !f.endsWith('.part')));
  });
});
