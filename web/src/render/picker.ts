/*
 * mtg-table — render/picker.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **M5: the ask that is not a modal.**
 *
 * `PLAN.md` "What M4 hands to M5" says it plainly — *"M5's job is not 'a modal
 * for these kinds'; it is 'the board-shaped ones stop being a modal'"*. This file
 * is the decision of which ones those are, and it is pure so that
 * `web/test/picker.test.ts` can make that decision over the whole fixture corpus
 * from `node --test`.
 *
 * The rule, and every clause of it is load-bearing:
 *
 *   **An `ask` is board-shaped iff every one of its options is a card the board
 *   is already drawing a tile for, or a player it is drawing a rail for.**
 *
 *   - *every*, not most: a picker that could express four of five options is a
 *     dead end for the fifth, and `PLAN.md` M5's exit criterion is that nothing
 *     dead-ends. One option outside the board sends the whole ask to the modal.
 *   - *the board is already drawing*, not "the id resolves": the opponent's hand
 *     is in the snapshot as five-key stubs and is deliberately **never** drawn
 *     (report 10 §3.2, hard rule 8), and a library card that no `may look`
 *     effect revealed has no tile either. {@link drawnEntities} is therefore
 *     written against what `Board.tsx` actually mounts, not against
 *     `resolve.findCard`, and the two are different sets on purpose.
 *   - a `choose_list` with `reveal: true` is *acknowledge only* (§5.3,
 *     `min = max = -1`) and a `choose_entities` with a `delayedReveal` is the
 *     engine handing over cards out of a hidden zone (§5.3) — neither is a
 *     choice made *on the board*, so both stay in the modal, where the reveal
 *     panel can show what was revealed.
 *
 * `assign_damage` is the same question asked about a different answer shape: it
 * is board-shaped when every **blocker** has a tile, because that is where the
 * number inputs go (§5.3 — and index 0 is the defending player, which is a rail
 * and not a tile; it keeps its row in the panel).
 *
 * **This file marshals nothing.** The answer is still built by
 * `AskModal.answerFromDraft`, from the same `AskDraft` the modal uses, so the
 * picker and the modal cannot disagree about what an answer looks like — which
 * is exactly the class of bug §5.3 says a recording cannot catch.
 *
 * No JSX, no DOM. It does import `createContext` from React, which `node --test`
 * loads fine, because the context that carries a pick down to `CardTile` belongs
 * beside the model that defines one.
 */

import { createContext, useContext } from 'react';

import type { AskBody, AskKind, AskOption, GameStateBody } from '../protocol.ts';

// ---------------------------------------------------------------------------
// What the board is drawing
// ---------------------------------------------------------------------------

/**
 * The ids that have a tile or a rail on screen right now.
 *
 * Kept deliberately narrow — see the header. Three sets that are **not** in
 * here, each for a reason:
 *
 *   - another seat's hand (never drawn: report 10 §3.2);
 *   - the unrevealed part of any library (not on the wire at all: §3.4);
 *   - `stackCards` (the stack panel can be collapsed with `S`, so a candidate
 *     there may have no tile at the moment the ask arrives — the modal is the
 *     honest fallback rather than an outline nobody can see).
 */
export interface DrawnEntities {
  cardIds: ReadonlySet<number>;
  playerIds: ReadonlySet<number>;
}

export const NOTHING_DRAWN: DrawnEntities = { cardIds: new Set(), playerIds: new Set() };

/**
 * Which seat's hand the board is drawing. `Board.tsx` picks `you` when it knows
 * it and the first seat otherwise (a replay has no seat of its own), and this
 * has to make the identical choice or the picker and the tiles disagree.
 */
export function viewerSeatId(board: GameStateBody, you: number | null): number | null {
  if (you !== null && board.players.some((p) => p.id === you)) return you;
  return board.players[0]?.id ?? null;
}

