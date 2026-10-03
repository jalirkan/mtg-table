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
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import forge.ai.ComputerUtil;
import forge.ai.ComputerUtilCard;
import forge.ai.ComputerUtilCombat;
import forge.ai.ComputerUtilCost;
import forge.ai.SpellApiToAi;
import forge.game.Game;
import forge.game.GameObject;
import forge.game.ability.AbilityUtils;
import forge.game.ability.ApiType;
import forge.game.card.Card;
import forge.game.card.CardCollection;
import forge.game.card.CardLists;
import forge.game.combat.Combat;
import forge.game.cost.Cost;
import forge.game.cost.CostPart;
import forge.game.cost.CostSacrifice;
import forge.game.phase.PhaseHandler;
import forge.game.phase.PhaseType;
import forge.game.player.Player;
import forge.game.spellability.SpellAbility;
import forge.game.zone.ZoneType;

/**
 * The sacrifice-outlet policy (decision D301): when Forge's AI controls a
 * "sacrifice a creature: effect" ability, the moments a human would use it.
 *
 * <p>Forge 2.0.14's AI does not use these cards (docs/research/ai-architecture.md
 * section 5).  {@code AiController.getSpellAbilityToPlay} drops every spell and
 * ability whose card carries {@code AI:RemoveDeck:All} before it evaluates
 * anything, so Viscera Seer and Goblin Bombardment are never even cast; and an
 * outlet that is not flagged (Carrion Feeder) is gated by
 * {@code ComputerUtilCost.checkSacrificeCost}, which only pays with a card the
 * script marked {@code SacMe} or a token.  Nothing in Forge asks "is a creature
 * of mine about to die anyway?".
 *
 * <p>This class asks that, five ways, each a {@link Situation}:
 * <ol>
 *   <li>{@link Situation#LETHAL} -- every creature we can sacrifice, through the
 *       best outlet, plus the drain triggers on the board ({@link #DRAINS}), is at
 *       least the opponent's life: sacrifice them all, one per priority, the
 *       drainers last.  Once begun it is committed for the rest of that step
 *       ({@code allIn}), because the damage sits on the stack while the life
 *       total has not moved yet.</li>
 *   <li>{@link Situation#THREATENED} -- something on the stack will destroy,
 *       exile, -X/-X, burn or steal a creature of ours
 *       ({@code ComputerUtil.predictThreatenedObjects}, Forge's own predicate):
 *       sacrifice it in response.</li>
 *   <li>{@link Situation#COMBAT} -- after blockers, a creature of ours that will
 *       die in this combat without killing anything (and whose removal does not
 *       let a trampler through, {@code isDangerousToSacInCombat}).</li>
 *   <li>{@link Situation#EXPIRING} -- in an end step, a creature that leaves at
 *       end of turn anyway (Forge's {@code EndOfTurnLeavePlay} SVar).</li>
 *   <li>{@link Situation#CAST_OUTLET} -- Forge passed with nothing to do in its
 *       own main phase and holds an outlet card it filtered as RemAIDeck: cast
 *       it.  Only cards that ARE an outlet are let through; every other
 *       RemAIDeck card stays filtered.</li>
 * </ol>
 *
 * <p>The victim is steered into Forge's own sacrifice-cost payment
 * ({@code ComputerUtil.getCardPreference}, which honours {@code SacMe}) by
 * {@link PolicyControllerAi#playChosenSpellAbility}: the SVar is set on the
 * victim for the duration of that one payment and removed after it.
 *
 * <p>Runs only on the game thread, inside Forge's own priority callback; it reads
 * the game, never a view, and puts nothing on the wire.
 */
public final class OutletPolicy {

    /** Why the policy acted (or would have, in shadow mode). */
    public enum Situation { LETHAL, THREATENED, COMBAT, EXPIRING, CAST_OUTLET }

    /** One decision: the ability to play, the creature to sacrifice (null for a cast), and why. */
    public static final class Choice {
        public final SpellAbility sa;
        public final Card victim;
        public final Situation why;

        Choice(final SpellAbility sa, final Card victim, final Situation why) {
            this.sa = sa;
            this.victim = victim;
            this.why = why;
        }

        @Override
        public String toString() {
            return why + ": " + sa.getHostCard().getName()
                    + (victim == null ? "" : " sacrificing " + victim.getName() + " (" + victim.getId() + ")");
        }
    }

