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
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import forge.ai.AiController;
import forge.ai.ComputerUtilAbility;
import forge.ai.ComputerUtilCard;
import forge.ai.ComputerUtilCost;
import forge.game.Game;
import forge.game.GameEntity;
import forge.game.GameObject;
import forge.game.card.Card;
import forge.game.combat.Combat;
import forge.game.combat.CombatUtil;
import forge.game.player.Player;
import forge.game.spellability.SpellAbility;
import forge.game.spellability.TargetChoices;
import forge.game.spellability.TargetRestrictions;
import forge.game.zone.ZoneType;

/**
 * Play exploration (D358): in a cube-lab game the queue marked as exploring,
 * a {@link PolicyControllerAi} asks this class, AFTER Forge (and any policy of
 * ours) has answered, whether to keep that answer.
 *
 * <ul>
 *   <li><b>Epsilon-random.</b>  Each decision of an explorable kind draws one
 *       coin; with probability epsilon its answer is replaced by one drawn
 *       uniformly from the seat's LEGAL answers: what to play with a priority
 *       (pass, each land it may play, each spell or ability Forge's own
 *       per-card judgment would play with the targets it chose, and each
 *       untargeted spell it can cast and pay for -- the search's candidate
 *       list, D312), the attack (a uniform subset of the creatures that can
 *       attack the opponent, redrawn until Forge says the declaration is
 *       legal), the blocks (each blocker on one attacker it can block or none,
 *       redrawn until legal), and each single target of what it plays or
 *       triggers.  With {@code opening} on, the seven-card mulligan decision
 *       is one too.  Mana payment, costs, effect choices and the rest stay
 *       Forge's.</li>
 *   <li><b>Close calls.</b>  Where Forge chose a creature -- a single target, or
 *       a creature an effect asks for -- by its own score
 *       ({@code ComputerUtilCard.evaluateCreature}), the legal creature of the
 *       same controller whose score is nearest is a close call when the two are
 *       within {@code closeCall} of each other (relative), and a fair coin
 *       picks between them.</li>
 * </ul>
 *
 * <p><b>Hidden information.</b>  Every option comes from the engine's legality
 * checks for the deciding seat's own plays (the lists Forge's own AI walks on
 * every priority), from its creatures and blockers on the battlefield, or from
 * a target list filtered to what the seat can see ({@link Decisions#visible}).
 * A score is read only from a face-up creature on the battlefield, or one the
 * seat controls.  No library, no other hand, no face-down identity.
 *
 * <p><b>The random seat (D451, {@link ExploreMath.Config#random}).</b>  The
 * move atlas's seat for "what if both sides played at random": every priority
 * is a uniform pick among pass, each land it may play, Forge's own answer, and
 * EVERY spell or non-mana ability the seat can play and pay for now -- Forge's
 * per-card judgment is not asked, and a targeted one gets targets drawn
 * uniformly from the legal ones the seat can see (a part with a cross-target
 * constraint, divided damage, or no visible legal target leaves the play out).
 * The attack, the blocks and each single target are random as above; mana
 * payment, costs, modes and other choices stay Forge's.  Its guardrails are
 * mechanical, never strategy: (G1) a legal land drop is always taken, uniformly
 * among the lands -- which also means (G2) it never passes while a land drop
 * is pending, so G2 has no code of its own; (G3) a pure no-op is never repeated twice in a row: an
 * activated ability whose resolution left the public state unchanged
 * ({@link #fingerprint}) is not offered at the seat's next decision with the
 * stack empty; (G4) the opening hand is always kept; (G5, D458) a play the
 * engine refused to pay for is not offered again in the same priority window
 * ({@link #played}, {@link #window}).  The turn cap is the
 * game loop's (the cube lab's {@code turnCap}).
 *
 * <p><b>Its own randomness.</b>  Every draw is {@link ExploreMath}'s seeded
 * generator; the engine calls made to list options run inside
 * {@link Decisions#quiet}, so Forge's {@code MyRandom} stream is not moved by
 * them.  Game thread only, inside the controller's callbacks.
 */
