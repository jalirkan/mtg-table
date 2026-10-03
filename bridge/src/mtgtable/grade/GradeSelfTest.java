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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

/**
 * The coach grader's engine-free self-test (D332), run by
 * {@code bridge/build.sh}: CRN seeds, the intervals, the regret table, racing,
 * the enumeration by class, the bench's token spelling, and the log reader's
 * moments.  No Forge class is loaded (Jetty's JSON parser aside, through
 * {@link WireLog}).
 */
public final class GradeSelfTest {

    private GradeSelfTest() { }

    private static int checks;
    private static int failures;

    static void check(final boolean ok, final String what) {
        checks++;
        if (!ok) {
            failures++;
            System.out.println("FAIL: " + what);
        }
    }

    static boolean near(final double a, final double b, final double tol) {
        return Math.abs(a - b) <= tol;
    }

    public static void main(final String[] args) {
        seeds();
        intervals();
        regretTable();
        racing();
        enumeration();
        tokens();
        wireLog();
        System.out.println("grade selftest: " + checks + " check(s), " + failures + " failure(s)");
        System.exit(failures == 0 ? 0 : 1);
    }

    static void seeds() {
        final long a = GradeMath.roundSeed(7, "log.jsonl#941", 0);
        check(a == GradeMath.roundSeed(7, "log.jsonl#941", 0), "a round's seed is a pure function of (run seed, key, round)");
        final Set<Long> s = new HashSet<>();
        for (int r = 0; r < 1000; r++) {
            s.add(GradeMath.roundSeed(7, "log.jsonl#941", r));
        }
        check(s.size() == 1000, "1000 rounds, 1000 distinct seeds");
        check(GradeMath.roundSeed(7, "log.jsonl#942", 0) != a && GradeMath.roundSeed(8, "log.jsonl#941", 0) != a,
                "another position or run seed gives another stream");
        // CRN: the racer hands every option of a round the same seed.
        final long[][] seen = new long[3][5];
        final Racer.Config c = new Racer.Config();
        c.target = 5;
        c.initial = 5;
        c.race = false;
        Racer.run(3, "k", 1, c, (i, r, seed) -> {
            seen[i][r] = seed;
            return 1;
        });
        boolean same = true;
        for (int r = 0; r < 5; r++) {
            same &= seen[0][r] == seen[1][r] && seen[1][r] == seen[2][r];
        }
        check(same && seen[0][0] != seen[0][1], "every option of a round gets that round's seed, and rounds differ");
    }

    static void intervals() {
        final double[] w = GradeMath.wilson(5, 10, GradeMath.Z95);
        check(near(w[0], 0.5, 1e-12) && near(w[1], 0.2366, 1e-3) && near(w[2], 0.7634, 1e-3), "Wilson 5/10 = [0.237, 0.763]");
        final double[] w2 = GradeMath.wilson(100, 200, GradeMath.Z95);
        check(near(w2[2] - w2[0], 0.069, 0.002), "Wilson half-width at 200 playouts, p = 0.5, is about 7 points");
        final double[] d = GradeMath.pairedDiff(new double[] {1, 1, 0, 1, Double.NaN}, new double[] {0, 1, 0, 0, 1});
        check(near(d[0], 0.5, 1e-12) && d[2] == 4, "paired difference over the shared rounds only (mean 0.5, n 4)");
        final double[] same = new double[100];
        Arrays.fill(same, 1);
        final double[] z = GradeMath.pairedDiff(same, same);
        check(near(z[0], 0, 1e-12) && near(z[1], 0.01, 1e-9), "identical outcomes: difference 0, standard error floored at 1/n");
    }

    /** Synthetic options with known win rates, played on shared uniforms (CRN) or independent ones. */
    static double[][] synthetic(final double[] p, final int n, final boolean paired, final long seed) {
        final Random rnd = new Random(seed);
        final double[][] x = new double[p.length][n];
        for (int r = 0; r < n; r++) {
            final double u = rnd.nextDouble();
            for (int i = 0; i < p.length; i++) {
                final double v = paired ? u : rnd.nextDouble();
                x[i][r] = v < p[i] ? 1 : 0;
            }
        }
        return x;
    }

