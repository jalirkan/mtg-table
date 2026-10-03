/*
 * mtg-table — render/pool.ts
 * Copyright (C) 2026 the mtg-table authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * **M5's one real dead end, as three pure functions.**
 *
 * `PLAN.md` "What M4 hands to M5": *"`useMana` — this is the one real dead end,
 * and it goes first. The console seat can spend floating mana (`m W|U|B|R|G|C`);
 * the board has no control for it and the mana pool is six read-only pips in the
 * rail. A state in which Forge expects floating mana to be spent through
 * `useMana` cannot be resolved from the browser at all."*
 *
 * Two rules, both from `docs/protocol.md` §2.2:
 *
 *   - **`useMana` carries a colour and nothing else.** `IGameController.useMana(byte)`
 *     with `byte = MagicColor.fromName(...)`. *"A `cardId` is a `clickCard`, not
 *     a `useMana`"* — tapping a land for mana is a click on the land, and
 *     conflating the two is how a client ends up with two ways to say one thing.
 *   - **There is no `autoPay` act.** Forge's `InputPayMana` puts its own `Auto`
 *     label on the OK button (`InputPayMana.java:376-395`), so auto-payment is
 *     `buttonOk` with the engine's label rendered verbatim, and the board must
 *     not grow a parallel control for it.
 *
 * Pure and JSX-free so `web/test/pool.test.ts` can drive the pip → act mapping
 * from `node --test`: the component is then three lines of markup over these.
 */

import { MANA_COLORS, type ManaColor, type ManaPool, type UseManaAct } from '../protocol.ts';

/** The colours this pool actually holds, in W U B R G C order. */
export function spendableColors(pool: ManaPool): ManaColor[] {
  return MANA_COLORS.filter((color) => pool[color] > 0);
}

export function poolTotal(pool: ManaPool): number {
  return MANA_COLORS.reduce((sum, color) => sum + pool[color], 0);
}

/**
 * The act a pip click produces, or `null` when the pool does not hold that
 * colour — the client refuses to *name* mana that is not floating, which is not
 * rules logic: it is the number the engine put in `state.players[].manaPool`,
 * echoed back (§3.1 — all six keys are always present, zeros included).
 *
 * Forge is still the judge of the act itself; a `useMana` it will not take is
 * dropped exactly like any other meaningless act (§2.2).
 */
export function manaPipAct(pool: ManaPool, color: ManaColor): UseManaAct | null {
  if (pool[color] <= 0) return null;
  return { action: 'useMana', color };
}

/** `"W"` for the key `w`, and `null` for everything else. Used by `keys.ts`. */
export function manaColorForKey(key: string): ManaColor | null {
  const upper = key.toUpperCase();
  return (MANA_COLORS as readonly string[]).includes(upper) ? (upper as ManaColor) : null;
}
