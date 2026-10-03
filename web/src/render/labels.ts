/*
 * mtg-table — render/labels.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Pure presentation data for the M4 board (report 10 §4.5, §6.1, §7.1).
 *
 * Everything in here is a **label** or a **bucket**, never an answer. The client
 * maps Forge's `PhaseType` name to a caption and never parses meaning out of it
 * (docs/protocol.md §3.1); it maps a counter name to a glyph and never invents a
 * rules meaning for one; it splits lands from other permanents to decide which
 * ROW a tile is laid out in, which is a coordinate and not a legality.
 *
 * No React, no DOM, no CSS — `web/test/*.test.ts` imports this from
 * `node --test`, where JSX cannot go.
 */

// ---------------------------------------------------------------------------
// Phases (report 10 §0 — `javap forge.game.phase.PhaseType`: 13 constants)
// ---------------------------------------------------------------------------

/** The 13 `PhaseType` constants, in enum order. Verified by javap (report 10 §0). */
export const PHASE_ORDER = [
  'UNTAP',
  'UPKEEP',
  'DRAW',
  'MAIN1',
  'COMBAT_BEGIN',
  'COMBAT_DECLARE_ATTACKERS',
  'COMBAT_DECLARE_BLOCKERS',
  'COMBAT_FIRST_STRIKE_DAMAGE',
  'COMBAT_DAMAGE',
  'COMBAT_END',
  'MAIN2',
  'END_OF_TURN',
  'CLEANUP',
] as const;

export type PhaseName = (typeof PHASE_ORDER)[number];

/**
 * The strip's captions (report 10 §6.1). Derived from Forge's own two
 * vocabularies — `nameForUi` in `en-US.properties` and `PhaseIndicator`'s cell
 * captions — so nothing here is invented.
 */
export const PHASE_STRIP_LABELS: Record<string, string> = {
  UNTAP: 'Untap',
  UPKEEP: 'Upkeep',
  DRAW: 'Draw',
  MAIN1: 'Main 1',
  COMBAT_BEGIN: 'Beginning',
  COMBAT_DECLARE_ATTACKERS: 'Attackers',
  COMBAT_DECLARE_BLOCKERS: 'Blockers',
  COMBAT_FIRST_STRIKE_DAMAGE: 'First strike',
  COMBAT_DAMAGE: 'Damage',
  COMBAT_END: 'End of combat',
  MAIN2: 'Main 2',
  END_OF_TURN: 'End',
  CLEANUP: 'Cleanup',
};

/**
 * The six combat steps, indented under a `─ combat ─` divider, matching
 * `PhaseType.PHASE_GROUPS` (report 10 §6.1).
 */
export const COMBAT_PHASES: ReadonlySet<string> = new Set([
  'COMBAT_BEGIN',
  'COMBAT_DECLARE_ATTACKERS',
  'COMBAT_DECLARE_BLOCKERS',
  'COMBAT_FIRST_STRIKE_DAMAGE',
  'COMBAT_DAMAGE',
  'COMBAT_END',
]);

/**
 * `DecisionPanel`'s title fragment (report 10 §7.1). "Your first main phase".
 * The `?? phase` fallback at the call site means a constant we have never seen
 * renders as its raw Forge name rather than as `undefined`.
 */
export const STEP_TITLE: Record<string, string> = {
  UNTAP: 'untap step',
  UPKEEP: 'upkeep',
  DRAW: 'draw step',
  MAIN1: 'first main phase',
  COMBAT_BEGIN: 'beginning of combat',
  COMBAT_DECLARE_ATTACKERS: 'declare attackers',
  COMBAT_DECLARE_BLOCKERS: 'declare blockers',
  COMBAT_FIRST_STRIKE_DAMAGE: 'first-strike damage',
  COMBAT_DAMAGE: 'combat damage',
  COMBAT_END: 'end of combat',
  MAIN2: 'second main phase',
  END_OF_TURN: 'end step',
  CLEANUP: 'cleanup',
};

/**
 * **Forge's own stop defaults**, verbatim from `ForgePreferences.java:239-264`
 * (report 10 §0, `[src]`).
 *
 * **M6 demoted these to a fallback.** `players[].phaseStops` is live protocol
 * now (§3.3), and the strip draws that; these two sets are what it draws for a
 * stream that does not carry the field — every recording made before
 * 2026-09-12, and every replay of one — beside a legend that says so. They are
 * never mixed with the live map and never used to *decide* anything: the client
 * still computes no stop, which is the phase-stop logic `CLAUDE.md` §Scope
 * forbids outright (**D31**).
 */
export const FORGE_DEFAULT_STOPS_YOURS: ReadonlySet<string> = new Set([
  'MAIN1',
  'COMBAT_DECLARE_BLOCKERS',
  'MAIN2',
]);

/**
 * `FPref.PHASES_AI` defaults — the stops that apply on the opponent's turn, and
 * the same fallback-only status as the set above.
 */
export const FORGE_DEFAULT_STOPS_OPPONENT: ReadonlySet<string> = new Set([
  'COMBAT_BEGIN',
  'COMBAT_DECLARE_ATTACKERS',
  'COMBAT_DECLARE_BLOCKERS',
  'END_OF_TURN',
]);

