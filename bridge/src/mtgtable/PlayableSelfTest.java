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

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import forge.deck.Deck;
import forge.game.Game;
import forge.game.GameRules;
import forge.game.GameState;
import forge.game.GameType;
import forge.game.Match;
import forge.game.card.Card;
import forge.game.phase.PhaseType;
import forge.game.player.Player;
import forge.game.player.PlayerView;
import forge.game.player.RegisteredPlayer;
import forge.game.spellability.SpellAbility;
import forge.game.spellability.SpellAbilityView;
import forge.game.spellability.StackItemView;
import forge.game.zone.ZoneType;
import forge.model.FModel;

import mtgtable.ai.PolicyLobbyPlayerAi;

/**
 * <b>Amendment M61, decision D413: {@code state.playable} on real cards.</b>
 * The full-game playtest found that a card with a non-keyword ability usable
 * from the graveyard (Cauldron Familiar, Seasoned Pyromancer, Unwilling
 * Ingredient) could not be used from the board: nothing on the wire said it
 * was playable.  One engine boot, hand-built positions through Forge's own
 * {@link GameState} loader, seat 0 the viewer:
 *
 * <ol>
 *   <li><b>Seat 0's main phase:</b> {@link Playables#of} lists the three
 *       graveyard cards and Deep Analysis (flashback), and the land in hand;
 *       not Lightning Bolt in the graveyard (no ability there), and never
 *       seat 1's own Seasoned Pyromancer.</li>
 *   <li><b>No Food:</b> Cauldron Familiar's "Sacrifice a Food" cannot be paid,
 *       so it is not listed; Seasoned Pyromancer still is (mana is never
 *       predicted, as Forge's click does not predict it).</li>
 *   <li><b>Seat 1's turn, seat 0 holding priority:</b> the instant-speed ones
 *       are listed (all three cards of the finding), the sorcery-speed
 *       ones (Deep Analysis's flashback, the land drop) are not.</li>
 *   <li><b>{@link Playables#atPriority}</b> is true for the priority player
 *       only.</li>
 *   <li><b>{@link Snap#state}</b> writes the list with labels, writes
 *       {@code null} when the comfort says so, and DROPS an entry a comfort
 *       hands over for a card that is not the viewer's (seat 1's Pyromancer)
 *       or that sits on the battlefield.</li>
 * </ol>
 *
 * <p>Usage: {@code ./bridge/run.sh mtgtable.PlayableSelfTest}.  One JVM,
 * about 30 s, almost all of it {@code FModel.initialize}.  Step 12j of
 * {@code tools/check-all.sh}.
 */
public final class PlayableSelfTest {

    private PlayableSelfTest() { }

    private static int checks;
    private static final List<String> FAILURES = new ArrayList<>();

    private static final String FAMILIAR = "Cauldron Familiar";
    private static final String PYROMANCER = "Seasoned Pyromancer";
    private static final String INGREDIENT = "Unwilling Ingredient";
    private static final String ANALYSIS = "Deep Analysis";
    private static final String BOLT = "Lightning Bolt";
    private static final String FOOD = "Heaped Harvest";

    public static void main(final String[] args) throws Exception {
        final Config cfg = Config.load();
        Bootstrap.installGui(cfg.forgeHomeDir());   // hard rule 1: the first Forge call
        Bootstrap.initializeModel(false);
        onGameThread(PlayableSelfTest::run);
        System.out.println("PlayableSelfTest: " + checks + " check(s), " + FAILURES.size() + " failure(s)");
        for (final String f : FAILURES) {
            System.out.println("  FAIL " + f);
        }
        System.out.flush();
        System.exit(FAILURES.isEmpty() ? 0 : 1);   // Forge leaves non-daemon pools behind
    }

