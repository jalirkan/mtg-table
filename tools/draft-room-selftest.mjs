#!/usr/bin/env node
// mtg-table — tools/draft-room-selftest.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The draft room's self-test (D400; gate step 12f, CI's redaction job).  It holds:
//
//   1. the rules: every case of fixtures/draft-room/grid-golden.json (written by
//      ForgeCoach's src/draft/draft.ts) dealt and drafted here move for move, and
//      this file's rng against tools/cubelab/rng.ts itself (where Node can import .ts);
//   2. the pure pieces: the create body's checks, names, the Origin rule, the
//      site's path rule, the LAN addresses;
//   3. end to end, in this process: the real coach helper (its owner door makes
//      the room) and the room listener on free ports, two simulated players with
//      a live event stream each, through a full 18-grid draft -- every wrong turn,
//      stale view, illegal line, missing or wrong token, foreign Origin, oversized
//      body refused on the way; a reconnect mid-draft; the seed revealed at the end
//      and the whole draft re-dealt from it;
//   4. what lasts: a second store over the same folder keeps the rooms and the
//      links (rooms.json holds token digests only); expiry closes streams;
//   5. the limits: requests, wrong links, streams per seat;
//   6. the site: files served, traversal, symlinks and encoded tricks refused;
//   7. the CLI: `coach-helper.mjs --draft-room` on free ports, /health and a room.
//
// Its files are under var/draft-room-selftest/.  No network, no engine, no claude.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startHelper } from './coach-helper.mjs';
import {
  applyPick, checkCreate, cleanText, createRoomOwner, createRoomStore, dealGrid, legalLines, newGrid, ownOrigin,
  rng, roomAdmit, roomBases, sitePath, startRoomServer, toAct,
} from './draft-room.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const VAR = join(ROOT, 'var', 'draft-room-selftest');
const ORIGINS = ['http://127.0.0.1:*', 'http://localhost:*', 'https://jalirkan.github.io'];
let checks = 0;
let failed = 0;
const ok = (cond, what) => {
  checks++;
  if (cond) console.log(`  ok    ${what}`);
  else { failed++; console.log(`  FAIL  ${what}`); }
};
const eq = (a, b, what) => ok(JSON.stringify(a) === JSON.stringify(b), what + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` (got ${JSON.stringify(a)?.slice(0, 200)}, want ${JSON.stringify(b)?.slice(0, 200)})`));
const section = (s) => console.log(`\n== ${s}`);

rmSync(VAR, { recursive: true, force: true });
mkdirSync(VAR, { recursive: true });

// ---------------------------------------------------------------------------
section('1. the rules: ForgeCoach draft.ts golden cases, and tools/cubelab/rng.ts');
const golden = JSON.parse(readFileSync(join(ROOT, 'fixtures', 'draft-room', 'grid-golden.json'), 'utf8'));
ok(golden.cases.length >= 6, `the golden file has ${golden.cases.length} cases`);
for (const c of golden.cases) {
  const r = newGrid({ cards: golden.cubes[c.cube], seed: c.seed, firstSeat: c.firstSeat });
  eq(r.dealt, c.dealt, `${c.cube} seed ${c.seed}: the same ${c.dealt.length} cards dealt in the same order`);
  eq(r.grids, c.grids, `${c.cube} seed ${c.seed}: ${c.grids} grids`);
  while (!r.done) {
    const legal = legalLines(r);
    applyPick(r, toAct(r), legal[(r.log.length * 5 + r.g) % legal.length]);
  }
  eq(r.log, c.log, `${c.cube} seed ${c.seed} first seat ${c.firstSeat}: every pick the same (${c.log.length} picks)`);
  eq(r.picks, c.picks, `${c.cube} seed ${c.seed} first seat ${c.firstSeat}: both pools the same`);
}
try {
  const lab = await import('./cubelab/rng.ts');
  for (const [seed, stream] of [[1, 'grid'], [42, ''], [5_000_000_000, 'grid'], [2147483647, 'winston']]) {
    const a = rng(seed, stream);
    const b = lab.rng(seed, stream);
    const xs = Array.from({ length: 50 }, () => a.next());
    const ys = Array.from({ length: 50 }, () => b.next());
    eq(xs, ys, `rng(${seed}, '${stream}') matches tools/cubelab/rng.ts for 50 draws`);
  }
} catch (e) {
  console.log(`  skip  tools/cubelab/rng.ts cannot be imported by this Node (${e.message.split('\n')[0]}); the golden cases above cover it`);
}
{
  const r = newGrid({ cards: golden.cubes.small, seed: 3, firstSeat: 1 });
  let threw = null;
  try { applyPick(r, 0, 0); } catch (e) { threw = e.code; }
  eq(threw, 'turn', 'seat 0 may not open when seat 1 does');
  applyPick(r, 1, 4);
  try { applyPick(r, 0, 4); threw = null; } catch (e) { threw = e.code; }
  eq(threw, 'illegal', 'the second drafter may not take the line the first took');
  ok(legalLines(r).length === 5, 'five lines left after a column is taken');
  const second = applyPick(r, 0, 0);
  eq(second.length, 2, 'a crossing row has two cards left');
  eq([r.g, toAct(r)], [1, 0], 'grid 2 opens with the other seat');
}

