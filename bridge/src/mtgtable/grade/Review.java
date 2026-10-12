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
package mtgtable.grade;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import mtgtable.Json;

/**
 * The post-game review's engine-free half (D353, {@code coach-grade.sh
 * review}): which decisions of the viewer's log are graded and what the player
 * did at each ({@link #plan}), the triage's per-decision budget
 * ({@link #triageBudgetMs}), which decisions are graded again with the big
 * budget ({@link #select}) and how that budget is shared out
 * ({@link #allocate}), and the one JSON report ({@link #report}).  No Forge
 * class: {@link GradeSelfTest} holds all of it on every build.
 *
 * <p>Only the viewer's redacted log is read, and the player's choice comes from
 * the engine's public events after the decision (a spell cast from hand, the
 * {@code attackers} / {@code blockers} events) or the player's own click on a
 * target -- never from anything hidden.
 */
public final class Review {

    private Review() { }

    /** One planned decision: a {@code batch} moments line. */
    public static final class Planned {
        /** The moment: everything before this frame (ForgeCoach's {@code liveMoment}). */
        public int frame;
        /** The state frame in force. */
        public int stateFrame;
        public String type;
        /** The player's choice as a bench token over the log's card ids. */
        public String played;
        public long turn;
        public long round;
        public String phase;
        /** An AI-vs-AI moment: the state's own event batch already holds the step's first plays. */
        boolean ownBatch;

        /** {@link CoachGrade#batch}'s key for this moment of {@code logPath}. */
        public String momentKey(final String logPath) {
            return logPath + "#live" + frame + ":" + type;
        }
    }

    private static final Set<String> PLAYS = Set.of("clickCard", "clickPlayer", "buttonOk", "buttonCancel", "passPriority",
            "alphaStrike");
    private static final Pattern TARGET_LINE = Pattern.compile("\\btargets?\\b", Pattern.CASE_INSENSITIVE);

    static boolean isMain(final String phase) {
        return "MAIN1".equals(phase) || "MAIN2".equals(phase);
    }

    /** ForgeCoach's {@code isTargetInput}: the engine asks for a card or player click and its prompt says "target". */
    static boolean isTargetInput(final Map<?, ?> input) {
        if (input == null) {
            return false;
        }
        final Map<?, ?> sel = WireLog.map(input, "selectable");
        if (sel == null || "none".equals(WireLog.str(sel, "mode"))) {
            return false;
        }
        if ("cards".equals(WireLog.str(sel, "mode")) && WireLog.arr(sel, "cardIds").length == 0) {
            return false;
        }
        final String p = String.valueOf(WireLog.str(input, "prompt")).trim();
        if (p.regionMatches(true, 0, "Priority:", 0, 9)) {
            return false;
        }
        String last = "";
        for (final String l : p.split("\n")) {
            if (!l.isBlank()) {
                last = l;
            }
        }
        return TARGET_LINE.matcher(last).find();
    }

    /**
     * The kind of decision an open input asks the viewer for, as the review
     * grades them: the attack prompt, the block prompt, a target prompt, or a
     * priority prompt in the viewer's own main phase with an empty stack
     * ({@code spell}); null for anything else.  {@link #plan}'s rule, and the
     * live hint's (D429), so the two can never disagree about a moment.
     */
    static String kindOf(final Map<?, ?> state, final Map<?, ?> input, final int seat) {
        if (state == null || input == null) {
            return null;
        }
        final String phase = WireLog.str(state, "phase");
        if (phase == null || WireLog.num(state, "turn", 0) <= 0) {
            return null;   // the pre-game prompts
        }
        final String prompt = String.valueOf(WireLog.str(input, "prompt")).trim();
        if (prompt.startsWith("Select creatures to attack")) {
            return "attack";
        }
        if (prompt.startsWith("Select creatures to block")) {
            return "block";
        }
        if (isTargetInput(input)) {
            return "target";
        }
        if (prompt.regionMatches(true, 0, "Priority:", 0, 9) && isMain(phase)
                && WireLog.num(state, "activePlayer", -1) == seat && WireLog.arr(state, "stack").length == 0) {
            return "spell";
        }
        return null;
    }

    /**
     * The search hint's moment (D429): the kind of the decision open at the end
     * of everything before frame {@code frame} -- the latest state and the
     * latest input of the viewer's own log, by {@link #kindOf} -- or null when
     * no gradable decision is open there (the opponent's turn, a mana payment,
     * a question the analysis does not grade).
     */
    public static String liveType(final WireLog log, final int frame) {
        final WireLog.Moment m = log.live(frame);
        return m == null ? null : kindOf(m.state, m.input, log.seat);
    }

