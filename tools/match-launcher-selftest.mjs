#!/usr/bin/env node
// mtg-table — tools/match-launcher-selftest.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The match launcher's self-test (D303): the coach helper's /match
// (tools/match-launcher.mjs) and scripts/play.sh's restart, end to end, against
// a FAKE ENGINE -- a small Node script play.sh runs in place of the bridge
// (MTGTABLE_TEST_FAKE_ENGINE, which also skips check-forge and the build).  The
// fake answers GET /health, holds any other connection open (a "seat"),
// prints the lines play.sh reads from the bridge's log (the decks it loaded,
// the profile, the games, a --lan page with its token), records how it was
// started (argv, the token it was handed) and notices a second fake running
// beside it.  It takes a moment to die on SIGTERM, so a restart that did not
// wait would start the next one on a busy port.  A deck NAMED "Crash ..." makes
// it exit before /health; "Drop One ..." makes it load one card fewer.
// Everything goes under var/match-launcher-selftest/ (MTGTABLE_TEST_VAR), never
// var/play/ or var/match/.  No Forge, no claude (a PATH with node alone), no network.
//
// What it holds: /health's "match"; GET /match; a POST that writes the two .dck
// files exactly, restarts the engine with the request's decks, profile and games
// and every other flag kept, drops the seat's socket, and answers with names and
// counts only; the next GET; bad input refused before anything is written or
// restarted (count, card and deck names, profile, games, JSON, size); another
// Origin refused; a deck the engine will not start on reported 502 with the
// previous match started again; the engine's own count as a warning; never two
// engines; a --lan restart keeping the first token; a card the engine's scripts
// do not know refused (a helper of its own, a tiny cardsfolder.zip and a fake
// supervisor); /match off without a supervisor; and play.sh's Ctrl-C taking it
// all down.  D308: the engine exiting on its idle limit (the fake's --idle-timeout)
// leaves play.sh and the helper up with /health "engine":"idle" and no current
// match, a POST /match starts a fresh engine from there, Ctrl-C works while asleep,
// --idle-exit-after ends play.sh by itself, and --no-match keeps the old exit.
// D381: POST /engine/start with {"aiProfile"} wakes the engine on that profile
// (canonical case, the only --ai-profile on its command line, every other flag as
// the last setup's), and it stays the last setup's; a bad profile or body is a
// 400 that starts nothing; while running, nothing restarts and a warning says so.
//
//   node tools/match-launcher-selftest.mjs      # exit 0 iff every check passes; ~30 s
//
// Run from the repo root (hard rule 9).  Gate step 12f (beside the coach
// helper's own self-test); CI's redaction job.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer, request } from 'node:http';
import { connect } from 'node:net';
import { delimiter, join, resolve } from 'node:path';
import { deflateRawSync } from 'node:zlib';

import { checkWake } from './match-launcher.mjs';

const REL = 'var/match-launcher-selftest';
const DIR = resolve(REL);
const NODE_ONLY = join(DIR, 'node-only');      // a PATH with node and no claude
const EVENTS = join(DIR, 'engine-events.jsonl');
const ALIVE = join(DIR, 'alive');
// A fake engine an interrupted earlier run left behind is stopped before its record goes.
for (const f of existsSync(ALIVE) ? readdirSync(ALIVE) : []) { try { process.kill(Number(f), 'SIGKILL'); } catch { /* gone */ } }
rmSync(DIR, { recursive: true, force: true });
for (const d of [NODE_ONLY, ALIVE, join(DIR, 'site')]) mkdirSync(d, { recursive: true });
symlinkSync(process.execPath, join(NODE_ONLY, 'node'));
writeFileSync(join(DIR, 'site', 'index.html'), '<!doctype html><title>t</title>\n');
const PATH = [NODE_ONLY, '/usr/bin', '/bin'].join(delimiter);

// --- the fake engine ---------------------------------------------------------
const FAKE = String.raw`// A fake bridge for tools/match-launcher-selftest.mjs.  Not the engine.
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto');
const argv = process.argv.slice(2);
const flag = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
const ev = (o) => fs.appendFileSync(process.env.FAKE_EVENTS, JSON.stringify({ pid: process.pid, t: Date.now(), ...o }) + '\n');
const aliveDir = process.env.FAKE_ALIVE;
for (const f of fs.readdirSync(aliveDir)) {
  const pid = Number(f);
  try { process.kill(pid, 0); ev({ overlap: pid }); } catch { /* gone */ }
}
fs.writeFileSync(path.join(aliveDir, String(process.pid)), '');
const bye = (code) => { try { fs.rmSync(path.join(aliveDir, String(process.pid))); } catch {} process.exit(code); };
const deckOf = (p) => {
  const t = fs.readFileSync(p, 'utf8');
  const name = (/^Name=(.*)$/m.exec(t) || [])[1] || path.basename(p, '.dck');
  const main = (t.split('[main]')[1] || '').split(/^\[/m)[0];
  let cards = 0;
  for (const l of main.split('\n')) { const m = /^(\d+) /.exec(l); if (m) cards += Number(m[1]); }
  if (name.startsWith('Drop One')) cards -= 1;
  return { name, cards };
};
const you = deckOf(flag('--deck')), ai = deckOf(flag('--ai-deck') || flag('--deck'));
ev({ start: true, argv, token: process.env.MTGTABLE_LAN_TOKEN ?? null });
console.log('deck (you)    = ' + path.resolve(flag('--deck')));
console.log('ai profile    = ' + (flag('--ai-profile') || 'Default'));
// D333: as the bridge, a policy line only when it is not plain (--ai-search implies search; the last flag wins).
let pol = 'plain';
argv.forEach((a, i) => { if (a === '--ai-policy') pol = argv[i + 1]; else if (a === '--ai-search') pol = 'search'; });
if (pol !== 'plain') console.log('ai policy     = ' + pol + (pol === 'search' ? '  (' + (flag('--ai-search') || 'ms=1500') + ')' : ''));
console.log('games/match   = ' + (flag('--games') || '1'));
if (you.name.startsWith('Crash') || ai.name.startsWith('Crash')) { console.error('ENGINE CRASHED (a fake one)'); ev({ crashed: true }); bye(1); }
console.log('deck you      = ' + you.name + ' (' + you.cards + ' cards)');
console.log('deck ai       = ' + ai.name + ' (' + ai.cards + ' cards)');
const lan = argv.includes('--lan');
const token = lan ? (process.env.MTGTABLE_LAN_TOKEN || crypto.randomBytes(16).toString('base64url')) : null;
if (lan) ev({ lanToken: token });
const sockets = new Set();
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/health')) { res.end('ok'); return; }
  seated = true; ev({ seat: req.url });   // a "seat": held open until this engine dies
});
server.on('connection', (s) => { sockets.add(s); s.on('close', () => sockets.delete(s)); });
server.on('error', (e) => { ev({ bindError: e.code }); console.error('bind: ' + e.code); bye(1); });
server.listen(Number(flag('--port')), lan ? '0.0.0.0' : '127.0.0.1', () => {
  console.log('WS LISTENING ws://127.0.0.1:' + flag('--port') + '/ws');
  if (lan) console.log('WS LAN PAGE  http://192.0.2.1:' + flag('--port') + '/?token=' + token);
});
// D308: the real bridge's --idle-timeout <sec> (D286): no client ever connected -> exit 1.
let seated = false;
const idleS = Number(flag('--idle-timeout') || 0);
if (idleS > 0) setTimeout(() => {
  if (seated) return;
  console.log('ABANDONED: no client connected for ' + idleS + ' s');
  ev({ idleExit: true });
  for (const s of sockets) s.destroy();
  bye(1);
}, idleS * 1000);
process.on('SIGTERM', () => {
  // A moment holding the port, as a JVM shutting down does.
  setTimeout(() => { for (const s of sockets) s.destroy(); ev({ exit: true }); bye(0); }, 700);
});
`;
writeFileSync(join(DIR, 'fake-engine.cjs'), FAKE);

