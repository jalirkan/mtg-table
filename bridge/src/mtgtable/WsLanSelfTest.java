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
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Stream;

/**
 * Unit check for amendment <b>M51</b> (D287&ndash;D289): LAN play's pairing
 * token, the static site and the same-origin rule, on real
 * {@link WsTransport}s bound to free ports.
 *
 * <p>A phone is played from 127.0.0.1: the transport's {@code loopback}
 * predicate is swapped for one that calls every peer remote, which is the one
 * thing that differs between the desktop's own browser and a phone on the
 * same network.  A second server keeps the real predicate and holds the
 * other half -- a loopback peer needs no token, and the same-origin rule is
 * never applied to it.  What is held:
 *
 * <ul>
 *   <li>the pure decisions, as tables: the token compare, the gate, the
 *       same-origin rule, the site's path resolution and its content types;</li>
 *   <li>a LAN server binds every interface, and a plain one still binds
 *       loopback;</li>
 *   <li>a remote peer without the token gets 403 for the page, an asset,
 *       {@code /health}, {@code /ws} and {@code /observe}; with it in the query
 *       the page is served and hands back the cookie, the cookie admits the
 *       page's assets, and the cookie alone never opens a socket;</li>
 *   <li>content types, {@code Cache-Control: no-cache} on {@code index.html},
 *       a {@code .jsonl.gz} served byte for byte as
 *       {@code application/octet-stream} with no {@code Content-Encoding},
 *       {@code HEAD}, 405 for anything but {@code GET}/{@code HEAD}, 404 for a
 *       missing file or a directory;</li>
 *   <li>every traversal spelling -- {@code ..}, {@code %2e%2e}, an encoded
 *       slash, a backslash, a NUL, a double slash, a symlink out of the root --
 *       is refused and never returns the file outside the root;</li>
 *   <li>on a remote peer an {@code Origin} of {@code http://<Host>} opens the
 *       socket and a mismatched one does not; on a loopback peer the same pair
 *       is refused (DNS rebinding), and M50's allowlist is unchanged.</li>
 * </ul>
 *
 * <p>It boots no engine and loads no Forge class (netty is all it uses).  It
 * writes a scratch site under the directory it is given, inside {@code var/}.
 */
public final class WsLanSelfTest {

    private WsLanSelfTest() { }

    private static int checks;
    private static final List<String> FAILURES = new ArrayList<>();

    private static final int TIMEOUT_MS = 3_000;
    private static final String TOKEN = "Abcdefghijklmnopqrstuv";      // 22 url-safe chars, like newToken()
    private static final String SECRET = "the file outside the site";

    private static final class NoSeat implements Transport.Inbound {
        @Override public void onAct(final String action, final Map<String, Object> body) { }
        @Override public void onAnswer(final String askId, final String valueJson) { }
        @Override public void onResync() { }
        @Override public void onDisconnect() { }
    }

    public static void main(final String[] args) throws Exception {
        if (args.length != 1) {
            throw new IllegalArgumentException("usage: WsLanSelfTest <scratch dir under var/>");
        }
        final Path scratch = Paths.get(args[0]).toAbsolutePath();
        final Path site = makeSite(scratch);

        tables(site);
        remote(site);
        local(site);

        System.out.println("WsLanSelfTest: " + checks + " check(s), " + FAILURES.size() + " failure(s)");
        for (final String f : FAILURES) {
            System.out.println("  FAIL " + f);
        }
        System.exit(FAILURES.isEmpty() ? 0 : 1);
    }

