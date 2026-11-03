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

import forge.ai.ComputerUtil;
import forge.deck.Deck;
import forge.game.Game;
import forge.game.GameEntity;
import forge.game.GameRules;
import forge.game.GameState;
import forge.game.GameType;
import forge.game.Match;
import forge.game.card.Card;
import forge.game.card.CardCollectionView;
import forge.game.card.CardFactory;
import forge.game.combat.Combat;
import forge.game.phase.PhaseType;
import forge.game.player.Player;
import forge.game.player.RegisteredPlayer;
import forge.game.spellability.SpellAbility;
import forge.game.spellability.SpellAbilityStackInstance;
import forge.game.zone.ZoneType;
import forge.model.FModel;

import mtgtable.ai.Decision;
import mtgtable.ai.Decisions;
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
 *   <li><b>D507: a ghost in the stack zone is never a target record's
 *       option.</b>  Seat 1 casts Knockout Maneuver twice through Forge's own
 *       AI path with J183's targets (two on its first part): once
 *       {@code ComputerUtil.handlePlayingSpellAbility} returns at the target
 *       count, once {@code MagicStack.add} refuses it ("failed to target") --
 *       both leave the card in the Stack zone with nothing on the stack.  Then
 *       it casts Lightning Bolt for real, and seat 0's Counterspell answers.
 *       Forge's candidates list both ghosts (the negative control: the fault is
 *       live on this engine); seat 0's {@code target} record lists the Bolt
 *       alone and counts the two ghosts in {@code hidden}.  Seat 0's own spell
 *       moved to the Stack zone mid-cast is not a candidate of its own
 *       targeting.  And a copy is no ghost: with the stack frozen (as
 *       {@code resolveStack} freezes it), a copy of seat 0's Counterspell is
 *       added the way Forge's AI plays copies, its instance on the frozen stack
 *       where the stack's iterator does not look; the next copy's record still
 *       lists it, hidden 0, with no {@code [ghost]} line -- and the same once
 *       the stack is unfrozen.</li>
 *   <li><b>D508: a last-known copy is judged where the card is now.</b>  The
 *       game's last-state snapshot ({@code Game.copyLastState}, what
 *       {@code GameAction.changeZone} reads a leaving permanent's LKI from on
 *       this engine) holds a copy of seat 0's Cavern Harpy whose own zone says
 *       Battlefield; the Harpy then returns to seat 0's hand (the negative
 *       control: the copy keeps the id and the Battlefield zone while
 *       {@code getCardState} finds the card in the hand -- the fault is live).
 *       Seat 1's entity record over the divider, Grizzly Bears, the copy and
 *       the hand card lists the Bears alone and counts three hidden, with one
 *       {@code [lki]} line; a copy of a card that went to the graveyard is
 *       listed; a copy of seat 1's own creature that returned to its own hand
 *       is listed (its own hand is its own information).</li>
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
            ghosts();
            copies();
            lastKnown();
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

    /** D507: a card the engine left in the Stack zone with nothing on the stack is counted hidden, never listed. */
    private static void ghosts() {
        final Game g = ghostPosition();
        final Player me = g.getPlayers().get(0);
        final Player opp = g.getPlayers().get(1);
        final Card vis = only(named(opp, "Elvish Visionary"));
        final Card bears = only(named(opp, "Grizzly Bears"));
        final Card bugler = only(named(me, "Militia Bugler"));
        final SpellAbility km1 = spell(opp, "Knockout Maneuver");
        expect("ghosts: the position (Elvish Visionary, Grizzly Bears, Militia Bugler, two Knockout Maneuvers)",
                vis != null && bears != null && bugler != null && km1 != null);
        if (vis == null || bears == null || bugler == null || km1 == null) {
            return;
        }
        // Forge's own AI cast, J183's targets: two on "target creature you control" -- it returns at the count
        final boolean r1 = ComputerUtil.handlePlayingSpellAbility(opp, km1, sa -> twoOnFirstPart(sa, vis, bears, bugler));
        final Card ghost1 = km1.getHostCard();
        // the field's own path (J183's worker log): the tail after a payment, MagicStack.add refusing the spell
        final SpellAbility km2 = spell(opp, "Knockout Maneuver");
        Card ghost2 = null;
        if (km2 != null) {
            km2.setHostCard(g.getAction().moveToStack(km2.getHostCard(), km2));
            twoOnFirstPart(km2, vis, bears, bugler);
            g.getStack().freezeStack(km2);
            g.getStack().addAndUnfreeze(km2);
            ghost2 = km2.getHostCard();
        }
        expect("ghosts: the AI's cast returned false and both cards are in the Stack zone, the stack empty",
                !r1 && ghost2 != null && ghost1.isInZone(ZoneType.Stack) && ghost2.isInZone(ZoneType.Stack)
                        && g.getStack().isEmpty());
        if (ghost2 == null) {
            return;
        }
        final SpellAbility bolt = spell(opp, "Lightning Bolt");
        final boolean rb = bolt != null && ComputerUtil.handlePlayingSpellAbility(opp, bolt, sa -> {
            sa.resetTargets();
            sa.getTargets().add(me);
        });
        expect("ghosts: Lightning Bolt is on the stack, the one item there", rb && g.getStack().size() == 1
                && g.getStack().peekAbility().getHostCard().getId() == bolt.getHostCard().getId());
        if (!rb) {
            return;
        }
        final int boltId = bolt.getHostCard().getId();
        final SpellAbility cs = spell(me, "Counterspell");
        if (cs == null) {
            expect("ghosts: seat 0 holds Counterspell", false);
            return;
        }
        cs.resetTargets();
        cs.getTargets().add(g.getStack().peekAbility());
        final List<Integer> forge = new ArrayList<>();
        for (final GameEntity e : cs.getTargetRestrictions().getAllCandidates(cs, false)) {
            forge.add(e.getId());
        }
        expect("ghosts: Forge's candidates for Counterspell list both ghosts and the Bolt (the fault is live) " + forge,
                forge.contains(ghost1.getId()) && forge.contains(ghost2.getId()) && forge.contains(boltId));
        final List<Decision> recs = Decisions.targets(cs, me, "targets");
        final Decision d = recs.size() == 1 ? recs.get(0) : null;
        expect("ghosts: one target record " + recs.size(), d != null);
        if (d == null) {
            return;
        }
        expect("ghosts: the record lists the Bolt alone " + d.options, d.options.equals(List.of("target:" + boltId)));
        expect("ghosts: the record counts both ghosts hidden (" + d.hidden + ")", d.hidden == 2);
        expect("ghosts: the record answers the Bolt, complete", ("target:" + boltId).equals(d.chosen) && d.complete);
        // seat 0's own spell mid-cast: its card in the Stack zone, its instance not yet added
        final SpellAbility own = spell(me, "Counterspell");
        if (own != null) {
            own.setHostCard(g.getAction().moveToStack(own.getHostCard(), own));
            final Card self = own.getHostCard();
            boolean listsSelf = false;
            for (final GameEntity e : own.getTargetRestrictions().getAllCandidates(own, false)) {
                listsSelf |= e.getId() == self.getId();
            }
            boolean onStack = false;
            for (final SpellAbilityStackInstance si : g.getStack()) {
                onStack |= si.getSourceCard().getId() == self.getId();
            }
            expect("ghosts: a spell mid-cast (in the Stack zone, not on the stack) is no candidate of its own targeting",
                    self.isInZone(ZoneType.Stack) && !onStack && !own.canTarget(self) && !listsSelf);
        } else {
            expect("ghosts: seat 0 holds a second Counterspell", false);
        }
    }

    /** D507, the review: a spell copy whose instance is on the frozen stack is listed, never a ghost. */
    private static void copies() {
        final Game g = newGame("selection-copies");
        final GameState gs = new GameState();
        gs.parse(List.of(
                "turn=10",
                "activeplayer=p1",
                "activephase=" + PhaseType.MAIN1.name(),
                "p0life=20",
                "p1life=20",
                "p0hand=Counterspell",
                "p0battlefield=Island;Island;Island;Island",
                "p0library=Island;Island;Island",
                "p1hand=Lightning Bolt",
                "p1battlefield=Mountain;Mountain",
                "p1library=Mountain;Mountain;Mountain"));
        gs.applyToGame(g);
        g.getPhaseHandler().setPriority(g.getPlayers().get(1));
        final Player me = g.getPlayers().get(0);
        final Player opp = g.getPlayers().get(1);
        final SpellAbility bolt = spell(opp, "Lightning Bolt");
        final SpellAbility cs = spell(me, "Counterspell");
        final boolean rb = bolt != null && ComputerUtil.handlePlayingSpellAbility(opp, bolt, sa -> {
            sa.resetTargets();
            sa.getTargets().add(me);
        });
        final boolean rc = rb && cs != null && ComputerUtil.handlePlayingSpellAbility(me, cs, sa -> {
            sa.resetTargets();
            sa.getTargets().add(g.getStack().peekAbility());
        });
        expect("copies: the Bolt and seat 0's Counterspell are on the stack", rc && g.getStack().size() == 2);
        if (!rc) {
            return;
        }
        g.getStack().freezeStack(null);   // MagicStack.resolveStack's first act
        // a resolving effect's copy, played as PlayerControllerAi.orderAndPlaySimultaneousSa plays one
        final SpellAbility c1 = CardFactory.copySpellAbilityAndPossiblyHost(cs, cs, me);
        g.getStackZone().add(c1.getHostCard());
        c1.resetTargets();
        c1.getTargets().add(bolt);
        g.getStack().add(c1);
        final Card k1 = c1.getHostCard();
        boolean iterated = false;
        for (final SpellAbilityStackInstance si : g.getStack()) {
            iterated |= si.getSourceCard().getId() == k1.getId();
        }
        expect("copies: copy 1 is a copied spell in the Stack zone, its instance on the frozen stack, not the stack's",
                k1.isCopiedSpell() && k1.isInZone(ZoneType.Stack) && g.getStack().isFrozen() && !iterated
                        && g.getStack().size() == 2);
        final SpellAbility c2 = CardFactory.copySpellAbilityAndPossiblyHost(cs, cs, me);
        g.getStackZone().add(c2.getHostCard());
        c2.resetTargets();
        c2.getTargets().add(bolt);
        copyRecord("copies, frozen", g, c2, me, k1, bolt.getHostCard().getId());
        g.getStack().unfreezeStack();
        expect("copies: unfrozen, copy 1 is on the stack (3 items)", g.getStack().size() == 3);
        copyRecord("copies, unfrozen", g, c2, me, k1, bolt.getHostCard().getId());
    }

    /** Copy 2's target record lists copy 1 and the Bolt, hides nothing and prints no {@code [ghost]} line. */
    /** D508: a last-known copy of a card that left the battlefield is judged where the game holds the card now. */
    private static void lastKnown() {
        final Game g = newGame("selection-last-known");
        final GameState gs = new GameState();
        gs.parse(List.of(
                "turn=24",
                "activeplayer=p0",
                "activephase=" + PhaseType.MAIN1.name(),
                "p0life=4",
                "p1life=20",
                "p0hand=Island",
                "p0battlefield=Cavern Harpy;Grizzly Bears;Elvish Visionary;Island;Swamp",
                "p0library=Island;Island;Island",
                "p1hand=Plains",
                "p1battlefield=Savannah Lions;Plains;Plains",
                "p1library=Plains;Plains;Plains"));
        gs.applyToGame(g);
        final Player opp = g.getPlayers().get(0);   // the Harpy's owner
        final Player me = g.getPlayers().get(1);    // the seat asked
        final Card harpy = only(named(opp, "Cavern Harpy"));
        final Card bears = only(named(opp, "Grizzly Bears"));
        final Card vis = only(named(opp, "Elvish Visionary"));
        final Card lions = only(named(me, "Savannah Lions"));
        expect("last known: the position (Cavern Harpy, Grizzly Bears, Elvish Visionary, Savannah Lions)",
                harpy != null && bears != null && vis != null && lions != null);
        if (harpy == null || bears == null || vis == null || lions == null) {
            return;
        }
        // what GameAction.changeZone reads a leaving permanent's LKI from (the jar: indexOf on getLastStateBattlefield)
        g.copyLastState();
        final CardCollectionView last = g.getLastStateBattlefield();
        final Card lkiHarpy = last.get(last.indexOf(harpy));
        final Card lkiVis = last.get(last.indexOf(vis));
        final Card lkiLions = last.get(last.indexOf(lions));
        final Card inHand = g.getAction().moveToHand(harpy, null);
        final Card inYard = g.getAction().moveTo(ZoneType.Graveyard, vis, null, null);
        final Card ownHand = g.getAction().moveToHand(lions, null);
        expect("last known: the copy keeps the Harpy's id and a Battlefield zone while the card is in its owner's hand "
                + "(the fault is live)", lkiHarpy != harpy && lkiHarpy.getId() == harpy.getId()
                && lkiHarpy.getZone() != null && lkiHarpy.getZone().is(ZoneType.Battlefield)
                && inHand.isInZone(ZoneType.Hand) && inHand.getZone().getPlayer() == opp
                && g.getCardState(lkiHarpy) == inHand);
        expect("last known: Decisions.current resolves the copy to the hand card, and a card the game holds to itself",
                Decisions.current(lkiHarpy) == inHand && Decisions.current(bears) == bears
                        && Decisions.lastKnown(lkiHarpy) && !Decisions.lastKnown(bears));
        final Card divider = new Card(-3, g);   // ChooseSourceEffect's "--OBJECTS REFERRED TO ON THE STACK:--"
        divider.setName("--OBJECTS REFERRED TO ON THE STACK:--");
        final Decision d = Decisions.entities(me, List.of(divider, bears, lkiHarpy, inHand), false, List.of(bears),
                "entity");
        expect("last known: seat 1's record lists the Bears alone, then option:hidden " + d.options,
                d.options.equals(List.of("option:" + bears.getId(), "option:hidden")));
        expect("last known: the divider, the copy and the hand card are hidden (" + d.hidden + ")", d.hidden == 3);
        expect("last known: the record answers the Bears", ("option:" + bears.getId()).equals(d.chosen));
        final Decision d2 = Decisions.entities(me, List.of(lkiVis, lkiLions), false, List.of(lkiVis), "entity");
        expect("last known: a copy of a card now in the graveyard, and of the seat's own card now in its own hand, "
                + "are listed by the card's current zone " + d2.options,
                inYard.isInZone(ZoneType.Graveyard) && ownHand.isInZone(ZoneType.Hand)
                        && d2.options.equals(List.of("option:" + vis.getId(), "option:" + lions.getId()))
                        && d2.hidden == 0 && ("option:" + vis.getId()).equals(d2.chosen));
        final Decision d3 = Decisions.entities(opp, List.of(lkiHarpy, lkiLions), false, List.of(lkiHarpy), "entity");
        expect("last known: from the Harpy's owner, the Harpy's copy is listed and the Lions' is hidden " + d3.options,
                d3.options.equals(List.of("option:" + harpy.getId(), "option:hidden")) && d3.hidden == 1);
    }

    private static void copyRecord(final String tag, final Game g, final SpellAbility c2, final Player me,
                                   final Card k1, final int boltId) {
        final List<Integer> forge = new ArrayList<>();
        for (final GameEntity e : c2.getTargetRestrictions().getAllCandidates(c2, false)) {
            forge.add(e.getId());
        }
        expect(tag + ": Forge's candidates for copy 2 list copy 1 " + forge, forge.contains(k1.getId()));
        final java.io.PrintStream err = System.err;
        final java.io.ByteArrayOutputStream buf = new java.io.ByteArrayOutputStream();
        final List<Decision> recs;
        System.setErr(new java.io.PrintStream(buf, true, java.nio.charset.StandardCharsets.UTF_8));
        try {
            recs = Decisions.targets(c2, me, "targets");
        } finally {
            System.setErr(err);
        }
        final Decision d = recs.size() == 1 ? recs.get(0) : null;
        expect(tag + ": the record lists copy 1 and the Bolt, hidden 0 " + (d == null ? recs : d.options + " hidden "
                + d.hidden), d != null && d.options.contains("target:" + k1.getId())
                && d.options.contains("target:" + boltId) && d.hidden == 0);
        final String printed = buf.toString(java.nio.charset.StandardCharsets.UTF_8);
        expect(tag + ": no [ghost] line" + (printed.isEmpty() ? "" : " -- printed: " + printed.trim()),
                !printed.contains("[ghost]"));
    }

    private static void twoOnFirstPart(final SpellAbility sa, final Card a, final Card b, final Card theirs) {
        sa.resetTargets();
        sa.getTargets().add(a);
        sa.getTargets().add(b);
        if (sa.getSubAbility() != null) {
            sa.getSubAbility().resetTargets();
            sa.getSubAbility().getTargets().add(theirs);
        }
    }

    private static Card only(final List<Card> cards) {
        return cards.size() == 1 ? cards.get(0) : null;
    }

    private static Game ghostPosition() {
        final Game game = newGame("selection-ghosts");
        final GameState gs = new GameState();
        gs.parse(List.of(
                "turn=10",
                "activeplayer=p1",
                "activephase=" + PhaseType.MAIN1.name(),
                "p0life=20",
                "p1life=20",
                "p0hand=Counterspell;Counterspell",
                "p0battlefield=Militia Bugler;Island;Island;Island;Island",
                "p0library=Island;Island;Island",
                "p1hand=Knockout Maneuver;Knockout Maneuver;Lightning Bolt",
                "p1battlefield=Elvish Visionary;Grizzly Bears;Forest;Forest;Forest;Mountain",
                "p1library=Mountain;Mountain;Mountain"));
        gs.applyToGame(game);
        game.getPhaseHandler().setPriority(game.getPlayers().get(1));
        return game;
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

    private static Game newGame(final String name) {
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
        return new Match(rules, regs, name).createGame();
    }

    private static Game position(final boolean leyline) {
        final Game game = newGame("selection-selftest");
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
