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
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import com.google.common.eventbus.Subscribe;

import forge.deck.Deck;
import forge.game.Game;
import forge.game.GameRules;
import forge.game.GameState;
import forge.game.GameType;
import forge.game.Match;
import forge.game.card.Card;
import forge.game.event.EventValueChangeType;
import forge.game.event.GameEvent;
import forge.game.event.GameEventZone;
import forge.game.player.Player;
import forge.game.player.PlayerView;
import forge.game.player.RegisteredPlayer;
import forge.game.zone.ZoneType;
import forge.gui.control.GameEventForwarder;
import forge.model.FModel;
import forge.trackable.TrackableCollection;

import mtgtable.Json.JsonOut;
import mtgtable.ai.PolicyLobbyPlayerAi;

/**
 * D352's reproduction: <b>the revealer leaves play, and the top card is not in
 * {@code library.cards} in that frame</b> (the PC lab's J019:
 * {@code p9-g0-seat0.jsonl.gz} line 474, Swords to Plowshares on Oracle of Mul
 * Daya, A3).
 *
 * <p>One engine boot, one hand-built position through Forge's own
 * {@link GameState} loader: seat 1 controls Oracle of Mul Daya ("play with the
 * top card of your library revealed"), seat 0 is the viewer.  Seat 0's
 * recorder is {@link RecordMatch.SpectatorGui} behind a hand-registered
 * {@link GameEventForwarder}, exactly as {@link SeatRecorder} wires it.  Then
 * {@code GameAction.exile} on the Oracle -- Swords' own path through
 * {@code changeZone} -- with a subscriber registered after the forwarder that
 * flushes it on the {@code GameEventZone} that takes the Oracle off the
 * battlefield: the forwarder's 500 ms flush, landed deterministically on the
 * event the lab's run landed it on.
 *
 * <ol>
 *   <li><b>Control, the reveal works:</b> before the exile, a frame has the
 *       Oracle on seat 1's battlefield and exactly its top card in
 *       {@code library.cards} (A3's allowed case).</li>
 *   <li><b>Control, the window is real:</b> at the cut, a frame built directly
 *       with {@link Snap#state} -- what the hook built before D352 -- has the
 *       Oracle gone from the battlefield AND the top card in
 *       {@code library.cards}, and {@link MidMove#revealStale} says so.  If
 *       Forge ever closes the window itself, this check fails, and D352 can
 *       go.</li>
 *   <li><b>The fix:</b> no {@code state} frame in the recorder's log shows a
 *       card in seat 1's {@code library.cards} without the Oracle on seat 1's
 *       battlefield; the flush was held ({@link MidMove#held}); the held
 *       events were not lost (the Oracle's {@code zone} event to exile is in
 *       the log); and the last frame has the Oracle in exile.</li>
 *   <li><b>The valve:</b> a {@link MidMove} asked about a stale game more than
 *       {@link MidMove#MAX_HELD} times in a row stops holding.</li>
 * </ol>
 *
 * <p>Usage: {@code ./bridge/run.sh mtgtable.MidMoveSelfTest <scratch dir>} --
 * the Forge home is the config's ({@code MTG_TABLE_CONFIG}); it writes one log
 * under the scratch dir.  One JVM, about 30 s, almost all of it
 * {@code FModel.initialize}.  Step 12i of {@code tools/check-all.sh}.
 */
public final class MidMoveSelfTest {

    private MidMoveSelfTest() { }

    private static int checks;
    private static final List<String> FAILURES = new ArrayList<>();

    private static final String ORACLE = "Oracle of Mul Daya";

