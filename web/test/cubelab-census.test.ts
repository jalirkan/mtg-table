/*
 * mtg-table — web/test/cubelab-census.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The library census's population and its stratified sampler (tools/cubelab/census.ts,
 * tools/cubelab/sample.ts; D445, Phase 0), engine-free:
 *
 *  - census.tsv: one row a card of library-pool.tsv (1,592), exactly its columns, the pool's facts
 *    copied, every label provisional, and every row's band what the written rule gives from the
 *    row's own rarity and membership; the powered list is the file's and is all library cards;
 *  - the band rule on known cards (Black Lotus, Sol Ring, Lightning Bolt, Counterspell, Thalia ...);
 *  - the edition reader (L as C, tokens skipped, a set's own edition named first) and the build's
 *    determinism and `--check` on a small hand-made library in a scratch folder;
 *  - the sampler: deterministic by seed (cubes and the command's bytes), every band x structure's
 *    cube is what `tools/cubelab.sh check` needs (180 cards, no parse warning, every card a supported
 *    library card) and evolve can write it back, each structure's counts hold, the cross-band share
 *    is within 2 points of the ask over 20 cubes, AI-flagged cards only when asked, and a census
 *    built from another pool is refused;
 *  - selectSlots' own arithmetic on a small hand-made case.
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  BANDS, bandOf, CENSUS_COLUMNS, censusCommand, censusText, lowestPrintings, parseCensus, parseEdition, POWERED, POWERED_NAMES, readCensusInputs, recordedInputs,
  RESTRICTED_AT_COMMON,
} from '../../tools/cubelab/census.ts';
import { parseCube } from '../../tools/cubelab/cube.ts';
import { writeCubeDoc } from '../../tools/cubelab/cubedoc.ts';
import { parseLibraryPool, POOL_COLUMNS } from '../../tools/cubelab/library-candidates.ts';
import {
  joinCensus, NEIGHBOURS, SAMPLE_BANDS, sampleCommand, sampleCube, sampleDocument, STRUCTURES, structurePlan, type SampleOptions, type Structure,
} from '../../tools/cubelab/sample.ts';
import { fixesPair, landGroupsOf, MONO, PAIRS, planErrors, selectSlots, skeletonErrors, sumOf } from '../../tools/cubelab/skeleton.ts';

const REPO = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const DIR = join(REPO, 'cubes', 'library');
const poolText = readFileSync(join(DIR, 'library-pool.tsv'), 'utf8');
const censusTextCommitted = readFileSync(join(DIR, 'census.tsv'), 'utf8');
const pool = parseLibraryPool(poolText);
const census = parseCensus(censusTextCommitted);
const row = new Map(census.map((r) => [r.name, r]));
const lib = joinCensus(pool, census);
const byName = new Map(pool.map((c) => [c.name, c]));
const themeNames = parseCube(readFileSync(join(REPO, 'cubes', 'omega-cube-180.md'), 'utf8')).themeNames;
const quiet = (): void => {};

test('census.tsv: one row a card of library-pool.tsv, its columns, the pool\'s facts, every label provisional', () => {
  assert.equal(census.length, 1592, 'the library\'s 1,592 cards');
  assert.equal(census.length, pool.length);
  const header = censusTextCommitted.split('\n').find((l) => !l.startsWith('#')) as string;
  assert.deepEqual(header.split('\t'), [...CENSUS_COLUMNS], 'exactly the census columns, in order');
  assert.deepEqual(census.map((r) => r.name), pool.map((c) => c.name), 'the pool\'s names, in its order');
  for (const c of pool) {
    const r = row.get(c.name)!;
    assert.deepEqual([r.sources, r.supported, r.aiFlag, r.identity, r.type, r.mv], [c.sources, c.supported, c.aiFlag, c.identity, c.type, c.mv], `${c.name}: the pool's facts`);
    assert.equal(r.provisional, true, `${c.name}: provisional`);
    assert.ok(r.labGames >= 0);
    if (r.labWr !== null) assert.ok(r.labGames >= 80 && r.labWr > 0 && r.labWr < 1, `${c.name}: a rate only at 80+ games`);
    if (r.labGames >= 80) assert.notEqual(r.labWr, null, `${c.name}: 80+ games carry a rate`);
  }
  assert.ok(POOL_COLUMNS.includes('lab_games'));
  assert.equal(recordedInputs(censusTextCommitted).size >= 3, true, 'the header records its inputs\' hashes');
});

test('census.tsv: every band is the written rule applied to the row\'s own rarity and membership', () => {
  for (const r of census) {
    const want = bandOf(r.name, r.lowestRarity, r.member);
    assert.deepEqual([r.band, r.bandSource], [want.band, want.source], r.name);
    assert.equal(r.member.vintage, r.sources.some((s) => s === 'vintage180' || s === 'mtgovc'), `${r.name}: member_vintage`);
    assert.equal(r.member.pauper, r.sources.includes('pauper'), `${r.name}: member_pauper`);
  }
  const names = POWERED.flatMap((g) => g.names);
  assert.equal(new Set(names).size, names.length, 'the powered list names a card once');
  for (const n of names) assert.equal(row.get(n)?.band, 'powered', `${n} is a library card, and powered`);
  assert.equal(census.filter((r) => r.band === 'powered').length, names.length, 'powered is the list and nothing else');
  for (const n of POWERED[0]!.names.concat(POWERED[1]!.names)) assert.ok(censusTextCommitted.includes(n), `${n} written in the header`);
  for (const n of RESTRICTED_AT_COMMON) assert.ok(!POWERED_NAMES.has(n) && row.get(n)?.lowestRarity === 'C', `${n}: restricted, printed at common, banded by rarity`);
  for (const b of BANDS) assert.ok(census.some((r) => r.band === b), `some card is ${b}`);
  const noPrint = census.filter((r) => !r.lowestRarity);
  assert.ok(noPrint.every((r) => r.bandSource.startsWith('membership:') || r.bandSource === 'powered-list'));
  assert.ok(noPrint.every((r) => !r.supported), 'only a card Forge lacks has no printing');
});

test('the band rule on known cards', () => {
  const want: Array<[string, string, string]> = [
    ['Black Lotus', 'powered', 'powered-list'],
    ['Mox Sapphire', 'powered', 'powered-list'],
    ['Tundra', 'powered', 'powered-list'],
    ['Sol Ring', 'powered', 'powered-list'],            // a common printing (30A) does not move it
    ['Strip Mine', 'powered', 'powered-list'],
    ['Demonic Tutor', 'powered', 'powered-list'],       // an uncommon, restricted
    ['Lightning Bolt', 'pauper', 'rarity:C'],
    ['Counterspell', 'pauper', 'rarity:C'],
    ['Brainstorm', 'pauper', 'rarity:C'],               // restricted in Vintage, but a common
    ['Dark Ritual', 'pauper', 'rarity:C'],
    ['Swords to Plowshares', 'peasant', 'rarity:U'],
    ['Mana Drain', 'peasant', 'rarity:U'],
    ['Thalia, Guardian of Thraben', 'legacy', 'rarity:R'],   // never printed below rare
    ['Snapcaster Mage', 'legacy', 'rarity:R'],
    ['Fblthp, Knows the Way', 'legacy', 'membership:other'], // Forge 2.0.14 lacks it: no printing, a vintage list only
  ];
  for (const [n, band, source] of want) assert.deepEqual([row.get(n)?.band, row.get(n)?.bandSource], [band, source], n);
  assert.equal(row.get('Sol Ring')?.lowestRarity, 'C');
  assert.equal(row.get('Lightning Bolt')?.lowestRaritySet, 'LEA');
  assert.equal(row.get('Thalia, Guardian of Thraben')?.lowestRaritySet, 'DKA', 'a set\'s own edition is named before an online promo');
  // the membership tiebreak, on its own
  const m = { vintage: false, legacy: false, peasant: true, pauper: false };
  assert.deepEqual(bandOf('x', '', m), { band: 'peasant', source: 'membership:peasant' });
  assert.deepEqual(bandOf('x', '', { ...m, pauper: true }), { band: 'pauper', source: 'membership:pauper' });
  assert.deepEqual(bandOf('x', 'M', { ...m, pauper: true }), { band: 'legacy', source: 'rarity:M' }, 'a printing outranks membership');
});

// ---------------------------------------------------------------- a hand-made library

const EDITION_A = '[metadata]\nCode=AAA\nDate=1994-01-01\nType=Expansion\n[cards]\n1 R Alpha Card @Someone\n2 U Beta Card @X\n3 L Plains @Y\n4 M Mox Pearl\n[tokens]\n1 C Gamma Card\n';
const EDITION_B = '[metadata]\nCode=BBB\nDate=1990-01-01\nType=Online\n[cards]\n7 C Beta Card ${"flavorName": "Other"}\n8 R Alpha Card\n[borderless]\n9 C Delta Card @Z\n';
const EDITION_C = '[metadata]\nCode=CCC\nDate=2001-01-01\nType=Core\n[cards]\n5 C Beta Card\n';

test('the edition reader: rarities, L as C, tokens skipped, a paper set named first', () => {
  const a = parseEdition(EDITION_A);
  assert.deepEqual([a.code, a.date, a.type], ['AAA', '1994-01-01', 'Expansion']);
  assert.deepEqual(a.cards.map((c) => `${c.rarity} ${c.name}`), ['R Alpha Card', 'U Beta Card', 'C Plains', 'M Mox Pearl'], 'tokens skipped, artist dropped, L read as C');
  const low = lowestPrintings([{ file: 'a.txt', text: EDITION_A }, { file: 'b.txt', text: EDITION_B }, { file: 'c.txt', text: EDITION_C }]);
  assert.deepEqual(low.get('Beta Card'), { rarity: 'C', set: 'CCC', date: '2001-01-01', type: 'Core' }, 'C beats U; the Core set beats the earlier Online one');
  assert.equal(low.get('Alpha Card')?.set, 'AAA');
  assert.equal(low.get('Delta Card')?.rarity, 'C', 'a printing section other than [cards] counts');
  assert.equal(low.has('Gamma Card'), false);
});

function scratchLibrary(): { root: string; fc: string; editions: string; pool: string } {
  const root = mkdtempSync(join(tmpdir(), 'census-'));
  const fc = join(root, 'fc'), editions = join(root, 'editions');
  mkdirSync(join(fc, 'public', 'cubes'), { recursive: true });
  mkdirSync(editions);
  writeFileSync(join(editions, 'a.txt'), EDITION_A);
  writeFileSync(join(editions, 'b.txt'), EDITION_B);
  writeFileSync(join(editions, 'c.txt'), EDITION_C);
  // the hand-made pool holds every powered name (the build refuses a list naming a card the library lacks)
  const names = [...new Set(['Alpha Card', 'Beta Card', 'Delta Card', 'Unprinted Card', ...POWERED.flatMap((g) => g.names)])].sort();
  const lines = names.map((n) => [n, 'W', 'Creature', '2', '', n === 'Unprinted Card' ? 'pauper' : 'omega', 'yes', 'none', 'W', '', '0', '', ''].join('\t'));
  writeFileSync(join(root, 'pool.tsv'), `# a hand-made pool\n${POOL_COLUMNS.join('\t')}\n${lines.join('\n')}\n`);
  writeFileSync(join(fc, 'public', 'cubes', 'x.meta.json'), JSON.stringify({ cards: { 'Alpha Card': { games: 100, winRateShrunk: 0.6 }, 'Beta Card': { games: 50, winRateShrunk: 0.4 } } }));
  writeFileSync(join(fc, 'public', 'cubes', 'y.meta.json'), JSON.stringify({ cards: { 'Alpha Card': { games: 300, winRateShrunk: 0.5 } } }));
  return { root, fc, editions, pool: join(root, 'pool.tsv') };
}

test('census build: deterministic, games-weighted lab numbers, and --check says when it is stale', () => {
  const s = scratchLibrary();
  try {
    const inp = readCensusInputs(REPO, s.pool, s.editions, s.fc);
    const one = censusText(inp), two = censusText(readCensusInputs(REPO, s.pool, s.editions, s.fc));
    assert.equal(one.text, two.text, 'the same inputs, the same bytes');
    const r = new Map(one.rows.map((x) => [x.name, x]));
    assert.equal(r.get('Alpha Card')?.labGames, 400);
    assert.equal(r.get('Alpha Card')?.labWr?.toFixed(4), ((100 * 0.6 + 300 * 0.5) / 400).toFixed(4), 'games-weighted');
    assert.equal(r.get('Beta Card')?.labWr, null, 'blank under 80 games');
    assert.deepEqual([r.get('Beta Card')?.band, r.get('Alpha Card')?.band, r.get('Unprinted Card')?.band], ['pauper', 'legacy', 'pauper']);
    assert.equal(r.get('Unprinted Card')?.bandSource, 'membership:pauper');
    assert.equal(r.get('Mox Pearl')?.band, 'powered');
    const out = join(s.root, 'census.tsv');
    const f = (check: boolean): Map<string, string[]> => new Map([['fc', [s.fc]], ['editions', [s.editions]], ['pool', [s.pool]], ['out', [out]], ...(check ? [['check', ['1']] as [string, string[]]] : [])]);
    assert.equal(censusCommand(REPO, ['build'], f(true), quiet), 1, 'missing: stale');
    assert.equal(censusCommand(REPO, ['build'], f(false), quiet), 0);
    assert.equal(readFileSync(out, 'utf8'), one.text);
    assert.equal(censusCommand(REPO, ['build'], f(true), quiet), 0, 'current');
    writeFileSync(join(s.fc, 'public', 'cubes', 'y.meta.json'), JSON.stringify({ cards: { 'Alpha Card': { games: 301, winRateShrunk: 0.5 } } }));
    const said: string[] = [];
    assert.equal(censusCommand(REPO, ['build'], f(true), (x) => said.push(x)), 1, 'a meta moved: stale');
    assert.match(said.join('\n'), /inputs changed: meta:y/);
  } finally { rmSync(s.root, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------- the sampler

const opts = (band: SampleOptions['band'], structure: Structure, index = 1, seed = 11): SampleOptions => ({ band, structure, seed, index, crossBand: band === 'all' ? 0 : 0.1, allowAiFlagged: false });
const names = (cs: Array<{ name: string }>): string[] => cs.map((c) => c.name).sort();

test('the sampler is deterministic by seed', () => {
  const a = sampleCube(lib, opts('pauper', 'two-colour')), b = sampleCube(lib, opts('pauper', 'two-colour'));
  assert.deepEqual(names(a.cards), names(b.cards));
  const doc = (r: typeof a): string => sampleDocument(r, { ...opts('pauper', 'two-colour'), count: 1, censusSha: 'x', poolSha: 'y', themeNames });
  assert.equal(doc(a), doc(b), 'the same document, byte for byte');
  assert.notDeepEqual(names(sampleCube(lib, opts('pauper', 'two-colour', 1, 12)).cards), names(a.cards), 'another seed, another cube');
  assert.notDeepEqual(names(sampleCube(lib, opts('pauper', 'two-colour', 2)).cards), names(a.cards), 'another index, another cube');
});

test('every band x structure: a cube `check` passes, evolve can write back, the plan exact', () => {
  for (const band of SAMPLE_BANDS) {
    for (const structure of STRUCTURES) {
      const o = opts(band, structure);
      const res = sampleCube(lib, o);
      const id = `${band}/${structure}`;
      const text = sampleDocument(res, { ...o, count: 1, censusSha: 'x', poolSha: 'y', themeNames });
      const cube = parseCube(text);
      assert.deepEqual(cube.warnings, [], `${id}: parse warnings`);
      assert.equal(cube.cards.length, 180, `${id}: 180 cards`);
      assert.equal(new Set(cube.cards.map((c) => c.name)).size, 180, `${id}: no duplicates`);
      for (const c of cube.cards) {
        const p = byName.get(c.name);
        assert.ok(p?.supported, `${id}: ${c.name} is a supported library card (check's MISSING is 0)`);
        assert.notEqual(p?.aiFlag, 'All', `${id}: ${c.name} is not AI:RemoveDeck:All`);
      }
      assert.deepEqual(names(cube.cards), names(res.cards), `${id}: the document lists the cube`);
      assert.equal(writeCubeDoc(text, cube.cards), text, `${id}: written back unchanged`);
      assert.match(cube.title, /version 1/);
      assert.deepEqual(planErrors(res.cards, res.plan), [], `${id}: the plan`);
      for (const k of [`band ${band}`, `structure ${structure}`, 'seed 11', 'Eligible: ', 'Skeleton (']) assert.ok(text.includes(k), `${id}: the header says "${k}"`);
      if (band !== 'all') {
        const inBand = res.cards.filter((c) => c.band === band).length;
        assert.ok(inBand >= (band === 'powered' ? 20 : 120), `${id}: ${inBand} in-band cards`);
        for (const c of res.cards) if (res.role.get(c.name) === 'cross') assert.ok(NEIGHBOURS[band].includes(c.band), `${id}: ${c.name} crosses from a neighbour`);
      }
    }
  }
});

test('each structure\'s counts hold', () => {
  const nonland = (cs: Array<{ land: boolean }>): number => cs.filter((c) => !c.land).length;
  for (const band of ['pauper', 'legacy'] as const) {
    // two-colour is Omega's skeleton; in legacy every pair has lands of exactly its colours, so Omega's own check passes
    const two = sampleCube(lib, opts(band, 'two-colour'));
    if (band === 'legacy') assert.deepEqual(skeletonErrors(two.cards), []);
    assert.equal(two.cards.filter((c) => c.land).length, 22);
    // mono-heavy: one colour 60, the other four present, light fixing
    for (let i = 1; i <= 5; i++) {
      const m = sampleCube(lib, opts(band, 'mono-heavy', i));
      const by = Object.fromEntries(MONO.map((k) => [k, m.cards.filter((c) => !c.land && c.colors === k).length]));
      assert.equal(by[m.main!], 60, `${band} mono-heavy ${i}: ${m.main} has 60`);
      for (const k of MONO) if (k !== m.main) assert.equal(by[k], 18, `${band} mono-heavy ${i}: ${k} present`);
      assert.equal(m.cards.filter((c) => c.land).length, 16);
      assert.ok(m.cards.filter((c) => c.land && fixesPair(c)).length <= 10, 'at most one land of exactly a pair, a pair');
    }
    const mains = new Set([1, 2, 3, 4, 5].map((i) => sampleCube(lib, opts(band, 'mono-heavy', i)).main));
    assert.equal(mains.size, 5, 'five cubes, five main colours');
    // three-colour: 3 gold a pair, 30 lands, every pair three land slots
    const three = sampleCube(lib, opts(band, 'three-colour'));
    for (const p of PAIRS) assert.equal(three.cards.filter((c) => !c.land && c.colors === p).length, 3, `${band} three-colour: 3 ${p} gold`);
    const lands3 = three.cards.filter((c) => c.land);
    assert.equal(lands3.length, 30);
    for (const p of PAIRS) assert.ok(lands3.filter((c) => landGroupsOf(three.plan, c.produces).some((g) => g.group === `pair:${p}`)).length >= 3, `${band} three-colour: ${p} fixed three times`);
    assert.equal(nonland(three.cards), 150);
    // good-stuff: colour-even, 20 gold of any colours, 20 fixers
    const good = sampleCube(lib, opts(band, 'good-stuff'));
    for (const k of MONO) assert.equal(good.cards.filter((c) => !c.land && c.colors === k).length, 24);
    assert.equal(good.cards.filter((c) => !c.land && c.colors.length >= 2).length, 20);
    assert.equal(good.cards.filter((c) => c.land && c.produces.length >= 2).length, 20);
    assert.equal(sumOf(structurePlan('good-stuff').lands), 22);
  }
  assert.ok(sampleCube(lib, opts('all', 'good-stuff')).cards.some((c) => !c.land && c.colors.length >= 3)
    || [2, 3, 4].some((i) => sampleCube(lib, opts('all', 'good-stuff', i)).cards.some((c) => !c.land && c.colors.length >= 3)), 'good-stuff admits three-colour and five-colour gold');
});

test('the cross-band share is within 2 points of the ask over 20 cubes, and 0 when asked for none', () => {
  for (const [band, structure] of [['pauper', 'two-colour'], ['peasant', 'three-colour']] as const) {
    let cross = 0, total = 0;
    for (let i = 1; i <= 20; i++) {
      const res = sampleCube(lib, opts(band, structure, i));
      cross += res.cards.filter((c) => res.role.get(c.name) === 'cross').length;
      total += res.cards.length;
    }
    const share = (100 * cross) / total;
    assert.ok(Math.abs(share - 10) <= 2, `${band}/${structure}: cross-band ${share.toFixed(2)}% for an ask of 10%`);
  }
  const none = sampleCube(lib, { ...opts('legacy', 'two-colour'), crossBand: 0 });
  assert.equal(none.cards.filter((c) => none.role.get(c.name) === 'cross').length, 0);
  assert.equal(none.cards.filter((c) => c.band !== 'legacy').length, 0, 'legacy fills every slot itself');
});

test('AI-flagged cards only when asked', () => {
  const flagged = new Set(pool.filter((c) => c.aiFlag === 'All' && c.supported).map((c) => c.name));
  assert.ok(flagged.size > 0);
  const off = sampleCube(lib, opts('all', 'two-colour'));
  const on = sampleCube(lib, { ...opts('all', 'two-colour'), allowAiFlagged: true });
  assert.equal(off.cards.filter((c) => flagged.has(c.name)).length, 0);
  assert.ok(on.eligible === off.eligible + flagged.size);
  let any = on.cards.some((c) => flagged.has(c.name));
  for (let i = 2; !any && i <= 5; i++) any = sampleCube(lib, { ...opts('all', 'two-colour', i), allowAiFlagged: true }).cards.some((c) => flagged.has(c.name));
  assert.ok(any, 'with --allow-ai-flagged they are drawn');
});

test('sample, the command: N files and a manifest, the same bytes twice, and a stale census refused', () => {
  const root = mkdtempSync(join(tmpdir(), 'sample-'));
  try {
    const f = (out: string): Map<string, string[]> => new Map([['band', ['peasant']], ['structure', ['mono-heavy']], ['seed', ['5']], ['count', ['3']], ['out', [out]]]);
    assert.equal(sampleCommand(REPO, f(join(root, 'a')), quiet), 0);
    assert.equal(sampleCommand(REPO, f(join(root, 'b')), quiet), 0);
    const files = readdirSync(join(root, 'a')).sort();
    assert.deepEqual(files, ['peasant-mono-heavy-5-001.md', 'peasant-mono-heavy-5-002.md', 'peasant-mono-heavy-5-003.md', 'peasant-mono-heavy-5.tsv']);
    for (const x of files) assert.equal(readFileSync(join(root, 'a', x), 'utf8'), readFileSync(join(root, 'b', x), 'utf8'), `${x}: deterministic`);
    const manifest = readFileSync(join(root, 'a', 'peasant-mono-heavy-5.tsv'), 'utf8').split('\n').filter((l) => l && !l.startsWith('#'));
    assert.equal(manifest.length, 4);
    for (const l of manifest.slice(1)) assert.equal(l.split('\t')[6], '180');
    // another pool than the census was built from is refused
    writeFileSync(join(root, 'pool.tsv'), poolText.replace('Aang', 'Aang '));
    assert.throws(() => sampleCommand(REPO, new Map([...f(join(root, 'c')), ['pool', [join(root, 'pool.tsv')]]]), quiet), /census build/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('selectSlots: an item offering two groups is taken once, costs decide, and an impossible plan is refused', () => {
  const items = [{ n: 'a', b: 0 }, { n: 'b', b: 0 }, { n: 'c', b: 1 }];
  // a can fill X (cost 5) or Y (cost 1); b only X (cost 2); c only Y (cost 9)
  const opt: Record<string, Array<{ group: string; cost: number }>> = { a: [{ group: 'X', cost: 5 }, { group: 'Y', cost: 1 }], b: [{ group: 'X', cost: 2 }], c: [{ group: 'Y', cost: 9 }] };
  const got = selectSlots(items, { X: 1, Y: 1 }, [2, 0], (i) => opt[i.n]!, (i) => i.b);
  assert.deepEqual(got.map((g) => `${g.item.n}:${g.group}`), ['a:Y', 'b:X'], 'a fills Y, b fills X: cost 3, and c (bucket 1 has no room) is not taken');
  assert.deepEqual(selectSlots(items, { X: 2 }, [2, 0], (i) => opt[i.n]!, (i) => i.b).map((g) => g.item.n), ['a', 'b']);
  assert.throws(() => selectSlots(items, { X: 3 }, [3, 0], (i) => opt[i.n]!, (i) => i.b), /cannot be filled/, 'two items for three X slots');
});
