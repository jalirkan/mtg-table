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
package mtgtable.eval;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.zip.GZIPInputStream;

import mtgtable.Json;

/**
 * The Java evaluator held to Python's, with no engine (D316).  Run by
 * {@code bridge/build.sh} on every build:
 *
 * <pre>  java -cp bridge/out:$FORGE_JAR mtgtable.eval.EvalSelfTest [repoRoot]</pre>
 *
 * <ol>
 *   <li><b>Parity.</b> {@code fixtures/eval/golden.json} is Python's answer
 *       ({@code tools/ml/eval_golden.py}) for every decision row of every
 *       committed recording: Java must choose the same rows, produce the same
 *       integer feature vector (a hash per row, the full vector every tenth) and
 *       the same P(win) from {@code fixtures/eval/model.json} within 1e-9.</li>
 *   <li><b>Schema and vocabulary.</b> The model loads only when its schema id is
 *       this encoder's for its vocabulary; a tampered id and a foreign cube are
 *       refused; the cube, deck and plain-list readers give Python's names.</li>
 *   <li><b>Hidden information.</b> D305's scrambler, in Java: every hidden zone
 *       of every recording rewritten as if it had leaked (the opponent's hand
 *       full of named cards, named library cards, named stubs, a face-down
 *       card's {@code alt}) changes no feature of any row; the same rewrite of
 *       the viewer's own hand must change rows (the negative control).</li>
 *   <li><b>Speed.</b> Encode + predict per position, printed.</li>
 * </ol>
 */
public final class EvalSelfTest {

    private EvalSelfTest() { }

    private static int failures;
    private static int checks;

    private static void check(final boolean ok, final String what) {
        checks++;
        if (!ok) {
            failures++;
            if (failures <= 25) {
                System.out.println("  FAIL " + what);
            }
        }
    }

