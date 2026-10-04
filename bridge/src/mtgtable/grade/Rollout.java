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
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import forge.game.combat.Combat;
import forge.game.phase.PhaseHandler;
import forge.game.phase.PhaseType;
import mtgtable.Json;
import mtgtable.ai.SearchPolicy;

/**
 * The rollout labels (D378): one dataset position, played out K times by
 * Forge's Default AI on both seats, from the viewer's redacted view of it.
 * The label is the viewer's mean result: a win 1, a loss 0, a draw or a game
 * still going at {@link Settings#maxTurns} a half.  {@code train_eval.py
 * --soft-labels} trains on it (D364).
 *
 * <p>Everything a grade does to a position, a rollout does the same way:
 * {@link Rebuild} rebuilds it from the log (never the engine's real hidden
 * zones, which the log does not carry), and {@link SearchPolicy#playout} copies
 * it, REDEALS what the viewer cannot see with the round's seed (the
 * opponent's hand, library and unknown face-down cards from the POOL, D348; the
 * viewer's library from their own deck list) and plays it on.  The only
 * difference from a grade is that nothing is forced: the first answer is
 * Forge's own ({@link SearchPolicy#forgeCand}).
 *
 * <p>Seeds: round r of a position plays on {@link GradeMath#roundSeed}(seed,
 * key, r) -- the rebuild's deal and the engine's stream both -- so a label is a
 * function of (seed, key, K), the log and the knowledge, up to Forge's own
 * wall-clock AI timeouts (D311; a rollout gives the AI 1 s a decision).  The
 * key is {@code <game key>#<state frame>} -- encode.py's {@code game_key}, a
 * hash of the log's name, game id, start time and seat -- not the dataset's row
 * index, so a position keeps its label (and its seeds) when the dataset around
 * it is rebuilt or the logs move.
 */
public final class Rollout {

    private Rollout() { }

    /** A rollout run's settings. */
    public static final class Settings {
        /** Playouts per position. */
        public int k = 32;
        public long seed = 1;
        /** Turns past the position after which an unfinished playout is scored a draw. */
        public int maxTurns = 40;
        public int maxSteps = 200_000;
        public long playoutTimeoutMs = 120_000;
        /** Wall-clock budget for one position, ms (0 = none): the playouts done by then are the label. */
        public long maxMs;
    }

    /** One playout's value for the viewer: won 1, lost 0, a draw or not over a half. */
    public static double value(final SearchPolicy.Playout p) {
        if (p == null) {
            return Double.NaN;
        }
        return p.result > 0 ? 1.0 : p.result < 0 ? 0.0 : 0.5;
    }

    /** The label of a position from its playouts' values (NaN: failed, left out). */
    public static final class Label {
        public int k;
        public int wins;
        public int losses;
        public int draws;
        public int errors;
        public double p = Double.NaN;
        public double lo = Double.NaN;
        public double hi = Double.NaN;

        public static Label of(final double[] values) {
            final Label l = new Label();
            for (final double v : values) {
                if (Double.isNaN(v)) {
                    l.errors++;
                } else if (v == 1.0) {
                    l.wins++;
                } else if (v == 0.0) {
                    l.losses++;
                } else {
                    l.draws++;
                }
            }
            l.k = l.wins + l.losses + l.draws;
            if (l.k > 0) {
                l.p = (l.wins + 0.5 * l.draws) / l.k;
                final double[] w = GradeMath.wilson(l.wins + 0.5 * l.draws, l.k, GradeMath.Z95);
                l.lo = w[1];
                l.hi = w[2];
            }
            return l;
        }
    }

    /**
     * A state rebuilt INSIDE the beginning-of-combat step has no combat: Forge
     * makes it as that step begins, and the rebuild starts after that.  The
     * next step (declare attackers) then dereferences it.  Give it the empty
     * combat Forge would have made (the active player attacks, nobody yet).
     * Returns whether it did.
     */
    static boolean ensureCombat(final Rebuild.Base b) {
        final PhaseHandler ph = b.game.getPhaseHandler();
        if (ph.getPhase() == PhaseType.COMBAT_BEGIN && ph.getCombat() == null && ph.getPlayerTurn() != null) {
            ph.setCombat(new Combat(ph.getPlayerTurn()));
            return true;
        }
        return false;
    }

    /** The position's key: the game's key (encode.py's game_key) and the state frame's index (WireLog's). */
    public static String key(final String gameKey, final int stateFrame) {
        return gameKey + "#" + stateFrame;
    }

