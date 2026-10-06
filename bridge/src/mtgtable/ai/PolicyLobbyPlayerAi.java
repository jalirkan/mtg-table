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
import forge.ai.PlayerControllerAi;
import forge.game.Game;
import forge.game.player.Player;
import forge.game.player.PlayerController;

/**
 * A Forge AI lobby player whose in-game controller is a {@link PolicyControllerAi}
 * (D309).  This is the extension point that needs no patch to Forge's jar:
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
    private final SearchConfig search;
    private PolicyControllerAi last;
    /** Play exploration for the NEXT game this lobby player sits in (D358), and its seed; null = none. */
    private ExploreMath.Config explore;
    private long exploreSeed;

    public PolicyLobbyPlayerAi(final String name, final AIOption sim, final Outlets outlets) {
        this(name, sim, outlets, null);
    }

    /** @param search null = no search (D312); otherwise its configuration */
    public PolicyLobbyPlayerAi(final String name, final AIOption sim, final Outlets outlets,
                               final SearchConfig search) {
        super(name, sim == null ? null : Set.of(sim));
        this.sim = sim;
        this.outlets = outlets;
        this.search = search;
    }

    public SearchConfig search() {
        return search;
    }

    public Outlets outlets() {
        return outlets;
    }

    public AIOption simulation() {
        return sim;
    }

    /**
     * Explore the next game's decisions (D358) with a generator seeded by
     * {@code seed} ({@link ExploreMath#seedFor}); null = play as the seat's
     * policy says.  Read when the game creates its players, so set it before
     * {@code Match.createGame}.
     */
    public void setExplore(final ExploreMath.Config cfg, final long seed) {
        this.explore = cfg;
        this.exploreSeed = seed;
    }

    /** The controller of the most recent game this lobby player sat in, for its counters. */
    public PolicyControllerAi lastController() {
        return last;
    }

    private PolicyControllerAi createControllerFor(final Player ai) {
        final OutletPolicy policy = outlets == Outlets.OFF ? null : new OutletPolicy(outlets == Outlets.ON);
        final PolicyControllerAi result = new PolicyControllerAi(ai.getGame(), ai, this, policy, search);
        result.getAi().setUseSimulation(sim);
        return result;
    }

    @Override
    public PlayerController createMindSlaveController(final Player master, final Player slave) {
        return createControllerFor(slave);
    }

    @Override
    public Player createIngamePlayer(final Game game, final int id) {
        if (SearchPolicy.copying()) {
            // A search is copying the game (D312): the copy's seat gets Forge's
            // plain controller (the search then installs its rollout controllers),
            // and the bench's "last controller" stays the real game's.
            final Player p = new Player(getName(), game, id);
            p.setFirstController(new PlayerControllerAi(game, p, this));
            return p;
        }
        final Player ai = new Player(getName(), game, id);
        last = createControllerFor(ai);
        if (explore != null) {
            last.setExplorer(new Explorer(new ExploreMath(explore, exploreSeed)));
        }
        ai.setFirstController(last);
        return ai;
    }
}