    /** A site the shape of ForgeCoach's build, a file beside it that must never be served, and a link out. */
    private static Path makeSite(final Path scratch) throws IOException {
        if (Files.exists(scratch)) {
            try (Stream<Path> w = Files.walk(scratch)) {
                for (final Path p : (Iterable<Path>) w.sorted(Comparator.reverseOrder())::iterator) {
                    Files.delete(p);
                }
            }
        }
        final Path site = scratch.resolve("site");
        Files.createDirectories(site.resolve("assets"));
        Files.createDirectories(site.resolve("samples"));
        Files.write(scratch.resolve("secret.txt"), SECRET.getBytes(StandardCharsets.UTF_8));
        Files.write(site.resolve("index.html"), "<!doctype html><title>t</title>".getBytes(StandardCharsets.UTF_8));
        Files.write(site.resolve("assets/index-abc.js"), "console.log(1)".getBytes(StandardCharsets.UTF_8));
        Files.write(site.resolve("assets/index-abc.css"), "body{}".getBytes(StandardCharsets.UTF_8));
        Files.write(site.resolve("assets/data.json"), "{}".getBytes(StandardCharsets.UTF_8));
        Files.write(site.resolve("assets/icon.svg"), "<svg/>".getBytes(StandardCharsets.UTF_8));
        Files.write(site.resolve("assets/icon.png"), new byte[] { (byte) 0x89, 'P', 'N', 'G' });
        Files.write(site.resolve("samples/g.jsonl.gz"), gz());
        try {
            Files.createSymbolicLink(site.resolve("escape.txt"), Paths.get("../secret.txt"));
        } catch (final UnsupportedOperationException | IOException e) {
            System.out.println("WsLanSelfTest: no symlinks here (" + e + "); the link case is skipped");
        }
        return site;
    }

    /** The two-byte gzip magic and some binary -- opaque bytes to the server. */
    private static byte[] gz() {
        final byte[] b = new byte[300];
        b[0] = 0x1f;
        b[1] = (byte) 0x8b;
        for (int i = 2; i < b.length; i++) {
            b[i] = (byte) (i * 37);
        }
        return b;
    }

    // ------------------------------------------------------------------

    private static void tables(final Path site) throws IOException {
        final String t = WsTransport.newToken();
        eq("newToken is 22 url-safe characters", true, t.matches("^[A-Za-z0-9_-]{22}$"));
        eq("newToken is fresh each time", false, t.equals(WsTransport.newToken()));

        eq("tokenMatches: the token", true, WsTransport.tokenMatches(TOKEN, TOKEN));
        eq("tokenMatches: one character off", false, WsTransport.tokenMatches("Abcdefghijklmnopqrstuw", TOKEN));
        eq("tokenMatches: a prefix", false, WsTransport.tokenMatches("Abcdefghij", TOKEN));
        eq("tokenMatches: longer", false, WsTransport.tokenMatches(TOKEN + "x", TOKEN));
        eq("tokenMatches: empty", false, WsTransport.tokenMatches("", TOKEN));
        eq("tokenMatches: none", false, WsTransport.tokenMatches(null, TOKEN));

        //                loopback socket  query   cookie  token   admitted
        final Object[][] gate = {
            { "not a LAN server",          false, true,  null,  null,  null,  true },
            { "loopback, no token",        true,  true,  null,  null,  TOKEN, true },
            { "loopback page, no token",   true,  false, null,  null,  TOKEN, true },
            { "remote page, no token",     false, false, null,  null,  TOKEN, false },
            { "remote page, query",        false, false, TOKEN, null,  TOKEN, true },
            { "remote page, wrong query",  false, false, "x",   null,  TOKEN, false },
            { "remote asset, cookie",      false, false, null,  TOKEN, TOKEN, true },
            { "remote asset, wrong cookie", false, false, null, "x",   TOKEN, false },
            { "remote socket, query",      false, true,  TOKEN, null,  TOKEN, true },
            { "remote socket, cookie only", false, true, null,  TOKEN, TOKEN, false },
            { "remote socket, nothing",    false, true,  null,  null,  TOKEN, false },
        };
        for (final Object[] r : gate) {
            eq("lanAdmits: " + r[0], r[6], WsTransport.lanAdmits((Boolean) r[1], (Boolean) r[2],
                    (String) r[3], (String) r[4], (String) r[5]));
        }
        eq("queryToken reads ?token=", TOKEN, WsTransport.queryToken("/?a=1&token=" + TOKEN));
        eq("queryToken: none", null, WsTransport.queryToken("/ws"));
        eq("cookieToken reads the cookie", TOKEN,
                WsTransport.cookieToken("a=b; " + WsTransport.TOKEN_COOKIE + "=" + TOKEN));
        eq("cookieToken: another cookie", null, WsTransport.cookieToken("token=" + TOKEN));
        eq("cookieToken: none", null, WsTransport.cookieToken(null));

        final Object[][] same = {
            { "http://192.168.1.50:8642", "192.168.1.50:8642", true },
            { "HTTP://192.168.1.50:8642", "192.168.1.50:8642", true },
            { "http://192.168.1.50:8642", "192.168.1.51:8642", false },
            { "http://192.168.1.50:8643", "192.168.1.50:8642", false },
            { "https://192.168.1.50:8642", "192.168.1.50:8642", false },
            { "http://192.168.1.50", "192.168.1.50", true },
            { "http://evil.example:8642", "192.168.1.50:8642", false },
            { "http://a/b", "a/b", false },
            { "null", "null", false },
            { null, "192.168.1.50:8642", false },
            { "http://192.168.1.50:8642", null, false },
        };
        for (final Object[] r : same) {
            eq("sameOrigin(" + r[0] + ", Host " + r[1] + ")", r[2], WsTransport.sameOrigin((String) r[0], (String) r[1]));
        }

        final Path root = site.toRealPath();
        eq("sitePath: / is index.html", root.resolve("index.html"), WsTransport.sitePath(root, "/"));
        eq("sitePath: an asset", root.resolve("assets/index-abc.js"), WsTransport.sitePath(root, "/assets/index-abc.js"));
        for (final String bad : new String[] { "/../secret.txt", "/assets/../../secret.txt", "/assets/../index.html",
                "/./index.html", "//etc/passwd", "/..", "/a\\..\\b", "/index.html\0.js", "", "index.html",
                "/assets/..", }) {
            eq("sitePath refuses \"" + bad.replace("\0", "\\0") + "\"", null, WsTransport.sitePath(root, bad));
        }

        final String[][] types = {
            { "index.html", "text/html; charset=utf-8" },
            { "a.js", "text/javascript; charset=utf-8" },
            { "a.css", "text/css; charset=utf-8" },
            { "a.json", "application/json" },
            { "a.svg", "image/svg+xml" },
            { "a.png", "image/png" },
            { "g.jsonl.gz", "application/octet-stream" },
            { "README", "application/octet-stream" },
            { "A.HTML", "text/html; charset=utf-8" },
        };
        for (final String[] r : types) {
            eq("contentType(" + r[0] + ")", r[1], WsTransport.contentType(r[0]));
        }
    }

