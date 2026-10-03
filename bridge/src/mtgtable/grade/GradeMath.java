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
import java.util.Arrays;
import java.util.List;

/**
 * The coach grader's arithmetic (D332): no Forge class, so
 * {@link GradeSelfTest} holds it on every build.
 *
 * <ul>
 * <li><b>Common random numbers.</b> Round {@code r} of a position has one seed,
 *     {@link #roundSeed}, used by every option: the same determinization of the
 *     hidden cards and the same engine random stream at the start.  The seed is
 *     a function of (the run's seed, the position's key, r) only -- never of
 *     the option -- so option differences are paired.</li>
 * <li><b>Outcomes.</b> A playout scores 1 (the graded seat won), 0 (lost) or
 *     0.5 (a draw, or a playout stopped by a cap).  {@code NaN} marks a round an
 *     option did not play (eliminated, or an error).</li>
 * <li><b>Win rate</b>: the mean, with Wilson's 95% interval on the (possibly
 *     half-) wins.</li>
 * <li><b>Regret</b> of option i: {@code best − i} where best is the active
 *     option with the highest mean, estimated as the mean of the paired
 *     differences over the rounds both played, with a normal interval whose
 *     standard error is floored at 1/n (zero discordant rounds out of n still
 *     leave a difference of about 1/n unexcluded -- the rule of three's
 *     spirit).  Regret is at least 0, so the interval is clipped at 0.  The
 *     best option's own interval runs from 0 to the largest amount by which
 *     another option might still beat it.</li>
 * <li><b>Racing</b> (adaptive allocation): after a minimum number of rounds,
 *     an option whose paired difference to the current best is above zero at
 *     a stricter level ({@code zElim}, 99% by default) stops being played; the
 *     options still close to the best keep getting rounds.</li>
 * </ul>
 */
public final class GradeMath {

    private GradeMath() { }

    public static final double Z95 = 1.959963984540054;
    public static final double Z99 = 2.5758293035489;

    // ------------------------------------------------------------------
    // Seeds
    // ------------------------------------------------------------------

    /** SplitMix64's finaliser: a well-mixed 64-bit function of {@code x}. */
    public static long mix(final long x) {
        long z = x + 0x9E3779B97F4A7C15L;
        z = (z ^ (z >>> 30)) * 0xBF58476D1CE4E5B9L;
        z = (z ^ (z >>> 27)) * 0x94D049BB133111EBL;
        return z ^ (z >>> 31);
    }

    /** A stable 64-bit hash of a string (FNV-1a, then mixed). */
    public static long hash(final String s) {
        long h = 0xcbf29ce484222325L;
        for (int i = 0; i < s.length(); i++) {
            h ^= s.charAt(i);
            h *= 0x100000001b3L;
        }
        return mix(h);
    }

    /** The seed of round {@code r} of position {@code key}: the same for every option (CRN). */
    public static long roundSeed(final long runSeed, final String key, final int r) {
        final long s = mix(mix(runSeed ^ hash(key)) + r);
        return s == 0 ? 1 : s;
    }

    // ------------------------------------------------------------------
    // Intervals
    // ------------------------------------------------------------------

    /** Wilson score interval for k successes (k may be fractional: draws count a half) in n trials. */
    public static double[] wilson(final double k, final int n, final double z) {
        if (n <= 0) {
            return new double[] {Double.NaN, 0, 1};
        }
        final double p = k / n;
        final double z2 = z * z;
        final double denom = 1 + z2 / n;
        final double centre = (p + z2 / (2.0 * n)) / denom;
        final double half = z * Math.sqrt(p * (1 - p) / n + z2 / (4.0 * n * n)) / denom;
        return new double[] {p, Math.max(0, centre - half), Math.min(1, centre + half)};
    }

    /** Mean, standard error (floored at 1/n) and n of {@code a[r] − b[r]} over the rounds both played. */
    public static double[] pairedDiff(final double[] a, final double[] b) {
        int n = 0;
        double sum = 0;
        for (int r = 0; r < Math.min(a.length, b.length); r++) {
            if (!Double.isNaN(a[r]) && !Double.isNaN(b[r])) {
                n++;
                sum += a[r] - b[r];
            }
        }
        if (n == 0) {
            return new double[] {Double.NaN, Double.NaN, 0};
        }
        final double mean = sum / n;
        double ss = 0;
        for (int r = 0; r < Math.min(a.length, b.length); r++) {
            if (!Double.isNaN(a[r]) && !Double.isNaN(b[r])) {
                final double d = a[r] - b[r] - mean;
                ss += d * d;
            }
        }
        final double var = n > 1 ? ss / (n - 1) : 0.25;
        final double se = Math.sqrt(var / n + 1.0 / ((double) n * n));
        return new double[] {mean, se, n};
    }

