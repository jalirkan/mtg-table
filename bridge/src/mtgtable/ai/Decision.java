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
import java.util.Locale;
import java.util.regex.Pattern;

import mtgtable.Json.JsonOut;

/**
 * One decision an AI seat took (D347): what kind it was, every legal answer as
 * a token, the answer taken, which policy took it and -- when the search ran --
 * its statistics per option.  A policy network's target and expert iteration's
 * (search-improved) target, written into the seat's OWN recording only
 * ({@code mtgtable.SeatRecorder}, a {@code dir:"ai"} line, protocol amendment
 * M55).
 *
 * <p>Engine-free on purpose: {@link Decisions} builds it from the live game, and
 * this class only holds strings and numbers, so {@code DecisionSelfTest} checks
 * the JSON and the token grammar without booting Forge.  No card name, no
 * engine string: tokens are the coach bench's and the grader's (ForgeCoach
 * {@code src/bench/coachBench.ts}, {@code mtgtable.grade.GradeMath}) over wire
 * card ids:
 *
 * <pre>
 *   priority  pass | cast:&lt;id&gt; | land:&lt;id&gt; | activate:&lt;id&gt;[#&lt;k&gt;]
 *   attack    attack:none | attack:&lt;ids ascending&gt;
 *   block     block:none | block:&lt;b&gt;&gt;&lt;a&gt;,...   (sorted by attacker, then blocker)
 *   target    target:&lt;id&gt; | target:p&lt;playerId&gt;
 *   choice    option:&lt;id&gt; | option:p&lt;playerId&gt; | option:hidden | yes | no
 *   mulligan  keep | mulligan
 * </pre>
 *
 * {@code activate:<id>#<k>} names the k-th non-mana activated ability of a card
 * that has more than one; a card with one is plain {@code activate:<id>}.  {@code option:hidden} is a card in a zone the seat
 * cannot see (a library search): it is counted in {@code hidden}, never named by id.
 */
public final class Decision {

    /** The token grammar, as {@code tools/check-redaction.mjs} holds it too. */
    public static final Pattern TOKEN = Pattern.compile(
            "pass|keep|mulligan|yes|no|option:hidden|(cast|land):\\d+|(target|option):p?\\d+|activate:\\d+(#\\d+)?"
            + "|attack:(none|\\d+(,\\d+)*)|block:(none|\\d+>\\d+(,\\d+>\\d+)*)");

    public static final List<String> KINDS = List.of("priority", "attack", "block", "target", "choice", "mulligan");
    public static final List<String> POLICIES = List.of("forge", "outlets", "search");

    public final String kind;
    public final int turn;
    public final String phase;
    /** Every legal answer the seat had, as tokens (in a stable order: pass first, then by id). */
    public final List<String> options = new ArrayList<>();
    /** False when {@link #options} is a shortlist (too many attack or block combinations to list). */
    public boolean complete = true;
    /** Attack: the ids that could attack.  Block: every legal {@code b>a} pair.  Else empty. */
    public final List<String> atoms = new ArrayList<>();
    /** Options in a zone the seat cannot see, counted and never named (choice only). */
    public int hidden;
    /** The answer: one token, or several for a multi-card choice ({@link #chosenAll}). */
    public String chosen;
    public final List<String> chosenAll = new ArrayList<>();
    /** forge | outlets | search: whose answer was played. */
    public String by = "forge";
    /** The outlet policy's reason (LETHAL, THREATENED, ...), when it chose. */
    public String why;
    /** For a target or choice taken while playing a priority answer: that decision's {@code n}. */
    public int parent = -1;
    /** What raised it: targets (of a priority answer), trigger, chooseTargets, entity, cards, confirm. */
    public String source;
    public SearchStats search;

    public Decision(final String kind, final int turn, final String phase) {
        if (!KINDS.contains(kind)) {
            throw new IllegalArgumentException("kind " + kind);
        }
        this.kind = kind;
        this.turn = turn;
        this.phase = phase;
    }

    /** A decision is worth a record when there was something to choose. */
    public boolean forced() {
        return options.size() + hidden <= 1 && complete;
    }

    /** What the search measured, per candidate (D312's loop; the grader's win estimate). */
    public static final class SearchStats {
        public final List<String> tokens = new ArrayList<>();
        public final List<Integer> n = new ArrayList<>();
        public final List<Double> meanLeaf = new ArrayList<>();
        /** The mean's standard error, the paired difference to Forge's answer and its standard error (CRN rounds). */
        public final List<Double> seLeaf = new ArrayList<>();
        public final List<Double> diffLeaf = new ArrayList<>();
        public final List<Double> seDiff = new ArrayList<>();
        public final List<Double> win = new ArrayList<>();
        /** D353 ({@code rank=prior}): the prior that ranked each option (NaN: not scored), and how many were generated (0: no ranking). */
        public final List<Double> prior = new ArrayList<>();
        public int generated;
        /** The rollouts' horizon (turns past this one), and the override rule and its margin in leaf points. */
        public int horizon;
        public String rule = "margin";
        public int margin;
        /** lcb only: the multiplier z; and the statistic the rule compared with the margin (NaN: none). */
        public double z;
        public double stat = Double.NaN;
        /** Index into {@link #tokens} of Forge's own answer (always 0) and of the best mean. */
        public int forge;
        public int best = -1;
        public int rounds;
        public int playouts;
        public long ms;
        public long budgetMs;
        /** The wall-clock budget stopped the loop before {@code maxrounds}. */
        public boolean timedOut;
        /** null, or why Forge's answer was kept without a verdict: budget | copyError | unmappable | rolloutErrors | invalidAtEnd. */
        public String fallback;
        /** The search's answer replaced Forge's. */
        public boolean overrode;
    }

