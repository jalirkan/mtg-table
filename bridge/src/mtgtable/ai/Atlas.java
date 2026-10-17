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

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.TreeMap;

import forge.game.Game;
import forge.game.GameEndReason;
import forge.game.card.Card;
import forge.game.phase.PhaseHandler;
import forge.game.player.Player;
import forge.game.zone.PlayerZone;
import forge.game.zone.ZoneType;
import forge.util.MyRandom;

import mtgtable.Json.JsonOut;
import mtgtable.SeatRecorder;

/**
 * The move atlas's engine half (D451): at a decision of the atlas seat, fork
 * the game and play every option out, many times, under two continuations.
 *
 * <p><b>Where it runs.</b>  Every seat of an atlas game is our controller with
 * an observing search ({@code observe=1}, D450), so the search's own candidate
 * generation lists the options at each p, a and b decision and hands them to
 * {@link SearchPolicy#observeHook} -- this class's {@link Hook} -- on the game
 * thread, before the answer is played.  A worker plays the atlas's baseline
 * game (Forge's Default on both seats, from its seed) with the hook LISTING the
 * atlas seat's decisions; a branch unit plays the same game again from the same
 * seed (Forge is deterministic for a fixed seed, decks and pilots: D450's
 * census-replay measured it) to decision {@code d}, checks that the options are
 * the baseline's, and there plays its branches.  Nothing here changes the real
 * game: each branch is a copy.
 *
 * <p><b>A branch</b> ({@link #play}) is a search rollout carried to the end of
 * the game: a copy ({@link LenientGameCopier}, as the search makes one), the
 * option forced as the atlas seat's first answer ({@link AtlasController}),
 * what the atlas seat cannot see redealt ({@link Determinizer}: the opponent's
 * hand and library pooled and dealt again, both libraries shuffled -- from the
 * multiset alone, so seat B's real hidden cards decide nothing in a branch and
 * reach no row of seat A's), then played to the end or to the turn cap (a draw)
 * by the continuation: Forge's Default AI on both seats, or the random seat
 * ({@link ExploreMath.Config#randomSeat}) on both.  Branch {@code i} of every
 * option of a decision uses the same seed -- the same redeal, the same engine
 * stream, the same random seats' draws -- so options are compared on common
 * random numbers.  The real {@code MyRandom} is put back after each.
 *
 * <p><b>The fork's checks</b> ({@link #forkProblems}): after the redeal the
 * copy must still be the position -- the turn, the phase, every life total,
 * every zone's size, the battlefield card for card, the atlas seat's hand card
 * for card, and the opponent's hand and library the same cards between them.
 * And, on request ({@link Unit#leakChecks}), the no-leak check: the branch is
 * played again after the opponent's real hand and library were dealt again in
 * the ORIGINAL game (as {@link RowsLeakCheck} does), and the atlas seat's state
 * at the fork, the result and the atlas seat's rows must not move; the negative
 * control, the atlas seat's own hand swapped with its library, must (its state
 * at the fork reads its hand; a swap that changes no card's name cannot show).
 *
 * <p>Threads: the hook runs on the game thread, inside the seat's decision
 * callback (and inside {@code Decisions.quiet}); the copies are played on the
 * same thread, as the search plays its rollouts.  No hop, no thread.
 */
public final class Atlas {

    private Atlas() {
    }

    /** The most engine steps a branch may take before it is stopped (and scored a draw). */
    static final int MAX_STEPS = 400_000;

