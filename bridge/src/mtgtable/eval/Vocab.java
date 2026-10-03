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

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The closed card pool a model was trained for: the six basics, the cube's cards
 * in listed order, then {@code <other>}, {@code <token>} and {@code <facedown>}.
 * A line-for-line port of {@code tools/ml/encode.py}'s {@code Vocab},
 * {@code norm_name} and the three list readers (cube design file, Forge
 * {@code .dck}, plain list); {@code EvalSelfTest} holds the port to Python's own
 * output for every cube under {@code cubes/} (D316).
 */
public final class Vocab {

    public static final List<String> BASICS =
            List.of("Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes");
    public static final String OTHER = "<other>";
    public static final String TOKEN = "<token>";
    public static final String FACEDOWN = "<facedown>";
    public static final List<String> SPECIALS = List.of(OTHER, TOKEN, FACEDOWN);

    private static final int U = Pattern.UNICODE_CHARACTER_CLASS;
    private static final Pattern WS = Pattern.compile("\\s+", U);

    private final List<String> cards;
    private final Map<String, Integer> index = new HashMap<>();
    /** slot() by raw name: norm() is the expensive part of an encode, and a game has few names. */
    private final Map<String, Integer> slotCache = new java.util.concurrent.ConcurrentHashMap<>();

    private Vocab(final List<String> cards) {
        this.cards = Collections.unmodifiableList(new ArrayList<>(cards));
        for (int i = 0; i < cards.size(); i++) {
            index.putIfAbsent(norm(cards.get(i)), i);
        }
        for (final String s : SPECIALS) {
            if (!index.containsKey(norm(s))) {
                throw new IllegalArgumentException("a vocabulary must end with the special slots " + SPECIALS);
            }
        }
    }

    /** A vocabulary exactly as a model or features.json lists it (basics and specials included). */
    public static Vocab ofCards(final List<String> cards) {
        return new Vocab(cards);
    }

    /** encode.py's {@code Vocab.from_names}: basics first, de-duplicated by key, specials last. */
    public static Vocab fromNames(final List<String> names) {
        final Set<String> seen = new HashSet<>();
        final List<String> out = new ArrayList<>();
        final List<String> all = new ArrayList<>(BASICS);
        all.addAll(names);
        for (final String n : all) {
            final String k = norm(n);
            if (k.isEmpty() || seen.contains(k) || SPECIALS.contains(n)) {
                continue;
            }
            seen.add(k);
            out.add(n);
        }
        out.addAll(SPECIALS);
        return new Vocab(out);
    }

    /** Several vocabulary files merged in order (encode.py's {@code Vocab.from_files}). */
    public static Vocab fromFiles(final List<Path> paths) throws IOException {
        final List<String> names = new ArrayList<>();
        for (final Path p : paths) {
            names.addAll(readNames(p));
        }
        return fromNames(names);
    }

    public List<String> cards() {
        return cards;
    }

    public int size() {
        return cards.size();
    }

    /** A card name's slot; a name outside the pool is {@code <other>}. */
    public int slot(final String name) {
        final String n = name == null ? "" : name;
        final Integer hit = slotCache.get(n);
        if (hit != null) {
            return hit;
        }
        final Integer i = index.get(norm(n));
        final int s = i == null ? index.get(norm(OTHER)) : i;
        if (slotCache.size() < 100_000) {
            slotCache.put(n, s);
        }
        return s;
    }

    public int special(final String s) {
        return index.get(norm(s));
    }

    /**
     * The key a name is matched by: accents folded (NFKD, combining marks
     * dropped), the front face of an {@code A // B} name, whitespace collapsed,
     * lower case.
     */
    public static String norm(final String name) {
        final String d = Normalizer.normalize(name, Normalizer.Form.NFKD);
        final StringBuilder sb = new StringBuilder(d.length());
        for (int i = 0; i < d.length(); ) {
            final int cp = d.codePointAt(i);
            final int t = Character.getType(cp);
            if (t != Character.NON_SPACING_MARK && t != Character.ENCLOSING_MARK
                    && t != Character.COMBINING_SPACING_MARK) {
                sb.appendCodePoint(cp);
            }
            i += Character.charCount(cp);
        }
        String s = sb.toString();
        final int cut = s.indexOf(" // ");
        if (cut >= 0) {
            s = s.substring(0, cut);
        }
        return WS.matcher(s).replaceAll(" ").strip().toLowerCase(Locale.ROOT);
    }

    // ------------------------------------------------------------ list readers

