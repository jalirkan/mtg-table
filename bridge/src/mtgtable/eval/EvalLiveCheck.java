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
package mtgtable.eval;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import com.google.common.eventbus.Subscribe;

import forge.deck.Deck;
import forge.deck.io.DeckSerializer;
import forge.game.Game;
import forge.game.GameEndReason;
import forge.game.GameRules;
import forge.game.GameType;
import forge.game.Match;
import forge.game.card.Card;
import forge.game.event.GameEvent;
import forge.game.event.GameEventPlayerPriority;
import forge.game.player.Player;
import forge.game.player.PlayerView;
import forge.game.player.RegisteredPlayer;
import forge.game.zone.PlayerZone;
import forge.game.zone.ZoneType;
import forge.util.MyRandom;

import mtgtable.Bootstrap;
import mtgtable.Config;
import mtgtable.Json;
import mtgtable.Snap;

/**
 * The live half of the evaluator's parity, with the engine (D316): plays
 * AI-vs-AI games and, at every decision -- a player receiving priority in a
 * main phase or a combat step, both chairs -- encodes the position twice:
 *
 * <ol>
 *   <li>the LOG path: {@code Snap.state} for that player (the very function a
 *       recording is made of) -> {@link JsonPosition} -> {@link FeatureEncoder},
 *       with a {@link Tally} fed the frames' events, i.e. what the training rows
 *       are;</li>
 *   <li>the LIVE path: {@link GamePosition} from the engine's objects ->
 *       the same encoder, with {@link Tally#fromGame} -- what the search calls.</li>
 * </ol>
 *
 * and counts every feature on which they differ (the live-unsafe tally
 * features excepted: the model does not read them).  Then the hidden-zone swap:
 * the opponent's hand and library are dealt again from their own cards, the
 * viewer's library shuffled, and the live encoding must not move; the same
 * swap on the viewer's own hand must (the negative control).  Every zone is put
 * back before the game goes on.  With {@code --model} it also times the live
 * call end to end.
 *
 * <pre>
 *   tools/ml/eval-live-check.sh --pairs PAIRS --seeds 1-2 --vocab cubes/synergy-cube-180.md
 *       [--model var/ml/models/synergy-eval.json]
 * </pre>
 *
 * Exits 1 on any hidden-information failure, any feature mismatch, or a game
 * that crashed.  It runs each game with {@code game.getAction().invoke} on
 * Forge's own Game pool, one game at a time (RecordMatch's and AiBench's way);
 * every check runs inside the game's own event dispatch, on the game thread.
 */
public final class EvalLiveCheck {

    private EvalLiveCheck() { }

    private static final Set<String> SKIP = new HashSet<>(List.of(
            "me.abilities_turn", "me.spells_cast_game", "me.lands_played_game", "me.mulligans",
            "opp.abilities_turn", "opp.spells_cast_game", "opp.lands_played_game", "opp.mulligans"));

    // results
    static int decisions;
    static int exact;
    static int hiddenChecks;
    static int hiddenFailures;
    static int controlChecks;
    static int controlChanged;
    static int crashes;
    static final Map<String, int[]> mismatch = new TreeMap<>();
    static final Map<String, String> example = new TreeMap<>();
    static final List<Long> liveNanos = new ArrayList<>();

    public static void main(final String[] args) throws Exception {
        String pairs = null;
        String seeds = "1";
        String modelPath = null;
        final List<Path> vocabFiles = new ArrayList<>();
        int timeoutSec = 300;
        for (int i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "--pairs" -> pairs = args[++i];
                case "--seeds" -> seeds = args[++i];
                case "--vocab" -> vocabFiles.add(Path.of(args[++i]));
                case "--model" -> modelPath = args[++i];
                case "--timeout" -> timeoutSec = Integer.parseInt(args[++i]);
                default -> throw new IllegalArgumentException("unknown flag " + args[i]);
            }
        }
        if (pairs == null || vocabFiles.isEmpty()) {
            throw new IllegalArgumentException("--pairs and --vocab are required");
        }
        final Config cfg = Config.load();
        final Vocab vocab = Vocab.fromFiles(resolveAll(cfg, vocabFiles));
        final FeatureSchema schema = new FeatureSchema(vocab);
        final FeatureEncoder enc = new FeatureEncoder(schema);
        System.out.println("eval live check: schema " + schema.schemaId() + ", " + schema.size() + " features");

