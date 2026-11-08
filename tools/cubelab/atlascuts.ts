// mtg-table — the cube lab: the move atlas's CUT DESIGN (D480, amending D451).  Pure and engine-free.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Three of D480's five flags change which branches phase B plays, and all three are decided here, from the branch rows
// alone, so a test can replay them on a finished spine's rows:
//
//   --min-options k    the decisions are spread over those the baseline listed with k or more plays (D483: distinct play
//                      identities, `playCount`); when fewer than the
//                      spine's count have k, the rest are filled from the others, spread the same way (`pickDecisions`).
//   --screen n         after n random branches of every option, a decision whose mean value -- the mean of its options'
//                      means -- is <= .04 or >= .96 is SETTLED: it keeps those n branches as a cheap label (`screened`), is
//                      branched no further, and the next listed decision not yet branched takes its place (`nextDecision`).
//   --early-stop a,b,c after a, b and c random branches, an option whose paired-bootstrap interval against the current leader
//                      lies entirely below zero stops there (`dropAt`); option 0, Forge's own answer, never stops, so the
//                      label (regret against option 0) keeps all of its branches.  The Forge map plays only the options still
//                      running after the last checkpoint.
//   --futility i       D489: at early stopping's i-th checkpoint (0: the first, 50 with `on`), a decision whose option 0 has the
//                      best mean over the paired rows, or one within --futility-tie of it, is STOPPED: no more branches of any
//                      option, no Forge map, and its label is a PARTIAL one at that n (`futileAt`); a seeded --futility-sample
//                      share of those decisions is played on to the full n anyway as the rule's bias control.
//   --only <file>      D524: not a cut but a measurement of given options: the decisions are exactly the file's (`why: 'only'`),
//                      each branched at its own options only (every unit carries them), and nothing is decided after a pick
//                      (`parseOnly`, `checkOnly`); refused beside the cuts and --decisions.
//
// A unit that crosses no checkpoint is the unit it always was; a decision's next units wait for every unit of its current
// stage (the checkpoint BARRIER), and the units after a checkpoint carry the options still running (`Unit.options`).  Every
// choice is an event in phase B's schedule.jsonl, written when it is made: a resumed atlas replays them and never decides
// one again, so a unit re-run after a crash plays the options its stage had.

import { createHash } from 'node:crypto';

import { means, quantile, spread } from './atlasmath.ts';
import { rng } from './rng.ts';
import type { BranchRow, Continuation, DecisionListing, Unit } from './atlas.ts';

/** The cut design's choices for one spine (every one off: phase B as D451 wrote it). */
export interface Cuts {
  /** The random-branch counts after which an option clearly below the leader stops; [] is off. */
  earlyStop: number[];
  /** The random branches of every option after which a near-decided decision is settled and replaced; 0 is off. */
  screen: number;
  /** Decisions are spread over those with at least this many options first; 1 is every listed decision. */
  minOptions: number;
  /** D489: the futility stop (absent: off, and the cuts' JSON -- plan.json, the schedule's plan hash -- is D480's). */
  futility?: Futility;
  /** D524: --only's list (absent: off, and the cuts' JSON is what it was without the flag). */
  only?: Only;
}

/**
 * D524: one decision `--only` branches: `d` its index in the baseline's listing, `options` the option indices played there
 * (two or more, distinct, option 0 -- Forge's own answer, the regret's reference -- among them), and `tokens` the listing the
 * caller expects at d (D511: the replay is the recorded game, so a baseline that lists anything else is another game).
 */
export interface OnlyEntry { d: number; options: number[]; tokens?: string[] }

/** D524: --only's list as the atlas keeps it -- entries by d, each one's options ascending -- and the sha256 of its JSON. */
export interface Only { entries: OnlyEntry[]; sha256: string }

/**
 * D489: the futility stop.  At early stopping's checkpoint `at` (an index into `earlyStop`), a decision whose option 0 --
 * Forge's own answer -- has the best mean over the paired rows of the options still running, or trails the best by `tie` or
 * less, stops: its regret cannot come out confidently above zero often enough to pay for the rest of its branches (the atlas
 * review of 2026-10-27: o0 leading or tied at 50 branches, 3 of 77 decisions ended confident).  A seeded `sample` share of the
 * decisions it would stop is played on to the full n anyway (`futilityControl`), so a night measures what the rule loses.
 */
export interface Futility { at: number; tie: number; sample: number }

/** D489: --futility-tie's default: o0 leads or ties exactly (the review's recommended row; D489 says why not .02). */
export const FUTILITY_TIE_DEFAULT = 0;
/** D489: --futility-sample's default: one in ten of the decisions the rule would stop is played to the full n. */
export const FUTILITY_SAMPLE_DEFAULT = 0.1;

export const CUTS_OFF: Cuts = { earlyStop: [], screen: 0, minOptions: 1 };

/** `--early-stop on`: the review's checkpoints (atlas-review 2026-10-24, 3b), for 200 random branches. */
export const EARLY_STOP_ON = [50, 100, 150] as const;

