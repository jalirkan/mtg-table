// mtg-table — tools/llm-seat/lib/plan-core.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// PLAN MODE (D419): the model plays the way a person uses an assistant.  It
// is shown the game plainly, asked what to do this turn in plain words, and
// answers with a few steps (plan.mjs); this file carries the steps out on the
// engine and asks again only when something needs it.
//
// WHEN THE MODEL IS ASKED (a "moment"; each a fresh `claude -p` with the full
// picture under the `fresh` arm, a message in one session under session:N):
//   turn       the seat's first decision of its own turn that is not forced
//              (its first main phase, or the attack declaration when the main
//              phase had nothing to play): "It is your turn N. What do you do?"
//   mulligan / play-draw   at the start of the game
//   response   the opponent's spell or ability on top of the stack, once per
//              item, when the seat could respond (state.playable not empty)
//   blocks     the block declaration, when a block is possible
//   end-step   the opponent's end step, once a turn, when the seat could cast
//              or activate something there (the default stops, stops.mjs)
//   question   an engine question the plan did not answer (a target the step
//              did not name, a choice a card asks for)
//   correction a step that cannot be done -- a name that matches nothing, a
//              card the untapped mana cannot pay for, a step the engine does
//              not offer, a click the engine refused (a `notice`), a spell it
//              could not pay for -- or a reply that cannot be read: the model
//              is told exactly why, what was done, and asked for corrected
//              steps from here.  At most MAX_CORRECTIONS per moment, then the
//              safe default (pass / no attack / no blocks / keep / the ask's
//              own default), counted as a fallback.
// Everything else is code: mana is the engine's Auto, priority with no step
// left is passed, an engine question with one legal answer is answered, and a
// spell of the seat's own on the stack is let resolve.
//
// EXECUTION.  Steps run in order against what the wire offers:
// `state.playable` (M61) and `state.activatable` (M63; on an older engine the
// battlefield abilities read off the card text) at priority (decision.mjs's
// options; "activate <permanent>: <ability>" names one of several), the attack
// candidates and block pairs read off the board, an ask's options, `input.selectable`.  `cast X -> Y` answers the targeting
// question that follows with Y.  An attack step waits for the declaration
// (priority before combat is passed to get there); steps after it run in the
// second main phase.  The engine is the rules judge throughout.

import { checkChoice, classifyAsk, inputBinding, inputKindOf, movesFor } from './decision.mjs';
import { visibleNames } from './history.mjs';
import { hasKeyword, isCreature, isLand, nameOf, playersOf } from './frames.mjs';
import { activationProblem, payProblem, availableMana, parseCost, zoneCost } from './mana.mjs';
import { needsTap } from './oracle.mjs';
import { parseArm } from './arms.mjs';
import { newSessionId } from './model.mjs';
import { abilitySplits, matchAbility, matchRef, normName, parseRef, parsePlan, splitNames, stepText } from './plan.mjs';
import { Namer, PLAN_SYSTEM, phaseWords, planDeltaPrompt, planFullPrompt, planProgress, stackItemWords } from './plan-prompt.mjs';
import { MAX_CANCELLED, MAX_MODEL_ERRORS, STALL_MS, SeatCore, inputKey } from './seat-core.mjs';

/** The face names of a two-faced card from its card text ("A: … // B: …"); [] for one face. */
export function faceNamesOf(text) {
  if (!text || !text.includes(' // ')) return [];
  return text.split(' // ').map((part) => /^([^:]{2,60}):/.exec(part)?.[1]?.trim()).filter(Boolean);
}

export const MAX_CORRECTIONS = 2;

const PRIORITY_VERBS = new Set(['play land', 'cast', 'activate']);
const BEFORE_COMBAT = new Set(['UPKEEP', 'DRAW', 'MAIN1', 'COMBAT_BEGIN']);
const BEFORE_BLOCKS = new Set([...BEFORE_COMBAT, 'COMBAT_DECLARE_ATTACKERS']);
const REFUSAL = /Not selectable|Not now|Not yet|Illegal|cannot|can't|invalid/i;

const act = (action, extra = {}) => ({ type: 'act', action, ...extra });

// ---------------------------------------------------------------------------
// The asker: one model call, under the arm's context rule
// ---------------------------------------------------------------------------

export class PlanAsker {
  constructor(spec, model, { system = PLAN_SYSTEM, onPrompt = null } = {}) {
    this.spec = typeof spec === 'string' ? parseArm(spec) : spec;
    this.model = model;
    this.system = system;
    this.onPrompt = onPrompt;
    this.resets = 0;
    this.calls = 0;
    this.session = null;
    this.inSession = 0;
    this.since = null;
    this.shown = new Set();
  }

  /**
   * ask(build) -> {text, call}.  `build({full, since, shown})` returns
   * {user, mark, names}: the full picture, or (inside a session) what changed.
   */
  async ask(build, attempt = 0) {
    const sessionArm = this.spec.kind === 'session';
    const full = !sessionArm || !this.session?.started || this.inSession >= this.spec.n;
    if (sessionArm && full) {
      if (this.session) this.resets += 1;
      this.session = { id: newSessionId(), started: false };
      this.inSession = 0;
      this.since = null;
      this.shown = new Set();
    }
    const { user, mark, names } = build({ full, since: this.since, shown: this.shown });
    const session = sessionArm ? { id: this.session.id, resume: this.session.started } : null;
    if (this.onPrompt) this.onPrompt({ arm: this.spec.name, attempt, system: this.system, user, session });
    const call = {
      attempt, promptBytes: Buffer.byteLength(user, 'utf8'), systemBytes: Buffer.byteLength(this.system, 'utf8'),
      full, sessionPos: sessionArm ? this.inSession : 0,
    };
    const t0 = Date.now();
    let res;
    try {
      res = await this.model.call({ system: this.system, user, session });
    } catch (e) {
      Object.assign(call, { error: String(e.message ?? e), transport: true, ms: Date.now() - t0 });
      return { text: null, call };
    }
    this.calls += 1;
    if (session) {
      this.session.started = true;
      if (res.sessionId) this.session.id = res.sessionId;
      this.inSession += 1;
      this.since = mark;
      for (const n of names) this.shown.add(n);
    }
    const text = String(res.text ?? '');
    Object.assign(call, {
      replyBytes: Buffer.byteLength(text, 'utf8'), usage: res.usage ?? null, costUsd: res.costUsd ?? null,
      ms: res.ms ?? (Date.now() - t0), reply: text.slice(0, 2000),
    });
    return { text, call };
  }
}

// ---------------------------------------------------------------------------
// The questions, in words (exported for the dry run and the tests)
// ---------------------------------------------------------------------------

export function turnQuestion(state, atAttack = false) {
  return atAttack
    ? `It is your turn ${state.turn}. You are at the declaration of attackers (your first main phase had nothing you could play). What do you do this turn?`
    : `It is your turn ${state.turn}. What do you do this turn?`;
}

export function mulliganQuestion(state, me) {
  const n = playersOf(state, me).mine?.zones?.hand?.count ?? 0;
  return `The game is starting. Your opening hand is shown below (${n} cards). Do you keep it? Reply with the single step "keep" or "mulligan".`;
}

export const PLAY_DRAW_QUESTION = 'You won the coin toss. Do you play first or draw first? Reply with the single step "choose play" or "choose draw".';

export function responseQuestion(item, state, me, plan) {
  const verb = item.isAbility ? 'put an ability on the stack:' : 'cast';
  return [
    `This just happened: the opponent ${verb} ${stackItemWords(item, state, me).replace(/^the opponent's /, '')}. It is on the stack now.`,
    `Your plan was: ${planProgress(plan)}.`,
    'What do you do now? To let it resolve, reply with the single step "pass".',
  ].join('\n');
}