// ---------------------------------------------------------------------------
section('2. the pure pieces');
{
  const cards = Array.from({ length: 30 }, (_, i) => `C${i}`);
  const o = {};
  eq(checkCreate({ cubeId: 'synergy', cards, name: ' Justin ' }, o), null, 'a good body passes');
  eq(o.name, 'Justin', 'the name is trimmed');
  ok(checkCreate({ cubeId: 'Synergy!', cards }) !== null, 'a bad cube id is refused');
  ok(checkCreate({ cubeId: 'x', cards: cards.slice(0, 8) }) !== null, 'fewer than 9 cards is refused');
  ok(checkCreate({ cubeId: 'x', cards: [...cards.slice(0, 8), 'C0', 'C1'] }) !== null, 'duplicates do not count towards 9');
  ok(checkCreate({ cubeId: 'x', cards: [...cards, 'bad\u0000name'] }) !== null, 'a control character in a card is refused');
  ok(checkCreate({ cubeId: 'x', cards: Array(2001).fill('A') }) !== null, 'more than 2000 cards is refused');
  ok(checkCreate({ cubeId: 'x', cards, extra: 1 }) !== null, 'an unknown field is refused');
  ok(checkCreate({ cubeId: 'x', cards, firstSeat: 2 }) !== null, 'firstSeat 2 is refused');
  ok(checkCreate({ cubeId: 'x', cards, name: 'x'.repeat(25) }) !== null, 'a 25-character name is refused');
  ok(checkCreate([]) !== null && checkCreate(null) !== null, 'a body that is not an object is refused');
  eq(cleanText('  a   b ', 24), 'a b', 'spaces are folded');
  eq(cleanText('a\u2028b', 24), null, 'a line separator is refused');
  eq(cleanText('', 24), null, 'empty is refused');
  // The Origin rule.
  ok(roomAdmit({ origin: undefined, host: 'x', origins: ORIGINS }).ok, 'no Origin (a script): admitted, the token decides');
  ok(roomAdmit({ origin: 'https://jalirkan.github.io', host: '127.0.0.1:8644', origins: ORIGINS }).ok, 'github.io: admitted');
  ok(roomAdmit({ origin: 'http://192.168.1.5:8644', host: '192.168.1.5:8644', origins: ORIGINS }).ok, 'the page this listener served (LAN): admitted');
  ok(roomAdmit({ origin: 'https://draft.example.com', host: 'draft.example.com', origins: ORIGINS }).ok, 'a tunnel page on its own host: admitted');
  ok(!roomAdmit({ origin: 'https://evil.example', host: '127.0.0.1:8644', origins: ORIGINS }).ok, 'a foreign page: refused');
  ok(!roomAdmit({ origin: 'http://192.168.1.5:9999', host: '192.168.1.5:8644', origins: ORIGINS }).ok, 'the right host on another port: refused');
  ok(roomAdmit({ origin: 'https://draft.example.com', host: '127.0.0.1:8644', origins: ORIGINS, extraOrigins: ['https://draft.example.com'] }).ok, 'a --room-origin: admitted');
  ok(ownOrigin('http://[::1]:8644', '[::1]:8644') && !ownOrigin('http://a.b', 'a.b:81'), 'own origin: IPv6 and default ports');
  // Addresses.
  const b = roomBases({ port: 8644, lan: true, publicUrl: null, interfaces: { lo: [{ family: 'IPv4', address: '127.0.0.1', internal: true }], e: [{ family: 'IPv4', address: '100.64.0.2', internal: false }, { family: 'IPv4', address: '192.168.1.5', internal: false }], v6: [{ family: 'IPv6', address: 'fe80::1', internal: false }] } });
  eq(b, { local: 'http://127.0.0.1:8644', lan: ['http://192.168.1.5:8644', 'http://100.64.0.2:8644'], public: null }, 'LAN addresses: IPv4, not loopback, home network first');
  eq(roomBases({ port: 8644, lan: false, interfaces: {} }).lan, [], 'no LAN addresses without --lan');
}

