// mtg-table — the cube lab: the MOVE ATLAS (D451).  Two decks, one seed; what each option of a decision
// is worth when the rest of the game is played at random, and when it is played by Forge.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   tools/cubelab.sh atlas (--deck-a <dck> --deck-b <dck> | --pair auto) --seed S --jobs K --out <dir>
//       [--turn-cap 40] [--rollouts 10000] [--branch-random 200] [--branch-forge 40] [--decisions all|N]
//       [--options 8] [--chunk 25] [--leak-checks 1] [--branch-timeout 120] [--unit-timeout 30] [--boot 1000]
//       [--ladder var/ai-ladder] [--pairs tools/ai-bench/pairs-confirm.txt] [--phase a|b|both|report]
//       [--branch-error-max 0.1]
//
// THE PAIR (--pair auto): the line of the pairs file with the most ladder games and the most even record,
// as one rule (atlasmath.ts rankPairs: the smallest |p - 1/2| + 1.96 sqrt(p(1-p)/n) over the decisive
// games of every ladder result on that line).  The confirm set is the ladder's held-out deck set (D318):
// the atlas only measures on it, and its rows are rows of reserved decks (D340: tools/ml/reserved.py drops
// any game whose deck is a deck-set deck), so none of it reaches a training set.
//
// PHASE A (--rollouts N): N games of deck A against deck B from the opening, BOTH seats the random seat
// (D451's guardrails; mtgtable.ai.Explorer), seed S x 1,000,000 + r, deck A on the play in every other
// game, a draw past --turn-cap.  Every game recorded: rows (both seats), the ledger, both frame logs.
// Report: A wins / B wins / draws by the cap, the game length, and the rollouts a +/- 2-point interval
// on A's score needs.
//
// PHASE B: the BASELINE game (seed S, Forge's Default on both seats, recorded like a census game) lists
// every decision of seat A with two or more options (p, a, b: the search's candidates, Forge's answer
// first); --decisions N picks N of them evenly spaced (default all).  At each, every option is played out
// --branch-random times with both seats the random seat and --branch-forge times with Forge on both,
// from a fork of the real position (mtgtable.ai.Atlas: a copy, the option forced, what seat A cannot see
// redealt from the multiset; branch i of every option on one seed).  A unit (one decision, one
// continuation, --chunk branches of every option) replays the baseline from its seed to the decision,
// checks the options are the baseline's, and plays its branches there.  A unit that has not answered in
// --unit-timeout minutes of monotonic time (D459) is killed as hung and recorded as not finished.  D465: every branch reaches
// branches.jsonl as it ends (the worker streams it); a unit left unfinished -- its worker retired after two OutOfMemoryErrors
// in a row, died or hung -- is played again at once from the branches it has no row for (`atlas.skip`), up to
// UNIT_ATTEMPTS_MAX attempts, each after the second only when the one before recorded a branch; a rerun of the command resumes
// an unfinished unit the same way, and units.jsonl gets one line per unit, when it is done.  Every branch recorded (rows,
// ledger, frame logs), its fork checked; --leak-checks per unit play a branch again after seat B's real
// hidden cards were dealt again (it must not move) and after seat A's own hand was (it must).
//
// OUTPUT: <out>/plan.json; <out>/phaseA/{games.jsonl, ledger.jsonl, rows/, frames/};
// <out>/phaseB/{baseline.json, baseline/, branches.jsonl, units.jsonl, ledger.jsonl, rows/, frames/};
// <out>/atlas.json (strict) and <out>/atlas.md.  Never summary.md or metrics.json.  Resumable: a game or
// unit already in its jsonl is not played again; a plan with other options is refused.
// After the games every rows file is checked (rowscheck.ts, ids against the seat's own frame log) and
// every frame log goes through tools/check-redaction.mjs (a branch's with --empty-hand-ok, D460); a problem is written into atlas.json's
// `checks` and exits 3.  D466: so is an option whose branch games errored more than --branch-error-max of the time (a fraction,
// 0.1 by default; each such option named with its error texts, every error counted by text in `checks.branchErrors`), and a
// frame log gunzip cannot read (a worker killed mid-branch leaves its logs truncated): it is left out of the checks and named.

import fs from 'node:fs';
import path from 'node:path';

import { engineEnv, runPool, type MatchJob, type MatchResult, type ProgressMsg, type RecordSpec } from './engine.ts';
import type { PlayExploreTag } from './playexplore.ts';
import { fileLines } from './lines.ts';
import { labPath, recipePath, shownPath } from './labdata.ts';
import { checkRowsDir, frameLogReader } from './rowscheck.ts';
import { redactionCheck, type Ledger } from './censusplay.ts';
import {
  agreement, gamesFor, meanInterval, pairLines, rankPairs, regretInterval, scoreOf, scoreStat, spread, variance,
  wilson, type LadderGame, type PairRow,
} from './atlasmath.ts';

export const CONTINUATIONS = ['random', 'forge'] as const;
export type Continuation = (typeof CONTINUATIONS)[number];

export interface AtlasOptions {
  deckA: string; deckB: string; seed: number; turnCap: number; rollouts: number; branchRandom: number; branchForge: number;
  decisions: number | 'all'; options: number; chunk: number; leakChecks: number; branchTimeoutSec: number; boot: number; pair: PairRow | null;
  /** D459: the pool's watchdog for one unit, in minutes of monotonic time (the job's `deadlineSec`). */
  unitTimeoutMin: number;
  /** D466: an option whose branch games errored more than this share of the time is a problem (default BRANCH_ERROR_MAX_DEFAULT). */
  branchErrorMax?: number;
}

/**
 * D466: the default --branch-error-max.  A branch that errors is left out of its option's mean, so past some share the
 * option's value is no longer the option's; J156's spine 458 lost every branch of six options from d5 on (6,480 of its
 * 16,990, "optional costs are not copied") and its atlas named none of them.  One in ten is far above the stray NPE (133
 * on 458, 23 on 460) and far below a play the fork cannot copy (all of them).
 */
export const BRANCH_ERROR_MAX_DEFAULT = 0.1;

/**
 * D459: the default --unit-timeout.  J148's 488 finished units took 115 s at the median, 358 s at the
 * 90th percentile, 777 s at the 99th and 976 s at most (d6's 150-branch random unit, under 3-7 workers
 * and swap); 30 minutes is nearly twice the longest, and a hung unit is let go in half an hour instead
 * of the 7,960 s the game timeout's formula gave it.
 */
export const UNIT_TIMEOUT_MIN_DEFAULT = 30;

export interface DecisionListing { d: number; kind: string; turn: number; tokens: string[]; labels: string[] }
export interface BranchRow {
  v: 1; d: number; kind: string; turn: number; c: Continuation; o: number; token: string; label: string; i: number; seed: number;
  result: number; score: number; capped: boolean; timedOut: boolean; turns: number; steps: number; ms: number; bytes: number;
  standIns: number; error: string | null; forkProblems: string[]; leakSame?: boolean; controlMoved?: boolean; key: string;
  /** D465: the branch threw a Java Error (an OutOfMemoryError above all): an engine error, never a result. */
  engineError?: boolean;
}
export interface RolloutRow { v: 1; g: number; seed: number; winner: 'A' | 'B' | 'draw' | null; first: string | null; turns: number | null; capped: boolean; reason: string | null; ms: number | null; error: string | null; engineError: string | null; guardrails?: Record<string, number>; rows?: unknown; bytes?: number }

const one = (f: Map<string, string[]>, k: string): string | undefined => f.get(k)?.at(-1);

/** D466: --branch-error-max, a share between 0 and 1. */
function fraction(v: string | undefined, d: number): number {
  if (v === undefined) return d;
  const x = Number(v);
  if (!Number.isFinite(x) || x < 0 || x > 1) throw new Error('atlas: --branch-error-max wants a share between 0 and 1 (0.1 = one branch game in ten)');
  return x;
}

/**
 * The atlas's worker heap when CUBELAB_WORKER_XMX is not set (every other command keeps 4096m).
 * Phase B keeps a worker alive over hundreds of branch games and G1 grows its heap to the cap: under
 * 4096m four workers sat at 3.6-4.7 GB RSS, so the lab runner, sizing from a declared 2.5-3 GB, put
 * 6-7 of them in a 21.4 GB budget and the kernel killed the atlas three times (J143, J146, J148).
 * Measured 2026-10-21: the selftest (--jobs 2) passes at 2048m (peak RSS 1.53 GB) and at 1536m (1.08
 * GB; post-GC heap at most 562 MB), but it is too short to fill anything; J148's own phase B workers,
 * 38 minutes in, held 0.9-1.1 GB of old generation (jstat).  1536m would leave 1.4x that, 2048m twice,
 * so 2048m: about 2.6 GB RSS a worker (the cap plus the ~0.5 GB off-heap 4096m showed), seven in the
 * budget.  A game that runs away (an AI pay loop) exhausts any cap and is an engine error either way.
 */
export const ATLAS_WORKER_XMX = '2048m';

/** The pair the rule chooses, from the ladder's results (every results/*.jsonl under `ladderDir`). */
export function autoPair(repo: string, ladderDir: string, pairsFile: string): { chosen: PairRow; table: PairRow[]; games: number } {
  const pairs = pairLines(fs.readFileSync(pairsFile, 'utf8'));
  const dir = path.join(ladderDir, 'results');
  if (!fs.existsSync(dir)) throw new Error(`atlas --pair auto: no ladder results under ${dir} (--ladder <dir>)`);
  const games: LadderGame[] = [];
  const set = shownPath(repo, pairsFile);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.jsonl'))) {
    for (const l of fileLines(path.join(dir, f), { complete: true })) {
      if (!l) continue;
      const r = JSON.parse(l) as LadderGame & { set?: string };
      games.push(r);
    }
  }
  const table = rankPairs(pairs, games, set);
  const chosen = table[0];
  if (!chosen || chosen.score === null) throw new Error(`atlas --pair auto: no ladder games on ${set}`);
  return { chosen, table, games: games.filter((g) => g.set === undefined || g.set === set).length };
}

