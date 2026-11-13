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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import mtgtable.Json;
import mtgtable.grade.GradeMath;

/**
 * The decision record's engine-free half (D347): the token grammar (the coach
 * bench's, which {@code tools/check-redaction.mjs} holds too), the attack and
 * block spellings agreeing with the grader's, the JSON body's keys and values,
 * and a token that could carry a card name refused before it is written; and
 * play exploration's engine-free half (D358, {@link ExploreMath}): the seeded
 * stream reproduces, the epsilon coin's rate and the uniform pick within their
 * binomial tolerance, the close-call rule, and the record's {@code explore}
 * mark.  No Forge class beyond Jetty's JSON parser.
 */
public final class DecisionSelfTest {

    private static int checks;
    private static int failures;

    private DecisionSelfTest() { }

    private static void check(final boolean ok, final String what) {
        checks++;
        if (!ok) {
            failures++;
            System.out.println("  FAIL " + what);
        }
    }

    public static void main(final String[] args) {
        for (final String t : List.of("pass", "keep", "mulligan", "yes", "no", "cast:41", "land:7", "activate:12",
                "activate:12#1", "target:5", "target:p1", "target:none", "option:9", "option:p0", "option:hidden", "attack:none",
                "attack:3,9,21", "block:none", "block:11>40,12>40")) {
            check(Decision.TOKEN.matcher(t).matches(), "token " + t);
        }
        for (final String t : List.of("cast:Lightning Bolt", "cast:p1", "land:p0", "target:", "attack:", "block:11",
                "pass ", "option:hidden:1", "activate:12#", "cast:41 (Shock)", "option:none", "target:nothing")) {
            check(!Decision.TOKEN.matcher(t).matches(), "not a token: " + t);
        }
        // the grader's spellings (D334) and the record's are one
        final List<int[]> pairs = new ArrayList<>();
        pairs.add(new int[] {33, 55});
        pairs.add(new int[] {12, 40});
        pairs.add(new int[] {11, 40});
        check(Decision.blockToken(pairs).equals(GradeMath.blockToken(pairs)), "block token = GradeMath's");
        check(Decision.attackToken(List.of(26, 21)).equals(GradeMath.attackToken(List.of(26, 21))), "attack token = GradeMath's");
        check(Decision.attackToken(List.of()).equals("attack:none"), "attack:none");

        final Decision d = new Decision("priority", 3, "MAIN1");
        d.options.addAll(List.of("pass", "land:7", "cast:41"));
        d.chosen = "cast:41";
        d.by = "search";
        final Decision.SearchStats s = new Decision.SearchStats();
        s.tokens.addAll(List.of("pass", "cast:41"));
        s.n.addAll(List.of(3, 3));
        s.meanLeaf.addAll(List.of(120.04, 160.66));
        s.win.addAll(List.of(0.57412345, Double.NaN));
        s.best = 1;
        s.rounds = 3;
        s.playouts = 6;
        s.ms = 1500;
        s.budgetMs = 1500;
        s.timedOut = true;
        s.overrode = true;
        d.search = s;
        final Map<?, ?> m = (Map<?, ?>) Json.parse(d.toJson(0, 4, 17, 12));
        check(Long.valueOf(0).equals(m.get("seat")) && Long.valueOf(4).equals(m.get("n")), "seat and n");
        check(Long.valueOf(17).equals(m.get("frame")) && Long.valueOf(12).equals(m.get("stateSeq")), "frame and stateSeq");
        check("cast:41".equals(m.get("chosen")) && "search".equals(m.get("by")), "chosen and by");
        check(((Object[]) m.get("options")).length == 3, "options");
        check(!m.containsKey("complete") && !m.containsKey("hidden") && !m.containsKey("atoms"), "defaults left out");
        final Map<?, ?> sm = (Map<?, ?>) m.get("search");
        final Object[] so = (Object[]) sm.get("options");
        check(so.length == 2 && Double.valueOf(0.5741).equals(((Map<?, ?>) so[0]).get("win")), "win rounded to 4 places");
        check(((Map<?, ?>) so[1]).get("win") == null, "NaN written as null");
        check(Boolean.TRUE.equals(sm.get("timedOut")) && Boolean.TRUE.equals(sm.get("overrode")) && sm.get("fallback") == null,
                "search flags");
        check(!((Map<?, ?>) so[0]).containsKey("prior") && !sm.containsKey("generated"), "no ranking: no prior keys (M55 unchanged)");
        s.prior.addAll(List.of(Double.NaN, 412.345));
        s.generated = 9;
        final Map<?, ?> sp = (Map<?, ?>) ((Map<?, ?>) Json.parse(d.toJson(0, 5, 17, 12))).get("search");
        final Object[] po = (Object[]) sp.get("options");
        check(!((Map<?, ?>) po[0]).containsKey("prior") && Double.valueOf(412.3).equals(((Map<?, ?>) po[1]).get("prior"))
                && Long.valueOf(9).equals(sp.get("generated")), "M58: prior per scored option, generated (D389)");

        final Decision mull = new Decision("mulligan", 0, "NONE");
        mull.options.addAll(List.of("keep", "mulligan"));
        mull.chosen = "keep";
        final Map<?, ?> mm = (Map<?, ?>) Json.parse(mull.toJson(1, 0, -1, -1));
        check(mm.containsKey("frame") && mm.get("frame") == null, "no state frame yet: frame null");

        final Decision forced = new Decision("priority", 2, "UPKEEP");
        forced.options.add("pass");
        forced.chosen = "pass";
        check(forced.forced(), "one option is forced");
        forced.hidden = 1;
        check(!forced.forced(), "a hidden option is still a choice");

        final Decision named = new Decision("choice", 2, "MAIN1");
        named.options.add("option:Lightning Bolt");
        named.chosen = "option:Lightning Bolt";
        boolean threw = false;
        try {
            named.toJson(0, 0, 1, 1);
        } catch (final IllegalArgumentException e) {
            threw = true;
        }
        check(threw, "a token carrying a name is refused before it is written");
        boolean badKind = false;
        try {
            new Decision("peek", 1, "MAIN1");
        } catch (final IllegalArgumentException e) {
            badKind = true;
        }
        check(badKind, "an unknown kind is refused");

        // D507: the worker log's ghost line, which the night counts by its "[ghost]" prefix; an id, never a name
        check(Decisions.ghostLine(49).equals(
                "[ghost] card 49 in the stack zone with no stack instance left out of a target record (D507)"),
                "D507: the ghost line");
        targetNone();
        searchWeek3();
        mullAndTargets();
        evalLeafOnly();
        budgetAndRoundsOnly();
        knobAndCurveArms();
        horizonArms();
        liveSeatNoBlock();
        searchCandidates();
        wideWindows();
        rolloutRandom();
        rolloutRandomV3();
        rolloutRandomV4();
        rolloutRandomV4Them();
        rolloutMix4Them();
        explore();
        randomSeat();
        leakVerdict();
        labelProbe();

        System.out.println("decision selftest: " + checks + " check(s), " + failures + " failure(s)");
        if (failures > 0) {
            System.exit(1);
        }
    }

    /**
     * D529: the atlas's no-leak verdict on strings ({@link LeakVerdict}, no
     * engine).  A branch whose base and redeal replays both flip between the
     * same two outcomes is non-determinism, a warning; a redeal whose outcomes
     * share nothing with a base that reproduced is a leak, and with a base that
     * varies is unresolved; a fork digest that moved is a leak even when no
     * outcome did, and a side whose digests disagree among themselves is the
     * copier not reproducing (fork unstable), never a leak; J203's own shape
     * (the first pair differs, the retest overlaps) is not a leak; and the
     * retest's wall budget, on a fake clock, stops it early as incomplete.
     */
    private static void leakVerdict() {
        // both sides non-deterministic over the same two outcomes: a warning, never a leak
        final LeakVerdict.Result nd = LeakVerdict.classify(samples("F", "X", "X", "Y", "X", "X"), samples("F", "Y", "X", "X", "X", "Y"));
        check(nd.kind == LeakVerdict.Kind.NONDETERMINISTIC && nd.leakSame() && nd.moved && nd.forkSame,
                "D529: base and redeal both flipping over X and Y is non-determinism, not a leak (" + nd.kind + ")");
        check(nd.baseReplays == 5 && nd.redealReplays == 5 && nd.baseDistinct == 2 && nd.redealDistinct == 2 && nd.shared == 2,
                "D529: what was seen: 5 and 5 replays, 2 and 2 distinct, 2 shared");
        // J203's run 4 shape: the first base on the rare outcome, the rest on the common one
        final LeakVerdict.Result j203 = LeakVerdict.classify(samples("F", "Y", "X", "X", "X", "X"), samples("F", "X", "X", "X", "X", "X"));
        check(j203.kind == LeakVerdict.Kind.NONDETERMINISTIC, "D529: J203's shape is non-determinism (" + j203.kind + ")");
        // a redeal systematically different from a base that reproduced: a leak
        final LeakVerdict.Result leak = LeakVerdict.classify(samples("F", "X", "X", "X", "X", "X"), samples("F", "Y", "Y", "Y", "Y", "Y"));
        check(leak.kind == LeakVerdict.Kind.LEAK && !leak.leakSame() && leak.shared == 0, "D529: a redeal that always moves is a leak (" + leak.kind + ")");
        // ... and one whose redeal varies, as long as the base reproduced and the two never meet
        final LeakVerdict.Result leak2 = LeakVerdict.classify(samples("F", "X", "X", "X", "X", "X"), samples("F", "Y", "Z", "Y", "Y", "Z"));
        check(leak2.kind == LeakVerdict.Kind.LEAK, "D529: disjoint sets with the base reproduced are a leak (" + leak2.kind + ")");
        // disjoint sets with a base that varies (many outcomes, timeouts): unresolved, never a leak
        final LeakVerdict.Result unres = LeakVerdict.classify(samples("F", "A", "B", "C", "D", "E"), samples("F", "V", "W", "X", "Y", "Z"));
        check(unres.kind == LeakVerdict.Kind.UNRESOLVED && unres.leakSame(), "D529: disjoint sets with a varying base are unresolved (" + unres.kind + ")");
        // the fork digest moved, the outcome did not: a leak, on the first pair alone
        final LeakVerdict.Result fork = LeakVerdict.classify(samples("F", "X"), samples("G", "X"));
        check(fork.kind == LeakVerdict.Kind.LEAK && !fork.forkSame && !fork.moved, "D529: a fork digest that moved is a leak with no outcome moving (" + fork.kind + ")");
        check(!LeakVerdict.needsRetest(new LeakVerdict.Sample("X", "F"), new LeakVerdict.Sample("Y", "G")), "D529: a moved digest needs no retest");
        // a base whose digests disagree among themselves: the copier, never a leak
        final List<LeakVerdict.Sample> unstableBase = new ArrayList<>(samples("F", "X", "X", "X", "X", "X"));
        unstableBase.set(2, new LeakVerdict.Sample("X", "G"));
        final LeakVerdict.Result drift = LeakVerdict.classify(unstableBase, samples("F", "Y", "X", "X", "X", "Y"));
        check(drift.kind == LeakVerdict.Kind.FORK_UNSTABLE && drift.leakSame() && !drift.forkSame, "D529: base digests that disagree are fork-unstable (" + drift.kind + ")");
        // nothing moved: the same, with or without a (forced) retest
        final LeakVerdict.Result same = LeakVerdict.classify(samples("F", "X"), samples("F", "X"));
        check(same.kind == LeakVerdict.Kind.SAME && same.leakSame() && !same.moved && same.forkSame, "D529: nothing moved is the same (" + same.kind + ")");
        final LeakVerdict.Result same5 = LeakVerdict.classify(samples("F", "X", "X", "X", "X", "X"), samples("F", "X", "X", "X", "X", "X"));
        check(same5.kind == LeakVerdict.Kind.SAME && same5.baseDistinct == 1 && same5.redealDistinct == 1, "D529: a forced retest where nothing moved is the same (" + same5.kind + ")");
        check(!LeakVerdict.needsRetest(new LeakVerdict.Sample("X", "F"), new LeakVerdict.Sample("X", "F"))
                && LeakVerdict.needsRetest(new LeakVerdict.Sample("X", "F"), new LeakVerdict.Sample("Y", "F")), "D529: a retest only when the first pair moved");
        // the first pair moved and no retest was played: D451's rule, a leak
        final LeakVerdict.Result bare = LeakVerdict.classify(samples("F", "X"), samples("F", "Y"));
        check(bare.kind == LeakVerdict.Kind.LEAK, "D529: a move with no retest stays a leak (" + bare.kind + ")");
        boolean threw = false;
        try {
            LeakVerdict.classify(samples("F", "X"), List.of());
        } catch (final IllegalArgumentException e) {
            threw = true;
        }
        check(threw, "D529: a side with no replay is refused");
        check(LeakVerdict.Kind.FORK_UNSTABLE.wire.equals("forkUnstable") && LeakVerdict.Kind.NONDETERMINISTIC.wire.equals("nondeterministic"),
                "D529: the row's verdict spellings");
        // the retest on a fake clock: every replay takes 100 ms; within the budget it plays all four pairs
        final long[] now = {0};
        final int[] played = {0};
        final LeakVerdict.Side b = () -> { now[0] += 100; played[0]++; return new LeakVerdict.Sample("X", "F"); };
        final LeakVerdict.Side r = () -> { now[0] += 100; played[0]++; return new LeakVerdict.Sample(played[0] % 4 == 0 ? "Y" : "X", "F"); };
        try {
            final LeakVerdict.Result full = LeakVerdict.retest(new LeakVerdict.Sample("X", "F"), new LeakVerdict.Sample("Y", "F"), b, r,
                    10_000, 100, () -> now[0]);
            check(full.kind == LeakVerdict.Kind.NONDETERMINISTIC && full.baseReplays == 5 && full.redealReplays == 5 && played[0] == 8,
                    "D529: a retest inside its budget plays four pairs and reads all ten replays (" + full.kind + ", " + played[0] + ")");
            // a budget of 550 ms at 100 ms a replay: a pair starts only while spent + 200 <= 550 (0, 200), so two pairs, then incomplete
            now[0] = 0;
            played[0] = 0;
            final LeakVerdict.Result cut = LeakVerdict.retest(new LeakVerdict.Sample("X", "F"), new LeakVerdict.Sample("Y", "F"), b, r,
                    550, 100, () -> now[0]);
            check(cut.kind == LeakVerdict.Kind.INCOMPLETE && cut.baseReplays == 3 && cut.redealReplays == 3 && played[0] == 4 && now[0] <= 550,
                    "D529: a retest out of its budget stops before a pair it cannot finish, incomplete (" + cut.kind + ", " + played[0]
                    + " replays, " + now[0] + " ms)");
            // a budget below one pair: no retest replay at all, incomplete
            now[0] = 0;
            played[0] = 0;
            final LeakVerdict.Result none = LeakVerdict.retest(new LeakVerdict.Sample("X", "F"), new LeakVerdict.Sample("Y", "F"), b, r,
                    150, 100, () -> now[0]);
            check(none.kind == LeakVerdict.Kind.INCOMPLETE && played[0] == 0 && none.baseReplays == 1, "D529: no time for a pair is incomplete (" + none.kind + ")");
        } catch (final java.io.IOException e) {
            check(false, "D529: the fake retest threw " + e);
        }
        check(LeakVerdict.RETEST_BUDGET_MS == 600_000L && LeakVerdict.RETESTS == 4, "D529: the retest's constants");
    }

    /**
     * D538: the label probe's engine-free half ({@link LabelProbe}).  The two faults that would make an agreement
     * score wrong without a word: a replay whose listing is not the baseline's taken as the same position
     * ({@link LabelProbe#listingDiff} must see a changed, reordered, missing or extra option, and only those), and a
     * pick mapped to the wrong option ({@link LabelProbe#optionOf}: by token -- a pass is the listing's pass, not
     * option 0; an attack and a block by their canonical token, whatever order the pick declared them in -- and,
     * where two options share a token (D483), by identity, never by a guess).  Then the seat's seed per repeat
     * ({@link LabelProbe#seatWithSeed}, {@link LabelProbe#repeatSeed}) and the answer's JSON.
     */
    private static void labelProbe() {
        final List<String> base = List.of("cast:11", "pass", "cast:40", "activate:7#1");
        check(LabelProbe.listingDiff(base, new ArrayList<>(base)) == null, "D538: the same listing is no mismatch");
        check(LabelProbe.listingDiff(List.of(), List.of()) == null, "D538: two empty listings are no mismatch");
        final String changed = LabelProbe.listingDiff(base, List.of("cast:11", "pass", "cast:41", "activate:7#1"));
        check(changed != null && changed.startsWith("option 2:"), "D538: one changed token is a mismatch at its option (" + changed + ")");
        check(LabelProbe.listingDiff(base, List.of("pass", "cast:11", "cast:40", "activate:7#1")) != null,
                "D538: the same options in another order are a mismatch (option indices would move)");
        final String extra = LabelProbe.listingDiff(base, List.of("cast:11", "pass", "cast:40", "activate:7#1", "cast:3"));
        check(extra != null && extra.contains("4 options, the replay 5"), "D538: an extra option is a mismatch (" + extra + ")");
        check(LabelProbe.listingDiff(base, List.of("cast:11", "pass", "cast:40")) != null, "D538: a missing option is a mismatch");
        check(LabelProbe.listingDiff(List.of("attack:none", "attack:4"), List.of("block:none", "block:4>9")) != null,
                "D538: another kind of decision at d is a mismatch");

        final List<String> ids = List.of("Grizzly Bears|spell|Original|-|-|-|-|", "pass", "Shock|spell|Original|-|-|-|-|",
            "Prodigal Sorcerer|ability|Original|-|-|-|-|");
        check(LabelProbe.optionOf("cast:40", ids.get(2), base, ids) == 2, "D538: a pick is its token's option");
        check(LabelProbe.optionOf("pass", "pass", base, ids) == 1, "D538: a pass is the listing's pass, not option 0");
        check(LabelProbe.optionOf("cast:11", ids.get(0), base, ids) == 0, "D538: Forge's own play is option 0");
        check(LabelProbe.optionOf("cast:99", "Ornithopter|spell|Original|-|-|-|-|", base, ids) == LabelProbe.NO_OPTION,
                "D538: a play the atlas did not list is off-atlas");
        check(LabelProbe.optionOf("activate:7", ids.get(3), base, ids) == LabelProbe.NO_OPTION,
                "D538: activate:7 is not activate:7#1 (a card's other ability is another option)");
        final List<String> atk = List.of(Decision.attackToken(List.of()), Decision.attackToken(List.of(21, 26)),
            Decision.attackToken(List.of(26)));
        check(LabelProbe.optionOf(Decision.attackToken(List.of(26, 21)), "x", atk, atk) == 1,
                "D538: an attack declared in another order is the same option");
        final List<int[]> pairs = new ArrayList<>();
        pairs.add(new int[] {12, 40});
        pairs.add(new int[] {11, 40});
        final List<int[]> swapped = new ArrayList<>();
        swapped.add(new int[] {11, 40});
        swapped.add(new int[] {12, 40});
        final List<String> blk = List.of(Decision.blockToken(List.of()), Decision.blockToken(pairs));
        check(LabelProbe.optionOf(Decision.blockToken(swapped), "x", blk, blk) == 1, "D538: blocks declared in another order are the same option");
        check(LabelProbe.optionOf("block:none", "block:none", blk, blk) == 0, "D538: no block is block:none");
        // D483: an Adventure card's creature and its adventure share cast:<id>; the identity tells them apart
        final List<String> adv = List.of("pass", "cast:5", "cast:5");
        final List<String> advIds = List.of("pass", "Bonecrusher Giant|spell|Original|-|-|-|-|", "Stomp|spell|Adventure|-|-|-|-|");
        check(LabelProbe.optionOf("cast:5", advIds.get(2), adv, advIds) == 2, "D538: a shared token is told apart by identity (the adventure)");
        check(LabelProbe.optionOf("cast:5", advIds.get(1), adv, advIds) == 1, "D538: ... and the creature");
        check(LabelProbe.optionOf("cast:5", "Bonecrusher Giant|spell|Original|-|-|-|-|kicked", adv, advIds) == LabelProbe.TWO_OPTIONS,
                "D538: a shared token whose identity is neither option's is ambiguous, never the first");
        check(LabelProbe.optionOf("cast:5", advIds.get(1), adv, List.of("pass", advIds.get(1), advIds.get(1))) == LabelProbe.TWO_OPTIONS,
                "D538: two options of one token and one identity are ambiguous");
        check(LabelProbe.optionOf("cast:5", advIds.get(1), adv, null) == LabelProbe.TWO_OPTIONS,
                "D538: a shared token with no identities is ambiguous");

        final String seat = "Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=p,seed=0,anytime=1";
        final String seeded = LabelProbe.seatWithSeed(seat, 77);
        check(seeded.startsWith(seat) && SearchConfig.parse(seeded.substring(seeded.indexOf("+search:") + 8)).seed == 77
                && SearchConfig.parse(seeded.substring(seeded.indexOf("+search:") + 8)).priority
                && !SearchConfig.parse(seeded.substring(seeded.indexOf("+search:") + 8)).attacks,
                "D538: the repeat's seed is the search's, the rest of its config unchanged (" + seeded + ")");
        check(LabelProbe.seatWithSeed("Default+outlets", 77).equals("Default+outlets"), "D538: a seat with no search keeps its config");
        check(LabelProbe.seatWithSeed("Default+search", 77).equals("Default+search:seed=77"), "D538: a bare +search gets the seed");
        boolean zero = false;
        try {
            LabelProbe.seatWithSeed(seat, 0);
        } catch (final IllegalArgumentException e) {
            zero = true;
        }
        check(zero, "D538: a probe seed of 0 (the clock's) is refused");
        boolean notLast = false;
        try {
            LabelProbe.seatWithSeed("Default+search:ms=1500+outlets", 77);
        } catch (final IllegalArgumentException e) {
            notLast = true;
        }
        check(notLast, "D538: a +search part that is not the seat's last is refused, not seeded in the wrong place");
        final java.util.Set<Long> seeds = new java.util.HashSet<>();
        boolean positive = true;
        for (int i = 0; i < 50; i++) {
            for (int r = 0; r < 3; r++) {
                final long x = LabelProbe.repeatSeed(1, "J186/s01/d" + i, r);
                positive &= x > 0;
                seeds.add(x);
            }
        }
        check(seeds.size() == 150 && positive, "D538: every (key, repeat) its own positive seed (" + seeds.size() + " of 150)");
        check(LabelProbe.repeatSeed(1, "J186/s01/d9", 2) == LabelProbe.repeatSeed(1, "J186/s01/d9", 2)
                && LabelProbe.repeatSeed(1, "J186/s01/d9", 2) != LabelProbe.repeatSeed(2, "J186/s01/d9", 2),
                "D538: the seed is the run's seed's, the key's and the repeat's, and only theirs");
        // tools/atlas/agreement.py ports repeatSeed to refuse rows made under another --seed; these two numbers are
        // the port's, and test_agreement.py holds it to the same two
        check(LabelProbe.repeatSeed(538, "J186/s01/d9", 0) == 100225255197839L
                && LabelProbe.repeatSeed(538, "J186/s01/d9", 1) == 134260492138398L,
                "D538: agreement.py's port of the seed gives the same numbers ("
                        + LabelProbe.repeatSeed(538, "J186/s01/d9", 0) + ", "
                        + LabelProbe.repeatSeed(538, "J186/s01/d9", 1) + ")");

        final LabelProbe.Answer a = new LabelProbe.Answer();
        a.d = 9;
        a.kind = "a";
        a.k = 3;
        a.option = 1;
        a.token = "attack:21,26";
        a.status = LabelProbe.OK;
        a.searched = true;
        a.counts.put("search.a.considered", 1);
        final Json.JsonOut j = new Json.JsonOut();
        a.write(j);
        final Map<?, ?> m = (Map<?, ?>) Json.parse(j.done());
        check(Long.valueOf(1).equals(m.get("option")) && "ok".equals(m.get("status")) && "attack:21,26".equals(m.get("token"))
                && Boolean.TRUE.equals(m.get("searched")) && m.get("fallback") == null
                && Long.valueOf(1).equals(((Map<?, ?>) m.get("counts")).get("search.a.considered")),
                "D538: the answer's JSON (option, status, token, searched, counts)");
        check(new LabelProbe.Answer().option == LabelProbe.NO_OPTION && LabelProbe.ERROR.equals(new LabelProbe.Answer().status),
                "D538: an answer never filled in is an error with no option");
    }

