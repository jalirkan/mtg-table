/*
 * mtg-table — arena/cues/resolve.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The ladder** (report 09 §7.3): one `GameEvent` and one frame in, one
 * {@link Cue} out. Pure — no three, no React, no DOM, no clock — and
 * exhaustively tested (`web/test/cues-exhaustive.test.ts`).
 *
 * ```
 *   1. cards[name][selector]          the per-card cue          (E5's data)
 *   2. cards[name][kind]
 *   3. archetypes[type/colour][…]     creature/W, land/*, equipment/*
 *   4. archetypes[looser][…]          creature/* , then the colour-only key
 *   5. defaults[selector], defaults[kind]                        (§6)
 *   6. NO_OP
 * ```
 *
 * **Nothing in it can fail.** Every step is a lookup with a fallback and the
 * last fallback is a zero-duration no-op, so `resolve()` never throws and never
 * returns `undefined`. That is the animation system's version of the rule the
 * board already lives by: a missing image renders a text card and never blocks
 * a click.
 *
 * ---------------------------------------------------------------------------
 * **Ids only** (protocol §3.6 rule 1). The cue this file builds carries card
 * ids, player ids and numbers. It never carries a card name — not even the one
 * string an event may legitimately have, `cast.text`, which is the stack
 * description and is gated on the bridge. A renderer that captioned an
 * animation from a name it had cached is exactly the leak shape §3.6 rule 1 and
 * amendment P5 exist to prevent, so the arena simply has no caption.
 * ---------------------------------------------------------------------------
 */

import type { AnyCard, GameEvent } from '../../protocol.ts';
import type { ClientState } from '../../reduce.ts';
import { findCard } from '../../render/resolve.ts';
import { colourHex, colourIdOf } from '../colour.ts';
import { archetypeKey, looserArchetypeKeys } from './archetype.ts';
import { DEFAULT_CUES, DEFAULT_SELECTOR_CUES } from './defaults.ts';
import {
  counterToken,
  NO_OP,
  NO_PARAMS,
  type Cue,
  type CueData,
  type CueParams,
  type CueSpec,
  type CueTable,
  type EventKind,
  type Lane,
} from './types.ts';

/** What the ladder found, and where. `source` is only ever used in messages. */
export interface Resolution {
  spec: CueSpec;
  selector: string;
  source: 'card' | 'archetype' | 'default' | 'none';
}

export const NO_OP_SPEC: CueSpec = Object.freeze({ cue: NO_OP, ms: 0 });

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/**
 * The selectors one event matches, **most specific first**, always ending with
 * the bare kind.
 *
 * The grammar is §7.3's and is deliberately tiny: a zone transition, `alone`,
 * `lethal`, a counter name with an optional `+`/`-`, `player`, `card`, `off`,
 * `transform`, `fizzled`, `*`. Anything else is not a selector, and
 * `validate.ts` says so about a cue file that invents one.
 */
export function selectorsFor(event: GameEvent, state: ClientState): string[] {
  const kind = event.kind;
  const out: string[] = [];
  switch (event.kind) {
    case 'zone': {
      const from = event.from?.zone ?? 'nowhere';
      const to = event.to?.zone ?? 'nowhere';
      out.push(`zone:${from}>${to}`, `zone:*>${to}`, `zone:${from}>*`);
      break;
    }
    case 'damage': {
      if (event.target.kind === 'player') out.push('damage:player');
      else {
        if (isLethal(event, state)) out.push('damage:lethal');
        out.push('damage:card');
      }
      break;
    }
    case 'attackers': {
      let n = 0;
      for (const band of event.bands) n += band.attackerIds.length;
      if (n === 1) out.push('attackers:alone');
      break;
    }
    case 'counters': {
      const dir = event.to > event.from ? '+' : '-';
      const token = counterToken(event.counter);
      out.push(`counters:${token}${dir}`, `counters:${token}`, `counters:${dir}`);
      break;
    }
    case 'attach':
      out.push(event.to === null ? 'attach:off' : 'attach:on');
      break;
    case 'stats':
      if (event.transform) out.push('stats:transform');
      break;
    case 'resolved':
      if (event.fizzled) out.push('resolved:fizzled');
      break;
    case 'tap':
      out.push(event.tapped ? 'tap:on' : 'tap:off');
      break;
    case 'phased':
      out.push(event.phasedOut ? 'phased:out' : 'phased:in');
      break;
    default:
      break;
  }
  out.push(`${kind}:*`, kind);
  return out;
}

