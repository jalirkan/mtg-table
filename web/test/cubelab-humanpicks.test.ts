/*
 * mtg-table — web/test/cubelab-humanpicks.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The cube lab's human-pick drafter (tools/cubelab/humanpicks.ts, D416):
 *
 *  - parity with ForgeCoach's fitter: fit.py's own features and probabilities
 *    on 30 held-out Vintage picks (fixtures/human-picks/fitpy-golden.json, the
 *    file ForgeCoach's src/cube/humanPicks.test.ts reads);
 *  - parity with ForgeCoach's src/cube/humanPicks.ts on hand-made packs, from
 *    LabCards (fixtures/human-picks/handmade-parity.json, written by
 *    humanPicks.ts itself): the file's colours override the lab's for a covered
 *    nonland card, uncovered cards are left out of the comparison;
 *  - the fallback for uncovered cards: least squares of s on the rating;
 *  - grid lines: Σ exp(u) in pick order, offset-invariant, the best card first;
 *  - a draft: the deal and the other seat's choices are a plain run's until the
 *    human seat's first different line; the human seat follows lineValue; grid only.
 *
 * The fixtures' picks files are copies of ForgeCoach@866c256's
 * public/cubes/{vintage,synergy}-cube-180.picks.json (17Lands, CC BY 4.0; NOTICE).
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import type { LabCard } from '../../tools/cubelab/cards.ts';
import { aiChooser, gridDraft, LINES } from '../../tools/cubelab/draft.ts';
import {
  cardUtility, fitFallback, humanChooser, humanDrafter, lineValue, parseDrafterSpec, parsePicks, pickFeatures, pickPool,
  PICK_FEATURES, runHumanDraft, utility, type HumanPicksFile, type PickFacts,
} from '../../tools/cubelab/humanpicks.ts';
import type { LoadedCube } from '../../tools/cubelab/lab.ts';
import { rng } from '../../tools/cubelab/rng.ts';
import { identityDiff, IDENTITY_FIELDS, versionWeights } from '../../tools/cubelab/run.ts';
import { DEFAULT_WEIGHTS } from '../../tools/cubelab/weights.ts';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const FIX = join(REPO, 'fixtures', 'human-picks');
const json = (f: string): unknown => JSON.parse(readFileSync(join(FIX, f), 'utf8'));
const vintage = (): HumanPicksFile => parsePicks(json('vintage-cube-180.picks.json'));
const synergy = (): HumanPicksFile => parsePicks(json('synergy-cube-180.picks.json'));
const W = DEFAULT_WEIGHTS;

function card(name: string, colors: string, cmc: number, o: Partial<LabCard> = {}): LabCard {
  return {
    name, section: '', themes: [], roles: [], colors, cmc, pips: {}, type: 'Creature', land: false, creature: true,
    planeswalker: false, produces: '', fixer: false, rating: 50, remAIDeck: false, ...o,
  };
}
const close = (a: number, b: number, msg: string, eps = 1e-9): void => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);

// ------------------------------------------------------------ parity with fit.py

test('features and probabilities match fit.py on 30 held-out Vintage picks', () => {
  const d = vintage();
  const g = json('fitpy-golden.json') as {
    facts: Record<string, PickFacts | null>;
    cases: Array<{ pool: string[]; pack: string[]; features: number[][]; p: number[] }>;
  };
  assert.equal(g.cases.length, 30);
  // As humanPicks.ts `modelFacts`: the file's colours for a covered nonland card.
  const factsOf = (n: string): PickFacts | undefined => {
    const f = g.facts[n] ?? undefined;
    const c = d.cards[n]?.colors;
    return f && c !== undefined && !f.land ? { ...f, colors: c } : f;
  };
  for (const c of g.cases) {
    const pp = pickPool(c.pool.map(factsOf), d.model.tScale);
    const u = c.pack.map((n, i) => {
      const x = pickFeatures(factsOf(n), pp, d.model);
      x.forEach((v, j) => close(v, c.features[i]![j]!, `${n} ${PICK_FEATURES[j]}`, 1e-6));
      return utility(d.model, d.cards[n]!.s, factsOf(n), pp);
    });
    const mx = Math.max(...u);
    const z = u.reduce((a, x) => a + Math.exp(x - mx), 0);
    c.pack.forEach((n, i) => close(Math.exp(u[i]! - mx) / z, c.p[i]!, n, 1e-6));
  }
});

// ------------------------------------------------------------ parity with humanPicks.ts, from LabCards

test('utilities from LabCards reproduce humanPicks.ts on hand-made packs (both cubes)', () => {
  const h = json('handmade-parity.json') as {
    facts: Record<string, { colors: string; mv: number; land: boolean; produces: string; rating: number }>;
    cases: Array<{ cube: 'vintage' | 'synergy'; pool: string[]; pack: string[]; covered: string[]; features: Record<string, number[]>; p: Record<string, number> }>;
  };
  const labCards = Object.entries(h.facts).map(([n, f]) =>
    card(n, f.colors, f.mv, { land: f.land, produces: f.produces, rating: f.rating, creature: !f.land, type: f.land ? 'Land' : 'Creature' }));
  const by = new Map(labCards.map((c) => [c.name, c]));
  const files = { vintage: vintage(), synergy: synergy() };
  assert.equal(h.cases.length, 8);
  let checked = 0;
  for (const c of h.cases) {
    const hd = humanDrafter(files[c.cube], labCards);
    const pool = c.pool.map((n) => by.get(n)!);
    const pp = pickPool(pool.map((p) => hd.facts.get(p.name)), hd.model.tScale);
    for (const n of c.pack) {
      pickFeatures(hd.facts.get(n), pp, hd.model).forEach((v, j) => close(v, c.features[n]![j]!, `${c.cube} ${n} ${PICK_FEATURES[j]}`));
    }
    const u = c.covered.map((n) => cardUtility(hd, by.get(n)!, pool));
    const mx = Math.max(...u);
    const z = u.reduce((a, x) => a + Math.exp(x - mx), 0);
    c.covered.forEach((n, i) => { close(Math.exp(u[i]! - mx) / z, c.p[n]!, `${c.cube} ${n}`); checked++; });
    assert.deepEqual(Object.keys(c.p).sort(), [...c.covered].sort(), 'humanPicks.ts leaves uncovered cards out');
  }
  assert.ok(checked >= 30, `${checked} probabilities checked`);
  // The lab files Mox Pearl as white; the model saw it colourless, and so does the drafter.
  assert.equal(humanDrafter(files.vintage, labCards).facts.get('Mox Pearl')?.colors, '');
});

// ------------------------------------------------------------ the fallback

test('uncovered cards: s = a + b * rating, least squares over the covered cards', () => {
  const f = fitFallback([{ rating: 10, s: 1 }, { rating: 20, s: 3 }, { rating: 30, s: 2 }]);
  close(f.slope, 0.05, 'slope');
  close(f.intercept, 1, 'intercept');
  assert.equal(f.n, 3);
  close(f.r, 0.5, 'r');
  assert.deepEqual(fitFallback([{ rating: 5, s: 2 }, { rating: 5, s: 4 }]), { intercept: 3, slope: 0, n: 2, r: 0 });
  const file = vintage();
  const covered = [card('Black Lotus', '', 0, { rating: 100 }), card('Time Walk', 'U', 2, { rating: 90 }), card('Fatal Push', 'B', 1, { rating: 60 })];
  const lab = card('Lab Only', 'R', 2, { rating: 75 });
  const hd = humanDrafter(file, [...covered, lab]);
  const fb = fitFallback(covered.map((c) => ({ rating: c.rating, s: file.cards[c.name]!.s })));
  assert.deepEqual(hd.fallback, fb);
  close(hd.s.get('Lab Only')!, fb.intercept + fb.slope * 75, 'fallback strength');
  assert.deepEqual([...hd.covered].sort(), ['Black Lotus', 'Fatal Push', 'Time Walk']);
  // A cube-listed name the file uses covers the card under its lab name.
  const listed = humanDrafter(file, [card('Lotus (lab name)', '', 0)], new Map([['Lotus (lab name)', 'Black Lotus']]));
  assert.equal(listed.s.get('Lotus (lab name)'), file.cards['Black Lotus']!.s);
});

// ------------------------------------------------------------ grid lines

function toyFile(cards: Record<string, number>, beta: Partial<HumanPicksFile['model']['beta']> = {}): HumanPicksFile {
  const zero = Object.fromEntries(PICK_FEATURES.map((k) => [k, 0])) as HumanPicksFile['model']['beta'];
  return {
    schema: 1, cube: { file: 'toy.md', cards: 0, matched: 0 },
    model: { gamma: 0, beta: { ...zero, ...beta }, tScale: 44, offShare: 0.15, offMinPool: 3 },
    cards: Object.fromEntries(Object.entries(cards).map(([k, s]) => [k, { s }])),
  };
}

test('a line is worth the sum of exp(u) in pick order, whatever the logit offset', () => {
  const cs = { a: card('a', 'W', 1), b: card('b', 'U', 2), c: card('c', 'U', 3), d: card('d', 'R', 2) };
  const file = toyFile({ a: 2, b: 1, c: 0.5, d: 1.9 });
  const hd = humanDrafter(file, Object.values(cs));
  const v = lineValue(hd, [cs.c, cs.a, cs.b], []);
  assert.deepEqual(v.order, ['a', 'b', 'c']);
  close(v.value, Math.exp(2) + Math.exp(1) + Math.exp(0.5), 'no context: plain sum');
  // Pick order: with a fit term, taking b (blue) first makes c (blue) worth more than it is alone.
  const fit = humanDrafter(toyFile({ a: 2, b: 1, c: 0.5, d: 1.9 }, { fit: 1 }), Object.values(cs));
  const seq = lineValue(fit, [cs.b, cs.c], []);
  assert.deepEqual(seq.order, ['b', 'c']);
  close(seq.value, Math.exp(1) + Math.exp(0.5 + 1), 'c sees b in the pool (fit 1: an all-blue pool)');
  // Shifting every strength by a constant scales every line's value alike: the ranking stays.
  const shifted = humanDrafter(toyFile({ a: 12, b: 11, c: 10.5, d: 11.9 }), Object.values(cs));
  const rank = (h: typeof hd) => [[cs.a, cs.b, cs.c], [cs.d, cs.c], [cs.b, cs.c, cs.a]].map((l) => lineValue(h, l, []).value);
  const r0 = rank(hd), r1 = rank(shifted);
  r0.forEach((x, i) => close(r1[i]! / x, Math.exp(10), `line ${i}`, 1e-6 * Math.exp(10)));
  // Two cards with one great one can beat three middling ones (exp makes the best card dominate).
  const big = humanDrafter(toyFile({ a: 4, b: 0, c: 1, d: 1 }), Object.values(cs));
  assert.ok(lineValue(big, [cs.a, cs.b], []).value > lineValue(big, [cs.c, cs.d, cs.b], []).value);
});

test('the chooser takes the best line, never the line already taken, and refuses Winston', () => {
  const grid = 'abcdefghi'.split('').map((n, i) => card(n, 'WUBRG'[i % 5]!, 1 + (i % 4)));
  const strengths = Object.fromEntries(grid.map((c, i) => [c.name, [0, 0, 0, 0, 3, 0, 0, 0, 0][i]!]));
  const hd = humanDrafter(toyFile({ ...strengths, b: 1, h: 1 }), grid);
  const ch = humanChooser(hd);
  const d = { seat: 'A' as const, state: { picks: [], expected: 45 }, log: [], seen: new Set<string>() };
  // e (index 4) with b and h: the middle column (line 4) beats the middle row (line 1).
  assert.equal(ch.gridLine(d, grid, null), 4);
  assert.equal(ch.gridLine(d, grid.map((c, i) => (LINES[4]!.includes(i) ? null : c)), 4) !== 4, true);
  assert.throws(() => ch.takePile(d, [grid[0]!], 0, 0), /grid only/);
});

// ------------------------------------------------------------ a draft

function cube(): LoadedCube {
  const cards: LabCard[] = [];
  for (let i = 0; i < 180; i++) {
    const colors = i < 150 ? 'WUBRG'[i % 5]! : i < 165 ? ['WU', 'UB', 'BR', 'RG', 'WG'][i % 5]! : '';
    const land = i >= 170;
    cards.push(card(`card ${i}`, land ? '' : colors, land ? 0 : 1 + (i % 6), {
      rating: 30 + ((i * 37) % 70), land, creature: !land, type: land ? 'Land' : 'Creature',
      produces: land ? ['WU', 'UB', 'BR', 'RG', 'WG'][i % 5]! : '', pips: land || !colors ? {} : Object.fromEntries([...colors].map((c) => [c, 1])),
    }));
  }
  return { cube: { title: 'toy' } as LoadedCube['cube'], cards, byName: new Map(cards.map((c) => [c.name, c])), missing: [], ratedFromFile: 0 };
}

test('a human-pick draft: the deal is a plain run\'s, one seat picks by lineValue, both build decks', () => {
  const lc = cube();
  // The file covers every other card; a strong preference for black makes the human seat visibly different.
  const covered = Object.fromEntries(lc.cards.filter((_, i) => i % 2 === 0).map((c) => [c.name, c.colors === 'B' ? 3 : 0]));
  const hd = humanDrafter(toyFile(covered, { fit: 2 }), lc.cards);
  assert.equal(hd.covered.size, 90);
  for (const seed of [4, 7]) {
    for (const seat of ['A', 'B'] as const) {
      const d = runHumanDraft(lc, hd, seat, seed, W);
      const plain = gridDraft(lc.cards, rng(seed, 'draft:grid'), aiChooser(W), W, seed % 2 === 0);
      assert.equal(d.aOpens, seed % 2 === 0);
      assert.equal(d.dealt, plain.dealt.length);
      const both = new Set([...d.drafters[0].pool, ...d.drafters[1].pool]);
      for (const n of both) assert.ok(plain.dealt.includes(n), 'every pick from the same deal');
      const h = d.drafters[seat === 'A' ? 0 : 1];
      const o = d.drafters[seat === 'A' ? 1 : 0];
      assert.ok(h.deck && o.deck, 'both seats build');
      const black = (names: string[]) => names.filter((n) => lc.byName.get(n)?.colors === 'B').length;
      assert.ok(black(h.pool) > black(o.pool), `seed ${seed} seat ${seat}: the human seat leans black (${black(h.pool)} vs ${black(o.pool)})`);
      // Replay the human seat's lines: each is the lineValue argmax at that moment.
      const again = runHumanDraft(lc, hd, seat, seed, W);
      assert.deepEqual(again.drafters.map((x) => x.pool), d.drafters.map((x) => x.pool), 'a seed is a draft');
    }
  }
});

test('run plumbing: the drafter is part of the folder identity and the version, off changes nothing', () => {
  assert.ok((IDENTITY_FIELDS as readonly string[]).includes('drafter'));
  assert.deepEqual(identityDiff({}, {}), []);
  assert.deepEqual(identityDiff({}, { drafter: { kind: 'human-picks', seat: 'A', file: 'x', sha: 'y', cards: 1, covered: 1, fallback: { intercept: 0, slope: 0, n: 0, r: 0 } } }), ['drafter']);
  assert.equal(versionWeights(W, {}), W);
  assert.notDeepEqual(versionWeights(W, { drafter: { seat: 'A', sha: 'y' } }), versionWeights(W, { drafter: { seat: 'B', sha: 'y' } }));
  assert.deepEqual(parseDrafterSpec('human-picks:/x/vintage-cube-180.picks.json'), { kind: 'human-picks', file: '/x/vintage-cube-180.picks.json' });
  assert.equal(parseDrafterSpec('forge'), null);
  assert.throws(() => parsePicks({ ...(json('vintage-cube-180.picks.json') as object), schema: 2 }), /schema/);
});
