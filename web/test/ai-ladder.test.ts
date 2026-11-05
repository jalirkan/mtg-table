/*
 * mtg-table — web/test/ai-ladder.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The AI ladder (tools/ai-ladder/, D318–D321), engine-free, on synthetic
 * results from players with known strengths:
 *
 *  - the Bradley-Terry fit recovers known Elo differences, keeps the anchor at
 *    1500, gives finite ratings to an unbeaten player, and its Hessian and
 *    bootstrap intervals cover the truth and roughly agree;
 *  - the SPRT accepts H1 for a clearly stronger player, H0 for a weaker one, and
 *    under elo = elo0 accepts H1 about as rarely as alpha says;
 *  - the tuner's grid and seeded sample, and successive halving finding the
 *    strongest of eight synthetic configs;
 *  - the scheduler (new players first, the anchor share, the most informative
 *    pair, fixed deal slots), the league's promotion rule, the registry (hashes,
 *    unknown kinds unavailable, never overwrite), the results log (ai-bench line
 *    mapping, dedup, torn lines, mirror blocks) and ladder.json's schema 1 keys;
 *  - the fixed-size match (D398): its pair-score interval and Elo ends, the
 *    interval's coverage, and the search counters with a game-clustered rate.
 */

import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { rng } from '../../tools/cubelab/rng.ts';
import { KINDS, resolveParams, testOnly, unavailable } from '../../tools/ai-ladder/kinds.ts';
import { decide } from '../../tools/ai-ladder/league.ts';
import { joinLog, type ExpLine } from '../../tools/ai-ladder/experiments.ts';
import { split } from '../../tools/ai-ladder/decksets.ts';
import { bootstrap, expected, fit, solve } from '../../tools/ai-ladder/rating.ts';
import { addPlayer, configHash, parseRegistry, players, resolvePlayer, type Player } from '../../tools/ai-ladder/registry.ts';
import { buildLadder, renderHtml } from '../../tools/ai-ladder/report.ts';
import { appendResults, blockKey, fromBench, hashIndex, outcomes, readResults, type GameRecord, type Outcome } from '../../tools/ai-ladder/results.ts';
import { batchPairs, choose, hostBase, mkey, type SchedPlayer, type SchedState } from '../../tools/ai-ladder/schedule.ts';
import { bounds, NI_DEFAULTS, niPairsNeeded, niState, pairScores, scoreDelta, SPRT_DEFAULTS, sprtState, verdictWords, type SprtParams } from '../../tools/ai-ladder/sprt.ts';
import { grid, halving, sample, scoreOf, type Tally } from '../../tools/ai-ladder/tune.ts';
import { budgetRate, eloOf, emptyTally, matchSummary, pairsForHalfWidth, tallyBatch, tallyLine } from '../../tools/ai-ladder/match.ts';

const REPO = fileURLToPath(new URL('../../', import.meta.url));

/** n mirrored pairs of a vs b: each pair is two games; `corr` makes the deal favour one side. */
function games(a: string, b: string, eloA: number, eloB: number, pairs: number, seed: number, corr = 0): Outcome[] {
  const r = rng(seed, `${a}-${b}`);
  const p = expected(eloA, eloB);
  const out: Outcome[] = [];
  for (let k = 0; k < pairs; k++) {
    const tilt = corr * (r.next() - 0.5);             // the deal: the same for both games of the pair
    for (let g = 0; g < 2; g++) {
      const q = Math.min(0.99, Math.max(0.01, p + (g === 0 ? tilt : -tilt)));
      out.push({ a, b, s: r.next() < q ? 1 : 0, block: `${a}|${b}|${seed}|${k}` });
    }
  }
  return out;
}

// ------------------------------------------------------------ rating

test('solve: a small linear system', () => {
  const x = solve([[4, 1, 0], [1, 3, 1], [0, 1, 2]], [1, 2, 3]);
  assert.ok(Math.abs(4 * x[0]! + x[1]! - 1) < 1e-9 && Math.abs(x[0]! + 3 * x[1]! + x[2]! - 2) < 1e-9 && Math.abs(x[1]! + 2 * x[2]! - 3) < 1e-9);
});

test('Bradley-Terry recovers known Elo differences with the anchor fixed at 1500', () => {
  const truth: Record<string, number> = { 'forge-default': 1500, x: 1600, y: 1420, z: 1550 };
  const names = Object.keys(truth);
  const g: Outcome[] = [];
  let seed = 1;
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) g.push(...games(names[i]!, names[j]!, truth[names[i]!]!, truth[names[j]!]!, 600, seed++));
  const f = fit(names, g, { anchor: 'forge-default' });
  assert.ok(f.converged);
  const d = f.ratings.get('forge-default')!;
  assert.equal(d.rating, 1500);
  assert.equal(d.se, 0);
  for (const n of ['x', 'y', 'z']) {
    const r = f.ratings.get(n)!;
    assert.ok(Math.abs(r.rating - truth[n]!) < 3 * r.se + 5, `${n}: ${r.rating.toFixed(1)} vs ${truth[n]} (se ${r.se.toFixed(1)})`);
    assert.ok(r.lo < truth[n]! + 10 && r.hi > truth[n]! - 10, `${n}: CI ${r.lo.toFixed(0)}-${r.hi.toFixed(0)} covers ${truth[n]}`);
    assert.ok(r.se > 5 && r.se < 25, `${n}: se ${r.se}`);
  }
  // the ordering is right
  const R = (n: string): number => f.ratings.get(n)!.rating;
  assert.ok(R('x') > R('z') && R('z') > R('forge-default') && R('forge-default') > R('y'));
});

test('an unbeaten player gets a finite rating, a player with no games is unrated at the prior', () => {
  const g: Outcome[] = Array.from({ length: 10 }, (_, k) => ({ a: 'x', b: 'forge-default', s: 1 as const, block: `b${k}` }));
  const f = fit(['forge-default', 'x', 'idle'], g, { anchor: 'forge-default' });
  const x = f.ratings.get('x')!;
  assert.ok(Number.isFinite(x.rating) && x.rating > 1600 && x.rating < 2400, `x = ${x.rating}`);
  assert.ok(x.hi > x.lo);
  const idle = f.ratings.get('idle')!;
  assert.equal(idle.rated, false);
  assert.equal(idle.rating, 1500);
});

test('bootstrap over mirror blocks: intervals cover the truth and are in the Hessian\'s range', () => {
  const g = [...games('x', 'forge-default', 1560, 1500, 250, 7, 0.4), ...games('y', 'forge-default', 1450, 1500, 250, 8, 0.4), ...games('x', 'y', 1560, 1450, 250, 9, 0.4)];
  const names = ['forge-default', 'x', 'y'];
  const o = { anchor: 'forge-default' };
  const h = fit(names, g, o);
  const b = bootstrap(h, names, g, o, 150, 3);
  for (const n of ['x', 'y']) {
    const hr = h.ratings.get(n)!, br = b.ratings.get(n)!;
    assert.equal(br.rating, hr.rating, 'the point estimate is the full-data fit');
    const truth = n === 'x' ? 1560 : 1450;
    assert.ok(br.lo < truth && br.hi > truth, `${n}: bootstrap ${br.lo.toFixed(0)}-${br.hi.toFixed(0)} covers ${truth}`);
    const ratio = (br.hi - br.lo) / (hr.hi - hr.lo);
    assert.ok(ratio > 0.6 && ratio < 2.0, `${n}: bootstrap/Hessian width ratio ${ratio.toFixed(2)}`);
  }
});

// ------------------------------------------------------------ SPRT

// D373's defaults (minPairs 100, variance floor 0.05): nothing set here.
const P: SprtParams = { elo0: 0, elo1: 20, alpha: 0.05, beta: 0.05, maxGames: 20000 };

