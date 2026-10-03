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

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

/**
 * What the grader may believe about the opponent's hidden cards, and the live
 * guard that keeps it so (D348, the engine review's H3).  Engine-free: no Forge
 * class, so {@link GradeSelfTest} holds it on every build, the planted-leak
 * test included.
 *
 * <p><b>The rule.</b> A live analysis ({@code analyse}, {@code serve}) answers
 * for a person playing the AI right now.  In ForgeCoach's Draft vs AI the AI's
 * 40 cards are exactly what that person must not know (they see only the AI
 * picks they watched, {@code knownAiCards}), and the match launcher writes the
 * AI's list to {@code var/match/<id>/ai.dck}, next to where the helper starts
 * {@code serve}.  So in a live mode:
 * <ul>
 * <li>an opponent DECK list is refused unless the request marks it public, with
 *     a reason ({@code --opp-deck-public "<reason>"}, {@code "oppDeckPublic":
 *     true, "oppDeckPublicReason": "..."}) -- a constructed match whose lists
 *     both players shared;</li>
 * <li>an opponent list (deck or pool) that is the launcher's AI file
 *     ({@code ai.dck}), or the opponent's deck path the log header names, is
 *     refused the same way;</li>
 * <li>a "pool" too small to be a pool (under {@link #MIN_LIVE_POOL} cards) is
 *     a deck under another name, and is refused the same way;</li>
 * <li>the default is POOL mode: the cube list, minus the player's own deck and
 *     drafted pool, minus every card already public, with the AI picks the
 *     player saw ({@code oppKnown}) drawn first.</li>
 * </ul>
 * Review and bench grading ({@code grade}, {@code batch}) keep D334's rule: the
 * opponent's list may be named, because nobody is playing that game any more.
 */
public final class HiddenPool {

    private HiddenPool() { }

    /** The smallest opponent pool a live analysis accepts without the public flag: two decks' worth. */
    public static final int MIN_LIVE_POOL = 80;

    /** A multiset of card names. */
    public static Map<String, Integer> count(final List<String> names) {
        final Map<String, Integer> out = new TreeMap<>();
        for (final String n : names) {
            out.merge(n, 1, Integer::sum);
        }
        return out;
    }

    /**
     * The cards the opponent may hold, in pool mode: {@code pool} minus, name by
     * name, the most copies the viewer is known to own (their deck, their whole
     * drafted pool, the copies of theirs seen in public), minus every copy of
     * the opponent's seen in public.  Nulls are empty.  Never negative.
     */
    public static Map<String, Integer> remainder(final Map<String, Integer> pool, final Map<String, Integer> ownDeck,
                                                 final Map<String, Integer> ownPool, final List<String> ownSeen,
                                                 final List<String> oppSeen) {
        final Map<String, Integer> out = new TreeMap<>();
        if (pool == null) {
            return out;
        }
        final Map<String, Integer> seenMine = count(ownSeen == null ? List.of() : ownSeen);
        final Map<String, Integer> seenTheirs = count(oppSeen == null ? List.of() : oppSeen);
        for (final Map.Entry<String, Integer> e : pool.entrySet()) {
            final String n = e.getKey();
            final int mine = Math.max(get(ownDeck, n), Math.max(get(ownPool, n), get(seenMine, n)));
            final int left = e.getValue() - mine - get(seenTheirs, n);
            if (left > 0) {
                out.put(n, left);
            }
        }
        return out;
    }

    /** The known AI picks still hidden: {@code known} minus the opponent's public copies, and only what the remainder holds. */
    public static Map<String, Integer> knownHidden(final Map<String, Integer> known, final Map<String, Integer> remainder,
                                                   final List<String> oppSeen) {
        final Map<String, Integer> out = new TreeMap<>();
        if (known == null) {
            return out;
        }
        final Map<String, Integer> seen = count(oppSeen == null ? List.of() : oppSeen);
        for (final Map.Entry<String, Integer> e : known.entrySet()) {
            final int left = Math.min(e.getValue() - get(seen, e.getKey()), get(remainder, e.getKey()));
            if (left > 0) {
                out.put(e.getKey(), left);
            }
        }
        return out;
    }

    static int get(final Map<String, Integer> m, final String k) {
        if (m == null) {
            return 0;
        }
        final Integer v = m.get(k);
        return v == null ? 0 : v;
    }

    static int size(final Map<String, Integer> m) {
        int n = 0;
        for (final int v : m.values()) {
            n += v;
        }
        return n;
    }

    // ------------------------------------------------------------------
    // The live guard
    // ------------------------------------------------------------------

    /** Why a live request was refused; the request is answered with {@code status: "refused"}. */
    public static final class Refused extends IllegalArgumentException {
        private static final long serialVersionUID = 1L;

        Refused(final String why) {
            super(why);
        }
    }

