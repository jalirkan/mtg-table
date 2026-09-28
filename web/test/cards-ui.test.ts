/*
 * mtg-table — web/test/cards-ui.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The card browser's logic, as pure functions** (`web/src/cards/`). The page
 * itself is thin over these, and `cards-render.test.tsx` mounts it; this file is
 * the part `node --test` can reach with no React, no SQLite and no network:
 *
 *   - the route: `#cards`, `#cards?q=…`, `?view=cards` all open the browser and
 *     nothing else does;
 *   - the search and the four filters, run over the committed fixture slice
 *     (`fixtures/cards/`) — text as AND-ed word prefixes, set, colour (any-of,
 *     with C and M), type as a whole word of the type line, in-deck by name;
 *   - one row per card without a set filter, every print with one;
 *   - the URL round-trip, so a search is a link;
 *   - the `.dck` parser, the deck index and the "copy .dck line" text;
 *   - rules text → words and pips, the stat line, legalities, the credit and
 *     copyright lines, and the image ladder (cache → Scryfall → text frame);
 *   - the keyboard table: `/`, the arrows over a grid, `Enter`, `Esc`.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildDeckIndex,
  dckLine,
  dckLineNote,
  FORGE_SET_CODES_CHECKED,
  deckUseLabel,
  deckUsesOf,
  forgeName,
  inDeck,
  parseDck,
} from '../src/cards/decks.ts';
import { CARDS_KEYMAP, cardsRowFor, moveIndex, planCardsKey, type CardsKeyContext } from '../src/cards/keys.ts';
import { toLibraryCard, toSearchResponse, toStatus, type LibraryCard } from '../src/cards/model.ts';
import {
  EMPTY_FILTERS,
  applyFilters,
  dedupeByOracle,
  filtersFromQuery,
  filtersToQuery,
  isBlank,
  matchesColors,
  matchesText,
  matchesType,
  rankCards,
  searchSlice,
  tokenize,
  type CardFilters,
} from '../src/cards/search.ts';
import {
  artistCredit,
  copyrightLine,
  costSymbols,
  imageSources,
  legalityRows,
  pipClass,
  printLabel,
  segmentParagraph,
  statLine,
} from '../src/cards/text.ts';
import { hashForView, viewFromLocation } from '../src/useView.ts';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(REPO + rel, 'utf8');
const files = (rel: string): string[] => readdirSync(REPO + rel).filter((f) => /\.tsx?$/.test(f));

// ---------------------------------------------------------------------------
// A card, by hand — the tests below that need one exact shape build it here
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// The route
// ---------------------------------------------------------------------------

test('route: #cards, #cards?q=…, #/cards and ?view=cards open the browser; nothing else does', () => {
  assert.equal(viewFromLocation('#cards', ''), 'cards');
  assert.equal(viewFromLocation('#cards?q=agent&set=msh', ''), 'cards');
  assert.equal(viewFromLocation('#/cards', ''), 'cards');
  assert.equal(viewFromLocation('', '?view=cards'), 'cards');
  assert.equal(viewFromLocation('', '?replay=games/g1.jsonl&view=cards'), 'cards');
  // The arena's spellings are untouched, and the hash still wins over the query.
  assert.equal(viewFromLocation('#arena', '?view=cards'), 'arena');
  assert.equal(viewFromLocation('#cards', '?view=arena'), 'cards');
  assert.equal(viewFromLocation('', '?view=arena'), 'arena');
  // A typo is the board, never a blank page.
  assert.equal(viewFromLocation('#card', ''), 'board');
  assert.equal(viewFromLocation('#cardsx', ''), 'board');
  assert.equal(viewFromLocation('', '?view=card'), 'board');
  assert.equal(hashForView('cards'), '#cards');
  assert.equal(hashForView('arena'), '#arena');
  assert.equal(hashForView('board'), '');
});

test('route: the browser is a lazy chunk — main.tsx imports it only through lazy()', () => {
  const main = read('web/src/main.tsx');
  assert.match(main, /lazy\(\(\) => import\('\.\/cards\/CardBrowser\.tsx'\)\)/);
  const staticImports = [...main.matchAll(/^import[^;]*from\s+'([^']+)'/gm)].map((m) => m[1]);
  assert.deepEqual(
    staticImports.filter((path) => path !== undefined && path.startsWith('./cards/')),
    [],
    'a static import of ./cards/ would put the browser in the 2D entry chunk',
  );
});

test('route: nothing under cards/ imports the board renderer CardTile, and nothing on the board imports cards/', () => {
  const dir = REPO + 'web/src/cards/';
  const listed = files('web/src/cards/');
  assert.ok(listed.length >= 10, `cards/ lists ${listed.join(', ')}`);
  for (const file of listed) {
    const source = readFileSync(dir + file, 'utf8');
    const imports = [...source.matchAll(/^import[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1] ?? '');
    assert.ok(
      imports.every((path) => !path.includes('CardTile')),
      `${file} must not import render/CardTile.tsx (its importer list is closed)`,
    );
    assert.doesNotMatch(source, /from '\.\.\/(render|arena)\//, `${file} must not import from render/ or arena/`);
    // D102: the workshop's one module the browser may reach is links.ts, which
    // imports the generated catalog and nothing that draws (workshop.test.ts).
    for (const path of imports.filter((p) => p.includes('workshop/'))) {
      assert.equal(path, '../workshop/links.ts', `${file} imports ${path} — the browser reaches the workshop only through links.ts`);
    }
    assert.doesNotMatch(source, /^import\s+['"][^'"]+\.css['"]/m, `${file} must not import CSS (styles.css holds every rule)`);
  }
  for (const board of ['render/Board.tsx', 'render/CardTile.tsx', 'arena/Arena.tsx']) {
    assert.doesNotMatch(read(`web/src/${board}`), /cards\//, `${board} must not reach into cards/`);
  }
});

test('route: devApi.ts is Node-only — vite.config.ts imports it and no browser module does', () => {
  const browser = [...files('web/src/cards/'), 'main.tsx'].filter((f) => !f.endsWith('devApi.ts'));
  for (const file of browser) {
    const path = file === 'main.tsx' ? 'web/src/main.tsx' : `web/src/cards/${file}`;
    const imports = [...read(path).matchAll(/^import[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1] ?? '');
    assert.ok(!imports.some((i) => i.includes('devApi')), `${path} imports the Node-only dev route`);
  }
  assert.match(read('web/vite.config.ts'), /from '\.\/src\/cards\/devApi\.ts'/);
  // …and the config mounts it in `configureServer` only: no preview, no build.
  const plugin = read('web/vite.config.ts').split('function cardsPlugin')[1]?.split('export default')[0] ?? '';
  assert.match(plugin, /configureServer/);
  assert.doesNotMatch(plugin, /configurePreviewServer/);
});

// ---------------------------------------------------------------------------
// Decks and the .dck line
// ---------------------------------------------------------------------------

const PACHO = parseDck('decks/pacho-shield.dck', read('decks/pacho-shield.dck'));

test('decks: pacho-shield.dck is 28 lines, 40 cards, ten without a set suffix', () => {
  assert.equal(PACHO.name, 'Pacho SHIELD (Marvel Super Heroes)');
  assert.equal(PACHO.lines.length, 28);
  assert.equal(
    PACHO.lines.reduce((n, l) => n + l.count, 0),
    40,
  );
  assert.equal(PACHO.lines.filter((l) => l.set === null).length, 10);
  assert.ok(PACHO.lines.every((l) => l.section === 'main'));
  const peggy = PACHO.lines.find((l) => l.name === 'Peggy Carter, Secret Agent');
  assert.deepEqual(peggy, { count: 1, name: 'Peggy Carter, Secret Agent', set: null, section: 'main' });
});

test('decks: the parser takes Forge request strings and never throws', () => {
  const deck = parseDck(
    'decks/x.dck',
    [
      '[Metadata]',
      'Name=Odd one',
      '[Main]',
      '4 Island|MSH|3',
      '1 Captain America, Super-Soldier|MSH|[316]',
      '2 Lightning Bolt+',
      '3x Opt',
      'not a card line',
      '[Sideboard]',
      '1 Fire // Ice',
    ].join('\r\n'),
  );
  assert.equal(deck.name, 'Odd one');
  assert.deepEqual(
    deck.lines.map((l) => [l.count, l.name, l.set, l.section]),
    [
      [4, 'Island', 'MSH', 'main'],
      [1, 'Captain America, Super-Soldier', 'MSH', 'main'],
      [2, 'Lightning Bolt', null, 'main'],
      [3, 'Opt', null, 'main'],
      [1, 'Fire // Ice', null, 'sideboard'],
    ],
  );
  assert.equal(parseDck('decks/empty.dck', '').lines.length, 0);
  assert.equal(parseDck('decks/empty.dck', '').name, 'empty');
});

test('decks: "in decks/x.dck ×N" by any name the card answers to, and the in-deck filter', () => {
  const probe = parseDck('decks/yield-probe.dck', read('decks/yield-probe.dck'));
  const index = buildDeckIndex([PACHO, probe]);
  const plains = card({ id: 'p', name: 'Plains', typeLine: 'Basic Land — Plains' });
  assert.deepEqual(deckUsesOf(index, plains).map(deckUseLabel), ['in decks/pacho-shield.dck ×7']);
  const forest = card({ id: 'f', name: 'Forest' });
  assert.deepEqual(deckUsesOf(index, forest).map(deckUseLabel), ['in decks/yield-probe.dck ×18']);
  // Case-insensitive, and a transform card is found by its front face (report 03 §3.4).
  const dfc = card({
    id: 'd',
    name: 'Peggy Carter, Secret Agent // Somebody Else',
    layout: 'transform',
    faces: [
      { name: 'Peggy Carter, Secret Agent', manaCost: null, typeLine: '', oracleText: '', flavorText: null, power: null, toughness: null, loyalty: null, defense: null, artist: null },
    ],
  });
  assert.deepEqual(deckUsesOf(index, dfc).map((u) => u.file), ['decks/pacho-shield.dck']);
  assert.equal(inDeck(index, plains, null), true);
  assert.equal(inDeck(index, plains, 'any'), true);
  assert.equal(inDeck(index, plains, 'decks/pacho-shield.dck'), true);
  assert.equal(inDeck(index, plains, 'decks/yield-probe.dck'), false);
  const stranger = card({ id: 's', name: 'Black Lotus' });
  assert.equal(inDeck(index, stranger, 'any'), false);
  assert.deepEqual(deckUsesOf(index, stranger), []);
  assert.equal(deckUseLabel({ file: 'decks/x.dck', section: 'sideboard', count: 2 }), 'in decks/x.dck ×2 (sideboard)');
});

test('decks: the copy line is `<n> <Forge name>|<SET>` — split cards whole, other faces by the front', () => {
  assert.equal(dckLine(card({ id: 'a', name: 'Agent Phil Coulson', set: 'msh' })), '1 Agent Phil Coulson|MSH');
  assert.equal(dckLine(card({ id: 'b', name: 'Peggy Carter, Secret Agent', set: 'msc' }), 2), '2 Peggy Carter, Secret Agent|MSC');
  assert.equal(forgeName({ name: 'Fire // Ice', layout: 'split' }), 'Fire // Ice');
  assert.equal(forgeName({ name: 'Delver of Secrets // Insectile Aberration', layout: 'transform' }), 'Delver of Secrets');
  assert.equal(forgeName({ name: 'Bonecrusher Giant // Stomp', layout: 'adventure' }), 'Bonecrusher Giant');
  assert.equal(dckLine(card({ id: 'c', name: 'X', set: '' }), 0), '1 X');
  // Only MSH and MSC's Scryfall codes are known to be Forge's: any other set gets
  // the bare name ("any print"), never a guessed |SET — and the page says why.
  assert.equal(dckLine(card({ id: 'd', name: 'Shrink', set: 'me2' })), '1 Shrink');
  assert.match(dckLineNote(card({ id: 'd', name: 'Shrink', set: 'me2' })) ?? '', /No \|ME2: .*MSH and MSC/);
  assert.equal(dckLineNote(card({ id: 'a', name: 'Agent Phil Coulson', set: 'msh' })), null);
  assert.deepEqual([...FORGE_SET_CODES_CHECKED].sort(), ['msc', 'msh']);
  // The line parses back to the same card.
  const back = parseDck('decks/t.dck', `[main]\n${dckLine(card({ id: 'a', name: 'Agent Phil Coulson', set: 'msh' }), 3)}\n`);
  assert.deepEqual(back.lines[0], { count: 3, name: 'Agent Phil Coulson', set: 'MSH', section: 'main' });
});

// ---------------------------------------------------------------------------
// Text, pips, stats, legalities, credit
// ---------------------------------------------------------------------------

test('text: mana symbols become mana-font classes — {T} is ms-tap, hybrids and Phyrexian fold', () => {
  assert.deepEqual(costSymbols('{1}{W}'), ['1', 'W']);
  assert.deepEqual(costSymbols(null), []);
  assert.deepEqual(costSymbols('no braces'), []);
  assert.equal(pipClass('W'), 'ms-w');
  assert.equal(pipClass('1'), 'ms-1');
  assert.equal(pipClass('T'), 'ms-tap');
  assert.equal(pipClass('Q'), 'ms-untap');
  assert.equal(pipClass('W/U'), 'ms-wu');
  assert.equal(pipClass('2/W'), 'ms-2w');
  assert.equal(pipClass('W/P'), 'ms-wp');
  assert.equal(pipClass('X'), 'ms-x');
  assert.equal(pipClass('∞'), 'ms-infinity');
  assert.equal(pipClass('***'), '');
  // Every class this produces for the deck's symbols exists in the shipped font CSS.
  const css = read('web/src/mana.css');
  for (const symbol of ['W', 'U', 'B', 'R', 'G', 'C', 'X', 'T', 'Q', '1', '2', '3', '4', '5', '6', 'W/U', '2/W', 'W/P', 'E', 'S']) {
    const cls = pipClass(symbol);
    assert.ok(css.includes(`.${cls}::before`) || css.includes(`.${cls}:before`), `${symbol} → ${cls} is not in mana.css`);
  }
});

test('text: rules text splits into words and symbols, reminder text marked', () => {
  const segments = segmentParagraph('{T}: Put a +1/+1 counter on each other Hero you control.');
  assert.deepEqual(segments, [
    { kind: 'symbol', symbol: 'T', reminder: false },
    { kind: 'text', text: ': Put a +1/+1 counter on each other Hero you control.', reminder: false },
  ]);
  const reminder = segmentParagraph('Crew 6 (Tap any number of creatures you control with total power 6 or more: {T}.)');
  assert.deepEqual(
    reminder.map((s) => [s.kind, s.reminder]),
    [
      ['text', false],
      ['text', true],
      ['symbol', true],
      ['text', true],
    ],
  );
  assert.equal(reminder[0]?.kind === 'text' ? reminder[0].text : '', 'Crew 6 ');
  // An unmatched brace is text, not a symbol.
  assert.deepEqual(segmentParagraph('a { b'), [{ kind: 'text', text: 'a { b', reminder: false }]);
});

test('text: stat line, print label, legalities order, credit and copyright', () => {
  assert.equal(statLine({ power: '2', toughness: '1', loyalty: null, defense: null }), '2/1');
  assert.equal(statLine({ power: '*', toughness: '1+*', loyalty: null, defense: null }), '*/1+*');
  assert.equal(statLine({ power: null, toughness: null, loyalty: '3', defense: null }), 'Loyalty 3');
  assert.equal(statLine({ power: null, toughness: null, loyalty: null, defense: '5' }), 'Defense 5');
  assert.equal(statLine({ power: null, toughness: null, loyalty: null, defense: null }), null);

  assert.equal(printLabel({ set: 'msc', collectorNumber: '523', rarity: 'uncommon' }), 'MSC #523 · Uncommon');
  // The common formats always, a missing one `not_legal`; the rest A–Z after them.
  const rows = legalityRows({ vintage: 'legal', zzz: 'restricted', commander: 'legal', alchemy: 'banned' });
  assert.deepEqual(rows.map((r) => r.format), [
    'standard', 'pioneer', 'modern', 'legacy', 'vintage', 'commander', 'pauper', 'brawl', 'historic', 'timeless',
    'alchemy', 'zzz',
  ]);
  assert.equal(rows.find((r) => r.format === 'standard')?.status, 'not_legal');
  assert.equal(rows.find((r) => r.format === 'vintage')?.status, 'legal');
  assert.equal(rows.find((r) => r.format === 'alchemy')?.status, 'banned');

  assert.equal(artistCredit({ artist: 'Marc Aspinall', faces: [] }), 'Illus. Marc Aspinall');
  assert.equal(artistCredit({ artist: null, faces: [] }), 'Illus. unknown');
  assert.match(copyrightLine({ set: 'msh', releasedAt: '2026-06-26' }), /^™ & © 2026 Wizards of the Coast, LLC · MARVEL © 2026 MARVEL$/);
  assert.equal(copyrightLine({ set: 'lea', releasedAt: null }), '™ & © Wizards of the Coast, LLC');
});

