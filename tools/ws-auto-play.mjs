#!/usr/bin/env node
/*
 * mtg-table — tools/ws-auto-play.mjs
 * Copyright (C) 2026 mtg-table contributors.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * A scripted seat over the socket: the end-to-end test of `--transport ws` that
 * needs neither a browser nor a person.
 *
 *     node tools/ws-auto-play.mjs --port 8642 [--timeout 300] [--log var/ws-auto.jsonl]
 *     node tools/ws-auto-play.mjs --port 8642 --refuse-first-ask [--reconnect-after 5000]
 *     node tools/ws-auto-play.mjs --port 8642 --probe
 *     node tools/ws-auto-play.mjs --port 8642 --games 3 --comfort
 *     node tools/ws-auto-play.mjs --port 8642 --undo-race
 *
 * `--undo-race` is decision D136's reproduction (docs/evidence/undo-race.md). It
 * sends `act: undo` the instant the FIRST `state` offers one (`undo.can`, depth
 * > 0) -- which, against a server started with `MTGTABLE_HOLD_UNDO_WINDOW_MS`,
 * is the state the mana payment's `stop()` flushes after it has removed the
 * input and before `Game-0` puts the spell on the stack: the window the story
 * branch's gate run crashed in, held open. A fixed bridge refuses the act with
 * `notice {title:"Not now"}` (protocol amendment M48) and this exits 0; a bridge
 * that applies it -- the unfixed one, or `MTGTABLE_TEST_UNGUARDED_ACTS=1` --
 * sends no such notice and this exits **9**. Either way it then concedes, so a
 * run takes one short game. `tools/undo-race-repro.sh` runs both halves.
 *
 * `--games N` (M6) plays N games over one socket: after each `over` it sends
 * `act: newGame {mode}` -- `continue` in the middle of a match, `restart` once
 * `matchOver` is true -- and rolls its own log to the next file, because one
 * game is one `frames.jsonl` (protocol amendment M38). `--comfort` sends M6's
 * five acts once each and FAILS the run (exit 7) if one of them went out and
 * the next `state` did not move: a typed act earns its gate with its effect.
 * Since D136 (amendment M48) its undo is two: a LATE one, sent on the first
 * state that offers an undo -- the payment's own flush, the engine running --
 * which a fixed bridge refuses with `notice {title:"Not now"}`
 * (`--require-late-undo` asserts it), and the one whose effect is checked,
 * sent after the seat has floated one land's mana at priority, while the engine
 * is parked; a "Not now" there is a race with the engine's own re-park and is
 * re-sent.
 * An act the bridge answers with `notice {title:"Not yet"}` never went out at
 * all — the engine had not asked this seat anything yet (§2.1, amendment
 * **M42**) — so that step is UN-SENT and retried after the next real `input`,
 * and the summary line carries `retries=N` so a run that raced says so.
 *
 * `--probe` is M5's: the same policy with four decisions taken the other way, so
 * that `useMana` and `clickAbility` — the two typed acts PLAN.md M5 records as
 * having no client that sends them — actually travel this socket, and so that
 * `showInputDialog` and a library search that fetches something are reachable at
 * all. It mirrors `AutoTransport.setProbe(true)` line for line; the two must
 * agree for the same reason the rest of this file mirrors that class.
 *
 * `--observe-at-ask` holds an observer's catch-up of an open `ask` (amendment
 * M50, D280; PLAN.md's observer follow-up 2, closed by D291): on the first `ask`
 * FRAME it answers nothing, opens a SECOND socket on `/observe` while the game
 * thread is parked on that ask, and requires the observer's catch-up to carry
 * the seat's own bytes -- its first frame the `hello_ok` this seat was sent, then
 * the seat's last `state`, and the ask itself, the same string, so the same
 * `seq` -- before it answers and plays on. It exits **10** if the observer's
 * catch-up lacks the ask or differs from the seat's frames by a byte, and if no
 * ask was raised in the whole game (nothing was tested). Gate step 10c.
 *
 * `--hold-hook <module.mjs>` (D429) parks the seat on each new decision while
 * an outside check runs: before the policy answers an `input` it has not held
 * yet, it awaits the module's default export with `{gameId, me, stateSeq,
 * inputSeq, state, input}` -- the engine stays parked on this seat the whole
 * time, exactly as it does while a person thinks.  `tools/hint-probe.mjs` asks
 * the coach helper's /hint there.  Without the flag nothing changes.
 *
 * `--refuse-first-ask` is the cancelAll() coverage nothing else in the repo has:
 * it plays normally until the first `ask` FRAME, drops the socket while a game
 * thread is parked inside `ReplyPool.await`, reconnects a few seconds later and
 * finishes the game (see `dropOnAsk`).
 *
 * Exit 0 when an `over` frame arrives; non-zero on timeout, on a protocol
 * violation, or on a socket that never opened (**5**, on Node 22 as on Node 24:
 * Node 22's `WebSocket` fires `error` and no `close` on a refused connect, so
 * `error` before `open` fails the run itself -- with nothing else holding the
 * event loop, waiting for a `close` would have let Node exit 0) -- and **8 on an `over` with no
 * `state` carrying `gameOver` in front of it in the same game** (decision D114):
 * this client never concedes before the engine has asked it something, so the
 * only way that shape reaches it is a game ended by something other than
 * Forge's own game-over -- the late `finishGame()` of the PREVIOUS game, which
 * ended game 2 or 3 of a `--games` session before it had dealt a card
 * (PLAN.md slice-4 follow-up 13(c)), or an engine crash. Every act and every answer is
 * printed to stderr with the prompt it was answering, so a failed run is
 * readable without opening the log.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT IS AND IS NOT
 *
 * It is `bridge/src/mtgtable/AutoTransport.java`'s policy, spoken over a socket
 * instead of in-process: **click the first selectable card if the engine demands
 * a click, else press OK, else press Cancel; answer every ask with the minimal
 * legal value for its kind, by ask-local index.** The two must agree, because
 * the whole point of this file is to prove that the same policy that plays a
 * full game in-process also plays one through `WsTransport` — so where a rule
 * looks arbitrary here it is because it is transcribed, and the comment says
 * which rule in the Java it is.
 *
 * It deliberately shares **no code** with `web/src/`: a client that imported the
 * reducer would prove the reducer consistent with itself. It tracks the three
 * things a policy needs (my seat, my hand, whose priority it is) and nothing
 * else, in about as many lines as the Java.
 *
 * Node 24 has a global `WebSocket`; there is no `ws` package here and there must
 * not be one (CLAUDE.md, the environment section).
 * ---------------------------------------------------------------------------
 */

import { mkdirSync, createWriteStream, writeFileSync } from 'node:fs';
import { dirname, extname, resolve as resolvePath } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createAdversary } from './adversary/core.mjs';

const PROTOCOL_VERSION = 1;

/** §2 — the ten types. An eleventh is drift, and drift exits non-zero. */
const FRAME_TYPES = new Set([
  'hello_ok', 'state', 'input', 'ask', 'notice', 'over', 'act', 'answer', 'resync', 'ping', 'pong',
]);

/** §5.1 — the eleven ask kinds. A twelfth is drift. */
const ASK_KINDS = new Set([
  'ability_menu', 'confirm', 'options', 'text', 'choose_list', 'order',
  'choose_entities', 'assign_damage', 'assign_amount', 'manipulate_list', 'sideboard',
]);

/** AutoTransport.STUCK_MS — no frame for this long and the policy concedes. */
const STUCK_MS = 60_000;
/** AutoTransport.STEP_CAP_MS — never sit on one settled decision longer than this. */
const STEP_CAP_MS = 2_000;
/** AutoTransport.SETTLE_MS — a quiet inbox for this long means the board settled. */
const SETTLE_MS = 120;
/** AutoTransport.POOL_COLORS — §3.1's six manaPool keys, in pool order. */
const POOL_COLORS = ['W', 'U', 'B', 'R', 'G', 'C'];
/** AutoTransport.POOL_COLOR_NAMES — the `useMana` colour NAME for each (§2.2). */
const POOL_COLOR_NAMES = { W: 'white', U: 'blue', B: 'black', R: 'red', G: 'green', C: 'colorless' };
/** How long to wait for the socket to open before giving up. */
const CONNECT_TIMEOUT_MS = 30_000;
/** After conceding, how long to wait for `over` before failing anyway. */
const CONCEDE_GRACE_MS = 20_000;

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

function usage(message) {
  if (message) process.stderr.write(`ws-auto-play: ${message}\n`);
  process.stderr.write(
    'usage: node tools/ws-auto-play.mjs [--port 8642] [--url ws://127.0.0.1:8642/ws]\n' +
      '                                  [--timeout 300] [--log var/ws-auto.jsonl]\n' +
      '                                  [--resync-after 12] [--quiet] [--probe]\n' +
      '                                  [--games 3] [--comfort]\n' +
      '                                  [--new-game-delay-ms 40000]\n' +
      '                                  [--require-yield-repeat] [--require-late-undo]\n' +
      '                                  [--undo-race]\n' +
      '                                  [--refuse-first-ask [--reconnect-after 5000]]\n' +
      '                                  [--observe-at-ask]\n' +
      '                                  [--adversary <report.json> [--require-kinds k1,k2]]\n' +
      '                                  [--hold-hook <module.mjs>]\n',
  );
  process.exit(2);
}

const args = {
  port: 8642, url: null, timeoutS: 300, log: null, resyncAfter: 12, quiet: false,
  refuseFirstAsk: false, reconnectAfterMs: 5000, probe: false, games: 1, comfort: false,
  newGameDelayMs: 0, requireYieldRepeat: false, requireLateUndo: false, undoRace: false,
  observeAtAsk: false, adversary: null, requireKinds: [], holdHook: null,
};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  const next = () => {
    const v = process.argv[++i];
    if (v === undefined) usage(`${a} needs a value`);
    return v;
  };
  switch (a) {
    case '--port': args.port = Number.parseInt(next(), 10); break;
    case '--url': args.url = next(); break;
    case '--timeout': args.timeoutS = Number.parseInt(next(), 10); break;
    case '--log': args.log = next(); break;
    case '--resync-after': args.resyncAfter = Number.parseInt(next(), 10); break;
    case '--quiet': args.quiet = true; break;
    case '--refuse-first-ask': args.refuseFirstAsk = true; break;
    case '--probe': args.probe = true; break;
    // D428: the adversarial seat -- every ask answered first with illegal
    // answers that must be refused, every input class probed once a turn with
    // an act the engine must refuse; tools/adversary/ has the rules.
    case '--adversary': args.adversary = next(); break;
    // D429: park on each new decision while an outside check runs (see the header).
    case '--hold-hook': args.holdHook = next(); break;
    case '--require-kinds': args.requireKinds = next().split(',').filter((k) => k !== ''); break;
    // M6, protocol amendment M38. After each `over` this seat sends
    // `act: newGame {mode}` and plays on, exactly as AutoTransport does: nothing
    // in the bridge starts a game, so a multi-game session is a CLIENT
    // behaviour. `mode` is read off the frame — `matchOver:false` is the middle
    // of a match and continues it, `matchOver:true` needs a restart.
    case '--games': args.games = Number.parseInt(next(), 10); break;
    // M6. The five comfort acts, each sent once and each checked for its
    // EFFECT in a later `state` -- see comfortStep().
    case '--comfort': args.comfort = true; break;
    // M6 verification fix. How long to SIT STILL, connected, after an `over`
    // before asking for the next game. The default is 0 -- every gate step is
    // unchanged -- and a non-zero value is the only thing in the repo that
    // measures the bridge's end-of-game grace: both of MtgTable's post-`over`
    // waits used to be a flat 30 s wall clock that ran whether or not a client
    // was attached, so a person reading the final board for 31 seconds lost the
    // session. Pass more than 30000 and a fixed bridge still plays the next
    // game; a bridge with the fuse closes the socket first (code 1000) and this
    // client exits 6, "socket closed before `over`".
    case '--new-game-delay-ms': args.newGameDelayMs = Number.parseInt(next(), 10); break;
    // M6 verification fix, the behavioural half of auto-yield. `--comfort`
    // ALWAYS fails a run in which the yielded key came back to the top of the
    // stack and the engine asked this seat to act anyway; this flag additionally
    // fails a run in which it never came back at all, i.e. one where the
    // assertion had nothing to bite on. It needs a deck whose key ability
    // repeats on its own -- decks/yield-probe.dck, 22 Thallids, one mandatory
    // upkeep trigger each.
    case '--require-yield-repeat': args.requireYieldRepeat = true; break;
    // D136, protocol amendment M48. `--comfort` sends a LATE undo -- on the
    // first `state` that offers one, which is the moment the mana payment's
    // stop() has left the engine running (held open by the server's
    // MTGTABLE_HOLD_UNDO_WINDOW_MS in gate step 10g) -- and this flag fails the
    // run (exit 7) unless the bridge answered it `notice {title:"Not now"}`.
    case '--require-late-undo': args.requireLateUndo = true; break;
    // D136's reproduction on its own: see the header.
    case '--undo-race': args.undoRace = true; break;
    // D291: an observer's catch-up of an open ask, held (see the header).
    case '--observe-at-ask': args.observeAtAsk = true; break;
    case '--reconnect-after': args.reconnectAfterMs = Number.parseInt(next(), 10); break;
    case '--help': case '-h': usage(null); break;
    default: usage(`unknown argument ${JSON.stringify(a)}`);
  }
}
if (!Number.isFinite(args.port) || args.port <= 0) usage('--port must be a positive integer');
if (!Number.isFinite(args.timeoutS) || args.timeoutS <= 0) usage('--timeout must be a positive integer');
if (!Number.isFinite(args.reconnectAfterMs) || args.reconnectAfterMs < 0) usage('--reconnect-after must be a non-negative integer');
if (!Number.isFinite(args.games) || args.games <= 0) usage('--games must be a positive integer');
if (!Number.isFinite(args.newGameDelayMs) || args.newGameDelayMs < 0) usage('--new-game-delay-ms must be a non-negative integer');
if (args.observeAtAsk && args.refuseFirstAsk) usage('--observe-at-ask and --refuse-first-ask both take the first ask; pass one');
const URL_ = args.url ?? `ws://127.0.0.1:${args.port}/ws`;
if (args.adversary !== null && (args.refuseFirstAsk || args.observeAtAsk)) usage('--adversary takes every ask; it does not combine with --refuse-first-ask or --observe-at-ask');

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

