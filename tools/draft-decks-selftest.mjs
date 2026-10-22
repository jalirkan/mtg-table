#!/usr/bin/env node
// mtg-table — tools/draft-decks-selftest.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The draft-deck ledger's self-test (D455; gate step 12f, CI).  It holds:
//
//   1. a card's colours from its script, the lab census's rule (printed colours and
//      every cost symbol's; a split card's two halves, any other card's front; a land
//      front is a land), on hand-written scripts, and on Forge's own zip where this
//      checkout has one;
//   2. a deck's makeup (basics, gold in each colour, colourless, unread) and the
//      ledger's fold (a later line of a key replaces it, `withdrawn` takes it out);
//   3. the store: POST /draft-deck's body checks, the 600 file under var/, a full
//      ledger, and GET's answer -- colour counts only, never a card name, a key, a
//      room id or a time of day;
//   4. the draft room: a seat's handed-in deck reaches the ledger only with that
//      seat's consent (D407); an opt-out after hand-in DELETES its lines from the
//      file (no card of it left on disk), past a full ledger's cap, and a rewrite
//      that fails is an ERROR and still stops it being served; an opt-in puts it
//      back; the room never throws when the ledger does;
//   5. the helper's door: both routes behind it (a foreign Origin, a tunnel's header,
//      405s, 413), /health's "draftDecks": 1 -- with a fake `claude` first on PATH;
//   6. `import`: a table game's consenting seats only, keyed `table:<matchId>:<seat>`
//      and dated by the match id, so the room's own seat can withdraw it; a Draft vs
//      Bot match's you.dck (never ai.dck); a deck outside the cube refused; the same
//      deck once; a withdrawn key never imported again (withdrawn.txt, keys only); `withdraw`
//      by key.
//   7. one writer at a time: decks.lock, waited for, taken over from a dead or stale
//      holder, never left behind; another process holding it delays a write, loses none;
//      two writers that both find a dead holder end with exactly one inside (the #174
//      review); the helper's *Async methods wait on a timer (its event loop runs) and
//      in the order they were asked.
//
// Its files are under var/draft-decks-selftest/.  No network, no engine, no claude.

import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startHelper } from './coach-helper.mjs';
import { applyPick, checkCreate, createRoomStore, lineCards } from './draft-room.mjs';
import {
  MAX_DRAFT_DECK_BODY, checkSoloBody, createDraftDecks, dckMain, foldLedger, importMatch, makeupOf, scriptMakeup, withLedgerLock,
} from './draft-decks.mjs';
import { CARDS_ZIP, openForgeScripts } from './forge-scripts.ts';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const VAR = join(ROOT, 'var', 'draft-decks-selftest');
const ORIGINS = ['http://127.0.0.1:*', 'http://localhost:*', 'https://jalirkan.github.io'];
let checks = 0;
let failed = 0;
const ok = (cond, what) => {
  checks++;
  if (cond) console.log(`  ok    ${what}`);
  else { failed++; console.log(`  FAIL  ${what}`); }
};
const eq = (a, b, what) => ok(JSON.stringify(a) === JSON.stringify(b), what + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` (got ${JSON.stringify(a)?.slice(0, 300)}, want ${JSON.stringify(b)?.slice(0, 300)})`));
const section = (s) => console.log(`\n== ${s}`);

rmSync(VAR, { recursive: true, force: true });
mkdirSync(VAR, { recursive: true });

// Hand-written scripts in Forge's own form (the shapes 2.0.14's zip has).
const SCRIPTS = new Map([
  ['Thalia, Guardian of Thraben', 'Name:Thalia, Guardian of Thraben\nManaCost:1 W\nTypes:Legendary Creature Human Soldier\n'],
  ['Kitchen Finks', 'Name:Kitchen Finks\nManaCost:1 GW GW\nTypes:Creature Ouphe\n'],
  ['Birthing Pod', 'Name:Birthing Pod\nManaCost:3 GP\nTypes:Artifact\n'],
  ['Ancestral Vision', 'Name:Ancestral Vision\nManaCost:no cost\nColors:blue\nTypes:Sorcery\n'],
  ['Fire', 'Name:Fire\nManaCost:1 R\nTypes:Instant\nAlternateMode:Split\nALTERNATE\nName:Ice\nManaCost:1 U\nTypes:Instant\n'],
  ['Bonecrusher Giant', 'Name:Bonecrusher Giant\nManaCost:2 R\nTypes:Creature Giant\nAlternateMode:Adventure\nALTERNATE\nName:Stomp\nManaCost:1 W\nTypes:Instant Adventure\n'],
  ['Delver of Secrets', 'Name:Delver of Secrets\nManaCost:U\nTypes:Creature Human Wizard\nAlternateMode:DoubleFaced\nALTERNATE\nName:Insectile Aberration\nManaCost:no cost\nColors:blue\nTypes:Creature Human Insect\n'],
  ["Emeria's Call", "Name:Emeria's Call\nManaCost:4 W W W\nTypes:Sorcery\nAlternateMode:Modal\nALTERNATE\nName:Emeria, Shattered Skyclave\nManaCost:no cost\nTypes:Land\n"],
  ['Dryad Arbor', 'Name:Dryad Arbor\nManaCost:no cost\nColors:green\nTypes:Land Creature Forest Dryad\n'],
  ['Polluted Delta', 'Name:Polluted Delta\nManaCost:no cost\nTypes:Land\n'],
  ['Lotus Petal', 'Name:Lotus Petal\nManaCost:0\nTypes:Artifact\n'],
  ['Ghostfire', 'Name:Ghostfire\nManaCost:2 R\nColors:colorless\nTypes:Instant\n'],
  ['Lightning Helix', 'Name:Lightning Helix\nManaCost:R W\nTypes:Instant\n'],
  ['Reaper King', 'Name:Reaper King\nManaCost:2W 2U 2B 2R 2G\nTypes:Legendary Artifact Creature Scarecrow\n'],
]);
const scriptOf = (n) => SCRIPTS.get(n) ?? null;