    public static void main(final String[] args) throws Exception {
        final File dir = new File(args.length > 0 ? args[0] : "var/midmove-selftest");
        dir.mkdirs();
        final Config cfg = Config.load();
        Bootstrap.installGui(cfg.forgeHomeDir());   // hard rule 1: the first Forge call
        Bootstrap.initializeModel(false);

        final File logFile = new File(dir, "midmove.jsonl");
        final int[] ids = new int[4];               // oracle, top card, cuts, holds by the exile
        final String[] atCut = new String[1];
        final boolean[] staleAtCut = new boolean[1];
        final int heldBefore = MidMove.held();
        onGameThread(() -> run(logFile, ids, atCut, staleAtCut));

        // 2. The window, as the hook saw it before D352.
        expect("the cut fired exactly once, on the Oracle leaving the battlefield (" + ids[2] + ")", ids[2] == 1);
        expect("MidMove.revealStale is true at the cut", staleAtCut[0]);
        if (atCut[0] != null) {
            final Map<?, ?> s = (Map<?, ?>) Json.parse(atCut[0]);
            expect("control: at the cut the Oracle is off seat 1's battlefield", !onBattlefield(s, 1, ids[0]));
            expect("control: at the cut a bare Snap.state puts seat 1's top card in library.cards -- the J019 leak",
                    libraryIds(s, 1).contains((long) ids[1]));
        } else {
            expect("control: a frame was built at the cut", false);
        }

        // 1 and 3. The recorder's log.
        final List<Map<?, ?>> states = new ArrayList<>();
        boolean zoneEvent = false;
        for (final String line : Files.readAllLines(logFile.toPath(), StandardCharsets.UTF_8)) {
            final Map<?, ?> f = (Map<?, ?>) Json.parse(line);
            if (!"state".equals(f.get("type"))) {
                continue;
            }
            final Map<?, ?> body = (Map<?, ?>) f.get("body");
            states.add(body);
            for (final Object e : list(body.get("events"))) {
                final Map<?, ?> em = (Map<?, ?>) e;
                if ("zone".equals(em.get("kind")) && num(em.get("cardId")) == ids[0]
                        && em.get("to") instanceof Map<?, ?> to && "exile".equals(to.get("zone"))) {
                    zoneEvent = true;
                }
            }
        }
        expect("the log has at least two state frames (" + states.size() + ")", states.size() >= 2);
        if (!states.isEmpty()) {
            final Map<?, ?> first = states.get(0);
            expect("control: before the exile the Oracle is on seat 1's battlefield", onBattlefield(first, 1, ids[0]));
            expect("control: before the exile seat 1's library.cards is exactly the top card " + libraryIds(first, 1),
                    libraryIds(first, 1).equals(List.of((long) ids[1])));
            final Map<?, ?> last = states.get(states.size() - 1);
            expect("the last frame has the Oracle off the battlefield", !onBattlefield(last, 1, ids[0]));
            expect("the last frame's seat 1 library.cards is empty " + libraryIds(last, 1), libraryIds(last, 1).isEmpty());
        }
        int leaks = 0;
        for (int i = 0; i < states.size(); i++) {
            final Map<?, ?> s = states.get(i);
            if (!onBattlefield(s, 1, ids[0]) && !libraryIds(s, 1).isEmpty()) {
                leaks++;
                System.out.println("  leak in state frame " + i + ": library.cards " + libraryIds(s, 1));
            }
        }
        expect("no frame shows seat 1's top card once the Oracle has left (" + leaks + " leak(s))", leaks == 0);
        expect("the mid-move flush was held (" + (ids[3] - heldBefore) + ")", ids[3] > heldBefore);
        expect("the held events reached the log: the Oracle's zone event to exile", zoneEvent);

        // 4. The valve, on a game left stale on purpose.
        expect("valve: the stale game counted as stale", valve[0] > 0);
        expect("valve: " + MidMove.MAX_HELD + " holds, then it gives up (held " + valve[0] + " of "
                + (MidMove.MAX_HELD + 3) + ")", valve[0] == MidMove.MAX_HELD);

        System.out.println("MidMoveSelfTest: " + checks + " check(s), " + FAILURES.size() + " failure(s)");
        for (final String f : FAILURES) {
            System.out.println("  FAIL " + f);
        }
        System.out.flush();
        System.exit(FAILURES.isEmpty() ? 0 : 1);   // Forge leaves non-daemon pools behind
    }