public final class Explorer {

    private final ExploreMath math;
    /** The mark of the last priority, attack, block, mulligan or entity decision (null: Forge's answer stood untouched). */
    private Decision.Explore mark;

    public Explorer(final ExploreMath math) {
        this.math = math;
    }

    public ExploreMath math() {
        return math;
    }

    /** The mark of the decision just explored, once. */
    public Decision.Explore takeMark() {
        final Decision.Explore m = mark;
        mark = null;
        return m;
    }

    // ------------------------------------------------------------------
    // Priority
    // ------------------------------------------------------------------

    /** Forge's priority answer {@code chosen} (null or empty: pass), or a uniformly random legal one. */
    public List<SpellAbility> priority(final Player ai, final AiController aic, final List<SpellAbility> chosen) {
        mark = null;
        if (math.config().random) {
            return randomPriority(ai, aic, chosen);
        }
        if (!math.coin()) {
            return chosen;
        }
        try {
            final List<List<SpellAbility>> opts = Decisions.quiet(() -> priorityOptions(ai, aic, chosen));
            if (opts.size() < 2) {
                return chosen;   // one legal answer: nothing to explore
            }
            final List<SpellAbility> pick = opts.get(math.pick(opts.size()));
            final String forgeTok = tokenOf(chosen);
            final String tok = tokenOf(pick);
            math.randomised("priority", tok.equals(forgeTok));
            mark = new Decision.Explore("random", forgeTok);
            if (pick == chosen || pick == null && tok.equals(forgeTok)) {
                return chosen;   // Forge's own answer drawn: the very list it returned (the outlet policy keeps its steer)
            }
            if (pick == null) {
                return null;
            }
            return new ArrayList<>(pick);
        } catch (final RuntimeException e) {
            math.failed();
            return chosen;
        }
    }

    // ------------------------------------------------------------------
    // The random seat (D451)
    // ------------------------------------------------------------------

    /** G3: the seat's last activated ability, and the public state when it was chosen. */
    private String lastAbility;
    private long lastFingerprint;
    /** G5 (D458): the play the random seat just returned (null: a pass or a land), until the engine plays it. */
    private String pendingPick;
    /** G5: the plays the engine refused to pay for in {@link #refusedWindow}, the priority window they were refused in. */
    private final Set<String> refused = new LinkedHashSet<>();
    private String refusedWindow;

    /**
     * G5's priority window: the turn, the phase, the stack (its size and the
     * top item's id), and how many lands the seat has on the battlefield.  A
     * refused play leaves all of them as they were, so the engine's next
     * priority to the seat is the same window; a play that resolves or is
     * added, a new step or a new turn is another one, and so is a land drop
     * (D462, the #177 review: more mana, so a refused cast may be payable now).
     * Not the mana pool: a refused payment taps its sources and refunds what
     * it spent into the pool (Forge's {@code ComputerUtilMana.payManaCost},
     * {@code manapool.refundMana(manaSpentToPay)}), so the pool moves BECAUSE
     * of the refusal and the window would never hold.  Not untapped lands, for
     * the same reason.
     */
    static String window(final Game g, final Player seat) {
        final int top = g.getStack().isEmpty() || g.getStack().peekAbility() == null ? -1 : g.getStack().peekAbility().getId();
        return windowKey(g.getPhaseHandler().getTurn(), String.valueOf(g.getPhaseHandler().getPhase()), g.getStack().size(), top,
                seat == null ? -1 : seat.getLandsInPlay().size());
    }

    /** G5's window as a string: engine-free, for the self-test. */
    static String windowKey(final int turn, final String phase, final int stackSize, final int top, final int lands) {
        return turn + "/" + phase + "/" + stackSize + "/" + top + "/" + lands;
    }

