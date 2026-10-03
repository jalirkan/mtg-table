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

/**
 * The anytime search's scheduling (D352), pure -- numbers in, numbers out, no
 * Forge class -- so {@code DecisionSelfTest} checks it on synthetic rounds.
 * {@code leaves.get(round)[candidate]} is a leaf, NaN for a rollout not played;
 * candidate 0 is always Forge's own answer, which is never pruned or retired.
 */
public final class Anytime {

    private Anytime() { }

    /** Racing (D352): from this many paired rounds, a candidate clearly worse than the leader is retired. */
    static final int RACE_FROM = 3;
    /** The racing bound's multiplier: retire when mean + Z·se of the paired difference to the leader is below 0. */
    static final double RACE_Z = 2.0;

    static boolean allNaN(final double[] row) {
        for (final double x : row) {
            if (!Double.isNaN(x)) {
                return false;
            }
        }
        return true;
    }

    static int count(final boolean[] a) {
        int n = 0;
        for (final boolean b : a) {
            n += b ? 1 : 0;
        }
        return n;
    }

    /** Mean paired difference of {@code i} to {@code j} over the rounds both were scored in, and its se; null below 1. */
    static double[] pairedDiff(final List<double[]> leaves, final int i, final int j) {
        int n = 0;
        double s = 0;
        for (final double[] row : leaves) {
            if (!Double.isNaN(row[i]) && !Double.isNaN(row[j])) {
                n++;
                s += row[i] - row[j];
            }
        }
        if (n == 0) {
            return null;
        }
        final double m = s / n;
        double v = 0;
        for (final double[] row : leaves) {
            if (!Double.isNaN(row[i]) && !Double.isNaN(row[j])) {
                v += Math.pow(row[i] - row[j] - m, 2);
            }
        }
        return new double[] {m, n > 1 ? Math.sqrt(v / (n - 1) / n) : Double.NaN, n};
    }

    /** A candidate's standing for ordering and pruning: its paired difference to Forge's answer (Forge's own is 0). */
    static double standing(final List<double[]> leaves, final int i) {
        if (i == 0) {
            return 0;
        }
        final double[] d = pairedDiff(leaves, i, 0);
        return d == null ? Double.NEGATIVE_INFINITY : d[0];
    }

    /** This round's play order: Forge's answer first, then the active rest -- as generated in round 0, best-first after. */
    static List<Integer> order(final boolean[] active, final List<double[]> leaves, final int r) {
        final List<Integer> rest = new ArrayList<>();
        for (int i = 1; i < active.length; i++) {
            if (active[i]) {
                rest.add(i);
            }
        }
        if (r > 0) {
            final List<double[]> done = leaves.subList(0, r);
            rest.sort((a, b) -> Double.compare(standing(done, b), standing(done, a)));
        }
        final List<Integer> out = new ArrayList<>(rest.size() + 1);
        out.add(0);
        out.addAll(rest);
        return out;
    }

    /**
     * Prune the active set to what the time left can carry: with {@code est}
     * ns per rollout, each remaining round up to {@code rounds} costs one
     * rollout per active candidate.  Returns how many were pruned.
     */
    static int pruneToBudget(final boolean[] active, final List<double[]> leaves, final long est, final long deadline,
                             final int r, final int rounds) {
        final int need = Math.max(1, rounds - r);
        final long left = deadline - System.nanoTime();
        return pruneTo(active, leaves, (int) Math.max(2, left / Math.max(1L, est * need)));
    }

    /** Deactivate the worst active candidates (never Forge's answer) until at most {@code fit} are active. */
    static int pruneTo(final boolean[] active, final List<double[]> leaves, final int fit) {
        int n = count(active);
        int cut = 0;
        while (n > Math.max(2, fit)) {
            int worst = -1;
            for (int i = 1; i < active.length; i++) {
                if (active[i] && (worst < 0 || standing(leaves, i) <= standing(leaves, worst))) {   // ties: the later (lower-ranked) goes first
                    worst = i;
                }
            }
            if (worst < 0) {
                break;
            }
            active[worst] = false;
            n--;
            cut++;
        }
        return cut;
    }

    /**
     * Racing: retire every active candidate (never Forge's answer, never the
     * leader) whose paired difference to the leader, over at least
     * {@link #RACE_FROM} shared rounds, is below zero by {@link #RACE_Z}
     * standard errors.  The leader is the active candidate with the best
     * paired difference to Forge's answer (Forge's own when none beats it).
     */
    static int race(final boolean[] active, final List<double[]> leaves) {
        int leader = 0;
        for (int i = 1; i < active.length; i++) {
            if (active[i] && standing(leaves, i) > standing(leaves, leader)) {
                leader = i;
            }
        }
        int out = 0;
        for (int i = 1; i < active.length; i++) {
            if (!active[i] || i == leader) {
                continue;
            }
            final double[] d = pairedDiff(leaves, i, leader);
            if (d != null && d[2] >= RACE_FROM && !Double.isNaN(d[1]) && d[0] + RACE_Z * d[1] < 0) {
                active[i] = false;
                out++;
            }
        }
        return out;
    }

    /** Rounds in which both {@code i} and Forge's answer (0) were scored. */
    public static int paired(final List<double[]> leaves, final int i) {
        int n = 0;
        for (final double[] row : leaves) {
            if (!Double.isNaN(row[i]) && !Double.isNaN(row[0])) {
                n++;
            }
        }
        return n;
    }

    /** The most paired rounds any active alternative has with Forge's answer (0: no evidence at all). */
    public static int most(final boolean[] active, final List<double[]> leaves) {
        int most = 0;
        for (int i = 1; i < active.length; i++) {
            if (active[i]) {
                most = Math.max(most, paired(leaves, i));
            }
        }
        return most;
    }

    /**
     * The verdict's candidate: among the active alternatives with at least
     * {@code min(rounds, most)} paired rounds, the highest paired difference
     * {@code diff[i]} to Forge's answer if it is above 0; else 0 (Forge's).
     */
    public static int best(final boolean[] active, final List<double[]> leaves, final double[] diff, final int rounds) {
        final int need = Math.min(most(active, leaves), rounds);
        int best = 0;
        for (int i = 1; i < active.length; i++) {
            if (active[i] && need > 0 && paired(leaves, i) >= need && diff[i] > (best == 0 ? 0 : diff[best])) {
                best = i;
            }
        }
        return best;
    }
}
