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
import forge.game.spellability.TargetRestrictions;
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
 *
 * <p><b>Amendment M63, decision D420: the battlefield, in a list of its own.</b>
 * {@link #activatable} asks the same question of the seat's own
 * <em>controlled</em> permanents -- loyalty abilities, equip, crew, a Clue's
 * "{2}, Sacrifice", any non-mana activated ability {@code canPlay()} allows now
 * -- for {@code state.activatable}.  It is a separate key so that
 * {@code state.playable}'s meaning (outside the battlefield) never changes for
 * the readers that already outline cards by it.
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

    /**
     * Amendment M63 (D420): every permanent {@code me} CONTROLS on the
     * battlefield with at least one non-mana ability Forge would activate on
     * a click right now ({@code getAllPossibleAbilities(me, true)}, each kept
     * only if {@code canPlay()}: a planeswalker's loyalty ability once a turn
     * at sorcery speed, an equip at sorcery speed, a Clue's sacrifice, a
     * Vehicle's crew), with those abilities -- and only when each target it
     * must choose has a candidate ({@link #targetsPossible}).  Mana is not predicted; mana
     * abilities are left out (they are paid with, never clicked for).  A card
     * whose abilities throw is skipped and counted on stderr.
     */
    public static List<Snap.Playable> activatable(final Player me) {
        Snap.assertGameThread("Playables.activatable");
        final List<Snap.Playable> out = new ArrayList<>();
        if (me == null) {
            return out;
        }
        for (final Card c : new ArrayList<>(me.getCardsIn(ZoneType.Battlefield))) {
            if (c.getController() != me) {
                continue;
            }
            final List<SpellAbilityView> views = new ArrayList<>();
            try {
                for (final SpellAbility sa : c.getAllPossibleAbilities(me, true)) {
                    if (sa != null && !sa.isManaAbility() && !sa.isSpell() && targetsPossible(c, sa)) {
                        views.add(sa.getView());
                    }
                }
            } catch (final RuntimeException e) {
                skipped++;
                System.err.println("ACTIVATABLE SKIPPED: card " + c.getId() + ": " + e.getClass().getSimpleName());
                continue;
            }
            if (!views.isEmpty()) {
                out.add(new Snap.Playable(c.getView(), "battlefield", views));
            }
        }
        return out;
    }

    /**
     * Amendment M69 (D427): the abilities on {@code me}'s own permanents that a
     * click must NOT activate on its own -- every ability
     * {@code getAllPossibleAbilities(me, true)} offers on a permanent {@code me}
     * controls, except a mana ability Forge can undo
     * ({@code SpellAbility.isUndoable()}: Forge's own undo predicate -- every
     * cost part undoable, i.e. a tap of a land; a Treasure's sacrifice or
     * Cadaverous Bloom's exile from hand is not).  {@code WireGuiGame}
     * answers a click on a permanent whose only ability is in this set with a
     * one-option {@code ability_menu} instead of activating it: Forge's
     * desktop activates a lone ability at once, and an exploratory click on
     * Carrion Feeder sacrificed it (2026-10-10).  Ids, so the click thread
     * (the EDT, where no view may be walked) reads nothing but integers.
     */
    public static java.util.Set<Integer> confirmFirst(final Player me) {
        Snap.assertGameThread("Playables.confirmFirst");
        final java.util.Set<Integer> out = new java.util.HashSet<>();
        if (me == null) {
            return out;
        }
        for (final Card c : new ArrayList<>(me.getCardsIn(ZoneType.Battlefield))) {
            if (c.getController() != me) {
                continue;
            }
            try {
                for (final SpellAbility sa : c.getAllPossibleAbilities(me, true)) {
                    if (sa != null && !(sa.isManaAbility() && sa.isUndoable())) {
                        out.add(Integer.valueOf(sa.getId()));
                    }
                }
            } catch (final RuntimeException e) {
                // A broken script must not take the snapshot down; its card
                // keeps Forge's own click (the shortcut), as before M69.
                System.err.println("CONFIRM-FIRST SKIPPED: card " + c.getId() + ": " + e.getClass().getSimpleName());
            }
        }
        return out;
    }

    /**
     * Can every part of {@code sa} that must target find a candidate now?
     * {@code canPlay()} does not ask (measured: Ancestral Blade's equip with no
     * creature in play was listed, and the click went nowhere), so a click
     * Forge would start and then cancel for want of a target is left out:
     * an equip with no creature, Jace's -1 with no creature.  An ability whose
     * targets are optional (minimum 0) stays.
     */
    private static boolean targetsPossible(final Card host, final SpellAbility sa) {
        for (SpellAbility part = sa; part != null; part = part.getSubAbility()) {
            if (!part.usesTargeting()) {
                continue;
            }
            final TargetRestrictions tr = part.getTargetRestrictions();
            if (tr != null && tr.getMinTargets(host, part) > 0 && !tr.hasCandidates(part)) {
                return false;
            }
        }
        return true;
    }

    /** How many permanents {@link #activatable} skipped because their abilities threw (this JVM). */
    private static int skipped;   // game thread only

    /** {@link #activatable}'s skip count, for a test or a log line. */
    public static int activatableSkipped() {
        return skipped;
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