    /**
     * G5 (D458): the random seat's pick was just handed to the engine, and
     * {@code refused} says whether the engine refused it (its cost could not be
     * paid -- Forge marks such a play skipped).  A refused pick is counted
     * ({@code refusedCast}) and is not offered again in this priority window.
     * Nothing for a seat that is not the random seat.
     */
    public void played(final Player seat, final SpellAbility sa, final boolean refusedNow) {
        final String tok = pendingPick != null ? pendingPick : Decisions.saToken(sa);
        pendingPick = null;
        if (!math.config().random || !refusedNow || tok == null || "pass".equals(tok)) {
            return;
        }
        noteRefused(window(seat.getGame(), seat), tok);
    }

    /** G5: {@code tok} was refused in window {@code w}: counted, and left out of the rest of that window. */
    void noteRefused(final String w, final String tok) {
        math.guardrail("refusedCast");
        if (!w.equals(refusedWindow)) {
            refused.clear();
            refusedWindow = w;
        }
        refused.add(tok);
    }

    /** G5: the options to leave out at a decision in {@code w} (and the set forgotten once the window has moved on). */
    Set<String> refusedIn(final String w) {
        if (!refused.isEmpty() && !w.equals(refusedWindow)) {
            refused.clear();
            refusedWindow = null;
        }
        return refused;
    }

    /**
     * G5 on an option list: each refused option is removed while another
     * remains (as G3 removes its no-op), and each removal is counted
     * ({@code noRepeatRefused}).  Engine-free, for the self-test.
     */
    static int dropRefused(final Map<String, ?> opts, final Set<String> refused, final ExploreMath math) {
        int n = 0;
        for (final String t : refused) {
            if (opts.size() > 1 && opts.containsKey(t)) {
                opts.remove(t);
                math.guardrail("noRepeatRefused");
                n++;
            }
        }
        return n;
    }

    /** The random seat's priority answer, under the guardrails. */
    private List<SpellAbility> randomPriority(final Player ai, final AiController aic, final List<SpellAbility> chosen) {
        pendingPick = null;
        try {
            final Game g = ai.getGame();
            final Set<String> refusedHere = refusedIn(window(g, ai));
            final boolean stackEmpty = g.getStack().isEmpty();
            String banned = null;
            if (lastAbility != null && stackEmpty) {
                // G3: judged once the ability has resolved -- a decision with the stack empty again
                if (Decisions.quiet(() -> fingerprint(g)) == lastFingerprint) {
                    banned = lastAbility;
                }
                lastAbility = null;
            }
            final Map<String, List<SpellAbility>> opts = Decisions.quiet(() -> randomOptions(ai, aic, chosen));
            final String forgeTok = tokenOf(chosen);
            final List<String> lands = new ArrayList<>();
            for (final String k : opts.keySet()) {
                if (k.startsWith("land:")) {
                    lands.add(k);
                }
            }
            if (!lands.isEmpty()) {
                // G1: a legal land drop is always taken
                final String tok = lands.get(math.pick(lands.size()));
                math.guardrail("land");
                math.randomised("priority", tok.equals(forgeTok));
                mark = new Decision.Explore("random", forgeTok);
                return new ArrayList<>(opts.get(tok));
            }
            // G2 ("no pass in main 1 while a land drop is pending") is G1 itself: any pending land drop
            // was taken just above, so no separate rule or counter (the #161 review: it never fired).
            if (banned != null && opts.size() > 1 && opts.remove(banned) != null) {
                math.guardrail("noRepeatNoOp");
            }
            // G5 (D458): a play the engine refused to pay for in this priority window is not picked again in it
            dropRefused(opts, refusedHere, math);
            final List<String> keys = new ArrayList<>(opts.keySet());
            if (keys.size() < 2) {
                final String only = keys.isEmpty() ? "pass" : keys.get(0);
                mark = null;
                final List<SpellAbility> l = opts.get(only);
                pendingPick = l == null ? null : only;
                return l == null ? null : new ArrayList<>(l);
            }
            final String tok = keys.get(math.pick(keys.size()));
            pendingPick = "pass".equals(tok) ? null : tok;
            math.randomised("priority", tok.equals(forgeTok));
            mark = new Decision.Explore("random", forgeTok);
            if (tok.startsWith("activate:")) {
                lastAbility = tok;
                lastFingerprint = Decisions.quiet(() -> fingerprint(g));
            }
            final List<SpellAbility> pick = opts.get(tok);
            if (pick == chosen) {
                return chosen;
            }
            return pick == null ? null : new ArrayList<>(pick);
        } catch (final RuntimeException e) {
            math.failed();
            return chosen;
        }
    }

