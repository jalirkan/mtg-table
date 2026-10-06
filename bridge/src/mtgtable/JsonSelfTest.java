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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import mtgtable.Json.JsonOut;

/**
 * Unit check for {@link Json}.  Run by {@code bridge/build.sh} after every
 * compile, so a broken escape or a broken nesting check fails the build rather
 * than a fixture three hundred frames in.
 *
 * <p>There is no JUnit on this machine (JRE only, no Maven), so this is a
 * {@code main} that prints and exits non-zero.  Every emitted document is also
 * round-tripped through {@link Json#parse(String)} -- Jetty's parser, the same
 * one the browser's {@code JSON.parse} agrees with -- so "it looks right" is
 * never the standard.
 *
 * <p>It also holds {@code Snap.block}, the {@code blockers} event's one entry
 * (amendment M52, D290): a pure function over ids, so it needs no engine.
 */
public final class JsonSelfTest {

    private JsonSelfTest() { }

    private static int checks;
    private static final List<String> FAILURES = new ArrayList<>();

    public static void main(final String[] args) {
        writerBasics();
        escaping();
        numbers();
        nesting();
        nestingErrors();
        parsing();
        blockersEvent();
        noticeNames();

        System.out.println("JsonSelfTest: " + checks + " check(s), " + FAILURES.size() + " failure(s)");
        for (final String f : FAILURES) {
            System.out.println("  FAIL " + f);
        }
        System.exit(FAILURES.isEmpty() ? 0 : 1);
    }

    // ------------------------------------------------------------------

    /**
     * {@code Snap.noticeName}: the "Not selectable" notice names a card only
     * when its gated label says the viewer may see it -- a concealed card
     * ({@code "???"}) or one missing from the last frame is its id alone.
     */
    private static void noticeNames() {
        eq("noticeName: a visible card by name", "Grizzly Bears", Snap.noticeName(41, "Grizzly Bears"));
        eq("noticeName: a visible face-down card stays generic", "Face-down card",
           Snap.noticeName(41, "Face-down card"));
        eq("noticeName: a concealed card is its id, never a name", "card 41", Snap.noticeName(41, "???"));
        eq("noticeName: a card not in the last frame is its id", "card 41", Snap.noticeName(41, null));
        eq("noticeName: an empty label is its id", "card 41", Snap.noticeName(41, ""));
    }

    private static void writerBasics() {
        eq("empty object", "{}", new JsonOut().obj().end().done());
        eq("empty array", "[]", new JsonOut().arr().end().done());
        eq("flat object",
           "{\"a\":1,\"b\":\"x\",\"c\":true,\"d\":null}",
           new JsonOut().obj().n("a", 1).n("b", "x").n("c", true).nNull("d").end().done());
        eq("null string is null",
           "{\"a\":null}",
           new JsonOut().obj().n("a", (String) null).end().done());
        eq("nullable int",
           "{\"a\":7,\"b\":null}",
           new JsonOut().obj().nInt("a", Integer.valueOf(7)).nInt("b", null).end().done());
        eq("array of scalars",
           "[1,\"two\",false,null]",
           new JsonOut().arr().v(1).v("two").v(false).vNull().end().done());
        eq("bare scalar top level", "\"hi\"", new JsonOut().v("hi").done());
    }

