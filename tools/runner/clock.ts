// mtg-table — the lab runner: the two clocks, and waiting for the wall clock to be right (D461).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Justin's PC dual-boots, and Windows wrote local time to the RTC: Linux came up with the wall clock
// 4 h behind until NTP set it right a minute or two later.  Twice in one week the runner measured a
// duration across that jump -- J143 "ran 9 h" after 5 h, and the git probe said the remote "still does
// not answer 543 min after the start" -- and D459 found the cube lab's watchdog killing workers for
// the same reason.  So:
//
//   - every elapsed-time DECISION in the runner (a step's timeout, the prepare-retry window, the git
//     probe's "since the start", the memory-stop settle, the loop's own cadences, the pressure
//     backoff's cooldowns) reads `Sys.mono()`, CLOCK_MONOTONIC in milliseconds, which NTP and an RTC
//     fix never step.  It counts from the boot, so the same number means the same instant in every
//     process of one boot, and nothing across a reboot: a stamp persisted in run.json carries the boot
//     id it was taken in, and a stamp from another boot (or from before D461, wall-clock) is carried
//     over ONCE, when the runner loads it, by the wall time since (`monoFromWall`);
//   - wall-clock times stay for what people read: STATUS, status.json, the logs, `retry_after:`;
//   - `retry_after:`, a wall time in STATUS, is read back defensively (`retryHolds`): one further in
//     the future than the runner ever writes means the clock moved backwards, and the job is due;
//   - the user unit waits, before the daemon starts, for `timedatectl` to say NTPSynchronized=yes, at
//     most `CLOCK_WAIT_MAX_S` (`waitForClockSync`, `tools/runner.sh wait-clock`), and the daemon's
//     start line says what it found (`clockText`).

import fs from 'node:fs';
import path from 'node:path';

/** CLOCK_MONOTONIC in ms (libuv's hrtime on Linux): since the boot, the same in every process of it, never stepped. */
export function monoMs(): number {
  return Number(process.hrtime.bigint() / 1_000_000n);
}

/** /proc/sys/kernel/random/boot_id, or null (not Linux). */
export function readBootId(read: (f: string) => string = (f) => fs.readFileSync(f, 'utf8')): string | null {
  try { return read('/proc/sys/kernel/random/boot_id').trim() || null; } catch { return null; }
}

/**
 * A wall-clock stamp carried into monotonic time: the monotonic now less the wall time since.  A past
 * stamp never lands in the future (a clock that went backwards makes it "just now"); a future one
 * (`maxAheadMs` > 0: a retry's next try) is at most that far ahead.  Not a finite number: -Infinity
 * (never happened; JSON writes -Infinity as null).
 */
export function monoFromWall(wallAt: unknown, wallNow: number, monoNow: number, maxAheadMs = 0): number {
  if (typeof wallAt !== 'number' || !Number.isFinite(wallAt)) return -Infinity;
  return monoNow + Math.min(maxAheadMs, wallAt - wallNow);
}

/** A monotonic time for a log line: the wall time it corresponds to now. */
export function wallOfMono(monoAt: number, wallNow: number, monoNow: number): number {
  return wallNow + (monoAt - monoNow);
}

/**
 * Whether a `retry_after:` wall time still holds a job back.  It holds while it is in the future by no
 * more than `maxAheadMs` (the longest wait the runner writes, plus a minute); further ahead than that,
 * the clock went backwards since it was written (a boot with the RTC behind), and the job is due.
 */
export function retryHolds(retryAt: number, wallNow: number, maxAheadMs: number): boolean {
  return Number.isFinite(retryAt) && retryAt > wallNow && retryAt - wallNow <= maxAheadMs;
}

// ------------------------------------------------------------------ waiting for NTP

/** What `timedatectl show -p NTPSynchronized --value` says: yes, no, or unknown (no timedated, no answer). */
export type ClockSync = 'yes' | 'no' | 'unknown';

/** The user unit's ExecStartPre waits at most this long; then the daemon starts anyway (and says so). */
export const CLOCK_WAIT_MAX_S = 600;
/** An `unknown` this long (timedated absent or not answering) ends the wait early: there is nothing to wait for. */
export const CLOCK_UNKNOWN_GIVE_UP_S = 30;
export const CLOCK_WAIT_FILE = 'clock-wait.json';

