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

import type { AnyCard, GameEvent, GameStateBody, StackItem } from '../../protocol.ts';
import type { ClientState } from '../../reduce.ts';
import { findCard } from '../../render/resolve.ts';
import { colourHex, colourIdOf } from '../colour.ts';
import { archetypeKey, looserArchetypeKeys } from './archetype.ts';
import { DEFAULT_CUES, DEFAULT_SELECTOR_CUES } from './defaults.ts';
import { isConcealed, soundFor } from './sound.ts';
import {
  counterToken,
  NO_OP,
  NO_PARAMS,
  type Cue,
  type CueData,
  type CueSpec,
  type CueTable,
  type EventKind,
  type Lane,
} from './types.ts';

/** What the ladder found, and where. `source` is read by messages and by the sound ladder (D250: a row sets a sound, a default rung falls through). */
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
    case 'outcome':
      // D250 — the result from the viewer's seat: the seat the stream was redacted
      // for, the same one the banner's "Victory" is about (`won` below). The
      // default sounds key their stings off it; no cue row does yet.
      out.push(outcomeSelector(event.winner, state));
      break;
    default:
      break;
  }
  out.push(`${kind}:*`, kind);
  return out;
}

/** `outcome:won`, `outcome:lost` or `outcome:draw`, from the viewer's seat. */
function outcomeSelector(winner: number | null, state: ClientState): string {
  if (winner === null) return 'outcome:draw';
  return winner === (state.hello?.you ?? -2) ? 'outcome:won' : 'outcome:lost';
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
 * The controller of a card the snapshot still carries, as the `players` list a cue
 * reads `ctx.players[0]` out of. Empty when the wire does not say (T6, §6.3).
 */
function casterOf(subject: AnyCard | null): number[] {
  const controller = (subject as { controller?: number | null } | null)?.controller ?? null;
  return controller === null ? [] : [controller];
}

/**
 * **T6's strike: what the resolving spell was aimed at** (report 13 §6.3), read off
 * the frame **immediately before** the one carrying the `resolved` event.
 *
 * `ResolvedEvent` is `{cardId, fizzled}` — no stack id and no targets — and by the
 * frame that carries it the item has left `state.stack`. But an event batch *is*
 * the transition from the previous frame to this one, and the previous frame said,
 * in so many ids, "this spell is on top of the stack and it targets that". Both
 * are facts the engine stated; reading them one frame back is the same one-frame
 * window an `ask` is allowed to be justified by (CLAUDE.md M6 convention 3), and
 * nothing is remembered past the batch — a cue is built from it and the cue decays.
 *
 * Measured over the whole committed corpus on 2026-09-26:
 *
 *     412 `resolved` events · the item is on the PREVIOUS frame's stack in 333 ·
 *     41 of those carry a target · the SAME frame would give 7
 *
 * The 79 with no previous item are triggers and abilities that went on and came
 * off inside one engine step; they have nothing to aim at and simply discharge at
 * the caster's anchor, which is not an inconsistency — an untargeted spell has no
 * target to strike. A flush (a scrub, a `resync`) passes no previous frame at
 * all, and then there is no strike, which is the snap a flush always is.
 *
 * The stack is **bottom first** (protocol §3.3), so the resolving item is the
 * *last* entry with this source — two triggers from one permanent are the case
 * that makes the direction matter. Ids and one boolean only: `strikeCard` /
 * `strikePlayer` are numbers, which the redaction net passes because a number
 * cannot be a name (report 13 §3.5), and `strikeFoe` says whether the thing
 * struck belongs to someone other than the caster — `hit` if so, `channel` if not
 * — which is a reading of two `controller` fields and not of what the spell did.
 */
function strikeParams(
  cardId: number,
  caster: number | null,
  state: ClientState,
  previous: GameStateBody | null,
): Record<string, number | boolean> {
  if (previous === null) return {};
  let item: StackItem | null = null;
  for (let i = previous.stack.length - 1; i >= 0; i--) {
    const candidate = previous.stack[i];
    if (candidate !== undefined && candidate.sourceCardId === cardId) {
      item = candidate;
      break;
    }
  }
  if (item === null) return {};
  const card = item.targetCardIds[0];
  if (card !== undefined) {
    const board = state.board;
    const target = board === null ? undefined : findCard(board, card);
    const owner = (target as { controller?: number | null } | undefined)?.controller ?? null;
    return {
      strikeCard: card,
      strikeFoe: owner !== null && caster !== null && owner !== caster,
      strikeGrew: sizeChange(findCard(previous, card), target),
    };
  }
  const player = item.targetPlayerIds[0];
  if (player !== undefined) {
    return { strikePlayer: player, strikeFoe: caster !== null && player !== caster };
  }
  return {};
}

/**
 * One event → zero or more cues, each already targeted and parameterised.
 *
 * Most events give exactly one cue. Two give several on purpose:
 * **`attackers`** expands to one cue per attacker so §6's "staggered 60 ms per
 * attacker" is per *attacker* rather than per band, and **`blockers`** to one
 * per blocker so each can lunge at the attacker it actually blocked.
 */
export function cuesFor(
  event: GameEvent,
  state: ClientState,
  data: CueData,
  previous: GameStateBody | null = null,
): Cue[] {
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
    const merged: Record<string, string | number | boolean> = {
      ...(colour === null ? {} : { colour }),
      ...params,
      // Data wins over facts: a per-card entry that sets `colour` is art
      // direction, and art direction is what a cue file is for.
      ...(found.spec.params ?? NO_PARAMS),
    };
    /**
     * **D250 — the DECIDED sound replaces whatever the row said**, so the queue
     * reads one answer off the params. For a concealed subject (a stub, any
     * face-down card) `soundFor` reads no row at all — the event's default only,
     * hard rule 8's renderer half — and the gate is the subject's flags, decided
     * before anything of the row is read.
     */
    delete merged['sound'];
    delete merged['soundAt'];
    delete merged['soundGain'];
    delete merged['soundCard'];
    const sound = soundFor(
      selectors,
      { source: found.source, ...(found.spec.params === undefined ? {} : { params: found.spec.params }) },
      isConcealed(subject),
      data,
    );
    if (sound !== null) {
      merged['sound'] = sound.sound;
      merged['soundAt'] = sound.at;
      merged['soundGain'] = sound.gain;
      // What the sound is ABOUT, for its pan: the ladder's subject, an id — never
      // the cue's first target, which for the outcome is the loser's first permanent.
      merged['soundCard'] = subject === null ? -1 : subject.id;
    }
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
        foe: foeOf(event.controller, state),
        // **T13 — the caster's duelist raises a hand** (`figures/duelists.ts`). A
        // fact of the EVENT, so it rides whichever cue the ladder chose for the
        // card — `cast.rise`, Wasp's beam, Helicarrier Strike's lock — and a row
        // may silence it with `gesture: "none"` (data wins over facts, as for
        // `colour`). Whose duelist is `players[0]`, the event's own controller.
        gesture: 'cast',
        ...beam,
      });
    }

    /**
     * **T6** (report 13 §6.3): the spell's controller comes from the SNAPSHOT,
     * not from the event, exactly as T4's `tap` reads a land's controller.
     *
     * `ResolvedEvent` is `{cardId, fizzled}` and `UnstackedEvent` is `{cardId}` —
     * neither carries a player — and the strike, the fizzle and the shatter all
     * happen at the **caster's casting anchor**, which is where the form stood.
     * `controller` is protocol §3.3's own field on every card including a
     * `stackCards` entry, so this is the engine's answer to "whose spell was
     * that", not a renderer's guess. Measured: 365 of the corpus's 412
     * resolutions resolve a controller this way; the other 47 get no anchor
     * effect at all, which is the honest fallback rather than a guessed seat.
     *
     * The strike's AIM comes from the previous frame — see {@link strikeParams}.
     */
    case 'resolved': {
      const caster = casterOf(subject);
      return one([event.cardId], caster, {
        fizzled: event.fizzled,
        foe: foeOf(caster[0] ?? null, state),
        ...strikeParams(event.cardId, caster[0] ?? null, state, previous),
      });
    }

    case 'unstacked':
      return one([event.cardId], casterOf(subject));

    case 'sacrificed':
      return one([event.cardId], []);

    case 'land':
      return one([event.cardId], [event.player]);

    case 'tap': {
      // The snapshot already shows the card tapped, so the cue animates the
      // approach: it starts a quarter-turn *back* and decays to identity.
      //
      // **The controller comes from the SNAPSHOT, not from the event** (T4,
      // report 13 §5.4). `TapEvent` is `{cardId, tapped}` and carries no player
      // at all, and the mana mote has to know whose casting anchor to drift to.
      // `controller` is protocol §3.3's own field — present on every card,
      // redacted or not — so this is the engine's answer to "whose land is this",
      // not a renderer's guess. Every other cue keyed on `tap` ignores it.
      const controller = (subject as { controller?: number | null } | null)?.controller ?? null;
      return one([event.cardId], controller === null ? [] : [controller], {
        dir: event.tapped ? 1 : -1,
      });
    }

    // **T11 — the controller, off the snapshot**, exactly as `tap` reads it (T4):
    // a scientist's power-up sends the cards it draws to ITS controller's hand
    // (`fx.hologram`'s `toHand`), and the counters event carries no player at all.
    case 'counters':
      return one([event.cardId], casterOf(subject), {
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
        // T13 — the struck player's duelist flinches. Damage to a card is the
        // card's own shot; its controller's duelist does not flinch for it.
        ...(event.target.kind === 'player' ? { gesture: 'flinch' } : {}),
      });

    case 'life':
      return one([], [event.player], {
        from: event.from,
        to: event.to,
        delta: event.to - event.from,
        // T13 — a LOSS flinches too (a life payment, a drain); a gain does not. A
        // loss that damage already flinched for in the same batch is one flinch,
        // not two — `queue.ts`'s suppression rule 8.
        ...(event.to < event.from ? { gesture: 'flinch' } : {}),
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
        // T13 — the winner's duelist raises a fist and every other seat's slumps,
        // each into the stance `board.gameOver` then holds as a pose. A draw
        // (`winner: -1`) moves nobody.
        gesture: 'outcome',
      });

    default:
      return [];
  }
}