    /**
     * The random seat's plays, one per token: pass, each land, Forge's own
     * answer, then every spell or non-mana ability the seat can play and pay
     * for now (its controller's or its owner's card), a targeted one with
     * targets drawn at random.  Forge's judgment of whether a play is wise is
     * not asked.
     */
    private Map<String, List<SpellAbility>> randomOptions(final Player ai, final AiController aic,
                                                          final List<SpellAbility> chosen) {
        final Map<String, List<SpellAbility>> out = new LinkedHashMap<>();
        out.put("pass", null);
        final Game g = ai.getGame();
        out.putAll(Decisions.landPlays(ai));   // D466: the record's listing too
        final SpellAbility forgeSa = chosen == null || chosen.isEmpty() ? null : chosen.get(0);
        if (forgeSa != null && !forgeSa.isLandAbility()) {
            out.put(tokenOf(chosen), chosen);
        }
        final List<SpellAbility> all;
        try {
            all = ComputerUtilAbility.getOriginalAndAltCostAbilities(
                    ComputerUtilAbility.getSpellAbilities(ComputerUtilAbility.getAvailableCards(g, ai), ai), ai);
        } catch (final RuntimeException e) {
            math.failed();
            return out;
        }
        for (final SpellAbility sa : all) {
            if (sa == forgeSa || sa.isLandAbility() || sa.isManaAbility() || sa.isTrigger()) {
                continue;
            }
            final Card host = sa.getHostCard();
            if (host == null || host.getController() != ai && host.getOwner() != ai) {
                continue;
            }
            final String tok = Decisions.saToken(sa);
            if (out.containsKey(tok)) {
                continue;
            }
            try {
                sa.setActivatingPlayer(ai);
                if (!sa.canPlay() || !ComputerUtilCost.canPayCost(sa, ai, false)) {
                    continue;
                }
                if (!randomTargets(sa, ai)) {
                    continue;
                }
                final List<SpellAbility> one = new ArrayList<>(1);
                one.add(sa);
                out.put(tok, one);
            } catch (final RuntimeException e) {
                math.failed();
            }
        }
        return out;
    }

    /**
     * Give every targeting part of {@code sa} targets drawn uniformly from the
     * legal ones the seat can see; false when a part cannot be targeted that way
     * (no visible legal target, divided damage, a cross-target constraint) --
     * the play is then left out.
     */
    private boolean randomTargets(final SpellAbility sa, final Player ai) {
        for (SpellAbility s = sa; s != null; s = s.getSubAbility()) {
            if (!s.usesTargeting()) {
                continue;
            }
            final TargetRestrictions tr = s.getTargetRestrictions();
            if (tr == null || s.isDividedAsYouChoose() || tr.isRandomTarget() || tr.isUniqueTargets()
                    || tr.isSameController() || tr.isDifferentControllers() || tr.isDifferentCMC()
                    || tr.isDifferentNames() || tr.isEqualToughness() || tr.isWithoutSameCreatureType()) {
                return false;
            }
            final Card host = s.getHostCard();
            final int min = tr.getMinTargets(host, s);
            final int max = tr.getMaxTargets(host, s);
            s.resetTargets();
            final List<GameEntity> legal = new ArrayList<>();
            for (final GameEntity e : tr.getAllCandidates(s, true)) {
                if (Decisions.entityToken("target", e, ai) != null && s.canTarget(e)) {
                    legal.add(e);
                }
            }
            final int k = Math.min(Math.max(min, 1), Math.min(max, legal.size()));
            if (k < min || k == 0 && min > 0) {
                return false;
            }
            for (int i = 0; i < k; i++) {
                s.getTargets().add(legal.remove(math.pick(legal.size())));
            }
            if (!s.isTargetNumberValid()) {
                s.resetTargets();
                return false;
            }
        }
        return true;
    }