    /**
     * The decisions of the log's viewer to grade, in log order.  A human-seat
     * log (one with acts): the first act of each decision -- the viewer's own
     * main phase at a priority prompt with an empty stack ({@code spell}, once
     * per main phase), the attack prompt, the block prompt, each target prompt
     * answered with a click.  An AI-vs-AI recording: the first state of each of
     * the viewer's main phases, declare-attackers steps, and declare-blockers
     * steps where something attacks them.
     */
    public static List<Planned> plan(final WireLog log) {
        boolean acts = false;
        for (final Map<?, ?> f : log.frames) {
            if ("act".equals(f.get("type")) || "c2s".equals(f.get("dir"))) {
                acts = true;
                break;
            }
        }
        final List<Planned> out = acts ? fromActs(log) : fromStates(log);
        for (final Planned p : out) {
            if (p.played == null) {
                p.played = playedFrom(log, p);
            }
        }
        return out;
    }

    private static List<Planned> fromActs(final WireLog log) {
        final List<Planned> out = new ArrayList<>();
        final Set<String> seen = new HashSet<>();
        Map<?, ?> state = null;
        int stateIdx = -1;
        Map<?, ?> input = null;
        int inputIdx = -1;
        for (int i = 0; i < log.frames.size(); i++) {
            final Map<?, ?> f = log.frames.get(i);
            final Object type = f.get("type");
            if ("state".equals(type)) {
                state = (Map<?, ?>) f.get("body");
                stateIdx = i;
                continue;
            }
            if ("input".equals(type)) {
                input = (Map<?, ?>) f.get("body");
                inputIdx = i;
                continue;
            }
            if (!"act".equals(type) || state == null || input == null) {
                continue;
            }
            final Map<?, ?> act = (Map<?, ?>) f.get("body");
            final String action = WireLog.str(act, "action");
            if (!PLAYS.contains(action)) {
                continue;
            }
            final String phase = WireLog.str(state, "phase");
            final long turn = WireLog.num(state, "turn", 0);
            if (phase == null || turn <= 0) {
                continue;   // the pre-game prompts
            }
            final String prompt = String.valueOf(WireLog.str(input, "prompt")).trim();
            final String kind = kindOf(state, input, log.seat);
            String key;
            String played = null;
            if (kind == null) {
                continue;
            } else if ("attack".equals(kind)) {
                key = "attack:" + turn;
            } else if ("block".equals(kind)) {
                key = "block:" + turn;
            } else if ("target".equals(kind)) {
                key = "target:" + inputIdx + ":" + prompt.split("\n")[0];
                if ("clickCard".equals(action)) {
                    final long id = WireLog.num(act, "cardId", -1);
                    boolean offered = false;
                    for (final Object o : WireLog.arr(WireLog.map(input, "selectable"), "cardIds")) {
                        offered |= o instanceof Number && ((Number) o).longValue() == id;
                    }
                    played = offered ? "target:" + id : null;
                } else if ("clickPlayer".equals(action)) {
                    played = "target:player" + WireLog.num(act, "playerId", -1);
                }
                if (played == null) {
                    seen.add(key);   // cancelled, or a click the prompt did not offer: no choice to grade
                    continue;
                }
            } else {
                key = "spell:" + turn + ":" + phase;
            }
            if (!seen.add(key)) {
                continue;
            }
            final Planned p = new Planned();
            p.frame = i;
            p.stateFrame = stateIdx;
            p.type = kind;
            p.played = played;
            p.turn = turn;
            p.round = WireLog.num(state, "round", (turn + 1) / 2);
            p.phase = phase;
            out.add(p);
        }
        return out;
    }

    private static List<Planned> fromStates(final WireLog log) {
        final List<Planned> out = new ArrayList<>();
        String last = "";
        for (int i = 0; i < log.frames.size(); i++) {
            final Map<?, ?> f = log.frames.get(i);
            if (!"state".equals(f.get("type"))) {
                continue;
            }
            final Map<?, ?> s = (Map<?, ?>) f.get("body");
            final String phase = WireLog.str(s, "phase");
            final long turn = WireLog.num(s, "turn", 0);
            if (phase == null || turn <= 0 || s.get("gameOver") != null) {
                continue;
            }
            final String key = turn + ":" + phase;
            if (key.equals(last)) {
                continue;
            }
            last = key;
            final boolean mine = WireLog.num(s, "activePlayer", -1) == log.seat;
            final String kind;
            if (mine && isMain(phase) && WireLog.arr(s, "stack").length == 0) {
                kind = "spell";
            } else if (mine && "COMBAT_DECLARE_ATTACKERS".equals(phase)) {
                kind = "attack";
            } else if (!mine && "COMBAT_DECLARE_BLOCKERS".equals(phase) && attacksViewer(s, log.seat)) {
                kind = "block";
            } else {
                continue;
            }
            final Planned p = new Planned();
            p.frame = i + 1;   // everything before frame i + 1: the state frame i
            p.stateFrame = i;
            p.ownBatch = true;
            p.type = kind;
            p.turn = turn;
            p.round = WireLog.num(s, "round", (turn + 1) / 2);
            p.phase = phase;
            out.add(p);
        }
        return out;
    }