export function blocksQuestion(d, state) {
  const namer = new Namer(state);
  const attackers = [...new Set(d.options.filter((o) => !o.none).map((o) => o.attackerId))].map((id) => namer.permanent(namer.cards.get(id)));
  const blockers = [...new Set(d.options.filter((o) => !o.none).map((o) => o.blockerId))].map((id) => namer.permanent(namer.cards.get(id)));
  return [
    `The opponent attacks with: ${attackers.join('; ')}.`,
    `Your untapped creatures: ${blockers.join('; ')}.`,
    'Declare your blockers: one step "block <attacker> with <your creature>" per block, or the single step "pass" for no blocks. Steps after the blocks (a spell or an ability) are carried out once the blocks are declared.',
  ].join('\n');
}

export function endStepQuestion(state, me, oracle) {
  return `It is the opponent's end step (turn ${state.turn}). You have ${availableMana(state, me, oracle).total} untapped mana. Do you cast or activate anything before your turn? If not, reply with the single step "pass".`;
}

/** The engine's question and its legal answers in words. */
export function choicesWords(d, state) {
  const namer = new Namer(state);
  const words = d.options.map((o) => {
    if (typeof o.cardId === 'number' && namer.cards.has(o.cardId)) {
      const c = namer.cards.get(o.cardId);
      const whose = c.controller === undefined ? '' : c.zone === 'hand' ? '' : c.controller === state.__me ? ' (yours)' : " (the opponent's)";
      return `${namer.name(c)}${whose}`;
    }
    const pid = o.moves?.[0]?.playerId;
    if (typeof pid === 'number') return pid === state.__me ? 'me' : 'opponent';
    return String(o.label);
  });
  const many = d.multi ? ` (choose ${d.min === d.max ? d.min : `${d.min} to ${d.max}`}${d.min === 0 ? '; "choose none" for none' : ''})` : '';
  return { prompt: String(d.prompt ?? '').replace(/\s*\n+\s*/g, ' / ').trim(), choices: `${words.join('; ')}${many}` };
}

export function questionText(d, state, me, { plan = null, about = null } = {}) {
  const s = { ...state, __me: me };
  const { prompt, choices } = choicesWords(d, s);
  const head = about && /target/i.test(prompt) ? `${about} needs a target: which?` : `The engine asks you: ${prompt || '(no words)'}`;
  return [
    head,
    `${/target/i.test(prompt) ? 'Legal targets' : 'Choices'}: ${choices}.`,
    ...(plan ? [`Your plan was: ${planProgress(plan)}.`] : []),
    'Answer with step 1 "target <name>" or "choose <option>", in the words shown. Add more steps only to change the rest of your plan: they replace it.',
  ].join('\n');
}

export function correctionQuestion({ step, why, plan, n, engineAsks = null }) {
  const done = plan.steps.slice(0, step.n - 1).map((s) => stepText(s));
  return [
    `${stepText(step)[0].toUpperCase()}${stepText(step).slice(1)} cannot be done: ${why}.`,
    done.length ? `Done so far: ${done.join(', ')}.` : 'Nothing of this plan was done yet.',
    `Your plan was: ${planProgress({ ...plan, i: step.n - 1 })}.`,
    ...(engineAsks ? [engineAsks] : []),
    `Give corrected steps from here; what was done stays done. (Correction ${n} of ${MAX_CORRECTIONS}; after that the program plays it safe.)`,
  ].join('\n');
}

