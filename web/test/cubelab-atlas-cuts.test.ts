/*
 * mtg-table — web/test/cubelab-atlas-cuts.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * D480, the move atlas's cut design (the atlas review of 2026-10-24, design B), engine-free:
 *
 *  - --min-options: the spread over the decisions with k or more options, filled from the rest when too few, each pick's k
 *    and why recorded; with k = 1 exactly D451's spread;
 *  - D483: --min-options counts a decision's PLAYS (its options' distinct play identities, the token count for a listing
 *    written before D483), while the options branched stay every listed one by index; a listing with one play twice is named;
 *  - the screen's rule (a decision's mean value <= .04 or >= .96 at the screen) and the replacement: the next listed decision
 *    not yet branched, forward then back, those with k or more options first;
 *  - early stopping's rule: the paired bootstrap against the leader, option 0 and the leader never stopped;
 *  - the schedule: with every cut off, D451's units in D451's order and no event; with the cuts, stage by stage behind the
 *    checkpoint barrier, the later units carrying the options still running, the Forge map on the survivors only, a screened
 *    decision replaced; resumed from its events, it decides nothing again;
 *  - the schedule's plan guard (#207's review): schedule.jsonl starts with the plan it was made under and each deck file's
 *    sha256; a clean resume replays it and decides nothing again; another plan, or a deck edited in place, is refused with
 *    both hashes named; a schedule written before the header is replayed as it is;
 *  - the label's arithmetic: a stopped option's mean on its own branches, the paired bootstrap over the rows each option has;
 *    a spine with no Forge map (--branch-forge 0) reads complete / decided / settled on the random map and makes no agreement read;
 *  - THE REVIEW'S NUMBERS on its own data: fixtures/cubelab/atlas-cuts/primary-six.json.gz is the branch scores of J158's and
 *    J162's six primary spines, trimmed.  decisionAtlas reproduces the atlas's own regret interval at all 96 decisions; on the
 *    90 with 150 or more paired random branches, the screen settles 17 and early stopping stops 63 options (never option 0),
 *    and every one of the 13 confident labels is kept, none flips (the review: 13 of 13, 0 flips, 17 screened);
 *  - --checks-parallel: atlas.json's checks from the parallel run are the serial run's byte for byte, but the redaction's
 *    wall time -- id problems past the 200 cap and guardrail violations past the 50 named, split across slices;
 *  - the pool behind the barrier (a fake `java`, as cubelab-atlas-resume.test.ts): a decision's next units wait for its current
 *    ones, a worker the first stage did not need is started for the later stages (holdIdle), and the jobs carry the options;
 *  - D489, the futility stop: the rule at its checkpoint (option 0 leads, ties within the margin, trails); the control draw
 *    seeded and its share held over 1,000 decisions; a stopped decision's later units gone, its label partial and never
 *    complete, a control played on and marked; the counters; a resume deciding nothing again; the plan hash and plan.json's
 *    cuts changed by the rule and unchanged without it; and the rule replayed on the review's fixture.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

import {
  AtlasSchedule, checkCuts, CUTS_OFF, decisionCuts, dropAt, futileAt, futilityAt, futilityDraw, nextDecision, parseEarlyStop, parseFutility, pickDecisions, playCount, repeatedPlays, rowsUnderCut, screenMean, settledAt, stageEnds,
  type Cuts, type ScheduleEvent, type ScheduleLine,
} from '../../tools/cubelab/atlascuts.ts';
import { mergeGuardrails, slices, type GuardrailCheck } from '../../tools/cubelab/atlaschecks.ts';
import {
  decisionAtlas, guardrailCheck, openSchedule, runUnits, scheduleHeader, scheduleSummary, unitsOf, writeAtlas, writeAtlasChecked,
  type AtlasOptions, type BranchRow, type DecisionListing, type Unit, type UnitLine,
} from '../../tools/cubelab/atlas.ts';
import { spread } from '../../tools/cubelab/atlasmath.ts';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const listingOf = (ks: number[]): DecisionListing[] => ks.map((k, d) => ({ d, kind: 'p', turn: d + 1, tokens: Array.from({ length: k }, (_, o) => `cast:${o}`), labels: [] }));
const row = (d: number, c: 'random' | 'forge', o: number, i: number, score: number): BranchRow => ({ v: 1, d, kind: 'p', turn: 1, c, o, token: `cast:${o}`, label: '', i, seed: i,
  result: score === 1 ? 1 : score === 0 ? -1 : 0, score, capped: false, timedOut: false, turns: 9, steps: 9, ms: 1, bytes: 1, standIns: 0, error: null, forkProblems: [], key: `k${d}${c}${o}${i}` });

test('--min-options: the spread over decisions with k or more options, filled from the rest; k = 1 is D451\'s spread', () => {
  const all = listingOf([2, 3, 2, 5, 2, 2, 4, 2, 3, 2]);
  assert.deepEqual(pickDecisions(all, 4, 1).map((p) => p.d), spread(10, 4), 'k = 1: exactly spread over the listing');
  assert.ok(pickDecisions(all, 4, 1).every((p) => p.why === 'spread' && p.k === all[p.d]!.tokens.length));
  const k3 = pickDecisions(all, 3, 3);
  assert.deepEqual(k3.map((p) => p.d), [1, 6, 8], 'three of the four with 3+ options, spread');
  assert.ok(k3.every((p) => p.k >= 3 && p.why === 'spread'));
  const fill = pickDecisions(all, 6, 3);
  assert.deepEqual(fill.filter((p) => p.why === 'spread').map((p) => p.d), [1, 3, 6, 8], 'every one with 3+ options');
  assert.deepEqual(fill.filter((p) => p.why === 'fill').map((p) => p.d), [0, 9], 'and two of the rest, spread over them');
  assert.deepEqual(pickDecisions(all, 'all', 3).map((p) => p.d), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 'all is all');
});

test('D483: --min-options counts plays, not tokens or listed options; the options branched are still every listed one', () => {
  const ids = (xs: string[]): string[] => xs;
  // J166's shape: the Rider from exile listed twice (one play), a 2-way decision in the k >= 3 pool; and the Rider from the
  // hand, whose creature and Swift End share a token (cast:19) and are two plays
  const all: DecisionListing[] = [
    { d: 0, kind: 'p', turn: 3, tokens: ['cast:19', 'pass', 'cast:19'], labels: [], identities: ids(['Rider|Original|-', 'pass', 'Rider|Original|-']) },
    { d: 1, kind: 'p', turn: 4, tokens: ['cast:19', 'pass', 'cast:19'], labels: [], identities: ids(['Rider|Original|mp#7', 'pass', 'Rider|Original|mp#7']) },
    { d: 2, kind: 'p', turn: 5, tokens: ['cast:19', 'pass', 'cast:19'], labels: [], identities: ids(['Rider|Original|-', 'pass', 'Rider|Secondary|-']) },
    { d: 3, kind: 'p', turn: 6, tokens: ['pass', 'cast:4', 'cast:5'], labels: [] },   // before D483: no identities, the token count
  ];
  assert.deepEqual(all.map(playCount), [2, 2, 3, 3], 'two twins are one play; one token, two faces, two plays; an old listing counts tokens');
  const picks = pickDecisions(all, 2, 3);
  assert.deepEqual(picks.map((p) => p.d), [2, 3], 'the k >= 3 pool is the decisions with three plays');
  assert.ok(picks.every((p) => p.k === all[p.d]!.tokens.length), 'a pick\'s k is still its listed options, the indices branched');
  assert.deepEqual(pickDecisions(all, 3, 3).filter((p) => p.why === 'fill').map((p) => [p.d, p.k]), [[0, 3]], 'a 2-play fill keeps its 3 listed options');
  assert.equal(nextDecision(all, new Set([2]), 2, 3), 3, 'the replacement looks for 3+ plays first');
  assert.equal(nextDecision(all, new Set([2, 3]), 2, 3), 1, 'then the rest, back from it');
  assert.deepEqual(repeatedPlays(all), ['d0: Rider|Original|- at options 0, 2', 'd1: Rider|Original|mp#7 at options 0, 2'], 'each play listed twice is named');
  assert.deepEqual(repeatedPlays(listingOf([3, 2])), [], 'a listing before D483 names none');
});

test('the screen settles a near-decided decision; its replacement is the next listed one not yet branched, k or more options first', () => {
  assert.equal(settledAt(0.04), true);
  assert.equal(settledAt(0.96), true);
  assert.equal(settledAt(0.0401), false);
  assert.equal(settledAt(0.5), false);
  assert.equal(settledAt(null), false);
  assert.equal(screenMean([[1, 1, 0.5], [1, 1, 1]], 3), (1 + 1 + 0.75) / 3, 'the mean of the options\' means');
  assert.equal(screenMean([], 2), null);
  const all = listingOf([2, 3, 2, 5, 2, 2]);
  assert.equal(nextDecision(all, new Set([1, 3]), 1, 1), 2, 'forward first');
  assert.equal(nextDecision(all, new Set([1, 3, 4, 5]), 4, 1), 2, 'then back from it');
  assert.equal(nextDecision(all, new Set([0, 1]), 1, 3), 3, 'k or more options first');
  assert.equal(nextDecision(all, new Set([1, 3]), 1, 3), 2, 'then the rest');
  assert.equal(nextDecision(listingOf([2, 2]), new Set([0, 1]), 0, 1), null, 'nothing left');
});

test('early stopping: an option clearly below the leader stops; option 0 and the leader never do; a close one runs on', () => {
  // 40 paired rows: option 1 always wins, option 2 always loses, option 0 wins half, option 3 loses one branch of the 40
  const m = Array.from({ length: 40 }, (_, i) => [i % 2, 1, 0, i === 0 ? 0 : 1]);
  const x = dropAt(m, [0, 1, 2, 3], 500, 7);
  assert.equal(x.leader, 1);
  assert.deepEqual(x.dropped, [2], 'option 2 stops; option 0, worse than the leader, never does; option 3 is too close');
  assert.ok((x.low[0] ?? 0) > 0, 'option 0 would have stopped by the rule');
  assert.deepEqual(dropAt(m.map((r) => [r[0]!, r[2]!]), [0, 2], 500, 7).dropped, [2], 'columns are the running options, in order');
  assert.deepEqual(dropAt([[1, 0]], [0, 1], 500, 7).dropped, [], 'one row decides nothing');
  assert.deepEqual(parseEarlyStop('on'), [50, 100, 150]);
  assert.deepEqual(parseEarlyStop('4,8'), [4, 8]);
  assert.deepEqual(parseEarlyStop(undefined), []);
  assert.throws(() => parseEarlyStop('4,x'), /--early-stop/);
  assert.deepEqual(stageEnds({ earlyStop: [50, 100, 150], screen: 25, minOptions: 1 }, 200), [25, 50, 100, 150, 200]);
  assert.deepEqual(stageEnds(CUTS_OFF, 200), [200]);
  assert.throws(() => checkCuts({ earlyStop: [60], screen: 0, minOptions: 1 }, 200, 25), /multiple of --chunk/);
  assert.throws(() => checkCuts({ earlyStop: [50], screen: 0, minOptions: 1 }, 50, 25), /below --branch-random/);
  assert.throws(() => checkCuts({ earlyStop: [50], screen: 75, minOptions: 1 }, 200, 25), /before the first/);
  checkCuts({ earlyStop: [50, 100, 150], screen: 25, minOptions: 3 }, 200, 25);
});

const O = { branchRandom: 8, branchForge: 2, chunk: 2, decisions: 2 as number | 'all', boot: 300, seed: 451 };

test('with every cut off the schedule is D451\'s: the same units in the same order, and no event written', () => {
  const all = listingOf([2, 3, 2, 4, 2]);
  const written: ScheduleEvent[] = [];
  const s = new AtlasSchedule(all, { ...O, decisions: 3 }, CUTS_OFF, [], [], new Set(), (e) => written.push(e));
  const opts = { branchRandom: 8, branchForge: 2, chunk: 2 } as AtlasOptions;
  assert.deepEqual(s.initial, unitsOf(spread(5, 3), opts));
  assert.deepEqual(written, []);
  assert.deepEqual(s.unitDone(s.initial[0] as Unit), [], 'no barrier: a unit releases nothing');
  const done = new Set(['d0-random-0', 'd2-forge-0']);
  assert.deepEqual(new AtlasSchedule(all, { ...O, decisions: 3 }, CUTS_OFF, [], [], done).initial, unitsOf(spread(5, 3), opts).filter((u) => !done.has(`d${u.d}-${u.c}-${u.i0}`)), 'a resume skips the done units, as before');
});

/** Every row of decision `d`'s units, from a score rule. */
const play = (u: Unit, k: number, score: (o: number, i: number) => number): BranchRow[] => {
  const out: BranchRow[] = [];
  for (let i = u.i0; i < u.i1; i++) for (let o = 0; o < k; o++) if (!u.options || u.options.includes(o)) out.push(row(u.d, u.c, o, i, score(o, i)));
  return out;
};

