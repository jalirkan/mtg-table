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

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.Set;

import forge.ai.AiController;
import forge.ai.AiPlayDecision;
import forge.ai.ComputerUtilAbility;
import forge.ai.ComputerUtilCost;
import forge.ai.PlayerControllerAi;
import forge.ai.simulation.GameStateEvaluator;
import forge.game.Game;
import forge.game.GameEntity;
import forge.game.GameObject;
import forge.game.card.Card;
import forge.game.card.CardCollection;
import forge.game.combat.Combat;
import forge.game.combat.CombatUtil;
import forge.game.phase.PhaseHandler;
import forge.game.phase.PhaseType;
import forge.game.player.Player;
import forge.game.spellability.AbilitySub;
import forge.game.spellability.SpellAbility;
import forge.game.zone.ZoneType;
import forge.util.MyRandom;
import mtgtable.eval.PositionEvaluator;

/**
 * The determinized rollout search (D312), roadmap step 2
 * ({@code docs/research/ai-architecture.md} §7).
 *
 * <p>At three kinds of decision -- (p) what to play with priority in our own
 * main phase, empty stack, "pass" included; (a) which creatures attack;
 * (b) which creatures block -- it takes Forge's own answer, builds a few
 * alternatives, and scores each by rollouts: copy the game
 * ({@link LenientGameCopier}), redeal what the AI cannot see
 * ({@link Determinizer}), force the candidate as the searching seat's first
 * answer ({@link RolloutController}), let Forge's plain Default AI play BOTH
 * seats to the end of THIS turn ({@code turns=0}, the default: a rollout of our
 * own main phase or attack stops before the opponent untaps; D351 corrects
 * D312's title, which said "the next turn"), and score the leaf ({@link #leaf}).  Every
 * candidate is rolled out on the same determinization and the same engine
 * random seed in a round (common random numbers), rounds repeat until the
 * wall-clock budget runs out, and the candidate with the best mean wins only
 * if it beats Forge's own answer by {@link SearchConfig#margin} over at least
 * {@link SearchConfig#minRounds} complete rounds (or, with {@code override=lcb},
 * if the lower confidence bound of its paired difference to Forge's answer
 * clears the margin, D350).  Every search leaves a {@link Report} -- each
 * candidate's mean, standard error and rounds, the override verdict, the margin
 * and rule used, the budget -- for the decision record ({@link #takeReport}).
 * Anything else -- a copy that
 * throws, a candidate that cannot be mapped into the copy, a budget too short
 * for the rounds -- is Forge's answer, counted.
 *
 * <p>Week 3's switches (D352–D354, each off by default): {@code anytime=1}
 * ({@link #searchAnytime}: partial rounds kept, pruning to the budget, racing,
 * a verdict on whatever paired evidence exists); {@code rank=prior}
 * ({@link #rank}: generate up to {@code gen}, keep the best {@code cands} by
 * the position after each is applied once); {@code rollout=outlets|both}
 * (D310's outlet policy inside the copies, {@link RolloutController.Outlets}).
 * With all three off the search is D312's, rollout for rollout.
 *
 * <p>Threads and randomness: everything runs on the calling game thread
 * (Forge's own AI eval threads aside, as in any default decision); no hop, no
 * thread of ours.  Each rollout installs its own seeded {@code MyRandom} and
 * restores the real game's afterwards, so the search never consumes or
 * perturbs the real game's random stream.
 */
public final class SearchPolicy {

    /** True on this thread while a copy is being built: lobby players then seat plain controllers. */
    private static final ThreadLocal<Boolean> COPYING = ThreadLocal.withInitial(() -> Boolean.FALSE);

    public static boolean copying() {
        return COPYING.get();
    }

    /** Where counters go (the controller's map, so the bench reports them). */
    public interface Sink {
        void add(String key, int n);

        void event(String text);
    }

    private static final int WIN = 100_000;

    private final SearchConfig cfg;
    private final Random rng;
    private final Sink sink;
    /** Test hook: thrown from inside the copy step, as a copier failure would be. */
    private RuntimeException failCopyForTest;

    /** For the self-test only: make every copy fail with {@code e} (null = off). */
    public void failCopyForTest(final RuntimeException e) {
        failCopyForTest = e;
    }

    public SearchPolicy(final SearchConfig cfg, final Sink sink) {
        this.cfg = cfg;
        this.sink = sink;
        this.rng = new Random(cfg.seed != 0 ? cfg.seed : System.nanoTime());
        this.evaluator = cfg.rankPrior && "eval".equals(cfg.prior) ? loadEvaluator(cfg.evalModel, sink) : null;
    }

    /** D353's learned prior (D316's evaluator), or null: the leaf is the prior. */
    private final PositionEvaluator evaluator;

    private static PositionEvaluator loadEvaluator(final String model, final Sink sink) {
        try {
            return PositionEvaluator.load(Path.of(model));
        } catch (final IOException | RuntimeException e) {
            // A missing or unusable model is not a reason to stop playing: the
            // leaf ranks instead, and the count says so.
            sink.add("search.prior.evalUnavailable", 1);
            sink.event("search prior=eval: " + model + " unusable, ranking by the leaf (" + e.getMessage() + ")");
            return null;
        }
    }

    public SearchConfig config() {
        return cfg;
    }

    // ==================================================================
    // Candidates
    // ==================================================================

    /**
     * One alternative, installed into a fresh copy before its rollout.  Public
     * (D334, the coach grader) so {@code mtgtable.grade} plays the same
     * candidates through the same {@link #playout}; only this package makes
     * them ({@link #priorityCand}, {@link #attackCand}, {@link #blockCand}).
     */
    public abstract static class Cand {
        final String label;

        Cand(final String label) {
            this.label = label;
        }

        public String label() {
            return label;
        }

        /** Set the copy up so the rollout starts with this choice; throw if it cannot be mapped. */
        abstract void install(LenientGameCopier cp, Game copy, Player aiCopy, RolloutForcing rc);
    }

    /** Play {@code sa} (its targets and choices as set on the original) first; null = pass priority. */
    public static Cand priorityCand(final SpellAbility saOrNullForPass) {
        return new PriorityCand(saOrNullForPass);
    }

    /** Declare exactly these attackers (cards of the original game) at the next declare-attackers step. */
    public static Cand attackCand(final Map<Card, GameEntity> attackers) {
        return new AttackCand(attackers);
    }

    /** Declare exactly these blocks (blocker -> attacker, cards of the original game). */
    public static Cand blockCand(final Map<Card, Card> blocks) {
        return new BlockCand(blocks);
    }

    /** The result of a search: the chosen index, or -1 for "Forge's own" (index 0 is always Forge's). */
    private static final class Outcome {
        int chosen;
        int rounds;
        double[] mean;
    }

    /**
     * Leaf points per logit when a leaf is read as a win probability,
     * {@code P(win) = σ(leaf / LEAF_SCALE)}: the coach grader's live analysis
     * ({@code mtgtable.grade.Grader}) and {@link Report#win}.  D349: fitted on
     * recorded lab games against their outcomes ({@code coach-grade.sh
     * fit-scale}): 502.8, bootstrap 95% [268, 1301] over 24 cube games (both
     * seats, 888 end-of-turn positions; docs/evidence/engine-week1.md), shipped
     * rounded.  D336's 400 was never fitted.  The PC refits it on more games
     * ({@code var/coach-grade/leaf-scale.json} then wins in the live modes).
     */
    public static final double LEAF_SCALE = 500;