function runSprt(trueElo: number, seed: number, corr = 0.3): ReturnType<typeof sprtState> {
  const r = rng(seed, 'sprt');
  const p = expected(1500 + trueElo, 1500);
  const gs: Array<{ block: string; aWon: boolean | null }> = [];
  for (let k = 0; ; k++) {
    const tilt = corr * (r.next() - 0.5);
    for (let g = 0; g < 2; g++) {
      const q = Math.min(0.99, Math.max(0.01, p + (g === 0 ? tilt : -tilt)));
      const draw = r.next() < 0.02;
      gs.push({ block: `k${k}`, aWon: draw ? null : r.next() < q });
    }
    if (k % 10 === 9) {
      const st = sprtState(pairScores(gs), P);
      if (st.result !== 'continue') return st;
    }
  }
}

test('SPRT bounds are the Wald bounds', () => {
  const b = bounds({ alpha: 0.05, beta: 0.05 });
  assert.ok(Math.abs(b.upper - Math.log(19)) < 1e-12 && Math.abs(b.lower + Math.log(19)) < 1e-12);
});

test('SPRT: a clearly stronger A is accepted (H1), a weaker one rejected (H0)', () => {
  let h1 = 0, h0 = 0, n = 0, used = 0;
  for (let s = 0; s < 20; s++) {
    const st = runSprt(70, 100 + s);
    if (st.result === 'H1') h1++;
    used += st.games;
    n++;
    if (runSprt(-30, 300 + s).result === 'H0') h0++;
  }
  assert.ok(h1 >= 19, `H1 accepted ${h1}/20 at +70 Elo`);
  assert.ok(h0 >= 19, `H0 accepted ${h0}/20 at -30 Elo`);
  assert.ok(used / n < 2500, `a +70 Elo gap is decided in ${Math.round(used / n)} games on average`);
});

test('SPRT: at the H0 boundary (A = B), H1 is accepted about as rarely as alpha', () => {
  let h1 = 0;
  const N = 120;
  for (let s = 0; s < N; s++) if (runSprt(0, 1000 + s).result === 'H1') h1++;
  assert.ok(h1 / N <= 0.1, `false H1 rate ${h1}/${N}`);
});

test('SPRT: the game limit gives inconclusive; too few pairs never decide', () => {
  const st = sprtState(Array.from({ length: 99 }, () => ({ x: 1, games: 2 })), P);
  assert.equal(st.result, 'continue', '99 perfect pairs are not enough (minPairs 100, D373)');
  assert.equal(sprtState(Array.from({ length: 100 }, () => ({ x: 1, games: 2 })), P).result, 'H1');
  const lim = sprtState(Array.from({ length: 50 }, (_, k) => ({ x: k % 2, games: 2 })), { ...P, maxGames: 100 });
  assert.equal(lim.result, 'inconclusive');
  assert.equal(lim.games, 100);
});

test('SPRT (D373): defaults are 100 pairs and a 0.05 floor; the old 8 / 0.01 stay reachable when asked for', () => {
  assert.deepEqual({ ...SPRT_DEFAULTS }, { minPairs: 100, varFloor: 0.05 });
  // J054's shape at elo0 20 / elo1 40: mirror pairs that split 1-1, then one lopsided pair against A
  const pairs = [...Array.from({ length: 20 }, () => ({ x: 0.5, games: 2 })), { x: 0, games: 2 }];
  const old = sprtState(pairs, { elo0: 20, elo1: 40, alpha: 0.05, beta: 0.05, minPairs: 8, varFloor: 0.01 });
  assert.equal(old.result, 'H0', 'the old floor ends this at 42 games');
  const now = sprtState(pairs, { elo0: 20, elo1: 40, alpha: 0.05, beta: 0.05 });
  assert.equal(now.result, 'continue', 'D373 does not');
  assert.ok(Math.abs(now.llr) < Math.abs(old.llr) / 3, `the floor damps the LLR (${now.llr.toFixed(2)} vs ${old.llr.toFixed(2)})`);
});

test('SPRT (D373): H0 reads "not shown >= elo1 better", never "no gain"', () => {
  const p = { elo0: 0, elo1: 20 };
  const h0 = verdictWords('H0', 'a', 'b', p);
  assert.match(h0, /not shown to be >= 20 Elo better/);
  assert.match(h0, /not ruled out/);
  assert.doesNotMatch(h0.toLowerCase(), /no gain/);
  assert.match(verdictWords('H1', 'a', 'b', p), /stronger than b by >= 20/);
  assert.match(verdictWords('inconclusive', 'a', 'b', p), /neither/);
  assert.match(decide({ llr: -3, lower: -2.9, upper: 2.9, pairs: 200, games: 400, score: 0.5, result: 'H0' }, { result: 'continue' } as never, 30).reason, /not "no gain"/);
});

test('pairScores: two games of a block are one observation; draws drop out', () => {
  const ps = pairScores([
    { block: 'p1', aWon: true }, { block: 'p1', aWon: false },
    { block: 'p2', aWon: true }, { block: 'p2', aWon: null },
    { block: 'p3', aWon: null }, { block: 'p3', aWon: null },
  ]);
  assert.deepEqual(ps, [{ x: 0.5, games: 2 }, { x: 1, games: 1 }]);
});

// ------------------------------------------------------------ tuner

test('grid and sample', () => {
  const g = grid({ profile: 'Default', outlets: 'on' }, [['profile', ['Default', 'Cautious', 'Reckless', 'Experimental']], ['outlets', ['on', 'off']]]);
  assert.equal(g.length, 8);
  assert.equal(g[0]!.label, 'profile=Default,outlets=on');
  assert.equal(g[7]!.label, 'profile=Experimental,outlets=off');
  assert.equal(new Set(g.map((c) => c.label)).size, 8);
  const s1 = sample(g, 3, 5), s2 = sample(g, 3, 5);
  assert.deepEqual(s1.map((c) => c.id), s2.map((c) => c.id), 'seeded');
  assert.equal(s1.length, 3);
  assert.deepEqual(sample(g, 20, 5), g);
});

test('successive halving finds the strongest of eight synthetic configs, with the same deals for all', async () => {
  const g = grid({}, [['budgetMs', [500, 1500, 3000, 6000]], ['depth', [1, 2]]]);
  const strength = (id: number): number => [0, 20, 35, 60, 10, 30, 110, 45][id]!;   // id 6 is best by 50
  let wins = 0;
  for (let trial = 0; trial < 10; trial++) {
    const seen: number[][] = [];
    const res = await halving(g, { eta: 2, blocks: 2, maxRounds: 6 }, async (alive, round, blocks) => {
      seen.push(alive.map((c) => c.id));
      const out = new Map<number, Tally>();
      for (const c of alive) {
        const r = rng(trial * 100 + round, `c${c.id}`);
        const t: Tally = { wins: 0, losses: 0, draws: 0 };
        for (let k = 0; k < blocks * 40; k++) { if (r.next() < expected(1500 + strength(c.id), 1520)) t.wins++; else t.losses++; }
        out.set(c.id, t);
      }
      return out;
    });
    assert.deepEqual(seen.map((s) => s.length), [8, 4, 2], 'eight, four, two');
    assert.equal(res.rounds.length, 3);
    assert.equal(res.rounds[1]!.blocks, 4, 'round 2 plays twice the blocks');
    if (res.winner.id === 6) wins++;
    assert.ok(scoreOf(res.totals.get(res.winner.id)!) > 0.4);
  }
  assert.ok(wins >= 8, `the best config won ${wins}/10 tunes`);
});

// ------------------------------------------------------------ league

