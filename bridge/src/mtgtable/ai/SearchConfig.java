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
 *
 * <p>The week-3 upgrades (D353–D355), each off by default for the same reason:
 * <ul>
 * <li>{@code anytime=1} -- the search respects its budget: a round cut short by
 *     the deadline keeps the rollouts it finished, candidates the remaining time
 *     cannot carry to {@code rounds} are pruned worst-first, clearly worse ones
 *     are retired by racing, and the verdict is taken on whatever paired
 *     evidence exists.  Forge's answer is kept without a verdict only when no
 *     alternative was scored at all (D353);</li>
 * <li>{@code rank=prior} -- up to {@code gen} candidates (default 24) are
 *     generated, each is applied once on one shared determinization and the
 *     position after it is scored (the leaf, or the learned position evaluator
 *     with {@code prior=eval} and {@code evalmodel=<path>}, D316), and the best
 *     {@code cands} are kept: Forge's own answer and "pass" always, the rest by
 *     that prior instead of by enumeration order (D354);</li>
 * <li>{@code rollout=outlets} -- inside the rollouts the searching seat plays
 *     Forge's AI with D310's sacrifice-outlet policy in front, instead of plain
 *     Forge; {@code rollout=both} gives the opponent's seat the policy too
 *     (D355).</li>
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

    /** D353: keep partial rounds, prune to the budget, race, decide on what exists. */
    public final boolean anytime;
    /** D354: generate up to {@link #generate} candidates and keep the best {@link #maxCandidates} by a prior. */
    public final boolean rankPrior;
    /** D354: how many candidates are generated before the prior's cut (only with {@link #rankPrior}). */
    public final int generate;
    /** D354: the prior's scorer: "leaf" or "eval" (the learned position evaluator at {@link #evalModel}). */
    public final String prior;
    /** D354: the learned evaluator's model file for {@code prior=eval}; null = none. */
    public final String evalModel;
    /** D355: the rollouts' policy: "default" (plain Forge), "outlets" (our seat with D310's policy), "both". */
    public final String rollout;

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
        this(budgetMs, maxCandidates, horizonTurns, minRounds, margin, maxRounds, priority, attacks, blocks, seed,
                attackTurns, lcb, z, untapped, oracle, false, false, Math.max(24, maxCandidates), "leaf", null, "default");
    }

    public SearchConfig(final int budgetMs, final int maxCandidates, final int horizonTurns, final int minRounds,
                        final int margin, final int maxRounds, final boolean priority, final boolean attacks, final boolean blocks,
                        final long seed, final int attackTurns, final boolean lcb, final double z, final double untapped,
                        final boolean oracle, final boolean anytime, final boolean rankPrior, final int generate,
                        final String prior, final String evalModel, final String rollout) {
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
        if (rankPrior && (generate < maxCandidates || generate > 64)) {
            throw new IllegalArgumentException("search gen must be cands..64, got " + generate);
        }
        if (!"leaf".equals(prior) && !"eval".equals(prior)) {
            throw new IllegalArgumentException("search prior= is leaf or eval: " + prior);
        }
        if ("eval".equals(prior) && (evalModel == null || evalModel.isEmpty())) {
            throw new IllegalArgumentException("search prior=eval needs evalmodel=<model file> (D316)");
        }
        if (!"default".equals(rollout) && !"outlets".equals(rollout) && !"both".equals(rollout)) {
            throw new IllegalArgumentException("search rollout= is default, outlets or both: " + rollout);
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
        this.anytime = anytime;
        this.rankPrior = rankPrior;
        this.generate = generate;
        this.prior = prior;
        this.evalModel = evalModel;
        this.rollout = rollout;
    }

    /** Whether the searching seat's rollouts play D310's outlet policy (D355). */
    public boolean rolloutOutletsUs() {
        return !"default".equals(rollout);
    }

    /** Whether the opponent's seat in the rollouts plays it too (D355). */
    public boolean rolloutOutletsThem() {
        return "both".equals(rollout);
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
        boolean anytime = false;
        String rank = "order";
        int gen = -1;
        String prior = "leaf";
        String evalModel = null;
        String rollout = "default";
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
                case "anytime":
                    if (!p[1].matches("[01]")) {
                        throw new IllegalArgumentException("search anytime= takes 0 or 1: " + p[1]);
                    }
                    anytime = "1".equals(p[1]);
                    break;
                case "rank": rank = p[1]; break;
                case "gen": gen = Integer.parseInt(p[1]); break;
                case "prior": prior = p[1]; break;
                case "evalmodel": evalModel = p[1]; break;
                case "rollout": rollout = p[1]; break;
                default: throw new IllegalArgumentException("unknown search option " + p[0]
                        + " (ms, cands, turns, rounds, margin, maxrounds, what, seed, aturns, override, z, untapped, oracle,"
                        + " anytime, rank, gen, prior, evalmodel, rollout)");
                }
            }
        }
        if (!what.matches("[pab]+")) {
            throw new IllegalArgumentException("search what= takes letters p, a, b: " + what);
        }
        if (!override.matches("margin|lcb")) {
            throw new IllegalArgumentException("search override= is margin or lcb: " + override);
        }
        if (!rank.matches("order|prior")) {
            throw new IllegalArgumentException("search rank= is order or prior: " + rank);
        }
        return new SearchConfig(ms, cands, turns, rounds, margin, maxRounds, what.contains("p"), what.contains("a"),
                what.contains("b"), seed, aturns, "lcb".equals(override), z, untapped, oracle, anytime,
                "prior".equals(rank), gen < 0 ? Math.max(24, cands) : gen, prior, evalModel, rollout);
        // gen is read only under rank=prior (and validated there).
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
        // D353–D355's likewise.
        if (anytime) {
            sb.append(",anytime=1");
        }
        if (rankPrior) {
            sb.append(",rank=prior,gen=").append(generate);
            if (!"leaf".equals(prior)) {
                sb.append(",prior=").append(prior).append(",evalmodel=").append(evalModel);
            }
        }
        if (!"default".equals(rollout)) {
            sb.append(",rollout=").append(rollout);
        }
        return sb.toString();
    }

    private static String trim(final double v) {
        return v == Math.rint(v) ? String.valueOf((long) v) : String.valueOf(v);
    }
}
