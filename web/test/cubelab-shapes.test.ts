/*
 * mtg-table — web/test/cubelab-shapes.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * D446: deck shapes for the lab drafter and builder (tools/cubelab/shapes.ts), the shape exploration
 * share, card flow (cardflow.ts) and the shape measures (shape-measures.ts, shapes-cmd.ts, compare):
 *
 *  - AUTO IS TODAY: ten drafts (twenty pools) on three census cubes, drafted and built by `runDraft`,
 *    by `runShapedDraft` with both seats auto and with either seat two-colour, give the picks and
 *    decks fixtures/cubelab/shapes/auto.golden.json holds -- made by origin/main's code before any
 *    shape change; and run.ts with shapes off never enters shapes.ts (identity, version, run.json);
 *  - each shape's land and colour rules on synthetic pools, and its deck rules;
 *  - each shape's lean rules on synthetic drafters and a synthetic grid;
 *  - the exploration share: its rate, its uniform (or weighted) shapes, no mirrors, determinism;
 *  - card flow: the Synergy v3 study's 17 cards are card flow by the rule, the controls are not;
 *  - the measures on synthetic run folders, by arithmetic: colour counts, by shape, fallbacks, mirrors,
 *    card flow, the labels, band offsets, rough ratings; compare.json and shapes.json numbers only.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import type { Fact, LabCard } from '../../tools/cubelab/cards.ts';
import { isCardFlow } from '../../tools/cubelab/cardflow.ts';
import { assertNumbersOnly, compare, compareJson, readPopulation } from '../../tools/cubelab/compare.ts';
import { buildDeck } from '../../tools/cubelab/deck.ts';
import { newDrafter, type Drafter } from '../../tools/cubelab/draft.ts';
import { runDraft, type LoadedCube } from '../../tools/cubelab/lab.ts';
import { scoreCard } from '../../tools/cubelab/pick.ts';
import { identityDiff, shapesOn, versionWeights, type DraftRecord, type RunMeta } from '../../tools/cubelab/run.ts';
import { shapeLabels, shapeTable, shapeValues, type ShapeInterval } from '../../tools/cubelab/shape-measures.ts';
import { cubeOrigin, shapesCommand } from '../../tools/cubelab/shapes-cmd.ts';
import {
  buildShapedDeck, checkShapedDeck, EQUAL_WEIGHTS, fixersFor, monoColour, parseShapeExplore, runShapedDraft, scoreShaped,
  shapedChooser, shapeMarginals, shapePlan, SHAPE_RULES, SHAPES, type ShapePlan,
} from '../../tools/cubelab/shapes.ts';
import { DEFAULT_WEIGHTS } from '../../tools/cubelab/weights.ts';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const FIX = path.join(REPO, 'fixtures/cubelab/shapes');
const W = DEFAULT_WEIGHTS;

function loadFixtureCube(id: string): LoadedCube {
  const cards = JSON.parse(fs.readFileSync(path.join(FIX, `${id}.cards.json`), 'utf8')) as LabCard[];
  return { cube: { title: id } as LoadedCube['cube'], cards, byName: new Map(cards.map((c) => [c.name, c])), missing: [], ratedFromFile: 0 };
}
const GOLDEN = fs.readFileSync(path.join(FIX, 'auto.golden.json'), 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Record<string, unknown> & { cube: string; seed: number });
const plain = (s: ShapePlan['A']['shape']): ShapePlan['A'] => ({ shape: s, forced: false });
/** A draft without its timings, and (for a shaped run) without the shape fields, as JSON. */
function draftJson(d: object): string {
  const { ms: _ms, ...rest } = d as { ms: unknown; drafters: Array<Record<string, unknown>> };
  return JSON.stringify({ ...rest, drafters: rest.drafters.map(({ shape: _s, shapeForced: _f, shapeFallback: _b, ...x }) => x) });
}

// ------------------------------------------------------------ auto is today

test('auto identity: runDraft on ten fixture drafts (twenty pools) is byte for byte the golden made on main before the change', () => {
  assert.equal(GOLDEN.length, 10);
  for (const g of GOLDEN) {
    const lc = loadFixtureCube(g.cube);
    const { cube: _c, ...want } = g;
    assert.equal(draftJson(runDraft(lc, 'grid', g.seed, W)), JSON.stringify(want), `${g.cube} seed ${g.seed}`);
  }
});

test('auto identity: runShapedDraft with both seats auto, or either seat two-colour, drafts and builds exactly the golden', () => {
  for (const g of GOLDEN) {
    const lc = loadFixtureCube(g.cube);
    const { cube: _c, ...want } = g;
    for (const plan of [{ A: plain('auto'), B: plain('auto') }, { A: plain('two-colour'), B: plain('auto') }, { A: plain('auto'), B: plain('two-colour') }]) {
      const d = runShapedDraft(lc, g.seed, W, plan);
      assert.equal(draftJson(d), JSON.stringify(want), `${g.cube} seed ${g.seed} ${plan.A.shape}/${plan.B.shape}`);
      for (const dr of d.drafters) { assert.equal(dr.shapeForced, false); assert.equal(dr.shapeFallback, undefined); }
    }
  }
});