test('text: the image ladder is cache, then Scryfall, then the text frame', () => {
  const both = { imageLocal: '/cards/img/x/normal', imageRemote: 'https://cards.scryfall.io/normal/front/x/x/x.jpg', imageLocalBack: null, imageRemoteBack: null };
  assert.deepEqual(imageSources(both), { primary: '/cards/img/x/normal', fallback: 'https://cards.scryfall.io/normal/front/x/x/x.jpg' });
  assert.deepEqual(imageSources({ ...both, imageLocal: null }), { primary: both.imageRemote, fallback: null });
  assert.deepEqual(imageSources({ ...both, imageLocal: null, imageRemote: null }), { primary: null, fallback: null });
  assert.deepEqual(imageSources(both, 'back'), { primary: null, fallback: null });
});

// ---------------------------------------------------------------------------
// The wire readers
// ---------------------------------------------------------------------------

test('model: the readers are total — junk in, nothing thrown, nothing invented', () => {
  assert.equal(toLibraryCard(null), null);
  assert.equal(toLibraryCard({ id: 'x' }), null);
  const c = toLibraryCard({ id: 'x', name: 'Y', set: 'MSH', colors: ['W', 7], legalities: { standard: 'legal', bad: 1 } });
  assert.ok(c !== null);
  assert.equal(c.set, 'msh');
  assert.deepEqual(c.colors, ['W']);
  assert.deepEqual(c.legalities, { standard: 'legal' });
  assert.equal(c.manaCost, null);
  assert.deepEqual(toSearchResponse('nope'), { cards: [], total: 0, truncated: false });
  assert.deepEqual(toSearchResponse({ cards: [{ id: 'a', name: 'A' }], total: 5 }).truncated, true);
  assert.equal(toSearchResponse({ cards: [], total: 1000, approximate: true }).approximate, true);
  assert.equal(toSearchResponse({ cards: [], total: 0, needsQuery: true }).needsQuery, true);
  assert.equal(toSearchResponse({ cards: [], total: 0 }).needsQuery, undefined);
  assert.equal(toStatus({}), null);
  const status = toStatus({ ready: false, message: 'm', buildCommand: 'node tools/card-library/build.ts' });
  assert.equal(status?.ready, false);
  assert.equal(status?.dbPath, 'var/cards/cards.sqlite');
});

