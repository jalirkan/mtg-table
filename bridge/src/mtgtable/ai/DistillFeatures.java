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

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import forge.game.Game;
import forge.game.GameEntity;
import forge.game.GameObject;
import forge.game.card.Card;
import forge.game.combat.Combat;
import forge.game.combat.CombatUtil;
import forge.game.cost.CostSacrifice;
import forge.game.keyword.Keyword;
import forge.game.player.Player;
import forge.game.spellability.SpellAbility;
import forge.game.zone.ZoneType;
import mtgtable.eval.FeatureEncoder;
import mtgtable.eval.FeatureSchema;
import mtgtable.eval.GamePosition;
import mtgtable.eval.Tally;
import mtgtable.eval.Vocab;

/**
 * The inputs of the distilled policy (J126, B1): what the row exporter writes
 * ({@link DistillRows}) and what the distilled seat scores ({@link DistillModel})
 * are computed HERE and nowhere else, so training and play read one function.
 *
 * <p><b>The state</b> is D361's encoder ({@link FeatureEncoder}, the same code
 * the learned evaluator's {@code /eval} and the search's leaves use) over the
 * vocabulary with no cube cards: the 243 board-level features plus the nine
 * special slots' card counts (the six basics, {@code <other>}, {@code <token>},
 * {@code <facedown>}) x 17 states -- 396 numbers, one schema for every cube, so
 * one model serves Vintage, Evan's cube and Synergy.  It reads only what the
 * deciding seat knows ({@link GamePosition}): the other hand and both libraries
 * are sizes.
 *
 * <p><b>Each candidate</b> (the search's own candidate list: Forge's answer
 * first) is a short fixed vector per decision kind -- {@link #P_NAMES} for a
 * priority play, {@link #A_NAMES} for an attack declaration, {@link #B_NAMES}
 * for a block declaration -- computed from the seat's own cards and what is
 * public on the battlefield (an opponent's face-down creature counts as the 2/2
 * with no keywords it shows).  No card name, id or rules text is read.
 *
 * <p>{@link #VERSION} names this layout; a model trained on another layout is
 * refused ({@link DistillModel}).  {@code fixtures/distill/names.json} is the
 * committed copy of these lists that Python's tests read, and
 * {@code DistillSelfTest} fails when the two drift.
 */
public final class DistillFeatures {

    private DistillFeatures() {
    }

    /** The layout's name: bump it with any change to a list below or to what a feature means. */
    public static final String VERSION = "distill-v1";

    public static final List<String> P_NAMES = List.of(
            "forge", "pass", "spell", "ability", "creature", "instant", "sorcery", "artifact", "enchantment",
            "planeswalker", "host_land", "host_on_battlefield", "cmc", "cost_cmc", "x", "power", "toughness",
            "evasive", "keywords", "tap_cost", "sac_cost", "targets", "targets_opp_creature",
            "targets_own_creature", "targets_opp_player", "targets_own_player", "targets_other",
            "target_opp_power", "target_own_power");

    public static final List<String> A_NAMES = List.of(
            "forge", "none", "all", "n", "power", "toughness", "frac_able", "evasive", "deathtouch",
            "first_strike", "lifelink", "vigilance", "trample", "held_back_n", "held_back_power",
            "power_vs_life", "delta_n", "delta_power");

    public static final List<String> B_NAMES = List.of(
            "forge", "none", "n", "attackers_blocked", "multi_blocked", "power", "toughness", "kills", "dies",
            "chumps", "trades", "survives", "kill_power", "lost_power", "unblocked_n", "unblocked_power",
            "life_after", "lethal", "delta_n");

    /** The candidate feature names of a decision kind (p, a or b), or null for a kind the policy does not cover. */
    public static List<String> names(final String kind) {
        switch (kind) {
            case "p": return P_NAMES;
            case "a": return A_NAMES;
            case "b": return B_NAMES;
            default: return null;
        }
    }

    /** The kinds the distilled policy covers: the three search-v2 searches (D312). */
    public static final List<String> KINDS = List.of("p", "a", "b");

    private static final FeatureSchema STATE_SCHEMA = new FeatureSchema(Vocab.fromNames(Collections.emptyList()));
    private static final FeatureEncoder STATE_ENCODER = new FeatureEncoder(STATE_SCHEMA);

    /** The state layout (D361's encoder, no cube cards). */
    public static FeatureSchema stateSchema() {
        return STATE_SCHEMA;
    }

    /** The deciding seat's state vector, {@link #stateSchema()}'s layout.  Call where the game is not moving. */
    public static double[] state(final Player ai) {
        final Game g = ai.getGame();
        return STATE_ENCODER.encode(GamePosition.of(g, ai), ai.getId(), Tally.fromGame(g));
    }