// ---------------------------------------------------------------------------
// Helpers for the HTTP parts.
const cards = Array.from({ length: 240 }, (_, i) => `Cube Card ${i + 1}`);
async function call(base, path, { method = 'GET', token, body, origin, host, raw } = {}) {
  const headers = {};
  if (token !== undefined) headers['X-Room-Token'] = token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (origin) headers.Origin = origin;
  if (host) headers.Host = host;
  if (host || origin) {
    // fetch() will not send a Host or an Origin of our choosing: node:http does.
    return new Promise((res, rej) => {
      const u = new URL(base + path);
      const data = body === undefined ? undefined : (raw ?? JSON.stringify(body));
      const q = request({ host: u.hostname, port: u.port, path: u.pathname + u.search, method, headers: { ...headers, ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) } }, (r) => {
        let t = '';
        r.on('data', (c) => { t += c; });
        r.on('end', () => { let j = null; try { j = JSON.parse(t); } catch { /* text */ } res({ status: r.status ?? r.statusCode, json: j, text: t, headers: r.headers }); });
      });
      q.on('error', rej);
      if (data) q.write(data);
      q.end();
    });
  }
  const r = await fetch(base + path, { method, headers, body: body === undefined ? undefined : (raw ?? JSON.stringify(body)) });
  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch { /* text */ }
  return { status: r.status, json: j, text: t, headers: Object.fromEntries(r.headers) };
}

/** A live event stream, like ForgeCoach's room client: the latest state, every event, a promise for the next. */
function stream(base, id, token) {
  const ac = new AbortController();
  const s = { states: [], gone: false, status: 0, closed: false, waiters: [] };
  s.ready = (async () => {
    const r = await fetch(`${base}/room/${id}/events`, { headers: { 'X-Room-Token': token }, signal: ac.signal });
    s.status = r.status;
    if (r.status !== 200) { s.closed = true; return; }
    (async () => {
      const rd = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      try {
        for (;;) {
          const { value, done } = await rd.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const block = buf.slice(0, i);
            buf = buf.slice(i + 2);
            const ev = /^event: (.*)$/m.exec(block)?.[1];
            const data = /^data: (.*)$/m.exec(block)?.[1];
            if (ev === 'state') s.states.push(JSON.parse(data));
            if (ev === 'gone') s.gone = true;
            for (const w of s.waiters.splice(0)) w();
          }
        }
      } catch { /* aborted */ }
      s.closed = true;
      for (const w of s.waiters.splice(0)) w();
    })();
  })();
  s.latest = () => s.states[s.states.length - 1];
  s.until = (pred, ms = 3000) => new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timed out waiting for the stream')), ms);
    const check = () => { if (pred(s)) { clearTimeout(t); res(s); } else s.waiters.push(check); };
    check();
  });
  s.close = () => ac.abort();
  return s;
}

// ---------------------------------------------------------------------------
section('3. end to end: the helper makes the room, two players draft all 18 grids');
const logs = [];
const store = createRoomStore({ dir: join(VAR, 'rooms'), varRoot: join(ROOT, 'var'), log: (s) => logs.push(s) });
const roomSrv = startRoomServer({ store, port: 0, origins: ORIGINS, log: (s) => logs.push(s) });
const roomPort = await roomSrv.listen();
const owner = createRoomOwner({ store, roomPort, lan: false });
const helper = startHelper({ port: 0, lan: false, token: '', wsPort: 8642, origins: ORIGINS, queueMax: 1, timeoutS: 5, room: owner, review: null, evaluator: null, log: (s) => logs.push(s) });
const helperPort = await helper.listen();
const H = `http://127.0.0.1:${helperPort}`;
const R = `http://127.0.0.1:${roomPort}`;

