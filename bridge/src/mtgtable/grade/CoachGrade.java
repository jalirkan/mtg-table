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

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.PrintStream;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import forge.deck.Deck;
import forge.game.Game;
import forge.game.GameRules;
import forge.game.GameType;
import forge.game.Match;
import forge.game.player.Player;
import forge.game.player.RegisteredPlayer;
import forge.game.zone.ZoneType;
import forge.model.FModel;
import mtgtable.Bootstrap;
import mtgtable.Config;
import mtgtable.Json;
import mtgtable.ai.Determinizer;
import mtgtable.ai.LenientGameCopier;
import mtgtable.ai.PolicyLobbyPlayerAi;

/**
 * {@code tools/coach-grade.sh}'s Java half (D332): grade one decision, or a
 * file of them, against Forge Default.  A measuring tool beside the game, like
 * {@code tools/ai-bench}: no socket, no protocol, no frame log written.
 *
 * <pre>
 *   grade    --log F --frame N [--mode live|review] --type spell|attack|block|target
 *            [knowledge] [settings] [--out FILE]
 *   batch    --moments M.jsonl --out OUT.jsonl [--shard I/K] [knowledge] [settings]
 *   selftest [--log F --frame N --type T --opp-deck D]    (engine smoke, under 20 playouts)
 *   analyse  --log F --type T [--frame N (default: the log's end)] [knowledge] [--budget-ms 3000]
 *   serve    [defaults]   (one booted engine; JSON requests on stdin, answers on stdout)
 *
 *   knowledge: --deck D (the viewer's list; default the log header's deck path)
 *              --opp-deck D | --opp-pool P (a list of cards, a .dck, or "N Name" lines)
 *   settings:  --playouts N (rounds an option still in the race ends with; 200)
 *              --initial N (40) --batch N (20) --no-race --seed S (1)
 *              --horizon T (-1 = to the end; else turns past this one, then the leaf evaluator)
 *              --max-turns T (40) --timeout-ms MS (per playout, 120000) --max-playouts N
 *              --max-ms MS (per decision) --cap N (24) --lands --only tok,tok --extra tok,tok
 * </pre>
 *
 * <p>A moments line (ForgeCoach's {@code bench:coach -- moments}) is JSON with
 * {@code log}, {@code frame}, {@code mode}, {@code type}, and optionally
 * {@code id}, {@code label}, {@code extra} (tokens), {@code deck},
 * {@code oppDeck}, {@code oppPool}.  Each output line is {@link Grader#run}'s
 * object plus those fields.  A batch resumes: keys already in {@code --out}
 * are skipped.
 *
 * <p><b>Live analysis</b> (D334): {@code analyse} and {@code serve} grade the
 * current decision of a game in play with {@link #liveSettings} -- a
 * wall-clock budget ({@code --budget-ms}, default 3000; at least
 * {@code --min-rounds} 2 rounds whatever it says), playouts to the end of this
 * turn ({@code --horizon 0}) scored by the search's leaf evaluator
 * ({@code "measure": "leaf"}: a pseudo win rate, a logistic of the leaf
 * score, not a count of wins), racing from round 6.  The answer is the grade
 * object below plus {@code frame} and {@code wallMs}.
 *
 * <p>Threads: the grading runs as one task on Forge's game pool, started with
 * {@code GameAction.invoke} on a scratch game and waited on with a latch, as
 * {@code AiBench} starts its games (D309) -- one task at a time in this
 * process, so nothing else runs on that pool; no {@code invokeInGameThread}.
 */
public final class CoachGrade {

    private CoachGrade() { }