    public static void main(final String[] args) throws Exception {
        final Path root = Path.of(args.length > 0 ? args[0] : ".").toAbsolutePath().normalize();
        final Path dir = root.resolve("fixtures/eval");
        final Map<?, ?> golden = (Map<?, ?>) Json.parse(Files.readString(dir.resolve("golden.json"),
                StandardCharsets.UTF_8));
        final EvalModel model = EvalModel.load(dir.resolve("model.json"));
        final FeatureEncoder enc = new FeatureEncoder(model.schema());

        // ---- 2. schema and vocabulary
        check(model.schemaId().equals(golden.get("schemaId")), "model schema id = golden's");
        check(model.schema().size() == ((Number) golden.get("nFeatures")).intValue(), "feature count");
        final List<Path> vfiles = new ArrayList<>();
        for (final Object o : JsonPosition.arr(golden.get("vocabFiles"))) {
            vfiles.add(root.resolve(String.valueOf(o)));
        }
        final Vocab vocab = Vocab.fromFiles(vfiles);
        model.requireVocab(vocab);
        check(new FeatureSchema(vocab).schemaId().equals(model.schemaId()), "schema id from the vocab files");
        boolean refused = false;
        try {
            model.requireVocab(Vocab.fromFiles(List.of(root.resolve("cubes").resolve(firstCube(root)))));
        } catch (final IllegalArgumentException e) {
            refused = true;
        }
        check(refused, "a foreign cube is refused");
        refused = false;
        final Path tampered = Files.createTempFile("eval-tampered", ".json");
        try {
            final String text = Files.readString(dir.resolve("model.json"), StandardCharsets.UTF_8);
            Files.writeString(tampered, text.replace("\"schemaId\":\"" + model.schemaId() + "\"",
                    "\"schemaId\":\"0000000000000000\""), StandardCharsets.UTF_8);
            EvalModel.load(tampered);
        } catch (final IllegalArgumentException e) {
            refused = true;
        } finally {
            Files.deleteIfExists(tampered);
        }
        check(refused, "a model with another schema id is refused");
        for (final Map.Entry<?, ?> e : JsonPosition.map(golden.get("vocabNames")).entrySet()) {
            final List<String> want = strings(e.getValue());
            final List<String> got = Vocab.readNames(root.resolve(String.valueOf(e.getKey())));
            check(want.equals(got), "names of " + e.getKey() + " (" + got.size() + " vs " + want.size() + ")");
        }
        for (final Object o : JsonPosition.arr(golden.get("norm"))) {
            final Object[] pair = JsonPosition.arr(o);
            check(Vocab.norm(String.valueOf(pair[0])).equals(pair[1]), "norm(" + pair[0] + ")");
        }
        final int schemaChecks = checks;
        System.out.println("eval selftest: schema " + model.schemaId() + ", " + model.schema().size()
                + " features, vocab " + vocab.size() + "; " + schemaChecks + " schema/vocab checks");

        // ---- 1. parity
        int rows = 0;
        int full = 0;
        double worstP = 0;
        final List<Position> positions = new ArrayList<>();
        final List<Integer> seats = new ArrayList<>();
        final List<Tally> tallies = new ArrayList<>();
        for (final Object lo : JsonPosition.arr(golden.get("logs"))) {
            final Map<?, ?> lg = JsonPosition.map(lo);
            final Path file = root.resolve(String.valueOf(lg.get("file")));
            final int gi = ((Number) lg.get("game")).intValue();
            final LogGame game = readGames(file).get(gi);
            final List<Row> got = decisionRows(game, enc, null);
            final Object[] want = JsonPosition.arr(lg.get("rows"));
            check(got.size() == want.length, file.getFileName() + ": " + got.size() + " rows, Python " + want.length);
            for (int i = 0; i < Math.min(got.size(), want.length); i++) {
                final Map<?, ?> w = JsonPosition.map(want[i]);
                final Row r = got.get(i);
                final String where = file.getFileName() + " seq " + w.get("seq");
                check(r.seq == ((Number) w.get("seq")).intValue(), where + ": Java chose seq " + r.seq);
                check(hash(r.features).equals(w.get("hash")), where + ": feature hash" + diff(r.features, w, model));
                if (w.get("nz") != null) {
                    full++;
                    final double[] wv = new double[r.features.length];
                    for (final Object nz : JsonPosition.arr(w.get("nz"))) {
                        final Object[] kv = JsonPosition.arr(nz);
                        wv[((Number) kv[0]).intValue()] = ((Number) kv[1]).doubleValue();
                    }
                    check(Arrays.equals(wv, r.features), where + ": full vector" + diff(r.features, w, model));
                }
                final double p = model.predict(r.features);
                final double dp = Math.abs(p - ((Number) w.get("p")).doubleValue());
                worstP = Math.max(worstP, dp);
                check(dp < 1e-9, where + ": P(win) " + p + " vs Python " + w.get("p"));
                positions.add(r.pos);
                seats.add(game.seat);
                tallies.add(r.tally);
                rows++;
            }
        }
        System.out.println("eval selftest: parity over " + rows + " rows (" + full + " full vectors) of "
                + JsonPosition.arr(golden.get("logs")).length + " games; worst |P_java - P_python| = "
                + String.format(Locale.ROOT, "%.2e", worstP));

        // ---- 3. hidden information
        final List<String> names = new ArrayList<>(vocab.cards().subList(0, vocab.size() - 3));
        final Random rng = new Random(305);
        int scrambledRows = 0;
        for (final Object lo : JsonPosition.arr(golden.get("logs"))) {
            final Map<?, ?> lg = JsonPosition.map(lo);
            final Path file = root.resolve(String.valueOf(lg.get("file")));
            final LogGame plain = readGames(file).get(((Number) lg.get("game")).intValue());
            final LogGame leaked = readGames(file).get(((Number) lg.get("game")).intValue());
            scramble(leaked, rng, names, false);
            final List<Row> a = decisionRows(plain, enc, null);
            final List<Row> b = decisionRows(leaked, enc, null);
            check(a.size() == b.size(), file.getFileName() + ": scrambled row count");
            for (int i = 0; i < Math.min(a.size(), b.size()); i++) {
                if (!Arrays.equals(a.get(i).features, b.get(i).features)) {
                    check(false, file.getFileName() + " seq " + a.get(i).seq + ": hidden information reached "
                            + firstDiff(a.get(i).features, b.get(i).features, model.schema()));
                    break;
                }
                scrambledRows++;
            }
        }
        final Path g1 = root.resolve("fixtures/games/g1.jsonl");
        final LogGame mine = readGames(g1).get(0);
        scramble(mine, new Random(1), names, true);
        final List<Row> a = decisionRows(readGames(g1).get(0), enc, null);
        final List<Row> b = decisionRows(mine, enc, null);
        boolean changed = a.size() != b.size();
        for (int i = 0; !changed && i < a.size(); i++) {
            changed = !Arrays.equals(a.get(i).features, b.get(i).features);
        }
        check(changed, "negative control: rewriting the viewer's own hand changes features");
        System.out.println("eval selftest: hidden zones scrambled in every recording, " + scrambledRows
                + " rows unchanged; negative control " + (changed ? "changed rows, as it must" : "DID NOT CHANGE"));

        // ---- 4. speed
        final double[] buf = new double[model.schema().size()];
        double sink = 0;
        for (int i = 0; i < 3000; i++) {   // warm-up
            final int k = i % positions.size();
            enc.encode(positions.get(k), seats.get(k), tallies.get(k), buf);
            sink += model.predict(buf);
        }
        final int n = 20_000;
        long t0 = System.nanoTime();
        for (int i = 0; i < n; i++) {
            final int k = i % positions.size();
            enc.encode(positions.get(k), seats.get(k), tallies.get(k), buf);
        }
        final long tEnc = System.nanoTime() - t0;
        t0 = System.nanoTime();
        for (int i = 0; i < n; i++) {
            sink += model.logit(buf);
        }
        final long tPred = System.nanoTime() - t0;
        System.out.println(String.format(Locale.ROOT,
                "eval selftest: encode %.1f us + predict %.1f us per position (%d positions, %d features, "
                        + "model %s; checksum %.3f)",
                tEnc / 1000.0 / n, tPred / 1000.0 / n, n, model.schema().size(), describe(model), sink % 1));

        // ---- 5. D354: the search's one evaluator flag, leaf=eval:<model.json> (engine-free)
        final String mp = dir.resolve("model.json").toString();
        final mtgtable.ai.SearchConfig hand = mtgtable.ai.SearchConfig.parse("");
        final mtgtable.ai.SearchConfig withEval = mtgtable.ai.SearchConfig.parse("rounds=3,maxrounds=3,leaf=eval:" + mp);
        check(hand.leafModel == null && !hand.toString().contains("leaf"), "the default leaf is the hand leaf, printed as before");
        check(mp.equals(withEval.leafModel) && withEval.minRounds == 3 && withEval.maxRounds == 3,
                "leaf=eval:<model> keeps the other keys and names the model");
        check(mtgtable.ai.SearchConfig.parse(withEval.toString()).leafModel.equals(mp), "leaf=eval round-trips through toString");
        check(mtgtable.ai.SearchConfig.parse("leaf=hand").leafModel == null, "leaf=hand is the hand leaf");
        check(mtgtable.ai.SearchConfig.parseLive("leaf=eval:" + mp).leafModel != null,
                "a live seat may use the evaluator (it reads only the seat's own knowledge, D316)");
        for (final String bad : new String[] {"leaf=eval:", "leaf=net", "leaf=eval:a+b.json"}) {
            boolean no = false;
            try {
                mtgtable.ai.SearchConfig.parse(bad);
            } catch (final IllegalArgumentException e) {
                no = true;
            }
            check(no, "refused: " + bad);
        }
        final PositionEvaluator ev1 = mtgtable.ai.SearchPolicy.evaluator(mp);
        check(ev1 == mtgtable.ai.SearchPolicy.evaluator(mp), "one loaded evaluator per model path, shared");
        boolean missing = false;
        try {
            mtgtable.ai.SearchPolicy.evaluator(dir.resolve("no-such-model.json").toString());
        } catch (final IllegalArgumentException e) {
            missing = true;
        }
        check(missing, "a model that cannot be loaded is an error, never a silent hand leaf");

        if (failures > 0) {
            System.out.println("EVAL SELFTEST FAILED: " + failures + " of " + checks + " checks");
            System.exit(1);
        }
        System.out.println("eval selftest OK (" + checks + " checks)");
    }

