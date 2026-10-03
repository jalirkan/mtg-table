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

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import mtgtable.eval.Position.Band;
import mtgtable.eval.Position.CardPos;
import mtgtable.eval.Position.PlayerPos;
import mtgtable.eval.Position.StackItem;

/**
 * One {@link Position} -> its D305 feature vector, from one seat's side: a
 * port of {@code tools/ml/encode.py}'s {@code encode_state} and {@code _board},
 * statement for statement, so the same position gives the same numbers in both
 * languages (held by {@code EvalSelfTest} against Python's golden vectors).
 *
 * <p>It reads what {@link Position} carries and nothing else: the opponent's
 * hand and both libraries are counts, a {@code hidden} card adds nothing here
 * (its zone count is already in the player block), a face-down card counts in
 * the {@code <facedown>} slot.
 */
public final class FeatureEncoder {

    private static final int ME = 0;
    private static final int OPP = 1;
    private static final String[] SIDE = {"me", "opp"};

    private final FeatureSchema schema;
    private final Vocab vocab;
    private final int slotFacedown;
    private final int slotToken;
    // feature indices, resolved once
    private final int iTurn, iRound, iMyTurn, iMyPriority, iPhaseNone;
    private final Map<String, Integer> iPhase = new HashMap<>();
    private final int iStackSize, iCombatActive;
    private final int[] iStackSide = new int[2];
    private final int iStackAbilities;
    private final int[] iAttackers = new int[2], iAttackPower = new int[2], iUnblocked = new int[2],
            iBlockers = new int[2];
    private final int[][] g = new int[2][];   // SIDE_GLOBAL per side
    private final int[][] b = new int[2][];   // SIDE_BOARD per side
    private final int[][] typeAgg;            // [zone group][TYPE_AGG]

    public FeatureEncoder(final FeatureSchema schema) {
        this.schema = schema;
        this.vocab = schema.vocab();
        this.slotFacedown = vocab.special(Vocab.FACEDOWN);
        this.slotToken = vocab.special(Vocab.TOKEN);
        iTurn = schema.index("turn");
        iRound = schema.index("round");
        iMyTurn = schema.index("my_turn");
        iMyPriority = schema.index("my_priority");
        iPhaseNone = schema.index("phase.none");
        for (final String p : FeatureSchema.PHASES) {
            if (p != null) {
                iPhase.put(p, schema.index("phase." + p));
            }
        }
        iStackSize = schema.index("stack.size");
        iStackSide[ME] = schema.index("stack.me");
        iStackSide[OPP] = schema.index("stack.opp");
        iStackAbilities = schema.index("stack.abilities");
        iCombatActive = schema.index("combat.active");
        for (int s = 0; s < 2; s++) {
            iAttackers[s] = schema.index("combat." + SIDE[s] + "_attackers");
            iAttackPower[s] = schema.index("combat." + SIDE[s] + "_attack_power");
            iUnblocked[s] = schema.index("combat." + SIDE[s] + "_unblocked_power");
            iBlockers[s] = schema.index("combat." + SIDE[s] + "_blockers");
            g[s] = new int[FeatureSchema.SIDE_GLOBAL.size()];
            for (int k = 0; k < g[s].length; k++) {
                g[s][k] = schema.index(SIDE[s] + "." + FeatureSchema.SIDE_GLOBAL.get(k));
            }
            b[s] = new int[FeatureSchema.SIDE_BOARD.size()];
            for (int k = 0; k < b[s].length; k++) {
                b[s][k] = schema.index(SIDE[s] + ".board." + FeatureSchema.SIDE_BOARD.get(k));
            }
        }
        typeAgg = new int[FeatureSchema.ZONE_GROUPS.length][FeatureSchema.TYPE_AGG.length];
        for (int z = 0; z < typeAgg.length; z++) {
            for (int a = 0; a < typeAgg[z].length; a++) {
                typeAgg[z][a] = schema.index("types." + FeatureSchema.ZONE_GROUPS[z] + "." + FeatureSchema.TYPE_AGG[a]);
            }
        }
    }

    public FeatureSchema schema() {
        return schema;
    }

    // SIDE_GLOBAL offsets
    private static int gi(final String n) {
        return FeatureSchema.SIDE_GLOBAL.indexOf(n);
    }

