// mtg-table — tools/match-launcher.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// THE MATCH LAUNCHER (D303): the coach helper's `/match`, which starts a match
// with two decks the browser built.  ForgeCoach's cube draft builds both
// 40-card decks in the page; `POST /match` writes them as .dck files under
// var/match/ and asks scripts/play.sh -- which owns the engine -- to restart the
// bridge on them.  tools/coach-helper.mjs routes /match here, behind the same
// Origin and LAN-token gate as /coach; this module never starts a process.
//
// THE CONTRACT (ForgeCoach is built against exactly this; docs/match-launcher.md
// is the copyable form):
//
//   GET  /health  gains "match": 1 when play.sh supervises this helper (it was
//                 started with --match-dir and --supervisor), else "match": 0.
//                 and (D308) "engine": "running"|"idle" -- "idle": the engine exited (its
//                 match is over, or D286's idle limit) and play.sh is waiting for a
//                 POST /match to start it again; with "idleSince" and "exitsAt" (ISO
//                 times; exitsAt null = play.sh never gives up, --idle-exit-after 0).
//                 No "engine" key when "match" is 0.  (D333) With "match": 1 also
//                 "aiPolicies": ["plain","outlets","search"] and
//                 "aiSearchMs": {"min":500,"max":5000,"default":1500}: POST /match takes them.
//   POST /engine/start  (D308)  wake a sleeping engine on the last match setup (play.sh's
//                 startup decks if there was no /match).  No body, or (D381) the JSON
//                 {"aiProfile"?: one of the .ai profiles, any case}: the woken engine plays
//                 that profile, and it is part of the last setup from then on; no deck is
//                 named or revealed.  200 = the POST /match 200's shape plus "already": false;
//                 engine running already -> 200 {"ok":true,"already":true,"yourDeck","aiDeck",
//                 "aiProfile","games"} (+ "warnings" when it plays another profile than asked:
//                 nothing is restarted); the same refusals (400 for a bad body, 409, 502, 503,
//                 504).  /health carries "engine_start": 1, and (D381) "engine_start_profile": 1.
//                 (D384) Every wake deals a fresh shuffle: play.sh gives it a random --seed,
//                 as it does a POST /match, unless the body names {"seed": n} (a non-negative
//                 safe integer; a --seed play.sh was started with also holds, as for /match).
//                 The 200 carries "seed", the one the engine says it started with;
//                 /health carries "engine_start_seed": 1.
//                 (D414) {"aiPolicy": "plain"|"outlets"|"search"} wakes it on that AI (it
//                 replaces --ai-policy/--ai-search, budget included, and is the last setup
//                 from then on), so plain Play vs Forge can pick the opponent as /match's
//                 picker does; running already: nothing restarts, and a warning when it plays
//                 another policy.  /health carries "engine_start_policy": 1.  A wake with no
//                 policy plays the last setup's, which play.sh starts as search-v2 (D414).
//   GET  /match   -> 200 {"ok":true,"state":"running"|"restarting"|"idle",
//                         "match":{"yourDeck":{"name","cards"},"aiDeck":{"name","cards"},
//                                  "aiProfile","aiPolicy","games"}}
//                 "match" is null until play.sh has written one.  "aiPolicy" (D333):
//                 "plain"|"outlets"|"search" as the engine says it started.
//   POST /match   {"deck":   {"name": string, "main": [[n, cardName], ...], "sideboard"?: [[n, cardName], ...]},
//                  "aiDeck": {...the same},
//                  "aiProfile"?: "Default"|"Cautious"|"Reckless"|"Experimental"  (default "Default"),
//                  "games"?: 1..9                                                 (default 3),
//                  "aiPolicy"?: "plain"|"outlets"|"search"    (D333; absent = as play.sh was started),
//                  "aiSearchMs"?: 500..5000                    (D333; only with "search"; default 1500)}
//                 -> 200 {"ok":true,"yourDeck":{"name","path","cards"},"aiDeck":{"name","cards"},
//                         "aiProfile","aiPolicy","games","ms","warnings":[string]}
//                    once the new engine answers /health; the seat socket of the old
//                    engine has been dropped, and the client reconnects to /ws.
//   Every refusal is {"ok":false,"type":"error","message":"<plain words>"} (+ "problems"
//   on a 400, + "restored" on a 502):
//     400 bad input · 403 Origin/token (the helper's gate) · 405 · 409 a restart is
//     already running · 413 over 64 KB · 502 the engine did not start on these decks
//     (the previous match was started again: "restored": true) · 503 no supervisor ·
//     504 no answer from play.sh in time.
//
//   (D404) A GAME BETWEEN TWO PEOPLE -- not an HTTP route: the draft room (tools/draft-room.mjs,
//   in the same process) calls startTable({roomId, decks: [seat 0, seat 1], names, digests}) once
//   both players have handed in a deck.  It writes var/match/<id>/seat0.dck, seat1.dck and
//   seats.json ({names, tokenSha256}: the seat tokens' digests, never a token), then
//   request.json {v, id, humans: 2, deck, deck2, seats, games: 1} and SIGUSR1; play.sh starts the
//   bridge with --humans 2 (D402) and says how it went in status.json.  -> {ok, matchId, tablePort,
//   seats: [{name, cards}x2], seed, ms} or {ok: false, status, message}.  While such a game runs, a
//   POST /match is 409 (it would end it); /engine/start's "already running" is unchanged.
//   (D406, D407) startTable also takes {match: {bestOf, game, wins}, chooser?, record: [bool, bool]} --
//   where the game stands in the room's best of three, the seat that chooses to play or draw (the
//   previous game's loser) and each seat's consent to recording -- and writes them into seats.json,
//   which the bridge reads (TableMatch); gameResult(matchId) reads the result.json the bridge writes
//   beside it when the game ends: {winnerSeat: 0|1|null, draw, reason, finished, turns} or null.
//
// THE RULES IT KEEPS:
//   - The AI's decklist never goes on the game wire: the bridge loads ai.dck and
//     hello_ok.match.aiDeck stays {name, cards} (M44).  This module's replies name
//     the AI deck by name and count too, never its list.
//   - Names never reach a command line: a deck name and every card name must match
//     a strict pattern (no control character, `|` only before a set code, no `[`,
//     `]`, `=`, `#`, `\`), and they go into a file whose PATH is ours alone
//     (var/match/<id>/you.dck, ai.dck).  play.sh reads the request back through
//     node, re-checks every field against the same shapes, and passes them as
//     quoted array elements.
//   - Card names are checked against the engine's own card scripts when they are on
//     disk (forge-home/res/cardsfolder/cardsfolder.zip, plus forge-home/custom-cards),
//     read once, lazily; without them the engine reports, as a count in "warnings".
//   - Nothing edits Forge preferences: the profile is one of the .ai files'
//     names, passed to the bridge as --ai-profile (M44's never-empty override).
//   - The AI's controller (D333) is one of AI_POLICIES, passed as --ai-policy, and
//     the search's budget a whole number of ms in AI_SEARCH_MS's range, passed as
//     --ai-search ms=<n>.  /health advertises both ("aiPolicies", "aiSearchMs").
//
// Run from the repo root (hard rule 9).  Its self-test is
// tools/match-launcher-selftest.mjs (a fake engine under play.sh; gate 12f, CI).