export function invalidQuestion({ error, reply, question, n }) {
  return [
    `Your last reply could not be read by the program: ${error}.`,
    'Your reply was:',
    String(reply ?? '').slice(0, 600),
    '',
    `Reply again in the format of the system prompt (PLAN:, STEPS:, END). (Correction ${n} of ${MAX_CORRECTIONS}.)`,
    '',
    question,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// The core
// ---------------------------------------------------------------------------

export class PlanCore extends SeatCore {
  /**
   * @param {object} o  SeatCore's, plus `asker` (a PlanAsker) in place of `arm`.
   */
  constructor(o) {
    super({ ...o, arm: o.asker });
    this.asker = o.asker;
    this.plans = [];             // a stack: [0] the turn's plan, then moments that interrupted it
    this.turnSeen = null;
    this.turnPlanned = false;
    this.endStepAsked = false;
    this.blocksAsked = false;
    this.seenStack = new Set();
    this.landsPlayed = 0;
    this.exec = null;            // {plan, step, key, at}: a step whose move is with the engine
    this.lastCast = null;        // {plan, step, card}: the last cast/activate, for a payment the engine could not make
    this.payFailure = null;
    this.pendingTargets = null;  // {plan, step, text}: `cast X -> Y`'s Y, for the question that follows
    this.lastNotice = null;
    this.momentNo = 0;
    this.stopsAt = null;
    Object.assign(this.stats, { moments: {}, corrections: 0, invalid: 0, stepsSent: 0, stepsFailed: 0, transportErrors: 0 });
  }

  onFrame(frame) {
    super.onFrame(frame);
    const b = frame.body ?? {};
    if (frame.type === 'notice' && REFUSAL.test(`${b.title} ${b.text}`)) {
      this.lastNotice = [b.title, b.text].filter((x) => typeof x === 'string' && x !== '').join(': ');
      if (this.queue.length || this.exec) this.refusedAt = this.now();
    }
    if (frame.type === 'state') {
      if (b.turn !== this.turnSeen) {
        this.turnSeen = b.turn;
        this.plans = [];
        this.turnPlanned = false;
        this.endStepAsked = false;
        this.blocksAsked = false;
        this.landsPlayed = 0;
        this.pendingTargets = null;
      }
      for (const e of b.events ?? []) if (e.kind === 'land' && e.player === this.me) this.landsPlayed += 1;
      // what the engine last listed as playable from the graveyard: delve keeps those (M61)
      if (Array.isArray(b.playable)) this.gyPlayable = new Set(b.playable.filter((e) => e.zone === 'graveyard').map((e) => e.cardId));
    }
  }

  /** For a delve the engine asks about while a step's spell is being paid (mana.mjs delveCount / delvePick). */
  delveContext() {
    const cast = this.lastCast;
    let reserve = 0;
    const plan = cast?.plan ?? null;
    if (plan) {
      const hand = [...new Namer(this.state).cards.values()].filter((c) => c.zone === 'hand' && c.owner === this.me);
      for (const st of plan.steps.slice(plan.i)) {
        if (st.verb !== 'cast') continue;
        const c = hand.find((h) => normName(nameOf(h) ?? '') === parseRef(st.name).name && h.id !== cast.card?.id);
        if (c) reserve += parseCost(c.manaCost ?? '').mv;
      }
    }
    return { casting: cast?.card ?? null, reserve, keep: this.gyPlayable ?? new Set() };
  }

  /** The plan whose steps run now (an interrupting moment's, else the turn's). */
  current() {
    while (this.plans.length > 1 && this.plans.at(-1).i >= this.plans.at(-1).steps.length) this.plans.pop();
    const top = this.plans.at(-1);
    if (top && top.kind !== 'turn' && top.i >= top.steps.length) { this.plans.pop(); return null; }
    return top ?? null;
  }

  extraSummary() {
    return {
      mode: 'plan', moments: this.stats.moments, corrections: this.stats.corrections, invalidReplies: this.stats.invalid,
      stepsSent: this.stats.stepsSent, stepsFailed: this.stats.stepsFailed,
    };
  }

  async tick() {
    if (this.busy || this.over) return;
    const first = this.asks.values().next();
    if (!first.done) {
      const { body, seq } = first.value;
      const d = classifyAsk({ state: this.state, ask: body, intent: this.intent, me: this.me, oracle: this.oracle, delve: this.delveContext() });
      if (body.kind === 'ability_menu') this.intent = null;
      if (d.delve) this.lastDelve = { ...d.delve, card: this.lastCast?.card?.id ?? null };
      await this.handle(d, { askId: String(body.askId), frameSeq: seq, attempt: 0 });
      return;
    }
    if (this.queue.length) {
      const kind = this.input ? inputKindOf(this.input, this.state, this.me) : null;
      const bind = this.input ? inputBinding(kind, this.input) : null;
      if (this.exec && this.refusedAt !== null && this.refusedAt >= (this.pending?.at ?? 0)) {
        // a click of an attack / block the engine refused: the step failed
        this.queue = [];
        this.refusedAt = null;
        this.stats.refused += 1;
        const ex = this.exec;
        this.exec = null;
        const d = this.currentInputDecision();
        if (d) await this.handle(d, { inputKey: this.keyNow(), frameSeq: this.inputSeq, attempt: 0, failure: { plan: ex.plan, step: ex.step, why: `the engine refused it${this.lastNotice ? `: "${this.lastNotice}"` : ''}` } });
        return;
      }
      if (bind === this.queue[0].bind) {
        const { move } = this.queue.shift();
        this.pending = { key: this.keyNow(), at: this.now(), attempt: 0 };
        this.emit(move, 'continued');
        return;
      }
      this.say(`DROP ${this.queue.length} queued move(s): the engine moved on (${bind} != ${this.queue[0].bind})`);
      this.queue = [];
    }
    const d = this.currentInputDecision();
    if (!d) return;
    if (this.movedAt !== null && this.inputOrder < this.stateOrder && this.now() - this.movedAt < STALL_MS) return;
    const key = this.keyNow();
    if (this.exec && this.exec.key !== key) this.exec = null;   // the engine took the step
    let attempt = 0;
    if (this.pending && this.pending.key === key) {
      const refused = this.refusedAt !== null && this.refusedAt >= this.pending.at;
      const stalled = this.now() - this.pending.at > STALL_MS;
      if (!refused && !stalled) return;
      attempt = this.pending.attempt + 1;
      if (refused) this.stats.refused += 1;
      this.refusedAt = null;
      if (this.exec && this.exec.key === key) {
        const ex = this.exec;
        this.exec = null;
        const why = refused ? `the engine refused it${this.lastNotice ? `: "${this.lastNotice}"` : ''}` : 'the engine did not take it (nothing happened for 6 seconds)';
        await this.handle(d, { inputKey: key, frameSeq: this.inputSeq, attempt: 0, failure: { plan: ex.plan, step: ex.step, why } });
        return;
      }
      if (d.kind !== 'pay') {
        // a move of the program's own (a pass, a default) the engine would not take: the buttons
        const moves = escalate(this.input);
        this.pending = { key, at: this.now(), attempt };
        this.log(this.rec(d, { how: 'auto', reason: 'the engine refused a move: escalated' }));
        this.emit(moves[0], 'escalation');
        return;
      }
    }
    if (d.auto && d.auto.moves.length === 0) {
      if (d.kind === 'target-wait' && attempt === 0 && this.pending?.key !== key) {
        this.pending = { key, at: this.now(), attempt: 0 };
        return;
      }
      if (d.kind === 'target-wait' && this.input?.buttons?.cancel?.enabled) {
        this.queue = [];
        this.pending = { key, at: this.now(), attempt };
        this.emit(act('buttonCancel'), 'targeting prompt with nothing to select: cancel');
      }
      return;
    }
    await this.handle(d, { inputKey: key, frameSeq: this.inputSeq, attempt });
  }

  rec(d, extra = {}) {
    return {
      game: this.gameId, seat: this.me, mode: 'plan', stateSeq: this.stateSeq, turn: this.state?.turn ?? null, phase: this.state?.phase ?? null,
      kind: d.kind, prompt: String(d.prompt ?? '').split('\n')[0].slice(0, 160), arm: this.asker.spec.name, ...extra,
    };
  }

  /** Decide one engine decision: a move from the plan or code, else ask the model and try again. */
  async handle(d, ctx) {
    let failure = ctx.failure ?? null;
    for (let round = 0; round < 2 + 2 * MAX_CORRECTIONS; round++) {
      if (this.fatal || this.over) return;
      const r = failure ? { fail: failure } : this.nextMove(d, ctx);
      failure = null;
      if (r.moves) { this.play(d, r, ctx); return; }
      const ok = await this.consult(d, r, ctx);
      if (!ok) return;
    }
    this.playDefault(d, ctx, 'too many rounds on one decision');
  }

  /** Put a decided move on the wire (the rest of an attack / block queued). */
  play(d, r, ctx) {
    if (r.step) {
      this.stats.stepsSent += 1;
      this.log(this.rec(d, { kind: 'step', moment: r.plan.kind, momentNo: r.plan.no, step: r.step.n, text: r.step.raw, status: 'sent', moves: r.moves }));
    } else if (!r.logged) {
      if (r.auto) this.stats.auto += 1;
      this.log(this.rec(d, { how: r.auto ? 'auto' : 'plan', reason: r.why, moves: r.moves }));
    }
    if (r.intent || (r.step && 'intent' in r)) this.intent = r.intent ?? null;   // a step's click: its ability, or none (the menu asks)
    if (d.source === 'ask') {
      for (const m of r.moves) this.emit(m, r.why);
      return;
    }
    const [firstMove, ...rest] = r.moves;
    this.queue = rest.map((move) => ({ move, bind: d.bind }));
    if (!firstMove) return;
    const key = ctx.inputKey ?? this.keyNow();
    this.pending = { key, at: this.now(), attempt: ctx.attempt ?? 0 };
    if (r.step && r.exec) this.exec = { plan: r.plan, step: r.step, key, at: this.now() };
    this.emit(firstMove, r.why);
  }

  playDefault(d, ctx, why) {
    this.stats.fallback += 1;
    this.pendingTargets = null;
    // the moment's plan is given up; a turn plan keeps nothing more to do this turn
    const top = this.plans.at(-1);
    if (top) top.i = top.steps.length;
    const moves = defaultMoves(d, this.input);
    this.log(this.rec(d, { how: 'fallback', reason: why, moves }));
    this.say(`FALLBACK ${d.kind}: ${why}`);
    this.play(d, { moves, why: `fallback: ${why}`, auto: false, logged: true }, ctx);
  }

  // -------------------------------------------------------------------------
  // What the plan (or code) does at this decision
  // -------------------------------------------------------------------------

  /**
   * One land to tap for the cost being paid, keeping the colours the plan's
   * later "cast" steps need; null = let the engine's Auto pay (an unreadable
   * cost, mana in the pool, an unknown source, or no single-colour land fits).
   */
  smartPaySource() {
    const m = /Pay Mana Cost:\s*((?:\{[^}]+\})+)/.exec(String(this.input?.prompt ?? ''));
    if (!m || /[\/XYS]/i.test(m[1].replace(/[{}]/g, ''))) return null;
    const need = parseCost(m[1]);
    const avail = availableMana(this.state, this.me, this.oracle);
    if (!avail.known || avail.poolTotal > 0) return null;
    const reserve = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    const plan = this.plans.at(-1);
    const hand = [...new Namer(this.state).cards.values()].filter((c) => c.zone === 'hand' && c.owner === this.me);
    for (const st of plan ? plan.steps.slice(plan.i) : []) {
      if (st.verb !== 'cast') continue;
      const c = hand.find((h) => normName(nameOf(h) ?? '') === parseRef(st.name).name);
      if (!c || c.id === this.lastCast?.card?.id) continue;
      const p = parseCost(c.manaCost ?? '').pips;
      for (const k of Object.keys(reserve)) reserve[k] += p[k] ?? 0;
    }
    if (!Object.values(reserve).some((n) => n > 0)) return null;   // nothing later needs a colour: Auto is fine
    // lands this payment already tapped: the state may not show them tapped yet (sk5: Plains clicked twice)
    const cast = this.lastCast?.card?.id ?? null;
    if (this.payTapped?.cast !== cast) this.payTapped = { cast, ids: new Set() };
    const single = avail.sources.filter((x) => x.colors !== 'any' && x.colors.size === 1 && x.amount === 1 && !this.payTapped.ids.has(x.id));
    const colourOf = (x) => [...x.colors][0];
    const count = (col) => avail.sources.filter((x) => (x.colors === 'any' || x.colors.has(col)) && !this.payTapped.ids.has(x.id)).length;
    for (const col of ['W', 'U', 'B', 'R', 'G', 'C']) {
      if ((need.pips[col] ?? 0) === 0) continue;
      const hit = single.find((x) => colourOf(x) === col);
      if (hit) this.payTapped.ids.add(hit.id);
      return hit ? { id: hit.id, name: hit.name, why: `for {${col}}` } : null;
    }
    if (need.generic > 0) {
      // generic: the land whose colour is most to spare after the plan's later spells
      const spare = (x) => count(colourOf(x)) - reserve[colourOf(x)];
      const best = [...single].sort((a, b) => spare(b) - spare(a))[0];
      if (best && spare(best) > 0) this.payTapped.ids.add(best.id);
      if (best && spare(best) > 0) return { id: best.id, name: best.name, why: `generic, keeping ${Object.entries(reserve).filter(([, n]) => n > 0).map(([k]) => k).join('')} for later` };
    }
    return null;
  }

  nextMove(d, ctx) {
    const st = this.state;
    if (d.kind === 'pay') {
      if ((ctx.attempt ?? 0) === 0) {
        // pay with the plan's later spells in mind (sk1: Auto tapped the only
        // Island for Inspiring Overseer, and Hard Evidence {U} could not be cast)
        const land = this.smartPaySource();
        if (land) return { moves: [act('clickCard', { cardId: land.id })], why: `mana payment: tap ${land.name} (${land.why})`, auto: true };
      }
      if ((ctx.attempt ?? 0) <= 1 && this.input?.buttons?.ok?.enabled) return { moves: [act('buttonOk')], why: "mana payment: the engine's Auto", auto: true };
      if (this.lastCast) {
        const c = this.lastCast.card;
        const p = c ? payProblem(c, this.state, this.me, this.oracle) : null;
        const dv = this.lastDelve && this.lastDelve.card === c?.id ? this.lastDelve : null;
        const delveWords = dv ? `, even with delve exiling ${dv.n} card${dv.n === 1 ? '' : 's'} from your graveyard (the engine allowed at most ${dv.max})` : '';
        this.payFailure = { plan: this.lastCast.plan, step: this.lastCast.step, why: `the engine could not pay for it from your untapped mana${delveWords}${p ? ` (${p})` : ''}` };
        this.lastDelve = null;
        this.lastCast = null;
      }
      const cancel = this.input?.buttons?.cancel?.enabled;
      return { moves: [act(cancel ? 'buttonCancel' : 'passPriority')], why: 'the mana cannot be paid: cancel', auto: true };
    }
    if (this.payFailure && d.kind !== 'wait') {
      const f = this.payFailure;
      this.payFailure = null;
      this.lastCancel = null;
      return { fail: f };
    }
    if (d.kind === 'priority' && this.lastCancel) {
      // the loop guard: a cast that came back cancelled ends its step with a correction
      const c = this.lastCancel;
      this.lastCancel = null;
      const lc = this.lastCast;
      if (lc && lc.card?.id === c.cardId) {
        this.lastCast = null;
        const what = lc.step.verb === 'activate' ? 'activation' : 'cast';
        return { fail: { plan: lc.plan, step: lc.step, why: `that ${what} was cancelled: ${c.name ?? 'the card'} went back to where it was (a cost, a target or the mana could not be chosen or paid)${c.count >= MAX_CANCELLED ? `; it was cancelled ${c.count} times this turn and is not tried again` : ''}` } };
      }
    }
    const plan = this.current();
    const step = plan ? plan.steps[plan.i] ?? null : null;
    switch (d.kind) {
      case 'mulligan':
        if (step && (step.verb === 'keep' || step.verb === 'mulligan')) {
          plan.i += 1;
          return { moves: [act(step.verb === 'keep' ? 'buttonOk' : 'buttonCancel')], why: stepText(step), step, plan };
        }
        return { moment: { kind: 'mulligan', question: mulliganQuestion(st, this.me) } };
      case 'priority':
        return this.atPriority(d, plan, step);
      case 'attack':
        return this.atAttack(d, plan, step);
      case 'block':
        return this.atBlock(d, plan, step);
      case 'buttons':
        if (/play or draw/i.test(d.prompt)) {
          if (step && step.verb === 'choose') return this.answerWith(d, plan, step, step.names);
          return { moment: { kind: 'play-draw', question: PLAY_DRAW_QUESTION } };
        }
        return this.atQuestion(d, plan, step);
      default:
        if (d.auto) {
          // the one legal target was taken for the plan: its "-> target" is used up (cf4: Animate Dead)
          if (/one legal target/.test(d.auto.reason ?? '')) this.pendingTargets = null;
          return { moves: d.auto.moves, why: d.auto.reason, auto: true };
        }
        return this.atQuestion(d, plan, step);
    }
  }

  pass(why) { return { moves: [act('passPriority')], why, auto: true }; }

  /**
   * Is there anything at this priority the seat could do: a land, an ability,
   * or a spell its untapped mana can pay for?  (state.playable does not
   * predict mana, M61: without this a hand of unaffordable instants would
   * ask about every spell the opponent casts.)
   */
  canAct(d) {
    if (d.auto) return false;
    const cards = new Namer(this.state).cards;
    return d.options.some((o) => o.verb === 'land' || (o.verb === 'activate' && !activationProblem(o, cards.get(o.cardId), this.state, this.me, this.oracle))
      || (o.verb === 'cast' && !(o.zone === 'hand' && payProblem(cards.get(o.cardId), this.state, this.me, this.oracle))));
  }

  atPriority(d, plan, step) {
    const st = this.state;
    const me = this.me;
    this.lastCast = null;
    const stack = Array.isArray(st.stack) ? st.stack : [];
    const top = stack.at(-1) ?? null;
    if (top && top.controller !== me) {
      if (!this.seenStack.has(top.id)) {
        this.seenStack.add(top.id);
        if (d.auto || !this.canAct(d)) return this.pass('the opponent\'s spell or ability: nothing you could pay for to respond with');
        return { moment: { kind: 'response', question: responseQuestion(top, st, me, this.plans.at(-1) ?? null) } };
      }
      if (step && plan.kind !== 'turn') {
        if (PRIORITY_VERBS.has(step.verb)) return this.priorityStep(d, plan, step);
        if (step.verb === 'pass' || step.verb === 'hold') { plan.i += 1; return { moves: [act('passPriority')], why: stepText(step), step, plan }; }
      }
      return this.pass('the opponent\'s spell or ability: already answered');
    }
    if (top) return this.pass('your own spell or ability resolves first');
    const own = st.activePlayer === me;
    const main = st.phase === 'MAIN1' || st.phase === 'MAIN2';
    if (own && !this.turnPlanned && main && this.canAct(d)) return { moment: { kind: 'turn', question: turnQuestion(st) } };
    if (!own && st.phase === 'END_OF_TURN' && !this.endStepAsked && this.canAct(d) && !(step && PRIORITY_VERBS.has(step.verb))) {
      this.endStepAsked = true;
      return { moment: { kind: 'end-step', question: endStepQuestion(st, me, this.oracle) } };
    }
    if (!step) return this.pass(own ? 'your steps are used up: pass' : 'nothing to do');
    switch (step.verb) {
      case 'play land':
      case 'cast':
      case 'activate':
        return this.priorityStep(d, plan, step);
      case 'attack with':
        if (own && BEFORE_COMBAT.has(st.phase)) return this.pass(`on to combat, for ${stepText(step)}`);
        if (/^(none|nothing|no one|no creatures?)$/i.test(normName(String(step.names ?? '')))) {   // nothing to do: done (cf3)
          plan.i += 1;
          return this.atPriority(d, plan, plan.steps[plan.i] ?? null);
        }
        return { fail: { plan, step, why: own ? `combat is over this turn (it is your ${phaseWords(st.phase)})` : 'it is not your turn' } };
      case 'block':
        if (!own && BEFORE_BLOCKS.has(st.phase)) return this.pass(`on to the declaration of blockers, for ${stepText(step)}`);
        return { fail: { plan, step, why: own ? 'you block on the opponent\'s turn, not yours' : 'the declaration of blockers is over' } };
      case 'pass':
      case 'hold':
        plan.i += 1;
        if (step.verb === 'hold') plan.i = plan.steps.length;
        return { moves: [act('passPriority')], why: stepText(step), step, plan };
      case 'target':
      case 'choose':
        // a choice that belongs to an earlier step of this plan (an enters
        // trigger, a cost) was already asked, or will be asked when it
        // resolves: drop the step quietly instead of a correction (s20: Kor
        // Skyfisher's "choose Swamp", Ballista's "target opponent")
        // also in a question's plan: its later target/choose was answered by a
        // pending "-> target" (sk9: Shadowspear's equip then "target Mulldrifter")
        if (plan.kind === 'question' || plan.steps.slice(0, plan.i).some((x) => PRIORITY_VERBS.has(x.verb))) {
          plan.i += 1;
          return this.atPriority(d, plan, plan.steps[plan.i] ?? null);
        }
        return { fail: { plan, step, why: 'nothing is asking you to choose or target right now (you have priority)' } };
      default:
        return { fail: { plan, step, why: 'it is not the start of the game: keep and mulligan are only for your opening hand' } };
    }
  }

  /**
   * activate at priority from the engine's own list (M63): the permanent by
   * name, then -- when it has more than one ability the engine allows now --
   * the ability by its cost ("+2", "-1", "0") or words of its label.
   */
  activateStep(d, plan, step) {
    const namer = new Namer(this.state);
    const byCard = new Map();
    for (const o of d.options.filter((x) => x.verb === 'activate')) {
      if (!byCard.has(o.cardId)) byCard.set(o.cardId, []);
      byCard.get(o.cardId).push(o);
    }
    const cands = [...byCard.keys()].map((id) => ({ id, name: nameOf(namer.cards.get(id)) ?? '', group: byCard.get(id)[0].zone ?? 'battlefield', card: namer.cards.get(id) }));
    let pick = null;
    let sel = null;
    let first = null;
    for (const sp of abilitySplits(step.name)) {
      const ref = parseRef(sp.name);
      const m = matchRef(ref, cands);
      if (m.ok) { pick = m.pick; sel = sp.ability; break; }
      // for the reason in words: the split that names a card the seat can see ("Jace…: +2" -> Jace)
      const known = [...namer.cards.values()].some((c) => nameOf(c) && normName(nameOf(c)) === ref.name);
      if (!first || (!first.known && (known || (first.m.why === 'missing' && m.why !== 'missing')))) first = { ref, m, known };
    }
    if (!pick) return { fail: { plan, step, why: this.whyNotPlayable('activate', first.ref, first.m, step) } };
    const abil = byCard.get(pick.id);
    const nm = namer.name(pick.card);
    const labelOf = (a) => String(a.abilityLabel ?? a.intent?.abilityLabel ?? '');
    const listed = abil.map((a) => `"${labelOf(a)}"`).join('; ');
    let o = null;
    if (sel !== null) {
      const mm = matchAbility(sel, abil.map(labelOf));
      if (!mm.ok) {
        return { fail: { plan, step, why: `"${sel}" ${mm.why === 'ambiguous' ? 'fits more than one' : 'is not one'} of the abilities the engine allows ${nm} now: ${listed}` } };
      }
      o = abil[mm.index];
    } else if (abil.length === 1) {
      o = abil[0];
    }
    if (o) {
      const p = activationProblem(o, pick.card, this.state, this.me, this.oracle);
      if (p) return { fail: { plan, step, why: p } };
    }
    plan.i += 1;
    this.pendingTargets = step.targets ? { plan, step, text: step.targets } : null;
    this.lastCast = { plan, step, card: pick.card, face: null, ability: o };
    // several abilities and none named: the click makes the engine ask which (a question)
    return { moves: o ? o.moves : [act('clickCard', { cardId: pick.id })], why: stepText(step), step, plan, exec: true, intent: o?.intent ? { ...o.intent, label: o.label } : null };
  }

  /** play land / cast / activate at priority. */
  priorityStep(d, plan, step) {
    const want = step.verb === 'play land' ? 'land' : step.verb === 'cast' ? 'cast' : 'activate';
    if (want === 'activate' && this.state?.activatable !== undefined) return this.activateStep(d, plan, step);
    const cards = new Namer(this.state).cards;
    const cands = d.options.filter((o) => o.verb === want).map((o) => {
      const c = cards.get(o.cardId);
      // the other half of an adventure / split card ("Swift End" for Murderous
      // Rider, s20): the state shows one name, the card text both
      const faces = faceNamesOf(this.oracle?.text(nameOf(c) ?? '') ?? null);
      return { id: o.cardId, name: nameOf(c) ?? '', group: o.zone ?? '', opt: o, card: c, aliases: faces.map(normName), faces };
    });
    const ref = parseRef(step.name);
    const m = matchRef(ref, cands);
    if (!m.ok) return { fail: { plan, step, why: this.whyNotPlayable(want, ref, m, step) } };
    const face = (m.pick.faces ?? []).find((f) => normName(f) === ref.name && normName(f) !== normName(m.pick.name)) ?? null;
    if (want === 'cast' && m.pick.opt.zone === 'hand' && !face) {   // the other half has its own cost: the engine judges it
      const p = payProblem(m.pick.card, this.state, this.me, this.oracle);
      if (p) return { fail: { plan, step, why: p } };
    }
    if (want === 'cast' && m.pick.opt.zone && m.pick.opt.zone !== 'hand') {
      const alt = zoneCost(m.pick.card, m.pick.opt.zone, this.oracle);
      const p = alt ? payProblem({ ...m.pick.card, manaCost: alt.cost }, this.state, this.me, this.oracle) : null;
      if (p) return { fail: { plan, step, why: `from your ${m.pick.opt.zone} it is cast by ${alt.how}: ${p}` } };
    }
    plan.i += 1;
    this.pendingTargets = step.targets ? { plan, step, text: step.targets } : null;
    if (want !== 'land') this.lastCast = { plan, step, card: m.pick.card, face };
    const o = m.pick.opt;
    return { moves: o.moves, why: stepText(step), step, plan, exec: true, intent: o.intent ? { ...o.intent, label: o.label } : null };
  }

  whyNotPlayable(want, ref, m, step) {
    const st = this.state;
    const me = this.me;
    const namer = new Namer(st);
    if (m.why === 'ambiguous') {
      return `"${ref.raw}" fits more than one card: ${m.found.map((c) => `${c.name} #${c.id} (${c.group === 'hand' ? 'your hand' : `your ${c.group}`})`).join(', ')}; add the number`;
    }
    if (m.why === 'id') return `there is no ${ref.name ? `"${ref.name}" ` : ''}card #${ref.id} you can ${step.verb} now`;
    const all = [...namer.cards.values()].filter((c) => nameOf(c) && normName(nameOf(c)) === ref.name);
    const twice = all.find((c) => (this.cancelled.get(c.id) ?? 0) >= MAX_CANCELLED);
    if (twice) return `the engine cancelled the play of ${nameOf(twice)} ${this.cancelled.get(twice.id)} times this turn; it is not tried again this turn`;
    if (all.length === 0) return `no card named "${ref.raw}" is in your hand or on the battlefield (names as the game shows them)`;
    const own = all.filter((c) => c.controller === me || (c.zone === 'hand' && c.owner === me));
    if (own.length === 0) return `${nameOf(all[0])} is the opponent's card`;
    const inHand = own.find((c) => c.zone === 'hand');
    const onField = own.find((c) => c.zone === 'battlefield');
    const yourTurnMain = st.activePlayer === me && (st.phase === 'MAIN1' || st.phase === 'MAIN2') && !(st.stack ?? []).length;
    if (want === 'land') {
      if (inHand && !isLand(inHand)) return `${nameOf(inHand)} is not a land: write "cast ${nameOf(inHand)}"`;
      if (!inHand) return `${nameOf(own[0])} is not in your hand (it is in your ${own[0].zone})`;
      if (this.landsPlayed > 0) return 'you have already played a land this turn';
      if (!yourTurnMain) return `a land can be played only in your own main phase with an empty stack (it is ${st.activePlayer === me ? 'your' : "the opponent's"} ${phaseWords(st.phase)})`;
      return `the engine does not offer to play ${nameOf(inHand)} now`;
    }
    if (want === 'cast') {
      if (inHand && isLand(inHand)) return `${nameOf(inHand)} is a land: write "play land ${nameOf(inHand)}"`;
      if (!inHand && onField) return `${nameOf(onField)} is already on the battlefield; for its ability write "activate ${nameOf(onField)}"`;
      if (!inHand) return `${nameOf(own[0])} is in your ${own[0].zone}, and the engine does not offer to cast it from there now`;
      const p = payProblem(inHand, st, me, this.oracle);
      if (p) return p;
      const instant = /\bInstant\b/.test(String(inHand.types ?? '')) || hasKeyword(inHand, 'FLASH');
      if (!instant && !yourTurnMain) return `${nameOf(inHand)} is not an instant: it can be cast only in your own main phase with an empty stack (it is ${st.activePlayer === me ? 'your' : "the opponent's"} ${phaseWords(st.phase)})`;
      return `the engine does not offer to cast ${nameOf(inHand)} now`;
    }
    if (!onField) return `${nameOf(own[0])} is not on your battlefield (it is in your ${own[0].zone}); only a permanent's ability can be activated this way`;
    if (Array.isArray(st.activatable)) {
      // M63: the engine's own list says no
      const pw = /\bPlaneswalker\b/.test(String(onField.types ?? ''));
      const why = onField.tapped ? ` (it is tapped)` : pw ? ' (a planeswalker uses one loyalty ability a turn, in your main phase with an empty stack)' : '';
      return `the engine offers no ability of ${nameOf(onField)} now${why}`;
    }
    const text = this.oracle?.text(nameOf(onField)) ?? null;
    if (onField.tapped && needsTap(text)) return `${nameOf(onField)} is tapped`;
    if (isCreature(onField) && onField.sick && needsTap(text) && !hasKeyword(onField, 'HASTE')) return `${nameOf(onField)} is summoning sick, so it cannot use a {T} ability yet`;
    return `the engine offers no ability of ${nameOf(onField)} now (mana abilities are used for you when you pay)`;
  }

  atAttack(d, plan, step) {
    if (!this.turnPlanned) {
      if (d.auto) return { moves: d.auto.moves, why: d.auto.reason, auto: true };
      return { moment: { kind: 'turn', question: turnQuestion(this.state, true) } };
    }
    if (step && step.verb === 'attack with') {
      if (step.names === null) {
        plan.i += 1;
        return { moves: movesFor(d, [1]), why: stepText(step), step, plan };
      }
      if (d.auto) return { fail: { plan, step, why: 'none of your creatures can attack now' } };
      const namer = new Namer(this.state);
      const cands = d.options.filter((o) => !o.none).map((o) => ({ id: o.cardId, name: nameOf(namer.cards.get(o.cardId)) ?? '', group: 'mine', opt: o }));
      const names = splitNames(step.names, cands.map((c) => c.name));
      const taken = new Set();
      const chosen = [];
      for (const n of names) {
        const ref = parseRef(n);
        const m = matchRef(ref, cands, taken);
        if (!m.ok) return { fail: { plan, step, why: this.whyNotCreature(ref, 'attack', taken) } };
        taken.add(m.pick.id);
        chosen.push(m.pick.opt.n);
      }
      plan.i += 1;
      return { moves: movesFor(d, chosen), why: stepText(step), step, plan, exec: true };
    }
    if (step && PRIORITY_VERBS.has(step.verb) && plan.steps.slice(plan.i).some((s) => s.verb === 'attack with')) {
      return { fail: { plan, step, why: 'you are at the declaration of attackers now: what comes before the attack had to be done in your first main phase, which is over' } };
    }
    return { moves: movesFor(d, [1]), why: 'no attack step in your plan: no attack', auto: d.auto !== null };
  }

  whyNotCreature(ref, what, taken) {
    const namer = new Namer(this.state);
    const mine = (playersOf(this.state, this.me).mine?.zones?.battlefield?.cards ?? []).filter((c) => c.hidden !== true);
    const hits = mine.filter((c) => normName(nameOf(c)) === ref.name && (ref.id === null || c.id === ref.id));
    if (hits.length === 0) return `you have no creature named "${ref.raw}" on the battlefield`;
    const c = hits.find((x) => !taken.has(x.id)) ?? hits[0];
    if (taken.has(c.id)) return `${namer.name(c)} is named twice`;
    if (!isCreature(c)) return `${namer.name(c)} is not a creature`;
    if (c.tapped) return `${namer.name(c)} is tapped`;
    if (what === 'attack' && c.sick && !hasKeyword(c, 'HASTE')) return `${namer.name(c)} is summoning sick (it came under your control this turn)`;
    return `the engine does not let ${namer.name(c)} ${what} now`;
  }

  atBlock(d, plan, step) {
    if (step && plan.kind !== 'turn') {
      if (step.verb === 'pass' || step.verb === 'hold') {
        plan.i += 1;
        return { moves: movesFor(d, [1]), why: stepText(step), step, plan };
      }
      if (step.verb !== 'block') {
        return { fail: { plan, step, why: 'you are declaring blockers now: the blocks (or "pass") come first; a spell or an ability goes after them' } };
      }
      const namer = new Namer(this.state);
      const pairs = d.options.filter((o) => !o.none);
      const attackers = [...new Set(pairs.map((o) => o.attackerId))].map((id) => ({ id, name: nameOf(namer.cards.get(id)) ?? '', group: 'theirs' }));
      const blockers = [...new Set(pairs.map((o) => o.blockerId))].map((id) => ({ id, name: nameOf(namer.cards.get(id)) ?? '', group: 'mine' }));
      const chosen = [];
      const used = new Set();
      let last = step;
      for (let i = plan.i; i < plan.steps.length && plan.steps[i].verb === 'block'; i++) {
        const s = plan.steps[i];
        last = s;
        const aRef = parseRef(s.attacker);
        const a = matchRef(aRef, attackers);
        if (!a.ok) return { fail: { plan, step: s, why: `"${aRef.raw}" is not attacking you (attacking: ${attackers.map((x) => namer.byId(x.id)).join(', ') || 'nothing'})` } };
        const bRef = parseRef(s.blocker);
        const b = matchRef(bRef, blockers, used);
        if (!b.ok) return { fail: { plan, step: s, why: used.size && blockers.some((x) => used.has(x.id) && normName(x.name) === bRef.name) ? `${s.blocker} already blocks; each creature blocks one attacker` : this.whyNotCreature(bRef, 'block', used) } };
        used.add(b.pick.id);
        const o = pairs.find((x) => x.attackerId === a.pick.id && x.blockerId === b.pick.id);
        chosen.push(o.n);
      }
      const err = checkChoice(d, chosen);
      if (err) return { fail: { plan, step: last, why: err } };
      plan.i = plan.steps.indexOf(last) + 1;
      return { moves: movesFor(d, chosen), why: `${stepText(step)}${last !== step ? ` to ${last.n}` : ''}`, step, plan, exec: true };
    }
    if (d.auto) return { moves: d.auto.moves, why: d.auto.reason, auto: true };
    if (this.blocksAsked) return { moves: movesFor(d, [1]), why: 'blocks already asked this turn: no blocks', auto: true };
    this.blocksAsked = true;
    return { moment: { kind: 'blocks', question: blocksQuestion(d, this.state) } };
  }

  /** An engine question (a selection, an ask, a button pair): the plan's target / choice, else ask. */
  atQuestion(d, plan, step) {
    const yesNo = d.options.length >= 2 && d.options.some((o) => o.value === true) && d.options.some((o) => o.value === false);
    const wantsOn = (this.pendingTargets || (step && (step.verb === 'target' || step.verb === 'choose')
      && !/^(yes|no|pay|dont pay|do not pay|decline|accept|skip)$/i.test(normName(String(step.names ?? '')))));
    // a yes/no that names the card this plan just cast or activated is that play's own cost
    // ("Sacrifice Clue Token?", "pay 3 life?" for its flashback): the plan chose the play, so yes
    // (cg3: Sonnet, asked bare, declined its own Clue)
    const prev = plan && plan.i > 0 ? plan.steps[plan.i - 1] : null;
    if (yesNo && prev && (prev.verb === 'cast' || prev.verb === 'activate')) {
      const who = normName(parseRef(String(prev.name ?? '').split(':')[0]).name ?? '');   // 'Clue Token: {2}, Sacrifice' -> the card
      const words = normName(String(d.prompt ?? ''));
      if (who && words.includes(who)) {
        const yes = d.options.find((o) => o.value === true);
        return { moves: movesFor(d, [yes.n]), why: `yes: part of ${stepText(prev)}, which the plan chose`, auto: true };
      }
    }
    if (yesNo && wantsOn && this.lastCast) {
      // the plan goes on to a target or a choice: it means "yes" to the engine's confirm in between
      // (cf4: Halo Forager's "cast it?" met "target Goblin Army Token")
      const yes = d.options.find((o) => o.value === true);
      return { moves: movesFor(d, [yes.n]), why: `yes: the plan goes on to ${this.pendingTargets ? 'its target' : stepText(step)}`, auto: true };
    }
    if (this.pendingTargets && d.kind !== 'ask:ability_menu') {   // a menu comes before the target: keep it for the target
      const pt = this.pendingTargets;
      this.pendingTargets = null;
      return this.answerWith(d, pt.plan, pt.step, pt.text, { consume: false });
    }
    if (d.kind === 'ask:ability_menu' && this.lastCast?.face && this.lastCast.card?.id === d.cardId) {
      const f = normName(this.lastCast.face);
      const hit = d.options.filter((o) => normName(String(o.label ?? '')).includes(f));
      if (hit.length >= 1) return { moves: movesFor(d, [hit[0].n]), why: `${stepText(this.lastCast.step)}: the ${this.lastCast.face} half`, auto: true };
    }
    if (d.kind === 'ask:ability_menu' && this.lastCast && this.lastCast.card?.id === d.cardId) {
      // the card was clicked for a step: "cast" means the spell, "activate" an ability (when only one is)
      const want = this.lastCast.step.verb === 'cast' ? d.options.filter((o) => o.isSpell) : d.options.filter((o) => o.value !== null && !o.isSpell);
      if (want.length === 1 || (this.lastCast.step.verb === 'cast' && want.length > 0)) {
        return { moves: movesFor(d, [want[0].n]), why: `${stepText(this.lastCast.step)}: ${this.lastCast.step.verb === 'cast' ? 'the spell' : 'its one ability'}`, auto: true };
      }
    }
    if (step && (step.verb === 'target' || step.verb === 'choose')) return this.answerWith(d, plan, step, step.names);
    const about = this.lastCast?.card ? nameOf(this.lastCast.card) : null;
    let q = questionText(d, this.state, this.me, { plan: this.plans.at(-1) ?? null, about });
    if (yesNo && about) {
      // cf3/cf5: a cost the plan's own play asks for ("pay 3 life?", the Clue's sacrifice) was declined by mistake
      q += `\nThis question is part of ${this.lastCast.step.verb === 'activate' ? 'activating' : 'casting'} ${about}, which your plan chose; its mana is already paid. Answering no cancels that ${this.lastCast.step.verb === 'activate' ? 'activation' : 'spell'}.`;
    }
    return { moment: { kind: 'question', question: q } };
  }

  /** The candidates of a question, for the name matcher. */
  choiceCands(d) {
    const namer = new Namer(this.state);
    const me = this.me;
    return d.options.map((o) => {
      const aliases = [normName(o.label)];
      let name = String(o.label ?? '');
      let group = 'option';
      const pid = o.moves?.[0]?.playerId;
      if (o.mode) {
        // a mode: its own words (cg1)
        name = String(o.label ?? '');
      } else if (typeof o.cardId === 'number' && !namer.cards.has(o.cardId) && o.cardName) {
        // a card the state does not show, e.g. from a library search (cg5: "choose Island" among eight)
        name = o.cardName;
        group = 'search';
      } else if (typeof o.cardId === 'number' && namer.cards.has(o.cardId)) {
        const c = namer.cards.get(o.cardId);
        name = nameOf(c) ?? name;
        group = `${c.zone}:${c.controller}`;
      } else if (typeof pid === 'number') {
        const p = (this.state.players ?? []).find((x) => x.id === pid);
        name = p?.name ?? name;
        aliases.push(...(pid === me ? ['me', 'myself', 'my face', 'yourself'] : ['opponent', 'opp', 'the opponent', 'opponent s face']));
        group = `player:${pid}`;
      }
      if (o.isDefault && (o.none || /^(None|Never mind|OK \(choose nothing\))/.test(String(o.label)))) aliases.push('none', 'nothing');
      if (o.button) aliases.push(normName(String(o.label).replace(/\s*\(.*\)$/, '')));
      // plain words for a yes/no (sk9: "choose don't pay" to "Do you want to pay 2 life?")
      if (o.value === true) aliases.push('yes', 'pay', 'pay it', 'accept', 'do it', 'ok');
      if (o.value === false) aliases.push('no', 'dont pay', 'do not pay', 'decline', 'skip', 'dont', 'do not', 'pass');
      // the id a "#n" names is the CARD's (the number the game shows), never the option's
      return { id: typeof o.cardId === 'number' ? o.cardId : `option ${o.n}`, name, group, aliases, opt: o };
    });
  }

  /** Answer the decision with the named option(s); a name that fits nothing is a failure of `step`. */
  answerWith(d, plan, step, text, { consume = true } = {}) {
    const cands = this.choiceCands(d);
    const many = d.multi;
    let names = splitNames(text, cands.map((c) => c.name));
    if (!many) names = names.slice(0, 1);
    // A question that needs N choices (Ghostly Flicker's two targets, "choose
    // 2"): consecutive target / choose steps right after this one fill it
    // before it fails (sk: "target A" then "target B" for one question of two).
    let extra = 0;
    if (many && !(names.length === 1 && /^(none|nothing)$/i.test(names[0].trim())) && plan) {
      const from = consume ? plan.steps.indexOf(step) + 1 : plan.i;
      while (names.length < d.min && from >= 0) {
        const nx = plan.steps[from + extra];
        if (!nx || (nx.verb !== 'target' && nx.verb !== 'choose')) break;
        names.push(...splitNames(nx.names, cands.map((c) => c.name)));
        extra += 1;
      }
    }
    const chosen = [];
    const taken = new Set();
    const engineAsks = this.engineAsks(d);
    if (many && names.length === 1 && /^(none|nothing)$/i.test(names[0].trim())) {
      // an empty choice
    } else {
      for (const n of names) {
        const ref = parseRef(n);
        // an option named in full, brackets and all, wins outright; a word or
        // phrase that only one option's label contains picks it (sk8: Bone
        // Shards' two options differ only in "(Additional cost: …)", which
        // parseRef strips, so even an exact copy was refused)
        const raw = normName(n);
        const free = cands.filter((c) => !taken.has(c.id) && c.group === 'option');
        if (d.kind === 'ask:ability_menu') {
          // an ability named by its loyalty cost ("+2", "-1") or words of its label (M63)
          const abil = free.filter((c) => c.opt.value !== null);
          const am = matchAbility(n.trim(), abil.map((c) => String(c.opt.label ?? '')));
          if (am.ok) { taken.add(abil[am.index].id); chosen.push(abil[am.index].opt.n); continue; }
        }
        const exact = free.filter((c) => normName(c.opt.label) === raw);
        const contains = raw.length >= 3 ? free.filter((c) => normName(c.opt.label).includes(raw)) : [];
        const direct = exact.length === 1 ? exact[0] : contains.length === 1 ? contains[0] : null;
        if (direct) { taken.add(direct.id); chosen.push(direct.opt.n); continue; }
        let m = matchRef(ref, cands, taken);
        if (!m.ok && m.why === 'missing' && ref.name.length >= 3) {
          // a long option label (an ability, a mode) may be named by its start
          const part = cands.filter((c) => !taken.has(c.id) && c.group === 'option' && normName(c.opt.label).includes(ref.name));
          if (part.length === 1) m = { ok: true, pick: part[0] };
        }
        if (!m.ok) {
          const why = m.why === 'ambiguous'
            ? `"${ref.raw}" fits more than one choice: ${m.found.map((c) => `${c.name} #${c.opt.cardId ?? c.opt.n}`).join(', ')}; add the number`
            : `"${ref.raw}" is not one of the choices`;
          return { fail: { plan, step, why, engineAsks } };
        }
        taken.add(m.pick.id);
        chosen.push(m.pick.opt.n);
      }
    }
    const err = checkChoice(d, chosen);
    if (err) return { fail: { plan, step, why: err, engineAsks } };
    if (consume) plan.i += 1;
    plan.i += extra;
    const joined = extra ? ` with the next ${extra === 1 ? 'step' : `${extra} steps`}` : '';
    return { moves: movesFor(d, chosen), why: `${stepText(step)}${consume ? '' : ' (its target)'}${joined}`, step, plan, exec: d.source !== 'ask' };
  }

  engineAsks(d) {
    if (d.kind === 'priority' || d.kind === 'attack' || d.kind === 'block') return null;
    const { prompt, choices } = choicesWords(d, { ...this.state, __me: this.me });
    return `The engine now asks: ${prompt || '(no words)'}. Choices: ${choices}. Answer it with step 1 "target <name>" or "choose <option>".`;
  }

  // -------------------------------------------------------------------------
  // Asking the model
  // -------------------------------------------------------------------------

  /** One moment (or correction): call, read, install the plan.  false = the decision was settled another way. */
  async consult(d, r, ctx) {
    const st = this.state;
    let kind;
    let corrections;
    let question;
    let replace = null;
    if (r.fail) {
      const f = r.fail;
      this.stats.stepsFailed += 1;
      this.log(this.rec(d, { kind: 'step', moment: f.plan.kind, momentNo: f.plan.no, step: f.step.n, text: f.step.raw, status: 'failed', reason: f.why }));
      this.say(`STEP FAILED ${stepText(f.step)}: ${f.why}`);
      kind = f.plan.kind;
      corrections = f.plan.corrections + 1;
      replace = f.plan;
      if (corrections > MAX_CORRECTIONS) {
        this.playDefault(d, ctx, `${MAX_CORRECTIONS} corrections used on this ${kind} moment; the last: ${stepText(f.step)}: ${f.why}`);
        return false;
      }
      this.stats.corrections += 1;
      question = correctionQuestion({ step: f.step, why: f.why, plan: f.plan, n: corrections, engineAsks: f.engineAsks ?? this.engineAsks(d) });
    } else {
      kind = r.moment.kind;
      corrections = 0;
      question = r.moment.question;
    }
    if (kind === 'turn') this.turnPlanned = true;
    this.syncPlanStops();
    this.momentNo += 1;
    this.stats.decisions += 1;
    this.stats.moments[kind] = (this.stats.moments[kind] ?? 0) + 1;
    const record = this.rec(d, {
      kind: 'plan', moment: kind, momentNo: this.momentNo, frameSeq: ctx.frameSeq ?? null, correction: r.fail ? corrections : 0,
      question: question.split('\n')[0].slice(0, 300), calls: [],
    });
    const original = question;
    let parsed = null;
    this.busy = true;
    try {
      for (;;) {
        const { text, call } = await this.asker.ask((o) => this.buildUser(question, d, o), record.calls.length);
        record.calls.push(call);
        this.countCall(call);
        if (text === null) {
          this.stats.transportErrors += 1;
          this.modelErrors += 1;
          this.say(`MODEL ERROR ${this.modelErrors} in a row: ${String(call.error).slice(0, 500)}`);
          if (this.modelErrors >= MAX_MODEL_ERRORS) this.fatal = `model error ${this.modelErrors} times in a row: ${String(call.error).slice(0, 300)}`;
          break;
        }
        this.modelErrors = 0;
        const p = parsePlan(text);
        call.parse = p.ok ? 'ok' : p.error;
        if (p.ok) { parsed = p; break; }
        this.stats.invalid += 1;
        corrections += 1;
        if (corrections > MAX_CORRECTIONS) break;
        this.stats.corrections += 1;
        question = invalidQuestion({ error: p.error, reply: text, question: original, n: corrections });
      }
    } finally {
      this.busy = false;
    }
    if (!parsed) {
      record.how = 'fallback';
      this.log(record);
      this.playDefault(d, ctx, record.calls.at(-1)?.transport ? `the model call failed: ${String(record.calls.at(-1).error).slice(0, 200)}` : 'no readable reply');
      return false;
    }
    const plan = { kind, no: this.momentNo, steps: parsed.steps, i: 0, corrections, text: parsed.plan, turn: st?.turn ?? null };
    Object.assign(record, { how: 'model', plan: parsed.plan, steps: parsed.steps.map((s) => s.raw), corrections });
    this.stats.model += 1;
    this.log(record);
    this.say(`PLAN (${kind}${r.fail ? `, correction ${corrections}` : ''}): ${parsed.plan} | ${parsed.steps.map((s) => s.raw).join(' / ')}`);
    this.install(plan, replace);
    // still the same decision?  If not, the plan stays and the next tick carries it on.
    const stale = ctx.askId ? !this.asks.has(ctx.askId) : this.keyNow() !== ctx.inputKey;
    if (stale) {
      this.stats.stale += 1;
      this.say('STALE: the engine moved on while the model thought; the plan carries on from the next decision');
      return false;
    }
    return true;
  }

  install(plan, replace) {
    if (replace) {
      const at = this.plans.indexOf(replace);
      if (at >= 0) {
        this.plans[at] = plan;
        this.plans.length = at + 1;
        return;
      }
    }
    if (plan.kind === 'turn') { this.plans = [plan]; return; }
    if (plan.kind === 'question' && plan.steps.length > 1) {
      // more steps than the answer: they replace what was left of the plan underneath
      for (const p of this.plans) p.i = p.steps.length;
    }
    this.plans.push(plan);
  }

  buildUser(question, d, { full, since, shown }) {
    const mark = this.history.mark();
    const offers = d.kind === 'priority' ? Object.assign(d.options.filter((o) => o.verb), { legacy: d.options.some((o) => o.legacy) }) : null;
    const st = this.state;
    const own = st?.activePlayer === this.me;
    const attackers = own && (BEFORE_COMBAT.has(st.phase) || d.kind === 'attack')
      ? (playersOf(st, this.me).mine?.zones?.battlefield?.cards ?? []).filter((c) => c.hidden !== true && c.controller === this.me && isCreature(c) && !c.tapped && (!c.sick || hasKeyword(c, 'HASTE')))
      : null;
    const args = { question, history: this.history, mark, since, shown, state: st, me: this.me, oracle: this.oracle, offers, attackers, landsPlayed: this.landsPlayed };
    const user = full ? planFullPrompt(args) : planDeltaPrompt(args);
    return { user, mark, names: visibleNames(st, this.me) };
  }

  countCall(c) {
    this.stats.modelCalls += 1;
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

  /** The default stops, set once per state (no `next:` line in plan mode). */
  syncPlanStops() {
    if (this.stopsAt === this.stateSeq) return;
    this.stopsAt = this.stateSeq;
    this.requested = [];
    this.syncStops();
  }
}

/** The safe default for a decision: pass, no attack, no blocks, keep, the ask's own default. */
export function defaultMoves(d, input) {
  switch (d.kind) {
    case 'priority': return [act('passPriority')];
    case 'attack':
    case 'block': return movesFor(d, [1]);
    case 'mulligan': return [act('buttonOk')];
    default:
      if (d.auto) return d.auto.moves;
      if (d.options.length) return movesFor(d, d.fallback);
      return escalate(input);
  }
}

function escalate(input) {
  if (input?.buttons?.ok?.enabled) return [act('buttonOk')];
  if (input?.buttons?.cancel?.enabled) return [act('buttonCancel')];
  return [act('passPriority')];
}

export { inputKey };