    /**
     * G3's public fingerprint of a game: the turn and phase, every player's
     * life, poison, counters and zone sizes, and every permanent's id,
     * controller, power, toughness, damage, counters and attachment -- not the
     * stack, not mana, not tapped status (what a cost changes).  An activated
     * ability whose resolution leaves it unchanged was a pure no-op.
     */
    static long fingerprint(final Game g) {
        long h = 1125899906842597L;
        h = 31 * h + g.getPhaseHandler().getTurn();
        h = 31 * h + String.valueOf(g.getPhaseHandler().getPhase()).hashCode();
        for (final Player p : g.getPlayers()) {
            h = 31 * h + p.getId();
            h = 31 * h + p.getLife();
            h = 31 * h + p.getPoisonCounters();
            h = 31 * h + p.getCounters().hashCode();
            for (final ZoneType z : new ZoneType[] {ZoneType.Hand, ZoneType.Library, ZoneType.Graveyard, ZoneType.Exile,
                ZoneType.Command}) {
                h = 31 * h + p.getZone(z).size();
            }
        }
        final List<Card> perms = new ArrayList<>(g.getCardsIn(ZoneType.Battlefield));
        perms.sort((a, b) -> Integer.compare(a.getId(), b.getId()));
        for (final Card c : perms) {
            h = 31 * h + c.getId();
            h = 31 * h + (c.getController() == null ? -1 : c.getController().getId());
            h = 31 * h + c.getNetPower();
            h = 31 * h + c.getNetToughness();
            h = 31 * h + c.getDamage();
            h = 31 * h + c.getCounters().hashCode();
            h = 31 * h + (c.getAttachedTo() == null ? -1 : c.getAttachedTo().getId());
        }
        return h;
    }

    static String tokenOf(final List<SpellAbility> l) {
        return Decisions.saToken(l == null || l.isEmpty() ? null : l.get(0));
    }

    /** Pass, Forge's own answer, each land drop, then the search's alternatives; one entry per token. */
    private static List<List<SpellAbility>> priorityOptions(final Player ai, final AiController aic,
                                                            final List<SpellAbility> chosen) {
        final Map<String, List<SpellAbility>> out = new LinkedHashMap<>();
        out.put("pass", null);
        final SpellAbility forgeSa = chosen == null || chosen.isEmpty() ? null : chosen.get(0);
        if (forgeSa != null) {
            out.put(tokenOf(chosen), chosen);
        }
        for (final Map.Entry<String, List<SpellAbility>> e : Decisions.landPlays(ai).entrySet()) {
            out.putIfAbsent(e.getKey(), e.getValue());   // D466: the record's listing too
        }
        final SearchPolicy.Sink quiet = new SearchPolicy.Sink() {
            @Override
            public void add(final String key, final int n) { }

            @Override
            public void event(final String text) { }
        };
        for (final SpellAbility sa : SearchPolicy.alternatives(ai, aic, forgeSa, quiet)) {
            final List<SpellAbility> one = new ArrayList<>(1);
            one.add(sa);
            out.putIfAbsent(Decisions.saToken(sa), one);
        }
        return new ArrayList<>(out.values());
    }

    // ------------------------------------------------------------------
    // Targets
    // ------------------------------------------------------------------