import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { inflateRawSync } from 'node:zlib';

export const MATCH_VERSION = 1;
export const MAX_MATCH_BODY = 64 * 1024;
export const DEFAULT_PROFILES = ['Default', 'Cautious', 'Reckless', 'Experimental'];
export const MIN_MAIN = 40;
export const MAX_MAIN = 250;
export const MAX_SIDEBOARD = 250;
export const MAX_COPIES = 250;
export const MAX_GAMES = 9;
export const DEFAULT_GAMES = 3;
export const KEEP_MATCH_DIRS = 5;
// D333: the AI seat's controller (MtgTable --ai-policy, D314) and the search's
// budget per decision (--ai-search ms=<n>; the bridge's own default is 1500).
export const AI_POLICIES = ['plain', 'outlets', 'search'];
export const AI_SEARCH_MS = { min: 500, max: 5000, default: 1500 };

// A deck's name: what the .dck's Name= says and what hello_ok prints.  Letters,
// digits, spaces and plain punctuation; never a control character, `|`, `[`,
// `]`, `=`, `#`, `\`, `<`, `>`.
export const DECK_NAME = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} '’,.!?&()+:/_-]{0,79}$/u;
// A card's name as Forge spells it (Kongming, "Sleeping Dragon"; Fire // Ice;
// _____), optionally `|SET`.
export const CARD_NAME = /^[\p{L}\p{N}"'_(][\p{L}\p{M}\p{N} '’",.!?&()+:/_-]{0,140}$/u;
const SET_CODE = /^[A-Z0-9]{2,8}$/;
export const MATCH_ID = /^m[0-9]{13}$/;

const fold = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** The card's name without its `|SET`, or null when the string is not a card name. */
export function cardNameOf(s) {
  if (typeof s !== 'string' || s !== s.trim()) return null;
  const bar = s.indexOf('|');
  const name = bar < 0 ? s : s.slice(0, bar);
  if (bar >= 0 && !SET_CODE.test(s.slice(bar + 1))) return null;
  if (!CARD_NAME.test(name) || name.includes('  ')) return null;
  return name;
}

export function deckNameOk(s) {
  return typeof s === 'string' && s === s.trim() && DECK_NAME.test(s) && !s.includes('  ');
}

/**
 * Checks one deck of a request.  Returns { deck: {name, main, sideboard, mainCount,
 * sideCount}, problems: [] } -- the deck only when there are no problems.
 */
