/*
 * mtg-table — web/test/cubelab-library.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The whole library as a seed pool and its candidate 180s (tools/cubelab/library-candidates.ts,
 * cubes/library/; lab job J136), engine-free, over the committed files:
 *
 *  - library-pool.tsv: one row a card, no name twice, evolve's parsePool reads it, and its
 *    unsupported rows are marked;
 *  - every candidate (hits-180, random-180, synergy-v2-180, and synergy-v3-180 when it exists):
 *    180 cards, no duplicates, no parse warning, every card a supported row of the pool, and the
 *    document written back unchanged is the same bytes (evolve's writer can edit it);
 *  - hits-180 and random-180 fill Omega's skeleton exactly (colour classes, gold pairs, curve,
 *    fixing and other lands), hits-180 holds only cards with 80+ lab games, and each is exactly what
 *    the selection rule gives on the committed pool (hits by lab rating, random from seed 180);
 *  - the selection's own arithmetic on a small hand-made pool: the flow fills the quotas exactly,
 *    prefers the larger keys, and refuses a skeleton it cannot fill.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseCube } from '../../tools/cubelab/cube.ts';
import { writeCubeDoc } from '../../tools/cubelab/cubedoc.ts';
import { parsePool } from '../../tools/cubelab/evolve.ts';
import {
  cardTypes, OMEGA_SKELETON, parseLibraryPool, parseListTxt, selectHits, selectNonland, selectRandom, skeletonErrors, type LibraryCard, type Skeleton,
} from '../../tools/cubelab/library-candidates.ts';

const REPO = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const DIR = join(REPO, 'cubes', 'library');
const poolText = readFileSync(join(DIR, 'library-pool.tsv'), 'utf8');
const pool = parseLibraryPool(poolText);
const byName = new Map(pool.map((c) => [c.name, c]));
const CANDIDATES = ['hits-180', 'random-180', 'synergy-v2-180', 'synergy-v3-180'].filter((c) => existsSync(join(DIR, `${c}.md`)));
const cubeOf = (id: string) => parseCube(readFileSync(join(DIR, `${id}.md`), 'utf8'));
const rows = (id: string): LibraryCard[] => cubeOf(id).cards.map((c) => byName.get(c.name) as LibraryCard);

test('library-pool.tsv: one row a card, evolve reads it, unsupported cards marked', () => {
  assert.ok(pool.length >= 1500, `the library has ${pool.length} rows`);
  assert.equal(new Set(pool.map((c) => c.name)).size, pool.length, 'no card twice');
  const evolvePool = parsePool(poolText);
  assert.equal(evolvePool.length, pool.length, "evolve's parsePool reads every row");
  assert.equal(evolvePool.filter((c) => c.supported).length, pool.filter((c) => c.supported).length);
  const unsupported = pool.filter((c) => !c.supported);
  assert.ok(unsupported.length > 0, 'the library lists cards Forge 2.0.14 lacks');
  for (const c of unsupported) assert.equal(c.type, '', `${c.name}: an unsupported card carries no engine facts`);
  for (const c of pool) if (c.labWr !== null) assert.ok(c.labGames > 0 && c.labWr > 0 && c.labWr < 1, `${c.name}: lab numbers`);
});

test('every candidate: 180 cards, no duplicates, supported, and evolve can write it back', () => {
  assert.ok(CANDIDATES.includes('hits-180') && CANDIDATES.includes('random-180') && CANDIDATES.includes('synergy-v2-180'));
  for (const id of CANDIDATES) {
    const text = readFileSync(join(DIR, `${id}.md`), 'utf8');
    const cube = parseCube(text);
    assert.deepEqual(cube.warnings, [], `${id}: parse warnings`);
    assert.equal(cube.cards.length, 180, `${id}: 180 cards`);
    assert.equal(new Set(cube.cards.map((c) => c.name)).size, 180, `${id}: no duplicates`);
    for (const c of cube.cards) {
      const row = byName.get(c.name);
      assert.ok(row, `${id}: ${c.name} is a library card`);
      assert.ok(row.supported, `${id}: ${c.name} is supported by Forge 2.0.14`);
    }
    assert.equal(writeCubeDoc(text, cube.cards), text, `${id}: written back unchanged, the same bytes`);
    assert.match(cube.title, /version \d+/, `${id}: a version for evolve to bump`);
  }
});

test("hits-180 and random-180 fill Omega's skeleton exactly", () => {
  for (const id of ['hits-180', 'random-180']) assert.deepEqual(skeletonErrors(rows(id)), [], id);
  // Omega itself is the skeleton's source: its own shape, read the same way, is the skeleton.
  const sk = OMEGA_SKELETON;
  assert.equal(Object.values(sk.classes).reduce((a, b) => a + b, 0), sk.curve.reduce((a, b) => a + b, 0));
  assert.equal(sk.curve.reduce((a, b) => a + b, 0) + 10 * sk.fixersPerPair + sk.otherLands, 180);
});

test('hits-180 is the lab-rating rule on the committed pool; random-180 is seed 180', () => {
  const hits = rows('hits-180');
  for (const c of hits) assert.ok(c.labGames >= 80 && c.labWr !== null, `${c.name}: ${c.labGames} lab games`);
  const sorted = (cs: LibraryCard[]): string[] => cs.map((c) => c.name).sort();
  assert.deepEqual(sorted(hits), sorted(selectHits(pool, 80)));
  assert.deepEqual(sorted(rows('random-180')), sorted(selectRandom(pool, 180)));
  assert.notDeepEqual(sorted(selectRandom(pool, 181)), sorted(selectRandom(pool, 180)), 'another seed, another cube');
  assert.equal(readFileSync(join(DIR, 'random-180.md'), 'utf8').includes('Seed 180'), true);
});

test('synergy-v2-180 is ForgeCoach\'s version 2 with its provenance line', () => {
  const text = readFileSync(join(DIR, 'synergy-v2-180.md'), 'utf8');
  assert.match(text.split('\n')[0] as string, /^# The Synergy Cube — version 2 /);
  assert.match(text, /\*Copied \d{4}-\d{2}-\d{2} by tools\/cubelab\.sh library-candidates from ForgeCoach@[0-9a-f]{8}/);
  const names = new Set(cubeOf('synergy-v2-180').cards.map((c) => c.name));
  for (const n of ['Yawgmoth, Thran Physician', 'Reanimate', 'Murderous Redcap']) assert.ok(names.has(n), `v2 has ${n}`);
  for (const n of ['Skullclamp', 'Ledger Shredder', "Man-o'-War"]) assert.ok(!names.has(n), `v2 cut ${n}`);
});

test('the selection: exact quotas, larger keys first, and a skeleton it cannot fill is refused', () => {
  const sk: Skeleton = { classes: { W: 2, U: 1, '': 1 }, curve: [0, 2, 2, 0, 0, 0, 0, 0], fixersPerPair: 0, otherLands: 0 };
  const c = (name: string, colors: string, mv: number, key: number) => ({ name, colors, mv, key });
  const cards = [c('w1a', 'W', 1, 9), c('w1b', 'W', 1, 8), c('w2', 'W', 2, 1), c('u1', 'U', 1, 7), c('u2', 'U', 2, 2), c('a2', '', 2, 5), c('wu', 'WU', 2, 99)];
  const got = selectNonland(cards, (x) => x.key, sk).map((x) => x.name).sort();
  // a2 is the only colourless card; then w1a + w1b at 1 and u2 at 2 (19) beat w1a + u1 at 1 and w2 at 2 (17); WU has no class.
  assert.deepEqual(got, ['a2', 'u2', 'w1a', 'w1b']);
  assert.throws(() => selectNonland(cards, (x) => x.key, { ...sk, curve: [0, 0, 0, 4, 0, 0, 0, 0] }), /cannot be filled/);
  assert.equal(cardTypes('Legendary Artifact Creature - Equipment Golem'), 'Artifact Creature');
  assert.deepEqual(parseListTxt('# x\n1 Fire // Ice\n1 Lórien Revealed (LTR)\n'), ['Fire // Ice', 'Lórien Revealed']);
});
