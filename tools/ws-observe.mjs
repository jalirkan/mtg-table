#!/usr/bin/env node
// mtg-table — tools/ws-observe.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A follower on `/observe` (amendment M50, D280), and the check that what it
// was sent is what the seat was sent (D291).  Plain Node: the global WebSocket
// is the whole dependency list (CLAUDE.md: do not add `ws`).
//
//   node tools/ws-observe.mjs --port 8643 --out var/observed.jsonl
//       Connect to ws://127.0.0.1:<port>/observe -- retrying until the port
//       accepts, so it can be started BEFORE the server and join before the
//       session exists -- and write every frame it is sent, verbatim, one per
//       line.  Exit 0 at the `over` (`--games N`: the N-th), non-zero if the
//       socket closes first.
//
//   ... --until close
//       Exit 0 when the SERVER closes the socket, having sent at least a
//       `hello_ok`.  Gate step 10h attaches one of these to a session nobody
//       plays: an observer is not a client (D286), so the session must end
//       ABANDONED under it all the same, and the observer is told by the close.
//
//   node tools/ws-observe.mjs --check var/observed.jsonl \
//        --bridge-log var/games/<id>/frames.jsonl [--seat-log var/ws-auto.jsonl]
//       The comparison, after the game.  The observer's stream must be exactly
//       what `WsTransport` promises (M50): a catch-up from the transport's cache
//       at the moment it was admitted -- the last `hello_ok`, the last `state`,
//       this game's `over` or else its last `input`, every ask still pending --
//       and then every frame the seat was sent after that moment, with no gap
//       and no duplicate.  It searches for that moment in the bridge's own
//       frame log (0 = before the session existed, when the whole stream is
//       live) and fails unless one moment explains EVERY frame: same `seq`, same
//       `type`, the same `body` bytes as the log's s2c line (the log stamps its
//       own `t`, so `t` is not compared).  The live part is a SET against the
//       log, not a sequence in `seq` order: a frame is numbered under the log's
//       monitor and pushed after it, so two threads emitting at once reach the
//       socket out of `seq` order, for the seat as for the observer (D291).  An
//       out-of-band frame (`seq: 0`, the seat's own notices and pongs) must
//       never reach an observer.  With `--seat-log` (a `tools/ws-auto-play.mjs
//       --log`, which re-encodes what it parsed) every s2c frame the seat
//       received with a `seq` the observer was also sent must be the same frame,
//       compared as parsed JSON, and the frames the seat received once must
//       have reached the observer in the seat's order.
//
// Node 22 and Node 24 alike: Node 22's WebSocket fires `error` and NO `close`
// on a refused connect, so `error` settles a connect attempt here too (the
// failure gate step 10e had under Node 22; D291).
//
// Exit: 0 on success, 1 on a failed check or socket, 2 on bad arguments.

import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
const opt = {
  port: 8642, out: null, timeout: 300, until: 'over', games: 1, quiet: false,
  check: null, bridgeLog: null, seatLog: null,
};
for (let i = 0; i < args.length; i++) {
  const k = args[i];
  const need = () => {
    const v = args[++i];
    if (v === undefined) die(`${k} needs a value`, 2);
    return v;
  };
  if (k === '--port') opt.port = Number.parseInt(need(), 10);
  else if (k === '--out') opt.out = need();
  else if (k === '--timeout') opt.timeout = Number.parseInt(need(), 10);
  else if (k === '--until') opt.until = need();
  else if (k === '--games') opt.games = Number.parseInt(need(), 10);
  else if (k === '--quiet') opt.quiet = true;
  else if (k === '--check') opt.check = need();
  else if (k === '--bridge-log') opt.bridgeLog = need();
  else if (k === '--seat-log') opt.seatLog = need();
  else if (k === '--help' || k === '-h') { usage(); process.exit(0); }
  else die(`unknown argument ${k}`, 2);
}

function usage() {
  process.stdout.write(
    'usage: node tools/ws-observe.mjs [--port 8642] --out <file> [--until over|close] [--games 1] [--timeout 300] [--quiet]\n' +
      '       node tools/ws-observe.mjs --check <observed> --bridge-log <frames.jsonl> [--seat-log <client log>]\n',
  );
}

function die(msg, code = 1) {
  process.stderr.write(`ws-observe FAILED: ${msg}\n`);
  process.exit(code);
}

