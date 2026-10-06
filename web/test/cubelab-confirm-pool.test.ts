/*
 * mtg-table — web/test/cubelab-confirm-pool.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * D357: a candidate confirmed again in a later generation is judged on every
 * one of its confirmation batches pooled, at confirmAlpha / 2^(attempt − 1)
 * (tools/cubelab/evolve.ts confirmCandidates, pooledTest, priorAttempts):
 *
 *  - a first attempt is exactly D331's test, whatever confirmPool says;
 *  - pooling adds effective counts and weights each batch's boundary;
 *  - J039's Fable of the Mirror-Breaker (generation 3: 140 of 296, not
 *    confirmed; generation 4: 179 of 316, confirmed under D331) is kept;
 *  - over repeated attempts a card with no effect is cut at most
 *    2·confirmAlpha of the time, where D331's rule climbs with every attempt;
 *  - the changelog lists every attempt and the pooled result;
 *  - an old folder's knobs (no confirmPool) resume under D331.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  confirmCandidates, EVOLVE_DEFAULTS, mergeKnobs, pooledTest, priorAttempts,
  type Assessment, type CardStat, type ConfirmAttempt, type ConfirmInput, type EvolveCard, type EvolveKnobs, type RuleTest,
} from '../../tools/cubelab/evolve.ts';
import { binomUpper } from '../../tools/cubelab/evolve-stats.ts';
import { changelog, type GenSummary } from '../../tools/cubelab/evolve-report.ts';
import { rng } from '../../tools/cubelab/rng.ts';

const K = EVOLVE_DEFAULTS;
const D331: EvolveKnobs = { ...K, confirmPool: 0 };
const FABLE = 'Fable of the Mirror-Breaker';

const card = (name: string): EvolveCard => ({ name, section: 'Red', themes: [], roles: [], colors: 'R', mv: 3, land: false, fixing: false, aiFlag: 'none', rating: 90 }) as EvolveCard;
const stat = (name: string, wins: number, games: number, mean: number): CardStat => ({
  name, seen: 100, picked: 80, pickRate: 0.8, firstTakes: 30, firstPickRate: 0.3, inDecks: 70, deckRate: 0.7, onColour: 40, onColourDecks: 35,
  games, wins, winRate: games ? wins / games : 0, shrunk: (wins + 20 * mean) / (games + 20), ci: [0, 1],
});
/** A dominant-win candidate from a discovery test (its numbers only label the row). */
const cand = (name: string, wins: number, games: number, mean: number): Assessment => ({
  name, status: 'dominant-win', signal: 'dominant-win', evidence: '', aiFlag: 'none', strength: 1,
  test: { rule: 'dominant-win', n: games, x: wins, rate: wins / games, p0: mean, deff: 1, p: binomUpper(wins, games, mean), qValue: 0.01 },
});
const batch = (gen: number, st: CardStat[], mean: number, deff: number, history: ConfirmAttempt[] = []): ConfirmInput => ({
  stats: new Map(st.map((s) => [s.name, s])), mean, deff, drafts: 300, seeds: [1000001 + (gen - 1) * 300, 1000300 + (gen - 1) * 300], games: 1500, gen, history,
});

test('a first attempt is D331\'s test bit for bit, under either setting', () => {
  const cards = [card('A'), card('B'), card('C')];
  const cands = [cand('A', 60, 90, 0.5), cand('B', 50, 80, 0.5), cand('C', 70, 100, 0.5)];
  const c = batch(1, [stat('A', 70, 110, 0.5), stat('B', 41, 80, 0.5), stat('C', 64, 100, 0.5)], 0.5, 1.12);
  const old = confirmCandidates(cands, cards, c, D331);
  const now = confirmCandidates(cands, cards, c, K);
  const core = (x: typeof old): unknown => x.map((r) => [r.name, r.confirm, r.holmP, r.confirmed, r.reason]);
  assert.deepEqual(core(now), core(old));
  for (const r of now) {
    assert.equal(r.attempt, 1);
    assert.deepEqual(r.pooled, r.confirm, 'one attempt pooled is that attempt');
    assert.equal(r.spentP, r.confirm?.p);
  }
  assert.deepEqual(now.map((r) => r.confirmed), [true, false, true]);
  // An empty history from an earlier generation that never met these cards changes nothing either.
  const other: ConfirmAttempt = { name: 'Z', rule: 'dominant-win', gen: 1, seeds: [1, 2], n: 100, x: 40, p0: 0.5, deff: 1, p: 0.98, games: 100, wins: 40, mean: 0.5, confirmed: false };
  assert.deepEqual(core(confirmCandidates(cands, cards, { ...c, gen: 2, history: [other] }, K)), core(old));
});