    private static String describe(final EvalModel m) {
        return m.training().isEmpty() ? "fixture" : "fixture (" + JsonPosition.map(m.training().get("hyper")).get("hidden")
                + " hidden)";
    }

    private static String firstCube(final Path root) throws IOException {
        try (var s = Files.list(root.resolve("cubes"))) {
            return s.map(p -> p.getFileName().toString()).filter(f -> f.endsWith(".md")).sorted().findFirst()
                    .orElseThrow();
        }
    }

    private static List<String> strings(final Object o) {
        final List<String> out = new ArrayList<>();
        for (final Object x : JsonPosition.arr(o)) {
            out.add(String.valueOf(x));
        }
        return out;
    }

    // ------------------------------------------------------------ the log path (encode.py's encode_game)

    /** One game of a frame log: its header seat and its s2c frames, re-deliveries read once. */
    static final class LogGame {
        int seat;
        final List<Map<String, Object>> frames = new ArrayList<>();
    }

    static final class Row {
        int seq;
        double[] features;
        Position pos;
        Tally tally;
    }

    @SuppressWarnings("unchecked")
    static List<LogGame> readGames(final Path path) throws IOException {
        final List<LogGame> games = new ArrayList<>();
        InputStream in = Files.newInputStream(path);
        if (path.toString().endsWith(".gz")) {
            in = new GZIPInputStream(in);
        }
        try (BufferedReader r = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            LogGame cur = null;
            Set<Integer> seen = new HashSet<>();
            String line;
            while ((line = r.readLine()) != null) {
                line = line.strip();
                if (line.isEmpty()) {
                    continue;
                }
                final Object o;
                try {
                    o = Json.parse(line);
                } catch (final RuntimeException e) {
                    continue;   // a torn last line
                }
                if (!(o instanceof Map<?, ?> m)) {
                    continue;
                }
                if ("session".equals(m.get("kind"))) {
                    cur = new LogGame();
                    cur.seat = m.get("seat") instanceof Number n ? n.intValue() : 0;
                    games.add(cur);
                    seen = new HashSet<>();
                    continue;
                }
                final Object dir = m.containsKey("dir") ? m.get("dir") : "s2c";
                if (cur == null || !"s2c".equals(dir)) {
                    continue;
                }
                if (m.get("seq") instanceof Number n && !seen.add(n.intValue())) {
                    continue;
                }
                cur.frames.add((Map<String, Object>) m);
            }
        }
        return games;
    }

