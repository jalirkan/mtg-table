// mtg-table — tools/draft-room.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// THE DRAFT ROOM (D400): two people grid-draft a cube against each other from
// their own browsers, the owner's machine holding the draft.  ForgeCoach's
// "Draft with a friend" is the client; docs/draft-room.md is the copyable wire
// format.  The coach helper (tools/coach-helper.mjs --draft-room, which
// `scripts/play.sh --draft-room` passes) runs it: the owner CREATES a room
// through the helper's own door (POST /room on 8643: loopback with a loopback
// Host, or the --lan pairing token -- the owner's door, never tunnelled, D386),
// and both players then use THE ROOM LISTENER, a port of its own (config.json
// `roomPort`, 8644), whose every room route needs that seat's token.
//
// THE RULES are ForgeCoach's src/draft/draft.ts Grid draft, which is the cube
// lab's (tools/cubelab/draft.ts): the cube's names, de-duplicated in document
// order, shuffled by rng(seed, 'grid') (sfc32 through splitmix32, ported below
// from tools/cubelab/rng.ts), the first 9 x grids cards dealt into grids of 3x3
// (grids = min(18, floor(cards / 9))).  For each grid the first drafter takes a
// row or a column; the second takes another line that still has cards (3 if
// parallel, 2 if it crosses the first); the rest is discarded.  The first pick
// alternates grid by grid (`firstSeat` opens grid 1).  Every card is face up:
// both seats see the same state, the other seat's picks included.  The future
// grids (and the seed) are not sent until the draft is over -- as at a paper
// table, a grid is turned up when it is drafted.  fixtures/draft-room/
// grid-golden.json is written by ForgeCoach's draft.ts and this module must
// reproduce every case of it (tools/draft-room-selftest.mjs).
//
// THE ROOM LISTENER'S DOOR -- never loopback alone:
//
//   - every /room/<id>... request needs the seat's token in the header
//     X-Room-Token (never the URL: a header is not logged, not in history, not a
//     Referer).  A loopback peer gets no exemption: a tunnel daemon (cloudflared)
//     connects from 127.0.0.1 too (docs/security/endpoints.md, headline risk 1).
//     Tokens are 128 bits, stored only as SHA-256 digests, compared with
//     crypto.timingSafeEqual.  An unknown or expired room is 404 {code:"gone"};
//     a wrong token is 403 {code:"token"}; both count as a failure, and a peer
//     with too many failures in a minute is 429 for that minute;
//   - Origin: absent (a script; the token is the lock), or on config.json's
//     wsAllowedOrigins, or the page's own (http(s)://<Host>), or a --room-origin;
//     anything else is 403 before the token is read;
//   - no Host check: the token is the lock, and a tunnel's name must pass;
//   - binds 127.0.0.1, or 0.0.0.0 with --lan (a friend on the home network);
//   - rate limits: per seat once its token is known (120 requests a minute, a burst
//     of 60), wrong links and the site per address (a tunnel daemon is loopback,
//     so a loopback peer's CF-Connecting-IP names the address when it is there),
//     and all requests together (1200 a minute) -- so one player can never use up
//     the other's; at most 3 streams per seat and 32 in all; bodies at most 1 KB;
//   - the site (ForgeCoach's public build, --room-site-dir) is the one thing
//     served without a token: GET/HEAD, a path that cannot leave the folder.
//
// THE ROUTES (state is the seat's view, below):
//
//   On the coach helper (8643, the owner's door):
//   POST /room  {"cubeId": "synergy", "cubeTitle"?: string, "cards": [names, document order],
//                "name"?: string, "firstSeat"?: 0|1}            (body at most 256 KB)
//               -> 201 {ok, id, seat: 0, token, friendToken, roomPort, bases: {local, lan[], public},
//                       cube: {id, title, hash, size}, expiresAt}
//               400 bad body, 429 {code:"full"} (16 live rooms)
//   GET  /room  -> 200 {ok, rooms: [{id, cubeId, joined: [bool, bool], grid, done, expiresAt}]}
//
//   On the room listener (8644):
//   GET  /room/<id>          -> 200 state
//   GET  /room/<id>/events   -> 200 text/event-stream: `event: state` + `data: <state>` now and
//                               after every change; `: ping` every 15 s; `event: gone` when it expires
//   POST /room/<id>/join     {"name"?: string}  -> 200 state (idempotent; renames)
//   POST /room/<id>/pick     {"line": 0-5, "expect": <state.version>}  -> 200 state, or
//                               409 {code:"stale"|"turn"|"waiting"|"done", state}, 400 {code:"illegal"}
//   OPTIONS                  preflight (Allow-Private-Network, X-Room-Token)
//   GET  /, /assets/...      the site, when --room-site-dir is given (else 404)
//
//   state = {v:1, id, version, you, format:"grid", cube:{id,title,hash,size}, grids, g, slots[9],
//            firstLine, firstSeat, toAct (0|1|null), done, seats:[{name, joined, online, picks}x2],
//            log:[{n, seat, grid, line, cards}], createdAt, expiresAt, seed (null until done)}
//
// ROOMS LIVE IN MEMORY AND ON DISK: <room dir>/rooms.json (default var/draft-room/,
// whose real path must stay under var/), mode 600, token DIGESTS only, rewritten
// after every change, read back at start -- a helper restart keeps every draft and
// every link.  A room expires 24 h after its last join or pick, and 72 h after it
// was made, whichever is first.
//
// PHASE 2 (not built): the room already knows both seats and both tokens, so each
// player's deck can be handed to the room (privately, by seat) and the room can
// hand both to the bridge with a seat token each; see docs/draft-room.md.

