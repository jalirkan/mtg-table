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
package mtgtable.grade;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import forge.ai.AiController;
import forge.ai.ComputerUtilCost;
import forge.ai.PlayerControllerAi;
import forge.ai.SpellApiToAi;
import forge.game.GameEntity;
import forge.game.card.Card;
import forge.game.combat.Combat;
import forge.game.combat.CombatUtil;
import forge.game.phase.PhaseHandler;
import forge.game.player.Player;
import forge.game.spellability.SpellAbility;
import forge.game.trigger.Trigger;
import mtgtable.Json;
import mtgtable.ai.SearchPolicy;

/**
 * The engine-graded coach bench's grader (D334): one decision of a recorded
 * game, every legal option of the kinds the bench asks about, each played out
 * many times by Forge's Default AI on both seats, on common random numbers,
 * with racing; the result is each option's win rate and its regret against the
 * best option, both with intervals.
 *
 * <p>The yardstick is "best against Forge Default, played on by Forge
 * Default": an option's value is how often the viewing seat wins when it takes
 * that option and Forge's Default AI then plays both seats to the end.  The
 * playouts reuse the search AI's rollout ({@link SearchPolicy#playout}: its
 * copier, determinizer and forced first answer), so a grade and a search
 * decision mean the same thing.
 *
 * <p>Options, as the coach bench spells them:
 * <ul>
 * <li>{@code spell}: {@code pass}, {@code cast:<id>} for every spell in hand
 *     the engine lets the viewer cast now (targets as Forge's AI would aim
 *     them), {@code land:<id>} when asked;</li>
 * <li>{@code attack}: {@code attack:none} / {@code attack:<ids>}, every legal
 *     attack on the opponent by creature class (identical creatures are one
 *     choice), or a shortlist above {@code cap};</li>
 * <li>{@code block}: {@code block:none} / {@code block:<b>><a>,...}, likewise;</li>
 * <li>{@code target}: {@code target:<id>} for every id the engine offered,
 *     for a spell or ability being cast (cast with that target) or a trigger
 *     of a permanent (put on the stack with that target).</li>
 * </ul>
 */
public final class Grader {

    /** The grading run's settings. */
    public static final class Settings {
        public long seed = 1;
        /** Wall-clock budget for the whole decision, ms (0 = none): the live analysis's knob. */
        public long budgetMs;
        public Racer.Config race = new Racer.Config();
        /** Negative: play to the end of the game (the default). Else turns past this one, then the evaluator. */
        public int horizon = -1;
        /** With horizon < 0: turns after which an unfinished playout is scored a draw. */
        public int maxTurns = 40;
        public int maxSteps = 200_000;
        public long playoutTimeoutMs = 120_000;
        /** Most options enumerated in full; above it, a shortlist. */
        public int cap = 24;
        /**
         * Leaf points per logit in horizon mode: {@code P(win) = σ(leaf / leafScale)}.
         * D349: fitted on recorded games against their outcomes
         * ({@code coach-grade.sh fit-scale}); the shipped default is
         * {@link SearchPolicy#LEAF_SCALE}.  D336's 400 was never fitted.
         */
        public double leafScale = SearchPolicy.LEAF_SCALE;
        /** Where {@link #leafScale} came from, for the answer's {@code config}. */
        public String leafScaleSource = "default";
        /**
         * D352 (the evaluator gates): score a playout that stops at the horizon
         * with the learned evaluator instead of the hand leaf; null = the hand
         * leaf.  Its value is the evaluator's P(win) itself, not σ(leaf / leafScale).
         */
        public mtgtable.eval.PositionEvaluator leafEval;
        /** The evaluator's model path, for the answer's {@code config}. */
        public String leafEvalSource;
        public boolean lands;
        /** Only these tokens (null = all). */
        public List<String> only;
        /** Tokens always added to a shortlist (a case's listed answers). */
        public List<String> extra = new ArrayList<>();
    }

    /** One option: its bench token, and how to set it up on a rebuilt base. */
    static final class Opt {
        final String token;
        final String label;
        boolean forge;
        /** Tokens of interchangeable choices (another copy of the same card): graded once, reported under each. */
        final List<String> aliases = new ArrayList<>();
        /** Tweaks of its own (a target put on the stack), or null to share the round's base. */
        final Rebuild.Tweaks tweaks;
        final Function<Rebuild.Base, SearchPolicy.Cand> cand;

        Opt(final String token, final String label, final Rebuild.Tweaks tweaks, final Function<Rebuild.Base, SearchPolicy.Cand> cand) {
            this.token = token;
            this.label = label;
            this.tweaks = tweaks;
            this.cand = cand;
        }
    }

    private final WireLog log;
    private final WireLog.Moment moment;
    private final String type;
    private final Rebuild.Knowledge know;
    private final Settings set;
    private final String key;
    private final Map<Integer, Map<?, ?>> wireCards = new HashMap<>();
    private final Map<String, Integer> counters = new TreeMap<>();
    private final List<String> notes = new ArrayList<>();
    private Rebuild.Tweaks shared;

    public Grader(final WireLog log, final WireLog.Moment moment, final String type, final Rebuild.Knowledge know,
                  final Settings set, final String key) {
        this.log = log;
        this.moment = moment;
        this.type = type;
        this.know = know;
        this.set = set;
        this.key = key;
        for (final Object po : WireLog.arr(moment.state, "players")) {
            for (final String z : new String[] {"hand", "battlefield", "graveyard", "exile", "library"}) {
                for (final Map<?, ?> c : Rebuild.cards((Map<?, ?>) po, z)) {
                    wireCards.put((int) WireLog.num(c, "id", -1), c);
                }
            }
        }
        for (final Object o : WireLog.arr(moment.state, "stackCards")) {
            final Map<?, ?> c = (Map<?, ?>) o;
            wireCards.putIfAbsent((int) WireLog.num(c, "id", -1), c);
        }
    }

    private final SearchPolicy.Sink sink = new SearchPolicy.Sink() {
        @Override
        public void add(final String k, final int n) {
            counters.merge(k, n, Integer::sum);
        }

        @Override
        public void event(final String text) {
            // the grader keeps counters only
        }
    };

