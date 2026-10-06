#!/usr/bin/env node
/*
 * mtg-table — tools/ws-two-humans.mjs
 * Copyright (C) 2026 mtg-table contributors.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * A game between two people, played end to end by two scripted clients over the
 * table port (amendment M59, decisions D402 and D403).  It starts the bridge
 * itself -- `MtgTable --humans 2 --transport ws` with a seats file of tokens it
 * mints -- plays, waits for the JVM to exit, and audits both seats' frame logs
 * with tools/check-redaction.mjs and tools/check-seat-pair.mjs.
 *
 *     node tools/ws-two-humans.mjs [--scenario concede|claim|timeout] [--seed 5]
 *          [--port 8662] [--table-port 8666] [--game-id friend-e2e-5] [--timeout 300]
 *
 * Both clients play "pass priority and play lands": a land from hand in their own
 * main phase with the stack empty, else the engine's OK, else a card it insists
 * on, else Cancel; every ask gets the minimal legal answer
 * (tools/ws-auto-play.mjs's answerFor).  The scenarios:
 *
 *   concede  (default) a wrong token is refused 403, /observe 404; seat 0 drops
 *            its socket at turn 3 and comes back with its token -- hello_ok with
 *            the same gameId and a full state at once, and seat 1 is told it was
 *            away and is back; seat 1 opens a second socket with its token at
 *            turn 4, the first is closed 4002, and play goes on on the second;
 *            at turn 6 seat 1 concedes and both seats get `over`, seat 0 the
 *            winner.
 *   claim    --seat-grace 3: seat 1 leaves for good at its own decision from
 *            turn 4; the game waits (no new state for 2 s, the table frame says
 *            seat 1 is away and deciding), seat 0's claimWin is refused until
 *            the grace is up, then accepted, and both logs end in `over`, seat 0
 *            the winner.
 *   timeout  --decision-timeout 3: seat 1 sits on one input at turn 2; within
 *            the clock the engine takes the default, seat 1 is told "Time's up",
 *            and the game goes on to a seat-1 concede at turn 4.
 *
 * Exit 0 when the scenario holds and both audits pass; non-zero with a reason.
 */

