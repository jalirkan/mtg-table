// mtg-table — tools/hint-runner.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// THE SEARCH HINT (D429): the coach helper's POST /hint -- "what would the
// search AI do?" for the ONE decision a player has in front of them, asked for
// with a button, answered in a few seconds by the live analysis (D336: the
// review's triage settings, playouts to the end of this turn scored by the
// leaf evaluator) on this machine.  tools/coach-helper.mjs routes /hint here,
// behind the same Origin and LAN-token gate as /coach and /review.
// docs/search-hint.md is the copyable contract; this header repeats its shapes.
//
//   GET  /health  gains "hint": 1 when the analysis can run here (the bridge is
//                 built: bridge/out/mtgtable/grade/ exists), else "hint": 0; with
//                 1 also "hintEngine": "idle"|"starting"|"ready" and
//                 "hintBudgetMs": {"default": 3000, "min": 1500, "max": 6000}.
//   POST /hint    {"gameId": "<id>", "seat"?: 0|1, "stateSeq": <n>, "inputSeq"?: <n>,
//                  "oppPool"?: [[n, "Card"], ...]   (the cube list: 80+ cards),
//                  "oppKnown"?: ["Card", ...]       (AI picks the player saw: 60 at most),
//                  "budgetMs"?: 1500-6000}
//                 -> 200 {"ok":true,"v":1,"kind":"search-hint","status":"ok"|"trivial"|"unsupported", ...}
//                 (the full answer is docs/search-hint.md's)
//                 409 {"ok":false,"code":"moved-on"|"superseded"|"not-yet", "message"}
//                 400 bad input · 403 a game between two people, or knowledge the
//                 live guard refuses (status "refused") · 404 no such game · 405 ·
//                 413 over 256 KB · 429 too many waiting · 503 off · 504 no answer in time.
//
// THE RULES IT KEEPS:
//   - The moment is read from the bridge's OWN log of that game
//     (var/games/<gameId>/frames.jsonl: the seat's redacted view, the session
//     header with the player's own deck), never from frames a request sends.
//     The request names the moment by the `seq` of the state (and input) the
//     board shows; a log that has moved past it is "moved-on" (409), one that
//     has not reached it yet is waited for briefly, then "not-yet" (409).
//   - Hidden information (D348, as the review): no field for the opponent's
//     deck (an unknown field is refused, and says so); `oppPool` / `oppKnown`
//     are validated by the review's own rules (review-runner.mjs) and written
//     to files; the analysis runs HiddenPool.checkLive on every request.  With
//     no pool the opponent's hidden cards are basic lands, and the answer's
//     `knowledge.opponentModel` says "basic-lands".
//   - A game between two people (`friend-...`, D402/D407) is refused: a seat's
//     log there holds that player's hand, and this door is the host's.
//   - One analysis at a time (one booted engine, `coach-grade.sh serve`, started
//     on the first request, at low priority -- nice 10 -- so the live game is
//     never slowed; stopped after `idleMs` without a request).  A newer request
//     for the same game SUPERSEDES the older one: a waiting one is answered 409
//     "superseded" at once, a running one when it ends.  Requests for other
//     games wait in a queue of `queueMax`.
//
// Its self-test is tools/hint-runner-selftest.mjs (a fake coach-grade.sh serve;
// gate 12f, CI).  The real engine's proof is tools/hint-probe.mjs.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { FRIEND_GAME, GAME_ID, gameLog, readLogText, validateReview } from './review-runner.mjs';

export const HINT_VERSION = 1;
export const MAX_HINT_BODY = 256 * 1024;
export const BUDGET_MS = { default: 3000, min: 1500, max: 6000 };
/** A regret below this is a tie with the best (ForgeCoach's gameReview.ts TIE_REGRET). */
export const TIE_REGRET = 0.005;
/** Below this a regret's lower bound is zero (Review.CLEAR). */
export const CLEAR = 1e-9;
export const DEFAULT_QUEUE_MAX = 2;
const SEQ_MAX = 2 ** 31;

