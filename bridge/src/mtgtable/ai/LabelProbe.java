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
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import forge.ai.LobbyPlayerAi;
import forge.game.GameEntity;
import forge.game.card.Card;
import forge.game.combat.Combat;
import forge.game.player.Player;
import forge.game.spellability.SpellAbility;

import mtgtable.Json.JsonOut;

/**
 * The label probe (D538): at a recorded decision of the move atlas, which option a ladder player picks.
 *
 * <p><b>Where it runs.</b>  An atlas unit whose block carries {@code probe} ({@link Atlas.Unit#probe}) replays the
 * baseline from its seed exactly as a branch unit does (the cube lab's {@code play} worker, the observe hook,
 * D511's record path) and, at decision {@code d}, once the listing is the baseline's, hands the decision to
 * {@link #ask} instead of branching it.  {@code ask} puts the question to the player's own policy and search, on the
 * real replayed game, through the calls a ladder game makes for that seat after Forge has answered:
 * {@link PolicyControllerAi#probePriority} at a priority (the outlet policy, Forge's answer, the search, the target
 * search: {@code PolicyControllerAi.choose}'s path), {@link SearchPolicy#chooseAttack} and
 * {@link SearchPolicy#chooseBlock} on the combat holding Forge's declaration at an attack and a block
 * ({@code declareAttackers} and {@code declareBlockers}' path for a seat that does not observe).  Forge's own answer
 * is the one option 0 already holds; it is not asked again.  A kind the player does not search keeps that answer,
 * as in a game.  The combat is put back to Forge's declaration after.  Then the hook ends the replay.
 *
 * <p><b>What it writes.</b>  An {@link Answer}: the token of the player's pick and its index among the atlas's
 * options ({@link #optionOf}: by token, and by play identity where two options share a token, D483; never a guess),
 * whether its search ran, and the search's report.  The player's search is seeded per repeat ({@link #repeatSeed},
 * {@link #seatWithSeed}): a ladder seat's seed is a draw from its game's stream, a repeat's is a draw from this one.
 *
 * <p><b>The profile.</b>  Forge's AI reads its profile off the seat's lobby player
 * ({@code AiProfileUtil.getProperty(Player, ...)}), which is the atlas seat's.  A player of another profile cannot be
 * asked at this position, and is {@link #UNSUPPORTED}, never answered with the atlas seat's profile.
 *
 * <p>Threads: on the game thread, inside the atlas seat's own decision callback (the observe hook, itself inside
 * {@code Decisions.quiet}); the player's search plays its rollouts on that thread, as it does in a game.  No hop, no
 * thread.  The pure half ({@link #optionOf}, {@link #listingDiff}, {@link #seatWithSeed}, {@link #repeatSeed}) is
 * {@code DecisionSelfTest}'s.
 */
public final class LabelProbe {

    private LabelProbe() {
    }

    /** The player picked the atlas option {@link Answer#option}. */
    public static final String OK = "ok";
    /** The player's pick is none of the atlas's options (the atlas lists at most {@code cands} of them). */
    public static final String OFF_ATLAS = "off-atlas";
    /** The pick's token names two options and its play identity does not tell them apart: no index is guessed. */
    public static final String AMBIGUOUS = "ambiguous";
    /** The replay's listing is not the baseline's, or decision d never came: no pick. */
    public static final String MISMATCH = "mismatch";
    /** The player cannot be asked here (another AI profile than the atlas seat's, or a seat option the probe has not). */
    public static final String UNSUPPORTED = "unsupported";
    /** The ask threw. */
    public static final String ERROR = "error";

    /** {@link #optionOf}: the pick is no option. */
    public static final int NO_OPTION = -1;
    /** {@link #optionOf}: the pick matches more than one option. */
    public static final int TWO_OPTIONS = -2;