test('league promotion: SPRT H1 AND non-inferior against forge-default', () => {
  const st = (result: 'H1' | 'H0' | 'continue' | 'inconclusive') => ({ llr: 3, lower: -2.94, upper: 2.94, pairs: 100, games: 200, score: 0.56, result });
  const ni = (result: 'non-inferior' | 'inferior' | 'continue' | 'inconclusive') => ({ llr: 0, lower: -2.89, upper: 2.2, pairs: 400, diff: 0, diffElo: 0, result });
  assert.equal(decide(st('H1'), ni('non-inferior'), 30).verdict, 'promote');
  const forgot = decide(st('H1'), ni('inferior'), 30);
  assert.equal(forgot.verdict, 'reject');
  assert.match(forgot.reason, /forgets Forge/);
  assert.equal(decide(st('H0'), ni('continue'), 30).verdict, 'reject', 'H0 rejects without waiting for the Forge test');
  assert.equal(decide(st('inconclusive'), ni('non-inferior'), 30).verdict, 'reject');
  assert.equal(decide(st('continue'), ni('non-inferior'), 30).verdict, 'continue');
  assert.equal(decide(st('H1'), ni('continue'), 30).verdict, 'continue', 'waits for the Forge test');
  assert.equal(decide(st('continue'), ni('inferior'), 30).verdict, 'reject', 'an inferior result rejects at once');
  assert.equal(decide(st('H1'), ni('inconclusive'), 30).verdict, 'reject');
});

/** Paired mirror blocks vs forge-default for a candidate `edge` Elo above the best; the deal is shared (rho ~ 0.5). */
function runNi(edge: number, seed: number, bestElo = 30): ReturnType<typeof niState> {
  const r = rng(seed, 'ni');
  const diffs: number[] = [];
  for (let k = 0; ; k++) {
    const tilt = 0.5 * (r.next() - 0.5);                       // the deal, common to both arms
    const block = (elo: number): number => {
      const p = expected(1500 + elo, 1500);
      let w = 0;
      for (let g = 0; g < 2; g++) if (r.next() < Math.min(0.99, Math.max(0.01, p + (g === 0 ? tilt : -tilt)))) w++;
      return w / 2;
    };
    diffs.push(block(bestElo + edge) - block(bestElo));
    if (k % 20 === 19) {
      const st = niState(diffs, NI_DEFAULTS);
      if (st.result !== 'continue') return st;
    }
  }
}

test('the Forge non-inferiority test: stated margin 30 Elo, alpha 5%, power 90%', () => {
  const N = 60;
  let eq = 0, worse = 0, better = 0, pairs = 0;
  for (let i = 0; i < N; i++) {
    const e = runNi(0, 10 + i);
    if (e.result === 'non-inferior') eq++;
    pairs += e.pairs;
    if (runNi(-30, 500 + i).result === 'non-inferior') worse++;
    if (runNi(20, 900 + i).result === 'non-inferior') better++;
  }
  assert.ok(eq / N >= 0.8, `a candidate equal to the best passes ${eq}/${N} (power 90% by design)`);
  assert.ok(worse / N <= 0.12, `a candidate 30 Elo worse passes ${worse}/${N} (alpha 5% by design)`);
  assert.ok(better / N >= 0.95, `a candidate 20 Elo better passes ${better}/${N}`);
  assert.ok(pairs / N < 2500, `${Math.round(pairs / N)} shared deals on average`);
  // the fixed-sample planning number is larger than the sequential average, as it should be
  assert.ok(niPairsNeeded(NI_DEFAULTS, 0.45) > pairs / N);
  assert.ok(Math.abs(scoreDelta(30) - 0.0430) < 0.0005);
});

// ------------------------------------------------------------ scheduler

const sp = (name: string, rating: number, se: number, games: number, anchor = false): SchedPlayer => ({ name, rating, se, games, anchor });
const st0 = (): SchedState => ({ batches: 0, anchorBatches: 0, pairGames: new Map(), running: new Map() });
const OPT = { anchor: 'forge-default', newGames: 40, anchorShare: 0.25 };

test('scheduler: a new player first, against forge-default', () => {
  const ps = [sp('forge-default', 1500, 0, 900, true), sp('forge-reckless', 1560, 20, 900, true), sp('new-one', 1500, 350, 0)];
  const c = choose(ps, st0(), OPT)!;
  assert.deepEqual([c.a, c.b], ['new-one', 'forge-default']);
  assert.match(c.why, /new/);
  // once it is running, rule 1 does not fire for it again (rules 2 and 3 may still pick it: it is the most uncertain)
  const st = st0();
  st.running.set(mkey('new-one', 'forge-default'), 1);
  assert.doesNotMatch(choose(ps, st, OPT)!.why, /^new/);
});

test('scheduler: the anchor share, then the most informative pair', () => {
  const ps = [sp('forge-default', 1500, 0, 900, true), sp('p', 1600, 30, 500), sp('q', 1610, 30, 500), sp('r', 1300, 15, 500)];
  const st = st0();
  st.batches = 10; st.anchorBatches = 1;                      // 10% < 25%: an anchor batch is due
  const a = choose(ps, st, OPT)!;
  assert.equal(a.why, 'anchor share');
  assert.equal(a.b, 'forge-default');
  st.anchorBatches = 5;
  const b = choose(ps, st, OPT)!;
  assert.equal(b.why, 'most informative');
  assert.deepEqual([b.a, b.b].sort(), ['p', 'q'], 'the close, uncertain pair');
  st.running.set(mkey('p', 'q'), 3);
  const c = choose(ps, st, OPT)!;
  assert.notDeepEqual([c.a, c.b].sort(), ['p', 'q'], 'a pair already running is discounted');
  assert.deepEqual(choose(ps, st, OPT), c, 'deterministic');
});

