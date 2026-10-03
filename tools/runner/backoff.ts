// mtg-table — the lab runner: back off on memory pressure, not on a timer (D337).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Every sample (about every 10 s) the runner reads /proc/pressure/memory
// ("some avg10": the share of the last 10 s some task stalled on memory, in
// percent), the swap-in rate from /proc/vmstat's pswpin, and the job unit's
// memory.current.  `decide` turns a sample into at most one action:
//
//   HIGH  some avg10 >= highSome or swap-in >= highSwapIn pages/s, for
//         `highSamples` samples in a row:
//         drop a worker (control file maxWorkers − 1), at most once per
//         `dropCooldownS`; at 1 worker, pause new games instead.
//   HARD  some avg10 >= hardSome, or the job's memory above `hardFraction` of
//         its MemoryMax, for `hardSamples` in a row, while the job is already
//         down to one worker or paused — or at once, if the job cannot be told
//         (no control file support): stop the job (TERM), `waiting`, reason
//         memory, retried later with fewer workers.
//   LOW   some avg10 < lowSome and swap-in < lowSwapIn for `lowSamples` in a
//         row: lift a pause first, then add a worker back, at most once per
//         `raiseCooldownS`, never above the sized count.
//
// Pure: the state goes in and comes out, and the tests drive it with numbers.

export interface BackoffConfig {
  highSome: number;
  highSwapIn: number;
  highSamples: number;
  hardSome: number;
  hardFraction: number;
  hardSamples: number;
  lowSome: number;
  lowSwapIn: number;
  lowSamples: number;
  dropCooldownS: number;
  raiseCooldownS: number;
}

export const DEFAULT_BACKOFF: BackoffConfig = {
  highSome: 10, highSwapIn: 2000, highSamples: 2,
  hardSome: 40, hardFraction: 0.95, hardSamples: 3,
  lowSome: 2, lowSwapIn: 100, lowSamples: 12,
  dropCooldownS: 60, raiseCooldownS: 300,
};

export interface Sample {
  at: number;
  /** /proc/pressure/memory some avg10, percent. */
  some10: number;
  /** pages swapped in per second since the last sample. */
  swapIn: number;
  /** The job unit's memory.current and MemoryMax, GB (null when unknown). */
  jobGb: number | null;
  jobMaxGb: number | null;
}

export interface BackoffState {
  /** The workers the job was sized to: never raised above. */
  sized: number;
  /** The control file's current maxWorkers. */
  workers: number;
  paused: boolean;
  highRun: number;
  hardRun: number;
  lowRun: number;
  lastDrop: number;
  lastRaise: number;
}

export type Action =
  | { kind: 'drop'; workers: number; why: string }
  | { kind: 'pause'; why: string }
  | { kind: 'resume'; why: string }
  | { kind: 'raise'; workers: number; why: string }
  | { kind: 'stop'; why: string };

export function initialBackoff(workers: number): BackoffState {
  return { sized: workers, workers, paused: false, highRun: 0, hardRun: 0, lowRun: 0, lastDrop: -Infinity, lastRaise: -Infinity };
}

export function decide(s: BackoffState, x: Sample, canControl: boolean, c: BackoffConfig = DEFAULT_BACKOFF): { state: BackoffState; action: Action | null } {
  const st = { ...s };
  const memHard = x.jobGb !== null && x.jobMaxGb !== null && x.jobMaxGb > 0 && x.jobGb >= c.hardFraction * x.jobMaxGb;
  const high = x.some10 >= c.highSome || x.swapIn >= c.highSwapIn;
  const hard = x.some10 >= c.hardSome || memHard;
  const low = x.some10 < c.lowSome && x.swapIn < c.lowSwapIn && !memHard;
  st.highRun = high ? st.highRun + 1 : 0;
  st.hardRun = hard ? st.hardRun + 1 : 0;
  st.lowRun = low ? st.lowRun + 1 : 0;
  const why = `some avg10 ${x.some10.toFixed(1)}%, swap-in ${Math.round(x.swapIn)}/s${x.jobGb !== null ? `, job ${x.jobGb.toFixed(1)}${x.jobMaxGb ? `/${x.jobMaxGb}` : ''} GB` : ''}`;

  // Stop when nothing gentler is left, or when the hard line holds four times as long anyway (a job
  // that does not read the control file, whatever it says).
  if ((st.hardRun >= c.hardSamples && (!canControl || st.paused || st.workers <= 1)) || st.hardRun >= 4 * c.hardSamples) {
    st.hardRun = 0;
    return { state: st, action: { kind: 'stop', why } };
  }
  if (!canControl) return { state: st, action: null };
  if (st.highRun >= c.highSamples && x.at - st.lastDrop >= c.dropCooldownS * 1000) {
    st.lastDrop = x.at;
    st.highRun = 0;
    st.lowRun = 0;
    if (st.workers > 1) {
      st.workers -= 1;
      return { state: st, action: { kind: 'drop', workers: st.workers, why } };
    }
    if (!st.paused) {
      st.paused = true;
      return { state: st, action: { kind: 'pause', why } };
    }
    return { state: st, action: null };
  }
  if (st.lowRun >= c.lowSamples && x.at - st.lastRaise >= c.raiseCooldownS * 1000 && x.at - st.lastDrop >= c.raiseCooldownS * 1000) {
    if (st.paused) {
      st.paused = false;
      st.lastRaise = x.at;
      st.lowRun = 0;
      return { state: st, action: { kind: 'resume', why } };
    }
    if (st.workers < st.sized) {
      st.workers += 1;
      st.lastRaise = x.at;
      st.lowRun = 0;
      return { state: st, action: { kind: 'raise', workers: st.workers, why } };
    }
  }
  return { state: st, action: null };
}

/** The retry's worker cap after a memory stop: one fewer than ran, at least 1. */
export const retryCap = (workers: number): number => Math.max(1, workers - 1);

/** Parse /proc/pressure/memory's "some" line. */
export function parsePressure(text: string): { some10: number; full10: number } {
  const some = /^some\b.*?avg10=([\d.]+)/m.exec(text);
  const full = /^full\b.*?avg10=([\d.]+)/m.exec(text);
  return { some10: some ? Number(some[1]) : 0, full10: full ? Number(full[1]) : 0 };
}