// --- harness -----------------------------------------------------------------
let failed = 0;
let passed = 0;
const check = (name, ok, detail = '') => {
  if (ok) { passed++; console.log(`  ok    ${name}`); } else { failed++; console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ''}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const json = (s) => { try { return JSON.parse(s); } catch { return null; } };
const procs = [];

function http({ port, method = 'GET', path = '/health', headers = {}, body }) {
  return new Promise((res, rej) => {
    const r = request({ host: '127.0.0.1', port, method, path, headers, agent: false }, (resp) => {
      let b = '';
      resp.setEncoding('utf8');
      resp.on('data', (d) => { b += d; });
      resp.on('end', () => res({ status: resp.statusCode, headers: resp.headers, body: b, json: json(b) }));
    });
    r.on('error', rej);
    if (body !== undefined) r.write(body);
    r.end();
  });
}
const post = (port, q, headers = {}) => http({ port, method: 'POST', path: '/match', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof q === 'string' ? q : JSON.stringify(q) });
const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const events = () => (existsSync(EVENTS) ? readFileSync(EVENTS, 'utf8').split('\n').filter(Boolean).map(json) : []);
const starts = () => events().filter((e) => e.start);
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const argOf = (argv, f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
// After the engine exits, play.sh notices, logs and writes engine.json ("idle")
// through a node of its own: under load that takes seconds, not a fixed 600 ms.
const untilIdle = async (port) => { for (let i = 0; i < 100; i++) { const h = await http({ port }).catch(() => null); if (h?.json?.engine === 'idle') return; await sleep(100); } };

function deck(name, main, sideboard) {
  const d = { name, main };
  if (sideboard) d.sideboard = sideboard;
  return d;
}
// Real card names, so the request passes the card check on a machine that has
// Forge's scripts (forge-home/res) as well as on one that has none.
const RED = [[17, 'Mountain'], [4, 'Lightning Bolt'], [4, 'Shock'], [15, 'Goblin Piker']];
const BLUE = [[17, 'Island'], [4, 'Counterspell'], [4, 'Opt'], [15, 'Wind Drake']];

async function startPlay(extra, label) {
  const port = await freePort();
  const coachPort = await freePort();
  const p = spawn('bash', ['scripts/play.sh', '--engine-only', '--port', String(port), '--coach-port', String(coachPort), ...extra], {
    env: { ...process.env, PATH, MTGTABLE_TEST_FAKE_ENGINE: join(DIR, 'fake-engine.cjs'), MTGTABLE_TEST_VAR: `${REL}/${label}`,
      FAKE_EVENTS: EVENTS, FAKE_ALIVE: ALIVE, MTGTABLE_LAN_TOKEN: 'inheritedTokenMustBeDropped00' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  procs.push(p);
  let out = '';
  p.stdout.on('data', (d) => { out += d; });
  p.stderr.on('data', (d) => { out += d; });
  for (let i = 0; i < 400; i++) {
    if (/Match launcher: .*\n/.test(out) && /Engine ready on/.test(out)) return { proc: p, port, coachPort, out: () => out };
    if (p.exitCode !== null) break;
    await sleep(50);
  }
  throw new Error(`play.sh did not get ready:\n${out}`);
}

try {
  // ------------------------------------------------------------- play.sh, the launcher on
  console.log('== play.sh --engine-only with a fake engine: the launcher');
  const A = await startPlay([], 'a');
  check('play.sh prints the match launcher line', /Match launcher: ForgeCoach's Play this match restarts this engine/.test(A.out()), A.out());
  check('the coach helper started without claude on PATH', /Coach: claude CLI not found/.test(A.out()));
  let r = await http({ port: A.coachPort });
  check('/health advertises match: 1', r.status === 200 && r.json?.match === 1 && r.json?.helper === 1, r.body);
  check('/health advertises the AI policies and the search budget (D333)', JSON.stringify(r.json?.aiPolicies) === '["plain","outlets","search"]'
    && JSON.stringify(r.json?.aiSearchMs) === '{"min":500,"max":5000,"default":1500}', r.body);
  const first = starts();
  check('one engine started', first.length === 1);
  check('the first run had no inherited MTGTABLE_LAN_TOKEN', first[0]?.token === null);
  const seed0 = argOf(first[0]?.argv ?? [], '--seed');
  check('a bare play.sh gives the bridge a random --seed, once, and prints it (the bridge\'s own default is 0: one shuffle, one game id, every run)',
    /^\d+$/.test(seed0 ?? '') && first[0].argv.filter((a) => a === '--seed').length === 1 && A.out().includes(`seed ${seed0} (random`), first[0]?.argv?.join(' '));
  r = await http({ port: A.coachPort, path: '/match' });
  check('GET /match: the configured match, names and counts only', r.status === 200 && r.json?.ok === true && r.json?.state === 'running'
    && typeof r.json?.match?.yourDeck?.name === 'string' && JSON.stringify(Object.keys(r.json.match.aiDeck)) === '["name","cards"]'
    && JSON.stringify(Object.keys(r.json.match.yourDeck)) === '["name","cards"]', r.body);

  // A seat on the old engine.
  const seat = connect(A.port, '127.0.0.1');
  let seatClosed = false;
  seat.on('close', () => { seatClosed = true; });
  seat.on('error', () => {});
  seat.write('GET /ws HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n');
  await sleep(300);

  const NAME = "Rock & Roll's Deck: A/B (1+1)";
  const req1 = {
    deck: deck(NAME, RED, [[2, 'Smash to Smithereens'], [1, 'Pyroclasm|M10']]),
    aiDeck: deck('AI Draft', BLUE),
    aiProfile: 'reckless',
    games: 1,
  };
  const t0 = Date.now();
  r = await post(A.coachPort, req1, { Origin: 'https://jalirkan.github.io' });
  check('POST /match: 200 with the new decks', r.status === 200 && r.json?.ok === true, `${r.status} ${r.body}`);
  check('the reply names your deck and its path', r.json?.yourDeck?.name === NAME && /^var\/match-launcher-selftest\/a\/match\/m\d{13}\/you\.dck$/.test(r.json?.yourDeck?.path ?? '') && r.json?.yourDeck?.cards === 40, r.body);
  check("the reply's aiDeck is {name, cards} and nothing else", JSON.stringify(r.json?.aiDeck) === '{"name":"AI Draft","cards":40}', r.body);
  check('the profile is canonical, the games as asked, no warnings', r.json?.aiProfile === 'Reckless' && r.json?.games === 1 && Array.isArray(r.json?.warnings) && r.json.warnings.length === 0, r.body);
  check('CORS echoed for ForgeCoach', r.headers['access-control-allow-origin'] === 'https://jalirkan.github.io');
  console.log(`        (the restart took ${Date.now() - t0} ms)`);
  const mdir = join(DIR, 'a', 'match', r.json?.yourDeck?.path?.split('/')[4] ?? 'none');
  check('you.dck is exactly the deck', readFileSync(join(mdir, 'you.dck'), 'utf8') === [
    '[metadata]', `Name=${NAME}`, '[main]', '17 Mountain', '4 Lightning Bolt', '4 Shock', '15 Goblin Piker',
    '[sideboard]', '2 Smash to Smithereens', '1 Pyroclasm|M10', ''].join('\n'));
  check('ai.dck is exactly the deck, no sideboard section', readFileSync(join(mdir, 'ai.dck'), 'utf8') === [
    '[metadata]', 'Name=AI Draft', '[main]', '17 Island', '4 Counterspell', '4 Opt', '15 Wind Drake', ''].join('\n'));
  let s = starts();
  const second = s[1]?.argv ?? [];
  check('the engine was restarted once', s.length === 2);
  check('with the new decks, profile and games', argOf(second, '--deck') === r.json?.yourDeck?.path && argOf(second, '--ai-deck') === r.json?.yourDeck?.path.replace('you.dck', 'ai.dck')
    && argOf(second, '--ai-profile') === 'Reckless' && argOf(second, '--games') === '1', second.join(' '));
  check('the new match has a random seed of its own, once', /^\d+$/.test(argOf(second, '--seed') ?? '') && second.filter((a) => a === '--seed').length === 1, second.join(' '));
  check('and every other flag kept (--transport ws, the port, --keep-open)', argOf(second, '--transport') === 'ws' && argOf(second, '--port') === String(A.port) && second.includes('--keep-open')
    && second.filter((a) => a === '--deck').length === 1 && second.filter((a) => a === '--games').length === 1, second.join(' '));
  check('a game id of its own, match-<id>', argOf(second, '--game-id') === 'match-' + r.json?.yourDeck?.path.split('/')[4], second.join(' '));
  check('the deck name never reached a command line', !second.some((a) => a.includes('Rock')));
  check('no aiPolicy: the AI as play.sh started it (plain), no --ai-policy added', r.json?.aiPolicy === 'plain' && !second.includes('--ai-policy') && !second.includes('--ai-search'), `${r.body} ${second.join(' ')}`);
  check('the old engine is gone', !alive(first[0].pid));
  for (let i = 0; i < 20 && !seatClosed; i++) await sleep(50);
  check("the old engine's seat socket was dropped", seatClosed);
  r = await http({ port: A.coachPort, path: '/match' });
  check('GET /match: the new match', r.status === 200 && r.json?.match?.yourDeck?.name === NAME && r.json?.match?.aiDeck?.name === 'AI Draft'
    && r.json?.match?.aiDeck?.cards === 40 && r.json?.match?.aiProfile === 'Reckless' && r.json?.match?.games === 1, r.body);
  r = await http({ port: A.port, path: '/health' });
  check('the new engine answers /health', r.status === 200 && r.body === 'ok');

  // ------------------------------------------------------------- bad input
  console.log('== bad input: refused before anything is written or restarted');
  const before = starts().length;
  const dirsBefore = readdirSync(join(DIR, 'a', 'match')).length;
  const bad = async (what, q, status, re) => {
    const x = await post(A.coachPort, q);
    check(`${what}: ${status}`, x.status === status && x.json?.ok === false && x.json?.type === 'error' && (!re || re.test(x.json?.message ?? '')), `${x.status} ${x.body.slice(0, 300)}`);
  };
  await bad('39 cards', { ...req1, deck: deck('Short', [[39, 'Mountain']]) }, 400, /at least 40/);
  await bad('a card name with a newline', { ...req1, deck: deck('Inject', [[39, 'Mountain'], [1, 'Bolt\n[metadata]']]) }, 400, /not a card name/);
  await bad('a card name with $( )', { ...req1, aiDeck: deck('Inject', [[39, 'Island'], [1, '$(touch pwned)']]) }, 400, /not a card name/);
  await bad('a deck name with ;', { ...req1, deck: deck('x; rm -rf ~', RED) }, 400, /name must be/);
  await bad('a deck name with a newline', { ...req1, deck: deck('Deck\nName=Other', RED) }, 400, /name must be/);
  await bad('a deck name starting with ../', { ...req1, deck: deck('../../etc/passwd', RED) }, 400, /name must be/);
  await bad('a count of 0', { ...req1, deck: deck('Zero', [[0, 'Mountain'], ...RED]) }, 400, /count/);
  await bad('a count that is not a number', { ...req1, deck: deck('Str', [['40', 'Mountain']]) }, 400, /count/);
  await bad('over 250 cards', { ...req1, deck: deck('Huge', [[200, 'Mountain'], [51, 'Shock']]) }, 400, /251 cards \(at most 250\)/);
  await bad('a count over 250', { ...req1, deck: deck('Huge', [[251, 'Mountain']]) }, 400, /1-250/);
  await bad('an unknown profile', { ...req1, aiProfile: 'Hard' }, 400, /Default, Cautious, Reckless, Experimental|aiProfile must be/);
  await bad('games 0', { ...req1, games: 0 }, 400, /games/);
  await bad('an unknown aiPolicy', { ...req1, aiPolicy: 'hard' }, 400, /aiPolicy must be one of plain, outlets, search/);
  await bad('aiPolicy in the wrong case', { ...req1, aiPolicy: 'Search' }, 400, /aiPolicy/);
  await bad('aiPolicy smuggling a flag', { ...req1, aiPolicy: 'search --seat 1' }, 400, /aiPolicy/);
  await bad('aiSearchMs under 500', { ...req1, aiPolicy: 'search', aiSearchMs: 100 }, 400, /aiSearchMs must be a whole number 500-5000/);
  await bad('aiSearchMs over 5000', { ...req1, aiPolicy: 'search', aiSearchMs: 60000 }, 400, /aiSearchMs/);
  await bad('aiSearchMs as a string', { ...req1, aiPolicy: 'search', aiSearchMs: '3000,turns=4' }, 400, /aiSearchMs/);
  await bad('aiSearchMs without the search policy', { ...req1, aiPolicy: 'outlets', aiSearchMs: 1000 }, 400, /only with "aiPolicy": "search"/);
  await bad('aiSearchMs with no aiPolicy', { ...req1, aiSearchMs: 1000 }, 400, /only with/);
  await bad('games 1.5', { ...req1, games: 1.5 }, 400, /games/);
  await bad('no aiDeck', { deck: req1.deck }, 400, /aiDeck/);
  await bad('main not an array', { ...req1, deck: { name: 'X', main: 'Mountain' } }, 400, /array/);
  await bad('a set code that is not one', { ...req1, deck: deck('Set', [[39, 'Mountain'], [1, 'Shock|m10; ls']]) }, 400, /not a card name/);
  await bad('not JSON', '{nope', 400, /not JSON/);
  const big = await http({ port: A.coachPort, method: 'POST', path: '/match', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pad: 'x'.repeat(70 * 1024) }) });
  check('over 64 KB: 413', big.status === 413, `${big.status}`);
  r = await post(A.coachPort, req1, { Origin: 'https://evil.example' });
  check('another site may not POST /match: 403', r.status === 403 && !r.headers['access-control-allow-origin']);
  r = await http({ port: A.coachPort, method: 'OPTIONS', path: '/match', headers: { Origin: 'https://jalirkan.github.io', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Private-Network': 'true' } });
  check('the preflight from ForgeCoach: 204 with private network', r.status === 204 && r.headers['access-control-allow-private-network'] === 'true' && /POST/.test(r.headers['access-control-allow-methods'] ?? ''));
  r = await http({ port: A.coachPort, method: 'PUT', path: '/match' });
  check('PUT /match: 405', r.status === 405);
  check('none of them restarted the engine', starts().length === before, `${starts().length} vs ${before}`);
  check('none of them wrote a deck', readdirSync(join(DIR, 'a', 'match')).length === dirsBefore);

  // ------------------------------------------------------------- the engine's own say
  console.log("== the engine's own say: a deck it will not start on, a card it drops");
  r = await post(A.coachPort, { ...req1, deck: deck('Crash Test', RED) });
  check('an engine that does not start: 502, the previous match restored', r.status === 502 && r.json?.restored === true && /did not start on these decks/.test(r.json?.message ?? '') && /previous match is running again/.test(r.json?.message ?? ''), `${r.status} ${r.body}`);
  check('the failure names the cause from the log', /ENGINE CRASHED/.test(r.json?.message ?? ''), r.json?.message);
  s = starts();
  check('the previous match was started again with its own flags', s.length === before + 2 && JSON.stringify(s.at(-1).argv) === JSON.stringify(second), s.map((e) => e.argv.join(' ')).join(' | '));
  r = await http({ port: A.coachPort, path: '/match' });
  check('GET /match: still the previous match', r.json?.match?.yourDeck?.name === NAME && r.json?.state === 'running', r.body);
  r = await post(A.coachPort, { ...req1, deck: deck('Drop One Deck', RED) });
  check("the engine's own count: 200 with a warning", r.status === 200 && r.json?.yourDeck?.cards === 39 && r.json?.warnings?.length === 1 && /39 of the 40/.test(r.json.warnings[0]), r.body);
  check('a second POST while one runs: 409', await (async () => {
    const p1 = post(A.coachPort, req1);
    await sleep(150);
    const x = await post(A.coachPort, req1);
    const y = await p1;
    return x.status === 409 && y.status === 200;
  })());
  r = await post(A.coachPort, { ...req1, aiProfile: 'Cautious' });
  const r2 = await post(A.coachPort, { ...req1, aiProfile: 'Experimental' });
  check('two POSTs back to back: both started', r.status === 200 && r2.status === 200 && r2.json?.aiProfile === 'Experimental', `${r.status} ${r2.status} ${r2.body}`);
  // The helper re-sends SIGUSR1 until play.sh takes a request up, so on a slow
  // machine one lands in the middle of a restart.  Bash 5.2 running a trap while
  // it parses a $( ) fails with "unexpected EOF while looking for matching `)'",
  // set -e ended play.sh, and its exit took the helper with it: the POST got
  // "socket hang up".  Here a signal every millisecond for a whole restart.
  const storm = setInterval(() => { try { process.kill(A.proc.pid, 'SIGUSR1'); } catch { /* gone */ } }, 1);
  r = await post(A.coachPort, { ...req1, aiProfile: 'Cautious' }).catch((e) => ({ status: 0, body: e.message }));
  clearInterval(storm);
  check('SIGUSR1 at any moment of a restart: 200, play.sh still up', r.status === 200 && r.json?.aiProfile === 'Cautious' && A.proc.exitCode === null, `${r.status} ${r.body} exit ${A.proc.exitCode}`);
  check('never two engines at once', !events().some((e) => e.overlap) && !events().some((e) => e.bindError), JSON.stringify(events().filter((e) => e.overlap || e.bindError)));
  // ------------------------------------------------------------- the AI policy (D333)
  console.log('== the AI policy: search with a budget, outlets, then back to as started');
  r = await post(A.coachPort, { ...req1, aiPolicy: 'search', aiSearchMs: 3000 });
  let pa = starts().at(-1).argv;
  check('aiPolicy search, aiSearchMs 3000: 200 naming the policy', r.status === 200 && r.json?.aiPolicy === 'search', `${r.status} ${r.body}`);
  check('...the engine got --ai-policy search --ai-search ms=3000', argOf(pa, '--ai-policy') === 'search' && argOf(pa, '--ai-search') === 'ms=3000', pa.join(' '));
  r = await http({ port: A.coachPort, path: '/match' });
  check('GET /match: aiPolicy search', r.json?.match?.aiPolicy === 'search', r.body);
  r = await post(A.coachPort, { ...req1, aiPolicy: 'outlets' });
  pa = starts().at(-1).argv;
  check('aiPolicy outlets: one --ai-policy outlets, no --ai-search', r.status === 200 && r.json?.aiPolicy === 'outlets'
    && pa.filter((a) => a === '--ai-policy').length === 1 && argOf(pa, '--ai-policy') === 'outlets' && !pa.includes('--ai-search'), `${r.body} ${pa.join(' ')}`);
  r = await post(A.coachPort, req1);
  pa = starts().at(-1).argv;
  check('no aiPolicy again: plain, as play.sh was started', r.status === 200 && r.json?.aiPolicy === 'plain' && !pa.includes('--ai-policy'), `${r.body} ${pa.join(' ')}`);
  check('the decks of old matches are pruned to the last 5', readdirSync(join(DIR, 'a', 'match')).filter((n) => /^m\d{13}$/.test(n)).length <= 5);

  // ------------------------------------------------------------- play.sh --lan
  console.log('== play.sh --lan: a restart keeps the pairing token');
  const L = await startPlay(['--lan', '--site-dir', `${REL}/site`, '--ai-search-ms', '2000'], 'lan');
  const onL = () => starts().filter((e) => argOf(e.argv, '--port') === String(L.port));
  const lanFirst = onL()[0];
  const t1 = events().find((e) => e.pid === lanFirst?.pid && e.lanToken)?.lanToken;
  // play.sh echoes the engine's pairing line a moment after the engine logs it: wait for it.
  for (let i = 0; i < 50 && t1 && !L.out().includes(`token=${t1}`); i++) await sleep(100);
  check('the first --lan engine minted its own token (none handed in)', lanFirst?.token === null && !!t1 && L.out().includes(`token=${t1}`), JSON.stringify({ lanFirst, t1 }));
  r = await post(L.coachPort, req1);
  check('POST /match on a --lan engine: 200', r.status === 200, `${r.status} ${r.body}`);
  const lanSecond = onL()[1];
  check('the restarted engine got the first token, in its environment', !!t1 && lanSecond?.token === t1 && lanSecond.argv.includes('--lan') && !lanSecond.argv.some((a) => a.includes(t1)), JSON.stringify({ t1, lanSecond }));
  check('--site-dir kept', argOf(lanSecond?.argv ?? [], '--site-dir') === `${REL}/site`);
  check('the token is not in the launcher reply', !r.body.includes(t1));
  check('play.sh --ai-search-ms kept when the request names no policy (D333)', r.json?.aiPolicy === 'search'
    && argOf(lanSecond?.argv ?? [], '--ai-search') === 'ms=2000', `${r.body} ${lanSecond?.argv?.join(' ')}`);
  r = await post(L.coachPort, { ...req1, aiPolicy: 'plain' });
  const lanThird = onL()[2]?.argv ?? [];
  check('...and replaced when it does: aiPolicy plain drops --ai-search', r.status === 200 && r.json?.aiPolicy === 'plain'
    && lanThird.filter((a) => a === '--ai-policy').length === 1 && argOf(lanThird, '--ai-policy') === 'plain' && !lanThird.includes('--ai-search'), `${r.body} ${lanThird.join(' ')}`);

  // ------------------------------------------------------------- Ctrl-C
  console.log("== play.sh's Ctrl-C takes it all down");
  const lastA = starts().filter((e) => argOf(e.argv, '--port') === String(A.port)).at(-1);
  A.proc.kill('SIGTERM');
  L.proc.kill('SIGTERM');
  for (let i = 0; i < 100 && (A.proc.exitCode === null || L.proc.exitCode === null); i++) await sleep(50);
  check('play.sh exited', A.proc.exitCode !== null && L.proc.exitCode !== null);
  for (let i = 0; i < 40 && alive(lastA.pid); i++) await sleep(50);
  check('its engine is gone', !alive(lastA.pid));
  check('its coach helper is gone', await http({ port: A.coachPort }).then(() => false, () => true));
  check('current.json removed', !existsSync(join(DIR, 'a', 'match', 'current.json')));

  // ------------------------------------------------------------- D308: the engine sleeps
  console.log('== the engine exits on its idle limit: play.sh and the helper stay up (D308)');
  const Z = await startPlay(['--', '--idle-timeout', '2'], 'idle');
  const onZ = () => starts().filter((e) => argOf(e.argv, '--port') === String(Z.port));
  r = await http({ port: Z.coachPort });
  check('/health: engine running while it runs', r.json?.match === 1 && r.json?.engine === 'running', r.body);
  const z1 = onZ()[0];
  for (let i = 0; i < 100 && alive(z1?.pid); i++) await sleep(100);
  check('the idle limit stopped the engine', !alive(z1?.pid) && events().some((e) => e.pid === z1.pid && e.idleExit));
  await untilIdle(Z.coachPort);
  check('play.sh stayed up', Z.proc.exitCode === null);
  r = await http({ port: Z.coachPort });
  check('/health: engine idle, match 1, with idleSince and exitsAt', r.status === 200 && r.json?.engine === 'idle' && r.json?.match === 1
    && typeof r.json?.idleSince === 'string' && typeof r.json?.exitsAt === 'string' && r.json.exitsAt > r.json.idleSince, r.body);
  r = await http({ port: Z.coachPort, path: '/match' });
  check('GET /match: idle, no current match', r.status === 200 && r.json?.state === 'idle' && r.json?.match === null, r.body);
  check('no engine answers on the ws port', await http({ port: Z.port }).then(() => false, () => true));
  for (let i = 0; i < 50 && !/engine asleep/.test(Z.out()); i++) await sleep(100);   // it says so just after engine.json
  check('play.sh said so', /engine asleep/.test(Z.out()));
  const zn = onZ().length;
  r = await post(Z.coachPort, req1);
  check('POST /match while asleep: 200', r.status === 200 && r.json?.ok === true && r.json?.yourDeck?.name === NAME, `${r.status} ${r.body}`);
  const z2 = onZ();
  check('a fresh engine started on the new decks', z2.length === zn + 1 && argOf(z2.at(-1).argv, '--deck') === r.json?.yourDeck?.path
    && argOf(z2.at(-1).argv, '--ai-profile') === 'Reckless' && argOf(z2.at(-1).argv, '--idle-timeout') === '2', z2.at(-1)?.argv?.join(' '));
  check('never two engines on that port', !events().some((e) => e.overlap && onZ().some((z) => z.pid === e.pid)));
  r = await http({ port: Z.coachPort });
  check('/health: engine running again', r.json?.engine === 'running' && r.json?.idleSince === undefined, r.body);
  r = await http({ port: Z.coachPort, path: '/match' });
  check('GET /match: running, the new match', r.json?.state === 'running' && r.json?.match?.yourDeck?.name === NAME, r.body);
  // ...and it can fall asleep again, then Ctrl-C while asleep cleans up.
  const zlast = z2.at(-1);
  for (let i = 0; i < 100 && alive(zlast.pid); i++) await sleep(100);
  await untilIdle(Z.coachPort);
  r = await http({ port: Z.coachPort });
  check('asleep again after the next match', Z.proc.exitCode === null && r.json?.engine === 'idle', r.body);
  // D308: POST /engine/start wakes it on the last match setup.
  r = await http({ port: Z.coachPort });
  check('/health: engine_start 1', r.json?.engine_start === 1, r.body);
  r = await http({ port: Z.coachPort, path: '/engine/start' });
  check('GET /engine/start: 405', r.status === 405, `${r.status}`);
  r = await http({ port: Z.coachPort, method: 'POST', path: '/engine/start', headers: { Origin: 'https://evil.example' } });
  check('/engine/start from another origin: 403', r.status === 403);
  const zs = onZ().length;
  r = await http({ port: Z.coachPort, method: 'POST', path: '/engine/start', headers: { Origin: 'https://jalirkan.github.io' } });
  check('POST /engine/start while asleep: 200, already false, the last match', r.status === 200 && r.json?.ok === true && r.json?.already === false
    && r.json?.yourDeck?.name === NAME && r.json?.aiDeck?.name === 'AI Draft' && r.json?.aiProfile === 'Reckless' && r.json?.games === 1
    && JSON.stringify(Object.keys(r.json.aiDeck)) === '["name","cards"]' && r.headers['access-control-allow-origin'] === 'https://jalirkan.github.io', `${r.status} ${r.body}`);
  const zw = onZ();
  check('the engine started on the last decks, with a game id of its own', zw.length === zs + 1 && argOf(zw.at(-1).argv, '--deck') === argOf(zlast.argv, '--deck')
    && argOf(zw.at(-1).argv, '--ai-profile') === 'Reckless' && argOf(zw.at(-1).argv, '--game-id') !== argOf(zlast.argv, '--game-id')
    && /^match-m\d{13}$/.test(argOf(zw.at(-1).argv, '--game-id') ?? ''), zw.at(-1)?.argv?.join(' '));
  r = await http({ port: Z.coachPort, method: 'POST', path: '/engine/start' });
  check('POST /engine/start while running: 200 already true', r.status === 200 && r.json?.ok === true && r.json?.already === true && r.json?.yourDeck?.name === NAME && onZ().length === zs + 1, `${r.status} ${r.body}`);
  const zwl = zw.at(-1);
  for (let i = 0; i < 100 && alive(zwl.pid); i++) await sleep(100);
  await untilIdle(Z.coachPort);
  r = await http({ port: Z.coachPort });
  check('asleep once more', r.json?.engine === 'idle', r.body);

  // A second launch beside a sleeping play.sh wakes it and exits 0.
  const zc = onZ().length;
  const second2 = spawn('bash', ['scripts/play.sh', '--engine-only', '--coach-port', String(Z.coachPort)], {
    env: { ...process.env, PATH, MTGTABLE_TEST_FAKE_ENGINE: join(DIR, 'fake-engine.cjs'), MTGTABLE_TEST_VAR: `${REL}/second`, FAKE_EVENTS: EVENTS, FAKE_ALIVE: ALIVE },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  procs.push(second2);
  let sout = '';
  second2.stdout.on('data', (d) => { sout += d; });
  second2.stderr.on('data', (d) => { sout += d; });
  for (let i = 0; i < 200 && second2.exitCode === null; i++) await sleep(100);
  check('second play.sh: exit 0 with a clear message', second2.exitCode === 0 && /asleep — waking it/.test(sout) && /Engine ready on/.test(sout), `${second2.exitCode}\n${sout}`);
  check('...it started no bridge and no helper of its own, and the sleeper woke', onZ().length === zc + 1 && !starts().some((e) => argOf(e.argv, '--port') === '8642') && !existsSync(join(DIR, 'second')), sout);
  r = await http({ port: Z.coachPort });
  check('...and the first play.sh is running its engine again', Z.proc.exitCode === null && r.json?.engine === 'running', r.body);
  const zl2 = onZ().at(-1);
  for (let i = 0; i < 100 && alive(zl2.pid); i++) await sleep(100);
  await untilIdle(Z.coachPort);
  Z.proc.kill('SIGTERM');
  for (let i = 0; i < 100 && Z.proc.exitCode === null; i++) await sleep(50);
  check('Ctrl-C while asleep: play.sh exited 0', Z.proc.exitCode === 0, String(Z.proc.exitCode));
  check('...its coach helper is gone', await http({ port: Z.coachPort }).then(() => false, () => true));
  check('...engine.json and current.json removed', !existsSync(join(DIR, 'idle', 'match', 'engine.json')) && !existsSync(join(DIR, 'idle', 'match', 'current.json')));

  console.log('== /engine/start with no earlier /match: the startup decks');
  const W = await startPlay(['--', '--idle-timeout', '1'], 'wake');
  const onW = () => starts().filter((e) => argOf(e.argv, '--port') === String(W.port));
  for (let i = 0; i < 100 && alive(onW()[0]?.pid); i++) await sleep(100);
  await untilIdle(W.coachPort);
  r = await http({ port: W.coachPort });
  check('asleep', r.json?.engine === 'idle', r.body);
  r = await http({ port: W.coachPort, method: 'POST', path: '/engine/start' });
  check('POST /engine/start: 200 on the startup decks', r.status === 200 && r.json?.already === false && typeof r.json?.yourDeck?.name === 'string' && r.json?.yourDeck?.cards > 0, `${r.status} ${r.body}`);
  const w0 = onW()[0].argv.filter((a, i, v) => a !== '--game-id' && v[i - 1] !== '--game-id');
  const w1 = onW()[1]?.argv ?? [];
  check('with the same flags as the first start and a game id of its own', JSON.stringify(w1.filter((a, i, v) => a !== '--game-id' && v[i - 1] !== '--game-id')) === JSON.stringify(w0) && /^match-m\d{13}$/.test(argOf(w1, '--game-id') ?? ''), w1.join(' '));

  // D381: the same wake, with the AI profile ForgeCoach's Setup picked (no decks).
  console.log('== /engine/start with {"aiProfile"} (D381)');
  check('checkWake: no body is the D308 wake', JSON.stringify(checkWake('')) === '{"aiProfile":null,"problems":[]}' && checkWake(undefined).aiProfile === null && checkWake('  \n').problems.length === 0);
  check('checkWake: {} and unknown keys are the D308 wake', checkWake('{}').aiProfile === null && checkWake('{"x":1}').problems.length === 0);
  check('checkWake: a profile in any case, canonical', checkWake('{"aiProfile":"cAuTiOuS"}').aiProfile === 'Cautious');
  check('checkWake: a bad profile, JSON or shape is a problem', checkWake('{"aiProfile":"Hard"}').problems.length === 1 && checkWake('{"aiProfile":3}').problems.length === 1
    && checkWake('nope').problems[0] === 'the body is not JSON' && checkWake('[1]').problems.length === 1 && checkWake('"Cautious"').problems.length === 1);
  r = await http({ port: W.coachPort });
  check('/health: engine_start_profile 1', r.json?.engine_start === 1 && r.json?.engine_start_profile === 1, r.body);
  const wn = onW().length;
  const wakeWith = (body, port = W.coachPort) => http({ port, method: 'POST', path: '/engine/start', headers: { 'Content-Type': 'application/json', Origin: 'https://jalirkan.github.io' }, body });
  for (let i = 0; i < 100 && alive(onW().at(-1)?.pid); i++) await sleep(100);
  await untilIdle(W.coachPort);
  // Refusals start nothing.
  for (const [what, body] of [['an unknown profile', '{"aiProfile":"Hard"}'], ['a non-string profile', '{"aiProfile":["Cautious"]}'], ['a body that is not JSON', 'Cautious'], ['a JSON array', '["Cautious"]']]) {
    r = await wakeWith(body);
    check(`${what}: 400 with problems, nothing started`, r.status === 400 && r.json?.ok === false && Array.isArray(r.json?.problems) && onW().length === wn, `${r.status} ${r.body}`);
  }
  r = await http({ port: W.coachPort });
  check('...still asleep', r.json?.engine === 'idle', r.body);
  r = await wakeWith('{"aiProfile":"cautious","aiDeck":"ignored"}');
  check('asleep, {"aiProfile":"cautious"}: 200, woken on Cautious', r.status === 200 && r.json?.already === false && r.json?.aiProfile === 'Cautious'
    && JSON.stringify(Object.keys(r.json.aiDeck)) === '["name","cards"]', `${r.status} ${r.body}`);
  const wp = onW().at(-1)?.argv ?? [];
  const without = (v, f) => v.filter((a, i) => a !== f && v[i - 1] !== f);
  check('...one --ai-profile, Cautious; every other flag as the last setup, a game id of its own', onW().length === wn + 1 && wp.filter((a) => a === '--ai-profile').length === 1
    && argOf(wp, '--ai-profile') === 'Cautious' && JSON.stringify(without(without(wp, '--game-id'), '--ai-profile')) === JSON.stringify(without(without(w0, '--game-id'), '--ai-profile'))
    && /^match-m\d{13}$/.test(argOf(wp, '--game-id') ?? '') && argOf(wp, '--game-id') !== argOf(w1, '--game-id'), wp.join(' '));
  for (let i = 0; i < 100 && alive(onW().at(-1)?.pid); i++) await sleep(100);
  await untilIdle(W.coachPort);
  r = await http({ port: W.coachPort, method: 'POST', path: '/engine/start' });
  check('then a wake with no body keeps Cautious: it is the last setup now', r.status === 200 && r.json?.already === false && r.json?.aiProfile === 'Cautious'
    && argOf(onW().at(-1)?.argv ?? [], '--ai-profile') === 'Cautious', `${r.status} ${r.body}`);
  W.proc.kill('SIGTERM');
  for (let i = 0; i < 100 && W.proc.exitCode === null; i++) await sleep(50);
  // While an engine runs (no idle limit here): nothing restarts, the profile is not applied, a warning says so.
  const R = await startPlay([], 'wakerun');
  const onR = () => starts().filter((e) => argOf(e.argv, '--port') === String(R.port));
  const rn = onR().length;
  r = await wakeWith('{"aiProfile":"Reckless"}', R.coachPort);
  check('while running: 200 already, Default kept, a warning, no restart', r.status === 200 && r.json?.already === true && r.json?.aiProfile === 'Default'
    && r.json?.warnings?.length === 1 && /Reckless was not applied/.test(r.json.warnings[0]) && onR().length === rn, `${r.status} ${r.body}`);
  r = await wakeWith('{"aiProfile":"default"}', R.coachPort);
  check('while running, the profile it plays: no warning', r.status === 200 && r.json?.already === true && r.json?.warnings === undefined && onR().length === rn, r.body);
  r = await wakeWith('{"aiProfile":"Hard"}', R.coachPort);
  check('while running, a bad profile: still 400', r.status === 400 && onR().length === rn, r.body);
  R.proc.kill('SIGTERM');
  for (let i = 0; i < 100 && R.proc.exitCode === null; i++) await sleep(50);

  console.log('== --idle-exit-after: play.sh gives up by itself');
  const X = await startPlay(['--idle-exit-after', '0.05', '--', '--idle-timeout', '1'], 'idlex');
  for (let i = 0; i < 200 && X.proc.exitCode === null; i++) await sleep(100);
  check('play.sh exited 0 after the limit', X.proc.exitCode === 0 && /no match request for 0\.05 min/.test(X.out()), `${X.proc.exitCode}\n${X.out().slice(-400)}`);
  check('...its coach helper is gone', await http({ port: X.coachPort }).then(() => false, () => true));
  const badArg = await new Promise((res) => {
    const p = spawn('bash', ['scripts/play.sh', '--engine-only', '--idle-exit-after', 'soon'], { env: { ...process.env, PATH }, stdio: 'ignore' });
    p.on('exit', (code) => res(code));
  });
  check("--idle-exit-after soon is refused", badArg === 1);

  console.log('== --no-match: the old behaviour, play.sh exits with the engine');
  const M = await startPlay(['--no-match', '--seed', '7', '--', '--idle-timeout', '1'], 'nomatch');
  const mStart = starts().filter((e) => argOf(e.argv, '--port') === String(M.port)).at(-1)?.argv ?? [];
  check('a --seed of the caller\'s is passed as given, and no random one beside it', argOf(mStart, '--seed') === '7' && mStart.filter((a) => a === '--seed').length === 1 && !/\(random;/.test(M.out()), mStart.join(' '));
  for (let i = 0; i < 100 && M.proc.exitCode === null; i++) await sleep(100);
  check('play.sh exited when the engine did (rc 1)', M.proc.exitCode === 1 && /the bridge exited \(1\)/.test(M.out()), `${M.proc.exitCode}\n${M.out().slice(-300)}`);
  check('no sleeping message', !/engine asleep/.test(M.out()));

  // ------------------------------------------------------------- the card check, a helper of its own
  console.log("== the card check against the engine's scripts (a tiny cardsfolder.zip)");
  const zipPath = join(DIR, 'cardsfolder.zip');
  writeFileSync(zipPath, makeZip([
    ['m/mountain.txt', 'Name:Mountain\nTypes:Basic Land Mountain\n'],
    ['i/island.txt', 'Name:Island\nTypes:Basic Land Island\n'],
    ['l/lightning_bolt.txt', 'Name:Lightning Bolt\nManaCost:R\n'],
    ['f/fire_ice.txt', 'Name:Fire\nManaCost:1 R\nALTERNATE\nName:Ice\nManaCost:1 U\n'],
    ['l/lim_dul_the_necromancer.txt', 'Name:Lim-Dûl the Necromancer\n'],
  ]));
  // A supervisor that answers like play.sh: on SIGUSR1, "ready" with what it was asked.
  const supDir = join(DIR, 'sup', 'match');
  mkdirSync(supDir, { recursive: true });
  const sup = spawn(process.execPath, ['-e', `
    const fs = require('fs'), path = require('path');
    const dir = process.argv[1];
    process.on('SIGUSR1', () => {
      const r = JSON.parse(fs.readFileSync(path.join(dir, 'request.json'), 'utf8'));
      const cards = (f) => fs.readFileSync(f, 'utf8').split('[main]')[1].split('[sideboard]')[0].split('\\n').reduce((n, l) => n + (Number((/^(\\d+) /.exec(l) || [])[1]) || 0), 0);
      const name = (f) => /^Name=(.*)$/m.exec(fs.readFileSync(f, 'utf8'))[1];
      const match = { yourDeck: { name: name(r.deck), path: r.deck, cards: cards(r.deck) }, aiDeck: { name: name(r.aiDeck), cards: cards(r.aiDeck) }, aiProfile: r.aiProfile, games: r.games };
      fs.writeFileSync(path.join(dir, 'status.json'), JSON.stringify({ id: r.id, state: 'ready', match }));
    });
    setInterval(() => {}, 1000);
  `, supDir], { stdio: 'ignore' });
  procs.push(sup);
  await sleep(300);
  const cp = await freePort();
  const H = spawn(process.execPath, ['tools/coach-helper.mjs', '--port', String(cp), '--match-dir', `${REL}/sup/match`, '--supervisor', String(sup.pid), '--cards-zip', zipPath, '--match-timeout', '10'], { env: { ...process.env, PATH }, stdio: ['ignore', 'pipe', 'pipe'] });
  procs.push(H);
  let hlog = '';
  H.stdout.on('data', (d) => { hlog += d; });
  H.stderr.on('data', (d) => { hlog += d; });
  for (let i = 0; i < 100 && !/COACH MATCH/.test(hlog); i++) await sleep(50);
  const LAND = [[20, 'Mountain'], [20, 'Island']];
  r = await post(cp, { deck: deck('Known', [...LAND, [1, 'lightning bolt'], [1, 'Fire // Ice'], [1, 'Lim-Dul the Necromancer'], [1, 'Lightning Bolt|M10']]), aiDeck: deck('AI', LAND) });
  check('known names pass (any case, accents folded, A // B, |SET)', r.status === 200 && r.json?.yourDeck?.cards === 44, `${r.status} ${r.body}`);
  check('the defaults: Default profile, 3 games', r.json?.aiProfile === 'Default' && r.json?.games === 3, r.body);
  r = await post(cp, { deck: deck('Known', LAND), aiDeck: deck('AI', [...LAND, [1, 'Black Lotus'], [2, 'Moxen Galore']]) });
  check('an unknown card: 400 naming it and the deck', r.status === 400 && /aiDeck: 2 card names the engine does not know: Black Lotus; Moxen Galore/.test(r.json?.message ?? ''), r.body);
  // Seven names from the zip (Fire, Ice and "Fire // Ice" among them), plus D14's custom card.
  check('the card index was read from the zip', /card index: \d+ names from .*cardsfolder\.zip/.test(hlog) && Number(/card index: (\d+)/.exec(hlog)?.[1]) >= 7, hlog);

  // ------------------------------------------------------------- no supervisor
  console.log('== without play.sh: /match is off');
  const np = await freePort();
  const N = spawn(process.execPath, ['tools/coach-helper.mjs', '--port', String(np)], { env: { ...process.env, PATH }, stdio: 'ignore' });
  procs.push(N);
  for (let i = 0; i < 100; i++) { if (await http({ port: np }).then(() => true, () => false)) break; await sleep(50); }
  r = await http({ port: np });
  check('/health says match: 0', r.json?.match === 0, r.body);
  r = await post(np, req1);
  check('POST /match: 503', r.status === 503 && /off/.test(r.json?.message ?? ''), r.body);
  sup.kill('SIGKILL');
  await sleep(200);
  r = await http({ port: cp });
  check('a supervisor that died: match: 0', r.json?.match === 0, r.body);
  r = await post(cp, { deck: deck('Known', LAND), aiDeck: deck('AI', LAND) });
  check('...and POST /match: 503', r.status === 503, r.body);
  check('--match-dir outside var/ is refused at startup', await new Promise((res) => {
    const p = spawn(process.execPath, ['tools/coach-helper.mjs', '--port', '0', '--match-dir', '/tmp', '--supervisor', String(process.pid)], { stdio: 'ignore' });
    p.on('exit', (code) => res(code === 2));
  }));
} catch (e) {
  failed++;
  console.log(`  FAIL  the self-test threw: ${e.stack}`);
} finally {
  for (const p of procs) { try { p.kill('SIGTERM'); } catch { /* gone */ } }
  await sleep(1200);
  for (const f of existsSync(ALIVE) ? readdirSync(ALIVE) : []) { try { process.kill(Number(f), 'SIGKILL'); } catch { /* gone */ } }
}

/** A zip of [name, text] entries, deflated: just enough for loadCardIndex. */
function makeZip(entries) {
  const locals = [];
  const centrals = [];
  let off = 0;
  for (const [name, text] of entries) {
    const n = Buffer.from(name);
    const raw = Buffer.from(text);
    const data = deflateRawSync(raw);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(n.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(n.length, 28); ch.writeUInt32LE(off, 42);
    locals.push(lh, n, data);
    centrals.push(ch, n);
    off += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...locals, cd, end]);
}

console.log(failed === 0 ? `match-launcher-selftest OK (${passed} checks)` : `match-launcher-selftest FAILED (${failed} of ${passed + failed})`);
process.exit(failed === 0 ? 0 : 1);
