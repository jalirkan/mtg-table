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

import java.util.List;
import java.util.Map;

import forge.LobbyPlayer;
import forge.game.Game;
import forge.game.GameEntity;
import forge.game.card.Card;
import forge.game.combat.Combat;
import forge.game.player.Player;
import forge.game.spellability.SpellAbility;

/**
 * A seat in one of the move atlas's branch games (D451): its FIRST answer to
 * one question is forced -- the option being played out, as in a search
 * rollout ({@link RolloutController}) -- and after that it is our controller
 * with whatever policy the branch's continuation names: Forge's own AI, or the
 * random seat ({@link Explorer} with {@link ExploreMath.Config#randomSeat}),
 * with an observing search ({@code observe=1}) so its decisions become rows.
 */
final class AtlasController extends PolicyControllerAi implements RolloutForcing {

    private final RolloutController.Forced forced = new RolloutController.Forced();

    AtlasController(final Game game, final Player p, final LobbyPlayer lp, final SearchConfig observe) {
        super(game, p, lp, null, observe);
    }

    @Override
    public void forcePriority(final SpellAbility saOrNullForPass) {
        forced.priority(saOrNullForPass);
    }

    @Override
    public void forceAttack(final Map<Card, GameEntity> attackers) {
        forced.attack(attackers);
    }

    @Override
    public void forceBlock(final Map<Card, Card> blocks) {
        forced.block(blocks);
    }

    @Override
    public boolean applied(final Game copy) {
        return forced.applied(copy);
    }

    @Override
    public List<SpellAbility> chooseSpellAbilityToPlay() {
        if (forced.takePriority(getGame())) {
            return forced.priorityAnswer();
        }
        return super.chooseSpellAbilityToPlay();
    }

    @Override
    public void declareAttackers(final Player attacker, final Combat combat) {
        if (forced.attackers(combat, getGame())) {
            return;
        }
        super.declareAttackers(attacker, combat);
    }

    @Override
    public void declareBlockers(final Player defender, final Combat combat) {
        if (forced.blockers(combat, getGame())) {
            return;
        }
        super.declareBlockers(defender, combat);
    }
}