import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';

export const ROOM_VERSION = 1;
export const DEFAULT_ROOM_PORT = 8644;
export const GRID_ROUNDS = 18;
export const MAX_ROOMS = 16;
export const MAX_CREATE_BODY = 256 * 1024;
export const MAX_SEAT_BODY = 1024;
export const MAX_CARDS = 2000;
export const MAX_CARD_NAME = 150;
export const MAX_SEAT_NAME = 24;
export const IDLE_MS = 24 * 3600_000;
export const LIFE_MS = 72 * 3600_000;
export const PING_MS = 15_000;
export const TOKEN_HEADER = 'x-room-token';
export const ROOM_ID = /^r[A-Za-z0-9_-]{8}$/;
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{22,64}$/;
const CUBE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;

// ---------------------------------------------------------------------------
// The rules: tools/cubelab/rng.ts and ForgeCoach's draft.ts Grid, in plain JS.
// ---------------------------------------------------------------------------

function splitmix32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x9e3779b9) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 16), 0x21f0aaad);
    t = Math.imul(t ^ (t >>> 15), 0x735a2d97);
    return (t ^ (t >>> 15)) >>> 0;
  };
}

/** tools/cubelab/rng.ts `rng`, line for line: sfc32 seeded through splitmix32, with a stream name. */
export function rng(seed, stream = '') {
  let h = Math.floor(seed) >>> 0;
  for (let i = 0; i < stream.length; i++) h = Math.imul(h ^ stream.charCodeAt(i), 0x01000193) >>> 0;
  const sm = splitmix32(h ^ Math.floor(seed / 0x100000000));
  let a = sm(), b = sm(), c = sm(), d = sm();
  const next = () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (((a + b) >>> 0) + d) >>> 0;
    d = (d + 1) >>> 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) >>> 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) >>> 0;
    return t / 4294967296;
  };
  for (let i = 0; i < 12; i++) next();
  return { next, int: (n) => Math.floor(next() * n) };
}

/** Fisher-Yates, in place, and returned (rng.ts `shuffle`). */
export function shuffle(arr, r) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = r.int(i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/** Rows 0-2, columns 3-5 (draft.ts LINES). */
export const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8]];

/** draft.ts newDraft for format 'grid': the dealt cards and the number of grids. */
export function dealGrid(cards, seed, rounds = GRID_ROUNDS) {
  const deck = shuffle([...new Set(cards)], rng(seed, 'grid'));
  const grids = Math.min(rounds, Math.floor(deck.length / 9));
  return { dealt: deck.slice(0, grids * 9), grids };
}

export const lineCards = (slots, l) => (LINES[l] ?? []).map((i) => slots[i]).filter((c) => c != null);

/** The seat that picks first in grid g (0-based). */
export const gridFirst = (room) => ((room.g % 2 === 0) ? room.firstSeat : 1 - room.firstSeat);

/** Who picks now: 0, 1, or null when the draft is over. */
export const toAct = (room) => (room.done ? null : room.firstLine === null ? gridFirst(room) : 1 - gridFirst(room));

/** The lines that may be taken now (draft.ts legalLines). */
export function legalLines(room) {
  const out = [];
  for (let l = 0; l < 6; l++) if (l !== room.firstLine && lineCards(room.slots, l).length > 0) out.push(l);
  return out;
}

/** A new draft's state (no seats, no ids): the grid part of a room. */
export function newGrid({ cards, seed, firstSeat, rounds = GRID_ROUNDS }) {
  const { dealt, grids } = dealGrid(cards, seed, rounds);
  return { seed, firstSeat, grids, dealt, g: 0, slots: dealt.slice(0, 9), firstLine: null, done: grids === 0, log: [], picks: [[], []] };
}

