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
// SPDX-License-Identifier: GPL-3.0-or-later
package mtgtable;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * <b>Amendment M59, D402: the table's door, held on every build.</b>  No engine,
 * no Forge class beyond the netty in the jar.
 *
 * <ul>
 *   <li>the pure decisions: a token opens its own seat and no other, a digest is
 *       64 lower-case hex, the {@code Origin} rule (absent, the allowlist, a
 *       {@code --table-origin}, the request's own host name on any port over
 *       http or https -- and nothing else), the wrong-token limit's key (a
 *       loopback peer's {@code CF-Connecting-IP}, never a remote one's), the
 *       seats file (exactly two names and two digests, nothing else);</li>
 *   <li>a real {@link TableServer} on free loopback ports with two
 *       {@link WsTransport#tableSeat}s: the health port's {@code /health} 503
 *       until both seats have a {@code hello_ok}, then 200, and nothing else
 *       there; the table port serves {@code /ws} only ({@code /health},
 *       {@code /observe} and every other path 404); <b>no token, a wrong token,
 *       the other seat's prefix -- 403 from loopback</b>, before any handshake
 *       (no loopback exemption); a foreign {@code Origin} 403 with a valid token;
 *       each seat's
 *       token opens that seat and its catch-up is that seat's cached frames
 *       (the {@code table} frame among them); a second connection with the same
 *       token replaces the first, which is closed {@value WsTransport#REPLACED_CLOSE_CODE};
 *       ten wrong tokens from one tunnelled address and the eleventh is 429 while
 *       another address is not; a table seat's ask never times out, connected or
 *       not.</li>
 * </ul>
 */
public final class TableSelfTest {

    private TableSelfTest() { }

    private static int checks;
    private static final List<String> FAILURES = new ArrayList<>();
    private static final int TIMEOUT_MS = 3_000;

    private static final String T0 = "Seat0TokenAbcdefghijkl";
    private static final String T1 = "Seat1TokenMnopqrstuvwx";

    private static final class Inbound implements Transport.Inbound {
        final AtomicInteger resyncs = new AtomicInteger();
        final AtomicInteger disconnects = new AtomicInteger();

        @Override public void onAct(final String action, final Map<String, Object> body) { }
        @Override public void onAnswer(final String askId, final String valueJson) { }
        @Override public void onResync() { resyncs.incrementAndGet(); }
        @Override public void onDisconnect() { disconnects.incrementAndGet(); }
    }

    public static void main(final String[] args) throws Exception {
        pure(args.length > 0 ? new File(args[0]) : null);
        live();
        System.out.println("TableSelfTest: " + checks + " check(s), " + FAILURES.size() + " failure(s)");
        for (final String f : FAILURES) {
            System.out.println("  FAIL " + f);
        }
        System.exit(FAILURES.isEmpty() ? 0 : 1);
    }

    private static String hex(final byte[] b) {
        final StringBuilder sb = new StringBuilder();
        for (final byte x : b) {
            sb.append(Character.forDigit((x >> 4) & 0xf, 16)).append(Character.forDigit(x & 0xf, 16));
        }
        return sb.toString();
    }

    private static void pure(final File scratch) throws IOException {
        final byte[][] d = {TableServer.digest(T0), TableServer.digest(T1)};
        eq("seatFor: seat 0's token", 0, TableServer.seatFor(T0, d));
        eq("seatFor: seat 1's token", 1, TableServer.seatFor(T1, d));
        eq("seatFor: none", -1, TableServer.seatFor(null, d));
        eq("seatFor: empty", -1, TableServer.seatFor("", d));
        eq("seatFor: one character off", -1, TableServer.seatFor("Seat0TokenAbcdefghijkm", d));
        eq("seatFor: a prefix", -1, TableServer.seatFor("Seat0Token", d));
        eq("seatFor: the digest itself is not the token", -1, TableServer.seatFor(hex(d[0]), d));
        eq("hexDigest round-trips", true, java.util.Arrays.equals(d[1], TableServer.hexDigest(hex(d[1]))));
        for (final String bad : new String[] {"", "abc", hex(d[0]).toUpperCase(), hex(d[0]) + "0", "z".repeat(64)}) {
            eq("hexDigest refuses \"" + (bad.length() > 12 ? bad.substring(0, 12) + "…" : bad) + "\"", true, refused(() -> TableServer.hexDigest(bad)));
        }
        final List<String> allow = WsTransport.DEFAULT_ALLOWED_ORIGINS;
        final List<String> extra = TableServer.tableOrigins(List.of("https://table.example.org"));
        //               origin                               Host                         ok
        final Object[][] o = {
            { null,                                  "192.168.1.5:8646",           true },
            { "https://jalirkan.github.io",          "127.0.0.1:8646",             true },
            { "http://127.0.0.1:5173",               "127.0.0.1:8646",             true },
            { "http://192.168.1.5:8644",             "192.168.1.5:8646",           true },
            { "https://192.168.1.5",                 "192.168.1.5:8646",           true },
            { "https://table.example.org",           "127.0.0.1:8646",             true },
            // A tunnel (D405): one hostname, path-routed; cloudflared passes the page's Host through.
            { "https://play.example.com",            "play.example.com",           true },
            { "https://play.example.com",            "play.example.com:443",       true },
            // Tailscale Funnel (D409): tailscaled keeps the Host it was asked for, https on 443.
            { "https://pc.tail1234.ts.net",          "pc.tail1234.ts.net",         true },
            { "https://other.tail1234.ts.net",       "pc.tail1234.ts.net",         false },
            { "https://evil.example.com",            "play.example.com",           false },
            // The draft room's /ws proxy (D404) keeps the page's Host.
            { "http://192.168.1.5:8644",             "192.168.1.5:8644",           true },
            { "https://friend.example.org",          "table.example.org",          false },
            { "http://evil.example",                 "192.168.1.5:8646",           false },
            { "http://192.168.1.50:8644",            "192.168.1.5:8646",           false },
            { "null",                                "192.168.1.5:8646",           false },
            { "ftp://192.168.1.5",                   "192.168.1.5:8646",           false },
            { "http://192.168.1.5:8644",             null,                         false },
        };
        for (final Object[] r : o) {
            eq("originOk " + r[0] + " / Host " + r[1], r[2], TableServer.originOk((String) r[0], (String) r[1], allow, extra));
        }
        eq("tableOrigins refuses a path", true, refused(() -> TableServer.tableOrigins(List.of("https://x.org/a"))));
        eq("limitKey: a remote peer is its address", "203.0.113.7", TableServer.limitKey(false, "203.0.113.7", "198.51.100.1"));
        eq("limitKey: loopback with CF-Connecting-IP", "cf:198.51.100.1", TableServer.limitKey(true, "127.0.0.1", "198.51.100.1"));
        eq("limitKey: loopback without it", "127.0.0.1", TableServer.limitKey(true, "127.0.0.1", null));
        eq("limitKey: a malformed header is ignored", "127.0.0.1", TableServer.limitKey(true, "127.0.0.1", "x; rm"));
        eq("checkName: a name", "Sam", TableMatch.checkName(" Sam "));
        eq("checkName: too long", true, refused(() -> TableMatch.checkName("x".repeat(25))));
        eq("checkName: a control character", true, refused(() -> TableMatch.checkName("a\nb")));
        eq("distinctNames: two Sams", "sam (2)", TableMatch.distinctNames("Sam", "sam")[1]);
        eq("distinctNames: two names", "Ana", TableMatch.distinctNames("Ben", "Ana")[1]);
        eq("a server refuses two seats with one token", true, refused(() -> new TableServer(0, 0, false, allow, List.of(),
                new byte[][] {d[0], d[0]}, new WsTransport[] {WsTransport.tableSeat(0), WsTransport.tableSeat(1)})));
        if (scratch != null) {
            Files.createDirectories(scratch.toPath());
            final File good = new File(scratch, "seats.json");
            Files.write(good.toPath(), ("{\"names\":[\"Ana\",\"Ben\"],\"tokenSha256\":[\"" + hex(d[0]) + "\",\"" + hex(d[1])
                    + "\"]}").getBytes(StandardCharsets.UTF_8));
            final TableMatch.SeatsFile sf = TableMatch.readSeatsFile(good);
            eq("seats file: names", "Ana,Ben", sf.names[0] + "," + sf.names[1]);
            eq("seats file: digests", true, java.util.Arrays.equals(sf.digests[1], d[1]));
            for (final String bad : new String[] {
                "{\"names\":[\"Ana\"],\"tokenSha256\":[\"" + hex(d[0]) + "\"]}",
                "{\"names\":[\"Ana\",\"Ben\"],\"tokenSha256\":[\"" + hex(d[0]) + "\",\"" + hex(d[1]) + "\"],\"tokens\":[\"" + T0 + "\"]}",
                "{\"names\":[\"Ana\",\"\"],\"tokenSha256\":[\"" + hex(d[0]) + "\",\"" + hex(d[1]) + "\"]}",
                "[1,2]",
            }) {
                final File f = new File(scratch, "bad.json");
                Files.write(f.toPath(), bad.getBytes(StandardCharsets.UTF_8));
                eq("seats file refused: " + bad.substring(0, Math.min(40, bad.length())), true, refused(() -> TableMatch.readSeatsFile(f)));
            }
        }
    }

    private interface Body {
        void run() throws Exception;
    }

    private static boolean refused(final Body b) {
        try {
            b.run();
            return false;
        } catch (final Exception e) {
            return true;
        }
    }

    private static final String HELLO0 = "{\"v\":1,\"seq\":1,\"t\":1,\"type\":\"hello_ok\",\"body\":{\"you\":0}}";
    private static final String HELLO1 = "{\"v\":1,\"seq\":1,\"t\":1,\"type\":\"hello_ok\",\"body\":{\"you\":1}}";
    private static final String TABLE1 = "{\"v\":1,\"seq\":3,\"t\":1,\"type\":\"table\",\"body\":{\"you\":1}}";

    private static void live() throws Exception {
        final WsTransport s0 = WsTransport.tableSeat(0);
        final WsTransport s1 = WsTransport.tableSeat(1);
        final Inbound in0 = new Inbound();
        final Inbound in1 = new Inbound();
        s0.start(in0, new ReplyPool());
        s1.start(in1, new ReplyPool());
        // The health listener (the bridge's own wsPort) needs a port of its own; find a free one.
        final int hp;
        try (java.net.ServerSocket probe = new java.net.ServerSocket(0)) {
            hp = probe.getLocalPort();
        }
        final TableServer srv = new TableServer(0, hp, false, WsTransport.DEFAULT_ALLOWED_ORIGINS, List.of(),
                new byte[][] {TableServer.digest(T0), TableServer.digest(T1)}, new WsTransport[] {s0, s1});
        final TableServer withHealth = srv;
        srv.start();
        final int p = srv.port();
        try {
            eq("a table seat's ask never times out (no client)", 0L, s0.askTimeoutMs("confirm"));
            eq("health before the seats exist", 503, request(hp, "/health", null, null).status);
            s0.push(HELLO0);
            eq("health with one seat", 503, request(hp, "/health", null, null).status);
            s1.push(HELLO1);
            s1.push(TABLE1);
            eq("health with both seats", 200, request(hp, "/health", null, null).status);
            eq("the health port opens no seat", 404, upgrade(hp, "/ws?seat=" + T0, null, null, null).status);
            eq("the health port has no observers", 404, upgrade(hp, "/observe", null, null, null).status);
            eq("the table port serves /ws only: no /health", 404, request(p, "/health", null, null).status);
            eq("no token, from loopback", 403, upgrade(p, "/ws", null, null, null).status);
            eq("a wrong token, from loopback", 403, upgrade(p, "/ws?seat=Seat0TokenAbcdefghijkm", null, null, null).status);
            eq("the pairing-token parameter is not a seat token", 403, upgrade(p, "/ws?token=" + T0, null, null, null).status);
            eq("/observe at a table of two: not found", 404, upgrade(p, "/observe?seat=" + T0, null, null, null).status);
            eq("another path", 404, request(p, "/", null, null).status);
            eq("a foreign Origin with a valid token", 403, upgrade(p, "/ws?seat=" + T0, "http://evil.example", null, null).status);

            final Ws a = upgrade(p, "/ws?seat=" + T1, "http://localhost:8644", null, null);
            eq("seat 1's token opens a socket", 101, a.status);
            eq("its catch-up starts with seat 1's hello_ok", HELLO1, a.text());
            eq("then the table frame, verbatim", TABLE1, a.text());
            Thread.sleep(150);   // resend writes the frames, then calls onResync, on the event loop
            eq("seat 1 is connected", true, s1.connected());
            eq("seat 0 is not", false, s0.connected());
            eq("seat 1's resync ran on connect", 1, in1.resyncs.get());

            final Ws b = upgrade(p, "/ws?seat=" + T1, null, null, null);
            eq("a second socket with seat 1's token opens", 101, b.status);
            eq("it is caught up too", HELLO1, b.text());
            final String notice = a.text();
            eq("the first is told it was replaced", true, notice != null && notice.contains("Connection replaced"));
            eq("and closed " + WsTransport.REPLACED_CLOSE_CODE, WsTransport.REPLACED_CLOSE_CODE, a.closeCode());
            Thread.sleep(200);
            eq("seat 1 is still connected (on the newer socket)", true, s1.connected());
            eq("the replaced socket's close is not a disconnect", 0, in1.disconnects.get());
            eq("one takeover counted", 1L, s1.takeovers());
            eq("a table seat's ask never times out (connected)", 0L, s1.askTimeoutMs("confirm"));
            b.close();
            Thread.sleep(300);
            eq("closing the newer one is the disconnect", 1, in1.disconnects.get());
            eq("seat 1 is away", false, s1.connected());

            final Ws c = upgrade(p, "/ws?seat=" + T0, null, null, null);
            eq("seat 0's token opens seat 0", 101, c.status);
            eq("with seat 0's hello_ok", HELLO0, c.text());
            c.close();

            for (int i = 0; i < TableServer.MAX_FAILURES_PER_MINUTE; i++) {
                upgrade(p, "/ws?seat=wrong" + i, null, null, "198.51.100.23");
            }
            eq("the eleventh wrong token from one tunnelled address", 429,
                    upgrade(p, "/ws?seat=wrong", null, null, "198.51.100.23").status);
            eq("even with the right token, for the rest of the minute", 429,
                    upgrade(p, "/ws?seat=" + T0, null, null, "198.51.100.23").status);
            eq("another tunnelled address is not limited", 101, upgrade(p, "/ws?seat=" + T0, null, null, "198.51.100.24").status);
            eq("the counts: refusals", true, srv.tokenRefusals() >= TableServer.MAX_FAILURES_PER_MINUTE + 3);
            eq("the counts: rate-limited", 2L, srv.limited());
            eq("the counts: observers refused", 1L, srv.observeRefusals());
        } finally {
            withHealth.close();
            s0.close();
            s1.close();
        }
    }

    // ------------------------------------------------------------------

    private static final class Resp {
        int status;
    }

    private static Resp request(final int port, final String target, final String origin, final String cf) throws IOException {
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress("127.0.0.1", port), TIMEOUT_MS);
            s.setSoTimeout(TIMEOUT_MS);
            final StringBuilder req = new StringBuilder("GET ").append(target).append(" HTTP/1.1\r\nHost: 127.0.0.1:")
                    .append(port).append("\r\nConnection: close\r\n");
            if (origin != null) {
                req.append("Origin: ").append(origin).append("\r\n");
            }
            if (cf != null) {
                req.append("CF-Connecting-IP: ").append(cf).append("\r\n");
            }
            s.getOutputStream().write(req.append("\r\n").toString().getBytes(StandardCharsets.US_ASCII));
            final Resp r = new Resp();
            r.status = status(new BufferedInputStream(s.getInputStream()));
            return r;
        }
    }

    /** An open websocket from a raw socket: the upgrade's status, then text frames and a close code. */
    private static final class Ws {
        Socket s;
        InputStream in;
        int status;
        int close = -1;

        String text() throws IOException {
            while (true) {
                final int b0 = in.read();
                if (b0 < 0) {
                    return null;
                }
                int len = in.read() & 0x7f;
                if (len == 126) {
                    len = (in.read() << 8) | in.read();
                } else if (len == 127) {
                    long l = 0;
                    for (int i = 0; i < 8; i++) {
                        l = (l << 8) | in.read();
                    }
                    len = (int) l;
                }
                final byte[] payload = in.readNBytes(len);
                final int op = b0 & 0x0f;
                if (op == 0x1) {
                    return new String(payload, StandardCharsets.UTF_8);
                }
                if (op == 0x8) {
                    close = payload.length >= 2 ? ((payload[0] & 0xff) << 8) | (payload[1] & 0xff) : 1005;
                    return null;
                }
            }
        }

        int closeCode() throws IOException {
            while (close < 0) {
                if (text() == null && close < 0) {
                    return -1;
                }
            }
            return close;
        }

        void close() throws IOException {
            s.close();
        }
    }

    private static Ws upgrade(final int port, final String target, final String origin, final String host,
                              final String cf) throws IOException {
        final Ws w = new Ws();
        w.s = new Socket();
        w.s.connect(new InetSocketAddress("127.0.0.1", port), TIMEOUT_MS);
        w.s.setSoTimeout(TIMEOUT_MS);
        final StringBuilder req = new StringBuilder("GET ").append(target).append(" HTTP/1.1\r\n")
                .append("Host: ").append(host != null ? host : "127.0.0.1:" + port).append("\r\n")
                .append("Upgrade: websocket\r\nConnection: Upgrade\r\n")
                .append("Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n");
        if (origin != null) {
            req.append("Origin: ").append(origin).append("\r\n");
        }
        if (cf != null) {
            req.append("CF-Connecting-IP: ").append(cf).append("\r\n");
        }
        w.s.getOutputStream().write(req.append("\r\n").toString().getBytes(StandardCharsets.US_ASCII));
        w.s.getOutputStream().flush();
        w.in = new BufferedInputStream(w.s.getInputStream());
        w.status = status(w.in);
        if (w.status != 101) {
            w.s.close();
        }
        return w;
    }

    /** Read a response head; its status. */
    private static int status(final InputStream in) throws IOException {
        final ByteArrayOutputStream head = new ByteArrayOutputStream();
        int matched = 0;
        final byte[] crlf2 = {'\r', '\n', '\r', '\n'};
        while (matched < 4) {
            final int b = in.read();
            if (b < 0) {
                break;
            }
            head.write(b);
            matched = b == crlf2[matched] ? matched + 1 : (b == '\r' ? 1 : 0);
        }
        final String[] parts = head.toString(StandardCharsets.US_ASCII).split("\r\n")[0].split(" ");
        return parts.length > 1 ? Integer.parseInt(parts[1]) : -1;
    }

    private static void eq(final String what, final Object expected, final Object actual) {
        checks++;
        final boolean ok = expected == null ? actual == null : expected.equals(actual);
        if (!ok) {
            FAILURES.add(what + ": expected <" + expected + "> got <" + actual + ">");
        }
    }
}
