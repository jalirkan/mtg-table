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

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.SocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Predicate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.buffer.Unpooled;
import io.netty.channel.Channel;
import io.netty.channel.ChannelFutureListener;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInboundHandlerAdapter;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelOption;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.codec.http.DefaultFullHttpResponse;
import io.netty.handler.codec.http.FullHttpRequest;
import io.netty.handler.codec.http.FullHttpResponse;
import io.netty.handler.codec.http.HttpHeaderNames;
import io.netty.handler.codec.http.HttpHeaderValues;
import io.netty.handler.codec.http.HttpMethod;
import io.netty.handler.codec.http.HttpObjectAggregator;
import io.netty.handler.codec.http.HttpResponseStatus;
import io.netty.handler.codec.http.HttpServerCodec;
import io.netty.handler.codec.http.HttpVersion;
import io.netty.handler.codec.http.QueryStringDecoder;
import io.netty.util.ReferenceCountUtil;

/**
 * <b>Amendment M59, decision D402: the listener of a game between two people.</b>
 *
 * <p>Two seats, one port ({@code config.json} {@code tablePort}, 8646), and a door
 * built to {@code docs/security/endpoints.md}'s five tunnel changes rather than to
 * the bridge's {@code LanGate}:
 *
 * <ol>
 *   <li><b>Loopback is nobody in particular.</b>  Every {@code /ws} upgrade must
 *       show a seat's token, a loopback peer included -- a tunnel daemon connects
 *       from 127.0.0.1.  This listener exists only while a two-person game runs,
 *       so a tunnel pointed at it never lands on a seat that trusts loopback
 *       (the separate listener endpoints.md asks for, not a {@code Host}
 *       rule).</li>
 *   <li><b>A token per seat per game.</b>  The bridge never sees a token: it is
 *       given the SHA-256 digests of the two ({@code --seats-file}, written by the
 *       draft room, D404), hashes what a client presents and compares digests
 *       with {@link MessageDigest#isEqual}.  The token travels as {@code ?seat=}
 *       on the upgrade (a browser websocket cannot set a header), is stripped from
 *       the URI before the handshake and is never logged.</li>
 *   <li><b>{@code https://} origins.</b>  {@code Origin} absent (a tool), on
 *       {@code wsAllowedOrigins}, one of the {@code --table-origin}s, or a page on
 *       the same host name as the request's {@code Host}, over http or https and
 *       on any port -- the draft room's page on 8644 opening this port on 8646, or
 *       a tunnel's name.  The token is the lock; the {@code Origin} rule only
 *       keeps a drive-by page from spending one it was handed.</li>
 *   <li><b>Access in front.</b>  Not here: checking Cloudflare Access's
 *       {@code Cf-Access-Jwt-Assertion} is the tunnel's own lane (Phase 4).  A
 *       loopback peer's {@code CF-Connecting-IP} is read for one thing only, the
 *       wrong-token limit below.</li>
 *   <li><b>Hidden information is unchanged.</b>  Each seat is a
 *       {@link WsTransport#tableSeat} behind its own {@code WireGuiGame}, whose
 *       stream is redacted for that seat alone (hard rule 8).  There is no
 *       {@code /observe} here: a follower of either stream would see that seat's
 *       hand, so a watcher is refused 403 (D403).</li>
 * </ol>
 *
 * <p>Ten wrong tokens a minute from one address, then 429 for the rest of that
 * minute.  {@code GET /health} answers 200 {@code ok} once both seats have their
 * {@code hello_ok}, 503 {@code starting} before; it holds nothing private.  A
 * second, loopback-only listener on {@code wsPort} answers {@code /health} and
 * nothing else, so {@code scripts/play.sh}'s readiness poll and the second-launch
 * check keep working while the seats live here.
 */
public final class TableServer {

    /** The query parameter a seat's token travels in. */
    static final String SEAT_PARAM = "seat";

    /** Wrong tokens one address may present in a minute before it is answered 429. */
    static final int MAX_FAILURES_PER_MINUTE = 10;

    private static final long MINUTE_NANOS = 60_000_000_000L;

    /** An {@code Origin} worth comparing by host: scheme, host, optional port. */
    private static final Pattern ORIGIN = Pattern.compile("^(http|https)://([a-z0-9.-]+)(:[0-9]{1,5})?$");