/** Seat `seat` takes line `line`; mutates `room`.  Throws {code} on a wrong turn or an illegal line. */
export function applyPick(room, seat, line) {
  if (room.done) throw Object.assign(new Error('the draft is over'), { code: 'done' });
  if (toAct(room) !== seat) throw Object.assign(new Error('it is not your pick'), { code: 'turn' });
  if (!Number.isInteger(line) || !legalLines(room).includes(line)) throw Object.assign(new Error('that line cannot be taken'), { code: 'illegal' });
  const cards = lineCards(room.slots, line);
  room.picks[seat].push(...cards);
  for (const i of LINES[line]) room.slots[i] = null;
  room.log.push({ n: room.log.length + 1, seat, grid: room.g + 1, line, cards });
  if (room.firstLine === null) room.firstLine = line;
  else {
    room.g++;
    room.firstLine = null;
    if (room.g >= room.grids) {
      room.done = true;
      room.slots = Array(9).fill(null);
    } else room.slots = room.dealt.slice(room.g * 9, room.g * 9 + 9);
  }
  return cards;
}

// ---------------------------------------------------------------------------
// Checks on what a request carries.
// ---------------------------------------------------------------------------

/** A display name: trimmed, control characters refused, at most `max` characters; null if unusable. */
export function cleanText(s, max) {
  if (typeof s !== 'string' || CONTROL.test(s)) return null;
  const t = s.trim().replace(/\s+/g, ' ');
  return t.length >= 1 && [...t].length <= max ? t : null;
}

/** Why a POST /room body is not a room, or null; `out` gets the cleaned fields. */
export function checkCreate(body, out = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'the body must be a JSON object';
  for (const k of Object.keys(body)) if (!['cubeId', 'cubeTitle', 'cards', 'name', 'firstSeat'].includes(k)) return `unknown field "${k}"`;
  if (typeof body.cubeId !== 'string' || !CUBE_ID.test(body.cubeId)) return '"cubeId" must be a cube id (lowercase letters, digits, dashes)';
  out.cubeId = body.cubeId;
  out.cubeTitle = body.cubeTitle === undefined ? body.cubeId : cleanText(body.cubeTitle, 80);
  if (out.cubeTitle === null) return '"cubeTitle" must be a short line of text';
  if (!Array.isArray(body.cards) || body.cards.length > MAX_CARDS) return `"cards" must be an array of at most ${MAX_CARDS} card names`;
  for (const [i, c] of body.cards.entries()) {
    if (typeof c !== 'string' || c.length < 1 || c.length > MAX_CARD_NAME || CONTROL.test(c) || c.trim() !== c) return `card ${i + 1} is not a card name`;
  }
  out.cards = body.cards;
  if (new Set(body.cards).size < 9) return 'a grid draft needs at least 9 different cards';
  out.name = body.name === undefined ? 'Player 1' : cleanText(body.name, MAX_SEAT_NAME);
  if (out.name === null) return `"name" must be 1-${MAX_SEAT_NAME} characters`;
  if (body.firstSeat !== undefined && body.firstSeat !== 0 && body.firstSeat !== 1) return '"firstSeat" must be 0 or 1';
  out.firstSeat = body.firstSeat;
  return null;
}

/** SHA-256 of the card list as the room deals from it (de-duplicated, '\n'-joined): both clients can check their copy of the cube. */
export function cubeHash(cards) {
  return createHash('sha256').update([...new Set(cards)].join('\n'), 'utf8').digest('hex');
}

const digest = (s) => createHash('sha256').update(String(s), 'utf8').digest();
const newToken = () => randomBytes(16).toString('base64url');
const newRoomId = () => `r${randomBytes(6).toString('base64url')}`;