/** The screen's bounds on a decision's mean value (the review's 3d: 17 of 90 decisions, 8% of branch time, no confident label lost). */
export const SCREEN_LOW = 0.04;
export const SCREEN_HIGH = 0.96;

/** Whether any cut changes what phase B plays or records (a schedule.jsonl is written only then). */
export const cutsOn = (c: Cuts): boolean => c.earlyStop.length > 0 || c.screen > 0 || c.minOptions > 1 || c.futility !== undefined || c.only !== undefined;

/** Whether phase B has checkpoint barriers (units waiting for others). */
export const hasBarriers = (c: Cuts): boolean => c.earlyStop.length > 0 || c.screen > 0;

/** `--early-stop`: off, on (EARLY_STOP_ON), or a comma list of branch counts. */
export function parseEarlyStop(v: string | undefined): number[] {
  if (v === undefined || v === 'off') return [];
  if (v === 'on') return [...EARLY_STOP_ON];
  const xs = v.split(',').map((x) => Number(x.trim()));
  if (!xs.length || xs.some((x) => !Number.isInteger(x) || x < 1)) throw new Error('atlas: --early-stop takes off, on (50,100,150) or a comma list of branch counts');
  return xs;
}

/**
 * D489: `--futility`, `--futility-tie` and `--futility-sample`: off (undefined), or the checkpoint index with its margin and
 * control share.  The margin and the share without the rule are refused, so a job cannot believe it turned the rule on.
 */
export function parseFutility(v: string | undefined, tie: string | undefined, sample: string | undefined): Futility | undefined {
  if (v === undefined || v === 'off') {
    if (tie !== undefined || sample !== undefined) throw new Error('atlas: --futility-tie and --futility-sample need --futility <checkpoint index>');
    return undefined;
  }
  const at = Number(v);
  if (!/^\d+$/.test(v) || !Number.isInteger(at)) throw new Error('atlas: --futility takes off or a checkpoint index into --early-stop (0: the first)');
  const share = (x: string | undefined, d: number, flag: string): number => {
    const n = x === undefined ? d : Number(x);
    if (!Number.isFinite(n) || n < 0 || n > 1) throw new Error(`atlas: --${flag} wants a number from 0 to 1`);
    return n;
  };
  return { at, tie: share(tie, FUTILITY_TIE_DEFAULT, 'futility-tie'), sample: share(sample, FUTILITY_SAMPLE_DEFAULT, 'futility-sample') };
}

/**
 * D524: `--only`'s file, a JSON array of `{d, options, tokens?}`, checked and normalised (entries by d, options ascending, the
 * keys in that order) with the sha256 of the normalised JSON.  Refused: anything but a non-empty array of such objects; a key
 * other than the three; a d that is not a whole number >= 0, or named twice; fewer than two options, an option repeated, not a
 * whole number >= 0, or option 0 missing; tokens that are not strings, or an option at or past their count.  What the listing
 * holds at d is the baseline's to say (checkOnly).
 */
export function parseOnly(text: string): Only {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch (e) { throw new Error(`atlas: --only wants a JSON array of {d, options, tokens?}: ${(e as Error).message}`); }
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('atlas: --only wants a non-empty JSON array of {d, options, tokens?}');
  const whole = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0;
  const entries: OnlyEntry[] = raw.map((e: unknown, j) => {
    if (typeof e !== 'object' || e === null || Array.isArray(e)) throw new Error(`atlas: --only entry ${j} is not an object {d, options, tokens?}`);
    const x = e as Record<string, unknown>;
    const extra = Object.keys(x).filter((k) => !['d', 'options', 'tokens'].includes(k));
    if (extra.length) throw new Error(`atlas: --only entry ${j} has key(s) ${extra.join(', ')}; it takes d, options and tokens`);
    if (!whole(x.d)) throw new Error(`atlas: --only entry ${j}: d wants a whole number >= 0 (an index into the baseline's listing)`);
    const os = x.options;
    if (!Array.isArray(os) || os.length < 2 || !os.every(whole)) throw new Error(`atlas: --only d${x.d}: options wants two or more whole numbers >= 0`);
    if (new Set(os).size !== os.length) throw new Error(`atlas: --only d${x.d}: an option is named twice (${os.join(', ')})`);
    if (!os.includes(0)) throw new Error(`atlas: --only d${x.d}: option 0, Forge's own answer, must be among the options (the regret is against it)`);
    const options = [...(os as number[])].sort((a, b) => a - b);
    if (x.tokens === undefined) return { d: x.d, options };
    const t = x.tokens;
    if (!Array.isArray(t) || !t.every((y) => typeof y === 'string')) throw new Error(`atlas: --only d${x.d}: tokens wants an array of strings (the baseline's listing at d)`);
    if ((options.at(-1) as number) >= t.length) throw new Error(`atlas: --only d${x.d}: option ${options.at(-1)} is past the ${t.length} token(s) given`);
    return { d: x.d, options, tokens: [...(t as string[])] };
  }).sort((a, b) => a.d - b.d);
  for (let j = 1; j < entries.length; j++) if ((entries[j] as OnlyEntry).d === (entries[j - 1] as OnlyEntry).d) throw new Error(`atlas: --only names d${(entries[j] as OnlyEntry).d} twice`);
  return { entries, sha256: createHash('sha256').update(JSON.stringify(entries)).digest('hex') };
}