    /** Grade the moment; the JSON result line.  Call on a Forge game thread. */
    public String run() {
        final long t0 = System.nanoTime();
        final Json.JsonOut j = new Json.JsonOut().obj().n("v", 1).n("key", key).n("type", type)
                .n("turn", WireLog.num(moment.state, "turn", 0)).n("phase", String.valueOf(WireLog.str(moment.state, "phase")))
                .n("seat", log.seat).n("opponent", know.oppSource).n("ownDeck", know.ownSource);
        final Rebuild rb;
        final List<Opt> opts;
        Rebuild.Base b0;
        try {
            rb = new Rebuild(log, moment, know);
            shared = sharedTweaks(rb);
            b0 = rb.build(GradeMath.mix(set.seed ^ GradeMath.hash(key)), shared);
            if ("spell".equals(type) && !set.lands) {
                final int land = landFirst(b0);
                if (land >= 0) {
                    shared.playLand = land;
                    notes.add("the land drop is open: " + b0.byWire.get(land).getName() + " #" + land
                            + " is played first in every option (Forge's choice of land); --lands grades land drops instead");
                    b0 = rb.build(GradeMath.mix(set.seed ^ GradeMath.hash(key)), shared);
                }
            }
            opts = enumerate(rb, b0);
        } catch (final RuntimeException e) {
            final StringBuilder where = new StringBuilder();
            if (e instanceof NullPointerException || e instanceof ClassCastException || e instanceof IndexOutOfBoundsException) {
                for (int k = 0; k < Math.min(4, e.getStackTrace().length); k++) {
                    where.append(" | at ").append(e.getStackTrace()[k]);
                }
            }
            return j.n("status", "unsupported").n("error", String.valueOf(e.getMessage() != null ? e.getMessage() : e) + where)
                    .n("ms", (System.nanoTime() - t0) / 1_000_000L).end().done();
        }
        j.key("fidelity").arr();
        for (final String f : b0.fidelity) {
            j.v(f);
        }
        j.end();
        if (opts.size() < 2) {
            j.n("status", "trivial").n("error", opts.size() + " option(s): nothing to grade");
            writeNotes(j);
            writeOptions(j, opts, null, null);
            return j.n("ms", (System.nanoTime() - t0) / 1_000_000L).end().done();
        }
        // The rounds: one rebuilt base per round (and per option with tweaks of its own).
        final Map<String, Rebuild.Base> bases = new HashMap<>();
        final int[] baseRound = {-1};
        final Rebuild.Base first = b0;
        final Racer.Play play = (i, r, seed) -> {
            final Opt o = opts.get(i);
            if (baseRound[0] != r) {
                bases.clear();
                baseRound[0] = r;
            }
            final String bk = o.tweaks == null ? "" : o.token;
            Rebuild.Base base = bases.get(bk);
            try {
                if (base == null) {
                    base = r == 0 && o.tweaks == null ? first : rb.build(seed, o.tweaks == null ? shared : o.tweaks);
                    bases.put(bk, base);
                    if (r == 0 && o.tweaks != null) {
                        notes.add(o.token + ": stack " + stackDesc(base) + (base.fidelity.isEmpty() ? "" : "; " + base.fidelity));
                    }
                }
                final SearchPolicy.Cand cand = o.cand.apply(base);
                final long own = System.nanoTime() + set.playoutTimeoutMs * 1_000_000L;
                final long deadline = r < set.race.minRounds ? own : Math.min(own, set.race.deadline);
                final int horizon = set.horizon < 0 ? set.maxTurns : set.horizon;
                final SearchPolicy.Playout p = SearchPolicy.playout(base.game, base.viewer, cand, seed,
                        new SearchPolicy.Limits(deadline, horizon, set.maxSteps, 1.0, false, set.leafEval), sink, r == 0 && i == 0, null);
                return value(p);
            } catch (final RuntimeException | StackOverflowError e) {
                sink.add("grade.playoutErrors", 1);
                sink.add("grade.error." + e.getClass().getSimpleName(), 1);
                return Double.NaN;
            }
        };
        final GradeMath.Measure measure = set.horizon < 0 ? GradeMath.Measure.WINS : GradeMath.Measure.LEAF;
        set.race.measure = measure;
        final Racer.Result res = Racer.run(opts.size(), key, set.seed, set.race, play);
        final GradeMath.Row[] rows = GradeMath.table(res.x, res.active, GradeMath.Z95, measure);
        int retired = 0;
        for (int i = 0; i < rows.length; i++) {
            retired += !res.active[i] && !res.failed[i] ? 1 : 0;
        }
        final long ms = (System.nanoTime() - t0) / 1_000_000L;
        int bestIdx = -1;
        double lo = 1;
        double hi = 0;
        for (int i = 0; i < rows.length; i++) {
            if (rows[i].best) {
                bestIdx = i;
            }
            if (rows[i].n > 0) {
                lo = Math.min(lo, rows[i].winRate);
                hi = Math.max(hi, rows[i].winRate);
            }
        }
        j.n("status", "ok").n("measure", set.horizon < 0 ? "wins" : "leaf").n("rounds", res.rounds).n("playouts", res.playouts).n("stop", res.stop)
                .n("best", bestIdx < 0 ? "" : opts.get(bestIdx).token)
                .n("spread", hi - lo).n("noise", GradeMath.noise(rows)).n("retired", retired);
        for (final Opt o : opts) {
            if (o.forge) {
                j.n("forgeChoice", o.token);
            }
        }
        writeNotes(j);
        writeOptions(j, opts, rows, res);
        j.key("config").obj().n("seed", set.seed).n("target", set.race.target).n("initial", set.race.initial)
                .n("batch", set.race.batch).n("zElim", set.race.zElim).n("race", set.race.race)
                .n("horizon", set.horizon).n("maxTurns", set.maxTurns).n("yardstick", "forge-default")
                .n("interval", measure == GradeMath.Measure.LEAF ? "t, sample sd" : "normal, 1/n floor");
        if (measure == GradeMath.Measure.LEAF) {
            j.n("leafScale", set.leafScale).n("leafScaleSource", set.leafScaleSource);
            j.n("leaf", set.leafEval == null ? "hand" : "eval:" + set.leafEvalSource);   // D352
        }
        j.end();
        j.key("counters").obj();
        for (final Map.Entry<String, Integer> e : counters.entrySet()) {
            j.n(e.getKey(), e.getValue());
        }
        j.end();
        return j.n("ms", ms).n("msPerPlayout", res.playouts == 0 ? 0 : ms / res.playouts).end().done();
    }