    public static void main(final String[] args) {
        int exit;
        try {
            if (args.length == 0) {
                throw new IllegalArgumentException("usage: CoachGrade grade|batch|selftest ...");
            }
            final String[] rest = Arrays.copyOfRange(args, 1, args.length);
            switch (args[0]) {
            case "grade":
                exit = grade(rest);
                break;
            case "batch":
                exit = batch(rest);
                break;
            case "selftest":
                exit = selftest(rest);
                break;
            case "analyse":
                exit = analyse(rest);
                break;
            case "serve":
                exit = serve(rest);
                break;
            default:
                throw new IllegalArgumentException("unknown mode " + args[0]);
            }
        } catch (final Throwable t) {
            System.err.println("COACH-GRADE FAILED: " + t);
            t.printStackTrace();
            exit = 2;
        }
        System.out.flush();
        System.err.flush();
        System.exit(exit);   // Forge leaves non-daemon pools behind
    }

    // ------------------------------------------------------------------
    // Flags
    // ------------------------------------------------------------------

    static final class Flags {
        final java.util.Map<String, String> v = new java.util.LinkedHashMap<>();

        Flags(final String[] argv) {
            for (int i = 0; i < argv.length; i++) {
                final String a = argv[i];
                if (!a.startsWith("--")) {
                    throw new IllegalArgumentException("unexpected argument " + a);
                }
                final String k = a.substring(2);
                if (k.equals("no-race") || k.equals("lands")) {
                    v.put(k, "true");
                } else {
                    if (i + 1 >= argv.length) {
                        throw new IllegalArgumentException(a + " needs a value");
                    }
                    v.put(k, argv[++i]);
                }
            }
        }

        String s(final String k, final String d) {
            return v.getOrDefault(k, d);
        }

        int i(final String k, final int d) {
            return v.containsKey(k) ? Integer.parseInt(v.get(k)) : d;
        }

        long l(final String k, final long d) {
            return v.containsKey(k) ? Long.parseLong(v.get(k)) : d;
        }
    }

    /**
     * The live analysis's defaults (D334): a time budget, not a playout count
     * (at least two rounds whatever it says); playouts to the end of this turn
     * scored by the search's leaf evaluator, its own choice for a 1.5 s think
     * (D312) -- a full game costs seconds a playout; racing from round 6.
     */
    static Grader.Settings liveSettings(final Flags f) {
        final Flags g = new Flags(new String[0]);
        g.v.put("playouts", "10000");
        g.v.put("initial", "6");
        g.v.put("batch", "3");
        g.v.put("horizon", "0");
        g.v.put("cap", "12");
        g.v.put("timeout-ms", "5000");
        g.v.putAll(f.v);
        final Grader.Settings s = settings(g);
        s.budgetMs = g.l("budget-ms", 3000);
        s.race.minRounds = g.i("min-rounds", 2);
        return s;
    }

    static Grader.Settings settings(final Flags f) {
        final Grader.Settings s = new Grader.Settings();
        s.budgetMs = f.l("budget-ms", 0);
        s.seed = f.l("seed", 1);
        s.race.target = f.i("playouts", 200);
        s.race.initial = Math.min(s.race.target, f.i("initial", 40));
        s.race.batch = f.i("batch", 20);
        s.race.race = !f.v.containsKey("no-race");
        s.race.maxPlayouts = f.l("max-playouts", Long.MAX_VALUE);
        s.horizon = f.i("horizon", -1);
        s.maxTurns = f.i("max-turns", 40);
        s.playoutTimeoutMs = f.l("timeout-ms", 120_000);
        s.cap = f.i("cap", 24);
        s.lands = f.v.containsKey("lands");
        if (f.v.containsKey("only")) {
            s.only = splitTokens(f.v.get("only"));
        }
        if (f.v.containsKey("extra")) {
            s.extra = splitTokens(f.v.get("extra"));
        }
        return s;
    }

    /** Tokens separated by spaces or semicolons (commas belong to attack/block tokens). */
    static List<String> splitTokens(final String text) {
        final List<String> out = new ArrayList<>();
        for (final String t : text.split("[;\\s]+")) {
            if (!t.isBlank()) {
                out.add(t.trim());
            }
        }
        return out;
    }

