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

import java.util.Set;

import forge.ai.AIOption;
import forge.ai.LobbyPlayerAi;
import forge.game.Game;
import forge.game.player.Player;
import forge.game.player.PlayerController;

/**
 * A Forge AI lobby player whose in-game controller is a {@link PolicyControllerAi}
 * (D300).  This is the extension point that needs no patch to Forge's jar:
 * {@code LobbyPlayerAi.createIngamePlayer} is public and not final, and
 * {@code PlayerControllerAi} is a public, non-final class whose priority callback
 * we can wrap.  {@code LobbyPlayerAi}'s own {@code createControllerFor} is
 * private, so the two methods that call it are reimplemented here line for line
 * (javap and the decompiled 2.0.14 bytecode), with our controller in its place.
 *
 * <p>Built only by {@code mtgtable.Bootstrap.createAiSeat} -- every AI seat goes
 * through Bootstrap (match setup, D107).
 */
public final class PolicyLobbyPlayerAi extends LobbyPlayerAi {

    /** How the seat plays its outlets. */
    public enum Outlets {
        /** Forge's AI alone; the controller only counts. */
        OFF,
        /** Forge's AI alone; the policy runs and counts what it would have done. */
        SHADOW,
        /** The policy acts. */
        ON
    }

    private final AIOption sim;
    private final Outlets outlets;
    private PolicyControllerAi last;

    public PolicyLobbyPlayerAi(final String name, final AIOption sim, final Outlets outlets) {
        super(name, sim == null ? null : Set.of(sim));
        this.sim = sim;
        this.outlets = outlets;
    }

    public Outlets outlets() {
        return outlets;
    }

    public AIOption simulation() {
        return sim;
    }

    /** The controller of the most recent game this lobby player sat in, for its counters. */
    public PolicyControllerAi lastController() {
        return last;
    }

    private PolicyControllerAi createControllerFor(final Player ai) {
        final OutletPolicy policy = outlets == Outlets.OFF ? null : new OutletPolicy(outlets == Outlets.ON);
        final PolicyControllerAi result = new PolicyControllerAi(ai.getGame(), ai, this, policy);
        result.getAi().setUseSimulation(sim);
        return result;
    }

    @Override
    public PlayerController createMindSlaveController(final Player master, final Player slave) {
        return createControllerFor(slave);
    }

    @Override
    public Player createIngamePlayer(final Game game, final int id) {
        final Player ai = new Player(getName(), game, id);
        last = createControllerFor(ai);
        ai.setFirstController(last);
        return ai;
    }
}