    private static final int G_LIFE = gi("life"), G_POISON = gi("poison"), G_PCOUNTERS = gi("player_counters"),
            G_HAND = gi("hand"), G_LIBRARY = gi("library"), G_GRAVEYARD = gi("graveyard"), G_EXILE = gi("exile"),
            G_COMMAND = gi("command"), G_LANDS = gi("lands"), G_LANDS_UNTAPPED = gi("lands_untapped"),
            G_UNTAPPED_LAND0 = gi("untapped_land_W"), G_POOL0 = gi("pool_W"), G_POOL_TOTAL = gi("pool_total"),
            G_MANA = gi("mana_available"), G_DROP = gi("land_drop_used"), G_LANDS_TURN = gi("lands_played_turn"),
            G_SPELLS_TURN = gi("spells_cast_turn"), G_ABIL_TURN = gi("abilities_turn"),
            G_SPELLS_GAME = gi("spells_cast_game"), G_LANDS_GAME = gi("lands_played_game"),
            G_MULLIGANS = gi("mulligans");

    private static int bi(final String n) {
        return FeatureSchema.SIDE_BOARD.indexOf(n);
    }

    private static final int B_CREATURES = bi("creatures"), B_POWER = bi("power"), B_TOUGHNESS = bi("toughness"),
            B_UNTAPPED_CREATURES = bi("untapped_creatures"), B_UNTAPPED_POWER = bi("untapped_power"),
            B_MAX_POWER = bi("max_power"), B_DAMAGE = bi("damage_marked"), B_P1P1 = bi("p1p1"), B_M1M1 = bi("m1m1"),
            B_OTHER_COUNTERS = bi("other_counters"), B_PW = bi("planeswalkers"), B_LOYALTY = bi("loyalty"),
            B_ARTIFACTS = bi("artifacts"), B_ENCHANTMENTS = bi("enchantments"), B_TOKENS = bi("tokens"),
            B_TOKEN_POWER = bi("token_power"), B_ATTACHED = bi("attached"), B_FACEDOWN = bi("facedown"),
            B_KW0 = bi("kw_flying");

    // zone-group indices (FeatureSchema.ZONE_GROUPS)
    private static final int Z_ME_HAND = 0, Z_ME_BF = 1, Z_ME_GY = 2, Z_ME_EXILE = 3, Z_ME_STACK = 4,
            Z_OPP_BF = 5, Z_OPP_GY = 6, Z_OPP_EXILE = 7, Z_OPP_STACK = 8;
    private static final int[] Z_BF = {Z_ME_BF, Z_OPP_BF}, Z_GY = {Z_ME_GY, Z_OPP_GY},
            Z_EXILE = {Z_ME_EXILE, Z_OPP_EXILE}, Z_STACK = {Z_ME_STACK, Z_OPP_STACK};
    // card-state indices (FeatureSchema.CARD_STATES)
    private static final int S_ME_HAND = 0;
    private static final int[] S_UNTAPPED = {1, 9}, S_TAPPED = {2, 10}, S_SICK = {3, 11}, S_ATTACKING = {4, 12},
            S_BLOCKING = {5, 13}, S_GY = {6, 14}, S_EXILE = {7, 15}, S_STACK = {8, 16};

    /** The feature vector of {@code pos} from {@code seat}'s side, into a fresh array. */
    public double[] encode(final Position pos, final int seat, final Tally tally) {
        final double[] v = new double[schema.size()];
        encode(pos, seat, tally, v);
        return v;
    }

