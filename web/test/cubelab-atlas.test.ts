/*
 * mtg-table — web/test/cubelab-atlas.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The move atlas (D451), engine-free:
 *
 *  - the arithmetic on synthetic data: Wilson with draws counted half, average ranks and Spearman (ties,
 *    reversal, a constant side), the paired regret and its bootstrap interval clear of zero for a planted
 *    better option and around zero for none, the agreement of two maps (the same order, the reverse), the
 *    rollouts a +/- 2-point interval needs, the even spread of decisions;
 *  - the deck pair rule: the most even record with the most games wins, draws are not decisive, a pair
 *    with few games loses to an equally even one with many;
 *  - a decision's two maps from branch rows: only complete branches are paired, the chosen option is 0,
 *    the most-disagreeing decisions come first;
 *  - phase A's report: draws by the cap, the variance, the rollouts needed;
 *  - the guardrails read back from decision records: G1 (a land offered is a land played) and G4 (keep),
 *    each violation caught;
 *  - the jobs: phase A's seed and random seat, a unit's expected options and its leak checks on the
 *    first chunk only, the units' chunking; atlas.md renders;
 *  - seat-identity's decision lines: the frame numbers dropped, the last state and `over` kept.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  agreement, gamesFor, pairLines, rankPairs, ranks, regretInterval, regretOf, scoreOf, scoreStat, spearman, spread, wilson, type LadderGame,
} from '../../tools/cubelab/atlasmath.ts';
import {
  ATLAS_NOT_FOR_TRAINING, atlasMd, atlasSelftestDir, baselineJob, decisionAtlas, disagreements, guardrailCheck, phaseAReport, rolloutJob, unitJob, unitsOf,
  type AtlasOptions, type BranchRow, type DecisionListing, type GuardrailCheck, type RolloutRow,
} from '../../tools/cubelab/atlas.ts';
import { decisionLines } from '../../tools/cubelab/seatidentity.ts';
import { labPath } from '../../tools/cubelab/labdata.ts';
import { rng } from '../../tools/cubelab/rng.ts';

test('the arithmetic: Wilson with draws, ranks, Spearman', () => {
  const s = scoreStat([1, 1, 0.5, 0]);
  assert.deepEqual([s.n, s.wins, s.draws, s.losses, s.mean], [4, 2, 1, 1, 0.625]);
  assert.deepEqual(wilson(0, 0), { lo: null, hi: null });
  const w = wilson(50, 100);
  assert.ok((w.lo as number) < 0.5 && (w.hi as number) > 0.5 && Math.abs(0.5 - (w.lo as number) - ((w.hi as number) - 0.5)) < 1e-3);
  assert.deepEqual([scoreOf(1), scoreOf(0), scoreOf(-1)], [1, 0.5, 0]);
  assert.deepEqual(ranks([10, 20, 20, 5]), [2, 3.5, 3.5, 1]);
  assert.equal(spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1);
  assert.equal(spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1);
  assert.equal(spearman([1, 2, 3], [5, 5, 5]), null, 'a constant side has no ordering');
  assert.equal(spearman([1], [1]), null);
  assert.ok(Math.abs((spearman([1, 2, 3, 4], [1, 3, 2, 4]) as number) - 0.8) < 1e-9);
});

/** n branches of k options, option `better` winning with probability p1 and the rest with p0; paired by branch. */
function planted(n: number, k: number, better: number, p0: number, p1: number, seed: number): number[][] {
  const r = rng(seed, 'test');
  return Array.from({ length: n }, () => Array.from({ length: k }, (_, o) => (r.next() < (o === better ? p1 : p0) ? 1 : 0)));
}

