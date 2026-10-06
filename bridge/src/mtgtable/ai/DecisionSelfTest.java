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

        searchWeek3();
        explore();

        System.out.println("decision selftest: " + checks + " check(s), " + failures + " failure(s)");
        if (failures > 0) {
            System.exit(1);
        }
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
