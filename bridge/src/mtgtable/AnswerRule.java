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
import java.util.Set;

/**
 * <b>The rule every ask kind's answer must obey, as Forge's own dialogs enforce
 * it</b> (decision D426, amendment M68) -- with no Forge types in it, so
 * {@link AskSelfTest} drives every rule on every build.  {@link DamageRule}
 * (D424, M67) is {@code assign_damage}'s; this is the other ten.
 *
 * <h2>Why the bridge needs it</h2>
 *
 * The rules audit (D425, {@code docs/rules-audit.md}) found six kinds whose
 * rule lives only in a Swing dialog the wire replaced -- {@code assign_amount}
 * ({@code VAssignGenericAmount}), {@code choose_list} ({@code ListChooser}),
 * {@code choose_entities} ({@code one} / {@code DualListBox}), {@code order}
 * ({@code DualListBox}), {@code sideboard}'s membership ({@code DualListBox})
 * and {@code manipulate_list} ({@code ListCardArea}) -- and Forge's engine
 * applies what comes back: an over-allocated divided spell deals the extra
 * damage, {@code [0,0]} to a sideboard plays a card twice, {@code []} to
 * {@code AbstractGuiGame.one} throws on the game thread.  Each method below is
 * the dialog's rule over the wire's own terms (option indices, the ask's
 * {@code min}/{@code max}/{@code total}), and returns {@code null} when the
 * answer is legal, else one sentence a person can read -- the {@code reason}
 * the ask is sent again with.  {@link WireGuiGame} never applies a refused
 * answer.
 *
 * <p>Every method takes the DECODED answer ({@link Json#parse}'s
 * {@code Long} / {@code Object[]} / {@code Map} / {@code Boolean} /
 * {@code String}), or {@link #MALFORMED} for an answer that was not JSON.  A
 * {@code null} answer never reaches here: it is section 5.4's "no answer", and
 * each kind keeps its documented default for it.
 */
public final class AnswerRule {

    private AnswerRule() { }

    /**
     * An {@code answer.value} that did not parse.  Before M68 that was a
     * {@code null} -- and so Forge's default, a choice the player never made;
     * now it is refused like any other illegal answer.
     */
    public static final Object MALFORMED = new Object() {
        @Override
        public String toString() {
            return "<malformed>";
        }
    };

    /** The reason given for an answer that is not the shape the kind takes. */
    static String unreadable(final String expected) {
        return "That answer could not be read: expected " + expected + ".";
    }

    /** An integral JSON number as an int, or null (a fraction, a string, out of int range). */
    static Integer intOf(final Object o) {
        if (o instanceof Long || o instanceof Integer || o instanceof Short || o instanceof Byte) {
            final long l = ((Number) o).longValue();
            return l < Integer.MIN_VALUE || l > Integer.MAX_VALUE ? null : Integer.valueOf((int) l);
        }
        if (o instanceof Double || o instanceof Float) {
            final double d = ((Number) o).doubleValue();
            if (d == Math.rint(d) && d >= Integer.MIN_VALUE && d <= Integer.MAX_VALUE) {
                return Integer.valueOf((int) d);
            }
        }
        return null;
    }

    /** {@code [i, j, ...]} as ints, or null when it is not an array of integral numbers. */
    static int[] intsOf(final Object o) {
        if (!(o instanceof Object[])) {
            return null;
        }
        final Object[] a = (Object[]) o;
        final int[] out = new int[a.length];
        for (int i = 0; i < a.length; i++) {
            final Integer n = intOf(a[i]);
            if (n == null) {
                return null;
            }
            out[i] = n.intValue();
        }
        return out;
    }

    /**
     * {@code {"0": 1, "2": 2}} as wire index to amount, or null when a key is
     * not an integer or a value is not an integral number -- stricter than
     * {@link Ask#asIntMap}, which truncates {@code 1.5} to 1.
     */
    static Map<Integer, Integer> intMapOf(final Object o) {
        if (!(o instanceof Map)) {
            return null;
        }
        final Map<Integer, Integer> out = new LinkedHashMap<>();
        for (final Map.Entry<?, ?> e : ((Map<?, ?>) o).entrySet()) {
            final Integer amount = intOf(e.getValue());
            if (amount == null) {
                return null;
            }
            try {
                out.put(Integer.valueOf(String.valueOf(e.getKey()).trim()), amount);
            } catch (final NumberFormatException nfe) {
                return null;
            }
        }
        return out;
    }