test('the paired regret: a planted better option shows clear of zero; none shows around zero', () => {
  const m = planted(400, 4, 2, 0.4, 0.7, 1);
  const r = regretInterval(m, 4, 500, 7);
  assert.equal(r.best, 2);
  assert.ok((r.regret as number) > 0.2 && (r.lo as number) > 0.15, JSON.stringify(r));
  const flat = planted(400, 4, -1, 0.5, 0.5, 2);
  const f = regretInterval(flat, 4, 500, 7);
  assert.ok((f.lo as number) >= 0 && (f.regret as number) < 0.1, `the max of noise leans high but stays small: ${JSON.stringify(f)}`);
  assert.deepEqual(regretOf([0.5, null]), { regret: null, best: null });
  assert.deepEqual(regretOf([0.6, 0.5]), { regret: 0, best: 0 }, 'Forge\'s answer best: no regret');
  assert.deepEqual(regretInterval([[1, 0]], 2, 100, 1).lo, null, 'one branch: no interval');
});

test('the agreement of two maps', () => {
  const a = planted(300, 4, 3, 0.3, 0.8, 3);
  const b = planted(300, 4, 3, 0.3, 0.8, 4);
  // give both the same graded order 0 < 1 < 2 < 3
  const grade = (m: number[][], s: number): number[][] => { const r = rng(s, 'g'); return m.map((row) => row.map((_, o) => (r.next() < 0.2 + 0.2 * o ? 1 : 0))); };
  const same = agreement(grade(a, 5), grade(b, 6), 4, 300, 9);
  assert.equal(same.sameBest, true);
  assert.ok((same.rho as number) > 0.7 && (same.lo as number) > 0, JSON.stringify(same));
  const reversed = agreement(grade(a, 5), grade(b, 6).map((row) => [...row].reverse()), 4, 300, 9);
  assert.equal(reversed.sameBest, false);
  assert.ok((reversed.rho as number) < -0.7 && (reversed.hi as number) < 0, JSON.stringify(reversed));
  assert.deepEqual(agreement([], [[1, 0]], 2, 10, 1), { rho: null, lo: null, hi: null, sameBest: null });
});

test('how many rollouts, and the even spread of decisions', () => {
  assert.equal(gamesFor(0.25), 2401);
  assert.equal(gamesFor(0.2), 1921);
  assert.deepEqual(spread(10, 3), [0, 5, 9]);
  assert.deepEqual(spread(3, 5), [0, 1, 2]);
  assert.deepEqual(spread(9, 1), [4]);
  assert.deepEqual(spread(0, 3), []);
});

test('the deck pair rule: the most even record with the most games', () => {
  const pairs = pairLines('# a comment\nx-A.dck x-B.dck   # c\n\ny-A.dck y-B.dck\nz-A.dck z-B.dck\n');
  assert.deepEqual(pairs, [['x-A.dck', 'x-B.dck'], ['y-A.dck', 'y-B.dck'], ['z-A.dck', 'z-B.dck']]);
  const games: LadderGame[] = [];
  const add = (pair: number, aWins: number, bWins: number, draws: number): void => {
    const [a, b] = pairs[pair] as [string, string];
    // half the games deck A sits as player a, half as player b: the deck's wins, not the player's
    for (let i = 0; i < aWins; i++) games.push(i % 2 ? { pair, aDeck: a, bDeck: b, w: 'a' } : { pair, aDeck: b, bDeck: a, w: 'b' });
    for (let i = 0; i < bWins; i++) games.push(i % 2 ? { pair, aDeck: a, bDeck: b, w: 'b' } : { pair, aDeck: b, bDeck: a, w: 'a' });
    for (let i = 0; i < draws; i++) games.push({ pair, aDeck: a, bDeck: b, w: 'd' });
  };
  add(0, 60, 40, 0);          // lopsided
  add(1, 50, 50, 30);         // even, 100 decisive, draws ignored
  add(2, 400, 400, 0);        // even, many games: the rule's choice
  const t = rankPairs(pairs, games);
  assert.equal(t[0]?.pair, 2);
  assert.equal(t[1]?.pair, 1);
  assert.equal(t[2]?.pair, 0);
  assert.deepEqual([t[1]?.games, t[1]?.decisive, t[1]?.aWins], [130, 100, 50]);
  assert.equal(rankPairs(pairs, games.map((g) => ({ ...g, set: 'other.txt' })))[0]?.score, null, 'another set\'s games do not count');
});

