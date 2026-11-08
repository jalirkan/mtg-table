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
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;

import forge.ai.ComputerUtilCombat;
import forge.game.GameEntity;
import forge.game.ability.ApiType;
import forge.game.card.Card;
import forge.game.combat.Combat;
import forge.game.combat.CombatUtil;
import forge.game.phase.PhaseType;
import forge.game.player.Player;
import forge.game.spellability.SpellAbility;

/**
 * D523: the rollout guardrails of the search's random seat, {@code random-v2}
 * ({@link ExploreMath.Config#randomV2}).  The random seat of D451 (G1-G6 and
 * D485-D488) chooses uniformly among the legal answers; these seven checks rule
 * out answers the move atlas's random branches showed to be nonsense far more
 * often than Forge's own answer is (D523's evidence: random branch logs of
 * J193), each a cheap mechanical predicate on the seat's own choice, each
 * counted under its {@code v2.} name in the seat's {@link ExploreMath#guardrails}
 * so a night can say how often it fired:
 *
 * <ul>
 *   <li><b>R1 {@code v2.lethalAttack}</b> -- when the creatures that may attack
 *       deal at least the defender's life through no untapped creature that
 *       could block them, the attack is all of them.</li>
 *   <li><b>R2 {@code v2.lethalBlock}</b> -- when the attack would kill the seat
 *       unblocked, the blocks are redrawn (up to 64 times) until the seat's life
 *       after the attack, trample included, is above 0; if no draw does, the
 *       most damage blocked, greedily, which need not save it.</li>
 *   <li><b>R3 {@code v2.targetSide}</b> -- a harmful targeted part (a curse,
 *       damage, destroy, life loss, discard, sacrifice) is not aimed at the seat
 *       or its own permanents while a target on the other side is legal; a
 *       helpful one (pump, counters, life, regeneration, protection, not a curse)
 *       is not aimed at the opponent's side while one of the seat's own is legal.</li>
 *   <li><b>R4 {@code v2.castSomething}</b> -- in the seat's own second main phase
 *       with the stack empty, having cast no spell this turn, with a spell it can
 *       cast listed that is not an instant, it does not pass.</li>
 *   <li><b>R5 {@code v2.dominatedAttacker}</b> -- unless the attack is lethal
 *       through the defender's blockers, and only while the attackers do not
 *       outnumber them, an attacker an untapped creature of the defender can
 *       block, kill and survive is taken out of a random attack.</li>
 *   <li><b>R6 {@code v2.chumpBlock}</b> -- unless the attack is lethal (R2's
 *       case), a blocker that dies while the blockers on its attacker do not
 *       kill it together is taken out of a random block.</li>
 *   <li><b>R7 {@code v2.ownStack}</b> -- while everything on the stack is the
 *       seat's own, it passes: it does not answer itself.</li>
 * </ul>
 *
 * <p>The combat checks read Forge's combat arithmetic
 * ({@code ComputerUtilCombat.damageIfUnblocked}, {@code canDestroyAttacker},
 * {@code canDestroyBlocker}, {@code CombatUtil.canBlock}) -- what the damage
 * would be, never what Forge's AI would do.  Everything read is on the
 * battlefield or the seat's own; no hand, no library, no face-down identity.
 * Each check has an engine-free core below, driven by {@code DecisionSelfTest}.
 * Game thread only, inside the seat's decision callbacks.
 */
final class RolloutGuards {

    private RolloutGuards() {
    }

    // ------------------------------------------------------------------
    // R4: cast something
    // ------------------------------------------------------------------

    /**
     * R4 on an option list: {@code "pass"} is removed when the seat is in its
     * own second main phase ({@code ownMain2}) with the stack empty, has cast no
     * spell this turn, and a {@code cast:} option remains that is not an
     * instant ({@code instant} says which are: an instant may wait for the
     * opponent's turn, so it never forces the cast).  Engine-free.
     */
    static boolean castSomething(final Map<String, ?> opts, final boolean ownMain2, final boolean stackEmpty,
                                 final int castThisTurn, final Predicate<String> instant, final ExploreMath math) {
        if (!ownMain2 || !stackEmpty || castThisTurn > 0 || !opts.containsKey("pass")) {
            return false;
        }
        for (final String k : opts.keySet()) {
            if (k.startsWith("cast:") && !instant.test(k)) {
                opts.remove("pass");
                math.guardrail("v2.castSomething");
                return true;
            }
        }
        return false;
    }