test('deal slots: fixed by the block number; hosts get different bases', () => {
  assert.deepEqual(batchPairs(0, 10, 10), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(batchPairs(1_000_003, 10, 2), batchPairs(1_000_003, 10, 2));
  assert.deepEqual(batchPairs(3, 10, 2), [6, 7]);
  assert.deepEqual(batchPairs(5, 3, 2), [1, 2]);
  assert.notEqual(hostBase('pc-one'), hostBase('pc-two'));
  assert.equal(hostBase('pc-one') % 1_000_000, 0);
});

// ------------------------------------------------------------ registry

test('the committed registry: anchors, hashes, an unmerged kind is unavailable, not a crash', () => {
  const reg = parseRegistry(readFileSync(join(REPO, 'tools/ai-ladder/players.json'), 'utf8'));
  const ps = players(reg, REPO);
  const by = new Map(ps.map((p) => [p.name, p]));
  assert.equal(by.get('forge-default')!.cfg, 'Default');
  assert.ok(by.get('forge-default')!.anchor);
  assert.equal(by.get('forge-reckless')!.cfg, 'Reckless');
  assert.equal(by.get('policy-outlet')!.cfg, 'Default+outlets');
  // the search entrants: the game's --ai-policy search, and the fixed-rollout benchmark mode
  assert.equal(by.get('search-v1')!.unavailable, null, 'the search is on main');
  assert.match(by.get('search-v1')!.cfg!, /^Default\+outlets\+search:ms=1500,.*rounds=2,.*maxrounds=12/);
  assert.match(by.get('search-v1-fixed3')!.cfg!, /ms=60000,.*rounds=3,.*maxrounds=3,.*seed=1$/);
  assert.equal(new Set(ps.map((p) => p.hash)).size, ps.length, 'no two players share a config');
  const odd = resolvePlayer({ name: 'mystery', kind: 'neural-net', params: { layers: 3 } }, REPO);
  assert.match(odd.unavailable!, /unknown kind/);
  assert.equal(odd.cfg, null);
  assert.ok(resolvePlayer({ name: 'se', kind: 'search-eval', params: { model: 'abc123' } }, REPO).unavailable);
});

test('search kind: params map onto the bench\'s +search syntax; defaults fill the hash', () => {
  const p = resolveParams('search', { budgetMs: 500 });
  assert.equal(KINDS.search!.cfg(p), 'Default+outlets+search:ms=500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0');
  assert.equal(configHash('policy', resolveParams('policy', { outlets: 'on' })), configHash('policy', resolveParams('policy', { profile: 'Default', outlets: 'on' })));
  assert.throws(() => resolveParams('search', { budgetMs: 10 }), /50\.\.60000/);
  assert.throws(() => resolveParams('policy', { depth: 2 }), /no parameter depth/);
  assert.equal(unavailable('forge', REPO), null);
});

test('search kind, D350–D351: the new switches stay out of the hash and the seat config at their defaults', () => {
  const plain = resolveParams('search', { budgetMs: 500 });
  const explicit = resolveParams('search', { budgetMs: 500, aturns: -1, override: 'margin', z: '1', untapped: 1, oracle: 'off' });
  assert.deepEqual(explicit, plain, 'a switch at its default is the old config');
  assert.equal(configHash('search', explicit), configHash('search', plain));
  assert.equal(KINDS.search!.cfg(resolveParams('search', { aturns: 1 })), 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,aturns=1');
  assert.match(KINDS.search!.cfg(resolveParams('search', { override: 'lcb', margin: 0 })), /margin=0,.*,override=lcb,z=1$/);
  assert.match(KINDS.search!.cfg(resolveParams('search', { untapped: 20 })), /,untapped=20$/);
  assert.match(KINDS.search!.cfg(resolveParams('search', { oracle: 'on' })), /,oracle=1$/);
  assert.ok(testOnly(resolveParams('search', { oracle: 'on' })) && !testOnly(plain), 'the oracle is a test-only player');
  const reg = players(JSON.parse(readFileSync(join(REPO, 'tools/ai-ladder/players.json'), 'utf8')), REPO);
  const by = new Map(reg.map((x) => [x.name, x]));
  assert.equal(by.get('search-v1-fixed3')!.hash, '78d20b4c1a93', 'search-v1-fixed3 keeps the hash its games were played under');
  assert.equal(by.get('search-v1')!.hash, '81058679773e', 'search-v1 keeps its hash');
  for (const n of ['search-v1-fixed3-aturns1', 'search-v1-fixed3-lcb', 'search-v1-fixed3-oracle']) assert.ok(by.get(n)?.cfg, `${n} is registered and playable`);
});

test('search kind, D388–D390: the week-3 switches stay out of the hash at their defaults and map onto SearchConfig keys', () => {
  const plain = resolveParams('search', { budgetMs: 500 });
  const explicit = resolveParams('search', { budgetMs: 500, anytime: 'off', rank: 'order', gen: 24, rollout: 'default' });
  assert.deepEqual(explicit, plain, 'a switch at its default is the old config');
  assert.equal(configHash('search', explicit), configHash('search', plain));
  assert.match(KINDS.search!.cfg(resolveParams('search', { anytime: 'on' })), /,seed=0,anytime=1$/);
  assert.match(KINDS.search!.cfg(resolveParams('search', { rank: 'prior' })), /,rank=prior,gen=24$/);
  assert.match(KINDS.search!.cfg(resolveParams('search', { rank: 'prior', gen: 12 })), /,rank=prior,gen=12$/);
  assert.match(KINDS.search!.cfg(resolveParams('search', { rollout: 'outlets' })), /,rollout=outlets$/);
  assert.throws(() => resolveParams('search', { rollout: 'sometimes' }), /rollout must be one of/);
  const reg = players(JSON.parse(readFileSync(join(REPO, 'tools/ai-ladder/players.json'), 'utf8')), REPO);
  const by = new Map(reg.map((x) => [x.name, x]));
  for (const n of ['search-v1-anytime', 'search-v1-fixed3-ranked', 'search-v1-fixed3-routlets']) assert.ok(by.get(n)?.cfg, `${n} is registered and playable`);
});

test('D412: the live seat is search-v2 = search-v1 + anytime=1, which the ladder already rates as search-v1-anytime', () => {
  const reg = players(JSON.parse(readFileSync(join(REPO, 'tools/ai-ladder/players.json'), 'utf8')), REPO);
  const by = new Map(reg.map((x) => [x.name, x]));
  const v1 = by.get('search-v1')!, any = by.get('search-v1-anytime')!;
  assert.equal(any.cfg, `${v1.cfg},anytime=1`, 'search-v1-anytime is search-v1 plus the anytime loop and nothing else');
  // the hashes J102's games were played under (results/J102/match-J102.json: ah, bh)
  assert.equal(any.hash, 'cdd55e02a89c', 'search-v1-anytime keeps its hash');
  assert.equal(v1.hash, '81058679773e', 'search-v1 keeps its hash');
  // The engine side: MtgTable --ai-policy search parses over SearchConfig.LIVE_DEFAULTS; the bench's parse is unchanged.
  const java = readFileSync(join(REPO, 'bridge/src/mtgtable/ai/SearchConfig.java'), 'utf8');
  assert.match(java, /LIVE_VERSION = "search-v2";/);
  const live = /LIVE_DEFAULTS = "([^"]*)";/.exec(java)![1]!;
  assert.equal(live, 'anytime=1', 'the live seat adds exactly the anytime switch');
  for (const kv of live.split(',')) {
    assert.ok(any.cfg!.split(/[:,]/).includes(kv), `${kv} is in search-v1-anytime's seat config`);
    assert.ok(!v1.cfg!.split(/[:,]/).includes(kv), `${kv} is not in search-v1's`);
  }
  assert.match(java, /boolean anytime = false;/, "parse()'s own default stays off, so every ladder seat config means what it meant");
});

test('addPlayer never overwrites', () => {
  const reg = parseRegistry(JSON.stringify({ version: 1, players: [{ name: 'forge-default', kind: 'forge', params: {} }, { name: 'x-t1', kind: 'forge', params: {} }] }));
  assert.equal(addPlayer(reg, { name: 'x-t1', kind: 'forge', params: { profile: 'Reckless' } }), 'x-t1-2');
  assert.equal(reg.players.length, 3);
  assert.deepEqual(reg.players[1]!.params, {});
});

// ------------------------------------------------------------ results and report

const mkPlayer = (name: string, cfg: string, anchor = false): Player => {
  const kind = cfg.includes('+outlets') ? 'policy' : 'forge';
  const prof = cfg.split('+')[0]!;
  return resolvePlayer({ name, kind, params: kind === 'policy' ? { profile: prof, outlets: 'on' } : { profile: prof }, anchor }, REPO);
};