function tokenIs(given, hashHex) {
  if (typeof given !== 'string' || !TOKEN_SHAPE.test(given) || typeof hashHex !== 'string') return false;
  const want = Buffer.from(hashHex, 'hex');
  const got = digest(given);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** The path is a folder whose REAL path is inside `root`'s (match-launcher.mjs realInside, for a folder that may not exist yet). */
function realUnder(root, p) {
  try {
    const r = realpathSync(root);
    let q = resolve(p);
    const tail = [];
    while (!existsSync(q)) { tail.unshift(q.slice(q.lastIndexOf(sep) + 1)); q = q.slice(0, q.lastIndexOf(sep)) || sep; }
    const real = join(realpathSync(q), ...tail);
    return real === r || real.startsWith(r + sep);
  } catch { return false; }
}

// ---------------------------------------------------------------------------
// The store: every room, its seats, its listeners; on disk after each change.
// ---------------------------------------------------------------------------

/**
 * opts: { dir (folder for rooms.json, or null for memory only), varRoot (dir's real path must stay
 * under it), now(), log(), maxRooms, idleMs, lifeMs, rounds }
 */
export function createRoomStore(opts = {}) {
  const now = opts.now ?? Date.now;
  const log = opts.log ?? (() => {});
  const maxRooms = opts.maxRooms ?? MAX_ROOMS;
  const idleMs = opts.idleMs ?? IDLE_MS;
  const lifeMs = opts.lifeMs ?? LIFE_MS;
  const rounds = opts.rounds ?? GRID_ROUNDS;
  const dir = opts.dir ?? null;
  if (dir && opts.varRoot && !realUnder(opts.varRoot, dir)) throw new Error(`the room dir must be inside ${opts.varRoot} (got ${dir})`);
  const file = dir ? join(dir, 'rooms.json') : null;
  const rooms = new Map();
  const listeners = new Map();   // id -> Set<{seat, send(state|null)}>

  const expiresAt = (r) => Math.min(r.createdAt + lifeMs, r.activeAt + idleMs);

  const save = () => {
    if (!file) return;
    if (opts.varRoot && !realUnder(opts.varRoot, dir)) { log(`ROOM refusing to write: ${dir} left ${opts.varRoot}`); return; }
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    try { chmodSync(dir, 0o700); } catch { /* not ours */ }
    const text = JSON.stringify({ schema: 1, rooms: [...rooms.values()] }) + '\n';
    writeFileSync(file + '.tmp', text, { mode: 0o600 });
    renameSync(file + '.tmp', file);
  };

  const load = () => {
    if (!file || !existsSync(file)) return 0;
    let doc;
    try { doc = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { log(`ROOM ${file} unreadable (${e.message}): starting with no rooms`); return 0; }
    if (!doc || doc.schema !== 1 || !Array.isArray(doc.rooms)) return 0;
    for (const r of doc.rooms) {
      if (!r || typeof r.id !== 'string' || !ROOM_ID.test(r.id) || !Array.isArray(r.seats) || r.seats.length !== 2) continue;
      if (expiresAt(r) <= now()) continue;
      rooms.set(r.id, r);
    }
    return rooms.size;
  };

  const viewFor = (r, seat) => {
    const online = listeners.get(r.id) ?? new Set();
    const on = [0, 0];
    for (const l of online) on[l.seat]++;
    return {
      v: ROOM_VERSION, id: r.id, version: r.version, you: seat, format: 'grid',
      cube: { id: r.cubeId, title: r.cubeTitle, hash: r.cubeHash, size: r.cubeSize },
      grids: r.grids, g: r.g, slots: [...r.slots], firstLine: r.firstLine, firstSeat: r.firstSeat,
      toAct: toAct(r), done: r.done,
      seats: r.seats.map((s, i) => ({ name: s.name, joined: s.joined, online: on[i] > 0, picks: [...r.picks[i]] })),
      log: r.log.map((e) => ({ ...e, cards: [...e.cards] })),
      createdAt: new Date(r.createdAt).toISOString(), expiresAt: new Date(expiresAt(r)).toISOString(),
      seed: r.done ? r.seed : null,
    };
  };

  const broadcast = (r) => {
    for (const l of listeners.get(r.id) ?? []) l.send(viewFor(r, l.seat));
  };

  const sweep = () => {
    let n = 0;
    for (const r of [...rooms.values()]) {
      if (expiresAt(r) > now()) continue;
      rooms.delete(r.id);
      for (const l of listeners.get(r.id) ?? []) l.send(null);
      listeners.delete(r.id);
      log(`ROOM ${r.id} expired`);
      n++;
    }
    if (n) save();
    return n;
  };

  return {
    load,
    sweep,
    size: () => rooms.size,
    /** Owner: a new room; returns both tokens (the only time they exist in clear). */
    create(c) {
      sweep();
      if (rooms.size >= maxRooms) return { status: 429, body: { ok: false, code: 'full', message: `there are already ${maxRooms} live rooms; they expire 24 h after their last pick` } };
      let id;
      do id = newRoomId(); while (rooms.has(id));
      const seed = randomInt(1, 0x7fffffff);
      const firstSeat = c.firstSeat ?? randomInt(0, 2);
      const grid = newGrid({ cards: c.cards, seed, firstSeat, rounds });
      const tokens = [newToken(), newToken()];
      const t = now();
      const r = {
        id, cubeId: c.cubeId, cubeTitle: c.cubeTitle, cubeHash: cubeHash(c.cards), cubeSize: new Set(c.cards).size,
        ...grid, version: 1, createdAt: t, activeAt: t,
        seats: [{ name: c.name, joined: true, tokenHash: digest(tokens[0]).toString('hex') }, { name: 'Player 2', joined: false, tokenHash: digest(tokens[1]).toString('hex') }],
      };
      rooms.set(id, r);
      save();
      log(`ROOM ${id} made: cube ${r.cubeId} (${r.cubeSize} cards, ${r.grids} grids), seat ${firstSeat} opens`);
      return { status: 201, body: { ok: true, id, seat: 0, token: tokens[0], friendToken: tokens[1], cube: { id: r.cubeId, title: r.cubeTitle, hash: r.cubeHash, size: r.cubeSize }, grids: r.grids, expiresAt: new Date(expiresAt(r)).toISOString() } };
    },
    /** Owner: the live rooms, no tokens. */
    list() {
      sweep();
      return [...rooms.values()].map((r) => ({ id: r.id, cubeId: r.cubeId, joined: r.seats.map((s) => s.joined), grid: Math.min(r.g + 1, r.grids), done: r.done, expiresAt: new Date(expiresAt(r)).toISOString() }));
    },
    /** 'gone' (no such room), 'token' (wrong token), or the seat (0|1). */
    auth(id, token) {
      const r = rooms.get(id);
      if (!r || expiresAt(r) <= now()) return 'gone';
      for (const s of [0, 1]) if (tokenIs(token, r.seats[s].tokenHash)) return s;
      return 'token';
    },
    view(id, seat) {
      const r = rooms.get(id);
      return r ? viewFor(r, seat) : null;
    },
    join(id, seat, name) {
      const r = rooms.get(id);
      if (!r) return null;
      const s = r.seats[seat];
      const changed = !s.joined || (name !== null && name !== s.name);
      s.joined = true;
      if (name !== null) s.name = name;
      r.activeAt = now();
      if (changed) { r.version++; log(`ROOM ${id} seat ${seat} joined`); }
      save();
      if (changed) broadcast(r);
      return viewFor(r, seat);
    },
    /** {state} or {code, message, state}. */
    pick(id, seat, line, expect) {
      const r = rooms.get(id);
      if (!r) return null;
      if (expect !== r.version) return { code: 'stale', message: 'the room moved on: here is where it is now', state: viewFor(r, seat) };
      if (!r.done && !r.seats.every((s) => s.joined)) return { code: 'waiting', message: 'your friend has not joined yet', state: viewFor(r, seat) };
      try { applyPick(r, seat, line); } catch (e) { return { code: e.code ?? 'illegal', message: e.message, state: viewFor(r, seat) }; }
      r.version++;
      r.activeAt = now();
      save();
      broadcast(r);
      if (r.done) log(`ROOM ${id} draft complete`);
      return { state: viewFor(r, seat) };
    },
    /** A stream: send(state) now and after every change, send(null) when the room goes. Returns unsubscribe. */
    listen(id, seat, send) {
      const r = rooms.get(id);
      if (!r) return null;
      const l = { seat, send };
      if (!listeners.has(id)) listeners.set(id, new Set());
      listeners.get(id).add(l);
      broadcast(r);   // its "online" changed, for both seats (this one included: its first state)
      return () => {
        const set = listeners.get(id);
        if (!set?.delete(l)) return;
        if (!set.size) listeners.delete(id);
        const cur = rooms.get(id);
        if (cur) broadcast(cur);
      };
    },
    streams(id, seat) {
      let n = 0;
      for (const l of listeners.get(id) ?? []) if (seat === undefined || l.seat === seat) n++;
      return n;
    },
    totalStreams() { let n = 0; for (const s of listeners.values()) n += s.size; return n; },
    close() { for (const set of listeners.values()) for (const l of set) l.send(null); listeners.clear(); },
  };
}

// ---------------------------------------------------------------------------
// Rate limits: a token bucket per key.
// ---------------------------------------------------------------------------

export function createLimiter({ perMinute, burst, now = Date.now }) {
  const buckets = new Map();
  const rate = perMinute / 60_000;
  return {
    take(key) {
      const t = now();
      let b = buckets.get(key);
      if (!b) { b = { tokens: burst, at: t }; buckets.set(key, b); }
      b.tokens = Math.min(burst, b.tokens + (t - b.at) * rate);
      b.at = t;
      if (buckets.size > 4096) for (const [k, v] of buckets) if (v.tokens >= burst) buckets.delete(k);
      if (b.tokens < 1) return false;
      b.tokens -= 1;
      return true;
    },
    /** Is the bucket empty (without taking)? */
    empty(key) {
      const b = buckets.get(key);
      if (!b) return false;
      return Math.min(burst, b.tokens + (now() - b.at) * rate) < 1;
    },
  };
}

// ---------------------------------------------------------------------------
// The room listener's door, as one pure decision (the token comes after it).
// ---------------------------------------------------------------------------

/** An origin's `name[:port]` scheme-qualified, lowercased; null when it is not http(s). */
function originParts(o) {
  const m = /^(https?):\/\/([a-z0-9.-]+|\[[0-9a-f:.]+\])(?::([0-9]{1,5}))?$/.exec(String(o).trim().toLowerCase());
  return m ? { scheme: m[1], host: m[2], port: m[3] ?? (m[1] === 'https' ? '443' : '80') } : null;
}

/** M50's originAllowed: exact, or a `:*` entry with any port or none. */
export function originListed(origin, allow) {
  const o = String(origin).trim().toLowerCase();
  for (const a of allow) {
    const e = String(a).toLowerCase();
    if (e.endsWith(':*')) {
      const base = e.slice(0, -2);
      if (o === base || (o.startsWith(base + ':') && /^[0-9]{1,5}$/.test(o.slice(base.length + 1)))) return true;
    } else if (o === e) return true;
  }
  return false;
}

/** The page's own origin: http(s)://<the request's Host> (a page the room listener served, or a tunnel's). */
export function ownOrigin(origin, host) {
  const o = originParts(origin);
  const h = /^([a-z0-9.-]+|\[[0-9a-f:.]+\])(?::([0-9]{1,5}))?$/.exec(String(host ?? '').trim().toLowerCase());
  if (!o || !h) return false;
  return o.host === h[1] && o.port === (h[2] ?? (o.scheme === 'https' ? '443' : '80'));
}

/** {ok, cors} or {ok:false, status, code, message}: Origin only; every /room route then needs its token. */
export function roomAdmit({ origin, host, origins, extraOrigins = [] }) {
  if (origin === undefined) return { ok: true, cors: {} };
  if (originListed(origin, origins) || originListed(origin, extraOrigins) || ownOrigin(origin, host)) {
    return { ok: true, cors: { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } };
  }
  return { ok: false, status: 403, code: 'origin', message: 'origin refused: this page may not use the draft room' };
}

// ---------------------------------------------------------------------------
// The site: ForgeCoach's public build, read-only, never outside its folder.
// ---------------------------------------------------------------------------

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.gz': 'application/gzip', '.wasm': 'application/wasm', '.map': 'application/json',
  '.zip': 'application/zip', '.tsv': 'text/tab-separated-values; charset=utf-8',
};
export const MAX_SITE_FILE = 64 * 1024 * 1024;

/** The file under `root` a URL path names, or null: no NUL, backslash, `.`/`..` segment, and the real path inside. */
export function sitePath(root, urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath); } catch { return null; }
  if (p.includes('\0') || p.includes('\\') || !p.startsWith('/')) return null;
  const rel = p.slice(1);
  const segs = rel.split('/');
  if (segs.some((s) => s === '.' || s === '..')) return null;
  const want = rel === '' || rel.endsWith('/') ? `${rel}index.html` : rel;
  let rootReal;
  try { rootReal = realpathSync(root); } catch { return null; }
  const abs = resolve(rootReal, want);
  if (!abs.startsWith(rootReal + sep)) return null;
  try {
    if (realpathSync(abs) !== abs) return null;   // a symlink anywhere on the way: refused
    const st = statSync(abs);
    if (!st.isFile() || st.size > MAX_SITE_FILE) return null;
  } catch { return null; }
  return abs;
}

