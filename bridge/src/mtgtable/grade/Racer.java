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

import java.util.Arrays;

/**
 * The grader's playout schedule (D-grade): rounds of common random numbers
 * with racing.  Pure -- the playout is a callback -- so {@link GradeSelfTest}
 * runs it against synthetic options with known win rates.
 *
 * <p>Round r: one seed ({@link GradeMath#roundSeed}), every still-active
 * option played once with it.  After {@code initial} rounds, and every
 * {@code batch} rounds after that, {@link GradeMath#race} retires the options
 * that are clearly worse than the current best; the rest keep playing until
 * they have {@code target} rounds, only one is left, or a budget (playouts,
 * wall clock) runs out.  A playout that fails returns NaN; an option that fails
 * in more than a fifth of its rounds (and at least three) is retired and
 * flagged.
 */
public final class Racer {

    private Racer() { }

    /** One playout of option {@code option} on round {@code round}'s seed: 1 won, 0 lost, 0.5 draw / capped, NaN failed. */
    public interface Play {
        double play(int option, int round, long seed);
    }

    public static final class Config {
        /** Rounds an option still in the race ends with. */
        public int target = 200;
        /** Rounds every option plays before the first elimination. */
        public int initial = 40;
        /** Rounds between eliminations. */
        public int batch = 20;
        /** The elimination's z (99% by default: many looks, so stricter than the report's 95%). */
        public double zElim = GradeMath.Z99;
        /** False: every option plays every round (no racing). */
        public boolean race = true;
        public long maxPlayouts = Long.MAX_VALUE;
        /** {@code System.nanoTime()} past which no new round starts. */
        public long deadline = Long.MAX_VALUE;
    }

    public static final class Result {
        public double[][] x;
        public boolean[] active;
        public boolean[] failed;
        public int[] errors;
        public int rounds;
        public long playouts;
        /** "target", "decided" (one option left), "playouts", "time". */
        public String stop;
    }

    public static Result run(final int k, final String key, final long runSeed, final Config c, final Play p) {
        final Result res = new Result();
        res.x = new double[k][c.target];
        for (final double[] row : res.x) {
            Arrays.fill(row, Double.NaN);
        }
        res.active = new boolean[k];
        Arrays.fill(res.active, true);
        res.failed = new boolean[k];
        res.errors = new int[k];
        res.stop = "target";
        for (int r = 0; r < c.target; r++) {
            if (System.nanoTime() > c.deadline) {
                res.stop = "time";
                break;
            }
            if (res.playouts >= c.maxPlayouts) {
                res.stop = "playouts";
                break;
            }
            final long seed = GradeMath.roundSeed(runSeed, key, r);
            for (int i = 0; i < k; i++) {
                if (!res.active[i]) {
                    continue;
                }
                final double v = p.play(i, r, seed);
                res.playouts++;
                res.x[i][r] = v;
                if (Double.isNaN(v)) {
                    res.errors[i]++;
                    if (res.errors[i] >= 3 && res.errors[i] * 5 > r + 1) {
                        res.active[i] = false;
                        res.failed[i] = true;
                    }
                }
            }
            res.rounds = r + 1;
            if (c.race && res.rounds >= c.initial && (res.rounds - c.initial) % Math.max(1, c.batch) == 0) {
                res.active = GradeMath.race(res.x, res.active, c.zElim, c.initial);
            }
            int left = 0;
            for (final boolean a : res.active) {
                left += a ? 1 : 0;
            }
            if (left <= 1 && res.rounds >= c.initial) {
                res.stop = "decided";
                break;
            }
        }
        return res;
    }
}