    /** R4 at a priority of {@code ai}'s: the engine's half (whose turn, which phase, the stack, spells cast, which casts are instants). */
    static boolean castSomething(final Player ai, final Map<String, List<SpellAbility>> opts, final ExploreMath math) {
        final forge.game.Game g = ai.getGame();
        final boolean ownMain2 = g.getPhaseHandler().isPlayerTurn(ai) && g.getPhaseHandler().is(PhaseType.MAIN2);
        return castSomething(opts, ownMain2, g.getStack().isEmpty(), ai.getSpellsCastThisTurn(), k -> {
            final List<SpellAbility> l = opts.get(k);
            final Card host = l == null || l.isEmpty() ? null : l.get(0).getHostCard();
            return host != null && host.isInstant();
        }, math);
    }

    // ------------------------------------------------------------------
    // R7: its own stack
    // ------------------------------------------------------------------

    /** R7's core: a stack of {@code size} items of which {@code own} are the seat's -- non-empty and all its own.  Engine-free. */
    static boolean ownStack(final int size, final int own) {
        return size > 0 && own == size;
    }

    /** R7: the stack is not empty and every item on it was put there by {@code ai}. */
    static boolean ownStack(final Player ai) {
        int size = 0;
        int own = 0;
        for (final forge.game.spellability.SpellAbilityStackInstance si : ai.getGame().getStack()) {
            size++;
            if (si.getActivatingPlayer() == ai) {
                own++;
            }
        }
        return ownStack(size, own);
    }

    // ------------------------------------------------------------------
    // R3: the target's side
    // ------------------------------------------------------------------

    /** R3: +1 a harmful part, -1 a helpful one, 0 neither (left alone). */
    static int harm(final SpellAbility s) {
        if (s.isCurse()) {
            return 1;
        }
        final ApiType api = s.getApi();
        if (api == null) {
            return 0;
        }
        switch (api) {
            case DealDamage:
            case Destroy:
            case LoseLife:
            case Discard:
            case Sacrifice:
                return 1;
            case Pump:
            case PutCounter:
            case GainLife:
            case Regenerate:
            case Protection:
                return -1;
            default:
                return 0;
        }
    }

    /**
     * R3 on a list of legal targets: for {@code harm} +1 the seat's own side
     * ({@code ours}) is removed while a target on the other side remains; for -1
     * the other side is removed while one of the seat's own remains; 0 leaves
     * the list alone.  Counted once per list it changed.  Engine-free.
     */
    static <T> boolean side(final List<T> legal, final Predicate<T> ours, final int harm, final ExploreMath math) {
        if (harm == 0 || legal.size() < 2) {
            return false;
        }
        final boolean keepOurs = harm < 0;
        boolean anyKept = false;
        boolean anyDropped = false;
        for (final T t : legal) {
            if (ours.test(t) == keepOurs) {
                anyKept = true;
            } else {
                anyDropped = true;
            }
        }
        if (!anyKept || !anyDropped) {
            return false;
        }
        legal.removeIf(t -> ours.test(t) != keepOurs);
        math.guardrail("v2.targetSide");
        return true;
    }

    /** R3's side: the seat itself, or a card it controls. */
    static boolean ours(final GameEntity e, final Player ai) {
        return e == ai || e instanceof Card && ((Card) e).getController() == ai;
    }

    /** R3 on {@code part}'s legal targets for {@code ai}. */
    static boolean side(final SpellAbility part, final Player ai, final List<GameEntity> legal, final ExploreMath math) {
        return side(legal, e -> ours(e, ai), harm(part), math);
    }

    // ------------------------------------------------------------------
    // R1 and R5: the attack
    // ------------------------------------------------------------------

    /**
     * R1: the damage the attackers {@code able} deal through no possible
     * blocker -- each counted only when no untapped creature of the defender
     * could block it -- is at least the defender's life.  Engine-free core:
     * {@code unblockable[i]} is attacker i's damage if no blocker of the
     * defender could block it, else 0.
     */
    static boolean lethal(final int[] unblockable, final int life) {
        long sum = 0;
        for (final int d : unblockable) {
            sum += Math.max(d, 0);
        }
        return life > 0 && sum >= life;
    }