test('auto identity: buildShapedDeck two-colour is buildDeck on all twenty golden pools', () => {
  for (const g of GOLDEN) {
    const lc = loadFixtureCube(g.cube);
    for (const dr of g.drafters as Array<{ pool: string[] }>) {
      const pool = dr.pool.map((n) => lc.byName.get(n) as LabCard);
      assert.equal(JSON.stringify(buildShapedDeck(pool, W, 'two-colour')), JSON.stringify(buildDeck(pool, W)));
    }
  }
});

test('auto identity: shapes off is the old run -- not on, no version change, no identity field', () => {
  assert.equal(shapesOn(undefined), false);
  assert.equal(shapesOn({ A: 'auto', B: 'auto', explore: null }), false);
  assert.equal(shapesOn({ A: 'auto', B: 'auto', explore: { share: 0, weights: [...EQUAL_WEIGHTS] } }), false);
  assert.equal(shapesOn({ A: 'mono', B: 'auto', explore: null }), true);
  assert.equal(shapesOn({ A: 'auto', B: 'auto', explore: { share: 0.2, weights: [...EQUAL_WEIGHTS] } }), true);
  assert.equal(versionWeights(W, { shapes: null }), W, 'the version input of a plain run is the weights object itself');
  const old = { cubeSha: 'x', format: 'grid', games: 1 } as Partial<RunMeta>;
  assert.deepEqual(identityDiff(old, { ...old }), []);
  assert.deepEqual(identityDiff(old, { ...old, shapes: { A: 'mono', B: 'auto', explore: null, rules: SHAPE_RULES, flow: 'D446' } }), ['shapes']);
});

// ------------------------------------------------------------ synthetic pools: land and colour rules

let uid = 0;
function card(colors: string, cmc: number, o: Partial<LabCard> = {}): LabCard {
  const pips: LabCard['pips'] = {};
  for (const c of colors) pips[c as 'W'] = 1;
  return {
    name: `${colors || 'C'}-${cmc}-${uid++}`, section: colors || 'Colorless', themes: [], roles: [], colors, cmc, pips, type: 'Creature',
    land: false, creature: true, planeswalker: false, produces: '', fixer: false, rating: 60, remAIDeck: false, ...o,
  };
}
const land = (produces: string, rating = 70): LabCard => card('', 0, { land: true, creature: false, produces, rating, type: 'Land' });
const many = (n: number, colors: string, cmcs: number[], o: Partial<LabCard> = {}): LabCard[] => Array.from({ length: n }, (_, i) => card(colors, cmcs[i % cmcs.length] as number, o));
const byNameOf = (pool: LabCard[]): Map<string, LabCard> => new Map(pool.map((c) => [c.name, c]));
const spellsOf = (main: Array<[number, string]>, by: Map<string, LabCard>): LabCard[] => main.flatMap(([n, x]) => (by.get(x) && !by.get(x)?.land ? Array.from({ length: n }, () => by.get(x) as LabCard) : []));

test('mono: one colour, 16 lands at a low curve and 17 at mana value 3.0+, 17 with only 23 castable, none with fewer', () => {
  const low = [...many(30, 'W', [1, 2, 3]), ...many(10, 'U', [2])];
  const d1 = buildShapedDeck(low, W, 'mono') as NonNullable<ReturnType<typeof buildShapedDeck>>;
  assert.equal(d1.colors, 'W');
  assert.equal(d1.lands, 16);
  assert.equal(d1.spells, 24);
  assert.deepEqual(checkShapedDeck(d1, low, byNameOf(low), 'mono'), []);
  const high = [...many(30, 'B', [3, 4, 5]), ...many(5, 'R', [1])];
  const d2 = buildShapedDeck(high, W, 'mono') as NonNullable<ReturnType<typeof buildShapedDeck>>;
  assert.equal(d2.colors, 'B');
  assert.equal(d2.lands, 17, 'the 24 average 4.0 >= 3.0');
  assert.equal(d2.spells, 23);
  const at3 = [...many(30, 'G', [3])];
  assert.equal((buildShapedDeck(at3, W, 'mono') as { lands: number }).lands, 17, 'exactly 3.0 is 17');
  const just = [...many(23, 'R', [2]), ...many(10, 'U', [2])];
  const d3 = buildShapedDeck(just, W, 'mono') as NonNullable<ReturnType<typeof buildShapedDeck>>;
  assert.equal(d3.colors, 'R');
  assert.equal(d3.lands, 17, 'only 23 castable: 17 lands and 23 spells');
  assert.equal(d3.spells, 23);
  assert.equal(buildShapedDeck([...many(22, 'W', [2]), ...many(22, 'U', [2])], W, 'mono'), null, 'no colour reaches 23');
});