    static Rebuild.Knowledge knowledge(final Config cfg, final WireLog log, final String deck, final String oppDeck,
                                       final String oppPool) throws IOException {
        final Rebuild.Knowledge k = new Rebuild.Knowledge();
        String own = deck;
        if (own == null) {
            for (final Object o : WireLog.arr(log.header, "decks")) {
                final Map<?, ?> d = (Map<?, ?>) o;
                if (WireLog.num(d, "player", -1) == log.seat && WireLog.str(d, "path") != null) {
                    own = WireLog.str(d, "path");
                }
            }
        }
        if (own != null) {
            final File f = resolve(cfg, own);
            if (f.isFile()) {
                k.ownDeck = Rebuild.readList(f);
                k.ownSource = "deck:" + own;
            }
        }
        if (oppDeck != null) {
            k.oppDeck = Rebuild.readList(resolve(cfg, oppDeck));
            k.oppSource = "deck:" + oppDeck;
        } else if (oppPool != null) {
            k.oppPool = Rebuild.readList(resolve(cfg, oppPool));
            k.oppSource = "pool:" + oppPool;
        }
        return k;
    }

    static File resolve(final Config cfg, final String path) {
        final File f = new File(path);
        return f.isAbsolute() || f.exists() ? f : new File(cfg.root(), path);
    }

    // ------------------------------------------------------------------
    // Engine
    // ------------------------------------------------------------------

    private static PrintStream realOut;

    static void boot() {
        final Config cfg = Config.load();
        Bootstrap.installGui(cfg.forgeHomeDir());           // hard rule 1: the FIRST Forge call
        final long ms = Bootstrap.initializeModel(false);
        System.err.println("[coach-grade] FModel.initialize " + ms + " ms");
    }

    /** Run {@code body} as the one task on Forge's game pool, and wait for it. */
    static void onGameThread(final Runnable body, final long timeoutMs) throws Exception {
        final Deck dummy = new Deck("grade-start");
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
        final Game scratch = new Match(rules, regs, "coach-grade-start").createGame();
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
        if (!done.await(timeoutMs, TimeUnit.MILLISECONDS)) {
            throw new IllegalStateException("grading did not finish in " + timeoutMs + " ms");
        }
        if (fail[0] != null) {
            throw new RuntimeException(fail[0]);
        }
    }

    /** Grade one moment; returns the JSON line (Forge's own printing is swallowed). */
    static String gradeOne(final Config cfg, final File logFile, final int frame, final String mode, final String type,
                           final Rebuild.Knowledge k, final Grader.Settings s, final long maxMs) throws Exception {
        final WireLog log = WireLog.read(logFile);
        final WireLog.Moment m = "review".equals(mode) ? log.review(frame) : log.live(frame);
        if (m == null) {
            throw new IllegalArgumentException("no state before frame " + frame);
        }
        final long budget = s.budgetMs > 0 ? (maxMs > 0 ? Math.min(maxMs, s.budgetMs) : s.budgetMs) : maxMs;
        if (budget > 0) {
            s.race.deadline = System.nanoTime() + budget * 1_000_000L;
        }
        final String key = logFile.getName() + "#" + mode + frame + ":" + type;
        final String[] out = new String[1];
        final ByteArrayOutputStream noise = new ByteArrayOutputStream();
        realOut = System.out;
        System.setOut(new PrintStream(noise, true, "UTF-8"));   // Forge prints a lot during a game
        try {
            onGameThread(() -> out[0] = new Grader(log, m, type, k, s, key).run(), budget > 0 ? budget + 600_000 : 7L * 24 * 3600 * 1000);
        } finally {
            System.setOut(realOut);
        }
        return out[0];
    }

    static int grade(final String[] argv) throws Exception {
        final Flags f = new Flags(argv);
        final String logPath = f.s("log", null);
        if (logPath == null || !f.v.containsKey("frame") || !f.v.containsKey("type")) {
            throw new IllegalArgumentException("grade needs --log, --frame and --type");
        }
        boot();
        final Config cfg = Config.load();
        final File logFile = resolve(cfg, logPath);
        final WireLog log = WireLog.read(logFile);
        final Rebuild.Knowledge k = knowledge(cfg, log, f.s("deck", null), f.s("opp-deck", null), f.s("opp-pool", null));
        final String line = gradeOne(cfg, logFile, f.i("frame", 0), f.s("mode", "live"), f.s("type", ""), k, settings(f),
                f.l("max-ms", 0));
        final String outPath = f.s("out", null);
        if (outPath != null) {
            Files.writeString(new File(outPath).toPath(), line + "\n", StandardCharsets.UTF_8);
        }
        System.out.println(line);
        return line.contains("\"status\":\"ok\"") ? 0 : 1;
    }

