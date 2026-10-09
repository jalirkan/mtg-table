// mtg-table — tools/llm-seat/lib/stops.mjs
// Copyright (C) 2026 mtg-table contributors.
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Forge's own phase stops (M32 `players[].phaseStops`, M33 `act: setPhaseStop
// {phase, turn, stop}`), so the engine itself skips the phases where the seat
// has nothing to decide and no model call is spent on them.
//
// The seat's stops = a minimal default set, recomputed from the board, plus
// whatever the model's last reply asked for (`next: opp END_OF_TURN, own
// MAIN1`).  The defaults (Justin's rule, D418):
//   own MAIN1, own MAIN2                                  always
//   opp COMBAT_DECLARE_BLOCKERS                            while you control a creature
//   opp END_OF_TURN                                        while you have an untapped land AND
//                                                          an instant-speed option (an Instant
//                                                          or a FLASH card in hand, or a permanent
//                                                          with a non-mana activated ability)
// What the stops do NOT gate (verified, docs/llm-seat.md): a non-empty stack
// prompts the seat whatever the stops say, and the attack / block declarations
// are inputs of their own.

import { PHASES, hasKeyword, isCreature, isLand, nameOf, playersOf } from './frames.mjs';
import { hasNonManaActivated } from './oracle.mjs';

export const STOP_PHASES = PHASES;

export function defaultStops(state, me, oracle = null) {
  const own = new Set(['MAIN1', 'MAIN2']);
  const opp = new Set();
  const { mine } = playersOf(state, me);
  if (!mine) return { own, opp };
  const bf = (mine.zones?.battlefield?.cards ?? []).filter((c) => c.hidden !== true && c.controller === me);
  if (bf.some(isCreature)) opp.add('COMBAT_DECLARE_BLOCKERS');
  const untappedLand = bf.some((c) => isLand(c) && !c.tapped);
  const instantInHand = (mine.zones?.hand?.cards ?? []).some((c) => c.hidden !== true
    && (/\bInstant\b/.test(String(c.types ?? '')) || hasKeyword(c, 'FLASH')));
  const activated = oracle ? bf.some((c) => !isLand(c) && nameOf(c) && hasNonManaActivated(oracle.text(nameOf(c)))) : false;
  if (untappedLand && (instantInHand || activated)) opp.add('END_OF_TURN');
  return { own, opp };
}

/** defaults ∪ requested ([{turn, phase}]). */
export function desiredStops(state, me, requested = [], oracle = null) {
  const d = defaultStops(state, me, oracle);
  for (const r of requested) d[r.turn].add(r.phase);
  return d;
}

/** The setPhaseStop acts that turn the state's stops into `want`; [] when the state carries none (pre-M32). */
export function stopActs(state, me, want) {
  const { mine } = playersOf(state, me);
  const have = mine?.phaseStops;
  if (!have || !Array.isArray(have.own) || !Array.isArray(have.opp)) return [];
  const out = [];
  for (const turn of ['own', 'opp']) {
    const cur = new Set(have[turn]);
    for (const phase of STOP_PHASES) {
      const on = want[turn].has(phase);
      if (on !== cur.has(phase)) out.push({ type: 'act', action: 'setPhaseStop', phase, turn, stop: on });
    }
  }
  return out;
}

export const stopsText = (want) => `own ${[...want.own].join(' ') || '-'}; opp ${[...want.opp].join(' ') || '-'}`;