test('mono: a splash of at most two one-pip cards, with its sources', () => {
  // 22 white spells: no mono build without a splash; two blue one-pip cards make 24
  const pool = [...many(22, 'W', [1, 2, 3], { rating: 55 }), ...many(5, 'U', [2], { rating: 95 }), land('WU'), land('WU'), land('WU')];
  const by = byNameOf(pool);
  const d = buildShapedDeck(pool, W, 'mono') as NonNullable<ReturnType<typeof buildShapedDeck>>;
  assert.equal(d.colors, 'W');
  assert.equal(d.splash, 'U');
  const splashCards = spellsOf(d.main, by).filter((c) => c.colors === 'U').length;
  assert.ok(splashCards >= 1 && splashCards <= SHAPE_RULES.monoMaxSplash, `splash cards ${splashCards}`);
  assert.deepEqual(checkShapedDeck(d, pool, by, 'mono'), []);
  // the deck rules refuse three splash cards and two main colours
  const blue = pool.filter((c) => c.colors === 'U').slice(0, 3).map((c): [number, string] => [1, c.name]);
  const bad = { ...d, main: [...d.main.filter(([, n]) => by.get(n)?.colors !== 'U').slice(0, -1), ...blue] };
  assert.ok(checkShapedDeck(bad, pool, by, 'mono').some((e) => /splash cards/.test(e)));
  assert.ok(checkShapedDeck({ ...d, colors: 'WU', splash: null }, pool, by, 'mono').some((e) => /main colours/.test(e)));
});

test('three-colour: exactly three colours, 17 lands with 3 fixers for them, 18 with fewer; a colour with under 3 spells is no triple', () => {
  const spells = [...many(8, 'W', [2, 3]), ...many(8, 'U', [2, 3]), ...many(8, 'B', [2, 3], { rating: 70 }), ...many(6, '', [2, 4], { rating: 40 })];
  const three = [...spells, land('WU'), land('UB'), land('WB')];
  assert.equal(fixersFor(three, 'WUB'), 3);
  const d = buildShapedDeck(three, W, 'three-colour') as NonNullable<ReturnType<typeof buildShapedDeck>>;
  assert.equal(d.colors, 'WUB');
  assert.equal(d.splash, null);
  assert.equal(d.lands, 17);
  assert.equal(d.spells, 23);
  assert.equal(d.parts.threeColour, 0, 'the score drops the three-colour part');
  assert.deepEqual(checkShapedDeck(d, three, byNameOf(three), 'three-colour'), []);
  const two = [...spells, land('WU'), land('UB')];
  const d2 = buildShapedDeck(two, W, 'three-colour') as NonNullable<ReturnType<typeof buildShapedDeck>>;
  assert.equal(d2.lands, 18);
  assert.equal(d2.spells, 22);
  const thin = [...many(20, 'W', [2]), ...many(20, 'U', [2]), ...many(2, 'B', [2]), land('WB'), land('UB'), land('WU')];
  assert.equal(buildShapedDeck(thin, W, 'three-colour'), null, 'black has 2 spells: no WUB, and no other triple has a third colour');
  assert.ok(checkShapedDeck({ ...d, colors: 'WU' }, three, byNameOf(three), 'three-colour').length > 0);
});

test('good-stuff: the most colours its fixers support (3 a colour beyond two), 18 lands, no splash; none without 3 fixers', () => {
  const spells = (n: number) => [...many(n, 'W', [2, 3]), ...many(n, 'U', [2, 3]), ...many(n, 'B', [2, 3]), ...many(n, 'R', [2, 3]), ...many(n, 'G', [2, 3])];
  const pairs = ['WU', 'WB', 'WR', 'WG', 'UB', 'UR', 'UG', 'BR', 'BG', 'RG'];
  const five = [...spells(5), ...many(6, 'G', [2, 3], { rating: 70 }), ...pairs.map((p) => land(p))];
  assert.equal(fixersFor(five, 'WUBRG'), 10);
  const d = buildShapedDeck(five, W, 'good-stuff') as NonNullable<ReturnType<typeof buildShapedDeck>>;
  assert.equal(d.colors, 'WUBRG');
  assert.equal(d.lands, 18);
  assert.equal(d.spells, 22);
  assert.equal(d.splash, null);
  assert.deepEqual(checkShapedDeck(d, five, byNameOf(five), 'good-stuff'), []);
  const wub = [...many(8, 'W', [2]), ...many(8, 'U', [2]), ...many(8, 'B', [2]), ...many(6, 'R', [2]), ...many(6, 'G', [2]), ...many(4, '', [2]), land('WU'), land('UB'), land('WB')];
  const d3 = buildShapedDeck(wub, W, 'good-stuff') as NonNullable<ReturnType<typeof buildShapedDeck>>;
  assert.equal(d3.colors, 'WUB', 'three fixers support three colours, not four (6) or five (9)');
  assert.equal(d3.lands, 18);
  assert.equal(buildShapedDeck([...spells(8), land('WU'), land('UB')], W, 'good-stuff'), null, 'two fixers support nothing');
  assert.ok(checkShapedDeck({ ...d, colors: 'WU' }, five, byNameOf(five), 'good-stuff').length > 0);
});

