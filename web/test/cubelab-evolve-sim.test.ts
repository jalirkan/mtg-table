/*
 * mtg-table — web/test/cubelab-evolve-sim.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The evolve loop's statistics (tools/cubelab/evolve-stats.ts, D331) and the
 * whole two-stage rule on a seeded simulated cube (tools/cubelab/evolve-sim.ts),
 * engine-free:
 *
 *  - the arithmetic: binomial tails against hand values, Benjamini–Hochberg and
 *    Holm on textbook cases, the design effect (1 for independent best-of-three
 *    games, stopping rule included; above 1 when decks differ), sample sizes;
 *  - on a NULL cube (no card better than another, decks of varying strength,
 *    best of three): the old rule flags a "dominant" card in a large share of
 *    generations, and more when generations pool; the new rule's chance of any
 *    false candidate is at most the false-discovery rate (10%), and of any false
 *    cut at most 5% a generation;
 *  - with one card PLANTED dead or dominant, the rule finds and confirms it.
 *
 * `node tools/cubelab/evolve-sim.ts --sims 1000` prints the same table with
 * more simulations (D331 quotes it).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  benjaminiHochberg, binomLower, binomUpper, designEffect, holm, incBeta, normalCdf, normalQuantile, requiredN,
} from '../../tools/cubelab/evolve-stats.ts';
import { nullCube, oldRates, simBatch, simRates } from '../../tools/cubelab/evolve-sim.ts';

const near = (a: number, b: number, tol: number, what: string): void => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`);

test('normal and binomial arithmetic', () => {
  near(normalCdf(1.959964), 0.975, 1e-6, 'Φ(1.96)');
  near(normalCdf(-3), 0.0013499, 1e-6, 'Φ(-3)');
  near(normalQuantile(0.975), 1.959964, 1e-6, 'Φ⁻¹(0.975)');
  near(normalQuantile(1e-4), -3.719016, 1e-5, 'Φ⁻¹(1e-4)');
  near(incBeta(0.5, 2, 3), 0.6875, 1e-10, 'I_0.5(2,3)');
  // P(X ≥ 8 | 10, 0.5) = 56/1024; P(X ≤ 0 | 10, 0.35) = 0.65^10.
  near(binomUpper(8, 10, 0.5), 56 / 1024, 1e-12, 'upper tail');
  near(binomLower(0, 10, 0.35), 0.65 ** 10, 1e-12, 'lower tail');
  near(binomLower(3, 10, 0.35) + binomUpper(4, 10, 0.35), 1, 1e-12, 'the two tails');
  assert.equal(binomUpper(0, 10, 0.5), 1);
  assert.equal(binomUpper(11, 10, 0.5), 0);
  // A fractional (design-effect) count sits between its whole neighbours.
  const mid = binomUpper(40 / 1.2, 60 / 1.2, 0.5);
  assert.ok(mid > binomUpper(34, 50, 0.5) && mid < binomUpper(33, 50, 0.5), String(mid));
});

test('Benjamini–Hochberg and Holm', () => {
  // The textbook case: m = 10, q = 0.05 rejects the two smallest.
  const ps = [0.001, 0.008, 0.039, 0.041, 0.042, 0.06, 0.074, 0.205, 0.212, 0.216];
  const bh = benjaminiHochberg(ps, 0.05);
  assert.deepEqual(bh.reject, [true, true, false, false, false, false, false, false, false, false]);
  assert.equal(bh.cutoff, 0.008);
  near(bh.q[0] as number, 0.01, 1e-12, 'q of the smallest');
  assert.deepEqual(benjaminiHochberg([0.5, 0.9], 0.1).reject, [false, false]);
  assert.equal(benjaminiHochberg([0.5, 0.9], 0.1).cutoff, 0);
  // Holm: 0.01·3 = 0.03 ≤ 0.05, then 0.02·2 = 0.04, then 0.04·1.
  const h = holm([0.02, 0.01, 0.04], 0.05);
  assert.deepEqual(h.reject, [true, true, true]);
  // Step-down: 0.02·2 = 0.04, then max(0.04, 0.03·1); at 0.03 the first step already fails, so nothing is rejected.
  assert.deepEqual(holm([0.02, 0.03], 0.05).adjusted, [0.04, 0.04]);
  assert.deepEqual(holm([0.03, 0.02], 0.03).reject, [false, false]);
});

test('the design effect: 1 for independent best-of-three games, more when decks differ', () => {
  // Exact enumeration of a fair best of three: 2–0, 0–2 (¼ each), 2–1, 1–2 (¼ each).
  const fair = [{ games: 2, wins: 2 }, { games: 2, wins: 0 }, { games: 3, wins: 2 }, { games: 3, wins: 1 }];
  near(designEffect(fair), 1, 1e-12, 'stopping at two wins adds no variance');
  // Decks that always win or always lose: every game of a match is the same outcome.
  assert.ok(designEffect([{ games: 3, wins: 3 }, { games: 3, wins: 0 }]) > 2.5);
  assert.equal(designEffect([]), 1);
  // The simulator's deck spread is set to the lab's measured 1.1–1.2.
  const b = simBatch(nullCube(180, 3), 400, 77);
  assert.ok(b.deff > 1.05 && b.deff < 1.3, String(b.deff));
  // Sample sizes: 0.5 vs 0.6 one-sided at 5% with 80% power is about 150.
  const n = requiredN(0.5, 0.6, 0.05, 0.8);
  assert.ok(n >= 150 && n <= 156, String(n));
  assert.equal(requiredN(0.5, 0.5, 0.05, 0.8), Infinity);
});

test('null cube: the old rule flags noise; discovery stays within its 10% FDR and confirmed cuts within 5% a generation', () => {
  const old = oldRates(200, 30, 3, 11);
  assert.ok(old.oneLook > 0.2, `old rule, one look: ${old.oneLook}`);
  assert.ok(old.pooled > 0.7 && old.pooled > old.oneLook, `old rule, three pooled looks: ${old.pooled}`);
  for (const drafts of [30, 200]) {
    const r = simRates(drafts === 30 ? 300 : 200, drafts, 21);
    assert.ok(r.anyCandidate <= 0.1, `${drafts} drafts: any false candidate ${r.anyCandidate}`);
    assert.ok(r.anyConfirmed <= 0.05, `${drafts} drafts: any false cut ${r.anyConfirmed}`);
  }
});

test('a planted dead card and a planted dominant card are found and confirmed', () => {
  const dead = simRates(80, 200, 31, { plant: { playRate: 0.05 } });
  assert.ok((dead.planted?.confirmed ?? 0) >= 0.8, `dead, 200 drafts: ${JSON.stringify(dead.planted)}`);
  assert.ok(dead.meanConfirmDrafts > 0 && dead.meanConfirmDrafts <= 300);
  const dom = simRates(50, 600, 41, { plant: { effect: 0.15 } });
  assert.ok((dom.planted?.confirmed ?? 0) >= 0.65, `dominant +0.15, 600 drafts: ${JSON.stringify(dom.planted)}`);
  assert.ok(dom.anyConfirmed <= 0.1, `false cuts beside it: ${dom.anyConfirmed}`);
});