    // ------------------------------------------------------------------

    /** Every peer remote: the phone. */
    private static void remote(final Path site) throws Exception {
        final WsTransport ws = new WsTransport(0, WsTransport.DEFAULT_ALLOWED_ORIGINS, TOKEN, site);
        ws.loopback = a -> false;
        ws.start(new NoSeat(), new ReplyPool());
        final int port = ws.port();
        final String q = "?token=" + TOKEN;
        final String cookie = WsTransport.TOKEN_COOKIE + "=" + TOKEN;
        try {
            // 0.0.0.0 on an IPv4-only host, 0:0:0:0:0:0:0:0 where the JVM binds dual-stack (CI).
            eq("a LAN server binds every interface", true,
                    java.net.InetAddress.getByName(ws.boundHost()).isAnyLocalAddress());

            // -- the token ---------------------------------------------------
            eq("remote: the page without the token is 403", 403, get(port, "/", null).status);
            eq("remote: the page with a wrong token is 403", 403, get(port, "/?token=nope", null).status);
            eq("remote: an asset without the token is 403", 403, get(port, "/assets/index-abc.js", null).status);
            eq("remote: /health without the token is 403", 403, get(port, "/health", null).status);
            final Resp page = get(port, "/" + q, null);
            eq("remote: the page with the token is 200", 200, page.status);
            eq("remote: index.html is text/html", "text/html; charset=utf-8", page.header("content-type"));
            eq("remote: index.html is no-cache", "no-cache", page.header("cache-control"));
            eq("remote: index.html sends no Referer onward", "no-referrer", page.header("referrer-policy"));
            final String set = String.valueOf(page.header("set-cookie"));
            eq("remote: the page hands back the cookie", true, set.startsWith(cookie + ";")
                    && set.contains("HttpOnly") && set.contains("SameSite=Strict"));
            eq("remote: the cookie admits an asset", 200, get(port, "/assets/index-abc.js", cookie).status);
            eq("remote: a wrong cookie does not", 403,
                    get(port, "/assets/index-abc.js", WsTransport.TOKEN_COOKIE + "=nope").status);
            eq("remote: /health with the token answers (503: no session)", 503, get(port, "/health" + q, null).status);
            final Resp asset = get(port, "/assets/index-abc.js", cookie);
            eq("remote: an asset hands back no cookie", null, asset.header("set-cookie"));

            // -- content types and the samples ------------------------------
            final String[][] types = {
                { "/assets/index-abc.js", "text/javascript; charset=utf-8" },
                { "/assets/index-abc.css", "text/css; charset=utf-8" },
                { "/assets/data.json", "application/json" },
                { "/assets/icon.svg", "image/svg+xml" },
                { "/assets/icon.png", "image/png" },
                { "/index.html", "text/html; charset=utf-8" },
            };
            for (final String[] r : types) {
                final Resp res = get(port, r[0], cookie);
                eq(r[0] + " is 200", 200, res.status);
                eq(r[0] + " is " + r[1], r[1], res.header("content-type"));
                eq(r[0] + " says nosniff", "nosniff", res.header("x-content-type-options"));
            }
            final Resp sample = get(port, "/samples/g.jsonl.gz", cookie);
            eq("a .jsonl.gz is 200", 200, sample.status);
            eq("a .jsonl.gz is application/octet-stream", "application/octet-stream", sample.header("content-type"));
            eq("a .jsonl.gz carries no Content-Encoding", null, sample.header("content-encoding"));
            eq("a .jsonl.gz is served byte for byte", true, Arrays.equals(gz(), sample.body));

            final Resp head = request(port, "HEAD", "/" + q, null, null, null);
            eq("HEAD / is 200", 200, head.status);
            eq("HEAD / says the length", String.valueOf(Files.size(site.resolve("index.html"))),
                    head.header("content-length"));
            eq("HEAD / has no body", 0, head.body.length);
            final Resp post = request(port, "POST", "/" + q, null, null, null);
            eq("POST / is 405", 405, post.status);
            eq("405 says GET, HEAD", "GET, HEAD", post.header("allow"));
            eq("a missing file is 404", 404, get(port, "/nope.js" + q, null).status);
            eq("a directory is 404 (no listing)", 404, get(port, "/assets/" + q, null).status);
            eq("a directory without a slash is 404", 404, get(port, "/assets" + q, null).status);

            // -- traversal ----------------------------------------------------
            for (final String bad : new String[] { "/../secret.txt", "/%2e%2e/secret.txt", "/%2E%2E/secret.txt",
                    "/assets/..%2f..%2fsecret.txt", "/assets/%2e%2e%2f%2e%2e%2fsecret.txt", "/..%5csecret.txt",
                    "//etc/passwd", "/%2fetc/passwd", "/index.html%00.js", "/assets/../../secret.txt" }) {
                final Resp r = get(port, bad + (bad.contains("?") ? "&" : "?") + "token=" + TOKEN, null);
                eq("traversal " + bad + " is refused", true, r.status == 403 || r.status == 404 || r.status == 400);
                eq("traversal " + bad + " never returns the secret", false,
                        new String(r.body, StandardCharsets.UTF_8).contains(SECRET));
            }
            if (Files.isSymbolicLink(site.resolve("escape.txt"))) {
                final Resp r = get(port, "/escape.txt" + q, null);
                eq("a symlink out of the site is 403", 403, r.status);
                eq("...and never returns the secret", false, new String(r.body, StandardCharsets.UTF_8).contains(SECRET));
            }

            // -- the sockets ----------------------------------------------------
            eq("remote /ws without the token is 403", 403, upgrade(port, "/ws", null, null, null));
            eq("remote /observe without the token is 403", 403, upgrade(port, "/observe", null, null, null));
            eq("remote /ws with a wrong token is 403", 403, upgrade(port, "/ws?token=nope", null, null, null));
            eq("remote /ws with the cookie alone is 403", 403, upgrade(port, "/ws", null, null, cookie));
            eq("remote /observe with the token, no Origin, is 101", 101,
                    upgrade(port, "/observe" + q, null, null, null));
            eq("remote /observe, Origin http://<Host> (the served page), is 101", 101,
                    upgrade(port, "/observe" + q, "http://192.168.1.50:8642", "192.168.1.50:8642", null));
            eq("remote /ws, Origin http://<Host>, is 101", 101,
                    upgrade(port, "/ws" + q, "http://192.168.1.50:8642", "192.168.1.50:8642", null));
            eq("remote /observe, Origin of another host, is 403", 403,
                    upgrade(port, "/observe" + q, "http://192.168.1.50:8642", "10.0.0.9:8642", null));
            eq("remote /observe, Origin not on the list and not the Host, is 403", 403,
                    upgrade(port, "/observe" + q, "https://evil.example", "192.168.1.50:8642", null));
            eq("remote /observe, ForgeCoach's github.io Origin, is still 101 (M50)", 101,
                    upgrade(port, "/observe" + q, "https://jalirkan.github.io", "192.168.1.50:8642", null));
            eq("remote: every one of the nine refusals counted", 9L, ws.tokenRefusals());
        } finally {
            ws.close();
        }
    }

