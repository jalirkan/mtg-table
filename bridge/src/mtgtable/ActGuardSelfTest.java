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

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

/**
 * Unit check for {@link ActGuard} -- decision <b>D136</b>, the guard in front of
 * the two acts that write the engine from the EDT ({@code undo},
 * {@code useMana}) -- run by {@code bridge/build.sh} after every compile, beside
 * the other four self-tests.
 *
 * <p>Two halves:
 *
 * <ol>
 *   <li><b>The table.</b>  With every condition clear the act is applied; each
 *       condition failing <em>on its own</em> refuses it, with a reason that
 *       names that condition; and when several fail, the first in D136's order
 *       wins.  Delete a condition from {@link ActGuard#whyNotNow} and its row
 *       fails -- the negative control, recorded in
 *       {@code docs/evidence/undo-race.md}.</li>
 *   <li><b>The thread-state primitive on real threads</b>
 *       ({@link ActGuard#runningThread}), because the last condition rests on
 *       what {@link Thread#getState} reports for a thread doing work versus one
 *       parked: a spinning thread and one BLOCKED on a monitor are running; one
 *       parked on a latch, one sleeping and one terminated are not; and the
 *       latch-parked one reads as running again once it is released and
 *       working.</li>
 * </ol>
 *
 * <p>The engine race itself is reproduced end to end by
 * {@code tools/undo-race-repro.sh} (a server, a client and a held window), which
 * needs a game; this file needs none.  Hard rule 1: {@link Bootstrap#installGui}
 * is the first Forge call in the process, and every thread is one of
 * {@link HeadlessGuiBase}'s own ({@code runBackgroundTask}'s
 * {@value HeadlessGuiBase#BG_NAME}), so it names no thread of its own and the
 * thread-name lint and class-init assert are untouched.
 */
public final class ActGuardSelfTest {

    private ActGuardSelfTest() { }

    private static int checks;
    private static final List<String> FAILURES = new ArrayList<>();
    private static HeadlessGuiBase gui;

    public static void main(final String[] args) throws Exception {
        final String forgeHome = args.length > 0 ? args[0] : "forge-home";
        gui = Bootstrap.installGui(forgeHome);   // hard rule 1: the first Forge call

        table();
        order();
        states();
        realThreads();

        System.out.println("ActGuardSelfTest: " + checks + " check(s), " + FAILURES.size() + " failure(s)");
        for (final String f : FAILURES) {
            System.out.println("  FAIL " + f);
        }
        System.exit(FAILURES.isEmpty() ? 0 : 1);
    }

    // ------------------------------------------------------------------

    /** Every condition clear: the engine is parked on this seat and nothing else runs. */
    private static ActGuard.Facts quiet() {
        final ActGuard.Facts f = new ActGuard.Facts();
        f.live = true;
        f.pendingAsks = 0;
        f.inputUp = true;
        f.genAtArrival = 41;
        f.genNow = 41;
        f.manaActivating = false;
        f.passPressOutstanding = false;
        f.hopsInFlight = 0;
        f.runningEngineThread = null;
        return f;
    }

    private static void row(final String what, final Consumer<ActGuard.Facts> breakIt, final String mustName) {
        final ActGuard.Facts f = quiet();
        breakIt.accept(f);
        final String why = ActGuard.whyNotNow(f);
        expect(what + ": refused", why != null);
        expect(what + ": the reason names it (\"" + mustName + "\"), got: " + why,
               why != null && why.contains(mustName));
    }

    private static void table() {
        final String none = ActGuard.whyNotNow(quiet());
        expect("all conditions clear: applied, got a refusal: " + none, none == null);

        row("1 not live", f -> f.live = false, "not live");
        row("2 an ask is outstanding", f -> f.pendingAsks = 1, "ask is outstanding");
        row("3 no input is up", f -> f.inputUp = false, "no input is up");
        row("4 the input generation moved (D22)", f -> f.genNow = 42, "moved on");
        row("5 InputPayMana is activating on a worker", f -> f.manaActivating = true, "activating a mana ability");
        row("6 an OK/pass is still with the engine", f -> f.passPressOutstanding = true, "OK/pass");
        row("7 a bridge hop is walking", f -> f.hopsInFlight = 1, "hop is walking");
        row("8 an engine thread is running", f -> f.runningEngineThread = "Game-0 (RUNNABLE)", "Game-0");
    }

    /** Several conditions at once: the first in D136's order is the one reported. */
    private static void order() {
        final ActGuard.Facts f = quiet();
        f.inputUp = false;
        f.hopsInFlight = 2;
        f.runningEngineThread = "Game-1 (RUNNABLE)";
        final String why = ActGuard.whyNotNow(f);
        expect("order: 'no input' before a hop and a running thread, got: " + why,
               why != null && why.contains("no input is up"));
        final ActGuard.Facts g = quiet();
        g.pendingAsks = 1;
        g.live = false;
        final String why2 = ActGuard.whyNotNow(g);
        expect("order: 'not live' before an outstanding ask, got: " + why2,
               why2 != null && why2.contains("not live"));
    }