// ---------------------------------------------------------------------------
section('1. a card\'s colours from its script (the census rule, D447)');
eq(scriptMakeup(SCRIPTS.get('Thalia, Guardian of Thraben')), { land: false, colours: 'W' }, 'a plain pip: its colour');
eq(scriptMakeup(SCRIPTS.get('Kitchen Finks')), { land: false, colours: 'WG' }, 'a hybrid pip: both colours, WUBRG order');
eq(scriptMakeup(SCRIPTS.get('Birthing Pod')), { land: false, colours: 'G' }, 'a Phyrexian pip: its colour');
eq(scriptMakeup(SCRIPTS.get('Ancestral Vision')), { land: false, colours: 'U' }, 'no cost, a colour indicator: the printed colour');
eq(scriptMakeup(SCRIPTS.get('Fire')), { land: false, colours: 'UR' }, 'a split card: both halves');
eq(scriptMakeup(SCRIPTS.get('Bonecrusher Giant')), { land: false, colours: 'R' }, 'an adventure: the front only');
eq(scriptMakeup(SCRIPTS.get('Delver of Secrets')), { land: false, colours: 'U' }, 'a transforming card: the front only');
eq(scriptMakeup(SCRIPTS.get("Emeria's Call")), { land: false, colours: 'W' }, 'a modal double-faced spell // land: a spell (its front)');
eq(scriptMakeup(SCRIPTS.get('Dryad Arbor')), { land: true, colours: 'G' }, 'a land creature: a land');
eq(scriptMakeup(SCRIPTS.get('Lotus Petal')), { land: false, colours: '' }, 'a cost of 0: colourless');
eq(scriptMakeup(SCRIPTS.get('Ghostfire')), { land: false, colours: 'R' }, 'printed colourless with a red pip: red (printed colours AND pips, as the census)');
eq(scriptMakeup(SCRIPTS.get('Reaper King')), { land: false, colours: 'WUBRG' }, 'two-brid pips: every colour named');
const real = openForgeScripts(join(ROOT, CARDS_ZIP));
if (real) {
  for (const n of ['Thalia, Guardian of Thraben', 'Kitchen Finks', 'Birthing Pod', 'Ancestral Vision', 'Bonecrusher Giant', 'Delver of Secrets', "Emeria's Call", 'Dryad Arbor', 'Polluted Delta', 'Lotus Petal']) {
    eq(scriptMakeup(real.scriptOf(n) ?? ''), scriptMakeup(SCRIPTS.get(n)), `Forge's own script of ${n} reads the same`);
  }
  eq(makeupOf([[1, 'Fire // Ice']], (n) => real.scriptOf(n)).spells, { W: 0, U: 1, B: 0, R: 1, G: 0 }, 'a split card listed "Fire // Ice": found by its first half, both colours');
} else {
  console.log('  skip  Forge\'s own scripts: this checkout has no forge-home/res (./tools/make-forge-home.sh)');
}

// ---------------------------------------------------------------------------
section('2. a deck\'s makeup, and the ledger\'s fold');
const DECK = [[1, 'Thalia, Guardian of Thraben'], [1, 'Kitchen Finks'], [2, 'Lightning Helix'], [1, 'Lotus Petal'], [1, 'Dryad Arbor'], [1, 'Polluted Delta'],
  [1, 'Not A Real Card'], [8, 'Plains'], [7, 'Mountain'], [1, 'Snow-Covered Forest'], [16, 'Birthing Pod']];
eq(makeupOf(DECK, scriptOf), { spells: { W: 4, U: 0, B: 0, R: 2, G: 17 }, colourless: 1, lands: 18, unread: 1 },
  'gold counts in each colour, a count of 2 counts twice, basics and land fronts are lands, a card with no script is unread');
eq(makeupOf(DECK, null), { spells: { W: 0, U: 0, B: 0, R: 0, G: 0 }, colourless: 0, lands: 16, unread: 24 }, 'with no scripts: basics are lands, everything else unread');
eq(makeupOf([[1, 'Thalia, Guardian of Thraben|DKA']], scriptOf).spells.W, 1, 'a card with a |SET suffix is read by its name');
const L = (o) => JSON.stringify({ v: 1, at: '2026-10-17T18:00:00.000Z', source: 'room', cubeId: 'omega', main: [[40, 'Plains']], ...o });
eq(foldLedger([L({ key: 'a', format: 'grid' }), L({ key: 'b' }), 'not json', L({ key: 'a', format: 'x' }), JSON.stringify({ v: 2, key: 'c', source: 'room', cubeId: 'omega', main: [] }), ''].join('\n')).map((l) => [l.key, l.format ?? null]),
  [['b', null], ['a', 'x']], 'a later line of a key replaces it (and moves it last); a bad line or another version is skipped');
eq(foldLedger([L({ key: 'a' }), L({ key: 'a', withdrawn: true, main: undefined })].join('\n')), [], 'a withdrawn line takes its key out');
eq(foldLedger([L({ key: 'a', withdrawn: true, main: undefined }), L({ key: 'a' })].join('\n')).length, 1, 'and a line after it puts it back');