    /**
     * What one search measured (D350, the review's M1): every candidate's mean
     * leaf, its standard error over rounds, its paired difference to Forge's
     * answer with that difference's standard error, the rounds, the rule and
     * margin the verdict used, whether Forge was overridden, and whether the
     * budget cut the search short or made it fall back.  Filled whatever the
     * outcome; {@link #takeReport} hands it to the decision record (branch
     * {@code c/decision-records}) and clears it.  Engine-free (numbers and
     * labels), so it costs a few arrays per search.
     */
    public static final class Report {
        /** p, a or b. */
        public String kind;
        /** The candidates, Forge's own first (index 0). */
        public List<Cand> cands = new ArrayList<>();
        /**
         * Per candidate: the rounds it was scored in.  Every candidate shares
         * them (CRN) unless {@code anytime=1} cut a round short, pruned it or
         * retired it (D352): then each counts its own, and its paired
         * difference to Forge's answer is over the rounds both were scored in.
         */
        public int[] n = new int[0];
        public double[] meanLeaf = new double[0];
        /** Standard error of the mean leaf over rounds (NaN below two rounds). */
        public double[] seLeaf = new double[0];
        /** Mean of (this − Forge's) per round, and its standard error (paired, CRN). */
        public double[] diffLeaf = new double[0];
        public double[] seDiff = new double[0];
        /** Win estimate: a finished copy 1 / 0 / 0.5, else σ(leaf / {@link #LEAF_SCALE}). */
        public double[] win = new double[0];
        /** Per round, per candidate leaf values ({@code leaves[round][cand]}): the search's raw noise. */
        public List<double[]> leaves = new ArrayList<>();
        public int rounds;
        public int playouts;
        public long ms;
        public long budgetMs;
        /** The horizon the rollouts used (turns past this one). */
        public int horizon;
        /** margin or lcb, the multiplier z (lcb only) and the margin in leaf points. */
        public String rule = "margin";
        public double z;
        public int margin;
        /** The wall-clock budget stopped the loop before {@code maxrounds}. */
        public boolean timedOut;
        /** null, or why Forge's answer was kept without a verdict: budget | copyError | unmappable | rolloutErrors | invalidAtEnd. */
        public String fallback;
        /** -1 until a verdict; else the index played (0 = Forge's). */
        public int chosen = -1;
        /** The candidate with the best mean (-1 before a verdict). */
        public int best = -1;
        /** The search's answer replaced Forge's. */
        public boolean overrode;
        /** The statistic the rule compared with the margin: the mean difference, or its lower bound. */
        public double stat = Double.NaN;
        /**
         * D353 ({@code rank=prior}): per candidate, the prior that ranked it --
         * the leaf (or the learned evaluator's logit times {@link #LEAF_SCALE})
         * of the position after it was applied once -- NaN when not scored
         * (Forge's own answer and "pass" are kept unranked and never scored; a
         * candidate the prior's time share did not reach); and how many
         * candidates were generated before the cut (0 = no ranking ran).
         */
        public double[] prior = new double[0];
        public int generated;
        /** D352: the anytime search ran; candidates it pruned to the budget, and retired by racing. */
        public boolean anytime;
        public int pruned;
        public int retired;

        /**
         * The override rule (D312; D350's noise-aware variant).  {@code margin}:
         * the best mean beats Forge's by more than {@code margin}.  {@code lcb}:
         * the lower bound {@code mean_d − z·se_d} of the best's paired per-round
         * difference to Forge's answer clears {@code margin}, over at least
         * {@link SearchConfig#LCB_MIN_ROUNDS} rounds.  Returns the index played.
         * Pure (no Forge class), so {@code GradeSelfTest} checks it on numbers.
         */
        public static int verdict(final SearchConfig cfg, final Report rep, final int best, final int rounds) {
            if (best == 0) {
                rep.stat = 0;
                return 0;
            }
            if (!cfg.lcb) {
                rep.stat = rep.diffLeaf[best];
                return rep.diffLeaf[best] > cfg.margin ? best : 0;
            }
            if (rounds < SearchConfig.LCB_MIN_ROUNDS || Double.isNaN(rep.seDiff[best])) {
                rep.stat = Double.NaN;
                return 0;
            }
            rep.stat = rep.diffLeaf[best] - cfg.z * rep.seDiff[best];
            return rep.stat > cfg.margin ? best : 0;
        }

        /**
         * Means, standard errors and paired differences to candidate 0.  A NaN
         * leaf is a rollout that was not played (D352's partial rounds, pruned or
         * retired candidates): each mean is over that candidate's own rounds and
         * each difference over the rounds both it and Forge's answer were scored
         * in.  On complete rounds (no NaN) this is D350's computation exactly.
         */
        public static void fillStats(final Report rep, final List<double[]> leaves, final List<double[]> wins, final int k) {
            final int r = leaves.size();
            rep.rounds = r;
            rep.n = new int[k];
            rep.meanLeaf = new double[k];
            rep.seLeaf = new double[k];
            rep.diffLeaf = new double[k];
            rep.seDiff = new double[k];
            rep.win = new double[k];
            for (int i = 0; i < k; i++) {
                double m = 0;
                double d = 0;
                double w = 0;
                int n = 0;
                int nd = 0;
                for (int j = 0; j < r; j++) {
                    final double x = leaves.get(j)[i];
                    if (Double.isNaN(x)) {
                        continue;
                    }
                    n++;
                    m += x;
                    w += wins.isEmpty() ? 0 : wins.get(j)[i];
                    if (!Double.isNaN(leaves.get(j)[0])) {
                        nd++;
                        d += x - leaves.get(j)[0];
                    }
                }
                m = n == 0 ? Double.NaN : m / n;
                d = nd == 0 ? Double.NaN : d / nd;
                double sm = 0;
                double sd = 0;
                for (int j = 0; j < r; j++) {
                    final double x = leaves.get(j)[i];
                    if (Double.isNaN(x)) {
                        continue;
                    }
                    sm += Math.pow(x - m, 2);
                    if (!Double.isNaN(leaves.get(j)[0])) {
                        sd += Math.pow(x - leaves.get(j)[0] - d, 2);
                    }
                }
                rep.n[i] = n;
                rep.meanLeaf[i] = m;
                rep.diffLeaf[i] = d;
                rep.seLeaf[i] = n > 1 ? Math.sqrt(sm / (n - 1) / n) : Double.NaN;
                rep.seDiff[i] = nd > 1 ? Math.sqrt(sd / (nd - 1) / nd) : Double.NaN;
                rep.win[i] = n == 0 || wins.isEmpty() ? Double.NaN : w / n;
            }
        }

        /** One line for an event log or a test. */
        public String summary() {
            final StringBuilder sb = new StringBuilder(String.format(Locale.ROOT,
                    "search %s: %d rounds, %d playouts, %d ms, horizon %d, rule %s margin %d%s, ", kind, rounds, playouts, ms,
                    horizon, rule, margin, "lcb".equals(rule) ? String.format(Locale.ROOT, " z %.2f", z) : ""));
            for (int i = 0; i < meanLeaf.length; i++) {
                sb.append(i == 0 ? "" : "; ").append(i == 0 ? "forge " : "").append(String.format(Locale.ROOT,
                        "%.0f+-%.0f (d %.0f+-%.0f)", meanLeaf[i], seLeaf[i], diffLeaf[i], seDiff[i]));
            }
            if (generated > 0) {
                sb.append(String.format(Locale.ROOT, ", ranked %d of %d by prior", meanLeaf.length, generated));
            }
            if (anytime) {
                sb.append(String.format(Locale.ROOT, ", anytime: %d pruned, %d retired", pruned, retired));
            }
            sb.append(fallback != null ? ", fallback " + fallback : overrode ? ", overrode with " + best : ", kept Forge's");
            return sb.toString();
        }
    }

    private Report report;

    /** The last search's report, or null when no search ran since the last call; clears it. */
    public Report takeReport() {
        final Report r = report;
        report = null;
        return r;
    }

    /** The last search's report, left in place. */
    public Report peekReport() {
        return report;
    }

    /** The token a candidate stands for in a decision record (D347; the coach bench's spelling). */
    public static String token(final Cand c) {
        if (c instanceof PriorityCand) {
            return Decisions.saToken(((PriorityCand) c).sa);
        }
        if (c instanceof AttackCand) {
            final List<Integer> ids = new ArrayList<>();
            for (final Card a : ((AttackCand) c).attack.keySet()) {
                ids.add(a.getId());
            }
            return Decision.attackToken(ids);
        }
        if (c instanceof BlockCand) {
            final List<int[]> pairs = new ArrayList<>();
            for (final Map.Entry<Card, Card> e : ((BlockCand) c).block.entrySet()) {
                pairs.add(new int[] {e.getKey().getId(), e.getValue().getId()});
            }
            return Decision.blockToken(pairs);
        }
        throw new IllegalArgumentException("candidate " + c);
    }