    static int batch(final String[] argv) throws Exception {
        final Flags f = new Flags(argv);
        final String movesPath = f.s("moments", null);
        final String outPath = f.s("out", null);
        if (movesPath == null || outPath == null) {
            throw new IllegalArgumentException("batch needs --moments and --out");
        }
        int shard = 0;
        int shards = 1;
        if (f.v.containsKey("shard")) {
            final String[] p = f.v.get("shard").split("/");
            shard = Integer.parseInt(p[0]);
            shards = Integer.parseInt(p[1]);
        }
        boot();
        final Config cfg = Config.load();
        final File out = new File(outPath);
        final Set<String> done = new HashSet<>();
        if (out.isFile()) {
            for (final String l : Files.readAllLines(out.toPath(), StandardCharsets.UTF_8)) {
                if (!l.isBlank()) {
                    final Map<?, ?> o = (Map<?, ?>) Json.parse(l);
                    done.add(String.valueOf(o.get("momentKey")));
                }
            }
        }
        final List<String> lines = Files.readAllLines(new File(movesPath).toPath(), StandardCharsets.UTF_8);
        int idx = -1;
        int graded = 0;
        if (out.getParentFile() != null) {
            out.getParentFile().mkdirs();
        }
        try (Writer w = new OutputStreamWriter(new FileOutputStream(out, true), StandardCharsets.UTF_8)) {
            for (final String raw : lines) {
                if (raw.isBlank()) {
                    continue;
                }
                idx++;
                if (idx % shards != shard) {
                    continue;
                }
                final Map<?, ?> mo = (Map<?, ?>) Json.parse(raw);
                final String logPath = WireLog.str(mo, "log");
                final int frame = (int) WireLog.num(mo, "frame", -1);
                final String mode = String.valueOf(WireLog.str(mo, "mode") == null ? "live" : WireLog.str(mo, "mode"));
                final String type = WireLog.str(mo, "type");
                final String mkey = logPath + "#" + mode + frame + ":" + type;
                if (done.contains(mkey)) {
                    continue;
                }
                final Grader.Settings s = settings(f);
                final List<String> extra = new ArrayList<>(s.extra);
                for (final Object t : WireLog.arr(mo, "extra")) {
                    extra.add(String.valueOf(t));
                }
                s.extra = extra;
                if (WireLog.bool(mo, "lands")) {
                    s.lands = true;   // a spell case that offers the land drop (ForgeCoach's lands: true)
                }
                String line;
                final long t0 = System.nanoTime();
                try {
                    final File logFile = resolve(cfg, logPath);
                    final WireLog log = WireLog.read(logFile);
                    final Rebuild.Knowledge k = knowledge(cfg, log,
                            WireLog.str(mo, "deck") != null ? WireLog.str(mo, "deck") : f.s("deck", null),
                            WireLog.str(mo, "oppDeck") != null ? WireLog.str(mo, "oppDeck") : f.s("opp-deck", null),
                            WireLog.str(mo, "oppPool") != null ? WireLog.str(mo, "oppPool") : f.s("opp-pool", null));
                    line = gradeOne(cfg, logFile, frame, mode, type, k, s, f.l("max-ms", 0));
                } catch (final Exception e) {
                    line = new Json.JsonOut().obj().n("v", 1).n("status", "error").n("error", String.valueOf(e)).end().done();
                }
                // The moment's own fields in front of the grade.
                final Json.JsonOut head = new Json.JsonOut().obj().n("momentKey", mkey).n("log", logPath).n("frame", frame)
                        .n("mode", mode).n("type", type);
                for (final String kf : new String[] {"id", "label", "source", "deck", "oppDeck", "oppPool"}) {
                    if (WireLog.str(mo, kf) != null) {
                        head.n(kf, WireLog.str(mo, kf));
                    }
                }
                final String h = head.end().done();
                final String merged = h.substring(0, h.length() - 1) + ",\"grade\":" + line + "}";
                w.write(merged);
                w.write('\n');
                w.flush();
                graded++;
                System.err.println("[coach-grade] " + mkey + " " + ((System.nanoTime() - t0) / 1_000_000L) + " ms: "
                        + (line.length() > 200 ? line.substring(0, 200) + "..." : line));
            }
        }
        System.err.println("[coach-grade] batch shard " + shard + "/" + shards + ": " + graded + " graded");
        return 0;
    }