    /** The {@code dir:"ai"}, {@code type:"decision"} body (protocol amendment M55). */
    public String toJson(final int seat, final int n, final int frame, final int stateSeq) {
        final JsonOut o = new JsonOut().obj();
        o.n("seat", seat).n("n", n).n("kind", kind);
        if (frame >= 0) {
            o.n("frame", frame).n("stateSeq", stateSeq);
        } else {
            o.nNull("frame").nNull("stateSeq");
        }
        o.n("turn", turn).n("phase", phase);
        o.key("options").arr();
        for (final String t : options) {
            o.v(check(t));
        }
        o.end();
        if (!complete) {
            o.n("complete", false);
        }
        if (!atoms.isEmpty()) {
            o.key("atoms").arr();
            for (final String a : atoms) {
                o.v(a);
            }
            o.end();
        }
        if (hidden > 0) {
            o.n("hidden", hidden);
        }
        if (chosenAll.isEmpty()) {
            if (chosen == null) {
                o.nNull("chosen");
            } else {
                o.n("chosen", check(chosen));
            }
        } else {
            o.key("chosen").arr();
            for (final String t : chosenAll) {
                o.v(check(t));
            }
            o.end();
        }
        o.n("by", by);
        if (why != null) {
            o.n("why", why);
        }
        if (parent >= 0) {
            o.n("parent", parent);
        }
        if (source != null) {
            o.n("source", source);
        }
        if (search != null) {
            final SearchStats s = search;
            o.key("search").obj();
            o.key("options").arr();
            for (int i = 0; i < s.tokens.size(); i++) {
                o.obj().n("token", check(s.tokens.get(i))).n("n", (long) s.n.get(i))
                        .n("meanLeaf", round(s.meanLeaf.get(i), 1)).n("se", round(get(s.seLeaf, i), 1))
                        .n("diff", round(get(s.diffLeaf, i), 1)).n("seDiff", round(get(s.seDiff, i), 1))
                        .n("win", round(s.win.get(i), 4));
                final double pr = get(s.prior, i);
                if (!Double.isNaN(pr)) {
                    o.n("prior", round(pr, 1));
                }
                o.end();
            }
            o.end();
            o.n("forge", s.forge).n("best", s.best).n("rounds", s.rounds).n("playouts", s.playouts)
                    .n("horizon", s.horizon).n("rule", s.rule).n("margin", s.margin)
                    .n("stat", round(s.stat, 1));
            if ("lcb".equals(s.rule)) {
                o.n("z", s.z);
            }
            if (s.generated > 0) {
                o.n("generated", s.generated);
            }
            o.n("ms", s.ms).n("budgetMs", s.budgetMs).n("timedOut", s.timedOut)
                    .n("overrode", s.overrode);
            if (s.fallback == null) {
                o.nNull("fallback");
            } else {
                o.n("fallback", s.fallback);
            }
            o.end();
        }
        return o.end().done();
    }

    private static double get(final List<Double> l, final int i) {
        return i < l.size() ? l.get(i) : Double.NaN;
    }

    static String check(final String token) {
        if (token == null || !TOKEN.matcher(token).matches()) {
            throw new IllegalArgumentException("not a decision token: " + token);
        }
        return token;
    }

    static double round(final double x, final int places) {
        if (Double.isNaN(x) || Double.isInfinite(x)) {
            return x;
        }
        final double f = Math.pow(10, places);
        return Math.round(x * f) / f;
    }

    // ------------------------------------------------------------------
    // Tokens (the coach bench's spelling; GradeMath's for attack and block)
    // ------------------------------------------------------------------

    public static String attackToken(final List<Integer> ids) {
        if (ids.isEmpty()) {
            return "attack:none";
        }
        final List<Integer> s = new ArrayList<>(ids);
        s.sort(null);
        final StringBuilder sb = new StringBuilder("attack:");
        for (int i = 0; i < s.size(); i++) {
            sb.append(i == 0 ? "" : ",").append(s.get(i));
        }
        return sb.toString();
    }

    /** Pairs are {blocker, attacker}. */
    public static String blockToken(final List<int[]> pairs) {
        if (pairs.isEmpty()) {
            return "block:none";
        }
        final List<int[]> s = new ArrayList<>(pairs);
        s.sort((p, q) -> p[1] != q[1] ? Integer.compare(p[1], q[1]) : Integer.compare(p[0], q[0]));
        final StringBuilder sb = new StringBuilder("block:");
        for (int i = 0; i < s.size(); i++) {
            sb.append(i == 0 ? "" : ",").append(s.get(i)[0]).append('>').append(s.get(i)[1]);
        }
        return sb.toString();
    }

    @Override
    public String toString() {
        return String.format(Locale.ROOT, "%s T%d %s: %s of %s by %s", kind, turn, phase, chosen, options, by);
    }
}
