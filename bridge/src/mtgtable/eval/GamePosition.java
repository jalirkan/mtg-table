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
package mtgtable.eval;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;

import com.google.common.collect.Multiset;

import forge.card.mana.ManaCost;
import forge.card.MagicColor;
import forge.game.Game;
import forge.game.GameEntity;
import forge.game.card.Card;
import forge.game.card.CounterType;
import forge.game.combat.AttackingBand;
import forge.game.combat.Combat;
import forge.game.keyword.Keyword;
import forge.game.keyword.KeywordInterface;
import forge.game.phase.PhaseHandler;
import forge.game.player.Player;
import forge.game.spellability.SpellAbilityStackInstance;
import forge.game.zone.ZoneType;

import mtgtable.eval.Position.Band;
import mtgtable.eval.Position.CardPos;
import mtgtable.eval.Position.PlayerPos;
import mtgtable.eval.Position.StackItem;

/**
 * A live Forge {@link Game} -> the {@link Position} ONE player sees: the same
 * fields a {@code state} frame redacted for that player would carry, read from
 * the engine's objects instead of its views (D316).
 *
 * <p><b>Only what the viewer legitimately knows.</b>  Every other player's hand
 * and every library -- the viewer's own included -- is read for its SIZE alone;
 * no card of them is touched.  A face-down card contributes its face-down body
 * (Forge's 2/2 face-down characteristic on the battlefield or the stack) and
 * never its real name, cost or keywords; a face-down card in exile is concealed
 * unless the viewer controls it, as {@code CardView.canBeShownTo} decides.  The
 * engine's own redaction rules live in {@code Snap}; this class does not call
 * them (it names no {@code CardView}, lint rule 5), it reproduces their outcome
 * for the fields the encoder reads, and {@code EvalLiveCheck} compares the two
 * on every decision of real games, plus a swap of the hidden zones that must
 * change nothing.
 *
 * <p>Threads: it reads engine objects, so call it where the game is not moving
 * -- on the game thread for a live game (inside a {@code PlayerController}
 * callback, as the search does), or on any thread for a copy nobody else runs.
 */
public final class GamePosition {

    private GamePosition() { }

    private static final byte[] MANA = {MagicColor.WHITE, MagicColor.BLUE, MagicColor.BLACK, MagicColor.RED,
        MagicColor.GREEN, MagicColor.COLORLESS};

    public static Position of(final Game game, final Player viewer) {
        final Position pos = new Position();
        final PhaseHandler ph = game.getPhaseHandler();
        pos.turn = ph.getTurn();
        pos.round = (pos.turn + 1) / 2;
        pos.phase = ph.getPhase() == null ? null : ph.getPhase().name();
        pos.activePlayer = ph.getPlayerTurn() == null ? null : ph.getPlayerTurn().getId();
        pos.priority = ph.getPriorityPlayer() == null ? null : ph.getPriorityPlayer().getId();
        pos.gameOver = game.isGameOver();
        final Combat combat = game.getCombat();

        for (final Player p : game.getPlayers()) {
            final PlayerPos pp = new PlayerPos();
            pp.id = p.getId();
            pp.life = p.getLife();
            int poison = 0;
            int other = 0;
            final Multiset<CounterType> counters = p.getCounters();
            if (counters != null) {
                for (final Multiset.Entry<CounterType> e : counters.entrySet()) {
                    if (e.getElement() == null) {
                        continue;
                    }
                    if ("POISON".equalsIgnoreCase(e.getElement().getName())) {
                        poison = e.getCount();
                    } else {
                        other += e.getCount();
                    }
                }
            }
            pp.poison = poison;
            pp.otherCounters = other;
            for (int c = 0; c < 6; c++) {
                pp.pool[c] = p.getManaPool().getAmountOfColor(MANA[c]);
            }
            pp.handCount = p.getZone(ZoneType.Hand).size();
            pp.libraryCount = p.getZone(ZoneType.Library).size();
            pp.graveyardCount = p.getZone(ZoneType.Graveyard).getCards(false).size();
            pp.exileCount = p.getZone(ZoneType.Exile).getCards(false).size();
            pp.commandCount = p.getZone(ZoneType.Command).getCards(false).size();
            if (p == viewer) {   // every other hand, and every library, is a size and nothing more
                for (final Card c : p.getZone(ZoneType.Hand).getCards(false)) {
                    pp.hand.add(card(c, viewer, combat, false));
                }
            }
            for (final Card c : p.getZone(ZoneType.Battlefield).getCards(false)) {
                pp.battlefield.add(card(c, viewer, combat, true));
            }
            for (final Card c : p.getZone(ZoneType.Graveyard).getCards(false)) {
                pp.graveyard.add(card(c, viewer, combat, false));
            }
            for (final Card c : p.getZone(ZoneType.Exile).getCards(false)) {
                pp.exile.add(c.isFaceDown() && c.getController() != viewer ? hidden(c) : card(c, viewer, combat, false));
            }
            pos.players.add(pp);
        }

        final Set<Integer> seen = new HashSet<>();
        for (final SpellAbilityStackInstance si : game.getStack()) {
            final Player act = si.getActivatingPlayer();
            pos.stack.add(new StackItem(act == null ? null : act.getId(), si.isAbility()));
        }
        for (final SpellAbilityStackInstance si : game.getStack()) {
            final Card src = si.getSourceCard();
            if (src == null || !seen.add(src.getId())) {
                continue;
            }
            final CardPos cp;
            if (concealedSource(src, viewer)) {
                cp = hidden(src);
            } else {
                cp = card(src, viewer, combat, src.isInZone(ZoneType.Battlefield) || src.isInZone(ZoneType.Stack)
                        || src.getZone() == null);
            }
            if (cp.controller == null && act(si) != null) {
                cp.controller = act(si).getId();
            }
            pos.stackCards.add(cp);
        }

        if (combat != null) {
            pos.combat = new ArrayList<>();
            for (final GameEntity defender : combat.getDefenders()) {
                for (final AttackingBand band : combat.getAttackingBandsOf(defender)) {
                    final Band b = new Band();
                    for (final Card a : band.getAttackers()) {
                        if (a != null) {
                            b.attackerIds.add(a.getId());
                        }
                    }
                    final Iterable<Card> blockers = combat.getBlockers(band);
                    if (blockers != null) {
                        for (final Card x : blockers) {
                            if (x != null) {
                                b.blockerIds.add(x.getId());
                            }
                        }
                    }
                    pos.combat.add(b);
                }
            }
        }
        return pos;
    }