/**
 * D524: what the baseline's listing says of --only's list, before any unit: each entry's d must be listed, its options below
 * the listing's option count there, and its tokens (when given) the listing's, token for token.  Each failure is one line,
 * naming d and both token lists; [] is a list the atlas can play.
 */
export function checkOnly(only: Only, all: DecisionListing[]): string[] {
  const out: string[] = [];
  for (const e of only.entries) {
    const x = all[e.d];
    if (!x) { out.push(`d${e.d}: the baseline lists ${all.length} decision(s) (d0 to d${all.length - 1}); the list expected ${JSON.stringify(e.tokens ?? null)} there`); continue; }
    if (e.tokens && JSON.stringify(e.tokens) !== JSON.stringify(x.tokens)) { out.push(`d${e.d}: the baseline listed ${JSON.stringify(x.tokens)}, the list expected ${JSON.stringify(e.tokens)}`); continue; }
    const past = e.options.filter((o) => o >= x.tokens.length);
    if (past.length) out.push(`d${e.d}: option(s) ${past.join(', ')} past the ${x.tokens.length} the baseline listed (${JSON.stringify(x.tokens)})`);
  }
  return out;
}

/** D524: --only's picks: every entry, in order of d, with its options (checkOnly has passed, so each d is listed). */
export const onlyPicks = (all: DecisionListing[], only: Only): DecisionPick[] =>
  only.entries.map((e) => ({ d: e.d, k: (all[e.d] as DecisionListing).tokens.length, why: 'only' as const, options: [...e.options] }));

/** D489: the random-branch count the futility rule is read at (null: off). */
export const futilityAt = (c: Cuts): number | null => (c.futility ? (c.earlyStop[c.futility.at] ?? null) : null);

/** The cuts checked against the spine's branch counts: every barrier on a chunk boundary, increasing, below --branch-random. */
export function checkCuts(c: Cuts, branchRandom: number, chunk: number): void {
  const marks = [...(c.screen ? [c.screen] : []), ...c.earlyStop];
  for (const m of marks) {
    if (m % chunk !== 0) throw new Error(`atlas: a checkpoint (${m}) must be a multiple of --chunk (${chunk}), so no unit crosses it`);
    if (m >= branchRandom) throw new Error(`atlas: a checkpoint (${m}) must be below --branch-random (${branchRandom})`);
  }
  for (let j = 1; j < c.earlyStop.length; j++) if ((c.earlyStop[j] as number) <= (c.earlyStop[j - 1] as number)) throw new Error('atlas: --early-stop wants increasing branch counts');
  if (c.screen && c.earlyStop.length && c.screen > (c.earlyStop[0] as number)) throw new Error('atlas: --screen must come before the first --early-stop checkpoint');
  if (!Number.isInteger(c.minOptions) || c.minOptions < 1) throw new Error('atlas: --min-options wants a whole number >= 1');
  if (c.futility) {
    const f = c.futility;
    if (!Number.isInteger(f.at) || f.at < 0 || f.at >= c.earlyStop.length) throw new Error(`atlas: --futility ${f.at} names no --early-stop checkpoint (${c.earlyStop.length ? `0 to ${c.earlyStop.length - 1}: ${c.earlyStop.join(', ')}` : 'early stopping is off'})`);
    if (!(f.tie >= 0 && f.tie <= 1) || !(f.sample >= 0 && f.sample <= 1)) throw new Error('atlas: --futility-tie and --futility-sample want numbers from 0 to 1');
  }
  // D524: --only measures given options; nothing may decide on them after the pick
  if (c.only && (c.earlyStop.length || c.screen || c.minOptions > 1 || c.futility)) throw new Error('atlas: --only does not combine with --early-stop, --screen, --futility or --min-options above 1');
}

/** The ends of a decision's random stages: every barrier, then --branch-random.  One stage when no cut has a barrier. */
export function stageEnds(c: Cuts, branchRandom: number): number[] {
  return [...new Set([...(c.screen ? [c.screen] : []), ...c.earlyStop, branchRandom])].filter((x) => x <= branchRandom).sort((a, b) => a - b);
}

/**
 * D483: how many different plays a listed decision offers -- its options' distinct play identities (the bridge's
 * `SearchPolicy.identity`), or its token count for a listing written before D483, which has none.  `--min-options` counts
 * this, not the tokens: two options with one token can be two plays (an Adventure card's creature and its adventure cast
 * from the hand are both `cast:<id>`), and before D483 one play could be listed twice (Forge's doubled may-play twin).
 * The options a decision is BRANCHED over are still every listed one, by index (`DecisionPick.k` is the token count).
 */
export function playCount(listing: DecisionListing): number {
  return listing.identities?.length ? new Set(listing.identities).size : listing.tokens.length;
}

