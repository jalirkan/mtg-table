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
//   7. the CLI: `coach-helper.mjs --draft-room` on free ports, /health and a room;
//   3c. D406/D407: a best of three -- each game scored from the bridge's result,
//      sideboarded decks between games, the loser chooses play or draw, a draw
//      played again, a game with no result not counted, two wins take the match
//      and the next decks start another; each seat's consent and its own review.
//   8. revoking (D408): the owner's door closes a room or gives the friend's seat a
//      new link; the old link is refused at once and after a restart; open streams
//      are told; the room listener and a tunnel's Host cannot do either.
//
// Its files are under var/draft-room-selftest/.  No network, no engine, no claude.

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { connect as netConnect, createServer as createNetServer } from 'node:net';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startHelper } from './coach-helper.mjs';
import { checkDeck } from './match-launcher.mjs';
import {
  applyPick, checkCreate, cleanText, clientKey, createRoomOwner, createRoomStore, cubeHash, dealGrid, legalLines, lineCards, newGrid, ownOrigin,
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
// Each golden cube's room hash, as ForgeCoach's WebCrypto computes it (UTF-8: names with diacritics too).
eq(Object.keys(golden.hashes ?? {}).sort(), Object.keys(golden.cubes).sort(), 'the golden file has a room hash for every cube');
for (const [k, cards] of Object.entries(golden.cubes)) eq(cubeHash(cards), golden.hashes?.[k], `${k}: cubeHash is the golden's`);
{
  // Evybaby's New Cube (Evan's): the golden's names are cubes/evybaby-cube-360.md's, and the room takes the list.
  const out = {};
  eq(checkCreate({ cubeId: 'evybaby', cubeTitle: "Evybaby's New Cube", cards: golden.cubes.evybaby }, out), null, 'a room of Evybaby\'s New Cube (360 names) is a valid create body');
  eq([out.cubeTitle, new Set(out.cards).size], ["Evybaby's New Cube", 360], 'its title and 360 different cards');
  try {
    const { parseCube } = await import('./cubelab/cube.ts');
    const doc = parseCube(readFileSync(join(ROOT, 'cubes', 'evybaby-cube-360.md'), 'utf8'));
    eq(doc.cards.map((c) => c.name), golden.cubes.evybaby, 'cubes/evybaby-cube-360.md lists the golden\'s 360 names, in order');
    eq(doc.warnings, [], 'cubes/evybaby-cube-360.md parses without a warning');
  } catch (e) {
    console.log(`  skip  tools/cubelab/cube.ts cannot be imported by this Node (${e.message.split('\n')[0]}); the hash above covers the names`);
  }
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
  ok(roomAdmit({ origin: 'https://pc.tail1234.ts.net', host: 'pc.tail1234.ts.net', origins: ORIGINS }).ok, 'a Tailscale Funnel page on its own host (D409): admitted');
  ok(!roomAdmit({ origin: 'https://other.tail1234.ts.net', host: 'pc.tail1234.ts.net', origins: ORIGINS }).ok, 'another ts.net page: refused');
  // Whom a limit counts (D409): tailscaled SETS X-Forwarded-For on a Funnel request; a funnelled client's own CF-Connecting-IP is never read.
  eq(clientKey('203.0.113.7', { 'cf-connecting-ip': '198.51.100.1' }), '203.0.113.7', 'clientKey: a remote peer is its address');
  eq(clientKey('127.0.0.1', { 'cf-connecting-ip': '198.51.100.1' }), 'cf:198.51.100.1', 'clientKey: cloudflared (loopback, CF-Connecting-IP)');
  eq(clientKey('::ffff:127.0.0.1', { 'tailscale-funnel-request': '?1', 'x-forwarded-for': '198.51.100.2', 'cf-connecting-ip': '198.51.100.99' }), 'ts:198.51.100.2', 'clientKey: Funnel -- X-Forwarded-For, and a forged CF-Connecting-IP ignored');
  eq(clientKey('127.0.0.1', { 'tailscale-funnel-request': '?1', 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }), 'ts:?', 'clientKey: Funnel with a malformed X-Forwarded-For: one shared bucket, never the client\'s pick');
  eq(clientKey('127.0.0.1', { 'x-forwarded-for': '198.51.100.3' }), '127.0.0.1', 'clientKey: X-Forwarded-For without the Funnel mark is not read');
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
            if (ev === 'revoked') s.revoked = true;   // D408
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
// D404: a stand-in for the match launcher's startTable -- what it was asked, and what it answers next.
const games = { calls: [], next: [], running: false };
const store = createRoomStore({ dir: join(VAR, 'rooms'), varRoot: join(ROOT, 'var'), log: (s) => logs.push(s),
  startGame: async (g) => { games.calls.push(g); await new Promise((r) => setTimeout(r, 20)); return games.next.shift() ?? { ok: true, matchId: `m${1000000000000 + games.calls.length}`, tablePort: 8646 }; },
  gameRunning: () => games.running });
const roomSrv = startRoomServer({ store, port: 0, origins: ORIGINS, log: (s) => logs.push(s), pollMs: 3_600_000 });
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
const funnelled = await call(R, `/room/${id}`, { token: T1, host: 'pc.tail1234.ts.net', origin: 'https://pc.tail1234.ts.net' });
eq(funnelled.status, 200, 'Tailscale Funnel (D409): its ts.net Host and https Origin with the token: 200');
eq((await call(R, `/room/${id}`, { host: 'pc.tail1234.ts.net', origin: 'https://pc.tail1234.ts.net' })).status, 403, 'Tailscale Funnel without a token: 403');

// D444: the whole cube, for a seat whose browser does not have it (the owner's own, my-<slug>).
{
  // a listener of its own over the same store, so these wrong links do not use up the main one's per-address limit
  const cubeSrv = startRoomServer({ store, port: 0, origins: ORIGINS, log: () => {}, pollMs: 3_600_000 });
  const C = `http://127.0.0.1:${await cubeSrv.listen()}`;
  const posted = [...cards, 'Cube Card 1'];   // the owner's POST order, one name twice
  const want = [...new Set(posted)];
  const sha = createHash('sha256').update(want.join('\n'), 'utf8').digest('hex');
  const fc = await call(C, `/room/${id}/cube`, { token: T1, origin: 'https://jalirkan.github.io' });
  eq([fc.status, fc.json?.ok, fc.json?.room, fc.json?.id, fc.json?.title, fc.json?.size], [200, true, id, 'synergy', 'Synergy Cube', 240], 'GET /room/<id>/cube with the friend\'s token: 200, the cube\'s id, title and size');
  eq(fc.json?.cards, want, 'the list is the owner\'s POST order, de-duplicated (the first of a repeat kept)');
  eq([fc.json?.hash, made.json.cube.hash], [sha, sha], 'its hash is the SHA-256 of those names joined by \\n, and the one POST /room answered');
  eq(Object.keys(fc.json ?? {}).sort(), ['cards', 'hash', 'id', 'ok', 'room', 'size', 'title'], 'the answer\'s keys, and nothing else (no token, no seed, no deal)');
  eq(fc.headers['access-control-allow-origin'], 'https://jalirkan.github.io', 'CORS echoed for an allowed Origin');
  eq((await call(C, `/room/${id}/cube`, { token: T0 })).json, fc.json, 'the owner\'s token gets the same list');
  eq((await call(C, `/room/${id}/cube`)).status, 403, 'no token: 403');
  eq((await call(C, `/room/${id}/cube`, { token: 'A'.repeat(22) })).status, 403, 'a wrong token: 403');
  eq((await call(C, `/room/rAAAAAAAA/cube`, { token: T1 })).status, 404, 'another room id: 404');
  eq((await call(C, `/room/${id}/cube`, { token: T1, origin: 'https://evil.example' })).status, 403, 'a foreign Origin with the right token: 403');
  eq((await call(C, `/room/${id}/cube`, { method: 'POST', token: T1, body: {} })).status, 405, 'POST to it: 405');
  eq((await call(C, `/room/${id}/cube/m1234567890123`, { token: T1 })).status, 404, 'a sub-path: 404');
  const st = await call(C, `/room/${id}`, { token: T1 });
  eq(Object.keys(st.json.cube).sort(), ['hash', 'id', 'size', 'title'], 'the state still carries the cube\'s hash and size only, never the list');
  ok(!readFileSync(join(VAR, 'rooms', 'rooms.json'), 'utf8').includes(T1), 'rooms.json holds the list and still no token');
  cubeSrv.close();
}

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
section('3b. D404: each seat hands in a deck from its own picks; both in, the room starts a game');
{
  const pk = [end0.seats[0].picks, end0.seats[1].picks];
  const deckOf = (picks, n = 23, extra = []) => ({ name: 'My Deck', main: [...picks.slice(0, n).map((c) => [1, c]), [40 - n, 'Plains'], ...extra] });
  const mem = createRoomStore({ dir: null });
  const mm = mem.create({ cubeId: 'c', cubeTitle: 'c', cards, name: 'A' });
  eq(mem.deck(mm.body.id, 0, deckOf(cards)).code, 'drafting', 'a deck before the draft is over: drafting (409)');
  const notMine = await call(R, `/room/${id}/deck`, { method: 'POST', token: T0, body: deckOf(pk[1]) });
  eq([notMine.status, notMine.json.code], [400, 'deck'], "a deck of the OTHER seat's picks: 400 deck");
  ok(/is not one of your picks/.test(notMine.json.message) && Array.isArray(notMine.json.problems), 'it says which card is not this seat\'s', notMine.json.message);
  const twice = await call(R, `/room/${id}/deck`, { method: 'POST', token: T0, body: { name: 'Twice', main: [[2, pk[0][0]], ...pk[0].slice(1, 22).map((c) => [1, c]), [17, 'Plains']] } });
  eq([twice.status, /2 in the deck, 1 in your picks/.test(twice.json.message)], [400, true], 'two copies of a card drafted once: 400', twice.json.message);
  const side = await call(R, `/room/${id}/deck`, { method: 'POST', token: T0, body: { ...deckOf(pk[0]), sideboard: [[1, pk[0][0]]] } });
  eq(side.status, 400, 'a card in the main deck AND the sideboard counts twice: 400');
  eq((await call(R, `/room/${id}/deck`, { method: 'POST', token: T0, body: { name: 'Short', main: [[1, pk[0][0]], [38, 'Plains']] } })).status, 400, '39 cards: 400');
  eq((await call(R, `/room/${id}/deck`, { method: 'POST', token: T0, body: { ...deckOf(pk[0]), cheat: true } })).status, 400, 'an unknown field: 400');
  eq((await call(R, `/room/${id}/deck`, { method: 'POST', token: T0, body: { name: 'Bad\nName', main: deckOf(pk[0]).main } })).status, 400, 'a deck name with a newline: 400');
  eq((await call(R, `/room/${id}/deck`, { method: 'POST', token: T0, raw: 'x'.repeat(17 * 1024), body: {} })).status, 413, 'a deck over 16 KB: 413');
  eq((await call(R, `/room/${id}/deck`, { method: 'POST', token: 'B'.repeat(22), body: deckOf(pk[0]) })).status, 403, 'a deck with a wrong token: 403');
  eq(games.calls.length, 0, 'nothing started yet');

  const p0 = stream(R, id, T0);
  const p1 = stream(R, id, T1);
  await Promise.all([p0.ready, p1.ready]);
  // Every basic on a line of its own and the rest of the picks in the sideboard: a body over 1 KB.
  const d0 = { name: 'My Deck', main: [...pk[0].slice(0, 23).map((c) => [1, c]), ...Array.from({ length: 17 }, () => [1, 'Plains'])], sideboard: pk[0].slice(23).map((c) => [1, c]) };
  const in0 = await call(R, `/room/${id}/deck`, { method: 'POST', token: T0, body: d0 });
  eq(in0.status, 200, "seat 0's deck from its own picks, the rest in its sideboard, 17 basics: 200");
  ok(JSON.stringify(d0).length > 1024, `a deck body over the seat routes' 1 KB is taken (${JSON.stringify(d0).length} bytes)`);
  eq([in0.json.decks[0], in0.json.decks[1]], [{ ready: true, name: 'My Deck', cards: 40 }, { ready: false, name: null, cards: null }], 'seat 0: its deck is in, the other not yet');
  eq(in0.json.yourDeck?.main?.length, 40, "seat 0's state carries its own list");
  await p1.until((x) => x.latest()?.decks?.[0]?.ready === true);
  const seen1 = p1.latest();
  eq([seen1.decks[0], seen1.yourDeck], [{ ready: true, name: 'My Deck', cards: 40 }, null], "seat 1 sees seat 0's deck by name and count only, and no list of its own yet");
  ok(!JSON.stringify(seen1).includes('"main"'), "nothing in seat 1's stream is seat 0's main deck");
  const d1 = { name: 'Their Deck', main: [...pk[1].slice(0, 24).map((c) => [1, c]), [16, 'Island']] };
  const in1 = await call(R, `/room/${id}/deck`, { method: 'POST', token: T1, body: d1 });
  eq([in1.status, in1.json.game?.state], [200, 'starting'], 'the second deck in: 200, and a game is starting');
  await p0.until((x) => x.latest()?.game?.state === 'ready');
  await p1.until((x) => x.latest()?.game?.state === 'ready');
  eq(games.calls.length, 1, 'the launcher was asked once');
  const g = games.calls[0];
  eq([g.roomId, g.names, g.decks.map((d) => [d.name, d.main.reduce((t, [n]) => t + n, 0)])], [id, ['Justin', end0.seats[1].name], [['My Deck', 40], ['Their Deck', 40]]], 'with the room, both names and both decks in seat order');
  // The launcher re-checks each deck with its own checkDeck: the room must hand it the request shape, not its normal form.
  eq(g.decks.map((d, i) => checkDeck(d, `seat ${i}`).problems), [[], []], "both decks pass the launcher's own checkDeck ([count, card] pairs)");
  const v0 = p0.latest().game;
  const v1 = p1.latest().game;
  ok(/^[A-Za-z0-9_-]{22}$/.test(v0.token ?? '') && /^[A-Za-z0-9_-]{22}$/.test(v1.token ?? '') && v0.token !== v1.token, 'each seat gets a seat token of its own for the game');
  const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
  eq([sha(v0.token), sha(v1.token)], g.digests, "the launcher got the two tokens' digests, in seat order, never the tokens");
  ok(!JSON.stringify(g).includes(v0.token) && !JSON.stringify(g).includes(v1.token), 'no token reached the launcher');
  ok(!JSON.stringify(p0.states).includes(v1.token) && !JSON.stringify(p1.states).includes(v0.token), "neither seat's stream ever carried the other's token");
  eq([v0.tablePort, v0.matchId, v0.n], [8646, g.digests && 'm1000000000001', 1], 'the table port and the match id, game 1');
  ok(T0 !== v0.token && T1 !== v1.token, 'a game token is not the room token');
  const diskNow = readFileSync(join(VAR, 'rooms', 'rooms.json'), 'utf8');
  ok(!diskNow.includes(v0.token) && !diskNow.includes(v1.token), 'rooms.json holds no game token (memory only)');
  ok(!JSON.stringify(logs).includes(v0.token) && !JSON.stringify(logs).includes(v1.token), 'no game token in the log');
  eq([p0.latest().decks[0].ready, p0.latest().decks[1].ready], [false, false], 'the decks are spent on this game: neither seat is ready for the next');

  games.running = true;
  const during = await call(R, `/room/${id}/deck`, { method: 'POST', token: T0, body: d0 });
  eq([during.status, during.json.code], [409, 'playing'], 'a deck while the game is played: 409 playing');
  eq(store.tablePort(), 8646, "while it is played, /ws on the room's port goes to its table port");
  games.running = false;
  eq(store.tablePort(), null, 'once it is over, /ws on the room port goes nowhere');
  games.next.push({ ok: false, status: 502, message: 'the engine did not start on these decks: boom' });
  await call(R, `/room/${id}/deck`, { method: 'POST', token: T0, body: d0 });
  await call(R, `/room/${id}/deck`, { method: 'POST', token: T1, body: d1 });
  await p0.until((x) => x.latest()?.game?.state === 'failed');
  eq([p0.latest().game.n, p0.latest().game.token, /boom/.test(p0.latest().game.error)], [2, null, true], 'a game that does not start: failed, with why, and no token');
  await call(R, `/room/${id}/deck`, { method: 'POST', token: T1, body: d1 });
  await call(R, `/room/${id}/deck`, { method: 'POST', token: T0, body: d0 });
  await p1.until((x) => x.latest()?.game?.state === 'ready' && x.latest()?.game?.n === 3);
  ok(p1.latest().game.token !== v1.token, 'a rematch: game 3 with fresh tokens');
  p0.close();
  p1.close();
  const reread = createRoomStore({ dir: join(VAR, 'rooms'), varRoot: join(ROOT, 'var') });
  reread.load();
  eq([reread.view(id, 0).game.state, reread.view(id, 0).game.token], ['ready', null], 'a helper restart keeps the game but not its tokens (the players keep theirs)');
  const bare = createRoomStore({ dir: null });
  const bm = bare.create({ cubeId: 'c', cubeTitle: 'c', cards, name: 'A' });
  const r2 = bare.view(bm.body.id, 0);
  eq([r2.decks, r2.yourDeck, r2.game], [[{ ready: false, name: null, cards: null }, { ready: false, name: null, cards: null }], null, null], 'a new room: no decks, no game');
}

// ---------------------------------------------------------------------------
section('3c. D406/D407: best of three, sideboarding, play or draw, consent, each seat\'s own review');
{
  const bo = { calls: [], results: new Map(), running: true, reviews: new Map(), asked: [] };
  const bs = createRoomStore({ dir: null, log: () => {},
    startGame: async (g) => { bo.calls.push(g); return { ok: true, matchId: `m${1790000000000 + bo.calls.length}`, tablePort: 8646 }; },
    gameRunning: () => bo.running,
    gameResult: (m) => bo.results.get(m) ?? null,
    reviewOf: (gid) => { bo.asked.push(gid); return bo.reviews.get(gid) ?? { state: 'waiting' }; },
    seatLog: (gid) => `{"v":1,"kind":"session","gameId":"${gid}"}\n` });
  const srv = startRoomServer({ store: bs, port: 0, origins: ORIGINS, log: () => {}, pollMs: 3_600_000 });
  const B = `http://127.0.0.1:${await srv.listen()}`;
  const badCreate = {};
  eq(checkCreate({ cubeId: 'c', cards, record: 'yes' }, badCreate), '"record" must be true or false', 'POST /room: "record" is true or false');
  const mk = bs.create((() => { const c = {}; checkCreate({ cubeId: 'c', cards, name: 'Justin', firstSeat: 0, record: true }, c); return c; })());
  const rid = mk.body.id;
  const [K0, K1] = [mk.body.token, mk.body.friendToken];
  bs.join(rid, 1, 'Sam');
  // The draft, through the store: each seat takes the first line it may.
  for (let v = bs.view(rid, 0); !v.done; v = bs.view(rid, 0)) {
    const line = [0, 1, 2, 3, 4, 5].find((l) => l !== v.firstLine && lineCards(v.slots, l).length > 0);
    bs.pick(rid, v.toAct, line, v.version);
  }
  const v0 = bs.view(rid, 0);
  eq([v0.match, v0.games, v0.record, bs.view(rid, 1).record], [null, [], { you: true, default: true }, { you: true, default: true }], 'a new room: no match yet; both seats recorded by default, the owner\'s choice');
  const off = await call(B, `/room/${rid}/record`, { method: 'POST', token: K1, body: { record: false } });
  eq([off.status, off.json.record, bs.view(rid, 0).record.you], [200, { you: false, default: true }, true], 'POST /record: seat 1 opts out; seat 0\'s own consent is untouched');
  eq((await call(B, `/room/${rid}/record`, { method: 'POST', token: K1, body: { record: 'no' } })).status, 400, 'POST /record with a non-boolean: 400');
  eq((await call(B, `/room/${rid}/record`, { method: 'POST', token: K1, body: { record: true, extra: 1 } })).status, 400, 'POST /record with another key: 400');
  ok(!JSON.stringify(bs.view(rid, 0)).includes('"record":[') && bs.view(rid, 0).record.you === true, 'a seat sees its own consent only, never the other\'s');
  const pk = [v0.seats[0].picks, v0.seats[1].picks];
  const deck = (p, from = 0) => ({ name: 'D', main: [...p.slice(from, from + 23).map((c) => [1, c]), [17, 'Plains']], sideboard: [...p.slice(0, from), ...p.slice(from + 23)].map((c) => [1, c]) });
  const until = async (pred, ms = 2000) => { const t = Date.now(); while (Date.now() - t < ms) { if (pred()) return true; await new Promise((r) => setTimeout(r, 10)); } return false; };
  const play = async (d0, d1) => {
    bs.deck(rid, 0, d0);
    bs.deck(rid, 1, d1);
    await until(() => bs.view(rid, 0).game?.state === 'ready');
    return bs.view(rid, 0).game.matchId;
  };
  eq(bs.deck(rid, 0, { ...deck(pk[0]), record: 'yes' }).code, 'deck', 'a deck whose "record" is not a boolean: refused');
  // Game 1.
  const m1 = await play(deck(pk[0]), deck(pk[1]));
  eq([bo.calls[0].match, bo.calls[0].chooser, bo.calls[0].record], [{ bestOf: 3, game: 1, wins: [0, 0] }, undefined, [true, false]], 'game 1: a best of three from 0-0, Forge\'s coin toss, each seat\'s consent');
  eq(bs.view(rid, 0).match, { n: 1, bestOf: 3, wins: [0, 0], over: false, winner: null, next: { game: 1, chooser: null, newMatch: false } }, 'the match is on, 0-0');
  eq(bs.deck(rid, 0, deck(pk[0])).code, 'playing', 'a deck while game 1 is played (no result yet): 409 playing');
  bs.poll();
  eq(bs.view(rid, 0).game.result, null, 'no result.json yet: the game goes on');
  bo.results.set(m1, { winnerSeat: 1, draw: false, reason: 'Conceded', finished: true });
  const ver = bs.view(rid, 0).version;
  bs.poll();
  const a1 = bs.view(rid, 0);
  eq([a1.game.result, a1.match.wins, a1.match.next, a1.version > ver], [{ winner: 1, reason: 'Conceded' }, [0, 1], { game: 2, chooser: 0, newMatch: false }, true], 'a concede is a loss: 0-1, game 2 next, seat 0 (the loser) chooses play or draw');
  eq(a1.games, [{ match: 1, game: 1, matchId: m1, winner: 1, reason: 'Conceded', recorded: true, review: 'waiting' }], "seat 0's game list: game 1, recorded, its review not there yet");
  eq(bs.view(rid, 1).games[0].recorded + '/' + bs.view(rid, 1).games[0].review, 'false/off', "seat 1 opted out: not recorded, no review");
  ok(!bo.asked.some((g) => /seat1$/.test(g)), 'the review of a seat that opted out is never even looked for');
  // Sideboarding: seat 0 hands in a different 40 of its own picks while the engine still lingers on the final board.
  const sb = deck(pk[0], 2);
  ok(JSON.stringify(sb.main) !== JSON.stringify(deck(pk[0]).main), 'seat 0 sideboards: another main deck from its own picks');
  eq(bs.deck(rid, 0, { ...sb, main: [...sb.main.slice(0, 22), [1, pk[1][0]], ...sb.main.slice(23)] }).code, 'deck', "sideboarding in a card of the other seat's picks: refused (D404's check)");
  const m2 = await play(sb, deck(pk[1]));
  eq([bo.calls[1].match, bo.calls[1].chooser, bo.calls[1].decks[0].main], [{ bestOf: 3, game: 2, wins: [0, 1] }, 0, sb.main], 'game 2: the sideboarded deck, 0-1, seat 0 chooses');
  bo.results.set(m2, { winnerSeat: null, draw: true, reason: 'Draw', finished: true });
  bs.poll();
  eq([bs.view(rid, 0).match.wins, bs.view(rid, 0).match.next], [[0, 1], { game: 2, chooser: null, newMatch: false }], 'a draw counts for nobody: game 2 again, a coin toss');
  const m3 = await play(sb, deck(pk[1]));
  eq([bo.calls[2].match.game, bo.calls[2].chooser], [2, undefined], 'game 2 replayed, no chooser after a draw');
  bo.results.set(m3, { winnerSeat: 0, draw: false, reason: 'AllOpponentsLost', finished: true });
  bs.poll();
  eq([bs.view(rid, 1).match.wins, bs.view(rid, 1).match.next], [[1, 1], { game: 3, chooser: 1, newMatch: false }], '1-1: game 3, seat 1 chooses');
  const m4 = await play(sb, deck(pk[1]));
  bo.running = false;
  bs.poll();
  const lost = bs.view(rid, 0);
  eq([lost.game.state, /without a result/.test(lost.game.error), lost.match.wins, lost.match.next.game], ['failed', true, [1, 1], 3], 'a game whose engine stopped with no result does not count: game 3 again');
  ok(m4 && !lost.games.some((g) => g.matchId === m4), 'and it is not in the game list');
  bo.running = true;
  const m5 = await play(sb, deck(pk[1]));
  eq([bo.calls[4].match, bo.calls[4].chooser], [{ bestOf: 3, game: 3, wins: [1, 1] }, 1], 'game 3 again, 1-1, seat 1 still chooses');
  bo.results.set(m5, { winnerSeat: 0, draw: false, reason: 'AllOpponentsLost', finished: true });
  bs.poll();
  const fin = bs.view(rid, 1);
  eq([fin.match.over, fin.match.winner, fin.match.wins, fin.match.next], [true, 0, [2, 1], { game: 1, chooser: null, newMatch: true }], 'two wins take the match: seat 0, 2-1');
  eq(fin.games.map((g) => [g.match, g.game, g.winner]), [[1, 1, 1], [1, 2, null], [1, 2, 0], [1, 3, 0]], 'every finished game, a draw included, in order');
  // Reviews: seat 0's own, never seat 1's.
  bo.reviews.set(`friend-${m1}-seat0`, { state: 'running', stage: 'triage' });
  bs.poll();
  eq(bs.view(rid, 0).games[0].review, 'running', "the room follows seat 0's review of game 1");
  bo.reviews.set(`friend-${m1}-seat0`, { state: 'done', report: { v: 1, kind: 'game-review', gameId: `friend-${m1}-seat0`, decisions: [] } });
  const st0 = stream(B, rid, K0);
  await st0.ready;
  bs.poll();
  await st0.until((x) => x.latest()?.games?.[0]?.review === 'done');
  ok(true, "seat 0's stream is told when its review is done");
  const r0 = await call(B, `/room/${rid}/review/${m1}`, { token: K0 });
  eq([r0.status, r0.json.state, r0.json.game, r0.json.report?.gameId], [200, 'done', 1, `friend-${m1}-seat0`], 'GET /review/<matchId>: seat 0 gets its own report');
  const r1 = await call(B, `/room/${rid}/review/${m1}`, { token: K1 });
  eq([r1.status, r1.json.state, r1.json.report], [200, 'off', undefined], 'seat 1 (opted out) gets no review -- and never seat 0\'s');
  ok(!r1.text.includes('game-review'), "nothing of seat 0's report in seat 1's answer");
  eq((await call(B, `/room/${rid}/review/m1234567890123`, { token: K0 })).status, 404, 'a game that is not this room\'s: 404');
  const lg0 = await call(B, `/room/${rid}/log/${m1}`, { token: K0 });
  eq([lg0.status, lg0.text.trim()], [200, `{"v":1,"kind":"session","gameId":"friend-${m1}-seat0"}`], "GET /log/<matchId>: seat 0 gets its own seat's log, the frames its review numbers");
  eq((await call(B, `/room/${rid}/log/${m1}`, { token: K1 })).status, 404, "seat 1 (not recorded) gets no log -- never seat 0's");
  eq((await call(B, `/room/${rid}/log/m1234567890123`, { token: K0 })).status, 404, 'the log of a game that is not this room\'s: 404');
  eq((await call(B, `/room/${rid}/review`, { token: K0 })).status, 404, '/review without a game: 404');
  eq((await call(B, `/room/${rid}/review/${m1}`, { token: 'B'.repeat(22) })).status, 403, 'a review with a wrong token: 403');
  eq((await call(B, `/room/${rid}/review/${m1}`, { method: 'POST', token: K0, body: {} })).status, 405, 'POST to a review: 405');
  st0.close();
  // The next pair of decks after a finished match: a new match.
  bs.record(rid, 1, true);
  await play(sb, deck(pk[1]));
  eq([bo.calls[5].match, bo.calls[5].record, bs.view(rid, 0).match.n, bs.view(rid, 0).match.wins], [{ bestOf: 3, game: 1, wins: [0, 0] }, [true, true], 2, [0, 0]], 'decks after the match: match 2, game 1, 0-0, with seat 1\'s new consent');
  srv.close();
}

// ---------------------------------------------------------------------------
section('4. what lasts: a second store over the same folder; expiry');
{
  let t = Date.now();
  const st2 = createRoomStore({ dir: join(VAR, 'rooms'), varRoot: join(ROOT, 'var'), now: () => t });
  eq(st2.load(), 1, 'a restarted helper reads the room back');
  eq([st2.auth(id, T0), st2.auth(id, T1), st2.auth(id, 'B'.repeat(22))], [0, 1, 'token'], 'both links still work after the restart; a wrong one does not');
  eq(st2.view(id, 0).log, end0.log, 'the draft is all there');
  eq(st2.cube(id)?.cards, [...new Set([...cards, 'Cube Card 1'])], 'D444: the cube\'s list too');
  {
    // a room from before D444: rooms.json has no list for it -- 404 {code:"cube"}, nothing made up
    const oldDir = join(VAR, 'rooms-before-d444');
    mkdirSync(oldDir, { recursive: true });
    const doc = JSON.parse(readFileSync(join(VAR, 'rooms', 'rooms.json'), 'utf8'));
    for (const r of doc.rooms) delete r.cubeCards;
    writeFileSync(join(oldDir, 'rooms.json'), JSON.stringify(doc));
    const old = createRoomStore({ dir: oldDir, varRoot: join(ROOT, 'var'), now: () => t });
    eq(old.load(), 1, 'a rooms.json from before D444 still loads');
    eq(old.cube(id), { missing: true }, 'its room has no list to give');
    const oldSrv = startRoomServer({ store: old, port: 0, origins: ORIGINS, log: () => {}, pollMs: 3_600_000 });
    const op = await oldSrv.listen();
    const oc = await call(`http://127.0.0.1:${op}`, `/room/${id}/cube`, { token: T1 });
    eq([oc.status, oc.json?.code], [404, 'cube'], 'GET .../cube on it: 404 {code:"cube"}');
    eq((await call(`http://127.0.0.1:${op}`, `/room/${id}`, { token: T1 })).status, 200, 'and the room itself still works');
    await oldSrv.close();
  }
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
section('6b. the game seat on the room\'s own origin: /ws passed through to the table port (D404, D405)');
{
  // A stand-in for the table port: records each upgrade's request head, answers 101, then echoes.
  const heads = [];
  const table = createNetServer((c) => {
    let buf = '';
    const onData = (d) => {
      buf += d.toString('latin1');
      const i = buf.indexOf('\r\n\r\n');
      if (i < 0) return;
      c.off('data', onData);
      heads.push(buf.slice(0, i));
      c.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');
      const rest = buf.slice(i + 4);
      if (rest) c.write(rest);
      c.pipe(c);
    };
    c.on('data', onData);
    c.on('error', () => {});
  });
  await new Promise((r) => table.listen(0, '127.0.0.1', r));
  const tport = table.address().port;
  const st = createRoomStore({ dir: null });
  const up = (srvPort, target, extra = '') => new Promise((res) => {
    const c = netConnect(srvPort, '127.0.0.1');
    let got = '';
    c.on('connect', () => c.write(`GET ${target} HTTP/1.1\r\nHost: 127.0.0.1:${srvPort}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nOrigin: http://127.0.0.1:${srvPort}\r\n${extra}\r\n`));
    c.on('data', (d) => {
      got += d.toString('latin1');
      if (/^HTTP\/1\.1 101/.test(got) && !got.includes('ping')) { c.write('ping'); return; }
      if (got.includes('ping') || /^HTTP\/1\.1 [45]/.test(got)) { c.destroy(); res(got); }
    });
    c.on('error', () => res(got));
    c.on('close', () => res(got));
  });
  const srv = startRoomServer({ store: st, port: 0, origins: ORIGINS, log: () => {}, tablePort: tport });
  const sp = await srv.listen();
  const a = await up(sp, '/ws?seat=AbCdEfGhIjKlMnOpQrStUv');
  ok(/^HTTP\/1\.1 101/.test(a) && a.endsWith('ping'), '/ws upgrades through the room port, and bytes flow both ways');
  ok(heads[0]?.startsWith('GET /ws?seat=AbCdEfGhIjKlMnOpQrStUv HTTP/1.1') && heads[0].includes(`Host: 127.0.0.1:${sp}`) && heads[0].includes(`Origin: http://127.0.0.1:${sp}`),
    'the table gets the request as sent: the token, the page\'s Host and Origin (it checks them itself)');
  ok(/\r\nCF-Connecting-IP: 127\.0\.0\.1$/.test(heads[0] ?? ''), 'the client\'s address goes along as CF-Connecting-IP (the table\'s wrong-token limit keys on it)');
  await up(sp, '/ws?seat=x', 'CF-Connecting-IP: 198.51.100.9\r\n');
  ok((heads[1] ?? '').match(/CF-Connecting-IP/gi)?.length === 1 && heads[1].includes('CF-Connecting-IP: 198.51.100.9'), 'a loopback peer\'s own CF-Connecting-IP (a tunnel daemon) is kept, once');
  // D409: through Tailscale Funnel -- a ts.net Host and Origin pass as sent; the client named is X-Forwarded-For, not its own CF header.
  await up(sp, '/ws?seat=x', 'Tailscale-Funnel-Request: ?1\r\nX-Forwarded-For: 198.51.100.44\r\nCF-Connecting-IP: 198.51.100.99\r\n');
  ok((heads[2] ?? '').match(/CF-Connecting-IP/gi)?.length === 1 && /\r\nCF-Connecting-IP: 198\.51\.100\.44$/.test(heads[2] ?? ''), 'Funnel: the table is told X-Forwarded-For\'s client, once; the client\'s own CF-Connecting-IP is dropped');
  ok(/^HTTP\/1\.1 404/.test(await up(sp, '/observe')) && heads.length === 3, 'any other upgrade path: 404, nothing reaches the table');
  srv.close();
  table.close();
  const down = startRoomServer({ store: st, port: 0, origins: ORIGINS, log: () => {}, tablePort: tport });
  ok(/^HTTP\/1\.1 502/.test(await up(await down.listen(), '/ws?seat=x')), 'the table not answering: 502');
  down.close();
  const idle = startRoomServer({ store: st, port: 0, origins: ORIGINS, log: () => {} });
  ok(/^HTTP\/1\.1 404/.test(await up(await idle.listen(), '/ws?seat=x')), 'no game being played here: /ws is 404');
  idle.close();
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

// ---------------------------------------------------------------------------
section('8. revoking (D408): close a room, or a new link for the friend, on the owner\'s door only');
{
  const dir = join(VAR, 'revoke');
  const rlog = [];
  const st = createRoomStore({ dir, varRoot: join(ROOT, 'var'), log: (x) => rlog.push(x) });
  const srv = startRoomServer({ store: st, port: 0, origins: ORIGINS, log: () => {} });
  const rport = await srv.listen();
  const own = createRoomOwner({ store: st, roomPort: rport, lan: false, publicUrl: 'https://play.example.org' });
  const hlp = startHelper({ port: 0, lan: false, token: '', wsPort: 8642, origins: ORIGINS, queueMax: 1, timeoutS: 5, room: own, review: null, evaluator: null, log: () => {} });
  const HP = `http://127.0.0.1:${await hlp.listen()}`;
  const RP = `http://127.0.0.1:${rport}`;
  eq((await call(HP, '/health')).json.roomRevoke, 1, '/health: roomRevoke 1');
  const a = (await call(HP, '/room', { method: 'POST', body: { cubeId: 'synergy', cards, name: 'Justin', firstSeat: 0 } })).json;
  const b = (await call(HP, '/room', { method: 'POST', body: { cubeId: 'synergy', cards, name: 'Justin' } })).json;
  eq((await call(RP, `/room/${a.id}/join`, { method: 'POST', token: a.friendToken, body: { name: 'Sam' } })).status, 200, 'the friend joins room A');
  const f1 = stream(RP, a.id, a.friendToken);
  const o1 = stream(RP, a.id, a.token);
  await f1.ready;
  await o1.ready;
  // The doors that must not revoke.
  eq((await call(RP, `/room/${a.id}/friend-link`, { method: 'POST', token: a.token, body: {} })).status, 404, 'the room listener has no friend-link route, even for the owner\'s seat token');
  eq((await call(RP, `/room/${a.id}/close`, { method: 'POST', token: a.token, body: {} })).status, 404, 'nor a close route');
  eq((await call(HP, `/room/${a.id}/friend-link`, { method: 'POST', host: 'play.example.org', body: {} })).status, 403, 'a tunnel\'s Host on the helper: 403 (D386)');
  eq((await call(HP, `/room/${a.id}/close`, { method: 'POST', origin: 'https://evil.example', body: {} })).status, 403, 'a foreign Origin on the helper: 403');
  eq((await call(HP, `/room/${a.id}/close`)).status, 405, 'GET close: 405 (a GET never changes anything)');
  eq((await call(HP, '/room/rAAAAAAAA/friend-link', { method: 'POST', body: {} })).status, 404, 'an unknown room: 404');
  eq((await call(HP, '/room/../x/close', { method: 'POST', body: {} })).status, 404, 'a malformed id: 404');
  // A new link for the friend.
  const nl = await call(HP, `/room/${a.id}/friend-link`, { method: 'POST', body: {} });
  ok(nl.status === 200 && /^[A-Za-z0-9_-]{22}$/.test(nl.json.friendToken) && nl.json.friendToken !== a.friendToken && nl.json.seat === 1, 'POST /room/<id>/friend-link: 200, a new 128-bit token for seat 1');
  eq([nl.json.bases.public, nl.json.roomPort], ['https://play.example.org', rport], 'with the bases, so the page can show the new links (Over the internet included)');
  eq([(await call(RP, `/room/${a.id}`, { token: a.friendToken })).status, (await call(RP, `/room/${a.id}`, { token: nl.json.friendToken })).json?.you], [403, 1], 'the old link: 403 at once; the new one is seat 2');
  const kept = (await call(RP, `/room/${a.id}`, { token: nl.json.friendToken })).json;
  eq([kept.seats[1].name, kept.seats[1].joined], ['Sam', true], 'the seat keeps its name (and picks): only the key changed');
  eq((await call(RP, `/room/${a.id}`, { token: a.token })).status, 200, 'the owner\'s own link still works');
  await f1.until((x) => x.closed);
  ok(f1.revoked && !f1.gone, 'the friend\'s open stream on the old link is ended with `revoked`');
  ok(!o1.closed, 'the owner\'s stream stays open');
  const disk = readFileSync(join(dir, 'rooms.json'), 'utf8');
  ok(!disk.includes(nl.json.friendToken) && !disk.includes(a.friendToken), 'rooms.json holds neither token in clear');
  const re = createRoomStore({ dir, varRoot: join(ROOT, 'var') });
  eq(re.load(), 2, 'a restarted helper reads both rooms back');
  eq([re.auth(a.id, a.friendToken), re.auth(a.id, nl.json.friendToken), re.auth(a.id, a.token)], ['token', 1, 0], 'after a restart the old link is still refused, the new one and the owner\'s work');
  // Closing a room.
  const cl = await call(HP, `/room/${a.id}/close`, { method: 'POST', body: {} });
  eq([cl.status, cl.json.closed], [200, true], 'POST /room/<id>/close: 200');
  await o1.until((x) => x.closed);
  ok(o1.gone, 'the owner\'s open stream is told the room is gone');
  eq([(await call(RP, `/room/${a.id}`, { token: a.token })).status, (await call(RP, `/room/${a.id}`, { token: nl.json.friendToken })).status], [404, 404], 'both links: 404 gone');
  eq((await call(HP, `/room/${a.id}/close`, { method: 'POST', body: {} })).status, 404, 'closing it again: 404');
  eq((await call(HP, '/room')).json.rooms.map((r) => r.id), [b.id], 'GET /room lists only the other room');
  eq((await call(RP, `/room/${b.id}`, { token: b.friendToken })).status, 200, 'the other room is untouched');
  const re2 = createRoomStore({ dir, varRoot: join(ROOT, 'var') });
  eq([re2.load(), re2.auth(a.id, a.token), re2.auth(b.id, b.token)], [1, 'gone', 0], 'after a restart the closed room stays closed');
  ok(!JSON.stringify(rlog).includes(nl.json.friendToken), 'no token in the log');
  // Off by default: a helper with no room has neither route.
  const bare = startHelper({ port: 0, lan: false, token: '', wsPort: 8642, origins: ORIGINS, queueMax: 1, timeoutS: 5, room: null, review: null, evaluator: null, log: () => {} });
  const BP = `http://127.0.0.1:${await bare.listen()}`;
  eq((await call(BP, `/room/${b.id}/close`, { method: 'POST', body: {} })).status, 404, 'without --draft-room: 404');
  ok(!('roomRevoke' in (await call(BP, '/health')).json), 'without --draft-room: no roomRevoke key');
  bare.close();
  hlp.close();
  srv.close();
  st.close();
}

helper.close();
roomSrv.close();
store.close();
if (existsSync(VAR)) rmSync(VAR, { recursive: true, force: true });
console.log(failed ? `\ndraft-room-selftest FAILED (${failed} of ${checks} checks)` : `\ndraft-room-selftest OK (${checks} checks)`);
process.exit(failed ? 1 : 0);
