#!/usr/bin/env node
// mtg-table — tools/review-runner-selftest.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The review runner's self-test (D352): tools/review-runner.mjs and the coach
// helper's /review route, against a FAKE coach-grade.sh -- a small bash script
// that prints the real one's stage lines, records its argv and writes a report.
// A game named "fail-..." makes it fail, "slow-..." makes it sleep past the
// timeout, "junk-..." makes it write a report that is not one.  Everything goes
// under var/review-runner-selftest/.  No Forge, no claude, no network.
//
// What it holds: the request's validation (game ids, traversal, seat, pool
// size and card names, known picks, ranges, unknown fields -- no field takes an
// AI deck); a game outside var/games/ (a symlink) refused; the seat checked
// against the log header; 503 and "review": 0 when the bridge is not built;
// one review at a time with a queue and 429 past it; the stages seen while it
// runs; the report served once done; failure and timeout reported; the argv an
// array with every list in a file of the review's own; and the helper's route
// (/health, POST, GET one, GET all, 404, 405, Origin refused, --no-review 503).
//
//   node tools/review-runner-selftest.mjs      # exit 0 iff every check passes; ~10 s
//
// Run from the repo root (hard rule 9).  Gate step 12f; CI's redaction job.

import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync, chmodSync } from 'node:fs';
import { request } from 'node:http';
import { join, resolve } from 'node:path';
import { createReviewRunner, validateReview, gameLog, headerSeat, REVIEW_ID } from './review-runner.mjs';
import { startHelper } from './coach-helper.mjs';

const REL = 'var/review-runner-selftest';
const DIR = resolve(REL);
rmSync(DIR, { recursive: true, force: true });
mkdirSync(join(DIR, 'games'), { recursive: true });
mkdirSync(join(DIR, 'outside'), { recursive: true });