export function parseNtpSynchronized(code: number, stdout: string): ClockSync {
  if (code !== 0) return 'unknown';
  const v = stdout.trim();
  return v === 'yes' ? 'yes' : v === 'no' ? 'no' : 'unknown';
}

export interface ClockWait {
  /** The last answer. */
  sync: ClockSync;
  waitedS: number;
  /** Why the wait ended: synced, the cap, timedated never answered. */
  ended: 'synced' | 'cap' | 'unknown';
  /** Written by the unit's ExecStartPre; the daemon of the same start shares the unit's INVOCATION_ID. */
  invocationId: string | null;
  bootId: string | null;
  /** monoMs() when the wait ended, to tell this start's record from a stale one when there is no invocation id. */
  monoAt: number;
  at: string;
}

/** Poll until synced, or `maxS` passes, or `unknown` lasts `unknownGiveUpS`; every duration on the monotonic clock. */
export async function waitForClockSync(o: {
  check: () => ClockSync; mono: () => number; sleep: (ms: number) => Promise<void>;
  maxS?: number; pollMs?: number; unknownGiveUpS?: number; log?: (s: string) => void;
}): Promise<{ sync: ClockSync; waitedS: number; ended: ClockWait['ended'] }> {
  const maxMs = (o.maxS ?? CLOCK_WAIT_MAX_S) * 1000;
  const giveUpMs = (o.unknownGiveUpS ?? CLOCK_UNKNOWN_GIVE_UP_S) * 1000;
  const t0 = o.mono();
  let unknownSince: number | null = null;
  let said = false;
  for (;;) {
    const sync = o.check();
    const now = o.mono();
    const waitedS = Math.round((now - t0) / 1000);
    if (sync === 'yes') return { sync, waitedS, ended: 'synced' };
    if (sync === 'unknown') {
      unknownSince ??= now;
      if (now - unknownSince >= giveUpMs) return { sync, waitedS, ended: 'unknown' };
    } else unknownSince = null;
    if (now - t0 >= maxMs) return { sync, waitedS, ended: 'cap' };
    if (!said) { o.log?.(`clock: NTPSynchronized=${sync}; waiting up to ${Math.round(maxMs / 1000)} s for NTP before the runner starts (D461)`); said = true; }
    await o.sleep(o.pollMs ?? 2000);
  }
}

export function writeClockWait(stateDir: string, w: ClockWait): void {
  fs.mkdirSync(stateDir, { recursive: true });
  const f = path.join(stateDir, CLOCK_WAIT_FILE);
  fs.writeFileSync(`${f}.part`, `${JSON.stringify(w, null, 1)}\n`);
  fs.renameSync(`${f}.part`, f);
}

/** This start's wait record: the same systemd invocation, else the same boot and at most `maxAgeMs` ago; else null. */
export function readClockWait(stateDir: string, now: { invocationId: string | null; bootId: string | null; mono: number }, maxAgeMs = 15 * 60_000): ClockWait | null {
  let w: ClockWait;
  try { w = JSON.parse(fs.readFileSync(path.join(stateDir, CLOCK_WAIT_FILE), 'utf8')) as ClockWait; } catch { return null; }
  if (now.invocationId && w.invocationId) return w.invocationId === now.invocationId ? w : null;
  if (!w.bootId || w.bootId !== now.bootId) return null;
  return now.mono - w.monoAt >= 0 && now.mono - w.monoAt <= maxAgeMs ? w : null;
}

/** The clock's part of the daemon's start line (restart.ts `restartReason`). */
export function clockText(wait: ClockWait | null, syncNow: ClockSync): string {
  const now = syncNow === 'yes' ? 'synchronized' : syncNow === 'no' ? 'NOT synchronized' : 'sync unknown (timedatectl did not answer)';
  if (!wait) return `clock ${now}, no wait recorded (not started by the unit's ExecStartPre)`;
  const how = wait.ended === 'synced'
    ? (wait.waitedS ? `NTP synchronized after a ${wait.waitedS}-s wait` : 'NTP synchronized at once')
    : wait.ended === 'cap'
      ? `NTP still not synchronized after the ${wait.waitedS}-s wait (started anyway)`
      : `timedatectl did not answer for ${wait.waitedS} s (started without waiting)`;
  return `clock: ${how}; ${now} now; elapsed times are monotonic (D461)`;
}
