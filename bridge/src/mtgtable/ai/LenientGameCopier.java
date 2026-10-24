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
import java.util.HashMap;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import forge.ai.simulation.GameCopier;
import forge.card.GamePieceType;
import forge.game.Game;
import forge.game.GameObject;
import forge.game.card.Card;
import forge.game.card.CardCopyService;
import forge.game.phase.PhaseType;
import forge.game.player.Player;
import forge.game.replacement.ReplacementEffect;
import forge.game.spellability.SpellAbility;
import forge.game.trigger.Trigger;
import forge.game.zone.ZoneType;

/**
 * Forge's {@link GameCopier} with the one failure that ends simulated cube
 * games worked around (D313).
 *
 * <p><b>The failure.</b> {@code GameCopier.makeCopy} copies the cards of seven
 * zones (battlefield, hand, graveyard, library, exile, stack, command) and then
 * re-maps every live {@code StaticEffect} of the original game onto the copy
 * ({@code StaticEffect.removeMapped}), which maps the effect's source and every
 * card it affects through {@link #find}.  A static ability that works in every
 * zone -- a characteristic-defining ability (Tarmogoyf's P/T), Grist's "isn't a
 * planeswalker unless on the battlefield", Anax's, Hero of Light's -- also
 * affects that card while it sits in the <b>sideboard</b>, a zone the copier
 * never copies; {@code find} then throws {@code Couldn't map <card>}.  A Forge
 * built cube deck has fifteen-odd sideboard cards, so this happens in most cube
 * games (D311: 15 of 20 games under Forge's own full simulation).
 *
 * <p><b>The workaround.</b> While the copy is being made, a card the copier did
 * not copy and that sits in a zone it never copies (or in no zone at all) maps
 * to a throwaway stand-in card that belongs to the copy and lives in no zone.
 * {@code removeMapped} only strips the effect's layers from the cards it maps
 * (and the copy re-applies every static itself in {@code checkStateEffects}),
 * so stripping them from a stand-in is a no-op: the copy is the game it would
 * have been had the sideboard not been affected.  Cards in the seven copied
 * zones still go through Forge's own strict lookup first (one that fails all
 * the same -- a token the zone's listing skips -- gets a stand-in too, marked
 * {@code ?} in {@link #unmappedNames}), and after the copy is made every lookup
 * is strict again.  Every stand-in is counted ({@link #unmapped}),
 * and the bench reports the rate.
 *
 * <p><b>A stale effect card maps to nothing</b> (D474).  A player who loses
 * the monarch (or the initiative, ...) keeps its effect card in a field after
 * {@code Zone.remove} has taken it out of the command zone -- and the card
 * still names that zone ({@code Zone.remove} never clears it).
 * {@code Player.copyEffectCardsToSnapshot} maps the field unless the card is
 * in no zone; the strict lookup fails on it, and a stand-in -- a card with no
 * owner and no triggers -- became the copied player's effect card.  When that
 * player became the monarch again in the copy, {@code createMonarchEffect}
 * put the stand-in into the command zone and the view's flashback scan threw
 * {@code NullPointerException} on its null controller (J161's d41).  Such a
 * card maps to null: the field stays unset and the copy makes a fresh effect
 * when it needs one, which is what {@code mapEffectCard} does for an effect
 * in no zone.
 *
 * <p><b>What the copy carries after it is made</b> (D479, amending D313).
 * {@code GameCopier} builds an effect card (and any other card it cannot
 * rebuild from a paper card) from its name, type, static and spell abilities
 * only, sets an effect source only on the battlefield, and drops every
 * "exiled with" link ({@code // TODO ExiledWith}).  On a fork that left a
 * copied effect with no triggers (The Monarch drew nothing), no replacement
 * effects (Gideon's "prevent all damage dealt to him" prevented nothing) and a
 * null source, and a card on an adventure was not on one.  After Forge's copy
 * is made, {@link #carry} gives each copied card what its original has, with
 * every object it names mapped onto the copy:
 * <ul>
 *   <li>its game and layer timestamps (Forge sets them on the battlefield only);</li>
 *   <li>for a card built from its traits: its SVars, triggers and replacement
 *       effects ({@code copy(host, true)}, as Forge copies its statics), except a
 *       trigger that holds game objects of its own, which is left out and counted;</li>
 *   <li>its effect source ({@link #effectSourceNull} counts an effect card whose
 *       source the copy cannot name);</li>
 *   <li>its exile link: the card it was exiled with and the player who exiled it,
 *       and, for a host, the cards exiled with it ({@link #exileLinksLost}).</li>
 * </ul>
 * A linked object that is the card a copied zone holds maps to that card's
 * copy.  One that is an older object of the same card (a spell's object on the
 * stack, which an adventure's link and an effect's source both name after it
 * resolved) maps to a <i>mirror</i>: a copy, in no zone, of the copied card with
 * that id, turned to the old object's face and given its timestamps -- what the
 * original game holds too.  A card the copy holds under no such id maps to
 * nothing and is counted.
 */
