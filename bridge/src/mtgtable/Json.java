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

import java.io.Reader;
import java.util.ArrayDeque;
import java.util.Deque;

/**
 * The bridge's JSON.
 *
 * <p><b>Writing</b> is {@link JsonOut}: a hand-written {@link StringBuilder}
 * emitter.  Hand-written because the 2.0.14 fat jar has <em>no</em> gson (gson
 * is a 2.0.15 dependency; {@code import com.google.gson} compiles against
 * nothing here) and because {@code org.eclipse.jetty.util.ajax.JSON}'s writer
 * would mean building a throw-away {@code Map} tree per frame, several hundred
 * times a game, on the game thread.
 *
 * <p><b>Parsing</b> is {@link #parse(String)}, which delegates to Jetty's
 * {@code org.eclipse.jetty.util.ajax.JSON} -- bundled in the Forge jar and
 * already used by {@link Config}.  Know its return shapes:
 *
 * <table>
 *   <caption>Jetty JSON.parse return types</caption>
 *   <tr><td>object</td><td>{@code java.util.Map<String,Object>}</td></tr>
 *   <tr><td>array</td><td>{@code Object[]} -- <b>not</b> a {@code List}</td></tr>
 *   <tr><td>integral number</td><td>{@code Long}</td></tr>
 *   <tr><td>fractional number</td><td>{@code Double}</td></tr>
 *   <tr><td>string</td><td>{@code String}</td></tr>
 *   <tr><td>true/false</td><td>{@code Boolean}</td></tr>
 *   <tr><td>null</td><td>{@code null}</td></tr>
 * </table>
 */
public final class Json {

    private Json() { }

    /**
     * Parse a JSON document.  See the class javadoc for the return shapes --
     * in particular arrays come back as {@code Object[]} and integers as
     * {@code Long}.
     *
     * @param text a JSON document
     * @return the parsed value, possibly {@code null}
     */
    public static Object parse(final String text) {
        return org.eclipse.jetty.util.ajax.JSON.parse(text);
    }

    /** Parse a JSON document from a reader.  Same return shapes as {@link #parse(String)}. */
    public static Object parse(final Reader reader) throws java.io.IOException {
        return org.eclipse.jetty.util.ajax.JSON.parse(reader);
    }

    /**
     * Escape a Java string into a JSON string literal, quotes included, and
     * append it to {@code sb}.  Exposed for the rare caller that needs a bare
     * literal outside a {@link JsonOut}.
     */
    public static void quote(final StringBuilder sb, final String s) {
        sb.append('"');
        final int n = s.length();
        for (int i = 0; i < n; i++) {
            final char c = s.charAt(i);
            switch (c) {
            case '"':  sb.append("\\\""); break;
            case '\\': sb.append("\\\\"); break;
            case '\b': sb.append("\\b");  break;
            case '\f': sb.append("\\f");  break;
            case '\n': sb.append("\\n");  break;
            case '\r': sb.append("\\r");  break;
            case '\t': sb.append("\\t");  break;
            default:
                if (c < 0x20) {
                    // Every other C0 control has to be backslash-u escaped; JSON forbids
                    // a raw control character inside a string.
                    unicode(sb, c);
                } else if (Character.isSurrogate(c)) {
                    // Non-ASCII passes straight through as UTF-8 -- but a LONE
                    // surrogate is not encodable, and silently writing one
                    // produces a file no JSON parser will read.  Escape only
                    // the unpaired ones; a well-formed pair is passed through.
                    final boolean pair = Character.isHighSurrogate(c)
                            && i + 1 < n && Character.isLowSurrogate(s.charAt(i + 1));
                    if (pair) {
                        sb.append(c).append(s.charAt(i + 1));
                        i++;
                    } else {
                        unicode(sb, c);
                    }
                } else {
                    sb.append(c);
                }
                break;
            }
        }
        sb.append('"');
    }

    private static void unicode(final StringBuilder sb, final char c) {
        sb.append("\\u");
        final String hex = Integer.toHexString(c);
        for (int p = hex.length(); p < 4; p++) {
            sb.append('0');
        }
        sb.append(hex);
    }

    // ==================================================================
    // JsonOut
    // ==================================================================

    /**
     * A streaming JSON writer over a {@link StringBuilder}.
     *
     * <p>Usage is a matched sequence of container open/close calls:
     *
     * <pre>
     *   String s = new JsonOut()
     *       .obj()
     *         .n("gameId", "g1").n("turn", 17)
     *         .key("players").arr()
     *            .obj().n("id", 0).n("life", 20).end()
     *         .end()
     *       .end()
     *       .done();
     * </pre>
     *
     * <p>Every structural mistake is an {@link IllegalStateException} at the
     * call site rather than a malformed file discovered by the reducer three
     * hundred frames later: a value with no key inside an object, a key inside
     * an array, {@link #end()} with nothing open, a dangling key, a second
     * top-level value, and {@link #done()} with a container still open.
     *
     * <p><b>Not thread safe.</b>  One instance per frame, built on the thread
     * that owns the data -- for {@link Snap} that is the Forge game thread.
     */
    public static final class JsonOut {

        private final StringBuilder sb;
        /** One entry per open container; {@code TRUE} = object, {@code FALSE} = array. */
        private final Deque<Boolean> stack = new ArrayDeque<>();
        /** Does the innermost open container still have no members? */
        private boolean empty = true;
        /** Has a key been written whose value is still owed? */
        private boolean afterKey;
        /** Has a complete top-level value been written? */
        private boolean done;

        public JsonOut() {
            this(new StringBuilder(4096));
        }

        public JsonOut(final StringBuilder target) {
            this.sb = target;
        }

        // -------- containers --------