    private void writeNotes(final Json.JsonOut j) {
        j.key("notes").arr();
        for (final String f : notes) {
            j.v(f);
        }
        j.end();
    }

    private void writeOptions(final Json.JsonOut j, final List<Opt> opts, final GradeMath.Row[] rows, final Racer.Result res) {
        j.key("options").arr();
        for (int i = 0; i < opts.size(); i++) {
            final Opt o = opts.get(i);
            j.obj().n("token", o.token).n("label", o.label).n("forge", o.forge);
            if (rows != null) {
                final GradeMath.Row r = rows[i];
                j.n("n", r.n).n("winRate", r.winRate).n("winLo", r.winLo).n("winHi", r.winHi)
                        .n("regret", r.regret).n("regretLo", r.regretLo).n("regretHi", r.regretHi)
                        .n("pairedN", r.pairedN).n("best", r.best).n("active", r.active)
                        .n("failed", res.failed[i]).n("errors", res.errors[i]);
            }
            j.end();
            for (final String a : o.aliases) {
                j.obj().n("token", a).n("label", o.label + " (the same choice as " + o.token + ")").n("forge", false).n("alias", o.token);
                if (rows != null) {
                    final GradeMath.Row r = rows[i];
                    j.n("n", r.n).n("winRate", r.winRate).n("winLo", r.winLo).n("winHi", r.winHi)
                            .n("regret", r.regret).n("regretLo", r.regretLo).n("regretHi", r.regretHi)
                            .n("pairedN", r.pairedN).n("best", false).n("active", r.active)
                            .n("failed", res.failed[i]).n("errors", res.errors[i]);
                }
                j.end();
            }
        }
        j.end();
    }

    /** Fold options whose key is equal into the first one, as its aliases. */
    private static List<Opt> fold(final List<Opt> in, final Function<Opt, String> key) {
        final List<Opt> out = new ArrayList<>();
        final Map<String, Opt> first = new HashMap<>();
        for (final Opt o : in) {
            final String k = key.apply(o);
            final Opt f = k == null ? null : first.get(k);
            if (f == null) {
                if (k != null) {
                    first.put(k, o);
                }
                out.add(o);
            } else {
                f.aliases.add(o.token);
                f.forge |= o.forge;
            }
        }
        return out;
    }

    private double value(final SearchPolicy.Playout p) {
        if (p == null) {
            sink.add("grade.playoutTimeouts", 1);
            return Double.NaN;
        }
        if (p.over) {
            sink.add("grade.finished", 1);
            return p.result > 0 ? 1 : p.result < 0 ? 0 : 0.5;
        }
        if (set.horizon >= 0) {
            sink.add("grade.evaluated", 1);
            if (set.leafEval != null) {
                return SearchPolicy.winOf(p);   // D352: the evaluator's P(win)
            }
            return 1 / (1 + Math.exp(-p.leaf / set.leafScale));
        }
        sink.add("grade.turnCapped", 1);
        return 0.5;
    }

    // ------------------------------------------------------------------
    // Options
    // ------------------------------------------------------------------

    private static final Pattern SOURCE = Pattern.compile("^(.*?) \\((\\d+)\\) - (.*)$", Pattern.DOTALL);

    private Rebuild.Tweaks sharedTweaks(final Rebuild rb) {
        final Rebuild.Tweaks tw = new Rebuild.Tweaks();
        tw.dropAttacking = "attack".equals(type);
        if ("target".equals(type)) {
            final Target t = target();
            tw.stackHandled = true;
            if (t.castFromStack) {
                tw.toHand.add(t.sourceId);
            }
            if (t.sourceName != null) {
                tw.extraHand.put(t.sourceId, t.sourceName);
            }
            tw.viewerPutOnStack.addAll(stackBelow(t, tw));
        }
        return tw;
    }

    /** A target decision's source, read from the engine's prompt ("Name (id) - text"). */
    static final class Target {
        int sourceId;
        /** Set when the log shows the source nowhere (a spell on its way from hand to stack): the prompt's name. */
        String sourceName;
        String text;
        boolean trigger;
        boolean castFromStack;
        List<Integer> ids = new ArrayList<>();
    }

    private Target cachedTarget;

    private Target target() {
        if (cachedTarget != null) {
            return cachedTarget;
        }
        final Map<?, ?> in = moment.input;
        if (in == null) {
            throw new IllegalArgumentException("a target decision needs the engine's input (a live moment)");
        }
        final Target t = new Target();
        for (final Object o : WireLog.arr(WireLog.map(in, "selectable"), "cardIds")) {
            t.ids.add(((Number) o).intValue());
        }
        if (t.ids.isEmpty()) {
            throw new IllegalArgumentException("the input offers no card to target");
        }
        final String prompt = String.valueOf(WireLog.str(in, "prompt"));
        final Matcher m = SOURCE.matcher(prompt.split("\n")[0]);
        if (!m.matches()) {
            throw new IllegalArgumentException("cannot read the target's source from the prompt: " + prompt.split("\n")[0]);
        }
        t.sourceId = Integer.parseInt(m.group(2));
        t.text = m.group(3);
        final Map<?, ?> src = wireCards.get(t.sourceId);
        if (src == null) {
            t.sourceName = m.group(1).trim();   // being cast: the engine took it out of the hand already
        }
        final String zone = src == null ? "" : String.valueOf(WireLog.str(src, "zone"));
        t.trigger = "battlefield".equals(zone) && Pattern.compile("\\b(When|Whenever|At the)\\b").matcher(t.text).find();
        t.castFromStack = "stack".equals(zone);
        cachedTarget = t;
        return t;
    }

