#!/usr/bin/env node
// mtg-table — tools/draft-decks.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// THE DRAFT-DECK LEDGER (D455): the decks people actually built after drafting a cube,
// kept on this machine so a cube's page can show the colour shares of REAL drafts --
// the human ground truth the lab's bot-drafted shares are compared against.  Nothing
// here is a verdict; it is a count.
//
// ONE FILE: var/draft-decks/decks.jsonl (mode 600, folder 700, its real path under
// var/).  Decks are appended; a withdrawal REWRITES it.  One JSON object a line:
//
//   {"v":1,"at":"<ISO>","source":"room","key":"room:<roomId>:<seat>","cubeId":"omega",
//    "cubeHash":"<hex>","format":"grid","main":[[1,"Card"],...,[17,"Plains"]]}
//   {"v":1,"at":"<ISO>","source":"solo","key":"solo:<draftId>","cubeId":"omega",
//    "format":"grid"|"winston"|"booster","main":[[n,"Card"],...]}
//   {"v":1,"at":"<ISO>","source":"room","key":"table:<matchId>:<seat>",...}   (`import` of a
//    table game: keyed by the game's match id, so its room can still withdraw it)
//
// A later line with the same key REPLACES the earlier one (a deck handed in again
// between games is the same draft's final deck, sideboarded).  Only the main deck is
// kept -- the sideboard says nothing about the colours played.  No player name, no
// token, no deck name.
//
// A WITHDRAWAL DELETES (the review of #169): when a seat opts out, every line of its
// keys -- `room:<roomId>:<seat>` and `table:<matchId>:<seat>` for each of the room's
// games -- is removed by rewriting the file (a temp file, then rename), never hidden by
// a later line, so the friend's list is gone from disk.  It is never refused for size
// (the 32 MB cap is for new decks only), and a rewrite that fails throws and is logged
// as an ERROR; either way this process stops serving those keys at once.  (Older
// ledgers may hold `"withdrawn": true` lines; the fold still honours them.)
//
// A WITHDRAWAL IS REMEMBERED (#169's follow-ups): its keys go into
// var/draft-decks/withdrawn.txt (one key a line, never a card) BEFORE the rewrite, and
// `import` refuses a withdrawn key -- seats.json keeps the consent a game started with,
// so without it a later import would bring an opted-out seat's deck back.  The same
// seat handing in a deck with its consent on again (or the owner sending the same solo
// draft again) takes its own key off the list.
//
// ONE WRITER AT A TIME: every change -- an append, a withdrawal, an import -- holds
// var/draft-decks/decks.lock (created exclusively, holding the writer's pid), so the
// CLI and the helper never interleave: a CLI `withdraw` cannot drop a deck the helper
// is appending, and an `import` cannot bring back a line an opt-out is deleting.  A
// lock whose pid is gone, or older than LOCK_STALE_MS, is taken over; a writer waits
// up to LOCK_WAIT_MS, then gives up (the helper answers 503, an opt-out throws).
//
// WHERE A LINE COMES FROM:
//
//   - a draft room seat (D400/D404) that hands in a deck WITH ITS OWN CONSENT TO
//     RECORDING ON (D407's per-seat `record`, as it stands when the deck goes in):
//     draft-room.mjs calls `onDeck`, and this store writes the line.  A seat whose
//     consent is off writes nothing -- and, if it had lines, they are deleted.  The
//     friend's list is the friend's (D407): it stays in this file on the owner's
//     machine and LEAVES IT ONLY AS ITS COLOUR MAKEUP (the GET below).
//   - a draft against the bot, from ForgeCoach: `POST /draft-deck` on the coach
//     helper's own door (the owner's page; the same gate as /match), sent when the
//     player starts the match with the deck they built.
//   - `import` below, for a table game recorded before this file existed.
//
// THE ROUTES (tools/coach-helper.mjs; ForgeCoach's src/cube/draftShares.ts reads them):
//
//   POST /draft-deck  {"cubeId": "<cube id>", "draftId": "<ForgeCoach's draft id>",
//                      "format": "grid"|"winston"|"booster", "main": [[n, "Card"], ...]}
//                 (16 KB at most, else 413; 40-250 cards, the match launcher's checkDeck)
//                 -> 201 {"ok":true,"key":"solo:<draftId>","replaced":<bool>}
//                    400 {"ok":false,"type":"error","message","problems"?}; 507 the ledger is full
//   GET  /draft-decks?cube=<cube id>
//                 -> 200 {"ok":true,"v":1,"cube":"<id>","scripts":<bool>,
//                         "decks":[{"source":"room"|"solo","day":"YYYY-MM-DD","format",
//                                   "spells":{"W":n,"U":n,"B":n,"R":n,"G":n},
//                                   "colourless":n,"lands":n,"unread":n}, ...]}
//                 AGGREGATE ONLY: each deck as the count of its nonland cards of each
//                 colour, never a card name, a key, a room id or a time of day; the decks
//                 sorted by day, then by makeup, so the order says nothing the day does not.
//   /health carries "draftDecks": 1.
//
// A CARD'S COLOURS are the lab census's (D447, tools/cubelab/deckcensus.ts coloursOf):
// its printed colours (a script's `Colors:` line) and every colour of its cost's
// symbols, read from Forge's own scripts (tools/forge-scripts.ts; no engine boot).  A
// split card counts both halves, any other two-faced card its front.  A card whose
// front is a land is a land, not a spell.  A card with no script (not in Forge 2.0.14,
// a typo) is `unread`.  With no scripts at all (a checkout without forge-home/res)
// every nonbasic is unread and "scripts" is false.  "Main colours" -- 3+ spells, the
// census's `coloursWith3` -- is the reader's rule (ForgeCoach's draftShares.ts), so
// the wire carries counts and the rule lives in one place.
//
//   node tools/draft-decks.mjs list                       # decks per cube and source; no lists
//   node tools/draft-decks.mjs import <var/match/m…> --cube <id>
//        a table game's seat<N>.dck whose seats.json says that seat consented (D407),
//        or a Draft vs Bot match's you.dck; every nonbasic must be in cubes/<id>.md
//        when that file exists.  The same deck imported twice is one line (game 2 of a
//        match is game 1's deck).  A table seat's line is keyed `table:<matchId>:<seat>`
//        and dated by the match id (its epoch milliseconds).
//   node tools/draft-decks.mjs withdraw <key> [...]      # delete a deck's lines (a friend
//        who asks after their room expired); `list --keys` prints the keys
//
// Run from the repo root (hard rule 9).  Self-test: tools/draft-decks-selftest.mjs
// (gate 12f, CI).

