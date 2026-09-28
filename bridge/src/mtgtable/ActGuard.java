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
 */
package mtgtable;

/**
 * <b>Decision D136</b>: may an act that writes the engine directly from the EDT
 * be applied <em>now</em>?  The pure half -- no Forge type, no engine, no clock
 * -- so {@link ActGuardSelfTest} can hold every row of the table on every build.
 *
 * <h2>Why there is a guard at all</h2>
 *
 * <p>Two acts write engine state from {@code mtg-table-EDT} <em>outside</em>
 * Forge's input protocol: {@code undo} ({@code PlayerControllerHuman
 * .undoLastAction()} &rarr; {@code MagicStack.undo()}, which pops the undo stack,
 * untaps and refunds, and consults no input at all) and {@code useMana}
 * ({@code InputPayMana.useManaFromPool} &rarr; {@code ManaPool
 * .tryPayCostWithColor}, which checks neither the input's {@code finished}
 * flag nor its {@code locked} one).  {@code MagicStack}'s undo stack is a plain
 * {@code java.util.Stack} that {@code Game-0} also walks
 * ({@code recordUndoableActions} &rarr; {@code clearUndoStack}: a
 * {@code lastIndexOf} and then a {@code remove(int)} per entry), so an
 * {@code undo} applied while the game thread is inside the stack is the
 * {@code ArrayIndexOutOfBoundsException} the story branch's gate run hit on
 * {@code Game-0} and M6's evidence section 4.3 hit on the EDT.  Every other act
 * but {@code concede} (below) goes through Forge's input protocol, which Forge
 * itself filters, or writes only what desktop Forge writes from its own EDT
 * ({@code InputProxy} resolves the input at call time, {@code InputBase}
 * ignores a finished input, {@code InputPayMana} ignores a click while it is
 * activating); {@code docs/evidence/undo-race.md} section 3 is the table.
 *
 * <h2>The conditions, in the order they are checked</h2>
 *
 * <p>D39's two conditions -- the engine is parked on this seat, and D22's input
 * generation has not moved -- are the core.  D39 wrote them for a READ on a
 * second {@code Game-n} worker; a WRITE on the EDT needs them to be airtight,
 * and five more exclusions make them so, each tied to a path in the 2.0.14 jar
 * ({@code javap -c}, recorded in the evidence):
 *
 * <ol>
 *   <li>{@link Facts#live} -- the engine has asked this seat something and the
 *       game is not over.</li>
 *   <li>{@link Facts#pendingAsks} is zero.  A game thread parked in our own
 *       {@code ask()} is woken by the <b>transport</b> thread's answer, which is
 *       not serialised with the EDT, so it can resume in the middle of the
 *       write.</li>
 *   <li>{@link Facts#inputUp}: an {@code InputSynchronized} is on the seat's
 *       input stack, so {@code Game-0} is inside its {@code showAndWait()}
 *       (D39).  {@code stop()} removes the input <em>before</em> it counts the
 *       latch down, so a thread that is about to resume has already emptied
 *       this.</li>
 *   <li>D22's stamp: {@link Facts#genNow} equals {@link Facts#genAtArrival},
 *       the generation read when the act arrived.  Every {@code stop()} moves
 *       the generation first ({@code onStop} &rarr; {@code clearActionableCards}
 *       &rarr; {@code clearWeaklySelectable} is one of our {@code engineInput}
 *       calls), so an act whose input was stopped or re-rendered while it
 *       queued for the EDT is applied to nothing.</li>
 *   <li>{@link Facts#manaActivating} is false: {@code InputPayMana.onOk} and
 *       {@code activateManaAbility} set {@code locked} on the EDT and then hand
 *       the activation to a {@code Game-n} worker ({@code GameAction.invoke}
 *       &rarr; {@code ThreadUtil.invokeInGameThread}); {@code updateMessage}
 *       clears it, on the EDT, when the worker is done.  That worker taps lands
 *       and records the undo stack while the input is still up -- M6's section
 *       4.3 failure.</li>
 *   <li>{@link Facts#passPressOutstanding} is false: an OK / pass this EDT gave
 *       an {@code InputPassPriority} that is still up, with the generation and
 *       the engine's ask count unmoved since.  {@code InputPassPriority
 *       .passPriority(Runnable)} hands the pass to a worker whenever mana would
 *       be lost (the mana-lost confirm, on by default -- D43), and that worker
 *       is invisible until it reaches our {@code showConfirmDialog}.</li>
 *   <li>{@link Facts#hopsInFlight} is zero: none of our own view-walking hops
 *       (D39's refresh, D22's ability menu) is between its submission and its
 *       end, so a write never lands under our own walk.</li>
 *   <li>{@link Facts#runningEngineThread} is null: no game thread that has
 *       entered the bridge is running ({@link #busy}).  This is the one that
 *       catches what the input stack cannot see: {@code Game-0} between
 *       {@code setInput} and {@code awaitLatchRelease} (it pushes the input,
 *       then flushes our forwarder -- a walk -- and only then parks), and a
 *       confirm worker continuing into {@code stop()} after its answer.</li>
 * </ol>
 *
 * <p>When any one fails the act is <b>not applied</b> and the seat is told
 * {@code notice {level:"warn", title:"Not now"}} (protocol amendment M48): the
 * act had no effect, and the client may send it again once the engine is
 * waiting on it.  Nothing is queued: an undo or a pool pip is a decision about
 * the board the player saw, and applying it to a later board is exactly the
 * defect.
 *
 * <p><b>{@code concede} asks the same question and is never refused.</b>
 * {@code PlayerControllerHuman.concede()} ends in
 * {@code GameAction.checkGameOverCondition()} on the calling thread, a walk and
 * an edit of the player list that threw {@code ConcurrentModificationException}
 * on {@code Game-0} when it ran from the EDT under a running engine.  Quiet, it
 * is applied whole; otherwise {@code WireGuiGame.concede} writes the outcome
 * alone and leaves the walk to the engine's own state-based check.
 */
