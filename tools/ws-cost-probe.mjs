#!/usr/bin/env node
/*
 * mtg-table — tools/ws-cost-probe.mjs
 * Copyright (C) 2026 mtg-table contributors.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Amendment M69 (D427), "a click is never a commitment", on the REAL engine. A
 * scripted seat on `/ws` plays decks/cost-probe.dck and, for each permanent
 * whose activation gives something up, checks per cost type:
 *
 *   look      a click on the permanent raises an `ability_menu` (one option for
 *             a lone ability -- Forge's desktop would activate it at once), and
 *             answering it `null` changes nothing: no stack item, no card moved,
 *             no life paid, no land tapped;
 *   cancel1   choosing the ability raises the first cost prompt, which offers a
 *             Cancel, and Cancel undoes the activation (the board as before the
 *             click);
 *   cancel2   for a cost of two or more prompts: the first one answered (a card
 *             picked, a yes, mana paid), Cancel at the next -- is the first part
 *             given back?  This is "which cost types can be cancelled once
 *             begun", measured;
 *   the cast  Bone Splinters (an additional cost: sacrifice a creature): Cancel
 *             at its sacrifice prompt puts the card back in the hand;
 *   landTap   a click on an untapped land at priority still taps it for mana at
 *             once (an undoable mana ability keeps Forge's shortcut), and `undo`
 *             gives it back.
 *
 *     ./bridge/run.sh mtgtable.MtgTable --transport ws --port 8782 --seed 3 \
 *         --deck decks/cost-probe.dck --ai-deck decks/blockers-probe.dck
 *     node tools/ws-cost-probe.mjs --port 8782 [--report var/cost-probe.json] [--frames var/cost-probe.jsonl]
 *
 * Exit 0 when every scenario reached passed; 3 on a failed check; 4 when the
 * Carrion Feeder `look` and `cancel1` (the owner's case) were never reached;
 * 1 on a timeout; 5 when the socket never opened. Node 24's global WebSocket.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { legalAnswer } from './adversary/answers.mjs';

const args = { port: 8642, timeoutS: 900, report: null, frames: null, quiet: false };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  const next = () => process.argv[++i];
  if (a === '--port') args.port = Number(next());
  else if (a === '--timeout') args.timeoutS = Number(next());
  else if (a === '--report') args.report = next();
  else if (a === '--frames') args.frames = next();
  else if (a === '--quiet') args.quiet = true;
  else { process.stderr.write(`ws-cost-probe: unknown argument ${a}\n`); process.exit(2); }
}
const say = (s) => { if (!args.quiet) process.stderr.write(`[cost-probe] ${s}\n`); };

/** The probe's permanents, the cost each ability gives up, and how to reach it. */
const PERMANENTS = {
  'Carrion Feeder': { cost: 'sacrifice a creature (a choice)' },
  'Sakura-Tribe Elder': { cost: 'sacrifice itself' },
  'Wild Mongrel': { cost: 'discard a card' },
  'Woodwraith Strangler': { cost: 'exile a creature card from the graveyard' },
  Greed: { cost: '{B} and pay 2 life' },
  'Mind Stone': { cost: '{1}, {T}, sacrifice itself (its second ability)', label: /Draw/i },
};
const SCENARIOS = ['look', 'cancel1', 'cancel2'];
const results = [];          // {card, cost, scenario, ok, detail, prompts, seqs}
const failures = [];
const fail = (m) => { failures.push(m); process.stderr.write(`[cost-probe] FAIL ${m}\n`); };
const done = new Set();      // `${name}:${scenario}`
const frames = [];

// --- the socket and the frame stream ------------------------------------------------
let socket = null;
let seq = 0;
let me = null;
let state = null;
let input = null;
let lastInputSeq = null;
let over = false;
let lastFrameAt = Date.now();
const waiters = [];
const asks = new Map();

