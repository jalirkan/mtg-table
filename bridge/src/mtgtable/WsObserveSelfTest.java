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

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Unit check for amendment <b>M50</b> (D280&ndash;D282): the read-only
 * observer socket and the {@code Origin} allowlist, on a real
 * {@link WsTransport} bound to a free loopback port.
 *
 * <p>No game: the frames are strings this test pushes, because the transport
 * never looks inside one beyond its {@code type}, and a fake
 * {@link Transport.Inbound} counts every call the socket makes into the seat.
 * The clients are raw sockets speaking just enough RFC 6455 to read a server's
 * unmasked frames and send a masked one -- the same bytes a browser sends,
 * {@code Origin} included, which the JDK's own websocket client will not let a
 * caller choose freely.  What is held:
 *
 * <ul>
 *   <li>the allowlist's matcher and its validation, as a table;</li>
 *   <li>a disallowed {@code Origin} is a 403 on both paths, an allowed one and
 *       no header at all are a 101;</li>
 *   <li>an observer that connects before the session exists is sent nothing,
 *       then the session's frames as they are pushed;</li>
 *   <li>an observer never counts as the seat: the seat still connects, a
 *       second {@code /ws} is still refused with 4001, and connecting or
 *       dropping an observer calls neither {@code onResync} nor
 *       {@code onDisconnect};</li>
 *   <li>everything an observer sends -- an act, an answer, a resync, a ping,
 *       garbage, a binary frame -- reaches nothing and is answered by
 *       nothing;</li>
 *   <li>a late observer's catch-up is the cached frames, byte for byte, in
 *       order (with {@code over} in place of {@code input} once a game is
 *       over), and the seat's own verbatim re-deliveries and out-of-band
 *       frames never reach an observer;</li>
 *   <li>an observer that stops reading is dropped once it is
 *       {@link WsTransport#OBSERVER_BACKLOG_BYTES} behind, and the pushes that
 *       drop it return promptly.</li>
 * </ul>
 *
 * <p>It names no thread (the transport's event loop is
 * {@value WsTransport#WS_THREAD_NAME}, already in {@link HeadlessGuiBase}'s
 * set), boots no engine, loads no Forge class and writes nothing.
 */
public final class WsObserveSelfTest {

    private WsObserveSelfTest() { }

    private static int checks;
    private static final List<String> FAILURES = new ArrayList<>();

    /** How long a read waits for a frame that should arrive. */
    private static final int ARRIVE_MS = 3_000;
    /** How long a read waits to be sure a frame does NOT arrive. */
    private static final int SILENT_MS = 400;

    /** The fake seat behind the socket: it counts, and does nothing else. */
    private static final class Seat implements Transport.Inbound {
        final AtomicInteger acts = new AtomicInteger();
        final AtomicInteger answers = new AtomicInteger();
        final AtomicInteger resyncs = new AtomicInteger();
        final AtomicInteger disconnects = new AtomicInteger();

        @Override public void onAct(final String action, final Map<String, Object> body) { acts.incrementAndGet(); }
        @Override public void onAnswer(final String askId, final String valueJson) { answers.incrementAndGet(); }
        @Override public void onResync() { resyncs.incrementAndGet(); }
        @Override public void onDisconnect() { disconnects.incrementAndGet(); }

        String counts() {
            return "acts=" + acts.get() + " answers=" + answers.get() + " resyncs=" + resyncs.get()
                    + " disconnects=" + disconnects.get();
        }
    }

    public static void main(final String[] args) throws Exception {
        allowlist();
        sockets();
        overflow();

        System.out.println("WsObserveSelfTest: " + checks + " check(s), " + FAILURES.size() + " failure(s)");
        for (final String f : FAILURES) {
            System.out.println("  FAIL " + f);
        }
        System.exit(FAILURES.isEmpty() ? 0 : 1);
    }

    // ------------------------------------------------------------------

    private static void allowlist() {
        final List<String> d = WsTransport.validOrigins(WsTransport.DEFAULT_ALLOWED_ORIGINS);
        final Object[][] table = {
            { null, true },                                   // no header: not a browser
            { "http://127.0.0.1:5173", true },                // the dev server
            { "http://127.0.0.1:4173", true },                // vite preview, any port
            { "http://127.0.0.1", true },                     // default port, left out
            { "http://localhost:5173", true },
            { "HTTP://LOCALHOST:5173", true },                // case is not a difference
            { "https://jalirkan.github.io", true },           // ForgeCoach
            { "https://jalirkan.github.io:443", false },      // a browser never writes it
            { "https://evil.github.io", false },
            { "https://jalirkan.github.io.evil.example", false },
            { "http://jalirkan.github.io", false },           // scheme matters
            { "https://127.0.0.1:5173", false },
            { "http://127.0.0.1.evil.example:80", false },
            { "http://127.0.0.1:", false },
            { "http://127.0.0.1:5173x", false },
            { "http://127.0.0.1:123456", false },
            { "http://localhost.evil.example", false },
            { "null", false },                                // file: pages, sandboxed frames
            { "", false },
            { "https://example.com", false },
        };
        for (final Object[] row : table) {
            eq("originAllowed(" + row[0] + ")", row[1], WsTransport.originAllowed((String) row[0], d));
        }
        eq("an empty allowlist still admits no header", true,
                WsTransport.originAllowed(null, Collections.<String>emptyList()));
        eq("an empty allowlist refuses the board's own origin", false,
                WsTransport.originAllowed("http://127.0.0.1:5173", Collections.<String>emptyList()));
        eq("an exact-port entry is exact", false,
                WsTransport.originAllowed("http://127.0.0.1:5174",
                        WsTransport.validOrigins(Arrays.asList("http://127.0.0.1:5173"))));
        for (final String bad : new String[] { "*", "null", "http://x/", "http://x/path", "ftp://x",
                "http://*.example", "x", "http://x:*:*", "https://x:99999999" }) {
            boolean threw = false;
            try {
                WsTransport.validOrigins(Arrays.asList(bad));
            } catch (final IllegalArgumentException e) {
                threw = true;
            }
            eq("validOrigins rejects \"" + bad + "\"", true, threw);
        }
        eq("validOrigins lower-cases", Arrays.asList("https://jalirkan.github.io"),
                WsTransport.validOrigins(Arrays.asList(" HTTPS://Jalirkan.GitHub.io ")));
    }

    // ------------------------------------------------------------------

    private static String frame(final int seq, final String type, final String body) {
        return "{\"v\":1,\"seq\":" + seq + ",\"t\":" + (1000 + seq) + ",\"type\":\"" + type + "\",\"body\":" + body + "}";
    }

    private static void sockets() throws Exception {
        final Seat seat = new Seat();
        final ReplyPool pool = new ReplyPool();
        final WsTransport ws = new WsTransport(0);
        ws.start(seat, pool);
        final int port = ws.port();
        try {
            // -- the Origin door -------------------------------------------
            for (final String path : new String[] { "/ws", "/observe" }) {
                try (Raw r = new Raw(port, path, "https://evil.example")) {
                    eq(path + " from a disallowed Origin is 403", 403, r.status);
                }
            }
            eq("two upgrades refused by Origin", 2L, ws.originRefusals());
            eq("a refused Origin is not a connection", 0L, ws.connects() + ws.observerConnects());

            // -- an observer before the session exists ----------------------
            final Raw early = new Raw(port, "/observe", "https://jalirkan.github.io");
            eq("ForgeCoach's Origin opens /observe", 101, early.status);
            eq("a pre-session observer is sent nothing", null, early.next(SILENT_MS));
            eq("a pre-session observer is not the seat", false, ws.connected());

            final String hello = frame(1, "hello_ok", "{\"gameId\":\"g-selftest\",\"viewer\":1}");
            final String state1 = frame(2, "state", "{\"turn\":1,\"note\":\"café — utf-8\"}");
            final String input1 = frame(3, "input", "{\"prompt\":\"Play a land\"}");
            ws.push(hello);
            ws.push(state1);
            ws.push(input1);
            eq("early observer: hello_ok as pushed", hello, early.next(ARRIVE_MS));
            eq("early observer: state as pushed (UTF-8 intact)", state1, early.next(ARRIVE_MS));
            eq("early observer: input as pushed", input1, early.next(ARRIVE_MS));

            // -- observer sends are dropped in silence ------------------------
            final String[] junk = {
                "{\"v\":1,\"seq\":0,\"t\":0,\"type\":\"act\",\"body\":{\"action\":\"concede\"}}",
                "{\"v\":1,\"seq\":0,\"t\":0,\"type\":\"answer\",\"body\":{\"askId\":\"a1\",\"value\":0}}",
                "{\"v\":1,\"seq\":0,\"t\":0,\"type\":\"resync\",\"body\":{}}",
                "{\"v\":1,\"seq\":0,\"t\":0,\"type\":\"ping\",\"body\":{}}",
                "not json at all",
            };
            for (final String j : junk) {
                early.sendText(j);
            }
            early.sendBinary(new byte[] { 1, 2, 3 });
            eq("an observer's sends are answered by nothing", null, early.next(SILENT_MS));
            eq("an observer's sends reach no seat method", "acts=0 answers=0 resyncs=0 disconnects=0",
                    seat.counts());
            eq("an observer's sends are counted, not read", 6L, ws.observerFramesIn());
            eq("an observer's sends are not the seat's frames", 0L, ws.framesIn());

            // -- the seat is untouched by observers --------------------------
            final Raw seatClient = new Raw(port, "/ws", null);
            eq("/ws with no Origin (a Node tool) is 101", 101, seatClient.status);
            eq("the seat connects with an observer already on", true, waitFor(ws::connected));
            eq("the seat's catch-up: hello_ok", hello, seatClient.next(ARRIVE_MS));
            eq("the seat's catch-up: state", state1, seatClient.next(ARRIVE_MS));
            eq("the seat's connect is its resync (M16)", true, waitFor(() -> seat.resyncs.get() == 1));
            eq("the seat's verbatim re-delivery never reaches an observer", null, early.next(SILENT_MS));

            try (Raw second = new Raw(port, "/ws", "http://localhost:5173")) {
                eq("a second /ws still upgrades (then is refused)", 101, second.status);
                final String n = second.next(ARRIVE_MS);
                eq("a second /ws gets the M13 notice", true, n != null && n.contains("\"seq\":0")
                        && n.contains("Connection refused"));
                eq("a second /ws is closed 4001", "CLOSE:4001", second.next(ARRIVE_MS));
            }
            eq("the refusal is the seat's, not an observer's", 1L, ws.refusals());
            eq("the refused second /ws's notice never reaches an observer", null, early.next(SILENT_MS));

            seatClient.sendText("{\"v\":1,\"seq\":0,\"t\":0,\"type\":\"ping\",\"body\":{}}");
            final String pong = seatClient.next(ARRIVE_MS);
            eq("the seat's ping is answered", true, pong != null && pong.contains("\"pong\""));
            eq("the seat's out-of-band pong never reaches an observer", null, early.next(SILENT_MS));

            // -- a late observer, while the seat plays ------------------------
            final int resyncsBefore = seat.resyncs.get();
            final Raw late = new Raw(port, "/observe", "http://127.0.0.1:5173");
            eq("the board's own Origin opens /observe", 101, late.status);
            eq("late observer catch-up 1: hello_ok, verbatim", hello, late.next(ARRIVE_MS));
            eq("late observer catch-up 2: state, verbatim", state1, late.next(ARRIVE_MS));
            eq("late observer catch-up 3: input, verbatim", input1, late.next(ARRIVE_MS));
            eq("late observer catch-up: nothing more", null, late.next(SILENT_MS));
            eq("an observer's connect is not a resync", resyncsBefore, seat.resyncs.get());
            eq("the seat is still the seat", true, ws.connected());

            final String state2 = frame(4, "state", "{\"turn\":2}");
            ws.push(state2);
            eq("seat gets the next frame", state2, seatClient.next(ARRIVE_MS));
            eq("early observer gets the same bytes", state2, early.next(ARRIVE_MS));
            eq("late observer gets the same bytes", state2, late.next(ARRIVE_MS));

            late.close();
            eq("a dropped observer leaves one watching", true, waitFor(() -> ws.observers() == 1));
            eq("an observer's disconnect is not the seat's", 0, seat.disconnects.get());
            eq("the seat survives an observer leaving", true, ws.connected());

            // -- no seat: observers still follow ------------------------------
            seatClient.close();
            eq("the seat's disconnect is seen", true, waitFor(() -> !ws.connected() && seat.disconnects.get() == 1));
            final String state3 = frame(5, "state", "{\"turn\":3}");
            ws.push(state3);
            eq("with no seat connected an observer still gets frames", state3, early.next(ARRIVE_MS));
            eq("with no seat, the ask timeout is the no-client cap", WsTransport.NO_CLIENT_ASK_TIMEOUT_MS,
                    ws.askTimeoutMs("choose_list"));

            // -- the end of a game, and the next ------------------------------
            final String over = frame(6, "over", "{\"winner\":1}");
            ws.push(over);
            eq("observer gets over", over, early.next(ARRIVE_MS));
            try (Raw after = new Raw(port, "/observe", null)) {
                eq("between games: hello_ok", hello, after.next(ARRIVE_MS));
                eq("between games: last state", state3, after.next(ARRIVE_MS));
                eq("between games: over, not the stale input", over, after.next(ARRIVE_MS));
                eq("between games: nothing more", null, after.next(SILENT_MS));
                final String hello2 = frame(7, "hello_ok", "{\"gameId\":\"g-selftest-2\",\"viewer\":1}");
                ws.push(hello2);
                eq("the next game's hello_ok reaches a waiting observer", hello2, after.next(ARRIVE_MS));
                eq("...and every observer", hello2, early.next(ARRIVE_MS));
            }
            try (Raw fresh = new Raw(port, "/observe", null)) {
                eq("a new game's catch-up starts at its hello_ok", true,
                        String.valueOf(fresh.next(ARRIVE_MS)).contains("g-selftest-2"));
                eq("...then the last state (the new game has pushed none yet)", state3, fresh.next(ARRIVE_MS));
                eq("...and neither the old over nor the old input", null, fresh.next(SILENT_MS));
            }
            early.close();
            eq("observers never moved the seat's counters", "acts=0 answers=0 resyncs=1 disconnects=1",
                    seat.counts());
            eq("observers never touched the reply pool", 0, pool.pending());
        } finally {
            ws.close();
        }
    }

    // ------------------------------------------------------------------

    /** An observer that never reads is dropped, and the game is not held up by it. */
    private static void overflow() throws Exception {
        final Seat seat = new Seat();
        final WsTransport ws = new WsTransport(0);
        ws.start(seat, new ReplyPool());
        try {
            ws.push(frame(1, "hello_ok", "{}"));
            final Raw stuck = new Raw(port(ws), "/observe", null, 4096);
            eq("the stuck observer upgrades", 101, stuck.status);
            eq("the stuck observer is watching", true, waitFor(() -> ws.observers() == 1));
            final char[] pad = new char[64 * 1024];
            Arrays.fill(pad, 'x');
            final String body = "{\"pad\":\"" + new String(pad) + "\"}";
            final int frames = (int) (3 * WsTransport.OBSERVER_BACKLOG_BYTES / pad.length);
            final long t0 = System.nanoTime();
            for (int i = 0; i < frames; i++) {
                ws.push(frame(2 + i, "state", body));
            }
            final long ms = (System.nanoTime() - t0) / 1_000_000L;
            System.out.println("WsObserveSelfTest: " + frames + " pushes ("
                    + (frames * (long) pad.length >> 20) + " MB) past an observer that never reads took "
                    + ms + " ms");
            eq("a stuck observer is dropped", true, waitFor(() -> ws.observerOverflows() == 1));
            eq("...and no longer watched", 0, ws.observers());
            eq(frames + " pushes (" + (frames * (long) pad.length >> 20) + " MB) past a stuck observer take under 5 s ("
                    + ms + " ms)", true, ms < 5_000L);
            eq("the stuck observer's socket is closed", true, stuck.closedWithin(ARRIVE_MS));
            stuck.close();
            eq("a dropped observer is not the seat's disconnect", 0, seat.disconnects.get());
        } finally {
            ws.close();
        }
    }

    private static int port(final WsTransport ws) {
        return ws.port();
    }

    // ------------------------------------------------------------------

    /** Poll a condition for up to {@link #ARRIVE_MS}. */
    private static boolean waitFor(final java.util.function.BooleanSupplier cond) throws InterruptedException {
        final long end = System.nanoTime() + ARRIVE_MS * 1_000_000L;
        while (System.nanoTime() < end) {
            if (cond.getAsBoolean()) {
                return true;
            }
            Thread.sleep(10);
        }
        return cond.getAsBoolean();
    }

    /**
     * A websocket client in raw bytes: an HTTP/1.1 upgrade with a chosen
     * {@code Origin} (or none), then RFC 6455 frames -- the server's read
     * unmasked, ours written masked, as a browser writes them.
     */
    private static final class Raw implements AutoCloseable {
        final Socket s;
        final InputStream in;
        final OutputStream out;
        final int status;

        Raw(final int port, final String path, final String origin) throws IOException {
            this(port, path, origin, 0);
        }

        Raw(final int port, final String path, final String origin, final int rcvBuf) throws IOException {
            s = new Socket();
            if (rcvBuf > 0) {
                s.setReceiveBufferSize(rcvBuf);
            }
            s.connect(new InetSocketAddress("127.0.0.1", port), ARRIVE_MS);
            s.setSoTimeout(ARRIVE_MS);
            in = new BufferedInputStream(s.getInputStream());
            out = s.getOutputStream();
            final StringBuilder req = new StringBuilder()
                    .append("GET ").append(path).append(" HTTP/1.1\r\n")
                    .append("Host: 127.0.0.1:").append(port).append("\r\n")
                    .append("Upgrade: websocket\r\nConnection: Upgrade\r\n")
                    .append("Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n")
                    .append("Sec-WebSocket-Version: 13\r\n");
            if (origin != null) {
                req.append("Origin: ").append(origin).append("\r\n");
            }
            req.append("\r\n");
            out.write(req.toString().getBytes(StandardCharsets.US_ASCII));
            out.flush();
            final ByteArrayOutputStream head = new ByteArrayOutputStream();
            int matched = 0;
            final byte[] crlf2 = { '\r', '\n', '\r', '\n' };
            while (matched < 4) {
                final int b = in.read();
                if (b < 0) {
                    break;
                }
                head.write(b);
                matched = b == crlf2[matched] ? matched + 1 : (b == '\r' ? 1 : 0);
            }
            final String line = head.toString(StandardCharsets.US_ASCII).split("\r\n", 2)[0];
            final String[] parts = line.split(" ");
            status = parts.length > 1 ? Integer.parseInt(parts[1]) : -1;
        }

        /**
         * The next text frame's payload, {@code "CLOSE:<code>"} for a close
         * frame, {@code "BINARY"}, {@code "EOF"}, or {@code null} if nothing
         * arrives within {@code ms}.
         */
        String next(final int ms) throws IOException {
            s.setSoTimeout(ms);
            final int b0;
            try {
                b0 = in.read();
            } catch (final SocketTimeoutException e) {
                return null;
            }
            if (b0 < 0) {
                return "EOF";
            }
            s.setSoTimeout(ARRIVE_MS);
            final int b1 = in.read();
            long len = b1 & 0x7f;
            if (len == 126) {
                len = (in.read() << 8) | in.read();
            } else if (len == 127) {
                len = 0;
                for (int i = 0; i < 8; i++) {
                    len = (len << 8) | in.read();
                }
            }
            final byte[] payload = in.readNBytes((int) len);
            final int op = b0 & 0x0f;
            if (op == 0x8) {
                final int code = payload.length >= 2 ? ((payload[0] & 0xff) << 8) | (payload[1] & 0xff) : 1005;
                return "CLOSE:" + code;
            }
            if (op == 0x2) {
                return "BINARY";
            }
            if (op == 0x9 || op == 0xA) {
                return next(ms);
            }
            return new String(payload, StandardCharsets.UTF_8);
        }

        void sendText(final String text) throws IOException {
            send(0x1, text.getBytes(StandardCharsets.UTF_8));
        }

        void sendBinary(final byte[] data) throws IOException {
            send(0x2, data);
        }

        private void send(final int op, final byte[] data) throws IOException {
            final ByteArrayOutputStream f = new ByteArrayOutputStream();
            f.write(0x80 | op);
            if (data.length < 126) {
                f.write(0x80 | data.length);
            } else {
                f.write(0x80 | 126);
                f.write(data.length >> 8);
                f.write(data.length & 0xff);
            }
            final byte[] mask = { 0x37, 0x1a, 0x5c, 0x02 };
            f.write(mask);
            for (int i = 0; i < data.length; i++) {
                f.write(data[i] ^ mask[i & 3]);
            }
            out.write(f.toByteArray());
            out.flush();
        }

        /** Drain until the server's end closes, or give up after {@code ms}. */
        boolean closedWithin(final int ms) throws IOException {
            final long end = System.nanoTime() + ms * 1_000_000L;
            final byte[] buf = new byte[1 << 16];
            s.setSoTimeout(100);
            while (System.nanoTime() < end) {
                try {
                    if (in.read(buf) < 0) {
                        return true;
                    }
                } catch (final SocketTimeoutException e) {
                    // keep draining
                } catch (final IOException e) {
                    return true;                      // reset by the server: closed
                }
            }
            return false;
        }

        @Override
        public void close() throws IOException {
            s.close();
        }
    }

    // ------------------------------------------------------------------

    private static void eq(final String what, final Object expected, final Object actual) {
        checks++;
        final boolean ok = expected == null ? actual == null : expected.equals(actual);
        if (!ok) {
            FAILURES.add(what + ": expected <" + clip(expected) + "> got <" + clip(actual) + ">");
        }
    }

    private static String clip(final Object o) {
        final String s = String.valueOf(o);
        return s.length() > 160 ? s.substring(0, 160) + "..." : s;
    }
}