const started = Date.now();

function say(line) {
  if (!args.quiet) process.stderr.write(`[ws-auto ${String(Date.now() - started).padStart(6)}ms] ${line}\n`);
}

/**
 * The frame log (§8), written from the client's side of the wire.
 *
 * Line 0 is a §8.1 session header built from `hello_ok`, so the file parses with
 * `web/src/transport/replay.ts` and replays through the real reducer. Frames
 * that arrive before the handshake are held and written straight after it —
 * amendment M9's rule, for the same reason: a reader identifies line 0 by
 * position, so a file that begins with a frame is worse than no file.
 *
 * `decks` is `[]` and that is honest: a client is never told the deck paths, and
 * inventing entries would put a shape on disk that no bridge produced.
 * `recordedBy: "client"` is the flag `tools/check-redaction.mjs` reads to know
 * that a verbatim re-delivery and a forward gap in this file are amendment M10
 * and not a dropped frame.
 */
let logStream = null;
let headerWritten = false;
const heldLines = [];
/** Every log file this run wrote, in order — one per game (amendment M38). */
const logPaths = [];

/**
 * Game 1 writes `--log` as given; game *n* writes `<stem>-g<n><ext>` beside it.
 *
 * One file per game, mirroring the bridge: line 0 of a log is its session
 * header, and a second header in the middle of a file is not a frame. It also
 * keeps every existing assertion true — one header, one `over`, `over` last —
 * for a session that now plays several games.
 */
function logPathFor(n) {
  if (n <= 1) return args.log;
  const ext = extname(args.log);
  return `${args.log.slice(0, args.log.length - ext.length)}-g${n}${ext}`;
}

function openLog(n) {
  if (args.log === null) return;
  const path = logPathFor(n);
  mkdirSync(dirname(path), { recursive: true });
  logStream = createWriteStream(path, { flags: 'w' });
  headerWritten = false;
  heldLines.length = 0;
  logPaths.push(path);
}

openLog(1);

function writeLine(object) {
  if (logStream === null) return;
  const line = `${JSON.stringify(object)}\n`;
  if (!headerWritten) heldLines.push(line);
  else logStream.write(line);
}

function writeHeader(hello) {
  if (logStream === null || headerWritten) return;
  logStream.write(`${JSON.stringify({
    v: PROTOCOL_VERSION,
    kind: 'session',
    gameId: hello.gameId ?? 'unknown',
    startedAt: new Date(started).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    seed: hello.seed ?? null,
    forgeVersion: hello.forgeVersion ?? '',
    forgeJarSha256: hello.forgeJarSha256 ?? '',
    seat: typeof hello.you === 'number' ? hello.you : 0,
    transport: 'ws',
    // §8.1: this file is a CLIENT's view of the stream, not the bridge's own
    // record of it. `tools/check-redaction.mjs` reads this key and relaxes the
    // seq rule ALONE: a client legitimately sees a verbatim re-delivery (a
    // resync, a reconnect) and real forward gaps (the frames it was not
    // connected for), both amendment M10. Every content assertion is unchanged.
    recordedBy: 'client',
    decks: [],
  })}\n`);
  headerWritten = true;
  for (const line of heldLines) logStream.write(line);
  heldLines.length = 0;
}

// ---------------------------------------------------------------------------
// State the policy needs — and nothing else
// ---------------------------------------------------------------------------

const stats = { in: 0, out: 0, acts: 0, answers: 0, states: 0, inputs: 0, notices: 0, asks: 0 };
/** The two acts `--probe` exists to send; counted so a run SAYS whether it sent them. */
const probeActs = { useMana: 0, clickAbility: 0 };
const askKinds = new Set();
/** §2.1 (M44) — the last `hello_ok.match` seen, for the summary line. */
let matchSeen = null;
/** askId → true, so a second answer for one ask is impossible by construction (§2.3). */
const answered = new Map();

let me = null;
/** D428: the last `state` body, for the adversary's input probes. */
let lastStateBody = null;
/** D428: the adversarial seat, when --adversary is given (`answer`, `act` and `say` are hoisted). */
let adv = null;
/** D428: `${turn}:${cardId}` -- the permanents the adversary's policy has clicked this turn. */
const advClicked = new Set();
if (args.adversary !== null) adv = createAdversary({ answer, act: (a, e) => act(a, e), say });
/** D429: --hold-hook's function, the seqs of the last state and input, and whether a hold is running. */
const holdHook = args.holdHook === null ? null : (await import(pathToFileURL(resolvePath(args.holdHook)).href)).default;
let lastStateSeq = 0;
let lastInputSeq = 0;
let holdKey = '';
let holdPending = false;
let myHand = [];
let myLands = [];
/** Untapped lands this seat controls on the battlefield -- what `--comfort`'s undo step taps for mana. */
let myUntappedLands = [];
/** The last `state.undo` seen ({can, depth}), or null: what a retried `undo` is re-sent against. */
let lastUndo = null;
/**
 * The last act this client sent that the bridge guards (D136: `undo`, `useMana`),
 * as the step that sent it -- so a `notice {title:"Not now"}` (amendment M48),
 * which arrives a millisecond after the act it refuses, is attributed to it.
 */
let guardedAct = null;
let myPriority = false;
let myTurn = false;
let myMainPhase = false;
let stackEmpty = true;
/** §3.1 — always all six keys; the M5 `useMana` probe spends what is in here. */
let myPool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
/** AutoTransport.askPromptsSeen — how often each confirm / numeric-text prompt has been answered. */
const askPromptsSeen = new Map();
/**
 * AutoTransport.askRepeats / ASK_REPEAT_CAP — how many asks carrying each
 * `kind|prompt|title` have arrived since the game last made visible progress.
 * STUCK_MS is a *silence* watchdog and an ask loop is not silent (the engine
 * re-asks the instant we answer), so this is the other half of the guard.
 */
const askRepeats = new Map();
const ASK_REPEAT_CAP = 20;
/** AutoTransport.lastProgressKey — `turn|phase|activePlayer` of the last snapshot. */
let lastProgressKey = '';

/** How many `over` frames have arrived, and the gameId of each game seen (M6). */
let gamesSeen = 0;
/**
 * D114: has THIS game shown a `state` whose `gameOver` is set? An `over`
 * without one is amendment M11's pre-input concede, which this client never
 * sends -- so here it is a game ended from outside (exit 8).
 */
let gameOverStateSeen = false;
const gameIds = [];

let pendingInput = null;
/**
 * How many `input` frames this GAME has delivered (amendment M42's client half).
 *
 * Per game, because the bridge's own `inputSeen` is reset per game
 * (`WireGuiGame.resetForGame`) and a retry armed in game 1 must not be satisfied
 * by game 1's own frames after `nextGame()` has moved on. It counts frames
 * rather than tracking a boolean because the retry below needs "a NEW input
 * arrived since the notice", not "an input has ever arrived".
 */
let inputsThisGame = 0;
/** The `--comfort` step the most recent `act` belonged to, or null. See act(). */
let lastComfortStep = null;
let lastSeenInputKey = '';
const tries = new Map();
let lastActivity = Date.now();
let lastFrameAt = Date.now();
let lastDecisionAt = Date.now();
let conceded = false;
let concededAt = 0;
let over = false;
let seq = 0;
let socket = null;
let opened = false;
let failure = null;
/** --refuse-first-ask: the askId we dropped the socket on, or null. */
let refusedAskId = null;
/** True between our own deliberate close and the reconnect that follows it. */
let reconnectPending = false;
/**
 * --observe-at-ask (D291): the raw text of the frame being handled, and of the
 * last `hello_ok` and `state` this seat was sent -- the bytes an observer's
 * catch-up must repeat. `observe` is null until the first ask, then
 * {askId, verdict: 'pending' | 'ok' | <why not>}; while it is pending the policy
 * sends nothing, so the game thread stays parked on the ask.
 */
let rawFrame = '';
const seatRaw = { hello_ok: null, state: null };
let observe = null;

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

function send(type, body) {
  if (socket === null || socket.readyState !== 1) return;
  seq += 1;
  const frame = { v: PROTOCOL_VERSION, seq, t: Date.now(), type, body };
  socket.send(JSON.stringify(frame));
  stats.out += 1;
  writeLine({ ...frame, dir: 'c2s' });
}

/**
 * Send one `act`.
 *
 * `step` names the `--comfort` step this act belongs to, or is null for an
 * ordinary policy act. It exists so that a `notice {title:"Not yet"}` — the
 * bridge saying it dropped the act because the engine has not asked this seat
 * anything yet (§2.1 amendment M42) — can UN-SEND exactly the step that was
 * dropped, rather than guessing from the act name or failing the run over a
 * frame the bridge told us it threw away.
 */
function act(action, extra = {}, step = null) {
  stats.acts += 1;
  if (action in probeActs) probeActs[action] += 1;
  lastComfortStep = step;
  if (action === 'undo' || action === 'useMana') guardedAct = step ?? action;
  const prompt = pendingInput === null ? '(no input)' : String(pendingInput.prompt ?? '');
  say(`ACT  ${action}${Object.keys(extra).length ? ` ${JSON.stringify(extra)}` : ''}  <- ${JSON.stringify(prompt)}`);
  send('act', { action, ...extra });
}

function answer(askId, kind, prompt, value) {
  if (answered.has(askId)) {
    say(`SKIP second answer for ${askId} (§2.3: exactly one per ask)`);
    return;
  }
  answered.set(askId, true);
  stats.answers += 1;
  say(`ANSW ${kind} ${askId} = ${JSON.stringify(value)}  <- ${JSON.stringify(prompt)}`);
  send('answer', { askId, value });
}