test('a shaped seat whose shape has no build plays today\'s deck and says shapeFallback', () => {
  const lc = loadFixtureCube('legacy-two-colour');
  let fallbacks = 0, built = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const d = runShapedDraft(lc, seed, W, { A: { shape: 'mono', forced: true }, B: plain('auto') });
    const a = d.drafters[0];
    assert.equal(a.shape, 'mono');
    assert.equal(a.shapeForced, true);
    if (a.shapeFallback) { fallbacks++; assert.ok(a.deck && a.deck.colors.length >= 2, 'today\'s builder played'); } else { built++; assert.equal(a.deck?.colors.length, 1); }
    assert.deepEqual(a.deckErrors, []);
  }
  assert.ok(fallbacks > 0 && built > 0, `${built} built, ${fallbacks} fell back`);
});

// ------------------------------------------------------------ lean rules

function drafter(seat: 'A' | 'B', decisions: LabCard[][]): Drafter {
  const d = newDrafter(seat, 45);
  decisions.forEach((took, i) => {
    d.log.push({ n: i + 1, kind: 'grid', at: i + 1, seen: took.map((c) => c.name), took: took.map((c) => c.name), how: 'row 1', value: 0 });
    d.state.picks.push(...took);
  });
  return d;
}

test('mono: leans as today for two picks, then commits at pick 3 to the heaviest colour, for good', () => {
  const wc = (r: number) => card('W', 2, { rating: r }), uc = (r: number) => card('U', 2, { rating: r });
  const one = drafter('A', [[wc(80), uc(30)]]);
  const probe = card('U', 2, { rating: 50 });
  assert.equal(scoreShaped(probe, one, W, 'mono').colour, scoreCard(probe, one.state, W).colour, 'before pick 3: today\'s lean');
  const two = drafter('A', [[wc(80), uc(30)], [wc(70), uc(60)]]);
  assert.equal(monoColour(two), 'W');
  assert.equal(scoreShaped(probe, two, W, 'mono').colour, -W.offColour);
  assert.equal(scoreShaped(card('', 3), two, W, 'mono').colour, 0, 'colourless is on-colour');
  assert.equal(scoreShaped(card('WU', 3), two, W, 'mono').colour, -W.offColour, 'gold is off-colour');
  assert.equal(scoreShaped(land('UB'), two, W, 'mono').fixing, -W.fixing, 'a land not making the colour');
  assert.equal(scoreShaped(land('WU'), two, W, 'mono').fixing, 0);
  // later blue picks never move it
  const later = drafter('A', [[wc(80), uc(30)], [wc(70), uc(60)], [uc(99), uc(99), uc(99)], [uc(99), uc(99), uc(99)]]);
  assert.equal(monoColour(later), 'W');
  // two colourless decisions: it keeps leaning, then fixes at the first decision whose earlier picks carry colour
  const colourless = drafter('A', [[card('', 2)], [card('', 3)]]);
  assert.equal(monoColour(colourless), null);
  assert.equal(monoColour(drafter('A', [[card('', 2)], [card('', 3)], [card('G', 2, { rating: 40 })]])), 'G');
});

test('three-colour: commits at commitAt to the three heaviest, off-triple costs offColour, fixers weighted x2', () => {
  const picks: LabCard[][] = [];
  for (let i = 0; i < 5; i++) picks.push([card('W', 2, { rating: 90 }), card('U', 2, { rating: 70 }), card('B', 2, { rating: 50 })]);
  const d = drafter('A', picks);
  assert.ok(d.state.picks.length >= W.commitAt * 45);
  assert.equal(scoreShaped(card('R', 2), d, W, 'three-colour').colour, -W.offColour);
  assert.equal(scoreShaped(card('UB', 2), d, W, 'three-colour').colour, 0);
  assert.equal(scoreShaped(land('WU'), d, W, 'three-colour').fixing, W.fixing * SHAPE_RULES.threeFixingMult);
  assert.equal(scoreShaped(land('WR'), d, W, 'three-colour').fixing, (W.fixing / 2) * SHAPE_RULES.threeFixingMult);
  assert.equal(scoreShaped(land('RG'), d, W, 'three-colour').fixing, -W.fixing);
  const early = drafter('A', picks.slice(0, 2));
  const probe = card('R', 2);
  assert.equal(scoreShaped(probe, early, W, 'three-colour').colour, scoreCard(probe, early.state, W).colour, 'before commitAt: today\'s lean');
});

test('good-stuff: no lean, no synergy, colour-blind fixers', () => {
  const themed = (c: string) => card(c, 2, { rating: 60, themes: ['TOK'] });
  const d = drafter('A', Array.from({ length: 8 }, () => [themed('W'), themed('W')]));
  const probe = themed('B');
  const s = scoreShaped(probe, d, W, 'good-stuff');
  assert.equal(s.colour, 0);
  assert.equal(s.synergy, 0);
  assert.equal(s.total, 60);
  assert.ok(scoreCard(probe, d.state, W).synergy > 0, 'the lab drafter would have counted the theme');
  assert.equal(scoreShaped(land('RG'), d, W, 'good-stuff').fixing, W.fixing);
  assert.equal(scoreShaped(card('G', 1, { fixer: true, produces: 'WUBRG' }), d, W, 'good-stuff').fixing, W.fixing);
  assert.equal(scoreShaped(land('R'), d, W, 'good-stuff').fixing, 0);
});