test('results: ai-bench lines become ladder lines; dedup across files; torn lines skipped; mirror blocks', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ladder-'));
  const A = mkPlayer('policy-outlet', 'Default+outlets'), B = mkPlayer('forge-default', 'Default', true);
  const info = { host: 'h1', run: 'r1', batch: 3, purpose: 'ladder', set: 'tools/ai-bench/pairs-cube.txt', bseed: 1_000_007, pairIndex: [6, 7], a: A, b: B, at: '2026-10-03T10:00:00.000Z' };
  const lines = [0, 1, 2, 3].map((g) => ({ pair: 1, game: g, seed: 99 + (g === 3 ? 0 : g === 2 ? 1 : g), a: 'Default+outlets', b: 'Default', aDeck: 'x.dck', bDeck: 'y.dck', aSeat: g < 2 ? 0 : 1, winner: ['A', 'B', 'draw', 'A'][g]!, turns: 9, ms: 4000, timeout: g === 2, error: '' }));
  const recs = lines.map((l) => fromBench(l, info));
  assert.equal(recs[0]!.pair, 7, 'the batch file\'s pair 1 is the set\'s pair 7');
  assert.equal(recs[0]!.id, 'h1:r1:3:7:0');
  assert.deepEqual(recs.map((r) => r.w), ['a', 'b', 'd', 'a']);
  assert.equal(blockKey(recs[0]!), blockKey(recs[3]!), 'games 0 and 3 are one deal');
  assert.equal(blockKey(recs[1]!), blockKey(recs[2]!), 'games 1 and 2 are one deal');
  assert.notEqual(blockKey(recs[0]!), blockKey(recs[1]!));
  appendResults(dir, 'h1', recs);
  mkdirSync(join(dir, 'results'), { recursive: true });
  writeFileSync(join(dir, 'results', 'h2.jsonl'), JSON.stringify(recs[0]) + '\n{"v":1,"id":"torn');   // a copy of a line, and a torn one
  const back = readResults(dir);
  assert.equal(back.length, 4);
  const o = outcomes(back, hashIndex([A, B]));
  assert.equal(o.length, 3, 'the draw is not an outcome');
  assert.deepEqual(o.map((x) => x.a), ['policy-outlet', 'policy-outlet', 'policy-outlet']);
  // a config edited under the same name is rated apart, as name@hash
  const edited = mkPlayer('policy-outlet', 'Reckless+outlets');
  assert.equal(outcomes(back, hashIndex([edited, B]))[0]!.a, `policy-outlet@${A.hash}`);
});

test('ladder.json schema 1 and the HTML page', () => {
  const A = mkPlayer('policy-outlet', 'Default+outlets'), B = mkPlayer('forge-default', 'Default', true), C = mkPlayer('forge-reckless', 'Reckless', true);
  const r = rng(4, 'report');
  const recs: GameRecord[] = [];
  let i = 0;
  for (const run of ['r1', 'r2', 'r3']) {
    for (const [x, y, p] of [[A, B, 0.6], [C, B, 0.58], [A, C, 0.52]] as Array<[Player, Player, number]>) {
      for (let g = 0; g < 40; g++) {
        recs.push({ v: 1, id: `h:${run}:${i++}`, at: `2026-10-0${run.slice(1)}T0${g % 10}:00:00.000Z`, host: 'h', run, batch: 0, purpose: 'ladder', a: x.name, b: y.name, ah: x.hash, bh: y.hash, ac: x.cfg!, bc: y.cfg!, set: 's', pair: 0, g: g % 4, seed: g, bseed: 1, aDeck: 'd', bDeck: 'e', aSeat: 0, w: g === 7 ? 'd' : r.next() < p ? 'a' : 'b', turns: 8, ms: 3800, timeout: g === 7, error: false });
      }
    }
  }
  const doc = buildLadder({ players: [B, C, A], recs, sprt: [], tune: [], league: null, priorSd: 350, bootstrap: 0, now: '2026-10-03T12:00:00.000Z' });
  assert.equal(doc.schema, 'mtg-table/ai-ladder');
  assert.equal(doc.version, 1);
  assert.deepEqual(Object.keys(doc), ['schema', 'version', 'generatedAt', 'anchor', 'scale', 'ci', 'totals', 'players', 'history', 'sprt', 'tune', 'league', 'set', 'experiments']);
  assert.equal(doc.set, 'all');
  assert.deepEqual(Object.keys(doc.players[0]!), ['name', 'kind', 'params', 'hash', 'anchor', 'registered', 'available', 'unavailable', 'rating', 'lo', 'hi', 'rated', 'games', 'wins', 'losses', 'draws', 'vsAnchor']);
  assert.equal(doc.totals.games, 360);
  assert.equal(doc.totals.draws, 9);
  assert.equal(doc.history.length, 3, 'one point per run');
  const d = doc.players.find((p) => p.name === 'forge-default')!;
  assert.equal(d.rating, 1500);
  assert.equal(d.vsAnchor, null);
  const a = doc.players.find((p) => p.name === 'policy-outlet')!;
  assert.ok(a.vsAnchor && a.vsAnchor.wins + a.vsAnchor.losses === 117);
  const html = renderHtml(doc);
  for (const h of ['Ladder', 'Rating over time', 'Recent SPRT outcomes', 'Tuner results']) assert.ok(html.includes(`<h2>${h}</h2>`), h);
  assert.ok(!/(src|href)="https?:/.test(html), 'self-contained: nothing loads from a URL');
  assert.ok(html.includes('<polyline'), 'the chart is drawn');
});

test('dev / confirm deck sets: each cube\'s drafts alternate by seed; the split is a function of the drafts', () => {
  const ps = [3, 1, 2, 4, 5].map((seed) => ({ cube: 'synergy', seed, a: `s${seed}A`, b: `s${seed}B` }))
    .concat([10, 11].map((seed) => ({ cube: 'pauper', seed, a: `p${seed}A`, b: `p${seed}B` })));
  const { dev, confirm } = split(ps);
  assert.deepEqual(dev.map((p) => `${p.cube}${p.seed}`), ['pauper10', 'synergy1', 'synergy3', 'synergy5']);
  assert.deepEqual(confirm.map((p) => `${p.cube}${p.seed}`), ['pauper11', 'synergy2', 'synergy4']);
  assert.deepEqual(split([...ps].reverse()), { dev, confirm }, 'order-independent');
});

test('experiment log: a start with no end is abandoned; ends join their starts', () => {
  const start = (id: string, at: string): ExpLine => ({ v: 1, id, kind: 'start', at, host: 'h', cmd: 'sprt', args: [], git: { sha: 'abc', dirty: false }, purpose: 'confirm', hypothesis: 'x', set: 's', setHash: 'h', players: [], seedBase: 1 });
  const lines: ExpLine[] = [
    start('a', '2026-10-01T00:00:00.000Z'),
    { v: 1, id: 'a', kind: 'end', at: '2026-10-01T01:00:00.000Z', status: 'finished', games: 8, decisive: 8, draws: 0, bseeds: [1, 2], result: {} },
    start('b', '2026-10-01T02:00:00.000Z'),
    start('c', '2026-10-03T11:00:00.000Z'),
  ];
  const rows = joinLog(lines, Date.parse('2026-10-03T12:00:00.000Z'));
  assert.deepEqual(rows.map((r) => r.status), ['finished', 'abandoned', 'running?']);
});

test('search-eval (D354): the search with leaf=eval:<model>, pinned to the model file by its content hash', async () => {
  const { createHash } = await import('node:crypto');
  const repo = mkdtempSync(join(tmpdir(), 'ladder-eval-'));
  mkdirSync(join(repo, 'tools/ai-bench'), { recursive: true });
  mkdirSync(join(repo, 'bridge/src/mtgtable/ai'), { recursive: true });
  mkdirSync(join(repo, 'var/ml/models'), { recursive: true });
  writeFileSync(join(repo, 'tools/ai-bench/AiBench.java'), '// +search');
  const params = { profile: 'Default', outlets: 'on', budgetMs: 60000, rounds: 3, maxRounds: 3, seed: 1 } as const;
  // a checkout whose search has no leaf= flag: unavailable, not a crash
  writeFileSync(join(repo, 'bridge/src/mtgtable/ai/SearchConfig.java'), 'class SearchConfig {}');
  const body = '{"format":"mtgtable-position-eval"}\n';
  const hash = createHash('sha256').update(body).digest('hex').slice(0, 12);
  assert.match(resolvePlayer({ name: 'e', kind: 'search-eval', params: { ...params, model: hash } }, repo).unavailable!, /no leaf= flag/);
  writeFileSync(join(repo, 'bridge/src/mtgtable/ai/SearchConfig.java'), 'case "leaf": leaf = p[1];');
  // the model file missing, then present, then changed
  assert.match(resolvePlayer({ name: 'e', kind: 'search-eval', params: { ...params, model: hash } }, repo).unavailable!, /is not here/);
  writeFileSync(join(repo, `var/ml/models/eval-${hash}.json`), body);
  const p = resolvePlayer({ name: 'e', kind: 'search-eval', params: { ...params, model: hash } }, repo);
  assert.equal(p.unavailable, null);
  assert.equal(p.cfg, `Default+outlets+search:ms=60000,cands=6,turns=0,rounds=3,margin=20,maxrounds=3,what=pab,seed=1,leaf=eval:var/ml/models/eval-${hash}.json`);
  const fixed3 = resolvePlayer({ name: 'f', kind: 'search', params }, repo);
  assert.equal(p.cfg, `${fixed3.cfg},leaf=eval:var/ml/models/eval-${hash}.json`, 'the same search, only the leaf differs');
  writeFileSync(join(repo, `var/ml/models/eval-${hash}.json`), body + ' ');
  assert.match(resolvePlayer({ name: 'e', kind: 'search-eval', params: { ...params, model: hash } }, repo).unavailable!, /hashes to/);
  assert.match(resolvePlayer({ name: 'e', kind: 'search-eval', params: { ...params, model: 'abc' } }, repo).unavailable!, /12 hex/);
});

test('search-distill (J126): search-v2\'s candidates scored by the distilled model, pinned by its content hash', async () => {
  const { createHash } = await import('node:crypto');
  const repo = mkdtempSync(join(tmpdir(), 'ladder-distill-'));
  mkdirSync(join(repo, 'tools/ai-bench'), { recursive: true });
  mkdirSync(join(repo, 'bridge/src/mtgtable/ai'), { recursive: true });
  mkdirSync(join(repo, 'var/ml/models'), { recursive: true });
  writeFileSync(join(repo, 'tools/ai-bench/AiBench.java'), '// +search');
  // search-v2's ladder params (search-v1-anytime, D412), as `distill.py register` copies them
  const params = { profile: 'Default', outlets: 'on', budgetMs: 1500, anytime: 'on' } as const;
  writeFileSync(join(repo, 'bridge/src/mtgtable/ai/SearchConfig.java'), 'class SearchConfig {}');
  const body = '{"format":"mtgtable-distill"}\n';
  const hash = createHash('sha256').update(body).digest('hex').slice(0, 12);
  assert.match(resolvePlayer({ name: 'd', kind: 'search-distill', params: { ...params, model: hash } }, repo).unavailable!, /no distill= flag/);
  writeFileSync(join(repo, 'bridge/src/mtgtable/ai/SearchConfig.java'), 'case "distill": distill = p[1];');
  assert.match(resolvePlayer({ name: 'd', kind: 'search-distill', params: { ...params, model: hash } }, repo).unavailable!, /is not here/);
  writeFileSync(join(repo, `var/ml/models/distill-${hash}.json`), body);
  const p = resolvePlayer({ name: 'd', kind: 'search-distill', params: { ...params, model: hash } }, repo);
  assert.equal(p.unavailable, null);
  const v2 = resolvePlayer({ name: 's', kind: 'search', params }, repo);
  assert.equal(v2.cfg, 'Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1');
  assert.equal(p.cfg, `${v2.cfg},distill=var/ml/models/distill-${hash}.json`, 'search-v2\'s candidates, only the chooser differs');
  assert.notEqual(p.hash, v2.hash);
  writeFileSync(join(repo, `var/ml/models/distill-${hash}.json`), body + ' ');
  assert.match(resolvePlayer({ name: 'd', kind: 'search-distill', params: { ...params, model: hash } }, repo).unavailable!, /hashes to/);
  assert.match(resolvePlayer({ name: 'd', kind: 'search-distill', params: { ...params, model: 'abc' } }, repo).unavailable!, /12 hex/);
  // the real SearchConfig has the key
  assert.match(readFileSync(join(REPO, 'bridge/src/mtgtable/ai/SearchConfig.java'), 'utf8'), /case "distill"/);
});

test('J126: the match tally times each side\'s decisions (search.<kind>.us), per kind and over p + a + b', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ladder-us-'));
  const f = join(dir, 'b0.jsonl');
  const a1 = { 'search.p.considered': 10, 'search.p.us': 8_000_000, 'search.a.considered': 4, 'search.a.us': 4_000_000, 'search.t.considered': 2 };
  const a2 = { 'search.p.considered': 10, 'search.p.us': 7_000_000, 'search.b.considered': 2, 'search.b.us': 1_000_000 };
  const b1 = { 'search.p.considered': 5, 'search.p.us': 2_500 };
  writeFileSync(f, [JSON.stringify({ aStats: { counts: a1 }, bStats: { counts: b1 } }), JSON.stringify({ aStats: { counts: a2 } })].join('\n'));
  const a = emptyTally(), b = emptyTally();
  tallyBatch(f, a, b);
  const ta = tallyLine(a);
  assert.deepEqual(ta.msMean, { p: 750, a: 1000, b: 500, t: null });
  assert.equal(ta.msPerDecision, 769.231, "20,000 ms over 26 p+a+b decisions, rounded to the microsecond");
  assert.equal(Number(tallyLine(b).msPerDecision), 0.5);
  assert.equal(tallyLine(emptyTally()).msPerDecision, null, 'no time counted: null, never 0');
});