/**
 * One game ended and we want another (M6, `--games N`).
 *
 * Everything below is an id from a game that no longer exists —
 * `HostedMatch.endCurrentGame()` replaces every `PlayerView` and the bridge
 * rebuilds its own caches from `openView` — so the client drops its state here
 * rather than after the new `hello_ok` arrives, and rolls its log to the next
 * file before the first frame of the next game can reach it.
 */
function nextGame(overBody) {
  const mode = overBody.matchOver === false ? 'continue' : 'restart';
  me = null;
  myHand = [];
  myLands = [];
  myUntappedLands = [];
  lastUndo = null;
  guardedAct = null;
  myPriority = false;
  myTurn = false;
  myMainPhase = false;
  stackEmpty = true;
  myPool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  pendingInput = null;
  // The bridge's `inputSeen` is reset per game, so ours is too: a comfort step
  // that spills into game 2 waits for game 2's first input (amendment M42).
  inputsThisGame = 0;
  comfort.retryAfterInput = 0;
  lastComfortStep = null;
  lastSeenInputKey = '';
  tries.clear();
  answered.clear();
  askPromptsSeen.clear();
  askRepeats.clear();
  lastProgressKey = '';
  lastActivity = Date.now();
  lastFrameAt = Date.now();
  // Roll FIRST, then send: game n's file must end with its `over` (§8.4), so
  // the act that asks for game n+1 belongs at the head of game n+1's file, held
  // until its header the way amendment M9 holds any early frame. The bridge
  // writes this act to neither file, and says so on stderr instead.
  openLog(gamesSeen + 1);
  if (args.newGameDelayMs > 0) {
    // The deliberate pause (`--new-game-delay-ms`). The socket stays OPEN and
    // this client sends nothing at all: that is the whole measurement. The
    // watchdog is fed so its own quiet-stream check does not fire in the gap.
    say(`sitting still for ${args.newGameDelayMs} ms, connected and silent, before newGame {${mode}}`);
    const keepAlive = setInterval(() => { lastActivity = Date.now(); lastFrameAt = Date.now(); }, 1000);
    setTimeout(() => {
      clearInterval(keepAlive);
      if (over || failure !== null) return;
      say(`newGame {${mode}} — asking for game ${gamesSeen + 1} of ${args.games}`
        + ` after ${args.newGameDelayMs} ms of silence`);
      act('newGame', { mode });
    }, args.newGameDelayMs);
    return;
  }
  say(`newGame {${mode}} — asking for game ${gamesSeen + 1} of ${args.games}`);
  act('newGame', { mode });
}

function fail(message, code = 3) {
  if (failure !== null) return;
  failure = { message, code };
  say(`FAIL ${message}`);
  finish();
}

// ---------------------------------------------------------------------------
// Receiving
// ---------------------------------------------------------------------------

function onFrame(text) {
  let frame;
  try {
    frame = JSON.parse(text);
  } catch (err) {
    fail(`frame is not valid JSON: ${String(err)}`);
    return;
  }
  if (frame === null || typeof frame !== 'object' || Array.isArray(frame)) {
    fail('frame is not a §1 envelope object');
    return;
  }
  // §1 — the reducer throws on a v mismatch or an unknown type, and so does this.
  if (frame.v !== PROTOCOL_VERSION) {
    fail(`protocol major mismatch: frame v=${JSON.stringify(frame.v)}, this client speaks v=1`);
    return;
  }
  if (typeof frame.type !== 'string' || !FRAME_TYPES.has(frame.type)) {
    fail(`unknown frame type ${JSON.stringify(frame.type)} — not one of the ten in §2`);
    return;
  }
  if (frame.body === null || typeof frame.body !== 'object' || Array.isArray(frame.body)) {
    fail(`frame ${frame.type} has no body object (§1: always an object)`);
    return;
  }

  stats.in += 1;
  lastFrameAt = Date.now();
  writeLine({ ...frame, dir: 's2c' });
  rawFrame = text;
  if (frame.type === 'hello_ok' || frame.type === 'state') seatRaw[frame.type] = text;

  const body = frame.body;
  adv?.onFrame(frame);
  switch (frame.type) {
    case 'hello_ok':
      me = typeof body.you === 'number' ? body.you : null;
      // §2.1 / amendment M38: one `hello_ok` per GAME, and a new one invalidates
      // every id this client cached. A re-delivered one (a resync, a reconnect)
      // carries the SAME gameId and is not a new game — that is the whole
      // difference, and it is why the check is on the id and not on the arrival.
      if (gameIds.length > 0 && body.gameId !== gameIds[gameIds.length - 1]) {
        gameIds.push(String(body.gameId));
        say(`NEW GAME ${gameIds.length}: ${gameIds[gameIds.length - 2]} -> ${String(body.gameId)}`);
      } else if (gameIds.length === 0) {
        gameIds.push(String(body.gameId));
      }
      writeHeader(body);
      say(`HELLO game=${String(body.gameId)} seat=${String(me)} seed=${String(body.seed)} ` +
        `forge=${String(body.forgeVersion)} players=${(body.players ?? []).map((p) => p.name).join(' vs ')}`);
      if (Array.isArray(body.unsupportedCards) && body.unsupportedCards.length > 0) {
        say(`unsupportedCards: ${body.unsupportedCards.join(', ')}`);
      }
      // §2.1, amendment M44 -- what this match is. Optional on the wire (every
      // recording before 2026-09-27 lacks it), so absence is said and not
      // failed; present, the AI's deck must be a NAME and a COUNT and nothing
      // else, because this is the browser's code path and a path or a list
      // here would be the opponent's decklist on the client's screen.
      if (body.match === undefined || body.match === null) {
        say('match: (not on this hello_ok -- a bridge older than amendment M44)');
      } else {
        const m = body.match;
        const aiKeys = Object.keys(m.aiDeck ?? {}).sort().join(',');
        if (aiKeys !== 'cards,name') {
          fail(`hello_ok.match.aiDeck carries {${aiKeys}} -- the AI's deck is {name, cards} and ` +
            'nothing else (§2.1, amendment M44; hard rule 8)');
        }
        say(`match: you "${String(m.yourDeck?.name)}" (${String(m.yourDeck?.cards)}) vs AI ` +
          `"${String(m.aiDeck.name)}" (${String(m.aiDeck.cards)}), AI profile ${String(m.aiProfile)}, ` +
          `${String(m.games)} game(s)`);
        matchSeen = m;
      }
      lastActivity = Date.now();
      break;
    case 'state':
      stats.states += 1;
      lastStateSeq = frame.seq;
      onState(body);
      lastActivity = Date.now();
      break;
    case 'input': {
      stats.inputs += 1;
      inputsThisGame += 1;
      lastInputSeq = frame.seq;
      pendingInput = body;
      // --comfort 3b: an `input` that asks this seat to ACT while the yielded
      // key sits on TOP of the stack is the engine NOT consulting the store.
      // `buttons.ok.enabled` is the typed field for "there is something to
      // press" (never a label match -- CLAUDE.md, M5 convention 4).
      // `repeatSeen > 0` excludes the occurrence the yield was SET on: the
      // engine was already parked in an InputPassPriority for it and writing the
      // store does not retract an input already on screen. `setYieldGame`
      // excludes every later game, whose handles are new (amendment M38).
      if (args.comfort && comfort.repeatOnStack && comfort.repeatSeen > 0
          && gamesSeen === comfort.setYieldGame
          && body.buttons?.ok?.enabled === true) {
        comfort.repeatPrompts += 1;
      }
      // AutoTransport: `awaitNextInput()` re-pushes the same prompt every 250 ms
      // while the engine thinks, so an identical input frame is NOT activity —
      // otherwise the settle detector never fires and the policy acts only when
      // the step cap forces it.
      const key = inputKey(body);
      if (key !== lastSeenInputKey) {
        lastSeenInputKey = key;
        lastActivity = Date.now();
      }
      break;
    }
    case 'ask':
      stats.asks += 1;
      onAsk(body);
      lastActivity = Date.now();
      break;
    case 'notice':
      stats.notices += 1;
      say(`NOTE ${String(body.level)} ${JSON.stringify(body.title)} ${JSON.stringify(body.text)}`);
      // §2.1 amendment M42: "Not yet" is `applyAct`'s pre-input guard saying it
      // DROPPED the act. A comfort step whose act was dropped has not been
      // sent — so un-send it and try again after the next real `input`.
      if (args.comfort && String(body.title) === 'Not yet') comfortNotYet();
      // Amendment M48 (D136): "Not now" is the bridge REFUSING an act that
      // writes the engine directly (undo, useMana) because the engine was not
      // parked on this seat. The act had no effect at all.
      if (String(body.title) === 'Not now') onNotNow();
      // Step 2b's float click raced its own stale view of which land is
      // untapped (the state it read predates the payment that tapped it): let
      // the next state choose again rather than waiting for the next turn.
      if (args.comfort && String(body.title) === 'Not selectable' && lastComfortStep === 'undoFloat'
          && !comfort.undoSent) {
        comfort.undoFloatSent = false;
        comfortHoldUntil = 0;
      }
      lastActivity = Date.now();
      break;
    case 'over':
      gamesSeen += 1;
      say(`OVER #${gamesSeen} winner=${String(body.winner)} reason=${String(body.reason)} matchOver=${String(body.matchOver)}`);
      if (!gameOverStateSeen) {
        fail(`over #${gamesSeen} arrived with no \`state\` carrying \`gameOver\` in front of it: the game `
          + `was ended from outside Forge's own game-over -- the previous game's late finishGame() `
          + `(D114) or an engine crash (see the server's stderr)`, 8);
        break;
      }
      gameOverStateSeen = false;
      if (gamesSeen >= args.games) {
        over = true;
        finish();
      } else {
        nextGame(body);
      }
      break;
    case 'ping':
      send('pong', {});
      break;
    default:
      break;
  }
}

/** Remember just enough of the board to answer "is it my turn, and what is in my hand". */
function onState(body) {
  lastStateBody = body;
  if (body.gameOver !== null && body.gameOver !== undefined) gameOverStateSeen = true;
  // PROGRESS (AutoTransport.progressKey). A repeated prompt only means "stuck"
  // while nothing else has moved; a turn/phase change clears both counters, so
  // the alternating confirm answer and the repeat ceiling start again.
  const progress = `${String(body.turn)}|${String(body.phase)}|${String(body.activePlayer)}`;
  if (progress !== lastProgressKey) {
    lastProgressKey = progress;
    askPromptsSeen.clear();
    askRepeats.clear();
  }
  myPriority = me !== null && body.priority === me;
  myTurn = me !== null && body.activePlayer === me;
  myMainPhase = body.phase === 'MAIN1' || body.phase === 'MAIN2';
  stackEmpty = !Array.isArray(body.stack) || body.stack.length === 0;
  myHand = [];
  myLands = [];
  myPool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  for (const player of body.players ?? []) {
    if (me === null || player.id !== me) continue;
    for (const c of POOL_COLORS) {
      const n = player.manaPool?.[c];
      if (typeof n === 'number') myPool[c] = n;
    }
    for (const card of player.zones?.hand?.cards ?? []) {
      // §3.3: a five-key stub has `hidden: true` and no type line at all. Your
      // own hand is never one, but a control-change effect can put someone
      // else's card there, and a policy must not click at a shape it cannot see.
      if (card.hidden === true || typeof card.id !== 'number') continue;
      myHand.push(card.id);
      if (String(card.types ?? '').includes('Land')) myLands.push(card.id);
    }
    for (const card of player.zones?.battlefield?.cards ?? []) {
      if (card.hidden === true || typeof card.id !== 'number') continue;
      if (card.controller !== me || card.tapped === true) continue;
      if (String(card.types ?? '').includes('Land')) myUntappedLands.push(card.id);
    }
  }
  lastUndo = body.undo && typeof body.undo === 'object' ? body.undo : null;
  if (args.undoRace) undoRaceStep(body);
  if (args.comfort) comfortStep(body);
}

// ---------------------------------------------------------------------------
// D136: the guarded acts, and --undo-race
// ---------------------------------------------------------------------------

