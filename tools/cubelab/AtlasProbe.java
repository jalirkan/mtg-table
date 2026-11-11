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
package mtgtable.cubelab;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

import mtgtable.Json;
import mtgtable.Json.JsonOut;
import mtgtable.ai.Atlas;
import mtgtable.ai.LabelProbe;
import mtgtable.ai.SeatSpec;

/**
 * The label probe's entry point (D538; {@code tools/label-probe.sh} is the command): for each recorded atlas
 * decision named in {@code --decisions}, which option the ladder player {@code --player} picks there,
 * {@code --repeats} times, one JSON line a repeat in {@code --out}.
 *
 * <pre>
 *   AtlasProbe --decisions FILE.jsonl --player NAME --seat CFG [--hash H] [--data DIR] [--repeats 3] [--seed 1]
 *              [--shard I/K] [--game-timeout 1800] --out FILE.jsonl
 * </pre>
 *
 * <p><b>The decision.</b>  A line of {@code --decisions} carries {@code key}, {@code <night>/<spine>/d<d>}
 * (the labels' key: {@code J186/s01/d9}), and may carry {@code dir}, the spine's folder; without it the folder is
 * {@code <data>/lab-<night, lower case>/b-<spine>-*}, the lab's own layout (exactly one, or the row is an error).
 * The folder is what {@code tools/cubelab.sh atlas} wrote: {@code plan.json} (the decks, the seed, the turn cap,
 * the option count {@code options}) and {@code phaseB/baseline.json} (the baseline's listing, every decision's
 * tokens).
 *
 * <p><b>The replay.</b>  Each (decision, repeat) is one match line, built as {@code atlas.ts}'s {@code unitJob}
 * builds a branch unit's -- the same decks, seed, Default profiles on both seats, turn cap, {@code cands} and
 * {@code expect} -- with no branches and a {@code probe} block, and played by {@link CubeLab#playMatch}, the cube
 * lab worker's own path (D511's record path included).  At decision d the observe hook checks the listing and asks
 * the player ({@link LabelProbe}); then the game ends.  After the match every decision the replay listed up to d is
 * compared with the baseline's ({@link LabelProbe#listingDiff}): any difference is {@code mismatch}, with no pick.
 *
 * <p><b>The rows.</b>  One JSON object a line, appended with one write each (the shards of a run share the file;
 * {@code tools/label-probe.sh} cuts a torn last line before it starts them).  A rerun with the same arguments skips
 * every (key, player, repeat) the file already holds with a status other than {@code error}; a row of the same
 * player made with another seat config refuses the run (another experiment wants another file).
 *
 * <p>The rules it keeps are the cube lab's: {@link CubeLab#boot} (hard rules 1, 2 and 11 through Bootstrap), decks
 * through {@code DeckSerializer.fromFile} inside {@code playMatch} (hard rule 4), one game at a time on Forge's own
 * game pool, no thread, no hop, no {@code CardView}.
 */
public final class AtlasProbe {

    private AtlasProbe() { }

    /** The row's version. */
    static final int ROW_VERSION = 1;

    /** The atlas's seats' profile ({@code atlas.ts}'s {@code baseJob}: Default on both). */
    static final String ATLAS_PROFILE = "Default";

    /** The run's settings. */
    static final class Args {
        String decisions;
        String data;
        String player;
        String seat;
        String hash;
        String out;
        int repeats = 3;
        long seed = 1;
        int shard;
        int shards = 1;
        long gameTimeoutSec = 1800;
    }

    public static void main(final String[] argv) throws Exception {
        CubeLab.protocolOut();
        final Args a;
        try {
            a = parse(argv);
        } catch (final IllegalArgumentException e) {
            System.err.println("label-probe: " + e.getMessage());
            System.exit(2);
            return;
        }
        CubeLab.boot();   // hard rule 1: the first Forge call; nothing above it loads an engine class
        try {
            SeatSpec.parse(a.seat);   // a seat config this code cannot seat is refused before any replay
        } catch (final IllegalArgumentException e) {
            System.err.println("label-probe: --seat " + a.seat + ": " + e.getMessage());
            System.exit(2);
            return;
        }
        final int rc = run(a);
        System.err.flush();
        System.exit(rc);   // Forge leaves non-daemon pools behind
    }