    /** [0]: holds of {@link MidMove#MAX_HELD}+3 asks on a stale game; -1 until measured. */
    private static final int[] valve = {-1};

    /** On the game thread: the position, the recorder, the exile, the valve. */
    private static void run(final File logFile, final int[] ids, final String[] atCut, final boolean[] staleAtCut) {
        final Game game = position();
        final Player opp = game.getPlayers().get(1);
        final PlayerView viewer = game.getPlayers().get(0).getView();
        Card oracle = null;
        for (final Card c : opp.getCardsIn(ZoneType.Battlefield)) {
            if (ORACLE.equals(c.getName())) {
                oracle = c;
            }
        }
        if (oracle == null) {
            throw new IllegalStateException("the position has no " + ORACLE + " on seat 1's battlefield");
        }
        final Card top = opp.getCardsIn(ZoneType.Library).get(0);
        ids[0] = oracle.getId();
        ids[1] = top.getId();

        final GameLog log;
        try {
            log = new GameLog(logFile, false);
        } catch (final java.io.IOException e) {
            throw new IllegalStateException(e);
        }
        log.header(new JsonOut().obj().n("v", GameLog.PROTOCOL_VERSION).n("kind", "session")
                .n("gameId", "midmove-selftest").end().done());
        final RecordMatch.SpectatorGui gui =
                new RecordMatch.SpectatorGui("midmove-selftest", game, game.getView(), viewer, log, false);
        gui.setGameView(null);
        gui.setGameView(game.getView());
        gui.openView(new TrackableCollection<>(viewer));
        final GameEventForwarder forwarder = new GameEventForwarder(gui);
        game.subscribeToEvents(forwarder);
        final int oracleId = oracle.getId();
        // After the forwarder, as BoundaryFlusher is: the event is in the batch it flushes.
        game.subscribeToEvents(new Object() {
            @Subscribe
            public void receive(final GameEvent ev) {
                if (ev instanceof GameEventZone z && z.zoneType() == ZoneType.Battlefield
                        && z.mode() == EventValueChangeType.Removed && z.card() != null
                        && z.card().getId() == oracleId) {
                    ids[2]++;
                    staleAtCut[0] = MidMove.revealStale(game);
                    atCut[0] = Snap.state("midmove-selftest", game.getView(), viewer, List.of());
                    forwarder.flush();   // the 500 ms flush, on this event
                }
            }
        });

        gui.snapshot(List.of());                   // control frame: the Oracle in play, its top card shown
        game.getAction().exile(oracle, null, null);
        forwarder.flush();
        gui.snapshot(List.of());                   // as SeatRecorder.finish does
        ids[3] = MidMove.held();
        try {
            log.close();
        } catch (final java.io.IOException e) {
            throw new IllegalStateException(e);
        }

        // The valve: a second position, its Oracle pulled out of the battlefield
        // zone by hand and statics never re-run, so the game stays stale.
        final Game stale = position();
        Card o2 = null;
        for (final Card c : stale.getPlayers().get(1).getCardsIn(ZoneType.Battlefield)) {
            if (ORACLE.equals(c.getName())) {
                o2 = c;
            }
        }
        stale.getPlayers().get(1).getZone(ZoneType.Battlefield).remove(o2);
        final MidMove mm = new MidMove();
        int held = 0;
        for (int i = 0; i < MidMove.MAX_HELD + 3; i++) {
            held += mm.hold(stale) ? 1 : 0;
        }
        valve[0] = MidMove.revealStale(stale) ? held : 0;
    }