// ---------------------------------------------------------------------------
section('3. the store: POST /draft-deck, the ledger file, GET\'s answer');
const MAIN = [[1, 'Thalia, Guardian of Thraben'], [1, 'Kitchen Finks'], [1, 'Lightning Helix'], [20, 'Birthing Pod'], [17, 'Plains']];
const body = (o = {}) => ({ cubeId: 'omega', draftId: 'draft-abc-123', format: 'grid', main: MAIN, ...o });
eq(checkSoloBody(body(), 'T').line, { v: 1, at: 'T', source: 'solo', key: 'solo:draft-abc-123', cubeId: 'omega', format: 'grid', main: MAIN }, 'a good body: its line');
for (const [o, why] of [
  [{ cubeId: 'Omega' }, 'a cube id with a capital'], [{ cubeId: '../x' }, 'a cube id with a path'], [{ draftId: 'a b' }, 'a draft id with a space'],
  [{ draftId: 'x'.repeat(81) }, 'a draft id of 81 characters'], [{ format: 'sealed' }, 'an unknown format'], [{ main: [[1, 'Plains']] }, 'a 1-card deck'],
  [{ main: [[40, 'Bad|[x]']] }, 'a card name with a bracket'], [{ name: 'My deck' }, 'a field it does not take (a deck name)'], [{ sideboard: [] }, 'a sideboard (only the main deck is kept)'],
]) ok(Array.isArray(checkSoloBody(body(o), 'T').problems), `refused: ${why}`);
ok(Array.isArray(checkSoloBody([1], 'T').problems) && Array.isArray(checkSoloBody(null, 'T').problems), 'refused: not an object');

const dir = join(VAR, 'ledger');
let t = Date.parse('2026-10-17T18:35:00Z');
const logs = [];
const store = createDraftDecks({ dir, varRoot: join(ROOT, 'var'), scriptOf: () => scriptOf, now: () => (t += 1000), log: (s) => logs.push(s) });
eq(store.shares('omega').body, { ok: true, v: 1, cube: 'omega', scripts: true, decks: [] }, 'no ledger yet: no decks');
const p1 = store.postSolo(body());
eq([p1.status, p1.body], [201, { ok: true, key: 'solo:draft-abc-123', replaced: false }], 'a deck against the bot: 201');
eq((statSync(store.file).mode & 0o777).toString(8), '600', 'the ledger is mode 600');
eq((statSync(dir).mode & 0o777).toString(8), '700', 'its folder is mode 700');
eq(store.postSolo(body({ main: [...MAIN.slice(0, 4), [16, 'Plains'], [1, 'Mountain']] })).body.replaced, true, 'the same draft again (rebuilt): replaces its deck');
eq(store.postSolo(body({ cubeId: 'vintage', draftId: 'draft-v' })).status, 201, 'another cube\'s deck');
eq(store.postSolo(body({ draftId: 'draft-two', main: [[23, 'Ancestral Vision'], [17, 'Island']] })).status, 201, 'a second omega draft');
eq(store.postSolo(body({ format: 'nope' })).status, 400, 'a bad body: 400');
const g = store.shares('omega');
eq(g.status, 200, 'GET: 200');
eq(g.body.decks, [
  { source: 'solo', day: '2026-10-17', format: 'grid', spells: { W: 0, U: 23, B: 0, R: 0, G: 0 }, colourless: 0, lands: 17, unread: 0 },
  { source: 'solo', day: '2026-10-17', format: 'grid', spells: { W: 3, U: 0, B: 0, R: 1, G: 21 }, colourless: 0, lands: 17, unread: 0 },
], 'GET: the cube\'s two decks, the rebuilt one as rebuilt, as colour counts, sorted by day then makeup');
const wire = JSON.stringify(g.body);
ok(!/Thalia|Kitchen|Helix|Pod|Vision|Plains|Island/.test(wire), 'GET carries no card name');
ok(!/draft-abc|draft-two|solo:|T18:|\.000Z/.test(wire), 'GET carries no key, no draft id and no time of day');
eq(store.shares('vintage').body.decks.length, 1, 'GET of another cube: its own decks only');
eq(store.shares('../etc').status, 400, 'GET with a bad cube id: 400');
eq(store.shares(null).status, 400, 'GET with no cube: 400');
const small = createDraftDecks({ dir: join(VAR, 'small'), varRoot: join(ROOT, 'var'), maxBytes: 300 });
eq(small.postSolo(body()).status, 201, 'a small ledger takes one deck');
eq(small.postSolo(body({ draftId: 'x2' })).status, 507, 'and past its size: 507');
let threw = false;
try { createDraftDecks({ dir: join(ROOT, 'docs'), varRoot: join(ROOT, 'var') }); } catch { threw = true; }
ok(threw, 'a ledger folder outside var/ is refused');
const noScripts = createDraftDecks({ dir: join(VAR, 'noscripts'), varRoot: join(ROOT, 'var'), scriptOf: () => { throw new Error('no zip'); } });
noScripts.postSolo(body());
eq([noScripts.shares('omega').body.scripts, noScripts.shares('omega').body.decks[0].unread], [false, 23], 'no card scripts: "scripts": false, every nonbasic unread, nothing thrown');

