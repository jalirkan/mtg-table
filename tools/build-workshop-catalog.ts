#!/usr/bin/env node
/*
 * mtg-table — tools/build-workshop-catalog.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The workshop's card list, generated.** Reads every `decks/*.dck` and every
 * `state` frame of every committed recording under `fixtures/games/`, and writes
 * `web/src/workshop/catalog.json`: each deck's cards, the facts a `Card` carries
 * on the wire for each of them (type line, mana cost, P/T, token), every token
 * the corpus has seen, and — reading the card names `web/src/arena/cues/cues.json`
 * has an entry for — what the workshop can show of each in 3D (`threeD`, the card
 * browser's *View in 3D*). So a new per-card `cues.json` entry for a deck card is
 * a reason to run it too. The logic is `web/src/workshop/catalogBuild.ts`; this
 * file only reads and writes.
 *
 *     node tools/build-workshop-catalog.ts            # rewrite the file
 *     node tools/build-workshop-catalog.ts --check    # exit 1 if it would change
 *
 * Run it from the repo root (CLAUDE.md hard rule 9). It needs no engine and no
 * network: the facts are what Forge already put in the recordings.
 * `web/test/workshop.test.ts` rebuilds the catalog the same way and fails when the
 * committed file has drifted from the decks or the corpus.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildCatalog, parseDck, type DeckList } from '../web/src/workshop/catalogBuild.ts';

const OUT = 'web/src/workshop/catalog.json';

function decks(): DeckList[] {
  return readdirSync('decks')
    .filter((f) => f.endsWith('.dck'))
    .sort()
    .map((f) => parseDck(f, readFileSync(join('decks', f), 'utf8')));
}

function* stateBodies(path: string): Generator<unknown> {
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.includes('"state"')) continue;
    let frame: { type?: string; body?: unknown };
    try {
      frame = JSON.parse(line) as { type?: string; body?: unknown };
    } catch {
      continue;
    }
    if (frame.type === 'state') yield frame.body;
  }
}

const recordings = readdirSync('fixtures/games')
  .filter((f) => f.endsWith('.jsonl'))
  .sort()
  .map((f) => [f, stateBodies(join('fixtures/games', f))] as const);

/** The card names `cues.json` has a per-card entry for (its `cards` block). */
function cueCards(): string[] {
  const cues = JSON.parse(readFileSync('web/src/arena/cues/cues.json', 'utf8')) as { cards?: Record<string, unknown> };
  return Object.keys(cues.cards ?? {});
}

const text = `${JSON.stringify(buildCatalog(decks(), recordings, cueCards()), null, 2)}\n`;
if (process.argv.includes('--check')) {
  let committed = '';
  try {
    committed = readFileSync(OUT, 'utf8');
  } catch {
    committed = '';
  }
  if (committed !== text) {
    console.error(`build-workshop-catalog: ${OUT} is stale — run node tools/build-workshop-catalog.ts`);
    process.exit(1);
  }
  console.log(`build-workshop-catalog: ${OUT} is current`);
} else {
  writeFileSync(OUT, text);
  console.log(`build-workshop-catalog: wrote ${OUT} (${String(text.length)} bytes)`);
}
