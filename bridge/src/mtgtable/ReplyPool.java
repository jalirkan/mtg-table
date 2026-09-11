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
 * Shaped after Forge's own forge.gamemodes.net.ReplyPool (Card Forge project,
 * GPL-3.0-or-later), which is a Map<Integer,FutureTask> with
 * initialize/complete/get/cancelAll.  Ours adds the four things a browser needs
 * and a LAN client does not: a string key, a per-ask timeout, a dropped
 * duplicate answer, and a watchdog that says out loud when a game thread has
 * been parked for half a minute.
 */
package mtgtable;

import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * {@code askId -> pending answer}.  Registered and awaited on the <b>game
 * thread</b>; completed from {@value Transport#IO_THREAD_NAME} and from nowhere
 * else.
 *
 * <p>The value is the <b>raw JSON text</b> of one {@code answer.value}
 * ({@code docs/protocol.md} section 2.3), because a transport is a codec
 * boundary and not a place where game meaning lives.  {@code null} means "no
 * answer": a timeout, a disconnect, or a literal JSON {@code null}.  Protocol
 * invariant 6 -- <b>every ask must be answerable with null</b> -- is what makes
 * those three indistinguishable and safe.
 *
 * <h2>Rules</h2>
 *
 * <ul>
 *   <li><b>Register before push.</b>  {@link WireGuiGame} calls
 *       {@link #register} and only then hands the frame to the transport;
 *       otherwise a fast answer races the registration and is dropped as
 *       unknown.</li>
 *   <li><b>One ask at a time per game thread</b>, by construction: that thread
 *       is parked inside the ask.  {@link #pending()} above 1 means a second
 *       game thread (a subgame, a spectator seat) -- it is logged, never
 *       assumed away.</li>
 *   <li><b>A second answer for a completed askId is dropped</b> with a
 *       {@code notice} (protocol section 2.3), never applied.</li>
 *   <li><b>{@link #cancelAll()} on disconnect</b> completes every future with
 *       {@code null}, so the game degrades to its documented defaults and ends
 *       instead of wedging with no error.</li>
 * </ul>
 */
public final class ReplyPool {

    /** How often the watchdog says a game thread is still parked. */
    static final long WATCHDOG_MS = 30_000L;

    /**
     * The watchdog thread's name.  A constant because {@link HeadlessGuiBase}
     * asserts every thread name we create at class-init and
     * {@code tools/lint-bridge.sh} section 6 greps for it: a thread of ours named
     * {@code Game*} would pass {@code ThreadUtil.isGameThread()} and be allowed
     * to walk the view graph.
     */
    static final String WATCHDOG_THREAD_NAME = "mtg-table-watchdog";

    private final Map<String, CompletableFuture<String>> pool = new ConcurrentHashMap<>();
    /** askId -> what it is waiting for and since when, for the watchdog line. */
    private final Map<String, Pending> waiting = new ConcurrentHashMap<>();

    private volatile boolean closed;
    private Thread watchdog;

    /** Start the "ASK PENDING" watchdog.  Daemon; safe to call once. */
    public synchronized void startWatchdog() {
        if (watchdog != null) {
            return;
        }
        watchdog = new Thread(this::watch, WATCHDOG_THREAD_NAME);
        watchdog.setDaemon(true);
        watchdog.start();
    }

    /**
     * <b>Game thread.</b>  Register an askId before its frame is pushed.
     *
     * @param kind the ask kind, for the watchdog line only
     */
    public void register(final String askId, final String kind) {
        if (closed) {
            // Not an exception: the game thread may reach one more ask after a
            // disconnect, and the honest answer to it is "null", not a crash on
            // the rules engine's own thread.
            return;
        }
        pool.put(askId, new CompletableFuture<>());
        waiting.put(askId, new Pending(kind, System.nanoTime()));
    }

    /**
     * <b>Game thread only.</b>  Park until the answer arrives.
     *
     * @param timeoutMs {@code <= 0} waits forever (the console default)
     * @return the raw JSON text of {@code answer.value}, or {@code null} on
     *         timeout, disconnect, cancel, or a literal null answer
     */
    public String await(final String askId, final long timeoutMs) {
        final CompletableFuture<String> f = pool.get(askId);
        if (f == null) {
            return null;                       // never registered, or already resolved
        }
        try {
            return timeoutMs > 0 ? f.get(timeoutMs, TimeUnit.MILLISECONDS) : f.get();
        } catch (final TimeoutException e) {
            System.err.println("ASK TIMEOUT " + askId + " after " + timeoutMs + "ms -> null");
            return null;
        } catch (final InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        } catch (final ExecutionException e) {
            System.err.println("ASK FAILED " + askId + ": " + e.getCause());
            return null;
        } finally {
            pool.remove(askId);
            waiting.remove(askId);
        }
    }

    /**
     * <b>{@value Transport#IO_THREAD_NAME} only.</b>  Deliver an answer.
     *
     * @return false when the askId is unknown or already answered -- the caller
     *         then pushes {@code notice{level:"warn", title:"Late answer"}} and
     *         drops it (protocol section 2.3)
     */
    public boolean complete(final String askId, final String valueJson) {
        final CompletableFuture<String> f = pool.get(askId);
        if (f == null) {
            return false;
        }
        return f.complete(valueJson);          // false if a racing answer already won
    }

    /**
     * Disconnect / shutdown.  Unblocks every parked game thread with
     * {@code null}; after this, {@link #register} is a no-op so a game that is
     * still winding down cannot park again.
     */
    public void cancelAll() {
        closed = true;
        for (final Map.Entry<String, CompletableFuture<String>> e : pool.entrySet()) {
            e.getValue().complete(null);
        }
    }

    /** Whether an askId is still outstanding. */
    public boolean isPending(final String askId) {
        return pool.containsKey(askId);
    }

    /** How many asks are outstanding.  Above 1 means a second game thread. */
    public int pending() {
        return pool.size();
    }

    private void watch() {
        while (!closed) {
            try {
                Thread.sleep(WATCHDOG_MS);
            } catch (final InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
            final long now = System.nanoTime();
            for (final Map.Entry<String, Pending> e : waiting.entrySet()) {
                final long secs = (now - e.getValue().since) / 1_000_000_000L;
                if (secs >= WATCHDOG_MS / 1000L) {
                    // A wedged game thread must never be silent.
                    System.err.println("ASK PENDING " + e.getKey() + " " + e.getValue().kind
                            + " " + secs + "s");
                }
            }
        }
    }

    /** What one parked game thread is waiting for. */
    private static final class Pending {
        private final String kind;
        private final long since;

        Pending(final String kind, final long since) {
            this.kind = kind == null ? "?" : kind;
            this.since = since;
        }
    }
}