/** How long a guarded act waits for its "Not now" before this client says it was applied. */
const NOT_NOW_WAIT_MS = 2500;

/**
 * `--undo-race` (D136's reproduction): the undo, the verdict, the concession.
 *
 * `undo.can` is the engine's own gate (priority is mine and the undo stack is
 * mine), so nothing here guesses. The FIRST state that offers an undo is, with
 * the yield probe's one-mana Thallids and the policy's `Auto` payment, the one
 * the payment's `stop()` flushes after it has removed the input -- the engine is
 * running, not parked -- and the server's `MTGTABLE_HOLD_UNDO_WINDOW_MS` holds
 * it there. The act goes out on that state, at once, not after a settle.
 */
const race = { sent: false, depth: 0, sentAt: 0, verdict: null };

function undoRaceStep(body) {
  if (race.sent || conceded) return;
  if (body.undo?.can === true && typeof body.undo.depth === 'number' && body.undo.depth > 0) {
    race.sent = true;
    race.depth = body.undo.depth;
    race.sentAt = Date.now();
    say(`UNDO RACE: the first state that offers an undo (depth ${race.depth}, phase ${String(body.phase)}, `
      + `stack ${Array.isArray(body.stack) ? body.stack.length : 0}) -- sending it now`);
    act('undo', {}, 'undoRace');
  }
}

function undoRaceVerdict(verdict) {
  if (race.verdict !== null) return;
  race.verdict = verdict;
  say(verdict === 'not-now'
    ? 'UNDO RACE: refused with "Not now" -- the bridge did not touch the engine (D136)'
    : `UNDO RACE: NO "Not now" within ${NOT_NOW_WAIT_MS} ms -- the bridge APPLIED the undo while the `
      + 'engine was running (the race D136 closes)');
  if (!conceded) {
    conceded = true;
    concededAt = Date.now();
    act('concede');
  }
}

/** A `notice {title:"Not now"}` (amendment M48): the guarded act we sent last was refused. */
function onNotNow() {
  const step = guardedAct;
  guardedAct = null;
  if (step === 'undoRace') {
    undoRaceVerdict('not-now');
    return;
  }
  if (!args.comfort) return;
  if (step === 'undoLate') {
    comfortLateVerdict('not-now');
  } else if (step === 'undo' && !comfort.undoSeen) {
    // The effect step raced the engine's own re-park (Game-0 flushes the state
    // that offers the undo BEFORE it parks, D136 condition 8). Nothing was
    // undone, so un-send it and try again shortly: the engine is parked and
    // will not send another frame to retry on.
    comfort.undoSent = false;
    comfort.undoNotNow += 1;
    comfort.undoRetryAt = Date.now() + 150;
    comfortHoldUntil = Date.now() + 1500;
  }
}

// ---------------------------------------------------------------------------
// --comfort: M6's five acts, each with the EFFECT it is supposed to have
// ---------------------------------------------------------------------------

/**
 * The M6 probe (`--comfort`).
 *
 * `--probe` exists because a typed act with no client that sends it is an act
 * nothing proves; this is the same argument for M6's five. Each step sends one
 * act **and then looks for its effect in a later `state`** — a phase that was
 * not a stop becoming one, `state.yield` turning on and back off, the undo
 * depth falling, `stack[].yielded` turning `"yes"` — and the run fails if an act
 * went out and nothing moved. A count alone would still pass if the client sent
 * the act and the bridge dropped it (CLAUDE.md, M5 convention 6).
 *
 * While a step is waiting for its effect the ordinary policy is HELD: the
 * policy's own rule is "press the enabled button", and an enabled Cancel is
 * exactly how a yield is cancelled, so without the hold the policy would cancel
 * the yield before the snapshot that shows it was ever running.
 */
const comfort = {
  stopSent: false, stopSeen: false,
  undoSent: false, undoDepth: 0, undoSeen: false,
  // D136 (amendment M48). The LATE undo: sent on the first state that offers
  // one, which is the payment's stop() flush -- the engine running -- and
  // answered, by a fixed bridge, `notice {title:"Not now"}`. Its verdict is
  // 'not-now' or 'applied' (no notice within NOT_NOW_WAIT_MS).
  lateUndoSent: false, lateUndoAt: 0, lateUndoVerdict: null,
  // The EFFECT undo floats mana first -- a click on one of this seat's own
  // untapped lands while it holds priority with the stack empty, which Forge
  // answers with the land's mana ability -- so the undo lands while the engine
  // is parked on the very InputPassPriority that offers it. `undoNotNow` counts
  // the times the bridge refused it anyway (the state that offers the undo is
  // flushed by Game-0 just BEFORE it parks) and it was re-sent.
  undoFloatSent: false, undoFloatTurn: null, undoFloats: 0, undoNotNow: 0, undoRetryAt: 0,
  yieldSent: false, yieldSeen: false, cancelSent: false, cancelSeen: false,
  setYieldSent: false, setYieldKey: null, setYieldSeen: false, setYieldWasAbility: null,
  setYieldWaited: 0,
  // WHICH GAME the yield was set in (0-based, i.e. `gamesSeen` at the time).
  // A handle is interned for the life of ONE game -- `openView` rebuilds the
  // bridge's whole yield-handle table and `endCurrentGame()` empties the human
  // controllers with the store in them (amendment M38) -- so "y2" in game 2 is
  // a DIFFERENT stack item that was never yielded on. Measuring across the
  // boundary is how this probe first reported 6 repeats and 8 prompts on a run
  // whose actual game-1 numbers were 4 repeats and 0 prompts.
  setYieldGame: -1,
  // The BEHAVIOURAL half of auto-yield, and it is now ASSERTED (M6 verification
  // finding). Setting the yield is proven at the store level by
  // `yielded:"yes"`; what the store is FOR is
  // `PlayerControllerHuman.skipsPromptForStackOrPhase`, i.e. a LATER occurrence
  // of the same key resolving without asking this seat.
  //
  // The first version of this could only MEASURE it, because no seed could be
  // made to guarantee a second occurrence and an assertion that fires only when
  // the engine happens to cooperate is worse than a number. `decks/yield-probe.dck`
  // is what removed that excuse: 22 Thallids, each with a MANDATORY upkeep
  // trigger, so the same yieldKey returns to the top of the stack every turn
  // (measured at seed 13: one handle on the stack in 21 separate `state`
  // frames). So the rule is now in two halves --
  //   * always: `repeatSeen > 0` and `repeatPrompts > 0` is a FAILURE, on any
  //     deck. The engine consulted the store and asked anyway.
  //   * `--require-yield-repeat`: `repeatSeen === 0` is also a failure, for the
  //     run that is supposed to produce a repeat.
  repeatSeen: 0, repeatOnStack: false, repeatPrompts: 0,
  passSent: false,
  // Amendment M42's client half. `retries` is how many comfort acts the bridge
  // answered with `notice {title:"Not yet"}` and this client therefore UN-SENT;
  // `retryAfterInput` is the `inputsThisGame` value one must exceed before the
  // step is allowed to go out again — i.e. "wait for an input that arrived
  // after the notice". Both are printed in the summary line: a retry is not a
  // failure, but a run that needed one has raced something and should say so.
  retries: 0, retryAfterInput: 0,
};
let comfortHoldUntil = 0;

/**
 * The bridge dropped a comfort act with `notice {title:"Not yet"}` — un-send it.
 *
 * `applyAct` drops every act except `concede` until `inputSeen` is armed, and
 * that flag is armed by Forge alone. A dropped act is an act that never
 * happened, so the honest thing is to clear the step's `*Sent` flag and let
 * `comfortStep()` raise it again on a later `state` — after a **real** `input`,
 * which since amendment M42 is the only kind the bridge ever sends.
 *
 * This is the belt to the bridge's braces. With M42 in place `pendingInput` is
 * null until the engine has asked and this path should never run at all; it is
 * kept because the alternative is a probe whose verdict on a dropped act is
 * `setPhaseStop (sent, no effect seen)` — a true statement about a dropped act
 * and a false alarm about the bridge, which is exactly how step 10g failed on
 * 2026-09-12.
 */
/** The `seen` flag of each step, so a retry can never un-send a proven one. */
const COMFORT_SEEN = {
  setPhaseStop: () => comfort.stopSeen,
  undo: () => comfort.undoSeen,
  setYield: () => comfort.setYieldSeen,
  yieldTo: () => comfort.yieldSeen,
  buttonCancel: () => comfort.cancelSeen,
  passPriority: () => comfort.passSent,        // a count, not an effect
};

function comfortNotYet() {
  const step = lastComfortStep;
  lastComfortStep = null;
  if (step === null) return;                   // an ordinary policy act, not ours
  // Unreachable by argument — the notice arrives ~1 ms after the act and the
  // effect cannot precede the act that causes it — and cheap to state anyway: a
  // retry that cleared a `*Sent` flag whose effect was already seen would turn
  // a green run red by bookkeeping (`[sent=false, seen=true]` reads as "never
  // reached"). If it ever fires, the notice belonged to something else.
  if (COMFORT_SEEN[step]?.() === true) {
    say(`COMFORT: a "Not yet" followed ${step}, whose effect was already seen — not un-sent`);
    return;
  }
  switch (step) {
    case 'setPhaseStop':
      comfort.stopSent = false;
      break;
    case 'undo':
      comfort.undoSent = false;
      comfort.undoDepth = 0;
      break;
    case 'setYield':
      comfort.setYieldSent = false;
      comfort.setYieldKey = null;
      comfort.setYieldGame = -1;
      comfort.setYieldWasAbility = null;
      break;
    case 'yieldTo':
      comfort.yieldSent = false;
      break;
    case 'buttonCancel':
      // The cancel is raised from the `yieldSeen` edge, so clearing `cancelSent`
      // alone would leave no branch that can fire again: `yieldSeen` has to go
      // back too, and `state.yield` is still non-null (the cancel was dropped),
      // so the edge re-fires on the next state.
      comfort.cancelSent = false;
      comfort.yieldSeen = false;
      break;
    case 'passPriority':
      comfort.passSent = false;
      break;
    default:
      return;
  }
  comfort.retries += 1;
  comfort.retryAfterInput = inputsThisGame;    // a NEW input must arrive first
  comfortHoldUntil = 0;                        // nothing to wait for; it never landed
  say(`COMFORT retry: ${step} was dropped ("Not yet" — the engine had not asked this seat `
    + `anything yet), un-sent; it goes out again after the next input (retries=${comfort.retries})`);
}

/** The phase this probe turns into a stop: not one by default, for either seat. */
const COMFORT_STOP_PHASE = 'UPKEEP';

