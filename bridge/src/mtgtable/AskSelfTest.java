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
        damageRule();
        assignAmount();
        manipulateList();
        chooseListAndEntities();
        orderKind();
        sideboardKind();
        nullAnswers();
        policy();
        answerRule();
        autoAnswersAreLegal();

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

        // A null answer never reaches the marshaller (M67: the bridge turns it
        // into a skip or the dialog's Auto, DamageRule.auto); if it did, it
        // must not throw.
        eq("assign_damage: a null answer marshals to nothing",
           Integer.valueOf(0), Integer.valueOf(Ask.damageAssignment(blockers, null).size()));
    }

    // ==================================================================
    // assign_damage's RULE (M67, D424) -- VAssignCombatDamage's, which the
    // engine does not re-check.  Index 0 is the defender, 1..n the blockers.
    // ==================================================================

    private static void damageRule() {
        final String[] labels = { "Forge AI", "Servo Token", "Spirited Companion" };
        // The 2026-10-10 game: Skyclave Apparition (2/2, no trample) blocked by
        // a 1/1 Servo and a 1/2 Spirited Companion; today's rules (overrideOrder).
        final DamageRule skyclave = DamageRule.of(2, new int[] { 1, 2 }, labels, true, false, false, true);
        expect("rule: no trample -> the defender is not allowed", !skyclave.defenderAllowed);
        refused("rule: 2 to the defender without trample (the bug)", skyclave, "{\"0\":2}", "trample");
        refused("rule: 1 to the defender, 1 to a blocker, without trample", skyclave, "{\"0\":1,\"1\":1}", "trample");
        refused("rule: 0+... the defender even with every blocker lethal, without trample",
                DamageRule.of(4, new int[] { 1, 2 }, labels, true, false, false, true), "{\"0\":1,\"1\":1,\"2\":2}",
                "trample");
        legal("rule: the whole 2 on the Companion (any split among blockers, overrideOrder)", skyclave, "{\"2\":2}");
        legal("rule: 1 and 1", skyclave, "{\"1\":1,\"2\":1}");
        legal("rule: a zero to the defender is no damage to it", skyclave, "{\"0\":0,\"1\":2}");
        refused("rule: short of the total", skyclave, "{\"1\":1}", "exactly 2");
        refused("rule: over the total", skyclave, "{\"1\":2,\"2\":1}", "exactly 2");
        refused("rule: a target that was not offered", skyclave, "{\"3\":2}", "not one of the choices");
        refused("rule: a negative amount", skyclave, "{\"1\":3,\"2\":-1}", "negative");
        eq("rule: Auto without trample piles the rest on the last blocker reached",
           "{1=1, 2=1}", String.valueOf(skyclave.auto()));
        eq("rule: Auto of 5 without trample", "{1=1, 2=4}",
           String.valueOf(DamageRule.of(5, new int[] { 1, 2 }, labels, true, false, false, true).auto()));

        // Trample (overrideOrder): the defender only once every blocker has lethal.
        final DamageRule trample = DamageRule.of(5, new int[] { 1, 2 }, labels, true, true, false, true);
        expect("rule: trample with a defender -> allowed", trample.defenderAllowed);
        legal("rule: trample, lethal to both and 2 over", trample, "{\"0\":2,\"1\":1,\"2\":2}");
        legal("rule: trample, everything on the blockers", trample, "{\"1\":4,\"2\":1}");
        refused("rule: trample, the Companion short of lethal", trample, "{\"0\":3,\"1\":1,\"2\":1}",
                "Spirited Companion needs 2");
        eq("rule: Auto with trample: lethal in order, the rest to the defender",
           "{1=1, 2=2, 0=2}", String.valueOf(trample.auto()));
        expect("rule: trample but no defender (a blocker's damage) -> not allowed",
               !DamageRule.of(5, new int[] { 1, 2 }, labels, true, true, false, false).defenderAllowed);

        // Deathtouch is in the lethal numbers the bridge hands the rule
        // (Snap.lethal: min(lethal, 1)): a 3-damage deathtouch trampler over a
        // 4/4 and a 2/2 needs only 1 on each.
        final DamageRule deathtouch = DamageRule.of(3, new int[] { 1, 1 }, labels, true, true, false, true);
        legal("rule: deathtouch + trample, 1 each and 1 over", deathtouch, "{\"0\":1,\"1\":1,\"2\":1}");

        // Legacy damage assignment order (overrideOrder false).
        final DamageRule ordered = DamageRule.of(4, new int[] { 2, 2 }, labels, false, true, false, true);
        refused("rule: in order, the second blocker before the first has lethal", ordered,
                "{\"1\":1,\"2\":3}", "in order");
        legal("rule: in order, lethal to the first, the rest to the second", ordered, "{\"1\":2,\"2\":2}");
        legal("rule: in order, all on the first", ordered, "{\"1\":4}");
        refused("rule: in order, the defender before the second has lethal", ordered,
                "{\"0\":1,\"1\":2,\"2\":1}", "Spirited Companion needs 2");
        eq("rule: Auto in order", "{1=2, 2=2}", String.valueOf(ordered.auto()));
        eq("rule: Auto in order, damage short of the first's lethal", "{1=1}",
           String.valueOf(DamageRule.of(1, new int[] { 2, 2 }, labels, false, false, false, true).auto()));

        // Divided as you choose (Butcher Orgg) with overrideOrder: any split.
        final DamageRule divide = DamageRule.of(3, new int[] { 2, 2 }, labels, true, false, true, true);
        expect("rule: divided as you choose -> the defender is allowed", divide.defenderAllowed);
        legal("rule: divided as you choose, all to the defender", divide, "{\"0\":3}");
        legal("rule: divided as you choose, 1 to each", divide, "{\"0\":1,\"1\":1,\"2\":1}");
        refused("rule: divided as you choose still needs the total", divide, "{\"0\":2}", "exactly 3");
        // The divide keyword without overrideOrder is the ordinary ordered rule.
        expect("rule: divide without overrideOrder -> no defender",
               !DamageRule.of(3, new int[] { 2, 2 }, labels, false, false, true, true).defenderAllowed);

        // The marshalling of a rule's answer: Auto through Ask.damageAssignment.
        final Map<String, Integer> autoMap = named(Ask.damageAssignment(List.of("Servo", "Companion"), trample.auto()));
        eq("rule: Auto marshals the defender to the null key", Integer.valueOf(2), autoMap.get("<null>"));
        eq("rule: Auto marshals index 2 to the second blocker", Integer.valueOf(2), autoMap.get("Companion"));
    }

    private static void legal(final String what, final DamageRule rule, final String json) {
        final String r = rule.refusal(intMap(json));
        expect(what + " is legal (got: " + r + ")", r == null);
    }

    private static void refused(final String what, final DamageRule rule, final String json, final String needle) {
        final String r = rule.refusal(intMap(json));
        expect(what + " is refused", r != null);
        expect(what + ": the reason names \"" + needle + "\" (got: " + r + ")", r != null && r.contains(needle));
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
    // The scripted seat's own policy (M5) -- the two answers that are legal
    // and still dead ends
    // ==================================================================

    /**
     * {@link AutoTransport#answerFor} is not marshalling and would normally not
     * live here.  It is here because two of its answers were <b>legal, accepted
     * by the engine, and non-terminating</b>, which no shape check can see:
     *
     * <ul>
     *   <li>a {@code confirm} answered {@code false} when the "no" branch is
     *       "do not pass priority" re-asks at once.  Measured, M5: <b>969</b>
     *       identical {@code confirm} asks in one probe game before it was
     *       killed;</li>
     *   <li>a {@code text} answered {@code ""} when {@code numeric} is true.
     *       {@code AbstractGuiGame.getInteger}'s "Other..." branch is a
     *       {@code while (true)} that re-asks until the string is a number
     *       inside its own {@code [min,max]} -- bounds the ask body does not
     *       carry.</li>
     * </ul>
     *
     * <p>The {@code confirm} backstop has a third failure mode of its own, and
     * it is why the assertions below walk five prompts rather than three: a
     * backstop that <b>latches</b> on the opposite answer (<code>seen &gt; 2 ?
     * !dflt : dflt</code>) has merely chosen the other non-advancing value.  It
     * shipped that way and reproduced the loop: <b>2,278</b> identical asks and
     * a 35 MB frame log in one 300 s gate step, with and without {@code --probe}.
     * The answer must <em>alternate</em>.
     *
     * <p>Both are now answered so that the game advances, and both are one line
     * away from being reverted by someone tidying up.  Nothing else in the repo
     * would notice: the corpus contains no {@code confirm} or {@code text} ask
     * except the two M5 fixtures, and a fixture replays an answer rather than
     * recomputing it.
     */
    private static void policy() {
        final Map<String, Integer> seen = new java.util.HashMap<>();

        // confirm: the engine's own default button, not a flat "false".
        final String yes = "{\"kind\":\"confirm\",\"prompt\":\"p\",\"title\":\"t\",\"defaultYes\":true}";
        final String no = "{\"kind\":\"confirm\",\"prompt\":\"q\",\"title\":\"t\",\"defaultYes\":false}";
        eq("confirm answers defaultYes=true with true", "true", answer("confirm", yes, false, seen));
        eq("confirm answers defaultYes=false with false", "false", answer("confirm", no, false, seen));
        // ...and from the third identical prompt it ALTERNATES, so no confirm
        // can loop.  Alternation, not a flip: the first version of this line
        // latched -- `seen > 2 ? !dflt : dflt` -- which answers prompts 3..
        // infinity with the SAME non-advancing value and reproduced the exact
        // 969-ask loop the backstop was written to prevent (2,278 asks and a
        // 35 MB frame log in one 300 s gate step, M5 verification).
        eq("the same confirm prompt, 2nd time", "true", answer("confirm", yes, false, seen));
        eq("the same confirm prompt, 3rd time FLIPS", "false", answer("confirm", yes, false, seen));
        eq("the same confirm prompt, 4th time FLIPS BACK", "true", answer("confirm", yes, false, seen));
        eq("the same confirm prompt, 5th time FLIPS again", "false", answer("confirm", yes, false, seen));
        eq("the same confirm prompt, 6th time", "true", answer("confirm", yes, false, seen));
        // The mirror image: a confirm whose engine default is `false` must reach
        // `true` just as fast, or the backstop only works one way round.
        eq("defaultYes=false, 2nd time", "false", answer("confirm", no, false, seen));
        eq("defaultYes=false, 3rd time FLIPS to true", "true", answer("confirm", no, false, seen));
        eq("defaultYes=false, 4th time FLIPS BACK", "false", answer("confirm", no, false, seen));
        // A prompt the caller has cleared (a turn/phase change: AutoTransport
        // clears the map on progress) is answered with the engine's default
        // again -- an honest once-a-turn confirm never drifts off it.
        seen.clear();
        eq("after progress, the same prompt starts from the default again", "true",
                answer("confirm", yes, false, seen));

        // THE ASK CEILING.  Alternation is what usually escapes; this is what
        // stops ANY ask, of any kind, from burning a 300 s gate step when it
        // does not.  It fires on a path no green run reaches, so this is the
        // only thing in the repo that walks it.
        final Map<String, Integer> repeats = new java.util.HashMap<>();
        @SuppressWarnings("unchecked")
        final Map<String, Object> loop = (Map<String, Object>) parse(yes);
        for (int i = 1; i <= AutoTransport.ASK_REPEAT_CAP; i++) {
            eq("ask repeat " + i + " of " + AutoTransport.ASK_REPEAT_CAP + " is under the cap",
                    Boolean.FALSE,
                    Boolean.valueOf(AutoTransport.overAskRepeatCap(repeats, "confirm", loop)));
        }
        eq("one past the cap concedes", Boolean.TRUE,
                Boolean.valueOf(AutoTransport.overAskRepeatCap(repeats, "confirm", loop)));
        eq("a DIFFERENT prompt has its own count", Boolean.FALSE,
                Boolean.valueOf(AutoTransport.overAskRepeatCap(repeats, "confirm",
                        castBody(no))));
        repeats.clear();
        eq("and progress clears it", Boolean.FALSE,
                Boolean.valueOf(AutoTransport.overAskRepeatCap(repeats, "confirm", loop)));

        // text: null is "cancel" and terminates; "" is an infinite ask loop.
        final String numeric = "{\"kind\":\"text\",\"prompt\":\"Enter a number between 0 and 99:\","
                + "\"numeric\":true}";
        final String free = "{\"kind\":\"text\",\"prompt\":\"Name a card\",\"numeric\":false}";
        eq("a NUMERIC text ask is cancelled by default", "null", answer("text", numeric, false, seen));
        eq("a free-text ask is still answered \"\"", "\"\"", answer("text", free, false, seen));
        final Map<String, Integer> probeSeen = new java.util.HashMap<>();
        eq("--probe answers the first numeric text ask with a real number",
                "\"0\"", answer("text", numeric, true, probeSeen));
        eq("--probe cancels a REPEAT of the same numeric prompt (it was out of range)",
                "null", answer("text", numeric, true, probeSeen));

        // choose_list: --probe picks getInteger's one "Other..." option, and
        // ONLY when the list has that exact shape.
        final String getInteger = "{\"kind\":\"choose_list\",\"min\":0,\"max\":1,\"options\":["
                + "{\"id\":0,\"kind\":\"number\",\"label\":\"0\"},"
                + "{\"id\":1,\"kind\":\"number\",\"label\":\"1\"},"
                + "{\"id\":2,\"kind\":\"text\",\"label\":\"Other...\"}]}";
        final String cards = "{\"kind\":\"choose_list\",\"min\":0,\"max\":1,\"options\":["
                + "{\"id\":0,\"kind\":\"card\",\"label\":\"Plains\"},"
                + "{\"id\":1,\"kind\":\"text\",\"label\":\"Other...\"}]}";
        eq("--probe picks the Other... option of a getInteger list",
                "[2]", answer("choose_list", getInteger, true, probeSeen));
        eq("the default policy does not", "[]", answer("choose_list", getInteger, false, probeSeen));
        eq("--probe leaves a list of CARDS alone", "[]", answer("choose_list", cards, true, probeSeen));

        // choose_entities: --probe takes one card from an OPTIONAL search, so
        // the answer marshalling (index -> option array -> GameEntity) runs.
        final String optional = "{\"kind\":\"choose_entities\",\"min\":0,\"max\":1,\"options\":["
                + "{\"id\":0,\"kind\":\"card\"},{\"id\":1,\"kind\":\"card\"}]}";
        eq("the default policy answers an optional search with none",
                "[]", answer("choose_entities", optional, false, probeSeen));
        eq("--probe takes one", "[0]", answer("choose_entities", optional, true, probeSeen));
        eq("a mandatory choose_entities is unchanged by --probe", "[0]",
                answer("choose_entities",
                        "{\"kind\":\"choose_entities\",\"min\":1,\"max\":1,\"options\":["
                        + "{\"id\":0},{\"id\":1}]}", true, probeSeen));
    }

    // ==================================================================
    // M68 (D426): AnswerRule -- every kind's rule, from Forge's own dialogs
    // ==================================================================

    private static void ok(final String what, final String refusal) {
        expect(what + " is legal" + (refusal == null ? "" : " (refused: " + refusal + ")"), refusal == null);
    }

    private static void no(final String what, final String refusal, final String needle) {
        expect(what + " is refused", refusal != null);
        if (refusal != null && needle != null) {
            expect(what + ": the reason says \"" + needle + "\" (got: " + refusal + ")", refusal.contains(needle));
        }
    }

    private static void answerRule() {
        // choose_list / choose_entities: ListChooser's count, a set of rows.
        ok("choose_list [1] of 3, min 1 max 1", AnswerRule.picks(parse("[1]"), 3, 1, 1));
        no("choose_list [] to a `one` (min 1) -- it threw on the game thread",
                AnswerRule.picks(parse("[]"), 3, 1, 1), "exactly 1 option");
        no("choose_list [0,1] to max 1", AnswerRule.picks(parse("[0,1]"), 3, 1, 1), "exactly 1");
        no("choose_list [0,0], one option twice", AnswerRule.picks(parse("[0,0]"), 3, 0, 3), "more than once");
        no("choose_list [3], not offered", AnswerRule.picks(parse("[3]"), 3, 0, 1), "not one of the choices");
        no("choose_list [-1]", AnswerRule.picks(parse("[-1]"), 3, 0, 1), "not one of the choices");
        no("choose_list [1.5], a fraction", AnswerRule.picks(parse("[1.5]"), 3, 0, 1), "could not be read");
        no("choose_list \"0\", a string", AnswerRule.picks(parse("\"0\""), 3, 0, 1), "could not be read");
        no("choose_list a malformed answer", AnswerRule.picks(AnswerRule.MALFORMED, 3, 0, 1), "could not be read");
        ok("choose_list [] to an optional (min 0)", AnswerRule.picks(parse("[]"), 3, 0, 1));
        ok("choose_list a max beyond the list is the list", AnswerRule.picks(parse("[0,1,2]"), 3, 0, 99));
        ok("choose_list a min beyond the list is the list", AnswerRule.picks(parse("[0,1]"), 2, 5, 9));
        no("choose_list between 2 and 3, one picked", AnswerRule.picks(parse("[0]"), 4, 2, 3), "between 2 and 3");
        no("choose_list at most 2, three picked", AnswerRule.picks(parse("[0,1,2]"), 4, 0, 2), "at most 2");
        ok("a reveal (min -1) takes any list -- it chooses nothing", AnswerRule.picks(parse("[0]"), 2, -1, -1));
        ok("a reveal takes []", AnswerRule.picks(parse("[]"), 2, -1, -1));
        no("a reveal still refuses a non-list", AnswerRule.picks(parse("{}"), 2, -1, -1), "could not be read");

        // ability_menu / options: one index into the offered list.
        ok("ability_menu 1 of 2", AnswerRule.index(parse("1"), 2));
        no("ability_menu 2 of 2", AnswerRule.index(parse("2"), 2), "not one of the choices");
        no("ability_menu [0], a list", AnswerRule.index(parse("[0]"), 2), "could not be read");
        no("options -1", AnswerRule.index(parse("-1"), 2), "not one of the choices");

        // confirm.
        ok("confirm true", AnswerRule.bool(parse("true")));
        no("confirm 1", AnswerRule.bool(parse("1")), "true or false");
        no("confirm \"yes\"", AnswerRule.bool(parse("\"yes\"")), "true or false");

        // text: getInteger's Other... loop, with its bounds.
        final Integer zero = Integer.valueOf(0);
        final Integer ten = Integer.valueOf(10);
        ok("text \"7\" in [0,10]", AnswerRule.text(parse("\"7\""), true, zero, ten));
        no("text \"11\" over 10", AnswerRule.text(parse("\"11\""), true, zero, ten), "from 0 to 10");
        no("text \"-1\" (Forge's isNumeric has no sign)", AnswerRule.text(parse("\"-1\""), true, zero, ten), "not a number");
        no("text \"\"", AnswerRule.text(parse("\"\""), true, zero, ten), "not a number");
        no("text \"two\"", AnswerRule.text(parse("\"two\""), true, null, null), "not a number");
        no("text 7, a number not a string", AnswerRule.text(parse("7"), true, zero, ten), "could not be read");
        no("text \"99999999999\"", AnswerRule.text(parse("\"99999999999\""), true, zero, null), "out of range");
        ok("text with unknown bounds: digits only", AnswerRule.text(parse("\"12345\""), true, null, null));
        ok("free text: any string", AnswerRule.text(parse("\"Llanowar Elves\""), false, null, null));

        // order: DualListBox -- each item once, the count left in source bounded.
        final String keepAll = "{\"ordered\":[2,0,1],\"remember\":false}";
        ok("order: all three moved, remaining 0..0", AnswerRule.order(parse(keepAll), 3, 0, 0));
        no("order: two of three when all must move", AnswerRule.order(parse("{\"ordered\":[0,1]}"), 3, 0, 0),
                "exactly 3");
        no("order: an item twice", AnswerRule.order(parse("{\"ordered\":[0,0,1]}"), 3, 0, 0), "more than once");
        no("order: an id not offered", AnswerRule.order(parse("{\"ordered\":[0,1,5]}"), 3, 0, 0),
                "not one of the choices");
        ok("order: max < 0 is any size", AnswerRule.order(parse("{\"ordered\":[1]}"), 3, -1, -1));
        ok("order: many() of 1..2 from 4 (remaining 2..3)",
                AnswerRule.order(parse("{\"ordered\":[3]}"), 4, 2, 3));
        no("order: many() of 1..2 from 4, three put",
                AnswerRule.order(parse("{\"ordered\":[0,1,2]}"), 4, 2, 3), "between 1 and 2");
        no("order: null `ordered`", AnswerRule.order(parse("{\"remember\":true}"), 3, 0, 0), "could not be read");
        no("order: a non-boolean remember", AnswerRule.order(parse("{\"ordered\":[0,1,2],\"remember\":1}"), 3, 0, 0),
                "remember");
        no("order: a bare list", AnswerRule.order(parse("[0,1,2]"), 3, 0, 0), "could not be read");

        // sideboard: distinct indices into main ++ side, and Forge's two bounds.
        ok("sideboard: the identity", AnswerRule.sideboard(parse("[0,1,2]"), 3, 2, Integer.valueOf(3), Integer.valueOf(15)));
        ok("sideboard: one swapped", AnswerRule.sideboard(parse("[0,1,3]"), 3, 2, Integer.valueOf(3), Integer.valueOf(15)));
        no("sideboard: a card twice -- a copy the pool does not have",
                AnswerRule.sideboard(parse("[0,0,0]"), 3, 2, Integer.valueOf(3), Integer.valueOf(15)), "more than once");
        no("sideboard: too small a main deck",
                AnswerRule.sideboard(parse("[0,1]"), 3, 2, Integer.valueOf(3), Integer.valueOf(15)), "at least 3 cards");
        no("sideboard: too big a sideboard",
                AnswerRule.sideboard(parse("[0,1,2]"), 3, 2, Integer.valueOf(0), Integer.valueOf(1)), "at most 1 card");
        ok("sideboard: unenforced sizes", AnswerRule.sideboard(parse("[4]"), 3, 2, null, null));
        no("sideboard: an index past the pool", AnswerRule.sideboard(parse("[5]"), 3, 2, null, null),
                "not one of the choices");

        // manipulate_list: a permutation; only the offered cards move.
        final java.util.Set<Integer> mid = new java.util.HashSet<>(List.of(Integer.valueOf(1), Integer.valueOf(2)));
        ok("manipulate_list: the offered two trade places", AnswerRule.reorder(parse("[0,2,1]"), 3, mid));
        no("manipulate_list: a card not offered moves", AnswerRule.reorder(parse("[1,0,2]"), 3, mid), "cannot be moved");
        no("manipulate_list: short", AnswerRule.reorder(parse("[0,1]"), 3, mid), "all 3 cards");
        no("manipulate_list: a duplicate", AnswerRule.reorder(parse("[0,1,1]"), 3, mid), "more than once");

        // assign_amount: VAssignGenericAmount.
        final AnswerRule.Amounts divided = AnswerRule.Amounts.of(2, true,
                new Integer[] { Integer.valueOf(2), Integer.valueOf(2) }, new String[] { "Bear", "Elf" });
        ok("divided 2 as 1+1", divided.refusal(AnswerRule.intMapOf(parse("{\"0\":1,\"1\":1}"))));
        no("divided 2 as 5+5 -- the engine would deal 10",
                divided.refusal(AnswerRule.intMapOf(parse("{\"0\":5,\"1\":5}"))), "at most 2");
        no("divided 2 as 2+0 with atLeastOne",
                divided.refusal(AnswerRule.intMapOf(parse("{\"0\":2}"))), "at least 1");
        no("divided 2 as 1, short", AnswerRule.Amounts.of(2, false, new Integer[] { null, null }, null)
                .refusal(AnswerRule.intMapOf(parse("{\"0\":1}"))), "exactly 2");
        no("an amount to a target not offered", divided.refusal(AnswerRule.intMapOf(parse("{\"0\":1,\"7\":1}"))),
                "not one of the choices");
        no("a negative amount", divided.refusal(AnswerRule.intMapOf(parse("{\"0\":3,\"1\":-1}"))), "negative");
        no("a non-map amount answer", divided.refusal(AnswerRule.intMapOf(parse("[1,1]"))), "could not be read");
        no("a fractional amount", divided.refusal(AnswerRule.intMapOf(parse("{\"0\":1.5,\"1\":0.5}"))),
                "could not be read");
        final AnswerRule.Amounts mana = AnswerRule.Amounts.of(3, false,
                new Integer[] { Integer.valueOf(1), Integer.valueOf(1), Integer.valueOf(1) }, null);
        no("mana of different colours: 2 of one", mana.refusal(AnswerRule.intMapOf(parse("{\"0\":2,\"1\":1}"))),
                "at most 1");
        eq("the null default with atLeastOne: 1 each, then in order", "{0=1, 1=1}", String.valueOf(divided.fill()));
        eq("the null default for 3 over caps 1,1,1", "{0=1, 1=1, 2=1}", String.valueOf(mana.fill()));
        eq("the null default for 5 over caps none,none", "{0=5, 1=0}",
                String.valueOf(AnswerRule.Amounts.of(5, false, new Integer[] { null, null }, null).fill()));
        ok("every fill is legal (divided)", divided.refusal(divided.fill()));
        ok("every fill is legal (mana)", mana.refusal(mana.fill()));
        final AnswerRule.Amounts stuck = AnswerRule.Amounts.of(3, true, new Integer[] { Integer.valueOf(1) }, null);
        expect("an infeasible rule says so", !stuck.feasible());
        ok("an infeasible rule takes what the caps allow", stuck.refusal(AnswerRule.intMapOf(parse("{\"0\":1}"))));
    }

    /**
     * The automated seat answers every kind with something the rule accepts --
     * else M68's re-ask would loop it to the ask ceiling and a concede.
     */
    private static void autoAnswersAreLegal() {
        final Map<String, Integer> seen = new java.util.HashMap<>();
        final String amount = "{\"kind\":\"assign_amount\",\"total\":3,\"atLeastOne\":true,\"targets\":["
                + "{\"id\":0,\"min\":1,\"max\":3},{\"id\":1,\"min\":1,\"max\":3}]}";
        final AnswerRule.Amounts rule = AnswerRule.Amounts.of(3, true, new Integer[] { Integer.valueOf(3), Integer.valueOf(3) }, null);
        ok("AutoTransport's assign_amount (atLeastOne over two targets)",
                rule.refusal(AnswerRule.intMapOf(parse(answer("assign_amount", amount, false, seen)))));
        final String capped = "{\"kind\":\"assign_amount\",\"total\":3,\"atLeastOne\":false,\"targets\":["
                + "{\"id\":0,\"min\":0,\"max\":1},{\"id\":1,\"min\":0,\"max\":1},{\"id\":2,\"min\":0,\"max\":1}]}";
        final AnswerRule.Amounts capRule = AnswerRule.Amounts.of(3, false,
                new Integer[] { Integer.valueOf(1), Integer.valueOf(1), Integer.valueOf(1) }, null);
        ok("AutoTransport's assign_amount (three caps of 1)",
                capRule.refusal(AnswerRule.intMapOf(parse(answer("assign_amount", capped, false, seen)))));
        final String order = "{\"kind\":\"order\",\"dest\":[],\"source\":[{\"id\":0},{\"id\":1},{\"id\":2}],"
                + "\"min\":0,\"max\":0}";
        ok("AutoTransport's order (all must move)", AnswerRule.order(parse(answer("order", order, false, seen)), 3, 0, 0));
        final String many = "{\"kind\":\"order\",\"dest\":[],\"source\":[{\"id\":0},{\"id\":1},{\"id\":2},{\"id\":3}],"
                + "\"min\":2,\"max\":3}";
        ok("AutoTransport's order (many: 1..2 of 4)", AnswerRule.order(parse(answer("order", many, false, seen)), 4, 2, 3));
        final String side = "{\"kind\":\"sideboard\",\"main\":[{\"id\":0},{\"id\":1}],\"side\":[{\"id\":2}]}";
        ok("AutoTransport's sideboard (probe swap)",
                AnswerRule.sideboard(parse(answer("sideboard", side, true, seen)), 2, 1, Integer.valueOf(2), Integer.valueOf(15)));
        final String list = "{\"kind\":\"choose_list\",\"min\":2,\"max\":2,\"options\":[{\"id\":0},{\"id\":1},{\"id\":2}]}";
        ok("AutoTransport's choose_list (exactly 2)", AnswerRule.picks(parse(answer("choose_list", list, false, seen)), 3, 2, 2));
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> castBody(final String bodyJson) {
        return (Map<String, Object>) parse(bodyJson);
    }

    @SuppressWarnings("unchecked")
    private static String answer(final String kind, final String bodyJson, final boolean probe,
                                 final Map<String, Integer> seen) {
        return AutoTransport.answerFor(kind, (Map<String, Object>) parse(bodyJson), probe, seen);
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
