/*
 * mtg-table -- a local browser client for Magic: The Gathering on the Forge engine.
 * Copyright (C) 2026 mtg-table contributors.
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
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
package mtgtable.ai;

import java.util.HashMap;
import java.util.Map;

/**
 * The Forge seat's pay cap in the move atlas's branch games (D465, amending
 * D451): a play Forge's AI chose and then could not pay for, refused
 * {@link #limit} times in one priority window, is answered with a pass the next
 * time Forge chooses it there.
 *
 * <p>Forge's own AI sets a refused play aside ({@code SpellAbility.setSkip},
 * from {@code ComputerUtilMana.payManaCost}'s "Didn't find what to pay for",
 * {@code ComputerUtilMana.java:812}, and {@code ComputerUtil.handlePlayingSpellAbility}'s
 * "AI failed to play", {@code ComputerUtil.java:137-142}), but only until its next
 * choice: {@code AiController.getSpellAbilityToPlay} clears the marks of the
 * plays it had set aside the time before ({@code AiController.java:1513-1520})
 * and sets aside only those marked now ({@code :1570-1572}).  Two plays that a
 * tax (Elite Spellbinder's) makes unpayable are therefore chosen in turn, each
 * refused, for as long as the window lasts: the priority goes back to the seat
 * after every refusal and nothing in the window changes.  This counts the
 * refusals of each play (its option token) in the window -- G5's window,
 * {@link Explorer#window}: the turn, the phase, the stack and the seat's lands
 * -- and, past the limit, turns Forge's choice of it into a pass.
 *
 * <p>It changes the Forge map's policy only in that pathological case: a play
 * that has been refused {@link #limit} times in a window with nothing changed
 * would be refused again.  Every pass it makes is counted ({@link #events},
 * the log's {@code guardrails.forgePayCap}, protocol M72).  Engine-free.
 */
final class PayCap {

    /** Refusals of one play in one window before Forge's next choice of it there is a pass. */
    static final int LIMIT = 3;

    private final int limit;
    private String window;
    private final Map<String, Integer> refusals = new HashMap<>();
    private int events;

    PayCap(final int limit) {
        this.limit = limit;
    }

    /** The engine refused {@code tok} in window {@code w}. */
    void refused(final String w, final String tok) {
        if (!w.equals(window)) {
            refusals.clear();
            window = w;
        }
        refusals.merge(tok, 1, Integer::sum);
    }

    /**
     * Whether Forge's choice of {@code tok} in {@code w} is to be answered with a
     * pass (counted when it is).  A new window forgets the counts.
     */
    boolean caps(final String w, final String tok) {
        if (!w.equals(window)) {
            refusals.clear();
            window = null;
            return false;
        }
        final Integer k = refusals.get(tok);
        if (k != null && k >= limit) {
            events++;
            return true;
        }
        return false;
    }

    /** Refusals of {@code tok} counted in the current window. */
    int refusalsOf(final String tok) {
        final Integer k = refusals.get(tok);
        return k == null ? 0 : k;
    }

    /** Passes the cap made (the log's {@code forgePayCap}). */
    int events() {
        return events;
    }

    int limit() {
        return limit;
    }
}