    static void regretTable() {
        final double[] p = {0.70, 0.50, 0.69};
        final boolean[] all = {true, true, true};
        final double[][] x = synthetic(p, 400, true, 11);
        final GradeMath.Row[] t = GradeMath.table(x, all, GradeMath.Z95);
        check(t[0].best && !t[1].best && !t[2].best, "the 70% option is the best");
        check(t[0].regret == 0 && t[0].regretLo == 0, "the best's regret is 0");
        check(near(t[1].regret, 0.20, 0.06) && t[1].regretLo > 0.1, "the 50% option's regret is about 0.20 and excludes 0 ("
                + t[1].regret + " [" + t[1].regretLo + ", " + t[1].regretHi + "])");
        check(t[2].regret < 0.03 && t[2].regretHi < 0.05, "the 69% option's regret is about 0.01, tightly (paired) ("
                + t[2].regret + " [" + t[2].regretLo + ", " + t[2].regretHi + "])");
        final GradeMath.Row[] tie = GradeMath.table(synthetic(new double[] {0.6, 0.6}, 100, false, 4), new boolean[] {true, true},
                GradeMath.Z95);
        final int tb = tie[0].best ? 0 : 1;
        check(tie[tb].regretHi > 0.05 && tie[1 - tb].regretLo == 0,
                "two equal options: the best's interval admits the other may be better, the other's includes 0");
        final GradeMath.Row[] u = GradeMath.table(synthetic(p, 400, false, 11), all, GradeMath.Z95);
        final int bu = u[0].best ? 2 : 0;
        final double pairedW = t[2].regretHi - t[2].regretLo;
        final double unpairedW = u[1].regretHi + u[bu].regretHi;   // crude: unpaired half-widths are much wider
        check(pairedW < (u[1].regretHi - u[1].regretLo) / 2, "pairing (CRN) narrows a close difference's interval: "
                + pairedW + " vs an unpaired half-width " + (u[1].regretHi - u[1].regretLo) / 2 + " (" + unpairedW + ")");
        check(t[0].winHi - t[0].winLo < 0.10, "400 playouts: a win-rate interval under ±5 points");
        final double nz = GradeMath.noise(t);
        check(nz > 0 && nz < 0.06, "the table's noise (median regret half-width) is reported: " + nz);
    }

    static void racing() {
        final double[] p = {0.55, 0.25, 0.53, 0.30};
        final Random rnd = new Random(5);
        final Map<Long, Double> u = new java.util.HashMap<>();
        final Racer.Config c = new Racer.Config();
        c.target = 200;
        c.initial = 40;
        c.batch = 20;
        final Racer.Result res = Racer.run(p.length, "race", 3, c, (i, r, seed) -> {
            final double v = u.computeIfAbsent(seed, s -> rnd.nextDouble());
            return v < p[i] ? 1 : 0;
        });
        final int[] n = new int[p.length];
        for (int i = 0; i < p.length; i++) {
            n[i] = GradeMath.count(res.x[i]);
        }
        check(n[1] < 200 && n[3] < 200, "racing retires the clearly worse options early (rounds " + Arrays.toString(n) + ")");
        check(n[0] == 200 && n[2] == 200, "and spends the full budget on the two close ones");
        check(res.playouts < 4 * 200, "fewer playouts than every option to the target: " + res.playouts);
        final GradeMath.Row[] t = GradeMath.table(res.x, res.active, GradeMath.Z95);
        check(t[1].regretLo > 0.1 && t[3].regretLo > 0.05, "a retired option still has a regret interval, excluding 0");
        // Budgets.
        final Racer.Config b = new Racer.Config();
        b.maxPlayouts = 30;
        final Racer.Result rb = Racer.run(3, "b", 1, b, (i, r, seed) -> 0.5);
        check("playouts".equals(rb.stop) && rb.playouts == 30, "the playout budget stops it (" + rb.stop + ", " + rb.playouts + ")");
        // An option that keeps failing is retired and flagged.
        final Racer.Config f = new Racer.Config();
        f.target = 20;
        f.race = false;
        final Racer.Result rf = Racer.run(2, "f", 1, f, (i, r, seed) -> i == 1 ? Double.NaN : 1);
        check(rf.failed[1] && !rf.failed[0] && rf.errors[1] == 3, "an option failing 3 of its first rounds is retired and flagged");
    }