/**
 * §6's `lethal` qualifier — "amount ≥ toughness − damage".
 *
 * The snapshot in hand **already reflects** the damage (§3.6's opening line), so
 * the arithmetic is done on what the card looks like now, and the commonest
 * lethal case is simplest of all: the creature is not on a battlefield any
 * more, because it died. An unparseable toughness (`*`, `1+*`) is not lethal —
 * a wrong guess here costs one extra shake, and guessing *lethal* on a creature
 * that lived is the more jarring of the two errors.
 */
export function isLethal(event: GameEvent, state: ClientState): boolean {
  if (event.kind !== 'damage' || event.target.kind !== 'card') return false;
  const board = state.board;
  if (board === null) return false;
  const card = findCard(board, event.target.id);
  if (card === undefined) return true; // it is gone: the damage was the last of it
  const onField = board.players.some((p) =>
    p.zones.battlefield.cards.some((c) => c.id === event.target.id),
  );
  if (!onField) return true;
  const toughness = Number.parseInt(String((card as { toughness?: string | null }).toughness ?? ''), 10);
  if (!Number.isFinite(toughness)) return false;
  const damage = (card as { damage?: number }).damage ?? 0;
  return damage >= toughness;
}

// ---------------------------------------------------------------------------
// The ladder
// ---------------------------------------------------------------------------

/**
 * §7.3, exactly. `card` is `null` for a player-only event (life, turn, shuffle),
 * which skips rungs 1–4 and lands on the defaults.
 */
export function resolve(
  selectors: string[],
  kind: string,
  card: AnyCard | null,
  data: CueData,
): Resolution {
  const name = card === null ? null : cardName(card);

  // 1 & 2 — the per-card entry, selector first then the bare kind.
  if (name !== null) {
    const table = data.cards[name];
    const hit = pick(table, selectors);
    if (hit !== null) return { spec: hit.spec, selector: hit.selector, source: 'card' };
  }

  // 3 & 4 — the archetype, then the looser archetypes.
  if (card !== null) {
    for (const key of [archetypeKey(card), ...looserArchetypeKeys(card)]) {
      const hit = pick(data.archetypes[key], selectors);
      if (hit !== null) return { spec: hit.spec, selector: hit.selector, source: 'archetype' };
    }
  }

  // 5 — the defaults. A cue file may override them (§7.2); the built-in table
  // is the one that is exhaustive over `EventKind` by type.
  const override = pick(data.defaults, selectors);
  if (override !== null) return { spec: override.spec, selector: override.selector, source: 'default' };
  const bySelector = pick(DEFAULT_SELECTOR_CUES, selectors);
  if (bySelector !== null)
    return { spec: bySelector.spec, selector: bySelector.selector, source: 'default' };
  const byKind = (DEFAULT_CUES as Record<string, CueSpec | undefined>)[kind];
  if (byKind !== undefined) return { spec: byKind, selector: kind, source: 'default' };

  // 6 — §3.6 rule 3. An unknown kind is logged once and animated as nothing.
  return { spec: NO_OP_SPEC, selector: kind, source: 'none' };
}

function pick(
  table: CueTable | undefined,
  selectors: string[],
): { spec: CueSpec; selector: string } | null {
  if (table === undefined) return null;
  for (const selector of selectors) {
    const spec = table[selector];
    if (spec !== undefined) return { spec, selector };
  }
  return null;
}

function cardName(card: AnyCard): string | null {
  const name = (card as { name?: string }).name;
  return typeof name === 'string' && name !== '' ? name : null;
}

// ---------------------------------------------------------------------------
// Event → cue
// ---------------------------------------------------------------------------

/**
 * The card the ladder is *about*: the first card id the event names, resolved
 * against **this** frame and nowhere else (amendment P5 — there is no cache to
 * go stale). An id that does not resolve is a card the viewer may not see
 * (§3.6 rule 1), and the ladder then takes the defaults, which is right: we may
 * not know what it is, so we animate it as anything.
 */
export function subjectOf(event: GameEvent, state: ClientState): AnyCard | null {
  const board = state.board;
  if (board === null) return null;
  const ids = cardIdsOf(event);
  const first = ids[0];
  if (first === undefined) return null;
  return findCard(board, first) ?? null;
}