// ---------------------------------------------------------------------------
// Search and filters — the rules
// ---------------------------------------------------------------------------

test('search: tokenize folds case, accents and the periods of S.H.I.E.L.D.', () => {
  assert.deepEqual(tokenize('S.H.I.E.L.D. Helicarrier'), ['shield', 'helicarrier']);
  assert.deepEqual(tokenize("Ant-Man's Air Force"), ['ant', 'mans', 'air', 'force']);
  assert.deepEqual(tokenize('Lim-Dûl the Necromancer'), ['lim', 'dul', 'the', 'necromancer']);
  assert.deepEqual(tokenize('  '), []);
});

test('search: text is AND-ed word prefixes over name, type line and rules text', () => {
  const coulson = card({
    id: '1',
    name: 'Agent Phil Coulson',
    typeLine: 'Legendary Creature — Human Spy Hero',
    oracleText: 'Vigilance\n{T}: Put a +1/+1 counter on each other Hero you control.',
  });
  assert.equal(matchesText(coulson, ''), true);
  assert.equal(matchesText(coulson, 'agent'), true);
  assert.equal(matchesText(coulson, 'AG'), true);
  assert.equal(matchesText(coulson, 'coul agent'), true);
  assert.equal(matchesText(coulson, 'spy'), true);
  assert.equal(matchesText(coulson, 'vigil'), true);
  assert.equal(matchesText(coulson, 'agent flying'), false);
  assert.equal(matchesText(coulson, 'gent'), false, 'prefix, not substring');
});