    /** A {@code Host} header: a name or IPv4 address, an optional port. */
    private static final Pattern HOST = Pattern.compile("^([a-z0-9.-]+)(:[0-9]{1,5})?$");

    /** A {@code CF-Connecting-IP} worth keying a limit on. */
    private static final Pattern IP = Pattern.compile("^[0-9a-fA-F:.]{2,45}$");

    private final int port;
    /** D408: requests on the health port that carried a tunnel's headers, refused. */
    private final java.util.concurrent.atomic.AtomicInteger tunnelRefusals = new java.util.concurrent.atomic.AtomicInteger();
    private final int healthPort;
    private final boolean lan;
    private final List<String> allowedOrigins;
    private final List<String> tableOrigins;
    private final byte[][] digests;
    private final WsTransport[] seats;

    /** Whether a peer is this machine; replaceable only by the self-test. */
    Predicate<InetAddress> loopback = InetAddress::isLoopbackAddress;

    private EventLoopGroup group;
    private volatile Channel server;
    private volatile Channel healthServer;

    private final Map<String, long[]> failures = new HashMap<>();

    private final AtomicLong admitted = new AtomicLong();
    private final AtomicLong tokenRefusals = new AtomicLong();
    private final AtomicLong originRefusals = new AtomicLong();
    private final AtomicLong limited = new AtomicLong();
    private final AtomicLong observeRefusals = new AtomicLong();

    /**
     * @param port        the table port (0: any free one, for the self-test)
     * @param healthPort  the bridge's own {@code wsPort}, answered on loopback with
     *                    {@code /health} alone; 0 binds no such listener
     * @param lan         bind every interface ({@code --lan}); else loopback
     * @param allowedOrigins {@code wsAllowedOrigins}
     * @param tableOrigins   {@code --table-origin}s, each {@code scheme://host[:port]}
     * @param digests     the two seats' token digests (32 bytes each), seat order
     * @param seats       the two seats, seat order
     */
    TableServer(final int port, final int healthPort, final boolean lan, final List<String> allowedOrigins,
                final List<String> tableOrigins, final byte[][] digests, final WsTransport[] seats) {
        if (digests == null || digests.length != 2 || seats == null || seats.length != 2) {
            throw new IllegalArgumentException("a table has two seats, each with a token digest");
        }
        for (final byte[] d : digests) {
            if (d == null || d.length != 32) {
                throw new IllegalArgumentException("a seat token digest is 32 bytes (SHA-256)");
            }
        }
        if (MessageDigest.isEqual(digests[0], digests[1])) {
            throw new IllegalArgumentException("the two seats have the same token");
        }
        this.port = port;
        this.healthPort = healthPort;
        this.lan = lan;
        this.allowedOrigins = WsTransport.validOrigins(allowedOrigins);
        this.tableOrigins = WsTransport.validOrigins(tableOrigins);
        this.digests = new byte[][] {digests[0].clone(), digests[1].clone()};
        this.seats = seats.clone();
    }

    // ==================================================================
    // The pure decisions, which TableSelfTest holds as tables
    // ==================================================================

