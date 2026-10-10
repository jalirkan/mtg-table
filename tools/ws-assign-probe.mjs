#!/usr/bin/env node
/*
 * mtg-table — tools/ws-assign-probe.mjs
 * Copyright (C) 2026 mtg-table contributors.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * A scripted seat on `/ws` that tries to CHEAT `ask: assign_damage` on the REAL
 * engine and checks that the bridge's rule gate (amendment M67, D424) holds:
 *
 *   a. a blocked creature WITHOUT trample puts its damage on the defending
 *      player -> refused: the same question again (a new askId) with a
 *      `reason`, and no damage dealt;
 *   b. a split that does not add up to the total -> refused the same way;
 *   c. a legal split -> applied: the combat `damage` events from that attacker
 *      are exactly the answered split;
 *   d. a TRAMPLER puts damage on the defender while a blocker is short of
 *      lethal -> refused;
 *   e. a trampler's lethal-to-every-blocker split with the excess on the
 *      defending player -> applied, the player's damage the excess.
 *
 * And on every assign_damage ask: `defenderAllowed` is a boolean and agrees
 * with the attacker's wire `keywords` (TRAMPLE), `reason` is null or a string,
 * every card target carries an integer `lethal`.
 *
 *     ./bridge/run.sh mtgtable.MtgTable --transport ws --port 8760 --seed 5 \
 *         --deck decks/assign-probe.dck --ai-deck decks/blockers-probe.dck --games 4
 *     node tools/ws-assign-probe.mjs --port 8760 --games 4 [--report var/assign-probe.json]
 *
 * `assign-probe.dck` is Prized Unicorn ("All creatures able to block it do
 * so", a 2/2 with no trample) and Rancor (+2/+0 and trample, cast on one
 * Unicorn only, so a game has both kinds of attacker); `blockers-probe.dck`
 * is Memnite and Savannah Lions, whose 1 toughness leaves a trampler excess.
 *
 * Exit 0 when every case a-e was seen and no check failed; 3 on a failed
 * check; 4 when a case was never reached; 1 on a timeout; 5 when the socket
 * never opened.  Node 24's global WebSocket; no `ws` package.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const args = { port: 8642, games: 1, timeoutS: 900, report: null, quiet: false };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  const next = () => process.argv[++i];
  if (a === '--port') args.port = Number(next());
  else if (a === '--games') args.games = Number(next());
  else if (a === '--timeout') args.timeoutS = Number(next());
  else if (a === '--report') args.report = next();
  else if (a === '--quiet') args.quiet = true;
  else { process.stderr.write(`ws-assign-probe: unknown argument ${a}\n`); process.exit(2); }
}

const SETTLE_MS = 150;
const say = (s) => { if (!args.quiet) process.stderr.write(`[assign-probe] ${s}\n`); };

const CASES = ['defenderRefused', 'totalRefused', 'legalApplied', 'trampleShortRefused', 'trampleExcessApplied'];
const seen = Object.fromEntries(CASES.map((k) => [k, []]));
const asksSeen = [];
const failures = [];
const fail = (msg) => { failures.push(msg); process.stderr.write(`[assign-probe] FAIL ${msg}\n`); };

let socket = null;
let seq = 0;
let me = null;
let state = null;
let input = null;
let inputSeq = null;
let lastFrameAt = 0;
let lastMoveAt = 0;
let game = 1;
let over = false;
let done = false;
let gameId = null;
const asks = new Map();         // askId -> {body, seq}
const answered = new Set();

// Per attacker in this combat: what was sent, and what it must produce.
//   key `${game}:${turn}:${attackerId}` -> {steps: [...], sent: [{value, expect, needle, c2s, askSeq}], applied}
const plans = new Map();
// The legal answer whose damage events are being collected.
let collecting = [];            // [{attackerId, expect: Map<"p:<id>"|"c:<id>", n>, got: Map, rec, kase}]
let landTurn = null;
let rancorHost = null;
let attackTurn = null;
let attackClicked = new Set();
const tries = new Map();
const selectClicks = new Set();

function send(type, body) {
  if (socket === null || socket.readyState !== 1) return null;
  seq += 1;
  socket.send(JSON.stringify({ v: 1, seq, t: Date.now(), type, body }));
  lastMoveAt = Date.now();
  return seq;
}
function act(action, extra = {}) {
  say(`ACT ${action} ${JSON.stringify(extra)}  <- ${JSON.stringify(String(input?.prompt ?? '').slice(0, 70))}`);
  send('act', { action, ...extra });
}

// --- the state -------------------------------------------------------------------
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

// --- frames ------------------------------------------------------------------------
function onFrame(f) {
  lastFrameAt = Date.now();
  const b = f.body ?? {};
  switch (f.type) {
    case 'hello_ok':
      me = b.you;
      state = null; input = null; asks.clear();
      landTurn = null; rancorHost = null; attackTurn = null; attackClicked = new Set(); tries.clear();
      collecting = [];
      break;
    case 'state':
      state = b;
      gameId = b.gameId ?? gameId;
      observeDamage(b, f.seq);
      break;
    case 'input':
      input = b; inputSeq = f.seq;
      break;
    case 'ask':
      if (!answered.has(String(b.askId))) asks.set(String(b.askId), { body: b, seq: f.seq });
      if (b.kind === 'assign_damage') onAssignAsk(b, f.seq);
      break;
    case 'over':
      over = true;
      settleCollecting('the game ended');
      say(`over (game ${game}): ${JSON.stringify(b).slice(0, 120)}`);
      if (game < args.games && !allSeen()) {
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

const allSeen = () => CASES.every((k) => seen[k].length > 0);

// --- assign_damage: the shape, and the refusals -----------------------------------
function onAssignAsk(b, s) {
  const turn = state?.turn ?? -1;
  const atk = cardById(b.attackerId);
  const trample = Array.isArray(atk?.keywords) && atk.keywords.includes('TRAMPLE');
  asksSeen.push({ game, gameId, seq: s, askId: b.askId, attackerId: b.attackerId, total: b.total,
    defenderAllowed: b.defenderAllowed, reason: b.reason, trample });
  if (typeof b.defenderAllowed !== 'boolean') fail(`ask ${s}: defenderAllowed ${JSON.stringify(b.defenderAllowed)} is not a boolean (M67)`);
  if (!('reason' in b) || !(b.reason === null || typeof b.reason === 'string')) fail(`ask ${s}: reason ${JSON.stringify(b.reason)} is not null or a string (M67)`);
  if (atk && Array.isArray(atk.keywords) && b.defenderAllowed !== trample) {
    fail(`ask ${s}: defenderAllowed ${b.defenderAllowed} but the attacker's keywords ${JSON.stringify(atk.keywords)} ${trample ? 'have' : 'lack'} TRAMPLE`);
  }
  for (const t of b.targets ?? []) {
    if (t.kind === 'card' && !(Number.isInteger(t.lethal) && t.lethal >= 0)) fail(`ask ${s}: card target ${t.id} lethal ${JSON.stringify(t.lethal)} is not a non-negative integer`);
  }
  const key = `${game}:${turn}:${b.attackerId}`;
  const plan = plans.get(key);
  const last = plan?.sent.at(-1);
  if (last) {
    if (last.expect === 'legal') fail(`ask ${s}: attacker ${b.attackerId} asked again after a legal answer (c2s ${last.c2s}), reason ${JSON.stringify(b.reason)}`);
    else if (typeof b.reason !== 'string' || !b.reason.includes(last.needle)) {
      fail(`ask ${s}: the re-ask after ${JSON.stringify(last.value)} carries reason ${JSON.stringify(b.reason)}, not one naming "${last.needle}"`);
    } else {
      const rec = { game, gameId, turn, attackerId: b.attackerId, answered: last.value, answerC2s: last.c2s, firstAskSeq: last.askSeq,
        reAskSeq: s, reAskId: b.askId, reason: b.reason };
      seen[last.kase].push(rec);
      say(`REFUSED as expected (${last.kase}): ${JSON.stringify(last.value)} -> "${b.reason}"`);
    }
  } else if (b.reason !== null && b.reason !== undefined) {
    fail(`ask ${s}: the first asking for attacker ${b.attackerId} carries a reason ${JSON.stringify(b.reason)}`);
  }
}

/** The answer to send for this asking, and what must come back. */
function planAnswer(b, s) {
  const turn = state?.turn ?? -1;
  const key = `${game}:${turn}:${b.attackerId}`;
  if (!plans.has(key)) plans.set(key, { sent: [], steps: stepsFor(b) });
  const plan = plans.get(key);
  const step = plan.steps.shift() ?? legalStep(b);
  plan.sent.push({ ...step, askSeq: s });
  return { plan, step };
}