import { createHash } from 'node:crypto';
import * as realFs from 'node:fs';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, statSync, unlinkSync, writeSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDeck, realInside } from './match-launcher.mjs';

export const DRAFT_DECKS_VERSION = 1;
export const DRAFT_DECKS_DIR = 'var/draft-decks';
export const LEDGER_FILE = 'decks.jsonl';
export const WITHDRAWN_FILE = 'withdrawn.txt';
export const LOCK_FILE = 'decks.lock';
export const LOCK_WAIT_MS = 5000;
export const LOCK_STALE_MS = 60_000;
export const MAX_DRAFT_DECK_BODY = 16 * 1024;
export const MAX_LEDGER_BYTES = 32 * 1024 * 1024;
export const FORMATS = ['grid', 'winston', 'booster'];
export const SOURCES = ['room', 'solo'];
export const COLOURS = ['W', 'U', 'B', 'R', 'G'];
const CUBE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;   // draft-room.mjs's, and a custom cube's my-<slug>
const DRAFT_ID = /^[A-Za-z0-9_-]{1,80}$/;
const ROOM_ID = /^r[A-Za-z0-9_-]{4,16}$/;
const MATCH_ID = /^m[0-9]{13}$/;   // match-launcher.mjs's
const BASICS = new Map([['plains', 'W'], ['island', 'U'], ['swamp', 'B'], ['mountain', 'R'], ['forest', 'G'], ['wastes', ''],
  ['snow-covered plains', 'W'], ['snow-covered island', 'U'], ['snow-covered swamp', 'B'], ['snow-covered mountain', 'R'], ['snow-covered forest', 'G']]);