test('J128 (D437): search-v2-evalleaf is search-v2 (search-v1-anytime) plus leaf=eval:<evaluator v2> and nothing else', async () => {
  const { createHash } = await import('node:crypto');
  const reg = players(JSON.parse(readFileSync(join(REPO, 'tools/ai-ladder/players.json'), 'utf8')), REPO);
  const by = new Map(reg.map((x) => [x.name, x]));
  const v2 = by.get('search-v1-anytime')!, p = by.get('search-v2-evalleaf');
  assert.ok(p, 'search-v2-evalleaf is registered');
  assert.equal(p!.kind, 'search-eval');
  const { model, ...search } = p!.resolved;
  assert.deepEqual(search, v2.resolved, "every search param is search-v2's");
  assert.equal(model, 'dcdae3745b84', "the model is evaluator v2's file (nights-1-3-eval.json, D364) by its sha256 prefix");
  assert.equal(v2.hash, 'cdd55e02a89c', "search-v2's hash is unchanged");
  assert.notEqual(p!.hash, v2.hash);
  // Here the PC-only model is present or it is not: the player is the one config, or unavailable -- never another model.
  if (p!.cfg) assert.equal(p!.cfg, `${v2.cfg},leaf=eval:var/ml/models/eval-dcdae3745b84.json`);
  else assert.match(p!.unavailable!, /is not here|hashes to/);
  // The same params against a stand-in model in a scratch checkout: search-v2's seat config plus the one key.
  const repo = mkdtempSync(join(tmpdir(), 'ladder-evalleaf-'));
  mkdirSync(join(repo, 'tools/ai-bench'), { recursive: true });
  mkdirSync(join(repo, 'bridge/src/mtgtable/ai'), { recursive: true });
  mkdirSync(join(repo, 'var/ml/models'), { recursive: true });
  writeFileSync(join(repo, 'tools/ai-bench/AiBench.java'), '// +search');
  writeFileSync(join(repo, 'bridge/src/mtgtable/ai/SearchConfig.java'), 'case "leaf": leaf = p[1];');
  const body = '{"format":"mtgtable-position-eval","j128":1}\n';
  const hash = createHash('sha256').update(body).digest('hex').slice(0, 12);
  writeFileSync(join(repo, `var/ml/models/eval-${hash}.json`), body);
  const stand = resolvePlayer({ name: 'search-v2-evalleaf-x', kind: 'search-eval', params: { ...search, model: hash } }, repo);
  assert.equal(stand.cfg, `${v2.cfg},leaf=eval:var/ml/models/eval-${hash}.json`);
  // The live seat's default leaf stays the hand leaf.
  const java = readFileSync(join(REPO, 'bridge/src/mtgtable/ai/SearchConfig.java'), 'utf8');
  assert.match(java, /case "leaf"/);
  assert.doesNotMatch(/LIVE_DEFAULTS = "([^"]*)";/.exec(java)![1]!, /leaf/);
});