/**
 * D483: the listed decisions that offer one play twice -- two options with the same play identity -- each as
 * `d<n>: <identity> at options <i>, <j>`.  Empty for a listing written before D483 (no identities).  The atlas self-test
 * fails on any: the bridge's `SearchPolicy.alternatives` lists each play once, and a twin costs a whole option's branches.
 */
export function repeatedPlays(all: DecisionListing[]): string[] {
  const out: string[] = [];
  for (const x of all) {
    const at = new Map<string, number[]>();
    (x.identities ?? []).forEach((id, o) => at.set(id, [...(at.get(id) ?? []), o]));
    for (const [id, os] of at) if (os.length > 1) out.push(`d${x.d}: ${id} at options ${os.join(', ')}`);
  }
  return out;
}

/** Why a decision is branched: D451's spread, a fill from decisions under --min-options, the replacement of a screened one, or D524's list. */
export type PickWhy = 'spread' | 'fill' | 'replaces' | 'only';
/** D524: `options`, on an --only pick, the options the decision is branched at (absent: every listed one). */
export interface DecisionPick { d: number; k: number; why: PickWhy; replaces?: number; options?: number[] }

/**
 * The decisions phase B branches, before any screen: `n` of the listed ones spread evenly (D451) over those with at least
 * `minOptions` options; when fewer than `n` have that many, every one of them, and the rest spread over the others.  With
 * `minOptions` 1 this is exactly D451's `spread` over the whole listing.
 */
export function pickDecisions(all: DecisionListing[], n: number | 'all', minOptions: number): DecisionPick[] {
  const want = n === 'all' ? all.length : Math.min(n, all.length);
  const k = (d: number): number => (all[d] as DecisionListing).tokens.length;
  const plays = (d: number): number => playCount(all[d] as DecisionListing);   // D483: the --min-options count
  if (minOptions <= 1) return spread(all.length, want).map((d) => ({ d, k: k(d), why: 'spread' as const }));
  const eligible = all.map((_, d) => d).filter((d) => plays(d) >= minOptions);
  const rest = all.map((_, d) => d).filter((d) => plays(d) < minOptions);
  if (eligible.length >= want) return spread(eligible.length, want).map((j) => eligible[j] as number).map((d) => ({ d, k: k(d), why: 'spread' as const }));
  const fill = spread(rest.length, want - eligible.length).map((j) => rest[j] as number);
  return [...eligible.map((d) => ({ d, k: k(d), why: 'spread' as const })), ...fill.map((d) => ({ d, k: k(d), why: 'fill' as const }))].sort((a, b) => a.d - b.d);
}

/**
 * The decision that replaces screened decision `after`: the next listed decision not yet branched -- forward from it, then
 * back from it -- among those with at least `minOptions` options first, then among the rest.  Null when every listed
 * decision is branched.
 */
export function nextDecision(all: DecisionListing[], taken: Set<number>, after: number, minOptions: number): number | null {
  const order = [...Array.from({ length: all.length - after - 1 }, (_, j) => after + 1 + j), ...Array.from({ length: after }, (_, j) => after - 1 - j)];
  const plays = (d: number): number => playCount(all[d] as DecisionListing);   // D483: the --min-options count
  for (const pass of [true, false]) {
    for (const d of order) if (!taken.has(d) && (plays(d) >= minOptions) === pass) return d;
  }
  return null;
}

/** A decision's mean value at the screen: the mean of its options' means over the paired rows (null with none). */
export function screenMean(m: number[][], k: number): number | null {
  const mu = means(m, k);
  if (!m.length || mu.some((x) => x === null)) return null;
  return (mu as number[]).reduce((a, b) => a + b, 0) / k;
}

/** Whether a mean value is settled at the screen (<= SCREEN_LOW or >= SCREEN_HIGH). */
export const settledAt = (mean: number | null): boolean => mean !== null && (mean <= SCREEN_LOW || mean >= SCREEN_HIGH);

/**
 * The options that stop at a checkpoint.  `m` is the paired rows (one per branch index, every running option scored) over
 * the options `alive`, one column each in that order.  The leader is the running option with the highest mean (the first on
 * a tie); an option stops when the 2.5% point of the bootstrap distribution of (leader - option), the rows resampled together
 * (common random numbers), is above zero: its interval against the leader lies entirely below it.  Option 0 never stops.
 */
export function dropAt(m: number[][], alive: number[], boot: number, seed: number): { leader: number | null; dropped: number[]; low: Record<number, number | null> } {
  const low: Record<number, number | null> = {};
  if (m.length < 2 || alive.length < 2) return { leader: null, dropped: [], low };
  const mu = means(m, alive.length) as number[];
  let lead = 0;
  for (let j = 1; j < alive.length; j++) if ((mu[j] as number) > (mu[lead] as number)) lead = j;
  const r = rng(seed, 'atlas/early-stop');
  const diffs: number[][] = alive.map(() => []);
  for (let b = 0; b < boot; b++) {
    const sample: number[][] = [];
    for (let i = 0; i < m.length; i++) sample.push(m[r.int(m.length)] as number[]);
    const s = means(sample, alive.length) as number[];
    for (let j = 0; j < alive.length; j++) (diffs[j] as number[]).push((s[lead] as number) - (s[j] as number));
  }
  const dropped: number[] = [];
  for (let j = 0; j < alive.length; j++) {
    if (j === lead) continue;
    const q = quantile((diffs[j] as number[]).sort((x, y) => x - y), 0.025);
    low[alive[j] as number] = q === null ? null : Math.round(q * 1e4) / 1e4;
    if (alive[j] !== 0 && q !== null && q > 0) dropped.push(alive[j] as number);
  }
  return { leader: alive[lead] as number, dropped, low };
}