    private static void escaping() {
        eq("quote and backslash",
           "\"a\\\"b\\\\c\"",
           new JsonOut().v("a\"b\\c").done());
        eq("named control escapes",
           "\"\\b\\f\\n\\r\\t\"",
           new JsonOut().v("\b\f\n\r\t").done());
        eq("other C0 controls go to \\u",
           "\"\\u0000\\u0001\\u001f\"",
           new JsonOut().v("\u0000\u0001\u001f").done());
        eq("DEL is not escaped (it is legal raw JSON)",
           "\"\u007f\"",
           new JsonOut().v("\u007f").done());
        // Non-ASCII passthrough: the em dash in every Magic type line, and a
        // card name with a diacritic.
        eq("non-ASCII passes through",
           "\"Legendary Creature \u2014 Human\u00e9\"",
           new JsonOut().v("Legendary Creature \u2014 Human\u00e9").done());
        eq("astral plane pair passes through",
           "\"\ud83c\udccf\"",
           new JsonOut().v("\ud83c\udccf").done());
        eq("lone high surrogate is escaped",
           "\"\\ud83c\"",
           new JsonOut().v("\ud83c").done());
        eq("lone low surrogate is escaped",
           "\"x\\udccfy\"",
           new JsonOut().v("x\udccfy").done());
        eq("keys are escaped too",
           "{\"a\\nb\":1}",
           new JsonOut().obj().n("a\nb", 1).end().done());

        // Everything above must survive a real parser.
        final String s = new JsonOut().obj()
                .n("t", "quote\" back\\ nl\n tab\t em\u2014 emoji\ud83c\udccf ctrl\u0001")
                .end().done();
        final Object parsed = Json.parse(s);
        checks++;
        if (!(parsed instanceof Map)
                || !"quote\" back\\ nl\n tab\t em\u2014 emoji\ud83c\udccf ctrl\u0001"
                        .equals(((Map<?, ?>) parsed).get("t"))) {
            FAILURES.add("escaped string did not round-trip through Json.parse: " + s);
        }
    }

    private static void numbers() {
        eq("long bounds",
           "[9223372036854775807,-9223372036854775808,0]",
           new JsonOut().arr().v(Long.MAX_VALUE).v(Long.MIN_VALUE).v(0).end().done());
        eq("double", "[1.5,-0.25]", new JsonOut().arr().v(1.5d).v(-0.25d).end().done());
        eq("NaN and infinity become null -- they have no JSON spelling",
           "[null,null,null]",
           new JsonOut().arr().v(Double.NaN).v(Double.POSITIVE_INFINITY)
                              .v(Double.NEGATIVE_INFINITY).end().done());
    }

    private static void nesting() {
        final String s = new JsonOut().obj()
                .n("gameId", "g1")
                .n("turn", 17)
                .key("players").arr()
                    .obj().n("id", 0).key("zones").obj()
                        .key("hand").obj().n("count", 2).key("cards").arr()
                            .obj().n("id", 41).n("name", "Agent Phil Coulson").end()
                            .obj().n("id", 42).n("hidden", true).end()
                        .end().end()
                        .key("library").obj().n("count", 21).end()
                    .end().end()
                .end()
                .key("combat").arr().end()
                .end().done();
        eq("nested document",
           "{\"gameId\":\"g1\",\"turn\":17,\"players\":[{\"id\":0,\"zones\":{\"hand\":{\"count\":2,"
           + "\"cards\":[{\"id\":41,\"name\":\"Agent Phil Coulson\"},{\"id\":42,\"hidden\":true}]},"
           + "\"library\":{\"count\":21}}}],\"combat\":[]}",
           s);

        checks++;
        final Object parsed = Json.parse(s);
        if (!(parsed instanceof Map)) {
            FAILURES.add("nested document did not parse back to a Map");
        } else {
            final Object players = ((Map<?, ?>) parsed).get("players");
            // Jetty hands arrays back as Object[], NOT as a List.  If this ever
            // changes, every reader in the bridge needs to know.
            if (!(players instanceof Object[]) || ((Object[]) players).length != 1) {
                FAILURES.add("expected Object[1] for players, got " + players);
            }
        }
    }