let checks = 0;
let failures = 0;
const check = (ok, what) => {
  checks++;
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${what}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- games --------------------------------------------------------------------
const header = (seat) => JSON.stringify({ v: 1, kind: 'session', gameId: 'x', seat, decks: [] });
const game = (id, seat = 0) => {
  mkdirSync(join(DIR, 'games', id), { recursive: true });
  writeFileSync(join(DIR, 'games', id, 'frames.jsonl'), `${header(seat)}\n{"v":1,"type":"state","body":{}}\n`);
};
for (const id of ['g1', 'g2', 'g3', 'g4', 'fail-1', 'slow-1', 'junk-1']) game(id);
game('seat1', 1);
writeFileSync(join(DIR, 'outside', 'frames.jsonl'), `${header(0)}\n`);
symlinkSync(join(DIR, 'outside'), join(DIR, 'games', 'escape'));

// --- the fake coach-grade.sh ----------------------------------------------------
const FAKE = join(DIR, 'fake-grade.sh');
writeFileSync(FAKE, `#!/usr/bin/env bash
# A fake tools/coach-grade.sh for review-runner-selftest.mjs.  Not the grader.
set -u
printf '%s\\n' "$@" > "${DIR}/argv-$$.txt"
out=""; log=""
while [ $# -gt 0 ]; do case "$1" in --out) out="$2"; shift 2;; --log) log="$2"; shift 2;; *) shift;; esac; done
echo "REVIEW STAGE plan $log"
case "$log" in
  *fail-*) echo "REVIEW FAILED plan: the log is broken"; exit 3 ;;
  *slow-*) sleep 30 ;;
esac
sleep 0.4; echo "REVIEW STAGE triage 3 decision(s)"
sleep 0.4; echo "REVIEW STAGE deepen 1 decision(s)"
sleep 0.4; echo "REVIEW STAGE report"
mkdir -p "$(dirname "$out")"
case "$log" in
  *junk-*) echo '{"kind":"something-else"}' > "$out" ;;
  *) echo '{"v":1,"kind":"game-review","gameId":"x","seat":0,"decisions":[],"keyMoments":[]}' > "$out" ;;
esac
echo "REVIEW DONE $out"
`);
chmodSync(FAKE, 0o755);

const mk = (o = {}) => createReviewRunner({
  repoRoot: process.cwd(), gamesDir: `${REL}/games`, workDir: `${REL}/work`, script: FAKE, jobs: 3,
  queueMax: 2, timeoutMs: 4000, available: () => true, ...o,
});
const until = async (fn, ms = 8000) => {
  const t = Date.now();
  while (Date.now() - t < ms) { const v = fn(); if (v) return v; await sleep(50); }
  return null;
};

// 1. Validation.
console.log('validation');
const bad = (q, what) => check(validateReview(q).req === null, `refused: ${what}`);
check(validateReview({ gameId: 'g1' }).req?.gameId === 'g1', 'a bare game id is a request');
bad({ gameId: '../etc' }, 'a game id with a path');
bad({ gameId: 'a..b' }, 'a game id with ".."');
bad({ gameId: '.hidden' }, 'a game id starting with "."');
bad({ gameId: 'g1/../../x' }, 'a game id with a slash');
bad({ gameId: '' }, 'an empty game id');
bad({ gameId: 'g1', seat: 2 }, 'seat 2');
bad({ gameId: 'g1', aiDeck: { main: [] } }, 'an "aiDeck" field (there is no field for the AI\'s list)');
bad({ gameId: 'g1', oppDeck: 'var/match/m1/ai.dck' }, 'an "oppDeck" field');
bad({ gameId: 'g1', oppPool: [[40, 'Swamp']] }, 'a 40-card "pool" (a deck)');
bad({ gameId: 'g1', oppPool: [[80, 'Swamp; rm -rf /']] }, 'a pool card name with a ";"');
bad({ gameId: 'g1', oppPool: [[80, 'Swamp\nIsland']] }, 'a pool card name with a newline');
bad({ gameId: 'g1', oppKnown: ['ok', '--opp-deck'] }, 'a known pick that is a flag');
bad({ gameId: 'g1', deepK: 0 }, 'deepK 0');
bad({ gameId: 'g1', triageS: 1000 }, 'triageS 1000');
bad({ gameId: 'g1', deepS: 1.5 }, 'deepS 1.5');
bad([], 'an array body');
const okPool = validateReview({ gameId: 'g1', oppPool: [[40, 'Swamp'], [40, 'Island'], [1, 'Lightning Bolt']], oppKnown: ['Shock'], deepK: 3, triageS: 10, deepS: 60 });
check(okPool.req && okPool.req.pool.length === 3 && okPool.req.known[0] === 'Shock' && okPool.req.deepK === 3, 'a full request is accepted');

// 2. Paths and seats.
console.log('paths and seats');
check(gameLog(process.cwd(), `${REL}/games`, 'g1').rel === `${REL}/games/g1/frames.jsonl`, 'a game log inside var/games/');
check(gameLog(process.cwd(), `${REL}/games`, 'nope').status === 404, 'no such game: 404');
check(gameLog(process.cwd(), `${REL}/games`, 'escape').status === 400, 'a symlink out of var/games/: refused');
check(headerSeat(join(DIR, 'games', 'seat1', 'frames.jsonl')) === 1, "the header's seat is read");

// 3. Off: 503 and review 0.
const off = mk({ available: () => false });
check(off.health().review === 0 && off.post({ gameId: 'g1' }).status === 503, 'not built: /health "review": 0, POST 503');

// 4. One at a time, a queue, 429, stages, the report.
console.log('lifecycle');
const rr = mk();
check(rr.health().review === 1 && rr.health().reviewQueue.max === 2, '/health: review 1 and the queue');
check(rr.post({ gameId: 'seat1', seat: 0 }).status === 400, 'seat 0 asked of a seat-1 log: 400');
check(rr.post({ gameId: 'escape' }).status === 400, 'the symlinked game: 400');
const a = rr.post({ gameId: 'g1', oppPool: [[40, 'Swamp'], [41, 'Island']], oppKnown: ['Shock'], deepK: 2 });
const b = rr.post({ gameId: 'g2' });
const c = rr.post({ gameId: 'g3' });
const d = rr.post({ gameId: 'g4' });
check(a.status === 202 && REVIEW_ID.test(a.body.id), `202 with an id (${a.body.id})`);
check(rr.get(a.body.id).body.state === 'running', 'the first runs at once');
check(b.status === 202 && b.body.state === 'queued' && b.body.position === 0 && c.body.position === 1, 'the next two wait, in order');
check(d.status === 429, 'past the queue: 429');
const stages = new Set();
await until(() => { const s = rr.get(a.body.id).body; if (s.stage) stages.add(s.stage); return s.state === 'done'; });
const done = rr.get(a.body.id).body;
check(done.state === 'done' && done.report?.kind === 'game-review' && done.endedAt, 'done: the report is served');
check(['plan', 'triage', 'deepen', 'report'].filter((s) => stages.has(s)).length >= 3, `the stages are seen while it runs (${[...stages].join(', ')})`);
check(rr.get(b.body.id).body.state === 'running', 'then the next starts');
const argvFile = readFileSync(join(DIR, 'work', a.body.id, 'pool.txt'), 'utf8');
check(argvFile === '40 Swamp\n41 Island\n', 'the pool is a file of the review\'s own');
check(readFileSync(join(DIR, 'work', a.body.id, 'known.txt'), 'utf8') === '1 Shock\n', 'the known picks are a file too');
const argvs = (await import('node:fs')).readdirSync(DIR).filter((n) => n.startsWith('argv-')).map((n) => readFileSync(join(DIR, n), 'utf8').split('\n'));
const av = argvs.find((x) => x.includes('--opp-pool'));
check(av && av[0] === 'review' && av[av.indexOf('--log') + 1] === `${REL}/games/g1/frames.jsonl` && av[av.indexOf('--seat') + 1] === '0'
  && av[av.indexOf('--deep-k') + 1] === '2' && av[av.indexOf('--jobs') + 1] === '3' && !av.some((x) => /Swamp|Shock/.test(x)),
  'the argv: review --log <the game> --seat <the header\'s> --deep-k --jobs, no card name on it');
await until(() => rr.get(c.body.id).body.state === 'done', 10000);
check(rr.list().body.reviews.length === 3 && rr.list().body.reviews[0].id === c.body.id, 'GET /review lists them, newest first');

// 5. Failure, junk and timeout.
console.log('failures');
const f = rr.post({ gameId: 'fail-1' });
await until(() => rr.get(f.body.id).body.state === 'failed');
check(/the log is broken/.test(rr.get(f.body.id).body.error ?? ''), 'a failed review says why');
const j = rr.post({ gameId: 'junk-1' });
await until(() => rr.get(j.body.id).body.state === 'failed');
check(/could not be read|not a game-review/.test(rr.get(j.body.id).body.error ?? ''), 'a report that is not one: failed');
const s = rr.post({ gameId: 'slow-1' });
await until(() => rr.get(s.body.id).body.state === 'failed', 9000);
check(/ran past/.test(rr.get(s.body.id).body.error ?? ''), 'a review past its time is stopped');
check(rr.get('r0000000000000').status === 404 && rr.get('../x').status === 404, 'an unknown or malformed id: 404');

// 6. Through the helper.
console.log('the helper route');
const origins = ['http://127.0.0.1:*'];
const call = (port, method, path, body, headers = {}) => new Promise((res, rej) => {
  const data = body === undefined ? undefined : JSON.stringify(body);
  const r = request({ host: '127.0.0.1', port, method, path, headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...headers } }, (resp) => {
    let t = '';
    resp.on('data', (x) => { t += x; });
    resp.on('end', () => { let j2 = null; try { j2 = JSON.parse(t); } catch { /* not json */ } res({ status: resp.statusCode, body: j2 }); });
  });
  r.on('error', rej);
  if (data) r.write(data);
  r.end();
});
const h = startHelper({ port: 0, lan: false, token: '', wsPort: 8642, origins, timeoutS: 5, review: mk(), log: () => {} });
const port = await h.listen();
const hh = await call(port, 'GET', '/health');
check(hh.status === 200 && hh.body.review === 1 && hh.body.reviewQueue?.max === 2, '/health carries "review": 1');
const p = await call(port, 'POST', '/review', { gameId: 'g1' });
check(p.status === 202 && REVIEW_ID.test(p.body.id), 'POST /review: 202');
await sleep(1600);
const g = await call(port, 'GET', `/review/${p.body.id}`);
check(g.status === 200 && (g.body.state === 'done' || g.body.state === 'running'), `GET /review/<id> (${g.body.state})`);
check((await call(port, 'GET', '/review')).body.reviews.length === 1, 'GET /review');
check((await call(port, 'PUT', '/review')).status === 405, 'PUT: 405');
check((await call(port, 'POST', `/review/${p.body.id}`, {})).status === 405, 'POST to one review: 405');
check((await call(port, 'GET', '/review/r1234567890123')).status === 404, 'an unknown review: 404');
check((await call(port, 'POST', '/review', { gameId: '../../etc' })).status === 400, 'a bad game id through the route: 400');
check((await call(port, 'GET', '/review', undefined, { Origin: 'http://evil.example' })).status === 403, 'another Origin: 403');
h.close();
const h2 = startHelper({ port: 0, lan: false, token: '', wsPort: 8642, origins, timeoutS: 5, review: null, log: () => {} });
const port2 = await h2.listen();
check((await call(port2, 'GET', '/health')).body.review === 0 && (await call(port2, 'POST', '/review', { gameId: 'g1' })).status === 503,
  '--no-review: "review": 0 and 503');
h2.close();

console.log(`review-runner-selftest ${failures ? 'FAILED' : 'OK'} (${checks} checks, ${failures} failure(s))`);
if (existsSync(DIR) && !failures) rmSync(DIR, { recursive: true, force: true });
process.exit(failures ? 1 : 0);
