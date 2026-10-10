/*
 * mtg-table -- a local browser client for Magic: The Gathering on the Forge engine.
 * Copyright (C) 2026 mtg-table contributors.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later
 * version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program.  If not, see <https://www.gnu.org/licenses/>.
 */
package mtgtable;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * <b>{@code assign_damage}'s rule, as Forge's own dialog enforces it</b>
 * (decision D424, amendment M67) -- with no Forge types in it, so
 * {@link AskSelfTest} drives it on every build.
 *
 * <h2>Why the bridge needs it</h2>
 *
 * Forge's engine does not check a combat-damage map: {@code Combat
 * .assignAttackersDamage} adds whatever {@code PlayerController
 * .assignCombatDamage} returns, and {@code PlayerControllerHuman} returns
 * whatever its GUI's {@code assignCombatDamage} returned.  On the desktop that
 * is {@code forge.screens.match.VAssignCombatDamage}, and <b>the rule lives in
 * that dialog</b>: a click it does not allow is ignored, and its OK button is
 * enabled only when every point is assigned.  The bridge replaced the dialog
 * with the wire's {@code ask: assign_damage}; until D424 it carried the ask and
 * not the rule, and a blocked Skyclave Apparition (no trample) put its 2 damage
 * on the defending player (2026-10-10, turn 23).
 *
 * <h2>The rule, read off the pinned 2.0.14 jar (javap) and Forge's source</h2>
 *
 * The dialog's state is a list of targets: the blockers in Forge's order, then
 * the defender <b>only when</b> {@code attackerHasTrample} (the constructor:
 * {@code defender != null && attacker.getCurrentState().hasTrample()}) or
 * {@code attackerHasDivideDamage && overrideCombatantOrder}
 * ({@code hasDivideDamage()} is Butcher Orgg's "divided as you choose among
 * defending player and/or any number of creatures they control").  Each
 * target's lethal damage is {@code getDamageToKill}: a card's
 * {@code max(0, getLethalDamage())} (Forge's toughness less damage and damage
 * already assigned; 0 once a deathtouch source has assigned to it), a
 * planeswalker's loyalty, and {@code min(lethal, 1)} when the attacker has
 * deathtouch.  Then:
 * <ul>
 *   <li><b>the total</b>: {@code finish()} closes only when
 *       {@code getRemainingDamage() == 0} -- every point, no more (the dialog
 *       caps at the total);</li>
 *   <li><b>divided as you choose</b> ({@code hasDivideDamage &&
 *       overrideOrder}): {@code assignDamageTo} skips {@code canAssignTo} and
 *       {@code checkDamageQueue} returns at once -- any split;</li>
 *   <li><b>in order</b> ({@code !overrideOrder}, legacy damage assignment
 *       order): {@code checkDamageQueue} zeroes every target after the first
 *       one short of lethal, and {@code assignDamageTo} refuses the first
 *       blocker less than lethal -- a target may take damage only when every
 *       target before it has lethal;</li>
 *   <li><b>otherwise</b> ({@code overrideOrder}: today's rules, banding, the
 *       defending player assigning): the blockers in any split, and the
 *       defender only when <b>every</b> blocker has lethal
 *       ({@code canAssignTo(null)} walks the whole list).</li>
 * </ul>
 * "Assign as though it weren't blocked" never reaches the dialog: {@code
 * Combat.assignAttackersDamage} asks {@code confirmStaticApplication} first and
 * puts the whole amount on the defender itself.  "Trample over planeswalkers"
 * arrives as a trampler whose planeswalker is the last blocker and whose
 * defender is that planeswalker's controller ({@code Combat}, the
 * {@code "Trample:Planeswalker"} branch) -- the same rule.
 *
 * <p>The <b>Auto</b> button ({@code initialAssignDamage(true)}) is this rule's
 * default: lethal to each target in order until the damage runs out, the rest
 * on the last target reached -- the defender when it is allowed.
 */
public final class DamageRule {

    /** The damage to assign: the ask's {@code total}. */
    public final int total;
    /** Lethal damage per blocker, in Forge's order: wire target {@code i + 1}. */
    private final int[] lethal;
    /** Labels per wire target (index 0 the defender), for a reason a person reads. */
    private final String[] labels;
    /** Forge's {@code overrideOrder}. */
    public final boolean overrideOrder;
    /** {@code hasDivideDamage && overrideOrder}: any split at all. */
    public final boolean free;
    /** May wire target 0, the defender, take damage? (M67's {@code defenderAllowed}) */
    public final boolean defenderAllowed;

    private DamageRule(final int total, final int[] lethal, final String[] labels, final boolean overrideOrder,
                       final boolean free, final boolean defenderAllowed) {
        this.total = total;
        this.lethal = lethal.clone();
        this.labels = labels;
        this.overrideOrder = overrideOrder;
        this.free = free;
        this.defenderAllowed = defenderAllowed;
    }

