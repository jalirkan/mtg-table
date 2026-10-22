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

import java.util.Locale;
import java.util.Map;
import java.util.SplittableRandom;
import java.util.TreeMap;

/**
 * Play exploration's engine-free half (D358): the settings, the seeded
 * generator, the epsilon coin, the uniform pick and the close-call rule, and
 * the counters a game reports.  {@link Explorer} applies them to a live game;
 * {@code DecisionSelfTest} checks this class without booting Forge.
 *
 * <p><b>Its own random stream.</b>  Every draw here comes from a
 * {@link SplittableRandom} seeded from (draft seed, game, seat) by
 * {@link #seedFor}, never from Forge's {@code MyRandom}: exploring must not move
 * the game's own stream, and the same draft, game and seat draw the same coins
 * in the same order on any machine and under any {@code --jobs}.
 */
public final class ExploreMath {

    /** The settings of one exploring game (a {@code playExplore} block of a cube-lab job line). */
    public static final class Config {
        /** Probability that a decision of an explorable kind is replaced by a uniformly random legal one. */
        public final double epsilon;
        /** Relative margin on Forge's creature score under which Forge's choice and its nearest rival are a coin flip; 0 = off. */
        public final double closeCall;
        /** Play/draw by a fair coin, and the seven-card mulligan decision explorable. */
        public final boolean opening;
        /**
         * D451: the RANDOM seat of the move atlas.  Every explorable decision is
         * random (epsilon 1), over a wider list of plays (every castable spell
         * and non-mana ability, targets drawn at random), under the mechanical
         * guardrails of D451 (a legal land drop is always taken, no pass in main
         * phase 1 while one is pending, a pure no-op is never repeated twice in a
         * row, the opening hand is always kept, a play the engine refused to pay
         * for is not picked again in the same priority window -- G5, D458); no
         * close calls.
         */
        public final boolean random;

        public Config(final double epsilon, final double closeCall, final boolean opening) {
            this(epsilon, closeCall, opening, false);
        }

        public Config(final double epsilon, final double closeCall, final boolean opening, final boolean random) {
            if (!(epsilon >= 0 && epsilon <= 1) || !(closeCall >= 0 && closeCall < 1)) {
                throw new IllegalArgumentException(String.format(Locale.ROOT,
                        "play exploration: epsilon in [0, 1] and closeCall in [0, 1), got %s and %s", epsilon, closeCall));
            }
            if (random && (epsilon != 1 || closeCall != 0 || opening)) {
                throw new IllegalArgumentException("the random seat (D451) is epsilon 1, no close calls, opening off");
            }
            this.epsilon = epsilon;
            this.closeCall = closeCall;
            this.opening = opening;
            this.random = random;
        }

        /** D451: the random seat's settings. */
        public static Config randomSeat() {
            return new Config(1, 0, false, true);
        }

        /** From a job line's {@code playExplore} object (Jetty's parser: numbers are Long or Double); null in, null out. */
        public static Config of(final Object o) {
            if (!(o instanceof Map)) {
                return null;
            }
            final Map<?, ?> m = (Map<?, ?>) o;
            if (Boolean.TRUE.equals(m.get("random"))) {
                return randomSeat();
            }
            return new Config(num(m.get("epsilon")), num(m.get("closeCall")), Boolean.TRUE.equals(m.get("opening")));
        }

        private static double num(final Object v) {
            return v instanceof Number ? ((Number) v).doubleValue() : 0;
        }
    }

    /** splitmix64's finaliser: a good 64-bit mix. */
    static long mix(long z) {
        z = (z ^ (z >>> 30)) * 0xbf58476d1ce4e5b9L;
        z = (z ^ (z >>> 27)) * 0x94d049bb133111ebL;
        return z ^ (z >>> 31);
    }

    /**
     * The generator seed of one seat in one game: a pure function of the draft's
     * seed, the game's number in the match and the seat (0 = drafter A, 1 =
     * drafter B, -1 = the game's own draws: play or draw).
     */
    public static long seedFor(final long draftSeed, final int game, final int seat) {
        long h = mix(0x9E3779B97F4A7C15L ^ 0x504C41594558L);   // "PLAYEX"
        h = mix(h ^ draftSeed);
        h = mix(h ^ game);
        return mix(h ^ (seat + 2L));
    }

    private final Config cfg;
    private final SplittableRandom rnd;
    private final long seed;