/** D489: what the futility rule reads at a checkpoint: option 0's mean, the best running option's, and the gap between them. */
export interface FutilityRead { o0Mean: number | null; best: number | null; bestMean: number | null; gap: number | null; futile: boolean }

/**
 * D489: the futility rule at a checkpoint.  `m` is the paired rows over the running options `alive` (option 0 among them: it
 * never stops), as dropAt reads them.  The best is the running option with the highest mean (the first on a tie, as dropAt's
 * leader); the gap is best's mean minus option 0's, never below zero; the decision is FUTILE when the gap is at most `tie`
 * (0: option 0 is a best).  No paired row -- every branch of some option errored -- is no evidence, and never futile.
 */
export function futileAt(m: number[][], alive: number[], tie: number): FutilityRead {
  const j0 = alive.indexOf(0);
  if (!m.length || j0 < 0) return { o0Mean: null, best: null, bestMean: null, gap: null, futile: false };
  const mu = means(m, alive.length) as number[];
  let lead = 0;
  for (let j = 1; j < alive.length; j++) if ((mu[j] as number) > (mu[lead] as number)) lead = j;
  const gap = (mu[lead] as number) - (mu[j0] as number);
  const r4 = (x: number): number => Math.round(x * 1e4) / 1e4;
  return { o0Mean: r4(mu[j0] as number), best: alive[lead] as number, bestMean: r4(mu[lead] as number), gap: r4(gap), futile: gap <= tie + 1e-12 };
}

/** D489: the futility control's seed for decision `d` (its own stream: no draw shared with early stopping's bootstrap). */
export const futilitySeed = (seed: number, d: number, at: number): number => seed * 1013 + d * 7919 + at;

/** D489: decision `d`'s control draw at checkpoint `at`, uniform on [0, 1): a decision the rule stops is a control when it is below the share. */
export const futilityDraw = (seed: number, d: number, at: number): number => rng(futilitySeed(seed, d, at), 'atlas/futility').next();

/** The checkpoint's bootstrap seed for decision `d`: a function of the atlas seed, the decision and the checkpoint. */
export const stopSeed = (seed: number, d: number, at: number): number => seed * 1009 + d * 7919 + at;

/** One line of phase B's schedule.jsonl: a decision picked, screened, or its options checked at a checkpoint. */
export type ScheduleEvent =
  | { v: 1; type: 'pick'; d: number; k: number; why: PickWhy; replaces?: number; options?: number[] }
  | { v: 1; type: 'screen'; d: number; at: number; mean: number | null; settled: boolean }
  | { v: 1; type: 'stop'; d: number; at: number; leader: number | null; dropped: number[]; alive: number[]; low: Record<number, number | null> }
  // D489: the futility rule read at its checkpoint, for every decision that reaches it: `futile` the rule's verdict, `control`
  // a futile decision played on anyway (its `draw` below the share), `stopped` a futile one that is not a control
  | ({ v: 1; type: 'futility'; d: number; at: number; alive: number[]; tie: number; sample: number; draw: number; control: boolean; stopped: boolean } & FutilityRead);

/**
 * D480's follow-up: the FIRST line of a schedule.jsonl the cuts write -- the plan its verdicts were made under.  A pick is
 * matched on replay by its `d` and `k` alone, so a resume against another plan (another --branch-random, --boot or
 * --decisions, or a deck file edited in place) would size `alive` wrong or fail late on a unit's `expect` tokens; atlas.ts
 * `openSchedule` refuses it instead.  `plan` is SCHEDULE_PLAN_KEYS' values, `planSha256` the sha256 of its JSON, and
 * `deckSha256` each deck file's bytes.
 */
export interface ScheduleHeader {
  v: 1; type: 'plan'; decision: 'D480';
  planSha256: string;
  deckSha256: { deckA: string; deckB: string };
  plan: Record<string, unknown>;
}

/** A line of schedule.jsonl: its header, then the events. */
export type ScheduleLine = ScheduleEvent | ScheduleHeader;

/** The events of a schedule.jsonl's lines, its header left out (a schedule written before the header has none). */
export const scheduleEvents = (lines: ScheduleLine[]): ScheduleEvent[] => lines.filter((l): l is ScheduleEvent => l.type !== 'plan');

/** A branch row as the schedule reads it. */
export type ScheduleRow = Pick<BranchRow, 'd' | 'c' | 'o' | 'i' | 'score' | 'error'> & { unavailable?: string };