    /** One worker job's settings (the cube lab's {@code atlas} block). */
    public static final class Unit {
        /** The atlas seat's player name. */
        public String seat = "Drafter A";
        /** The decision to branch at (0-based among the atlas seat's decisions with two or more options); -1 = list them only. */
        public int decision = -1;
        /** {@code random} or {@code forge}. */
        public String continuation = "forge";
        /** Branches {@code [i0, i1)} of every option. */
        public int i0;
        public int i1;
        /** The atlas's seed: branch i's is {@link #branchSeed}(seed, decision, i). */
        public long seed;
        public int turnCap = 40;
        public long branchTimeoutMs = 120_000;
        /** The options the baseline listed at this decision (their tokens), or null: the replay must list the same. */
        public List<String> expect;
        /** The observing config every seat of a branch carries (its candidates and rows). */
        public SearchConfig observe = SearchConfig.parse("observe=1");
        /** Rows of the branch games go here (null = none). */
        public Path rowsDir;
        /** Frame logs of the branch games go here (null = none), with what the recorder needs. */
        public File framesDir;
        public List<SeatRecorder.Seat> seats;
        public String jarSha;
        public Map<String, Object> lab = new LinkedHashMap<>();
        /** How many branches of this unit get the no-leak check (0 = none): branch i0 of the first options. */
        public int leakChecks;
    }

    /** One decision of the atlas seat. */
    public static final class DecisionInfo {
        public int index;
        public String kind;
        public int turn;
        public final List<String> tokens = new ArrayList<>();
        public final List<String> labels = new ArrayList<>();
    }

    /** One branch's outcome, from the atlas seat's side. */
    public static final class Branch {
        public int option;
        public int i;
        public long seed;
        /** +1 won, -1 lost, 0 a draw (the turn cap, the step cap, the timeout, or a drawn game). */
        public int result;
        public boolean capped;
        public boolean timedOut;
        public int turns;
        public int steps;
        public long ms;
        public String error;
        public long bytes;
        public int standIns;
        public final List<String> forkProblems = new ArrayList<>();
        /** The no-leak check: null not run; true the branch did not move when the opponent's hidden cards did. */
        public Boolean leakSame;
        /** Its negative control: true when the atlas seat's own hand swapped DID move it. */
        public Boolean controlMoved;
        public GameLedger ledger;
        public String key;
    }

    /** Branch {@code i}'s seed at decision {@code d}: the same for every option (common random numbers). */
    public static long branchSeed(final long seed, final int d, final int i) {
        long h = ExploreMath.mix(0x9E3779B97F4A7C15L ^ 0x41544C4153L);   // "ATLAS"
        h = ExploreMath.mix(h ^ seed);
        h = ExploreMath.mix(h ^ (d + 1L));
        return ExploreMath.mix(h ^ (i + 7L)) & 0x7FFF_FFFF_FFFFL;
    }

    /** The observe hook of one atlas game: lists the atlas seat's decisions, and branches at the unit's. */
    public static final class Hook implements SearchPolicy.ObserveHook {
        private final Unit unit;
        public final List<DecisionInfo> decisions = new ArrayList<>();
        public final List<Branch> branches = new ArrayList<>();
        public DecisionInfo branched;
        public String error;

        public Hook(final Unit unit) {
            this.unit = unit;
        }

        @Override
        public void decision(final Player ai, final List<SearchPolicy.Cand> cands, final String kind) {
            if (!unit.seat.equals(ai.getName()) || cands.size() < 2) {
                return;
            }
            final DecisionInfo d = new DecisionInfo();
            d.index = decisions.size();
            d.kind = kind;
            d.turn = ai.getGame().getPhaseHandler().getTurn();
            for (final SearchPolicy.Cand c : cands) {
                String t;
                try {
                    t = SearchPolicy.token(c);
                } catch (final RuntimeException e) {
                    t = "?";
                }
                d.tokens.add(t);
                d.labels.add(c.label());
            }
            decisions.add(d);
            if (d.index != unit.decision) {
                return;
            }
            branched = d;
            if (unit.expect != null && !unit.expect.equals(d.tokens)) {
                error = "the replay diverged at decision " + d.index + ": the baseline listed " + unit.expect
                        + ", the replay " + d.tokens;
                return;
            }
            final Path rowsBefore = DistillRows.dir();
            try {
                for (int i = unit.i0; i < unit.i1; i++) {
                    final long seed = branchSeed(unit.seed, d.index, i);
                    for (int o = 0; o < cands.size(); o++) {
                        final String key = "atlas:d" + d.index + ":" + unit.continuation + ":o" + o + ":b" + i;
                        DistillRows.useDir(unit.rowsDir);
                        final Branch b = play(ai, cands.get(o), o, i, seed, key, d);
                        if (i - unit.i0 < unit.leakChecks && o == 0) {
                            leakCheck(ai, cands.get(o), b, seed, d);
                        }
                        branches.add(b);
                    }
                }
            } finally {
                DistillRows.useDir(rowsBefore);
            }
        }