    /**
     * The dialog's flags, from what its constructor reads.
     *
     * @param lethal      {@code getDamageToKill} per blocker, in Forge's order
     * @param labels      wire labels, index 0 the defender, then the blockers; may be null
     * @param trample     the attacker's {@code hasTrample()}
     * @param divide      the attacker's {@code hasDivideDamage()}
     * @param hasDefender Forge passed a defender ({@code defender != null})
     */
    public static DamageRule of(final int total, final int[] lethal, final String[] labels,
                                final boolean overrideOrder, final boolean trample, final boolean divide,
                                final boolean hasDefender) {
        final boolean free = divide && overrideOrder;
        // The dialog adds the defender's row for a divider with a null defender
        // too; that row's damage would go nowhere (Combat puts it on `defender`),
        // so the bridge allows it only when there is a defender to take it.
        final boolean defenderAllowed = hasDefender && (trample || free);
        return new DamageRule(total, lethal == null ? new int[0] : lethal, labels, overrideOrder, free,
                defenderAllowed);
    }

    /** Lethal damage for wire target {@code i} ({@code i >= 1}). */
    public int lethalOf(final int i) {
        return lethal[i - 1];
    }

    /** The number of blockers (wire targets 1..n). */
    public int blockers() {
        return lethal.length;
    }

    /**
     * Why this answer is not one Forge's dialog could have produced, or
     * {@code null} when it is legal.  {@code answer} is wire index to amount;
     * a zero entry is the same as no entry.
     */
    public String refusal(final Map<Integer, Integer> answer) {
        if (answer == null) {
            return "No damage assignment was given.";
        }
        final int n = lethal.length;
        final int[] got = new int[n + 1];
        long sum = 0;
        for (final Map.Entry<Integer, Integer> e : answer.entrySet()) {
            final int i = e.getKey() == null ? -1 : e.getKey().intValue();
            final int v = e.getValue() == null ? 0 : e.getValue().intValue();
            if (i < 0 || i > n) {
                return "Target " + i + " is not one of the choices.";
            }
            if (v < 0) {
                return "Damage can't be negative (" + label(i) + ": " + v + ").";
            }
            got[i] += v;
            sum += v;
        }
        if (got[0] > 0 && !defenderAllowed) {
            return "Without trample, a blocked creature can't assign combat damage to "
                    + label(0) + ". Assign all " + total + " to the blockers.";
        }
        if (sum != total) {
            return "Assign exactly " + total + " damage (this answer assigns " + sum + ").";
        }
        if (free) {
            return null;
        }
        if (!overrideOrder) {
            // In order: a target takes damage only when every one before it has
            // lethal.  The defender comes after every blocker.
            for (int k = 1; k <= n; k++) {
                if (got[k] < lethal[k - 1]) {
                    for (int later = k + 1; later <= n; later++) {
                        if (got[later] > 0) {
                            return "Blockers take damage in order: " + label(k) + " needs lethal damage ("
                                    + lethal[k - 1] + ") before " + label(later) + " gets any.";
                        }
                    }
                    if (got[0] > 0) {
                        return defenderNeedsLethal(k);
                    }
                    break;
                }
            }
            return null;
        }
        if (got[0] > 0) {
            for (int k = 1; k <= n; k++) {
                if (got[k] < lethal[k - 1]) {
                    return defenderNeedsLethal(k);
                }
            }
        }
        return null;
    }

    private String defenderNeedsLethal(final int k) {
        return "Each blocker needs lethal damage before " + label(0) + " gets any: " + label(k)
                + " needs " + lethal[k - 1] + ".";
    }

    /**
     * The dialog's Auto button ({@code initialAssignDamage(true)}): lethal to
     * each blocker in order while damage lasts, then the rest on the defender
     * when it is allowed, else on the last blocker reached.  Wire indices.
     */
    public Map<Integer, Integer> auto() {
        final Map<Integer, Integer> out = new LinkedHashMap<>();
        int left = total;
        int last = -1;
        for (int k = 1; k <= lethal.length && left > 0; k++) {
            final int d = Math.min(Math.max(0, lethal[k - 1]), left);
            out.put(Integer.valueOf(k), Integer.valueOf(d));
            left -= d;
            last = k;
        }
        if (left > 0) {
            if (defenderAllowed) {
                out.put(Integer.valueOf(0), Integer.valueOf(left));
            } else if (last > 0) {
                out.put(Integer.valueOf(last), Integer.valueOf(out.get(Integer.valueOf(last)).intValue() + left));
            }
        }
        out.values().removeIf(v -> v.intValue() == 0);
        return out;
    }

    private String label(final int i) {
        final String l = labels != null && i >= 0 && i < labels.length ? labels[i] : null;
        if (l != null && !l.isEmpty()) {
            return l;
        }
        return i == 0 ? "the defending player" : "blocker " + i;
    }
}