    private static String plural(final int n, final String one) {
        return n + " " + one + (n == 1 ? "" : "s");
    }

    /**
     * Every index in {@code [0, n)} and none twice: the shape of a selection
     * from a list ({@code ListChooser}'s rows, {@code DualListBox}'s moves --
     * neither can name a row twice or one that is not there).
     */
    static String distinctIndices(final int[] picks, final int n) {
        final boolean[] seen = new boolean[Math.max(0, n)];
        for (final int i : picks) {
            if (i < 0 || i >= n) {
                return "Option " + i + " is not one of the choices.";
            }
            if (seen[i]) {
                return "Option " + i + " is chosen more than once; each choice can be picked once.";
            }
            seen[i] = true;
        }
        return null;
    }

    // ------------------------------------------------------------------
    // choose_list, choose_entities -- ListChooser / one / oneOrNone / DualListBox
    // ------------------------------------------------------------------

    /**
     * A pick of {@code min..max} distinct options out of {@code n}.
     *
     * <p>{@code ListChooser}: OK is enabled only while
     * {@code min <= selected <= max} ({@code SelListener.valueChanged}), the
     * selection is a set of rows, and a {@code min > 0} chooser cannot be
     * closed without OK ({@code show}'s loop).  {@code choose_entities}' many
     * is {@code DualListBox} with {@code size - max .. size - min} left behind,
     * the same count.  A {@code max} beyond the list (Forge passes one for
     * "any number") is the list's size, and so is a {@code min} beyond it,
     * which no answer could otherwise meet.
     *
     * <p>A negative {@code min} is Forge's reveal ({@code getChoices(msg, -1,
     * -1, items)}): nothing is chosen, the answer is ignored, and any list is
     * accepted -- only an answer that is not a list at all is refused.
     */
    public static String picks(final Object v, final int n, final int min, final int max) {
        final int[] picks = intsOf(v);
        if (picks == null) {
            return unreadable("a list of option ids, like [0]");
        }
        if (min < 0) {
            return null;                      // a reveal: acknowledged, nothing chosen
        }
        final String shape = distinctIndices(picks, n);
        if (shape != null) {
            return shape;
        }
        final int lo = Math.min(min, n);
        final int hi = Math.max(lo, Math.min(max < 0 ? n : max, n));
        if (picks.length < lo || picks.length > hi) {
            final String want = lo == hi ? "exactly " + plural(lo, "option")
                    : lo == 0 ? "at most " + plural(hi, "option")
                    : "between " + lo + " and " + hi + " options";
            return "Choose " + want + " (this answer chose " + picks.length + ").";
        }
        return null;
    }

    // ------------------------------------------------------------------
    // ability_menu, options -- one index into the offered list
    // ------------------------------------------------------------------

    /**
     * One option out of {@code n}.  {@code ability_menu}'s list is the
     * engine's own ({@code InputPassPriority.onCardSelected}), and
     * {@code options}' is {@code showOptionDialog}'s; an id outside it is not a
     * choice the player could have made.  ({@code null} is "never mind", and
     * never reaches here.)
     */
    public static String index(final Object v, final int n) {
        final Integer i = intOf(v);
        if (i == null) {
            return unreadable("one option id, like 0");
        }
        if (i.intValue() < 0 || i.intValue() >= n) {
            return "Option " + i + " is not one of the choices.";
        }
        return null;
    }

    // ------------------------------------------------------------------
    // confirm
    // ------------------------------------------------------------------

    /** A yes/no question takes {@code true} or {@code false}. */
    public static String bool(final Object v) {
        return v instanceof Boolean ? null : unreadable("true or false");
    }

