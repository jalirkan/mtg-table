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
 */
package mtgtable;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * <b>The answer half of the ask path, with Forge taken out of it.</b>
 *
 * <p>Every one of the eleven ask kinds ({@code docs/protocol.md} section 5.2)
 * ends the same way: an {@code answer.value} of ask-local indices comes back
 * from the client and has to be turned into the objects {@code Forge} asked
 * for.  That marshalling is where the traps are -- section 5.3 names
 * {@code assign_damage}'s defender-at-index-0 as the worst of them -- and none
 * of it depends on a {@code GameView}, a game thread or a card: it is
 * {@code List<T>} plus {@code int[]} plus a map with integer-ish keys.
 *
 * <p>So it lives here, generic over {@code T} and importing nothing from
 * {@code forge.*}, and {@link WireGuiGame} calls it.  Two things follow:
 *
 * <ul>
 *   <li>{@link AskSelfTest} can drive every one of these with synthetic inputs
 *       -- strings standing in for {@code CardView}s -- and run in
 *       {@code bridge/build.sh} beside the {@code Json} self-test, with no
 *       engine boot and no game.  Nine of the eleven kinds have never once been
 *       dispatched by Forge in a recorded game, so before this the only thing
 *       checking them was a hand-written fixture written from the same reading
 *       of the spec as the code it was checking.</li>
 *   <li>The rules a reader has to hold ("index 0 is the defender", "a wrong
 *       length is the identity order", "a null answer is the documented
 *       default") are stated once, in one file, instead of once per override.</li>
 * </ul>
 *
 * <p>Nothing here throws on bad input.  A malformed answer is a null answer
 * (section 5.4): every method degrades to the documented default rather than
 * letting an exception out onto a parked game thread.
 */
public final class Ask {

    private Ask() { }

    // ==================================================================
    // Coercion -- Jetty's parser gives Long, Object[], Map, Boolean, String
    // ==================================================================

    /** @return the value as an {@code Integer}, or null if it is not a number. */
    public static Integer asInt(final Object o) {
        return o instanceof Number ? Integer.valueOf(((Number) o).intValue()) : null;
    }

    /** @return the value as a {@code Boolean}, or null if it is not one. */
    public static Boolean asBool(final Object o) {
        return o instanceof Boolean ? (Boolean) o : null;
    }

    /**
     * {@code [0, 3, 7]} -> {@code int[]}.  <b>Null, not a partial array</b>, when
     * the value is not an array or any element is not a number: a partially
     * decoded answer is indistinguishable from a short one, and every caller
     * treats null as "no answer" and falls back to its documented default.
     */
    public static int[] asIntArray(final Object o) {
        if (!(o instanceof Object[])) {
            return null;
        }
        final Object[] a = (Object[]) o;
        final int[] out = new int[a.length];
        for (int i = 0; i < a.length; i++) {
            final Integer n = asInt(a[i]);
            if (n == null) {
                return null;
            }
            out[i] = n.intValue();
        }
        return out;
    }

    /**
     * {@code {"0": 1, "2": 2}} -> {@code {0: 1, 2: 2}}.  JSON object keys are
     * always strings on the wire, and section 5.2 spells the two amount-shaped
     * answers with integer-ish keys; a key that is not an integer, or a value
     * that is not a number, makes the whole answer null.
     */
    public static Map<Integer, Integer> asIntMap(final Object o) {
        if (!(o instanceof Map)) {
            return null;
        }
        final Map<Integer, Integer> out = new LinkedHashMap<>();
        for (final Map.Entry<?, ?> e : ((Map<?, ?>) o).entrySet()) {
            final Integer amount = asInt(e.getValue());
            if (amount == null) {
                return null;
            }
            try {
                out.put(Integer.valueOf(String.valueOf(e.getKey())), amount);
            } catch (final NumberFormatException nfe) {
                return null;
            }
        }
        return out;
    }

    // ==================================================================
    // Index lists -> objects
    // ==================================================================

    /**
     * The plain case: indices into one option array, out-of-range entries
     * dropped.  {@code choose_list}, {@code choose_entities} and
     * {@code sideboard} all end here.
     */
    public static <T> List<T> pick(final List<T> options, final int[] picks) {
        final List<T> out = new ArrayList<>();
        if (options == null || picks == null) {
            return out;
        }
        for (final int i : picks) {
            if (i >= 0 && i < options.size()) {
                out.add(options.get(i));
            }
        }
        return out;
    }

    /**
     * {@code getChoices} must <b>never</b> return null ({@code AbstractGuiGame}
     * calls {@code isEmpty()} on it and then {@code assert size()==1; get(0)}),
     * so a null answer becomes the smallest legal selection: nothing when the
     * call was optional, else the first {@code min} options.
     *
     * <p>A negative {@code min} is Forge's "reveal" spelling
     * ({@code getChoices(msg, -1, -1, items)}, section 5.3) and selects nothing.
     */
    public static <T> List<T> choicesDefault(final int min, final List<T> choices) {
        if (min <= 0 || choices == null || choices.isEmpty()) {
            return new ArrayList<>();
        }
        return new ArrayList<>(choices.subList(0, Math.max(1, Math.min(min, choices.size()))));
    }

    /**
     * {@code manipulate_list}: the answer is the <b>full</b> list in a new
     * order, because {@code PlayerControllerHuman.java:986} indexes the result
     * directly.  Anything else -- a wrong length, a duplicate, an out-of-range
     * index -- is the input list unchanged, which is that method's documented
     * null default.
     */
    public static <T> List<T> reorder(final List<T> all, final int[] picks) {
        if (all == null) {
            return new ArrayList<>();
        }
        if (picks == null || picks.length != all.size()) {
            return new ArrayList<>(all);
        }
        final List<T> out = new ArrayList<>(all.size());
        final boolean[] used = new boolean[all.size()];
        for (final int i : picks) {
            if (i < 0 || i >= all.size() || used[i]) {
                return new ArrayList<>(all);   // not a permutation: keep the order
            }
            used[i] = true;
            out.add(all.get(i));
        }
        return out;
    }

    /**
     * {@code order}: the destination list, addressed as indices into
     * {@code dest ++ source} as ONE array (section 5.1).  Out-of-range entries
     * are dropped; the caller supplies {@code remember} separately because
     * Forge's {@code OrderResult} is {@code (List, boolean)}.
     */
    public static <T> List<T> ordered(final List<T> destPlusSource, final int[] picks) {
        return pick(destPlusSource, picks);
    }

    /**
     * {@code order} must <b>never</b> return null -- {@code IGuiGame.java:229,232}
     * and {@code PlayerControllerHuman.java:2317} all call {@code .ordered()}
     * unguarded -- and the naive "return sourceChoices" default silently
     * <b>drops every simultaneous trigger</b> at {@code PCH:2309}, where the
     * source list is empty and the order to keep is already in {@code dest}.
     *
     * <p>So the default is {@code dest ++ (source minus dest)} truncated to a
     * legal destination size.  {@code remainingMin} / {@code remainingMax} are
     * Forge's constraints on how many objects may be <em>left in source</em>, so
     * they invert into a destination size, and {@code -1} means unconstrained.
     *
     * @return the destination list of the default {@code OrderResult}
     */
    public static <T> List<T> orderedDefault(final int remainingMin, final int remainingMax,
                                             final List<T> source, final List<T> dest) {
        final List<T> all = new ArrayList<>();
        if (dest != null) {
            all.addAll(dest);
        }
        if (source != null) {
            for (final T t : source) {
                if (!all.contains(t)) {
                    all.add(t);
                }
            }
        }
        final int total = all.size();
        int lo = remainingMax >= 0 ? total - remainingMax : 0;       // min items in dest
        int hi = remainingMin >= 0 ? total - remainingMin : total;   // max items in dest
        lo = Math.max(0, Math.min(lo, total));
        hi = Math.max(lo, Math.min(hi, total));
        final int k = Math.max(lo, Math.min(dest == null ? 0 : dest.size(), hi));
        return new ArrayList<>(all.subList(0, k));
    }

    // ==================================================================
    // Amount maps
    // ==================================================================

    /**
     * <b>{@code assign_damage}, and the trap of section 5.3.</b>
     *
     * <p>The ask's option array is {@code [defender] ++ blockers}, so the answer
     * keys are off by one against the blocker list: <b>key 0 is the defending
     * player and marshals back to the map key {@code null}</b>, which is what
     * {@code PlayerControllerHuman.java:305-311} reads as "the defending
     * player"; key {@code i} is {@code blockers.get(i - 1)}.  A one-off error
     * here assigns a blocker's damage to the player or throws, and it is
     * invisible on the wire -- both shapes are a well-formed
     * {@code {"<index>": n}} object.
     *
     * <p>Out-of-range keys are dropped rather than shifted.  A null answer is
     * legal for this kind and means "let Forge assign" ({@code PCH:302-304}), so
     * a null {@code answer} never reaches here.
     *
     * @param blockers the blockers, in the order the ask listed them AFTER the
     *                 defender
     * @param answer   the decoded {@code {index: amount}} answer
     * @return a map whose {@code null} key, if present, is the defending player
     */
    public static <T> Map<T, Integer> damageAssignment(final List<T> blockers,
                                                       final Map<Integer, Integer> answer) {
        final Map<T, Integer> out = new LinkedHashMap<>();
        if (answer == null) {
            return out;
        }
        for (final Map.Entry<Integer, Integer> e : answer.entrySet()) {
            final int i = e.getKey().intValue();
            if (i == 0) {
                out.put(null, e.getValue());   // the defending player
            } else if (i > 0 && blockers != null && i - 1 < blockers.size()) {
                out.put(blockers.get(i - 1), e.getValue());
            }
        }
        return out;
    }

    /**
     * {@code assign_amount}: the option array is the incoming map's key set in
     * iteration order, so index {@code i} is simply {@code opts.get(i)}.  The
     * keys may be {@code GameEntityView}s <b>or</b> {@code MagicColor.Color}s
     * ("mana of any combination of colours", section 5.3) -- which is exactly
     * why the wire carries indices and not ids, and why this method neither
     * knows nor cares what {@code T} is.
     */
    public static <T> Map<T, Integer> indexedAmounts(final List<T> opts,
                                                     final Map<Integer, Integer> answer) {
        final Map<T, Integer> out = new LinkedHashMap<>();
        if (answer == null || opts == null) {
            return out;
        }
        for (final Map.Entry<Integer, Integer> e : answer.entrySet()) {
            final int i = e.getKey().intValue();
            if (i >= 0 && i < opts.size()) {
                out.put(opts.get(i), e.getValue());
            }
        }
        return out;
    }

    /**
     * {@code sideboard}: the answer is the new main deck, addressed as indices
     * into {@code main ++ side} (section 5.1).  A null answer means "no
     * sideboarding" and is an empty list, which {@code PCH:276} tolerates.
     */
    public static <T> List<T> sideboardMain(final List<T> mainPlusSide, final int[] picks) {
        if (picks == null) {
            return new ArrayList<>();
        }
        return pick(mainPlusSide, picks);
    }

    /** Identity-first index lookup; a view's {@code equals} is by id, which is enough. */
    public static int indexOfIdentity(final List<?> opts, final Object t) {
        if (opts == null) {
            return -1;
        }
        for (int i = 0; i < opts.size(); i++) {
            if (opts.get(i) == t || (t != null && t.equals(opts.get(i)))) {
                return i;
            }
        }
        return -1;
    }
}
