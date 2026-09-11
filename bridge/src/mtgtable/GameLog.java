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
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

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
 * emits (M2's EDT-side {@code input} frames will).
 */
public final class GameLog implements AutoCloseable {

    /** Protocol major version.  {@code docs/protocol.md} section 1. */
    public static final int PROTOCOL_VERSION = 1;

    /** The name of the appender thread.  Asserted by nothing; useful in a stack dump. */
    public static final String THREAD_NAME = "mtg-table-log";

    /** Queue sentinel: identity-compared, so it can never collide with a frame. */
    private static final String POISON = new String("--mtg-table-log-eof--");

    private final File file;
    private final BlockingQueue<String> queue = new LinkedBlockingQueue<>();
    private final Thread thread;
    private final Counting counting;
    private final Writer writer;

    /** Set by the appender thread on the first write failure; re-thrown at close. */
    private volatile IOException failure;

    private long lines;
    private int seqS2c;
    private int seqC2s;
    private boolean headerWritten;
    private boolean closed;

    /**
     * Open a log, creating parent directories as needed.  Truncates an existing
     * file: a fixture is regenerated, never appended to.
     */
    public GameLog(final File out) throws IOException {
        this.file = out.getAbsoluteFile();
        final File dir = file.getParentFile();
        if (dir != null && !dir.isDirectory() && !dir.mkdirs()) {
            throw new IOException("cannot create directory " + dir);
        }
        this.counting = new Counting(new BufferedOutputStream(new FileOutputStream(file), 1 << 16));
        this.writer = new OutputStreamWriter(counting, StandardCharsets.UTF_8);
        this.thread = new Thread(this::drain, THREAD_NAME);
        this.thread.setDaemon(true);
        this.thread.start();
    }

    /** The file being written. */
    public File file() {
        return file;
    }

    /**
     * Write line 0, the session header.  Must be called before any frame, and
     * only once -- a reader distinguishes the header from a frame by its
     * {@code "kind":"session"} field, and a header in the middle of a file is
     * meaningless.
     *
     * @param json a complete JSON object, produced by {@link Json.JsonOut}
     */
    public synchronized void header(final String json) {
        if (headerWritten) {
            throw new IllegalStateException("the session header has already been written");
        }
        headerWritten = true;
        enqueue(json);
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

    private int frame(final String dir, final int seq, final String type, final String body) {
        if (!headerWritten) {
            throw new IllegalStateException("frame written before the session header");
        }
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
        return seq;
    }

    private void enqueue(final String line) {
        if (closed) {
            throw new IllegalStateException("log already closed: " + file);
        }
        queue.add(line);
    }

    /** How many lines have been handed to the appender, header included. */
    public synchronized long lines() {
        return lines;
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
     * @throws IOException if any write failed
     */
    @Override
    public synchronized void close() throws IOException {
        if (closed) {
            return;
        }
        closed = true;
        queue.add(POISON);
        try {
            thread.join(30_000L);
        } catch (final InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        if (failure != null) {
            throw failure;
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
                synchronized (this) {
                    lines++;
                }
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
