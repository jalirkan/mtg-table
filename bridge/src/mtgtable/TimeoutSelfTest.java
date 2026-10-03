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

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;

import forge.deck.Deck;
import forge.deck.io.DeckSerializer;
import forge.game.Game;
import forge.game.GameEndReason;
import forge.game.GameRules;
import forge.game.GameType;
import forge.game.Match;
import forge.game.event.GameEventTurnBegan;
import forge.game.player.RegisteredPlayer;
import forge.util.MyRandom;

import mtgtable.ai.PolicyLobbyPlayerAi;

/**
 * D355's reproduction: <b>a game ended by the watchdog records cleanly</b>.
 *
 * <p>The cube lab, ai-bench and {@link RecordMatch} end a game that ran past its
 * deadline with {@code Game.setGameOver(GameEndReason.Draw)} from their MAIN
 * thread.  {@code setGameOver} fires {@code GameEventGameOutcome} on the
 * calling thread (javap, 2.0.14: {@code fireEvent} at offset 158), so every
 * recorder's {@link RecordMatch.BoundaryFlusher} -- and the forwarder's own
 * 500 ms clock -- flushed on {@code main}, {@link Snap#state} refused the
 * off-thread walk (hard rule 3), and each seat counted one snapshot error: the
 * overnight queue's {@code errors: 2} on its one timed-out game.
 *
 * <p>Here: one real game, both chairs recorded by {@link SeatRecorder} exactly
 * as {@code CubeLab.playGame} wires them.  At the start of turn 3 the game
 * thread parks (an {@link AllowConcurrentEvents} subscriber, so the main
 * thread's dispatch does not wait on its monitor); main calls
 * {@code setGameOver(Draw)} -- the watchdog's call, made while the game thread
 * is mid-game, deterministically -- and releases it.  Then:
 *
 * <ol>
 *   <li><b>Control:</b> the outcome arrived off the game thread (each
 *       recorder held at least one off-thread batch), so the path the queue hit
 *       was exercised.</li>
 *   <li><b>The fix:</b> {@code errors() == 0} and {@code decisionErrors() == 0}
 *       for both seats; each log has exactly one {@code over}, it is the last
 *       {@code s2c} frame, and the {@code state} frame before it carries
 *       {@code gameOver} -- the end a normal game writes; and the batch that
 *       arrived off the thread was not lost: its {@code outcome} event is in
 *       the log, once.</li>
 * </ol>
 *
 * <p>Usage: {@code ./bridge/run.sh mtgtable.TimeoutSelfTest <scratch dir>} --
 * the Forge home is the config's; it writes two logs under the scratch dir.
 * One JVM, about 30 s, almost all of it {@code FModel.initialize}.  Step 12j of
 * {@code tools/check-all.sh}.
 */
public final class TimeoutSelfTest {

    private TimeoutSelfTest() { }

    private static int checks;
    private static final List<String> FAILURES = new ArrayList<>();