/** The card ids this event moves, in the order it names them. */
export function cardIdsOf(event: GameEvent): number[] {
  switch (event.kind) {
    case 'zone':
    case 'cast':
    case 'resolved':
    case 'unstacked':
    case 'sacrificed':
    case 'tap':
    case 'counters':
    case 'attach':
    case 'land':
    case 'phased':
      return [event.cardId];
    case 'damage':
      return event.target.kind === 'card' ? [event.target.id] : [];
    case 'stats':
      return [...event.cardIds];
    case 'combat_end':
      return [...event.attackerIds, ...event.blockerIds];
    case 'attackers': {
      const ids: number[] = [];
      for (const band of event.bands) ids.push(...band.attackerIds);
      return ids;
    }
    case 'blockers': {
      const ids: number[] = [];
      for (const block of event.blocks) {
        // M7: an unblocked attacker maps to itself. That is Forge's encoding,
        // relayed verbatim — never render it as "blocked by itself".
        if (block.blockerIds.length === 1 && block.blockerIds[0] === block.attackerId) continue;
        ids.push(...block.blockerIds);
      }
      return ids;
    }
    default:
      return [];
  }
}

/**
 * One event → zero or more cues, each already targeted and parameterised.
 *
 * Most events give exactly one cue. Two give several on purpose:
 * **`attackers`** expands to one cue per attacker so §6's "staggered 60 ms per
 * attacker" is per *attacker* rather than per band, and **`blockers`** to one
 * per blocker so each can lunge at the attacker it actually blocked.
 */
export function cuesFor(event: GameEvent, state: ClientState, data: CueData): Cue[] {
  const selectors = selectorsFor(event, state);
  const kind: string = event.kind;

  const make = (
    targets: number[],
    players: number[],
    params: Record<string, string | number | boolean>,
    subject: AnyCard | null,
  ): Cue | null => {
    const found = resolve(selectors, kind, subject, data);
    if (found.spec.cue === NO_OP) return null;
    const colour = subject === null ? null : glowColourOf(subject);
    const merged: CueParams = {
      ...(colour === null ? {} : { colour }),
      ...params,
      // Data wins over facts: a per-card entry that sets `colour` is art
      // direction, and art direction is what a cue file is for.
      ...(found.spec.params ?? NO_PARAMS),
    };
    return {
      id: found.spec.cue,
      targets,
      players,
      ms: Math.max(0, found.spec.ms),
      lane: found.spec.lane ?? ('card' as Lane),
      params: merged,
      kind,
      selector: found.selector,
      key: '',
    };
  };

  const subject = subjectOf(event, state);
  const one = (
    targets: number[],
    players: number[],
    params: Record<string, string | number | boolean> = {},
  ): Cue[] => {
    const cue = make(targets, players, params, subject);
    return cue === null ? [] : [cue];
  };

  switch (event.kind) {
    case 'zone':
      return one([event.cardId], playersOf(event), {
        fromZone: event.from?.zone ?? '',
        fromPlayer: event.from?.player ?? -1,
        toZone: event.to?.zone ?? '',
        toPlayer: event.to?.player ?? -1,
      });

    case 'cast': {
      // §6's beam: the target comes from `stack[].targetCardIds` of THIS frame,
      // as an id. `targetDescription()` is banned at field level and never
      // reaches the wire, so an id is all there is — which is the point.
      const item = state.board?.stack.find((s) => s.id === event.stackId);
      const beam: Record<string, number> = {};
      const card0 = item?.targetCardIds[0];
      const player0 = item?.targetPlayerIds[0];
      if (card0 !== undefined) beam['beamTo'] = card0;
      else if (player0 !== undefined) beam['beamToPlayer'] = player0;
      // `fromZone`/`fromPlayer` name the CONTROLLER's hand, so the spell rises
      // out of the hand that cast it rather than out of the viewer's.
      return one([event.cardId], [event.controller], {
        stackId: event.stackId,
        fromZone: 'hand',
        fromPlayer: event.controller,
        ...beam,
      });
    }

    case 'resolved':
      return one([event.cardId], [], { fizzled: event.fizzled });

    case 'unstacked':
    case 'sacrificed':
      return one([event.cardId], []);

    case 'land':
      return one([event.cardId], [event.player]);

    case 'tap':
      // The snapshot already shows the card tapped, so the cue animates the
      // approach: it starts a quarter-turn *back* and decays to identity.
      return one([event.cardId], [], { dir: event.tapped ? 1 : -1 });

    case 'counters':
      return one([event.cardId], [], {
        counter: event.counter,
        from: event.from,
        to: event.to,
        delta: event.to - event.from,
      });

    case 'attach':
      return one([event.cardId], [], {
        toKind: event.to?.kind ?? 'none',
        toId: event.to?.id ?? -1,
      });

    case 'stats':
      return one([...event.cardIds], [], { transform: event.transform });

    case 'phased':
      return one([event.cardId], [], { phasedOut: event.phasedOut });

    case 'damage':
      return one(event.target.kind === 'card' ? [event.target.id] : [], event.target.kind === 'player' ? [event.target.id] : [], {
        amount: event.amount,
        sourceId: event.sourceCardId,
        combat: event.combat,
        targetKind: event.target.kind,
        targetId: event.target.id,
      });

    case 'life':
      return one([], [event.player], {
        from: event.from,
        to: event.to,
        delta: event.to - event.from,
      });

    case 'poison':
      return one([], [event.player], { from: event.from, amount: event.amount });

    case 'attackers': {
      const out: Cue[] = [];
      let index = 0;
      for (const band of event.bands) {
        for (const id of band.attackerIds) {
          const cue = make(
            [id],
            [event.player],
            {
              defenderKind: band.defender?.kind ?? 'none',
              defenderId: band.defender?.id ?? -1,
              index: index++,
            },
            state.board === null ? null : (findCard(state.board, id) ?? null),
          );
          if (cue !== null) out.push(cue);
        }
      }
      return out;
    }

    case 'blockers': {
      const out: Cue[] = [];
      for (const block of event.blocks) {
        if (block.blockerIds.length === 1 && block.blockerIds[0] === block.attackerId) continue;
        for (const id of block.blockerIds) {
          const cue = make(
            [id],
            [event.defendingPlayer],
            { attackerId: block.attackerId },
            state.board === null ? null : (findCard(state.board, id) ?? null),
          );
          if (cue !== null) out.push(cue);
        }
      }
      return out;
    }

    case 'combat_end':
      return one([...event.attackerIds, ...event.blockerIds], []);

    case 'turn':
      return one([], [event.player], { turn: event.turn, own: ownTurn(event.player, state) });

    case 'phase':
      // Never queued (see `DEFAULT_CUES.phase`); resolved anyway so the
      // coverage table has a real row for the second commonest kind in the
      // stream.
      return one([], [event.player], { phase: event.phase });

    case 'shuffle':
      return one([], [event.player]);

    case 'mulligan':
      // The snapshot already holds the NEW hand, so the cue deals that hand in
      // rather than sweeping away one that no longer exists anywhere.
      return one(handIdsOf(event.player, state), [event.player]);

    case 'scry':
      return one([], [event.player], { toTop: event.toTop, toBottom: event.toBottom });

    case 'surveil':
      return one([], [event.player], {
        toTop: event.toLibrary,
        toBottom: event.toGraveyard,
        graveyard: true,
      });

    case 'foretold':
      return one([], [event.player]);

    case 'outcome':
      return one(losingSideIds(event.winner, state), playerIdsOf(state), {
        winner: event.winner ?? -1,
        lastTurn: event.lastTurn,
        draw: event.winner === null,
        // Which banner: the seat this stream was redacted for is the one the
        // word "Victory" is about. An AI-vs-AI recording has no human seat, and
        // `hello.you` then names whichever seat the log was written for.
        won: event.winner !== null && event.winner === (state.hello?.you ?? -2),
      });

    default:
      return [];
  }
}

