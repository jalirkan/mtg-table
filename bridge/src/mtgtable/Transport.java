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

import forge.gui.FThreads;
import forge.util.ThreadUtil;

/**
 * The one seam between {@link WireGuiGame} and whatever is carrying frames --
 * a console, a scripted policy, or (M3) a WebSocket.
 *
 * <p>Everything the transport sees is a <b>complete protocol envelope</b>
 * ({@code docs/protocol.md} section 1: {@code {v,seq,t,type,body}}) as a JSON
 * string, and everything it hands back is the raw JSON text of one
 * {@code answer.value}.  Nothing in a transport touches a Forge view: that is
 * what keeps the thread rules of {@code docs/research/07-wireguigame-spec.md}
 * section 2.5 checkable by reading one file.
 *
 * <h2>The three thread rules (report 07 section 2.5)</h2>
 *
 * <ul>
 *   <li><b>R1</b> -- a push may touch only {@code getId()} on a view.  Pushes
 *       arrive on four different threads; everything else in a frame comes from
 *       {@code Snap.state()}, which runs on the game thread.</li>
 *   <li><b>R2</b> -- <b>only the game thread may block.</b> {@link #ask} asserts
 *       it.  {@code openZones} / {@code tempShowZones} arrive on the EDT, and a
 *       value-returning method that parks the EDT stalls every prompt in the
 *       game with no error at all.</li>
 *   <li><b>R3</b> -- no thread we create may be named {@code Game*}, because
 *       {@code ThreadUtil.isGameThread()} is a bare
 *       {@code getName().startsWith("Game")}.  Ours are {@code mtg-table-EDT},
 *       {@value #IO_THREAD_NAME}, {@code mtg-table-log} and (M3)
 *       {@code mtg-table-ws}.</li>
 * </ul>
 */
public interface Transport {

    /**
     * The name every inbound reader thread must carry.  Asserted by
     * {@link #assertNotGameThread}: it does not start with {@code "Game"}, so
     * Forge will never mistake an answer-delivery thread for a game thread.
     */
    String IO_THREAD_NAME = "mtg-table-io";

    /**
     * Called once, before {@code HostedMatch.startMatch}.  Starts the reader
     * thread, if the transport has one.
     *
     * @param in   where inbound {@code act} / {@code answer} lines go
     * @param pool the shared reply pool; {@link #ask} awaits on it and the
     *             inbound path completes it, so both ends must see the same one
     */
    void start(Inbound in, ReplyPool pool);

    /**
     * Any thread, never blocks, preserves order.
     *
     * @param frameJson a complete protocol envelope
     */
    void push(String frameJson);

    /**
     * <b>Game thread only.</b>  Push the {@code ask} frame and park until an
     * answer, a timeout, or {@code cancelAll()}.
     *
     * <p>The caller has already called {@link ReplyPool#register} for this
     * {@code askId} -- register-before-push, so a fast answer cannot race the
     * registration.
     *
     * @return the raw JSON text of {@code answer.value}, or {@code null} for
     *         "no answer" (timeout, disconnect, or a literal {@code null}).
     *         Every caller must have a documented non-null-safe default:
     *         protocol section 5.4.
     */
    String ask(String askId, String askFrameJson, long timeoutMs);

    /**
     * How long this transport is willing to leave the game thread parked for
     * one ask of this kind.  {@code 0} means forever -- a human at a terminal is
     * allowed to think, and there is no disconnect to recover from.
     */
    long askTimeoutMs(String kind);

    /** Idempotent.  Unblocks every parked game thread via {@link ReplyPool#cancelAll}. */
    void close();