// ---------------------------------------------------------------------------
section('4. the draft room: a seat\'s deck reaches the ledger only with its consent (D407)');
{
  const cards = Array.from({ length: 180 }, (_, i) => (i % 3 === 0 ? 'Thalia, Guardian of Thraben' : i % 3 === 1 ? 'Lightning Helix' : 'Birthing Pod') + (i < 3 ? '' : ` ${i}`));
  const fake = new Map(SCRIPTS);
  for (const c of cards) if (!fake.has(c)) fake.set(c, SCRIPTS.get(c.replace(/ \d+$/, '')).replace(/^Name:.*$/m, `Name:${c}`));
  const rl = createDraftDecks({ dir: join(VAR, 'room-ledger'), varRoot: join(ROOT, 'var'), scriptOf: () => (n) => fake.get(n) ?? null });
  const roomLog = [];
  const rs = createRoomStore({ dir: null, log: (s) => roomLog.push(s), startGame: null, onDeck: (d) => rl.recordRoom(d) });
  const made = rs.create((() => { const c = {}; checkCreate({ cubeId: 'omega', cards, name: 'Justin', firstSeat: 0, record: true }, c); return c; })());
  const rid = made.body.id;
  rs.join(rid, 1, 'Evan');
  for (let v = rs.view(rid, 0); !v.done; v = rs.view(rid, 0)) {
    const line = [0, 1, 2, 3, 4, 5].find((l) => l !== v.firstLine && lineCards(v.slots, l).length > 0);
    rs.pick(rid, v.toAct, line, v.version);
  }
  const v0 = rs.view(rid, 0);
  const pk = [v0.seats[0].picks, v0.seats[1].picks];
  const deck = (p) => ({ name: 'Evan’s Omega deck', main: [...p.slice(0, 23).map((c) => [1, c]), [17, 'Plains']] });
  rs.record(rid, 1, false);
  eq(rs.deck(rid, 1, deck(pk[1])).state?.decks?.[1]?.ready, true, 'seat 1 (opted out) hands in its deck: the room takes it');
  eq(rl.shares('omega').body.decks.length, 0, '... and the ledger has nothing of it');
  rs.deck(rid, 0, deck(pk[0]));
  const after0 = rl.shares('omega').body.decks;
  eq(after0.map((d) => [d.source, d.format, d.lands, d.unread, d.spells.U, d.spells.B]), [['room', 'grid', 17, 0, 0, 0]], 'seat 0 (consenting) hands in: one room deck in the ledger, its 17 lands and its spells read');
  const disk = readFileSync(rl.file, 'utf8');
  ok(!disk.includes('Justin') && !disk.includes('Evan') && !disk.includes(made.body.token), 'the ledger holds no player name, no deck name and no token');
  ok(disk.includes(`"key":"room:${rid}:0"`) && disk.includes('"cubeHash"'), 'its line is keyed by room and seat, with the cube\'s hash');
  rs.deck(rid, 0, deck(pk[0]));   // handed in again (sideboarded): a second line of the same key
  eq(readFileSync(rl.file, 'utf8').split('\n').filter(Boolean).length, 2, 'a deck handed in again appends a second line of its key');
  rs.record(rid, 0, false);
  eq(rl.shares('omega').body.decks.length, 0, 'seat 0 opts out after handing in: its deck is no longer served');
  eq(readFileSync(rl.file, 'utf8'), '', '... and every line of it is DELETED from the file (no withdrawn line, no card left on disk)');
  eq((statSync(rl.file).mode & 0o777).toString(8), '600', 'the rewritten ledger is still mode 600');
  ok(!require_tmp(join(VAR, 'room-ledger')), 'no temp file left behind');
  rs.record(rid, 1, true);
  eq(rl.shares('omega').body.decks.length, 1, 'seat 1 opts in with its deck in the room: its deck is in');
  rs.deck(rid, 1, { ...deck(pk[1]), record: false });
  eq(rl.shares('omega').body.decks.length, 0, 'a deck handed in with "record": false takes the seat\'s deck out again');
  // A full ledger: a new deck is refused (507), an opt-out is not.
  const fullL = createDraftDecks({ dir: join(VAR, 'full-ledger'), varRoot: join(ROOT, 'var'), maxBytes: 1, scriptOf: () => scriptOf });
  mkdirSync(join(VAR, 'full-ledger'), { recursive: true });
  writeFileSync(join(VAR, 'full-ledger', 'decks.jsonl'), JSON.stringify({ v: 1, at: '2026-10-17T00:00:00Z', source: 'room', key: 'room:rFULL1:1', cubeId: 'omega', main: [[23, 'Ancestral Vision'], [17, 'Island']] }) + '\n', { mode: 0o600 });
  eq(fullL.postSolo(body()).status, 507, 'a full ledger refuses a new deck (507)');
  eq(fullL.recordRoom({ roomId: 'rFULL1', seat: 1, cubeId: 'omega', record: false }), true, '... but a seat\'s opt-out still goes through');
  eq([readFileSync(fullL.file, 'utf8'), fullL.shares('omega').body.decks.length], ['', 0], '... its line deleted and nothing served');
  // A rewrite that fails: loud, and the deck still stops being served.
  const brokenDir = join(VAR, 'broken-ledger');
  const errs = [];
  const broken = createDraftDecks({ dir: brokenDir, varRoot: join(ROOT, 'var'), scriptOf: () => scriptOf, log: (x) => errs.push(x) });
  broken.recordRoom({ roomId: 'rBROKE1', seat: 1, cubeId: 'omega', main: [[23, 'Ancestral Vision'], [17, 'Island']], record: true });
  // The rename fails (an injected fs: chmod would not stop root, and the cloud's gate runs as root).
  let failRename = false;
  const sameDir = createDraftDecks({ dir: brokenDir, varRoot: join(ROOT, 'var'), scriptOf: () => scriptOf, log: (x) => errs.push(x),
    fs: { renameSync: (a, b) => { if (failRename && String(b).endsWith('decks.jsonl')) throw Object.assign(new Error('EIO: injected'), { code: 'EIO' }); return renameSync(a, b); } } });
  failRename = true;
  let threwW = false;
  try { sameDir.recordRoom({ roomId: 'rBROKE1', seat: 1, cubeId: 'omega', record: false }); } catch { threwW = true; }
  failRename = false;
  ok(threwW && errs.some((x) => /ERROR .*could NOT be deleted/.test(x)), 'a deletion whose rename fails throws and is logged as an ERROR');
  eq(sameDir.shares('omega').body.decks.length, 0, '... and the deck is not served by this process any more');
  eq(broken.shares('omega').body.decks.length, 0, '... nor by another process reading the same ledger (its key is on the withdrawn list)');
  ok(!require_tmp(brokenDir) && !existsSync(join(brokenDir, 'decks.lock')), '... with no temp file and no lock left behind');
  eq(sameDir.withdraw(['room:rBROKE1:1']), 1, 'withdrawing it again once the disk is well: the line deleted');
  // A withdrawal is remembered: withdrawn.txt holds the keys, never a card, and an opt-in clears its own key.
  const tomb = readFileSync(join(VAR, 'room-ledger', 'withdrawn.txt'), 'utf8');
  ok(tomb.includes(`room:${rid}:0`) && !/Thalia|Helix|Pod|Plains/.test(tomb), 'withdrawn.txt holds the opted-out key, and no card');
  eq((statSync(join(VAR, 'room-ledger', 'withdrawn.txt')).mode & 0o777).toString(8), '600', 'withdrawn.txt is mode 600');
  const back = createDraftDecks({ dir: join(VAR, 'optin-ledger'), varRoot: join(ROOT, 'var'), scriptOf: () => scriptOf });
  back.recordRoom({ roomId: 'rOPTIN1', seat: 0, cubeId: 'omega', main: MAIN, record: true });
  back.recordRoom({ roomId: 'rOPTIN1', seat: 0, cubeId: 'omega', record: false, matchIds: ['m1792262156023'] });
  eq(back.withdrawnKeys().sort(), ['room:rOPTIN1:0', 'table:m1792262156023:0'], 'an opt-out remembers the room key and its games\' table keys');
  back.recordRoom({ roomId: 'rOPTIN1', seat: 0, cubeId: 'omega', main: MAIN, record: true });
  eq([back.withdrawnKeys(), back.shares('omega').body.decks.length], [['table:m1792262156023:0'], 1], 'opting in again: the room key comes off the list and its deck is served; the imported table key stays withdrawn');
  const angry = createRoomStore({ dir: null, log: () => {}, onDeck: () => { throw new Error('disk full'); } });
  const m2 = angry.create((() => { const c = {}; checkCreate({ cubeId: 'omega', cards, name: 'A', firstSeat: 0, record: true }, c); return c; })());
  angry.join(m2.body.id, 1, 'B');
  for (let v = angry.view(m2.body.id, 0); !v.done; v = angry.view(m2.body.id, 0)) {
    const line = [0, 1, 2, 3, 4, 5].find((l) => l !== v.firstLine && lineCards(v.slots, l).length > 0);
    angry.pick(m2.body.id, v.toAct, line, v.version);
  }
  const p = angry.view(m2.body.id, 0).seats[0].picks;
  eq(angry.deck(m2.body.id, 0, deck(p)).state?.decks?.[0]?.ready, true, 'a ledger that throws never stops a deck going into the room');
  void applyPick;
}