    static boolean attacksViewer(final Map<?, ?> s, final int seat) {
        for (final Object o : WireLog.arr(WireLog.map(s, "combat"), "bands")) {
            final Map<?, ?> b = (Map<?, ?>) o;
            final Map<?, ?> d = WireLog.map(b, "defender");
            if (WireLog.arr(b, "attackerIds").length > 0
                    && (d == null || "player".equals(WireLog.str(d, "kind")) && WireLog.num(d, "id", -1) == seat
                    || d != null && "card".equals(WireLog.str(d, "kind")))) {
                return true;
            }
        }
        return false;
    }

    /** The ids of the viewer's hand in a state. */
    static Set<Long> handIds(final Map<?, ?> state, final int seat) {
        final Set<Long> out = new HashSet<>();
        for (final Object po : WireLog.arr(state, "players")) {
            final Map<?, ?> p = (Map<?, ?>) po;
            if (WireLog.num(p, "id", -1) != seat) {
                continue;
            }
            for (final Object c : WireLog.arr(WireLog.map(WireLog.map(p, "zones"), "hand"), "cards")) {
                out.add(WireLog.num((Map<?, ?>) c, "id", -1));
            }
        }
        return out;
    }

    /**
     * What the player did at a planned decision, from the engine's events in
     * the decision's (turn, phase) -- the batch cursor follows each state's own
     * {@code turn} / {@code phase} events, as ForgeCoach's {@code eventWords}
     * does.  A spell decision is the first spell cast from the hand the
     * moment's state shows (a land drop is not a choice the grader offers;
     * Forge's land is played first in every option), else {@code pass}.
     */
    static String playedFrom(final WireLog log, final Planned p) {
        final Map<?, ?> moment = (Map<?, ?>) log.frames.get(p.stateFrame).get("body");
        final Set<Long> hand = handIds(moment, log.seat);
        long turn = p.turn;
        String phase = p.phase;
        // Human logs: the events after the act.  AI-vs-AI: the moment's own batch too, after its phase event.
        int from = p.frame;
        if (p.ownBatch) {
            from = p.stateFrame;
            final Map<?, ?> prev = prevState(log, p.stateFrame);
            turn = prev == null ? p.turn : WireLog.num(prev, "turn", p.turn);
            phase = prev == null ? null : WireLog.str(prev, "phase");
            if (prev != null) {
                hand.addAll(handIds(prev, log.seat));   // a spell cast in the batch has left the moment's hand
            }
        }
        for (int i = from; i < log.frames.size(); i++) {
            final Map<?, ?> f = log.frames.get(i);
            if (!"state".equals(f.get("type"))) {
                continue;
            }
            final Map<?, ?> s = (Map<?, ?>) f.get("body");
            for (final Object eo : WireLog.arr(s, "events")) {
                final Map<?, ?> e = (Map<?, ?>) eo;
                final String kind = WireLog.str(e, "kind");
                if ("turn".equals(kind)) {
                    turn = WireLog.num(e, "turn", turn);
                    continue;
                }
                if ("phase".equals(kind)) {
                    phase = WireLog.str(e, "phase");
                    continue;
                }
                if (turn != p.turn) {
                    continue;
                }
                switch (p.type) {
                case "spell":
                    if (p.phase.equals(phase) && "cast".equals(kind) && WireLog.num(e, "controller", -1) == log.seat
                            && hand.contains(WireLog.num(e, "cardId", -1))) {
                        return "cast:" + WireLog.num(e, "cardId", -1);
                    }
                    break;
                case "attack":
                    if ("attackers".equals(kind) && WireLog.num(e, "player", -1) == log.seat) {
                        final List<Integer> ids = new ArrayList<>();
                        for (final Object bo : WireLog.arr(e, "bands")) {
                            for (final Object id : WireLog.arr((Map<?, ?>) bo, "attackerIds")) {
                                ids.add(((Number) id).intValue());
                            }
                        }
                        return GradeMath.attackToken(ids);
                    }
                    break;
                case "block":
                    if ("blockers".equals(kind) && WireLog.num(e, "defendingPlayer", -1) == log.seat) {
                        final List<int[]> pairs = new ArrayList<>();
                        for (final Object bo : WireLog.arr(e, "blocks")) {
                            final Map<?, ?> b = (Map<?, ?>) bo;
                            final int a = (int) WireLog.num(b, "attackerId", -1);
                            for (final Object bl : WireLog.arr(b, "blockerIds")) {
                                final int id = ((Number) bl).intValue();
                                if (id != a) {   // the bridge lists an unblocked attacker as blocking itself
                                    pairs.add(new int[] {id, a});
                                }
                            }
                        }
                        return GradeMath.blockToken(pairs);
                    }
                    break;
                default:
                    break;
                }
            }
            if (WireLog.num(s, "turn", turn) > p.turn) {
                break;
            }
        }
        switch (p.type) {
        case "spell":
            return "pass";
        case "attack":
            return "attack:none";
        case "block":
            return "block:none";
        default:
            return null;
        }
    }

