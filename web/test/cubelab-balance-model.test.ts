/*
 * mtg-table — web/test/cubelab-balance-model.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * D473: the library card model and the balanced-cube generator (tools/cubelab/balance-model.ts):
 *
 *  - the ridge linear-probability fit recovers planted card values on synthetic random decks, and is
 *    antisymmetric (the same games written from the other side give the same values);
 *  - the deck bootstrap's intervals cover planted values at about the nominal rate, and the split-half
 *    reliability is high with a signal and near 0 without one;
 *  - held-out cross-validation prefers a finite penalty when cards matter, and reports skill over the
 *    makeup-only model;
 *  - predicted payoffs: equal class values give .5 everywhere; a stronger colour wins more, its pairs too;
 *    play weights move a class's mean toward its played cards;
 *  - the generator fills the plan exactly, pulls every class toward its target, keeps the creature floor, and
 *    the balance search narrows the predicted gaps;
 *  - the programme simulation: a perfect model with huge measurements confirms on night 2, a rule nothing can
 *    meet never confirms.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  agreement, balanceSearch, bootstrapFit, buildDesign, cardEffects, classSummary, crossValidate, DEFAULT_GEN, DEFAULT_PENALTY, generateCube, groupOf,
  maxGap, pearson, playCurve, predictPayoffs, shareBin, simulateProgramme, solveRidge, splitHalf,
  type GenCard, type MDeck, type MGame,
} from '../../tools/cubelab/balance-model.ts';
import { rng } from '../../tools/cubelab/rng.ts';
import { MONO, PAIRS, planErrors } from '../../tools/cubelab/skeleton.ts';
import { structurePlan } from '../../tools/cubelab/sample.ts';

/** Random 20-card decks from 120 cards with planted values (pts per game), one-colour makeups, games by the linear model. */
function synth(seed: number, signal: number, nDecks = 600, nGames = 6000): { decks: MDeck[]; games: MGame[]; truth: Map<string, number> } {
  const r = rng(seed, 'synth');
  const cards = Array.from({ length: 120 }, (_, i) => `c${i}`);
  const truth = new Map(cards.map((c) => [c, signal * (r.next() * 2 - 1)]));
  const decks: MDeck[] = Array.from({ length: nDecks }, (_, i) => {
    const set = new Set<string>();
    while (set.size < 20) set.add(cards[r.int(cards.length)] as string);
    return { id: `d${i}`, spells: [...set], colours: 'WUBRG'[i % 5] as string, mainShare: 1, cluster: `d${i}` };
  });
  const val = (d: MDeck): number => d.spells.reduce((s, c) => s + (truth.get(c) as number), 0);
  const games: MGame[] = Array.from({ length: nGames }, () => {
    const a = decks[r.int(nDecks)] as MDeck;
    let b = decks[r.int(nDecks)] as MDeck;
    while (b === a) b = decks[r.int(nDecks)] as MDeck;
    const p = Math.min(0.95, Math.max(0.05, 0.5 + val(a) - val(b)));
    return { a: a.id, b: b.id, winner: r.next() < p ? 'a' : 'b', first: r.next() < 0.5 ? 'a' : 'b' };
  });
  return { decks, games, truth };
}

test('groups: colour and makeup keys, the share bins, the stratum', () => {
  assert.equal(groupOf({ colours: 'WU', mainShare: 0.6 }, 'colour'), 'WU');
  assert.equal(groupOf({ colours: '', mainShare: 1 }, 'colour'), 'C');
  assert.equal(groupOf({ colours: 'WUB', mainShare: 0.95 }, 'makeup'), 'k3:.9');
  assert.equal(groupOf({ colours: 'R', mainShare: 1, stratum: 'legacy' }, 'makeup'), 'legacy/k1:mono');
  assert.deepEqual([0.3, 0.5, 0.7, 0.9, 1].map(shareBin), ['<.5', '.5', '.7', '.9', 'mono']);
});