// ---------------------------------------------------------------------------
section('5. the helper\'s door (a fake claude on PATH)');
{
  const bin = join(VAR, 'bin');
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, 'claude'), '#!/bin/sh\necho "0.0.0 (fake)"\n');
  chmodSync(join(bin, 'claude'), 0o755);
  process.env.PATH = `${bin}:${process.env.PATH}`;
  const hs = createDraftDecks({ dir: join(VAR, 'helper-ledger'), varRoot: join(ROOT, 'var'), scriptOf: () => scriptOf });
  const h = startHelper({ port: 0, lan: false, token: '', wsPort: 8642, origins: ORIGINS, timeoutS: 5, draftDecks: hs, log: () => {} });
  const port = await h.listen();
  const off = startHelper({ port: 0, lan: false, token: '', wsPort: 8642, origins: ORIGINS, timeoutS: 5, log: () => {} });
  const offPort = await off.listen();
  try {
    eq((await call(port, '/health', { method: 'GET' })).json?.draftDecks, 1, '/health says "draftDecks": 1');
    eq((await call(offPort, '/health', { method: 'GET' })).json?.draftDecks, undefined, 'a helper without the ledger has no key');
    eq((await call(offPort, '/draft-decks?cube=omega', { method: 'GET' })).status, 404, '... and 404 on its routes');
    const gh = { Origin: 'https://jalirkan.github.io' };
    const posted = await call(port, '/draft-deck', { headers: gh, body: body() });
    eq([posted.status, posted.json?.key], [201, 'solo:draft-abc-123'], 'POST /draft-deck from github.io\'s page: 201');
    eq(posted.headers['access-control-allow-origin'], 'https://jalirkan.github.io', 'the allowed origin is echoed');
    const got = await call(port, '/draft-decks?cube=omega', { method: 'GET', headers: gh });
    eq([got.status, got.json?.decks?.length, got.json?.decks?.[0]?.spells], [200, 1, { W: 3, U: 0, B: 0, R: 1, G: 21 }], 'GET /draft-decks?cube=omega: the deck as colour counts');
    ok(!/Thalia|Pod|Plains|draft-abc/.test(got.text), 'GET\'s body names no card and no draft');
    eq((await call(port, '/draft-decks?cube=omega', { method: 'GET', headers: { Origin: 'https://evil.example' } })).status, 403, 'a foreign page: 403');
    eq((await call(port, '/draft-decks?cube=omega', { method: 'GET', headers: { 'CF-Connecting-IP': '198.51.100.1' } })).status, 403, 'a tunnel\'s request: 403');
    eq((await call(port, '/draft-decks?cube=omega', { method: 'GET', headers: { Host: 'pc.tail1234.ts.net' } })).status, 403, 'a tunnel\'s Host: 403');
    eq((await call(port, '/draft-deck', { headers: { Origin: 'https://evil.example' }, body: body() })).status, 403, 'a foreign page cannot add a deck');
    eq((await call(port, '/draft-decks', { body: body() })).status, 405, 'POST /draft-decks: 405');
    eq((await call(port, '/draft-deck', { method: 'GET' })).status, 405, 'GET /draft-deck: 405');
    eq((await call(port, '/draft-deck', { body: 'not json' })).status, 400, 'a body that is not JSON: 400');
    eq((await call(port, '/draft-deck', { headers: { 'Content-Length': String(MAX_DRAFT_DECK_BODY + 1) } })).status, 413, 'a body over 16 KB: 413');
    eq((await call(port, '/draft-decks?cube=Bad', { method: 'GET' })).status, 400, 'GET with a bad cube id: 400');
  } finally { h.close(); off.close(); }
}