    private static void run() {
        // 1. Seat 0's main phase, a Food in play.
        {
            final Game g = position(true, "p0");
            final Player me = g.getPlayers().get(0);
            final Map<String, Snap.Playable> got = byName(Playables.of(me));
            expect("main: " + FAMILIAR + " (Sacrifice a Food, from the graveyard) is listed " + got.keySet(), got.containsKey(FAMILIAR));
            expect("main: " + PYROMANCER + " (exile it from the graveyard) is listed", got.containsKey(PYROMANCER));
            expect("main: " + INGREDIENT + " (exile it from the graveyard) is listed", got.containsKey(INGREDIENT));
            expect("main: " + ANALYSIS + " (flashback) is listed", got.containsKey(ANALYSIS));
            expect("main: " + BOLT + " in the graveyard is not", !got.containsKey(BOLT));
            expect("main: the Mountain in hand is listed (a land drop)", got.containsKey("Mountain"));
            for (final Snap.Playable p : got.values()) {
                expect("main: " + p.card().getName() + " is seat 0's own", p.card().getOwner().getId() == me.getView().getId());
            }
            final Snap.Playable fam = got.get(FAMILIAR);
            if (fam != null) {
                expect("main: " + FAMILIAR + " is listed from the graveyard", "graveyard".equals(fam.zone()));
                expect("main: " + FAMILIAR + "'s one entry is an ability, not a spell",
                        fam.abilities().size() == 1 && !fam.abilities().get(0).isSpell());
            }
            expect("atPriority: seat 0 holds priority in its main phase", Playables.atPriority(g, me));
            expect("atPriority: seat 1 does not", !Playables.atPriority(g, g.getPlayers().get(1)));

            // 5. What Snap writes.
            final PlayerView viewer = me.getView();
            final Map<?, ?> st = (Map<?, ?>) Json.parse(Snap.state("playable-selftest", g.getView(), viewer, List.of(),
                    comfort(Playables.of(me))));
            final List<?> pl = list(st.get("playable"));
            expect("Snap: state.playable is written (" + pl.size() + " entries)", pl.size() == got.size());
            boolean labels = true;
            for (final Object o : pl) {
                final Map<?, ?> e = (Map<?, ?>) o;
                for (final Object a : list(e.get("abilities"))) {
                    final Object label = ((Map<?, ?>) a).get("label");
                    labels &= label instanceof String s && !s.isEmpty() && !"???".equals(s);
                    labels &= ((Map<?, ?>) a).get("abilityId") instanceof Number;
                }
            }
            expect("Snap: every ability carries an id and a readable label", labels);
            final Map<?, ?> off = (Map<?, ?>) Json.parse(Snap.state("playable-selftest", g.getView(), viewer, List.of(),
                    comfort(null)));
            expect("Snap: off the seat's priority, playable is written as null",
                    off.containsKey("playable") && off.get("playable") == null);
            final Map<?, ?> none = (Map<?, ?>) Json.parse(Snap.state("playable-selftest", g.getView(), viewer, List.of()));
            expect("Snap: with no seat (an AI-vs-AI recording) the key is absent", !none.containsKey("playable"));

            final Player opp = g.getPlayers().get(1);
            final List<Snap.Playable> hostile = new ArrayList<>();
            for (final Card c : opp.getCardsIn(ZoneType.Graveyard)) {
                hostile.add(new Snap.Playable(c.getView(), "graveyard", views(c, opp)));
            }
            for (final Card c : me.getCardsIn(ZoneType.Battlefield)) {
                if (FOOD.equals(c.getName())) {
                    hostile.add(new Snap.Playable(c.getView(), "battlefield", views(c, me)));
                }
            }
            expect("control: the hostile comfort hands over " + hostile.size() + " entries", hostile.size() >= 2);
            expect("control: the frame's priority is the viewer, so the comfort is asked",
                    Integer.valueOf(viewer.getId()).equals(st.get("priority") instanceof Number n ? Integer.valueOf(n.intValue()) : null));
            final Map<?, ?> h = (Map<?, ?>) Json.parse(Snap.state("playable-selftest", g.getView(), viewer, List.of(),
                    comfort(hostile)));
            expect("Snap: an entry for the opponent's card or a battlefield card is dropped",
                    list(h.get("playable")).isEmpty());
        }

        // 2. No Food.
        {
            final Game g = position(false, "p0");
            final Map<String, Snap.Playable> got = byName(Playables.of(g.getPlayers().get(0)));
            expect("no Food: " + FAMILIAR + " is not listed " + got.keySet(), !got.containsKey(FAMILIAR));
            expect("no Food: " + PYROMANCER + " still is", got.containsKey(PYROMANCER));
        }

        // 3. Seat 1's turn; seat 0 holds priority.
        {
            final Game g = position(true, "p1");
            final Player me = g.getPlayers().get(0);
            givePriority(g, me);
            final Map<String, Snap.Playable> got = byName(Playables.of(me));
            expect("their turn: atPriority for seat 0 once it holds priority", Playables.atPriority(g, me));
            expect("their turn: " + FAMILIAR + " is listed (instant speed) " + got.keySet(), got.containsKey(FAMILIAR));
            expect("their turn: " + PYROMANCER + " is listed (instant speed)", got.containsKey(PYROMANCER));
            expect("their turn: " + INGREDIENT + " is listed (instant speed)", got.containsKey(INGREDIENT));
            expect("their turn: " + ANALYSIS + "'s flashback is not (a sorcery)", !got.containsKey(ANALYSIS));
            expect("their turn: the Mountain in hand is not", !got.containsKey("Mountain"));
            // The frame's priority must name the viewer for Snap to write the list.
            givePriority(g, g.getPlayers().get(1));
            final Map<?, ?> theirs = (Map<?, ?>) Json.parse(Snap.state("playable-selftest", g.getView(), me.getView(),
                    List.of(), comfort(Playables.of(me))));
            expect("Snap: a frame whose priority is the opponent's writes null, whatever the comfort says",
                    theirs.containsKey("playable") && theirs.get("playable") == null);
        }
    }