const health = await call(H, '/health');
eq([health.json?.draftRoom, health.json?.roomPort, health.json?.rooms], [1, roomPort, 0], '/health: draftRoom 1, the room port, no rooms');
const made = await call(H, '/room', { method: 'POST', body: { cubeId: 'synergy', cubeTitle: 'Synergy Cube', cards: [...cards, 'Cube Card 1'], name: 'Justin', firstSeat: 0 } });
eq(made.status, 201, 'POST /room on the helper: 201');
const id = made.json.id;
const T0 = made.json.token;
const T1 = made.json.friendToken;
ok(/^r[A-Za-z0-9_-]{8}$/.test(id) && /^[A-Za-z0-9_-]{22}$/.test(T0) && /^[A-Za-z0-9_-]{22}$/.test(T1) && T0 !== T1, 'a room id and two different 128-bit tokens');
eq([made.json.cube.size, made.json.grids, made.json.roomPort, made.json.bases.local], [240, 18, roomPort, `http://127.0.0.1:${roomPort}`], 'the cube (de-duplicated), 18 grids, where to reach the room');
ok(!JSON.stringify(logs).includes(T0) && !JSON.stringify(logs).includes(T1), 'neither token is in the log');
const disk = readFileSync(join(VAR, 'rooms', 'rooms.json'), 'utf8');
ok(!disk.includes(T0) && !disk.includes(T1), 'rooms.json holds no token, only digests');
ok(((await import('node:fs')).statSync(join(VAR, 'rooms', 'rooms.json')).mode & 0o077) === 0, 'rooms.json is the owner\'s alone (mode 600)');
eq((await call(H, '/room', { method: 'POST', host: 'draft.example.com', body: { cubeId: 'x', cards } })).status, 403, 'POST /room with a tunnel\'s Host on the helper: 403 (D386, the owner\'s door)');
eq((await call(H, '/room', { method: 'POST', body: { cubeId: 'x', cards: ['a'] } })).status, 400, 'POST /room with a bad body: 400');
eq((await call(H, '/room', { method: 'POST', raw: 'x'.repeat(300 * 1024), body: {} })).status, 413, 'POST /room over 256 KB: 413');
const listed = await call(H, '/room');
eq(listed.json.rooms.map((r) => [r.id, r.joined]), [[id, [true, false]]], 'GET /room: the room, seat 2 not joined, no tokens');
ok(!listed.text.includes(T0), 'GET /room carries no token');
eq((await call(R, '/room', { method: 'POST', body: { cubeId: 'x', cards } })).status, 404, 'the room listener cannot make a room');

// The door: never loopback alone.
eq((await call(R, `/room/${id}`)).status, 403, 'no token from loopback: 403');
eq((await call(R, `/room/${id}`, { token: 'A'.repeat(22) })).status, 403, 'a wrong token: 403');
eq((await call(R, `/room/rAAAAAAAA`, { token: T0 })).status, 404, 'a right token for another room id: 404');
eq((await call(R, `/room/${id}`, { token: T0, origin: 'https://evil.example' })).status, 403, 'a foreign Origin with the right token: 403');
const viaPage = await call(R, `/room/${id}`, { token: T0, origin: 'https://jalirkan.github.io' });
eq([viaPage.status, viaPage.headers['access-control-allow-origin']], [200, 'https://jalirkan.github.io'], 'github.io with the token: 200, CORS echoed');
const pre = await call(R, `/room/${id}/pick`, { method: 'OPTIONS', origin: 'https://jalirkan.github.io' });
ok(pre.status === 204 && /X-Room-Token/.test(pre.headers['access-control-allow-headers']) && pre.headers['access-control-allow-private-network'] === 'true', 'a preflight: 204, X-Room-Token allowed, private network');
const tunnelled = await call(R, `/room/${id}`, { token: T1, host: 'draft.example.com', origin: 'https://draft.example.com' });
eq(tunnelled.status, 200, 'a tunnel\'s Host and its own https Origin with the token: 200');

