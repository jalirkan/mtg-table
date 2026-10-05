// mtg-table — tools/auto-review.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// THE AUTOMATIC REVIEW (D385): every human game the bridge finishes is
// reviewed by the engine without anyone asking, at low priority, when the lab
// runner leaves room for it.  The coach helper (tools/coach-helper.mjs) owns
// one of these beside its review runner (tools/review-runner.mjs) and hands
// every review to that runner's own `post` -- the same validation, log, seat
// and knowledge rules as `POST /review` (D348, D353) -- so the report lands
// where `GET /review/<id>` already finds it, marked "auto": true.
//
// HOW IT LEARNS A GAME ENDED.  It polls the directory the bridge writes every
// seat's log into, var/games/ (every `pollMs`, default 15 s), and looks only at
// the two id shapes a person's game has there (human_collect.py's GAME_ID,
// D369): `human-(ws|console)-<seed>` (play.sh, MtgTable's default id) and
// `match-m<13 digits>` (a match ForgeCoach launched, D303), each with an
// optional `-g<n>` (game n of the match, M38).  The gate, the smoke runs, the
// lab and the cube lab write other ids or other directories, and spectating
// writes var/spectate/.  A log is a person's finished game when
//   - its session header's `transport` is `ws` or `console` (a seat a person
//     played; `auto`/`null` are scripted, an AI-vs-AI recording has none),
//   - `hello_ok.you` is the header's seat, that player is not an AI and every
//     other player is,
//   - it holds an `over` whose body names a winner or a reason (an engine crash's
//     null `over`, M46, and a game in progress are not finished).
// The log is `frames.jsonl`, or `frames.jsonl.gz` when that is all there is (the
// Java reader takes both, #73).  Only logs written after the queue file was
// first made are taken (`since`): turning this on does not review your history.
//
// THE QUEUE FILE, var/coach-grade/auto-review/queue.json (`v`: 1):
//   { v, since, items: [ { key, gameId, log, seat, logMtime, state:
//     "pending"|"running"|"done"|"failed"|"skipped", reviewId?, attempts,
//     queuedAt, startedAt?, endedAt?, why? } ] }
// written whole to a temporary file, fsynced and renamed over the old one, the
// old one kept as queue.json.bak; read from queue.json, else the .bak, else a
// fresh queue (a torn or foreign file is moved aside, never trusted).  A game's
// key is its header's gameId|seed|startedAt (human_collect.py's), so a game id
// played twice (`--seed 42` again) is two games.  On a restart a `running` item
// is `pending` again (a review is not resumable: it runs again from the start)
// unless it has been started MAX_ATTEMPTS times.  A game is never reviewed
// twice: a key already in the file is never queued again, and before a review
// is queued AND again before it starts, a review of the same log that already
// exists -- in the runner's list (asked for over HTTP, or automatic) or on
// disk (var/coach-grade/review/r*/report.json naming this log, newer than it)
// -- makes the item `skipped`.
//
// WHEN IT RUNS.  One review at a time, and only when all of these hold:
//   - the review runner is idle (nothing running, nothing waiting: an automatic
//     review never takes a queue slot a person's request needs, and a request
//     preempts a running automatic review, which goes back to `pending`);
//   - the lab runner (tools/runner/, D337) is idle or below its core budget,
//     read from its status.json (statusjson.ts, schema 1): no file, or a
//     `heartbeat` (else `updated`, else the file's mtime) older than `staleMs`
//     (2 min; the runner writes it every 10 s tick) -- no runner -- is idle;
//     `state` "idle" or an empty `running` is idle; else `host.coresTotal -
//     host.coresUsed` cores are free and at least one must be, and the review's
//     --jobs is at most that many;
//   - newest game first.
// The review runs under `nice -n 19` and `ionice -c 3 -t` (idle I/O class;
// `-t`: run anyway where the class cannot be set), each only where it works
// here (probed once); without `nice` the runner sets the niceness itself.  Every JVM
// coach-grade.sh starts inherits both.
//
// THE SWITCH.  config.json `coach.autoReview` (default true; false turns it
// off), or the helper's --no-auto-review.  /health carries "autoReview": 1|0
// and, with 1, "autoReviewQueue": {"pending", "running", "gate"} -- `gate` is
// "open", "review-busy" or "lab-busy".  "autoReview" is 0 wherever "review" is.
//
// Its self-test is tools/auto-review-selftest.mjs (a fake coach-grade.sh, a
// fake runner status; gate 12f, CI).