export function checkDeck(d, who) {
  const problems = [];
  if (!d || typeof d !== 'object' || Array.isArray(d)) return { problems: [`${who}: expected {"name": string, "main": [[n, cardName], ...], "sideboard"?: [...]}`] };
  if (!deckNameOk(d.name)) problems.push(`${who}: the name must be 1-80 letters, digits, spaces or plain punctuation (no | [ ] = # \\ < >), got ${JSON.stringify(String(d.name ?? '')).slice(0, 90)}`);
  const section = (list, label, max) => {
    const out = [];
    let count = 0;
    if (list === undefined && label === 'sideboard') return { out, count };
    if (!Array.isArray(list)) { problems.push(`${who}: "${label}" must be an array of [count, cardName] pairs`); return { out, count }; }
    if (list.length > 500) { problems.push(`${who}: "${label}" has ${list.length} entries (at most 500)`); return { out, count }; }
    list.forEach((e, i) => {
      if (!Array.isArray(e) || e.length !== 2) { problems.push(`${who}: ${label}[${i}] is not a [count, cardName] pair`); return; }
      const [n, card] = e;
      if (!Number.isInteger(n) || n < 1 || n > MAX_COPIES) { problems.push(`${who}: ${label}[${i}] has a count of ${JSON.stringify(n)} (a whole number 1-${MAX_COPIES})`); return; }
      const name = cardNameOf(card);
      if (name === null) { problems.push(`${who}: ${label}[${i}] is not a card name: ${JSON.stringify(String(card)).slice(0, 160)}`); return; }
      out.push([n, card, name]);
      count += n;
    });
    if (count > max) problems.push(`${who}: the ${label} has ${count} cards (at most ${max})`);
    return { out, count };
  };
  const main = section(d.main, 'main', MAX_MAIN);
  const side = section(d.sideboard, 'sideboard', MAX_SIDEBOARD);
  if (Array.isArray(d.main) && main.count < MIN_MAIN && !problems.some((p) => p.includes('main['))) {
    problems.push(`${who}: the main deck has ${main.count} cards (at least ${MIN_MAIN})`);
  }
  if (problems.length) return { problems };
  return { deck: { name: d.name, main: main.out, sideboard: side.out, mainCount: main.count, sideCount: side.count }, problems };
}

/** The Forge profile's canonical name, case-insensitively, or null. */
export function profileOf(s, profiles) {
  if (typeof s !== 'string') return null;
  return profiles.find((p) => p.toLowerCase() === s.toLowerCase()) ?? null;
}

/**
 * D381: a POST /engine/start body.  Empty (or only whitespace) is the D308 wake:
 * { aiProfile: null, seed: null, aiPolicy: null }.  Otherwise a JSON object whose optional
 * "aiProfile" is one of `profiles`, any case, (D384) whose optional "seed" is a
 * non-negative safe integer, and (D414) whose optional "aiPolicy" is one of
 * AI_POLICIES, exactly (unknown keys ignored, as /match); anything else is a
 * problem.  Returns { aiProfile, seed, aiPolicy, problems }; seed null = a fresh one,
 * aiPolicy null = the last setup's.
 */
export function checkWake(raw, profiles = DEFAULT_PROFILES) {
  const none = { aiProfile: null, seed: null, aiPolicy: null };
  if (raw === undefined || raw === null || String(raw).trim() === '') return { ...none, problems: [] };
  let q;
  try { q = JSON.parse(String(raw)); } catch { return { ...none, problems: ['the body is not JSON'] }; }
  if (!q || typeof q !== 'object' || Array.isArray(q)) return { ...none, problems: ['expected no body, or {"aiProfile"?: string, "seed"?: number, "aiPolicy"?: string}'] };
  const problems = [];
  const aiProfile = q.aiProfile === undefined ? null : profileOf(q.aiProfile, profiles);
  if (q.aiProfile !== undefined && aiProfile === null) problems.push(`aiProfile must be one of ${profiles.join(', ')}, got ${JSON.stringify(String(q.aiProfile)).slice(0, 40)}`);
  const seed = q.seed === undefined ? null : q.seed;
  if (q.seed !== undefined && (!Number.isSafeInteger(seed) || seed < 0)) problems.push(`seed must be a whole number 0-${Number.MAX_SAFE_INTEGER}, got ${JSON.stringify(q.seed)}`.slice(0, 120));
  const aiPolicy = q.aiPolicy === undefined ? null : q.aiPolicy;
  if (q.aiPolicy !== undefined && !AI_POLICIES.includes(q.aiPolicy)) problems.push(`aiPolicy must be one of ${AI_POLICIES.join(', ')}, got ${JSON.stringify(String(q.aiPolicy)).slice(0, 40)}`);
  if (problems.length) return { ...none, problems };
  return { aiProfile, seed, aiPolicy, problems };
}

/**
 * Checks a whole POST /match body.  `profiles` is the list of .ai names;
 * `known` is a Set of folded card names, or null to skip the card check.
 */