function baseJob(o: AtlasOptions, id: string, seed: number, timeoutSec: number): MatchJob & Record<string, unknown> {
  return { id, seed, games: 1, gameTimeoutSec: timeoutSec, profileA: 'Default', profileB: 'Default', builder: 'lab',
    deckA: o.deckA, deckB: o.deckB, poolA: [], poolB: [], forgeDeckOutA: '', forgeDeckOutB: '', turnCap: o.turnCap };
}

const deckName = (f: string): string => path.basename(f, '.dck');

/**
 * The #161 review: an atlas game is random play, a forced option or a redealt hand -- never Forge's
 * own play, whatever its decks.  Every frame-log header (`lab.notForTraining`) and every rows `begin`
 * line of an atlas carries this, and every dataset builder skips a game that does
 * (tools/ml/reserved.py's not_for_training; distill.py for rows).
 */
export const ATLAS_NOT_FOR_TRAINING = 'D451 move atlas: random seats, forced options, redealt hidden cards';

function recordBlock(dir: string, name: string, run: string, o: AtlasOptions, extra: Record<string, unknown>): RecordSpec & Record<string, unknown> {
  return { dir, rel: path.basename(dir), run, cube: '', cubeFile: '', cubeSha: '', format: 'atlas', deckNameA: deckName(o.deckA), deckNameB: deckName(o.deckB), name, atlas: extra, notForTraining: ATLAS_NOT_FOR_TRAINING };
}

/** Phase A's job for rollout g (1-based). */
export function rolloutJob(repo: string, o: AtlasOptions, out: string, g: number): MatchJob & Record<string, unknown> {
  const seed = o.seed * 1_000_000 + g;
  const A = path.join(out, 'phaseA');
  return {
    ...baseJob(o, `a${g}`, seed, 1800),
    playExplore: { random: true, epsilon: 1, closeCall: 0, opening: false } as unknown as PlayExploreTag,   // D451: the random seat
    rows: { dir: path.join(A, 'rows'), key: `atlasA:${seed}`, begin: { source: 'atlas-a', g, seed, a: deckName(o.deckA), b: deckName(o.deckB), deckFileA: recipePath(repo, o.deckA), deckFileB: recipePath(repo, o.deckB), policyA: 'random', policyB: 'random', turnCap: o.turnCap, notForTraining: ATLAS_NOT_FOR_TRAINING } },
    ledger: true,
    record: recordBlock(path.join(A, 'frames'), `g${g}`, path.basename(out), o, { phase: 'A', seed, g }),
  };
}

/** Phase B's baseline job: Forge on both seats, the atlas seat's decisions listed, recorded. */
export function baselineJob(repo: string, o: AtlasOptions, out: string): MatchJob & Record<string, unknown> {
  const B = path.join(out, 'phaseB', 'baseline');
  return {
    ...baseJob(o, 'baseline', o.seed, 1800),
    atlas: { decision: -1, cands: o.options, run: path.basename(out), turnCap: o.turnCap, seed: o.seed },
    rows: { dir: path.join(B, 'rows'), key: `atlasB:${o.seed}`, begin: { source: 'atlas-baseline', seed: o.seed, a: deckName(o.deckA), b: deckName(o.deckB), deckFileA: recipePath(repo, o.deckA), deckFileB: recipePath(repo, o.deckB), policyA: 'plain', policyB: 'plain', turnCap: o.turnCap, notForTraining: ATLAS_NOT_FOR_TRAINING } },
    ledger: true,
    record: recordBlock(path.join(B, 'frames'), 'baseline', path.basename(out), o, { phase: 'B', seed: o.seed }),
  };
}

export interface Unit { d: number; c: Continuation; i0: number; i1: number }

/** The units of phase B: per decision and continuation, chunks of branches. */
export function unitsOf(decisions: number[], o: AtlasOptions): Unit[] {
  const out: Unit[] = [];
  for (const d of decisions) {
    for (const c of CONTINUATIONS) {
      const n = c === 'random' ? o.branchRandom : o.branchForge;
      for (let i0 = 0; i0 < n; i0 += o.chunk) out.push({ d, c, i0, i1: Math.min(n, i0 + o.chunk) });
    }
  }
  return out;
}

export const unitId = (u: Unit): string => `d${u.d}-${u.c}-${u.i0}`;

/** D465: a branch's key within its unit, as mtgtable.ai.Atlas.skipKey writes it. */
export const branchKey = (o: number, i: number): string => `o${o}:b${i}`;

/** D465: the most attempts at one unit in one run: the first, a second always, and more only while each records a branch. */
export const UNIT_ATTEMPTS_MAX = 4;

/**
 * D465: whether an unfinished unit is played again at once, from the branches it has no row for.  The second attempt always
 * runs (a worker that retired or died leaves a fresh one); a later one only when the attempt before it recorded at least one
 * branch, so a unit that dies at the same place every time is given up after two attempts, not retried forever.
 */
export function resumeUnit(attempts: number, newBranches: number, complete: boolean): boolean {
  if (complete || attempts >= UNIT_ATTEMPTS_MAX) return false;
  return attempts === 1 || newBranches > 0;
}

/** D465: the branch keys `rows` already holds for unit `u` (rows of other units ignored). */
export function doneBranches(rows: Array<Pick<BranchRow, 'd' | 'c' | 'o' | 'i'>>, u: Unit): Set<string> {
  const done = new Set<string>();
  for (const r of rows) if (r.d === u.d && r.c === u.c && r.i >= u.i0 && r.i < u.i1) done.add(branchKey(r.o, r.i));
  return done;
}

export function unitJob(o: AtlasOptions, out: string, u: Unit, listing: DecisionListing, skip: string[] = []): MatchJob & Record<string, unknown> {
  const B = path.join(out, 'phaseB');
  const k = listing.tokens.length;
  // the whole unit runs inside one game: the replay, then k x (i1 - i0) branches of up to --branch-timeout each
  const timeout = 1800 + k * (u.i1 - u.i0) * Math.max(60, o.branchTimeoutSec);
  return {
    ...baseJob(o, unitId(u), o.seed, timeout),
    deadlineSec: o.unitTimeoutMin * 60,
    atlas: {
      decision: u.d, continuation: u.c, i0: u.i0, i1: u.i1, seed: o.seed, expect: listing.tokens, cands: o.options, run: path.basename(out),
      turnCap: o.turnCap, branchTimeoutSec: o.branchTimeoutSec, rowsDir: path.join(B, 'rows'), framesDir: path.join(B, 'frames'),
      deckNameA: deckName(o.deckA), deckNameB: deckName(o.deckB), leakChecks: u.i0 === 0 ? o.leakChecks : 0,
      notForTraining: ATLAS_NOT_FOR_TRAINING,
      ...(skip.length ? { skip } : {}),
    },
  };
}

/** A branch as the worker writes it (the game row's atlas.branches, and D465's progress line). */
export type WorkerBranch = Omit<BranchRow, 'v' | 'd' | 'kind' | 'turn' | 'c' | 'token' | 'label' | 'score'> & { o: number; ledger?: Ledger };
interface AtlasGame { atlas?: { error?: string; decisions: DecisionListing[]; branches: WorkerBranch[]; copiesRetained?: number }; capped?: boolean; ledger?: Ledger; playExplore?: { guardrails?: Record<string, number> }; rows?: unknown }

function gameOf(r: MatchResult): (MatchResult['games'][number] & AtlasGame) | undefined {
  return r.games[0] as (MatchResult['games'][number] & AtlasGame) | undefined;
}

function readJsonl<T>(file: string): T[] {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file);
  const last = text.lastIndexOf(0x0a);
  if (last + 1 < text.length) fs.truncateSync(file, last + 1);   // a torn last line
  return [...fileLines(file, { complete: true })].filter(Boolean).map((l) => JSON.parse(l) as T);
}