    /** Coins drawn, decisions randomised, randomised decisions whose answer is not Forge's; per kind. */
    private final Map<String, int[]> byKind = new TreeMap<>();
    private int coins;
    private int randomised;
    private int changed;
    private int closeCalls;
    private int closeCallsChanged;
    private int failures;
    /** D451: the random seat's guardrails, by name: how often each decided or removed an option. */
    private final Map<String, Integer> guardrails = new TreeMap<>();

    public ExploreMath(final Config cfg, final long seed) {
        this.cfg = cfg;
        this.seed = seed;
        this.rnd = new SplittableRandom(seed);
    }

    public Config config() {
        return cfg;
    }

    public long seed() {
        return seed;
    }

    /** The epsilon coin: true with probability epsilon (one draw, always, so the stream does not depend on what follows). */
    public boolean coin() {
        coins++;
        return rnd.nextDouble() < cfg.epsilon;
    }

    /** A fair coin (play or draw; a close call). */
    public boolean fair() {
        return rnd.nextBoolean();
    }

    /** A uniform index in [0, n). */
    public int pick(final int n) {
        if (n <= 0) {
            throw new IllegalArgumentException("pick from " + n);
        }
        return rnd.nextInt(n);
    }

    /** A uniform bit mask over {@code n} items (n at most 62). */
    public long mask(final int n) {
        if (n <= 0) {
            return 0L;
        }
        if (n > 62) {
            throw new IllegalArgumentException("mask over " + n);
        }
        return rnd.nextLong() & ((1L << n) - 1);
    }

    /**
     * The close-call rule: Forge chose the option scored {@code forgeScore}; a
     * rival scored {@code rival} is a close call when the two are within
     * {@code closeCall} of the larger magnitude (both non-negative scores; a
     * zero pair is a tie).  Off when closeCall is 0.
     */
    public static boolean isCloseCall(final double forgeScore, final double rival, final double closeCall) {
        if (closeCall <= 0) {
            return false;
        }
        final double top = Math.max(Math.abs(forgeScore), Math.abs(rival));
        return Math.abs(forgeScore - rival) <= closeCall * top;
    }

    /**
     * The rival nearest Forge's choice among {@code scores} (index of the
     * smallest |score - forgeScore|, the first on a tie), or -1 when none is a
     * close call.
     */
    public static int nearestCloseCall(final double forgeScore, final double[] scores, final double closeCall) {
        int best = -1;
        double bestGap = Double.POSITIVE_INFINITY;
        for (int i = 0; i < scores.length; i++) {
            final double gap = Math.abs(scores[i] - forgeScore);
            if (gap < bestGap && isCloseCall(forgeScore, scores[i], closeCall)) {
                best = i;
                bestGap = gap;
            }
        }
        return best;
    }

    // ------------------------------------------------------------------
    // Counters
    // ------------------------------------------------------------------

    /** A decision of {@code kind} was answered at random; {@code sameAsForge} when the draw is Forge's own answer. */
    public void randomised(final String kind, final boolean sameAsForge) {
        randomised++;
        if (!sameAsForge) {
            changed++;
        }
        final int[] k = byKind.computeIfAbsent(kind, x -> new int[2]);
        k[0]++;
        if (!sameAsForge) {
            k[1]++;
        }
    }

    /** A close call was found and settled by a fair coin; {@code swapped} when the rival was taken. */
    public void closeCall(final boolean swapped) {
        closeCalls++;
        if (swapped) {
            closeCallsChanged++;
        }
    }

    /** Exploring a decision threw; Forge's answer stood. */
    public void failed() {
        failures++;
    }

    public int coins() {
        return coins;
    }

    public int randomised() {
        return randomised;
    }

    public int changed() {
        return changed;
    }

    public int closeCalls() {
        return closeCalls;
    }

    public int closeCallsChanged() {
        return closeCallsChanged;
    }

    public int failures() {
        return failures;
    }

    /** D451: a guardrail decided ({@code land}, {@code keep}) or removed an option ({@code noRepeatNoOp}). */
    public void guardrail(final String name) {
        guardrails.merge(name, 1, Integer::sum);
    }

    /** D451: the guardrails' counts. */
    public Map<String, Integer> guardrails() {
        return guardrails;
    }

    /** Randomised decisions per kind: {kind: {randomised, changed}}. */
    public Map<String, int[]> byKind() {
        return byKind;
    }
}