public final class LenientGameCopier extends GameCopier {

    /** The zones {@code GameCopier} copies (its private {@code ZONES}, 2.0.14). */
    static final Set<ZoneType> COPIED = Set.of(ZoneType.Battlefield, ZoneType.Hand, ZoneType.Graveyard,
            ZoneType.Library, ZoneType.Exile, ZoneType.Stack, ZoneType.Command);

    private boolean copying;
    private final Map<Card, Card> standIns = new HashMap<>();
    private final List<String> unmappedNames = new ArrayList<>();
    private final List<String> staleEffects = new ArrayList<>();
    /** D479: older objects of a copied card, by the original object, each mirrored once per copy. */
    private final Map<Card, Card> mirrors = new IdentityHashMap<>();
    private final List<String> effectSourceNull = new ArrayList<>();
    private final List<String> exileLinksLost = new ArrayList<>();
    private final List<String> traitsLeft = new ArrayList<>();
    private int traitsCarried;
    private int linksCarried;

    public LenientGameCopier(final Game origGame) {
        super(origGame);
    }

    /** How many cards were mapped to a stand-in while copying. */
    public int unmapped() {
        return standIns.size();
    }

    /** Their names and zones, for the bench's log (the AI's own knowledge: its sideboard, or a public card). */
    public List<String> unmappedNames() {
        return unmappedNames;
    }

    /** D474: the effect cards a player still held out of their zone, mapped to nothing (name@zone). */
    public List<String> staleEffects() {
        return staleEffects;
    }

    /** D479: the effect cards whose original names a source the copy could not map (name &lt;- source). */
    public List<String> effectSourceNull() {
        return effectSourceNull;
    }

    /** D479: the exile links the copy could not map: a card's "exiled with", or a host's exiled card. */
    public List<String> exileLinksLost() {
        return exileLinksLost;
    }

    /** D479: the triggers left off a copied card because they hold game objects of their own. */
    public List<String> traitsLeft() {
        return traitsLeft;
    }

    /** D479: how many triggers and replacement effects the carry pass copied onto cards built from their traits. */
    public int traitsCarried() {
        return traitsCarried;
    }

    /** D479: how many effect sources and exile links the carry pass set on the copy. */
    public int linksCarried() {
        return linksCarried;
    }

    /**
     * The copy, then (D479) {@link #carry}.  No caller advances the copy to a
     * phase, and the carry pass must run before anything is played on it, so
     * {@code advanceToPhase} must be null.
     */
    @Override
    public Game makeCopy(final PhaseType advanceToPhase, final Player aiPlayer) {
        if (advanceToPhase != null) {
            throw new IllegalArgumentException("LenientGameCopier copies the game as it stands (D479): advanceToPhase must be null");
        }
        final Game copy;
        copying = true;
        try {
            copy = super.makeCopy(null, aiPlayer);
        } finally {
            copying = false;
        }
        carry(copy);
        return copy;
    }

    /**
     * D479: what {@code GameCopier} leaves off a copied card, set after every
     * card of the copy exists (a link may name any of them).  Then the copy's
     * statics are applied again (a static may read an effect's source) and its
     * active triggers collected again (the carried ones among them).
     */
    private void carry(final Game copy) {
        final Map<Card, Card> live = new IdentityHashMap<>();   // an original card object -> its copy
        final Map<Integer, Card> byId = new HashMap<>();
        for (final Card c : copy.getCardsInGame()) {
            final GameObject o = reverseFind(c);
            if (o instanceof Card) {
                live.put((Card) o, c);
            }
            byId.put(c.getId(), c);
        }
        final int carriedBefore = traitsCarried + linksCarried;
        for (final Map.Entry<Card, Card> e : live.entrySet()) {
            final Card o = e.getKey();
            final Card c = e.getValue();
            c.setGameTimestamp(o.getGameTimestamp());
            c.setLayerTimestamp(o.getLayerTimestamp());
            if (builtFromTraits(o)) {
                carryTraits(o, c);
            }
            final Card src = o.getEffectSource();
            if (src != null && c.getEffectSource() == null) {
                final Card m = link(src, live, byId);
                if (m != null) {
                    c.setEffectSource(m);
                    linksCarried++;
                } else if (o.getGamePieceType() == GamePieceType.EFFECT) {
                    effectSourceNull.add(o.getName() + " <- " + src.getName());
                }
            }
            final Card with = o.getExiledWith();
            if (with != null) {
                final Card m = link(with, live, byId);
                if (m != null) {
                    c.setExiledWith(m);
                    c.setExiledBy(o.getExiledBy() == null ? null : (Player) find(o.getExiledBy()));
                    linksCarried++;
                } else {
                    exileLinksLost.add(o.getName() + " exiled with " + with.getName());
                }
            }
            for (final Card x : o.getExiledCards()) {
                Card m = live.get(x);
                if (m == null) {
                    m = byId.get(x.getId());   // the host's list compares by id, as Forge's equals does
                }
                if (m != null) {
                    c.addExiledCard(m);
                    linksCarried++;
                } else {
                    exileLinksLost.add(x.getName() + " exiled with host " + o.getName());
                }
            }
        }
        if (traitsCarried + linksCarried > carriedBefore) {
            copy.getAction().checkStaticAbilities();
            copy.getTriggerHandler().resetActiveTriggers();
        }
    }

