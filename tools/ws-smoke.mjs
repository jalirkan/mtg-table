#!/usr/bin/env node
// mtg-table — tools/ws-smoke.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// THE M3 doorstep test, in two variants, against a running
// `MtgTable --transport ws` server.  Plain Node: the global WebSocket that
// Node 24 ships is the whole dependency list (CLAUDE.md: do not add `ws`).
//
//   node tools/ws-smoke.mjs --port 8643
//       connect → expect hello_ok + state + input → send `resync` → expect
//       state + input again → send `act: concede` → expect `over` → exit 0.
//
//       This is PLAN.md's M3 doorstep test 1.  `resync` is a first-class client
//       frame (docs/protocol.md §2.4) and a browser that autoconnects sends one
//       before Forge has asked this seat for anything; `WireGuiGame.onResync`
//       used to arm `inputSeen` and so disarm the guard that keeps a concede out
//       of `Match.prepareAllZones`, where removing a player mid-iteration throws
//       inside Forge's own setup.  The guard is fixed; this is what keeps it
//       fixed, and "no exception, and an `over` frame" is the whole assertion.
//
//   node tools/ws-smoke.mjs --port 8643 --disconnect-mid-ask
//       connect → wait for the first `ask`, or the first `input` whose OK button
//       is enabled (whichever the engine produces first — see §4.2: a prompt
//       with OK enabled is the engine waiting for this seat) → DROP the socket →
//       reconnect after 2 s → expect hello_ok + state + input → concede →
//       expect `over` → exit 0.
//
//       This is the cancelAll() test.  Contract (c): the ask timeout over a
//       socket is 0 (infinite) while a client is connected, and what unparks a
//       game thread is the disconnect, not a clock (D15 extended).  A reconnect
//       must then resume: `hello_ok` + `state` + `input` again, and a game that
//       still plays.
//
// Options:
//   --port <n>            default 8642
//   --timeout <seconds>   whole-run cap, default 120
//   --log <path>          write every frame received (one JSON per line)
//   --disconnect-mid-ask  the second variant
//   --quiet               only the verdict
//
// Exit: 0 on success, non-zero with a reason on stderr otherwise.

import { writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { dirname } from 'node:path';

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const opt = { port: 8642, timeout: 120, log: null, disconnectMidAsk: false, quiet: false };
for (let i = 0; i < args.length; i++) {
  const k = args[i];
  const need = (name) => {
    const v = args[++i];
    if (v === undefined) die(`${name} needs a value`);
    return v;
  };
  if (k === '--port') opt.port = Number.parseInt(need(k), 10);
  else if (k === '--timeout') opt.timeout = Number.parseInt(need(k), 10);
  else if (k === '--log') opt.log = need(k);
  else if (k === '--disconnect-mid-ask') opt.disconnectMidAsk = true;
  else if (k === '--quiet') opt.quiet = true;
  else if (k === '--help' || k === '-h') { usage(); process.exit(0); }
  else die(`unknown argument ${k}`);
}
if (!Number.isFinite(opt.port) || opt.port <= 0) die(`--port must be a positive integer`);

function usage() {
  process.stdout.write(
    'usage: node tools/ws-smoke.mjs [--port 8642] [--timeout 120] [--log path]\n' +
      '                              [--disconnect-mid-ask] [--quiet]\n',
  );
}

function die(msg) {
  process.stderr.write(`ws-smoke: ${msg}\n`);
  process.exit(2);
}

const URL_WS = `ws://127.0.0.1:${String(opt.port)}/ws`;
const say = (s) => {
  if (!opt.quiet) process.stdout.write(`${s}\n`);
};

if (opt.log) {
  mkdirSync(dirname(opt.log), { recursive: true });
  writeFileSync(opt.log, '');
}

// ---------------------------------------------------------------------------
// One connection, with a frame queue an `await` can pull from
// ---------------------------------------------------------------------------

const PROTOCOL_VERSION = 1;

/**
 * A connection whose received frames land in a queue, so the script reads like
 * the test it is: `await conn.expect('hello_ok')`.
 *
 * It also answers an inbound `ping` with a `pong` (§2.5) and counts its own
 * client→server `seq` (§1: monotonic, per direction, starting at 1).
 */
class Conn {
  #ws;
  #queue = [];
  #waiters = [];
  #seq = 0;
  closed = null; // {code, reason} once the socket closes

  static async open() {
    const c = new Conn();
    await c.#connect();
    return c;
  }

  #connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(URL_WS);
      this.#ws = ws;
      ws.onopen = () => resolve();
      ws.onerror = () => {
        // onerror carries nothing useful in the WHATWG API; onclose follows and
        // carries the code, which is where a refusal (≥ 4000) shows up.
      };
      ws.onclose = (e) => {
        this.closed = { code: e.code ?? 0, reason: e.reason ?? '' };
        // Wake anything parked on expect(), so a dropped socket fails the test
        // instead of hanging it out to the whole-run timeout.
        for (const w of this.#waiters.splice(0)) w.wake();
        reject(new Error(`socket closed before open: ${String(e.code)} ${String(e.reason)}`));
      };
      ws.onmessage = (e) => this.#receive(String(e.data));
    });
  }

  #receive(text) {
    let frame;
    try {
      frame = JSON.parse(text);
    } catch (err) {
      throw new Error(`server sent a frame that is not JSON: ${String(err)}`);
    }
    if (typeof frame !== 'object' || frame === null || typeof frame.type !== 'string') {
      throw new Error(`server sent a frame that is not a §1 envelope: ${text.slice(0, 160)}`);
    }
    if (frame.v !== PROTOCOL_VERSION) {
      throw new Error(`protocol major mismatch: server sent v=${String(frame.v)}`);
    }
    if (opt.log) appendFileSync(opt.log, `${text}\n`);
    if (frame.type === 'ping') {
      this.send('pong', {});
      return;
    }
    this.#queue.push(frame);
    for (const w of this.#waiters.splice(0)) w.wake();
  }

  /** §1: this side owns its own `seq`. */
  send(type, body) {
    this.#seq += 1;
    const frame = { v: PROTOCOL_VERSION, seq: this.#seq, t: Date.now(), type, body };
    this.#ws.send(JSON.stringify(frame));
    say(`  c2s  ${type}${type === 'act' ? ` ${String(body.action)}` : ''}`);
  }

  /** Every frame received so far, in order. */
  get frames() {
    return this.#queue;
  }

  /**
   * Wait until `pred` matches a frame received from `since` onward.
   *
   * @returns the matching frame
   */
  async waitFor(what, pred, since = 0, ms = 60_000) {
    const deadline = Date.now() + ms;
    for (;;) {
      for (let i = since; i < this.#queue.length; i++) {
        if (pred(this.#queue[i])) return this.#queue[i];
      }
      if (this.closed) {
        throw new Error(
          `waiting for ${what}, but the socket closed (${String(this.closed.code)} ` +
            `${this.closed.reason}) — ${describe(this.#queue)}`,
        );
      }
      const left = deadline - Date.now();
      if (left <= 0) {
        throw new Error(`timed out after ${String(ms)} ms waiting for ${what} — ${describe(this.#queue)}`);
      }
      await this.#park(Math.min(left, 250));
    }
  }

  /** Wait for a frame of this type at or after index `since`. */
  expect(type, since = 0, ms = 60_000) {
    return this.waitFor(`a \`${type}\` frame`, (f) => f.type === type, since, ms);
  }

  #park(ms) {
    return new Promise((resolve) => {
      const waiter = { wake: () => { clearTimeout(timer); resolve(); } };
      const timer = setTimeout(() => {
        const i = this.#waiters.indexOf(waiter);
        if (i >= 0) this.#waiters.splice(i, 1);
        resolve();
      }, ms);
      this.#waiters.push(waiter);
    });
  }

  /** Drop the socket the way a closed browser tab does. */
  drop() {
    try {
      this.#ws.close();
    } catch {
      /* already gone */
    }
  }
}

function describe(frames) {
  const counts = new Map();
  for (const f of frames) counts.set(f.type, (counts.get(f.type) ?? 0) + 1);
  const parts = [...counts].map(([k, v]) => `${k}×${String(v)}`);
  return parts.length === 0 ? 'no frames received at all' : `received ${parts.join(', ')}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// The two variants
// ---------------------------------------------------------------------------

/** connect → resync → concede → over. */
async function variantResync() {
  say(`ws-smoke: connect → resync → concede, at ${URL_WS}`);
  const c = await Conn.open();
  say('  open');

  // Contract (b): hello_ok, then a full state, then the current input.  The
  // client may well beat `openView` to the socket — `/health` answers as soon as
  // the port is bound, which is before HostedMatch.startMatch — so this waits
  // for the handshake rather than assuming it is already cached.
  await c.expect('hello_ok');
  say('  s2c  hello_ok');
  await c.expect('state');
  say('  s2c  state');
  await c.expect('input');
  say('  s2c  input');

  // §2.4.  The mark is taken BEFORE the frame is sent, so the state and input
  // that satisfy it are necessarily the re-sent ones.
  const mark = c.frames.length;
  c.send('resync', {});
  await c.expect('state', mark);
  say('  s2c  state   (after resync)');
  await c.expect('input', mark);
  say('  s2c  input   (after resync)');

  // The concede lands while `inputSeen` may still be false — which is the point:
  // the pre-input guard must send it down `applyAct`'s "end the session" path
  // rather than into Match.prepareAllZones.  Either way, `over`.
  c.send('act', { action: 'concede' });
  const over = await c.expect('over', 0, 60_000);
  say(`  s2c  over    winner=${JSON.stringify(over.body.winner)} reason=${JSON.stringify(over.body.reason)}`);
  c.drop();
  return 'connect → resync → concede reached `over` with no exception';
}

/** connect → wait for a real decision → drop → reconnect → concede → over. */
async function variantDisconnect() {
  say(`ws-smoke: disconnect mid-ask → reconnect → concede, at ${URL_WS}`);
  const first = await Conn.open();
  say('  open');
  await first.expect('hello_ok');
  say('  s2c  hello_ok');

  // "the first ask, or the first input with OK enabled": an `ask` parks a game
  // thread on the reply pool, which is the case cancelAll() exists for, and an
  // enabled OK is the engine saying it is waiting for this seat (§4.2).  Whichever
  // the deck produces first is a live decision, and dropping the socket there is
  // the test.
  const live = await first.waitFor(
    'the first `ask`, or an `input` with OK enabled',
    (f) => f.type === 'ask' || (f.type === 'input' && f.body?.buttons?.ok?.enabled === true),
    0,
    120_000,
  );
  say(`  s2c  ${live.type}${live.type === 'ask' ? ` ${String(live.body.kind)}` : `  (OK = ${JSON.stringify(live.body.buttons.ok.label)})`}`);

  say('  drop the socket');
  first.drop();
  await sleep(2000);

  say('  reconnect');
  const second = await Conn.open();
  // Contract (c): a client reconnecting after a disconnect gets hello_ok +
  // state + input again and the game continues.
  await second.expect('hello_ok');
  say('  s2c  hello_ok  (again, after the reconnect)');
  await second.expect('state');
  say('  s2c  state');
  await second.expect('input');
  say('  s2c  input');

  second.send('act', { action: 'concede' });
  const over = await second.expect('over', 0, 60_000);
  say(`  s2c  over    winner=${JSON.stringify(over.body.winner)} reason=${JSON.stringify(over.body.reason)}`);
  second.drop();
  return `dropped the socket at a live \`${live.type}\`, reconnected, and the game still reached \`over\``;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const wholeRun = setTimeout(() => {
  process.stderr.write(`ws-smoke FAILED: the whole run exceeded ${String(opt.timeout)} s\n`);
  process.exit(1);
}, opt.timeout * 1000);
wholeRun.unref?.();

try {
  const verdict = opt.disconnectMidAsk ? await variantDisconnect() : await variantResync();
  clearTimeout(wholeRun);
  process.stdout.write(`ws-smoke OK: ${verdict}\n`);
  process.exit(0);
} catch (err) {
  clearTimeout(wholeRun);
  process.stderr.write(`ws-smoke FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
}