    /** The feature vector of {@code pos} from {@code seat}'s side, into {@code v} (zeroed first). */
    public void encode(final Position pos, final int seat, final Tally tally, final double[] v) {
        java.util.Arrays.fill(v, 0.0);
        final List<PlayerPos> players = pos.players;
        Integer oppId = null;
        for (final PlayerPos p : players) {
            if (p.id != seat) {
                oppId = p.id;
                break;
            }
        }
        final Integer me = seat;
        final Integer opp = oppId;

        v[iTurn] = pos.turn;
        v[iRound] = pos.round;
        v[iMyTurn] = Objects.equals(pos.activePlayer, me) ? 1.0 : 0.0;
        v[iMyPriority] = Objects.equals(pos.priority, me) ? 1.0 : 0.0;
        final Integer ph = pos.phase == null ? null : iPhase.get(pos.phase);
        v[ph == null ? iPhaseNone : ph] = 1.0;

        // every visible battlefield card, by id (later players' win, as a dict would)
        final Map<Integer, CardPos> byId = new HashMap<>();
        for (final PlayerPos p : players) {
            for (final CardPos c : p.battlefield) {
                if (!c.hidden) {
                    byId.put(c.id, c);
                }
            }
        }

        for (final StackItem it : pos.stack) {
            v[iStackSize] += 1;
            final int s = side(it.controller, me, opp);
            if (s >= 0) {
                v[iStackSide[s]] += 1;
            }
            if (it.isAbility) {
                v[iStackAbilities] += 1;
            }
        }

        if (pos.combat != null) {
            v[iCombatActive] = 1.0;
            for (final Band band : pos.combat) {
                final boolean blocked = !band.blockerIds.isEmpty();
                for (final Integer aid : band.attackerIds) {
                    final CardPos a = byId.get(aid);
                    if (a == null) {
                        continue;
                    }
                    final int s = side(a.controller, me, opp);
                    if (s < 0) {
                        continue;
                    }
                    v[iAttackers[s]] += 1;
                    v[iAttackPower[s]] += num(a.power);
                    if (!blocked) {
                        v[iUnblocked[s]] += num(a.power);
                    }
                }
                for (final Integer bid : band.blockerIds) {
                    final CardPos bc = byId.get(bid);
                    final int s = bc == null ? -1 : side(bc.controller, me, opp);
                    if (s >= 0) {
                        v[iBlockers[s]] += 1;
                    }
                }
            }
        }

        for (final PlayerPos p : players) {
            final int s = side(p.id, me, opp);
            if (s < 0) {
                continue;
            }
            final int[] gs = g[s];
            v[gs[G_LIFE]] = p.life;
            v[gs[G_POISON]] = p.poison;
            v[gs[G_PCOUNTERS]] = p.otherCounters;
            v[gs[G_HAND]] = p.handCount;
            v[gs[G_LIBRARY]] = p.libraryCount;
            v[gs[G_GRAVEYARD]] = p.graveyardCount;
            v[gs[G_EXILE]] = p.exileCount;
            v[gs[G_COMMAND]] = p.commandCount;
            int poolTotal = 0;
            for (int c = 0; c < 6; c++) {
                v[gs[G_POOL0 + c]] = p.pool[c];
                poolTotal += p.pool[c];
            }
            v[gs[G_POOL_TOTAL]] = poolTotal;
            final Integer pid = p.id;
            final int landsTurn = Tally.get(tally.landsTurn, pid);
            v[gs[G_LANDS_TURN]] = landsTurn;
            v[gs[G_DROP]] = landsTurn > 0 ? 1.0 : 0.0;
            v[gs[G_SPELLS_TURN]] = Tally.get(tally.spellsTurn, pid);
            v[gs[G_ABIL_TURN]] = Tally.get(tally.abilitiesTurn, pid);
            v[gs[G_SPELLS_GAME]] = Tally.get(tally.spellsGame, pid);
            v[gs[G_LANDS_GAME]] = Tally.get(tally.landsGame, pid);
            v[gs[G_MULLIGANS]] = Tally.get(tally.mulligans, pid);
        }

        // cards: graveyard / exile (and my hand) by the zone's player, the
        // battlefield by controller, the stack by its card's controller
        for (final PlayerPos p : players) {
            final int s = side(p.id, me, opp);
            if (s < 0) {
                continue;
            }
            for (final CardPos c : p.graveyard) {
                if (!c.hidden) {
                    typeAgg(v, Z_GY[s], c);
                    cardState(v, c, S_GY[s]);
                }
            }
            for (final CardPos c : p.exile) {
                if (!c.hidden) {
                    typeAgg(v, Z_EXILE[s], c);
                    cardState(v, c, S_EXILE[s]);
                }
            }
            if (s == ME) {
                for (final CardPos c : p.hand) {
                    if (!c.hidden) {
                        typeAgg(v, Z_ME_HAND, c);
                        cardState(v, c, S_ME_HAND);
                    }
                }
            }
            for (final CardPos c : p.battlefield) {
                if (c.hidden) {
                    continue;
                }
                int cs = side(c.controller, me, opp);
                if (cs < 0) {
                    cs = s;
                }
                typeAgg(v, Z_BF[cs], c);
                cardState(v, c, c.tapped ? S_TAPPED[cs] : S_UNTAPPED[cs]);
                if (c.sick) {
                    cardState(v, c, S_SICK[cs]);
                }
                if (c.attacking) {
                    cardState(v, c, S_ATTACKING[cs]);
                }
                if (c.blocking) {
                    cardState(v, c, S_BLOCKING[cs]);
                }
                board(v, cs, c);
            }
        }

        for (final CardPos c : pos.stackCards) {
            if (c.hidden) {
                continue;
            }
            final int cs = side(c.controller, me, opp);
            if (cs < 0) {
                continue;
            }
            typeAgg(v, Z_STACK[cs], c);
            cardState(v, c, S_STACK[cs]);
        }

        for (int s = 0; s < 2; s++) {
            v[g[s][G_MANA]] = v[g[s][G_LANDS_UNTAPPED]] + v[g[s][G_POOL_TOTAL]];
        }
    }