let s0v = await call(R, `/room/${id}`, { token: T0 });
eq([s0v.json.you, s0v.json.toAct, s0v.json.g, s0v.json.slots.length, s0v.json.seed, s0v.json.seats[1].joined], [0, 0, 0, 9, null, false], 'seat 0 sees grid 1, its own move, no seed yet, seat 2 not joined');
ok(!('dealt' in s0v.json), 'no future grid is sent');
const early = await call(R, `/room/${id}/pick`, { method: 'POST', token: T0, body: { line: 0, expect: s0v.json.version } });
eq([early.status, early.json.code], [409, 'waiting'], 'a pick before the friend joins: 409 waiting');

const p0 = stream(R, id, T0);
await p0.ready;
eq(p0.status, 200, 'seat 0 opens its event stream');
const joined = await call(R, `/room/${id}/join`, { method: 'POST', token: T1, body: { name: 'Sam' } });
eq([joined.status, joined.json.you, joined.json.seats[1]], [200, 1, { name: 'Sam', joined: true, online: false, picks: [] }], 'seat 1 joins as Sam');
eq((await call(R, `/room/${id}/join`, { method: 'POST', token: T1, body: { name: 'x'.repeat(30) } })).status, 400, 'a 30-character name: 400');
eq((await call(R, `/room/${id}/join`, { method: 'POST', token: T1, raw: 'x'.repeat(2000), body: {} })).status, 413, 'a 2 KB body: 413');
await p0.until((s) => s.latest()?.seats[1].joined);
ok(true, 'seat 0\'s stream saw the join');
const p1 = stream(R, id, T1);
await p1.ready;
await p0.until((s) => s.latest()?.seats[1].online);
ok(true, 'seat 0\'s stream sees seat 1 online');

let wrongTurns = 0;
let stale = 0;
let illegal = 0;
let reconnected = false;
let streams = [p0, p1];
const tokens = [T0, T1];
let lastVersion = 0;
for (let step = 0; step < 36; step++) {
  const cur = streams[0].latest();
  const who = cur.toAct;
  const other = 1 - who;
  // A wrong turn, once per grid.
  if (step % 2 === 0) {
    const r = await call(R, `/room/${id}/pick`, { method: 'POST', token: tokens[other], body: { line: legalLines(cur)[0], expect: cur.version } });
    if (r.status === 409 && r.json.code === 'turn') wrongTurns++;
  }
  // An illegal line (the one the first drafter took), on second picks.
  if (cur.firstLine !== null) {
    const r = await call(R, `/room/${id}/pick`, { method: 'POST', token: tokens[who], body: { line: cur.firstLine, expect: cur.version } });
    if (r.status === 400 && r.json.code === 'illegal') illegal++;
  }
  // A stale view.
  if (step === 5) {
    const r = await call(R, `/room/${id}/pick`, { method: 'POST', token: tokens[who], body: { line: legalLines(cur)[0], expect: cur.version - 1 } });
    if (r.status === 409 && r.json.code === 'stale' && r.json.state.version === cur.version) stale++;
  }
  const legal = legalLines({ ...cur, slots: cur.slots });
  const line = legal[(step * 7) % legal.length];
  const r = await call(R, `/room/${id}/pick`, { method: 'POST', token: tokens[who], body: { line, expect: cur.version } });
  if (r.status !== 200) { ok(false, `pick ${step + 1}: ${r.status} ${r.text}`); break; }
  lastVersion = r.json.version;
  await Promise.all(streams.map((s) => s.until((x) => x.latest()?.version === r.json.version)));
  if (step === 17) {
    // A reconnect mid-draft: seat 1 drops its stream and opens a new one.
    streams[1].close();
    await p0.until((s) => !s.latest().seats[1].online);
    const again = stream(R, id, T1);
    await again.ready;
    await again.until((s) => s.latest()?.version === r.json.version);
    streams = [p0, again];
    reconnected = again.latest().seats[1].online && again.latest().g === 9;
  }
}
const end0 = p0.latest();
const end1 = streams[1].latest();
eq([end0.done, end0.toAct, end0.g, end0.log.length], [true, null, 18, 36], 'the draft is over after 36 picks over 18 grids');
eq(wrongTurns, 18, 'every out-of-turn pick (18) was refused 409 turn');
eq(illegal, 18, 'every second pick of the first line (18) was refused 400 illegal');
eq(stale, 1, 'a pick against an old version was refused 409 stale, with the current state');
ok(reconnected, 'seat 1 reconnected mid-draft (grid 10) and its new stream had the current state');
eq(end0.seats.map((s) => s.picks.length), [end0.log.filter((e) => e.seat === 0).reduce((n, e) => n + e.cards.length, 0), end0.log.filter((e) => e.seat === 1).reduce((n, e) => n + e.cards.length, 0)], 'each seat\'s picks are its log entries\' cards');
eq(end1.seats, end0.seats.map((s) => ({ ...s })), 'both seats see the same picks (Grid has no hidden information)');
eq([end0.you, end1.you], [0, 1], 'each stream is its own seat');
ok(Number.isInteger(end0.seed), `the seed is revealed at the end (${end0.seed})`);
const re = dealGrid(cards, end0.seed);
const replay = newGrid({ cards, seed: end0.seed, firstSeat: end0.firstSeat });
for (const e of end0.log) applyPick(replay, e.seat, e.line);
eq(replay.log, end0.log, 'the whole draft, re-dealt from the seed and replayed, is the room\'s (ForgeCoach checks the same)');
eq(re.dealt.slice(0, 9).filter((c) => end0.log[0].cards.includes(c)).length, end0.log[0].cards.length, 'the first line came from the first grid dealt');
const after = await call(R, `/room/${id}/pick`, { method: 'POST', token: T0, body: { line: 0, expect: end0.version } });
eq([after.status, after.json.code], [409, 'done'], 'a pick after the end: 409 done');
eq((await call(R, `/room/${id}`, { token: T1 })).json.seats[0].name, 'Justin', 'picks so far: GET /room/<id> any time');

