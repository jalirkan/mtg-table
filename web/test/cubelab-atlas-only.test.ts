/*
 * mtg-table — web/test/cubelab-atlas-only.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * D524, the move atlas's `--only <file>`: phase B branched at GIVEN decisions with GIVEN options (J200's need: Forge's option 0
 * and the judges' pick, on the Forge map alone).  Engine-free:
 *
 *  - the list: parsed, checked and normalised (entries by d, options ascending), its sha256 stable; each malformed list refused;
 *  - the baseline's word on it (checkOnly): a d not listed, an option past the listing's count, tokens that are not the listing's
 *    -- each a line naming d and both token lists;
 *  - the schedule: the picks are the list's (`why: 'only'`, their options in the pick event), every unit carries its decision's
 *    options (all of them given, too), --branch-random 0 puts out the Forge map alone, a resume decides nothing again; the cuts
 *    beside it refused;
 *  - the plan hash: changed by the list, by another list, and unchanged without it (key for key D480's cuts);
 *  - the label: an option not played has n 0, each map's regret is over the given options, and with no random map a decision is
 *    complete on its Forge map with no agreement read and nothing divided by zero;
 *  - the command, through the real pool and a fake `java` (as cubelab-atlas-resume.test.ts): the jobs carry the options, the rows
 *    are exactly the given options' Forge branches, plan.json and the schedule's header carry the list; a baseline whose listing
 *    differs exits 4 with no unit played, no schedule, no atlas.json and baseline.json kept; every refusal exits 2 and writes
 *    nothing.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  AtlasSchedule, checkCuts, checkOnly, CUTS_OFF, decisionCuts, parseOnly,
  type Cuts, type ScheduleEvent, type ScheduleLine,
} from '../../tools/cubelab/atlascuts.ts';
import {
  atlasCommand, decisionAtlas, openSchedule, scheduleHeader,
  type AtlasOptions, type BranchRow, type DecisionAtlas, type DecisionListing, type Unit, type UnitLine,
} from '../../tools/cubelab/atlas.ts';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const listingOf = (ks: number[]): DecisionListing[] => ks.map((k, d) => ({ d, kind: 'p', turn: d + 1, tokens: Array.from({ length: k }, (_, o) => (o === 1 ? 'pass' : `cast:${o + 10}`)), labels: [] }));
const row = (d: number, c: 'random' | 'forge', o: number, i: number, score: number): BranchRow => ({ v: 1, d, kind: 'p', turn: 1, c, o, token: `cast:${o}`, label: '', i, seed: i,
  result: score === 1 ? 1 : score === 0 ? -1 : 0, score, capped: false, timedOut: false, turns: 9, steps: 9, ms: 1, bytes: 1, standIns: 0, error: null, forkProblems: [], key: `k${d}${c}${o}${i}` });
const O = { branchRandom: 4, branchForge: 4, chunk: 2, decisions: 'all' as const, boot: 200, seed: 451 };
const ids = (us: Unit[]): string[] => us.map((u) => `d${u.d}-${u.c}-${u.i0}${u.options ? `:${u.options.join('')}` : ''}`);

test('D524, the list: parsed, normalised and hashed; each malformed list refused', () => {
  const a = parseOnly(JSON.stringify([{ d: 7, options: [3, 0], tokens: ['cast:1', 'pass', 'cast:2', 'cast:3'] }, { d: 2, options: [0, 1] }]));
  assert.deepEqual(a.entries, [{ d: 2, options: [0, 1] }, { d: 7, options: [0, 3], tokens: ['cast:1', 'pass', 'cast:2', 'cast:3'] }], 'entries by d, options ascending');
  assert.match(a.sha256, /^[0-9a-f]{64}$/);
  const b = parseOnly(JSON.stringify([{ tokens: ['cast:1', 'pass', 'cast:2', 'cast:3'], options: [0, 3], d: 7 }, { options: [1, 0], d: 2 }]));
  assert.equal(b.sha256, a.sha256, 'the same list in another order and key order hashes the same');
  assert.notEqual(parseOnly(JSON.stringify([{ d: 2, options: [0, 2] }])).sha256, parseOnly(JSON.stringify([{ d: 2, options: [0, 1] }])).sha256);
  const refused: Array<[unknown, RegExp]> = [
    ['not json', /JSON array/],
    [{}, /non-empty JSON array/],
    [[], /non-empty JSON array/],
    [[5], /not an object/],
    [[{ d: -1, options: [0, 1] }], /d wants a whole number/],
    [[{ d: 1.5, options: [0, 1] }], /d wants a whole number/],
    [[{ d: 1, options: [0] }], /two or more/],
    [[{ d: 1, options: [0, 'a'] }], /two or more whole numbers/],
    [[{ d: 1, options: [0, 1, 1] }], /named twice/],
    [[{ d: 1, options: [1, 2] }], /option 0/],
    [[{ d: 1, options: [0, 2], tokens: ['pass', 'cast:1'] }], /option 2 is past the 2 token/],
    [[{ d: 1, options: [0, 1], tokens: ['pass', 3] }], /array of strings/],
    [[{ d: 1, options: [0, 1], pick: 1 }], /key\(s\) pick/],
    [[{ d: 1, options: [0, 1] }, { d: 1, options: [0, 2] }], /d1 twice/],
  ];
  for (const [x, re] of refused) assert.throws(() => parseOnly(typeof x === 'string' ? x : JSON.stringify(x)), re, JSON.stringify(x));
});

test('D524, the baseline\'s word on the list: a d not listed, an option past the count, other tokens -- each named with both lists', () => {
  const all = listingOf([2, 3, 4]);
  assert.deepEqual(checkOnly(parseOnly(JSON.stringify([{ d: 1, options: [0, 2], tokens: all[1]!.tokens }, { d: 2, options: [0, 3] }])), all), []);
  const bad = checkOnly(parseOnly(JSON.stringify([
    { d: 0, options: [0, 2] },
    { d: 1, options: [0, 2], tokens: ['cast:10', 'pass', 'cast:99'] },
    { d: 9, options: [0, 1], tokens: ['pass', 'cast:4'] },
  ])), all);
  assert.equal(bad.length, 3);
  assert.match(bad[0]!, /^d0: option\(s\) 2 past the 2 the baseline listed/);
  assert.equal(bad[1], 'd1: the baseline listed ["cast:10","pass","cast:12"], the list expected ["cast:10","pass","cast:99"]');
  assert.match(bad[2]!, /^d9: the baseline lists 3 decision\(s\) \(d0 to d2\); the list expected \["pass","cast:4"\]/);
});

test('D524, the schedule: the list\'s picks with their options, every unit carrying them, the Forge map alone at --branch-random 0; a resume decides nothing again', () => {
  const all = listingOf([3, 2, 4, 3]);
  const only = parseOnly(JSON.stringify([{ d: 2, options: [3, 0] }, { d: 0, options: [0, 1, 2] }]));
  const cuts: Cuts = { ...CUTS_OFF, only };
  const written: ScheduleEvent[] = [];
  const s = new AtlasSchedule(all, O, cuts, [], [], new Set(), (e) => written.push(e));
  assert.deepEqual(s.picks, [{ d: 0, k: 3, why: 'only', options: [0, 1, 2] }, { d: 2, k: 4, why: 'only', options: [0, 3] }]);
  assert.deepEqual(written, [{ v: 1, type: 'pick', d: 0, k: 3, why: 'only', options: [0, 1, 2] }, { v: 1, type: 'pick', d: 2, k: 4, why: 'only', options: [0, 3] }], 'the picks are written, with their options');
  assert.deepEqual(ids(s.initial), ['d0-random-0:012', 'd0-random-2:012', 'd0-forge-0:012', 'd0-forge-2:012', 'd2-random-0:03', 'd2-random-2:03', 'd2-forge-0:03', 'd2-forge-2:03'],
    'every unit carries its options, all of them given (d0) or not (d2)');
  assert.deepEqual(s.unitDone(s.initial[0] as Unit), [], 'no barrier: a unit releases nothing');
  const cut = decisionCuts(written);
  assert.deepEqual([cut.get(0)?.why, cut.get(0)?.only, cut.get(2)?.only], ['only', [0, 1, 2], [0, 3]]);
  // --branch-random 0: the Forge map alone
  const f = new AtlasSchedule(all, { ...O, branchRandom: 0 }, cuts, [], [], new Set());
  assert.deepEqual(ids(f.initial), ['d0-forge-0:012', 'd0-forge-2:012', 'd2-forge-0:03', 'd2-forge-2:03']);
  // a resume: the events replayed, the done units skipped, nothing decided again
  const again: ScheduleEvent[] = [];
  const r = new AtlasSchedule(all, { ...O, branchRandom: 0 }, cuts, written, [], new Set(['d0-forge-0', 'd2-forge-2']), (e) => again.push(e));
  assert.deepEqual(ids(r.initial), ['d0-forge-2:012', 'd2-forge-0:03']);
  assert.deepEqual(again, []);
  // without the list the schedule is what it was: D451's spread, every option, nothing written
  const none: ScheduleEvent[] = [];
  const plain = new AtlasSchedule(all, { ...O, decisions: 2 }, CUTS_OFF, [], [], new Set(), (e) => none.push(e));
  assert.ok(plain.picks.every((p) => p.why === 'spread' && p.options === undefined) && plain.initial.every((u) => u.options === undefined));
  assert.deepEqual(none, []);
  // the cuts beside it are refused
  for (const c of [{ earlyStop: [2] }, { screen: 2 }, { minOptions: 3 }, { earlyStop: [2], futility: { at: 0, tie: 0, sample: 0.1 } }] as Array<Partial<Cuts>>) {
    assert.throws(() => checkCuts({ ...CUTS_OFF, ...c, only }, 4, 2), /--only does not combine/);
  }
  checkCuts({ ...CUTS_OFF, only }, 0, 2);
});

test('D524, the plan hash: changed by the list and by another list; without it, D480\'s cuts key for key; a resume under another list refused', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cubelab-atlas-only-hash-'));
  try {
    const deckA = path.join(tmp, 'a.dck'), deckB = path.join(tmp, 'b.dck');
    fs.writeFileSync(deckA, '[metadata]\nName=A\n[Main]\n20 Mountain\n');
    fs.writeFileSync(deckB, '[metadata]\nName=B\n[Main]\n20 Island\n');
    const o = { deckA, deckB, seed: 451, turnCap: 40, rollouts: 0, branchRandom: 0, branchForge: 40, decisions: 'all', options: 8, chunk: 5, leakChecks: 0,
      branchTimeoutSec: 120, boot: 1000, pair: null, unitTimeoutMin: 30, cuts: CUTS_OFF } as AtlasOptions;
    const h0 = scheduleHeader(REPO, o);
    assert.deepEqual(h0.plan.cuts, { earlyStop: [], screen: 0, minOptions: 1 }, 'off: the cuts are D480\'s, key for key');
    const l1 = parseOnly(JSON.stringify([{ d: 12, options: [0, 3] }]));
    const l2 = parseOnly(JSON.stringify([{ d: 12, options: [0, 2] }]));
    const h1 = scheduleHeader(REPO, { ...o, cuts: { ...CUTS_OFF, only: l1 } });
    const h2 = scheduleHeader(REPO, { ...o, cuts: { ...CUTS_OFF, only: l2 } });
    assert.deepEqual((h1.plan.cuts as Cuts).only, { entries: l1.entries, sha256: l1.sha256 });
    assert.equal(new Set([h0.planSha256, h1.planSha256, h2.planSha256]).size, 3);
    const file = path.join(tmp, 'schedule.jsonl');
    openSchedule(file, h1, () => {});
    assert.throws(() => openSchedule(file, h2, () => {}), /made under another plan.*cuts/);
    assert.deepEqual(openSchedule(file, scheduleHeader(REPO, { ...o, cuts: { ...CUTS_OFF, only: parseOnly(JSON.stringify([{ d: 12, options: [3, 0] }])) } }), () => {}), [], 'the same list resumes');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('D524, the label: an option not played has n 0; each map\'s regret over the given options; with no random map, complete on the Forge map', () => {
  const listing = listingOf([4])[0]!;
  const cut = decisionCuts([{ v: 1, type: 'pick', d: 0, k: 4, why: 'only', options: [0, 2] }]).get(0);
  // option 2 wins every Forge branch, option 0 every other one: Forge-map regret .5 against option 0, best option 2
  const forge = [0, 1, 2, 3].flatMap((i) => [row(0, 'forge', 0, i, i % 2), row(0, 'forge', 2, i, 1)]);
  const a = decisionAtlas(listing, forge, 300, 451, cut, true, false);
  assert.equal(a.complete, true, 'complete on the Forge map alone');
  assert.deepEqual(a.only, [0, 2]);
  assert.equal(a.why, 'only');
  assert.deepEqual(a.options.map((x) => [x.forge.n, x.random.n]), [[4, 0], [0, 0], [4, 0], [0, 0]], 'an option not played has n 0');
  assert.deepEqual([a.forge.branches, a.forge.regret, a.forge.best], [4, 0.5, 2]);
  assert.deepEqual([a.random.branches, a.random.regret, a.rho, a.sameBest], [0, null, null, null], 'no random map: nothing read, nothing divided by zero');
  assert.equal(a.decided, false);
  assert.ok(!JSON.stringify(a).includes('NaN') && !JSON.stringify(a).includes('Infinity'));
  // the random map too: each map over the two options, and the agreement over them
  const random = [0, 1, 2, 3, 4, 5].flatMap((i) => [row(0, 'random', 0, i, 0), row(0, 'random', 2, i, i < 4 ? 1 : 0)]);
  const b = decisionAtlas(listing, [...random, ...forge], 300, 451, cut, true, true);
  assert.equal(b.complete, true);
  assert.deepEqual([b.random.branches, b.random.best, b.forge.best, b.sameBest], [6, 2, 2, true]);
  assert.deepEqual(b.options.map((x) => x.random.n), [6, 0, 6, 0]);
  // a list of every option is not a restriction: the label reads as without the list
  const all4 = decisionCuts([{ v: 1, type: 'pick', d: 0, k: 4, why: 'only', options: [0, 1, 2, 3] }]).get(0);
  const rows4 = [0, 1].flatMap((i) => [0, 1, 2, 3].map((o) => row(0, 'forge', o, i, o === 3 ? 1 : 0)));
  const c = decisionAtlas(listing, rows4, 300, 451, all4, true, false);
  assert.equal(c.only, undefined);
  assert.deepEqual([c.forge.best, c.complete], [3, true]);
});

// ------------------------------------------------------------------
// The command, through the real pool and a fake `java`
// ------------------------------------------------------------------

// The fake worker plays every job's branches -- the job's `options`, or every listed one -- and logs each job's id and options
// to FAKE_LOG.  Option 0 loses and every other option wins on odd branches.
const FAKE_JAVA = `#!/usr/bin/env node
const fs = require('node:fs');
const out = (o) => process.stdout.write('CUBELAB ' + JSON.stringify(o) + '\\n');
const rl = require('node:readline').createInterface({ input: process.stdin });
out({ type: 'ready' });
rl.on('line', (line) => {
  const j = JSON.parse(line);
  if (j.type === 'quit') process.exit(0);
  const a = j.atlas;
  fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify({ id: j.id, options: a.options || null, expect: a.expect }) + '\\n');
  const opts = a.options || a.expect.map((_, o) => o);
  const branches = [];
  for (let i = a.i0; i < a.i1; i++) for (const o of opts) {
    branches.push({ o, i, seed: i, result: o === 0 ? -1 : (i % 2 ? 1 : -1), capped: false, timedOut: false, turns: 9, steps: 99, ms: 5, bytes: 10, standIns: 0,
      key: 'atlas:d' + a.decision + ':' + a.continuation + ':o' + o + ':b' + i, error: null, forkProblems: [] });
  }
  for (const b of branches) out({ type: 'progress', id: j.id, branch: b });
  const game = { n: 1, onPlay: 'A', onPlayVerified: 'A', winner: 'A', turns: 9, ms: 50, cpuMs: 60, timeout: false, reason: null, error: null,
    atlas: { decisions: [], branches, copiesRetained: 0 } };
  out({ type: 'match', id: j.id, forge: [], games: [game] });
});
rl.on('close', () => process.exit(0));
`;

let dir = '';
const envWas: Record<string, string | undefined> = {};
const BASELINE = listingOf([2, 4, 3]);

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cubelab-atlas-only-'));
  fs.mkdirSync(path.join(dir, 'bin'));
  fs.writeFileSync(path.join(dir, 'bin', 'java'), FAKE_JAVA, { mode: 0o755 });
  fs.writeFileSync(path.join(dir, 'a.dck'), '[metadata]\nName=A\n[Main]\n20 Mountain\n');
  fs.writeFileSync(path.join(dir, 'b.dck'), '[metadata]\nName=B\n[Main]\n20 Island\n');
  for (const k of ['PATH', 'LAB_CONTROL', 'LAB_DATA_DIR', 'FAKE_LOG', 'CUBELAB_CP', 'CUBELAB_HOMES']) envWas[k] = process.env[k];
  process.env.PATH = `${path.join(dir, 'bin')}:${envWas.PATH ?? ''}`;
  process.env.CUBELAB_CP = 'unused';
  process.env.CUBELAB_HOMES = path.join(dir, 'home0');
  delete process.env.LAB_CONTROL;      // the lab runner's control file would pause or cap the pool
  delete process.env.LAB_DATA_DIR;
});

after(() => {
  for (const [k, v] of Object.entries(envWas)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  fs.rmSync(dir, { recursive: true, force: true });
});

/** A spine folder whose baseline is already played (phase B then plays no baseline game), and an --only file. */
function spine(tag: string, list: unknown): { out: string; listFile: string; log: string } {
  const out = path.join(dir, tag);
  fs.mkdirSync(path.join(out, 'phaseB'), { recursive: true });
  fs.writeFileSync(path.join(out, 'phaseB', 'baseline.json'), `${JSON.stringify({ v: 1, seed: 7, winner: 'A', first: 'A', turns: 12, capped: false, ms: 1, decisions: BASELINE }, null, 2)}\n`);
  const listFile = path.join(dir, `${tag}.json`);
  fs.writeFileSync(listFile, `${JSON.stringify(list)}\n`);
  const log = path.join(dir, `${tag}.log`);
  process.env.FAKE_LOG = log;
  return { out, listFile, log };
}