/** What a decision's schedule says, for its label (atlas.json): where each option stopped, the Forge map's options, the screen. */
export interface DecisionCut {
  k: number; why: PickWhy; replaces?: number;
  /** Option -> the random-branch count it stopped at (an option absent ran to the end). */
  stoppedAt: Record<number, number>;
  /** The options the Forge map plays (null: every option). */
  forgeOptions: number[] | null;
  screened: boolean; screenMean?: number | null;
  /** D489: the futility rule's read at its checkpoint (absent: off, or the decision never reached it). */
  futility?: { at: number; gap: number | null; futile: boolean; control: boolean; stopped: boolean; alive: number[] };
  /** D524: the options --only branched the decision at (absent: every listed one). */
  only?: number[];
}

/** The schedule's events folded into each decision's cut (decisions in pick order). */
export function decisionCuts(events: ScheduleEvent[]): Map<number, DecisionCut> {
  const out = new Map<number, DecisionCut>();
  for (const e of events) {
    if (e.type === 'pick') out.set(e.d, { k: e.k, why: e.why, ...(e.replaces !== undefined ? { replaces: e.replaces } : {}), stoppedAt: {}, forgeOptions: null, screened: false, ...(e.options ? { only: [...e.options] } : {}) });
    const x = out.get(e.d);
    if (!x) continue;
    if (e.type === 'screen') { x.screenMean = e.mean; x.screened = e.settled; }
    if (e.type === 'stop') {
      for (const o of e.dropped) x.stoppedAt[o] = e.at;
      x.forgeOptions = e.alive.filter((o) => !e.dropped.includes(o));
    }
    if (e.type === 'futility') x.futility = { at: e.at, gap: e.gap, futile: e.futile, control: e.control, stopped: e.stopped, alive: [...e.alive] };
  }
  return out;
}

interface DState {
  d: number; k: number;
  /** The index of the stage whose units are out (stageEnds). */
  stage: number;
  alive: number[];
  done: boolean;
  /** Unit ids of the current stage not finished yet. */
  outstanding: Set<string>;
}

/** What the schedule needs of the atlas's options. */
export interface ScheduleOptions { branchRandom: number; branchForge: number; chunk: number; decisions: number | 'all'; boot: number; seed: number }

const uid = (u: Unit): string => `d${u.d}-${u.c}-${u.i0}`;

/** A pick's options at its first stage: D524's given ones, or every listed one. */
const aliveOf = (p: DecisionPick): number[] => (p.options ? [...p.options] : Array.from({ length: p.k }, (_, o) => o));

/**
 * Phase B's schedule under the cuts.  Built from the listing, the events already written (a resumed atlas) and the rows
 * already recorded; `initial` is every unit to play now, and each finished unit (`unitDone`) may release the decision's next
 * stage.  New events are handed to `write` as they are made.  With every cut off it plays exactly D451's units, in D451's
 * order (unitsOf), and writes nothing.
 */
export class AtlasSchedule {
  readonly ends: number[];
  readonly picks: DecisionPick[] = [];
  private readonly st = new Map<number, DState>();
  private readonly rows = new Map<number, Map<number, number[]>>();
  private readonly events: ScheduleEvent[] = [];
  private readonly recorded: { screen: Map<string, Extract<ScheduleEvent, { type: 'screen' }>>; stop: Map<string, Extract<ScheduleEvent, { type: 'stop' }>>; futility: Map<string, Extract<ScheduleEvent, { type: 'futility' }>> } = { screen: new Map(), stop: new Map(), futility: new Map() };
  /** Every unit admitted to the run (initial and released), by id: the say line's total. */
  readonly known = new Set<string>();
  initial: Unit[] = [];

  private readonly all: DecisionListing[];
  private readonly o: ScheduleOptions;
  private readonly cuts: Cuts;
  private readonly write: (e: ScheduleEvent) => void;

