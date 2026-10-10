#!/usr/bin/env node
/*
 * mtg-table — tools/ws-select-probe.mjs
 * Copyright (C) 2026 mtg-table contributors.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * A scripted seat on `/ws` that exercises amendments M64–M66 (D421–D423) on the
 * REAL engine and checks what comes back:
 *
 *   M64  `yieldTo {kind:"endStepOrOpponent"}` — sent at the seat's first
 *        priority of every opponent turn; the next priority the seat is given
 *        must be the end step of that turn, or a moment an opponent acted (an
 *        item of theirs on the stack, or their attack on this seat), and
 *        `state.yield` must say `endStepOrOpponent` while it runs. Once a game
 *        it is also sent in the end step itself, where it must be refused with
 *        `notice {title:"yieldTo"}` and nothing else.
 *   M65  `input.selectable.chosen` — the seat targets, discards, attacks and
 *        blocks one click at a time, and after every click the next `input`
 *        must carry what was clicked so far (targets / a list in
 *        `chosen.cardIds` / `chosen.playerIds`, a declaration in
 *        `chosen.attacks` / `chosen.blocks`).
 *   M66  `input.selectable.playerIds` — Lightning Bolt ("any target") must
 *        list both players, Into the Void (creatures only) none, the attack
 *        declaration the defending player; the seat clicks a player only from
 *        that list.
 *
 *     ./bridge/run.sh mtgtable.MtgTable --transport ws --port 8690 --seed 7 \
 *         --deck decks/select-probe.dck --ai-deck decks/doom-legion.dck --games 3
 *     node tools/ws-select-probe.mjs --port 8690 --games 3 [--report var/select-probe.json]
 *
 * Every frame on every input is also checked for the shape: both keys present
 * on every `input`, `playerIds` an array of seat ids or null, `chosen` the
 * four-list object or null. The bridge's own frame log
 * (`var/games/<id>/frames.jsonl`) is the recording; `--report` writes the seqs
 * of every observation so fixtures can be cut from it.
 *
 * Exit 0 when every feature was seen at least once and no check failed; 3 on a
 * failed check; 4 when a feature was never reached (nothing was tested); 1 on
 * a timeout; 5 when the socket never opened.
 *
 * Node 24's global WebSocket; no `ws` package (CLAUDE.md, environment).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const args = { port: 8642, games: 1, timeoutS: 600, report: null, quiet: false };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  const next = () => process.argv[++i];
  if (a === '--port') args.port = Number(next());
  else if (a === '--games') args.games = Number(next());
  else if (a === '--timeout') args.timeoutS = Number(next());
  else if (a === '--report') args.report = next();
  else if (a === '--quiet') args.quiet = true;
  else { process.stderr.write(`ws-select-probe: unknown argument ${a}\n`); process.exit(2); }
}

const SETTLE_MS = 150;
const OPP_STOPS = ['UPKEEP', 'DRAW', 'MAIN1', 'COMBAT_BEGIN', 'COMBAT_DECLARE_ATTACKERS', 'COMBAT_DECLARE_BLOCKERS',
  'COMBAT_DAMAGE', 'COMBAT_END', 'MAIN2', 'END_OF_TURN'];
const say = (s) => { if (!args.quiet) process.stderr.write(`[select-probe] ${s}\n`); };

// --- what the run saw --------------------------------------------------------
const seen = {
  yieldSent: [],          // {game, turn, seq}
  yieldRunning: [],       // state seqs whose yield.kind is endStepOrOpponent
  yieldStops: [],         // {game, turn, why, phase, seq}
  yieldRefused: [],       // {game, seq}
  boltPlayers: [],        // input seqs: a Bolt target prompt listing both players
  creatureOnlyNoPlayers: [], // input seqs: Into the Void's prompt with playerIds []
  chosenTarget: [],       // input seqs: chosen.cardIds / playerIds non-empty in a targeting / list input
  chosenDiscard: [],
  chosenAttacks: [],
  chosenBlocks: [],
  attackDefenders: [],    // input seqs: the attack prompt's playerIds naming the opponent
};
const failures = [];
const fail = (msg) => { failures.push(msg); process.stderr.write(`[select-probe] FAIL ${msg}\n`); };

// --- session state -----------------------------------------------------------
let socket = null;
let seq = 0;
let me = null;
let players = [];
let state = null;
let stateSeq = null;
let input = null;
let inputSeq = null;
let lastFrameAt = 0;
let lastMoveAt = 0;
let game = 1;
let over = false;
let done = false;
const asks = new Map();
const answered = new Set();

// per-turn / per-input bookkeeping
let yieldTurn = null;           // the opponent turn a yield was sent in
let yieldPending = null;        // {turn, seq}: sent, waiting for the seat's next priority
let refusedTried = false;       // the end-step refusal, once a game
let refusalPending = null;      // seq of the refused act, waiting for its notice
const tries = new Map();        // `${turn}:${cardId}` -> casts tried this turn
let landTurn = null;
let boltedFace = false;
let stopsSent = false;          // the opponent's-turn phase stops, once a game (slower yields: a state mid-yield)
let blockPlan = null;           // {turn, steps: [cardId...]}
let attackTurn = null;
let attackClicked = new Set();
let selectClicks = new Map();   // input key -> clicks sent

function send(type, body) {
  if (socket === null || socket.readyState !== 1) return;
  seq += 1;
  socket.send(JSON.stringify({ v: 1, seq, t: Date.now(), type, body }));
  lastMoveAt = Date.now();
}
function act(action, extra = {}) {
  say(`ACT ${action} ${JSON.stringify(extra)}  <- ${JSON.stringify(String(input?.prompt ?? '').slice(0, 70))}`);
  send('act', { action, ...extra });
}

// --- frames -------------------------------------------------------------------
function onFrame(f) {
  lastFrameAt = Date.now();
  const b = f.body ?? {};
  switch (f.type) {
    case 'hello_ok':
      me = b.you;
      players = (b.players ?? []).map((p) => p.id);
      state = null; input = null; asks.clear();
      yieldTurn = null; yieldPending = null; refusedTried = false; refusalPending = null;
      tries.clear(); landTurn = null; boltedFace = false; stopsSent = false; blockPlan = null; attackTurn = null; attackClicked = new Set(); selectClicks = new Map();
      break;
    case 'state':
      state = b; stateSeq = f.seq;
      if (b.yield && b.yield.kind === 'endStepOrOpponent') seen.yieldRunning.push({ game, seq: f.seq, turn: b.turn });
      break;
    case 'input':
      input = b; inputSeq = f.seq;
      checkInputShape(b, f.seq);
      observeInput(b, f.seq);
      break;
    case 'ask':
      if (!answered.has(String(b.askId))) asks.set(String(b.askId), b);
      break;
    case 'notice':
      if (refusalPending !== null && b.title === 'yieldTo') {
        seen.yieldRefused.push({ game, seq: f.seq, text: b.text });
        refusalPending = null;
      }
      break;
    case 'over':
      over = true;
      say(`over (game ${game}): ${JSON.stringify(b).slice(0, 120)}`);
      if (game < args.games) {
        const mode = b.matchOver === false ? 'continue' : 'restart';
        game += 1; over = false;
        setTimeout(() => send('act', { action: 'newGame', mode }), 300);
      } else {
        finish();
      }
      break;
    default:
      break;
  }
}

// --- the shape, on every input --------------------------------------------------
const ids = (v) => Array.isArray(v) && v.every((x) => Number.isInteger(x));
function checkInputShape(b, s) {
  const sel = b.selectable ?? {};
  if (!('playerIds' in sel)) fail(`input ${s}: selectable.playerIds absent (M66: present on every input)`);
  else if (sel.playerIds !== null && !(ids(sel.playerIds) && sel.playerIds.every((p) => players.includes(p)))) {
    fail(`input ${s}: selectable.playerIds ${JSON.stringify(sel.playerIds)} is not null or a list of seat ids`);
  }
  if (!('chosen' in sel)) fail(`input ${s}: selectable.chosen absent (M65: present on every input)`);
  else if (sel.chosen !== null) {
    const c = sel.chosen;
    const ok = c && typeof c === 'object' && ids(c.cardIds) && ids(c.playerIds) && Array.isArray(c.blocks) && Array.isArray(c.attacks)
      && c.playerIds.every((p) => players.includes(p));
    if (!ok) fail(`input ${s}: selectable.chosen ${JSON.stringify(c)} is not the four-list object`);
    for (const id of c.cardIds ?? []) {
      if (!(sel.cardIds ?? []).includes(id) && (c.blocks ?? []).length === 0 && (c.attacks ?? []).length === 0) {
        fail(`input ${s}: chosen card ${id} was never offered in selectable.cardIds`);
      }
    }
  }
}

const isBoltPrompt = (p) => /Lightning Bolt/.test(p) && /target/i.test(p);
const isVoidPrompt = (p) => /Into the Void/.test(p) && /target/i.test(p);
const isDiscard = (p) => /discard/i.test(p);

function observeInput(b, s) {
  const sel = b.selectable ?? {};
  const prompt = String(b.prompt ?? '');
  const c = sel.chosen;
  if (isBoltPrompt(prompt) && Array.isArray(sel.playerIds)) {
    if (players.every((p) => sel.playerIds.includes(p))) seen.boltPlayers.push({ game, seq: s });
    else fail(`input ${s}: Lightning Bolt's target prompt lists players ${JSON.stringify(sel.playerIds)}, not both seats`);
  }
  if (isVoidPrompt(prompt) && Array.isArray(sel.playerIds) && (sel.cardIds ?? []).length > 0) {
    if (sel.playerIds.length === 0) seen.creatureOnlyNoPlayers.push({ game, seq: s });
    else fail(`input ${s}: Into the Void (creatures only) lists players ${JSON.stringify(sel.playerIds)}`);
  }
  if (c && (c.cardIds.length > 0 || c.playerIds.length > 0) && c.blocks.length === 0 && c.attacks.length === 0) {
    (isDiscard(prompt) ? seen.chosenDiscard : seen.chosenTarget).push({ game, seq: s, chosen: c });
  }
  if (c && c.attacks.length > 0) seen.chosenAttacks.push({ game, seq: s, attacks: c.attacks });
  if (c && c.blocks.length > 0) seen.chosenBlocks.push({ game, seq: s, blocks: c.blocks });
  if (prompt.startsWith('Select creatures to attack') && Array.isArray(sel.playerIds) && sel.playerIds.some((p) => p !== me)) {
    seen.attackDefenders.push({ game, seq: s, playerIds: sel.playerIds });
  }
}

// --- helpers on the state ----------------------------------------------------------
const mine = () => (state?.players ?? []).find((p) => p.id === me);
const theirs = () => (state?.players ?? []).find((p) => p.id !== me);
const battlefield = (p) => p?.zones?.battlefield?.cards ?? [];
const isCreature = (c) => /Creature/.test(String(c?.types ?? ''));
const isLand = (c) => /Land/.test(String(c?.types ?? ''));
function cardById(id) {
  for (const p of state?.players ?? []) {
    for (const z of Object.values(p.zones ?? {})) for (const c of z.cards ?? []) if (c.id === id) return c;
  }
  return null;
}
const attackersNow = () => (state?.combat?.bands ?? []).flatMap((band) => band.attackerIds ?? []);

// --- the policy ------------------------------------------------------------------------
function tick() {
  if (done || over || socket === null || socket.readyState !== 1 || me === null) return;
  const now = Date.now();
  if (now - lastFrameAt < SETTLE_MS || now - lastMoveAt < SETTLE_MS) return;

  // 1. an ask: the minimal legal answer
  const first = asks.entries().next();
  if (!first.done) {
    const [askId, body] = first.value;
    asks.delete(askId);
    answered.add(askId);
    const value = answerFor(body);
    say(`ANSW ${body.kind} ${askId} = ${JSON.stringify(value)}`);
    send('answer', { askId, value });
    return;
  }
  if (input === null || state === null) return;
  const prompt = String(input.prompt ?? '');
  const ok = input.buttons?.ok ?? {};
  const cancel = input.buttons?.cancel ?? {};
  const sel = input.selectable ?? {};
  const c = sel.chosen;

  if (/^Waiting for\b/.test(prompt) || /^Yielding\b/.test(prompt)) return;
  if (ok.label === 'Auto') { if (ok.enabled) act('buttonOk'); else if (cancel.enabled) act('buttonCancel'); return; }

  // 2. the attack declaration (M65's attacks; M66's defender)
  if (prompt.startsWith('Select creatures to attack')) {
    if (attackTurn !== state.turn) { attackTurn = state.turn; attackClicked = new Set(); }
    const chosen = new Set(c?.attacks?.map((a) => a.attackerId) ?? []);
    const cand = battlefield(mine()).filter((x) => isCreature(x) && !x.tapped && !x.sick && !chosen.has(x.id) && !attackClicked.has(x.id));
    if (cand.length > 0 && attackClicked.size < 3) {
      attackClicked.add(cand[0].id);
      act('clickCard', { cardId: cand[0].id });
      return;
    }
    act('buttonOk');
    return;
  }

  // 3. the block declaration: attacker, then blocker, one click a tick
  if (prompt.startsWith('Select creatures to block') || /declare blockers for/i.test(prompt)) {
    if (blockPlan === null || blockPlan.turn !== state.turn) {
      const atk = attackersNow();
      const mineFree = battlefield(mine()).filter((x) => isCreature(x) && !x.tapped);
      const steps = [];
      // an attacker a Gray Ogre can block: not a flyer
      const blockable = atk.filter((id) => !(cardById(id)?.keywords ?? []).includes('FLYING'));
      for (let i = 0; i < Math.min(2, blockable.length, mineFree.length); i++) steps.push(blockable[i], mineFree[i].id);
      blockPlan = { turn: state.turn, steps };
    }
    const step = blockPlan.steps.shift();
    if (step !== undefined) { act('clickCard', { cardId: step }); return; }
    act('buttonOk');
    return;
  }

  // 4. an explicit selection: targets, a list
  const cardIds = (sel.cardIds ?? []).filter((x) => Number.isInteger(x));
  const playerIds = Array.isArray(sel.playerIds) ? sel.playerIds : [];
  if (cardIds.length > 0 || (playerIds.length > 0 && /target/i.test(prompt))) {
    const key = `${inputSeq}`;
    if (selectClicks.has(key)) return;        // one click per input frame; the next frame says what it did
    selectClicks.set(key, true);
    const already = new Set([...(c?.cardIds ?? [])]);
    const max = typeof sel.max === 'number' && sel.max > 0 ? sel.max : 1;
    const count = (c?.cardIds?.length ?? 0) + (c?.playerIds?.length ?? 0);
    if (count >= max) { if (ok.enabled) act('buttonOk'); return; }
    if (isBoltPrompt(prompt)) {
      // the face once a game (a player from playerIds), then the opponent's creatures
      const opp = playerIds.find((p) => p !== me);
      const theirCreature = cardIds.find((id) => cardById(id)?.controller !== me);
      if (opp !== undefined && (!boltedFace || theirCreature === undefined)) { boltedFace = true; act('clickPlayer', { playerId: opp }); return; }
    }
    const pool = cardIds.filter((id) => !already.has(id));
    const oppFirst = pool.sort((x, y) => Number(cardById(x)?.controller === me) - Number(cardById(y)?.controller === me));
    if (oppFirst.length > 0) { act('clickCard', { cardId: oppFirst[0] }); return; }
    if (ok.enabled) act('buttonOk'); else if (cancel.enabled) act('buttonCancel');
    return;
  }

  // 5. priority
  if (/^Priority:/.test(prompt) && state.priority === me) {
    if (!stopsSent) {
      // Stops on every step of the opponent's turn: a yield passes them all,
      // and Forge pauses at a step that is not skipped (phasesDelay), so a
      // yield lasts long enough for the bridge's 500 ms flush to show it in a
      // state -- the only way `state.yield` is ever seen mid-yield.
      stopsSent = true;
      for (const phase of OPP_STOPS) send('act', { action: 'setPhaseStop', phase, turn: 'opp', stop: true });
      return;
    }
    observeYieldStop();
    const ownTurn = state.activePlayer === me;
    const stackEmpty = (state.stack ?? []).length === 0;
    if (!ownTurn) {
      if (!refusedTried && state.phase === 'END_OF_TURN' && stackEmpty) {
        refusedTried = true;
        refusalPending = seq + 1;
        act('yieldTo', { kind: 'endStepOrOpponent' });
        return;
      }
      if (yieldTurn !== state.turn && state.phase !== 'END_OF_TURN' && state.phase !== 'CLEANUP') {
        yieldTurn = state.turn;
        yieldPending = { turn: state.turn, phase: state.phase, seq: seq + 1 };
        seen.yieldSent.push({ game, turn: state.turn, phase: state.phase, inputSeq });
        act('yieldTo', { kind: 'endStepOrOpponent' });
        return;
      }
      act('passPriority');
      return;
    }
    if ((state.phase === 'MAIN1' || state.phase === 'MAIN2') && stackEmpty) {
      const move = castSomething();
      if (move) return;
    }
    act('passPriority');
    return;
  }

  if (/keep/i.test(prompt) && ok.enabled) { act('buttonOk'); return; }
  if (ok.enabled) { act('buttonOk'); return; }
  if (cancel.enabled) act('buttonCancel');
}

/** At the seat's first priority after the yield was sent: why did it stop? */
function observeYieldStop() {
  if (yieldPending === null) return;
  const p = yieldPending;
  yieldPending = null;
  const top = (state.stack ?? []).at(-1);
  const attacked = state.phase === 'COMBAT_DECLARE_ATTACKERS' && attackersNow().length > 0;
  let why = null;
  if (top && top.controller !== me) why = 'opponent-stack';
  else if (attacked) why = 'attacked';
  else if (state.phase === 'END_OF_TURN' && state.turn === p.turn) why = 'end-step';
  const rec = { game, turn: state.turn, sentTurn: p.turn, sentPhase: p.phase, phase: state.phase, why, inputSeq, stateSeq };
  seen.yieldStops.push(rec);
  if (why === null) fail(`the yield sent in turn ${p.turn} (${p.phase}) stopped at turn ${state.turn} ${state.phase}, stack ${JSON.stringify(state.stack?.map((x) => x.controller))}: neither an opponent's action nor the end step (input ${inputSeq})`);
}