        /** One branch, recorded as the unit says. */
        private Branch play(final Player ai, final SearchPolicy.Cand cand, final int o, final int i, final long seed,
                            final String key, final DecisionInfo d) {
            final Map<String, Object> fields = new LinkedHashMap<>(unit.lab);
            fields.put("decision", (long) d.index);
            fields.put("kind", d.kind);
            fields.put("turn", (long) d.turn);
            fields.put("option", (long) o);
            fields.put("optionToken", d.tokens.get(o));
            fields.put("continuation", unit.continuation);
            fields.put("branch", (long) i);
            fields.put("branchSeed", seed);
            fields.put("turnCap", (long) unit.turnCap);
            final String name = "d" + d.index + "-" + unit.continuation + "-o" + o + "-b" + i;
            return Atlas.play(ai, cand, o, i, seed, unit, key, fields, unit.framesDir, name, unit.rowsDir != null);
        }

        /**
         * The no-leak check on branch {@code b}: played again (no frames, rows into
         * a scratch folder) after the opponent's real hand and library were dealt
         * again in the real game, its result and the atlas seat's rows must be the
         * same; with the atlas seat's own hand swapped instead, they must not.
         */
        private void leakCheck(final Player ai, final SearchPolicy.Cand cand, final Branch b, final long seed,
                               final DecisionInfo d) {
            try {
                final Path tmp = java.nio.file.Files.createTempDirectory("atlas-leak");
                try {
                    final String base = rowsOf(ai, cand, seed, tmp.resolve("base"), d, null);
                    final String swapped = rowsOf(ai, cand, seed, tmp.resolve("swapped"), d, Boolean.FALSE);
                    final String own = rowsOf(ai, cand, seed, tmp.resolve("own"), d, Boolean.TRUE);
                    b.leakSame = base != null && base.equals(swapped);
                    b.controlMoved = own != null && !own.equals(base);
                } finally {
                    try (var w = java.nio.file.Files.walk(tmp)) {
                        w.sorted(java.util.Comparator.reverseOrder()).forEach(p -> p.toFile().delete());
                    }
                }
            } catch (final IOException | RuntimeException e) {
                b.forkProblems.add("leak check failed to run: " + e);
            }
        }