export function drawnEntities(board: GameStateBody, you: number | null): DrawnEntities {
  const cardIds = new Set<number>();
  const playerIds = new Set<number>();
  const mine = viewerSeatId(board, you);
  for (const player of board.players) {
    playerIds.add(player.id);
    for (const zone of [
      player.zones.battlefield,
      player.zones.graveyard,
      player.zones.exile,
      player.zones.command,
    ]) {
      for (const card of zone.cards) cardIds.add(card.id);
    }
    // P2 — the slice a continuous "may look" effect revealed is drawn in the
    // rail, so it is a real place a candidate can be.
    for (const card of player.zones.library.cards) cardIds.add(card.id);
    // Only the viewer's own hand is ever tiles.
    if (player.id === mine) {
      for (const card of player.zones.hand.cards) cardIds.add(card.id);
    }
  }
  return { cardIds, playerIds };
}

// ---------------------------------------------------------------------------
// The model
// ---------------------------------------------------------------------------

/** One thing the player may point at, already resolved to a board entity. */
export interface PickCandidate {
  /** The **ask-local index** (§5.1). The whole of what an answer echoes. */
  optionId: number;
  /** The engine's own label, verbatim — `"???"` when its card is concealed. */
  label: string;
  cardId: number | null;
  playerId: number | null;
  /** `assign_damage` only (§5.3): remaining toughness, and index 0's flag. */
  lethal: number | null;
  defender: boolean;
}

/** `choice` answers `[index…]` or one index; `damage` answers `{index: n}`. */
export type PickShape = 'choice' | 'damage';

export interface BoardPick {
  askId: string;
  kind: AskKind;
  shape: PickShape;
  /** The engine's prompt, verbatim. */
  prompt: string;
  /** `choice`: how many to pick. `options` is 1–1; §5.2 for the rest. */
  min: number;
  max: number;
  /** `damage`: the total that must be assigned. */
  total: number;
  candidates: PickCandidate[];
}

function candidate(option: AskOption): PickCandidate {
  const extras = option as AskOption & { lethal?: number | null; defender?: boolean };
  return {
    optionId: option.id,
    label: option.label,
    cardId: option.cardId ?? null,
    playerId: option.playerId ?? null,
    lethal: extras.lethal ?? null,
    defender: extras.defender === true,
  };
}

/** Is this option something the board is drawing right now? */
function onBoard(option: AskOption, drawn: DrawnEntities): boolean {
  if (option.cardId !== undefined && drawn.cardIds.has(option.cardId)) return true;
  if (option.playerId !== undefined && drawn.playerIds.has(option.playerId)) return true;
  return false;
}

/**
 * The board-shaped reading of this ask, or `null` — in which case the modal
 * takes it, unchanged, which is still the right answer for a colour, a mode, a
 * number or a card in a zone nobody can see.
 */
export function boardPick(ask: AskBody, drawn: DrawnEntities): BoardPick | null {
  switch (ask.kind) {
    case 'choose_list': {
      // §5.3: `reveal` is "show these, select nothing" (min = max = -1). There
      // is nothing to point at, and the modal already renders it as an
      // acknowledgement with one button.
      if (ask.reveal || ask.min < 0 || ask.max < 1) return null;
      return choicePick(ask.askId, ask.kind, ask.prompt, ask.options, ask.min, ask.max, drawn);
    }
    case 'choose_entities': {
      // §5.3: a delayed reveal is the single largest legitimate reveal on the
      // wire — cards out of a library or an opponent's hand. They are not on
      // the board, and the panel that shows them belongs in the modal.
      if (ask.delayedReveal !== null || ask.max < 1) return null;
      return choicePick(ask.askId, ask.kind, ask.prompt, ask.options, ask.min, ask.max, drawn);
    }
    case 'options':
      // `showOptionDialog` answers ONE index; a modal spell's modes are
      // `kind: "other"` and never reach the board, but a "choose a creature"
      // dialog does.
      return choicePick(ask.askId, ask.kind, ask.prompt, ask.options, 1, 1, drawn);
    case 'assign_damage': {
      const targets = ask.targets;
      if (targets.length < 2 || ask.total < 1) return null;
      // Index 0 is the defending player or planeswalker and keeps its row in
      // the panel; what has to be on the board is every BLOCKER, because that
      // is where the number input goes.
      for (const target of targets.slice(1)) {
        if (target.cardId === undefined || !drawn.cardIds.has(target.cardId)) return null;
      }
      return {
        askId: ask.askId,
        kind: ask.kind,
        shape: 'damage',
        prompt: `Assign ${String(ask.total)} combat damage`,
        min: ask.total,
        max: ask.total,
        total: ask.total,
        candidates: targets.map(candidate),
      };
    }
    default:
      return null;
  }
}

