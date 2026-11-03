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
        explore();
        randomSeat();

        System.out.println("decision selftest: " + checks + " check(s), " + failures + " failure(s)");
        if (failures > 0) {
            System.exit(1);
        }
    }

    /**
     * D487 (M76): a targeting part left empty answers {@code target:none}, never
     * null.  Minimum 0: listed first, {@code min: 0}, the record complete; Tear
     * Asunder's other half (maximum 0, no candidate) is the one-option record,
     * counted and not written.  Minimum 1 left empty: listed, {@code min: 1},
     * incomplete, {@code NO_TARGET}.  A part whose only target the seat cannot
     * see keeps its null answer.  J171's shape -- {@code chosen: null} beside
     * card candidates -- is what the old builder wrote for the first case.
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
            Decisions.targetAnswer(d, opts, chosen, (Integer) a[2], (Integer) a[3]);
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
        // an answer the seat cannot see is not "none"
        final Decision unseen = part.apply(new Object[] {List.of("target:5", "target:67"), List.of(), 1, 1});
        final Map<?, ?> un = (Map<?, ?>) Json.parse(unseen.toJson(1, 23, 141, 123));
        check(unseen.chosen == null && unseen.chosenAll.isEmpty() && !unseen.options.contains("target:none")
                        && un.containsKey("chosen") && un.get("chosen") == null && Boolean.FALSE.equals(un.get("complete"))
                        && !un.containsKey("min") && !un.containsKey("why"),
                "a target the seat cannot see (min 1): chosen null beside complete:false -- never J171's legacy shape");
        final Decision unseen0 = part.apply(new Object[] {List.of("target:5"), List.of(), 1, 0});
        final Map<?, ?> u0 = (Map<?, ?>) Json.parse(unseen0.toJson(1, 24, 141, 123));
        check(u0.get("chosen") == null && Boolean.FALSE.equals(u0.get("complete")) && Long.valueOf(0).equals(u0.get("min")),
                "a target the seat cannot see (min 0): chosen null, complete:false, min 0 -- never the legacy shape");
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
        // D412: the live seat is search-v2 (search-v1 + anytime=1); the bench's parse is unchanged.
        final SearchConfig live = SearchConfig.parseLive("");
        check("search-v2".equals(SearchConfig.LIVE_VERSION) && live.anytime
                && (def.toString() + ",anytime=1").equals(live.toString()), "the live seat's default is search-v2: " + live);
        check(SearchConfig.parseLive(null).toString().equals(live.toString()), "no --ai-search text is the same seat");
        check(SearchConfig.parseLive("ms=3000").anytime && SearchConfig.parseLive("ms=3000").budgetMs == 3000,
                "a budget from the picker (--ai-search ms=N) keeps the anytime loop");
        check(!SearchConfig.parseLive("anytime=0").anytime
                && SearchConfig.parseLive("anytime=0").toString().equals(def.toString()), "anytime=0 is search-v1's loop again");
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
        check((def.toString() + ",anytime=1").equals(live.toString()) && !live.toString().contains("mull")
                && !live.toString().contains("targets"), "search-v2's config string is unchanged: " + live);
        check(def.mullMs == SearchConfig.MULL_MS && def.mullTurns == SearchConfig.MULL_TURNS && SearchConfig.MULL_MS == 6000
                && SearchConfig.MULL_TURNS == 3, "the mulligan's defaults: 6000 ms, 3 turns a seat (game turn 6)");
        final SearchConfig m = SearchConfig.parseLive("mull=1");
        check(m.mull && !m.targets && m.anytime && m.toString().equals(live.toString() + ",mull=1"),
                "search-v2 + mull=1 prints as search-v2 plus the switch: " + m);
        final SearchConfig t = SearchConfig.parse("anytime=1,targets=1");
        check(t.targets && !t.mull && t.toString().equals(live.toString() + ",targets=1"), "targets=1: " + t);
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
        // The default stays the hand leaf: the live seat (search-v2) and parse's defaults name no model.
        check(SearchConfig.parseLive("").leafModel == null && SearchConfig.defaults().leafModel == null
                && !SearchConfig.LIVE_DEFAULTS.contains("leaf"), "the live seat's leaf stays hand");
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
