// mtg-table — the cube lab: the MOVE ATLAS (D451).  Two decks, one seed; what each option of a decision
// is worth when the rest of the game is played at random, and when it is played by Forge.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
//   tools/cubelab.sh atlas (--deck-a <dck> --deck-b <dck> | --pair auto) --seed S --jobs K --out <dir>
//       [--turn-cap 40] [--rollouts 10000] [--branch-random 200] [--branch-forge 40] [--decisions all|N]
//       [--options 8] [--chunk 25] [--leak-checks 1] [--branch-timeout 120] [--unit-timeout 30] [--boot 1000]
//       [--ladder var/ai-ladder] [--pairs tools/ai-bench/pairs-confirm.txt] [--phase a|b|both]
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
// --unit-timeout minutes of monotonic time (D459) is killed as hung and recorded as not finished.  Every branch recorded (rows,
// ledger, frame logs), its fork checked; --leak-checks per unit play a branch again after seat B's real
// hidden cards were dealt again (it must not move) and after seat A's own hand was (it must).
//
// OUTPUT: <out>/plan.json; <out>/phaseA/{games.jsonl, ledger.jsonl, rows/, frames/};
// <out>/phaseB/{baseline.json, baseline/, branches.jsonl, units.jsonl, ledger.jsonl, rows/, frames/};
// <out>/atlas.json (strict) and <out>/atlas.md.  Never summary.md or metrics.json.  Resumable: a game or
// unit already in its jsonl is not played again; a plan with other options is refused.
// After the games every rows file is checked (rowscheck.ts, ids against the seat's own frame log) and
// every frame log goes through tools/check-redaction.mjs; a problem is written into atlas.json's
// `checks` and exits 3.

import fs from 'node:fs';
import path from 'node:path';

import { engineEnv, runPool, type MatchJob, type MatchResult, type RecordSpec } from './engine.ts';
import type { PlayExploreTag } from './playexplore.ts';
import { fileLines } from './lines.ts';
import { labPath, recipePath, shownPath } from './labdata.ts';
import { checkRowsDir, readMaybeGz } from './rowscheck.ts';
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
}

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
}
export interface RolloutRow { v: 1; g: number; seed: number; winner: 'A' | 'B' | 'draw' | null; first: string | null; turns: number | null; capped: boolean; reason: string | null; ms: number | null; error: string | null; engineError: string | null; guardrails?: Record<string, number>; rows?: unknown; bytes?: number }

const one = (f: Map<string, string[]>, k: string): string | undefined => f.get(k)?.at(-1);

/** The pair the rule chooses, from the ladder's results (every results/*.jsonl under `ladderDir`). */
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

export function unitJob(o: AtlasOptions, out: string, u: Unit, listing: DecisionListing): MatchJob & Record<string, unknown> {
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
    },
  };
}

