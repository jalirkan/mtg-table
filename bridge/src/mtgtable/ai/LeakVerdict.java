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

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.LongSupplier;

/**
 * The atlas's no-leak verdict (D529, amending D451 point 6), engine-free so
 * {@link DecisionSelfTest} can hold it on strings and a fake clock: no Forge
 * class here.
 *
 * <p>The check plays a branch as it is (the base) and again after seat B's
 * real hidden cards were redealt in the real game (the redeal).  Two things are
 * compared.  The <b>fork digest</b> ({@link Atlas}'s {@code forkDigest}): the
 * copy after {@code Determinizer.determinize}, which sorts seat B's hidden
 * cards by name then id, shuffles them with the branch's seeded source and
 * deals them back with their ids kept -- so base and redeal digests are
 * EXPECTED to be equal, and "different before the determinize, equal after" is
 * the test (the before half is the caller's {@code leakRedealApplied}).  Base
 * digests that disagree among themselves (or redeal digests among themselves)
 * are the copier not reproducing the fork from its seed: {@link Kind#FORK_UNSTABLE},
 * its own problem, not a leak.  Base and redeal digests each stable and
 * different: the redeal reached the fork, {@link Kind#LEAK}.  The <b>outcome
 * signatures</b>: seat A's state at the fork, the result and seat A's rows (what
 * D451's {@code leakSame} compared).  The first base and the first redeal the
 * same: {@link Kind#SAME}.  When they differ the caller replays each side
 * {@link #RETESTS} more times ({@link #retest}), and over all the replays:
 * one signature in all = SAME; base and redeal sets that overlap =
 * {@link Kind#NONDETERMINISTIC} (Forge 2.0.14 does not replay the branch exactly
 * from its seed, J203); disjoint sets with the base reproduced (one base
 * signature) = LEAK; disjoint sets with a base that varies =
 * {@link Kind#UNRESOLVED} (with many outcomes -- timeouts -- disjoint sets are
 * what chance gives).  A retest that ran out of {@link #RETEST_BUDGET_MS} is
 * {@link Kind#INCOMPLETE}.
 */
public final class LeakVerdict {

    private LeakVerdict() {
    }

    /**
     * D529: the replays of each side after a first pair that moved.  For a branch
     * with two outcomes, no leak, flipping at rate p, a false LEAK needs all five
     * base replays on one outcome and all five redeal replays on the other:
     * p^4 (1-p)^4 given the first move, 0.39% at the worst (p = 1/2), 0.0066% at
     * p = 0.10.  With more outcomes the base must still reproduce, so the false
     * LEAK falls (0.12% with four equally likely outcomes, 0.01% with ten), and
     * the rest of the disjoint cases are UNRESOLVED, a warning.
     */
    public static final int RETESTS = 4;

    /**
     * D529: the retest's wall budget.  A pair of replays starts only while the
     * time spent plus two replays at the branch deadline fits in it, so the
     * retest never runs past it.  J148's longest unit took 976 s (D459), its
     * no-leak check's first three replays included; 976 + 600 = 1,576 s, about
     * 26 minutes, inside the 30-minute unit watchdog.
     */
    public static final long RETEST_BUDGET_MS = 600_000L;

    /** What the check concluded; {@link #wire} is the row's spelling. */
    public enum Kind {
        /** No replay moved, and the fork digests agree. */
        SAME("same"),
        /** The redeal reached the fork (stable digests that differ), or disjoint outcomes with the base reproduced. */
        LEAK("leak"),
        /** The digests agree and base and redeal outcomes overlap: the branch does not replay exactly. */
        NONDETERMINISTIC("nondeterministic"),
        /** The digests agree, the outcome sets are disjoint and the base itself varies: cannot be told. */
        UNRESOLVED("unresolved"),
        /** The first pair moved and the retest ran out of its budget before its last pair. */
        INCOMPLETE("incomplete"),
        /** A side's digests disagree among themselves: the copier did not reproduce the fork from its seed. */
        FORK_UNSTABLE("forkUnstable");

        public final String wire;

        Kind(final String wire) {
            this.wire = wire;
        }
    }

    /** One replay as the verdict reads it: its outcome signature and its fork digest. */
    public record Sample(String sig, String digest) {
    }

    /** One more replay of one side (the caller plays it). */
    @FunctionalInterface
    public interface Side {
        Sample replay() throws IOException;
    }

    /** The verdict and what was seen. */
    public static final class Result {
        public final Kind kind;
        /** True when every replay's fork digest is the first base's. */
        public final boolean forkSame;
        /** True when the first redealt replay's signature differs from the first base's. */
        public final boolean moved;
        public final int baseReplays;
        public final int redealReplays;
        public final int baseDistinct;
        public final int redealDistinct;
        /** Distinct signatures seen on both sides. */
        public final int shared;