    static void enumeration() {
        check(GradeMath.attackCounts(new int[] {5}, 64).size() == 6, "five identical attackers: 6 attacks (0..5), not 32");
        check(GradeMath.attackCounts(new int[] {2, 1}, 64).size() == 6, "classes of 2 and 1: 3 x 2 = 6 attacks");
        check(GradeMath.attackCounts(new int[] {1, 1, 1, 1, 1, 1, 1}, 64) == null, "seven distinct attackers (128) exceed a cap of 64");
        final List<int[]> a = GradeMath.attackCounts(new int[] {2, 1}, 64);
        check(Arrays.stream(a.get(0)).sum() == 0 && Arrays.stream(a.get(a.size() - 1)).sum() == 3, "no attack first, all-in last");
        final boolean[][] both = {{true, true}};
        check(GradeMath.blockCounts(new int[] {2}, both, 64).size() == 6, "two identical blockers, two attackers: 6 blocks");
        check(GradeMath.blockCounts(new int[] {2}, new boolean[][] {{true, false}}, 64).size() == 3,
                "a blocker class that cannot block the second attacker (flying): 3 blocks");
        final List<int[][]> bc = GradeMath.blockCounts(new int[] {1, 1}, new boolean[][] {{true, true}, {true, true}}, 64);
        check(bc.size() == 9 && Arrays.stream(bc.get(0)[0]).sum() == 0 && Arrays.stream(bc.get(0)[1]).sum() == 0,
                "two distinct blockers, two attackers: 9 blocks, the empty one first");
        check(GradeMath.blockCounts(new int[] {1, 1, 1, 1}, new boolean[][] {{true, true, true}, {true, true, true},
            {true, true, true}, {true, true, true}}, 100) == null, "4 blockers x 4 choices = 256 exceed a cap of 100");
    }

    static void tokens() {
        check("attack:21,26".equals(GradeMath.attackToken(List.of(26, 21))), "attack ids ascending");
        check("attack:none".equals(GradeMath.attackToken(new ArrayList<>())), "attack:none");
        final List<int[]> b = new ArrayList<>();
        b.add(new int[] {33, 55});
        b.add(new int[] {12, 40});
        b.add(new int[] {11, 40});
        check("block:11>40,12>40,33>55".equals(GradeMath.blockToken(b)), "blocks sorted by attacker, then blocker");
        check("block:none".equals(GradeMath.blockToken(new ArrayList<>())), "block:none");
    }

    static void wireLog() {
        final List<String> lines = List.of(
                "{\"v\":1,\"kind\":\"session\",\"gameId\":\"t\",\"seat\":0,\"decks\":[]}",
                "{\"v\":1,\"seq\":1,\"dir\":\"s2c\",\"type\":\"state\",\"body\":{\"turn\":1,\"phase\":\"MAIN1\"}}",
                "{\"v\":1,\"seq\":2,\"dir\":\"s2c\",\"type\":\"input\",\"body\":{\"prompt\":\"Priority\"}}",
                "{\"v\":1,\"seq\":3,\"dir\":\"s2c\",\"type\":\"state\",\"body\":{\"turn\":1,\"phase\":\"MAIN2\"}}",
                "{\"v\":1,\"seq\":1,\"dir\":\"c2s\",\"type\":\"act\",\"body\":{\"action\":\"buttonOk\"}}");
        final WireLog log = WireLog.parse(lines);
        check(log.frames.size() == 4 && log.seat == 0, "frames exclude the header line; the seat is the header's");
        final WireLog.Moment live = log.live(2);
        check(live != null && "MAIN1".equals(WireLog.str(live.state, "phase")) && live.input != null && live.stateFrame == 0,
                "a live moment at frame 2 is the state and input before it (frames 0-1)");
        final WireLog.Moment live4 = log.live(4);
        check(live4 != null && "MAIN2".equals(WireLog.str(live4.state, "phase")), "live 4 sees the later state");
        final WireLog.Moment rev = log.review(2);
        check(rev != null && "MAIN2".equals(WireLog.str(rev.state, "phase")), "a review moment is the state frame itself");
        boolean threw = false;
        try {
            log.review(1);
        } catch (final IllegalArgumentException e) {
            threw = true;
        }
        check(threw, "a review moment on a non-state frame is refused");
    }
}