    /** The log's stack (bottom first) rebuilt as putonstack entries: plain spells only. */
    private List<String> stackBelow(final Target t, final Rebuild.Tweaks tw) {
        final List<String> out = new ArrayList<>();
        for (final Object o : WireLog.arr(moment.state, "stack")) {
            final Map<?, ?> it = (Map<?, ?>) o;
            final int src = (int) WireLog.num(it, "sourceCardId", -1);
            if (src == t.sourceId && t.castFromStack) {
                continue;   // the spell being cast is the decision itself
            }
            final Map<?, ?> c = wireCards.get(src);
            if (WireLog.bool(it, "isAbility") || c == null || !"stack".equals(WireLog.str(c, "zone"))
                    || WireLog.num(it, "controller", -1) != log.seat) {
                throw new IllegalArgumentException("the stack holds an item this grader cannot rebuild: "
                        + WireLog.str(it, "text"));
            }
            final Object[] tg = WireLog.arr(it, "targetCardIds");
            if (tg.length > 1 || WireLog.arr(it, "targetPlayerIds").length > 0) {
                throw new IllegalArgumentException("a stack spell with several or player targets is not rebuilt");
            }
            out.add(src + (tg.length == 1 ? "->" + ((Number) tg[0]).intValue() : ""));
            tw.toHand.add(src);   // the loader finds it by id in its controller's hand, then stacks it
        }
        return out;
    }

    private List<Opt> enumerate(final Rebuild rb, final Rebuild.Base b) {
        final List<Opt> out;
        switch (type) {
        case "spell":
            out = spellOptions(b);
            break;
        case "attack":
            out = attackOptions(b);
            break;
        case "block":
            out = blockOptions(b);
            break;
        case "target":
            out = targetOptions(b);
            break;
        default:
            throw new IllegalArgumentException("decision type " + type + " is not graded (spell, attack, block, target)");
        }
        if (set.only != null) {
            out.removeIf(o -> !set.only.contains(o.token));
        }
        return out;
    }

    // --- spell / pass ---------------------------------------------------

    private List<Opt> spellOptions(final Rebuild.Base b) {
        final PhaseHandler ph = b.game.getPhaseHandler();
        if (!ph.isPlayerTurn(b.viewer) || !(ph.getPhase().isMain()) || !b.game.getStack().isEmpty()) {
            throw new IllegalArgumentException("a spell decision is graded only in the viewer's own main phase, stack empty");
        }
        final List<Opt> out = new ArrayList<>();
        out.add(new Opt("pass", "cast nothing now", null, base -> SearchPolicy.priorityCand(null)));
        final List<Card> hand = new ArrayList<>(b.viewer.getCardsIn(forge.game.zone.ZoneType.Hand));
        hand.sort((x, y) -> Integer.compare(b.wireOf.getOrDefault(x, 0), b.wireOf.getOrDefault(y, 0)));
        for (final Card c : hand) {
            final Integer id = b.wireOf.get(c);
            if (id == null) {
                continue;
            }
            if (c.isLand()) {
                if (set.lands && landSa(b, id) != null) {
                    out.add(new Opt("land:" + id, "play " + c.getName(), null, base -> {
                        final SpellAbility sa = landSa(base, id);
                        if (sa == null) {
                            throw new IllegalStateException("land not playable");
                        }
                        return SearchPolicy.priorityCand(sa);
                    }));
                }
                continue;
            }
            if (castSa(b, id) == null) {
                continue;
            }
            out.add(new Opt("cast:" + id, "cast " + c.getName(), null, base -> {
                final SpellAbility sa = castSa(base, id);
                if (sa == null) {
                    throw new IllegalStateException("not castable on this base");
                }
                return SearchPolicy.priorityCand(sa);
            }));
        }
        // Forge's own first play, for the report.
        try {
            final AiController aic = ((PlayerControllerAi) b.viewer.getController()).getAi();
            final List<SpellAbility> f = aic.chooseSpellAbilityToPlay();
            final String tok = f == null || f.isEmpty() ? "pass" : (f.get(0).isLandAbility() ? "land:" : "cast:")
                    + b.wireOf.get(f.get(0).getHostCard());
            markForge(out, tok);
        } catch (final RuntimeException e) {
            notes.add("Forge's own choice could not be read: " + e);
        }
        // Two copies of one card in hand are one choice.
        return fold(out, o -> o.token.startsWith("cast:") || o.token.startsWith("land:")
                ? o.token.substring(0, o.token.indexOf(':')) + "|" + b.byWire.get(Integer.parseInt(o.token.substring(o.token.indexOf(':') + 1))).getName()
                : null);
    }

    /** The land Forge's AI would play now (else the first playable land in hand), or -1 when none / no drop left. */
    private int landFirst(final Rebuild.Base b) {
        final PhaseHandler ph = b.game.getPhaseHandler();
        if (!ph.isPlayerTurn(b.viewer) || !ph.getPhase().isMain()) {
            return -1;
        }
        try {
            final AiController aic = ((PlayerControllerAi) b.viewer.getController()).getAi();
            final List<SpellAbility> f = aic.chooseSpellAbilityToPlay();
            if (f != null && !f.isEmpty() && f.get(0).isLandAbility() && b.wireOf.containsKey(f.get(0).getHostCard())) {
                return b.wireOf.get(f.get(0).getHostCard());
            }
        } catch (final RuntimeException e) {
            notes.add("Forge's land choice could not be read: " + e);
        }
        final List<Card> hand = new ArrayList<>(b.viewer.getCardsIn(forge.game.zone.ZoneType.Hand));
        hand.sort((x, y) -> Integer.compare(b.wireOf.getOrDefault(x, 0), b.wireOf.getOrDefault(y, 0)));
        for (final Card c : hand) {
            final Integer id = b.wireOf.get(c);
            if (id != null && c.isLand() && landSa(b, id) != null) {
                return id;
            }
        }
        return -1;
    }