test('the cut schedule: stage by stage behind the barrier, the options still running, the Forge map on the survivors, a screened decision replaced; a resume decides nothing again', () => {
  const all = listingOf([3, 2, 2]);
  const cuts: Cuts = { earlyStop: [4], screen: 2, minOptions: 1 };
  // d0: option 0 always wins, option 1 always loses (it stops at 4), option 2 wins every other branch; d2 is won whatever seat A
  // does (the screen settles it, d1 replaces it); d1 alternates
  const score = (d: number, o: number, i: number): number => (d === 2 ? 1 : d === 0 ? (o === 0 ? 1 : o === 1 ? 0 : i % 2) : (o + i) % 2);
  const written: ScheduleEvent[] = [];
  const s = new AtlasSchedule(all, O, cuts, [], [], new Set(), (e) => written.push(e));
  assert.deepEqual(s.picks.map((p) => p.d), [0, 2]);
  assert.deepEqual(s.initial, [{ d: 0, c: 'random', i0: 0, i1: 2 }, { d: 2, c: 'random', i0: 0, i1: 2 }], 'the first stage only: the screen comes first');
  const played: Unit[] = [];
  let queue = [...s.initial];
  const allRows: BranchRow[] = [];
  while (queue.length) {
    const u = queue.shift() as Unit;
    played.push(u);
    for (const r of play(u, all[u.d]!.tokens.length, (o, i) => score(u.d, o, i))) { s.addRow(r); allRows.push(r); }
    queue.push(...s.unitDone(u));
  }
  const ids = (us: Unit[]): string[] => us.map((u) => `d${u.d}-${u.c}-${u.i0}${u.options ? `:${u.options.join('')}` : ''}`);
  assert.deepEqual(ids(played), ['d0-random-0', 'd2-random-0', 'd0-random-2', 'd1-random-0', 'd0-random-4:02', 'd0-random-6:02', 'd0-forge-0:02', 'd1-random-2', 'd1-random-4', 'd1-random-6', 'd1-forge-0']);
  assert.deepEqual(written.map((e) => `${e.type} d${e.d}${e.type === 'screen' ? ` ${e.settled}` : e.type === 'stop' ? ` -${e.dropped.join('')}` : e.type === 'pick' && e.why === 'replaces' ? ` for d${e.replaces}` : ''}`),
    ['pick d0', 'pick d2', 'screen d0 false', 'screen d2 true', 'pick d1 for d2', 'stop d0 -1', 'screen d1 false', 'stop d1 -']);
  const cut = decisionCuts(written);
  assert.deepEqual(cut.get(0)?.stoppedAt, { 1: 4 });
  assert.deepEqual(cut.get(0)?.forgeOptions, [0, 2]);
  assert.equal(cut.get(2)?.screened, true);
  assert.equal(cut.get(1)?.why, 'replaces');
  // the label: option 1's mean on its own four branches; options 0 and 2 on all eight
  const a0 = decisionAtlas(all[0]!, allRows.filter((r) => r.d === 0), 300, 451, cut.get(0));
  assert.deepEqual(a0.options.map((x) => [x.random.n, x.random.mean, x.stoppedAt ?? null]), [[8, 1, null], [4, 0, 4], [8, 0.5, null]]);
  assert.deepEqual(a0.options.map((x) => x.forge.n), [2, 0, 2], 'the Forge map on the survivors only');
  assert.equal(a0.random.branches, 8, 'every branch index is a paired row: a stopped option\'s empty cell does not unpair it');
  assert.equal(a0.forgeOptions?.join(), '0,2');
  const a2 = decisionAtlas(all[2]!, allRows.filter((r) => r.d === 2), 300, 451, cut.get(2));
  assert.deepEqual([a2.screened, a2.settled, a2.complete, a2.random.branches, a2.screenMean], [true, true, false, 2, 1], 'a cheap label: settled by the screen, never complete');
  // the resume: half way through d1, the events and rows as written -- nothing decided again, the same units left
  const cutAt = played.findIndex((u) => u.d === 1 && u.i0 === 4);
  const doneIds = new Set(played.slice(0, cutAt).map((u) => `d${u.d}-${u.c}-${u.i0}`));
  const rowsSoFar = allRows.filter((r) => doneIds.has(`d${r.d}-${r.c}-${Math.floor(r.i / 2) * 2}`));
  const again: ScheduleEvent[] = [];
  const s2 = new AtlasSchedule(all, O, cuts, written.slice(0, written.findIndex((e) => e.type === 'stop' && e.d === 1)), rowsSoFar, doneIds, (e) => again.push(e));
  assert.deepEqual(ids(s2.initial), ['d0-random-4:02', 'd0-random-6:02', 'd0-forge-0:02', 'd1-random-4', 'd1-random-6', 'd1-forge-0'].filter((x) => !doneIds.has(x.split(':')[0]!)));
  assert.deepEqual(again.map((e) => e.type), ['stop'], 'the one checkpoint whose units were all done but not yet written is decided now; nothing else');
});