    static Args parse(final String[] argv) {
        final Args a = new Args();
        for (int i = 0; i < argv.length; i++) {
            final String f = argv[i];
            if (i + 1 >= argv.length) {
                throw new IllegalArgumentException(f + " wants a value");
            }
            final String v = argv[++i];
            switch (f) {
                case "--decisions": a.decisions = v; break;
                case "--data": a.data = v; break;
                case "--player": a.player = v; break;
                case "--seat": a.seat = v; break;
                case "--hash": a.hash = v; break;
                case "--out": a.out = v; break;
                case "--repeats": a.repeats = Integer.parseInt(v); break;
                case "--seed": a.seed = Long.parseLong(v); break;
                case "--game-timeout": a.gameTimeoutSec = Long.parseLong(v); break;
                case "--shard": {
                    final String[] p = v.split("/");
                    if (p.length != 2) {
                        throw new IllegalArgumentException("--shard wants I/K, got " + v);
                    }
                    a.shard = Integer.parseInt(p[0]);
                    a.shards = Integer.parseInt(p[1]);
                    break;
                }
                default: throw new IllegalArgumentException("unknown flag " + f);
            }
        }
        if (a.decisions == null || a.player == null || a.seat == null || a.out == null) {
            throw new IllegalArgumentException("--decisions, --player, --seat and --out are required");
        }
        if (a.repeats < 1 || a.shards < 1 || a.shard < 0 || a.shard >= a.shards) {
            throw new IllegalArgumentException("--repeats must be >= 1 and --shard I/K must have 0 <= I < K");
        }
        return a;
    }

    /** One decision named in {@code --decisions}. */
    static final class Key {
        final String key;
        final String night;
        final String spine;
        final int d;
        final String dir;

        Key(final String key, final String dir) {
            final String[] p = key.split("/");
            if (p.length != 3 || !p[2].matches("d[0-9]+")) {
                throw new IllegalArgumentException("a decision key is <night>/<spine>/d<d>: " + key);
            }
            this.key = key;
            this.night = p[0];
            this.spine = p[1];
            this.d = Integer.parseInt(p[2].substring(1));
            this.dir = dir;
        }
    }

    /** A spine's folder, read once: the plan and the baseline's listing by decision. */
    static final class Spine {
        final File dir;
        final Map<?, ?> plan;
        final Map<Integer, Map<?, ?>> listing = new TreeMap<>();

        Spine(final File dir) throws IOException {
            this.dir = dir;
            plan = (Map<?, ?>) Json.parse(Files.readString(new File(dir, "plan.json").toPath(), StandardCharsets.UTF_8));
            final Map<?, ?> base = (Map<?, ?>) Json.parse(Files.readString(new File(dir, "phaseB/baseline.json").toPath(),
                    StandardCharsets.UTF_8));
            for (final Object o : (Object[]) base.get("decisions")) {
                final Map<?, ?> m = (Map<?, ?>) o;
                listing.put((int) CubeLab.num(m, "d", -1), m);
            }
        }

        List<String> tokens(final int d) {
            final Map<?, ?> m = listing.get(d);
            final List<String> out = new ArrayList<>();
            if (m != null) {
                for (final Object t : (Object[]) m.get("tokens")) {
                    out.add(String.valueOf(t));
                }
            }
            return out;
        }
    }

