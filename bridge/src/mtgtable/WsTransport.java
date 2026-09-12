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

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.buffer.Unpooled;
import io.netty.channel.Channel;
import io.netty.channel.ChannelFutureListener;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInboundHandlerAdapter;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelOption;
import io.netty.channel.ChannelPipeline;
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
import io.netty.handler.codec.http.websocketx.CloseWebSocketFrame;
import io.netty.handler.codec.http.websocketx.TextWebSocketFrame;
import io.netty.handler.codec.http.websocketx.WebSocketFrame;
import io.netty.handler.codec.http.websocketx.WebSocketFrameAggregator;
import io.netty.handler.codec.http.websocketx.WebSocketServerProtocolHandler;
import io.netty.handler.stream.ChunkedWriteHandler;
import io.netty.util.ReferenceCountUtil;

/**
 * M3: the seat over a loopback WebSocket, so the browser can play the game the
 * console already plays.
 *
 * <pre>
 *   ./bridge/run.sh mtgtable.MtgTable --transport ws --port 8642 --seed 42
 *   ws://127.0.0.1:8642/ws          the frames
 *   http://127.0.0.1:8642/health    200 "ok", for readiness polling
 * </pre>
 *
 * <h2>The pipeline</h2>
 *
 * {@code HttpServerCodec} &rarr; {@code HttpObjectAggregator(1 MB)} &rarr;
 * {@code ChunkedWriteHandler} &rarr; {@link Health} &rarr;
 * {@code WebSocketServerProtocolHandler("/ws", null, false, 1 MB)} &rarr;
 * {@code WebSocketFrameAggregator(1 MB)} &rarr; {@link WsHandler}.
 *
 * <p>{@link Health} sits <b>before</b> the websocket handler and forwards
 * anything that is not {@code GET /health} untouched, because netty's own
 * handshake handler is what must see the upgrade request; after the handshake it
 * sees websocket frames instead of HTTP and forwards those too.  Text frames
 * only, and <b>one protocol frame per websocket message is enforced, not
 * assumed</b>: the aggregator reassembles a fragmented message and the explicit
 * size replaces netty's 64 KB default, which the 1 MB HTTP aggregator does not
 * cover (it bounds the handshake alone).  A frame that is dropped anyway --
 * unparseable, not an object, an unknown type, a binary frame -- comes back to
 * the client as an out-of-band {@code notice} rather than as silence, with one
 * exception: a frame that arrives <b>before the session exists</b> is dropped in
 * silence, because the notice would itself be a pre-handshake frame (amendment
 * <b>M20</b>, {@link WsHandler#admitted}).
 *
 * <h2>Threads</h2>
 *
 * <p>One netty event loop, named {@value #WS_THREAD_NAME}.  That name is not
 * decoration: {@code forge.util.ThreadUtil.isGameThread()} is a bare
 * {@code getName().startsWith("Game")}, so every thread this repo creates is
 * named from a constant and {@link HeadlessGuiBase} asserts the whole set at
 * class-init (CLAUDE.md rule 10).  The event loop is neither a game thread nor
 * {@code mtg-table-EDT}, which is exactly what {@link Transport.Inbound}'s
 * contract asks for -- so inbound frames are dispatched straight from it and the
 * two asserts at the top of {@code onAct} / {@code onAnswer} stay armed.
 *
 * <p>Outbound writes come from four threads (game, EDT, io, netty) and all of
 * them go through {@code channel.writeAndFlush}, which netty serialises onto the
 * event loop.  Nothing here ever walks a Forge view: a frame is already a JSON
 * string by the time it reaches {@link #push}.
 *
 * <h2>Connect, resync and reconnect (contracts (b) and (c))</h2>
 *
 * <p>A client that connects gets {@code hello_ok}, then a full {@code state},
 * then the current {@code input}; a {@code resync} frame re-sends the last two;
 * a reconnect after a disconnect gets all three again and the game continues.
 *
 * <p><b>...with one frame conditional, as of amendment M42: the {@code input}
 * is sent only once the engine has pushed one for this game.</b>  There is no
 * "current input" before that -- only the empty struct the seat was constructed
 * with -- and a client told "the engine is asking you something" while
 * {@code applyAct} is still answering every act with
 * {@code notice{title:"Not yet"}} acts into a drop.  A pre-input connect
 * therefore sees {@code hello_ok} + {@code state} and then waits, which is what
 * it would have done anyway; and a client may read its first {@code input} as
 * the pre-input guard lifting.
 *
 * <p><b>"Connects" means after {@code openView}.</b>  The port is bound ~1.2 s
 * earlier, and all three halves of that window are now closed (M15 did the first
 * two, amendment <b>M20</b> the third): {@code GET /health} answers <b>503</b>
 * until the handshake frame exists; a socket that gets in anyway is handed
 * nothing, so {@code openView}'s own {@code hello_ok}, {@code state} and
 * {@code input} reach it in order instead; and <b>a c2s frame that arrives in
 * the window is dropped with no reply</b>, because answering it put the answer
 * on the wire ahead of the handshake.  Before M15 a client in the window saw
 * {@code input}, {@code notice}, {@code notice}, {@code hello_ok}; after M15 and
 * before M20 it still saw {@code notice}@1 then {@code hello_ok}@2 for an
 * {@code act}, and {@code input}@1 then {@code hello_ok}@2 for a {@code resync}
 * -- section 2.1's "before the first state", inverted, in both directions.
 *
 * <p><b>The {@code state} is never built here.</b>  It is the last snapshot the
 * <em>game thread</em> produced, cached as a string on its way past {@link #push}
 * and re-delivered verbatim -- same {@code seq}, same {@code t}.  Walking the
 * view graph on the netty thread would corrupt Forge's {@code Tracker} silently
 * (hard rule 3), and that is the whole reason this class holds strings and not
 * views.  Re-delivery is <b>verbatim and unlogged</b>: the frame log records what
 * the session produced (protocol section 8), and a repeat on the socket is a
 * repeat, not a new frame.  See amendment M10 in {@code docs/protocol.md}:
 * {@code seq} is per <em>session</em>, not per connection, so a reconnecting
 * client legitimately sees a jump and a resync legitimately sees a repeat.
 *
 * <p>The {@code input} half of a resync goes the other way, through
 * {@link Transport.Inbound#onResync()} -- a real re-emission, logged, with a
 * fresh {@code seq}.  That is deliberate: it is the call whose guard M3's
 * doorstep test exists for (a resync must <b>not</b> arm {@code inputSeen}, or a
 * browser that autoconnects and then concedes crashes Forge's own setup), so the
 * socket has to keep exercising it.
 *
 * <h2>The ask timeout (D15, extended)</h2>
 *
 * <p>{@code 0} -- forever -- <b>while a client is connected</b>.  A socket's cap
 * is its liveness, not a clock: a person reading the board is not a hang, and the
 * thing that unparks a game thread is {@code cancelAll()} on disconnect, which
 * this class calls from {@code channelInactive}.  With no client connected there
 * is nothing to be live, so an ask falls back to
 * {@value #NO_CLIENT_ASK_TIMEOUT_MS} ms and the game degrades to protocol section
 * 5.4's documented defaults rather than parking a game thread against a socket
 * nobody is on the other end of.
 */
