// mtg-table — tools/llm-seat/lib/seat-core.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The seat's brain, without a socket: frames in, wire moves out.
//
//   onFrame(frame)   every s2c frame, in order
//   tick()           called once the stream has been quiet for SETTLE_MS (the
//                    runner's timer): decides at most one thing and sends at
//                    most one move, like tools/ws-auto-play.mjs's settled
//                    decisions -- an `input` is re-pushed every 250 ms while
//                    the engine waits (awaitNextInput), so an identical input
//                    is not news.
//
// Order of business at a tick: an open `ask` first (it blocks the game
// thread); then the next move of a decision already made (an attack is clicks
// then OK, sent one per tick, and dropped the moment the engine's prompt is no
// longer that decision's); then the current `input`.  A decision is posed to
// the model through an Arm, or auto-acted (decision.mjs says which), and the
// phase stops are synced (stops.mjs) before the decision's own moves go out.
//
// When the engine refuses a move (a `notice` while the same input stays up)
// the same decision is played again with the safe default, then with OK /
// Cancel / pass, so a refused click never loops; each refusal is counted.

import { classifyAsk, classifyInput, inputBinding, inputKindOf, movesFor, tokenFor } from './decision.mjs';
import { cardsById, nameOf } from './frames.mjs';
import { History } from './history.mjs';
import { snapshot } from './prompt.mjs';
import { desiredStops, stopActs, stopsText } from './stops.mjs';

/** The CLI failing this many decisions in a row stops the game (no allowance spent on fallbacks). */
export const MAX_MODEL_ERRORS = 3;

export const SETTLE_MS = 120;

/** A card whose play the engine cancelled this many times in one turn is not offered again that turn. */
export const MAX_CANCELLED = 2;
export const STALL_MS = 6000;

export function inputKey(body) {
  const sel = body?.selectable ?? {};
  const ok = body?.buttons?.ok ?? {};
  const cancel = body?.buttons?.cancel ?? {};
  return [String(body?.prompt ?? ''), (sel.cardIds ?? []).join(','), `${ok.label}${ok.enabled === true}`, `${cancel.label}${cancel.enabled === true}`].join('|');
}

export class SeatCore {
  /**
   * @param {object} o
   * @param {(move)=>void} o.send     puts one act/answer on the wire
   * @param {Arm} o.arm               the context arm (model inside)
   * @param {object} o.oracle
   * @param {(rec)=>void} o.log       one decision record
   * @param {boolean} [o.useStops]    sync phase stops (default true)
   * @param {object} [o.opts]         decision options (battlefieldAbilities)
   * @param {()=>number} [o.now]
   */
  constructor({ send, arm, oracle, log = () => {}, useStops = true, opts = {}, now = () => Date.now(), say = () => {} }) {
    Object.assign(this, { send, arm, oracle, log, useStops, opts, now, say });
    this.history = new History(null);
    this.me = null;
    this.gameId = null;
    this.state = null;
    this.stateSeq = null;
    this.input = null;
    this.inputSeq = null;
    this.asks = new Map();
    this.answered = new Set();
    this.queue = [];             // [{move, bind}]
    this.busy = false;
    this.intent = null;          // {cardId, abilityId, label}: the ability chosen at priority
    this.requested = [];         // the model's last `next:` stops
    this.pending = null;         // {key, at, attempt}: the input we last acted on
    this.refusedAt = null;
    this.previousNote = null;
    this.decisionNo = 0;
    this.over = null;
    this.order = 0;              // frame counter: which came last, a state or an input
    this.stateOrder = 0;
    this.inputOrder = 0;
    this.movedAt = null;         // when the seat last put a move on the wire
    this.modelErrors = 0;
    this.fatal = null;
    this.lastClick = null;       // {cardId, zone, stateSeq}: a card clicked at priority, until we see what became of it
    this.cancelled = new Map();  // cardId -> how many times this turn its play came back cancelled
    this.lastCancel = null;      // {cardId, name, count}: the newest cancelled play
    this.cancelTurn = null;
    this.stats = { decisions: 0, model: 0, auto: 0, fallback: 0, retries: 0, refused: 0, stale: 0, modelCalls: 0, promptBytes: 0, tokensIn: 0, tokensOut: 0, cacheRead: 0, cacheCreate: 0, costUsd: 0, modelMs: 0 };
  }