function comfortStep(body) {
  // NOT BEFORE THE FIRST `input`. `WireGuiGame.applyAct` drops every act (except
  // `concede`) until `inputSeen` is armed -- "the game has not asked for
  // anything yet", protocol §2.4 -- and the FIRST `state` of a game is pushed
  // before the engine has asked this seat anything. A probe that fires on that
  // frame races the engine for the first `input` and loses under load: the act
  // came back as `notice {title:"Not yet"}` and the step then reported
  // `setPhaseStop=NO EFFECT`, which is a true statement about a dropped act and
  // a false alarm about the bridge.
  //
  // `pendingInput` and not `stats.inputs`, because `inputSeen` is reset PER GAME
  // (`WireGuiGame.resetForGame`) and `nextGame()` below clears `pendingInput` to
  // match: a comfort step that spills into game 2 has to wait for game 2's first
  // input, not for the whole match's first one.
  //
  // **That guard was not enough on its own, and this is the second half of the
  // 2026-09-12 fix.** `pendingInput` was armed by the input frame the bridge
  // re-delivered ON CONNECT, which before any engine push was the EMPTY
  // pre-engine struct -- so the client's first `input` was not a truthful proxy
  // for "the engine has asked this seat something" and the act still went out
  // 128 ms early (var/ws-auto-3g.jsonl). The bridge no longer sends that frame
  // at all (amendment **M42**), which is the real fix; `retryAfterInput` is the
  // client's own recovery, armed by comfortNotYet() when a `Not yet` notice
  // says an act was dropped anyway -- a bridge that regresses, a mid-game
  // reconnect, an older server.
  if (pendingInput === null) return;
  if (inputsThisGame <= comfort.retryAfterInput) return;
  const mine = (body.players ?? []).find((p) => p.id === me);
  const hold = (ms) => { comfortHoldUntil = Date.now() + ms; };

  // 1. setPhaseStop {phase, turn:"own", stop:true} -> players[me].phaseStops.own
  //    UPKEEP is `false` in FPref.PHASES_HUMAN, so seeing it in `own` can only
  //    be this act's doing.
  if (mine?.phaseStops) {
    if (!comfort.stopSent) {
      if (mine.phaseStops.own.includes(COMFORT_STOP_PHASE)) {
        fail(`${COMFORT_STOP_PHASE} is already a stop before the act — the probe proves nothing`);
        return;
      }
      comfort.stopSent = true;
      act('setPhaseStop', { phase: COMFORT_STOP_PHASE, turn: 'own', stop: true }, 'setPhaseStop');
      hold(400);
    } else if (!comfort.stopSeen && mine.phaseStops.own.includes(COMFORT_STOP_PHASE)) {
      comfort.stopSeen = true;
      say(`COMFORT setPhaseStop: ${COMFORT_STOP_PHASE} is now a stop on my own turn`);
    }
  }

  // 2a. THE LATE UNDO (D136, protocol amendment M48). On the FIRST state that
  //     offers an undo -- with the yield probe's Thallids and the policy's Auto
  //     payment that is the state the payment's stop() flushes after it has
  //     removed the input, i.e. while the engine is RUNNING towards
  //     MagicStack.add -- send `undo` at once. That is the act that crashed
  //     Game-0 in the story branch's gate run; a fixed bridge refuses it with
  //     `notice {title:"Not now"}` and touches nothing. The gate's server holds
  //     that window open (MTGTABLE_HOLD_UNDO_WINDOW_MS) and passes
  //     --require-late-undo, so the refusal is asserted every run.
  if (!comfort.lateUndoSent && body.undo?.can === true && typeof body.undo.depth === 'number'
      && body.undo.depth > 0) {
    comfort.lateUndoSent = true;
    comfort.lateUndoAt = Date.now();
    say(`COMFORT late undo: the first state that offers one (depth ${body.undo.depth}) -- sending it now`);
    act('undo', {}, 'undoLate');
  }

  // 2b. undo -> state.undo.depth falls, while the engine is PARKED on this
  //     seat. `can` is the engine's own gate (priority is mine and the undo
  //     stack is mine), so this never guesses. The undo stack holds mana
  //     abilities only (report 11 section 7.1), so the step makes one: it taps
  //     one of its own untapped lands at priority with the stack empty, and
  //     undoes that. Before D136 this step sent its undo on whatever state first
  //     offered one -- the payment window of 2a -- and passed only when the
  //     race happened to fall the right way.
  if (comfort.stopSeen && comfort.lateUndoVerdict !== null && !comfort.undoSeen) {
    if (comfort.undoFloatSent && !comfort.undoSent && body.turn !== comfort.undoFloatTurn) {
      comfort.undoFloatSent = false;         // the float never offered an undo this turn: try again
    }
    const sel = pendingInput?.selectable ?? {};
    const demandsClick = Array.isArray(sel.cardIds) && sel.cardIds.length > 0
      && (pendingInput?.buttons?.ok?.enabled !== true || (typeof sel.min === 'number' && sel.min > 0));
    const poolEmpty = POOL_COLORS.every((c) => myPool[c] === 0);
    if (!comfort.undoFloatSent) {
      if (pendingInput !== null && !demandsClick && myPriority && myMainPhase && stackEmpty && poolEmpty
          && body.undo?.can !== true && myUntappedLands.length > 0 && comfort.undoFloats < 30) {
        comfort.undoFloatSent = true;
        comfort.undoFloats += 1;
        comfort.undoFloatTurn = body.turn;
        say(`COMFORT undo: floating mana from land ${myUntappedLands[0]} so there is something to undo`);
        act('clickCard', { cardId: myUntappedLands[0] }, 'undoFloat');
        hold(1500);
      }
    } else if (!comfort.undoSent && body.undo?.can === true && typeof body.undo.depth === 'number'
               && body.undo.depth > 0) {
      comfort.undoSent = true;
      comfort.undoDepth = body.undo.depth;
      act('undo', {}, 'undo');
      hold(1500);
    } else if (comfort.undoSent && typeof body.undo?.depth === 'number'
               && body.undo.depth < comfort.undoDepth) {
      comfort.undoSeen = true;
      comfortHoldUntil = 0;
      say(`COMFORT undo: depth ${comfort.undoDepth} -> ${body.undo.depth}`
        + ` (${comfort.undoNotNow} "Not now" retr${comfort.undoNotNow === 1 ? 'y' : 'ies'} first)`);
    }
  }

  // 3. setYield {yieldKey, mode:"yes"} -> stack[].yielded === "yes".
  //    PREFER an item with `isAbility: true`. Any keyed item proves the wire,
  //    but `PlayerControllerHuman.setShouldAutoYield` is called with the
  //    controller's `isAbilityScope()` (true on the default
  //    UI_AUTO_DECISION_MODE), which strips the key to its ability portion --
  //    so a yield set on a plain creature SPELL is a key the engine can never
  //    consult again, and the board would not have offered the control there
  //    either. The first version of this probe took the top of the stack
  //    whatever it was and committed a fixture whose proof was exactly that.
  const stack = Array.isArray(body.stack) ? body.stack : [];
  const keyed = stack.filter((si) => typeof si.yieldKey === 'string');
  const abilityItem = [...keyed].reverse().find((si) => si.isAbility === true) ?? null;
  if (!comfort.setYieldSent && keyed.length > 0) {
    // Wait for an ability before settling for a spell: at the gate's seed one
    // arrives well inside the first few turns. The fallback exists so a deck or
    // seed that never raises one still proves the act rather than reporting
    // "never reached".
    comfort.setYieldWaited += 1;
    const pick = abilityItem ?? (comfort.setYieldWaited > 40 ? keyed[keyed.length - 1] : null);
    if (pick !== null) {
      comfort.setYieldSent = true;
      comfort.setYieldKey = pick.yieldKey;
      comfort.setYieldGame = gamesSeen;
      comfort.setYieldWasAbility = pick.isAbility === true;
      act('setYield', { yieldKey: pick.yieldKey, mode: 'yes' }, 'setYield');
      hold(400);
    }
  } else if (comfort.setYieldSent && !comfort.setYieldSeen) {
    for (const item of stack) {
      if (item.yieldKey === comfort.setYieldKey && item.yielded === 'yes') {
        comfort.setYieldSeen = true;
        // The item is on the stack right now, and that occurrence is the one
        // the yield was SET on -- not a repeat. Arm the edge detector as
        // "already on the stack" so 3b counts the NEXT appearance as the first.
        comfort.repeatOnStack = true;
        say(`COMFORT setYield: ${String(item.yieldKey)} now yielded="yes"`
          + ` (isAbility=${String(comfort.setYieldWasAbility)})`);
      }
    }
  }

  // 3b. The behavioural half, ASSERTED in finish() -- see `comfort`.
  //     Every later APPEARANCE of the yielded key on TOP of the stack is
  //     counted, and so is every `input` that asked this seat to act while it
  //     was there. Zero prompts across one or more repeats is the engine
  //     consulting the store; one prompt is the engine NOT consulting it, and
  //     that fails the run. Zero repeats is a fact about the deck and the seed,
  //     and is a failure only under `--require-yield-repeat`.
  if (comfort.setYieldSeen && gamesSeen !== comfort.setYieldGame) {
    // A new game: the handle is dead and so is the store behind it. Stop.
    comfort.repeatOnStack = false;
  } else if (comfort.setYieldSeen) {
    // TOP of the stack, not anywhere on it: report 11 §4.2 --
    // `skipsPromptForStackOrPhase()` is `top.isAbility() &&
    // shouldAutoYield(top.getKey())`, so the store is only ever consulted for
    // the topmost item and a count taken over the whole stack would measure
    // something the engine never reads.
    const top = stack.length > 0 ? stack[stack.length - 1] : null;
    const onTop = top !== null && top.yieldKey === comfort.setYieldKey;
    if (onTop && !comfort.repeatOnStack) comfort.repeatSeen += 1;
    comfort.repeatOnStack = onTop;
  }

  // 4. yieldTo {kind:"endOfTurn"} -> state.yield, then buttonCancel -> null.
  //    Cancelling a yield needs no act of its own and must not get one: Forge's
  //    InputLockUI puts a labelled Cancel on screen for exactly this.
  if (!comfort.yieldSent && comfort.stopSeen && myTurn && myPriority && stackEmpty
      && body.phase === 'MAIN1' && body.yield === null) {
    comfort.yieldSent = true;
    act('yieldTo', { kind: 'endOfTurn' }, 'yieldTo');
    hold(1200);
  } else if (comfort.yieldSent && !comfort.yieldSeen && body.yield !== null
             && body.yield !== undefined) {
    comfort.yieldSeen = true;
    say(`COMFORT yieldTo: state.yield = ${JSON.stringify(body.yield)}`);
    comfort.cancelSent = true;
    act('buttonCancel', {}, 'buttonCancel');
    hold(600);
  } else if (comfort.cancelSent && !comfort.cancelSeen && body.yield === null) {
    comfort.cancelSeen = true;
    say('COMFORT buttonCancel: the yield is cancelled, state.yield = null');
  }

  // 5. passPriority — a no-op unless the engine is on an InputPassPriority, and
  //    that is the point of it (report 11 §4.3): it is the SAFE keyboard pass.
  if (!comfort.passSent && comfort.cancelSeen && myPriority && stackEmpty) {
    comfort.passSent = true;
    act('passPriority', {}, 'passPriority');
  }
}

/** Step 2a's verdict: 'not-now' (the bridge refused it) or 'applied' (no notice came). */
function comfortLateVerdict(verdict) {
  if (comfort.lateUndoVerdict !== null) return;
  comfort.lateUndoVerdict = verdict;
  say(verdict === 'not-now'
    ? 'COMFORT late undo: refused with "Not now" -- the engine was running and the bridge left it alone (D136)'
    : `COMFORT late undo: NO "Not now" within ${NOT_NOW_WAIT_MS} ms -- the bridge applied it`);
}

/**
 * The timers D136 needs, from tick(): a guarded act that drew no "Not now" in
 * NOT_NOW_WAIT_MS was applied; and step 2b's undo, refused because it raced the
 * engine's own re-park, is re-sent -- the engine is parked and sends nothing
 * new to re-send it on.
 */
function guardedActTimers(now) {
  if (args.undoRace && race.sent && race.verdict === null && now - race.sentAt > NOT_NOW_WAIT_MS) {
    undoRaceVerdict('applied');
  }
  if (!args.comfort) return;
  if (comfort.lateUndoSent && comfort.lateUndoVerdict === null && now - comfort.lateUndoAt > NOT_NOW_WAIT_MS) {
    comfortLateVerdict('applied');
  }
  if (comfort.undoRetryAt > 0 && now >= comfort.undoRetryAt) {
    comfort.undoRetryAt = 0;
    if (!comfort.undoSent && !comfort.undoSeen && comfort.undoNotNow <= 20
        && lastUndo?.can === true && typeof lastUndo.depth === 'number' && lastUndo.depth > 0) {
      comfort.undoSent = true;
      comfort.undoDepth = lastUndo.depth;
      act('undo', {}, 'undo');
      comfortHoldUntil = now + 1500;
    }
  }
}

/**
 * What `--comfort` proved, for the summary and for check-all's assertion.
 *
 * `[name, sent, seen, countOnly]`. **Five rows carry a real effect and the
 * sixth does not**, and saying so is the point of the fourth field: a
 * `passPriority` that reaches an engine which is NOT on an `InputPassPriority`
 * is a no-op by design (report 11 §4.3 — it is the *safe* keyboard pass), so
 * there is no field of the next `state` that is uniquely its doing and its
 * "effect" column would otherwise be its own "sent" flag wearing a disguise.
 * It is a count, it is labelled a count, and `docs/evidence/m6-engine.md` §4.5
 * says the same.
 */
