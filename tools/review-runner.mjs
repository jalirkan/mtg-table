// mtg-table — tools/review-runner.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// THE REVIEW RUNNER (D352): the coach helper's `/review`, which runs the
// post-game review -- `tools/coach-grade.sh review` -- on a game the engine
// wrote, one at a time, and keeps its report for ForgeCoach to fetch.
// tools/coach-helper.mjs routes /review here, behind the same Origin and
// LAN-token gate as /coach and /match.  docs/game-review.md is the copyable
// contract; this header repeats its shapes.
//
//   GET  /health  gains "review": 1 when the review can run here (the bridge is
//                 built: bridge/out/mtgtable/grade/ exists), else "review": 0;
//                 with 1, also "reviewQueue": {"max", "length", "running"}.
//   POST /review  {"gameId": "<id>", "seat"?: 0|1,
//                  "oppPool"?: [[n, "Card"], ...]   (the cube list: 80+ cards),
//                  "oppKnown"?: ["Card", ...]       (AI picks the player saw: 60 at most),
//                  "deepK"?: 1-12, "triageS"?: 5-120, "deepS"?: 30-900}
//                 -> 202 {"ok":true,"id":"r<13 digits>","state":"queued","position":<n>}
//   GET  /review/<id> -> 200 {"ok":true,"id","gameId","state":"queued"|"running"|"done"|"failed",
//                 "position"?, "stage"?: "plan"|"triage"|"deepen"|"report", "createdAt",
//                 "startedAt"?, "endedAt"?, "error"?, "report"?}   (404 for an unknown id)
//   GET  /review  -> 200 {"ok":true,"reviews":[{id, gameId, state}, ...]}  (newest first)
//   Refusals: {"ok":false,"type":"error","message":"<plain words>"} (+ "problems" on a 400):
//     400 bad input · 404 no such game / review · 405 · 413 over 256 KB · 429 queue full ·
//     503 review off.
//
// THE RULES IT KEEPS:
//   - Only a game the engine wrote: `gameId` is a plain name (letters, digits,
//     `.`, `_`, `-`; no `..`) naming var/games/<gameId>/frames.jsonl, and the
//     real path must stay inside var/games/.  No other path is ever taken from
//     the request.
//   - The seat is the log's own (its header's `seat`): the log is that seat's
//     redacted view, and a request naming the other seat is refused.
//   - Hidden information (D348): there is no field for the opponent's deck.
//     `oppPool` (a cube list, at least 80 cards: the live guard's floor) and
//     `oppKnown` are written to the review's own folder
//     (var/coach-grade/review/<id>/pool.txt, known.txt) and passed as paths;
//     coach-grade.sh's live guard checks every moment again.
//   - Names never reach a command line: card names are checked against the
//     match launcher's pattern and go into files; the argv is an array, never a
//     shell string; numbers are range-checked integers.
//   - One review at a time (it is several JVMs); up to `queueMax` wait.  A
//     review that runs past `timeoutMs` is stopped (its process group).
//
// Its self-test is tools/review-runner-selftest.mjs (a fake coach-grade.sh;
// gate 12f, CI).

import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { cardNameOf } from './match-launcher.mjs';

export const REVIEW_VERSION = 1;
export const MAX_REVIEW_BODY = 256 * 1024;
export const GAME_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
export const REVIEW_ID = /^r[0-9]{13}$/;
export const MIN_POOL = 80;
export const MAX_POOL_ENTRIES = 2000;
export const MAX_KNOWN = 60;
export const LIMITS = { deepK: [1, 12], triageS: [5, 120], deepS: [30, 900] };
export const DEFAULT_QUEUE_MAX = 2;
export const KEEP_REVIEWS = 10;
const STAGES = ['plan', 'triage', 'deepen', 'report'];

const intIn = (v, [lo, hi]) => Number.isInteger(v) && v >= lo && v <= hi;

/**
 * Checks a POST /review body.  Returns { req, problems } -- `req` only when
 * there are no problems: { gameId, seat|null, pool: [[n, name]]|null,
 * known: [name]|null, deepK|null, triageS|null, deepS|null }.
 */
