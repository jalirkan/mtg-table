/*
 * mtg-table — web/test/cubelab-colour-null.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * D377: dominant-win's colour-adjusted null (tools/cubelab/colour-null.ts,
 * evolve.ts's ruleTest / discover / confirmCandidates / pooledTest):
 *
 *  - the baseline is each pair's rate with BOTH decks of the card's matches
 *    left out, shrunk by 20 pseudo-games, weighted by the card's games;
 *  - one attempt's test is the header's z, and pooling one attempt is that
 *    attempt; a card's attempts never mix the two nulls;
 *  - on synthetic batches where colours matter and cards do not, the mean
 *    null flags the strong colour's cards and the colour null does not, and a
 *    planted card is still found;
 *  - a folder started before D377 resumes on the mean (evolve-run's state).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { COLOUR_NULL, colourBaselines, colourTest, WIN_NULL_NEW_RUNS } from '../../tools/cubelab/colour-null.ts';
import {
  confirmCandidates, discover, EVOLVE_DEFAULTS, pooledTest, ruleTest,
  type CardStat, type EvolveCard,
} from '../../tools/cubelab/evolve.ts';
import { normalCdf } from '../../tools/cubelab/evolve-stats.ts';
import type { CardInfo } from '../../tools/cubelab/report.ts';
import type { DraftRecord } from '../../tools/cubelab/run.ts';
import { rng } from '../../tools/cubelab/rng.ts';

const K = EVOLVE_DEFAULTS;

/** A lab draft whose two played decks are `a` and `b` (colour pair, main cards), with these game winners. */
function rec(seed: number, a: [string, string[]], b: [string, string[]], winners: string): DraftRecord {
  const deck = ([colors, main]: [string, string[]]) => ({ played: 'lab', pool: main, deck: { colors, splash: null, themes: [], main: main.map((n) => [1, n]), spells: main.length } });
  return {
    seed, drafters: [deck(a), deck(b)],
    match: { games: [...winners].map((w, i) => ({ n: i + 1, winner: w })), winsA: 0, winsB: 0, winner: 'A', worker: 0 },
  } as unknown as DraftRecord;
}
const info = (names: string[]): Record<string, CardInfo> => Object.fromEntries(names.map((n) => [n, { colors: '', land: false } as CardInfo]));

test('colour null (D377): the baseline leaves both decks of the card\'s matches out, and shrinks by 20 games', () => {
  const recs = [
    rec(1, ['RW', ['x', 'a']], ['UB', ['b']], 'ABA'),
    rec(2, ['RW', ['c']], ['UB', ['d']], 'BB'),
    rec(3, ['UB', ['e']], ['RW', ['x']], 'AA'),
  ];
  const deff = 1.1;
  const b = colourBaselines(recs, info(['x', 'a', 'b', 'c', 'd', 'e']), deff);
  const x = b.get('x');
  assert.ok(x);
  assert.equal(x.games, 5);
  assert.equal(x.wins, 2);
  // RW: 7 games, 2 wins; x's matches hold 5 of RW's games (2 wins), so 2 games and 0 wins stay in; m = 7/14.
  const r = (0 + COLOUR_NULL.shrinkGames * 0.5) / (2 + COLOUR_NULL.shrinkGames);
  assert.ok(Math.abs(x.p0 - r) < 1e-12, `p0 ${x.p0}`);
  assert.ok(Math.abs(x.se0 - Math.sqrt(deff * r * (1 - r) / 22)) < 1e-12);
  assert.deepEqual(Object.keys(x.pairs), ['RW']);
  // 'a' shares x's match 1 only: RW keeps r2 and r3 (4 games, 0 wins).
  const a = b.get('a');
  assert.ok(a && Math.abs(a.p0 - 10 / 24) < 1e-12);
  // A card in a UB deck is measured against UB.
  assert.deepEqual(Object.keys(b.get('e')?.pairs ?? {}), ['UB']);
  // Draws are not games.
  assert.equal(colourBaselines([rec(4, ['RW', ['x']], ['UB', ['b']], 'DD')], info(['x', 'b']), 1).size, 0);
});

