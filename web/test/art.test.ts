/*
 * mtg-table — web/test/art.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * `art.ts` is the read side of `tools/fetch-art.ts`, and it has exactly two
 * jobs it must never get wrong: it must not block the board when the file is
 * missing, and it must never hand art to a card whose identity is concealed —
 * an image is a name by another route.
 *
 * The fetch count matters too (amendment P20): `<StrictMode>` mounts every
 * component twice in development and the dev server sends `Cache-Control:
 * no-store`, so without the promise cache the browser really does download
 * `art.json` — and, in `main.tsx`, a 3.5 MB fixture — twice on every load.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { artFor, EMPTY_ART_INDEX, loadArtIndex, lookupArt, parseArtFile } from '../src/art.ts';
import type { AnyCard, Card } from '../src/protocol.ts';

const SAMPLE = {
  generatedAt: '2026-09-11T00:00:00Z',
  cards: {
    'Agent Phil Coulson': {
      front: 'https://cards.scryfall.io/normal/front/a/b/abc.jpg',
      back: null,
      artist: 'Some Artist',
      setCode: 'MSH',
      collectorNumber: '4',
      scryfallId: 'abc',
    },
  },
  misses: ['Nick Fury'],
};

function fullCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    name: 'Agent Phil Coulson',
    setCode: 'MSH',
    manaCost: '{1}{W}',
    types: 'Legendary Creature - Human Spy Hero',
    power: '2',
    toughness: '2',
    loyalty: null,
    damage: 0,
    counters: {},
    tapped: false,
    sick: false,
    attacking: false,
    blocking: false,
    faceDown: false,
    token: false,
    alt: null,
    attachedToId: null,
    attachmentIds: [],
    controller: 0,
    owner: 0,
    zone: 'battlefield',
    abilities: [],
    ...overrides,
  };
}

test('parseArtFile reads the generated layout, names and misses', () => {
  const index = parseArtFile(SAMPLE);
  assert.equal(index.generatedAt, '2026-09-11T00:00:00Z');
  assert.equal(lookupArt(index, 'Agent Phil Coulson')?.setCode, 'MSH');
  // Case drift between Forge's name and Scryfall's must not cost a lookup.
  assert.equal(lookupArt(index, 'agent phil coulson')?.setCode, 'MSH');
  assert.deepEqual(index.misses, ['Nick Fury']);
});

test('a concealed card is never given art — an image is a name by another route', () => {
  const index = parseArtFile(SAMPLE);
  const stub: AnyCard = { id: 9, zone: 'hand', owner: 1, controller: 1, hidden: true };
  assert.deepEqual(artFor(index, stub), { kind: 'text', reason: 'hidden' });

  // A face-down card the viewer MAY flip is not concealed — but its `name` is
  // "" (Forge's face-down characteristic), so the lookup misses rather than
  // resolving to whatever `alt` says. The board draws a card back for it.
  const ownMorph = fullCard({
    id: 10,
    name: '',
    faceDown: true,
    alt: { name: 'Agent Phil Coulson', manaCost: '{1}{W}', types: 'Creature', power: '2', toughness: '2' },
  });
  assert.deepEqual(artFor(index, ownMorph), { kind: 'text', reason: 'no-art' });
});

test('a visible card resolves to its image, with the artist credit attached', () => {
  const art = artFor(parseArtFile(SAMPLE), fullCard());
  assert.equal(art.kind, 'image');
  if (art.kind !== 'image') return;
  assert.equal(art.url, 'https://cards.scryfall.io/normal/front/a/b/abc.jpg');
  // The Fan Content Policy and Scryfall's terms both require the credit to
  // travel with the image, so it is part of the value, not a UI afterthought.
  assert.equal(art.artist, 'Some Artist');
});

test('P20: art.json is fetched once per load, and a 404 is not an error', async () => {
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return new Response(JSON.stringify(SAMPLE), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const [a, b] = await Promise.all([
      loadArtIndex('/test-art-once.json'),
      loadArtIndex('/test-art-once.json'),
    ]);
    assert.equal(calls.length, 1, 'StrictMode double-mount must join one request, not start two');
    assert.equal(a, b, 'the second call should get the cached index');
    assert.equal(await loadArtIndex('/test-art-once.json'), a);
    assert.equal(calls.length, 1);

    // A missing file is the normal state of a fresh checkout: art.json is
    // gitignored and regenerated. It must resolve empty, never reject.
    globalThis.fetch = (async () => new Response('nope', { status: 404 })) as typeof fetch;
    const missing = await loadArtIndex('/test-art-missing.json');
    assert.deepEqual(missing.cards, EMPTY_ART_INDEX.cards);
    assert.deepEqual(missing.misses, []);
  } finally {
    globalThis.fetch = original;
  }
});