import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, renameSync, statSync, writeSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { gameLog, readLogText, REVIEW_ID } from './review-runner.mjs';

export const QUEUE_VERSION = 1;
export const HUMAN_GAME_ID = /^(human-(ws|console)-\d+|match-m\d{13})(-g\d+)?$/;
export const HUMAN_TRANSPORTS = ['ws', 'console'];
export const DEFAULT_QUEUE_FILE = 'var/coach-grade/auto-review/queue.json';
export const DEFAULT_POLL_MS = 15_000;
export const STALE_MS = 120_000;
export const MAX_ATTEMPTS = 3;
export const KEEP_ITEMS = 500;
const TAIL_BYTES = 64 * 1024;

// ---------------------------------------------------------------------------
// Is this a person's finished game?
// ---------------------------------------------------------------------------

/** The line's JSON, or null. */
const parse = (l) => { try { return JSON.parse(l); } catch { return null; } };

/**
 * Judges a log's text: { ok: true, seat, key, gameId } for a person's finished
 * game against the AI, else { ok: false, why }.  Only the header, hello_ok and
 * `over` lines are parsed.
 */
export function judgeHumanGame(text) {
  if (typeof text !== 'string' || !text) return { ok: false, why: 'unreadable' };
  const nl = text.indexOf('\n');
  const h = parse(nl < 0 ? text : text.slice(0, nl));
  if (!h || h.kind !== 'session') return { ok: false, why: 'no session header' };
  if (!HUMAN_TRANSPORTS.includes(h.transport)) return { ok: false, why: `transport ${JSON.stringify(h.transport ?? null)} is not a person's seat` };
  let hello = null;
  let over = null;
  for (const line of text.split('\n')) {
    if (!hello && line.includes('"hello_ok"')) { const o = parse(line); if (o && o.type === 'hello_ok') hello = o.body ?? null; }
    if (line.includes('"over"')) { const o = parse(line); if (o && o.type === 'over') over = o; }
  }
  if (!hello) return { ok: false, why: 'no hello_ok' };
  if (hello.you !== h.seat) return { ok: false, why: "the header's seat is not hello_ok.you" };
  const players = Array.isArray(hello.players) ? hello.players : [];
  const me = players.filter((p) => p && p.id === h.seat);
  const others = players.filter((p) => p && p.id !== h.seat);
  if (!me.length || me[0].isAi) return { ok: false, why: 'the viewing seat is an AI' };
  if (!others.length || !others.every((p) => p.isAi)) return { ok: false, why: 'the other player is not an AI' };
  const b = over?.body;
  if (!b || !(Number.isInteger(b.winner) || typeof b.reason === 'string')) return { ok: false, why: 'not finished' };
  return { ok: true, seat: h.seat, gameId: h.gameId, key: `${h.gameId}|${h.seed}|${h.startedAt}` };
}

/** Cheap first look at a plain log: does its tail hold an `over` at all?  (A gzip is read whole.) */
function mayBeOver(abs, size) {
  let fd;
  try {
    fd = openSync(abs, 'r');
    const magic = Buffer.alloc(2);
    if (readSync(fd, magic, 0, 2, 0) === 2 && magic[0] === 0x1f && magic[1] === 0x8b) return true;
    const len = Math.min(TAIL_BYTES, size);
    const tail = Buffer.alloc(len);
    const n = readSync(fd, tail, 0, len, size - len);
    return tail.subarray(0, n).toString('utf8').includes('"over"');
  } catch { return false; } finally { if (fd !== undefined) closeSync(fd); }
}

// ---------------------------------------------------------------------------
// The lab runner's status (tools/runner/statusjson.ts, schema 1).
// ---------------------------------------------------------------------------

/**
 * Where the lab runner keeps status.json, as tools/runner/cli.ts resolves its
 * state: the lab's own clone (<lab root>/runner/var/runner, the lab root
 * $MTGTABLE_LAB_ROOT's parent, else beside this checkout, else ~/code/lab),
 * else this checkout's var/runner.
 */
export function runnerStatusFile(repoRoot, env = process.env) {
  const labs = [
    env.MTGTABLE_LAB_ROOT ? resolve(env.MTGTABLE_LAB_ROOT, '..') : null,
    resolve(repoRoot, '..', 'lab'),
    join(homedir(), 'code', 'lab'),
  ].filter(Boolean);
  for (const lab of labs) {
    const d = join(lab, 'runner', 'var', 'runner');
    if (existsSync(d)) return join(d, 'status.json');
  }
  return resolve(repoRoot, 'var', 'runner', 'status.json');
}

