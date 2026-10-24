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

import forge.StaticData;
import forge.card.ColorSet;
import forge.game.Game;
import forge.game.GameStage;
import forge.game.GameType;
import forge.game.ability.AbilityFactory;
import forge.game.ability.AbilityKey;
import forge.game.ability.ApiType;
import forge.game.card.Card;
import forge.game.event.GameEventGameStarted;
import forge.game.extrahands.BackupPlanService;
import forge.game.keyword.KeywordInterface;
import forge.game.mulligan.MulliganService;
import forge.game.player.Player;
import forge.game.spellability.SpellAbility;
import forge.game.trigger.TriggerType;
import forge.game.zone.ZoneType;

/**
 * D477: a fork's game restarted by Karn Liberated's -14 ("restart the game").
 *
 * <p><b>What Forge does.</b>  {@code RestartGameEffect.resolve} puts every
 * card back into its owner's library, resets the players, calls
 * {@code PhaseHandler.restart()} (the turn to 0), sets the game's age to
 * {@code GameStage.RestartedByKarn} and the activator as the player whose turn
 * it is.  The same {@code mainLoopStep} then sees the age, sets the phase to
 * null, fires {@code GameEventGameRestarted} and returns
 * ({@code PhaseHandler.java:1150} at the {@code forge-2.0.14} tag).  Nothing
 * in the step loop starts the new game: {@code GameAction.startGame}'s
 * do-while does ({@code GameAction.java:2326-2381}) -- it deals the opening
 * hands, runs the mulligans and the opening-hand actions, and starts the first
 * turn with the activator, because its {@code mainGameLoop} returns on that
 * age.  A fork plays its copy with its own loop ({@link Atlas#play},
 * {@link SearchPolicy#playout}), which kept calling {@code mainLoopStep} on a
 * phase of null: the next priority threw {@code NullPointerException} in
 * {@code ComputerUtilAbility.getAvailableLandsToPlay} (J162's modern7 spine,
 * 62 random branches).
 *
 * <p><b>What a fork does now</b> ({@link #begin}): the body of that do-while,
 * on the copy, from where Forge's loop takes it up after a restart -- the
 * first player is the one whose turn the effect set, with no coin toss --
 * through {@code PhaseHandler.setupFirstTurn}, and then the fork's own loop
 * plays the new game on.  {@code runPreOpeningHandActions} and
 * {@code runOpeningHandActions} are private in the pinned jar, so their bodies
 * are written here after Forge's own (same licence; every call javap-checked
 * against 2.0.14).  Filtered starting hands (a private draw, off unless the
 * preference is on) are refused loudly, never imitated.
 *
 * <p>Threads: the game thread, inside the fork's loop, as every
 * {@code mainLoopStep} of a copy.  No hop.
 */
final class ForkRestart {

    private ForkRestart() {
    }

    /** Whether {@code g}'s game was restarted and its new game is still to be started. */
    static boolean pending(final Game g) {
        return g.getAge() == GameStage.RestartedByKarn && !g.isGameOver();
    }

    /**
     * Start the restarted game on {@code g} as {@code GameAction.startGame}'s
     * loop would, up to and including the new first turn's setup; the fork's
     * loop then steps it.  May end with the game over (a concession in the
     * mulligan, as Forge's loop allows).  With {@code forcing} (the searching
     * or atlas seat's controller) still holding its forced first answer, the
     * option was never played in this copy, and it is
     * {@link RolloutController.OptionUnavailable} (D470) instead.
     */
    static void begin(final Game g, final RolloutForcing forcing) {
        if (!pending(g)) {
            throw new IllegalStateException("the game was not restarted");
        }
        if (forcing != null && forcing.unanswered()) {
            // the option was never played in this copy: its game is gone (D470's outcome, not an error)
            throw new RolloutController.OptionUnavailable("the game was restarted (Karn Liberated) before the forced answer"
                    + " was given");
        }
        if (StaticData.instance().getFilteredHandsEnabled()) {
            throw new IllegalStateException("a restart with filtered starting hands is not supported (Forge's draw is private)");
        }
        Player first = g.getPhaseHandler().getPlayerTurn();   // RestartGameEffect: the activator
        final GameType type = g.getRules().getGameType();
        g.fireEvent(new GameEventGameStarted(type, first, g.getPlayers()));
        preOpeningHandActions(g, first);
        g.setAge(GameStage.Mulligan);
        for (final Player p : g.getPlayers()) {
            p.drawCards(p.getStartingHandSize());
            final BackupPlanService backupPlans = new BackupPlanService(p);
            if (backupPlans.initializeExtraHands()) {
                backupPlans.chooseHand();
            }
        }
        if (type != GameType.Puzzle) {
            new MulliganService(first).perform();
        }
        if (g.isGameOver()) {
            return;
        }
        g.setAge(GameStage.Play);
        if (g.getRules().hasAppliedVariant(GameType.Planechase)) {
            first.initPlane();
            for (final Player p : g.getPlayers()) {
                p.createPlanechaseEffects(g);
            }
        }
        first = openingHandActions(g, first);
        g.getAction().checkStateEffects(true);
        g.getTriggerHandler().runTrigger(TriggerType.NewGame, AbilityKey.newMap(), true);
        g.setStartingPlayer(first);
        g.getPhaseHandler().setupFirstTurn(first, null);
    }