    public static void main(final String[] args) throws Exception {
        final File dir = new File(args.length > 0 ? args[0] : "var/timeout-selftest");
        dir.mkdirs();
        final Config cfg = Config.load();
        Bootstrap.installGui(cfg.forgeHomeDir());   // hard rule 1: the first Forge call
        Bootstrap.initializeModel(false);

        final File[] deckFiles = {new File(cfg.root(), "decks/pacho-shield.dck"),
                                  new File(cfg.root(), "decks/doom-legion.dck")};
        final Deck[] decks = new Deck[2];
        final List<RegisteredPlayer> regs = new ArrayList<>();
        final List<SeatRecorder.Seat> seats = new ArrayList<>();
        for (int s = 0; s < 2; s++) {
            decks[s] = DeckSerializer.fromFile(deckFiles[s]);   // hard rule 4
            final RegisteredPlayer rp = new RegisteredPlayer(decks[s]);
            rp.setPlayer(Bootstrap.createAiSeat("Seat" + s, s, Bootstrap.DEFAULT_AI_PROFILE, null,
                    PolicyLobbyPlayerAi.Outlets.OFF));
            regs.add(rp);
            seats.add(new SeatRecorder.Seat(Bootstrap.deckName(decks[s], deckFiles[s]), deckFiles[s],
                    "decks/" + deckFiles[s].getName(), decks[s], Bootstrap.DEFAULT_AI_PROFILE));
        }
        final GameRules rules = new GameRules(GameType.Constructed);
        rules.setAppliedVariants(EnumSet.of(GameType.Constructed));
        rules.setGamesPerMatch(1);
        MyRandom.setRandom(new Random(77));
        final Match match = new Match(rules, regs, "timeout-selftest");
        final Game game = match.createGame();

        final List<SeatRecorder> recorders = new ArrayList<>();
        final Map<String, Object> lab = new LinkedHashMap<>();
        lab.put("selftest", "timeout");
        for (int s = 0; s < 2; s++) {
            recorders.add(SeatRecorder.attach(game, s, new File(dir, "timeout-seat" + s + ".jsonl"),
                    "timeout-selftest", 77L, null, seats, "lab", lab));
        }

        // Turn 3: the game thread parks until main has ended the game.
        final CountDownLatch reached = new CountDownLatch(1);
        final CountDownLatch release = new CountDownLatch(1);
        game.subscribeToEvents(new Object() {
            @Subscribe
            @AllowConcurrentEvents
            public void receive(final GameEventTurnBegan e) {
                if (e.turnNumber() >= 3 && reached.getCount() > 0) {
                    reached.countDown();
                    try {
                        release.await(60, TimeUnit.SECONDS);
                    } catch (final InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                }
            }
        });

        final CountDownLatch done = new CountDownLatch(1);
        final Throwable[] fail = new Throwable[1];
        game.getAction().invoke(() -> {           // Forge's own Game pool, as CubeLab starts its game
            try {
                match.startGame(game);
                for (final SeatRecorder sr : recorders) sr.finish();   // still the game thread
            } catch (final Throwable t) {
                fail[0] = t;
                for (final SeatRecorder sr : recorders) sr.crashed();
            } finally {
                done.countDown();
            }
        });
        final boolean parked = reached.await(120, TimeUnit.SECONDS);
        expect("the game reached turn 3 and parked", parked);
        game.setGameOver(GameEndReason.Draw);       // the watchdog's call, from main
        release.countDown();
        expect("the game thread came back after the timeout", done.await(60, TimeUnit.SECONDS));
        expect("the game thread did not throw" + (fail[0] == null ? "" : ": " + fail[0]), fail[0] == null);

        for (int s = 0; s < 2; s++) {
            final SeatRecorder sr = recorders.get(s);
            sr.close();
            final String seat = "seat " + s + ": ";
            expect(seat + "control: the outcome reached the recorder off the game thread ("
                    + sr.offThreadBatches() + " batch(es))", sr.offThreadBatches() > 0);
            expect(seat + "no snapshot errors (" + sr.errors() + ")", sr.errors() == 0);
            expect(seat + "no decision-record errors (" + sr.decisionErrors() + ")", sr.decisionErrors() == 0);
            final List<Map<?, ?>> s2c = new ArrayList<>();
            for (final String line : Files.readAllLines(sr.file().toPath(), StandardCharsets.UTF_8)) {
                final Map<?, ?> f = (Map<?, ?>) Json.parse(line);
                if ("s2c".equals(f.get("dir"))) {
                    s2c.add(f);
                }
            }
            int overs = 0;
            int outcomes = 0;
            for (final Map<?, ?> f : s2c) {
                overs += "over".equals(f.get("type")) ? 1 : 0;
                if ("state".equals(f.get("type")) && f.get("body") instanceof Map<?, ?> b
                        && b.get("events") instanceof Object[] evs) {
                    for (final Object e : evs) {
                        outcomes += e instanceof Map<?, ?> em && "outcome".equals(em.get("kind")) ? 1 : 0;
                    }
                }
            }
            expect(seat + "the held batch reached the log: one outcome event (" + outcomes + ")", outcomes == 1);
            expect(seat + "exactly one over (" + overs + ")", overs == 1);
            final int n = s2c.size();
            expect(seat + "the last s2c frame is over", n > 0 && "over".equals(s2c.get(n - 1).get("type")));
            final Map<?, ?> prev = n > 1 ? s2c.get(n - 2) : Map.of();
            expect(seat + "the frame before over is a state with gameOver set",
                    "state".equals(prev.get("type")) && prev.get("body") instanceof Map<?, ?> b
                            && b.get("gameOver") instanceof Map<?, ?>);
        }

        System.out.println("TimeoutSelfTest: " + checks + " check(s), " + FAILURES.size() + " failure(s)");
        for (final String f : FAILURES) {
            System.out.println("  FAIL " + f);
        }
        System.out.flush();
        System.exit(FAILURES.isEmpty() ? 0 : 1);   // Forge leaves non-daemon pools behind
    }

    private static void expect(final String what, final boolean ok) {
        checks++;
        if (ok) {
            System.out.println("  ok   " + what);
        } else {
            FAILURES.add(what);
            System.out.println("  FAIL " + what);
        }
    }
}
