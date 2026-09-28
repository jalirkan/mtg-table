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

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintStream;
import java.lang.management.LockInfo;
import java.lang.management.ManagementFactory;
import java.lang.management.ThreadInfo;
import java.lang.management.ThreadMXBean;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Unit check for {@code over} being the <b>terminal</b> frame of a session
 * (protocol sections 7 and 8.4) when another thread is emitting at the same
 * moment -- run by {@code bridge/build.sh} after every compile, beside
 * {@link JsonSelfTest}, {@link AskSelfTest} and {@link GameLogSelfTest}, and for
 * the same reason: the defect it exists for is invisible in a passing run.
 *
 * <h2>The defect</h2>
 *
 * <p>{@code WireGuiGame.emit} checked {@code overEmitted} <em>outside</em> the
 * {@code synchronized (log)} block that numbers and pushes a frame.  A thread
 * that read the flag false could be descheduled there; the concede's
 * {@code emitOver} set the flag, took the monitor and pushed {@code over}; the
 * first thread then resumed, took the monitor and pushed an {@code input} one
 * {@code seq} past {@code over}.  Three gate runs at a load average of 20-60
 * failed step 10a, 10b or 10g on exactly that ("the last frame of the ws
 * session is not `over`").  {@code logC2s} had the same shape for an act.
 *
 * <p>The fix re-checks the flag under the monitor.  {@code emitOver} sets it
 * <em>before</em> taking the monitor, so a frame that reaches the monitor after
 * {@code over} was pushed must see it, and a frame that reached the monitor
 * first is numbered ahead of {@code over}, which is the legal order.
 *
 * <h2>How it is driven</h2>
 *
 * <p>No engine and no game: a {@link WireGuiGame} over a real {@link GameLog}
 * and a transport that records what it was handed.  {@code emit} and
 * {@code logC2s} are private and reached by reflection, exactly as the engine's
 * four threads reach them through Forge's calls; {@code over} is produced by
 * the public {@code finishGame()}.  The <b>deterministic</b> half parks both
 * racers on the log's monitor -- a holder thread keeps it, and
 * {@link ThreadMXBean} confirms each racer is BLOCKED on that very object --
 * so the losing interleaving happens every run, not when the scheduler
 * obliges: with the re-check removed it fails every time (negative control,
 * recorded in {@code docs/evidence/match-setup.md}).  The <b>stress</b> half
 * then lets real threads race with no help, as a second witness.
 *
 * <p>Hard rule 1: {@link Bootstrap#installGui} is the first Forge call in the
 * process.  Every thread is one of {@link HeadlessGuiBase}'s own
 * ({@code runBackgroundTask}'s {@value HeadlessGuiBase#BG_NAME}), so this file
 * names no thread of its own and the thread-name lint and class-init assert are
 * untouched.  It writes only under the directory it is given ({@code var/}).
 */
public final class OverRaceSelfTest {

    private OverRaceSelfTest() { }

    /** Enough iterations that an unguarded emit loses the race at least once on a loaded box. */
    private static final int STRESS_ROUNDS = 300;

    private static int checks;
    private static final List<String> FAILURES = new ArrayList<>();

    private static File dir;
    private static HeadlessGuiBase gui;
    private static Method emit;
    private static Method logC2s;

    public static void main(final String[] args) throws Exception {
        dir = new File(args.length > 0 ? args[0] : "var/over-race-selftest").getAbsoluteFile();
        final String forgeHome = args.length > 1 ? args[1] : "forge-home";
        if (!dir.isDirectory() && !dir.mkdirs()) {
            System.out.println("OverRaceSelfTest: cannot create " + dir);
            System.exit(1);
        }
        gui = Bootstrap.installGui(forgeHome);   // hard rule 1: the first Forge call

        // WireGuiGame reports every dropped frame on stderr, and the stress half
        // drops a great many.  Classify it line by line as it is written --
        // counted, never stored -- and pass anything else through: an uncaught
        // exception on a racer must still be seen.
        final PrintStream realErr = System.err;
        final LineSink sink = new LineSink(realErr);
        System.setErr(new PrintStream(sink, true, StandardCharsets.UTF_8));

        emit = WireGuiGame.class.getDeclaredMethod("emit", String.class, String.class);
        emit.setAccessible(true);
        logC2s = WireGuiGame.class.getDeclaredMethod("logC2s", String.class, String.class);
        logC2s.setAccessible(true);

        s2cThatLostTheRaceIsDropped();
        c2sThatLostTheRaceIsNotLogged();
        stress();

        System.err.flush();
        System.setErr(realErr);
        for (final String line : sink.unexpected) {
            FAILURES.add("unexpected stderr: " + line);
        }
        System.out.println("OverRaceSelfTest: " + sink.expected + " expected stderr line(s) "
                + "(dropped frames and the no-outcome `over`), " + sink.unexpected.size() + " unexpected");
        System.out.println("OverRaceSelfTest: " + checks + " check(s), " + FAILURES.size() + " failure(s)");
        for (final String f : FAILURES) {
            System.out.println("  FAIL " + f);
        }
        System.exit(FAILURES.isEmpty() ? 0 : 1);
    }

    // ------------------------------------------------------------------

    /**
     * THE regression test.  An {@code input} passes the fast-path check and
     * parks on the log's monitor; {@code over} is then produced and parks on it
     * too; the monitor is released.  Whichever racer the JVM wakes first, the
     * {@code input} must not reach the wire or the file: the flag was set
     * before either of them got the monitor.
     */
    private static void s2cThatLostTheRaceIsDropped() throws Exception {
        final Rig r = new Rig("race-s2c");
        r.parkBoth(() -> invoke(emit, r.game, "input", "{\"prompt\":\"\"}"));
        r.release();

        eq("s2c race: frames pushed", 1, r.pushed.size());
        expect("s2c race: the one frame pushed is `over`, got " + r.pushed,
               r.pushed.size() == 1 && r.pushed.get(0).contains("\"type\":\"over\""));
        eq("s2c race: frames dropped by the re-check", 1, r.game.lateFramesDropped());
        final List<String> lines = r.closeAndRead();
        eq("s2c race: the file is the header plus `over`", 2, lines.size());
        expect("s2c race: the file's last line is `over`",
               !lines.isEmpty() && lines.get(lines.size() - 1).contains("\"type\":\"over\""));
    }

    /** The same interleaving for an act: it must not be written after (or instead of before) `over`. */
    private static void c2sThatLostTheRaceIsNotLogged() throws Exception {
        final Rig r = new Rig("race-c2s");
        r.parkBoth(() -> invoke(logC2s, r.game, "act", "{\"action\":\"buttonOk\"}"));
        r.release();

        eq("c2s race: frames dropped by the re-check", 1, r.game.lateFramesDropped());
        final List<String> lines = r.closeAndRead();
        eq("c2s race: the file is the header plus `over`", 2, lines.size());
        expect("c2s race: no act in the file",
               lines.stream().noneMatch(l -> l.contains("\"dir\":\"c2s\"")));
        expect("c2s race: the file's last line is `over`",
               !lines.isEmpty() && lines.get(lines.size() - 1).contains("\"type\":\"over\""));
    }

    /**
     * No help from the test: two background threads push {@code input} and
     * {@code state} and log acts as fast as they can while a third produces
     * {@code over}.  After every round {@code over} must be the last frame on
     * the wire and the last line of the file.
     */
    private static void stress() throws Exception {
        int wireFails = 0;
        int fileFails = 0;
        int dropped = 0;
        for (int round = 0; round < STRESS_ROUNDS; round++) {
            final int nth = round;
            final Rig r = new Rig("stress-" + round);
            final AtomicBoolean stop = new AtomicBoolean();
            final CountDownLatch done = new CountDownLatch(3);
            final CountDownLatch going = new CountDownLatch(2);
            r.bg(() -> {
                going.countDown();
                while (!stop.get() && !r.overOut.get()) {
                    invoke(emit, r.game, "input", "{\"prompt\":\"\"}");
                    invoke(logC2s, r.game, "act", "{\"action\":\"buttonOk\"}");
                }
            }, done);
            r.bg(() -> {
                going.countDown();
                while (!stop.get() && !r.overOut.get()) {
                    invoke(emit, r.game, "state", "{\"turn\":1}");
                }
            }, done);
            going.await(5, TimeUnit.SECONDS);
            r.bg(() -> {
                final long spin = System.nanoTime() + (nth % 7) * 20_000L;
                while (System.nanoTime() < spin) {
                    Thread.onSpinWait();
                }
                r.game.finishGame();
                stop.set(true);
            }, done);
            if (!done.await(30, TimeUnit.SECONDS)) {
                FAILURES.add("stress round " + round + " did not finish in 30 s");
                return;
            }
            dropped += r.game.lateFramesDropped();
            final List<String> pushed = r.snapshotPushed();
            if (pushed.isEmpty() || !pushed.get(pushed.size() - 1).contains("\"type\":\"over\"")) {
                wireFails++;
            }
            final List<String> lines = r.closeAndRead();
            if (lines.isEmpty() || !lines.get(lines.size() - 1).contains("\"type\":\"over\"")) {
                fileFails++;
            }
        }
        eq("stress: rounds whose last pushed frame was not `over`", 0, wireFails);
        eq("stress: rounds whose file did not end in `over`", 0, fileFails);
        System.out.println("OverRaceSelfTest: stress " + STRESS_ROUNDS + " rounds, " + dropped
                + " frame(s) lost the race and were dropped");
    }

    // ------------------------------------------------------------------

    /** One {@link WireGuiGame} over one {@link GameLog}, with a transport that remembers. */
    private static final class Rig {
        final GameLog log;
        final WireGuiGame game;
        final List<String> pushed = Collections.synchronizedList(new ArrayList<>());
        /**
         * Set by the transport the moment it is handed {@code over}.  The stress
         * racers stop on it: the racing iteration is the one already in flight
         * when {@code over} goes out, and every later one only exercises the
         * fast path (and floods stderr, which a loaded box then spends seconds
         * printing).
         */
        final AtomicBoolean overOut = new AtomicBoolean();

        Rig(final String name) throws IOException {
            log = new GameLog(new File(dir, name + ".jsonl"));
            log.header("{\"v\":1,\"kind\":\"session\",\"gameId\":\"" + name + "\"}");
            game = new WireGuiGame(name, new Recorder(pushed, overOut), log);
        }

        void bg(final Runnable body, final CountDownLatch done) {
            gui.runBackgroundTask("over-race", () -> {
                try {
                    body.run();
                } finally {
                    done.countDown();
                }
            });
        }

        /**
         * Hold the log's monitor; start {@code racer} and wait until it is
         * BLOCKED on that monitor (it has passed the fast-path check); start
         * {@code finishGame()} and wait until it is BLOCKED there too (it has
         * set {@code overEmitted}).  Both are left parked; {@link #release}
         * lets them go.
         */
        void parkBoth(final Runnable racer) throws Exception {
            final AtomicReference<Thread> a = new AtomicReference<>();
            final AtomicReference<Thread> b = new AtomicReference<>();
            final CountDownLatch done = new CountDownLatch(2);
            held = new CountDownLatch(1);
            final CountDownLatch holding = new CountDownLatch(1);
            // The holder is a thread of its own so that release() is a plain
            // countDown and the monitor is never held by the test's main thread
            // across a wait it could not time out of.
            bg(() -> {
                synchronized (log) {
                    holding.countDown();
                    awaitQuietly(held);
                }
            }, new CountDownLatch(1));
            holding.await(5, TimeUnit.SECONDS);
            bg(() -> {
                a.set(Thread.currentThread());
                racer.run();
            }, done);
            waitBlockedOn(a, "the racing frame");
            bg(() -> {
                b.set(Thread.currentThread());
                game.finishGame();
            }, done);
            waitBlockedOn(b, "over");
            this.done = done;
        }

        private CountDownLatch held;
        private CountDownLatch done;

        void release() throws InterruptedException {
            held.countDown();
            if (!done.await(10, TimeUnit.SECONDS)) {
                FAILURES.add(log.file().getName() + ": the racers did not finish in 10 s");
            }
        }

        // Thread.getId() is deprecated from Java 19 for threadId(); the source
        // stays Java 17 compatible (bridge/build.sh), so the old name stays.
        @SuppressWarnings("deprecation")
        private void waitBlockedOn(final AtomicReference<Thread> t, final String what) throws Exception {
            final ThreadMXBean mx = ManagementFactory.getThreadMXBean();
            final int want = System.identityHashCode(log);
            final long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
            while (System.nanoTime() < deadline) {
                final Thread th = t.get();
                if (th != null && th.getState() == Thread.State.BLOCKED) {
                    final ThreadInfo ti = mx.getThreadInfo(th.getId());
                    final LockInfo li = ti == null ? null : ti.getLockInfo();
                    if (li != null && li.getIdentityHashCode() == want) {
                        return;
                    }
                }
                Thread.sleep(1L);
            }
            throw new IllegalStateException(what + " never parked on the log's monitor");
        }

        List<String> snapshotPushed() {
            synchronized (pushed) {
                return new ArrayList<>(pushed);
            }
        }

        List<String> closeAndRead() throws IOException {
            log.close();
            return Files.readAllLines(log.file().toPath(), StandardCharsets.UTF_8);
        }
    }

    /**
     * stderr, classified a line at a time and never stored: the three lines
     * {@code WireGuiGame} writes for a dropped frame or a no-outcome
     * {@code over} are counted, anything else is echoed and kept (up to 50) as
     * a failure.  {@link PrintStream} serialises its writers, so a line is never
     * interleaved with another.
     */
    private static final class LineSink extends OutputStream {
        private static final String[] EXPECTED = {
            "C2S AFTER OVER not logged: ",
            "EMIT AFTER OVER dropped: ",
            "ASK AFTER OVER dropped: ",
            "OVER WITHOUT A gameOver STATE: ",
        };
        private final PrintStream echo;
        private final ByteArrayOutputStream line = new ByteArrayOutputStream(256);
        final List<String> unexpected = Collections.synchronizedList(new ArrayList<>());
        long expected;

        LineSink(final PrintStream echo) {
            this.echo = echo;
        }

        @Override public synchronized void write(final int b) {
            if (b != '\n') {
                line.write(b);
                return;
            }
            final String l = line.toString(StandardCharsets.UTF_8);
            line.reset();
            if (l.isEmpty()) {
                return;
            }
            for (final String prefix : EXPECTED) {
                if (l.startsWith(prefix)) {
                    expected++;
                    return;
                }
            }
            echo.println(l);
            if (unexpected.size() < 50) {
                unexpected.add(l);
            }
        }
    }

    /** Records every frame it is handed; everything else is a no-op. */
    private static final class Recorder implements Transport {
        private final List<String> into;
        private final AtomicBoolean overOut;

        Recorder(final List<String> into, final AtomicBoolean overOut) {
            this.into = into;
            this.overOut = overOut;
        }

        @Override public void start(final Inbound in, final ReplyPool pool) { }

        @Override public void push(final String frameJson) {
            into.add(frameJson);
            if (frameJson.contains("\"type\":\"over\"")) {
                overOut.set(true);
            }
        }

        @Override public String ask(final String askId, final String askFrameJson, final long timeoutMs) {
            return null;
        }

        @Override public long askTimeoutMs(final String kind) {
            return 0L;
        }

        @Override public void close() { }
    }

    private static void invoke(final Method m, final WireGuiGame g, final String type, final String body) {
        try {
            m.invoke(g, type, body);
        } catch (final IllegalAccessException e) {
            throw new IllegalStateException(e);
        } catch (final InvocationTargetException e) {
            throw new IllegalStateException(e.getCause());
        }
    }

    private static void awaitQuietly(final CountDownLatch l) {
        try {
            l.await(30, TimeUnit.SECONDS);
        } catch (final InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static void eq(final String what, final long want, final long got) {
        checks++;
        if (want != got) {
            FAILURES.add(what + ": want " + want + ", got " + got);
        }
    }

    private static void expect(final String what, final boolean ok) {
        checks++;
        if (!ok) {
            FAILURES.add(what);
        }
    }
}