    /** encode.py's {@code side_of.get(id)}: 0 me, 1 opp, -1 neither. */
    private static int side(final Integer id, final Integer me, final Integer opp) {
        if (Objects.equals(id, me)) {
            return ME;
        }
        if (Objects.equals(id, opp)) {
            return OPP;
        }
        return -1;
    }

    private int slotOf(final CardPos c) {
        if (c.faceDown) {
            return slotFacedown;
        }
        if (c.token) {
            return slotToken;
        }
        return vocab.slot(c.name == null ? "" : c.name);
    }

    private void cardState(final double[] v, final CardPos c, final int state) {
        v[schema.cardIndex(slotOf(c), state)] += 1;
    }

    private void typeAgg(final double[] v, final int group, final CardPos c) {
        final int[] ix = typeAgg[group];
        v[ix[0]] += 1;
        final int mv = manaValue(c.manaCost);
        v[ix[1]] += mv;
        v[ix[2]] = Math.max(v[ix[2]], mv);
        final int flags = typeFlags(c.types);
        for (int t = 0; t < 7; t++) {
            if ((flags & (1 << t)) != 0) {
                v[ix[3 + t]] += 1;
            }
        }
    }

    private void board(final double[] v, final int s, final CardPos c) {
        final int[] gs = g[s];
        final int[] bs = b[s];
        final int flags = typeFlags(c.types);
        if (c.faceDown) {
            v[bs[B_FACEDOWN]] += 1;
        }
        if ((flags & F_LAND) != 0) {
            v[gs[G_LANDS]] += 1;
            if (!c.tapped) {
                v[gs[G_LANDS_UNTAPPED]] += 1;
                for (final int col : landColours(c.types)) {
                    v[gs[G_UNTAPPED_LAND0 + col]] += 1;
                }
            }
        }
        if ((flags & F_CREATURE) != 0) {
            final double pw = num(c.power);
            final double tg = num(c.toughness);
            v[bs[B_CREATURES]] += 1;
            v[bs[B_POWER]] += pw;
            v[bs[B_TOUGHNESS]] += tg;
            v[bs[B_MAX_POWER]] = Math.max(v[bs[B_MAX_POWER]], pw);
            v[bs[B_DAMAGE]] += c.damage;
            if (!c.tapped) {
                v[bs[B_UNTAPPED_CREATURES]] += 1;
                v[bs[B_UNTAPPED_POWER]] += pw;
            }
            for (int k = 0; k < FeatureSchema.KEYWORDS.length; k++) {
                if (c.keywords.contains(FeatureSchema.KEYWORDS[k])) {
                    v[bs[B_KW0 + k]] += 1;
                }
            }
            if (c.token) {
                v[bs[B_TOKEN_POWER]] += pw;
            }
        }
        if ((flags & F_PLANESWALKER) != 0) {
            v[bs[B_PW]] += 1;
            v[bs[B_LOYALTY]] += num(c.loyalty);
        }
        if ((flags & F_ARTIFACT) != 0) {
            v[bs[B_ARTIFACTS]] += 1;
        }
        if ((flags & F_ENCHANTMENT) != 0) {
            v[bs[B_ENCHANTMENTS]] += 1;
        }
        if (c.token) {
            v[bs[B_TOKENS]] += 1;
        }
        if (c.attached) {
            v[bs[B_ATTACHED]] += 1;
        }
        for (final Map.Entry<String, Integer> e : c.counters.entrySet()) {
            final int n = e.getValue() == null ? 0 : e.getValue();
            if ("+1/+1".equals(e.getKey())) {
                v[bs[B_P1P1]] += n;
            } else if ("-1/-1".equals(e.getKey())) {
                v[bs[B_M1M1]] += n;
            } else {
                v[bs[B_OTHER_COUNTERS]] += n;
            }
        }
    }