test('colour null (D377): one attempt is the header\'s z; pooling one attempt changes nothing; the nulls never mix', () => {
  const t = colourTest([{ n: 200, x: 124, p0: 0.54, se0: 0.02, deff: 1.05 }]);
  const ne = 200 / 1.05;
  const z = (124 / 200 - 0.54 - 0.5 / ne) / Math.sqrt(0.54 * 0.46 / ne + 0.02 ** 2);
  assert.ok(Math.abs(t.z - z) < 1e-12);
  assert.ok(Math.abs(t.p - (1 - normalCdf(z))) < 1e-12);
  const s: CardStat = { name: 'x', seen: 300, picked: 200, pickRate: 0.66, firstTakes: 0, firstPickRate: 0, inDecks: 90, deckRate: 0.3, onColour: 0, onColourDecks: 0,
    games: 200, wins: 124, winRate: 0.62, shrunk: 0.61, ci: [0, 1], colour: { p0: 0.54, se0: 0.02, games: 200, wins: 124, pairs: {} } };
  const c = ruleTest('dominant-win', { land: false }, s, 0.5, 1.05, K, true, 'colour');
  assert.ok(c && Math.abs(c.p - t.p) < 1e-12 && c.p0 === 0.54 && c.se0 === 0.02);
  const m = ruleTest('dominant-win', { land: false }, s, 0.5, 1.05, K, true, 'mean');
  assert.ok(m && m.p0 === 0.5 && m.se0 === undefined && m.p < c.p, 'the mean is the easier bar for a card of a strong colour');
  // A card with games and no baseline is not tested on the colour null.
  assert.equal(ruleTest('dominant-win', { land: false }, { ...s, colour: undefined }, 0.5, 1.05, K, true, 'colour'), null);
  // pooledTest: one colour attempt is itself; two pool as colourTest; a mix throws.
  const one = pooledTest('dominant-win', [{ n: 200, x: 124, p0: 0.54, deff: 1.05, p: t.p, se0: 0.02 }]);
  assert.equal(one?.p, t.p);
  const two = pooledTest('dominant-win', [{ n: 200, x: 124, p0: 0.54, deff: 1.05, p: t.p, se0: 0.02 }, { n: 100, x: 50, p0: 0.52, deff: 1, p: 0.5, se0: 0.03 }]);
  const ref = colourTest([{ n: 200, x: 124, p0: 0.54, se0: 0.02, deff: 1.05 }, { n: 100, x: 50, p0: 0.52, se0: 0.03, deff: 1 }]);
  assert.ok(two && two.p === ref.p && two.se0 === ref.se0 && two.n === 300 && two.x === 174);
  assert.throws(() => pooledTest('dominant-win', [{ n: 200, x: 124, p0: 0.54, deff: 1.05, p: t.p, se0: 0.02 }, { n: 100, x: 50, p0: 0.5, deff: 1, p: 0.5 }]), /mix/);
  // New runs use the colour null.
  assert.equal(WIN_NULL_NEW_RUNS, 'colour');
});

// ------------------------------------------------------------ a synthetic cube

const PAIRS = ['RW', 'RB', 'UB', 'UG', 'WG'];
/** Pair strengths: red pairs win ~0.56 against the field, the rest less. */
const STRENGTH: Record<string, number> = { RW: 0.3, RB: 0.3, UB: -0.15, UG: -0.25, WG: -0.2 };
const CARDS: Array<{ name: string; colour: string }> = [];
for (const c of 'WUBRG') for (let i = 0; i < 12; i++) CARDS.push({ name: `${c}${i}`, colour: c });
const PLANT = 'U0';