// ---------------------------------------------------------------------------
// The room listener.
// ---------------------------------------------------------------------------

/** The page addresses a friend can reach this listener at: loopback, each LAN IPv4 (with --lan), a public URL. */
export function roomBases({ port, lan, publicUrl = null, interfaces = networkInterfaces() }) {
  const lanList = [];
  if (lan) {
    for (const addrs of Object.values(interfaces)) {
      for (const a of addrs ?? []) {
        if ((a.family === 'IPv4' || a.family === 4) && !a.internal) lanList.push(`http://${a.address}:${port}`);
      }
    }
    // Home networks first (192.168/16, 10/8, 172.16/12), then the rest.
    const rank = (u) => (/\/\/192\.168\./.test(u) ? 0 : /\/\/10\./.test(u) ? 1 : /\/\/172\.(1[6-9]|2\d|3[01])\./.test(u) ? 2 : 3);
    lanList.sort((x, y) => rank(x) - rank(y));
  }
  return { local: `http://127.0.0.1:${port}`, lan: lanList, public: publicUrl };
}

/**
 * opts: { store, port, bindHost, origins, extraOrigins, siteDir, log, now, limits: {apiPerMin, apiBurst,
 * sitePerMin, failPerMin, streamsPerSeat, streamsTotal}, pingMs }
 */