public final class WsTransport implements Transport {

    /**
     * The netty event loop's thread name.  A constant because
     * {@link HeadlessGuiBase} asserts every thread name we create at class-init
     * and {@code tools/lint-bridge.sh} section 6 greps every {@code new Thread(}
     * for one: a thread of ours named {@code Game*} would pass
     * {@code ThreadUtil.isGameThread()} and be allowed to walk the view graph.
     */
    static final String WS_THREAD_NAME = "mtg-table-ws";

    /** Aggregate a whole HTTP request, and no more than this (the handshake is tiny). */
    static final int MAX_HTTP_CONTENT = 1 << 20;

    /**
     * The largest inbound websocket message, fragments reassembled.  Stated
     * rather than inherited: {@code WebSocketServerProtocolHandler}'s default is
     * 64 KB and {@link #MAX_HTTP_CONTENT} bounds only the handshake, so "one
     * protocol frame per message" needs both this and a
     * {@code WebSocketFrameAggregator} to be enforced instead of assumed.  A
     * c2s frame is an act or an answer; 1 MB is orders of magnitude more than
     * any of them.
     */
    static final int MAX_WS_FRAME = 1 << 20;

    /**
     * Only one client at a time.  A second connection is closed with an
     * application close code (&ge; 4000, so a browser can tell it apart from a
     * network failure and not reconnect in a loop) after one {@code notice}.
     */
    static final int REFUSED_CLOSE_CODE = 4001;

    /** A normal, expected close: the game is over and the server is exiting. */
    static final int OVER_CLOSE_CODE = 1000;

    /**
     * How long one ask may park when <b>no</b> client is connected.  With a
     * client on the socket the answer is 0 (forever) and a disconnect is what
     * ends the wait; with nobody there, a cap is the only thing that can.
     */
    static final long NO_CLIENT_ASK_TIMEOUT_MS = 120_000L;

    /** How long {@link #close()} waits for the queued tail of the stream to drain. */
    static final long DRAIN_MS = 1_000L;

    private final int port;

    private Inbound inbound;
    private ReplyPool pool;
    private EventLoopGroup group;
    private Channel server;

    /** The one connected websocket channel, or null.  Written on the event loop. */
    private volatile Channel client;

    /** The handshake frame, cached verbatim so a reconnect gets it again (section 2.1). */
    private volatile String lastHello;
    /** The last {@code state} frame, built on the game thread, cached as a string. */
    private volatile String lastState;
    /** The last {@code input} frame, cached for the same reason. */
    private volatile String lastInput;

    /**
     * askId -&gt; the ask frame, so a resync can re-send one that is still
     * outstanding (section 2.4).  Insertion-ordered, because asks are answered
     * oldest-first and a re-send should arrive in the order they were asked.
     */
    private final Map<String, String> outstanding = java.util.Collections.synchronizedMap(
            new LinkedHashMap<String, String>());

