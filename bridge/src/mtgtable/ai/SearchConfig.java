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
 * included, default 6), {@code turns} (rollout horizon: 1 = to the end of the
 * NEXT turn; default 0, the end of this turn), {@code rounds} (determinizations every candidate must
 * finish before the search may overrule Forge, default 2), {@code margin} (how
 * much better, in leaf points, an alternative's mean must be than Forge's own,
 * default 20), {@code maxrounds} (stop early after this many complete rounds,
 * default 12), and {@code what} (which decisions: any of {@code p} priority in
 * our main phase, {@code a} attacks, {@code b} blocks; default {@code pab}).
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

    public SearchConfig(final int budgetMs, final int maxCandidates, final int horizonTurns, final int minRounds,
                        final int margin, final int maxRounds, final boolean priority, final boolean attacks, final boolean blocks,
                        final long seed) {
        if (budgetMs < 50 || budgetMs > 60_000) {
            throw new IllegalArgumentException("search budget must be 50..60000 ms, got " + budgetMs);
        }
        if (maxCandidates < 2 || horizonTurns < 0 || horizonTurns > 4 || minRounds < 1 || maxRounds < minRounds) {
            throw new IllegalArgumentException("bad search config");
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
    }

    public static SearchConfig defaults() {
        return parse("");
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
                default: throw new IllegalArgumentException("unknown search option " + p[0]
                        + " (ms, cands, turns, rounds, margin, maxrounds, what, seed)");
                }
            }
        }
        if (!what.matches("[pab]+")) {
            throw new IllegalArgumentException("search what= takes letters p, a, b: " + what);
        }
        return new SearchConfig(ms, cands, turns, rounds, margin, maxRounds, what.contains("p"), what.contains("a"),
                what.contains("b"), seed);
    }

    @Override
    public String toString() {
        return String.format(Locale.ROOT, "ms=%d,cands=%d,turns=%d,rounds=%d,margin=%d,maxrounds=%d,what=%s%s%s",
                budgetMs, maxCandidates, horizonTurns, minRounds, margin, maxRounds, priority ? "p" : "", attacks ? "a" : "",
                blocks ? "b" : "");
    }
}