export async function atlasCommand(repo: string, f: Map<string, string[]>, say: (s: string) => void): Promise<number> {
  const outArg = one(f, 'out');
  if (!outArg) throw new Error('atlas: --out <dir> is required');
  const out = labPath(repo, outArg, 'write');
  const int = (k: string, d: number, min = 0): number => {
    const v = Number(one(f, k) ?? d);
    if (!Number.isInteger(v) || v < min) throw new Error(`atlas: --${k} wants a whole number >= ${min}`);
    return v;
  };
  let pair: PairRow | null = null;
  let deckA = one(f, 'deck-a'), deckB = one(f, 'deck-b');
  let pairTable: PairRow[] = [];
  let ladderGames = 0;
  const planFile0 = path.join(out, 'plan.json');
  const prior = fs.existsSync(planFile0) ? JSON.parse(fs.readFileSync(planFile0, 'utf8')) as { deckA: string; deckB: string; pairRule: { chosen: PairRow; top: PairRow[]; ladderGames: number } | null } : null;
  if (one(f, 'pair') === 'auto' && prior?.pairRule) {
    // a resumed atlas keeps the pair its plan chose: the ladder keeps growing, and the rule read today may differ
    if (deckA || deckB) throw new Error('atlas: --pair auto chooses the decks; leave out --deck-a / --deck-b');
    pair = prior.pairRule.chosen; pairTable = prior.pairRule.top; ladderGames = prior.pairRule.ladderGames;
    deckA = prior.deckA; deckB = prior.deckB;
    say(`atlas: --pair auto: the plan's pair, line ${pair.pair} (${deckName(pair.deckA)} vs ${deckName(pair.deckB)}), chosen when the atlas began`);
  } else if (one(f, 'pair') === 'auto') {
    if (deckA || deckB) throw new Error('atlas: --pair auto chooses the decks; leave out --deck-a / --deck-b');
    const ap = autoPair(repo, labPath(repo, one(f, 'ladder') ?? 'var/ai-ladder', 'read'), path.resolve(repo, one(f, 'pairs') ?? 'tools/ai-bench/pairs-confirm.txt'));
    pair = ap.chosen; pairTable = ap.table.slice(0, 8); ladderGames = ap.games;
    deckA = pair.deckA; deckB = pair.deckB;
    say(`atlas: --pair auto chose line ${pair.pair} (${deckName(pair.deckA)} vs ${deckName(pair.deckB)}): ${pair.games} ladder games, deck A ${pair.aWins} of ${pair.decisive} decisive (${pair.p}), rule score ${pair.score}`);
  } else if (one(f, 'pair')) throw new Error('atlas: --pair takes auto');
  if (!deckA || !deckB) throw new Error('atlas: --deck-a and --deck-b, or --pair auto');
  const decisionsArg = one(f, 'decisions') ?? 'all';
  const o: AtlasOptions = {
    deckA: path.resolve(repo, deckA), deckB: path.resolve(repo, deckB), seed: int('seed', NaN), turnCap: int('turn-cap', 40, 1),
    rollouts: int('rollouts', 10000), branchRandom: int('branch-random', 200), branchForge: int('branch-forge', 40),
    decisions: decisionsArg === 'all' ? 'all' : int('decisions', 0, 1), options: int('options', 8, 2), chunk: int('chunk', 25, 1),
    leakChecks: int('leak-checks', 1), branchTimeoutSec: int('branch-timeout', 120, 10), boot: int('boot', 1000), pair,
    unitTimeoutMin: int('unit-timeout', UNIT_TIMEOUT_MIN_DEFAULT, 1),
    branchErrorMax: fraction(one(f, 'branch-error-max'), BRANCH_ERROR_MAX_DEFAULT),
  };
  for (const d of [o.deckA, o.deckB]) if (!fs.existsSync(d)) throw new Error(`atlas: no deck ${d}`);
  const phase = one(f, 'phase') ?? 'both';
  if (!['a', 'b', 'both', 'report'].includes(phase)) throw new Error('atlas: --phase a|b|both|report');
  const jobs = int('jobs', 1, 1);
  fs.mkdirSync(out, { recursive: true });
  const planFile = path.join(out, 'plan.json');
  const plan = { v: 1, decision: 'D451', deckA: shownPath(repo, o.deckA), deckB: shownPath(repo, o.deckB), seed: o.seed, turnCap: o.turnCap, options: o.options,
    rollouts: o.rollouts, branchRandom: o.branchRandom, branchForge: o.branchForge, decisions: o.decisions, chunk: o.chunk, branchTimeoutSec: o.branchTimeoutSec, unitTimeoutMin: o.unitTimeoutMin,
    branchErrorMax: o.branchErrorMax ?? BRANCH_ERROR_MAX_DEFAULT,
    pairRule: pair ? { rule: '|p - 1/2| + 1.96 sqrt(p (1 - p) / n) over the decisive ladder games of the line, smallest wins; ties more games, then the earlier line', chosen: pair, top: pairTable, ladderGames } : null };
  if (fs.existsSync(planFile)) {
    const was = JSON.parse(fs.readFileSync(planFile, 'utf8')) as Record<string, unknown>;
    const keys = ['deckA', 'deckB', 'seed', 'turnCap', 'options', 'chunk', 'branchTimeoutSec'] as const;
    const diff = keys.filter((k) => JSON.stringify(was[k]) !== JSON.stringify((plan as Record<string, unknown>)[k]));
    if (diff.length) throw new Error(`atlas: ${outArg} holds another atlas (${diff.join(', ')} differ); use another --out`);
  }
  fs.writeFileSync(planFile, `${JSON.stringify(plan, null, 2)}\n`);
  const t0 = Date.now();
  const timing: Record<string, unknown> = {};
  if (phase === 'a' || phase === 'both') timing.phaseA = await phaseA(repo, o, out, jobs, say);
  if (phase === 'b' || phase === 'both') timing.phaseB = await phaseB(repo, o, out, jobs, say);
  return writeAtlas(repo, o, out, plan, { ...timing, wallMs: Date.now() - t0, jobs }, say);
}

async function phaseA(repo: string, o: AtlasOptions, out: string, jobs: number, say: (s: string) => void): Promise<Record<string, unknown>> {
  const A = path.join(out, 'phaseA');
  fs.mkdirSync(A, { recursive: true });
  const gamesFile = path.join(A, 'games.jsonl');
  const done = new Set(readJsonl<RolloutRow>(gamesFile).map((r) => r.g));
  const todo = Array.from({ length: o.rollouts }, (_, r) => r + 1).filter((g) => !done.has(g));
  say(`atlas phase A: ${o.rollouts} rollout(s) from the opening, both seats random; ${done.size} done, ${todo.length} to play on ${Math.min(jobs, Math.max(1, todo.length))} worker(s)`);
  if (!todo.length) return { games: 0, ms: 0 };
  const env = engineEnv(repo, ATLAS_WORKER_XMX);
  const homes = env.homes.slice(0, Math.max(1, Math.min(jobs, todo.length)));
  const fd = fs.openSync(gamesFile, 'a');
  const lfd = fs.openSync(path.join(A, 'ledger.jsonl'), 'a');
  const t0 = Date.now();
  let n = 0, cpu = 0;
  try {
    await runPool({ ...env, homes }, todo.map((g) => rolloutJob(repo, o, out, g)), path.join(A, 'logs'), (job, r) => {
      const g = Number(job.id.slice(1));
      const x = gameOf(r);
      const row: RolloutRow = { v: 1, g, seed: job.seed, winner: x ? (x.winner as RolloutRow['winner']) : null, first: x?.onPlayVerified ?? null, turns: x?.turns ?? null,
        capped: !!x?.capped, reason: x?.reason ?? null, ms: x?.ms ?? null, error: x?.error ?? null, engineError: r.engineError ?? (x ? null : 'no game row'),
        guardrails: x?.playExplore?.guardrails, rows: x?.rows, bytes: x?.recorded?.bytes };
      if (x?.ledger) fs.writeSync(lfd, `${JSON.stringify({ v: 1, g, seed: job.seed, key: `atlasA:${job.seed}`, ledger: x.ledger })}\n`);
      fs.writeSync(fd, `${JSON.stringify(row)}\n`);
      cpu += x?.cpuMs ?? 0;
      n++;
      if (n % 50 === 0 || n === todo.length) say(`  [A ${n}/${todo.length}] ${((n / ((Date.now() - t0) / 3_600_000))).toFixed(0)} games/h`);
    }, say);
  } finally {
    fs.closeSync(fd);
    fs.closeSync(lfd);
  }
  return { games: n, ms: Date.now() - t0, workers: homes.length, cpuMs: cpu };
}

async function phaseB(repo: string, o: AtlasOptions, out: string, jobs: number, say: (s: string) => void): Promise<Record<string, unknown>> {
  const B = path.join(out, 'phaseB');
  fs.mkdirSync(B, { recursive: true });
  const env = engineEnv(repo, ATLAS_WORKER_XMX);
  const baseFile = path.join(B, 'baseline.json');
  const tb = Date.now();
  if (!fs.existsSync(baseFile)) {
    say('atlas phase B: the baseline game (Forge on both seats), listing seat A\'s decisions');
    let res: MatchResult | null = null;
    await runPool({ ...env, homes: env.homes.slice(0, 1) }, [baselineJob(repo, o, out)], path.join(B, 'logs'), (_j, r) => { res = r; }, say);
    const r = res as MatchResult | null;
    const x = r ? gameOf(r) : undefined;
    if (!r || r.engineError || !x?.atlas) throw new Error(`atlas: the baseline game failed (${r?.engineError ?? 'no atlas listing'})`);
    if (x.ledger) fs.writeFileSync(path.join(B, 'baseline', 'ledger.json'), `${JSON.stringify(x.ledger)}\n`);
    fs.writeFileSync(baseFile, `${JSON.stringify({ v: 1, seed: o.seed, winner: x.winner, first: x.onPlayVerified, turns: x.turns, capped: !!x.capped, ms: x.ms, decisions: x.atlas.decisions }, null, 2)}\n`);
  }
  const baseline = JSON.parse(fs.readFileSync(baseFile, 'utf8')) as { decisions: DecisionListing[]; winner: string; turns: number };
  const all = baseline.decisions;
  const picked = spread(all.length, o.decisions === 'all' ? all.length : o.decisions);
  say(`atlas phase B: the baseline (${baseline.turns} turns, winner ${baseline.winner}) lists ${all.length} decision(s) of seat A; branching at ${picked.length}: ${picked.map((d) => `d${d} (${all[d]?.kind}, turn ${all[d]?.turn}, ${all[d]?.tokens.length} options)`).join(', ')}`);
  const branchesFile = path.join(B, 'branches.jsonl');
  const unitsFile = path.join(B, 'units.jsonl');
  const doneUnits = new Set(readJsonl<{ id: string; ok: boolean }>(unitsFile).filter((u) => u.ok).map((u) => u.id));
  const units = unitsOf(picked, o).filter((u) => !doneUnits.has(unitId(u)));
  // D465: an unfinished unit's recorded branches (an earlier run's, or this run's streamed ones) are not played again
  const priorRows = readJsonl<BranchRow>(branchesFile);
  const states = new Map(units.map((u) => [unitId(u), newUnitState(u, doneBranches(priorRows, u))]));
  const resumed = units.filter((u) => (states.get(unitId(u))?.done.size ?? 0) > 0).length;
  say(`atlas phase B: ${units.length} unit(s) to play (${doneUnits.size} done${resumed ? `, ${resumed} resumed at the branches they lack` : ''}), chunks of ${o.chunk} branches, on ${Math.min(jobs, Math.max(1, units.length))} worker(s)`);
  if (!units.length) return { baselineMs: Date.now() - tb, units: 0, ms: 0 };
  const homes = env.homes.slice(0, Math.max(1, Math.min(jobs, units.length)));
  const fd = fs.openSync(branchesFile, 'a');
  const ufd = fs.openSync(unitsFile, 'a');
  const lfd = fs.openSync(path.join(B, 'ledger.jsonl'), 'a');
  const t0 = Date.now();
  let n = 0, branchGames = 0;
  const sink: UnitSink = {
    branch: (row, ledger) => {
      if (ledger) fs.writeSync(lfd, `${JSON.stringify({ v: 1, key: row.key, ledger })}\n`);
      fs.writeSync(fd, `${JSON.stringify(row)}\n`);
      branchGames++;
    },
    unit: (line) => {
      fs.writeSync(ufd, `${JSON.stringify(line)}\n`);
      n++;
      say(`  [B ${n}/${units.length}] ${line.id}: ${line.branches}/${line.expected} branch game(s)${line.attempts > 1 ? ` in ${line.attempts} attempts` : ''}${line.engineErrors ? `, ${line.engineErrors} engine error(s)` : ''}${line.error ? ` -- ${line.error}` : ''}; ${(branchGames / ((Date.now() - t0) / 3_600_000)).toFixed(0)} branch games/h`);
    },
    resume: (st, why) => {
      say(`  [B] ${unitId(st.u)}: ${st.done.size}/${st.expected} branch game(s) after attempt ${st.attempts - 1} (${why}); resuming at the ${st.expected - st.done.size} it lacks`);
      return unitJob(o, out, st.u, all[st.u.d] as DecisionListing, [...st.done]);
    },
  };
  for (const st of states.values()) st.expected = (all[st.u.d] as DecisionListing).tokens.length * (st.u.i1 - st.u.i0);
  // a unit whose every branch already has a row (its worker died after streaming the last) is done without a game
  for (const st of states.values()) {
    if (st.done.size < st.expected) continue;
    const u = st.u;
    sink.unit({ v: 1, id: unitId(u), d: u.d, c: u.c, i0: u.i0, i1: u.i1, ok: true, branches: st.done.size, expected: st.expected, error: null,
      ms: null, cpuMs: null, attempts: 0, engineErrors: priorRows.filter((r) => r.engineError && doneBranches([r], u).size).length });
  }
  const toPlay = units.filter((u) => { const st = states.get(unitId(u)) as UnitState; return st.done.size < st.expected; });
  try {
    await runPool({ ...env, homes }, toPlay.map((u) => unitJob(o, out, u, all[u.d] as DecisionListing, [...(states.get(unitId(u))?.done ?? [])])), path.join(B, 'logs'),
      (job, r) => unitResult(states.get(job.id) as UnitState, all, r, sink),
      say,
      { onProgress: (job, msg) => unitProgress(states.get(job.id) as UnitState, all, msg, sink) });
  } finally {
    fs.closeSync(fd);
    fs.closeSync(ufd);
    fs.closeSync(lfd);
  }
  return { baselineMs: t0 - tb, units: n, branchGames, ms: Date.now() - t0, workers: homes.length };
}