        /**
         * Play the branch with rows only into {@code dir} and return the atlas
         * seat's rows (but their wall time) and the result; {@code swapOwn} null =
         * no swap, false = the opponent's hidden cards redealt first, true = the
         * atlas seat's own hand swapped with its library first (the control).
         */
        private String rowsOf(final Player ai, final SearchPolicy.Cand cand, final long seed, final Path dir,
                              final DecisionInfo d, final Boolean swapOwn) throws IOException {
            final Game g = ai.getGame();
            final List<Runnable> restore = new ArrayList<>();
            if (swapOwn != null) {
                final Random rng = new Random(seed ^ 0x5AA5L);
                for (final Player p : g.getPlayers()) {
                    if ((p == ai) != swapOwn) {
                        continue;
                    }
                    final PlayerZone hand = p.getZone(ZoneType.Hand);
                    final PlayerZone lib = p.getZone(ZoneType.Library);
                    final List<Card> h0 = new ArrayList<>(hand.getCards(false));
                    final List<Card> l0 = new ArrayList<>(lib.getCards(false));
                    restore.add(() -> {
                        hand.setCards(h0);
                        lib.setCards(l0);
                    });
                    final List<Card> all = new ArrayList<>(h0);
                    all.addAll(l0);
                    Collections.shuffle(all, rng);
                    if (p == ai) {
                        // the control: a different hand for the atlas seat, from its library
                        final List<Card> fromLib = new ArrayList<>(l0);
                        Collections.shuffle(fromLib, rng);
                        final int n = Math.min(h0.size(), fromLib.size());
                        final List<Card> newHand = new ArrayList<>(fromLib.subList(0, n));
                        final List<Card> newLib = new ArrayList<>(fromLib.subList(n, fromLib.size()));
                        newLib.addAll(h0);
                        hand.setCards(newHand);
                        lib.setCards(newLib);
                    } else {
                        hand.setCards(new ArrayList<>(all.subList(0, h0.size())));
                        lib.setCards(new ArrayList<>(all.subList(h0.size(), all.size())));
                    }
                }
            }
            final Path rowsBefore = DistillRows.dir();
            try {
                DistillRows.useDir(dir);
                final StringBuilder probe = new StringBuilder();
                final Branch x = Atlas.play(ai, cand, 0, 0, seed, unit, "leak", new LinkedHashMap<>(), null, null, true, probe);
                DistillRows.close();
                // the atlas seat's state at the fork, then the result, then its rows
                final StringBuilder sb = new StringBuilder(probe).append('\n').append("result " + x.result + " turns " + x.turns
                        + (x.error == null ? "" : " error " + x.error) + "\n");
                final Path f = DistillRows.file(dir);
                if (java.nio.file.Files.exists(f)) {
                    for (final String line : java.nio.file.Files.readAllLines(f)) {
                        if (line.contains("\"type\":\"row\"") && line.contains("\"seat\":\"" + unit.seat + "\"")) {
                            sb.append(line.replaceAll("\"ms\":[0-9.Ee+-]+,", "")).append('\n');
                        }
                    }
                }
                return sb.toString();
            } finally {
                DistillRows.useDir(rowsBefore);
                for (final Runnable r : restore) {
                    r.run();
                }
            }
        }

        /** The listing and the branches, as the worker's game row. */
        public void write(final JsonOut j) {
            j.obj();
            if (error != null) {
                j.n("error", error);
            }
            j.key("decisions").arr();
            for (final DecisionInfo d : decisions) {
                j.obj().n("d", (long) d.index).n("kind", d.kind).n("turn", (long) d.turn);
                j.key("tokens").arr();
                for (final String t : d.tokens) {
                    j.v(t);
                }
                j.end().key("labels").arr();
                for (final String t : d.labels) {
                    j.v(t);
                }
                j.end().end();
            }
            j.end();
            j.key("branches").arr();
            for (final Branch b : branches) {
                j.obj().n("o", (long) b.option).n("i", (long) b.i).n("seed", b.seed).n("result", (long) b.result)
                        .n("capped", b.capped).n("timedOut", b.timedOut).n("turns", (long) b.turns)
                        .n("steps", (long) b.steps).n("ms", b.ms).n("bytes", b.bytes).n("standIns", (long) b.standIns)
                        .n("key", b.key);
                if (b.error == null) {
                    j.nNull("error");
                } else {
                    j.n("error", b.error);
                }
                if (b.leakSame != null) {
                    j.n("leakSame", b.leakSame).n("controlMoved", Boolean.TRUE.equals(b.controlMoved));
                }
                j.key("forkProblems").arr();
                for (final String p : b.forkProblems) {
                    j.v(p);
                }
                j.end();
                if (b.ledger != null) {
                    j.key("ledger");
                    b.ledger.write(j);
                }
                j.end();
            }
            j.end().end();
        }
    }

    /**
     * One branch: a copy of {@code ai}'s game with {@code cand} forced as its
     * first answer, redealt from {@code ai}'s knowledge with {@code seed}, played
     * to the end or the cap by the unit's continuation; recorded into
     * {@code framesDir} as {@code <name>-seat<k>.jsonl.gz} (null = no frames) and
     * the rows of both seats under {@code key} when {@code rows}.
     */
    static Branch play(final Player ai, final SearchPolicy.Cand cand, final int o, final int i, final long seed,
                       final Unit unit, final String key, final Map<String, Object> fields, final File framesDir,
                       final String name, final boolean rows) {
        return play(ai, cand, o, i, seed, unit, key, fields, framesDir, name, rows, null);
    }