/**
 * The lab's gate: { open, why, freeCores } from the runner's status.json.
 * `freeCores` null = no limit from the lab (no runner, or it is idle).
 */
export function labGate(file, { now = Date.now(), staleMs = STALE_MS } = {}) {
  let text;
  let mtimeMs;
  try { text = readFileSync(file, 'utf8'); mtimeMs = statSync(file).mtimeMs; } catch {
    return { open: true, why: 'no lab runner (no status.json)', freeCores: null };
  }
  const doc = parse(text);
  if (!doc || typeof doc !== 'object' || doc.schema !== 1) {
    // A torn or foreign file: judge by its age alone (a runner that writes every 10 s will fix it).
    return now - mtimeMs > staleMs ? { open: true, why: 'lab runner not running (stale status.json)', freeCores: null }
      : { open: false, why: 'lab runner status unreadable', freeCores: null };
  }
  const beat = Date.parse(doc.heartbeat ?? '') || Date.parse(doc.updated ?? '') || mtimeMs;
  if (now - beat > staleMs) return { open: true, why: `lab runner not running (heartbeat ${Math.round((now - beat) / 1000)} s old)`, freeCores: null };
  const running = Array.isArray(doc.running) ? doc.running : [];
  if (doc.state === 'idle' || running.length === 0) return { open: true, why: 'lab idle', freeCores: null };
  const used = doc.host?.coresUsed;
  const total = doc.host?.coresTotal;
  if (typeof used === 'number' && typeof total === 'number' && total > 0) {
    const free = Math.floor(total - used);
    return free >= 1 ? { open: true, why: `lab below its core budget (${used} of ${total} cores)`, freeCores: free }
      : { open: false, why: `lab busy (${used} of ${total} cores)`, freeCores: 0 };
  }
  return { open: false, why: 'lab busy (no core count)', freeCores: 0 };
}

// ---------------------------------------------------------------------------
// Low priority.
// ---------------------------------------------------------------------------

/**
 * The spawn prefix for a low-priority review: `nice -n 19` and `ionice -c 3 -t`,
 * each only when it runs here.  `probe(cmd, args)` -> true when `cmd args true`
 * exits 0.  Without `nice` the runner sets the niceness itself (os.setPriority).
 */
export function lowPriorityPrefix(probe = defaultProbe) {
  const p = [];
  if (probe('nice', ['-n', '19'])) p.push('nice', '-n', '19');
  if (probe('ionice', ['-c', '3', '-t'])) p.push('ionice', '-c', '3', '-t');
  return p;
}
function defaultProbe(cmd, args) {
  try { return spawnSync(cmd, [...args, 'true'], { stdio: 'ignore', timeout: 5000 }).status === 0; } catch { return false; }
}

// ---------------------------------------------------------------------------
// The queue file: crash-safe.
// ---------------------------------------------------------------------------

const ITEM_STATES = ['pending', 'running', 'done', 'failed', 'skipped'];
const validState = (s) => s && typeof s === 'object' && s.v === QUEUE_VERSION && typeof s.since === 'string' && Array.isArray(s.items)
  && s.items.every((i) => i && typeof i.key === 'string' && typeof i.gameId === 'string' && typeof i.log === 'string' && ITEM_STATES.includes(i.state));

/** Writes `state` to `file`: a temporary file, fsynced, the old file kept as .bak, then renamed into place. */
export function saveQueue(file, state) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  const fd = openSync(tmp, 'w');
  try {
    writeSync(fd, `${JSON.stringify(state, null, 1)}\n`);
    fsyncSync(fd);
  } finally { closeSync(fd); }
  if (existsSync(file)) { try { renameSync(file, `${file}.bak`); } catch { /* keep going: the rename below is the commit */ } }
  renameSync(tmp, file);
}

/**
 * Reads the queue: { state, from: "file"|"bak"|"fresh", aside? }.  A file that
 * is not a queue is moved aside (queue.json.bad-<ms>) and never trusted.  A
 * `running` item is `pending` again (or `failed` past MAX_ATTEMPTS).
 */
