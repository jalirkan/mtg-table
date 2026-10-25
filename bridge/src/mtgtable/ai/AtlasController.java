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

import java.util.Collection;
import java.util.List;
import java.util.Map;

import forge.LobbyPlayer;
import forge.card.ColorSet;
import forge.game.Game;
import forge.game.GameEntity;
import forge.game.card.Card;
import forge.game.card.CardCollection;
import forge.game.card.CardCollectionView;
import forge.game.combat.Combat;
import forge.game.cost.CostPart;
import forge.game.player.DelayedReveal;
import forge.game.player.Player;
import forge.game.player.PlayerActionConfirmMode;
import forge.game.player.PlayerController;
import forge.game.replacement.ReplacementEffect;
import forge.game.spellability.AbilitySub;
import forge.game.spellability.SpellAbility;
import forge.game.trigger.WrappedAbility;
import forge.game.zone.ZoneType;
import forge.util.collect.FCollectionView;

/**
 * A seat in one of the move atlas's branch games (D451): its FIRST answer to
 * one question is forced -- the option being played out, as in a search
 * rollout ({@link RolloutController}) -- and after that it is our controller
 * with whatever policy the branch's continuation names: Forge's own AI, or the
 * random seat ({@link Explorer} with {@link ExploreMath.Config#randomSeat}),
 * with an observing search ({@code observe=1}) so its decisions become rows.
 * A seat Forge pilots carries the pay cap ({@link PayCap}, D465).
 *
 * <p>D484: every seat carries a {@link DecisionClock}, armed by
 * {@code Atlas.play} with the branch's deadline: each decision callback below
 * reads it first ({@link #due}), and the seat's decision records go through its
 * repeat cap, so a question Forge re-asks forever without firing an event ends
 * the branch as a timeout instead of holding the worker until the unit's
 * watchdog.
 */
final class AtlasController extends PolicyControllerAi implements RolloutForcing {

    private final RolloutController.Forced forced = new RolloutController.Forced();
    /** D484: the branch's deadline at every decision, and the repeated-record cap. */
    private final DecisionClock clock = new DecisionClock();

    AtlasController(final Game game, final Player p, final LobbyPlayer lp, final SearchConfig observe) {
        super(game, p, lp, null, observe);
        enablePayCap(PayCap.LIMIT);   // D465: Forge's refused plays, capped (a random seat has G5 instead)
    }

    /** D484: the branch's deadline (System.nanoTime()), read at every decision from now on. */
    void arm(final long deadlineNanos) {
        clock.arm(deadlineNanos);
    }

    /** D484: the branch's loop is over. */
    void disarm() {
        clock.disarm();
    }

    /** D484: throw {@link Atlas.BranchTimeout} when the branch's deadline has passed. */
    private void due(final String ask) {
        clock.due(ask);
    }

