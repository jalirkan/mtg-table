// mtg-table — tools/adversary/core.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The adversarial seat's state machine (decision D428), independent of how the
// game is played around it. tools/ws-auto-play.mjs drives a real game and,
// with `--adversary <report.json>`, hands every `ask`, every `notice` and each
// settled `input` to the object made here:
//
//   asks    every ask is first answered with the worst illegal answers
//           answers.mjs can construct for it (up to six a question, rotating
//           through the kind's list so successive questions try different
//           ones), and each must come back as the SAME kind with a `reason`
//           (M67/M68: refused, asked again under a new askId); then the policy's
//           legal answer, which must NOT come back with a reason. An illegal
//           answer followed by anything else -- another kind, no reason, the
//           game moving on -- is a LEAK: the bridge applied it.
//   inputs  once a turn per input class, before the policy acts, one act the
//           engine must refuse: a click on a card that is not offered (an
//           opponent's creature as an attacker, a land or a tapped creature as
//           a blocker, a card outside a selection), a card from the wrong zone
//           (an opponent's hidden hand card, a graveyard), an ability or a
//           player that does not exist. The refusal is the bridge's notice
//           ("Not selectable", "Unknown card"...); an act that draws none and
//           changes the board is a LEAK.
//
// Zero dependencies; the caller supplies `answer`, `act` and `say`.

import { answerRefusal, illegalAnswers } from './answers.mjs';

const PER_ASK = 6;            // illegal answers per question (rotating through the kind's list)
const LEAK_MS = 8000;         // an illegal answer with no re-ask this long is a leak
const REFUSAL_TITLES = new Set([
  'Not selectable', 'Unknown card', 'Unknown ability', 'Unknown player', 'Illegal action',
]);