export function startRoomServer(opts) {
  const { store, port = DEFAULT_ROOM_PORT, bindHost = '127.0.0.1', origins = [], extraOrigins = [], siteDir = null, log = (s) => console.log(s) } = opts;
  const now = opts.now ?? Date.now;
  const L = { seatPerMin: 120, seatBurst: 60, allPerMin: 1200, allBurst: 300, sitePerMin: 600, siteBurst: 200, failPerMin: 10, streamsPerSeat: 3, streamsTotal: 32, ...(opts.limits ?? {}) };
  const pingMs = opts.pingMs ?? PING_MS;
  const seats = createLimiter({ perMinute: L.seatPerMin, burst: L.seatBurst, now });
  const all = createLimiter({ perMinute: L.allPerMin, burst: L.allBurst, now });
  const site = createLimiter({ perMinute: L.sitePerMin, burst: L.siteBurst, now });
  const fails = createLimiter({ perMinute: L.failPerMin, burst: L.failPerMin, now });
  const open = new Set();
  const sweeper = setInterval(() => store.sweep(), 60_000);
  sweeper.unref();

  const base = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
  const send = (res, status, obj, headers = {}) => {
    const body = JSON.stringify(obj);
    res.writeHead(status, { 'Content-Type': 'application/json', ...base, 'Content-Length': Buffer.byteLength(body), ...headers });
    res.end(body);
  };

  const readBody = (req, max) => new Promise((resolveBody) => {
    if (Number(req.headers['content-length'] ?? 0) > max) { resolveBody({ tooLarge: true }); return; }
    const parts = [];
    let n = 0;
    let done = false;
    req.on('data', (c) => {
      if (done) return;
      n += c.length;
      if (n > max) { done = true; resolveBody({ tooLarge: true }); return; }
      parts.push(c);
    });
    req.on('end', () => { if (!done) { done = true; resolveBody({ text: Buffer.concat(parts).toString('utf8') }); } });
    req.on('error', () => { if (!done) { done = true; resolveBody({ broken: true }); } });
  });

  const server = createServer(async (req, res) => {
    const peer = req.socket.remoteAddress ?? '?';
    // The address a limit counts: a tunnel daemon connects from loopback and names its client in
    // CF-Connecting-IP (only a process on this machine can reach loopback, so it cannot be forged from outside).
    const cf = req.headers['cf-connecting-ip'];
    const who = /^(::ffff:)?127\.|^::1$/.test(peer) && typeof cf === 'string' && /^[0-9a-f.:]{2,45}$/i.test(cf) ? `cf:${cf}` : peer;
    let url;
    try { url = new URL(req.url ?? '/', 'http://room.invalid'); } catch { send(res, 400, { ok: false, code: 'bad', message: 'bad request' }); return; }
    const path = url.pathname;
    const origin = req.headers.origin;
    const say = (status, extra = '') => log(`ROOM ${req.method} ${path} from ${peer}${origin ? ` origin ${origin}` : ''} -> ${status}${extra}`);

    const gate = roomAdmit({ origin, host: req.headers.host, origins, extraOrigins });
    if (!gate.ok) { send(res, gate.status, { ok: false, code: gate.code, message: gate.message }); say(gate.status, ' (origin)'); return; }
    const cors = gate.cors;

    if (path === '/room' || path.startsWith('/room/')) {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Room-Token',
          'Access-Control-Allow-Private-Network': 'true', 'Access-Control-Max-Age': '600', 'Content-Length': '0' });
        res.end();
        return;
      }
      if (!all.take('all')) { send(res, 429, { ok: false, code: 'slow', message: 'the room is busy — try again in a moment' }, { ...cors, 'Retry-After': '5' }); say(429, ' (all)'); return; }
      if (fails.empty(who)) { send(res, 429, { ok: false, code: 'slow', message: 'too many wrong links from this address — wait a minute' }, { ...cors, 'Retry-After': '60' }); say(429, ' (failures)'); return; }
      const m = /^\/room\/([^/]+)(?:\/(events|join|pick))?$/.exec(path);
      if (!m || !ROOM_ID.test(m[1])) { fails.take(who); send(res, 404, { ok: false, code: 'gone', message: 'no such room' }, cors); say(404); return; }
      const [, id, action] = m;
      const seat = store.auth(id, req.headers[TOKEN_HEADER]);
      if (seat === 'gone' || seat === 'token') {
        fails.take(who);
        if (seat === 'gone') send(res, 404, { ok: false, code: 'gone', message: 'this room does not exist or has expired' }, cors);
        else send(res, 403, { ok: false, code: 'token', message: 'this link’s seat token is not right for the room' }, cors);
        say(seat === 'gone' ? 404 : 403, ` (${seat})`);
        return;
      }
      if (!seats.take(`${id}/${seat}`)) { send(res, 429, { ok: false, code: 'slow', message: 'too many requests — slow down' }, { ...cors, 'Retry-After': '5' }); say(429, ` (seat ${seat})`); return; }
      const method = req.method;
      if (!action) {
        if (method !== 'GET') { send(res, 405, { ok: false, code: 'method', message: 'use GET' }, { ...cors, Allow: 'GET, OPTIONS' }); say(405); return; }
        send(res, 200, store.view(id, seat), cors);
        say(200);
        return;
      }
      if (action === 'events') {
        if (method !== 'GET') { send(res, 405, { ok: false, code: 'method', message: 'use GET' }, { ...cors, Allow: 'GET, OPTIONS' }); say(405); return; }
        if (store.streams(id, seat) >= L.streamsPerSeat || store.totalStreams() >= L.streamsTotal) {
          send(res, 429, { ok: false, code: 'streams', message: 'too many open copies of this room — close a tab' }, { ...cors, 'Retry-After': '5' });
          say(429, ' (streams)');
          return;
        }
        res.writeHead(200, { ...cors, ...base, 'Cache-Control': 'no-store, no-transform', 'Content-Type': 'text/event-stream; charset=utf-8', 'X-Accel-Buffering': 'no', Connection: 'keep-alive' });
        res.flushHeaders();
        req.socket.setKeepAlive(true, pingMs);
        let closed = false;
        let off = null;
        let ping = null;
        const write = (s) => { if (!closed && !res.destroyed && !res.writableEnded) res.write(s); };
        const end = () => {
          if (closed) return;
          closed = true;
          clearInterval(ping);
          open.delete(end);
          off?.();
          if (!res.writableEnded) res.end();
        };
        open.add(end);
        ping = setInterval(() => write(': ping\n\n'), pingMs);
        off = store.listen(id, seat, (state) => {
          if (state === null) { write('event: gone\ndata: {}\n\n'); end(); return; }
          write(`event: state\ndata: ${JSON.stringify(state)}\n\n`);
        });
        res.on('close', end);
        say(200, ' (stream)');
        return;
      }
      if (method !== 'POST') { send(res, 405, { ok: false, code: 'method', message: 'use POST' }, { ...cors, Allow: 'POST, OPTIONS' }); say(405); return; }
      const raw = await readBody(req, MAX_SEAT_BODY);
      if (raw.tooLarge) { send(res, 413, { ok: false, code: 'size', message: 'request too large (at most 1 KB)' }, { ...cors, Connection: 'close' }); say(413); req.destroy(); return; }
      if (raw.broken) return;
      let q;
      try { q = raw.text === '' ? {} : JSON.parse(raw.text); } catch { send(res, 400, { ok: false, code: 'bad', message: 'the body is not JSON' }, cors); say(400); return; }
      if (!q || typeof q !== 'object' || Array.isArray(q)) { send(res, 400, { ok: false, code: 'bad', message: 'the body must be a JSON object' }, cors); say(400); return; }
      if (action === 'join') {
        const name = q.name === undefined ? null : cleanText(q.name, MAX_SEAT_NAME);
        if (q.name !== undefined && name === null) { send(res, 400, { ok: false, code: 'bad', message: `a name is 1-${MAX_SEAT_NAME} characters` }, cors); say(400); return; }
        send(res, 200, store.join(id, seat, name), cors);
        say(200, ` (seat ${seat})`);
        return;
      }
      // pick
      if (!Number.isInteger(q.line) || q.line < 0 || q.line > 5 || !Number.isInteger(q.expect)) {
        send(res, 400, { ok: false, code: 'bad', message: 'expected {"line": 0-5, "expect": <the state\'s version>}' }, cors);
        say(400);
        return;
      }
      const r = store.pick(id, seat, q.line, q.expect);
      if (r.code) {
        send(res, r.code === 'illegal' ? 400 : 409, { ok: false, code: r.code, message: r.message, state: r.state }, cors);
        say(r.code === 'illegal' ? 400 : 409, ` (${r.code})`);
        return;
      }
      send(res, 200, r.state, cors);
      say(200, ` (seat ${seat} line ${q.line})`);
      return;
    }

    // The site.
    if (req.method !== 'GET' && req.method !== 'HEAD') { send(res, 405, { ok: false, code: 'method', message: 'use GET' }, { Allow: 'GET, HEAD' }); say(405); return; }
    if (!site.take(who)) { send(res, 429, { ok: false, code: 'slow', message: 'too many requests' }, { 'Retry-After': '5' }); say(429); return; }
    const file = siteDir ? sitePath(siteDir, path) : null;
    if (!file) {
      const body = siteDir ? 'not found' : 'no site here: this is the draft room (scripts/play.sh --draft-room serves ForgeCoach on it)';
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...base, 'Content-Length': Buffer.byteLength(body) });
      res.end(req.method === 'HEAD' ? undefined : body);
      return;
    }
    const data = readFileSync(file);
    const hashed = /\/assets\/[^/]+$/.test(path);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache', 'Content-Length': data.length });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
  server.on('clientError', (err, socket) => { socket.destroy(); });
  server.headersTimeout = 20_000;
  server.requestTimeout = 30_000;

  return {
    server,
    listen: () => new Promise((resolveListen, reject) => {
      server.once('error', reject);
      server.listen(port, bindHost, () => resolveListen(server.address().port));
    }),
    close: () => {
      clearInterval(sweeper);
      for (const end of [...open]) end();
      server.close();
      server.closeAllConnections?.();
    },
  };
}

// ---------------------------------------------------------------------------
// The owner's half, routed by the coach helper (its door, D386).
// ---------------------------------------------------------------------------

/** { post(body) -> {status, body}, list() -> {status, body}, health() } for tools/coach-helper.mjs. */
export function createRoomOwner({ store, roomPort, lan = false, publicUrl = null, interfaces }) {
  return {
    health: () => ({ draftRoom: 1, roomPort, rooms: store.size() }),
    post(body) {
      const c = {};
      const why = checkCreate(body, c);
      if (why) return { status: 400, body: { ok: false, type: 'error', code: 'bad', message: why } };
      const r = store.create(c);
      if (r.status !== 201) return { status: r.status, body: { ...r.body, type: 'error' } };
      return { status: 201, body: { ...r.body, roomPort, bases: roomBases({ port: roomPort, lan, publicUrl, interfaces }) } };
    },
    list: () => ({ status: 200, body: { ok: true, rooms: store.list() } }),
  };
}
