/*
 * mtg-table — web/test/cards-render.test.tsx
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The card browser, mounted** (`web/src/cards/CardBrowser.tsx`). Vitest,
 * because Node's type stripping does not transform JSX; `renderToStaticMarkup`
 * in the `node` environment, like every other render suite here.
 *
 *   - **Without an index the page is an honest empty state**: it says there is
 *     no library, prints the command that builds one and the path it writes, and
 *     draws no search box, no filters and no grid that could read as "no
 *     results". The status is the dev route's own answer for a missing index
 *     (`cards-api.test.ts` asserts the route half) and the route-missing status
 *     `api.ts` synthesises for a production build.
 *   - With results, every image tile carries its artist credit, a cached image
 *     is served same-origin and an uncached one from Scryfall's CDN, and a card
 *     with no image at all is a text frame, never a broken `<img>`.
 *   - The detail panel draws the cost as `mana-font` pips, the rules text with
 *     `{T}` as a pip, the stats, set and collector number, the copyright line,
 *     the deck count and the `.dck` line — and *View in 3D*, the workshop's deep
 *     link, live or greyed with its reason.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';

import { routeMissingStatus } from '../src/cards/api.ts';
import { CardBrowser, EmptyState } from '../src/cards/CardBrowser.tsx';
import { CardDetail } from '../src/cards/CardDetail.tsx';
import { CardView } from '../src/cards/CardView.tsx';
import { buildDeckIndex, parseDck } from '../src/cards/decks.ts';
import type { LibraryCard, LibraryStatus } from '../src/cards/model.ts';
import { EMPTY_FILTERS } from '../src/cards/search.ts';

const NO_INDEX: LibraryStatus = {
  ready: false,
  message: 'There is no card index at var/cards/cards.sqlite.',
  buildCommand: 'node tools/card-library/build.ts',
  dbPath: 'var/cards/cards.sqlite',
  counts: null,
  builtAt: null,
  sets: [],
};

const READY: LibraryStatus = {
  ready: true,
  message: '172 cards, 256 prints.',
  buildCommand: 'node tools/card-library/build.ts',
  dbPath: 'var/cards/cards.sqlite',
  counts: { cards: 172, prints: 256 },
  builtAt: '2026-09-27T00:00:00.000Z',
  sets: ['msh', 'msc'],
};

function card(over: Partial<LibraryCard> & Pick<LibraryCard, 'id' | 'name'>): LibraryCard {
  return {
    oracleId: null,
    set: 'msh',
    setName: 'Marvel Super Heroes',
    collectorNumber: '1',
    rarity: 'common',
    manaCost: null,
    cmc: 0,
    typeLine: '',
    oracleText: '',
    flavorText: null,
    colors: [],
    colorIdentity: [],
    power: null,
    toughness: null,
    loyalty: null,
    defense: null,
    keywords: [],
    layout: 'normal',
    artist: null,
    releasedAt: '2026-06-26',
    legalities: {},
    faces: [],
    imageStatus: 'highres_scan',
    imageRemote: null,
    imageRemoteBack: null,
    imageLocal: null,
    imageLocalBack: null,
    scryfallUri: null,
    ...over,
  };
}

const PEGGY = card({
  id: '1f98293e-9d94-4185-8546-8beaf281dfa3',
  name: 'Peggy Carter, Secret Agent',
  set: 'msc',
  setName: 'Marvel Super Heroes Commander',
  collectorNumber: '523',
  rarity: 'uncommon',
  manaCost: '{1}{W}',
  typeLine: 'Legendary Creature — Human Spy Hero',
  oracleText:
    'Whenever a creature you control attacks alone, it gains indestructible until end of turn. (Damage and effects that say "destroy" don\'t destroy it.)',
  colors: ['W'],
  power: '2',
  toughness: '1',
  artist: 'Michael MacRae',
  legalities: { commander: 'legal', vintage: 'legal' },
  imageRemote: 'https://cards.scryfall.io/normal/front/1/f/1f98293e-9d94-4185-8546-8beaf281dfa3.jpg?1783903106',
  imageLocal: '/cards/img/1f98293e-9d94-4185-8546-8beaf281dfa3/normal',
});

const COULSON = card({
  id: '1383e587-df58-4b45-9067-b9399e90b9ed',
  name: 'Agent Phil Coulson',
  collectorNumber: '4',
  rarity: 'rare',
  manaCost: '{1}{W}',
  typeLine: 'Legendary Creature — Human Spy Hero',
  oracleText: 'Vigilance\n{T}: Put a +1/+1 counter on each other Hero you control.',
  colors: ['W'],
  power: '2',
  toughness: '2',
  artist: 'Marc Aspinall',
  imageRemote: 'https://cards.scryfall.io/normal/front/1/3/1383e587-df58-4b45-9067-b9399e90b9ed.jpg',
});

const NO_ART = card({ id: 'x-no-art', name: 'Imaginary Card', typeLine: 'Artifact', imageStatus: 'missing' });

test('no index: the page says so, prints the build command and the path, and draws no search at all', () => {
  const html = renderToStaticMarkup(<CardBrowser initialStatus={NO_INDEX} />);
  expect(html).toContain('No card library yet');
  expect(html).toContain('There is no card index at var/cards/cards.sqlite.');
  // Both commands: the build fetches no card image, and the images tool does.
  expect(html).toContain('<code>node tools/card-library/build.ts\nnode tools/card-library/images.ts --all-decks</code>');
  expect(html).toContain('it fetches no card image');
  expect(html).toContain('var/cards/cards.sqlite');
  expect(html).not.toContain('cardlib__search');
  expect(html).not.toContain('cardlib-grid');
  expect(html).not.toContain('<img');
  // The way back to the board is always there.
  expect(html).toContain('▤ board');
});

test('the back link returns to the renderer the page was opened from', () => {
  const fromArena = renderToStaticMarkup(<CardBrowser initialStatus={NO_INDEX} backTo="arena" />);
  expect(fromArena).toContain('href="#arena"');
  expect(fromArena).toContain('▣ arena');
  expect(fromArena).not.toContain('▤ board');
  const fromBoard = renderToStaticMarkup(<CardBrowser initialStatus={NO_INDEX} backTo="board" />);
  expect(fromBoard).toContain('▤ board');
});

test('no route (a production build): the same empty state, naming the dev server', () => {
  const html = renderToStaticMarkup(<EmptyState status={routeMissingStatus('/cards/api/status answered 404 text/html')} />);
  expect(html).toContain('No card library yet');
  expect(html).toContain('npm --prefix web run dev');
  expect(html).toContain('node tools/card-library/build.ts');
});

test('before the status arrives the page says it is checking — not "no results"', () => {
  const html = renderToStaticMarkup(<CardBrowser />);
  expect(html).toContain('checking the card library');
  expect(html).not.toContain('No card library yet');
  expect(html).not.toContain('No cards match');
});

test('results: a tile per card, each with its credit; cache first, Scryfall on a miss, a text frame with no art', () => {
  const html = renderToStaticMarkup(
    <CardBrowser
      initialStatus={READY}
      initialFilters={{ ...EMPTY_FILTERS, q: 'agent' }}
      initialResults={{ cards: [PEGGY, COULSON, NO_ART], total: 3, truncated: false }}
    />,
  );
  expect(html).toContain('cardlib__search');
  expect(html).toContain('value="agent"');
  expect(html.match(/class="cardlib-tile"/g)?.length).toBe(3);
  expect(html.match(/cardlib-card__credit/g)?.length).toBe(3);
  expect(html).toContain('Illus. Michael MacRae');
  expect(html).toContain('Illus. Marc Aspinall');
  expect(html).toContain('src="/cards/img/1f98293e-9d94-4185-8546-8beaf281dfa3/normal"');
  expect(html).toContain('data-source="cache"');
  expect(html).toContain('src="https://cards.scryfall.io/normal/front/1/3/1383e587');
  expect(html).toContain('data-source="scryfall"');
  expect(html.match(/<img/g)?.length).toBe(2);
  expect(html).toContain('cardlib-frame');
  expect(html).toContain('3 cards');
  expect(html).toContain('MSC #523 · Uncommon');
  // The key help is the table's own rows.
  for (const chord of ['/', 'Enter', 'Esc']) expect(html).toContain(`<kbd>${chord}</kbd>`);
});

test('a truncated search says how many it is not showing', () => {
  const html = renderToStaticMarkup(
    <CardBrowser
      initialStatus={READY}
      initialFilters={{ ...EMPTY_FILTERS, q: 'flying' }}
      initialResults={{ cards: [COULSON], total: 1000, truncated: true }}
    />,
  );
  expect(html).toContain('Showing 1 of 1,000 — narrow the search.');
  const capped = renderToStaticMarkup(
    <CardBrowser
      initialStatus={READY}
      initialFilters={{ ...EMPTY_FILTERS, q: 'flying' }}
      initialResults={{ cards: [COULSON], total: 1000, truncated: true, approximate: true }}
    />,
  );
  expect(capped).toContain('Showing 1 of 1,000+ — narrow the search.');
});

test('a search the scan cap stopped never says "No cards match." — not even with nothing in the part it read', () => {
  const html = renderToStaticMarkup(
    <CardBrowser
      initialStatus={READY}
      initialFilters={{ ...EMPTY_FILTERS, q: 'creature', sets: ['msh', 'msc'] }}
      initialResults={{ cards: [], total: 0, truncated: true, approximate: true }}
    />,
  );
  expect(html).not.toContain('No cards match');
  expect(html).toContain('Nothing matched in the part of the library this search read — narrow the search.');
  const exact = renderToStaticMarkup(
    <CardBrowser
      initialStatus={READY}
      initialFilters={{ ...EMPTY_FILTERS, q: 'zzzz' }}
      initialResults={{ cards: [], total: 0, truncated: false }}
    />,
  );
  expect(exact).toContain('No cards match.');
});

test('colour alone is not a search, and the page says so rather than "No cards match"', () => {
  const html = renderToStaticMarkup(
    <CardBrowser
      initialStatus={READY}
      initialFilters={{ ...EMPTY_FILTERS, colors: ['W'] }}
      initialResults={{ cards: [], total: 0, truncated: false, needsQuery: true }}
    />,
  );
  expect(html).toContain('Add a word, a set or a deck.');
  expect(html).not.toContain('No cards match');
});

test('detail: pips for the cost, rules text, stats, set, artist, copyright, deck count and the .dck line', () => {
  const pacho = parseDck('decks/pacho-shield.dck', '[main]\n1 Peggy Carter, Secret Agent\n7 Plains|MSH\n');
  const html = renderToStaticMarkup(<CardDetail card={PEGGY} decks={buildDeckIndex([pacho])} onClose={() => undefined} />);
  expect(html).toContain('ms ms-1 ms-cost ms-shadow');
  expect(html).toContain('ms ms-w ms-cost ms-shadow');
  expect(html).toContain('<span class="sr-only">{1}{W}</span>');
  expect(html).toContain('Legendary Creature — Human Spy Hero');
  expect(html).toContain('cardlib-reminder');
  expect(html).toContain('>2/1<');
  expect(html).toContain('Marvel Super Heroes Commander · MSC #523 · Uncommon');
  expect(html).toContain('Michael MacRae');
  expect(html).toContain('™ &amp; © 2026 Wizards of the Coast, LLC · MARVEL © 2026 MARVEL');
  expect(html).toContain('in decks/pacho-shield.dck ×1');
  expect(html).toContain('1 Peggy Carter, Secret Agent|MSC');
  expect(html).toContain('copy .dck line');
  expect(html).toContain('Commander');
  expect(html).toContain('not legal');
});

test('detail: {T} in rules text is the tap pip, and a card in no deck says so', () => {
  const html = renderToStaticMarkup(<CardDetail card={COULSON} decks={buildDeckIndex([])} onClose={() => undefined} />);
  expect(html).toContain('ms ms-tap ms-cost ms-shadow cardlib-pip cardlib-pip--inline');
  expect(html).toContain('in no deck under decks/');
  expect(html).toContain('1 Agent Phil Coulson|MSH');
});

test('detail: View in 3D opens the workshop on the exact name — live for a body or a card’s own cues, grey with the reason otherwise', () => {
  // A creature: its figure on the pedestal (D102, workshop/links.ts).
  const peggy = renderToStaticMarkup(<CardDetail card={PEGGY} decks={buildDeckIndex([])} onClose={() => undefined} />);
  expect(peggy).toContain('href="#workshop?card=Peggy+Carter%2C+Secret+Agent"');
  expect(peggy).toContain('⚒ View in 3D');
  expect(peggy).not.toContain('aria-disabled');
  // A spell with its own cues.json entry is live too.
  const strike = card({ id: 'x-strike', name: 'Helicarrier Strike', typeLine: 'Instant' });
  expect(renderToStaticMarkup(<CardDetail card={strike} decks={buildDeckIndex([])} onClose={() => undefined} />)).toContain(
    'href="#workshop?card=Helicarrier+Strike"',
  );
  // A card the workshop lists with nothing of its own to show, and one it does not
  // list: the button is there, greyed, and its tooltip says which.
  const opt = card({ id: 'x-opt', name: 'Opt', typeLine: 'Instant' });
  const optHtml = renderToStaticMarkup(<CardDetail card={opt} decks={buildDeckIndex([])} onClose={() => undefined} />);
  expect(optHtml).toContain('aria-disabled="true"');
  expect(optHtml).not.toContain('#workshop?card=');
  expect(optHtml).toContain('nothing of its own to show in 3D');
  const stranger = renderToStaticMarkup(<CardDetail card={NO_ART} decks={buildDeckIndex([])} onClose={() => undefined} />);
  expect(stranger).toContain('aria-disabled="true"');
  expect(stranger).toContain('Not in the workshop');
});

test('the back link returns to the workshop when the workshop’s card text link opened the browser', () => {
  const html = renderToStaticMarkup(<CardBrowser initialStatus={NO_INDEX} backTo="workshop" />);
  expect(html).toContain('href="#workshop"');
  expect(html).toContain('⚒ workshop');
  expect(html).not.toContain('▤ board');
});

test('CardView: the image is whole, sized by the card, and keeps its credit', () => {
  const html = renderToStaticMarkup(<CardView card={PEGGY} variant="detail" />);
  expect(html).toContain('width="488"');
  expect(html).toContain('height="680"');
  expect(html).toContain('alt="Peggy Carter, Secret Agent"');
  expect(html).toContain('Illus. Michael MacRae');
});

test('detail: a card with more than one print lists them, the open one pressed', () => {
  const extended = { ...COULSON, id: '258b663e-2fa0-4203-9f5f-f9963940c5b3', collectorNumber: '402' };
  const html = renderToStaticMarkup(
    <CardDetail
      card={extended}
      decks={buildDeckIndex([])}
      prints={[COULSON, extended]}
      onPickPrint={() => undefined}
      onClose={() => undefined}
    />,
  );
  expect(html).toContain('Prints (2)');
  expect(html).toMatch(/aria-pressed="false"[^>]*>MSH #4</);
  expect(html).toMatch(/aria-pressed="true"[^>]*>MSH #402</);
  // One print is no list at all.
  const single = renderToStaticMarkup(
    <CardDetail card={PEGGY} decks={buildDeckIndex([])} prints={[PEGGY]} onPickPrint={() => undefined} onClose={() => undefined} />,
  );
  expect(single).not.toContain('cardlib-prints');
});