/** D465: one unit's progress over its attempts in this run. */
export interface UnitState {
  u: Unit;
  /** Branch keys with a row in branches.jsonl (earlier runs' included). */
  done: Set<string>;
  expected: number;
  attempts: number;
  /** Branches the current attempt recorded. */
  fresh: number;
  engineErrors: number;
  attemptErrors: string[];
  ms: number;
  cpuMs: number;
  copiesRetained: number | null;
}

export function newUnitState(u: Unit, done: Set<string>): UnitState {
  return { u, done, expected: 0, attempts: 1, fresh: 0, engineErrors: 0, attemptErrors: [], ms: 0, cpuMs: 0, copiesRetained: null };
}

/** D465: units.jsonl's line for a unit, written once, when it is done (or given up). */
export interface UnitLine {
  v: 1; id: string; d: number; c: Continuation; i0: number; i1: number; ok: boolean; branches: number; expected: number; error: string | null;
  ms: number | null; cpuMs: number | null; attempts: number; engineErrors: number; attemptErrors?: string[]; copiesRetained?: number;
}

/** D465: where phase B's results go (files in the command; arrays in the tests). */
export interface UnitSink {
  branch(row: BranchRow, ledger: Ledger | undefined): void;
  unit(line: UnitLine): void;
  resume(st: UnitState, why: string): MatchJob;
}

/** One worker branch as a branches.jsonl row, written unless the unit already holds it (streamed, then in the match line). */
function addBranch(st: UnitState, all: DecisionListing[], b: WorkerBranch, sink: UnitSink): void {
  const key = branchKey(b.o, b.i);
  if (st.done.has(key)) return;
  const u = st.u;
  const listing = all[u.d] as DecisionListing;
  const row: BranchRow = { v: 1, d: u.d, kind: listing.kind, turn: listing.turn, c: u.c, o: b.o, token: listing.tokens[b.o] ?? '?', label: listing.labels[b.o] ?? '?',
    i: b.i, seed: b.seed, result: b.result, score: scoreOf(b.result), capped: b.capped, timedOut: b.timedOut, turns: b.turns, steps: b.steps, ms: b.ms,
    bytes: b.bytes, standIns: b.standIns, error: b.error, forkProblems: b.forkProblems, key: b.key,
    ...(b.engineError ? { engineError: true } : {}),
    ...(b.leakSame !== undefined ? { leakSame: b.leakSame, controlMoved: b.controlMoved } : {}) };
  st.done.add(key);
  st.fresh++;
  if (b.engineError) st.engineErrors++;
  sink.branch(row, b.ledger);
}

/** D465: a branch the worker streamed as it ended. */
export function unitProgress(st: UnitState, all: DecisionListing[], msg: ProgressMsg, sink: UnitSink): void {
  const b = msg.branch as WorkerBranch | undefined;
  if (b && typeof b.o === 'number' && typeof b.i === 'number') addBranch(st, all, b, sink);
}

/** D465: a unit's answer: its branches written, then either a resume job (returned) or its units.jsonl line. */
export function unitResult(st: UnitState, all: DecisionListing[], r: MatchResult, sink: UnitSink): MatchJob[] {
  const x = gameOf(r);
  for (const b of x?.atlas?.branches ?? []) addBranch(st, all, b, sink);
  const err = r.engineError ?? x?.atlas?.error ?? (x?.atlas ? null : 'no atlas block');
  st.ms += x?.ms ?? 0;
  st.cpuMs += x?.cpuMs ?? 0;
  if (typeof x?.atlas?.copiesRetained === 'number') st.copiesRetained = Math.max(st.copiesRetained ?? 0, x.atlas.copiesRetained);
  const complete = st.done.size >= st.expected;
  const why = err ?? (r.retire ? `the worker retired: ${r.retire}` : null) ?? (x?.error ? `the game threw ${x.error}` : 'unfinished');
  if (resumeUnit(st.attempts, st.fresh, complete)) {
    st.attemptErrors.push(why);
    st.attempts++;
    st.fresh = 0;
    return [sink.resume(st, why)];
  }
  const u = st.u;
  sink.unit({ v: 1, id: unitId(u), d: u.d, c: u.c, i0: u.i0, i1: u.i1, ok: !err && complete, branches: st.done.size, expected: st.expected,
    error: complete ? err : err ?? why, ms: x ? st.ms : null, cpuMs: x ? st.cpuMs : null, attempts: st.attempts, engineErrors: st.engineErrors,
    ...(st.attemptErrors.length ? { attemptErrors: st.attemptErrors } : {}), ...(st.copiesRetained !== null ? { copiesRetained: st.copiesRetained } : {}) });
  return [];
}

// ------------------------------------------------------------------
// The guardrails, checked from the recordings
// ------------------------------------------------------------------

export interface GuardrailCheck { logs: number; priority: number; landOffered: number; landTaken: number; mulligans: number; kept: number;
  /** The first GUARDRAIL_VIOLATIONS_LISTED violations, named. */
  violations: string[];
  /** D466: every violation, G1's and G4's, however many the list leaves out. */
  violationCount?: { G1: number; G4: number };
  /** D458: the random seats' own guardrail counts, summed from each log's `decisions` summary (protocol M71): G3's `noRepeatNoOp`, G5's `refusedCast` and `noRepeatRefused`. */
  counted?: Record<string, number> }

/** How many guardrail violations a check names; D466: the count past it is still counted (`violationCount`). */
export const GUARDRAIL_VIOLATIONS_LISTED = 50;

/** D458: the guardrail counts every atlas reports, zero when no log counted one (G3; G5's refused picks and the removals after them). */
export const COUNTED_GUARDRAILS = ['noRepeatNoOp', 'refusedCast', 'noRepeatRefused'] as const;

/**
 * D451's guardrails, read back from a random seat's own frame log (its D347 decision records): G1, every
 * priority decision that offered a land (`land:<id>` among the legal options) was answered with a land;
 * G4, every opening-hand decision was `keep`.  (G2 is G1 itself, with no code of its own; G3 needs the engine's fingerprint and
 * is counted by the worker, `noRepeatNoOp`.)  D466: the decision record's land options and the seat's are one listing
 * (mtgtable.ai.Decisions.landPlays, the land drop checked), so a land offered is a land the seat could have played; the first
 * GUARDRAIL_VIOLATIONS_LISTED violations are named, and every one is counted (`violationCount`).  D458: the seat's own counts -- G3's and G5's, a play the engine refused to pay
 * for (`refusedCast`) and each later removal of it in that priority window (`noRepeatRefused`) -- are summed from the log's
 * `decisions` summary (`explore.guardrails`, protocol M71) into `counted`.  `where` names the log in a violation.
 */