/**
 * **T11 — did the struck card get bigger or smaller across this transition?**
 * `+1`, `-1` or `0`, from `power + toughness` in the previous frame against this
 * one: two snapshot facts about ONE card, compared. It is what lets Pym Particles'
 * beam grow or shrink its target by what the engine actually did to it, rather
 * than by what the art direction guessed the spell does (report 09 §12.2's
 * "partly" row: the beam used to fire the same way whatever followed).
 *
 * It claims nothing about *why*: a size that changed in the batch the spell
 * resolved in is reported as the change, and a card whose P/T is `*`, absent or
 * gone (it died) is `0` — no growth is claimed that the snapshot does not show.
 */
function sizeChange(before: AnyCard | undefined, after: AnyCard | undefined): number {
  const size = (card: AnyCard | undefined): number | null => {
    if (card === undefined) return null;
    const p = Number.parseInt(String((card as { power?: string | null }).power ?? ''), 10);
    const t = Number.parseInt(String((card as { toughness?: string | null }).toughness ?? ''), 10);
    return Number.isFinite(p) && Number.isFinite(t) ? p + t : null;
  };
  const a = size(before);
  const b = size(after);
  if (a === null || b === null || a === b) return 0;
  return b > a ? 1 : -1;
}

/**
 * **T11 — "the other side of the table"**, as an id: the first seat in the
 * snapshot that is not `player`. A DIRECTION for a cue that sweeps across the
 * table (the Air Force's swarm) — never a claim about what the spell affected,
 * which is the strike's job and only when the wire says so. `-1` when there is no
 * such seat (a pre-game frame), and a cue then simply does not sweep.
 */
function foeOf(player: number | null, state: ClientState): number {
  if (player === null) return -1;
  for (const seat of state.board?.players ?? []) if (seat.id !== player) return seat.id;
  return -1;
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