    private static SpellAbility landSa(final Rebuild.Base b, final int id) {
        final Card c = b.byWire.get(id);
        if (c == null) {
            return null;
        }
        for (final SpellAbility sa : c.getAllPossibleAbilities(b.viewer, true)) {
            if (sa.isLandAbility()) {
                sa.setActivatingPlayer(b.viewer);
                if (sa.canPlay()) {
                    return sa;
                }
            }
        }
        return null;
    }

    /** The card's first spell the viewer can cast and pay for now, aimed as Forge's AI would aim it. */
    static SpellAbility castSa(final Rebuild.Base b, final int id) {
        final Card c = b.byWire.get(id);
        if (c == null) {
            return null;
        }
        for (final SpellAbility sa : c.getSpells()) {
            try {
                sa.setActivatingPlayer(b.viewer);
                if (!sa.canPlay() || !ComputerUtilCost.canPayCost(sa, b.viewer, false)) {
                    continue;
                }
                if (aim(b, sa)) {
                    return sa;
                }
            } catch (final RuntimeException e) {
                // a spell Forge cannot evaluate here is not an option
            }
        }
        return null;
    }

    /** Give {@code sa} Forge's targets (its AI's choice, else its mandatory choice); false when it has none. */
    static boolean aim(final Rebuild.Base b, final SpellAbility sa) {
        if (!anyTargeting(sa)) {
            return true;
        }
        final AiController aic = ((PlayerControllerAi) b.viewer.getController()).getAi();
        try {
            aic.canPlaySa(sa);
        } catch (final RuntimeException e) {
            // fall through to the mandatory choice
        }
        if (!targetsValid(sa) && sa.getApi() != null) {
            try {
                SpellApiToAi.Converter.get(sa.getApi()).doTriggerNoCostWithSubs(b.viewer, sa, true);
            } catch (final RuntimeException e) {
                return false;
            }
        }
        return targetsValid(sa);
    }

    static boolean anyTargeting(final SpellAbility sa) {
        for (SpellAbility s = sa; s != null; s = s.getSubAbility()) {
            if (s.usesTargeting()) {
                return true;
            }
        }
        return false;
    }

    static boolean targetsValid(final SpellAbility sa) {
        for (SpellAbility s = sa; s != null; s = s.getSubAbility()) {
            if (s.usesTargeting() && !s.isTargetNumberValid()) {
                return false;
            }
        }
        return true;
    }

    private static void markForge(final List<Opt> out, final String tok) {
        for (final Opt o : out) {
            if (o.token.equals(tok)) {
                o.forge = true;
            }
        }
    }

    // --- class keys (ForgeCoach's classKey: identical creatures are one choice) ---

    String classKey(final int id, final boolean blocker) {
        final Map<?, ?> c = wireCards.get(id);
        if (c == null || Rebuild.knownName(c) == null || WireLog.bool(c, "faceDown")) {
            return "#" + id;
        }
        final List<String> kw = new ArrayList<>();
        for (final Object k : WireLog.arr(c, "keywords")) {
            kw.add(String.valueOf(k));
        }
        kw.sort(null);
        final List<String> ctr = new ArrayList<>();
        final Map<?, ?> cm = WireLog.map(c, "counters");
        if (cm != null) {
            for (final Map.Entry<?, ?> e : cm.entrySet()) {
                if (e.getValue() instanceof Number && ((Number) e.getValue()).intValue() != 0) {
                    ctr.add(e.getKey() + "," + e.getValue());
                }
            }
        }
        ctr.sort(null);
        return String.join("|", WireLog.str(c, "name"), String.valueOf(WireLog.str(c, "power")),
                String.valueOf(WireLog.str(c, "toughness")), String.join("+", kw), String.join("+", ctr),
                String.valueOf(WireLog.num(c, "damage", 0)), String.valueOf(WireLog.arr(c, "attachmentIds").length),
                !blocker && WireLog.bool(c, "sick") ? "sick" : "");
    }

    /** Group ids by class, ids ascending within a class, classes in order of their lowest id. */
    private LinkedHashMap<String, List<Integer>> classes(final List<Integer> ids, final boolean blocker) {
        final List<Integer> sorted = new ArrayList<>(ids);
        sorted.sort(null);
        final LinkedHashMap<String, List<Integer>> m = new LinkedHashMap<>();
        for (final int id : sorted) {
            m.computeIfAbsent(classKey(id, blocker), k -> new ArrayList<>()).add(id);
        }
        return m;
    }

    // --- attack ---------------------------------------------------------

    private Combat combat(final Rebuild.Base b) {
        final PhaseHandler ph = b.game.getPhaseHandler();
        Combat combat = ph.getCombat();
        if (combat == null) {
            combat = new Combat(ph.getPlayerTurn());
            ph.setCombat(combat);
            combat.initConstraints();
        }
        return combat;
    }