export function guardrailCheck(text: string, where: string, out: GuardrailCheck): void {
  out.logs++;
  out.counted ??= {};
  const vc = (out.violationCount ??= { G1: 0, G4: 0 });
  for (const line of text.split('\n')) {
    if (line.includes('"type":"decisions"')) {
      let o: { body?: { explore?: { guardrails?: Record<string, unknown> } } };
      try { o = JSON.parse(line) as typeof o; } catch { continue; }
      for (const [k, v] of Object.entries(o.body?.explore?.guardrails ?? {})) if (typeof v === 'number') out.counted[k] = (out.counted[k] ?? 0) + v;
      continue;
    }
    if (!line.includes('"type":"decision"')) continue;
    let o: { body?: { kind?: string; options?: string[]; chosen?: string; n?: number } };
    try { o = JSON.parse(line) as typeof o; } catch { continue; }
    const b = o.body;
    if (!b) continue;
    if (b.kind === 'priority') {
      out.priority++;
      if ((b.options ?? []).some((t) => t.startsWith('land:'))) {
        out.landOffered++;
        if (String(b.chosen).startsWith('land:')) out.landTaken++;
        else {
          vc.G1++;
          if (out.violations.length < GUARDRAIL_VIOLATIONS_LISTED) out.violations.push(`${where}: decision ${String(b.n)} offered a land and played ${String(b.chosen)} (G1)`);
        }
      }
    } else if (b.kind === 'mulligan') {
      out.mulligans++;
      if (b.chosen === 'keep') out.kept++;
      else {
        vc.G4++;
        if (out.violations.length < GUARDRAIL_VIOLATIONS_LISTED) out.violations.push(`${where}: decision ${String(b.n)} took a mulligan (G4)`);
      }
    }
  }
}

// ------------------------------------------------------------------
// The report
// ------------------------------------------------------------------

/** Phase A's numbers from its rows. */
export function phaseAReport(rows: RolloutRow[]): Record<string, unknown> {
  const ok = rows.filter((r) => !r.engineError && !r.error);
  const scores = ok.map((r) => (r.winner === 'A' ? 1 : r.winner === 'B' ? 0 : 0.5));
  const st = scoreStat(scores);
  const turns = ok.map((r) => r.turns ?? 0).sort((a, b) => a - b);
  const q = (p: number): number | null => (turns.length ? turns[Math.min(turns.length - 1, Math.floor(p * (turns.length - 1) + 0.5))] as number : null);
  const v = variance(scores);
  const half = st.n ? (st.hi !== null && st.lo !== null ? Math.round(((st.hi - st.lo) / 2) * 1e4) / 1e4 : null) : null;
  const guard: Record<string, number> = {};
  for (const r of ok) for (const [k, x] of Object.entries(r.guardrails ?? {})) guard[k] = (guard[k] ?? 0) + x;
  return {
    games: rows.length, played: ok.length, engineErrors: rows.filter((r) => r.engineError).length, gameErrors: rows.filter((r) => !r.engineError && r.error).length,
    aWins: st.wins, bWins: st.losses, draws: st.draws, drawsByCap: ok.filter((r) => r.capped).length,
    aScore: st.mean, aScoreInterval: [st.lo, st.hi], aDecisiveRate: st.wins + st.losses ? Math.round((st.wins / (st.wins + st.losses)) * 1e4) / 1e4 : null,
    firstPlayerWins: ok.filter((r) => r.first && r.winner === r.first).length,
    turns: { mean: turns.length ? Math.round((turns.reduce((a, b) => a + b, 0) / turns.length) * 100) / 100 : null, p10: q(0.1), median: q(0.5), p90: q(0.9), max: turns.at(-1) ?? null },
    halfWidthNow: half, perGameVariance: Math.round(v * 1e4) / 1e4,
    rolloutsForPlusMinus2: st.n >= 2 ? gamesFor(v, 0.02) : null, rolloutsForPlusMinus2Worst: gamesFor(0.25, 0.02),
    guardrails: guard,
  };
}

export interface DecisionAtlas {
  d: number; kind: string; turn: number; chosen: number; options: Array<{ o: number; token: string; label: string; random: ReturnType<typeof scoreStat>; forge: ReturnType<typeof scoreStat> }>;
  random: { branches: number; regret: number | null; regretLo: number | null; regretHi: number | null; best: number | null };
  forge: { branches: number; regret: number | null; regretLo: number | null; regretHi: number | null; best: number | null };
  rho: number | null; rhoLo: number | null; rhoHi: number | null; sameBest: boolean | null;
  complete: boolean;
}

/** D466: one map's regret block, its numbers copied out as strings and back (see decisionAtlas). */
function mapOf(branches: number, r: { regret: number | null; best: number | null; lo: number | null; hi: number | null }): DecisionAtlas['random'] {
  const num = (x: number | null): number | null => (x === null ? null : Number(String(x)));
  return { branches, regret: num(r.regret), regretLo: num(r.lo), regretHi: num(r.hi), best: r.best };
}

/** One decision's two option maps, from its branch rows. */
export function decisionAtlas(listing: DecisionListing, rows: BranchRow[], boot: number, seed: number): DecisionAtlas {
  const k = listing.tokens.length;
  const matrix = (c: Continuation): number[][] => {
    const byI = new Map<number, number[]>();
    for (const r of rows) {
      if (r.c !== c || r.error) continue;
      const row = byI.get(r.i) ?? new Array<number>(k).fill(Number.NaN);
      row[r.o] = r.score;
      byI.set(r.i, row);
    }
    return [...byI.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]).filter((row) => row.every((x) => !Number.isNaN(x)));   // paired: complete branches only
  };
  const mR = matrix('random'), mF = matrix('forge');
  // D466: each map's numbers are taken out of regretInterval's answer before the next call.  On Node 24.20's V8 (Maglev), the
  // random map's answer came back holding the Forge map's regret and interval (its `best` its own) when both were read after
  // the second call: web/test/cubelab-atlas.test.ts's "two maps" test failed 6 runs in 8 under `node --test` and 0 in 3 under
  // `--no-maglev` -- J153's and J154's pilot failures, which this lane's additions to that file made nearly every run's.  None of J156's
  // atlases shows it (no decision has a best other than option 0 with a regret that is not above zero).
  const random = mapOf(mR.length, regretInterval(mR, k, boot, seed + 1, 0));
  const forge = mapOf(mF.length, regretInterval(mF, k, boot, seed + 2, 0));
  const ag = agreement(mR, mF, k, boot, seed + 3);
  const col = (m: number[][], o: number): number[] => m.map((row) => row[o] as number);
  return {
    d: listing.d, kind: listing.kind, turn: listing.turn, chosen: 0,
    options: listing.tokens.map((token, o) => ({ o, token, label: listing.labels[o] ?? token, random: scoreStat(col(mR, o)), forge: scoreStat(col(mF, o)) })),
    random,
    forge,
    rho: ag.rho, rhoLo: ag.lo, rhoHi: ag.hi, sameBest: ag.sameBest,
    complete: mR.length > 0 && mF.length > 0,
  };
}

/** D466: an error text with its ids taken out, so one fault reads as one text across cards and branches. */
export const errorText = (e: string): string => e.replace(/\d+/g, '#').slice(0, 240);

/** D466: one option of one decision whose branch games errored past the threshold. */
export interface ErroredOption { d: number; o: number; token: string; label: string; branches: number; errored: number;
  byContinuation: Record<string, { branches: number; errored: number }>; errors: Array<{ error: string; n: number }> }
export interface BranchErrors { branches: number; errored: number; threshold: number; byError: Array<{ error: string; n: number }>; options: ErroredOption[] }

/**
 * D466: the branch games that errored, by error text (ids taken out) and by option: an option -- one decision's one option,
 * over both continuations -- is listed when more than `threshold` of its branch games errored, with its error texts by count.
 * The atlas makes each listed option a problem: its value rests on the branches that did not error, or on none.
 */
export function branchErrors(rows: BranchRow[], threshold: number): BranchErrors {
  const tally = (m: Map<string, number>, k: string): void => { m.set(k, (m.get(k) ?? 0) + 1); };
  const sorted = (m: Map<string, number>): Array<{ error: string; n: number }> => [...m].map(([error, n]) => ({ error, n })).sort((a, b) => b.n - a.n || (a.error < b.error ? -1 : 1));
  const all = new Map<string, number>();
  const byOpt = new Map<string, { d: number; o: number; token: string; label: string; branches: number; errored: number; byContinuation: Record<string, { branches: number; errored: number }>; errors: Map<string, number> }>();
  for (const r of rows) {
    const k = `${r.d}:${r.o}`;
    const x = byOpt.get(k) ?? { d: r.d, o: r.o, token: r.token, label: r.label, branches: 0, errored: 0, byContinuation: {}, errors: new Map<string, number>() };
    const c = (x.byContinuation[r.c] ??= { branches: 0, errored: 0 });
    x.branches++;
    c.branches++;
    if (r.error) {
      x.errored++;
      c.errored++;
      tally(x.errors, errorText(r.error));
      tally(all, errorText(r.error));
    }
    byOpt.set(k, x);
  }
  const options = [...byOpt.values()].filter((x) => x.errored > threshold * x.branches)
    .sort((a, b) => a.d - b.d || a.o - b.o).map((x) => ({ ...x, errors: sorted(x.errors) }));
  return { branches: rows.length, errored: rows.filter((r) => r.error).length, threshold, byError: sorted(all), options };
}

/** D466: an errored option as a problem line. */
export function erroredOptionProblem(x: ErroredOption): string {
  const cont = Object.entries(x.byContinuation).map(([c, v]) => `${c} ${v.errored} of ${v.branches}`).join(', ');
  const top = x.errors.slice(0, 3).map((e) => `${e.n} x ${e.error}`).join('; ');
  return `d${x.d} option ${x.o} \`${x.token}\` (${x.label}): ${x.errored} of ${x.branches} branch game(s) errored (${cont}): ${top}${x.errors.length > 3 ? `; and ${x.errors.length - 3} other error text(s)` : ''}`;
}