    /** The last search's report goes to the bench's event stream only when asked (a long line per search). */
    private static final boolean REPORT_EVENTS = Boolean.getBoolean("mtgtable.search.reportEvents");

    // ==================================================================
    // (p) priority in our own main phase
    // ==================================================================

    /** Whether a priority decision is one the search looks at. */
    public boolean wantsPriority(final Player ai) {
        if (!cfg.priority) {
            return false;
        }
        final Game g = ai.getGame();
        final PhaseHandler ph = g.getPhaseHandler();
        return ph.isPlayerTurn(ai) && (ph.is(PhaseType.MAIN1) || ph.is(PhaseType.MAIN2)) && g.getStack().isEmpty();
    }

    /**
     * Forge chose {@code forge} (null or empty = pass).  Return it, or a better
     * play found by the search.
     */
    public List<SpellAbility> choosePriority(final Player ai, final AiController aic, final List<SpellAbility> forge) {
        final SpellAbility forgeSa = forge == null || forge.isEmpty() ? null : forge.get(0);
        if (forgeSa != null && (forge.size() != 1 || forgeSa.isLandAbility())) {
            sink.add("search.p.skipLand", 1);
            return forge;   // a land drop (or a multi-ability land list): Forge's
        }
        final long t0 = System.nanoTime();
        final List<SpellAbility> alts = alternatives(ai, aic, forgeSa);
        if (alts.isEmpty() && forgeSa == null) {
            return forge;   // nothing to choose between
        }
        final List<Cand> cands = new ArrayList<>();
        cands.add(priorityCand(forgeSa));
        if (forgeSa != null) {
            cands.add(priorityCand(null));
        }
        for (final SpellAbility sa : alts) {
            if (cands.size() >= genLimit()) {
                break;
            }
            cands.add(priorityCand(sa));
        }
        rank(ai, cands, "p", forgeSa != null ? 2 : 1, t0);
        sink.add("search.p.considered", 1);
        final Outcome o = search(ai, cands, "p", t0);
        if (o == null || o.chosen <= 0) {
            return forge;
        }
        final Cand c = cands.get(o.chosen);
        final SpellAbility pick = ((PriorityCand) c).sa;
        sink.add("search.p.changed", 1);
        sink.add(pick == null ? "search.p.changed.toPass" : (forgeSa == null ? "search.p.changed.fromPass"
                : "search.p.changed.toOther"), 1);
        sink.event(String.format(Locale.ROOT, "search P: %s over Forge's %s (%s, %d rounds)", c.label,
                cands.get(0).label, means(cands, o), o.rounds));
        if (pick == null) {
            return null;
        }
        final List<SpellAbility> l = new ArrayList<>(1);
        l.add(pick);
        return l;
    }

    private static final class PriorityCand extends Cand {
        final SpellAbility sa;

        PriorityCand(final SpellAbility sa) {
            super(sa == null ? "pass" : describe(sa));
            this.sa = sa;
        }

        @Override
        void install(final LenientGameCopier cp, final Game copy, final Player aiCopy, final RolloutForcing rc) {
            final SpellAbility mapped = sa == null ? null : mapSa(cp, sa, aiCopy);
            rc.forcePriority(mapped);
            final PhaseHandler ph = copy.getPhaseHandler();
            ph.setPriority(aiCopy);
            ph.onStackResolved();   // public; the one way to say "this seat has priority now"
        }
    }

    /**
     * Other plays than Forge's: every spell or non-mana ability the AI could
     * play now, that Forge's own per-card judgment accepts (WillPlay, which also
     * chooses its targets) -- the RemAIDeck cards Forge hides included -- then
     * untargeted ones it declines, if affordable.  Distinct by card and text.
     */
    private List<SpellAbility> alternatives(final Player ai, final AiController aic, final SpellAbility forgeSa) {
        final List<SpellAbility> willPlay = new ArrayList<>();
        final List<SpellAbility> declined = new ArrayList<>();
        final Set<String> seen = new HashSet<>();
        if (forgeSa != null) {
            seen.add(key(forgeSa));
        }
        final Game g = ai.getGame();
        final CardCollection cards = ComputerUtilAbility.getAvailableCards(g, ai);
        final List<SpellAbility> all;
        try {
            all = ComputerUtilAbility.getOriginalAndAltCostAbilities(
                    ComputerUtilAbility.getSpellAbilities(cards, ai), ai);
        } catch (final RuntimeException e) {
            sink.add("search.p.candidateError", 1);
            return willPlay;
        }
        for (final SpellAbility sa : all) {
            if (sa == forgeSa || sa.isLandAbility() || sa.isManaAbility() || sa.isTrigger()) {
                continue;
            }
            final Card host = sa.getHostCard();
            if (host == null || host.getController() != ai && host.getOwner() != ai) {
                continue;
            }
            if (!seen.add(key(sa))) {
                continue;
            }
            try {
                sa.setActivatingPlayer(ai);
                if (!sa.canPlay()) {
                    continue;
                }
                final AiPlayDecision d = aic.canPlaySa(sa);
                if (!ComputerUtilCost.canPayCost(sa, ai, false)) {
                    continue;
                }
                if (d == AiPlayDecision.WillPlay) {
                    willPlay.add(sa);
                } else if (d == AiPlayDecision.CantPlayAi && !anyTargeting(sa) && sa.getPayCosts() != null
                        && sa.isSpell()) {
                    declined.add(sa);
                }
            } catch (final RuntimeException e) {
                sink.add("search.p.candidateError", 1);
            }
        }
        willPlay.addAll(declined);
        return willPlay;
    }

    private static boolean anyTargeting(final SpellAbility sa) {
        for (SpellAbility s = sa; s != null; s = s.getSubAbility()) {
            if (s.usesTargeting()) {
                return true;
            }
        }
        return false;
    }

    private static String key(final SpellAbility sa) {
        return sa.getHostCard().getName() + "|" + sa.getDescription();
    }

    static String describe(final SpellAbility sa) {
        final String d = sa.getHostCard().getName() + (sa.isSpell() ? "" : ": " + sa.getDescription());
        return d.length() > 60 ? d.substring(0, 60) : d;
    }

    /** The candidate's spell or ability on the copy, with its choices and targets copied. */
    static SpellAbility mapSa(final LenientGameCopier cp, final SpellAbility orig, final Player aiCopy) {
        final Card hostCopy = (Card) cp.find(orig.getHostCard());
        final String desc = orig.getDescription();
        SpellAbility found = null;
        final List<SpellAbility> pool = new ArrayList<>(hostCopy.getAllPossibleAbilities(aiCopy, true));
        for (final SpellAbility s : hostCopy.getSpellAbilities()) {
            if (!pool.contains(s)) {
                pool.add(s);
            }
        }
        final List<SpellAbility> withAlt = new ArrayList<>(pool);
        try {
            withAlt.addAll(ComputerUtilAbility.getOriginalAndAltCostAbilities(pool, aiCopy));
        } catch (final RuntimeException e) {
            // alternative costs are a nicety
        }
        for (final SpellAbility s : withAlt) {
            if (desc.equals(s.getDescription()) && s.isSpell() == orig.isSpell()) {
                found = s;
                break;
            }
        }
        if (found == null) {
            for (final SpellAbility s : withAlt) {
                if (desc.startsWith(s.getDescription()) && s.isSpell() == orig.isSpell()) {
                    found = s;
                    break;
                }
            }
        }
        if (found == null) {
            throw new IllegalStateException("no " + desc + " on the copy's " + hostCopy);
        }
        if (orig.getOptionalCosts().iterator().hasNext()) {
            throw new IllegalStateException("optional costs are not copied");
        }
        found.setActivatingPlayer(aiCopy);
        found.setXManaCostPaid(orig.getXManaCostPaid());
        if (orig.getChosenList() != null) {
            final List<AbilitySub> choices = found.getAdditionalAbilityList("Choices");
            final List<AbilitySub> chosen = new ArrayList<>();
            for (final AbilitySub m : orig.getChosenList()) {
                AbilitySub hit = null;
                for (final AbilitySub c : choices) {
                    if (java.util.Objects.equals(c.getParam("SpellDescription"), m.getParam("SpellDescription"))) {
                        hit = c;
                        break;
                    }
                }
                if (hit == null) {
                    throw new IllegalStateException("mode not found");
                }
                chosen.add(hit);
            }
            found.setChosenList(chosen);
        }
        SpellAbility src = orig;
        SpellAbility dst = found;
        while (src != null && dst != null) {
            if (src.usesTargeting()) {
                dst.resetTargets();
                for (final GameObject t : src.getTargets()) {
                    final GameObject m = cp.find(t);
                    dst.getTargets().add(m);
                    if (src.isDividedAsYouChoose()) {
                        dst.addDividedAllocation(m, src.getDividedValue(t));
                    }
                }
            }
            src = src.getSubAbility();
            dst = dst.getSubAbility();
        }
        return found;
    }