const intIn = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const err = (status, message, extra = {}) => ({ status, body: { ok: false, type: 'error', ...extra, message } });

/**
 * Checks a POST /hint body.  Returns { req, problems } -- `req` only when there
 * are none: { gameId, seat|null, stateSeq, inputSeq|null, pool, known, budgetMs }.
 */
export function validateHint(q) {
  if (!q || typeof q !== 'object' || Array.isArray(q)) return { req: null, problems: ['the body must be a JSON object'] };
  const problems = [];
  const allowed = new Set(['gameId', 'seat', 'stateSeq', 'inputSeq', 'oppPool', 'oppKnown', 'budgetMs']);
  for (const k of Object.keys(q)) {
    if (!allowed.has(k)) problems.push(`unknown field "${k}" (the hint knows only what the player knows: the AI's deck is never accepted; see docs/search-hint.md)`);
  }
  // The game id, seat, pool and known picks: the review's own rules (one validator, D348).
  const rv = validateReview({ gameId: q.gameId, ...(q.seat !== undefined ? { seat: q.seat } : {}),
    ...(q.oppPool !== undefined ? { oppPool: q.oppPool } : {}), ...(q.oppKnown !== undefined ? { oppKnown: q.oppKnown } : {}) });
  problems.push(...rv.problems);
  if (!intIn(q.stateSeq, 1, SEQ_MAX)) problems.push('"stateSeq" must be the seq of the state frame the board shows (a whole number from 1)');
  let inputSeq = null;
  if (q.inputSeq !== undefined && q.inputSeq !== null) {
    if (!intIn(q.inputSeq, 1, SEQ_MAX)) problems.push('"inputSeq" must be the seq of the input frame the board shows');
    else inputSeq = q.inputSeq;
  }
  let budgetMs = BUDGET_MS.default;
  if (q.budgetMs !== undefined) {
    if (!intIn(q.budgetMs, BUDGET_MS.min, BUDGET_MS.max)) problems.push(`"budgetMs" must be a whole number, ${BUDGET_MS.min}-${BUDGET_MS.max}`);
    else budgetMs = q.budgetMs;
  }
  if (problems.length) return { req: null, problems };
  return { req: { gameId: rv.req.gameId, seat: rv.req.seat, stateSeq: q.stateSeq, inputSeq, pool: rv.req.pool, known: rv.req.known, budgetMs }, problems };
}

/**
 * The moment in a log's text: the header and every complete frame line, when
 * the log's latest state is `stateSeq` (and its latest input `inputSeq`, when
 * given).  { state: 'ok', text, frames } | { state: 'moved' } | { state: 'behind' }
 * | { state: 'bad', why }.
 */
export function momentOf(text, stateSeq, inputSeq = null) {
  if (typeof text !== 'string' || !text) return { state: 'bad', why: 'the log is empty' };
  const raw = text.split('\n');
  // A live log's last line may still be being written: only complete lines count.
  if (!text.endsWith('\n')) raw.pop();
  const lines = raw.filter((l) => l.trim() !== '');
  if (!lines.length) return { state: 'bad', why: 'the log is empty' };
  let head;
  try { head = JSON.parse(lines[0]); } catch { return { state: 'bad', why: 'line 0 is not JSON' }; }
  if (!head || head.kind !== 'session') return { state: 'bad', why: 'line 0 is not a session header' };
  let lastState = -1;
  let lastInput = -1;
  let seen = false;
  for (let i = 1; i < lines.length; i++) {
    let f;
    try { f = JSON.parse(lines[i]); } catch { return { state: 'bad', why: `line ${i} is not JSON` }; }
    if (!f || f.dir === 'c2s') continue;
    if (f.type === 'state' && Number.isInteger(f.seq)) {
      lastState = Math.max(lastState, f.seq);
      if (f.seq === stateSeq) seen = true;
    } else if (f.type === 'input' && Number.isInteger(f.seq)) {
      lastInput = Math.max(lastInput, f.seq);
    } else if (f.type === 'over') {
      return { state: 'moved' };
    }
  }
  if (lastState > stateSeq || (inputSeq !== null && lastInput > inputSeq)) return { state: 'moved' };
  if (!seen || (inputSeq !== null && lastInput < inputSeq)) return { state: 'behind' };
  return { state: 'ok', text: `${lines.join('\n')}\n`, frames: lines.length - 1, seat: Number.isInteger(head.seat) ? head.seat : null };
}

