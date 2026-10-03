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
//   node tools/ws-smoke.mjs --port 8643 --concede-before-input
//       connect the INSTANT the port accepts one — before `GET /health` says
//       `ok`, which is the one moment a client can be earlier than the engine —
//       then send `act: concede` from inside the `hello_ok` handler itself,
//       before any `input` has arrived.  Expect `over` with `winner: null`,
//       `reason: null`, `matchOver: true`, and NO `state` in front of it.
//
//       This is M3 follow-up 5: amendment M11's exception path, which until now
//       had never been observed (`grep -rl 'OVER WITHOUT A gameOver STATE' var/`
//       found nothing across every run on disk).  The other two variants concede
//       *after* the first `input`, so `inputSeen` is armed, the concede reaches
//       Forge's own game-over and the session ends `winner=1
//       reason=AllOpponentsLost` with a `gameOver` snapshot in front of `over`.
//       Reaching the other branch — `applyAct`'s pre-`inputSeen` guard, which
//       ends the session without ever entering Forge's game-over — needs a
//       concede that beats the engine's first prompt to the socket.
//
//       Two things make that a race this can win rather than one it hopes to:
//
//         * it does NOT wait for `/health`.  Readiness is `lastHello != null`
//           (amendment M15), so a client that polls health has already lost
//           ~1 s of the window and starts counting from the wrong end; the port
//           binds about a second before `openView`, and `WsTransport` handles a
//           connection in that window explicitly ("WS CONNECT before the session
//           exists -- no resend"), so the earliest legal arrival is a retry loop
//           on `connect`.  Nothing is SENT before `hello_ok`: amendment M20
//           drops a pre-session c2s frame in silence, so a concede sent from the
//           `open` handler proper would be thrown away and this test would hang
//           to its timeout instead of measuring anything.
//         * the concede is written from inside the frame handler, synchronously,
//           on the same turn of the event loop that received `hello_ok` — not
//           after an `await`.
//
//       Measured 2026-09-11 at seed 13: `hello_ok` → concede = 0–3 ms; `hello_ok`
//       → the first engine `input` = ~150 ms.  That is the whole margin, and it
//       is why a failure here reads "the window was missed" rather than "the
//       bridge is wrong" — see the message this prints when `winner` comes back
//       non-null.
//
//   node tools/ws-smoke.mjs --port 8643 --hold 6
//       the first variant, connected EARLY (the retry loop below, before the
//       session exists) and holding the seat, idle, for 6 s after the resync
//       before it concedes.  Gate step 10h runs it against a server started
//       with `--idle-timeout 3` (D286, D291): a connected `/ws` client is what
//       keeps a session alive, so the session must outlive twice its idle limit
//       and end in the concede's `over`, never `ABANDONED`.  The early connect
//       is what makes that deterministic: the client is on the socket before
//       the idle clock starts, rather than a `/health` poll's second later.
//
// Options:
//   --port <n>                 default 8642
//   --timeout <seconds>        whole-run cap, default 120
//   --log <path>               write every frame received (one JSON per line)
//   --disconnect-mid-ask       the second variant
//   --concede-before-input     the third variant (amendment M11's exception path)
//   --hold <seconds>           the first variant, connected early, idle this long before the concede
//   --quiet                    only the verdict
//
// Exit: 0 on success, non-zero with a reason on stderr otherwise.

import { writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { dirname } from 'node:path';

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const opt = {
  port: 8642,
  timeout: 120,
  log: null,
  disconnectMidAsk: false,
  concedeBeforeInput: false,
  hold: 0,
  quiet: false,
};
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
  else if (k === '--concede-before-input') opt.concedeBeforeInput = true;
  else if (k === '--hold') opt.hold = Number.parseInt(need(k), 10);
  else if (k === '--quiet') opt.quiet = true;
  else if (k === '--help' || k === '-h') { usage(); process.exit(0); }
  else die(`unknown argument ${k}`);
}
if (!Number.isFinite(opt.port) || opt.port <= 0) die(`--port must be a positive integer`);
if (opt.disconnectMidAsk && opt.concedeBeforeInput) {
  die('--disconnect-mid-ask and --concede-before-input are different variants; pass one');
}
if (!Number.isFinite(opt.hold) || opt.hold < 0) die('--hold must be a non-negative number of seconds');
if (opt.hold > 0 && (opt.disconnectMidAsk || opt.concedeBeforeInput)) {
  die('--hold belongs to the first variant (connect -> resync -> concede)');
}