    private final AtomicLong framesOut = new AtomicLong();
    private final AtomicLong framesDropped = new AtomicLong();
    private final AtomicLong framesIn = new AtomicLong();
    private final AtomicLong connects = new AtomicLong();
    private final AtomicLong refusals = new AtomicLong();
    /** c2s frames thrown away because the session did not exist yet (amendment M20). */
    private final AtomicLong preSessionDrops = new AtomicLong();

    private volatile boolean closed;
    private volatile boolean sawOver;

    public WsTransport(final int port) {
        this.port = port;
    }

    /** The port this server is bound to. */
    public int port() {
        return port;
    }

    /** {@code true} while a client holds the seat. */
    public boolean connected() {
        final Channel ch = client;
        return ch != null && ch.isActive();
    }

    public long framesOut() {
        return framesOut.get();
    }

    public long framesDropped() {
        return framesDropped.get();
    }

    public long framesIn() {
        return framesIn.get();
    }

    public long connects() {
        return connects.get();
    }

    public long refusals() {
        return refusals.get();
    }

    /**
     * How many c2s frames arrived before the session existed and were dropped
     * without a reply (amendment <b>M20</b>).  Normally 0: {@code GET /health}
     * answers 503 until the handshake frame exists, so a client that polls it
     * never sends one.  A client that does not poll can, and this is how a run
     * says so afterwards rather than leaving it to be re-derived from stderr.
     */
    public long preSessionDrops() {
        return preSessionDrops.get();
    }

    // ==================================================================
    // Transport
    // ==================================================================

    /**
     * Bind, and return once the port is listening.
     *
     * <p>Called from {@code MtgTable.run} before {@code HostedMatch.startMatch},
     * i.e. on the main thread: not a game thread, not the EDT.  {@code /health}
     * answers from this moment -- with <b>503 {@code starting}</b> until
     * {@code openView} has emitted {@code hello_ok}, and 200 {@code ok} after.
     * That is what {@code scripts/play.sh} polls before it opens a browser, and
     * the readiness it reports is now the session's, not the port's.
     */
    @Override
    public void start(final Inbound in, final ReplyPool replyPool) {
        this.inbound = in;
        this.pool = replyPool;
        // One event loop, one thread, named from a constant (R3).  Netty's own
        // DefaultThreadFactory would name it "nioEventLoopGroup-2-1", which is
        // harmless today and is exactly the kind of name this repo refuses to
        // depend on: see HeadlessGuiBase's class-init assert.
        final ThreadFactory tf = this::newEventLoopThread;
        group = new NioEventLoopGroup(1, tf);
        final ServerBootstrap b = new ServerBootstrap();
        b.group(group)
         .channel(NioServerSocketChannel.class)
         .option(ChannelOption.SO_REUSEADDR, Boolean.TRUE)
         .childOption(ChannelOption.TCP_NODELAY, Boolean.TRUE)
         .childHandler(new ChannelInitializer<SocketChannel>() {
             @Override
             protected void initChannel(final SocketChannel ch) {
                 final ChannelPipeline p = ch.pipeline();
                 p.addLast(new HttpServerCodec());
                 p.addLast(new HttpObjectAggregator(MAX_HTTP_CONTENT));
                 p.addLast(new ChunkedWriteHandler());
                 p.addLast(new Health());
                 // The explicit frame size is the point of the four-argument
                 // constructor: the default is netty's 64 KB, and the 1 MB
                 // HttpObjectAggregator above bounds only the HANDSHAKE.
                 p.addLast(new WebSocketServerProtocolHandler("/ws", null, false, MAX_WS_FRAME));
                 // "One protocol frame per websocket message" was an assumption,
                 // not a rule: a client that fragments one frame across a
                 // TextWebSocketFrame(final=false) plus ContinuationWebSocketFrames
                 // had its first fragment parsed as truncated JSON and dropped
                 // and the rest discarded in silence.  The aggregator makes the
                 // assumption true instead.
                 p.addLast(new WebSocketFrameAggregator(MAX_WS_FRAME));
                 p.addLast(new WsHandler());
             }
         });
        try {
            // Loopback ONLY, and that is a decision, not an oversight: no auth,
            // no TLS, and README's NON-GOALS says so out loud.
            server = b.bind(new InetSocketAddress("127.0.0.1", port)).sync().channel();
        } catch (final InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("interrupted binding 127.0.0.1:" + port, e);
        } catch (final RuntimeException e) {
            throw new IllegalStateException("cannot bind 127.0.0.1:" + port
                    + " -- another mtg-table server is probably already running there", e);
        }
    }

    /** The event loop's only thread.  Named on the {@code new Thread(} line, per the lint. */
    private Thread newEventLoopThread(final Runnable r) {
        final Thread t = new Thread(r, WS_THREAD_NAME);
        t.setDaemon(true);
        return t;
    }

    /**
     * Any thread, never blocks.  Caches the three frames a reconnect re-delivers
     * and writes the frame if anybody is listening.
     */
    @Override
    public void push(final String frameJson) {
        switch (frameType(frameJson)) {
        case "hello_ok":
            lastHello = frameJson;
            // Amendment M42, the transport's own half: a handshake opens a NEW
            // game (M38) and the cached `input` belongs to the one that just
            // ended, so nothing may re-deliver it.  The rule -- an `input`
            // reaches a client only after the engine has asked -- is kept in
            // WireGuiGame.onResync, which owns `inputSeen`; this line is what
            // makes it true for the fallback below it as well, and it costs one
            // assignment per game.
            lastInput = null;
            break;
        case "state":    lastState = frameJson; break;
        case "input":    lastInput = frameJson; break;
        case "over":     sawOver = true; break;
        default: break;
        }
        write(frameJson);
    }