    /** D529: one replay a signature, every one with the fork digest {@code digest}. */
    private static List<LeakVerdict.Sample> samples(final String digest, final String... sigs) {
        final List<LeakVerdict.Sample> out = new ArrayList<>();
        for (final String s : sigs) {
            out.add(new LeakVerdict.Sample(s, digest));
        }
        return out;
    }

    /**
     * D487 (M76): a targeting part left empty answers {@code target:none}, never
     * null.  Minimum 0: listed first, {@code min: 0}, the record complete; Tear
     * Asunder's other half (maximum 0, no candidate) is the one-option record,
     * counted and not written.  Minimum 1 left empty: listed, {@code min: 1},
     * incomplete, {@code NO_TARGET}.  A target the seat cannot see is
     * {@code option:hidden}, listed and chosen (D510; before it, a null answer
     * that the checker failed, J186).  J171's shape -- {@code chosen: null}
     * beside card candidates -- is what the old builder wrote for the first case.
     */
    private static void targetNone() {
        final java.util.function.Function<Object[], Decision> part = (a) -> {
            final Decision d = new Decision("target", 17, "DRAW");
            @SuppressWarnings("unchecked")
            final List<String> cands = (List<String>) a[0];
            @SuppressWarnings("unchecked")
            final List<String> chosen = (List<String>) a[1];
            final java.util.Set<String> opts = new java.util.LinkedHashSet<>(cands);
            for (final String c : chosen) {
                if (opts.add(c)) {
                    d.complete = false;
                }
            }
            d.hidden = a.length > 4 ? (Integer) a[4] : 0;   // D510: the candidates targets0 counted and could not name
            final int outside = a.length > 5 ? (Integer) a[5] : 0;   // D510: unseen answers outside those candidates
            Decisions.targetAnswer(d, opts, chosen, (Integer) a[2], outside, (Integer) a[3]);
            return d;
        };
        // "up to one target creature" (The Wandering Emperor's +1), Forge chose none
        final Decision upTo = part.apply(new Object[] {List.of("target:67", "target:5"), List.of(), 0, 0});
        final Map<?, ?> u = (Map<?, ?>) Json.parse(upTo.toJson(1, 20, 141, 123));
        check("target:none".equals(u.get("chosen")) && java.util.Arrays.equals((Object[]) u.get("options"),
                new Object[] {"target:none", "target:5", "target:67"}) && Long.valueOf(0).equals(u.get("min"))
                && !u.containsKey("complete") && !u.containsKey("why") && !upTo.forced(),
                "min 0, left empty: target:none listed first and chosen, min 0, complete (D487)");
        // the same part with a target chosen: none still listed (it was an answer), the target chosen
        final Decision took = part.apply(new Object[] {List.of("target:67", "target:5"), List.of("target:5"), 0, 0});
        check("target:5".equals(took.chosen) && took.options.get(0).equals("target:none") && took.min == 0
                && took.complete, "min 0, a target taken: none listed, the target chosen");
        // Tear Asunder kicked: the artifact-or-enchantment half has X = 0 -- no candidate, one answer, not written
        final Decision zero = part.apply(new Object[] {List.of(), List.of(), 0, 0});
        check(zero.forced() && zero.options.equals(List.of("target:none")) && "target:none".equals(zero.chosen),
                "max 0: [target:none] alone, a one-option record (counted, not written)");
        // a mandatory part left empty: listed, incomplete, NO_TARGET, min 1
        final Decision must = part.apply(new Object[] {List.of("target:5"), List.of(), 0, 1});
        final Map<?, ?> mu = (Map<?, ?>) Json.parse(must.toJson(1, 21, 141, 123));
        check("target:none".equals(mu.get("chosen")) && Long.valueOf(1).equals(mu.get("min"))
                && Boolean.FALSE.equals(mu.get("complete")) && "NO_TARGET".equals(mu.get("why")) && !must.forced(),
                "min 1, left empty: target:none listed and chosen, min 1, complete false, why NO_TARGET");
        // a mandatory part with its target: no none, no min
        final Decision plain = part.apply(new Object[] {List.of("target:5", "target:67"), List.of("target:67"), 0, 1});
        final Map<?, ?> pm = (Map<?, ?>) Json.parse(plain.toJson(1, 22, 141, 123));
        check("target:67".equals(pm.get("chosen")) && !pm.containsKey("min") && !plain.options.contains("target:none"),
                "min 1, a target taken: as before D487 (no none, no min)");
        // an answer the seat cannot see is not "none" -- and, D510, not null: option:hidden, listed and chosen
        final Decision unseen = part.apply(new Object[] {List.of("target:5", "target:67"), List.of(), 1, 1, 1});
        final Map<?, ?> un = (Map<?, ?>) Json.parse(unseen.toJson(1, 23, 141, 123));
        check("option:hidden".equals(un.get("chosen")) && java.util.Arrays.equals((Object[]) un.get("options"),
                        new Object[] {"target:5", "target:67", "option:hidden"}) && Long.valueOf(1).equals(un.get("hidden"))
                        && Boolean.FALSE.equals(un.get("complete")) && !un.containsKey("min") && !un.containsKey("why"),
                "a target the seat cannot see (min 1): option:hidden listed last and chosen, hidden 1, complete:false (D510)");
        final Decision unseen0 = part.apply(new Object[] {List.of("target:5"), List.of(), 1, 0, 1});
        final Map<?, ?> u0 = (Map<?, ?>) Json.parse(unseen0.toJson(1, 24, 141, 123));
        check("option:hidden".equals(u0.get("chosen")) && java.util.Arrays.equals((Object[]) u0.get("options"),
                        new Object[] {"target:none", "target:5", "option:hidden"}) && Boolean.FALSE.equals(u0.get("complete"))
                        && Long.valueOf(0).equals(u0.get("min")),
                "a target the seat cannot see (min 0): none first, option:hidden last and chosen, complete:false, min 0 (D510)");
        // D510, J186's record (b-s11 d13-random-o1-b149, n 65): the part's one candidate a card the seat cannot see
        // (a ghost in the stack zone, D507), Forge's answer that card -- before D510, options [] and chosen null
        final Decision ghost = part.apply(new Object[] {List.of(), List.of(), 1, 1, 1});
        final Map<?, ?> gh = (Map<?, ?>) Json.parse(ghost.toJson(0, 65, 301, 238));
        check("option:hidden".equals(gh.get("chosen")) && java.util.Arrays.equals((Object[]) gh.get("options"),
                        new Object[] {"option:hidden"}) && Long.valueOf(1).equals(gh.get("hidden"))
                        && Boolean.FALSE.equals(gh.get("complete")) && !gh.containsKey("min") && !ghost.forced(),
                "D510: all candidates hidden, the one chosen unseen: options [option:hidden], chosen option:hidden, written");
        // all hidden, none chosen, minimum 0: the part was left empty -- target:none, with the hidden candidate listed
        final Decision ghost0 = part.apply(new Object[] {List.of(), List.of(), 0, 0, 1});
        final Map<?, ?> g0 = (Map<?, ?>) Json.parse(ghost0.toJson(0, 66, 301, 238));
        check("target:none".equals(g0.get("chosen")) && java.util.Arrays.equals((Object[]) g0.get("options"),
                        new Object[] {"target:none", "option:hidden"}) && Long.valueOf(1).equals(g0.get("hidden"))
                        && Long.valueOf(0).equals(g0.get("min")) && !g0.containsKey("complete") && !ghost0.forced(),
                "D510: all candidates hidden, none chosen, min 0: [target:none, option:hidden], target:none chosen, complete");
        // mixed: two visible candidates and one hidden, Forge's answer the hidden one
        final Decision mixed = part.apply(new Object[] {List.of("target:67", "target:p1"), List.of(), 1, 1, 1});
        final Map<?, ?> mx = (Map<?, ?>) Json.parse(mixed.toJson(0, 67, 301, 238));
        check("option:hidden".equals(mx.get("chosen")) && java.util.Arrays.equals((Object[]) mx.get("options"),
                        new Object[] {"target:p1", "target:67", "option:hidden"}) && Long.valueOf(1).equals(mx.get("hidden"))
                        && Boolean.FALSE.equals(mx.get("complete")),
                "D510: visible and hidden candidates, the hidden one chosen: listed last, chosen, complete:false");
        // mixed, two targets: one visible, one unseen -- both in the answer, the unseen one as option:hidden
        final Decision two = part.apply(new Object[] {List.of("target:67", "target:p1"), List.of("target:p1"), 1, 1, 1});
        check(two.chosen == null && two.chosenAll.equals(List.of("target:p1", "option:hidden"))
                        && two.options.equals(List.of("target:p1", "target:67", "option:hidden")) && !two.complete,
                "D510: a visible and an unseen target: chosen [target:p1, option:hidden]");
        // an unseen answer Forge's candidate list did not hold (a spell on the stack): counted, so listed
        final Decision stack = part.apply(new Object[] {List.of("target:67"), List.of(), 1, 1, 0, 1});
        check(stack.hidden == 1 && stack.options.equals(List.of("target:67", "option:hidden"))
                        && "option:hidden".equals(stack.chosen) && !stack.complete,
                "D510: an unseen answer outside the candidates is counted in hidden, so option:hidden is listed");
        // the count is exact (the review): a hidden candidate not chosen and an unseen stack spell chosen are two
        final Decision both = part.apply(new Object[] {List.of("target:67"), List.of(), 1, 1, 1, 1});
        check(both.hidden == 2 && both.options.equals(List.of("target:67", "option:hidden"))
                        && "option:hidden".equals(both.chosen) && !both.complete,
                "D510: one hidden candidate and one unseen answer outside the candidates: hidden 2, option:hidden once");
        // an unseen answer that IS the counted hidden candidate is not counted twice
        final Decision same = part.apply(new Object[] {List.of("target:67"), List.of(), 1, 1, 1, 0});
        check(same.hidden == 1 && "option:hidden".equals(same.chosen),
                "D510: an unseen answer among the hidden candidates adds nothing to hidden");
        // a hidden candidate not chosen: listed, and the record stays complete (D487 marks only an unseen ANSWER)
        final Decision passed = part.apply(new Object[] {List.of("target:67"), List.of("target:67"), 0, 1, 2});
        check("target:67".equals(passed.chosen) && passed.options.equals(List.of("target:67", "option:hidden"))
                        && passed.hidden == 2 && passed.complete,
                "D510: two hidden candidates, a visible one chosen: option:hidden listed once, hidden 2, complete");
    }

    /** D388–D390: the config switches, the NaN-aware statistics and the anytime schedule, on numbers. */
    private static void searchWeek3() {
        final SearchConfig def = SearchConfig.defaults();
        check("ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab".equals(def.toString())
                && !def.anytime && !def.rankPrior && "default".equals(def.rollout), "defaults print and behave as before");
        final SearchConfig on = SearchConfig.parse("anytime=1,rank=prior,gen=12,cands=8,rollout=outlets");
        check(on.anytime && on.rankPrior && on.generate == 12 && on.maxCandidates == 8 && on.rolloutOutletsUs()
                && !on.rolloutOutletsThem(), "the week-3 switches parse");
        check(SearchConfig.parse(on.toString()).toString().equals(on.toString()), "and round-trip: " + on);
        check(SearchConfig.parse("rank=prior").generate == 24 && SearchConfig.parse("rank=prior,cands=30").generate == 30,
                "gen defaults to max(24, cands)");
        check(SearchConfig.parse("rollout=both").rolloutOutletsThem(), "rollout=both");
        // Main's leaf switch (D354, leaf=eval:<model>) composes with them: withLeaf's copy keeps every week-3 field.
        final SearchConfig both = SearchConfig.parse("anytime=1,rank=prior,gen=12,cands=8,rollout=both,leaf=eval:m.json");
        check(both.anytime && both.rankPrior && both.generate == 12 && both.rolloutOutletsThem() && "m.json".equals(both.leafModel)
                && SearchConfig.parse(both.toString()).toString().equals(both.toString()), "leaf=eval keeps the week-3 switches: " + both);
        check(SearchConfig.parse("leaf=eval:m.json").toString().equals(def.toString() + ",leaf=eval:m.json")
                && !SearchConfig.parse("leaf=eval:m.json").anytime, "leaf=eval alone leaves them off");
        for (final String bad : List.of("rank=best", "rank=prior,gen=3", "prior=eval", "rollout=sometimes", "anytime=2")) {
            boolean threw = false;
            try {
                SearchConfig.parse(bad);
            } catch (final IllegalArgumentException e) {
                threw = true;
            }
            check(threw, "refused: " + bad);
        }
        // D412: the live seat ran search-v2 (search-v1 + anytime=1); D539: it is search-v3 (search-v2 + what=pa,
        // blocks left to Forge).  The bench's parse is unchanged by either.
        final SearchConfig live = SearchConfig.parseLive("");
        check("search-v3".equals(SearchConfig.LIVE_VERSION) && live.anytime
                && (def.toString().replace(",what=pab", ",what=pa") + ",anytime=1").equals(live.toString()),
                "the live seat's default is search-v3 (search-v1's text with what=pa, plus anytime=1): " + live);
        check(SearchConfig.parseLive(null).toString().equals(live.toString()), "no --ai-search text is the same seat");
        check(SearchConfig.parseLive("ms=3000").anytime && SearchConfig.parseLive("ms=3000").budgetMs == 3000,
                "a budget from the picker (--ai-search ms=N) keeps the anytime loop");
        check(!SearchConfig.parseLive("anytime=0,what=pab").anytime
                && SearchConfig.parseLive("anytime=0,what=pab").toString().equals(def.toString()),
                "anytime=0,what=pab is search-v1's loop again");
        check(!SearchConfig.parse("").anytime && !SearchConfig.parse("ms=1500").anytime,
                "the bench's parse keeps anytime off (search-v1 and every ladder player mean what they meant)");

        // fillStats: complete rounds give D350's numbers; NaN rounds are skipped per candidate.
        final List<double[]> full = List.of(new double[] {100, 140, 90}, new double[] {120, 150, 80},
                new double[] {110, 170, 100});
        final SearchPolicy.Report rf = new SearchPolicy.Report();
        SearchPolicy.Report.fillStats(rf, full, List.of(), 3);
        check(rf.n[1] == 3 && Math.abs(rf.meanLeaf[1] - 153.333) < 0.01 && Math.abs(rf.diffLeaf[1] - 43.333) < 0.01
                && Math.abs(rf.seDiff[1] - Math.sqrt((Math.pow(40 - 43.333, 2) + Math.pow(30 - 43.333, 2)
                + Math.pow(60 - 43.333, 2)) / 2 / 3)) < 0.01, "fillStats on complete rounds");
        final List<double[]> part = new ArrayList<>(full);
        part.add(new double[] {130, Double.NaN, 70});
        final SearchPolicy.Report rp = new SearchPolicy.Report();
        SearchPolicy.Report.fillStats(rp, part, List.of(), 3);
        check(rp.n[0] == 4 && rp.n[1] == 3 && rp.n[2] == 4 && Math.abs(rp.diffLeaf[1] - 43.333) < 0.01
                && Math.abs(rp.diffLeaf[2] - (-10 - 40 - 10 - 60) / 4.0) < 0.01, "fillStats skips NaN per candidate");

        // The anytime schedule.
        final boolean[] act = {true, true, true, true};
        final List<double[]> lv = new ArrayList<>();
        for (int r = 0; r < 4; r++) {
            lv.add(new double[] {100 + r, 160 + 3 * r, 40 - r, 101 + r});   // 1 clearly best, 2 clearly worst, 3 = Forge's
        }
        check(Anytime.order(act, lv, 2).equals(List.of(0, 1, 3, 2)), "later rounds: Forge's first, then best-first");
        check(Anytime.order(act, lv, 0).equals(List.of(0, 1, 2, 3)), "round 0: as generated (the prior's order)");
        final boolean[] raced = act.clone();
        check(Anytime.race(raced, lv) == 2 && !raced[2] && !raced[3] && raced[0] && raced[1],
                "racing retires what is clearly worse than the leader, never Forge's answer");
        final List<double[]> noisy = new ArrayList<>();
        for (int r = 0; r < 4; r++) {
            noisy.add(new double[] {100, r % 2 == 0 ? 160 : 60, r % 2 == 0 ? 50 : 150});   // close and noisy
        }
        check(Anytime.race(new boolean[] {true, true, true}, noisy) == 0, "a close, noisy pair is not raced out");
        check(Anytime.race(act.clone(), lv.subList(0, 2)) == 0, "no racing before " + Anytime.RACE_FROM + " rounds");
        final boolean[] pr = act.clone();
        check(Anytime.pruneTo(pr, lv, 2) == 2 && pr[0] && pr[1] && !pr[2] && !pr[3], "pruning keeps Forge's and the best");
        check(Anytime.best(act, lv, rpDiff(lv, 4), 2) == 1, "verdict candidate: the best paired difference");
        // Partial evidence: one round, candidate 1 never scored, 3 scored once.
        final List<double[]> one = List.of(new double[] {100, Double.NaN, 90, 130});
        check(Anytime.most(act, one) == 1 && Anytime.best(act, one, rpDiff(one, 4), 2) == 3,
                "one round is evidence: best-so-far, not a fallback");
        final List<double[]> none = List.of(new double[] {100, Double.NaN, Double.NaN, Double.NaN});
        check(Anytime.most(act, none) == 0 && Anytime.best(act, none, rpDiff(none, 4), 2) == 0,
                "no alternative scored: no evidence (the one fallback left)");
        // An alternative with more rounds outranks a lucky one-round candidate.
        final List<double[]> mixed = List.of(new double[] {100, 130, 300}, new double[] {100, 125, Double.NaN});
        check(Anytime.best(new boolean[] {true, true, true}, mixed, rpDiff(mixed, 3), 2) == 1,
                "the verdict prefers candidates with the rounds the config asks for");
    }