function usage() {
  process.stdout.write(
    'usage: node tools/ws-smoke.mjs [--port 8642] [--timeout 120] [--log path]\n' +
      '                              [--disconnect-mid-ask | --concede-before-input | --hold <s>]\n' +
      '                              [--quiet]\n',
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
  #hook = null;
  closed = null; // {code, reason} once the socket closes

  static async open() {
    const c = new Conn();
    await c.#connect();
    return c;
  }

  /**
   * Open as soon as the port accepts a connection, retrying until `ms` is up.
   *
   * The `--concede-before-input` variant's whole margin is here: `GET /health`
   * answers `ok` only once `openView` has emitted `hello_ok` (amendment M15),
   * and by then the engine is already walking towards its first prompt.  The
   * port itself binds about a second earlier, and a connection in that window is
   * a case `WsTransport` handles by name, so the earliest a client can legally
   * arrive is "the first `connect` that does not get ECONNREFUSED".
   */
  static async openEarly(ms = 60_000) {
    const deadline = Date.now() + ms;
    for (;;) {
      try {
        return await Conn.open();
      } catch (err) {
        if (Date.now() >= deadline) {
          throw new Error(
            `nothing accepted a connection on ${URL_WS} within ${String(ms)} ms ` +
              `(last: ${err instanceof Error ? err.message : String(err)})`,
          );
        }
        await sleep(25);
      }
    }
  }

  /**
   * Run `fn` on every frame, synchronously, on the same turn of the event loop
   * that received it — before anything parked on `expect()` is woken.
   *
   * `await conn.expect('hello_ok')` would be a few hundred microseconds later,
   * which is nothing against a 150 ms window; this exists so the claim "the
   * concede was written from the handshake handler" is literally true rather
   * than nearly true, and so that a slow machine cannot quietly turn the
   * measurement into a different one.
   */
  onFrame(fn) {
    this.#hook = fn;
  }

  /**
   * Open one socket.  The promise settles on `open`, or on the FIRST of
   * `error` and `close` -- never on `close` alone.
   *
   * Node 22's `WebSocket` (undici) fires `error` and NO `close` on a refused
   * connect; Node 24's fires both.  Waiting for `close` alone left the promise
   * pending on Node 22, nothing else held the event loop, and Node exited 13
   * ("unsettled top-level await") out of `openEarly`'s retry loop -- gate step
   * 10e's failure under the sandbox's Node 22 (PLAN.md, *The observer socket*).
   * `close`, when it comes, still overwrites the code: it carries the real one,
   * which is where a refusal (≥ 4000) shows up.
   */
  #connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(URL_WS);
      this.#ws = ws;
      let settled = false;
      const lost = (code, reason, overwrite) => {
        if (this.closed === null || overwrite) this.closed = { code, reason };
        // Wake anything parked on expect(), so a dropped socket fails the test
        // instead of hanging it out to the whole-run timeout.
        for (const w of this.#waiters.splice(0)) w.wake();
        if (!settled) {
          settled = true;
          reject(new Error(`socket closed before open: ${String(code)} ${String(reason)}`));
        }
      };
      ws.onopen = () => {
        settled = true;
        resolve();
      };
      ws.onerror = (e) => lost(1006, e?.message ?? 'error', false);
      ws.onclose = (e) => lost(e.code ?? 0, e.reason ?? '', true);
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
    if (this.#hook) this.#hook(frame);
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
  say(`ws-smoke: connect → resync → ${opt.hold > 0 ? `hold ${String(opt.hold)} s → ` : ''}concede, at ${URL_WS}`);
  // --hold connects as early as the port allows (see the header): the hold is
  // only a test of the idle limit if the seat was taken before its clock began.
  const connectedAt = Date.now();
  const c = opt.hold > 0 ? await Conn.openEarly(Math.max(5_000, opt.timeout * 500)) : await Conn.open();
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

  if (opt.hold > 0) {
    say(`  hold the seat, idle, for ${String(opt.hold)} s`);
    await sleep(opt.hold * 1000);
    if (c.closed) {
      throw new Error(`the server closed the seat (${String(c.closed.code)} ${c.closed.reason}) while it was held: ` +
        'a connected client did not keep the session alive (D286)');
    }
  }

  // The concede lands while `inputSeen` may still be false — which is the point:
  // the pre-input guard must send it down `applyAct`'s "end the session" path
  // rather than into Match.prepareAllZones.  Either way, `over`.
  c.send('act', { action: 'concede' });
  const over = await c.expect('over', 0, 60_000);
  say(`  s2c  over    winner=${JSON.stringify(over.body.winner)} reason=${JSON.stringify(over.body.reason)}`);
  c.drop();
  if (opt.hold > 0) {
    return `held the seat ${String(((Date.now() - connectedAt) / 1000).toFixed(1))} s, ` +
      `idle for ${String(opt.hold)} of them, and the concede still reached \`over\``;
  }
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

/** connect before the engine is ready → concede on `hello_ok` → M11's `over`. */
async function variantConcedeBeforeInput() {
  say(`ws-smoke: concede from the handshake handler, before any input, at ${URL_WS}`);

  // No /health poll, on purpose: see Conn.openEarly.  `--timeout` is the cap.
  const c = await Conn.openEarly(Math.max(5_000, opt.timeout * 500));
  say('  open     (before GET /health says `ok`, which is the point)');

  // The concede is written from inside the hello_ok handler.  Before it: not one
  // c2s frame, because amendment M20 drops anything that arrives before the
  // session exists — in silence, since a reply would itself be a frame ahead of
  // `hello_ok`.  So "as early as possible" is "the moment `hello_ok` lands", not
  // "the moment the socket opens".
  let helloAt = 0;
  let sentAt = 0;
  let beforeConcede = null; // the frames received up to and including hello_ok
  c.onFrame((f) => {
    if (f.type !== 'hello_ok' || sentAt !== 0) return;
    helloAt = Date.now();
    beforeConcede = [...c.frames];
    say('  s2c  hello_ok');
    c.send('act', { action: 'concede' });
    sentAt = Date.now();
  });

  const over = await c.expect('over', 0, 60_000);
  say(
    `  s2c  over    winner=${JSON.stringify(over.body.winner)} ` +
      `reason=${JSON.stringify(over.body.reason)} matchOver=${JSON.stringify(over.body.matchOver)}`,
  );

  if (beforeConcede === null) throw new Error('an `over` arrived but `hello_ok` never did');
  const early = beforeConcede.filter((f) => f.type === 'input' || f.type === 'state' || f.type === 'ask');
  say(`  concede written ${String(sentAt - helloAt)} ms after hello_ok, with ${String(early.length)} state/input/ask frame(s) in front of it`);

  // The assertion, in the order a reader would want it.
  //
  // (1) The window.  If the engine got its first prompt in first, `inputSeen` is
  //     armed, the concede went through Forge's own game-over and this is a
  //     perfectly healthy `winner=1 reason=AllOpponentsLost` session — it is just
  //     not the branch this variant exists to measure.  Say which one it is.
  if (early.length > 0) {
    throw new Error(
      `the window was missed: ${String(early.length)} frame(s) (` +
        `${early.map((f) => f.type).join(', ')}) arrived before the concede could be written, ` +
        'so this run took the ordinary `inputSeen` path and proves nothing about amendment ' +
        "M11's exception.  This is a timing failure, not a bridge failure: retry, and if it " +
        'persists the hello_ok→first-input window (~150 ms at seed 13) has closed.',
    );
  }
  // (2) The shape.  Protocol amendment M11: `{winner: null, reason: null,
  //     matchOver: true}` and no `gameOver` state in front of it, because there
  //     is no outcome to snapshot and no thread it would be legal to build one
  //     on (applyAct runs on the EDT).
  const want = (k, v) => {
    if (over.body[k] !== v) {
      throw new Error(
        `amendment M11 says a concede before the first input ends with ${k}: ${JSON.stringify(v)}; ` +
          `this \`over\` carried ${k}: ${JSON.stringify(over.body[k])}` +
          (k === 'winner' && over.body[k] !== null
            ? ' — which is the ordinary path, so the concede reached Forge after all'
            : ''),
      );
    }
  };
  want('winner', null);
  want('reason', null);
  want('matchOver', true);
  const states = c.frames.filter((f) => f.type === 'state');
  if (states.length > 0) {
    throw new Error(
      `amendment M11's exception path has no \`state\` in front of \`over\`, and this run ` +
        `received ${String(states.length)} (gameOver: ` +
        `${String(states.filter((f) => f.body?.gameOver != null).length)})`,
    );
  }
  c.drop();
  return (
    'a concede written from the `hello_ok` handler, before any input, ended the session with ' +
    '`over {winner: null, reason: null, matchOver: true}` and no `state` in front of it ' +
    '(amendment M11)'
  );
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

// NOT unref'd: this timer is what holds the event loop while a promise waits on
// a socket event, so a pending connect can only ever end in this message --
// never in Node's exit 13 for an unsettled top-level await (see #connect).
const wholeRun = setTimeout(() => {
  process.stderr.write(`ws-smoke FAILED: the whole run exceeded ${String(opt.timeout)} s\n`);
  process.exit(1);
}, opt.timeout * 1000);

try {
  const variant = opt.disconnectMidAsk
    ? variantDisconnect
    : opt.concedeBeforeInput
      ? variantConcedeBeforeInput
      : variantResync;
  const verdict = await variant();
  clearTimeout(wholeRun);
  process.stdout.write(`ws-smoke OK: ${verdict}\n`);
  process.exit(0);
} catch (err) {
  clearTimeout(wholeRun);
  process.stderr.write(`ws-smoke FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
}