    /**
     * Creatures whose own trigger drains the opponent when a creature of ours
     * dies or is sacrificed, and by how much per death.  By name, because the
     * trigger shapes vary (a {@code ChangesZone} trigger with a {@code LoseLife}
     * or {@code DealDamage} execute, a {@code Sacrificed} trigger); every name is
     * one that counts its own death too.  Used only to decide LETHAL.
     */
    public static final Map<String, Integer> DRAINS = new TreeMap<>(Map.of(
            "Blood Artist", 1,
            "Zulaport Cutthroat", 1,
            "Cruel Celebrant", 1,
            "Falkenrath Noble", 1,
            "Bastion of Remembrance", 1,
            "Mayhem Devil", 1,
            "Vindictive Vampire", 1,
            "Syr Konrad, the Grim", 1));

    private final boolean act;
    private int allInTurn = -1;
    private PhaseType allInPhase;

    /**
     * @param act false = shadow mode: {@link #decide} still reports what it would
     *            do (so a benchmark can count the opportunities Forge missed), but
     *            the controller does not play it
     */
    public OutletPolicy(final boolean act) {
        this.act = act;
    }

    public boolean acts() {
        return act;
    }

    // ------------------------------------------------------------------
    // Outlets
    // ------------------------------------------------------------------

    /**
     * The one sacrifice part of an activated ability that sacrifices exactly one
     * creature other than "this", or null.  Mana abilities are excluded (Ashnod's
     * Altar is Forge's mana-payment business), and so are planeswalker abilities.
     */
    public static CostSacrifice creatureSacCost(final SpellAbility sa) {
        if (sa == null || !sa.isAbility() || sa.isManaAbility() || sa.isPwAbility()) {
            return null;
        }
        final Cost cost = sa.getPayCosts();
        if (cost == null) {
            return null;
        }
        CostSacrifice found = null;
        for (final CostPart p : cost.getCostParts()) {
            if (p instanceof CostSacrifice) {
                final CostSacrifice cs = (CostSacrifice) p;
                if (found != null || cs.payCostFromSource() || !"1".equals(cs.getAmount())) {
                    return null;
                }
                if (!cs.getType().contains("Creature")) {
                    return null;
                }
                found = cs;
            }
        }
        return found;
    }

    /** Is any activated ability of this card a creature sacrifice outlet? (Works in any zone.) */
    public static boolean isOutletCard(final Card c) {
        for (final SpellAbility sa : c.getSpellAbilities()) {
            if (creatureSacCost(sa) != null) {
                return true;
            }
        }
        return false;
    }

    /** The outlets {@code ai} can activate right now, best first. */
    static List<SpellAbility> activatableOutlets(final Player ai) {
        final List<SpellAbility> out = new ArrayList<>();
        for (final Card c : ai.getCardsIn(ZoneType.Battlefield)) {
            for (final SpellAbility sa : c.getSpellAbilities()) {
                if (creatureSacCost(sa) == null) {
                    continue;
                }
                sa.setActivatingPlayer(ai);
                if (!sa.canPlay() || !ComputerUtilCost.canPayCost(sa, ai, false)) {
                    continue;
                }
                out.add(sa);
            }
        }
        out.sort(Comparator.comparingInt(OutletPolicy::outletRank).reversed());
        return out;
    }

    /** Damage first (it can be aimed at the opponent), then counters, then the rest; a tap cost last. */
    static int outletRank(final SpellAbility sa) {
        int r;
        final ApiType api = sa.getApi();
        if (api == ApiType.DealDamage || api == ApiType.LoseLife) {
            r = 30;
        } else if (api == ApiType.PutCounter) {
            r = 20;
        } else {
            r = 10;
        }
        if (sa.getPayCosts().hasTapCost()) {
            r -= 5;
        }
        if (!sa.getPayCosts().hasNoManaCost()) {
            r -= 2;
        }
        return r;
    }

    /** The creatures this outlet may sacrifice. */
    static CardCollection victimsFor(final Player ai, final SpellAbility outlet) {
        final CostSacrifice cs = creatureSacCost(outlet);
        final Card host = outlet.getHostCard();
        final CardCollection valid = CardLists.getValidCards(ai.getCardsIn(ZoneType.Battlefield),
                cs.getType().split(";"), ai, host, outlet);
        final CardCollection out = new CardCollection();
        for (final Card c : valid) {
            if (c.isCreature() && c.canBeSacrificedBy(outlet, false)) {
                out.add(c);
            }
        }
        return out;
    }

