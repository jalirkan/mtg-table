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
package mtgtable.grade;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.PushbackInputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.zip.GZIPInputStream;

import mtgtable.Json;

/**
 * A frame log as the coach grader reads it (D334): the session header, then
 * every frame, indexed exactly as ForgeCoach's {@code log.ts} indexes
 * {@code log.frames} (line 0 is the header; frame i is line i + 1), so a
 * bench case's {@code moment.frame} means the same frame here.
 *
 * <p>Only the viewing seat's redacted view is read -- the log holds nothing
 * else (hard rule 8) -- and only what a moment needs: the state, the open
 * input, and the events of the turn so far.
 */
public final class WireLog {

    public final Map<?, ?> header;
    public final int seat;
    public final List<Map<?, ?>> frames;

    private WireLog(final Map<?, ?> header, final List<Map<?, ?>> frames) {
        this.header = header;
        this.frames = frames;
        this.seat = (int) num(header, "seat", 0);
    }

    /**
     * Java reads {@code .jsonl} and {@code .jsonl.gz} only: the pinned jar carries no zstd
     * decoder (netty's {@code ZstdDecoder} needs zstd-jni, which it does not ship), so a
     * finished queue night's {@code .jsonl.zst} archive (D370) is refused here with the one
     * command that turns it back into a {@code .gz} -- never misread as text -- and a stored
     * {@code .gz} path whose file the archive replaced says the same.
     */
    static IOException zstdRefusal(final File f) {
        return new IOException(f + ": a zstd archive (.jsonl.zst, D370); the Java readers take .jsonl or .jsonl.gz"
                + " only -- restore it first: python3 tools/lab/archive.py restore " + f);
    }