    /** encode.py's {@code game_outcome}'s labelled flag. */
    private static boolean labelled(final LogGame g) {
        boolean lab = false;
        for (final Map<String, Object> f : g.frames) {
            final Map<?, ?> b = JsonPosition.map(f.get("body"));
            if ("state".equals(f.get("type"))) {
                final Map<?, ?> go = JsonPosition.map(b.get("gameOver"));
                if (b.get("gameOver") != null && (go.get("winner") != null || go.get("reason") != null)) {
                    lab = true;
                }
            } else if ("over".equals(f.get("type"))) {
                lab = b.get("winner") != null || b.get("reason") != null;
            }
        }
        return lab;
    }

    /** encode.py's {@code encode_game} row selection, with Java's encoder. */
    static List<Row> decisionRows(final LogGame g, final FeatureEncoder enc, final List<String> phases) {
        final List<Row> rows = new ArrayList<>();
        if (!labelled(g)) {
            return rows;
        }
        final Set<String> want = new HashSet<>(phases == null ? FeatureSchema.DECISION_PHASES : phases);
        final Tally tally = new Tally();
        double[] prev = null;
        for (final Map<String, Object> f : g.frames) {
            if (!"state".equals(f.get("type"))) {
                continue;
            }
            final Map<?, ?> st = JsonPosition.map(f.get("body"));
            tally.apply(JsonPosition.arr(st.get("events")), JsonPosition.arr(st.get("stack")));
            if (st.get("gameOver") != null || !(st.get("priority") instanceof Number pr)
                    || pr.intValue() != g.seat || !want.contains(st.get("phase"))) {
                continue;
            }
            final Position pos = JsonPosition.of(st, g.seat);
            final double[] v = enc.encode(pos, g.seat, tally);
            if (prev != null && Arrays.equals(prev, v)) {
                continue;
            }
            prev = v;
            final Row r = new Row();
            r.seq = f.get("seq") instanceof Number n ? n.intValue() : 0;
            r.features = v;
            r.pos = pos;
            r.tally = snapshot(tally);
            rows.add(r);
        }
        return rows;
    }

