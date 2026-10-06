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
//   - its session header's `transport` is `ws` or `console` (`auto` is a
//     scripted seat, and an AI-vs-AI recording has none: those two are told
//     apart by the header; a scripted client driving the ws seat under the
//     default human-ws-<seed> id is NOT -- its log looks like a person's),
//   - `hello_ok.you` is the header's seat, that player is not an AI and every
//     other player is,
//   - it holds an `over` whose body names a winner or a reason (an engine crash's
//     null `over`, M46, and a game in progress are not finished).
// The log is `frames.jsonl`, or `frames.jsonl.gz` when that is all there is (the
// Java reader takes both, #73).  Only logs written after the queue file was
// first made are taken (`since`): turning this on does not review your history.
// (D407) A game between two people is reviewed too, seat by seat, when that seat's player agreed:
// `friend-m<13 digits>-seat<N>` (the bridge's per-seat log of a table, D402), whose header says
// `humans: 2` and `record: true` (the room's consent for that seat and game, M60) and whose players
// are both people.  A seat that did not agree is judged and skipped, and never reviewed.  Its report is that
// player's alone: the coach helper's own door does not serve it, the room does, to that seat (D407).
// Every log judged is remembered in the queue file (`seen`: its path, size and
// mtime, and the verdict), so a restart reads only the logs that changed; and a
// scan reads at most `scanBatch` (4) whole logs before it yields the event loop
// (the rest on the next turn of it, newest first).
//
// THE QUEUE FILE, var/coach-grade/auto-review/queue.json (`v`: 1):
//   { v, since, seen: { <dir name>: { sig, verdict } }, items: [ { key, gameId,
//     log, seat, logMtime, state: "pending"|"running"|"done"|"failed"|"skipped",
//     reviewId?, attempts, queuedAt, startedAt?, endedAt?, why? } ] }
// written whole to a temporary file, fsynced and renamed over the old one (the
// directory fsynced after, where that works), the old one kept as
// queue.json.bak; read from queue.json, else the .bak, else a fresh queue (a
// torn or foreign file is moved aside, never trusted).  A var/ it cannot write
// turns the automatic review off for the session (logged once), never the
// helper.  A game's key is its header's gameId|seed|startedAt
// (human_collect.py's), so a game id played twice (`--seed 42` again) is two
// games; and since the replay rewrites the same frames.jsonl, the log is judged
// again just before its review starts and must still carry the item's key, else
// the item is `skipped` ("log replaced").  `attempts` counts the starts that
// ended in a crash: a review stopped by a request (preempted) or by the helper
// shutting down goes back to `pending` without spending one, and a `running`
// item found at load -- the helper died under it -- is `pending` again (a
// review is not resumable: it runs again from the start) unless that has
// happened MAX_ATTEMPTS times.  A game is never reviewed twice: a key already
// in the file is never queued again, and before a review is queued AND again
// before it starts, a review of the same log that already exists -- queued,
// running or done in the runner's list (asked for over HTTP, or automatic; a
// FAILED one does not count) or on disk (var/coach-grade/review/r*/report.json
// naming this log, newer than it, not all errors) -- makes the item `skipped`,
// and the next one is tried at once.
//
// WHEN IT RUNS.  One review at a time, and only when all of these hold:
//   - the review runner is idle (nothing running, nothing waiting: an automatic
//     review never takes a queue slot a person's request needs, and a request
//     preempts a running automatic review, which goes back to `pending`);
//   - the lab runner (tools/runner/, D337) is idle or below its core budget,
//     read from its status.json (statusjson.ts, schema 1): no file, or a
//     `heartbeat` (else `updated`, else the file's mtime) older than `staleMs`
//     (2 min; the runner writes it every 10 s tick) -- no runner -- is idle;
//     `state` "idle" or an empty `running` is idle; a `running` job with
//     `cores: null` (one the runner shows but does not run: its width is
//     unknown and not in coresUsed) is busy; else `host.coresTotal -
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
// "open", "review-busy" or "lab-busy", nothing else.  "autoReview" is 0 wherever
// "review" is, and when the queue file cannot be written.
//
// Its self-test is tools/auto-review-selftest.mjs (a fake coach-grade.sh, a
// fake runner status; gate 12f, CI).

import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, renameSync, statSync, writeSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { gameLog, isUsableReport, readLogText, REVIEW_ID } from './review-runner.mjs';