    private List<Opt> attackOptions(final Rebuild.Base b) {
        final PhaseHandler ph = b.game.getPhaseHandler();
        if (!ph.isPlayerTurn(b.viewer)) {
            throw new IllegalArgumentException("an attack decision must be on the viewer's turn");
        }
        final Combat combat = combat(b);
        combat.clearAttackers();
        final List<Integer> able = new ArrayList<>();
        for (final Card c : b.viewer.getCreaturesInPlay()) {
            final Integer id = b.wireOf.get(c);
            if (id != null && CombatUtil.canAttack(c, b.opp)) {
                able.add(id);
            }
        }
        final LinkedHashMap<String, List<Integer>> cls = classes(able, false);
        final List<List<Integer>> groups = new ArrayList<>(cls.values());
        final int[] sizes = groups.stream().mapToInt(List::size).toArray();
        final List<List<Integer>> attacks = new ArrayList<>();
        final List<int[]> counts = GradeMath.attackCounts(sizes, set.cap);
        String forgeTok = null;
        try {
            ((PlayerControllerAi) b.viewer.getController()).declareAttackers(b.viewer, combat);
            final List<Integer> f = new ArrayList<>();
            for (final Card a : combat.getAttackers()) {
                f.add(b.wireOf.get(a));
            }
            forgeTok = GradeMath.attackToken(canonicalAttack(f, groups));
        } catch (final RuntimeException e) {
            notes.add("Forge's own attack could not be read: " + e);
        }
        combat.clearAttackers();
        if (counts != null) {
            for (final int[] k : counts) {
                attacks.add(pick(groups, k));
            }
        } else {
            notes.add(Arrays.stream(sizes).mapToLong(s -> s + 1).reduce(1, (x, y) -> x * y)
                    + " attacks: a shortlist is graded (none, all, Forge's, Forge's with one class more or less, each class alone)");
            final int[] none = new int[sizes.length];
            attacks.add(pick(groups, none));
            attacks.add(pick(groups, sizes));
            if (forgeTok != null) {
                final int[] fk = countsOf(parseIds(forgeTok), groups);
                attacks.add(pick(groups, fk));
                for (int g = 0; g < sizes.length; g++) {
                    if (fk[g] < sizes[g]) {
                        final int[] k = fk.clone();
                        k[g]++;
                        attacks.add(pick(groups, k));
                    }
                    if (fk[g] > 0) {
                        final int[] k = fk.clone();
                        k[g]--;
                        attacks.add(pick(groups, k));
                    }
                }
            }
            for (int g = 0; g < sizes.length; g++) {
                final int[] k = new int[sizes.length];
                k[g] = sizes[g];
                attacks.add(pick(groups, k));
            }
            for (final String t : set.extra) {
                if (t.startsWith("attack:")) {
                    attacks.add(canonicalAttack(parseIds(t), groups));
                }
            }
        }
        final List<Opt> out = new ArrayList<>();
        final java.util.Set<String> seen = new java.util.HashSet<>();
        for (final List<Integer> ids : attacks) {
            final String tok = GradeMath.attackToken(ids);
            if (!seen.add(tok)) {
                continue;
            }
            if (!legalAttack(b, combat, ids)) {
                notes.add(tok + " is not a legal attack here");
                continue;
            }
            out.add(new Opt(tok, ids.isEmpty() ? "no attack" : "attack with " + names(ids), null, base -> {
                final Map<Card, GameEntity> m = new LinkedHashMap<>();
                for (final int id : ids) {
                    final Card c = base.byWire.get(id);
                    if (c == null) {
                        throw new IllegalStateException("#" + id + " missing");
                    }
                    m.put(c, base.opp);
                }
                return SearchPolicy.attackCand(m);
            }));
        }
        if (forgeTok != null) {
            markForge(out, forgeTok);
        }
        return out;
    }

    private static List<Integer> pick(final List<List<Integer>> groups, final int[] k) {
        final List<Integer> out = new ArrayList<>();
        for (int g = 0; g < groups.size(); g++) {
            out.addAll(groups.get(g).subList(0, k[g]));
        }
        return out;
    }

    private static int[] countsOf(final List<Integer> ids, final List<List<Integer>> groups) {
        final int[] k = new int[groups.size()];
        for (final int id : ids) {
            for (int g = 0; g < groups.size(); g++) {
                if (groups.get(g).contains(id)) {
                    k[g]++;
                }
            }
        }
        return k;
    }

    /** The same attack with each class's lowest ids (the representative spelling). */
    private static List<Integer> canonicalAttack(final List<Integer> ids, final List<List<Integer>> groups) {
        return pick(groups, countsOf(ids, groups));
    }

    static List<Integer> parseIds(final String tok) {
        final List<Integer> out = new ArrayList<>();
        final String rest = tok.substring(tok.indexOf(':') + 1);
        if (rest.equals("none")) {
            return out;
        }
        for (final String s : rest.split(",")) {
            out.add(Integer.parseInt(s.trim().replace("#", "")));
        }
        return out;
    }

    private static boolean legalAttack(final Rebuild.Base b, final Combat combat, final List<Integer> ids) {
        try {
            combat.clearAttackers();
            for (final int id : ids) {
                combat.addAttacker(b.byWire.get(id), b.opp);
            }
            return CombatUtil.validateAttackers(combat);
        } catch (final RuntimeException e) {
            return false;
        } finally {
            combat.clearAttackers();
        }
    }

    private String names(final List<Integer> ids) {
        final StringBuilder sb = new StringBuilder();
        for (final int id : ids) {
            final Map<?, ?> c = wireCards.get(id);
            sb.append(sb.length() == 0 ? "" : ", ").append(c == null ? "?" : Rebuild.knownName(c)).append(" #").append(id);
        }
        return sb.toString();
    }

    // --- block ----------------------------------------------------------

