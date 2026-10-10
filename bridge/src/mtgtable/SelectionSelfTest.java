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
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import forge.deck.Deck;
import forge.game.Game;
import forge.game.GameRules;
import forge.game.GameState;
import forge.game.GameType;
import forge.game.Match;
import forge.game.card.Card;
import forge.game.combat.Combat;
import forge.game.phase.PhaseType;
import forge.game.player.Player;
import forge.game.player.RegisteredPlayer;
import forge.game.spellability.SpellAbility;
import forge.game.zone.ZoneType;
import forge.model.FModel;

import mtgtable.ai.PolicyLobbyPlayerAi;

/**
 * <b>Amendments M65 and M66, decisions D422 and D423: {@link InputPeek} on real
 * cards.</b>  The live half -- a scripted seat clicking through Forge's own
 * inputs on {@code /ws} -- is {@code tools/ws-select-probe.mjs}; this is the
 * rule half, deterministic, on positions built with Forge's own
 * {@link GameState} loader, seat 0 the viewer:
 *
 * <ol>
 *   <li><b>The fields InputPeek reads by name exist</b> in this engine
 *       ({@code InputSelectTargets.targets / sa / filter / mustTargetFiltered},
 *       D423) -- an engine that moved one sends null, and this says so.</li>
 *   <li><b>{@code onPlayerSelected}'s rule</b>, through
 *       {@link InputPeek#targetablePlayers}: Lightning Bolt ("any target")
 *       lists both seats; Into the Void (creatures) none; Duress ("target
 *       opponent") only seat 1; Curse of the Pierced Heart (an Aura that
 *       enchants a player) both; with Leyline of Sanctity on seat 1 (its
 *       controller has hexproof) Bolt and the Curse list seat 0 alone and
 *       Duress nobody; a player already targeted is listed (the click takes it
 *       back); a must-target filter that narrowed the choice to cards lists
 *       nobody; a caller's filter is applied.</li>
 *   <li><b>A declaration read off the game's {@link Combat}</b>: the blocks
 *       seat 0 has declared (one row per pair, only its own blockers); the
 *       attacks seat 0 has declared, a player and a planeswalker as defender;
 *       the defending players {@code InputAttack} would take a click on.</li>
 * </ol>
 *
 * <p>Usage: {@code ./bridge/run.sh mtgtable.SelectionSelfTest}.  One JVM,
 * about 30 s, almost all of it {@code FModel.initialize}.  Step 12l of
 * {@code tools/check-all.sh}, beside {@code PlayableSelfTest}.
 */
public final class SelectionSelfTest {

    private SelectionSelfTest() { }

    private static int checks;
    private static final List<String> FAILURES = new ArrayList<>();

    public static void main(final String[] args) throws Exception {
        final Config cfg = Config.load();
        Bootstrap.installGui(cfg.forgeHomeDir());   // hard rule 1: the first Forge call
        Bootstrap.initializeModel(false);
        expect("InputPeek can read InputSelectTargets' targets, sa, filter and mustTargetFiltered (D423)",
                InputPeek.targetsReadable());
        onGameThread(() -> {
            players(false);
            players(true);
            declarations();
        });
        System.out.println("SelectionSelfTest: " + checks + " check(s), " + FAILURES.size() + " failure(s)");
        for (final String f : FAILURES) {
            System.out.println("  FAIL " + f);
        }
        System.out.flush();
        System.exit(FAILURES.isEmpty() ? 0 : 1);   // Forge leaves non-daemon pools behind
    }