    /** Per-sacrifice damage this outlet aims at {@code opp}, or 0. */
    static int outletDamageTo(final SpellAbility outlet, final Player opp) {
        final ApiType api = outlet.getApi();
        if (api != ApiType.DealDamage && api != ApiType.LoseLife) {
            return 0;
        }
        if (outlet.usesTargeting() && !outlet.canTarget(opp)) {
            return 0;
        }
        final String amount = outlet.hasParam("NumDmg") ? outlet.getParam("NumDmg")
                : outlet.getParamOrDefault("LifeAmount", "0");
        try {
            return Math.max(0, AbilityUtils.calculateAmount(outlet.getHostCard(), amount, outlet));
        } catch (final RuntimeException e) {
            return 0;
        }
    }

    static int drainOf(final Card c) {
        return DRAINS.getOrDefault(c.getName(), 0);
    }

    // ------------------------------------------------------------------
    // The decision
    // ------------------------------------------------------------------

    /**
     * What to do now, or null.  Called at every priority, before Forge's own
     * choice; side effects are confined to the chosen outlet's targets.
     */
    public Choice decide(final Player ai) {
        final Game game = ai.getGame();
        if (game.isGameOver() || !ai.isInGame()) {
            return null;
        }
        final PhaseHandler ph = game.getPhaseHandler();
        if (allInTurn != ph.getTurn() || allInPhase != ph.getPhase()) {
            allInTurn = -1;
            allInPhase = null;
        }
        final List<SpellAbility> outlets = activatableOutlets(ai);
        if (outlets.isEmpty()) {
            return null;
        }
        final Player opp = ai.getWeakestOpponent();

        // 1. Lethal.
        final Choice lethal = lethal(ai, opp, outlets, ph);
        if (lethal != null) {
            return lethal;
        }
        // 2. Something on the stack will kill one of ours.
        if (!game.getStack().isEmpty()
                && game.getStack().peekAbility().getActivatingPlayer() != ai) {
            final List<GameObject> threatened = ComputerUtil.predictThreatenedObjects(ai, null, false);
            final List<Card> mine = new ArrayList<>();
            for (final GameObject o : threatened) {
                if (o instanceof Card && ((Card) o).getController() == ai && ((Card) o).isCreature()
                        && ((Card) o).isInPlay()) {
                    mine.add((Card) o);
                }
            }
            mine.sort(Comparator.comparingInt((Card c) -> ComputerUtilCard.evaluateCreature(c)).reversed());
            for (final Card victim : mine) {
                final Choice ch = useOn(ai, outlets, victim, Situation.THREATENED);
                if (ch != null) {
                    return ch;
                }
            }
        }
        // 3. Doomed in combat, after blockers, killing nothing.
        final Combat combat = game.getCombat();
        if (combat != null && game.getStack().isEmpty()
                && (ph.is(PhaseType.COMBAT_DECLARE_BLOCKERS) || ph.is(PhaseType.COMBAT_FIRST_STRIKE_DAMAGE))) {
            final List<Card> doomed = new ArrayList<>();
            for (final Card c : ai.getCreaturesInPlay()) {
                if (!combat.isAttacking(c) && !combat.isBlocking(c)) {
                    continue;
                }
                if (combat.isAttacking(c) && !combat.isBlocked(c)) {
                    continue;
                }
                if (ComputerUtilCombat.combatantWouldBeDestroyed(ai, c, combat)
                        && !ComputerUtilCombat.willOpposingCreatureDieInCombat(ai, c, combat)
                        && !ComputerUtilCombat.isDangerousToSacInCombat(ai, c, combat)) {
                    doomed.add(c);
                }
            }
            doomed.sort(Comparator.comparingInt((Card c) -> ComputerUtilCard.evaluateCreature(c)).reversed());
            for (final Card victim : doomed) {
                final Choice ch = useOn(ai, outlets, victim, Situation.COMBAT);
                if (ch != null) {
                    return ch;
                }
            }
        }
        // 4. Leaves at end of turn anyway.
        if (ph.is(PhaseType.END_OF_TURN)) {
            for (final Card c : ai.getCreaturesInPlay()) {
                if (c.hasSVar("EndOfTurnLeavePlay")) {
                    final Choice ch = useOn(ai, outlets, c, Situation.EXPIRING);
                    if (ch != null) {
                        return ch;
                    }
                }
            }
        }
        return null;
    }

