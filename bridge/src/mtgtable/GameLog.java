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

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.atomic.AtomicLong;
import java.util.zip.GZIPOutputStream;

/**
 * The JSONL frame log of {@code docs/protocol.md} section 8.
 *
 * <p>One file per game.  Line 0 is the session header
 * ({@code {"v":1,"kind":"session",...}}); every later line is a protocol
 * envelope with one extra field, {@code dir}:
 *
 * <pre>
 *   {"v":1,"seq":128,"t":1757600000123,"dir":"s2c","type":"state","body":{...}}
 * </pre>
 *
 * <h2>Why a thread</h2>
 *
 * The frames are produced on the Forge <b>game thread</b>, which is the thread
 * the rules engine runs on.  Blocking it on a disk write -- worse, on an
 * {@code fsync}-ish flush per line -- would put file-system latency inside the
 * game loop.  So the producer does nothing but format a string and hand it to
 * an unbounded queue; a single daemon thread named {@value #THREAD_NAME} drains
 * the queue and writes.
 *
 * <p><b>Flushed per line</b>, deliberately: a killed JVM (and a crash inside
 * Forge is the normal way this program dies during development) still leaves a
 * complete, parseable file up to the last frame. A truncated final line would
 * be a bug report nobody can read.
 *
 * <p>{@code seq} is assigned on the <b>producer</b> thread, so file order and
 * sequence order agree -- a FIFO queue and a single consumer preserve it.
 *
 * <p>Thread safety: {@link #s2c} / {@link #c2s} are synchronized on this object
 * so the two counters and the queue stay consistent if a second thread ever
 * emits (M2's EDT-side {@code input} frames do).
 *
 * <h2>The appender thread never takes this object's monitor</h2>
 *
 * <p>It used to, for one line: {@code drain()} incremented a plain {@code long}
 * inside {@code synchronized (this)} after every write, while {@link #close()}
 * was itself {@code synchronized} and held that same monitor for the whole of
 * {@code thread.join(30s)}.  If the appender had a line in flight when
 * {@code close()} took the monitor it could never reach the {@code POISON}, so
 * the join <b>always</b> timed out: measured at 30,000 ms for one queued line,
 * and 12,089 of 20,001 lines on disk when {@code close()} returned for a large
 * one -- with {@code System.exit} next in {@code MtgTable.main} killing the
 * daemon appender mid-file.  It fired in real runs (two of six M2 games spent
 * exactly 30 s in {@code close()}), and every {@code frames = N} and
 * {@code bytes} a summary printed after it was wrong.
 *
 * <p>So: the counter is an {@link AtomicLong}, the appender takes no lock at
 * all, and {@code close()} holds the monitor only long enough to set
 * {@code closed} and queue the {@code POISON} -- the join happens outside it.
 * A join that still times out {@code throw}s, because a silently truncated file
 * is worse than a failure.  {@code mtgtable.GameLogSelfTest}, run by
 * {@code bridge/build.sh}, is the regression test.
 */
public final class GameLog implements AutoCloseable {

    /** Protocol major version.  {@code docs/protocol.md} section 1. */
    public static final int PROTOCOL_VERSION = 1;

    /**
     * The name of the appender thread.  Asserted at class-init by
     * {@link HeadlessGuiBase} (it must not start with {@code "Game"}, which is
     * the whole of {@code ThreadUtil.isGameThread()}) and by
     * {@code tools/lint-bridge.sh} section 6.
     */
    public static final String THREAD_NAME = "mtg-table-log";

    /**
     * How long {@link #close()} waits for the appender to reach the
     * {@code POISON}.  A correct close returns in well under a millisecond; this
     * bound exists so a wedged appender is a loud failure rather than a hang.
     */
    public static final long CLOSE_TIMEOUT_MS = 30_000L;

    /**
     * How many frames may be held before the session header arrives.  A frame
     * emitted before {@link #header} is rare and bounded in practice (a notice
     * from an act typed ahead of the game, and the {@code over} of a concede
     * before the first prompt), and a buffer that can grow without limit in a
     * path nobody watches is its own bug.
     */
    private static final int PRE_HEADER_MAX = 256;

    /** Queue sentinel: identity-compared, so it can never collide with a frame. */
    private static final String POISON = new String("--mtg-table-log-eof--");

    private final File file;
    private final BlockingQueue<String> queue = new LinkedBlockingQueue<>();
    private final Thread thread;
    private final Counting counting;
    private final Writer writer;

    /** Set by the appender thread on the first write failure; re-thrown at close. */
    private volatile IOException failure;

    /**
     * Lines handed to the appender and written.  Atomic, <b>not</b> guarded by
     * this object's monitor: the appender must never need a lock the closer
     * might be holding (see the class javadoc).
     */
    private final AtomicLong lines = new AtomicLong();

    /** Frames produced before {@link #header}; flushed in order when it arrives. */
    private final List<String> preHeader = new ArrayList<>();

    /** How many pre-header frames were dropped for exceeding {@link #PRE_HEADER_MAX}. */
    private int preHeaderDropped;