    /**
     * Every candidate's vector for a decision of {@code kind}; a candidate whose
     * features throw is all zeros but its {@code forge} flag (counted by the
     * caller through {@code errors[0]}).
     */
    static double[][] candidates(final String kind, final Player ai, final List<SearchPolicy.Cand> cands,
                                 final int[] errors) {
        final List<String> names = names(kind);
        final double[][] out = new double[cands.size()][names.size()];
        for (int i = 0; i < cands.size(); i++) {
            try {
                switch (kind) {
                    case "p": priority(out[i], ai, SearchPolicy.candSa(cands.get(i))); break;
                    case "a": attack(out[i], ai, SearchPolicy.candAttack(cands.get(i)), SearchPolicy.candAttack(cands.get(0))); break;
                    case "b": block(out[i], ai, SearchPolicy.candBlock(cands.get(i)), SearchPolicy.candBlock(cands.get(0))); break;
                    default: throw new IllegalArgumentException("no candidate features for kind " + kind);
                }
            } catch (final RuntimeException e) {
                java.util.Arrays.fill(out[i], 0);
                if (errors != null && errors.length > 0) {
                    errors[0]++;
                }
            }
            out[i][0] = i == 0 ? 1 : 0;   // "forge": the search's candidate 0 is always Forge's own answer
        }
        return out;
    }

    // ------------------------------------------------------------ priority

    private static void priority(final double[] v, final Player ai, final SpellAbility sa) {
        if (sa == null) {
            v[1] = 1;   // pass
            return;
        }
        final Card host = sa.getHostCard();
        v[2] = sa.isSpell() ? 1 : 0;
        v[3] = sa.isSpell() ? 0 : 1;
        v[4] = host.isCreature() ? 1 : 0;
        v[5] = host.isInstant() ? 1 : 0;
        v[6] = host.isSorcery() ? 1 : 0;
        v[7] = host.isArtifact() ? 1 : 0;
        v[8] = host.isEnchantment() ? 1 : 0;
        v[9] = host.isPlaneswalker() ? 1 : 0;
        v[10] = host.isLand() ? 1 : 0;
        v[11] = host.isInZone(ZoneType.Battlefield) ? 1 : 0;
        v[12] = host.getCMC();
        v[13] = sa.getPayCosts() == null || sa.getPayCosts().getTotalMana() == null ? 0
                : sa.getPayCosts().getTotalMana().getCMC();
        final Integer x = sa.getXManaCostPaid();
        v[14] = x == null ? 0 : x;
        if (host.isCreature()) {
            v[15] = host.getNetPower();
            v[16] = host.getNetToughness();
            v[17] = evasive(host) ? 1 : 0;
            v[18] = keywords(host);
        }
        v[19] = sa.getPayCosts() != null && sa.getPayCosts().hasTapCost() ? 1 : 0;
        v[20] = sa.getPayCosts() != null && sa.getPayCosts().hasSpecificCostType(CostSacrifice.class) ? 1 : 0;
        for (SpellAbility s = sa; s != null; s = s.getSubAbility()) {
            if (!s.usesTargeting() || s.getTargets() == null) {
                continue;
            }
            for (final GameObject t : s.getTargets()) {
                v[21]++;
                if (t instanceof Player) {
                    if (t == ai) {
                        v[25]++;
                    } else {
                        v[24]++;
                    }
                } else if (t instanceof Card) {
                    final Card c = (Card) t;
                    if (c.isCreature() && c.isInZone(ZoneType.Battlefield)) {
                        if (c.getController() == ai) {
                            v[23]++;
                            v[28] += power(c, ai);
                        } else {
                            v[22]++;
                            v[27] += power(c, ai);
                        }
                    } else {
                        v[26]++;
                    }
                } else {
                    v[26]++;
                }
            }
        }
    }

    // ------------------------------------------------------------ attacks

    private static void attack(final double[] v, final Player ai, final Map<Card, GameEntity> m,
                               final Map<Card, GameEntity> forge) {
        final List<Card> able = new ArrayList<>();
        final Player opp = ai.getWeakestOpponent();
        for (final Card c : ai.getCreaturesInPlay()) {
            if (m.containsKey(c) || opp != null && CombatUtil.canAttack(c, opp)) {
                able.add(c);
            }
        }
        double power = 0;
        for (final Card c : m.keySet()) {
            power += power(c, ai);
            v[5] += Math.max(0, c.getNetToughness());
            v[7] += evasive(c) ? 1 : 0;
            v[8] += c.hasKeyword(Keyword.DEATHTOUCH) ? 1 : 0;
            v[9] += c.hasKeyword(Keyword.FIRST_STRIKE) || c.hasKeyword(Keyword.DOUBLE_STRIKE) ? 1 : 0;
            v[10] += c.hasKeyword(Keyword.LIFELINK) ? 1 : 0;
            v[11] += c.hasKeyword(Keyword.VIGILANCE) ? 1 : 0;
            v[12] += c.hasKeyword(Keyword.TRAMPLE) ? 1 : 0;
        }
        v[1] = m.isEmpty() ? 1 : 0;
        v[2] = !able.isEmpty() && m.keySet().containsAll(able) ? 1 : 0;
        v[3] = m.size();
        v[4] = power;
        v[6] = able.isEmpty() ? 0 : (double) m.size() / able.size();
        for (final Card c : able) {
            if (!m.containsKey(c)) {
                v[13]++;
                v[14] += power(c, ai);
            }
        }
        v[15] = Math.min(3.0, power / Math.max(1, opp == null ? 1 : opp.getLife()));
        double forgePower = 0;
        for (final Card c : forge.keySet()) {
            forgePower += power(c, ai);
        }
        v[16] = m.size() - forge.size();
        v[17] = power - forgePower;
    }