    /**
     * <b>The deadline is recomputed here, not trusted from the caller.</b>
     *
     * <p>{@code WireGuiGame.ask} reads {@link #askTimeoutMs} and then serialises
     * the whole ask body -- every option, with a full card each -- before it gets
     * here, and a disconnect inside that gap used to be able to park a game
     * thread forever with nothing left to cancel it: {@code askTimeoutMs} had
     * already returned 0 because a client was connected, {@code cancelAll()} ran
     * against an empty pool, {@code channelInactive} reopened it, and the
     * {@code await} that followed had no deadline and no peer.  Re-reading
     * {@link #connected()} at the point of parking shrinks that window to the
     * microseconds between this line and {@code await}, and makes "0 means a live
     * peer" true where it actually matters.  The {@code timeoutMs} already on the
     * wire is the caller's number and is left alone -- it is what the client was
     * told, and a frame is not rewritten after it is sent.
     */
    @Override
    public String ask(final String askId, final String askFrameJson, final long timeoutMs) {
        Transport.assertGameThread("Transport.ask");
        outstanding.put(askId, askFrameJson);
        try {
            push(askFrameJson);
            final long deadline = connected() ? timeoutMs : NO_CLIENT_ASK_TIMEOUT_MS;
            if (deadline != timeoutMs) {
                System.err.println("WS ASK " + askId + " parks for " + deadline
                        + " ms, not " + timeoutMs + ": the client went away while the body was built");
            }
            return pool.await(askId, deadline);
        } finally {
            outstanding.remove(askId);
        }
    }

    /**
     * {@code 0} (forever) while a client is connected; a finite cap when none is.
     *
     * <p>D15 said the console waits forever because a human is thinking and the
     * automated transports wait 30 s so a test fails fast.  A socket is neither,
     * and copying either number is the bug: what bounds a socket is whether the
     * peer is still there.  {@code cancelAll()} on disconnect is the other half
     * of this answer and it lives in {@link WsHandler#channelInactive}.
     */
    @Override
    public long askTimeoutMs(final String kind) {
        return connected() ? 0L : NO_CLIENT_ASK_TIMEOUT_MS;
    }

    /**
     * Idempotent.  Unparks every game thread, says goodbye on the socket, and
     * shuts the event loop down.
     */
    @Override
    public void close() {
        if (closed) {
            return;
        }
        closed = true;
        if (pool != null) {
            pool.cancelAll();
        }
        final Channel ch = client;
        if (ch != null && ch.isActive()) {
            try {
                // Queued behind every frame already written, so awaiting it is
                // how the tail of the stream -- `over` above all -- reaches a
                // client before System.exit takes the JVM down.
                ch.writeAndFlush(new CloseWebSocketFrame(OVER_CLOSE_CODE,
                        sawOver ? "game over" : "server closing")).await(DRAIN_MS, TimeUnit.MILLISECONDS);
            } catch (final InterruptedException e) {
                Thread.currentThread().interrupt();
            } catch (final RuntimeException e) {
                System.err.println("WS close write failed: " + e);
            }
            ch.close();
        }
        if (server != null) {
            server.close();
        }
        if (group != null) {
            group.shutdownGracefully(0L, DRAIN_MS, TimeUnit.MILLISECONDS);
        }
    }

    /*
     * There is deliberately no `keepOpen(long)` here any more (M6 verification
     * fix).  It used to hold the process open for a flat 30 s after `over` and
     * return early on disconnect, which read as a transport concern but was not
     * one: the same window is where `act: newGame` arrives, so the wait has to
     * end on "a new game began" as well as on "the client left", and only
     * MtgTable knows the first.  `MtgTable.awaitNextGame` is that wait, and it
     * applies THIS class's rule -- unbounded while {@link #connected()},
     * finite only while nobody is -- to the linger as well as to the ask
     * timeout.  A 30 s fuse under a connected client closed the socket out from
     * under the board's own New Game button; that is what it cost.
     */

    // ==================================================================
    // Outbound
    // ==================================================================

    /** Write one complete envelope as one text frame, or count it dropped. */
    private void write(final String frameJson) {
        final Channel ch = client;
        if (ch == null || !ch.isActive()) {
            // Not an error: the game runs whether or not anybody is watching,
            // and everything it emits is in the frame log either way.  A client
            // that connects later is caught up by the cache above.
            framesDropped.incrementAndGet();
            return;
        }
        framesOut.incrementAndGet();
        ch.writeAndFlush(new TextWebSocketFrame(frameJson));
    }