    /** D417: the mulligan and target switches parse, print, refuse, and leave search-v2 as it was. */
    private static void mullAndTargets() {
        final SearchConfig def = SearchConfig.defaults();
        final SearchConfig live = SearchConfig.parseLive("");
        check(!def.mull && !def.targets && !live.mull && !live.targets, "mull and targets are off by default, live seat included");
        check(SearchConfig.parse("anytime=1").toString().equals(def.toString() + ",anytime=1")
                && !live.toString().contains("mull") && !live.toString().contains("targets"),
                "search-v2's config string is unchanged, and the live seat's (search-v3, D539) names neither: " + live);
        check(def.mullMs == SearchConfig.MULL_MS && def.mullTurns == SearchConfig.MULL_TURNS && SearchConfig.MULL_MS == 6000
                && SearchConfig.MULL_TURNS == 3, "the mulligan's defaults: 6000 ms, 3 turns a seat (game turn 6)");
        final SearchConfig m = SearchConfig.parseLive("mull=1");
        check(m.mull && !m.targets && m.anytime && m.toString().equals(live.toString() + ",mull=1"),
                "the live seat + mull=1 prints as the live seat plus the switch: " + m);
        final SearchConfig t = SearchConfig.parse("anytime=1,targets=1");
        check(t.targets && !t.mull && t.toString().equals(SearchConfig.parse("anytime=1").toString() + ",targets=1"),
                "targets=1: search-v2 plus the switch: " + t);
        final SearchConfig mt = SearchConfig.parse("anytime=1,mull=1,targets=1,mullms=8000,mullturns=5");
        check(mt.mull && mt.targets && mt.mullMs == 8000 && mt.mullTurns == 5
                && SearchConfig.parse(mt.toString()).toString().equals(mt.toString()), "both, with knobs, round-trip: " + mt);
        check(SearchConfig.parse("mull=0,targets=0").toString().equals(def.toString()), "mull=0,targets=0 is the default");
        check(SearchConfig.parse("mullms=8000").toString().equals(def.toString()),
                "a mulligan knob with mull off prints nothing (it changes no decision)");
        final SearchConfig keepLeaf = SearchConfig.parse("anytime=1,mull=1,targets=1,leaf=eval:m.json");
        check(keepLeaf.mull && keepLeaf.targets && "m.json".equals(keepLeaf.leafModel)
                && SearchConfig.parse(keepLeaf.toString()).toString().equals(keepLeaf.toString()),
                "leaf=eval keeps the D417 switches and they keep the leaf: " + keepLeaf);
        for (final String bad : List.of("mull=2", "targets=yes", "mull=1,mullms=10", "mull=1,mullms=70000", "mullturns=0",
                "mullturns=9")) {
            boolean threw = false;
            try {
                SearchConfig.parse(bad);
            } catch (final IllegalArgumentException e) {
                threw = true;
            }
            check(threw, "refused: " + bad);
        }
    }

    /**
     * J128 (D437): search-v2 with the learned evaluator at its leaves is search-v2
     * with ONE field changed.  The ladder's {@code search-v2-evalleaf} is
     * {@code search-v1-anytime}'s config text plus {@code ,leaf=eval:<file>}; every
     * public field of the parsed config but {@code leafModel} equals search-v2's
     * (read by reflection, so a field added later is held too), the text is
     * search-v2's plus the one key, and the live seat's default leaf stays the
     * hand leaf.  The engine half (the leaf of the same end position is all that
     * changes, it reads nothing hidden, the budget holds) is ai-bench's.
     */
    private static void evalLeafOnly() {
        final String v2Text = "ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1";
        final String model = "var/ml/models/eval-dcdae3745b84.json";
        final SearchConfig v2 = SearchConfig.parse(v2Text);
        final SearchConfig ev = SearchConfig.parse(v2Text + ",leaf=eval:" + model);
        check(v2.leafModel == null && model.equals(ev.leafModel), "search-v2's leaf is the hand leaf; evalleaf's names the model");
        check(ev.toString().equals(v2.toString() + ",leaf=eval:" + model), "the text is search-v2's plus the one key: " + ev);
        check(SearchConfig.parse(ev.toString()).toString().equals(ev.toString()), "and round-trips");
        int compared = 0;
        final List<String> differ = new ArrayList<>();
        for (final java.lang.reflect.Field f : SearchConfig.class.getFields()) {
            if (java.lang.reflect.Modifier.isStatic(f.getModifiers())) {
                continue;
            }
            compared++;
            try {
                if (!java.util.Objects.equals(f.get(v2), f.get(ev))) {
                    differ.add(f.getName());
                }
            } catch (final IllegalAccessException e) {
                differ.add(f.getName() + "?");
            }
        }
        check(compared >= 25 && differ.equals(List.of("leafModel")),
                "of " + compared + " config fields only leafModel differs: " + differ);
        // The same holds wherever the key sits in the text, and leaf=hand is search-v2 itself.
        check(SearchConfig.parse("leaf=eval:" + model + "," + v2Text).toString().equals(ev.toString()), "key order does not matter");
        check(SearchConfig.parse(v2Text + ",leaf=hand").toString().equals(v2.toString()), "leaf=hand is search-v2");
        // The default stays the hand leaf: the live seat (search-v3 since D539) and parse's defaults name no model.
        check(SearchConfig.parseLive("").leafModel == null && SearchConfig.defaults().leafModel == null
                && !SearchConfig.LIVE_DEFAULTS.contains("leaf"), "the live seat's leaf stays hand");
    }

    /**
     * D514: the compute-curve arms {@code search-v2-ms3000-r24} and
     * {@code -ms6000-r48} are search-v2 with TWO fields changed, together: the
     * budget {@code budgetMs} and the round cap {@code maxRounds}, both scaled by
     * the same factor (12 rounds at 1500 ms), so that only how much the search
     * thinks changes.  Every other public field of the parsed config equals
     * search-v2's (by reflection, as {@link #evalLeafOnly} does): the 2 minimum
     * rounds, the mulligan's own {@code mullMs}, and any field added later.  The
     * live seat's budget and cap stay 1500 ms and 12.
     */
    private static void budgetAndRoundsOnly() {
        final String v2Text = "ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1";
        final SearchConfig v2 = SearchConfig.parse(v2Text);
        for (final int x : new int[] {2, 4}) {
            final int ms = 1500 * x;
            final int rounds = 12 * x;
            final String armText = v2Text.replace("ms=1500,", "ms=" + ms + ",").replace("maxrounds=12,", "maxrounds=" + rounds + ",");
            final SearchConfig arm = SearchConfig.parse(armText);
            check(arm.budgetMs == ms && arm.maxRounds == rounds && arm.anytime && arm.minRounds == 2 && arm.mullMs == v2.mullMs,
                    "x" + x + ": ms=" + ms + " and maxrounds=" + rounds + "; minRounds and mullms are search-v2's");
            check(arm.toString().equals(v2.toString().replace("ms=1500,", "ms=" + ms + ",").replace("maxrounds=12,", "maxrounds=" + rounds + ",")),
                    "the text is search-v2's with ms and maxrounds changed: " + arm);
            int compared = 0;
            final List<String> differ = new ArrayList<>();
            for (final java.lang.reflect.Field f : SearchConfig.class.getFields()) {
                if (java.lang.reflect.Modifier.isStatic(f.getModifiers())) {
                    continue;
                }
                compared++;
                try {
                    if (!java.util.Objects.equals(f.get(v2), f.get(arm))) {
                        differ.add(f.getName());
                    }
                } catch (final IllegalAccessException e) {
                    differ.add(f.getName() + "?");
                }
            }
            check(compared >= 25 && new java.util.TreeSet<>(differ).equals(new java.util.TreeSet<>(List.of("budgetMs", "maxRounds"))),
                    "x" + x + ": of " + compared + " config fields only budgetMs and maxRounds differ: " + differ);
        }
        final SearchConfig live = SearchConfig.parseLive("");
        check(live.budgetMs == 1500 && live.maxRounds == 12 && !SearchConfig.LIVE_DEFAULTS.contains("ms=")
                && !SearchConfig.LIVE_DEFAULTS.contains("maxrounds"), "the live seat stays 1500 ms and 12 rounds");
    }

    /**
     * D517: four more arms of search-v2, each differing from it in only the
     * fields its name says.  The two knob arms add one switch:
     * {@code search-v2-routlets} D390's {@code rollout=outlets} (the field
     * {@code rollout}), {@code search-v2-ranked} D389's {@code rank=prior,gen=24}
     * (the field {@code rankPrior}; {@code generate} is already 24 when ranking
     * is off, {@code max(24, cands)}, so it must stay 24 and not differ).  The
     * two downward arms scale the budget and the round cap together, as D514's
     * do: {@code search-v2-ms750-r6} (x0.5) and {@code -ms375-r3} (x0.25), whose
     * cap of 3 still clears the 2 minimum rounds the constructor demands.  Every
     * other public field equals search-v2's (by reflection, so a field added
     * later is held too); the live seat stays 1500 ms and 12 rounds with
     * neither switch.
     */
    private static void knobAndCurveArms() {
        final String v2Text = "ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1";
        final SearchConfig v2 = SearchConfig.parse(v2Text);
        final SearchConfig routlets = SearchConfig.parse(v2Text + ",rollout=outlets");
        check("outlets".equals(routlets.rollout) && "default".equals(v2.rollout), "routlets: rollout=outlets, search-v2's is default");
        check(routlets.toString().equals(v2.toString() + ",rollout=outlets"), "routlets: the text is search-v2's plus rollout=outlets: " + routlets);
        configOnly("routlets", v2, routlets, List.of("rollout"));
        final SearchConfig ranked = SearchConfig.parse(v2Text + ",rank=prior,gen=24");
        check(ranked.rankPrior && ranked.generate == 24 && !v2.rankPrior && v2.generate == 24 && "leaf".equals(ranked.prior),
                "ranked: rank=prior, gen=24 (search-v2's unused generate is 24 too), the leaf prior");
        check(ranked.toString().equals(v2.toString() + ",rank=prior,gen=24"), "ranked: the text is search-v2's plus rank=prior,gen=24: " + ranked);
        configOnly("ranked", v2, ranked, List.of("rankPrior"));
        for (final int[] arm : new int[][] {{750, 6}, {375, 3}}) {
            final int ms = arm[0];
            final int rounds = arm[1];
            final String armText = v2Text.replace("ms=1500,", "ms=" + ms + ",").replace("maxrounds=12,", "maxrounds=" + rounds + ",");
            final SearchConfig c = SearchConfig.parse(armText);
            check(c.budgetMs == ms && c.maxRounds == rounds && c.anytime && c.minRounds == 2 && c.minRounds <= c.maxRounds && c.mullMs == v2.mullMs,
                    "ms" + ms + ": ms=" + ms + " and maxrounds=" + rounds + " parse; minRounds 2 <= the cap, mullms search-v2's");
            check(c.toString().equals(v2.toString().replace("ms=1500,", "ms=" + ms + ",").replace("maxrounds=12,", "maxrounds=" + rounds + ",")),
                    "ms" + ms + ": the text is search-v2's with ms and maxrounds changed: " + c);
            configOnly("ms" + ms, v2, c, List.of("budgetMs", "maxRounds"));
        }
        final SearchConfig live = SearchConfig.parseLive("");
        check(live.budgetMs == 1500 && live.maxRounds == 12 && "default".equals(live.rollout) && !live.rankPrior
                && !SearchConfig.LIVE_DEFAULTS.contains("rollout") && !SearchConfig.LIVE_DEFAULTS.contains("rank"),
                "the live seat stays 1500 ms and 12 rounds, plain-Forge rollouts, candidates in order");
    }

    /**
     * D537: the horizon arms, read from the seat configs the ladder writes for them
     * (tools/ai-ladder/players.json): {@code search-v2-t1} is search-v2 with
     * {@code turns=1,aturns=0} (priority and block rollouts play to the end of the
     * next turn, attacks keep this turn), {@code search-v2-a1} with {@code aturns=1}
     * (attack rollouts alone play on), and {@code search-v2-t1-x3} is
     * {@code search-v2-t1} at {@code ms=4500} with the round cap left at 12.  An
     * unset {@code aturns} follows {@code turns} ({@link SearchConfig#horizonFor}),
     * so {@code turns=1} alone would deepen attacks too: that is why the two t1
     * arms write {@code aturns=0}, and the case below holds it.  Every other public
     * field equals search-v2's (by reflection), and the live seat keeps
     * {@code turns=0} with {@code aturns} unset.
     */
    private static void horizonArms() {
        final String v2Text = "ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1";
        final SearchConfig v2 = SearchConfig.parse(v2Text);
        check(v2.horizonFor("p") == 0 && v2.horizonFor("a") == 0 && v2.horizonFor("b") == 0 && v2.attackTurns == -1,
                "search-v2: every kind's rollouts end with this turn, aturns unset");
        final SearchConfig t1 = SearchConfig.parse(
                "ms=1500,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,aturns=0,anytime=1");
        check(t1.horizonFor("p") == 1 && t1.horizonFor("b") == 1 && t1.horizonFor("a") == 0 && t1.budgetMs == 1500
                && t1.maxRounds == 12, "t1: priority and blocks one turn further, attacks this turn, 1500 ms, 12 rounds");
        check(t1.toString().equals(v2.toString().replace("turns=0,", "turns=1,").replace(",anytime=1", ",aturns=0,anytime=1")),
                "t1: the text is search-v2's with turns=1 and aturns=0: " + t1);
        configOnly("t1", v2, t1, List.of("horizonTurns", "attackTurns"));
        final SearchConfig bare = SearchConfig.parse(v2Text.replace("turns=0,", "turns=1,"));
        check(bare.horizonFor("a") == 1 && bare.attackTurns == -1,
                "turns=1 without aturns deepens attacks too (aturns unset follows turns): the t1 arms must write aturns=0");
        final SearchConfig a1 = SearchConfig.parse(
                "ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,aturns=1,anytime=1");
        check(a1.horizonFor("a") == 1 && a1.horizonFor("p") == 0 && a1.horizonFor("b") == 0 && a1.budgetMs == 1500
                && a1.maxRounds == 12, "a1: attacks one turn further, priority and blocks this turn, 1500 ms, 12 rounds");
        check(a1.toString().equals(v2.toString().replace(",anytime=1", ",aturns=1,anytime=1")),
                "a1: the text is search-v2's with aturns=1: " + a1);
        configOnly("a1", v2, a1, List.of("attackTurns"));
        final SearchConfig x3 = SearchConfig.parse(
                "ms=4500,cands=6,turns=1,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,aturns=0,anytime=1");
        check(x3.horizonFor("p") == 1 && x3.horizonFor("b") == 1 && x3.horizonFor("a") == 0 && x3.budgetMs == 4500
                && x3.maxRounds == 12 && x3.minRounds == 2 && x3.mullMs == v2.mullMs,
                "t1-x3: t1's horizons at 4500 ms, the round cap still 12, minRounds and mullms search-v2's");
        configOnly("t1-x3", t1, x3, List.of("budgetMs"));
        configOnly("t1-x3 against search-v2", v2, x3, List.of("budgetMs", "horizonTurns", "attackTurns"));
        final SearchConfig live = SearchConfig.parseLive("");
        check(live.horizonFor("p") == 0 && live.horizonFor("a") == 0 && live.horizonFor("b") == 0 && live.attackTurns == -1
                && !SearchConfig.LIVE_DEFAULTS.contains("turns"), "the live seat keeps turns=0 with aturns unset");
    }

    /**
     * D539: the live seat is search-v3, search-v2 with {@code what=pa} -- its
     * priority plays and attacks searched, its block declarations left to
     * Forge -- which the ladder rates as {@code search-v2-no-b} (J210, J211).
     * Every public field but {@code blocks} equals search-v2's (by reflection),
     * the text is search-v2-no-b's seat config without its {@code seed=0}
     * ({@link SearchConfig#toString} never prints the seed), a key the caller
     * names still wins
     * ({@code what=pab} is search-v2 again), a budget from the picker keeps
     * {@code what=pa}, and {@link SearchConfig#parse} -- the bench's, the cube
     * lab's, the atlas's and every ladder player's -- still searches all three
     * kinds.
     */
    private static void liveSeatNoBlock() {
        final String v2Text = "ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1";
        final SearchConfig v2 = SearchConfig.parse(v2Text);
        final SearchConfig live = SearchConfig.parseLive("");
        check("search-v3".equals(SearchConfig.LIVE_VERSION) && "what=pa,anytime=1".equals(SearchConfig.LIVE_DEFAULTS),
                "D539: the live seat is search-v3, LIVE_DEFAULTS what=pa,anytime=1");
        check(live.priority && live.attacks && !live.blocks && live.anytime,
                "D539: the live seat searches priority plays and attacks, not blocks, with the anytime loop");
        configOnly("D539: search-v3 against search-v2", v2, live, List.of("blocks"));
        check(live.toString().equals(v2.toString().replace(",what=pab", ",what=pa")),
                "D539: the live text is search-v2's with what=pa: " + live);
        final SearchConfig noB = SearchConfig.parse(v2Text.replace(",what=pab", ",what=pa"));
        check(noB.toString().equals(live.toString()), "D539: the live seat is search-v2-no-b's config (J211's A side): " + noB);
        final SearchConfig back = SearchConfig.parseLive("what=pab");
        check(back.blocks && back.priority && back.attacks && back.toString().equals(v2.toString()),
                "D539: --ai-search what=pab is search-v2's loop again: " + back);
        final SearchConfig picked = SearchConfig.parseLive("ms=3000");
        check(picked.budgetMs == 3000 && !picked.blocks && picked.priority && picked.attacks && picked.anytime
                        && picked.toString().equals(live.toString().replace("ms=1500,", "ms=3000,")),
                "D539: a budget from the picker (ms=3000) keeps what=pa and the anytime loop: " + picked);
        check(SearchConfig.parseLive("what=p").priority && !SearchConfig.parseLive("what=p").attacks
                        && !SearchConfig.parseLive("what=p").blocks, "D539: a caller's own what= wins over the live default");
        final SearchConfig bench = SearchConfig.parse("");
        check(bench.priority && bench.attacks && bench.blocks && !bench.anytime
                        && SearchConfig.defaults().toString().endsWith(",what=pab"),
                "D539: parse()'s defaults still search all three kinds (every ladder, bench and lab seat unchanged)");
    }

    /**
     * D540: the three widenings of what the priority search considers, {@code declined=1},
     * {@code instant=1} and {@code lands=1}, each a key of its own on the live seat's config
     * (search-v3, the ladder's search-v2-no-b): each arm differs from search-v3 in its one
     * field (by reflection, as {@link #horizonArms} does), prints search-v3's text plus the key,
     * round-trips, and is off in {@link SearchConfig#parse}'s defaults, in
     * {@link SearchConfig#LIVE_DEFAULTS} and in the live parse, so no registered config, no
     * ladder hash and not the live seat moves.  The behaviour is the ai-bench selftest's
     * (engine): {@code AiBench.searchCandidatesScenarios}.
     */
    private static void searchCandidates() {
        final String v3Text = "ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1";
        final SearchConfig v3 = SearchConfig.parse(v3Text);
        check(v3.toString().equals(SearchConfig.parseLive("").toString()), "D540: the arms' base is the live seat, search-v3: " + v3);
        check(!v3.declined && !v3.instant && !v3.lands, "D540: search-v3 widens nothing");
        // each key is the name of the one field it sets
        for (final String k : List.of("declined", "instant", "lands")) {
            final SearchConfig arm = SearchConfig.parse(v3Text + "," + k + "=1");
            check(arm.toString().equals(v3.toString() + "," + k + "=1"), "D540: " + k + "=1 prints search-v3's text plus the key: " + arm);
            check(SearchConfig.parse(arm.toString()).toString().equals(arm.toString()), "D540: " + k + "=1 round-trips");
            check(SearchConfig.parse(k + "=1," + v3Text).toString().equals(arm.toString()), "D540: " + k + "=1: key order does not matter");
            check(SearchConfig.parse(v3Text + "," + k + "=0").toString().equals(v3.toString()), "D540: " + k + "=0 is search-v3");
            configOnly("D540: " + k + "=1 against search-v3", v3, arm, List.of(k));
            boolean threw = false;
            try {
                SearchConfig.parse(v3Text + "," + k + "=2");
            } catch (final IllegalArgumentException e) {
                threw = true;
            }
            check(threw, "D540: " + k + "= takes 0 or 1");
            check(!SearchConfig.LIVE_DEFAULTS.contains(k), "D540: the live defaults do not name " + k);
        }
        final SearchConfig d = SearchConfig.parse(v3Text + ",declined=1");
        final SearchConfig i = SearchConfig.parse(v3Text + ",instant=1");
        final SearchConfig l = SearchConfig.parse(v3Text + ",lands=1");
        check(d.declined && !d.instant && !d.lands && !i.declined && i.instant && !i.lands && !l.declined && !l.instant && l.lands,
                "D540: each key turns on its own switch and no other");
        final SearchConfig all = SearchConfig.parse(v3Text + ",lands=1,declined=1,instant=1");
        check(all.toString().equals(v3.toString() + ",declined=1,instant=1,lands=1"), "D540: the three print in one order: " + all);
        configOnly("D540: all three against search-v3", v3, all, List.of("declined", "instant", "lands"));
        // a switch survives the other copies (leaf, mulligan and target switches, distill, observe), whichever comes first
        final SearchConfig mixed = SearchConfig.parse(v3Text + ",declined=1,targets=1,mull=1,observe=1");
        check(mixed.declined && mixed.targets && mixed.mull && mixed.observe, "D540: declined=1 survives the other switches' copies");
        final SearchConfig live = SearchConfig.parseLive("");
        final SearchConfig bench = SearchConfig.parse("");
        check(!live.declined && !live.instant && !live.lands && !bench.declined && !bench.instant && !bench.lands,
                "D540: off in parse()'s defaults and in the live parse");
        check(SearchConfig.parseLive("lands=1").lands && SearchConfig.parseLive("lands=1").toString().equals(live.toString() + ",lands=1"),
                "D540: a live seat may name a key (no measurement-only refusal): " + SearchConfig.parseLive("lands=1"));
    }