  constructor(all: DecisionListing[], o: ScheduleOptions, cuts: Cuts, prior: ScheduleEvent[], priorRows: ScheduleRow[], doneUnits: Set<string>, write: (e: ScheduleEvent) => void = () => {}) {
    this.all = all;
    this.o = o;
    this.cuts = cuts;
    this.write = write;
    this.ends = stageEnds(cuts, o.branchRandom);
    for (const r of priorRows) this.addRow(r);
    for (const e of prior) {
      this.events.push(e);
      if (e.type === 'pick') this.picks.push({ d: e.d, k: e.k, why: e.why, ...(e.replaces !== undefined ? { replaces: e.replaces } : {}), ...(e.options ? { options: [...e.options] } : {}) });
      if (e.type === 'screen') this.recorded.screen.set(`${e.d}:${e.at}`, e);
      if (e.type === 'stop') this.recorded.stop.set(`${e.d}:${e.at}`, e);
      if (e.type === 'futility') this.recorded.futility.set(`${e.d}:${e.at}`, e);
    }
    // D524: --only's list is the picks, each with its options; otherwise D451's spread (with --min-options)
    if (!this.picks.length) for (const p of cuts.only ? onlyPicks(all, cuts.only) : pickDecisions(all, o.decisions, cuts.minOptions)) this.pick(p);
    // replay each decision's stages: a stage whose checkpoint is recorded is applied as written; one whose units are all done
    // is decided now; the first stage with units still to play is where the decision stands
    for (let j = 0; j < this.picks.length; j++) {
      const p = this.picks[j] as DecisionPick;
      const s: DState = { d: p.d, k: p.k, stage: 0, alive: aliveOf(p), done: false, outstanding: new Set() };
      this.st.set(p.d, s);
      for (;;) {
        const units = this.stageUnits(s);
        const todo = units.filter((u) => !doneUnits.has(uid(u)));
        for (const u of todo) this.known.add(uid(u));
        this.initial.push(...todo);
        if (this.lastStage(s)) { s.outstanding = new Set(todo.filter((u) => u.c === 'random').map(uid)); s.done = true; break; }
        const at = this.ends[s.stage] as number;
        // D489: a futility read that stopped the decision writes no stop line at its checkpoint, so either line records it
        const futileStop = this.recorded.futility.get(`${s.d}:${at}`)?.stopped === true;
        const isRecorded = (!this.isScreen(at) || this.recorded.screen.has(`${s.d}:${at}`)) && (!this.isFutility(at) || this.recorded.futility.has(`${s.d}:${at}`))
          && (!this.isStop(at) || futileStop || this.recorded.stop.has(`${s.d}:${at}`));
        if (!isRecorded && todo.length) { s.outstanding = new Set(todo.map(uid)); break; }
        if (!this.checkpoint(s)) break;   // screened (settled, and replaced) or stopped by the futility rule (D489)
      }
    }
  }

  private pick(p: DecisionPick): void {
    this.picks.push(p);
    this.emit({ v: 1, type: 'pick', d: p.d, k: p.k, why: p.why, ...(p.replaces !== undefined ? { replaces: p.replaces } : {}), ...(p.options ? { options: [...p.options] } : {}) });
  }

  private emit(e: ScheduleEvent): void {
    this.events.push(e);
    if (cutsOn(this.cuts)) this.write(e);
  }

  private isScreen(at: number): boolean { return this.cuts.screen > 0 && at === this.cuts.screen; }
  private isStop(at: number): boolean { return this.cuts.earlyStop.includes(at); }
  private isFutility(at: number): boolean { return futilityAt(this.cuts) === at; }
  private lastStage(s: DState): boolean { return s.stage === this.ends.length - 1; }

  /** Stage `s.stage`'s units: random chunks over the running options, and on the last stage the Forge map's too. */
  private stageUnits(s: DState): Unit[] {
    const lo = s.stage === 0 ? 0 : (this.ends[s.stage - 1] as number), hi = this.ends[s.stage] as number;
    // D524: under --only every unit carries its decision's options, all of them given or not
    const options = s.alive.length < s.k || this.cuts.only ? { options: [...s.alive] } : {};
    const out: Unit[] = [];
    const chunks = (c: Continuation, a: number, b: number): void => { for (let i0 = a; i0 < b; i0 += this.o.chunk) out.push({ d: s.d, c, i0, i1: Math.min(b, i0 + this.o.chunk), ...options }); };
    chunks('random', lo, hi);
    if (this.lastStage(s)) chunks('forge', 0, this.o.branchForge);
    return out;
  }

  /** A branch row (as it is written): the random map's paired rows feed the checkpoints. */
  addRow(r: ScheduleRow): void {
    if (r.c !== 'random') return;
    const k = this.st.get(r.d)?.k ?? (this.all[r.d] as DecisionListing | undefined)?.tokens.length;
    if (k === undefined) return;
    const byI = this.rows.get(r.d) ?? new Map<number, number[]>();
    const row = byI.get(r.i) ?? new Array<number>(k).fill(Number.NaN);
    if (!r.error && !r.unavailable) row[r.o] = r.score;
    byI.set(r.i, row);
    this.rows.set(r.d, byI);
  }

  /** Decision `d`'s paired random rows below branch `at`, over `options` (rows where any of them is missing are left out). */
  private paired(d: number, at: number, options: number[]): number[][] {
    const byI = this.rows.get(d) ?? new Map<number, number[]>();
    return [...byI.entries()].filter(([i]) => i < at).sort((a, b) => a[0] - b[0]).map(([, row]) => options.map((o) => row[o] as number)).filter((row) => row.every((x) => !Number.isNaN(x)));
  }

