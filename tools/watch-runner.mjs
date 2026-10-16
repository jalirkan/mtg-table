// mtg-table — tools/watch-runner.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// WATCH TWO BOTS (D440): the coach helper's /watch routes.  ForgeCoach's lobby
// asks for a watch -- two AIs grid-draft a cube, then play a best of three --
// and follows it: the draft from draft.json, the games from their frame logs as
// the recorder writes them.  The work is `tools/cubelab.sh watch` (the cube
// lab's tools/cubelab/watch.ts); this file starts it, one at a time, and serves
// what it writes.  docs/watch-bots.md is the copyable contract.
//
//   POST /watch            {"cube": "fair-fight-cube-180", "seed"?: 1..799999999, "games"?: 1|3|5|7,
//                           "playerA"?: "<Profile>"|"search", "playerB"?: ..., "pace"?: 0..5000}
//                          -> 202 {"ok": true, "id": "watch-<cube>-<seed>", "state": "/watch/<id>",
//                                  "game": "/watch/<id>/game/<n>"}
//                          409 {"code": "busy", "running": "<id>"} while another watch runs;
//                          400 a bad body (unknown fields too); 503 the bridge is not built
//   GET  /watch            -> 200 {"ok": true, "running": "<id>"|null, "watches": [newest first, at most 20]}
//   GET  /watch/<id>       -> 200 {"ok": true, "id", "running": bool, "match": <match.json>|null,
//                                  "draft": <draft.json>|null}   (null until written); 404
//   GET  /watch/<id>/game/<n>   the game's frame log, COMPLETE LINES ONLY, as the
//                          spectate dev route serves var/spectate/ (D122):
//                            ?from=<byte>      200, the lines written since that byte, X-Log-Next /
//                                              X-Log-Size; 416 when <byte> is past the end (re-recorded)
//                            Range: bytes=<b>- 206 the same, Content-Range set (ForgeCoach's live.ts
//                                              polls this way); 416 when <b> is at or past the end
//                            neither           200 from byte 0
//                          at most 4 MiB an answer; 404 while the game has not started;
//                          500 {"code": "redaction-failed"} once the log failed the redaction check
//   POST /watch/<id>/stop  -> 200 {"ok": true, "id", "stopping": true}; 409 {"code": "not-running"}
//                          SIGTERM to the watch's process group, then SIGKILL to whatever of it is
//                          left after the grace (5 s) -- also when the leader exits first and its JVM
//                          does not; the helper's shutdown (close()) does the same before it exits.
//
// Every route sits behind the coach helper's door exactly as /review does
// (D386: loopback, or --lan and the pairing token; the Host check; Origin on
// wsAllowedOrigins; a tunnel's headers 403) -- this file sees only requests the
// door admitted.  A GET reads and never starts, stops or writes anything.
//
// HIDDEN INFORMATION.  Each game is recorded from seat 0's eyes (drafter A), the
// other hand the five-key stub, and NOTHING IS SERVED BEFORE IT PASSED
// tools/check-redaction.mjs: before a game route sends bytes past what was
// already checked, it checks the log's whole complete-lines prefix up to them
// with `--partial` (every leak rule and the exact shapes, not the three
// coverage checks a game's first lines cannot meet; an unfinished game is a
// warning, not a failure; about 0.1 s for 2 MB) and sends only the lines that
// passed.  A prefix with no state frame yet (the session line and hello_ok,
// for the ~10 s before Forge's first state) is 0 bytes passed, not a failure,
// and a last state the next line could still justify waits for that line.  A live follower lags by one check; a prefix that fails is
// never sent, every later request of that game is a 500, and the watch is
// stopped with `error` naming the game.  The watch still checks each finished
// recording whole (match.json's `redaction`).  draft.json shows both pools and
// both decks: a grid draft is face up, both drafters saw every grid (B's
// main / side split is the one thing in it A never saw: docs/watch-bots.md).
//
// The run lives in var/spectate/watch-<cube>-<seed>/ (draft.json, match.json,
// <id>-g<n>.jsonl, the decks, the lab's folder, watch.log); a second watch of
// the same cube and seed replaces it, and a follower of the old log gets 416.
// Starting a watch also removes all but the `keep` (10; the helper's
// --watch-keep) most recent watch folders, the new one included: by match.json's
// updatedAt, else the folder's mtime; a running watch is never removed.

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { closeSync, existsSync, fstatSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, realpathSync, rmSync, statSync, writeFileSync, renameSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

export const MAX_WATCH_BODY = 4096;
export const MAX_CHUNK_BYTES = 4 * 1024 * 1024;
export const WATCH_ID = /^watch-[A-Za-z0-9][A-Za-z0-9._-]*-[0-9]{1,9}$/;
const CUBE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const FIELDS = new Set(['cube', 'seed', 'games', 'playerA', 'playerB', 'pace']);
const TERMINAL = new Set(['done', 'error', 'stopped']);
/** seeds.ts: the lab's seed range ends below VERIFY_SEED_MIN. */
export const MAX_SEED = 799_999_999;

/** The body of POST /watch, checked.  -> {req} or {status, message}. */
export function validateWatch(q, { cubes, profiles }) {
  const no = (message) => ({ status: 400, message });
  if (!q || typeof q !== 'object' || Array.isArray(q)) return no('the body is a JSON object: {"cube": "<cube id>", ...}');
  for (const k of Object.keys(q)) if (!FIELDS.has(k)) return no(`unknown field "${k}" (cube, seed, games, playerA, playerB, pace)`);
  if (typeof q.cube !== 'string') return no('"cube" is a cube id such as "fair-fight-cube-180"');
  const cube = q.cube.replace(/\.md$/, '');
  if (!CUBE.test(cube) || !cubes.includes(cube)) return no(`"cube" is one of ${cubes.join(', ')}`);
  let seed = q.seed;
  if (seed === undefined || seed === null) seed = 1 + Math.floor(Math.random() * 99_999);
  else if (!Number.isInteger(seed) || seed < 1 || seed > MAX_SEED) return no(`"seed" is a whole number 1..${MAX_SEED}`);
  const games = q.games ?? 3;
  if (![1, 3, 5, 7].includes(games)) return no('"games" is 1, 3, 5 or 7 (a best of)');
  const pace = q.pace ?? 600;
  if (!Number.isInteger(pace) || pace < 0 || pace > 5000) return no('"pace" is milliseconds a frame, 0..5000');
  const player = (v, k) => {
    if (v === undefined || v === null) return 'Default';
    if (typeof v !== 'string') return null;
    if (/^search(-v2)?$/i.test(v)) return 'search';
    return profiles.find((p) => p.toLowerCase() === v.toLowerCase()) ?? null;
  };
  const playerA = player(q.playerA);
  const playerB = player(q.playerB);
  if (!playerA || !playerB) return no(`"playerA" and "playerB" are "search" or one of ${profiles.join(', ')}`);
  return { req: { cube, seed, games, pace, playerA, playerB, id: `watch-${cube}-${seed}` } };
}

/** The complete lines of `file` from byte `from` (spectate/devRoute.ts's readCompleteLines, in plain Node). */
export function readCompleteLines(file, from, maxBytes = MAX_CHUNK_BYTES) {
  if (!existsSync(file) || !statSync(file).isFile()) return { status: 404, body: Buffer.alloc(0), next: from, size: 0 };
  const fd = openSync(file, 'r');
  try {
    const size = fstatSync(fd).size;
    if (from > size) return { status: 416, body: Buffer.alloc(0), next: from, size };
    const want = Math.min(size - from, maxBytes);
    const buf = Buffer.alloc(want);
    let got = 0;
    while (got < want) {
      const n = readSync(fd, buf, got, want - got, from + got);
      if (n <= 0) break;
      got += n;
    }
    const cut = buf.subarray(0, got).lastIndexOf(0x0a);
    const body = cut < 0 ? Buffer.alloc(0) : buf.subarray(0, cut + 1);
    return { status: 200, body, next: from + body.length, size };
  } finally {
    closeSync(fd);
  }
}

const readJson = (file) => {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
};

const CHECKER = fileURLToPath(new URL('./check-redaction.mjs', import.meta.url));

/**
 * Is there anything in this complete-lines prefix to decide: a `state` frame, or the `over` that ends
 * a game which never had one (M11)?  A line's own `"type"`, parsed, never a substring.
 */
export function hasStateFrame(prefix) {
  let from = 0;
  while (from < prefix.length) {
    let end = prefix.indexOf(0x0a, from);
    if (end < 0) end = prefix.length;
    const line = prefix.subarray(from, end);
    // a cheap filter before the parse: a state line carries the bytes "state"
    if (line.includes('"state"') || line.includes('"over"')) {
      try { const t = JSON.parse(line.toString('utf8'))?.type; if (t === 'state' || t === 'over') return true; } catch { /* not JSON: the checker's business */ }
    }
    from = end + 1;
  }
  return false;
}

/**
 * The real check: `tools/check-redaction.mjs --partial` over `buf` (complete lines), written to a
 * scratch file under `dir` for the length of the check (the checker reads a path; a spawned child's
 * stdin is a socket, which /dev/stdin cannot open).  -> {ok, upTo, out}: `upTo` the bytes of `buf`
 * the verdict covers.  --partial fails only what a prefix can fail -- every leak rule and the exact
 * shapes -- and not the three coverage checks a game's first lines cannot meet yet (exit 3, and
 * all of `buf` decided); a state the next line could still justify (A6's one frame of slack) is
 * left undecided, and `decided=` stops before it.  Exit 1 is a failure, anything else a fault.
 */
export function checkRedaction(buf, dir) {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jsonl`);
  writeFileSync(file, buf);
  return new Promise((resolveCheck) => {
    const child = spawn(process.execPath, [CHECKER, '--partial', file], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.setEncoding('utf8').on('data', (d) => { if (out.length < 65536) out += d; });
    child.stderr.setEncoding('utf8').on('data', (d) => { if (out.length < 65536) out += d; });
    child.on('error', (e) => { rmSync(file, { force: true }); resolveCheck({ ok: false, out: `the checker did not start: ${e.message}` }); });
    child.on('close', (code) => {
      rmSync(file, { force: true });
      const decided = /^\s+partial: decided=(\d+) of /m.exec(out);
      if (code === 0) resolveCheck({ ok: true, upTo: buf.length, out });
      else if (code === 3 && decided) resolveCheck({ ok: true, upTo: Math.min(buf.length, Number(decided[1])), out });
      else resolveCheck({ ok: false, out: code === 1 ? out : `the checker exited ${code}: ${out}` });
    });
  });
}

/**
 * The runner.  `command(req, dir)` is the argv to run (tests pass a fake); by
 * default `tools/cubelab.sh watch cubes/<cube>.md ...`.  `available()` is
 * whether that can work here (the bridge built: RecordMatch is what records).
 */
export const DEFAULT_WATCH_KEEP = 10;

export function createWatchRunner({ repoRoot, log = () => {}, command = null, available = null, killGraceMs = 5000, redactionCheck = null, keep = DEFAULT_WATCH_KEEP }) {
  if (!Number.isInteger(keep) || keep < 1) throw new Error(`keep is a whole number of watch folders >= 1, got ${keep}`);
  const root = resolve(repoRoot);
  const check = redactionCheck ?? ((buf) => checkRedaction(buf, join(root, 'var', 'watch-check')));
  const spectate = join(root, 'var', 'spectate');
  let running = null;   // { id, child, startedAt, failWhy? }
  /** Per game log: how much of it passed the redaction check (D440: nothing unchecked is served). */
  const checked = new Map();   // file -> { key, upTo, failed: string|null, pending: Promise|null }
  const isAvailable = available ?? (() => existsSync(join(root, 'bridge', 'out', 'mtgtable', 'RecordMatch.class')) && existsSync(join(root, 'tools', 'cubelab.sh')));
  const cubes = () => (existsSync(join(root, 'cubes')) ? readdirSync(join(root, 'cubes')).filter((n) => n.endsWith('.md')).map((n) => n.slice(0, -3)).filter((n) => CUBE.test(n)).sort() : []);
  const profiles = () => {
    const dir = join(root, 'forge-home', 'res', 'ai');
    return existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.ai')).map((n) => n.slice(0, -3)).sort() : ['Default'];
  };
  /** The watch folder for an id, or null (a bad id, or a real path outside var/spectate/). */
  const dirOf = (id) => {
    if (typeof id !== 'string' || !WATCH_ID.test(id)) return null;
    const d = join(spectate, id);
    if (!existsSync(d)) return d;
    try {
      const real = realpathSync(d);
      const top = realpathSync(spectate);
      return real.startsWith(top + sep) ? real : null;
    } catch { return null; }
  };
  const argvOf = (q, dir) => (command ? command(q, dir) : [join(root, 'tools', 'cubelab.sh'), 'watch', `cubes/${q.cube}.md`,
    '--seed', String(q.seed), '--games', String(q.games), '--player-a', q.playerA, '--player-b', q.playerB,
    '--pace', String(q.pace), '--out', `var/spectate/${q.id}`]);

  /** A watch that ended without saying so (killed, crashed): match.json says it now. */
  const settle = (dir, code, signal, failWhy = null) => {
    const file = join(dir, 'match.json');
    const m = readJson(file);
    if (failWhy && m) {
      // the runner stopped it (a served log failed the redaction check): its word is the last one
      m.status = 'error';
      m.error = failWhy;
      m.current = null;
      m.updatedAt = new Date().toISOString();
      for (const g of m.games ?? []) if (g.status === 'playing') { g.status = 'error'; g.error = failWhy; }
      try { writeFileSync(`${file}.runner.tmp`, `${JSON.stringify(m, null, 1)}\n`); renameSync(`${file}.runner.tmp`, file); } catch { /* the folder went away */ }
      return;
    }
    if (m && TERMINAL.has(m.status)) return;
    const why = signal ? `the watch process was stopped (${signal})` : `the watch process exited (code ${code}) before it finished; see watch.log`;
    const next = m ?? { v: 1, kind: 'watch-match', id: dir.split(sep).pop(), games: [] };
    next.status = signal === 'SIGTERM' || signal === 'SIGKILL' ? 'stopped' : 'error';
    next.error = why;
    next.current = null;
    next.updatedAt = new Date().toISOString();
    for (const g of next.games ?? []) if (g.status === 'playing') { g.status = 'error'; g.error = why; }
    try { writeFileSync(`${file}.runner.tmp`, `${JSON.stringify(next, null, 1)}\n`); renameSync(`${file}.runner.tmp`, file); } catch { /* the folder went away */ }
  };

  const killGroup = (r, sig) => { try { process.kill(-r.child.pid, sig); } catch { /* gone */ } };

  /** Remove all but the `keep` most recent watch folders (`fresh`, the one starting, counts as the newest; the running one stays). */
  const prune = (fresh) => {
    if (!existsSync(spectate)) return;
    const others = [];
    for (const n of readdirSync(spectate)) {
      if (!WATCH_ID.test(n) || n === fresh || n === running?.id) continue;
      const d = dirOf(n);
      if (!d || !existsSync(d) || !statSync(d).isDirectory()) continue;
      const at = Date.parse(readJson(join(d, 'match.json'))?.updatedAt ?? '') || statSync(d).mtimeMs;
      others.push({ n, d, at });
    }
    others.sort((a, b) => b.at - a.at);
    for (const o of others.slice(keep - 1)) {
      rmSync(o.d, { recursive: true, force: true });
      for (const k of [...checked.keys()]) if (k.startsWith(o.d + sep)) checked.delete(k);
      log(`WATCH ${o.n} removed (only the ${keep} most recent watches are kept)`);
    }
  };
  /** Does the watch's process group still have a member (its JVM, after the leader exited)? */
  const groupAlive = (r) => {
    try { process.kill(-r.child.pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
  };
  /** SIGKILL whatever of the group is left, `killGraceMs` from now (once; a stop arms it, so does an exit with members left). */
  const armKill = (r) => {
    if (r.killer) return;
    r.killer = setTimeout(() => { if (groupAlive(r)) { killGroup(r, 'SIGKILL'); log(`WATCH ${r.id} SIGKILL to what was left of it`); } }, killGraceMs);
  };

  /**
   * How much of game n's log passed tools/check-redaction.mjs, made to cover at least `want` bytes
   * when the log has them: the whole complete-lines prefix is checked again whenever a request
   * needs bytes past the last check (single-flight per file).  A failure is remembered, and stops
   * the running watch with `error`.  -> {upTo, failed: string|null}.
   */
  const passedUpTo = async (id, n, file, want) => {
    let last = { upTo: 0, failed: null };
    for (let round = 0; round < 3; round++) {
      let st;
      try { st = statSync(file); } catch { return { upTo: 0, failed: null }; }
      const key = `${st.ino}:${st.birthtimeMs}`;
      let e = checked.get(file);
      if (!e || e.key !== key) { e = { key, upTo: 0, seen: 0, failed: null, pending: null }; checked.set(file, e); }
      if (e.failed) return { upTo: e.upTo, failed: e.failed };
      // `seen`: the prefix length last checked.  A verdict that stopped short of it (no state frame
      // yet, or an undecided last state) waits for the log to grow before it is asked again.
      if (e.upTo >= want || e.seen >= want) return { upTo: e.upTo, failed: null };
      if (e.pending) { await e.pending; continue; }
      const entry = e;
      entry.pending = (async () => {
        let buf;
        try { buf = readFileSync(file); } catch { return; }
        const cut = buf.lastIndexOf(0x0a);
        if (cut < 0) return;
        const prefix = buf.subarray(0, cut + 1);
        if (prefix.length <= entry.seen) return;
        // A game opens with the session line and hello_ok and Forge's first state follows about 10 s
        // later: until a state frame is written there is nothing to serve, which is 0 bytes passed,
        // not a failure (the checker is not even asked).
        if (!hasStateFrame(prefix)) { entry.seen = prefix.length; return; }
        const r = await check(prefix);
        if (checked.get(file) !== entry) return;   // re-recorded while it ran
        if (r.ok) {
          entry.seen = Math.max(entry.seen, prefix.length);
          entry.upTo = Math.max(entry.upTo, Math.min(prefix.length, r.upTo ?? prefix.length));
          return;
        }
        const lines = String(r.out ?? '').split('\n').filter((l) => /^\s*!/.test(l)).slice(0, 3).map((l) => l.trim().replace(/^!\s*/, '')).join(' | ');
        // The checker's own words can name the card that leaked, so they go to the helper's console only:
        // the message a client (and match.json) gets says which game and nothing about what failed.
        entry.failed = `game ${n} failed tools/check-redaction.mjs as it was served (its first ${prefix.length} bytes); nothing past the last line that passed was sent, and the watch was stopped`;
        log(`WATCH ${id} REDACTION FAIL on game ${n} (${prefix.length} bytes): ${lines || 'see tools/check-redaction.mjs on the file'}`);
        if (running && running.id === id) {
          running.failWhy = entry.failed;
          killGroup(running, 'SIGTERM');
          armKill(running);
        }
      })().finally(() => { entry.pending = null; });
      await entry.pending;
      last = { upTo: entry.upTo, failed: entry.failed };
      if (entry.failed || entry.upTo >= want || entry.seen >= want) return last;
      // re-recorded while it ran: look again (a bounded number of times, then send what passed)
    }
    return last;
  };

  return {
    available: () => isAvailable(),
    health: () => ({ watch: isAvailable() ? 1 : 0, watchRunning: running ? running.id : null }),
    running: () => (running ? running.id : null),

    post(q) {
      if (!isAvailable()) return { status: 503, body: { ok: false, type: 'error', message: 'watching needs the bridge built (./bridge/build.sh): RecordMatch records the games' } };
      const v = validateWatch(q, { cubes: cubes(), profiles: profiles() });
      if (!v.req) return { status: v.status, body: { ok: false, type: 'error', message: v.message } };
      if (running) return { status: 409, body: { ok: false, type: 'error', code: 'busy', running: running.id, message: `a watch is running (${running.id}); one at a time -- follow it, or POST /watch/${running.id}/stop` } };
      const r = v.req;
      const dir = dirOf(r.id);
      if (!dir) return { status: 400, body: { ok: false, type: 'error', message: 'that watch folder is not under var/spectate/' } };
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(dir, { recursive: true });
      for (const k of [...checked.keys()]) if (k.startsWith(dir + sep)) checked.delete(k);
      prune(r.id);
      const fd = openSync(join(dir, 'watch.log'), 'w');
      const [file, ...args] = argvOf(r, dir);
      let child;
      try {
        child = spawn(file, args, { cwd: root, detached: true, stdio: ['ignore', fd, fd], env: process.env });
      } finally { closeSync(fd); }
      const me = { id: r.id, child, startedAt: Date.now() };
      running = me;
      child.on('error', (e) => {
        // A child that never started fires no 'exit': free the slot and say why here.
        log(`WATCH ${r.id} could not start: ${e.message}`);
        if (running === me && child.pid === undefined) { running = null; settle(dir, 127, null); }
      });
      child.on('exit', (code, signal) => {
        if (running === me) running = null;
        // The leader is gone, its group may not be (a JVM it started that has not died yet): a stop's
        // SIGKILL stays armed, and any other exit with members left sends them SIGTERM and arms one.
        if (groupAlive(me)) {
          if (!me.killer) killGroup(me, 'SIGTERM');
          armKill(me);
        } else clearTimeout(me.killer);
        settle(dir, code, signal, me.failWhy ?? null);
        log(`WATCH ${r.id} ended (${signal ?? `exit ${code}`}) in ${((Date.now() - me.startedAt) / 1000).toFixed(0)} s`);
      });
      log(`WATCH ${r.id} started: ${r.cube}, seed ${r.seed}, best of ${r.games}, A ${r.playerA} vs B ${r.playerB}, pace ${r.pace} ms`);
      return { status: 202, body: { ok: true, id: r.id, seed: r.seed, state: `/watch/${r.id}`, game: `/watch/${r.id}/game/<n>` } };
    },

    list() {
      const watches = [];
      if (existsSync(spectate)) {
        for (const n of readdirSync(spectate)) {
          if (!WATCH_ID.test(n)) continue;
          const m = readJson(join(spectate, n, 'match.json'));
          if (!m) continue;
          watches.push({ id: n, status: m.status, cube: m.cube?.title ?? null, seed: m.seed, bestOf: m.bestOf, players: m.players, wins: m.wins, winner: m.winner, updatedAt: m.updatedAt });
        }
      }
      watches.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      return { status: 200, body: { ok: true, running: running ? running.id : null, watches: watches.slice(0, 20) } };
    },

    get(id) {
      const dir = dirOf(id);
      if (!dir || !existsSync(dir)) return { status: 404, body: { ok: false, type: 'error', message: 'no such watch' } };
      return { status: 200, body: { ok: true, id, running: running?.id === id, match: readJson(join(dir, 'match.json')), draft: readJson(join(dir, 'draft.json')) } };
    },

    /**
     * A game's frame log: {status, body: Buffer, headers} (or a JSON body for an error).  Async: the
     * bytes it sends have passed the redaction check first (passedUpTo).
     */
    async game(id, n, { from = null, range = null } = {}) {
      const dir = dirOf(id);
      if (!dir || !/^[1-9]$/.test(String(n))) return { status: 404, json: { ok: false, type: 'error', message: 'no such game' } };
      const file = join(dir, `${id}-g${n}.jsonl`);
      let start = 0;
      let ranged = false;
      if (from !== null) {
        if (!/^[0-9]{1,15}$/.test(from)) return { status: 400, json: { ok: false, type: 'error', message: '"from" is a byte offset' } };
        start = Number(from);
      } else if (range) {
        const m = /^bytes=([0-9]{1,15})-$/.exec(range);
        if (!m) return { status: 416, json: { ok: false, type: 'error', message: 'only "Range: bytes=<n>-" is served' } };
        start = Number(m[1]);
        ranged = true;
      }
      const first = readCompleteLines(file, start);
      if (first.status === 404) return { status: 404, json: { ok: false, type: 'error', message: 'this game has not started (yet)' } };
      const ok = first.status === 200 ? await passedUpTo(id, n, file, first.next) : { upTo: first.next, failed: null };
      if (ok.failed) return { status: 500, json: { ok: false, type: 'error', code: 'redaction-failed', message: ok.failed } };
      // only what passed: the chunk cut back to the checked prefix (whole lines either way)
      const c = first.status === 200 && ok.upTo < first.next ? readCompleteLines(file, start, Math.max(0, ok.upTo - start)) : first;
      const headers = { 'X-Log-Next': String(c.next), 'X-Log-Size': String(c.size) };
      if (c.status === 416 || (ranged && start >= c.size)) {
        return { status: 416, json: { ok: false, type: 'error', message: 'past the end of the log: it was re-recorded' }, headers: { ...headers, 'Content-Range': `bytes */${c.size}` } };
      }
      if (ranged) {
        return { status: 206, body: c.body, headers: { ...headers, ...(c.body.length ? { 'Content-Range': `bytes ${start}-${start + c.body.length - 1}/${c.size}` } : {}) } };
      }
      return { status: 200, body: c.body, headers };
    },

    stop(id) {
      const dir = dirOf(id);
      if (!dir || !existsSync(dir)) return { status: 404, body: { ok: false, type: 'error', message: 'no such watch' } };
      if (!running || running.id !== id) return { status: 409, body: { ok: false, type: 'error', code: 'not-running', message: 'that watch is not running' } };
      const r = running;
      killGroup(r, 'SIGTERM');
      armKill(r);
      log(`WATCH ${id} stopping`);
      return { status: 200, body: { ok: true, id, stopping: true } };
    },

    /**
     * The helper is shutting down: SIGTERM the running watch's group, then SIGKILL whatever is left
     * after `killGraceMs`.  Resolves when the group is gone (await it before process.exit, or the
     * SIGKILL never happens).
     */
    close() {
      const r = running;
      if (!r) return Promise.resolve();
      killGroup(r, 'SIGTERM');
      const t0 = Date.now();
      return new Promise((done) => {
        const tick = () => {
          if (!groupAlive(r)) { done(); return; }
          if (Date.now() - t0 >= killGraceMs) { killGroup(r, 'SIGKILL'); done(); return; }
          setTimeout(tick, 50);
        };
        tick();
      });
    },
  };
}