function comfortReport() {
  return [
    ['setPhaseStop', comfort.stopSent, comfort.stopSeen, false],
    ['undo', comfort.undoSent, comfort.undoSeen, false],
    ['setYield', comfort.setYieldSent, comfort.setYieldSeen, false],
    ['yieldTo', comfort.yieldSent, comfort.yieldSeen, false],
    ['buttonCancel(yield)', comfort.cancelSent, comfort.cancelSeen, false],
    ['passPriority', comfort.passSent, comfort.passSent, true],
    // D136: only a run that holds the window open (10g) can require this.
    ...(args.requireLateUndo
      ? [['undo(late)', comfort.lateUndoSent, comfort.lateUndoVerdict === 'not-now', false]]
      : []),
  ];
}

/** Everything about an input frame a decision depends on (AutoTransport.key). */
function inputKey(body) {
  const sel = body.selectable ?? {};
  const ok = body.buttons?.ok ?? {};
  const cancel = body.buttons?.cancel ?? {};
  return [
    String(body.prompt ?? ''),
    (sel.cardIds ?? []).join(','),
    `${String(ok.label)}${String(ok.enabled === true)}`,
    `${String(cancel.label)}${String(cancel.enabled === true)}`,
  ].join('|');
}

// ---------------------------------------------------------------------------
// The input policy — AutoTransport.plan / decide, transcribed
// ---------------------------------------------------------------------------

function wantsAttackers(prompt) {
  const p = prompt.toLowerCase();
  return p.includes('to attack') || p.includes('declare attackers');
}

function plan(body) {
  const sel = body.selectable ?? {};
  const cardIds = Array.isArray(sel.cardIds) ? sel.cardIds.filter((n) => typeof n === 'number') : [];
  const selMin = typeof sel.min === 'number' ? sel.min : 0;
  const okOn = body.buttons?.ok?.enabled === true;
  const cancelOn = body.buttons?.cancel?.enabled === true;
  const prompt = String(body.prompt ?? '');
  const out = [];

  // §4.2 read as a policy: a disabled OK with selectable cards means the engine
  // wants a CARD CLICK, and so does any selection with min > 0. Otherwise the
  // button comes first, which is how "never more than min needs" is honoured.
  const mustClick = cardIds.length > 0 && (!okOn || selMin > 0);
  if (mustClick) for (const id of cardIds) out.push(['clickCard', { cardId: id }]);

  // InputAttack does not phrase its prompt as "declare attackers": it says
  // "Select creatures to attack …". Matching the engine's actual words is the
  // difference between a policy that attacks and one that cancels round the same
  // prompt forever.
  if (!mustClick && myTurn && wantsAttackers(prompt)) out.push(['alphaStrike', {}]);

  // "Pay Mana Cost" / an "Auto" OK means InputPayMana is up: the engine wants
  // mana, not another spell. Clicking a hand card there only makes a notice.
  const payingMana = prompt.includes('Pay Mana Cost') || prompt.includes('Pay ');
  if (args.probe && payingMana) {
    // THE `useMana` PROBE (§2.2), AutoTransport.plan transcribed. Forge takes
    // this act only while the current input is an InputPayMana
    // (PlayerControllerHuman.java:2738-2742), and nothing else in the repo sends
    // it from a client — the browser has no control for it at all (PLAN.md M5,
    // "the one real dead end"). Spending the pool BEFORE pressing the engine's
    // own Auto button is also the only way the act can be seen to work: Auto
    // drains the pool for us and proves nothing.
    for (const c of POOL_COLORS) {
      if (myPool[c] > 0) out.push(['useMana', { color: POOL_COLOR_NAMES[c] }]);
    }
  }
  if (adv !== null && !mustClick && !payingMana && myPriority && myMainPhase && stackEmpty) {
    // D428: the adversary needs the engine's menus and cost prompts, so its
    // policy also clicks a permanent `state.activatable` lists (M63) -- once a
    // turn each, or a Carrion Feeder would eat the board.
    for (const e of Array.isArray(lastStateBody?.activatable) ? lastStateBody.activatable : []) {
      const key = `${String(lastStateBody?.turn)}:${String(e.cardId)}`;
      if (typeof e.cardId === 'number' && !advClicked.has(key)) {
        out.push(['clickCard', { cardId: e.cardId }]);
        advClicked.add(key);
        break;
      }
    }
  }
  if (!mustClick && !payingMana && myPriority && myMainPhase && stackEmpty) {
    // Lands first: a land drop is the one play that is always legal, and without
    // it this policy never has mana, never casts, never reaches combat or an ask.
    // Amendment M8 is the whole reason this works: `selectable` is EMPTY here.
    for (const id of myLands) out.push(['clickCard', { cardId: id }]);
    for (const id of myHand) if (!myLands.includes(id)) out.push(['clickCard', { cardId: id }]);
  }
  if (okOn) out.push(['buttonOk', {}]);
  if (!mustClick) for (const id of cardIds) out.push(['clickCard', { cardId: id }]);
  if (cancelOn) out.push(['buttonCancel', {}]);
  return { moves: out, okOn, cancelOn };
}

/**
 * One decision per *settled* board, from a plan rebuilt whenever the frame
 * changes. The Nth time this exact input arrives we play the Nth move: a
 * repeated frame means the last act changed nothing, so walking down the plan is
 * what stops a dumb policy from clicking one illegal card forever.
 */
function decide(body) {
  const key = inputKey(body);
  const attempt = (tries.get(key) ?? 0);
  tries.set(key, attempt + 1);

  const { moves, okOn, cancelOn } = plan(body);
  if (moves.length === 0) return;             // not our decision; the watchdog is the backstop
  let move;
  if (attempt < moves.length) move = moves[attempt];
  else if (okOn) move = ['buttonOk', {}];     // pressing OK again is never wrong
  else if (cancelOn) move = ['buttonCancel', {}];
  else return;
  act(move[0], move[1]);
  lastDecisionAt = Date.now();
}

// ---------------------------------------------------------------------------
// The ask policy — AutoTransport.answerFor, transcribed (§5.2)
// ---------------------------------------------------------------------------

const len = (a) => (Array.isArray(a) ? a.length : 0);
const indices = (n) => Array.from({ length: Math.max(0, n) }, (_, i) => i);
const intOf = (v) => (typeof v === 'number' ? Math.trunc(v) : null);

function answerFor(kind, body) {
  switch (kind) {
    case 'ability_menu':
    case 'options': {
      const n = len(body.options);
      if (n === 0) return null;
      const d = intOf(body.defaultIndex);
      return d !== null && d >= 0 && d < n ? d : 0;
    }
    case 'confirm': {
      // **The engine's own default button**, which is also §5.4's null default
      // (`RemoteClientGuiGame.java:451-454`) — and, unlike a flat `false`, it
      // makes progress. Measured (M5): the one IGuiGame confirm a human seat
      // reaches is InputPassPriority's floating-mana prompt, whose "no" means DO
      // NOT pass priority; answered false it re-asks at once, and one probe game
      // produced 969 identical confirm asks before it was killed.
      //
      // From the third identical prompt the answer ALTERNATES. A backstop that
      // LATCHES on `!dflt` has merely chosen the other non-advancing answer, and
      // the first version of this line did: prompts 1–2 `true`, prompts 3..∞
      // `false`, 2,278 identical asks in one 300 s gate step. `seen` counts only
      // asks since the last turn/phase change (see `onState`).
      const dflt = body.defaultYes === true;
      const seen = bumpPrompt(`confirm|${String(body.prompt)}|${String(body.title)}`);
      return seen <= 2 || seen % 2 === 0 ? dflt : !dflt;
    }
    case 'text': {
      // A numeric text ask is AbstractGuiGame.getInteger's "Other…" branch, and
      // it re-asks in a `while (true)` until the string is a number inside its
      // own [min,max] — bounds the `text` body does not carry. So '' is not a
      // safe answer there: it is an infinite ask loop that looks like a wedge.
      // `null` is, and it is §5.4's own default ("that is 'cancel'").
      if (body.numeric !== true) return '';
      if (!args.probe) return null;
      // M68: the body carries getInteger's bounds; the probe's real string is
      // the smallest legal one when it says, "0" otherwise.
      return bumpPrompt(`text|${String(body.prompt)}`) === 1 ? String(intOf(body.min) ?? 0) : null;
    }
    case 'choose_list': {
      const n = len(body.options);
      const min = intOf(body.min);
      const want = min === null || min < 0 ? 0 : Math.min(min, n);
      if (args.probe) {
        // THE `text` PROBE. getInteger(message, min, max, cutoff) offers the
        // numbers min..cutoff and then one STRING option, "Other…", and picking
        // that string is the only route a human seat has to
        // IGuiGame.showInputDialog (the only other two call sites in the 2.0.14
        // jar are the macro systems). §5.1: an Integer option is `kind:"number"`
        // and a String option is `kind:"text"`.
        const other = otherIntegerOption(body);
        if (other >= 0 && want <= 1) return [other];
      }
      return indices(want);
    }
    case 'choose_entities': {
      const n = len(body.options);
      const min = intOf(body.min);
      let want = min === null || min < 0 ? 0 : Math.min(min, n);
      if (args.probe && want === 0 && n > 0) {
        // An optional choose_entities is a library search offered as "you may".
        // Answering "none" is legal and is what the default policy does — and
        // it means the search fetches nothing, so the answer marshalling
        // (index → the option array → a GameEntity) is never executed.
        const max = intOf(body.max);
        want = max === null || max >= 1 ? 1 : 0;
      }
      return indices(want);
    }
    case 'order': {
      // NEVER null (§5.4): three Forge call sites dereference `.ordered()`.
      // Reproduce the bridge's own default — k items from `dest ++ source`.
      const dest = len(body.dest);
      const source = len(body.source);
      const total = dest + source;
      const min = intOf(body.min);
      const max = intOf(body.max);
      let lo = max !== null && max >= 0 ? total - max : 0;
      let hi = min !== null && min >= 0 ? total - min : total;
      lo = Math.max(0, Math.min(lo, total));
      hi = Math.max(lo, Math.min(hi, total));
      const k = Math.max(lo, Math.min(dest, hi));
      return { ordered: indices(k), remember: false };
    }
    case 'manipulate_list':
      return indices(len(body.cards));         // unchanged order
    case 'sideboard': {
      // AutoTransport's branch, line for line. The identity is "no
      // sideboarding" and is what the default policy sends; --probe swaps the
      // last main card for the first sideboard card, which is the same deck
      // size and a provably different decklist, so the index marshalling is
      // actually executed (M6).
      const main = len(body.main);
      const side = len(body.side);
      if (!args.probe || side === 0 || main === 0) return indices(main);
      return [...indices(main - 1), main];
    }
    case 'assign_damage': {
      // §5.3: index 0 is the DEFENDER and a blocker follows whenever there is
      // one. All of it on the first blocker; piling it on the defending player
      // while a creature blocks is the one answer the rules forbid.
      const n = len(body.targets);
      const total = intOf(body.total);
      if (n === 0 || total === null) return null;
      return { [String(n > 1 ? 1 : 0)]: total };
    }
    case 'assign_amount': {
      // M68 (D426): AutoTransport's branch -- the dialog's start (each target's
      // `min`, 1 with atLeastOne) and the rest in order up to each `max`. The
      // bridge refuses "all on target 0" whenever that breaks a cap or a floor.
      const ts = Array.isArray(body.targets) ? body.targets : [];
      const total = intOf(body.total);
      if (ts.length === 0 || total === null) return null;
      let left = total;
      const got = ts.map((t) => {
        const lo = intOf(t?.min) ?? (body.atLeastOne === true ? 1 : 0);
        const g = Math.min(Math.max(0, left), lo);
        left -= g;
        return g;
      });
      ts.forEach((t, i) => {
        const cap = intOf(t?.max) ?? total;
        const add = Math.min(left, Math.max(0, cap - got[i]));
        got[i] += add;
        left -= add;
      });
      return Object.fromEntries(got.map((g, i) => [String(i), g]));
    }
    default:
      return null;
  }
}

