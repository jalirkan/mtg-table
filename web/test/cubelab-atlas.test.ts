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
 *    each violation caught; G3's and G5's counts (D458) summed from each log's decisions summary, and
 *    written into atlas.json's checks by writeAtlas;
 *  - the jobs: phase A's seed and random seat, a unit's expected options and its leak checks on the
 *    first chunk only, the units' chunking; atlas.md renders;
 *  - seat-identity's decision lines: the frame numbers dropped, the last state and `over` kept;
 *  - D466: branch errors counted by text and an option past --branch-error-max made a problem (atlas.json's checks and
 *    atlas.md); every guardrail violation counted though only the first 50 are named; G1's planted controls (a land the
 *    seat's listing does not hold is no flag, a land in hand with the drop unused and not played is one); a truncated
 *    frame log skipped and named while atlas.json is still written.
 *  - D499: a play a killed attempt abandoned (its begin with no end; the key ended in another rows file) is left out of the
 *    rows' id check, counted in atlas.json (`abandonedPlays`, `abandonedRows`, `abandoned`) and said once, in the say line and
 *    atlas.md; a key that ended ok:true in two files is a problem (`playedTwice`); two ok:false ends are one game timed out
 *    twice, an ok:false end beside an ok:true one is superseded (`supersededPlays`), neither a problem.
 *  - D478: a capped (or loop-timed-out) branch scored other than a draw is a problem, as phase A's capped game is; capped
 *    branches are counted by option, and an option capped past --branch-capped-warn (0.25) is a WARNING, never a problem
 *    or exit 3 (D478's addendum: a long position, scored a half).
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

import {
  agreement, gamesFor, pairLines, rankPairs, ranks, regretInterval, regretOf, scoreOf, scoreStat, spearman, spread, wilson, type LadderGame,
} from '../../tools/cubelab/atlasmath.ts';
import {
  ATLAS_NOT_FOR_TRAINING, atlasMd, atlasSelftestDir, BRANCH_CAPPED_WARN_DEFAULT, BRANCH_ERROR_MAX_DEFAULT, baselineJob, branchErrors, COUNTED_GUARDRAILS, countedGuardrails, decisionAtlas, disagreements, erroredOptionProblem,
  cappedBranches, errorText, GUARDRAIL_VIOLATIONS_LISTED, guardrailCheck, newUnitState, phaseAReport, rolloutJob, unavailableBranches, unitJob, unitProgress, unitsOf, writeAtlas,
  type AtlasOptions, type BranchRow, type DecisionListing, type GuardrailCheck, type RolloutRow,
} from '../../tools/cubelab/atlas.ts';
import { decisionLines } from '../../tools/cubelab/seatidentity.ts';
import { matchDeadlineMs } from '../../tools/cubelab/engine.ts';
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
  // J153's pilot saw the assertion below false once on 8fca7250; the map is a pure function of its rows and its seed (every
  // draw from rng(seed, stream), never Math.random), so a second call must agree to the last digit, and the planted gap is
  // far from the bar (regret 0.3583 >> 0.25, its lower bound 0.229 >> 0.1; 50 runs in a loop all agreed, D465).
  // D466: it was not the rows -- Node 24.20's Maglev handed `d` the Forge map's regret and interval (6 runs in 8 failed,
  // 0 under `node --no-maglev --test`); decisionAtlas's mapOf is the workaround, and its comment has the repro.
  assert.deepEqual(decisionAtlas(LISTING, rows, 300, 11), d, 'the same rows and seed give the same map');
  assert.deepEqual([d.random.regret, d.random.regretLo], [0.3583, 0.229], 'the bootstrap is the seeded one');
  assert.equal(d.chosen, 0);
  assert.equal(d.random.branches, 120);
  assert.equal(d.forge.branches, 120);
  assert.equal(d.random.best, 2);
  assert.equal(d.forge.best, 0);
  assert.equal(d.forge.regret, 0);
  assert.ok((d.random.regret as number) > 0.25 && (d.random.regretLo as number) > 0.1, `regret ${String(d.random.regret)}, lower bound ${String(d.random.regretLo)}`);
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

const OPTS: AtlasOptions = { deckA: '/d/a.dck', deckB: '/d/b.dck', seed: 451, turnCap: 40, rollouts: 10, branchRandom: 60, branchForge: 25, decisions: 3, options: 8, chunk: 25, leakChecks: 1, branchTimeoutSec: 120, boot: 100, pair: null, unitTimeoutMin: 30 };

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
  assert.equal(u0.deadlineSec, 30 * 60, 'D459: the pool\'s watchdog is --unit-timeout minutes, not the game timeout\'s formula');
  assert.equal(matchDeadlineMs(u0 as never), 30 * 60 * 1000);
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
    checks: { problems: [], rows: 10, frameLogs: 4, leakChecks: 1, leaks: 0, leakControlsMoved: 1, forks: 240, forkProblems: 0, guardrails: { logs: 1, priorityDecisions: 5, landOffered: 2, landTaken: 2, mulligans: 1, kept: 1, violations: 0, noRepeatNoOp: 4, refusedCast: 7, noRepeatRefused: 5 } },
  } as any, OPTS);
  assert.match(md, /## Phase B: the two regret maps/);
  assert.match(md, /G3 left out a repeated no-op 4 time\(s\); G5 \(D458\): the engine refused 7 pick\(s\) it could not pay for, and 5 later offer\(s\)/);
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

test('G3 and G5 (D458) are counted from each random seat\'s decisions summary, and atlas.json\'s checks carry them', () => {
  const summary = (g: Record<string, number> | undefined): string => JSON.stringify({ v: 1, seq: 99, dir: 'ai', type: 'decisions',
    body: { seat: 0, written: 3, explore: { decisionsRandomised: 3, changed: 1, closeCalls: 0, closeCallsChanged: 0, coins: 3, failures: 0, byKind: {}, ...(g ? { guardrails: g } : {}) } } });
  const dec = JSON.stringify({ v: 1, seq: 1, dir: 'ai', type: 'decision', body: { seat: 0, n: 0, kind: 'priority', options: ['pass', 'cast:18'], chosen: 'cast:18', by: 'forge' } });
  const gc: GuardrailCheck = { logs: 0, priority: 0, landOffered: 0, landTaken: 0, mulligans: 0, kept: 0, violations: [] };
  // a seat whose Spellbinder-taxed cast was refused twice, each left out at the next decision of its window
  guardrailCheck([dec, summary({ land: 4, keep: 1, refusedCast: 2, noRepeatRefused: 2, noRepeatNoOp: 1 })].join('\n'), 'b1', gc);
  guardrailCheck([dec, summary({ land: 3, keep: 1, refusedCast: 1, noRepeatRefused: 0 })].join('\n'), 'b2', gc);
  guardrailCheck([dec, summary(undefined)].join('\n'), 'old', gc);   // a log from before M71: nothing to add
  assert.equal(gc.priority, 3, 'the summary line is not read as a decision');
  assert.deepEqual(countedGuardrails(gc), { noRepeatNoOp: 1, refusedCast: 3, noRepeatRefused: 2, xDrawn: 0, zeroXLeftOut: 0, zeroX: 0 });
  assert.deepEqual([...COUNTED_GUARDRAILS], ['noRepeatNoOp', 'refusedCast', 'noRepeatRefused', 'xDrawn', 'zeroXLeftOut', 'zeroX']);
  assert.deepEqual(countedGuardrails({ ...gc, counted: undefined }), { noRepeatNoOp: 0, refusedCast: 0, noRepeatRefused: 0, xDrawn: 0, zeroXLeftOut: 0, zeroX: 0 }, 'zero, never absent');
});

test('writeAtlas puts G5\'s counts in atlas.json\'s checks, from phase A\'s and the random branches\' logs only (D458)', () => {
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-g5-'));
  try {
    const log = (g: Record<string, number>): Buffer => zlib.gzipSync([
      JSON.stringify({ v: 1, seq: 1, dir: 'ai', type: 'decision', body: { seat: 0, n: 0, kind: 'priority', options: ['pass', 'cast:18'], chosen: 'cast:18', by: 'forge' } }),
      JSON.stringify({ v: 1, seq: 2, dir: 'ai', type: 'decisions', body: { seat: 0, explore: { guardrails: g } } }),
    ].join('\n'));
    const put = (dir: string, name: string, g: Record<string, number>): void => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, name), log(g)); };
    put(path.join(out, 'phaseA', 'frames'), 'g1-seat0.jsonl.gz', { refusedCast: 2, noRepeatRefused: 1 });
    put(path.join(out, 'phaseB', 'frames'), 'd6-random-o0-b0-seat0.jsonl.gz', { refusedCast: 3, noRepeatRefused: 3, noRepeatNoOp: 1 });
    put(path.join(out, 'phaseB', 'frames'), 'd6-forge-o0-b0-seat0.jsonl.gz', { refusedCast: 50 });   // not a random seat's log: not read
    writeAtlas(repo, OPTS, out, {}, {}, () => {});
    const doc = JSON.parse(fs.readFileSync(path.join(out, 'atlas.json'), 'utf8')) as { checks: { guardrails: Record<string, number> } };
    assert.equal(doc.checks.guardrails.logs, 2);
    assert.equal(doc.checks.guardrails.refusedCast, 5);
    assert.equal(doc.checks.guardrails.noRepeatRefused, 4);
    assert.equal(doc.checks.guardrails.noRepeatNoOp, 1);
    assert.match(fs.readFileSync(path.join(out, 'atlas.md'), 'utf8'), /G5 \(D458\): the engine refused 5 pick\(s\)/);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('G6 (D471): X drawn, X = 0-only offers left out and own plays paid at X = 0 are counted; a play paid at 0 is a violation and a problem', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-g6-'));
  try {
    const log = (g: Record<string, number>): Buffer => zlib.gzipSync([
      JSON.stringify({ v: 1, seq: 1, dir: 'ai', type: 'decision', body: { seat: 0, n: 0, kind: 'priority', options: ['pass', 'activate:40'], chosen: 'activate:40', by: 'forge' } }),
      JSON.stringify({ v: 1, seq: 2, dir: 'ai', type: 'decisions', body: { seat: 0, explore: { guardrails: g } } }),
    ].join('\n'));
    const put = (dir: string, name: string, g: Record<string, number>): void => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, name), log(g)); };
    // J158's pauper spine after G6: Crypt Rats offered only when black mana pays X >= 1
    put(path.join(out, 'phaseA', 'frames'), 'g1-seat0.jsonl.gz', { land: 5, xDrawn: 1, zeroXLeftOut: 22 });
    put(path.join(out, 'phaseB', 'frames'), 'd0-random-o0-b27-seat0.jsonl.gz', { land: 8, xDrawn: 2, zeroXLeftOut: 19 });
    put(path.join(out, 'phaseB', 'frames'), 'd0-forge-o0-b0-seat0.jsonl.gz', { zeroX: 9 });   // not a random seat's log: not read
    writeAtlas(REPO, OPTS, out, {}, {}, () => {});
    let doc = JSON.parse(fs.readFileSync(path.join(out, 'atlas.json'), 'utf8')) as { checks: { problems: string[]; guardrails: Record<string, unknown> } };
    assert.equal(doc.checks.guardrails.xDrawn, 3);
    assert.equal(doc.checks.guardrails.zeroXLeftOut, 41);
    assert.equal(doc.checks.guardrails.zeroX, 0);
    assert.deepEqual(doc.checks.guardrails.violationsBy, { G1: 0, G4: 0, G6: 0 });
    assert.ok(!doc.checks.problems.some((p) => /G6/.test(p)), doc.checks.problems.join('\n'));
    assert.match(fs.readFileSync(path.join(out, 'atlas.md'), 'utf8'), /G6 \(D471\): 3 pick\(s\) of the seats' own X plays had X drawn from 1 up, 41 offer\(s\) payable only at X = 0 were left out, and 0 own play\(s\) were paid at X = 0/);
    // a violation: an own X play the engine paid at X = 0 (what J158's seat did 3,600-20,700 times a branch)
    put(path.join(out, 'phaseB', 'frames'), 'd0-random-o1-b27-seat0.jsonl.gz', { xDrawn: 2, zeroX: 2 });
    writeAtlas(REPO, OPTS, out, {}, {}, () => {});
    doc = JSON.parse(fs.readFileSync(path.join(out, 'atlas.json'), 'utf8')) as typeof doc;
    assert.equal(doc.checks.guardrails.zeroX, 2);
    assert.equal(doc.checks.guardrails.violations, 2);
    assert.deepEqual(doc.checks.guardrails.violationsBy, { G1: 0, G4: 0, G6: 2 });
    assert.ok(doc.checks.problems.some((p) => /^2 play\(s\) the random seats picked themselves went on the stack with X = 0 \(G6, D471/.test(p)), doc.checks.problems.join('\n'));
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

// ------------------------------------------------------------------
// D466: J156's four tool faults
// ------------------------------------------------------------------

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** A branch row of decision `d`, option `o`, continuation `c`, branch `i`, with `error`. */
const brow = (d: number, o: number, c: 'random' | 'forge', i: number, error: string | null, token = `cast:${30 + o}`): BranchRow => ({
  v: 1, d, kind: 'p', turn: 5, c, o, token, label: o === 0 ? 'pass' : `Card ${o}`, i, seed: 1000 + i, result: error ? 0 : (i % 2 ? 1 : -1), score: error ? 0.5 : (i % 2 ? 1 : 0),
  capped: false, timedOut: false, turns: 9, steps: 100, ms: 10, bytes: 0, standIns: 0, error, forkProblems: [], key: `atlas:d${d}:${c}:o${o}:b${i}`,
});

test('branch errors are counted by text, and an option past --branch-error-max is named with its error (D466, J156 spine 458)', () => {
  const rows: BranchRow[] = [];
  for (let i = 0; i < 12; i++) {
    const c = i < 8 ? 'random' : 'forge';
    rows.push(brow(5, 0, c, i, i === 3 ? 'NullPointerException: Cannot read field "x" of card 145' : null, 'pass'));   // 1 of 12: under the threshold
    rows.push(brow(5, 1, c, i, 'IllegalStateException: optional costs are not copied'));                                // 12 of 12: J156's retrace cast
    rows.push(brow(5, 2, c, i, i < 2 ? `NullPointerException: Cannot read field "x" of card ${140 + i}` : null));       // 2 of 12: over
  }
  const be = branchErrors(rows, BRANCH_ERROR_MAX_DEFAULT);
  assert.equal(be.branches, 36);
  assert.equal(be.errored, 15);
  assert.deepEqual(be.byError, [
    { error: 'IllegalStateException: optional costs are not copied', n: 12 },
    { error: 'NullPointerException: Cannot read field "x" of card #', n: 3 },
  ], 'one text per fault: the ids taken out');
  assert.deepEqual(be.options.map((x) => [x.d, x.o, x.errored, x.branches]), [[5, 1, 12, 12], [5, 2, 2, 12]], 'option 0 (1 of 12) is under one in ten');
  assert.deepEqual(be.options[0]?.byContinuation, { random: { branches: 8, errored: 8 }, forge: { branches: 4, errored: 4 } });
  assert.match(erroredOptionProblem(be.options[0] as NonNullable<typeof be.options[0]>), /^d5 option 1 `cast:31` \(Card 1\): 12 of 12 branch game\(s\) errored \(random 8 of 8, forge 4 of 4\): 12 x IllegalStateException: optional costs are not copied$/);
  assert.equal(branchErrors(rows, 0.2).options.length, 1, 'the threshold is the job\'s: at 0.2 only the retrace option');
  assert.equal(branchErrors(rows.filter((r) => !r.error), 0.1).options.length, 0, 'no error, no option');
  assert.equal(errorText('no Bolt on the copy\'s Card 123 (77)'), 'no Bolt on the copy\'s Card # (#)');
});

test('writeAtlas makes an errored option a problem and shows the errors in atlas.md\'s checks (D466)', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-err-'));
  try {
    const B = path.join(out, 'phaseB');
    fs.mkdirSync(B, { recursive: true });
    const listing: DecisionListing = { d: 5, kind: 'p', turn: 5, tokens: ['pass', 'cast:31'], labels: ['pass', 'Orcish Bowmasters'] };
    fs.writeFileSync(path.join(B, 'baseline.json'), JSON.stringify({ v: 1, seed: 458, winner: 'A', first: 'A', turns: 11, decisions: [0, 1, 2, 3, 4].map((d) => ({ ...listing, d })).concat([listing]) }));
    const rows: BranchRow[] = [];
    for (let i = 0; i < 4; i++) {
      rows.push(brow(5, 0, 'random', i, null, 'pass'), brow(5, 1, 'random', i, 'IllegalStateException: optional costs are not copied'));
      rows.push(brow(5, 0, 'forge', i, null, 'pass'), brow(5, 1, 'forge', i, 'IllegalStateException: optional costs are not copied'));
    }
    fs.writeFileSync(path.join(B, 'branches.jsonl'), `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`);
    const rc = writeAtlas(REPO, OPTS, out, {}, {}, () => {});
    assert.equal(rc, 3, 'a problem exits 3');
    const doc = JSON.parse(fs.readFileSync(path.join(out, 'atlas.json'), 'utf8')) as { plan: unknown; checks: { problems: string[]; branchErrors: { errored: number; threshold: number; options: unknown[] } } };
    assert.equal(doc.checks.branchErrors.errored, 8);
    assert.equal(doc.checks.branchErrors.threshold, 0.1);
    assert.equal(doc.checks.branchErrors.options.length, 1);
    assert.ok(doc.checks.problems.some((p) => /^d5 option 1 `cast:31` \(Card 1\): 8 of 8 branch game\(s\) errored/.test(p)), doc.checks.problems.join('\n'));
    const md = fs.readFileSync(path.join(out, 'atlas.md'), 'utf8');
    assert.match(md, /### Branch games that errored/);
    assert.match(md, /\| 8 \| IllegalStateException: optional costs are not copied \|/);
    assert.match(md, /\| d5 \| 1 \| `cast:31` \| Card 1 \| 8 \/ 8 \| 4 \/ 4 \| 4 \/ 4 \|/);
    // the job sets the threshold: 1 (never) leaves the same errors counted and no option a problem
    writeAtlas(REPO, { ...OPTS, branchErrorMax: 1 }, out, {}, {}, () => {});
    const doc1 = JSON.parse(fs.readFileSync(path.join(out, 'atlas.json'), 'utf8')) as { checks: { problems: string[]; branchErrors: { errored: number; options: unknown[] } } };
    assert.equal(doc1.checks.branchErrors.errored, 8);
    assert.equal(doc1.checks.branchErrors.options.length, 0);
    assert.ok(!doc1.checks.problems.some((p) => /branch game\(s\) errored/.test(p)));
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('an option the copy cannot give is unavailable: left out of the map, counted apart from errors, a problem past the bar (D470, J158 spine 461)', () => {
  const NO_BAND = 'option unavailable: the forced block\'s attacker Ledger Shredder (78) is not attacking';
  const NEVER = 'option unavailable: the seat was never asked to declare blockers at the fork\'s combat (turn 13; the copy is at turn 13 COMBAT_FIRST_STRIKE_DAMAGE)';
  const rows: BranchRow[] = [];
  for (let i = 0; i < 10; i++) {
    const c = i < 8 ? 'random' : 'forge';
    const gone = i < 2 ? NO_BAND : i === 2 ? NEVER : undefined;   // 3 of 10: over one in ten
    rows.push({ ...brow(10, 0, c, i, null, 'block:35>78'), kind: 'b', ...(gone ? { unavailable: gone, result: 0, score: 0.5 } : {}) });
    rows.push({ ...brow(10, 1, c, i, null, 'block:none'), kind: 'b' });
  }
  const ua = unavailableBranches(rows, BRANCH_ERROR_MAX_DEFAULT);
  assert.equal(ua.errored, 3);
  assert.deepEqual(ua.byError.map((e) => e.n), [2, 1], 'by reason, ids as #');
  assert.match(ua.byError[0]?.error ?? '', /attacker Ledger Shredder \(#\) is not attacking/);
  assert.deepEqual(ua.options.map((x) => [x.d, x.o, x.errored, x.branches]), [[10, 0, 3, 10]]);
  assert.match(erroredOptionProblem(ua.options[0] as NonNullable<typeof ua.options[0]>, 'were unavailable'), /^d10 option 0 `block:35>78` \(pass\): 3 of 10 branch game\(s\) were unavailable \(random 3 of 8, forge 0 of 2\): 2 x option unavailable/);
  assert.equal(branchErrors(rows, BRANCH_ERROR_MAX_DEFAULT).errored, 0, 'never a branch error');
  // the map: a branch whose option was unavailable drops out of the paired matrix, as an errored one does
  const listing: DecisionListing = { d: 10, kind: 'b', turn: 13, tokens: ['block:35>78', 'block:none'], labels: ['block Kitesail Freebooter>Ledger Shredder', 'block none'] };
  const d = decisionAtlas(listing, rows, 200, 7);
  assert.equal(d.random.branches, 5, 'random: 8 branches less the 3 unavailable');
  assert.equal(d.forge.branches, 2);
  assert.equal(d.options[0]?.random.n, 5);
  // writeAtlas: counted in checks.optionUnavailable, a problem, shown in atlas.md
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-unavail-'));
  try {
    const B = path.join(out, 'phaseB');
    fs.mkdirSync(B, { recursive: true });
    fs.writeFileSync(path.join(B, 'baseline.json'), JSON.stringify({ v: 1, seed: 461, winner: 'B', first: 'A', turns: 17, decisions: Array.from({ length: 11 }, (_, k) => ({ ...listing, d: k })) }));
    fs.writeFileSync(path.join(B, 'branches.jsonl'), `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`);
    assert.equal(writeAtlas(REPO, OPTS, out, {}, {}, () => {}), 3);
    const doc = JSON.parse(fs.readFileSync(path.join(out, 'atlas.json'), 'utf8')) as { phaseB: { branchErrors: number; branchUnavailable: number }; checks: { problems: string[]; branchErrors: { errored: number }; optionUnavailable: { errored: number; options: unknown[] } } };
    assert.equal(doc.phaseB.branchErrors, 0);
    assert.equal(doc.phaseB.branchUnavailable, 3);
    assert.equal(doc.checks.branchErrors.errored, 0);
    assert.equal(doc.checks.optionUnavailable.errored, 3);
    assert.ok(doc.checks.problems.some((p) => /^d10 option 0 `block:35>78`.* 3 of 10 branch game\(s\) were unavailable/.test(p)), doc.checks.problems.join('\n'));
    assert.match(fs.readFileSync(path.join(out, 'atlas.md'), 'utf8'), /### Branch games where the option could not be given/);
    // under the bar: counted, no problem
    writeAtlas(REPO, { ...OPTS, branchErrorMax: 0.5 }, out, {}, {}, () => {});
    const doc1 = JSON.parse(fs.readFileSync(path.join(out, 'atlas.json'), 'utf8')) as { checks: { problems: string[]; optionUnavailable: { errored: number; options: unknown[] } } };
    assert.equal(doc1.checks.optionUnavailable.errored, 3);
    assert.equal(doc1.checks.optionUnavailable.options.length, 0);
    assert.ok(!doc1.checks.problems.some((p) => /were unavailable/.test(p)));
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('a branch whose game Karn restarted is played on: its row carries the restarts, it counts in the map, phase B counts it (D477, J162 modern7)', () => {
  // the worker's streamed branch keeps its restarts on the row
  const listing: DecisionListing = { d: 0, kind: 'p', turn: 3, tokens: ['pass', 'cast:31'], labels: ['pass', 'Card 1'] };
  const got: BranchRow[] = [];
  const st = newUnitState({ d: 0, c: 'random', i0: 0, i1: 2 } as Parameters<typeof newUnitState>[0], new Set());
  const sink = { branch: (r: BranchRow) => { got.push(r); }, unit: () => {}, resume: () => { throw new Error('not resumed here'); } } as Parameters<typeof unitProgress>[3];
  const { v: _v, d: _d, kind: _k, turn: _t, c: _c, token: _tok, label: _l, score: _s, ...worker } = { ...brow(0, 0, 'random', 0, null, 'pass'), result: -1, turns: 31, restarts: 1 };
  unitProgress(st, [listing], { type: 'progress', id: 'd0-random-0', branch: worker } as Parameters<typeof unitProgress>[2], sink);
  unitProgress(st, [listing], { type: 'progress', id: 'd0-random-0', branch: { ...worker, o: 1, key: 'atlas:d0:random:o1:b0', restarts: undefined } } as Parameters<typeof unitProgress>[2], sink);
  assert.deepEqual(got.map((r) => r.restarts), [1, undefined], 'restarts only on the restarted branch');
  assert.equal(got[0]?.error, null);
  // the map: a restarted branch is a played one, with its result
  const rows: BranchRow[] = [];
  for (let i = 0; i < 8; i++) {
    for (const o of [0, 1]) rows.push({ ...brow(0, o, i < 6 ? 'random' : 'forge', i, null, o ? 'cast:31' : 'pass'), ...(o === 0 && i < 2 ? { restarts: 1, turns: 31 } : {}) });
  }
  const d = decisionAtlas(listing, rows, 200, 7);
  assert.equal(d.options[0]?.random.n, 6, 'every random branch of option 0 counts, the two restarted ones included');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-restart-'));
  try {
    const B = path.join(out, 'phaseB');
    fs.mkdirSync(B, { recursive: true });
    fs.writeFileSync(path.join(B, 'baseline.json'), JSON.stringify({ v: 1, seed: 466, winner: 'B', first: 'A', turns: 17, decisions: [listing] }));
    fs.writeFileSync(path.join(B, 'branches.jsonl'), `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`);
    writeAtlas(REPO, OPTS, out, {}, {}, () => {});
    const doc = JSON.parse(fs.readFileSync(path.join(out, 'atlas.json'), 'utf8')) as { phaseB: { branchErrors: number; branchRestarted: number }; checks: { problems: string[] } };
    assert.equal(doc.phaseB.branchRestarted, 2);
    assert.equal(doc.phaseB.branchErrors, 0);
    assert.ok(!doc.checks.problems.some((p) => /restart/i.test(p)), doc.checks.problems.join('\n'));
    assert.match(fs.readFileSync(path.join(out, 'atlas.md'), 'utf8'), /2 played on through a restart of the game by Karn Liberated \(D477\), counted as played/);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('a copy that could not name an effect\'s source, or lost an exile link, is counted: on the row, in phase B and atlas.md, never a problem (D479)', () => {
  const listing: DecisionListing = { d: 0, kind: 'p', turn: 3, tokens: ['pass', 'cast:31'], labels: ['pass', 'Card 1'] };
  const got: BranchRow[] = [];
  const st = newUnitState({ d: 0, c: 'random', i0: 0, i1: 2 } as Parameters<typeof newUnitState>[0], new Set());
  const sink = { branch: (r: BranchRow) => { got.push(r); }, unit: () => {}, resume: () => { throw new Error('not resumed here'); } } as Parameters<typeof unitProgress>[3];
  const { v: _v, d: _d, kind: _k, turn: _t, c: _c, token: _tok, label: _l, score: _s, ...worker } = { ...brow(0, 0, 'random', 0, null, 'pass'), effectSourceNull: 2, exileLinksLost: 1 };
  unitProgress(st, [listing], { type: 'progress', id: 'd0-random-0', branch: worker } as Parameters<typeof unitProgress>[2], sink);
  unitProgress(st, [listing], { type: 'progress', id: 'd0-random-0', branch: { ...worker, o: 1, key: 'atlas:d0:random:o1:b0', effectSourceNull: undefined, exileLinksLost: undefined } } as Parameters<typeof unitProgress>[2], sink);
  assert.deepEqual(got.map((r) => [r.effectSourceNull, r.exileLinksLost]), [[2, 1], [undefined, undefined]], 'the counters only on the branch that had them');
  const rows: BranchRow[] = [];
  for (let i = 0; i < 8; i++) {
    for (const o of [0, 1]) rows.push({ ...brow(0, o, i < 6 ? 'random' : 'forge', i, null, o ? 'cast:31' : 'pass'), ...(o === 1 && i < 3 ? { effectSourceNull: 1 } : {}), ...(i === 7 ? { exileLinksLost: 2 } : {}) });
  }
  const d = decisionAtlas(listing, rows, 200, 7);
  assert.equal(d.options[1]?.random.n, 6, 'a branch with a null source still counts in its option\'s value');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-copier-'));
  try {
    const B = path.join(out, 'phaseB');
    fs.mkdirSync(B, { recursive: true });
    fs.writeFileSync(path.join(B, 'baseline.json'), JSON.stringify({ v: 1, seed: 466, winner: 'B', first: 'A', turns: 17, decisions: [listing] }));
    fs.writeFileSync(path.join(B, 'branches.jsonl'), `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`);
    writeAtlas(REPO, OPTS, out, {}, {}, () => {});
    const doc = JSON.parse(fs.readFileSync(path.join(out, 'atlas.json'), 'utf8')) as { phaseB: { effectSourceNull: { branches: number; cards: number }; exileLinksLost: { branches: number; links: number } }; checks: { problems: string[] } };
    assert.deepEqual(doc.phaseB.effectSourceNull, { branches: 3, cards: 3 });
    assert.deepEqual(doc.phaseB.exileLinksLost, { branches: 2, links: 4 });
    assert.equal(doc.checks.problems.length, 0, doc.checks.problems.join('\n'));
    const md = fs.readFileSync(path.join(out, 'atlas.md'), 'utf8');
    assert.match(md, /In 3 branch game\(s\) the fork's copy held 3 effect\(s\) whose source it could not name, each played as if it had none \(D479\)\./);
    assert.match(md, /In 2 the copy lost 4 "exiled with" link\(s\) \(D479\)\./);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('a capped branch is a draw: one written as seat A\'s win is a problem; an option capped past --branch-capped-warn is a warning, never a problem (D478 and its addendum)', () => {
  const listing: DecisionListing = { d: 0, kind: 'p', turn: 3, tokens: ['pass', 'cast:31'], labels: ['pass', 'Card 1'] };
  // 10 branches an option, 8 random and 2 Forge; option 0's branches 0-2 capped (3 of 10: over the default warning's one in four),
  // option 1's branch 0
  const rows = (asWritten: boolean): BranchRow[] => {
    const rs: BranchRow[] = [];
    for (let i = 0; i < 10; i++) {
      for (const o of [0, 1]) {
        const capped = o === 0 ? i < 3 : i === 0;
        const draw = asWritten ? { result: 1, score: 1 } : { result: 0, score: 0.5 };   // J162's rows: result 1
        rs.push({ ...brow(0, o, i < 8 ? 'random' : 'forge', i, null, o ? 'cast:31' : 'pass'), ...(capped ? { capped: true, turns: 41, ...draw } : {}) });
      }
    }
    return rs;
  };
  assert.equal(BRANCH_CAPPED_WARN_DEFAULT, 0.25);
  const bc = cappedBranches(rows(false), BRANCH_CAPPED_WARN_DEFAULT);
  assert.equal(bc.errored, 4);
  assert.deepEqual(bc.options.map((x) => [x.d, x.o, x.errored, x.branches]), [[0, 0, 3, 10]], 'option 1, 1 of 10, is under the bar');
  assert.match(erroredOptionProblem(bc.options[0] as NonNullable<typeof bc.options[0]>, 'were capped'), /^d0 option 0 `pass` \(pass\): 3 of 10 branch game\(s\) were capped \(random 3 of 8, forge 0 of 2\): 3 x ended at the turn cap/);
  assert.equal(branchErrors(rows(false), BRANCH_ERROR_MAX_DEFAULT).errored, 0, 'never a branch error');
  // the map: a capped branch stays in, at a half
  const d = decisionAtlas(listing, rows(false), 200, 7);
  assert.equal(d.options[0]?.random.n, 8);
  assert.equal(d.options[0]?.random.draws, 3);
  assert.equal(decisionAtlas(listing, rows(true), 200, 7).options[0]?.random.draws, 0, 'as J162 wrote them: no draw, three wins');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-capped-'));
  type Doc = { phaseB: { cappedRandom: number; cappedForge: number }; checks: { problems: string[]; warnings: string[]; branchCapped: { errored: number; notDrawn: number; threshold: number; options: unknown[] } } };
  const run = (rs: BranchRow[], o: AtlasOptions): { rc: number; doc: Doc; md: string } => {
    fs.writeFileSync(path.join(out, 'phaseB', 'branches.jsonl'), `${rs.map((r) => JSON.stringify(r)).join('\n')}\n`);
    const rc = writeAtlas(REPO, o, out, {}, {}, () => {});
    return { rc, doc: JSON.parse(fs.readFileSync(path.join(out, 'atlas.json'), 'utf8')) as Doc, md: fs.readFileSync(path.join(out, 'atlas.md'), 'utf8') };
  };
  try {
    fs.mkdirSync(path.join(out, 'phaseB'), { recursive: true });
    fs.writeFileSync(path.join(out, 'phaseB', 'baseline.json'), JSON.stringify({ v: 1, seed: 466, winner: 'B', first: 'A', turns: 17, decisions: [listing] }));
    // as the fixed worker writes them: counted, the option over the default bar a WARNING, the atlas clean (exit 0)
    const a = run(rows(false), OPTS);
    assert.equal(a.rc, 0, a.doc.checks.problems.join('\n'));
    assert.equal(a.doc.phaseB.cappedRandom, 4);
    assert.equal(a.doc.checks.branchCapped.errored, 4);
    assert.equal(a.doc.checks.branchCapped.notDrawn, 0);
    assert.equal(a.doc.checks.branchCapped.threshold, BRANCH_CAPPED_WARN_DEFAULT);
    assert.deepEqual(a.doc.checks.problems, []);
    assert.equal(a.doc.checks.warnings.length, 1);
    assert.match(a.doc.checks.warnings[0] as string, /^d0 option 0 `pass`.* 3 of 10 branch game\(s\) were capped/);
    assert.match(a.md, /### Branch games the turn cap ended/);
    assert.match(a.md, /- a warning: d0 option 0 `pass`/);
    assert.doesNotMatch(a.md, /a problem: d0 option 0/);
    // --branch-error-max does not move it: at one in a hundred the capped option is still a warning, not a problem
    const e = run(rows(false), { ...OPTS, branchErrorMax: 0.01 });
    assert.equal(e.rc, 0);
    assert.ok(!e.doc.checks.problems.some((p) => /capped/.test(p)), e.doc.checks.problems.join('\n'));
    // a pauper night at the 40-turn cap: every branch of the option capped is still a warning, exit 0
    const all = run(rows(false).map((r) => (r.o === 0 ? { ...r, capped: true, turns: 41, result: 0, score: 0.5 } : r)), OPTS);
    assert.equal(all.rc, 0);
    assert.match(all.doc.checks.warnings[0] as string, /10 of 10 branch game\(s\) were capped/);
    // under a warning bar of one half: counted, no warning, no problem
    const b = run(rows(false), { ...OPTS, branchCappedWarn: 0.5 });
    assert.equal(b.doc.checks.branchCapped.options.length, 0);
    assert.deepEqual(b.doc.checks.warnings, []);
    assert.ok(!b.doc.checks.problems.some((p) => /capped/.test(p)), b.doc.checks.problems.join('\n'));
    // as J162's worker wrote them (result 1): a problem (tool correctness, still exit 3), with the count
    const c = run(rows(true), { ...OPTS, branchCappedWarn: 0.5 });
    assert.equal(c.rc, 3);
    assert.equal(c.doc.checks.branchCapped.notDrawn, 4);
    assert.ok(c.doc.checks.problems.some((p) => /^4 capped or timed-out branch game\(s\) not scored a draw \(D478\)/.test(p)), c.doc.checks.problems.join('\n'));
    // a loop timeout (played, no engine error) is a draw too: brow's branch 5 is a win, so timed out it is a problem until it is 0
    const t = (draw: boolean): BranchRow[] => rows(false).map((r) => (r.o === 1 && r.i === 5 ? { ...r, timedOut: true, ...(draw ? { result: 0, score: 0.5 } : {}) } : r));
    const tf = run(t(false), { ...OPTS, branchCappedWarn: 0.5 });
    assert.equal(tf.rc, 3);
    assert.ok(tf.doc.checks.problems.some((p) => /^1 capped or timed-out branch game\(s\) not scored a draw/.test(p)));
    assert.ok(!run(t(true), { ...OPTS, branchCappedWarn: 0.5 }).doc.checks.problems.some((p) => /not scored a draw/.test(p)));
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

/** A priority decision record (D347) of seat 1. */
const pdec = (n: number, options: string[], chosen: string): string => JSON.stringify({ v: 1, seq: n, dir: 'ai', type: 'decision', body: { seat: 1, n, kind: 'priority', turn: 6, phase: 'MAIN2', options, chosen, by: 'forge' } });

test('G1, planted (D466): a land the seat\'s own listing does not hold is no flag; a land in hand, drop unused, not played, is one', () => {
  // negative control: Laelia, the Blade Reforged attacked after the seat's land drop and exiled a land ("you may play that card
  // this turn"); the record and the seat list from ONE listing (Decisions.landPlays, the land drop checked), so it is not offered
  const laelia = [pdec(40, ['pass', 'land:61', 'cast:92'], 'land:61'), pdec(41, ['pass', 'cast:92'], 'pass'), pdec(42, ['pass', 'activate:92'], 'pass')].join('\n');
  const gc: GuardrailCheck = { logs: 0, priority: 0, landOffered: 0, landTaken: 0, mulligans: 0, kept: 0, violations: [] };
  guardrailCheck(laelia, 'laelia', gc);
  assert.deepEqual([gc.landOffered, gc.landTaken, gc.violations.length, gc.violationCount?.G1], [1, 1, 0, 0]);
  // positive control: a land in hand with the drop unused, offered and not played: the seat's own fault, flagged
  guardrailCheck(pdec(7, ['pass', 'land:12', 'cast:30'], 'cast:30'), 'hand', gc);
  assert.deepEqual([gc.landOffered, gc.violations.length, gc.violationCount?.G1], [2, 1, 1]);
  assert.match(gc.violations[0] as string, /^hand: decision 7 offered a land and played cast:30 \(G1\)$/);
});

test('every guardrail violation is counted, though only the first 50 are named (D466: J156 vintage, 200 shown of 3,071)', () => {
  const gc: GuardrailCheck = { logs: 0, priority: 0, landOffered: 0, landTaken: 0, mulligans: 0, kept: 0, violations: [] };
  guardrailCheck(Array.from({ length: 70 }, (_, n) => pdec(n, ['pass', 'land:5'], 'pass')).join('\n'), 'g9', gc);
  assert.equal(gc.violations.length, GUARDRAIL_VIOLATIONS_LISTED);
  assert.deepEqual(gc.violationCount, { G1: 70, G4: 0 });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-g1-'));
  try {
    fs.mkdirSync(path.join(out, 'phaseA', 'frames'), { recursive: true });
    fs.writeFileSync(path.join(out, 'phaseA', 'frames', 'g1-seat1.jsonl.gz'), zlib.gzipSync(Array.from({ length: 70 }, (_, n) => pdec(n, ['pass', 'land:5'], 'pass')).join('\n')));
    writeAtlas(REPO, OPTS, out, {}, {}, () => {});
    const doc = JSON.parse(fs.readFileSync(path.join(out, 'atlas.json'), 'utf8')) as { checks: { problems: string[]; guardrails: { violations: number; violationsBy: Record<string, number> } } };
    assert.equal(doc.checks.guardrails.violations, 70, 'the true count, not the list\'s length');
    assert.deepEqual(doc.checks.guardrails.violationsBy, { G1: 70, G4: 0, G6: 0 });
    assert.equal(doc.checks.problems.filter((p) => /\(G1\)$/.test(p)).length, 10, 'ten named in the problems');
    assert.ok(doc.checks.problems.includes('70 guardrail violation(s) in all (G1 70, G4 0); the first 10 named above'), doc.checks.problems.join('\n'));
    assert.match(fs.readFileSync(path.join(out, 'atlas.md'), 'utf8'), /70 guardrail violation\(s\) \(G1 70, G4 0, G6 0\)/);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('a truncated frame log is skipped and named, and atlas.json is still written (D466: J156 spine 458\'s hung branch)', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-trunc-'));
  try {
    const B = path.join(out, 'phaseB');
    const frames = path.join(B, 'frames');
    const rowsDir = path.join(B, 'rows');
    fs.mkdirSync(frames, { recursive: true });
    fs.mkdirSync(rowsDir, { recursive: true });
    const full = zlib.gzipSync(Array.from({ length: 400 }, (_, n) => pdec(n, ['pass', 'cast:9'], 'pass')).join('\n'));
    // the hung branch: the watchdog killed its worker mid-write, so both seats' logs end mid-stream
    for (const s of [0, 1]) fs.writeFileSync(path.join(frames, `d9-random-o0-b165-seat${s}.jsonl.gz`), full.subarray(0, Math.floor(full.length / 2)));
    fs.writeFileSync(path.join(frames, 'd9-forge-o0-b1-seat0.jsonl.gz'), full.subarray(0, 40));
    // ...and its rows name it, so the rows' id check reads it too
    fs.writeFileSync(path.join(rowsDir, 'rows-w0.jsonl'), [
      JSON.stringify({ type: 'header', v: 1, stateSize: 4, cand: { p: ['a'] } }),
      JSON.stringify({ type: 'begin', game: 'atlas:d9:random:o0:b165', decision: 9, continuation: 'random', option: 0, branch: 165, seat0: 'Drafter A', seat1: 'Drafter B' }),
      JSON.stringify({ type: 'row', v: 1, game: 'atlas:d9:random:o0:b165', seat: 'Drafter A', kind: 'p', turn: 9, n: 1, chosen: 0, tokens: ['cast:9'], s: [[0, 1]], c: [[1]] }),
    ].join('\n') + '\n');
    assert.throws(() => zlib.gunzipSync(fs.readFileSync(path.join(frames, 'd9-random-o0-b165-seat0.jsonl.gz'))), /unexpected end of file/, 'the file is what J156 left');
    const said: string[] = [];
    const rc = writeAtlas(REPO, OPTS, out, {}, {}, (x) => said.push(x));
    assert.equal(rc, 3);
    // #184's review: the rows' id check says which game it skipped, and why
    assert.ok(said.includes('  atlas: rows of atlas:d9:random:o0:b165: id check skipped, its frame log phaseB/frames/d9-random-o0-b165-seat0.jsonl.gz could not be read'), said.join('\n'));
    const doc = JSON.parse(fs.readFileSync(path.join(out, 'atlas.json'), 'utf8')) as { checks: { problems: string[]; frameLogs: number; unreadableFrameLogs: Array<{ log: string; why: string }>; idChecksSkipped: Array<{ game: string; log: string }> } };
    assert.deepEqual(doc.checks.idChecksSkipped, [{ game: 'atlas:d9:random:o0:b165', log: 'phaseB/frames/d9-random-o0-b165-seat0.jsonl.gz' }]);
    assert.deepEqual(doc.checks.unreadableFrameLogs.map((t) => t.log), ['phaseB/frames/d9-forge-o0-b1-seat0.jsonl.gz', 'phaseB/frames/d9-random-o0-b165-seat0.jsonl.gz', 'phaseB/frames/d9-random-o0-b165-seat1.jsonl.gz']);
    assert.ok(doc.checks.unreadableFrameLogs.every((t) => t.why === 'unexpected end of file'));
    assert.equal(doc.checks.frameLogs, 0, 'not sent to the redaction checker');
    assert.ok(doc.checks.problems.some((p) => p.startsWith('3 frame log(s) could not be read (gzip: unexpected end of file) and were left out of the checks')), doc.checks.problems.join('\n'));
    assert.match(fs.readFileSync(path.join(out, 'atlas.md'), 'utf8'), /3 frame log\(s\) could not be read/);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('a play a killed attempt abandoned is left out of the id check, counted in atlas.json and said once (D499: J181 s13\'s d28-forge-o2-b39)', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-abandoned-'));
  try {
    const B = path.join(out, 'phaseB');
    const frames = path.join(B, 'frames');
    const rowsDir = path.join(B, 'rows');
    fs.mkdirSync(frames, { recursive: true });
    fs.mkdirSync(rowsDir, { recursive: true });
    const K = 'atlas:d28:forge:o2:b39';
    const header = JSON.stringify({ type: 'header', v: 1, stateSize: 4, cand: { a: ['a'] } });
    const begin = JSON.stringify({ type: 'begin', v: 1, game: K, decision: 28, continuation: 'forge', option: 2, branch: 39, seat0: 'Drafter A', seat1: 'Drafter B' });
    const row = (ids: string): string => JSON.stringify({ type: 'row', v: 1, game: K, seat: 'Drafter B', kind: 'a', turn: 30, n: 1, chosen: 0, tokens: [`attack:${ids}`], s: [[0, 1]], c: [[1]] });
    const end = JSON.stringify({ type: 'end', v: 1, game: K, ok: false, winner: null });
    // the hung attempt's rows (id 250 was a card of that play alone), no end; the re-run's, to its end
    fs.writeFileSync(path.join(rowsDir, 'rows-1522578.jsonl'), [header, begin, row('77,250'), row('250')].join('\n') + '\n');
    fs.writeFileSync(path.join(rowsDir, 'rows-1522575.jsonl'), [header, begin, row('77'), end].join('\n') + '\n');
    const log = zlib.gzipSync([JSON.stringify({ v: 1, seq: 1, dir: 's2c', type: 'state', body: { players: [{ zones: { battlefield: [{ id: 77, name: 'X', zone: 'battlefield' }] } }] } })].join('\n'));
    for (const s of [0, 1]) fs.writeFileSync(path.join(frames, `d28-forge-o2-b39-seat${s}.jsonl.gz`), log);
    const said: string[] = [];
    writeAtlas(REPO, OPTS, out, {}, {}, (x) => said.push(x));
    type Doc = { checks: { problems: string[]; rows: number; gamesIdChecked: number; abandonedPlays: number; abandonedRows: number; abandoned: Array<{ game: string; file: string; rows: number }>; playedTwice: unknown[] } };
    const doc = JSON.parse(fs.readFileSync(path.join(out, 'atlas.json'), 'utf8')) as Doc;
    assert.deepEqual(doc.checks.problems.filter((p) => /never shows it|ended ok:true/.test(p)), [], doc.checks.problems.join('\n'));
    assert.deepEqual([doc.checks.rows, doc.checks.gamesIdChecked, doc.checks.abandonedPlays, doc.checks.abandonedRows], [3, 1, 1, 2]);
    assert.deepEqual(doc.checks.abandoned, [{ game: K, file: 'rows-1522578.jsonl', rows: 2 }]);
    assert.deepEqual(doc.checks.playedTwice, []);
    assert.equal(said.filter((x) => x.includes('abandoned by a killed attempt')).length, 1, said.join('\n'));
    assert.ok(said.includes(`  atlas: 1 play abandoned by a killed attempt, its 2 rows left out (D499): ${K} in rows-1522578.jsonl`), said.join('\n'));
    const md = fs.readFileSync(path.join(out, 'atlas.md'), 'utf8');
    assert.equal(md.split('abandoned by a killed attempt').length - 1, 1, 'atlas.md says it once');
    assert.match(md, /1 play abandoned by a killed attempt, its 2 rows left out of the id check \(D499\)/);
    // the review's census shape: an ok:false end in the first file too -- two ok:false ends, one game ended twice the same way --
    // is no problem, each play checked on its own against the logs on disk, so the first play's 250 fails as J181's night read it
    fs.writeFileSync(path.join(rowsDir, 'rows-1522578.jsonl'), [header, begin, row('77,250'), row('250'), end].join('\n') + '\n');
    writeAtlas(REPO, OPTS, out, {}, {}, () => {});
    type Doc2 = Doc & { checks: { supersededPlays: number; orphanRows: number } };
    const twiceFalse = JSON.parse(fs.readFileSync(path.join(out, 'atlas.json'), 'utf8')) as Doc2;
    assert.deepEqual([twiceFalse.checks.abandonedPlays, twiceFalse.checks.playedTwice.length, twiceFalse.checks.supersededPlays, twiceFalse.checks.orphanRows], [0, 0, 0, 0]);
    assert.equal(twiceFalse.checks.problems.filter((p) => /names id 250/.test(p)).length, 2);
    // the control: two ok:true ends are a key played twice, a problem of its own
    const ok = JSON.stringify({ type: 'end', v: 1, game: K, ok: true, winner: 'A' });
    fs.writeFileSync(path.join(rowsDir, 'rows-1522578.jsonl'), [header, begin, row('77,250'), row('250'), ok].join('\n') + '\n');
    fs.writeFileSync(path.join(rowsDir, 'rows-1522575.jsonl'), [header, begin, row('77'), ok].join('\n') + '\n');
    writeAtlas(REPO, OPTS, out, {}, {}, () => {});
    const twice = JSON.parse(fs.readFileSync(path.join(out, 'atlas.json'), 'utf8')) as Doc2;
    assert.equal(twice.checks.playedTwice.length, 1);
    assert.ok(twice.checks.problems.some((p) => p.startsWith(`${K}: ended ok:true 2 times`)), twice.checks.problems.join('\n'));
    // and one ok:true beside one ok:false: the ok:false play is superseded, no problem, its 250 not read
    fs.writeFileSync(path.join(rowsDir, 'rows-1522578.jsonl'), [header, begin, row('77,250'), row('250'), end].join('\n') + '\n');
    const said2: string[] = [];
    writeAtlas(REPO, OPTS, out, {}, {}, (x) => said2.push(x));
    const sup = JSON.parse(fs.readFileSync(path.join(out, 'atlas.json'), 'utf8')) as Doc2;
    assert.deepEqual([sup.checks.playedTwice.length, sup.checks.supersededPlays, sup.checks.problems.filter((p) => /never shows it|ended ok:true/.test(p)).length], [0, 1, 0]);
    assert.ok(said2.some((x) => x.includes('superseded by an ok:true play')), said2.join('\n'));
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});