const say = (s) => {
  if (!opt.quiet) process.stdout.write(`${s}\n`);
};

if (opt.check !== null) {
  if (opt.bridgeLog === null) die('--check needs --bridge-log', 2);
  check();
} else {
  if (opt.out === null) die('--out is required (or --check)', 2);
  if (!Number.isFinite(opt.port) || opt.port <= 0) die('--port must be a positive integer', 2);
  if (opt.until !== 'over' && opt.until !== 'close') die('--until is over or close', 2);
  if (!Number.isFinite(opt.games) || opt.games <= 0) die('--games must be a positive integer', 2);
  await follow();
}

// ---------------------------------------------------------------------------
// Following
// ---------------------------------------------------------------------------

async function follow() {
  const url = `ws://127.0.0.1:${String(opt.port)}/observe`;
  mkdirSync(dirname(opt.out), { recursive: true });
  writeFileSync(opt.out, '');
  // Held (not unref'd): it is what keeps the event loop alive while a connect
  // is pending, so a run can only end in a verdict.
  const wholeRun = setTimeout(() => die(`no verdict within ${String(opt.timeout)} s (${url})`), opt.timeout * 1000);

  const deadline = Date.now() + opt.timeout * 1000;
  let ws = null;
  let attempts = 0;
  while (ws === null) {
    attempts += 1;
    try {
      ws = await open(url);
    } catch {
      if (Date.now() >= deadline) die(`nothing accepted ${url} within ${String(opt.timeout)} s`);
      await new Promise((r) => setTimeout(r, 25));
    }
  }
  say(`ws-observe: following ${url} (open after ${String(attempts)} attempt(s))`);

  let frames = 0;
  let overs = 0;
  let hello = false;
  await new Promise((resolve) => {
    ws.addEventListener('message', (e) => {
      const text = String(e.data);
      appendFileSync(opt.out, `${text}\n`);
      frames += 1;
      let type = '?';
      try {
        type = JSON.parse(text).type;
      } catch {
        die(`frame ${String(frames)} is not JSON: ${text.slice(0, 120)}`);
      }
      if (type === 'hello_ok') hello = true;
      if (type === 'over') {
        overs += 1;
        if (opt.until === 'over' && overs >= opt.games) {
          clearTimeout(wholeRun);
          say(`ws-observe OK: ${String(frames)} frame(s), ${String(overs)} \`over\` -> ${opt.out}`);
          try { ws.close(1000, 'done'); } catch { /* already gone */ }
          process.exit(0);
        }
      }
    });
    const lost = (how) => {
      clearTimeout(wholeRun);
      if (opt.until === 'close' && hello) {
        say(`ws-observe OK: the server closed the observer (${how}) after ${String(frames)} frame(s) -> ${opt.out}`);
        process.exit(0);
      }
      die(`the observer socket ${how} after ${String(frames)} frame(s), ${String(overs)} \`over\`` +
        (opt.until === 'close' ? ' and no `hello_ok`' : ` of ${String(opt.games)}`));
      resolve();
    };
    ws.addEventListener('close', (e) => lost(`closed (${String(e.code)})`));
    ws.addEventListener('error', () => lost('errored'));
  });
}

/** One connect attempt: settles on `open`, or on the first of `error` / `close`. */
function open(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let settled = false;
    const no = () => {
      if (settled) return;
      settled = true;
      reject(new Error('not accepted'));
    };
    ws.addEventListener('open', () => {
      settled = true;
      resolve(ws);
    }, { once: true });
    ws.addEventListener('error', no, { once: true });
    ws.addEventListener('close', no, { once: true });
  });
}

// ---------------------------------------------------------------------------
// Checking
// ---------------------------------------------------------------------------

/** seq, type and the raw body text of one envelope line (wire or log). */
function split(text, where) {
  let f;
  try {
    f = JSON.parse(text);
  } catch {
    die(`${where}: not JSON: ${text.slice(0, 120)}`);
  }
  const at = text.indexOf(',"body":');
  if (at < 0) die(`${where}: no body: ${text.slice(0, 120)}`);
  // The writers put `body` last (WireGuiGame.envelope, GameLog.frame).
  return { seq: f.seq, type: f.type, body: text.slice(at + 8, -1), dir: f.dir, askId: f.body?.askId };
}

function readLines(path) {
  return readFileSync(path, 'utf8').split('\n').filter((l) => l.length > 0);
}

