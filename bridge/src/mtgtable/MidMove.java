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
 * <p><b>D399: never snapshot inside a tracker freeze either.</b>  The opposite
 * window: a "may look" reveal whose source is still in play is briefly
 * <em>missing</em>.  {@code GameAction.checkStaticAbilities} freezes the
 * view tracker, clears every static effect ({@code StaticEffects
 * .clearStaticEffects} -> {@code Card.removeMayLookAt}: the top card's
 * {@code PlayerMayLook} empties at once, the property ignores the freeze),
 * then re-applies the statics layer by layer -- and an earlier static can fire
 * a game event before the {@code MayLookAt} one is back.  Oracle of Mul Daya
 * does it to itself: its first static, {@code AdjustLandPlays$ 1}, runs
 * {@code Player.addMaxLandPlays}, which fires {@code GameEventPlayerStatsChanged}
 * before the second static re-reveals the top card.  Forge runs
 * {@code checkStaticAbilities} constantly (every zone change, every state-based
 * check, and the AI's own look-ahead: {@code AiController.chooseBestLandToPlay}
 * -> {@code ReplacementHandler.getReplacementList}), so the forwarder's 50-event
 * batch often fills on exactly that event, and the frame shows the seat's own
 * revealed top card gone (the PC lab's night 3, game 354 g1 seat 1: card 99 in
 * and out of {@code library.cards} frame by frame, and a decision offering
 * {@code land:99} pointing at a frame without it -- the checker's M55).  A
 * frozen tracker is the one sign Forge gives that its views are mid-update:
 * properties that respect the freeze are still the old ones while the rest are
 * new, so no frame built then is a position.  {@link #midUpdate} says so, and
 * {@link #hold} keeps such a flush for the next one, with a valve of its own
 * ({@link #MAX_HELD_FROZEN}).
 *
 * <p>Game thread only: it reads the live {@link Game} (hard rule 3), which is
 * why it lives here and not in {@link Snap}, which walks views alone.
 */
public final class MidMove {

    /** Consecutive flushes one hook may hold for a stale reveal before it gives up until the next clean flush. */
    static final int MAX_HELD = 8;
    /**
     * D399: the same valve for flushes cut inside a tracker freeze.  Larger,
     * because Forge fires most of a busy turn's events from inside freezes
     * (each static re-check fires one or two per land-play static, and the AI
     * re-checks statics in its look-ahead), so many flushes in a row can land
     * in one; the run ends at the next flush outside a freeze -- a phase
     * boundary, a decision's flush -- which ships everything held.
     */
    static final int MAX_HELD_FROZEN = 256;
    /** The longest run of frozen holds seen, this process. */
    private static final AtomicInteger MAX_FROZEN_RUN = new AtomicInteger();

    /** How many flushes were held, this process (the self-test reads it). */
    private static final AtomicInteger HELD = new AtomicInteger();
    /** Of those, how many because the tracker was frozen (D399). */
    private static final AtomicInteger HELD_FROZEN = new AtomicInteger();

    /** This hook's consecutive holds: for a stale reveal, and inside a freeze. */
    private int run;
    private int frozenRun;
    /** The valve tripped: hold nothing until {@link #revealStale} is false again. */
    private boolean gaveUp;

    /** Game thread only: should this flush be kept for the next one (D352's stale reveal, D399's freeze)?  Counts the hold. */
    public boolean hold(final Game game) {
        if (game == null || game.isGameOver()) {
            run = 0;
            frozenRun = 0;
            gaveUp = false;
            return false;
        }
        final boolean frozen = midUpdate(game);
        if (!frozen && !revealStale(game)) {
            run = 0;
            frozenRun = 0;
            gaveUp = false;
            return false;
        }
        if (gaveUp) {
            return false;
        }
        if (frozen ? frozenRun >= MAX_HELD_FROZEN : run >= MAX_HELD) {
            gaveUp = true;
            run = 0;
            frozenRun = 0;
            System.err.println("MID-MOVE HOLD GAVE UP: " + (frozen ? MAX_HELD_FROZEN : MAX_HELD)
                    + " flushes in a row held and "
                    + (frozen ? "the view tracker is still frozen" : "the \"may look\" effect is still stale")
                    + "; frames go out again (D352, D399)");
            return false;
        }
        if (frozen) {
            frozenRun++;
            MAX_FROZEN_RUN.accumulateAndGet(frozenRun, Math::max);
            HELD_FROZEN.incrementAndGet();
        } else {
            run++;
        }
        if (HELD.incrementAndGet() <= 20) {
            System.err.println(frozen
                    ? "MID-UPDATE FLUSH HELD: cut inside a tracker freeze (checkStaticAbilities); "
                            + "the frame waits for the views to settle (D399)"
                    : "MID-MOVE FLUSH HELD: a \"may look\" effect outlives its source; "
                            + "the frame waits for checkStaticAbilities (D352)");
        }
        return true;
    }

    /** The longest run of consecutive frozen holds one hook has made, this process (D399). */
    public static int maxFrozenRun() {
        return MAX_FROZEN_RUN.get();
    }

    /** Flushes held so far in this process because the tracker was frozen (D399). */
    public static int heldFrozen() {
        return HELD_FROZEN.get();
    }

    /**
     * D399: true while Forge is inside a view-tracker freeze --
     * {@code checkStaticAbilities}, {@code checkStateEffects}, and a few
     * effects' own bodies -- when the views are half updated.
     */
    public static boolean midUpdate(final Game game) {
        return game.getTracker() != null && game.getTracker().isFrozen();
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