  onFrame(frame) {
    this.history.push(frame);
    const b = frame.body ?? {};
    this.order += 1;
    if (frame.type === 'state') this.stateOrder = this.order;
    if (frame.type === 'input') this.inputOrder = this.order;
    switch (frame.type) {
      case 'hello_ok':
        if (typeof b.you === 'number') this.me = b.you;
        this.gameId = b.gameId ?? this.gameId;
        break;
      case 'state':
        this.state = b;
        this.stateSeq = frame.seq;
        if (b.turn !== this.cancelTurn) { this.cancelTurn = b.turn; this.cancelled = new Map(); this.lastCancel = null; }
        if (this.lastClick && (b.events ?? []).some((e) => (e.kind === 'cast' || e.kind === 'land') && e.cardId === this.lastClick.cardId)) this.lastClick = null;
        break;
      case 'input': {
        const changed = this.input === null || inputKey(b) !== inputKey(this.input);
        this.input = b;
        if (changed) this.inputSeq = frame.seq;
        break;
      }
      case 'ask':
        if (!this.answered.has(String(b.askId))) this.asks.set(String(b.askId), { body: b, seq: frame.seq });
        break;
      case 'notice':
        if (this.pending && /Not selectable|Not now|Not yet|Illegal|cannot/i.test(`${b.title} ${b.text}`)) this.refusedAt = this.now();
        break;
      case 'over':
        this.over = b;
        break;
      default:
        break;
    }
  }

  emit(move, why) {
    if (move.type === 'answer') {
      this.answered.add(move.askId);
      this.asks.delete(move.askId);
    }
    this.say(`${move.type === 'act' ? 'ACT ' : 'ANSW'} ${JSON.stringify(move)}  (${why})`);
    if (!(move.type === 'act' && move.action === 'setPhaseStop')) this.movedAt = this.now();
    if (move.type === 'act' && move.action === 'clickCard' && this.input && inputKindOf(this.input, this.state, this.me) === 'priority') {
      const c = cardsById(this.state).get(move.cardId);
      this.lastClick = c ? { cardId: move.cardId, zone: c.zone, stateSeq: this.stateSeq, name: nameOf(c) } : null;
    }
    this.send(move);
  }

  /** The current input's decision, or null when there is no input to act on. */
  currentInputDecision() {
    if (!this.input || !this.state || this.me === null) return null;
    const d = classifyInput({ state: this.state, input: this.input, me: this.me, oracle: this.oracle, opts: this.opts });
    if (d.kind === 'priority') {
      this.checkCancelled();
      guardCancelled(d, this.cancelled);
    }
    return d;
  }

  /**
   * Back at priority after a click on a card: did the play happen?  A card
   * still in the zone it was clicked in, with nothing of it on the stack and no
   * cast / land event, was cancelled (an optional cost or a target it could not
   * choose, mana it could not pay).  Counted per card per turn: the LOOP GUARD
   * (a fake-model game cast the same card 1,900 times, choosing a Teamwork cost
   * it could not pay).
   */
  checkCancelled() {
    const lc = this.lastClick;
    if (!lc || lc.stateSeq === this.stateSeq) return;
    this.lastClick = null;
    const c = cardsById(this.state).get(lc.cardId);
    const onStack = (this.state.stack ?? []).some((it) => it.sourceCardId === lc.cardId);
    if (!c || c.zone !== lc.zone || onStack) return;
    const n = (this.cancelled.get(lc.cardId) ?? 0) + 1;
    this.cancelled.set(lc.cardId, n);
    this.lastCancel = { cardId: lc.cardId, name: lc.name, count: n };
    this.say(`CANCELLED: the play of ${lc.name ?? `card ${lc.cardId}`} came back (${n} this turn)`);
  }

  syncStops() {
    if (!this.useStops || !this.state || this.me === null) return;
    const want = desiredStops(this.state, this.me, this.requested, this.oracle);
    const acts = stopActs(this.state, this.me, want);
    if (acts.length) {
      this.say(`STOPS -> ${stopsText(want)}`);
      for (const a of acts) this.emit(a, 'phase stop');
    }
  }

