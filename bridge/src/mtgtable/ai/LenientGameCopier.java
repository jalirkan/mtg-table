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
import java.util.List;
import java.util.Map;
import java.util.Set;

import forge.ai.simulation.GameCopier;
import forge.game.Game;
import forge.game.GameObject;
import forge.game.card.Card;
import forge.game.phase.PhaseType;
import forge.game.player.Player;
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
 * zones still go through Forge's own strict lookup, and after the copy is made
 * every lookup is strict again.  Every stand-in is counted ({@link #unmapped}),
 * and the bench reports the rate.
 */
public final class LenientGameCopier extends GameCopier {

    /** The zones {@code GameCopier} copies (its private {@code ZONES}, 2.0.14). */
    static final Set<ZoneType> COPIED = Set.of(ZoneType.Battlefield, ZoneType.Hand, ZoneType.Graveyard,
            ZoneType.Library, ZoneType.Exile, ZoneType.Stack, ZoneType.Command);

    private boolean copying;
    private final Map<Card, Card> standIns = new HashMap<>();
    private final List<String> unmappedNames = new ArrayList<>();

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

    @Override
    public Game makeCopy(final PhaseType advanceToPhase, final Player aiPlayer) {
        copying = true;
        try {
            return super.makeCopy(advanceToPhase, aiPlayer);
        } finally {
            copying = false;
        }
    }

    @Override
    public GameObject find(final GameObject o) {
        if (copying && o instanceof Card) {
            final Card c = (Card) o;
            final ZoneType z = c.getZone() == null ? null : c.getZone().getZoneType();
            if (z == null || !COPIED.contains(z)) {
                return standIns.computeIfAbsent(c, k -> {
                    unmappedNames.add(k.getName() + "@" + z);
                    return new Card(k.getId(), k.getPaperCard(), getCopiedGame());
                });
            }
        }
        return super.find(o);
    }
}