const LISTING: DecisionListing = { d: 4, kind: 'p', turn: 7, tokens: ['cast:3', 'pass', 'cast:9'], labels: ['Bolt', 'pass', 'Bear'] };

function branchRows(c: 'random' | 'forge', n: number, p: number[], seed: number): BranchRow[] {
  const r = rng(seed, c);
  const out: BranchRow[] = [];
  for (let i = 0; i < n; i++) {
    for (let o = 0; o < p.length; o++) {
      const res = r.next() < (p[o] as number) ? 1 : -1;
      out.push({ v: 1, d: 4, kind: 'p', turn: 7, c, o, token: LISTING.tokens[o] as string, label: '', i, seed: i, result: res, score: scoreOf(res), capped: false, timedOut: false,
        turns: 12, steps: 100, ms: 900, bytes: 1000, standIns: 0, error: null, forkProblems: [], key: `k${c}${o}${i}` });
    }
  }
  return out;
}

test('a decision\'s two maps from its branch rows', () => {
  const rows = [...branchRows('random', 120, [0.3, 0.5, 0.7], 1), ...branchRows('forge', 120, [0.6, 0.4, 0.2], 2)];
  rows.push({ ...(rows[0] as BranchRow), i: 999, o: 0, key: 'lonely' });   // a branch with one option only: not paired, left out
  rows.push({ ...(rows[1] as BranchRow), i: 5, o: 2, error: 'boom', key: 'err' });   // an error row is left out (the branch stays: its own row is fine)
  const d = decisionAtlas(LISTING, rows, 300, 11);
  assert.equal(d.chosen, 0);
  assert.equal(d.random.branches, 120);
  assert.equal(d.forge.branches, 120);
  assert.equal(d.random.best, 2);
  assert.equal(d.forge.best, 0);
  assert.equal(d.forge.regret, 0);
  assert.ok((d.random.regret as number) > 0.25 && (d.random.regretLo as number) > 0.1);
  assert.ok((d.rho as number) < 0, 'the two maps order the options in reverse');
  assert.equal(d.sameBest, false);
  assert.equal(d.options[2]?.random.n, 120);
  const agreeing = decisionAtlas({ ...LISTING, d: 5 }, [...branchRows('random', 120, [0.3, 0.5, 0.7], 3), ...branchRows('forge', 120, [0.3, 0.5, 0.7], 4)].map((r) => ({ ...r, d: 5 })), 300, 12);
  assert.deepEqual(disagreements([agreeing, d]).map((x) => x.d), [4, 5]);
});

test('phase A\'s report: draws by the cap, the variance, the rollouts needed', () => {
  const rows: RolloutRow[] = [
    { v: 1, g: 1, seed: 1, winner: 'A', first: 'A', turns: 20, capped: false, reason: 'x', ms: 1, error: null, engineError: null, guardrails: { land: 9, keep: 2 } },
    { v: 1, g: 2, seed: 2, winner: 'B', first: 'A', turns: 30, capped: false, reason: 'x', ms: 1, error: null, engineError: null, guardrails: { land: 10, keep: 2 } },
    { v: 1, g: 3, seed: 3, winner: 'draw', first: 'B', turns: 41, capped: true, reason: 'TurnCap', ms: 1, error: null, engineError: null },
    { v: 1, g: 4, seed: 4, winner: null, first: null, turns: null, capped: false, reason: null, ms: null, error: null, engineError: 'worker died' },
  ];
  const a = phaseAReport(rows) as Record<string, any>;
  assert.deepEqual([a.games, a.played, a.engineErrors, a.aWins, a.bWins, a.draws, a.drawsByCap], [4, 3, 1, 1, 1, 1, 1]);
  assert.equal(a.aScore, 0.5);
  assert.equal(a.perGameVariance, 0.25);
  assert.equal(a.rolloutsForPlusMinus2, 2401);
  assert.equal(a.firstPlayerWins, 1);
  assert.deepEqual(a.guardrails, { land: 19, keep: 4 });
  assert.equal(a.turns.median, 30);
});

