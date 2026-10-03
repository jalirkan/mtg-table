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
import java.util.List;
import java.util.Map;

import forge.LobbyPlayer;
import forge.ai.PlayerControllerAi;
import forge.game.Game;
import forge.game.GameEntity;
import forge.game.card.Card;
import forge.game.combat.Combat;
import forge.game.player.Player;
import forge.game.spellability.SpellAbility;

/**
 * The searching seat's controller inside a rollout (D312): Forge's plain
 * default AI, except that its FIRST answer to one question is forced -- the
 * candidate being evaluated.  After that it is Forge's Default AI to the
 * horizon, as is the opponent's seat.
 *
 * <p>Forced priority: the first {@link #chooseSpellAbilityToPlay} returns the
 * candidate (already mapped into the copy, targets and modes copied) or null
 * for "pass".  Forced attack / block: the first {@link #declareAttackers} or
 * {@link #declareBlockers} replaces whatever the copied combat holds with the
 * candidate's assignment (cards of the copy).
 */
final class RolloutController extends PlayerControllerAi {

    private boolean forcePriority;
    private SpellAbility forcedSa;
    private Map<Card, GameEntity> forcedAttack;
    private Map<Card, Card> forcedBlock;   // blocker -> attacker

    RolloutController(final Game game, final Player p, final LobbyPlayer lp) {
        super(game, p, lp);
    }

    void forcePriority(final SpellAbility saOrNullForPass) {
        forcePriority = true;
        forcedSa = saOrNullForPass;
    }

    void forceAttack(final Map<Card, GameEntity> attackers) {
        forcedAttack = attackers;
    }

    void forceBlock(final Map<Card, Card> blocks) {
        forcedBlock = blocks;
    }

    @Override
    public List<SpellAbility> chooseSpellAbilityToPlay() {
        if (forcePriority) {
            forcePriority = false;
            if (forcedSa == null) {
                return null;
            }
            final List<SpellAbility> l = new ArrayList<>(1);
            l.add(forcedSa);
            return l;
        }
        return super.chooseSpellAbilityToPlay();
    }

    @Override
    public void declareAttackers(final Player attacker, final Combat combat) {
        if (forcedAttack != null) {
            final Map<Card, GameEntity> f = forcedAttack;
            forcedAttack = null;
            combat.clearAttackers();
            for (final Map.Entry<Card, GameEntity> e : f.entrySet()) {
                combat.addAttacker(e.getKey(), e.getValue());
            }
            return;
        }
        super.declareAttackers(attacker, combat);
    }

    @Override
    public void declareBlockers(final Player defender, final Combat combat) {
        if (forcedBlock != null) {
            final Map<Card, Card> f = forcedBlock;
            forcedBlock = null;
            for (final Card b : new ArrayList<>(combat.getAllBlockers())) {
                combat.undoBlockingAssignment(b);
            }
            for (final Map.Entry<Card, Card> e : f.entrySet()) {
                combat.addBlocker(e.getValue(), e.getKey());
            }
            return;
        }
        super.declareBlockers(defender, combat);
    }
}