test('the schedule\'s plan guard: the header written once; a clean resume replays the events and decides nothing again; another plan or an edited deck is refused, naming both hashes', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cubelab-atlas-guard-'));
  try {
    const deckA = path.join(tmp, 'a.dck'), deckB = path.join(tmp, 'b.dck');
    fs.writeFileSync(deckA, '[metadata]\nName=A\n[Main]\n20 Mountain\n');
    fs.writeFileSync(deckB, '[metadata]\nName=B\n[Main]\n20 Island\n');
    const cuts: Cuts = { earlyStop: [4], screen: 2, minOptions: 1 };
    const o = { deckA, deckB, seed: 451, turnCap: 40, rollouts: 0, branchRandom: 8, branchForge: 2, decisions: 2, options: 8, chunk: 2, leakChecks: 0,
      branchTimeoutSec: 60, boot: 300, pair: null, unitTimeoutMin: 5, cuts } as AtlasOptions;
    const file = path.join(tmp, 'schedule.jsonl');
    const said: string[] = [];
    const say = (x: string): void => { said.push(x); };
    const lines = (): ScheduleLine[] => fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as ScheduleLine);
    const h = scheduleHeader(REPO, o);
    assert.match(h.planSha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(openSchedule(file, h, say), [], 'a new schedule: nothing to replay');
    assert.deepEqual(lines(), [h], 'the header is its first line');
    // a first run, stopped after five units -- every verdict written as phase B writes it, after the header
    const all = listingOf([3, 2, 2]);
    const so = { branchRandom: 8, branchForge: 2, chunk: 2, decisions: 2, boot: 300, seed: 451 };
    const score = (d: number, op: number, i: number): number => (d === 2 ? 1 : d === 0 ? (op === 0 ? 1 : op === 1 ? 0 : i % 2) : (op + i) % 2);
    const s = new AtlasSchedule(all, so, cuts, [], [], new Set(), (e) => fs.appendFileSync(file, `${JSON.stringify(e)}\n`));
    const queue = [...s.initial];
    const rows: BranchRow[] = [];
    const done = new Set<string>();
    for (let n = 0; n < 5; n++) {
      const u = queue.shift() as Unit;
      for (const r of play(u, all[u.d]!.tokens.length, (op, i) => score(u.d, op, i))) { s.addRow(r); rows.push(r); }
      done.add(`d${u.d}-${u.c}-${u.i0}`);
      queue.push(...s.unitDone(u));
    }
    const written = lines();
    assert.ok(written.slice(1).some((e) => e.type === 'stop'), 'the run got past a stop');
    // the clean resume: the same plan, the same decks -- the events replayed, no second header, nothing decided again
    const ev = openSchedule(file, scheduleHeader(REPO, o), say);
    assert.deepEqual(ev, written.slice(1));
    assert.equal(lines().length, written.length, 'the header is not written again');
    const again: ScheduleEvent[] = [];
    const s2 = new AtlasSchedule(all, so, cuts, ev, rows, done, (e) => again.push(e));
    assert.deepEqual(again, [], 'nothing decided again');
    const id = (u: Unit): string => `d${u.d}-${u.c}-${u.i0}:${u.options?.join('') ?? '*'}`;
    assert.deepEqual(s2.initial.map(id).sort(), queue.map(id).sort(), 'the units left are the first run\'s, with the options their stages had');
    // another plan: refused, both hashes named, and what differs
    const refused = (x: AtlasOptions, ...want: RegExp[]): void => assert.throws(() => openSchedule(file, scheduleHeader(REPO, x), say), (e: Error) => {
      for (const w of want) assert.match(e.message, w);
      return true;
    });
    const boot = scheduleHeader(REPO, { ...o, boot: 999 });
    refused({ ...o, boot: 999 }, new RegExp(`plan sha256 ${h.planSha256} on file, ${boot.planSha256} now`), /boot 300 -> 999/, /another --out/);
    refused({ ...o, branchRandom: 12 }, new RegExp(h.planSha256), /branchRandom 8 -> 12/);
    refused({ ...o, decisions: 'all' }, /decisions 2 -> "all"/);
    // a deck edited in place: the plan is the same, its bytes are not
    fs.appendFileSync(deckA, '1 Shock\n');
    const edited = scheduleHeader(REPO, o);
    assert.equal(edited.planSha256, h.planSha256);
    refused(o, new RegExp(`deck A's file sha256 ${h.deckSha256.deckA} on file, ${edited.deckSha256.deckA} now`));
    assert.equal(lines().length, written.length, 'a refusal writes nothing');
    // a schedule written before the header (#207's): replayed as it is, and said
    const legacy = path.join(tmp, 'legacy.jsonl');
    fs.writeFileSync(legacy, written.slice(1).map((e) => `${JSON.stringify(e)}\n`).join(''));
    assert.deepEqual(openSchedule(legacy, edited, say), written.slice(1));
    assert.ok(said.some((x) => /before its plan header/.test(x)), said.join('\n'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('a spine with no Forge map: complete, decided and settled on the random map, and no agreement read', () => {
  const all = listingOf([2]);
  const rows = Array.from({ length: 10 }, (_, i) => [row(0, 'random', 0, i, 1), row(0, 'random', 1, i, 1)]).flat();
  const withForge = decisionAtlas(all[0]!, rows, 200, 1);
  assert.equal(withForge.complete, false, 'a spine meant to have one: no Forge map is incomplete, as before');
  const without = decisionAtlas(all[0]!, rows, 200, 1, undefined, false);
  assert.deepEqual([without.complete, without.decided, without.settled, without.rho, without.sameBest, without.forge.regret], [true, true, true, null, null, null]);
});

/** The review's fixture: each spine's decisions as listings and branch rows (scores as written, before D478). */
interface FixDecision { d: number; kind: string; turn: number; k: number; random: string; forge: string; atlas: { complete: boolean; regret: number | null; regretLo: number | null } }
const FIX = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(REPO, 'fixtures/cubelab/atlas-cuts/primary-six.json.gz'))).toString('utf8')) as {
  spines: Array<{ spine: string; seed: number; branchRandom: number; branchForge: number; decisions: FixDecision[] }> };

function replayFixture(cuts: Cuts): { decisions: number; reproduced: number; n150: number; confident: number; kept: number; flips: number; screened: number; screenedConfident: number; stopped: number; o0Stopped: number; gamesSaved: number; futile: number; futileConfident: number } {
  const t = { decisions: 0, reproduced: 0, n150: 0, confident: 0, kept: 0, flips: 0, screened: 0, screenedConfident: 0, stopped: 0, o0Stopped: 0, gamesSaved: 0, futile: 0, futileConfident: 0 };
  let full = 0, kept = 0;
  for (const sp of FIX.spines) {
    // the branched decisions, as a listing of their own (the schedule replays each one's checkpoints on its own rows)
    const listing = sp.decisions.map((x, j) => ({ d: j, kind: x.kind, turn: x.turn, tokens: Array.from({ length: x.k }, (_, o) => `o${o}`), labels: [] }));
    const rows: BranchRow[] = [];
    sp.decisions.forEach((x, j) => {
      for (const [c, s, n] of [['random', x.random, sp.branchRandom], ['forge', x.forge, sp.branchForge]] as const) {
        for (let i = 0; i < n; i++) for (let o = 0; o < x.k; o++) {
          const ch = s[i * x.k + o];
          if (ch !== 'x') rows.push(row(j, c, o, i, ch === '1' ? 1 : ch === '0' ? 0 : 0.5));
        }
      }
    });
    const done = new Set<string>();
    for (let j = 0; j < listing.length; j++) for (const c of ['random', 'forge']) for (let i0 = 0; i0 < sp.branchRandom; i0 += 25) done.add(`d${j}-${c}-${i0}`);
    const sched = new AtlasSchedule(listing, { branchRandom: sp.branchRandom, branchForge: sp.branchForge, chunk: 25, decisions: 'all', boot: 1000, seed: sp.seed }, cuts, [], rows, done);
    const cutOf = decisionCuts(sched.allEvents());
    sp.decisions.forEach((x, j) => {
      t.decisions++;
      const mine = rows.filter((r) => r.d === j);
      const a = decisionAtlas(listing[j]!, mine, 1000, sp.seed + x.d * 7919);
      const conf = a.complete && (a.random.regretLo ?? 0) > 0;
      if (a.random.regretLo === x.atlas.regretLo && a.random.regret === x.atlas.regret && conf === (x.atlas.complete && (x.atlas.regretLo ?? 0) > 0)) t.reproduced++;
      if (a.random.branches < 150) return;   // the review's 90: 150 or more paired random branches
      t.n150++;
      const cut = cutOf.get(j);
      const under = rowsUnderCut(mine, cut, cuts.screen);
      full += mine.length; kept += under.length;
      if (conf) t.confident++;
      t.stopped += Object.keys(cut?.stoppedAt ?? {}).length;
      if (cut?.stoppedAt[0] !== undefined) t.o0Stopped++;
      if (cut?.screened) { t.screened++; if (conf) t.screenedConfident++; return; }
      if (cut?.futility?.stopped) { t.futile++; if (conf) t.futileConfident++; }   // D489
      const b = decisionAtlas(listing[j]!, under, 1000, sp.seed + x.d * 7919, cut);
      const conf2 = b.complete && (b.random.regretLo ?? 0) > 0;
      if (conf && conf2) t.kept++;
      if (conf !== conf2) t.flips++;
    });
  }
  t.gamesSaved = Math.round((1 - kept / full) * 1000) / 1000;
  return t;
}

test('the review\'s numbers on its own data: the atlas reproduced at 96 of 96; the screen and early stopping keep 13 of 13 confident labels, no flip', () => {
  const both = replayFixture({ earlyStop: [50, 100, 150], screen: 25, minOptions: 1 });
  assert.equal(both.decisions, 96);
  assert.equal(both.reproduced, 96, 'decisionAtlas gives the atlas\'s own regret, interval and confident flag at every decision');
  assert.equal(both.n150, 90, 'the review\'s 90 decisions');
  assert.equal(both.confident, 13);
  assert.deepEqual([both.kept, both.flips, both.screened, both.screenedConfident, both.o0Stopped], [13, 0, 17, 0, 0], 'review: 13 of 13 kept, 0 flips, 17 screened with none confident');
  assert.equal(both.stopped, 63);
  assert.ok(both.gamesSaved > 0.3, `branch games saved ${both.gamesSaved}`);
  const stop = replayFixture({ earlyStop: [50, 100, 150], screen: 0, minOptions: 1 });
  assert.deepEqual([stop.kept, stop.flips, stop.screened, stop.o0Stopped, stop.stopped], [13, 0, 0, 0, 76], 'early stopping alone: 76 options stopped, 13 of 13');
  const screen = replayFixture({ earlyStop: [], screen: 25, minOptions: 1 });
  assert.deepEqual([screen.kept, screen.flips, screen.screened, screen.screenedConfident], [13, 0, 17, 0], 'the screen alone: 17 settled, none confident');
});

test('the guardrails of slices put back together are one pass\'s: counts summed, the first 50 violations named in order', () => {
  const log = (n: number, bad: number): string => Array.from({ length: n }, (_, j) => JSON.stringify({ v: 1, seq: j, dir: 'ai', type: 'decision', body: { seat: 0, n: j, kind: 'priority', options: ['pass', 'land:9'], chosen: j < bad ? 'pass' : 'land:9' } })).join('\n');
  const texts = Array.from({ length: 12 }, (_, f) => [`d${f}-random-o0-b0-seat0.jsonl.gz`, log(9, f % 3 === 0 ? 7 : 2)] as const);
  const one: GuardrailCheck = { logs: 0, priority: 0, landOffered: 0, landTaken: 0, mulligans: 0, kept: 0, violations: [], violationCount: { G1: 0, G4: 0 }, counted: {} };
  for (const [w, t] of texts) guardrailCheck(t, w, one);
  for (const n of [1, 2, 3, 5, 12]) {
    const parts = slices(texts, n).map((sl) => { const g: GuardrailCheck = { logs: 0, priority: 0, landOffered: 0, landTaken: 0, mulligans: 0, kept: 0, violations: [], violationCount: { G1: 0, G4: 0 }, counted: {} }; for (const [w, t] of sl) guardrailCheck(t, w, g); return g; });
    assert.deepEqual(mergeGuardrails(parts), one, `${n} slices`);
  }
  assert.equal(one.violationCount?.G1, 4 * 7 + 8 * 2);
  assert.deepEqual(slices([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4, 5]]);
  assert.deepEqual(slices([], 3), [[]]);
});

test('--checks-parallel: atlas.json\'s checks are the serial run\'s, byte for byte, but the redaction\'s wall time', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-checks-'));
  try {
    const baseline = fs.readFileSync(path.join(REPO, 'fixtures/negative/redaction/baseline.jsonl'), 'utf8');
    const lines = baseline.split('\n').filter(Boolean);
    const put = (dir: string, name: string, text: string): void => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, name), zlib.gzipSync(text)); };
    const A = path.join(out, 'phaseA'), B = path.join(out, 'phaseB');
    const dec = (j: number, chosen: string): string => JSON.stringify({ v: 1, seq: 900 + j, dir: 'ai', type: 'decision', body: { seat: 0, n: j, kind: 'priority', options: ['pass', 'land:9'], chosen } });
    for (let g = 1; g <= 3; g++) put(path.join(A, 'frames'), `g${g}-seat0.jsonl.gz`, `${baseline}${dec(1, 'land:9')}\n`);
    // 230 branch logs: three redaction batches; random ones with G1 violations (96 in all: past the 50 named), a Forge one with a
    // pay-cap summary, one that leaks an opponent's card (fails the checker), one truncated
    for (let b = 0; b < 230; b++) {
      const c = b % 5 === 4 ? 'forge' : 'random';
      const extra = c === 'random' && b < 120 ? [dec(1, 'pass')] : c === 'forge' ? [JSON.stringify({ v: 1, seq: 999, dir: 'ai', type: 'decisions', body: { seat: 0, guardrails: { forgePayCap: 1 } } })] : [];
      put(path.join(B, 'frames'), `d1-${c}-o${b % 2}-b${b}-seat0.jsonl.gz`, `${[...lines, ...extra].join('\n')}\n`);
    }
    const st = JSON.parse(lines[2]!) as { body: { players: Array<{ id: number; zones: { hand: { count: number; cards: unknown[] } } }> } };
    const seat = (JSON.parse(lines[0]!) as { seat: number }).seat;
    const opp = st.body.players.find((p) => p.id !== seat)!;
    const mine = st.body.players.find((p) => p.id === seat)!;
    opp.zones.hand.cards = [{ ...(mine.zones.hand.cards.find((x) => (x as { name?: string }).name) as object), id: 9001, owner: opp.id, controller: opp.id }];
    opp.zones.hand.count = 1;
    put(path.join(B, 'frames'), 'd1-random-o0-b500-seat0.jsonl.gz', `${[lines[0], lines[1], JSON.stringify(st), ...lines.slice(3)].join('\n')}\n`);
    const full = zlib.gzipSync(baseline);
    fs.writeFileSync(path.join(B, 'frames', 'd1-random-o1-b501-seat0.jsonl.gz'), full.subarray(0, Math.floor(full.length / 2)));
    // rows: 60 branch games, each naming five ids its log never shows (300 problems: past the cap of 200), one reading the truncated log
    fs.mkdirSync(path.join(B, 'rows'), { recursive: true });
    const rl: string[] = [JSON.stringify({ type: 'header', v: 1, stateSize: 4, cand: { p: ['a'] } })];
    for (let b = 0; b < 60; b++) {
      const game = `atlas:d1:random:o${b % 2}:b${b}`;
      rl.push(JSON.stringify({ type: 'begin', game, decision: 1, continuation: b % 5 === 4 ? 'forge' : 'random', option: b % 2, branch: b, seat0: 'Drafter A', seat1: 'Drafter B' }));
      rl.push(JSON.stringify({ type: 'row', v: 1, game, seat: 'Drafter A', kind: 'p', turn: 3, n: 5, chosen: 0, tokens: [70001, 70002, 70003, 70004, 70005].map((x) => `cast:${x + b}`), s: [[0, 1]], c: [[1], [1], [1], [1], [1]] }));
    }
    rl.push(JSON.stringify({ type: 'begin', game: 'atlas:d1:random:o1:b501', decision: 1, continuation: 'random', option: 1, branch: 501, seat0: 'Drafter A', seat1: 'Drafter B' }));
    rl.push(JSON.stringify({ type: 'row', v: 1, game: 'atlas:d1:random:o1:b501', seat: 'Drafter A', kind: 'p', turn: 3, n: 1, chosen: 0, tokens: ['cast:5'], s: [[0, 1]], c: [[1]] }));
    fs.writeFileSync(path.join(B, 'rows', 'rows-w1.jsonl'), `${rl.join('\n')}\n`);
    const opts = { deckA: '/d/a.dck', deckB: '/d/b.dck', seed: 451, turnCap: 40, rollouts: 3, branchRandom: 8, branchForge: 2, decisions: 2, options: 8, chunk: 2, leakChecks: 0,
      branchTimeoutSec: 120, boot: 100, pair: null, unitTimeoutMin: 30 } as AtlasOptions;
    const checksOf = (): string => {
      const c = (JSON.parse(fs.readFileSync(path.join(out, 'atlas.json'), 'utf8')) as { checks: Record<string, unknown> }).checks;
      delete c.redactionMs;
      return JSON.stringify(c, null, 2);
    };
    const rc1 = writeAtlas(REPO, opts, out, {}, {}, () => {});
    const serial = checksOf();
    const said: string[] = [];
    const rc2 = await writeAtlasChecked(REPO, { ...opts, checksParallel: 3 }, out, {}, {}, (x) => said.push(x));
    assert.equal(checksOf(), serial, 'the parallel run\'s checks are the serial run\'s');
    assert.equal(rc2, rc1);
    assert.ok(said.some((x) => /the checks on 3 workers/.test(x)), said.join('\n'));
    const c = JSON.parse(serial) as { problems: string[]; frameLogs: number; frameLogsFailed: number; rows: number; guardrails: { violations: number; forgePayCap: number }; unreadableFrameLogs: unknown[]; idChecksSkipped: unknown[] };
    assert.equal(c.frameLogs, 234, 'three phase A logs and 231 branch logs sent (the truncated one is not)');
    // the leaking log fails, and so does every log the test appended a decision line or summary to (they break the checker's M55
    // sequence rules) -- 146 failing among 88 clean ones, over three batches: a mix, in the serial order
    assert.equal(c.frameLogsFailed, 3 + 96 + 46 + 1);
    assert.equal(c.guardrails.violations, 96, 'every G1 violation counted: the 96 random logs below b120 (phase A\'s took their land)');
    assert.equal(c.guardrails.forgePayCap, 46);
    assert.equal(c.unreadableFrameLogs.length, 1);
    assert.equal(c.idChecksSkipped.length, 1);
    assert.ok(c.problems.filter((p) => /never shows it/.test(p)).length === 200, 'the id problems stop at the cap, across the slices');
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

