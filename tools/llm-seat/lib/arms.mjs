// mtg-table — tools/llm-seat/lib/arms.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// THE CONTEXT ARMS -- the experiment's point: does one long chat degrade?
//
//   fresh       every call a new `claude -p`, with the game log since the
//               start, the state table, the card text and the decision;
//   session:N   one ongoing CLI session: its first call is a `fresh` message,
//               every later one only what happened since the last call (plus
//               the state table and the decision), and after N calls the
//               session is dropped and the next call starts a new one with
//               the whole history re-supplied;
//   game        session:∞ -- one session for the whole game.
//
// An Arm turns one posed decision (a prompt snapshot plus the decision) into
// a validated choice: one call, a retry on a malformed or invalid reply
// (inside the same session for a session arm; a fresh call with the reply and
// the reason for `fresh`), then the safe default, counted as a fallback.
// Everything it did is returned for the decision log.

import { checkChoice } from './decision.mjs';
import { SYSTEM_PROMPT, deltaPrompt, fullPrompt, retryPrompt } from './prompt.mjs';
import { parseReply } from './reply.mjs';
import { newSessionId } from './model.mjs';

export function parseArm(spec) {
  if (spec === 'fresh') return { name: 'fresh', kind: 'fresh', n: 1 };
  if (spec === 'game') return { name: 'game', kind: 'session', n: Infinity };
  const m = /^session:(\d+)$/.exec(spec);
  if (m && Number(m[1]) >= 1) return { name: spec, kind: 'session', n: Number(m[1]) };
  throw new Error(`unknown --context ${JSON.stringify(spec)}: fresh | session:N | game`);
}

export class Arm {
  constructor(spec, model, { system = SYSTEM_PROMPT, onPrompt = null } = {}) {
    this.spec = typeof spec === 'string' ? parseArm(spec) : spec;
    this.model = model;
    this.system = system;
    this.onPrompt = onPrompt;
    this.reset();
    this.calls = 0;
    this.resets = 0;
  }

  reset() {
    this.session = null;       // {id, started}
    this.inSession = 0;        // calls since the session began
    this.since = null;         // history mark at the last call
    this.shown = new Set();    // card names already given in this session
  }

  /** The user message for this snapshot and where it sits in the session. */
  message(snap, previous = null, override = null) {
    if (override !== null) return { user: override, full: true };
    if (this.spec.kind === 'fresh' || this.session === null || !this.session.started || this.inSession >= this.spec.n) {
      return { user: fullPrompt(snap), full: true };
    }
    return { user: deltaPrompt(snap, { since: this.since, shown: this.shown, previous }), full: false };
  }

  /**
   * decide(snap, decision, {previous}) -> {chosen, next, how: 'model'|'fallback', calls:[...], ...}
   * `previous` is a line to put first in a delta message (what became of the last decision).
   */
  async decide(snap, decision, { previous = null, user: override = null } = {}) {
    const record = { arm: this.spec.name, sessionPos: null, calls: [], retries: 0 };
    let { user, full } = this.message(snap, previous, override);
    const firstUser = user;
    if (full && this.spec.kind === 'session') {
      if (this.session !== null) this.resets += 1;
      this.reset();
      this.session = { id: newSessionId(), started: false };
    }
    record.sessionPos = this.spec.kind === 'fresh' ? 0 : this.inSession;
    record.full = full;
    let chosen = null;
    let next = null;
    let lastText = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      const session = this.spec.kind === 'session' ? { id: this.session.id, resume: this.session.started } : null;
      if (this.onPrompt) this.onPrompt({ arm: this.spec.name, attempt, system: this.system, user, session });
      const t0 = Date.now();
      let res;
      try {
        res = await this.model.call({ system: this.system, user, session });
      } catch (e) {
        record.calls.push({ attempt, promptBytes: Buffer.byteLength(user, 'utf8'), error: String(e.message ?? e), ms: Date.now() - t0 });
        if (session) this.session.started = this.session.started || false;
        break;   // a transport error is not retried as a malformed reply; the default is played
      }
      this.calls += 1;
      if (session) {
        this.session.started = true;
        if (res.sessionId) this.session.id = res.sessionId;
      }
      lastText = res.text;
      const call = {
        attempt, promptBytes: Buffer.byteLength(user, 'utf8'), systemBytes: Buffer.byteLength(this.system, 'utf8'),
        replyBytes: Buffer.byteLength(res.text ?? '', 'utf8'), usage: res.usage, costUsd: res.costUsd ?? null,
        ms: res.ms ?? (Date.now() - t0), reply: String(res.text ?? '').slice(0, 400),
      };
      record.calls.push(call);
      const p = parseReply(res.text);
      const err = p.ok ? checkChoice(decision, p.choice) : p.error;
      if (!err) { chosen = p.choice; next = p.next; break; }
      call.error = err;
      if (attempt === 0) {
        record.retries += 1;
        if (this.spec.kind === 'session') {
          user = retryPrompt(err, snap.decision);
        } else {
          user = `${firstUser}\n\nYOUR PREVIOUS REPLY\n${String(lastText).slice(0, 400)}\n\n${retryPrompt(err, '(the decision above)')}`;
        }
      }
    }
    // the session now holds everything up to this decision
    if (this.spec.kind === 'session' && this.session?.started) {
      this.inSession += 1;
      this.since = snap.mark;
      for (const n of snap.names) this.shown.add(n);
    }
    if (chosen === null) {
      return { ...record, chosen: decision.fallback, next: null, how: 'fallback' };
    }
    return { ...record, chosen, next, how: 'model' };
  }
}