final class ActGuard {

    private ActGuard() { }

    /** What the EDT saw, one field per condition above, read immediately before the write. */
    static final class Facts {
        boolean live;
        int pendingAsks;
        boolean inputUp;
        long genAtArrival;
        long genNow;
        boolean manaActivating;
        boolean passPressOutstanding;
        int hopsInFlight;
        /** The name of a running engine thread, or null when every one is waiting or gone. */
        String runningEngineThread;
    }

    /**
     * The reason the act may not be applied now, or {@code null} when it may.
     * The first failing condition wins, in the order of the class comment.
     */
    static String whyNotNow(final Facts f) {
        if (!f.live) {
            return "the game is not live (no input yet, or over)";
        }
        if (f.pendingAsks > 0) {
            return "an ask is outstanding (" + f.pendingAsks + "), and its answer wakes a game thread "
                    + "from the transport thread";
        }
        if (!f.inputUp) {
            return "no input is up: the engine is running, not parked on this seat";
        }
        if (f.genNow != f.genAtArrival) {
            return "the input moved on after the act arrived (generation " + f.genAtArrival + " -> "
                    + f.genNow + ", D22)";
        }
        if (f.manaActivating) {
            return "Forge is activating a mana ability on a worker thread (InputPayMana.isActivatingManaAbility)";
        }
        if (f.passPressOutstanding) {
            return "an OK/pass on this InputPassPriority is still with the engine (its mana-lost confirm "
                    + "runs on a worker)";
        }
        if (f.hopsInFlight > 0) {
            return "a bridge hop is walking the view graph (" + f.hopsInFlight + ")";
        }
        if (f.runningEngineThread != null) {
            return f.runningEngineThread + " is running";
        }
        return null;
    }

    /**
     * Is a thread in this state doing work?  RUNNABLE and BLOCKED are; so is
     * NEW, a thread handed its first task and not yet started.  WAITING and
     * TIMED_WAITING are not, and neither is TERMINATED.
     *
     * <p>This is a conservative filter and only its dangerous direction matters:
     * a thread reported as waiting while it runs engine code.  A thread writes
     * its own wait state as it enters the wait, so a running thread is never
     * reported waiting; the reverse lag -- woken, but not yet scheduled, so
     * still reported waiting -- needs a waker, and every waker that is not the
     * EDT (which is busy running this check) is covered by an earlier
     * condition: the transport by {@code pendingAsks} (the woken thread removes
     * its own pool entry), a worker's {@code stop()} by {@code inputUp} (it
     * removes the input before it counts the latch down).
     */
    static boolean busy(final Thread.State s) {
        return s == Thread.State.RUNNABLE || s == Thread.State.BLOCKED || s == Thread.State.NEW;
    }

    /** The first busy thread of these, as {@code "name (STATE)"}, or null. */
    static String runningThread(final Iterable<Thread> threads) {
        for (final Thread t : threads) {
            final Thread.State s = t.getState();
            if (busy(s)) {
                return t.getName() + " (" + s + ")";
            }
        }
        return null;
    }
}
