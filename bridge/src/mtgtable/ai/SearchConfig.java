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

/**
 * The knobs of the determinized rollout search (D312).  Immutable; parsed from
 * a short text so the bench's seat configs and {@code MtgTable --ai-search-ms}
 * name the same thing.
 *
 * <p>Text form: comma-separated {@code key=value} pairs, every key optional:
 * {@code ms} (wall-clock budget per searched decision, default 1500),
 * {@code cands} (the most candidates searched, Forge's own answer and "pass"
 * included, default 6), {@code turns} (rollout horizon: 0 = to the end of THIS
 * turn, the default -- a rollout of our own main phase or attack stops before
 * the opponent untaps; 1 = to the end of the next turn), {@code rounds}
 * (determinizations every candidate must finish before the search may overrule
 * Forge, default 2), {@code margin} (how much better, in leaf points, an
 * alternative must be than Forge's own, default 20), {@code maxrounds} (stop
 * early after this many complete rounds, default 12), and {@code what} (which
 * decisions: any of {@code p} priority in our main phase, {@code a} attacks,
 * {@code b} blocks; default {@code pab}).
 *
 * <p>D350–D351's switches, each off by default (today's search unchanged) so the
 * ladder can SPRT them one at a time:
 * <ul>
 * <li>{@code aturns} -- the horizon for ATTACK decisions only (default: the same
 *     as {@code turns}); {@code aturns=1} lets an attack's rollout see the
 *     opponent's crack-back turn;</li>
 * <li>{@code override} -- {@code margin} (default: the best mean beats Forge's
 *     mean by {@code margin}) or {@code lcb} (noise-aware: the lower confidence
 *     bound {@code mean_d − z·sd_d/√R} of the best's paired per-round difference
 *     to Forge's answer clears {@code margin}, over at least 3 rounds);
 *     {@code z} its multiplier (default 1.0);</li>
 * <li>{@code untapped} -- leaf points an untapped creature is worth over a
 *     tapped one (default 1, Forge's {@code CreatureEvaluator}'s own term);</li>
 * <li>{@code oracle=1} -- the copies keep the REAL hidden cards (no
 *     determinization): a BENCH-ONLY upper bound on what inference could be
 *     worth.  {@link #parseLive} refuses it, and the game's AI seat
 *     ({@code MtgTable --ai-search}) parses with that.</li>
 * </ul>
 */
public final class SearchConfig {

    public final int budgetMs;
    public final int maxCandidates;
    public final int horizonTurns;
    public final int minRounds;
    public final int margin;
    public final int maxRounds;
    public final boolean priority;
    public final boolean attacks;
    public final boolean blocks;
    /** Seed for the determinizations; 0 = from the clock. */
    public final long seed;
    /** The horizon for attack decisions; -1 = {@link #horizonTurns} (D351). */
    public final int attackTurns;
    /** True: the noise-aware override rule (lower confidence bound), false: the mean margin (D350). */
    public final boolean lcb;
    /** The lower confidence bound's multiplier (D350). */
    public final double z;
    /** Leaf points per untapped creature; 1 is Forge's own (D351). */
    public final double untapped;
    /** Bench only: no determinization, the copies keep the real hidden cards (D350). */
    public final boolean oracle;

    /** The fewest complete rounds the {@code lcb} rule overrules Forge on (an sd from fewer is no sd). */
    public static final int LCB_MIN_ROUNDS = 3;

    public SearchConfig(final int budgetMs, final int maxCandidates, final int horizonTurns, final int minRounds,
                        final int margin, final int maxRounds, final boolean priority, final boolean attacks, final boolean blocks,
                        final long seed) {
        this(budgetMs, maxCandidates, horizonTurns, minRounds, margin, maxRounds, priority, attacks, blocks, seed,
                -1, false, 1.0, 1.0, false);
    }

    public SearchConfig(final int budgetMs, final int maxCandidates, final int horizonTurns, final int minRounds,
                        final int margin, final int maxRounds, final boolean priority, final boolean attacks, final boolean blocks,
                        final long seed, final int attackTurns, final boolean lcb, final double z, final double untapped,
                        final boolean oracle) {
        if (budgetMs < 50 || budgetMs > 60_000) {
            throw new IllegalArgumentException("search budget must be 50..60000 ms, got " + budgetMs);
        }
        if (maxCandidates < 2 || horizonTurns < 0 || horizonTurns > 4 || minRounds < 1 || maxRounds < minRounds) {
            throw new IllegalArgumentException("bad search config");
        }
        if (attackTurns < -1 || attackTurns > 4) {
            throw new IllegalArgumentException("search aturns must be 0..4 (or unset), got " + attackTurns);
        }
        if (!(z >= 0 && z <= 5) || !(untapped >= 0 && untapped <= 1000)) {
            throw new IllegalArgumentException("search z must be 0..5 and untapped 0..1000");
        }
        this.budgetMs = budgetMs;
        this.maxCandidates = maxCandidates;
        this.horizonTurns = horizonTurns;
        this.minRounds = minRounds;
        this.margin = margin;
        this.maxRounds = maxRounds;
        this.priority = priority;
        this.attacks = attacks;
        this.blocks = blocks;
        this.seed = seed;
        this.attackTurns = attackTurns;
        this.lcb = lcb;
        this.z = z;
        this.untapped = untapped;
        this.oracle = oracle;
    }

