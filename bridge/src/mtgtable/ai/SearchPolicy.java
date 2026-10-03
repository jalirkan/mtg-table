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
 * seats to the end of the next turn, and score the leaf ({@link #leaf}).  Every
 * candidate is rolled out on the same determinization and the same engine
 * random seed in a round (common random numbers), rounds repeat until the
 * wall-clock budget runs out, and the candidate with the best mean wins only
 * if it beats Forge's own answer by {@link SearchConfig#margin} over at least
 * {@link SearchConfig#minRounds} complete rounds.  Anything else -- a copy that
 * throws, a candidate that cannot be mapped into the copy, a budget too short
 * for the rounds -- is Forge's answer, counted.
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
    }

    public SearchConfig config() {
        return cfg;
    }

    // ==================================================================
    // Candidates
    // ==================================================================

    /** One alternative, installed into a fresh copy before its rollout. */
    private abstract static class Cand {
        final String label;

        Cand(final String label) {
            this.label = label;
        }

        /** Set the copy up so the rollout starts with this choice; throw if it cannot be mapped. */
        abstract void install(LenientGameCopier cp, Game copy, Player aiCopy, RolloutController rc);
    }

    /** The result of a search: the chosen index, or -1 for "Forge's own" (index 0 is always Forge's). */
    private static final class Outcome {
        int chosen;
        int rounds;
        double[] mean;
    }

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
            if (cands.size() >= cfg.maxCandidates) {
                break;
            }
            cands.add(priorityCand(sa));
        }
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
        void install(final LenientGameCopier cp, final Game copy, final Player aiCopy, final RolloutController rc) {
            final SpellAbility mapped = sa == null ? null : mapSa(cp, sa, aiCopy);
            rc.forcePriority(mapped);
            final PhaseHandler ph = copy.getPhaseHandler();
            ph.setPriority(aiCopy);
            ph.onStackResolved();   // public; the one way to say "this seat has priority now"
        }
    }

    private static Cand priorityCand(final SpellAbility sa) {
        return new PriorityCand(sa);
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
            if (cands.size() >= cfg.maxCandidates) {
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
        void install(final LenientGameCopier cp, final Game copy, final Player aiCopy, final RolloutController rc) {
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
            if (cands.size() >= cfg.maxCandidates) {
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
        void install(final LenientGameCopier cp, final Game copy, final Player aiCopy, final RolloutController rc) {
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
    // The search
    // ==================================================================

    private Outcome search(final Player ai, final List<Cand> cands, final String kind, final long t0) {
        final long deadline = t0 + cfg.budgetMs * 1_000_000L;
        final Game game = ai.getGame();
        final int k = cands.size();
        final double[] sum = new double[k];
        int rounds = 0;
        int errors = 0;
        if (Determinizer.hiddenFaceDown(game, ai) > 0) {
            sink.add("search.oppFaceDownDecisions", 1);
        }
        try {
            rounds:
            while (System.nanoTime() < deadline && rounds < cfg.maxRounds) {
                final long seed = rng.nextLong();
                final double[] round = new double[k];
                for (int i = 0; i < k; i++) {
                    final Double v;
                    try {
                        v = rollout(game, ai, cands.get(i), seed, deadline, rounds == 0 && i == 0);
                    } catch (final CopyFailed e) {
                        throw e;
                    } catch (final CandidateUnmappable e) {
                        if (i == 0) {
                            sink.add("search.fallback.unmappable", 1);
                            return null;
                        }
                        sink.add("search.candidateUnmappable", 1);
                        cands.remove(i);
                        return retryWithout(ai, cands, kind, t0);
                    } catch (final RuntimeException | StackOverflowError e) {
                        errors++;
                        sink.add("search.rolloutErrors", 1);
                        if (errors >= 3) {
                            break rounds;
                        }
                        continue rounds;
                    }
                    if (v == null) {
                        break rounds;   // out of time mid-round: the round is dropped
                    }
                    sink.add("search.rollouts", 1);
                    round[i] = v;
                }
                for (int i = 0; i < k; i++) {
                    sum[i] += round[i];
                }
                rounds++;
            }
        } catch (final CopyFailed e) {
            sink.add("search.fallback.copyError", 1);
            sink.event("search " + kind + ": copy failed, Forge's answer: " + e.getCause());
            return null;
        } finally {
            sink.add("search." + kind + ".ms", (int) ((System.nanoTime() - t0) / 1_000_000L));
        }
        sink.add("search.rounds", rounds);
        if (rounds < cfg.minRounds) {
            sink.add("search.fallback.budget", 1);
            return null;
        }
        final Outcome o = new Outcome();
        o.rounds = rounds;
        o.mean = new double[k];
        int best = 0;
        for (int i = 0; i < k; i++) {
            o.mean[i] = sum[i] / rounds;
            if (o.mean[i] > o.mean[best]) {
                best = i;
            }
        }
        o.chosen = best != 0 && o.mean[best] - o.mean[0] > cfg.margin ? best : 0;
        return o;
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

    static final class CopyFailed extends RuntimeException {
        private static final long serialVersionUID = 1L;

        CopyFailed(final Throwable cause) {
            super(cause);
        }
    }

    static final class CandidateUnmappable extends RuntimeException {
        private static final long serialVersionUID = 1L;

        CandidateUnmappable(final Throwable cause) {
            super(cause);
        }
    }

    /** One rollout: null if the deadline passed before its leaf. */
    private Double rollout(final Game game, final Player ai, final Cand cand, final long seed, final long deadline,
                           final boolean first) {
        final java.util.Random realRandom = MyRandom.getRandom();
        MyRandom.setRandom(new Random(seed));
        try {
            final LenientGameCopier cp = new LenientGameCopier(game);
            final Game copy;
            COPYING.set(Boolean.TRUE);
            try {
                if (failCopyForTest != null) {
                    throw failCopyForTest;
                }
                copy = cp.makeCopy(null, ai);
            } catch (final RuntimeException e) {
                throw new CopyFailed(e);
            } finally {
                COPYING.set(Boolean.FALSE);
            }
            if (first && cp.unmapped() > 0) {
                sink.add("search.standInDecisions", 1);
                sink.add("search.standInCards", cp.unmapped());
            }
            final Player aiCopy = (Player) cp.find(ai);
            RolloutController rc = null;
            for (final Player p : copy.getPlayers()) {
                if (p == aiCopy) {
                    rc = new RolloutController(copy, p, p.getLobbyPlayer());
                    p.dangerouslySetController(rc);
                } else {
                    p.dangerouslySetController(new PlayerControllerAi(copy, p, p.getLobbyPlayer()));
                }
            }
            try {
                cand.install(cp, copy, aiCopy, rc);
            } catch (final RuntimeException e) {
                throw new CandidateUnmappable(e);
            }
            Determinizer.determinize(copy, aiCopy, new Random(seed * 0x9E3779B97F4A7C15L + 1));
            final PhaseHandler ph = copy.getPhaseHandler();
            final int limit = ph.getTurn() + cfg.horizonTurns;
            int steps = 0;
            while (!copy.isGameOver() && ph.getTurn() <= limit && steps < 20_000) {
                if ((steps & 7) == 0 && System.nanoTime() > deadline) {
                    return null;
                }
                ph.mainLoopStep();
                steps++;
            }
            if (steps >= 20_000) {
                sink.add("search.rolloutStepCap", 1);
            }
            return leaf(copy, aiCopy);
        } finally {
            MyRandom.setRandom(realRandom);
        }
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
