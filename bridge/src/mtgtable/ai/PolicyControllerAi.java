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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

import forge.LobbyPlayer;
import forge.ai.PlayerControllerAi;
import forge.game.Game;
import forge.game.GameEntity;
import forge.game.card.Card;
import forge.game.card.CardCollectionView;
import forge.game.combat.Combat;
import forge.game.player.DelayedReveal;
import forge.game.player.Player;
import forge.game.player.PlayerActionConfirmMode;
import forge.game.spellability.SpellAbility;
import forge.game.trigger.WrappedAbility;
import forge.game.zone.ZoneType;
import forge.util.collect.FCollectionView;

/**
 * Forge's own AI controller with one seam of ours in front of it (D309, D310).
 *
 * <p>{@code PlayerControllerAi.chooseSpellAbilityToPlay()} is the one place
 * Forge asks an AI seat "what do you do with this priority?" -- every phase,
 * both turns, with or without a stack.  This subclass asks the
 * {@link OutletPolicy} first (lethal and stack threats), then Forge, then the
 * policy again for the cases that should only win when Forge has nothing to
 * do (an outlet card left in hand).  Everything else -- attacks, blocks,
 * targeting, mulligans, triggers, cost payment -- is Forge's, untouched.
 *
 * <p>It also counts, for {@code tools/ai-bench.sh}: what the policy did, what it
 * WOULD have done in shadow mode (the opportunities Forge's own AI had), and the
 * outlet activations Forge chose by itself.  Counting has no effect on play.
 *
 * <p><b>Decision records (D347).</b>  With a {@link DecisionSink} set (the
 * seat's own recorder), every decision the seat takes -- priority, attacks,
 * blocks, the targets of what it plays, choices, mulligans -- is written as a
 * {@link Decision}: the legal options, the answer, whose answer it was and the
 * search's statistics.  The record is built AFTER the answer (it cannot steer
 * it) and a failure to build one is counted, never thrown into the game.  With
 * no sink, none of it runs.
 *
 * <p><b>Play exploration (D358).</b>  With an {@link Explorer} set (an exploring
 * cube-lab game), each answer -- priority, attack, blocks, single targets, a
 * close call on a creature, the opening mulligan -- is offered to it AFTER the
 * seat's own policy chose, and it may replace the answer with a legal one drawn
 * by its own seeded generator.  The decision record then carries the mark
 * ({@code explore: {rule, forge}}), so a policy dataset can leave it out.  With
 * no explorer, nothing changes.
 *
 * <p><b>Opening hands and targets (D416).</b>  With the search's {@code mull=1},
 * {@link #mulliganKeepHand} and {@link #tuckCardsViaMulligan} reconsider Forge's
 * keep and London bottom; with {@code targets=1}, the targets of the priority
 * answer are reconsidered after it is chosen.  Both off: Forge's answers.
 */
public class PolicyControllerAi extends PlayerControllerAi {

    /** Card names whose casting and activation the benchmark reports. */
    public static final Set<String> WATCH = Set.of(
            "Viscera Seer", "Goblin Bombardment", "Carrion Feeder", "Priest of Forgotten Gods",
            "Woe Strider", "Village Rites", "Deadly Dispute", "Blood Artist", "Zulaport Cutthroat",
            "Mayhem Devil", "Cauldron Familiar", "Grim Haruspex", "Juri, Master of the Revue");

    private final OutletPolicy policy;
    private final SearchPolicy search;
    private final Map<String, Integer> counts = new TreeMap<>();
    private final List<String> events = new ArrayList<>();
    private final Set<String> seen = new HashSet<>();

    private SpellAbility steerSa;
    private Card steerVictim;

    /** The seat's own recorder (D347), or null: no decision records. */
    private DecisionSink decisions;
    /** Whose answer the last {@link #choose} returned, and the outlet policy's reason. */
    private String lastBy = "forge";
    private String lastWhy;

    /** The player who starts, from the last {@link #mulliganKeepHand} (the London bottom is asked without it; D416). */
    private Player mullFirst;

    /** Play exploration (D358), or null: the seat plays its policy's answers. */
    private Explorer explorer;
    /** The targets exploration changed in the answer being played (D358), by part. */
    private final Map<SpellAbility, Decision.Explore> targetMarks = new java.util.IdentityHashMap<>();