    static int run(final Args a) throws Exception {
        final List<Key> keys = readKeys(new File(a.decisions));
        final File out = new File(a.out);
        final Set<String> done = done(out, a);
        final Map<String, Spine> spines = new LinkedHashMap<>();
        int idx = -1;
        int played = 0;
        for (final Key k : keys) {
            for (int r = 0; r < a.repeats; r++) {
                idx++;
                if (idx % a.shards != a.shard || done.contains(k.key + "#" + r)) {
                    continue;
                }
                final long seed = LabelProbe.repeatSeed(a.seed, k.key, r);
                final Row row = new Row(k, a, r, seed);
                Spine sp = null;
                try {
                    sp = spine(spines, k, a);
                } catch (final IOException | RuntimeException e) {
                    row.status = LabelProbe.ERROR;
                    row.detail = "the spine's folder: " + e.getMessage();
                }
                int rc = 0;
                if (sp != null) {
                    rc = probe(sp, k, a, r, seed, row);
                    played++;
                }
                append(out, row.json());
                System.err.println("[probe] " + k.key + " r" + r + " " + a.player + ": " + row.status
                        + (row.option == null ? "" : " option " + row.option) + (row.token == null ? "" : " " + row.token)
                        + " (" + row.replayMs + " ms)");
                if (rc != 0) {
                    // 3: the game thread is stuck; 4: the heap is exhausted (D465).  Either way this JVM is done; the
                    // wrapper starts the shard again, which resumes after the rows written
                    return rc;
                }
            }
        }
        System.err.println("[probe] shard " + a.shard + "/" + a.shards + ": " + played + " replay(s)");
        return 0;
    }

    static List<Key> readKeys(final File f) throws IOException {
        final Map<String, Key> keys = new LinkedHashMap<>();
        for (final String line : Files.readAllLines(f.toPath(), StandardCharsets.UTF_8)) {
            if (line.isBlank()) {
                continue;
            }
            final Map<?, ?> m = (Map<?, ?>) Json.parse(line);
            final String key = CubeLab.str(m, "key");
            if (key == null) {
                throw new IllegalArgumentException(f + ": a line without a key: " + line);
            }
            keys.putIfAbsent(key, new Key(key, CubeLab.str(m, "dir")));
        }
        return new ArrayList<>(keys.values());
    }

    /**
     * The (key, repeat) pairs {@code out} already answers for this player (every status but error), and a refusal
     * when a row of this player carries another seat config.  A line that does not parse is skipped (the wrapper
     * cuts a torn last line before a run).
     */
    static Set<String> done(final File out, final Args a) throws IOException {
        final Set<String> done = new HashSet<>();
        if (!out.exists()) {
            return done;
        }
        for (final String line : Files.readAllLines(out.toPath(), StandardCharsets.UTF_8)) {
            final Map<?, ?> m;
            try {
                m = (Map<?, ?>) Json.parse(line);
            } catch (final RuntimeException e) {
                continue;
            }
            if (m == null || !a.player.equals(CubeLab.str(m, "player"))) {
                continue;
            }
            if (!a.seat.equals(CubeLab.str(m, "seat"))) {
                throw new IllegalStateException(out + " holds rows of " + a.player + " made with the seat config "
                        + CubeLab.str(m, "seat") + ", not " + a.seat + ": another experiment, another --out");
            }
            if (!LabelProbe.ERROR.equals(CubeLab.str(m, "status"))) {
                done.add(CubeLab.str(m, "key") + "#" + CubeLab.num(m, "repeat", -1));
            }
        }
        return done;
    }

    static Spine spine(final Map<String, Spine> cache, final Key k, final Args a) throws IOException {
        final String id = k.dir != null ? k.dir : k.night + "/" + k.spine;
        Spine s = cache.get(id);
        if (s == null) {
            s = new Spine(k.dir != null ? new File(k.dir) : findSpine(a.data, k));
            cache.put(id, s);
        }
        return s;
    }

    /** {@code <data>/lab-<night>/b-<spine>-*}: the lab's layout (the night lower-cased, as the lab names its folders). */
    static File findSpine(final String data, final Key k) {
        if (data == null) {
            throw new IllegalArgumentException("no --data, and the decision line names no dir");
        }
        final File night = new File(data, "lab-" + k.night.toLowerCase(java.util.Locale.ROOT));
        final File[] hits = night.listFiles((d, n) -> n.startsWith("b-" + k.spine + "-") && new File(d, n).isDirectory());
        if (hits == null || hits.length != 1) {
            throw new IllegalArgumentException(night + ": " + (hits == null ? "no such folder" : hits.length
                    + " folders b-" + k.spine + "-*"));
        }
        return hits[0];
    }

