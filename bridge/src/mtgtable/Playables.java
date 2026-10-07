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
package mtgtable;

import java.util.ArrayList;
import java.util.List;

import forge.game.Game;
import forge.game.card.Card;
import forge.game.player.Player;
import forge.game.spellability.SpellAbility;
import forge.game.spellability.SpellAbilityView;
import forge.game.zone.ZoneType;

/**
 * <b>Amendment M61, decision D413: what the seat may play from outside the
 * battlefield, in the engine's own words.</b>
 *
 * <p>A click on a card at priority is {@code InputPassPriority.onCardSelected},
 * which asks {@code Card.getAllPossibleAbilities(player, true)} -- every spell
 * and ability of the card, alternative costs included (flashback, escape,
 * foretell...), each kept only if {@code SpellAbility.canPlay()}: its zone
 * (an {@code ActivationZone$ Graveyard} ability from the graveyard), its
 * timing, its restrictions and its non-mana costs
 * ({@code CostPayment.canPayAdditionalCosts}: Cauldron Familiar's "Sacrifice a
 * Food" with no Food is not playable).  Mana is not predicted, exactly as
 * Forge's own click does not predict it.  This class asks the same question
 * of the seat's own cards in the five zones a board cannot otherwise judge --
 * hand, graveyard, exile, command and the top of the library -- so the board
 * can outline Cauldron Familiar in the graveyard instead of guessing from
 * keywords.  The battlefield is left out: its cards were always clickable.
 *
 * <p><b>Game thread only</b>, like the snapshot it feeds: it reads the rules
 * engine's {@code Card}s.  {@code getAllPossibleAbilities} sets each ability's
 * activating player to the seat (as Forge's own click and its "actionable
 * highlights" do) and changes nothing else.  Never the opponent's cards: the
 * walk starts from the seat's own zones, and {@link Snap#state} gates every
 * entry again.
 */
public final class Playables {

    private Playables() { }

    /** The zones walked, in the order written; the library contributes its top card only. */
    private static final ZoneType[] ZONES = {
        ZoneType.Hand, ZoneType.Graveyard, ZoneType.Exile, ZoneType.Command, ZoneType.Library,
    };

    /**
     * Is {@code me} at its own priority in {@code game}, the moment
     * {@code state.playable} is about: the priority player, with nothing
     * resolving and the game not over.
     */
    public static boolean atPriority(final Game game, final Player me) {
        Snap.assertGameThread("Playables.atPriority");
        if (game == null || me == null || game.isGameOver() || game.getPhaseHandler() == null) {
            return false;
        }
        if (game.getPhaseHandler().getPriorityPlayer() != me) {
            return false;
        }
        return game.getStack() == null || !game.getStack().isResolving();
    }

    /**
     * Every card of {@code me}'s own in the five zones with at least one
     * playable, non-mana spell or ability right now, with those abilities.
     * A card whose abilities throw is left out (counted on stderr): a broken
     * card script must not take the snapshot down.
     */
    public static List<Snap.Playable> of(final Player me) {
        Snap.assertGameThread("Playables.of");
        final List<Snap.Playable> out = new ArrayList<>();
        if (me == null) {
            return out;
        }
        for (final ZoneType z : ZONES) {
            final List<Card> cards = new ArrayList<>();
            for (final Card c : me.getCardsIn(z)) {
                cards.add(c);
                if (z == ZoneType.Library) {
                    break;                     // the top card: the only one a "play from the top" effect plays
                }
            }
            for (final Card c : cards) {
                if (c.getOwner() != me) {
                    continue;
                }
                final List<SpellAbilityView> views = new ArrayList<>();
                try {
                    for (final SpellAbility sa : c.getAllPossibleAbilities(me, true)) {
                        if (sa != null && !sa.isManaAbility()) {
                            views.add(sa.getView());
                        }
                    }
                } catch (final RuntimeException e) {
                    System.err.println("PLAYABLE SKIPPED: card " + c.getId() + ": " + e.getClass().getSimpleName());
                    continue;
                }
                if (!views.isEmpty()) {
                    out.add(new Snap.Playable(c.getView(), wireZone(z), views));
                }
            }
        }
        return out;
    }

    private static String wireZone(final ZoneType z) {
        return switch (z) {
            case Hand -> "hand";
            case Graveyard -> "graveyard";
            case Exile -> "exile";
            case Command -> "command";
            default -> "library";
        };
    }
}