test('the fit recovers planted card values and is antisymmetric', () => {
  const { decks, games, truth } = synth(1, 0.03);
  const ds = buildDesign(decks, games, 'makeup');
  const beta = solveRidge(ds, { ...DEFAULT_PENALTY, card: 50 });
  const est = ds.cards.map((_, i) => beta[i] as number);
  assert.ok(pearson(est, ds.cards.map((c) => truth.get(c) as number)) > 0.7, 'planted values recovered');
  const flipped = games.map((g) => ({ a: g.b, b: g.a, winner: g.winner === 'a' ? 'b' : 'a', first: g.first === 'a' ? 'b' : 'a' }) as MGame);
  const beta2 = solveRidge(buildDesign(decks, flipped, 'makeup'), { ...DEFAULT_PENALTY, card: 50 });
  for (let i = 0; i < ds.cards.length; i++) assert.ok(Math.abs((beta[i] as number) - (beta2[i] as number)) < 1e-6);
});

test('the bootstrap covers planted values; split-half reliability tracks the signal', () => {
  const { decks, games, truth } = synth(2, 0.03);
  const ds = buildDesign(decks, games, 'makeup');
  const pen = { ...DEFAULT_PENALTY, card: 50 };
  const beta = solveRidge(ds, pen);
  const eff = cardEffects({ design: ds, pen, beta, reps: bootstrapFit(ds, pen, beta, 60, 3) });
  // Ridge shrinks toward 0, so coverage of the raw truth is a little under nominal; it must still be most of the cards.
  const covered = eff.filter((e) => e.lo <= (truth.get(e.card) as number) + 0.01 && (truth.get(e.card) as number) - 0.01 <= e.hi).length / eff.length;
  assert.ok(covered > 0.75, `coverage ${covered}`);
  assert.ok(splitHalf(ds, pen, 0).full > 0.6);
  const nul = synth(3, 0);
  const dn = buildDesign(nul.decks, nul.games, 'makeup');
  assert.ok(Math.abs(splitHalf(dn, pen, 0).full) < 0.35);
});

test('cross-validation prefers a finite penalty when cards matter and reports skill', () => {
  const { decks, games } = synth(4, 0.03);
  const cv = crossValidate(buildDesign(decks, games, 'makeup'), [10, 50, 200, 1e6], 4, 1);
  assert.notEqual(cv.lambda, 1e6);
  assert.ok(cv.skill > 0 && cv.brier < cv.brierGroupsOnly);
});

test('agreement: a source against itself', () => {
  const e = [0.01, -0.02, 0.03, 0, 0.02].map((est, i) => ({ card: `c${i}`, est, sd: 0.01, lo: est - 0.02, hi: est + 0.02, decks: 10, deckGames: 300 }));
  const a = agreement(e, e, 200, 0.8, 0.8);
  assert.ok(Math.abs(a.pearson - 1) < 1e-12 && Math.abs(a.slope - 1) < 1e-12 && Math.abs(a.trueCorrelation - 1.25) < 1e-9);
});

const mix = { perColour: 9, gold: 0.5, colourless: 4 };
const cubeOf = (vals: Record<string, number>): { cards: Array<{ name: string; colors: string; land: boolean }>; value: (n: string) => number } => {
  const cards: Array<{ name: string; colors: string; land: boolean }> = [];
  const v = new Map<string, number>();
  for (const k of [...MONO, ...PAIRS, '']) for (let i = 0; i < 3; i++) { const name = `${k || 'C'}${i}`; cards.push({ name, colors: k, land: false }); v.set(name, vals[k] ?? 0); }
  return { cards, value: (n) => v.get(n) ?? 0 };
};