    /** Explore this seat's decisions (D358); null = off.  Set before the game starts. */
    public void setExplorer(final Explorer e) {
        this.explorer = e;
    }

    /** The explorer, or null. */
    public Explorer explorer() {
        return explorer;
    }

    /** Record this seat's decisions into {@code sink} (its own recording only); null = off. */
    public void setDecisionSink(final DecisionSink sink) {
        this.decisions = sink;
    }

    /**
     * @param policy null = plain Forge (still counted); otherwise the policy, acting
     *               or in shadow mode
     */
    public PolicyControllerAi(final Game game, final Player p, final LobbyPlayer lp, final OutletPolicy policy) {
        this(game, p, lp, policy, null);
    }

    /**
     * @param search null = no search; otherwise the determinized rollout search
     *               (D312) runs after Forge and the outlet policy have answered
     */
    public PolicyControllerAi(final Game game, final Player p, final LobbyPlayer lp, final OutletPolicy policy,
                              final SearchConfig search) {
        super(game, p, lp);
        this.policy = policy;
        this.search = search == null ? null : new SearchPolicy(search, new SearchPolicy.Sink() {
            @Override
            public void add(final String key, final int n) {
                counts.merge(key, n, Integer::sum);
            }

            @Override
            public void event(final String text) {
                PolicyControllerAi.this.event(text);
            }
        });
    }

    /** The search, or null; for the self-test. */
    public SearchPolicy search() {
        return search;
    }

    public Map<String, Integer> counts() {
        return counts;
    }

    public List<String> events() {
        return events;
    }

    private void count(final String k) {
        counts.merge(k, 1, Integer::sum);
    }

    private void event(final String s) {
        if (events.size() < 60) {
            final Game g = getGame();
            events.add("T" + g.getPhaseHandler().getTurn() + " " + g.getPhaseHandler().getPhase()
                    + (g.getPhaseHandler().isPlayerTurn(player) ? " (own) " : " (opp) ") + s);
        }
    }

    @Override
    public List<SpellAbility> chooseSpellAbilityToPlay() {
        if (decisions == null) {
            return explored(choose());
        }
        if (search != null) {
            search.takeReport();
            search.takeTargetReport();
        }
        final List<SpellAbility> r = explored(choose());
        final Decision.Explore explored = explorer == null ? null : explorer.takeMark();
        final long t0 = System.nanoTime();
        try {
            final SpellAbility sa = r == null || r.isEmpty() ? null : r.get(0);
            final Decision d = Decisions.priority(player);
            d.chosen = Decisions.saToken(sa);
            if (!d.options.contains(d.chosen)) {
                d.options.add(d.chosen);   // an answer the enumeration missed: listed, and the list is not the whole
                d.complete = false;
            }
            d.by = lastBy;
            d.why = lastWhy;
            d.explore = explored;
            final SearchPolicy.Report rep = search == null ? null : search.takeReport();
            if (rep != null) {
                d.search = Decisions.stats(rep);
            }
            if (d.forced() && d.search == null) {
                decisions.forced(d.kind);
            } else {
                // Choosing changed nothing yet (the answer is played after this
                // returns), so the log is made current only now, and only for a
                // decision that is written: a forced pass costs no frame.
                final int[] mark = decisions.mark();
                final int n = decisions.write(d, mark);
                final SearchPolicy.Report trep = search == null ? null : search.takeTargetReport();
                if (sa != null) {
                    boolean first = true;
                    for (final Decision t : Decisions.targets(sa, player, "targets", targetMarks)) {
                        t.parent = n;
                        t.by = lastBy;
                        if (trep != null) {
                            // D416: the target search's verdict covers every targeted part; its numbers go on the first
                            t.by = trep.fallback == null && trep.chosen >= 0 ? "search" : t.by;
                            if (first) {
                                t.search = Decisions.stats(trep);
                            }
                        }
                        first = false;
                        writeOrCount(t, mark);
                    }
                }
            }
        } catch (final RuntimeException e) {
            decisions.error("priority", e);
        }
        decisions.cost(System.nanoTime() - t0);
        return r;
    }