export const QUEUE_VERSION = 1;
export const HUMAN_GAME_ID = /^(human-(ws|console)-\d+|match-m\d{13})(-g\d+)?$|^friend-m\d{13}-seat[01]$/;
/** D407: a seat's log of a game between two people (a table, D402). */
export const FRIEND_GAME_ID = /^friend-m\d{13}-seat[01]$/;
export const HUMAN_TRANSPORTS = ['ws', 'console'];
export const DEFAULT_QUEUE_FILE = 'var/coach-grade/auto-review/queue.json';
export const DEFAULT_POLL_MS = 15_000;
export const STALE_MS = 120_000;
export const MAX_ATTEMPTS = 3;
export const KEEP_ITEMS = 500;
export const SCAN_BATCH = 4;
export const GATE_WORDS = ['open', 'review-busy', 'lab-busy'];
/** The runner's reviews that count as "already reviewed": not a failed one. */
const COUNTS = ['queued', 'running', 'done'];
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
  // D407: a seat at a table of two is reviewed only with its player's consent for that game.
  const table = h.humans === 2;
  if (table && h.record !== true) return { ok: false, why: 'a game between two people whose player did not agree to recording (D407)' };
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
  if (table) {
    if (!others.length || others.some((p) => p.isAi !== false) || hello.match?.opponent !== 'human') return { ok: false, why: 'a table of two whose other player is not a person' };
  } else if (!others.length || !others.every((p) => p.isAi)) return { ok: false, why: 'the other player is not an AI' };
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
  // A job the runner shows but does not run (runner.ts: "not run by the runner") has `cores: null`
  // and adds nothing to coresUsed: its width is unknown, so the lab is taken as busy.
  if (running.some((r) => r && r.cores === null)) return { open: false, why: 'lab busy (a job the runner does not run: its cores are unknown)', freeCores: 0 };
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
const isMap = (o) => !!o && typeof o === 'object' && !Array.isArray(o);

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
  // The renames are durable once the directory is: fsync it where a directory can be opened (not Windows).
  let dfd;
  try { dfd = openSync(dirname(file), 'r'); fsyncSync(dfd); } catch { /* not supported here */ } finally { if (dfd !== undefined) closeSync(dfd); }
}

/**
 * Reads the queue: { state, from: "file"|"bak"|"fresh", aside? }.  A file that
 * is not a queue is moved aside (queue.json.bad-<ms>) and never trusted.  A
 * `running` item -- the helper died under it, a crash -- spends an attempt: it
 * is `pending` again, or `failed` once that has happened MAX_ATTEMPTS times.
 */
