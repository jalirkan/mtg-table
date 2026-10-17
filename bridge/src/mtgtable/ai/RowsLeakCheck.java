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
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Random;

import forge.game.Game;
import forge.game.card.Card;
import forge.game.player.Player;
import forge.game.zone.PlayerZone;
import forge.game.zone.ZoneType;

/**
 * The rows' hidden-information check, with the engine (D450): a row's state is
 * {@link DistillFeatures#state} for the deciding seat, which reads only what
 * that seat may know (D361's encoder over {@code GamePosition}).  This check
 * holds the exporter to that on live decisions, the way {@code EvalLiveCheck}
 * holds the evaluator (D316): the opponent's hand and library are dealt again
 * from their own cards and the deciding seat's library is shuffled -- the state
 * must not move, and neither may any candidate's vector ({@link
 * DistillFeatures#candidates}, the #160 review: a row is both) -- and, the negative control, the deciding seat's OWN hand is
 * swapped with cards of its library, which must move it (else the check could
 * not see a leak at all).  Every zone is put back before the game goes on.
 *
 * <p>Off by default ({@link #every} 0).  A zone's {@code setCards} fires a
 * {@code GameEventZone}, so a game whose frames are being recorded must not be
 * checked this way (its log would carry the swaps); the cube lab turns it on
 * for rows-only games and its own self-test.  Its draws come from its own
 * seeded generator and never from Forge's {@code MyRandom}.  Game thread only.
 */
public final class RowsLeakCheck {

    private RowsLeakCheck() {
    }

    private static int every;
    private static long seen;
    private static Random rng = new Random(450);
    private static long checks;
    private static long leaks;
    private static long controls;
    private static long controlMoved;
    private static long candChecks;

    /** Check every {@code n}-th row from now on (0 = off), with a generator seeded by {@code seed}. */
    public static synchronized void configure(final int n, final long seed) {
        every = Math.max(0, n);
        seen = 0;
        rng = new Random(seed);
    }

    /** Whether the row being written now is one to check (counts the row). */
    static synchronized boolean due() {
        if (every <= 0) {
            return false;
        }
        seen++;
        return seen % every == 0;
    }

    /**
     * Checks, leaks (the state or a candidate's vector moved when only hidden
     * cards did), negative controls, how many of those moved, and how many
     * checks compared candidate vectors too.
     */
    public static synchronized long[] counts() {
        return new long[] {checks, leaks, controls, controlMoved, candChecks};
    }

    /** Zero the counters (one game's worth at a time). */
    public static synchronized void reset() {
        checks = 0;
        leaks = 0;
        controls = 0;
        controlMoved = 0;
        candChecks = 0;
    }

    /**
     * The check itself, for {@code ai}'s row; never throws into the game.  The
     * state is encoded again first (the row's own was taken before the answer,
     * and an attack or a block since then changed the combat it reads).
     */
    static synchronized void check(final Player ai, final SearchPolicy.Sink sink, final String kind,
                                   final List<SearchPolicy.Cand> cands) {
        try {
            final Game game = ai.getGame();
            final double[] state = DistillFeatures.state(ai);
            final double[][] cand = cands == null || cands.isEmpty() ? null : DistillFeatures.candidates(kind, ai, cands, null);
            for (final Player opp : game.getPlayers()) {
                if (opp == ai) {
                    continue;
                }
                final PlayerZone hand = opp.getZone(ZoneType.Hand);
                final PlayerZone lib = opp.getZone(ZoneType.Library);
                final PlayerZone myLib = ai.getZone(ZoneType.Library);
                final List<Card> h0 = new ArrayList<>(hand.getCards(false));
                final List<Card> l0 = new ArrayList<>(lib.getCards(false));
                final List<Card> m0 = new ArrayList<>(myLib.getCards(false));
                try {
                    final List<Card> all = new ArrayList<>(h0);
                    all.addAll(l0);
                    Collections.shuffle(all, rng);
                    hand.setCards(new ArrayList<>(all.subList(0, h0.size())));
                    lib.setCards(new ArrayList<>(all.subList(h0.size(), all.size())));
                    final List<Card> m1 = new ArrayList<>(m0);
                    Collections.shuffle(m1, rng);
                    myLib.setCards(m1);
                    checks++;
                    final boolean stateMoved = !Arrays.equals(state, DistillFeatures.state(ai));
                    boolean candMoved = false;
                    if (cand != null) {
                        candChecks++;
                        candMoved = !Arrays.deepEquals(cand, DistillFeatures.candidates(kind, ai, cands, null));
                    }
                    if (stateMoved || candMoved) {
                        leaks++;
                        sink.add(stateMoved ? "distill.rowsLeak" : "distill.rowsLeakCandidate", 1);
                    }
                } finally {
                    hand.setCards(h0);
                    lib.setCards(l0);
                    myLib.setCards(m0);
                }
            }
            // The negative control: the same kind of redeal of the seat's OWN hand must show.
            final PlayerZone hand = ai.getZone(ZoneType.Hand);
            final PlayerZone lib = ai.getZone(ZoneType.Library);
            final List<Card> h0 = new ArrayList<>(hand.getCards(false));
            final List<Card> l0 = new ArrayList<>(lib.getCards(false));
            if (h0.isEmpty() || l0.size() < h0.size()) {
                return;
            }
            try {
                final List<Card> shuffled = new ArrayList<>(l0);
                Collections.shuffle(shuffled, rng);
                final List<Card> newHand = new ArrayList<>(shuffled.subList(0, h0.size()));
                final List<Card> newLib = new ArrayList<>(shuffled.subList(h0.size(), shuffled.size()));
                newLib.addAll(h0);
                hand.setCards(newHand);
                lib.setCards(newLib);
                controls++;
                if (!Arrays.equals(state, DistillFeatures.state(ai))) {
                    controlMoved++;
                }
            } finally {
                hand.setCards(h0);
                lib.setCards(l0);
            }
        } catch (final RuntimeException e) {
            sink.add("distill.rowsLeakCheckError", 1);
        }
    }
}