function send(type, body) {
  seq += 1;
  const f = { v: 1, seq, t: Date.now(), type, body };
  frames.push({ ...f, dir: 'c2s' });
  socket.send(JSON.stringify(f));
  return seq;
}
const act = (action, extra = {}) => { say(`ACT ${action} ${JSON.stringify(extra)}`); return send('act', { action, ...extra }); };
const answer = (askId, value) => { asks.delete(askId); say(`ANSWER ${askId} ${JSON.stringify(value)}`); return send('answer', { askId, value }); };

function onFrame(text) {
  const f = JSON.parse(text);
  frames.push({ ...f, dir: 's2c' });
  lastFrameAt = Date.now();
  const b = f.body ?? {};
  if (f.type === 'hello_ok') me = b.you;
  else if (f.type === 'state') state = b;
  else if (f.type === 'input') { input = b; lastInputSeq = f.seq; }
  else if (f.type === 'ask') asks.set(String(b.askId), { body: b, seq: f.seq });
  else if (f.type === 'notice') say(`NOTICE ${b.title}: ${String(b.text).slice(0, 90)}`);
  else if (f.type === 'over') over = true;
  else if (f.type === 'ping') send('pong', {});
  for (const w of [...waiters]) {
    if (w.pred(f)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(f); }
  }
}

/** The next s2c frame matching `pred`, or null after `ms`. */
function next(pred, ms) {
  return new Promise((resolve) => {
    const w = { pred, resolve };
    waiters.push(w);
    setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) { waiters.splice(i, 1); resolve(null); } }, ms);
  });
}
/** Wait until the stream has been quiet for `ms`. */
async function settle(ms = 400, cap = 15000) {
  const t0 = Date.now();
  while (Date.now() - lastFrameAt < ms && Date.now() - t0 < cap) await new Promise((r) => setTimeout(r, 60));
}

// --- the board ---------------------------------------------------------------------
const mine = () => (state?.players ?? []).find((p) => p.id === me);
const zone = (p, z) => p?.zones?.[z]?.cards ?? [];
const isLand = (c) => /\bLand\b/.test(String(c?.types ?? ''));
const isCreature = (c) => /\bCreature\b/.test(String(c?.types ?? ''));
const priorityInput = () => /^Priority:/.test(String(input?.prompt ?? ''));
function snap() {
  const p = mine();
  const ids = (z) => zone(p, z).map((c) => c.id).sort((a, b) => a - b).join(',');
  const pool = Object.values(p?.manaPool ?? {}).reduce((a, b) => a + b, 0);
  return {
    life: p?.life, hand: ids('hand'), graveyard: ids('graveyard'), exile: ids('exile'),
    battlefield: zone(p, 'battlefield').map((c) => `${c.id}${c.tapped ? 't' : ''}`).sort().join(','),
    stack: (state?.stack ?? []).length, pool,
  };
}
const diff = (a, b) => Object.keys(a).filter((k) => a[k] !== b[k]).map((k) => `${k}: ${a[k]} -> ${b[k]}`);

/** A cost or targeting prompt: an input that is not the seat's plain priority. */
const costPrompt = (f) => f.type === 'input' && !/^Priority:/.test(String(f.body?.prompt ?? ''));
function describe(f) {
  const b = f.body ?? {};
  if (f.type === 'ask') return { seq: f.seq, kind: `ask:${b.kind}`, prompt: String(b.prompt ?? ''), options: (b.options ?? []).length };
  return {
    seq: f.seq, kind: 'input', prompt: String(b.prompt ?? '').replace(/\s+/g, ' ').slice(0, 160),
    ok: b.buttons?.ok, cancel: b.buttons?.cancel, selectable: b.selectable?.cardIds ?? [],
  };
}

/**
 * The prompt as it stands once the engine has finished pushing it: an input is
 * assembled from several pushes (the prompt, then the buttons, then the
 * selectables), so its first frame can still carry the previous input's
 * buttons. A short settle, then the latest frame of the same kind.
 */
async function settled(f) {
  await settle(300, 3000);
  if (f.type === 'ask') return f;
  return { ...f, body: input ?? f.body, seq: lastInputSeq ?? f.seq };
}