    // ------------------------------------------------------------------
    // The table
    // ------------------------------------------------------------------

    /** One option's line of the regret table. */
    public static final class Row {
        public int n;
        public double winRate;
        public double winLo;
        public double winHi;
        public double regret;
        public double regretLo;
        public double regretHi;
        /** Rounds the regret is paired over (0 for the best itself). */
        public int pairedN;
        public boolean best;
        public boolean active;
    }

    /** Index of the active option with the highest mean (ties: the most rounds, then the lowest index). */
    public static int bestOf(final double[][] x, final boolean[] active) {
        int best = -1;
        double bm = Double.NEGATIVE_INFINITY;
        int bn = -1;
        for (int i = 0; i < x.length; i++) {
            if (!active[i]) {
                continue;
            }
            final int n = count(x[i]);
            if (n == 0) {
                continue;
            }
            final double m = mean(x[i]);
            if (m > bm + 1e-12 || (Math.abs(m - bm) <= 1e-12 && n > bn)) {
                best = i;
                bm = m;
                bn = n;
            }
        }
        return best;
    }

    /** The regret table: {@code x[option][round]} outcomes (NaN = not played), {@code active} at the end. */
    public static Row[] table(final double[][] x, final boolean[] active, final double z) {
        final int k = x.length;
        final Row[] rows = new Row[k];
        final int best = bestOf(x, active);
        double bestHi = 0;
        for (int i = 0; i < k; i++) {
            final Row row = new Row();
            rows[i] = row;
            row.n = count(x[i]);
            final double wins = sum(x[i]);
            final double[] w = wilson(wins, row.n, z);
            row.winRate = w[0];
            row.winLo = w[1];
            row.winHi = w[2];
            row.active = active[i];
            row.best = i == best;
            if (best < 0 || row.n == 0) {
                row.regret = Double.NaN;
                row.regretLo = Double.NaN;
                row.regretHi = Double.NaN;
                continue;
            }
            if (i == best) {
                continue;   // filled below
            }
            final double[] d = pairedDiff(x[best], x[i]);
            row.pairedN = (int) d[2];
            if (row.pairedN == 0) {
                row.regret = Double.NaN;
                row.regretLo = Double.NaN;
                row.regretHi = Double.NaN;
                continue;
            }
            row.regret = Math.max(0, d[0]);
            row.regretLo = Math.max(0, d[0] - z * d[1]);
            row.regretHi = Math.min(1, Math.max(0, d[0] + z * d[1]));
            // How much this option might still beat the best by: the best's own regret bound.
            bestHi = Math.max(bestHi, z * d[1] - d[0]);
        }
        if (best >= 0) {
            final Row b = rows[best];
            b.regret = 0;
            b.regretLo = 0;
            b.regretHi = Math.min(1, Math.max(0, bestHi));
        }
        return rows;
    }

    /**
     * Racing: which active options are now clearly worse than the best (their
     * paired difference's lower bound at {@code zElim} above 0, over at least
     * {@code minRounds} shared rounds).  Returns the new active set.
     */
    public static boolean[] race(final double[][] x, final boolean[] active, final double zElim, final int minRounds) {
        final boolean[] out = active.clone();
        final int best = bestOf(x, active);
        if (best < 0) {
            return out;
        }
        for (int i = 0; i < x.length; i++) {
            if (i == best || !active[i]) {
                continue;
            }
            final double[] d = pairedDiff(x[best], x[i]);
            if (d[2] >= minRounds && d[0] - zElim * d[1] > 0) {
                out[i] = false;
            }
        }
        return out;
    }

