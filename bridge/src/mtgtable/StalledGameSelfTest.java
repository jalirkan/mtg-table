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
import java.io.PrintStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Unit check for <b>D448</b> (amendment M70): a game on a {@code --games N}
 * server whose seat nobody has held for {@code --idle-timeout} is abandoned with
 * no result, and the session goes on -- where D286 used to fail the whole run.
 *
 * <p>Two halves, and neither boots an engine, so CI's {@code bridge} job runs it
 * as it runs the others (tools/CLAUDE.md, <i>CI runs the gate's engine-free
 * half</i>):
 *
 * <ul>
 *   <li><b>the loop</b>: {@link MtgTable#playGames} -- the real loop, the one
 *       {@code MtgTable.run} calls -- over a fake {@link MtgTable.Loop} whose
 *       clock moves only when the loop waits on it, so an hour with nobody
 *       connected costs nothing.  A game opens with a client, the client drops,
 *       the clock passes the limit: the game is abandoned exactly then (not
 *       before, and never while a client is connected), the line names the
 *       client, the count reaches {@code /health}, the server starts the next
 *       game itself and stays up, and the match ends as after any {@code over}.
 *       And the rules around it: a single game still fails (D286, gate step
 *       10h), so does a game that cannot be conceded -- with its real cause on
 *       the {@code STALLED GAME n: not abandoned} line, decided before anything
 *       is posted: no input yet, no controller, already over, or a table seat
 *       ({@link WireGuiGame#abandonRefusal}) -- a wall-clock timeout is
 *       never an abandonment, an abandoned last game lingers under
 *       {@code --keep-open} and then ends cleanly, and a transport with no
 *       socket never abandons anything;</li>
 *   <li><b>the socket</b>: a real {@link WsTransport} on a free loopback port,
 *       a raw client that takes the seat, speaks once and leaves --
 *       {@link WsTransport#clientLine()} names it, when it last spoke and when it
 *       left, a game nobody began says so -- and {@code GET /health}, whose body
 *       stays exactly {@code ok} while its {@value WsTransport#STALLED_HEADER}
 *       header counts.</li>
 * </ul>
 *
 * <p>The engine half -- the concede on the EDT, the no-result {@code over}, the
 * restart -- is {@link WireGuiGame#abandonForAbsentSeat} and
 * {@link WireGuiGame#newGameAfterAbandon}, and it was run end to end on the real
 * engine for D448 (the decision has the run).  It names no thread and writes
 * nothing.
 */
public final class StalledGameSelfTest {

    private StalledGameSelfTest() { }

    private static int checks;
    private static final List<String> FAILURES = new ArrayList<>();

    private static final long SEC = 1_000_000_000L;
    private static final long IDLE = 3600L;              // the default --idle-timeout, in seconds
    private static final long POLL = 200_000_000L;       // MtgTable's CONNECT_POLL_MS, in ns

    public static void main(final String[] args) throws Exception {
        stalledGameGoesOn();
        singleGameStillFails();
        cannotBeConceded();
        refusals();
        refusalReasons();
        wallClockIsNotIdle();
        abandonedLastGameLingers();
        noSocketNeverAbandons();
        socket();

        System.out.println("StalledGameSelfTest: " + checks + " check(s), " + FAILURES.size() + " failure(s)");
        for (final String f : FAILURES) {
            System.out.println("  FAIL " + f);
        }
        System.exit(FAILURES.isEmpty() ? 0 : 1);
    }

    // ------------------------------------------------------------------
    // The loop, over a fake seat with a fake clock
    // ------------------------------------------------------------------

    /**
     * A seat whose games start and end, and whose client comes and goes, at
     * scripted moments of its own clock.  The clock moves only inside the two
     * waits, by exactly the time the loop waits, so the loop sees the hours it
     * would see and none of them pass.
     */
    private static final class Fake implements MtgTable.Loop {
        long now;
        boolean socket = true;
        boolean connected;
        // The seat's own state, as WireGuiGame.abandonForAbsentSeat reads it:
        // its refusal comes from the real abandonRefusal over these.
        boolean closed;
        boolean tableSeat;
        boolean ready = true;
        boolean over;
        boolean inputSeen = true;
        boolean controlled = true;
        int started = 1;                                   // game 1 begins with the session
        int ended;
        final List<long[]> script = new ArrayList<>();     // {at, kind, arg}
        final List<String> abandons = new ArrayList<>();
        final List<Long> abandonedAt = new ArrayList<>();
        int nextGames;
        int stalledReported = -1;

        static final int CONNECT = 0;
        static final int LEAVE = 1;
        static final int END = 2;

        Fake at(final long atSec, final int kind) {
            script.add(new long[] {atSec * SEC, kind});
            return this;
        }

        private void runDue() {
            for (final java.util.Iterator<long[]> it = script.iterator(); it.hasNext(); ) {
                final long[] e = it.next();
                if (e[0] <= now) {
                    it.remove();
                    if (e[1] == CONNECT) {
                        connected = true;
                    } else if (e[1] == LEAVE) {
                        connected = false;
                    } else {
                        ended = started;                   // the game being played reaches `over`
                    }
                }
            }
        }

        private boolean waitFor(final java.util.function.BooleanSupplier done, final long ms) {
            runDue();
            if (done.getAsBoolean()) {
                return true;
            }
            now += ms * 1_000_000L;
            runDue();
            return done.getAsBoolean();
        }

        @Override public boolean awaitGameEnd(final int n, final long ms) {
            return waitFor(() -> ended >= n, ms);
        }
        @Override public boolean awaitGameStart(final int n, final long ms) {
            return waitFor(() -> started >= n, ms);
        }
        @Override public boolean engineFailed() { return false; }
        @Override public boolean newGameQueued() { return false; }
        @Override public String gameId() { return "fake-g" + started; }
        @Override public boolean hasSocket() { return socket; }
        @Override public boolean connected() { return connected; }
        @Override public long nanoTime() { return now; }
        @Override public String abandon(final String text) {
            abandons.add(text);
            abandonedAt.add(now);
            final String refusal = WireGuiGame.abandonRefusal(closed, tableSeat, ready, over, inputSeen, controlled);
            if (refusal == null) {
                ended = started;                           // the concede ends it: `over`
            }
            return refusal;
        }
        @Override public void startNextGame() {
            nextGames++;
            started++;
        }
        @Override public String clientLine() {
            return "began by /127.0.0.1:5555 (connection #1); the last client /127.0.0.1:5555 (connection #1) "
                    + "connected 2026-10-16T00:00:00Z, last spoke 2026-10-16T00:10:00Z, left 2026-10-16T00:10:00Z";
        }
        @Override public void stalledGames(final int count) { stalledReported = count; }
    }

    private static final class Run {
        MtgTable.Played r;
        String out;
    }

    private static Run play(final Fake f, final int games, final boolean keepOpen, final long limitSec,
                            final long idleSec) throws InterruptedException {
        final ByteArrayOutputStream buf = new ByteArrayOutputStream();
        final Run run = new Run();
        try (PrintStream ps = new PrintStream(buf, true, StandardCharsets.UTF_8)) {
            run.r = MtgTable.playGames(f, games, keepOpen, limitSec, idleSec, ps);
        }
        run.out = buf.toString(StandardCharsets.UTF_8);
        return run;
    }

    /** THE case: a client opens game 1 of 2 and goes; an hour later the game is abandoned and game 2 begins. */
    private static void stalledGameGoesOn() throws InterruptedException {
        final long drop = 600;                             // the client leaves ten minutes in
        final long abandonAt = drop + IDLE;
        final Fake f = new Fake()
                .at(0, Fake.CONNECT)
                .at(drop, Fake.LEAVE)
                // game 2: a client arrives 5 s after it began, plays two hours -- twice the
                // limit, connected the whole time -- and the game ends; it leaves 5 s later.
                .at(abandonAt + 5, Fake.CONNECT)
                .at(abandonAt + 5 + 2 * IDLE, Fake.END)
                .at(abandonAt + 10 + 2 * IDLE, Fake.LEAVE);
        final Run run = play(f, 2, true, 0L, IDLE);
        eq("stalled: the session finished", true, run.r.finished);
        eq("stalled: two games reached `over`", 2, run.r.played);
        eq("stalled: one game was abandoned", 1, run.r.stalled);
        eq("stalled: the count reached /health", 1, f.stalledReported);
        eq("stalled: nothing failed", null, run.r.failure);
        eq("stalled: the session did not give up", null, run.r.abandoned);
        eq("stalled: exactly one abandonment (game 2's client held it for twice the limit)", 1, f.abandons.size());
        final long at = f.abandonedAt.isEmpty() ? -1L : f.abandonedAt.get(0);
        // The idle clock starts at the last poll that saw the client, which is
        // up to one poll (200 ms) before it left -- the real loop's granularity.
        eq("stalled: not abandoned before the limit (" + at / SEC + " s)", true,
                at >= abandonAt * SEC - POLL);
        eq("stalled: abandoned within a poll of the limit (" + at / SEC + " s)", true,
                at < abandonAt * SEC + SEC);
        eq("stalled: the notice says how long, in minutes", true,
                !f.abandons.isEmpty() && f.abandons.get(0).contains("for 60 min")
                        && f.abandons.get(0).contains("with no result"));
        eq("stalled: the server started game 2 itself, once", 1, f.nextGames);
        has("stalled", run.out, "STALLED GAME 1 (fake-g1): no client connected for 3600 s -- began by "
                + "/127.0.0.1:5555 (connection #1)");
        has("stalled", run.out, "last spoke 2026-10-16T00:10:00Z");
        has("stalled", run.out, "STALLED GAME 1 over: no result (amendment M70)");
        has("stalled", run.out, "game 2 began after the abandoned game, as a fresh match: fake-g2");
        has("stalled", run.out, "WAITING for `act: newGame` (--keep-open)");
        has("stalled", run.out, "the client disconnected (--keep-open) -- the session ends here");
        hasNot("stalled", run.out, "ABANDONED");
    }

    /** D286 unchanged: one game, nobody connected -- the session ends and the run fails (gate step 10h). */
    private static void singleGameStillFails() throws InterruptedException {
        final Fake f = new Fake();
        final Run run = play(f, 1, true, 0L, 3L);
        eq("single: the run fails", false, run.r.finished);
        eq("single: nothing is abandoned", 0, f.abandons.size());
        eq("single: no game was started", 0, f.nextGames);
        eq("single: 10h's line", "ABANDONED: no client connected for 3 s, so the session ends; "
                + "--idle-timeout 0 turns this off", run.r.abandoned);
        has("single", run.out, "ABANDONED: no client connected for 3 s, so the session ends");
        eq("single: abandonsStalled(ws, 1)", false, MtgTable.abandonsStalled(true, 1));
        eq("single: abandonsStalled(ws, 6)", true, MtgTable.abandonsStalled(true, 6));
        eq("single: abandonsStalled(console, 6)", false, MtgTable.abandonsStalled(false, 6));
    }

    /** A game the engine has not asked anything in (no input yet) cannot be conceded: the run fails as before. */
    private static void cannotBeConceded() throws InterruptedException {
        refused("unconcedable", f -> f.inputSeen = false,
                "the engine has not asked this seat anything yet, so there is no game to concede");
    }

    /**
     * The three refusals the cloud's review of #155 asked for, each decided
     * BEFORE anything is posted to the EDT: no controller, a game that is already
     * over, a seat that is not one the loop may concede for (a table seat, D403).
     * Each fails a {@code --games N} run exactly as #155's "cannot be conceded"
     * did -- tried once, no next game, no stalled count, ABANDONED in the
     * summary -- with its own reason on the STALLED GAME line; and a single game
     * never asks, keeping D286's failure.
     */
    private static void refusals() throws InterruptedException {
        refused("no controller", f -> f.controlled = false,
                "the seat has no controller, so the game cannot be conceded");
        refused("already over", f -> f.over = true,
                "the game is already over (its `over` is out)");
        refused("wrong seat", f -> f.tableSeat = true,
                "this is a seat at a table of two, where an away player is waited for and only the "
                        + "table concedes for them (D403)");
    }

    private static void refused(final String what, final java.util.function.Consumer<Fake> seat,
                                final String reason) throws InterruptedException {
        final Fake f = new Fake();
        seat.accept(f);
        final Run run = play(f, 3, true, 0L, IDLE);
        eq(what + ": the run fails", false, run.r.finished);
        eq(what + ": it was tried once", 1, f.abandons.size());
        eq(what + ": no game reached `over`", 0, run.r.played);
        eq(what + ": no next game", 0, f.nextGames);
        eq(what + ": no stalled count", 0, run.r.stalled);
        eq(what + ": /health was never told", -1, f.stalledReported);
        eq(what + ": nothing else failed", null, run.r.failure);
        eq(what + ": the summary is #155's", "ABANDONED: game 1 had no client for " + IDLE
                + " s and could not be ended with no result, so the session ends (D448)", run.r.abandoned);
        has(what, run.out, "STALLED GAME 1 (fake-g1): no client connected for 3600 s");
        has(what, run.out, "STALLED GAME 1: not abandoned -- " + reason + "\n");
        hasNot(what, run.out, "no `over` within");
        hasNot(what, run.out, "STALLED GAME 1 over");
        // --games 1: the loop never asks the seat, so its state cannot matter (D286, gate step 10h).
        final Fake g = new Fake();
        seat.accept(g);
        final Run one = play(g, 1, true, 0L, IDLE);
        eq(what + ", single game: the run fails", false, one.r.finished);
        eq(what + ", single game: the seat is not asked", 0, g.abandons.size());
        eq(what + ", single game: 10h's line", "ABANDONED: no client connected for " + IDLE
                + " s, so the session ends; --idle-timeout 0 turns this off", one.r.abandoned);
        hasNot(what + ", single game", one.out, "not abandoned");
    }

    /** {@link WireGuiGame#abandonRefusal} itself: null only when every condition holds, and the first cause wins. */
    private static void refusalReasons() {
        eq("refusal: a game that can be abandoned", null,
                WireGuiGame.abandonRefusal(false, false, true, false, true, true));
        eq("refusal: closed", "the seat is closed",
                WireGuiGame.abandonRefusal(true, false, true, false, true, true));
        eq("refusal: not begun", "the game has not begun (no `hello_ok` yet)",
                WireGuiGame.abandonRefusal(false, false, false, false, false, false));
        eq("refusal: closed comes first", "the seat is closed",
                WireGuiGame.abandonRefusal(true, true, false, true, false, false));
        eq("refusal: the seat before the game", true,
                WireGuiGame.abandonRefusal(false, true, true, true, false, false).startsWith("this is a seat at a table"));
        eq("refusal: over before no input (the reset hook has not run yet)",
                "the game is already over (its `over` is out)",
                WireGuiGame.abandonRefusal(false, false, true, true, false, false));
        eq("refusal: no input before no controller (the controller is read at an input)", true,
                WireGuiGame.abandonRefusal(false, false, true, false, false, false).startsWith("the engine has not asked"));
    }

    /** --game-timeout is the wedged-engine limit, not an absent player: never abandoned. */
    private static void wallClockIsNotIdle() throws InterruptedException {
        final Fake f = new Fake();
        final Run run = play(f, 3, true, 900L, IDLE);
        eq("wall clock: the run fails", false, run.r.finished);
        eq("wall clock: as TIMED OUT, not ABANDONED", null, run.r.abandoned);
        eq("wall clock: nothing is abandoned", 0, f.abandons.size());
    }

    /**
     * Nobody ever comes: game 1 is abandoned at the limit, game 2 begins, game 2
     * is abandoned at the limit, and the match's last `over` is followed by
     * --keep-open's linger as after any other -- then a clean end.
     */
    private static void abandonedLastGameLingers() throws InterruptedException {
        final Fake f = new Fake();
        final Run run = play(f, 2, true, 0L, IDLE);
        eq("last: the session finished", true, run.r.finished);
        eq("last: both games abandoned", 2, run.r.stalled);
        eq("last: /health says 2", 2, f.stalledReported);
        eq("last: game 2 started by the server, game 3 not", 1, f.nextGames);
        eq("last: the second abandonment came a limit after game 2 began", true,
                f.abandonedAt.size() == 2 && f.abandonedAt.get(1) - f.abandonedAt.get(0) >= IDLE * SEC);
        has("last", run.out, "no `newGame` within 30000 ms (--keep-open) and no client is connected");
        hasNot("last", run.out, "ABANDONED");
        // Without --keep-open the session simply ends at the last `over`.
        final Fake g = new Fake();
        final Run r2 = play(g, 2, false, 0L, IDLE);
        eq("last, no keep-open: finished", true, r2.r.finished);
        eq("last, no keep-open: both abandoned", 2, r2.r.stalled);
        hasNot("last, no keep-open", r2.out, "--keep-open");
    }

    /** --transport auto / null / console: no socket, no idle limit, nothing abandoned. */
    private static void noSocketNeverAbandons() throws InterruptedException {
        final Fake f = new Fake().at(7200, Fake.END);
        f.socket = false;
        final Run run = play(f, 3, true, 0L, IDLE);
        eq("no socket: game 1 ended by itself", 1, run.r.played);
        eq("no socket: nothing abandoned", 0, f.abandons.size());
        eq("no socket: no game started by the server", 0, f.nextGames);
        has("no socket", run.out, "no `newGame` after game 1 -- the session ends here");
    }

    // ------------------------------------------------------------------
    // The socket: a real WsTransport, a raw client
    // ------------------------------------------------------------------

    private static final class Seat implements Transport.Inbound {
        @Override public void onAct(final String action, final Map<String, Object> body) { }
        @Override public void onAnswer(final String askId, final String valueJson) { }
        @Override public void onResync() { }
        @Override public void onDisconnect() { }
    }

    private static String frame(final int seq, final String type, final String body) {
        return "{\"v\":1,\"seq\":" + seq + ",\"t\":" + (1000 + seq) + ",\"type\":\"" + type + "\",\"body\":" + body + "}";
    }

    private static void socket() throws Exception {
        final WsTransport ws = new WsTransport(0);
        ws.start(new Seat(), new ReplyPool());
        final int port = ws.port();
        try {
            eq("socket: nobody yet", "no /ws client ever connected to this session", ws.clientLine());
            String[] h = health(port);
            eq("socket: /health before the session", "503", h[0]);
            eq("socket: the header is there before the session", "0", h[2]);

            ws.push(frame(1, "hello_ok", "{\"gameId\":\"stall-g1\"}"));
            h = health(port);
            eq("socket: /health is 200", "200", h[0]);
            eq("socket: its body is still exactly ok", "ok", h[1]);
            eq("socket: no stalled games", "0", h[2]);

            final long before = System.currentTimeMillis();
            try (WsObserveSelfTest.Raw c = new WsObserveSelfTest.Raw(port, "/ws", null)) {
                eq("socket: the client takes the seat", 101, c.status);
                eq("socket: connected", true, waitFor(ws::connected));
                c.sendText("{\"v\":1,\"seq\":0,\"t\":0,\"type\":\"ping\",\"body\":{}}");
                eq("socket: its frame arrived", true, waitFor(() -> ws.framesIn() >= 1));
                final String line = ws.clientLine();
                has("socket, connected", line, "began by /127.0.0.1:");
                has("socket, connected", line, "(connection #1)");
                has("socket, connected", line, "last spoke 20");
                has("socket, connected", line, ", still connected");
            }
            eq("socket: the client left", true, waitFor(() -> !ws.connected()));
            // The channel reads inactive before channelInactive records the leave on the event loop.
            eq("socket: its leave is recorded", true, waitFor(() -> ws.clientLine().contains(", left ")));
            final String line = ws.clientLine();
            has("socket, left", line, "began by /127.0.0.1:");
            has("socket, left", line, "the last client /127.0.0.1:");
            has("socket, left", line, ", left 20");
            hasNot("socket, left", line, "last spoke never");
            final int spoke = line.indexOf("last spoke ") + "last spoke ".length();
            final long spokeMs = java.time.Instant.parse(line.substring(spoke, line.indexOf(',', spoke))).toEpochMilli();
            eq("socket: last spoke is when it spoke", true,
                    spokeMs >= before - 1 && spokeMs <= System.currentTimeMillis());

            // The server begins the next game with nobody there: nobody began it.
            ws.push(frame(2, "hello_ok", "{\"gameId\":\"stall-g2\"}"));
            has("socket, game 2", ws.clientLine(), "no client held the seat during this game");
            has("socket, game 2", ws.clientLine(), "the last client /127.0.0.1:");

            // A client that joins a game nobody began is the one that "began" it.
            try (WsObserveSelfTest.Raw c = new WsObserveSelfTest.Raw(port, "/ws", null)) {
                eq("socket: a second client upgrades", 101, c.status);
                eq("socket: and takes the seat", true, waitFor(ws::connected));
                has("socket, joined", ws.clientLine(), "(connection #2)");
                has("socket, joined", ws.clientLine(), "last spoke never");
                hasNot("socket, joined", ws.clientLine(), "no client held the seat");
            }
            eq("socket: it left too", true, waitFor(() -> !ws.connected()));
            eq("socket: its leave is recorded too", true, waitFor(() -> ws.clientLine().contains(", left ")));

            ws.stalledGames(1);
            h = health(port);
            eq("socket: /health counts one stalled game", "1", h[2]);
            eq("socket: and its body is still exactly ok", "ok", h[1]);
        } finally {
            ws.close();
        }
    }

    /** {@code GET /health}: {status, body, stalled-games header}. */
    private static String[] health(final int port) throws Exception {
        final HttpURLConnection c = (HttpURLConnection) new URI("http://127.0.0.1:" + port + "/health").toURL()
                .openConnection();
        c.setConnectTimeout(3_000);
        c.setReadTimeout(3_000);
        final int status = c.getResponseCode();
        final java.io.InputStream in = status < 400 ? c.getInputStream() : c.getErrorStream();
        final String body = in == null ? "" : new String(in.readAllBytes(), StandardCharsets.US_ASCII);
        final String stalled = c.getHeaderField(WsTransport.STALLED_HEADER);
        c.disconnect();
        return new String[] {String.valueOf(status), body, stalled};
    }

    private static boolean waitFor(final java.util.function.BooleanSupplier cond) throws InterruptedException {
        final long end = System.nanoTime() + 3_000L * 1_000_000L;
        while (System.nanoTime() < end) {
            if (cond.getAsBoolean()) {
                return true;
            }
            Thread.sleep(10);
        }
        return cond.getAsBoolean();
    }

    // ------------------------------------------------------------------

    private static void eq(final String what, final Object expected, final Object actual) {
        checks++;
        final boolean ok = expected == null ? actual == null : expected.equals(actual);
        if (!ok) {
            FAILURES.add(what + ": expected <" + expected + "> got <" + actual + ">");
        }
    }

    private static void has(final String what, final String text, final String needle) {
        checks++;
        if (text == null || !text.contains(needle)) {
            FAILURES.add(what + ": no \"" + needle + "\" in <" + text + ">");
        }
    }

    private static void hasNot(final String what, final String text, final String needle) {
        checks++;
        if (text != null && text.contains(needle)) {
            FAILURES.add(what + ": \"" + needle + "\" should not be in <" + text + ">");
        }
    }
}
