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
 * ({@code rollout=outlets}, D390).
 */
class RolloutController extends PlayerControllerAi implements RolloutForcing {

    /**
     * D470: a forced combat answer that cannot be given in this copy -- the
     * seat was never asked at the fork's own combat step, or a forced block
     * names an attacker that is not attacking or a blocker that is not on the
     * battlefield.  The option is unavailable in this game: not Forge's
     * {@code NullPointerException} from {@code Combat.addBlocker}, and never a
     * stale answer given at a later combat.
     */
    static final class OptionUnavailable extends IllegalStateException {
        private static final long serialVersionUID = 1L;

        OptionUnavailable(final String why) {
            super("option unavailable: " + why);
        }
    }

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
        /** D470: the copy's turn when a combat answer was forced (its own combat is this turn's), -1 none. */
        private int armTurn = -1;

        void priority(final SpellAbility sa) {
            forcePriority = true;
            forcedSa = sa;
            kind = 'p';
        }

        void attack(final Map<Card, GameEntity> m, final Game g) {
            forcedAttack = m;
            kind = 'a';
            armTurn = g.getPhaseHandler().getTurn();
        }

        void block(final Map<Card, Card> m, final Game g) {
            forcedBlock = m;
            kind = 'b';
            armTurn = g.getPhaseHandler().getTurn();
        }

        /** D470: a combat answer is given at the fork's own combat or not at all. */
        private void sameTurn(final Game g, final String what) {
            final int now = g.getPhaseHandler().getTurn();
            if (armTurn >= 0 && now != armTurn) {
                throw new OptionUnavailable("the seat was first asked to declare " + what + " on turn " + now
                        + ", not at the fork's combat on turn " + armTurn);
            }
        }

        /**
         * D470: why the forced combat answer can no longer be given -- the
         * copy went past the step that asks it (or past its turn) and the seat
         * was never asked -- or null while it still can (or nothing combat was forced).
         */
        String expired(final Game g) {
            final Object pending = kind == 'a' ? forcedAttack : kind == 'b' ? forcedBlock : null;
            if (pending == null || used) {
                return null;
            }
            final PhaseHandler ph = g.getPhaseHandler();
            final PhaseType step = kind == 'a' ? PhaseType.COMBAT_DECLARE_ATTACKERS : PhaseType.COMBAT_DECLARE_BLOCKERS;
            final PhaseType at = ph.getPhase();
            if (ph.getTurn() == armTurn && at != null && !at.isAfter(step)) {
                return null;
            }
            return "the seat was never asked to declare " + (kind == 'a' ? "attackers" : "blockers") + " at the fork's combat (turn "
                    + armTurn + "; the copy is at turn " + ph.getTurn() + " " + at + ")";
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
            sameTurn(g, "attackers");
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
            sameTurn(g, "blockers");
            // D470: Combat.addBlocker throws "No band for attacker" (getBandOfAttackerNotNull) on an attacker not in this combat
            for (final Map.Entry<Card, Card> e : f.entrySet()) {
                if (combat.getBandOfAttacker(e.getValue()) == null) {
                    throw new OptionUnavailable("the forced block's attacker " + e.getValue() + " is not attacking");
                }
                if (!e.getKey().isInPlay()) {
                    throw new OptionUnavailable("the forced block's blocker " + e.getKey() + " is not on the battlefield");
                }
            }
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

        /** D477: something was forced and not yet given. */
        boolean unanswered() {
            return kind != 0 && !used;
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
        forced.attack(attackers, getGame());
    }

    @Override
    public void forceBlock(final Map<Card, Card> blocks) {
        forced.block(blocks, getGame());
    }

    @Override
    public boolean applied(final Game copy) {
        return forced.applied(copy);
    }

    @Override
    public boolean unanswered() {
        return forced.unanswered();
    }

    /** The forced answer has been taken (D454: {@link RecordingController} starts its line there). */
    final boolean forcedUsed() {
        return forced.used;
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
     * D390: the searching seat's rollout controller with D310's sacrifice-outlet
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
            forced.attack(attackers, getGame());
        }

        @Override
        public void forceBlock(final Map<Card, Card> blocks) {
            forced.block(blocks, getGame());
        }

        @Override
        public boolean applied(final Game copy) {
            return forced.applied(copy);
        }

        @Override
        public boolean unanswered() {
            return forced.unanswered();
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