        Result(final Kind kind, final boolean forkSame, final boolean moved, final int baseReplays, final int redealReplays,
               final int baseDistinct, final int redealDistinct, final int shared) {
            this.kind = kind;
            this.forkSame = forkSame;
            this.moved = moved;
            this.baseReplays = baseReplays;
            this.redealReplays = redealReplays;
            this.baseDistinct = baseDistinct;
            this.redealDistinct = redealDistinct;
            this.shared = shared;
        }

        /** D451's {@code leakSame}, as D529 reads it: false only for a leak. */
        public boolean leakSame() {
            return kind != Kind.LEAK;
        }
    }

    /**
     * Whether the caller must replay {@link #RETESTS} more times: the first
     * pair's signatures differ and their digests agree (a digest that differs
     * is a leak already, and needs no more games).
     */
    public static boolean needsRetest(final Sample base, final Sample redeal) {
        return base.digest().equals(redeal.digest()) && !base.sig().equals(redeal.sig());
    }

    /**
     * The retest: up to {@link #RETESTS} more replays of each side, base then
     * redeal, a pair at a time while {@code clockMs} says the time spent plus
     * two replays of {@code replayMaxMs} still fits in {@code budgetMs}; then
     * {@link #classify} over every replay, the first pair included.  A retest
     * that stops before its last pair is {@link Kind#INCOMPLETE}, with what it saw.
     */
    public static Result retest(final Sample base0, final Sample redeal0, final Side base, final Side redeal,
                                final long budgetMs, final long replayMaxMs, final LongSupplier clockMs) throws IOException {
        final List<Sample> bs = new ArrayList<>(List.of(base0));
        final List<Sample> rs = new ArrayList<>(List.of(redeal0));
        final long t0 = clockMs.getAsLong();
        boolean complete = true;
        for (int r = 0; r < RETESTS; r++) {
            if (clockMs.getAsLong() - t0 + 2 * replayMaxMs > budgetMs) {
                complete = false;
                break;
            }
            bs.add(base.replay());
            rs.add(redeal.replay());
        }
        final Result v = classify(bs, rs);
        if (complete) {
            return v;
        }
        return new Result(Kind.INCOMPLETE, v.forkSame, v.moved, v.baseReplays, v.redealReplays, v.baseDistinct, v.redealDistinct,
                v.shared);
    }

    /** The verdict over every replay, the first of each side first; each list non-empty. */
    public static Result classify(final List<Sample> base, final List<Sample> redeal) {
        if (base.isEmpty() || redeal.isEmpty()) {
            throw new IllegalArgumentException("the leak verdict wants one replay a side at least");
        }
        final Set<String> baseDigests = new HashSet<>();
        final Set<String> redealDigests = new HashSet<>();
        final Set<String> baseSigs = new HashSet<>();
        final Set<String> redealSigs = new HashSet<>();
        for (final Sample s : base) {
            baseDigests.add(s.digest());
            baseSigs.add(s.sig());
        }
        for (final Sample s : redeal) {
            redealDigests.add(s.digest());
            redealSigs.add(s.sig());
        }
        final String d0 = base.get(0).digest();
        final boolean forkSame = baseDigests.size() == 1 && redealDigests.size() == 1 && redealDigests.contains(d0);
        final boolean moved = !base.get(0).sig().equals(redeal.get(0).sig());
        int shared = 0;
        for (final String s : redealSigs) {
            if (baseSigs.contains(s)) {
                shared++;
            }
        }
        final Set<String> union = new HashSet<>(baseSigs);
        union.addAll(redealSigs);
        final Kind kind;
        if (baseDigests.size() > 1 || redealDigests.size() > 1) {
            kind = Kind.FORK_UNSTABLE;
        } else if (!forkSame) {
            kind = Kind.LEAK;
        } else if (union.size() == 1) {
            kind = Kind.SAME;
        } else if (base.size() < 2 || redeal.size() < 2) {
            // moved with no retest to read: D451's rule, which cannot tell a race from a leak, so it errs toward a leak
            kind = Kind.LEAK;
        } else if (shared > 0) {
            kind = Kind.NONDETERMINISTIC;
        } else {
            kind = baseSigs.size() == 1 ? Kind.LEAK : Kind.UNRESOLVED;
        }
        return new Result(kind, forkSame, moved, base.size(), redeal.size(), baseSigs.size(), redealSigs.size(), shared);
    }
}