    /** What to ask: one player, one repeat. */
    public static final class Ask {
        /** The ladder player's name (tools/ai-ladder/players.json). */
        public final String player;
        /** Its seat config, as the ladder hands it to ai-bench ({@code <Profile>[+outlets|+shadow][+search:k=v,...]}). */
        public final String seat;
        /** The search's seed for this repeat (never 0: 0 is the clock's). */
        public final long seed;
        public final int repeat;

        public Ask(final String player, final String seat, final long seed, final int repeat) {
            this.player = player;
            this.seat = seat;
            this.seed = seed;
            this.repeat = repeat;
        }
    }

    /** The player's answer at one decision. */
    public static final class Answer {
        public int d;
        public String kind;
        public int k;
        public int repeat;
        public long seed;
        /** The pick's index among the atlas's options, or -1 (off-atlas, ambiguous, no pick). */
        public int option = NO_OPTION;
        public String token;
        public String identity;
        /** The picked option's identity is the pick's (null when there is no pick, or the listing had no identities). */
        public Boolean sameIdentity;
        /** Whose answer it was: {@code outlets}, {@code search} (a verdict, Forge's kept or not) or {@code forge}. */
        public String by;
        /** The player's search ran at this decision (it produced a report). */
        public boolean searched;
        public long ms;
        /** From the search's report, when it ran. */
        public int rounds;
        public int playouts;
        public long searchMs;
        public String fallback;
        public boolean overrode;
        public boolean timedOut;
        public String status = ERROR;
        public String detail;
        /** The player's seat counters for this decision (its search's {@code search.*}, its policy's). */
        public final Map<String, Integer> counts = new TreeMap<>();

        /** As a game row's {@code atlas.probe} entry. */
        public void write(final JsonOut j) {
            j.obj().n("d", (long) d).n("kind", kind).n("k", (long) k).n("repeat", (long) repeat).n("seed", seed)
                    .n("status", status).n("option", (long) option).n("token", token).n("identity", identity);
            if (sameIdentity == null) {
                j.nNull("sameIdentity");
            } else {
                j.n("sameIdentity", sameIdentity.booleanValue());
            }
            j.n("by", by).n("searched", searched).n("ms", ms).n("rounds", (long) rounds)
                    .n("playouts", (long) playouts).n("searchMs", searchMs).n("fallback", fallback)
                    .n("overrode", overrode).n("timedOut", timedOut).n("detail", detail);
            j.key("counts").obj();
            for (final Map.Entry<String, Integer> e : counts.entrySet()) {
                j.n(e.getKey(), (long) e.getValue());
            }
            j.end().end();
        }
    }