test('on a grid, a mono seat committed to white takes the white line over a better blue one; an auto seat is aiChooser', () => {
  const d = drafter('A', [[card('W', 2, { rating: 80 }), card('W', 2, { rating: 80 })], [card('W', 2, { rating: 70 })]]);
  const grid = [card('U', 2, { rating: 90 }), card('U', 2, { rating: 90 }), card('U', 2, { rating: 90 }), card('W', 2, { rating: 60 }), card('W', 2, { rating: 60 }), card('W', 2, { rating: 60 }), card('B', 2), card('B', 2), card('B', 2)];
  assert.equal(shapedChooser(W, { A: 'mono', B: 'auto' }).gridLine(d, grid, null), 1);
  const autoD = { ...d, seat: 'B' as const };
  assert.equal(shapedChooser(W, { A: 'mono', B: 'auto' }).gridLine(autoD, grid, null), 0, 'auto, not yet committed: the 90s');
});

// ------------------------------------------------------------ the exploration share

test('exploration: each auto seat forced at the share, uniform over the four shapes, never one shape on both seats, a function of the seed', () => {
  const N = 20000, share = 0.3;
  const forced = { A: 0, B: 0 };
  const byShape = new Map<string, number>();
  let both = 0;
  for (let seed = 1; seed <= N; seed++) {
    const p = shapePlan(seed, { A: 'auto', B: 'auto' }, share);
    assert.deepEqual(shapePlan(seed, { A: 'auto', B: 'auto' }, share), p);
    for (const s of ['A', 'B'] as const) if (p[s].forced) { forced[s]++; byShape.set(p[s].shape, (byShape.get(p[s].shape) ?? 0) + 1); }
    if (p.A.forced && p.B.forced) { both++; assert.notEqual(p.A.shape, p.B.shape); }
    if (!p.A.forced) assert.equal(p.A.shape, 'auto');
  }
  for (const s of ['A', 'B'] as const) assert.ok(Math.abs(forced[s] / N - share) < 0.012, `${s} ${forced[s] / N}`);
  const total = forced.A + forced.B;
  for (const s of SHAPES) assert.ok(Math.abs((byShape.get(s) ?? 0) / total - 0.25) < 0.015, `${s} ${(byShape.get(s) ?? 0) / total}`);
  assert.ok(both > 0);
  // a fixed seat is never forced, and its draws do not move the other seat's
  for (let seed = 1; seed <= 200; seed++) {
    const p = shapePlan(seed, { A: 'mono', B: 'auto' }, 1);
    assert.deepEqual(p.A, { shape: 'mono', forced: false });
    assert.equal(p.B.forced, true);
  }
});

test('exploration: weighted shapes follow shapeMarginals; the flag parses and refuses', () => {
  const ex = { share: 1, weights: [0.5, 1 / 6, 1 / 6, 1 / 6] };
  const m = shapeMarginals(ex);
  const N = 20000;
  const cnt = { A: [0, 0, 0, 0], B: [0, 0, 0, 0] };
  for (let seed = 1; seed <= N; seed++) {
    const p = shapePlan(seed, { A: 'auto', B: 'auto' }, ex);
    for (const s of ['A', 'B'] as const) (cnt[s][SHAPES.indexOf(p[s].shape as typeof SHAPES[number])] as number)++;
  }
  for (const s of ['A', 'B'] as const) SHAPES.forEach((_, k) => assert.ok(Math.abs((cnt[s][k] as number) / N - (m[s][k] as number)) < 0.012, `${s} ${SHAPES[k]} ${(cnt[s][k] as number) / N} vs ${m[s][k]}`));
  assert.ok(Math.abs(m.B.reduce((t, x) => t + x, 0) - 1) < 1e-9);
  const eq = shapeMarginals({ share: 0.4, weights: [...EQUAL_WEIGHTS] });
  for (const x of [...eq.A, ...eq.B]) assert.ok(Math.abs(x - 0.1) < 1e-12, 'equal weights: share / 4 each, both seats');
  assert.deepEqual(parseShapeExplore(['on']), { share: SHAPE_RULES.exploreShareOn, weights: [...EQUAL_WEIGHTS] });
  assert.deepEqual(parseShapeExplore(['share=1,mono=2,three-colour=1,good-stuff=1']), { share: 1, weights: [0.5, 0, 0.25, 0.25] });
  assert.equal(parseShapeExplore([]), null);
  assert.throws(() => parseShapeExplore(['share=0']));
  assert.throws(() => parseShapeExplore(['share=1,mono=1']), /at least two/);
  assert.throws(() => parseShapeExplore(['share=1,blue=1']), /unknown/);
});

// ------------------------------------------------------------ card flow