    /**
     * D544: {@code stackwin=1}, {@code passwin=1} and {@code dactiv=1}, each a key of its own: each differs from its base
     * in its one field, prints the base's text plus the key, round-trips, and is off in {@link SearchConfig#parse}'s
     * defaults, in {@link SearchConfig#LIVE_DEFAULTS} and in the live parse.  The union player's text is
     * search-v3-declined-instant's plus the three, in D544's order.  Then the opponent's conditional pass
     * ({@link RolloutController.Forced#takePass(String)}): given once, only on the stack it was armed on, disarmed
     * either way, and never on a controller nothing armed.  The behaviour is the ai-bench selftest's (engine).
     */
    private static void wideWindows() {
        final String v3Text = "ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1";
        final String diText = v3Text + ",declined=1,instant=1";
        final SearchConfig v3 = SearchConfig.parse(v3Text);
        final SearchConfig di = SearchConfig.parse(diText);
        check(!v3.stackwin && !v3.passwin && !v3.dactiv && !di.stackwin && !di.passwin && !di.dactiv,
                "D544: search-v3 and search-v3-declined-instant widen no window");
        for (final String k : List.of("stackwin", "passwin", "dactiv")) {
            final SearchConfig arm = SearchConfig.parse(diText + "," + k + "=1");
            check(arm.toString().equals(di.toString() + "," + k + "=1"), "D544: " + k + "=1 prints the base's text plus the key: " + arm);
            check(SearchConfig.parse(arm.toString()).toString().equals(arm.toString()), "D544: " + k + "=1 round-trips");
            check(SearchConfig.parse(k + "=1," + diText).toString().equals(arm.toString()), "D544: " + k + "=1: key order does not matter");
            check(SearchConfig.parse(diText + "," + k + "=0").toString().equals(di.toString()), "D544: " + k + "=0 is the base");
            configOnly("D544: " + k + "=1 against search-v3-declined-instant", di, arm, List.of(k));
            boolean threw = false;
            try {
                SearchConfig.parse(diText + "," + k + "=2");
            } catch (final IllegalArgumentException e) {
                threw = true;
            }
            check(threw, "D544: " + k + "= takes 0 or 1");
            check(!SearchConfig.LIVE_DEFAULTS.contains(k), "D544: the live defaults do not name " + k);
        }
        final SearchConfig wide = SearchConfig.parse(diText + ",dactiv=1,passwin=1,stackwin=1");
        check(wide.toString().equals(v3.toString() + ",declined=1,instant=1,stackwin=1,passwin=1,dactiv=1"),
                "D544: the union player's text, in one order: " + wide);
        configOnly("D544: the union against search-v3-declined-instant", di, wide, List.of("stackwin", "passwin", "dactiv"));
        final SearchConfig mixed = SearchConfig.parse(v3Text + ",stackwin=1,targets=1,mull=1,observe=1,lands=1");
        check(mixed.stackwin && mixed.targets && mixed.mull && mixed.observe && mixed.lands,
                "D544: stackwin=1 survives the other switches' copies");
        final SearchConfig live = SearchConfig.parseLive("");
        final SearchConfig bench = SearchConfig.parse("");
        check(!live.stackwin && !live.passwin && !live.dactiv && !bench.stackwin && !bench.passwin && !bench.dactiv,
                "D544: off in parse()'s defaults and in the live parse");

        final RolloutController.Forced f = new RolloutController.Forced();
        check(!f.takePass("s1/1;"), "D544: nothing armed, no conditional pass");
        f.passWhile("s1/1;");
        check(f.takePass("s1/1;") && !f.takePass("s1/1;"), "D544: the conditional pass is given once, on the stack it was armed on");
        f.passWhile("s1/1;");
        check(!f.takePass("s9/1;s1/1;") && !f.takePass("s1/1;"),
                "D544: a changed stack gives the opponent its own answer, and the pass is disarmed");
        f.priority(null);
        f.passWhile("");
        check(f.takePass("") && f.unanswered(), "D544: the conditional pass never takes a forced answer armed beside it");
    }

    /**
     * D523: the two random-rollout arms and random-v2's guardrails, without
     * the engine.  {@code search-v2-rrandom} is search-v2 plus
     * {@code rollout=random} (both seats in the rollout random-v2) and
     * {@code search-v2-rrandom-self} plus {@code rollout=random-self} (the
     * searching seat alone); each differs from search-v2 in the field
     * {@code rollout} only, neither turns D390's outlet policy on, and the live
     * seat stays plain-Forge rollouts.  The atlas's random seat (D508's frozen
     * population) is not random-v2; random-v2 is the random seat plus the flag.
     * Then each guardrail's engine-free core (R1-R7), firing where it must and
     * quiet where it must not, with its counter.
     */
    private static void rolloutRandom() {
        final String v2Text = "ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1";
        final SearchConfig v2 = SearchConfig.parse(v2Text);
        final SearchConfig rr = SearchConfig.parse(v2Text + ",rollout=random");
        final SearchConfig rs = SearchConfig.parse(v2Text + ",rollout=random-self");
        check(rr.rolloutRandomUs() && rr.rolloutRandomThem() && !rr.rolloutOutletsUs() && !rr.rolloutOutletsThem(),
                "rrandom: both rollout seats random-v2, no outlet policy");
        check(rs.rolloutRandomUs() && !rs.rolloutRandomThem() && !rs.rolloutOutletsUs() && !rs.rolloutOutletsThem(),
                "rrandom-self: the searching seat random-v2, the opponent Forge, no outlet policy");
        check(!v2.rolloutRandomUs() && !v2.rolloutRandomThem() && !v2.rolloutOutletsUs()
                && SearchConfig.parse("rollout=outlets").rolloutOutletsUs() && !SearchConfig.parse("rollout=outlets").rolloutRandomUs(),
                "search-v2 and routlets play no random seat in their rollouts");
        check(rr.toString().equals(v2.toString() + ",rollout=random") && rs.toString().equals(v2.toString() + ",rollout=random-self"),
                "the texts are search-v2's plus rollout=random / random-self: " + rr + " / " + rs);
        configOnly("rrandom", v2, rr, List.of("rollout"));
        configOnly("rrandom-self", v2, rs, List.of("rollout"));
        boolean refused = false;
        try {
            SearchConfig.parse("rollout=chaos");
        } catch (final IllegalArgumentException e) {
            refused = e.getMessage().contains("random-self");
        }
        check(refused, "an unknown rollout= is refused, naming the random values");
        final SearchConfig live = SearchConfig.parseLive("");
        check("default".equals(live.rollout) && !live.rolloutRandomUs() && !SearchConfig.LIVE_DEFAULTS.contains("rollout"),
                "the live seat's rollouts stay plain Forge");
        for (final String r : List.of("random", "random-self")) {
            boolean liveRefused = false;
            try {
                SearchConfig.parseLive("rollout=" + r);
            } catch (final IllegalArgumentException e) {
                liveRefused = e.getMessage().contains("measurement only");
            }
            check(liveRefused, "parseLive refuses rollout=" + r + " (measurement only, as oracle=1)");
        }

        final ExploreMath.Config atlas = ExploreMath.Config.randomSeat();
        final ExploreMath.Config r2 = ExploreMath.Config.randomV2();
        check(!atlas.v2 && r2.v2 && r2.random && r2.epsilon == 1 && r2.closeCall == 0 && !r2.opening,
                "random-v2 is the random seat plus the flag; the atlas's random seat is not random-v2");
        check(!ExploreMath.Config.of(java.util.Map.of("random", Boolean.TRUE)).v2, "a job line's random seat is never random-v2");
        final ExploreMath m = new ExploreMath(r2, 1);

        // R4: no pass in its own main 2 with nothing cast yet and a cast listed that is not an instant
        final java.util.Map<String, Object> opts = new java.util.LinkedHashMap<>();
        opts.put("pass", null);
        opts.put("activate:3", null);
        opts.put("cast:7", null);
        final java.util.function.Predicate<String> noInstant = k -> false;
        check(!RolloutGuards.castSomething(new java.util.LinkedHashMap<>(opts), false, true, 0, noInstant, m), "R4 quiet off its own main 2");
        check(!RolloutGuards.castSomething(new java.util.LinkedHashMap<>(opts), true, false, 0, noInstant, m), "R4 quiet with a stack");
        check(!RolloutGuards.castSomething(new java.util.LinkedHashMap<>(opts), true, true, 1, noInstant, m), "R4 quiet once a spell was cast");
        final java.util.Map<String, Object> noCast = new java.util.LinkedHashMap<>();
        noCast.put("pass", null);
        noCast.put("activate:3", null);
        check(!RolloutGuards.castSomething(noCast, true, true, 0, noInstant, m) && noCast.containsKey("pass"), "R4 quiet with no cast listed");
        final java.util.Map<String, Object> instantOnly = new java.util.LinkedHashMap<>(opts);
        check(!RolloutGuards.castSomething(instantOnly, true, true, 0, k -> k.equals("cast:7"), m) && instantOnly.containsKey("pass"),
                "R4 quiet when the only cast listed is an instant");
        final java.util.Map<String, Object> fires = new java.util.LinkedHashMap<>(opts);
        check(RolloutGuards.castSomething(fires, true, true, 0, noInstant, m) && !fires.containsKey("pass") && fires.size() == 2
                && m.guardrails().get("v2.castSomething") == 1, "R4 removes pass, counted");

        // R3: harm the other side, help its own
        final List<String> legal = new ArrayList<>(List.of("me", "myBear", "you", "yourBear"));
        final java.util.function.Predicate<String> ours = t -> t.startsWith("m");
        final List<String> harmful = new ArrayList<>(legal);
        check(RolloutGuards.side(harmful, ours, 1, m) && harmful.equals(List.of("you", "yourBear")), "R3: a harmful part keeps the other side");
        final List<String> helpful = new ArrayList<>(legal);
        check(RolloutGuards.side(helpful, ours, -1, m) && helpful.equals(List.of("me", "myBear")), "R3: a helpful part keeps its own side");
        final List<String> neutral = new ArrayList<>(legal);
        check(!RolloutGuards.side(neutral, ours, 0, m) && neutral.size() == 4, "R3 quiet on a part neither harmful nor helpful");
        final List<String> onlyOurs = new ArrayList<>(List.of("me", "myBear"));
        check(!RolloutGuards.side(onlyOurs, ours, 1, m) && onlyOurs.size() == 2, "R3 quiet when no other-side target is legal");
        check(m.guardrails().get("v2.targetSide") == 2, "R3 counted once per list it changed");

        // R7: its own stack
        check(RolloutGuards.ownStack(2, 2) && !RolloutGuards.ownStack(2, 1) && !RolloutGuards.ownStack(0, 0),
                "R7: a non-empty stack of the seat's own items only");

        // R1: lethal through no possible blocker
        check(RolloutGuards.lethal(new int[] {3, 0, 2}, 5) && !RolloutGuards.lethal(new int[] {3, 0, 1}, 5)
                && !RolloutGuards.lethal(new int[] {}, 0), "R1: unblockable damage against life");

        // R5, a rule on the attack as a set
        final java.util.Map<String, Object> attack = new java.util.LinkedHashMap<>();
        attack.put("bear", "you");
        attack.put("dragon", "you");
        check(RolloutGuards.dropDominated(attack, a -> a.equals("bear"), 2, false, m) == 1 && attack.keySet().equals(java.util.Set.of("dragon"))
                && m.guardrails().get("v2.dominatedAttacker") == 1, "R5 removes the dominated attacker when the blockers can meet every attacker, counted");
        final java.util.Map<String, Object> wide = new java.util.LinkedHashMap<>();
        wide.put("bearA", "you");
        wide.put("bearB", "you");
        check(RolloutGuards.dropDominated(wide, a -> true, 1, false, m) == 0 && wide.size() == 2,
                "R5 keeps a go-wide attack: two 2/2s into one 4/4 are both kept (the attackers outnumber the blockers)");
        check(RolloutGuards.lethalThrough(new int[] {2, 2}, 1, 2) && !RolloutGuards.lethalThrough(new int[] {2, 2}, 1, 3)
                && !RolloutGuards.lethalThrough(new int[] {5, 1}, 1, 2) && RolloutGuards.lethalThrough(new int[] {5, 1, 1}, 1, 2),
                "R5's lethal test: the blockers take the largest attackers, the rest must reach life");
        final java.util.Map<String, Object> lethalSet = new java.util.LinkedHashMap<>();
        lethalSet.put("bear", "you");
        check(RolloutGuards.dropDominated(lethalSet, a -> true, 3, true, m) == 0 && lethalSet.size() == 1,
                "R5 drops nothing from an attack lethal through the blockers");
        check(m.guardrails().get("v2.dominatedAttacker") == 1, "R5's quiet cases count nothing");

        // R2: the incoming case and the greedy fallback
        check(RolloutGuards.lethalIncoming(7, 7, true) && !RolloutGuards.lethalIncoming(6, 7, true)
                && !RolloutGuards.lethalIncoming(9, 7, false), "R2's case: unblocked damage at least life, life loseable");
        final java.util.Map<String, Integer> dmg = new java.util.LinkedHashMap<>();
        dmg.put("small", 1);
        dmg.put("big", 5);
        dmg.put("mid", 3);
        final java.util.Map<String, List<String>> can = new java.util.LinkedHashMap<>();
        can.put("wall", List.of("small", "big"));
        can.put("bear", List.of("small", "mid"));
        final java.util.Map<String, String> g = RolloutGuards.greedyBlock(can, dmg);
        check("big".equals(g.get("wall")) && "mid".equals(g.get("bear")) && RolloutGuards.unblocked(dmg, g) == 1,
                "R2's fallback blocks the most damage greedily: " + g);

        // R6, on the assignment as a whole
        final java.util.Map<String, String> blocks = new java.util.LinkedHashMap<>();
        blocks.put("token", "dragon");
        blocks.put("wall", "bear");
        check(RolloutGuards.dropChumps(blocks, a -> false, b -> b.equals("token"), m) == 1 && blocks.keySet().equals(java.util.Set.of("wall"))
                && m.guardrails().get("v2.chumpBlock") == 1, "R6 removes the chump block, counted");
        final java.util.Map<String, String> gang = new java.util.LinkedHashMap<>();
        gang.put("bearA", "giant");
        gang.put("bearB", "giant");
        check(RolloutGuards.dropChumps(gang, a -> a.equals("giant"), b -> b.equals("bearA"), m) == 0 && gang.size() == 2
                && m.guardrails().get("v2.chumpBlock") == 1, "R6 keeps a double block that kills its attacker, the blocker it loses included");
    }

    /**
     * D525: the two random-v3 arms and R8/R9, without the engine.
     * {@code search-v2-rrandom3} is search-v2 plus {@code rollout=random3}
     * (both rollout seats random-v2 plus R8), {@code search-v2-rrandom3-held}
     * plus {@code rollout=random3-held} (both seats random-v2 plus R8 and R9);
     * each differs from search-v2 in {@code rollout} only, and the live seat
     * refuses both.  random-v2, D523's values and the atlas's seat carry
     * neither rule.  Then R8's and R9's engine-free cores, firing where they
     * must and quiet where they must not, with their counters.
     */
    private static void rolloutRandomV3() {
        final String v2Text = "ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1";
        final SearchConfig v2 = SearchConfig.parse(v2Text);
        final SearchConfig rr = SearchConfig.parse(v2Text + ",rollout=random");
        final SearchConfig r3 = SearchConfig.parse(v2Text + ",rollout=random3");
        final SearchConfig r3h = SearchConfig.parse(v2Text + ",rollout=random3-held");
        for (final SearchConfig c : List.of(r3, r3h)) {
            check(c.rolloutRandomUs() && c.rolloutRandomThem() && c.rolloutRandomV3() && !c.rolloutOutletsUs()
                    && !c.rolloutOutletsThem(), c.rollout + ": both rollout seats random-v3, no outlet policy");
        }
        final ExploreMath.Config s3 = r3.rolloutRandomSeat();
        final ExploreMath.Config s3h = r3h.rolloutRandomSeat();
        check(s3.v2 && s3.goodBlock && !s3.heldInstant, "random3 seats random-v2 plus R8 alone: R8 on, R9 quiet");
        check(s3h.v2 && s3h.goodBlock && s3h.heldInstant, "random3-held seats random-v2 plus R8 and R9: both on");
        final ExploreMath.Config srr = rr.rolloutRandomSeat();
        final ExploreMath.Config srs = SearchConfig.parse(v2Text + ",rollout=random-self").rolloutRandomSeat();
        check(srr.v2 && srs.v2 && !srr.goodBlock && !srr.heldInstant && !srs.goodBlock && !srs.heldInstant
                && !rr.rolloutRandomV3() && !SearchConfig.parse(v2Text + ",rollout=random-self").rolloutRandomV3()
                && !v2.rolloutRandomV3(), "D523's random and random-self stay random-v2, neither R8 nor R9");
        check(r3.toString().equals(v2.toString() + ",rollout=random3") && r3h.toString().equals(v2.toString() + ",rollout=random3-held"),
                "the texts are search-v2's plus rollout=random3 / random3-held: " + r3 + " / " + r3h);
        configOnly("rrandom3", v2, r3, List.of("rollout"));
        configOnly("rrandom3-held", v2, r3h, List.of("rollout"));
        boolean refused = false;
        try {
            SearchConfig.parse("rollout=random3-self");
        } catch (final IllegalArgumentException e) {
            refused = e.getMessage().contains("random3-held");
        }
        check(refused, "random3-self (dropped, D525) is refused as an unknown rollout=, naming the random3 values");
        for (final String r : List.of("random3", "random3-held")) {
            boolean liveRefused = false;
            try {
                SearchConfig.parseLive("rollout=" + r);
            } catch (final IllegalArgumentException e) {
                liveRefused = e.getMessage().contains("measurement only");
            }
            check(liveRefused, "parseLive refuses rollout=" + r + " (measurement only, as D523's)");
        }

        final ExploreMath.Config c3 = ExploreMath.Config.randomV3Block();
        final ExploreMath.Config c3h = ExploreMath.Config.randomV3BlockHeld();
        check(c3.random && c3.epsilon == 1 && c3.closeCall == 0 && !c3.opening && c3h.random && c3h.epsilon == 1 && !c3h.opening,
                "random-v3's two seats are the random seat's settings");
        final ExploreMath.Config job = ExploreMath.Config.of(java.util.Map.of("random", Boolean.TRUE));
        check(!ExploreMath.Config.randomV2().goodBlock && !ExploreMath.Config.randomV2().heldInstant
                && !ExploreMath.Config.randomSeat().goodBlock && !ExploreMath.Config.randomSeat().heldInstant
                && !job.goodBlock && !job.heldInstant,
                "random-v2, the atlas's random seat and a job line's random seat carry neither R8 nor R9 (both quiet there)");
        final ExploreMath m = new ExploreMath(c3, 1);

        // R8: an attacker a blocker can block, destroy and survive gets that block
        final java.util.Map<String, List<String>> good = new java.util.LinkedHashMap<>();
        good.put("wall", List.of("bear"));
        final java.util.Map<String, String> none = new java.util.LinkedHashMap<>();
        check(RolloutGuards.goodBlocks(none, good, List.of("bear"), k -> 0, m) == 1 && "bear".equals(none.get("wall")) && none.size() == 1
                && m.guardrails().get("v3.goodBlock") == 1, "R8: a blocker drawn as no block takes the good block, counted");
        final java.util.Map<String, String> chump = new java.util.LinkedHashMap<>();
        chump.put("token", "bear");
        check(RolloutGuards.goodBlocks(chump, good, List.of("bear"), k -> 0, m) == 1 && chump.equals(java.util.Map.of("wall", "bear")),
                "R8: the good blocker takes its attacker alone (the drawn chump goes back to no block)");
        final java.util.Map<String, String> moved = new java.util.LinkedHashMap<>();
        moved.put("wall", "giant");
        check(RolloutGuards.goodBlocks(moved, good, List.of("giant", "bear"), k -> 0, m) == 1 && moved.equals(java.util.Map.of("wall", "bear")),
                "R8: a blocker drawn onto an attacker it does not block well moves to the one it does");
        final java.util.Map<String, String> held = new java.util.LinkedHashMap<>();
        held.put("wall", "bear");
        final java.util.Map<String, List<String>> two = new java.util.LinkedHashMap<>();
        two.put("wall", List.of("bear"));
        two.put("wall2", List.of("bear"));
        check(RolloutGuards.goodBlocks(held, two, List.of("bear"), k -> 0, m) == 0 && held.equals(java.util.Map.of("wall", "bear")),
                "R8 quiet when the attacker already has a good block");
        final java.util.Map<String, String> quiet = new java.util.LinkedHashMap<>();
        quiet.put("token", "dragon");
        check(RolloutGuards.goodBlocks(quiet, new java.util.LinkedHashMap<String, List<String>>(), List.of("dragon"), k -> 0, m) == 0
                && quiet.equals(java.util.Map.of("token", "dragon")), "R8 quiet when no blocker can block, destroy and survive");
        check(m.guardrails().get("v3.goodBlock") == 3, "R8's quiet cases count nothing");
        final java.util.Map<String, List<String>> both = new java.util.LinkedHashMap<>();
        both.put("wall", List.of("bear", "dragon"));
        final java.util.Map<String, String> one = new java.util.LinkedHashMap<>();
        check(RolloutGuards.goodBlocks(one, both, List.of("dragon", "bear"), k -> 0, m) == 1 && one.equals(java.util.Map.of("wall", "dragon")),
                "R8: one blocker good against two attackers takes the largest, once");
        final java.util.Set<String> chosen = new java.util.TreeSet<>();
        boolean same = true;
        for (long seed = 0; seed < 64; seed++) {
            final ExploreMath a = new ExploreMath(c3, seed);
            final ExploreMath b = new ExploreMath(c3, seed);
            final java.util.Map<String, String> ma = new java.util.LinkedHashMap<>();
            final java.util.Map<String, String> mb = new java.util.LinkedHashMap<>();
            RolloutGuards.goodBlocks(ma, two, List.of("bear"), a::pick, a);
            RolloutGuards.goodBlocks(mb, two, List.of("bear"), b::pick, b);
            same &= ma.equals(mb) && ma.size() == 1;
            chosen.addAll(ma.keySet());
        }
        check(same && chosen.equals(java.util.Set.of("wall", "wall2")),
                "R8: among several good blockers the seat's seeded stream picks one -- the same on the same seed, each of them on some seed");

        // R8's map: a menace attacker (no lone blocker may block it) is left out, so a lone good blocker never makes the
        // whole R8 result illegal (the skeptic's review); a blocker with no good block left is left out too
        final java.util.Map<String, List<String>> gm = RolloutGuards.goodMap(List.of("wall", "bear"),
                List.of(List.of("menace", "goblin"), List.of("menace")), (a, b) -> true, a -> !a.equals("menace"));
        check(gm.equals(java.util.Map.of("wall", List.of("goblin"))),
                "R8's map leaves out an attacker one blocker alone may not block, and a blocker left with none: " + gm);
        final java.util.Map<String, List<String>> gm2 = RolloutGuards.goodMap(List.of("wall"), List.of(List.of("goblin", "dragon")),
                (a, b) -> a.equals("goblin"), a -> true);
        check(gm2.equals(java.util.Map.of("wall", List.of("goblin"))), "R8's map keeps only the pairs that kill and survive: " + gm2);

        // R9: harm on their turn waits for combat past its blockers, or the end step
        final java.util.Map<String, Object> opts = new java.util.LinkedHashMap<>();
        opts.put("pass", null);
        opts.put("cast:bolt", null);
        opts.put("cast:bear", null);
        opts.put("activate:pinger", null);
        final java.util.function.Predicate<String> harmful = k -> k.equals("cast:bolt") || k.equals("activate:pinger");
        final java.util.Map<String, Object> fires = new java.util.LinkedHashMap<>(opts);
        check(RolloutGuards.holdInstants(fires, true, false, harmful, m) == 2
                && fires.keySet().equals(new java.util.LinkedHashSet<>(List.of("pass", "cast:bear")))
                && m.guardrails().get("v3.heldInstant") == 1, "R9 holds the harmful plays on their turn out of the window, counted once");
        check(RolloutGuards.holdInstants(new java.util.LinkedHashMap<>(opts), false, false, harmful, m) == 0,
                "R9 quiet on its own turn");
        check(RolloutGuards.holdInstants(new java.util.LinkedHashMap<>(opts), true, true, harmful, m) == 0,
                "R9 quiet in the window");
        final java.util.Map<String, Object> alone = new java.util.LinkedHashMap<>();
        alone.put("cast:bolt", null);
        check(RolloutGuards.holdInstants(alone, true, false, harmful, m) == 0 && alone.size() == 1, "R9 never removes the last option");
        check(m.guardrails().get("v3.heldInstant") == 1, "R9's quiet cases count nothing");
        check(RolloutGuards.instantWindow("COMBAT_DECLARE_BLOCKERS", true)
                && RolloutGuards.instantWindow("COMBAT_DAMAGE", true)
                && RolloutGuards.instantWindow("END_OF_TURN", true)
                && !RolloutGuards.instantWindow("END_OF_TURN", false)
                && !RolloutGuards.instantWindow("COMBAT_DECLARE_ATTACKERS", true)
                && !RolloutGuards.instantWindow("MAIN1", true)
                && !RolloutGuards.instantWindow("UPKEEP", true),
                "R9's window: combat after blockers or the end step, the stack empty -- never in answer to a cast");
        check(!RolloutGuards.harmful(null) && !RolloutGuards.harmful(List.of()), "R9: pass is never harmful");
    }

