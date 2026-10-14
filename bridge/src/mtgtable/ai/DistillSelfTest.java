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

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import mtgtable.Json;
import mtgtable.Json.JsonOut;

/**
 * The distilled policy's engine-free half (J126, B1), run by {@code bridge/build.sh}:
 *
 * <ul>
 * <li>the layout: {@code fixtures/distill/names.json} (what Python's tests and
 *     {@code distill.py golden} read) is {@link DistillFeatures}'s, and so is the
 *     rows file's header;</li>
 * <li>parity: {@code fixtures/distill/model.json}, a seeded model numpy wrote,
 *     scores {@code golden.json}'s decisions as numpy did (1e-9) and picks the
 *     same candidate; it covers p and a and not b;</li>
 * <li>refusals: another feature version, state schema, candidate list or width;</li>
 * <li>the config key ({@code distill=}) round trip, and its absence by default
 *     and in the live seat's defaults;</li>
 * <li>the row writer: a header, the row (the state sparse), the game's end, and
 *     nothing at all while it is off.</li>
 * </ul>
 *
 * {@code DistillSelfTest <repo> --write-names} writes {@code names.json} from
 * this layout (then run {@code python3 tools/ml/distill.py golden}).
 */
public final class DistillSelfTest {

    private static int checks;
    private static int failures;

    private DistillSelfTest() {
    }

    private static void check(final boolean ok, final String what) {
        checks++;
        if (!ok) {
            failures++;
            System.out.println("FAIL: " + what);
        }
    }

    static String namesJson() {
        final JsonOut j = new JsonOut().obj().n("featureVersion", DistillFeatures.VERSION)
                .n("stateSchemaId", DistillFeatures.stateSchema().schemaId())
                .n("stateSize", (long) DistillFeatures.stateSchema().size());
        j.key("cand").obj();
        for (final String k : DistillFeatures.KINDS) {
            j.key(k).arr();
            for (final String s : DistillFeatures.names(k)) {
                j.v(s);
            }
            j.end();
        }
        j.end();
        return j.end().done() + "\n";
    }