    // ==================================================================
    // (a) attacks
    // ==================================================================

    /** {@code combat} holds Forge's declaration; replace it with a better one if the search finds it. */
    public void chooseAttack(final Player ai, final Combat combat) {
        if (!cfg.attacks) {
            return;
        }
        final long t0 = System.nanoTime();
        final Map<Card, GameEntity> forge = new LinkedHashMap<>(combat.getAttackersAndDefenders());
        GameEntity defender = null;
        for (final GameEntity d : combat.getDefenders()) {
            if (d instanceof Player && ((Player) d).isOpponentOf(ai)) {
                defender = d;
                break;
            }
        }
        if (defender == null) {
            return;
        }
        final List<Card> able = new ArrayList<>();
        for (final Card c : ai.getCreaturesInPlay()) {
            if (CombatUtil.canAttack(c, defender)) {
                able.add(c);
            }
        }
        if (able.isEmpty()) {
            return;
        }
        final List<Map<Card, GameEntity>> configs = new ArrayList<>();
        configs.add(forge);
        final Map<Card, GameEntity> none = new LinkedHashMap<>();
        final Map<Card, GameEntity> all = new LinkedHashMap<>(forge);
        for (final Card c : able) {
            all.putIfAbsent(c, defender);
        }
        addConfig(configs, none);
        addConfig(configs, all);
        for (final Card c : forge.keySet()) {
            final Map<Card, GameEntity> m = new LinkedHashMap<>(forge);
            m.remove(c);
            addConfig(configs, m);
        }
        for (final Card c : able) {
            if (!forge.containsKey(c)) {
                final Map<Card, GameEntity> m = new LinkedHashMap<>(forge);
                m.put(c, defender);
                addConfig(configs, m);
            }
        }
        // Keep only legal declarations (checked on the real combat, then Forge's restored).
        final List<Cand> cands = new ArrayList<>();
        for (final Map<Card, GameEntity> m : configs) {
            if (cands.size() >= genLimit()) {
                break;
            }
            if (cands.isEmpty() || legalAttack(combat, m)) {
                cands.add(new AttackCand(m));
            }
        }
        setAttack(combat, forge);
        if (cands.size() < 2) {
            return;
        }
        rank(ai, cands, "a", 1, t0);
        sink.add("search.a.considered", 1);
        final Outcome o = search(ai, cands, "a", t0);
        if (o == null || o.chosen <= 0) {
            return;
        }
        final AttackCand c = (AttackCand) cands.get(o.chosen);
        setAttack(combat, c.attack);
        if (!CombatUtil.validateAttackers(combat)) {
            setAttack(combat, forge);
            sink.add("search.a.invalidAtEnd", 1);
            invalidAtEnd();
            return;
        }
        sink.add("search.a.changed", 1);
        sink.event(String.format(Locale.ROOT, "search A: %s over Forge's %s (%s, %d rounds)", c.label,
                cands.get(0).label, means(cands, o), o.rounds));
    }

    private static void addConfig(final List<Map<Card, GameEntity>> configs, final Map<Card, GameEntity> m) {
        for (final Map<Card, GameEntity> x : configs) {
            if (x.keySet().equals(m.keySet())) {
                return;
            }
        }
        configs.add(m);
    }

    private static boolean legalAttack(final Combat combat, final Map<Card, GameEntity> m) {
        try {
            setAttack(combat, m);
            return CombatUtil.validateAttackers(combat);
        } catch (final RuntimeException e) {
            return false;
        }
    }

    private static void setAttack(final Combat combat, final Map<Card, GameEntity> m) {
        combat.clearAttackers();
        for (final Map.Entry<Card, GameEntity> e : m.entrySet()) {
            combat.addAttacker(e.getKey(), e.getValue());
        }
    }

    private static String names(final Iterable<Card> cs) {
        final StringBuilder sb = new StringBuilder();
        for (final Card c : cs) {
            sb.append(sb.length() == 0 ? "" : "+").append(c.getName());
        }
        return sb.length() == 0 ? "none" : sb.toString();
    }

    private static final class AttackCand extends Cand {
        final Map<Card, GameEntity> attack;

        AttackCand(final Map<Card, GameEntity> attack) {
            super("attack " + names(attack.keySet()));
            this.attack = attack;
        }

        @Override
        void install(final LenientGameCopier cp, final Game copy, final Player aiCopy, final RolloutForcing rc) {
            final Map<Card, GameEntity> mapped = new LinkedHashMap<>();
            for (final Map.Entry<Card, GameEntity> e : attack.entrySet()) {
                mapped.put((Card) cp.find(e.getKey()), (GameEntity) cp.find(e.getValue()));
            }
            rc.forceAttack(mapped);
            final PhaseHandler ph = copy.getPhaseHandler();
            // Back to the beginning of combat: the next step re-enters declare
            // attackers, whose turn-based action asks our forced controller.
            ph.devModeSet(PhaseType.COMBAT_BEGIN, ph.getPlayerTurn(), false, ph.getTurn());
        }
    }

    // ==================================================================
    // (b) blocks
    // ==================================================================

    /** {@code combat} holds Forge's blocks for {@code ai}; replace them if the search finds better. */
    public void chooseBlock(final Player ai, final Combat combat) {
        if (!cfg.blocks || combat.getAttackers().isEmpty()) {
            return;
        }
        final long t0 = System.nanoTime();
        final Map<Card, Card> forge = new LinkedHashMap<>();   // blocker -> attacker
        for (final Card a : combat.getAttackers()) {
            for (final Card b : combat.getBlockers(a)) {
                if (b.getController() == ai) {
                    forge.putIfAbsent(b, a);
                }
            }
        }
        final List<Card> blockers = new ArrayList<>();
        for (final Card c : ai.getCreaturesInPlay()) {
            if (CombatUtil.canBlock(c, combat)) {
                blockers.add(c);
            }
        }
        if (blockers.isEmpty() && forge.isEmpty()) {
            return;
        }
        final List<Map<Card, Card>> configs = new ArrayList<>();
        configs.add(forge);
        addBlock(configs, new LinkedHashMap<>());
        for (final Card b : forge.keySet()) {
            final Map<Card, Card> m = new LinkedHashMap<>(forge);
            m.remove(b);
            addBlock(configs, m);
        }
        for (final Card a : combat.getAttackers()) {
            for (final Card b : blockers) {
                if (!forge.containsKey(b) && CombatUtil.canBlock(a, b, combat)) {
                    final Map<Card, Card> m = new LinkedHashMap<>(forge);
                    m.put(b, a);
                    addBlock(configs, m);
                }
            }
        }
        final List<Cand> cands = new ArrayList<>();
        for (final Map<Card, Card> m : configs) {
            if (cands.size() >= genLimit()) {
                break;
            }
            if (cands.isEmpty() || legalBlock(combat, ai, m)) {
                cands.add(new BlockCand(m));
            }
        }
        setBlock(combat, ai, forge);
        if (cands.size() < 2) {
            return;
        }
        rank(ai, cands, "b", 1, t0);
        sink.add("search.b.considered", 1);
        final Outcome o = search(ai, cands, "b", t0);
        if (o == null || o.chosen <= 0) {
            return;
        }
        final BlockCand c = (BlockCand) cands.get(o.chosen);
        setBlock(combat, ai, c.block);
        if (CombatUtil.validateBlocks(combat, ai) != null) {
            setBlock(combat, ai, forge);
            sink.add("search.b.invalidAtEnd", 1);
            invalidAtEnd();
            return;
        }
        sink.add("search.b.changed", 1);
        sink.event(String.format(Locale.ROOT, "search B: %s over Forge's %s (%s, %d rounds)", c.label,
                cands.get(0).label, means(cands, o), o.rounds));
    }

