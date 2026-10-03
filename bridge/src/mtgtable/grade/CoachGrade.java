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
 * {@code tools/coach-grade.sh}'s Java half (D334): grade one decision, or a
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
 *   knowledge: --deck D (the viewer's list; default the log header's deck path; its
 *                [Sideboard] is the rest of their drafted pool)  --own-pool P
 *              --opp-deck D | --opp-pool P (a list of cards, a .dck, or "N Name" lines)
 *              --opp-known "Name; 2 Name" | FILE (AI picks the player saw: drawn first)
 *              --opp-deck-public "<reason>" (live modes only: the opponent's list is shared)
 *   fit-scale  --logs DIR|FILE[,...] [--out var/coach-grade/leaf-scale.json] [--max-logs N]   (D349)
 *   settings:  --playouts N (rounds an option still in the race ends with; 200)
 *              --initial N (40) --batch N (20) --no-race --seed S (1)
 *              --horizon T (-1 = to the end; else turns past this one, then the leaf evaluator)
 *              --max-turns T (40) --timeout-ms MS (per playout, 120000) --max-playouts N
 *              --max-ms MS (per decision) --cap N (24) --lands --only tok,tok --extra tok,tok
 *              --leaf hand|eval:MODEL.json (with --horizon >= 0: the learned evaluator scores the leaf; D354)
 * </pre>
 *
 * <p>A moments line (ForgeCoach's {@code bench:coach -- moments}) is JSON with
 * {@code log}, {@code frame}, {@code mode}, {@code type}, and optionally
 * {@code id}, {@code label}, {@code extra} (tokens), {@code deck},
 * {@code oppDeck}, {@code oppPool}.  Each output line is {@link Grader#run}'s
 * object plus those fields.  A batch resumes: keys already in {@code --out}
 * are skipped.
 *
 * <p><b>Live analysis</b> (D336): {@code analyse} and {@code serve} grade the
 * current decision of a game in play with {@link #liveSettings} -- a
 * wall-clock budget ({@code --budget-ms}, default 3000; at least
 * {@code --min-rounds} 2 rounds whatever it says), playouts to the end of this
 * turn ({@code --horizon 0}) scored by the search's leaf evaluator
 * ({@code "measure": "leaf"}: a pseudo win rate, a logistic of the leaf
 * score, not a count of wins, at {@code SearchPolicy.LEAF_SCALE} leaf points
 * per logit as fitted by {@code fit-scale}, D349), racing from round 4.  The answer is the grade
 * object below plus {@code frame} and {@code wallMs}.
 *
 * <p><b>Hidden information in the live modes</b> (D348, {@link HiddenPool}):
 * {@code analyse} and {@code serve} refuse an opponent DECK list unless the
 * request marks it public with a reason ({@code --opp-deck-public "<reason>"};
 * {@code "oppDeckPublic": true, "oppDeckPublicReason": "..."}), refuse the
 * match launcher's AI file or the header's opponent deck as a "pool", and
 * refuse a pool under {@value HiddenPool#MIN_LIVE_POOL} cards; the default is
 * pool mode (the cube list minus the viewer's deck and drafted pool and every
 * public card, the AI picks the player saw first).  A refused request is
 * answered {@code "status": "refused"} with the reason.
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
            case "fit-scale":
                exit = fitScale(rest);
                break;
            case "review-plan":
                exit = reviewPlan(rest);
                break;
            case "review-select":
                exit = reviewSelect(rest);
                break;
            case "review-report":
                exit = reviewReport(rest);
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
                if (k.equals("no-race") || k.equals("lands") || k.equals("live")) {
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
     * The live analysis's defaults (D336): a time budget, not a playout count
     * (at least two rounds whatever it says); playouts to the end of this turn
     * scored by the search's leaf evaluator, its own choice for a 1.5 s think
     * (D312) -- a full game costs seconds a playout; racing from round 4, every
     * 2 (D349; D336 raced from round 6, where the 1/n floor retired nothing).
     */
    static Grader.Settings liveSettings(final Flags f) {
        final Flags g = new Flags(new String[0]);
        g.v.put("playouts", "10000");
        g.v.put("initial", "4");   // D349: with the leaf measure's t interval, racing retires at live round counts
        g.v.put("batch", "2");
        g.v.put("horizon", "0");
        g.v.put("cap", "12");
        g.v.put("timeout-ms", "5000");
        g.v.putAll(f.v);
        final Grader.Settings s = settings(g);
        s.budgetMs = g.l("budget-ms", 3000);
        s.race.minRounds = g.i("min-rounds", 2);
        if (!g.v.containsKey("leaf-scale")) {
            final File fitted = new File(Config.load().root(), FITTED_SCALE);
            if (fitted.isFile()) {
                leafScale(s, fitted.getPath());
            }
        }
        return s;
    }

    /** Where {@code fit-scale} writes its fit, and where the live modes look for one (D349). */
    static final String FITTED_SCALE = "var/coach-grade/leaf-scale.json";

    /** {@code --leaf-scale N} or {@code --leaf-scale FILE} (a {@code fit-scale} output): leaf points per logit. */
    static void leafScale(final Grader.Settings s, final String v) {
        if (v.matches("[0-9.]+")) {
            s.leafScale = Double.parseDouble(v);
            s.leafScaleSource = "flag";
        } else {
            try {
                final Map<?, ?> m = (Map<?, ?>) Json.parse(Files.readString(new File(v).toPath(), StandardCharsets.UTF_8));
                s.leafScale = ((Number) m.get("scale")).doubleValue();
                s.leafScaleSource = v + " (" + m.get("games") + " games, " + m.get("rows") + " positions)";
            } catch (final IOException | RuntimeException e) {
                throw new IllegalArgumentException("cannot read a leaf scale from " + v + ": " + e);
            }
        }
        if (!(s.leafScale > 0)) {
            throw new IllegalArgumentException("a leaf scale must be positive: " + s.leafScale);
        }
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
        s.race.minRounds = f.i("min-rounds", s.race.minRounds);
        s.maxOptions = f.i("max-options", 0);
        if (f.v.containsKey("leaf-scale")) {
            leafScale(s, f.v.get("leaf-scale"));
        }
        final String leaf = f.s("leaf", "hand");   // D354: hand | eval:<model.json> (the evaluator gates)
        if (!"hand".equals(leaf)) {
            if (!leaf.startsWith("eval:") || leaf.length() <= 5) {
                throw new IllegalArgumentException("--leaf is hand or eval:<model.json>: " + leaf);
            }
            s.leafEval = mtgtable.ai.SearchPolicy.evaluator(leaf.substring(5));
            s.leafEvalSource = leaf.substring(5);
        }
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
        final Flags f = new Flags(new String[0]);
        put(f, "deck", deck);
        put(f, "opp-deck", oppDeck);
        put(f, "opp-pool", oppPool);
        return knowledge(cfg.root(), log, f);
    }

    private static void put(final Flags f, final String k, final String v) {
        if (v != null) {
            f.v.put(k, v);
        }
    }

    /**
     * What the grader may know (D334; D348's pool mode): the viewer's deck
     * (default: the log header's path for the viewer's seat -- never another
     * seat's) and its sideboard as the rest of their pool, and the opponent's
     * deck, or a pool with the AI picks the player saw.  Reads files only.
     */
    static Rebuild.Knowledge knowledge(final File root, final WireLog log, final Flags f) throws IOException {
        final Rebuild.Knowledge k = new Rebuild.Knowledge();
        String own = f.s("deck", null);
        if (own == null) {
            for (final Object o : WireLog.arr(log.header, "decks")) {
                final Map<?, ?> d = (Map<?, ?>) o;
                if (WireLog.num(d, "player", -1) == log.seat && WireLog.str(d, "path") != null) {
                    own = WireLog.str(d, "path");
                }
            }
        }
        if (own != null) {
            final File of = HiddenPool.resolve(root, own);
            if (of.isFile()) {
                k.ownDeck = HiddenPool.readList(of, false);
                k.ownPool = HiddenPool.readList(of, true);
                k.ownSource = "deck:" + own;
            }
        }
        if (f.v.containsKey("own-pool")) {
            k.ownPool = HiddenPool.readList(HiddenPool.resolve(root, f.v.get("own-pool")), true);
        }
        final String oppDeck = f.s("opp-deck", null);
        final String oppPool = f.s("opp-pool", null);
        if (oppDeck != null) {
            k.oppDeck = HiddenPool.readList(HiddenPool.resolve(root, oppDeck), false);
            k.oppSource = "deck:" + oppDeck + (f.v.containsKey("opp-deck-public") ? " (public: " + f.v.get("opp-deck-public") + ")" : "");
        } else if (oppPool != null) {
            k.oppPool = HiddenPool.readList(HiddenPool.resolve(root, oppPool), false);
            k.oppSource = "pool:" + oppPool + " minus the viewer's deck and pool and every public card";
        }
        final String known = f.s("opp-known", null);
        if (known != null && !known.isBlank()) {
            final File kf = HiddenPool.resolve(root, known);
            k.oppKnown = kf.isFile() ? HiddenPool.readList(kf, true) : HiddenPool.parseNames(known);
            if (k.oppPool != null) {
                k.oppSource += "; " + HiddenPool.size(k.oppKnown) + " AI pick(s) the player saw drawn first";
            }
        }
        return k;
    }

    /**
     * The live modes' knowledge (D348): {@link HiddenPool#checkLive} first, so
     * a refused list is never even read, then {@link #knowledge}.
     */
    static Rebuild.Knowledge liveKnowledge(final File root, final WireLog log, final Flags f) throws IOException {
        HiddenPool.checkLive(f.v, log.header, log.seat, root);
        return knowledge(root, log, f);
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
        final Rebuild.Knowledge k = knowledge(cfg.root(), log, f);
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
        // --claim DIR (the review, D353): the JVMs take the next unclaimed moment instead of every K-th,
        // so one slow decision does not hold up the moments queued behind it.
        final File claim = f.v.containsKey("claim") ? new File(f.v.get("claim")) : null;
        if (claim != null) {
            claim.mkdirs();
        }
        // --guard live (the review, D353): every moment's knowledge passes D348's live guard.
        final boolean guarded = "live".equals(f.s("guard", ""));
        if (f.v.containsKey("guard") && !guarded) {
            throw new IllegalArgumentException("--guard takes live");
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
                if (claim == null ? idx % shards != shard : !claim(claim, idx)) {
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
                if (WireLog.str(mo, "played") != null) {
                    s.played = WireLog.str(mo, "played");   // the review's moments (D353)
                }
                if (WireLog.arr(mo, "only").length > 0) {
                    final List<String> only = new ArrayList<>();
                    for (final Object t : WireLog.arr(mo, "only")) {
                        only.add(String.valueOf(t));
                    }
                    s.only = only;   // a deepened decision plays its shortlist again (D353)
                }
                String line;
                final long t0 = System.nanoTime();
                try {
                    final File logFile = resolve(cfg, logPath);
                    final WireLog log = WireLog.read(logFile);
                    final Rebuild.Knowledge k = guarded
                            ? liveKnowledge(cfg.root(), log, guardFlags(f, mo))
                            : knowledge(cfg, log,
                            WireLog.str(mo, "deck") != null ? WireLog.str(mo, "deck") : f.s("deck", null),
                            WireLog.str(mo, "oppDeck") != null ? WireLog.str(mo, "oppDeck") : f.s("opp-deck", null),
                            WireLog.str(mo, "oppPool") != null ? WireLog.str(mo, "oppPool") : f.s("opp-pool", null));
                    line = gradeOne(cfg, logFile, frame, mode, type, k, s, f.l("max-ms", 0));
                } catch (final HiddenPool.Refused e) {
                    line = new Json.JsonOut().obj().n("v", 1).n("status", "refused").n("error", e.getMessage()).end().done();
                } catch (final Exception e) {
                    line = new Json.JsonOut().obj().n("v", 1).n("status", "error").n("error", String.valueOf(e)).end().done();
                }
                // The moment's own fields in front of the grade.
                final Json.JsonOut head = new Json.JsonOut().obj().n("momentKey", mkey).n("log", logPath).n("frame", frame)
                        .n("mode", mode).n("type", type).n("shard", shard);
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

    /** Claim moment {@code idx} for this JVM: true when no other JVM has (an atomic file create). */
    static boolean claim(final File dir, final int idx) throws IOException {
        return new File(dir, Integer.toString(idx)).createNewFile();
    }

    /**
     * A guarded batch moment's knowledge flags (D353): the run's own flags, a
     * moment's {@code deck} / {@code oppPool} over them -- and a moment's
     * {@code oppDeck} too, so the guard refuses it rather than it slipping past.
     */
    static Flags guardFlags(final Flags f, final Map<?, ?> mo) {
        final Flags g = new Flags(new String[0]);
        for (final String k : new String[] {"deck", "own-pool", "opp-deck", "opp-pool", "opp-known", "opp-deck-public"}) {
            if (f.v.containsKey(k)) {
                g.v.put(k, f.v.get(k));
            }
        }
        for (final String[] kf : new String[][] {{"deck", "deck"}, {"oppDeck", "opp-deck"}, {"oppPool", "opp-pool"}}) {
            if (WireLog.str(mo, kf[0]) != null) {
                g.v.put(kf[1], WireLog.str(mo, kf[0]));
            }
        }
        return g;
    }

    // ------------------------------------------------------------------
    // The post-game review (D353): the engine-free steps around two batches
    // ------------------------------------------------------------------

    /**
     * {@code review-plan --log F --seat N --out plan.jsonl [knowledge]}: the
     * log's graded decisions as moments lines.  Refuses a seat that is not the
     * log's own (the log is one seat's redacted view) and, before any grading,
     * knowledge the live guard refuses.  Prints {@code {"decisions": n, ...}}.
     */
    static int reviewPlan(final String[] argv) throws Exception {
        final Flags f = new Flags(argv);
        final String logPath = f.s("log", null);
        final String outPath = f.s("out", null);
        if (logPath == null || outPath == null || !f.v.containsKey("seat")) {
            throw new IllegalArgumentException("review-plan needs --log, --seat and --out");
        }
        final Config cfg = Config.load();
        final File logFile = resolve(cfg, logPath);
        final WireLog log = WireLog.read(logFile);
        final int seat = f.i("seat", -1);
        if (seat != log.seat) {
            System.out.println(new Json.JsonOut().obj().n("status", "refused").n("error", "this log is seat " + log.seat
                    + "'s view; a review of seat " + seat + " needs that seat's own log").end().done());
            return 3;
        }
        try {
            HiddenPool.checkLive(f.v, log.header, log.seat, cfg.root());
        } catch (final HiddenPool.Refused e) {
            System.out.println(new Json.JsonOut().obj().n("status", "refused").n("error", e.getMessage()).end().done());
            return 3;
        }
        final List<Review.Planned> plan = Review.plan(log);
        final File out = new File(outPath);
        if (out.getParentFile() != null) {
            out.getParentFile().mkdirs();
        }
        Files.write(out.toPath(), Review.momentLines(plan, logPath), StandardCharsets.UTF_8);
        final int jobs = f.i("jobs", 1);
        final long budget = Review.triageBudgetMs(plan.size(), jobs, f.l("triage-ms", 15_000),
                f.l("triage-min-ms", 1500), f.l("triage-max-ms", 6000));
        System.out.println(new Json.JsonOut().obj().n("status", "ok").n("decisions", plan.size())
                .n("jobs", Math.max(1, Math.min(jobs, plan.size()))).n("triageMsPerDecision", budget)
                .n("gameId", String.valueOf(WireLog.str(log.header, "gameId"))).n("frames", log.frames.size()).end().done());
        return 0;
    }

    static List<Map<?, ?>> readLines(final String path) throws IOException {
        final List<Map<?, ?>> out = new ArrayList<>();
        if (path == null || !new File(path).isFile()) {
            return out;
        }
        for (final String l : Files.readAllLines(new File(path).toPath(), StandardCharsets.UTF_8)) {
            if (!l.isBlank()) {
                out.add((Map<?, ?>) Json.parse(l));
            }
        }
        return out;
    }

    /**
     * {@code review-select --plan P --triage T --out deep.jsonl --k 6 --jobs 7 --deep-ms 150000
     * [--deep-horizon -1] [--full-min-ms 60000]}: the moments to grade again
     * ({@link Review#select}) and how ({@link Review#allocate}); prints the
     * allocation as JSON.
     */
    static int reviewSelect(final String[] argv) throws Exception {
        final Flags f = new Flags(argv);
        final List<Map<?, ?>> triage = readLines(f.s("triage", null));
        final List<Review.Pick> picks = Review.select(triage, f.i("k", 6));
        final Map<String, Map<?, ?>> byKey = new java.util.HashMap<>();
        for (final Map<?, ?> t : triage) {
            byKey.put(WireLog.str(t, "momentKey"), t);
        }
        final Set<String> keys = new HashSet<>();
        for (final Review.Pick p : picks) {
            keys.add(p.key);
        }
        final List<String> out = new ArrayList<>();
        for (final String l : Files.readAllLines(new File(f.s("plan", "")).toPath(), StandardCharsets.UTF_8)) {
            if (l.isBlank()) {
                continue;
            }
            final Map<?, ?> mo = (Map<?, ?>) Json.parse(l);
            final String key = WireLog.str(mo, "log") + "#live" + WireLog.num(mo, "frame", -1) + ":" + WireLog.str(mo, "type");
            if (keys.contains(key)) {
                final List<String> only = Review.deepOptions(byKey.get(key), f.i("deep-options", 5));
                final Json.JsonOut oj = new Json.JsonOut().arr();
                for (final String t : only) {
                    oj.v(t);
                }
                out.add(l.substring(0, l.lastIndexOf('}')) + ",\"only\":" + oj.end().done() + "}");
            }
        }
        Files.write(new File(f.s("out", "")).toPath(), out, StandardCharsets.UTF_8);
        final Review.Alloc a = Review.allocate(out.size(), f.i("jobs", 1), f.l("deep-ms", 150_000), f.i("deep-horizon", -1),
                f.l("full-min-ms", 60_000));
        final Json.JsonOut j = new Json.JsonOut().obj().n("k", out.size()).n("jobs", a.jobs).n("perJvm", a.perJvm)
                .n("msPerDecision", a.msPerDecision).n("horizon", a.horizon);
        j.key("picks").arr();
        for (final Review.Pick p : picks) {
            j.obj().n("key", p.key).n("reason", p.reason).end();
        }
        System.out.println(j.end().end().done());
        return 0;
    }

    /**
     * {@code review-report --log F --plan P --triage T [--deep D --picks S] --out R
     * [--config JSON] [--timing JSON] [--triage-jobs J --deep-jobs J]}: the one report
     * ({@link Review#report}).
     */
    static int reviewReport(final String[] argv) throws Exception {
        final Flags f = new Flags(argv);
        final Config cfg = Config.load();
        final String logPath = f.s("log", "");
        final WireLog log = WireLog.read(resolve(cfg, logPath));
        final List<Review.Planned> plan = new ArrayList<>();
        final List<String> order = new ArrayList<>();
        for (final Map<?, ?> mo : readLines(f.s("plan", null))) {
            final Review.Planned p = new Review.Planned();
            p.frame = (int) WireLog.num(mo, "frame", -1);
            p.stateFrame = (int) WireLog.num(mo, "stateFrame", -1);
            p.type = WireLog.str(mo, "type");
            p.played = WireLog.str(mo, "played");
            p.turn = WireLog.num(mo, "turn", 0);
            p.round = WireLog.num(mo, "round", 0);
            p.phase = WireLog.str(mo, "phase");
            plan.add(p);
            order.add(p.momentKey(logPath));
        }
        final List<Map<?, ?>> triage = readLines(f.s("triage", null));
        final List<Map<?, ?>> deep = readLines(f.s("deep", null));
        final List<Review.Pick> picks = new ArrayList<>();
        if (f.v.containsKey("picks")) {
            final Map<?, ?> sel = (Map<?, ?>) Json.parse(Files.readString(new File(f.s("picks", "")).toPath(), StandardCharsets.UTF_8));
            for (final Object o : WireLog.arr(sel, "picks")) {
                picks.add(new Review.Pick(WireLog.str((Map<?, ?>) o, "key"), WireLog.str((Map<?, ?>) o, "reason")));
            }
        }
        final List<String> deepOrder = new ArrayList<>();
        for (final String k : order) {
            for (final Review.Pick p : picks) {
                if (p.key.equals(k)) {
                    deepOrder.add(k);
                }
            }
        }
        final Review.Meta m = new Review.Meta();
        m.log = logPath;
        m.gameId = String.valueOf(WireLog.str(log.header, "gameId"));
        m.seat = log.seat;
        m.frames = log.frames.size();
        m.createdAt = java.time.Instant.now().truncatedTo(java.time.temporal.ChronoUnit.SECONDS).toString();
        m.config = f.s("config", "{}");
        String timing = f.s("timing", "{}").trim();
        final long tg = Review.gradeMs(triage, order, f.i("triage-jobs", 1));
        final long dg = Review.gradeMs(deep, deepOrder, f.i("deep-jobs", 1));
        timing = (timing.equals("{}") ? "{" : timing.substring(0, timing.length() - 1) + ",")
                + "\"triageGradeMs\":" + tg + ",\"deepGradeMs\":" + dg + "}";
        m.timing = timing;
        Json.parse(m.config);   // both must be JSON objects
        Json.parse(m.timing);
        final String report = Review.report(m, plan, triage, deep, picks);
        final File out = new File(f.s("out", ""));
        if (out.getParentFile() != null) {
            out.getParentFile().mkdirs();
        }
        Files.writeString(out.toPath(), report + "\n", StandardCharsets.UTF_8);
        final Map<?, ?> sum = WireLog.map((Map<?, ?>) Json.parse(report), "summary");
        System.out.println("review: " + WireLog.num(sum, "decisions", 0) + " decision(s), " + WireLog.num(sum, "graded", 0)
                + " graded, " + WireLog.num(sum, "mistakes", 0) + " mistake(s), " + WireLog.num(sum, "closeCalls", 0)
                + " close call(s), " + WireLog.num(sum, "deepened", 0) + " deepened -> " + out);
        return 0;
    }

    // ------------------------------------------------------------------
    // Live analysis (D336): one decision now, inside a time budget
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
        final Rebuild.Knowledge k;
        try {
            k = liveKnowledge(cfg.root(), log, f);
        } catch (final HiddenPool.Refused e) {
            return new Json.JsonOut().obj().n("v", 1).n("status", "refused").n("error", e.getMessage()).n("frame", frame).end().done();
        }
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
                    {"horizon", "horizon"}, {"seed", "seed"}, {"only", "only"}, {"minRounds", "min-rounds"},
                    {"ownPool", "own-pool"}, {"leafScale", "leaf-scale"}, {"leaf", "leaf"}}) {
                    if (req.get(kf[0]) != null) {
                        f.v.put(kf[1], String.valueOf(req.get(kf[0])));
                    }
                }
                serveKnowledge(req, f);
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

    /**
     * A serve request's D348 knowledge fields onto flags: {@code oppKnown} (an
     * array of names or one string), {@code oppDeckPublic} with
     * {@code oppDeckPublicReason}.  A request's flags replace the defaults'
     * knowledge entirely, so a server started with a public list cannot lend it
     * to a request that did not say so.
     */
    static void serveKnowledge(final Map<?, ?> req, final Flags f) {
        final Object known = req.get("oppKnown");
        if (known instanceof Object[] || known instanceof List) {
            final List<String> names = new ArrayList<>();
            for (final Object o : known instanceof Object[] ? Arrays.asList((Object[]) known) : (List<?>) known) {
                names.add(String.valueOf(o));
            }
            f.v.put("opp-known", String.join(";", names));
        } else if (known != null) {
            f.v.put("opp-known", String.valueOf(known));
        }
        if (Boolean.TRUE.equals(req.get("oppDeckPublic"))) {
            final Object why = req.get("oppDeckPublicReason");
            f.v.put("opp-deck-public", why == null ? "true" : String.valueOf(why));
        } else {
            f.v.remove("opp-deck-public");
        }
    }

    // ------------------------------------------------------------------
    // fit-scale (D349): the leaf -> P(win) scale, fitted on recorded games
    // ------------------------------------------------------------------

    /**
     * {@code fit-scale --logs DIR|FILE[,...] [--out FILE] [--bootstrap 200] [--max-logs N]}:
     * every recorded game under the paths (frame logs, {@code .jsonl} or
     * {@code .jsonl.gz}, one seat's view each, ending in {@code over} with a
     * winner) gives one position per turn -- the last state of the turn, where a
     * live analysis's playouts stop ({@code --horizon 0}) -- rebuilt from that
     * seat's redacted view and scored with {@code SearchPolicy.leaf}.  The fit is
     * {@code P(the viewer wins) = σ(leaf / scale)} by maximum likelihood (no
     * intercept: the leaf is antisymmetric), with a percentile bootstrap over
     * games; the two-parameter fit, the log-loss at 400 and at the fit, and a
     * reliability table are reported beside it.  No game is played.
     */
    static int fitScale(final String[] argv) throws Exception {
        final Flags f = new Flags(argv);
        final List<File> logs = new ArrayList<>();
        for (final String p : f.s("logs", "").split(",")) {
            if (!p.isBlank()) {
                collectLogs(new File(p.trim()), logs);
            }
        }
        logs.sort(null);
        final int maxLogs = f.i("max-logs", Integer.MAX_VALUE);
        if (logs.size() > maxLogs) {
            // An evenly spaced, deterministic subset (logs are sorted by path, so both seats of a game stay together mostly).
            final List<File> sub = new ArrayList<>();
            for (int i = 0; i < maxLogs; i++) {
                sub.add(logs.get((int) ((long) i * logs.size() / maxLogs)));
            }
            System.err.println("[coach-grade] fit-scale: " + logs.size() + " logs found, " + maxLogs + " used (--max-logs)");
            logs.clear();
            logs.addAll(sub);
        }
        if (logs.isEmpty()) {
            throw new IllegalArgumentException("fit-scale needs --logs DIR|FILE[,...] holding recorded games");
        }
        boot();
        final Config cfg = Config.load();
        final List<double[]> rows = new ArrayList<>();   // {leaf, won, gameIndex}
        final List<String> games = new ArrayList<>();
        final int[] skipped = new int[3];   // no winner, rebuild failures, unreadable
        final ByteArrayOutputStream noise = new ByteArrayOutputStream();
        realOut = System.out;
        System.setOut(new PrintStream(noise, true, "UTF-8"));
        try {
            onGameThread(() -> {
                for (final File lf : logs) {
                    final WireLog log;
                    try {
                        log = WireLog.read(lf);
                    } catch (final IOException | RuntimeException e) {
                        skipped[2]++;
                        continue;
                    }
                    final Map<?, ?> over = lastOf(log, "over");
                    if (over == null || !(((Map<?, ?>) over.get("body")).get("winner") instanceof Number)) {
                        skipped[0]++;
                        continue;
                    }
                    final double won = WireLog.num((Map<?, ?>) over.get("body"), "winner", -1) == log.seat ? 1 : 0;
                    final String game = String.valueOf(WireLog.str(log.header, "gameId")) + "|"
                            + WireLog.num(log.header, "seed", 0) + "|" + lf.getParentFile();
                    int g = games.indexOf(game);
                    if (g < 0) {
                        games.add(game);
                        g = games.size() - 1;
                    }
                    final Rebuild.Knowledge k;
                    try {
                        k = knowledge(cfg.root(), log, new Flags(new String[0]));
                    } catch (final IOException e) {
                        skipped[2]++;
                        continue;
                    }
                    for (final int frame : turnEnds(log)) {
                        try {
                            final Rebuild rb = new Rebuild(log, log.review(frame), k);
                            final Rebuild.Base b = rb.build(GradeMath.mix(frame), new Rebuild.Tweaks());
                            rows.add(new double[] {mtgtable.ai.SearchPolicy.leaf(b.game, b.viewer), won, g});
                        } catch (final RuntimeException | StackOverflowError e) {
                            skipped[1]++;
                        }
                    }
                }
            }, 6L * 3600 * 1000);
        } finally {
            System.setOut(realOut);
        }
        final String json = fitReport(rows, games.size(), logs.size(), skipped, f.i("bootstrap", 200), f.s("logs", ""));
        final File out = new File(f.s("out", new File(cfg.root(), FITTED_SCALE).getPath()));
        if (out.getParentFile() != null) {
            out.getParentFile().mkdirs();
        }
        Files.writeString(out.toPath(), json + "\n", StandardCharsets.UTF_8);
        System.out.println(json);
        System.err.println("[coach-grade] fit-scale -> " + out);
        return rows.isEmpty() ? 1 : 0;
    }

    static void collectLogs(final File f, final List<File> out) {
        if (f.isDirectory()) {
            final File[] kids = f.listFiles();
            if (kids != null) {
                for (final File k : kids) {
                    collectLogs(k, out);
                }
            }
        } else if (f.isFile() && (f.getName().endsWith(".jsonl") || f.getName().endsWith(".jsonl.gz"))) {
            out.add(f);
        }
    }

    static Map<?, ?> lastOf(final WireLog log, final String type) {
        for (int i = log.frames.size() - 1; i >= 0; i--) {
            if (type.equals(log.frames.get(i).get("type"))) {
                return log.frames.get(i);
            }
        }
        return null;
    }

    /** The index of each turn's last state frame (before the game was over). */
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
        return out;   // the final turn's end is the game's end: left out
    }

    /** The fit, its bootstrap over games and its reliability table, as one JSON object. Pure; the self-test runs it. */
    static String fitReport(final List<double[]> rows, final int nGames, final int nLogs, final int[] skipped, final int boots,
                            final String source) {
        final int n = rows.size();
        final double[] x = new double[n];
        final double[] y = new double[n];
        for (int i = 0; i < n; i++) {
            x[i] = rows.get(i)[0];
            y[i] = rows.get(i)[1];
        }
        final Json.JsonOut j = new Json.JsonOut().obj().n("v", 1).n("what", "P(viewer wins) = sigmoid(leaf / scale), end-of-turn positions")
                .n("source", source).n("logs", nLogs).n("games", nGames).n("rows", n)
                .n("skippedNoWinner", skipped[0]).n("skippedRebuild", skipped[1]).n("skippedUnreadable", skipped[2]);
        if (n < 2) {
            return j.n("scale", mtgtable.ai.SearchPolicy.LEAF_SCALE).n("fitted", false).end().done();
        }
        final double b = GradeMath.fitSlope(x, y);
        final double[] ab = GradeMath.fitLogistic(x, y);
        // Percentile bootstrap over games (a game's positions -- both seats' -- move together).
        final Random rnd = new Random(20261003);
        final List<List<Integer>> byGame = new ArrayList<>();
        for (int g = 0; g < nGames; g++) {
            byGame.add(new ArrayList<>());
        }
        for (int i = 0; i < n; i++) {
            byGame.get((int) rows.get(i)[2]).add(i);
        }
        byGame.removeIf(List::isEmpty);
        final double[] scales = new double[boots];
        for (int r = 0; r < boots; r++) {
            final List<Integer> idx = new ArrayList<>();
            for (int g = 0; g < byGame.size(); g++) {
                idx.addAll(byGame.get(rnd.nextInt(byGame.size())));
            }
            final double[] bx = new double[idx.size()];
            final double[] by = new double[idx.size()];
            for (int i = 0; i < idx.size(); i++) {
                bx[i] = x[idx.get(i)];
                by[i] = y[idx.get(i)];
            }
            scales[r] = 1 / GradeMath.fitSlope(bx, by);
        }
        Arrays.sort(scales);
        final double lo = boots > 0 ? scales[(int) Math.floor(0.025 * (boots - 1))] : Double.NaN;
        final double hi = boots > 0 ? scales[(int) Math.ceil(0.975 * (boots - 1))] : Double.NaN;
        j.n("scale", Math.round(1 / b * 10) / 10.0).n("scaleLo", lo).n("scaleHi", hi).n("fitted", true)
                .n("bootstrap", boots).n("interceptFit", true).n("a", ab[0]).n("b", ab[1])
                .n("logLossFitted", GradeMath.logLoss(x, y, 0, b)).n("logLoss400", GradeMath.logLoss(x, y, 0, 1.0 / 400))
                .n("logLossConstant", GradeMath.logLoss(x, y, 0, 0))
                .n("brierFitted", brier(x, y, b)).n("brier400", brier(x, y, 1.0 / 400));
        j.key("reliability").arr();
        final double[] edges = {0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0001};
        for (int e = 0; e + 1 < edges.length; e++) {
            int c = 0;
            double sp = 0;
            double sy = 0;
            for (int i = 0; i < n; i++) {
                final double p = GradeMath.sigmoid(b * x[i]);
                if (p >= edges[e] && p < edges[e + 1]) {
                    c++;
                    sp += p;
                    sy += y[i];
                }
            }
            if (c > 0) {
                j.obj().n("lo", edges[e]).n("hi", Math.min(1, edges[e + 1])).n("n", c).n("predicted", sp / c)
                        .n("observed", sy / c).end();
            }
        }
        j.end();
        return j.end().done();
    }

    private static double brier(final double[] x, final double[] y, final double b) {
        double s = 0;
        for (int i = 0; i < x.length; i++) {
            s += Math.pow(GradeMath.sigmoid(b * x[i]) - y[i], 2);
        }
        return s / x.length;
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
        final Rebuild.Knowledge k = knowledge(cfg, log, f.s("deck", null), f.s("opp-deck", "decks/morph-probe.dck"), null);   // review, not live
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