    /**
     * The envelope's {@code type}, without parsing the body.
     *
     * <p>{@code Json.parse} on every {@code state} frame would re-parse the whole
     * snapshot this class exists not to look at.  The writer in
     * {@code WireGuiGame.envelope} puts {@code type} before {@code body}, so the
     * first occurrence is always the envelope's own.
     */
    static String frameType(final String frameJson) {
        if (frameJson == null) {
            return "";
        }
        final int i = frameJson.indexOf("\"type\":\"");
        if (i < 0) {
            return "";
        }
        final int from = i + 8;
        final int to = frameJson.indexOf('"', from);
        return to < 0 ? "" : frameJson.substring(from, to);
    }

    /**
     * An out-of-band server frame: {@code seq: 0}, belonging to no session
     * stream (amendment M10).
     *
     * <p>There are exactly three kinds (protocol section 2.5): the {@code pong}
     * that answers a keepalive, the {@code notice} a refused second connection
     * receives before it is closed (both amendment <b>M10</b>), and the
     * {@code notice} {@link #dropped} sends when a c2s frame is thrown away
     * (amendment <b>M18</b>).  None is in the frame log, none is numbered, and a
     * {@code seq} of 0 is how a reader tells them apart from the session's own
     * frames, which start at 1 (section 1, amendment M9).
     *
     * <p>A frame that arrives <b>before the session exists</b> is the one drop
     * that gets no reply at all (amendment <b>M20</b>): the reply would itself be
     * a pre-handshake frame, which is the inversion section 2.1 forbids.
     */
    private static String oob(final String type, final String body) {
        final StringBuilder sb = new StringBuilder(96);
        sb.append("{\"v\":").append(GameLog.PROTOCOL_VERSION)
          .append(",\"seq\":0,\"t\":").append(System.currentTimeMillis())
          .append(",\"type\":");
        Json.quote(sb, type);
        sb.append(",\"body\":").append(body).append('}');
        return sb.toString();
    }

    // ==================================================================
    // Inbound -- on the netty event loop, which is neither a game thread nor
    // the EDT, which is precisely Transport.Inbound's contract.
    // ==================================================================

    private void onText(final String text) {
        framesIn.incrementAndGet();
        final Object parsed;
        try {
            parsed = Json.parse(text);
        } catch (final RuntimeException e) {
            System.err.println("WS unparseable c2s frame dropped: " + e);
            dropped("that frame was not valid JSON");
            return;
        }
        if (!(parsed instanceof Map)) {
            System.err.println("WS c2s frame is not an object, dropped");
            dropped("a frame must be a JSON object");
            return;
        }
        @SuppressWarnings("unchecked")
        final Map<String, Object> f = (Map<String, Object>) parsed;
        final String type = String.valueOf(f.get("type"));
        final Map<String, Object> body = asMap(f.get("body"));
        switch (type) {
        case "act": {
            if (body == null) {
                System.err.println("WS act with no body, dropped");
                dropped("an `act` needs a body");
                return;
            }
            final Object action = body.get("action");
            if (action == null) {
                System.err.println("WS act with no action, dropped");
                dropped("an `act` needs body.action");
                return;
            }
            inbound.onAct(String.valueOf(action), body);
            break;
        }
        case "answer": {
            if (body == null || body.get("askId") == null) {
                System.err.println("WS answer with no askId, dropped");
                dropped("an `answer` needs body.askId");
                return;
            }
            final String askId = String.valueOf(body.get("askId"));
            // The bridge wants the RAW JSON TEXT of answer.value, and Jetty's
            // parser has already turned it into Long/Object[]/Map/Boolean, so it
            // is written back out.  Round-tripping is lossless for every shape
            // section 5.2 declares; a value key that is absent is a null answer,
            // which is always legal (section 5.4).
            final Object value = body.get("value");
            inbound.onAnswer(askId, body.containsKey("value") ? writeValue(value) : null);
            break;
        }
        case "resync":
            resend(client, false);
            break;
        case "ping":
            write(oob("pong", "{}"));
            break;
        case "pong":
            break;
        default:
            System.err.println("WS unknown c2s frame type \"" + type + "\", dropped");
            dropped("unknown frame type \"" + type + "\"");
            break;
        }
    }

    /**
     * Tell the client a frame it sent was thrown away.
     *
     * <p>An out-of-band {@code notice} ({@code seq: 0}, amendment M10 -- it
     * belongs to no session stream and is not in the frame log), because the
     * alternative was silence: a client whose frames are being dropped had no
     * way at all to find out, and the stderr line it cannot see is not an
     * answer.
     */
    private void dropped(final String why) {
        final StringBuilder sb = new StringBuilder(96).append("{\"level\":\"warn\",\"title\":");
        Json.quote(sb, "Frame dropped");
        sb.append(",\"text\":");
        Json.quote(sb, why);
        sb.append('}');
        write(oob("notice", sb.toString()));
    }