export function checkRequest(body, { profiles = DEFAULT_PROFILES, known = null } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { problems: ['expected {"deck": {...}, "aiDeck": {...}, "aiProfile"?: string, "games"?: number}'] };
  }
  const you = checkDeck(body.deck, 'deck');
  const ai = checkDeck(body.aiDeck, 'aiDeck');
  const problems = [...you.problems, ...ai.problems];
  const aiProfile = body.aiProfile === undefined ? 'Default' : profileOf(body.aiProfile, profiles);
  if (aiProfile === null) problems.push(`aiProfile must be one of ${profiles.join(', ')}, got ${JSON.stringify(String(body.aiProfile)).slice(0, 40)}`);
  const games = body.games === undefined ? DEFAULT_GAMES : body.games;
  if (!Number.isInteger(games) || games < 1 || games > MAX_GAMES) problems.push(`games must be a whole number 1-${MAX_GAMES}, got ${JSON.stringify(body.games)}`);
  // D333: absent = the AI play.sh was started with; exact names only.
  const aiPolicy = body.aiPolicy === undefined ? null : AI_POLICIES.includes(body.aiPolicy) ? body.aiPolicy : undefined;
  if (aiPolicy === undefined) problems.push(`aiPolicy must be one of ${AI_POLICIES.join(', ')}, got ${JSON.stringify(String(body.aiPolicy)).slice(0, 40)}`);
  const aiSearchMs = body.aiSearchMs === undefined ? null : body.aiSearchMs;
  if (aiSearchMs !== null && (!Number.isInteger(aiSearchMs) || aiSearchMs < AI_SEARCH_MS.min || aiSearchMs > AI_SEARCH_MS.max)) {
    problems.push(`aiSearchMs must be a whole number ${AI_SEARCH_MS.min}-${AI_SEARCH_MS.max}, got ${JSON.stringify(body.aiSearchMs)}`.slice(0, 120));
  } else if (aiSearchMs !== null && aiPolicy !== 'search') problems.push('aiSearchMs goes only with "aiPolicy": "search"');
  if (problems.length) return { problems };
  if (known) {
    for (const [who, d] of [['deck', you.deck], ['aiDeck', ai.deck]]) {
      const unknown = [...new Set([...d.main, ...d.sideboard].map((e) => e[2]).filter((n) => !known.has(fold(n))))];
      if (unknown.length) {
        problems.push(`${who}: ${unknown.length} card name${unknown.length === 1 ? '' : 's'} the engine does not know: ${unknown.slice(0, 12).join('; ')}${unknown.length > 12 ? '; …' : ''}`);
      }
    }
    if (problems.length) return { problems };
  }
  return { match: { deck: you.deck, aiDeck: ai.deck, aiProfile, games, aiPolicy, aiSearchMs }, problems };
}

/** A deck as a Forge .dck file.  Every string in it has passed the patterns above. */
export function dckText(d) {
  const lines = ['[metadata]', `Name=${d.name}`, '[main]', ...d.main.map(([n, card]) => `${n} ${card}`)];
  if (d.sideboard.length) lines.push('[sideboard]', ...d.sideboard.map(([n, card]) => `${n} ${card}`));
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// The card index: every Name: of every card script in Forge's cardsfolder.zip
// (and forge-home/custom-cards/*.txt), folded; a multi-face script also as
// "A // B".  A zip reader of our own, because Node has none: the central
// directory, then each entry stored or deflated.  About a second, once.
// ---------------------------------------------------------------------------

function namesOf(text, into) {
  const ns = [...text.matchAll(/^Name:(.+)$/gm)].map((m) => m[1].trim()).filter(Boolean);
  for (const n of ns) into.add(fold(n));
  if (ns.length > 1) into.add(fold(ns.join(' // ')));
}

export async function loadCardIndex(zipPath, customDir) {
  if (!zipPath || !existsSync(zipPath)) return null;
  const b = readFileSync(zipPath);
  let e = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 65535); i--) {
    if (b.readUInt32LE(i) === 0x06054b50) { e = i; break; }
  }
  if (e < 0) return null;
  const count = b.readUInt16LE(e + 10);
  const cdOff = b.readUInt32LE(e + 16);
  if (count === 0xffff || cdOff === 0xffffffff) return null;   // zip64: not Forge's
  const names = new Set();
  let p = cdOff;
  for (let k = 0; k < count; k++) {
    if (b.readUInt32LE(p) !== 0x02014b50) return null;
    const method = b.readUInt16LE(p + 10);
    const csize = b.readUInt32LE(p + 20);
    const nlen = b.readUInt16LE(p + 28);
    const xlen = b.readUInt16LE(p + 30);
    const clen = b.readUInt16LE(p + 32);
    const loff = b.readUInt32LE(p + 42);
    const fname = b.toString('utf8', p + 46, p + 46 + nlen);
    p += 46 + nlen + xlen + clen;
    if (!fname.endsWith('.txt') || (method !== 0 && method !== 8)) continue;
    const start = loff + 30 + b.readUInt16LE(loff + 26) + b.readUInt16LE(loff + 28);
    const data = b.subarray(start, start + csize);
    namesOf((method === 8 ? inflateRawSync(data) : data).toString('utf8'), names);
    if (k % 2000 === 1999) await new Promise((r) => setImmediate(r));   // let /coach breathe
  }
  if (customDir && existsSync(customDir)) {
    for (const f of readdirSync(customDir)) if (f.endsWith('.txt')) namesOf(readFileSync(join(customDir, f), 'utf8'), names);
  }
  return names.size ? names : null;
}

export function readProfiles(aiDir) {
  try {
    const ps = readdirSync(aiDir).filter((f) => f.endsWith('.ai')).map((f) => f.slice(0, -3)).sort();
    return ps.length ? ps : DEFAULT_PROFILES;
  } catch { return DEFAULT_PROFILES; }
}