test('card flow: the Synergy v3 study\'s 17 cards are card flow by the rule; the controls are not', () => {
  const doc = JSON.parse(fs.readFileSync(path.join(FIX, 'flow-facts.json'), 'utf8')) as { flow: Fact[]; control: Fact[] };
  assert.equal(doc.flow.length, 17);
  for (const f of doc.flow) assert.equal(isCardFlow(f), true, f.name);
  assert.ok(doc.control.length >= 12);
  for (const f of doc.control) assert.equal(isCardFlow(f), false, f.name);
});

// ------------------------------------------------------------ the measures on synthetic run folders

interface SynthDeck { colors: string; splash?: string | null; cards: string[]; shape?: string; forced?: boolean; fallback?: boolean }
function drafterRec(seat: 'A' | 'B', d: SynthDeck): Record<string, unknown> {
  const main: Array<[number, string]> = [...d.cards.map((c): [number, string] => [1, c]), [16, 'Plains']];
  return {
    seat, picks: [{ n: 1, kind: 'grid', at: 1, seen: d.cards, took: d.cards, how: 'row 1', value: 0 }], pool: d.cards,
    deck: { builder: 'lab', colors: d.colors, splash: d.splash ?? null, main, spells: 24, lands: 16, basics: {}, curve: [], avgCmc: 2, creatures: 13, themes: [], score: 0, parts: {}, alternatives: [], stretched: false },
    deckErrors: [], played: 'lab', deckFile: null, forgeDeckFile: 'x.dck', forge: null,
    ...(d.shape !== undefined ? { shape: d.shape, shapeForced: !!d.forced } : {}), ...(d.fallback ? { shapeFallback: true } : {}),
  };
}
function writeRun(dir: string, cubeFile: string, drafts: Array<{ seed: number; a: SynthDeck; b: SynthDeck; winner: 'A' | 'B' | 'draw' }>, info: Record<string, unknown>, shapes = true): void {
  fs.mkdirSync(dir, { recursive: true });
  const run = { v: 1, cube: 'synthetic', cubeFile, cubeSha: 'x', format: 'grid', seed: drafts[0]?.seed ?? 1, drafts: drafts.length, games: 1, profiles: ['Default', 'Default'], builder: 'lab', ratingsFile: null, ratingsFromFile: 0, gameTimeoutSec: 300, winstonCards: 90, weights: W, forgeJar: '', missing: [], themeNames: {}, archetypes: {},
    ...(shapes ? { shapes: { A: 'auto', B: 'auto', explore: { share: 1, weights: [...EQUAL_WEIGHTS] }, rules: SHAPE_RULES, flow: 'D446' } } : {}) };
  fs.writeFileSync(path.join(dir, 'run.json'), JSON.stringify(run));
  fs.writeFileSync(path.join(dir, 'cards.json'), JSON.stringify(info));
  const lines = drafts.map((x) => JSON.stringify({
    v: 1, cube: 'synthetic', seed: x.seed, format: 'grid', dealt: 162, aOpens: false, drafters: [drafterRec('A', x.a), drafterRec('B', x.b)],
    match: { games: [{ n: 1, onPlay: 'A', winner: x.winner, turns: 10, ms: 1, timeout: false, reason: 'x' }], winsA: x.winner === 'A' ? 1 : 0, winsB: x.winner === 'B' ? 1 : 0, winner: x.winner, worker: 0 },
    ms: { draft: 0, build: 0, match: 0 },
  } as unknown as DraftRecord));
  fs.writeFileSync(path.join(dir, 'drafts.jsonl'), `${lines.join('\n')}\n`);
}
const info = (names: string[], flow: string[] = []): Record<string, unknown> => Object.fromEntries(names.map((n) => [n, { section: 'x', colors: 'W', cmc: 2, land: false, themes: [], rating: 50, remAIDeck: false, type: 'Creature', ...(flow.includes(n) ? { flow: true } : {}) }]));
const censusCube = (band: string, cross: string): string => `# Census sample — ${band}, two-colour, seed 1, cube 1, version 1 (180 cards, two-player)\n\n*Cross-band slice: asked 0.1 of 180 = 18 slots, 18 spread; CROSS 1 (0.6%): ${cross}. FILL 1, where the band could not fill a slot (from peasant, then pauper, then powered): Fill Thing [peasant].*\n\n## The list\n`;