test('search: colour is any-of, C is colourless and M is two or more', () => {
  const w = card({ id: 'w', name: 'W', colors: ['W'] });
  const wu = card({ id: 'wu', name: 'WU', colors: ['W', 'U'] });
  const land = card({ id: 'l', name: 'L', colors: [] });
  assert.equal(matchesColors(w, []), true);
  assert.equal(matchesColors(w, ['W']), true);
  assert.equal(matchesColors(w, ['U']), false);
  assert.equal(matchesColors(wu, ['U', 'R']), true);
  assert.equal(matchesColors(land, ['C']), true);
  assert.equal(matchesColors(w, ['C']), false);
  assert.equal(matchesColors(wu, ['M']), true);
  assert.equal(matchesColors(w, ['M']), false);
});

test('search: type is a whole word of any face\'s type line', () => {
  const vehicle = card({ id: 'v', name: 'V', typeLine: 'Artifact — Vehicle' });
  const artCreature = card({ id: 'a', name: 'A', typeLine: 'Artifact Creature — Robot Villain' });
  assert.equal(matchesType(vehicle, 'artifact'), true);
  assert.equal(matchesType(vehicle, 'creature'), false);
  assert.equal(matchesType(artCreature, 'creature'), true);
  assert.equal(matchesType(artCreature, null), true);
  assert.equal(matchesType(card({ id: 'x', name: 'X', typeLine: 'Enchantment Creature' }), 'enchant'), false);
});