// ---------------------------------------------------------------------------
section('4. what lasts: a second store over the same folder; expiry');
{
  let t = Date.now();
  const st2 = createRoomStore({ dir: join(VAR, 'rooms'), varRoot: join(ROOT, 'var'), now: () => t });
  eq(st2.load(), 1, 'a restarted helper reads the room back');
  eq([st2.auth(id, T0), st2.auth(id, T1), st2.auth(id, 'B'.repeat(22))], [0, 1, 'token'], 'both links still work after the restart; a wrong one does not');
  eq(st2.view(id, 0).log, end0.log, 'the draft is all there');
  const r2 = st2.create({ cubeId: 'x', cubeTitle: 'x', cards, name: 'A', firstSeat: 1 });
  const got = [];
  st2.listen(r2.body.id, 0, (s) => got.push(s));
  t += 25 * 3600_000;   // past the idle limit
  eq(st2.sweep(), 2, 'a day with no pick: both rooms expire');
  eq(got[got.length - 1], null, 'an open stream is told the room is gone');
  eq(st2.auth(id, T0), 'gone', 'an expired room\'s link is gone');
  const st3 = createRoomStore({ dir: join(VAR, 'rooms'), varRoot: join(ROOT, 'var'), now: () => t });
  eq(st3.load(), 0, 'and it stays gone after a restart');
  const full = createRoomStore({ dir: null, maxRooms: 2 });
  full.create({ cubeId: 'x', cubeTitle: 'x', cards, name: 'A' });
  full.create({ cubeId: 'x', cubeTitle: 'x', cards, name: 'A' });
  eq(full.create({ cubeId: 'x', cubeTitle: 'x', cards, name: 'A' }).body.code, 'full', 'past the live-room cap: 429 full');
  let threw = false;
  mkdirSync(join(VAR, 'outside'), { recursive: true });
  try { symlinkSync('/tmp', join(VAR, 'escape')); createRoomStore({ dir: join(VAR, 'escape', 'rooms'), varRoot: join(ROOT, 'var') }); } catch { threw = true; }
  ok(threw, 'a room dir that a symlink leads out of var/ is refused');
  threw = false;
  try { createRoomStore({ dir: '/tmp/draft-room-x', varRoot: join(ROOT, 'var') }); } catch { threw = true; }
  ok(threw, 'a room dir outside var/ is refused');
}
p0.close();
streams[1].close();

