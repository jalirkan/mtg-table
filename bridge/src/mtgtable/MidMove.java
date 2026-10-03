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

import java.util.EnumSet;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

import forge.game.Game;
import forge.game.StaticEffect;
import forge.game.card.Card;
import forge.game.zone.Zone;
import forge.game.zone.ZoneType;

/**
 * <b>D352: never snapshot a reveal whose source has already left.</b>  Each of
 * the two snapshot hooks ({@code WireGuiGame.handleGameEvents},
 * {@code RecordMatch.SpectatorGui.handleGameEvents}) owns one of these and asks
 * {@link #hold} first; while it says yes, the hook keeps the batch for its next
 * flush instead of building a frame.
 *
 * <p><b>The window.</b>  {@code GameAction.changeZone} (2.0.14, javap) takes a
 * permanent off the battlefield with {@code Zone.remove}, runs the
 * {@code Moved} replacements, adds the card to its new zone with
 * {@code Zone.add} -- both of which fire a {@code GameEventZone} -- unattaches,
 * untaps (a {@code GameEventCardTapped}), and only <em>then</em> calls
 * {@code checkStaticAbilities()}, which is what removes the leaving card's
 * static effects ({@code StaticEffect.remove} -> {@code Card.removeMayLookAt}
 * -> {@code CardView.setPlayerMayLook}, a property that ignores the tracker's
 * freeze, so the view changes at that instant and not before).  State-based
 * actions widen the window: {@code checkStateEffects} puts static checks on
 * hold while it destroys and sacrifices.  {@code GameEventForwarder} flushes on
 * whichever event finds 500 ms since its last flush -- after a searching AI's
 * long think, that is the first event of the next resolution -- and the
 * recorder's decision records (D347) flush before any decision, so a frame can
 * be cut inside that window: Oracle of Mul Daya is already gone from the
 * battlefield view while the top card's {@code PlayerMayLook} still names the
 * opponent, and {@code Snap.library} -- correctly asking {@code canBeShownTo}
 * -- puts the card in {@code library.cards}.  Rule 611.3a: a static ability's
 * effect stops the moment its source leaves, so that frame shows a card nobody
 * may see ({@code tools/check-redaction.mjs} A3 rightly fails it; the PC lab's
 * J019).  {@code MidMoveSelfTest} reproduces it.
 *
 * <p><b>The test.</b>  A {@code MayLookAt} static effect -- the only kind of
 * static that opens a hidden zone -- whose source is not in the zone its
 * ability works from ({@code EffectZone$}, else the battlefield; the command
 * zone, where emblems and effects live, always counts as working).  After
 * {@code checkStaticAbilities} no such effect is left, so the next flush
 * builds the frame, with the held events first.  A finished game is never held
 * ({@code checkStaticAbilities} returns at once once the game is over, so the
 * effect could stay).  And a hook holds at most {@link #MAX_HELD} flushes in a
 * row; then it stops holding until the test next comes out false, and says so
 * on stderr -- so a mistake here costs a few merged frames once, never a board
 * that stops updating.
 *
 * <p>Game thread only: it reads the live {@link Game} (hard rule 3), which is
 * why it lives here and not in {@link Snap}, which walks views alone.
 */
public final class MidMove {

    /** Consecutive flushes one hook may hold before it gives up until the next clean flush. */
    static final int MAX_HELD = 8;

    /** How many flushes were held, this process (the self-test reads it). */
    private static final AtomicInteger HELD = new AtomicInteger();

    /** This hook's consecutive holds. */
    private int run;
    /** The valve tripped: hold nothing until {@link #revealStale} is false again. */
    private boolean gaveUp;

    /** Game thread only: should this flush be kept for the next one?  Counts the hold. */
    public boolean hold(final Game game) {
        if (game == null || game.isGameOver() || !revealStale(game)) {
            run = 0;
            gaveUp = false;
            return false;
        }
        if (gaveUp) {
            return false;
        }
        if (run >= MAX_HELD) {
            gaveUp = true;
            run = 0;
            System.err.println("MID-MOVE HOLD GAVE UP: " + MAX_HELD + " flushes in a row held and the "
                    + "\"may look\" effect is still stale; frames go out again (D352)");
            return false;
        }
        run++;
        if (HELD.incrementAndGet() <= 20) {
            System.err.println("MID-MOVE FLUSH HELD: a \"may look\" effect outlives its source; "
                    + "the frame waits for checkStaticAbilities (D352)");
        }
        return true;
    }

    /** Flushes held so far in this process. */
    public static int held() {
        return HELD.get();
    }

    /** True while a {@code MayLookAt} static effect's source is out of the zone it works from. */
    public static boolean revealStale(final Game game) {
        for (final StaticEffect se : game.getStaticEffects().getEffects()) {
            if (se == null || !se.hasParam("MayLookAt")) {
                continue;
            }
            final Card src = se.getSource();
            if (src == null) {
                continue;
            }
            final Zone z = src.getZone();
            if (z == null || !z.contains(src)) {
                return true;                     // between Zone.remove and setZone
            }
            final ZoneType zt = z.getZoneType();
            if (zt == ZoneType.Command) {
                continue;
            }
            final String ez = se.getParam("EffectZone");
            if ("All".equals(ez)) {
                continue;
            }
            final Set<ZoneType> works = EnumSet.noneOf(ZoneType.class);
            if (ez == null) {
                works.add(ZoneType.Battlefield);
            } else {
                works.addAll(ZoneType.listValueOf(ez));
            }
            if (!works.contains(zt)) {
                return true;
            }
        }
        return false;
    }
}