// ---------------------------------------------------------------------------
// The launcher: the files it shares with play.sh, and the signal.
//
//   var/match/<id>/you.dck, ai.dck   the decks (written here)
//   var/match/request.json           {id, deck, aiDeck, aiProfile, games, aiPolicy?, aiSearchMs?}  (here, then SIGUSR1 to play.sh)
//                                    or a wake: {id, wake: true, aiProfile?, seed?, aiPolicy?}  (D308; D381, D384, D414)
//   var/match/status.json            {id, state, error?, restored?, match?, ms?}  (play.sh)
//   var/match/current.json           {id, match}  (play.sh, after every start)
// ---------------------------------------------------------------------------

/** A path with every symlink resolved, as far as it exists (the rest appended as written). */
function realOf(p) {
  let head = resolve(p);
  const tail = [];
  for (;;) {
    try { return join(realpathSync(head), ...tail); } catch (e) {
      if (e.code !== 'ENOENT' || dirname(head) === head) throw e;
      tail.unshift(basename(head));
      head = dirname(head);
    }
  }
}

/** D386: whether `p`, symlinks resolved, is `root` or under it (symlinks resolved too). */
export function realInside(root, p) {
  try {
    const r = realOf(root);
    const q = realOf(p);
    return q === r || q.startsWith(r + sep);
  } catch { return false; }
}

const readJson = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };
const writeAtomic = (f, text) => { writeFileSync(f + '.tmp', text); renameSync(f + '.tmp', f); };
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

/** The public form of a match: names and counts, never a list (M44). */
export function publicMatch(m) {
  if (!m || typeof m !== 'object') return null;
  const deck = (d) => (d && typeof d === 'object' ? { name: String(d.name ?? ''), cards: Number(d.cards ?? 0) } : null);
  return { yourDeck: deck(m.yourDeck), aiDeck: deck(m.aiDeck), aiProfile: m.aiProfile ?? null, aiPolicy: m.aiPolicy ?? null, games: m.games ?? null };
}

/**
 * D406 / D407: a table's best-of-three place, play-or-draw chooser and recording consent, checked, as
 * seats.json's extra keys ({seats}) -- or {problem}.  All absent: {seats: {}} (D404's one game).
 */
export function tableExtras({ match = null, chooser = null, record = null } = {}) {
  const seats = {};
  if (match !== null) {
    const ok = match && typeof match === 'object' && (match.bestOf === 1 || match.bestOf === 3)
      && Number.isInteger(match.game) && match.game >= 1 && match.game <= match.bestOf
      && Array.isArray(match.wins) && match.wins.length === 2 && match.wins.every((w) => Number.isInteger(w) && w >= 0 && w <= Math.floor(match.bestOf / 2))
      && match.wins[0] + match.wins[1] <= match.game - 1;
    if (!ok) return { problem: 'match must be {bestOf: 1|3, game, wins: [a, b]} with no more wins than games before it' };
    seats.match = { bestOf: match.bestOf, game: match.game, wins: [match.wins[0], match.wins[1]] };
  }
  if (chooser !== null) {
    if ((chooser !== 0 && chooser !== 1) || !seats.match || seats.match.game < 2) return { problem: 'chooser is 0 or 1, the previous game\'s loser (game 2 on)' };
    seats.chooser = chooser;
  }
  if (record !== null) {
    if (!Array.isArray(record) || record.length !== 2 || !record.every((x) => typeof x === 'boolean')) return { problem: 'record is [bool, bool]' };
    seats.record = [record[0], record[1]];
  }
  return { seats };
}