/** Own main phase: a land, then a spell, each tried at most twice a turn. */
function castSomething() {
  const playable = Array.isArray(state.playable) ? state.playable : [];
  const turn = state.turn;
  const tried = (id) => tries.get(`${turn}:${id}`) ?? 0;
  const tryCard = (id) => { tries.set(`${turn}:${id}`, tried(id) + 1); act('clickCard', { cardId: id }); return true; };
  if (landTurn !== turn) {
    const land = playable.find((e) => e.zone === 'hand' && isLand(cardById(e.cardId)));
    if (land) { landTurn = turn; return tryCard(land.cardId); }
  }
  const named = (n) => playable.filter((e) => e.zone === 'hand' && cardById(e.cardId)?.name === n && tried(e.cardId) < 2);
  const oppCreatures = battlefield(theirs()).filter(isCreature).length;
  const hand = mine()?.zones?.hand?.count ?? 0;
  const lands = battlefield(mine()).filter(isLand).length;
  const order = [
    ...(oppCreatures > 0 && lands >= 4 ? named('Into the Void') : []),
    ...(hand >= 3 ? named('Careful Study') : []),
    ...named('Lightning Bolt'),
    ...named('Gray Ogre'),
  ];
  if (order.length > 0) return tryCard(order[0].cardId);
  return false;
}

