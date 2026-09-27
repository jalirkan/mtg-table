/*
 * mtg-table — arena/figures/duelists.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **The duelists, as a silhouette bust per seat** (report 13 §7; **user decision
 * 8**: "two billboard silhouette busts at the HUD anchors, avatars deferred").
 * `[NO three]`, `[NO React]`, `[NO DOM]`, no clock.
 *
 * ---------------------------------------------------------------------------
 * **Why the cheap half and not the avatars**, and report 13 §7 gives two reasons,
 * one of them measured:
 *
 *  1. **The camera cannot afford them.** `REST_POSE` is `[0, 9.3, 8.3] → [0, 0,
 *     0.8]` at `fov 40`, and §8 rule 6 requires the viewer's own hand to stay
 *     framed — a constraint that already forced a measured deviation
 *     (`camera.ts`'s `HAND_BAND`, which documents that enforcing rule 6 literally
 *     dropped *both* of §8's camera moves at 1920×1080). Avatars stand at the
 *     table ends, which is exactly where the frame would have to grow.
 *  2. **No rule, no event and no piece of information is carried by them.** They
 *     are the most art-direction-expensive thing in the tier and the least
 *     load-bearing.
 *
 * So: one textured quad per seat at `playerAnchorFor(seat)` — the anchor the
 * `life` and `damage` cues already aim at — billboarded, dark, unlit, **no rig, no
 * clip, no pipeline**, and one `InstancedMesh` for both, which is one draw call
 * rather than §7's two.
 *
 * And the rule §7 states once: **the duelists are never in the camera solver's
 * required set.** They are decoration and may leave frame; `framesSeat` keeps
 * testing the hand and the battlefield and nothing else. There is nothing in this
 * file that could get into it — it names no anchor the director reads.
 * ---------------------------------------------------------------------------
 */

import type { GameStateBody } from '../../protocol.ts';
import type { Effect } from '../cues/stage.ts';
import type { Seat } from '../layout.ts';

/**
 * One bust. It carries a seat, a player id and a colour — and **no name**: the
 * player's name is drawn by the HUD in the DOM layer, where the 2D board already
 * draws it, and a texture is not where a name belongs (§3.10 rule 1's spirit, one
 * surface further out).
 */
export interface DuelistBust {
  player: number;
  seat: Seat;
  /** The rim colour. The viewer's own seat is warmer, so the two read apart. */
  colour: string;
  /** Whether this seat is the AI, from the snapshot's own flag. */
  isAi: boolean;
  /** 0…1 — this seat's life against the highest life at the table. */
  vigour: number;
}

/** The viewer's own bust and the opponent's, told apart by one colour. */
const YOU_RIM = '#8fd3c4';
const OPP_RIM = '#d68f9a';

/**
 * The busts of one frame, in seating order.
 *
 * `vigour` is life relative to the highest life at the table, which is a *rendering*
 * of `PlayerState.life` and not a judgement about the game: nothing here decides
 * who is winning, and the number the player reads is still the engine's own life
 * total in the HUD. It exists so a bust dims as its seat is worn down, which is the
 * one thing §7 says the silhouette buys — "a body for `damage:player` and
 * `life.tick` to play on".
 */
export function duelistBusts(
  board: GameStateBody | null,
  seatOf: (playerId: number) => Seat,
): DuelistBust[] {
  if (board === null) return [];
  let top = 0;
  for (const player of board.players) top = Math.max(top, player.life);
  const out: DuelistBust[] = [];
  for (const player of board.players) {
    const seat = seatOf(player.id);
    out.push({
      player: player.id,
      seat,
      colour: seat === 'you' ? YOU_RIM : OPP_RIM,
      isAi: player.isAi,
      vigour: top > 0 ? Math.max(0, Math.min(1, player.life / top)) : 1,
    });
  }
  return out;
}

/**
 * **What the bust is reacting to this frame** — §7's "a body for `damage:player`
 * and `life.tick` to play on — a flinch, a red rim".
 *
 * It is read off the **live effects** anchored at this player — the `plate` that
 * `damage.player` and `life.tick` flash under the life total, and the burst and
 * ring of a spell that strikes a player (`resolved.pop`) — and it takes the
 * strongest one's strength and colour. So a flinch is exactly as long as the cue
 * that caused it and decays with it: nothing here remembers a hit, and a skipped
 * cue leaves the bust standing still (§1.1). It is the terrain's rule one layer
 * out: a tile reads `offset.glow` off its card, a bust reads the effect off its
 * player, and neither knows which cue wrote it.
 *
 * It writes into `out` rather than returning a fresh object, because it runs once
 * per bust per frame (report 09 §9.2 rule 6).
 */
export interface BustReaction {
  /** 0…1 — the strongest live effect anchored at this player. */
  strength: number;
  /** That effect's colour: red for damage, green for a gain. `null` when idle. */
  colour: string | null;
}

/** Effect kinds a bust reacts to. A `text` number is the HUD's, not a blow. */
const REACTS_TO: ReadonlySet<Effect['kind']> = new Set<Effect['kind']>(['plate', 'particles', 'ring']);

export function bustReactionInto(
  out: BustReaction,
  effects: ReadonlyMap<string, Effect>,
  player: number,
): BustReaction {
  out.strength = 0;
  out.colour = null;
  for (const effect of effects.values()) {
    const at = effect.at;
    if (at.kind !== 'player' || at.id !== player) continue;
    if (!REACTS_TO.has(effect.kind)) continue;
    const strength = Math.max(0, Math.min(1, effect.strength));
    if (strength > out.strength) {
      out.strength = strength;
      out.colour = effect.colour;
    }
  }
  return out;
}
