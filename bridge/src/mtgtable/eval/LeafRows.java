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

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.PrintStream;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import forge.deck.Deck;
import forge.game.Game;
import forge.game.GameRules;
import forge.game.GameType;
import forge.game.Match;
import forge.game.player.RegisteredPlayer;
import forge.model.FModel;
import mtgtable.Bootstrap;
import mtgtable.Config;
import mtgtable.Json;
import mtgtable.ai.PolicyLobbyPlayerAi;
import mtgtable.ai.SearchPolicy;
import mtgtable.grade.HiddenPool;
import mtgtable.grade.Rebuild;
import mtgtable.grade.WireLog;

/**
 * The fit gate's Java half (D352, {@code tools/ml/gate_fit.py}): for every
 * recorded game in a list, every turn's last state -- the position a playout at
 * the search's live horizon ({@code turns=0}) stops in -- rebuilt from the
 * seat's redacted log exactly as {@code coach-grade.sh fit-scale} rebuilds it
 * (D349), and scored by the hand-written leaf ({@link SearchPolicy#leaf}) and,
 * given a model, by the learned evaluator on the REBUILT game
 * ({@link PositionEvaluator#winProbability(Game, forge.game.player.Player)}, the
 * path the search's leaves take).  One JSON line per position:
 * {@code {file, frame, seat, turn, won, leaf, eval?}}.  No game is played.
 *
 * <pre>
 *   LeafRows --list FILES.txt --out ROWS.jsonl [--model M.json] [--max-turns-per-game 0]
 * </pre>
 *
 * <p>Resumable: files already in {@code --out} are skipped.  The knowledge is
 * the viewer's own deck (from the header, when the file exists) and nothing of
 * the opponent's: neither score reads a hidden card (the leaf counts hands and
 * libraries; the evaluator reads only the viewer's knowledge, D316), so the
 * redealt filler does not move a number.
 */
public final class LeafRows {

    private LeafRows() { }

    public static void main(final String[] args) {
        int exit;
        try {
            exit = run(args);
        } catch (final Throwable t) {
            System.err.println("LEAF-ROWS FAILED: " + t);
            t.printStackTrace();
            exit = 2;
        }
        System.out.flush();
        System.err.flush();
        System.exit(exit);   // Forge leaves non-daemon pools behind
    }

    static int run(final String[] argv) throws Exception {
        String list = null;
        String out = null;
        String model = null;
        for (int i = 0; i + 1 < argv.length; i += 2) {
            switch (argv[i]) {
            case "--list": list = argv[i + 1]; break;
            case "--out": out = argv[i + 1]; break;
            case "--model": model = argv[i + 1]; break;
            default: throw new IllegalArgumentException("unknown flag " + argv[i] + " (--list, --out, --model)");
            }
        }
        if (list == null || out == null) {
            throw new IllegalArgumentException("LeafRows needs --list FILES.txt and --out ROWS.jsonl");
        }
        final List<File> logs = new ArrayList<>();
        try (BufferedReader r = Files.newBufferedReader(Path.of(list), StandardCharsets.UTF_8)) {
            for (String l = r.readLine(); l != null; l = r.readLine()) {
                if (!l.isBlank()) {
                    logs.add(new File(l.trim()));
                }
            }
        }
        final File outFile = new File(out);
        final Set<String> done = new HashSet<>();
        if (outFile.isFile()) {
            for (final String l : Files.readAllLines(outFile.toPath(), StandardCharsets.UTF_8)) {
                if (!l.isBlank()) {
                    try {
                        done.add(String.valueOf(((Map<?, ?>) Json.parse(l)).get("file")));
                    } catch (final RuntimeException e) {
                        // a torn last line from a killed run: that file is done again
                    }
                }
            }
        }
        final Config cfg = Config.load();
        Bootstrap.installGui(cfg.forgeHomeDir());   // hard rule 1: the FIRST Forge call
        System.err.println("[leaf-rows] FModel.initialize " + Bootstrap.initializeModel(false) + " ms");
        final PositionEvaluator ev = model == null ? null : PositionEvaluator.load(Path.of(model));
        final int[] counts = new int[4];   // positions, files, skipped files, rebuild failures
        final PrintStream realOut = System.out;
        System.setOut(new PrintStream(new ByteArrayOutputStream(), true, "UTF-8"));   // Forge prints a lot
        if (outFile.getParentFile() != null) {
            outFile.getParentFile().mkdirs();
        }
        try (Writer w = new OutputStreamWriter(new FileOutputStream(outFile, true), StandardCharsets.UTF_8)) {
            onGameThread(() -> {
                for (final File lf : logs) {
                    if (done.contains(lf.getPath())) {
                        continue;
                    }
                    try {
                        counts[0] += oneLog(cfg.root(), lf, ev, w, counts);
                        counts[1]++;
                        w.flush();
                    } catch (final IOException | RuntimeException e) {
                        counts[2]++;
                        System.err.println("[leaf-rows] skipped " + lf + ": " + e);
                    }
                }
            });
        } finally {
            System.setOut(realOut);
        }
        System.err.println("[leaf-rows] " + counts[0] + " position(s) from " + counts[1] + " file(s); " + counts[2]
                + " file(s) skipped, " + counts[3] + " rebuild failure(s) -> " + out);
        realOut.println("{\"positions\":" + counts[0] + ",\"files\":" + counts[1] + ",\"skippedFiles\":" + counts[2]
                + ",\"rebuildFailures\":" + counts[3] + "}");
        return 0;
    }