    public static WireLog read(final File f) throws IOException {
        final String name = f.getName();
        if (name.endsWith(".jsonl.zst")) {
            throw zstdRefusal(f);
        }
        if (!f.exists() && name.endsWith(".jsonl.gz")) {
            final File zst = new File(f.getParentFile(), name.substring(0, name.length() - 3) + ".zst");
            if (zst.isFile()) {
                throw zstdRefusal(zst);
            }
        }
        try (InputStream raw = new FileInputStream(f);
             PushbackInputStream in = new PushbackInputStream(raw, 4)) {
            final byte[] magic = new byte[4];
            final int got = in.readNBytes(magic, 0, 4);
            if (got > 0) {
                in.unread(magic, 0, got);
            }
            if (got == 4 && (magic[0] & 0xff) == 0x28 && (magic[1] & 0xff) == 0xb5
                    && (magic[2] & 0xff) == 0x2f && (magic[3] & 0xff) == 0xfd) {
                throw zstdRefusal(f);
            }
            // >= 2, not == 2: four bytes are read for the zstd check above (D370), so a gzip log's
            // read returns 4, and == 2 left every .gz undecompressed (D379 found it)
            final InputStream body = got >= 2 && (magic[0] & 0xff) == 0x1f && (magic[1] & 0xff) == 0x8b
                    ? new GZIPInputStream(in) : in;
            final List<String> lines = new ArrayList<>();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(body, StandardCharsets.UTF_8))) {
                for (String l = r.readLine(); l != null; l = r.readLine()) {
                    if (!l.isBlank()) {
                        lines.add(l);
                    }
                }
            } catch (final java.io.EOFException e) {
                // a gzip cut short (a killed recorder): what was read stands (D315)
            }
            return parse(lines);
        }
    }

    public static WireLog parse(final List<String> lines) {
        if (lines.isEmpty()) {
            throw new IllegalArgumentException("empty log");
        }
        final Map<?, ?> header = (Map<?, ?>) Json.parse(lines.get(0));
        if (!"session".equals(header.get("kind"))) {
            throw new IllegalArgumentException("line 0 is not an mtg-table session header");
        }
        final List<Map<?, ?>> frames = new ArrayList<>(lines.size());
        for (int i = 1; i < lines.size(); i++) {
            try {
                frames.add((Map<?, ?>) Json.parse(lines.get(i)));
            } catch (final RuntimeException e) {
                if (i < lines.size() - 1) {
                    throw e;
                }
                // a live game's log: its last line may still be being written
            }
        }
        return new WireLog(header, frames);
    }

    /** The decision moment: the state the player saw, the open input (or null), and where it is. */
    public static final class Moment {
        public final Map<?, ?> state;
        public final Map<?, ?> input;
        /** The index of the state frame. */
        public final int stateFrame;
        /** The frame the moment is "before" (live), or the state frame (review). */
        public final int frame;

        Moment(final Map<?, ?> state, final Map<?, ?> input, final int stateFrame, final int frame) {
            this.state = state;
            this.input = input;
            this.stateFrame = stateFrame;
            this.frame = frame;
        }
    }

    /** ForgeCoach's live moment: everything before frame {@code frame} (its {@code liveMoment}). */
    public Moment live(final int frame) {
        if (frame <= 0 || frame > frames.size()) {
            throw new IllegalArgumentException("frame " + frame + " is outside the log (0-" + frames.size() + ")");
        }
        Map<?, ?> state = null;
        Map<?, ?> input = null;
        int at = -1;
        for (int i = 0; i < frame; i++) {
            final Map<?, ?> f = frames.get(i);
            final Object type = f.get("type");
            if ("state".equals(type)) {
                state = (Map<?, ?>) f.get("body");
                at = i;
            } else if ("input".equals(type)) {
                input = (Map<?, ?>) f.get("body");
            }
        }
        return state == null ? null : new Moment(state, input, at, frame);
    }

    /** ForgeCoach's review moment: the decision whose state is frame {@code frame}. */
    public Moment review(final int frame) {
        if (frame < 0 || frame >= frames.size() || !"state".equals(frames.get(frame).get("type"))) {
            throw new IllegalArgumentException("frame " + frame + " is not a state frame");
        }
        Map<?, ?> input = null;
        for (int i = 0; i < frame; i++) {
            if ("input".equals(frames.get(i).get("type"))) {
                input = (Map<?, ?>) frames.get(i).get("body");
            }
        }
        return new Moment((Map<?, ?>) frames.get(frame).get("body"), input, frame, frame);
    }

    /**
     * Land drops {@code player} made this turn, from the {@code land} events of
     * every state frame of the moment's turn up to it (the wire carries no
     * counter; ForgeCoach's {@code turnFacts} reads the same events).
     */
    public int landsPlayedThisTurn(final Moment m, final int player) {
        final long turn = num(m.state, "turn", -1);
        int n = 0;
        for (int i = m.stateFrame; i >= 0; i--) {
            final Map<?, ?> f = frames.get(i);
            if (!"state".equals(f.get("type"))) {
                continue;
            }
            final Map<?, ?> s = (Map<?, ?>) f.get("body");
            if (num(s, "turn", -1) != turn) {
                break;
            }
            for (final Object e : arr(s, "events")) {
                final Map<?, ?> ev = (Map<?, ?>) e;
                if ("land".equals(ev.get("kind")) && num(ev, "player", -2) == player) {
                    n++;
                }
            }
        }
        return n;
    }

    // ------------------------------------------------------------------
    // Reading Jetty's maps (numbers are Long, arrays Object[])
    // ------------------------------------------------------------------

    public static long num(final Map<?, ?> m, final String k, final long dflt) {
        final Object v = m == null ? null : m.get(k);
        return v instanceof Number ? ((Number) v).longValue() : dflt;
    }

    public static String str(final Map<?, ?> m, final String k) {
        final Object v = m == null ? null : m.get(k);
        return v == null ? null : String.valueOf(v);
    }

    public static boolean bool(final Map<?, ?> m, final String k) {
        return m != null && Boolean.TRUE.equals(m.get(k));
    }

    public static Object[] arr(final Map<?, ?> m, final String k) {
        final Object v = m == null ? null : m.get(k);
        if (v instanceof Object[]) {
            return (Object[]) v;
        }
        if (v instanceof List) {
            return ((List<?>) v).toArray();
        }
        return new Object[0];
    }

    public static Map<?, ?> map(final Map<?, ?> m, final String k) {
        final Object v = m == null ? null : m.get(k);
        return v instanceof Map ? (Map<?, ?>) v : null;
    }
}
