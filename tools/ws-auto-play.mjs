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
 *
 * `--probe` is M5's: the same policy with four decisions taken the other way, so
 * that `useMana` and `clickAbility` — the two typed acts PLAN.md M5 records as
 * having no client that sends them — actually travel this socket, and so that
 * `showInputDialog` and a library search that fetches something are reachable at
 * all. It mirrors `AutoTransport.setProbe(true)` line for line; the two must
 * agree for the same reason the rest of this file mirrors that class.
 *
 * `--refuse-first-ask` is the cancelAll() coverage nothing else in the repo has:
 * it plays normally until the first `ask` FRAME, drops the socket while a game
 * thread is parked inside `ReplyPool.await`, reconnects a few seconds later and
 * finishes the game (see `dropOnAsk`).
 *
 * Exit 0 when an `over` frame arrives; non-zero on timeout, on a protocol
 * violation, or on a socket that never opened. Every act and every answer is
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

import { mkdirSync, createWriteStream } from 'node:fs';
import { dirname } from 'node:path';

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
      '                                  [--refuse-first-ask [--reconnect-after 5000]]\n',
  );
  process.exit(2);
}

const args = {
  port: 8642, url: null, timeoutS: 300, log: null, resyncAfter: 12, quiet: false,
  refuseFirstAsk: false, reconnectAfterMs: 5000, probe: false,
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
    case '--reconnect-after': args.reconnectAfterMs = Number.parseInt(next(), 10); break;
    case '--help': case '-h': usage(null); break;
    default: usage(`unknown argument ${JSON.stringify(a)}`);
  }
}
if (!Number.isFinite(args.port) || args.port <= 0) usage('--port must be a positive integer');
if (!Number.isFinite(args.timeoutS) || args.timeoutS <= 0) usage('--timeout must be a positive integer');
if (!Number.isFinite(args.reconnectAfterMs) || args.reconnectAfterMs < 0) usage('--reconnect-after must be a non-negative integer');
const URL_ = args.url ?? `ws://127.0.0.1:${args.port}/ws`;

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

if (args.log !== null) {
  mkdirSync(dirname(args.log), { recursive: true });
  logStream = createWriteStream(args.log, { flags: 'w' });
}

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
/** askId → true, so a second answer for one ask is impossible by construction (§2.3). */
const answered = new Map();

let me = null;
let myHand = [];
let myLands = [];
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

let pendingInput = null;
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

function act(action, extra = {}) {
  stats.acts += 1;
  if (action in probeActs) probeActs[action] += 1;
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

  const body = frame.body;
  switch (frame.type) {
    case 'hello_ok':
      me = typeof body.you === 'number' ? body.you : null;
      writeHeader(body);
      say(`HELLO game=${String(body.gameId)} seat=${String(me)} seed=${String(body.seed)} ` +
        `forge=${String(body.forgeVersion)} players=${(body.players ?? []).map((p) => p.name).join(' vs ')}`);
      if (Array.isArray(body.unsupportedCards) && body.unsupportedCards.length > 0) {
        say(`unsupportedCards: ${body.unsupportedCards.join(', ')}`);
      }
      lastActivity = Date.now();
      break;
    case 'state':
      stats.states += 1;
      onState(body);
      lastActivity = Date.now();
      break;
    case 'input': {
      stats.inputs += 1;
      pendingInput = body;
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
      lastActivity = Date.now();
      break;
    case 'over':
      over = true;
      say(`OVER winner=${String(body.winner)} reason=${String(body.reason)} matchOver=${String(body.matchOver)}`);
      finish();
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
  }
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
      return bumpPrompt(`text|${String(body.prompt)}`) === 1 ? '0' : null;
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
    case 'sideboard':
      return indices(len(body.main));          // the deck, unchanged
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
      const n = len(body.targets);
      const total = intOf(body.total);
      if (n === 0 || total === null) return null;
      return { 0: total };
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

  if (pendingInput === null) return;
  const quiet = now - lastActivity;
  const sinceDecision = now - lastDecisionAt;
  if (quiet >= SETTLE_MS || sinceDecision >= STEP_CAP_MS) {
    lastActivity = now;                        // one decision per settle window
    try {
      decide(pendingInput);
    } catch (err) {
      fail(`policy threw: ${String(err)}`);
    }
  }
}

function finish() {
  const code = failure !== null ? failure.code : over ? 0 : 1;
  const summary =
    `frames in ${stats.in}, out ${stats.out} · states ${stats.states} · inputs ${stats.inputs} · ` +
    `acts ${stats.acts} · asks ${stats.asks} answered ${stats.answers} · notices ${stats.notices} · ` +
    `ask kinds ${askKinds.size === 0 ? 'none' : [...askKinds].sort().join(',')} · ` +
    (args.probe ? `probe acts ${probeActs.useMana} useMana, ${probeActs.clickAbility} clickAbility · ` : '') +
    (refusedAskId === null ? '' : `refused ${refusedAskId} and reconnected · `) +
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
    process.stderr.write(`[ws-auto] log: ${args.log}\n`);
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
    // The event carries nothing useful; `close` follows with the code.
    say('socket error');
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