    /**
     * Contract (b) and (c), in one place: {@code hello_ok} (on connect only),
     * then the last {@code state}, then the current {@code input} <b>if the
     * engine has asked for one</b>, then any ask still outstanding.
     *
     * <p><b>The {@code input} is conditional as of amendment M42.</b>  Before
     * the engine's first push there is no {@code input} to re-send -- only the
     * empty pre-engine struct -- and sending that says "the engine is asking
     * you something" to a client whose acts {@code applyAct} is still dropping
     * with {@code notice{title:"Not yet"}}.  The condition itself lives in
     * {@link Transport.Inbound#onResync()}, because {@code inputSeen} is
     * {@code WireGuiGame}'s to know; what this method promises is the order.
     *
     * @param ch      the channel to re-deliver on -- passed explicitly, because
     *                on connect it is the channel whose handshake just completed
     * @param onConnect whether to re-deliver the handshake frame as well
     */
    private void resend(final Channel ch, final boolean onConnect) {
        if (ch == null || !ch.isActive()) {
            return;
        }
        if (lastHello == null) {
            // Amendment M20.  The invariant "no s2c frame before hello_ok" must
            // not depend on handshake() being the only caller that checks: this
            // method's second half calls onResync(), which re-emits an `input`
            // with a fresh seq, and that is exactly the frame that used to
            // overtake the handshake.  Both callers are now guarded, here and at
            // the door, because one of them is one too few.
            System.err.println("WS RESEND skipped: no session yet (amendment M20)");
            return;
        }
        if (onConnect) {
            final String hello = lastHello;
            if (hello != null) {
                ch.writeAndFlush(new TextWebSocketFrame(hello));
                framesOut.incrementAndGet();
            }
        }
        final String state = lastState;
        if (state != null) {
            ch.writeAndFlush(new TextWebSocketFrame(state));
            framesOut.incrementAndGet();
        }
        // The `input` half is a REAL re-emission (logged, fresh seq) rather than
        // a replay of the cached frame, because onResync is the call whose guard
        // the M3 doorstep test exists to keep fixed: a resync must not arm
        // `inputSeen`, or a browser that autoconnects and then concedes removes a
        // player while Match.prepareAllZones is still iterating them.  That same
        // guard now also decides whether the frame is emitted AT ALL (amendment
        // M42): before the engine's first push, onResync writes its log line and
        // sends nothing, so this call may legitimately put no frame on the wire.
        // The fallback is for a transport with no inbound at all, and `lastInput`
        // is nulled by every `hello_ok` so it can never be another game's.
        if (inbound != null) {
            inbound.onResync();
        } else if (lastInput != null) {
            ch.writeAndFlush(new TextWebSocketFrame(lastInput));
            framesOut.incrementAndGet();
        }
        // Section 2.4: "and re-sends any ask still outstanding".  Verbatim, and
        // only while the reply pool still wants an answer for it.
        final Map<String, String> pending;
        synchronized (outstanding) {
            pending = new LinkedHashMap<>(outstanding);
        }
        for (final Map.Entry<String, String> e : pending.entrySet()) {
            final String askId = e.getKey();
            final String frame = e.getValue();
            if (pool != null && pool.isPending(askId)) {
                ch.writeAndFlush(new TextWebSocketFrame(frame));
                framesOut.incrementAndGet();
            }
        }
    }

    // ==================================================================
    // The handlers
    // ==================================================================

    /**
     * {@code GET /health} &rarr; 200 {@code ok} <b>once the session exists</b>,
     * 503 {@code starting} before that; everything else passes through
     * untouched.
     *
     * <p>It sits before {@code WebSocketServerProtocolHandler} so that the
     * upgrade request still reaches netty's handshake handler, and it forwards
     * websocket frames after the handshake for the same reason.  Readiness
     * polling has to work on the same port as the socket, or
     * {@code scripts/play.sh} would have two things to wait for.
     *
     * <p><b>Readiness is {@code lastHello != null}, not the bind.</b>  The port
     * is listening ~1.2 s before {@code openView} runs, and a client that
     * connected in that window got no {@code hello_ok} first: {@code resend}
     * found nothing to send and then re-emitted an {@code input} at
     * {@code seq: 1}, so the wire read {@code input, notice, notice, hello_ok}.
     * That breaks section 2.1 ("sent once, immediately after the socket opens,
     * before the first state") and contract (b), and a /health that says "ready"
     * while it is untrue is worse than one that makes the caller wait.  The
     * handshake closes the other half of the same hole.
     */
    private final class Health extends ChannelInboundHandlerAdapter {
        @Override
        public void channelRead(final ChannelHandlerContext ctx, final Object msg) {
            if (msg instanceof FullHttpRequest) {
                final FullHttpRequest req = (FullHttpRequest) msg;
                final String uri = req.uri();
                final int q = uri.indexOf('?');
                final String path = q < 0 ? uri : uri.substring(0, q);
                if ("/health".equals(path)) {
                    final boolean get = HttpMethod.GET.equals(req.method());
                    final boolean up = lastHello != null;
                    final HttpResponseStatus status = !get
                            ? HttpResponseStatus.METHOD_NOT_ALLOWED
                            : up ? HttpResponseStatus.OK : HttpResponseStatus.SERVICE_UNAVAILABLE;
                    final byte[] payload = (!get ? "method not allowed" : up ? "ok" : "starting")
                            .getBytes(StandardCharsets.US_ASCII);
                    final FullHttpResponse res = new DefaultFullHttpResponse(
                            HttpVersion.HTTP_1_1, status,
                            Unpooled.wrappedBuffer(payload));
                    res.headers().set(HttpHeaderNames.CONTENT_TYPE, "text/plain; charset=us-ascii");
                    res.headers().setInt(HttpHeaderNames.CONTENT_LENGTH, payload.length);
                    res.headers().set(HttpHeaderNames.CONNECTION, HttpHeaderValues.CLOSE);
                    ReferenceCountUtil.release(msg);
                    ctx.writeAndFlush(res).addListener(ChannelFutureListener.CLOSE);
                    return;
                }
            }
            ctx.fireChannelRead(msg);
        }
    }