test('the guardrails read back from the decision records', () => {
  const dec = (n: number, kind: string, options: string[], chosen: string): string => JSON.stringify({ v: 1, seq: n, dir: 'ai', type: 'decision', body: { seat: 0, n, kind, options, chosen, by: 'forge' } });
  const good = [dec(0, 'mulligan', ['keep', 'mulligan'], 'keep'), dec(1, 'priority', ['pass', 'land:3', 'cast:4'], 'land:3'), dec(2, 'priority', ['pass', 'cast:4'], 'pass')].join('\n');
  const gc: GuardrailCheck = { logs: 0, priority: 0, landOffered: 0, landTaken: 0, mulligans: 0, kept: 0, violations: [] };
  guardrailCheck(good, 'g1', gc);
  assert.deepEqual([gc.priority, gc.landOffered, gc.landTaken, gc.mulligans, gc.kept, gc.violations.length], [2, 1, 1, 1, 1, 0]);
  guardrailCheck([dec(3, 'priority', ['pass', 'land:5'], 'pass'), dec(0, 'mulligan', ['keep', 'mulligan'], 'mulligan')].join('\n'), 'g2', gc);
  assert.equal(gc.violations.length, 2);
  assert.match(gc.violations.join(), /g2: decision 3 offered a land and played pass \(G1\)/);
  assert.match(gc.violations.join(), /took a mulligan \(G4\)/);
});

const OPTS: AtlasOptions = { deckA: '/d/a.dck', deckB: '/d/b.dck', seed: 451, turnCap: 40, rollouts: 10, branchRandom: 60, branchForge: 25, decisions: 3, options: 8, chunk: 25, leakChecks: 1, branchTimeoutSec: 120, boot: 100, pair: null };

test('the jobs: phase A\'s seeds and random seat, the units, their expected options and leak checks', () => {
  const j = rolloutJob('/repo', OPTS, '/o', 7) as Record<string, any>;
  assert.equal(j.seed, 451000007);
  assert.equal(j.turnCap, 40);
  assert.equal(j.playExplore.random, true);
  assert.equal(j.rows.key, 'atlasA:451000007');
  assert.equal(j.record.name, 'g7');
  const units = unitsOf([2, 5], OPTS);
  assert.equal(units.length, 2 * (3 + 1), 'random 60 in chunks of 25 = 3, forge 25 = 1, per decision');
  assert.deepEqual(units.slice(0, 4).map((u) => [u.d, u.c, u.i0, u.i1]), [[2, 'random', 0, 25], [2, 'random', 25, 50], [2, 'random', 50, 60], [2, 'forge', 0, 25]]);
  const u0 = unitJob(OPTS, '/o', units[0]!, LISTING) as Record<string, any>;
  const u1 = unitJob(OPTS, '/o', units[1]!, LISTING) as Record<string, any>;
  assert.deepEqual(u0.atlas.expect, LISTING.tokens);
  assert.equal(u0.atlas.leakChecks, 1);
  assert.equal(u1.atlas.leakChecks, 0, 'only the first chunk of a decision and continuation');
  assert.equal(u0.seed, 451, 'a unit replays the baseline from its seed');
  assert.ok(u0.gameTimeoutSec >= 1800 + 3 * 25 * 120, 'the unit\'s game holds all its branches');
});