/**
 * `UNTAP` has no stop preference at all: `CMatchUI.actuateMatchPreferences`
 * loops `p = 1 … 12` and there is no `PHASE_*_UNTAP` pref (report 10 §0, §6.2).
 * Rendering a 13th toggle that cannot exist would be a lie, so its cells print
 * `·`.
 */
export const PHASE_WITHOUT_STOP = 'UNTAP';

// ---------------------------------------------------------------------------
// Counters (report 10 §4.5)
// ---------------------------------------------------------------------------

/**
 * The counters we can name, and the `mana-font` glyph for each. Anything else
 * prints Forge's raw `CounterType.getName()` string — **never** a rules meaning
 * we invented for it.
 */
export const COUNTER_LABELS: Record<string, { text: string; cls: string; glyph: string | null }> = {
  P1P1: { text: '+1/+1', cls: 'ctr--plus', glyph: 'ms-counter-plus' },
  M1M1: { text: '-1/-1', cls: 'ctr--minus', glyph: 'ms-counter-minus' },
  LOYALTY: { text: 'loyalty', cls: 'ctr--loyalty', glyph: 'ms-counter-loyalty' },
  POISON: { text: 'poison', cls: 'ctr--poison', glyph: null },
  CHARGE: { text: 'charge', cls: 'ctr--other', glyph: 'ms-counter-charge' },
  LORE: { text: 'lore', cls: 'ctr--other', glyph: 'ms-counter-lore' },
  STUN: { text: 'stun', cls: 'ctr--other', glyph: 'ms-counter-stun' },
  SHIELD: { text: 'shield', cls: 'ctr--other', glyph: 'ms-counter-shield' },
};

export function counterLabel(name: string): { text: string; cls: string; glyph: string | null } {
  return COUNTER_LABELS[name] ?? { text: name, cls: 'ctr--other', glyph: null };
}

// ---------------------------------------------------------------------------
// The land / permanent split (report 10 §3.3)
// ---------------------------------------------------------------------------

/**
 * `card.types` is Forge's `CardType.toString()` verbatim, with a plain hyphen
 * and no em dash (docs/protocol.md §10.4). This is a **presentation bucket** —
 * which row the tile is laid out in — exactly like a phase label, and it never
 * affects what is clickable. A creature-land matches both and goes in the
 * permanents row; that is a layout choice, not a rules one.
 */
export function isLandTypeLine(types: string): boolean {
  return /(^|\s)Land(\s|$|—|-)/.test(types);
}

/**
 * The same presentation bucket, for the other half of the battlefield: does this
 * type line name a creature?
 *
 * It lives **here, beside {@link isLandTypeLine}**, because the arena's Tier 2
 * manifestation stage needs it and CLAUDE.md's M4 convention 6 is that there is
 * one definition of "is this card a <type>" in the app. The arena already learnt
 * that lesson once: `layout.ts` carried its own `/\bland\b/i` until the M7
 * verification pass replaced it with this file's.
 *
 * A face-down permanent's type line is exactly `"Creature"` (report 06 §1.4:
 * `CardUtil.getFaceDownCharacteristic`, which the wire relays verbatim on the
 * battlefield), so it matches — and that is correct. It is a creature; what it
 * *is* is what we may not know.
 */
export function isCreatureTypeLine(types: string): boolean {
  return /(^|\s)Creature(\s|$|—|-)/.test(types);
}

/**
 * A card's accessible name, composed from fields already on screen
 * (report 10 §14 rule 2). A concealed card never reaches this function — the
 * tile answers `"face-down card"` for those and nothing else.
 */
export function tileAriaLabel(parts: {
  name: string;
  manaCost: string | null;
  types: string;
  power: string | null;
  toughness: string | null;
  tapped: boolean;
  sick: boolean;
  attacking: boolean;
  blocking: boolean;
  damage: number;
  counters: Record<string, number>;
  /** M49: keyword constants, read through `keywordsOf` — optional, `[]` when absent. */
  keywords?: readonly string[];
}): string {
  const bits: string[] = [parts.name];
  if (parts.manaCost !== null) bits.push(parts.manaCost);
  if (parts.types !== '') bits.push(parts.types);
  if (parts.power !== null || parts.toughness !== null) {
    bits.push(`${parts.power ?? '?'}/${parts.toughness ?? '?'}`);
  }
  if (parts.tapped) bits.push('tapped');
  if (parts.sick) bits.push('summoning sick');
  if (parts.attacking) bits.push('attacking');
  if (parts.blocking) bits.push('blocking');
  if (parts.damage > 0) bits.push(`${String(parts.damage)} damage`);
  for (const [counter, n] of Object.entries(parts.counters)) {
    bits.push(`${String(n)} ${counterLabel(counter).text} ${n === 1 ? 'counter' : 'counters'}`);
  }
  // M49: a keyword constant as lower-case words (`FIRST_STRIKE` -> `first strike`).
  for (const keyword of parts.keywords ?? []) bits.push(keyword.toLowerCase().split('_').join(' '));
  return bits.join(', ');
}
