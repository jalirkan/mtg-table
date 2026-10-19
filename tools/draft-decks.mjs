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
// ONE FILE, APPEND ONLY: var/draft-decks/decks.jsonl (mode 600, folder 700, its real
// path under var/).  One JSON object a line:
//
//   {"v":1,"at":"<ISO>","source":"room","key":"room:<roomId>:<seat>","cubeId":"omega",
//    "cubeHash":"<hex>","format":"grid","main":[[1,"Card"],...,[17,"Plains"]]}
//   {"v":1,"at":"<ISO>","source":"solo","key":"solo:<draftId>","cubeId":"omega",
//    "format":"grid"|"winston"|"booster","main":[[n,"Card"],...]}
//   {"v":1,"at":"<ISO>","source":"room","key":"room:<roomId>:<seat>","cubeId":"omega","withdrawn":true}
//
// A later line with the same key REPLACES the earlier one (a deck handed in again
// between games is the same draft's final deck, sideboarded); a `withdrawn` line takes
// the key out.  Only the main deck is kept -- the sideboard says nothing about the
// colours played.  No player name, no token, no deck name.
//
// WHERE A LINE COMES FROM:
//
//   - a draft room seat (D400/D404) that hands in a deck WITH ITS OWN CONSENT TO
//     RECORDING ON (D407's per-seat `record`, as it stands when the deck goes in):
//     draft-room.mjs calls `onDeck`, and this store writes the line.  A seat whose
//     consent is off writes nothing -- and, if it had a line, a `withdrawn` one.  The
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
//        when that file exists.  The same deck imported twice is one line.
//
// Run from the repo root (hard rule 9).  Self-test: tools/draft-decks-selftest.mjs
// (gate 12f, CI).

import { createHash } from 'node:crypto';
import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDeck, realInside } from './match-launcher.mjs';

export const DRAFT_DECKS_VERSION = 1;
export const DRAFT_DECKS_DIR = 'var/draft-decks';
export const LEDGER_FILE = 'decks.jsonl';
export const MAX_DRAFT_DECK_BODY = 16 * 1024;
export const MAX_LEDGER_BYTES = 32 * 1024 * 1024;
export const FORMATS = ['grid', 'winston', 'booster'];
export const SOURCES = ['room', 'solo'];
export const COLOURS = ['W', 'U', 'B', 'R', 'G'];
const CUBE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;   // draft-room.mjs's, and a custom cube's my-<slug>
const DRAFT_ID = /^[A-Za-z0-9_-]{1,80}$/;
const ROOM_ID = /^r[A-Za-z0-9_-]{4,16}$/;
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