export function validateReview(q) {
  const problems = [];
  if (!q || typeof q !== 'object' || Array.isArray(q)) return { req: null, problems: ['the body must be a JSON object'] };
  const allowed = new Set(['gameId', 'seat', 'oppPool', 'oppKnown', 'deepK', 'triageS', 'deepS']);
  for (const k of Object.keys(q)) if (!allowed.has(k)) problems.push(`unknown field "${k}" (the AI's deck is never accepted; see docs/game-review.md)`);
  const gameId = q.gameId;
  if (typeof gameId !== 'string' || !GAME_ID.test(gameId) || gameId.includes('..')) {
    problems.push('"gameId" must be a game id: letters, digits, ".", "_", "-" (1-100 characters, no "..")');
  }
  let seat = null;
  if (q.seat !== undefined) {
    if (q.seat !== 0 && q.seat !== 1) problems.push('"seat" must be 0 or 1');
    else seat = q.seat;
  }
  let pool = null;
  if (q.oppPool !== undefined) {
    if (!Array.isArray(q.oppPool) || q.oppPool.length > MAX_POOL_ENTRIES) {
      problems.push(`"oppPool" must be an array of [n, "Card"] entries (at most ${MAX_POOL_ENTRIES})`);
    } else {
      pool = [];
      let total = 0;
      q.oppPool.forEach((e, i) => {
        if (!Array.isArray(e) || e.length !== 2 || !intIn(e[0], [1, 250]) || cardNameOf(e[1]) === null) {
          if (problems.length < 20) problems.push(`"oppPool"[${i}] must be [1-250, "Card Name"]`);
          return;
        }
        total += e[0];
        pool.push([e[0], cardNameOf(e[1])]);
      });
      if (total < MIN_POOL && problems.length === 0) {
        problems.push(`"oppPool" holds ${total} cards: a pool is the cube's list, at least ${MIN_POOL} (a deck is never accepted)`);
      }
    }
  }
  let known = null;
  if (q.oppKnown !== undefined) {
    if (!Array.isArray(q.oppKnown) || q.oppKnown.length > MAX_KNOWN) {
      problems.push(`"oppKnown" must be an array of card names (at most ${MAX_KNOWN})`);
    } else {
      known = [];
      q.oppKnown.forEach((n, i) => {
        const name = cardNameOf(n);
        if (name === null) { if (problems.length < 20) problems.push(`"oppKnown"[${i}] is not a card name`); } else known.push(name);
      });
    }
  }
  const num = {};
  for (const k of Object.keys(LIMITS)) {
    num[k] = null;
    if (q[k] !== undefined) {
      if (!intIn(q[k], LIMITS[k])) problems.push(`"${k}" must be a whole number, ${LIMITS[k][0]}-${LIMITS[k][1]}`);
      else num[k] = q[k];
    }
  }
  return problems.length ? { req: null, problems } : { req: { gameId, seat, pool, known, ...num }, problems };
}

/** The log of a game the engine wrote, or { error, status }: inside gamesDir, a regular file. */
export function gameLog(repoRoot, gamesDir, gameId) {
  const root = resolve(repoRoot, gamesDir);
  const rel = join(gamesDir, gameId, 'frames.jsonl');
  const abs = resolve(repoRoot, rel);
  if (!existsSync(abs)) return { status: 404, error: `no game "${gameId}" here (${rel} does not exist)` };
  let real;
  let realRoot;
  try { real = realpathSync(abs); realRoot = realpathSync(root); } catch (e) { return { status: 404, error: `cannot read ${rel}: ${e.code}` }; }
  const r = relative(realRoot, real);
  if (r.startsWith('..') || r.startsWith(sep) || r === '' || !statSync(real).isFile()) {
    return { status: 400, error: `${rel} is not a game log inside ${gamesDir}/` };
  }
  return { rel, abs: real };
}

/** The log header's seat (line 0), or null. */
export function headerSeat(abs) {
  try {
    const fd = openSync(abs, 'r');
    const buf = Buffer.alloc(64 * 1024);
    const n = readSync(fd, buf, 0, buf.length, 0);
    closeSync(fd);
    const text = buf.subarray(0, n).toString('utf8');
    const h = JSON.parse(text.slice(0, text.indexOf('\n') < 0 ? text.length : text.indexOf('\n')));
    return h && h.kind === 'session' && Number.isInteger(h.seat) ? h.seat : null;
  } catch { return null; }
}