    /** D527: random-v4, R8 made lethal-aware under {@code rollout=random4}. */
    private static void rolloutRandomV4() {
        final String v2Text = "ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1";
        final SearchConfig v2 = SearchConfig.parse(v2Text);
        final SearchConfig r4 = SearchConfig.parse(v2Text + ",rollout=random4");
        check(r4.rolloutRandomUs() && r4.rolloutRandomThem() && r4.rolloutRandomV4() && !r4.rolloutRandomV3()
                && !r4.rolloutOutletsUs() && !r4.rolloutOutletsThem(), "random4: both rollout seats random-v4, no outlet policy");
        final ExploreMath.Config s4 = r4.rolloutRandomSeat();
        check(s4.v2 && s4.goodBlock && s4.lethalGood && !s4.heldInstant && s4.random && s4.epsilon == 1 && !s4.opening,
                "random4 seats random-v2 plus R8 made lethal-aware, no R9");
        boolean quietElsewhere = !v2.rolloutRandomV4();
        for (final String r : List.of("random", "random-self", "random3", "random3-held")) {
            final SearchConfig c = SearchConfig.parse(v2Text + ",rollout=" + r);
            quietElsewhere &= !c.rolloutRandomV4() && !c.rolloutRandomSeat().lethalGood;
        }
        check(quietElsewhere && SearchConfig.parse(v2Text + ",rollout=random3").rolloutRandomSeat().goodBlock
                && !SearchConfig.parse(v2Text + ",rollout=random").rolloutRandomSeat().goodBlock,
                "D523's and D525's values seat what they did: random3 R8 as D525 built it, random no R8, none lethal-aware");
        final ExploreMath.Config job = ExploreMath.Config.of(java.util.Map.of("random", Boolean.TRUE));
        check(!ExploreMath.Config.randomSeat().lethalGood && !job.lethalGood && !ExploreMath.Config.randomV2().lethalGood
                && !ExploreMath.Config.randomV3Block().lethalGood && !ExploreMath.Config.randomV3BlockHeld().lethalGood,
                "the atlas's and a job line's random seats, random-v2 and random-v3 are not lethal-aware");
        check(r4.toString().equals(v2.toString() + ",rollout=random4"), "the text is search-v2's plus rollout=random4: " + r4);
        configOnly("rrandom4", v2, r4, List.of("rollout"));
        final SearchConfig r4m = SearchConfig.parse(v2Text.replace(",margin=20,", ",margin=40,") + ",rollout=random4");
        configOnly("rrandom4-m40", r4, r4m, List.of("margin"));
        check(r4m.margin == 40 && r4.margin == 20 && r4m.rolloutRandomSeat().lethalGood
                && r4m.toString().equals(r4.toString().replace(",margin=20,", ",margin=40,")),
                "rrandom4-m40 is rrandom4 with the override margin 40 for 20, and the same random-v4 seat: " + r4m);
        boolean liveRefused = false;
        try {
            SearchConfig.parseLive("rollout=random4");
        } catch (final IllegalArgumentException e) {
            liveRefused = e.getMessage().contains("measurement only");
        }
        check(liveRefused, "parseLive refuses rollout=random4 (measurement only, as D523's and D525's)");
        boolean unknown = false;
        try {
            SearchConfig.parse("rollout=random5");
        } catch (final IllegalArgumentException e) {
            unknown = e.getMessage().contains("random4");
        }
        check(unknown, "an unknown rollout= is refused, naming random4");

        // R8 made lethal-aware: the seat, life 3, attacked by a giant (5) and a bear (2); alive while the unblocked
        // damage is under 3.  The wall blocks the bear well (kills it, survives); the token can only chump.
        final java.util.Map<String, Integer> dmg = new java.util.LinkedHashMap<>();
        dmg.put("giant", 5);
        dmg.put("bear", 2);
        final java.util.function.Predicate<java.util.Map<String, String>> alive = b -> RolloutGuards.unblocked(dmg, b) < 3;
        final List<String> order = List.of("giant", "bear");
        final java.util.Map<String, List<String>> good = new java.util.LinkedHashMap<>();
        good.put("wall", List.of("bear"));
        final ExploreMath m = new ExploreMath(s4, 1);
        final java.util.Map<String, String> fires = new java.util.LinkedHashMap<>();
        fires.put("token", "giant");
        check(RolloutGuards.goodBlocksAlive(fires, good, order, k -> 0, alive, m) == 1
                && fires.equals(java.util.Map.of("token", "giant", "wall", "bear"))
                && m.guardrails().get("v3.goodBlock") == 1 && m.guardrails().get("v4.goodBlockLethal") == 1
                && !m.guardrails().containsKey("v4.goodBlockRefused"),
                "R8 lethal-aware fires under a lethal attack where the good block survives: the token keeps the giant, the wall takes the bear, counted");
        final java.util.Map<String, String> chumpSaves = new java.util.LinkedHashMap<>();
        chumpSaves.put("wall", "giant");
        final java.util.Map<String, String> asD525 = new java.util.LinkedHashMap<>(chumpSaves);
        RolloutGuards.goodBlocks(asD525, good, order, k -> 0, new ExploreMath(s4, 1));
        check(!alive.test(asD525) && RolloutGuards.goodBlocksAlive(chumpSaves, good, order, k -> 0, alive, m) == 0
                && chumpSaves.equals(java.util.Map.of("wall", "giant")) && m.guardrails().get("v4.goodBlockRefused") == 1
                && m.guardrails().get("v3.goodBlock") == 1,
                "R8 lethal-aware is quiet when no good block survives: D525's R8 moves the wall off the giant (dead), random-v4 "
                        + "keeps the drawn chump, counted refused");
        final java.util.Map<String, String> dead = new java.util.LinkedHashMap<>();
        check(RolloutGuards.goodBlocksAlive(dead, good, order, k -> 0, alive, m) == 0 && dead.isEmpty()
                && m.guardrails().get("v4.goodBlockRefused") == 1,
                "from a dead draw a good block that does not rescue the seat is not made, and not counted refused (R2 redraws)");
        final java.util.Map<String, String> rescue = new java.util.LinkedHashMap<>();
        rescue.put("token", "bear");
        final java.util.Map<String, List<String>> bigWall = new java.util.LinkedHashMap<>();
        bigWall.put("wall", List.of("giant"));
        check(!alive.test(rescue) && RolloutGuards.goodBlocksAlive(rescue, bigWall, order, k -> 0, alive, m) == 1
                && rescue.equals(java.util.Map.of("token", "bear", "wall", "giant")),
                "from a dead draw a good block that rescues the seat is made");
        final java.util.Map<String, List<String>> two = new java.util.LinkedHashMap<>();
        two.put("wall", List.of("bear"));
        two.put("wall2", List.of("bear"));
        final java.util.Map<String, String> next = new java.util.LinkedHashMap<>();
        next.put("wall", "giant");
        check(RolloutGuards.goodBlocksAlive(next, two, order, k -> 0, alive, m) == 1
                && next.equals(java.util.Map.of("wall", "giant", "wall2", "bear")),
                "when the drawn good blocker is the giant's chump, the next one in list order takes the bear, with no draw");
        boolean same = true;
        for (long seed = 0; seed < 64; seed++) {
            final ExploreMath a = new ExploreMath(s4, seed);
            final ExploreMath b = new ExploreMath(s4, seed);
            final java.util.Map<String, String> ma = new java.util.LinkedHashMap<>();
            final java.util.Map<String, String> mb = new java.util.LinkedHashMap<>();
            ma.put("token", "giant");
            mb.put("token", "giant");
            RolloutGuards.goodBlocks(ma, two, order, a::pick, a);
            RolloutGuards.goodBlocksAlive(mb, two, order, b::pick, x -> true, b);
            same &= ma.equals(mb) && a.pick(1000) == b.pick(1000);
        }
        check(same, "with no refusal R8 lethal-aware is D525's R8: the same blocks and the same draws on the same seed");
        check(RolloutGuards.goodBound(good) == 1 && RolloutGuards.goodBound(two) == 1
                && RolloutGuards.goodBound(java.util.Map.of("wall", List.of("bear", "giant"))) == 1
                && RolloutGuards.goodBound(java.util.Map.of("wall", List.of("bear"), "wall2", List.of("giant"))) == 2,
                "the redraws' stop: the attackers blocked well, at most one per good blocker");
        check(RolloutGuards.goodCount(java.util.Map.of("wall", "bear", "token", "giant"), two) == 1
                && RolloutGuards.goodCount(java.util.Map.of("wall", "giant"), two) == 0,
                "the redraws' preference counts the good blocks an assignment holds, drawn or made");
    }

    /**
     * D531 (random-v7, pre-registered by D530 point 7): {@code rollout=random4-them}, a seating never run or
     * self-tested before -- the opponent's rollout seat random-v4 (R8 made lethal-aware, as under {@code random4}),
     * the searching seat no random seat at all (plain Forge, its candidate forced first, as search-v2's rollouts):
     * {@code random-self}'s seating reversed.  Checked on the config, on its random seat's settings, and on the
     * {@link SearchPolicy.Limits} that {@code SearchPolicy.rollout} builds from it, whose two booleans are what
     * {@code playout} reads to seat each player.  The arm, {@code search-v2-rrandom4them-lcb-m40}, is
     * {@code search-v2-rrandom4-lcb-m40} with the rollout value alone changed.
     */
    private static void rolloutRandomV4Them() {
        final String v2Text = "ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1";
        final SearchConfig v2 = SearchConfig.parse(v2Text);
        final SearchConfig r4 = SearchConfig.parse(v2Text + ",rollout=random4");
        final SearchConfig rs = SearchConfig.parse(v2Text + ",rollout=random-self");
        final SearchConfig rt = SearchConfig.parse(v2Text + ",rollout=random4-them");
        check(!rt.rolloutRandomUs() && rt.rolloutRandomThem() && rt.rolloutRandomV4() && !rt.rolloutRandomV3()
                && !rt.rolloutOutletsUs() && !rt.rolloutOutletsThem(),
                "random4-them: the opponent's rollout seat random-v4; the searching seat no random seat, no outlet policy");
        check(r4.rolloutRandomUs() && r4.rolloutRandomThem() && rs.rolloutRandomUs() && !rs.rolloutRandomThem(),
                "random4 still seats both, random-self still the searching seat alone: random4-them is the one us-false, "
                        + "them-true value");
        final ExploreMath.Config st = rt.rolloutRandomSeat();
        final ExploreMath.Config s4 = r4.rolloutRandomSeat();
        check(st.v2 && st.goodBlock && st.lethalGood && !st.heldInstant && st.random && st.epsilon == 1 && !st.opening
                && st.v2 == s4.v2 && st.goodBlock == s4.goodBlock && st.lethalGood == s4.lethalGood
                && st.heldInstant == s4.heldInstant && st.random == s4.random && st.epsilon == s4.epsilon
                && st.closeCall == s4.closeCall && st.opening == s4.opening,
                "random4-them's random seat is random4's: random-v2 plus R8 made lethal-aware, no R9");
        final SearchPolicy.Limits lt = new SearchPolicy.Limits(0L, 0, 20_000, rt.untapped, rt.oracle,
                rt.rolloutOutletsUs(), rt.rolloutOutletsThem(), false, null, null, null,
                rt.rolloutRandomUs(), rt.rolloutRandomThem(), rt.rolloutRandomSeat());
        check(!lt.randomUs && lt.randomThem && lt.randomSeat.lethalGood && !lt.outletsUs && !lt.outletsThem && lt.line == null,
                "random4-them's rollout limits: playout seats the searching seat as plain Forge (RolloutController) and "
                        + "the opponent alone as RolloutController.Random on random-v4");
        final SearchPolicy.Limits ls = new SearchPolicy.Limits(0L, 0, 20_000, rs.untapped, rs.oracle,
                rs.rolloutOutletsUs(), rs.rolloutOutletsThem(), false, null, null, null,
                rs.rolloutRandomUs(), rs.rolloutRandomThem(), rs.rolloutRandomSeat());
        check(ls.randomUs && !ls.randomThem && lt.randomUs == ls.randomThem && lt.randomThem == ls.randomUs,
                "random4-them's seating is random-self's reversed");
        check(rt.toString().equals(v2.toString() + ",rollout=random4-them"), "the text is search-v2's plus rollout=random4-them: " + rt);
        configOnly("rrandom4-them", v2, rt, List.of("rollout"));
        configOnly("rrandom4-them vs rrandom4", r4, rt, List.of("rollout"));
        final String lcb40 = v2Text.replace(",margin=20,", ",margin=40,").replace(",seed=0,", ",seed=0,override=lcb,z=1,");
        final SearchConfig r4l = SearchConfig.parse(lcb40 + ",rollout=random4");
        final SearchConfig rtl = SearchConfig.parse(lcb40 + ",rollout=random4-them");
        configOnly("rrandom4them-lcb-m40 vs rrandom4-lcb-m40", r4l, rtl, List.of("rollout"));
        check(rtl.lcb && rtl.z == 1.0 && rtl.margin == 40 && !rtl.rolloutRandomUs() && rtl.rolloutRandomThem()
                && rtl.toString().equals(r4l.toString().replace(",rollout=random4", ",rollout=random4-them"))
                && rtl.toString().contains(",override=lcb,z=1,") && rtl.toString().endsWith(",anytime=1,rollout=random4-them"),
                "rrandom4them-lcb-m40 is rrandom4-lcb-m40's verdict (lcb, z 1, margin 40) with the opponent alone random: " + rtl);
        boolean liveRefused = false;
        try {
            SearchConfig.parseLive("rollout=random4-them");
        } catch (final IllegalArgumentException e) {
            liveRefused = e.getMessage().contains("measurement only");
        }
        check(liveRefused, "parseLive refuses rollout=random4-them although the searching seat is not random "
                + "(measurement only: the test is either seat)");
        for (final String r : List.of("default", "outlets", "both")) {
            boolean ok = true;
            try {
                SearchConfig.parseLive("rollout=" + r);
            } catch (final IllegalArgumentException e) {
                ok = false;
            }
            check(ok, "parseLive still takes rollout=" + r + " (its random test is either seat, and these seat none)");
        }
        boolean unknown = false;
        try {
            SearchConfig.parse("rollout=random5");
        } catch (final IllegalArgumentException e) {
            unknown = e.getMessage().contains("random4-them");
        }
        check(unknown, "an unknown rollout= is refused, naming random4-them");
    }

