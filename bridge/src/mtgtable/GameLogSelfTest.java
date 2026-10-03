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

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;

/**
 * Unit check for {@link GameLog}, run by {@code bridge/build.sh} after every
 * compile beside {@link JsonSelfTest} and {@link AskSelfTest}, and for the same
 * reason: there is no JUnit on this machine, and the defect this file exists to
 * catch is invisible in a passing run.
 *
 * <h2>The defect</h2>
 *
 * <p>{@code close()} used to be {@code synchronized} and to hold this object's
 * monitor for the whole of {@code thread.join(30_000)}, while the appender took
 * that same monitor after every written line.  With a line in flight the
 * appender could never reach the {@code POISON}, so the join always timed out
 * and {@code close()} returned a <b>truncated</b> file -- measured at
 * {@code n=1 -> 30,000 ms}, {@code n=20000 -> 12,089 of 20,001 lines on disk},
 * with {@code System.exit} next in {@code MtgTable.main} to kill the daemon
 * appender mid-write.  Every {@code frames = N log line(s)} and {@code bytes}
 * a run summary printed after that was wrong, and
 * {@code tools/check-all.sh}'s "the last frame is `over`" assertion was
 * passing on timing rather than on a guarantee.
 *
 * <p>So the assertions below are about <b>time and completeness</b>, not about
 * shape: close in under a second, and exactly the lines that were enqueued.
 */
public final class GameLogSelfTest {

    private GameLogSelfTest() { }

    /** Enough lines that the appender is certainly mid-write when close() is called. */
    private static final int BULK = 20_000;

    /** A correct close is sub-millisecond; the broken one took the full 30 s. */
    private static final long CLOSE_BUDGET_MS = 1_000L;

    private static int checks;
    private static final List<String> FAILURES = new ArrayList<>();

    private static File dir;

    public static void main(final String[] args) throws Exception {
        dir = new File(args.length > 0 ? args[0] : "var/gamelog-selftest").getAbsoluteFile();
        if (!dir.isDirectory() && !dir.mkdirs()) {
            System.out.println("GameLogSelfTest: cannot create " + dir);
            System.exit(1);
        }

        closeIsFastAndComplete();
        preHeaderFramesAreHeldNotNumberedZero();
        sequencesArePerDirection();
        gzipIsTheSameLines();
        misuse();

        System.out.println("GameLogSelfTest: " + checks + " check(s), " + FAILURES.size() + " failure(s)");
        for (final String f : FAILURES) {
            System.out.println("  FAIL " + f);
        }
        System.exit(FAILURES.isEmpty() ? 0 : 1);
    }

    // ------------------------------------------------------------------

    /**
     * THE regression test: enqueue {@value #BULK} frames, close, and require
     * that close returned promptly and that the file holds exactly
     * {@code BULK + 1} lines (the header plus every frame).
     */
    private static void closeIsFastAndComplete() throws IOException {
        final File out = new File(dir, "bulk.jsonl");
        final GameLog log = new GameLog(out);
        log.header("{\"v\":1,\"kind\":\"session\",\"gameId\":\"selftest\"}");
        for (int i = 0; i < BULK; i++) {
            log.s2c("state", "{\"i\":" + i + "}");
        }
        final long t0 = System.nanoTime();
        log.close();
        final long ms = (System.nanoTime() - t0) / 1_000_000L;

        expect("close(" + BULK + " queued) returned in " + ms + " ms, budget " + CLOSE_BUDGET_MS,
               ms < CLOSE_BUDGET_MS);
        final List<String> got = Files.readAllLines(out.toPath(), StandardCharsets.UTF_8);
        eq("every enqueued line is on disk", BULK + 1, got.size());
        eq("lines() counts what was written", (long) (BULK + 1), log.lines());
        expect("bytes() is the file size", log.bytes() == out.length());
        expect("line 0 is the session header", got.get(0).contains("\"kind\":\"session\""));
        expect("the first frame is seq 1", got.get(1).contains("\"seq\":1,"));
        expect("the last frame is seq " + BULK, got.get(BULK).contains("\"seq\":" + BULK + ","));
        expect("the last line is the last frame body",
               got.get(BULK).contains("{\"i\":" + (BULK - 1) + "}"));

        // Idempotent, and still cheap.
        final long t1 = System.nanoTime();
        log.close();
        expect("a second close() is a no-op", (System.nanoTime() - t1) / 1_000_000L < CLOSE_BUDGET_MS);
    }