/** The next prompt whose text differs from `prev` (a new cost part), or null. */
function nextPrompt(prev, ms) {
  return next((f) => (costPrompt(f) && String(f.body.prompt) !== prev) || (f.type === 'ask' && f.body.kind !== 'ability_menu'), ms);
}

// --- one scenario on one permanent --------------------------------------------------
async function clickForMenu(card) {
  const gotMenu = next((f) => f.type === 'ask' && f.body.kind === 'ability_menu' && f.body.cardId === card.id, 4000);
  const gotPrompt = next((f) => costPrompt(f), 4000);
  act('clickCard', { cardId: card.id });
  const first = await Promise.race([gotMenu, gotPrompt.then((f) => (f ? { prompt: f } : null))]);
  return first;
}

async function runScenario(card, spec, scenario) {
  const before = snap();
  const rec = { card: card.name, cardId: card.id, cost: spec.cost, scenario, ok: false, detail: '', prompts: [] };
  const first = await clickForMenu(card);
  if (first === null) { rec.detail = 'no menu and no prompt within 4 s'; return finishRec(rec, false); }
  if (first.prompt) {
    rec.prompts.push(describe(first.prompt));
    rec.detail = 'the click ACTIVATED the ability (a cost prompt came with no menu first)';
    act('buttonCancel');
    await settle();
    return finishRec(rec, false);
  }
  const menu = first.body;
  rec.menuSeq = first.seq;
  rec.menuOptions = (menu.options ?? []).map((o) => o.label);
  if (scenario === 'look') {
    answer(menu.askId, null);
    await settle(700);
    const d = diff(before, snap());
    rec.detail = d.length ? `never mind changed the board: ${d.join('; ')}` : `a ${rec.menuOptions.length}-option menu; "never mind" changed nothing`;
    return finishRec(rec, d.length === 0 && (spec.label ? true : rec.menuOptions.length === 1));
  }
  const opt = (menu.options ?? []).find((o) => (spec.label ? spec.label.test(String(o.label)) : o.canPlay !== false));
  if (!opt) { answer(menu.askId, null); rec.detail = 'no option to choose'; return finishRec(rec, false); }
  const promptP = next((f) => costPrompt(f) || (f.type === 'ask' && f.body.kind !== 'ability_menu'), 5000);
  answer(menu.askId, opt.id);
  let p = await promptP;
  if (p === null) {
    await settle();
    const d = diff(before, snap());
    rec.detail = `no cost prompt: the activation went ahead at once (${d.join('; ')})`;
    return finishRec(rec, false);
  }
  p = await settled(p);
  rec.prompts.push(describe(p));
  if (scenario === 'cancel2') {
    // Answer the first prompt, then Cancel at the next cost part, if any.
    const firstText = String(p.body.prompt ?? '');
    const nextP = nextPrompt(firstText, 3000);
    if (!(await acceptPrompt(p, rec))) { await cancelOut(); rec.detail = 'could not answer the first prompt'; return finishRec(rec, null); }
    p = await nextP;
    if (p !== null) p = await settled(p);
    else await settle(300);
    if (p === null || (state?.stack ?? []).length > before.stack) {
      rec.detail = 'one prompt only: answering it completed the activation (the pick or yes is the commitment)';
      await letResolve();
      return finishRec(rec, null);
    }
    rec.prompts.push(describe(p));
  }
  const cancelEnabled = p.type === 'input' ? p.body.buttons?.cancel?.enabled === true : true;
  rec.cancelOffered = cancelEnabled;
  if (!cancelEnabled) {
    rec.detail = 'the cost prompt offers no Cancel';
    await cancelOut();
    return finishRec(rec, false);
  }
  if (p.type === 'ask') answer(p.body.askId, null); else act('buttonCancel');
  await settle(700);
  const after = snap();
  const d = diff(before, after);
  rec.restored = d.length === 0;
  rec.detail = d.length === 0 ? 'Cancel undid the activation: the board is as before the click' : `after Cancel the board differs: ${d.join('; ')}`;
  return finishRec(rec, d.length === 0);
}