  async tick() {
    if (this.busy || this.over) return;
    // 1. an open ask
    const first = this.asks.values().next();
    if (!first.done) {
      const { body, seq } = first.value;
      const d = classifyAsk({ state: this.state, ask: body, intent: this.intent, me: this.me, oracle: this.oracle });
      if (body.kind === 'ability_menu') this.intent = null;
      await this.run(d, { askId: String(body.askId), frameSeq: seq });
      return;
    }
    // 2. the rest of a decision already made
    if (this.queue.length) {
      const kind = this.input ? inputKindOf(this.input, this.state, this.me) : null;
      const bind = this.input ? inputBinding(kind, this.input) : null;
      if (bind === this.queue[0].bind) {
        const { move } = this.queue.shift();
        this.pending = { key: this.keyNow(), at: this.now(), attempt: this.pending?.attempt ?? 0 };
        this.emit(move, 'continued');
        return;
      }
      this.say(`DROP ${this.queue.length} queued move(s): the engine moved on (${bind} != ${this.queue[0].bind})`);
      this.queue = [];
    }
    // 3. the current input
    const d = this.currentInputDecision();
    if (!d) return;
    // After a move, a state with no input pushed after it means the engine is still
    // working on that move: the prompt in hand is the old one (6 s at most, then go on).
    if (this.movedAt !== null && this.inputOrder < this.stateOrder && this.now() - this.movedAt < STALL_MS) return;
    const key = this.keyNow();
    let attempt = 0;
    if (this.pending && this.pending.key === key) {
      const refused = this.refusedAt !== null && this.refusedAt >= this.pending.at;
      const stalled = this.now() - this.pending.at > STALL_MS;
      if (!refused && !stalled) return;   // our move is still with the engine
      attempt = this.pending.attempt + 1;
      if (refused) this.stats.refused += 1;
      this.refusedAt = null;
    }
    if (d.auto && d.auto.moves.length === 0) {
      if (d.kind === 'target-wait' && attempt === 0 && this.pending?.key !== key) {
        this.pending = { key, at: this.now(), attempt: 0 };   // give the selectables a moment
        return;
      }
      if (d.kind === 'target-wait' && this.input?.buttons?.cancel?.enabled) {
        this.queue = [];
        this.pending = { key, at: this.now(), attempt };
        this.emit({ type: 'act', action: 'buttonCancel' }, 'targeting prompt with nothing to select: cancel');
      }
      return;
    }
    await this.run(d, { inputKey: key, attempt, frameSeq: this.inputSeq });
  }

  keyNow() { return `${inputKey(this.input)}#${this.stateSeq}`; }