    /** The horizon for a decision of kind {@code p}, {@code a} or {@code b}. */
    public int horizonFor(final String kind) {
        return "a".equals(kind) && attackTurns >= 0 ? attackTurns : horizonTurns;
    }

    public static SearchConfig defaults() {
        return parse("");
    }

    /**
     * The game's AI seat's parse ({@code MtgTable --ai-search}, D314): as
     * {@link #parse}, but the bench-only {@code oracle} is refused -- a seat
     * that plays a person never sees their hidden cards (D312, D350).
     */
    public static SearchConfig parseLive(final String text) {
        final SearchConfig c = parse(text);
        if (c.oracle) {
            throw new IllegalArgumentException("search oracle=1 reads the opponent's real hidden cards: bench only "
                    + "(tools/ai-bench, the ladder), never a live seat");
        }
        return c;
    }

    public static SearchConfig parse(final String text) {
        int ms = 1500;
        int cands = 6;
        int turns = 0;
        int rounds = 2;
        int margin = 20;
        int maxRounds = 12;
        String what = "pab";
        long seed = 0;
        int aturns = -1;
        String override = "margin";
        double z = 1.0;
        double untapped = 1.0;
        boolean oracle = false;
        if (text != null && !text.isBlank()) {
            for (final String kv : text.split(",")) {
                final String[] p = kv.trim().split("=", 2);
                if (p.length != 2) {
                    throw new IllegalArgumentException("search option must be key=value: " + kv);
                }
                switch (p[0]) {
                case "ms": ms = Integer.parseInt(p[1]); break;
                case "cands": cands = Integer.parseInt(p[1]); break;
                case "turns": turns = Integer.parseInt(p[1]); break;
                case "rounds": rounds = Integer.parseInt(p[1]); break;
                case "margin": margin = Integer.parseInt(p[1]); break;
                case "maxrounds": maxRounds = Integer.parseInt(p[1]); break;
                case "what": what = p[1]; break;
                case "seed": seed = Long.parseLong(p[1]); break;
                case "aturns": aturns = Integer.parseInt(p[1]); break;
                case "override": override = p[1]; break;
                case "z": z = Double.parseDouble(p[1]); break;
                case "untapped": untapped = Double.parseDouble(p[1]); break;
                case "oracle":
                    if (!p[1].matches("[01]")) {
                        throw new IllegalArgumentException("search oracle= takes 0 or 1: " + p[1]);
                    }
                    oracle = "1".equals(p[1]);
                    break;
                default: throw new IllegalArgumentException("unknown search option " + p[0]
                        + " (ms, cands, turns, rounds, margin, maxrounds, what, seed, aturns, override, z, untapped, oracle)");
                }
            }
        }
        if (!what.matches("[pab]+")) {
            throw new IllegalArgumentException("search what= takes letters p, a, b: " + what);
        }
        if (!override.matches("margin|lcb")) {
            throw new IllegalArgumentException("search override= is margin or lcb: " + override);
        }
        return new SearchConfig(ms, cands, turns, rounds, margin, maxRounds, what.contains("p"), what.contains("a"),
                what.contains("b"), seed, aturns, "lcb".equals(override), z, untapped, oracle);
    }

    @Override
    public String toString() {
        final StringBuilder sb = new StringBuilder(String.format(Locale.ROOT,
                "ms=%d,cands=%d,turns=%d,rounds=%d,margin=%d,maxrounds=%d,what=%s%s%s",
                budgetMs, maxCandidates, horizonTurns, minRounds, margin, maxRounds, priority ? "p" : "", attacks ? "a" : "",
                blocks ? "b" : ""));
        // D350–D351's switches are printed only when on, so a default config prints as before.
        if (attackTurns >= 0) {
            sb.append(",aturns=").append(attackTurns);
        }
        if (lcb) {
            sb.append(String.format(Locale.ROOT, ",override=lcb,z=%s", trim(z)));
        }
        if (untapped != 1.0) {
            sb.append(",untapped=").append(trim(untapped));
        }
        if (oracle) {
            sb.append(",oracle=1");
        }
        return sb.toString();
    }

    private static String trim(final double v) {
        return v == Math.rint(v) ? String.valueOf((long) v) : String.valueOf(v);
    }
}