    // ------------------------------------------------------------ blocks

    private static void block(final double[] v, final Player ai, final Map<Card, Card> m, final Map<Card, Card> forge) {
        final Game g = ai.getGame();
        final Combat combat = g.getPhaseHandler().getCombat();
        final List<Card> attackers = combat == null ? new ArrayList<>() : new ArrayList<>(combat.getAttackers());
        final Map<Card, List<Card>> byAttacker = new HashMap<>();
        for (final Map.Entry<Card, Card> e : m.entrySet()) {
            byAttacker.computeIfAbsent(e.getValue(), k -> new ArrayList<>()).add(e.getKey());
        }
        v[1] = m.isEmpty() ? 1 : 0;
        v[2] = m.size();
        v[3] = byAttacker.size();
        final Set<Card> dying = new HashSet<>();
        for (final Map.Entry<Card, List<Card>> e : byAttacker.entrySet()) {
            final Card a = e.getKey();
            final List<Card> bs = e.getValue();
            if (bs.size() > 1) {
                v[4]++;
            }
            double blockPower = 0;
            boolean deathtouch = false;
            for (final Card b : bs) {
                blockPower += Math.max(0, b.getNetPower());
                deathtouch |= b.hasKeyword(Keyword.DEATHTOUCH) && b.getNetPower() > 0;
            }
            final boolean kill = deathtouch || blockPower >= Math.max(1, a.getNetToughness() - a.getDamage());
            if (kill) {
                v[7]++;
                v[12] += power(a, ai);
            }
            // The attacker's damage, first blocker first: enough to kill each in turn (deathtouch: 1 each).
            double left = power(a, ai);
            final boolean aDeath = a.hasKeyword(Keyword.DEATHTOUCH) && !a.isFaceDown();
            for (final Card b : bs) {
                final double need = aDeath ? 1 : Math.max(1, b.getNetToughness() - b.getDamage());
                if (left >= need && !b.hasKeyword(Keyword.INDESTRUCTIBLE)) {
                    dying.add(b);
                    left -= need;
                }
            }
            for (final Card b : bs) {
                final boolean dies = dying.contains(b);
                if (dies && !kill) {
                    v[9]++;
                } else if (dies) {
                    v[10]++;
                } else {
                    v[11]++;
                }
            }
        }
        for (final Card b : m.keySet()) {
            v[5] += Math.max(0, b.getNetPower());
            v[6] += Math.max(0, b.getNetToughness());
            if (dying.contains(b)) {
                v[8]++;
                v[13] += Math.max(0, b.getNetPower());
            }
        }
        for (final Card a : attackers) {
            if (!byAttacker.containsKey(a) && (combat == null || combat.getDefenderPlayerByAttacker(a) == ai)) {
                v[14]++;
                v[15] += power(a, ai) * (a.hasKeyword(Keyword.DOUBLE_STRIKE) && !a.isFaceDown() ? 2 : 1);
            }
        }
        v[16] = ai.getLife() - v[15];
        v[17] = v[15] >= ai.getLife() ? 1 : 0;
        v[18] = m.size() - forge.size();
    }

    // ------------------------------------------------------------ helpers

    /** A creature's power as the seat sees it: an opponent's face-down creature is the 2/2 it shows. */
    private static double power(final Card c, final Player ai) {
        return Math.max(0, c.getNetPower());
    }

    private static boolean evasive(final Card c) {
        if (c.isFaceDown() && c.getController() != null) {
            return false;
        }
        return c.hasKeyword(Keyword.FLYING) || c.hasKeyword(Keyword.MENACE) || c.hasKeyword(Keyword.TRAMPLE);
    }

    private static final Keyword[] KW = {Keyword.FLYING, Keyword.REACH, Keyword.FIRST_STRIKE, Keyword.DOUBLE_STRIKE,
        Keyword.DEATHTOUCH, Keyword.LIFELINK, Keyword.TRAMPLE, Keyword.VIGILANCE, Keyword.MENACE, Keyword.HASTE,
        Keyword.INDESTRUCTIBLE};

    private static int keywords(final Card c) {
        int n = 0;
        for (final Keyword k : KW) {
            if (c.hasKeyword(k)) {
                n++;
            }
        }
        return n;
    }
}