    /**
     * Ask {@code a}'s player at the atlas seat {@code ai}'s decision {@code d}, whose options are {@code cands}
     * (Forge's answer first) and whose listing {@code d} holds; on the game thread, inside the observe hook.  Never
     * throws: a failure is the answer's {@link #ERROR}.
     */
    public static Answer ask(final Player ai, final List<SearchPolicy.Cand> cands, final String kind,
                             final Atlas.DecisionInfo d, final Ask a) {
        final Answer out = new Answer();
        out.d = d.index;
        out.kind = kind;
        out.k = cands.size();
        out.repeat = a.repeat;
        out.seed = a.seed;
        final long t0 = System.nanoTime();
        try {
            final SeatSpec spec = SeatSpec.parse(seatWithSeed(a.seat, a.seed));
            final String atlasProfile = ai.getLobbyPlayer() instanceof LobbyPlayerAi
                    ? ((LobbyPlayerAi) ai.getLobbyPlayer()).getAiProfile() : null;
            if (!spec.profile.equals(atlasProfile)) {
                out.status = UNSUPPORTED;
                out.detail = "the player's AI profile " + spec.profile + " is not the atlas seat's (" + atlasProfile
                        + "): Forge reads the profile off the seat, so the probe cannot ask it here";
                return out;
            }
            final SearchPolicy search = spec.search == null ? null : new SearchPolicy(spec.search, new SearchPolicy.Sink() {
                @Override
                public void add(final String key, final int n) {
                    out.counts.merge(key, n, Integer::sum);
                }

                @Override
                public void event(final String text) {
                }
            });
            final OutletPolicy policy = spec.outlets == PolicyLobbyPlayerAi.Outlets.OFF ? null
                    : new OutletPolicy(spec.outlets == PolicyLobbyPlayerAi.Outlets.ON);
            final SearchPolicy.Cand pick;
            switch (kind) {
                case "p": {
                    if (!(ai.getController() instanceof PolicyControllerAi)) {
                        throw new IllegalStateException("the atlas seat's controller is not ours: "
                                + ai.getController().getClass().getName());
                    }
                    final SpellAbility forgeSa = SearchPolicy.candSa(cands.get(0));
                    final List<SpellAbility> forge = new ArrayList<>(1);
                    if (forgeSa != null) {
                        forge.add(forgeSa);
                    }
                    final PolicyControllerAi.Probe p = ((PolicyControllerAi) ai.getController())
                            .probePriority(policy, search, forgeSa == null ? null : forge);
                    pick = SearchPolicy.priorityCand(p.answer() == null || p.answer().isEmpty() ? null : p.answer().get(0));
                    out.by = p.by();
                    break;
                }
                case "a": {
                    final Combat combat = ai.getGame().getPhaseHandler().getCombat();
                    final Map<Card, GameEntity> forge = SearchPolicy.candAttack(cands.get(0));
                    try {
                        if (search != null) {
                            search.chooseAttack(ai, combat);
                        }
                        pick = SearchPolicy.attackCand(SearchPolicy.declaredAttack(combat, ai));
                    } finally {
                        SearchPolicy.setAttack(combat, forge);   // the atlas seat's own answer, as it was
                    }
                    break;
                }
                case "b": {
                    final Combat combat = ai.getGame().getPhaseHandler().getCombat();
                    final Map<Card, Card> forge = SearchPolicy.candBlock(cands.get(0));
                    try {
                        if (search != null) {
                            search.chooseBlock(ai, combat);
                        }
                        pick = SearchPolicy.blockCand(SearchPolicy.declaredBlocks(combat, ai));
                    } finally {
                        SearchPolicy.setBlock(combat, ai, forge);
                    }
                    break;
                }
                default:
                    throw new IllegalArgumentException("a decision of kind " + kind + " is not an atlas decision");
            }
            final SearchPolicy.Report rep = search == null ? null : search.takeReport();
            if (search != null) {
                search.takeTargetReport();
            }
            out.searched = rep != null;
            if (rep != null) {
                out.rounds = rep.rounds;
                out.playouts = rep.playouts;
                out.searchMs = rep.ms;
                out.fallback = rep.fallback;
                out.overrode = rep.overrode;
                out.timedOut = rep.timedOut;
            }
            if (out.by == null) {
                // an attack or a block: whose answer it was, as PolicyControllerAi.combatBy says it for the record
                out.by = rep != null && rep.fallback == null && rep.chosen >= 0 ? "search" : "forge";
            }
            out.token = SearchPolicy.token(pick);
            out.identity = SearchPolicy.identity(pick);
            final int o = optionOf(out.token, out.identity, d.tokens, d.identities);
            out.option = o < 0 ? NO_OPTION : o;
            if (o >= 0 && d.identities.size() == d.tokens.size()) {
                out.sameIdentity = d.identities.get(o).equals(out.identity);
            }
            out.status = o >= 0 ? OK : o == TWO_OPTIONS ? AMBIGUOUS : OFF_ATLAS;
            if (o == TWO_OPTIONS) {
                out.detail = "the token " + out.token + " names two of the options and its identity does not single one out";
            }
        } catch (final RuntimeException e) {
            out.status = ERROR;
            out.detail = e.getClass().getSimpleName() + (e.getMessage() == null ? "" : ": " + e.getMessage());
            Atlas.logStack("probe:d" + d.index, e);
        } finally {
            out.ms = (System.nanoTime() - t0) / 1_000_000L;
        }
        return out;
    }