export function createMatchLauncher(opts) {
  const {
    repoRoot, matchDir, supervisorPid, cardsZip, customCardsDir, aiDir,
    timeoutMs = 180_000, pollMs = 200, log = () => {},
  } = opts;
  const dir = matchDir ? resolve(repoRoot, matchDir) : null;
  const varRoot = resolve(repoRoot, 'var') + sep;
  if (dir && !(dir + sep).startsWith(varRoot)) throw new Error(`--match-dir must be inside ${varRoot} (got ${dir})`);
  // D386: and REALLY inside it -- no symlink on the way that leads out of var/.
  // Checked at startup and again before every write (a link made later).
  const stillInside = () => !dir || realInside(resolve(repoRoot, 'var'), dir);
  if (!stillInside()) throw new Error(`--match-dir must be inside ${varRoot} (got ${dir}, which a symlink leads out of it)`);
  let busy = false;
  let index;          // undefined: not loaded; null: not available; Set: loaded
  let indexing = null;

  const cardIndex = () => {
    if (index !== undefined) return Promise.resolve(index);
    indexing ??= loadCardIndex(cardsZip, customCardsDir).then((s) => {
      index = s;
      log(s ? `MATCH card index: ${s.size} names from ${cardsZip}` : `MATCH card index: none (${cardsZip} not readable) -- the engine reports unknown cards as a count`);
      return s;
    }, (e) => { index = null; log(`MATCH card index failed: ${e.message}`); return null; });
    return indexing;
  };

  const available = () => !!dir && Number.isInteger(supervisorPid) && supervisorPid > 1 && alive(supervisorPid);

  const fail = (status, message, extra = {}) => ({ status, body: { ok: false, type: 'error', message, ...extra } });

  // Waits for play.sh's status on request `id` and shapes the 200 / refusal.
  // `m` is the checked request (to count cards against), or null for a wake;
  // `wantSeed` (D384) the seed a wake's body named, or null.
  const ask = async (id, t0, m, youPath, wantSeed = null) => {
    // play.sh stops the engine, starts the new one, and says how it went.
    // play.sh takes SIGUSR1 only while it waits (it ignores it the rest of the
    // time: a bash 5.2 trap mid-$( ) killed it), so a signal can be lost; it is
    // sent again until play.sh has taken this request up (it ignores an id it
    // has already handled).
    let st = null;
    let seen = false;
    let lastSignal = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      await new Promise((r) => setTimeout(r, pollMs));
      st = readJson(join(dir, 'status.json'));
      if (st && st.id === id && (st.state === 'ready' || st.state === 'failed')) break;
      if (st && st.id === id) seen = true;
      if (!alive(supervisorPid)) return fail(503, 'scripts/play.sh stopped while the match was starting');
      if (!seen && Date.now() - lastSignal > 2000) {
        lastSignal = Date.now();
        try { process.kill(supervisorPid, 'SIGUSR1'); } catch { /* the alive check above says */ }
      }
      st = null;
    }
    if (!st) return fail(504, `the engine did not answer within ${Math.round(timeoutMs / 1000)} s — see var/play/server.log`);
    if (st.state === 'failed') {
      return fail(502, `the engine did not start on these decks: ${String(st.error ?? 'no reason given').slice(0, 1200)}`
        + (st.restored ? ' — the previous match is running again' : ' — no engine is running'), { restored: !!st.restored });
    }
    const got = st.match ?? {};
    const warnings = [];
    const cnt = (d) => Number(d?.cards ?? NaN);
    if (m && cnt(got.yourDeck) !== m.deck.mainCount) warnings.push(`the engine loaded ${cnt(got.yourDeck)} of the ${m.deck.mainCount} main-deck cards of your deck — a card it does not know was left out`);
    if (m && cnt(got.aiDeck) !== m.aiDeck.mainCount) warnings.push(`the engine loaded ${cnt(got.aiDeck)} of the ${m.aiDeck.mainCount} main-deck cards of the AI's deck — a card it does not know was left out`);
    const reply = {
      ok: true,
      yourDeck: { name: String(got.yourDeck?.name ?? m?.deck.name ?? ''), path: youPath ?? got.yourDeck?.path ?? null, cards: cnt(got.yourDeck) },
      aiDeck: { name: String(got.aiDeck?.name ?? m?.aiDeck.name ?? ''), cards: cnt(got.aiDeck) },
      aiProfile: got.aiProfile ?? m?.aiProfile ?? null,
      aiPolicy: got.aiPolicy ?? m?.aiPolicy ?? null,
      games: got.games ?? m?.games ?? null,
      seed: got.seed ?? null,   // D384: the shuffle, as the engine says it started (hello_ok carries it too)
      ms: Date.now() - t0,
      warnings,
    };
    // D384: play.sh found an engine already running (the race the check in wake()
    // cannot close) and restarted nothing, so the requested seed was not dealt.
    if (wantSeed !== null && reply.seed !== wantSeed) warnings.push(`the engine is running on seed ${reply.seed ?? 'unknown'}; seed ${wantSeed} was not applied — nothing is restarted while a match runs`);
    log(`MATCH started ${id}: you ${reply.yourDeck.name} (${reply.yourDeck.cards}), AI ${reply.aiDeck.name} (${reply.aiDeck.cards}), ${reply.aiProfile}, ${reply.aiPolicy ?? 'policy as started'}, ${reply.games} game(s), ${reply.ms} ms`);
    return { status: 200, body: reply };
  };

  // D308 POST /engine/start: wake a sleeping engine on the last match setup (or
  // play.sh's own startup decks).  Same request mechanism as /match, no decks:
  // {"v","id","wake":true}, plus D381's "aiProfile" and D384's "seed" when the body
  // names them (no seed: play.sh deals a fresh one, as for /match).
  // Already running: 200 {"ok":true,"already":true}, and nothing restarts.
  // `raw` is the request body as sent (a string; empty for none).
  let lastWakeId = 0;
  const wake = async (raw = '') => {
    if (!available()) return fail(503, 'the match launcher is off: this helper was not started by scripts/play.sh (or play.sh ran with --no-match)');
    const { aiProfile, seed, aiPolicy, problems } = checkWake(raw, readProfiles(aiDir));
    if (problems.length) return fail(400, 'the engine was not started: ' + problems[0], { problems });
    if (busy) return fail(409, 'a match is already being started — wait for it');
    const cur = engine();
    if (cur?.engine !== 'idle') {
      const m = publicMatch(readJson(join(dir, 'current.json'))?.match);
      const body = { ok: true, already: true, ...(m ?? {}) };
      if (aiProfile && m?.aiProfile && m.aiProfile.toLowerCase() !== aiProfile.toLowerCase()) {
        body.warnings = [`the engine is already running against the ${m.aiProfile} profile; ${aiProfile} was not applied — nothing is restarted while a match runs`];
      }
      if (seed !== null) (body.warnings ??= []).push(`the engine is already running; seed ${seed} was not applied — nothing is restarted while a match runs`);
      // D414: the same for the opponent AI (current.json's aiPolicy is the engine's own word for it).
      if (aiPolicy && m?.aiPolicy && m.aiPolicy !== aiPolicy) {
        (body.warnings ??= []).push(`the engine is already running against ${m.aiPolicy === 'plain' ? 'Forge\'s own AI' : `the ${m.aiPolicy} AI`}; ${aiPolicy} was not applied — nothing is restarted while a match runs`);
      }
      return { status: 200, body };
    }
    if (!stillInside()) return fail(500, 'the match directory is no longer inside var/ (a symlink leads out of it) — nothing was written');
    busy = true;
    const t0 = Date.now();
    try {
      mkdirSync(dir, { recursive: true });
      let n = Math.max(Date.now(), lastWakeId + 1);
      let id = `m${n}`;
      while (existsSync(join(dir, id))) id = `m${++n}`;
      lastWakeId = n;
      writeAtomic(join(dir, 'request.json'), JSON.stringify({ v: MATCH_VERSION, id, wake: true, ...(aiProfile ? { aiProfile } : {}), ...(seed !== null ? { seed } : {}), ...(aiPolicy ? { aiPolicy } : {}) }) + '\n');
      try { process.kill(supervisorPid, 'SIGUSR1'); } catch (e) {
        return fail(503, `could not reach scripts/play.sh (pid ${supervisorPid}): ${e.code ?? e.message}`);
      }
      const r = await ask(id, t0, null, null, seed);
      if (r.status === 200) r.body = { ...r.body, already: false };
      return r;
    } finally {
      busy = false;
    }
  };

  // D308: what play.sh says about the engine (var/match/engine.json).  "idle": the
  // engine has exited (match over, D286's idle limit) and play.sh waits for a
  // POST /match; no engine.json yet means running.  Null when there is no launcher.
  const engine = () => {
    if (!available()) return null;
    const e = readJson(join(dir, 'engine.json'));
    if (e?.state !== 'idle') return { engine: 'running' };
    return { engine: 'idle', idleSince: typeof e.at === 'string' ? e.at : null, exitsAt: typeof e.exitsAt === 'string' ? e.exitsAt : null };
  };

  // D333: what /health advertises about the AI a POST /match may ask for.
  const aiChoices = () => ({ aiPolicies: [...AI_POLICIES], aiSearchMs: { ...AI_SEARCH_MS } });

  // D404: is a game between two people running now (current.json says so, the engine is up)?
  const tableRunning = () => {
    if (!available() || engine()?.engine === 'idle') return null;
    const cur = readJson(join(dir, 'current.json'));
    return cur?.match?.humans === 2 ? cur : null;
  };

  // D404: start a game between two people on the room's two decks.  Not a route: the draft room calls it.
  const startTable = async ({ roomId, decks, names, digests, match = null, chooser = null, record = null }) => {
    const no = (status, message) => ({ ok: false, status, message });
    if (!available()) return no(503, 'the match launcher is off: this helper was not started by scripts/play.sh');
    if (busy) return no(409, 'a match is already being started — wait for it');
    if (!Array.isArray(decks) || decks.length !== 2 || !Array.isArray(names) || names.length !== 2
        || !Array.isArray(digests) || digests.length !== 2 || !digests.every((d) => /^[0-9a-f]{64}$/.test(d))) return no(400, 'a table needs two decks, two names and two token digests');
    const extra = tableExtras({ match, chooser, record });
    if (extra.problem) return no(400, extra.problem);
    busy = true;
    const t0 = Date.now();
    try {
      const checked = decks.map((d, i) => checkDeck(d, `seat ${i}`));
      const problems = checked.flatMap((c) => c.problems);
      if (problems.length) return no(400, problems[0]);
      const known = await cardIndex();
      if (known) {
        for (const [i, c] of checked.entries()) {
          const unknown = [...new Set([...c.deck.main, ...c.deck.sideboard].map((e) => e[2]).filter((n) => !known.has(fold(n))))];
          if (unknown.length) return no(400, `${names[i]}'s deck: ${unknown.length} card name${unknown.length === 1 ? '' : 's'} the engine does not know: ${unknown.slice(0, 12).join('; ')}`);
        }
      }
      for (const n of names) if (typeof n !== 'string' || n.trim() === '' || n.length > 24 || /[\u0000-\u001f\u007f]/.test(n)) return no(400, 'a seat name is 1-24 characters');
      if (!stillInside()) return no(500, 'the match directory is no longer inside var/ (a symlink leads out of it) — nothing was written');
      mkdirSync(dir, { recursive: true });
      let id = `m${Date.now()}`;
      while (existsSync(join(dir, id))) id = `m${Number(id.slice(1)) + 1}`;
      mkdirSync(join(dir, id));
      writeFileSync(join(dir, id, 'seat0.dck'), dckText(checked[0].deck));
      writeFileSync(join(dir, id, 'seat1.dck'), dckText(checked[1].deck));
      writeFileSync(join(dir, id, 'seats.json'), JSON.stringify({ names, tokenSha256: digests, ...extra.seats }) + '\n');
      const rel = (f) => join(matchDir, id, f).split(sep).join('/');
      const dirs = readdirSync(dir).filter((x) => MATCH_ID.test(x)).sort();
      for (const old of dirs.slice(0, Math.max(0, dirs.length - KEEP_MATCH_DIRS))) rmSync(join(dir, old), { recursive: true, force: true });
      writeAtomic(join(dir, 'request.json'), JSON.stringify({ v: MATCH_VERSION, id, humans: 2, deck: rel('seat0.dck'), deck2: rel('seat1.dck'), seats: rel('seats.json'), games: 1 }) + '\n');
      log(`MATCH ${id}: a game between two people for room ${String(roomId).slice(0, 12)}`);
      try { process.kill(supervisorPid, 'SIGUSR1'); } catch (e) { return no(503, `could not reach scripts/play.sh (pid ${supervisorPid}): ${e.code ?? e.message}`); }
      const r = await ask(id, t0, null, null);
      if (r.status !== 200) return no(r.status, r.body.message);
      const st = readJson(join(dir, 'status.json'));
      const got = st?.id === id ? st.match ?? {} : {};
      const seats = Array.isArray(got.seats) ? got.seats.map((x) => ({ name: String(x?.name ?? ''), cards: Number(x?.cards ?? NaN) })) : [];
      if (!Number.isInteger(got.tablePort)) return no(502, 'the engine started but did not say which port its table is on');
      return { ok: true, matchId: id, tablePort: got.tablePort, seats, seed: got.seed ?? null, ms: Date.now() - t0 };
    } finally {
      busy = false;
    }
  };

  // D406: what the bridge wrote when the table's game ended (result.json beside seats.json), or null.
  const gameResult = (matchId) => {
    if (!dir || typeof matchId !== 'string' || !MATCH_ID.test(matchId)) return null;
    const j = readJson(join(dir, matchId, 'result.json'));
    if (!j || typeof j !== 'object' || j.v !== 1) return null;
    const w = j.winnerSeat;
    if (!(w === null || w === 0 || w === 1)) return null;
    return { winnerSeat: w, draw: j.draw === true, reason: typeof j.reason === 'string' ? j.reason.slice(0, 40) : null,
      finished: j.finished === true, turns: Number.isInteger(j.turns) ? j.turns : null };
  };

  return {
    available,
    engine,
    aiChoices,
    wake,
    startTable,
    tableRunning,
    gameResult,
    get() {
      if (!available()) return fail(503, 'the match launcher is off: this helper was not started by scripts/play.sh (or play.sh ran with --no-match)');
      const asleep = engine()?.engine === 'idle';
      const cur = asleep ? null : readJson(join(dir, 'current.json'));
      return { status: 200, body: { ok: true, state: busy ? 'restarting' : asleep ? 'idle' : 'running', match: publicMatch(cur?.match) } };
    },
    async post(body) {
      if (!available()) return fail(503, 'the match launcher is off: this helper was not started by scripts/play.sh (or play.sh ran with --no-match)');
      if (busy) return fail(409, 'a match is already being started — wait for it');
      if (tableRunning()) return fail(409, 'a game between two people is being played on this engine; a new match would end it — wait until it is over');
      busy = true;
      const t0 = Date.now();
      try {
        const profiles = readProfiles(aiDir);
        const shape = checkRequest(body, { profiles });
        if (shape.problems.length) return fail(400, 'the match was not started: ' + shape.problems[0], { problems: shape.problems });
        const known = await cardIndex();
        const checked = known ? checkRequest(body, { profiles, known }) : shape;
        if (checked.problems.length) return fail(400, 'the match was not started: ' + checked.problems[0], { problems: checked.problems });
        const m = checked.match;

        // The files.  The id is ours; nothing the client sent is in a path.
        if (!stillInside()) return fail(500, 'the match directory is no longer inside var/ (a symlink leads out of it) — nothing was written');
        mkdirSync(dir, { recursive: true });
        let id = `m${Date.now()}`;
        while (existsSync(join(dir, id))) id = `m${Number(id.slice(1)) + 1}`;
        mkdirSync(join(dir, id));
        writeFileSync(join(dir, id, 'you.dck'), dckText(m.deck));
        writeFileSync(join(dir, id, 'ai.dck'), dckText(m.aiDeck));
        const rel = (f) => join(matchDir, id, f).split(sep).join('/');
        const dirs = readdirSync(dir).filter((n) => MATCH_ID.test(n)).sort();
        for (const old of dirs.slice(0, Math.max(0, dirs.length - KEEP_MATCH_DIRS))) rmSync(join(dir, old), { recursive: true, force: true });
        writeAtomic(join(dir, 'request.json'), JSON.stringify({ v: MATCH_VERSION, id, deck: rel('you.dck'), aiDeck: rel('ai.dck'), aiProfile: m.aiProfile, games: m.games,
          ...(m.aiPolicy ? { aiPolicy: m.aiPolicy } : {}), ...(m.aiSearchMs ? { aiSearchMs: m.aiSearchMs } : {}) }) + '\n');
        try { process.kill(supervisorPid, 'SIGUSR1'); } catch (e) {
          return fail(503, `could not reach scripts/play.sh (pid ${supervisorPid}): ${e.code ?? e.message}`);
        }

        return await ask(id, t0, m, rel('you.dck'));
      } finally {
        busy = false;
      }
    },
  };
}