const COLOUR_WORD = { white: 'W', blue: 'U', black: 'B', red: 'R', green: 'G' };

/** The colours a script's face counts under, and whether its front is a land: {land, colours} (WUBRG order). */
export function scriptMakeup(script) {
  const faces = String(script).split(/^ALTERNATE\s*$/m);
  const split = /^AlternateMode:\s*Split\s*$/m.test(faces[0] ?? '');
  const field = (face, k) => new RegExp(`^${k}:(.*)$`, 'm').exec(face)?.[1]?.trim() ?? '';
  const coloursOf = (face) => {
    const s = new Set();
    const cost = field(face, 'ManaCost');
    if (cost && cost !== 'no cost') for (const tok of cost.split(/\s+/)) for (const ch of tok) if (COLOURS.includes(ch)) s.add(ch);
    for (const w of field(face, 'Colors').toLowerCase().split(/[,\s]+/)) if (COLOUR_WORD[w]) s.add(COLOUR_WORD[w]);
    return s;
  };
  const land = /\bLand\b/.test(field(faces[0] ?? '', 'Types'));
  const set = coloursOf(faces[0] ?? '');
  if (split && faces[1]) for (const c of coloursOf(faces[1])) set.add(c);
  return { land, colours: COLOURS.filter((c) => set.has(c)).join('') };
}

/**
 * One main deck's colour makeup: the count of its nonland cards of each colour (a gold card in each
 * of its colours), the colourless ones, the lands, and the cards no script describes.  `scriptOf`
 * is forge-scripts.ts's lookup, or null when there are no scripts.
 */
export function makeupOf(main, scriptOf, memo = new Map()) {
  const out = { spells: { W: 0, U: 0, B: 0, R: 0, G: 0 }, colourless: 0, lands: 0, unread: 0 };
  for (const [n, card] of main) {
    const name = String(card).split('|')[0].trim();
    const folded = name.toLowerCase();
    if (BASICS.has(folded)) { out.lands += n; continue; }
    let m = memo.get(name);
    if (m === undefined) {
      const text = scriptOf ? (scriptOf(name) ?? (name.includes(' // ') ? scriptOf(name.split(' // ')[0]) : null)) : null;
      m = text === null ? null : scriptMakeup(text);
      memo.set(name, m);
    }
    if (m === null) out.unread += n;
    else if (m.land) out.lands += n;
    else if (!m.colours) out.colourless += n;
    else for (const c of m.colours) out.spells[c] += n;
  }
  return out;
}

/** The ledger's lines folded by key, the last line of a key winning, withdrawn keys gone: [line, ...] in file order. */
export function foldLedger(text) {
  const byKey = new Map();
  for (const raw of String(text).split('\n')) {
    if (!raw.trim()) continue;
    let o;
    try { o = JSON.parse(raw); } catch { continue; }
    if (!o || o.v !== DRAFT_DECKS_VERSION || typeof o.key !== 'string' || !SOURCES.includes(o.source) || typeof o.cubeId !== 'string') continue;
    byKey.delete(o.key);
    if (o.withdrawn === true) continue;
    if (!Array.isArray(o.main)) continue;
    byKey.set(o.key, o);
  }
  return [...byKey.values()];
}