// ---------------------------------------------------------------------------
section('6. import: a recorded table game\'s consenting seats, a Draft vs Bot match\'s own deck');
{
  const dck = (name, main) => `[metadata]\nName=${name}\n[main]\n${main.map(([n, c]) => `${n} ${c}`).join('\n')}\n[sideboard]\n1 Lightning Helix\n`;
  const table = join(VAR, 'match', 'm1792262156023');
  const table2 = join(VAR, 'match', 'm1792263293677');
  const solo = join(VAR, 'match', 'm1792253448450');
  for (const d of [table, table2, solo]) mkdirSync(d, { recursive: true });
  for (const d of [table, table2]) {
    writeFileSync(join(d, 'seats.json'), JSON.stringify({ names: ['Justin', 'Evan'], tokenSha256: ['a', 'b'], record: [true, false] }));
    writeFileSync(join(d, 'seat0.dck'), dck('Justin’s Omega Cube deck', MAIN));
    writeFileSync(join(d, 'seat1.dck'), dck('Evan’s Omega Cube deck', [[23, 'Ancestral Vision'], [17, 'Island']]));
  }
  writeFileSync(join(solo, 'you.dck'), dck('Practice draft - Rakdos', [[23, 'Lightning Helix'], [17, 'Mountain']]));
  writeFileSync(join(solo, 'ai.dck'), dck('AI Drafter', [[23, 'Kitchen Finks'], [17, 'Forest']]));
  eq(dckMain(readFileSync(join(table, 'seat0.dck'), 'utf8')), MAIN, 'a .dck\'s main section, the sideboard left out');
  const il = createDraftDecks({ dir: join(VAR, 'import-ledger'), varRoot: join(ROOT, 'var'), scriptOf: () => scriptOf });
  const names = new Set(['thalia, guardian of thraben', 'kitchen finks', 'lightning helix', 'birthing pod', 'ancestral vision']);
  const r1 = importMatch({ store: il, dir: table, cube: 'omega', names });
  eq(r1.map((m) => [m.file, m.added]), [['seat0.dck', true], ['seat1.dck', false]], 'a table game: the consenting seat imported, the other skipped');
  const first = JSON.parse(readFileSync(il.file, 'utf8').split('\n')[0]);
  eq([first.key, first.at.slice(0, 10)], ['table:m1792262156023:0', '2026-10-17'], 'keyed table:<matchId>:<seat>, dated by the match id');
  ok(/did not agree/.test(r1[1].what), 'it says why the other was skipped');
  eq(importMatch({ store: il, dir: table2, cube: 'omega', names }).map((m) => m.added), [false, false], 'game 2 of the same match (the same deck): nothing twice');
  eq(importMatch({ store: il, dir: solo, cube: 'omega', names }).map((m) => [m.file, m.added]), [['you.dck', true]], 'a Draft vs Bot match: your deck, never the AI\'s');
  eq(il.shares('omega').body.decks.map((d) => d.source).sort(), ['room', 'solo'], 'both in GET, as a room deck and a solo one');
  eq(importMatch({ store: il, dir: solo, cube: 'vintage', names: new Set(['kitchen finks']) })[0].added, false, 'a deck with a card outside the cube\'s list: refused');
  ok(!readFileSync(il.file, 'utf8').includes('Practice draft') && !readFileSync(il.file, 'utf8').includes('Justin'), 'the ledger keeps no deck name and no player name');
  // The room that played that match: its seat 0 opts out, and the imported line goes with it.
  eq(il.recordRoom({ roomId: 'rROOM01', seat: 1, cubeId: 'omega', record: false, matchIds: ['m1792262156023', 'm1792263293677'] }), false, 'the other seat opting out removes nothing of seat 0');
  eq(il.recordRoom({ roomId: 'rROOM01', seat: 0, cubeId: 'omega', record: false, matchIds: ['m1792262156023', 'm1792263293677'] }), true, 'the room\'s seat 0 opting out removes its imported table line');
  eq(il.shares('omega').body.decks.map((d) => d.source), ['solo'], '... leaving the solo deck');
  ok(!readFileSync(il.file, 'utf8').includes('Thalia'), '... and none of its cards on disk');
  const again = importMatch({ store: il, dir: table, cube: 'omega', names });
  eq(again.map((m) => [m.file, m.added]), [['seat0.dck', false], ['seat1.dck', false]], 'importing that match again (seats.json still says yes): the withdrawn seat is NOT re-added');
  ok(/was withdrawn/.test(again[0].what), '... and it says why');
  ok(!readFileSync(il.file, 'utf8').includes('Thalia'), '... nothing of it on disk');
  eq(il.withdraw(['solo:nothing-here']), 0, 'withdraw of an unknown key: nothing removed');
  const soloKey = il.summary()[0].key;
  eq(il.withdraw([soloKey]), 1, '`withdraw <key>`: the line removed');
  eq(readFileSync(il.file, 'utf8'), '', '... and the ledger is empty');
}

