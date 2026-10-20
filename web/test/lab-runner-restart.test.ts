/*
 * mtg-table — web/test/lab-runner-restart.test.ts
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The lab runner's restart reason (tools/runner/restart.ts): the daemon's
 * <state>/last-exit.json, written `running` at start and `exited` with a reason
 * on the way out, and the one line the next start makes of it (into the journal
 * and every running job's STATUS -- that half is lab-runner.test.ts's).
 *
 *  - the line: an exit on record, no record (a SIGKILL / OOM / power loss), no
 *    file at all, an unreadable file; same boot vs a reboot; invocation, uptime;
 *  - the file: written atomically, read back, garbage tolerated;
 *  - the exit context: paused (tools/runner.sh pause/stop), install's note (and
 *    a stale note ignored);
 *  - the recorder in a real child process: SIGTERM through the daemon's own
 *    handler, an uncaught error with its message, a normal exit, and SIGKILL,
 *    which leaves `running` behind.
 */

import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { EXIT_FILE, EXIT_NOTE_FILE, exitContext, noteExit, readExit, restartReason, startFacts, uptimeText, writeExit, type ExitRecord, type StartFacts } from '../../tools/runner/restart.ts';

const RESTART_TS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'tools', 'runner', 'restart.ts');
const tmp = (): string => fs.mkdtempSync(path.join(os.tmpdir(), 'runner-restart-'));

const BOOT_A = '1a2b3c4d-0000-4000-8000-000000000001';
const BOOT_B = '9f8e7d6c-0000-4000-8000-000000000002';
const now: StartFacts = { pid: 500, now: Date.parse('2026-10-19T00:18:00Z'), bootId: BOOT_B, invocationId: 'abcdef0123456789abcdef0123456789', uptimeS: 3 * 3600 + 7 * 60 };
const prev = (o: Partial<ExitRecord>): ExitRecord => ({ state: 'running', pid: 41, commit: 'c0ffee1', startedAt: '2026-10-15T09:00:00-04:00', bootId: BOOT_B, invocationId: 'x', ...o });

test('restart reason: an exit on record names its reason; same boot means the service restarted', () => {
  const line = restartReason(prev({ state: 'exited', exitedAt: '2026-10-17T20:40:00-04:00', reason: 'SIGTERM; the runner was paused since 2026-10-17T20:39:00-04:00 (tools/runner.sh pause or stop)' }), now);
  assert.match(line, /^the previous runner \(pid 41, c0ffee1\) exited at 2026-10-17T20:40:00-04:00: SIGTERM; the runner was paused since/);
  assert.match(line, /; same boot 9f8e7d6c: the service restarted, not the machine; up 3 h 7 min; invocation abcdef01$/);
});

test('restart reason: no record (state still running) is a SIGKILL, OOM kill, power loss or crash; a new boot id is a reboot', () => {
  const line = restartReason(prev({ bootId: BOOT_A }), now);
  assert.match(line, /^no record: the previous runner \(pid 41, c0ffee1, started 2026-10-15T09:00:00-04:00\) ended without writing its exit -- a SIGKILL, an OOM kill, a power loss or a crash; /);
  assert.match(line, /the machine rebooted since \(boot 1a2b3c4d -> 9f8e7d6c\)/);
  // The same, on the same boot: the process died, the machine did not.
  assert.match(restartReason(prev({}), now), /ended without writing its exit.*; same boot 9f8e7d6c: the service restarted, not the machine/);
});

test('restart reason: no file at all, no boot id, not under systemd', () => {
  const line = restartReason(null, { ...now, bootId: null, invocationId: null, uptimeS: 2 * 86_400 + 5 * 3600 + 60 });
  assert.equal(line, `no record of a previous runner (no ${EXIT_FILE}: the first start that keeps one, or a new state folder); boot ?; up 2 d 5 h 1 min; invocation none (not under systemd)`);
  assert.equal(uptimeText(59), '0 min');
  assert.equal(uptimeText(3600), '1 h 0 min');
});

test('startFacts: the boot id from /proc, INVOCATION_ID from the environment, uptime rounded', () => {
  const f = startFacts({ INVOCATION_ID: ' abc \n' }, () => `${BOOT_A}\n`, 12.6);
  assert.equal(f.bootId, BOOT_A);
  assert.equal(f.invocationId, 'abc');
  assert.equal(f.uptimeS, 13);
  const g = startFacts({}, () => { throw new Error('ENOENT'); }, 0);
  assert.equal(g.bootId, null);
  assert.equal(g.invocationId, null);
  if (fs.existsSync('/proc/sys/kernel/random/boot_id')) assert.match(startFacts().bootId ?? '', /^[0-9a-f-]{36}$/);
});