    // ------------------------------------------------------------------
    // Live analysis (D334): one decision now, inside a time budget
    // ------------------------------------------------------------------

    /** {@code analyse}: grade with the live defaults (a budget, a short horizon); prints one JSON line. */
    static int analyse(final String[] argv) throws Exception {
        final Flags f = new Flags(argv);
        if (!f.v.containsKey("log") || !f.v.containsKey("type")) {
            throw new IllegalArgumentException("analyse needs --log and --type (and --frame; default: the end of the log)");
        }
        boot();
        final Config cfg = Config.load();
        final String line = analyseOne(cfg, f);
        System.out.println(line);
        return line.contains("\"status\":\"ok\"") ? 0 : 1;
    }

    static String analyseOne(final Config cfg, final Flags f) throws Exception {
        final File logFile = resolve(cfg, f.s("log", ""));
        final WireLog log = WireLog.read(logFile);
        final int frame = f.v.containsKey("frame") ? f.i("frame", 0) : log.frames.size();
        final Rebuild.Knowledge k = knowledge(cfg, log, f.s("deck", null), f.s("opp-deck", null), f.s("opp-pool", null));
        final long t0 = System.nanoTime();
        final String line = gradeOne(cfg, logFile, frame, f.s("mode", "live"), f.s("type", ""), k, liveSettings(f), 0);
        final long ms = (System.nanoTime() - t0) / 1_000_000L;
        return line.substring(0, line.length() - 1) + ",\"frame\":" + frame + ",\"wallMs\":" + ms + "}";
    }

    /**
     * {@code serve}: one booted engine answering analysis requests, one JSON
     * object per line on stdin, one JSON line per answer on stdout (Forge's own
     * printing goes to stderr).  A request is
     * {@code {"id", "log", "type", "frame"?, "mode"?, "oppDeck"?, "oppPool"?,
     * "deck"?, "budgetMs"?, "horizon"?, "seed"?, "only"?}}; the answer is
     * {@code analyse}'s object with the request's {@code id}.  Requests are
     * answered one at a time, in order; EOF ends the process.
     */
    static int serve(final String[] argv) throws Exception {
        final Flags defaults = new Flags(argv);
        final PrintStream out = System.out;
        System.setOut(System.err);   // stdout carries the answers only
        boot();
        final Config cfg = Config.load();
        out.println("{\"ready\":true}");
        out.flush();
        final java.io.BufferedReader in = new java.io.BufferedReader(new java.io.InputStreamReader(System.in, StandardCharsets.UTF_8));
        for (String raw = in.readLine(); raw != null; raw = in.readLine()) {
            if (raw.isBlank()) {
                continue;
            }
            String id = "";
            String line;
            try {
                final Map<?, ?> req = (Map<?, ?>) Json.parse(raw);
                id = String.valueOf(req.get("id") == null ? "" : req.get("id"));
                final Flags f = new Flags(new String[0]);
                f.v.putAll(defaults.v);
                for (final String[] kf : new String[][] {{"log", "log"}, {"type", "type"}, {"frame", "frame"}, {"mode", "mode"},
                    {"oppDeck", "opp-deck"}, {"oppPool", "opp-pool"}, {"deck", "deck"}, {"budgetMs", "budget-ms"},
                    {"horizon", "horizon"}, {"seed", "seed"}, {"only", "only"}, {"minRounds", "min-rounds"}}) {
                    if (req.get(kf[0]) != null) {
                        f.v.put(kf[1], String.valueOf(req.get(kf[0])));
                    }
                }
                if (!f.v.containsKey("log") || !f.v.containsKey("type")) {
                    throw new IllegalArgumentException("a request needs log and type");
                }
                System.setOut(System.err);
                line = analyseOne(cfg, f);
            } catch (final Exception e) {
                line = new Json.JsonOut().obj().n("v", 1).n("status", "error").n("error", String.valueOf(e)).end().done();
            } finally {
                System.setOut(System.err);
            }
            final StringBuilder sb = new StringBuilder("{\"id\":");
            Json.quote(sb, id);
            out.println(sb + "," + line.substring(1));
            out.flush();
        }
        return 0;
    }