    private static void states() {
        for (final Thread.State s : Thread.State.values()) {
            final boolean want = s == Thread.State.RUNNABLE || s == Thread.State.BLOCKED
                    || s == Thread.State.NEW;
            expect("busy(" + s + ") == " + want, ActGuard.busy(s) == want);
        }
    }

    // ------------------------------------------------------------------

    /** Run {@code body} on a fresh {@value HeadlessGuiBase#BG_NAME} thread and hand back that thread. */
    private static Thread bg(final Runnable body) throws InterruptedException {
        final AtomicReference<Thread> t = new AtomicReference<>();
        final CountDownLatch started = new CountDownLatch(1);
        gui.runBackgroundTask("ActGuardSelfTest", () -> {
            t.set(Thread.currentThread());
            started.countDown();
            body.run();
        });
        if (!started.await(5, TimeUnit.SECONDS)) {
            throw new IllegalStateException("a background thread did not start in 5 s");
        }
        return t.get();
    }

    /** Wait (bounded) until {@code t} reports {@code want}. */
    private static boolean reaches(final Thread t, final Thread.State want) throws InterruptedException {
        final long end = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < end) {
            if (t.getState() == want) {
                return true;
            }
            Thread.sleep(1);
        }
        return false;
    }

    private static void realThreads() throws Exception {
        final AtomicBoolean stop = new AtomicBoolean();

        // A thread doing work: spinning, as the undo-window hook's is.
        final Thread spinner = bg(() -> {
            while (!stop.get()) {
                Thread.onSpinWait();
            }
        });
        final String r1 = ActGuard.runningThread(List.of(spinner));
        expect("a spinning thread is running, got: " + r1, r1 != null && r1.contains("RUNNABLE"));

        // A thread parked on a latch, as Game-0 is in InputSyncronizedBase.awaitLatchRelease.
        final CountDownLatch latch = new CountDownLatch(1);
        final CountDownLatch released = new CountDownLatch(1);
        final Thread parked = bg(() -> {
            try {
                latch.await();
            } catch (final InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
            released.countDown();
            while (!stop.get()) {
                Thread.onSpinWait();           // working again once released
            }
        });
        expect("the latch thread parks (WAITING)", reaches(parked, Thread.State.WAITING));
        expect("a thread parked on a latch is not running",
               ActGuard.runningThread(List.of(parked)) == null);

        // A sleeping thread, as a cached-pool worker idling in its keep-alive poll reads.
        final Thread sleeper = bg(() -> {
            try {
                Thread.sleep(TimeUnit.SECONDS.toMillis(20));
            } catch (final InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        expect("the sleeper reaches TIMED_WAITING", reaches(sleeper, Thread.State.TIMED_WAITING));
        expect("a sleeping thread is not running", ActGuard.runningThread(List.of(sleeper)) == null);

        // A thread BLOCKED on a monitor we hold: mid-work, waiting for a lock.
        final Object monitor = new Object();
        final Thread blocked;
        synchronized (monitor) {
            blocked = bg(() -> {
                synchronized (monitor) {
                    monitor.hashCode();
                }
            });
            expect("the blocked thread reaches BLOCKED", reaches(blocked, Thread.State.BLOCKED));
            final String r2 = ActGuard.runningThread(List.of(parked, sleeper, blocked));
            expect("a BLOCKED thread is running (and the first busy one is reported), got: " + r2,
                   r2 != null && r2.contains("BLOCKED"));
        }
        expect("the blocked thread finishes once the monitor is free", reaches(blocked, Thread.State.TERMINATED));
        expect("a terminated thread is not running", ActGuard.runningThread(List.of(blocked)) == null);

        // Only the waiting ones: nothing is running.
        expect("latch-parked + sleeping + terminated: nothing running",
               ActGuard.runningThread(List.of(parked, sleeper, blocked)) == null);

        // Release the latch: the thread that was parked is working again.
        latch.countDown();
        expect("the released thread got going", released.await(5, TimeUnit.SECONDS));
        expect("the released thread reads RUNNABLE", reaches(parked, Thread.State.RUNNABLE));
        final String r3 = ActGuard.runningThread(List.of(sleeper, parked));
        expect("a released, working thread is running again, got: " + r3,
               r3 != null && r3.contains("RUNNABLE"));

        stop.set(true);
        sleeper.interrupt();
        expect("the spinner stops", reaches(spinner, Thread.State.TERMINATED));
    }

    // ------------------------------------------------------------------

    private static void expect(final String what, final boolean ok) {
        checks++;
        if (!ok) {
            FAILURES.add(what);
        }
    }
}
