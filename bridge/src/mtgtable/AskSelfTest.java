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
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Unit check for {@link Ask} -- <b>the answer half of all eleven ask kinds</b>,
 * driven from the JSON text a client would really send.
 *
 * <h2>Why this exists</h2>
 *
 * Across every human-seat game recorded for M2, Forge dispatched exactly
 * <b>two</b> of the eleven kinds: {@code choose_list} and {@code order}.  The
 * other nine -- {@code confirm}, {@code options}, {@code text},
 * {@code ability_menu} as a real menu, {@code choose_entities},
 * {@code assign_damage}, {@code assign_amount}, {@code manipulate_list} and
 * {@code sideboard} -- were proved only against
 * {@code tools/make-sample-fixture.mjs}, which was written from the same
 * reading of {@code docs/protocol.md} as the code it is checking.  A synthetic
 * fixture can show the reducer is total over a shape; it cannot show the Java
 * marshalling is right, and {@code assign_damage}'s
 * "option 0 is the defender, option {@code i} is {@code blockers.get(i-1)}"
 * (section 5.3) is a one-off error that produces a perfectly well-formed
 * answer object either way.
 *
 * <p>So this drives each marshaller directly, with synthetic option lists --
 * strings standing in for the {@code CardView}s and {@code MagicColor.Color}s
 * Forge would pass -- and with answers parsed from real JSON by
 * {@link Json#parse}, so the {@code Long} / {@code Object[]} / {@code Map}
 * types Jetty produces are the ones under test.  No engine boot, no game, no
 * game thread: {@code bridge/build.sh} runs it beside the {@code Json}
 * self-test on every compile.
 *
 * <p>There is no JUnit on this machine (JRE only, no Maven), so this is a
 * {@code main} that prints and exits non-zero.
 */
public final class AskSelfTest {

    private AskSelfTest() { }

    private static int checks;
    private static final List<String> FAILURES = new ArrayList<>();

    public static void main(final String[] args) {
        coercion();
        assignDamage();
        assignAmount();
        manipulateList();
        chooseListAndEntities();
        orderKind();
        sideboardKind();
        nullAnswers();

        System.out.println("AskSelfTest: " + checks + " check(s), " + FAILURES.size() + " failure(s)");
        for (final String f : FAILURES) {
            System.out.println("  FAIL " + f);
        }
        System.exit(FAILURES.isEmpty() ? 0 : 1);
    }

    // ==================================================================
    // Coercion -- what Jetty's parser actually hands the bridge
    // ==================================================================

    private static void coercion() {
        eq("asInt of a JSON integer", Integer.valueOf(3), Ask.asInt(parse("3")));
        eq("asInt of a JSON string", null, Ask.asInt(parse("\"3\"")));
        eq("asInt of null", null, Ask.asInt(null));
        eq("asBool of true", Boolean.TRUE, Ask.asBool(parse("true")));
        eq("asBool of a number", null, Ask.asBool(parse("1")));

        eq("asIntArray", "[0, 3, 7]", Arrays.toString(Ask.asIntArray(parse("[0,3,7]"))));
        eq("asIntArray of []", "[]", Arrays.toString(Ask.asIntArray(parse("[]"))));
        expect("asIntArray of a non-array is null", Ask.asIntArray(parse("{\"a\":1}")) == null);
        // A partially decoded answer is indistinguishable from a short one, so
        // one bad element makes the WHOLE answer null and the caller falls back
        // to its documented default (section 5.4).
        expect("asIntArray with a string element is null", Ask.asIntArray(parse("[0,\"x\"]")) == null);

        eq("asIntMap", "{0=1, 2=2}", String.valueOf(Ask.asIntMap(parse("{\"0\":1,\"2\":2}"))));
        expect("asIntMap of a non-map is null", Ask.asIntMap(parse("[1]")) == null);
        expect("asIntMap with a non-numeric key is null",
               Ask.asIntMap(parse("{\"red\":1}")) == null);
        expect("asIntMap with a non-numeric value is null",
               Ask.asIntMap(parse("{\"0\":\"lots\"}")) == null);
    }

    // ==================================================================
    // assign_damage -- section 5.3's documented trap
    // ==================================================================

    private static void assignDamage() {
        // The ask listed [defender, blockerA, blockerB]; this is the blockers
        // half, exactly as Forge handed it to assignCombatDamage.
        final List<String> blockers = List.of("blockerA", "blockerB");

        // {"0":1,"2":2} -- one damage to the defending PLAYER (index 0), two to
        // the SECOND blocker (index 2 -> blockers.get(1)).
        final Map<String, Integer> got = named(Ask.damageAssignment(blockers, intMap("{\"0\":1,\"2\":2}")));
        eq("assign_damage: index 0 is the defending player, as the null key",
           Integer.valueOf(1), got.get("<null>"));
        eq("assign_damage: index 2 is blockers.get(1), NOT blockers.get(2)",
           Integer.valueOf(2), got.get("blockerB"));
        eq("assign_damage: blockerA got nothing", null, got.get("blockerA"));
        eq("assign_damage: exactly two keys", Integer.valueOf(2), Integer.valueOf(got.size()));

        // All of it on the first blocker: index 1, not index 0.
        final Map<String, Integer> all = named(Ask.damageAssignment(blockers, intMap("{\"1\":3}")));
        eq("assign_damage: index 1 is the FIRST blocker", Integer.valueOf(3), all.get("blockerA"));
        expect("assign_damage: the defender key is absent when index 0 is not answered",
               !all.containsKey("<null>"));

        // Out of range is dropped, never shifted onto the last blocker.
        eq("assign_damage: an out-of-range index is dropped",
           Integer.valueOf(0), Integer.valueOf(Ask.damageAssignment(blockers, intMap("{\"9\":2}")).size()));

        // No blockers at all: trample over an empty band, everything to the player.
        final Map<String, Integer> none = named(Ask.damageAssignment(List.<String>of(), intMap("{\"0\":5}")));
        eq("assign_damage: with no blockers the defender still marshals",
           Integer.valueOf(5), none.get("<null>"));

        // A null answer means "let Forge assign" (PCH:302-304) and never reaches
        // the marshaller; if it did, it must not throw.
        eq("assign_damage: a null answer marshals to nothing",
           Integer.valueOf(0), Integer.valueOf(Ask.damageAssignment(blockers, null).size()));
    }

    // ==================================================================
    // assign_amount -- keys may be colours, so indices are the only address
    // ==================================================================

    private static void assignAmount() {
        // "Mana of any combination of colours": the option array is the incoming
        // Map<Object,Integer>'s key set, and a key is a MagicColor.Color as
        // readily as a GameEntityView.
        final List<String> opts = List.of("white", "blue", "target creature");
        final Map<String, Integer> got = Ask.indexedAmounts(opts, intMap("{\"0\":2,\"2\":1}"));
        eq("assign_amount: a colour key round-trips by index", Integer.valueOf(2), got.get("white"));
        eq("assign_amount: an entity key round-trips by index",
           Integer.valueOf(1), got.get("target creature"));
        eq("assign_amount: nothing else", Integer.valueOf(2), Integer.valueOf(got.size()));
        eq("assign_amount: an out-of-range index is dropped",
           Integer.valueOf(0), Integer.valueOf(Ask.indexedAmounts(opts, intMap("{\"7\":1}")).size()));
        eq("assign_amount: a null answer marshals to nothing",
           Integer.valueOf(0), Integer.valueOf(Ask.indexedAmounts(opts, null).size()));
    }

    // ==================================================================
    // manipulate_list -- the full list, permuted, or the input order
    // ==================================================================

    private static void manipulateList() {
        final List<String> all = List.of("top", "middle", "bottom");
        eq("manipulate_list: a permutation is applied",
           "[bottom, top, middle]", String.valueOf(Ask.reorder(all, Ask.asIntArray(parse("[2,0,1]")))));
        eq("manipulate_list: the identity permutation is the identity",
           "[top, middle, bottom]", String.valueOf(Ask.reorder(all, Ask.asIntArray(parse("[0,1,2]")))));
        // PCH:986 indexes the result, so a short answer is an index error waiting
        // to happen, not a partial selection: the default is the input order.
        eq("manipulate_list: a SHORT answer is the input order, not a short list",
           "[top, middle, bottom]", String.valueOf(Ask.reorder(all, Ask.asIntArray(parse("[2,0]")))));
        eq("manipulate_list: a long answer is the input order",
           "[top, middle, bottom]", String.valueOf(Ask.reorder(all, Ask.asIntArray(parse("[0,1,2,0]")))));
        eq("manipulate_list: a repeated index is not a permutation",
           "[top, middle, bottom]", String.valueOf(Ask.reorder(all, Ask.asIntArray(parse("[0,0,1]")))));
        eq("manipulate_list: an out-of-range index is the input order",
           "[top, middle, bottom]", String.valueOf(Ask.reorder(all, Ask.asIntArray(parse("[0,1,9]")))));
        eq("manipulate_list: a null answer is the input order",
           "[top, middle, bottom]", String.valueOf(Ask.reorder(all, null)));
        eq("manipulate_list: an empty list stays empty",
           "[]", String.valueOf(Ask.reorder(List.<String>of(), Ask.asIntArray(parse("[]")))));
    }

    // ==================================================================
    // choose_list / choose_entities -- indices in, objects out
    // ==================================================================

    private static void chooseListAndEntities() {
        final List<String> opts = List.of("Plains", "Quantum Reduction", "Aerial Doombot");
        eq("choose_list: indices select, in the order given",
           "[Aerial Doombot, Plains]", String.valueOf(Ask.pick(opts, Ask.asIntArray(parse("[2,0]")))));
        eq("choose_list: an empty answer selects nothing (a reveal's acknowledgement)",
           "[]", String.valueOf(Ask.pick(opts, Ask.asIntArray(parse("[]")))));
        eq("choose_list: an out-of-range index is dropped, the rest survive",
           "[Plains]", String.valueOf(Ask.pick(opts, Ask.asIntArray(parse("[0,9]")))));

        // getChoices must NEVER return null (AbstractGuiGame:767, 780-781).
        eq("choose_list default: min 1 takes the first option",
           "[Plains]", String.valueOf(Ask.choicesDefault(1, opts)));
        eq("choose_list default: min 2 takes the first two",
           "[Plains, Quantum Reduction]", String.valueOf(Ask.choicesDefault(2, opts)));
        eq("choose_list default: min 0 selects nothing",
           "[]", String.valueOf(Ask.choicesDefault(0, opts)));
        // AbstractGuiGame.reveal is getChoices(msg, -1, -1, items): a negative
        // min is "show these, select nothing" (section 5.3), not "pick -1".
        eq("choose_list default: a reveal's min of -1 selects nothing",
           "[]", String.valueOf(Ask.choicesDefault(-1, opts)));
        eq("choose_list default: min beyond the list is the whole list",
           "[Plains, Quantum Reduction, Aerial Doombot]", String.valueOf(Ask.choicesDefault(9, opts)));
        eq("choose_list default: an empty option list is empty, not an exception",
           "[]", String.valueOf(Ask.choicesDefault(1, List.<String>of())));
    }

    // ==================================================================
    // order -- indices address `dest ++ source` as ONE array
    // ==================================================================

    private static void orderKind() {
        final List<String> dest = List.of("trigger A");
        final List<String> source = List.of("trigger B", "trigger C");
        final List<String> destPlusSource = new ArrayList<>(dest);
        destPlusSource.addAll(source);

        eq("order: the answer addresses dest ++ source as one array",
           "[trigger A, trigger C, trigger B]",
           String.valueOf(Ask.ordered(destPlusSource, Ask.asIntArray(parse("[0,2,1]")))));

        // The naive "return sourceChoices" default drops every simultaneous
        // trigger at PCH:2309, where source is empty and the order to keep is
        // already in dest.
        eq("order default: with an empty source, dest survives intact",
           "[trigger A]",
           String.valueOf(Ask.orderedDefault(-1, -1, List.<String>of(), dest)));
        eq("order default: unconstrained keeps dest and leaves source alone",
           "[trigger A]", String.valueOf(Ask.orderedDefault(-1, -1, source, dest)));
        // remainingMax 0 means "nothing may be left in source", so everything
        // has to end up in dest.
        eq("order default: remainingMax 0 moves everything into dest",
           "[trigger A, trigger B, trigger C]",
           String.valueOf(Ask.orderedDefault(0, 0, source, dest)));
        eq("order default: an all-empty call is an empty list, never null",
           "[]", String.valueOf(Ask.orderedDefault(-1, -1, null, null)));
        // A card that is in both halves is one object, not two.
        eq("order default: dest and source do not double up",
           "[x]", String.valueOf(Ask.orderedDefault(0, 0, List.of("x"), List.of("x"))));
    }

    // ==================================================================
    // sideboard -- the new main deck, as indices into `main ++ side`
    // ==================================================================

    private static void sideboardKind() {
        final List<String> mainPlusSide = List.of("main1", "main2", "side1", "side2");
        eq("sideboard: the answer is the new MAIN deck across both halves",
           "[main1, side2]",
           String.valueOf(Ask.sideboardMain(mainPlusSide, Ask.asIntArray(parse("[0,3]")))));
        eq("sideboard: a null answer is no sideboarding (an empty list, PCH:276)",
           "[]", String.valueOf(Ask.sideboardMain(mainPlusSide, null)));
        eq("sideboard: an empty answer is an empty main deck",
           "[]", String.valueOf(Ask.sideboardMain(mainPlusSide, Ask.asIntArray(parse("[]")))));
    }

    // ==================================================================
    // Section 5.4: every ask must be answerable with null
    // ==================================================================

    private static void nullAnswers() {
        final List<String> opts = List.of("a", "b");
        // A null `answer.value` decodes to a Java null, and every coercion then
        // has to produce the "no answer" signal its caller expects.
        expect("null value -> asInt null", Ask.asInt(parse("null")) == null);
        expect("null value -> asBool null", Ask.asBool(parse("null")) == null);
        expect("null value -> asIntArray null", Ask.asIntArray(parse("null")) == null);
        expect("null value -> asIntMap null", Ask.asIntMap(parse("null")) == null);
        // ... and the three kinds with no usable null default synthesise one
        // rather than handing Forge a null it dereferences.
        expect("choose_list has a non-null default", Ask.choicesDefault(1, opts) != null);
        expect("order has a non-null default", Ask.orderedDefault(-1, -1, opts, null) != null);
        expect("manipulate_list has a non-null default", Ask.reorder(opts, null) != null);
        eq("indexOfIdentity finds by equals", Integer.valueOf(1),
           Integer.valueOf(Ask.indexOfIdentity(opts, "b")));
        eq("indexOfIdentity misses cleanly", Integer.valueOf(-1),
           Integer.valueOf(Ask.indexOfIdentity(opts, "z")));
    }

    // ==================================================================
    // Helpers
    // ==================================================================

    /** One {@code answer.value}, exactly as the io thread hands it over. */
    private static Object parse(final String json) {
        return Json.parse(json);
    }

    private static Map<Integer, Integer> intMap(final String json) {
        return Ask.asIntMap(parse(json));
    }

    /**
     * {@code damageAssignment}'s map has a {@code null} key (the defending
     * player), which no {@code Map.of} can hold and which prints as
     * {@code null=1}; name it so an assertion reads as the rule it is checking.
     */
    private static Map<String, Integer> named(final Map<String, Integer> in) {
        final Map<String, Integer> out = new LinkedHashMap<>();
        for (final Map.Entry<String, Integer> e : in.entrySet()) {
            out.put(e.getKey() == null ? "<null>" : e.getKey(), e.getValue());
        }
        return out;
    }

    private static void eq(final String what, final Object expected, final Object actual) {
        checks++;
        if (expected == null ? actual != null : !expected.equals(actual)) {
            FAILURES.add(what + "\n       expected: " + expected + "\n       actual:   " + actual);
        }
    }

    private static void expect(final String what, final boolean ok) {
        checks++;
        if (!ok) {
            FAILURES.add(what);
        }
    }
}