    // ------------------------------------------------------------ the helpers encode.py has

    static final int F_CREATURE = 1, F_LAND = 2, F_INSTANT = 4, F_SORCERY = 8, F_ARTIFACT = 16, F_ENCHANTMENT = 32,
            F_PLANESWALKER = 64;
    private static final Pattern WS = Pattern.compile("\\s+", Pattern.UNICODE_CHARACTER_CLASS);
    private static final Map<String, Integer> TYPE_BIT = Map.of("Creature", F_CREATURE, "Land", F_LAND,
            "Instant", F_INSTANT, "Sorcery", F_SORCERY, "Artifact", F_ARTIFACT, "Enchantment", F_ENCHANTMENT,
            "Planeswalker", F_PLANESWALKER);

    /** {@code _type_flags}: the words before " - ", as bits in TYPE_AGG's order (creature first). */
    static int typeFlags(final String types) {
        if (types == null || types.isEmpty()) {
            return 0;
        }
        final int cut = types.indexOf(" - ");
        final String head = cut >= 0 ? types.substring(0, cut) : types;
        int f = 0;
        for (final String w : WS.split(head.strip())) {
            final Integer bit = TYPE_BIT.get(w);
            if (bit != null) {
                f |= bit;
            }
        }
        return f;
    }

    private static final Map<String, Integer> LAND_COLOUR = Map.of("plains", 0, "island", 1, "swamp", 2,
            "mountain", 3, "forest", 4);
    private static final int[] COLOURLESS = {5};

    /** {@code _land_colours}: the colours a land's basic types give, or C. */
    static int[] landColours(final String types) {
        final int cut = types == null ? -1 : types.indexOf(" - ");
        if (cut < 0) {
            return COLOURLESS;
        }
        final String sub = types.substring(cut + 3).toLowerCase(java.util.Locale.ROOT).strip();
        if (sub.isEmpty()) {
            return COLOURLESS;
        }
        final String[] words = WS.split(sub);
        final int[] out = new int[words.length];
        int n = 0;
        for (final String w : words) {
            final Integer c = LAND_COLOUR.get(w);
            if (c != null) {
                out[n++] = c;
            }
        }
        return n == 0 ? COLOURLESS : java.util.Arrays.copyOf(out, n);
    }

    private static final Pattern SYMBOL = Pattern.compile("\\{([^}]*)\\}");
    private static final Map<String, Integer> MV_CACHE = new java.util.concurrent.ConcurrentHashMap<>();

    /** {@code mana_value}: digits count their value, X/Y/Z nothing, a hybrid its first half, any other symbol 1. */
    static int manaValue(final String cost) {
        if (cost == null || cost.isEmpty()) {
            return 0;
        }
        final Integer hit = MV_CACHE.get(cost);
        if (hit != null) {
            return hit;
        }
        int mv = 0;
        final Matcher m = SYMBOL.matcher(cost);
        while (m.find()) {
            final String s = m.group(1).toUpperCase(java.util.Locale.ROOT);
            if (isDigits(s)) {
                mv += Integer.parseInt(s);
            } else if ("X".equals(s) || "Y".equals(s) || "Z".equals(s)) {
                continue;
            } else if (s.contains("/")) {
                final String a = s.split("/", -1)[0];
                mv += isDigits(a) ? Integer.parseInt(a) : 1;
            } else {
                mv += 1;
            }
        }
        if (MV_CACHE.size() < 10_000) {
            MV_CACHE.put(cost, mv);
        }
        return mv;
    }

    private static boolean isDigits(final String s) {
        if (s.isEmpty()) {
            return false;
        }
        for (int i = 0; i < s.length(); i++) {
            if (!Character.isDigit(s.charAt(i))) {
                return false;
            }
        }
        return true;
    }

    private static final Pattern LEADING_INT = Pattern.compile("^-?\\d+");

    /** {@code _num}: an integer string, or its leading integer ("1+*" is 1), else 0. */
    static double num(final String s) {
        if (s == null) {
            return 0.0;
        }
        try {
            return Integer.parseInt(s.strip());
        } catch (final NumberFormatException e) {
            final Matcher m = LEADING_INT.matcher(s);
            return m.find() ? Double.parseDouble(m.group()) : 0.0;
        }
    }
}