/**
 * The runner.  `script` is coach-grade.sh (a fake in the self-test); `jobs` its
 * --jobs; `available()` decides /health's "review".
 */
export function createReviewRunner(opts) {
  const {
    repoRoot, gamesDir = 'var/games', workDir = 'var/coach-grade/review', script = 'tools/coach-grade.sh',
    jobs = 7, queueMax = DEFAULT_QUEUE_MAX, timeoutMs = 30 * 60 * 1000, keep = KEEP_REVIEWS,
    available = () => existsSync(resolve(repoRoot, 'bridge/out/mtgtable/grade')),
    spawnImpl = spawn, log = () => {}, now = () => Date.now(),
  } = opts;
  const reviews = new Map();   // id -> record, insertion order
  const queue = [];            // ids waiting
  let running = null;          // id
  let lastId = 0;

  const newId = () => {
    let t = now();
    if (t <= lastId) t = lastId + 1;
    lastId = t;
    return `r${String(t).padStart(13, '0').slice(-13)}`;
  };

  const view = (r, withReport) => {
    const o = { ok: true, id: r.id, gameId: r.gameId, state: r.state, createdAt: r.createdAt };
    if (r.state === 'queued') o.position = queue.indexOf(r.id);
    if (r.stage) o.stage = r.stage;
    if (r.startedAt) o.startedAt = r.startedAt;
    if (r.endedAt) o.endedAt = r.endedAt;
    if (r.error) o.error = r.error;
    if (withReport && r.state === 'done' && r.report) o.report = r.report;
    return o;
  };

  const prune = () => {
    const done = [...reviews.values()].filter((r) => r.state === 'done' || r.state === 'failed');
    while (done.length > keep) {
      const r = done.shift();
      reviews.delete(r.id);
    }
  };

  const pump = () => {
    if (running || !queue.length) return;
    const id = queue.shift();
    const r = reviews.get(id);
    running = id;
    start(r);
  };

  function start(r) {
    r.state = 'running';
    r.stage = 'plan';
    r.startedAt = new Date(now()).toISOString();
    const dir = join(workDir, r.id);
    const absDir = resolve(repoRoot, dir);
    mkdirSync(absDir, { recursive: true });
    const args = [script, 'review', '--log', r.log, '--seat', String(r.seat), '--run', r.id,
      '--out', join(dir, 'report.json'), '--jobs', String(jobs)];
    if (r.req.triageS !== null) args.push('--triage-s', String(r.req.triageS));
    if (r.req.deepS !== null) args.push('--deep-s', String(r.req.deepS));
    if (r.req.deepK !== null) args.push('--deep-k', String(r.req.deepK));
    if (r.req.pool) {
      writeFileSync(join(absDir, 'pool.txt'), r.req.pool.map(([n, name]) => `${n} ${name}`).join('\n') + '\n');
      args.push('--opp-pool', join(dir, 'pool.txt'));
    }
    if (r.req.known && r.req.known.length) {
      writeFileSync(join(absDir, 'known.txt'), r.req.known.map((n) => `1 ${n}`).join('\n') + '\n');
      args.push('--opp-known', join(dir, 'known.txt'));
    }
    let child;
    try {
      child = spawnImpl('bash', args, { cwd: repoRoot, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      finish(r, 'failed', `could not start the review: ${e.message}`);
      return;
    }
    r.child = child;
    let out = '';
    let lastLines = [];
    const timer = setTimeout(() => { r.timedOut = true; killGroup(child); }, timeoutMs);
    timer.unref?.();
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d) => {
      out += d;
      let i;
      while ((i = out.indexOf('\n')) >= 0) {
        const line = out.slice(0, i).trim();
        out = out.slice(i + 1);
        if (!line) continue;
        lastLines = [...lastLines, line].slice(-5);
        const m = /^REVIEW STAGE (\w+)/.exec(line);
        if (m && STAGES.includes(m[1])) r.stage = m[1];
        const f = /^REVIEW FAILED (.*)$/.exec(line);
        if (f) r.failure = f[1].slice(0, 400);
      }
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (d) => { lastLines = [...lastLines, ...String(d).trim().split('\n')].slice(-5); });
    child.on('error', (e) => { r.spawnError = e.message; });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      r.child = null;
      const file = resolve(absDir, 'report.json');
      if (r.timedOut) { finish(r, 'failed', `the review ran past ${Math.round(timeoutMs / 60000)} min and was stopped`); return; }
      if (r.cancelled) { finish(r, 'failed', 'stopped: the helper is shutting down'); return; }
      if (code === 0 && existsSync(file)) {
        try {
          const report = JSON.parse(readFileSync(file, 'utf8'));
          if (!report || report.kind !== 'game-review') throw new Error('not a game-review report');
          r.report = report;
          finish(r, 'done');
          return;
        } catch (e) { finish(r, 'failed', `the report could not be read: ${e.message}`); return; }
      }
      const why = r.spawnError ?? r.failure ?? (lastLines.join(' | ').slice(0, 400) || (signal ? `stopped by ${signal}` : `exit ${code}`));
      finish(r, 'failed', `the review failed: ${why}`);
    });
  }

  function killGroup(child) {
    const k = (sig) => { try { process.kill(-child.pid, sig); } catch { try { child.kill(sig); } catch { /* gone */ } } };
    k('SIGTERM');
    setTimeout(() => k('SIGKILL'), 3000).unref?.();
  }

  function finish(r, state, error) {
    r.state = state;
    r.endedAt = new Date(now()).toISOString();
    if (error) r.error = error;
    log(`REVIEW ${r.id} ${r.gameId} -> ${state}${error ? `: ${error}` : ''}`);
    if (running === r.id) running = null;
    prune();
    pump();
  }

  return {
    available,
    health() {
      const on = available() ? 1 : 0;
      return on ? { review: 1, reviewQueue: { max: queueMax, length: queue.length, running: running ? 1 : 0 } } : { review: 0 };
    },
    post(q) {
      if (!available()) return { status: 503, body: { ok: false, type: 'error', message: 'the review is off here: the bridge is not built (./bridge/build.sh)' } };
      const { req, problems } = validateReview(q);
      if (!req) return { status: 400, body: { ok: false, type: 'error', message: problems[0], problems } };
      const g = gameLog(repoRoot, gamesDir, req.gameId);
      if (g.error) return { status: g.status, body: { ok: false, type: 'error', message: g.error } };
      const seat = headerSeat(g.abs);
      if (seat === null) return { status: 400, body: { ok: false, type: 'error', message: `${g.rel} has no session header` } };
      if (req.seat !== null && req.seat !== seat) {
        return { status: 400, body: { ok: false, type: 'error', message: `this game's log is seat ${seat}'s view; a review of seat ${req.seat} needs that seat's own log` } };
      }
      if (queue.length >= queueMax && running) {
        return { status: 429, body: { ok: false, type: 'error', message: 'reviews are queued already — try again when one finishes' } };
      }
      const id = newId();
      const r = { id, gameId: req.gameId, log: g.rel, seat, req, state: 'queued', createdAt: new Date(now()).toISOString() };
      reviews.set(id, r);
      queue.push(id);
      log(`REVIEW ${id} ${req.gameId} queued`);
      pump();
      return { status: 202, body: view(r, false) };
    },
    get(id) {
      if (typeof id !== 'string' || !REVIEW_ID.test(id) || !reviews.has(id)) {
        return { status: 404, body: { ok: false, type: 'error', message: 'no such review (the helper keeps the last few)' } };
      }
      return { status: 200, body: view(reviews.get(id), true) };
    },
    list() {
      const all = [...reviews.values()].reverse().map((r) => ({ id: r.id, gameId: r.gameId, state: r.state }));
      return { status: 200, body: { ok: true, reviews: all } };
    },
    close() {
      for (const r of reviews.values()) {
        if (r.child) { r.cancelled = true; killGroup(r.child); }
      }
    },
    /** For the self-test: the work folder of a review. */
    dirOf(id) { return resolve(repoRoot, workDir, id); },
  };
}

/** Old review folders beyond the newest `keep`, removed (only r<digits> folders under workDir). */
export function cleanOld(repoRoot, workDir = 'var/coach-grade/review', keep = 20) {
  const abs = resolve(repoRoot, workDir);
  if (!existsSync(abs)) return 0;
  const ids = readdirSync(abs).filter((n) => REVIEW_ID.test(n)).sort();
  const old = ids.slice(0, Math.max(0, ids.length - keep));
  for (const n of old) rmSync(join(abs, n), { recursive: true, force: true });
  return old.length;
}