    /**
     * The state frame a dataset row names by its {@code seq} (encode.py keeps
     * the s2c frame's {@code seq}), or -1.  A row is a decision state: a state
     * frame where the viewer holds priority.
     */
    public static int frameOfSeq(final WireLog log, final long seq) {
        for (int i = 0; i < log.frames.size(); i++) {
            final Map<?, ?> f = log.frames.get(i);
            if ("state".equals(f.get("type")) && WireLog.num(f, "seq", -1) == seq && !"c2s".equals(WireLog.str(f, "dir"))) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Label one position: its JSON line.  Call on a Forge game thread (one task
     * at a time, as {@link Grader#run}).  {@code extra} is copied into the line
     * first (the moment's own fields: the dataset's game index and rows_to_end).
     */
    public static String run(final WireLog log, final WireLog.Moment m, final Rebuild.Knowledge know, final Settings s,
                             final String key, final Map<String, Object> extra) {
        final long t0 = System.nanoTime();
        final Json.JsonOut j = new Json.JsonOut().obj().n("v", 1).n("key", key);
        for (final Map.Entry<String, Object> e : extra.entrySet()) {
            final Object v = e.getValue();
            if (v instanceof Number) {
                j.n(e.getKey(), ((Number) v).longValue());
            } else {
                j.n(e.getKey(), String.valueOf(v));
            }
        }
        j.n("turn", WireLog.num(m.state, "turn", 0)).n("phase", String.valueOf(WireLog.str(m.state, "phase")))
                .n("seat", log.seat).n("opponent", know.oppSource).n("ownDeck", know.ownSource).n("seed", s.seed);
        if (WireLog.num(m.state, "priority", -1) != log.seat || m.state.get("gameOver") != null) {
            return j.n("status", "not-a-decision").n("error", "the viewer does not hold priority in this state")
                    .n("ms", (System.nanoTime() - t0) / 1_000_000L).end().done();
        }
        final Rebuild rb;
        final List<String> fidelity;
        Rebuild.Base first;
        try {
            rb = new Rebuild(log, m, know);
            first = rb.build(GradeMath.roundSeed(s.seed, key, 0), new Rebuild.Tweaks());
            fidelity = new ArrayList<>(first.fidelity);
            if (ensureCombat(first)) {
                fidelity.add("beginning of combat: the step's empty combat is made, as Forge makes it when the step begins");
            }
        } catch (final RuntimeException e) {
            return j.n("status", "unsupported").n("error", String.valueOf(e.getMessage() != null ? e.getMessage() : e))
                    .n("ms", (System.nanoTime() - t0) / 1_000_000L).end().done();
        }
        final Map<String, Integer> counters = new TreeMap<>();
        final SearchPolicy.Sink sink = new SearchPolicy.Sink() {
            @Override
            public void add(final String k, final int n) {
                counters.merge(k, n, Integer::sum);
            }

            @Override
            public void event(final String text) {
                // counters only
            }
        };
        final long budgetEnd = s.maxMs > 0 ? t0 + s.maxMs * 1_000_000L : Long.MAX_VALUE;
        final double[] values = new double[s.k];
        String firstError = null;
        int done = 0;
        int turns = 0;
        for (int r = 0; r < s.k; r++) {
            if (r > 0 && System.nanoTime() > budgetEnd) {
                break;
            }
            final long seed = GradeMath.roundSeed(s.seed, key, r);
            try {
                final Rebuild.Base base = r == 0 ? first : rb.build(seed, new Rebuild.Tweaks());
                ensureCombat(base);
                final long deadline = Math.min(System.nanoTime() + s.playoutTimeoutMs * 1_000_000L, budgetEnd);
                final SearchPolicy.Playout p = SearchPolicy.playout(base.game, base.viewer, SearchPolicy.forgeCand(), seed,
                        new SearchPolicy.Limits(deadline, s.maxTurns, s.maxSteps, 1.0, false, null), sink, r == 0, null);
                if (p == null) {
                    counters.merge("rollout.timeouts", 1, Integer::sum);
                }
                values[done] = value(p);
                turns += p == null ? 0 : p.turns;
            } catch (final RuntimeException | StackOverflowError e) {
                counters.merge("rollout.errors", 1, Integer::sum);
                counters.merge("rollout.error." + e.getClass().getSimpleName(), 1, Integer::sum);
                values[done] = Double.NaN;
                if (firstError == null) {
                    final Throwable c = e.getCause() != null ? e.getCause() : e;
                    final StringBuilder where = new StringBuilder(String.valueOf(c));
                    for (int i = 0; i < Math.min(4, c.getStackTrace().length); i++) {
                        where.append(" | at ").append(c.getStackTrace()[i]);
                    }
                    firstError = where.toString();
                }
            }
            done++;
        }
        final double[] played = java.util.Arrays.copyOf(values, done);
        final Label l = Label.of(played);
        final long ms = (System.nanoTime() - t0) / 1_000_000L;
        j.n("status", l.k == 0 ? "error" : "ok").n("k", l.k).n("wins", l.wins).n("losses", l.losses).n("draws", l.draws)
                .n("errors", l.errors);
        if (firstError != null) {
            j.n("firstError", firstError);
        }
        if (l.k > 0) {
            j.n("p", l.p).n("lo", l.lo).n("hi", l.hi).n("meanTurns", (double) turns / Math.max(1, l.k));
        }
        j.key("results").arr();
        for (final double v : played) {
            if (Double.isNaN(v)) {
                j.vNull();
            } else {
                j.v(v);
            }
        }
        j.end();
        j.key("fidelity").arr();
        for (final String f : fidelity) {
            j.v(f);
        }
        j.end();
        j.key("counters").obj();
        for (final Map.Entry<String, Integer> e : counters.entrySet()) {
            j.n(e.getKey(), e.getValue());
        }
        j.end();
        return j.n("ms", ms).n("msPerPlayout", done == 0 ? 0 : ms / done).end().done();
    }
}
