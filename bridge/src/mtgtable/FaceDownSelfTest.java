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
import forge.game.ability.AbilityFactory;
import forge.game.ability.AbilityUtils;
import forge.game.card.Card;
import forge.game.player.Player;
import forge.game.player.PlayerView;
import forge.game.player.RegisteredPlayer;
import forge.game.spellability.SpellAbility;
import forge.game.zone.ZoneType;
import forge.model.FModel;

import mtgtable.ai.PolicyLobbyPlayerAi;

/**
 * D371's reproduction: <b>who may see the face of a face-down card</b>, the
 * lab's rule A9 finding (night 2, J059: 684 quarantined recordings, about 90 %
 * of them A9 -- an opponent-owned, opponent-controlled face-down card in exile
 * carrying an {@code alt} block in the other seat's log).
 *
 * <p>One engine boot, one hand-built position through Forge's own
 * {@link GameState} loader, then the exact calls Forge's {@code DigEffect}
 * makes for {@code ExileFaceDown$ True} and {@code WithMayLook$ True}
 * ({@code javap -c forge.game.ability.effects.DigEffect} on the pinned 2.0.14
 * jar: the moved card's {@code turnFaceDown(true)}, then
 * {@code addMayLookFaceDownExile(activator)}).  Every frame is
 * {@link Snap#state} for one viewer, parsed back:
 *
 * <ol>
 *   <li><b>Gonti / Thief of Sanity:</b> seat 0's effect exiles seat 1's top
 *       card face down with a look permission for seat 0.  Seat 0 sees its
 *       {@code alt} (Forge's {@code canFaceDownBeShownTo} opens with
 *       {@code mayPlayerLook(viewer)}, and Gonti's controller may look at and
 *       cast that card); seat 1, its owner, does not.  This is the A9 report:
 *       the bridge is right and the checker was not.</li>
 *   <li><b>Bomat Courier:</b> a card exiled face down with no permission
 *       ("You can't look at it") is the five-key stub for either seat, its
 *       owner included ({@code canBeShownTo} answers a face-down card in exile
 *       with {@code mayPlayerLook} alone).  Gonti's card is the stub for its
 *       owner the same way.</li>
 *   <li><b>A face-down permanent</b> (morph, manifest, cloak, disguise): its
 *       controller sees {@code alt}, the other seat does not; neither sees a
 *       name.</li>
 *   <li><b>Back to hand</b>, the night's other finding ("the viewer's own hand
 *       card has no name"): a face-down exiled card moved to its owner's hand
 *       (Bomat Courier's sacrifice, Watcher for Tomorrow's leave trigger), and a
 *       card Kitesail Freebooter took "until it leaves" (its own trigger
 *       resolved through {@code AbilityUtils.resolve}, then the Freebooter put
 *       into the graveyard), are face up and named for their owner and the
 *       five-key stub for the other seat.  Neither path reproduces the
 *       finding; the checker now names the stub's controller and where the
 *       card was last seen, so the next quarantine does.</li>
 *   <li><b>The labels</b> ({@link Snap#label}) of every one of these cards name
 *       nothing face down, for either seat.</li>
 * </ol>
 *
 * <p>Usage: {@code ./bridge/run.sh mtgtable.FaceDownSelfTest} -- the Forge
 * home is the config's.  One JVM, about 30 s, almost all of it
 * {@code FModel.initialize}.  Step 12j of {@code tools/check-all.sh}.
 */
public final class FaceDownSelfTest {

    private FaceDownSelfTest() { }

    private static int checks;
    private static final List<String> FAILURES = new ArrayList<>();

    /** Seat 1's library, top first: the first is Gonti's, the second Bomat's own. */
    private static final String GONTI_TAKES = "Llanowar Elves";
    private static final String BOMAT_HIDES = "Giant Growth";
    private static final String MORPH = "Grizzly Bears";
    private static final String FREEBOOTER = "Kitesail Freebooter";
    private static final String BOLT = "Lightning Bolt";

