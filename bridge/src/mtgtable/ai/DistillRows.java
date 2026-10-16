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
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
package mtgtable.ai;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.List;

import mtgtable.Json.JsonOut;

/**
 * The row exporter of the distilled policy (J126, B1): with
 * {@code MTGTABLE_DISTILL_ROWS=<dir>} in a JVM's environment, every decision a
 * SEARCHING seat takes at the kinds the search covers (p, a, b) appends one
 * JSON line to {@code <dir>/rows-<pid>.jsonl}:
 *
 * <pre>{@code
 * {"type":"row","v":1,"game":"lab:<draft id>:g1","seat":"Drafter A","kind":"p","turn":5,
 *  "n":3,"chosen":1,"overrode":true,"fallback":null,"ms":812.4,"policy":"search",
 *  "tokens":["cast:31","pass","cast:44"],
 *  "s":[[0,5],[1,3],...],                      the state, sparse [index, value] (DistillFeatures.state)
 *  "c":[[1,0,1,...],[0,1,0,...],[0,0,1,...]]}  each candidate's vector (DistillFeatures.candidates)
 * }</pre>
 *
 * {@code chosen} is the candidate the seat PLAYED (0 = Forge's own answer, also
 * after a fallback or an invalid declaration), {@code ms} the decision's wall
 * time from before its candidates were generated to its verdict (the span the
 * search's own {@code search.<kind>.ms} counter times).  The file starts with a
 * {@code header} line naming the layout ({@link DistillFeatures#VERSION}, the
 * state schema id and every feature name), and the cube lab writes an
 * {@code end} line when a game finishes ({@link #endGame}), so a reader keeps
 * only games that ended and drops a game a killed worker left half-written (it
 * is played again from its seed, under the same key, by a new process).
 *
 * <p>D450 adds three things, none of which changes a row a searching seat
 * wrote before: every row names who answered ({@code policy}: {@code search},
 * or {@code forge} / {@code random} for an observing seat, {@code observe=1},
 * whose rows the cube lab's {@code census-play --record rows} and the move atlas
 * write -- a reader training on the search's choices keeps {@code search}
 * rows only); a job may point the exporter at a folder of its own
 * ({@link #useDir}) instead of the environment's; and a {@code begin} line
 * before a game's rows names what the game is made of (its seed, the two decks,
 * who played first, the two seats' policies), so the game can be played again
 * from that recipe ({@code census-replay}).
 *
 * <p>Off unless the variable names a directory; nothing else changes when it is
 * on.  Rows name no card: the tokens are the decision records' spelling (wire
 * ids), the vectors the seat's own knowledge.  One process plays one game at a
 * time, both seats on that game's thread, so the static state here is enough;
 * every method is synchronized anyway.  A write error turns the exporter off
 * for the rest of the process and says so once on stderr: it never stops a game.
 */
public final class DistillRows {

    public static final String ENV = "MTGTABLE_DISTILL_ROWS";
    public static final int ROW_VERSION = 1;

    private static Path dir = fromEnv();
    private static BufferedWriter out;
    private static String game;
    private static long rows;

    private DistillRows() {
    }

    private static Path fromEnv() {
        final String v = System.getenv(ENV);
        return v == null || v.isBlank() ? null : Path.of(v);
    }

    /** Whether rows are being written. */
    public static synchronized boolean enabled() {
        return dir != null;
    }

    /** The game the next rows belong to (the cube lab: {@code lab:<draft id>:g<n>}). */
    public static synchronized void setGame(final String key) {
        game = key;
    }

    /**
     * The game's end: a reader keeps a game's rows only when an {@code end} line
     * with {@code ok: true} follows them ({@code ok} false: the game ended in an
     * engine error or got stuck).
     */
    public static synchronized void endGame(final String key, final String winner, final boolean ok) {
        if (dir == null) {
            return;
        }
        final JsonOut j = new JsonOut().obj().n("type", "end").n("v", ROW_VERSION).n("game", key).n("ok", ok);
        if (winner == null) {
            j.nNull("winner");
        } else {
            j.n("winner", winner);
        }
        write(j.end().done());
        if (key != null && key.equals(game)) {
            game = null;
        }
    }

    /**
     * D450: write into {@code d} from now on (null = off), whatever the
     * environment says: a cube-lab job names its own rows folder.  The file is
     * still {@code rows-<pid>.jsonl}, so a folder is shared by workers safely.
     */
    public static synchronized void useDir(final Path d) {
        if (java.util.Objects.equals(d, dir)) {
            return;
        }
        close();
        dir = d;
    }

    /** D450: the folder rows go to now, or null. */
    public static synchronized Path dir() {
        return dir;
    }