        /** Open an object. */
        public JsonOut obj() {
            beforeValue();
            sb.append('{');
            stack.push(Boolean.TRUE);
            empty = true;
            afterKey = false;
            return this;
        }

        /** Open an array. */
        public JsonOut arr() {
            beforeValue();
            sb.append('[');
            stack.push(Boolean.FALSE);
            empty = true;
            afterKey = false;
            return this;
        }

        /** Close the innermost open object or array. */
        public JsonOut end() {
            if (stack.isEmpty()) {
                throw new IllegalStateException("end() with no open container");
            }
            if (afterKey) {
                throw new IllegalStateException("end() with a dangling key -- the value was never written");
            }
            sb.append(stack.pop() ? '}' : ']');
            // A child always makes its parent non-empty, and any key the parent
            // owed was consumed when the child was opened.
            empty = false;
            afterKey = false;
            if (stack.isEmpty()) {
                done = true;
            }
            return this;
        }

        /**
         * Write a key.  The next call must write exactly one value -- a scalar,
         * {@link #obj()} or {@link #arr()}.
         */
        public JsonOut key(final String k) {
            if (stack.isEmpty() || !stack.peek()) {
                throw new IllegalStateException("key(\"" + k + "\") outside an object");
            }
            if (afterKey) {
                throw new IllegalStateException("key(\"" + k + "\") while another key is still owed a value");
            }
            if (!empty) {
                sb.append(',');
            }
            quote(sb, k);
            sb.append(':');
            empty = false;
            afterKey = true;
            return this;
        }

        // -------- key + value --------

        /** {@code "key": "value"}, or {@code "key": null} when {@code v} is null. */
        public JsonOut n(final String k, final String v) {
            key(k);
            return v(v);
        }

        /** {@code "key": 42}. */
        public JsonOut n(final String k, final long v) {
            key(k);
            return v(v);
        }

        /** {@code "key": 1.5}. */
        public JsonOut n(final String k, final double v) {
            key(k);
            return v(v);
        }

        /** {@code "key": true}. */
        public JsonOut n(final String k, final boolean v) {
            key(k);
            return v(v);
        }

        /**
         * {@code "key": 42} or {@code "key": null}.  A separate name from
         * {@link #n(String, long)} because {@code n(k, null)} would otherwise be
         * an ambiguous overload, which is exactly the kind of thing that
         * compiles into the wrong branch.
         */
        public JsonOut nInt(final String k, final Integer v) {
            key(k);
            return v == null ? vNull() : v(v.longValue());
        }

        /** {@code "key": null}. */
        public JsonOut nNull(final String k) {
            key(k);
            return vNull();
        }

        // -------- bare values (array elements, or the value after key()) --------

        /** A string value, or null when {@code s} is null. */
        public JsonOut v(final String s) {
            if (s == null) {
                return vNull();
            }
            beforeValue();
            quote(sb, s);
            return afterValue();
        }

        /** An integer value. */
        public JsonOut v(final long value) {
            beforeValue();
            sb.append(value);
            return afterValue();
        }

        /**
         * A floating-point value.  NaN and the infinities have no JSON spelling,
         * so they are written as null rather than as the bare words Java's
         * {@code toString} would produce, which no parser accepts.
         */
        public JsonOut v(final double value) {
            if (Double.isNaN(value) || Double.isInfinite(value)) {
                return vNull();
            }
            beforeValue();
            sb.append(value);
            return afterValue();
        }

        /** A boolean value. */
        public JsonOut v(final boolean value) {
            beforeValue();
            sb.append(value ? "true" : "false");
            return afterValue();
        }

        /** A null value. */
        public JsonOut vNull() {
            beforeValue();
            sb.append("null");
            return afterValue();
        }

        /**
         * Splice in a value this writer produced <b>earlier</b>.
         *
         * <p>There is exactly one caller and one reason: {@code input.focusCard}
         * is a serialised card, a card may only be serialised on the Forge game
         * thread, and an {@code input} frame is assembled on the EDT.  So the
         * card is written by {@code Snap.card} into its own {@code JsonOut} when
         * the game thread has it, and the finished text is spliced in here.
         *
         * <p>It is <b>not</b> a general escape hatch: the argument must be a
         * complete JSON value that this class produced, never anything derived
         * from an engine string (that is what {@code Snap.stackText} is for).
         *
         * @throws IllegalArgumentException if the text is empty
         */
        public JsonOut raw(final String json) {
            if (json == null) {
                return vNull();
            }
            if (json.isEmpty()) {
                throw new IllegalArgumentException("raw(\"\") is not a JSON value");
            }
            beforeValue();
            sb.append(json);
            return afterValue();
        }

        // -------- finish --------

        /**
         * Return the finished document.
         *
         * @throws IllegalStateException if a container is still open, a key is
         *         owed a value, or nothing was written at all
         */
        public String done() {
            if (!stack.isEmpty()) {
                throw new IllegalStateException(stack.size() + " container(s) still open");
            }
            if (!done) {
                throw new IllegalStateException("nothing was written");
            }
            return sb.toString();
        }

        /** How many characters have been emitted so far.  Cheap; for budgeting. */
        public int length() {
            return sb.length();
        }

        // -------- internals --------

        private void beforeValue() {
            if (stack.isEmpty()) {
                if (done) {
                    throw new IllegalStateException("a second top-level value");
                }
                return;
            }
            if (stack.peek()) {           // object
                if (!afterKey) {
                    throw new IllegalStateException("value inside an object without a key");
                }
                afterKey = false;
            } else {                      // array
                if (!empty) {
                    sb.append(',');
                }
                empty = false;
            }
        }

        private JsonOut afterValue() {
            if (stack.isEmpty()) {
                done = true;
            }
            return this;
        }
    }
}