/** One batch: `n` drafts, each deck holds each of its colours' cards with probability 0.4 (singleton), PLANT adds `plant` logits. */
function synthBatch(seed: number, n: number, plant: number): { recs: DraftRecord[]; stats: Map<string, CardStat>; deff: number } {
  const r = rng(seed, 'colour-null-test');
  const recs: DraftRecord[] = [];
  for (let d = 0; d < n; d++) {
    const keys = [PAIRS[Math.floor(r.next() * PAIRS.length)] as string, PAIRS[Math.floor(r.next() * PAIRS.length)] as string];
    const taken = new Set<string>();
    const mains = keys.map((k) => CARDS.filter((c) => k.includes(c.colour) && r.next() < 0.4 && !taken.has(c.name)).map((c) => { taken.add(c.name); return c.name; }));
    const th = keys.map((k, i) => (STRENGTH[k] as number) + ((mains[i] as string[]).includes(PLANT) ? plant : 0) + 0.25 * (r.next() - 0.5));
    const pA = 1 / (1 + Math.exp(-((th[0] as number) - (th[1] as number))));
    let wa = 0, wb = 0, w = '';
    while (wa < 2 && wb < 2) { if (r.next() < pA) { wa++; w += 'A'; } else { wb++; w += 'B'; } }
    recs.push(rec(seed * 100000 + d, [keys[0] as string, mains[0] as string[]], [keys[1] as string, mains[1] as string[]], w));
  }
  const tally = new Map<string, { g: number; w: number }>();
  const deckGames: Array<{ games: number; wins: number }> = [];
  for (const x of recs) {
    const g = x.match.games.length, a = x.match.games.filter((y) => y.winner === 'A').length;
    deckGames.push({ games: g, wins: a }, { games: g, wins: g - a });
    for (const k of [0, 1] as const) for (const [, name] of (x.drafters[k] as unknown as { deck: { main: Array<[number, string]> } }).deck.main) {
      const t = tally.get(name) ?? { g: 0, w: 0 };
      t.g += g; t.w += k === 0 ? a : g - a;
      tally.set(name, t);
    }
  }
  const G = deckGames.reduce((s, x) => s + x.games, 0), p = deckGames.reduce((s, x) => s + x.wins, 0) / G;
  const deff = Math.max(1, deckGames.reduce((s, x) => s + (x.wins - p * x.games) ** 2, 0) / (p * (1 - p) * G));
  const base = colourBaselines(recs, info(CARDS.map((c) => c.name)), deff);
  const stats = new Map<string, CardStat>(CARDS.map((c) => {
    const t = tally.get(c.name) ?? { g: 0, w: 0 };
    const b = base.get(c.name);
    return [c.name, { name: c.name, seen: 100, picked: 50, pickRate: 0.5, firstTakes: 0, firstPickRate: 0, inDecks: 1, deckRate: 0.5, onColour: 0, onColourDecks: 0,
      games: t.g, wins: t.w, winRate: t.g ? t.w / t.g : 0, shrunk: 0.5, ci: [0, 1], ...(b ? { colour: b } : {}) }];
  }));
  return { recs, stats, deff };
}
const EVOLVE_CARDS: EvolveCard[] = CARDS.map((c) => ({ name: c.name, section: c.colour, themes: [], roles: [], colors: c.colour, mv: 2, land: false, fixing: false, aiFlag: 'none', rating: 80 }) as EvolveCard);

test('colour null (D377): colours that matter flag a colour under the mean and not under the colour null; a planted card is found', () => {
  let meanRed = 0, colourFalse = 0, planted = 0, confirmedPlant = 0;
  const batches = 12;
  for (let i = 0; i < batches; i++) {
    const b = synthBatch(100 + i, 1500, 0.5);
    const cands = (nul: 'mean' | 'colour') => {
      const d = discover(EVOLVE_CARDS, b.stats, 0.5, b.deff, new Map(), K, nul);
      return [...d.tests.entries()].filter(([key, t]) => key.endsWith('|dominant-win') && t.reject && t.rate >= t.p0 + K.dominantMargin).map(([key]) => key.split('|')[0] as string);
    };
    const m = cands('mean'), c = cands('colour');
    meanRed += m.filter((n) => n.startsWith('R')).length;
    colourFalse += c.filter((n) => n !== PLANT).length;
    if (c.includes(PLANT)) {
      planted++;
      const cb = synthBatch(900 + i, 600, 0.5);
      const a = { name: PLANT, status: 'dominant-win' as const, signal: 'dominant-win' as const, evidence: '', aiFlag: 'none' as const, strength: 1,
        test: ruleTest('dominant-win', { land: false }, b.stats.get(PLANT) as CardStat, 0.5, b.deff, K, true, 'colour') as NonNullable<ReturnType<typeof ruleTest>> };
      const conf = confirmCandidates([a], EVOLVE_CARDS, { stats: cb.stats, mean: 0.5, deff: cb.deff, drafts: 600, seeds: [1, 600], games: 0 }, K, 'colour');
      if (conf[0]?.confirmed) confirmedPlant++;
      assert.ok(conf[0]?.confirm?.se0 !== undefined, 'confirmation tests on the colour null too');
    }
  }
  // Red pairs win ~0.6 here: under the mean, red cards come up as a class; under the colour null, almost nothing but the plant.
  assert.ok(meanRed >= batches, `mean null flagged ${meanRed} red card(s) over ${batches} batches`);
  assert.ok(colourFalse <= 3, `colour null flagged ${colourFalse} card(s) with no effect over ${batches} batches`);
  assert.ok(planted >= batches - 2, `the planted blue card (+0.5 logits, a weak colour) was found in ${planted} of ${batches}`);
  assert.ok(confirmedPlant >= planted / 2, `and confirmed in ${confirmedPlant} of ${planted}`);
});