    private static Map<?, ?> prevState(final WireLog log, final int before) {
        for (int i = before - 1; i >= 0; i--) {
            if ("state".equals(log.frames.get(i).get("type"))) {
                return (Map<?, ?>) log.frames.get(i).get("body");
            }
        }
        return null;
    }

    /** The plan as {@code batch} moments lines (JSON, one per decision). */
    public static List<String> momentLines(final List<Planned> plan, final String logPath) {
        final List<String> out = new ArrayList<>();
        for (final Planned p : plan) {
            final Json.JsonOut j = new Json.JsonOut().obj().n("log", logPath).n("frame", p.frame).n("mode", "live")
                    .n("type", p.type).n("stateFrame", p.stateFrame).n("turn", p.turn).n("round", p.round)
                    .n("phase", p.phase).n("label", "T" + p.turn + " " + p.type);
            if (p.played != null) {
                j.n("played", p.played);
            }
            out.add(j.end().done());
        }
        return out;
    }

    // ------------------------------------------------------------------
    // Budgets
    // ------------------------------------------------------------------

    /** The triage's per-decision budget: the wall budget over the decisions each JVM grades, clamped. */
    public static long triageBudgetMs(final int decisions, final int jobs, final long wallMs, final long minMs,
                                      final long maxMs) {
        if (decisions <= 0) {
            return minMs;
        }
        final int used = Math.max(1, Math.min(jobs, decisions));
        final int perJvm = (decisions + used - 1) / used;
        return Math.max(minMs, Math.min(maxMs, wallMs / perJvm));
    }

    /** How the deepening is shared out. */
    public static final class Alloc {
        /** JVMs started. */
        public int jobs;
        /** Decisions each JVM grades, at most. */
        public int perJvm;
        /** Each decision's budget. */
        public long msPerDecision;
        /** -1: playouts to the end of the game; else turns past this one, then the leaf. */
        public int horizon;
    }

    /**
     * {@code k} decisions on at most {@code jobs} JVMs inside {@code wallMs}:
     * one decision per JVM when {@code k <= jobs} -- every option of a decision
     * plays the same round seeds in one process, so the comparison stays paired
     * -- else {@code ceil(k / jobs)} each, the wall budget split between them.
     * To the end of the game ({@code deepHorizon}) when each decision has at
     * least {@code fullMinMs}, else to the end of the next turn.
     */
    public static Alloc allocate(final int k, final int jobs, final long wallMs, final int deepHorizon, final long fullMinMs) {
        final Alloc a = new Alloc();
        a.jobs = Math.max(0, Math.min(Math.max(1, jobs), k));
        a.perJvm = a.jobs == 0 ? 0 : (k + a.jobs - 1) / a.jobs;
        a.msPerDecision = a.perJvm == 0 ? 0 : wallMs / a.perJvm;
        a.horizon = a.msPerDecision >= fullMinMs ? deepHorizon : Math.max(1, deepHorizon);
        return a;
    }

    // ------------------------------------------------------------------
    // Selection
    // ------------------------------------------------------------------

    /** One graded decision as the report reads it: a {@code batch} line. */
    static final class Graded {
        final Map<?, ?> line;
        final Map<?, ?> grade;

        Graded(final Map<?, ?> line) {
            this.line = line;
            this.grade = WireLog.map(line, "grade");
        }