/** knowledge.opponentModel from the grader's `opponent` (Review.opponentModel). */
export function opponentModelOf(src) {
  if (typeof src !== 'string') return 'basic-lands';
  if (src.startsWith('pool:')) return 'pool';
  if (src.startsWith('deck:')) return 'deck';
  return 'basic-lands';
}

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);

/**
 * One option's word, in the review's vocabulary and never stronger than its
 * interval: `best`; `tie` (not the best, but its regret is under TIE_REGRET);
 * `close` (its regret interval includes zero); `worse` (the interval excludes
 * zero); `not-graded` (no playout of it finished).
 */
export function optionVerdict(o) {
  if (!o || !(o.n > 0) || num(o.winRate) === null) return 'not-graded';
  if (o.best === true) return 'best';
  if (num(o.regret) !== null && Math.abs(o.regret) < TIE_REGRET) return 'tie';
  return num(o.regretLo) !== null && o.regretLo > CLEAR ? 'worse' : 'close';
}

/**
 * The grader's answer as the hint: the options ranked (the best first, then by
 * the estimate), each with its word; the pick; the runner-up when it is a tie
 * or a close call (the best of those); and the pick's strength: `clear` only
 * when every other graded option is `worse`, else `close`.
 */
export function hintOf(g, ctx) {
  const base = {
    ok: true, v: HINT_VERSION, kind: 'search-hint', gameId: ctx.gameId, seat: ctx.seat, stateSeq: ctx.stateSeq,
    inputSeq: ctx.inputSeq, frame: num(g.frame) ?? ctx.frame, status: g.status, budgetMs: ctx.budgetMs,
  };
  if (typeof g.type === 'string') base.type = g.type;
  if (Number.isInteger(g.turn)) base.turn = g.turn;
  if (typeof g.phase === 'string') base.phase = g.phase;
  base.knowledge = { opponent: typeof g.opponent === 'string' ? g.opponent : 'unknown', opponentModel: opponentModelOf(g.opponent),
    ownDeck: typeof g.ownDeck === 'string' ? g.ownDeck : null };
  if (num(g.wallMs) !== null) base.ms = g.wallMs;
  if (g.status !== 'ok' && g.status !== 'trivial') {
    return { ...base, message: typeof g.error === 'string' ? g.error.slice(0, 400) : `the analysis answered ${g.status}` };
  }
  const opts = (Array.isArray(g.options) ? g.options : []).filter((o) => o && typeof o.token === 'string');
  const alias = new Map();
  for (const o of opts) if (typeof o.alias === 'string') alias.set(o.alias, [...(alias.get(o.alias) ?? []), o.token]);
  const rows = opts.filter((o) => typeof o.alias !== 'string').map((o) => {
    const r = { token: o.token, label: typeof o.label === 'string' ? o.label.slice(0, 200) : o.token, forge: o.forge === true };
    if (g.status === 'ok') {
      Object.assign(r, { n: num(o.n) ?? 0, winRate: num(o.winRate), winLo: num(o.winLo), winHi: num(o.winHi),
        regret: num(o.regret), regretLo: num(o.regretLo), regretHi: num(o.regretHi) });
      r.verdict = optionVerdict(o);
    }
    if (alias.has(o.token)) r.same = alias.get(o.token);
    return r;
  });
  if (g.status === 'trivial') {
    return { ...base, options: rows, ...(rows.length === 1 ? { pick: rows[0].token, strength: 'only' } : {}),
      ...(Number.isInteger(g.landFirst) ? { landFirst: g.landFirst } : {}) };
  }
  const order = { best: 0, tie: 1, close: 2, worse: 3, 'not-graded': 4 };
  rows.sort((a, b) => (order[a.verdict] - order[b.verdict]) || ((b.winRate ?? -1) - (a.winRate ?? -1)));
  const best = rows.find((r) => r.verdict === 'best') ?? null;
  const rivals = rows.filter((r) => r !== best && (r.verdict === 'tie' || r.verdict === 'close'));
  const out = { ...base, measure: g.measure === 'wins' ? 'wins' : 'leaf', rounds: num(g.rounds), playouts: num(g.playouts), options: rows };
  if (typeof g.forgeChoice === 'string') out.forgeChoice = g.forgeChoice;
  if (Number.isInteger(g.landFirst)) out.landFirst = g.landFirst;
  if (!best) return { ...out, status: 'unsupported', message: 'no option finished a playout' };
  out.pick = best.token;
  out.strength = rivals.length ? 'close' : 'clear';
  if (rivals.length) out.runnerUp = rivals[0].token;
  return out;
}