    /** Seat 1 controls Oracle of Mul Daya; three cards in its library; seat 0's main phase. */
    private static Game position() {
        final Deck dummy = new Deck("midmove");
        dummy.getMain().add(FModel.getMagicDb().getCommonCards().getCard("Forest"), 20);
        final List<RegisteredPlayer> regs = new ArrayList<>();
        for (int i = 0; i < 2; i++) {
            final RegisteredPlayer rp = new RegisteredPlayer(dummy);
            rp.setPlayer(Bootstrap.createAiSeat("Seat" + i, i, Bootstrap.DEFAULT_AI_PROFILE, null,
                    PolicyLobbyPlayerAi.Outlets.OFF));
            regs.add(rp);
        }
        final GameRules rules = new GameRules(GameType.Constructed);
        rules.setAppliedVariants(EnumSet.of(GameType.Constructed));
        rules.setGamesPerMatch(1);
        final Game game = new Match(rules, regs, "midmove-selftest").createGame();
        final GameState gs = new GameState();
        gs.parse(List.of(
                "turn=3",
                "activeplayer=p0",
                "activephase=MAIN1",
                "p0life=20",
                "p1life=20",
                "p0battlefield=Plains;Plains",
                "p0library=Plains;Plains;Plains",
                "p1battlefield=" + ORACLE + ";Forest;Forest;Forest;Forest",
                "p1library=Grizzly Bears;Forest;Forest"));
        gs.applyToGame(game);
        return game;
    }

    /** Run {@code body} as the one task on Forge's game pool (CoachGrade's way, D309), and wait. */
    private static void onGameThread(final Runnable body) throws Exception {
        final Deck dummy = new Deck("midmove-start");
        dummy.getMain().add(FModel.getMagicDb().getCommonCards().getCard("Forest"), 20);
        final List<RegisteredPlayer> regs = new ArrayList<>();
        for (int i = 0; i < 2; i++) {
            final RegisteredPlayer rp = new RegisteredPlayer(dummy);
            rp.setPlayer(Bootstrap.createAiSeat("Start" + i, i, Bootstrap.DEFAULT_AI_PROFILE, null,
                    PolicyLobbyPlayerAi.Outlets.OFF));
            regs.add(rp);
        }
        final GameRules rules = new GameRules(GameType.Constructed);
        rules.setAppliedVariants(EnumSet.of(GameType.Constructed));
        rules.setGamesPerMatch(1);
        final Game scratch = new Match(rules, regs, "midmove-start").createGame();
        final CountDownLatch done = new CountDownLatch(1);
        final Throwable[] fail = new Throwable[1];
        scratch.getAction().invoke(() -> {
            try {
                body.run();
            } catch (final Throwable t) {
                fail[0] = t;
            } finally {
                done.countDown();
            }
        });
        if (!done.await(120, TimeUnit.SECONDS)) {
            throw new IllegalStateException("the self-test did not finish in 120 s");
        }
        if (fail[0] != null) {
            throw new RuntimeException(fail[0]);
        }
    }

    // ------------------------------------------------------------------

    private static Map<?, ?> player(final Map<?, ?> state, final int idx) {
        return (Map<?, ?>) list(state.get("players")).get(idx);
    }

    private static Map<?, ?> zone(final Map<?, ?> state, final int idx, final String z) {
        return (Map<?, ?>) ((Map<?, ?>) player(state, idx).get("zones")).get(z);
    }

    private static boolean onBattlefield(final Map<?, ?> state, final int idx, final int cardId) {
        for (final Object c : list(zone(state, idx, "battlefield").get("cards"))) {
            if (num(((Map<?, ?>) c).get("id")) == cardId) {
                return true;
            }
        }
        return false;
    }

    private static List<Long> libraryIds(final Map<?, ?> state, final int idx) {
        final List<Long> out = new ArrayList<>();
        for (final Object c : list(zone(state, idx, "library").get("cards"))) {
            out.add(num(((Map<?, ?>) c).get("id")));
        }
        return out;
    }

    private static List<?> list(final Object o) {
        if (o instanceof List<?> l) {
            return l;
        }
        if (o instanceof Object[] a) {
            return List.of(a);
        }
        return List.of();
    }

    private static long num(final Object o) {
        return o instanceof Number n ? n.longValue() : Long.MIN_VALUE;
    }

    private static void expect(final String what, final boolean ok) {
        checks++;
        System.out.println((ok ? "  ok   " : "  FAIL ") + what);
        if (!ok) {
            FAILURES.add(what);
        }
    }
}