test('pooledTest adds effective counts and weights each batch\'s boundary by them', () => {
  const a = { n: 220, x: 132, p0: 0.5, deff: 1.1, p: 0 };
  const b = { n: 300, x: 165, p0: 0.48, deff: 1.2, p: 0 };
  const t = pooledTest('dominant-win', [a, b]) as RuleTest;
  const ne = 200 + 250, xe = 120 + 137.5;
  assert.equal(t.n, 520);
  assert.equal(t.x, 297);
  assert.ok(Math.abs(t.p0 - (200 * 0.5 + 250 * 0.48) / ne) < 1e-12);
  assert.ok(Math.abs(t.deff - 520 / ne) < 1e-12);
  assert.ok(Math.abs(t.p - binomUpper(xe, ne, t.p0)) < 1e-12);
  // dead pools on the lower tail, against the knob's boundary.
  const d = pooledTest('dead', [{ n: 12, x: 2, p0: 0.35, deff: 1, p: 0 }, { n: 18, x: 3, p0: 0.35, deff: 1, p: 0 }]) as RuleTest;
  assert.equal(d.n, 30);
  assert.equal(d.x, 5);
  assert.ok(d.p < 0.05 && d.p > 0.01, String(d.p));
  // A single attempt comes back as it was.
  assert.deepEqual(pooledTest('dominant-win', [{ ...a, p: 0.07 }]), { rule: 'dominant-win', n: 220, x: 132, rate: 0.6, p0: 0.5, deff: 1.1, p: 0.07 });
});

test('a failed confirmation counts against the card: the pooled evidence decides, at half the level', () => {
  const cards = [card('A')];
  // Attempt 1 failed (48 of 100); attempt 2 alone would pass (66 of 100) -- pooled, 114 of 200 does not reach 0.025.
  const h: ConfirmAttempt = { name: 'A', rule: 'dominant-win', gen: 1, seeds: [1, 2], n: 100, x: 48, p0: 0.5, deff: 1, p: binomUpper(48, 100, 0.5), games: 100, wins: 48, mean: 0.5, confirmed: false };
  const c = batch(2, [stat('A', 66, 100, 0.5)], 0.5, 1, [h]);
  const [old] = confirmCandidates([cand('A', 60, 90, 0.5)], cards, c, D331);
  const [now] = confirmCandidates([cand('A', 60, 90, 0.5)], cards, c, K);
  assert.equal(old?.confirmed, true, 'D331 reads the second batch alone');
  assert.equal(now?.confirmed, false);
  assert.equal(now?.attempt, 2);
  assert.equal(now?.pooled?.n, 200);
  assert.equal(now?.pooled?.x, 114);
  assert.ok(Math.abs((now?.spentP as number) - 2 * (now?.pooled?.p as number)) < 1e-12);
  assert.match(now?.reason ?? '', /on all 2 confirmation batches pooled \(attempt 2, level 0.05 \/ 2\)/);
  assert.equal(now?.thisAttempt?.confirmed, false);
  assert.equal(now?.thisAttempt?.gen, 2);
  // A card that is really strong confirms on the pooled evidence too.
  const strong = batch(2, [stat('A', 75, 100, 0.5)], 0.5, 1, [{ ...h, x: 62, wins: 62 }]);
  assert.equal(confirmCandidates([cand('A', 60, 90, 0.5)], cards, strong, K)[0]?.confirmed, true);
});

/** J039 (Omega, 4 × 2,000 drafts, --explore on): Fable's two confirmation batches, at a batch mean of 0.50, no design effect. */
function fable(mean = 0.5, deff = 1, knobs = K): ReturnType<typeof confirmCandidates> {
  const cards = [card(FABLE)];
  const g3 = confirmCandidates([cand(FABLE, 757, 1341, mean)], cards, batch(3, [stat(FABLE, 140, 296, mean)], mean, deff), knobs);
  assert.equal(g3[0]?.confirmed, false, 'generation 3: 140 of 296 is not a confirmation');
  const hist = priorAttempts([{ gen: 3, decision: { confirmations: g3, confirmBatch: { drafts: 300, seeds: [1000601, 1000900], games: 1500, mean, deff } } }]);
  assert.equal(hist.length, 1);
  return confirmCandidates([cand(FABLE, 761, 1382, mean)], cards, batch(4, [stat(FABLE, 179, 316, mean)], mean, deff, hist), knobs);
}

test('J039: Fable of the Mirror-Breaker, cut under D331, is kept under D357', () => {
  const [old] = fable(0.5, 1, D331);
  assert.equal(old?.confirmed, true, 'D331: 179 of 316 alone confirms');
  const [now] = fable();
  assert.equal(now?.attempt, 2);
  assert.equal(now?.pooled?.n, 612);
  assert.equal(now?.pooled?.x, 319);
  assert.equal((now?.pooled?.rate as number).toFixed(3), '0.521');
  assert.ok((now?.pooled?.p as number) > 0.15 && (now?.pooled?.p as number) < 0.16, String(now?.pooled?.p));
  assert.ok((now?.spentP as number) > 0.3, String(now?.spentP));
  assert.equal(now?.confirmed, false);
  assert.match(now?.reason ?? '', /not significant on all 2 confirmation batches pooled/);
  // The verdict does not hang on the batch mean or the design effect we do not have: from 0.472 up, the
  // pooled 0.521 is under the mean + 0.05 (and from 0.48 it is not significant at 0.025 either).
  for (const m of [0.472, 0.48, 0.49, 0.5, 0.51, 0.516]) for (const d of [1, 1.1, 1.2]) {
    assert.equal(fable(m, d)[0]?.confirmed, false, `mean ${m}, design effect ${d}`);
  }
});

