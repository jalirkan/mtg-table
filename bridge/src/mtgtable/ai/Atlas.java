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
import java.lang.ref.WeakReference;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Consumer;

import com.google.common.eventbus.Subscribe;

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
 * <p><b>A branch that throws</b> (D465): a {@code RuntimeException} or an
 * {@code Error} -- {@code OutOfMemoryError} above all -- is caught at the
 * branch's boundary ({@link #play}), its row carries the error (an
 * {@code Error} is marked {@code engineError}), its copy and ledger are let go,
 * and the unit goes on with its next branch.  After an {@code OutOfMemoryError}
 * the hook runs one {@code System.gc()} and logs the heap in use; a second in a
 * row ({@link #OOM_RETIRE}) means the heap is genuinely exhausted, so the hook
 * stops branching, ends the replay, and the worker retires after its match line
 * ({@link #heapExhausted}) -- the pool's fresh worker resumes the unit at the
 * branches it has no row for ({@link Unit#skip}).  Each finished branch is also
 * handed to {@link Unit#onBranch} as it ends, so a worker that dies outright
 * loses none of the branches it finished.
 *
 * <p><b>A branch that never comes back from one engine step</b> (D467): the
 * branch's deadline is read between {@code mainLoopStep} calls AND by a
 * {@link StepClock} on the copy's event bus, which throws {@link BranchTimeout}
 * from inside the step once the deadline has passed.  J156/J157's
 * {@code d9-random-o0-b165} on the vintage pair spent 30 minutes inside one
 * step: eighteen Ocelot Prides' end-step triggers, each copying every token
 * that entered this turn, doubling a battlefield of thousands while every token
 * scans every card for replacements.  The branch is scored as an engine error
 * ({@code timedOut} and {@code engineError}), as D465's caught {@code Error}s
 * are, and the unit goes on.
 *
 * <p><b>A branch whose game is restarted</b> (D477): Karn Liberated's -14
 * restarts the game, and Forge leaves the new game to
 * {@code GameAction.startGame}'s loop, which a branch's own step loop is not.
 * {@link ForkRestart#begin} starts it on the copy as that loop would (fresh
 * hands and mulligans, the activator's first turn) and the branch plays it
 * on; its turns count on from the old game's, against the same cap, and the
 * row says {@code restarts}.  J162's modern7 spine had 62 random branches end
 * in a {@code NullPointerException} on the phase of null instead.
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

    /** D465: this many {@code OutOfMemoryError}s in a row (branches or games) and the worker retires. */
    public static final int OOM_RETIRE = 2;

    /** D465: {@code OutOfMemoryError}s in a row in this JVM; a branch or game that ends without one resets it. */
    private static int oomStreak;

    /** D465: one more {@code OutOfMemoryError} in a row (a branch's, or a whole game's in the worker). */
    public static synchronized void noteOom() {
        oomStreak++;
    }

    /** D465: a branch ended without one. */
    static synchronized void noteNoOom() {
        oomStreak = 0;
    }

    /** D465: whether the heap is genuinely exhausted -- {@link #OOM_RETIRE} in a row -- and the worker should retire. */
    public static synchronized boolean heapExhausted() {
        return oomStreak >= OOM_RETIRE;
    }

    /** D465: the heap in use and its cap, in MB, for the log line after a caught {@code OutOfMemoryError}. */
    public static String heapInUse() {
        final Runtime rt = Runtime.getRuntime();
        return ((rt.totalMemory() - rt.freeMemory()) >> 20) + " MB of " + (rt.maxMemory() >> 20) + " MB";
    }

    /**
     * D467: the branch's deadline, read INSIDE an engine step.  A subscriber
     * on the copy's event bus: every event the copy fires (a token entering is
     * one) reads the clock, and past the deadline it throws {@link BranchTimeout}
     * back through {@code Game.fireEvent} into the step -- Guava's
     * {@code Subscriber.invokeSubscriberMethod} rethrows a subscriber's
     * {@code Error} as itself (javap, the pinned 2.0.14 jar: offsets 84-102),
     * where an {@code Exception} would be logged and swallowed.  Disarmed once
     * the branch's loop has ended, so the copy's own ending (its
     * {@code setGameOver}, the recorders' last frames) fires events freely.
     * A step that fires no event at all (D484: J167's s05, Forge re-asking a
     * Circle of Protection's source forever) is the {@link DecisionClock}'s,
     * read at every decision instead.
     */
    public static final class StepClock {
        private final long deadline;
        private boolean armed = true;
        /** The events read (while armed). */
        public long events;

        public StepClock(final long deadline) {
            this.deadline = deadline;
        }

        @Subscribe
        public void tick(final Object event) {
            if (!armed) {
                return;
            }
            events++;
            if (System.nanoTime() > deadline) {
                throw new BranchTimeout(events);
            }
        }

        /** The branch's loop is over: let the copy end without the clock. */
        public void disarm() {
            armed = false;
        }
    }

    /**
     * D467: a branch's deadline passed inside one engine step.  An {@code Error}
     * so that it crosses Guava's dispatch and Forge's {@code catch (Exception)}
     * blocks; no stack trace, it is thrown on every event once due.
     */
    public static final class BranchTimeout extends Error {
        private static final long serialVersionUID = 1L;

        BranchTimeout(final long events) {
            this("the branch's deadline passed inside one engine step (" + events + " events into its play)");
        }

        /** D484: thrown at a decision ({@link DecisionClock}): the deadline, or one record repeated to the cap. */
        BranchTimeout(final String message) {
            super(message, null, false, false);
        }
    }

    /** D467: the {@link BranchTimeout} in {@code t}'s cause chain (Forge wraps some throws), or null. */
    public static BranchTimeout timeoutIn(final Throwable t) {
        for (Throwable c = t; c != null; c = c.getCause() == c ? null : c.getCause()) {
            if (c instanceof BranchTimeout) {
                return (BranchTimeout) c;
            }
        }
        return null;
    }

    /** D470: the {@link RolloutController.OptionUnavailable} in {@code t}'s cause chain, or null. */
    static RolloutController.OptionUnavailable unavailableIn(final Throwable t) {
        for (Throwable c = t; c != null; c = c.getCause() == c ? null : c.getCause()) {
            if (c instanceof RolloutController.OptionUnavailable) {
                return (RolloutController.OptionUnavailable) c;
            }
        }
        return null;
    }

    /** D465: a branch's key in {@link Unit#skip}. */
    public static String skipKey(final int o, final int i) {
        return "o" + o + ":b" + i;
    }

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
        /** D465: branches an earlier attempt of this unit recorded ({@link #skipKey}): not played again. */
        public Set<String> skip = Collections.emptySet();
        /**
         * D480: the options this unit plays (their indices in the listing), or null for every one.  Early
         * stopping drops an option at a checkpoint, and the units after it carry the options still running;
         * option 0, Forge's own answer, is never dropped, so the leak check on it still runs.
         */
        public Set<Integer> options;
        /** D465: each branch as it ends (the worker streams it to the pool), or null. */
        public Consumer<Branch> onBranch;
    }

    /** One decision of the atlas seat. */
    public static final class DecisionInfo {
        public int index;
        public String kind;
        public int turn;
        public final List<String> tokens = new ArrayList<>();
        public final List<String> labels = new ArrayList<>();
        /**
         * D483: each option's play identity ({@link SearchPolicy#identity}), beside its token: two options
         * with one token can be two plays (an Adventure card's creature and its adventure from the hand),
         * and the atlas counts a decision's options by identity.
         */
        public final List<String> identities = new ArrayList<>();
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
        /**
         * D470: the option could not be given in this branch's copy (a forced
         * combat answer the seat was never asked for, or a block on an attacker
         * that is not attacking): why, else null.  Not an error and not a
         * result; the atlas leaves it out of the option's value and counts it.
         */
        public String unavailable;
        /**
         * D477: how many times Karn Liberated restarted the copy's game.  The
         * branch plays each new game on (its {@link #turns} count on from the
         * old game's), so a restarted branch is a played one with a result.
         */
        public int restarts;
        /** D465: the branch threw an {@code Error} (an engine error, not a game's result). */
        public boolean engineError;
        /** D465: ... and it was an {@code OutOfMemoryError}. */
        public boolean oom;
        /** D465: the copy, weakly: whether anything still holds it once the unit is done. */
        WeakReference<Game> copyRef;
        public long bytes;
        public int standIns;
        /**
         * D479: the copy's effect cards whose original names a source the copy
         * could not map (the source left every copied zone), and the exile links
         * it could not map.  Each such card plays its effect on a fork as if it
         * had no source, or its exiled card as if nothing exiled it.
         */
        public int effectSourceNull;
        public int exileLinksLost;
        /** D500: the damage instances the copy could not give a source and target, and so took off (written when &gt; 0). */
        public int damageLkiLost;
        /**
         * D484: the ChooseSource answers the branch's seats made in place of
         * Forge's null or divider card ({@link PolicyControllerAi#CHOOSE_SOURCE_GUARD}).
         */
        public int chooseSourceGuard;
        /**
         * D485: the plays the branch's random seats handed to the engine after
         * replacing the stale targets Forge's answer carried (their
         * {@code retargeted} guardrail).
         */
        public int retargeted;
        /**
         * D486: the plays the branch's random seats cast with modes they drew in
         * place of Forge's, at the listing or inside the cast (their
         * {@code modesDrawn} guardrail).
         */
        public int modesDrawn;
        /**
         * D488: the plays the branch's random seats handed to the engine with
         * their target count cut to one they could pay for, and with targets
         * drawn away from what the play's own cost takes (their
         * {@code targetCountTrimmed} and {@code costTargetAvoided} guardrails).
         */
        public int targetCountTrimmed;
        public int costTargetAvoided;
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
        /** D465: why this worker retires after the match (the heap is exhausted), or null. */
        public String retire;
        /** D465: of this unit's copies, how many were still reachable after one GC at its end (-1 = not measured). */
        public int copiesRetained = -1;

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
                String id;
                try {
                    id = SearchPolicy.identity(c);
                } catch (final RuntimeException e) {
                    id = t;
                }
                d.tokens.add(t);
                d.labels.add(c.label());
                d.identities.add(id);
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
                branching:
                for (int i = unit.i0; i < unit.i1; i++) {
                    final long seed = branchSeed(unit.seed, d.index, i);
                    for (int o = 0; o < cands.size(); o++) {
                        if (unit.options != null && !unit.options.contains(o)) {
                            continue;   // D480: an option early stopping dropped at an earlier checkpoint
                        }
                        if (unit.skip.contains(skipKey(o, i))) {
                            continue;   // D465: an earlier attempt of this unit recorded it
                        }
                        final String key = "atlas:d" + d.index + ":" + unit.continuation + ":o" + o + ":b" + i;
                        DistillRows.useDir(unit.rowsDir);
                        final Branch b = play(ai, cands.get(o), o, i, seed, key, d);
                        if (i - unit.i0 < unit.leakChecks && o == 0 && !b.engineError && b.unavailable == null) {
                            leakCheck(ai, cands.get(o), b, seed, d);
                        }
                        branches.add(b);
                        if (ended(b)) {
                            ai.getGame().setGameOver(GameEndReason.Draw);   // the replay's rest is not played either
                            break branching;
                        }
                    }
                }
            } finally {
                DistillRows.useDir(rowsBefore);
            }
            copiesRetained = retained(branches);
        }

        /**
         * D465: the bookkeeping after one branch: the OOM streak, one GC and the
         * heap logged after an {@code OutOfMemoryError}, the branch streamed.
         * True when the heap is exhausted and the unit must stop here.
         */
        private boolean ended(final Branch b) {
            if (b.oom) {
                noteOom();
                System.gc();
                System.err.println("[atlas] " + b.key + ": " + b.error + " caught at the branch's boundary; heap in use after one GC: "
                        + heapInUse() + (heapExhausted() ? " -- " + OOM_RETIRE + " in a row, the worker retires" : ""));
            } else {
                noteNoOom();
            }
            if (unit.onBranch != null) {
                try {
                    unit.onBranch.accept(b);
                } catch (final RuntimeException e) {
                    System.err.println("[atlas] " + b.key + ": streaming the branch failed: " + e);
                }
            }
            if (heapExhausted()) {
                retire = OOM_RETIRE + " OutOfMemoryErrors in a row (the last at " + b.key + "); heap in use after GC "
                        + heapInUse();
                return true;
            }
            return false;
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
                j.end().key("identities").arr();
                for (final String t : d.identities) {
                    j.v(t);
                }
                j.end().end();
            }
            j.end();
            if (copiesRetained >= 0) {
                j.n("copiesRetained", (long) copiesRetained);
            }
            j.key("branches").arr();
            for (final Branch b : branches) {
                writeBranch(j, b);
            }
            j.end().end();
        }
    }

    /** One branch as JSON: a game row's {@code atlas.branches} entry, and (D465) a worker's {@code progress} line. */
    public static void writeBranch(final JsonOut j, final Branch b) {
        j.obj().n("o", (long) b.option).n("i", (long) b.i).n("seed", b.seed).n("result", (long) b.result)
                .n("capped", b.capped).n("timedOut", b.timedOut).n("turns", (long) b.turns)
                .n("steps", (long) b.steps).n("ms", b.ms).n("bytes", b.bytes).n("standIns", (long) b.standIns)
                .n("key", b.key);
        if (b.error == null) {
            j.nNull("error");
        } else {
            j.n("error", b.error);
        }
        if (b.engineError) {
            j.n("engineError", true);
        }
        if (b.unavailable != null) {
            j.n("unavailable", b.unavailable);
        }
        if (b.restarts > 0) {
            j.n("restarts", (long) b.restarts);
        }
        if (b.effectSourceNull > 0) {
            j.n("effectSourceNull", (long) b.effectSourceNull);
        }
        if (b.exileLinksLost > 0) {
            j.n("exileLinksLost", (long) b.exileLinksLost);
        }
        if (b.damageLkiLost > 0) {
            j.n("damageLkiLost", (long) b.damageLkiLost);
        }
        if (b.chooseSourceGuard > 0) {
            j.n("chooseSourceGuard", (long) b.chooseSourceGuard);
        }
        if (b.retargeted > 0) {
            j.n("retargeted", (long) b.retargeted);
        }
        if (b.modesDrawn > 0) {
            j.n("modesDrawn", (long) b.modesDrawn);
        }
        if (b.targetCountTrimmed > 0) {
            j.n("targetCountTrimmed", (long) b.targetCountTrimmed);
        }
        if (b.costTargetAvoided > 0) {
            j.n("costTargetAvoided", (long) b.costTargetAvoided);
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

    /**
     * D465: how many of these branches' copies are still reachable after one
     * {@code System.gc()} -- a branch keeps its numbers, never its game.  A
     * copy an AI thread Forge could not stop still holds (AiController's eval
     * thread outlives its timeout on Java 21) counts too.  -1 with no branch.
     */
    static int retained(final List<Branch> bs) {
        boolean any = false;
        for (final Branch b : bs) {
            any |= b.copyRef != null;
        }
        if (!any) {
            return -1;
        }
        System.gc();
        int n = 0;
        for (final Branch b : bs) {
            if (b.copyRef != null && b.copyRef.get() != null) {
                n++;
            }
        }
        return n;
    }

    /**
     * One branch: a copy of {@code ai}'s game with {@code cand} forced as its
     * first answer, redealt from {@code ai}'s knowledge with {@code seed}, played
     * to the end or the cap by the unit's continuation; recorded into
     * {@code framesDir} as {@code <name>-seat<k>.jsonl.gz} (null = no frames) and
     * the rows of both seats under {@code key} when {@code rows}.  Public for
     * the ai-bench self-test's D470 scenario.
     */
    public static Branch play(final Player ai, final SearchPolicy.Cand cand, final int o, final int i, final long seed,
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
        StepClock clock = null;
        final List<AtlasController> seats = new ArrayList<>();   // D484: their decision clocks, armed with the step clock
        PhaseHandler ph = null;
        int steps = 0;
        int turnsBefore = 0;   // D477: the turns of the games a Karn restart ended, before the copy's current one
        try {
            final LenientGameCopier cp = new LenientGameCopier(game);
            copy = SearchPolicy.copyForAtlas(cp, ai);
            b.copyRef = new WeakReference<>(copy);
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
                seats.add(c);
                if (p == aiCopy) {
                    forcing = c;
                }
            }
            cand.install(cp, copy, aiCopy, forcing);
            Determinizer.determinize(copy, aiCopy, new Random(seed * 0x9E3779B97F4A7C15L + 1));
            cand.afterDeterminize(cp, copy, aiCopy);
            b.standIns = cp.unmapped();
            b.effectSourceNull = cp.effectSourceNull().size();
            b.exileLinksLost = cp.exileLinksLost().size();
            b.damageLkiLost = cp.damageLkiLost().size();
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
            ph = copy.getPhaseHandler();
            final long deadline = t0 + unit.branchTimeoutMs * 1_000_000L;
            clock = new StepClock(deadline);
            copy.subscribeToEvents(clock);   // D467: the deadline inside a step, too
            for (final AtlasController c : seats) {
                c.arm(deadline);   // D484: ... and at every decision, which a step that loops on a question never fires
            }
            while (!copy.isGameOver() && turnsBefore + ph.getTurn() <= unit.turnCap && steps < MAX_STEPS) {
                if ((steps & 15) == 0 && System.nanoTime() > deadline) {
                    b.timedOut = true;
                    break;
                }
                final int turn = ph.getTurn();
                ph.mainLoopStep();
                steps++;
                if (ForkRestart.pending(copy)) {
                    // D477: Karn Liberated restarted the copy's game -- start the new one, as Forge's startGame loop
                    // would, and play on; its turns count on from the old game's, against the same cap
                    turnsBefore += turn;
                    b.restarts++;
                    if (b.ledger != null) {
                        b.ledger.turnOffset(turnsBefore);
                    }
                    ForkRestart.begin(copy, forcing);
                    continue;
                }
                // D470: past the fork's combat step and the seat never asked: the option is not this game's
                final String gone = forcing == null ? null : forcing.expired(copy);
                if (gone != null) {
                    throw new RolloutController.OptionUnavailable(gone);
                }
            }
            clock.disarm();
            disarm(seats, b);
            b.steps = steps;
            b.turns = turnsBefore + ph.getTurn();
            // D478: a game this loop ended (the turn cap, the step cap, the deadline between steps) is a draw, 0. Not
            // resultOf: Forge's setGameOver(Draw) gives every player without an outcome a WIN (Player.onGameOver), so
            // resultOf read the atlas seat's hasWon() and scored every capped lab branch through J162 as seat A's win.
            // A game the ENGINE ended drawn (both lost, an intentional draw) is resultOf's own 0 (D478's addendum)
            final boolean ended = copy.isGameOver();
            if (!ended) {
                b.capped = b.turns > unit.turnCap;
                copy.setGameOver(GameEndReason.Draw);
            }
            b.result = ended ? SearchPolicy.resultOf(copy, aiCopy) : 0;
            if (b.ledger != null) {
                b.ledger.snapshot();
            }
            for (final SeatRecorder r : recs) {
                r.finish();
            }
        } catch (final RuntimeException | IOException e) {
            if (clock != null) {
                clock.disarm();
            }
            disarm(seats, b);
            final BranchTimeout bt = timeoutIn(e);
            final RolloutController.OptionUnavailable gone = unavailableIn(e);
            if (bt != null) {
                // D467: Forge wrapped the clock's throw (AbilityFactory does) -- still the deadline, still an engine error
                timedOutInStep(b, bt, ph, steps, turnsBefore);
            } else if (gone != null) {
                // D470: the option cannot be given in this copy -- counted apart, never an error or a result
                b.unavailable = gone.getMessage();
                b.steps = steps;
                b.turns = ph == null ? 0 : turnsBefore + ph.getTurn();
            } else {
                b.error = e.getClass().getSimpleName() + (e.getMessage() == null ? "" : ": " + e.getMessage());
                logStack(b.key, e);   // D488: the row keeps one line; the worker log keeps where it was thrown
            }
            for (final SeatRecorder r : recs) {
                r.crashed();
            }
        } catch (final Error e) {
            if (clock != null) {
                clock.disarm();
            }
            disarm(seats, b);
            if (e instanceof BranchTimeout) {
                // D467: the deadline passed inside one engine step -- the copy is mid-resolution, let go like an Error's
                timedOutInStep(b, (BranchTimeout) e, ph, steps, turnsBefore);
            }
            // D465: an Error (OutOfMemoryError above all) ends this branch, never the unit: the copy and its
            // ledger are let go here, the row says so, and the hook decides whether the worker can go on
            copy = null;
            aiCopy = null;
            b.ledger = null;
            b.engineError = true;
            b.oom = e instanceof OutOfMemoryError;
            if (b.error == null) {
                b.error = e.getClass().getSimpleName() + (e.getMessage() == null ? "" : ": " + e.getMessage());
            }
            for (final SeatRecorder r : recs) {
                try {
                    r.crashed();
                } catch (final RuntimeException | Error x) {
                    // the recorder's own notice may not fit in the heap either; its close below says what it can
                }
            }
        } finally {
            if (b.ledger != null) {
                b.ledger.detach();   // D465: the ledger keeps its numbers, never the copy
            }
            for (final SeatRecorder r : recs) {
                try {
                    r.close();
                    b.bytes += r.bytes();
                    if (r.errors() > 0 && b.error == null) {
                        b.error = "recording: " + r.errors() + " snapshot error(s)";
                    }
                } catch (final IOException | RuntimeException e) {
                    b.error = "recording: " + e;
                } catch (final Error e) {
                    // D465: as above -- the branch ends, the unit does not
                    b.engineError = true;
                    b.oom |= e instanceof OutOfMemoryError;
                    if (b.error == null) {
                        b.error = "recording: " + e.getClass().getSimpleName();
                    }
                }
            }
            if (rows) {
                final boolean played = b.error == null && b.unavailable == null;
                final String winner = !played ? null : b.result > 0 ? "A" : b.result < 0 ? "B" : "draw";
                DistillRows.endGame(key, winner, played);
            }
            MyRandom.setRandom(real);
            b.ms = (System.nanoTime() - t0) / 1_000_000L;
        }
        return b;
    }

    /**
     * D488: an errored branch's stack, in the worker's log (stderr), the row
     * keeping its one-line {@code error}: J171's s12 rows said
     * "IndexOutOfBoundsException: Index 0 out of bounds for length 0" and
     * nothing said where.  The throw and its causes, 40 frames each.
     */
    static void logStack(final String key, final Throwable e) {
        final StringBuilder sb = new StringBuilder("[atlas] ").append(key).append(": branch error, stack:\n");
        Throwable t = e;
        for (int depth = 0; t != null && depth < 4; depth++, t = t.getCause()) {
            sb.append(depth == 0 ? "  " : "  caused by: ").append(t).append('\n');
            final StackTraceElement[] st = t.getStackTrace();
            for (int i = 0; i < st.length && i < 40; i++) {
                sb.append("    at ").append(st[i]).append('\n');
            }
        }
        System.err.print(sb);
    }

    /** D484: the seats' decision clocks off (the copy ends without them), and the ChooseSource answers they made counted; D485: and the random seats' re-targeted plays. */
    static void disarm(final List<AtlasController> seats, final Branch b) {
        int guarded = 0;
        int retargeted = 0;
        int modesDrawn = 0;
        int trimmed = 0;
        int avoided = 0;
        for (final AtlasController c : seats) {
            c.disarm();
            guarded += c.counts().getOrDefault(PolicyControllerAi.CHOOSE_SOURCE_GUARD, 0);
            if (c.explorer() != null) {
                retargeted += c.explorer().math().guardrails().getOrDefault("retargeted", 0);   // D485
                modesDrawn += c.explorer().math().guardrails().getOrDefault("modesDrawn", 0);   // D486
                trimmed += c.explorer().math().guardrails().getOrDefault("targetCountTrimmed", 0);   // D488
                avoided += c.explorer().math().guardrails().getOrDefault("costTargetAvoided", 0);    // D488
            }
        }
        b.chooseSourceGuard = guarded;
        b.retargeted = retargeted;
        b.modesDrawn = modesDrawn;
        b.targetCountTrimmed = trimmed;
        b.costTargetAvoided = avoided;
    }

    /**
     * D467: a branch stopped inside one engine step: timed out, and an engine
     * error (its copy is mid-resolution, so it has no result) -- the row's
     * error says where it stood.
     */
    static void timedOutInStep(final Branch b, final BranchTimeout bt, final PhaseHandler ph, final int steps,
                               final int turnsBefore) {
        b.timedOut = true;
        b.engineError = true;
        b.steps = steps;
        String at = "";
        try {
            if (ph != null) {
                b.turns = turnsBefore + ph.getTurn();
                at = " at turn " + ph.getTurn() + " " + ph.getPhase() + (b.restarts > 0 ? " of the restarted game" : "");
            }
        } catch (final RuntimeException e) {
            // the copy is mid-resolution; where it stood is a courtesy
        }
        b.error = "BranchTimeout: " + bt.getMessage() + at + ", step " + steps;
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