    /**
     * The priority answer after play exploration (D358): the explorer may draw
     * another legal play, then each single target of the play is offered to it.
     * Its marks wait in the explorer and {@link #targetMarks} for the records.
     */
    private List<SpellAbility> explored(final List<SpellAbility> r) {
        targetMarks.clear();
        if (explorer == null) {
            return r;
        }
        final List<SpellAbility> e = explorer.priority(player, getAi(), r);
        final SpellAbility sa = e == null || e.isEmpty() ? null : e.get(0);
        if (sa != null && !sa.isLandAbility()) {
            explorer.targets(sa, player, targetMarks);
        }
        if (e != r) {
            // a play the explorer drew is not the outlet policy's to steer
            steerSa = null;
            steerVictim = null;
        }
        return e;
    }

    private void writeOrCount(final Decision d, final int[] mark) {
        if (d.forced()) {
            decisions.forced(d.kind);
        } else {
            decisions.write(d, mark == null ? decisions.mark() : mark);
        }
    }

    /**
     * The priority answer ({@link #choose0}), then, with {@code targets=1}, the
     * target search on it (D416): never on an answer the outlet policy chose or
     * steers (its own victim and target rules).
     */
    private List<SpellAbility> choose() {
        final List<SpellAbility> r = choose0();
        if (search != null && r != null && r.size() == 1 && steerSa == null && !"outlets".equals(lastBy)
                && search.wantsTargets(player)) {
            search.chooseTargets(player, r.get(0));
        }
        return r;
    }

    /** The priority answer: the outlet policy, Forge, the policy again, then the search (D309-D312). */
    private List<SpellAbility> choose0() {
        steerSa = null;
        steerVictim = null;
        lastBy = "forge";
        lastWhy = null;
        if (policy != null) {
            final OutletPolicy.Choice ch = policy.decide(player);
            if (ch != null) {
                final String key = ch.why + ":" + (ch.victim == null ? "-" : ch.victim.getId())
                        + ":" + getGame().getPhaseHandler().getTurn();
                if (seen.add(key)) {
                    count("opportunity." + ch.why);
                }
                if (policy.acts()) {
                    count("policy." + ch.why);
                    event("policy " + ch);
                    steerSa = ch.sa;
                    steerVictim = ch.victim;
                    lastBy = "outlets";
                    lastWhy = String.valueOf(ch.why);
                    return singleton(ch.sa);
                }
            }
        }
        final List<SpellAbility> forge = super.chooseSpellAbilityToPlay();
        if (forge != null && forge.size() == 1 && policy != null
                && OutletPolicy.creatureSacCost(forge.get(0)) != null) {
            // Forge chose an outlet by itself (Carrion Feeder's AristocratCounters
            // logic, Woe Strider's AtOppEOT): it justified the activation with a
            // fodder creature but pays with whatever the script's AIPreference
            // finds worst.  Pay with the fodder (D310, FODDER).
            final Card fodder = OutletPolicy.fodderFor(player, forge.get(0));
            if (fodder != null) {
                count("opportunity.FODDER");
                if (policy.acts()) {
                    count("policy.FODDER");
                    event("policy FODDER: " + forge.get(0).getHostCard().getName() + " pays with "
                            + fodder.getName() + (fodder.isToken() ? " (token)" : ""));
                    steerSa = forge.get(0);
                    steerVictim = fodder;
                }
            }
        }
        if ((forge == null || forge.isEmpty()) && policy != null) {
            final OutletPolicy.Choice cast = policy.castOutlet(player);
            if (cast != null) {
                final String key = "CAST:" + cast.sa.getHostCard().getId() + ":" + getGame().getPhaseHandler().getTurn();
                if (seen.add(key)) {
                    count("opportunity." + cast.why);
                }
                if (policy.acts()) {
                    count("policy." + cast.why);
                    event("policy " + cast);
                    lastBy = "outlets";
                    lastWhy = String.valueOf(cast.why);
                    return singleton(cast.sa);
                }
            }
        }
        if (search != null && steerSa == null && search.wantsPriority(player)) {
            // The outlet policy's rules stay in front (D311 roadmap 5): the search
            // only reconsiders a priority none of them claimed.
            final List<SpellAbility> r = search.choosePriority(player, getAi(), forge);
            lastBy = searchBy(r != forge);
            return r;
        }
        return forge;
    }