    /** M66: which players a click in InputSelectTargets is taken for. */
    private static void players(final boolean leyline) {
        final Game g = position(leyline);
        final Player me = g.getPlayers().get(0);
        final Player opp = g.getPlayers().get(1);
        final String tag = leyline ? "leyline: " : "";
        final List<Integer> both = List.of(me.getId(), opp.getId());
        final List<Integer> mine = List.of(me.getId());
        final List<Integer> theirs = List.of(opp.getId());

        final SpellAbility bolt = spell(me, "Lightning Bolt");
        final SpellAbility voidSa = spell(me, "Into the Void");
        final SpellAbility duress = spell(me, "Duress");
        final SpellAbility curse = spell(me, "Curse of the Pierced Heart");
        expect(tag + "the four spells are in seat 0's hand", bolt != null && voidSa != null && duress != null && curse != null);
        if (bolt == null || voidSa == null || duress == null || curse == null) {
            return;
        }
        final List<Integer> b = InputPeek.targetablePlayers(bolt, g.getPlayers(), Set.of(), null, false);
        expect(tag + "Lightning Bolt (any target) lists " + (leyline ? "seat 0 alone" : "both seats") + " " + b,
                b.equals(leyline ? mine : both));
        final List<Integer> v = InputPeek.targetablePlayers(voidSa, g.getPlayers(), Set.of(), null, false);
        expect(tag + "Into the Void (creatures only) lists no player " + v, v.isEmpty());
        final List<Integer> d = InputPeek.targetablePlayers(duress, g.getPlayers(), Set.of(), null, false);
        expect(tag + "Duress (target opponent) lists " + (leyline ? "nobody" : "seat 1 alone") + " " + d,
                d.equals(leyline ? List.of() : theirs));
        final List<Integer> c = InputPeek.targetablePlayers(curse, g.getPlayers(), Set.of(), null, false);
        expect(tag + "Curse of the Pierced Heart (enchant player) lists " + (leyline ? "seat 0 alone" : "both seats") + " " + c,
                c.equals(leyline ? mine : both));
        if (!leyline) {
            final List<Integer> again = InputPeek.targetablePlayers(duress, g.getPlayers(), Set.of(opp), null, false);
            expect("a player already targeted is listed (a click takes it back) " + again, again.equals(theirs));
            final List<Integer> must = InputPeek.targetablePlayers(bolt, g.getPlayers(), Set.of(), null, true);
            expect("a must-target filter that narrowed the choice to cards lists nobody " + must, must.isEmpty());
            final List<Integer> filtered = InputPeek.targetablePlayers(bolt, g.getPlayers(), Set.of(),
                    (o) -> o != me, false);
            expect("the caller's filter applies (Bolt, not seat 0) " + filtered, filtered.equals(theirs));
        } else {
            final List<Integer> held = InputPeek.targetablePlayers(bolt, g.getPlayers(), Set.of(opp), null, false);
            expect("leyline: a hexproof player already targeted is still listed (the click takes it back) " + held,
                    held.equals(both));
        }
    }