// ---------------------------------------------------------------------------
section('5. the limits');
{
  const st = createRoomStore({ dir: null });
  const srv = startRoomServer({ store: st, port: 0, origins: ORIGINS, log: () => {}, limits: { seatPerMin: 6, seatBurst: 6, failPerMin: 3, streamsPerSeat: 2 } });
  const port = await srv.listen();
  const B = `http://127.0.0.1:${port}`;
  const mk = st.create({ cubeId: 'x', cubeTitle: 'x', cards, name: 'A' }).body;
  const codes = [];
  for (let i = 0; i < 4; i++) codes.push((await call(B, `/room/${mk.id}`, { token: 'C'.repeat(22) })).status);
  eq(codes, [403, 403, 403, 429], 'three wrong links, then 429 for the address');
  eq((await call(B, `/room/${mk.id}`, { token: mk.token })).status, 429, 'even the right link waits out the minute');
  // Behind a tunnel every peer is loopback: its CF-Connecting-IP keeps one client's wrong links from locking out another.
  const viaTunnel = (ip, token) => new Promise((res) => {
    const q = request({ host: '127.0.0.1', port: new URL(B).port, path: `/room/${mk.id}`, headers: { 'X-Room-Token': token, 'CF-Connecting-IP': ip } }, (r) => { r.resume(); r.on('end', () => res(r.statusCode)); });
    q.end();
  });
  const t1 = [];
  for (let i = 0; i < 4; i++) t1.push(await viaTunnel('203.0.113.7', 'D'.repeat(22)));
  eq(t1, [403, 403, 403, 429], 'a tunnelled client with wrong links: 429 for that client');
  eq(await viaTunnel('198.51.100.9', mk.token), 200, 'another tunnelled client with the right link: 200');
  srv.close();
  const srv2 = startRoomServer({ store: st, port: 0, origins: ORIGINS, log: () => {}, limits: { seatPerMin: 6, seatBurst: 6, streamsPerSeat: 2 } });
  const B2 = `http://127.0.0.1:${await srv2.listen()}`;
  const a = stream(B2, mk.id, mk.token); await a.ready;
  const b = stream(B2, mk.id, mk.token); await b.ready;
  const c = stream(B2, mk.id, mk.token); await c.ready;
  eq([a.status, b.status, c.status], [200, 200, 429], 'a third stream for one seat: 429');
  a.close(); b.close();
  const many = [];
  for (let i = 0; i < 6; i++) many.push((await call(B2, `/room/${mk.id}`, { token: mk.token })).status);
  ok(many.includes(429), `past the request rate: 429 (${many.join(' ')})`);
  srv2.close();
}

// ---------------------------------------------------------------------------
section('6. the site');
{
  const site = join(VAR, 'site');
  mkdirSync(join(site, 'assets'), { recursive: true });
  writeFileSync(join(site, 'index.html'), '<!doctype html><title>ForgeCoach</title>');
  writeFileSync(join(site, 'assets', 'app-abc.js'), 'console.log(1)');
  writeFileSync(join(VAR, 'secret.txt'), 'secret');
  symlinkSync(join(VAR, 'secret.txt'), join(site, 'link.txt'));
  const st = createRoomStore({ dir: null });
  const srv = startRoomServer({ store: st, port: 0, origins: ORIGINS, siteDir: site, log: () => {} });
  const B = `http://127.0.0.1:${await srv.listen()}`;
  const idx = await call(B, '/');
  ok(idx.status === 200 && idx.text.includes('ForgeCoach') && /text\/html/.test(idx.headers['content-type']), '/ is the site\'s index.html, no token needed');
  const js = await call(B, '/assets/app-abc.js');
  ok(js.status === 200 && /immutable/.test(js.headers['cache-control']) && /javascript/.test(js.headers['content-type']), 'a hashed asset: cached for good');
  const raw = (p) => new Promise((res) => {
    const q = request({ host: '127.0.0.1', port: new URL(B).port, path: p, method: 'GET' }, (r) => { let t = ''; r.on('data', (c) => { t += c; }); r.on('end', () => res({ status: r.statusCode, text: t })); });
    q.end();
  });
  for (const p of ['/../secret.txt', '/assets/../../secret.txt', '/%2e%2e/secret.txt', '/assets%2f..%2f..%2fsecret.txt', '/link.txt', '/x%00.html', '/..%5csecret.txt', '/nope.js']) {
    const r = await raw(p);
    ok(r.status === 404 && !r.text.includes('secret'), `${p}: 404, nothing outside the site`);
  }
  eq((await call(B, '/', { method: 'POST', body: {} })).status, 405, 'POST to the site: 405');
  ok(sitePath(site, '/') && !sitePath(site, '/link.txt'), 'sitePath: the index yes, a symlink no');
  srv.close();
  const bare = startRoomServer({ store: st, port: 0, origins: ORIGINS, log: () => {} });
  const nb = await call(`http://127.0.0.1:${await bare.listen()}`, '/');
  ok(nb.status === 404 && /no site here/.test(nb.text), 'no --room-site-dir: / says so (404)');
  bare.close();
}