/** The minimal legal answer per ask kind (ws-auto-play's answerFor, cut down). */
function answerFor(b) {
  const n = Array.isArray(b.options) ? b.options.length : 0;
  const idx = (k) => Array.from({ length: Math.max(0, k) }, (_, i) => i);
  switch (b.kind) {
    case 'ability_menu':
    case 'options': return n === 0 ? null : (Number.isInteger(b.defaultIndex) && b.defaultIndex < n ? b.defaultIndex : 0);
    case 'confirm': return b.defaultYes === true;
    case 'text': return b.numeric === true ? null : '';
    case 'choose_list':
    case 'choose_entities': return idx(Math.min(Number.isInteger(b.min) && b.min > 0 ? b.min : 0, n));
    case 'order': {
      const total = (b.dest?.length ?? 0) + (b.source?.length ?? 0);
      const lo = Number.isInteger(b.max) ? Math.max(0, total - b.max) : 0;
      const hi = Number.isInteger(b.min) ? total - b.min : total;
      return { ordered: idx(Math.max(lo, Math.min(b.dest?.length ?? 0, hi))), remember: false };
    }
    case 'manipulate_list': return idx(b.cards?.length ?? 0);
    case 'sideboard': return idx(b.main?.length ?? 0);
    case 'assign_damage': return (b.targets?.length ?? 0) === 0 ? null : { [String((b.targets.length > 1) ? 1 : 0)]: b.total };
    case 'assign_amount': return (b.targets?.length ?? 0) === 0 ? null : { 0: b.total };
    default: return null;
  }
}