    /** The defender's creatures that could block now (untapped, not prevented from blocking). */
    static List<Card> blockers(final Player defender) {
        final List<Card> out = new ArrayList<>();
        for (final Card c : defender.getCreaturesInPlay()) {
            if (CombatUtil.canBlock(c)) {
                out.add(c);
            }
        }
        return out;
    }

    /** R1 for {@code ai} attacking {@code defender} with {@code able}. */
    static boolean lethalOpen(final Player defender, final Combat combat, final List<Card> able) {
        if (!defender.canLoseLife() || defender.cantLose()) {
            return false;
        }
        final List<Card> bs = blockers(defender);
        final int[] dmg = new int[able.size()];
        for (int i = 0; i < able.size(); i++) {
            final Card a = able.get(i);
            boolean blockable = false;
            for (final Card b : bs) {
                if (CombatUtil.canBlock(a, b)) {
                    blockable = true;
                    break;
                }
            }
            dmg[i] = blockable ? 0 : ComputerUtilCombat.damageIfUnblocked(a, defender, combat, false);
        }
        return lethal(dmg, defender.getLife());
    }

    /**
     * R5 on a drawn attack, a rule on the attack as a set: nothing is removed
     * when the attack is lethal through the defender's blockers
     * ({@code lethalThrough}, R1's arithmetic with blockers), nor while the
     * attackers outnumber the defender's {@code blockers} (a wide attack gets
     * some through, whatever blocks).  Otherwise each attacker {@code dominated}
     * says so is removed -- the attackers then never outnumber the blockers, so
     * no removal takes the attack below that point -- each removal counted.
     * Engine-free.
     */
    static <T> int dropDominated(final Map<T, ?> attack, final Predicate<T> dominated, final int blockers,
                                 final boolean lethalThrough, final ExploreMath math) {
        if (lethalThrough || attack.size() > blockers) {
            return 0;
        }
        int n = 0;
        for (final Iterator<T> it = attack.keySet().iterator(); it.hasNext(); ) {
            if (dominated.test(it.next())) {
                it.remove();
                math.guardrail("v2.dominatedAttacker");
                n++;
            }
        }
        return n;
    }

    /**
     * R5's lethal test: the attackers' damage {@code dmg} with the defender's
     * {@code blockers} each blocking one of the largest, the rest reaching it,
     * is at least its {@code life}.  Engine-free.
     */
    static boolean lethalThrough(final int[] dmg, final int blockers, final int life) {
        final int[] d = dmg.clone();
        java.util.Arrays.sort(d);
        long through = 0;
        for (int i = 0; i < d.length - Math.max(blockers, 0); i++) {
            through += Math.max(d[i], 0);
        }
        return life > 0 && through >= life;
    }

    /** R5's lethal test for an attack of {@code attackers} at {@code defender}, from the engine's numbers. */
    static boolean lethalThrough(final Player defender, final Combat combat, final java.util.Collection<Card> attackers,
                                 final int blockers) {
        if (!defender.canLoseLife() || defender.cantLose()) {
            return false;
        }
        final int[] d = new int[attackers.size()];
        int i = 0;
        for (final Card a : attackers) {
            d[i++] = ComputerUtilCombat.damageIfUnblocked(a, defender, combat, false);
        }
        return lethalThrough(d, blockers, defender.getLife());
    }

    /** R5's predicate: an untapped creature of the defender can block {@code a}, destroy it and survive. */
    static boolean dominated(final Player ai, final Card a, final List<Card> blockers, final Combat combat) {
        for (final Card b : blockers) {
            if (!CombatUtil.canBlock(a, b)) {
                continue;
            }
            if (ComputerUtilCombat.canDestroyAttacker(ai, a, b, combat, false)
                    && !ComputerUtilCombat.canDestroyBlocker(ai, b, a, combat, false)) {
                return true;
            }
        }
        return false;
    }

    // ------------------------------------------------------------------
    // R2 and R6: the blocks
    // ------------------------------------------------------------------

    /** The damage the attack would deal the seat with no block at all (attackers at the seat itself). */
    static int incoming(final Player ai, final Combat combat) {
        long sum = 0;
        for (final Card a : combat.getAttackers()) {
            if (combat.getDefenderByAttacker(a) == ai) {
                sum += Math.max(0, ComputerUtilCombat.damageIfUnblocked(a, ai, combat, false));
            }
        }
        return (int) Math.min(Integer.MAX_VALUE, sum);
    }