    /**
     * Check a live request's knowledge flags ({@code opp-deck}, {@code opp-pool},
     * {@code opp-deck-public}) before any list is read.  {@code root} resolves
     * relative paths; {@code header} is the log's session header (its
     * {@code decks[].path} for the opponent's seat names the AI's real list in a
     * recorded game).  Throws {@link Refused}.
     */
    public static void checkLive(final Map<String, String> flags, final Map<?, ?> header, final int seat, final File root)
            throws IOException {
        final String reason = flags.get("opp-deck-public");
        final boolean pub = reason != null && !reason.isBlank() && !"true".equals(reason) && !"false".equals(reason);
        if (reason != null && !pub) {
            throw new Refused("an opponent list marked public needs a reason (--opp-deck-public \"<why both lists are shared>\")");
        }
        if (pub) {
            return;
        }
        if (flags.get("opp-deck") != null) {
            throw new Refused("live analysis does not take the opponent's deck list (" + flags.get("opp-deck") + "): the player"
                    + " does not know it. Use --opp-pool (the cube's list) and --opp-known (the AI picks they saw), or mark a list"
                    + " both players share with --opp-deck-public \"<reason>\"");
        }
        final String pool = flags.get("opp-pool");
        if (pool == null) {
            return;
        }
        final File f = resolve(root, pool);
        final String canon = f.getCanonicalPath();
        if (f.getName().equals("ai.dck")) {
            throw new Refused("live analysis does not read the match launcher's AI list (" + pool + ") as a pool");
        }
        for (final Object o : WireLog.arr(header, "decks")) {
            final Map<?, ?> d = (Map<?, ?>) o;
            final String p = WireLog.str(d, "path");
            if (WireLog.num(d, "player", -1) != seat && p != null && resolve(root, p).getCanonicalPath().equals(canon)) {
                throw new Refused("the opponent pool " + pool + " is the opponent's own deck file (the log header names it)");
            }
        }
        if (f.isFile()) {
            final int n = size(readList(f, false));
            if (n < MIN_LIVE_POOL) {
                throw new Refused(String.format(Locale.ROOT, "a %d-card opponent pool is a deck, not a pool (live analysis"
                        + " wants at least %d cards: the cube's list)", n, MIN_LIVE_POOL));
            }
        }
    }

    /**
     * A card list: a {@code .dck} (its {@code [Main]} section, and with
     * {@code withSideboard} its {@code [Sideboard]} too -- the rest of a drafted
     * pool), or plain {@code "N Name"} / {@code "Name"} lines.
     */
    public static Map<String, Integer> readList(final File f, final boolean withSideboard) throws IOException {
        final Map<String, Integer> out = new LinkedHashMap<>();
        String section = "main";
        for (final String raw : java.nio.file.Files.readAllLines(f.toPath(), java.nio.charset.StandardCharsets.UTF_8)) {
            final String l = raw.trim();
            if (l.isEmpty() || l.startsWith("#") || l.startsWith("//")) {
                continue;
            }
            if (l.startsWith("[")) {
                section = l.substring(1, l.indexOf(']') > 0 ? l.indexOf(']') : l.length()).trim().toLowerCase(Locale.ROOT);
                continue;
            }
            if (!section.equals("main") && !(withSideboard && section.equals("sideboard"))) {
                continue;
            }
            if (l.contains("=") && !l.matches("^\\d+\\s.*")) {
                continue;   // [metadata] style key=value outside a section header
            }
            final java.util.regex.Matcher m = java.util.regex.Pattern.compile("^(\\d+)\\s*x?\\s+(.+)$").matcher(l);
            int n = 1;
            String name = l;
            if (m.matches()) {
                n = Integer.parseInt(m.group(1));
                name = m.group(2);
            }
            final int bar = name.indexOf('|');
            if (bar >= 0) {
                name = name.substring(0, bar);
            }
            out.merge(name.trim(), n, Integer::sum);
        }
        return out;
    }

    static File resolve(final File root, final String path) {
        final File f = new File(path);
        return f.isAbsolute() || f.exists() ? f : new File(root, path);
    }

    /** A canonical text of a knowledge, for the planted-leak test's byte comparison. */
    public static String describe(final Rebuild.Knowledge k) {
        final StringBuilder sb = new StringBuilder();
        sb.append("ownSource=").append(k.ownSource).append('\n');
        sb.append("oppSource=").append(k.oppSource).append('\n');
        sb.append("ownDeck=").append(k.ownDeck == null ? null : new TreeMap<>(k.ownDeck)).append('\n');
        sb.append("ownPool=").append(k.ownPool == null ? null : new TreeMap<>(k.ownPool)).append('\n');
        sb.append("oppDeck=").append(k.oppDeck == null ? null : new TreeMap<>(k.oppDeck)).append('\n');
        sb.append("oppPool=").append(k.oppPool == null ? null : new TreeMap<>(k.oppPool)).append('\n');
        sb.append("oppKnown=").append(k.oppKnown == null ? null : new TreeMap<>(k.oppKnown)).append('\n');
        return sb.toString();
    }

    /** {@code "N Name"} or {@code "Name"} entries, separated by newlines or semicolons (names may hold commas), as a multiset. */
    public static Map<String, Integer> parseNames(final String text) {
        final List<String> out = new ArrayList<>();
        for (final String part : text.split("[;\n]")) {
            final String t = part.trim();
            if (t.isEmpty()) {
                continue;
            }
            final java.util.regex.Matcher m = java.util.regex.Pattern.compile("^(\\d+)\\s*x?\\s+(.+)$").matcher(t);
            if (m.matches()) {
                for (int i = 0; i < Integer.parseInt(m.group(1)); i++) {
                    out.add(m.group(2).trim());
                }
            } else {
                out.add(t);
            }
        }
        return count(out);
    }
}