    /** D484: the seat's recorder, behind the repeated-record cap. */
    @Override
    public void setDecisionSink(final DecisionSink sink) {
        super.setDecisionSink(clock.capping(sink));
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

    /** D470: why the forced combat answer can no longer be given in {@code copy}, or null. */
    String expired(final Game copy) {
        return forced.expired(copy);
    }

    @Override
    public List<SpellAbility> chooseSpellAbilityToPlay() {
        due("chooseSpellAbilityToPlay");
        if (forced.takePriority(getGame())) {
            return forced.priorityAnswer();
        }
        return super.chooseSpellAbilityToPlay();
    }

    @Override
    public void declareAttackers(final Player attacker, final Combat combat) {
        due("declareAttackers");
        if (forced.attackers(combat, getGame())) {
            return;
        }
        super.declareAttackers(attacker, combat);
    }

    @Override
    public void declareBlockers(final Player defender, final Combat combat) {
        due("declareBlockers");
        if (forced.blockers(combat, getGame())) {
            return;
        }
        super.declareBlockers(defender, combat);
    }

    // D484: the other decision callbacks Forge can ask again: the deadline first, then the seat's own answer.

    @Override
    public boolean mulliganKeepHand(final Player firstPlayer, final int cardsToReturn) {
        due("mulliganKeepHand");
        return super.mulliganKeepHand(firstPlayer, cardsToReturn);
    }

    @Override
    public <T extends GameEntity> T chooseSingleEntityForEffect(final FCollectionView<T> optionList,
            final DelayedReveal delayedReveal, final SpellAbility sa, final String title, final boolean isOptional,
            final Player targetedPlayer, final Map<String, Object> params) {
        due("chooseSingleEntityForEffect");
        return super.chooseSingleEntityForEffect(optionList, delayedReveal, sa, title, isOptional, targetedPlayer,
                params);
    }

    @Override
    public <T extends GameEntity> List<T> chooseEntitiesForEffect(final FCollectionView<T> optionList, final int min,
            final int max, final DelayedReveal delayedReveal, final SpellAbility sa, final String title,
            final Player targetedPlayer, final Map<String, Object> params) {
        due("chooseEntitiesForEffect");
        return super.chooseEntitiesForEffect(optionList, min, max, delayedReveal, sa, title, targetedPlayer, params);
    }

    @Override
    public CardCollectionView chooseCardsForEffect(final CardCollectionView sourceList, final SpellAbility sa,
            final String title, final int min, final int max, final boolean isOptional, final Map<String, Object> params) {
        due("chooseCardsForEffect");
        return super.chooseCardsForEffect(sourceList, sa, title, min, max, isOptional, params);
    }

    @Override
    public SpellAbility chooseSingleSpellForEffect(final List<SpellAbility> spells, final SpellAbility sa,
            final String title, final Map<String, Object> params) {
        due("chooseSingleSpellForEffect");
        return super.chooseSingleSpellForEffect(spells, sa, title, params);
    }

    @Override
    public List<SpellAbility> chooseSpellAbilitiesForEffect(final List<SpellAbility> spells, final SpellAbility sa,
            final String title, final int num, final Map<String, Object> params) {
        due("chooseSpellAbilitiesForEffect");
        return super.chooseSpellAbilitiesForEffect(spells, sa, title, num, params);
    }

    @Override
    public boolean confirmAction(final SpellAbility sa, final PlayerActionConfirmMode mode, final String message,
            final List<String> options, final Card cardToShow, final Map<String, Object> params) {
        due("confirmAction");
        return super.confirmAction(sa, mode, message, options, cardToShow, params);
    }

    @Override
    public boolean confirmTrigger(final WrappedAbility wrapper) {
        due("confirmTrigger");
        return super.confirmTrigger(wrapper);
    }

    @Override
    public boolean confirmPayment(final CostPart costPart, final String string, final SpellAbility sa) {
        due("confirmPayment");
        return super.confirmPayment(costPart, string, sa);
    }

    @Override
    public boolean confirmReplacementEffect(final ReplacementEffect replacementEffect, final SpellAbility effectSA,
            final GameEntity affected, final String question) {
        due("confirmReplacementEffect");
        return super.confirmReplacementEffect(replacementEffect, effectSA, affected, question);
    }

    @Override
    public boolean playTrigger(final Card host, final WrappedAbility wrapperAbility, final boolean isMandatory) {
        due("playTrigger");
        return super.playTrigger(host, wrapperAbility, isMandatory);
    }

    @Override
    public boolean chooseTargetsFor(final SpellAbility currentAbility) {
        due("chooseTargetsFor");
        return super.chooseTargetsFor(currentAbility);
    }

    @Override
    public boolean playChosenSpellAbility(final SpellAbility sa) {
        due("playChosenSpellAbility");
        return super.playChosenSpellAbility(sa);
    }

    @Override
    public int chooseNumber(final SpellAbility sa, final String title, final int min, final int max,
            final Map<String, Object> params) {
        due("chooseNumber");
        return super.chooseNumber(sa, title, min, max, params);
    }

    @Override
    public boolean chooseBinary(final SpellAbility sa, final String question,
            final PlayerController.BinaryChoiceType kindOfChoice, final Map<String, Object> params) {
        due("chooseBinary");
        return super.chooseBinary(sa, question, kindOfChoice, params);
    }

    @Override
    public byte chooseColor(final String message, final SpellAbility sa, final ColorSet colors) {
        due("chooseColor");
        return super.chooseColor(message, sa, colors);
    }

    @Override
    public String chooseSomeType(final String kindOfType, final SpellAbility sa, final Collection<String> validTypes,
            final boolean isOptional) {
        due("chooseSomeType");
        return super.chooseSomeType(kindOfType, sa, validTypes, isOptional);
    }

    @Override
    public List<AbilitySub> chooseModeForAbility(final SpellAbility sa, final List<AbilitySub> possible, final int min,
            final int num, final boolean allowRepeat) {
        due("chooseModeForAbility");
        return super.chooseModeForAbility(sa, possible, min, num, allowRepeat);
    }

    @Override
    public Card chooseSingleCardForZoneChange(final ZoneType destination, final List<ZoneType> origin,
            final SpellAbility sa, final CardCollection fetchList, final DelayedReveal delayedReveal,
            final String selectPrompt, final boolean isOptional, final Player decider) {
        due("chooseSingleCardForZoneChange");
        return super.chooseSingleCardForZoneChange(destination, origin, sa, fetchList, delayedReveal, selectPrompt,
                isOptional, decider);
    }

    @Override
    public List<Card> chooseCardsForZoneChange(final ZoneType destination, final List<ZoneType> origin,
            final SpellAbility sa, final CardCollection fetchList, final int min, final int max,
            final DelayedReveal delayedReveal, final String selectPrompt, final Player decider) {
        due("chooseCardsForZoneChange");
        return super.chooseCardsForZoneChange(destination, origin, sa, fetchList, min, max, delayedReveal,
                selectPrompt, decider);
    }

    @Override
    public ReplacementEffect chooseSingleReplacementEffect(final List<ReplacementEffect> possibleReplacers) {
        due("chooseSingleReplacementEffect");
        return super.chooseSingleReplacementEffect(possibleReplacers);
    }
}