interface AtlasGame { atlas?: { error?: string; decisions: DecisionListing[]; branches: Array<Omit<BranchRow, 'v' | 'd' | 'kind' | 'turn' | 'c' | 'token' | 'label' | 'score'> & { o: number; ledger?: Ledger }> }; capped?: boolean; ledger?: Ledger; playExplore?: { guardrails?: Record<string, number> }; rows?: unknown }

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
  };
  for (const d of [o.deckA, o.deckB]) if (!fs.existsSync(d)) throw new Error(`atlas: no deck ${d}`);
  const phase = one(f, 'phase') ?? 'both';
  if (!['a', 'b', 'both', 'report'].includes(phase)) throw new Error('atlas: --phase a|b|both|report');
  const jobs = int('jobs', 1, 1);
  fs.mkdirSync(out, { recursive: true });
  const planFile = path.join(out, 'plan.json');
  const plan = { v: 1, decision: 'D451', deckA: shownPath(repo, o.deckA), deckB: shownPath(repo, o.deckB), seed: o.seed, turnCap: o.turnCap, options: o.options,
    rollouts: o.rollouts, branchRandom: o.branchRandom, branchForge: o.branchForge, decisions: o.decisions, chunk: o.chunk, branchTimeoutSec: o.branchTimeoutSec, unitTimeoutMin: o.unitTimeoutMin,
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
  const byId = new Map(units.map((u) => [unitId(u), u]));
  say(`atlas phase B: ${units.length} unit(s) to play (${doneUnits.size} done), chunks of ${o.chunk} branches, on ${Math.min(jobs, Math.max(1, units.length))} worker(s)`);
  if (!units.length) return { baselineMs: Date.now() - tb, units: 0, ms: 0 };
  const homes = env.homes.slice(0, Math.max(1, Math.min(jobs, units.length)));
  const fd = fs.openSync(branchesFile, 'a');
  const ufd = fs.openSync(unitsFile, 'a');
  const lfd = fs.openSync(path.join(B, 'ledger.jsonl'), 'a');
  const t0 = Date.now();
  let n = 0, branchGames = 0;
  try {
    await runPool({ ...env, homes }, units.map((u) => unitJob(o, out, u, all[u.d] as DecisionListing)), path.join(B, 'logs'), (job, r) => {
      const u = byId.get(job.id) as Unit;
      const listing = all[u.d] as DecisionListing;
      const x = gameOf(r);
      const err = r.engineError ?? x?.atlas?.error ?? (x?.atlas ? null : 'no atlas block');
      const got = x?.atlas?.branches ?? [];
      for (const b of got) {
        const row: BranchRow = { v: 1, d: u.d, kind: listing.kind, turn: listing.turn, c: u.c, o: b.o, token: listing.tokens[b.o] ?? '?', label: listing.labels[b.o] ?? '?',
          i: b.i, seed: b.seed, result: b.result, score: scoreOf(b.result), capped: b.capped, timedOut: b.timedOut, turns: b.turns, steps: b.steps, ms: b.ms,
          bytes: b.bytes, standIns: b.standIns, error: b.error, forkProblems: b.forkProblems, key: b.key,
          ...(b.leakSame !== undefined ? { leakSame: b.leakSame, controlMoved: b.controlMoved } : {}) };
        if (b.ledger) fs.writeSync(lfd, `${JSON.stringify({ v: 1, key: b.key, ledger: b.ledger })}\n`);
        fs.writeSync(fd, `${JSON.stringify(row)}\n`);
      }
      const expected = listing.tokens.length * (u.i1 - u.i0);
      const ok = !err && got.length === expected;
      fs.writeSync(ufd, `${JSON.stringify({ v: 1, id: job.id, d: u.d, c: u.c, i0: u.i0, i1: u.i1, ok, branches: got.length, expected, error: err, ms: x?.ms ?? null, cpuMs: x?.cpuMs ?? null })}\n`);
      branchGames += got.length;
      n++;
      say(`  [B ${n}/${units.length}] ${job.id}: ${got.length}/${expected} branch game(s)${err ? ` -- ${err}` : ''}; ${(branchGames / ((Date.now() - t0) / 3_600_000)).toFixed(0)} branch games/h`);
    }, say);
  } finally {
    fs.closeSync(fd);
    fs.closeSync(ufd);
    fs.closeSync(lfd);
  }
  return { baselineMs: t0 - tb, units: n, branchGames, ms: Date.now() - t0, workers: homes.length };
}

// ------------------------------------------------------------------
// The guardrails, checked from the recordings
// ------------------------------------------------------------------

export interface GuardrailCheck { logs: number; priority: number; landOffered: number; landTaken: number; mulligans: number; kept: number; violations: string[];
  /** D458: the random seats' own guardrail counts, summed from each log's `decisions` summary (protocol M71): G3's `noRepeatNoOp`, G5's `refusedCast` and `noRepeatRefused`. */
  counted?: Record<string, number> }

/** D458: the guardrail counts every atlas reports, zero when no log counted one (G3; G5's refused picks and the removals after them). */
export const COUNTED_GUARDRAILS = ['noRepeatNoOp', 'refusedCast', 'noRepeatRefused'] as const;

/**
 * D451's guardrails, read back from a random seat's own frame log (its D347 decision records): G1, every
 * priority decision that offered a land (`land:<id>` among the legal options) was answered with a land;
 * G4, every opening-hand decision was `keep`.  (G2 is G1 itself, with no code of its own; G3 needs the engine's fingerprint and
 * is counted by the worker, `noRepeatNoOp`.)  D458: the seat's own counts -- G3's and G5's, a play the engine refused to pay
 * for (`refusedCast`) and each later removal of it in that priority window (`noRepeatRefused`) -- are summed from the log's
 * `decisions` summary (`explore.guardrails`, protocol M71) into `counted`.  `where` names the log in a violation.
 */