test('J128 (D437): the match tally counts the evaluator\'s leaves and their mean cost (search.leaf.eval, .evalNs)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ladder-evalleaf-tally-'));
  const f = join(dir, 'b0.jsonl');
  const a1 = { 'search.p.considered': 3, 'search.leaf.eval': 100, 'search.leaf.evalNs': 2_000_000 };
  const a2 = { 'search.a.considered': 2, 'search.leaf.eval': 50, 'search.leaf.evalNs': 1_000_000 };
  const b1 = { 'search.p.considered': 4 };
  writeFileSync(f, [JSON.stringify({ aStats: { counts: a1 }, bStats: { counts: b1 } }), JSON.stringify({ aStats: { counts: a2 } })].join('\n'));
  const a = emptyTally(), b = emptyTally();
  tallyBatch(f, a, b);
  const ta = tallyLine(a), tb = tallyLine(b);
  assert.equal(ta.evalLeaves, 150);
  assert.equal(ta.evalLeafUs, 20, '3,000,000 ns over 150 leaves');
  assert.equal(tb.evalLeaves, 0, 'a hand-leaf side counts none');
  assert.equal(tb.evalLeafUs, null, 'and no cost: null, never 0');
});

test('D468: the match tally counts rollouts the step clock ended (search.stepTimeouts and the prior\'s), 0 when none', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ladder-steptimeouts-tally-'));
  const f = join(dir, 'b0.jsonl');
  const a1 = { 'search.p.considered': 3, 'search.stepTimeouts': 1 };
  const a2 = { 'search.a.considered': 2, 'search.prior.stepTimeouts': 2 };
  const b1 = { 'search.p.considered': 4 };
  writeFileSync(f, [JSON.stringify({ aStats: { counts: a1 }, bStats: { counts: b1 } }), JSON.stringify({ aStats: { counts: a2 } })].join('\n'));
  const a = emptyTally(), b = emptyTally();
  tallyBatch(f, a, b);
  assert.equal(tallyLine(a).stepTimeouts, 3);
  assert.equal(tallyLine(b).stepTimeouts, 0, 'a normal game counts none');
  assert.equal(tallyLine({ ...emptyTally(), stepTimeouts: undefined }).stepTimeouts, 0, 'a tally from before the counter reads 0');
});

test('D470: the match tally counts rollouts whose forced answer was unavailable (search.unavailable and the prior\'s), 0 when none', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ladder-unavailable-tally-'));
  const f = join(dir, 'b0.jsonl');
  const a1 = { 'search.b.considered': 3, 'search.rolloutErrors': 2, 'search.unavailable': 2 };
  const a2 = { 'search.b.considered': 2, 'search.prior.errors': 1, 'search.prior.unavailable': 1 };
  const b1 = { 'search.b.considered': 4, 'search.rolloutErrors': 1 };
  writeFileSync(f, [JSON.stringify({ aStats: { counts: a1 }, bStats: { counts: b1 } }), JSON.stringify({ aStats: { counts: a2 } })].join('\n'));
  const a = emptyTally(), b = emptyTally();
  tallyBatch(f, a, b);
  assert.equal(tallyLine(a).unavailable, 3);
  assert.equal(tallyLine(b).unavailable, 0, 'an error that was not this one counts none');
  assert.equal(tallyLine({ ...emptyTally(), unavailable: undefined }).unavailable, 0, 'a tally from before the counter reads 0');
});

// ------------------------------------------------------------ match (D398)

test('match (D398): the pair-score interval, in Elo too; no interval under 2 pairs', () => {
  const ps = [...Array(60).fill({ x: 1, games: 2 }), ...Array(40).fill({ x: 0, games: 2 }), ...Array(100).fill({ x: 0.5, games: 2 })];
  const m = matchSummary(ps);
  assert.equal(m.pairs, 200);
  assert.equal(m.games, 400);
  assert.ok(Math.abs(m.score - 0.55) < 1e-12);
  // pair scores 1 (60), 0 (40), ½ (100): sample variance 0.1231..., se = sqrt(v/200)
  const v = (60 * 0.45 ** 2 + 40 * 0.55 ** 2 + 100 * 0.05 ** 2) / 199;
  assert.ok(Math.abs(m.se! - Math.sqrt(v / 200)) < 1e-12);
  assert.ok(Math.abs(m.lo! - (0.55 - 1.96 * m.se!)) < 1e-12 && Math.abs(m.hi! - (0.55 + 1.96 * m.se!)) < 1e-12);
  assert.ok(Math.abs(m.elo - 34.86) < 0.01, `55% is about +35 Elo, got ${m.elo}`);
  assert.ok(m.eloLo! < m.elo && m.elo < m.eloHi!, 'the Elo interval holds the point');
  assert.ok(Math.abs(eloOf(m.lo!) - m.eloLo!) < 1e-9, 'the Elo ends are the score ends mapped');
  assert.equal(eloOf(0.5), 0);
  assert.equal(eloOf(1), Infinity);
  const one = matchSummary([{ x: 1, games: 2 }]);
  assert.equal(one.se, null);
  assert.equal(one.lo, null);
  assert.equal(matchSummary([]).pairs, 0);
  // a 95% interval of +-20 Elo at a pair SD of 0.35 needs ~570 pairs (1,140 games); +-30 under half that
  assert.ok(pairsForHalfWidth(20, 0.35) > 520 && pairsForHalfWidth(20, 0.35) < 620);
  assert.ok(pairsForHalfWidth(30, 0.35) < pairsForHalfWidth(20, 0.35) / 2);
});

test('match (D398): the interval covers the truth about 95% of the time on mirrored synthetic pairs', () => {
  const r = rng(77, 'match-coverage');
  const truth = expected(1535, 1500);
  let covered = 0;
  const runs = 400;
  for (let k = 0; k < runs; k++) {
    const ps = [];
    for (let i = 0; i < 300; i++) {
      const tilt = 0.6 * (r.next() - 0.5);
      const w1 = r.next() < truth + tilt ? 1 : 0, w2 = r.next() < truth - tilt ? 1 : 0;
      ps.push({ x: (w1 + w2) / 2, games: 2 });
    }
    const m = matchSummary(ps);
    if (m.lo! <= truth && truth <= m.hi!) covered++;
  }
  assert.ok(covered / runs > 0.92 && covered / runs < 0.98, `coverage ${covered / runs}`);
});