test('search: one row per oracle card without a set filter, preferring the deck\'s sets and a cached image', () => {
  const trk = card({ id: 't', name: 'Plains', oracleId: 'o-plains', set: 'trk', collectorNumber: '317' });
  const msh = card({ id: 'm', name: 'Plains', oracleId: 'o-plains', set: 'msh', collectorNumber: '287' });
  const mshCached = card({ id: 'mc', name: 'Plains', oracleId: 'o-plains', set: 'msh', collectorNumber: '288', imageLocal: '/cards/img/mc/normal' });
  assert.deepEqual(dedupeByOracle([trk, msh]).map((c) => c.id), ['m']);
  assert.deepEqual(dedupeByOracle([trk, msh, mshCached]).map((c) => c.id), ['mc']);
  // No oracle id: the name is the key.
  const a = card({ id: 'a1', name: 'A' });
  const b = card({ id: 'a2', name: 'a' });
  assert.equal(dedupeByOracle([a, b]).length, 1);
});

test('search: ranking puts name hits first (A–Z), keeps the index order after them, and moves nothing without a query', () => {
  const byText = card({ id: '1', name: 'Borough Backup', oracleText: 'an agent of chaos' });
  const prefix = card({ id: '2', name: 'Agents of S.H.I.E.L.D.' });
  const exact = card({ id: '3', name: 'Agent' });
  const words = card({ id: '4', name: 'Quake, Agent of S.H.I.E.L.D.' });
  const byText2 = card({ id: '5', name: 'Aardvark', oracleText: 'agent' });
  assert.deepEqual(rankCards([byText, words, byText2, prefix, exact], 'agent').map((c) => c.id), ['3', '2', '4', '1', '5']);
  // No query: a set's collector order and a deck's file order survive.
  assert.deepEqual(rankCards([words, byText], '').map((c) => c.id), ['4', '1']);
  assert.deepEqual(rankCards([words, byText], '  ').map((c) => c.id), ['4', '1']);
});