/** A card that is a candidate in every one of `gens` generations, confirmed on `games` fresh games at true rate p (mean 0.5). */
function repeatedRate(p: number, gens: number, games: number, sims: number, knobs: EvolveKnobs, seed: number): number {
  const r = rng(seed, 'confirm-pool');
  const cards = [card('A')];
  let cut = 0;
  for (let s = 0; s < sims; s++) {
    const hist: ConfirmAttempt[] = [];
    for (let g = 1; g <= gens; g++) {
      let w = 0;
      for (let i = 0; i < games; i++) if (r.next() < p) w++;
      const [c] = confirmCandidates([cand('A', 60, 90, 0.5)], cards, batch(g, [stat('A', w, games, 0.5)], 0.5, 1, hist), knobs);
      if (c?.confirmed) { cut++; break; }
      hist.push(c?.thisAttempt as ConfirmAttempt);
    }
  }
  return cut / sims;
}

test('over repeated attempts a card with no effect is cut at most 2·confirmAlpha; D331\'s rule climbs with every attempt', () => {
  const one = repeatedRate(0.5, 1, 300, 2000, K, 1);
  const oldSix = repeatedRate(0.5, 6, 300, 2000, D331, 2);
  const newSix = repeatedRate(0.5, 6, 300, 2000, K, 2);
  assert.ok(one < K.confirmAlpha + 0.015, `one attempt ${one}`);
  assert.ok(oldSix > 0.1, `D331, six attempts ${oldSix}`);
  assert.ok(newSix <= 2 * K.confirmAlpha, `D357, six attempts ${newSix}`);
  assert.ok(newSix < oldSix / 2, `${newSix} vs ${oldSix}`);
  // And a card that really is +0.10 still goes, usually on its first attempt.
  assert.ok(repeatedRate(0.6, 3, 300, 400, K, 3) > 0.9);
});

test('the changelog lists every attempt and the pooled result', () => {
  const g3c = confirmCandidates([cand(FABLE, 757, 1341, 0.5)], [card(FABLE)], batch(3, [stat(FABLE, 140, 296, 0.5)], 0.5, 1), K);
  const g4c = fable();
  const gen = (g: number, confirmations: typeof g3c): GenSummary => ({
    gen: g, versionIn: g, versionOut: g, date: '2026-10-04', drafts: 2000, seeds: [1, 2000], games: 4800,
    decision: {
      swaps: [], assessments: [], discovery: { drafts: 2000, family: 400, q: 0.1, cutoff: 0.001, deff: 1.1, candidates: 1 }, plan: { drafts: 300, needs: [], underpowered: [] },
      confirmBatch: { drafts: 300, seeds: [1000001 + (g - 1) * 300, 1000300 + (g - 1) * 300], games: 1500, mean: 0.5, deff: 1 }, confirmations, confirmRule: 'D357',
      unmatched: [], watch: [], aiLimited: [], humanTest: [], pendingTries: [], verdict: 'No swaps: nothing was confirmed.', violationsBefore: [], violationsAfter: [],
    },
    balance: { mean: 0.5, colours: [], pairs: [], themes: [] }, stats: [],
  });
  const md = changelog('Omega', [gen(3, g3c), gen(4, g4c)]);
  assert.match(md, /## Confirmation history \(every attempt, pooled\)/);
  const row = md.split('\n').find((l) => l.startsWith(`| ${FABLE} | dominant-win |`)) as string;
  assert.ok(row, md);
  assert.match(row, /g3: won 140 of 296 decisive games \(0\.47 vs 0\.50\), p [\d.]+ — not confirmed; g4: won 179 of 316 decisive games \(0\.57 vs 0\.50\), p [\d.]+ — not confirmed/);
  assert.match(row, /won 319 of 612 decisive games \(0\.52 vs 0\.50\), p 0\.15\d \(2 attempts\) \| kept \|$/);
  assert.match(md, /attempt 2 \(g3, g4\): won 319 of 612 decisive games \(0\.52 vs 0\.50\), p 0\.15\d, tested at level \/ 2, Holm p 0\.3\d\d/);
  // No attempts, no section.
  assert.doesNotMatch(changelog('Omega', [gen(1, [])]), /Confirmation history/);
});

test('confirmPool is 0 or 1; the default is the pooled rule', () => {
  assert.equal(K.confirmPool, 1);
  assert.equal(mergeKnobs(K, ['confirmPool=0']).confirmPool, 0);
  assert.throws(() => mergeKnobs(K, ['confirmPool=2']), /confirmPool is 0 \(D331\) or 1 \(D357\)/);
});
