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
//                          at most 4 MiB an answer; 404 while the game has not started
//   POST /watch/<id>/stop  -> 200 {"ok": true, "id", "stopping": true}; 409 {"code": "not-running"}
//
// Every route sits behind the coach helper's door exactly as /review does
// (D386: loopback, or --lan and the pairing token; the Host check; Origin on
// wsAllowedOrigins; a tunnel's headers 403) -- this file sees only requests the
// door admitted.  A GET reads and never starts, stops or writes anything.
//
// HIDDEN INFORMATION.  Each game is recorded from seat 0's eyes (drafter A), the
// other hand the five-key stub, and the watch checks every recording with
// tools/check-redaction.mjs (match.json's `redaction`).  draft.json shows both
// pools and both decks: a grid draft is face up, both drafters saw every grid.
//
// The run lives in var/spectate/watch-<cube>-<seed>/ (draft.json, match.json,
// <id>-g<n>.jsonl, the decks, the lab's folder, watch.log); a second watch of
// the same cube and seed replaces it, and a follower of the old log gets 416.

import { spawn } from 'node:child_process';
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

/**
 * The runner.  `command(req, dir)` is the argv to run (tests pass a fake); by
 * default `tools/cubelab.sh watch cubes/<cube>.md ...`.  `available()` is
 * whether that can work here (the bridge built: RecordMatch is what records).
 */
export function createWatchRunner({ repoRoot, log = () => {}, command = null, available = null, killGraceMs = 5000 }) {
  const root = resolve(repoRoot);
  const spectate = join(root, 'var', 'spectate');
  let running = null;   // { id, child, startedAt }
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
  const settle = (dir, code, signal) => {
    const file = join(dir, 'match.json');
    const m = readJson(file);
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
        clearTimeout(me.killer);
        settle(dir, code, signal);
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

    /** A game's frame log: {status, body: Buffer, headers} (or a JSON body for an error). */
    game(id, n, { from = null, range = null } = {}) {
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
      const c = readCompleteLines(file, start);
      if (c.status === 404) return { status: 404, json: { ok: false, type: 'error', message: 'this game has not started (yet)' } };
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
      r.killer = setTimeout(() => killGroup(r, 'SIGKILL'), killGraceMs);
      log(`WATCH ${id} stopping`);
      return { status: 200, body: { ok: true, id, stopping: true } };
    },

    close() {
      if (running) killGroup(running, 'SIGTERM');
    },
  };
}