/** Why a POST /draft-deck body is not one, or the line it makes: {problems} | {line}. */
export function checkSoloBody(body, at) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { problems: ['the body must be a JSON object'] };
  for (const k of Object.keys(body)) if (!['cubeId', 'draftId', 'format', 'main'].includes(k)) return { problems: [`unknown field "${k}"`] };
  if (typeof body.cubeId !== 'string' || !CUBE_ID.test(body.cubeId)) return { problems: ['"cubeId" must be a cube id (lowercase letters, digits, dashes)'] };
  if (typeof body.draftId !== 'string' || !DRAFT_ID.test(body.draftId)) return { problems: ['"draftId" must be 1-80 letters, digits, dashes or underscores'] };
  if (!FORMATS.includes(body.format)) return { problems: [`"format" must be one of ${FORMATS.join(', ')}`] };
  const c = checkDeck({ name: 'Draft deck', main: body.main }, 'main');
  if (c.problems.length) return { problems: c.problems };
  return { line: { v: DRAFT_DECKS_VERSION, at, source: 'solo', key: `solo:${body.draftId}`, cubeId: body.cubeId, format: body.format, main: c.deck.main.map(([n, card]) => [n, card]) } };
}

const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

/**
 * Run fn() holding `dir`/decks.lock: created with O_EXCL, holding this pid.  A lock whose pid is not
 * alive, or older than staleMs, is taken over; otherwise wait (polling) up to waitMs, then throw
 * {code: 'LOCKED'}.  The lock is removed afterwards, whatever fn() did.  Synchronous, like the store.
 */
export function withLedgerLock(dir, fn, { waitMs = LOCK_WAIT_MS, staleMs = LOCK_STALE_MS, now = Date.now } = {}) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const lock = join(dir, LOCK_FILE);
  const until = now() + waitMs;
  let fd;
  for (;;) {
    try { fd = openSync(lock, 'wx', 0o600); break; } catch (e) {
      if (e.code !== 'EEXIST') throw e;
    }
    let holder = NaN;
    let age = 0;
    try { holder = Number(readFileSync(lock, 'utf8').trim()); age = now() - statSync(lock).mtimeMs; } catch { continue; }   // gone between: try again
    if ((Number.isInteger(holder) && holder > 0 && !alive(holder)) || age > staleMs) {
      try { unlinkSync(lock); } catch { /* another writer took it over first */ }
      continue;
    }
    if (now() >= until) {
      const err = new Error(`the draft-deck ledger is locked by pid ${Number.isInteger(holder) ? holder : '?'} (${lock})`);
      err.code = 'LOCKED';
      throw err;
    }
    pause(10);
  }
  try {
    writeSync(fd, String(process.pid));
    closeSync(fd);
    return fn();
  } finally {
    try { unlinkSync(lock); } catch { /* best effort */ }
  }
}

/**
 * The store.  opts: { dir (the ledger's folder), varRoot (its real path must stay inside), scriptOf
 * (() => lookup | null, called once, lazily), now, log, maxBytes, fs (the writes, for the self-test:
 * {appendFileSync, writeFileSync, renameSync, chmodSync}), lockWaitMs, lockStaleMs }.
 */