function folderA(tmp: string): string {
  const dir = path.join(tmp, 'runA');
  const cubeFile = path.join(tmp, 'cubeA.md');
  fs.writeFileSync(cubeFile, censusCube('pauper', 'Peasant Thing [peasant]'));
  const drafts: Array<{ seed: number; a: SynthDeck; b: SynthDeck; winner: 'A' | 'B' | 'draw' }> = [];
  // 40 drafts: a forced mono white deck (an Opt: card flow) against an auto UB deck; mono wins 24
  for (let i = 0; i < 40; i++) drafts.push({ seed: 1 + i, a: { colors: 'W', cards: ['Opt', 'White One'], shape: 'mono', forced: true }, b: { colors: 'UB', cards: ['Blue One'], shape: 'auto', forced: false }, winner: i % 5 < 3 ? 'A' : 'B' });
  // 10 drafts: the mono seat fell back to today's WU deck, and lost all ten
  for (let i = 0; i < 10; i++) drafts.push({ seed: 41 + i, a: { colors: 'WU', cards: ['White One'], shape: 'mono', forced: true, fallback: true }, b: { colors: 'UB', cards: ['Blue One'], shape: 'auto', forced: false }, winner: 'B' });
  // 5 mirror drafts of three-colour (synthetic: the plan makes none) and one drawn match
  for (let i = 0; i < 5; i++) drafts.push({ seed: 51 + i, a: { colors: 'WUB', cards: ['White One'], shape: 'three-colour', forced: true }, b: { colors: 'URG', cards: ['Blue One'], shape: 'three-colour', forced: true }, winner: 'A' });
  drafts.push({ seed: 56, a: { colors: 'W', cards: ['White One'], shape: 'mono', forced: true }, b: { colors: 'UB', cards: ['Blue One'], shape: 'auto', forced: false }, winner: 'draw' });
  writeRun(dir, cubeFile, drafts, info(['Opt', 'White One', 'Blue One'], ['Opt']));
  return dir;
}
function folderB(tmp: string): string {
  const dir = path.join(tmp, 'runB');
  const cubeFile = path.join(tmp, 'cubeB.md');
  fs.writeFileSync(cubeFile, censusCube('legacy', 'Peasant Thing [peasant]'));
  const drafts: Array<{ seed: number; a: SynthDeck; b: SynthDeck; winner: 'A' | 'B' | 'draw' }> = [];
  // 20 drafts: A holds the CROSS card and one in-band card, B one in-band card; A wins 15
  for (let i = 0; i < 20; i++) drafts.push({ seed: 1 + i, a: { colors: 'WR', cards: ['Peasant Thing', 'Legacy A', 'Fill Thing'], shape: 'two-colour', forced: true }, b: { colors: 'WUB', cards: ['Legacy B'], shape: 'good-stuff', forced: true }, winner: i < 15 ? 'A' : 'B' });
  writeRun(dir, cubeFile, drafts, info(['Peasant Thing', 'Legacy A', 'Legacy B', 'Fill Thing']));
  return dir;
}