    // ------------------------------------------------------------------

    /** The real loopback predicate: the desktop's browser, and the servers with no LAN. */
    private static void local(final Path site) throws Exception {
        final WsTransport ws = new WsTransport(0, WsTransport.DEFAULT_ALLOWED_ORIGINS, TOKEN, site);
        ws.start(new NoSeat(), new ReplyPool());
        int port = ws.port();
        try {
            final Resp page = get(port, "/", null);
            eq("loopback: the page needs no token", 200, page.status);
            eq("loopback: and hands back no cookie", null, page.header("set-cookie"));
            eq("loopback: /health needs no token", 503, get(port, "/health", null).status);
            eq("loopback: /ws needs no token", 101, upgrade(port, "/ws", null, null, null));
            eq("loopback: the board's own Origin still opens /observe", 101,
                    upgrade(port, "/observe", "http://127.0.0.1:5173", "127.0.0.1:" + port, null));
            eq("loopback: a rebound name's http://<Host> is NOT its own page (403)", 403,
                    upgrade(port, "/observe", "http://evil.example:" + port, "evil.example:" + port, null));
            eq("loopback: nothing refused for want of a token", 0L, ws.tokenRefusals());
        } finally {
            ws.close();
        }

        // A site with no LAN: loopback bind, no gate, no cookie.
        final WsTransport dev = new WsTransport(0, WsTransport.DEFAULT_ALLOWED_ORIGINS, null, site);
        dev.start(new NoSeat(), new ReplyPool());
        port = dev.port();
        try {
            eq("a site without --lan binds loopback", "127.0.0.1", dev.boundHost());
            final Resp page = get(port, "/", null);
            eq("a site without --lan serves the page", 200, page.status);
            eq("...with no cookie", null, page.header("set-cookie"));
            eq("...and refuses traversal", true, get(port, "/../secret.txt", null).status != 200);
        } finally {
            dev.close();
        }

        // Neither: M50's server.
        final WsTransport plain = new WsTransport(0);
        plain.start(new NoSeat(), new ReplyPool());
        port = plain.port();
        try {
            eq("no --lan binds loopback", "127.0.0.1", plain.boundHost());
            eq("no --lan: /health is M15's", 503, get(port, "/health", null).status);
            eq("no --lan: /ws is M50's", 101, upgrade(port, "/ws", null, null, null));
            eq("no --lan: a foreign Origin is still 403", 403,
                    upgrade(port, "/ws", "https://evil.example", "127.0.0.1:" + port, null));
            eq("no --lan: http://<Host> is not an allowed Origin", 403,
                    upgrade(port, "/ws", "http://evil.example:" + port, "evil.example:" + port, null));
            final Resp none = get(port, "/", null, 600);
            eq("no --lan, no site: nothing is served at /", true, none == null || none.status != 200);
        } finally {
            plain.close();
        }
    }