// ------------------------------------------------------------------
// The pool behind the barrier, with a fake worker
// ------------------------------------------------------------------

// A fake `java` (as cubelab-atlas-resume.test.ts's): it plays each job's branches over the job's options only, with seat A's
// result a rule of (decision, option, branch), and logs each job with its worker's pid.
const FAKE_JAVA = `#!/usr/bin/env node
const fs = require('node:fs');
const out = (o) => process.stdout.write('CUBELAB ' + JSON.stringify(o) + '\\n');
const rl = require('node:readline').createInterface({ input: process.stdin });
out({ type: 'ready' });
rl.on('line', (line) => {
  const j = JSON.parse(line);
  if (j.type === 'quit') process.exit(0);
  const a = j.atlas;
  fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify({ id: j.id, pid: process.pid, options: a.options || null }) + '\\n');
  const k = a.expect.length;
  const branches = [];
  for (let i = a.i0; i < a.i1; i++) for (let o = 0; o < k; o++) {
    if (a.options && !a.options.includes(o)) continue;
    const win = a.decision === 0 ? (o === 0 || (o === 2 && i % 2 === 1)) : (o + i) % 2 === 1;
    branches.push({ o, i, seed: i, result: win ? 1 : -1, capped: false, timedOut: false, turns: 9, steps: 99, ms: 5, bytes: 10, standIns: 0,
      key: 'atlas:d' + a.decision + ':' + a.continuation + ':o' + o + ':b' + i, error: null, forkProblems: [] });
  }
  setTimeout(() => {
    out({ type: 'match', id: j.id, forge: [], games: [{ n: 1, onPlay: 'A', onPlayVerified: 'A', winner: 'A', turns: 9, ms: 50, cpuMs: 60, timeout: false, reason: null, error: null,
      atlas: { decisions: [], branches, copiesRetained: 0 } }] });
  }, 300);
});
rl.on('close', () => process.exit(0));
`;