    private static void addBlock(final List<Map<Card, Card>> configs, final Map<Card, Card> m) {
        for (final Map<Card, Card> x : configs) {
            if (x.equals(m)) {
                return;
            }
        }
        configs.add(m);
    }

    private static boolean legalBlock(final Combat combat, final Player ai, final Map<Card, Card> m) {
        try {
            setBlock(combat, ai, m);
            return CombatUtil.validateBlocks(combat, ai) == null;
        } catch (final RuntimeException e) {
            return false;
        }
    }

    private static void setBlock(final Combat combat, final Player ai, final Map<Card, Card> m) {
        for (final Card b : new ArrayList<>(combat.getAllBlockers())) {
            if (b.getController() == ai) {
                combat.undoBlockingAssignment(b);
            }
        }
        for (final Map.Entry<Card, Card> e : m.entrySet()) {
            combat.addBlocker(e.getValue(), e.getKey());
        }
    }

    private static final class BlockCand extends Cand {
        final Map<Card, Card> block;

        BlockCand(final Map<Card, Card> block) {
            super("block " + blockLabel(block));
            this.block = block;
        }

        @Override
        void install(final LenientGameCopier cp, final Game copy, final Player aiCopy, final RolloutForcing rc) {
            final Map<Card, Card> mapped = new LinkedHashMap<>();
            for (final Map.Entry<Card, Card> e : block.entrySet()) {
                mapped.put((Card) cp.find(e.getKey()), (Card) cp.find(e.getValue()));
            }
            rc.forceBlock(mapped);
            final PhaseHandler ph = copy.getPhaseHandler();
            // Back to declare attackers (combat kept): the next step re-enters
            // declare blockers, whose turn-based action asks our forced controller.
            ph.devModeSet(PhaseType.COMBAT_DECLARE_ATTACKERS, ph.getPlayerTurn(), false, ph.getTurn());
        }
    }

    private static String blockLabel(final Map<Card, Card> m) {
        if (m.isEmpty()) {
            return "none";
        }
        final StringBuilder sb = new StringBuilder();
        for (final Map.Entry<Card, Card> e : m.entrySet()) {
            sb.append(sb.length() == 0 ? "" : ", ").append(e.getKey().getName()).append(">")
                    .append(e.getValue().getName());
        }
        return sb.toString();
    }

    // ==================================================================
    // The prior (D353)
    // ==================================================================

    /** How many candidates to generate: {@code gen} under {@code rank=prior}, else the {@code cands} cut itself. */
    private int genLimit() {
        return cfg.rankPrior ? cfg.generate : cfg.maxCandidates;
    }

    /** The prior's share of the budget: candidates it has not reached by then rank after the scored ones. */
    static final double PRIOR_SHARE = 0.3;

    /** Priors for the next {@link #search}'s report, keyed by candidate, and how many were generated. */
    private Map<Cand, Double> pendingPrior;
    private int pendingGenerated;

    /**
     * {@code rank=prior}: when more than {@code cands} candidates were
     * generated, apply each once -- one copy per candidate, every one on the
     * SAME determinization and engine seed, played only until the candidate
     * has resolved ({@link RolloutForcing#applied}: a spell off the stack, a
     * combat's damage dealt) -- score the position (the leaf, or D316's
     * evaluator), and keep the first {@code keep} (Forge's own answer, and
     * "pass") plus the best of the rest by that score, up to {@code cands}.
     * The prior gets {@link #PRIOR_SHARE} of the budget; a candidate it does
     * not reach ranks after the scored ones in enumeration order, and one that
     * cannot be mapped or throws is dropped.  Edits {@code cands} in place.
     */
    private void rank(final Player ai, final List<Cand> cands, final String kind, final int keep, final long t0) {
        pendingPrior = null;
        pendingGenerated = 0;
        if (!cfg.rankPrior || cands.size() <= cfg.maxCandidates) {
            return;
        }
        final long tp = System.nanoTime();
        final long deadline = t0 + (long) (cfg.budgetMs * PRIOR_SHARE * 1_000_000L);
        final long seed = rng.nextLong();
        final Map<Cand, Double> prior = new java.util.IdentityHashMap<>();
        final List<Cand> drop = new ArrayList<>();
        final Limits lim = new Limits(deadline, 0, 2_000, cfg.untapped, cfg.oracle, cfg.rolloutOutletsUs(),
                cfg.rolloutOutletsThem(), true, evaluator == null ? null : (g, p) -> evaluator.logit(g, p) * LEAF_SCALE);
        int scored = 0;
        for (int i = keep; i < cands.size(); i++) {
            if (System.nanoTime() > deadline) {
                sink.add("search.prior.timedOut", 1);
                break;
            }
            try {
                final Playout p = playout(ai.getGame(), ai, cands.get(i), seed, lim, sink, false, failCopyForTest);
                if (p == null) {
                    sink.add("search.prior.timedOut", 1);
                    break;
                }
                prior.put(cands.get(i), p.leaf);
                scored++;
            } catch (final CopyFailed e) {
                // The search's own first copy will most likely fail the same way and
                // fall back; rank nothing, but never search more than `cands`.
                while (cands.size() > cfg.maxCandidates) {
                    cands.remove(cands.size() - 1);
                }
                return;
            } catch (final RuntimeException | StackOverflowError e) {
                drop.add(cands.get(i));
                sink.add("search.prior.errors", 1);
            }
        }
        final int generated = cands.size();
        final List<Cand> head = new ArrayList<>(cands.subList(0, keep));
        final List<Cand> rest = new ArrayList<>(cands.subList(keep, cands.size()));
        rest.removeAll(drop);
        // Stable: scored candidates by prior (best first), then the unscored in enumeration order.
        rest.sort((a, b) -> {
            final Double pa = prior.get(a);
            final Double pb = prior.get(b);
            if (pa == null || pb == null) {
                return pa == null ? (pb == null ? 0 : 1) : -1;
            }
            return Double.compare(pb, pa);
        });
        cands.clear();
        cands.addAll(head);
        for (final Cand c : rest) {
            if (cands.size() >= cfg.maxCandidates) {
                break;
            }
            cands.add(c);
        }
        sink.add("search.prior.ranked", 1);
        sink.add("search.prior.playouts", scored);
        sink.add("search.prior.cut", generated - cands.size());
        sink.add("search.prior.us", (int) ((System.nanoTime() - tp) / 1000L));
        pendingPrior = prior;
        pendingGenerated = generated;
    }

    // ==================================================================
    // The search
    // ==================================================================

    private void invalidAtEnd() {
        if (report != null) {
            report.fallback = "invalidAtEnd";
            report.chosen = 0;
            report.overrode = false;
        }
    }

    /** The ranking's priors, aligned with {@code cands}, into the report (D353). */
    private void attachPrior(final Report rep, final List<Cand> cands) {
        rep.prior = new double[cands.size()];
        Arrays.fill(rep.prior, Double.NaN);
        if (pendingPrior == null) {
            return;
        }
        rep.generated = pendingGenerated;
        for (int i = 0; i < cands.size(); i++) {
            final Double v = pendingPrior.get(cands.get(i));
            if (v != null) {
                rep.prior[i] = v;
            }
        }
    }