  /** Pose one decision (or auto-act it), then queue its moves. */
  async run(d, { askId = null, inputKey: key = null, attempt = 0, frameSeq = null }) {
    this.decisionNo += 1;
    this.stats.decisions += 1;
    const rec = {
      game: this.gameId, seat: this.me, decision: this.decisionNo, stateSeq: this.stateSeq, frameSeq,
      turn: this.state?.turn ?? null, phase: this.state?.phase ?? null, kind: d.kind, prompt: String(d.prompt ?? '').split('\n')[0].slice(0, 160),
      options: d.options.map((o) => o.label), gradeType: d.gradeType, attempt, arm: this.arm.spec.name,
    };
    let moves;
    if (d.auto) {
      rec.how = 'auto';
      rec.reason = d.auto.reason;
      moves = attempt >= 2 ? escalation(this.input) : d.auto.moves;
      if (attempt >= 2) rec.reason += ' (refused twice: escalated)';
      this.stats.auto += 1;
    } else if (attempt > 0) {
      // the engine refused the last move on this very input: the safe default, then the buttons
      rec.how = 'fallback';
      rec.reason = attempt === 1 ? 'the engine refused the chosen move' : 'the engine refused the default too';
      rec.chosen = d.fallback;
      moves = attempt === 1 ? movesFor(d, d.fallback) : escalation(this.input);
      this.stats.fallback += 1;
      this.previousNote = `Note: the engine refused your last choice on "${rec.prompt}"; the default was played instead.`;
    } else {
      this.busy = true;
      try {
        const snap = snapshot({ history: this.history, state: this.state, me: this.me, decision: d, oracle: this.oracle });
        const res = await this.arm.decide(snap, d, { previous: this.previousNote });
        this.previousNote = null;
        Object.assign(rec, {
          how: res.how, chosen: res.chosen, next: res.next, arm: res.arm, sessionPos: res.sessionPos, fullContext: res.full,
          retries: res.retries, calls: res.calls,
        });
        this.stats.modelCalls += res.calls.length;
        this.stats.retries += res.retries;
        for (const c of res.calls) {
          this.stats.promptBytes += c.promptBytes ?? 0;
          this.stats.modelMs += c.ms ?? 0;
          if (c.usage) {
            this.stats.tokensIn += c.usage.input ?? 0;
            this.stats.tokensOut += c.usage.output ?? 0;
            this.stats.cacheRead += c.usage.cacheRead ?? 0;
            this.stats.cacheCreate += c.usage.cacheCreate ?? 0;
          }
          if (typeof c.costUsd === 'number') this.stats.costUsd += c.costUsd;
        }
        const callErr = res.calls.find((c) => c.transport)?.error ?? null;
        if (callErr !== null && res.how === 'fallback' && res.calls.every((c) => c.transport)) {
          // the model never answered (the CLI failed): say why, and stop the game after 3 in a row
          this.modelErrors += 1;
          this.say(`MODEL ERROR ${this.modelErrors} in a row: ${String(callErr).slice(0, 500)}`);
          if (this.modelErrors >= MAX_MODEL_ERRORS) this.fatal = `model error ${this.modelErrors} times in a row: ${String(callErr).slice(0, 300)}`;
        } else {
          this.modelErrors = 0;
        }
        if (res.how === 'fallback') {
          this.stats.fallback += 1;
          this.previousNote = 'Note: your last reply could not be used; the default option was played.';
        } else {
          this.stats.model += 1;
        }
        if (res.next !== null && res.next !== undefined) this.requested = res.next;
        else if (res.how === 'model') this.requested = [];
        moves = movesFor(d, res.chosen);
        rec.token = tokenFor(d, res.chosen);
        const intentOpt = !d.multi && res.chosen.length === 1 ? d.options[res.chosen[0] - 1] : null;
        if (intentOpt?.intent) this.intent = { ...intentOpt.intent, label: intentOpt.label };
      } finally {
        this.busy = false;
      }
      // still the same decision?  (an ask answered by a timeout, an input that moved on)
      const stale = askId !== null ? !this.asks.has(askId) : this.keyNow() !== key;
      if (stale) {
        rec.stale = true;
        this.stats.stale += 1;
        this.log(rec);
        this.say(`STALE decision ${this.decisionNo}: the engine moved on while the model thought`);
        return;
      }
      if (rec.how === 'model') rec.chosenLabels = res2labels(d, rec.chosen);
    }
    if (d.auto === null || d.auto === undefined) {
      if (rec.how === 'fallback' && rec.chosen) rec.chosenLabels = res2labels(d, rec.chosen);
    }
    this.log(rec);
    if (rec.how !== 'auto') this.syncStops();
    const bind = d.source === 'input' ? d.bind : null;
    const [firstMove, ...rest] = moves;
    this.queue = d.source === 'input' ? rest.map((move) => ({ move, bind })) : [];
    if (d.source === 'ask') {
      for (const m of moves) this.emit(m, `${rec.how} ${d.kind}`);
    } else if (firstMove) {
      this.pending = { key: key ?? this.keyNow(), at: this.now(), attempt };
      this.emit(firstMove, `${rec.how} ${d.kind}`);
    }
  }
}

/** Takes out of a priority decision every card whose play was cancelled MAX_CANCELLED times this turn. */
export function guardCancelled(d, cancelled) {
  const out = d.options.filter((o) => typeof o.cardId === 'number' && (cancelled.get(o.cardId) ?? 0) >= MAX_CANCELLED);
  if (!out.length) return d;
  d.options = d.options.filter((o) => !out.includes(o));
  d.options.forEach((o, i) => { o.n = i + 1; });
  d.context.push(`(Not offered again this turn: the engine cancelled the play of ${[...new Set(out.map((o) => o.label.replace(/^(Cast|Play land|Activate an ability of) /, '').split(' [')[0]))].join(', ')} twice.)`);
  if (d.options.length === 1 && !d.auto) d.auto = { reason: 'priority with nothing playable (the rest was cancelled twice this turn)', moves: d.options[0].moves };
  return d;
}

function res2labels(d, chosen) {
  return (chosen ?? []).map((n) => d.options[n - 1]?.label ?? `?${n}`);
}

/** After two refusals on the same input: whatever lets the game go on. */
function escalation(input) {
  if (input?.buttons?.ok?.enabled) return [{ type: 'act', action: 'buttonOk' }];
  if (input?.buttons?.cancel?.enabled) return [{ type: 'act', action: 'buttonCancel' }];
  return [{ type: 'act', action: 'passPriority' }];
}