/** The decisions where the two maps disagree most: lowest rank correlation first (null last), then a different best. */
export function disagreements(ds: DecisionAtlas[], k = 5): DecisionAtlas[] {
  return [...ds].filter((d) => d.complete).sort((a, b) => (a.rho ?? 2) - (b.rho ?? 2) || Number(a.sameBest) - Number(b.sameBest)).slice(0, k);
}

/** The whole atlas from the folder's files (no engine); writes atlas.json and atlas.md; 3 on a failed check. */
export function writeAtlas(repo: string, o: AtlasOptions, out: string, plan: Record<string, unknown>, timing: Record<string, unknown>, say: (s: string) => void): number {
  const A = path.join(out, 'phaseA'), B = path.join(out, 'phaseB');
  const aRows = readJsonl<RolloutRow>(path.join(A, 'games.jsonl'));
  const baseFile = path.join(B, 'baseline.json');
  const baseline = fs.existsSync(baseFile) ? JSON.parse(fs.readFileSync(baseFile, 'utf8')) as { decisions: DecisionListing[]; winner: string; turns: number; first: string } : null;
  const bRows = readJsonl<BranchRow>(path.join(B, 'branches.jsonl'));
  const units = readJsonl<{ id: string; ok: boolean; error: string | null; ms: number | null; branches: number; c: string; copiesRetained?: number }>(path.join(B, 'units.jsonl'));
  // checks: rows (ids against the seat's own log), frame logs, the forks, the leak checks
  const problems: string[] = [];
  const logA = (b: Record<string, unknown>, s: number): string => path.join(A, 'frames', `g${String(b.g)}-seat${s}.jsonl.gz`);
  const logBase = (_b: Record<string, unknown>, s: number): string => path.join(B, 'baseline', 'frames', `baseline-seat${s}.jsonl.gz`);
  const logBr = (b: Record<string, unknown>, s: number): string => path.join(B, 'frames', `d${String(b.decision)}-${String(b.continuation)}-o${String(b.option)}-b${String(b.branch)}-seat${s}.jsonl.gz`);
  // D466: every frame log is read through one reader, which skips (and remembers) a log gunzip cannot inflate -- a worker the
  // watchdog killed mid-branch leaves its two logs truncated -- instead of the whole check dying on it, and no atlas.json
  const reader = frameLogReader();
  const rc = [checkRowsDir(path.join(A, 'rows'), logA, reader.read), checkRowsDir(path.join(B, 'baseline', 'rows'), logBase, reader.read), checkRowsDir(path.join(B, 'rows'), logBr, reader.read)];
  for (const c of rc) problems.push(...c.problems);
  const frames: string[] = [];
  const branchFrames: string[] = [];
  for (const d of [path.join(A, 'frames'), path.join(B, 'baseline', 'frames'), path.join(B, 'frames')]) {
    if (!fs.existsSync(d)) continue;
    for (const x of fs.readdirSync(d)) if (x.endsWith('.jsonl.gz')) (d === path.join(B, 'frames') ? branchFrames : frames).push(path.join(d, x));
  }
  // the guardrails, read back from every random seat's log: phase A's, and the random branches'
  const gc: GuardrailCheck = { logs: 0, priority: 0, landOffered: 0, landTaken: 0, mulligans: 0, kept: 0, violations: [], violationCount: { G1: 0, G4: 0 }, counted: {} };
  let forgePayCap = 0;
  for (const f of [...frames, ...branchFrames]) {
    const base = path.basename(f);
    const random = f.startsWith(path.join(A, 'frames')) || /^d\d+-random-/.test(base);
    if (!random && !/^d\d+-forge-/.test(base)) continue;
    const text = reader.read(f);
    if (text === null) continue;   // D466: named below
    if (random) guardrailCheck(text, base, gc);
    else forgePayCap += forgePayCapOf(text);   // D465: the Forge seats' pay-cap passes
  }
  // D460: a branch starts from a fork late in a game, and a short one can end with seat B's hand empty
  // in every frame -- nothing to redact.  Its logs pass --empty-hand-ok, which excuses the two coverage
  // checks only where the file proves that hand empty; phase A's games and the baseline pass nothing.
  // D466: a log the reader could not inflate is not sent (it is a problem of its own, below).
  const readable = (f: string): boolean => !reader.unreadable.has(f);
  const redA = redactionCheck(repo, frames.filter(readable));
  const redB = redactionCheck(repo, branchFrames.filter(readable), 100, ['--empty-hand-ok']);
  const red = { checked: redA.checked + redB.checked, failed: [...redA.failed, ...redB.failed], ms: redA.ms + redB.ms };
  if (red.failed.length) problems.push(`${red.failed.length} frame log(s) failed tools/check-redaction.mjs: ${red.failed.slice(0, 5).map((x) => path.basename(x)).join(', ')}`);
  const truncated = [...reader.unreadable].map(([f, why]) => ({ log: path.relative(out, f), why })).sort((a, b) => (a.log < b.log ? -1 : 1));
  if (truncated.length) problems.push(`${truncated.length} frame log(s) could not be read (gzip: ${[...new Set(truncated.map((t) => t.why))].join('; ')}) and were left out of the checks -- a worker killed mid-branch leaves its logs truncated: ${truncated.slice(0, 5).map((t) => t.log).join(', ')}${truncated.length > 5 ? ', ...' : ''}`);
  frames.push(...branchFrames);
  const forkBad = bRows.filter((r) => r.forkProblems.length);
  if (forkBad.length) problems.push(`${forkBad.length} branch fork(s) were not the position: ${forkBad[0]?.key}: ${forkBad[0]?.forkProblems.join('; ')}`);
  const leak = bRows.filter((r) => r.leakSame !== undefined);
  const leaks = leak.filter((r) => !r.leakSame);
  if (leaks.length) problems.push(`${leaks.length} of ${leak.length} no-leak check(s) moved when only seat B's hidden cards did`);
  problems.push(...gc.violations.slice(0, 10));
  // D466: the list is capped, the count is not
  const vTotal = (gc.violationCount?.G1 ?? 0) + (gc.violationCount?.G4 ?? 0);
  if (vTotal > Math.min(10, gc.violations.length)) problems.push(`${vTotal} guardrail violation(s) in all (G1 ${gc.violationCount?.G1 ?? 0}, G4 ${gc.violationCount?.G4 ?? 0}); the first ${Math.min(10, gc.violations.length)} named above`);
  const overCap = aRows.filter((r) => !r.engineError && (r.turns ?? 0) > o.turnCap + 1);
  if (overCap.length) problems.push(`${overCap.length} phase A game(s) ran past the turn cap`);
  const cappedNotDrawn = aRows.filter((r) => r.capped && r.winner !== 'draw');
  if (cappedNotDrawn.length) problems.push(`${cappedNotDrawn.length} capped game(s) not scored a draw`);
  const unitErrors = units.filter((u) => !u.ok);
  if (unitErrors.length) problems.push(`${unitErrors.length} unit(s) did not finish: ${unitErrors[0]?.id}: ${unitErrors[0]?.error}`);
  const errored = bRows.filter((r) => r.error);
  // D465: a branch whose engine threw an Error (an OutOfMemoryError above all) is an engine error, counted on its own
  const branchEngineErrors = bRows.filter((r) => r.engineError).length;
  // D466: an option whose branch games errored past the threshold is a problem, named with its error texts
  const be = branchErrors(bRows, o.branchErrorMax ?? BRANCH_ERROR_MAX_DEFAULT);
  for (const x of be.options) problems.push(erroredOptionProblem(x));
  const retained = units.map((u) => u.copiesRetained).filter((x): x is number => typeof x === 'number');
  // the maps
  const byD = new Map<number, BranchRow[]>();
  for (const r of bRows) byD.set(r.d, [...(byD.get(r.d) ?? []), r]);
  const ds = baseline ? [...byD.keys()].sort((a, b) => a - b).map((d) => decisionAtlas(baseline.decisions[d] as DecisionListing, byD.get(d) as BranchRow[], o.boot, o.seed + d * 7919)) : [];
  const complete = ds.filter((d) => d.complete);
  const rhoAll = meanInterval(complete.map((d) => d.rho).filter((x): x is number => x !== null), o.boot, o.seed);
  const same = complete.filter((d) => d.sameBest).length;
  const msOf = (c: Continuation): number[] => bRows.filter((r) => r.c === c && !r.error).map((r) => r.ms);
  const meanMs = (xs: number[]): number | null => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  const sizes = {
    phaseAFramesPerGame: aRows.length ? Math.round(aRows.reduce((a, r) => a + (r.bytes ?? 0), 0) / aRows.length) : null,
    branchFramesPerGame: bRows.length ? Math.round(bRows.reduce((a, r) => a + r.bytes, 0) / bRows.length) : null,
  };
  const doc = {
    v: 1, decision: 'D451', plan,
    phaseA: phaseAReport(aRows),
    phaseB: baseline ? {
      baseline: { winner: baseline.winner, turns: baseline.turns, first: baseline.first, decisionsListed: baseline.decisions.length },
      decisions: ds,
      agreement: { decisions: complete.length, meanRho: rhoAll.mean, meanRhoInterval: [rhoAll.lo, rhoAll.hi], sameBest: same, sameBestInterval: Object.values(wilson(same, complete.length)) },
      disagreeMost: disagreements(ds).map((d) => ({ d: d.d, kind: d.kind, turn: d.turn, rho: d.rho, rhoInterval: [d.rhoLo, d.rhoHi], sameBest: d.sameBest, bestRandom: d.random.best, bestForge: d.forge.best })),
      branchGames: bRows.length, branchErrors: errored.length, branchEngineErrors, cappedRandom: bRows.filter((r) => r.c === 'random' && r.capped).length, cappedForge: bRows.filter((r) => r.c === 'forge' && r.capped).length,
      meanBranchMs: { random: meanMs(msOf('random')), forge: meanMs(msOf('forge')) },
      standInsMax: bRows.reduce((a, r) => Math.max(a, r.standIns), 0),
    } : null,
    checks: { rowsFiles: rc.reduce((a, c) => a + c.files, 0), rows: rc.reduce((a, c) => a + c.rows, 0), gamesIdChecked: rc.reduce((a, c) => a + c.games, 0),
      frameLogs: red.checked, frameLogsFailed: red.failed.length, redactionMs: red.ms, forks: bRows.length, forkProblems: forkBad.length,
      leakChecks: leak.length, leaks: leaks.length, leakControlsMoved: leak.filter((r) => r.controlMoved).length,
      // D466: `violations` is every violation (the problems name the first ten), `violationsBy` G1's and G4's
      guardrails: { logs: gc.logs, priorityDecisions: gc.priority, landOffered: gc.landOffered, landTaken: gc.landTaken, mulligans: gc.mulligans, kept: gc.kept, violations: vTotal,
        violationsBy: { G1: gc.violationCount?.G1 ?? 0, G4: gc.violationCount?.G4 ?? 0 }, ...countedGuardrails(gc), forgePayCap },
      // D466: the branch games that errored, by error text and by option past the threshold
      branchErrors: be,
      // D466: the frame logs gunzip could not read, left out of the checks
      unreadableFrameLogs: truncated,
      // D465: the most branch copies any unit's worker still held after one GC at its end (null: no unit measured)
      copiesRetainedMax: retained.length ? Math.max(...retained) : null,
      problems },
    sizes, timing,
  };
  fs.writeFileSync(path.join(out, 'atlas.json'), `${JSON.stringify(doc, null, 2)}\n`);
  fs.writeFileSync(path.join(out, 'atlas.md'), atlasMd(doc as unknown as AtlasDoc, o));
  say(`atlas: ${shownPath(repo, path.join(out, 'atlas.json'))} and atlas.md; phase A ${aRows.length} game(s), phase B ${bRows.length} branch game(s) at ${ds.length} decision(s); checks: ${problems.length ? `${problems.length} PROBLEM(S)` : 'clean'} (${doc.checks.rows} rows, ${red.checked} frame logs, ${leak.length} leak check(s))`);
  for (const p of problems.slice(0, 10)) say(`  ATLAS PROBLEM: ${p}`);
  return problems.length ? 3 : 0;
}