    /** The probe's match line: {@code atlas.ts}'s {@code unitJob}, no branches, the probe's block. */
    static String job(final Spine sp, final Key k, final Args a, final int r, final long seed) {
        final Map<?, ?> plan = sp.plan;
        final long spineSeed = CubeLab.num(plan, "seed", Long.MIN_VALUE);
        if (spineSeed == Long.MIN_VALUE || CubeLab.str(plan, "deckA") == null || CubeLab.str(plan, "deckB") == null) {
            throw new IllegalArgumentException(sp.dir + "/plan.json has no seed, deckA or deckB");
        }
        final long turnCap = CubeLab.num(plan, "turnCap", 40);
        final JsonOut j = new JsonOut().obj().n("id", "probe:" + k.key + ":r" + r).n("seed", spineSeed).n("games", 1L)
                .n("gameTimeoutSec", a.gameTimeoutSec).n("profileA", ATLAS_PROFILE).n("profileB", ATLAS_PROFILE)
                .n("builder", "lab").n("deckA", CubeLab.str(plan, "deckA")).n("deckB", CubeLab.str(plan, "deckB"));
        j.key("poolA").arr().end().key("poolB").arr().end().n("turnCap", turnCap);
        j.key("atlas").obj().n("decision", (long) k.d).n("continuation", "forge").n("i0", 0L).n("i1", 0L)
                .n("seed", spineSeed).key("expect").arr();
        for (final String t : sp.tokens(k.d)) {
            j.v(t);
        }
        j.end().n("cands", CubeLab.num(plan, "options", 8)).n("run", "label-probe").n("turnCap", turnCap)
                .n("branchTimeoutSec", 120L).n("leakChecks", 0L);
        j.key("probe").obj().n("player", a.player).n("seat", a.seat).n("seed", seed).n("repeat", (long) r).end();
        return j.end().end().done();
    }

    /** One (decision, repeat): the replay, then the row.  The worker's exit code when it must stop (3, 4), else 0. */
    static int probe(final Spine sp, final Key k, final Args a, final int r, final long seed, final Row row) {
        final List<String> expect = sp.tokens(k.d);
        if (expect.isEmpty()) {
            row.status = LabelProbe.MISMATCH;
            row.detail = "the baseline lists no decision d" + k.d;
            return 0;
        }
        row.kind = CubeLab.str(sp.listing.get(k.d), "kind");
        row.k = expect.size();
        final String profile = SeatSpec.parse(a.seat).profile;
        if (!ATLAS_PROFILE.equals(profile)) {
            row.status = LabelProbe.UNSUPPORTED;
            row.detail = "the player's AI profile " + profile + " is not the atlas seat's (" + ATLAS_PROFILE + ")";
            return 0;
        }
        final long t0 = System.nanoTime();
        int rc;
        try {
            rc = CubeLab.playMatch((Map<?, ?>) Json.parse(job(sp, k, a, r, seed)));
        } catch (final Exception e) {
            row.status = LabelProbe.ERROR;
            row.detail = "the replay: " + e;
            return 0;
        } finally {
            row.replayMs = (System.nanoTime() - t0) / 1_000_000L;
        }
        final Atlas.Hook hook = CubeLab.lastHook;
        if (hook == null) {
            row.status = LabelProbe.ERROR;
            row.detail = "the match ran no atlas hook" + (rc == 3 ? " (the game thread is stuck)" : "");
            return rc;
        }
        // every decision the replay listed up to d must be the baseline's: a replay that parted earlier and met the
        // listing again at d is not the baseline's position
        for (final Atlas.DecisionInfo di : hook.decisions) {
            if (di.index > k.d) {
                break;
            }
            final String diff = LabelProbe.listingDiff(sp.tokens(di.index), di.tokens);
            if (diff != null) {
                row.status = LabelProbe.MISMATCH;
                row.detail = "decision " + di.index + ": " + diff;
                return rc;
            }
        }
        if (hook.branched == null) {
            row.status = LabelProbe.MISMATCH;
            row.detail = "the replay listed " + hook.decisions.size() + " decision(s) and never reached d" + k.d
                    + (rc == 3 ? " (the game thread is stuck)" : "");
            return rc;
        }
        if (hook.probes.isEmpty()) {
            row.status = hook.error != null ? LabelProbe.MISMATCH : LabelProbe.ERROR;
            row.detail = hook.error != null ? hook.error : "the hook reached d" + k.d + " and asked nothing";
            return rc;
        }
        row.answer(hook.probes.get(0));
        return rc;
    }