    public static void main(final String[] args) throws Exception {
        final Config cfg = Config.load();
        Bootstrap.installGui(cfg.forgeHomeDir());   // hard rule 1: the first Forge call
        Bootstrap.initializeModel(false);

        final List<String[]> frames = new ArrayList<>();   // {what, viewer 0's state, viewer 1's state}
        final List<String[]> labels = new ArrayList<>();   // {what, label for 0, label for 1}
        final int[] ids = new int[4];                       // gonti's card, bomat's card, the morph, the Bolt
        onGameThread(() -> run(frames, labels, ids));

        final int gonti = ids[0];
        final int bomat = ids[1];
        final int morph = ids[2];

        // 1. Gonti's card: in seat 1's exile, face down; seat 0 may look.
        final Map<?, ?> g0 = card(frames, "exiled", 0, gonti);
        final Map<?, ?> g1 = card(frames, "exiled", 1, gonti);
        expect("gonti: seat 0's frame has the card in seat 1's exile", g0 != null && "exile".equals(g0.get("zone")));
        expect("gonti: seat 1's frame has it too", g1 != null && "exile".equals(g1.get("zone")));
        if (g0 != null && g1 != null) {
            expect("gonti: face down and nameless for seat 0", Boolean.TRUE.equals(g0.get("faceDown")) && "".equals(g0.get("name")));
            expect("gonti: owned and controlled by seat 1",
                    num(g0.get("owner")) == 1 && num(g0.get("controller")) == 1);
            expect("gonti: seat 0, whose effect may look at it, gets alt naming " + GONTI_TAKES + " " + g0.get("alt"),
                    g0.get("alt") instanceof Map<?, ?> a && GONTI_TAKES.equals(a.get("name")));
            expect("gonti: seat 1, its owner, gets the five-key stub " + g1.keySet(),
                    Boolean.TRUE.equals(g1.get("hidden")) && g1.size() == 5);
        }

        // 2. Bomat's card: in seat 1's exile, face down, nobody may look.
        final Map<?, ?> b0 = card(frames, "exiled", 0, bomat);
        final Map<?, ?> b1 = card(frames, "exiled", 1, bomat);
        expect("bomat: both frames have the card", b0 != null && b1 != null);
        if (b0 != null && b1 != null) {
            expect("bomat: the five-key stub for seat 0 " + b0.keySet(), Boolean.TRUE.equals(b0.get("hidden")) && b0.size() == 5);
            expect("bomat: the five-key stub for seat 1, its owner and controller (\"You can't look at it\") " + b1.keySet(),
                    Boolean.TRUE.equals(b1.get("hidden")) && b1.size() == 5);
        }

        // 3. The face-down permanent on seat 1's battlefield.
        final Map<?, ?> m0 = card(frames, "exiled", 0, morph);
        final Map<?, ?> m1 = card(frames, "exiled", 1, morph);
        expect("morph: both frames have it on the battlefield", m0 != null && m1 != null
                && "battlefield".equals(m0.get("zone")) && "battlefield".equals(m1.get("zone")));
        if (m0 != null && m1 != null) {
            expect("morph: face down, no name for either seat", Boolean.TRUE.equals(m0.get("faceDown"))
                    && "".equals(m0.get("name")) && "".equals(m1.get("name")));
            expect("morph: seat 0 (not its controller) gets alt: null", m0.get("alt") == null);
            expect("morph: seat 1 (its controller) gets alt naming " + MORPH,
                    m1.get("alt") instanceof Map<?, ?> a && MORPH.equals(a.get("name")));
        }

        // 4. Back to the owner's hand: both exiled cards (seat 1's), the Bolt (seat 0's).
        for (final int[] idOwner : new int[][] {{gonti, 1}, {bomat, 1}, {ids[3], 0}}) {
            final int id = idOwner[0];
            final int owner = idOwner[1];
            final Map<?, ?> mine = card(frames, "returned", owner, id);
            final Map<?, ?> theirs = card(frames, "returned", 1 - owner, id);
            expect("hand " + id + ": both frames have it in seat " + owner + "'s hand", mine != null && theirs != null
                    && "hand".equals(mine.get("zone")) && "hand".equals(theirs.get("zone")));
            if (mine != null && theirs != null) {
                expect("hand " + id + ": the other seat gets the five-key stub " + theirs.keySet(),
                        Boolean.TRUE.equals(theirs.get("hidden")) && theirs.size() == 5);
                expect("hand " + id + ": seat " + owner + ", its owner, gets it face up and named (" + mine.get("name") + ")",
                        !Boolean.TRUE.equals(mine.get("hidden")) && !Boolean.TRUE.equals(mine.get("faceDown"))
                        && mine.get("name") instanceof String s && !s.isEmpty() && mine.get("alt") == null
                        && num(mine.get("controller")) == owner);
            }
        }

        // 5. Labels never name a face-down card.
        for (final String[] l : labels) {
            expect("label " + l[0] + " for seat 0 is \"" + l[1] + "\"", !l[1].contains(GONTI_TAKES)
                    && !l[1].contains(BOMAT_HIDES) && !l[1].contains(MORPH));
            expect("label " + l[0] + " for seat 1 is \"" + l[2] + "\"", !l[2].contains(GONTI_TAKES)
                    && !l[2].contains(BOMAT_HIDES) && !l[2].contains(MORPH));
        }

        System.out.println("FaceDownSelfTest: " + checks + " check(s), " + FAILURES.size() + " failure(s)");
        for (final String f : FAILURES) {
            System.out.println("  FAIL " + f);
        }
        System.out.flush();
        System.exit(FAILURES.isEmpty() ? 0 : 1);   // Forge leaves non-daemon pools behind
    }