// --- the verdict -------------------------------------------------------------------------
function finish() {
  if (done) return;
  done = true;
  const stops = (why) => seen.yieldStops.filter((s) => s.why === why).length;
  const counts = {
    yieldSent: seen.yieldSent.length,
    yieldRunningStates: seen.yieldRunning.length,
    yieldStopsOpponentStack: stops('opponent-stack'),
    yieldStopsAttacked: stops('attacked'),
    yieldStopsEndStep: stops('end-step'),
    yieldRefused: seen.yieldRefused.length,
    boltPlayers: seen.boltPlayers.length,
    creatureOnlyNoPlayers: seen.creatureOnlyNoPlayers.length,
    chosenTarget: seen.chosenTarget.length,
    chosenDiscard: seen.chosenDiscard.length,
    chosenAttacks: seen.chosenAttacks.length,
    chosenBlocks: seen.chosenBlocks.length,
    attackDefenders: seen.attackDefenders.length,
  };
  if (refusalPending !== null) fail('the yieldTo sent in the end step was not refused with notice {title:"yieldTo"}');
  const need = ['yieldSent', 'yieldRunningStates', 'yieldStopsEndStep', 'boltPlayers', 'creatureOnlyNoPlayers', 'chosenTarget',
    'chosenDiscard', 'chosenAttacks', 'chosenBlocks', 'attackDefenders'];
  const missing = need.filter((k) => counts[k] === 0);
  if (counts.yieldStopsOpponentStack + counts.yieldStopsAttacked === 0) missing.push('yieldStopsOpponentActed');
  process.stdout.write(`select-probe: ${JSON.stringify(counts)}\n`);
  if (args.report) {
    mkdirSync(dirname(args.report), { recursive: true });
    writeFileSync(args.report, `${JSON.stringify({ counts, seen, failures, missing }, null, 1)}\n`);
  }
  let code = 0;
  if (failures.length) { process.stdout.write(`select-probe FAILED: ${failures.length} check(s)\n`); code = 3; }
  else if (missing.length) { process.stdout.write(`select-probe: never reached ${missing.join(', ')}\n`); code = 4; }
  else process.stdout.write('select-probe OK\n');
  try { socket?.close(1000); } catch { /* closing anyway */ }
  setTimeout(() => process.exit(code), 200);
}

// --- the socket -------------------------------------------------------------------------
const URL_ = `ws://127.0.0.1:${args.port}/ws`;
socket = new WebSocket(URL_);
socket.addEventListener('open', () => { say(`open ${URL_}`); send('resync', {}); });
socket.addEventListener('message', (ev) => {
  try { onFrame(JSON.parse(String(ev.data))); } catch (e) { fail(`handler threw: ${String(e)} ${e?.stack ?? ''}`); }
});
socket.addEventListener('error', () => { if (!done && lastFrameAt === 0) { process.stderr.write('[select-probe] cannot connect\n'); process.exit(5); } });
socket.addEventListener('close', () => { if (!done) { say('socket closed'); finish(); } });
setInterval(tick, 40);
setTimeout(() => { say('timeout'); if (!done) { fail(`timed out after ${args.timeoutS}s`); finish(); } }, args.timeoutS * 1000).unref?.();