    // ------------------------------------------------------------------
    // text -- AbstractGuiGame.getInteger's "Other..." loop
    // ------------------------------------------------------------------

    /**
     * A free-text answer: any string.  A numeric one is
     * {@code AbstractGuiGame.getInteger}'s "Other..." branch, which loops until
     * {@code StringUtils.isNumeric(str)} and {@code min <= val <= max}; the
     * same test here, so the question comes back with a reason instead of
     * unexplained.  {@code min} / {@code max} are null when the bridge does not
     * know them (a caller other than {@code getInteger}), and then only the
     * digits are checked.
     */
    public static String text(final Object v, final boolean numeric, final Integer min, final Integer max) {
        if (!(v instanceof String)) {
            return unreadable(numeric ? "a number as text, like \"3\" (or nothing, to cancel)" : "text");
        }
        if (!numeric) {
            return null;
        }
        final String s = (String) v;
        final String range = range(min, max);
        boolean digits = !s.isEmpty();
        for (int i = 0; i < s.length() && digits; i++) {
            digits = Character.isDigit(s.charAt(i));
        }
        if (!digits) {
            return "\"" + clip(s) + "\" is not a number" + (range.isEmpty() ? "" : "; enter " + range) + ".";
        }
        final long val;
        try {
            val = Long.parseLong(s);
        } catch (final NumberFormatException e) {
            return "\"" + clip(s) + "\" is too large" + (range.isEmpty() ? "" : "; enter " + range) + ".";
        }
        if ((min != null && val < min.longValue()) || (max != null && val > max.longValue())
                || val > Integer.MAX_VALUE) {
            return val + " is out of range" + (range.isEmpty() ? "" : "; enter " + range) + ".";
        }
        return null;
    }

    private static String range(final Integer min, final Integer max) {
        if (min != null && max != null) {
            return "a number from " + min + " to " + max;
        }
        if (min != null) {
            return "a number of at least " + min;
        }
        if (max != null) {
            return "a number of at most " + max;
        }
        return "";
    }

    private static String clip(final String s) {
        return s.length() > 24 ? s.substring(0, 24) + "..." : s;
    }

    // ------------------------------------------------------------------
    // order -- DualListBox
    // ------------------------------------------------------------------

    /**
     * {@code {"ordered": [i...], "remember": bool}} over {@code total} options
     * ({@code dest ++ source}, protocol section 5.1).  {@code DualListBox}
     * moves items between its two lists, so each appears at most once, and its
     * OK button is enabled only when the count LEFT in the source list is in
     * {@code [remainingMin, remainingMax]} -- any count when
     * {@code remainingMax < 0} ({@code _setButtonState}: {@code anySize}).
     */
    public static String order(final Object v, final int total, final int remainingMin, final int remainingMax) {
        if (!(v instanceof Map)) {
            return unreadable("{\"ordered\": [option ids...], \"remember\": false}");
        }
        final Map<?, ?> m = (Map<?, ?>) v;
        final int[] picks = intsOf(m.get("ordered"));
        if (picks == null) {
            return unreadable("\"ordered\" as a list of option ids");
        }
        final Object remember = m.get("remember");
        if (remember != null && !(remember instanceof Boolean)) {
            return unreadable("\"remember\" as true or false");
        }
        final String shape = distinctIndices(picks, total);
        if (shape != null) {
            return shape;
        }
        if (remainingMax >= 0) {
            final int left = total - picks.length;
            if (left > remainingMax || left < Math.max(0, remainingMin)) {
                final int lo = Math.max(0, total - remainingMax);
                final int hi = remainingMin < 0 ? total : Math.max(lo, total - remainingMin);
                final String want = lo == hi ? "exactly " + lo : "between " + lo + " and " + hi;
                return "Put " + want + " in the list (this answer puts " + picks.length + ").";
            }
        }
        return null;
    }

    // ------------------------------------------------------------------
    // sideboard -- DualListBox(-1, -1) and PlayerControllerHuman.sideboard
    // ------------------------------------------------------------------