    /** The frame handler: one text frame in, one protocol frame dispatched. */
    private final class WsHandler extends ChannelInboundHandlerAdapter {

        /** True on the one channel that holds the seat; false on a refused one. */
        private boolean owner;

        @Override
        public void userEventTriggered(final ChannelHandlerContext ctx, final Object evt) {
            if (evt instanceof WebSocketServerProtocolHandler.HandshakeComplete) {
                handshake(ctx);
                return;
            }
            ctx.fireUserEventTriggered(evt);
        }

        private void handshake(final ChannelHandlerContext ctx) {
            if (closed) {
                refuse(ctx, "the game is over and this server is closing");
                return;
            }
            if (connected()) {
                // Contract (c): one client at a time.  Two boards answering the
                // same prompt is not a feature we can make coherent, and the
                // honest failure is to say so rather than to interleave them.
                refuse(ctx, "another client is already connected to this game");
                return;
            }
            owner = true;
            client = ctx.channel();
            connects.incrementAndGet();
            System.err.println("WS CONNECT " + ctx.channel().remoteAddress()
                    + " (connection #" + connects.get() + ")");
            if (pool != null) {
                // Belt and braces: channelInactive already lifted the latch a
                // disconnect's cancelAll() set, so an ask raised while nobody
                // was connected could park.  Lifting it again here costs
                // nothing and keeps "a connected client can always be asked"
                // true even if this channel is the first one ever.
                pool.reopen();
            }
            if (lastHello == null) {
                // The session does not exist yet -- this connection beat
                // openView to the port.  Send nothing: the natural hello_ok +
                // state + input that openView is about to emit reach this
                // channel in order, and section 2.1's "hello_ok first" stays
                // true.  resend() here would have found no hello, sent no state,
                // and then called onResync(), putting an `input` on the wire at
                // seq 1 AHEAD of the handshake frame.
                //
                // This is HALF the window (M15).  The other half is inbound and
                // is amendment M20: see WsHandler.admitted().  resend() carries
                // this same check at its own top, so neither half depends on
                // the other being the only path.
                System.err.println("WS CONNECT before the session exists -- "
                        + "no resend; hello_ok + state + input follow from openView");
                return;
            }
            resend(ctx.channel(), true);
        }

        private void refuse(final ChannelHandlerContext ctx, final String why) {
            refusals.incrementAndGet();
            System.err.println("WS REFUSED " + ctx.channel().remoteAddress() + ": " + why);
            final StringBuilder sb = new StringBuilder(96).append("{\"level\":\"error\",\"title\":");
            Json.quote(sb, "Connection refused");
            sb.append(",\"text\":");
            Json.quote(sb, why);
            sb.append('}');
            ctx.writeAndFlush(new TextWebSocketFrame(oob("notice", sb.toString())));
            ctx.writeAndFlush(new CloseWebSocketFrame(REFUSED_CLOSE_CODE, why))
               .addListener(ChannelFutureListener.CLOSE);
        }

        @Override
        public void channelRead(final ChannelHandlerContext ctx, final Object msg) {
            if (msg instanceof TextWebSocketFrame) {
                final String text = ((TextWebSocketFrame) msg).text();
                try {
                    if (owner && admitted("a text frame")) {
                        onText(text);
                    }
                } catch (final RuntimeException e) {
                    // A client frame must never take the server down: the whole
                    // point of the inbound asserts is that this thread is allowed
                    // to be wrong without wedging a game thread.
                    System.err.println("WS inbound frame failed: " + e);
                    e.printStackTrace();
                } finally {
                    ReferenceCountUtil.release(msg);
                }
                return;
            }
            if (msg instanceof WebSocketFrame) {
                // Binary frames: the protocol is text only (section 1).
                // Continuation frames no longer arrive here -- the
                // WebSocketFrameAggregator above reassembles them into one
                // TextWebSocketFrame -- so this branch is now what it always
                // claimed to be, and it says so rather than dropping in silence.
                if (owner && admitted("a binary frame")) {
                    dropped("the protocol is text frames only (section 1)");
                }
                ReferenceCountUtil.release(msg);
                return;
            }
            ctx.fireChannelRead(msg);
        }

