/*
 * mtg-table — arena/figures/casting.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The casting anchor: floating mana, and the spell standing at it** (report 13
 * §5.4, §6.2; user decision 9). `[NO three]`, `[NO React]`, `[NO DOM]`, no clock.
 *
 * ---------------------------------------------------------------------------
 * **The measurement that shapes this file, taken over the whole committed corpus
 * on 2026-09-26.**
 *
 * `PlayerState.manaPool` is non-zero in **47 of 3,679 board frames (1.3%)**, and
 * its largest total anywhere is **2**. Forge's AI taps and spends inside one
 * engine step, so a snapshot almost never catches mana standing in a pool.
 *
 * That is the same shape as report 13 §4.1's finding about auras — 28 `attach`
 * events against 985 frames showing an attachment — read the other way round, and
 * it decides the design the same way:
 *
 *  - **the flight is a CUE.** `land.tap` emits a mote that rises from the tapped
 *    tile and drifts to that land's controller's casting anchor. Every step of
 *    that is a fact the engine stated: this land tapped (a `tap` event), and it
 *    belongs to this player (`card.controller`, protocol §3.3). No link between a
 *    land and a spell is invented anywhere — §5.4 measured that such a link is
 *    only 56.5% available even as a heuristic, and this needs none.
 *  - **the standing pool is a POSE**, read from `manaPool` and from nothing else.
 *    Rare, but when it is there it is exactly right, and it survives `skip all`,
 *    a backwards scrub and a `resync` with no history.
 *  - **the consumption is neither.** When a spell is cast the pool empties, so the
 *    motes are gone because the snapshot says they are gone. The `cast` cue's
 *    collapse at the casting anchor is the *beat*; the disappearance is the pose.
 *    A renderer that remembered "there were three motes here" in order to animate
 *    them into a spell would be remembering something the engine did not say.
 * ---------------------------------------------------------------------------
 */

import { MANA_COLORS, type AnyCard, type GameStateBody, type ManaColor, type ManaPool } from '../../protocol.ts';
import { COMBAT_PHASES } from '../../render/labels.ts';
import { primaryTypeOf } from '../cues/archetype.ts';
import { colourHex } from '../colour.ts';
import type { Seat } from '../layout.ts';

/** How many motes one seat may show. Six colours × a pool that never exceeded 2. */
export const MAX_MOTES_PER_SEAT = 8;

export interface ManaMote {
  player: number;
  seat: Seat;
  /** 0-based position in this seat's cluster, so the renderer can space them. */
  index: number;
  /** How many this seat has, so the cluster can be centred. */
  count: number;
  pip: ManaColor;
  colour: string;
}

/** `W`…`C` → the pip's colour, through the app's one colour table. */
function moteColour(pip: ManaColor): string {
  return colourHex(pip === 'C' ? 'C' : pip);
}

function poolTotal(pool: ManaPool): number {
  let n = 0;
  for (const pip of MANA_COLORS) n += Math.max(0, pool[pip]);
  return n;
}

/**
 * **The floating mana of every seat, as a pose.**
 *
 * `seatOf` is passed in rather than derived, because `layout.ts` owns the
 * player-id→seat mapping and this module owns no coordinate and no seating.
 */
export function manaMotes(
  board: GameStateBody | null,
  seatOf: (playerId: number) => Seat,
): ManaMote[] {
  const out: ManaMote[] = [];
  if (board === null) return out;
  for (const player of board.players) {
    const pool = player.manaPool;
    const total = Math.min(MAX_MOTES_PER_SEAT, poolTotal(pool));
    if (total === 0) continue;
    const seat = seatOf(player.id);
    let index = 0;
    for (const pip of MANA_COLORS) {
      for (let i = 0; i < pool[pip] && index < total; i++) {
        out.push({ player: player.id, seat, index, count: total, pip, colour: moteColour(pip) });
        index += 1;
      }
    }
  }
  return out;
}

/**
 * **§6.2's five spell forms**, chosen by the same kind of ladder everything else
 * in this directory uses — one rung, the source card's own primary type.
 *
 * | source | form | why |
 * |---|---|---|
 * | creature | `figure` | **the creature's own figure, ghosted** — no new asset, and it is the row that makes the stack read as Magic (`figures/pose.ts`'s ghost) |
 * | instant | `dart` | a hovering dart, aimed along its tether |
 * | sorcery | `sigil` | a flat sigil, turning slowly |
 * | enchantment / aura | `ring` | a slow ring |
 * | artifact / equipment | `shard` | a tumbling component — T4's octahedron, kept |
 * | anything else | `orb` | the declared fallback |
 *
 * Measured over the corpus's 389 stack frames: `Instant` 49 item-instances,
 * `Enchantment` 35, `Artifact - Vehicle` 29, `Artifact - Equipment` 23, `Sorcery`
 * 20, `Enchantment - Aura` 19, and every other line a creature. **`orb` never
 * fires in the committed corpus** and `web/test/tiles.test.ts` prints that, the
 * way every census in this repo prints a rung that never matched.
 *
 * `primaryTypeOf` is `cues/archetype.ts`'s and is **unchanged**: it already
 * answers `equipment` off the subtype half, which is the one case that needs it.
 * One definition of "what type is this card" in the app.
 */