interface AtlasDoc {
  plan: Record<string, unknown> & { pairRule: { chosen: PairRow; top: PairRow[]; ladderGames: number } | null };
  phaseA: ReturnType<typeof phaseAReport> & Record<string, unknown>;
  phaseB: null | { baseline: { winner: string; turns: number; decisionsListed: number }; decisions: DecisionAtlas[]; agreement: { decisions: number; meanRho: number | null; meanRhoInterval: Array<number | null>; sameBest: number; sameBestInterval: Array<number | null> }; disagreeMost: Array<{ d: number }>; branchGames: number; branchErrors: number; branchEngineErrors?: number; cappedRandom: number; cappedForge: number };
  checks: { problems: string[]; rows: number; frameLogs: number; leakChecks: number; leaks: number; leakControlsMoved: number; forks: number; forkProblems: number;
    guardrails: { logs: number; priorityDecisions: number; landOffered: number; landTaken: number; mulligans: number; kept: number; violations: number;
      violationsBy?: { G1: number; G4: number }; noRepeatNoOp?: number; refusedCast?: number; noRepeatRefused?: number; forgePayCap?: number };
    branchErrors?: BranchErrors; unreadableFrameLogs?: Array<{ log: string; why: string }> };
}

/**
 * D465: the pay-cap passes a Forge-piloted branch seat counted, from its log's `decisions` summary (`guardrails.forgePayCap`,
 * protocol M72); 0 for a log without one.
 */
export function forgePayCapOf(text: string): number {
  let n = 0;
  for (const line of text.split('\n')) {
    if (!line.includes('"type":"decisions"')) continue;
    try {
      const v = (JSON.parse(line) as { body?: { guardrails?: { forgePayCap?: unknown } } }).body?.guardrails?.forgePayCap;
      if (typeof v === 'number') n += v;
    } catch { /* a torn line: the redaction check reports it */ }
  }
  return n;
}

/** D458: checks.guardrails' counted keys -- G3's no-op removals, G5's refused picks and the removals after them -- read from the logs. */
export function countedGuardrails(gc: GuardrailCheck): Record<(typeof COUNTED_GUARDRAILS)[number], number> {
  const c = gc.counted ?? {};
  return { noRepeatNoOp: c.noRepeatNoOp ?? 0, refusedCast: c.refusedCast ?? 0, noRepeatRefused: c.noRepeatRefused ?? 0 };
}

const pct = (x: number | null | undefined): string => (x === null || x === undefined ? '-' : (x * 100).toFixed(1));
const iv = (lo: number | null | undefined, hi: number | null | undefined, f = pct): string => (lo === null || lo === undefined || hi === null || hi === undefined ? '' : ` [${f(lo)}, ${f(hi)}]`);
const num2 = (x: number | null | undefined): string => (x === null || x === undefined ? '-' : x.toFixed(2));