    /** "search" when the search reached a verdict (kept Forge's answer or changed it), else "forge". */
    private String searchBy(final boolean changed) {
        if (changed) {
            return "search";
        }
        final SearchPolicy.Report rep = search.peekReport();
        return rep != null && rep.fallback == null && rep.chosen >= 0 ? "search" : "forge";
    }

    @Override
    public void declareAttackers(final Player attacker, final Combat combat) {
        if (decisions == null || attacker != player) {
            super.declareAttackers(attacker, combat);
            if (search != null && attacker == player) {
                search.chooseAttack(player, combat);
            }
            if (explorer != null && attacker == player) {
                explorer.attack(player, combat);
                explorer.takeMark();
            }
            return;
        }
        final int[] mark = decisions.mark();
        if (search != null) {
            search.takeReport();
        }
        super.declareAttackers(attacker, combat);
        if (search != null) {
            search.chooseAttack(player, combat);
        }
        Decision.Explore explored = null;
        if (explorer != null) {
            explorer.attack(player, combat);
            explored = explorer.takeMark();
        }
        try {
            final List<Integer> chosen = new ArrayList<>();
            for (final Card c : combat.getAttackers()) {
                if (c.getController() == player) {
                    chosen.add(c.getId());
                }
            }
            final Decision d = Decisions.attack(player, Decisions.attackers(player, combat), chosen);
            combatBy(d);
            d.explore = explored;
            writeOrCount(d, mark);
        } catch (final RuntimeException e) {
            decisions.error("attack", e);
        }
    }

    @Override
    public void declareBlockers(final Player defender, final Combat combat) {
        if (decisions == null || defender != player) {
            super.declareBlockers(defender, combat);
            if (search != null && defender == player) {
                search.chooseBlock(player, combat);
            }
            if (explorer != null && defender == player) {
                explorer.block(player, combat);
                explorer.takeMark();
            }
            return;
        }
        final int[] mark = decisions.mark();
        if (search != null) {
            search.takeReport();
        }
        List<int[]> pairs = null;
        try {
            pairs = Decisions.blockPairs(player, combat);   // before any block of ours is declared
        } catch (final RuntimeException e) {
            decisions.error("block", e);
        }
        super.declareBlockers(defender, combat);
        if (search != null) {
            search.chooseBlock(player, combat);
        }
        Decision.Explore explored = null;
        if (explorer != null) {
            explorer.block(player, combat);
            explored = explorer.takeMark();
        }
        if (pairs == null) {
            return;
        }
        try {
            final Decision d = Decisions.block(player, pairs, Decisions.blocksOf(player, combat));
            combatBy(d);
            d.explore = explored;
            writeOrCount(d, mark);
        } catch (final RuntimeException e) {
            decisions.error("block", e);
        }
    }

    private void combatBy(final Decision d) {
        final SearchPolicy.Report rep = search == null ? null : search.takeReport();
        if (rep != null) {
            d.search = Decisions.stats(rep);
            d.by = rep.fallback == null && rep.chosen >= 0 ? "search" : "forge";
        }
    }

    @Override
    public boolean mulliganKeepHand(final Player firstPlayer, final int cardsToReturn) {
        mullFirst = firstPlayer;
        if (decisions == null) {
            boolean keep = super.mulliganKeepHand(firstPlayer, cardsToReturn);
            if (search != null) {
                keep = search.chooseMulligan(player, firstPlayer, cardsToReturn, keep);   // D416 (mull=1)
                search.takeReport();
            }
            return explorer == null ? keep : explorer.mulligan(keep, cardsToReturn);
        }
        final int[] mark = decisions.mark();
        if (search != null) {
            search.takeReport();
        }
        boolean keep = super.mulliganKeepHand(firstPlayer, cardsToReturn);
        SearchPolicy.Report mrep = null;
        if (search != null) {
            keep = search.chooseMulligan(player, firstPlayer, cardsToReturn, keep);   // D416 (mull=1)
            mrep = search.takeReport();
        }
        Decision.Explore em = null;
        if (explorer != null) {
            keep = explorer.mulligan(keep, cardsToReturn);
            em = explorer.takeMark();
        }
        try {
            final Decision d = Decisions.mulligan(player, keep);
            d.explore = em;
            if (mrep != null) {
                d.search = Decisions.stats(mrep);
                d.by = mrep.fallback == null && mrep.chosen >= 0 ? "search" : "forge";
            }
            decisions.write(d, mark);
        } catch (final RuntimeException e) {
            decisions.error("mulligan", e);
        }
        return keep;
    }

