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

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The fixed layout of a D305 feature vector for one vocabulary: a port of
 * {@code tools/ml/encode.py}'s {@code Schema}, name for name and in the same
 * order, so that {@link #schemaId()} -- the same SHA-256 over the same JSON text
 * Python hashes -- equals the Python schema's id.  A model refuses to load when
 * it does not ({@link EvalModel}), which is what keeps the two encoders' layouts
 * from drifting apart silently (D316).
 */
public final class FeatureSchema {

    /** encode.py's SCHEMA_VERSION. */
    public static final int SCHEMA_VERSION = 1;

    /** The phase one-hot; index 0 is "none" (a null phase). */
    static final List<String> PHASES = Collections.unmodifiableList(Arrays.asList(
            null, "UNTAP", "UPKEEP", "DRAW", "MAIN1", "COMBAT_BEGIN",
            "COMBAT_DECLARE_ATTACKERS", "COMBAT_DECLARE_BLOCKERS",
            "COMBAT_FIRST_STRIKE_DAMAGE", "COMBAT_DAMAGE", "COMBAT_END", "MAIN2",
            "END_OF_TURN", "CLEANUP"));
    /** The decision phases a training row comes from by default (main + combat). */
    public static final List<String> DECISION_PHASES = List.of(
            "MAIN1", "MAIN2", "COMBAT_BEGIN", "COMBAT_DECLARE_ATTACKERS", "COMBAT_DECLARE_BLOCKERS",
            "COMBAT_FIRST_STRIKE_DAMAGE", "COMBAT_DAMAGE", "COMBAT_END");
    static final String[] COLOURS = {"W", "U", "B", "R", "G", "C"};
    static final String[] KEYWORDS = {"FLYING", "REACH", "FIRST_STRIKE", "DOUBLE_STRIKE", "DEATHTOUCH",
        "LIFELINK", "TRAMPLE", "VIGILANCE", "MENACE", "HASTE", "HEXPROOF", "INDESTRUCTIBLE"};
    static final String[] TYPE_AGG = {"count", "mv_sum", "mv_max", "creature", "land", "instant", "sorcery",
        "artifact", "enchantment", "planeswalker"};
    static final String[] ZONE_GROUPS = {"me.hand", "me.battlefield", "me.graveyard", "me.exile", "me.stack",
        "opp.battlefield", "opp.graveyard", "opp.exile", "opp.stack"};
    public static final List<String> CARD_STATES = List.of(
            "me.hand",
            "me.bf_untapped", "me.bf_tapped", "me.bf_sick", "me.bf_attacking", "me.bf_blocking",
            "me.graveyard", "me.exile", "me.stack",
            "opp.bf_untapped", "opp.bf_tapped", "opp.bf_sick", "opp.bf_attacking", "opp.bf_blocking",
            "opp.graveyard", "opp.exile", "opp.stack");
    static final List<String> SIDE_GLOBAL;
    static final List<String> SIDE_BOARD;

    static {
        final List<String> g = new ArrayList<>(List.of("life", "poison", "player_counters", "hand", "library",
                "graveyard", "exile", "command", "lands", "lands_untapped"));
        for (final String c : COLOURS) {
            g.add("untapped_land_" + c);
        }
        for (final String c : COLOURS) {
            g.add("pool_" + c);
        }
        g.addAll(List.of("pool_total", "mana_available", "land_drop_used", "lands_played_turn",
                "spells_cast_turn", "abilities_turn", "spells_cast_game", "lands_played_game", "mulligans"));
        SIDE_GLOBAL = Collections.unmodifiableList(g);
        final List<String> b = new ArrayList<>(List.of("creatures", "power", "toughness", "untapped_creatures",
                "untapped_power", "max_power", "damage_marked", "p1p1", "m1m1", "other_counters",
                "planeswalkers", "loyalty", "artifacts", "enchantments", "tokens", "token_power", "attached",
                "facedown"));
        for (final String k : KEYWORDS) {
            b.add("kw_" + k.toLowerCase(Locale.ROOT));
        }
        SIDE_BOARD = Collections.unmodifiableList(b);
    }

    private final Vocab vocab;
    private final List<String> names;
    private final Map<String, Integer> index;
    private final int cardOffset;
    private final String schemaId;

    public FeatureSchema(final Vocab vocab) {
        this.vocab = vocab;
        final List<String> n = new ArrayList<>();
        n.addAll(List.of("turn", "round", "my_turn", "my_priority"));
        for (final String p : PHASES) {
            n.add("phase." + (p == null ? "none" : p));
        }
        n.addAll(List.of("stack.size", "stack.me", "stack.opp", "stack.abilities"));
        n.addAll(List.of("combat.active", "combat.me_attackers", "combat.opp_attackers",
                "combat.me_attack_power", "combat.opp_attack_power", "combat.me_unblocked_power",
                "combat.opp_unblocked_power", "combat.me_blockers", "combat.opp_blockers"));
        for (final String side : new String[] {"me", "opp"}) {
            for (final String f : SIDE_GLOBAL) {
                n.add(side + "." + f);
            }
        }
        for (final String side : new String[] {"me", "opp"}) {
            for (final String f : SIDE_BOARD) {
                n.add(side + ".board." + f);
            }
        }
        for (final String z : ZONE_GROUPS) {
            for (final String a : TYPE_AGG) {
                n.add("types." + z + "." + a);
            }
        }
        this.cardOffset = n.size();
        for (final String c : vocab.cards()) {
            for (final String st : CARD_STATES) {
                n.add("card[" + c + "]." + st);
            }
        }
        this.names = Collections.unmodifiableList(n);
        final Map<String, Integer> ix = new HashMap<>(n.size() * 2);
        for (int i = 0; i < n.size(); i++) {
            ix.put(n.get(i), i);
        }
        this.index = ix;
        this.schemaId = computeId(n);
    }

    public Vocab vocab() {
        return vocab;
    }

    public int size() {
        return names.size();
    }

    public List<String> names() {
        return names;
    }

    public int cardOffset() {
        return cardOffset;
    }

    /** A feature's index; throws on a name the schema does not have. */
    public int index(final String name) {
        final Integer i = index.get(name);
        if (i == null) {
            throw new IllegalArgumentException("no feature " + name);
        }
        return i;
    }

    public int cardIndex(final int slot, final int state) {
        return cardOffset + slot * CARD_STATES.size() + state;
    }

    /** The first 16 hex digits of SHA-256 over Python's {@code json.dumps({"v": 1, "names": [...]})}. */
    public String schemaId() {
        return schemaId;
    }

    private static String computeId(final List<String> names) {
        final StringBuilder sb = new StringBuilder(names.size() * 24);
        sb.append("{\"v\": ").append(SCHEMA_VERSION).append(", \"names\": [");
        for (int i = 0; i < names.size(); i++) {
            if (i > 0) {
                sb.append(", ");
            }
            pyQuote(sb, names.get(i));
        }
        sb.append("]}");
        try {
            final byte[] h = MessageDigest.getInstance("SHA-256").digest(sb.toString().getBytes(StandardCharsets.UTF_8));
            final StringBuilder hex = new StringBuilder();
            for (int i = 0; i < 8; i++) {
                hex.append(String.format(Locale.ROOT, "%02x", h[i] & 0xff));
            }
            return hex.toString();
        } catch (final NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Python's {@code json.dumps(s, ensure_ascii=False)} for one string. */
    static void pyQuote(final StringBuilder sb, final String s) {
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            final char c = s.charAt(i);
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                case '\b': sb.append("\\b"); break;
                case '\f': sb.append("\\f"); break;
                default:
                    if (c < 0x20) {
                        sb.append(String.format(Locale.ROOT, "\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
            }
        }
        sb.append('"');
    }
}
