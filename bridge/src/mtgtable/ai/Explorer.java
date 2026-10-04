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
import java.util.List;
import java.util.Map;

import forge.ai.AiController;
import forge.ai.ComputerUtilAbility;
import forge.ai.ComputerUtilCard;
import forge.game.Game;
import forge.game.GameEntity;
import forge.game.GameObject;
import forge.game.card.Card;
import forge.game.card.CardCollection;
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
        final Game g = ai.getGame();
        final CardCollection lands = ComputerUtilAbility.getAvailableLandsToPlay(g, ai);
        if (lands != null) {
            for (final Card c : lands) {
                final List<SpellAbility> las = new ArrayList<>();
                for (final SpellAbility sa : c.getAllPossibleAbilities(ai, true)) {
                    if (sa.isLandAbility()) {
                        las.add(sa);
                    }
                }
                if (!las.isEmpty()) {
                    out.putIfAbsent("land:" + c.getId(), las);
                }
            }
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