// ---------------------------------------------------------------------------
section('7. the CLI: coach-helper.mjs --draft-room');
{
  const cfgFile = join(VAR, 'config.json');
  writeFileSync(cfgFile, JSON.stringify({ wsAllowedOrigins: ORIGINS, coach: { autoReview: false } }));
  const run = (args) => new Promise((res) => {
    const p = spawn(process.execPath, [join(ROOT, 'tools', 'coach-helper.mjs'), ...args], { cwd: ROOT, env: { ...process.env, MTG_TABLE_CONFIG: cfgFile, PATH: '/nonexistent' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { out += d; });
    const t = setInterval(() => {
      if (/COACH ROOM/.test(out) || p.exitCode !== null) { clearInterval(t); res({ p, out }); }
    }, 50);
  });
  const bad = await run(['--port', '0', '--no-review', '--no-eval', '--draft-room', '--room-port', '0', '--room-dir', '/tmp/not-var']);
  await new Promise((r) => (bad.p.exitCode !== null ? r() : bad.p.on('exit', r)));
  ok(bad.p.exitCode === 2 && /inside/.test(bad.out), '--room-dir outside var/: exit 2');
  const { p, out } = await run(['--port', '0', '--no-review', '--no-eval', '--draft-room', '--room-port', '0', '--room-dir', 'var/draft-room-selftest/cli']);
  const hp = /COACH LISTENING http:\/\/127\.0\.0\.1:(\d+)/.exec(out)?.[1];
  const rp = /ROOM LISTENING http:\/\/127\.0\.0\.1:(\d+)/.exec(out)?.[1];
  ok(hp && rp, `the helper and the room listener both listen (${hp}, ${rp})`);
  const h2 = await call(`http://127.0.0.1:${hp}`, '/health');
  eq([h2.json.draftRoom, h2.json.roomPort], [1, Number(rp)], '/health names the room port');
  const m2 = await call(`http://127.0.0.1:${hp}`, '/room', { method: 'POST', body: { cubeId: 'synergy', cards } });
  eq(m2.status, 201, 'a room made through the CLI helper');
  eq((await call(`http://127.0.0.1:${rp}`, `/room/${m2.json.id}`, { token: m2.json.friendToken })).json.you, 1, 'the friend\'s link reaches seat 2 on the room port');
  p.kill('SIGTERM');
  const plain = await run(['--port', '0', '--no-review', '--no-eval']);
  const hp3 = /COACH LISTENING http:\/\/127\.0\.0\.1:(\d+)/.exec(plain.out)?.[1];
  const h3 = await call(`http://127.0.0.1:${hp3}`, '/health');
  ok(!('draftRoom' in h3.json) && (await call(`http://127.0.0.1:${hp3}`, '/room', { method: 'POST', body: { cubeId: 'x', cards } })).status === 404, 'without --draft-room: no /health key, /room is 404 (nothing changes by default)');
  plain.p.kill('SIGTERM');
}

helper.close();
roomSrv.close();
store.close();
if (existsSync(VAR)) rmSync(VAR, { recursive: true, force: true });
console.log(failed ? `\ndraft-room-selftest FAILED (${failed} of ${checks} checks)` : `\ndraft-room-selftest OK (${checks} checks)`);
process.exit(failed ? 1 : 0);