async function acceptPrompt(p, rec) {
  if (p.type === 'ask') {
    const v = legalAnswer(p.body);
    answer(p.body.askId, v);
    return true;
  }
  const b = p.body;
  const sel = (b.selectable?.cardIds ?? []).filter((id) => id !== rec.cardId);
  const pick = sel[0] ?? (b.selectable?.cardIds ?? [])[0];
  if (pick !== undefined) { act('clickCard', { cardId: pick }); return true; }
  if (b.buttons?.ok?.enabled) { act('buttonOk'); return true; }
  return false;
}

async function cancelOut() {
  for (let i = 0; i < 4 && !priorityInput(); i++) {
    const a = [...asks.values()].at(-1);
    if (a) answer(a.body.askId, null); else act('buttonCancel');
    await settle(400);
  }
}

async function letResolve() {
  for (let i = 0; i < 8 && (state?.stack ?? []).length > 0; i++) {
    await answerAsks();
    if (input?.buttons?.ok?.enabled) act('buttonOk');
    await settle(500);
  }
}

function finishRec(rec, ok) {
  rec.ok = ok;
  results.push(rec);
  done.add(`${rec.card}:${rec.scenario}`);
  const tag = ok === true ? 'PASS' : ok === false ? 'FAIL' : 'NOTE';
  say(`${tag} ${rec.card} [${rec.scenario}] ${rec.detail}`);
  if (ok === false) fail(`${rec.card} [${rec.scenario}]: ${rec.detail}`);
  return rec;
}

// --- the cast with an additional cost, and the land -----------------------------------
async function castSplinters(card) {
  const before = snap();
  const rec = { card: card.name, cardId: card.id, cost: 'cast: {B} and sacrifice a creature (additional cost)', scenario: 'cancel1', ok: false, detail: '', prompts: [] };
  const p1 = next((f) => costPrompt(f), 4000);
  act('clickCard', { cardId: card.id });
  let p = await p1;
  if (p === null) { rec.detail = 'no prompt after the click'; return finishRec(rec, false); }
  rec.prompts.push(describe(p));
  // A targeting prompt first: a creature to destroy (the opponent's).
  if (/target/i.test(String(p.body.prompt))) {
    const theirs = (p.body.selectable?.cardIds ?? []).find((id) => !zone(mine(), 'battlefield').some((c) => c.id === id));
    const target = theirs ?? (p.body.selectable?.cardIds ?? [])[0];
    if (target === undefined) { await cancelOut(); rec.detail = 'no target to choose'; return finishRec(rec, null); }
    const p2 = nextPrompt(String(p.body.prompt), 4000);
    act('clickCard', { cardId: target });
    p = await p2;
    if (p === null) { await settle(); rec.detail = `no cost prompt after the target (${diff(before, snap()).join('; ')})`; return finishRec(rec, false); }
    p = await settled(p);
    rec.prompts.push(describe(p));
  }
  // The mana first (Auto), so the Cancel below is at the sacrifice, after a
  // cost part was paid: is the mana given back too?
  if (/Pay Mana/.test(String(p.body.prompt)) && p.body.buttons?.ok?.enabled) {
    const p3 = nextPrompt(String(p.body.prompt), 4000);
    act('buttonOk');
    const q = await p3;
    if (q !== null) { p = await settled(q); rec.prompts.push(describe(p)); rec.manaPaidFirst = true; }
  }
  rec.cancelOffered = p.type === 'ask' ? true : p.body.buttons?.cancel?.enabled === true;
  const atSacrifice = /sacrific/i.test(String(p.body.prompt)) && !/Pay Mana/.test(String(p.body.prompt));
  if (p.type === 'ask') answer(p.body.askId, null); else act('buttonCancel');
  await settle(700);
  const d = diff(before, snap());
  rec.restored = d.length === 0;
  rec.detail = (d.length === 0
    ? `Cancel at the ${atSacrifice ? 'sacrifice prompt, after the mana was paid,' : 'cost prompt'} put Bone Splinters back: the board is as before`
    : `after Cancel the board differs: ${d.join('; ')}`);
  if (!atSacrifice && d.length === 0 && ++splintersTries < 4) {
    // The mana could not be paid (no black source untapped): the cancel is
    // still checked, and the sacrifice prompt is tried again on a later turn.
    say(`NOTE Bone Splinters: ${rec.detail} -- the sacrifice prompt not reached, trying again later`);
    return rec;
  }
  return finishRec(rec, d.length === 0 && rec.cancelOffered);
}

