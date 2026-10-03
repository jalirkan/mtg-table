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
import forge.game.phase.PhaseHandler;
import forge.game.phase.PhaseType;
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
 * candidate's assignment (cards of the copy).  {@link Outlets} is the same
 * forcing with D310's outlet policy in front of Forge afterwards
 * ({@code rollout=outlets}, D355).
 */
final class RolloutController extends PlayerControllerAi implements RolloutForcing {

    /** The forcing itself, shared by both controllers. */
    static final class Forced {
        private boolean forcePriority;
        private SpellAbility forcedSa;
        private Map<Card, GameEntity> forcedAttack;
        private Map<Card, Card> forcedBlock;   // blocker -> attacker
        /** 'p', 'a' or 'b' once something was forced; and whether it has been used. */
        private char kind;
        private boolean used;
        private int turn;

        void priority(final SpellAbility sa) {
            forcePriority = true;
            forcedSa = sa;
            kind = 'p';
        }

        void attack(final Map<Card, GameEntity> m) {
            forcedAttack = m;
            kind = 'a';
        }

        void block(final Map<Card, Card> m) {
            forcedBlock = m;
            kind = 'b';
        }

        /** Non-null (possibly "pass", an empty marker) when the priority answer is forced now. */
        boolean takePriority(final Game g) {
            if (!forcePriority) {
                return false;
            }
            forcePriority = false;
            used = true;
            turn = g.getPhaseHandler().getTurn();
            return true;
        }

        List<SpellAbility> priorityAnswer() {
            if (forcedSa == null) {
                return null;
            }
            final List<SpellAbility> l = new ArrayList<>(1);
            l.add(forcedSa);
            return l;
        }

        boolean attackers(final Combat combat, final Game g) {
            if (forcedAttack == null) {
                return false;
            }
            final Map<Card, GameEntity> f = forcedAttack;
            forcedAttack = null;
            used = true;
            turn = g.getPhaseHandler().getTurn();
            combat.clearAttackers();
            for (final Map.Entry<Card, GameEntity> e : f.entrySet()) {
                combat.addAttacker(e.getKey(), e.getValue());
            }
            return true;
        }

        boolean blockers(final Combat combat, final Game g) {
            if (forcedBlock == null) {
                return false;
            }
            final Map<Card, Card> f = forcedBlock;
            forcedBlock = null;
            used = true;
            turn = g.getPhaseHandler().getTurn();
            for (final Card b : new ArrayList<>(combat.getAllBlockers())) {
                combat.undoBlockingAssignment(b);
            }
            for (final Map.Entry<Card, Card> e : f.entrySet()) {
                combat.addBlocker(e.getValue(), e.getKey());
            }
            return true;
        }

        boolean applied(final Game g) {
            if (!used) {
                return false;
            }
            final PhaseHandler ph = g.getPhaseHandler();
            if (ph.getTurn() != turn) {
                return true;
            }
            // Triggers waiting to go on the stack (an ETB, a combat-damage
            // trigger) are part of the answer's effect: not applied until they resolve.
            if (!g.getStack().isEmpty() || g.getStack().hasSimultaneousStackEntries()) {
                return false;
            }
            if (kind == 'p') {
                return true;
            }
            final PhaseType at = ph.getPhase();
            return at != null && at.isAfter(PhaseType.COMBAT_DAMAGE);
        }
    }

    private final Forced forced = new Forced();

    RolloutController(final Game game, final Player p, final LobbyPlayer lp) {
        super(game, p, lp);
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

    /**
     * D355: the searching seat's rollout controller with D310's sacrifice-outlet
     * policy acting in front of Forge (a {@link PolicyControllerAi} with no
     * search and no decision sink), the candidate forced first as above.
     */
    static final class Outlets extends PolicyControllerAi implements RolloutForcing {
        private final Forced forced = new Forced();

        Outlets(final Game game, final Player p, final LobbyPlayer lp) {
            super(game, p, lp, new OutletPolicy(true));
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
}