export const FORM_KINDS = ['figure', 'dart', 'sigil', 'ring', 'shard', 'orb'] as const;
export type FormKind = (typeof FORM_KINDS)[number];

const FORM_FOR_TYPE: Readonly<Record<string, FormKind>> = Object.freeze({
  creature: 'figure',
  instant: 'dart',
  sorcery: 'sigil',
  enchantment: 'ring',
  artifact: 'shard',
  equipment: 'shard',
});

/**
 * A stack item's form, from its source card.
 *
 * A source card this viewer may not see, or one the frame does not carry at all,
 * gets the `orb`: the wire says a spell is on the stack — which is public — and
 * says nothing about what it is, so the form says nothing either. That is hard
 * rule 8 in the shape §1.4 gives it, one layer down.
 */
export function formKindFor(card: AnyCard | null | undefined): FormKind {
  if (card === null || card === undefined) return 'orb';
  return FORM_FOR_TYPE[primaryTypeOf(card)] ?? 'orb';
}

/** One end of a tether: a card on the table, or a player's own HUD anchor. */
export type TetherRef = { kind: 'card'; id: number } | { kind: 'player'; id: number };

export interface SpellForm {
  /** `StackItem.id` — **a different id space from `Card.id`** (protocol §10.1). */
  stackItemId: number;
  /** The source card's id, or `null` — what the form is a manifestation OF. */
  sourceCardId: number | null;
  player: number;
  seat: Seat;
  /** Depth on the stack, 0 = bottom. The measured ceiling is 4 (§6.1). */
  index: number;
  kind: FormKind;
  colour: string;
  /**
   * **§6.3's tethers, as a POSE.** Every `targetCardIds` / `targetPlayerIds` of
   * *this frame's* stack item, as ids and never as names — so a scrub to any of
   * the corpus's 44 target-bearing stack-item instances draws the beam with no
   * history at all, and a target this viewer cannot place simply draws nothing
   * (`layout.ts`'s `anchorPosition` returns `null`, which is correct rather than
   * an error).
   */
  tethers: TetherRef[];
}

/**
 * The forms of one frame, bottom of the stack first.
 *
 * A stack item whose `controller` is `null` is skipped rather than guessed at: a
 * form has to stand at *somebody's* anchor, and the wire not saying whose is not
 * an invitation to pick one. (Measured: no such item in the corpus.)
 *
 * The card plane still goes to the stack column — that is the identity of the
 * spell and where the player reads it. This is the manifestation.
 */
export function spellForms(
  board: GameStateBody | null,
  seatOf: (playerId: number) => Seat,
  colourOfCard: (cardId: number | null) => string,
  cardOf: (cardId: number | null) => AnyCard | null = () => null,
): SpellForm[] {
  const out: SpellForm[] = [];
  if (board === null) return out;
  let index = 0;
  for (const item of board.stack) {
    const player = item.controller;
    if (player === null) continue;
    const tethers: TetherRef[] = [];
    for (const id of item.targetCardIds) tethers.push({ kind: 'card', id });
    for (const id of item.targetPlayerIds) tethers.push({ kind: 'player', id });
    out.push({
      stackItemId: item.id,
      sourceCardId: item.sourceCardId,
      player,
      seat: seatOf(player),
      index,
      kind: formKindFor(cardOf(item.sourceCardId)),
      colour: colourOfCard(item.sourceCardId),
      tethers,
    });
    index += 1;
  }
  return out;
}

/**
 * **§6.4's combat freeze**: a stack exists **and** the phase names a combat
 * phase, so every figure holds its pose and a faint desaturation washes the
 * table.
 *
 * Pose-derived from the snapshot, so it costs one boolean and no asset, and it is
 * correct after a skip and a backwards scrub. Measured: **66 of 3,679 board
 * frames (1.8%)** — the "instant during combat" moment is real and rare, which is
 * why §6.4 asks for it to be cheap.
 *
 * `COMBAT_PHASES` is `render/labels.ts`'s set, which the 2D board's phase strip
 * already reads: one definition of "is this a combat phase" in the app (CLAUDE.md
 * M4 convention 6). The phase is `null` in the pre-game frames and that is not a
 * combat phase.
 *
 * Two guards, and they are in the *callers* because there is nothing here to
 * guard: it freezes **clips only** — never the HUD, never the decision layer,
 * never a click (there is no code path from this module to `onAct`) — and it must
 * not freeze the spell form, which is the thing the player is being asked to look
 * at.
 */
export function combatFreeze(board: GameStateBody | null): boolean {
  if (board === null) return false;
  if (board.stack.length === 0) return false;
  const phase = board.phase;
  return phase !== null && COMBAT_PHASES.has(phase);
}
