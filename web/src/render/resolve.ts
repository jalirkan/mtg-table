/*
 * mtg-table — render/resolve.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Resolving an id against **the frame being rendered**, and nowhere else.
 *
 * §9 invariant 10 (amendment P5): card ids are stable across zone changes, so a
 * lookup table that outlived a frame would keep naming a card after it went back
 * into a hidden zone — which report 06 §0.6 calls the worst remaining leak, and
 * places it in the client rather than in `Snap.java`. These functions walk the
 * current snapshot every time; a game's board is a few dozen cards and the cost
 * is nothing next to the guarantee.
 *
 * An id that does not resolve prints as `#42`, never as a name remembered from
 * an earlier frame. That is correct, not a bug (docs/protocol.md §3.6 rule 1).
 *
 * Pure: no React, no DOM, no CSS — importable from `node --test`.
 */

import { isFaceDownHidden, isHidden, type AnyCard, type EntityRef, type GameStateBody } from '../protocol.ts';

/**
 * Look a card up in this frame. `stackCards` first: a spell on the stack is in
 * `ZoneType.Stack` and is therefore in **no** player zone at all (§3.3), and the
 * stack is exactly where a player most wants to know what the card is.
 */
export function findCard(board: GameStateBody, id: number): AnyCard | undefined {
  const onStack = board.stackCards.find((card) => card.id === id);
  if (onStack !== undefined) return onStack;
  for (const player of board.players) {
    for (const zone of [
      player.zones.battlefield,
      player.zones.hand,
      player.zones.graveyard,
      player.zones.exile,
      player.zones.command,
    ]) {
      const hit = zone.cards.find((card) => card.id === id);
      if (hit !== undefined) return hit;
    }
    // P2: the revealed slice of a library is a real place a card can be.
    const revealed = player.zones.library.cards.find((card) => card.id === id);
    if (revealed !== undefined) return revealed;
  }
  return undefined;
}

/** A card id as words. Concealed stays concealed; unresolved stays an id. */
export function cardLabel(board: GameStateBody, id: number | null): string {
  if (id === null) return '—';
  const hit = findCard(board, id);
  if (hit === undefined) return `#${String(id)}`;
  if (isFaceDownHidden(hit)) return `face-down card #${String(id)}`;
  if (isHidden(hit)) return `card back #${String(id)}`;
  const name = hit.name !== '' ? hit.name : hit.faceDown ? 'face-down card' : '(unnamed card)';
  return `${name} #${String(id)}`;
}

export function playerName(board: GameStateBody, id: number | null): string {
  if (id === null) return '—';
  return board.players.find((p) => p.id === id)?.name ?? `player ${String(id)}`;
}

/** §3.1: every `defender` on the wire is nullable, so this is total over null. */
export function entityLabel(board: GameStateBody, ref: EntityRef | null): string {
  if (ref === null) return '—';
  return ref.kind === 'player' ? playerName(board, ref.id) : cardLabel(board, ref.id);
}
