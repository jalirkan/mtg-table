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
import forge.game.card.CardCollection;
import forge.game.card.CardCollectionView;
import forge.game.combat.Combat;
import forge.game.player.DelayedReveal;
import forge.game.player.Player;
import forge.game.spellability.SpellAbility;
import forge.game.zone.ZoneType;
import forge.util.collect.FCollectionView;

/**
 * The search hint's line (D454): {@link RolloutController} -- the forced first
 * answer, then Forge's Default AI -- that also tells a {@link LineRecorder}
 * what it answered, from the forced answer until the seat hands priority back.
 * Every answer is Forge's own (each override calls {@code super} and only
 * looks at the result), so a recorded playout plays exactly as an unrecorded
 * one.  Only {@link SearchPolicy#playout} with {@code Limits.line} set makes
 * one; the search never does.
 */
final class RecordingController extends RolloutController {

    private final LineRecorder line;

    RecordingController(final Game game, final Player p, final LobbyPlayer lp, final LineRecorder line) {
        super(game, p, lp);
        this.line = line;
    }

    @Override
    public List<SpellAbility> chooseSpellAbilityToPlay() {
        final boolean before = forcedUsed();
        final List<SpellAbility> r = super.chooseSpellAbilityToPlay();
        if (!before && forcedUsed()) {
            line.start('p', getGame(), getPlayer());
        }
        if (r == null || r.isEmpty()) {
            line.passed(getGame(), this);
        }
        return r;
    }

    @Override
    public boolean playChosenSpellAbility(final SpellAbility sa) {
        final boolean ok = super.playChosenSpellAbility(sa);
        line.played(sa, getGame());
        return ok;
    }

    @Override
    public void orderAndPlaySimultaneousSa(final List<SpellAbility> sas) {
        super.orderAndPlaySimultaneousSa(sas);
        line.triggers(sas);
    }

    @Override
    public void declareAttackers(final Player attacker, final Combat combat) {
        final boolean before = forcedUsed();
        super.declareAttackers(attacker, combat);
        if (!before && forcedUsed()) {
            line.start('a', getGame(), getPlayer());
        }
    }

    @Override
    public void declareBlockers(final Player defender, final Combat combat) {
        final boolean before = forcedUsed();
        super.declareBlockers(defender, combat);
        if (!before && forcedUsed()) {
            line.start('b', getGame(), getPlayer());
        }
    }

    @Override
    public <T extends GameEntity> T chooseSingleEntityForEffect(final FCollectionView<T> options, final DelayedReveal reveal,
            final SpellAbility sa, final String title, final boolean optional, final Player targeted,
            final Map<String, Object> params) {
        final T r = super.chooseSingleEntityForEffect(options, reveal, sa, title, optional, targeted, params);
        line.chose("choose", r, getGame());
        return r;
    }

    @Override
    public <T extends GameEntity> List<T> chooseEntitiesForEffect(final FCollectionView<T> options, final int min, final int max,
            final DelayedReveal reveal, final SpellAbility sa, final String title, final Player targeted,
            final Map<String, Object> params) {
        final List<T> r = super.chooseEntitiesForEffect(options, min, max, reveal, sa, title, targeted, params);
        line.chose("choose", r, getGame());
        return r;
    }

    @Override
    public CardCollectionView chooseCardsForEffect(final CardCollectionView sourceList, final SpellAbility sa, final String title,
            final int min, final int max, final boolean isOptional, final Map<String, Object> params) {
        final CardCollectionView r = super.chooseCardsForEffect(sourceList, sa, title, min, max, isOptional, params);
        line.chose("choose", r, getGame());
        return r;
    }

    @Override
    public CardCollectionView choosePermanentsToSacrifice(final SpellAbility sa, final int min, final int max,
            final CardCollectionView valid, final String message) {
        final CardCollectionView r = super.choosePermanentsToSacrifice(sa, min, max, valid, message);
        line.chose("sacrifice", r, getGame());
        return r;
    }

    @Override
    public CardCollection chooseCardsToDiscardFrom(final Player playerDiscard, final SpellAbility sa, final CardCollection validCards,
            final int min, final int max, final CardCollectionView unused) {
        final CardCollection r = super.chooseCardsToDiscardFrom(playerDiscard, sa, validCards, min, max, unused);
        line.chose("discard", r, getGame());
        return r;
    }

    @Override
    public Card chooseSingleCardForZoneChange(final ZoneType destination, final List<ZoneType> origin, final SpellAbility sa,
            final CardCollection fetchList, final DelayedReveal reveal, final String title, final boolean optional,
            final Player decider) {
        final Card r = super.chooseSingleCardForZoneChange(destination, origin, sa, fetchList, reveal, title, optional, decider);
        line.chose("choose", r, getGame());
        return r;
    }

    @Override
    public int chooseNumber(final SpellAbility sa, final String title, final int min, final int max) {
        final int r = super.chooseNumber(sa, title, min, max);
        line.number(r, getGame());
        return r;
    }

    @Override
    public int chooseNumber(final SpellAbility sa, final String title, final int min, final int max,
            final Map<String, Object> params) {
        final int r = super.chooseNumber(sa, title, min, max, params);
        line.number(r, getGame());
        return r;
    }
}