    /** The cards {@code GameCopier.createCardCopy} builds from name, type, statics and spells (2.0.14). */
    private static boolean builtFromTraits(final Card o) {
        return o.isImmutable() || (!o.isToken() && o.getPaperCard() == null);
    }

    private void carryTraits(final Card o, final Card c) {
        if (c.getSVars().isEmpty() && !o.getSVars().isEmpty()) {
            c.setSVars(o.getSVars());
        }
        if (c.getTriggers().isEmpty()) {
            for (final Trigger t : o.getTriggers()) {
                if (!t.getTriggerRemembered().isEmpty() || t.getSpawningAbility() != null) {
                    traitsLeft.add(o.getName() + ": " + t);   // its own objects are the original game's
                    continue;
                }
                final Trigger tc = t.copy(c, true);
                ownActivator(tc.getOverridingAbility());
                c.addTrigger(tc);
                traitsCarried++;
            }
        }
        if (c.getReplacementEffects().isEmpty()) {
            for (final ReplacementEffect r : o.getReplacementEffects()) {
                final ReplacementEffect rc = r.copy(c, true);
                ownActivator(rc.getOverridingAbility());
                c.addReplacementEffect(rc);
                traitsCarried++;
            }
        }
    }

    /** A copied ability keeps its activating player; the copy's own player replaces the original's. */
    private void ownActivator(final SpellAbility sa) {
        if (sa != null && sa.getActivatingPlayer() != null && sa.getActivatingPlayer().getGame() != getCopiedGame()) {
            sa.setActivatingPlayer((Player) find(sa.getActivatingPlayer()));
        }
    }

    /**
     * The copy's object for {@code o}, a card named by another card's link: the
     * copy of the card a copied zone holds as {@code o}, else a mirror of the
     * copied card with {@code o}'s id (null when there is none).
     */
    private Card link(final Card o, final Map<Card, Card> live, final Map<Integer, Card> byId) {
        final Card same = live.get(o);
        if (same != null) {
            return same;
        }
        final Card done = mirrors.get(o);
        if (done != null) {
            return done;
        }
        final Card base = byId.get(o.getId());
        if (base == null) {
            return null;
        }
        final Card mirror = new CardCopyService(base).copyCard(false);
        if (mirror.hasState(o.getCurrentStateName())) {
            mirror.setState(o.getCurrentStateName(), true);
        }
        mirror.setGameTimestamp(o.getGameTimestamp());
        mirror.setLayerTimestamp(o.getLayerTimestamp());
        mirrors.put(o, mirror);
        return mirror;
    }

    @Override
    public GameObject find(final GameObject o) {
        if (copying && o instanceof Card) {
            final Card c = (Card) o;
            final ZoneType z = c.getZone() == null ? null : c.getZone().getZoneType();
            if (z == null || !COPIED.contains(z)) {
                return standIn(c, String.valueOf(z));
            }
            if (z == ZoneType.Command && c.getGamePieceType() == GamePieceType.EFFECT && !c.getZone().contains(c)) {
                // D474: an effect card its zone no longer holds is in no zone -- not part of the copy
                staleEffects.add(c.getName() + "@" + z);
                return null;
            }
            try {
                return super.find(o);
            } catch (final RuntimeException e) {
                // A card in a copied zone that the copier still did not copy: the
                // bench met a Bird token (11 of 5,017 searched decisions before
                // this branch) -- a card the zone's getCardsIn does not list, as a
                // phased-out permanent is not.  The same stand-in, counted apart.
                if (!String.valueOf(e.getMessage()).startsWith("Couldn't map")) {
                    throw e;
                }
                return standIn(c, z + "?");
            }
        }
        return super.find(o);
    }

    private Card standIn(final Card c, final String where) {
        return standIns.computeIfAbsent(c, k -> {
            unmappedNames.add(k.getName() + "@" + where);
            return new Card(k.getId(), k.getPaperCard(), getCopiedGame());
        });
    }
}