        Bootstrap.installGui(cfg.forgeHomeDir());
        System.out.println("FModel.initialize took " + Bootstrap.initializeModel(false) + " ms");
        final EvalModel model;
        if (modelPath != null) {
            model = EvalModel.load(resolve(cfg, modelPath).toPath());
            model.requireVocab(vocab);
        } else {
            model = null;
        }

        final List<String[]> pairList = new ArrayList<>();
        for (final String raw : Files.readAllLines(resolve(cfg, pairs).toPath(), StandardCharsets.UTF_8)) {
            final String l = raw.strip();
            if (!l.isEmpty() && !l.startsWith("#")) {
                final String[] p = l.split("\\s+");
                pairList.add(new String[] {p[0], p[1]});
            }
        }
        final List<Integer> seedList = new ArrayList<>();
        if (seeds.contains("-")) {
            final String[] r = seeds.split("-");
            for (int s = Integer.parseInt(r[0]); s <= Integer.parseInt(r[1]); s++) {
                seedList.add(s);
            }
        } else {
            for (final String s : seeds.split(",")) {
                seedList.add(Integer.parseInt(s.strip()));
            }
        }
        int games = 0;
        for (final String[] pair : pairList) {
            for (final int seed : seedList) {
                final long t0 = System.nanoTime();
                final int before = decisions;
                final boolean ok = playOne(cfg, pair, seed, enc, model, timeoutSec);
                games++;
                System.out.println(String.format(Locale.ROOT, "game %s vs %s seed %d: %s, %d decisions, %.1f s",
                        new File(pair[0]).getName(), new File(pair[1]).getName(), seed, ok ? "ok" : "CRASHED",
                        decisions - before, (System.nanoTime() - t0) / 1e9));
            }
        }