    /** The median of the non-best options' regret half-widths (the table's noise), NaN when none. */
    public static double noise(final Row[] rows) {
        final List<Double> hw = new ArrayList<>();
        for (final Row r : rows) {
            if (!Double.isNaN(r.regretHi) && !Double.isNaN(r.regretLo)) {
                hw.add((r.regretHi - r.regretLo) / 2);
            }
        }
        if (hw.isEmpty()) {
            return Double.NaN;
        }
        final double[] a = hw.stream().mapToDouble(Double::doubleValue).sorted().toArray();
        return a.length % 2 == 1 ? a[a.length / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
    }

    static int count(final double[] xs) {
        int n = 0;
        for (final double v : xs) {
            n += Double.isNaN(v) ? 0 : 1;
        }
        return n;
    }

    static double sum(final double[] xs) {
        double s = 0;
        for (final double v : xs) {
            s += Double.isNaN(v) ? 0 : v;
        }
        return s;
    }

    static double mean(final double[] xs) {
        final int n = count(xs);
        return n == 0 ? Double.NaN : sum(xs) / n;
    }

    // ------------------------------------------------------------------
    // Enumeration by class (identical creatures are interchangeable)
    // ------------------------------------------------------------------

    /**
     * Every attack as a count per creature class: class c contributes 0..sizes[c]
     * attackers.  Null when there are more than {@code cap} (the caller then
     * falls back to a shortlist).  Order: fewest attackers first, then by class.
     */
    public static List<int[]> attackCounts(final int[] sizes, final int cap) {
        long total = 1;
        for (final int s : sizes) {
            total *= s + 1;
            if (total > cap) {
                return null;
            }
        }
        final List<int[]> out = new ArrayList<>();
        final int[] cur = new int[sizes.length];
        while (true) {
            out.add(cur.clone());
            int i = 0;
            while (i < sizes.length && cur[i] == sizes[i]) {
                cur[i] = 0;
                i++;
            }
            if (i == sizes.length) {
                break;
            }
            cur[i]++;
        }
        out.sort((a, b) -> {
            final int sa = Arrays.stream(a).sum();
            final int sb = Arrays.stream(b).sum();
            if (sa != sb) {
                return Integer.compare(sa, sb);
            }
            for (int i = a.length - 1; i >= 0; i--) {
                if (a[i] != b[i]) {
                    return Integer.compare(a[i], b[i]);
                }
            }
            return 0;
        });
        return out;
    }

    /**
     * Every block as a count matrix {@code m[class][attacker]}: how many blockers
     * of each class block each attacker (the rest of the class does not block).
     * {@code can[class][attacker]} says whether that class may block that
     * attacker at all.  Null when there are more than {@code cap}.  The empty
     * block comes first.
     */
    public static List<int[][]> blockCounts(final int[] sizes, final boolean[][] can, final int cap) {
        final int k = sizes.length;
        final List<List<int[]>> perClass = new ArrayList<>();
        long total = 1;
        for (int c = 0; c < k; c++) {
            final List<int[]> ds = distributions(sizes[c], can[c]);
            perClass.add(ds);
            total *= ds.size();
            if (total > cap) {
                return null;
            }
        }
        final List<int[][]> out = new ArrayList<>();
        final int[] idx = new int[k];
        while (true) {
            final int[][] m = new int[k][];
            for (int c = 0; c < k; c++) {
                m[c] = perClass.get(c).get(idx[c]);
            }
            out.add(m);
            int c = 0;
            while (c < k && idx[c] == perClass.get(c).size() - 1) {
                idx[c] = 0;
                c++;
            }
            if (c == k) {
                break;
            }
            idx[c]++;
        }
        return out;
    }

    /** Ways to put at most {@code n} identical blockers on attackers they may block (counts per attacker). */
    static List<int[]> distributions(final int n, final boolean[] can) {
        final List<int[]> out = new ArrayList<>();
        distribute(n, can, 0, new int[can.length], out);
        out.sort((a, b) -> Integer.compare(Arrays.stream(a).sum(), Arrays.stream(b).sum()));
        return out;
    }

    private static void distribute(final int left, final boolean[] can, final int a, final int[] cur, final List<int[]> out) {
        if (a == can.length) {
            out.add(cur.clone());
            return;
        }
        final int max = can[a] ? left : 0;
        for (int v = 0; v <= max; v++) {
            cur[a] = v;
            distribute(left - v, can, a + 1, cur, out);
        }
        cur[a] = 0;
    }

    // ------------------------------------------------------------------
    // Tokens: the coach bench's spelling (ForgeCoach src/bench/coachBench.ts formatAnswer)
    // ------------------------------------------------------------------

    /** {@code attack:none} or {@code attack:<ids ascending>}. */
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

    /** {@code block:none} or {@code block:<b>><a>,...} sorted by attacker, then blocker. */
    public static String blockToken(final List<int[]> blockerAttacker) {
        if (blockerAttacker.isEmpty()) {
            return "block:none";
        }
        final List<int[]> s = new ArrayList<>(blockerAttacker);
        s.sort((p, q) -> p[1] != q[1] ? Integer.compare(p[1], q[1]) : Integer.compare(p[0], q[0]));
        final StringBuilder sb = new StringBuilder("block:");
        for (int i = 0; i < s.size(); i++) {
            sb.append(i == 0 ? "" : ",").append(s.get(i)[0]).append('>').append(s.get(i)[1]);
        }
        return sb.toString();
    }
}