    /**
     * D533 (random-v9, pre-registered by D532 point 5): {@code rollout=mix4-them}, the search's rollouts taken by
     * turns, by round -- round 0 of a decision search-v2's Forge rollout (both seats plain Forge), round 1
     * {@code random4-them}'s (the opponent's seat random-v4, the searching seat plain Forge), round 2 Forge's, and so
     * on.  Checked on the config, on the {@link SearchPolicy.Limits} that {@code SearchPolicy.rollout} builds in each
     * round ({@code SearchPolicy.rolloutLimits}, the one place they are built), on the three counters' helpers over
     * synthetic leaves, and on the two arms' texts.  Also the guard that no other value's limits depend on the round:
     * every earlier value's rollouts are what they were before D533.
     */
    private static void rolloutMix4Them() {
        final String v2Text = "ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab,seed=0,anytime=1";
        final SearchConfig v2 = SearchConfig.parse(v2Text);
        final SearchConfig rt = SearchConfig.parse(v2Text + ",rollout=random4-them");
        final SearchConfig mx = SearchConfig.parse(v2Text + ",rollout=mix4-them");
        check(mx.rolloutMix() && !mx.rolloutRandomUs() && !mx.rolloutRandomThem() && !mx.rolloutOutletsUs()
                        && !mx.rolloutOutletsThem() && !rt.rolloutMix() && !v2.rolloutMix(),
                "mix4-them: a mix, and no seat random in every rollout (rolloutRandomUs and rolloutRandomThem false); "
                        + "no other value is a mix");
        check(!SearchConfig.mixRoundRandom(0) && SearchConfig.mixRoundRandom(1) && !SearchConfig.mixRoundRandom(2)
                        && SearchConfig.mixRoundRandom(3) && !SearchConfig.mixRoundRandom(10) && SearchConfig.mixRoundRandom(11),
                "mix4-them's kind by round index: round 0 Forge's, round 1 random4-them's, then alternating (10 Forge's, "
                        + "11 random)");
        check(!mx.rolloutRandomThemIn(0) && mx.rolloutRandomThemIn(1) && !mx.rolloutRandomThemIn(2)
                        && mx.rolloutRandomThemIn(3),
                "mix4-them's opponent seat: Forge in round 0 and 2, random in round 1 and 3");
        final ExploreMath.Config sm = mx.rolloutRandomSeat();
        final ExploreMath.Config st = rt.rolloutRandomSeat();
        check(sm.v2 == st.v2 && sm.goodBlock == st.goodBlock && sm.lethalGood == st.lethalGood
                        && sm.heldInstant == st.heldInstant && sm.random == st.random && sm.epsilon == st.epsilon
                        && sm.closeCall == st.closeCall && sm.opening == st.opening && sm.lethalGood && !sm.heldInstant,
                "mix4-them's random seat is random4-them's (random4's): random-v2 plus R8 made lethal-aware, no R9");
        final SearchPolicy.Limits l0 = SearchPolicy.rolloutLimits(mx, 0L, 0, null, 0);
        final SearchPolicy.Limits l1 = SearchPolicy.rolloutLimits(mx, 0L, 0, null, 1);
        final SearchPolicy.Limits l2 = SearchPolicy.rolloutLimits(mx, 0L, 0, null, 2);
        final SearchPolicy.Limits f0 = SearchPolicy.rolloutLimits(v2, 0L, 0, null, 0);
        final SearchPolicy.Limits t1 = SearchPolicy.rolloutLimits(rt, 0L, 0, null, 1);
        check(!l0.randomUs && !l0.randomThem && !l0.outletsUs && !l0.outletsThem && l0.line == null
                        && l0.randomUs == f0.randomUs && l0.randomThem == f0.randomThem,
                "round 0 of mix4-them is Forge's: the limits seat both players as search-v2's do (got randomUs "
                        + l0.randomUs + ", randomThem " + l0.randomThem + ")");
        check(!l1.randomUs && l1.randomThem && l1.randomSeat.lethalGood && !l1.outletsUs && !l1.outletsThem
                        && l1.randomUs == t1.randomUs && l1.randomThem == t1.randomThem,
                "round 1 of mix4-them is random4-them's: the opponent alone on random-v4 (got randomUs " + l1.randomUs
                        + ", randomThem " + l1.randomThem + ")");
        check(!l2.randomThem, "round 2 of mix4-them is Forge's again");
        boolean roundFree = true;
        final StringBuilder moved = new StringBuilder();
        for (final String r : SearchConfig.ROLLOUTS) {
            if ("mix4-them".equals(r)) {
                continue;
            }
            final SearchConfig c = SearchConfig.parse(v2Text + ",rollout=" + r);
            for (int round = 0; round < 4; round++) {
                final SearchPolicy.Limits l = SearchPolicy.rolloutLimits(c, 0L, 0, null, round);
                if (l.randomUs != c.rolloutRandomUs() || l.randomThem != c.rolloutRandomThem()
                        || l.outletsUs != c.rolloutOutletsUs() || l.outletsThem != c.rolloutOutletsThem()) {
                    roundFree = false;
                    moved.append(' ').append(r).append('@').append(round);
                }
            }
        }
        check(roundFree, "every value before D533 seats its rollouts as it did, in every round:" + moved);
        // the counters' helpers, on synthetic leaves: round 3 holds no leaf (every rollout failed)
        final double nan = Double.NaN;
        final List<double[]> leaves = List.of(new double[] {10, 30, nan}, new double[] {10, 0, 5},
                new double[] {20, 50, nan}, new double[] {nan, nan, nan}, new double[] {0, 10, nan});
        final Map<String, Integer> counts = new java.util.HashMap<>();
        final SearchPolicy.Sink sink = new SearchPolicy.Sink() {
            @Override
            public void add(final String key, final int n) {
                counts.merge(key, n, Integer::sum);
            }

            @Override
            public void event(final String text) {
                // nothing
            }
        };
        SearchPolicy.countMixRounds(leaves, sink);
        check(Integer.valueOf(3).equals(counts.get("search.mix.forgeRounds"))
                        && Integer.valueOf(1).equals(counts.get("search.mix.randomRounds"))
                        && Integer.valueOf(1).equals(counts.get("search.mix.decisions")),
                "mix rounds by kind: rounds 0, 2 and 4 Forge's, round 1 random, round 3 (no leaf) neither (" + counts + ")");
        counts.clear();
        SearchPolicy.countMixPairs(leaves, 1, sink);
        check(Integer.valueOf(3).equals(counts.get("search.mix.pairsForge")) && Integer.valueOf(60).equals(counts.get("search.mix.dForge"))
                        && Integer.valueOf(1).equals(counts.get("search.mix.pairsRandom"))
                        && Integer.valueOf(-10).equals(counts.get("search.mix.dRandom"))
                        && Integer.valueOf(1).equals(counts.get("search.mix.both"))
                        && Integer.valueOf(1).equals(counts.get("search.mix.disagree")),
                "mix pairs by kind for candidate 1: Forge's rounds +20 +30 +10, the random round -10, and they disagree ("
                        + counts + ")");
        counts.clear();
        SearchPolicy.countMixPairs(leaves, 2, sink);
        check(!counts.containsKey("search.mix.pairsForge") && Integer.valueOf(1).equals(counts.get("search.mix.pairsRandom"))
                        && Integer.valueOf(-5).equals(counts.get("search.mix.dRandom")) && !counts.containsKey("search.mix.both")
                        && !counts.containsKey("search.mix.disagree"),
                "mix pairs for candidate 2, scored in the random round alone: one random pair, no both, no disagree ("
                        + counts + ")");
        counts.clear();
        SearchPolicy.countMixPairs(leaves, 0, sink);
        SearchPolicy.countMixRollout(0, sink);
        SearchPolicy.countMixRollout(1, sink);
        SearchPolicy.countMixRollout(2, sink);
        check(counts.size() == 2 && Integer.valueOf(2).equals(counts.get("search.mix.forgeRollouts"))
                        && Integer.valueOf(1).equals(counts.get("search.mix.randomRollouts")),
                "Forge's own answer as best counts no pair; rollouts by their round's kind (" + counts + ")");
        // the texts: search-v2's plus the value; the two arms
        check(mx.toString().equals(v2.toString() + ",rollout=mix4-them"), "the text is search-v2's plus rollout=mix4-them: " + mx);
        configOnly("rmix4-them", v2, mx, List.of("rollout"));
        configOnly("rmix4-them vs rrandom4-them", rt, mx, List.of("rollout"));
        final String m40 = v2Text.replace(",margin=20,", ",margin=40,");
        final SearchConfig rt40 = SearchConfig.parse(m40 + ",rollout=random4-them");
        final SearchConfig mx40 = SearchConfig.parse(m40 + ",rollout=mix4-them");
        configOnly("rmix4them-m40 vs rrandom4them-m40", rt40, mx40, List.of("rollout"));
        configOnly("rmix4them-m40 vs rmix4them", mx, mx40, List.of("margin"));
        check(!mx40.lcb && mx40.margin == 40 && !mx.lcb && mx.margin == 20
                        && mx40.toString().equals(rt40.toString().replace(",rollout=random4-them", ",rollout=mix4-them"))
                        && mx40.toString().endsWith(",anytime=1,rollout=mix4-them") && !mx40.toString().contains("override="),
                "rmix4them-m40 is rrandom4them-m40 (the margin rule at 40) with the rollout value alone changed: " + mx40);
        boolean liveRefused = false;
        try {
            SearchConfig.parseLive("rollout=mix4-them");
        } catch (final IllegalArgumentException e) {
            liveRefused = e.getMessage().contains("measurement only");
        }
        check(liveRefused, "parseLive refuses rollout=mix4-them (measurement only), although no seat is random in "
                + "every rollout");
        boolean liveDefault = true;
        try {
            SearchConfig.parseLive("rollout=default");
        } catch (final IllegalArgumentException e) {
            liveDefault = false;
        }
        check(liveDefault, "parseLive still takes rollout=default");
        boolean unknown = false;
        try {
            SearchConfig.parse("rollout=mix5");
        } catch (final IllegalArgumentException e) {
            unknown = e.getMessage().contains("mix4-them") && e.getMessage().contains("random4-them");
        }
        check(unknown, "an unknown rollout= is refused, naming mix4-them (and random4-them)");
    }

    /** D517: of {@link SearchConfig}'s public instance fields, exactly {@code only} differ between {@code a} and {@code b}. */
    private static void configOnly(final String what, final SearchConfig a, final SearchConfig b, final List<String> only) {
        int compared = 0;
        final List<String> differ = new ArrayList<>();
        for (final java.lang.reflect.Field f : SearchConfig.class.getFields()) {
            if (java.lang.reflect.Modifier.isStatic(f.getModifiers())) {
                continue;
            }
            compared++;
            try {
                if (!java.util.Objects.equals(f.get(a), f.get(b))) {
                    differ.add(f.getName());
                }
            } catch (final IllegalAccessException e) {
                differ.add(f.getName() + "?");
            }
        }
        check(compared >= 25 && new java.util.TreeSet<>(differ).equals(new java.util.TreeSet<>(only)),
                what + ": of " + compared + " config fields only " + only + " differ: " + differ);
    }

    private static double[] rpDiff(final List<double[]> leaves, final int k) {
        final SearchPolicy.Report r = new SearchPolicy.Report();
        SearchPolicy.Report.fillStats(r, leaves, List.of(), k);
        return r.diffLeaf;
    }

    /** D451: the random seat's settings, its guardrail counters and the atlas's branch seeds, without the engine. */
    private static void randomSeat() {
        final ExploreMath.Config r = ExploreMath.Config.randomSeat();
        check(r.random && r.epsilon == 1 && r.closeCall == 0 && !r.opening, "the random seat is epsilon 1, no close calls, opening off");
        final java.util.Map<String, Object> job = new java.util.HashMap<>();
        job.put("random", Boolean.TRUE);
        job.put("epsilon", 0.05);
        check(ExploreMath.Config.of(job).random && ExploreMath.Config.of(job).epsilon == 1, "a job's random:true is the random seat, whatever else it says");
        check(!new ExploreMath.Config(0.05, 0.02, true).random, "D358's exploration is not the random seat");
        boolean threw = false;
        try {
            new ExploreMath.Config(0.5, 0, false, true);
        } catch (final IllegalArgumentException e) {
            threw = true;
        }
        check(threw, "a random seat with epsilon below 1 is refused");
        final ExploreMath m = new ExploreMath(r, 9);
        m.guardrail("land");
        m.guardrail("land");
        m.guardrail("keep");
        check(m.guardrails().get("land") == 2 && m.guardrails().get("keep") == 1, "the guardrails are counted by name");
        // G5 (D458): a play the engine refused is not offered again in the same priority window, and is counted
        final Explorer ex = new Explorer(m);
        final String w5 = Explorer.windowKey(8, "MAIN1", 0, -1, 3);
        ex.noteRefused(w5, "cast:18");
        final java.util.Map<String, Object> opts = new java.util.LinkedHashMap<>();
        for (final String t : List.of("pass", "cast:18", "activate:145")) {
            opts.put(t, null);
        }
        check(Explorer.dropRefused(opts, ex.refusedIn(w5), m) == 1 && !opts.containsKey("cast:18")
                && opts.keySet().equals(new java.util.LinkedHashSet<>(List.of("pass", "activate:145"))),
                "G5: the refused cast is left out at the next decision of its window, the rest kept");
        boolean repicked = false;
        for (int i = 0; i < 200; i++) {
            final java.util.Map<String, Object> again = new java.util.LinkedHashMap<>();
            for (final String t : List.of("pass", "cast:18", "activate:145")) {
                again.put(t, null);
            }
            Explorer.dropRefused(again, ex.refusedIn(w5), m);
            repicked |= "cast:18".equals(new ArrayList<>(again.keySet()).get(m.pick(again.size())));
        }
        check(!repicked, "G5: 200 random picks in the window never take the refused cast again");
        final java.util.Map<String, Object> alone = new java.util.LinkedHashMap<>();
        alone.put("cast:18", null);
        check(Explorer.dropRefused(alone, ex.refusedIn(w5), m) == 0 && alone.containsKey("cast:18"),
                "G5 never removes the last option (as G3)");
        check(m.guardrails().get("refusedCast") == 1 && m.guardrails().get("noRepeatRefused") == 201,
                "G5 counts the refused pick once and each removal: " + m.guardrails());
        final java.util.Map<String, Object> later = new java.util.LinkedHashMap<>();
        later.put("pass", null);
        later.put("cast:18", null);
        check(ex.refusedIn(Explorer.windowKey(8, "MAIN1", 1, 301, 3)).isEmpty() && Explorer.dropRefused(later, ex.refusedIn(Explorer.windowKey(8, "MAIN1", 1, 301, 3)), m) == 0
                && later.containsKey("cast:18"), "G5: another window (the stack moved) offers the play again");
        check(ex.refusedIn(w5).isEmpty(), "G5: a window left is forgotten");
        // D462 (the #177 review): a land drop is another window -- more mana, so the refused cast is offered again
        ex.noteRefused(w5, "cast:18");
        final String afterLand = Explorer.windowKey(8, "MAIN1", 0, -1, 4);
        final java.util.Map<String, Object> landed = new java.util.LinkedHashMap<>();
        landed.put("pass", null);
        landed.put("cast:18", null);
        check(!afterLand.equals(w5) && ex.refusedIn(afterLand).isEmpty()
                && Explorer.dropRefused(landed, ex.refusedIn(afterLand), m) == 0 && landed.containsKey("cast:18"),
                "G5: a land drop (the same turn, phase and stack) is another window, and offers the refused cast again");
        g5Planted(r);
        g6Planted(r);
        staleTargetsPlanted(r);
        cardTargetsPlanted(r);
        targetCostsPlanted(r);
        optionalCosts();
        payCap();
        stepClock();
        decisionClock();
        searchStepClock();
        searchUnavailable();
        forcedUnanswered();
        // branch i of every option shares its seed; branches, decisions and atlases differ
        final long b = Atlas.branchSeed(451, 3, 7);
        check(b == Atlas.branchSeed(451, 3, 7) && b >= 0, "a branch seed is a function of (atlas seed, decision, branch)");
        check(b != Atlas.branchSeed(451, 3, 8) && b != Atlas.branchSeed(451, 4, 7) && b != Atlas.branchSeed(452, 3, 7),
                "branch seeds differ by branch, decision and atlas");
    }

    /**
     * D467: the branch kill, planted without the engine.  A "step" that never
     * comes back -- it fires events forever, as the Ocelot Pride cascade fires
     * a zone change per token -- posting to a Guava {@code EventBus} built as
     * {@code forge.game.Game} builds its own ({@code new EventBus("game
     * events")}), with a nested post inside dispatch as Forge's handlers make,
     * and a {@link Atlas.StepClock} subscribed: the clock must throw the step
     * out soon after its deadline, through {@code post}.  Its controls: an
     * {@code Exception} from a subscriber does NOT reach the poster (Guava logs
     * and swallows it -- why the clock throws an {@code Error}); a disarmed
     * clock throws nothing; the clock's throw is found inside a Forge wrapper.
     * The planted step is bounded at 10 s, so a clock that never fires fails
     * this check instead of hanging the build.
     */
    private static void stepClock() {
        final com.google.common.eventbus.EventBus bus = new com.google.common.eventbus.EventBus("game events");
        bus.register(new Object() {
            @com.google.common.eventbus.Subscribe
            public void nest(final Integer token) {
                bus.post("entered " + token);   // a handler that fires another event, queued inside this dispatch
            }
        });
        bus.post(Integer.valueOf(-1));   // Guava's classes loaded before the clock starts
        final long t0 = System.nanoTime();
        final Atlas.StepClock clock = new Atlas.StepClock(t0 + 100_000_000L);   // 100 ms
        bus.register(clock);
        long posted = 0;
        Atlas.BranchTimeout caught = null;
        try {
            while (System.nanoTime() - t0 < 10_000_000_000L) {
                bus.post(Integer.valueOf((int) posted));
                posted++;
            }
        } catch (final Atlas.BranchTimeout e) {
            caught = e;
        }
        final long ms = (System.nanoTime() - t0) / 1_000_000L;
        check(caught != null && ms < 2_000 && posted > 0 && clock.events > posted,
                "D467: a step that never comes back is thrown out by the clock through EventBus.post (" + ms + " ms, "
                        + posted + " posts, " + clock.events + " events read)");
        check(caught != null && caught.getStackTrace().length == 0 && caught.getMessage().contains("inside one engine step"),
                "D467: the clock's throw names where the deadline passed, without a stack trace");
        // control: a subscriber's Exception never reaches the poster -- the reason the clock is an Error
        final com.google.common.eventbus.EventBus quiet = new com.google.common.eventbus.EventBus("d467 control");
        java.util.logging.Logger.getLogger(com.google.common.eventbus.EventBus.class.getName() + ".d467 control")
                .setLevel(java.util.logging.Level.OFF);
        quiet.register(new Object() {
            @com.google.common.eventbus.Subscribe
            public void refuse(final Object e) {
                throw new IllegalStateException("swallowed");
            }
        });
        boolean reached = false;
        try {
            quiet.post("x");
        } catch (final RuntimeException e) {
            reached = true;
        }
        check(!reached, "D467's control: Guava swallows a subscriber's Exception, so a RuntimeException could never end a step");
        clock.disarm();
        boolean threw = false;
        try {
            bus.post(Integer.valueOf(-1));
        } catch (final Atlas.BranchTimeout e) {
            threw = true;
        }
        check(!threw, "D467: a disarmed clock lets the copy end (setGameOver, the recorders' last frames) past its deadline");
        check(caught != null && Atlas.timeoutIn(new RuntimeException("AbilityFactory:getAbility: crash", caught)) == caught
                && Atlas.timeoutIn(new RuntimeException("an engine bug")) == null,
                "D467: the clock's throw is found inside a Forge wrapper, and only there");
    }

    /**
     * D484: the branch's deadline read at a decision, and the repeated-record
     * cap, planted without the engine in the shape that hung J167's spine s05 --
     * Forge 2.0.14's {@code ChooseSourceEffect.resolve} loop, {@code do { o =
     * chooser.choose() } while (o == null || o.getName().startsWith("--"))},
     * around a chooser that always answers null and fires no event, so D467's
     * step clock never reads.  The chooser enters the callback as
     * {@link AtlasController}'s overrides do ({@link DecisionClock#due}) and
     * writes its record through the capping sink, as
     * {@code PolicyControllerAi.chooseSingleEntityForEffect} does.  The engine
     * half -- a real Circle of Protection: Green resolving through the guard --
     * is {@code tools/ai-bench.sh --selftest}'s "choose source" cases.
     */
    private static void decisionClock() {
        // 1. the deadline: no recorder, so only the clock can end the loop
        final DecisionClock dl = new DecisionClock();
        final long t0 = System.nanoTime();
        dl.arm(t0 + 100_000_000L);   // 100 ms
        Atlas.BranchTimeout caught = null;
        long asked = 0;
        try {
            String o;
            do {
                dl.due("chooseSingleEntityForEffect");
                asked++;
                o = null;   // the planted chooser: always null, never an event
                if (System.nanoTime() - t0 > 10_000_000_000L) {
                    break;   // the self-test's own bound: a regression fails here instead of hanging the build
                }
            } while (o == null || o.startsWith("--"));
        } catch (final Atlas.BranchTimeout e) {
            caught = e;
        }
        final long ms = (System.nanoTime() - t0) / 1_000_000L;
        check(caught != null && ms < 2_000 && asked > 0 && dl.asks() == asked + 1,
                "D484: a question re-asked forever with no event ends at the deadline, at a decision (" + ms + " ms, "
                        + asked + " asks)");
        check(caught != null && caught.getStackTrace().length == 0 && caught.getMessage().contains("at a decision")
                && caught.getMessage().contains("chooseSingleEntityForEffect")
                && Atlas.timeoutIn(new RuntimeException("wrapped", caught)) == caught,
                "D484: the deadline's throw names the callback, without a stack trace, and is found as D467's is");
        dl.disarm();
        boolean threw = false;
        try {
            dl.due("confirmAction");
        } catch (final Atlas.BranchTimeout e) {
            threw = true;
        }
        check(!threw, "D484: a disarmed decision clock lets the copy end past its deadline");

        // 2. the cap: the same record at the same stateSeq, a deadline an hour away
        final int[] written = new int[1];
        final List<String> revealed = new ArrayList<>();
        final DecisionSink inner = new DecisionSink() {
            @Override
            public int[] mark() {
                return new int[] {17, 12};
            }

            @Override
            public int write(final Decision d, final int[] mark) {
                return written[0]++;
            }

            @Override
            public void forced(final String kind) { }

            @Override
            public void cost(final long nanos) { }

            @Override
            public void error(final String where, final RuntimeException e) { }

            @Override
            public void reveal(final int[] cardIds, final String zone, final Integer owner) {
                revealed.add(java.util.Arrays.toString(cardIds) + " " + zone + " " + owner);
            }
        };
        final DecisionClock cc = new DecisionClock();
        cc.arm(System.nanoTime() + 3_600_000_000_000L);
        final DecisionSink capped = cc.capping(inner);
        check(cc.capping(null) == null, "D484: no recorder, no capping sink");
        // D496: a reveal passes through the cap to the recorder, unchanged and uncounted
        for (int k = 0; k < 2 * DecisionClock.REPEAT_CAP; k++) {
            capped.reveal(new int[] {59}, "library", 1);
        }
        check(revealed.size() == 2 * DecisionClock.REPEAT_CAP && "[59] library 1".equals(revealed.get(0)) && written[0] == 0,
                "D496: the capping sink hands every reveal to its recorder and counts none against the cap ("
                        + revealed.size() + " reveals)");
        Atlas.BranchTimeout capThrow = null;
        int loops = 0;
        try {
            String o;
            do {
                cc.due("chooseSingleEntityForEffect");
                loops++;
                o = "--PERMANENTS:--";   // the planted chooser's answer: the divider, as ChooseSourceAi gives it
                capped.write(divider(), capped.mark());
                if (loops > 100_000) {
                    break;
                }
            } while (o == null || o.startsWith("--"));
        } catch (final Atlas.BranchTimeout e) {
            capThrow = e;
        }
        check(capThrow != null && loops == DecisionClock.REPEAT_CAP && written[0] == DecisionClock.REPEAT_CAP - 1,
                "D484: the " + DecisionClock.REPEAT_CAP + "th identical record at one stateSeq ends the loop (" + loops
                        + " asks, " + written[0] + " written)");
        check(capThrow != null && capThrow.getMessage().contains("choice") && capThrow.getMessage().contains("option:hidden")
                && capThrow.getMessage().contains("stateSeq 12") && capThrow.getMessage().contains(DecisionClock.REPEAT_CAP + " times"),
                "D484: the cap's throw names the repeated ask: " + (capThrow == null ? null : capThrow.getMessage()));
        // controls: a new stateSeq, another record, or a disarmed clock starts the count again
        final DecisionClock ok = new DecisionClock();
        ok.arm(System.nanoTime() + 3_600_000_000_000L);
        boolean fired = false;
        try {
            for (int k = 0; k < 5 * DecisionClock.REPEAT_CAP; k++) {
                ok.repeated(divider(), new int[] {17, 12 + k / (DecisionClock.REPEAT_CAP - 1)});
            }
            for (int k = 0; k < 5 * DecisionClock.REPEAT_CAP; k++) {
                final Decision d = divider();
                if (k % 2 == 0) {
                    d.chosen = "option:52";
                }
                ok.repeated(d, new int[] {17, 99});
            }
            ok.disarm();
            for (int k = 0; k < 5 * DecisionClock.REPEAT_CAP; k++) {
                ok.repeated(divider(), new int[] {17, 100});
            }
        } catch (final Atlas.BranchTimeout e) {
            fired = true;
        }
        check(!fired, "D484's controls: a new stateSeq, a different record or a disarmed clock never reaches the cap");
    }