export function guardrailCheck(text: string, where: string, out: GuardrailCheck): void {
  out.logs++;
  out.counted ??= {};
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
        else if (out.violations.length < 50) out.violations.push(`${where}: decision ${String(b.n)} offered a land and played ${String(b.chosen)} (G1)`);
      }
    } else if (b.kind === 'mulligan') {
      out.mulligans++;
      if (b.chosen === 'keep') out.kept++;
      else if (out.violations.length < 50) out.violations.push(`${where}: decision ${String(b.n)} took a mulligan (G4)`);
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
  const rR = regretInterval(mR, k, boot, seed + 1);
  const rF = regretInterval(mF, k, boot, seed + 2);
  const ag = agreement(mR, mF, k, boot, seed + 3);
  const col = (m: number[][], o: number): number[] => m.map((row) => row[o] as number);
  return {
    d: listing.d, kind: listing.kind, turn: listing.turn, chosen: 0,
    options: listing.tokens.map((token, o) => ({ o, token, label: listing.labels[o] ?? token, random: scoreStat(col(mR, o)), forge: scoreStat(col(mF, o)) })),
    random: { branches: mR.length, regret: rR.regret, regretLo: rR.lo, regretHi: rR.hi, best: rR.best },
    forge: { branches: mF.length, regret: rF.regret, regretLo: rF.lo, regretHi: rF.hi, best: rF.best },
    rho: ag.rho, rhoLo: ag.lo, rhoHi: ag.hi, sameBest: ag.sameBest,
    complete: mR.length > 0 && mF.length > 0,
  };
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
  const units = readJsonl<{ id: string; ok: boolean; error: string | null; ms: number | null; branches: number; c: string }>(path.join(B, 'units.jsonl'));
  // checks: rows (ids against the seat's own log), frame logs, the forks, the leak checks
  const problems: string[] = [];
  const logA = (b: Record<string, unknown>, s: number): string => path.join(A, 'frames', `g${String(b.g)}-seat${s}.jsonl.gz`);
  const logBase = (_b: Record<string, unknown>, s: number): string => path.join(B, 'baseline', 'frames', `baseline-seat${s}.jsonl.gz`);
  const logBr = (b: Record<string, unknown>, s: number): string => path.join(B, 'frames', `d${String(b.decision)}-${String(b.continuation)}-o${String(b.option)}-b${String(b.branch)}-seat${s}.jsonl.gz`);
  const rc = [checkRowsDir(path.join(A, 'rows'), logA), checkRowsDir(path.join(B, 'baseline', 'rows'), logBase), checkRowsDir(path.join(B, 'rows'), logBr)];
  for (const c of rc) problems.push(...c.problems);
  const frames: string[] = [];
  for (const d of [path.join(A, 'frames'), path.join(B, 'baseline', 'frames'), path.join(B, 'frames')]) {
    if (fs.existsSync(d)) for (const x of fs.readdirSync(d)) if (x.endsWith('.jsonl.gz')) frames.push(path.join(d, x));
  }
  const red = redactionCheck(repo, frames);
  if (red.failed.length) problems.push(`${red.failed.length} frame log(s) failed tools/check-redaction.mjs: ${red.failed.slice(0, 5).map((x) => path.basename(x)).join(', ')}`);
  const forkBad = bRows.filter((r) => r.forkProblems.length);
  if (forkBad.length) problems.push(`${forkBad.length} branch fork(s) were not the position: ${forkBad[0]?.key}: ${forkBad[0]?.forkProblems.join('; ')}`);
  const leak = bRows.filter((r) => r.leakSame !== undefined);
  const leaks = leak.filter((r) => !r.leakSame);
  if (leaks.length) problems.push(`${leaks.length} of ${leak.length} no-leak check(s) moved when only seat B's hidden cards did`);
  // the guardrails, read back from every random seat's log: phase A's, and the random branches'
  const gc: GuardrailCheck = { logs: 0, priority: 0, landOffered: 0, landTaken: 0, mulligans: 0, kept: 0, violations: [], counted: {} };
  for (const f of frames) {
    const base = path.basename(f);
    if (f.startsWith(path.join(A, 'frames')) || /^d\d+-random-/.test(base)) guardrailCheck(readMaybeGz(f), base, gc);
  }
  problems.push(...gc.violations.slice(0, 10));
  const overCap = aRows.filter((r) => !r.engineError && (r.turns ?? 0) > o.turnCap + 1);
  if (overCap.length) problems.push(`${overCap.length} phase A game(s) ran past the turn cap`);
  const cappedNotDrawn = aRows.filter((r) => r.capped && r.winner !== 'draw');
  if (cappedNotDrawn.length) problems.push(`${cappedNotDrawn.length} capped game(s) not scored a draw`);
  const unitErrors = units.filter((u) => !u.ok);
  if (unitErrors.length) problems.push(`${unitErrors.length} unit(s) did not finish: ${unitErrors[0]?.id}: ${unitErrors[0]?.error}`);
  const branchErrors = bRows.filter((r) => r.error);
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
      branchGames: bRows.length, branchErrors: branchErrors.length, cappedRandom: bRows.filter((r) => r.c === 'random' && r.capped).length, cappedForge: bRows.filter((r) => r.c === 'forge' && r.capped).length,
      meanBranchMs: { random: meanMs(msOf('random')), forge: meanMs(msOf('forge')) },
      standInsMax: bRows.reduce((a, r) => Math.max(a, r.standIns), 0),
    } : null,
    checks: { rowsFiles: rc.reduce((a, c) => a + c.files, 0), rows: rc.reduce((a, c) => a + c.rows, 0), gamesIdChecked: rc.reduce((a, c) => a + c.games, 0),
      frameLogs: red.checked, frameLogsFailed: red.failed.length, redactionMs: red.ms, forks: bRows.length, forkProblems: forkBad.length,
      leakChecks: leak.length, leaks: leaks.length, leakControlsMoved: leak.filter((r) => r.controlMoved).length,
      guardrails: { logs: gc.logs, priorityDecisions: gc.priority, landOffered: gc.landOffered, landTaken: gc.landTaken, mulligans: gc.mulligans, kept: gc.kept, violations: gc.violations.length,
        ...countedGuardrails(gc) },
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
  phaseB: null | { baseline: { winner: string; turns: number; decisionsListed: number }; decisions: DecisionAtlas[]; agreement: { decisions: number; meanRho: number | null; meanRhoInterval: Array<number | null>; sameBest: number; sameBestInterval: Array<number | null> }; disagreeMost: Array<{ d: number }>; branchGames: number; branchErrors: number; cappedRandom: number; cappedForge: number };
  checks: { problems: string[]; rows: number; frameLogs: number; leakChecks: number; leaks: number; leakControlsMoved: number; forks: number; forkProblems: number;
    guardrails: { logs: number; priorityDecisions: number; landOffered: number; landTaken: number; mulligans: number; kept: number; violations: number;
      noRepeatNoOp?: number; refusedCast?: number; noRepeatRefused?: number } };
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
    L.push(`${b.branchGames} branch games (${b.branchErrors} with an error, left out); ${b.cappedRandom} random and ${b.cappedForge} Forge branches ended at the turn cap.`, '');
  }
  const c = doc.checks;
  L.push('## Checks', '');
  const g = c.guardrails;
  L.push(`${c.rows} rows checked (ids against each seat's own frame log), ${c.frameLogs} frame logs through tools/check-redaction.mjs, ${c.forks} forks checked (${c.forkProblems} not the position), ${c.leakChecks} no-leak checks (${c.leaks} moved; the negative control moved in ${c.leakControlsMoved}). The guardrails read back from ${g.logs} random seats' logs: a land offered at ${g.landOffered} of ${g.priorityDecisions} priority decisions and taken at ${g.landTaken}; ${g.kept} of ${g.mulligans} opening hands kept${g.refusedCast === undefined ? '' : `; G3 left out a repeated no-op ${g.noRepeatNoOp ?? 0} time(s); G5 (D458): the engine refused ${g.refusedCast} pick(s) it could not pay for, and ${g.noRepeatRefused ?? 0} later offer(s) of them in the same priority window were left out`}. ${c.problems.length ? `PROBLEMS: ${c.problems.join('; ')}` : 'No problem.'}`, '');
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
    checks: { forks: number; forkProblems: number; leakChecks: number; leaks: number; leakControlsMoved: number; guardrails: { violations: number; landOffered: number; landTaken: number; noRepeatNoOp?: number; refusedCast?: number; noRepeatRefused?: number }; problems: string[]; frameLogs: number; rows: number };
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
  want(c.frameLogs > 0 && c.rows > 0, 'frame logs and rows were checked');
  for (const x of fails) say(`atlas-selftest: FAIL ${x}`);
  say(fails.length ? `atlas-selftest: ${fails.length} failure(s)` : `atlas-selftest: OK (${c.forks} forks, ${c.leakChecks} no-leak checks, ${c.frameLogs} frame logs, ${c.rows} rows; G3 ${c.guardrails.noRepeatNoOp ?? 0}, G5 refused ${c.guardrails.refusedCast ?? 0} / left out ${c.guardrails.noRepeatRefused ?? 0})`);
  return fails.length ? 1 : 0;
}