test('every atlas game says it is never training data: frame-log headers and rows begin lines (#161 review)', () => {
  const a = rolloutJob('/repo', OPTS, '/o', 3) as Record<string, any>;
  const b = baselineJob('/repo', OPTS, '/o') as Record<string, any>;
  const u = unitJob(OPTS, '/o', unitsOf([2], OPTS)[0]!, LISTING) as Record<string, any>;
  assert.match(ATLAS_NOT_FOR_TRAINING, /^D451 /);
  for (const [what, j] of [['phase A', a], ['the baseline', b]] as const) {
    assert.equal(j.record.notForTraining, ATLAS_NOT_FOR_TRAINING, `${what}: the record block (CubeLab copies it into lab.notForTraining)`);
    assert.equal(j.rows.begin.notForTraining, ATLAS_NOT_FOR_TRAINING, `${what}: the rows begin line`);
  }
  assert.equal(u.atlas.notForTraining, ATLAS_NOT_FOR_TRAINING, 'a unit: its branches\' begin lines and headers (Atlas.Unit.lab)');
});

test('atlas.md renders the two maps side by side', () => {
  const d = decisionAtlas(LISTING, [...branchRows('random', 40, [0.3, 0.5, 0.7], 1), ...branchRows('forge', 40, [0.6, 0.4, 0.2], 2)], 100, 1);
  const md = atlasMd({
    plan: { pairRule: null }, phaseA: phaseAReport([]) as any,
    phaseB: { baseline: { winner: 'A', turns: 12, decisionsListed: 9 }, decisions: [d], agreement: { decisions: 1, meanRho: d.rho, meanRhoInterval: [null, null], sameBest: 0, sameBestInterval: [0, 0.79] }, disagreeMost: [{ d: 4 }], branchGames: 240, branchErrors: 0, cappedRandom: 0, cappedForge: 0 },
    checks: { problems: [], rows: 10, frameLogs: 4, leakChecks: 1, leaks: 0, leakControlsMoved: 1, forks: 240, forkProblems: 0, guardrails: { logs: 1, priorityDecisions: 5, landOffered: 2, landTaken: 2, mulligans: 1, kept: 1, violations: 0 } },
  } as any, OPTS);
  assert.match(md, /## Phase B: the two regret maps/);
  assert.match(md, /\| d4 \| 7 \| p \| 3 \|/);
  assert.match(md, /What the two maps agree and disagree about/);
  assert.match(md, /`cast:9` \| Bear/);
});

test('seat-identity: decisions without frame numbers, the last state and over', () => {
  const lines = [
    JSON.stringify({ v: 1, seq: 1, dir: 's2c', type: 'state', body: { turn: 1 } }),
    JSON.stringify({ v: 1, seq: 2, dir: 'ai', type: 'decision', body: { n: 0, frame: 1, stateSeq: 1, kind: 'priority', chosen: 'pass' } }),
    JSON.stringify({ v: 1, seq: 3, dir: 's2c', type: 'state', body: { turn: 2 } }),
    JSON.stringify({ v: 1, seq: 4, dir: 's2c', type: 'over', body: { winner: 0 } }),
  ];
  const out = decisionLines(lines);
  assert.equal(out.length, 3);
  assert.ok(!out[0]!.includes('"frame"') && !out[0]!.includes('"stateSeq"') && !out[0]!.includes('"seq"'));
  assert.match(out[1]!, /"turn":2/);
  assert.match(out[2]!, /"type":"over"/);
});

test('atlas-selftest clears the folder it writes, under LAB_DATA_DIR too (#161 review)', () => {
  const dir = atlasSelftestDir('/repo');
  assert.equal(dir, '/repo/var/cubelab/atlas-selftest');
  // the atlas writes where labPath puts its --out: for the self-test's absolute folder, never the drive
  assert.equal(labPath('/repo', dir, 'write', '/mnt/lab'), dir);
  assert.equal(labPath('/repo', dir, 'read', '/mnt/lab'), dir);
});
