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
import java.util.IdentityHashMap;
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
import forge.game.ability.AbilityUtils;
import forge.game.ability.ApiType;
import forge.game.ability.effects.CharmEffect;
import forge.game.card.Card;
import forge.game.combat.Combat;
import forge.game.combat.CombatUtil;
import forge.game.player.Player;
import forge.game.spellability.AbilitySub;
import forge.game.spellability.SpellAbility;
import forge.game.spellability.SpellAbilityStackInstance;
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
 * uniformly from the legal ones the seat can see, players and cards (D486:
 * before it, from the players alone; a part with a cross-target constraint,
 * divided damage, a spell as its target, or fewer visible legal targets than
 * its minimum leaves the play out).  A modal spell of its own gets its modes
 * drawn with their targets ({@link #randomModes}, D486), and one with no modes
 * chosen when it is cast gets them from the seat inside the cast
 * ({@link #modesAtCast}).  The attack, the blocks and each single target are
 * random as above; mana payment, costs and other choices stay Forge's.  Its guardrails are
 * mechanical, never strategy: (G1) a legal land drop is always taken, uniformly
 * among the lands -- which also means (G2) it never passes while a land drop
 * is pending, so G2 has no code of its own; (G3) a pure no-op is never repeated twice in a row: an
 * activated ability whose resolution left the public state unchanged
 * ({@link #fingerprint}) is not offered at the seat's next decision with the
 * stack empty; (G4) the opening hand is always kept; (G5, D458) a play the
 * engine refused to pay for is not offered again in the same priority window
 * ({@link #played}, {@link #window}); (G6, D471) a play of its own with {X}
 * in its mana cost gets X drawn uniformly from 1 to the most the seat can pay
 * ({@code ComputerUtilCost.setMaxXValue}, Forge's own maximum), and is left
 * out when only X = 0 is payable -- X = 0 is never the seat's own answer, as it
 * is never Forge's ({@link #drawX}).  Forge's own answer keeps Forge's X.  (D485) No play is
 * handed to the engine with an illegal targeting: Forge's own answer, which the seat does not
 * re-target, keeps its targets only while they are legal ({@link #staleTargets}) -- its AI can
 * leave a stale list on a play (FightAi appends a target at every evaluation), and the engine
 * then moves the card to the stack, takes the payment and drops the spell ("failed to target").
 * The turn cap is the game loop's (the cube lab's {@code turnCap}).
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
    /** G6 (D471): the play just returned is the seat's own pick (not Forge's answer) with {X} in its mana cost. */
    private boolean pendingOwnX;
    /** D485: the tokens of this listing's plays whose targets the seat made legal ({@link #staleTargets}). */
    private final Set<String> retargetedToks = new LinkedHashSet<>();
    /** D485: the play just returned is one the seat re-targeted, until the decision record reads it ({@link #takeRetargeted}). */
    private boolean pendingRetargeted;
    /** D485: the decision record's {@code why} for a play whose stale targets the seat replaced. */
    public static final String STALE_TARGETS = "STALE_TARGETS";
    /**
     * G6 (#192's review): every play the seat wrote on at this decision's
     * listing -- a drawn X, random targets -- with what it carried before
     * ({@link #restoreChoices}).  Both are written on the real {@code SpellAbility},
     * so a listed play the seat did not pick gets its X and its targets back
     * when the pick is made, and the pick keeps its own only until the engine
     * has played it (back if refused).
     */
    private final Map<SpellAbility, Before> before = new IdentityHashMap<>();

    /**
     * What one listed play carried before the random seat wrote on it: one
     * put-back per thing written (its X, each targeting part's targets), noted
     * once, before the first write, and run in the order noted.  Engine-free --
     * the put-backs are closures -- so the self-test drives it.
     */
    static final class Before {
        private final Set<Object> noted = java.util.Collections.newSetFromMap(new IdentityHashMap<>());
        private final List<Runnable> putBacks = new ArrayList<>();

        /** Note {@code putBack} for {@code what} unless {@code what} is already noted (the first value is the original). */
        void note(final Object what, final Runnable putBack) {
            if (noted.add(what)) {
                putBacks.add(putBack);
            }
        }

        void putBack() {
            for (final Runnable r : putBacks) {
                r.run();
            }
        }
    }

    /** The key {@link Before} notes a play's X under (a targeting part is noted under itself). */
    static final Object X = new Object();

    private Before before(final SpellAbility sa) {
        return before.computeIfAbsent(sa, k -> new Before());
    }
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
        final boolean ownX = pendingOwnX;
        pendingOwnX = false;
        // G6: a refused pick gets its X and targets back too; a played one keeps them (read at resolution)
        restoreChoices(before, null, refusedNow);
        if (math.config().random && ownX && !refusedNow) {
            // G6's violation, read back from the play the engine put on the stack: an activated ability
            // goes there as a fresh copy and the original's X is cleared (Forge's MagicStack.add), so the
            // X is the stack item's.  Not on the stack (countered on cast, a special action): not judged,
            // so a miss here under-counts violations (D471).
            final SpellAbility onStack = stackItemOf(seat.getGame(), sa);
            if (onStack != null && zeroXViolation(true, sa.costHasManaX(), onStack.getXManaCostPaid())) {
                math.guardrail("zeroX");
            }
        }
        if (!math.config().random || !refusedNow || tok == null || "pass".equals(tok)) {
            return;
        }
        noteRefused(window(seat.getGame(), seat), tok);
    }

    /** G6: the stack's item for the play {@code sa} just handed to the engine (itself, or the copy Forge put there), or null. */
    private static SpellAbility stackItemOf(final Game g, final SpellAbility sa) {
        for (final SpellAbilityStackInstance si : g.getStack()) {
            final SpellAbility s = si.getSpellAbility();
            if (s == sa || s != null && s.getOriginalAbility() == sa) {
                return s;
            }
        }
        return null;
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

    /**
     * G6 (D471): X for the random seat's own pick of a play with {X} in its mana
     * cost, given {@code max}, the most X the seat can pay now (Forge's
     * {@code ComputerUtilCost.setMaxXValue}): uniform over 1..max, or 0 when
     * {@code max} is below 1 -- the play is then left out of the listing and the
     * removal counted ({@code zeroXLeftOut}).  Never 0 for a listed play: the
     * seat's X was never drawn before G6 -- the play carried whatever Forge's own
     * evaluation had last written on it, most often nothing, i.e. 0 -- and Forge's
     * AI itself never answers X = 0 ({@code AiController.canPlaySa}'s
     * {@code CantAffordX}).  Engine-free, for the self-test.
     */
    static int drawX(final int max, final ExploreMath math) {
        if (max < 1) {
            math.guardrail("zeroXLeftOut");
            return 0;
        }
        return 1 + math.pick(max);
    }

    /**
     * G6's violation: the seat's own pick ({@code own}, not Forge's answer) of a
     * play with {X} in its mana cost went onto the stack with X (as the engine
     * paid it, {@code x}; null is 0) below 1.  Forge's own answer is never one:
     * its X is Forge's.  Engine-free, for the self-test.
     */
    static boolean zeroXViolation(final boolean own, final boolean manaX, final Integer x) {
        return own && manaX && (x == null || x < 1);
    }

    /** G6: the seat returns its own pick {@code pick} (not Forge's answer); one with {X} had its X drawn at the listing. */
    private void noteOwnX(final List<SpellAbility> pick) {
        if (pick != null && !pick.isEmpty() && pick.get(0).costHasManaX()) {
            pendingOwnX = true;
            math.guardrail("xDrawn");
        }
    }

    /**
     * G6 (#192's review): put back what each play in {@code drawn} carried
     * before the seat wrote on it (its X, its targets), except {@code picked}'s
     * (null: every one), and forget the restored entries -- {@code drawn} is left
     * holding {@code picked} alone, if it was written on.  {@code apply} false
     * forgets every entry and puts nothing back (a pick the engine played keeps
     * its X and targets).  Generic so the self-test runs it engine-free; returns
     * how many plays were put back.
     */
    static <T> int restoreChoices(final Map<T, Before> drawn, final T picked, final boolean apply) {
        int n = 0;
        for (final Map.Entry<T, Before> e : drawn.entrySet()) {
            if (apply && e.getKey() != picked) {
                e.getValue().putBack();
                n++;
            }
        }
        if (apply) {
            drawn.keySet().removeIf(k -> k != picked);
        } else {
            drawn.clear();
        }
        return n;
    }

    /** The random seat's priority answer, under the guardrails; no play it listed and did not pick keeps a drawn X or random targets. */
    private List<SpellAbility> randomPriority(final Player ai, final AiController aic, final List<SpellAbility> chosen) {
        before.clear();
        List<SpellAbility> out = null;
        try {
            out = randomPick(ai, aic, chosen);
            return out;
        } finally {
            restoreChoices(before, out == null || out.isEmpty() ? null : out.get(0), true);
        }
    }

    private List<SpellAbility> randomPick(final Player ai, final AiController aic, final List<SpellAbility> chosen) {
        pendingPick = null;
        pendingOwnX = false;
        pendingRetargeted = false;
        retargetedToks.clear();
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
                noteRetargeted(only);
                if (l != chosen) {
                    noteOwnX(l);
                }
                return l == null ? null : new ArrayList<>(l);
            }
            final String tok = keys.get(math.pick(keys.size()));
            pendingPick = "pass".equals(tok) ? null : tok;
            noteRetargeted(tok);
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
            noteOwnX(pick);
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
            // D485: Forge's answer goes to the engine with the targets Forge left on it, which can be
            // stale (a target that died or left, or one too many): made legal here, or not offered
            final String ftok = tokenOf(chosen);
            int fixed;
            try {
                if (isModal(forgeSa) && forgeSa.getChosenList() == null) {
                    // D486: Forge's answer with no modes chosen (CharmAi left none): at the cast Forge would
                    // choose them by doTrigger(sa, true), which can choose a mode with no legal target
                    // (s05's Suplex); the seat draws the modes and their targets now, or does not offer it
                    fixed = randomModes(forgeSa, ai) < 0 ? -1 : 1;
                } else {
                    fixed = staleTargets(forgeSa, ai);
                    if (fixed < 0 && isModal(forgeSa)) {
                        // D486: Forge's modes cannot be made legal (a chosen mode's every target gone): the
                        // seat draws the modes and their targets, as for a modal spell with none chosen
                        fixed = randomModes(forgeSa, ai) < 0 ? -1 : 1;
                    }
                }
            } catch (final RuntimeException e) {
                // a throw can come after some parts changed: never offered half-fixed (put back with the rest)
                math.failed();
                fixed = -1;
            }
            if (fixed < 0) {
                refuseStale(g, ai, ftok);
            } else {
                out.put(ftok, chosen);
                if (fixed > 0) {
                    retargetedToks.add(ftok);
                }
            }
        }
        final List<SpellAbility> all;
        try {
            all = ComputerUtilAbility.getOriginalAndAltCostAbilities(
                    ComputerUtilAbility.getSpellAbilities(ComputerUtilAbility.getAvailableCards(g, ai), ai), ai);
        } catch (final RuntimeException e) {
            math.failed();
            return out;
        }
        boolean cardOnly = false;
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
                if (!sa.canPlay()) {
                    continue;
                }
                if (sa.costHasManaX()) {
                    // G6 (D471): the seat sizes X itself, from 1 to Forge's own maximum; a play
                    // payable only at X = 0 is left out (it would be a free no-op, Crypt Rats' loop).
                    // The X it carried is noted first (setMaxXValue writes one too) and put back
                    // when the pick is made, unless this play is the pick (restoreChoices).
                    final Integer x0 = sa.getXManaCostPaid();
                    before(sa).note(X, () -> sa.setXManaCostPaid(x0));
                    final int x = drawX(ComputerUtilCost.setMaxXValue(sa, ai, false), math);
                    if (x < 1) {
                        continue;
                    }
                    sa.setXManaCostPaid(x);
                }
                if (!ComputerUtilCost.canPayCost(sa, ai, false)) {
                    continue;
                }
                final boolean playersOnly = playersOnlyWouldList(sa, ai);   // D486: before the draw writes on it
                if (isModal(sa)) {
                    // D486: a modal spell's targets at the cast are its chosen modes' (CharmEffect.makeChoices
                    // rebuilds the chain from them), so the seat draws the modes and their targets together;
                    // left out when no legal set of modes is left
                    if (randomModes(sa, ai) < 0) {
                        continue;
                    }
                } else if (!randomTargets(before(sa), sa, ai)) {
                    continue;
                } else if (sa.getApi() == ApiType.Charm) {
                    // D485: a modal spell whose modes the seat does not choose (copied, random, an opponent's
                    // choice, repeatable): its chosen modes' targets are made legal, or it is left out
                    final int fixed = staleTargets(sa, ai);
                    if (fixed < 0) {
                        continue;
                    }
                    if (fixed > 0) {
                        retargetedToks.add(tok);
                    }
                }
                if (!playersOnly) {
                    cardOnly = true;
                }
                final List<SpellAbility> one = new ArrayList<>(1);
                one.add(sa);
                out.put(tok, one);
            } catch (final RuntimeException e) {
                math.failed();
            }
        }
        if (cardOnly) {
            math.guardrail("cardTargetOffered");   // D486: a play only a card target makes possible is in this listing
        }
        return out;
    }

    /**
     * Give every targeting part of the chain from {@code head} targets drawn
     * uniformly from the legal ones the seat can see ({@link #candidates}:
     * players and cards, D486); false when a part cannot be targeted that way
     * (fewer legal visible targets than its minimum, divided damage, a
     * cross-target constraint, a spell as a target) -- the play is then left
     * out.  A part takes {@code max(min, 1)} to {@code min(max, legal)}
     * targets, the count drawn uniformly when there is a choice, each target
     * drawn in turn from those still legal beside the ones already drawn (a
     * total-CMC cap); a part with a minimum of 0 and nothing legal takes none.
     * Each part's targets are noted in {@code owner} (the play's {@link Before})
     * before they are reset, and put back unless the play is the pick ({@link #restoreChoices}):
     * Forge's AI does not always choose a play's targets afresh (D471).
     */
    private boolean randomTargets(final Before owner, final SpellAbility head, final Player ai) {
        for (SpellAbility s = head; s != null; s = s.getSubAbility()) {
            if (!s.usesTargeting()) {
                continue;
            }
            final TargetRestrictions tr = s.getTargetRestrictions();
            if (tr == null || s.isDividedAsYouChoose() || constrained(tr) || tr.getZone().contains(ZoneType.Stack)) {
                return false;
            }
            final Card host = s.getHostCard();
            final int min = tr.getMinTargets(host, s);
            final int max = tr.getMaxTargets(host, s);
            final SpellAbility part = s;
            final TargetChoices was = s.getTargets() == null ? new TargetChoices() : s.getTargets().clone();
            owner.note(part, () -> part.setTargets(was));
            s.resetTargets();
            final List<GameEntity> legal = candidates(s, ai);
            final int[] range = targetCount(min, max, legal.size());
            if (range == null) {
                return false;
            }
            final int k = range[0] + (range[1] > range[0] ? math.pick(range[1] - range[0] + 1) : 0);
            for (int i = 0; i < k; i++) {
                legal.removeIf(e -> !part.canTarget(e));   // a target's legality can depend on those drawn
                if (legal.isEmpty()) {
                    break;
                }
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
     * D486: how many targets the random seat draws for a part with {@code min}
     * and {@code max} targets and {@code legal} legal visible ones: from
     * {@code max(min, 1)} up to {@code min(max, legal)}, as {@code {lo, hi}};
     * {@code {0, 0}} for a part that may take none and has none to take (or a
     * maximum of 0, a kicker-only part unkicked); null when the minimum cannot
     * be reached.  Engine-free, for the self-test.
     */
    static int[] targetCount(final int min, final int max, final int legal) {
        final int hi = Math.min(max, legal);
        final int lo = Math.min(Math.max(min, 1), hi);
        if (hi < 0 || lo < min) {
            return null;
        }
        return new int[] {Math.max(lo, 0), Math.max(hi, 0)};
    }

    /** A part with a cross-target constraint or a random target: the seat does not draw for it. */
    private static boolean constrained(final TargetRestrictions tr) {
        return tr.isRandomTarget() || tr.isUniqueTargets() || tr.isSameController() || tr.isDifferentControllers()
                || tr.isDifferentCMC() || tr.isDifferentNames() || tr.isEqualToughness() || tr.isWithoutSameCreatureType();
    }

    /**
     * D486: the legal targets of {@code s} the seat can see now, players and
     * cards, in the engine's order.  {@code TargetRestrictions.getAllCandidates}'s
     * flag is {@code onlyNonCard} (forge-game {@code TargetRestrictions.java:571-584}
     * at the {@code forge-2.0.14} tag; the pinned jar's bytecode returns after
     * the players when it is true), so it is called with {@code false}; it keeps
     * what {@code canTarget} allows -- protection, hexproof, shroud, the
     * targeting restrictions -- and {@link Decisions#entityToken} keeps what the
     * seat can see (no other hand, no library).
     */
    static List<GameEntity> candidates(final SpellAbility s, final Player ai) {
        return keepLegal(s.getTargetRestrictions().getAllCandidates(s, playersOnlyForTest),
                e -> Decisions.entityToken("target", e, ai) != null, s::canTarget);
    }

    /** D486's negative control, for the self-test only: the old call ({@code getAllCandidates(s, true)}, players alone). */
    private static volatile boolean playersOnlyForTest;

    /** For the self-test only (D486): draw the seat's own targets from the players alone, as before D486. */
    public static void playersOnlyForTest(final boolean on) {
        playersOnlyForTest = on;
    }

    /**
     * D486: the candidates the seat may draw, in order: the ones it can see
     * ({@code visible}) that the part may target now ({@code canTarget}).
     * Engine-free, for the self-test.
     */
    static <T> List<T> keepLegal(final Iterable<? extends T> all, final java.util.function.Predicate<T> visible,
                                 final java.util.function.Predicate<T> canTarget) {
        final List<T> out = new ArrayList<>();
        for (final T e : all) {
            if (visible.test(e) && canTarget.test(e)) {
                out.add(e);
            }
        }
        return out;
    }

    /**
     * D486: whether the random seat's own listing before D486 -- its targets
     * drawn from the players alone ({@code getAllCandidates(s, true)}) -- would
     * have offered {@code sa}: each targeting part of its chain (for a modal
     * spell, the chain Forge's AI last built on it) reaches its minimum with
     * players.  Counts {@code cardTargetOffered}; draws nothing and writes
     * nothing.
     */
    private static boolean playersOnlyWouldList(final SpellAbility sa, final Player ai) {
        for (SpellAbility s = sa; s != null; s = s.getSubAbility()) {
            if (!s.usesTargeting()) {
                continue;
            }
            final TargetRestrictions tr = s.getTargetRestrictions();
            if (tr == null || s.isDividedAsYouChoose() || constrained(tr)) {
                return false;
            }
            int players = 0;
            for (final GameEntity e : tr.getAllCandidates(s, true)) {
                players += e instanceof Player ? 1 : 0;
            }
            final Card host = s.getHostCard();
            final int min = tr.getMinTargets(host, s);
            final int k = Math.min(Math.max(min, 1), Math.min(tr.getMaxTargets(host, s), players));
            if (k < min || k == 0 && min > 0) {
                return false;
            }
        }
        return true;
    }

    // ------------------------------------------------------------------
    // D486: modal spells
    // ------------------------------------------------------------------

    /** The key {@link Before} notes a modal spell's chosen modes and chain under. */
    static final Object MODES = new Object();

    /** A modal spell or ability whose modes its controller chooses at the cast (not a copy, not chosen at random or by an opponent). */
    static boolean isModal(final SpellAbility sa) {
        return sa.getApi() == ApiType.Charm && !sa.isCopied() && !sa.isTrigger() && !sa.hasParam("Random")
                && !sa.hasParam("Chooser") && !sa.hasParam("CanRepeatModes");
    }

    /**
     * D486: the random seat chooses a modal spell's modes and their targets
     * together, before the cast, as Forge's {@code CharmAi} does for its own
     * plays ({@code sa.setChosenList}, which the cast's
     * {@code chooseModeForAbility} returns as it is): the count uniform from
     * {@code max(MinCharmNum, 1)} to {@code CharmNum} (every mode for
     * entwine), then distinct modes drawn uniformly among the legal ones
     * ({@code CharmEffect.makePossibleOptions}, 603.3c), each kept only when
     * {@link #randomTargets} can target its chain.  Without it the cast's
     * modes were whatever Forge's last evaluation left on the spell -- or, with
     * none left, Forge's forced {@code doTrigger(sa, true)} inside the cast,
     * which chose a mode with no legal target and stranded the card (J168,
     * s05's Suplex).  The old modes and chain are noted first and put back
     * unless this play is the pick.  Returns 1 when chosen, -1 when no legal
     * set of modes is left (the play must not be cast).
     */
    int randomModes(final SpellAbility sa, final Player ai) {
        final Card host = sa.getHostCard();
        final List<AbilitySub> choices = CharmEffect.makePossibleOptions(sa);
        int num = AbilityUtils.calculateAmount(host, sa.getParamOrDefault("CharmNum", "1"), sa);
        int min = sa.hasParam("MinCharmNum") ? AbilityUtils.calculateAmount(host, sa.getParam("MinCharmNum"), sa) : num;
        if (sa.isEntwine()) {
            num = choices.size();
            min = num;
        }
        if (modeCount(min, num, choices.size()) == null) {
            return -1;
        }
        final List<AbilitySub> oldChosen = sa.getChosenList();
        final AbilitySub oldChain = sa.getSubAbility();
        before(sa).note(MODES, () -> {
            sa.setChosenList(oldChosen);
            sa.setSubAbility(oldChain);
        });
        final List<AbilitySub> chosen = drawModes(before(sa), ai, choices, min, num);
        if (chosen == null) {
            return -1;
        }
        sa.setChosenList(chosen);   // the record reads them (Decisions.castTargets, D485); the cast copies them
        return 1;
    }

    /**
     * D486: {@code count} modes from {@code choices}: the count uniform over
     * {@link #modeCount}, then distinct modes drawn uniformly, each kept only
     * when {@link #randomTargets} can target its chain (its old targets noted
     * in {@code b}); null when fewer than the minimum can be targeted.
     */
    private List<AbilitySub> drawModes(final Before b, final Player ai, final List<AbilitySub> choices, final int min,
                                       final int num) {
        final int[] range = modeCount(min, num, choices.size());
        if (range == null) {
            return null;
        }
        final int want = range[0] + (range[1] > range[0] ? math.pick(range[1] - range[0] + 1) : 0);
        final List<AbilitySub> pool = new ArrayList<>(choices);
        final List<AbilitySub> chosen = new ArrayList<>();
        while (chosen.size() < want && !pool.isEmpty()) {
            final AbilitySub m = pool.remove(math.pick(pool.size()));
            m.setActivatingPlayer(ai);
            if (randomTargets(b, m, ai)) {
                chosen.add(m);
            }
        }
        return chosen.size() < range[0] ? null : chosen;
    }

    /**
     * D486: the hook the seat owns inside the cast.  {@code CharmEffect.makeChoices}
     * asks the caster's controller for the modes ({@code chooseModeForAbility})
     * after the card is on the stack and before the payment; Forge's AI returns
     * the modes its last evaluation chose ({@code getChosenList}), or, with none,
     * runs {@code doTrigger(sa, true)} -- the mandatory path, which can choose a
     * mode it cannot target ({@code [[]]}), and {@code MagicStack.add} then drops
     * the paid spell ("failed to target").  The atlas's forced option is such a
     * cast: {@code SearchPolicy.alternatives} lists a modal spell Forge declines
     * as an untargeted play, with no modes chosen (J168: 650 of s05's 991 lost
     * Suplex casts).  So for the random seat: modes already chosen whose targets
     * are all legal now stand (null: Forge's answer, untouched, nothing drawn --
     * the seat's own listed picks always arrive so); otherwise the seat draws
     * the modes and their targets now ({@link #drawModes}, seeded, counted as
     * {@code retargeted}).  Null too when no legal set exists: Forge answers.
     */
    public List<AbilitySub> modesAtCast(final SpellAbility sa, final Player ai, final List<AbilitySub> possible,
                                        final int min, final int num) {
        if (!isModal(sa) || possible == null) {
            return null;
        }
        try {
            return Decisions.quiet(() -> {
                final List<AbilitySub> cur = sa.getChosenList();
                if (cur != null && cur.size() >= Math.max(min, 1) && cur.size() <= num && legalModes(cur)) {
                    return null;
                }
                final List<AbilitySub> chosen = drawModes(new Before(), ai, possible, min, num);
                if (chosen == null) {
                    return null;
                }
                math.guardrail("retargeted");
                sa.setChosenList(chosen);
                return chosen;
            });
        } catch (final RuntimeException e) {
            math.failed();
            return null;
        }
    }

    /** D486: every targeting part of every mode's chain holds a valid count of targets the part may target now. */
    private static boolean legalModes(final List<AbilitySub> modes) {
        for (final AbilitySub m : modes) {
            for (SpellAbility s = m; s != null; s = s.getSubAbility()) {
                if (!s.usesTargeting()) {
                    continue;
                }
                if (!s.isTargetNumberValid() || s.getTargetRestrictions() == null) {
                    return false;
                }
                final Set<GameEntity> cands = java.util.Collections.newSetFromMap(new IdentityHashMap<>());
                cands.addAll(s.getTargetRestrictions().getAllCandidates(s, false));
                for (final GameObject o : s.getTargets()) {
                    if (o instanceof GameEntity && (!cands.contains(o) || !s.canTarget(o))) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    /**
     * D486: whether a modal spell can be cast at all: {@code CharmEffect.makeChoices}
     * refuses one with fewer legal modes ({@code makePossibleOptions}, 603.3c: a
     * mode whose targeting has no candidate is not one) than its minimum -- after
     * the card is on the stack, so the engine strands it, silently (J168: s05's
     * Suplex at d0, with no creature or artifact on the battlefield).  True for
     * anything that is not such a spell.  The listings that offer a play without
     * choosing its modes -- {@code SearchPolicy.alternatives}' declined spells,
     * the decision record's options -- leave such a spell out.
     */
    public static boolean modesCastable(final SpellAbility sa) {
        if (sa.getApi() != ApiType.Charm || sa.isCopied() || sa.isTrigger() || sa.isEntwine()
                || sa.hasParam("CanRepeatModes") || sa.getHostCard() == null || sa.getHostCard().getZone() == null) {
            return true;
        }
        final Card host = sa.getHostCard();
        final int num = AbilityUtils.calculateAmount(host, sa.getParamOrDefault("CharmNum", "1"), sa);
        final int min = sa.hasParam("MinCharmNum") ? AbilityUtils.calculateAmount(host, sa.getParam("MinCharmNum"), sa) : num;
        return min <= CharmEffect.makePossibleOptions(sa).size();
    }

    /**
     * D486: a modal spell's mode count: from {@code max(min, 1)} to
     * {@code min(num, modes)}, as {@code {lo, hi}}; null when fewer legal
     * modes are left than the minimum.  Engine-free, for the self-test.
     */
    static int[] modeCount(final int min, final int num, final int modes) {
        final int hi = Math.min(num, modes);
        final int lo = Math.max(min, 1);
        return lo > hi ? null : new int[] {lo, hi};
    }


    // ------------------------------------------------------------------
    // D485: stale targets
    // ------------------------------------------------------------------

    /** D485: the pick just returned was a play the seat re-targeted ({@link #STALE_TARGETS}), once. */
    public boolean takeRetargeted() {
        final boolean r = pendingRetargeted;
        pendingRetargeted = false;
        return r;
    }

    /** D485: the seat returns {@code tok}; a play it re-targeted at this listing is counted ({@code retargeted}). */
    private void noteRetargeted(final String tok) {
        if (tok != null && retargetedToks.contains(tok)) {
            pendingRetargeted = true;
            math.guardrail("retargeted");
        }
    }

    /**
     * D485: Forge's answer whose targets cannot be made legal is not offered,
     * and is G5's refused play for the rest of this priority window
     * ({@code refusedCast} the first time, {@code noRepeatRefused} after; both
     * also counted as {@code staleRefused}) -- the engine would take the card
     * and the payment and drop the spell.
     */
    private void refuseStale(final Game g, final Player ai, final String tok) {
        math.guardrail("staleRefused");
        final String w = window(g, ai);
        if (refusedIn(w).contains(tok)) {
            math.guardrail("noRepeatRefused");
        } else {
            noteRefused(w, tok);
        }
    }

    /**
     * D485: the targeting parts the engine reads when {@code sa} is cast: its
     * chain, or -- for a modal spell whose modes are chosen -- each chosen mode's
     * chain, which {@code CharmEffect.makeChoices} copies onto the spell at the
     * cast, targets included ({@code SpellAbility.copy} clones them).  A modal
     * spell with no modes chosen yet has its modes and their targets chosen by
     * Forge inside the cast, after this check.  The decision record reads the
     * same parts ({@link Decisions#castTargets}), so it shows what is cast.
     */
    static List<SpellAbility> castParts(final SpellAbility sa) {
        final List<SpellAbility> out = new ArrayList<>();
        if (sa.getApi() == ApiType.Charm && !sa.isCopied()) {
            if (sa.usesTargeting()) {
                out.add(sa);
            }
            if (sa.getChosenList() != null) {
                for (final AbilitySub sub : sa.getChosenList()) {
                    for (SpellAbility s = sub; s != null; s = s.getSubAbility()) {
                        out.add(s);
                    }
                }
            }
            return out;
        }
        for (SpellAbility s = sa; s != null; s = s.getSubAbility()) {
            out.add(s);
        }
        return out;
    }

    /**
     * D485: make the targets {@code sa} carries legal before it is handed to
     * the engine, where the seat did not draw them itself.  A part is stale when
     * its target count is not valid ({@code isTargetNumberValid}: more than its
     * maximum, as Forge's {@code FightAi} leaves Troll Negotiations after
     * appending at every evaluation, or fewer than its minimum) or a target is
     * no longer a legal one (not among the part's candidates now, or
     * {@code canTarget} says no: a token that died, a card that left).  Such a
     * part keeps the targets that are still legal, drops the rest, and is
     * filled to its minimum from the legal targets the seat can see
     * ({@link #legalTargetList}, seeded); its old targets are noted first and
     * put back unless this play is the pick ({@link #restoreChoices}).  A part
     * that is not stale is never touched, and draws nothing.  Returns 0 when
     * nothing was stale, 1 when a part was re-targeted, -1 when a stale part
     * cannot be made legal (no legal list, a part with divided damage or a
     * cross-target constraint, or a target that is a spell) -- the play must
     * then not be cast.  {@code MagicStack.add} checks only the count
     * ({@code hasLegalTargeting}); a dead target that leaves the count valid
     * would fizzle, and is replaced all the same.
     */
    int staleTargets(final SpellAbility sa, final Player ai) {
        int changed = 0;
        for (final SpellAbility s : castParts(sa)) {
            if (!s.usesTargeting()) {
                if (s.getTargets() != null && !s.getTargets().isEmpty()) {
                    final SpellAbility part = s;
                    final TargetChoices was = s.getTargets().clone();
                    before(sa).note(part, () -> part.setTargets(was));
                    s.resetTargets();
                    changed = 1;
                }
                continue;
            }
            final TargetRestrictions tr = s.getTargetRestrictions();
            if (tr == null) {
                if (!s.isTargetNumberValid()) {
                    return -1;
                }
                continue;
            }
            // every candidate, cards included: getAllCandidates' flag is onlyNonCard (forge-game
            // TargetRestrictions.java:571-584 at the forge-2.0.14 tag), so (s, true) is the players alone
            final Set<GameEntity> cands = java.util.Collections.newSetFromMap(new IdentityHashMap<>());
            cands.addAll(tr.getAllCandidates(s, false));
            final List<GameEntity> cur = new ArrayList<>();
            boolean spell = false;
            boolean stale = false;
            for (final GameObject o : s.getTargets()) {
                if (o instanceof GameEntity) {
                    final GameEntity e = (GameEntity) o;
                    cur.add(e);
                    stale |= !cands.contains(e) || !s.canTarget(e);
                } else {
                    spell = true;
                }
            }
            if (!stale && s.isTargetNumberValid()) {
                continue;
            }
            if (spell || s.isDividedAsYouChoose() || constrained(tr)) {
                return -1;
            }
            final Card host = s.getHostCard();
            final List<GameEntity> fill = new ArrayList<>();
            for (final GameEntity e : cands) {
                if (Decisions.entityToken("target", e, ai) != null && s.canTarget(e)) {
                    fill.add(e);
                }
            }
            // a seeded draw needs a fixed order: players before cards (player 1 and card 1 share an id), then by id
            fill.sort((a, b) -> a instanceof Player != b instanceof Player ? (a instanceof Player ? -1 : 1)
                    : Integer.compare(a.getId(), b.getId()));
            final SpellAbility part = s;
            final List<GameEntity> next = legalTargetList(cur, e -> cands.contains(e) && part.canTarget(e), fill,
                    tr.getMinTargets(host, s), tr.getMaxTargets(host, s), math);
            if (next == null) {
                return -1;
            }
            final TargetChoices was = s.getTargets().clone();
            before(sa).note(part, () -> part.setTargets(was));
            s.resetTargets();
            for (final GameEntity e : next) {
                s.getTargets().add(e);
            }
            if (!s.isTargetNumberValid()) {
                return -1;
            }
            changed = 1;
        }
        return changed;
    }

    /**
     * D485: one stale targeting part's new targets: the ones in {@code current}
     * that are {@code stillLegal} (once each, in order), cut down to {@code max}
     * by seeded uniform draws when more are left, then filled to {@code min} by
     * seeded uniform draws from {@code fill} (the legal targets the seat can see
     * now, not already kept); null when {@code min} cannot be reached.
     * Engine-free, for the self-test.
     */
    static <T> List<T> legalTargetList(final List<T> current, final java.util.function.Predicate<T> stillLegal,
                                       final List<T> fill, final int min, final int max, final ExploreMath math) {
        final List<T> keep = new ArrayList<>();
        for (final T t : current) {
            if (!keep.contains(t) && stillLegal.test(t)) {
                keep.add(t);
            }
        }
        while (keep.size() > Math.max(max, 0)) {
            keep.remove(math.pick(keep.size()));
        }
        final List<T> pool = new ArrayList<>();
        for (final T t : fill) {
            if (!keep.contains(t) && !pool.contains(t)) {
                pool.add(t);
            }
        }
        while (keep.size() < min) {
            if (pool.isEmpty() || keep.size() >= max) {
                return null;
            }
            keep.add(pool.remove(math.pick(pool.size())));
        }
        return keep;
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
        if (sa.getApi() == ApiType.Charm && !sa.isCopied() && !sa.isTrigger()) {
            return;   // D486: the cast rebuilds a modal spell's chain from its chosen modes; a redraw on it would not be cast
        }
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
        return !constrained(tr);
    }

    /** The legal targets of {@code s} the seat can see, the current one first. */
    private static List<GameEntity> legalTargets(final SpellAbility s, final Player ai, final GameEntity cur) {
        final List<GameEntity> out = new ArrayList<>();
        out.add(cur);
        for (final GameEntity e : candidates(s, ai)) {   // D486: players and cards
            if (e != cur) {
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