        String key() {
            return WireLog.str(line, "momentKey");
        }

        boolean ok() {
            return grade != null && "ok".equals(WireLog.str(grade, "status"));
        }

        String playedOption() {
            return WireLog.str(grade, "playedOption");
        }

        /** The option row with this token, or null. */
        Map<?, ?> option(final String token) {
            if (token == null) {
                return null;
            }
            for (final Object o : WireLog.arr(grade, "options")) {
                if (token.equals(WireLog.str((Map<?, ?>) o, "token"))) {
                    return (Map<?, ?>) o;
                }
            }
            return null;
        }

        Map<?, ?> playedRow() {
            return option(playedOption());
        }

        double d(final Map<?, ?> m, final String k) {
            final Object v = m == null ? null : m.get(k);
            return v instanceof Number ? ((Number) v).doubleValue() : Double.NaN;
        }

        /** The played option is not the best: a candidate for the deepening. */
        boolean candidate() {
            return "close".equals(verdict(this)) || "mistake".equals(verdict(this));
        }

        /** The played option has numbers: it played rounds, and a best exists to compare it with. */
        boolean measured() {
            final Map<?, ?> r = playedRow();
            final String best = WireLog.str(grade, "best");
            return ok() && r != null && best != null && !best.isEmpty() && WireLog.num(r, "n", 0) > 0
                    && Double.isFinite(d(r, "regret")) && Double.isFinite(d(r, "regretLo")) && Double.isFinite(d(r, "regretHi"));
        }
    }

    /** A deepening pick: the moment's key and why. */
    public static final class Pick {
        public final String key;
        public final String reason;

        Pick(final String key, final String reason) {
            this.key = key;
            this.reason = reason;
        }
    }

    /**
     * The decisions to grade again: graded {@code ok}, the player's choice one
     * of the options, and not the best; ranked by the upper end of its regret
     * interval (what the choice might have cost: large regrets and wide close
     * calls both rank high), ties by the point regret, then log order.  At most
     * {@code k}.
     */
    public static List<Pick> select(final List<Map<?, ?>> triage, final int k) {
        final List<Graded> c = new ArrayList<>();
        for (final Map<?, ?> l : triage) {
            final Graded g = new Graded(l);
            if (g.candidate()) {
                c.add(g);
            }
        }
        final Map<Graded, Integer> order = new HashMap<>();
        for (int i = 0; i < c.size(); i++) {
            order.put(c.get(i), i);
        }
        c.sort(Comparator.<Graded>comparingDouble(g -> -g.d(g.playedRow(), "regretHi"))
                .thenComparingDouble(g -> -g.d(g.playedRow(), "regret"))
                .thenComparingInt(order::get));
        final List<Pick> out = new ArrayList<>();
        for (final Graded g : c.subList(0, Math.min(k, c.size()))) {
            final Map<?, ?> r = g.playedRow();
            out.add(new Pick(g.key(), String.format(java.util.Locale.ROOT, "regret %.3f [%.3f, %.3f] at triage",
                    g.d(r, "regret"), g.d(r, "regretLo"), g.d(r, "regretHi"))));
        }
        return out;
    }

    /**
     * The options a deepened decision plays again (its {@code only}): the
     * player's, the triage's best, Forge's, then the rest by the triage's win
     * rate, at most {@code max} -- a big budget spent on the options that can
     * still change the verdict, not on the ones the triage already ruled out.
     * Every option of the list plays every round, so the comparison stays paired.
     */
    public static List<String> deepOptions(final Map<?, ?> triageLine, final int max) {
        final Graded g = new Graded(triageLine);
        final List<String> out = new ArrayList<>();
        for (final String t : new String[] {g.playedOption(), WireLog.str(g.grade, "best"), WireLog.str(g.grade, "forgeChoice")}) {
            if (t != null && !t.isEmpty() && !out.contains(t) && g.option(t) != null) {
                out.add(t);
            }
        }
        final List<Map<?, ?>> rest = new ArrayList<>();
        for (final Object o : WireLog.arr(g.grade, "options")) {
            final Map<?, ?> m = (Map<?, ?>) o;
            if (m.get("alias") == null && !WireLog.bool(m, "failed") && !out.contains(WireLog.str(m, "token"))) {
                rest.add(m);
            }
        }
        rest.sort(Comparator.comparingDouble(m -> {
            final double w = g.d(m, "winRate");
            return Double.isFinite(w) ? -w : 1;
        }));
        for (final Map<?, ?> m : rest) {
            if (out.size() >= max) {
                break;
            }
            out.add(WireLog.str(m, "token"));
        }
        return out;
    }