    /**
     * The inbound half, implemented by {@link WireGuiGame}.
     *
     * <p><b>Called on any thread that is neither a game thread nor the EDT</b>,
     * and asserted as exactly that ({@link #assertNotGameThread} +
     * {@link #assertNotEdt} at the top of every method).  Never a game thread:
     * it is parked inside the ask, and completing the future it is waiting on
     * from that same thread is a self-deadlock.  Never the EDT: an act hops
     * <em>to</em> the EDT from here, which it could not do if it were already
     * there, and an answer delivered on the EDT would serialise behind every
     * prompt.
     *
     * <p>In practice that is {@value #IO_THREAD_NAME}, the reader thread every
     * transport starts, with <b>two named exceptions</b> -- both of them
     * one-shot, both of them asserted like any other caller:
     *
     * <ul>
     *   <li>{@code AutoTransport}'s progress watchdog
     *       ({@code mtg-table-auto-watchdog}) calls {@link #onAct} to concede
     *       when no frame has arrived for a minute.  It cannot go through the
     *       reader thread: the reader is what is not moving.</li>
     *   <li>{@code ConsoleTransport}'s quit thread ({@code mtg-table-quit})
     *       calls {@link #onDisconnect} after a concede, so that a game that
     *       never reports {@code over} still unblocks every parked ask.  It
     *       cannot go through the reader thread either: the reader has already
     *       stopped, which is what quitting means.</li>
     * </ul>
     *
     * <p>This paragraph used to say "called on {@value #IO_THREAD_NAME}", which
     * those two calls made false.  The contract that matters is the one the
     * asserts enforce, so it is the one written down: M3's WebSocket transport
     * was written against this comment, and it has <b>no</b> reader thread at
     * all -- {@code WsTransport} dispatches straight from netty's event loop
     * ({@code mtg-table-ws}), which is neither a game thread nor the EDT and
     * therefore satisfies the contract exactly as written.  That is the third
     * caller, and it is why the rule is phrased as a property rather than as a
     * thread name.
     */
    interface Inbound {
        /** An unsolicited user action: {@code docs/protocol.md} section 2.2. */
        void onAct(String action, java.util.Map<String, Object> body);

        /**
         * The answer to an outstanding ask.
         *
         * @param valueJson raw JSON text of {@code answer.value}, or null
         */
        void onAnswer(String askId, String valueJson);

        /** Re-send a fresh {@code state} + {@code input}: section 2.4. */
        void onResync();

        /**
         * EOF / socket close: complete every pending ask with null and degrade.
         *
         * <p>Asserts the same two things {@link #onAct} and {@link #onAnswer}
         * do -- it unparks game threads, so it must not be one of them -- which
         * is what keeps the thread model above checkable by reading one file
         * rather than by trusting a comment.
         */
        void onDisconnect();
    }

    // ==================================================================
    // The three asserts.  Report 07 section 6.2: "write these in the first hour".
    // ==================================================================

    /** Throw unless we are on a Forge game thread. */
    static void assertGameThread(final String what) {
        if (!ThreadUtil.isGameThread()) {
            throw new IllegalStateException(what + " must run on the game thread, not \""
                    + Thread.currentThread().getName() + "\" -- only the game thread may block "
                    + "(report 07 R2), and only it may walk the view graph.");
        }
    }

    /**
     * Throw if we are on a game thread.  The inbound path completes a future the
     * game thread is waiting on; doing that <em>from</em> that thread is a
     * self-deadlock.
     */
    static void assertNotGameThread(final String what) {
        if (ThreadUtil.isGameThread()) {
            throw new IllegalStateException(what + " must not run on the game thread (\""
                    + Thread.currentThread().getName() + "\"): it would be completing the future "
                    + "it is itself parked on.");
        }
    }

    /**
     * Throw if we are on our virtual EDT.  Answers are delivered from
     * {@value #IO_THREAD_NAME} and from nowhere else (protocol invariant 2);
     * an answer delivered on the EDT would serialise behind every prompt.
     */
    static void assertNotEdt(final String what) {
        if (FThreads.isGuiThread()) {
            throw new IllegalStateException(what + " must not run on the mtg-table EDT: "
                    + "answers are delivered on " + IO_THREAD_NAME + " and nowhere else "
                    + "(protocol invariant 2).");
        }
    }
}