    /** D484: the record J167's s05 wrote 20,000 times a second: the divider chosen among two cards. */
    private static Decision divider() {
        final Decision d = new Decision("choice", 4, "MAIN2");
        d.options.addAll(List.of("option:52", "option:74", "option:hidden"));
        d.chosen = "option:hidden";
        d.source = "entity";
        return d;
    }

    /**
     * D468: the search's playout under D467's clock, planted without the
     * engine.  The same never-returning step as {@link #stepClock} (a bus built
     * as Forge builds its own, posting forever with a nested post), inside the
     * shape {@code SearchPolicy.playout} has around its copy -- the clock
     * subscribed to the bus, {@code catch (Atlas.BranchTimeout |
     * RuntimeException)} into {@link SearchPolicy#stepTimedOut}, null on a
     * timeout and a rethrow otherwise, the disarm in {@code finally}.  Three
     * throws: the clock's own, the clock's inside Forge's
     * {@code AbilityFactory} wrapper (and inside the playout's own
     * {@code CandidateUnmappable}), and an engine bug, which must still reach
     * the caller and count nothing.  The engine half -- the real playout, a
     * real copy -- is {@code tools/ai-bench.sh selftest}'s "step clock" case.
     */
    private static void searchStepClock() {
        final Map<String, Integer> counts = new java.util.HashMap<>();
        final SearchPolicy.Sink sink = new SearchPolicy.Sink() {
            @Override
            public void add(final String key, final int n) {
                counts.merge(key, n, Integer::sum);
            }

            @Override
            public void event(final String text) {
                // nothing
            }
        };
        final long t0 = System.nanoTime();
        final Object[] direct = plantedPlayout(sink, false, 0);
        final long ms = (System.nanoTime() - t0) / 1_000_000L;
        check(direct[0] == null && "answered".equals(direct[1]) && ms < 2_000,
                "D468: a playout step that never comes back is ended by the clock and answered null, never thrown ("
                        + ms + " ms)");
        check(Integer.valueOf(1).equals(counts.get("search.stepTimeouts")) && !counts.containsKey("search.prior.stepTimeouts"),
                "D468: and counted once, as search.stepTimeouts (" + counts + ")");
        final Object[] wrapped = plantedPlayout(sink, true, 1);
        final Object[] unmappable = plantedPlayout(sink, false, 2);
        check(wrapped[0] == null && "answered".equals(wrapped[1]) && unmappable[0] == null && "answered".equals(unmappable[1])
                        && Integer.valueOf(1).equals(counts.get("search.prior.stepTimeouts"))
                        && Integer.valueOf(2).equals(counts.get("search.stepTimeouts")),
                "D468: the clock's throw inside AbilityFactory's RuntimeException, or the playout's CandidateUnmappable, "
                        + "is the same timeout, under the prior's key for the ranking's playouts (" + counts + ")");
        final Object[] bug = plantedPlayout(sink, false, 3);
        check("thrown".equals(bug[1]) && bug[0] instanceof IllegalStateException
                        && Integer.valueOf(2).equals(counts.get("search.stepTimeouts")),
                "D468's control: an engine bug in a step is no timeout -- rethrown to the caller's catch, counted nowhere");
    }

    /**
     * D470's follow-up (the cloud's LOW on #191): a forced combat answer the
     * copy cannot give reaches the search's callers as a rollout error, and
     * {@link SearchPolicy#countUnavailable} -- what {@code playout}'s catch
     * calls before it rethrows -- counts it once more under its own key, found
     * through the cause chain as the step clock's throw is.  An engine bug
     * counts nothing there.
     */
    private static void searchUnavailable() {
        final Map<String, Integer> counts = new java.util.HashMap<>();
        final SearchPolicy.Sink sink = new SearchPolicy.Sink() {
            @Override
            public void add(final String key, final int n) {
                counts.merge(key, n, Integer::sum);
            }

            @Override
            public void event(final String text) {
                // nothing
            }
        };
        final RuntimeException gone = new RolloutController.OptionUnavailable("the forced block's attacker is not attacking");
        final boolean direct = SearchPolicy.countUnavailable(gone, sink, false);
        final boolean wrapped = SearchPolicy.countUnavailable(new RuntimeException("a Forge wrapper", gone), sink, true);
        final boolean bug = SearchPolicy.countUnavailable(new IllegalStateException("an engine bug"), sink, false);
        check(direct && wrapped && !bug && Integer.valueOf(1).equals(counts.get("search.unavailable"))
                        && Integer.valueOf(1).equals(counts.get("search.prior.unavailable")) && counts.size() == 2,
                "D470: an unavailable forced answer is counted as search.unavailable (the prior's key for the ranking), "
                        + "wrapped or not; an engine bug is not (" + counts + ")");
    }

    /**
     * D477: a fork whose game Karn restarts asks its forcing controller whether
     * the forced answer is still to be given ({@link RolloutForcing#unanswered});
     * if it is, the option was never played in that copy and is unavailable.
     * Nothing forced is never unanswered (a mulligan candidate, Forge's own answer).
     */
    private static void forcedUnanswered() {
        final RolloutController.Forced none = new RolloutController.Forced();
        final RolloutController.Forced pass = new RolloutController.Forced();
        pass.priority(null);
        check(!none.unanswered() && pass.unanswered(),
                "D477: a forced answer armed and not given is unanswered; nothing forced is not ("
                        + none.unanswered() + ", " + pass.unanswered() + ")");
    }

    /**
     * {@link #searchStepClock}'s planted playout: {@code how} 0 lets the clock's
     * throw out as itself, 1 wraps it as AbilityFactory does, 2 as the
     * playout's {@code CandidateUnmappable}, and 3 throws an engine bug instead,
     * 50 ms in, before the deadline.  Returns {answer or thrown, "answered" |
     * "thrown"}; bounded at 10 s, so a clock that never fires fails the check.
     */
    private static Object[] plantedPlayout(final SearchPolicy.Sink sink, final boolean prior, final int how) {
        final com.google.common.eventbus.EventBus bus = new com.google.common.eventbus.EventBus("game events");
        bus.register(new Object() {
            @com.google.common.eventbus.Subscribe
            public void nest(final Integer token) {
                bus.post("entered " + token);
            }
        });
        bus.post(Integer.valueOf(-1));
        final long t0 = System.nanoTime();
        final long deadline = t0 + 100_000_000L;   // 100 ms
        Atlas.StepClock clock = null;
        try {
            try {
                clock = new Atlas.StepClock(deadline);
                bus.register(clock);
                long posted = 0;
                while (System.nanoTime() - t0 < 10_000_000_000L) {
                    if (how == 3 && System.nanoTime() > t0 + 50_000_000L) {   // before the deadline: no timeout in flight
                        throw new IllegalStateException("an engine bug");
                    }
                    try {
                        bus.post(Integer.valueOf((int) posted++));
                    } catch (final Error e) {
                        if (how == 1) {
                            throw new RuntimeException("AbilityFactory:getAbility: crash", e);   // Forge's one catch of Error
                        }
                        if (how == 2) {
                            throw new SearchPolicy.CandidateUnmappable(e);
                        }
                        throw e;
                    }
                }
                return new Object[] {"ran past", "answered"};
            } catch (final Atlas.BranchTimeout | RuntimeException e) {
                if (SearchPolicy.stepTimedOut(e, sink, prior)) {
                    return new Object[] {null, "answered"};
                }
                throw e;
            } finally {
                if (clock != null) {
                    clock.disarm();
                }
            }
        } catch (final RuntimeException e) {
            return new Object[] {e, "thrown"};
        }
    }

    /**
     * D466: G5's count, planted the way the engine runs it -- the refusal and
     * the seat's next priority in one window (the same turn, phase, stack and
     * lands, so the same {@link Explorer#windowKey}).  When the next listing
     * still holds the refused play, it is left out and counted once; J156's
     * 0 of 4,942 was the other case, the listing no longer holding it, because
     * the refused cast had left its card in the Stack zone (PolicyControllerAi's
     * putBack), which counts nothing.
     */
    private static void g5Planted(final ExploreMath.Config r) {
        final ExploreMath m = new ExploreMath(r, 11);
        final Explorer ex = new Explorer(m);
        final String atRefusal = Explorer.windowKey(6, "MAIN1", 0, -1, 4);
        ex.noteRefused(atRefusal, "cast:77");
        final String nextPriority = Explorer.windowKey(6, "MAIN1", 0, -1, 4);
        final java.util.Map<String, Object> listed = new java.util.LinkedHashMap<>();
        for (final String t : List.of("pass", "cast:77", "cast:81")) {
            listed.put(t, null);
        }
        final int left = Explorer.dropRefused(listed, ex.refusedIn(nextPriority), m);
        check(left == 1 && !listed.containsKey("cast:77") && m.guardrails().get("refusedCast") == 1
                && m.guardrails().get("noRepeatRefused") == 1,
                "G5 planted: a refusal, then a same-window decision that still lists the play, counts 1: " + m.guardrails());
        final ExploreMath m2 = new ExploreMath(r, 12);
        final Explorer ex2 = new Explorer(m2);
        ex2.noteRefused(atRefusal, "cast:77");
        final java.util.Map<String, Object> stranded = new java.util.LinkedHashMap<>();
        for (final String t : List.of("pass", "cast:81")) {
            stranded.put(t, null);   // the refused card stranded in the Stack zone: the listing no longer holds it
        }
        check(Explorer.dropRefused(stranded, ex2.refusedIn(nextPriority), m2) == 0
                && m2.guardrails().getOrDefault("noRepeatRefused", 0) == 0,
                "G5 planted: with the refused card gone from the listing, nothing is left out (J156's 0 of 4,942)");
    }

    /**
     * D486: the random seat's own targets come from every candidate, cards
     * included.  Planted: a "target creature" part (Murder) with the engine's
     * candidates as {@code getAllCandidates(s, false)} lists them -- the two
     * players are not among them (a creature part), the opponent's Grizzly
     * Bears, a hexproof Gladecover Scout and a White Knight with protection from
     * black (both refused by {@code canTarget}), and a card in the opponent's
     * hand the seat cannot see.  The old call, {@code getAllCandidates(s, true)},
     * returned the players alone -- here none -- so the part had nothing to draw
     * and the play was never offered.  Then the counts a part and a modal spell
     * may take.
     */
    private static void cardTargetsPlanted(final ExploreMath.Config r) {
        final java.util.Set<String> hidden = java.util.Set.of("hand12");
        final java.util.Set<String> refused = java.util.Set.of("gladecover31", "whiteknight32");
        final List<String> all = List.of("bears30", "gladecover31", "whiteknight32", "hand12");
        final List<String> got = Explorer.keepLegal(all, e -> !hidden.contains(e), e -> !refused.contains(e));
        check(List.of("bears30").equals(got),
                "D486: Murder's candidates are the Bears alone -- hexproof and protection refused, the hidden hand card unseen: " + got);
        final List<String> withPlayers = Explorer.keepLegal(List.of("p0", "p1", "bears30", "gladecover31"), e -> true,
                e -> !refused.contains(e));
        check(List.of("p0", "p1", "bears30").equals(withPlayers),
                "D486: an \"any target\" part keeps both players and the Bears, in the engine's order: " + withPlayers);
        final List<String> playersOnly = Explorer.keepLegal(List.<String>of(), e -> true, e -> true);
        check(Explorer.targetCount(1, 1, playersOnly.size()) == null && Explorer.targetCount(1, 1, got.size()) != null,
                "D486: with the old players-only list a creature part has nothing to draw (not offered); with the cards it has the Bears");
        check(java.util.Arrays.equals(Explorer.targetCount(1, 1, 3), new int[] {1, 1})
                        && java.util.Arrays.equals(Explorer.targetCount(1, 2, 5), new int[] {1, 2})
                        && java.util.Arrays.equals(Explorer.targetCount(0, 2, 5), new int[] {1, 2})
                        && java.util.Arrays.equals(Explorer.targetCount(0, 1, 0), new int[] {0, 0})
                        && java.util.Arrays.equals(Explorer.targetCount(0, 0, 4), new int[] {0, 0})
                        && Explorer.targetCount(2, 2, 1) == null && Explorer.targetCount(1, 1, 0) == null,
                "D486: a part takes max(min, 1) to min(max, legal) targets; none when it may and has none (or max 0); "
                        + "null below its minimum");
        check(java.util.Arrays.equals(Explorer.modeCount(1, 1, 2), new int[] {1, 1})
                        && java.util.Arrays.equals(Explorer.modeCount(1, 2, 2), new int[] {1, 2})
                        && java.util.Arrays.equals(Explorer.modeCount(0, 2, 2), new int[] {1, 2})
                        && java.util.Arrays.equals(Explorer.modeCount(1, 3, 2), new int[] {1, 2})
                        && Explorer.modeCount(1, 1, 0) == null && Explorer.modeCount(2, 2, 1) == null,
                "D486: a modal spell takes max(min, 1) to min(num, legal modes) modes; null with fewer legal modes than its "
                        + "minimum (s05's Suplex with no creature or artifact: never offered)");
        // the count is a seeded uniform draw over the range, so a part of up to two targets takes each count sometimes
        final ExploreMath m = new ExploreMath(r, 486);
        final int[] seen = new int[3];
        for (int i = 0; i < 200; i++) {
            final int[] range = Explorer.targetCount(0, 2, 4);
            seen[range[0] + m.pick(range[1] - range[0] + 1)]++;
        }
        check(seen[0] == 0 && seen[1] > 0 && seen[2] > 0,
                "D486: \"up to two targets\" takes one or two, never none: " + seen[0] + "/" + seen[1] + "/" + seen[2]);
    }

    /**
     * D485: a stale targeting part made legal before the cast
     * ({@link Explorer#legalTargetList}), planted as J168 found it: Troll
     * Negotiations' "creature you control" part (one target) carrying the
     * viewer's dead Spider Token and a live Fractal Token, because Forge's
     * {@code FightAi} appends one at every evaluation.  The engine's
     * {@code MagicStack.add} refuses a count above the maximum and drops the
     * spell after the payment, so: the dead one goes, a live one stays, and the
     * part is never over its maximum or under its minimum; an over-full list of
     * live targets is cut to one by a seeded draw (each kept sometimes); a part
     * with nothing legal left is filled from the legal targets, or refused
     * (null) when there are none; Tear Asunder's kicker-only part (max 0,
     * unkicked) is emptied; an empty part with a minimum of one (Headliner
     * Scarlett's {@code [[]]}) is filled.
     */
    /**
     * D488: a target count the seat cannot pay for is cut toward each part's
     * floor until it can ({@link Explorer#trimToPayable}).  Fireball's part,
     * eight targets drawn with mana for X and two targets ("{1} more for each
     * target beyond the first"): cut to two, the first two kept, each of the
     * others dropped sometimes; already payable: untouched and no draw; at its
     * floor and still not: -1 (the play is not offered); two parts: the cut
     * never takes a part below its floor; the cut is seeded.
     */
    private static void targetCostsPlanted(final ExploreMath.Config r) {
        final List<String> eight = List.of("p0", "p1", "c3", "c5", "c8", "c13", "c21", "c34");
        final java.util.function.Function<List<List<String>>, java.util.function.BooleanSupplier> upTo = (ls) -> () -> {
            int n = 0;
            for (final List<String> l : ls) {
                n += l.size();
            }
            return n <= 2;
        };
        final java.util.Set<String> dropped = new java.util.TreeSet<>();
        boolean allTwo = true;
        boolean firstKept = true;
        for (long seed = 1; seed <= 60; seed++) {
            final List<List<String>> ls = List.of(new ArrayList<>(eight));
            final int t = Explorer.trimToPayable(ls, List.of(1), upTo.apply(ls), new ExploreMath(r, seed));
            allTwo &= t == 1 && ls.get(0).size() == 2;
            firstKept &= "p0".equals(ls.get(0).get(0));
            final java.util.Set<String> gone = new java.util.TreeSet<>(eight);
            gone.removeAll(ls.get(0));
            dropped.addAll(gone);
        }
        check(allTwo && firstKept && dropped.equals(new java.util.TreeSet<>(eight.subList(1, 8))),
                "D488: Fireball's eight targets with mana for two are cut to two (60 seeds), the part's floor kept, every "
                        + "other target dropped sometimes: dropped " + dropped);
        final ExploreMath quiet = new ExploreMath(r, 5);
        final ExploreMath twin = new ExploreMath(r, 5);
        final List<List<String>> two = List.of(new ArrayList<>(List.of("p1", "c3")));
        check(Explorer.trimToPayable(two, List.of(1), upTo.apply(two), quiet) == 0 && two.get(0).size() == 2
                        && quiet.pick(1000) == twin.pick(1000),
                "D488: a payable count is untouched and draws nothing from the seat's stream");
        final List<List<String>> never = List.of(new ArrayList<>(List.of("p1", "c3", "c5")));
        check(Explorer.trimToPayable(never, List.of(1), () -> false, new ExploreMath(r, 6)) == -1 && never.get(0).size() == 1,
                "D488: at its floor and still unpayable: -1, the play is not offered");
        boolean floors = true;
        for (long seed = 1; seed <= 40; seed++) {
            final List<List<String>> ps = List.of(new ArrayList<>(List.of("a1", "a2", "a3")), new ArrayList<>(List.of("b1", "b2")));
            final java.util.function.BooleanSupplier small = () -> ps.get(0).size() + ps.get(1).size() <= 3;
            final int t = Explorer.trimToPayable(ps, List.of(1, 2), small, new ExploreMath(r, seed));
            floors &= t == 1 && ps.get(1).size() == 2 && ps.get(0).size() == 1;
        }
        check(floors, "D488: two parts, the second at its floor of 2: only the first is cut, to 1");
        final List<List<String>> a = List.of(new ArrayList<>(eight));
        final List<List<String>> b = List.of(new ArrayList<>(eight));
        Explorer.trimToPayable(a, List.of(1), upTo.apply(a), new ExploreMath(r, 88));
        Explorer.trimToPayable(b, List.of(1), upTo.apply(b), new ExploreMath(r, 88));
        check(a.equals(b), "D488: the cut is seeded: " + a + " / " + b);
    }

    private static void staleTargetsPlanted(final ExploreMath.Config r) {
        final ExploreMath m = new ExploreMath(r, 31);
        final java.util.Set<String> alive = java.util.Set.of("fractal139", "bears48", "moose57", "rabbit78");
        final java.util.function.Predicate<String> legal = alive::contains;
        final List<String> fill = List.of("bears48", "fractal139", "moose57");
        check(List.of("fractal139").equals(Explorer.legalTargetList(List.of("spider121", "fractal139"), legal, fill, 1, 1, m)),
                "D485: J168's Troll Negotiations part [dead Spider Token, Fractal Token] keeps the live one alone");
        final int[] seen = new int[3];
        boolean bad = false;
        final List<String> three = List.of("bears48", "moose57", "rabbit78");
        for (int i = 0; i < 300; i++) {
            final List<String> got = Explorer.legalTargetList(three, legal, fill, 1, 1, m);
            bad |= got == null || got.size() != 1 || !three.contains(got.get(0));
            if (got != null && got.size() == 1 && three.contains(got.get(0))) {
                seen[three.indexOf(got.get(0))]++;
            }
        }
        check(!bad && seen[0] > 0 && seen[1] > 0 && seen[2] > 0,
                "D485: an over-full list of live targets (3 for a maximum of 1) is cut to one, each kept sometimes: "
                        + seen[0] + "/" + seen[1] + "/" + seen[2]);
        final List<String> refilled = Explorer.legalTargetList(List.of("spider121"), legal, fill, 1, 1, m);
        check(refilled != null && refilled.size() == 1 && fill.contains(refilled.get(0)),
                "D485: a part whose only target died is filled from the legal targets: " + refilled);
        check(Explorer.legalTargetList(List.of("spider121"), legal, List.of(), 1, 1, m) == null,
                "D485: with no legal target left the part cannot be made legal (null: the play is not cast)");
        check(Explorer.legalTargetList(List.of("mite72"), legal, fill, 0, 0, m).isEmpty(),
                "D485: Tear Asunder unkicked -- a target on the kicker-only part (maximum 0) is dropped");
        final List<String> empty = Explorer.legalTargetList(List.of(), legal, fill, 1, 1, m);
        check(empty != null && empty.size() == 1, "D485: an empty part with a minimum of 1 is filled to it: " + empty);
        check(List.of("bears48").equals(Explorer.legalTargetList(List.of("bears48", "bears48"), legal, fill, 1, 1, m)),
                "D485: a target listed twice is kept once");
        check(List.of("bears48", "moose57").equals(Explorer.legalTargetList(List.of("spider121", "bears48", "moose57"), legal,
                fill, 0, 2, m)), "D485: up to two targets: the dead one goes, both live ones stay, in order, no draw");
        final List<String> a = Explorer.legalTargetList(three, legal, fill, 1, 1, new ExploreMath(r, 77));
        final List<String> b = Explorer.legalTargetList(three, legal, fill, 1, 1, new ExploreMath(r, 77));
        check(a.equals(b), "D485: the cut is the seat's seeded draw (same seed, same target)");
        final ExploreMath quiet = new ExploreMath(r, 5);
        final ExploreMath twin = new ExploreMath(r, 5);
        Explorer.legalTargetList(List.of("spider121", "fractal139"), legal, fill, 1, 1, quiet);
        check(quiet.pick(1000) == twin.pick(1000), "D485: a fix that needs no draw moves no random stream");
    }