    /**
     * D450: a game's recipe, before its rows: {@code fields} are strings and
     * whole numbers only (the seed, the two decks' ids or paths, who played
     * first, each seat's policy) -- nothing a seat could not know about the
     * game it sits in.
     */
    public static synchronized void begin(final String key, final java.util.Map<String, Object> fields) {
        if (dir == null) {
            return;
        }
        final JsonOut j = new JsonOut().obj().n("type", "begin").n("v", ROW_VERSION).n("game", key);
        for (final java.util.Map.Entry<String, Object> e : fields.entrySet()) {
            final Object v = e.getValue();
            if (v == null) {
                j.nNull(e.getKey());
            } else if (v instanceof Number) {
                j.n(e.getKey(), ((Number) v).longValue());
            } else if (v instanceof Boolean) {
                j.n(e.getKey(), (Boolean) v);
            } else {
                j.n(e.getKey(), v.toString());
            }
        }
        write(j.end().done());
    }

    /** Rows written by this process so far. */
    public static synchronized long rowsWritten() {
        return rows;
    }

    /** For the self-tests: write into {@code d} (null = off), whatever the environment says. */
    public static synchronized void enableForTest(final Path d) {
        close();
        dir = d;
        game = null;
        rows = 0;
    }

    /** Close the file (the next row opens it again, appending). */
    public static synchronized void close() {
        if (out != null) {
            try {
                out.close();
            } catch (final IOException e) {
                // nothing to do: the next open appends
            }
            out = null;
        }
    }

    /** The file this process writes. */
    public static Path file(final Path d) {
        return d.resolve("rows-" + ProcessHandle.current().pid() + ".jsonl");
    }

    /**
     * One decision.  {@code gameId} (Forge's own game id) names the game when no
     * key was set: {@code pid<pid>:game<id>}.
     */
    public static synchronized void row(final int gameId, final String seat, final String kind, final int turn,
                                        final double[] state, final double[][] cands, final List<String> tokens,
                                        final int chosen, final String fallback, final double ms) {
        row(gameId, seat, kind, turn, state, cands, tokens, chosen, fallback, ms, "search");
    }

    /** {@link #row} naming who answered (D450): {@code search}, {@code forge} or {@code random}. */
    public static synchronized void row(final int gameId, final String seat, final String kind, final int turn,
                                        final double[] state, final double[][] cands, final List<String> tokens,
                                        final int chosen, final String fallback, final double ms,
                                        final String policy) {
        if (dir == null) {
            return;
        }
        final String key = game != null ? game : "pid" + ProcessHandle.current().pid() + ":game" + gameId;
        final JsonOut j = new JsonOut().obj().n("type", "row").n("v", ROW_VERSION).n("game", key).n("seat", seat)
                .n("kind", kind).n("turn", (long) turn).n("n", (long) cands.length).n("chosen", (long) chosen)
                .n("overrode", chosen > 0);
        if (fallback == null) {
            j.nNull("fallback");
        } else {
            j.n("fallback", fallback);
        }
        j.n("ms", Math.round(ms * 1000) / 1000.0);
        j.n("policy", policy == null ? "search" : policy);
        j.key("tokens").arr();
        for (final String t : tokens) {
            j.v(t);
        }
        j.end();
        j.key("s").arr();
        for (int i = 0; i < state.length; i++) {
            if (state[i] != 0) {
                j.arr().v((long) i).v(num(state[i])).end();
            }
        }
        j.end();
        j.key("c").arr();
        for (final double[] c : cands) {
            j.arr();
            for (final double x : c) {
                j.v(num(x));
            }
            j.end();
        }
        j.end();
        if (write(j.end().done())) {
            rows++;
        }
    }

    /** Integers as integers (most features are counts), everything else rounded to 1e-6. */
    private static double num(final double x) {
        return x == Math.rint(x) ? x : Math.round(x * 1e6) / 1e6;
    }

    private static boolean write(final String line) {
        try {
            if (out == null) {
                Files.createDirectories(dir);
                final Path f = file(dir);
                final boolean fresh = !Files.exists(f) || Files.size(f) == 0;
                out = Files.newBufferedWriter(f, StandardCharsets.UTF_8, StandardOpenOption.CREATE,
                        StandardOpenOption.APPEND);
                if (fresh) {
                    out.write(header());
                    out.write('\n');
                }
            }
            out.write(line);
            out.write('\n');
            out.flush();
            return true;
        } catch (final IOException | RuntimeException e) {
            System.err.println("[distill] rows off: cannot write under " + dir + ": " + e);
            close();
            dir = null;
            return false;
        }
    }

    /** The file's first line: the layout every row of it uses. */
    static String header() {
        final JsonOut j = new JsonOut().obj().n("type", "header").n("v", ROW_VERSION)
                .n("featureVersion", DistillFeatures.VERSION)
                .n("stateSchemaId", DistillFeatures.stateSchema().schemaId())
                .n("stateSize", (long) DistillFeatures.stateSchema().size())
                .n("pid", ProcessHandle.current().pid());
        j.key("stateNames").arr();
        for (final String s : DistillFeatures.stateSchema().names()) {
            j.v(s);
        }
        j.end();
        j.key("cand").obj();
        for (final String k : DistillFeatures.KINDS) {
            j.key(k).arr();
            for (final String s : DistillFeatures.names(k)) {
                j.v(s);
            }
            j.end();
        }
        j.end();
        return j.end().done();
    }
}