    private static Tally snapshot(final Tally t) {
        final Tally c = new Tally();
        c.landsTurn.putAll(t.landsTurn);
        c.spellsTurn.putAll(t.spellsTurn);
        c.abilitiesTurn.putAll(t.abilitiesTurn);
        c.landsGame.putAll(t.landsGame);
        c.spellsGame.putAll(t.spellsGame);
        c.mulligans.putAll(t.mulligans);
        return c;
    }

    static String hash(final double[] v) {
        final StringBuilder sb = new StringBuilder(v.length * 2);
        for (int i = 0; i < v.length; i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append((long) v[i]);
        }
        try {
            final byte[] h = MessageDigest.getInstance("SHA-256").digest(sb.toString().getBytes(StandardCharsets.UTF_8));
            final StringBuilder hex = new StringBuilder();
            for (int i = 0; i < 8; i++) {
                hex.append(String.format(Locale.ROOT, "%02x", h[i] & 0xff));
            }
            return hex.toString();
        } catch (final java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String diff(final double[] got, final Map<?, ?> w, final EvalModel m) {
        if (w.get("nz") == null) {
            return "";
        }
        final double[] wv = new double[got.length];
        for (final Object nz : JsonPosition.arr(w.get("nz"))) {
            final Object[] kv = JsonPosition.arr(nz);
            wv[((Number) kv[0]).intValue()] = ((Number) kv[1]).doubleValue();
        }
        return " -- " + firstDiff(wv, got, m.schema());
    }

    private static String firstDiff(final double[] want, final double[] got, final FeatureSchema s) {
        for (int i = 0; i < want.length; i++) {
            if (want[i] != got[i]) {
                return s.names().get(i) + " " + want[i] + " -> " + got[i];
            }
        }
        return "no difference";
    }

    // ------------------------------------------------------------ the scrambler (test_encode.py's, in Java)

    /**
     * Rewrite everything a viewer may not see as if the log had leaked it.  With
     * {@code ownHand} the same rewrite hits the viewer's own hand instead (the
     * negative control).
     */
    @SuppressWarnings("unchecked")
    static void scramble(final LogGame g, final Random rng, final List<String> names, final boolean ownHand) {
        for (final Map<String, Object> f : g.frames) {
            if (!"state".equals(f.get("type"))) {
                continue;
            }
            final Map<String, Object> st = (Map<String, Object>) f.get("body");
            for (final Object po : JsonPosition.arr(st.get("players"))) {
                final Map<String, Object> p = (Map<String, Object>) po;
                final int pid = ((Number) p.get("id")).intValue();
                final Map<String, Object> z = (Map<String, Object>) p.get("zones");
                if (z == null) {
                    continue;
                }
                if (ownHand) {
                    if (pid == g.seat) {
                        final Map<String, Object> hand = (Map<String, Object>) z.get("hand");
                        final Object[] cards = JsonPosition.arr(hand.get("cards"));
                        final Object[] out = new Object[cards.length];
                        for (int i = 0; i < out.length; i++) {
                            out[i] = leaked(rng, names, "hand", pid);
                        }
                        hand.put("cards", out);
                    }
                    continue;
                }
                if (pid != g.seat) {
                    final Map<String, Object> hand = (Map<String, Object>) z.get("hand");
                    if (hand != null) {
                        final int n = JsonPosition.intOr0(hand.get("count"));
                        final List<Object> cards = new ArrayList<>();
                        for (int i = 0; i < n; i++) {
                            cards.add(leaked(rng, names, "hand", pid));
                        }
                        java.util.Collections.shuffle(cards, rng);
                        hand.put("cards", cards.toArray());
                    }
                }
                final Map<String, Object> lib = (Map<String, Object>) z.get("library");
                if (lib != null) {
                    final int n = Math.min(3, JsonPosition.intOr0(lib.get("count")));
                    final Object[] cards = new Object[n];
                    for (int i = 0; i < n; i++) {
                        cards[i] = leaked(rng, names, "library", pid);
                    }
                    lib.put("cards", cards);
                }
                for (final Map.Entry<String, Object> ze : z.entrySet()) {
                    final Map<String, Object> zz = (Map<String, Object>) ze.getValue();
                    final Object[] cards = JsonPosition.arr(zz.get("cards"));
                    for (int i = 0; i < cards.length; i++) {
                        final Map<String, Object> c = (Map<String, Object>) cards[i];
                        if (JsonPosition.truthy(c.get("hidden"))) {
                            final Map<String, Object> l = leaked(rng, names, ze.getKey(), pid);
                            l.put("hidden", true);
                            cards[i] = l;
                        } else if (JsonPosition.truthy(c.get("faceDown"))
                                && !Integer.valueOf(g.seat).equals(JsonPosition.intOrNull(c.get("controller")))) {
                            final Map<String, Object> alt = new HashMap<>();
                            alt.put("name", names.get(rng.nextInt(names.size())));
                            alt.put("manaCost", "{1}");
                            alt.put("types", "Creature - X");
                            alt.put("power", "9");
                            alt.put("toughness", "9");
                            c.put("alt", alt);
                        }
                    }
                    zz.put("cards", cards);
                }
            }
        }
    }

    private static Map<String, Object> leaked(final Random rng, final List<String> names, final String zone,
                                              final int owner) {
        final Map<String, Object> c = new HashMap<>();
        c.put("id", (long) (10_000 + rng.nextInt(90_000)));
        c.put("name", names.get(rng.nextInt(names.size())));
        c.put("setCode", "LEA");
        c.put("manaCost", "{3}{U}");
        c.put("types", new String[] {"Creature - Wizard", "Instant", "Land - Island"}[rng.nextInt(3)]);
        c.put("power", "3");
        c.put("toughness", "3");
        c.put("keywords", new Object[] {"FLYING"});
        c.put("damage", 0L);
        final Map<String, Object> counters = new HashMap<>();
        counters.put("+1/+1", 2L);
        c.put("counters", counters);
        c.put("tapped", false);
        c.put("sick", false);
        c.put("attacking", false);
        c.put("blocking", false);
        c.put("faceDown", false);
        c.put("token", false);
        c.put("controller", (long) owner);
        c.put("owner", (long) owner);
        c.put("zone", zone);
        return c;
    }
}
