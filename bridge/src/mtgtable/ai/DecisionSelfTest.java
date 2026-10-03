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
 * and a token that could carry a card name refused before it is written.  No
 * Forge class beyond Jetty's JSON parser.
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
                "activate:12#1", "target:5", "target:p1", "option:9", "option:p0", "option:hidden", "attack:none",
                "attack:3,9,21", "block:none", "block:11>40,12>40")) {
            check(Decision.TOKEN.matcher(t).matches(), "token " + t);
        }
        for (final String t : List.of("cast:Lightning Bolt", "cast:p1", "land:p0", "target:", "attack:", "block:11",
                "pass ", "option:hidden:1", "activate:12#", "cast:41 (Shock)")) {
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
                && Long.valueOf(9).equals(sp.get("generated")), "M56: prior per scored option, generated (D353)");

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

        searchWeek3();

        System.out.println("decision selftest: " + checks + " check(s), " + failures + " failure(s)");
        if (failures > 0) {
            System.exit(1);
        }
    }

    /** D352–D354: the config switches, the NaN-aware statistics and the anytime schedule, on numbers. */
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
        for (final String bad : List.of("rank=best", "rank=prior,gen=3", "prior=eval", "rollout=sometimes", "anytime=2")) {
            boolean threw = false;
            try {
                SearchConfig.parse(bad);
            } catch (final IllegalArgumentException e) {
                threw = true;
            }
            check(threw, "refused: " + bad);
        }

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

    private static double[] rpDiff(final List<double[]> leaves, final int k) {
        final SearchPolicy.Report r = new SearchPolicy.Report();
        SearchPolicy.Report.fillStats(r, leaves, List.of(), k);
        return r.diffLeaf;
    }
}