    private static final Pattern H2 = Pattern.compile("^##\\s+(?!#)(.*)$", U);
    private static final Pattern THE_LIST = Pattern.compile("^the list", U | Pattern.CASE_INSENSITIVE);
    private static final Pattern H3 = Pattern.compile("^###\\s+(.+?)\\s*\\((\\d+)\\)\\s*$", U);
    private static final Pattern PAIR = Pattern.compile("^([WUBRG]{2}):\\s*", U);
    private static final Pattern LAND_LINE =
            Pattern.compile("^([A-Z][A-Za-z ]*?)(?:\\s*\\(([^)]*)\\))?:\\s*(.*)$", U);
    private static final Pattern LAND = Pattern.compile("land", U | Pattern.CASE_INSENSITIVE);
    private static final Pattern PATHWAYS = Pattern.compile("^pathways?$", U | Pattern.CASE_INSENSITIVE);
    private static final Pattern TAGS = Pattern.compile("^(.*?)\\s+—\\s+(.*)$", U);
    private static final Pattern PRICE = Pattern.compile("\\s+\\d+(\\.\\d+)?$", U);
    private static final Pattern IS_MD =
            Pattern.compile("^##\\s+the list", U | Pattern.CASE_INSENSITIVE | Pattern.MULTILINE);
    private static final Pattern COUNTED = Pattern.compile("^(\\d+)\\s+(.+)$", U);
    private static final Pattern COUNTED_X = Pattern.compile("^(\\d+)x?\\s+(.+)$", U);

    /** encode.py's {@code read_vocab_names}. */
    public static List<String> readNames(final Path p) throws IOException {
        final String text = Files.readString(p, StandardCharsets.UTF_8);
        if (p.toString().endsWith(".dck")) {
            return parseDck(text);
        }
        if (IS_MD.matcher(text).find()) {
            return parseCubeMarkdown(text);
        }
        return parsePlain(text);
    }

    private static String[] lines(final String text) {
        return text.split("\r\n|\r|\n", -1);
    }

    private static String rstrip(final String s) {
        return s.stripTrailing();
    }

    static String splitItem(final String item) {
        String t = item.strip();
        while (t.endsWith(".")) {
            t = t.substring(0, t.length() - 1);
        }
        final Matcher m = TAGS.matcher(t);
        final String name = m.matches() ? m.group(1) : t;
        return PRICE.matcher(name).replaceFirst("").strip();
    }

    /** encode.py's {@code parse_cube_markdown}: the cube lab's list format. */
    public static List<String> parseCubeMarkdown(final String text) {
        final List<String> names = new ArrayList<>();
        boolean inList = false;
        String section = null;
        for (final String raw : lines(text)) {
            final String line = rstrip(raw);
            final Matcher h2 = H2.matcher(line);
            if (h2.matches()) {
                inList = THE_LIST.matcher(h2.group(1)).lookingAt();
                section = null;
                continue;
            }
            final Matcher h3 = H3.matcher(line);
            if (h3.matches() && inList) {
                section = h3.group(1);
                continue;
            }
            if (!inList || section == null || line.strip().isEmpty()) {
                continue;
            }
            final Matcher pair = PAIR.matcher(line);
            final boolean isPair = pair.lookingAt();
            String body = isPair ? line.substring(pair.end()) : line;
            String landKind = null;
            final Matcher lm = LAND_LINE.matcher(body);
            if (!isPair && LAND.matcher(section).find() && lm.matches()) {
                landKind = lm.group(1);
                body = lm.group(3);
            }
            final String[] items;
            if (body.contains(" · ")) {
                items = body.split(" · ", -1);
            } else if (landKind != null) {
                items = body.split(",", -1);
            } else {
                items = new String[] {body};
            }
            for (final String item : items) {
                String n = splitItem(item);
                if (n.isEmpty()) {
                    continue;
                }
                if (landKind != null && PATHWAYS.matcher(landKind).matches() && !n.endsWith("Pathway")) {
                    n = n + " Pathway";
                }
                names.add(n);
            }
        }
        return names;
    }

    /** encode.py's {@code parse_dck}: every section but [metadata]. */
    public static List<String> parseDck(final String text) {
        final List<String> names = new ArrayList<>();
        String sect = "";
        for (final String raw : lines(text)) {
            final String line = raw.strip();
            if (line.isEmpty() || line.startsWith("#")) {
                continue;
            }
            if (line.startsWith("[") && line.endsWith("]")) {
                sect = line.substring(1, line.length() - 1).toLowerCase(Locale.ROOT);
                continue;
            }
            if ("metadata".equals(sect)) {
                continue;
            }
            final Matcher m = COUNTED.matcher(line);
            final String n = (m.matches() ? m.group(2) : line).split("\\|", -1)[0].strip();
            if (!n.isEmpty()) {
                names.add(n);
            }
        }
        return names;
    }

    /** encode.py's {@code parse_plain}: one name per line, {@code 4 Name} allowed. */
    public static List<String> parsePlain(final String text) {
        final List<String> names = new ArrayList<>();
        for (final String raw : lines(text)) {
            final String line = raw.strip();
            if (line.isEmpty() || line.startsWith("#")) {
                continue;
            }
            final Matcher m = COUNTED_X.matcher(line);
            names.add((m.matches() ? m.group(2) : line).split("\\|", -1)[0].strip());
        }
        return names;
    }
}
