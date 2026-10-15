// mtg-table — the leak report's kinds of decision (D438, J129).
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Pure.  Every graded decision of the post-game review (coach-grade.sh review,
// D353) goes into exactly ONE kind, by the review's decision type, what the
// player chose and what the board he saw showed -- never by what the engine
// thought best, so a kind's mean regret is over every decision of that kind,
// the good ones included (a kind defined by "the engine disagreed" would have
// a mean above zero by construction).  The order of the tests is the
// precedence, fixed before any decision was graded:
//
//   spell  (his main phase, empty stack: cast something from hand, or not)
//     he passed                                      -> mana-up-vs-tap-out (held)
//     he cast, the opponent had >= 2 untapped lands  -> cast-into-open-mana
//     he cast, >= 2 different spells were castable   -> sequencing
//     he cast, otherwise                             -> mana-up-vs-tap-out (tapped)
//   attack
//     no attack, the opponent had no untapped creature -> no-attack-when-free
//     anything else                                     -> attack-other
//   block
//     two or more blockers on one attacker, or a chump (a blocker that dies to
//     its attacker without killing it, by printed P/T less damage) -> chump-or-double-block
//     anything else                                                -> block-other
//   target                                            -> target-choice
//
// Two kinds of the brief are not graded by the review at all, and are listed
// as such: land-late (the review plays Forge's land first in every option of a
// spell decision) and keep-or-mulligan (no grader takes the opening hand).
//
// Hidden information: the context is read from the state frame the player saw,
// his own redacted log (hard rule 8): battlefields, tapped flags, P/T, damage.

import { RULE } from './rule.ts';

export interface KindInfo {
  id: string;
  /** 1 when the review grades decisions of this kind. */
  covered: 0 | 1;
  /** Plain words for the report. */
  words: string;
}

export const KINDS: readonly KindInfo[] = Object.freeze([
  { id: 'land-late', covered: 0, words: 'playing a land late (not graded: the review plays the land drop the same way in every option)' },
  { id: 'no-attack-when-free', covered: 1, words: 'not attacking when the opponent had no untapped creature to block' },
  { id: 'chump-or-double-block', covered: 1, words: 'chump blocks and double blocks' },
  { id: 'mana-up-vs-tap-out', covered: 1, words: 'holding mana up versus tapping out in your main phase' },
  { id: 'cast-into-open-mana', covered: 1, words: 'casting a spell while the opponent had two or more untapped lands' },
  { id: 'keep-or-mulligan', covered: 0, words: 'keeping or mulliganing (not graded: no grader takes the opening hand)' },
  { id: 'sequencing', covered: 1, words: 'which spell to cast first when two or more were castable' },
  { id: 'attack-other', covered: 1, words: 'other attacks (attacking, or holding back into possible blockers)' },
  { id: 'block-other', covered: 1, words: 'other blocks (no block, or a trade)' },
  { id: 'target-choice', covered: 1, words: 'choosing a target' },
]);

export const KIND_IDS: readonly string[] = KINDS.map((k) => k.id);

export interface Pt { p: number; t: number; damage: number }

export interface Context {
  oppUntappedLands: number;
  oppUntappedCreatures: number;
  /** Battlefield cards' printed power and toughness and marked damage, by id (both sides). */
  pt: Record<string, Pt>;
}

type Obj = Record<string, unknown>;
const obj = (x: unknown): Obj => (x && typeof x === 'object' ? (x as Obj) : {});
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const num = (x: unknown): number => (typeof x === 'number' ? x : typeof x === 'string' && /^-?\d+$/.test(x) ? Number(x) : NaN);

/** The board context of a state frame's body, for the viewing seat. */
export function contextOf(state: unknown, seat: number): Context {
  const ctx: Context = { oppUntappedLands: 0, oppUntappedCreatures: 0, pt: {} };
  for (const po of arr(obj(state).players)) {
    const p = obj(po);
    const mine = p.id === seat;
    for (const co of arr(obj(obj(p.zones).battlefield).cards)) {
      const c = obj(co);
      const types = String(c.types ?? '');
      const untapped = c.tapped !== true;
      if (!mine && untapped && /\bLand\b/.test(types)) ctx.oppUntappedLands++;
      if (!mine && untapped && /\bCreature\b/.test(types)) ctx.oppUntappedCreatures++;
      if (c.id !== undefined) ctx.pt[String(c.id)] = { p: num(c.power), t: num(c.toughness), damage: num(c.damage) || 0 };
    }
  }
  return ctx;
}

export interface ReviewDecision {
  type: string;
  played?: string | null;
  playedOption?: string | null;
  options?: { token?: string }[];
}

/** "block:18>65,26>121" -> [[18, 65], [26, 121]]; "block:none" -> []. */
export function blockPairs(token: string): [string, string][] {
  const body = token.replace(/^block:/, '');
  if (body === '' || body === 'none') return [];
  return body.split(',').map((x) => {
    const [b, a] = x.split('>');
    return [String(b ?? '').trim(), String(a ?? '').trim()] as [string, string];
  });
}

/** True when a blocker dies to its attacker and does not kill it (printed P/T less marked damage). */
export function isChump(blocker: Pt | undefined, attacker: Pt | undefined): boolean {
  if (!blocker || !attacker) return false;
  if (![blocker.p, blocker.t, attacker.p, attacker.t].every(Number.isFinite)) return false;
  return blocker.t - blocker.damage <= attacker.p && blocker.p < attacker.t - attacker.damage;
}

export interface Classified {
  kind: string;
  /** For mana-up-vs-tap-out: which way he went. */
  direction?: 'held' | 'tapped';
}

/** The one kind of a graded decision (see the header for the order). */
export function classify(d: ReviewDecision, ctx: Context): Classified {
  const tok = String(d.played ?? d.playedOption ?? '');
  const opt = String(d.playedOption ?? d.played ?? '');
  switch (d.type) {
    case 'spell': {
      if (opt === 'pass' || tok === 'pass') return { kind: 'mana-up-vs-tap-out', direction: 'held' };
      if (ctx.oppUntappedLands >= RULE.openManaMin) return { kind: 'cast-into-open-mana' };
      const casts = new Set((d.options ?? []).map((o) => String(o.token ?? '')).filter((t) => t.startsWith('cast:')));
      if (casts.size >= 2) return { kind: 'sequencing' };
      return { kind: 'mana-up-vs-tap-out', direction: 'tapped' };
    }
    case 'attack':
      if ((opt === 'attack:none' || tok === 'attack:none') && ctx.oppUntappedCreatures === 0) return { kind: 'no-attack-when-free' };
      return { kind: 'attack-other' };
    case 'block': {
      const pairs = blockPairs(tok.startsWith('block:') ? tok : opt);
      const per = new Map<string, number>();
      for (const [, a] of pairs) per.set(a, (per.get(a) ?? 0) + 1);
      const double = [...per.values()].some((n) => n >= 2);
      const chump = pairs.some(([b, a]) => isChump(ctx.pt[b], ctx.pt[a]));
      return { kind: double || chump ? 'chump-or-double-block' : 'block-other' };
    }
    case 'target':
      return { kind: 'target-choice' };
    default:
      throw new Error(`a decision type the leak report does not know: ${d.type}`);
  }
}