async function tapLand(land) {
  const before = snap();
  const rec = { card: land.name, cardId: land.id, cost: '{T}: add mana (an undoable mana ability)', scenario: 'landTap', ok: false, detail: '', prompts: [] };
  const menu = next((f) => f.type === 'ask' && f.body.kind === 'ability_menu', 1500);
  act('clickCard', { cardId: land.id });
  const m = await menu;
  await settle(500);
  const mid = snap();
  if (m !== null) {
    answer(m.body.askId, null);
    rec.detail = 'a click on a basic land raised a menu (the undoable mana shortcut is gone)';
    return finishRec(rec, false);
  }
  const tapped = mid.pool > before.pool;
  // Forge's undo, when the engine offers one (state.undo.can): the tap given back.
  let undoNote = 'the engine offered no undo here';
  if (state?.undo?.can === true) {
    const after = next((f) => f.type === 'state' && f.body.undo?.depth === 0, 4000);
    act('undo');
    await after;
    await settle(300);
    const d = diff(before, snap());
    undoNote = d.length === 0 ? 'undo gave it back' : `undo left: ${d.join('; ')}`;
  }
  rec.detail = `no menu: tapped at once (pool ${before.pool} -> ${mid.pool}); ${undoNote}`;
  return finishRec(rec, tapped);
}

// --- the game loop ------------------------------------------------------------------
async function answerAsks() {
  for (const [id, a] of [...asks]) {
    const b = a.body;
    if (b.kind === 'ability_menu') { answer(id, null); continue; }
    answer(id, legalAnswer(b));
  }
}

let landTurn = -1;
const castTried = new Set();
let splintersTries = 0;   // `${turn}:${name}`: one try a turn, so an unpayable cast is not a loop
let landTapDone = false;
async function myMain() {
  const p = mine();
  const bf = zone(p, 'battlefield');
  const turn = state.turn;
  // 1. probe a permanent the engine says may be activated now
  const activatable = new Set((state.activatable ?? []).map((e) => e.cardId));
  for (const c of bf) {
    const spec = PERMANENTS[c.name];
    if (!spec || !activatable.has(c.id)) continue;
    const todo = SCENARIOS.find((s) => !done.has(`${c.name}:${s}`));
    if (!todo) continue;
    await runScenario(c, spec, todo);
    return true;
  }
  // 2. the additional-cost cast, once
  const playable = new Map((state.playable ?? []).map((e) => [e.cardId, e]));
  const splinters = zone(p, 'hand').find((c) => c.name === 'Bone Splinters' && playable.has(c.id));
  if (splinters && !done.has('Bone Splinters:cancel1') && zone(p, 'battlefield').some(isCreature)
      && !castTried.has(`${turn}:Bone Splinters`)) {
    castTried.add(`${turn}:Bone Splinters`);
    await castSplinters(splinters);
    return true;
  }
  // 3. the land shortcut, once
  if (!landTapDone) {
    const land = bf.find((c) => isLand(c) && !c.tapped);
    if (land) { landTapDone = true; await tapLand(land); return true; }
  }
  // 4. play a land, then cast a probe permanent
  if (landTurn !== turn) {
    const land = zone(p, 'hand').find((c) => isLand(c) && playable.has(c.id));
    if (land) { landTurn = turn; act('clickCard', { cardId: land.id }); await settle(); return true; }
  }
  const want = zone(p, 'hand').find((c) => PERMANENTS[c.name] && playable.has(c.id) && !castTried.has(`${turn}:${c.name}`)
    && !SCENARIOS.every((s) => done.has(`${c.name}:${s}`)) && !bf.some((b) => b.name === c.name));
  if (want) {
    castTried.add(`${turn}:${want.name}`);
    const pay = next((f) => f.type === 'input' && /Pay Mana/.test(String(f.body.prompt)), 3000);
    act('clickCard', { cardId: want.id });
    const pm = await pay;
    if (pm) {
      if (pm.body.buttons?.ok?.enabled) act('buttonOk'); else act('buttonCancel');
    }
    await settle(600);
    await answerAsks();
    return true;
  }
  return false;
}