const flagsOf = (out: string, extra: Array<[string, string]>): Map<string, string[]> => new Map<string, string[]>([
  ['deck-a', [path.join(dir, 'a.dck')]], ['deck-b', [path.join(dir, 'b.dck')]], ['seed', ['7']], ['phase', ['b']], ['branch-random', ['0']], ['branch-forge', ['4']],
  ['chunk', ['2']], ['leak-checks', ['0']], ['boot', ['50']], ['jobs', ['1']], ['out', [out]], ...extra.map(([k, v]) => [k, [v]] as [string, string[]]),
]);
const jsonl = <T>(f: string): T[] => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as T) : []);

test('D524, the command: the jobs carry the options; the rows are the given options\' Forge branches; plan.json and the schedule carry the list; a resume plays nothing', async () => {
  const { out, listFile, log } = spine('ok', [{ d: 1, options: [2, 0], tokens: BASELINE[1]!.tokens }]);
  const said: string[] = [];
  const rc = await atlasCommand(REPO, flagsOf(out, [['only', listFile]]), (s) => said.push(s));
  assert.equal(rc, 0, said.join('\n'));
  const jobs = jsonl<{ id: string; options: number[] | null; expect: string[] }>(log);
  assert.deepEqual(jobs.map((j) => [j.id, j.options]), [['d1-forge-0', [0, 2]], ['d1-forge-2', [0, 2]]], 'one decision, the Forge map alone, every job with the options');
  assert.ok(jobs.every((j) => JSON.stringify(j.expect) === JSON.stringify(BASELINE[1]!.tokens)), 'each unit checks the baseline\'s tokens at d (D511)');
  const B = path.join(out, 'phaseB');
  const rows = jsonl<BranchRow>(path.join(B, 'branches.jsonl'));
  assert.deepEqual(rows.map((r) => `${r.c}:o${r.o}:b${r.i}`).sort(), ['forge:o0:b0', 'forge:o0:b1', 'forge:o0:b2', 'forge:o0:b3', 'forge:o2:b0', 'forge:o2:b1', 'forge:o2:b2', 'forge:o2:b3']);
  const units = jsonl<UnitLine>(path.join(B, 'units.jsonl'));
  assert.ok(units.length === 2 && units.every((u) => u.ok && JSON.stringify(u.options) === '[0,2]'));
  const lines = jsonl<ScheduleLine>(path.join(B, 'schedule.jsonl'));
  const only = parseOnly(fs.readFileSync(listFile, 'utf8'));
  assert.equal(lines[0]?.type, 'plan');
  assert.deepEqual(((lines[0] as unknown as { plan: { cuts: Cuts } }).plan.cuts).only, { entries: only.entries, sha256: only.sha256 }, 'the schedule\'s header carries the list and its sha256');
  assert.deepEqual(lines.slice(1), [{ v: 1, type: 'pick', d: 1, k: 4, why: 'only', options: [0, 2] }]);
  const plan = JSON.parse(fs.readFileSync(path.join(out, 'plan.json'), 'utf8')) as { cuts: Cuts & { decision: string } };
  assert.deepEqual(plan.cuts.only, { entries: only.entries, sha256: only.sha256 });
  const doc = JSON.parse(fs.readFileSync(path.join(out, 'atlas.json'), 'utf8')) as { phaseB: { decisions: DecisionAtlas[]; randomMap?: boolean; agreement: { decisions: number; randomMap?: boolean } }; checks: { problems: string[] } };
  assert.deepEqual(doc.checks.problems, []);
  assert.equal(doc.phaseB.randomMap, false);
  assert.deepEqual([doc.phaseB.agreement.decisions, doc.phaseB.agreement.randomMap], [0, false]);
  const d1 = doc.phaseB.decisions[0]!;
  assert.deepEqual([doc.phaseB.decisions.length, d1.d, d1.complete, d1.why, d1.only], [1, 1, true, 'only', [0, 2]]);
  assert.deepEqual(d1.options.map((x) => x.forge.n), [4, 0, 4, 0]);
  assert.deepEqual([d1.forge.best, d1.forge.regret], [2, 0.5]);
  const md = fs.readFileSync(path.join(out, 'atlas.md'), 'utf8');
  assert.match(md, /no random map \(`--branch-random 0` with `--only`, D524\)/);
  assert.match(md, /given \(`--only`, D524; list sha256 [0-9a-f]{12}\): d1 at options 0, 2/);
  // the same command again: every unit done, nothing played, the same answer
  assert.equal(await atlasCommand(REPO, flagsOf(out, [['only', listFile]]), () => {}), 0);
  assert.equal(jsonl(log).length, 2, 'a resume plays nothing');
  // another list on the same folder: refused, as another plan
  const other = path.join(dir, 'ok-other.json');
  fs.writeFileSync(other, JSON.stringify([{ d: 1, options: [0, 3] }]));
  await assert.rejects(atlasCommand(REPO, flagsOf(out, [['only', other]]), () => {}), /holds another atlas \(cuts differ\)/);
});