    private int seqS2c;
    private int seqC2s;
    private int seqAi;
    /** Frames produced so far (header excluded): the next frame's index in a reader's {@code frames[]}. */
    private int framesProduced;
    /** The last {@code state} frame's s2c seq and frame index, -1 before the first (D347). */
    private int lastStateSeq = -1;
    private int lastStateIndex = -1;
    private boolean headerWritten;

    /** Written under this object's monitor in {@link #close()}; read from everywhere. */
    private volatile boolean closed;

    /**
     * Open a log, creating parent directories as needed.  Truncates an existing
     * file: a fixture is regenerated, never appended to.
     */
    public GameLog(final File out) throws IOException {
        this(out, false);
    }

    /**
     * Open a log, gzipped when {@code gzip} is true (D315: the cube lab's
     * in-process recordings, {@code .jsonl.gz}).  The deflater sits above the
     * byte counter, so {@link #bytes()} is the size on disk.  Lines are still
     * flushed one at a time to the deflater; without a sync flush the
     * compressed stream reaches the disk in the deflater's own blocks, so a
     * killed JVM leaves a gzip that ends early -- readers take the lines up to
     * where it stops (a game with no {@code over} gives no training rows), and
     * a sync flush per line would cost most of the compression.
     */
    public GameLog(final File out, final boolean gzip) throws IOException {
        this.file = out.getAbsoluteFile();
        final File dir = file.getParentFile();
        if (dir != null) {
            // Idempotent, and safe against a second writer creating the same
            // folder: the atlas's workers (two JVMs at atlas-selftest --jobs 2)
            // open their first logs in one fresh frames/ at once, and the old
            // isDirectory()-then-mkdirs() threw "cannot create directory" in the
            // worker whose mkdirs() lost the race.  createDirectories accepts a
            // directory that already exists, and still throws if the path is a
            // file.  The folder is shared on purpose -- each log's file name is
            // its own game, branch and seat -- so only its creation can race.
            Files.createDirectories(dir.toPath());
        }
        this.counting = new Counting(new BufferedOutputStream(new FileOutputStream(file), 1 << 16));
        this.writer = new OutputStreamWriter(gzip ? new GZIPOutputStream(counting, 1 << 16) : counting,
                                             StandardCharsets.UTF_8);
        this.thread = new Thread(this::drain, THREAD_NAME);
        this.thread.setDaemon(true);
        this.thread.start();
    }

    /** The file being written. */
    public File file() {
        return file;
    }

    /**
     * Write line 0, the session header.  Exactly once, and before any frame
     * reaches the file -- a reader distinguishes the header from a frame by its
     * position, and a header in the middle of a file is meaningless.
     *
     * <p>Frames produced <em>before</em> this call are held (up to
     * {@link #PRE_HEADER_MAX}) and written immediately after it, in the order
     * they were produced -- they are not dropped and they do not get a
     * {@code seq} of 0.  {@code docs/protocol.md} section 1 says {@code seq} is
     * monotonic per direction and starts at 1, so an emitter that could produce
     * a frame before the seat exists must still number it.
     *
     * @param json a complete JSON object, produced by {@link Json.JsonOut}
     */
    public synchronized void header(final String json) {
        if (headerWritten) {
            throw new IllegalStateException("the session header has already been written");
        }
        if (closed) {
            throw new IllegalStateException("log already closed: " + file);
        }
        headerWritten = true;
        queue.add(json);                       // line 0, before anything held
        for (final String held : preHeader) {
            queue.add(held);
        }
        preHeader.clear();
    }

    /**
     * Append a server-to-client frame.
     *
     * @param type the protocol message type, e.g. {@code state}
     * @param body a complete JSON <em>object</em> for the body
     * @return the {@code seq} assigned to this frame
     */
    public synchronized int s2c(final String type, final String body) {
        return frame("s2c", ++seqS2c, type, body);
    }

    /**
     * Append a client-to-server frame.  Nothing in M1 produces one -- there is
     * no client -- but the direction exists so a recorded game and a played
     * game are the same file format.
     *
     * @return the {@code seq} assigned to this frame
     */
    public synchronized int c2s(final String type, final String body) {
        return frame("c2s", ++seqC2s, type, body);
    }

    /**
     * Append a recorder-only line (protocol amendment M55, D347): {@code dir}
     * {@code "ai"}, its own {@code seq} series, never on the wire.  Three
     * types, each written into that seat's own recording only: {@code decision}
     * (an AI seat's decision record), the game's closing summary
     * {@code decisions}, and {@code reveal} (the card ids Forge revealed to the
     * seat, amendment M78, D496).
     *
     * @return the {@code seq} assigned
     */
    public synchronized int ai(final String type, final String body) {
        return frame("ai", ++seqAi, type, body);
    }

    /** {@code {frame index, s2c seq}} of the last {@code state} frame, {@code {-1, -1}} before the first. */
    public synchronized int[] lastState() {
        return new int[] {lastStateIndex, lastStateSeq};
    }

