#!/usr/bin/env node
// mtg-table — tools/auto-review-selftest.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The automatic review's self-test (D385): tools/auto-review.mjs over scratch
// games, a scratch lab-runner status.json and the real review runner
// (tools/review-runner.mjs) driving a FAKE coach-grade.sh, as
// review-runner-selftest.mjs does.  Everything goes under
// var/auto-review-selftest/.  No Forge, no claude, no network, no lab runner.
//
// What it holds: which logs are a person's finished game (the id shapes, the
// transport, hello_ok's AI flags, an `over` with a winner or a reason; a crash's
// null `over`, a game in progress, a scripted seat and an AI-vs-AI recording are
// not) and only those written since the queue began; the lab gate from the
// runner's status.json (no file, a stale heartbeat, idle, below its core budget
// -- --jobs narrowed to the free cores -- and busy; a torn file); the
// low-priority prefix (nice, ionice, either missing) and the spawn under it;
// one review at a time, newest game first, never while the review runner has
// work; the report where GET /review/<id> finds it, "auto": true (and after a
// restart); a .jsonl.gz
// log found, its seat read through the gzip and handed to the review; dedup
// (the same game never twice: across ticks, across a restart, against a review
// asked for over HTTP, against a report on disk; a FAILED review does not
// count); a request preempting a running automatic review (its process group
// dead), which runs again after without spending an attempt; a clean stop
// handing the running item back, three sessions over without failing it; a
// replayed seed's rewritten log skipped ("log replaced") and the next item
// started in the same tick; the scan remembered in the queue file (a second
// start reads nothing unchanged) and cut into slices; a job with null cores
// closing the lab gate, and the runner's status writer still naming the fields
// the gate reads; /health's gate words; an unwritable var/; the switch off; the queue
// file written by rename, a torn file resumed from its .bak, a foreign one moved
// aside, a `running` item resumed after a restart and failed after
// MAX_ATTEMPTS; the helper's /health keys; restore() after a restart.  The Java
// half of a gzip log (WireLog, #73) is GradeSelfTest's "WireLog reads a gzip
// log" in ./bridge/build.sh; this checks that check is still there.
//
//   node tools/auto-review-selftest.mjs      # exit 0 iff every check passes; ~10 s
//
// Run from the repo root (hard rule 9).  Gate step 12f; CI's redaction job.

import { spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import {
  GATE_WORDS, HUMAN_GAME_ID, MAX_ATTEMPTS, createAutoReview, judgeHumanGame, labGate, loadQueue, lowPriorityPrefix, saveQueue,
} from './auto-review.mjs';
import { createReviewRunner, gameLog, headerSeat, readLogText } from './review-runner.mjs';
import { startHelper } from './coach-helper.mjs';

const REL = 'var/auto-review-selftest';
const DIR = resolve(REL);
rmSync(DIR, { recursive: true, force: true });
mkdirSync(join(DIR, 'games'), { recursive: true });

let checks = 0;
let failures = 0;
const check = (ok, what, detail) => {
  checks++;
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${what}${!ok && detail !== undefined ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 8000) => {
  const t = Date.now();
  while (Date.now() - t < ms) { const v = fn(); if (v) return v; await sleep(50); }
  return null;
};

// --- logs -----------------------------------------------------------------------
const T0 = Date.parse('2026-10-04T12:00:00Z');
const logText = ({ id, seat = 0, transport = 'ws', aiSeat = 1 - seat, viewerAi = false, over = { winner: 1, reason: 'AllOpponentsLost' }, seed = 7, startedAt = `2026-10-04T12:00:0${seed % 10}Z` }) => {
  const lines = [
    { v: 1, kind: 'session', gameId: id, startedAt, seed, seat, ...(transport ? { transport } : {}), decks: [] },
    { v: 1, seq: 1, dir: 's2c', type: 'hello_ok', body: { gameId: id, you: seat, players: [{ id: seat, name: 'You', isAi: viewerAi }, { id: aiSeat, name: 'Forge AI', isAi: true }] } },
    { v: 1, seq: 2, dir: 's2c', type: 'state', body: {} },
  ];
  if (over !== 'none') lines.push({ v: 1, seq: 3, dir: 's2c', type: 'over', body: over });
  return lines.map((l) => JSON.stringify(l)).join('\n') + '\n';
};
/** Writes var/.../games/<id>/frames.jsonl (or .jsonl.gz) with the given mtime (ms). */
const game = (o, mtime = T0, gz = false) => {
  const d = join(DIR, 'games', o.id);
  mkdirSync(d, { recursive: true });
  const f = join(d, gz ? 'frames.jsonl.gz' : 'frames.jsonl');
  writeFileSync(f, gz ? gzipSync(logText(o)) : logText(o));
  utimesSync(f, new Date(mtime), new Date(mtime));
  return f;
};

// --- the fake coach-grade.sh (review-runner-selftest.mjs's, writing the report's `log`) --------
const FAKE = join(DIR, 'fake-grade.sh');
writeFileSync(FAKE, `#!/usr/bin/env bash
# A fake tools/coach-grade.sh for auto-review-selftest.mjs.  Not the grader.
set -u
n=$(ls "${DIR}" | grep -c '^argv-' || true)
printf '%s\\n' "$@" > "${DIR}/argv-$(printf '%03d' "$n")-$$.txt"
out=""; log=""; seat=""
while [ $# -gt 0 ]; do case "$1" in --out) out="$2"; shift 2;; --log) log="$2"; shift 2;; --seat) seat="$2"; shift 2;; *) shift;; esac; done
echo "REVIEW STAGE plan $log"
case "$log" in *human-ws-999*) sleep 3 ;; esac
if [ -e "${DIR}/fail-once" ]; then rm -f "${DIR}/fail-once"; echo "REVIEW FAILED a planted failure"; exit 1; fi
sleep 0.3; echo "REVIEW STAGE triage 1 decision(s)"
sleep 0.3; echo "REVIEW STAGE report"
mkdir -p "$(dirname "$out")"
gid=$(basename "$(dirname "$log")")
echo "{\\"v\\":1,\\"kind\\":\\"game-review\\",\\"gameId\\":\\"$gid\\",\\"seat\\":$seat,\\"log\\":\\"$log\\",\\"decisions\\":[],\\"keyMoments\\":[]}" > "$out"
echo "REVIEW DONE $out decisions=0 graded=0 errors=0 deepened=0"
`);
chmodSync(FAKE, 0o755);

const calls = [];   // every spawn: { cmd, args, pid }
const spawnImpl = (cmd, args, o) => { const c = spawn(cmd, args, o); calls.push({ cmd, args, pid: c.pid }); return c; };
/** A process group still has a live member (detached: the group id is the leader's pid). */
const groupAlive = (pid) => { try { process.kill(-pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
/** A fresh queue and an empty games folder. */
const fresh = () => {
  rmSync(join(DIR, 'queue'), { recursive: true, force: true });
  rmSync(join(DIR, 'games'), { recursive: true, force: true });
  mkdirSync(join(DIR, 'games'), { recursive: true });
  seedQueue();
};
const logOf = (c) => flag(argvOf(c), '--log');
const mkRunner = (o = {}) => createReviewRunner({
  repoRoot: process.cwd(), gamesDir: `${REL}/games`, workDir: `${REL}/work`, script: FAKE, jobs: 6,
  queueMax: 2, timeoutMs: 8000, available: () => true, spawnImpl, ...o,
});
const STATUS = join(DIR, 'runner', 'status.json');
mkdirSync(join(DIR, 'runner'), { recursive: true });
const iso = (ms) => new Date(ms).toISOString();
const status = (o) => writeFileSync(STATUS, JSON.stringify({ schema: 1, updated: iso(Date.now()), heartbeat: iso(Date.now()), paused: false,
  state: 'running', host: { coresUsed: 8, coresTotal: 8 }, running: [{ id: 'J001' }], queue: [], waiting: [], finished: [], ...o }));
const QF = `${REL}/queue/queue.json`;
const QA = resolve(QF);
const OLD_SINCE = '2026-01-01T00:00:00.000Z';
const seedQueue = (items = []) => saveQueue(QA, { v: 1, since: OLD_SINCE, items });
const mkAuto = (review, o = {}) => createAutoReview({
  repoRoot: process.cwd(), review, gamesDir: `${REL}/games`, workDir: `${REL}/work`, queueFile: QF, statusFile: STATUS,
  pollMs: 3_600_000, prefix: ['nice', '-n', '19'], log: () => {}, ...o,
});
const argvOf = (c) => { const a = c.args; const i = a.indexOf('review'); return a.slice(i); };
const flag = (av, f) => av[av.indexOf(f) + 1];

// 1. Which games.
console.log('which games');
for (const id of ['human-ws-1', 'human-ws-17-g2', 'human-console-3', 'match-m1234567890123', 'match-m1234567890123-g3']) check(HUMAN_GAME_ID.test(id), `a person's game id: ${id}`);
for (const id of ['human-auto-42', 'check-all-ws-3g', 'smoke-doom-1', 'human-ws-x', 'match-m12', 'drift-42', 'cubelab-1']) check(!HUMAN_GAME_ID.test(id), `not a person's game id: ${id}`);
check(judgeHumanGame(logText({ id: 'a' })).ok, 'a ws seat against the AI, over with a winner: taken');
check(judgeHumanGame(logText({ id: 'a', transport: 'console' })).ok, 'a console seat: taken');
check(judgeHumanGame(logText({ id: 'a', over: { winner: null, reason: 'Draw' } })).ok, 'a draw (a reason, no winner): taken');
check(!judgeHumanGame(logText({ id: 'a', transport: 'auto' })).ok, 'a scripted seat (transport auto): not taken');
check(!judgeHumanGame(logText({ id: 'a', transport: null })).ok, 'an AI-vs-AI recording (no transport): not taken');
check(!judgeHumanGame(logText({ id: 'a', viewerAi: true })).ok, 'an AI viewing seat: not taken');
check(/not finished/.test(judgeHumanGame(logText({ id: 'a', over: 'none' })).why), 'a game in progress: not taken');
check(/not finished/.test(judgeHumanGame(logText({ id: 'a', over: null })).why), "an engine crash's null over (M46): not taken");
check(!judgeHumanGame('not json\n').ok && !judgeHumanGame('').ok, 'no header: not taken');

// 2. The lab gate.
console.log('the lab gate');
rmSync(STATUS, { force: true });
check(labGate(STATUS).open && labGate(STATUS).freeCores === null, 'no status.json (no runner): open');
status({});
check(!labGate(STATUS).open && labGate(STATUS).freeCores === 0, 'running, 8 of 8 cores: closed (busy)');
status({ host: { coresUsed: 5, coresTotal: 8 } });
check(labGate(STATUS).open && labGate(STATUS).freeCores === 3, 'running, 5 of 8 cores: open, 3 free (below its core budget)');
status({ state: 'idle', running: [], host: { coresUsed: 0, coresTotal: 8 } });
check(labGate(STATUS).open && labGate(STATUS).freeCores === null, 'idle: open');
status({ heartbeat: iso(Date.now() - 10 * 60_000), updated: iso(Date.now() - 10 * 60_000) });
check(labGate(STATUS).open && /not running/.test(labGate(STATUS).why), 'busy but its heartbeat is 10 min old (a dead runner): open');
status({ heartbeat: undefined, updated: iso(Date.now() - 10 * 60_000) });
check(labGate(STATUS).open, 'no heartbeat field: `updated` is the heartbeat');
writeFileSync(STATUS, '{"schema":1,"upd');
check(!labGate(STATUS).open, 'a torn status.json just written: closed (the runner rewrites it in 10 s)');
utimesSync(STATUS, new Date(Date.now() - 600_000), new Date(Date.now() - 600_000));
check(labGate(STATUS).open, 'a torn status.json 10 min old: open (no runner)');
status({ host: { coresUsed: 2, coresTotal: 8 }, running: [{ id: 'J001', cores: 2 }, { id: 'J002', cores: null }] });
check(!labGate(STATUS).open && labGate(STATUS).freeCores === 0, "a job the runner does not run (cores: null, not in coresUsed): closed, whatever coresUsed says", labGate(STATUS));
status({ host: { coresUsed: 2, coresTotal: 8 }, running: [{ id: 'J001', cores: 2 }] });
check(labGate(STATUS).open && labGate(STATUS).freeCores === 6, 'the same lab without it: open, 6 free');
// The fields the gate reads must still be what the runner writes (tools/runner/runner.ts statusDoc, statusjson.ts schema 1).
const runnerSrc = readFileSync('tools/runner/runner.ts', 'utf8');
const docSrc = runnerSrc.slice(runnerSrc.indexOf('return fit({'), runnerSrc.indexOf('runner: { commit', runnerSrc.indexOf('return fit({')));
for (const [f, re] of [['schema: 1', /\bschema: 1,/], ['heartbeat', /\bheartbeat: /], ['updated', /\bupdated: /], ['state', /\bstate: running\.length \? 'running' : 'idle'/],
  ['running', /^\s*running,$/m], ['host.coresUsed', /\bcoresUsed: running\.reduce/], ['host.coresTotal', /\bcoresTotal: /]]) {
  check(docSrc.length > 0 && re.test(docSrc), `the runner's status writer still writes ${f}`);
}
check(/cores: null[^\n]*'not run by the runner'/.test(runnerSrc), "the runner's status writer still marks a job it does not run with cores: null");
check(/coresUsed\?: number; coresTotal\?: number/.test(readFileSync('tools/runner/statusjson.ts', 'utf8')), 'statusjson.ts still types host.coresUsed and host.coresTotal');

// 3. Low priority.
console.log('low priority');
check(JSON.stringify(lowPriorityPrefix(() => true)) === '["nice","-n","19","ionice","-c","3","-t"]', 'nice and ionice: both');
check(JSON.stringify(lowPriorityPrefix((c) => c === 'nice')) === '["nice","-n","19"]', 'no ionice: nice alone');
check(JSON.stringify(lowPriorityPrefix((c) => c === 'ionice')) === '["ionice","-c","3","-t"]', 'no nice: ionice alone (the runner sets the niceness)');
check(JSON.stringify(lowPriorityPrefix(() => false)) === '[]', 'neither: no prefix');
const real = lowPriorityPrefix();
check(real[0] === 'nice' || real.length === 0 || real[0] === 'ionice', `this machine's prefix: ${JSON.stringify(real)}`);

// 4. The queue file.
console.log('the queue file');
seedQueue([{ key: 'k1', gameId: 'g', log: 'x', state: 'pending', attempts: 0 }]);
check(loadQueue(QA).from === 'file' && loadQueue(QA).state.items.length === 1, 'written and read back');
check(!readdirSync(join(DIR, 'queue')).some((n) => n.includes('.tmp-')), 'no temporary file left behind');
seedQueue([{ key: 'k2', gameId: 'g', log: 'x', state: 'running', attempts: 1, reviewId: 'r1' }]);   // .bak now holds k1
writeFileSync(QA, '{"v":1,"since":"2026-');   // torn
const torn = loadQueue(QA);
check(torn.from === 'bak' && torn.state.items[0].key === 'k1', 'a torn file: resumed from queue.json.bak');
writeFileSync(QA, '{"hello":1}');
rmSync(`${QA}.bak`);
const foreign = loadQueue(QA);
check(foreign.from === 'fresh' && foreign.aside && existsSync(foreign.aside) && !existsSync(QA), 'a file that is not a queue, no .bak: moved aside, a fresh queue');
seedQueue([{ key: 'k3', gameId: 'g', log: 'x', state: 'running', attempts: 1, reviewId: 'r1' },
  { key: 'k4', gameId: 'g', log: 'x', state: 'running', attempts: MAX_ATTEMPTS, reviewId: 'r2' }]);
const back = loadQueue(QA).state.items;
check(back[0].state === 'pending' && back[0].reviewId === undefined, 'a running item after a restart: pending again');
check(back[1].state === 'failed', `a running item started ${MAX_ATTEMPTS} times: failed, not retried for ever`);

// 5. The worker, end to end.
console.log('the worker');
rmSync(join(DIR, 'queue'), { recursive: true, force: true });
seedQueue();
game({ id: 'human-ws-1', seed: 1 }, T0);
game({ id: 'match-m0000000000001-g2', seed: 2, seat: 1 }, T0 + 1000, true);   // gzip, seat 1
game({ id: 'human-ws-2', seed: 3, over: 'none' }, T0 + 2000);                // in progress
game({ id: 'human-ws-5', seed: 5, transport: 'auto' }, T0 + 3000);              // scripted
game({ id: 'check-all-ws-x', seed: 6 }, T0 + 4000);                              // the gate's id
game({ id: 'human-ws-6', seed: 6 }, Date.parse(OLD_SINCE) - 86_400_000);        // before the queue began
status({});   // the lab is busy
const rr = mkRunner();
const au = mkAuto(rr).start();
let items = au.items();
check(items.length === 2 && items.every((i) => i.state === 'pending'), 'two finished human games queued, nothing else', items.map((i) => i.gameId));
check(au.gate().word === 'lab-busy' && calls.length === 0, 'the lab busy: nothing starts');
check(au.health().autoReview === 1 && au.health().autoReviewQueue.pending === 2 && au.health().autoReviewQueue.gate === 'lab-busy', '/health: autoReview 1, 2 pending, gate lab-busy');
check(JSON.parse(readFileSync(QA, 'utf8')).items.length === 2, 'the queue is on disk');
status({ host: { coresUsed: 4, coresTotal: 8 } });
au.tick();
items = au.items();
const first = items.find((i) => i.state === 'running');
check(first && first.gameId === 'match-m0000000000001-g2', 'the lab below its budget: the newest game starts first', items);
check(calls.length === 1 && calls[0].cmd === 'nice' && JSON.stringify(calls[0].args.slice(0, 3)) === '["-n","19","bash"]', 'spawned under nice -n 19', calls[0]);
let av = argvOf(calls[0]);
check(flag(av, '--log') === `${REL}/games/match-m0000000000001-g2/frames.jsonl.gz` && flag(av, '--seat') === '1',
  'the .jsonl.gz log is handed to the review, its seat read through the gzip', av);
check(flag(av, '--jobs') === '4', '--jobs narrowed to the 4 free cores', av);
check(!av.includes('--opp-pool') && !av.includes('--opp-deck') && !av.includes('--opp-known'), "no knowledge flag: the runner's own rules (D348), no opponent list", av);
au.tick();
check(calls.length === 1, 'one at a time: nothing else starts while it runs');
status({});   // busy again: the next one waits for the gate

await until(() => au.items().find((i) => i.gameId === 'match-m0000000000001-g2').state === 'done');
const doneItem = au.items().find((i) => i.gameId === 'match-m0000000000001-g2');
const got = rr.get(doneItem.reviewId).body;
check(doneItem.state === 'done' && got.state === 'done' && got.auto === true && got.report?.kind === 'game-review', 'done: GET /review/<id> serves it, "auto": true');
check(rr.list().body.reviews[0].auto === true && rr.list().body.reviews[0].gameId === 'match-m0000000000001-g2', 'GET /review lists it with its gameId, "auto": true');
status({ state: 'idle', running: [] });
au.tick();
await until(() => au.items().find((i) => i.gameId === 'human-ws-1').state === 'done');
av = argvOf(calls[1]);
check(flag(av, '--log') === `${REL}/games/human-ws-1/frames.jsonl` && flag(av, '--jobs') === '6', 'the lab idle: the next one, at the runner\'s --jobs', av);
au.tick();
au.tick();
check(calls.length === 2 && au.items().length === 2, 'ticks after: no game reviewed twice');

// A game asked for over HTTP first.
game({ id: 'human-ws-4', seed: 4 }, Date.now() - 1000);
const asked = rr.post({ gameId: 'human-ws-4' });
await until(() => rr.get(asked.body.id).body.state === 'done');
au.tick();
const hw4 = au.items().find((i) => i.gameId === 'human-ws-4');
check(hw4 && hw4.state === 'skipped' && hw4.reviewId === asked.body.id && calls.length === 3, 'a game reviewed on request: skipped, not reviewed again', hw4);

// A restart: the same queue file, a fresh runner (reports on disk only).
au.stop();
const rr2 = mkRunner();
check(rr2.restore() === 3 && rr2.get(doneItem.reviewId).body.report?.kind === 'game-review', 'restore(): the reports on disk are served again after a restart');
check(rr2.get(doneItem.reviewId).body.auto === true && rr2.list().body.reviews.find((r) => r.id === doneItem.reviewId)?.auto === true
  && rr2.get(asked.body.id).body.auto === undefined, 'restore(): an automatic review is still "auto": true (its folder\'s `auto` file), a requested one is not');
const reads2 = [];
const au2 = mkAuto(rr2, { onRead: (k, n) => reads2.push(`${k} ${n}`) }).start();
check(calls.length === 3 && au2.items().length === 3, 'after a restart: nothing queued again');
check(reads2.length === 0, 'after a restart: no unchanged log is read again, not even its tail (the queue file remembers them)', reads2);
au2.stop();
// ... and a lost queue file: the reports on disk still keep a game from being reviewed twice.
rmSync(join(DIR, 'queue'), { recursive: true, force: true });
seedQueue();
const au3 = mkAuto(mkRunner()).start();   // a runner that has not restored anything
check(calls.length === 3 && au3.items().filter((i) => i.state === 'skipped').length === 3, 'the queue file lost: every reviewed game is skipped by its report on disk', au3.items());
au3.stop();

// Preemption: a request goes first; the automatic one runs again after.
console.log('preemption and restart');
rmSync(join(DIR, 'queue'), { recursive: true, force: true });
seedQueue();
game({ id: 'human-ws-999', seed: 9 }, Date.now() - 500);   // the fake takes 3 s on it
for (const id of ['human-ws-1', 'match-m0000000000001-g2', 'human-ws-4']) rmSync(join(DIR, 'games', id), { recursive: true });
rmSync(join(DIR, 'work'), { recursive: true, force: true });
const rr4 = mkRunner();
const au4 = mkAuto(rr4).start();
const slow = au4.items().find((i) => i.gameId === 'human-ws-999');
check(slow?.state === 'running', 'the slow game starts');
const slowPid = calls.at(-1).pid;
await sleep(300);
game({ id: 'human-ws-7', seed: 7 }, Date.now() - 2000);
const req = rr4.post({ gameId: 'human-ws-7' });
check(req.status === 202, 'a request while an automatic review runs: 202');
await until(() => au4.items().find((i) => i.gameId === 'human-ws-999').state === 'pending');
check(au4.items().find((i) => i.gameId === 'human-ws-999').state === 'pending' && !rr4.list().body.reviews.some((r) => r.gameId === 'human-ws-999'),
  'the automatic review is stopped, back to pending, and not listed as failed');
check(au4.items().find((i) => i.gameId === 'human-ws-999').attempts === 0, 'preempted: the attempt is given back');
check(await until(() => !groupAlive(slowPid), 5000) && !groupAlive(slowPid), 'the preempted review\'s process group is dead (its sleep too)', slowPid);
await until(() => rr4.get(req.body.id).body.state === 'done');
check(rr4.get(req.body.id).body.state === 'done' && rr4.get(req.body.id).body.auto === undefined, 'the request ran first (no "auto" on it)');
au4.tick();   // human-ws-7 has its review: skipped; human-ws-999 runs again
await until(() => au4.items().find((i) => i.gameId === 'human-ws-999').state === 'done', 9000);
const again = au4.items().find((i) => i.gameId === 'human-ws-999');
check(again.state === 'done' && again.attempts === 1, 'then the automatic one runs again to the end (the preempted start spent no attempt)', again);
check(au4.items().find((i) => i.gameId === 'human-ws-7')?.state === 'skipped', 'the requested game is not reviewed again');
au4.stop();

// A restart in the middle of a review: resumed.
rmSync(join(DIR, 'queue'), { recursive: true, force: true });
for (const id of ['human-ws-999', 'human-ws-7']) rmSync(join(DIR, 'games', id), { recursive: true });
seedQueue([{ key: 'human-ws-8|8|2026-10-04T12:00:08Z', gameId: 'human-ws-8', log: `${REL}/games/human-ws-8/frames.jsonl`, seat: 0, logMtime: Date.now() - 3000, state: 'running', attempts: 1, reviewId: 'r0000000000001', queuedAt: iso(Date.now()) }]);
game({ id: 'human-ws-8', seed: 8 }, Date.now() - 3000);
const n0 = calls.length;
const au5 = mkAuto(mkRunner()).start();
check(au5.items()[0].state === 'running' && calls.length === n0 + 1, 'a review cut off by a restart is started again');
await until(() => au5.items()[0].state === 'done');
check(au5.items()[0].state === 'done' && au5.items().length === 1, 'and finishes, once (the same game is in the folder: no second item)', au5.items());
au5.stop();

// A failed review does not count as one.
console.log('a failed review');
fresh();
game({ id: 'human-ws-66', seed: 66 }, Date.now() - 1000);
writeFileSync(join(DIR, 'fail-once'), '');
const rf = mkRunner();
const failedAsk = rf.post({ gameId: 'human-ws-66' });
await until(() => rf.get(failedAsk.body.id).body.state === 'failed');
check(rf.get(failedAsk.body.id).body.state === 'failed', 'a review asked for over HTTP fails');
status({});
const af = mkAuto(rf).start();
check(af.items()[0]?.state === 'pending', 'its game is queued, not skipped as "already reviewed"', af.items());
status({ state: 'idle', running: [] });
af.tick();
check(af.items()[0].state === 'running', 'and its automatic review starts');
await until(() => af.items()[0].state === 'done');
check(af.items()[0].state === 'done', 'and finishes');
af.stop();

// The scan: remembered in the queue file, and cut into slices.
console.log('the scan');
fresh();
for (const n of [11, 12, 13]) game({ id: `human-ws-${n}`, seed: n }, Date.now() - 10_000 + n);
game({ id: 'human-ws-14', seed: 14, over: 'none' }, Date.now() - 9000);   // in progress, the newest
status({});
let reads = [];
const full = () => reads.filter((r) => r.startsWith('full '));
const a6 = mkAuto(mkRunner(), { scanBatch: 1, onRead: (k, n) => reads.push(`${k} ${n}`) }).start();
check(full().length === 1 && a6.items().length === 1 && a6.items()[0].gameId === 'human-ws-13',
  'scanBatch 1: the first slice reads one whole log (the newest finished one) and yields', reads);
await until(() => a6.items().length === 3, 3000);
check(a6.items().length === 3 && full().length === 3, 'the rest in later slices, once the event loop has turned', reads);
a6.stop();
const seenOnDisk = JSON.parse(readFileSync(QA, 'utf8')).seen;
check(Object.keys(seenOnDisk).length === 4 && seenOnDisk['human-ws-14']?.verdict === 'not finished' && seenOnDisk['human-ws-13']?.verdict === 'queued',
  'every log judged is in the queue file, with its verdict', seenOnDisk);
reads = [];
const a7 = mkAuto(mkRunner(), { onRead: (k, n) => reads.push(`${k} ${n}`) }).start();
check(reads.length === 0 && a7.items().length === 3, 'a second start reads no unchanged log', reads);
game({ id: 'human-ws-14', seed: 14 }, Date.now());   // the game in progress finishes
a7.tick();
check(full().join() === 'full human-ws-14' && a7.items().length === 4, 'a log that changed is read again, alone', reads);
a7.stop();

// A replayed seed rewrites the same log while its item waits; the next item starts in the same tick.
console.log('a replayed seed, a clean stop');
fresh();
game({ id: 'human-ws-41', seed: 41 }, Date.now() - 6000);
game({ id: 'human-ws-42', seed: 42 }, Date.now() - 5000);
status({});
const r8 = mkRunner();
const a8 = mkAuto(r8).start();
check(a8.items().length === 2 && a8.items().every((i) => i.state === 'pending'), 'two games wait for the lab');
game({ id: 'human-ws-42', seed: 42, startedAt: '2026-10-05T09:00:00Z', over: 'none' }, Date.now());   // play.sh --seed 42 again: a new game, still going
const n8 = calls.length;
status({ state: 'idle', running: [] });
a8.tick();
const it42 = a8.items().find((i) => i.gameId === 'human-ws-42');
check(it42.state === 'skipped' && /log replaced/.test(it42.why), 'the rewritten log is not reviewed as the old game: skipped, "log replaced"', it42);
check(calls.length === n8 + 1 && logOf(calls.at(-1)).includes('human-ws-41') && a8.items().find((i) => i.gameId === 'human-ws-41').state === 'running',
  'and the next item starts in the same tick, not a poll later', calls.slice(n8).map(logOf));
check(!calls.some((c) => logOf(c).includes('human-ws-42')), 'the live log is never handed to a review');
// A clean stop (the helper's SIGINT/SIGTERM: stop() then process.exit) hands the running item back.
const pid41 = calls.at(-1).pid;
a8.stop();
r8.close();
const back41 = loadQueue(QA).state.items.find((i) => i.gameId === 'human-ws-41');
check(back41.state === 'pending' && back41.attempts === 0 && back41.why === 'the helper stopped', 'a clean stop: the running item is pending on disk, its attempt given back', back41);
game({ id: 'human-ws-42', seed: 42, startedAt: '2026-10-05T09:00:00Z' }, Date.now());   // the replayed game ends
const pids = [pid41];
for (let s = 0; s < MAX_ATTEMPTS; s++) {   // a player who quits soon after every session
  const rs = mkRunner();
  const as = mkAuto(rs).start();
  if (calls.at(-1).pid !== pids.at(-1)) pids.push(calls.at(-1).pid);
  as.stop();
  rs.close();
}
const after = loadQueue(QA).state.items;
check(after.length === 3 && after.every((i) => i.state !== 'failed') && after.every((i) => (i.attempts ?? 0) === 0),
  `${MAX_ATTEMPTS} sessions stopped cleanly mid-review: nothing failed, no attempt spent`, after);
check(after.filter((i) => i.gameId === 'human-ws-42').length === 2 && after.some((i) => i.key.includes('2026-10-05T09:00:00Z') && i.state === 'pending'),
  'the replayed game, once finished, is queued as a game of its own', after);
check(await until(() => pids.every((p) => !groupAlive(p)), 5000) && pids.every((p) => !groupAlive(p)), 'every review stopped with the helper is dead', pids);

// /health's gate is one of three words; an unwritable var/ turns the automatic review off, not the helper.
console.log('health words, an unwritable var/');
fresh();
game({ id: 'human-ws-71', seed: 71 }, Date.now());
let avail = false;
const aa = mkAuto(mkRunner({ available: () => avail })).start();
avail = true;
check(aa.gate().why === 'the bridge is not built' && aa.health().autoReviewQueue.gate === 'review-busy' && GATE_WORDS.includes(aa.health().autoReviewQueue.gate),
  'the bridge not built when it looked: the gate reads "review-busy", a documented word', aa.health());
aa.stop();
writeFileSync(join(DIR, 'blocker'), 'a file where the queue folder should be');
const msgs = [];
let threw = null;
let ab = null;
try { ab = mkAuto(mkRunner(), { queueFile: `${REL}/blocker/queue.json`, log: (m) => msgs.push(m) }).start(); ab.tick(); ab.stop(); } catch (e) { threw = e; }
check(!threw && ab.health().autoReview === 0 && msgs.filter((m) => /cannot write/.test(m)).length === 1 && ab.items().length === 0,
  'a queue file it cannot write: no throw, logged once, "autoReview": 0', { threw: threw?.message, msgs });

// 6. The switch off.
console.log('the switch');
rmSync(join(DIR, 'queue'), { recursive: true, force: true });
const off = mkAuto(mkRunner(), { enabled: false }).start();
off.tick();
check(off.health().autoReview === 0 && off.health().autoReviewQueue === undefined && !existsSync(QA) && off.items().length === 0,
  'off: /health "autoReview": 0, no queue file, nothing queued');
check(mkAuto(mkRunner({ available: () => false })).health().autoReview === 0, 'the bridge not built: "autoReview": 0 (as "review" is)');

// 7. The helper's /health.
const call = (port, path) => new Promise((res, rej) => {
  const r = request({ host: '127.0.0.1', port, method: 'GET', path }, (resp) => {
    let t = '';
    resp.on('data', (x) => { t += x; });
    resp.on('end', () => res({ status: resp.statusCode, body: JSON.parse(t) }));
  });
  r.on('error', rej);
  r.end();
});
seedQueue();
const hr = mkRunner();
const ha = mkAuto(hr);
const h = startHelper({ port: 0, lan: false, token: '', wsPort: 8642, origins: ['http://127.0.0.1:*'], timeoutS: 5, review: hr, auto: ha.start(), log: () => {} });
const port = await h.listen();
const hh = (await call(port, '/health')).body;
check(hh.review === 1 && hh.autoReview === 1 && Number.isInteger(hh.autoReviewQueue?.pending) && [0, 1].includes(hh.autoReviewQueue?.running)
  && ['open', 'review-busy', 'lab-busy'].includes(hh.autoReviewQueue?.gate), '/health: "autoReview": 1 and "autoReviewQueue"', hh);
h.close();
await until(() => !hr.busy(), 6000);
const h2 = startHelper({ port: 0, lan: false, token: '', wsPort: 8642, origins: ['http://127.0.0.1:*'], timeoutS: 5, review: mkRunner(), log: () => {} });
const port2 = await h2.listen();
check((await call(port2, '/health')).body.autoReview === 0, 'a helper with no automatic review: "autoReview": 0');
h2.close();

// 8. gzip, the JS side and the Java side.
console.log('gzip logs');
const gzf = game({ id: 'human-ws-31', seed: 1, seat: 1 }, Date.now(), true);
check(gameLog(process.cwd(), `${REL}/games`, 'human-ws-31').rel === `${REL}/games/human-ws-31/frames.jsonl.gz`, 'gameLog finds frames.jsonl.gz when there is no frames.jsonl');
check(headerSeat(gzf) === 1 && judgeHumanGame(readLogText(gzf)).ok, "a gzip log's header and its over are read");
writeFileSync(join(DIR, 'cut.gz'), gzipSync(logText({ id: 'c' })).subarray(0, 60));
check(readLogText(join(DIR, 'cut.gz')) !== null, 'a gzip cut short (a killed recorder) reads what it holds');
writeFileSync(join(DIR, 'z.jsonl.zst'), Buffer.from([0x28, 0xb5, 0x2f, 0xfd, 0, 0]));
check(readLogText(join(DIR, 'z.jsonl.zst')) === null, 'a zstd archive (D370) is not read as text');
const gst = readFileSync('bridge/src/mtgtable/grade/GradeSelfTest.java', 'utf8');
check(gst.includes('WireLog reads a gzip log'), "the Java reader's gzip check is in GradeSelfTest (bridge/build.sh, #73)");

console.log(`auto-review-selftest ${failures ? 'FAILED' : 'OK'} (${checks} checks, ${failures} failure(s))`);
if (existsSync(DIR) && !failures) rmSync(DIR, { recursive: true, force: true });
process.exit(failures ? 1 : 0);