let dir = '';
const envWas: Record<string, string | undefined> = {};
before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cubelab-atlas-cuts-'));
  fs.mkdirSync(path.join(dir, 'bin'));
  fs.writeFileSync(path.join(dir, 'bin', 'java'), FAKE_JAVA, { mode: 0o755 });
  for (const k of ['PATH', 'LAB_CONTROL', 'FAKE_LOG']) envWas[k] = process.env[k];
  process.env.PATH = `${path.join(dir, 'bin')}:${envWas.PATH ?? ''}`;
  delete process.env.LAB_CONTROL;
});
after(() => {
  for (const [k, v] of Object.entries(envWas)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  fs.rmSync(dir, { recursive: true, force: true });
});

test('the pool behind the barrier: the next stage waits, a worker the first stage did not need starts for the later ones, the jobs carry the options', async () => {
  process.env.FAKE_LOG = path.join(dir, 'jobs.log');
  const all = listingOf([3]);
  const o = { deckA: '/d/a.dck', deckB: '/d/b.dck', seed: 451, turnCap: 40, rollouts: 0, branchRandom: 8, branchForge: 2, decisions: 1, options: 8, chunk: 2, leakChecks: 0,
    branchTimeoutSec: 60, boot: 300, pair: null, unitTimeoutMin: 5, cuts: { earlyStop: [4], screen: 2, minOptions: 1 } } as AtlasOptions;
  const events: ScheduleEvent[] = [];
  const sched = new AtlasSchedule(all, { branchRandom: 8, branchForge: 2, chunk: 2, decisions: 1, boot: 300, seed: 451 }, o.cuts as Cuts, [], [], new Set(), (e) => events.push(e));
  assert.equal(sched.initial.length, 1, 'one unit to start with, for two workers');
  const rows: BranchRow[] = [];
  const lines: UnitLine[] = [];
  const said: string[] = [];
  const r = await runUnits({ env: { cp: 'unused', homes: [path.join(dir, 'h0'), path.join(dir, 'h1')], repo: dir }, logDir: path.join(dir, 'logs'), o, out: dir, all, sched, priorRows: [],
    barriers: true, onBranch: (x) => rows.push(x), onUnit: (l) => lines.push(l), say: (x) => said.push(x) });
  const log = fs.readFileSync(process.env.FAKE_LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as { id: string; pid: number; options: number[] | null });
  assert.deepEqual(log.map((x) => x.id), ['d0-random-0', 'd0-random-2', ...log.slice(2).map((x) => x.id)], 'the screen\'s unit, then the next stage after it');
  assert.deepEqual(log.slice(2).map((x) => x.id).sort(), ['d0-forge-0', 'd0-random-4', 'd0-random-6']);
  assert.ok(log.slice(2).every((x) => JSON.stringify(x.options) === '[0,2]'), 'option 1 stopped at 4: every later job plays options 0 and 2');
  assert.equal(new Set(log.slice(2).map((x) => x.pid)).size, 2, 'the last stage ran on both workers (holdIdle started the one the first stage did not need)');
  assert.equal(r.units, 5);
  assert.ok(lines.every((l) => l.ok));
  assert.deepEqual(lines.filter((l) => l.options).map((l) => l.id).sort(), ['d0-forge-0', 'd0-random-4', 'd0-random-6']);
  assert.equal(rows.filter((x) => x.o === 1 && x.i >= 4).length, 0, 'no branch of the stopped option past its stop');
  assert.equal(rows.length, 3 * 4 + 2 * 4 + 2 * 2);
  assert.deepEqual(events.map((e) => e.type), ['pick', 'screen', 'stop']);
  assert.ok(!said.some((x) => /could not boot/.test(x)), said.join('\n'));
});

test('D489, the futility rule at its checkpoint: option 0 leads, ties within the margin, or trails; the flags and their checks', () => {
  // 20 paired rows over options 0, 1, 2: option 0 wins 12, option 1 wins 10, option 2 wins 4
  const m = Array.from({ length: 20 }, (_, i) => [i < 12 ? 1 : 0, i < 10 ? 1 : 0, i < 4 ? 1 : 0]);
  const lead = futileAt(m, [0, 1, 2], 0);
  assert.deepEqual(lead, { o0Mean: 0.6, best: 0, bestMean: 0.6, gap: 0, futile: true }, 'option 0 leads: futile');
  // option 1 ties option 0 exactly: futile at margin 0 (a best), and the best named is the first of the tie
  const tie = futileAt(m.map((r, i) => [r[0]!, i < 12 ? 1 : 0, r[2]!]), [0, 1, 2], 0);
  assert.deepEqual([tie.futile, tie.gap, tie.best], [true, 0, 0], 'an exact tie is futile at margin 0');
  // option 1 ahead by one branch in 20 (.05): futile only with a margin of .05 or more
  const near = m.map((r, i) => [r[0]!, i < 13 ? 1 : 0, r[2]!]);
  assert.deepEqual([futileAt(near, [0, 1, 2], 0).futile, futileAt(near, [0, 1, 2], 0).gap, futileAt(near, [0, 1, 2], 0).best], [false, 0.05, 1], 'trails by .05: not futile at 0');
  assert.equal(futileAt(near, [0, 1, 2], 0.02).futile, false, 'nor within .02');
  assert.equal(futileAt(near, [0, 1, 2], 0.05).futile, true, 'within a .05 margin it is (the float gap compared with a tolerance)');
  // option 2 far ahead: not futile at any review margin
  const trail = m.map((r) => [r[0]!, r[1]!, 1]);
  assert.deepEqual([futileAt(trail, [0, 1, 2], 0.04).futile, futileAt(trail, [0, 1, 2], 0.04).gap], [false, 0.4]);
  // the columns are the running options in order; option 0 is found wherever it sits; no row is no evidence
  assert.equal(futileAt(m.map((r) => [r[1]!, r[0]!]), [1, 0], 0).futile, true);
  assert.deepEqual(futileAt([], [0, 1], 0), { o0Mean: null, best: null, bestMean: null, gap: null, futile: false });
  // the flags
  assert.equal(parseFutility(undefined, undefined, undefined), undefined);
  assert.equal(parseFutility('off', undefined, undefined), undefined);
  assert.deepEqual(parseFutility('0', undefined, undefined), { at: 0, tie: 0, sample: 0.1 }, 'the defaults: o0 best or tied, one in ten a control');
  assert.deepEqual(parseFutility('1', '0.02', '0.25'), { at: 1, tie: 0.02, sample: 0.25 });
  assert.throws(() => parseFutility('on', undefined, undefined), /checkpoint index/);
  assert.throws(() => parseFutility('-1', undefined, undefined), /checkpoint index/);
  assert.throws(() => parseFutility('0', undefined, '1.5'), /--futility-sample wants a number from 0 to 1/);
  assert.throws(() => parseFutility(undefined, '0.02', undefined), /need --futility/);
  const on: Cuts = { earlyStop: [50, 100, 150], screen: 25, minOptions: 3, futility: { at: 0, tie: 0, sample: 0.1 } };
  checkCuts(on, 200, 25);
  assert.equal(futilityAt(on), 50, 'index 0 is early stopping\'s first checkpoint');
  assert.equal(futilityAt({ ...on, futility: { at: 2, tie: 0, sample: 0.1 } }), 150);
  assert.equal(futilityAt({ ...on, futility: undefined }), null);
  assert.deepEqual(stageEnds(on, 200), [25, 50, 100, 150, 200], 'the rule adds no checkpoint of its own');
  assert.throws(() => checkCuts({ ...on, futility: { at: 3, tie: 0, sample: 0.1 } }, 200, 25), /names no --early-stop checkpoint/);
  assert.throws(() => checkCuts({ earlyStop: [], screen: 0, minOptions: 1, futility: { at: 0, tie: 0, sample: 0.1 } }, 200, 25), /early stopping is off/);
});

test('D489, the control draw: seeded per decision and checkpoint, and its share holds over 1,000 decisions', () => {
  assert.equal(futilityDraw(2106, 7, 50), futilityDraw(2106, 7, 50), 'the same seed, decision and checkpoint: the same draw');
  assert.notEqual(futilityDraw(2106, 7, 50), futilityDraw(2106, 8, 50));
  assert.notEqual(futilityDraw(2106, 7, 50), futilityDraw(2107, 7, 50));
  for (const share of [0.1, 0.25, 0.5]) {
    for (const seed of [1, 2106, 900000005]) {
      const n = Array.from({ length: 1000 }, (_, d) => futilityDraw(seed, d, 50)).filter((x) => x < share).length;
      // binomial(1000, share): 4 standard deviations either side
      const sd = Math.sqrt(1000 * share * (1 - share));
      assert.ok(Math.abs(n - 1000 * share) < 4 * sd, `share ${share}, seed ${seed}: ${n} of 1,000 drawn as controls`);
    }
  }
  const all = Array.from({ length: 1000 }, (_, d) => futilityDraw(2106, d, 50));
  assert.ok(all.every((x) => x >= 0 && x < 1));
});

test('D489, the futility stop in the schedule: a stopped decision\'s later units vanish and its label is partial; a control plays on; the counters; a resume decides nothing again', () => {
  const all = listingOf([3, 3, 3]);
  // d0: option 0 always wins (futile at 4); d1: option 2 always wins, option 0 never (runs on); d2: option 0 wins every other
  // branch, the others never (futile)
  const score = (d: number, o: number, i: number): number => (d === 0 ? (o === 0 ? 1 : i % 2) : d === 1 ? (o === 2 ? 1 : 0) : o === 0 ? i % 2 : 0);
  const cuts: Cuts = { earlyStop: [4], screen: 0, minOptions: 1, futility: { at: 0, tie: 0, sample: 0 } };
  const so = { ...O, decisions: 3 as number | 'all' };
  const run = (c: Cuts): { played: Unit[]; written: ScheduleEvent[]; rows: BranchRow[]; s: AtlasSchedule } => {
    const written: ScheduleEvent[] = [];
    const s = new AtlasSchedule(all, so, c, [], [], new Set(), (e) => written.push(e));
    const played: Unit[] = [];
    const rows: BranchRow[] = [];
    const queue = [...s.initial];
    while (queue.length) {
      const u = queue.shift() as Unit;
      played.push(u);
      for (const r of play(u, 3, (o, i) => score(u.d, o, i))) { s.addRow(r); rows.push(r); }
      queue.push(...s.unitDone(u));
    }
    return { played, written, rows, s };
  };
  const ids = (us: Unit[]): string[] => us.map((u) => `d${u.d}-${u.c}-${u.i0}${u.options ? `:${u.options.join('')}` : ''}`);
  const x = run(cuts);
  assert.deepEqual(ids(x.played).filter((u) => u.startsWith('d0') || u.startsWith('d2')), ['d0-random-0', 'd0-random-2', 'd2-random-0', 'd2-random-2'], 'd0 and d2 stop at 4: no later random unit and no Forge map');
  assert.ok(ids(x.played).some((u) => u.startsWith('d1-random-6')) && ids(x.played).some((u) => u.startsWith('d1-forge')), 'd1 runs to the full n, Forge map included');
  const fe = x.written.filter((e) => e.type === 'futility') as Array<Extract<ScheduleEvent, { type: 'futility' }>>;
  assert.deepEqual(fe.map((e) => [e.d, e.at, e.futile, e.control, e.stopped, e.gap]), [[0, 4, true, false, true, 0], [1, 4, false, false, false, 1], [2, 4, true, false, true, 0]]);
  assert.deepEqual(x.written.filter((e) => e.type === 'stop').map((e) => e.d), [1], 'a stopped decision writes no early-stop line; the one that runs on does');
  const cut = decisionCuts(x.written);
  assert.deepEqual(rowsUnderCut(x.rows.filter((r) => r.d === 0), cut.get(0), 0), x.rows.filter((r) => r.d === 0), 'what was played is what the cut keeps');
  const a0 = decisionAtlas(all[0]!, x.rows.filter((r) => r.d === 0), 300, 451, cut.get(0));
  assert.deepEqual([a0.partial, a0.stoppedAt, a0.stopWhy, a0.complete, a0.settled, a0.random.branches, a0.futilityGap, a0.why], [true, 4, 'futile', false, false, 4, 0, 'spread'],
    'a partial label: its 4-branch numbers, never complete (so never confident), the pick\'s why kept');
  const a1 = decisionAtlas(all[1]!, x.rows.filter((r) => r.d === 1), 300, 451, cut.get(1));
  assert.deepEqual([a1.partial, a1.complete, a1.futilityGap, a1.futilityControl], [undefined, true, 1, undefined]);
  const ds = [0, 1, 2].map((d) => decisionAtlas(all[d]!, x.rows.filter((r) => r.d === d), 300, 451, cut.get(d)));
  const sum = scheduleSummary(x.written, ds, { branchRandom: 8, branchForge: 2, decisions: 3, cuts } as AtlasOptions);
  assert.deepEqual([sum.futileStopped, sum.futileControls, sum.futileBranchGamesSaved, sum.partialLabels, sum.labels], [2, 0, 2 * 3 * (8 - 4 + 2), 2, 1],
    'two stopped, no control; each would have played 4 more random branches and 2 Forge ones of 3 options');
  assert.deepEqual([sum.picked, sum.branchedInFull], [3, 1], 'a futile-stopped decision is picked, not branched in full');
  // with every would-stop decision a control (share 1): both play on to the full n, and say so
  const c = run({ ...cuts, futility: { at: 0, tie: 0, sample: 1 } });
  assert.ok(['d0-random-6', 'd2-random-6'].every((u) => ids(c.played).some((p) => p.startsWith(u))), 'the controls run to the full n');
  const cc = decisionCuts(c.written);
  const ctl = decisionAtlas(all[0]!, c.rows.filter((r) => r.d === 0), 300, 451, cc.get(0));
  assert.deepEqual([ctl.futilityControl, ctl.partial, ctl.complete, ctl.random.branches], [true, undefined, true, 8]);
  const csum = scheduleSummary(c.written, [0, 1, 2].map((d) => decisionAtlas(all[d]!, c.rows.filter((r) => r.d === d), 300, 451, cc.get(d))), { branchRandom: 8, branchForge: 2, decisions: 3, cuts } as AtlasOptions);
  assert.deepEqual([csum.futileStopped, csum.futileControls, csum.futileBranchGamesSaved, csum.branchedInFull], [0, 2, 0, 3], 'controls are branched in full');
  // with the rule off: no futility line, and every decision runs to the full n
  const off = run({ ...cuts, futility: undefined });
  assert.equal(off.written.filter((e) => e.type === 'futility').length, 0);
  assert.equal(off.played.filter((u) => u.c === 'forge').length, 3);
  assert.equal(scheduleSummary(off.written, [], { branchRandom: 8, branchForge: 2, decisions: 3, cuts: { ...cuts, futility: undefined } } as AtlasOptions).futileStopped, undefined, 'no counters with the rule off');
  // the resume, after d0's and d2's checkpoints were decided and part of d1's later stage was played: nothing decided again,
  // and neither stopped decision comes back
  const doneIds = new Set(x.played.slice(0, x.played.findIndex((u) => u.d === 1 && u.i0 === 6)).map((u) => `d${u.d}-${u.c}-${u.i0}`));
  const again: ScheduleEvent[] = [];
  const s2 = new AtlasSchedule(all, so, cuts, x.written, x.rows.filter((r) => doneIds.has(`d${r.d}-${r.c}-${Math.floor(r.i / 2) * 2}`)), doneIds, (e) => again.push(e));
  assert.deepEqual(again, [], 'nothing decided again');
  assert.ok(s2.initial.every((u) => u.d === 1), `only d1's units are left: ${ids(s2.initial).join(' ')}`);
  // a crash after d0's units were done but before its futility line: decided on resume, and its later units never released
  const s3w: ScheduleEvent[] = [];
  const firstStage = new Set(['d0-random-0', 'd0-random-2']);
  const s3 = new AtlasSchedule(all, so, cuts, x.written.filter((e) => e.type === 'pick'), x.rows.filter((r) => r.d === 0 && r.i < 4), firstStage, (e) => s3w.push(e));
  assert.deepEqual(s3w.map((e) => `${e.type} d${e.d}`), ['futility d0'], 'd0\'s checkpoint is decided now');
  assert.ok(!s3.initial.some((u) => u.d === 0), 'and d0 has nothing left to play');
});

test('D489: the futility stop changes the schedule\'s plan hash and plan.json\'s cuts; off, both are D480\'s; a resume under another --futility is refused', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cubelab-atlas-futility-'));
  try {
    const deckA = path.join(tmp, 'a.dck'), deckB = path.join(tmp, 'b.dck');
    fs.writeFileSync(deckA, '[metadata]\nName=A\n[Main]\n20 Mountain\n');
    fs.writeFileSync(deckB, '[metadata]\nName=B\n[Main]\n20 Island\n');
    const base: Cuts = { earlyStop: [4], screen: 2, minOptions: 1 };
    const o = { deckA, deckB, seed: 451, turnCap: 40, rollouts: 0, branchRandom: 8, branchForge: 2, decisions: 2, options: 8, chunk: 2, leakChecks: 0,
      branchTimeoutSec: 60, boot: 300, pair: null, unitTimeoutMin: 5, cuts: base } as AtlasOptions;
    const h0 = scheduleHeader(REPO, o);
    assert.deepEqual(h0.plan.cuts, { earlyStop: [4], screen: 2, minOptions: 1 }, 'off: the cuts are D480\'s, key for key, so a D480 schedule resumes');
    const hOn = scheduleHeader(REPO, { ...o, cuts: { ...base, futility: { at: 0, tie: 0, sample: 0.1 } } });
    assert.notEqual(hOn.planSha256, h0.planSha256);
    assert.deepEqual((hOn.plan.cuts as Cuts).futility, { at: 0, tie: 0, sample: 0.1 });
    const hTie = scheduleHeader(REPO, { ...o, cuts: { ...base, futility: { at: 0, tie: 0.02, sample: 0.1 } } });
    const hShare = scheduleHeader(REPO, { ...o, cuts: { ...base, futility: { at: 0, tie: 0, sample: 0.2 } } });
    assert.equal(new Set([h0.planSha256, hOn.planSha256, hTie.planSha256, hShare.planSha256]).size, 4, 'the margin and the share are in the hash too');
    const file = path.join(tmp, 'schedule.jsonl');
    openSchedule(file, hOn, () => {});
    assert.throws(() => openSchedule(file, h0, () => {}), /made under another plan.*cuts/);
    assert.throws(() => openSchedule(file, hTie, () => {}), /"tie":0\b.*"tie":0\.02/);
    assert.deepEqual(openSchedule(file, scheduleHeader(REPO, { ...o, cuts: { ...base, futility: { at: 0, tie: 0, sample: 0.1 } } }), () => {}), [], 'the same rule resumes');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('D489 on the review\'s fixture: the futility stop at 50 with the review\'s cuts -- what it stops, what it saves, the confident labels it keeps', () => {
  // the six primary spines of J158 and J162 (D480's fixture): the review's B cuts plus the futility stop at 50, controls off,
  // so the count is the rule's own; a stopped decision is never confident, so every label it costs is counted
  const cuts: Cuts = { earlyStop: [50, 100, 150], screen: 25, minOptions: 1 };
  const base = replayFixture(cuts);
  const fu = replayFixture({ ...cuts, futility: { at: 0, tie: 0, sample: 0 } });
  assert.equal(fu.decisions, 96);
  assert.equal(base.kept, 13);
  assert.ok(fu.futile > 0, `the rule stopped ${fu.futile} of the 90`);
  assert.ok(fu.gamesSaved > base.gamesSaved, `branch games saved ${base.gamesSaved} -> ${fu.gamesSaved}`);
  assert.equal(fu.futileConfident, 13 - fu.kept, 'every confident label lost is a stopped one');
  assert.deepEqual([fu.futile, fu.futileConfident, fu.kept, fu.flips - fu.futileConfident], [FIXTURE_FUTILE.stopped, FIXTURE_FUTILE.lost, 13 - FIXTURE_FUTILE.lost, 0],
    `the rule on the fixture: ${fu.futile} stopped, ${fu.futileConfident} confident lost, saved ${fu.gamesSaved}`);
  assert.deepEqual([base.gamesSaved, fu.gamesSaved], [FIXTURE_FUTILE.savedBase, FIXTURE_FUTILE.saved], 'the share of the 90\'s branch rows not played: B\'s cuts, then with the rule');
});

/** D489's numbers on D480's fixture (the six primary spines of J158 and J162; written in D489's evidence). */
const FIXTURE_FUTILE = { stopped: 37, lost: 1, savedBase: 0.324, saved: 0.555 } as const;
