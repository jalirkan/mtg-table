/*
 * mtg-table — web/test/cubelab-bridge.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Bridge drafts and the overnight queue (tools/cubelab/bridge.ts, queue.ts),
 * engine-free:
 *
 *  - a bridge pool is a function of its seed: the same seed gives the same
 *    180 names in the same order, another seed another pool;
 *  - it takes each cube's share (half each, or --bridge-ratio), spread over
 *    each cube's sections in proportion, with no card twice even where the
 *    cubes overlap (Fair Fight and Pauper share 99 cards), and every card is
 *    tagged with the cube it came from;
 *  - a bridge draft on the committed cubes plays two legal-sized decks;
 *  - the queue: Omega+Vintage and Fair Fight+Pauper are skipped as the same
 *    pool, pairs that chain the power tiers lead, the bridge share holds,
 *    every (pool key, seed) is planned once across nights, a cube whose cards
 *    already have games gets fewer drafts, and a shared card is paid for once.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { apportion, bridgePool, cubeId, mergeRatings, parseBridgeArgs, poolCube, unionCube } from '../../tools/cubelab/bridge.ts';
import type { Fact } from '../../tools/cubelab/cards.ts';
import { parseCube, type Cube } from '../../tools/cubelab/cube.ts';
import { loadCube, runDraft } from '../../tools/cubelab/lab.ts';
import { allocate, assertNoDuplicates, cubeWeights, planNight, scorePairs, type CubeSet, type Ledger } from '../../tools/cubelab/queue.ts';
import { DEFAULT_WEIGHTS } from '../../tools/cubelab/weights.ts';

const REPO = join(fileURLToPath(new URL('.', import.meta.url)), '../..');
const cube = (id: string): Cube => parseCube(readFileSync(join(REPO, 'cubes', `${id}-cube-180.md`), 'utf8'));
const IDS = ['fair-fight', 'modern-era', 'omega', 'pauper', 'peasant', 'synergy', 'vintage'];

test('cubeId and the --bridge arguments', () => {
  assert.equal(cubeId('cubes/fair-fight-cube-180.md'), 'fair-fight');
  assert.equal(cubeId('modern-era'), 'modern-era');
  assert.deepEqual(parseBridgeArgs('a,b'), { ids: ['a', 'b'], shares: [0.5, 0.5] });
  assert.deepEqual(parseBridgeArgs('a,b', '3:1').shares, [0.75, 0.25]);
  assert.throws(() => parseBridgeArgs('a'), /two or more/);
  assert.throws(() => parseBridgeArgs('a,a'), /twice/);
  assert.throws(() => parseBridgeArgs('a,b', '1'), /2 positive/);
  assert.deepEqual(apportion(180, [1, 1]), [90, 90]);
  assert.deepEqual(apportion(10, [1, 1, 1]), [4, 3, 3]);
  assert.equal(apportion(180, [26, 26, 26, 26, 26, 16, 14, 20]).reduce((a, b) => a + b, 0), 180);
});

test('a bridge pool is a function of its seed', () => {
  const src = [{ id: 'pauper', cube: cube('pauper') }, { id: 'vintage', cube: cube('vintage') }];
  const a = bridgePool(src, [0.5, 0.5], 180, 42);
  const b = bridgePool(src, [0.5, 0.5], 180, 42);
  const c = bridgePool(src, [0.5, 0.5], 180, 43);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.names, c.names);
  assert.equal(a.names.length, 180);
  assert.equal(new Set(a.names).size, 180);
});

test('shares, sections and overlap: half of each cube, each half balanced, no card twice', () => {
  const ff = cube('fair-fight');
  const pa = cube('pauper');
  const src = [{ id: 'fair-fight', cube: ff }, { id: 'pauper', cube: pa }];
  for (const seed of [1, 2, 3, 4, 5]) {
    const p = bridgePool(src, [0.5, 0.5], 180, seed);
    assert.equal(p.from['fair-fight']?.length, 90);
    assert.equal(p.from.pauper?.length, 90, 'pauper still gives 90 though it shares 99 cards with Fair Fight');
    assert.equal(new Set(p.names).size, 180);
    for (const n of p.from['fair-fight'] ?? []) assert.ok(ff.cards.some((c) => c.name === n));
    for (const n of p.from.pauper ?? []) assert.ok(pa.cards.some((c) => c.name === n));
    // Fair Fight goes first, so its 90 are stratified exactly: 13 of each 26-card colour.
    const ffWhite = (p.from['fair-fight'] ?? []).filter((n) => ff.cards.find((c) => c.name === n)?.section === 'White').length;
    assert.equal(ffWhite, 13);
  }
  const r = bridgePool([{ id: 'pauper', cube: pa }, { id: 'vintage', cube: cube('vintage') }], [0.7, 0.3], 180, 9);
  assert.equal(r.from.pauper?.length, 126);
  assert.equal(r.from.vintage?.length, 54);
  const three = bridgePool(['pauper', 'synergy', 'vintage'].map((id) => ({ id, cube: cube(id) })), [1 / 3, 1 / 3, 1 / 3], 180, 9);
  assert.deepEqual(Object.values(three.from).map((x) => x.length), [60, 60, 60]);
});

test('unionCube and mergeRatings', () => {
  const u = unionCube([{ id: 'omega', cube: cube('omega') }, { id: 'vintage', cube: cube('vintage') }]);
  assert.equal(u.cards.length, 180 + 180 - 108);
  assert.equal(new Set(u.cards.map((c) => c.name)).size, u.cards.length);
  const m = mergeRatings([new Map([['A', 10], ['B', 50]]), null, new Map([['A', 30]])]);
  assert.equal(m?.get('A'), 20);
  assert.equal(m?.get('B'), 50);
  assert.equal(mergeRatings([null]), null);
});

test('a bridge draft on fake facts plays two 40-card decks from its own pool', () => {
  const src = [{ id: 'pauper', cube: cube('pauper') }, { id: 'synergy', cube: cube('synergy') }];
  const u = unionCube(src);
  // Facts from the cube's tags alone: the section is the card's colour, basics make their colour.
  const col: Record<string, string> = { White: 'W', Blue: 'U', Black: 'B', Red: 'R', Green: 'G' };
  const facts: Fact[] = u.cards.map((c, i) => {
    const land = /land/i.test(c.section);
    const colors = col[c.section] ?? (c.pair ?? '');
    return {
      listed: c.name, name: c.name, found: true, colors, identity: colors, manaCost: [...colors].map((x) => `{${x}}`).join(' ') || '1',
      cmc: land ? 0 : 1 + (i % 5), type: land ? 'Land' : 'Creature', land, creature: !land,
      rank: { source: 'cube', edition: 'X', defaultEdition: 'X', rawScore: 50 + (i % 40) },
    };
  });
  const lc = loadCube(u, facts, null, DEFAULT_WEIGHTS);
  const pool = bridgePool(src, [0.5, 0.5], 180, 3);
  const pc = poolCube(lc, facts, pool);
  assert.equal(pc.cards.length, 180);
  const d = runDraft(pc, 'grid', 3, DEFAULT_WEIGHTS);
  const inPool = new Set(pool.names);
  for (const dr of d.drafters) {
    for (const n of dr.pool) assert.ok(inPool.has(n), `${n} came from outside the draft's pool`);
    if (dr.deck) assert.equal(dr.deck.main.reduce((s, [k]) => s + k, 0), 40);
  }
  assert.deepEqual(runDraft(poolCube(lc, facts, bridgePool(src, [0.5, 0.5], 180, 3)), 'grid', 3, DEFAULT_WEIGHTS).drafters[0].pool, d.drafters[0].pool);
});

const sets = (): CubeSet[] => IDS.map((id) => ({ id, file: `cubes/${id}-cube-180.md`, cards: cube(id).cards.map((c) => c.name) }));

test('queue: pairs chosen for information, near-identical pools skipped', () => {
  const rows = scorePairs(sets(), new Map(), null);
  assert.equal(rows.length, 21);
  const row = (k: string) => rows.find((r) => r.key === k);
  assert.equal(row('omega+vintage')?.kept, false);
  assert.equal(row('fair-fight+pauper')?.kept, false);
  assert.equal(row('omega+vintage')?.shared, 108);
  assert.equal(row('pauper+modern-era')?.kept, true);
  // The top pairs chain a flat cube to a middle one.
  for (const r of rows.slice(0, 4)) assert.equal(r.gap, 1, `${r.key} leads`);
});

test('queue: a night honours the bridge share, and seeds are never planned twice', () => {
  const ledger: Ledger = { v: 1, games: 1, format: 'grid', nextSeed: {}, nights: [] };
  const n1 = planNight(1, 1000, sets(), new Map(), null, ledger, 50);
  const n2 = planNight(2, 1000, sets(), new Map(), null, ledger, 50);
  const total = (p: typeof n1, kind: string) => p.chunks.filter((c) => c.kind === kind).reduce((s, c) => s + c.drafts, 0);
  assert.equal(total(n1, 'bridge'), 200);
  assert.equal(total(n1, 'normal'), 800);
  assert.equal(assertNoDuplicates([n1, n2]), 2000);
  const again = JSON.parse(JSON.stringify(n1)) as typeof n1;
  assert.throws(() => assertNoDuplicates([n1, again]), /planned twice/);
  // Night 2 continues each key's seeds where night 1 stopped.
  const first = (p: typeof n1, key: string) => Math.min(...p.chunks.filter((c) => c.key === key).map((c) => c.seed));
  const last = (p: typeof n1, key: string) => Math.max(...p.chunks.filter((c) => c.key === key).map((c) => c.seed + c.drafts));
  assert.equal(first(n2, 'normal/vintage'), last(n1, 'normal/vintage'));
  // Interleaved: the first chunks cover several keys.
  assert.ok(new Set(n1.chunks.slice(0, 7).map((c) => c.key)).size >= 5);
});

test('queue: coverage moves drafts away from cubes whose cards already have games; shared cards count once', () => {
  const s = sets();
  const flat = cubeWeights(s, new Map(), null);
  const games = new Map(cube('vintage').cards.map((c) => [c.name, 400]));
  const after = cubeWeights(s, games, null);
  assert.ok((after.get('vintage') as number) < (flat.get('vintage') as number) / 2);
  // Omega shares 108 cards with Vintage: Vintage's games lower Omega's weight too.
  assert.ok((after.get('omega') as number) < (flat.get('omega') as number) * 0.8);
  // Peasant shares only 22 cards with Vintage: it barely moves.
  assert.ok((after.get('peasant') as number) > (flat.get('peasant') as number) * 0.95);
  // Peasant overlaps least, so with no games at all it gets the most drafts.
  const alloc = allocate(1000, s.map((c) => ({ key: c.id, weight: flat.get(c.id) as number })), 20);
  assert.equal([...alloc.entries()].sort((a, b) => b[1] - a[1])[0]?.[0], 'peasant');
  assert.equal([...alloc.values()].reduce((a, b) => a + b, 0), 1000);
});

test('--bridge-ratings even: each cube keeps its order and the halves meet on one scale', () => {
  const src = [{ id: 'pauper', cube: cube('pauper') }, { id: 'vintage', cube: cube('vintage') }];
  const u = unionCube(src);
  const vin = new Set(cube('vintage').cards.map((c) => c.name));
  // Vintage's cards rated 50 points higher than Pauper's: a drafter would take Vintage's first.
  const facts: Fact[] = u.cards.map((c, i) => ({
    listed: c.name, name: c.name, found: true, colors: 'U', identity: 'U', manaCost: '{U}', cmc: 2, type: 'Creature', land: false, creature: true,
    rank: { source: 'cube', edition: 'X', defaultEdition: 'X', rawScore: (vin.has(c.name) ? 100 : 50) + (i % 17) },
  }));
  const lc = loadCube(u, facts, null, DEFAULT_WEIGHTS);
  const pool = bridgePool(src, [0.5, 0.5], 180, 11);
  const own = poolCube(lc, facts, pool, 'own');
  const even = poolCube(lc, facts, pool, 'even');
  const mean = (pc: typeof own, names: string[]) => names.reduce((s, n) => s + (pc.byName.get(n)?.rating ?? 0), 0) / names.length;
  const [p, v] = [pool.from.pauper ?? [], pool.from.vintage ?? []];
  assert.ok(mean(own, v) - mean(own, p) > 40);
  assert.ok(Math.abs(mean(even, v) - mean(even, p)) < 1);
  for (const half of [p, v]) {
    const byOwn = [...half].sort((a, b) => (own.byName.get(a)?.rating ?? 0) - (own.byName.get(b)?.rating ?? 0));
    const ev = byOwn.map((n) => even.byName.get(n)?.rating ?? 0);
    for (let i = 1; i < ev.length; i++) assert.ok((ev[i] as number) >= (ev[i - 1] as number), 'order within a cube is kept');
  }
});