/** AutoTransport.askPromptsSeen.merge — 1 on the first sighting of this prompt. */
function bumpPrompt(key) {
  const n = (askPromptsSeen.get(key) ?? 0) + 1;
  askPromptsSeen.set(key, n);
  return n;
}

/**
 * The index of the one `kind:"text"` option in a list that is otherwise all
 * `kind:"number"`, or -1. That is exactly getInteger's "Other…" entry and
 * nothing else in the corpus has the shape. (AutoTransport.lastTextOptionAfterNumbers.)
 */
function otherIntegerOption(body) {
  const opts = Array.isArray(body.options) ? body.options : [];
  let text = -1;
  let numbers = 0;
  for (let i = 0; i < opts.length; i++) {
    const k = String(opts[i]?.kind);
    if (k === 'number') numbers += 1;
    else if (k === 'text' && text < 0) text = i;
    else return -1;
  }
  return numbers > 0 ? text : -1;
}

/**
 * The first `ability_menu` option Forge says can actually be played, or the
 * first option at all. (AutoTransport.firstPlayableAbility.)
 */
function firstPlayableAbility(body) {
  const opts = Array.isArray(body.options) ? body.options : [];
  let first = null;
  for (const o of opts) {
    if (typeof o?.abilityId !== 'number') continue;
    if (first === null) first = o;
    if (o.canPlay === true) return o;
  }
  return first;
}

function onAsk(body) {
  const askId = String(body.askId);
  const kind = String(body.kind);
  if (!ASK_KINDS.has(kind)) {
    // §5.2's closing note: the reducer throws on an unknown kind rather than
    // ignoring it, so a new blocking method surfaces as an error and not a hang.
    fail(`unknown ask.kind ${JSON.stringify(kind)} on ${askId} — not one of the eleven in §5.1`);
    return;
  }
  askKinds.add(kind);
  if (args.refuseFirstAsk && refusedAskId === null) {
    dropOnAsk(askId, kind, body);
    return;
  }
  if (args.observeAtAsk && observe === null) {
    observeAtAsk(askId, kind, body, rawFrame);
    return;
  }
  if (adv !== null) {
    // D428: the adversary answers, illegal first; this policy's own answer is
    // the legal one it ends with.
    adv.onAsk(body, (b) => answerFor(String(b.kind), b));
    return;
  }
  answerAsk(askId, kind, body);
}

/** The policy's half of an ask: everything after the flags above have had their say. */
function answerAsk(askId, kind, body) {
  if (askId === refusedAskId) {
    // The server cancelled this one at the drop (contract (c)): it resolved to
    // its §5.4 default with no `answer` line, and answering it now would be a
    // second answer to a question nobody is parked on (§2.3).
    say(`SKIP ${askId} — this is the ask we refused; the server cancelled it at the drop`);
    return;
  }
  if (args.probe && kind === 'ability_menu') {
    // THE `clickAbility` PROBE (§2.2, D20/D22). PLAN.md M5: "the console seat
    // sends it; THE BROWSER NEVER HAS." Answering the menu by index is the
    // ordinary path and is already evidenced by the committed fixtures; the ACT
    // is not. So the menu is declined with `null` — "never mind" (§5.3: Forge's
    // input is still the one that asked, nothing is spent) — and the same choice
    // is made again as an act, which resolves through the bridge's abilityIndex
    // to the identical IGameController.selectAbility call.
    answer(askId, kind, body.prompt ?? body.title ?? '', null);
    const opt = firstPlayableAbility(body);
    if (opt !== null && typeof body.cardId === 'number') {
      act('clickAbility', { cardId: body.cardId, abilityId: opt.abilityId });
    }
    return;
  }
  answer(askId, kind, body.prompt ?? body.title ?? '', answerFor(kind, body));
  // THE ASK CEILING (AutoTransport.repeatedTooOften). Answering came first on
  // purpose: the server's game thread is parked on this ask, so a concede
  // dispatched while it is parked would sit behind it.
  const repeatKey = `${kind}|${String(body.prompt)}|${String(body.title)}`;
  const repeats = (askRepeats.get(repeatKey) ?? 0) + 1;
  askRepeats.set(repeatKey, repeats);
  if (repeats > ASK_REPEAT_CAP && !conceded) {
    conceded = true;
    concededAt = Date.now();
    say(`ASK LOOP: more than ${ASK_REPEAT_CAP} identical ${kind} asks with no progress — conceding`);
    act('concede');
  }
}

/**
 * `--observe-at-ask` (D291): while the game thread is parked on this ask, open
 * an observer and hold its catch-up to the seat's bytes; then answer.
 *
 * `WsTransport.admitObserver` sends a joining observer `hello_ok`, the last
 * `state`, the last `input` (or this game's `over`) and every ask still pending
 * in the reply pool, under the fan-out monitor (amendment M50). The ask half had
 * no check: `Transport.ask` asserts a game thread, which the self-test may not
 * name (hard rules 3 and 10). Here the engine itself raises the ask and this
 * seat simply does not answer it until the observer has been caught up, so the
 * ask is outstanding by construction -- and since the seat was connected for
 * every push, its last `hello_ok` and `state` ARE the transport's cache.
 */
function observeAtAsk(askId, kind, body, askText) {
  observe = { askId, verdict: 'pending' };
  const url = URL_.replace(/\/ws(\?|$)/, '/observe$1');
  say(`OBSERVE-AT-ASK ${kind} ${askId}: holding the answer, opening ${url}`);
  const got = [];
  let done = false;
  const ws = new WebSocket(url);
  const settle = (verdict) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    try { ws.close(1000, 'caught up'); } catch { /* already gone */ }
    observe.verdict = verdict;
    if (verdict !== 'ok') {
      fail(`--observe-at-ask: ${verdict}`, 10);
      return;
    }
    say(`OBSERVE-AT-ASK ok: the observer's catch-up carried ${askId} byte for byte ` +
      `(${got.length} frame(s): ${got.map((t) => JSON.parse(t).type).join(', ')}); answering it now`);
    lastActivity = Date.now();
    answerAsk(askId, kind, body);
  };
  const timer = setTimeout(() => settle(
    `the observer's catch-up never carried the open ask ${askId} within 10 s ` +
      `(got ${got.length} frame(s): ${got.map((t) => JSON.parse(t).type).join(', ') || 'none'})`), 10_000);
  ws.addEventListener('message', (e) => {
    if (done) return;
    const text = String(e.data);
    got.push(text);
    if (text !== askText) {
      // Before the ask, only what the catch-up is made of: a live frame here
      // would mean the game thread moved while this seat held its answer.
      const type = JSON.parse(text).type;
      if (!['hello_ok', 'state', 'input', 'ask'].includes(type)) {
        settle(`frame ${got.length} of the observer's catch-up is a \`${type}\`, before the open ask`);
      }
      return;
    }
    // The ask arrived: the same string as the seat's, so the same seq and body.
    if (got[0] !== seatRaw.hello_ok) {
      settle(`the observer's first frame is not the \`hello_ok\` this seat was sent, byte for byte`);
    } else if (got[1] !== seatRaw.state) {
      settle(`the observer's second frame is not the last \`state\` this seat was sent, byte for byte`);
    } else {
      settle('ok');
    }
  });
  ws.addEventListener('error', () => settle(`the observer socket errored (${url})`));
  ws.addEventListener('close', (e) => settle(`the observer socket closed (${String(e.code)}) before the open ask reached it`));
}

/**
 * `--refuse-first-ask`: close the socket on the first `ask` FRAME, come back
 * after `--reconnect-after` ms, and finish the game.
 *
 * This is the coverage `tools/ws-smoke.mjs --disconnect-mid-ask` structurally
 * cannot give. That variant settles for "an `ask`, OR an `input` whose OK is
 * enabled", and in every deck in this repo the input comes first — so both
 * committed runs print `cancelling 0 pending ask(s)` and the defect amendment
 * M19 was written for (a disconnect while a game thread is parked inside
 * `ReplyPool.await`) has never been exercised by the gate. Dropping on the ask
 * FRAME is the only way to be inside that window, and it needs a client that can
 * play a game to reach one at all: every ask in these decks is downstream of an
 * act, which is why this lives here and not in ws-smoke.
 *
 * The server must then say `cancelling 1 pending ask(s)`, apply §5.4's default,
 * keep the game thread running, and hand the reconnecting client `hello_ok` +
 * `state` + `input` again (contract (c)). `tools/check-all.sh` asserts the log
 * line; this script asserts the game still reaches `over`.
 */
function dropOnAsk(askId, kind, body) {
  refusedAskId = askId;
  reconnectPending = true;
  pendingInput = null;                         // nothing to decide while we are away
  say(`REFUSE ${kind} ${askId} <- ${JSON.stringify(body.prompt ?? body.title ?? '')}: ` +
    `dropping the socket while a game thread is parked on it`);
  try { socket?.close(4002, 'refusing the first ask'); } catch { /* already gone */ }
  setTimeout(() => {
    reconnectPending = false;
    opened = false;
    lastFrameAt = Date.now();                  // the watchdog must not count the gap we chose
    lastActivity = Date.now();
    lastDecisionAt = Date.now();
    tries.clear();                             // a fresh board deserves a fresh plan
    lastSeenInputKey = '';
    openSocket('reconnect after refusing an ask');
    // NOT unref'd, deliberately: with the socket closed, the ticker unref'd and
    // the run timeout unref'd, an unref'd timer here leaves the event loop with
    // nothing to hold it and node exits 0 in the middle of the test.
  }, args.reconnectAfterMs);
}

// ---------------------------------------------------------------------------
// The loop: settle, decide, watch
// ---------------------------------------------------------------------------

let resyncsSent = 0;

function tick() {
  if (over || failure !== null) return;
  const now = Date.now();

  // Contract (d): one `resync` at the start and one mid-game. The mid-game one
  // is the interesting half — §2.4 says the server answers with a fresh state,
  // the current input and any outstanding ask, and a browser that reconnects
  // relies on exactly that path.
  if (resyncsSent === 1 && stats.acts >= args.resyncAfter) {
    resyncsSent += 1;
    say(`RESYNC mid-game after ${stats.acts} acts`);
    send('resync', {});
  }

  // The progress watchdog: no frame at all for STUCK_MS and we concede, so a
  // wedged run fails in a minute rather than hanging a test suite.
  if (!conceded && now - lastFrameAt > STUCK_MS) {
    conceded = true;
    concededAt = now;
    say(`STUCK: no frame for ${now - lastFrameAt} ms — conceding`);
    act('concede');
    return;
  }
  if (conceded && now - concededAt > CONCEDE_GRACE_MS) {
    fail(`conceded ${CONCEDE_GRACE_MS} ms ago and no \`over\` frame arrived`, 4);
    return;
  }

  guardedActTimers(now);                       // D136: --undo-race and --comfort's undo steps
  adv?.tick(now);                              // D428: an illegal answer or act that drew nothing
  if (observe !== null && observe.verdict === 'pending') return;   // D291: the ask is held open
  if (pendingInput === null) return;
  if (now < comfortHoldUntil) return;          // --comfort: see comfortStep()
  const quiet = now - lastActivity;
  const sinceDecision = now - lastDecisionAt;
  if (quiet >= SETTLE_MS || sinceDecision >= STEP_CAP_MS) {
    lastActivity = now;                        // one decision per settle window
    if (holdHook !== null) {
      // D429: the seat stays parked while the hook runs (once per new state + input).
      if (holdPending) return;
      const k = `${lastStateSeq}:${lastInputSeq}`;
      if (k !== holdKey) {
        holdKey = k;
        holdPending = true;
        Promise.resolve()
          .then(() => holdHook({ gameId: gameIds[gameIds.length - 1] ?? null, me, stateSeq: lastStateSeq, inputSeq: lastInputSeq,
            state: lastStateBody, input: pendingInput }))
          .catch((e) => say(`HOLD hook threw: ${String(e)}`))
          .finally(() => { holdPending = false; lastActivity = Date.now(); lastFrameAt = Date.now(); });
        return;
      }
    }
    if (adv !== null) {
      // D428: hold while an illegal act waits for its refusal; otherwise, once
      // a turn per input class, the illegal act goes first.
      if (adv.busy()) return;
      if (adv.inputProbe(pendingInput, lastStateBody, me)) {
        lastDecisionAt = now;
        return;
      }
    }
    try {
      decide(pendingInput);
    } catch (err) {
      fail(`policy threw: ${String(err)}`);
    }
  }
}