  /**
   * The checkpoint at the end of `s`'s stage, from its recorded events or decided now: the screen, then the futility rule
   * (D489), then early stopping.  True when the decision goes on (its next stage is current), false when the screen settled it
   * (and its replacement is picked) or the futility rule stopped it (no replacement: its partial label is a decision's label).
   */
  private checkpoint(s: DState): boolean {
    const at = this.ends[s.stage] as number;
    if (this.isScreen(at)) {
      let e = this.recorded.screen.get(`${s.d}:${at}`);
      if (!e) {
        const mean = screenMean(this.paired(s.d, at, s.alive), s.alive.length);
        e = { v: 1, type: 'screen', d: s.d, at, mean: mean === null ? null : Math.round(mean * 1e4) / 1e4, settled: settledAt(mean) };
        this.recorded.screen.set(`${s.d}:${at}`, e);
        this.emit(e);
      }
      if (e.settled) {
        s.done = true;
        s.outstanding.clear();
        const taken = new Set(this.picks.map((p) => p.d));
        const next = nextDecision(this.all, taken, s.d, this.cuts.minOptions);
        const already = this.picks.some((p) => p.replaces === s.d);
        if (next !== null && !already) this.pick({ d: next, k: (this.all[next] as DecisionListing).tokens.length, why: 'replaces', replaces: s.d });
        return false;
      }
    }
    if (this.isFutility(at)) {
      const f = this.cuts.futility as Futility;
      let e = this.recorded.futility.get(`${s.d}:${at}`);
      if (!e) {
        const x = futileAt(this.paired(s.d, at, s.alive), s.alive, f.tie);
        const draw = Math.round(futilityDraw(this.o.seed, s.d, at) * 1e6) / 1e6;
        const control = x.futile && draw < f.sample;
        e = { v: 1, type: 'futility', d: s.d, at, alive: [...s.alive], tie: f.tie, sample: f.sample, ...x, draw, control, stopped: x.futile && !control };
        this.recorded.futility.set(`${s.d}:${at}`, e);
        this.emit(e);
      }
      if (e.stopped) {
        s.done = true;
        s.outstanding.clear();
        return false;
      }
    }
    if (this.isStop(at)) {
      let e = this.recorded.stop.get(`${s.d}:${at}`);
      if (!e) {
        const x = dropAt(this.paired(s.d, at, s.alive), s.alive, this.o.boot, stopSeed(this.o.seed, s.d, at));
        e = { v: 1, type: 'stop', d: s.d, at, leader: x.leader, dropped: x.dropped, alive: [...s.alive], low: x.low };
        this.recorded.stop.set(`${s.d}:${at}`, e);
        this.emit(e);
      }
      const dropped = e.dropped;
      s.alive = s.alive.filter((o) => !dropped.includes(o));
    }
    s.stage++;
    return true;
  }

  /**
   * A unit finished (its units.jsonl line is written, done or given up): when it was its decision's last outstanding unit of
   * the current stage, the checkpoint is decided and the next stage's units are returned -- or, after a screen that settled
   * the decision, the first units of the decision that replaces it.
   */
  unitDone(u: Unit): Unit[] {
    const s = this.st.get(u.d);
    if (!s || !s.outstanding.delete(uid(u)) || s.outstanding.size || s.done) return [];
    const before = this.picks.length;
    const out: Unit[] = [];
    if (this.checkpoint(s)) out.push(...this.open(s));
    for (const p of this.picks.slice(before)) {
      const n: DState = { d: p.d, k: p.k, stage: 0, alive: aliveOf(p), done: false, outstanding: new Set() };
      this.st.set(p.d, n);
      out.push(...this.open(n));
    }
    return out;
  }

  /** Put out `s`'s current stage. */
  private open(s: DState): Unit[] {
    const units = this.stageUnits(s);
    for (const u of units) this.known.add(uid(u));
    s.outstanding = new Set(units.filter((u) => u.c === 'random').map(uid));
    if (this.lastStage(s)) s.done = true;
    return units;
  }

  /** Every event, prior and new, in order. */
  allEvents(): ScheduleEvent[] { return [...this.events]; }

  /** The most units the run can have at once (the pool's worker count is capped by it). */
  maxUnits(): number {
    const perDecision = Math.ceil(this.o.branchRandom / this.o.chunk) + Math.ceil(this.o.branchForge / this.o.chunk);
    return Math.max(1, this.picks.length * perDecision);
  }
}

/**
 * The branch rows a spine would have kept under `cut`: a random row of an option early stopping stopped is gone from its stop
 * on, a Forge row of an option the Forge map did not play is gone, and a screened decision keeps its first `screen` random
 * branches and no Forge row.  On a finished spine's rows (branch i of every option on one seed, whatever else is played) this
 * is what the cut run records, which is how D480's numbers replay the review's on J158's and J162's branches.  D489: a decision
 * the futility rule stopped keeps its random branches below the checkpoint and no Forge row.
 */
export function rowsUnderCut<R extends Pick<BranchRow, 'c' | 'o' | 'i'>>(rows: R[], cut: DecisionCut | undefined, screen: number): R[] {
  if (!cut) return rows;
  return rows.filter((r) => {
    if (cut.screened) return r.c === 'random' && r.i < screen;
    if (cut.futility?.stopped) return r.c === 'random' && r.i < cut.futility.at;   // D489: a partial label, no Forge map
    if (r.c === 'random') return cut.stoppedAt[r.o] === undefined || r.i < (cut.stoppedAt[r.o] as number);
    return !cut.forgeOptions || cut.forgeOptions.includes(r.o);
  });
}