test('D524, the drift: a baseline whose listing is not the list\'s exits 4 -- no unit, no schedule, no atlas.json, baseline.json kept', async () => {
  const cases: Array<[string, unknown, RegExp]> = [
    ['drift-tokens', [{ d: 1, options: [0, 2], tokens: ['cast:10', 'pass', 'cast:12', 'cast:99'] }], /d1: the baseline listed \["cast:10","pass","cast:12","cast:13"\], the list expected \["cast:10","pass","cast:12","cast:99"\]/],
    ['drift-past', [{ d: 5, options: [0, 1] }], /d5: the baseline lists 3 decision\(s\)/],
    ['drift-option', [{ d: 2, options: [0, 3] }], /d2: option\(s\) 3 past the 3/],
  ];
  for (const [tag, list, re] of cases) {
    const { out, listFile, log } = spine(tag, list);
    const before = fs.readFileSync(path.join(out, 'phaseB', 'baseline.json'), 'utf8');
    const said: string[] = [];
    const rc = await atlasCommand(REPO, flagsOf(out, [['only', listFile]]), (s) => said.push(s));
    assert.equal(rc, 4, `${tag}: ${said.join('\n')}`);
    assert.ok(said.some((s) => re.test(s)), `${tag}: ${said.join('\n')}`);
    assert.ok(said.some((s) => /no unit played \(exit 4\)/.test(s)));
    assert.equal(fs.existsSync(log), false, `${tag}: no job reached a worker`);
    for (const f of ['units.jsonl', 'branches.jsonl', 'schedule.jsonl']) assert.equal(fs.existsSync(path.join(out, 'phaseB', f)), false, `${tag}: ${f} written`);
    assert.equal(fs.existsSync(path.join(out, 'atlas.json')), false, `${tag}: atlas.json written`);
    assert.equal(fs.readFileSync(path.join(out, 'phaseB', 'baseline.json'), 'utf8'), before, `${tag}: baseline.json kept`);
  }
});