    /** {@link #play}, and with {@code probe} the atlas seat's state at the fork (after the redeal) appended to it. */
    static Branch play(final Player ai, final SearchPolicy.Cand cand, final int o, final int i, final long seed,
                       final Unit unit, final String key, final Map<String, Object> fields, final File framesDir,
                       final String name, final boolean rows, final StringBuilder probe) {
        final Branch b = new Branch();
        b.option = o;
        b.i = i;
        b.seed = seed;
        b.key = key;
        final long t0 = System.nanoTime();
        final Game game = ai.getGame();
        final java.util.Random real = MyRandom.getRandom();
        MyRandom.setRandom(new Random(seed));
        final List<SeatRecorder> recs = new ArrayList<>();
        Game copy = null;
        Player aiCopy = null;
        try {
            final LenientGameCopier cp = new LenientGameCopier(game);
            copy = SearchPolicy.copyForAtlas(cp, ai);
            aiCopy = (Player) cp.find(ai);
            AtlasController forcing = null;
            final List<Player> ps = new ArrayList<>(copy.getPlayers());
            for (int k = 0; k < ps.size(); k++) {
                final Player p = ps.get(k);
                final AtlasController c = new AtlasController(copy, p, p.getLobbyPlayer(), unit.observe);
                if ("random".equals(unit.continuation)) {
                    c.setExplorer(new Explorer(new ExploreMath(ExploreMath.Config.randomSeat(),
                            ExploreMath.seedFor(seed, 1, k))));
                }
                p.dangerouslySetController(c);
                if (p == aiCopy) {
                    forcing = c;
                }
            }
            cand.install(cp, copy, aiCopy, forcing);
            Determinizer.determinize(copy, aiCopy, new Random(seed * 0x9E3779B97F4A7C15L + 1));
            cand.afterDeterminize(cp, copy, aiCopy);
            b.standIns = cp.unmapped();
            b.forkProblems.addAll(forkProblems(game, ai, copy, aiCopy));
            if (probe != null) {
                probe.append(java.util.Arrays.toString(DistillFeatures.state(aiCopy)));
            }
            if (framesDir != null) {
                b.ledger = GameLedger.attach(copy);
            }
            if (rows) {
                DistillRows.setGame(key);
                final Map<String, Object> begin = new LinkedHashMap<>(fields);
                begin.put("seat0", ps.get(0).getName());
                begin.put("seat1", ps.size() > 1 ? ps.get(1).getName() : null);
                DistillRows.begin(key, begin);
            }
            if (framesDir != null) {
                framesDir.mkdirs();
                final Map<String, Object> lab = new LinkedHashMap<>(fields);
                final Map<String, Object> explore = "random".equals(unit.continuation) ? randomHeader() : null;
                for (int s = 0; s < ps.size(); s++) {
                    recs.add(SeatRecorder.attach(copy, s, new File(framesDir, name + "-seat" + s + ".jsonl.gz"), name,
                            seed, unit.jarSha, unit.seats, "lab", lab, explore));
                }
            }
            final PhaseHandler ph = copy.getPhaseHandler();
            final long deadline = t0 + unit.branchTimeoutMs * 1_000_000L;
            int steps = 0;
            while (!copy.isGameOver() && ph.getTurn() <= unit.turnCap && steps < MAX_STEPS) {
                if ((steps & 15) == 0 && System.nanoTime() > deadline) {
                    b.timedOut = true;
                    break;
                }
                ph.mainLoopStep();
                steps++;
            }
            b.steps = steps;
            b.turns = ph.getTurn();
            if (!copy.isGameOver()) {
                b.capped = ph.getTurn() > unit.turnCap;
                copy.setGameOver(GameEndReason.Draw);
            }
            b.result = SearchPolicy.resultOf(copy, aiCopy);
            if (b.ledger != null) {
                b.ledger.snapshot();
            }
            for (final SeatRecorder r : recs) {
                r.finish();
            }
        } catch (final RuntimeException | IOException e) {
            b.error = e.getClass().getSimpleName() + (e.getMessage() == null ? "" : ": " + e.getMessage());
            for (final SeatRecorder r : recs) {
                r.crashed();
            }
        } finally {
            for (final SeatRecorder r : recs) {
                try {
                    r.close();
                    b.bytes += r.bytes();
                    if (r.errors() > 0 && b.error == null) {
                        b.error = "recording: " + r.errors() + " snapshot error(s)";
                    }
                } catch (final IOException e) {
                    b.error = "recording: " + e;
                }
            }
            if (rows) {
                final String winner = b.error != null ? null : b.result > 0 ? "A" : b.result < 0 ? "B" : "draw";
                DistillRows.endGame(key, winner, b.error == null);
            }
            MyRandom.setRandom(real);
            b.ms = (System.nanoTime() - t0) / 1_000_000L;
        }
        return b;
    }