    /**
     * A frame produced before the seat exists (an act typed ahead of the game,
     * the {@code over} of a concede during the pre-game prompts) is held until
     * the header and written after it, in order.  It is never numbered 0:
     * {@code docs/protocol.md} section 1 says {@code seq} starts at 1 and a gap
     * means a dropped frame.
     */
    private static void preHeaderFramesAreHeldNotNumberedZero() throws IOException {
        final File out = new File(dir, "pre-header.jsonl");
        final GameLog log = new GameLog(out);
        eq("a frame before the header gets seq 1", 1, log.s2c("notice", "{\"title\":\"Not yet\"}"));
        eq("and the next gets seq 2", 2, log.s2c("over", "{\"winner\":null}"));
        eq("both are waiting for a header", 2, log.pendingBeforeHeader());
        log.header("{\"v\":1,\"kind\":\"session\"}");
        eq("the header released them", 0, log.pendingBeforeHeader());
        eq("and the frame after it continues the sequence", 3, log.s2c("state", "{\"turn\":1}"));
        log.close();

        final List<String> got = Files.readAllLines(out.toPath(), StandardCharsets.UTF_8);
        eq("header plus three frames", 4, got.size());
        expect("line 0 is still the session header", got.get(0).contains("\"kind\":\"session\""));
        expect("the held frames follow it in order, seq 1 first",
               got.get(1).contains("\"seq\":1,") && got.get(1).contains("\"type\":\"notice\""));
        expect("then seq 2", got.get(2).contains("\"seq\":2,") && got.get(2).contains("\"type\":\"over\""));
        expect("then seq 3", got.get(3).contains("\"seq\":3,"));
        expect("no frame is numbered 0", !String.join("\n", got).contains("\"seq\":0,"));

        // A header that never arrives: close() must still return, and say so.
        final File orphan = new File(dir, "no-header.jsonl");
        final GameLog log2 = new GameLog(orphan);
        log2.s2c("notice", "{\"title\":\"Not yet\"}");
        eq("held with no header", 1, log2.pendingBeforeHeader());
        final long t0 = System.nanoTime();
        log2.close();
        expect("close() with no header still returns promptly",
               (System.nanoTime() - t0) / 1_000_000L < CLOSE_BUDGET_MS);
        eq("and the file is empty rather than headerless", 0L, orphan.length());
    }

    private static void sequencesArePerDirection() throws IOException {
        final File out = new File(dir, "directions.jsonl");
        final GameLog log = new GameLog(out);
        log.header("{\"v\":1,\"kind\":\"session\"}");
        eq("s2c starts at 1", 1, log.s2c("state", "{}"));
        eq("c2s starts at 1 too", 1, log.c2s("act", "{}"));
        eq("s2c is its own counter", 2, log.s2c("input", "{}"));
        eq("c2s is its own counter", 2, log.c2s("answer", "{}"));
        eq("lastSeqS2c", 2, log.lastSeqS2c());
        log.close();
        final List<String> got = Files.readAllLines(out.toPath(), StandardCharsets.UTF_8);
        eq("header plus four frames", 5, got.size());
        expect("dir is on every frame and only on frames",
               got.get(1).contains("\"dir\":\"s2c\"") && got.get(2).contains("\"dir\":\"c2s\"")
               && !got.get(0).contains("\"dir\""));
    }

    /** D313: a gzipped log holds exactly the lines a plain one would, and bytes() is its size on disk. */
    private static void gzipIsTheSameLines() throws IOException {
        final File plain = new File(dir, "same.jsonl");
        final File gz = new File(dir, "same.jsonl.gz");
        final GameLog a = new GameLog(plain);
        final GameLog b = new GameLog(gz, true);
        for (final GameLog log : List.of(a, b)) {
            log.header("{\"v\":1,\"kind\":\"session\"}");
            for (int i = 0; i < 2_000; i++) {
                log.s2c("state", "{\"n\":" + i + ",\"pad\":\"" + "x".repeat(i % 50) + "\"}");
            }
            log.close();
        }
        final List<String> want = Files.readAllLines(plain.toPath(), StandardCharsets.UTF_8);
        final List<String> got = new ArrayList<>();
        try (java.io.BufferedReader r = new java.io.BufferedReader(new java.io.InputStreamReader(
                new java.util.zip.GZIPInputStream(Files.newInputStream(gz.toPath())), StandardCharsets.UTF_8))) {
            for (String line; (line = r.readLine()) != null; ) {
                got.add(line.replaceFirst("\"t\":\\d+", "\"t\":0"));
            }
        }
        final List<String> wantNoT = new ArrayList<>();
        for (final String line : want) {
            wantNoT.add(line.replaceFirst("\"t\":\\d+", "\"t\":0"));
        }
        expect("a gzipped log holds the plain log's lines (t aside)", got.equals(wantNoT));
        eq("gzip bytes() is the file's size", gz.length(), b.bytes());
        expect("the gzip is smaller", gz.length() * 4 < plain.length());
    }

    private static void misuse() throws IOException {
        final File out = new File(dir, "misuse.jsonl");
        final GameLog log = new GameLog(out);
        throwsIae("an array body", () -> log.s2c("state", "[1,2]"));
        throwsIae("an empty body", () -> log.s2c("state", ""));
        throwsIae("a null body", () -> log.s2c("state", null));
        log.header("{\"v\":1,\"kind\":\"session\"}");
        throwsIse("a second header", () -> log.header("{\"v\":1,\"kind\":\"session\"}"));
        log.close();
        throwsIse("a frame after close", () -> log.s2c("state", "{}"));
    }

    // ------------------------------------------------------------------

    private static void eq(final String what, final long expected, final long actual) {
        checks++;
        if (expected != actual) {
            FAILURES.add(what + " -- expected " + expected + ", got " + actual);
        }
    }

    private static void expect(final String what, final boolean ok) {
        checks++;
        if (!ok) {
            FAILURES.add(what);
        }
    }

    private static void throwsIse(final String what, final Runnable r) {
        checks++;
        try {
            r.run();
            FAILURES.add("expected IllegalStateException: " + what);
        } catch (final IllegalStateException expected) {
            // correct
        }
    }

    private static void throwsIae(final String what, final Runnable r) {
        checks++;
        try {
            r.run();
            FAILURES.add("expected IllegalArgumentException: " + what);
        } catch (final IllegalArgumentException expected) {
            // correct
        }
    }
}