    /** A row as it is written. */
    static final class Row {
        final Key key;
        final Args a;
        final int repeat;
        final long seed;
        String kind;
        int k = -1;
        String status = LabelProbe.ERROR;
        Integer option;
        String token;
        String identity;
        Boolean sameIdentity;
        String by;
        Boolean searched;
        long ms = -1;
        int rounds;
        int playouts;
        long searchMs;
        String fallback;
        boolean overrode;
        boolean timedOut;
        long replayMs = -1;
        String detail;
        Map<String, Integer> counts = new TreeMap<>();

        Row(final Key key, final Args a, final int repeat, final long seed) {
            this.key = key;
            this.a = a;
            this.repeat = repeat;
            this.seed = seed;
        }

        void answer(final LabelProbe.Answer p) {
            status = p.status;
            option = LabelProbe.OK.equals(p.status) ? p.option : null;
            token = p.token;
            identity = p.identity;
            sameIdentity = p.sameIdentity;
            by = p.by;
            searched = p.searched;
            ms = p.ms;
            rounds = p.rounds;
            playouts = p.playouts;
            searchMs = p.searchMs;
            fallback = p.fallback;
            overrode = p.overrode;
            timedOut = p.timedOut;
            detail = p.detail;
            counts = p.counts;
            if (p.k != k) {
                // the hook's option count is the listing's, which matched the baseline's: never expected
                status = LabelProbe.MISMATCH;
                option = null;
                detail = "the probe saw " + p.k + " options, the baseline lists " + k;
            }
        }

        String json() {
            final JsonOut j = new JsonOut().obj().n("v", (long) ROW_VERSION).n("key", key.key).n("night", key.night)
                    .n("spine", key.spine).n("d", (long) key.d).n("kind", kind).nInt("k", k < 0 ? null : k)
                    .n("player", a.player).n("hash", a.hash).n("seat", a.seat).n("repeat", (long) repeat)
                    .n("seed", seed).n("status", status).nInt("option", option).n("token", token)
                    .n("identity", identity);
            bool(j, "sameIdentity", sameIdentity);
            j.n("by", by);
            bool(j, "searched", searched);
            j.n("ms", ms).n("rounds", (long) rounds).n("playouts", (long) playouts).n("searchMs", searchMs)
                    .n("fallback", fallback).n("overrode", overrode).n("timedOut", timedOut).n("replayMs", replayMs)
                    .n("detail", detail);
            j.key("counts").obj();
            for (final Map.Entry<String, Integer> e : counts.entrySet()) {
                j.n(e.getKey(), (long) e.getValue());
            }
            return j.end().end().done();
        }
    }

    /** {@code "key": true|false|null}. */
    static void bool(final JsonOut j, final String k, final Boolean v) {
        if (v == null) {
            j.nNull(k);
        } else {
            j.n(k, v.booleanValue());
        }
    }

    /** One line, appended with one write: the shards of a run append to the same file. */
    static synchronized void append(final File out, final String line) throws IOException {
        final File parent = out.getAbsoluteFile().getParentFile();
        if (parent != null) {
            parent.mkdirs();
        }
        try (FileOutputStream o = new FileOutputStream(out, true)) {
            o.write((line + "\n").getBytes(StandardCharsets.UTF_8));
        }
    }
}