    private Choice lethal(final Player ai, final Player opp, final List<SpellAbility> outlets, final PhaseHandler ph) {
        if (opp == null || !opp.canLoseLife() || opp.cantLoseForZeroOrLessLife()) {
            return null;
        }
        // The best repeatable outlet: free of mana and tap.
        SpellAbility best = null;
        int bestDmg = -1;
        for (final SpellAbility o : outlets) {
            if (o.getPayCosts().hasTapCost() || !o.getPayCosts().hasNoManaCost()) {
                continue;
            }
            final int d = outletDamageTo(o, opp);
            if (d > bestDmg) {
                best = o;
                bestDmg = d;
            }
        }
        if (best == null) {
            return null;
        }
        final CardCollection victims = victimsFor(ai, best);
        if (victims.isEmpty()) {
            return null;
        }
        // Order: plain creatures, cheapest first; then drainers; the outlet's own host last of all.
        final Card outletHost = best.getHostCard();
        victims.sort(Comparator.<Card>comparingInt(c -> c == outletHost ? 2 : drainOf(c) > 0 ? 1 : 0)
                .thenComparingInt(ComputerUtilCard::evaluateCreature));
        final boolean committed = allInTurn == ph.getTurn() && allInPhase == ph.getPhase();
        if (!committed) {
            int drainsAlive = 0;
            for (final Card c : ai.getCardsIn(ZoneType.Battlefield)) {
                drainsAlive += drainOf(c);
            }
            int total = 0;
            for (final Card v : victims) {
                total += bestDmg + drainsAlive;   // a drainer counts its own death
                drainsAlive -= drainOf(v);
            }
            if (total < opp.getLife()) {
                return null;
            }
        }
        final Choice ch = prepare(ai, best, victims.get(0), Situation.LETHAL, opp);
        if (ch != null && act) {
            allInTurn = ph.getTurn();
            allInPhase = ph.getPhase();
        }
        return ch;
    }

    /** Sacrifice {@code victim} through the first outlet that can take it and aim. */
    private Choice useOn(final Player ai, final List<SpellAbility> outlets, final Card victim, final Situation why) {
        for (final SpellAbility o : outlets) {
            if (!victimsFor(ai, o).contains(victim)) {
                continue;
            }
            final Choice ch = prepare(ai, o, victim, why, ai.getWeakestOpponent());
            if (ch != null) {
                return ch;
            }
        }
        return null;
    }

    /**
     * Set the outlet's targets: the opponent's face for damage or life loss when
     * the policy is going for lethal or the outlet can only hit players; otherwise
     * Forge's own mandatory-trigger targeting for that effect
     * ({@code doTriggerNoCostWithSubs(ai, sa, true)}), which is how Forge aims a
     * trigger it has to put on the stack.  Null when no legal targets result.
     */
    private Choice prepare(final Player ai, final SpellAbility outlet, final Card victim, final Situation why,
                           final Player opp) {
        if (outlet.usesTargeting() || hasTargetingSub(outlet)) {
            outlet.resetTargets();
            final boolean face = why == Situation.LETHAL && outletDamageTo(outlet, opp) > 0;
            if (face) {
                outlet.getTargets().add(opp);
            } else {
                try {
                    if (!SpellApiToAi.Converter.get(outlet).doTriggerNoCostWithSubs(ai, outlet, true).willingToPlay()) {
                        outlet.resetTargets();
                        return null;
                    }
                } catch (final RuntimeException e) {
                    outlet.resetTargets();
                    return null;
                }
            }
            if (!outlet.isTargetNumberValid()) {
                outlet.resetTargets();
                return null;
            }
        }
        return new Choice(outlet, victim, why);
    }

    private static boolean hasTargetingSub(final SpellAbility sa) {
        for (SpellAbility s = sa.getSubAbility(); s != null; s = s.getSubAbility()) {
            if (s.usesTargeting()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Situation 5: an outlet card in hand that Forge's RemAIDeck filter hid from
     * its own choice.  Called only after Forge chose nothing, in our own main
     * phase with an empty stack.
     */
    public Choice castOutlet(final Player ai) {
        final Game game = ai.getGame();
        final PhaseHandler ph = game.getPhaseHandler();
        if (game.isGameOver() || !ph.isPlayerTurn(ai) || !game.getStack().isEmpty()
                || !(ph.is(PhaseType.MAIN1) || ph.is(PhaseType.MAIN2))) {
            return null;
        }
        for (final Card c : ai.getCardsIn(ZoneType.Hand)) {
            if (!ComputerUtilCard.isCardRemAIDeck(c) || !isOutletCard(c)) {
                continue;
            }
            for (final SpellAbility sa : c.getSpellAbilities()) {
                if (!sa.isSpell()) {
                    continue;
                }
                sa.setActivatingPlayer(ai);
                if (sa.canPlay() && sa.canCastTiming(ai) && ComputerUtilCost.canPayCost(sa, ai, false)) {
                    return new Choice(sa, null, Situation.CAST_OUTLET);
                }
            }
        }
        return null;
    }
}