function lethalWalk(b, rest) {
  const blockers = (b.targets ?? []).filter((t) => t.id > 0);
  const out = {};
  let left = b.total;
  let last = null;
  for (const t of blockers) {
    if (left <= 0) break;
    const d = Math.min(t.lethal ?? 0, left);
    out[String(t.id)] = d;
    left -= d;
    last = t.id;
  }
  if (left > 0) {
    if (rest === 'defender') out['0'] = left;
    else if (last !== null) out[String(last)] += left;
  }
  for (const k of Object.keys(out)) if (out[k] === 0) delete out[k];
  return out;
}

function legalStep(b) {
  if (b.defenderAllowed) {
    const v = lethalWalk(b, 'defender');
    return { value: v, expect: 'legal', kase: (v['0'] ?? 0) > 0 ? 'trampleExcessApplied' : 'legalApplied' };
  }
  return { value: lethalWalk(b, 'blocker'), expect: 'legal', kase: 'legalApplied' };
}

function stepsFor(b) {
  const blockers = (b.targets ?? []).filter((t) => t.id > 0);
  const steps = [];
  if (blockers.length === 0) return steps;
  if (!b.defenderAllowed) {
    steps.push({ value: { 0: b.total }, expect: 'refused', needle: 'trample', kase: 'defenderRefused' });
    const short = b.total >= 2 ? b.total - 1 : b.total + 1;
    steps.push({ value: { [String(blockers[0].id)]: short }, expect: 'refused', needle: 'exactly', kase: 'totalRefused' });
  } else if (blockers.some((t) => (t.lethal ?? 0) > 0)) {
    steps.push({ value: { 0: b.total }, expect: 'refused', needle: 'needs', kase: 'trampleShortRefused' });
  }
  return steps;
}