/** atlas.md: the plan, phase A, the two regret maps side by side, the agreement in plain words, each decision's options. */
export function atlasMd(doc: AtlasDoc, o: AtlasOptions): string {
  const L: string[] = [];
  L.push(`# Move atlas: ${deckName(o.deckA)} vs ${deckName(o.deckB)}, seed ${o.seed}`, '');
  L.push(`D451. Seat A is ${deckName(o.deckA)}. Every result is from seat A's side: a win 1, a draw 0.5 (the turn cap is turn ${o.turnCap}), a loss 0; intervals are 95%. "Random" is both seats playing the random seat under D451's mechanical guardrails; "Forge" is Forge's Default AI on both seats. Method only: nothing here is a verdict.`, '');
  const pr = doc.plan.pairRule;
  if (pr) {
    L.push('## The deck pair', '');
    L.push(`Chosen by rule from \`tools/ai-bench/pairs-confirm.txt\` and ${pr.ladderGames} ladder games: the smallest |p - 1/2| + 1.96 sqrt(p(1-p)/n), p deck A's share of a line's decisive games. Line ${pr.chosen.pair}: ${pr.chosen.games} games, deck A ${pr.chosen.aWins} of ${pr.chosen.decisive}.`, '');
    L.push('| line | deck A | deck B | games | A wins / decisive | p | score |', '|---|---|---|---|---|---|---|');
    for (const r of pr.top) L.push(`| ${r.pair} | ${deckName(r.deckA)} | ${deckName(r.deckB)} | ${r.games} | ${r.aWins} / ${r.decisive} | ${num2(r.p)} | ${r.score?.toFixed(4) ?? '-'} |`);
    L.push('');
  }
  const a = doc.phaseA;
  L.push('## Phase A: random against random from the opening', '');
  L.push(`${a.played} game(s) played (${a.engineErrors} engine error(s)). Seat A won ${a.aWins}, seat B ${a.bWins}, ${a.draws} drawn (${a.drawsByCap} by the turn cap). Seat A's score ${pct(a.aScore as number | null)}%${iv((a.aScoreInterval as Array<number | null>)[0], (a.aScoreInterval as Array<number | null>)[1])}. Game length in turns: mean ${(a.turns as Record<string, number | null>).mean ?? '-'}, median ${(a.turns as Record<string, number | null>).median ?? '-'}, 10th-90th ${(a.turns as Record<string, number | null>).p10 ?? '-'}-${(a.turns as Record<string, number | null>).p90 ?? '-'}. A 95% interval of +/- 2 points on seat A's score needs about ${a.rolloutsForPlusMinus2 ?? '-'} rollouts at this variance (${a.rolloutsForPlusMinus2Worst} at the worst case, a 50% score with no draws).`, '');
  const b = doc.phaseB;
  if (b) {
    L.push('## Phase B: the two regret maps', '');
    L.push(`The baseline game (Forge on both seats) lasted ${b.baseline.turns} turns, won by ${b.baseline.winner}, and listed ${b.baseline.decisionsListed} decision(s) of seat A with two or more options. Option 0 is Forge's answer, the one the baseline played; regret is the best option's value minus option 0's (the best is picked after the fact, so the point leans high; read the interval).`, '');
    L.push('| decision | turn | kind | options | random: best, regret | forge: best, regret | rank corr. (random vs forge) | same best |', '|---|---|---|---|---|---|---|---|');
    for (const d of b.decisions) {
      const best = (x: number | null): string => (x === null ? '-' : `${x} \`${d.options[x]?.token ?? '?'}\``);
      L.push(`| d${d.d} | ${d.turn} | ${d.kind} | ${d.options.length} | ${best(d.random.best)}, ${pct(d.random.regret)}${iv(d.random.regretLo, d.random.regretHi)} (n ${d.random.branches}) | ${best(d.forge.best)}, ${pct(d.forge.regret)}${iv(d.forge.regretLo, d.forge.regretHi)} (n ${d.forge.branches}) | ${num2(d.rho)}${iv(d.rhoLo, d.rhoHi, num2)} | ${d.sameBest === null ? '-' : d.sameBest ? 'yes' : 'no'} |`);
    }
    L.push('');
    const ag = b.agreement;
    const strong = b.decisions.filter((d) => d.complete && d.rhoLo !== null && d.rhoLo > 0).length;
    const against = b.decisions.filter((d) => d.complete && d.rhoHi !== null && d.rhoHi < 0).length;
    L.push('### What the two maps agree and disagree about', '');
    L.push(`Over ${ag.decisions} decision(s) with both maps complete, the mean rank correlation between the random map's ordering of the options and Forge's is ${num2(ag.meanRho)}${iv(ag.meanRhoInterval[0], ag.meanRhoInterval[1], num2)}; at ${strong} of them the correlation's interval lies above zero (the maps order the options alike beyond the noise), at ${against} below it (they order them in reverse), and at the rest it straddles zero (these branch counts cannot tell). The two maps name the same best option at ${ag.sameBest} of ${ag.decisions} decision(s) (${pct(ag.decisions ? ag.sameBest / ag.decisions : null)}%${iv(ag.sameBestInterval[0], ag.sameBestInterval[1])}). The random map says what an option is worth when both sides play at random after it, Forge's what it is worth when Forge plays both sides on; the list below is where the two orderings differ most.`, '');
    L.push('Where they disagree most:', '');
    for (const x of b.disagreeMost) {
      const d = b.decisions.find((y) => y.d === x.d) as DecisionAtlas;
      L.push(`- d${d.d} (turn ${d.turn}, ${d.kind}): rank correlation ${num2(d.rho)}${iv(d.rhoLo, d.rhoHi, num2)}; random's best \`${d.options[d.random.best ?? 0]?.token}\`, Forge's best \`${d.options[d.forge.best ?? 0]?.token}\`.`);
    }
    L.push('');
    L.push('### Each decision\'s options, side by side', '');
    for (const d of b.decisions) {
      L.push(`**d${d.d}** (turn ${d.turn}, ${d.kind}; option 0 is Forge's answer):`, '');
      L.push('| option | token | what | random: value | forge: value |', '|---|---|---|---|---|');
      for (const op of d.options) L.push(`| ${op.o}${op.o === 0 ? ' (played)' : ''} | \`${op.token}\` | ${op.label.replace(/\|/g, '/')} | ${pct(op.random.mean)}${iv(op.random.lo, op.random.hi)} (n ${op.random.n}) | ${pct(op.forge.mean)}${iv(op.forge.lo, op.forge.hi)} (n ${op.forge.n}) |`);
      L.push('');
    }
    L.push(`${b.branchGames} branch games (${b.branchErrors} with an error, left out${b.branchEngineErrors ? `; ${b.branchEngineErrors} of them engine errors, a Java Error such as OutOfMemoryError (D465)` : ''}); ${b.cappedRandom} random and ${b.cappedForge} Forge branches ended at the turn cap.`, '');
  }
  const c = doc.checks;
  L.push('## Checks', '');
  const g = c.guardrails;
  L.push(`${c.rows} rows checked (ids against each seat's own frame log), ${c.frameLogs} frame logs through tools/check-redaction.mjs, ${c.forks} forks checked (${c.forkProblems} not the position), ${c.leakChecks} no-leak checks (${c.leaks} moved; the negative control moved in ${c.leakControlsMoved}). The guardrails read back from ${g.logs} random seats' logs: a land offered at ${g.landOffered} of ${g.priorityDecisions} priority decisions and taken at ${g.landTaken}; ${g.kept} of ${g.mulligans} opening hands kept${g.refusedCast === undefined ? '' : `; G3 left out a repeated no-op ${g.noRepeatNoOp ?? 0} time(s); G5 (D458): the engine refused ${g.refusedCast} pick(s) it could not pay for, and ${g.noRepeatRefused ?? 0} later offer(s) of them in the same priority window were left out`}${g.forgePayCap === undefined ? '' : `; the Forge seats' pay cap (D465) passed instead of a play refused 3 times in one window ${g.forgePayCap} time(s)`}${g.violationsBy ? `; ${g.violations} guardrail violation(s) (G1 ${g.violationsBy.G1}, G4 ${g.violationsBy.G4})` : ''}. ${c.problems.length ? `PROBLEMS: ${c.problems.join('; ')}` : 'No problem.'}`, '');
  const be = c.branchErrors;
  if (be && be.errored) {
    // D466: the branch errors, by text, and the options past the threshold
    L.push(`### Branch games that errored`, '');
    L.push(`${be.errored} of ${be.branches} branch game(s) errored and are left out of their option's value. By error text (ids as #):`, '');
    L.push('| branch games | error |', '|---|---|');
    for (const e of be.byError.slice(0, 20)) L.push(`| ${e.n} | ${e.error.replace(/\|/g, '/')} |`);
    if (be.byError.length > 20) L.push(`| ... | ${be.byError.length - 20} more error text(s) |`);
    L.push('');
    if (be.options.length) {
      L.push(`Options with more than ${pct(be.threshold)}% of their branch games errored (each a problem):`, '');
      L.push('| decision | option | token | what | errored | random | forge | the commonest error |', '|---|---|---|---|---|---|---|---|');
      for (const x of be.options) {
        const cc = (k: string): string => (x.byContinuation[k] ? `${x.byContinuation[k].errored} / ${x.byContinuation[k].branches}` : '-');
        L.push(`| d${x.d} | ${x.o} | \`${x.token}\` | ${x.label.replace(/\|/g, '/')} | ${x.errored} / ${x.branches} | ${cc('random')} | ${cc('forge')} | ${(x.errors[0]?.error ?? '').replace(/\|/g, '/')} |`);
      }
      L.push('');
    } else L.push(`No option had more than ${pct(be.threshold)}% of its branch games errored.`, '');
  }
  if (c.unreadableFrameLogs?.length) {
    L.push(`${c.unreadableFrameLogs.length} frame log(s) could not be read and were left out of the checks: ${c.unreadableFrameLogs.map((t) => `\`${t.log}\` (${t.why})`).join(', ')}.`, '');
  }
  return `${L.join('\n')}\n`;
}

// ------------------------------------------------------------------
// The engine self-test (not in the gate)
// ------------------------------------------------------------------

/**
 * `tools/cubelab.sh atlas-selftest [--jobs 2]`: a tiny atlas on two committed decks -- two rollouts, two
 * decisions, two branches of each continuation, the no-leak check on EVERY unit -- and the assertions:
 * every fork was the position, every no-leak check stayed put while its negative control moved, the
 * guardrails read back clean, every rows file and frame log passed, and both decisions have both maps.
 */
/**
 * The self-test's folder: ABSOLUTE, so LAB_DATA_DIR never re-roots it (D450 moves only relative var/
 * paths) -- the folder it clears is the folder it writes, always the repo's (the #161 review: it cleared
 * the repo path and wrote under the drive, so a drive run kept stale output).
 */
export const atlasSelftestDir = (repo: string): string => path.resolve(repo, 'var/cubelab/atlas-selftest');

export async function atlasSelftest(repo: string, f: Map<string, string[]>, say: (s: string) => void): Promise<number> {
  const out = atlasSelftestDir(repo);
  fs.rmSync(out, { recursive: true, force: true });
  const flags = new Map<string, string[]>([
    ['deck-a', ['decks/pacho-shield.dck']], ['deck-b', ['decks/doom-legion.dck']], ['seed', ['4515']], ['rollouts', ['2']], ['decisions', ['2']],
    ['branch-random', ['2']], ['branch-forge', ['2']], ['chunk', ['2']], ['leak-checks', ['2']], ['boot', ['200']], ['jobs', [f.get('jobs')?.at(-1) ?? '2']], ['out', [out]],
  ]);
  const rc = await atlasCommand(repo, flags, say);
  const doc = JSON.parse(fs.readFileSync(path.join(out, 'atlas.json'), 'utf8')) as {
    checks: { forks: number; forkProblems: number; leakChecks: number; leaks: number; leakControlsMoved: number; guardrails: { violations: number; landOffered: number; landTaken: number; noRepeatNoOp?: number; refusedCast?: number; noRepeatRefused?: number; forgePayCap?: number }; problems: string[]; frameLogs: number; rows: number; copiesRetainedMax?: number | null };
    phaseA: { played: number }; phaseB: { decisions: Array<{ complete: boolean }> } | null;
  };
  const c = doc.checks;
  const fails: string[] = [];
  const want = (ok: boolean, what: string): void => { if (!ok) fails.push(what); };
  want(rc === 0 && c.problems.length === 0, `the atlas's own checks: ${c.problems.join('; ') || `exit ${rc}`}`);
  want(doc.phaseA.played === 2, 'two rollouts played');
  want(!!doc.phaseB && doc.phaseB.decisions.length === 2 && doc.phaseB.decisions.every((d) => d.complete), 'two decisions with both maps');
  want(c.forks > 0 && c.forkProblems === 0, `every fork is the position (${c.forkProblems} of ${c.forks} not)`);
  want(c.leakChecks >= 4 && c.leaks === 0, `no-leak checks ran on every unit and stayed put (${c.leaks} of ${c.leakChecks} moved)`);
  want(c.leakControlsMoved === c.leakChecks, `every negative control moved (${c.leakControlsMoved} of ${c.leakChecks})`);
  want(c.guardrails.violations === 0 && c.guardrails.landOffered > 0 && c.guardrails.landTaken === c.guardrails.landOffered, 'G1 and G4 read back clean, with lands offered');
  want(COUNTED_GUARDRAILS.every((k) => typeof c.guardrails[k] === 'number'), 'G3 and G5 (D458) counted from the logs');
  want(typeof c.guardrails.forgePayCap === 'number', 'the Forge seats\' pay cap (D465) counted from the logs');
  // D465: before GameLedger.detach every unit held all four of its copies (each branch's ledger held its game); after it, 0 or 1
  want(typeof c.copiesRetainedMax === 'number' && c.copiesRetainedMax <= 1, `a unit's worker holds at most one branch copy after one GC at its end, never one a branch (D465; most held: ${String(c.copiesRetainedMax)})`);
  want(c.frameLogs > 0 && c.rows > 0, 'frame logs and rows were checked');
  for (const x of fails) say(`atlas-selftest: FAIL ${x}`);
  say(fails.length ? `atlas-selftest: ${fails.length} failure(s)` : `atlas-selftest: OK (${c.forks} forks, ${c.leakChecks} no-leak checks, ${c.frameLogs} frame logs, ${c.rows} rows; G3 ${c.guardrails.noRepeatNoOp ?? 0}, G5 refused ${c.guardrails.refusedCast ?? 0} / left out ${c.guardrails.noRepeatRefused ?? 0}; pay cap ${c.guardrails.forgePayCap ?? 0}; copies held ${String(c.copiesRetainedMax)})`);
  return fails.length ? 1 : 0;
}
