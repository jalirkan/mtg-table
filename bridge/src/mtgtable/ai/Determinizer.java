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
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Random;

import forge.game.Game;
import forge.game.card.Card;
import forge.game.player.Player;
import forge.game.zone.ZoneType;

/**
 * Redeals what the searching AI cannot see, on a COPY of the game (D312).
 *
 * <p><b>What the AI is allowed to know.</b>
 * <ul>
 * <li>Everything public: both battlefields, graveyards, face-up exile, the
 *     stack, the command zone, life, counters, mana, the turn and phase.</li>
 * <li>Its own hand.</li>
 * <li>Its own decklist, so the multiset of its own library (but not its order:
 *     the copy's own library is shuffled too).</li>
 * <li><b>The opponent's decklist</b> (the owner's ruling: in a cube the pool is
 *     known, and a constructed list is what the AI would read off a table).
 *     That list minus the opponent's public cards is exactly the multiset of
 *     the opponent's hand <i>plus</i> library -- so the AI may know that
 *     multiset, and nothing more.</li>
 * </ul>
 * <b>What it is not allowed to know</b>: which of those cards are in the
 * opponent's hand and which in the library, and the library's order.  So the
 * copy's opponent hand and library are pooled, put in a canonical order that
 * depends only on the multiset (card name, then id), shuffled with the
 * search's own random source, and dealt back: as many cards to the hand as the
 * hand held (a public number), the rest to the library.  The result is a
 * function of (the multiset, the hand size, the random source) alone; the
 * self-test holds that two games which differ only in the split and order give
 * byte-identical determinizations.  This forgets things the AI could know (a
 * card the opponent returned to hand in public, a card a tutor revealed), which
 * is the safe direction.
 *
 * <p><b>Known limit.</b> A face-down card of the opponent's (morph, manifest,
 * disguise, foretell, a hidden exile) keeps its real identity in the copy, as
 * Forge's copier makes it; the search does not turn it face up, but a rollout
 * in which it is turned up plays the real card.  {@link #hiddenFaceDown} counts
 * them so the bench can say how often that happens.
 */
public final class Determinizer {

    private Determinizer() { }

    private static final Comparator<Card> CANONICAL =
            Comparator.comparing((Card c) -> c.getName()).thenComparingInt(c -> c.getId());

    /**
     * Redeal the opponents' hand and library and shuffle the AI's own library,
     * in place, on {@code copy}; {@code aiInCopy} is the searching seat.
     */
    public static void determinize(final Game copy, final Player aiInCopy, final Random rng) {
        for (final Player p : copy.getPlayers()) {
            if (p == aiInCopy) {
                final List<Card> lib = new ArrayList<>(p.getZone(ZoneType.Library).getCards());
                lib.sort(CANONICAL);
                Collections.shuffle(lib, rng);
                p.getZone(ZoneType.Library).setCards(lib);
                continue;
            }
            final int handSize = p.getZone(ZoneType.Hand).size();
            final List<Card> pool = new ArrayList<>(handSize + p.getZone(ZoneType.Library).size());
            pool.addAll(p.getZone(ZoneType.Hand).getCards());
            pool.addAll(p.getZone(ZoneType.Library).getCards());
            pool.sort(CANONICAL);
            Collections.shuffle(pool, rng);
            p.getZone(ZoneType.Hand).setCards(new ArrayList<>(pool.subList(0, handSize)));
            p.getZone(ZoneType.Library).setCards(new ArrayList<>(pool.subList(handSize, pool.size())));
        }
    }

    /** The opponents' face-down cards on the battlefield or in exile: the known limit above. */
    public static int hiddenFaceDown(final Game game, final Player ai) {
        int n = 0;
        for (final Player p : game.getPlayers()) {
            if (p == ai) {
                continue;
            }
            for (final Card c : p.getCardsIn(ZoneType.Battlefield)) {
                n += c.isFaceDown() ? 1 : 0;
            }
            for (final Card c : p.getCardsIn(ZoneType.Exile)) {
                n += c.isFaceDown() ? 1 : 0;
            }
        }
        return n;
    }
}