    /**
     * Each part of {@code sa} with exactly one target chosen, of exactly one
     * target allowed, and none of the cross-target constraints: one coin; heads
     * redraws the target uniformly from the legal ones the seat can see, tails
     * checks the close-call rule.  {@code marks} gets each changed part's mark.
     */
    public void targets(final SpellAbility sa, final Player ai, final Map<SpellAbility, Decision.Explore> marks) {
        for (SpellAbility s = sa; s != null; s = s.getSubAbility()) {
            final SpellAbility part = s;
            if (!simpleSingleTarget(part)) {
                continue;
            }
            final GameObject cur = part.getTargets().get(0);
            if (!(cur instanceof GameEntity)) {
                continue;   // a spell on the stack (a counterspell's): not in the engine's candidate list
            }
            final boolean heads = math.coin();
            try {
                final Decision.Explore m = Decisions.quiet(() -> heads ? randomTarget(part, ai, (GameEntity) cur)
                        : closeTarget(part, ai, (GameEntity) cur));
                if (m != null) {
                    marks.put(part, m);
                }
            } catch (final RuntimeException e) {
                math.failed();
            }
        }
    }

    private static boolean simpleSingleTarget(final SpellAbility s) {
        if (!s.usesTargeting() || s.isDividedAsYouChoose()) {
            return false;
        }
        final TargetRestrictions tr = s.getTargetRestrictions();
        if (tr == null || s.getTargets() == null || s.getTargets().size() != 1) {
            return false;
        }
        final Card host = s.getHostCard();
        if (tr.getMinTargets(host, s) != 1 || tr.getMaxTargets(host, s) != 1) {
            return false;
        }
        return !(tr.isRandomTarget() || tr.isUniqueTargets() || tr.isSameController() || tr.isDifferentControllers()
                || tr.isDifferentCMC() || tr.isDifferentNames() || tr.isEqualToughness() || tr.isWithoutSameCreatureType());
    }

    /** The legal targets of {@code s} the seat can see, the current one first. */
    private static List<GameEntity> legalTargets(final SpellAbility s, final Player ai, final GameEntity cur) {
        final List<GameEntity> out = new ArrayList<>();
        out.add(cur);
        for (final GameEntity e : s.getTargetRestrictions().getAllCandidates(s, true)) {
            if (e != cur && Decisions.entityToken("target", e, ai) != null && s.canTarget(e)) {
                out.add(e);
            }
        }
        return out;
    }

    private Decision.Explore randomTarget(final SpellAbility s, final Player ai, final GameEntity cur) {
        final List<GameEntity> opts = legalTargets(s, ai, cur);
        if (opts.size() < 2) {
            return null;
        }
        final GameEntity pick = opts.get(math.pick(opts.size()));
        final String forgeTok = Decisions.entityToken("target", cur, ai);
        if (pick != cur && !retarget(s, cur, pick)) {
            math.failed();
            return null;
        }
        math.randomised("target", pick == cur);
        return new Decision.Explore("random", forgeTok);
    }

    private Decision.Explore closeTarget(final SpellAbility s, final Player ai, final GameEntity cur) {
        if (math.config().closeCall <= 0 || !scorable(cur, ai)) {
            return null;
        }
        final Card forge = (Card) cur;
        final List<Card> rivals = new ArrayList<>();
        for (final GameEntity e : legalTargets(s, ai, cur)) {
            if (e != cur && scorable(e, ai) && ((Card) e).getController() == forge.getController()) {
                rivals.add((Card) e);
            }
        }
        final Card rival = nearest(forge, rivals);
        if (rival == null) {
            return null;
        }
        final String forgeTok = Decisions.entityToken("target", cur, ai);
        final boolean swap = math.fair();
        if (swap && !retarget(s, cur, rival)) {
            math.failed();
            return null;
        }
        math.closeCall(swap);
        return new Decision.Explore("closeCall", forgeTok);
    }

    /** Replace {@code s}'s one target; put the old one back if the engine says the new choice is not valid. */
    private static boolean retarget(final SpellAbility s, final GameEntity from, final GameEntity to) {
        final TargetChoices old = s.getTargets().clone();
        s.resetTargets();
        s.getTargets().add(to);
        if (s.isTargetNumberValid() && s.getTargets().size() == 1) {
            return true;
        }
        s.setTargets(old);
        return false;
    }

    // ------------------------------------------------------------------
    // Close calls on a creature an effect asks for
    // ------------------------------------------------------------------