    /** SHA-256 of a token, as the seats file and the draft room write it. */
    static byte[] digest(final String token) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
        } catch (final NoSuchAlgorithmException e) {
            throw new IllegalStateException("no SHA-256 in this JRE", e);
        }
    }

    /** A 64-character lower-case hex digest, as bytes; anything else is refused. */
    static byte[] hexDigest(final String hex) {
        if (hex == null || !hex.matches("^[0-9a-f]{64}$")) {
            throw new IllegalArgumentException("a seat token digest is 64 lower-case hex characters");
        }
        final byte[] out = new byte[32];
        for (int i = 0; i < 32; i++) {
            out[i] = (byte) Integer.parseInt(hex.substring(2 * i, 2 * i + 2), 16);
        }
        return out;
    }

    /**
     * Which seat a presented token opens: 0, 1, or -1.  Both digests are compared
     * every time, so the time does not say which seat (or whether the first)
     * matched.
     */
    static int seatFor(final String presented, final byte[][] digests) {
        if (presented == null || presented.isEmpty() || presented.length() > 256) {
            return -1;
        }
        final byte[] d = digest(presented);
        int seat = -1;
        for (int i = 0; i < digests.length; i++) {
            if (MessageDigest.isEqual(d, digests[i]) && seat < 0) {
                seat = i;
            }
        }
        return seat;
    }

    /**
     * May a table upgrade carrying this {@code Origin} proceed (M59)?  Absent;
     * on {@code wsAllowedOrigins}; one of the {@code --table-origin}s; or
     * http(s) on the request's own host name, any port.
     */
    static boolean originOk(final String origin, final String host, final List<String> allowed,
                            final List<String> tableOrigins) {
        if (origin == null) {
            return true;
        }
        if (WsTransport.originAllowed(origin, allowed)) {
            return true;
        }
        final String o = origin.trim().toLowerCase(Locale.ROOT);
        for (final String t : tableOrigins) {
            if (o.equals(t)) {
                return true;
            }
        }
        if (host == null) {
            return false;
        }
        final Matcher om = ORIGIN.matcher(o);
        final Matcher hm = HOST.matcher(host.trim().toLowerCase(Locale.ROOT));
        return om.matches() && hm.matches() && om.group(2).equals(hm.group(1));
    }

    /**
     * The address a wrong-token limit is kept for: the peer's, or -- for a
     * loopback peer only, where a tunnel daemon sits -- a well-formed
     * {@code CF-Connecting-IP}.  Nothing off this machine can reach loopback,
     * so the header cannot be forged from outside.
     */
    static String limitKey(final boolean fromLoopback, final String peer, final String cfConnectingIp) {
        if (fromLoopback && cfConnectingIp != null && IP.matcher(cfConnectingIp.trim()).matches()) {
            return "cf:" + cfConnectingIp.trim().toLowerCase(Locale.ROOT);
        }
        return peer == null ? "?" : peer;
    }

    // ==================================================================
    // Lifecycle
    // ==================================================================

    /** Bind both listeners; returns once they are listening.  MAIN thread. */
    void start() {
        final ThreadFactory tf = this::newEventLoopThread;
        group = new NioEventLoopGroup(1, tf);
        final String host = lan ? WsTransport.LAN_BIND : WsTransport.LOOPBACK_BIND;
        server = bind(host, port, false);
        if (healthPort > 0) {
            healthServer = bind(WsTransport.LOOPBACK_BIND, healthPort, true);
        }
    }

    private Channel bind(final String host, final int p, final boolean healthOnly) {
        final ServerBootstrap b = new ServerBootstrap();
        b.group(group)
         .channel(NioServerSocketChannel.class)
         .option(ChannelOption.SO_REUSEADDR, Boolean.TRUE)
         .childOption(ChannelOption.TCP_NODELAY, Boolean.TRUE)
         .childHandler(new ChannelInitializer<SocketChannel>() {
             @Override
             protected void initChannel(final SocketChannel ch) {
                 ch.pipeline().addLast(new HttpServerCodec());
                 ch.pipeline().addLast(new HttpObjectAggregator(WsTransport.MAX_HTTP_CONTENT));
                 ch.pipeline().addLast(new TableDoor(healthOnly));
             }
         });
        try {
            return b.bind(new InetSocketAddress(host, p)).sync().channel();
        } catch (final InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("interrupted binding " + host + ":" + p, e);
        } catch (final RuntimeException e) {
            throw new IllegalStateException("cannot bind " + host + ":" + p
                    + " -- another mtg-table server is probably already running there", e);
        }
    }

    /** The event loop's only thread: the bridge's websocket thread name, as WsTransport's (R3). */
    private Thread newEventLoopThread(final Runnable r) {
        final Thread t = new Thread(r, WsTransport.WS_THREAD_NAME);
        t.setDaemon(true);
        return t;
    }

    /** Close both listeners (the seats close their own channels).  Idempotent. */
    void close() {
        final Channel s = server;
        if (s != null) {
            s.close();
        }
        final Channel h = healthServer;
        if (h != null) {
            h.close();
        }
        if (group != null) {
            group.shutdownGracefully(0L, WsTransport.DRAIN_MS, TimeUnit.MILLISECONDS);
        }
    }

    /** The table port as bound (the self-test binds 0). */
    int port() {
        final Channel s = server;
        if (port == 0 && s != null && s.localAddress() instanceof InetSocketAddress) {
            return ((InetSocketAddress) s.localAddress()).getPort();
        }
        return port;
    }

    /** D408: requests on the health port refused for a tunnel's headers. */
    int tunnelRefusals() {
        return tunnelRefusals.get();
    }

    /** The health port as bound, or 0. */
    int healthPort() {
        final Channel s = healthServer;
        if (healthPort == 0 && s != null && s.localAddress() instanceof InetSocketAddress) {
            return ((InetSocketAddress) s.localAddress()).getPort();
        }
        return healthPort;
    }

    boolean lan() {
        return lan;
    }

    long admitted() {
        return admitted.get();
    }

    long tokenRefusals() {
        return tokenRefusals.get();
    }

    long originRefusals() {
        return originRefusals.get();
    }

    long limited() {
        return limited.get();
    }

    long observeRefusals() {
        return observeRefusals.get();
    }

    /** Both seats' sessions exist. */
    boolean ready() {
        return seats[0].sessionReady() && seats[1].sessionReady();
    }

    // ==================================================================
    // The door
    // ==================================================================

    private boolean fromLoopback(final Channel ch) {
        final SocketAddress r = ch.remoteAddress();
        return r instanceof InetSocketAddress && ((InetSocketAddress) r).getAddress() != null
                && loopback.test(((InetSocketAddress) r).getAddress());
    }

    private static String peerHost(final Channel ch) {
        final SocketAddress r = ch.remoteAddress();
        return r instanceof InetSocketAddress && ((InetSocketAddress) r).getAddress() != null
                ? ((InetSocketAddress) r).getAddress().getHostAddress() : String.valueOf(r);
    }

    /** True when this key has used up its wrong tokens for the minute.  Event loop only. */
    private boolean blocked(final String key) {
        final long now = System.nanoTime();
        final long[] f = failures.get(key);
        return f != null && now - f[1] < MINUTE_NANOS && f[0] >= MAX_FAILURES_PER_MINUTE;
    }

    private void fail(final String key) {
        final long now = System.nanoTime();
        if (failures.size() > 4096) {
            for (final Iterator<long[]> it = failures.values().iterator(); it.hasNext(); ) {
                if (now - it.next()[1] >= MINUTE_NANOS) {
                    it.remove();
                }
            }
        }
        final long[] f = failures.get(key);
        if (f == null || now - f[1] >= MINUTE_NANOS) {
            failures.put(key, new long[] {1, now});
        } else {
            f[0]++;
        }
    }

    private static void plain(final ChannelHandlerContext ctx, final HttpResponseStatus status, final String text) {
        final byte[] payload = text.getBytes(StandardCharsets.US_ASCII);
        final FullHttpResponse res = new DefaultFullHttpResponse(HttpVersion.HTTP_1_1, status,
                Unpooled.wrappedBuffer(payload));
        res.headers().set(HttpHeaderNames.CONTENT_TYPE, "text/plain; charset=us-ascii");
        res.headers().setInt(HttpHeaderNames.CONTENT_LENGTH, payload.length);
        res.headers().set(HttpHeaderNames.CONNECTION, HttpHeaderValues.CLOSE);
        ctx.writeAndFlush(res).addListener(ChannelFutureListener.CLOSE);
    }

    /**
     * The health port: {@code /health} and nothing else.  The table port:
     * {@code /ws} by token and nothing else -- no {@code /health}, no
     * {@code /observe}, no site; every other path 404, so a tunnel that routes
     * {@code /ws} here (D405's game-seat rule) reaches exactly one thing.
     */
    private final class TableDoor extends ChannelInboundHandlerAdapter {
        private final boolean healthOnly;

        TableDoor(final boolean healthOnly) {
            this.healthOnly = healthOnly;
        }

        @Override
        public void channelRead(final ChannelHandlerContext ctx, final Object msg) {
            if (!(msg instanceof FullHttpRequest)) {
                ctx.fireChannelRead(msg);      // websocket frames, once a seat's handlers are in
                return;
            }
            final FullHttpRequest req = (FullHttpRequest) msg;
            final String uri = req.uri();
            final int q = uri.indexOf('?');
            final String path = q < 0 ? uri : uri.substring(0, q);
            if (healthOnly && WsTransport.viaTunnel(req.headers().names())) {
                // D405/D408: the bridge's own port is never tunnelled, at a table of two as in every other
                // mode -- WsTransport's TunnelGate, on this port's every path, /health included.
                tunnelRefusals.incrementAndGet();
                System.err.println("TABLE TUNNEL REFUSED " + req.method() + " " + path + " on the health port from "
                        + ctx.channel().remoteAddress() + ": this port is never tunnelled (D405)");
                ReferenceCountUtil.release(msg);
                plain(ctx, HttpResponseStatus.FORBIDDEN, "this port is never tunnelled");
                return;
            }
            if (healthOnly && "/health".equals(path)) {
                final boolean get = HttpMethod.GET.equals(req.method()) || HttpMethod.HEAD.equals(req.method());
                ReferenceCountUtil.release(msg);
                plain(ctx, !get ? HttpResponseStatus.METHOD_NOT_ALLOWED
                        : ready() ? HttpResponseStatus.OK : HttpResponseStatus.SERVICE_UNAVAILABLE,
                        !get ? "method not allowed" : ready() ? "ok" : "starting");
                return;
            }
            if (healthOnly) {
                ReferenceCountUtil.release(msg);
                plain(ctx, HttpResponseStatus.NOT_FOUND, "this bridge is playing a game between two people: "
                        + "its seats are on the table port, each behind its own token (amendment M59)");
                return;
            }
            if (WsTransport.OBSERVE_PATH.equals(path)) {
                // No observers at a table of two (D403): either seat's stream shows that seat's hand.
                observeRefusals.incrementAndGet();
                ReferenceCountUtil.release(msg);
                plain(ctx, HttpResponseStatus.NOT_FOUND, "not found");
                return;
            }
            if (!WsTransport.SEAT_PATH.equals(path)) {
                ReferenceCountUtil.release(msg);
                plain(ctx, HttpResponseStatus.NOT_FOUND, "not found");
                return;
            }
            final Channel ch = ctx.channel();
            final String key = limitKey(fromLoopback(ch), peerHost(ch), req.headers().get("CF-Connecting-IP"));
            if (blocked(key)) {
                limited.incrementAndGet();
                ReferenceCountUtil.release(msg);
                plain(ctx, HttpResponseStatus.TOO_MANY_REQUESTS, "too many wrong links; wait a minute");
                return;
            }
            String token = null;
            try {
                final List<String> v = new QueryStringDecoder(uri).parameters().get(SEAT_PARAM);
                token = v == null || v.isEmpty() ? null : v.get(0);
            } catch (final IllegalArgumentException e) {
                token = null;
            }
            final int seat = seatFor(token, digests);
            if (seat < 0) {
                fail(key);
                tokenRefusals.incrementAndGet();
                // The path and the peer only: a wrong token is never repeated into the log.
                System.err.println("TABLE REFUSED " + path + " from " + ch.remoteAddress()
                        + ": no valid seat token (M59)");
                ReferenceCountUtil.release(msg);
                plain(ctx, HttpResponseStatus.FORBIDDEN, "a seat token is required: open the game link "
                        + "the draft room gave you");
                return;
            }
            final String origin = req.headers().get(HttpHeaderNames.ORIGIN);
            if (!originOk(origin, req.headers().get(HttpHeaderNames.HOST), allowedOrigins, tableOrigins)) {
                originRefusals.incrementAndGet();
                System.err.println("TABLE ORIGIN REFUSED " + path + " from " + origin + " ("
                        + ch.remoteAddress() + ")");
                ReferenceCountUtil.release(msg);
                plain(ctx, HttpResponseStatus.FORBIDDEN, "origin not allowed");
                return;
            }
            admitted.incrementAndGet();
            System.err.println("TABLE SEAT " + seat + " upgrade from " + ch.remoteAddress());
            req.setUri(WsTransport.SEAT_PATH);   // the token goes no further
            seats[seat].installSeatHandlers(ctx.pipeline());
            ctx.fireChannelRead(msg);
        }

        @Override
        public void exceptionCaught(final ChannelHandlerContext ctx, final Throwable cause) {
            System.err.println("TABLE channel error: " + cause);
            ctx.close();
        }
    }

    /** The {@code --table-origin} values, validated (M59): {@code scheme://host[:port]}. */
    static List<String> tableOrigins(final List<String> given) {
        final List<String> out = new ArrayList<>();
        for (final String g : given) {
            if (g == null || !ORIGIN.matcher(g.trim().toLowerCase(Locale.ROOT)).matches()) {
                throw new IllegalArgumentException("--table-origin wants scheme://host[:port], got \"" + g + "\"");
            }
            out.add(g.trim().toLowerCase(Locale.ROOT));
        }
        return Collections.unmodifiableList(out);
    }
}
