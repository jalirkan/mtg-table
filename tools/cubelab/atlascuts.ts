// mtg-table — the cube lab: the move atlas's CUT DESIGN (D480, amending D451).  Pure and engine-free.
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Three of D480's five flags change which branches phase B plays, and all three are decided here, from the branch rows
// alone, so a test can replay them on a finished spine's rows:
//
//   --min-options k    the decisions are spread over those the baseline listed with k or more options; when fewer than the
//                      spine's count have k, the rest are filled from the others, spread the same way (`pickDecisions`).
//   --screen n         after n random branches of every option, a decision whose mean value -- the mean of its options'
//                      means -- is <= .04 or >= .96 is SETTLED: it keeps those n branches as a cheap label (`screened`), is
//                      branched no further, and the next listed decision not yet branched takes its place (`nextDecision`).
//   --early-stop a,b,c after a, b and c random branches, an option whose paired-bootstrap interval against the current leader
//                      lies entirely below zero stops there (`dropAt`); option 0, Forge's own answer, never stops, so the
//                      label (regret against option 0) keeps all of its branches.  The Forge map plays only the options still
//                      running after the last checkpoint.
//
// A unit that crosses no checkpoint is the unit it always was; a decision's next units wait for every unit of its current
// stage (the checkpoint BARRIER), and the units after a checkpoint carry the options still running (`Unit.options`).  Every
// choice is an event in phase B's schedule.jsonl, written when it is made: a resumed atlas replays them and never decides
// one again, so a unit re-run after a crash plays the options its stage had.

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
}

export const CUTS_OFF: Cuts = { earlyStop: [], screen: 0, minOptions: 1 };

/** `--early-stop on`: the review's checkpoints (atlas-review 2026-10-24, 3b), for 200 random branches. */
export const EARLY_STOP_ON = [50, 100, 150] as const;

/** The screen's bounds on a decision's mean value (the review's 3d: 17 of 90 decisions, 8% of branch time, no confident label lost). */
export const SCREEN_LOW = 0.04;
export const SCREEN_HIGH = 0.96;

/** Whether any cut changes what phase B plays or records (a schedule.jsonl is written only then). */
export const cutsOn = (c: Cuts): boolean => c.earlyStop.length > 0 || c.screen > 0 || c.minOptions > 1;

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
}

/** The ends of a decision's random stages: every barrier, then --branch-random.  One stage when no cut has a barrier. */
export function stageEnds(c: Cuts, branchRandom: number): number[] {
  return [...new Set([...(c.screen ? [c.screen] : []), ...c.earlyStop, branchRandom])].filter((x) => x <= branchRandom).sort((a, b) => a - b);
}

/** Why a decision is branched: D451's spread, a fill from decisions under --min-options, or the replacement of a screened one. */
export type PickWhy = 'spread' | 'fill' | 'replaces';
export interface DecisionPick { d: number; k: number; why: PickWhy; replaces?: number }

/**
 * The decisions phase B branches, before any screen: `n` of the listed ones spread evenly (D451) over those with at least
 * `minOptions` options; when fewer than `n` have that many, every one of them, and the rest spread over the others.  With
 * `minOptions` 1 this is exactly D451's `spread` over the whole listing.
 */