        /**
         * <b>The whole inbound path is gated on the session existing</b>
         * (amendment <b>M20</b>).
         *
         * <p>M15 closed the connect half of the pre-handshake window -- a socket
         * that beats {@code openView} to the port is sent nothing, and
         * {@code /health} answers 503 until there is a session -- and left the
         * inbound half open.  A client that did not poll {@code /health} could
         * still send a frame in that window and get an answer to it <em>ahead of
         * the handshake</em>: an {@code act} came back as a {@code notice} at
         * {@code seq: 1} and a {@code resync} came back as an {@code input} at
         * {@code seq: 1}, which is byte for byte the {@code input, ...,
         * hello_ok} inversion M15's own row quotes as the bug.  Both are
         * reachable from the repo's own documented commands, because
         * {@code tools/ws-auto-play.mjs} and {@code tools/ws-smoke.mjs} both send
         * {@code resync} from their {@code open} handler.
         *
         * <p>Dropped with <b>no reply</b>, not buffered and not answered: the
         * reply would itself be a pre-handshake frame, and there is nothing a
         * pre-session frame could usefully ask for that {@code openView}'s own
         * {@code hello_ok} + {@code state} + {@code input} is not about to give
         * this channel anyway.  A client that wants to be sure it missed nothing
         * sends {@code resync} again after the handshake; a browser never needs
         * to, because contract (b) hands it all three unprompted.
         *
         * @return {@code true} when the frame may be dispatched
         */
        private boolean admitted(final String what) {
            if (lastHello != null) {
                return true;
            }
            preSessionDrops.incrementAndGet();
            System.err.println("WS PRE-SESSION c2s frame dropped (" + what
                    + "): the game has not started, so nothing is answered before hello_ok");
            return false;
        }

        @Override
        public void channelInactive(final ChannelHandlerContext ctx) {
            if (owner) {
                owner = false;
                client = null;
                System.err.println("WS DISCONNECT " + ctx.channel().remoteAddress()
                        + " -- cancelling " + (pool == null ? 0 : pool.pending()) + " pending ask(s)");
                if (inbound != null) {
                    // D15 extended: the cap on a socket ask is the connection's
                    // liveness.  This is the call that unparks every game thread
                    // parked on one, and it must run on a thread that is neither
                    // a game thread nor the EDT -- the netty event loop is both
                    // of those things not.
                    inbound.onDisconnect();
                }
                if (pool != null && !closed) {
                    // ...and the latch that call set is lifted again RIGHT HERE,
                    // not at the next handshake.  A socket disconnect is not the
                    // end of the seat (contract (c)), and a pool that stayed
                    // latched between the drop and the reconnect answered every
                    // ask raised in that window with its section 5.4 default
                    // instantly -- spending the player's decisions during a
                    // browser refresh, and making NO_CLIENT_ASK_TIMEOUT_MS
                    // unreachable after the first disconnect.  Now an ask raised
                    // with nobody connected parks up to that cap and `resend`
                    // hands it to whoever comes back inside it.  Not when
                    // `closed`: that is the shutdown path, where a winding-down
                    // game must not be able to park at all.
                    pool.reopen();
                }
            }
            ctx.fireChannelInactive();
        }

        @Override
        public void exceptionCaught(final ChannelHandlerContext ctx, final Throwable cause) {
            System.err.println("WS channel error: " + cause);
            ctx.close();
        }
    }

    // ==================================================================
    // Tiny JSON helpers (Jetty gives Long, Double, Object[], Map, Boolean)
    // ==================================================================

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(final Object o) {
        return o instanceof Map ? (Map<String, Object>) o : null;
    }

    /**
     * Write one parsed value back out as JSON text.
     *
     * <p>{@code Transport.Inbound.onAnswer} takes the raw text of
     * {@code answer.value} -- the same thing {@code AutoTransport} and
     * {@code ConsoleTransport} hand it -- and what arrives here has already been
     * through Jetty's parser.  Ints, arrays of ints and int-keyed objects are the
     * whole of section 5.2, so this is a small function on purpose.
     */
    static String writeValue(final Object v) {
        final StringBuilder sb = new StringBuilder(64);
        writeValue(sb, v);
        return sb.toString();
    }

    private static void writeValue(final StringBuilder sb, final Object v) {
        if (v == null) {
            sb.append("null");
        } else if (v instanceof String) {
            Json.quote(sb, (String) v);
        } else if (v instanceof Boolean) {
            sb.append(((Boolean) v).booleanValue() ? "true" : "false");
        } else if (v instanceof Long || v instanceof Integer || v instanceof Short
                || v instanceof Byte) {
            sb.append(((Number) v).longValue());
        } else if (v instanceof Number) {
            final double d = ((Number) v).doubleValue();
            if (d == Math.rint(d) && !Double.isInfinite(d)) {
                sb.append((long) d);           // 3.0 came in as an index, not a measurement
            } else {
                sb.append(d);
            }
        } else if (v instanceof Object[]) {
            sb.append('[');
            final Object[] a = (Object[]) v;
            for (int i = 0; i < a.length; i++) {
                if (i > 0) {
                    sb.append(',');
                }
                writeValue(sb, a[i]);
            }
            sb.append(']');
        } else if (v instanceof Map) {
            sb.append('{');
            boolean first = true;
            for (final Map.Entry<?, ?> e : ((Map<?, ?>) v).entrySet()) {
                if (!first) {
                    sb.append(',');
                }
                first = false;
                Json.quote(sb, String.valueOf(e.getKey()));
                sb.append(':');
                writeValue(sb, e.getValue());
            }
            sb.append('}');
        } else {
            Json.quote(sb, String.valueOf(v));
        }
    }
}