test('predicted payoffs: even classes are .5; a stronger colour wins more; weights move a class mean', () => {
  const even = cubeOf({});
  const p0 = predictPayoffs(even.cards, (n) => even.value(n), 0, mix);
  assert.ok(maxGap(p0.colour) < 1e-12 && maxGap(p0.pair) < 1e-12);
  const red = cubeOf({ R: 0.01 });
  const p1 = predictPayoffs(red.cards, (n) => red.value(n), 0, mix);
  assert.ok((p1.colour.R as { est: number }).est > 0.5 && (p1.colour.W as { est: number }).est < 0.5);
  assert.ok((p1.pair.BR as { est: number }).est > 0.5 && (p1.pair.WU as { est: number }).est < 0.5);
  // R's deck carries 9 R cards worth .01 each = .09; R pairs beat the 6 non-R pairs by .09, and 3 other R pairs tie.
  assert.ok(Math.abs((p1.pair.BR as { est: number }).est - (0.5 + 0.09 - (3 * 0.09) / 9)) < 1e-9);
  // Weighting: one R card at .1 and two at 0; all weight on the first makes R's mean .1.
  const w = cubeOf({});
  const val = (n: string): number => (n === 'R0' ? 0.1 : w.value(n));
  const pw = predictPayoffs(w.cards, (n) => val(n), 0, mix, (n) => (n.startsWith('R') && n !== 'R0' ? 0 : 1));
  const pu = predictPayoffs(w.cards, (n) => val(n), 0, mix);
  assert.ok((pw.colour.R as { est: number }).est > (pu.colour.R as { est: number }).est);
  assert.deepEqual(playCurve([{ rating: 40, rate: 0.1 }, { rating: 60, rate: 0.3 }, { rating: 80, rate: 0.5 }]).weight(100), 0.7);
});

function synthPool(seed: number): GenCard[] {
  const r = rng(seed, 'pool');
  const out: GenCard[] = [];
  let id = 0;
  const add = (colors: string, n: number): void => {
    for (let i = 0; i < n; i++) out.push({ name: `n${id++}`, colors, mv: i % 8, land: false, produces: '', creature: i % 3 !== 0, rating: 40 + r.int(60), value: (r.next() - 0.5) * 0.06, sd: 0.008 });
  };
  for (const k of MONO) add(k, 80);
  for (const p of PAIRS) add(p, 16);
  add('', 60);
  for (const p of PAIRS) for (let i = 0; i < 3; i++) out.push({ name: `l${id++}`, colors: '', mv: 0, land: true, produces: p, creature: false, rating: 50 + i, value: null, sd: null });
  for (let i = 0; i < 4; i++) out.push({ name: `l${id++}`, colors: '', mv: 0, land: true, produces: '', creature: false, rating: 50, value: null, sd: null });
  return out;
}

test('the generator fills the plan exactly, near its target, with the creature floor; the search narrows the gaps', () => {
  const pool = synthPool(5);
  const plan = structurePlan('two-colour');
  const cube = generateCube(pool, plan, { ...DEFAULT_GEN, target: 0.01, minCreaturesPerColour: 16 });
  assert.equal(cube.length, 180);
  assert.deepEqual(planErrors(cube.map((c) => ({ ...c })), plan), []);
  for (const s of classSummary(cube).filter((x) => x.cls.length === 1 && x.cls !== 'C')) {
    assert.ok(Math.abs(s.meanValue - 0.01) < 0.004, `${s.cls} mean ${s.meanValue}`);
    assert.ok(s.creatures >= 16, `${s.cls} creatures ${s.creatures}`);
  }
  const value = (n: string): number => pool.find((c) => c.name === n)?.value ?? 0;
  const before = predictPayoffs(cube, (n) => value(n), 0, mix);
  const searched = balanceSearch(cube, pool, value, mix, () => 1, { target: 0.01, band: 0.02, minCreaturesPerColour: 16, maxSwaps: 20, tol: 1e-6 });
  const after = predictPayoffs(searched.cards, (n) => value(n), 0, mix);
  assert.ok(maxGap(after.colour) + maxGap(after.pair) <= maxGap(before.colour) + maxGap(before.pair));
  assert.deepEqual(planErrors(searched.cards.map((c) => ({ ...c })), plan), []);
});

test('the programme: a perfect model confirms on night 2; an impossible rule never does', () => {
  const base = { perNight: 2, sigmaColour: 0, sigmaPair: 0, kappa: 0, colourN: 1e7, pairN: PAIRS.map(() => 1e7), deff: 1, band: 0.05, minPairN: 400, rule: 'all-even' as const, maxNights: 10, sims: 50, seed: 1 };
  const ok = simulateProgramme(base);
  assert.equal(ok.median, 2);
  assert.equal(ok.truePass, 1);
  const never = simulateProgramme({ ...base, colourN: 50 });
  assert.equal(never.within, 0);
});
