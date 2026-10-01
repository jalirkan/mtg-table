/*
 * mtg-table — render/describe.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Pure label functions: `GameEvent` → a line of text, phase name → a label.
 *
 * These live outside `Board.tsx` for one reason: **they have to be testable**.
 * A pure-render crash shipped in M1 (`event.from.zone` on a `from: null` a
 * token produces) because the only contract test exercised `reduce()`, which
 * never calls a label function. `web/test/fixtures.test.ts` now runs
 * `describeEvent` over every event of every committed fixture, and it can only
 * do that if the function is importable — which a non-component export from a
 * `.tsx` module cannot be without turning off React Fast Refresh for the file.
 *
 * No DOM, no React, no imports beyond types.
 */

import type { EntityRef, GameEvent } from '../protocol.ts';

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

/**
 * The client maps Forge's phase name to a label; it never parses meaning out of
 * it (docs/protocol.md §3.1).
 */
const PHASE_LABELS: Record<string, string> = {
  UNTAP: 'Untap',
  UPKEEP: 'Upkeep',
  DRAW: 'Draw',
  MAIN1: 'Main 1',
  COMBAT_BEGIN: 'Begin combat',
  COMBAT_DECLARE_ATTACKERS: 'Declare attackers',
  COMBAT_DECLARE_BLOCKERS: 'Declare blockers',
  COMBAT_FIRST_STRIKE_DAMAGE: 'First-strike damage',
  COMBAT_DAMAGE: 'Combat damage',
  COMBAT_END: 'End of combat',
  MAIN2: 'Main 2',
  END_OF_TURN: 'End step',
  CLEANUP: 'Cleanup',
};

/** §10.5: `phase` is null in the pre-game frames, so this must be total. */
export function phaseLabel(phase: string | null): string {
  if (phase === null) return 'pre-game';
  return PHASE_LABELS[phase] ?? phase;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** `(player 0)`, or nothing for a shared zone (§3.6). */
export function zoneOwner(player: number | null): string {
  return player === null ? '' : ` (player ${String(player)})`;
}

/**
 * A zone ref, or the word for its absence. `from`/`to` are `null` when a card
 * came from nowhere or went nowhere — a token entering or leaving the
 * battlefield — which happens in **every** recorded fixture.
 */
function zoneRefLabel(ref: { zone: string; player: number | null } | null): string {
  return ref === null ? 'nowhere' : ref.zone + zoneOwner(ref.player);
}

/**
 * §3.6 rule 1: `stack[].text` and `cast.text` are `""` when the bridge concealed
 * them — the source card's identity is hidden from this seat, or the engine's
 * string mentioned the id of a card this frame concealed. The wire carries
 * nothing and the client labels the absence, so an empty description never
 * renders as an empty line.
 */
export function stackTextLabel(text: string): string {
  return text === '' ? '(hidden)' : text;
}

/** `player 1` / `#17`, total over the nullable `defender` refs of §3.1. */
export function entityRefLabel(ref: EntityRef | null): string {
  if (ref === null) return '—';
  return ref.kind === 'player' ? `player ${String(ref.id)}` : `#${String(ref.id)}`;
}

/**
 * §3.6: events carry ids only. We print ids, never a name we do not have.
 *
 * Total over every event shape the protocol allows, `null`s included — this is
 * the function the renderer calls once per event per frame, and a `TypeError`
 * in here unmounts the board.
 */
export function describeEvent(event: GameEvent): string {
  switch (event.kind) {
    case 'zone':
      return `#${String(event.cardId)} ${zoneRefLabel(event.from)} → ${zoneRefLabel(event.to)}`;
    case 'cast':
      return `#${String(event.cardId)} by player ${String(event.controller)} → stack #${String(event.stackId)}: ${stackTextLabel(event.text)}`;
    case 'resolved':
      return `#${String(event.cardId)}${event.fizzled ? ' (fizzled)' : ''}`;
    case 'unstacked':
      return `#${String(event.cardId)} left the stack without resolving`;
    case 'attackers':
      return `player ${String(event.player)}: ${event.bands
        .map(
          (b) =>
            `${b.attackerIds.map((id) => `#${String(id)}`).join(', ')} → ${entityRefLabel(b.defender)}`,
        )
        .join(' | ')}`;
    case 'blockers':
      // An unblocked attacker is `blockerIds: []` (amendment M52); a recording
      // made before M52 writes it as its own one blocker, which is the same fact.
      return `player ${String(event.defendingPlayer)}: ${event.blocks
        .map((b) => {
          const by = b.blockerIds.filter((id) => id !== b.attackerId);
          return by.length === 0
            ? `#${String(b.attackerId)} unblocked`
            : `#${String(b.attackerId)} blocked by ${by.map((id) => `#${String(id)}`).join(', ')}`;
        })
        .join(' | ')}`;
    case 'damage':
      // §10.6: damageType is always present and null for player damage.
      return `${String(event.amount)} to ${entityRefLabel(event.target)} from #${String(event.sourceCardId)}${event.combat ? ' (combat)' : ''}${typeof event.damageType === 'string' ? ` [${event.damageType}]` : ''}`;
    case 'life':
      return `player ${String(event.player)} ${String(event.from)} → ${String(event.to)}`;
    case 'poison':
      return `player ${String(event.player)} +${String(event.amount)} (from ${String(event.from)})`;
    case 'tap':
      return `#${String(event.cardId)} ${event.tapped ? 'tapped' : 'untapped'}`;
    case 'counters':
      return `#${String(event.cardId)} ${event.counter} ${String(event.from)} → ${String(event.to)}`;
    case 'attach':
      // `to: null` IS the unattach event (§3.6).
      return event.to === null
        ? `#${String(event.cardId)} unattached`
        : `#${String(event.cardId)} → ${entityRefLabel(event.to)}`;
    case 'sacrificed':
      return `#${String(event.cardId)}`;
    case 'land':
      return `player ${String(event.player)} played #${String(event.cardId)}`;
    case 'stats':
      return `${event.cardIds.map((id) => `#${String(id)}`).join(', ')}${event.transform ? ' (transformed)' : ''}`;
    case 'turn':
      return `turn ${String(event.turn)} — player ${String(event.player)}`;
    case 'phase':
      return `${phaseLabel(event.phase)} — player ${String(event.player)}`;
    case 'combat_end':
      return `attackers ${event.attackerIds.map((id) => `#${String(id)}`).join(', ') || '—'}, blockers ${event.blockerIds.map((id) => `#${String(id)}`).join(', ') || '—'}`;
    case 'shuffle':
      return `player ${String(event.player)}`;
    case 'mulligan':
      return `player ${String(event.player)}`;
    case 'outcome':
      return `${event.winner === null ? 'draw' : `player ${String(event.winner)} wins`} on turn ${String(event.lastTurn)}`;
    // Amendment P4 / report 06 §5.3 — counts and ids, no card identities.
    case 'scry':
      return `player ${String(event.player)} put ${String(event.toTop)} on top, ${String(event.toBottom)} on the bottom`;
    case 'surveil':
      return `player ${String(event.player)} put ${String(event.toLibrary)} back, ${String(event.toGraveyard)} in the graveyard`;
    case 'phased':
      return `#${String(event.cardId)} phased ${event.phasedOut ? 'out' : 'in'}`;
    case 'foretold':
      // `GameEventCardForetold` carries the activating player and no card at
      // all — the foretold card is face down in exile (§P7 of report 06).
      return `player ${String(event.player)} foretold a card`;
  }
}
