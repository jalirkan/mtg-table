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
 * The coach grader's engine-free self-test (D334), run by
 * {@code bridge/build.sh}: CRN seeds, the intervals, the regret table, racing,
 * the enumeration by class, the bench's token spelling, and the log reader's
 * moments; and D348–D351's: the leaf measure's intervals and their coverage in a
 * small simulation, racing at live round counts, the leaf-scale fit, the
 * search's override rules, the pool-mode arithmetic and the planted-leak test
 * of the live knowledge guard.  No Forge class is initialised (Jetty's JSON
 * parser aside, through {@link WireLog}).
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
        } else if (Boolean.getBoolean("grade.verbose")) {
            System.out.println("ok   " + what);
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
        leafMeasure();
        coverage();
        liveRacing();
        fitScale();
        overrideRule();
        hiddenPool();
        try {
            plantedLeak();
        } catch (final java.io.IOException e) {
            check(false, "the planted-leak test could not write its files: " + e);
        }
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

    // ------------------------------------------------------------------
    // D349: the leaf measure, coverage, live racing, the scale fit
    // ------------------------------------------------------------------

    static void leafMeasure() {
        check(near(GradeMath.tQuantile(0.975, 5), 2.5706, 1e-3) && near(GradeMath.tQuantile(0.975, 1), 12.706, 1e-2)
                && near(GradeMath.tQuantile(0.995, 3), 5.8409, 1e-3) && near(GradeMath.tQuantile(0.975, 1000), 1.9623, 1e-3),
                "Student's t quantiles (2.571 at 5 df, 12.71 at 1, 5.841 at 99%/3, 1.962 at 1000)");
        check(near(GradeMath.normalCdf(GradeMath.Z95), 0.975, 1e-6), "the normal CDF at 1.96 is 0.975");
        // The review's acceptance case: a leaf-mode table at n = 6 with paired sd 0.03 is under +-0.05.
        final Random rnd = new Random(31);
        final double[][] x = new double[2][6];
        for (int r = 0; r < 6; r++) {
            final double common = 0.5 + 0.1 * rnd.nextGaussian();
            x[0][r] = common + 0.05 + 0.03 / Math.sqrt(2) * rnd.nextGaussian();
            x[1][r] = common + 0.03 / Math.sqrt(2) * rnd.nextGaussian();
        }
        final GradeMath.Row[] leaf = GradeMath.table(x, new boolean[] {true, true}, GradeMath.Z95, GradeMath.Measure.LEAF);
        final GradeMath.Row[] wins = GradeMath.table(x, new boolean[] {true, true}, GradeMath.Z95, GradeMath.Measure.WINS);
        final double hw = (leaf[1].regretHi - leaf[1].regretLo) / 2;
        check(hw < 0.05, "leaf measure, n = 6, paired sd 0.03: regret half-width " + hw + " < 0.05");
        final double floorHw = GradeMath.Z95 * GradeMath.pairedDiff(x[0], x[1], GradeMath.Measure.WINS)[1];
        check(floorHw > 0.3 && wins[1].regretHi > leaf[1].regretHi, "the 1/n floor (WINS) at n = 6 was > +-0.3: " + floorHw);
        final double[] flat = {0.5, 0.5, 0.5, 0.5};
        check(near(GradeMath.pairedDiff(flat, flat, GradeMath.Measure.LEAF)[1], GradeMath.LEAF_SD_FLOOR / 2, 1e-12),
                "identical leaf values: the standard error is the floor's (sd 0.02), not 1/n");
        check(near(GradeMath.pairedDiff(new double[] {0.6}, new double[] {0.5}, GradeMath.Measure.LEAF)[1], 0.5, 1e-12),
                "one round: the sd is assumed at its largest (0.5), not estimated");
        check(leaf[0].winHi - leaf[0].winLo < 0.3 && leaf[0].winLo >= 0 && leaf[0].winHi <= 1,
                "a leaf-mode win interval is a t interval on the mean, inside [0,1]");
    }

    /** Coverage of the 95% paired interval, leaf measure, on normal data with a known difference. */
    static double[] coverageOf(final int n, final double sd, final GradeMath.Measure m, final int reps, final long seed) {
        final Random rnd = new Random(seed);
        int cover = 0;
        double width = 0;
        final double truth = 0.04;
        for (int t = 0; t < reps; t++) {
            final double[] a = new double[n];
            final double[] b = new double[n];
            for (int r = 0; r < n; r++) {
                b[r] = 0.5 + 0.1 * rnd.nextGaussian();
                a[r] = b[r] + truth + sd * rnd.nextGaussian();
            }
            final double[] d = GradeMath.pairedDiff(a, b, m);
            final double h = GradeMath.crit(GradeMath.Z95, n, m) * d[1];
            cover += Math.abs(d[0] - truth) <= h ? 1 : 0;
            width += h;
        }
        return new double[] {(double) cover / reps, width / reps};
    }

    static void coverage() {
        final StringBuilder sb = new StringBuilder();
        boolean ok = true;
        for (final int n : new int[] {4, 6, 12}) {
            for (final double sd : new double[] {0.06, 0.12}) {
                final double[] after = coverageOf(n, sd, GradeMath.Measure.LEAF, 4000, 7 * n + (long) (sd * 1000));
                final double[] before = coverageOf(n, sd, GradeMath.Measure.WINS, 4000, 7 * n + (long) (sd * 1000));
                ok &= after[0] >= 0.93 && after[0] <= 0.975 && after[1] < before[1] / 2;
                sb.append(String.format(java.util.Locale.ROOT, " n=%d sd=%.2f: %.3f +-%.3f (1/n floor: %.3f +-%.3f);", n, sd,
                        after[0], after[1], before[0], before[1]));
            }
        }
        check(ok, "the leaf interval covers 93-97.5% at nominal 95% and is under half the floor's width:" + sb);
    }

    static void liveRacing() {
        final double[] p = {0.60, 0.50, 0.45, 0.40, 0.35};
        int retiredLeaf = 0;
        int retiredWins = 0;
        int bestLost = 0;
        for (int t = 0; t < 40; t++) {
            for (final GradeMath.Measure m : GradeMath.Measure.values()) {
                final Random rnd = new Random(100 + t);
                final Map<Long, Double> common = new java.util.HashMap<>();
                final Racer.Config c = new Racer.Config();   // the live analysis's racing (CoachGrade.liveSettings)
                c.target = 8;
                c.initial = 4;
                c.batch = 2;
                c.measure = m;
                final Racer.Result res = Racer.run(p.length, "live" + t, 9, c, (i, r, seed) ->
                        p[i] + common.computeIfAbsent(seed, s -> 0.05 * rnd.nextGaussian()) + 0.06 / Math.sqrt(2) * rnd.nextGaussian());
                int retired = 0;
                for (final boolean a : res.active) {
                    retired += a ? 0 : 1;
                }
                if (m == GradeMath.Measure.LEAF) {
                    retiredLeaf += retired;
                    bestLost += res.active[0] ? 0 : 1;
                } else {
                    retiredWins += retired;
                }
            }
        }
        check(retiredLeaf >= 40 * 3 && bestLost == 0, "live racing (8 rounds, from round 4) retires clearly worse options: "
                + retiredLeaf / 40.0 + " of 4 a decision, the best never (" + bestLost + " of 40)");
        check(retiredWins == 0, "under the 1/n floor the same racing retired nothing (" + retiredWins + ")");
    }

    static void fitScale() {
        final Random rnd = new Random(77);
        final int n = 20000;
        final double[] x = new double[n];
        final double[] y = new double[n];
        final List<double[]> rows = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            x[i] = (rnd.nextDouble() * 2 - 1) * 1500;
            y[i] = rnd.nextDouble() < GradeMath.sigmoid(x[i] / 300) ? 1 : 0;
            rows.add(new double[] {x[i], y[i], i % 200});
        }
        final double scale = 1 / GradeMath.fitSlope(x, y);
        check(near(scale, 300, 15), "the leaf-scale fit recovers a known scale of 300: " + scale);
        final double[] ab = GradeMath.fitLogistic(x, y);
        check(Math.abs(ab[0]) < 0.06 && near(1 / ab[1], 300, 15), "the two-parameter fit: intercept ~0, scale ~300 ("
                + ab[0] + ", " + 1 / ab[1] + ")");
        check(GradeMath.logLoss(x, y, 0, 1 / scale) < GradeMath.logLoss(x, y, 0, 1.0 / 400),
                "the fitted scale's log-loss beats 400's on its own data");
        final Map<?, ?> rep = (Map<?, ?>) mtgtable.Json.parse(CoachGrade.fitReport(rows, 200, 200, new int[3], 20, "synthetic"));
        final double rs = ((Number) rep.get("scale")).doubleValue();
        final double lo = ((Number) rep.get("scaleLo")).doubleValue();
        final double hi = ((Number) rep.get("scaleHi")).doubleValue();
        check(near(rs, 300, 15) && lo < rs && rs < hi && WireLog.arr(rep, "reliability").length >= 8,
                "fit-scale's report: scale " + rs + " [" + lo + ", " + hi + "] with a reliability table");
    }

    static void overrideRule() {
        final mtgtable.ai.SearchConfig margin = mtgtable.ai.SearchConfig.parse("");
        final mtgtable.ai.SearchConfig lcb = mtgtable.ai.SearchConfig.parse("override=lcb,z=1,margin=0");
        check("ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pab".equals(margin.toString()),
                "the default search config prints as before D350: " + margin);
        check(margin.horizonFor("a") == 0 && mtgtable.ai.SearchConfig.parse("aturns=1").horizonFor("a") == 1
                && mtgtable.ai.SearchConfig.parse("aturns=1").horizonFor("p") == 0, "aturns=1 lengthens attacks only");
        boolean refused = false;
        try {
            mtgtable.ai.SearchConfig.parseLive("oracle=1");
        } catch (final IllegalArgumentException e) {
            refused = true;
        }
        check(refused && mtgtable.ai.SearchConfig.parse("oracle=1").oracle, "oracle=1 parses for the bench and is refused live");
        // A noisy alternative: +30 on average, but one round of three carries it.
        final List<double[]> noisy = List.of(new double[] {100, 250}, new double[] {100, 130}, new double[] {100, 10});
        final List<double[]> steady = List.of(new double[] {100, 128}, new double[] {100, 131}, new double[] {100, 127});
        final mtgtable.ai.SearchPolicy.Report rn = new mtgtable.ai.SearchPolicy.Report();
        mtgtable.ai.SearchPolicy.Report.fillStats(rn, noisy, List.of(), 2);
        final mtgtable.ai.SearchPolicy.Report rs = new mtgtable.ai.SearchPolicy.Report();
        mtgtable.ai.SearchPolicy.Report.fillStats(rs, steady, List.of(), 2);
        check(near(rn.diffLeaf[1], 30, 1e-9) && rn.seDiff[1] > 50 && near(rs.diffLeaf[1], 28.67, 0.01) && rs.seDiff[1] < 2,
                "the report's paired difference and its standard error (noisy " + rn.diffLeaf[1] + "+-" + rn.seDiff[1]
                + ", steady " + rs.diffLeaf[1] + "+-" + rs.seDiff[1] + ")");
        check(mtgtable.ai.SearchPolicy.Report.verdict(margin, rn, 1, 3) == 1 && mtgtable.ai.SearchPolicy.Report.verdict(lcb, rn, 1, 3) == 0,
                "the margin rule takes the noisy +30, the lcb rule keeps Forge's");
        check(mtgtable.ai.SearchPolicy.Report.verdict(lcb, rs, 1, 3) == 1 && mtgtable.ai.SearchPolicy.Report.verdict(lcb, rs, 1, 2) == 0,
                "the lcb rule takes a steady +29 over 3 rounds, and never over fewer than 3");
    }

    // ------------------------------------------------------------------
    // D348: hidden information -- pool mode and the live guard
    // ------------------------------------------------------------------

    static void hiddenPool() {
        final Map<String, Integer> pool = HiddenPool.count(List.of("A", "B", "C", "D", "E", "F", "G", "Island"));
        final Map<String, Integer> ownDeck = HiddenPool.count(List.of("A", "Island", "Island"));
        final Map<String, Integer> ownPool = HiddenPool.count(List.of("A", "B", "Island", "Island"));
        final Map<String, Integer> rest = HiddenPool.remainder(pool, ownDeck, ownPool, List.of("C"), List.of("D"));
        check(rest.keySet().equals(new java.util.TreeSet<>(List.of("E", "F", "G"))),
                "pool mode: minus the viewer's deck (A), drafted pool (B), public cards of theirs (C) and the opponent's (D): " + rest);
        final Map<String, Integer> known = HiddenPool.knownHidden(HiddenPool.count(List.of("E", "D", "A")), rest, List.of("D"));
        check(known.keySet().equals(java.util.Set.of("E")), "known AI picks still hidden: E (D is public, A is the viewer's): " + known);
        check(HiddenPool.parseNames("2 Lightning Bolt; Kongming, \"Sleeping Dragon\"").equals(
                HiddenPool.count(List.of("Lightning Bolt", "Lightning Bolt", "Kongming, \"Sleeping Dragon\""))),
                "known picks parse as \"N Name\" entries split on ';' (names keep their commas)");
    }

    /**
     * The planted-leak test (D348, the review's H3): the AI's real list sits
     * where the match launcher writes it, and the log header names it; a live
     * analysis's knowledge must be byte-identical with the file present and
     * deleted, and every way of handing it in without the public flag must be
     * refused.  The negative control -- the same list marked public -- must
     * change the knowledge, or the test proves nothing.
     */
    static void plantedLeak() throws java.io.IOException {
        final java.nio.file.Path root = java.nio.file.Files.createTempDirectory("grade-leak");
        final java.io.File dir = root.resolve("var/match/m1").toFile();
        dir.mkdirs();
        final StringBuilder ai = new StringBuilder("[metadata]\nName=AI Drafter\n[Main]\n17 Swamp\n");
        final StringBuilder you = new StringBuilder("[Main]\n17 Island\n");
        final StringBuilder cube = new StringBuilder();
        for (int i = 0; i < 23; i++) {
            ai.append("1 Secret AI Card ").append(i).append('\n');
            you.append("1 Player Card ").append(i).append('\n');
            cube.append("1 Secret AI Card ").append(i).append('\n').append("1 Player Card ").append(i).append('\n');
        }
        you.append("[Sideboard]\n1 Player Sideboard Card\n");
        cube.append("1 Player Sideboard Card\n");
        for (int i = 0; i < 80; i++) {
            cube.append("1 Other Cube Card ").append(i).append('\n');
        }
        final java.io.File aiFile = new java.io.File(dir, "ai.dck");
        java.nio.file.Files.writeString(aiFile.toPath(), ai);
        java.nio.file.Files.writeString(new java.io.File(dir, "you.dck").toPath(), you);
        java.nio.file.Files.writeString(root.resolve("cube.txt"), cube);
        java.nio.file.Files.writeString(root.resolve("ai-copy.txt"), ai);
        final WireLog log = WireLog.parse(List.of("{\"v\":1,\"kind\":\"session\",\"gameId\":\"leak\",\"seat\":0,\"decks\":["
                + "{\"player\":0,\"path\":\"var/match/m1/you.dck\"},{\"player\":1,\"path\":\"var/match/m1/ai.dck\"}]}"));
        final java.io.File r = root.toFile();
        final CoachGrade.Flags live = new CoachGrade.Flags(new String[] {"--opp-pool", "cube.txt", "--opp-known",
            "Secret AI Card 3; Secret AI Card 7"});
        final String present = HiddenPool.describe(CoachGrade.liveKnowledge(r, log, live));
        check(present.contains("Player Sideboard Card") && present.contains("oppPool={") && present.contains("oppDeck=null"),
                "live knowledge is pool mode, with the viewer's whole drafted pool (sideboard included) to subtract");
        check(present.contains("oppKnown={Secret AI Card 3=1, Secret AI Card 7=1}"), "the AI picks the player saw are carried");
        java.nio.file.Files.delete(aiFile.toPath());
        final String absent = HiddenPool.describe(CoachGrade.liveKnowledge(r, log, live));
        check(present.equals(absent), "PLANTED LEAK: the live knowledge is byte-identical with the AI's real list present and deleted");
        java.nio.file.Files.writeString(aiFile.toPath(), ai);
        // Every way of handing the real list in without the public flag is refused.
        final String[][] attempts = {
            {"--opp-deck", "var/match/m1/ai.dck"},
            {"--opp-deck", "ai-copy.txt"},
            {"--opp-pool", "var/match/m1/ai.dck"},
            {"--opp-pool", "ai-copy.txt"},
            {"--opp-deck", "var/match/m1/ai.dck", "--opp-deck-public", "true"},
            {"--opp-deck", "var/match/m1/ai.dck", "--opp-deck-public", ""},
        };
        int refused = 0;
        for (final String[] a : attempts) {
            try {
                CoachGrade.liveKnowledge(r, log, new CoachGrade.Flags(a));
            } catch (final HiddenPool.Refused e) {
                refused++;
            }
        }
        check(refused == attempts.length, "every live attempt to pass the AI's list (deck, pool, copy, public without a reason) is"
                + " refused: " + refused + " of " + attempts.length);
        // serve: a request's own fields decide; a server default cannot lend the public flag.
        final CoachGrade.Flags req = new CoachGrade.Flags(new String[] {"--opp-deck", "var/match/m1/ai.dck",
            "--opp-deck-public", "set by the server's defaults"});
        CoachGrade.serveKnowledge(new java.util.HashMap<String, Object>(), req);
        boolean serveRefused = false;
        try {
            CoachGrade.liveKnowledge(r, log, req);
        } catch (final HiddenPool.Refused e) {
            serveRefused = true;
        }
        check(serveRefused, "serve: a request that does not mark the list public is refused, whatever the server's defaults");
        // The negative control: marked public with a reason, the list IS used -- so the guard is what kept it out.
        final String pub = HiddenPool.describe(CoachGrade.liveKnowledge(r, log, new CoachGrade.Flags(new String[] {
            "--opp-deck", "var/match/m1/ai.dck", "--opp-deck-public", "constructed: both lists shared"})));
        check(!pub.equals(present) && pub.contains("Secret AI Card 0=1") && pub.contains("oppDeck={"),
                "negative control: the same list marked public changes the knowledge (it carries the AI's cards)");
        // Review grading keeps D334's rule: a named list is read.
        final String review = HiddenPool.describe(CoachGrade.knowledge(r, log, new CoachGrade.Flags(new String[] {
            "--opp-deck", "var/match/m1/ai.dck"})));
        check(review.contains("oppDeck={"), "review grading (grade, batch) still reads a named opponent list");
        // The pool-mode subtraction on the planted pool: none of the viewer's cards remain.
        final Rebuild.Knowledge k = CoachGrade.liveKnowledge(r, log, live);
        final Map<String, Integer> rest = HiddenPool.remainder(k.oppPool, k.ownDeck, k.ownPool, List.of(), List.of());
        boolean clean = true;
        for (final String n : rest.keySet()) {
            clean &= !n.startsWith("Player");
        }
        check(clean && rest.size() == 23 + 80, "pool mode leaves the cube minus every card of the viewer's pool: " + rest.size());
        try (java.util.stream.Stream<java.nio.file.Path> w = java.nio.file.Files.walk(root)) {
            w.sorted(java.util.Comparator.reverseOrder()).forEach(q -> q.toFile().delete());
        }
    }
}
