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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import mtgtable.Json;
import mtgtable.ai.LineRecorder;

/**
 * The search hint's line in words (D454): {@link LineRecorder}'s steps --
 * engine-free ids, players and numbers -- as {@code {kind, text, ids}}, with
 * every card named ONLY through the seat's own redacted view of the moment.
 *
 * <p>The gate (hidden-information rule 8): a card of the playout is named
 * when its game id is a rebuilt card's ({@code Rebuild.Base.wireOf}: the copy
 * keeps the ids, and a card the playout makes gets a fresh one past them),
 * that card's wire id is in the moment's state, and {@link Rebuild#knownName}
 * gives its name there -- the name the bridge's single serialiser sent this
 * seat ({@code Snap.card}, through its three gates).  Anything else -- a
 * hidden card, a face-down one without its face, a card the playout drew or
 * redealt, a fabricated opponent card from the pool model -- is "an unseen
 * card" (a token the playout made: "a token").  A step's {@code ids} are the
 * wire ids of exactly the cards its text names; {@code tools/hint-runner.mjs}
 * checks every one against the moment again before the answer leaves.
 */
public final class HintLine {

    private HintLine() { }

    /** Most steps a line carries. */
    public static final int MAX_STEPS = 8;
    /** Most later plays (Forge's own, after the recommended one) it carries. */
    public static final int MAX_THEN = 3;
    /** A mode's description is cut here. */
    static final int MAX_MODE = 120;

    /** One step: {@code kind}, {@code text}, and the wire ids of the cards {@code text} names. */
    public static final class Step {
        public final String kind;
        public final String text;
        public final List<Integer> ids;

        Step(final String kind, final String text, final List<Integer> ids) {
            this.kind = kind;
            this.text = text;
            this.ids = ids;
        }

        @Override
        public String toString() {
            return kind + ": " + text + " " + ids;
        }
    }

    /**
     * The steps in words.  {@code wireOfId}: a rebuilt card's game id to its
     * wire id; {@code wireCards}: the moment's wire cards by wire id.
     */
    public static List<Step> render(final List<LineRecorder.Raw> raws, final Map<Integer, Integer> wireOfId,
                                    final Map<Integer, Map<?, ?>> wireCards) {
        final List<Step> out = new ArrayList<>();
        for (final LineRecorder.Raw r : raws) {
            if (out.size() >= MAX_STEPS) {
                break;
            }
            final List<Integer> ids = new ArrayList<>();
            final String src = r.source == null ? null : name(r.source, wireOfId, wireCards, ids);
            // A step that describes its source -- a mode's text, its X -- only for a source the seat is shown
            // by name: "an unseen card" with its mode text would say which card it is.
            final boolean srcKnown = src != null && !ids.isEmpty();
            final String list = list(r.what, wireOfId, wireCards, ids);
            final Step s;
            switch (r.kind) {
            case "target":
                s = list.isEmpty() || src == null ? null : new Step("target", src + " → " + list, ids);
                break;
            case "trigger":
                s = list.isEmpty() || src == null ? null : new Step("trigger", src + " trigger → " + list, ids);
                break;
            case "x":
                s = srcKnown ? new Step("x", src + ": X = " + r.number, ids) : null;
                break;
            case "number":
                s = new Step("number", "number = " + r.number, new ArrayList<>());
                break;
            case "sacrifice":
            case "discard":
            case "exile":
            case "return":
            case "tap":
            case "choose":
                // the source is not in the text: only the chosen cards' ids
                s = list.isEmpty() ? null : new Step(r.kind, r.kind + " → " + list, onlyListed(r, wireOfId, wireCards));
                break;
            case "mode":
                s = !srcKnown || mode(r.text) == null ? null : new Step("mode", src + " mode → " + mode(r.text), ids);
                break;
            case "then-cast":
            case "then-activate":
            case "then-equip":
            case "then-play":
                if (src == null) {
                    s = null;
                } else {
                    final String verb = r.kind.substring(5);
                    s = new Step("then", "then " + verb + " " + src + (list.isEmpty() ? "" : " → " + list), ids);
                }
                break;
            default:
                s = null;
            }
            if (s != null) {
                out.add(s);
            }
        }
        return out;
    }

    private static List<Integer> onlyListed(final LineRecorder.Raw r, final Map<Integer, Integer> wireOfId,
                                            final Map<Integer, Map<?, ?>> wireCards) {
        final List<Integer> ids = new ArrayList<>();
        list(r.what, wireOfId, wireCards, ids);
        return ids;
    }

    /** A mode's script description on one line, cut; null when there is none. */
    static String mode(final String d) {
        if (d == null) {
            return null;
        }
        String t = d.replace("CARDNAME", "it").replace("NICKNAME", "it").replaceAll("\\s+", " ").trim();
        if (t.isEmpty()) {
            return null;
        }
        if (t.length() > MAX_MODE) {
            t = t.substring(0, MAX_MODE - 1) + "…";
        }
        return t;
    }

    private static String list(final List<LineRecorder.Ent> what, final Map<Integer, Integer> wireOfId,
                               final Map<Integer, Map<?, ?>> wireCards, final List<Integer> ids) {
        final List<String> names = new ArrayList<>();
        for (final LineRecorder.Ent e : what) {
            names.add(name(e, wireOfId, wireCards, ids));
        }
        return String.join(", ", names);
    }

    /** THE gate: the one place a line names a card. */
    static String name(final LineRecorder.Ent e, final Map<Integer, Integer> wireOfId, final Map<Integer, Map<?, ?>> wireCards,
                       final List<Integer> ids) {
        if (e.player == LineRecorder.YOU) {
            return "you";
        }
        if (e.player == LineRecorder.OPPONENT) {
            return "the opponent";
        }
        final Integer wire = wireOfId.get(e.cardId);
        final Map<?, ?> c = wire == null ? null : wireCards.get(wire);
        final String n = c == null ? null : Rebuild.knownName(c);
        if (n == null) {
            return e.token ? "a token" : "an unseen card";
        }
        if (!ids.contains(wire)) {
            ids.add(wire);
        }
        return n;
    }

    /**
     * A UTF-8 print stream on a standard descriptor, whatever the locale's
     * {@code stdout.encoding} (D454: an ASCII locale turned the line's "→" into
     * "?"); {@code CoachGrade.main} sets stdout and stderr to it.
     */
    public static java.io.PrintStream utf8(final java.io.FileDescriptor fd) {
        return new java.io.PrintStream(new java.io.FileOutputStream(fd), true, java.nio.charset.StandardCharsets.UTF_8);
    }

    /** The answer's {@code "line"} array. */
    static void write(final Json.JsonOut j, final List<Step> steps) {
        j.key("line").arr();
        for (final Step s : steps) {
            j.obj().n("kind", s.kind).n("text", s.text).key("ids").arr();
            for (final int id : s.ids) {
                j.v(id);
            }
            j.end().end();
        }
        j.end();
    }
}
