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

/**
 * D484: the move atlas's branch deadline, read at every decision a branch
 * seat is asked, and a cap on one decision recorded over and over.
 *
 * <p>D467's {@link Atlas.StepClock} reads the deadline on every game event,
 * which ends a step that grows without end.  A step that loops on a question
 * fires no event at all: Forge 2.0.14's {@code ChooseSourceEffect.resolve}
 * re-asks its chooser {@code while (o == null || o.getName().startsWith("--"))},
 * and when the AI's answer is always null or a divider card (J167's spine s05,
 * Circle of Protection: Green) the seat is asked about 20,000 times a second
 * with no event between, so only the 30-minute unit watchdog ended it.  So the
 * {@link AtlasController} calls {@link #due} at the top of each decision
 * callback it overrides, and past the deadline that throws
 * {@link Atlas.BranchTimeout} -- the same {@code Error} as the step clock's, so
 * it crosses Forge's {@code catch (Exception)} blocks and {@code Atlas.play}
 * scores it the same way (timed out, an engine error).  A field read and a
 * clock read; no thread, no hop onto the game thread (hard rule 3).
 *
 * <p>The cap ({@link #capping}): a seat's decision sink, wrapped, counts the
 * records that repeat the one before them exactly -- the same kind, options,
 * answer and policy at the same {@code stateSeq} -- and the
 * {@value #REPEAT_CAP}th such record throws {@link Atlas.BranchTimeout} naming
 * the repeated ask, so a loop like the one above costs milliseconds and a few
 * hundred kilobytes of frame log instead of 120 s and gigabytes.  A record the
 * seat does not write (a forced one, or a seat with no recorder) is not
 * counted; the deadline still is.
 *
 * <p>Both are off until {@link #arm} and after {@link #disarm}: the forced
 * first answer is installed, and the copy's ending recorded, without them.
 */
final class DecisionClock {

    /** Identical consecutive records at one {@code stateSeq} that end a branch. */
    static final int REPEAT_CAP = 1000;

    private final int cap;
    private long deadline;
    private boolean armed;
    /** Decision callbacks read while armed. */
    private long asks;
    private String lastKey;
    private int repeats;

    DecisionClock() {
        this(REPEAT_CAP);
    }

    /** {@code cap}: for the self-test only. */
    DecisionClock(final int cap) {
        this.cap = cap;
    }

    /** From now on, {@link #due} throws once {@code System.nanoTime()} has passed {@code deadlineNanos}. */
    void arm(final long deadlineNanos) {
        this.deadline = deadlineNanos;
        this.armed = true;
    }

    void disarm() {
        armed = false;
    }

    boolean armed() {
        return armed;
    }

    long asks() {
        return asks;
    }

    /** A decision callback ({@code ask}, e.g. "chooseSingleEntityForEffect") was entered: throw if the deadline has passed. */
    void due(final String ask) {
        if (!armed) {
            return;
        }
        asks++;
        if (System.nanoTime() > deadline) {
            throw new Atlas.BranchTimeout("the branch's deadline passed at a decision (" + ask + ", " + asks
                    + " decisions into its play)");
        }
    }

    /** {@code inner}, with each written record checked against the cap; null stays null. */
    DecisionSink capping(final DecisionSink inner) {
        if (inner == null) {
            return null;
        }
        return new DecisionSink() {
            @Override
            public int[] mark() {
                return inner.mark();
            }

            @Override
            public int write(final Decision d, final int[] mark) {
                repeated(d, mark);
                return inner.write(d, mark);
            }

            @Override
            public void forced(final String kind) {
                inner.forced(kind);
            }

            @Override
            public void cost(final long nanos) {
                inner.cost(nanos);
            }

            @Override
            public void error(final String where, final RuntimeException e) {
                inner.error(where, e);
            }
        };
    }

    /** Count {@code d} against the record before it; throw at the cap. */
    void repeated(final Decision d, final int[] mark) {
        if (!armed) {
            lastKey = null;
            repeats = 0;
            return;
        }
        final int seq = mark == null || mark.length < 2 ? -1 : mark[1];
        final String key = seq + "|" + d.kind + "|" + d.source + "|" + d.options + "|" + d.hidden + "|" + d.chosen + "|"
                + d.chosenAll + "|" + d.by;
        if (!key.equals(lastKey)) {
            lastKey = key;
            repeats = 1;
            return;
        }
        if (++repeats >= cap) {
            final String opts = d.options.size() <= 8 ? String.valueOf(d.options)
                    : d.options.subList(0, 8) + " and " + (d.options.size() - 8) + " more";
            throw new Atlas.BranchTimeout("the same " + d.kind + " decision (" + d.source + ", options " + opts
                    + (d.hidden > 0 ? " and " + d.hidden + " hidden" : "") + ", chosen " + d.chosen + ") was asked "
                    + repeats + " times in a row at stateSeq " + seq + " (no new state frame between)");
        }
    }
}