    // ------------------------------------------------------------------
    // The engine smoke test: at most 20 playouts in one JVM
    // ------------------------------------------------------------------

    private static int checks;
    private static int failures;

    static void check(final boolean ok, final String what) {
        checks++;
        if (!ok) {
            failures++;
        }
        System.err.println((ok ? "ok   " : "FAIL ") + what);
    }

    static int selftest(final String[] argv) throws Exception {
        final Flags f = new Flags(argv);
        boot();
        final Config cfg = Config.load();
        final File logFile = resolve(cfg, f.s("log", "fixtures/games/human-trample-7.jsonl"));
        final int frame = f.i("frame", 941);
        final String type = f.s("type", "attack");
        final WireLog log = WireLog.read(logFile);
        final Rebuild.Knowledge k = knowledge(cfg, log, f.s("deck", null), f.s("opp-deck", "decks/morph-probe.dck"), null);
        check(k.ownDeck != null && k.oppDeck != null, "the viewer's deck (from the log header) and the opponent's list are read");
        final WireLog.Moment m = log.live(frame);
        // 1. The rebuild, twice with one seed and once with another: public state identical, hidden from the seed only.
        final String[] r1 = new String[3];
        final List<List<String>> fid = new ArrayList<>();
        final List<String> handsA = new ArrayList<>();
        final List<String> handsB = new ArrayList<>();
        realOut = System.out;
        final ByteArrayOutputStream noise = new ByteArrayOutputStream();
        System.setOut(new PrintStream(noise, true, "UTF-8"));
        try {
            onGameThread(() -> {
                final Rebuild rb = new Rebuild(log, m, k);
                final Rebuild.Tweaks tw = new Rebuild.Tweaks();
                tw.dropAttacking = "attack".equals(type);
                final Rebuild.Base a = rb.build(5, tw);
                final Rebuild.Base b = rb.build(5, tw);
                final Rebuild.Base c = rb.build(6, tw);
                fid.add(a.fidelity);
                r1[0] = String.join("\n", a.spec);
                r1[1] = String.join("\n", b.spec);
                r1[2] = String.join("\n", c.spec);
                final Player v = a.viewer;
                check(v.getLife() == WireLog.num(rb.player(rb.viewerIdx()), "life", -1), "the viewer's life is the log's ("
                        + v.getLife() + ")");
                check(a.opp.getCardsIn(ZoneType.Hand).size() == Rebuild.count(rb.player(1 - rb.viewerIdx()), "hand"),
                        "the opponent's hand size is the log's (" + a.opp.getCardsIn(ZoneType.Hand).size() + ")");
                int matched = 0;
                for (final Map<?, ?> wc : Rebuild.cards(rb.player(rb.viewerIdx()), "battlefield")) {
                    matched += a.byWire.containsKey((int) WireLog.num(wc, "id", -1)) ? 1 : 0;
                }
                check(matched == Rebuild.cards(rb.player(rb.viewerIdx()), "battlefield").size(),
                        "every card of the viewer's battlefield maps back to its wire id (" + matched + ")");
                // 2. CRN: two copies determinized with one seed hold the same opponent hand, whatever was built.
                for (final long seed : new long[] {11, 12}) {
                    final LenientGameCopier cp1 = new LenientGameCopier(a.game);
                    final Game g1 = cp1.makeCopy(null, a.viewer);
                    final Player v1 = (Player) cp1.find(a.viewer);
                    Determinizer.determinize(g1, v1, new Random(seed));
                    final LenientGameCopier cp2 = new LenientGameCopier(b.game);
                    final Game g2 = cp2.makeCopy(null, b.viewer);
                    final Player v2 = (Player) cp2.find(b.viewer);
                    Determinizer.determinize(g2, v2, new Random(seed));
                    (seed == 11 ? handsA : handsB).add(ordered(((Player) cp1.find(a.opp)).getCardsIn(ZoneType.Library))
                            + " / " + ordered(((Player) cp2.find(b.opp)).getCardsIn(ZoneType.Library)));
                }
            }, 300_000);
        } finally {
            System.setOut(realOut);
        }
        check(r1[0].equals(r1[1]), "one seed, one rebuilt spec");
        System.err.println("     fidelity: " + fid.get(0));
        System.err.println("     spec:\n       " + r1[0].replace("\n", "\n       "));
        final String[] ha = handsA.get(0).split(" / ");
        check(ha.length == 2 && ha[0].equals(ha[1]), "CRN: one round seed gives every option's copy the same opponent library, in order ("
                + handsA.get(0) + ")");
        check(!handsA.get(0).equals(handsB.get(0)), "another round seed, another deal");
        // 3. A real grade, under 20 playouts: two options, 5 rounds each, no racing, a short horizon.
        final Grader.Settings s = new Grader.Settings();
        s.race.target = f.i("playouts", 5);
        s.race.initial = s.race.target;
        s.race.race = false;
        s.horizon = f.i("horizon", 1);
        s.seed = 3;
        s.playoutTimeoutMs = 60_000;
        if ("attack".equals(type)) {
            s.only = splitTokens(f.s("only", "attack:none attack:21,22,26,32,34"));
        } else if (f.v.containsKey("only")) {
            s.only = splitTokens(f.v.get("only"));
        }
        final long t0 = System.nanoTime();
        final String line = gradeOne(cfg, logFile, frame, "live", type, k, s, 0);
        final long ms = (System.nanoTime() - t0) / 1_000_000L;
        System.out.println(line);
        final Map<?, ?> g = (Map<?, ?>) Json.parse(line);
        check("ok".equals(g.get("status")), "the grade ran (" + g.get("status") + " " + g.get("error") + ")");
        final Object[] opts = WireLog.arr(g, "options");
        long playouts = WireLog.num(g, "playouts", 0);
        check(opts.length >= 2 && playouts <= 20, opts.length + " options, " + playouts + " playouts (at most 20), " + ms + " ms");
        int withBest = 0;
        for (final Object o : opts) {
            final Map<?, ?> om = (Map<?, ?>) o;
            withBest += WireLog.bool(om, "best") ? 1 : 0;
            final Object wr = om.get("winRate");
            check(wr instanceof Number && ((Number) wr).doubleValue() >= 0 && ((Number) wr).doubleValue() <= 1,
                    om.get("token") + ": win rate " + wr + " [" + om.get("winLo") + ", " + om.get("winHi") + "], regret "
                    + om.get("regret") + " [" + om.get("regretLo") + ", " + om.get("regretHi") + "]");
        }
        check(withBest == 1, "exactly one best option");
        System.err.println("coach-grade selftest: " + checks + " check(s), " + failures + " failure(s)");
        return failures == 0 ? 0 : 1;
    }

    static String ordered(final Iterable<forge.game.card.Card> cs) {
        final List<String> l = new ArrayList<>();
        for (final forge.game.card.Card c : cs) {
            l.add(c.getName());
        }
        return String.join(",", l);
    }

    static String names(final Iterable<forge.game.card.Card> cs) {
        final List<String> l = new ArrayList<>();
        for (final forge.game.card.Card c : cs) {
            l.add(c.getName());
        }
        l.sort(null);
        return String.join(",", l);
    }
}
