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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

import forge.LobbyPlayer;
import forge.ai.PlayerControllerAi;
import forge.game.Game;
import forge.game.card.Card;
import forge.game.player.Player;
import forge.game.spellability.SpellAbility;
import forge.game.zone.ZoneType;

/**
 * Forge's own AI controller with one seam of ours in front of it (D300, D301).
 *
 * <p>{@code PlayerControllerAi.chooseSpellAbilityToPlay()} is the one place
 * Forge asks an AI seat "what do you do with this priority?" -- every phase,
 * both turns, with or without a stack.  This subclass asks the
 * {@link OutletPolicy} first (lethal and stack threats), then Forge, then the
 * policy again for the cases that should only win when Forge has nothing to
 * do (an outlet card left in hand).  Everything else -- attacks, blocks,
 * targeting, mulligans, triggers, cost payment -- is Forge's, untouched.
 *
 * <p>It also counts, for {@code tools/ai-bench.sh}: what the policy did, what it
 * WOULD have done in shadow mode (the opportunities Forge's own AI had), and the
 * outlet activations Forge chose by itself.  Counting has no effect on play.
 */
public class PolicyControllerAi extends PlayerControllerAi {

    /** Card names whose casting and activation the benchmark reports. */
    public static final Set<String> WATCH = Set.of(
            "Viscera Seer", "Goblin Bombardment", "Carrion Feeder", "Priest of Forgotten Gods",
            "Woe Strider", "Village Rites", "Deadly Dispute", "Blood Artist", "Zulaport Cutthroat",
            "Mayhem Devil", "Cauldron Familiar", "Grim Haruspex", "Juri, Master of the Revue");

    private final OutletPolicy policy;
    private final Map<String, Integer> counts = new TreeMap<>();
    private final List<String> events = new ArrayList<>();
    private final Set<String> seen = new HashSet<>();

    private SpellAbility steerSa;
    private Card steerVictim;

    /**
     * @param policy null = plain Forge (still counted); otherwise the policy, acting
     *               or in shadow mode
     */
    public PolicyControllerAi(final Game game, final Player p, final LobbyPlayer lp, final OutletPolicy policy) {
        super(game, p, lp);
        this.policy = policy;
    }

    public Map<String, Integer> counts() {
        return counts;
    }

    public List<String> events() {
        return events;
    }

    private void count(final String k) {
        counts.merge(k, 1, Integer::sum);
    }

    private void event(final String s) {
        if (events.size() < 60) {
            final Game g = getGame();
            events.add("T" + g.getPhaseHandler().getTurn() + " " + g.getPhaseHandler().getPhase()
                    + (g.getPhaseHandler().isPlayerTurn(player) ? " (own) " : " (opp) ") + s);
        }
    }

    @Override
    public List<SpellAbility> chooseSpellAbilityToPlay() {
        steerSa = null;
        steerVictim = null;
        if (policy != null) {
            final OutletPolicy.Choice ch = policy.decide(player);
            if (ch != null) {
                final String key = ch.why + ":" + (ch.victim == null ? "-" : ch.victim.getId())
                        + ":" + getGame().getPhaseHandler().getTurn();
                if (seen.add(key)) {
                    count("opportunity." + ch.why);
                }
                if (policy.acts()) {
                    count("policy." + ch.why);
                    event("policy " + ch);
                    steerSa = ch.sa;
                    steerVictim = ch.victim;
                    return singleton(ch.sa);
                }
            }
        }
        final List<SpellAbility> forge = super.chooseSpellAbilityToPlay();
        if ((forge == null || forge.isEmpty()) && policy != null) {
            final OutletPolicy.Choice cast = policy.castOutlet(player);
            if (cast != null) {
                final String key = "CAST:" + cast.sa.getHostCard().getId() + ":" + getGame().getPhaseHandler().getTurn();
                if (seen.add(key)) {
                    count("opportunity." + cast.why);
                }
                if (policy.acts()) {
                    count("policy." + cast.why);
                    event("policy " + cast);
                    return singleton(cast.sa);
                }
            }
        }
        return forge;
    }

    private static List<SpellAbility> singleton(final SpellAbility sa) {
        final List<SpellAbility> l = new ArrayList<>(1);
        l.add(sa);
        return l;
    }

    @Override
    public boolean playChosenSpellAbility(final SpellAbility sa) {
        final Card host = sa.getHostCard();
        final boolean outlet = OutletPolicy.creatureSacCost(sa) != null;
        if (host != null && WATCH.contains(host.getName())) {
            count((sa.isSpell() ? "cast." : "activate.") + host.getName());
        }
        if (outlet && sa != steerSa) {
            count("forge.outletActivation");
            event("forge activates " + host.getName());
        }
        if (sa == steerSa && steerVictim != null) {
            final Card victim = steerVictim;
            final boolean had = victim.hasSVar("SacMe");
            final String old = had ? victim.getSVar("SacMe") : null;
            victim.setSVar("SacMe", "6");
            try {
                return super.playChosenSpellAbility(sa);
            } finally {
                if (had) {
                    victim.setSVar("SacMe", old);
                } else {
                    victim.removeSVar("SacMe");
                }
                if (victim.getZone() != null && victim.getZone().is(ZoneType.Battlefield)
                        && victim.getController() == player) {
                    count("policy.steerMissed");
                    event("steer missed: " + victim.getName() + " is still on the battlefield");
                }
                steerSa = null;
                steerVictim = null;
            }
        }
        return super.playChosenSpellAbility(sa);
    }
}