import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const args = { scenario: 'concede', seed: 5, port: 8662, tablePort: 8666, gameId: null, timeoutS: 300 };
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i];
  const v = process.argv[i + 1];
  switch (k) {
    case '--scenario': args.scenario = v; i++; break;
    case '--seed': args.seed = Number(v); i++; break;
    case '--port': args.port = Number(v); i++; break;
    case '--table-port': args.tablePort = Number(v); i++; break;
    case '--game-id': args.gameId = v; i++; break;
    case '--timeout': args.timeoutS = Number(v); i++; break;
    default:
      console.error(`unknown argument ${k}`);
      process.exit(2);
  }
}
if (!['concede', 'claim', 'timeout'].includes(args.scenario)) {
  console.error('--scenario is concede, claim or timeout');
  process.exit(2);
}
const GAME_ID = args.gameId ?? `friend-e2e-${args.scenario}-${args.seed}`;
const T0 = Date.now();
const say = (line) => console.log(`[two ${((Date.now() - T0) / 1000).toFixed(1)}s] ${line}`);
let failure = null;
function fail(why, code = 3) {
  if (failure) return;
  failure = { why, code };
  console.error(`[two] FAIL: ${why}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// The bridge
// ---------------------------------------------------------------------------

const tokens = [randomBytes(16).toString('base64url'), randomBytes(16).toString('base64url')];
const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
const seatsFile = join(ROOT, 'var', 'two-humans', `${GAME_ID}.seats.json`);
mkdirSync(dirname(seatsFile), { recursive: true });
writeFileSync(seatsFile, JSON.stringify({ names: ['Ana', 'Ben'], tokenSha256: tokens.map(sha) }));
// D406: the bridge writes the game's result beside the seats file; none may be left from a run before.
const resultFile = join(dirname(seatsFile), 'result.json');
rmSync(resultFile, { force: true });

const bridgeArgs = ['mtgtable.MtgTable', '--humans', '2', '--transport', 'ws',
  '--deck', 'decks/pacho-shield.dck', '--deck2', 'decks/doom-legion.dck',
  '--seats-file', seatsFile, '--port', String(args.port), '--table-port', String(args.tablePort),
  '--seed', String(args.seed), '--game-id', GAME_ID, '--idle-timeout', '120'];
if (args.scenario === 'claim') bridgeArgs.push('--seat-grace', '3');
if (args.scenario === 'timeout') bridgeArgs.push('--decision-timeout', '3');
const bridgeLog = join(ROOT, 'var', 'two-humans', `${GAME_ID}.server.log`);
say(`bridge: ./bridge/run.sh ${bridgeArgs.join(' ')}  (log ${bridgeLog})`);
const { createWriteStream } = await import('node:fs');
const logStream = createWriteStream(bridgeLog);
const bridge = spawn(join(ROOT, 'bridge', 'run.sh'), bridgeArgs, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
bridge.stdout.pipe(logStream);
bridge.stderr.pipe(logStream);
let bridgeExit = null;
const bridgeDone = new Promise((r) => bridge.on('exit', (code) => { bridgeExit = code; r(code); }));

async function health(port) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1000) });
    return r.status;
  } catch {
    return 0;
  }
}
for (let i = 0; ; i++) {
  if (bridgeExit !== null) { fail(`the bridge exited (${bridgeExit}) before it was ready; see ${bridgeLog}`, 4); break; }
  if (await health(args.port) === 200) break;
  if (i > 240) { fail('no /health after 120 s', 4); break; }
  await sleep(500);
}
if (failure) finish();
// The table port serves /ws and nothing else (a tunnel routes /ws to it, D405).
const tableHealth = await health(args.tablePort);
if (tableHealth !== 404) fail(`the table port's /health is ${tableHealth}, not 404 (it serves /ws only)`);
say('ready: both seats exist');

// ---------------------------------------------------------------------------
// The door: a wrong token and an observer are refused
// ---------------------------------------------------------------------------

function tryOpen(url) {
  return new Promise((res) => {
    const ws = new WebSocket(url);
    let opened = false;
    ws.addEventListener('open', () => { opened = true; ws.close(); });
    ws.addEventListener('close', () => res(opened));
    ws.addEventListener('error', () => {});
  });
}
const TABLE = `ws://127.0.0.1:${args.tablePort}`;
if (args.scenario === 'concede') {
  if (await tryOpen(`${TABLE}/ws?seat=${'x'.repeat(22)}`)) fail('a wrong seat token opened a seat');
  if (await tryOpen(`${TABLE}/ws`)) fail('no seat token opened a seat');
  if (await tryOpen(`${TABLE}/observe`)) fail('/observe opened at a table of two');
  if (await tryOpen(`ws://127.0.0.1:${args.port}/ws?seat=${tokens[0]}`)) fail('the health port opened a seat');
  say('door: a wrong token, no token, /observe and the health port are all refused');
}

// ---------------------------------------------------------------------------
// A seat
// ---------------------------------------------------------------------------

const POLICY_FROZEN = Symbol('frozen');

class Seat {
  constructor(i) {
    this.i = i;
    this.socket = null;
    this.hello = null;
    this.state = null;
    this.input = null;
    this.table = null;
    this.over = null;
    this.notices = [];
    this.frames = 0;
    this.statesAt = [];
    this.tries = new Map();
    this.playedLand = new Set();
    this.frozen = false;
    this.closeCodes = [];
    this.helloCount = 0;
  }

  get me() { return this.hello?.you; }

  open(why) {
    return new Promise((res) => {
      const ws = new WebSocket(`${TABLE}/ws?seat=${tokens[this.i]}`);
      this.socket = ws;
      const mine = ws;
      ws.addEventListener('open', () => { say(`seat ${this.i}: open (${why})`); res(true); });
      ws.addEventListener('message', (e) => {
        if (mine !== this.socket && !this.listenOld) return;
        try { this.onFrame(JSON.parse(e.data), mine); } catch (err) { fail(`seat ${this.i}: ${err.stack}`); }
      });
      ws.addEventListener('close', (e) => {
        this.closeCodes.push(e.code);
        if (mine === this.socket && !this.over && !this.leaving) say(`seat ${this.i}: closed ${e.code} ${e.reason}`);
      });
      ws.addEventListener('error', () => res(false));
    });
  }

  send(type, body) {
    if (this.socket?.readyState === 1) this.socket.send(JSON.stringify({ v: 1, seq: 0, t: Date.now(), type, body }));
  }

  act(action, extra = {}) { this.send('act', { action, ...extra }); }

  onFrame(f, from) {
    this.frames++;
    switch (f.type) {
      case 'hello_ok': this.hello = f.body; this.helloCount++; break;
      case 'state': this.state = f.body; this.statesAt.push(Date.now()); break;
      case 'table': this.table = f.body; this.onTable?.(f.body); break;
      case 'notice': this.notices.push(f.body); break;
      case 'over': this.over = f.body; say(`seat ${this.i}: over ${JSON.stringify(f.body).slice(0, 160)}`); break;
      case 'input':
        this.input = f.body;
        setTimeout(() => this.decide(f.body), 30);
        break;
      case 'ask':
        setTimeout(() => this.answer(f.body), 30);
        break;
      default: break;
    }
    this.onAny?.(f, from);
  }

  myTurn() { return this.state && this.state.activePlayer === this.me; }

  decide(body) {
    if (this.frozen || this.over || body !== this.input) return;
    if (this.beforeDecide?.(body) === POLICY_FROZEN) return;
    const sel = body.selectable ?? {};
    const ids = Array.isArray(sel.cardIds) ? sel.cardIds : [];
    const okOn = body.buttons?.ok?.enabled === true;
    const cancelOn = body.buttons?.cancel?.enabled === true;
    const mustClick = ids.length > 0 && (!okOn || (sel.min ?? 0) > 0);
    const moves = [];
    if (mustClick) for (const id of ids) moves.push(['clickCard', { cardId: id }]);
    const st = this.state;
    const main = st && (st.phase === 'MAIN1' || st.phase === 'MAIN2');
    const stackEmpty = !st || !Array.isArray(st.stack) || st.stack.length === 0;
    const pay = String(body.prompt ?? '').includes('Pay ');
    if (!mustClick && !pay && this.myTurn() && st.priority === this.me && main && stackEmpty
        && !this.playedLand.has(st.turn)) {
      const me = st.players.find((p) => p.id === this.me);
      for (const c of me?.zones?.hand?.cards ?? []) {
        if (typeof c.types === 'string' && c.types.includes('Land')) moves.push(['clickCard', { cardId: c.id }, 'land']);
      }
    }
    if (okOn) moves.push(['buttonOk', {}]);
    if (cancelOn) moves.push(['buttonCancel', {}]);
    if (moves.length === 0) return;
    const key = `${body.prompt}|${ids.join(',')}|${okOn}|${cancelOn}|${st?.turn}|${st?.phase}`;
    const n = this.tries.get(key) ?? 0;
    this.tries.set(key, n + 1);
    const move = n < moves.length ? moves[n] : okOn ? ['buttonOk', {}] : cancelOn ? ['buttonCancel', {}] : null;
    if (!move) return;
    if (move[2] === 'land') this.playedLand.add(st.turn);
    this.act(move[0], move[1]);
  }

  answer(body) {
    if (this.frozen || this.over) return;
    this.send('answer', { askId: body.askId, value: answerFor(body.kind, body) });
  }
}

const len = (a) => (Array.isArray(a) ? a.length : 0);
const indices = (n) => Array.from({ length: Math.max(0, n) }, (_, i) => i);
const intOf = (v) => (typeof v === 'number' ? Math.trunc(v) : null);
/** tools/ws-auto-play.mjs's answerFor, without its probes. */
function answerFor(kind, body) {
  switch (kind) {
    case 'ability_menu':
    case 'options': {
      const n = len(body.options);
      if (n === 0) return null;
      const d = intOf(body.defaultIndex);
      return d !== null && d >= 0 && d < n ? d : 0;
    }
    case 'confirm': return body.defaultYes === true;
    case 'text': return body.numeric === true ? null : '';
    case 'choose_list':
    case 'choose_entities': {
      const n = len(body.options);
      const min = intOf(body.min);
      return indices(min === null || min < 0 ? 0 : Math.min(min, n));
    }
    case 'order': {
      const dest = len(body.dest);
      const total = dest + len(body.source);
      const min = intOf(body.min);
      const max = intOf(body.max);
      let lo = max !== null && max >= 0 ? total - max : 0;
      let hi = min !== null && min >= 0 ? total - min : total;
      lo = Math.max(0, Math.min(lo, total));
      hi = Math.max(lo, Math.min(hi, total));
      return { ordered: indices(Math.max(lo, Math.min(dest, hi))), remember: false };
    }
    case 'manipulate_list': return indices(len(body.cards));
    case 'sideboard': return indices(len(body.main));
    case 'assign_damage': {
      const n = len(body.targets);
      const total = intOf(body.total);
      return n === 0 || total === null ? null : { [String(n > 1 ? 1 : 0)]: total };
    }
    case 'assign_amount': {
      const n = len(body.targets);
      const total = intOf(body.total);
      return n === 0 || total === null ? null : { 0: total };
    }
    default: return null;
  }
}

const seats = [new Seat(0), new Seat(1)];
const turn = () => Math.max(seats[0].state?.turn ?? 0, seats[1].state?.turn ?? 0);
async function until(pred, ms, what) {
  const end = Date.now() + ms;
  while (!pred()) {
    if (failure) return false;
    if (Date.now() > end) { fail(`timed out waiting for ${what}`); return false; }
    await sleep(50);
  }
  return true;
}

const deadline = setTimeout(() => fail(`no end within ${args.timeoutS} s`, 1), args.timeoutS * 1000);
deadline.unref();

if (!failure) {
  await seats[0].open('first');
  await seats[1].open('first');
  await until(() => seats[0].hello && seats[1].hello, 20000, 'both hello_ok');
  const players = seats[0].hello?.players ?? [];
  if (seats[0].hello && (seats[0].hello.you === seats[1].hello.you)) fail('both seats were handed the same player');
  if (seats[0].hello && seats[0].hello.gameId !== GAME_ID) fail(`gameId ${seats[0].hello.gameId}, expected ${GAME_ID}`);
  if (players.some((p) => p.isAi !== false)) fail('a player at a table of two is marked isAi');
  const m = seats[1].hello?.match;
  if (!m || m.opponent !== 'human' || !m.opponentDeck || 'aiDeck' in m) fail(`hello_ok.match is not the two-person form: ${JSON.stringify(m)}`);
  say(`seats: 0 is player ${seats[0].me}, 1 is player ${seats[1].me}; match ${JSON.stringify(m)}`);
}

async function concedeScenario() {
  await until(() => turn() >= 3, 120000, 'turn 3');
  // Drop seat 0 and come back with its token.
  const s0 = seats[0];
  const s1 = seats[1];
  const sawAway = { away: false, back: false };
  s1.onTable = (t) => {
    const other = t.seats[s0.i];
    if (!other.connected) sawAway.away = true;
    if (sawAway.away && other.connected) sawAway.back = true;
  };
  s0.leaving = true;
  s0.socket.close();
  await until(() => sawAway.away, 5000, 'seat 1 to be told seat 0 is away');
  await sleep(1500);
  const hellosBefore = s0.helloCount;
  s0.leaving = false;
  s0.state = null;
  await s0.open('reconnect');
  await until(() => s0.helloCount > hellosBefore && s0.state !== null, 5000, 'hello_ok + state on reconnect');
  if (s0.hello.gameId !== GAME_ID) fail('the reconnect landed in another game');
  await until(() => sawAway.back, 5000, 'seat 1 to be told seat 0 is back');
  say('reconnect: seat 0 dropped and came back by token; hello_ok, a full state at once, and seat 1 saw away/back');

  await until(() => turn() >= 4, 120000, 'turn 4');
  // A second socket for seat 1 takes the seat over; the first is closed 4002.
  const old = s1.socket;
  const codes = s1.closeCodes.length;
  await s1.open('takeover');
  await until(() => old.readyState === 3, 5000, 'the older socket to close');
  await until(() => s1.closeCodes.length > codes, 2000, 'the close code');
  if (!s1.closeCodes.includes(4002)) fail(`the replaced socket closed ${s1.closeCodes.join(',')}, not 4002`);
  else say('takeover: a second seat-1 socket replaced the first (closed 4002)');
  s1.send('resync', {});

  await until(() => turn() >= 6, 180000, 'turn 6');
  say(`turn ${turn()}: seat 1 concedes`);
  s1.act('concede');
  await until(() => s0.over && s1.over, 30000, 'over on both seats');
}

async function claimScenario() {
  const s0 = seats[0];
  const s1 = seats[1];
  await until(() => turn() >= 4, 150000, 'turn 4');
  // Seat 1 leaves at its own decision: freeze, then close.
  let left = false;
  s1.beforeDecide = (body) => {
    if (left) return POLICY_FROZEN;
    if (body.buttons?.ok?.enabled !== true && body.buttons?.cancel?.enabled !== true) return undefined;
    left = true;
    s1.frozen = true;
    s1.leaving = true;
    say('seat 1 walks away at its own decision');
    s1.socket.close();
    return POLICY_FROZEN;
  };
  await until(() => left, 60000, 'seat 1 to have a decision');
  await until(() => s0.table && !s0.table.seats[s1.i].connected, 5000, 'seat 0 to see seat 1 away');
  if (!s0.table.seats[s1.i].deciding) fail('the table frame does not say the absent seat is deciding');
  const statesBefore = s0.statesAt.length;
  await sleep(2000);
  if (s0.statesAt.length !== statesBefore) fail('the game moved on while the deciding player was away (it should pause)');
  else say('pause: no state for 2 s while seat 1 was away on its own decision');
  s0.act('claimWin');
  await until(() => s0.notices.some((n) => n.title === 'Not yet'), 3000, 'an early claimWin to be refused');
  await until(() => s0.table?.canClaimWin === true, 10000, 'canClaimWin');
  say('grace is up: seat 0 claims the win');
  s0.act('claimWin');
  await until(() => s0.over, 30000, 'over after the claim');
}

async function timeoutScenario() {
  const s0 = seats[0];
  const s1 = seats[1];
  await until(() => turn() >= 2, 120000, 'turn 2');
  let held = null;
  s1.beforeDecide = (body) => {
    const actionable = body.buttons?.ok?.enabled === true || body.buttons?.cancel?.enabled === true;
    if (held === null && actionable) {
      held = Date.now();
      say(`seat 1 sits on "${String(body.prompt).slice(0, 60)}"`);
      return POLICY_FROZEN;
    }
    return undefined;
  };
  await until(() => held !== null, 60000, 'seat 1 to have a decision');
  await until(() => s1.table?.seats[s1.i].decisionDeadline, 3000, 'a decision deadline in the table frame');
  await until(() => s1.notices.some((n) => n.title === "Time's up"), 8000, "seat 1's \"Time's up\"");
  await until(() => s0.notices.some((n) => n.title === "Time's up"), 2000, "seat 0's \"Time's up\"");
  const waited = Date.now() - held;
  if (waited < 2500) fail(`the clock ran out after ${waited} ms, before the 3 s it was given`);
  say(`clock: the default was taken after ${waited} ms and both seats were told`);
  await until(() => turn() >= 4, 180000, 'turn 4');
  s1.act('concede');
  await until(() => s0.over && s1.over, 30000, 'over on both seats');
}

if (!failure) {
  try {
    if (args.scenario === 'concede') await concedeScenario();
    else if (args.scenario === 'claim') await claimScenario();
    else await timeoutScenario();
  } catch (err) {
    fail(`scenario threw: ${err.stack}`);
  }
}
if (!failure) {
  const winnerOk = (o) => o && o.winner === seats[0].me;
  if (!winnerOk(seats[0].over)) fail(`seat 0's over does not name seat 0 the winner: ${JSON.stringify(seats[0].over)}`);
  if (args.scenario !== 'claim' && !winnerOk(seats[1].over)) fail(`seat 1's over does not name seat 0 the winner: ${JSON.stringify(seats[1].over)}`);
}
finish();

async function finish() {
  for (const s of seats) { s.leaving = true; s.over = s.over ?? {}; try { s.socket?.close(); } catch { /* gone */ } }
  const code = await Promise.race([bridgeDone, sleep(40000).then(() => null)]);
  if (code === null) {
    bridge.kill('SIGTERM');
    fail('the bridge did not exit within 40 s of the end');
    await bridgeDone;
  } else if (code !== 0 && !failure) {
    fail(`the bridge exited ${code}; see ${bridgeLog}`);
  }
  const logs = [0, 1].map((i) => join(ROOT, 'var', 'games', `${GAME_ID}-seat${i}`, 'frames.jsonl'));
  for (const l of logs) if (!existsSync(l)) fail(`no frame log at ${l}`);
  if (!failure) {
    const run = (script, list) => new Promise((r) => {
      const p = spawn(process.execPath, [join(ROOT, 'tools', script), ...list], { cwd: ROOT, stdio: 'inherit' });
      p.on('exit', r);
    });
    if (await run('check-redaction.mjs', logs) !== 0) fail('check-redaction failed on a seat log');
    if (await run('check-seat-pair.mjs', logs) !== 0) fail('check-seat-pair failed');
    // D406: result.json names seat 0, the winner of every scenario (a concede and a claimed win are losses).
    let res = null;
    try { res = JSON.parse(readFileSync(resultFile, 'utf8')); } catch { /* checked below */ }
    if (!res || res.winnerSeat !== 0 || res.gameId !== GAME_ID) fail(`result.json does not name seat 0 the winner: ${JSON.stringify(res)}`);
    else say(`result.json: seat 0 won (${res.reason}, from ${res.from})`);
  }
  if (failure) {
    console.error(`[two] ${args.scenario}: FAILED -- ${failure.why}`);
    process.exit(failure.code);
  }
  say(`${args.scenario}: OK (${seats[0].frames} + ${seats[1].frames} frames)`);
  process.exit(0);
}