    /**
     * The new main deck, as distinct indices into {@code main ++ side}
     * ({@code DualListBox} only moves cards between the two lists, so a card
     * is in the deck at most as many times as it is in the pool), and -- when
     * Forge enforces deck legality -- {@code PlayerControllerHuman.sideboard}'s
     * own loop condition: at least {@code mainMin} cards in the main deck and
     * at most {@code sideMax} left in the sideboard.  Either bound may be null
     * (not enforced).
     */
    public static String sideboard(final Object v, final int mainCount, final int sideCount,
                                   final Integer mainMin, final Integer sideMax) {
        final int[] picks = intsOf(v);
        if (picks == null) {
            return unreadable("the new main deck as a list of card ids");
        }
        final int total = mainCount + sideCount;
        final String shape = distinctIndices(picks, total);
        if (shape != null) {
            return shape;
        }
        if (mainMin != null && picks.length < mainMin.intValue()) {
            return "The main deck needs at least " + plural(mainMin.intValue(), "card")
                    + " (this answer has " + picks.length + ").";
        }
        if (sideMax != null && total - picks.length > sideMax.intValue()) {
            return "The sideboard can hold at most " + plural(sideMax.intValue(), "card")
                    + " (this answer leaves " + (total - picks.length) + ").";
        }
        return null;
    }

    // ------------------------------------------------------------------
    // manipulate_list -- ListCardArea (unreachable while D13 holds)
    // ------------------------------------------------------------------

    /**
     * The full list in a new order: a permutation of {@code [0, n)}, in which
     * every card NOT in {@code manipulable} keeps its place -- the cards the
     * engine did not offer cannot be moved.
     */
    public static String reorder(final Object v, final int n, final Set<Integer> manipulable) {
        final int[] picks = intsOf(v);
        if (picks == null) {
            return unreadable("every card id in its new order");
        }
        final String shape = distinctIndices(picks, n);
        if (shape != null) {
            return shape;
        }
        if (picks.length != n) {
            return "List all " + plural(n, "card") + " in their new order (this answer lists " + picks.length + ").";
        }
        // A card the engine did not offer stays where it is: position i still
        // holds card i.  Then the offered cards can only trade places.
        for (int i = 0; i < n; i++) {
            if ((manipulable == null || !manipulable.contains(Integer.valueOf(i))) && picks[i] != i) {
                return "Card " + i + " cannot be moved.";
            }
        }
        return null;
    }

    // ------------------------------------------------------------------
    // assign_amount -- VAssignGenericAmount
    // ------------------------------------------------------------------

    /**
     * {@code assign_amount}'s rule: {@code VAssignGenericAmount}'s.  Its OK
     * button is enabled only when nothing is left to assign
     * ({@code updateLabels}: {@code amountLeft == 0}; {@code finish}), each
     * target is capped at its map value or else the total
     * ({@code assignAmountTo}: {@code at.max}), and with {@code atLeastOne}
     * every target keeps at least 1.  Forge's engine checks none of it:
     * {@code PlayerControllerHuman.chooseTargetsFor} adds each target's share
     * with {@code addDividedAllocation} and refuses only an UNDER-allocation
     * ({@code getStillToDivide() > 0}), so an over-allocated divided spell
     * deals the extra damage.
     */
    public static final class Amounts {
        /** The amount to assign: the ask's {@code total}. */
        public final int total;
        /** {@code atLeastOne}: every target at least 1. */
        public final boolean atLeastOne;
        private final int[] max;
        private final String[] labels;

        private Amounts(final int total, final boolean atLeastOne, final int[] max, final String[] labels) {
            this.total = total;
            this.atLeastOne = atLeastOne;
            this.max = max;
            this.labels = labels;
        }

        /**
         * @param caps   each target's map value from Forge, null meaning "the
         *               total" (the dialog's {@code maxAmount})
         * @param labels wire labels per target, for a reason; may be null
         */
        public static Amounts of(final int total, final boolean atLeastOne, final Integer[] caps,
                                 final String[] labels) {
            final int n = caps == null ? 0 : caps.length;
            final int[] max = new int[n];
            for (int i = 0; i < n; i++) {
                max[i] = caps[i] == null ? total : Math.max(0, caps[i].intValue());
            }
            return new Amounts(total, atLeastOne, max, labels);
        }