/** Combat damage events from an attacker whose legal split was answered. */
function observeDamage(b, s) {
  const events = Array.isArray(b.events) ? b.events : [];
  for (const e of events) {
    // Every `damage` event from the attacker counts: 2.0.14's card-damage event
    // has no combat flag (Snap writes `combat: false` for a creature hit in
    // combat), and nothing in these decks deals damage outside combat.
    if (e.kind === 'damage') {
      const c = collecting.find((x) => x.attackerId === e.sourceCardId);
      if (c) {
        const k = `${e.target?.kind === 'player' ? 'p' : 'c'}:${e.target?.id}`;
        c.got.set(k, (c.got.get(k) ?? 0) + e.amount);
        c.rec.damageSeqs.push(s);
      } else {
        for (const plan of plans.values()) {
          const last = plan.sent.at(-1);
          if (last && last.attackerId === e.sourceCardId && last.expect === 'refused') {
            fail(`state ${s}: attacker ${e.sourceCardId} dealt damage while its last answer (${JSON.stringify(last.value)}) was one the gate must refuse`);
          }
        }
      }
    }
    if (e.kind === 'combat_end' || (e.kind === 'phase' && (e.phase === 'COMBAT_END' || e.phase === 'MAIN2'))) settleCollecting(`state ${s}`);
  }
}

