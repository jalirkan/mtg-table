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
import java.util.Iterator;
import java.util.List;
import java.util.Random;

import forge.game.Game;
import forge.game.card.Card;
import forge.game.player.Player;
import forge.game.zone.ZoneType;

/**
 * Redeals what the searching AI cannot see, on a COPY of the game (D312;
 * D498 keeps what it can see where it is).
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
 * <li><b>Every card in a hand or a library that the engine lets it look at</b>
 *     ({@code Card.mayPlayerLook}, D498): the top card of a library played
 *     revealed (Oracle of Mul Daya, Courser of Kruphix), a hand played revealed
 *     (Telepathy), its own top card under Future Sight.  These are where the
 *     AI's log says they are, and they stay there.</li>
 * </ul>
 * <b>What it is not allowed to know</b>: where the rest of those cards are --
 * which of the opponent's hidden cards are in the hand and which in the
 * library, and the library's order.  So, per player, the hand and library
 * cards the AI may NOT look at are put in a canonical order that depends only
 * on their multiset (card name, then id), shuffled with the search's own
 * random source, and dealt back into exactly the slots they left: a hand slot
 * first, then the library's in order, so a hand keeps its size (a public
 * number) and a card the AI may look at keeps its zone and its index (the
 * revealed top card stays on top).  The AI's own hand is never touched; its own
 * library is redealt the same way.  The result is a function of (the hidden
 * multiset, the slots, the random source) alone; the self-test holds that two
 * games which differ only in the split and order of the hidden cards give
 * byte-identical determinizations.  With nothing lookable the slots are the
 * whole hand then the whole library, and the deal is D312's, draw for draw.
 *
 * <p><b>Why a lookable card must stay put (D498).</b>  D312 pooled the whole
 * hand and library and called forgetting a known card "the safe direction".
 * It is not: the engine does not forget.  The copy's may-look grant comes from
 * the copy's own statics, which Forge's copier applies to the copy's top card
 * ({@code checkStateEffects} after the zones are built), and it travels with
 * the card object until the next static check.  A revealed top card redealt
 * into the opponent's hand was a full, named card in a hidden zone in the
 * branch's first state frame, with no reveal before it (J181's s07, decision
 * 14: card 44, named in 48 of 1,360 branch logs, {@code tools/check-redaction.mjs}'s
 * A6), and a world the AI knows to be impossible: it saw that card on top of
 * the library.
 *
 * <p><b>Known limits.</b> A face-down card of the opponent's (morph, manifest,
 * disguise, foretell, a hidden exile) keeps its real identity in the copy, as
 * Forge's copier makes it; the search does not turn it face up, but a rollout
 * in which it is turned up plays the real card.  {@link #hiddenFaceDown} counts
 * them so the bench can say how often that happens.  What is lookable is read
 * on the copy, where the copier's statics put it: a look that is not a static's
 * -- {@code PlayerControllerHuman.tempShowCard}'s, during a human's choice, the
 * one caller of {@code addMayLookTemp} -- is not on the copy, and that card is
 * redealt with the rest: the branch forgets it, and its log, gated on the
 * copy, does not name it.  A card the OTHER seat may look at
 * and the searching seat may not (Experimental Frenzy's private top card) is
 * hidden here and redealt, and its grant rides with it until the engine's next
 * static check: in the owner's own hand or library, where its owner's log shows
 * it anyway -- except where a card of the searching seat's own library is
 * lookable by its opponent and not by itself, which would carry the grant to
 * another index of that library in the opponent's log; no field log has shown
 * that shape, and this does not cover it.  One-shot looks are still forgotten
 * and redealt -- a card bounced to its owner's hand in public, a tutor's
 * reveal, a Thoughtseize-style look at the hand -- because in a hand or a
 * library only statics and {@code tempShowCard} grant {@code mayPlayerLook}:
 * safe for the logs (the branch forgets the card and never names it), but a
 * position the seat knows to be impossible.
 */
public final class Determinizer {

    private Determinizer() { }

    private static final Comparator<Card> CANONICAL =
            Comparator.comparing((Card c) -> c.getName()).thenComparingInt(c -> c.getId());

    /**
     * Redeal the opponents' hidden hand and library cards and the AI's own
     * hidden library cards, in place, on {@code copy}; {@code aiInCopy} is the
     * searching seat.  Every card it may look at stays where it is (D498).
     */
    public static void determinize(final Game copy, final Player aiInCopy, final Random rng) {
        for (final Player p : copy.getPlayers()) {
            redealHidden(p, aiInCopy, p != aiInCopy, rng);
        }
    }

    /**
     * D498: deal {@code p}'s library cards (and, with {@code withHand}, its hand
     * cards) that {@code seat} may not look at back into the slots they hold,
     * in a random order drawn from {@code rng} over their canonical order; a
     * card {@code seat} may look at keeps its zone and its index.  Returns how
     * many cards were kept.  Fires the two zones' {@code setCards} events.
     */
    public static int redealHidden(final Player p, final Player seat, final boolean withHand, final Random rng) {
        final List<Card> hand = new ArrayList<>(withHand ? p.getZone(ZoneType.Hand).getCards() : List.of());
        final List<Card> lib = new ArrayList<>(p.getZone(ZoneType.Library).getCards());
        final boolean[] handKept = lookable(hand, seat);
        final boolean[] libKept = lookable(lib, seat);
        final List<Card> hidden = new ArrayList<>(hand.size() + lib.size());
        collect(hand, handKept, hidden);
        collect(lib, libKept, hidden);
        hidden.sort(CANONICAL);
        Collections.shuffle(hidden, rng);
        final Iterator<Card> deal = hidden.iterator();
        fill(hand, handKept, deal);
        fill(lib, libKept, deal);
        if (withHand) {
            p.getZone(ZoneType.Hand).setCards(hand);
        }
        p.getZone(ZoneType.Library).setCards(lib);
        return hand.size() + lib.size() - hidden.size();
    }

    private static boolean[] lookable(final List<Card> cards, final Player seat) {
        final boolean[] out = new boolean[cards.size()];
        for (int i = 0; i < out.length; i++) {
            out[i] = cards.get(i).mayPlayerLook(seat);
        }
        return out;
    }

    private static void collect(final List<Card> cards, final boolean[] kept, final List<Card> into) {
        for (int i = 0; i < kept.length; i++) {
            if (!kept[i]) {
                into.add(cards.get(i));
            }
        }
    }

    private static void fill(final List<Card> cards, final boolean[] kept, final Iterator<Card> deal) {
        for (int i = 0; i < kept.length; i++) {
            if (!kept[i]) {
                cards.set(i, deal.next());
            }
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
