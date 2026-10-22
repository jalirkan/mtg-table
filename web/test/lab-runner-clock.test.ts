/*
 * mtg-table — web/test/lab-runner-clock.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The lab runner's two clocks (tools/runner/clock.ts, D461).  Justin's PC dual-boots and came up with
 * the wall clock 4 h behind until NTP stepped it; durations measured on it fired timeouts (J143 "ran
 * 9 h" after 5 h; the git probe's "543 min after the start").  The runner's own decisions under a
 * stepped clock are lab-runner.test.ts's (its FakeSys has `wallSkew`); this file holds the pieces:
 *
 *  - monoFromWall / wallOfMono / retryHolds: carrying a wall stamp over, and retry_after read back;
 *  - waitForClockSync: synced at once, after a wait, never (the cap), timedated absent;
 *  - clock-wait.json: this start's record by invocation id, else by boot and age;
 *  - clockText and the restart reason's clock part; the unit's ExecStartPre, TimeoutStartSec, After=;
 *  - the pool's control reader keeps reading under a wall clock stepped back;
 *  - realSys().mono() is CLOCK_MONOTONIC (hrtime), and host().at is on it.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { CLOCK_WAIT_FILE, CLOCK_WAIT_MAX_S, clockText, monoFromWall, monoMs, parseNtpSynchronized, readClockWait, retryHolds, waitForClockSync, wallOfMono, writeClockWait, type ClockSync, type ClockWait } from '../../tools/runner/clock.ts';
import { controlReader, writeControl } from '../../tools/runner/control.ts';
import { restartReason, type StartFacts } from '../../tools/runner/restart.ts';
import { MEMORY_RETRY_MS } from '../../tools/runner/schedule.ts';
import { serviceUnit } from '../../tools/runner/sizing.ts';
import { realSys } from '../../tools/runner/sys.ts';

const tmp = (): string => fs.mkdtempSync(path.join(os.tmpdir(), 'runner-clock-'));
const H = 3600_000;

test('monoFromWall: a past stamp is the wall time since, never in the future; a pending one at most its cap ahead; none is -Infinity', () => {
  const wall = Date.parse('2026-10-22T12:00:00Z'), mono = 5 * H;
  assert.equal(monoFromWall(wall - 20 * 60_000, wall, mono), mono - 20 * 60_000);
  assert.equal(monoFromWall(wall + 4 * H, wall, mono), mono, 'a clock now behind the stamp: just now');
  assert.equal(monoFromWall(wall + 90_000, wall, mono, 120_000), mono + 90_000);
  assert.equal(monoFromWall(wall + 4 * H, wall, mono, 120_000), mono + 120_000);
  assert.equal(monoFromWall(null, wall, mono), -Infinity);
  assert.equal(monoFromWall(undefined, wall, mono), -Infinity);
  assert.equal(wallOfMono(mono + 15_000, wall, mono), wall + 15_000);
});

test('retryHolds: future within the cap holds; past, unparseable, or further ahead than the runner writes (the clock went backwards) is due', () => {
  const now = Date.parse('2026-10-22T12:00:00Z'), cap = MEMORY_RETRY_MS + 60_000;
  assert.equal(retryHolds(now + 10 * 60_000, now, cap), true);
  assert.equal(retryHolds(now - 1, now, cap), false);
  assert.equal(retryHolds(NaN, now, cap), false);
  assert.equal(retryHolds(now + 4 * H + 10 * 60_000, now, cap), false);
});

/** A fake clock and a scripted timedatectl: each sleep moves the clock. */
function scripted(answers: ClockSync[]): { check: () => ClockSync; mono: () => number; sleep: (ms: number) => Promise<void>; polls: () => number } {
  let t = 0, i = 0;
  return {
    check: () => answers[Math.min(i++, answers.length - 1)] as ClockSync,
    mono: () => t,
    sleep: async (ms) => { t += ms; },
    polls: () => i,
  };
}

test('waitForClockSync: yes at once; yes after a wait; the cap; timedated absent gives up early', async () => {
  let s = scripted(['yes']);
  assert.deepEqual(await waitForClockSync(s), { sync: 'yes', waitedS: 0, ended: 'synced' });
  s = scripted(['no', 'no', 'no', 'yes']);
  const logs: string[] = [];
  assert.deepEqual(await waitForClockSync({ ...s, log: (l) => logs.push(l) }), { sync: 'yes', waitedS: 6, ended: 'synced' });
  assert.equal(logs.length, 1, 'said once');
  assert.match(logs[0] ?? '', /NTPSynchronized=no; waiting up to 600 s/);
  s = scripted(['no']);
  assert.deepEqual(await waitForClockSync({ ...s, maxS: 60 }), { sync: 'no', waitedS: 60, ended: 'cap' });
  assert.equal(s.polls(), 31);
  s = scripted(['unknown']);
  assert.deepEqual(await waitForClockSync(s), { sync: 'unknown', waitedS: 30, ended: 'unknown' });
  // An `unknown` between `no`s (timedated starting) does not end it early.
  s = scripted(['no', 'unknown', 'no', 'no', 'yes']);
  assert.equal((await waitForClockSync(s)).ended, 'synced');
  assert.equal(CLOCK_WAIT_MAX_S, 600);
  assert.equal(parseNtpSynchronized(0, 'yes\n'), 'yes');
  assert.equal(parseNtpSynchronized(0, 'no\n'), 'no');
  assert.equal(parseNtpSynchronized(1, ''), 'unknown');
  assert.equal(parseNtpSynchronized(0, 'maybe'), 'unknown');
});