    /**
     * The London bottom (D416): Forge chooses, then with {@code mull=1} the
     * search may put other cards on the bottom.  Not a recorded decision (D347
     * has no kind for it); counted.
     */
    @Override
    public CardCollectionView tuckCardsViaMulligan(final CardCollectionView hand, final int cardsToReturn) {
        final CardCollectionView forge = super.tuckCardsViaMulligan(hand, cardsToReturn);
        if (search == null || !search.wantsMulligan(player) || forge == null) {
            return forge;
        }
        final List<Card> h = new ArrayList<>();
        for (final Card c : hand) {
            h.add(c);
        }
        final List<Card> f = new ArrayList<>();
        for (final Card c : forge) {
            f.add(c);
        }
        final List<Card> r = search.chooseBottom(player, mullFirst, h, cardsToReturn, f);
        search.takeReport();
        return r == f ? forge : new forge.game.card.CardCollection(r);
    }

    @Override
    public <T extends GameEntity> T chooseSingleEntityForEffect(final FCollectionView<T> optionList,
            final DelayedReveal delayedReveal, final SpellAbility sa, final String title, final boolean isOptional,
            final Player targetedPlayer, final java.util.Map<String, Object> params) {
        final T forge = super.chooseSingleEntityForEffect(optionList, delayedReveal, sa, title, isOptional,
                targetedPlayer, params);
        final T r = explorer == null || optionList == null ? forge : explorer.entity(player, optionList, forge);
        final Decision.Explore em = explorer == null ? null : explorer.takeMark();
        if (decisions == null) {
            return r;
        }
        try {
            // the choice is applied after this returns: the log is made current only for a written record
            final Decision d = Decisions.entities(player, optionList, isOptional, r == null ? List.of() : List.of(r),
                    "entity");
            d.explore = em;
            writeOrCount(d, null);
        } catch (final RuntimeException e) {
            decisions.error("entity", e);
        }
        return r;
    }

    @Override
    public CardCollectionView chooseCardsForEffect(final CardCollectionView sourceList, final SpellAbility sa,
            final String title, final int min, final int max, final boolean isOptional,
            final java.util.Map<String, Object> params) {
        if (decisions == null) {
            return super.chooseCardsForEffect(sourceList, sa, title, min, max, isOptional, params);
        }
        final CardCollectionView r = super.chooseCardsForEffect(sourceList, sa, title, min, max, isOptional, params);
        try {
            final List<Card> picked = new ArrayList<>();
            if (r != null) {
                for (final Card c : r) {
                    picked.add(c);
                }
            }
            writeOrCount(Decisions.entities(player, sourceList, isOptional || min == 0, picked, "cards"), null);
        } catch (final RuntimeException e) {
            decisions.error("cards", e);
        }
        return r;
    }

    @Override
    public boolean confirmAction(final SpellAbility sa, final PlayerActionConfirmMode mode, final String message,
            final List<String> options, final Card cardToShow, final java.util.Map<String, Object> params) {
        if (decisions == null) {
            return super.confirmAction(sa, mode, message, options, cardToShow, params);
        }
        final boolean r = super.confirmAction(sa, mode, message, options, cardToShow, params);
        try {
            decisions.write(Decisions.confirm(player, r, "confirm"), decisions.mark());
        } catch (final RuntimeException e) {
            decisions.error("confirm", e);
        }
        return r;
    }

    @Override
    public boolean confirmTrigger(final WrappedAbility wrapper) {
        if (decisions == null) {
            return super.confirmTrigger(wrapper);
        }
        final boolean r = super.confirmTrigger(wrapper);
        try {
            decisions.write(Decisions.confirm(player, r, "trigger"), decisions.mark());
        } catch (final RuntimeException e) {
            decisions.error("trigger", e);
        }
        return r;
    }