    private int frame(final String dir, final int seq, final String type, final String body) {
        if (body == null || body.isEmpty() || body.charAt(0) != '{') {
            // docs/protocol.md section 1: "body" is always an object, never a
            // scalar or array, never absent.
            throw new IllegalArgumentException("frame body must be a JSON object, got: " + body);
        }
        final StringBuilder sb = new StringBuilder(body.length() + 96);
        sb.append("{\"v\":").append(PROTOCOL_VERSION)
          .append(",\"seq\":").append(seq)
          .append(",\"t\":").append(System.currentTimeMillis())
          .append(",\"dir\":");
        Json.quote(sb, dir);
        sb.append(",\"type\":");
        Json.quote(sb, type);
        sb.append(",\"body\":").append(body).append('}');
        enqueue(sb.toString());
        if ("s2c".equals(dir) && "state".equals(type)) {
            lastStateSeq = seq;
            lastStateIndex = framesProduced;
        }
        framesProduced++;
        return seq;
    }

    /** Callers hold this object's monitor; the appender never does. */
    private void enqueue(final String line) {
        if (closed) {
            throw new IllegalStateException("log already closed: " + file);
        }
        if (!headerWritten) {
            // Line 0 must be the session header, so this frame waits for it
            // rather than being thrown away with a seq of 0.
            if (preHeader.size() < PRE_HEADER_MAX) {
                preHeader.add(line);
            } else {
                preHeaderDropped++;
            }
            return;
        }
        queue.add(line);
    }

    /**
     * How many lines the appender has <b>written</b>, header included.  A plain
     * atomic read: it must not be able to block behind {@link #close()}.
     */
    public long lines() {
        return lines.get();
    }

    /** How many frames are still waiting for a session header that has not come. */
    public synchronized int pendingBeforeHeader() {
        return preHeader.size() + preHeaderDropped;
    }

    /** How many bytes are on disk.  Accurate once {@link #close()} has returned. */
    public long bytes() {
        return counting.count;
    }

    /** The last {@code seq} assigned in the server-to-client direction. */
    public synchronized int lastSeqS2c() {
        return seqS2c;
    }

    /**
     * Drain, flush and close.  Blocks until the appender has written every
     * queued line, so the file is complete when this returns.
     *
     * <p><b>Not {@code synchronized}.</b>  The monitor is held only for the two
     * statements that need it -- and never across the {@link Thread#join} --
     * because holding it there is precisely the self-deadlock the class javadoc
     * describes.  The {@code POISON} is queued <em>inside</em> that block, under
     * the same monitor every {@link #enqueue} holds, so no frame can be queued
     * behind it and then silently lost.
     *
     * @throws IOException if any write failed, or if the appender did not finish
     *                     within {@link #CLOSE_TIMEOUT_MS} -- in which case the
     *                     file on disk is incomplete and saying so is the whole
     *                     point
     */
    @Override
    public void close() throws IOException {
        final int held;
        synchronized (this) {
            if (closed) {
                return;
            }
            closed = true;
            queue.add(POISON);
            held = preHeader.size() + preHeaderDropped;
        }
        if (held > 0) {
            // No header ever arrived, so there is no line 0 and the file cannot
            // be written at all (a reader identifies the header by position).
            System.err.println("GAME LOG: " + held + " frame(s) were produced before the session "
                + "header, which never arrived -- " + file + " is empty");
        }
        boolean joined = false;
        try {
            thread.join(CLOSE_TIMEOUT_MS);
            joined = !thread.isAlive();
        } catch (final InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        if (failure != null) {
            throw failure;
        }
        if (!joined) {
            throw new IOException("the frame-log appender (" + THREAD_NAME + ") did not finish "
                + "within " + CLOSE_TIMEOUT_MS + " ms: " + file + " is INCOMPLETE ("
                + lines.get() + " line(s) written, " + queue.size() + " still queued)");
        }
    }

    // ------------------------------------------------------------------

    private void drain() {
        try {
            while (true) {
                final String line = queue.take();
                //noinspection StringEquality -- identity is the point
                if (line == POISON) {
                    break;
                }
                writer.write(line);
                writer.write('\n');
                // Per line.  See the class javadoc: a killed JVM must still
                // leave a file that parses to its last complete frame.
                writer.flush();
                // NO synchronized block here.  See the class javadoc: this
                // thread taking the same monitor close() holds is what made
                // close() wait out its whole timeout and return a truncated file.
                lines.incrementAndGet();
            }
        } catch (final InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (final IOException e) {
            if (failure == null) {
                failure = e;
            }
        } finally {
            try {
                writer.close();
            } catch (final IOException e) {
                if (failure == null) {
                    failure = e;
                }
            }
        }
    }

    /** Counts bytes actually written, so the run summary can report file size honestly. */
    private static final class Counting extends OutputStream {
        private final OutputStream out;
        private volatile long count;

        Counting(final OutputStream out) {
            this.out = out;
        }

        @Override public void write(final int b) throws IOException {
            out.write(b);
            count++;
        }

        @Override public void write(final byte[] b, final int off, final int len) throws IOException {
            out.write(b, off, len);
            count += len;
        }

        @Override public void flush() throws IOException {
            out.flush();
        }

        @Override public void close() throws IOException {
            out.close();
        }
    }
}
