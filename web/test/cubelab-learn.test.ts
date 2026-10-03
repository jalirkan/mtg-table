/*
 * mtg-table — web/test/cubelab-learn.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The cube lab's learning loop (tools/cubelab/learn.ts, selfplay.ts; D301-D302),
 * engine-free:
 *
 *  - the fit recovers what was planted: a synthetic world of 120 cards in 12
 *    clusters, true card strengths and a few strong pairs, games simulated from
 *    them -- the learned ratings rank-correlate with the truth better than the
 *    noisy prior does, and the planted pairs come out on top;
 *  - shrinkage is honest: a card seen in no game stays at its prior, an
 *    AI-limited card stays at its prior whatever its games say, and a card seen
 *    in a handful of games barely moves;
 *  - determinism: the same games give byte-identical TSVs;
 *  - the files: the learned ratings TSV reads back through parseRatings, the
 *    synergy TSV through parseSynergy, both directions;
 *  - linear algebra: Cholesky solve and inverse diagonal against a hand case;
 *  - picking and deckbuilding with a pair table: a partner already picked
 *    raises a card's score by its points, and no pair table changes nothing;
 *  - the mixed draft: seat A drafts with its own values, seat B with the
 *    baseline, and the same seed gives the same draft.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { LabCard } from '../../tools/cubelab/cards.ts';
import {
  cholesky, cholInvDiag, cholSolve, DEFAULT_LEARN, gamesOf, learn, learnedRatingsTsv, parseSynergy, pairPoints,
  spearman, synergyTsv, type Game, type LearnOptions, type PriorCard,
} from '../../tools/cubelab/learn.ts';
import type { Cube } from '../../tools/cubelab/cube.ts';
import { runDraft, type LoadedCube } from '../../tools/cubelab/lab.ts';
import { scoreCard } from '../../tools/cubelab/pick.ts';
import { parseRatings } from '../../tools/cubelab/ratings.ts';
import { rng } from '../../tools/cubelab/rng.ts';
import type { DraftRecord } from '../../tools/cubelab/run.ts';
import { deckQuality, gamesForHalfWidth, headToHead, reRated, runMixedDraft } from '../../tools/cubelab/selfplay.ts';
import { DEFAULT_WEIGHTS } from '../../tools/cubelab/weights.ts';

// ------------------------------------------------------------ a planted world

interface World { priors: Map<string, PriorCard>; truth: Map<string, number>; planted: Array<[string, string]>; games: Game[] }

function gauss(r: { next(): number }): number {
  const u = Math.max(1e-12, r.next());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r.next());
}

function world(nGames: number, seed = 1, opts: { aiLimited?: string[]; plantedSyn?: number } = {}): World {
  const r = rng(seed, 'learn-test');
  const clusters = 12;
  const per = 10;
  const names: string[][] = [];
  const truth = new Map<string, number>();
  const priors = new Map<string, PriorCard>();
  for (let k = 0; k < clusters; k++) {
    names.push([]);
    for (let i = 0; i < per; i++) {
      const n = `c${k}-${i}`;
      names[k]?.push(n);
      const u = 0.3 * gauss(r);
      truth.set(n, u);
      // The prior knows the truth only roughly: half signal, half noise.
      const rating = Math.round((60 + 24 * (0.5 * u / 0.3 + 0.87 * gauss(r))) * 10) / 10;
      priors.set(n, { name: n, rating, forge: '', source: 'test', aiLimited: (opts.aiLimited ?? []).includes(n), land: false });
    }
  }
  // Planted synergy: two pairs in each of the first eight clusters.
  const planted: Array<[string, string]> = [];
  for (let k = 0; k < 8; k++) { planted.push([`c${k}-0`, `c${k}-1`]); planted.push([`c${k}-2`, `c${k}-3`]); }
  const syn = new Map<string, number>();
  for (const [a, b] of planted) syn.set(`${a}|${b}`, opts.plantedSyn ?? 0.6);
  const deck = (): string[] => {
    const k1 = r.int(clusters);
    let k2 = r.int(clusters - 1); if (k2 >= k1) k2++;
    const pool = [...(names[k1] ?? []), ...(names[k2] ?? [])];
    for (let i = pool.length - 1; i > 0; i--) { const j = r.int(i + 1); [pool[i], pool[j]] = [pool[j] as string, pool[i] as string]; }
    return pool.slice(0, 14).sort();
  };
  const strength = (d: string[]): number => {
    let s = 0;
    for (const n of d) s += truth.get(n) ?? 0;
    for (let i = 0; i < d.length; i++) for (let j = i + 1; j < d.length; j++) s += syn.get(`${d[i]}|${d[j]}`) ?? 0;
    return s;
  };
  const games: Game[] = [];
  for (let g = 0; g < nGames; g++) {
    const a = deck();
    const b = deck();
    const aOnPlay = g % 2 === 0;
    const t = strength(a) - strength(b) + (aOnPlay ? 0.1 : -0.1);
    games.push({ draft: String(Math.floor(g / 2)), a, b, aOnPlay, aWon: r.next() < 1 / (1 + Math.exp(-t)) });
  }
  return { priors, truth, planted, games };
}

const OPTS: LearnOptions = { ...DEFAULT_LEARN, maxPairs: 540, minPairGames: 5, folds: 0 };

test('the fit recovers planted card values better than the prior, and the planted pairs', () => {
  const w = world(4000);
  const l = learn(w.games, w.priors, OPTS);
  const learned = l.cards.filter((c) => c.status === 'learned');
  assert.equal(learned.length, 120);
  const truth = learned.map((c) => w.truth.get(c.name) as number);
  const rhoPrior = spearman(truth, learned.map((c) => c.prior));
  const rhoLearned = spearman(truth, learned.map((c) => c.rating));
  assert.ok(rhoLearned > 0.72, `learned rank correlation ${rhoLearned.toFixed(3)} (prior ${rhoPrior.toFixed(3)})`);
  assert.ok(rhoLearned > rhoPrior + 0.25, `learned ${rhoLearned.toFixed(3)} should beat the prior ${rhoPrior.toFixed(3)}`);
  assert.ok(l.alpha.value > 0, 'the prior carries signal, so alpha > 0');
  // The planted pairs: most of them among the top pairs by learned logit.
  const top = new Set(l.pairs.slice().sort((a, b) => b.logit - a.logit).slice(0, 24).map((p) => `${p.a}|${p.b}`));
  const hit = w.planted.filter(([a, b]) => top.has(`${a}|${b}`)).length;
  assert.ok(hit >= 10, `${hit} of 16 planted pairs in the top 24 of ${l.pairs.length} learned pairs`);
  const isPlanted = (p: { a: string; b: string }): boolean => w.planted.some(([a, b]) => a === p.a && b === p.b);
  const mean = (xs: number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length;
  const mp = mean(l.pairs.filter(isPlanted).map((p) => p.logit));
  const mo = mean(l.pairs.filter((p) => !isPlanted(p)).map((p) => p.logit));
  assert.ok(mp > mo + 0.1, `planted pairs' mean logit ${mp.toFixed(3)} vs the rest ${mo.toFixed(3)}`);
  assert.match(l.pointsPerLogitSource, /^auto/);
  // More games, more signal: a quarter of the games recovers less.
  const small = learn(w.games.slice(0, 1000), w.priors, OPTS).cards.filter((c) => c.status === 'learned');
  const rhoSmall = spearman(small.map((c) => w.truth.get(c.name) as number), small.map((c) => c.rating));
  assert.ok(rhoSmall < rhoLearned && rhoSmall > rhoPrior, `1000 games ${rhoSmall.toFixed(3)}, 4000 games ${rhoLearned.toFixed(3)}`);
});

test('shrinkage: unseen and AI-limited cards stay at the prior; few games barely move a card', () => {
  const w = world(600, 2, { aiLimited: ['c0-5', 'c1-5'] });
  // A card nobody played.
  w.priors.set('Never Played', { name: 'Never Played', rating: 77, forge: '', source: 'test', aiLimited: false, land: false });
  const l = learn(w.games, w.priors, { ...OPTS, maxPairs: 100 });
  const by = new Map(l.cards.map((c) => [c.name, c]));
  assert.equal(by.get('Never Played')?.status, 'unseen');
  assert.equal(by.get('Never Played')?.rating, 77);
  for (const n of ['c0-5', 'c1-5']) {
    const c = by.get(n);
    assert.equal(c?.status, 'ai-limited');
    assert.equal(c?.rating, c?.prior, `${n} kept at the prior`);
    assert.ok((c?.games ?? 0) > 0, `${n} was played, and still kept`);
    assert.ok(!l.pairs.some((p) => p.a === n || p.b === n), `${n} is in no pair`);
  }
  // Four games of a card that won them all: the posterior is close to the prior.
  const few: Game[] = [...w.games];
  for (let i = 0; i < 4; i++) few.push({ draft: `x${i}`, a: ['Lucky'], b: [], aOnPlay: i % 2 === 0, aWon: true });
  w.priors.set('Lucky', { name: 'Lucky', rating: 50, forge: '', source: 'test', aiLimited: false, land: false });
  const l2 = learn(few, w.priors, { ...OPTS, maxPairs: 0 });
  const lucky = l2.cards.find((c) => c.name === 'Lucky');
  assert.ok(lucky && lucky.games === 4 && lucky.wins === 4);
  assert.ok(lucky.delta < 0.25 && lucky.sd > 0.2, `4-0 moves delta only to ${lucky.delta.toFixed(3)} (sd ${lucky.sd.toFixed(3)})`);
});

test('determinism and the file formats', () => {
  const w = world(800, 3);
  const a = learn(w.games, w.priors, { ...OPTS, maxPairs: 80, folds: 3 });
  const b = learn(w.games, w.priors, { ...OPTS, maxPairs: 80, folds: 3 });
  const ta = learnedRatingsTsv('T', a, ['x']);
  assert.equal(ta, learnedRatingsTsv('T', b, ['x']));
  assert.equal(synergyTsv('T', a), synergyTsv('T', b));
  const back = parseRatings(ta);
  assert.equal(back.size, 120);
  for (const c of a.cards) assert.equal(back.get(c.name), c.rating);
  const syn = parseSynergy(synergyTsv('T', a));
  const p = a.pairs.find((x) => Math.abs(x.points) >= 1);
  assert.ok(p);
  assert.equal(syn.get(p.a)?.get(p.b), p.points);
  assert.equal(syn.get(p.b)?.get(p.a), p.points);
  assert.ok(a.cv && a.cv.games === 800 && a.cv.folds === 3);
  assert.throws(() => parseSynergy('a\tb\tlots\n'), /synergy line 1/);
});

test('linear algebra: Cholesky solve and the inverse diagonal', () => {
  const m = new Float64Array([4, 2, 0, 2, 5, 1, 0, 1, 3]);
  const l = cholesky(m, 3);
  const x = cholSolve(l, 3, new Float64Array([2, 3, 4]));
  const back = [4 * x[0]! + 2 * x[1]!, 2 * x[0]! + 5 * x[1]! + x[2]!, x[1]! + 3 * x[2]!];
  back.forEach((v, i) => assert.ok(Math.abs(v - [2, 3, 4][i]!) < 1e-12));
  // inverse of m, by cofactors: det = 4*14 - 2*6 = 44; diag = [14, 12, 16] / 44
  const d = cholInvDiag(l, 3);
  [14 / 44, 12 / 44, 16 / 44].forEach((v, i) => assert.ok(Math.abs(d[i]! - v) < 1e-12));
  assert.throws(() => cholesky(new Float64Array([1, 2, 2, 1]), 2), /positive definite/);
});

test('gamesOf reads decisive games of the played decks, basics left out', () => {
  const deck = (names: string[]): { main: Array<[number, string]> } => ({ main: [...names.map((n): [number, string] => [1, n]), [8, 'Plains']] });
  const rec = {
    seed: 3,
    drafters: [
      { played: 'lab', deck: deck(['X', 'Y']), forge: null },
      { played: 'forge', deck: null, forge: { side: 'B', main: [[1, 'Z'], [9, 'Island']] } },
    ],
    match: { games: [
      { n: 1, onPlay: 'A', winner: 'B' }, { n: 2, onPlay: 'B', winner: 'draw' }, { n: 3, onPlay: 'B', winner: 'A' },
    ] },
  } as unknown as DraftRecord;
  assert.deepEqual(gamesOf([rec]), [
    { draft: '3', a: ['X', 'Y'], b: ['Z'], aOnPlay: true, aWon: false },
    { draft: '3', a: ['X', 'Y'], b: ['Z'], aOnPlay: false, aWon: true },
  ]);
});

// ------------------------------------------------------------ picking with pairs

function card(name: string, colors: string, o: Partial<LabCard> = {}): LabCard {
  const pips: Partial<Record<'W' | 'U' | 'B' | 'R' | 'G', number>> = {};
  for (const c of colors) pips[c as 'W'] = 1;
  return {
    name, section: colors, themes: [], roles: [], colors, cmc: 2, pips, type: 'Creature',
    land: false, creature: true, planeswalker: false, produces: '', fixer: false, rating: 50, remAIDeck: false, ...o,
  };
}

test('a learned pair adds its points when the partner is already picked; no table changes nothing', () => {
  const a = card('Alpha', 'W');
  const b = card('Beta', 'W');
  const c = card('Gamma', 'W');
  const table = parseSynergy('Alpha\tBeta\t12.5\t0.125\t0.1\t30\n');
  const state = { picks: [b, c], expected: 45 };
  const plain = scoreCard(a, state, DEFAULT_WEIGHTS);
  const withT = scoreCard(a, state, DEFAULT_WEIGHTS, table);
  assert.equal(withT.total - plain.total, 12.5);
  assert.equal(withT.pairs, 12.5);
  assert.equal(plain.pairs, 0);
  assert.equal(pairPoints(table, 'Gamma', [a, b]), 0);
  assert.equal(scoreCard(c, state, DEFAULT_WEIGHTS, table).total, scoreCard(c, state, DEFAULT_WEIGHTS).total);
});

// ------------------------------------------------------------ the mixed draft

const THEMES = ['SAC', 'TOK', 'ETB', 'GY', 'SPL', 'ART'];
function cubeCards(): LabCard[] {
  const out: LabCard[] = [];
  let i = 0;
  for (const c of 'WUBRG') {
    for (let k = 0; k < 30; k++, i++) {
      out.push(card(`${c} card ${k}`, c, { cmc: 1 + (k % 6), rating: 30 + ((i * 37) % 60), themes: [THEMES[k % 6] as string], creature: k % 3 !== 0 }));
    }
  }
  for (const p of ['WU', 'UB', 'BR', 'RG', 'WG', 'WB', 'UR', 'BG', 'WR', 'UG']) {
    out.push(card(`${p} dual`, '', { land: true, creature: false, produces: p, rating: 80, type: 'Land', cmc: 0, pips: {} }));
    out.push(card(`${p} gold`, p, { cmc: 3, rating: 70, themes: ['TOK'] }));
  }
  return out;
}
function loaded(cards: LabCard[]): LoadedCube {
  return { cube: { title: 'T' } as Cube, cards, byName: new Map(cards.map((c) => [c.name, c])), missing: [], ratedFromFile: cards.length };
}

test('mixed draft: with the baseline as the learned values it IS the ordinary draft; seed-determined; B never sees a learned number', () => {
  const base = loaded(cubeCards());
  for (const seed of [3, 4]) {
    const plain = runDraft(base, 'grid', seed, DEFAULT_WEIGHTS);
    const same = runMixedDraft(base, reRated(base, new Map()), 'draft+deck', 'grid', seed, DEFAULT_WEIGHTS);
    assert.deepEqual(same.drafters.map((d) => [d.pool, d.deck?.main]), plain.drafters.map((d) => [d.pool, d.deck?.main]));
  }
  // A learned table that loves the blue cards: A drifts blue, and the draft repeats exactly.
  const learned = reRated(base, new Map(base.cards.filter((c) => c.colors === 'U').map((c) => [c.name, c.rating + 60])));
  const m1 = runMixedDraft(base, learned, 'draft+deck', 'grid', 5, DEFAULT_WEIGHTS);
  const m2 = runMixedDraft(base, learned, 'draft+deck', 'grid', 5, DEFAULT_WEIGHTS);
  assert.deepEqual(m1, { ...m2, ms: m1.ms });
  const blue = (pool: string[]): number => pool.filter((n) => n.startsWith('U card')).length;
  const plain = runDraft(base, 'grid', 5, DEFAULT_WEIGHTS);
  assert.ok(blue(m1.drafters[0].pool) > blue(plain.drafters[0].pool), `A took ${blue(m1.drafters[0].pool)} blue cards (baseline ${blue(plain.drafters[0].pool)})`);
  assert.ok(m1.drafters[0].deck?.colors.includes('U'));
  assert.deepEqual(m1.drafters.flatMap((d) => d.deckErrors), []);
  // deck mode: both draft with the baseline, so the pools are the ordinary draft's.
  const dk = runMixedDraft(base, learned, 'deck', 'grid', 5, DEFAULT_WEIGHTS);
  assert.deepEqual(dk.drafters.map((d) => d.pool), plain.drafters.map((d) => d.pool));
  assert.deepEqual(dk.drafters[1].deck, plain.drafters[1].deck, 'B builds exactly the baseline deck');
});

test('deck quality offline, head-to-head arithmetic, and the games a CI needs', () => {
  const base = loaded(cubeCards());
  const learned = reRated(base, new Map(base.cards.filter((c) => c.colors === 'U').map((c) => [c.name, c.rating + 60])));
  const pools = [3, 4, 5, 6].flatMap((s) => runDraft(base, 'grid', s, DEFAULT_WEIGHTS).drafters.map((d) => d.pool));
  const same = deckQuality(pools, base, reRated(base, new Map()), DEFAULT_WEIGHTS);
  assert.deepEqual([same.learnedView, same.baselineView, same.cardsChanged, same.coloursChanged], [0, 0, 0, 0]);
  const q = deckQuality(pools, base, learned, DEFAULT_WEIGHTS);
  assert.equal(q.pools, 8);
  assert.ok(q.learnedView >= 0 && q.baselineView <= 0, JSON.stringify(q));
  const h = headToHead([
    { match: { games: [{ winner: 'A' }, { winner: 'A' }], winner: 'A' } },
    { match: { games: [{ winner: 'B' }, { winner: 'draw' }, { winner: 'A' }], winner: 'A' } },
  ]);
  assert.deepEqual([h.winsA, h.winsB, h.draws, h.games, h.matchesA, h.matchesB, h.rate], [3, 1, 1, 5, 2, 0, 0.75]);
  assert.ok(h.lo !== null && h.lo < 0.75 && h.hi !== null && h.hi > 0.75);
  assert.equal(gamesForHalfWidth(0.05), 385);
});