    private static List<SpellAbilityView> views(final Card c, final Player p) {
        final List<SpellAbilityView> out = new ArrayList<>();
        for (final SpellAbility sa : c.getAllSpellAbilities()) {
            out.add(sa.getView());
        }
        if (out.isEmpty()) {
            for (final SpellAbility sa : c.getAllPossibleAbilities(p, false)) {
                out.add(sa.getView());
            }
        }
        return out;
    }

    private static Map<String, Snap.Playable> byName(final List<Snap.Playable> list) {
        final Map<String, Snap.Playable> out = new HashMap<>();
        for (final Snap.Playable p : list) {
            out.put(p.card().getName(), p);
        }
        return out;
    }

    /** A comfort that answers only {@code playable}; the rest are a seat's quiet defaults. */
    private static Snap.Comfort comfort(final List<Snap.Playable> playable) {
        return new Snap.Comfort() {
            @Override public List<String> stopsOnTurnOf(final int playerId) { return List.of(); }
            @Override public List<String> stopsOffTurnOf(final int playerId) { return List.of(); }
            @Override public String yieldJson() { return null; }
            @Override public String undoJson() { return "{\"can\":false,\"depth\":0}"; }
            @Override public String yieldHandle(final StackItemView si) { return null; }
            @Override public String yieldMode(final StackItemView si) { return null; }
            @Override public List<Snap.Playable> playable() { return playable; }
        };
    }

    /** Seat 0's graveyard holds the three cards of the playtest's finding; {@code turn} is "p0" or "p1". */
    private static Game position(final boolean food, final String turn) {
        final Deck dummy = new Deck("playable");
        dummy.getMain().add(FModel.getMagicDb().getCommonCards().getCard("Mountain"), 20);
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
        final Game game = new Match(rules, regs, "playable-selftest").createGame();
        final GameState gs = new GameState();
        gs.parse(List.of(
                "turn=3",
                "activeplayer=" + turn,
                "activephase=" + PhaseType.MAIN1.name(),
                "p0life=20",
                "p1life=20",
                "p0hand=Mountain",
                "p0graveyard=" + FAMILIAR + ";" + PYROMANCER + ";" + INGREDIENT + ";" + ANALYSIS + ";" + BOLT,
                "p0battlefield=" + (food ? FOOD + ";" : "") + "Swamp;Swamp;Swamp;Mountain;Mountain;Island;Island",
                "p0library=Mountain;Mountain;Mountain",
                "p1graveyard=" + PYROMANCER,
                "p1battlefield=Mountain;Mountain",
                "p1library=Mountain;Mountain;Mountain"));
        gs.applyToGame(game);
        givePriority(game, game.getPlayers().get("p1".equals(turn) ? 1 : 0));
        return game;
    }

    /**
     * GameState sets the phase, not who holds priority: set it as Forge's main
     * loop does -- {@code PhaseHandler}'s priority player, and each player's
     * view flag ({@code Player.setHasPriority}, the end of {@code mainLoopStep}),
     * which is what a frame's {@code priority} reads.
     */
    private static void givePriority(final Game game, final Player p) {
        game.getPhaseHandler().setPriority(p);
        for (final Player q : game.getPlayers()) {
            q.setHasPriority(q == p);
        }
    }

    /** Run {@code body} as the one task on Forge's game pool (MidMoveSelfTest's way), and wait. */
    private static void onGameThread(final Runnable body) throws Exception {
        final Deck dummy = new Deck("playable-start");
        dummy.getMain().add(FModel.getMagicDb().getCommonCards().getCard("Mountain"), 20);
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
        final Game scratch = new Match(rules, regs, "playable-start").createGame();
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

    private static List<?> list(final Object o) {
        if (o instanceof List<?> l) {
            return l;
        }
        if (o instanceof Object[] a) {
            return List.of(a);
        }
        return List.of();
    }

    private static void expect(final String what, final boolean ok) {
        checks++;
        System.out.println((ok ? "  ok   " : "  FAIL ") + what);
        if (!ok) {
            FAILURES.add(what);
        }
    }
}