    /** The damage left unblocked by {@code blocks} (blocker -> attacker) out of {@code dmg} (attacker -> its damage at the seat). */
    static <A> int unblocked(final Map<A, Integer> dmg, final Map<?, A> blocks) {
        long sum = 0;
        for (final Map.Entry<A, Integer> e : dmg.entrySet()) {
            if (!blocks.containsValue(e.getKey())) {
                sum += e.getValue();
            }
        }
        return (int) Math.min(Integer.MAX_VALUE, sum);
    }

    /** R2's case: unblocked, the attack takes the seat to 0. */
    static boolean lethalIncoming(final int incoming, final int life, final boolean canLoseLife) {
        return canLoseLife && life > 0 && incoming >= life;
    }

    /**
     * R2's fallback when the redraws found no surviving block: the most damage
     * blocked, greedily -- the attackers by their damage, largest first, each
     * taking the first unused blocker that may block it.  {@code options} maps
     * each blocker to the attackers it may block.  Engine-free.
     */
    static <B, A> Map<B, A> greedyBlock(final Map<B, List<A>> options, final Map<A, Integer> dmg) {
        final List<A> order = new ArrayList<>(dmg.keySet());
        order.sort((x, y) -> Integer.compare(dmg.get(y), dmg.get(x)));
        final Map<B, A> out = new java.util.LinkedHashMap<>();
        for (final A a : order) {
            for (final Map.Entry<B, List<A>> e : options.entrySet()) {
                if (!out.containsKey(e.getKey()) && e.getValue().contains(a)) {
                    out.put(e.getKey(), a);
                    break;
                }
            }
        }
        return out;
    }

    /**
     * R6 on a drawn block, judged on the assignment as a whole: a blocker is a
     * chump only when the blockers assigned to its attacker do not kill it
     * together ({@code attackerDies}, read on the whole assignment) and the
     * blocker itself dies ({@code blockerDies}); a gang block that kills its
     * attacker keeps every blocker.  Each removal counted.  Engine-free.
     */
    static <B, A> int dropChumps(final Map<B, A> blocks, final Predicate<A> attackerDies, final Predicate<B> blockerDies,
                                 final ExploreMath math) {
        final java.util.Set<A> dies = new java.util.HashSet<>();
        final java.util.Set<B> lost = new java.util.HashSet<>();
        for (final Map.Entry<B, A> e : blocks.entrySet()) {
            if (attackerDies.test(e.getValue())) {
                dies.add(e.getValue());
            }
            if (blockerDies.test(e.getKey())) {
                lost.add(e.getKey());
            }
        }
        int n = 0;
        for (final Iterator<Map.Entry<B, A>> it = blocks.entrySet().iterator(); it.hasNext(); ) {
            final Map.Entry<B, A> e = it.next();
            if (!dies.contains(e.getValue()) && lost.contains(e.getKey())) {
                it.remove();
                math.guardrail("v2.chumpBlock");
                n++;
            }
        }
        return n;
    }

    /**
     * R6 for {@code blocks} (blocker -> attacker) in {@code combat}: the block is
     * declared in the combat first, so Forge's arithmetic reads every blocker on
     * each attacker together ({@code attackerWouldBeDestroyed},
     * {@code blockerWouldBeDestroyed}); the combat is left holding {@code blocks}.
     */
    static int dropChumps(final Player ai, final Combat combat, final Map<Card, Card> blocks, final ExploreMath math) {
        SearchPolicy.setBlock(combat, ai, blocks);
        return dropChumps(blocks, a -> ComputerUtilCombat.attackerWouldBeDestroyed(ai, a, combat),
                b -> ComputerUtilCombat.blockerWouldBeDestroyed(ai, b, combat), math);
    }

    /**
     * R2's test of a drawn block: declared in {@code combat}, the seat's life
     * after the attack by Forge's arithmetic ({@code lifeThatWouldRemain}:
     * unblocked attackers, and a blocked trampler's damage past its blockers'
     * toughness) is below 1.  The combat is left holding {@code blocks}.
     */
    static boolean deadAfter(final Player ai, final Combat combat, final Map<Card, Card> blocks) {
        SearchPolicy.setBlock(combat, ai, blocks);
        return ComputerUtilCombat.lifeThatWouldRemain(ai, combat) < 1;
    }
}