function finish() {
  if (adv !== null) {
    // D428: the adversary's verdict. A leak (an illegal answer or act the bridge
    // or the engine took) and a legal answer refused are both failures; a kind
    // named by --require-kinds that never saw a refusal is "not reached".
    const v = adv.verdict(args.requireKinds);
    try {
      mkdirSync(dirname(args.adversary), { recursive: true });
      writeFileSync(args.adversary, JSON.stringify({ ...adv.report, missing: v.missing }, null, 2) + '\n');
    } catch (err) {
      process.stderr.write(`[ws-auto] could not write ${args.adversary}: ${String(err)}\n`);
    }
    const r = adv.report;
    for (const [k, s] of Object.entries(r.asks)) {
      process.stderr.write(`[adversary] ask ${k.padEnd(16)} asked=${s.asked} illegal=${s.illegalSent} refused=${s.refused} `
        + `leaks=${s.leaks} legal=${s.legalSent} accepted=${s.legalAccepted} legalRefused=${s.legalRefused}\n`);
    }
    for (const [k, s] of Object.entries(r.inputs)) {
      process.stderr.write(`[adversary] input ${k.padEnd(17)} probes=${s.probes} refused=${s.refused} leaks=${s.leaks}\n`);
    }
    if (failure === null && !v.ok) {
      failure = { message: `--adversary: ${r.leaks.length} leak(s), ${r.legalRefused.length} legal answer(s) refused -- see ${args.adversary}`, code: 3 };
    } else if (failure === null && v.missing.length > 0) {
      failure = { message: `--adversary: never refused an illegal answer to ${v.missing.join(', ')} (--require-kinds)`, code: 11 };
    }
  }
  if (args.observeAtAsk && failure === null && over && observe === null) {
    failure = {
      message: '--observe-at-ask: no ask was raised in the whole game, so no observer was caught up on one '
        + '(seed 13 on the default deck raises several)',
      code: 10,
    };
  }
  if (args.undoRace && failure === null) {
    // D136's reproduction: "Not now" is the fixed bridge, no notice is the race.
    if (race.verdict === 'applied') {
      failure = {
        message: `--undo-race: the undo sent on the first state that offered one (depth ${race.depth}) drew no `
          + '"Not now": the bridge APPLIED it while the engine was running -- the race D136 closes '
          + '(see the server log for the TEST HOOK lines)',
        code: 9,
      };
    } else if (race.verdict === null) {
      failure = {
        message: '--undo-race: no state ever offered an undo, so nothing was tested (a deck and a policy '
          + 'that cast a spell with Auto are what open the window: decks/yield-probe.dck)',
        code: 7,
      };
    }
  }
  if (args.comfort && args.requireLateUndo && failure === null && over
      && comfort.lateUndoVerdict === 'applied') {
    failure = {
      message: '--require-late-undo: the late undo drew no "Not now" -- the bridge APPLIED an undo while the '
        + 'engine was running (D136, protocol amendment M48)',
      code: 7,
    };
  }
  if (args.comfort && failure === null && over) {
    // A comfort act that went out and moved nothing is the failure this mode
    // exists to catch: the client sent it, the bridge dropped it, and a count
    // would still have been green.
    const missed = comfortReport().filter(([, sent, seen]) => !sent || !seen);
    if (missed.length > 0) {
      failure = {
        message: `--comfort: ${missed.map(([n, sent, , countOnly]) => `${n} (${
          sent ? (countOnly ? 'sent' : 'sent, no effect seen') : 'never reached'})`).join(', ')}`,
        code: 7,
      };
    }
  }
  if (args.comfort && failure === null && over) {
    // The behavioural half of auto-yield (step 3b). `yielded:"yes"` proves the
    // STORE was written; this proves the engine READS it --
    // `PlayerControllerHuman.chooseSpellAbilityToPlay` returns null without
    // raising an InputPassPriority at all when `peekAbility().isAbility()` and
    // `shouldAutoYield(yieldKey())`, so a prompt while that key is on top is
    // the feature not working.
    if (comfort.repeatSeen > 0 && comfort.repeatPrompts > 0) {
      failure = {
        message: `--comfort: the yielded key ${String(comfort.setYieldKey)} came back to the top of `
          + `the stack ${comfort.repeatSeen} time(s) and the engine asked this seat to act `
          + `${comfort.repeatPrompts} time(s) anyway -- setYield wrote the store and nothing read it`,
        code: 7,
      };
    } else if (args.requireYieldRepeat && comfort.repeatSeen === 0) {
      failure = {
        message: '--require-yield-repeat: the yielded key never came back to the top of the stack, '
          + 'so the behavioural half of auto-yield was not exercised at all '
          + '(use decks/yield-probe.dck, whose key ability repeats every upkeep)',
        code: 7,
      };
    } else if (args.requireYieldRepeat && comfort.setYieldWasAbility !== true) {
      failure = {
        message: '--require-yield-repeat: the yield was set on a stack item with isAbility:false, '
          + 'which the engine\'s ability-scoped store can never consult',
        code: 7,
      };
    }
  }
  const code = failure !== null ? failure.code : over ? 0 : 1;
  const summary =
    `frames in ${stats.in}, out ${stats.out} · states ${stats.states} · inputs ${stats.inputs} · ` +
    `acts ${stats.acts} · asks ${stats.asks} answered ${stats.answers} · notices ${stats.notices} · ` +
    `ask kinds ${askKinds.size === 0 ? 'none' : [...askKinds].sort().join(',')} · ` +
    (args.games > 1 ? `games ${gamesSeen}/${args.games} [${gameIds.join(' ')}] · ` : '') +
    (args.comfort
      ? `comfort ${comfortReport().map(([n, sent, seen, countOnly]) => `${n}=${
          sent ? (countOnly ? 'sent(count)' : seen ? 'ok' : 'NO EFFECT') : 'not reached'}`).join(' ')}`
        // Amendment M42: how many comfort acts came back as `notice
        // {title:"Not yet"}` and were un-sent and retried. Zero is the expected
        // number against a bridge that has M42; a non-zero one is not a failure
        // and IS a thing a reader should see, because it says this run raced
        // the engine's first push and recovered rather than silently passing.
        + ` retries=${comfort.retries}`
        + ` lateUndo=${comfort.lateUndoVerdict ?? (comfort.lateUndoSent ? 'pending' : 'not sent')}`
        + ` undoNotNow=${comfort.undoNotNow}`
        + ` · autoYield key=${comfort.setYieldKey ?? 'none'}`
        + ` isAbility=${String(comfort.setYieldWasAbility)}`
        + ` repeats=${comfort.repeatSeen} promptsWhileOnTop=${comfort.repeatPrompts}`
        + ` (asserted: a prompt while that key is on top fails the run`
        + `${args.requireYieldRepeat ? ', and so does repeats=0' : ''}) · `
      : '') +
    (args.probe ? `probe acts ${probeActs.useMana} useMana, ${probeActs.clickAbility} clickAbility · ` : '') +
    (refusedAskId === null ? '' : `refused ${refusedAskId} and reconnected · `) +
    (observe === null ? '' : `observed at ${observe.askId}: ${observe.verdict} · `) +
    (args.undoRace ? `undoRace ${race.sent ? `sent at depth ${race.depth}, ${race.verdict ?? 'no verdict'}`
      : 'never offered an undo'} · ` : '') +
    (matchSeen === null ? 'match none · '
      : `match ${String(matchSeen.aiProfile)} vs "${String(matchSeen.aiDeck?.name)}" · `) +
    `${((Date.now() - started) / 1000).toFixed(1)}s`;
  process.stderr.write(`[ws-auto] ${summary}\n`);
  process.stderr.write(`[ws-auto] ${failure !== null ? `FAILED: ${failure.message}` : over ? 'OVER — exit 0' : 'no over frame'}\n`);
  if (args.log !== null) {
    if (!headerWritten && heldLines.length > 0) {
      // Amendment M9's other half: a header that never arrived leaves the file
      // EMPTY rather than headerless, and says so — a reader identifies line 0
      // by position.
      process.stderr.write(
        `[ws-auto] ${heldLines.length} frame(s) arrived before hello_ok and no header was built; ` +
          `${args.log} is empty on purpose (§8.1, amendment M9)\n`,
      );
    }
    for (const path of logPaths) process.stderr.write(`[ws-auto] log: ${path}\n`);
  }
  try { socket?.close(1000, 'done'); } catch { /* already gone */ }
  if (logStream !== null) logStream.end();
  // Give the close frame and the log flush a tick, then leave.
  setTimeout(() => process.exit(code), 50);
}

// ---------------------------------------------------------------------------
// Go
// ---------------------------------------------------------------------------

/**
 * One connection's worth of wiring, so `--refuse-first-ask` can make a second
 * one. Everything above this line is connection-agnostic on purpose: the seat is
 * the SESSION (amendment M10), not the socket.
 */
function openSocket(what) {
  say(`connecting to ${URL_} (${what}, timeout ${args.timeoutS}s)`);
  try {
    socket = new WebSocket(URL_);
  } catch (err) {
    process.stderr.write(`[ws-auto] cannot open ${URL_}: ${String(err)}\n`);
    process.exit(5);
  }
  // Captured so a late event from a socket we have already replaced cannot fail
  // a run that is healthy on the current one.
  const mine = socket;

  socket.addEventListener('open', () => {
    opened = true;
    say(`open (${what})`);
    // Contract (d): a `resync` at the start. A browser that autoconnects sends one
    // before Forge has asked this seat for anything, which is the path
    // `WireGuiGame.onResync`'s pre-input guard exists for (PLAN.md M3 item 1).
    resyncsSent += 1;
    send('resync', {});
  });

  socket.addEventListener('message', (event) => {
    const data = event.data;
    if (typeof data !== 'string') {
      fail(`received a non-text frame (${typeof data}) — §1 is JSON text frames`);
      return;
    }
    try {
      onFrame(data);
    } catch (err) {
      fail(`handler threw: ${String(err)}\n${err instanceof Error ? err.stack : ''}`);
    }
  });

  socket.addEventListener('error', () => {
    // The event carries nothing useful; on Node 24 `close` follows with the
    // code. Node 22 fires NO `close` after a refused connect, and nothing else
    // would hold the event loop (every timer here is unref'd), so a socket that
    // never opened fails the run from here (D291).
    say('socket error');
    if (!opened && mine === socket && !over && failure === null) {
      fail(`could not connect to ${URL_} (${what})`, 5);
    }
  });

  socket.addEventListener('close', (event) => {
    if (over || failure !== null || mine !== socket) return;
    if (reconnectPending) {
      // Our own drop (--refuse-first-ask). Not a failure: the whole point is
      // that the seat survives a socket that goes away mid-ask.
      say(`socket closed by us (${String(event.code)}) — reconnecting in ${args.reconnectAfterMs} ms`);
      return;
    }
    fail(`socket closed (${String(event.code)}${event.reason ? ` ${event.reason}` : ''}) before \`over\``, 6);
  });
}

openSocket('first connection');

const ticker = setInterval(tick, 40);
ticker.unref?.();

setTimeout(() => {
  if (!opened) fail(`no connection to ${URL_} within ${CONNECT_TIMEOUT_MS} ms`, 5);
}, CONNECT_TIMEOUT_MS).unref?.();

setTimeout(() => {
  fail(`timed out after ${args.timeoutS}s without an \`over\` frame`, 1);
}, args.timeoutS * 1000).unref?.();
