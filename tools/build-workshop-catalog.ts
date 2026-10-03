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
 * **A deck card the corpus never showed face up takes its facts from the
 * engine's own card script** (D196), read out of `forge-home/res/cardsfolder/
 * cardsfolder.zip` (`tools/forge-scripts.ts`) and named in the catalog's
 * `engine` list. Without the engine's resources (a clone that has not run
 * `tools/make-forge-home.sh`) the tool refuses to write, rather than write a
 * catalog that has lost those facts; `--check` compares what it can.
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

import { buildCatalog, factsFromScript, parseDck, type DeckList } from '../web/src/workshop/catalogBuild.ts';
import { openForgeScripts } from './forge-scripts.ts';

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

const scripts = openForgeScripts();
if (scripts === null && !process.argv.includes('--check')) {
  console.error('build-workshop-catalog: no forge-home/res/cardsfolder/cardsfolder.zip — run ./tools/make-forge-home.sh first (the engine facts come from it)');
  process.exit(1);
}
// With no engine resources (CI's web job), `--check` takes the engine's facts
// from the committed file for the names it says came from the engine — the
// corpus half is still checked byte for byte, and the engine half wherever the
// engine is (here, and web/test/workshop.test.ts).
let committed: { engine?: string[]; cards?: Record<string, ReturnType<typeof factsFromScript>> } = {};
if (scripts === null) {
  try {
    committed = JSON.parse(readFileSync(OUT, 'utf8')) as typeof committed;
  } catch {
    committed = {};
  }
  console.log('build-workshop-catalog: no engine resources here — the engine facts are the committed file\'s (checked where the engine is)');
}
const engineFacts = (name: string) => {
  if (scripts === null) return (committed.engine ?? []).includes(name) ? (committed.cards?.[name] ?? null) : null;
  const script = scripts.scriptOf(name);
  return script === null ? null : factsFromScript(script);
};
const text = `${JSON.stringify(buildCatalog(decks(), recordings, cueCards(), engineFacts), null, 2)}\n`;
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