    private Outcome search(final Player ai, final List<Cand> cands, final String kind, final long t0) {
        if (cfg.anytime) {
            return searchAnytime(ai, cands, kind, t0);
        }
        final long deadline = t0 + cfg.budgetMs * 1_000_000L;
        final Game game = ai.getGame();
        final int k = cands.size();
        final int horizon = cfg.horizonFor(kind);
        final List<double[]> leaves = new ArrayList<>();
        final List<double[]> wins = new ArrayList<>();
        int errors = 0;
        boolean retried = false;
        final Report rep = new Report();
        report = rep;
        rep.kind = kind;
        rep.cands = new ArrayList<>(cands);
        rep.budgetMs = cfg.budgetMs;
        rep.horizon = horizon;
        rep.rule = cfg.lcb ? "lcb" : "margin";
        rep.z = cfg.lcb ? cfg.z : 0;
        rep.margin = cfg.margin;
        rep.leaves = leaves;
        attachPrior(rep, cands);
        if (Determinizer.hiddenFaceDown(game, ai) > 0) {
            sink.add("search.oppFaceDownDecisions", 1);
        }
        try {
            rounds:
            while (System.nanoTime() < deadline && leaves.size() < cfg.maxRounds) {
                final long seed = rng.nextLong();
                final double[] round = new double[k];
                final double[] roundWin = new double[k];
                for (int i = 0; i < k; i++) {
                    final Playout p;
                    try {
                        p = rollout(game, ai, cands.get(i), seed, deadline, leaves.isEmpty() && i == 0, horizon);
                    } catch (final CopyFailed e) {
                        throw e;
                    } catch (final CandidateUnmappable e) {
                        if (i == 0) {
                            sink.add("search.fallback.unmappable", 1);
                            rep.fallback = "unmappable";
                            return null;
                        }
                        sink.add("search.candidateUnmappable", 1);
                        cands.remove(i);
                        retried = true;   // the retry counts the time
                        return retryWithout(ai, cands, kind, t0);
                    } catch (final RuntimeException | StackOverflowError e) {
                        errors++;
                        sink.add("search.rolloutErrors", 1);
                        if (errors >= 3) {
                            sink.add("search.fallback.rolloutErrors", 1);
                            rep.fallback = "rolloutErrors";
                            return null;
                        }
                        continue rounds;
                    }
                    if (p == null) {
                        rep.timedOut = true;
                        break rounds;   // out of time mid-round: the round is dropped
                    }
                    sink.add("search.rollouts", 1);
                    rep.playouts++;
                    round[i] = p.leaf;
                    roundWin[i] = winOf(p);
                }
                leaves.add(round);
                wins.add(roundWin);
            }
            if (leaves.size() < cfg.maxRounds && System.nanoTime() >= deadline) {
                rep.timedOut = true;
            }
        } catch (final CopyFailed e) {
            sink.add("search.fallback.copyError", 1);
            sink.event("search " + kind + ": copy failed, Forge's answer: " + e.getCause());
            rep.fallback = "copyError";
            return null;
        } finally {
            if (!retried) {
                sink.add("search." + kind + ".ms", (int) ((System.nanoTime() - t0) / 1_000_000L));
            }
            if (report == rep) {
                rep.ms = (System.nanoTime() - t0) / 1_000_000L;
                Report.fillStats(rep, leaves, wins, k);
            }
        }
        final int rounds = leaves.size();
        sink.add("search.rounds", rounds);
        if (rounds < cfg.minRounds) {
            sink.add("search.fallback.budget", 1);
            rep.fallback = "budget";
            rep.chosen = 0;
            return null;
        }
        final Outcome o = new Outcome();
        o.rounds = rounds;
        o.mean = rep.meanLeaf.clone();
        int best = 0;
        for (int i = 0; i < k; i++) {
            if (o.mean[i] > o.mean[best]) {
                best = i;
            }
        }
        o.chosen = Report.verdict(cfg, rep, best, rounds);
        if (cfg.lcb) {
            sink.add(o.chosen > 0 ? "search.lcb.overrode" : best > 0 && rep.diffLeaf[best] > cfg.margin
                    ? "search.lcb.held" : "search.lcb.none", 1);
        }
        rep.best = best;
        rep.chosen = o.chosen;
        rep.overrode = o.chosen > 0;
        if (REPORT_EVENTS) {
            sink.event(rep.summary());
        }
        return o;
    }

    // ==================================================================
    // The anytime search (D352)
    // ==================================================================

    /**
     * D312's search under {@code anytime=1}: the same candidates, rollouts,
     * common random numbers and override rule, but it never throws away work
     * and it spends the budget where it informs.
     *
     * <ul>
     * <li>Round 0 plays Forge's answer, then the rest in the order they came
     *     (the prior's, under {@code rank=prior}); later rounds play Forge's,
     *     then the others best-first, so a round the deadline cuts short has
     *     scored the candidates that matter.  A cut round keeps the rollouts it
     *     finished.</li>
     * <li>Before each later round, the measured time per rollout says how many
     *     candidates the time left can carry to {@code rounds} rounds; the
     *     worst by their paired difference to Forge's answer are pruned to fit
     *     (never Forge's, never below two).</li>
     * <li>From {@link Anytime#RACE_FROM} paired rounds, a candidate whose paired
     *     difference to the current leader is below zero by {@link Anytime#RACE_Z}
     *     standard errors is retired.  The search stops early when only Forge's
     *     answer is left.</li>
     * <li>The verdict: the best candidate is the one with the highest paired
     *     difference to Forge's answer among those with the most evidence (at
     *     least {@code rounds} paired rounds when any has that many, else as
     *     many as the best-covered); the override rule then decides as always
     *     ({@code margin}, or {@code lcb} over its paired rounds).  Forge's
     *     answer is kept without a verdict ({@code fallback: budget}) only when
     *     no alternative was scored against it at all.</li>
     * </ul>
     */
    private Outcome searchAnytime(final Player ai, final List<Cand> cands, final String kind, final long t0) {
        final long deadline = t0 + cfg.budgetMs * 1_000_000L;
        final Game game = ai.getGame();
        final int k = cands.size();
        final int horizon = cfg.horizonFor(kind);
        final List<double[]> leaves = new ArrayList<>();
        final List<double[]> wins = new ArrayList<>();
        final boolean[] active = new boolean[k];
        Arrays.fill(active, true);
        int errors = 0;
        int complete = 0;
        long rolloutNs = 0;
        int timed = 0;
        final Report rep = new Report();
        report = rep;
        rep.kind = kind;
        rep.cands = new ArrayList<>(cands);
        rep.budgetMs = cfg.budgetMs;
        rep.horizon = horizon;
        rep.rule = cfg.lcb ? "lcb" : "margin";
        rep.z = cfg.lcb ? cfg.z : 0;
        rep.margin = cfg.margin;
        rep.leaves = leaves;
        rep.anytime = true;
        attachPrior(rep, cands);
        if (Determinizer.hiddenFaceDown(game, ai) > 0) {
            sink.add("search.oppFaceDownDecisions", 1);
        }
        try {
            rounds:
            while (System.nanoTime() < deadline && complete < cfg.maxRounds) {
                final int r = leaves.size();
                if (r > 0 && timed > 0) {
                    final int cut = Anytime.pruneToBudget(active, leaves, rolloutNs / timed, deadline, r, cfg.minRounds);
                    if (cut > 0) {
                        rep.pruned += cut;
                        sink.add("search.anytime.pruned", cut);
                    }
                }
                final long seed = rng.nextLong();
                final double[] round = new double[k];
                final double[] roundWin = new double[k];
                Arrays.fill(round, Double.NaN);
                Arrays.fill(roundWin, Double.NaN);
                leaves.add(round);
                wins.add(roundWin);
                boolean full = true;
                for (final int i : Anytime.order(active, leaves, r)) {
                    final long tr = System.nanoTime();
                    final Playout p;
                    try {
                        p = rollout(game, ai, cands.get(i), seed, deadline, r == 0 && i == 0, horizon);
                    } catch (final CopyFailed e) {
                        throw e;
                    } catch (final CandidateUnmappable e) {
                        if (i == 0) {
                            sink.add("search.fallback.unmappable", 1);
                            rep.fallback = "unmappable";
                            return null;
                        }
                        sink.add("search.candidateUnmappable", 1);
                        active[i] = false;   // the rest keep playing: no restart, no lost rounds
                        continue;
                    } catch (final RuntimeException | StackOverflowError e) {
                        errors++;
                        sink.add("search.rolloutErrors", 1);
                        if (errors >= 3) {
                            sink.add("search.fallback.rolloutErrors", 1);
                            rep.fallback = "rolloutErrors";
                            return null;
                        }
                        full = false;
                        continue;
                    }
                    if (p == null) {
                        rep.timedOut = true;
                        break rounds;   // out of time mid-round: the rollouts this round finished are kept
                    }
                    rolloutNs += System.nanoTime() - tr;
                    timed++;
                    sink.add("search.rollouts", 1);
                    rep.playouts++;
                    round[i] = p.leaf;
                    roundWin[i] = winOf(p);
                }
                if (full) {
                    complete++;
                }
                final int out = Anytime.race(active, leaves);
                if (out > 0) {
                    rep.retired += out;
                    sink.add("search.anytime.retired", out);
                }
                if (Anytime.count(active) <= 1) {
                    break;   // only Forge's answer is left: decided
                }
            }
            if (complete < cfg.maxRounds && System.nanoTime() >= deadline) {
                rep.timedOut = true;
            }
        } catch (final CopyFailed e) {
            sink.add("search.fallback.copyError", 1);
            sink.event("search " + kind + ": copy failed, Forge's answer: " + e.getCause());
            rep.fallback = "copyError";
            return null;
        } finally {
            sink.add("search." + kind + ".ms", (int) ((System.nanoTime() - t0) / 1_000_000L));
            if (report == rep) {
                // A round the deadline cut before its first rollout carries nothing.
                while (!leaves.isEmpty() && Anytime.allNaN(leaves.get(leaves.size() - 1))) {
                    leaves.remove(leaves.size() - 1);
                    wins.remove(wins.size() - 1);
                }
                rep.ms = (System.nanoTime() - t0) / 1_000_000L;
                Report.fillStats(rep, leaves, wins, k);
                rep.rounds = complete;
            }
        }
        sink.add("search.rounds", complete);
        // The verdict on the evidence that exists.
        // "No information" is about every alternative scored, raced out or not:
        // racing every alternative away is a verdict (Forge's), not a fallback.
        final boolean[] any = new boolean[k];
        Arrays.fill(any, true);
        final int most = Anytime.most(any, leaves);
        if (most == 0 && Anytime.count(active) <= 1 && rep.n.length > 0 && rep.n[0] > 0) {
            // Every alternative was unmappable: nothing to choose between (D312's
            // path returns Forge's answer with no fallback label either).
            sink.add("search.anytime.noAlternatives", 1);
            return null;
        }
        if (most == 0) {
            sink.add("search.fallback.budget", 1);
            rep.fallback = "budget";
            rep.chosen = 0;
            return null;
        }
        final int best = Anytime.best(active, leaves, rep.diffLeaf, cfg.minRounds);
        if (most < cfg.minRounds) {
            sink.add("search.anytime.short", 1);   // decided on fewer rounds than `rounds`: D312 would have fallen back
        }
        final Outcome o = new Outcome();
        o.rounds = complete;
        o.mean = rep.meanLeaf.clone();
        o.chosen = Report.verdict(cfg, rep, best, best == 0 ? most : Anytime.paired(leaves, best));
        if (cfg.lcb) {
            sink.add(o.chosen > 0 ? "search.lcb.overrode" : best > 0 && rep.diffLeaf[best] > cfg.margin
                    ? "search.lcb.held" : "search.lcb.none", 1);
        }
        rep.best = best;
        rep.chosen = o.chosen;
        rep.overrode = o.chosen > 0;
        if (REPORT_EVENTS) {
            sink.event(rep.summary());
        }
        return o;
    }