    // ------------------------------------------------------------------
    // Verdicts and the report
    // ------------------------------------------------------------------

    /** A deepened close call is a key moment only when its point regret is at least this (a tie is not). */
    static final double MIN_KEY_REGRET = 0.02;

    /** Below this a regret's lower bound is zero (the grader clips it there). */
    static final double CLEAR = 1e-9;

    /**
     * {@code best} -- the played option is the best; {@code mistake} -- not the
     * best and its regret interval excludes zero; {@code close} -- not the best
     * but the interval includes zero (a close call, not a mistake);
     * {@code not-graded} -- no table (one option, or the rebuild could not be
     * graded), the choice is not one of its options, or it has no numbers (every
     * playout of it failed).
     */
    static String verdict(final Graded g) {
        final Map<?, ?> r = g.playedRow();
        if (!g.measured()) {
            return "not-graded";
        }
        if (WireLog.bool(r, "best")) {
            return "best";
        }
        return g.d(r, "regretLo") > CLEAR ? "mistake" : "close";
    }

    /** The report's inputs beyond the graded lines. */
    public static final class Meta {
        public String log;
        public String gameId;
        public int seat;
        public int frames;
        public String createdAt;
        /** Raw JSON objects, written as they are. */
        public String config = "{}";
        public String timing = "{}";
    }