    private static Player act(final SpellAbilityStackInstance si) {
        return si.getActivatingPlayer();
    }

    /**
     * A stack item's source the viewer may not see: one sitting in a hand or a
     * library that is not the viewer's own hand (a trigger from a hidden card),
     * or a face-down card in exile the viewer does not control.
     */
    private static boolean concealedSource(final Card c, final Player viewer) {
        if (c.isInZone(ZoneType.Library)) {
            return true;
        }
        if (c.isInZone(ZoneType.Hand)) {
            return c.getOwner() != viewer;
        }
        if (c.isInZone(ZoneType.Exile)) {
            return c.isFaceDown() && c.getController() != viewer;
        }
        return false;
    }

    private static CardPos hidden(final Card c) {
        final CardPos cp = new CardPos();
        cp.id = c.getId();
        cp.hidden = true;
        cp.controller = c.getController() == null ? (c.getOwner() == null ? null : c.getOwner().getId())
                : c.getController().getId();
        return cp;
    }

    /**
     * A card the viewer may see, as {@code Snap.card} would write it for the
     * fields the encoder reads.  {@code bodyPublic}: a face-down card shows its
     * face-down body only on the battlefield and the stack.
     */
    static CardPos card(final Card c, final Player viewer, final Combat combat, final boolean inPlay) {
        final CardPos cp = new CardPos();
        cp.id = c.getId();
        final Player ctrl = c.getController() != null ? c.getController() : c.getOwner();
        cp.controller = ctrl == null ? null : ctrl.getId();
        final boolean faceDown = c.isFaceDown();
        final boolean bodyPublic = !faceDown || inPlay;
        cp.faceDown = faceDown;
        cp.name = faceDown ? "" : nz(c.getName());
        if (bodyPublic) {
            cp.types = c.getType() == null ? "" : c.getType().toString();
        }
        if (!faceDown) {
            final ManaCost mc = c.getCurrentState().getPerpetualAdjustedManaCost();
            cp.manaCost = mc == null || mc.isNoCost() ? null : mc.toString();
        }
        final boolean creature = c.isCreature();
        if (bodyPublic && creature) {
            cp.power = Integer.toString(c.getNetPower());
            cp.toughness = Integer.toString(c.getNetToughness());
        }
        if (!faceDown && c.isPlaneswalker() && c.isInZone(ZoneType.Battlefield)) {
            cp.loyalty = Integer.toString(c.getCurrentLoyalty());
        }
        if (!faceDown) {
            for (final KeywordInterface ki : c.getKeywords()) {
                final Keyword k = ki == null ? null : ki.getKeyword();
                if (k != null && k != Keyword.UNDEFINED && !cp.keywords.contains(k.name())) {
                    cp.keywords.add(k.name());
                }
            }
        }
        cp.damage = c.getDamage();
        final Multiset<CounterType> counters = c.getCounters();
        if (counters != null) {
            for (final Multiset.Entry<CounterType> e : counters.entrySet()) {
                if (e.getElement() != null) {
                    cp.counters.merge(e.getElement().getName(), e.getCount(), Integer::sum);
                }
            }
        }
        cp.tapped = c.isTapped();
        cp.sick = c.isInZone(ZoneType.Battlefield) && creature && c.hasSickness();
        cp.attacking = combat != null && combat.isAttacking(c);
        cp.blocking = combat != null && combat.isBlocking(c);
        cp.token = c.isToken();
        cp.attached = c.getAttachedTo() != null;
        return cp;
    }

    private static String nz(final String s) {
        return s == null ? "" : s;
    }
}