export function createAdversary({ answer, act, say = () => {} }) {
  const report = {
    asks: {},          // kind -> {asked, illegalSent, refused, leaks, legalSent, legalAccepted, legalRefused, labels}
    inputs: {},        // class -> {probes, refused, leaks, labels}
    leaks: [],         // every leak, with its frames
    legalRefused: [],  // a legal answer the bridge refused: a rule mismatch to fix
    unexpectedReason: [],
    unsettled: [],     // an illegal answer in flight when the game ended
  };
  const kindStats = (k) => (report.asks[k] ??= {
    asked: 0, illegalSent: 0, refused: 0, leaks: 0, legalSent: 0, legalAccepted: 0, legalRefused: 0, labels: {},
  });
  const inputStats = (k) => (report.inputs[k] ??= { probes: 0, refused: 0, leaks: 0, labels: {} });
  const rotation = new Map();     // kind -> next offset into its illegal list

  /** The question in flight: what was last sent, and what is still to send. */
  let pending = null;
  /** An illegal act in flight, waiting for the engine's refusal notice. */
  let pendingAct = null;
  const probedThisTurn = new Set();
  let turnSeen = null;

  function sendIllegal(body, step) {
    const s = kindStats(body.kind);
    s.illegalSent += 1;
    pending.stage = 'illegal';
    pending.label = step.label;
    pending.value = step.value;
    pending.sentAt = Date.now();
    pending.askId = body.askId;
    say(`ADVERSARY ${body.kind} ${body.askId}: illegal (${step.label}) ${JSON.stringify(step.value)}`);
    answer(body.askId, body.kind, body.prompt ?? body.title ?? '', step.value);
  }

  function sendLegal(body) {
    const s = kindStats(body.kind);
    const value = pending.legalFor(body);
    if (value !== null && answerRefusal(body, value) !== null) {
      // The policy's own answer breaks the rule: fall back to null, which is
      // always legal (section 5.4), and say so -- a policy to fix.
      say(`ADVERSARY ${body.kind}: the policy's answer ${JSON.stringify(value)} is illegal (${answerRefusal(body, value)}); null instead`);
      pending.value = null;
    } else {
      pending.value = value;
    }
    s.legalSent += 1;
    pending.stage = 'legal';
    pending.sentAt = Date.now();
    pending.askId = body.askId;
    answer(body.askId, body.kind, body.prompt ?? body.title ?? '', pending.value);
  }

  function leak(why, extra = {}) {
    const s = kindStats(pending.kind);
    s.leaks += 1;
    const rec = { kind: pending.kind, label: pending.label, value: pending.value, askId: pending.askId, why, ...extra };
    report.leaks.push(rec);
    say(`ADVERSARY LEAK ${pending.kind} (${pending.label}): ${why}`);
  }

  /** Every ask goes through here; the caller's legal answer is `legalFor(body)`. */
  function onAsk(body, legalFor) {
    const kind = String(body.kind);
    const hasReason = typeof body.reason === 'string' && body.reason !== '';
    if (pending !== null) {
      if (pending.stage === 'illegal') {
        if (kind === pending.kind && hasReason) {
          const s = kindStats(kind);
          s.refused += 1;
          s.labels[pending.label] = (s.labels[pending.label] ?? 0) + 1;
          say(`ADVERSARY ${kind}: refused as it must be -- "${body.reason}"`);
          const step = pending.queue.shift();
          if (step !== undefined) sendIllegal(body, step);
          else sendLegal(body);
          return;
        }
        leak(`the next ask was ${JSON.stringify(kind)}${kind === pending.kind ? ' with no reason' : ''}, not the same question with a reason`,
          { nextAskId: body.askId });
        pending = null;
      } else if (pending.stage === 'legal') {
        if (kind === pending.kind && hasReason) {
          const s = kindStats(kind);
          s.legalRefused += 1;
          report.legalRefused.push({ kind, value: pending.value, reason: body.reason, askId: pending.askId });
          say(`ADVERSARY ${kind}: a LEGAL answer ${JSON.stringify(pending.value)} was refused -- "${body.reason}"; answering null`);
          pending.value = null;
          pending.askId = body.askId;
          answer(body.askId, kind, body.prompt ?? '', null);
          return;
        }
        kindStats(pending.kind).legalAccepted += 1;
        pending = null;
      }
    }
    // A fresh question.
    const s = kindStats(kind);
    s.asked += 1;
    if (hasReason) {
      report.unexpectedReason.push({ kind, askId: body.askId, reason: body.reason });
      say(`ADVERSARY ${kind}: a first asking carries a reason "${body.reason}"`);
    }
    const all = illegalAnswers(body);
    const off = rotation.get(kind) ?? 0;
    rotation.set(kind, off + 1);
    const queue = [];
    for (let i = 0; i < Math.min(PER_ASK, all.length); i++) queue.push(all[(off + i) % all.length]);
    pending = { kind, queue, legalFor, stage: null, label: null, value: null, askId: body.askId, sentAt: 0 };
    const first = queue.shift();
    if (first !== undefined) sendIllegal(body, first);
    else sendLegal(body);
  }

  /** Frames other than asks: notices settle an illegal act; time settles the rest. */
  function onFrame(f) {
    const b = f.body ?? {};
    if (f.type === 'state' && typeof b.turn === 'number' && b.turn !== turnSeen) {
      turnSeen = b.turn;
      probedThisTurn.clear();
    }
    if (f.type === 'notice' && pendingAct !== null && REFUSAL_TITLES.has(String(b.title))) {
      const s = inputStats(pendingAct.cls);
      s.refused += 1;
      s.labels[pendingAct.label] = (s.labels[pendingAct.label] ?? 0) + 1;
      say(`ADVERSARY input ${pendingAct.cls}: refused as it must be -- ${b.title}: ${String(b.text).slice(0, 80)}`);
      pendingAct = null;
    }
    if (f.type === 'over') {
      // A game that ends asks nothing more. A legal answer in flight was
      // taken; an illegal one cannot be judged by a re-ask that will never
      // come (the bridge answers the default when the game is over), so it is
      // counted apart -- `unsettled` -- and never as a pass.
      if (pending !== null && pending.stage === 'legal') kindStats(pending.kind).legalAccepted += 1;
      if (pending !== null && pending.stage === 'illegal') {
        report.unsettled.push({ kind: pending.kind, label: pending.label, value: pending.value, askId: pending.askId });
      }
      pending = null;
      pendingAct = null;
    }
  }

  /** Called on the caller's clock: an illegal answer or act that drew nothing is a leak. */
  function tick(now = Date.now()) {
    if (pending !== null && pending.stage === 'illegal' && now - pending.sentAt > LEAK_MS) {
      leak(`no re-ask within ${LEAK_MS} ms`);
      pending = null;
    } else if (pending !== null && pending.stage === 'legal' && now - pending.sentAt > LEAK_MS) {
      kindStats(pending.kind).legalAccepted += 1;   // no re-ask: taken
      pending = null;
    }
    if (pendingAct !== null && now - pendingAct.sentAt > 3000) {
      const s = inputStats(pendingAct.cls);
      s.leaks += 1;
      report.leaks.push({ input: pendingAct.cls, label: pendingAct.label, act: pendingAct.act, why: 'no refusal notice within 3 s' });
      say(`ADVERSARY LEAK input ${pendingAct.cls} (${pendingAct.label}): no refusal notice`);
      pendingAct = null;
    }
  }

  /** Is an answer or an act of ours still waiting to be judged? (The policy holds while it is.) */
  const busy = () => pendingAct !== null;

  /**
   * Before the policy acts on a settled `input`: one act the engine must
   * refuse, at most once a turn per input class, or null.
   */
  function inputProbe(input, state, me) {
    if (pendingAct !== null || pending !== null || !input || !state) return null;
    const prompt = String(input.prompt ?? '');
    const sel = Array.isArray(input.selectable?.cardIds) ? input.selectable.cardIds : [];
    const players = Array.isArray(state.players) ? state.players : [];
    const mine = players.find((p) => p.id === me);
    const theirs = players.find((p) => p.id !== me);
    const zone = (p, z) => (p?.zones?.[z]?.cards ?? []);
    const pick = (cls, label, action, extra) => {
      if (probedThisTurn.has(cls)) return null;
      probedThisTurn.add(cls);
      const s = inputStats(cls);
      s.probes += 1;
      pendingAct = { cls, label, act: { action, ...extra }, sentAt: Date.now() };
      say(`ADVERSARY input ${cls}: ${label} -> ${action} ${JSON.stringify(extra)}`);
      act(action, extra);
      return true;
    };
    const lower = prompt.toLowerCase();
    if (lower.includes('to attack') || lower.includes('declare attackers')) {
      const victim = zone(theirs, 'battlefield').find((c) => c.hidden !== true && !sel.includes(c.id));
      if (victim) return pick('declare attackers', "an opponent's permanent as an attacker", 'clickCard', { cardId: victim.id });
      return null;
    }
    if (lower.includes('block')) {
      const bad = zone(mine, 'battlefield').find((c) => (c.tapped === true || /\bLand\b/.test(String(c.types))) && !sel.includes(c.id));
      if (bad) return pick('declare blockers', `an illegal blocker (${bad.tapped ? 'tapped' : 'a land'})`, 'clickCard', { cardId: bad.id });
      return null;
    }
    if (sel.length > 0) {
      const outside = [...zone(mine, 'battlefield'), ...zone(theirs, 'battlefield'), ...zone(mine, 'hand')]
        .find((c) => c.hidden !== true && !sel.includes(c.id) && c.tapped !== false);
      const any = outside ?? zone(theirs, 'graveyard').find((c) => !sel.includes(c.id));
      if (any) return pick('selection', 'a card the selection does not offer', 'clickCard', { cardId: any.id });
      return null;
    }
    if (/^Priority:/.test(prompt) && state.priority === me) {
      const hidden = zone(theirs, 'hand').find((c) => c.hidden === true);
      if (hidden && !probedThisTurn.has('priority:hand')) {
        probedThisTurn.add('priority:hand');
        return pick('priority', "a card from the wrong zone (the opponent's hidden hand)", 'clickCard', { cardId: hidden.id });
      }
      if (!probedThisTurn.has('priority:ability')) {
        probedThisTurn.add('priority:ability');
        return pick('priority ability', 'an ability that was never offered', 'clickAbility', { cardId: -1, abilityId: 987654321 });
      }
      if (!probedThisTurn.has('priority:player')) {
        probedThisTurn.add('priority:player');
        return pick('priority player', 'a player that does not exist', 'clickPlayer', { playerId: 99 });
      }
    }
    return null;
  }

  /** Leaks and rule mismatches: the run's verdict. */
  function verdict(requireKinds = []) {
    const missing = requireKinds.filter((k) => !(report.asks[k]?.refused > 0));
    return { ok: report.leaks.length === 0 && report.legalRefused.length === 0, missing };
  }

  return { onAsk, onFrame, tick, busy, inputProbe, verdict, report };
}