        System.out.println();
        System.out.println("== eval live check ==");
        System.out.println("games              = " + games + " (" + crashes + " crashed)");
        System.out.println("decisions compared = " + decisions + "; identical on every model-read feature: " + exact
                + String.format(Locale.ROOT, " (%.2f%%)", decisions == 0 ? 0.0 : 100.0 * exact / decisions));
        for (final Map.Entry<String, int[]> e : mismatch.entrySet()) {
            System.out.println("  mismatch " + e.getKey() + ": " + e.getValue()[0] + " decision(s), e.g. "
                    + example.get(e.getKey()));
        }
        System.out.println("hidden-zone swaps  = " + hiddenChecks + ", features moved: " + hiddenFailures);
        System.out.println("negative control   = " + controlChecks + " swaps of the viewer's own hand, "
                + controlChanged + " changed the features");
        if (!liveNanos.isEmpty()) {
            Collections.sort(liveNanos);
            double sum = 0;
            for (final long n : liveNanos) {
                sum += n;
            }
            System.out.println(String.format(Locale.ROOT,
                    "live winProbability = mean %.1f us, median %.1f us, p99 %.1f us over %d calls",
                    sum / liveNanos.size() / 1000.0, liveNanos.get(liveNanos.size() / 2) / 1000.0,
                    liveNanos.get((int) (liveNanos.size() * 0.99)) / 1000.0, liveNanos.size()));
        }
        final boolean fail = hiddenFailures > 0 || crashes > 0 || !mismatch.isEmpty()
                || (controlChecks > 0 && controlChanged == 0) || decisions == 0;
        System.out.println(fail ? "EVAL LIVE CHECK FAILED" : "EVAL LIVE CHECK OK");
        System.out.flush();
        System.exit(fail ? 1 : 0);
    }

    private static List<Path> resolveAll(final Config cfg, final List<Path> ps) {
        final List<Path> out = new ArrayList<>();
        for (final Path p : ps) {
            out.add(resolve(cfg, p.toString()).toPath());
        }
        return out;
    }

    private static File resolve(final Config cfg, final String path) {
        final File f = new File(path);
        return (f.isAbsolute() ? f : new File(cfg.root(), path)).getAbsoluteFile();
    }

    private static boolean playOne(final Config cfg, final String[] pair, final int seed, final FeatureEncoder enc,
                                   final EvalModel model, final int timeoutSec) throws Exception {
        MyRandom.setRandom(new Random(seed));
        final Deck d0 = DeckSerializer.fromFile(resolve(cfg, pair[0]));
        final Deck d1 = DeckSerializer.fromFile(resolve(cfg, pair[1]));
        final RegisteredPlayer p0 = new RegisteredPlayer(d0);
        p0.setPlayer(Bootstrap.createAiPlayer("AI-Seat0", 0, "Default"));
        final RegisteredPlayer p1 = new RegisteredPlayer(d1);
        p1.setPlayer(Bootstrap.createAiPlayer("AI-Seat1", 1, "Default"));
        final GameRules rules = new GameRules(GameType.Constructed);
        rules.setAppliedVariants(EnumSet.of(GameType.Constructed));
        rules.setGamesPerMatch(1);
        final Match match = new Match(rules, List.of(p0, p1), "eval-live-check");
        final Game game = match.createGame();
        final Checker checker = new Checker(game, enc, model, new Random(seed * 31L + 7));
        game.subscribeToEvents(checker);
        final CountDownLatch done = new CountDownLatch(1);
        final Throwable[] fail = new Throwable[1];
        game.getAction().invoke(() -> {
            try {
                match.startGame(game);
            } catch (final Throwable t) {
                fail[0] = t;
            } finally {
                done.countDown();
            }
        });
        if (!done.await(timeoutSec, TimeUnit.SECONDS)) {
            game.setGameOver(GameEndReason.Draw);
            done.await(30, TimeUnit.SECONDS);
            System.out.println("  (game timed out after " + timeoutSec + " s)");
        }
        if (fail[0] != null || checker.error != null) {
            crashes++;
            final Throwable t = fail[0] != null ? fail[0] : checker.error;
            System.out.println("  " + t);
            for (final StackTraceElement el : Arrays.copyOf(t.getStackTrace(), Math.min(8, t.getStackTrace().length))) {
                System.out.println("    at " + el);
            }
            return false;
        }
        return true;
    }

    /** The game's own EventBus subscriber: runs on the game thread, in the event's dispatch. */
    public static final class Checker {
        private final Game game;
        private final FeatureEncoder enc;
        private final EvalModel model;
        private final Random rng;
        private final List<GameEvent> batch = new ArrayList<>();
        private final Map<Integer, Tally> logTally = new TreeMap<>();
        private final Set<String> want = new HashSet<>(FeatureSchema.DECISION_PHASES);
        Throwable error;

        Checker(final Game game, final FeatureEncoder enc, final EvalModel model, final Random rng) {
            this.game = game;
            this.enc = enc;
            this.model = model;
            this.rng = rng;
        }

        @Subscribe
        public void receive(final GameEvent ev) {
            if (error != null) {
                return;
            }
            batch.add(ev);
            if (!(ev instanceof GameEventPlayerPriority e) || e.priority() == null || e.phase() == null
                    || !want.contains(e.phase().name()) || game.isGameOver()) {
                return;
            }
            try {
                check(e.priority().getId());
            } catch (final Throwable t) {
                error = t;
            }
        }

        private void check(final int seat) {
            // the log path, for both chairs (each keeps its tally), then the batch is spent
            final List<GameEvent> events = new ArrayList<>(batch);
            batch.clear();
            double[] logVec = null;
            for (final PlayerView pv : game.getView().getPlayers()) {
                final String json = Snap.state("eval-live", game.getView(), pv, events);
                final Map<?, ?> st = (Map<?, ?>) Json.parse(json);
                final Tally t = logTally.computeIfAbsent(pv.getId(), k -> new Tally());
                t.apply(JsonPosition.arr(st.get("events")), JsonPosition.arr(st.get("stack")));
                if (pv.getId() == seat) {
                    if (!Integer.valueOf(seat).equals(JsonPosition.intOrNull(st.get("priority")))) {
                        return;   // the view has not caught up with the priority pass: not a row
                    }
                    logVec = enc.encode(JsonPosition.of(st, seat), seat, t);
                }
            }
            if (logVec == null) {
                return;
            }
            Player viewer = null;
            for (final Player p : game.getPlayers()) {
                if (p.getId() == seat) {
                    viewer = p;
                }
            }
            if (viewer == null) {
                return;
            }
            final double[] live = liveVector(viewer);
            decisions++;
            final List<String> names = enc.schema().names();
            boolean same = true;
            for (int i = 0; i < live.length; i++) {
                if (live[i] != logVec[i] && !SKIP.contains(names.get(i))) {
                    same = false;
                    mismatch.computeIfAbsent(names.get(i), k -> new int[1])[0]++;
                    example.putIfAbsent(names.get(i), "turn " + game.getPhaseHandler().getTurn() + " "
                            + game.getPhaseHandler().getPhase() + ": log " + logVec[i] + ", live " + live[i]);
                }
            }
            if (same) {
                exact++;
            }
            if (model != null) {
                final long t0 = System.nanoTime();
                final double p = model.predict(enc.encode(GamePosition.of(game, viewer), seat, Tally.fromGame(game)));
                liveNanos.add(System.nanoTime() - t0);
                if (!(p >= 0 && p <= 1)) {
                    throw new IllegalStateException("P(win) out of range: " + p);
                }
            }
            hiddenSwap(viewer, live);
        }

        private double[] liveVector(final Player viewer) {
            return enc.encode(GamePosition.of(game, viewer), viewer.getId(), Tally.fromGame(game));
        }

        /** Redeal the hidden zones from their own cards; the live vector must not move. */
        private void hiddenSwap(final Player viewer, final double[] live) {
            for (final Player opp : game.getPlayers()) {
                if (opp == viewer) {
                    continue;
                }
                final PlayerZone hand = opp.getZone(ZoneType.Hand);
                final PlayerZone lib = opp.getZone(ZoneType.Library);
                final PlayerZone myLib = viewer.getZone(ZoneType.Library);
                final List<Card> h0 = new ArrayList<>(hand.getCards(false));
                final List<Card> l0 = new ArrayList<>(lib.getCards(false));
                final List<Card> m0 = new ArrayList<>(myLib.getCards(false));
                try {
                    final List<Card> all = new ArrayList<>(h0);
                    all.addAll(l0);
                    Collections.shuffle(all, rng);
                    hand.setCards(all.subList(0, h0.size()));
                    lib.setCards(all.subList(h0.size(), all.size()));
                    final List<Card> m1 = new ArrayList<>(m0);
                    Collections.shuffle(m1, rng);
                    myLib.setCards(m1);
                    hiddenChecks++;
                    if (!Arrays.equals(live, liveVector(viewer))) {
                        hiddenFailures++;
                        System.out.println("  HIDDEN INFORMATION reached the live encoding (turn "
                                + game.getPhaseHandler().getTurn() + ")");
                    }
                } finally {
                    hand.setCards(h0);
                    lib.setCards(l0);
                    myLib.setCards(m0);
                }
            }
            // the negative control: the same redeal of the viewer's own hand must show
            final PlayerZone hand = viewer.getZone(ZoneType.Hand);
            final PlayerZone lib = viewer.getZone(ZoneType.Library);
            final List<Card> h0 = new ArrayList<>(hand.getCards(false));
            final List<Card> l0 = new ArrayList<>(lib.getCards(false));
            if (h0.isEmpty() || l0.size() < h0.size()) {
                return;
            }
            try {
                final List<Card> all = new ArrayList<>(l0);
                Collections.shuffle(all, rng);
                final List<Card> newHand = new ArrayList<>(all.subList(0, h0.size()));
                final List<Card> newLib = new ArrayList<>(all.subList(h0.size(), all.size()));
                newLib.addAll(h0);
                hand.setCards(newHand);
                lib.setCards(newLib);
                controlChecks++;
                if (!Arrays.equals(live, liveVector(viewer))) {
                    controlChanged++;
                }
            } finally {
                hand.setCards(h0);
                lib.setCards(l0);
            }
        }
    }
}