    // ------------------------------------------------------------------

    /** One HTTP response. */
    private static final class Resp {
        int status;
        final Map<String, String> headers = new LinkedHashMap<>();
        byte[] body = new byte[0];

        String header(final String name) {
            return headers.get(name.toLowerCase(Locale.ROOT));
        }
    }

    private static Resp get(final int port, final String target, final String cookie) throws IOException {
        return request(port, "GET", target, null, null, cookie);
    }

    /** {@link #get}, or null when nothing answers within {@code ms}. */
    private static Resp get(final int port, final String target, final String cookie, final int ms) throws IOException {
        try {
            return request(port, "GET", target, null, null, cookie, ms);
        } catch (final java.net.SocketTimeoutException e) {
            return null;
        }
    }

    private static Resp request(final int port, final String method, final String target, final String origin,
            final String host, final String cookie) throws IOException {
        return request(port, method, target, origin, host, cookie, TIMEOUT_MS);
    }

    /** A raw HTTP/1.1 request, so the target goes on the wire exactly as written ({@code ..} included). */
    private static Resp request(final int port, final String method, final String target, final String origin,
            final String host, final String cookie, final int ms) throws IOException {
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress("127.0.0.1", port), TIMEOUT_MS);
            s.setSoTimeout(ms);
            final OutputStream out = s.getOutputStream();
            final StringBuilder req = new StringBuilder()
                    .append(method).append(' ').append(target).append(" HTTP/1.1\r\n")
                    .append("Host: ").append(host != null ? host : "127.0.0.1:" + port).append("\r\n")
                    .append("Connection: close\r\n");
            if (origin != null) {
                req.append("Origin: ").append(origin).append("\r\n");
            }
            if (cookie != null) {
                req.append("Cookie: ").append(cookie).append("\r\n");
            }
            req.append("\r\n");
            out.write(req.toString().getBytes(StandardCharsets.US_ASCII));
            out.flush();
            final InputStream in = new BufferedInputStream(s.getInputStream());
            final Resp r = readHead(in);
            if (!"HEAD".equals(method)) {
                final String len = r.header("content-length");
                r.body = len != null ? in.readNBytes(Integer.parseInt(len)) : in.readAllBytes();
            }
            return r;
        }
    }

    /** A websocket upgrade; the status it is answered with. */
    private static int upgrade(final int port, final String target, final String origin, final String host,
            final String cookie) throws IOException {
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress("127.0.0.1", port), TIMEOUT_MS);
            s.setSoTimeout(TIMEOUT_MS);
            final StringBuilder req = new StringBuilder()
                    .append("GET ").append(target).append(" HTTP/1.1\r\n")
                    .append("Host: ").append(host != null ? host : "127.0.0.1:" + port).append("\r\n")
                    .append("Upgrade: websocket\r\nConnection: Upgrade\r\n")
                    .append("Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n")
                    .append("Sec-WebSocket-Version: 13\r\n");
            if (origin != null) {
                req.append("Origin: ").append(origin).append("\r\n");
            }
            if (cookie != null) {
                req.append("Cookie: ").append(cookie).append("\r\n");
            }
            req.append("\r\n");
            s.getOutputStream().write(req.toString().getBytes(StandardCharsets.US_ASCII));
            s.getOutputStream().flush();
            return readHead(new BufferedInputStream(s.getInputStream())).status;
        }
    }

    private static Resp readHead(final InputStream in) throws IOException {
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
        final String[] lines = head.toString(StandardCharsets.US_ASCII).split("\r\n");
        final Resp r = new Resp();
        final String[] parts = lines.length > 0 ? lines[0].split(" ") : new String[0];
        r.status = parts.length > 1 ? Integer.parseInt(parts[1]) : -1;
        for (int i = 1; i < lines.length; i++) {
            final int c = lines[i].indexOf(':');
            if (c > 0) {
                r.headers.put(lines[i].substring(0, c).trim().toLowerCase(Locale.ROOT), lines[i].substring(c + 1).trim());
            }
        }
        return r;
    }

    // ------------------------------------------------------------------

    private static void eq(final String what, final Object expected, final Object actual) {
        checks++;
        final boolean ok = expected == null ? actual == null : expected.equals(actual);
        if (!ok) {
            FAILURES.add(what + ": expected <" + expected + "> got <" + actual + ">");
        }
    }
}