    /** M65: a declaration, read off the game's own Combat. */
    private static void declarations() {
        final Game g = position(false);
        final Player me = g.getPlayers().get(0);
        final Player opp = g.getPlayers().get(1);
        final List<Card> ogres = named(me, "Gray Ogre");
        final List<Card> giants = named(opp, "Hill Giant");
        final List<Card> jace = named(opp, "Jace, the Mind Sculptor");
        expect("the creatures are on the battlefield (2 Gray Ogre, 2 Hill Giant, Jace)",
                ogres.size() == 2 && giants.size() == 2 && jace.size() == 1);
        if (ogres.size() != 2 || giants.size() != 2 || jace.size() != 1) {
            return;
        }
        // Seat 1 attacks seat 0 with both giants; seat 0 has blocked one with an ogre.
        final Combat theirAttack = new Combat(opp);
        theirAttack.addAttacker(giants.get(0), me);
        theirAttack.addAttacker(giants.get(1), me);
        InputPeek.Chosen none = InputPeek.blocks(theirAttack, me);
        expect("blocks: nothing declared yet is four empty lists", none.cardIds().isEmpty() && none.blocks().isEmpty()
                && none.playerIds().isEmpty() && none.attacks().isEmpty());
        theirAttack.addBlocker(giants.get(0), ogres.get(0));
        final InputPeek.Chosen one = InputPeek.blocks(theirAttack, me);
        expect("blocks: the declared block is one row " + one.blocks(), one.blocks().equals(
                List.of(new InputPeek.Block(ogres.get(0).getId(), giants.get(0).getId()))));
        expect("blocks: chosen.cardIds is the blocker " + one.cardIds(), one.cardIds().equals(List.of(ogres.get(0).getId())));
        theirAttack.addBlocker(giants.get(1), ogres.get(1));
        final InputPeek.Chosen two = InputPeek.blocks(theirAttack, me);
        expect("blocks: a second block is a second row, ids ascending " + two.blocks(), two.blocks().size() == 2
                && two.blocks().get(0).blockerId() < two.blocks().get(1).blockerId());
        expect("blocks: seen from seat 1, none of them is its own", InputPeek.blocks(theirAttack, opp).blocks().isEmpty());

        // Seat 0 attacks: one ogre at the player, one at Jace.
        final Combat myAttack = new Combat(me);
        expect("InputAttack's defending players: seat 1 alone " + InputPeek.defenderPlayers(myAttack),
                InputPeek.defenderPlayers(myAttack).equals(List.of(opp.getId())));
        expect("attacks: nothing declared yet is empty", InputPeek.attacks(myAttack, me).attacks().isEmpty());
        myAttack.addAttacker(ogres.get(0), opp);
        myAttack.addAttacker(ogres.get(1), jace.get(0));
        final InputPeek.Chosen atk = InputPeek.attacks(myAttack, me);
        expect("attacks: two rows " + atk.attacks(), atk.attacks().size() == 2);
        expect("attacks: the first ogre attacks the player", atk.attacks().contains(
                new InputPeek.Attack(ogres.get(0).getId(), "player", opp.getId())));
        expect("attacks: the second attacks Jace, a card", atk.attacks().contains(
                new InputPeek.Attack(ogres.get(1).getId(), "card", jace.get(0).getId())));
        expect("attacks: chosen.cardIds is the two attackers " + atk.cardIds(), atk.cardIds().size() == 2
                && atk.cardIds().contains(ogres.get(0).getId()) && atk.cardIds().contains(ogres.get(1).getId()));
        expect("attacks: seen from seat 1, none of them is its own", InputPeek.attacks(myAttack, opp).attacks().isEmpty());
        expect("InputPeek.of(null) cannot say", InputPeek.of(null, me) == InputPeek.Facts.NONE);
    }

    private static SpellAbility spell(final Player p, final String name) {
        for (final Card c : p.getCardsIn(ZoneType.Hand)) {
            if (name.equals(c.getName())) {
                final SpellAbility sa = c.getFirstSpellAbility();
                if (sa != null) {
                    sa.setActivatingPlayer(p);
                }
                return sa;
            }
        }
        return null;
    }

    private static List<Card> named(final Player p, final String name) {
        final List<Card> out = new ArrayList<>();
        for (final Card c : p.getCardsIn(ZoneType.Battlefield)) {
            if (name.equals(c.getName())) {
                out.add(c);
            }
        }
        return out;
    }

    private static Game position(final boolean leyline) {
        final Deck dummy = new Deck("selection");
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
        final Game game = new Match(rules, regs, "selection-selftest").createGame();
        final GameState gs = new GameState();
        gs.parse(List.of(
                "turn=3",
                "activeplayer=p0",
                "activephase=" + PhaseType.MAIN1.name(),
                "p0life=20",
                "p1life=20",
                "p0hand=Lightning Bolt;Into the Void;Duress;Curse of the Pierced Heart",
                "p0battlefield=Gray Ogre;Gray Ogre;Mountain;Mountain;Island;Island;Swamp",
                "p0library=Mountain;Mountain;Mountain",
                "p1hand=Mountain",
                "p1battlefield=Hill Giant;Hill Giant;Jace, the Mind Sculptor|Counters:LOYALTY=3"
                        + (leyline ? ";Leyline of Sanctity" : "") + ";Mountain",
                "p1library=Mountain;Mountain;Mountain"));
        gs.applyToGame(game);
        game.getPhaseHandler().setPriority(game.getPlayers().get(0));
        return game;
    }

    /** Run {@code body} as the one task on Forge's game pool (PlayableSelfTest's way), and wait. */
    private static void onGameThread(final Runnable body) throws Exception {
        final Deck dummy = new Deck("selection-start");
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
        final Game scratch = new Match(rules, regs, "selection-start").createGame();
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

    private static void expect(final String what, final boolean ok) {
        checks++;
        System.out.println((ok ? "  ok   " : "  FAIL ") + what);
        if (!ok) {
            FAILURES.add(what);
        }
    }
}