    public static void main(final String[] args) throws Exception {
        final Path repo = Path.of(args.length > 0 ? args[0] : ".");
        final Path dir = repo.resolve("fixtures/distill");
        if (args.length > 1 && "--write-names".equals(args[1])) {
            Files.createDirectories(dir);
            Files.writeString(dir.resolve("names.json"), namesJson(), StandardCharsets.UTF_8);
            System.out.println("wrote " + dir.resolve("names.json"));
            return;
        }

        // 1. the layout
        final String names = Files.readString(dir.resolve("names.json"), StandardCharsets.UTF_8);
        check(names.equals(namesJson()), "fixtures/distill/names.json is DistillFeatures' layout (rewrite it with "
                + "--write-names, then python3 tools/ml/distill.py golden, if the layout changed on purpose)");
        final Map<?, ?> header = (Map<?, ?>) Json.parse(DistillRows.header());
        check("header".equals(header.get("type")) && DistillFeatures.VERSION.equals(header.get("featureVersion"))
                && DistillFeatures.stateSchema().schemaId().equals(header.get("stateSchemaId"))
                && ((Number) header.get("stateSize")).intValue() == DistillFeatures.stateSchema().size()
                && ((Object[]) header.get("stateNames")).length == DistillFeatures.stateSchema().size(),
                "the rows header names the layout: " + header.get("featureVersion") + ", " + header.get("stateSchemaId"));
        check(DistillFeatures.stateSchema().size() == DistillFeatures.stateSchema().cardOffset() + 9 * 17,
                "the state is the board features plus the nine special slots x 17 states ("
                        + DistillFeatures.stateSchema().size() + ")");

        // 2. parity with numpy
        final DistillModel m = DistillModel.load(dir.resolve("model.json"));
        check(m.covers("p") && m.covers("a") && !m.covers("b"), "the golden model covers p and a, not b");
        final Map<?, ?> golden = (Map<?, ?>) Json.parse(Files.readString(dir.resolve("golden.json"), StandardCharsets.UTF_8));
        double worst = 0;
        int cases = 0;
        for (final Object o : DistillModel.arr(golden.get("cases"))) {
            final Map<?, ?> c = (Map<?, ?>) o;
            final String kind = String.valueOf(c.get("kind"));
            final double[] state = DistillModel.doubles(c.get("state"), DistillFeatures.stateSchema().size(), "state");
            final Object[] cs = DistillModel.arr(c.get("cands"));
            final double[][] cands = new double[cs.length][];
            for (int i = 0; i < cs.length; i++) {
                cands[i] = DistillModel.doubles(cs[i], DistillFeatures.names(kind).size(), "cand");
            }
            final double[] want = DistillModel.doubles(c.get("scores"), cs.length, "scores");
            final double[] got = m.scores(kind, state, cands);
            for (int i = 0; i < want.length; i++) {
                worst = Math.max(worst, Math.abs(got[i] - want[i]) / Math.max(1, Math.abs(want[i])));
            }
            check(DistillModel.argmax(got) == ((Number) c.get("argmax")).intValue(), "case " + cases + ": the same pick");
            cases++;
        }
        check(cases >= 6 && worst <= 1e-9, "parity over " + cases + " decisions: worst relative difference " + worst);
        boolean threw = false;
        try {
            m.scores("b", new double[DistillFeatures.stateSchema().size()], new double[2][DistillFeatures.B_NAMES.size()]);
        } catch (final IllegalArgumentException e) {
            threw = true;
        }
        check(threw, "scoring an uncovered kind is refused (the seat checks covers() first)");
        check(DistillModel.argmax(new double[] {1, 1, 0}) == 0 && DistillModel.argmax(new double[] {0, 2, 2}) == 1,
                "a tie goes to the lowest index (Forge's answer first)");

        // 3. refusals
        final String text = Files.readString(dir.resolve("model.json"), StandardCharsets.UTF_8);
        check(refused(text.replace("\"" + DistillFeatures.VERSION + "\"", "\"distill-v0\"")), "another feature version is refused");
        check(refused(text.replace("\"" + DistillFeatures.stateSchema().schemaId() + "\"", "\"0000000000000000\"")),
                "another state schema is refused");
        check(refused(text.replace("\"pass\"", "\"passed\"")), "another candidate list is refused");
        check(refused(text.replace("\"formatVersion\":1", "\"formatVersion\":2")), "another format version is refused");
        check(refused(text.replaceFirst("\"b1\":\\[[^\\]]*\\]", "\"b1\":[0]")), "a layer of the wrong width is refused");

        // 4. the config key
        final SearchConfig sc = SearchConfig.parse("anytime=1,distill=var/ml/models/distill-0123456789ab.json");
        check("var/ml/models/distill-0123456789ab.json".equals(sc.distillModel)
                && sc.toString().endsWith(",anytime=1,distill=var/ml/models/distill-0123456789ab.json")
                && SearchConfig.parse(sc.toString()).toString().equals(sc.toString()),
                "distill= round-trips: " + sc);
        check(SearchConfig.parse("").distillModel == null && !SearchConfig.parse("").toString().contains("distill")
                && SearchConfig.parseLive("").distillModel == null, "no distill by default, nor in the live seat");
        check(SearchConfig.parse("distill=x.json").withLeaf("eval:m.json").withDecisions(true, 6000, 3, true).distillModel
                .equals("x.json"), "the other copies keep it");
        threw = false;
        try {
            SearchConfig.parse("distill=a+b.json");
        } catch (final IllegalArgumentException e) {
            threw = true;
        }
        check(threw, "a path a seat config cannot spell is refused");

        // 5. the row writer
        final Path tmp = Files.createTempDirectory("distill-selftest");
        try {
            DistillRows.enableForTest(null);
            DistillRows.row(1, "Drafter A", "p", 3, new double[] {0, 2}, new double[][] {{1, 0}}, List.of("pass"), 0, null, 1.0);
            check(!Files.list(tmp).findAny().isPresent() && DistillRows.rowsWritten() == 0, "off: nothing written");
            DistillRows.enableForTest(tmp);
            check(DistillRows.enabled(), "on");
            DistillRows.setGame("lab:x:g1");
            final double[] st = new double[DistillFeatures.stateSchema().size()];
            st[0] = 4;
            st[7] = 1.5;
            DistillRows.row(9, "Drafter A", "a", 4, st, new double[][] {{1, 0, 2}, {0, 1, 0}},
                    List.of("attack:1", "attack:"), 1, null, 812.4567);
            DistillRows.endGame("lab:x:g1", "A", true);
            DistillRows.close();
            final List<String> lines = Files.readAllLines(DistillRows.file(tmp), StandardCharsets.UTF_8);
            check(lines.size() == 3, "header, row, end (" + lines.size() + " lines)");
            if (lines.size() == 3) {
                final Map<?, ?> row = (Map<?, ?>) Json.parse(lines.get(1));
                final Map<?, ?> end = (Map<?, ?>) Json.parse(lines.get(2));
                final Object[] s = (Object[]) row.get("s");
                check("row".equals(row.get("type")) && "lab:x:g1".equals(row.get("game")) && "a".equals(row.get("kind"))
                        && ((Number) row.get("chosen")).intValue() == 1 && Boolean.TRUE.equals(row.get("overrode"))
                        && row.get("fallback") == null && ((Number) row.get("n")).intValue() == 2
                        && Math.abs(((Number) row.get("ms")).doubleValue() - 812.457) < 1e-9,
                        "the row: " + lines.get(1).substring(0, Math.min(160, lines.get(1).length())));
                check(s.length == 2 && ((Number) ((Object[]) s[0])[0]).intValue() == 0
                        && ((Number) ((Object[]) s[1])[1]).doubleValue() == 1.5, "the state is sparse: [[0,4],[7,1.5]]");
                check("end".equals(end.get("type")) && Boolean.TRUE.equals(end.get("ok")) && "A".equals(end.get("winner")),
                        "the end line: " + lines.get(2));
            }
            check(DistillRows.rowsWritten() == 1, "one row counted");
        } finally {
            DistillRows.enableForTest(null);
            try (var w = Files.walk(tmp)) {
                final List<Path> all = new ArrayList<>(w.toList());
                all.sort(Comparator.reverseOrder());
                for (final Path p : all) {
                    Files.deleteIfExists(p);
                }
            }
        }

        System.out.println("distill selftest: " + checks + " check(s), " + failures + " failure(s)");
        if (failures > 0) {
            System.exit(1);
        }
    }

    private static boolean refused(final String json) throws IOException {
        final Path f = Files.createTempFile("distill-model", ".json");
        try {
            Files.writeString(f, json, StandardCharsets.UTF_8);
            DistillModel.load(f);
            return false;
        } catch (final IllegalArgumentException e) {
            return true;
        } finally {
            Files.deleteIfExists(f);
        }
    }
}