        /** The number of targets. */
        public int size() {
            return max.length;
        }

        /** Target {@code i}'s cap, as the dialog applies it. */
        public int maxOf(final int i) {
            return max[i];
        }

        /** Target {@code i}'s floor: 1 with {@code atLeastOne}, else 0. */
        public int minOf(final int i) {
            return atLeastOne ? 1 : 0;
        }

        /**
         * Can any answer meet the rule?  The dialog has no way out when the
         * caps cannot reach the total or the floors exceed it; Forge's callers
         * never ask that ({@code chooseTargetsFor} returns early when there are
         * more targets than damage), and when they do the bridge checks only
         * the shape and the caps, so a seat is never asked forever.
         */
        public boolean feasible() {
            long capSum = 0;
            for (final int m : max) {
                capSum += m;
            }
            return capSum >= total && (!atLeastOne || max.length <= total)
                    && (!atLeastOne || allCapsAtLeastOne());
        }

        private boolean allCapsAtLeastOne() {
            for (final int m : max) {
                if (m < 1) {
                    return false;
                }
            }
            return true;
        }

        /** Why {@code answer} (wire index to amount) is not one the dialog allows, or null. */
        public String refusal(final Map<Integer, Integer> answer) {
            if (answer == null) {
                return unreadable("an object of option id to amount, like {\"0\": 1}");
            }
            final int n = max.length;
            final long[] got = new long[n];
            long sum = 0;
            for (final Map.Entry<Integer, Integer> e : answer.entrySet()) {
                final int i = e.getKey() == null ? -1 : e.getKey().intValue();
                final int amount = e.getValue() == null ? 0 : e.getValue().intValue();
                if (i < 0 || i >= n) {
                    return "Target " + i + " is not one of the choices.";
                }
                if (amount < 0) {
                    return "An amount can't be negative (" + label(i) + ": " + amount + ").";
                }
                got[i] += amount;
                sum += amount;
            }
            for (int i = 0; i < n; i++) {
                if (got[i] > max[i]) {
                    return label(i) + " can take at most " + max[i] + " (this answer gives " + got[i] + ").";
                }
            }
            if (!feasible()) {
                return sum > total ? "Assign at most " + total + " (this answer assigns " + sum + ")." : null;
            }
            if (atLeastOne) {
                for (int i = 0; i < n; i++) {
                    if (got[i] < 1) {
                        return "Each target needs at least 1: " + label(i) + " has none.";
                    }
                }
            }
            if (sum != total) {
                return "Assign exactly " + total + " (this answer assigns " + sum + ").";
            }
            return null;
        }

        /**
         * The answer for a {@code null} (a timeout, a disconnect, the seat's own
         * null): the dialog's starting position ({@code initialAssignAmount}: 1
         * on each target with {@code atLeastOne}), then the rest on the targets
         * in order up to each cap -- always legal when any answer is.  Wire
         * indices; every target present, zeros included, so no caller ever
         * reads a missing key as {@code null} ({@code chooseTargetsFor} unboxes
         * each target's share).
         */
        public Map<Integer, Integer> fill() {
            final Map<Integer, Integer> out = new LinkedHashMap<>();
            long left = total;
            final int[] got = new int[max.length];
            if (atLeastOne) {
                for (int i = 0; i < max.length && left > 0; i++) {
                    if (max[i] >= 1) {
                        got[i] = 1;
                        left--;
                    }
                }
            }
            for (int i = 0; i < max.length && left > 0; i++) {
                final int add = (int) Math.min(left, Math.max(0, max[i] - got[i]));
                got[i] += add;
                left -= add;
            }
            for (int i = 0; i < max.length; i++) {
                out.put(Integer.valueOf(i), Integer.valueOf(got[i]));
            }
            return out;
        }

        private String label(final int i) {
            final String l = labels != null && i >= 0 && i < labels.length ? labels[i] : null;
            return l != null && !l.isEmpty() ? l : "target " + i;
        }
    }
}
