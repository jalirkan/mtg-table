// mtg-table — tools/llm-seat/lib/positions.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// The POSITIONS of a recorded game: every decision the viewing seat made that
// the live seat would have put to the model (decision.mjs's rule), each with
// the prompt snapshot as it stood at that moment and the move the seat
// actually made, as option numbers.  A position's `frame` is the index (in
// the log's frames, line 0 excluded) of the first c2s line that answered it --
// exactly what coach-grade's `live` moment reads (WireLog.live(frame): the
// last state and input before that line), as Review.fromActs plans it (D353).

import { classifyAsk, classifyInput, inputKindOf, tokenFor } from './decision.mjs';
import { History } from './history.mjs';
import { snapshot } from './prompt.mjs';
import { inputKey } from './seat-core.mjs';
import { defaultStops } from './stops.mjs';

/** Would the live seat, on its default stops, have been asked here? (a priority stop outside them is skipped by Forge) */
function underDefaultStops(d, state, me, oracle) {
  if (d.kind !== 'priority') return true;
  if (Array.isArray(state.stack) && state.stack.length > 0) return true;
  const want = defaultStops(state, me, oracle);
  return want[state.activePlayer === me ? 'own' : 'opp'].has(state.phase);
}

const PLAY_ACTS = new Set(['clickCard', 'clickPlayer', 'clickAbility', 'buttonOk', 'buttonCancel', 'passPriority', 'alphaStrike']);

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** The option numbers a recorded answer chose, or null. */
function actualFromAnswer(d, value) {
  if (d.answerList) {
    if (!Array.isArray(value)) return null;
    const out = [];
    for (const v of value) {
      const o = d.options.find((x) => x.value === v);
      if (!o) return null;
      out.push(o.n);
    }
    return out;
  }
  const o = d.options.find((x) => same(x.value, value));
  return o ? [o.n] : null;
}

/** The option numbers a run of acts on one input chose, or null when they do not map. */
function actualFromActs(d, acts, state) {
  if (d.kind === 'attack') {
    const toggled = new Set(d.current ?? []);
    let alpha = false;
    for (const a of acts) {
      if (a.action === 'clickCard') { if (toggled.has(a.cardId)) toggled.delete(a.cardId); else toggled.add(a.cardId); }
      if (a.action === 'alphaStrike') alpha = true;
    }
    const ns = d.options.filter((o) => !o.none && (alpha || toggled.has(o.cardId))).map((o) => o.n);
    return ns.length ? ns : [1];
  }
  if (d.kind === 'block') {
    const attackers = d.options.filter((o) => !o.none).map((o) => o.attackerId);
    let current = (state?.combat?.bands ?? []).flatMap((b) => b.attackerIds ?? [])[0] ?? null;
    const chosen = [];
    for (const a of acts) {
      if (a.action !== 'clickCard') continue;
      if (attackers.includes(a.cardId)) { current = a.cardId; continue; }
      const o = d.options.find((x) => !x.none && x.attackerId === current && x.blockerId === a.cardId);
      if (o) {
        const i = chosen.indexOf(o.n);
        if (i >= 0) chosen.splice(i, 1); else chosen.push(o.n);
      }
    }
    return chosen.length ? chosen.sort((x, y) => x - y) : [1];
  }
  const a = acts[0];
  if (d.kind === 'priority') {
    if (a.action === 'passPriority' || a.action === 'buttonOk' || a.action === 'buttonCancel') return [1];
    const o = d.options.find((x) => x.moves?.[0]?.cardId === a.cardId);
    return o ? [o.n] : null;
  }
  if (d.multi) {
    const ns = [];
    for (const x of acts) {
      if (x.action !== 'clickCard' && x.action !== 'clickPlayer') continue;
      const o = d.options.find((y) => y.moves?.[0]?.cardId === x.cardId && (x.cardId !== undefined)) ?? d.options.find((y) => y.moves?.[0]?.playerId === x.playerId && x.playerId !== undefined);
      if (o && !ns.includes(o.n)) ns.push(o.n);
    }
    return ns;
  }
  const o = d.options.find((y) => {
    const m = y.moves?.[0];
    if (!m || m.action !== a.action) return false;
    if (a.action === 'clickCard') return m.cardId === a.cardId;
    if (a.action === 'clickPlayer') return m.playerId === a.playerId;
    return true;
  });
  return o ? [o.n] : null;
}

/**
 * positionsOf(log, {oracle, opts}) -> [{pos, frame, stateSeq, turn, phase, d, snap, actual, actualToken}]
 */
export function positionsOf({ header, frames }, { oracle, opts = {} } = {}) {
  const me = typeof header.seat === 'number' ? header.seat : 0;
  const history = new History(me);
  let state = null;
  let stateSeq = null;
  let input = null;
  const asks = new Map();
  const out = [];
  let open = null;   // an input position still taking acts (attack / block / a multi selection)
  const seenInput = new Set();

  const close = () => {
    if (!open) return;
    open.actual = actualFromActs(open.d, open.acts, open.state);
    open.actualToken = open.actual ? tokenFor(open.d, open.actual) : null;
    delete open.acts;
    delete open.state;
    open = null;
  };

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if (f.dir !== 'c2s') {
      history.push(f);
      if (f.type === 'state') { state = f.body; stateSeq = f.seq; }
      else if (f.type === 'input') {
        if (open && inputKindOf(f.body, state, me) !== open.d.kind) close();
        input = f.body;
      } else if (f.type === 'ask') asks.set(String(f.body.askId), f.body);
      continue;
    }
    if (f.type === 'answer') {
      close();
      const ask = asks.get(String(f.body.askId));
      if (!ask || !state) continue;
      asks.delete(String(f.body.askId));
      const d = classifyAsk({ state, ask });
      if (d.auto) continue;
      const actual = actualFromAnswer(d, f.body.value);
      out.push({ pos: out.length, frame: i, stateSeq, turn: state.turn, phase: state.phase, d, underDefaultStops: true,
        snap: snapshot({ history, state, me, decision: d, oracle }), actual, actualToken: actual ? tokenFor(d, actual) : null });
      continue;
    }
    if (f.type !== 'act' || !PLAY_ACTS.has(f.body.action) || !input || !state) continue;
    if (open && (open.d.kind === 'attack' || open.d.kind === 'block' || open.d.multi)) {
      open.acts.push(f.body);
      if (f.body.action === 'buttonOk' || f.body.action === 'buttonCancel') close();
      continue;
    }
    const k = `${inputKey(input)}#${stateSeq}`;
    if (seenInput.has(k)) continue;   // a second act on the same input: a refused click retried
    seenInput.add(k);
    const d = classifyInput({ state, input, me, oracle, opts });
    if (d.auto) continue;
    const snap = snapshot({ history, state, me, decision: d, oracle });
    const prev = out[out.length - 1];
    if (prev && prev.snap.mark.items === snap.mark.items && prev.snap.table === snap.table && prev.snap.decision === snap.decision) {
      continue;   // the same position again: the recorded seat's last move was refused and it tried another
    }
    open = { pos: out.length, frame: i, stateSeq, turn: state.turn, phase: state.phase, d,
      snap, acts: [f.body], state, underDefaultStops: underDefaultStops(d, state, me, oracle) };
    out.push(open);
    if (!(d.kind === 'attack' || d.kind === 'block' || d.multi) || f.body.action === 'buttonOk') close();
  }
  close();
  return out;
}