    /** Forge chose {@code chosen} from {@code options}; return it, or its close-call rival on a fair coin. */
    public <T extends GameEntity> T entity(final Player ai, final Iterable<T> options, final T chosen) {
        mark = null;
        if (math.config().closeCall <= 0 || chosen == null) {
            return chosen;
        }
        try {
            return Decisions.quiet(() -> {
                if (!scorable(chosen, ai)) {
                    return chosen;
                }
                final Card forge = (Card) chosen;
                final List<Card> rivals = new ArrayList<>();
                final Map<Card, T> back = new LinkedHashMap<>();
                for (final T e : options) {
                    if (e != chosen && scorable(e, ai) && ((Card) e).getController() == forge.getController()) {
                        rivals.add((Card) e);
                        back.put((Card) e, e);
                    }
                }
                final Card rival = nearest(forge, rivals);
                if (rival == null) {
                    return chosen;
                }
                final boolean swap = math.fair();
                math.closeCall(swap);
                mark = new Decision.Explore("closeCall", Decisions.entityToken("option", chosen, ai));
                return swap ? back.get(rival) : chosen;
            });
        } catch (final RuntimeException e) {
            math.failed();
            return chosen;
        }
    }

    /** A creature on the battlefield whose score the seat may read: face up, or its own. */
    private static boolean scorable(final Object e, final Player ai) {
        if (!(e instanceof Card)) {
            return false;
        }
        final Card c = (Card) e;
        return c.isCreature() && c.isInZone(ZoneType.Battlefield) && (!c.isFaceDown() || c.getController() == ai);
    }

    private Card nearest(final Card forge, final List<Card> rivals) {
        if (rivals.isEmpty()) {
            return null;
        }
        final double[] scores = new double[rivals.size()];
        for (int i = 0; i < scores.length; i++) {
            scores[i] = ComputerUtilCard.evaluateCreature(rivals.get(i));
        }
        final int k = ExploreMath.nearestCloseCall(ComputerUtilCard.evaluateCreature(forge), scores,
                math.config().closeCall);
        return k < 0 ? null : rivals.get(k);
    }

    // ------------------------------------------------------------------
    // Combat
    // ------------------------------------------------------------------

    /** {@code combat} holds the seat's declared attack; on heads, a uniformly random legal one instead. */
    public void attack(final Player ai, final Combat combat) {
        mark = null;
        if (!math.coin()) {
            return;
        }
        final Map<Card, GameEntity> forge = new LinkedHashMap<>(combat.getAttackersAndDefenders());
        try {
            final Decision.Explore m = Decisions.quiet(() -> randomAttack(ai, combat, forge));
            mark = m;
        } catch (final RuntimeException e) {
            SearchPolicy.setAttack(combat, forge);
            math.failed();
        }
    }

    private Decision.Explore randomAttack(final Player ai, final Combat combat, final Map<Card, GameEntity> forge) {
        GameEntity defender = null;
        for (final GameEntity d : combat.getDefenders()) {
            if (d instanceof Player && ((Player) d).isOpponentOf(ai)) {
                defender = d;
                break;
            }
        }
        if (defender == null) {
            return null;
        }
        final List<Card> able = new ArrayList<>();
        for (final Card c : ai.getCreaturesInPlay()) {
            if ((forge.containsKey(c) || CombatUtil.canAttack(c, defender)) && able.size() < 62) {
                able.add(c);
            }
        }
        if (able.isEmpty()) {
            return null;
        }
        final String forgeTok = attackTokenOf(forge.keySet(), ai);
        for (int attempt = 0; attempt < 64; attempt++) {
            final long bits = math.mask(able.size());
            final Map<Card, GameEntity> m = new LinkedHashMap<>();
            for (int i = 0; i < able.size(); i++) {
                if ((bits & 1L << i) != 0) {
                    m.put(able.get(i), defender);
                }
            }
            if (SearchPolicy.legalAttack(combat, m)) {
                math.randomised("attack", attackTokenOf(m.keySet(), ai).equals(forgeTok));
                return new Decision.Explore("random", forgeTok);
            }
        }
        SearchPolicy.setAttack(combat, forge);
        math.failed();
        return null;
    }