export function loadQueue(file, now = Date.now()) {
  let aside = null;
  for (const [f, from] of [[file, 'file'], [`${file}.bak`, 'bak']]) {
    if (!existsSync(f)) continue;
    let s = null;
    try { s = JSON.parse(readFileSync(f, 'utf8')); } catch { s = null; }
    if (validState(s)) {
      for (const i of s.items) {
        if (i.state === 'running') {
          if ((i.attempts ?? 0) >= MAX_ATTEMPTS) { i.state = 'failed'; i.why = `stopped ${i.attempts} times before it finished`; i.endedAt = new Date(now).toISOString(); } else { i.state = 'pending'; delete i.reviewId; }
        }
      }
      return { state: s, from, aside };
    }
    if (from === 'file') {
      aside = `${file}.bad-${now}`;
      try { renameSync(f, aside); } catch { aside = null; }
    }
  }
  return { state: { v: QUEUE_VERSION, since: new Date(now).toISOString(), items: [] }, from: 'fresh', aside };
}

// ---------------------------------------------------------------------------
// The worker.
// ---------------------------------------------------------------------------

export function createAutoReview(opts) {
  const {
    repoRoot, review, enabled = true, gamesDir = 'var/games', queueFile = DEFAULT_QUEUE_FILE, workDir = 'var/coach-grade/review',
    statusFile = runnerStatusFile(repoRoot), staleMs = STALE_MS, pollMs = DEFAULT_POLL_MS,
    prefix = null, now = () => Date.now(), log = () => {},
  } = opts;
  const qAbs = resolve(repoRoot, queueFile);
  let state = null;
  let timer = null;
  let stopped = false;
  let gate = { open: false, why: 'not started', freeCores: null, word: 'review-busy' };
  let pfx = prefix;
  const seen = new Map();   // dir name -> "<size>:<mtimeMs>" of a log judged and not taken

  const save = () => saveQueue(qAbs, state);
  const iso = () => new Date(now()).toISOString();
  const byKey = () => new Map(state.items.map((i) => [i.key, i]));

  /** A review of this log that already exists (the runner's list, or a report on disk newer than the log), or null. */
  function existing(item) {
    const mine = item.reviewId ?? null;
    for (const r of review.reviewsOfLog?.(item.log) ?? []) {
      if (r.id === mine) continue;
      if (Date.parse(r.createdAt) >= item.logMtime) return r.id;
    }
    const abs = resolve(repoRoot, workDir);
    if (!existsSync(abs)) return null;
    for (const id of readdirSync(abs).filter((n) => REVIEW_ID.test(n) && n !== mine)) {
      const f = join(abs, id, 'report.json');
      try {
        if (statSync(f).mtimeMs < item.logMtime) continue;
        const rep = JSON.parse(readFileSync(f, 'utf8'));
        if (rep && rep.kind === 'game-review' && rep.log === item.log) return id;
      } catch { /* not a report */ }
    }
    return null;
  }

  function scan() {
    const root = resolve(repoRoot, gamesDir);
    let names;
    try { names = readdirSync(root); } catch { return false; }
    const since = Date.parse(state.since);
    const keys = byKey();
    let changed = false;
    for (const name of names) {
      if (!HUMAN_GAME_ID.test(name)) continue;
      const g = gameLog(repoRoot, gamesDir, name);
      if (g.error) continue;
      let st;
      try { st = statSync(g.abs); } catch { continue; }
      if (st.mtimeMs < since) continue;
      const sig = `${st.size}:${st.mtimeMs}`;
      if (seen.get(name) === sig) continue;
      seen.set(name, sig);
      if (!mayBeOver(g.abs, st.size)) continue;
      const j = judgeHumanGame(readLogText(g.abs));
      if (!j.ok || keys.has(j.key)) continue;
      const item = { key: j.key, gameId: name, log: g.rel, seat: j.seat, logMtime: st.mtimeMs, state: 'pending', attempts: 0, queuedAt: iso() };
      const dup = existing(item);
      if (dup) { item.state = 'skipped'; item.why = `already reviewed (${dup})`; item.reviewId = dup; item.endedAt = iso(); }
      state.items.push(item);
      keys.set(item.key, item);
      log(`AUTO-REVIEW ${name} ${item.state === 'pending' ? 'queued' : `skipped: ${item.why}`}`);
      changed = true;
    }
    return changed;
  }

  function trim() {
    const fin = state.items.filter((i) => i.state !== 'pending' && i.state !== 'running');
    if (fin.length <= KEEP_ITEMS) return;
    const drop = new Set(fin.slice(0, fin.length - KEEP_ITEMS));
    state.items = state.items.filter((i) => !drop.has(i));
  }

  function onEnd(item) {
    return ({ id, state: s, error, preempted, cancelled }) => {
      if (item.reviewId !== id) return;
      if (preempted || cancelled) { item.state = 'pending'; delete item.reviewId; item.why = preempted ? 'preempted by a requested review' : 'the helper stopped'; } else {
        item.state = s === 'done' ? 'done' : 'failed';
        item.endedAt = iso();
        if (error) item.why = error; else delete item.why;
      }
      log(`AUTO-REVIEW ${item.gameId} -> ${item.state}${item.why ? `: ${item.why}` : ''}`);
      save();
      if (item.state === 'pending') setImmediate(() => tick());   // try again as soon as the gate allows
    };
  }

  function startNext() {
    if (state.items.some((i) => i.state === 'running')) { gate = { ...gate, word: 'review-busy' }; return false; }
    const pending = state.items.filter((i) => i.state === 'pending').sort((a, b) => b.logMtime - a.logMtime);
    if (!pending.length) { gate = { open: true, why: 'nothing to review', freeCores: null, word: 'open' }; return false; }
    if (!review.available()) { gate = { open: false, why: 'the bridge is not built', freeCores: null, word: 'review-off' }; return false; }
    if (review.busy()) { gate = { open: false, why: 'a review is running or queued', freeCores: null, word: 'review-busy' }; return false; }
    const lab = labGate(statusFile, { now: now(), staleMs });
    gate = { ...lab, word: lab.open ? 'open' : 'lab-busy' };
    if (!lab.open) return false;
    const item = pending[0];
    const dup = existing(item);
    if (dup) {
      Object.assign(item, { state: 'skipped', why: `already reviewed (${dup})`, reviewId: dup, endedAt: iso() });
      log(`AUTO-REVIEW ${item.gameId} skipped: ${item.why}`);
      return true;
    }
    if (pfx === null) pfx = lowPriorityPrefix();
    const r = review.post({ gameId: item.gameId }, { auto: true, prefix: pfx, jobs: lab.freeCores ?? undefined, onEnd: onEnd(item) });
    item.attempts = (item.attempts ?? 0) + 1;
    if (r.status === 202) {
      Object.assign(item, { state: 'running', reviewId: r.body.id, startedAt: iso() });
      log(`AUTO-REVIEW ${item.gameId} -> ${r.body.id} (${lab.why})`);
    } else if (r.status === 429 || r.status === 503) {
      item.attempts -= 1;   // not started: it waits
      return false;
    } else {
      Object.assign(item, { state: 'failed', why: r.body?.message ?? `status ${r.status}`, endedAt: iso() });
      log(`AUTO-REVIEW ${item.gameId} failed: ${item.why}`);
    }
    return true;
  }

  function tick() {
    if (!state || stopped) return;
    let changed = scan();
    if (startNext()) changed = true;
    if (changed) { trim(); save(); }
  }

  return {
    enabled,
    start() {
      if (!enabled || state) return this;
      const l = loadQueue(qAbs, now());
      state = l.state;
      if (l.aside) log(`AUTO-REVIEW the queue file was not a queue; moved aside to ${l.aside}`);
      if (l.from === 'bak') log('AUTO-REVIEW the queue file was missing or torn; resumed from its .bak');
      const pend = state.items.filter((i) => i.state === 'pending').length;
      log(`AUTO-REVIEW on: watching ${gamesDir}/ every ${Math.round(pollMs / 1000)} s since ${state.since}; ${pend} pending; lab status ${statusFile}`);
      save();
      tick();
      timer = setInterval(() => { try { tick(); } catch (e) { log(`AUTO-REVIEW tick failed: ${e.message}`); } }, pollMs);
      timer.unref?.();
      return this;
    },
    stop() { stopped = true; if (timer) clearInterval(timer); timer = null; },
    tick,
    health() {
      if (!enabled || !review.available()) return { autoReview: 0 };
      const items = state?.items ?? [];
      return { autoReview: 1, autoReviewQueue: { pending: items.filter((i) => i.state === 'pending').length, running: items.some((i) => i.state === 'running') ? 1 : 0, gate: gate.word } };
    },
    /** For the self-test. */
    items() { return state ? state.items.map((i) => ({ ...i })) : []; },
    gate() { return { ...gate }; },
  };
}