    @Override
    public boolean playTrigger(final Card host, final WrappedAbility wrapperAbility, final boolean isMandatory) {
        if (decisions == null) {
            final boolean r = super.playTrigger(host, wrapperAbility, isMandatory);
            if (r && explorer != null) {
                final SpellAbility inner = wrapperAbility.getWrappedAbility();
                targetMarks.clear();
                explorer.targets(inner == null ? wrapperAbility : inner, player, targetMarks);
            }
            return r;
        }
        final int[] mark = decisions.mark();
        final boolean r = super.playTrigger(host, wrapperAbility, isMandatory);
        if (r) {
            try {
                final SpellAbility inner = wrapperAbility.getWrappedAbility();
                targetMarks.clear();
                if (explorer != null) {
                    explorer.targets(inner == null ? wrapperAbility : inner, player, targetMarks);
                }
                for (final Decision t : Decisions.targets(inner == null ? wrapperAbility : inner, player, "trigger",
                        targetMarks)) {
                    writeOrCount(t, mark);
                }
            } catch (final RuntimeException e) {
                decisions.error("triggerTargets", e);
            }
        }
        return r;
    }

    @Override
    public boolean chooseTargetsFor(final SpellAbility currentAbility) {
        if (search != null && search.config().targets) {
            // D416: Forge asks this only mid-resolution or for another player's
            // targeting (TargetingPlayer); a copy cannot start there (no stack), so
            // it stays Forge's, and the count says how often the path comes up.
            count("search.t.chooseTargetsFor");
        }
        if (decisions == null) {
            return super.chooseTargetsFor(currentAbility);
        }
        final boolean r = super.chooseTargetsFor(currentAbility);
        if (r) {
            try {
                for (final Decision t : Decisions.targets(currentAbility, player, "chooseTargets")) {
                    writeOrCount(t, null);
                }
            } catch (final RuntimeException e) {
                decisions.error("chooseTargets", e);
            }
        }
        return r;
    }

    private static List<SpellAbility> singleton(final SpellAbility sa) {
        final List<SpellAbility> l = new ArrayList<>(1);
        l.add(sa);
        return l;
    }

    @Override
    public boolean playChosenSpellAbility(final SpellAbility sa) {
        final Card host = sa.getHostCard();
        final boolean outlet = OutletPolicy.creatureSacCost(sa) != null;
        if (host != null && WATCH.contains(host.getName())) {
            count((sa.isSpell() ? "cast." : "activate.") + host.getName());
        }
        if (outlet && sa != steerSa) {
            count("forge.outletActivation");
            final List<Card> before = new ArrayList<>(player.getCreaturesInPlay());
            final boolean r = super.playChosenSpellAbility(sa);
            final List<String> gone = new ArrayList<>();
            for (final Card c : before) {
                if (c.getZone() == null || !c.getZone().is(ZoneType.Battlefield)) {
                    gone.add(c.getName() + (c.isToken() ? " (token)" : ""));
                }
            }
            event("forge activates " + host.getName() + " sacrificing " + gone);
            return r;
        }
        if (sa == steerSa && steerVictim != null) {
            final Card victim = steerVictim;
            final boolean had = victim.hasSVar("SacMe");
            final String old = had ? victim.getSVar("SacMe") : null;
            victim.setSVar("SacMe", "6");
            // The outlet's own AIPreference (Carrion Feeder: SacCost$Creature.Other)
            // is read before SacMe in ComputerUtil.getCardPreference, so it is lifted
            // for this one payment too.
            final String pref = host.hasSVar("AIPreference") ? host.getSVar("AIPreference") : null;
            final String prefOverride = host.hasSVar("AIPreferenceOverride") ? host.getSVar("AIPreferenceOverride") : null;
            if (pref != null) {
                host.removeSVar("AIPreference");
            }
            if (prefOverride != null) {
                host.removeSVar("AIPreferenceOverride");
            }
            try {
                return super.playChosenSpellAbility(sa);
            } finally {
                if (pref != null) {
                    host.setSVar("AIPreference", pref);
                }
                if (prefOverride != null) {
                    host.setSVar("AIPreferenceOverride", prefOverride);
                }
                if (had) {
                    victim.setSVar("SacMe", old);
                } else {
                    victim.removeSVar("SacMe");
                }
                if (victim.getZone() != null && victim.getZone().is(ZoneType.Battlefield)
                        && victim.getController() == player) {
                    count("policy.steerMissed");
                    event("steer missed: " + victim.getName() + " is still on the battlefield");
                }
                steerSa = null;
                steerVictim = null;
            }
        }
        return super.playChosenSpellAbility(sa);
    }
}