    /**
     * The report (docs/game-review.md): every planned decision with its final
     * table -- the deepened grade where there is one, else the triage's --, the
     * verdict, the key moments and the counts.
     */
    public static String report(final Meta meta, final List<Planned> plan, final List<Map<?, ?>> triage,
                                final List<Map<?, ?>> deep, final List<Pick> picks) {
        final Map<String, Graded> tri = new HashMap<>();
        for (final Map<?, ?> l : triage) {
            tri.put(WireLog.str(l, "momentKey"), new Graded(l));
        }
        final Map<String, Graded> dp = new HashMap<>();
        for (final Map<?, ?> l : deep) {
            final Graded g = new Graded(l);
            if (g.grade != null && !"error".equals(WireLog.str(g.grade, "status"))) {
                dp.put(g.key(), g);
            }
        }
        final Map<String, String> why = new HashMap<>();
        for (final Pick p : picks) {
            why.put(p.key, p.reason);
        }
        // The key moments: deepened mistakes by regret, deepened close calls by regretHi, then clear triage mistakes.
        final List<String> keys = new ArrayList<>();
        final Map<String, Graded> fin = new LinkedHashMap<>();
        for (final Planned p : plan) {
            final String k = p.momentKey(meta.log);
            final Graded g = dp.containsKey(k) ? dp.get(k) : tri.get(k);
            if (g != null) {
                fin.put(k, g);
            }
        }
        final List<String> deepM = new ArrayList<>();
        final List<String> deepC = new ArrayList<>();
        final List<String> triM = new ArrayList<>();
        for (final Map.Entry<String, Graded> e : fin.entrySet()) {
            final String v = verdict(e.getValue());
            final boolean isDeep = dp.containsKey(e.getKey());
            if (isDeep && "mistake".equals(v)) {
                deepM.add(e.getKey());
            } else if (isDeep && "close".equals(v) && e.getValue().d(e.getValue().playedRow(), "regret") >= MIN_KEY_REGRET) {
                deepC.add(e.getKey());   // a tie with the best (regret 0) is not a moment that mattered
            } else if (!isDeep && "mistake".equals(v)) {
                triM.add(e.getKey());
            }
        }
        deepM.sort(Comparator.comparingDouble(k -> -fin.get(k).d(fin.get(k).playedRow(), "regret")));
        deepC.sort(Comparator.comparingDouble(k -> -fin.get(k).d(fin.get(k).playedRow(), "regretHi")));
        triM.sort(Comparator.comparingDouble(k -> -fin.get(k).d(fin.get(k).playedRow(), "regret")));
        keys.addAll(deepM);
        keys.addAll(deepC);
        keys.addAll(triM);

        final Json.JsonOut j = new Json.JsonOut().obj().n("v", 1).n("kind", "game-review").n("gameId", meta.gameId)
                .n("seat", meta.seat).n("log", meta.log).n("frames", meta.frames).n("createdAt", meta.createdAt)
                .n("yardstick", "forge-default");
        String opponent = null;
        String ownDeck = null;
        for (final Graded g : fin.values()) {
            if (g.grade != null && opponent == null && WireLog.str(g.grade, "opponent") != null) {
                opponent = WireLog.str(g.grade, "opponent");
                ownDeck = WireLog.str(g.grade, "ownDeck");
            }
        }
        j.key("knowledge").obj().n("opponent", opponent == null ? "unknown" : opponent)
                .n("opponentModel", opponentModel(opponent)).n("ownDeck", ownDeck == null ? "unknown" : ownDeck).end();
        j.key("config").raw(meta.config);
        j.key("timing").raw(meta.timing);
        int graded = 0;
        int best = 0;
        int close = 0;
        int mistakes = 0;
        int notGraded = 0;
        int trivial = 0;
        for (final Planned p : plan) {
            final Graded g = fin.get(p.momentKey(meta.log));
            final String v = g == null ? "not-graded" : verdict(g);
            trivial += g != null && g.grade != null && "trivial".equals(WireLog.str(g.grade, "status")) ? 1 : 0;
            graded += "not-graded".equals(v) ? 0 : 1;
            best += "best".equals(v) ? 1 : 0;
            close += "close".equals(v) ? 1 : 0;
            mistakes += "mistake".equals(v) ? 1 : 0;
            notGraded += "not-graded".equals(v) ? 1 : 0;
        }
        j.key("summary").obj().n("decisions", plan.size()).n("graded", graded).n("best", best).n("closeCalls", close)
                .n("mistakes", mistakes).n("notGraded", notGraded).n("trivial", trivial).n("deepened", dp.size()).end();
        j.key("keyMoments").arr();
        for (final String k : keys) {
            j.v(Long.parseLong(k.substring(k.lastIndexOf("#live") + 5, k.lastIndexOf(':'))));
        }
        j.end();
        j.key("decisions").arr();
        for (final Planned p : plan) {
            final String k = p.momentKey(meta.log);
            final Graded g = fin.get(k);
            j.obj().n("frame", p.frame).n("stateFrame", p.stateFrame).n("turn", p.turn).n("round", p.round)
                    .n("phase", p.phase).n("type", p.type);
            if (g == null || g.grade == null) {
                j.n("status", "error").n("error", "not graded (the triage did not reach it)").n("stage", "triage");
                str(j, "played", p.played);
                j.nNull("playedOption").n("verdict", "not-graded").n("clear", false).n("key", false);
                j.end();
                continue;
            }
            final Map<?, ?> gr = g.grade;
            final boolean isDeep = dp.containsKey(k);
            j.n("status", String.valueOf(WireLog.str(gr, "status"))).n("stage", isDeep ? "deep" : "triage");
            str(j, "error", WireLog.str(gr, "error"));
            str(j, "measure", WireLog.str(gr, "measure"));
            num(j, "rounds", gr.get("rounds"));
            num(j, "playouts", gr.get("playouts"));
            num(j, "ms", gr.get("ms"));
            str(j, "played", p.played);
            str(j, "playedOption", g.playedOption());
            if (g.playedOption() == null) {
                j.nNull("playedOption");
            }
            final Map<?, ?> pr = g.playedRow();
            if (pr != null) {
                str(j, "playedLabel", WireLog.str(pr, "label"));
            }
            final String bestTok = WireLog.str(gr, "best");
            if (bestTok != null && !bestTok.isEmpty()) {
                j.n("best", bestTok);
                final Map<?, ?> br = g.option(bestTok);
                if (br != null) {
                    str(j, "bestLabel", WireLog.str(br, "label"));
                }
            }
            str(j, "forgeChoice", WireLog.str(gr, "forgeChoice"));
            if (pr != null && g.ok()) {
                num(j, "regret", pr.get("regret"));
                num(j, "regretLo", pr.get("regretLo"));
                num(j, "regretHi", pr.get("regretHi"));
            }
            final String v = verdict(g);
            final int rank = keys.indexOf(k);
            j.n("verdict", v).n("clear", "mistake".equals(v)).n("key", rank >= 0);
            if (rank >= 0) {
                j.n("rank", rank + 1);
            }
            str(j, "selectReason", why.get(k));
            j.key("options").arr();
            final String po = g.playedOption();
            for (final Object oo : WireLog.arr(gr, "options")) {
                final Map<?, ?> o = (Map<?, ?>) oo;
                j.obj();
                for (final String f : new String[] {"token", "label", "alias"}) {
                    str(j, f, WireLog.str(o, f));
                }
                for (final String f : new String[] {"n", "winRate", "winLo", "winHi", "regret", "regretLo", "regretHi"}) {
                    num(j, f, o.get(f));
                }
                j.n("best", WireLog.bool(o, "best")).n("forge", WireLog.bool(o, "forge"))
                        .n("played", po != null && po.equals(WireLog.str(o, "token")));
                if (WireLog.bool(o, "failed")) {
                    j.n("failed", true);
                }
                j.end();
            }
            j.end();
            strings(j, "fidelity", WireLog.arr(gr, "fidelity"));
            strings(j, "notes", WireLog.arr(gr, "notes"));
            if (isDeep && tri.containsKey(k)) {
                final Graded t = tri.get(k);
                j.key("triage").obj();
                str(j, "status", WireLog.str(t.grade, "status"));
                str(j, "measure", WireLog.str(t.grade, "measure"));
                num(j, "rounds", t.grade == null ? null : t.grade.get("rounds"));
                str(j, "best", WireLog.str(t.grade, "best"));
                final Map<?, ?> tr = t.playedRow();
                if (tr != null) {
                    num(j, "regret", tr.get("regret"));
                    num(j, "regretLo", tr.get("regretLo"));
                    num(j, "regretHi", tr.get("regretHi"));
                }
                j.end();
            }
            j.end();
        }
        j.end();
        return j.end().done();
    }