function choicePick(
  askId: string,
  kind: AskKind,
  prompt: string,
  options: AskOption[],
  min: number,
  max: number,
  drawn: DrawnEntities,
): BoardPick | null {
  if (options.length === 0) return null;
  for (const option of options) if (!onBoard(option, drawn)) return null;
  return {
    askId,
    kind,
    shape: 'choice',
    prompt,
    min,
    max,
    total: 0,
    candidates: options.map(candidate),
  };
}

/**
 * What clicking option `id` does to a multi-select draft, given the engine's
 * `max`.
 *
 * **`max === 1` is a radio button, not a checkbox.** "Choose a color" is
 * `min = max = 1`, so the form opens with one option already chosen — and a
 * literal reading of the bound then disables every other option, leaving the
 * user unable to change their mind without first finding the deselect. Measured
 * in a browser against a live `choose_list`, 2026-09-11.
 *
 * Above 1, the bound is enforced by refusing the extra click, because silently
 * dropping someone else's earlier choice to make room is worse than not moving.
 * Neither branch is rules logic: `max` is the number Forge sent, echoed back.
 *
 * It lives here, rather than in `AskModal.tsx`, because M5 gave it a second
 * caller on the board itself — and one function is how the two cannot disagree.
 */
export function toggleChoice(chosen: readonly number[], id: number, max: number): number[] {
  const on = chosen.includes(id);
  if (max === 1) return on ? [] : [id];
  if (on) return chosen.filter((x) => x !== id);
  if (max >= 0 && chosen.length >= max) return [...chosen];
  return [...chosen, id];
}

// ---------------------------------------------------------------------------
// The context a tile reads
// ---------------------------------------------------------------------------

/** What the pointer is over: the far end of M5's pending-target arrow. */
export interface TargetRef {
  kind: 'card' | 'player';
  id: number;
}

/**
 * The seam between the board's ask state and the one card renderer.
 *
 * `CardTile` is THE card renderer (hard rule 8's renderer half), so a picker
 * that drew its own candidate markup would be exactly the new surface
 * `PLAN.md` forbids. Instead the tile asks this context three questions —
 * *am I a candidate*, *am I chosen*, *what should a click do* — and answers
 * them the same way for every zone it is mounted in.
 */
export interface Targeting {
  /** The ask-local option for a board entity, or `null` when there is no ask. */
  option(kind: 'card' | 'player', id: number): PickCandidate | null;
  /**
   * Is this entity an outstanding **selection** — an ask candidate, or an id
   * the engine named in `input.selectable` (§4)? Drives the hover handlers and
   * the pending arrow, never the click (amendment M8).
   */
  candidate(kind: 'card' | 'player', id: number): boolean;
  chosen(optionId: number): boolean;
  amount(optionId: number): number;
  shape: PickShape | 'none';
  /** A seat, not a replay, and the ask is answerable from here. */
  live: boolean;
  pick(optionId: number): void;
  setAmount(optionId: number, n: number): void;
  /** Report the pointer entering (or leaving, `null`) a candidate. */
  hover(target: TargetRef | null): void;
}

/** The inert one: no ask, no selection, nothing to report. */
export const NO_TARGETING: Targeting = {
  option: () => null,
  candidate: () => false,
  chosen: () => false,
  amount: () => 0,
  shape: 'none',
  live: false,
  pick: () => undefined,
  setAmount: () => undefined,
  hover: () => undefined,
};

export const TargetingContext = createContext<Targeting>(NO_TARGETING);

export function useTargeting(): Targeting {
  return useContext(TargetingContext);
}