export function createDraftDecks(opts = {}) {
  const now = opts.now ?? Date.now;
  const log = opts.log ?? (() => {});
  const dir = opts.dir;
  const maxBytes = opts.maxBytes ?? MAX_LEDGER_BYTES;
  if (!dir) throw new Error('the draft-deck ledger needs a folder');
  const file = join(dir, LEDGER_FILE);
  const inside = () => !opts.varRoot || realInside(opts.varRoot, dir);
  if (opts.varRoot) mkdirSync(opts.varRoot, { recursive: true });
  if (!inside()) throw new Error(`the draft-deck folder must be inside ${opts.varRoot} (got ${dir})`);
  let lookup;
  const scripts = () => {
    if (lookup === undefined) {
      try { lookup = opts.scriptOf ? opts.scriptOf() : null; } catch (e) { log(`DRAFT-DECKS no card scripts (${e.message}): every nonbasic is unread`); lookup = null; }
    }
    return lookup;
  };
  const memo = new Map();
  const fsx = { appendFileSync: realFs.appendFileSync, writeFileSync: realFs.writeFileSync, renameSync: realFs.renameSync, chmodSync: realFs.chmodSync, ...(opts.fs ?? {}) };
  const tombFile = join(dir, WITHDRAWN_FILE);
  const locked = (fn) => withLedgerLock(dir, fn, { waitMs: opts.lockWaitMs ?? LOCK_WAIT_MS, staleMs: opts.lockStaleMs ?? LOCK_STALE_MS });
  const read = () => (existsSync(file) ? readFileSync(file, 'utf8') : '');
  /** The withdrawn keys on disk. */
  const tombs = () => new Set(existsSync(tombFile) ? readFileSync(tombFile, 'utf8').split('\n').map((k) => k.trim()).filter(Boolean) : []);
  const writeTombs = (set) => {
    const tmp = `${tombFile}.${process.pid}.tmp`;
    try {
      fsx.writeFileSync(tmp, [...set].map((k) => k + '\n').join(''), { mode: 0o600 });
      fsx.renameSync(tmp, tombFile);
    } catch (e) { try { unlinkSync(tmp); } catch { /* none */ } throw e; }
  };
  const unTomb = (key) => { const t = tombs(); if (t.delete(key)) writeTombs(t); };
  // A change under the lock: a lock that cannot be had is the helper's 503.
  const lockedAppend = (line, before = () => {}) => {
    try { return locked(() => { before(); return append(line); }); } catch (e) {
      if (e.code === 'LOCKED') return { status: 503, body: { ok: false, type: 'error', message: `${e.message}: try again in a moment` } };
      throw e;
    }
  };
  const append = (line) => {
    if (!inside()) return { status: 500, body: { ok: false, type: 'error', message: 'the draft-deck folder is not where it should be' } };
    const text = JSON.stringify(line) + '\n';
    const size = existsSync(file) ? statSync(file).size : 0;
    if (size + Buffer.byteLength(text) > maxBytes) return { status: 507, body: { ok: false, type: 'error', message: `the draft-deck ledger is full (${Math.round(size / 1048576)} MB): move ${file} aside` } };
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    fsx.appendFileSync(file, text, { mode: 0o600 });
    try { fsx.chmodSync(file, 0o600); } catch { /* best effort */ }
    return null;
  };
  const has = (key) => foldLedger(read()).some((l) => l.key === key);
  // Keys withdrawn in this process: never served again, even if the rewrite below failed.
  const gone = new Set();
  /** Delete every line whose key is in `keys` (a temp file, then rename; no size cap).  Throws on failure.  -> lines removed. */
  const remove = (keys) => {
    for (const k of keys) gone.add(k);
    if (!inside()) throw new Error('the draft-deck folder is not where it should be');
    return locked(() => {
      // Remembered first, so no later import brings them back even if the rewrite below fails.
      const t = tombs();
      const before = t.size;
      for (const k of keys) t.add(k);
      if (t.size !== before) writeTombs(t);
      if (!existsSync(file)) return 0;
      const lines = read().split('\n').filter((l) => l.trim());
      const keep = lines.filter((l) => { try { return !keys.has(JSON.parse(l)?.key); } catch { return true; } });
      if (keep.length === lines.length) return 0;
      const tmp = `${file}.${process.pid}.tmp`;
      try {
        fsx.writeFileSync(tmp, keep.map((l) => l + '\n').join(''), { mode: 0o600 });
        fsx.renameSync(tmp, file);
      } catch (e) { try { unlinkSync(tmp); } catch { /* none */ } throw e; }
      return lines.length - keep.length;
    });
  };
  const iso = () => new Date(now()).toISOString();
  return {
    file,
    health: () => ({ draftDecks: 1 }),
    /** D455: a room seat handed in a deck (draft-room.mjs onDeck).  Written only with that seat's consent. */
    recordRoom({ roomId, seat, cubeId, cubeHash, format = 'grid', main, record, matchIds = [] }) {
      if (!ROOM_ID.test(String(roomId)) || (seat !== 0 && seat !== 1) || !CUBE_ID.test(String(cubeId))) return false;
      const key = `room:${roomId}:${seat}`;
      if (!record) {
        // The seat's own keys: this room's, and each of its games' (an imported table game's).
        const keys = new Set([key, ...matchIds.filter((m) => MATCH_ID.test(String(m))).map((m) => `table:${m}:${seat}`)]);
        let n;
        try { n = remove(keys); } catch (e) {
          log(`DRAFT-DECKS ERROR room ${roomId} seat ${seat} opted out but its deck could NOT be deleted from ${file} (${e.message}): no longer served; delete it by hand`);
          throw e;
        }
        if (n) log(`DRAFT-DECKS room ${roomId} seat ${seat} opted out: ${n} line(s) of its deck deleted from the ledger`);
        return n > 0;
      }
      gone.delete(key);
      const line = { v: DRAFT_DECKS_VERSION, at: iso(), source: 'room', key, cubeId, ...(typeof cubeHash === 'string' ? { cubeHash } : {}), format, main: main.map(([n, card]) => [n, card]) };
      // The seat's consent is on again: its own key comes off the withdrawn list.
      const fail = lockedAppend(line, () => unTomb(key));
      if (fail) { log(`DRAFT-DECKS room ${roomId} seat ${seat}: not recorded (${fail.body.message})`); return false; }
      log(`DRAFT-DECKS room ${roomId} seat ${seat}: its deck recorded for cube ${cubeId} (D455, with its consent)`);
      return true;
    },
    /** POST /draft-deck: {status, body}. */
    postSolo(body) {
      const c = checkSoloBody(body, iso());
      if (c.problems) return { status: 400, body: { ok: false, type: 'error', message: c.problems[0], problems: c.problems } };
      const replaced = has(c.line.key);
      // The owner sending the same draft again is their own choice: its key comes off the withdrawn list.
      const fail = lockedAppend(c.line, () => unTomb(c.line.key));
      if (fail) return fail;
      log(`DRAFT-DECKS ${c.line.key}: a deck for cube ${c.line.cubeId}${replaced ? ' (replaces the earlier one)' : ''}`);
      return { status: 201, body: { ok: true, key: c.line.key, replaced } };
    },
    /** GET /draft-decks?cube=<id>: {status, body}, aggregate only. */
    shares(cube) {
      if (typeof cube !== 'string' || !CUBE_ID.test(cube)) return { status: 400, body: { ok: false, type: 'error', message: '?cube= must be a cube id (lowercase letters, digits, dashes)' } };
      const s = scripts();
      const t = tombs();
      const decks = foldLedger(read()).filter((l) => l.cubeId === cube && !gone.has(l.key) && !t.has(l.key)).map((l) => ({
        source: l.source, day: String(l.at).slice(0, 10), format: FORMATS.includes(l.format) ? l.format : null, ...makeupOf(l.main, s, memo),
      }));
      const order = (d) => `${d.day}|${d.source}|${COLOURS.map((c) => String(d.spells[c]).padStart(3, '0')).join('')}|${d.colourless}|${d.lands}|${d.unread}`;
      decks.sort((a, b) => (order(a) < order(b) ? -1 : order(a) > order(b) ? 1 : 0));
      return { status: 200, body: { ok: true, v: DRAFT_DECKS_VERSION, cube, scripts: !!s, decks } };
    },
    /** Every deck's cube and source, for `list`: [{cubeId, source, day}]. */
    summary: () => foldLedger(read()).filter((l) => !gone.has(l.key) && !tombs().has(l.key)).map((l) => ({ key: l.key, cubeId: l.cubeId, source: l.source, day: String(l.at).slice(0, 10) })),
    /** `withdraw`: delete these keys' lines (no size cap).  -> lines removed. */
    withdraw: (keys) => remove(new Set(keys)),
    /**
     * `import`: a line made elsewhere (its key already chosen), under the lock: 'added', 'there' (that key,
     * or the same deck under another: game 2 of a match is game 1's deck) or 'withdrawn' (its seat opted out).
     */
    importLine(line) {
      return locked(() => {
        if (tombs().has(line.key)) return 'withdrawn';
        if (has(line.key)) return 'there';
        const same = JSON.stringify(line.main);
        if (foldLedger(read()).some((l) => l.source === line.source && l.cubeId === line.cubeId && JSON.stringify(l.main) === same)) return 'there';
        const fail = append(line);
        if (fail) throw new Error(fail.body.message);
        return 'added';
      });
    },
    /** The withdrawn keys (for `list --keys` and the self-test). */
    withdrawnKeys: () => [...tombs()],
  };
}