export function loadQueue(file, now = Date.now()) {
  let aside = null;
  for (const [f, from] of [[file, 'file'], [`${file}.bak`, 'bak']]) {
    if (!existsSync(f)) continue;
    let s = null;
    try { s = JSON.parse(readFileSync(f, 'utf8')); } catch { s = null; }
    if (validState(s)) {
      if (!isMap(s.seen)) s.seen = {};
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
  return { state: { v: QUEUE_VERSION, since: new Date(now).toISOString(), seen: {}, items: [] }, from: 'fresh', aside };
}

// ---------------------------------------------------------------------------
// The worker.
// ---------------------------------------------------------------------------

export function createAutoReview(opts) {
  const {
    repoRoot, review, enabled = true, gamesDir = 'var/games', queueFile = DEFAULT_QUEUE_FILE, workDir = 'var/coach-grade/review',
    statusFile = runnerStatusFile(repoRoot), staleMs = STALE_MS, pollMs = DEFAULT_POLL_MS, scanBatch = SCAN_BATCH,
    prefix = null, now = () => Date.now(), log = () => {}, onRead = () => {},
  } = opts;
  const qAbs = resolve(repoRoot, queueFile);
  let state = null;
  let timer = null;
  let again = null;         // the next slice of a scan, queued with setImmediate
  let stopped = false;
  let broken = null;        // why the queue file cannot be written: the automatic review is off
  let gate = { open: false, why: 'not started', freeCores: null, word: 'review-busy' };
  let pfx = prefix;

  /** Writes the queue; a var/ it cannot write turns the automatic review off (logged once), never the helper. */
  const save = () => {
    if (broken) return false;
    try { saveQueue(qAbs, state); return true; } catch (e) {
      broken = e.message;
      stopped = true;
      if (timer) clearInterval(timer);
      timer = null;
      log(`AUTO-REVIEW off: cannot write ${queueFile} (${e.message}); automatic reviews stay off until the helper restarts`);
      return false;
    }
  };
  const iso = () => new Date(now()).toISOString();
  const byKey = () => new Map(state.items.map((i) => [i.key, i]));
  const safeTick = () => { try { tick(); } catch (e) { log(`AUTO-REVIEW tick failed: ${e.message}`); } };

  /** A review of this log that already exists (queued, running or done in the runner's list, or a usable report on disk newer than the log), or null. */
  function existing(item) {
    const mine = item.reviewId ?? null;
    for (const r of review.reviewsOfLog?.(item.log) ?? []) {
      if (r.id === mine || !COUNTS.includes(r.state)) continue;   // a failed review is not a review
      if (Date.parse(r.createdAt) >= item.logMtime) return r.id;
    }
    const abs = resolve(repoRoot, workDir);
    if (!existsSync(abs)) return null;
    for (const id of readdirSync(abs).filter((n) => REVIEW_ID.test(n) && n !== mine)) {
      const f = join(abs, id, 'report.json');
      try {
        if (statSync(f).mtimeMs < item.logMtime) continue;
        const rep = JSON.parse(readFileSync(f, 'utf8'));
        if (isUsableReport(rep) && rep.log === item.log) return id;
      } catch { /* not a report */ }
    }
    return null;
  }

  /** Why this item's log is no longer its game (`--seed 42` again rewrote it), or null: judged again, it must carry the item's key. */
  function replaced(item) {
    const g = gameLog(repoRoot, gamesDir, item.gameId);
    if (g.error) return 'log replaced (it is gone)';
    onRead('verify', item.gameId);
    const j = judgeHumanGame(readLogText(g.abs));
    return j.ok && j.key === item.key ? null : `log replaced (${j.ok ? 'another game' : j.why})`;
  }

  /** One slice of a scan: { changed, more } -- `more` when it stopped after `scanBatch` whole logs. */
  function scan() {
    const root = resolve(repoRoot, gamesDir);
    let names;
    try { names = readdirSync(root); } catch { return { changed: false, more: false }; }
    const since = Date.parse(state.since);
    const keys = byKey();
    const seen = state.seen;
    let changed = false;
    const here = new Set();
    const todo = [];
    for (const name of names) {
      if (!HUMAN_GAME_ID.test(name)) continue;
      here.add(name);
      const g = gameLog(repoRoot, gamesDir, name);
      if (g.error) continue;
      let st;
      try { st = statSync(g.abs); } catch { continue; }
      if (st.mtimeMs < since) continue;
      const sig = `${g.rel}:${st.size}:${st.mtimeMs}`;
      if (seen[name]?.sig === sig) continue;   // judged before, unchanged: not read again (across restarts too)
      todo.push({ name, g, st, sig });
    }
    for (const name of Object.keys(seen)) if (!here.has(name)) { delete seen[name]; changed = true; }
    todo.sort((a, b) => b.st.mtimeMs - a.st.mtimeMs);
    let reads = 0;
    for (const { name, g, st, sig } of todo) {
      if (reads >= scanBatch) return { changed, more: true };
      onRead('tail', name);
      changed = true;
      if (!mayBeOver(g.abs, st.size)) { seen[name] = { sig, verdict: 'not finished' }; continue; }
      reads++;
      onRead('full', name);
      const j = judgeHumanGame(readLogText(g.abs));
      seen[name] = { sig, verdict: !j.ok ? j.why : keys.has(j.key) ? 'known' : 'queued' };
      if (!j.ok || keys.has(j.key)) continue;
      const item = { key: j.key, gameId: name, log: g.rel, seat: j.seat, logMtime: st.mtimeMs, state: 'pending', attempts: 0, queuedAt: iso() };
      const dup = existing(item);
      if (dup) { item.state = 'skipped'; item.why = `already reviewed (${dup})`; item.reviewId = dup; item.endedAt = iso(); }
      state.items.push(item);
      keys.set(item.key, item);
      log(`AUTO-REVIEW ${name} ${item.state === 'pending' ? 'queued' : `skipped: ${item.why}`}`);
    }
    return { changed, more: false };
  }

  function trim() {
    const fin = state.items.filter((i) => i.state !== 'pending' && i.state !== 'running');
    if (fin.length <= KEEP_ITEMS) return;
    const drop = new Set(fin.slice(0, fin.length - KEEP_ITEMS));
    state.items = state.items.filter((i) => !drop.has(i));
  }

  /** A start that ended without a crash (preempted, or the helper stopping): pending again, the attempt given back. */
  function backToPending(item, why) {
    item.state = 'pending';
    item.attempts = Math.max(0, (item.attempts ?? 1) - 1);
    delete item.reviewId;
    item.why = why;
  }

  function onEnd(item) {
    return ({ id, state: s, error, preempted, cancelled }) => {
      if (item.reviewId !== id) return;
      if (preempted || cancelled) backToPending(item, preempted ? 'preempted by a requested review' : 'the helper stopped'); else {
        item.state = s === 'done' ? 'done' : 'failed';
        item.endedAt = iso();
        if (error) item.why = error; else delete item.why;
      }
      log(`AUTO-REVIEW ${item.gameId} -> ${item.state}${item.why ? `: ${item.why}` : ''}`);
      save();
      setImmediate(safeTick);   // the next one (or this one again) as soon as the gate allows
    };
  }

  /** Starts the newest pending review the gates allow; true when the queue changed. */
  function startNext() {
    if (state.items.some((i) => i.state === 'running')) { gate = { ...gate, word: 'review-busy' }; return false; }
    const pending = state.items.filter((i) => i.state === 'pending').sort((a, b) => b.logMtime - a.logMtime);
    if (!pending.length) { gate = { open: true, why: 'nothing to review', freeCores: null, word: 'open' }; return false; }
    if (!review.available()) { gate = { open: false, why: 'the bridge is not built', freeCores: null, word: 'review-busy' }; return false; }
    if (review.busy()) { gate = { open: false, why: 'a review is running or queued', freeCores: null, word: 'review-busy' }; return false; }
    const lab = labGate(statusFile, { now: now(), staleMs });
    gate = { ...lab, word: lab.open ? 'open' : 'lab-busy' };
    if (!lab.open) return false;
    let changed = false;
    for (const item of pending) {
      const dup = existing(item);
      const why = dup ? `already reviewed (${dup})` : replaced(item);
      if (why) {
        Object.assign(item, { state: 'skipped', why, endedAt: iso() });
        if (dup) item.reviewId = dup;
        log(`AUTO-REVIEW ${item.gameId} skipped: ${why}`);
        changed = true;
        continue;   // the next one at once, not a poll later
      }
      if (pfx === null) pfx = lowPriorityPrefix();
      const r = review.post({ gameId: item.gameId }, { auto: true, prefix: pfx, jobs: lab.freeCores ?? undefined, onEnd: onEnd(item) });
      if (r.status === 202) {
        item.attempts = (item.attempts ?? 0) + 1;   // given back if it ends without a crash (backToPending)
        Object.assign(item, { state: 'running', reviewId: r.body.id, startedAt: iso() });
        log(`AUTO-REVIEW ${item.gameId} -> ${r.body.id} (${lab.why})`);
      } else if (r.status === 429 || r.status === 503) {
        return changed;   // not started: it waits
      } else {
        Object.assign(item, { state: 'failed', why: r.body?.message ?? `status ${r.status}`, endedAt: iso() });
        log(`AUTO-REVIEW ${item.gameId} failed: ${item.why}`);
      }
      return true;
    }
    gate = { open: true, why: 'nothing to review', freeCores: null, word: 'open' };
    return changed;
  }

  function tick() {
    if (!state || stopped) return;
    const s = scan();
    let changed = s.changed;
    if (startNext()) changed = true;
    if (changed) { trim(); save(); }
    if (s.more && !again && !stopped) again = setImmediate(() => { again = null; safeTick(); });   // the rest of the scan, after the event loop has turned
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
      if (!save()) return this;
      log(`AUTO-REVIEW on: watching ${gamesDir}/ every ${Math.round(pollMs / 1000)} s since ${state.since}; ${pend} pending; lab status ${statusFile}`);
      safeTick();
      if (stopped) return this;
      timer = setInterval(safeTick, pollMs);
      timer.unref?.();
      return this;
    },
    /**
     * Stops polling.  A review still running goes back to `pending` at once, on disk, without spending an
     * attempt: the helper is shutting down (process.exit follows), which is not a crash.
     */
    stop() {
      stopped = true;
      if (timer) clearInterval(timer);
      timer = null;
      if (again) clearImmediate(again);
      again = null;
      const run = state ? state.items.filter((i) => i.state === 'running') : [];
      for (const i of run) backToPending(i, 'the helper stopped');
      if (run.length) save();
    },
    tick,
    health() {
      if (!enabled || broken || !review.available()) return { autoReview: 0 };
      const items = state?.items ?? [];
      return { autoReview: 1, autoReviewQueue: { pending: items.filter((i) => i.state === 'pending').length, running: items.some((i) => i.state === 'running') ? 1 : 0, gate: GATE_WORDS.includes(gate.word) ? gate.word : 'review-busy' } };
    },
    /**
     * D407: where a seat log's automatic review is -- the newest item for that game id:
     * {state: "pending"|"running"|"done"|"failed"|"skipped", reviewId?, why?}, or null (not queued yet).
     */
    find(gameId) {
      const it = state ? [...state.items].reverse().find((i) => i.gameId === gameId) : null;
      return it ? { state: it.state, ...(it.reviewId ? { reviewId: it.reviewId } : {}), ...(it.why ? { why: it.why } : {}) } : null;
    },
    /** For the self-test. */
    items() { return state ? state.items.map((i) => ({ ...i })) : []; },
    gate() { return { ...gate }; },
    seen() { return state ? { ...state.seen } : {}; },
  };
}