    private List<Opt> blockOptions(final Rebuild.Base b) {
        final Combat combat = b.game.getPhaseHandler().getCombat();
        if (combat == null || combat.getAttackers().isEmpty()) {
            throw new IllegalArgumentException("a block decision needs attackers in combat");
        }
        // The loader advances into declare blockers, whose turn-based action has
        // already asked the viewer's (Forge) controller: those blocks are not the
        // decision's, so they go.
        clearBlocks(combat, b.viewer);
        final List<Integer> attackers = new ArrayList<>();
        for (final Map.Entry<Card, GameEntity> e : combat.getAttackersAndDefenders().entrySet()) {
            final GameEntity d = e.getValue();
            final boolean atMe = d == b.viewer || d instanceof Card && ((Card) d).getController() == b.viewer;
            final Integer id = b.wireOf.get(e.getKey());
            if (atMe && id != null) {
                attackers.add(id);
            }
        }
        attackers.sort(null);
        notes.add("attacking you: " + names(attackers) + "; phase " + b.game.getPhaseHandler().getPhase());
        if (attackers.isEmpty()) {
            throw new IllegalArgumentException("nothing attacks the viewer");
        }
        final List<Integer> blockers = new ArrayList<>();
        for (final Card c : b.viewer.getCreaturesInPlay()) {
            final Integer id = b.wireOf.get(c);
            if (id != null && CombatUtil.canBlock(c, combat)) {
                blockers.add(id);
            }
        }
        notes.add("can block: " + (blockers.isEmpty() ? "nobody" : names(blockers)));
        final List<List<Integer>> groups = new ArrayList<>(classes(blockers, true).values());
        final int[] sizes = groups.stream().mapToInt(List::size).toArray();
        final boolean[][] can = new boolean[groups.size()][attackers.size()];
        for (int g = 0; g < groups.size(); g++) {
            for (int a = 0; a < attackers.size(); a++) {
                can[g][a] = CombatUtil.canBlock(b.byWire.get(attackers.get(a)), b.byWire.get(groups.get(g).get(0)), combat);
            }
        }
        // Forge's own blocks.
        String forgeTok = null;
        final List<int[]> forgePairs = new ArrayList<>();
        try {
            clearBlocks(combat, b.viewer);
            ((PlayerControllerAi) b.viewer.getController()).declareBlockers(b.viewer, combat);
            for (final Card a : combat.getAttackers()) {
                for (final Card bl : combat.getBlockers(a)) {
                    if (bl.getController() == b.viewer && b.wireOf.containsKey(bl) && b.wireOf.containsKey(a)) {
                        forgePairs.add(new int[] {b.wireOf.get(bl), b.wireOf.get(a)});
                    }
                }
            }
            forgeTok = blockKeyToken(canonicalBlock(forgePairs, groups, attackers));
        } catch (final RuntimeException e) {
            notes.add("Forge's own blocks could not be read: " + e);
        }
        clearBlocks(combat, b.viewer);
        final List<List<int[]>> blocks = new ArrayList<>();
        final List<int[][]> all = GradeMath.blockCounts(sizes, can, set.cap * 4);
        if (all != null) {
            for (final int[][] m : all) {
                blocks.add(assign(groups, attackers, m));
            }
        } else {
            notes.add("too many blocks to grade them all: a shortlist (none, Forge's, Forge's minus one, every single block)");
            blocks.add(new ArrayList<>());
            if (forgeTok != null) {
                final List<int[]> f = canonicalBlock(forgePairs, groups, attackers);
                blocks.add(f);
                for (int i = 0; i < f.size(); i++) {
                    final List<int[]> less = new ArrayList<>(f);
                    less.remove(i);
                    blocks.add(less);
                }
            }
            for (int g = 0; g < groups.size(); g++) {
                for (int a = 0; a < attackers.size(); a++) {
                    if (can[g][a]) {
                        final List<int[]> one = new ArrayList<>();
                        one.add(new int[] {groups.get(g).get(0), attackers.get(a)});
                        blocks.add(one);
                    }
                }
            }
            for (final String t : set.extra) {
                if (t.startsWith("block:")) {
                    blocks.add(canonicalBlock(parsePairs(t), groups, attackers));
                }
            }
        }
        final List<Opt> out = new ArrayList<>();
        final java.util.Set<String> seen = new java.util.HashSet<>();
        for (final List<int[]> pairs : blocks) {
            final String classKey = blockClassKey(pairs);
            final String tok = GradeMath.blockToken(pairs);
            if (!seen.add(classKey)) {
                continue;
            }
            if (!legalBlock(b, combat, pairs)) {
                notes.add(tok + " is not a legal block here");
                continue;
            }
            if (out.size() >= set.cap * 2 && all != null) {
                notes.add("blocks past " + set.cap * 2 + " were not graded");
                break;
            }
            out.add(new Opt(tok, pairs.isEmpty() ? "no blocks" : "block " + blockLabel(pairs), null, base -> {
                final Map<Card, Card> m = new LinkedHashMap<>();
                for (final int[] p : pairs) {
                    final Card bl = base.byWire.get(p[0]);
                    final Card at = base.byWire.get(p[1]);
                    if (bl == null || at == null) {
                        throw new IllegalStateException("block cards missing");
                    }
                    m.put(bl, at);
                }
                return SearchPolicy.blockCand(m);
            }));
        }
        if (forgeTok != null) {
            for (final Opt o : out) {
                if (blockClassKey(parsePairs(o.token)).equals(blockClassKey(parsePairs(forgeTok)))) {
                    o.forge = true;
                }
            }
        }
        return out;
    }

    private String blockKeyToken(final List<int[]> pairs) {
        return GradeMath.blockToken(pairs);
    }

    private static List<int[]> assign(final List<List<Integer>> groups, final List<Integer> attackers, final int[][] m) {
        final List<int[]> out = new ArrayList<>();
        for (int g = 0; g < groups.size(); g++) {
            int next = 0;
            for (int a = 0; a < attackers.size(); a++) {
                for (int n = 0; n < m[g][a]; n++) {
                    out.add(new int[] {groups.get(g).get(next++), attackers.get(a)});
                }
            }
        }
        return out;
    }

    /** The same blocks with each class's lowest ids. */
    private static List<int[]> canonicalBlock(final List<int[]> pairs, final List<List<Integer>> groups, final List<Integer> attackers) {
        final int[][] m = new int[groups.size()][attackers.size()];
        for (final int[] p : pairs) {
            for (int g = 0; g < groups.size(); g++) {
                final int a = attackers.indexOf(p[1]);
                if (groups.get(g).contains(p[0]) && a >= 0) {
                    m[g][a]++;
                }
            }
        }
        return assign(groups, attackers, m);
    }

    static List<int[]> parsePairs(final String tok) {
        final List<int[]> out = new ArrayList<>();
        final String rest = tok.substring(tok.indexOf(':') + 1);
        if (rest.equals("none")) {
            return out;
        }
        for (final String s : rest.split(",")) {
            final String[] p = s.trim().replace("#", "").split(">");
            out.add(new int[] {Integer.parseInt(p[0].trim()), Integer.parseInt(p[1].trim())});
        }
        return out;
    }

    private String blockClassKey(final List<int[]> pairs) {
        final List<String> ks = new ArrayList<>();
        for (final int[] p : pairs) {
            ks.add(classKey(p[0], true) + ">" + classKey(p[1], false));
        }
        ks.sort(null);
        return String.join(",", ks);
    }

    private String blockLabel(final List<int[]> pairs) {
        final StringBuilder sb = new StringBuilder();
        for (final int[] p : pairs) {
            sb.append(sb.length() == 0 ? "" : ", ").append(names(List.of(p[0]))).append(" > ").append(names(List.of(p[1])));
        }
        return sb.toString();
    }