    /** A playout's win estimate: a finished copy 1 / 0 / 0.5, else σ(leaf / {@link #LEAF_SCALE}). */
    public static double winOf(final Playout p) {
        if (p.over) {
            return p.result > 0 ? 1 : p.result < 0 ? 0 : 0.5;
        }
        return 1 / (1 + Math.exp(-p.leaf / LEAF_SCALE));
    }

    /** A candidate other than Forge's could not be mapped: search the rest (rare). */
    private Outcome retryWithout(final Player ai, final List<Cand> cands, final String kind, final long t0) {
        if (cands.size() < 2) {
            return null;
        }
        return search(ai, cands, kind, t0);
    }

    private static String means(final List<Cand> cands, final Outcome o) {
        final StringBuilder sb = new StringBuilder();
        for (int i = 0; i < cands.size(); i++) {
            sb.append(i == 0 ? "" : "; ").append(cands.get(i).label).append(" ")
                    .append(String.format(Locale.ROOT, "%.0f", o.mean[i]));
        }
        return sb.toString();
    }

    public static final class CopyFailed extends RuntimeException {
        private static final long serialVersionUID = 1L;

        CopyFailed(final Throwable cause) {
            super(cause);
        }
    }

    public static final class CandidateUnmappable extends RuntimeException {
        private static final long serialVersionUID = 1L;

        CandidateUnmappable(final Throwable cause) {
            super(cause);
        }
    }

    /** One rollout: null if the deadline passed before its leaf. */
    private Playout rollout(final Game game, final Player ai, final Cand cand, final long seed, final long deadline,
                            final boolean first, final int horizon) {
        return playout(game, ai, cand, seed, new Limits(deadline, horizon, 20_000, cfg.untapped, cfg.oracle,
                cfg.rolloutOutletsUs(), cfg.rolloutOutletsThem(), false, null), sink, first, failCopyForTest);
    }

    /** How far a {@link #playout} may run. */
    public static final class Limits {
        /** {@code System.nanoTime()} after which the playout gives up (and returns null). */
        public final long deadline;
        /** Play to the end of this turn plus this many; negative = to the end of the game. */
        public final int horizonTurns;
        /** {@code mainLoopStep} calls before the playout stops where it is (counted, scored as a leaf). */
        public final int maxSteps;

        /** Leaf points per untapped creature (1 = Forge's own term; D351). */
        public final double untapped;
        /** Bench only: skip the determinization, so the copy keeps the real hidden cards (D350's oracle). */
        public final boolean oracle;
        /** D354: the searching seat plays D310's outlet policy in the copy; and the other seat too. */
        public final boolean outletsUs;
        public final boolean outletsThem;
        /** D353's prior: stop as soon as the candidate has been played out ({@link RolloutForcing#applied}). */
        public final boolean untilApplied;
        /** D353: score an unfinished copy with this instead of {@link #leaf} (the learned evaluator); null = the leaf. */
        public final java.util.function.ToDoubleBiFunction<Game, Player> score;

        public Limits(final long deadline, final int horizonTurns, final int maxSteps) {
            this(deadline, horizonTurns, maxSteps, 1.0, false);
        }

        public Limits(final long deadline, final int horizonTurns, final int maxSteps, final double untapped,
                      final boolean oracle) {
            this(deadline, horizonTurns, maxSteps, untapped, oracle, false, false, false, null);
        }

        public Limits(final long deadline, final int horizonTurns, final int maxSteps, final double untapped,
                      final boolean oracle, final boolean outletsUs, final boolean outletsThem, final boolean untilApplied,
                      final java.util.function.ToDoubleBiFunction<Game, Player> score) {
            this.deadline = deadline;
            this.horizonTurns = horizonTurns;
            this.maxSteps = maxSteps;
            this.untapped = untapped;
            this.oracle = oracle;
            this.outletsUs = outletsUs;
            this.outletsThem = outletsThem;
            this.untilApplied = untilApplied;
            this.score = score;
        }
    }

    /** What one playout ended in, from the searching seat's side. */
    public static final class Playout {
        /** {@link #leaf}'s score of the final position. */
        public final double leaf;
        /** True when the copy's game ended. */
        public final boolean over;
        /** +1 won, -1 lost, 0 a draw or not over. */
        public final int result;
        /** True when {@link Limits#maxSteps} stopped it. */
        public final boolean stepCapped;
        /** Turns played in the copy past the starting one. */
        public final int turns;

        Playout(final double leaf, final boolean over, final int result, final boolean stepCapped, final int turns) {
            this.leaf = leaf;
            this.over = over;
            this.result = result;
            this.stepCapped = stepCapped;
            this.turns = turns;
        }
    }