// ---------------------------------------------------------------------------
section('7. one writer at a time: decks.lock, between the CLI and the helper');
{
  const ld = join(VAR, 'lock-ledger');
  const lockPath = join(ld, 'decks.lock');
  const st = createDraftDecks({ dir: ld, varRoot: join(ROOT, 'var'), scriptOf: () => scriptOf, lockWaitMs: 300 });
  eq(st.postSolo(body({ draftId: 'lock-1' })).status, 201, 'a deck goes in');
  ok(!existsSync(lockPath), 'the lock is gone after the write');
  // A live writer holds it (the parent process: alive, and not us).
  writeFileSync(lockPath, String(process.ppid), { mode: 0o600 });
  const t0 = Date.now();
  const busy = st.postSolo(body({ draftId: 'lock-2' }));
  eq(busy.status, 503, 'held by a live process: POST /draft-deck waits, then 503');
  ok(Date.now() - t0 >= 280 && /locked by pid/.test(busy.body.message), `... after waiting its lockWaitMs (${Date.now() - t0} ms), naming the holder`);
  let threwL = false;
  try { st.importLine({ v: 1, at: 'x', source: 'solo', key: 'solo:import-x', cubeId: 'omega', main: MAIN }); } catch (e) { threwL = e.code === 'LOCKED'; }
  ok(threwL, 'an import waits for it too, then gives up');
  let threwO = false;
  try { st.recordRoom({ roomId: 'rLOCK01', seat: 1, cubeId: 'omega', record: false }); } catch (e) { threwO = e.code === 'LOCKED'; }
  ok(threwO, 'an opt-out that cannot get the lock throws (loud), never silently skips');
  eq(st.shares('omega').body.decks.length, 1, 'a read never waits for the lock');
  // A lock left by a process that died is taken over.
  const dead = spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' });
  writeFileSync(lockPath, dead.stdout, { mode: 0o600 });
  eq(st.postSolo(body({ draftId: 'lock-3' })).status, 201, `a lock whose pid (${dead.stdout}) is gone is taken over`);
  // A lock older than lockStaleMs is taken over whatever its pid says.
  const old = createDraftDecks({ dir: ld, varRoot: join(ROOT, 'var'), scriptOf: () => scriptOf, lockWaitMs: 300, lockStaleMs: 50 });
  writeFileSync(lockPath, String(process.ppid), { mode: 0o600 });
  utimesSync(lockPath, new Date(Date.now() - 10_000), new Date(Date.now() - 10_000));
  eq(old.postSolo(body({ draftId: 'lock-4' })).status, 201, 'a stale lock is taken over');
  // Another process (the CLI) holds the lock for a while: the helper's write waits for it, then goes in.
  const child = spawn(process.execPath, ['--input-type=module', '-e', `
    import { withLedgerLock } from ${JSON.stringify(new URL('./draft-decks.mjs', import.meta.url).href)};
    withLedgerLock(${JSON.stringify(ld)}, () => { process.stdout.write('held\\n'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 600); });
  `], { stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => child.stdout.once('data', r));
  const patient = createDraftDecks({ dir: ld, varRoot: join(ROOT, 'var'), scriptOf: () => scriptOf, lockWaitMs: 5000 });
  const t1 = Date.now();
  eq(patient.postSolo(body({ draftId: 'lock-5' })).status, 201, 'a write while another process holds the lock: waits, then goes in');
  ok(Date.now() - t1 >= 300, `... after the other process let go (${Date.now() - t1} ms)`);
  await new Promise((r) => (child.exitCode !== null ? r() : child.once('exit', r)));
  eq(child.exitCode, 0, 'the other process ended cleanly');
  eq(patient.summary().map((d) => d.key).sort(), ['solo:draft-abc-123', 'solo:lock-1', 'solo:lock-3', 'solo:lock-4', 'solo:lock-5'].filter((k) => k !== 'solo:draft-abc-123').sort(), 'every deck that got the lock is in, none lost');
  ok(!existsSync(lockPath), 'no lock left behind');

  // The #174 review: two writers both read a dead holder's pid.  Writer B has just judged the lock dead
  // (its onStale seam) when writer A, another process, takes it over and goes inside; B then carries on
  // with the dead pid it read.  Unlinking by name, B deleted A's fresh lock and went in beside it.
  const holdIn = (dir, who, ms, marks) => spawn(process.execPath, ['--input-type=module', '-e', `
    import { appendFileSync } from 'node:fs';
    import { withLedgerLock } from ${JSON.stringify(new URL('./draft-decks.mjs', import.meta.url).href)};
    withLedgerLock(${JSON.stringify(dir)}, () => {
      ${marks ? `appendFileSync(${JSON.stringify(marks)}, 'in ${who}\\n');` : ''}
      process.stdout.write('held\\n');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ${ms});
      ${marks ? `appendFileSync(${JSON.stringify(marks)}, 'out ${who}\\n');` : ''}
    });
  `], { stdio: ['ignore', 'pipe', 'inherit'] });
  const exited = (c) => new Promise((r) => (c.exitCode !== null ? r() : c.once('exit', r)));
  const race = join(VAR, 'race');
  mkdirSync(race, { recursive: true });
  const marks = join(race, 'marks.txt');
  const deadAgain = spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' }).stdout;
  writeFileSync(join(race, 'decks.lock'), deadAgain, { mode: 0o600 });
  let writerA = null;
  let staleSeen = 0;
  withLedgerLock(race, () => { appendFileSync(marks, 'in B\n'); appendFileSync(marks, 'out B\n'); }, {
    waitMs: 10_000,
    onStale: (holder) => {
      staleSeen++;
      if (writerA || String(holder) !== deadAgain) return;
      writerA = holdIn(race, 'A', 400, marks);
      const until = Date.now() + 10_000;
      while (!(existsSync(marks) && readFileSync(marks, 'utf8').includes('in A')) && Date.now() < until) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
    },
  });
  await exited(writerA);
  eq(readFileSync(marks, 'utf8').split('\n').filter(Boolean), ['in A', 'out A', 'in B', 'out B'],
    `two writers that both read the dead pid ${deadAgain}: A takes the lock over, B waits for A -- exactly one inside at a time`);
  eq(staleSeen, 1, '... B judged the lock dead once, and saw A\'s live pid after that');
  ok(readdirSync(race).every((f) => f === 'marks.txt'), `... no lock and no takeover claim left behind (${readdirSync(race).join(', ')})`);

  // The helper's path: a held lock is waited for on a timer, so its event loop keeps running.
  const ad = join(VAR, 'async-ledger');
  const asyncLog = [];
  const as = createDraftDecks({ dir: ad, varRoot: join(ROOT, 'var'), scriptOf: () => scriptOf, lockWaitMs: 5000, log: (x) => asyncLog.push(x) });
  let ticks = 0;
  const iv = setInterval(() => { ticks++; }, 20);
  const holder = holdIn(ad, 'cli', 400);
  await new Promise((r) => holder.stdout.once('data', r));
  const ta = Date.now();
  const posted = await as.postSoloAsync(body({ draftId: 'async-1' }));
  const waited = Date.now() - ta;
  clearInterval(iv);
  eq(posted.status, 201, 'postSoloAsync while another process holds the lock: waits, then goes in');
  ok(waited >= 250 && ticks >= 8, `... and the event loop ran while it waited (${ticks} timer ticks in ${waited} ms)`);
  await exited(holder);
  // An opt-in, then the opt-out after it, both asked while the lock is held: they run in that order.
  const held2 = holdIn(ad, 'cli', 300);
  await new Promise((r) => held2.stdout.once('data', r));
  const seatDeck = { roomId: 'rASYNC1', seat: 0, cubeId: 'omega', format: 'grid', main: MAIN };
  const optIn = as.recordRoomAsync({ ...seatDeck, record: true });
  const optOut = as.recordRoomAsync({ ...seatDeck, record: false });
  eq([await optIn, await optOut], [true, true], 'an opt-in and the opt-out after it, both waiting on the lock: each done');
  ok(!as.summary().some((d) => d.key === 'room:rASYNC1:0') && as.withdrawnKeys().includes('room:rASYNC1:0'), '... in the order asked: the deck is out and its key withdrawn');
  await exited(held2);
  // Held past its wait: a 503 for a POST, and an opt-out that rejects -- logged once, as an ERROR.
  const short = createDraftDecks({ dir: ad, varRoot: join(ROOT, 'var'), scriptOf: () => scriptOf, lockWaitMs: 200, log: (x) => asyncLog.push(x) });
  writeFileSync(join(ad, 'decks.lock'), String(process.ppid), { mode: 0o600 });
  eq((await short.postSoloAsync(body({ draftId: 'async-2' }))).status, 503, 'postSoloAsync on a lock held past lockWaitMs: 503');
  asyncLog.length = 0;
  let rejected = null;
  try { await short.recordRoomAsync({ ...seatDeck, roomId: 'rASYNC2', record: false }); } catch (e) { rejected = e.code; }
  eq([rejected, asyncLog.filter((x) => /ERROR .*could NOT be deleted/.test(x)).length], ['LOCKED', 1], 'an opt-out that cannot get the lock rejects, and is logged as an ERROR once (not once a try)');
  rmSync(join(ad, 'decks.lock'));
}

console.log(`\ndraft-decks-selftest: ${checks - failed}/${checks} checks passed${failed ? `, ${failed} FAILED` : ''}`);
rmSync(VAR, { recursive: true, force: true });
process.exit(failed ? 1 : 0);

function require_tmp(d) { return readdirSync(d).some((f) => f.endsWith('.tmp')); }

// ---------------------------------------------------------------------------
// HTTP helper.
function call(port, path, { method = 'POST', headers = {}, body: b } = {}) {
  return new Promise((res, rej) => {
    const data = b === undefined ? undefined : (typeof b === 'string' ? b : JSON.stringify(b));
    const q = request({ host: '127.0.0.1', port, path, method, headers: { Host: `127.0.0.1:${port}`, ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}), ...headers } }, (r) => {
      let txt = '';
      r.on('data', (c) => { txt += c; });
      r.on('end', () => { let j = null; try { j = JSON.parse(txt); } catch { /* text */ } res({ status: r.statusCode, json: j, text: txt, headers: r.headers }); });
    });
    q.on('error', rej);
    if (data) q.write(data);
    q.end();
  });
}