    /** The playExplore header of a random-seat recording: D358's three keys, as the redaction checker expects. */
    static Map<String, Object> randomHeader() {
        final Map<String, Object> m = new LinkedHashMap<>();
        m.put("epsilon", 1.0);
        m.put("closeCall", 0.0);
        m.put("opening", false);
        return m;
    }

    /**
     * Whether a branch's copy is still the position (after the redeal): the
     * turn and phase, life totals, every zone's size, the battlefield card for
     * card, the atlas seat's hand card for card, the opponent's hand and library
     * the same cards between them.  The empty list: a legal copy.
     */
    public static List<String> forkProblems(final Game orig, final Player ai, final Game copy, final Player aiCopy) {
        final List<String> out = new ArrayList<>();
        if (orig.getPhaseHandler().getTurn() != copy.getPhaseHandler().getTurn()) {
            out.add("turn " + orig.getPhaseHandler().getTurn() + " vs " + copy.getPhaseHandler().getTurn());
        }
        final List<Player> po = new ArrayList<>(orig.getPlayers());
        final List<Player> pc = new ArrayList<>(copy.getPlayers());
        if (po.size() != pc.size()) {
            out.add("players " + po.size() + " vs " + pc.size());
            return out;
        }
        for (int k = 0; k < po.size(); k++) {
            final Player a = po.get(k);
            final Player c = pc.get(k);
            if (a.getLife() != c.getLife()) {
                out.add(a.getName() + " life " + a.getLife() + " vs " + c.getLife());
            }
            for (final ZoneType z : new ZoneType[] {ZoneType.Hand, ZoneType.Library, ZoneType.Graveyard, ZoneType.Exile,
                ZoneType.Battlefield}) {
                if (a.getZone(z).size() != c.getZone(z).size()) {
                    out.add(a.getName() + " " + z + " " + a.getZone(z).size() + " vs " + c.getZone(z).size());
                }
            }
            if (!names(a.getCardsIn(ZoneType.Battlefield)).equals(names(c.getCardsIn(ZoneType.Battlefield)))) {
                out.add(a.getName() + "'s battlefield differs");
            }
            if (a == ai) {
                if (!names(a.getCardsIn(ZoneType.Hand)).equals(names(c.getCardsIn(ZoneType.Hand)))) {
                    out.add("the atlas seat's hand differs");
                }
            } else {
                final List<Card> ho = new ArrayList<>(a.getCardsIn(ZoneType.Hand));
                ho.addAll(a.getCardsIn(ZoneType.Library));
                final List<Card> hc = new ArrayList<>(c.getCardsIn(ZoneType.Hand));
                hc.addAll(c.getCardsIn(ZoneType.Library));
                if (!names(ho).equals(names(hc))) {
                    out.add(a.getName() + "'s hand and library are not the same cards");
                }
            }
        }
        if (aiCopy == null || !ai.getName().equals(aiCopy.getName())) {
            out.add("the atlas seat was not found in the copy");
        }
        return out;
    }

    /** A zone's cards as a sorted multiset of (id, name). */
    private static Map<String, Integer> names(final Iterable<Card> cards) {
        final Map<String, Integer> m = new TreeMap<>();
        for (final Card c : cards) {
            m.merge(c.getId() + ":" + c.getName(), 1, Integer::sum);
        }
        return m;
    }
}