function settleCollecting(where) {
  for (const c of collecting) {
    const want = [...c.expect.entries()].filter(([, n]) => n > 0).sort();
    const got = [...c.got.entries()].filter(([, n]) => n > 0).sort();
    if (JSON.stringify(want) !== JSON.stringify(got)) {
      fail(`${where}: attacker ${c.attackerId} answered ${JSON.stringify(Object.fromEntries(want))}, dealt ${JSON.stringify(Object.fromEntries(got))}`);
    } else {
      c.rec.dealt = Object.fromEntries(got);
      seen[c.kase].push(c.rec);
      say(`APPLIED as answered (${c.kase}): ${JSON.stringify(c.rec.dealt)}`);
    }
  }
  const settled = collecting.length > 0;
  collecting = [];
  // Every case seen: stop here rather than play the game out (the walls
  // cannot attack, so a game can run to a deck-out).
  if (settled && allSeen() && !done) setTimeout(finish, 500);
}

// --- the policy ---------------------------------------------------------------------
function tick() {
  if (done || over || socket === null || socket.readyState !== 1 || me === null) return;
  const now = Date.now();
  if (now - lastFrameAt < SETTLE_MS || now - lastMoveAt < SETTLE_MS) return;

  const first = asks.entries().next();
  if (!first.done) {
    const [askId, { body, seq: s }] = first.value;
    asks.delete(askId);
    answered.add(askId);
    let value;
    if (body.kind === 'assign_damage') {
      const { step } = planAnswer(body, s);
      step.attackerId = body.attackerId;
      value = step.value;
      const c2s = seq + 1;
      step.c2s = c2s;
      if (step.expect === 'legal') {
        const expect = new Map();
        for (const [k, n] of Object.entries(value)) {
          const t = body.targets.find((x) => String(x.id) === k);
          if (!t) continue;
          expect.set(t.kind === 'player' ? `p:${t.playerId}` : `c:${t.cardId}`, n);
        }
        collecting.push({ attackerId: body.attackerId, expect, got: new Map(), kase: step.kase,
          rec: { game, gameId, turn: state?.turn, attackerId: body.attackerId, askSeq: s, answered: value, answerC2s: c2s,
            defenderAllowed: body.defenderAllowed, total: body.total, damageSeqs: [] } });
      }
    } else {
      value = answerFor(body);
    }
    say(`ANSW ${body.kind} ${askId} = ${JSON.stringify(value)}`);
    send('answer', { askId, value });
    return;
  }
  if (input === null || state === null) return;
  const prompt = String(input.prompt ?? '');
  const ok = input.buttons?.ok ?? {};
  const cancel = input.buttons?.cancel ?? {};
  const sel = input.selectable ?? {};

  if (/^Waiting for\b/.test(prompt) || /^Yielding\b/.test(prompt)) return;
  if (ok.label === 'Auto') { if (ok.enabled) act('buttonOk'); else if (cancel.enabled) act('buttonCancel'); return; }

  if (prompt.startsWith('Select creatures to attack')) {
    if (attackTurn !== state.turn) { attackTurn = state.turn; attackClicked = new Set(); }
    const chosen = new Set(sel.chosen?.attacks?.map((a) => a.attackerId) ?? []);
    // One attacker a combat, into at least two untapped blockers (one blocker
    // is no ask: PlayerControllerHuman assigns it all itself): a non-trampler
    // while its cases are missing, else the Rancor host.
    if (attackClicked.size === 0 && chosen.size === 0) {
      const blockers = battlefield(theirs()).filter((x) => isCreature(x) && !x.tapped).length;
      const free = battlefield(mine()).filter((x) => isCreature(x) && !x.tapped && !x.sick);
      const tramplers = free.filter((x) => (x.keywords ?? []).includes('TRAMPLE'));
      const plain = free.filter((x) => !(x.keywords ?? []).includes('TRAMPLE'));
      const wantPlain = ['defenderRefused', 'totalRefused', 'legalApplied'].some((k) => seen[k].length === 0);
      const wantTrample = ['trampleShortRefused', 'trampleExcessApplied'].some((k) => seen[k].length === 0);
      const pick = blockers < 2 ? undefined
        : (wantPlain && plain[0]) || (wantTrample && tramplers[0]) || plain[0] || tramplers[0];
      if (pick) { attackClicked.add(pick.id); act('clickCard', { cardId: pick.id }); return; }
    }
    act('buttonOk');
    return;
  }
  if (prompt.startsWith('Select creatures to block') || /declare blockers for/i.test(prompt)) { act('buttonOk'); return; }

  // Rancor's target: the one host, else any creature of mine.
  const cardIds = (sel.cardIds ?? []).filter((x) => Number.isInteger(x));
  if (cardIds.length > 0) {
    if (selectClicks.has(inputSeq)) return;
    selectClicks.add(inputSeq);
    const already = new Set(sel.chosen?.cardIds ?? []);
    const max = typeof sel.max === 'number' && sel.max > 0 ? sel.max : 1;
    if (already.size >= max) { if (ok.enabled) act('buttonOk'); return; }
    const own = cardIds.filter((id) => cardById(id)?.controller === me && !already.has(id));
    const pick = own.includes(rancorHost) ? rancorHost : own[0] ?? cardIds.find((id) => !already.has(id));
    if (pick !== undefined) {
      if (/Rancor/.test(prompt) && rancorHost === null) rancorHost = pick;
      act('clickCard', { cardId: pick });
      return;
    }
    if (ok.enabled) act('buttonOk'); else if (cancel.enabled) act('buttonCancel');
    return;
  }

  if (/^Priority:/.test(prompt) && state.priority === me) {
    const ownTurn = state.activePlayer === me;
    const stackEmpty = (state.stack ?? []).length === 0;
    if (ownTurn && (state.phase === 'MAIN1') && stackEmpty && castSomething()) return;
    act('passPriority');
    return;
  }
  if (ok.enabled) { act('buttonOk'); return; }
  if (cancel.enabled) act('buttonCancel');
}

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
  const unicorns = battlefield(mine()).filter((c) => c.name === 'Prized Unicorn');
  const hostAlive = rancorHost !== null && unicorns.some((c) => c.id === rancorHost);
  if (!hostAlive) rancorHost = null;
  // Rancor on one Unicorn only, and only once there is a second one to stay a non-trampler.
  const order = [
    ...named('Prized Unicorn'),
    ...(unicorns.length >= 2 || hostAlive ? named('Rancor') : []),
  ];
  if (order.length > 0) return tryCard(order[0].cardId);
  return false;
}

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
    case 'assign_amount': return (b.targets?.length ?? 0) === 0 ? null : { 0: b.total };
    default: return null;
  }
}