    private static void nestingErrors() {
        throwsIse("value in an object without a key", () -> new JsonOut().obj().v(1));
        throwsIse("key inside an array", () -> new JsonOut().arr().key("a"));
        throwsIse("key at the top level", () -> new JsonOut().key("a"));
        throwsIse("end() with nothing open", () -> new JsonOut().end());
        throwsIse("dangling key at end()", () -> new JsonOut().obj().key("a").end());
        throwsIse("two keys in a row", () -> new JsonOut().obj().key("a").key("b"));
        throwsIse("second top-level value", () -> new JsonOut().v(1).v(2));
        throwsIse("done() with a container open", () -> new JsonOut().obj().done());
        throwsIse("done() with nothing written", () -> new JsonOut().done());
    }

    private static void parsing() {
        checks++;
        final Object o = Json.parse("{\"n\":3,\"f\":1.5,\"a\":[1,2],\"s\":\"x\",\"b\":true,\"z\":null}");
        if (!(o instanceof Map)) {
            FAILURES.add("parse did not return a Map");
            return;
        }
        final Map<?, ?> m = (Map<?, ?>) o;
        // These four assertions are the documented contract of Jetty's parser
        // and the reason Config.num() casts to Number rather than to Integer.
        expect("integral number is Long", m.get("n") instanceof Long && ((Long) m.get("n")) == 3L);
        expect("fractional number is Double", m.get("f") instanceof Double);
        expect("array is Object[]", m.get("a") instanceof Object[]);
        expect("string is String", "x".equals(m.get("s")));
        expect("boolean is Boolean", Boolean.TRUE.equals(m.get("b")));
        expect("json null is java null", m.get("z") == null);
    }

    // ------------------------------------------------------------------

    /**
     * {@code Snap.block}, the {@code blockers} event's one entry (amendment M52,
     * D290): Forge hands an UNBLOCKED attacker over as its own one blocker, and
     * the wire must say {@code []} for it, as {@code state.combat} does.  A pure
     * function over ids, so no engine and no {@code CardView} is needed.
     */
    private static void blockersEvent() {
        eq("blockers: Forge's unblocked sentinel (the attacker as its own blocker) is []",
           "{\"attackerId\":12,\"blockerIds\":[]}",
           blockDoc(12, List.of(Integer.valueOf(12))));
        eq("blockers: a real block is relayed as Forge ordered it",
           "{\"attackerId\":12,\"blockerIds\":[31,30]}",
           blockDoc(12, List.of(Integer.valueOf(31), Integer.valueOf(30))));
        eq("blockers: an empty list stays empty",
           "{\"attackerId\":12,\"blockerIds\":[]}",
           blockDoc(12, List.of()));
        eq("blockers: a null list is written as []",
           "{\"attackerId\":12,\"blockerIds\":[]}",
           blockDoc(12, null));
        eq("blockers: another attacker's id is not dropped, only this one's",
           "{\"attackerId\":12,\"blockerIds\":[13]}",
           blockDoc(12, List.of(Integer.valueOf(13))));
        final List<Integer> withNull = new ArrayList<>();
        withNull.add(null);
        withNull.add(Integer.valueOf(31));
        eq("blockers: a null id is skipped",
           "{\"attackerId\":12,\"blockerIds\":[31]}",
           blockDoc(12, withNull));
        eq("blockers: two entries in one array nest correctly",
           "[{\"attackerId\":1,\"blockerIds\":[]},{\"attackerId\":2,\"blockerIds\":[5]}]",
           twoBlocks());
    }

    private static String blockDoc(final int attacker, final List<Integer> blockers) {
        final JsonOut o = new JsonOut();
        Snap.block(o, attacker, blockers);
        return o.done();
    }

    private static String twoBlocks() {
        final JsonOut o = new JsonOut().arr();
        Snap.block(o, 1, List.of(Integer.valueOf(1)));
        Snap.block(o, 2, List.of(Integer.valueOf(5)));
        return o.end().done();
    }

    private static void eq(final String what, final String expected, final String actual) {
        checks++;
        if (!expected.equals(actual)) {
            FAILURES.add(what + "\n       expected: " + expected + "\n       actual:   " + actual);
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
}