    /**
     * One rollout of {@code cand} from {@code game} for the seat {@code ai}: copy
     * the game ({@link LenientGameCopier}), seat Forge's plain Default AI on both
     * sides with {@code ai}'s first answer forced ({@link RolloutController}),
     * redeal what {@code ai} cannot see ({@link Determinizer}, seeded from
     * {@code seed}), and play under {@code seed}'s engine randomness to the
     * horizon.  The real {@code MyRandom} is restored afterwards.  The same seed
     * on the same game gives the same determinization and engine stream for
     * every candidate: common random numbers.  Null when the deadline passed.
     * Shared by the search (D312) and the coach grader ({@code mtgtable.grade}).
     *
     * @throws CopyFailed when the copier throws; CandidateUnmappable when the
     *         candidate cannot be put on the copy
     */
    public static Playout playout(final Game game, final Player ai, final Cand cand, final long seed, final Limits lim,
                                  final Sink sink, final boolean first, final RuntimeException failCopy) {
        final java.util.Random realRandom = MyRandom.getRandom();
        MyRandom.setRandom(new Random(seed));
        try {
            final long tc = System.nanoTime();
            final LenientGameCopier cp = new LenientGameCopier(game);
            final Game copy;
            COPYING.set(Boolean.TRUE);
            try {
                if (failCopy != null) {
                    throw failCopy;
                }
                copy = cp.makeCopy(null, ai);
            } catch (final RuntimeException e) {
                throw new CopyFailed(e);
            } finally {
                COPYING.set(Boolean.FALSE);
            }
            sink.add(lim.untilApplied ? "search.prior.copyUs" : "search.copyUs", (int) ((System.nanoTime() - tc) / 1000L));
            // Forge's own per-decision limit inside a rollout: 1 s, not 5 (an
            // eval that times out plays nothing, which a rollout survives).
            copy.AI_TIMEOUT = 1;
            if (first && cp.unmapped() > 0) {
                sink.add("search.standInDecisions", 1);
                sink.add("search.standInCards", cp.unmapped());
            }
            final Player aiCopy = (Player) cp.find(ai);
            RolloutForcing rc = null;
            for (final Player p : copy.getPlayers()) {
                if (p == aiCopy) {
                    if (lim.outletsUs) {
                        final RolloutController.Outlets o = new RolloutController.Outlets(copy, p, p.getLobbyPlayer());
                        rc = o;
                        p.dangerouslySetController(o);
                    } else {
                        final RolloutController c = new RolloutController(copy, p, p.getLobbyPlayer());
                        rc = c;
                        p.dangerouslySetController(c);
                    }
                } else if (lim.outletsThem) {
                    p.dangerouslySetController(new PolicyControllerAi(copy, p, p.getLobbyPlayer(), new OutletPolicy(true)));
                } else {
                    p.dangerouslySetController(new PlayerControllerAi(copy, p, p.getLobbyPlayer()));
                }
            }
            try {
                cand.install(cp, copy, aiCopy, rc);
            } catch (final RuntimeException e) {
                throw new CandidateUnmappable(e);
            }
            if (lim.oracle) {
                // D350's bench-only oracle: the copy keeps the real hand and library
                // order (SearchConfig.parseLive refuses it for a live seat).
                sink.add("search.oracleRollouts", 1);
            } else {
                Determinizer.determinize(copy, aiCopy, new Random(seed * 0x9E3779B97F4A7C15L + 1));
            }
            final long tp = System.nanoTime();
            final PhaseHandler ph = copy.getPhaseHandler();
            final int startTurn = ph.getTurn();
            final int limit = lim.horizonTurns < 0 ? Integer.MAX_VALUE : startTurn + lim.horizonTurns;
            int steps = 0;
            while (!copy.isGameOver() && ph.getTurn() <= limit && steps < lim.maxSteps) {
                if ((steps & 7) == 0 && System.nanoTime() > lim.deadline) {
                    return null;
                }
                if (lim.untilApplied && rc.applied(copy)) {
                    break;
                }
                ph.mainLoopStep();
                steps++;
            }
            final boolean capped = steps >= lim.maxSteps;
            if (capped && !lim.untilApplied) {
                sink.add("search.rolloutStepCap", 1);
            }
            sink.add(lim.untilApplied ? "search.prior.playUs" : "search.playUs", (int) ((System.nanoTime() - tp) / 1000L));
            final double leaf = lim.score != null && !copy.isGameOver() ? lim.score.applyAsDouble(copy, aiCopy)
                    : leaf(copy, aiCopy, lim.untapped);
            return new Playout(leaf, copy.isGameOver(), resultOf(copy, aiCopy), capped, ph.getTurn() - startTurn);
        } finally {
            MyRandom.setRandom(realRandom);
        }
    }

    /** +1 when {@code ai} won the copy, -1 when it lost, 0 for a draw or a game still going. */
    static int resultOf(final Game g, final Player ai) {
        if (ai.hasLost()) {
            return -1;
        }
        if (ai.hasWon()) {
            return 1;
        }
        for (final Player p : g.getPlayers()) {
            if (p != ai && p.hasLost()) {
                return 1;
            }
        }
        return 0;
    }

    // ==================================================================
    // The leaf
    // ==================================================================

    private static final GameStateEvaluator CARD_EVAL = new GameStateEvaluator();

    /**
     * The leaf score from {@code ai}'s side: a win or a loss dominates (sooner
     * is better); otherwise life through a curve that makes the last points
     * dear, cards in hand, and every permanent through Forge's own card
     * evaluator ({@code GameStateEvaluator.evalCard}: {@code CreatureEvaluator}
     * for creatures, mana for lands, 50 + 30 x mana value otherwise), ours plus
     * and theirs minus.
     */
    public static double leaf(final Game g, final Player ai) {
        return leaf(g, ai, 1.0);
    }

    /**
     * {@link #leaf} with an untapped creature worth {@code untapped} leaf
     * points more than a tapped one (Forge's {@code CreatureEvaluator} gives 1,
     * so 1 is the plain leaf).  D351: the review's H1 -- at 1 point, attacking
     * with everything costs the leaf almost nothing however hard the crack-back
     * is; the weight is a knob for the ladder's SPRT, its default unchanged.
     */
    public static double leaf(final Game g, final Player ai, final double untapped) {
        final int turn = g.getPhaseHandler().getTurn();
        // isInGame() is "no outcome yet": a winner is out of the game too.
        if (ai.hasLost()) {
            return -WIN + 100.0 * turn;
        }
        if (ai.hasWon()) {
            return WIN - 100.0 * turn;
        }
        for (final Player p : g.getPlayers()) {
            if (p != ai && p.hasLost()) {
                return WIN - 100.0 * turn;
            }
        }
        if (g.isGameOver()) {
            return 0;   // a draw
        }
        double s = 0;
        for (final Player p : g.getPlayers()) {
            final int sign = p == ai ? 1 : -1;
            s += sign * lifeValue(p.getLife());
            s -= sign * 25.0 * p.getPoisonCounters();
            final int hand = p.getCardsIn(ZoneType.Hand).size();
            s += sign * 40.0 * (p.isUnlimitedHandSize() ? hand : Math.min(hand, p.getMaxHandSize()));
            if (p.getCardsIn(ZoneType.Library).isEmpty()) {
                s -= sign * 300.0;
            }
        }
        for (final Card c : g.getCardsIn(ZoneType.Battlefield)) {
            if (c.isPhasedOut()) {
                continue;
            }
            int v;
            try {
                v = CARD_EVAL.evalCard(g, ai, c);
            } catch (final RuntimeException e) {
                v = 50;
            }
            s += (c.getController() == ai ? 1 : -1) * v;
            if (untapped != 1.0 && c.isCreature() && c.isUntapped()) {
                s += (c.getController() == ai ? 1 : -1) * (untapped - 1.0);
            }
        }
        return s;
    }

    /** Life on a concave curve: 30 a point to 5, 18 to 10, 8 to 20, 2 beyond. */
    static double lifeValue(final int life) {
        if (life <= 0) {
            return -500;
        }
        final int a = Math.min(life, 5);
        final int b = Math.min(Math.max(life - 5, 0), 5);
        final int c = Math.min(Math.max(life - 10, 0), 10);
        final int d = Math.max(life - 20, 0);
        return 30.0 * a + 18.0 * b + 8.0 * c + 2.0 * d;
    }
}
