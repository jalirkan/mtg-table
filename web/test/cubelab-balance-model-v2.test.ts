/*
 * mtg-table — web/test/cubelab-balance-model-v2.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * D475: the library card model v2 (tools/cubelab/balance-model.ts, balance-model-v2-cmd.ts):
 *
 *  - the prior covariate: a drafted fit recovers alpha (drafted value per census point) and shrinks each card toward
 *    alpha x its census value, a card with no drafted games keeping exactly that; a design without priors is v1's;
 *  - the analytic cells under the drafter's mix: v1's mix gives predictPayoffs exactly; equal classes give .5 in every
 *    colour; the makeup term of three-colour decks moves the pairs, not the colours; a stronger class lifts its colour;
 *  - the mix, the play shares and the concentration factor on hand-built decks; the cells from deck lists;
 *  - the robust gap and the robust search: a real class deficit is repaired, a minimum gain nothing can buy keeps the
 *    flow's cube;
 *  - real data, trimmed (fixtures/cubelab/balance-model-v2: ten J160 drafts of balanced-legacy-even-high, their games and the
 *    night's read, and the facts for that cube's cards): a night folder loads, the deck profile from the facts is the
 *    recorded one, and the TypeScript drafter re-drafts the recorded decks exactly from their seeds;
 *  - every committed v2 cube (cubes/library/balanced/v2/) is a clean 180 on the plan, its -nopower twin holds no
 *    powered card, and its header carries D475's gap line.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

import {
  analyticCells, analyticMap, balanceSearchRobust, buildDesign, CELL_KEYS, cellGap, concentration, DEFAULT_PENALTY, estimateMix, mixV1, playShares, predictDecks,
  predictPayoffs, predictPayoffsV2, robustGap, solveRidge, type DeckLite, type GenCard, type MDeck, type MGame,
} from '../../tools/cubelab/balance-model.ts';
import { loadNight, profileFromFacts, simulateDrafts } from '../../tools/cubelab/balance-model-v2-cmd.ts';
import type { Fact } from '../../tools/cubelab/cards.ts';
import { parseCube } from '../../tools/cubelab/cube.ts';
import { parseExcludeList } from '../../tools/cubelab/balance-model.ts';
import { parseLibraryPool, type LibraryCard } from '../../tools/cubelab/library-candidates.ts';
import { rng } from '../../tools/cubelab/rng.ts';
import { MONO, PAIRS, planErrors } from '../../tools/cubelab/skeleton.ts';
import { structurePlan } from '../../tools/cubelab/sample.ts';

const REPO = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const FIX = join(REPO, 'fixtures', 'cubelab', 'balance-model-v2');

test('the prior covariate: alpha is recovered, cards shrink toward alpha x census, no prior is v1', () => {
  const r = rng(475, 'prior');
  const cards = Array.from({ length: 80 }, (_, i) => `c${i}`);
  const census = new Map(cards.map((c) => [c, 0.02 * (r.next() * 2 - 1)]));
  const own = new Map(cards.map((c, i) => [c, i < 10 ? 0.03 : 0]));   // ten cards worth 3 points more in drafted decks
  const ALPHA = 0.8;
  const truth = (c: string): number => ALPHA * (census.get(c) as number) + (own.get(c) as number);
  const decks: MDeck[] = Array.from({ length: 1500 }, (_, i) => {
    const set = new Set<string>();
    while (set.size < 15) set.add(cards[r.int(cards.length)] as string);
    const spells = [...set];
    return { id: `d${i}`, spells, colours: 'WU', mainShare: 0.6, cluster: `d${i}`, prior: spells.reduce((s, c) => s + (census.get(c) as number), 0), priorKey: 'legacy' };
  });
  const val = (d: MDeck): number => d.spells.reduce((s, c) => s + truth(c), 0);
  const games: MGame[] = Array.from({ length: 30000 }, () => {
    const a = decks[r.int(decks.length)] as MDeck;
    let b = decks[r.int(decks.length)] as MDeck;
    while (b === a) b = decks[r.int(decks.length)] as MDeck;
    return { a: a.id, b: b.id, winner: r.next() < Math.min(0.95, Math.max(0.05, 0.5 + val(a) - val(b))) ? 'a' : 'b', first: r.next() < 0.5 ? 'a' : 'b' };
  });
  const ds = buildDesign(decks, games, 'makeup');
  assert.deepEqual(ds.covs, ['legacy']);
  assert.equal(ds.nFeat, ds.cards.length + ds.groups.length + 1 + 1);
  const beta = solveRidge(ds, { ...DEFAULT_PENALTY, card: 400 });
  const alpha = beta[ds.cards.length + ds.groups.length] as number;
  assert.ok(Math.abs(alpha - ALPHA) < 0.15, `alpha ${alpha} near ${ALPHA}`);
  const v = (c: string): number => (beta[ds.cards.indexOf(c)] as number) + alpha * (census.get(c) as number);
  const boosted = cards.slice(0, 10).reduce((s, c) => s + v(c) - alpha * (census.get(c) as number), 0) / 10;
  const plain = cards.slice(10).reduce((s, c) => s + v(c) - alpha * (census.get(c) as number), 0) / 70;
  assert.ok(boosted - plain > 0.015, `the drafted term finds the ten (+${boosted.toFixed(4)} against ${plain.toFixed(4)})`);
  // with a penalty nothing beats, every card is alpha x its census value
  const stiff = solveRidge(ds, { ...DEFAULT_PENALTY, card: 1e9 });
  for (let i = 0; i < ds.cards.length; i++) assert.ok(Math.abs(stiff[i] as number) < 1e-4);
  // no prior: no covariate, and the same numbers as a design built from the same decks without the fields
  const bare = decks.map(({ prior: _p, priorKey: _k, ...d }) => d);
  const d1 = buildDesign(bare, games, 'makeup'), d2 = buildDesign(decks.map((d) => ({ ...d, prior: undefined })), games, 'makeup');
  assert.deepEqual(d1.covs, []);
  assert.equal(d1.nFeat, d1.cards.length + d1.groups.length + 1);
  assert.deepEqual([...solveRidge(d1, { ...DEFAULT_PENALTY, card: 400 })], [...solveRidge(d2, { ...DEFAULT_PENALTY, card: 400 })]);
});

const cubeOf = (perClass: Record<string, number>): Array<{ name: string; colors: string; land: boolean; v: number }> =>
  ['', ...MONO, ...PAIRS].flatMap((k) => Array.from({ length: k.length === 2 ? 2 : k === '' ? 18 : 24 }, (_, i) => ({ name: `${k || 'C'}${i}`, colors: k, land: false, v: perClass[k] ?? 0 })));

test('the analytic cells: v1\'s mix is predictPayoffs, symmetry holds, the makeup term and a strong class do what they should', () => {
  const r = rng(475, 'analytic');
  const cube = cubeOf({}).map((c) => ({ ...c, v: 0.02 * (r.next() - 0.5) }));
  const val = new Map(cube.map((c) => [c.name, c.v]));
  const w = new Map(cube.map((c) => [c.name, 0.2 + r.next()]));
  const m = { perColour: 9.1, gold: 0.45, colourless: 4.2 };
  const a = predictPayoffs(cube, (n) => val.get(n) as number, 0, m, (n) => w.get(n) as number);
  const b = predictPayoffsV2(cube, (n) => val.get(n) as number, 0, mixV1(m), (n) => w.get(n) as number);
  for (const k of MONO) assert.ok(Math.abs((a.colour[k]?.est as number) - (b.colour[k]?.est as number)) < 1e-12);
  for (const k of PAIRS) assert.ok(Math.abs((a.pair[k]?.est as number) - (b.pair[k]?.est as number)) < 1e-12);
  const mix = { decks: 100, k3: 0.3, two: { perColour: 8.4, gold: 0.6, colourless: 5.3, splash: 0.3 }, three: { perColour: 5.6, gold: 1.3, colourless: 4.8 } };
  // equal classes, a makeup term that favours two-colour decks: every colour alike, and below .5, because a colour's own decks
  // are more often three-colour than its opponents' (six of the ten triples hold it, four of the ten pairs); the pairs move together
  const flatCube = cubeOf({ W: 0.01, U: 0.01, B: 0.01, R: 0.01, G: 0.01 });
  const p = predictPayoffsV2(flatCube, (n) => (flatCube.find((c) => c.name === n) as { v: number }).v, 0, mix, () => 1, (k) => (k === 2 ? 0.02 : -0.03));
  for (const k of MONO) assert.ok(Math.abs((p.colour[k]?.est as number) - (p.colour.W?.est as number)) < 1e-12, `${k} ${p.colour[k]?.est}`);
  assert.ok((p.colour.W?.est as number) < 0.5);
  const p0 = predictPayoffsV2(flatCube, (n) => (flatCube.find((c) => c.name === n) as { v: number }).v, 0, { ...mix, k3: 0 });
  for (const k of MONO) assert.ok(Math.abs((p0.colour[k]?.est as number) - 0.5) < 1e-12, 'with two-colour decks only, equal classes are .5');
  const pairs = PAIRS.map((k) => p.pair[k]?.est as number);
  assert.ok(Math.max(...pairs) - Math.min(...pairs) < 1e-12 && (pairs[0] as number) > 0.5, 'a pair beats a field that holds the weaker three-colour decks');
  // a stronger blue lifts blue and every blue pair
  const blue = cubeOf({ U: 0.01 });
  const q = predictPayoffsV2(blue, (n) => (blue.find((c) => c.name === n) as { v: number }).v, 0, mix);
  assert.ok((q.colour.U?.est as number) > 0.55);
  for (const k of PAIRS) assert.equal((q.pair[k]?.est as number) > 0.5, k.includes('U'), k);
  // the linear map agrees with the predictor
  const map = analyticMap(mix);
  const means = ['', ...MONO, ...PAIRS].map((k) => (k === 'U' ? 0.01 : 0));
  const cells = analyticCells(map, means);
  CELL_KEYS.forEach((k, i) => assert.ok(Math.abs((cells[i] as number) - ((i < 5 ? q.colour[k]?.est : q.pair[k]?.est) as number)) < 1e-12));
});

test('the mix, the play shares, the concentration factor and the cells from deck lists', () => {
  const colors = new Map([['w1', 'W'], ['w2', 'W'], ['u1', 'U'], ['u2', 'U'], ['wu', 'WU'], ['b1', 'B'], ['c1', ''], ['r1', 'R']]);
  const colorsOf = (n: string): string | undefined => colors.get(n);
  const decks: DeckLite[] = [
    { spells: ['w1', 'w2', 'u1', 'wu', 'c1', 'r1'], colours: 'WU' },
    { spells: ['w1', 'u1', 'u2', 'c1'], colours: 'WU' },
    { spells: ['w1', 'u1', 'b1', 'c1'], colours: 'WUB' },
    { spells: ['b1', 'r1'], colours: 'BR' },
  ];
  const mix = estimateMix(decks, colorsOf);
  assert.equal(mix.decks, 4);
  assert.equal(mix.k3, 0.25);
  assert.deepEqual(mix.two, { perColour: 8 / 3 / 2, gold: 1 / 3, colourless: 2 / 3, splash: 1 / 3 });
  assert.deepEqual(mix.three, { perColour: 1, gold: 0, colourless: 1 });
  const sh = playShares(decks, [...colors].map(([name, c]) => ({ name, colors: c })));
  assert.deepEqual(sh.get('w1'), { decks: 3, held: 3, share: 1 });
  assert.deepEqual(sh.get('wu'), { decks: 3, held: 1, share: 1 / 3 });
  // concentration: a card played as often as the curve says is 1; twice as often, 2
  const cube = [{ name: 'a', colors: 'W', land: false }, { name: 'b', colors: 'W', land: false }];
  const m2 = { decks: 10, k3: 0, two: { perColour: 1, gold: 0, colourless: 0, splash: 0 }, three: { perColour: 0, gold: 0, colourless: 0 } };
  const k = concentration(cube, new Map([['a', { decks: 100, share: 0.5 }], ['b', { decks: 100, share: 1 }]]), m2, () => 1);
  assert.ok(Math.abs((k.get('a') as number) - 1) < 1e-12 && Math.abs((k.get('b') as number) - 2) < 1e-12);
  // deck cells: a WU deck worth 4 points more than a BR deck beats it .54; no shared colour
  const pr = predictDecks([[{ spells: ['x'], colours: 'WU' }, { spells: ['y'], colours: 'BR' }]], (d) => (d.spells[0] === 'x' ? 0.04 : 0), 0);
  assert.ok(Math.abs((pr.colour.W?.est as number) - 0.54) < 1e-12 && Math.abs((pr.colour.B?.est as number) - 0.46) < 1e-12);
  assert.ok(Math.abs((pr.pair.WU?.est as number) - 0.54) < 1e-12 && Number.isNaN(pr.pair.WB?.est));
  assert.equal(pr.n.W, 1);
});

test('the robust gap and the robust search', () => {
  assert.ok(Math.abs(cellGap([0.52, 0.5, 0.49, 0.5, 0.5, ...Array(10).fill(0.5)]) - 0.02) < 1e-12);
  const withPair = [0.5, 0.5, 0.5, 0.5, 0.5, 0.56, ...Array(9).fill(0.5)];
  assert.ok(Math.abs(cellGap(withPair) - 0.06) < 1e-12);
  assert.equal(cellGap(withPair, PAIRS.map((p) => p !== 'WU')), 0, 'a pair the night would not judge does not count');
  assert.ok(Math.abs(robustGap([[0.51, ...Array(14).fill(0.5)], [0.53, ...Array(14).fill(0.5)]]).mean - 0.02) < 1e-12);
  // blue's cards are a point low; the pool holds blue cards at the level
  const r = rng(475, 'search');
  const mk = (name: string, colors: string, value: number, i: number): GenCard => ({ name, colors, mv: 1 + (i % 5), land: false, produces: '', creature: i % 2 === 0, rating: 60, value, sd: 0.005 });
  const cube: GenCard[] = ['', ...MONO, ...PAIRS].flatMap((k) => Array.from({ length: k.length === 2 ? 2 : k === '' ? 18 : 24 }, (_, i) => mk(`${k || 'C'}${i}`, k, k === 'U' ? -0.01 : 0, i)));
  const pool = [...cube, ...Array.from({ length: 30 }, (_, i) => mk(`newU${i}`, 'U', 0, i))];
  const noise = new Map(pool.map((c) => [c.name, Array.from({ length: 40 }, () => 0.004 * (r.next() * 2 - 1))]));
  const value = (n: string, rep: number): number => { const c = pool.find((x) => x.name === n) as GenCard; return (c.value as number) + (rep < 0 ? 0 : (noise.get(n) as number[])[rep] as number); };
  const mix = { decks: 100, k3: 0.2, two: { perColour: 8.4, gold: 0.6, colourless: 5.3, splash: 0.3 }, three: { perColour: 5.6, gold: 1.3, colourless: 4.8 } };
  const o = { target: 0, band: 0.03, minCreaturesPerColour: 10, maxSwaps: 30, ratingWindow: 25, minGain: 0.002, searchReps: Array.from({ length: 20 }, (_, i) => 2 * i) };
  const res = balanceSearchRobust(cube, pool, mix, () => 1, value, () => 0, o);
  assert.ok(res.swaps.length > 5, `swaps ${res.swaps.length}`);
  assert.ok(res.swaps.every((s) => s.out.startsWith('U') && s.in.startsWith('newU')), 'only blue moves');
  assert.ok(res.gap < res.startGap - 0.01, `${res.startGap} -> ${res.gap}`);
  const held = robustGap(Array.from({ length: 20 }, (_, i) => analyticCells(analyticMap(mix), ['', ...MONO, ...PAIRS].map((k) => { const xs = res.cards.filter((c) => c.colors === k); return xs.reduce((s, c) => s + value(c.name, 2 * i + 1), 0) / xs.length; }))));
  assert.ok(held.mean < res.startGap, 'the gain holds on replicates the search never saw');
  const none = balanceSearchRobust(cube, pool, mix, () => 1, value, () => 0, { ...o, minGain: 1 });
  assert.equal(none.swaps.length, 0, 'a minimum gain nothing can buy keeps the flow\'s cube');
  assert.deepEqual(none.cards.map((c) => c.name), cube.map((c) => c.name));
});

const factsFixture = (): { facts: Fact[]; factBy: Map<string, Fact> } => {
  const facts = (JSON.parse(gunzipSync(readFileSync(join(FIX, 'facts-legacy-even-high.json.gz'))).toString()) as { cards: Fact[] }).cards;
  const factBy = new Map<string, Fact>();
  for (const x of facts) { factBy.set(x.listed, x); if (x.name) factBy.set(x.name, x); }
  return { facts, factBy };
};

test('real data: a night folder loads, the profile is the recorded one, and the drafter re-drafts the recorded decks', () => {
  const nights = loadNight(REPO, join(FIX, 'report'), () => 'legacy');
  assert.equal(nights.length, 1);
  const n = nights[0] as (typeof nights)[number];
  assert.equal(n.night, 'balance-model-v2');
  assert.equal(n.cube, 'balanced-legacy-even-high');
  assert.equal(n.decks.length, 20);
  assert.equal(n.games.length, 20);
  assert.ok(n.blab && Math.abs((n.blab.colour.U?.est as number) - 0.5657) < 1e-9, 'the night\'s read: blue .566');
  for (const g of n.games) assert.ok(n.decks.some((d) => d.id === g.a) && n.decks.some((d) => d.id === g.b));
  const { facts, factBy } = factsFixture();
  const raw = gunzipSync(readFileSync(join(FIX, 'report', 'balanced-legacy-even-high.drafted-decks.jsonl.gz'))).toString().split('\n').filter(Boolean)
    .map((l) => JSON.parse(l) as { id: string; draft: number; seat: string; colours3: string; spells: string[]; profile: { mainShare: number } });
  for (const d of raw) {
    const p = profileFromFacts(d.spells, factBy);
    assert.equal(p.colours, d.colours3, d.id);
    assert.equal(p.mainShare, d.profile.mainShare, d.id);
  }
  const text = readFileSync(join(REPO, 'cubes', 'library', 'balanced', 'balanced-legacy-even-high.md'), 'utf8');
  const first = Math.min(...raw.map((d) => d.draft));
  const sim = simulateDrafts(text, facts, factBy, 10, first, 'legacy');
  assert.equal(sim.length, 10);
  sim.forEach(([a, b], i) => {
    for (const [seat, d] of [['A', a], ['B', b]] as const) {
      const rec = raw.find((x) => x.draft === first + i && x.seat === seat);
      assert.ok(rec, `${first + i}${seat} recorded`);
      assert.deepEqual([...d.spells].sort(), [...rec.spells].sort(), `draft ${first + i} seat ${seat}: the same deck`);
      assert.equal(d.colours, rec.colours3);
    }
  });
});

test('every committed v2 cube is a clean 180 on the plan, -nopower holds no powered card, and its header carries D475\'s gap', () => {
  const lib = new Map(parseLibraryPool(readFileSync(join(REPO, 'cubes', 'library', 'library-pool.tsv'), 'utf8')).map((c) => [c.name, c]));
  const powered = new Set(parseExcludeList(readFileSync(join(REPO, 'cubes', 'library', 'powered-exclude.txt'), 'utf8')));
  const dir = join(REPO, 'cubes', 'library', 'balanced', 'v2');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
  for (const want of ['balanced-v2-legacy-even-high.md', 'balanced-v2-legacy-even-high-nopower.md', 'balanced-v2-legacy-even-mid.md', 'balanced-v2-legacy-even-mid-nopower.md', 'balanced-v2-pauper-even.md']) assert.ok(files.includes(want), `${want} is committed`);
  const v1 = readdirSync(join(REPO, 'cubes', 'library', 'balanced')).filter((f) => f.endsWith('.md'));
  for (const f of files) {
    assert.ok(!v1.includes(f), `${f}: a v2 id is not a v1 id (a night's decks name their cube by id)`);
    const text = readFileSync(join(dir, f), 'utf8');
    const cube = parseCube(text);
    assert.deepEqual(cube.warnings, [], f);
    assert.equal(cube.cards.length, 180, f);
    const rows = cube.cards.map((c) => lib.get(c.name));
    for (const r of rows) { assert.ok(r && r.supported && r.aiFlag !== 'All', `${f}: ${r?.name}`); }
    assert.deepEqual(planErrors(rows as LibraryCard[], structurePlan('two-colour')), [], f);
    if (f.includes('-nopower')) for (const c of cube.cards) assert.ok(!powered.has(c.name), `${f}: ${c.name} is powered`);
    assert.match(text, /model v2 \(D475/, f);
    assert.match(text, /with the transfer error as well 0\.\d{3}/, f);
  }
});