    /** On the game thread: the position, the three face-down cards, two frames per viewer. */
    private static void run(final List<String[]> frames, final List<String[]> labels, final int[] ids) {
        final Game game = position();
        final Player p0 = game.getPlayers().get(0);
        final Player p1 = game.getPlayers().get(1);
        final PlayerView v0 = p0.getView();
        final PlayerView v1 = p1.getView();

        // Gonti / Thief of Sanity: DigEffect's ExileFaceDown + WithMayLook, activator seat 0.
        Card gonti = top(p1, GONTI_TAKES);
        gonti = game.getAction().exile(gonti, null, null);
        gonti.turnFaceDown(true);
        gonti.addMayLookFaceDownExile(p0);
        // Bomat Courier: ExileFaceDown, NoReveal, no look permission; seat 1's own card.
        Card bomat = top(p1, BOMAT_HIDES);
        bomat = game.getAction().exile(bomat, null, null);
        bomat.turnFaceDown(true);
        // A face-down permanent of seat 1's.
        Card morph = null;
        for (final Card c : p1.getCardsIn(ZoneType.Battlefield)) {
            if (MORPH.equals(c.getName())) {
                morph = c;
            }
        }
        if (morph == null) {
            throw new IllegalStateException("the position has no " + MORPH + " on seat 1's battlefield");
        }
        morph.turnFaceDown(true);
        ids[0] = gonti.getId();
        ids[1] = bomat.getId();
        ids[2] = morph.getId();

        frames.add(new String[] {"exiled",
            Snap.state("facedown-selftest", game.getView(), v0, List.of()),
            Snap.state("facedown-selftest", game.getView(), v1, List.of())});
        for (final Card c : new Card[] {gonti, bomat, morph}) {
            labels.add(new String[] {Integer.toString(c.getId()), Snap.label(c.getView(), v0), Snap.label(c.getView(), v1)});
        }

        // Kitesail Freebooter (seat 1): its own trigger takes seat 0's Lightning Bolt
        // "until it leaves the battlefield"; then it leaves.
        Card freebooter = null;
        for (final Card c : p1.getCardsIn(ZoneType.Battlefield)) {
            if (FREEBOOTER.equals(c.getName())) {
                freebooter = c;
            }
        }
        if (freebooter == null) {
            throw new IllegalStateException("the position has no " + FREEBOOTER + " on seat 1's battlefield");
        }
        final SpellAbility take = AbilityFactory.getAbility(freebooter, "TrigReveal");
        take.setActivatingPlayer(p1);
        take.getTargets().add(p0);
        AbilityUtils.resolve(take);
        for (final Card c : p0.getCardsIn(ZoneType.Exile)) {
            if (BOLT.equals(c.getName())) {
                ids[3] = c.getId();
            }
        }
        if (ids[3] == 0) {
            throw new IllegalStateException(FREEBOOTER + "'s trigger did not exile seat 0's " + BOLT);
        }
        game.getAction().moveToGraveyard(freebooter, null);

        // Bomat Courier's sacrifice / Watcher for Tomorrow's leave trigger: exile -> owner's hand.
        game.getAction().moveToHand(gonti, null);
        game.getAction().moveToHand(bomat, null);
        frames.add(new String[] {"returned",
            Snap.state("facedown-selftest", game.getView(), v0, List.of()),
            Snap.state("facedown-selftest", game.getView(), v1, List.of())});
    }

    private static Card top(final Player p, final String name) {
        for (final Card c : p.getCardsIn(ZoneType.Library)) {
            if (name.equals(c.getName())) {
                return c;
            }
        }
        throw new IllegalStateException("seat " + p.getId() + "'s library has no " + name);
    }

    /** Seat 1: a face-up {@value #MORPH} to turn face down, a {@value #FREEBOOTER}, two named library cards; seat 0: a {@value #BOLT} in hand. */
    private static Game position() {
        final Deck dummy = new Deck("facedown");
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
        final Game game = new Match(rules, regs, "facedown-selftest").createGame();
        final GameState gs = new GameState();
        gs.parse(List.of(
                "turn=3",
                "activeplayer=p0",
                "activephase=MAIN1",
                "p0life=20",
                "p1life=20",
                "p0battlefield=Swamp;Swamp;Swamp;Swamp",
                "p0hand=" + BOLT + ";Swamp",
                "p0library=Swamp;Swamp;Swamp",
                "p1battlefield=" + MORPH + ";" + FREEBOOTER + ";Forest;Forest",
                "p1library=" + GONTI_TAKES + ";" + BOMAT_HIDES + ";Forest;Forest"));
        gs.applyToGame(game);
        return game;
    }

    /** Run {@code body} as the one task on Forge's game pool (MidMoveSelfTest's way), and wait. */
    private static void onGameThread(final Runnable body) throws Exception {
        final Deck dummy = new Deck("facedown-start");
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
        final Game scratch = new Match(rules, regs, "facedown-start").createGame();
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

    /** The card with this id anywhere in the frame {@code what} as {@code viewer} saw it, or null. */
    private static Map<?, ?> card(final List<String[]> frames, final String what, final int viewer, final int id) {
        for (final String[] f : frames) {
            if (!what.equals(f[0])) {
                continue;
            }
            final Map<?, ?> state = (Map<?, ?>) Json.parse(f[1 + viewer]);
            for (final Object p : list(state.get("players"))) {
                final Map<?, ?> zones = (Map<?, ?>) ((Map<?, ?>) p).get("zones");
                for (final Object z : zones.values()) {
                    for (final Object c : list(((Map<?, ?>) z).get("cards"))) {
                        if (num(((Map<?, ?>) c).get("id")) == id) {
                            return (Map<?, ?>) c;
                        }
                    }
                }
            }
        }
        return null;
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