test('last-exit.json: written atomically and read back; missing is null; garbage reads as an unreadable record', () => {
  const d = tmp();
  assert.equal(readExit(d), null);
  const rec = prev({ state: 'exited', exitedAt: 'then', reason: 'SIGINT' });
  writeExit(d, rec);
  assert.deepEqual(readExit(d), rec);
  assert.deepEqual(fs.readdirSync(d), [EXIT_FILE], 'no temp file left behind');
  fs.writeFileSync(path.join(d, EXIT_FILE), '{"state": "runn');
  const bad = readExit(d)!;
  assert.equal(bad.state, 'running');
  assert.match(restartReason(bad, now), /ended without writing its exit.*\(last-exit\.json unreadable\)/);
});

test('exit context: paused says since when; install\'s note is read once, and a stale one is dropped', () => {
  const d = tmp();
  assert.deepEqual(exitContext(d), []);
  fs.writeFileSync(path.join(d, 'paused'), '2026-10-17T20:39:00-04:00\n');
  noteExit(d, 'tools/runner.sh install restarted the service to abc1234');
  assert.deepEqual(exitContext(d), ['the runner was paused since 2026-10-17T20:39:00-04:00 (tools/runner.sh pause or stop)', 'tools/runner.sh install restarted the service to abc1234']);
  assert.ok(!fs.existsSync(path.join(d, EXIT_NOTE_FILE)), 'the note is consumed');
  fs.rmSync(path.join(d, 'paused'));
  noteExit(d, 'old news');
  assert.deepEqual(exitContext(d, Date.now() + 11 * 60_000), []);
  assert.ok(!fs.existsSync(path.join(d, EXIT_NOTE_FILE)));
});

/** A child that is the daemon in miniature: the recorder, the daemon's SIGTERM handler, then `then`. */
function child(stateDir: string, then: string): ReturnType<typeof spawn> {
  const code = `
    import { exitRecorder, startFacts } from ${JSON.stringify(RESTART_TS)};
    const rec = exitRecorder(${JSON.stringify(stateDir)}, 'feed123', startFacts());
    let stopping = false;
    process.on('SIGTERM', () => { rec.signal('SIGTERM'); stopping = true; });
    const tick = setInterval(() => { if (stopping) { clearInterval(tick); process.exit(0); } }, 20);
    console.log('ready');
    ${then}
  `;
  return spawn(process.execPath, ['--input-type=module', '-e', code], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, INVOCATION_ID: 'unit-test-invocation' } });
}

async function ready(c: ReturnType<typeof spawn>): Promise<void> {
  await new Promise<void>((res, rej) => {
    let out = '';
    c.stdout?.on('data', (b) => { out += String(b); if (out.includes('ready')) res(); });
    c.on('exit', (code) => rej(new Error(`child exited ${code} before it was ready`)));
  });
}
const exited = (c: ReturnType<typeof spawn>): Promise<number | null> => new Promise((res) => c.on('exit', (code) => res(code)));

test('recorder: SIGTERM through the daemon\'s handler is recorded as SIGTERM, with the invocation and boot id', async () => {
  const d = tmp();
  const c = child(d, '');
  await ready(c);
  assert.equal(readExit(d)?.state, 'running');
  assert.equal(readExit(d)?.pid, c.pid);
  c.kill('SIGTERM');
  assert.equal(await exited(c), 0);
  const r = readExit(d)!;
  assert.equal(r.state, 'exited');
  assert.equal(r.reason, 'SIGTERM');
  assert.equal(r.commit, 'feed123');
  assert.equal(r.invocationId, 'unit-test-invocation');
  assert.match(restartReason(r, startFacts()), /^the previous runner \(pid \d+, feed123\) exited at .*: SIGTERM; /);
});

test('recorder: an uncaught error is recorded with its message; a plain exit with its code', async () => {
  const d = tmp();
  const c = child(d, `setTimeout(() => { throw new Error('tick: queue clone vanished\\n    at x'); }, 30);`);
  await ready(c);
  assert.equal(await exited(c), 1);
  assert.equal(readExit(d)?.reason, 'uncaught error: tick: queue clone vanished');
  const d2 = tmp();
  const c2 = child(d2, `setTimeout(() => process.exit(3), 30);`);
  await ready(c2);
  assert.equal(await exited(c2), 3);
  assert.equal(readExit(d2)?.reason, 'exit 3');
});

test('recorder: SIGKILL (what an OOM kill or a power cut amounts to) leaves `running`: the next start says no record', async () => {
  const d = tmp();
  const c = child(d, '');
  await ready(c);
  c.kill('SIGKILL');
  await exited(c);
  const r = readExit(d)!;
  assert.equal(r.state, 'running');
  assert.match(restartReason(r, startFacts()), /^no record: the previous runner \(pid \d+, feed123, started .*\) ended without writing its exit/);
  // And the CLI's own help still runs (the daemon's imports resolve).
  const help = spawnSync(process.execPath, [path.join(path.dirname(RESTART_TS), 'cli.ts')], { encoding: 'utf8' });
  assert.equal(help.status, 2);
  assert.match(help.stdout, /daemon {2}\[opts\]/);
});