/** A `.dck` file's main section: [[n, card], ...] (the `|SET` suffix dropped). */
export function dckMain(text) {
  const out = [];
  let inMain = false;
  for (const raw of String(text).split('\n')) {
    const l = raw.trim();
    if (/^\[.*\]$/.test(l)) { inMain = l.toLowerCase() === '[main]'; continue; }
    const m = inMain ? /^(\d+)\s+(.+)$/.exec(l) : null;
    if (m) out.push([Number(m[1]), m[2].split('|')[0].trim()]);
  }
  return out;
}

/**
 * `import`: one var/match/<id>/ folder's decks into the ledger.  A table game's seat<N>.dck only when its
 * seats.json says that seat consented (D407); a Draft vs Bot match's you.dck (never ai.dck).  `names`, when
 * given, is the cube's list (lowercased): a deck with a nonbasic outside it is refused.  Keyed by the
 * file's digest, so game 1 and game 2 of one match (the same deck) are one line.  [{file, what, added}].
 */
export function importMatch({ store, dir, cube, names = null }) {
  const out = [];
  let seats = null;
  try { seats = existsSync(join(dir, 'seats.json')) ? JSON.parse(readFileSync(join(dir, 'seats.json'), 'utf8')) : null; } catch { seats = { record: [] }; }
  const files = seats ? [0, 1].map((s) => ({ file: `seat${s}.dck`, room: true, ok: seats.record?.[s] === true })) : [{ file: 'you.dck', room: false, ok: true }];
  for (const { file, room, ok } of files) {
    const p = join(dir, file);
    if (!existsSync(p)) continue;
    if (!ok) { out.push({ file, what: 'skipped -- that seat did not agree to recording (seats.json, D407)', added: false }); continue; }
    const text = readFileSync(p, 'utf8');
    const list = dckMain(text);
    const missing = names ? list.map(([, c]) => c).filter((c) => !BASICS.has(c.toLowerCase()) && !names.has(c.toLowerCase())) : [];
    if (missing.length) { out.push({ file, what: `not imported -- ${missing.length} card(s) not in cube ${cube} (${missing.slice(0, 3).join(', ')})`, added: false }); continue; }
    const sha = createHash('sha256').update(text).digest('hex').slice(0, 16);
    const matchId = basename(dir);
    // The match id is its start in epoch milliseconds: the day it was played, whatever the file's mtime.
    const at = new Date(MATCH_ID.test(matchId) ? Number(matchId.slice(1)) : statSync(p).mtimeMs).toISOString();
    if (room && !MATCH_ID.test(matchId)) { out.push({ file, what: `not imported -- ${matchId} is not a match folder (m + 13 digits)`, added: false }); continue; }
    const seat = Number(file.slice(4, 5));
    const line = room
      ? { v: DRAFT_DECKS_VERSION, at, source: 'room', key: `table:${matchId}:${seat}`, cubeId: cube, format: 'grid', main: list }
      : { v: DRAFT_DECKS_VERSION, at, source: 'solo', key: `solo:import-${sha}`, cubeId: cube, format: null, main: list };
    const r = store.importLine(line);
    out.push({ file, what: r === 'added' ? `imported (${line.source})` : r === 'withdrawn' ? `not imported -- ${line.key} was withdrawn (that seat opted out; ${WITHDRAWN_FILE})` : 'already there', added: r === 'added' });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The CLI.
// ---------------------------------------------------------------------------

async function main(argv) {
  const repo = process.cwd();
  if (!existsSync(join(repo, 'tools', 'draft-decks.mjs'))) { console.error('draft-decks: run it from the repo root (hard rule 9)'); return 2; }
  const store = createDraftDecks({ dir: resolve(repo, DRAFT_DECKS_DIR), varRoot: resolve(repo, 'var') });
  const [cmd, ...rest] = argv;
  if (cmd === 'list') {
    const counts = new Map();
    for (const d of store.summary()) {
      const k = d.cubeId;
      const c = counts.get(k) ?? { room: 0, solo: 0, first: d.day, last: d.day };
      c[d.source]++;
      if (d.day < c.first) c.first = d.day;
      if (d.day > c.last) c.last = d.day;
      counts.set(k, c);
    }
    if (!counts.size) console.log(`no decks in ${store.file} yet`);
    if (rest.includes('--keys')) for (const d of store.summary()) console.log(`  ${d.key}  ${d.cubeId} ${d.source} ${d.day}`);
    if (rest.includes('--keys')) for (const k of store.withdrawnKeys()) console.log(`  ${k}  withdrawn (import refuses it)`);
    for (const [cube, c] of [...counts].sort()) console.log(`${cube}: ${c.room + c.solo} deck(s) -- ${c.room} from draft rooms (consenting seats), ${c.solo} against the bot; ${c.first} to ${c.last}`);
    return 0;
  }
  if (cmd === 'import') {
    const cubeAt = rest.indexOf('--cube');
    const cube = cubeAt >= 0 ? rest[cubeAt + 1] : undefined;
    const dirs = rest.filter((x, i) => i !== cubeAt && i !== cubeAt + 1);
    if (!cube || !CUBE_ID.test(cube) || dirs.length === 0) { console.error('usage: node tools/draft-decks.mjs import <var/match/m…> [...] --cube <id>'); return 2; }
    let names = null;
    const doc = join(repo, 'cubes');
    if (existsSync(doc)) {
      const { readdirSync } = await import('node:fs');
      const { parseCube } = await import('./cubelab/cube.ts');
      for (const f of readdirSync(doc).filter((x) => x.endsWith('.md'))) {
        if (f.replace(/-cube-\d+\.md$|\.md$/, '') !== cube) continue;
        names = new Set(parseCube(readFileSync(join(doc, f), 'utf8')).cards.map((c) => c.name.toLowerCase()));
      }
    }
    let added = 0;
    for (const d of dirs) {
      const abs = resolve(repo, d);
      if (!realInside(resolve(repo, 'var'), abs)) { console.error(`draft-decks: ${d} is not under var/`); return 2; }
      for (const m of importMatch({ store, dir: abs, cube, names })) {
        console.log(`${d}/${m.file}: ${m.what}`);
        if (m.added) added++;
      }
    }
    console.log(`${added} deck(s) added to ${store.file}`);
    return 0;
  }
  if (cmd === 'withdraw') {
    if (!rest.length || rest.some((k) => !/^(room|table|solo):[A-Za-z0-9_:-]{1,120}$/.test(k))) { console.error('usage: node tools/draft-decks.mjs withdraw <key> [...]   (list --keys prints them)'); return 2; }
    const n = store.withdraw(rest);
    console.log(`${n} line(s) deleted from ${store.file}`);
    return 0;
  }
  console.error('usage: node tools/draft-decks.mjs list [--keys] | import <var/match/m…> [...] --cube <id> | withdraw <key> [...]');
  return 2;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => { console.error(`draft-decks: ${e.message}`); process.exit(1); });
}