test('search: the URL round-trips, drops what is empty and ignores junk', () => {
  const filters: CardFilters = { q: 'agent of', sets: ['msh', 'msc'], colors: ['W', 'C'], type: 'creature', deck: 'decks/pacho-shield.dck' };
  const query = filtersToQuery(filters);
  assert.deepEqual(filtersFromQuery(query), filters);
  assert.deepEqual(filtersFromQuery(`?${query}`), filters);
  assert.equal(filtersToQuery(EMPTY_FILTERS), '');
  assert.equal(filtersToQuery(EMPTY_FILTERS, { open: 'abc', limit: null }), 'open=abc');
  assert.deepEqual(filtersFromQuery('color=w,z,,M&type=&deck='), { ...EMPTY_FILTERS, colors: ['W', 'M'] });
  assert.equal(isBlank(EMPTY_FILTERS), true);
  assert.equal(isBlank({ ...EMPTY_FILTERS, q: '  ' }), true);
  assert.equal(isBlank({ ...EMPTY_FILTERS, deck: 'any' }), false);
});

// ---------------------------------------------------------------------------
// The keyboard
// ---------------------------------------------------------------------------

const ctx = (over: Partial<CardsKeyContext>): CardsKeyContext => ({
  key: '',
  modifier: false,
  inInput: false,
  inControl: false,
  inSelect: false,
  index: -1,
  total: 12,
  columns: 4,
  detailOpen: false,
  ...over,
});

test('keys: the table is total — every advertised key has a row and every row plans something', () => {
  for (const row of CARDS_KEYMAP) {
    for (const key of row.keys) {
      assert.equal(cardsRowFor(key), row);
      const plan = planCardsKey(ctx({ key, index: 5, detailOpen: true }));
      assert.notEqual(plan.kind, 'none', `${key} (${row.chord}) plans nothing`);
    }
  }
  assert.equal(cardsRowFor('q'), null);
  assert.deepEqual(planCardsKey(ctx({ key: 'q' })), { kind: 'none' });
});

test('keys: the help line advertises every key a row answers — Home and End included', () => {
  const shown: Record<string, string> = {
    ArrowLeft: '←',
    ArrowUp: '↑',
    ArrowRight: '→',
    ArrowDown: '↓',
    Home: 'Home',
    End: 'End',
    Enter: 'Enter',
    Escape: 'Esc',
    '/': '/',
  };
  for (const row of CARDS_KEYMAP) {
    for (const key of row.keys) {
      const glyph = shown[key];
      assert.ok(glyph !== undefined, `no help glyph for ${key}`);
      assert.ok(row.chord.split(' ').includes(glyph), `${key} works but "${row.chord}" does not say so`);
    }
  }
});

test('keys: / focuses the search; typing in the box keeps every character', () => {
  assert.deepEqual(planCardsKey(ctx({ key: '/' })), { kind: 'focusSearch' });
  assert.deepEqual(planCardsKey(ctx({ key: '/', inInput: true })), { kind: 'none' });
  assert.deepEqual(planCardsKey(ctx({ key: 'ArrowLeft', inInput: true })), { kind: 'none' });
  assert.deepEqual(planCardsKey(ctx({ key: '/', modifier: true })), { kind: 'none' });
  // Down leaves the box for the first result; Enter opens it; Esc blurs.
  assert.deepEqual(planCardsKey(ctx({ key: 'ArrowDown', inInput: true })), { kind: 'select', index: 0, focusGrid: true });
  assert.deepEqual(planCardsKey(ctx({ key: 'Enter', inInput: true })), { kind: 'open', index: 0 });
  assert.deepEqual(planCardsKey(ctx({ key: 'Enter', inInput: true, total: 0 })), { kind: 'none' });
  assert.deepEqual(planCardsKey(ctx({ key: 'Escape', inInput: true })), { kind: 'blur' });
});