function check() {
  const obs = readLines(opt.check).map((t, i) => split(t, `${opt.check}:${String(i + 1)}`));
  if (obs.length === 0) die(`${opt.check} is empty: the observer was sent nothing`);

  // The bridge's log: line 0 is the session header; then s2c and c2s frames in
  // the order the bridge wrote them, which is what places a c2s `answer` among
  // the s2c frames (an ask is pending from its frame until its answer).
  const logLines = readLines(opt.bridgeLog);
  const log = logLines.slice(1).map((t, i) => split(t, `${opt.bridgeLog}:${String(i + 2)}`));
  const s2c = log.filter((f) => f.dir === 's2c');
  if (s2c.length === 0) die(`${opt.bridgeLog} has no s2c frames`);
  const bySeq = new Map(s2c.map((f) => [f.seq, f]));
  const posOf = new Map();
  log.forEach((f, i) => { if (f.dir === 's2c') posOf.set(f.seq, i); });
  const answerPos = new Map();
  log.forEach((f, i) => {
    if (f.dir === 'c2s' && f.type === 'answer' && f.askId !== undefined && !answerPos.has(f.askId)) {
      answerPos.set(f.askId, i);
    }
  });

  // 1. Every frame the observer was sent is the log's frame of that seq, and
  //    none of the seat's out-of-band frames is among them.
  const seen = new Set();
  obs.forEach((o, i) => {
    if (o.seq === 0) die(`observed frame ${String(i + 1)} is out of band (seq 0, \`${o.type}\`): the seat's own frames never reach an observer`);
    const l = bySeq.get(o.seq);
    if (l === undefined) die(`observed frame ${String(i + 1)} has seq ${String(o.seq)}, which the bridge's log never sent`);
    if (l.type !== o.type) die(`observed frame ${String(i + 1)} (seq ${String(o.seq)}) is a \`${o.type}\`; the log's is a \`${l.type}\``);
    if (l.body !== o.body) die(`observed frame ${String(i + 1)} (seq ${String(o.seq)}, \`${o.type}\`) differs from the log's body`);
    if (seen.has(o.seq)) die(`observed seq ${String(o.seq)} twice: a duplicate`);
    seen.add(o.seq);
  });

  // 2. One admission moment m explains the whole stream.
  const catchUp = (m) => {
    if (m === 0) return [];
    let hello = null;
    let state = null;
    let input = null;
    let over = null;
    const asks = [];
    const mPos = posOf.get(m);
    for (const f of s2c) {
      if (f.seq > m) break;
      if (f.type === 'hello_ok') { hello = f; input = null; over = null; }
      else if (f.type === 'state') state = f;
      else if (f.type === 'input') input = f;
      else if (f.type === 'over') over = f;
    }
    if (hello === null) return [];
    for (const f of s2c) {
      if (f.seq > m) break;
      if (f.type !== 'ask') continue;
      const a = answerPos.get(f.askId);
      if (a === undefined || a > mPos) asks.push(f);
    }
    return [hello, state, over ?? input, ...asks].filter((f) => f !== null);
  };
  //    The live part is compared as a SET with the log's later frames, not as
  //    a sequence in seq order: a frame is numbered under the log's monitor and
  //    pushed after it, so two threads that emit at once (the game thread's
  //    `input` and a resync's re-emitted one) reach the socket out of seq order
  //    -- the seat's own copy shows the same order (D291, measured: 5, 3, 4).
  //    What the observer must match is the order the SEAT was sent; step 3
  //    holds that.  A frame numbered just before the admission and pushed just
  //    after it is live too (at most LATE behind it).
  const LATE = 16;
  const sorted = s2c.map((f) => f.seq).sort((a, b) => a - b);
  const candidates = [0, ...sorted.filter((s) => s < obs[obs.length - 1].seq)];
  let found = null;
  let best = null;
  for (const m of candidates) {
    const cu = catchUp(m);
    if (obs.length < cu.length) continue;
    if (cu.some((f, i) => obs[i].seq !== f.seq)) continue;
    const cuSeqs = new Set(cu.map((f) => f.seq));
    const live = obs.slice(cu.length);
    const liveSet = new Set(live.map((f) => f.seq));
    const missing = sorted.filter((q) => q > m && !liveSet.has(q));
    const stray = live.filter((f) => f.seq <= m && (f.seq <= m - LATE || cuSeqs.has(f.seq)));
    if (missing.length === 0 && stray.length === 0) {
      let back = 0;
      let hi = 0;
      for (const f of live) { if (f.seq < hi) back += 1; hi = Math.max(hi, f.seq); }
      found = { m, catchUp: cu.length, late: live.filter((f) => f.seq <= m).length, back };
      break;
    }
    const score = missing.length + stray.length;
    if (best === null || score < best.score) best = { m, score, missing, stray };
  }
  if (found === null) {
    die(best === null
      ? 'no admission moment explains the observed stream: its first frames are no catch-up the transport sends'
      : `no admission moment explains the observed stream: the closest (after seq ${String(best.m)}) misses ` +
        `${String(best.missing.length)} frame(s) the log sent after it (first: ${String(best.missing[0] ?? '-')}) and ` +
        `has ${String(best.stray.length)} it should not (first: ${String(best.stray[0]?.seq ?? '-')}) -- a gap or a bad catch-up`);
  }
  const lastObs = obs[obs.length - 1];
  const lastLog = s2c[s2c.length - 1];
  if (lastObs.type !== 'over' && lastLog.type === 'over') {
    die(`the observer's last frame is a \`${lastObs.type}\`; the log ends in \`over\``);
  }

  // 3. The seat's own copy, where it overlaps.
  let seatSame = 0;
  let seatMissed = 0;
  let seatOrdered = 0;
  if (opt.seatLog !== null) {
    const obsBySeq = new Map(readLines(opt.check).map((t) => [JSON.parse(t).seq, JSON.parse(t)]));
    const seatLines = readLines(opt.seatLog).slice(1).map((t) => JSON.parse(t));
    const firstLive = obs[found.catchUp]?.seq ?? Infinity;
    for (const f of seatLines) {
      if (f.dir !== 's2c' || f.seq === 0) continue;
      const o = obsBySeq.get(f.seq);
      if (o === undefined) {
        if (f.seq >= firstLive) die(`the seat was sent seq ${String(f.seq)} \`${f.type}\` after the observer joined, and the observer was not`);
        seatMissed += 1;
        continue;
      }
      if (o.type !== f.type || JSON.stringify(o.body) !== JSON.stringify(f.body)) {
        die(`seq ${String(f.seq)}: the seat's \`${f.type}\` and the observer's \`${o.type}\` differ`);
      }
      seatSame += 1;
    }
    // Order: the frames the seat received exactly once (a verbatim re-delivery
    // repeats one) and the observer received live must come in the same order.
    const count = new Map();
    for (const f of seatLines) if (f.dir === 's2c' && f.seq !== 0) count.set(f.seq, (count.get(f.seq) ?? 0) + 1);
    const liveSeqs = new Set(obs.slice(found.catchUp).map((f) => f.seq));
    const seatOrder = seatLines.filter((f) => f.dir === 's2c' && count.get(f.seq) === 1 && liveSeqs.has(f.seq)).map((f) => f.seq);
    const inSeat = new Set(seatOrder);
    const obsOrder = obs.slice(found.catchUp).map((f) => f.seq).filter((q) => inSeat.has(q));
    const at = seatOrder.findIndex((q, i) => obsOrder[i] !== q);
    if (at >= 0) {
      die(`the observer was sent seq ${String(obsOrder[at])} where the seat was sent seq ${String(seatOrder[at])}: ` +
        'not the seat\'s order');
    }
    seatOrdered = seatOrder.length;
  }

  const how = found.m === 0
    ? `joined before the session existed: all ${String(obs.length)} frame(s) live`
    : `caught up after seq ${String(found.m)} on ${String(found.catchUp)} frame(s) ` +
      `(${obs.slice(0, found.catchUp).map((f) => f.type).join(', ')}), then ${String(obs.length - found.catchUp)} live`;
  process.stdout.write(
    `ws-observe check OK: ${how}; every frame the bridge's log sent from then on, same seq, type and body, ` +
      `no gap, no duplicate, nothing out of band, ending at seq ${String(lastLog.seq)} \`${lastLog.type}\`; ` +
      `${String(found.back)} frame(s) reached the socket behind a higher seq, ${String(found.late)} numbered before the admission` +
      (opt.seatLog === null ? '' : `; the seat's log agrees on all ${String(seatSame)} of its s2c line(s) the observer was also sent ` +
        `(${String(seatMissed)} sent before the observer joined), and on the order of ${String(seatOrdered)} it received once`) + '\n',
  );
}