    /**
     * What the opponent's hidden cards were drawn from: {@code pool} (a cube
     * list minus what the viewer owns and everything public), {@code deck} (a
     * list marked public with a reason), or {@code basic-lands} (nothing known:
     * the opponent is modelled with no spells, so every number flatters the
     * viewer -- the screen must say so).
     */
    static String opponentModel(final String opponent) {
        if (opponent == null || opponent.equals("unknown")) {
            return "basic-lands";
        }
        return opponent.startsWith("pool:") ? "pool" : opponent.startsWith("deck:") ? "deck" : "basic-lands";
    }

    private static void str(final Json.JsonOut j, final String k, final String v) {
        if (v != null) {
            j.n(k, v);
        }
    }

    private static void num(final Json.JsonOut j, final String k, final Object v) {
        if (v instanceof Long || v instanceof Integer) {
            j.n(k, ((Number) v).longValue());
        } else if (v instanceof Number && Double.isFinite(((Number) v).doubleValue())) {
            j.n(k, ((Number) v).doubleValue());
        }
    }

    private static void strings(final Json.JsonOut j, final String k, final Object[] vs) {
        j.key(k).arr();
        for (final Object v : vs) {
            j.v(String.valueOf(v));
        }
        j.end();
    }

    /** The decisions of a report whose status is {@code error} or {@code refused}. */
    public static int errors(final Map<?, ?> report) {
        int n = 0;
        for (final Object o : WireLog.arr(report, "decisions")) {
            final String st = WireLog.str((Map<?, ?>) o, "status");
            n += "error".equals(st) || "refused".equals(st) ? 1 : 0;
        }
        return n;
    }

    /**
     * Why a report is not a review, or null (D353, amended after the PC's J028): every planned decision
     * is an error or refused -- the triage graded nothing, because its JVMs failed (the shard logs say
     * why).  A report with some errors is a review; its DONE line counts them.  No decisions is no failure.
     */
    public static String failure(final Map<?, ?> report) {
        final Object[] ds = WireLog.arr(report, "decisions");
        final int bad = errors(report);
        if (ds.length == 0 || bad < ds.length) {
            return null;
        }
        final String first = WireLog.str((Map<?, ?>) ds[0], "error");
        return "every decision (" + ds.length + ") is an error or refused" + (first == null ? "" : "; the first: " + first);
    }

    /** The graded time of a stage: the busiest JVM's sum of grade {@code ms} (by each line's {@code shard}; else line i is JVM i mod jobs). */
    public static long gradeMs(final List<Map<?, ?>> lines, final List<String> order, final int jobs) {
        final long[] per = new long[Math.max(1, jobs)];
        final Map<String, Integer> idx = new HashMap<>();
        for (int i = 0; i < order.size(); i++) {
            idx.put(order.get(i), i);
        }
        for (final Map<?, ?> l : lines) {
            final Integer i = idx.get(WireLog.str(l, "momentKey"));
            final Map<?, ?> g = WireLog.map(l, "grade");
            final long shard = WireLog.num(l, "shard", i == null ? 0 : i);   // claimed work: the line says which JVM
            if (g != null) {
                per[(int) (shard % per.length)] += WireLog.num(g, "ms", 0);
            }
        }
        long m = 0;
        for (final long v : per) {
            m = Math.max(m, v);
        }
        return m;
    }
}