/**
 * The runner.  `script` is coach-grade.sh (a fake in the self-test).
 * opts: { repoRoot, gamesDir, workDir, script, spawnImpl, available, log, now,
 *         bootTimeoutMs, idleMs, queueMax, waitLogMs, prefix }.
 */
export function createHintRunner(opts) {
  const {
    repoRoot, gamesDir = 'var/games', workDir = 'var/coach-grade/hint', script = 'tools/coach-grade.sh',
    spawnImpl = spawn, available = () => existsSync(resolve(repoRoot, 'bridge/out/mtgtable/grade')),
    log = () => {}, bootTimeoutMs = 180_000, idleMs = 20 * 60_000, queueMax = DEFAULT_QUEUE_MAX,
    waitLogMs = 2000, prefix = ['nice', '-n', '10'], env = {},
  } = opts;
  let child = null;
  let engine = 'idle';             // idle | starting | ready
  let starting = null;
  let buf = '';
  let stderrTail = '';
  let idleTimer = null;
  let nextId = 1;
  let running = null;              // { id, key, job, timer }
  const queue = [];                // jobs waiting: { key, req, resolve, t0 }

  const stopIdleTimer = () => { if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; } };
  const armIdleTimer = () => {
    stopIdleTimer();
    if (!child || running || queue.length) return;
    idleTimer = setTimeout(() => { log('HINT engine idle: stopped'); stop(); }, idleMs);
    idleTimer.unref?.();
  };

  function stop() {
    stopIdleTimer();
    const c = child;
    child = null;
    engine = 'idle';
    starting = null;
    if (c) {
      try { process.kill(-c.pid, 'SIGTERM'); } catch { try { c.kill('SIGTERM'); } catch { /* gone */ } }
    }
  }

  function boot() {
    if (engine === 'ready' && child) return Promise.resolve(true);
    if (starting) return starting;
    engine = 'starting';
    buf = '';
    stderrTail = '';
    starting = new Promise((done) => {
      const args = [script, 'serve'];
      let c;
      try {
        c = spawnImpl(prefix.length ? prefix[0] : 'bash', [...prefix.slice(1), ...(prefix.length ? ['bash'] : []), ...args],
          { cwd: repoRoot, detached: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, COACH_GRADE_HOME: 'hint-home', ...env } });
      } catch (e) {
        engine = 'idle';
        starting = null;
        done(`could not start the analysis: ${e.message}`);
        return;
      }
      child = c;
      let ready = false;
      const t = setTimeout(() => {
        if (ready) return;
        log(`HINT engine did not start within ${Math.round(bootTimeoutMs / 1000)} s`);
        stop();
        done(`the analysis did not start within ${Math.round(bootTimeoutMs / 1000)} s`);
      }, bootTimeoutMs);
      t.unref?.();
      c.stdin.on('error', () => { /* a child that died */ });
      c.stderr.setEncoding('utf8');
      c.stderr.on('data', (d) => { stderrTail = (stderrTail + d).slice(-2000); });
      c.stdout.setEncoding('utf8');
      c.stdout.on('data', (d) => {
        buf += d;
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line.startsWith('{')) continue;
          let o;
          try { o = JSON.parse(line); } catch { continue; }
          if (!ready) {
            if (o && o.ready === true) {
              ready = true;
              clearTimeout(t);
              engine = 'ready';
              starting = null;
              log('HINT engine ready');
              done(true);
            }
            continue;
          }
          answered(o);
        }
      });
      c.on('error', (e) => { log(`HINT engine: ${e.message}`); });
      c.on('close', (code, signal) => {
        clearTimeout(t);
        if (c !== child && child !== null) return;
        child = null;
        engine = 'idle';
        const why = stderrTail.trim().split('\n').filter(Boolean).slice(-1)[0] ?? `exit ${signal ?? code}`;
        if (!ready) { starting = null; done(`the analysis stopped while starting: ${why.slice(0, 240)}`); }
        if (running) {
          const r = running;
          running = null;
          clearTimeout(r.timer);
          r.job.resolve(err(500, `the analysis stopped: ${why.slice(0, 240)}`));
          pump();
        }
      });
    });
    return starting;
  }

  function answered(o) {
    if (!running || !o || String(o.id) !== String(running.id)) return;
    const r = running;
    running = null;
    clearTimeout(r.timer);
    const j = r.job;
    const wallMs = Date.now() - j.t0;
    if (j.superseded) {
      j.resolve(err(409, 'a newer hint for this game was asked for', { code: 'superseded' }));
    } else if (o.status === 'refused') {
      j.resolve(err(403, `refused: ${String(o.error ?? 'the hidden-information guard').slice(0, 300)}`, { status: 'refused' }));
    } else if (o.status === 'error') {
      j.resolve(err(500, `the analysis failed: ${String(o.error ?? '').slice(0, 300)}`));
    } else {
      const body = hintOf(o, { ...j.ctx, budgetMs: j.req.budgetMs });
      body.wallMs = wallMs;
      log(`HINT ${j.req.gameId} state ${j.req.stateSeq}: ${body.status}${body.pick ? ` ${body.pick} (${body.strength}${body.runnerUp ? `, ${body.runnerUp}` : ''})` : ''} in ${wallMs} ms`);
      j.resolve({ status: 200, body });
    }
    pump();
  }

  async function run(j) {
    // Pin the moment: the bridge's own log, as it is now.
    const g = gameLog(repoRoot, gamesDir, j.req.gameId);
    if (g.error) return err(g.status, g.error);
    let m = null;
    const until = Date.now() + waitLogMs;
    for (;;) {
      const text = readLogText(g.abs);
      m = text === null ? { state: 'bad', why: 'the log cannot be read' } : momentOf(text, j.req.stateSeq, j.req.inputSeq);
      if (m.state !== 'behind' || Date.now() >= until || j.superseded) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    if (j.superseded) return err(409, 'a newer hint for this game was asked for', { code: 'superseded' });
    if (m.state === 'bad') return err(400, `${g.rel}: ${m.why}`);
    if (m.state === 'moved') return err(409, 'the game has moved on from this moment', { code: 'moved-on' });
    if (m.state === 'behind') return err(409, "the engine's log does not have this moment yet", { code: 'not-yet' });
    if (m.seat === null) return err(400, `${g.rel} has no seat in its header`);
    if (j.req.seat !== null && j.req.seat !== m.seat) {
      return err(400, `this game's log is seat ${m.seat}'s view; a hint for seat ${j.req.seat} needs that seat's own log`);
    }
    const ok = await boot();
    if (ok !== true) return err(503, ok);
    if (j.superseded) return err(409, 'a newer hint for this game was asked for', { code: 'superseded' });
    // The moment and the knowledge, in files of the hint's own (one analysis at a time).
    const dir = resolve(repoRoot, workDir);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const logFile = join(workDir, 'moment.jsonl');
    writeFileSync(resolve(repoRoot, logFile), m.text);
    const sreq = { id: String(nextId++), log: logFile, type: 'auto', frame: m.frames, budgetMs: j.req.budgetMs };
    if (j.req.pool) {
      writeFileSync(join(dir, 'pool.txt'), j.req.pool.map(([n, name]) => `${n} ${name}`).join('\n') + '\n');
      sreq.oppPool = join(workDir, 'pool.txt');
    }
    if (j.req.known && j.req.known.length) sreq.oppKnown = j.req.known;
    j.ctx = { gameId: j.req.gameId, seat: m.seat, stateSeq: j.req.stateSeq, inputSeq: j.req.inputSeq, frame: m.frames };
    // Handed to the engine: answered() (or the timer, or the engine's exit) answers the job.
    const timer = setTimeout(() => {
      if (!running || running.job !== j) return;
      running = null;
      log(`HINT ${j.req.gameId}: no answer in time; the analysis is restarted on the next request`);
      stop();
      j.resolve(err(504, `the analysis did not answer within ${Math.round((j.req.budgetMs + 60_000) / 1000)} s`));
      pump();
    }, j.req.budgetMs + 60_000);
    timer.unref?.();
    running = { id: sreq.id, key: j.key, job: j, timer };
    try {
      child.stdin.write(JSON.stringify(sreq) + '\n');
    } catch (e) {
      running = null;
      clearTimeout(timer);
      return err(500, `the analysis could not be asked: ${e.message}`);
    }
    return null;
  }

  let pumping = null;              // the job between the queue and the engine (reading the log, booting)
  function pump() {
    if (pumping || running || !queue.length) { armIdleTimer(); return; }
    stopIdleTimer();
    const j = queue.shift();
    pumping = j;
    run(j).then((r) => { if (r) j.resolve(r); }, (e) => j.resolve(err(500, `the hint failed: ${e.message}`)))
      .finally(() => { pumping = null; pump(); });
  }

  return {
    available,
    health() {
      return available() ? { hint: 1, hintEngine: engine, hintBudgetMs: { ...BUDGET_MS } } : { hint: 0 };
    },
    describe() {
      return available() ? `/hint on: tools/coach-grade.sh serve, started on the first hint (now ${engine})` : '/hint off: the bridge is not built (./bridge/build.sh)';
    },
    /** POST /hint -> Promise<{status, body}>. */
    post(q) {
      if (!available()) return Promise.resolve(err(503, 'the search hint is off here: the bridge is not built (./bridge/build.sh)'));
      const { req, problems } = validateHint(q);
      if (!req) return Promise.resolve({ status: 400, body: { ok: false, type: 'error', message: problems[0], problems } });
      if (FRIEND_GAME.test(req.gameId)) {
        return Promise.resolve(err(403, 'a game between two people has no search hint: its log holds one player\'s hand, and this computer is the host\'s'));
      }
      if (!GAME_ID.test(req.gameId)) return Promise.resolve(err(400, 'bad game id'));
      const key = req.gameId;
      // A newer request for the same game supersedes the older one, waiting or running.
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].key === key) {
          const old = queue.splice(i, 1)[0];
          old.superseded = true;
          old.resolve(err(409, 'a newer hint for this game was asked for', { code: 'superseded' }));
        }
      }
      if (running && running.key === key) running.job.superseded = true;
      if (pumping && pumping.key === key) pumping.superseded = true;
      if (queue.length >= queueMax) return Promise.resolve(err(429, 'hints for other games are waiting -- try again in a few seconds'));
      return new Promise((resolveP) => {
        const j = { key, req, t0: Date.now(), done: false };
        j.resolve = (r) => { if (!j.done) { j.done = true; resolveP(r); } };
        queue.push(j);
        pump();
      });
    },
    close() { stop(); },
    /** For the self-test. */
    state: () => ({ engine, running: running ? running.key : null, queue: queue.map((j) => j.key) }),
  };
}