test('clock-wait.json: this start\'s by invocation id; else the same boot within 15 min; a stale or other one is none', () => {
  const d = tmp();
  const rec: ClockWait = { sync: 'yes', waitedS: 42, ended: 'synced', invocationId: 'inv-1', bootId: 'boot-a', monoAt: 10 * H, at: '2026-10-22T08:00:00-04:00' };
  assert.equal(readClockWait(d, { invocationId: 'inv-1', bootId: 'boot-a', mono: 10 * H }), null, 'no file');
  writeClockWait(d, rec);
  assert.deepEqual(fs.readdirSync(d), [CLOCK_WAIT_FILE]);
  assert.deepEqual(readClockWait(d, { invocationId: 'inv-1', bootId: 'boot-a', mono: 99 * H }), rec);
  assert.equal(readClockWait(d, { invocationId: 'inv-2', bootId: 'boot-a', mono: 10 * H }), null, 'another start of the unit');
  assert.deepEqual(readClockWait(d, { invocationId: null, bootId: 'boot-a', mono: 10 * H + 60_000 }), rec);
  assert.equal(readClockWait(d, { invocationId: null, bootId: 'boot-a', mono: 11 * H }), null, 'an hour old');
  assert.equal(readClockWait(d, { invocationId: null, bootId: 'boot-b', mono: 10 * H }), null, 'another boot');
});

test('clockText, and the restart reason ends with it', () => {
  const w = (o: Partial<ClockWait>): ClockWait => ({ sync: 'yes', waitedS: 0, ended: 'synced', invocationId: 'x', bootId: 'b', monoAt: 0, at: '?', ...o });
  assert.equal(clockText(w({ waitedS: 74 }), 'yes'), 'clock: NTP synchronized after a 74-s wait; synchronized now; elapsed times are monotonic (D461)');
  assert.equal(clockText(w({}), 'yes'), 'clock: NTP synchronized at once; synchronized now; elapsed times are monotonic (D461)');
  assert.match(clockText(w({ sync: 'no', waitedS: 600, ended: 'cap' }), 'no'), /^clock: NTP still not synchronized after the 600-s wait \(started anyway\); NOT synchronized now;/);
  assert.match(clockText(w({ sync: 'unknown', waitedS: 30, ended: 'unknown' }), 'unknown'), /timedatectl did not answer for 30 s/);
  assert.equal(clockText(null, 'yes'), 'clock synchronized, no wait recorded (not started by the unit\'s ExecStartPre)');
  const facts: StartFacts = { pid: 1, now: 0, bootId: 'b0', invocationId: 'abcdef0123', uptimeS: 120 };
  const line = restartReason(null, facts, clockText(w({ waitedS: 74 }), 'yes'));
  assert.match(line, /; invocation abcdef01; clock: NTP synchronized after a 74-s wait; synchronized now; elapsed times are monotonic \(D461\)$/);
  assert.doesNotMatch(restartReason(null, facts), /clock/, 'no clock part when none is given (as before)');
});

test('the user unit: ExecStartPre waits for NTP with the daemon\'s own options, the start timeout covers the wait, After=time-sync.target', () => {
  const u = serviceUnit({ runnerDir: '/home/j/code/lab/runner', node: '/usr/bin', args: ['--lab-root /home/j/code/lab', '--http-port 8645'] });
  assert.match(u, /^ExecStartPre=\/home\/j\/code\/lab\/runner\/tools\/runner\.sh wait-clock --lab-root \/home\/j\/code\/lab --http-port 8645 --max-wait-s 600$/m);
  assert.match(u, /^TimeoutStartSec=660$/m);
  assert.match(u, /^ExecStart=\/home\/j\/code\/lab\/runner\/tools\/runner\.sh daemon --lab-root \/home\/j\/code\/lab --http-port 8645$/m);
  assert.match(u, /\[Unit\][\s\S]*^After=time-sync\.target$[\s\S]*\[Service\]/m);
  assert.match(u, /cannot order\s+(#\s+)?after the system's time-sync\.target/);
  assert.ok(u.indexOf('ExecStartPre=') < u.indexOf('ExecStart='), 'the wait before the daemon');
});

test('the pool\'s control reader keeps reading when the wall clock is stepped back 4 h', (t) => {
  const f = path.join(tmp(), 'J1.json');
  writeControl(f, { paused: false, maxWorkers: 5 });
  const read = controlReader(f, 0);
  assert.deepEqual(read(), { paused: false, maxWorkers: 5 });
  const real = Date.now;
  t.after(() => { Date.now = real; });
  Date.now = () => real() - 4 * H;               // on Date.now this read would be "-4 h after" the last: cached
  writeControl(f, { paused: true, maxWorkers: 2 });
  assert.deepEqual(read(), { paused: true, maxWorkers: 2 });
});

test('realSys: mono() is CLOCK_MONOTONIC in ms (hrtime), host().at is on it, bootId is the kernel\'s', () => {
  const s = realSys();
  const a = s.mono(), h = Number(process.hrtime.bigint() / 1_000_000n), b = s.mono();
  assert.ok(a <= h && h <= b, `${a} <= ${h} <= ${b}`);
  assert.ok(Math.abs(monoMs() - s.mono()) < 1000);
  const at = s.host().at;
  assert.ok(Math.abs(at - s.mono()) < 1000, 'host().at is monotonic, not Date.now()');
  if (fs.existsSync('/proc/sys/kernel/random/boot_id')) assert.match(s.bootId() ?? '', /^[0-9a-f-]{36}$/);
});