test('keys: arrows move over the grid as laid out, clamped; Enter opens; Esc closes', () => {
  assert.equal(moveIndex(-1, 'ArrowRight', 4, 12), 0);
  assert.equal(moveIndex(-1, 'End', 4, 12), 11);
  assert.equal(moveIndex(0, 'ArrowRight', 4, 12), 1);
  assert.equal(moveIndex(0, 'ArrowLeft', 4, 12), 0);
  assert.equal(moveIndex(1, 'ArrowDown', 4, 12), 5);
  assert.equal(moveIndex(9, 'ArrowDown', 4, 12), 11);
  assert.equal(moveIndex(5, 'ArrowUp', 4, 12), 1);
  assert.equal(moveIndex(2, 'ArrowUp', 4, 12), 0);
  assert.equal(moveIndex(5, 'Home', 4, 12), 0);
  assert.equal(moveIndex(3, 'ArrowDown', 0, 12), 4, 'a zero-column measurement is one column');
  assert.equal(moveIndex(0, 'ArrowDown', 4, 0), -1);
  assert.deepEqual(planCardsKey(ctx({ key: 'ArrowDown', index: 1 })), { kind: 'select', index: 5, focusGrid: false });
  assert.deepEqual(planCardsKey(ctx({ key: 'Enter', index: 5 })), { kind: 'open', index: 5 });
  assert.deepEqual(planCardsKey(ctx({ key: 'Enter', index: -1 })), { kind: 'none' });
  // A focused button keeps Enter (its own click opens the card) — and a result
  // tile IS a button, so it must not lose the arrows.
  assert.deepEqual(planCardsKey(ctx({ key: 'Enter', index: 5, inControl: true })), { kind: 'none' });
  assert.deepEqual(planCardsKey(ctx({ key: 'ArrowRight', index: 5, inControl: true })), { kind: 'select', index: 6, focusGrid: false });
  // A focused <select> keeps its arrows and Enter; `/` still searches, Esc still closes.
  for (const key of ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter', 'Home', 'End']) {
    assert.deepEqual(planCardsKey(ctx({ key, index: 5, inSelect: true })), { kind: 'none' }, key);
  }
  assert.deepEqual(planCardsKey(ctx({ key: '/', inSelect: true })), { kind: 'focusSearch' });
  assert.deepEqual(planCardsKey(ctx({ key: 'Escape', inSelect: true, detailOpen: true })), { kind: 'close' });
  assert.deepEqual(planCardsKey(ctx({ key: 'Escape', detailOpen: true })), { kind: 'close' });
  assert.deepEqual(planCardsKey(ctx({ key: 'Escape', detailOpen: false })), { kind: 'none' });
});

// ---------------------------------------------------------------------------
// The fixture slice — the same filters over real Scryfall print objects
// ---------------------------------------------------------------------------

/**
 * A Scryfall card object → the browser's card. TEST-ONLY: the page never sees a
 * Scryfall object (the dev route builds its cards from the index, `devApi.ts`
 * `toWire`); this reads the committed slice's print lines the same way so the
 * pure filters can be pinned over real data with no SQLite at all.
 */
function fromScryfall(raw: Record<string, unknown>): LibraryCard {
  const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
  const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  const rawFaces = Array.isArray(raw['card_faces']) ? (raw['card_faces'] as Record<string, unknown>[]) : [];
  const faces = rawFaces.map((f) => ({
    name: str(f['name']) ?? '',
    manaCost: str(f['mana_cost']),
    typeLine: str(f['type_line']) ?? '',
    oracleText: str(f['oracle_text']) ?? '',
    flavorText: str(f['flavor_text']),
    power: str(f['power']),
    toughness: str(f['toughness']),
    loyalty: str(f['loyalty']),
    defense: str(f['defense']),
    artist: str(f['artist']),
  }));
  const images = (raw['image_uris'] ?? (rawFaces[0]?.['image_uris'] as unknown)) as Record<string, string> | undefined;
  return card({
    id: String(raw['id']),
    oracleId: str(raw['oracle_id']) ?? str(rawFaces[0]?.['oracle_id']),
    name: String(raw['name']),
    set: String(raw['set']),
    setName: str(raw['set_name']),
    collectorNumber: String(raw['collector_number']),
    rarity: str(raw['rarity']),
    manaCost: str(raw['mana_cost']) ?? faces[0]?.manaCost ?? null,
    cmc: typeof raw['cmc'] === 'number' ? raw['cmc'] : null,
    typeLine: str(raw['type_line']) ?? faces.map((f) => f.typeLine).join(' // '),
    oracleText: str(raw['oracle_text']) ?? '',
    colors: raw['colors'] === undefined ? [...new Set(rawFaces.flatMap((f) => list(f['colors'])))] : list(raw['colors']),
    layout: str(raw['layout']) ?? 'normal',
    artist: str(raw['artist']),
    releasedAt: str(raw['released_at']),
    legalities: (raw['legalities'] ?? {}) as Record<string, string>,
    faces,
    imageRemote: images?.['normal'] ?? null,
  });
}

const SLICE: LibraryCard[] = ['fixtures/cards/prints-msh.slice.jsonl', 'fixtures/cards/prints-msc.slice.jsonl'].flatMap(
  (file) =>
    read(file)
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => fromScryfall(JSON.parse(line) as Record<string, unknown>)),
);
const DECKS = buildDeckIndex([PACHO]);
const PACHO_NAMES = [...new Set(PACHO.lines.map((l) => l.name))].sort();
const run = (over: Partial<CardFilters>) => searchSlice(SLICE, { ...EMPTY_FILTERS, ...over }, DECKS);
const names = (cards: readonly LibraryCard[]): string[] => cards.map((c) => c.name);

test('fixture: the slice is real MSH and MSC prints, and holds every card of the deck', () => {
  assert.ok(SLICE.length >= 60, `the slice has ${String(SLICE.length)} prints`);
  assert.deepEqual([...new Set(SLICE.map((c) => c.set))].sort(), ['msc', 'msh']);
  const have = new Set(SLICE.map((c) => c.name));
  assert.deepEqual(PACHO_NAMES.filter((n) => !have.has(n)), []);
});