function playersOf(event: Extract<GameEvent, { kind: 'zone' }>): number[] {
  const out: number[] = [];
  if (event.from?.player != null) out.push(event.from.player);
  if (event.to?.player != null && !out.includes(event.to.player)) out.push(event.to.player);
  return out;
}

function ownTurn(playerId: number, state: ClientState): boolean {
  const you = state.hello?.you ?? null;
  return you !== null && you === playerId;
}

function handIdsOf(playerId: number, state: ClientState): number[] {
  const player = state.board?.players.find((p) => p.id === playerId);
  return player === undefined ? [] : player.zones.hand.cards.map((c) => c.id);
}

function playerIdsOf(state: ClientState): number[] {
  return state.board?.players.map((p) => p.id) ?? [];
}

/** The losing side's permanents — §6's "the losing player's side desaturates". */
function losingSideIds(winner: number | null, state: ClientState): number[] {
  const board = state.board;
  if (board === null || winner === null) return [];
  const out: number[] = [];
  for (const player of board.players) {
    if (player.id === winner) continue;
    for (const card of player.zones.battlefield.cards) out.push(card.id);
  }
  return out;
}

/** A card's glow colour, from `manaCost` and nothing else (§7.3, `colour.ts`). */
export function glowColourOf(card: AnyCard): string {
  const cost = (card as { manaCost?: string | null }).manaCost ?? null;
  return colourHex(colourIdOf(cost));
}

/** Re-exported so a caller needs one import for "what kind is this". */
export type { EventKind };