    /**
     * The index of the pick among the atlas's options: the one option whose token is {@code token} (the atlas's own
     * name for an option: its listing check compares tokens); where several share it (D483: an Adventure card's
     * creature and its adventure), the one of those whose identity is {@code identity}.  {@link #NO_OPTION} when no
     * option has the token, {@link #TWO_OPTIONS} when several do and the identity does not single one out (none of
     * them has it, or more than one).  A unique token is its option whatever the identities say; the answer's
     * {@link Answer#sameIdentity} says whether they agreed.  Pure.
     */
    public static int optionOf(final String token, final String identity, final List<String> tokens,
                               final List<String> identities) {
        final List<Integer> same = new ArrayList<>();
        for (int i = 0; i < tokens.size(); i++) {
            if (tokens.get(i).equals(token)) {
                same.add(i);
            }
        }
        if (same.isEmpty()) {
            return NO_OPTION;
        }
        if (same.size() == 1) {
            return same.get(0);
        }
        int found = NO_OPTION;
        for (final int i : same) {
            if (identities != null && i < identities.size() && identities.get(i).equals(identity)) {
                if (found != NO_OPTION) {
                    return TWO_OPTIONS;
                }
                found = i;
            }
        }
        return found == NO_OPTION ? TWO_OPTIONS : found;
    }

    /**
     * Where the replay's listing of a decision differs from the baseline's, or null when it is the same, token for
     * token and in order: the first differing position, or the lengths.  Pure.
     */
    public static String listingDiff(final List<String> baseline, final List<String> replay) {
        if (baseline.equals(replay)) {
            return null;
        }
        final int n = Math.min(baseline.size(), replay.size());
        for (int i = 0; i < n; i++) {
            if (!baseline.get(i).equals(replay.get(i))) {
                return "option " + i + ": the baseline listed " + baseline.get(i) + ", the replay " + replay.get(i)
                        + " (baseline " + baseline + ", replay " + replay + ")";
            }
        }
        return "the baseline listed " + baseline.size() + " options, the replay " + replay.size() + " (baseline "
                + baseline + ", replay " + replay + ")";
    }

    /**
     * The seat config with its search's seed set to {@code seed}: the ladder's config puts {@code +search:...} last
     * (tools/ai-ladder/kinds.ts), and SearchConfig reads the last {@code seed=} it is given.  A config without a
     * search is returned as it is.  Pure.
     */
    public static String seatWithSeed(final String seat, final long seed) {
        if (seed == 0) {
            throw new IllegalArgumentException("a probe's seed is never 0 (0 is the search's clock seed)");
        }
        final int at = seat.indexOf("+search");
        if (at < 0) {
            return seat;
        }
        if (seat.indexOf('+', at + 1) >= 0) {
            throw new IllegalArgumentException("the seat's +search part is not its last: " + seat);
        }
        final String rest = seat.substring(at + "+search".length());
        if (rest.isEmpty()) {
            return seat + ":seed=" + seed;
        }
        if (!rest.startsWith(":")) {
            throw new IllegalArgumentException("not a +search part: " + seat);
        }
        return rest.length() == 1 ? seat + "seed=" + seed : seat + ",seed=" + seed;
    }

    /** Repeat {@code r}'s seed at decision {@code key} under the run's {@code seed}: positive, never 0.  Pure. */
    public static long repeatSeed(final long seed, final String key, final int repeat) {
        long h = ExploreMath.mix(0x9E3779B97F4A7C15L ^ 0x50524F4245L);   // "PROBE"
        h = ExploreMath.mix(h ^ seed);
        for (int i = 0; i < key.length(); i++) {
            h = ExploreMath.mix(h ^ key.charAt(i));
        }
        h = ExploreMath.mix(h ^ (repeat + 11L)) & 0x7FFF_FFFF_FFFFL;
        return h == 0 ? 1 : h;
    }
}