    private static String attackTokenOf(final Iterable<Card> cards, final Player ai) {
        final List<Integer> ids = new ArrayList<>();
        for (final Card c : cards) {
            if (c.getController() == ai) {
                ids.add(c.getId());
            }
        }
        return Decision.attackToken(ids);
    }

    /** {@code combat} holds the seat's declared blocks; on heads, a uniformly random legal assignment instead. */
    public void block(final Player ai, final Combat combat) {
        mark = null;
        if (!math.coin() || combat.getAttackers().isEmpty()) {
            return;
        }
        final Map<Card, Card> forge = new LinkedHashMap<>();   // blocker -> attacker
        for (final Card a : combat.getAttackers()) {
            for (final Card b : combat.getBlockers(a)) {
                if (b.getController() == ai) {
                    forge.putIfAbsent(b, a);
                }
            }
        }
        try {
            mark = Decisions.quiet(() -> randomBlock(ai, combat, forge));
        } catch (final RuntimeException e) {
            SearchPolicy.setBlock(combat, ai, forge);
            math.failed();
        }
    }

    private Decision.Explore randomBlock(final Player ai, final Combat combat, final Map<Card, Card> forge) {
        SearchPolicy.setBlock(combat, ai, new LinkedHashMap<>());   // the seat's own blocks off, to list what may block
        final List<Card> blockers = new ArrayList<>();
        final List<List<Card>> choices = new ArrayList<>();
        for (final Card b : ai.getCreaturesInPlay()) {
            if (!CombatUtil.canBlock(b, combat)) {
                continue;
            }
            final List<Card> as = new ArrayList<>();
            for (final Card a : combat.getAttackers()) {
                if (CombatUtil.canBlock(a, b, combat)) {
                    as.add(a);
                }
            }
            if (!as.isEmpty()) {
                blockers.add(b);
                choices.add(as);
            }
        }
        if (blockers.isEmpty()) {
            SearchPolicy.setBlock(combat, ai, forge);
            return null;
        }
        final String forgeTok = blockTokenOf(forge);
        for (int attempt = 0; attempt < 64; attempt++) {
            final Map<Card, Card> m = new LinkedHashMap<>();
            for (int i = 0; i < blockers.size(); i++) {
                final List<Card> as = choices.get(i);
                final int k = math.pick(as.size() + 1);
                if (k > 0) {
                    m.put(blockers.get(i), as.get(k - 1));
                }
            }
            if (SearchPolicy.legalBlock(combat, ai, m)) {
                math.randomised("block", blockTokenOf(m).equals(forgeTok));
                return new Decision.Explore("random", forgeTok);
            }
        }
        SearchPolicy.setBlock(combat, ai, forge);
        math.failed();
        return null;
    }

    private static String blockTokenOf(final Map<Card, Card> m) {
        final List<int[]> pairs = new ArrayList<>();
        for (final Map.Entry<Card, Card> e : m.entrySet()) {
            pairs.add(new int[] {e.getKey().getId(), e.getValue().getId()});
        }
        return Decision.blockToken(pairs);
    }

    // ------------------------------------------------------------------
    // The opening
    // ------------------------------------------------------------------

    private boolean mulliganSeen;

    /** Forge's keep-or-mulligan; with {@code opening} on, the seven-card decision is explorable. */
    public boolean mulligan(final boolean keep, final int cardsToReturn) {
        mark = null;
        if (math.config().random) {
            mulliganSeen = true;
            math.guardrail("keep");   // G4: the random seat always keeps its opening hand
            return true;
        }
        if (!math.config().opening || mulliganSeen || cardsToReturn != 0) {
            mulliganSeen = true;
            return keep;
        }
        mulliganSeen = true;
        if (!math.coin()) {
            return keep;
        }
        final boolean k = math.pick(2) == 0;
        math.randomised("mulligan", k == keep);
        mark = new Decision.Explore("random", keep ? "keep" : "mulligan");
        return k;
    }
}
