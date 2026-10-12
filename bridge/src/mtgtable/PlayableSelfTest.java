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
 * <p><b>Amendment M63, decision D420: {@code state.activatable}</b>, the
 * battlefield's half, on real cards (the LLM seat guessed these from card text
 * and missed every family the regex did not know):
 *
 * <ol start="6">
 *   <li><b>Seat 0's main phase:</b> {@link Playables#activatable} lists Jace,
 *       the Mind Sculptor's +2, 0 and -1 (not the -12 at loyalty 3), Samurai's
 *       Katana's named equip ("Murasame -- Equip {5}"), a Clue token's
 *       "{2}, Sacrifice", Smuggler's Copter's Crew 1; never an Island's mana
 *       ability, a vanilla creature, or any of seat 1's permanents.</li>
 *   <li><b>No creature in play:</b> the Katana's equip and Jace's -1 (no
 *       target) are not listed; the +2, the 0 and the Clue are.</li>
 *   <li><b>Jace already activated this turn:</b> it is not listed.</li>
 *   <li><b>Seat 1's turn, seat 0 holding priority:</b> the Clue and the crew
 *       (instant speed) are, Jace and the equip (sorcery speed) are not.</li>
 *   <li><b>{@link Snap#state}</b> writes {@code activatable} with labels, null
 *       off the priority, no key with no seat; drops a hostile entry (seat 1's
 *       Jace, a card in hand dressed as a battlefield one); and
 *       {@code playable} never names a battlefield card.</li>
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
        onGameThread(() -> {
            run();
            runActivatable();
            runConfirmFirst();
        });
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


    private static final String JACE = "Jace, the Mind Sculptor";
    private static final String KATANA = "Samurai's Katana";
    private static final String COPTER = "Smuggler's Copter";
    private static final String BEARS = "Grizzly Bears";
    private static final String CLUE = "Clue Token";

    /** Amendment M63 (D420): {@code state.activatable}, the battlefield's half. */
    private static void runActivatable() {
        // 6. Seat 0's main phase.
        {
            final Game g = battlefield("p0");
            final Player me = g.getPlayers().get(0);
            final List<Snap.Playable> list = Playables.activatable(me);
            final Map<String, Snap.Playable> got = byName(list);
            System.out.println("  activatable (main): " + describe(list));
            expect("act main: " + JACE + " is listed " + got.keySet(), got.containsKey(JACE));
            final Snap.Playable jace = got.get(JACE);
            if (jace != null) {
                final List<String> labels = labels(jace);
                expect("act main: Jace has exactly three loyalty abilities at loyalty 3 " + labels, labels.size() == 3);
                expect("act main: Jace's +2 is one", labels.stream().anyMatch((l) -> l.startsWith("+2")));
                expect("act main: Jace's 0 is one", labels.stream().anyMatch((l) -> l.startsWith("0")));
                expect("act main: Jace's -1 is one", labels.stream().anyMatch((l) -> l.startsWith("-1")));
                expect("act main: Jace's -12 is not (loyalty 3)", labels.stream().noneMatch((l) -> l.startsWith("-12")));
                expect("act main: every ability is an ability, not a spell",
                        jace.abilities().stream().noneMatch(SpellAbilityView::isSpell));
                expect("act main: the zone is battlefield", "battlefield".equals(jace.zone()));
            }
            expect("act main: " + KATANA + "'s equip is listed", got.containsKey(KATANA)
                    && labels(got.get(KATANA)).stream().anyMatch((l) -> l.contains("Equip")));
            expect("act main: the Clue's \"{2}, Sacrifice\" is listed", got.containsKey(CLUE)
                    && labels(got.get(CLUE)).stream().anyMatch((l) -> l.contains("Draw a card")));
            expect("act main: " + COPTER + "'s Crew is listed", got.containsKey(COPTER)
                    && labels(got.get(COPTER)).stream().anyMatch((l) -> l.toLowerCase().contains("crew")));
            expect("act main: the Island's mana ability is not", !got.containsKey("Island"));
            expect("act main: " + BEARS + " (no ability) is not", !got.containsKey(BEARS));
            for (final Snap.Playable p : list) {
                expect("act main: " + p.card().getName() + " is controlled by seat 0",
                        p.card().getController().getId() == me.getView().getId());
            }
            expect("act main: no entry is seat 1's (" + list.size() + " entries, seat 1 has a Jace and a Clue)",
                    list.stream().allMatch((p) -> p.card().getController().getId() == me.getView().getId()));

            // 9. What Snap writes.
            final PlayerView viewer = me.getView();
            final String raw = Snap.state("activatable-selftest", g.getView(), viewer, List.of(),
                    comfort(Playables.of(me), list));
            final Map<?, ?> st = (Map<?, ?>) Json.parse(raw);
            final List<?> al = list(st.get("activatable"));
            expect("Snap: state.activatable is written (" + al.size() + " entries)", al.size() == list.size());
            boolean shape = true;
            for (final Object o : al) {
                final Map<?, ?> e = (Map<?, ?>) o;
                shape &= "battlefield".equals(e.get("zone")) && e.get("cardId") instanceof Number && e.keySet().size() == 3;
                for (final Object a : list(e.get("abilities"))) {
                    final Map<?, ?> m = (Map<?, ?>) a;
                    shape &= m.get("label") instanceof String sl && !sl.isEmpty() && !"???".equals(sl);
                    shape &= m.get("abilityId") instanceof Number && Boolean.FALSE.equals(m.get("isSpell")) && m.keySet().size() == 3;
                }
            }
            expect("Snap: every activatable entry is {cardId, zone: battlefield, abilities: [{abilityId, label, isSpell:false}]}", shape);
            final int at = raw.indexOf("\"activatable\":");
            final int end = raw.indexOf(",\"events\":", at);
            System.out.println("  activatable JSON: " + (at >= 0 && end > at ? raw.substring(at, end) : "(not found)"));
            boolean noField = true;
            for (final Object o : list(st.get("playable"))) {
                noField &= !"battlefield".equals(((Map<?, ?>) o).get("zone"));
            }
            expect("Snap: state.playable still names no battlefield card", noField);
            final Map<?, ?> off = (Map<?, ?>) Json.parse(Snap.state("activatable-selftest", g.getView(), viewer, List.of(),
                    comfort(null, null)));
            expect("Snap: off the seat's priority, activatable is written as null",
                    off.containsKey("activatable") && off.get("activatable") == null);
            final Map<?, ?> none = (Map<?, ?>) Json.parse(Snap.state("activatable-selftest", g.getView(), viewer, List.of()));
            expect("Snap: with no seat the activatable key is absent", !none.containsKey("activatable"));

            final Player opp = g.getPlayers().get(1);
            final List<Snap.Playable> hostile = new ArrayList<>();
            for (final Card c : opp.getCardsIn(ZoneType.Battlefield)) {
                if (JACE.equals(c.getName())) {
                    hostile.add(new Snap.Playable(c.getView(), "battlefield", views(c, opp)));
                }
            }
            for (final Card c : me.getCardsIn(ZoneType.Hand)) {
                hostile.add(new Snap.Playable(c.getView(), "battlefield", views(c, me)));
            }
            expect("control: the hostile activatable comfort hands over " + hostile.size() + " entries", hostile.size() >= 2);
            final Map<?, ?> h = (Map<?, ?>) Json.parse(Snap.state("activatable-selftest", g.getView(), viewer, List.of(),
                    comfort(List.of(), hostile)));
            expect("Snap: an activatable entry for the opponent's permanent or a card in hand is dropped",
                    list(h.get("activatable")).isEmpty());

            // 7. Jace already used this turn.
            for (final Card c : me.getCardsIn(ZoneType.Battlefield)) {
                if (JACE.equals(c.getName())) {
                    c.addPlaneswalkerAbilityActivated();
                }
            }
            final Map<String, Snap.Playable> after = byName(Playables.activatable(me));
            expect("act used: Jace is not listed once a loyalty ability was activated this turn " + after.keySet(),
                    !after.containsKey(JACE));
            expect("act used: the Clue still is", after.containsKey(CLUE));
        }

        // 6b. No creature on the battlefield: an equip and Jace's -1 have no target.
        {
            final Game g = battlefield("p0", false);
            final Map<String, Snap.Playable> got = byName(Playables.activatable(g.getPlayers().get(0)));
            expect("act no creature: the Katana's equip is not listed (no creature to equip) " + got.keySet(), !got.containsKey(KATANA));
            final List<String> jl = labels(got.get(JACE));
            expect("act no creature: Jace's +2 and 0 are listed, the -1 is not (no creature to return) " + jl,
                    jl.size() == 2 && jl.stream().noneMatch((l) -> l.startsWith("-1")));
            expect("act no creature: the Clue still is", got.containsKey(CLUE));
        }

        // 8. Seat 1's turn; seat 0 holds priority.
        {
            final Game g = battlefield("p1");
            final Player me = g.getPlayers().get(0);
            givePriority(g, me);
            final Map<String, Snap.Playable> got = byName(Playables.activatable(me));
            expect("act their turn: the Clue is listed (instant speed) " + got.keySet(), got.containsKey(CLUE));
            expect("act their turn: the Copter's Crew is listed (instant speed)", got.containsKey(COPTER));
            expect("act their turn: Jace is not (sorcery speed)", !got.containsKey(JACE));
            expect("act their turn: the Katana's equip is not (sorcery speed)", !got.containsKey(KATANA));
            givePriority(g, g.getPlayers().get(1));
            final Map<?, ?> theirs = (Map<?, ?>) Json.parse(Snap.state("activatable-selftest", g.getView(), me.getView(),
                    List.of(), comfort(Playables.of(me), Playables.activatable(me))));
            expect("Snap: a frame whose priority is the opponent's writes activatable null, whatever the comfort says",
                    theirs.containsKey("activatable") && theirs.get("activatable") == null);
        }
    }

    private static List<String> labels(final Snap.Playable p) {
        final List<String> out = new ArrayList<>();
        if (p != null) {
            for (final SpellAbilityView v : p.abilities()) {
                out.add(String.valueOf(v.getDescription()));
            }
        }
        return out;
    }

    private static String describe(final List<Snap.Playable> list) {
        final StringBuilder b = new StringBuilder();
        for (final Snap.Playable p : list) {
            b.append(p.card().getName()).append(labels(p)).append("; ");
        }
        return b.toString();
    }

    /** Seat 0 and seat 1 each have permanents with activated abilities; {@code turn} is "p0" or "p1". */
    private static Game battlefield(final String turn) {
        return battlefield(turn, true);
    }

    /**
     * Amendment M69 (D427): {@link Playables#confirmFirst} -- the abilities a
     * click on the seat's own permanent must not activate on its own.  Carrion
     * Feeder's "Sacrifice a creature" (the owner's game, 2026-10-10) and
     * Sakura-Tribe Elder's "Sacrifice this" are in it; a Forest's tap for
     * mana, which Forge can undo, is not; a Treasure's "{T}, Sacrifice: add
     * mana" is a mana ability Forge cannot undo, so it is; and the opponent's
     * own Carrion Feeder never is.
     */
    private static void runConfirmFirst() {
        final Deck dummy = new Deck("confirm-first");
        dummy.getMain().add(FModel.getMagicDb().getCommonCards().getCard("Island"), 20);
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
        final Game game = new Match(rules, regs, "confirm-first-selftest").createGame();
        final GameState gs = new GameState();
        gs.parse(List.of(
                "turn=3",
                "activeplayer=p0",
                "activephase=" + PhaseType.MAIN1.name(),
                "p0life=20",
                "p1life=20",
                "p0hand=Island",
                "p0battlefield=Carrion Feeder;Sakura-Tribe Elder;Forest;T:c_a_treasure_sac",
                "p0library=Forest;Island;Island",
                "p1battlefield=Carrion Feeder;Island",
                "p1library=Island;Island;Island"));
        gs.applyToGame(game);
        givePriority(game, game.getPlayers().get(0));
        final Player me = game.getPlayers().get(0);
        final java.util.Set<Integer> ids = Playables.confirmFirst(me);
        final Map<String, List<Integer>> byCard = new HashMap<>();
        for (final Player p : game.getPlayers()) {
            for (final Card c : p.getCardsIn(ZoneType.Battlefield)) {
                final List<Integer> mine = new ArrayList<>();
                for (final SpellAbility sa : c.getAllPossibleAbilities(me, true)) {
                    mine.add(Integer.valueOf(sa.getId()));
                }
                byCard.put((p == me ? "" : "their ") + c.getName(), mine);
            }
        }
        System.out.println("  confirmFirst: " + ids + " of " + byCard);
        final java.util.function.Predicate<String> all = (n) -> byCard.containsKey(n) && !byCard.get(n).isEmpty()
                && ids.containsAll(byCard.get(n));
        final java.util.function.Predicate<String> none = (n) -> byCard.containsKey(n)
                && byCard.get(n).stream().noneMatch(ids::contains);
        expect("confirm-first: Carrion Feeder's \"Sacrifice a creature\" asks before it activates", all.test("Carrion Feeder"));
        expect("confirm-first: Sakura-Tribe Elder's \"Sacrifice this\" asks too", all.test("Sakura-Tribe Elder"));
        expect("confirm-first: a Forest's tap for mana (undoable) keeps the click", none.test("Forest"));
        expect("confirm-first: a Treasure's \"{T}, Sacrifice: add mana\" (not undoable) asks",
                byCard.keySet().stream().filter((n) -> n.contains("Treasure")).anyMatch(all));
        expect("confirm-first: the opponent's Carrion Feeder is never the seat's", none.test("their Carrion Feeder"));
    }

    private static Game battlefield(final String turn, final boolean bears) {
        final Deck dummy = new Deck("activatable");
        dummy.getMain().add(FModel.getMagicDb().getCommonCards().getCard("Island"), 20);
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
        final Game game = new Match(rules, regs, "activatable-selftest").createGame();
        final GameState gs = new GameState();
        gs.parse(List.of(
                "turn=3",
                "activeplayer=" + turn,
                "activephase=" + PhaseType.MAIN1.name(),
                "p0life=20",
                "p1life=20",
                "p0hand=Island",
                "p0battlefield=" + JACE + "|Counters:LOYALTY=3;" + KATANA + ";T:c_a_clue_draw;" + COPTER + (bears ? ";" + BEARS : "")
                        + ";Island;Island;Island;Island;Island;Island",
                "p0library=Island;Island;Island",
                "p1battlefield=" + JACE + "|Counters:LOYALTY=3;T:c_a_clue_draw;Island;Island",
                "p1library=Island;Island;Island"));
        gs.applyToGame(game);
        givePriority(game, game.getPlayers().get("p1".equals(turn) ? 1 : 0));
        return game;
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
        return comfort(playable, null);
    }

    /** A comfort that answers {@code playable} and {@code activatable} (M63). */
    private static Snap.Comfort comfort(final List<Snap.Playable> playable, final List<Snap.Playable> activatable) {
        return new Snap.Comfort() {
            @Override public List<String> stopsOnTurnOf(final int playerId) { return List.of(); }
            @Override public List<String> stopsOffTurnOf(final int playerId) { return List.of(); }
            @Override public String yieldJson() { return null; }
            @Override public String undoJson() { return "{\"can\":false,\"depth\":0}"; }
            @Override public String yieldHandle(final StackItemView si) { return null; }
            @Override public String yieldMode(final StackItemView si) { return null; }
            @Override public List<Snap.Playable> playable() { return playable; }
            @Override public List<Snap.Playable> activatable() { return activatable; }
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