    /**
     * D471 (G6): the random seat's X, planted as J158's pauper spine found it.
     * Crypt Rats ({X}: X damage to each creature and each player) with no black
     * mana to spend is payable only at X = 0, where it is free and does nothing
     * -- the activation the seat repeated 3,600-20,700 times a branch: left out
     * of the listing, and the removal counted.  With black mana for 3, 300 draws
     * are all in 1..3 and each of 1, 2, 3 comes up; with mana for 1, X is 1.
     * The violation: the seat's own X pick paid at 0 (or never sized, null) is
     * one; a pick at 1 is not; a play with no {X} is not.  The positive control:
     * Forge's own answer at X = 0 (Forge's X, as its Chalice of the Void logic
     * can choose) is not the seat's draw and is never a violation.
     */
    private static void g6Planted(final ExploreMath.Config r) {
        final ExploreMath m = new ExploreMath(r, 13);
        check(Explorer.drawX(0, m) == 0 && m.guardrails().get("zeroXLeftOut") == 1,
                "G6: an X ability payable only at X = 0 (Crypt Rats, no black mana) is left out, and counted: " + m.guardrails());
        check(Explorer.drawX(-1, m) == 0 && m.guardrails().get("zeroXLeftOut") == 2, "G6: no maximum at all is left out too");
        final int[] seen = new int[4];
        boolean zero = false;
        for (int i = 0; i < 300; i++) {
            final int x = Explorer.drawX(3, m);
            zero |= x < 1 || x > 3;
            if (x >= 1 && x <= 3) {
                seen[x]++;
            }
        }
        check(!zero && seen[1] > 0 && seen[2] > 0 && seen[3] > 0,
                "G6: 300 draws with mana for X = 3 are all in 1..3, each value drawn: " + seen[1] + "/" + seen[2] + "/" + seen[3]);
        check(m.guardrails().get("zeroXLeftOut") == 2, "G6: a payable X is never counted as left out");
        boolean one = true;
        for (int i = 0; i < 50; i++) {
            one &= Explorer.drawX(1, m) == 1;
        }
        check(one, "G6: mana for X = 1 only: X is 1, never 0");
        check(Explorer.zeroXViolation(true, true, 0) && Explorer.zeroXViolation(true, true, null),
                "G6 violation: the seat's own X pick paid at 0 (or never sized) is one");
        check(!Explorer.zeroXViolation(true, true, 1) && !Explorer.zeroXViolation(true, false, null),
                "G6 violation: an own pick at X = 1, or a play with no {X}, is not one");
        check(!Explorer.zeroXViolation(false, true, 0),
                "G6 positive control: Forge's own answer at X = 0 is Forge's X, never a violation");
        // #192's review: the seat draws X onto the real abilities it lists (Crypt Rats, never sized; an
        // ability Forge had sized at 2; a Fireball), and random targets onto their targeting parts (the
        // sized ability's, which Forge had aimed at c7; Fireball's; a Shock with no X, aimed at p1), so
        // after the pick the plays it did not pick carry their own X and targets again and only the pick
        // keeps what the seat wrote -- until the engine refuses it
        final ExploreMath mx = new ExploreMath(r, 17);
        final Object rats = new Object();
        final Object sized = new Object();
        final Object fireball = new Object();
        final Object shock = new Object();
        final Object sizedPart = new Object();
        final Object fireballPart = new Object();
        final Object shockPart = new Object();
        final java.util.Map<Object, Integer> realX = new java.util.HashMap<>();
        final java.util.Map<Object, List<String>> realT = new java.util.HashMap<>();
        final java.util.Map<Object, Explorer.Before> drawn = new java.util.IdentityHashMap<>();
        final java.util.Map<Object, Object> partOf = java.util.Map.of(sized, sizedPart, fireball, fireballPart, shock, shockPart);
        final Runnable list = () -> {
            realX.put(rats, null);
            realX.put(sized, 2);
            realX.put(fireball, null);
            realT.put(sizedPart, List.of("c7"));
            realT.put(fireballPart, List.of());
            realT.put(shockPart, List.of("p1"));
            for (final Object ab : List.of(rats, sized, fireball, shock)) {
                final Explorer.Before b = drawn.computeIfAbsent(ab, k -> new Explorer.Before());
                if (ab != shock) {
                    final Integer x0 = realX.get(ab);
                    b.note(Explorer.X, () -> realX.put(ab, x0));
                    realX.put(ab, Explorer.drawX(3, mx));
                    b.note(Explorer.X, () -> realX.put(ab, -1));   // a second note never replaces the original
                }
                final Object part = partOf.get(ab);
                if (part != null) {
                    final List<String> t0 = List.copyOf(realT.get(part));
                    b.note(part, () -> realT.put(part, t0));
                    realT.put(part, List.of("rnd" + mx.pick(9)));
                }
            }
        };
        list.run();
        final int back = Explorer.restoreChoices(drawn, fireball, true);
        check(back == 3 && realX.get(rats) == null && realX.get(sized) == 2 && realX.get(fireball) >= 1
                && drawn.keySet().equals(java.util.Set.of(fireball)),
                "G6: after the pick, each unpicked X ability carries its original X (null, 2) and the pick its draw: " + realX);
        check(realT.get(sizedPart).equals(List.of("c7")) && realT.get(shockPart).equals(List.of("p1")),
                "G6: after the pick, each unpicked play carries its original targets (c7, p1), not the seat's random ones: " + realT);
        check(realT.get(fireballPart).size() == 1 && realT.get(fireballPart).get(0).startsWith("rnd"),
                "G6: the pick keeps the random targets the seat drew for it: " + realT.get(fireballPart));
        Explorer.restoreChoices(drawn, null, true);
        check(realX.get(fireball) == null && drawn.isEmpty(), "G6: a pick the engine refused gets its original X back");
        check(realT.get(fireballPart).isEmpty(), "G6: a pick the engine refused gets its original (no) targets back");
        list.run();
        Explorer.restoreChoices(drawn, sized, true);
        final int drew = realX.get(sized);
        final List<String> aimed = realT.get(sizedPart);
        check(Explorer.restoreChoices(drawn, null, false) == 0 && realX.get(sized) == drew && drew >= 1
                && realT.get(sizedPart) == aimed && aimed.get(0).startsWith("rnd")
                && realX.get(rats) == null && realT.get(shockPart).equals(List.of("p1")) && drawn.isEmpty(),
                "G6: a pick the engine played keeps its drawn X and its targets (read at resolution), nothing else does");
        list.run();
        Explorer.restoreChoices(drawn, null, true);
        check(realX.get(rats) == null && realX.get(sized) == 2 && realX.get(fireball) == null
                && realT.get(sizedPart).equals(List.of("c7")) && realT.get(fireballPart).isEmpty()
                && realT.get(shockPart).equals(List.of("p1")),
                "G6: a pass (or Forge's own answer) leaves every listed play's X and targets as they were");
    }

    /**
     * D466: a play with an optional cost maps onto the fork's copy.  Planted:
     * a retrace cast (Six gives a graveyard permanent card retrace) is the base
     * spell with {@code OptionalCost.Retrace} added; the copy's base is offered
     * retrace (its card is in the copy's graveyard) and gets exactly that cost
     * back, in Forge's order, and nothing it was not built with; a cost the copy
     * does not offer fails the mapping naming it.
     */
    private static void optionalCosts() {
        final forge.game.spellability.OptionalCostValue retrace =
                new forge.game.spellability.OptionalCostValue(forge.game.spellability.OptionalCost.Retrace, null);
        final forge.game.spellability.OptionalCostValue k1 =
                new forge.game.spellability.OptionalCostValue(forge.game.spellability.OptionalCost.Kicker1, null);
        final forge.game.spellability.OptionalCostValue k2 =
                new forge.game.spellability.OptionalCostValue(forge.game.spellability.OptionalCost.Kicker2, null);
        final List<forge.game.spellability.OptionalCostValue> got = SearchPolicy.chosenOptionalCosts(
                List.of(forge.game.spellability.OptionalCost.Retrace), List.of(retrace));
        check(got.size() == 1 && got.get(0) == retrace, "a retrace cast maps: the copy's base gets Retrace back");
        final List<forge.game.spellability.OptionalCostValue> kicked = SearchPolicy.chosenOptionalCosts(
                List.of(forge.game.spellability.OptionalCost.Kicker2, forge.game.spellability.OptionalCost.Kicker1),
                List.of(k1, retrace, k2));
        check(kicked.size() == 2 && kicked.get(0) == k1 && kicked.get(1) == k2,
                "the costs the play was built with, in the order Forge offers them, and no other");
        check(SearchPolicy.chosenOptionalCosts(List.of(), List.of(k1, k2)).isEmpty(), "no optional cost, none added");
        String why = null;
        try {
            SearchPolicy.chosenOptionalCosts(List.of(forge.game.spellability.OptionalCost.Retrace), List.of(k1));
        } catch (final IllegalStateException e) {
            why = e.getMessage();
        }
        check(why != null && why.contains("Retrace"), "a cost the copy does not offer fails, naming it: " + why);
        // D483: the doubled may-play suffix (Forge's twin of one play) collapses to one permission; two
        // permissions, or two ids where one is the other's prefix, stay as they are
        final String rider = "Murderous Rider - Creature 2 / 3";
        check(SearchPolicy.collapseBy(rider + " by #136 by #136").equals(rider + " by #136"), "a doubled \" by #<id>\" is one");
        check(SearchPolicy.collapseBy(rider + " by #136 by #136 by #136").equals(rider + " by #136"), "a tripled one too");
        check(SearchPolicy.collapseBy(rider + " by #13 by #136").equals(rider + " by #13 by #136"),
                "\" by #13 by #136\" is two permissions, not a run (the id is matched whole)");
        check(SearchPolicy.collapseBy(rider + " by #136 by #25").equals(rider + " by #136 by #25"), "two hosts stay two");
        check(SearchPolicy.collapseBy(rider).equals(rider), "no suffix, unchanged");
        check(SearchPolicy.collapseBy(rider + " by #136 by #1360").equals(rider + " by #136 by #1360"),
                "\" by #136 by #1360\" is two permissions too");
        // Bolas's Citadel's twin: Forge appends " by " + host, then CardPlayOption.toString(false), twice
        final String bolt = "CARDNAME deals 3 damage to any target.";
        final String citadel = " by #12 (by paying 1 life instead of paying its mana cost)";
        check(SearchPolicy.collapseBy(bolt + citadel + citadel).equals(bolt + citadel),
                "a doubled whole suffix with text between the hosts (Bolas's Citadel) is one");
        check(SearchPolicy.collapseBy(bolt + citadel + " by #12 (by paying 2 life instead of paying its mana cost)")
                        .equals(bolt + citadel + " by #12 (by paying 2 life instead of paying its mana cost)"),
                "two suffixes from one host with different text stay two");
        // a card's own may-play static with an alternative cost: no host in the suffix, so only the play's own suffix finds it
        final String own = " (without paying its mana cost)";
        check(SearchPolicy.collapseSuffix(rider + own + own, own).equals(rider + own), "a doubled own-static suffix is one");
        check(SearchPolicy.collapseSuffix(rider + own, own).equals(rider + own), "a single one is unchanged");
        check(SearchPolicy.collapseSuffix(rider + own + own, "").equals(rider + own + own), "no suffix to cut, unchanged");
    }

    /**
     * D465: the Forge seat's pay cap, with the refusal loop planted as Forge
     * runs it under Elite Spellbinder's tax (J151's d2 and d5 units): two plays
     * neither of which can be paid for, Forge choosing the one it did not set
     * aside last time (AiController clears the old marks and sets aside the new),
     * each refused, the priority back to the seat after every refusal.
     */
    private static void payCap() {
        final PayCap cap = new PayCap(PayCap.LIMIT);
        final String w = Explorer.windowKey(9, "MAIN1", 0, -1, 4);
        final String x = "cast:19", y = "cast:22";   // The Mightstone and Weakstone, Thragtusk
        String setAside = null;
        int refusals = 0;
        String passedOn = null;
        for (int loop = 0; loop < 999 && passedOn == null; loop++) {   // 999: PhaseHandler's own bound on an AI's loop
            final String forge = x.equals(setAside) ? y : x;             // Forge's choice: the play not set aside
            if (cap.caps(w, forge)) {
                passedOn = forge;                                        // the seat passes instead
                break;
            }
            cap.refused(w, forge);                                       // "AI failed to play" / "Didn't find what to pay for"
            refusals++;
            setAside = forge;
        }
        check(passedOn != null && refusals == 2 * PayCap.LIMIT,
                "pay cap: the X, Y, X, Y ... refusal loop ends in a pass after " + PayCap.LIMIT + " refusals of each ("
                        + refusals + " refusals, passed on " + passedOn + ")");
        check(x.equals(passedOn) && cap.events() == 1, "pay cap: the pass is counted once (forgePayCap " + cap.events() + ")");
        check(cap.caps(w, x) && cap.caps(w, y) && cap.events() == 3, "pay cap: both plays stay capped in the window, each pass counted");
        check(!cap.caps(w, "cast:37") && cap.events() == 3, "pay cap: a play never refused is not touched");
        final PayCap one = new PayCap(PayCap.LIMIT);
        for (int k = 0; k < PayCap.LIMIT - 1; k++) {
            one.refused(w, x);
        }
        check(!one.caps(w, x) && one.events() == 0, "pay cap: under the limit, Forge's choice stands");
        one.refused(w, x);
        check(one.caps(w, x) && one.events() == 1, "pay cap: at the limit, the next choice of it is a pass");
        final String landed = Explorer.windowKey(9, "MAIN1", 0, -1, 5);
        check(!one.caps(landed, x) && one.refusalsOf(x) == 0 && one.events() == 1,
                "pay cap: another window (a land drop) forgets the refusals and offers the play again");
        check(!one.caps(Explorer.windowKey(9, "MAIN1", 1, 301, 4), x), "pay cap: the stack moving is another window");
    }

    /** D358: play exploration's arithmetic, without the engine. */
    private static void explore() {
        final ExploreMath.Config cfg = new ExploreMath.Config(0.05, 0.02, true);
        // the same draft, game and seat draw the same stream; another seat or game another
        final long s1 = ExploreMath.seedFor(101, 1, 0);
        check(s1 == ExploreMath.seedFor(101, 1, 0), "seedFor is a function of its arguments");
        check(s1 != ExploreMath.seedFor(101, 1, 1) && s1 != ExploreMath.seedFor(101, 2, 0)
                && s1 != ExploreMath.seedFor(102, 1, 0) && s1 != ExploreMath.seedFor(101, 1, -1), "seeds differ by seat, game and draft");
        final ExploreMath a = new ExploreMath(cfg, s1);
        final ExploreMath b = new ExploreMath(cfg, s1);
        boolean same = true;
        for (int i = 0; i < 1000; i++) {
            same &= a.coin() == b.coin() && a.pick(7) == b.pick(7) && a.mask(5) == b.mask(5);
        }
        check(same, "one seed, one stream (coins, picks, masks)");
        check(a.coins() == 1000, "every coin counted");

        // the epsilon rate: 200,000 coins at 0.05, within 4 binomial standard errors
        final ExploreMath r = new ExploreMath(cfg, ExploreMath.seedFor(7, 1, 0));
        final int n = 200_000;
        int heads = 0;
        for (int i = 0; i < n; i++) {
            heads += r.coin() ? 1 : 0;
        }
        final double se = Math.sqrt(0.05 * 0.95 / n);
        check(Math.abs(heads / (double) n - 0.05) < 4 * se, "epsilon rate " + heads / (double) n + " within 4 SE of 0.05");
        for (final double eps : new double[] {0.0, 1.0}) {
            final ExploreMath x = new ExploreMath(new ExploreMath.Config(eps, 0, false), 3);
            int h = 0;
            for (int i = 0; i < 1000; i++) {
                h += x.coin() ? 1 : 0;
            }
            check(h == (eps == 0 ? 0 : 1000), "epsilon " + eps + " is never / always");
        }
        // a uniform pick over 6 options: chi-square with 5 degrees of freedom under 20.5 (p ~ 0.001)
        final int[] cnt = new int[6];
        for (int i = 0; i < 60_000; i++) {
            cnt[r.pick(6)]++;
        }
        double chi = 0;
        for (final int c : cnt) {
            chi += (c - 10_000.0) * (c - 10_000.0) / 10_000.0;
        }
        check(chi < 20.5, "pick is uniform (chi-square " + chi + ")");
        // masks: each bit about half the time
        int bit3 = 0;
        for (int i = 0; i < 20_000; i++) {
            bit3 += (r.mask(5) & 8L) != 0 ? 1 : 0;
        }
        check(Math.abs(bit3 / 20_000.0 - 0.5) < 4 * Math.sqrt(0.25 / 20_000), "mask bits are fair");
        check(r.mask(0) == 0, "an empty mask");

        // the close-call rule: relative to the larger score, off at 0
        check(ExploreMath.isCloseCall(200, 197, 0.02), "200 vs 197 is within 2%");
        check(!ExploreMath.isCloseCall(200, 195, 0.02), "200 vs 195 is not");
        check(ExploreMath.isCloseCall(0, 0, 0.02), "a zero pair is a tie");
        check(!ExploreMath.isCloseCall(200, 200, 0), "closeCall 0 is off");
        check(ExploreMath.nearestCloseCall(200, new double[] {150, 199, 197, 260}, 0.02) == 1, "the nearest rival wins");
        check(ExploreMath.nearestCloseCall(200, new double[] {150, 260}, 0.02) == -1, "no rival in the margin: none");
        check(ExploreMath.nearestCloseCall(200, new double[] {202, 198}, 0.02) == 0, "a tie in distance: the first");

        // settings: from a job line, and refused out of range
        final ExploreMath.Config parsed = ExploreMath.Config.of(Json.parse("{\"epsilon\":0.05,\"closeCall\":0.02,\"opening\":true}"));
        check(parsed != null && parsed.epsilon == 0.05 && parsed.closeCall == 0.02 && parsed.opening, "a job line's playExplore");
        check(ExploreMath.Config.of(null) == null, "no block, no exploration");
        boolean refused = false;
        try {
            new ExploreMath.Config(1.5, 0, false);
        } catch (final IllegalArgumentException e) {
            refused = true;
        }
        check(refused, "epsilon over 1 is refused");

        // the counters a game reports
        final ExploreMath c = new ExploreMath(cfg, 1);
        c.randomised("priority", true);
        c.randomised("priority", false);
        c.randomised("attack", false);
        c.closeCall(true);
        c.closeCall(false);
        check(c.randomised() == 3 && c.changed() == 2 && c.closeCalls() == 2 && c.closeCallsChanged() == 1
                && c.byKind().get("priority")[0] == 2 && c.byKind().get("attack")[1] == 1, "counters");

        // the record's mark
        final Decision d = new Decision("attack", 4, "COMBAT_DECLARE_ATTACKERS");
        d.options.addAll(List.of("attack:none", "attack:21", "attack:21,26", "attack:26"));
        d.chosen = "attack:26";
        d.explore = new Decision.Explore("random", "attack:21,26");
        final Map<?, ?> m = (Map<?, ?>) Json.parse(d.toJson(1, 9, 30, 21));
        final Map<?, ?> em = (Map<?, ?>) m.get("explore");
        check(em != null && "random".equals(em.get("rule")) && "attack:21,26".equals(em.get("forge")) && em.size() == 2,
                "explore mark: rule and Forge's answer, nothing else");
        final Decision plain = new Decision("attack", 4, "COMBAT_DECLARE_ATTACKERS");
        plain.options.addAll(List.of("attack:none", "attack:21"));
        plain.chosen = "attack:21";
        check(!((Map<?, ?>) Json.parse(plain.toJson(1, 10, 30, 21))).containsKey("explore"), "no mark, no key");
        boolean badRule = false;
        try {
            new Decision.Explore("whim", "pass");
        } catch (final IllegalArgumentException e) {
            badRule = true;
        }
        check(badRule, "an unknown explore rule is refused");
        final Decision leak = new Decision("priority", 3, "MAIN1");
        leak.options.addAll(List.of("pass", "cast:41"));
        leak.chosen = "pass";
        leak.explore = new Decision.Explore("random", "cast:Lightning Bolt");
        boolean threw = false;
        try {
            leak.toJson(0, 0, 1, 1);
        } catch (final IllegalArgumentException e) {
            threw = true;
        }
        check(threw, "the mark's Forge answer is a token too");
    }
}