    private static void clearBlocks(final Combat combat, final Player p) {
        for (final Card bl : new ArrayList<>(combat.getAllBlockers())) {
            if (bl.getController() == p) {
                combat.undoBlockingAssignment(bl);
            }
        }
    }

    private static boolean legalBlock(final Rebuild.Base b, final Combat combat, final List<int[]> pairs) {
        try {
            clearBlocks(combat, b.viewer);
            for (final int[] p : pairs) {
                combat.addBlocker(b.byWire.get(p[1]), b.byWire.get(p[0]));
            }
            return CombatUtil.validateBlocks(combat, b.viewer) == null;
        } catch (final RuntimeException e) {
            return false;
        } finally {
            clearBlocks(combat, b.viewer);
        }
    }

    // --- target ---------------------------------------------------------

    private List<Opt> targetOptions(final Rebuild.Base b) {
        final Target t = target();
        final List<Opt> out = new ArrayList<>();
        final Card src = b.byWire.get(t.sourceId);
        if (src == null) {
            throw new IllegalArgumentException("the target's source #" + t.sourceId + " is not in the rebuilt game");
        }
        notes.add("rebuilt stack below the decision: " + stackDesc(b));
        if (t.trigger) {
            final String svar = triggerSVar(src, t.text);
            notes.add("trigger of " + src.getName() + " rebuilt from its " + svar + " on the stack");
            for (final int id : t.ids) {
                final Rebuild.Tweaks tw = new Rebuild.Tweaks();
                tw.stackHandled = true;
                tw.viewerPutOnStack.addAll(shared.viewerPutOnStack);
                tw.toHand.addAll(shared.toHand);
                tw.viewerPutOnStack.add(t.sourceId + ":" + svar + "->" + id);
                out.add(new Opt("target:" + id, "target " + names(List.of(id)), tw, base -> SearchPolicy.priorityCand(null)));
            }
            return fold(out, o -> targetClass(Integer.parseInt(o.token.substring(7))));
        }
        // A spell (back in hand) or an activated ability: cast it with that target.
        for (final int id : t.ids) {
            if (b.byWire.get(id) == null) {
                notes.add("target #" + id + " is not in the rebuilt game");
                continue;
            }
            out.add(new Opt("target:" + id, "target " + names(List.of(id)), null, base -> {
                final SpellAbility sa = aimedAt(base, t, id);
                if (sa == null) {
                    throw new IllegalStateException("cannot aim at #" + id);
                }
                return SearchPolicy.priorityCand(sa);
            }));
        }
        return fold(out, o -> targetClass(Integer.parseInt(o.token.substring(7))));
    }

    /** Two targets are one choice when they are the same card in the same state under the same controller. */
    private String targetClass(final int id) {
        final Map<?, ?> c = wireCards.get(id);
        if (c == null || Rebuild.knownName(c) == null) {
            return null;
        }
        return classKey(id, false) + "|" + WireLog.bool(c, "tapped") + "|" + WireLog.num(c, "controller", -1) + "|"
                + WireLog.str(c, "zone");
    }

    private static String triggerSVar(final Card src, final String text) {
        String only = null;
        int withExecute = 0;
        for (final Trigger tr : src.getTriggers()) {
            final String ex = tr.getParam("Execute");
            if (ex == null || !src.hasSVar(ex)) {
                continue;
            }
            withExecute++;
            only = ex;
            final String desc = tr.getParam("TriggerDescription");
            if (desc != null && !desc.isEmpty() && text.contains(desc.replace("CARDNAME", src.getName()).split("\\.")[0])) {
                return ex;
            }
        }
        if (withExecute == 1) {
            return only;
        }
        throw new IllegalArgumentException("cannot tell which trigger of " + src.getName() + " this is");
    }

    private static SpellAbility aimedAt(final Rebuild.Base b, final Target t, final int targetId) {
        final Card src = b.byWire.get(t.sourceId);
        final Card tgt = b.byWire.get(targetId);
        if (src == null || tgt == null) {
            return null;
        }
        final List<SpellAbility> cands = new ArrayList<>();
        if (src.isInZone(forge.game.zone.ZoneType.Hand)) {
            cands.addAll(src.getSpells());
        } else {
            for (final SpellAbility sa : src.getSpellAbilities()) {
                if (!sa.isSpell() && !sa.isManaAbility() && t.text.contains(sa.getDescription().split(":")[0])) {
                    cands.add(sa);
                }
            }
        }
        for (final SpellAbility sa : cands) {
            try {
                sa.setActivatingPlayer(b.viewer);
                if (!sa.canPlay() || !ComputerUtilCost.canPayCost(sa, b.viewer, false)) {
                    continue;
                }
                aim(b, sa);
                SpellAbility s = sa;
                while (s != null && !s.usesTargeting()) {
                    s = s.getSubAbility();
                }
                if (s == null || !s.canTarget(tgt)) {
                    continue;
                }
                s.resetTargets();
                s.getTargets().add(tgt);
                if (targetsValid(sa)) {
                    return sa;
                }
            } catch (final RuntimeException e) {
                // next
            }
        }
        return null;
    }

    /** The rebuilt stack, top first, with each item's targets as wire ids. */
    static String stackDesc(final Rebuild.Base b) {
        final StringBuilder st = new StringBuilder();
        for (final forge.game.spellability.SpellAbilityStackInstance si : b.game.getStack()) {
            final SpellAbility sa = si.getSpellAbility();
            st.append(st.length() == 0 ? "" : " | ").append(sa.getHostCard().getName());
            final List<String> ts = new ArrayList<>();
            for (SpellAbility s = sa; s != null; s = s.getSubAbility()) {
                for (final forge.game.GameObject o : s.getTargets()) {
                    ts.add(o instanceof Card ? "#" + b.wireOf.get(o) : String.valueOf(o));
                }
            }
            if (!ts.isEmpty()) {
                st.append(" -> ").append(String.join(",", ts));
            }
        }
        return st.length() == 0 ? "empty" : st.toString();
    }

    static String fmt(final double v) {
        return String.format(Locale.ROOT, "%.3f", v);
    }
}
