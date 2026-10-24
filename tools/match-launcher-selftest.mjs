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
// var/play/ or var/match/.  No Forge, no claude, no tailscale, no network: the PATH is
// node and a shadow of /usr/bin and /bin without those two (below), so a machine that
// has them installed -- Claude Code's global npm package puts claude in /usr/bin -- runs
// the same cases as a CI runner that does not.
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
// D384: every wake deals a fresh --seed (two bare wakes, two seeds, each echoed in
// the 200), {"seed": n} is honoured exactly and for that wake only, a --seed play.sh was
// started with holds for every wake, a seed a wake that lost the race to a running
// engine could not apply is a warning, and a bad seed is a 400 that starts nothing.
// D386: a DNS-name Host from loopback (rebinding) is 403 on /match and
// /engine/start, and a --match-dir whose symlinks lead out of var/ is refused.
//
//   node tools/match-launcher-selftest.mjs      # exit 0 iff every check passes; ~30 s
//
// Run from the repo root (hard rule 9).  Gate step 12f (beside the coach
// helper's own self-test); CI's redaction job.

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer, request } from 'node:http';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { deflateRawSync } from 'node:zlib';

import { checkWake, createMatchLauncher, realInside } from './match-launcher.mjs';

const REL = 'var/match-launcher-selftest';
const DIR = resolve(REL);
const NODE_ONLY = join(DIR, 'node-only');      // node, whichever one runs this
const SHADOW = join(DIR, 'bin-shadow');        // /usr/bin and /bin, less ABSENT
const ABSENT = ['claude', 'tailscale'];        // what the cases need missing from PATH
const EVENTS = join(DIR, 'engine-events.jsonl');
const ALIVE = join(DIR, 'alive');
// A fake engine an interrupted earlier run left behind is stopped before its record goes.
for (const f of existsSync(ALIVE) ? readdirSync(ALIVE) : []) { try { process.kill(Number(f), 'SIGKILL'); } catch { /* gone */ } }
rmSync(DIR, { recursive: true, force: true });
for (const d of [NODE_ONLY, SHADOW, ALIVE, join(DIR, 'site')]) mkdirSync(d, { recursive: true });
symlinkSync(process.execPath, join(NODE_ONLY, 'node'));
writeFileSync(join(DIR, 'site', 'index.html'), '<!doctype html><title>t</title>\n');
// A real shadow, not an assumption about the machine: every name in /usr/bin and /bin is linked
// here except ABSENT, so play.sh and the helper find the same tools they always did (curl,
// python3, unzip, timeout -- each of which picks a branch of play.sh) and never claude or tailscale,
// wherever those are installed.  The cases that want a tailscale put the fake one in front.
const linked = new Set();
for (const d of ['/usr/bin', '/bin']) {
  for (const f of existsSync(d) ? readdirSync(d) : []) {
    if (ABSENT.includes(f) || linked.has(f)) continue;
    linked.add(f);
    symlinkSync(join(d, f), join(SHADOW, f));
  }
}
const PATH = [NODE_ONLY, SHADOW].join(delimiter);
for (const f of ABSENT) {
  const r = spawnSync('sh', ['-c', `command -v ${f}`], { env: { ...process.env, PATH }, encoding: 'utf8' });
  if (r.status === 0 || r.stdout || r.error) { console.error(`match-launcher-selftest: ${f} is still on the shadow PATH (${r.stdout.trim() || r.error?.message || `exit ${r.status}`})`); process.exit(1); }
}

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
const humans = flag('--humans') === '2';   // D402/D404: a game between two people
const you = deckOf(flag('--deck')), ai = deckOf(flag('--ai-deck') || flag('--deck2') || flag('--deck'));
ev({ start: true, argv, token: process.env.MTGTABLE_LAN_TOKEN ?? null, seats: humans ? JSON.parse(fs.readFileSync(flag('--seats-file'), 'utf8')) : null });
if (humans) {
  console.log('seed          = ' + (flag('--seed') || '0'));
  console.log('table         = two people (amendment M59): seat 0 A, seat 1 B');
  console.log('deck seat 0   = ' + you.name + ' (' + you.cards + ' cards)');
  console.log('deck seat 1   = ' + ai.name + ' (' + ai.cards + ' cards)');
  console.log('TABLE LISTENING ws://127.0.0.1:' + flag('--table-port') + '/ws?seat=<the seat token> -- two seats');
}
console.log('deck (you)    = ' + path.resolve(flag('--deck')));
console.log('ai profile    = ' + (flag('--ai-profile') || 'Default'));
// D333: as the bridge, a policy line only when it is not plain (--ai-search implies search; the last flag wins).
let pol = 'plain';
argv.forEach((a, i) => { if (a === '--ai-policy') pol = argv[i + 1]; else if (a === '--ai-search') pol = 'search'; });
if (pol !== 'plain') console.log('ai policy     = ' + pol + (pol === 'search' ? '  (' + (flag('--ai-search') || 'ms=1500') + ')' : ''));
console.log('seed          = ' + (flag('--seed') || '0'));
console.log('games/match   = ' + (flag('--games') || '1'));
if (you.name.startsWith('Crash') || ai.name.startsWith('Crash')) { console.error('ENGINE CRASHED (a fake one)'); ev({ crashed: true }); bye(1); }
if (!humans) {
  console.log('deck you      = ' + you.name + ' (' + you.cards + ' cards)');
  console.log('deck ai       = ' + ai.name + ' (' + ai.cards + ' cards)');
}
const lan = argv.includes('--lan');
const token = lan ? (process.env.MTGTABLE_LAN_TOKEN || crypto.randomBytes(16).toString('base64url')) : null;
if (lan) ev({ lanToken: token });
const sockets = new Set();
const server = http.createServer((req, res) => {
  // D402's TunnelGate, as the bridge has it: anything carrying Cloudflare's headers is 403 (D408's tunnel-check asks).
  if (['cf-connecting-ip', 'cf-ray', 'cf-access-jwt-assertion', 'tailscale-funnel-request', 'tailscale-user-login', 'x-forwarded-for', 'x-forwarded-host'].some((h) => req.headers[h] !== undefined)) { res.statusCode = 403; res.end('this port is never tunnelled'); return; }
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

async function startPlay(extra, label, env = {}) {
  const port = await freePort();
  const coachPort = await freePort();
  const p = spawn('bash', ['scripts/play.sh', '--engine-only', '--port', String(port), '--coach-port', String(coachPort), ...extra], {
    env: { ...process.env, PATH, MTGTABLE_TEST_FAKE_ENGINE: join(DIR, 'fake-engine.cjs'), MTGTABLE_TEST_VAR: `${REL}/${label}`,
      FAKE_EVENTS: EVENTS, FAKE_ALIVE: ALIVE, MTGTABLE_LAN_TOKEN: 'inheritedTokenMustBeDropped00', ...env },
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
  // --no-auto-review (D385, for games that are not the owner's: ForgeCoach's playtest) is a flag play.sh takes.
  const A = await startPlay(['--no-auto-review'], 'a');
  check('play.sh prints the match launcher line', /Match launcher: ForgeCoach's Play this match restarts this engine/.test(A.out()), A.out());
  check('the coach helper started without claude on PATH', /Coach: claude CLI not found/.test(A.out()));
  let r = await http({ port: A.coachPort });
  check('/health advertises match: 1', r.status === 200 && r.json?.match === 1 && r.json?.helper === 1, r.body);
  check('play.sh --no-auto-review: the helper reviews nothing by itself', r.json?.autoReview === 0, r.body);
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
  check('POST /match: 200 with the new decks, and (D384) the seed the engine dealt', r.status === 200 && r.json?.ok === true && Number.isSafeInteger(r.json?.seed), `${r.status} ${r.body}`);
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
  check('the new match has a random seed of its own, once, the one the 200 named', /^\d+$/.test(argOf(second, '--seed') ?? '') && second.filter((a) => a === '--seed').length === 1
    && r.json?.seed === Number(argOf(second, '--seed')), second.join(' '));
  check('and every other flag kept (--transport ws, the port, --keep-open)', argOf(second, '--transport') === 'ws' && argOf(second, '--port') === String(A.port) && second.includes('--keep-open')
    && second.filter((a) => a === '--deck').length === 1 && second.filter((a) => a === '--games').length === 1, second.join(' '));
  check('a game id of its own, match-<id>', argOf(second, '--game-id') === 'match-' + r.json?.yourDeck?.path.split('/')[4], second.join(' '));
  check('the deck name never reached a command line', !second.some((a) => a.includes('Rock')));
  check('D414: a bare play.sh starts the search AI: one --ai-policy search, no --ai-search', argOf(first[0].argv, '--ai-policy') === 'search'
    && first[0].argv.filter((a) => a === '--ai-policy').length === 1 && !first[0].argv.includes('--ai-search') && /AI policy: search-v2 \(the default, D414/.test(A.out()), first[0].argv.join(' '));
  check('no aiPolicy: the AI as play.sh started it (search, D414), one --ai-policy, no --ai-search', r.json?.aiPolicy === 'search'
    && second.filter((a) => a === '--ai-policy').length === 1 && argOf(second, '--ai-policy') === 'search' && !second.includes('--ai-search'), `${r.body} ${second.join(' ')}`);
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
  r = await http({ port: A.coachPort, path: '/match', headers: { Host: 'rebind.attacker.test' } });
  check('GET /match with a DNS-name Host from loopback (rebinding): 403 (D386)', r.status === 403 && !r.json?.match, r.body);
  r = await http({ port: A.coachPort, method: 'POST', path: '/engine/start', headers: { Host: 'rebind.attacker.test' } });
  check('POST /engine/start with a DNS-name Host: 403 (D386)', r.status === 403);
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
  check('no aiPolicy again: search, as play.sh was started (D414)', r.status === 200 && r.json?.aiPolicy === 'search'
    && pa.filter((a) => a === '--ai-policy').length === 1 && argOf(pa, '--ai-policy') === 'search', `${r.body} ${pa.join(' ')}`);
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
  const without = (v, f) => v.filter((a, i) => a !== f && v[i - 1] !== f);
  const w0 = without(without(onW()[0].argv, '--game-id'), '--seed');
  const w1 = onW()[1]?.argv ?? [];
  check('with the same flags as the first start, a game id of its own and (D384) a seed of its own', JSON.stringify(without(without(w1, '--game-id'), '--seed')) === JSON.stringify(w0)
    && /^match-m\d{13}$/.test(argOf(w1, '--game-id') ?? '') && w1.filter((a) => a === '--seed').length === 1 && /^\d+$/.test(argOf(w1, '--seed') ?? ''), w1.join(' '));
  check('...and the 200 says which seed the engine dealt', r.json?.seed === Number(argOf(w1, '--seed')), r.body);

  // D381: the same wake, with the AI profile ForgeCoach's Setup picked (no decks).
  console.log('== /engine/start with {"aiProfile"} (D381)');
  check('checkWake: no body is the D308 wake', JSON.stringify(checkWake('')) === '{"aiProfile":null,"seed":null,"aiPolicy":null,"problems":[]}' && checkWake(undefined).aiProfile === null && checkWake('  \n').problems.length === 0);
  check('checkWake (D414): an aiPolicy is one of plain, outlets, search, exactly', checkWake('{"aiPolicy":"plain"}').aiPolicy === 'plain' && checkWake('{"aiPolicy":"search","seed":3}').aiPolicy === 'search'
    && checkWake('{}').aiPolicy === null && ['"Search"', '"hard"', '"search --seat 1"', '3', 'null'].every((v) => checkWake(`{"aiPolicy":${v}}`).problems.length === 1));
  check('checkWake: {} and unknown keys are the D308 wake', checkWake('{}').aiProfile === null && checkWake('{"x":1}').problems.length === 0);
  check('checkWake: a profile in any case, canonical', checkWake('{"aiProfile":"cAuTiOuS"}').aiProfile === 'Cautious');
  check('checkWake: a bad profile, JSON or shape is a problem', checkWake('{"aiProfile":"Hard"}').problems.length === 1 && checkWake('{"aiProfile":3}').problems.length === 1
    && checkWake('nope').problems[0] === 'the body is not JSON' && checkWake('[1]').problems.length === 1 && checkWake('"Cautious"').problems.length === 1);
  check('checkWake (D384): a seed is a non-negative safe integer', checkWake('{"seed":0}').seed === 0 && checkWake('{"seed":9007199254740991,"aiProfile":"reckless"}').seed === Number.MAX_SAFE_INTEGER
    && checkWake('{"seed":42}').aiProfile === null && checkWake('{}').seed === null);
  check('checkWake (D384): a negative, fractional, string, too-large or null seed is a problem', ['-1', '1.5', '"7"', '9007199254740992', '1e300', 'null', 'true'].every((v) => {
    const c = checkWake(`{"seed":${v}}`);
    return c.problems.length === 1 && /^seed must be a whole number/.test(c.problems[0]) && c.seed === null;
  }) && checkWake('{"seed":-1,"aiProfile":"Hard"}').problems.length === 2);
  r = await http({ port: W.coachPort });
  check('/health: engine_start_profile 1, engine_start_seed 1, engine_start_policy 1 (D414)', r.json?.engine_start === 1 && r.json?.engine_start_profile === 1 && r.json?.engine_start_seed === 1 && r.json?.engine_start_policy === 1, r.body);
  const wn = onW().length;
  const wakeWith = (body, port = W.coachPort) => http({ port, method: 'POST', path: '/engine/start', headers: { 'Content-Type': 'application/json', Origin: 'https://jalirkan.github.io' }, body });
  for (let i = 0; i < 100 && alive(onW().at(-1)?.pid); i++) await sleep(100);
  await untilIdle(W.coachPort);
  // Refusals start nothing.
  for (const [what, body] of [['an unknown profile', '{"aiProfile":"Hard"}'], ['a non-string profile', '{"aiProfile":["Cautious"]}'], ['a body that is not JSON', 'Cautious'], ['a JSON array', '["Cautious"]'],
    ['a negative seed (D384)', '{"seed":-1}'], ['a fractional seed (D384)', '{"seed":2.5}'], ['a string seed (D384)', '{"seed":"42"}'], ['an unsafe seed (D384)', '{"seed":18446744073709551615}'],
    ['an unknown aiPolicy (D414)', '{"aiPolicy":"hard"}']]) {
    r = await wakeWith(body);
    check(`${what}: 400 with problems, nothing started`, r.status === 400 && r.json?.ok === false && Array.isArray(r.json?.problems) && onW().length === wn, `${r.status} ${r.body}`);
  }
  r = await http({ port: W.coachPort });
  check('...still asleep', r.json?.engine === 'idle', r.body);
  r = await wakeWith('{"aiProfile":"cautious","aiDeck":"ignored"}');
  check('asleep, {"aiProfile":"cautious"}: 200, woken on Cautious', r.status === 200 && r.json?.already === false && r.json?.aiProfile === 'Cautious'
    && JSON.stringify(Object.keys(r.json.aiDeck)) === '["name","cards"]', `${r.status} ${r.body}`);
  const wp = onW().at(-1)?.argv ?? [];
  check('...one --ai-profile, Cautious; every other flag as the last setup, a game id of its own', onW().length === wn + 1 && wp.filter((a) => a === '--ai-profile').length === 1
    && argOf(wp, '--ai-profile') === 'Cautious' && JSON.stringify(without(without(without(wp, '--game-id'), '--ai-profile'), '--seed')) === JSON.stringify(without(w0, '--ai-profile'))
    && /^match-m\d{13}$/.test(argOf(wp, '--game-id') ?? '') && argOf(wp, '--game-id') !== argOf(w1, '--game-id'), wp.join(' '));
  for (let i = 0; i < 100 && alive(onW().at(-1)?.pid); i++) await sleep(100);
  await untilIdle(W.coachPort);
  r = await http({ port: W.coachPort, method: 'POST', path: '/engine/start' });
  check('then a wake with no body keeps Cautious: it is the last setup now', r.status === 200 && r.json?.already === false && r.json?.aiProfile === 'Cautious'
    && argOf(onW().at(-1)?.argv ?? [], '--ai-profile') === 'Cautious', `${r.status} ${r.body}`);
  // D384: a fresh shuffle on every wake (two random seeds collide 1 time in 100,000).
  const wakeSeeds = [w1, wp, onW().at(-1)?.argv ?? []].map((v) => argOf(v, '--seed'));
  check('D384: two bare wakes deal different seeds, one --seed each, the 200 echoing it', wakeSeeds[0] !== wakeSeeds[2] && /^\d+$/.test(wakeSeeds[2] ?? '')
    && onW().at(-1).argv.filter((a) => a === '--seed').length === 1 && r.json?.seed === Number(wakeSeeds[2]), `${wakeSeeds.join(' ')} ${r.body}`);
  for (let i = 0; i < 100 && alive(onW().at(-1)?.pid); i++) await sleep(100);
  await untilIdle(W.coachPort);
  const wsn = onW().length;
  r = await wakeWith('{"seed":4242}');
  const ws = onW().at(-1)?.argv ?? [];
  check('D384: {"seed":4242} is honoured: one --seed 4242, the 200 says 4242, Cautious kept', r.status === 200 && r.json?.already === false && r.json?.seed === 4242
    && onW().length === wsn + 1 && argOf(ws, '--seed') === '4242' && ws.filter((a) => a === '--seed').length === 1 && argOf(ws, '--ai-profile') === 'Cautious', `${r.status} ${r.body} | ${ws.join(' ')}`);
  for (let i = 0; i < 100 && alive(onW().at(-1)?.pid); i++) await sleep(100);
  await untilIdle(W.coachPort);
  r = await http({ port: W.coachPort, method: 'POST', path: '/engine/start' });
  const wa = onW().at(-1)?.argv ?? [];
  check('D384: {"seed"} held for that wake only: the next bare wake deals a fresh one, the 200 echoing it', r.status === 200 && r.json?.already === false && onW().length === wsn + 2
    && /^\d+$/.test(argOf(wa, '--seed') ?? '') && argOf(wa, '--seed') !== '4242' && wa.filter((a) => a === '--seed').length === 1 && r.json?.seed === Number(argOf(wa, '--seed')), `${r.status} ${r.body} | ${wa.join(' ')}`);
  // D414: {"aiPolicy"} wakes it on that AI, and it stays the last setup's.
  for (let i = 0; i < 100 && alive(onW().at(-1)?.pid); i++) await sleep(100);
  await untilIdle(W.coachPort);
  check('D414: the wake engine started as search (the default)', argOf(onW()[0].argv, '--ai-policy') === 'search', onW()[0].argv.join(' '));
  r = await wakeWith('{"aiPolicy":"plain"}');
  const wpl = onW().at(-1)?.argv ?? [];
  check('D414: asleep, {"aiPolicy":"plain"}: 200 on plain, one --ai-policy plain, no --ai-search, Cautious kept', r.status === 200 && r.json?.already === false && r.json?.aiPolicy === 'plain'
    && wpl.filter((a) => a === '--ai-policy').length === 1 && argOf(wpl, '--ai-policy') === 'plain' && !wpl.includes('--ai-search') && argOf(wpl, '--ai-profile') === 'Cautious', `${r.status} ${r.body} | ${wpl.join(' ')}`);
  for (let i = 0; i < 100 && alive(onW().at(-1)?.pid); i++) await sleep(100);
  await untilIdle(W.coachPort);
  r = await http({ port: W.coachPort, method: 'POST', path: '/engine/start' });
  check('D414: then a bare wake keeps plain: it is the last setup now', r.status === 200 && r.json?.aiPolicy === 'plain' && argOf(onW().at(-1)?.argv ?? [], '--ai-policy') === 'plain', `${r.status} ${r.body}`);
  for (let i = 0; i < 100 && alive(onW().at(-1)?.pid); i++) await sleep(100);
  await untilIdle(W.coachPort);
  r = await wakeWith('{"aiPolicy":"search"}');
  check('D414: and {"aiPolicy":"search"} back to the search AI', r.status === 200 && r.json?.aiPolicy === 'search' && argOf(onW().at(-1)?.argv ?? [], '--ai-policy') === 'search', `${r.status} ${r.body}`);
  for (let i = 0; i < 100 && alive(onW().at(-1)?.pid); i++) await sleep(100);
  await untilIdle(W.coachPort);
  W.proc.kill('SIGTERM');
  for (let i = 0; i < 100 && W.proc.exitCode === null; i++) await sleep(50);
  // D384: a --seed play.sh was started with holds for every wake without one, as for /match.
  const P = await startPlay(['--seed', '31337', '--', '--idle-timeout', '1'], 'wakeseed');
  const onP = () => starts().filter((e) => argOf(e.argv, '--port') === String(P.port));
  const pSeeds = [];
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i < 100 && alive(onP().at(-1)?.pid); i++) await sleep(100);
    await untilIdle(P.coachPort);
    r = await http({ port: P.coachPort, method: 'POST', path: '/engine/start' });
    const pa = onP().at(-1)?.argv ?? [];
    pSeeds.push(r.status === 200 && r.json?.already === false && r.json?.seed === 31337 && pa.filter((a) => a === '--seed').length === 1 ? argOf(pa, '--seed') : `${r.status} ${r.body}`);
  }
  check('D384: play.sh --seed 31337, woken twice: --seed 31337 both times, the 200 saying so', onP().length === 3 && argOf(onP()[0].argv, '--seed') === '31337' && pSeeds.every((x) => x === '31337'), pSeeds.join(' | '));
  for (let i = 0; i < 100 && alive(onP().at(-1)?.pid); i++) await sleep(100);
  await untilIdle(P.coachPort);
  P.proc.kill('SIGTERM');
  for (let i = 0; i < 100 && P.proc.exitCode === null; i++) await sleep(50);
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
  r = await wakeWith('{"seed":7}', R.coachPort);
  check('while running, a seed (D384): 200 already, a warning that it was not applied, no restart', r.status === 200 && r.json?.already === true
    && r.json?.warnings?.length === 1 && /seed 7 was not applied/.test(r.json.warnings[0]) && onR().length === rn, r.body);
  r = await wakeWith('{"seed":-7}', R.coachPort);
  check('while running, a bad seed (D384): still 400', r.status === 400 && onR().length === rn, r.body);
  r = await wakeWith('{"aiPolicy":"plain"}', R.coachPort);
  check('D414: while running the search AI, {"aiPolicy":"plain"}: 200 already, a warning, no restart', r.status === 200 && r.json?.already === true
    && r.json?.warnings?.length === 1 && /already running against the search AI; plain was not applied/.test(r.json.warnings[0]) && onR().length === rn, r.body);
  r = await wakeWith('{"aiPolicy":"search"}', R.coachPort);
  check('D414: while running, the AI it plays: no warning', r.status === 200 && r.json?.already === true && r.json?.warnings === undefined && onR().length === rn, r.body);
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

  console.log('== D414: --ai-plain opts out of the search AI; disagreeing flags are refused');
  const NP = await startPlay(['--ai-plain'], 'aiplain');
  const nArgv = starts().filter((e) => argOf(e.argv, '--port') === String(NP.port))[0]?.argv ?? [];
  check('--ai-plain: one --ai-policy plain, no --ai-search, and the line says so', nArgv.filter((a) => a === '--ai-policy').length === 1 && argOf(nArgv, '--ai-policy') === 'plain'
    && !nArgv.includes('--ai-search') && /AI policy: plain \(--ai-plain/.test(NP.out()), `${nArgv.join(' ')}\n${NP.out().slice(0, 600)}`);
  NP.proc.kill('SIGTERM');
  for (let i = 0; i < 100 && NP.proc.exitCode === null; i++) await sleep(50);
  const S1 = await startPlay(['--ai-search-ms', '2500'], 'aisearchms');
  const sArgv = starts().filter((e) => argOf(e.argv, '--port') === String(S1.port))[0]?.argv ?? [];
  check('--ai-search-ms 2500: the search AI at that budget, no second --ai-policy', argOf(sArgv, '--ai-search') === 'ms=2500' && !sArgv.includes('--ai-policy'), sArgv.join(' '));
  S1.proc.kill('SIGTERM');
  for (let i = 0; i < 100 && S1.proc.exitCode === null; i++) await sleep(50);
  for (const extra of [['--ai-plain', '--ai-search'], ['--ai-plain', '--', '--ai-policy', 'outlets']]) {
    const res = await new Promise((done) => {
      let err = '';
      const p = spawn('bash', ['scripts/play.sh', '--engine-only', ...extra], { env: { ...process.env, PATH }, stdio: ['ignore', 'ignore', 'pipe'] });
      p.stderr.on('data', (d) => { err += d; });
      p.on('exit', (code) => done({ code, err }));
    });
    check(`${extra.join(' ')}: refused, exit 1, "pick one"`, res.code === 1 && /pick one/.test(res.err), `${res.code} ${res.err}`);
  }

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
      if (r.wake) {   // D384: the race -- play.sh found an engine running, and says "ready" with its match
        const match = { yourDeck: { name: 'Running', path: null, cards: 40 }, aiDeck: { name: 'AI', cards: 40 }, aiProfile: 'Default', games: 3, seed: 99 };
        fs.writeFileSync(path.join(dir, 'status.json'), JSON.stringify({ id: r.id, state: 'ready', match }));
        return;
      }
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
  const H = spawn(process.execPath, ['tools/coach-helper.mjs', '--port', String(cp), '--no-auto-review', '--match-dir', `${REL}/sup/match`, '--supervisor', String(sup.pid), '--cards-zip', zipPath, '--match-timeout', '10'], { env: { ...process.env, PATH }, stdio: ['ignore', 'pipe', 'pipe'] });
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
  // D384: a wake that loses the race to an engine already running (play.sh restarts
  // nothing and says "ready"): the requested seed was not dealt, and a warning says so.
  writeFileSync(join(supDir, 'engine.json'), JSON.stringify({ state: 'idle', at: new Date().toISOString(), exitsAt: null }) + '\n');
  r = await http({ port: cp, method: 'POST', path: '/engine/start', headers: { 'Content-Type': 'application/json' }, body: '{"seed":4242}' });
  check('D384: a seed asked for, another seed dealt (the race): 200, the running seed, a warning', r.status === 200 && r.json?.already === false && r.json?.seed === 99
    && r.json?.warnings?.length === 1 && /seed 4242 was not applied/.test(r.json.warnings[0]), `${r.status} ${r.body}`);
  r = await http({ port: cp, method: 'POST', path: '/engine/start', headers: { 'Content-Type': 'application/json' }, body: '{"seed":99}' });
  check('...the seed asked for is the one dealt: no warning', r.status === 200 && r.json?.seed === 99 && r.json?.warnings?.length === 0, `${r.status} ${r.body}`);
  r = await http({ port: cp, method: 'POST', path: '/engine/start' });
  check('...no seed asked for: no warning', r.status === 200 && r.json?.seed === 99 && r.json?.warnings?.length === 0, `${r.status} ${r.body}`);
  rmSync(join(supDir, 'engine.json'));
  check('the card index was read from the zip', /card index: \d+ names from .*cardsfolder\.zip/.test(hlog) && Number(/card index: (\d+)/.exec(hlog)?.[1]) >= 7, hlog);

  // ------------------------------------------------------------- D400, D401
  console.log('== play.sh --draft-room --pause-lab: the room listener with the site; the lab held, then released');
  {
    const site = join(DIR, 'dr-site');
    mkdirSync(site, { recursive: true });
    writeFileSync(join(site, 'index.html'), '<!doctype html><title>ForgeCoach room site</title>');
    const runnerState = join(DIR, 'dr-runner');
    mkdirSync(runnerState, { recursive: true });
    writeFileSync(join(runnerState, 'paused'), 'by hand\n');   // a manual pause: --pause-lab must leave it alone
    const rp = await freePort();
    const D = await startPlay(['--draft-room', '--room-port', String(rp), '--site-dir', site, '--pause-lab'], 'dr', { MTGTABLE_TEST_RUNNER_STATE: runnerState });
    for (let i = 0; i < 40 && !/Draft room:/.test(D.out()); i++) await sleep(50);
    check('play.sh prints the draft room line', /Draft room: on — .*port \d+ \(this machine only/.test(D.out()), D.out());
    r = await http({ port: D.coachPort });
    check('/health: draftRoom 1 on the room port', r.json?.draftRoom === 1 && r.json?.roomPort === rp, r.body);
    r = await http({ port: rp, path: '/' });
    check('the room listener serves the site', r.status === 200 && /ForgeCoach room site/.test(r.body), `${r.status} ${r.body}`);
    const cardsList = Array.from({ length: 20 }, (_, i) => `Card ${i}`);
    r = await http({ port: D.coachPort, method: 'POST', path: '/room', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cubeId: 'synergy', cards: cardsList }) });
    check('POST /room through play.sh\'s helper: 201', r.status === 201 && r.json?.roomPort === rp, r.body);
    const rid = r.json?.id;
    const ft = r.json?.friendToken;
    r = await http({ port: rp, path: `/room/${rid}`, headers: { 'X-Room-Token': ft } });
    check('the friend\'s token opens seat 2 on the room port', r.status === 200 && r.json?.you === 1, r.body);
    r = await http({ port: rp, path: `/room/${rid}` });
    check('...and no token from loopback is 403', r.status === 403, r.body);
    check('the room is kept under the test\'s var/ folder', existsSync(join(DIR, 'dr', 'draft-room', 'rooms.json')));
    const holdFile = join(runnerState, 'holds', `${D.proc.pid}.json`);
    check('--pause-lab: a hold for play.sh\'s pid', existsSync(holdFile) && /play\.sh --pause-lab/.test(readFileSync(holdFile, 'utf8')) && /held: the lab starts no new job/.test(D.out()), D.out());
    D.proc.kill('SIGTERM');
    await new Promise((res) => (D.proc.exitCode !== null ? res() : D.proc.on('exit', res)));
    check('play.sh\'s exit releases the hold', !existsSync(holdFile) && /new jobs may start again/.test(D.out()), D.out());
    check('...and leaves a manual pause alone', existsSync(join(runnerState, 'paused')));
    check('...and the room listener is gone with the helper', await http({ port: rp }).then(() => false, () => true));
  }

  // ------------------------------------------------------------- D404: a game between two people
  console.log('== D404: a game between two people, through the launcher the draft room calls');
  {
    const TP = await freePort();
    const T = await startPlay(['--table-port', String(TP), '--', '--idle-timeout', '3'], 't');
    const tl = createMatchLauncher({ repoRoot: process.cwd(), matchDir: `${REL}/t/match`, supervisorPid: T.proc.pid, cardsZip: null, customCardsDir: null, aiDir: 'forge-home/res/ai', timeoutMs: 60_000 });
    const nStart = starts().length;
    const dg = [createHash('sha256').update('seat-zero-token-abcdefgh').digest('hex'), createHash('sha256').update('seat-one-token-abcdefghi').digest('hex')];
    const g = await tl.startTable({ roomId: 'rTestRoom1', decks: [deck('Red Pile', RED), deck('Blue Pile', BLUE, [[1, 'Opt']])], names: ['Ana', 'Ben'], digests: dg });
    check('startTable: ok, a match id, the table port play.sh was given', g.ok === true && /^m\d{13}$/.test(g.matchId ?? '') && g.tablePort === TP, JSON.stringify(g));
    check('startTable: both decks by name and count, as the engine loaded them', JSON.stringify(g.seats) === '[{"name":"Red Pile","cards":40},{"name":"Blue Pile","cards":40}]', JSON.stringify(g));
    const tst = starts().slice(nStart);
    const targv = tst[0]?.argv ?? [];
    check('one engine, with --humans 2 and both seat decks', tst.length === 1 && argOf(targv, '--humans') === '2'
      && argOf(targv, '--deck') === `${REL}/t/match/${g.matchId}/seat0.dck` && argOf(targv, '--deck2') === `${REL}/t/match/${g.matchId}/seat1.dck`, targv.join(' '));
    check('...the seats file, the table port, one game, a friend-<id> game id', argOf(targv, '--seats-file') === `${REL}/t/match/${g.matchId}/seats.json`
      && argOf(targv, '--table-port') === String(TP) && argOf(targv, '--games') === '1' && argOf(targv, '--game-id') === `friend-${g.matchId}`, targv.join(' '));
    check('...no AI deck, profile, policy or site, and the caller\'s --idle-timeout kept', !targv.includes('--ai-deck') && !targv.includes('--ai-profile')
      && !targv.includes('--ai-policy') && !targv.includes('--site-dir') && argOf(targv, '--idle-timeout') === '3', targv.join(' '));
    check('the seats file is the two names and the two digests, and nothing else', JSON.stringify(tst[0]?.seats) === JSON.stringify({ names: ['Ana', 'Ben'], tokenSha256: dg }), JSON.stringify(tst[0]?.seats));
    check('no name reached a command line', !targv.some((a) => a.includes('Ana') || a.includes('Pile')));
    const mdirT = join(DIR, 't', 'match', g.matchId ?? 'none');
    check('seat1.dck is exactly the deck, sideboard and all', existsSync(mdirT) && readFileSync(join(mdirT, 'seat1.dck'), 'utf8') === [
      '[metadata]', 'Name=Blue Pile', '[main]', '17 Island', '4 Counterspell', '4 Opt', '15 Wind Drake', '[sideboard]', '1 Opt', ''].join('\n'));
    r = await http({ port: T.coachPort, path: '/match' });
    check('GET /match while it runs: running', r.status === 200 && r.json?.state === 'running', r.body);
    r = await post(T.coachPort, req1);
    check('POST /match while a game between two people runs: 409, nothing restarted', r.status === 409 && /two people/.test(r.json?.message ?? '') && starts().length === nStart + 1, r.body);
    const busy = await tl.startTable({ roomId: 'x', decks: [deck('A', RED)], names: ['A', 'B'], digests: dg });
    check('startTable with one deck: refused', busy.ok === false && busy.status === 400, JSON.stringify(busy));
    // The fake's --idle-timeout 3: nobody takes a seat, the engine exits, play.sh sleeps (D308).
    await untilIdle(T.coachPort);
    r = await http({ port: T.coachPort });
    check('the table engine ended and the engine sleeps', r.json?.engine === 'idle', r.body);
    r = await http({ port: T.coachPort, method: 'POST', path: '/engine/start' });
    const wargv = starts().at(-1)?.argv ?? [];
    check('a wake after the game between two people starts the last match against the AI, not the table', r.status === 200 && r.json?.ok === true
      && !wargv.includes('--humans') && !wargv.includes('--seats-file') && argOf(wargv, '--ai-profile') !== undefined, `${r.body} ${wargv.join(' ')}`);
    // D406 / D407: game 2 of a best of three -- where it stands, who chooses play or draw, each seat's consent.
    const g2 = await tl.startTable({ roomId: 'rTestRoom1', decks: [deck('Red Pile', RED), deck('Blue Pile', BLUE)], names: ['Ana', 'Ben'], digests: dg,
      match: { bestOf: 3, game: 2, wins: [0, 1] }, chooser: 0, record: [true, false] });
    const s2 = starts().at(-1)?.seats;
    const nAfter = starts().length;
    check('D406: startTable writes the match, the chooser and the consents into the seats file, and nothing else new',
      g2.ok === true && JSON.stringify(s2) === JSON.stringify({ names: ['Ana', 'Ben'], tokenSha256: dg, match: { bestOf: 3, game: 2, wins: [0, 1] }, chooser: 0, record: [true, false] }), JSON.stringify([g2, s2]));
    for (const [what, extra] of [
      ['a best of two', { match: { bestOf: 2, game: 1, wins: [0, 0] } }],
      ['a fourth game', { match: { bestOf: 3, game: 4, wins: [1, 1] } }],
      ['more wins than games before it', { match: { bestOf: 3, game: 2, wins: [1, 1] } }],
      ['a chooser in game 1', { match: { bestOf: 3, game: 1, wins: [0, 0] }, chooser: 1 }],
      ['a chooser with no match', { chooser: 0 }],
      ['a consent that is not a boolean', { record: ['yes', false] }],
    ]) {
      const bad = await tl.startTable({ roomId: 'rTestRoom1', decks: [deck('Red Pile', RED), deck('Blue Pile', BLUE)], names: ['Ana', 'Ben'], digests: dg, ...extra });
      check(`startTable refuses ${what}: 400, nothing started`, bad.ok === false && bad.status === 400 && starts().length === nAfter, JSON.stringify(bad));
    }
    check('gameResult: nothing before the bridge writes it', tl.gameResult(g2.matchId) === null);
    writeFileSync(join(DIR, 't', 'match', g2.matchId, 'result.json'), JSON.stringify({ v: 1, gameId: `friend-${g2.matchId}`, finished: true, winnerSeat: 1, draw: false, reason: 'Conceded', from: 'outcome', turns: 9 }) + '\n');
    check('gameResult: the winning seat as the bridge wrote it', JSON.stringify(tl.gameResult(g2.matchId)) === JSON.stringify({ winnerSeat: 1, draw: false, reason: 'Conceded', finished: true, turns: 9 }), JSON.stringify(tl.gameResult(g2.matchId)));
    writeFileSync(join(DIR, 't', 'match', g2.matchId, 'result.json'), JSON.stringify({ v: 1, winnerSeat: 2 }));
    check('gameResult: a seat that is not 0 or 1 is no result', tl.gameResult(g2.matchId) === null);
    check('gameResult: not a match id, no result (no path from outside)', tl.gameResult('../../etc') === null && tl.gameResult('m12') === null);
    T.proc.kill('SIGTERM');
    await new Promise((res) => (T.proc.exitCode !== null ? res() : T.proc.on('exit', res)));
  }

  // ------------------------------------------------------------- D408: play.sh --tunnel
  console.log('== D408: play.sh --tunnel -- the draft room with its public URL, tunnel-check before and after, the friend\'s two steps');
  {
    const site = join(DIR, 'tn-site');
    mkdirSync(site, { recursive: true });
    writeFileSync(join(site, 'index.html'), '<!doctype html><title>ForgeCoach tunnel site</title>');
    // The cloudflared template, filled in as Justin would (scripts/tunnel/config.yml.example).
    const fill = (t) => t.replaceAll('<TUNNEL-UUID>', '6ff42ae2-765d-4adf-8112-31c55c1551ef').replaceAll('play.example.com', 'play.example.org')
      .replace('teamName: your-team', 'teamName: jteam').replace('<AUD-TAG>', 'a1b2c3d4e5f6');
    const template = readFileSync('scripts/tunnel/config.yml.example', 'utf8');
    const good = join(DIR, 'tn-config.yml');
    writeFileSync(good, fill(template));
    const rp = await freePort();
    const tp = await freePort();
    const nStart = starts().length;
    const U = await startPlay(['--tunnel', 'https://play.example.org/', '--tunnel-config', good, '--site-dir', site, '--room-port', String(rp), '--table-port', String(tp)], 'tn');
    for (let i = 0; i < 200 && !/Run the outside check/.test(U.out()); i++) await sleep(50);
    const out = U.out();
    check('--tunnel: the pre-session check ran before the engine, on the given config, and passed', /tunnel-check \(before the start\): play\.example\.org/.test(out)
      && out.indexOf('tunnel-check (before the start)') < out.indexOf('Engine ready on') && /PASS\s+config .*tn-config\.yml/.test(out), out);
    check('...and again once the room listens: every door, nothing failed', /tunnel-check \(the doors\)/.test(out) && /PASS\s+room listener \/room\/<id> with no token/.test(out)
      && /PASS\s+coach helper, Host 127\.0\.0\.1, cf-ray/.test(out) && /PASS\s+bridge, Host 127\.0\.0\.1, cf-access-jwt-assertion/.test(out) && !/\bFAIL\b/.test(out), out);
    check('--tunnel is --engine-only --draft-room: one engine, the room on loopback', starts().length === nStart + 1 && /Draft room: on — .*\(this machine only/.test(out), out);
    check('the friend\'s two steps: the bare URL first, then the join link', /Send your friend https:\/\/play\.example\.org\/ FIRST/.test(out) && /drops everything after #/.test(out)
      && /"Over the internet" link it shows \(https:\/\/play\.example\.org\/#draft\/friend\/join/.test(out), out);
    r = await http({ port: U.coachPort, method: 'POST', path: '/room', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cubeId: 'synergy', cards: Array.from({ length: 20 }, (_, i) => `Card ${i}`) }) });
    check('POST /room: bases.public is the tunnel\'s URL (ForgeCoach\'s "Over the internet" link)', r.status === 201 && r.json?.bases?.public === 'https://play.example.org' && r.json?.roomPort === rp, r.body);
    const rid = r.json?.id;
    const ft = r.json?.friendToken;
    r = await http({ port: U.coachPort, method: 'POST', path: `/room/${rid}/friend-link`, headers: { 'Content-Type': 'application/json' }, body: '{}' });
    check('D408: a new friend link through play.sh\'s helper', r.status === 200 && r.json?.friendToken && r.json.friendToken !== ft && r.json?.bases?.public === 'https://play.example.org', r.body);
    r = await http({ port: rp, path: `/room/${rid}`, headers: { 'X-Room-Token': ft } });
    check('...the old link is refused on the room port', r.status === 403, r.body);
    r = await http({ port: rp, path: '/', headers: { Host: 'play.example.org' } });
    check('the room listener serves the site to the tunnel\'s Host', r.status === 200 && /tunnel site/.test(r.body), `${r.status}`);
    U.proc.kill('SIGTERM');
    await new Promise((res) => (U.proc.exitCode !== null ? res() : U.proc.on('exit', res)));

    // A config that points the tunnel at the coach helper: play.sh stops before the engine starts.
    const bad = join(DIR, 'tn-bad.yml');
    writeFileSync(bad, fill(template).replace('service: http://127.0.0.1:8644', 'service: http://127.0.0.1:8643'));
    const nBefore = starts().length;
    const B = spawn('bash', ['scripts/play.sh', '--tunnel', 'https://play.example.org', '--tunnel-config', bad, '--port', String(await freePort()), '--coach-port', String(await freePort()), '--room-port', String(await freePort())], {
      env: { ...process.env, PATH, MTGTABLE_TEST_FAKE_ENGINE: join(DIR, 'fake-engine.cjs'), MTGTABLE_TEST_VAR: `${REL}/tnbad`, FAKE_EVENTS: EVENTS, FAKE_ALIVE: ALIVE },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    procs.push(B);
    let bout = '';
    B.stdout.on('data', (d) => { bout += d; });
    B.stderr.on('data', (d) => { bout += d; });
    await new Promise((res) => (B.exitCode !== null ? res() : B.on('exit', res)));
    check('a config that names the coach helper: play.sh --tunnel exits 1 before any engine or helper starts', B.exitCode === 1 && /8643 is the coach helper/.test(bout)
      && /tunnel-check failed \(the config\)/.test(bout) && starts().length === nBefore && !/Engine ready/.test(bout), `${B.exitCode}\n${bout}`);
  }

  // ------------------------------------------------------------- D409: play.sh --funnel
  console.log('== D409: play.sh --funnel -- Tailscale Funnel to the room alone, checked, and off again with play.sh');
  {
    // A fake `tailscale` CLI: `status --json`, a foreground `funnel <port>` that holds its route until it ends,
    // and `serve status --json` reading that route back.  FAKE_TS_STATE=Stopped, FAKE_TS_EVIL=1 (also routes 8643's path).
    const tsBin = join(DIR, 'ts-bin');
    const tsDir = join(DIR, 'ts-state');
    mkdirSync(tsBin, { recursive: true });
    mkdirSync(tsDir, { recursive: true });
    writeFileSync(join(tsBin, 'tailscale'), '#!/bin/sh\nexec node "$(dirname "$0")/tailscale.cjs" "$@"\n');
    writeFileSync(join(tsBin, 'tailscale.cjs'), String.raw`const fs = require('fs'); const path = require('path');
const dir = ${JSON.stringify(tsDir)}; const cfg = path.join(dir, 'serve.json'); const host = 'pc.tail1234.ts.net';
const a = process.argv.slice(2);
if (a[0] === 'status' && a[1] === '--json') {
  process.stdout.write(JSON.stringify({ BackendState: process.env.FAKE_TS_STATE || 'Running', Self: { DNSName: host + '.' }, CertDomains: [host] }));
} else if (a[0] === 'serve' && a[1] === 'status') {
  process.stdout.write(fs.existsSync(cfg) ? fs.readFileSync(cfg, 'utf8') : '{}');
} else if (a[0] === 'funnel' && /^[0-9]+$/.test(a[1] || '')) {
  const h = { '/': { Proxy: 'http://127.0.0.1:' + a[1] } };
  if (process.env.FAKE_TS_EVIL) h['/coach'] = { Proxy: 'http://127.0.0.1:8643' };
  fs.writeFileSync(cfg, JSON.stringify({ Foreground: { s1: { TCP: { '443': { HTTPS: true } }, Web: { [host + ':443']: { Handlers: h } }, AllowFunnel: { [host + ':443']: true } } } }));
  fs.appendFileSync(path.join(dir, 'calls'), a.join(' ') + '\n');
  console.log('Available on the internet:\nhttps://' + host + '/\n|-- proxy http://127.0.0.1:' + a[1] + '\nPress Ctrl+C to exit.');
  const off = () => { try { fs.unlinkSync(cfg); } catch {} fs.appendFileSync(path.join(dir, 'calls'), 'off\n'); process.exit(0); };
  process.on('SIGTERM', off); process.on('SIGINT', off);
  setInterval(() => {}, 1000);
} else { console.error('fake tailscale: ' + a.join(' ')); process.exit(1); }
`);
    chmodSync(join(tsBin, 'tailscale'), 0o755);
    const TSPATH = [tsBin, PATH].join(delimiter);
    const site = join(DIR, 'fn-site');
    mkdirSync(site, { recursive: true });
    writeFileSync(join(site, 'index.html'), '<!doctype html><title>ForgeCoach funnel site</title>');
    const rp = await freePort();
    const nStart = starts().length;
    const fnRunner = join(DIR, 'fn-runner-state');   // the self-test's own runner state, never the installed one
    mkdirSync(fnRunner, { recursive: true });
    const U = await startPlay(['--funnel', '--pause-lab', '--site-dir', site, '--room-port', String(rp), '--table-port', String(await freePort())], 'fn', { PATH: TSPATH, MTGTABLE_TEST_RUNNER_STATE: fnRunner });
    for (let i = 0; i < 200 && !/Ctrl-C here turns Funnel off/.test(U.out()); i++) await sleep(50);
    const out = U.out();
    check('--funnel: the ts.net name from tailscale status, one engine, the room on loopback', /mode: Tailscale Funnel .*https:\/\/pc\.tail1234\.ts\.net/.test(out) && starts().length === nStart + 1 && /Draft room: on/.test(out), out);
    check('...a foreground `tailscale funnel <room port>` after the room listens', readFileSync(join(tsDir, 'calls'), 'utf8').split('\n')[0] === `funnel ${rp}`, readFileSync(join(tsDir, 'calls'), 'utf8'));
    check('...tunnel-check --funnel: the route to the room, Tailscale\'s headers refused by the helper and the bridge, nothing failed',
      /PASS\s+funnel pc\.tail1234\.ts\.net:443\//.test(out) && /PASS\s+coach helper, Host 127\.0\.0\.1, tailscale-funnel-request/.test(out)
      && /PASS\s+bridge, Host 127\.0\.0\.1, x-forwarded-for/.test(out) && /PASS\s+room listener \/room\/<id> with no token/.test(out) && !/\bFAIL\b/.test(out), out);
    check('...the friend\'s one link', /"Over the internet" link it shows \(https:\/\/pc\.tail1234\.ts\.net\/#draft\/friend\/join/.test(out) && /nothing to install/.test(out), out);
    check('...combined with --pause-lab: the lab held while it runs', /held: the lab starts no new job/.test(out) && readdirSync(join(fnRunner, 'holds')).length === 1, out);
    r = await http({ port: U.coachPort, method: 'POST', path: '/room', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cubeId: 'synergy', cards: Array.from({ length: 20 }, (_, i) => `Card ${i}`) }) });
    check('POST /room: bases.public is https://<ts.net name>', r.status === 201 && r.json?.bases?.public === 'https://pc.tail1234.ts.net', r.body);
    const fid = r.json?.id;
    const ftok = r.json?.friendToken;
    const fh = { Host: 'pc.tail1234.ts.net', Origin: 'https://pc.tail1234.ts.net', 'Tailscale-Funnel-Request': '?1', 'X-Forwarded-For': '203.0.113.50', 'X-Forwarded-Host': 'pc.tail1234.ts.net', 'X-Forwarded-Proto': 'https' };
    r = await http({ port: rp, path: `/room/${fid}`, headers: { ...fh, 'X-Room-Token': ftok } });
    check('the room listener, as Funnel delivers the friend (ts.net Host, https Origin, its headers) with the link\'s token: 200', r.status === 200 && r.json?.you === 1, r.body);
    r = await http({ port: rp, path: `/room/${fid}`, headers: fh });
    check('...and without the token: 403', r.status === 403, r.body);
    r = await http({ port: U.coachPort, path: '/health', headers: fh });
    check('the coach helper, as Funnel would deliver it: 403', r.status === 403, r.body);
    U.proc.kill('SIGTERM');
    await new Promise((res) => (U.proc.exitCode !== null ? res() : U.proc.on('exit', res)));
    check('...and released at the end', !existsSync(join(fnRunner, 'holds')) || readdirSync(join(fnRunner, 'holds')).length === 0, U.out());
    check('Ctrl-C: the funnel child ended, so tailscaled drops the route', /\noff\n?$/.test(readFileSync(join(tsDir, 'calls'), 'utf8')) && !existsSync(join(tsDir, 'serve.json')) && /Tailscale Funnel: off/.test(U.out()), U.out());

    const refused = async (args, env, label) => {
      const nB = starts().length;
      const B = spawn('bash', ['scripts/play.sh', ...args, '--port', String(await freePort()), '--coach-port', String(await freePort()), '--room-port', String(await freePort())], {
        env: { ...process.env, PATH: TSPATH, MTGTABLE_TEST_FAKE_ENGINE: join(DIR, 'fake-engine.cjs'), MTGTABLE_TEST_VAR: `${REL}/${label}`, FAKE_EVENTS: EVENTS, FAKE_ALIVE: ALIVE, ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      procs.push(B);
      let o = '';
      B.stdout.on('data', (d) => { o += d; });
      B.stderr.on('data', (d) => { o += d; });
      await new Promise((res) => (B.exitCode !== null ? res() : B.on('exit', res)));
      return { code: B.exitCode, out: o, started: starts().length - nB };
    };
    let x = await refused(['--funnel'], { FAKE_TS_STATE: 'Stopped' }, 'fnstop');
    check('--funnel with Tailscale down: exit 1 before any engine, saying so', x.code === 1 && /Tailscale is not up .*sudo tailscale up/.test(x.out) && x.started === 0, x.out);
    x = await refused(['--funnel', '--lan'], {}, 'fnlan');
    check('--funnel --lan: refused', x.code === 1 && /--funnel and --lan do not mix/.test(x.out) && x.started === 0, x.out);
    x = await refused(['--funnel', '--tunnel', 'https://play.example.org'], {}, 'fntun');
    check('--funnel --tunnel: refused', x.code === 1 && /pick one/.test(x.out) && x.started === 0, x.out);
    x = await refused(['--funnel'], { PATH }, 'fnnone');
    check('--funnel without tailscale installed: the install line', x.code === 1 && /install\.sh/.test(x.out) && x.started === 0, x.out);
    x = await refused(['--funnel', '--site-dir', site], { FAKE_TS_EVIL: '1' }, 'fnevil');
    check('a Funnel route that also names the coach helper: tunnel-check FAILs, play.sh stops and the funnel is off', x.code === 1 && /FAIL\s+serve pc\.tail1234\.ts\.net:443\/coach/.test(x.out)
      && /tunnel-check --funnel failed/.test(x.out) && !existsSync(join(tsDir, 'serve.json')), x.out);
  }

  // ------------------------------------------------------------- no supervisor
  console.log('== without play.sh: /match is off');
  const np = await freePort();
  const N = spawn(process.execPath, ['tools/coach-helper.mjs', '--port', String(np), '--no-auto-review'], { env: { ...process.env, PATH }, stdio: 'ignore' });
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
  // D386: a symlink under var/ that leads out of it is outside, at startup and after.
  const outside = mkdtempSync(join(tmpdir(), 'match-launcher-selftest-outside-'));
  symlinkSync(outside, join(DIR, 'escape'));
  check('realInside: a plain dir under var/, an absent one, var/ itself', realInside(resolve('var'), join(DIR, 'a')) && realInside(resolve('var'), join(DIR, 'nope', 'x')) && realInside(resolve('var'), resolve('var')));
  check('realInside: through a symlink out of var/, "..", or a sibling with var as a prefix', !realInside(resolve('var'), join(DIR, 'escape', 'match'))
    && !realInside(resolve('var'), join(DIR, '..', '..', 'tools')) && !realInside(resolve('var'), resolve('var-not')));
  check('--match-dir through a symlink out of var/ is refused at startup (D386)', await new Promise((res) => {
    const p = spawn(process.execPath, ['tools/coach-helper.mjs', '--port', '0', '--match-dir', `${REL}/escape/match`, '--supervisor', String(process.pid)], { stdio: 'ignore' });
    p.on('exit', (code) => res(code === 2));
  }));
  rmSync(join(DIR, 'escape'), { force: true });
  rmSync(outside, { recursive: true, force: true });
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
