/*
 * mtg-table — render/zones.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **M5: zone browsers.** `PLAN.md` "What M4 hands to M5": *"No zone browsers.
 * Graveyard and exile are always-visible 45 px strips … `input.openZones`
 * renders as a text hint, which is correct, but there is nothing to open."*
 *
 * This is the pure half of the thing that opens: which zones may be browsed, at
 * whose seat, and what cards a panel contains. Pure so `web/test/zones.test.ts`
 * can assert the one rule that matters from `node --test`, over the fixture
 * corpus, without a browser:
 *
 *   **A browser never shows another seat's hand.** Not because the cards would
 *   leak — another seat's hand arrives as five-key stubs (hard rule 8) and
 *   `CardTile` draws a card back for those — but because report 10 §3.2 makes
 *   "the opponent's hand is a count in their rail and is never drawn as tiles"
 *   a property of the renderer, and a panel that drew eight card backs for it
 *   would be the first surface to break that. `web/test/render.test.tsx`
 *   asserts the id-level version of the same thing on every frame.
 *
 * `library` is browsable and means **the revealed slice only** (§3.4, amendment
 * P2): `LibraryZone.cards` is exactly what `canBeShownTo` allowed, and `count`
 * is the real size. A browser that showed `count` card backs would be inventing
 * cards the wire never sent.
 *
 * `openZones` is a **hint and was never a question** (§4.3): `PlayerZoneUpdate`
 * is `(PlayerView, Set<ZoneType>)` and has no card accessor at all. So opening a
 * panel for it reveals nothing that was not already in `state`; it just saves
 * the player a click.
 */

import type { AnyCard, GameStateBody, InputBody, PlayerState } from '../protocol.ts';

/** The five zones a panel can show. Battlefield and stack are already the table. */
export const BROWSABLE_ZONES = ['graveyard', 'exile', 'command', 'library', 'hand'] as const;
export type BrowsableZone = (typeof BROWSABLE_ZONES)[number];

export interface ZonePanelRef {
  playerId: number;
  zone: BrowsableZone;
}

export function isBrowsableZone(name: string): name is BrowsableZone {
  return (BROWSABLE_ZONES as readonly string[]).includes(name);
}

/** The rule in one function: a hand is browsable only at the viewer's own seat. */
export function mayBrowse(zone: string, playerId: number, you: number | null): boolean {
  if (!isBrowsableZone(zone)) return false;
  if (zone === 'hand') return you !== null && playerId === you;
  return true;
}

/** Same key on both ends, so a panel list can be compared and deduplicated. */
export function panelKey(ref: ZonePanelRef): string {
  return `${String(ref.playerId)}:${ref.zone}`;
}

export function samePanels(a: readonly ZonePanelRef[], b: readonly ZonePanelRef[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((ref, i) => panelKey(ref) === panelKey(b[i]!));
}

/**
 * The panels `input.openZones` asks for (§4.3), filtered by {@link mayBrowse}
 * and by whether the seat is in this snapshot at all.
 *
 * Forge's own list is "everything except Battlefield / Hand / Stack" for the
 * desktop client, so in practice this is graveyard + exile; the filter is here
 * because the *hint* is the engine's and the *policy* is ours.
 */
export function hintedPanels(
  input: InputBody | null,
  board: GameStateBody | null,
  you: number | null,
): ZonePanelRef[] {
  if (input === null || board === null) return [];
  const out: ZonePanelRef[] = [];
  const seen = new Set<string>();
  for (const hint of input.openZones) {
    if (!board.players.some((p) => p.id === hint.playerId)) continue;
    for (const zone of hint.zones) {
      const name = zone.toLowerCase();
      if (!mayBrowse(name, hint.playerId, you)) continue;
      const ref: ZonePanelRef = { playerId: hint.playerId, zone: name as BrowsableZone };
      const key = panelKey(ref);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(ref);
    }
  }
  return out;
}

function seatOf(board: GameStateBody, playerId: number): PlayerState | undefined {
  return board.players.find((p) => p.id === playerId);
}

/**
 * The cards a panel shows. `[]` for a zone the viewer may not browse — the
 * caller does not have to remember the rule, which is the point of it being a
 * function.
 */
export function panelCards(
  board: GameStateBody,
  ref: ZonePanelRef,
  you: number | null,
): AnyCard[] {
  if (!mayBrowse(ref.zone, ref.playerId, you)) return [];
  const seat = seatOf(board, ref.playerId);
  if (seat === undefined) return [];
  // The revealed slice, never `count` stubs (§3.4).
  return [...seat.zones[ref.zone].cards];
}

/** `count` for the zone — the authoritative size, which `cards` may be short of. */
export function panelCount(board: GameStateBody, ref: ZonePanelRef): number {
  return seatOf(board, ref.playerId)?.zones[ref.zone].count ?? 0;
}

export function panelTitle(board: GameStateBody, ref: ZonePanelRef): string {
  const name = seatOf(board, ref.playerId)?.name ?? `player ${String(ref.playerId)}`;
  return `${name} · ${ref.zone}`;
}