/**
 * The store.  opts: { dir (the ledger's folder), varRoot (its real path must stay inside), scriptOf
 * (() => lookup | null, called once, lazily), now, log, maxBytes }.
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
  const read = () => (existsSync(file) ? readFileSync(file, 'utf8') : '');
  const append = (line) => {
    if (!inside()) return { status: 500, body: { ok: false, type: 'error', message: 'the draft-deck folder is not where it should be' } };
    const text = JSON.stringify(line) + '\n';
    const size = existsSync(file) ? statSync(file).size : 0;
    if (size + Buffer.byteLength(text) > maxBytes) return { status: 507, body: { ok: false, type: 'error', message: `the draft-deck ledger is full (${Math.round(size / 1048576)} MB): move ${file} aside` } };
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    appendFileSync(file, text, { mode: 0o600 });
    try { chmodSync(file, 0o600); } catch { /* best effort */ }
    return null;
  };
  const has = (key) => foldLedger(read()).some((l) => l.key === key);
  const iso = () => new Date(now()).toISOString();
  return {
    file,
    health: () => ({ draftDecks: 1 }),
    /** D455: a room seat handed in a deck (draft-room.mjs onDeck).  Written only with that seat's consent. */
    recordRoom({ roomId, seat, cubeId, cubeHash, format = 'grid', main, record }) {
      if (!ROOM_ID.test(String(roomId)) || (seat !== 0 && seat !== 1) || !CUBE_ID.test(String(cubeId))) return false;
      const key = `room:${roomId}:${seat}`;
      if (!record) {
        if (!has(key)) return false;
        const fail = append({ v: DRAFT_DECKS_VERSION, at: iso(), source: 'room', key, cubeId, withdrawn: true });
        if (!fail) log(`DRAFT-DECKS room ${roomId} seat ${seat} opted out: its deck taken out of the ledger`);
        return !fail;
      }
      const line = { v: DRAFT_DECKS_VERSION, at: iso(), source: 'room', key, cubeId, ...(typeof cubeHash === 'string' ? { cubeHash } : {}), format, main: main.map(([n, card]) => [n, card]) };
      const fail = append(line);
      if (fail) { log(`DRAFT-DECKS room ${roomId} seat ${seat}: not recorded (${fail.body.message})`); return false; }
      log(`DRAFT-DECKS room ${roomId} seat ${seat}: its deck recorded for cube ${cubeId} (D455, with its consent)`);
      return true;
    },
    /** POST /draft-deck: {status, body}. */
    postSolo(body) {
      const c = checkSoloBody(body, iso());
      if (c.problems) return { status: 400, body: { ok: false, type: 'error', message: c.problems[0], problems: c.problems } };
      const replaced = has(c.line.key);
      const fail = append(c.line);
      if (fail) return fail;
      log(`DRAFT-DECKS ${c.line.key}: a deck for cube ${c.line.cubeId}${replaced ? ' (replaces the earlier one)' : ''}`);
      return { status: 201, body: { ok: true, key: c.line.key, replaced } };
    },
    /** GET /draft-decks?cube=<id>: {status, body}, aggregate only. */
    shares(cube) {
      if (typeof cube !== 'string' || !CUBE_ID.test(cube)) return { status: 400, body: { ok: false, type: 'error', message: '?cube= must be a cube id (lowercase letters, digits, dashes)' } };
      const s = scripts();
      const decks = foldLedger(read()).filter((l) => l.cubeId === cube).map((l) => ({
        source: l.source, day: String(l.at).slice(0, 10), format: FORMATS.includes(l.format) ? l.format : null, ...makeupOf(l.main, s, memo),
      }));
      const order = (d) => `${d.day}|${d.source}|${COLOURS.map((c) => String(d.spells[c]).padStart(3, '0')).join('')}|${d.colourless}|${d.lands}|${d.unread}`;
      decks.sort((a, b) => (order(a) < order(b) ? -1 : order(a) > order(b) ? 1 : 0));
      return { status: 200, body: { ok: true, v: DRAFT_DECKS_VERSION, cube, scripts: !!s, decks } };
    },
    /** Every deck's cube and source, for `list`: [{cubeId, source, day}]. */
    summary: () => foldLedger(read()).map((l) => ({ cubeId: l.cubeId, source: l.source, day: String(l.at).slice(0, 10) })),
    /** `import`: a line made elsewhere (its key already chosen); false when that key is already there. */
    importLine(line) {
      if (has(line.key)) return false;
      const fail = append(line);
      if (fail) throw new Error(fail.body.message);
      return true;
    },
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
    const at = new Date(statSync(p).mtimeMs).toISOString();
    const line = room
      ? { v: DRAFT_DECKS_VERSION, at, source: 'room', key: `room:import-${sha}`, cubeId: cube, format: 'grid', main: list }
      : { v: DRAFT_DECKS_VERSION, at, source: 'solo', key: `solo:import-${sha}`, cubeId: cube, format: null, main: list };
    const fresh = store.importLine(line);
    out.push({ file, what: fresh ? `imported (${line.source})` : 'already there', added: fresh });
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
  console.error('usage: node tools/draft-decks.mjs list | import <var/match/m…> [...] --cube <id>');
  return 2;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => { console.error(`draft-decks: ${e.message}`); process.exit(1); });
}