test('measures: colour counts, by shape (fallbacks and mirrors left out), fallback rate, card flow, by arithmetic', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cubelab-shapes-'));
  const pop = readPopulation('a', folderA(tmp));
  const ds = [...pop.drafts.values()];
  const { v, n } = shapeValues(ds, { minPairGames: 5 });
  assert.equal(v.cc1_all, 24 / 40, 'mono white: 24 of 40 decisive matches (the drawn one left out)');
  assert.equal(n.cc1_all, 40);
  assert.equal(v.cc1_forced, 24 / 40);
  assert.equal(v.cc2_all, 26 / 60, 'UB won 16 + 10 of 50, the WU fallbacks 0 of 10');
  assert.equal(v.cc2_unforced, 26 / 50);
  assert.equal(v.cc2_forced, 0, 'the forced seats\' fallback WU decks');
  assert.equal(v.cc3_all, 5 / 10);
  assert.equal(v.label_mono, 24 / 40, 'built-to-shape mono only');
  assert.equal(n.label_mono, 40);
  assert.equal(v.label_three_colour, undefined, 'mirrors only');
  assert.equal(v.fallback_mono, 10 / 51);
  assert.equal(n.fallback_mono, 51);
  assert.equal(v.label_auto, 26 / 50);
  assert.equal(v.flow_cc1, 40 / 41, 'an Opt in each of 40 decks, none in the drawn draft\'s');
  assert.equal(v.flow_mono, 40 / 41);
  assert.equal(v.flow_auto, 0);
  assert.ok(Math.abs((v.spread as number) - (24 / 40 - 26 / 60)) < 1e-12, 'max - min over 1, 2 and 3 colours');
  assert.equal(v.pw5_cc1, 0, 'W at 60%');
  assert.equal(v.pw5_cc2, 0.5, 'UB at 52% is, WU at 0% is not');
  assert.equal(v.pw5_cc3, 0, 'WUB 5-0 and URG 0-5');
  // the bootstrap: intervals hold the estimates, and the labels read them
  const t = shapeTable(ds, { minPairGames: 5, boot: 400, bootSeed: 1 });
  const lm = t.label_mono as ShapeInterval & { est: number; lo: number; hi: number };
  assert.ok(lm.lo <= lm.est && lm.est <= lm.hi && lm.lo > 0.4 && lm.hi < 0.8, JSON.stringify(lm));
  assert.deepEqual(shapeLabels(lm, { viable: 0.5, dominant: 0.55, notViable: 0.45 }).read, 1);
  assert.deepEqual(shapeLabels({ est: 0.6, lo: 0.56, hi: 0.64, valid: 1, n: 100 }, { viable: 0.5, dominant: 0.55, notViable: 0.45 }), { viable: 0, dominant: 1, not_viable: 0, read: 1 });
  assert.deepEqual(shapeLabels({ est: 0.4, lo: 0.36, hi: 0.44, valid: 1, n: 100 }, { viable: 0.5, dominant: 0.55, notViable: 0.45 }), { viable: 0, dominant: 0, not_viable: 1, read: 1 });
  assert.deepEqual(shapeLabels({ est: 0.5, lo: 0.47, hi: 0.53, valid: 1, n: 100 }, { viable: 0.5, dominant: 0.55, notViable: 0.45 }), { viable: 1, dominant: 0, not_viable: 0, read: 1 });
  assert.deepEqual(shapeLabels({ est: 0.53, lo: 0.51, hi: 0.56, valid: 1, n: 100 }, { viable: 0.5, dominant: 0.55, notViable: 0.45 }), { viable: 0, dominant: 0, not_viable: 0, read: 1 }, 'above 0.5, not wholly above 0.55: no label');
  assert.equal(shapeLabels(undefined, { viable: 0.5, dominant: 0.55, notViable: 0.45 }).read, 0);
  assert.equal(shapeLabels({ est: 0, lo: 0, hi: 0, valid: 1, n: 2 }, { viable: 0.5, dominant: 0.55, notViable: 0.45 }).read, 0, 'two matches: no label');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('compare: every population carries its shape measures, numbers only; a run with shapes off marks no card flow', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cubelab-shapes-'));
  const a = folderA(tmp);
  const plainDir = path.join(tmp, 'plain');
  fs.cpSync(a, plainDir, { recursive: true });
  const run = JSON.parse(fs.readFileSync(path.join(plainDir, 'run.json'), 'utf8'));
  delete run.shapes;
  fs.writeFileSync(path.join(plainDir, 'run.json'), JSON.stringify(run));
  const c = compare([readPopulation('shaped', a), readPopulation('plain', plainDir)], { minPairGames: 5, boot: 200, bootSeed: 1 });
  const j = compareJson(c, []) as { pop: Record<string, { shape: Record<string, Record<string, number>>; flow_marked: number }> };
  assertNumbersOnly(j);
  assert.equal(j.pop.shaped?.shape.label_mono?.est, 0.6);
  assert.equal(j.pop.shaped?.flow_marked, 1);
  assert.equal(j.pop.plain?.flow_marked, 0);
  assert.equal(j.pop.plain?.shape.flow_cc1, undefined, 'no flow without the marks');
  assert.equal(j.pop.plain?.shape.cc1_all?.est, 0.6, 'colour counts need no shapes');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('cubelab.sh shapes: grouped by census band, labels, band offsets from the CROSS cards, rough ratings, numbers only', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cubelab-shapes-'));
  const a = folderA(tmp), b = folderB(tmp);
  const origin = cubeOrigin(fs.readFileSync(path.join(tmp, 'cubeB.md'), 'utf8'));
  assert.equal(origin?.band, 'legacy');
  assert.equal(origin?.cross.get('Peasant Thing'), 'peasant');
  assert.equal(origin?.fill.get('Fill Thing'), 'peasant');
  const out = path.join(tmp, 'out');
  const f = new Map<string, string[]>([['out', [out]], ['boot', ['200']], ['min-pair-games', ['5']]]);
  assert.equal(await shapesCommand(REPO, [a, b], f, () => {}), 0);
  const j = JSON.parse(fs.readFileSync(path.join(out, 'shapes.json'), 'utf8'));
  assertNumbersOnly(j, 'shapes.json');
  assert.equal(j.groups, 2);
  assert.equal(j.group.pauper.drafts, 56);
  assert.equal(j.group.pauper.label.mono.est, 0.6);
  assert.equal(j.group.pauper.label.mono.fallback, Math.round((10 / 51) * 1e6) / 1e6);
  assert.equal(j.group.legacy.label.two_colour.est, 0.75);
  assert.equal(j.group.legacy.label.good_stuff.est, 0.25);
  assert.equal(j.group.legacy.label.two_colour.dominant + j.group.legacy.label.two_colour.viable + j.group.legacy.label.two_colour.not_viable >= 0, true);
  // offsets: in-band cards (one a deck) win 0.5 of their games; the CROSS card, A's 15 of 20; the FILL card is in neither
  assert.equal(j.group.legacy.offset.peasant.est, 0.25);
  assert.equal(j.group.legacy.offset.peasant.cards, 1);
  assert.equal(j.group.legacy.offset.fill, undefined);
  const tsv = fs.readFileSync(path.join(out, 'ratings-rough.tsv'), 'utf8').split('\n');
  assert.match(tsv[0] as string, /REPORT ONLY/);
  const row = tsv.find((l) => l.startsWith('legacy\tPeasant Thing\t'))?.split('\t') ?? [];
  assert.deepEqual([row[3], row[6], row[7]], ['cross', '20', '15']);
  const md = fs.readFileSync(path.join(out, 'shapes.md'), 'utf8');
  assert.match(md, /## pauper/);
  assert.match(md, /they decide nothing/i);
  fs.rmSync(tmp, { recursive: true, force: true });
});