test('match (D398): search counters from ai-bench lines -- searched, changed, fallbacks by reason, a game-clustered budget rate', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ladder-match-'));
  const f = join(dir, 'b0.jsonl');
  const line = (a: Record<string, number> | null, b: Record<string, number> | null): string =>
    JSON.stringify({ pair: 0, game: 0, winner: 'A', aStats: a ? { counts: a } : {}, bStats: b ? { counts: b } : {} });
  writeFileSync(f, [
    line({ 'search.p.considered': 8, 'search.a.considered': 2, 'search.p.changed': 1, 'search.fallback.budget': 2, 'search.fallback.rolloutErrors': 1 }, { 'policy.x': 3 }),
    line({ 'search.p.considered': 10, 'search.fallback.budget': 0 }, null),
    line({ 'search.b.considered': 5, 'search.b.changed': 2, 'search.fallback.budget': 3 }, null),
    '{"pair":0,"game":3,"aSt',   // a torn last line
  ].join('\n'));
  const a = emptyTally(), b = emptyTally();
  tallyBatch(f, a, b);
  tallyBatch(join(dir, 'missing.jsonl'), a, b);
  assert.equal(a.games, 3);
  assert.equal(a.searched, 25);
  assert.equal(a.changed, 3);
  assert.deepEqual(a.fallback, { budget: 5, rolloutErrors: 1 });
  assert.equal(b.games, 0, 'a seat that never searched is not a searching game');
  const br = budgetRate(a);
  assert.ok(Math.abs(br.rate - 5 / 25) < 1e-12);
  assert.ok(br.lo! < br.rate && br.rate < br.hi!);
  // clustered variance by hand: residuals b_i - r c_i = 2-2, 0-2, 3-1
  const v = ((0) ** 2 + (-2) ** 2 + 2 ** 2) / (25 * 25) * (3 / 2);
  assert.ok(Math.abs(br.hi! - (0.2 + 1.96 * Math.sqrt(v))) < 1e-12);
  const tl = tallyLine(a);
  assert.equal(tl.budgetRate, 0.2);
  assert.equal(budgetRate(b).lo, null);
});

test('the registry (D398): search-v1-reckless is search-v1 on Reckless.ai and nothing else', () => {
  const reg = players(JSON.parse(readFileSync(join(REPO, 'tools/ai-ladder/players.json'), 'utf8')), REPO);
  const by = new Map(reg.map((x) => [x.name, x]));
  const rk = by.get('search-v1-reckless')!, v1 = by.get('search-v1')!;
  assert.ok(rk.cfg, 'registered and playable');
  assert.equal(rk.cfg, v1.cfg!.replace(/^Default\+/, 'Reckless+'));
  assert.notEqual(rk.hash, v1.hash);
});

test('D417: search-v2-mull, -targets and -mull-targets are search-v2 (search-v1-anytime) plus their switches and nothing else', () => {
  const reg = players(JSON.parse(readFileSync(join(REPO, 'tools/ai-ladder/players.json'), 'utf8')), REPO);
  const by = new Map(reg.map((x) => [x.name, x]));
  const v2 = by.get('search-v1-anytime')!;
  const mull = by.get('search-v2-mull')!, tg = by.get('search-v2-targets')!, both = by.get('search-v2-mull-targets')!;
  assert.equal(mull.cfg, `${v2.cfg},mull=1`);
  assert.equal(tg.cfg, `${v2.cfg},targets=1`);
  assert.equal(both.cfg, `${v2.cfg},mull=1,targets=1`);
  assert.equal(new Set([v2.hash, mull.hash, tg.hash, both.hash]).size, 4, 'one name per config: four configs, four hashes');
  assert.equal(v2.hash, 'cdd55e02a89c', "search-v2's hash is unchanged by the new (off) parameters");
  // The switches at their defaults are the old config; the mulligan knobs print only with mull on.
  const plain = resolveParams('search', {});
  assert.deepEqual(resolveParams('search', { mull: 'off', targets: 'off', mullMs: 6000, mullTurns: 3 }), plain);
  assert.match(KINDS.search!.cfg(resolveParams('search', { mull: 'on', mullMs: 8000, mullTurns: 4 })), /,mull=1,mullms=8000,mullturns=4$/);
  assert.doesNotMatch(KINDS.search!.cfg(resolveParams('search', { mullMs: 8000 })), /mull/);
  // The engine's defaults and the kind's agree.
  const java = readFileSync(join(REPO, 'bridge/src/mtgtable/ai/SearchConfig.java'), 'utf8');
  assert.equal(Number(/MULL_MS = (\d+);/.exec(java)![1]), KINDS.search!.params.mullMs!.default);
  assert.equal(Number(/MULL_TURNS = (\d+);/.exec(java)![1]), KINDS.search!.params.mullTurns!.default);
  assert.doesNotMatch(/LIVE_DEFAULTS = "([^"]*)";/.exec(java)![1]!, /mull|targets/, 'the live seat (search-v2) does not turn them on');
});

test('D514: search-v2-ms3000-r24 and -ms6000-r48 are search-v2 (search-v1-anytime) with only the budget and the round cap scaled', () => {
  const raw = JSON.parse(readFileSync(join(REPO, 'tools/ai-ladder/players.json'), 'utf8')) as { version: 1; players: { name: string; kind: string; params: Record<string, unknown> }[] };
  const reg = players(raw, REPO);
  const by = new Map(reg.map((x) => [x.name, x]));
  const v2 = by.get('search-v1-anytime')!;
  const v2raw = raw.players.find((p) => p.name === 'search-v1-anytime')!;
  assert.equal(v2.resolved.budgetMs, 1500);
  assert.equal(v2.resolved.maxRounds, 12);
  for (const [name, x, hash] of [['search-v2-ms3000-r24', 2, '994bf685f6b9'], ['search-v2-ms6000-r48', 4, '6bab8ca5e273']] as const) {
    const ms = 1500 * x, rounds = 12 * x;
    const p = by.get(name);
    assert.ok(p?.cfg, `${name} is registered and playable`);
    const pr = raw.players.find((y) => y.name === name)!;
    assert.equal(pr.kind, v2raw.kind);
    assert.deepEqual(pr.params, { ...v2raw.params, budgetMs: ms, maxRounds: rounds }, `${name}'s params are search-v2's but budgetMs and maxRounds`);
    assert.deepEqual({ ...p!.resolved, budgetMs: 1500, maxRounds: 12 }, v2.resolved, "every other resolved param is search-v2's");
    assert.equal(p!.cfg, v2.cfg!.replace(/:ms=1500,/, `:ms=${ms},`).replace(/,maxrounds=12,/, `,maxrounds=${rounds},`), 'the seat config differs in ms= and maxrounds= alone');
    assert.equal(p!.hash, hash, `${name}'s config hash (D514)`);
  }
  for (const gone of ['search-v2-ms3000', 'search-v2-ms6000']) assert.ok(!by.has(gone), `${gone} (the budget-only arm) is not registered`);
  assert.equal(v2.hash, 'cdd55e02a89c', "search-v2's hash is unchanged");
});

test('D417: the match tally counts each decision kind, and searched/changed stay p + a + b', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ladder-kinds-'));
  const f = join(dir, 'b0.jsonl');
  const c1 = { 'search.p.considered': 10, 'search.p.changed': 2, 'search.m.considered': 1, 'search.m.changed': 1, 'search.t.considered': 3, 'search.t.changed': 0 };
  const c2 = { 'search.a.considered': 4, 'search.m.considered': 2, 'search.k.considered': 1, 'search.k.changed': 1 };
  writeFileSync(f, [JSON.stringify({ aStats: { counts: c1 } }), JSON.stringify({ aStats: { counts: c2 } })].join('\n'));
  const a = emptyTally(), b = emptyTally();
  tallyBatch(f, a, b);
  assert.equal(a.searched, 14);
  assert.equal(a.changed, 2);
  const tl = tallyLine(a);
  assert.deepEqual(tl.byKind, {
    p: { searched: 10, changed: 2, rate: 0.2 }, a: { searched: 4, changed: 0, rate: 0 },
    m: { searched: 3, changed: 1, rate: 0.333333 }, k: { searched: 1, changed: 1, rate: 1 }, t: { searched: 3, changed: 0, rate: 0 },
  });
  assert.deepEqual(tallyLine(b).byKind, {});
});