function finish() {
  if (done) return;
  done = true;
  settleCollecting('the end');
  const counts = Object.fromEntries(CASES.map((k) => [k, seen[k].length]));
  counts.asks = asksSeen.length;
  const missing = CASES.filter((k) => seen[k].length === 0);
  process.stdout.write(`assign-probe: ${JSON.stringify(counts)}\n`);
  if (args.report) {
    mkdirSync(dirname(args.report), { recursive: true });
    writeFileSync(args.report, `${JSON.stringify({ counts, seen, asks: asksSeen, failures, missing }, null, 1)}\n`);
  }
  let code = 0;
  if (failures.length) { process.stdout.write(`assign-probe FAILED: ${failures.length} check(s)\n`); code = 3; }
  else if (missing.length) { process.stdout.write(`assign-probe: never reached ${missing.join(', ')}\n`); code = 4; }
  else process.stdout.write('assign-probe OK\n');
  try { socket?.close(1000); } catch { /* closing anyway */ }
  setTimeout(() => process.exit(code), 200);
}

const URL_ = `ws://127.0.0.1:${args.port}/ws`;
socket = new WebSocket(URL_);
socket.addEventListener('open', () => { say(`open ${URL_}`); send('resync', {}); });
socket.addEventListener('message', (ev) => {
  try { onFrame(JSON.parse(String(ev.data))); } catch (e) { fail(`handler threw: ${String(e)} ${e?.stack ?? ''}`); }
});
socket.addEventListener('error', () => { if (!done && lastFrameAt === 0) { process.stderr.write('[assign-probe] cannot connect\n'); process.exit(5); } });
socket.addEventListener('close', () => { if (!done) { say('socket closed'); finish(); } });
setInterval(tick, 40);
setTimeout(() => { say('timeout'); if (!done) { fail(`timed out after ${args.timeoutS}s`); finish(); } }, args.timeoutS * 1000).unref?.();