test('fixture: "agent" — every hit matches, names first; one row per card, or every print with a set', () => {
  const all = run({ q: 'agent' });
  assert.ok(all.total > 0);
  assert.ok(all.cards.every((c) => matchesText(c, 'agent')));
  // One Agent Phil Coulson without a set — the slice holds MSH #4 AND #402.
  assert.equal(names(all.cards).filter((n) => n === 'Agent Phil Coulson').length, 1);
  // Name hits outrank rules-text hits.
  const firstTextOnly = all.cards.findIndex((c) => !tokenize(c.name).some((w) => w.startsWith('agent')));
  const lastName = all.cards.map((c) => tokenize(c.name).some((w) => w.startsWith('agent'))).lastIndexOf(true);
  assert.ok(firstTextOnly < 0 || lastName < firstTextOnly, 'a rules-text hit came before a name hit');
  const msh = run({ q: 'agent', sets: ['msh'] });
  assert.ok(msh.cards.every((c) => c.set === 'msh'));
  assert.deepEqual(
    msh.cards.filter((c) => c.name === 'Agent Phil Coulson').map((c) => c.collectorNumber).sort(),
    ['4', '402'],
  );
  assert.deepEqual(names(run({ q: 'agent coulson' }).cards), ['Agent Phil Coulson']);
  assert.equal(run({ q: 'agent', sets: ['msc'] }).cards.some((c) => c.name === 'Peggy Carter, Secret Agent'), true);
});

test('fixture: "shield" finds the S.H.I.E.L.D. cards the periods would otherwise hide', () => {
  const hits = names(run({ q: 'shield' }).cards);
  for (const name of ['S.H.I.E.L.D. Helicarrier', 'S.H.I.E.L.D. Spy Kit', 'Agents of S.H.I.E.L.D.', 'Quake, Agent of S.H.I.E.L.D.']) {
    assert.ok(hits.includes(name), `${name} missing from ${hits.join(', ')}`);
  }
});

test('fixture: the in-deck filter is the deck — 28 cards by name, whatever the print', () => {
  const deck = run({ deck: 'decks/pacho-shield.dck' });
  assert.equal(deck.total, 28);
  assert.deepEqual([...names(deck.cards)].sort(), PACHO_NAMES);
  assert.equal(run({ deck: 'any' }).total, 28);
  assert.equal(run({ deck: 'decks/yield-probe.dck' }).total, 0);
  // With a set, every print of the deck's cards in it: all six MSH Plains.
  const mshPrints = run({ deck: 'decks/pacho-shield.dck', sets: ['msh'] });
  assert.ok(mshPrints.cards.every((c) => c.set === 'msh' && PACHO_NAMES.includes(c.name)));
  assert.equal(mshPrints.cards.filter((c) => c.name === 'Plains').length, 6);
  assert.equal(mshPrints.cards.some((c) => c.name === 'Peggy Carter, Secret Agent'), false);
});

test('fixture: colour, type and the combination narrow the deck exactly', () => {
  const deck = { deck: 'decks/pacho-shield.dck' };
  const blue = run({ ...deck, colors: ['U'] }).cards;
  assert.ok(blue.length > 0 && blue.every((c) => c.colors.includes('U')));
  const colourless = run({ ...deck, colors: ['C'] }).cards;
  assert.ok(colourless.every((c) => c.colors.length === 0));
  for (const name of ['S.H.I.E.L.D. Helicarrier', 'Plains', 'Island', 'Thriving Heath']) {
    assert.ok(names(colourless).includes(name), `${name} is colourless`);
  }
  const multi = run({ ...deck, colors: ['M'] }).cards;
  assert.ok(multi.every((c) => c.colors.length >= 2));
  // W or U: every card in the deck that is not colourless.
  assert.equal(run({ ...deck, colors: ['W', 'U'] }).total + colourless.length, 28);
  const lands = run({ ...deck, type: 'land' }).cards;
  assert.deepEqual([...names(lands)].sort(), ['Island', 'Plains', 'Thriving Heath', 'Thriving Isle']);
  const creatures = run({ ...deck, type: 'creature' }).cards;
  assert.ok(creatures.every((c) => /\bCreature\b/.test(c.typeLine)));
  assert.ok(names(creatures).includes('Peggy Carter, Secret Agent'));
  assert.ok(!names(creatures).includes('S.H.I.E.L.D. Helicarrier'), 'a Vehicle is an artifact, not a creature');
  const whiteCreatures = run({ ...deck, type: 'creature', colors: ['W'] }).cards;
  assert.ok(whiteCreatures.every((c) => c.colors.includes('W') && /\bCreature\b/.test(c.typeLine)));
  // The pure filters are the whole of it: applyFilters over the deck alone agrees.
  assert.deepEqual(
    names(applyFilters(run(deck).cards, { ...EMPTY_FILTERS, type: 'creature', colors: ['W'] }, DECKS)).sort(),
    names(whiteCreatures).sort(),
  );
});