    /** One log's rows; returns how many were written. */
    static int oneLog(final File root, final File lf, final PositionEvaluator ev, final Writer w, final int[] counts)
            throws IOException {
        final WireLog log = WireLog.read(lf);
        Map<?, ?> over = null;
        for (int i = log.frames.size() - 1; i >= 0 && over == null; i--) {
            if ("over".equals(log.frames.get(i).get("type"))) {
                over = (Map<?, ?>) log.frames.get(i).get("body");
            }
        }
        if (over == null || !(over.get("winner") instanceof Number)) {
            throw new IOException("no winner");
        }
        final int won = WireLog.num(over, "winner", -1) == log.seat ? 1 : 0;
        final Rebuild.Knowledge k = new Rebuild.Knowledge();
        for (final Object o : WireLog.arr(log.header, "decks")) {
            final Map<?, ?> d = (Map<?, ?>) o;
            final String p = WireLog.str(d, "path");
            if (WireLog.num(d, "player", -1) == log.seat && p != null) {
                final File f = new File(p).isAbsolute() ? new File(p) : new File(root, p);
                if (f.isFile()) {
                    k.ownDeck = HiddenPool.readList(f, false);
                    k.ownPool = HiddenPool.readList(f, true);
                }
            }
        }
        int n = 0;
        for (final int frame : turnEnds(log)) {
            final double leaf;
            double p = Double.NaN;
            long turn;
            try {
                final WireLog.Moment m = log.review(frame);
                turn = WireLog.num(m.state, "turn", -1);
                final Rebuild.Base b = new Rebuild(log, m, k).build(frame * 0x9E3779B97F4A7C15L + 7, new Rebuild.Tweaks());
                leaf = SearchPolicy.leaf(b.game, b.viewer);
                if (ev != null) {
                    p = ev.winProbability(b.game, b.viewer);
                }
            } catch (final RuntimeException | StackOverflowError e) {
                counts[3]++;
                continue;
            }
            final Json.JsonOut j = new Json.JsonOut().obj().n("file", lf.getPath()).n("frame", frame).n("seat", log.seat)
                    .n("turn", turn).n("won", won).n("leaf", leaf);
            if (ev != null) {
                j.n("eval", p);
            }
            w.write(j.end().done());
            w.write('\n');
            n++;
        }
        return n;
    }

    /** The index of each turn's last state frame before the game was over (as fit-scale's, D349). */
    static List<Integer> turnEnds(final WireLog log) {
        final List<Integer> out = new ArrayList<>();
        long turn = -1;
        int last = -1;
        for (int i = 0; i < log.frames.size(); i++) {
            final Map<?, ?> fr = log.frames.get(i);
            if (!"state".equals(fr.get("type"))) {
                continue;
            }
            final Map<?, ?> st = (Map<?, ?>) fr.get("body");
            if (st.get("gameOver") != null || st.get("phase") == null) {
                continue;
            }
            final long t = WireLog.num(st, "turn", -1);
            if (t != turn && last >= 0) {
                out.add(last);
            }
            turn = t;
            last = i;
        }
        return out;
    }

    /** Run {@code body} as the one task on Forge's game pool (CoachGrade's way, D309), and wait for it. */
    static void onGameThread(final Runnable body) throws Exception {
        final Deck dummy = new Deck("leaf-rows-start");
        dummy.getMain().add(FModel.getMagicDb().getCommonCards().getCard("Swamp"), 20);
        final List<RegisteredPlayer> regs = new ArrayList<>();
        for (int i = 0; i < 2; i++) {
            final RegisteredPlayer rp = new RegisteredPlayer(dummy);
            rp.setPlayer(Bootstrap.createAiSeat("Seat" + i, i, Bootstrap.DEFAULT_AI_PROFILE, null, PolicyLobbyPlayerAi.Outlets.OFF));
            regs.add(rp);
        }
        final GameRules rules = new GameRules(GameType.Constructed);
        rules.setAppliedVariants(EnumSet.of(GameType.Constructed));
        rules.setGamesPerMatch(1);
        final Game scratch = new Match(rules, regs, "leaf-rows-start").createGame();
        final CountDownLatch done = new CountDownLatch(1);
        final Throwable[] fail = new Throwable[1];
        scratch.getAction().invoke(() -> {
            try {
                body.run();
            } catch (final Throwable t) {
                fail[0] = t;
            } finally {
                done.countDown();
            }
        });
        if (!done.await(24, TimeUnit.HOURS)) {
            throw new IllegalStateException("leaf rows did not finish in 24 h");
        }
        if (fail[0] != null) {
            throw new RuntimeException(fail[0]);
        }
    }
}