export function pickDecisions(all: DecisionListing[], n: number | 'all', minOptions: number): DecisionPick[] {
  const want = n === 'all' ? all.length : Math.min(n, all.length);
  const k = (d: number): number => (all[d] as DecisionListing).tokens.length;
  if (minOptions <= 1) return spread(all.length, want).map((d) => ({ d, k: k(d), why: 'spread' as const }));
  const eligible = all.map((_, d) => d).filter((d) => k(d) >= minOptions);
  const rest = all.map((_, d) => d).filter((d) => k(d) < minOptions);
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
  const k = (d: number): number => (all[d] as DecisionListing).tokens.length;
  for (const pass of [true, false]) {
    for (const d of order) if (!taken.has(d) && (k(d) >= minOptions) === pass) return d;
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

/** The checkpoint's bootstrap seed for decision `d`: a function of the atlas seed, the decision and the checkpoint. */
export const stopSeed = (seed: number, d: number, at: number): number => seed * 1009 + d * 7919 + at;

/** One line of phase B's schedule.jsonl: a decision picked, screened, or its options checked at a checkpoint. */
export type ScheduleEvent =
  | { v: 1; type: 'pick'; d: number; k: number; why: PickWhy; replaces?: number }
  | { v: 1; type: 'screen'; d: number; at: number; mean: number | null; settled: boolean }
  | { v: 1; type: 'stop'; d: number; at: number; leader: number | null; dropped: number[]; alive: number[]; low: Record<number, number | null> };

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
}

/** The schedule's events folded into each decision's cut (decisions in pick order). */
export function decisionCuts(events: ScheduleEvent[]): Map<number, DecisionCut> {
  const out = new Map<number, DecisionCut>();
  for (const e of events) {
    if (e.type === 'pick') out.set(e.d, { k: e.k, why: e.why, ...(e.replaces !== undefined ? { replaces: e.replaces } : {}), stoppedAt: {}, forgeOptions: null, screened: false });
    const x = out.get(e.d);
    if (!x) continue;
    if (e.type === 'screen') { x.screenMean = e.mean; x.screened = e.settled; }
    if (e.type === 'stop') {
      for (const o of e.dropped) x.stoppedAt[o] = e.at;
      x.forgeOptions = e.alive.filter((o) => !e.dropped.includes(o));
    }
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
  private readonly recorded: { screen: Map<string, Extract<ScheduleEvent, { type: 'screen' }>>; stop: Map<string, Extract<ScheduleEvent, { type: 'stop' }>> } = { screen: new Map(), stop: new Map() };
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
      if (e.type === 'pick') this.picks.push({ d: e.d, k: e.k, why: e.why, ...(e.replaces !== undefined ? { replaces: e.replaces } : {}) });
      if (e.type === 'screen') this.recorded.screen.set(`${e.d}:${e.at}`, e);
      if (e.type === 'stop') this.recorded.stop.set(`${e.d}:${e.at}`, e);
    }
    if (!this.picks.length) for (const p of pickDecisions(all, o.decisions, cuts.minOptions)) this.pick(p);
    // replay each decision's stages: a stage whose checkpoint is recorded is applied as written; one whose units are all done
    // is decided now; the first stage with units still to play is where the decision stands
    for (let j = 0; j < this.picks.length; j++) {
      const p = this.picks[j] as DecisionPick;
      const s: DState = { d: p.d, k: p.k, stage: 0, alive: Array.from({ length: p.k }, (_, o) => o), done: false, outstanding: new Set() };
      this.st.set(p.d, s);
      for (;;) {
        const units = this.stageUnits(s);
        const todo = units.filter((u) => !doneUnits.has(uid(u)));
        for (const u of todo) this.known.add(uid(u));
        this.initial.push(...todo);
        if (this.lastStage(s)) { s.outstanding = new Set(todo.filter((u) => u.c === 'random').map(uid)); s.done = true; break; }
        const at = this.ends[s.stage] as number;
        const isRecorded = (!this.isScreen(at) || this.recorded.screen.has(`${s.d}:${at}`)) && (!this.isStop(at) || this.recorded.stop.has(`${s.d}:${at}`));
        if (!isRecorded && todo.length) { s.outstanding = new Set(todo.map(uid)); break; }
        if (!this.checkpoint(s)) break;   // screened: settled, and replaced
      }
    }
  }

  private pick(p: DecisionPick): void {
    this.picks.push(p);
    this.emit({ v: 1, type: 'pick', d: p.d, k: p.k, why: p.why, ...(p.replaces !== undefined ? { replaces: p.replaces } : {}) });
  }

  private emit(e: ScheduleEvent): void {
    this.events.push(e);
    if (cutsOn(this.cuts)) this.write(e);
  }

  private isScreen(at: number): boolean { return this.cuts.screen > 0 && at === this.cuts.screen; }
  private isStop(at: number): boolean { return this.cuts.earlyStop.includes(at); }
  private lastStage(s: DState): boolean { return s.stage === this.ends.length - 1; }

  /** Stage `s.stage`'s units: random chunks over the running options, and on the last stage the Forge map's too. */
  private stageUnits(s: DState): Unit[] {
    const lo = s.stage === 0 ? 0 : (this.ends[s.stage - 1] as number), hi = this.ends[s.stage] as number;
    const options = s.alive.length < s.k ? { options: [...s.alive] } : {};
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
   * The checkpoint at the end of `s`'s stage, from its recorded events or decided now: the screen, then early stopping.  True
   * when the decision goes on (its next stage is current), false when the screen settled it (and its replacement is picked).
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
      const n: DState = { d: p.d, k: p.k, stage: 0, alive: Array.from({ length: p.k }, (_, o) => o), done: false, outstanding: new Set() };
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
 * is what the cut run records, which is how D480's numbers replay the review's on J158's and J162's branches.
 */
export function rowsUnderCut<R extends Pick<BranchRow, 'c' | 'o' | 'i'>>(rows: R[], cut: DecisionCut | undefined, screen: number): R[] {
  if (!cut) return rows;
  return rows.filter((r) => {
    if (cut.screened) return r.c === 'random' && r.i < screen;
    if (r.c === 'random') return cut.stoppedAt[r.o] === undefined || r.i < (cut.stoppedAt[r.o] as number);
    return !cut.forgeOptions || cut.forgeOptions.includes(r.o);
  });
}