async function loop() {
  const deadline = Date.now() + args.timeoutS * 1000;
  let idle = 0;
  while (!over && Date.now() < deadline) {
    await settle(350);
    if (over) break;
    if (asks.size) { await answerAsks(); continue; }
    if (!state || !input) { await new Promise((r) => setTimeout(r, 200)); continue; }
    const myTurn = state.activePlayer === me;
    const main = state.phase === 'MAIN1' || state.phase === 'MAIN2';
    if (priorityInput() && state.priority === me && myTurn && main && (state.stack ?? []).length === 0) {
      if (await myMain()) { idle = 0; continue; }
    }
    if (finished()) { act('concede'); await next((f) => f.type === 'over', 10000); break; }
    // Everything else: the engine's own default button -- pass, no attackers,
    // no blockers, pay mana with Auto (else cancel), keep the hand.
    const b = input.buttons ?? {};
    const sel = input.selectable?.cardIds ?? [];
    if (b.ok?.enabled) act('buttonOk');
    else if (sel.length) act('clickCard', { cardId: sel[0] });
    else if (b.cancel?.enabled) act('buttonCancel');
    else if (++idle > 30) { say('stuck: nothing to press'); break; }
    await next((f) => f.type === 'input' || f.type === 'state' || f.type === 'ask' || f.type === 'over', 5000);
  }
}

const finished = () => Object.keys(PERMANENTS).every((n) => SCENARIOS.slice(0, 2).every((s) => done.has(`${n}:${s}`)))
  && done.has('Bone Splinters:cancel1') && landTapDone;

function report(code) {
  const out = { port: args.port, failures, results };
  if (args.report) { mkdirSync(dirname(args.report), { recursive: true }); writeFileSync(args.report, JSON.stringify(out, null, 2) + '\n'); }
  if (args.frames) { mkdirSync(dirname(args.frames), { recursive: true }); writeFileSync(args.frames, frames.map((f) => JSON.stringify(f)).join('\n') + '\n'); }
  const by = (s) => results.filter((r) => r.scenario === s);
  process.stdout.write(`cost-probe: ${results.length} scenario(s), ${failures.length} failure(s)\n`);
  for (const r of results) process.stdout.write(`  ${r.ok === true ? 'PASS' : r.ok === false ? 'FAIL' : 'note'}  ${r.card.padEnd(22)} ${r.scenario.padEnd(8)} ${r.detail}\n`);
  void by;
  process.exit(code);
}

socket = new WebSocket(`ws://127.0.0.1:${args.port}/ws`);
const openTimer = setTimeout(() => { process.stderr.write('[cost-probe] the socket never opened\n'); process.exit(5); }, 15000);
socket.addEventListener('open', () => { clearTimeout(openTimer); loop().then(() => {
  const feeder = done.has('Carrion Feeder:look') && done.has('Carrion Feeder:cancel1');
  report(failures.length ? 3 : feeder ? 0 : 4);
}).catch((e) => { fail(`probe error: ${e.stack ?? e}`); report(3); }); });
socket.addEventListener('message', (e) => onFrame(String(e.data)));
socket.addEventListener('close', () => { over = true; });
setTimeout(() => { fail('timeout'); report(1); }, (args.timeoutS + 30) * 1000);