    /** {@code GameAction.runPreOpeningHandActions} (private): Emissary's Ploy's number, Cryptic Spires' colours. */
    private static void preOpeningHandActions(final Game g, final Player first) {
        Player takesAction = first;
        do {
            final List<Integer> cmc = new ArrayList<>(List.of(1, 2, 3));
            for (final Card c : takesAction.getCardsIn(ZoneType.Command)) {
                if (!"Emissary's Ploy".equals(c.getName())) {
                    continue;
                }
                int chosen = 1;
                if (!cmc.isEmpty()) {
                    final SpellAbility sa = new SpellAbility.EmptySa(ApiType.ChooseNumber, c, takesAction);
                    chosen = takesAction.getController().chooseNumber(sa, "Emissary's Ploy", cmc, c.getOwner());
                    cmc.remove((Object) chosen);
                }
                c.setChosenNumber(chosen);
            }
            for (final Card c : g.getCardsInGame()) {
                if (c.getController() != takesAction || !"Cryptic Spires".equals(c.getName()) || c.hasMarkedColor()
                        || !takesAction.isAI()) {
                    continue;
                }
                final SpellAbility sa = new SpellAbility.EmptySa(ApiType.ChooseColor, c, takesAction);
                sa.putParam("AILogic", "MostProminentInComputerDeck");
                c.setMarkedColors(takesAction.getController().chooseColors(c.getName() + ": choose two colors", sa, 2, 2,
                        ColorSet.WUBRG));
            }
            takesAction = g.getNextPlayerAfter(takesAction);
        } while (takesAction != first);
    }

    /**
     * {@code GameAction.runOpeningHandActions} (private): each player, from the
     * first, may begin the game with its opening hand's "MayEffectFromOpeningHand"
     * cards (a Leyline, Gemstone Caverns); returns the player who goes first
     * (a {@code BecomeStartingPlayer} effect changes it).
     */
    private static Player openingHandActions(final Game g, final Player first) {
        Player takesAction = first;
        Player newFirst = first;
        do {
            List<SpellAbility> usable = new ArrayList<>();
            for (final Card c : takesAction.getCardsIn(ZoneType.Hand)) {
                for (final KeywordInterface inst : c.getKeywords()) {
                    final String kw = inst.getOriginal();
                    if (!kw.startsWith("MayEffectFromOpeningHand")) {
                        continue;
                    }
                    final String[] split = kw.split(":");
                    if (split.length > 2 && split[2].equalsIgnoreCase("!PlayFirst") && first == takesAction) {
                        continue;
                    }
                    final SpellAbility effect = AbilityFactory.getAbility(c.getSVar(split[1]), c);
                    effect.setActivatingPlayer(takesAction);
                    usable.add(effect);
                }
            }
            if (!usable.isEmpty()) {
                usable = takesAction.getController().chooseSaToActivateFromOpeningHand(usable);
            }
            for (final SpellAbility sa : usable) {
                if (!takesAction.getZone(ZoneType.Hand).contains(sa.getHostCard())) {
                    continue;
                }
                takesAction.getController().playSpellAbilityNoStack(sa, true);
                if (sa.hasParam("BecomeStartingPlayer")) {
                    newFirst = takesAction;
                }
            }
            takesAction = g.getNextPlayerAfter(takesAction);
        } while (takesAction != first);
        return newFirst;
    }
}
