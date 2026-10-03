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

import java.util.Map;

import forge.game.Game;
import forge.game.GameEntity;
import forge.game.card.Card;
import forge.game.spellability.SpellAbility;

/**
 * What a rollout's searching seat must do: take one forced first answer
 * ({@link SearchPolicy.Cand#install}), then play on.  Two controllers
 * implement it: {@link RolloutController} (plain Forge after the forced
 * answer) and {@link RolloutController.Outlets} (D310's outlet policy in front
 * of Forge, D356).
 */
interface RolloutForcing {
    void forcePriority(SpellAbility saOrNullForPass);

    void forceAttack(Map<Card, GameEntity> attackers);

    void forceBlock(Map<Card, Card> blocks);

    /**
     * D355's prior: the forced answer has been played out -- a priority
     * answer taken and the stack empty again, or a forced combat
     * declaration made and that combat's damage dealt (or the turn over).
     */
    boolean applied(Game copy);
}
