/*
 * mtg-table — tools/card-library/make-fixture.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Cut the committed test fixture, `fixtures/cards/`, out of a real fetch in
 * `var/cards/` — so the library's tests run offline against the real formats,
 * real lines of the real files, and the fixture can be regenerated rather than
 * hand-edited:
 *
 *     node tools/card-library/build.ts                 # once, to fetch var/cards/
 *     node tools/card-library/make-fixture.ts          # writes fixtures/cards/
 *
 * What goes in, and why each line earns its place:
 *   - the first 100 lines of the `oracle_cards` bulk file, as they come (the
 *     format, unselected);
 *   - the oracle row of every card in every `decks/*.dck` (the deck resolution
 *     tests), every Ant-Man / Wasp / "shrink" card (the search tests), and the
 *     layouts the multi-face rule is about — transform, split, adventure,
 *     prepare, modal DFC — plus a token, an art-series card and a theme card
 *     (the `extra` kind);
 *   - from the MSH and MSC print syncs: every print of those names, Agent Phil
 *     Coulson's extended-art #402, all six MSH Plains and Islands, and up to
 *     three two-sided prints per set (MSH's modal DFCs — MSC has none — for
 *     the back-image tests);
 *   - the set objects for MSH, MSC and the sets their family and the
 *     representative prints need.
 * Nothing in it is an image; images are never committed (NOTICE §4).
 *
 * **Each line is reduced to the fields the library reads** (model.ts
 * `SCRY_CARD_FIELDS`, `SCRY_FACE_FIELDS`, `SCRY_SET_FIELDS` — the keys of the
 * `ScryCard` / `ScryFace` / `ScrySet` interfaces, in the source's key order),
 * so prices, purchase and related URIs, platform ids, `all_parts`, rulings and
 * the rest of Scryfall's record are not committed: the slice holds what the
 * tests exercise and no more of Scryfall's data (NOTICE §2, DECISIONS.md D90).
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { readLines, readManifest } from './build.ts';
import { parseDeck } from './deck.ts';
import { readFieldsOfCard, readFieldsOfSet, type ScryCard, type ScrySet } from './model.ts';

/** One JSONL line, reduced to the fields the library reads. */
const reduce = (line: string): string => JSON.stringify(readFieldsOfCard(JSON.parse(line) as Record<string, unknown>));

const root = process.cwd();
const syncDir = resolve(root, 'var/cards/sync');
const outDir = resolve(root, 'fixtures/cards');
const manifest = await readManifest(resolve(syncDir, 'manifest.json'));

const deckNames = new Set<string>();
for (const file of readdirSync(resolve(root, 'decks'))) {
  if (!file.endsWith('.dck')) continue;
  for (const entry of parseDeck(readFileSync(resolve(root, 'decks', file), 'utf8'), file).entries) deckNames.add(entry.name);
}
const EXTRA_NAMES = new Set([
  'Delver of Secrets // Insectile Aberration',
  'Fire // Ice',
  'Bonecrusher Giant // Stomp',
  'Adventurous Eater // Have a Bite',
  'Witch Enchanter // Witch-Blessed Meadow',
  "Smuggler's Copter",
  'Jace Beleren',
  'Shrink',
  'Shrinking Plane',
  'Wasp',
  'Surprise!',
  'Brightglass Gearhulk // Brightglass Gearhulk',
]);
const THEME = /Ant-Man|Wasp|Shrink|Pym|Giant-Man/;
const MSH_EXTRA = new Set(['Plains', 'Island', 'Mountain', 'Forest', 'Giant Growth']);

// -- prints ---------------------------------------------------------------
const printLines = new Map<string, string[]>();
const printOracleIds = new Set<string>();
for (const entry of manifest.prints) {
  const keep: string[] = [];
  const all: { line: string; card: ScryCard }[] = [];
  for await (const line of readLines(resolve(syncDir, entry.file))) {
    if (line.trim() !== '') all.push({ line, card: JSON.parse(line) as ScryCard });
  }
  const twoSided = all.filter((p) => p.card.image_uris === undefined && (p.card.card_faces?.length ?? 0) > 1).slice(0, 3);
  for (const p of all) {
    const c = p.card;
    const want =
      deckNames.has(c.name) ||
      THEME.test(c.name) ||
      (entry.code === 'msh' && MSH_EXTRA.has(c.name)) ||
      twoSided.includes(p);
    if (!want) continue;
    keep.push(reduce(p.line));
    if (typeof c.oracle_id === 'string') printOracleIds.add(c.oracle_id);
  }
  printLines.set(entry.code, keep);
}

// -- oracle ----------------------------------------------------------------
const oracleKeep: string[] = [];
let index = 0;
for await (const line of readLines(resolve(syncDir, manifest.oracle.file))) {
  if (line.trim() === '') continue;
  const card = JSON.parse(line) as ScryCard;
  const want =
    index < 100 ||
    deckNames.has(card.name) ||
    EXTRA_NAMES.has(card.name) ||
    THEME.test(card.name) ||
    /\bshrink/i.test(card.oracle_text ?? '') ||
    (typeof card.oracle_id === 'string' && printOracleIds.has(card.oracle_id));
  if (want) oracleKeep.push(reduce(line));
  index++;
}

// -- sets -------------------------------------------------------------------
const sets = JSON.parse(await readFile(resolve(syncDir, 'sets.json'), 'utf8')) as ScrySet[];
const setCodes = new Set(['msh', 'msc', 'mar', 'trk']);
const setKeep = sets
  .filter((s) => setCodes.has(s.code) || (s.parent_set_code !== undefined && s.parent_set_code === 'msh'))
  .map((s) => readFieldsOfSet(s as unknown as Record<string, unknown>));

await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, 'oracle-cards.slice.jsonl'), `${oracleKeep.join('\n')}\n`);
for (const [code, lines] of printLines) await writeFile(resolve(outDir, `prints-${code}.slice.jsonl`), `${lines.join('\n')}\n`);
await writeFile(resolve(outDir, 'sets.slice.json'), `${JSON.stringify(setKeep, null, 1)}\n`);
await writeFile(
  resolve(outDir, 'manifest.json'),
  `${JSON.stringify(
    {
      oracle: {
        file: 'oracle-cards.slice.jsonl',
        updated_at: manifest.oracle.updated_at,
        uri: manifest.oracle.uri,
        compressed_size: null,
        fetched_at: manifest.oracle.fetched_at,
      },
      sets: { file: 'sets.slice.json', fetched_at: manifest.sets?.fetched_at ?? null },
      prints: manifest.prints.map((p) => ({
        code: p.code,
        file: `prints-${p.code}.slice.jsonl`,
        synced_at: p.synced_at,
        total_cards: p.total_cards,
        pages: p.pages,
        icon: null,
      })),
    },
    null,
    2,
  )}\n`,
);
process.stdout.write(
  `fixtures/cards: ${String(oracleKeep.length)} oracle lines, ` +
    [...printLines].map(([code, lines]) => `${String(lines.length)} ${code} prints`).join(', ') +
    `, ${String(setKeep.length)} sets\n`,
);