test('D524, the refusals: beside --decisions or a cut, a malformed or missing list, nothing to play -- each exits 2 and writes nothing', async () => {
  const good = path.join(dir, 'refuse-good.json');
  fs.writeFileSync(good, JSON.stringify([{ d: 1, options: [0, 2] }]));
  const bad = path.join(dir, 'refuse-bad.json');
  fs.writeFileSync(bad, JSON.stringify([{ d: 1, options: [1, 2] }]));
  const cases: Array<[Array<[string, string]>, RegExp]> = [
    [[['only', good], ['decisions', '3']], /does not combine with --decisions/],
    [[['only', good], ['decisions', 'all']], /does not combine with --decisions/],
    [[['only', good], ['screen', '25']], /does not combine with --screen/],
    [[['only', good], ['early-stop', 'on']], /does not combine with --early-stop/],
    [[['only', good], ['futility', '0']], /does not combine with --futility/],
    [[['only', good], ['min-options', '3']], /does not combine with --min-options/],
    [[['only', good], ['decisions', '3'], ['min-options', '2']], /--decisions, --min-options/],
    [[['only', bad]], /option 0/],
    [[['only', path.join(dir, 'no-such-list.json')]], /ENOENT/],
    [[['only', good], ['branch-forge', '0']], /nothing to play/],
  ];
  for (const [extra, re] of cases) {
    const out = path.join(dir, 'refused');
    const said: string[] = [];
    const rc = await atlasCommand(REPO, flagsOf(out, extra), (s) => said.push(s));
    assert.equal(rc, 2, `${JSON.stringify(extra)}: ${said.join('\n')}`);
    assert.ok(said.some((s) => re.test(s)), `${JSON.stringify(extra)}: ${said.join('\n')}`);
    assert.equal(fs.existsSync(out), false, `${JSON.stringify(extra)}: the folder was written`);
  }
  // the off values of the cuts are not a clash
  const { out, listFile } = spine('off-values', [{ d: 0, options: [0, 1] }]);
  assert.equal(await atlasCommand(REPO, flagsOf(out, [['only', listFile], ['screen', '0'], ['early-stop', 'off'], ['futility', 'off'], ['min-options', '1']]), () => {}), 0);
});
