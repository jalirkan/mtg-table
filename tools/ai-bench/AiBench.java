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
package mtgtable.bench;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.PrintStream;
import java.io.RandomAccessFile;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.TreeMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import forge.ai.AIOption;
import forge.ai.ComputerUtilCard;
import forge.deck.CardPool;
import forge.deck.Deck;
import forge.deck.io.DeckSerializer;
import forge.game.Game;
import forge.game.GameEndReason;
import forge.game.GameOutcome;
import forge.game.GameRules;
import forge.game.GameState;
import forge.game.GameType;
import forge.game.Match;
import forge.game.card.Card;
import forge.game.player.Player;
import forge.game.player.RegisteredPlayer;
import forge.game.zone.ZoneType;
import forge.item.PaperCard;
import forge.model.FModel;
import forge.util.MyRandom;
import mtgtable.Bootstrap;
import mtgtable.Config;
import mtgtable.Json;
import mtgtable.SeatRecorder;
import mtgtable.ai.OutletPolicy;
import mtgtable.ai.PolicyControllerAi;
import mtgtable.ai.PolicyLobbyPlayerAi;
import mtgtable.ai.Determinizer;
import mtgtable.ai.LenientGameCopier;
import mtgtable.ai.SearchConfig;

/**
 * The Java half of {@code tools/ai-bench.sh} (D309): Forge AI against Forge AI
 * on fixed decks, many games, one JSON line per game; and the report over those
 * lines.  A measuring tool beside the game, like {@code tools/audit-deck/}: it
 * opens no socket, emits no protocol, records no frame log unless asked
 * ({@code --record-all}, {@link BenchRecording}, D347), and boots Forge
 * exactly as every mtg-table process does ({@link Bootstrap}).  Every AI seat is
 * {@link Bootstrap#createAiSeat}.
 *
 * <pre>
 *   play     --pairs FILE --a CFG --b CFG [--games N] [--seed S] [--shard I/K]
 *            [--timeout SEC] [--mirror] --out FILE.jsonl [--done FILE.jsonl ...]
 *   report   FILE.jsonl ... [--by-pair]
 *   paired   --control FILE.jsonl ... --treatment FILE.jsonl ...
 *   selftest [--no-engine]
 * </pre>
 *
 * <p>A CFG is {@code <Profile>[+sim|+hybrid][+outlets|+shadow]}: an {@code .ai}
 * profile from {@code res/ai/}, Forge's simulation option (a lobby-player option,
 * {@code AIOption}, not a profile key -- docs/research/ai-architecture.md), and
 * the outlet policy's mode (D310; plain = off, {@code +shadow} = counted but not
 * acted on).
 *
 * <p>Game {@code g} of a pair: config A plays the pair's first deck when g is
 * even and its second when odd; A sits in seat 0 when {@code (g/2)} is even.  So
 * every four games of a pair are each deck on each side of each seat, and a
 * profile comparison is never a deck comparison.  The seed of game g is a pure
 * function of {@code --seed}, the pair and g ({@code MyRandom}); Forge's AI also
 * reads the wall clock (its 5 s evaluation timeout), so a rerun is the same deal
 * of the same decks, not always the same game.
 *
 * <p>{@code --mirror} (the AI ladder's hook, D318) changes only the seed: games
 * 4k and 4k+3 share one, and 4k+1 and 4k+2 another.  Those two games put the
 * same deck in the same seat and swap only which config controls it, so each
 * deal is played once from each side ({@link #gameSeed}).  Without the flag the
 * seeds are what they always were.
 *
 * <p>{@code play} RESUMES (D337): a game already in {@code --out}, or in any
 * {@code --done} file (the run's other shards, so a run restarted with another
 * {@code --jobs} also skips them), with the same pair, game, seed, configs and
 * decks is not played again, and a torn last line in {@code --out} (a JVM killed
 * mid-write) is cut off first.  A game there with the same pair and game number
 * but another seed, config or deck refuses the run: it is a different
 * experiment, and the folder wants a new {@code --run}.
 *
 * <p>The lab runner's control file (tools/runner/control.ts): with
 * {@code LAB_CONTROL} set, {@code play} reads it before every game; while
 * {@code paused} it holds, and when {@code maxWorkers} is at or below this
 * JVM's slot ({@code LAB_SLOT}, default the shard index) it exits
 * {@value #EXIT_PARKED} after the game in hand so tools/ai-bench.sh can start it
 * again later.  Unset, nothing changes.
 */
public final class AiBench {

    /** The exit code of a shard let go by the control file's maxWorkers. */
    static final int EXIT_PARKED = 75;

    private AiBench() { }

    public static void main(final String[] args) {
        int exit;
        try {
            if (args.length == 0) {
                throw new IllegalArgumentException("usage: AiBench play|report|selftest ...");
            }
            final String[] rest = Arrays.copyOfRange(args, 1, args.length);
            switch (args[0]) {
            case "play":
                exit = play(rest);
                break;
            case "report":
                exit = report(rest);
                break;
            case "selftest":
                exit = selftest(rest);
                break;
            case "paired":
                exit = paired(rest);
                break;
            default:
                throw new IllegalArgumentException("unknown mode " + args[0]);
            }
        } catch (final Throwable t) {
            System.err.println("AI-BENCH FAILED: " + t);
            t.printStackTrace();
            exit = 2;
        }
        System.out.flush();
        System.err.flush();
        System.exit(exit);    // Forge leaves non-daemon pools behind
    }

    // ==================================================================
    // Seat configurations
    // ==================================================================

    static final class Cfg {
        final String text;
        final String profile;
        final AIOption sim;
        final PolicyLobbyPlayerAi.Outlets outlets;
        final SearchConfig search;

        Cfg(final String text) {
            this.text = text;
            final String[] parts = text.split("\\+");
            profile = parts[0];
            AIOption s = null;
            PolicyLobbyPlayerAi.Outlets o = PolicyLobbyPlayerAi.Outlets.OFF;
            SearchConfig sc = null;
            for (int i = 1; i < parts.length; i++) {
                if (parts[i].equals("search") || parts[i].startsWith("search:")) {
                    // +search or +search:ms=1000,what=pa (D312; SearchConfig's keys)
                    sc = SearchConfig.parse(parts[i].length() > 7 ? parts[i].substring(7) : "");
                    continue;
                }
                switch (parts[i]) {
                case "sim":
                    s = AIOption.USE_FULL_SIMULATION;
                    break;
                case "hybrid":
                    s = AIOption.USE_HYBRID_SIMULATION;
                    break;
                case "outlets":
                    o = PolicyLobbyPlayerAi.Outlets.ON;
                    break;
                case "shadow":
                    o = PolicyLobbyPlayerAi.Outlets.SHADOW;
                    break;
                default:
                    throw new IllegalArgumentException("unknown seat option +" + parts[i] + " in " + text
                            + " (want +sim, +hybrid, +outlets, +shadow or +search[:k=v,...])");
                }
            }
            sim = s;
            outlets = o;
            search = sc;
        }
    }

    // ==================================================================
    // play
    // ==================================================================

    static int play(final String[] argv) throws Exception {
        File pairsFile = null;
        File out = null;
        Cfg a = null;
        Cfg b = null;
        int games = 20;
        long seed = 1;
        int shard = 0;
        int shards = 1;
        int timeoutSec = 300;
        boolean mirror = false;
        final List<File> doneFiles = new ArrayList<>();
        for (int i = 0; i < argv.length; i++) {
            switch (argv[i]) {
            case "--mirror": mirror = true; break;
            case "--done": doneFiles.add(new File(argv[++i])); break;
            case "--pairs": pairsFile = new File(argv[++i]); break;
            case "--out": out = new File(argv[++i]); break;
            case "--a": a = new Cfg(argv[++i]); break;
            case "--b": b = new Cfg(argv[++i]); break;
            case "--games": games = Integer.parseInt(argv[++i]); break;
            case "--seed": seed = Long.parseLong(argv[++i]); break;
            case "--timeout": timeoutSec = Integer.parseInt(argv[++i]); break;
            case "--shard": {
                final String[] p = argv[++i].split("/");
                shard = Integer.parseInt(p[0]);
                shards = Integer.parseInt(p[1]);
                break;
            }
            // D347: record the games played, both seats (BenchRecording).
            case "--record-all": BenchRecording.configure(1, argv); break;
            case "--record-every": BenchRecording.configure(Integer.parseInt(argv[++i]), argv); break;
            case "--record-dir": BenchRecording.dir = new File(argv[++i]); break;
            default: throw new IllegalArgumentException("unknown flag " + argv[i]);
            }
        }
        if (pairsFile == null || out == null || a == null || b == null) {
            throw new IllegalArgumentException("play needs --pairs, --out, --a and --b");
        }
        final List<String[]> pairs = readPairs(pairsFile);
        final Done done = readDone(out, doneFiles);
        final String control = System.getenv("LAB_CONTROL");
        final int slot = parseSlot(System.getenv("LAB_SLOT"), shard);

        final Config cfg = Config.load();
        Bootstrap.installGui(cfg.forgeHomeDir());           // hard rule 1: the FIRST Forge call
        final long initMs = Bootstrap.initializeModel(false);
        System.out.println("[ai-bench] FModel.initialize " + initMs + " ms; shard " + shard + "/" + shards
                + "; " + pairs.size() + " pair(s) x " + games + " game(s); A=" + a.text + " B=" + b.text);
        if (!done.sig.isEmpty() || done.torn > 0) {
            System.out.println("[ai-bench] resuming: " + done.sig.size() + " game(s) already played"
                    + (done.torn > 0 ? "; a torn last line was cut off" : ""));
        }
        final Map<String, Deck> decks = new LinkedHashMap<>();
        for (final String[] p : pairs) {
            for (int k = 0; k < 2; k++) {
                if (!decks.containsKey(p[k])) {
                    decks.put(p[k], DeckSerializer.fromFile(new File(p[k])));   // hard rule 4
                }
            }
        }

        final PrintStream realOut = System.out;
        out.getParentFile().mkdirs();
        int skipped = 0;
        try (Writer w = new OutputStreamWriter(new FileOutputStream(out, true), StandardCharsets.UTF_8)) {
            int idx = -1;
            for (int pi = 0; pi < pairs.size(); pi++) {
                for (int g = 0; g < games; g++) {
                    idx++;
                    if (idx % shards != shard) {
                        continue;
                    }
                    final String[] pair = pairs.get(pi);
                    final boolean aFirstDeck = g % 2 == 0;
                    final boolean aSeat0 = (g / 2) % 2 == 0;
                    final long gameSeed = gameSeed(seed, pi, g, mirror);
                    final String have = done.sig.get(pi + "/" + g);
                    if (have != null) {
                        final String want = sig(gameSeed, a.text, b.text, aFirstDeck ? pair[0] : pair[1], aFirstDeck ? pair[1] : pair[0]);
                        if (!have.equals(want)) {
                            throw new IllegalArgumentException("the run folder already holds pair " + pi + " game " + g
                                    + " of another configuration (" + have + ", this run wants " + want + ") -- use a new --run");
                        }
                        skipped++;
                        continue;
                    }
                    if (awaitTurn(control, slot, realOut, 2000) == EXIT_PARKED) {
                        realOut.println("[ai-bench] parked: the control file's maxWorkers is at or below slot " + slot
                                + " (" + skipped + " game(s) skipped as already played)");
                        return EXIT_PARKED;
                    }
                    final ByteArrayOutputStream noise = new ByteArrayOutputStream();
                    System.setOut(new PrintStream(noise, true, "UTF-8"));   // Forge prints a lot during a game
                    String line;
                    try {
                        line = oneGame(pi, g, gameSeed, pair, decks, a, b, aFirstDeck, aSeat0, timeoutSec, noise);
                    } finally {
                        System.setOut(realOut);
                    }
                    w.write(line);
                    w.write('\n');
                    w.flush();
                    realOut.println(line.length() > 240 ? line.substring(0, 240) + "..." : line);
                }
            }
        }
        if (skipped > 0) {
            realOut.println("[ai-bench] " + skipped + " game(s) skipped as already played");
        }
        return 0;
    }

    /** The games a resumed shard already has: "pair/game" to its {@link #sig}; how many torn bytes were cut. */
    static final class Done {
        final Map<String, String> sig = new HashMap<>();
        int torn;
    }

    static String sig(final long seed, final String a, final String b, final String aDeck, final String bDeck) {
        return "seed " + seed + ", " + a + " vs " + b + ", " + aDeck + " / " + bDeck;
    }

    /**
     * Read what is already played: {@code own} (this shard's --out; a torn last
     * line is truncated away, on disk) and {@code others} (read only, complete
     * lines only -- another shard may be writing its last one right now).
     */
    @SuppressWarnings("unchecked")
    static Done readDone(final File own, final List<File> others) throws IOException {
        final Done d = new Done();
        final List<File> all = new ArrayList<>();
        all.add(own);
        all.addAll(others);
        for (final File f : all) {
            if (f == null || !f.isFile() || (f != own && f.getCanonicalFile().equals(own.getCanonicalFile()))) {
                continue;
            }
            final byte[] bytes = Files.readAllBytes(f.toPath());
            int end = bytes.length;
            while (end > 0 && bytes[end - 1] != '\n') {
                end--;
            }
            if (end < bytes.length && f == own) {
                try (RandomAccessFile raf = new RandomAccessFile(f, "rw")) {
                    raf.setLength(end);
                }
                d.torn += bytes.length - end;
            }
            int lineNo = 0;
            for (final String l : new String(bytes, 0, end, StandardCharsets.UTF_8).split("\n")) {
                lineNo++;
                if (l.isBlank()) {
                    continue;
                }
                final Map<String, Object> m;
                try {
                    m = (Map<String, Object>) Json.parse(l);
                } catch (final RuntimeException e) {
                    throw new IOException(f + " line " + lineNo + " is not a game line: " + e.getMessage());
                }
                final String key = m.get("pair") + "/" + m.get("game");
                final String s = sig(((Number) m.get("seed")).longValue(), String.valueOf(m.get("a")), String.valueOf(m.get("b")),
                        String.valueOf(m.get("aDeck")), String.valueOf(m.get("bDeck")));
                final String prev = d.sig.putIfAbsent(key, s);
                if (prev != null && !prev.equals(s)) {
                    throw new IOException("pair/game " + key + " appears twice with different settings in the run folder");
                }
            }
        }
        return d;
    }

    static int parseSlot(final String env, final int dflt) {
        if (env == null || env.isBlank()) {
            return dflt;
        }
        try {
            return Integer.parseInt(env.trim());
        } catch (final NumberFormatException e) {
            return dflt;
        }
    }

    /** The control file as a map; empty when absent or unreadable (= no control). */
    @SuppressWarnings("unchecked")
    static Map<String, Object> readControl(final String path) {
        try {
            final Object o = Json.parse(new String(Files.readAllBytes(new File(path).toPath()), StandardCharsets.UTF_8));
            return o instanceof Map ? (Map<String, Object>) o : Map.of();
        } catch (final IOException | RuntimeException e) {
            return Map.of();
        }
    }

    /**
     * Before a game: 0 to play it, {@link #EXIT_PARKED} when maxWorkers is at or
     * below {@code slot}; holds (polling every {@code pollMs}) while paused.
     */
    static int awaitTurn(final String control, final int slot, final PrintStream log, final long pollMs) throws InterruptedException {
        if (control == null || control.isEmpty()) {
            return 0;
        }
        boolean said = false;
        for (;;) {
            final Map<String, Object> c = readControl(control);
            final Object mw = c.get("maxWorkers");
            if (mw instanceof Number && slot >= Math.max(1, ((Number) mw).intValue())) {
                return EXIT_PARKED;
            }
            if (!Boolean.TRUE.equals(c.get("paused"))) {
                if (said) {
                    log.println("[ai-bench] resumed");
                }
                return 0;
            }
            if (!said) {
                log.println("[ai-bench] paused by the control file; the next game waits");
                said = true;
            }
            Thread.sleep(pollMs);
        }
    }

    /**
     * The seed of game g of pair pi.  With {@code mirror}, games 4k and 4k+3 (and
     * 4k+1 and 4k+2) share a seed: the same deck in the same seat, the configs
     * swapped (D318).  The shared value is the lower game's own seed, so the first
     * game of each mirrored pair keeps the seed a plain run would give it.
     */
    static long gameSeed(final long seed, final int pi, final int g, final boolean mirror) {
        int k = g;
        if (mirror) {
            final int r = g % 4;
            k = g - r + (r == 3 ? 0 : r == 2 ? 1 : r);
        }
        return seed * 1_000_003L + pi * 10_007L + k;
    }

    static List<String[]> readPairs(final File f) throws IOException {
        final List<String[]> out = new ArrayList<>();
        for (final String raw : Files.readAllLines(f.toPath(), StandardCharsets.UTF_8)) {
            final String l = raw.trim();
            if (l.isEmpty() || l.startsWith("#")) {
                continue;
            }
            final String[] p = l.split("\\s+");
            if (p.length < 2) {
                throw new IllegalArgumentException("a pair line needs two .dck paths: " + l);
            }
            out.add(new String[] {p[0], p[1]});
        }
        return out;
    }

    static String oneGame(final int pi, final int g, final long gameSeed, final String[] pair,
                          final Map<String, Deck> decks, final Cfg a, final Cfg b,
                          final boolean aFirstDeck, final boolean aSeat0, final int timeoutSec,
                          final ByteArrayOutputStream noise) throws Exception {
        MyRandom.setRandom(new Random(gameSeed));
        final String aDeckPath = aFirstDeck ? pair[0] : pair[1];
        final String bDeckPath = aFirstDeck ? pair[1] : pair[0];
        final PolicyLobbyPlayerAi la = Bootstrap.createAiSeat("A", aSeat0 ? 0 : 1, a.profile, a.sim, a.outlets, a.search);
        final PolicyLobbyPlayerAi lb = Bootstrap.createAiSeat("B", aSeat0 ? 1 : 0, b.profile, b.sim, b.outlets, b.search);
        final RegisteredPlayer ra = new RegisteredPlayer(decks.get(aDeckPath));
        ra.setPlayer(la);
        final RegisteredPlayer rb = new RegisteredPlayer(decks.get(bDeckPath));
        rb.setPlayer(lb);
        final GameRules rules = new GameRules(GameType.Constructed);
        rules.setAppliedVariants(EnumSet.of(GameType.Constructed));
        rules.setGamesPerMatch(1);
        final Match match = new Match(rules, aSeat0 ? List.of(ra, rb) : List.of(rb, ra), "ai-bench");
        final Game game = match.createGame();
        final BenchRecording rec = BenchRecording.start(game, pi, g, gameSeed, a, b, aSeat0, aDeckPath, bDeckPath,
                decks);
        final CountDownLatch done = new CountDownLatch(1);
        final Throwable[] fail = new Throwable[1];
        final long t0 = System.nanoTime();
        final long cpu0 = BenchRecording.processCpuNanos();
        // Forge's own "Game" pool, exactly as RecordMatch starts a game; one game
        // at a time in this process, so nothing else runs on that pool (D309).
        game.getAction().invoke(() -> {
            try {
                match.startGame(game);
                if (rec != null) {
                    rec.finish();   // still the game thread, as RecordMatch and the cube lab finish theirs
                }
            } catch (final Throwable t) {
                fail[0] = t;
                if (rec != null) {
                    rec.crashed();
                }
            } finally {
                done.countDown();
            }
        });
        boolean timeout = false;
        if (!done.await(timeoutSec, TimeUnit.SECONDS)) {
            timeout = true;
            game.setGameOver(GameEndReason.Draw);
            done.await(30, TimeUnit.SECONDS);
        }
        final long ms = (System.nanoTime() - t0) / 1_000_000L;
        final GameOutcome o = game.getOutcome();
        String winner = "draw";
        if (o != null && !o.isDraw() && o.getWinningLobbyPlayer() != null) {
            winner = o.getWinningLobbyPlayer().getName();
        }
        final String noiseText = noise.toString(StandardCharsets.UTF_8);
        final Json.JsonOut j = new Json.JsonOut().obj()
                .n("pair", pi).n("game", g).n("seed", gameSeed)
                .n("a", a.text).n("b", b.text)
                .n("aDeck", aDeckPath).n("bDeck", bDeckPath)
                .n("focusDeck", pair[0])
                .n("aSeat", aSeat0 ? 0 : 1)
                .n("winner", winner)
                .n("focusWon", winner.equals("draw") ? "draw"
                        : (winner.equals("A") == aFirstDeck) ? "yes" : "no")
                .n("reason", o == null ? "none" : String.valueOf(o.getWinCondition()))
                .n("turns", o == null ? game.getPhaseHandler().getTurn() : o.getLastTurnNumber())
                .n("ms", ms)
                .n("timeout", timeout)
                .n("error", fail[0] == null ? "" : describe(fail[0]))
                .n("aiEvalTimeouts", count(noiseText, "AI eval thread at timeout"));
        seatStats(j, "aStats", la, game);
        seatStats(j, "bStats", lb, game);
        j.n("cpuMs", (BenchRecording.processCpuNanos() - cpu0) / 1_000_000L);
        if (rec != null) {
            rec.close(j);
        }
        return j.end().done();
    }

    /** The exception and its first eight frames: enough to say where Forge failed. */
    static String describe(final Throwable t) {
        final StringBuilder sb = new StringBuilder(String.valueOf(t));
        final StackTraceElement[] st = t.getStackTrace();
        for (int i = 0; i < Math.min(8, st.length); i++) {
            sb.append(" | at ").append(st[i]);
        }
        return sb.toString();
    }

    static int count(final String hay, final String needle) {
        int n = 0;
        for (int i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + 1)) {
            n++;
        }
        return n;
    }

    /** One seat's counters, and the outlet / RemAIDeck cards it was left holding. */
    static void seatStats(final Json.JsonOut j, final String key, final PolicyLobbyPlayerAi lp, final Game game) {
        j.key(key).obj();
        final PolicyControllerAi c = lp.lastController();
        if (c != null) {
            j.key("counts").obj();
            for (final Map.Entry<String, Integer> e : c.counts().entrySet()) {
                j.n(e.getKey(), e.getValue());
            }
            j.end();
            int remHand = 0;
            int outletHand = 0;
            final Player p = c.getPlayer();
            for (final Card card : p.getCardsIn(ZoneType.Hand)) {
                if (ComputerUtilCard.isCardRemAIDeck(card)) {
                    remHand++;
                }
                if (OutletPolicy.isOutletCard(card)) {
                    outletHand++;
                }
            }
            j.n("remAiDeckInHandAtEnd", remHand).n("outletsInHandAtEnd", outletHand);
            j.key("events").arr();
            for (final String e : c.events()) {
                j.v(e);
            }
            j.end();
        }
        j.end();
    }

    // ==================================================================
    // report
    // ==================================================================

    /** Wilson score interval, 95%, for k successes in n trials. */
    static double[] wilson(final int k, final int n) {
        if (n == 0) {
            return new double[] {0, 1};
        }
        final double z = 1.959963984540054;
        final double p = (double) k / n;
        final double den = 1 + z * z / n;
        final double centre = (p + z * z / (2.0 * n)) / den;
        final double half = z * Math.sqrt(p * (1 - p) / n + z * z / (4.0 * n * n)) / den;
        return new double[] {Math.max(0, centre - half), Math.min(1, centre + half)};
    }

    static final class Tally {
        int games;
        int aWins;
        int bWins;
        int draws;
        int timeouts;
        int errors;
        int focusWins;
        int focusLosses;
        long msSum;
        long turnSum;
        long evalTimeouts;
        final List<Long> ms = new ArrayList<>();
        /** Per deal (pair + seed; a mirrored deal's two games share both): A's wins and decisive games. */
        final Map<String, int[]> deals = new LinkedHashMap<>();
        final Map<String, Long> aCounts = new TreeMap<>();
        final Map<String, Long> bCounts = new TreeMap<>();
        final Map<String, Long> focusCounts = new TreeMap<>();
        long aRemHand;
        long bRemHand;
    }

    @SuppressWarnings("unchecked")
    static int report(final String[] argv) throws Exception {
        boolean byPair = false;
        final List<File> files = new ArrayList<>();
        for (final String s : argv) {
            if ("--by-pair".equals(s)) {
                byPair = true;
            } else {
                files.add(new File(s));
            }
        }
        final Map<String, Tally> groups = new LinkedHashMap<>();
        for (final File f : files) {
            for (final String l : Files.readAllLines(f.toPath(), StandardCharsets.UTF_8)) {
                if (l.isBlank()) {
                    continue;
                }
                final Map<String, Object> m = (Map<String, Object>) Json.parse(l);
                final String key = m.get("a") + " vs " + m.get("b")
                        + (byPair ? "  [" + new File((String) m.get("focusDeck")).getName() + "]" : "");
                final Tally t = groups.computeIfAbsent(key, k -> new Tally());
                t.games++;
                final String w = (String) m.get("winner");
                if ("A".equals(w)) {
                    t.aWins++;
                } else if ("B".equals(w)) {
                    t.bWins++;
                } else {
                    t.draws++;
                }
                if (Boolean.TRUE.equals(m.get("timeout"))) {
                    t.timeouts++;
                }
                if (!"".equals(m.get("error"))) {
                    t.errors++;
                }
                if ("yes".equals(m.get("focusWon"))) {
                    t.focusWins++;
                } else if ("no".equals(m.get("focusWon"))) {
                    t.focusLosses++;
                }
                final long ms = ((Number) m.get("ms")).longValue();
                t.msSum += ms;
                t.ms.add(ms);
                t.turnSum += ((Number) m.get("turns")).longValue();
                t.evalTimeouts += ((Number) m.get("aiEvalTimeouts")).longValue();
                if ("A".equals(w) || "B".equals(w)) {
                    final int[] d = t.deals.computeIfAbsent(m.get("focusDeck") + "#" + m.get("seed"), k -> new int[2]);
                    d[1]++;
                    if ("A".equals(w)) {
                        d[0]++;
                    }
                }
                final boolean aHasFocus = m.get("aDeck").equals(m.get("focusDeck"));
                for (final String side : new String[] {"aStats", "bStats"}) {
                    final Map<String, Object> st = (Map<String, Object>) m.get(side);
                    if (st == null || st.get("counts") == null) {
                        continue;
                    }
                    final Map<String, Object> cs = (Map<String, Object>) st.get("counts");
                    final Map<String, Long> into = side.equals("aStats") ? t.aCounts : t.bCounts;
                    final boolean focusSide = side.equals("aStats") == aHasFocus;
                    for (final Map.Entry<String, Object> e : cs.entrySet()) {
                        final long v = ((Number) e.getValue()).longValue();
                        into.merge(e.getKey(), v, Long::sum);
                        if (focusSide) {
                            t.focusCounts.merge(e.getKey(), v, Long::sum);
                        }
                    }
                    final long rem = ((Number) st.get("remAiDeckInHandAtEnd")).longValue();
                    if (side.equals("aStats")) {
                        t.aRemHand += rem;
                    } else {
                        t.bRemHand += rem;
                    }
                }
            }
        }
        for (final Map.Entry<String, Tally> e : groups.entrySet()) {
            final Tally t = e.getValue();
            final int decisive = t.aWins + t.bWins;
            final double[] ci = wilson(t.aWins, decisive);
            final int fd = t.focusWins + t.focusLosses;
            final double[] fci = wilson(t.focusWins, fd);
            t.ms.sort(Long::compare);
            System.out.println("== " + e.getKey());
            System.out.println(String.format(Locale.ROOT,
                    "  games %d: A %d, B %d, draws %d (timeouts %d, engine errors %d)",
                    t.games, t.aWins, t.bWins, t.draws, t.timeouts, t.errors));
            System.out.println(String.format(Locale.ROOT,
                    "  A win rate %.1f%% of %d decisive  (95%% Wilson CI %.1f-%.1f%%)",
                    pct(t.aWins, decisive), decisive, 100 * ci[0], 100 * ci[1]));
            System.out.println(String.format(Locale.ROOT,
                    "  focus deck (first of each pair) win rate %.1f%% of %d  (95%% CI %.1f-%.1f%%)",
                    pct(t.focusWins, fd), fd, 100 * fci[0], 100 * fci[1]));
            System.out.println(String.format(Locale.ROOT,
                    "  game time mean %.1f s, median %.1f s, max %.1f s; turns mean %.1f; AI eval timeouts %d (%.2f/game)",
                    t.games == 0 ? 0 : t.msSum / 1000.0 / t.games, t.ms.isEmpty() ? 0 : t.ms.get(t.ms.size() / 2) / 1000.0,
                    t.ms.isEmpty() ? 0 : t.ms.get(t.ms.size() - 1) / 1000.0,
                    t.games == 0 ? 0 : (double) t.turnSum / t.games, t.evalTimeouts,
                    t.games == 0 ? 0 : (double) t.evalTimeouts / t.games));
            final double[] vs = versusHalf(t.deals.values());
            if (vs != null) {
                System.out.println(String.format(Locale.ROOT,
                        "  A vs the known 50%%: %.1f%% over %d deal(s)%s, 95%% CI %.1f-%.1f%%, p = %.3f (%+.0f Elo, CI %+.0f to %+.0f)",
                        100 * vs[0], (int) vs[1], vs[5] > 0 ? String.format(Locale.ROOT, " (%d mirrored, both sides played)", (int) vs[5]) : "",
                        100 * vs[2], 100 * vs[3], vs[4], elo(vs[0]), elo(vs[2]), elo(vs[3])));
            }
            System.out.println("  RemAIDeck cards left in hand at game end: A " + t.aRemHand + ", B " + t.bRemHand);
            System.out.println("  A counters:     " + t.aCounts);
            System.out.println("  B counters:     " + t.bCounts);
            System.out.println("  focus counters: " + t.focusCounts);
        }
        return 0;
    }

    // ==================================================================
    // paired: a treatment run against a control run on the same deals (D312)
    // ==================================================================

    /** Two-sided exact binomial (McNemar) p for k of n discordant games, p = 1/2. */
    static double mcnemar(final int k, final int n) {
        if (n == 0) {
            return 1;
        }
        final int lo = Math.min(k, n - k);
        double tail = 0;
        for (int i = 0; i <= lo; i++) {
            tail += Math.exp(logChoose(n, i) - n * Math.log(2));
        }
        return Math.min(1, 2 * tail);
    }

    static double logChoose(final int n, final int k) {
        double r = 0;
        for (int i = 1; i <= k; i++) {
            r += Math.log(n - k + i) - Math.log(i);
        }
        return r;
    }

    @SuppressWarnings("unchecked")
    static Map<String, Map<String, Object>> loadGames(final List<File> files) throws IOException {
        final Map<String, Map<String, Object>> out = new LinkedHashMap<>();
        for (final File f : files) {
            for (final String l : Files.readAllLines(f.toPath(), StandardCharsets.UTF_8)) {
                if (l.isBlank()) {
                    continue;
                }
                final Map<String, Object> m = (Map<String, Object>) Json.parse(l);
                out.put(m.get("aDeck") + "|" + m.get("bDeck") + "|" + m.get("seed") + "|" + m.get("aSeat"), m);
            }
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    static int paired(final String[] argv) throws Exception {
        final List<File> control = new ArrayList<>();
        final List<File> treat = new ArrayList<>();
        List<File> into = null;
        for (final String a : argv) {
            if ("--control".equals(a)) {
                into = control;
            } else if ("--treatment".equals(a)) {
                into = treat;
            } else if (into == null) {
                throw new IllegalArgumentException("paired --control FILE... --treatment FILE...");
            } else {
                into.add(new File(a));
            }
        }
        final Map<String, Map<String, Object>> c = loadGames(control);
        final Map<String, Map<String, Object>> t = loadGames(treat);
        int n = 0;
        int tWins = 0;
        int tDec = 0;
        int cWins = 0;
        int cDec = 0;
        int gained = 0;
        int lost = 0;
        long tMs = 0;
        long cMs = 0;
        int tErr = 0;
        final Map<String, Long> counters = new TreeMap<>();
        String tName = "?";
        String cName = "?";
        for (final Map.Entry<String, Map<String, Object>> e : t.entrySet()) {
            final Map<String, Object> tg = e.getValue();
            final Map<String, Object> cg = c.get(e.getKey());
            if (cg == null) {
                continue;
            }
            n++;
            tName = String.valueOf(tg.get("a"));
            cName = String.valueOf(cg.get("a"));
            final String tw = (String) tg.get("winner");
            final String cw = (String) cg.get("winner");
            if (!"draw".equals(tw)) {
                tDec++;
                tWins += "A".equals(tw) ? 1 : 0;
            }
            if (!"draw".equals(cw)) {
                cDec++;
                cWins += "A".equals(cw) ? 1 : 0;
            }
            if ("A".equals(tw) && !"A".equals(cw)) {
                gained++;
            } else if (!"A".equals(tw) && "A".equals(cw)) {
                lost++;
            }
            tMs += ((Number) tg.get("ms")).longValue();
            cMs += ((Number) cg.get("ms")).longValue();
            tErr += "".equals(tg.get("error")) ? 0 : 1;
            final Map<String, Object> st = (Map<String, Object>) tg.get("aStats");
            if (st != null && st.get("counts") != null) {
                for (final Map.Entry<String, Object> x : ((Map<String, Object>) st.get("counts")).entrySet()) {
                    counters.merge(x.getKey(), ((Number) x.getValue()).longValue(), Long::sum);
                }
            }
        }
        final double[] tci = wilson(tWins, tDec);
        final double[] cci = wilson(cWins, cDec);
        System.out.println("== paired: treatment A = " + tName + "   control A = " + cName + "   (B the same in both)");
        System.out.println(String.format(Locale.ROOT, "  deals matched: %d (treatment engine errors %d)", n, tErr));
        System.out.println(String.format(Locale.ROOT,
                "  treatment A wins %d of %d decisive = %.1f%%  (95%% Wilson CI %.1f-%.1f%%)",
                tWins, tDec, pct(tWins, tDec), 100 * tci[0], 100 * tci[1]));
        System.out.println(String.format(Locale.ROOT,
                "  control   A wins %d of %d decisive = %.1f%%  (95%% Wilson CI %.1f-%.1f%%)",
                cWins, cDec, pct(cWins, cDec), 100 * cci[0], 100 * cci[1]));
        System.out.println(String.format(Locale.ROOT,
                "  paired: %d deals gained, %d lost; exact McNemar p = %.4f", gained, lost,
                mcnemar(gained, gained + lost)));
        System.out.println(String.format(Locale.ROOT, "  seconds per game: treatment %.1f, control %.1f",
                n == 0 ? 0 : tMs / 1000.0 / n, n == 0 ? 0 : cMs / 1000.0 / n));
        final long considered = counters.getOrDefault("search.p.considered", 0L)
                + counters.getOrDefault("search.a.considered", 0L) + counters.getOrDefault("search.b.considered", 0L);
        if (considered > 0) {
            final long changed = counters.getOrDefault("search.p.changed", 0L)
                    + counters.getOrDefault("search.a.changed", 0L) + counters.getOrDefault("search.b.changed", 0L);
            final long copyErr = counters.getOrDefault("search.fallback.copyError", 0L);
            final long budget = counters.getOrDefault("search.fallback.budget", 0L);
            final long unmap = counters.getOrDefault("search.fallback.unmappable", 0L);
            final long standIn = counters.getOrDefault("search.standInDecisions", 0L);
            final long searchMs = counters.getOrDefault("search.p.ms", 0L) + counters.getOrDefault("search.a.ms", 0L)
                    + counters.getOrDefault("search.b.ms", 0L);
            System.out.println(String.format(Locale.ROOT,
                    "  search: %d decisions searched (%.1f/game), %d changed Forge's answer (%.1f%%), %.0f ms each",
                    considered, (double) considered / n, changed, pct((int) changed, (int) considered),
                    (double) searchMs / considered));
            System.out.println(String.format(Locale.ROOT,
                    "  fallbacks to Forge: copier error %d (%.2f%%), budget %d (%.1f%%), unmappable %d;"
                    + " copies that needed the sideboard stand-in: %d decisions (%.1f%%)",
                    copyErr, 100.0 * copyErr / considered, budget, 100.0 * budget / considered, unmap,
                    standIn, 100.0 * standIn / considered));
            System.out.println("  treatment counters: " + counters);
        }
        return 0;
    }

    /**
     * A's score against the KNOWN 50% (D318, the methodology review's M1): with
     * A and B swapping deck and seat, a config tied with its opponent scores
     * exactly 50% by symmetry, so no separate control run is needed -- and a
     * control's own luck does not leak into the effect.  The unit is the deal:
     * a mirrored deal (ai-bench --mirror) is A's share of its two decisive games,
     * because the two are correlated; otherwise each game is its own deal.
     * Returns {mean, deals, lo, hi, two-sided p, mirrored deals}, normal
     * approximation with the variance shrunk by one pseudo-deal toward 1/4;
     * null with fewer than two deals.
     */
    static double[] versusHalf(final java.util.Collection<int[]> deals) {
        final List<Double> xs = new ArrayList<>();
        int mirrored = 0;
        for (final int[] d : deals) {
            if (d[1] > 0) {
                xs.add((double) d[0] / d[1]);
                if (d[1] > 1) {
                    mirrored++;
                }
            }
        }
        final int n = xs.size();
        if (n < 2) {
            return null;
        }
        double mean = 0;
        for (final double x : xs) {
            mean += x;
        }
        mean /= n;
        double var = 0;
        for (final double x : xs) {
            var += (x - mean) * (x - mean);
        }
        // one pseudo-deal at a single game's null variance (1/4): with a handful of
        // deals that all split 1-1 the sample variance is 0, and an interval of
        // zero width would be a claim the data cannot make; at large n it is noise
        var = (var + 0.25) / n;
        final double se = Math.sqrt(var / n);
        final double z = (mean - 0.5) / se;
        final double p = Math.min(1, 2 * (1 - phi(Math.abs(z))));
        return new double[] {mean, n, Math.max(0, mean - 1.96 * se), Math.min(1, mean + 1.96 * se), p, mirrored};
    }

    /** The standard normal CDF (Abramowitz-Stegun 7.1.26 through erf). */
    static double phi(final double x) {
        final double t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.sqrt(2));
        final double y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t
                * Math.exp(-x * x / 2);
        return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
    }

    /** Elo from a score (clamped away from 0 and 1). */
    static double elo(final double s) {
        final double c = Math.min(0.999, Math.max(0.001, s));
        return -400 * Math.log10(1 / c - 1);
    }

    static double pct(final int k, final int n) {
        return n == 0 ? 0 : 100.0 * k / n;
    }

    // ==================================================================
    // selftest
    // ==================================================================

    private static int failures;
    private static int checks;

    private static void check(final boolean ok, final String what) {
        checks++;
        if (!ok) {
            failures++;
            System.out.println("  FAIL " + what);
        } else {
            System.out.println("  ok   " + what);
        }
    }

    static int selftest(final String[] argv) throws Exception {
        final boolean engine = !Arrays.asList(argv).contains("--no-engine");
        System.out.println("== ai-bench selftest: statistics");
        final double[] w1 = wilson(5, 10);
        check(Math.abs(w1[0] - 0.2366) < 1e-3 && Math.abs(w1[1] - 0.7634) < 1e-3, "wilson(5,10) = [0.2366, 0.7634]");
        final double[] w2 = wilson(0, 10);
        check(w2[0] == 0 && Math.abs(w2[1] - 0.2775) < 1e-3, "wilson(0,10) = [0, 0.2775]");
        final double[] w3 = wilson(81, 100);
        check(Math.abs(w3[0] - 0.7222) < 1e-3 && Math.abs(w3[1] - 0.8749) < 1e-3, "wilson(81,100) = [0.7222, 0.8749]");
        final Cfg c = new Cfg("Experimental+sim+shadow");
        check("Experimental".equals(c.profile) && c.sim == AIOption.USE_FULL_SIMULATION
                && c.outlets == PolicyLobbyPlayerAi.Outlets.SHADOW, "Cfg parses profile+sim+shadow");
        boolean threw = false;
        try {
            new Cfg("Default+turbo");
        } catch (final IllegalArgumentException e) {
            threw = true;
        }
        check(threw, "Cfg refuses an unknown option");
        check(gameSeed(3, 2, 6, false) == 3 * 1_000_003L + 2 * 10_007L + 6, "plain seeds are unchanged");
        check(gameSeed(3, 2, 4, true) == gameSeed(3, 2, 7, true) && gameSeed(3, 2, 5, true) == gameSeed(3, 2, 6, true)
                && gameSeed(3, 2, 4, true) != gameSeed(3, 2, 5, true) && gameSeed(3, 2, 5, true) == gameSeed(3, 2, 5, false),
                "--mirror: games 4k/4k+3 and 4k+1/4k+2 share a seed");
        final double[] v = versusHalf(List.of(new int[] {1, 2}, new int[] {1, 2}, new int[] {2, 2}, new int[] {0, 1}));
        check(v != null && Math.abs(v[0] - 0.5) < 1e-9 && v[1] == 4 && v[5] == 3 && Math.abs(v[4] - 1) < 1e-6,
                "vs 50%: deals 1/2, 1/2, 2/2, 0/1 score 50%, p = 1, three mirrored");
        check(Math.abs(phi(1.959963984540054) - 0.975) < 1e-6 && Math.abs(elo(0.5)) < 1e-9, "phi and elo");
        resumeChecks();
        if (engine) {
            scenarios();
        }
        System.out.println("ai-bench selftest: " + checks + " check(s), " + failures + " failure(s)");
        return failures == 0 ? 0 : 1;
    }

    /** D337: resume (torn line, other shards, a different configuration) and the control file, no engine. */
    static void resumeChecks() throws Exception {
        System.out.println("== ai-bench selftest: resume and the control file");
        final File dir = Files.createTempDirectory("ai-bench-resume").toFile();
        final File own = new File(dir, "shard-0.jsonl");
        final File other = new File(dir, "shard-1.jsonl");
        final String g0 = "{\"pair\":0,\"game\":0,\"seed\":11,\"a\":\"Default\",\"b\":\"Default\",\"aDeck\":\"x.dck\",\"bDeck\":\"y.dck\"}";
        final String g1 = "{\"pair\":0,\"game\":1,\"seed\":12,\"a\":\"Default\",\"b\":\"Default\",\"aDeck\":\"y.dck\",\"bDeck\":\"x.dck\"}";
        Files.write(own.toPath(), (g0 + "\n{\"pair\":0,\"game\":2,\"se").getBytes(StandardCharsets.UTF_8));
        Files.write(other.toPath(), (g1 + "\n{\"pair\":0,\"ga").getBytes(StandardCharsets.UTF_8));
        final Done d = readDone(own, List.of(own, other));
        check(d.sig.size() == 2 && d.sig.containsKey("0/0") && d.sig.containsKey("0/1"), "resume: complete lines of this shard and the others count");
        check(d.torn > 0 && new String(Files.readAllBytes(own.toPath()), StandardCharsets.UTF_8).equals(g0 + "\n"),
                "resume: this shard's torn last line is cut off on disk");
        check(new String(Files.readAllBytes(other.toPath()), StandardCharsets.UTF_8).endsWith("\"ga"),
                "resume: another shard's file is only read");
        check(d.sig.get("0/0").equals(sig(11, "Default", "Default", "x.dck", "y.dck")), "resume: a game's signature is its seed, configs and decks");
        Files.write(other.toPath(), (g1.replace("\"seed\":12", "\"seed\":99") + "\n" + g1 + "\n").getBytes(StandardCharsets.UTF_8));
        boolean threw = false;
        try {
            readDone(own, List.of(other));
        } catch (final IOException e) {
            threw = true;
        }
        check(threw, "resume: one game with two different settings is refused");
        final File ctl = new File(dir, "control.json");
        final PrintStream quiet = new PrintStream(new ByteArrayOutputStream(), true, "UTF-8");
        check(awaitTurn(null, 3, quiet, 10) == 0 && awaitTurn(ctl.getPath(), 3, quiet, 10) == 0, "control: unset or absent means play");
        Files.write(ctl.toPath(), "{\"paused\":false,\"maxWorkers\":2}".getBytes(StandardCharsets.UTF_8));
        check(awaitTurn(ctl.getPath(), 1, quiet, 10) == 0 && awaitTurn(ctl.getPath(), 2, quiet, 10) == EXIT_PARKED,
                "control: maxWorkers 2 keeps slots 0-1 and parks slot 2");
        Files.write(ctl.toPath(), "{\"paused\":tr".getBytes(StandardCharsets.UTF_8));
        check(awaitTurn(ctl.getPath(), 5, quiet, 10) == 0, "control: a torn file means no control");
        Files.write(ctl.toPath(), "{\"paused\":true,\"maxWorkers\":1}".getBytes(StandardCharsets.UTF_8));
        check(awaitTurn(ctl.getPath(), 1, quiet, 10) == EXIT_PARKED,
                "control: a parked slot exits even while paused (its memory comes back); the hold itself is the smoke test's");
        for (final File f : new File[] {own, other, ctl}) {
            Files.deleteIfExists(f.toPath());
        }
        Files.deleteIfExists(dir.toPath());
    }

    /**
     * The outlet policy against hand-built board states (Forge's own
     * {@code GameState} puzzle loader), and one control that pins the finding
     * the policy exists for: Forge's AI will not cast Viscera Seer.
     */
    static void scenarios() throws Exception {
        final Config cfg = Config.load();
        Bootstrap.installGui(cfg.forgeHomeDir());           // hard rule 1
        Bootstrap.initializeModel(false);
        System.out.println("== ai-bench selftest: outlet policy scenarios (engine)");

        // 1. Removal on the stack aimed at a creature: sacrifice it in response.
        scenario("threatened", List.of(
                "humanlife=20", "ailife=20", "turn=3", "activeplayer=human", "activephase=MAIN1",
                "humanbattlefield=Swamp;Swamp",
                "aibattlefield=Viscera Seer|Id:11;Grizzly Bears|Id:12;Swamp",
                "humanputonstack=Murder->12"),
            (ai, pol) -> {
                final OutletPolicy.Choice ch = pol.decide(ai);
                check(ch != null && ch.why == OutletPolicy.Situation.THREATENED
                        && "Viscera Seer".equals(ch.sa.getHostCard().getName())
                        && ch.victim != null && "Grizzly Bears".equals(ch.victim.getName()),
                        "Murder on Grizzly Bears -> sacrifice the Bears to Viscera Seer (got " + ch + ")");
            });
        // 1b. The same through the controller, end to end, with Carrion Feeder -- whose own
        //     script prefers "the worst other creature" (AIPreference SacCost$Creature.Other):
        //     the steer must still sacrifice the threatened Bears, not the Memnite.
        scenario("steer", List.of(
                "humanlife=20", "ailife=20", "turn=3", "activeplayer=human", "activephase=MAIN1",
                "humanbattlefield=Swamp;Swamp",
                "aibattlefield=Carrion Feeder|Id:11;Grizzly Bears|Id:12;Memnite|Id:13;Swamp",
                "humanputonstack=Murder->12"),
            (ai, pol) -> {
                final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
                final List<forge.game.spellability.SpellAbility> pick = ctl.chooseSpellAbilityToPlay();
                check(pick != null && pick.size() == 1 && "Carrion Feeder".equals(pick.get(0).getHostCard().getName()),
                        "the controller answers Murder with Carrion Feeder (got " + pick + ")");
                if (pick != null && pick.size() == 1) {
                    ctl.playChosenSpellAbility(pick.get(0));
                }
                boolean bearsGone = true;
                boolean memniteHere = false;
                for (final Card c : ai.getCardsIn(ZoneType.Battlefield)) {
                    bearsGone &= !"Grizzly Bears".equals(c.getName());
                    memniteHere |= "Memnite".equals(c.getName());
                }
                check(bearsGone && memniteHere,
                        "the Bears were sacrificed, not the Memnite Carrion Feeder's own preference would pick");
                check(!ctl.counts().containsKey("policy.steerMissed"), "no steer miss counted");
            });
        // 1c. Forge activates Carrion Feeder by itself (AristocratCounters: Gravecrawler,
        //     SacMe 3, is fodder) and then pays with the WORST creature, Blood Artist; with
        //     the policy it pays with the fodder.  The first half is the control.
        final List<String> fodderBoard = List.of(
                "humanlife=20", "ailife=20", "turn=6", "activeplayer=ai", "activephase=MAIN2",
                "humanbattlefield=Forest",
                "aibattlefield=Carrion Feeder;Gravecrawler;Blood Artist;Swamp");
        for (final PolicyLobbyPlayerAi.Outlets mode : List.of(PolicyLobbyPlayerAi.Outlets.OFF,
                                                               PolicyLobbyPlayerAi.Outlets.ON)) {
            scenario("fodder-" + mode, fodderBoard, mode, (ai, pol) -> {
                final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
                final List<forge.game.spellability.SpellAbility> pick = ctl.chooseSpellAbilityToPlay();
                final boolean feeder = pick != null && pick.size() == 1
                        && "Carrion Feeder".equals(pick.get(0).getHostCard().getName());
                check(feeder, mode + ": Forge chooses to activate Carrion Feeder (got " + pick + ")");
                if (feeder) {
                    ctl.playChosenSpellAbility(pick.get(0));
                }
                final String gone = ai.getCardsIn(ZoneType.Graveyard).isEmpty() ? "nothing"
                        : ai.getCardsIn(ZoneType.Graveyard).get(0).getName();
                final String want = mode == PolicyLobbyPlayerAi.Outlets.OFF ? "Blood Artist" : "Gravecrawler";
                check(want.equals(gone), mode + ": it pays with " + want + " (paid with " + gone + ")");
            });
        }
        // 2. A bounce is not a threat worth a card.
        scenario("bounce", List.of(
                "humanlife=20", "ailife=20", "turn=3", "activeplayer=human", "activephase=MAIN1",
                "humanbattlefield=Island;Island",
                "aibattlefield=Viscera Seer|Id:11;Grizzly Bears|Id:12;Swamp",
                "humanputonstack=Unsummon->12"),
            (ai, pol) -> check(pol.decide(ai) == null, "Unsummon on Grizzly Bears -> keep it"));
        // 3. Lethal through Bombardment and Blood Artist: 3 Bears x (1+1) + the Artist (1+1) = 8.
        scenario("lethal", List.of(
                "humanlife=8", "ailife=20", "turn=5", "activeplayer=ai", "activephase=MAIN2",
                "humanbattlefield=Forest",
                "aibattlefield=Goblin Bombardment;Blood Artist|Id:20;Grizzly Bears;Grizzly Bears;Grizzly Bears;Mountain"),
            (ai, pol) -> {
                final OutletPolicy.Choice ch = pol.decide(ai);
                check(ch != null && ch.why == OutletPolicy.Situation.LETHAL
                        && "Goblin Bombardment".equals(ch.sa.getHostCard().getName())
                        && ch.victim != null && "Grizzly Bears".equals(ch.victim.getName())
                        && targets(ch.sa, ai.getWeakestOpponent()),
                        "8 life vs Bombardment + Blood Artist + 3 Bears -> go, Bears first, at the face (got " + ch + ")");
            });
        // 4. One short of lethal: do nothing.
        scenario("not-lethal", List.of(
                "humanlife=9", "ailife=20", "turn=5", "activeplayer=ai", "activephase=MAIN2",
                "humanbattlefield=Forest",
                "aibattlefield=Goblin Bombardment;Blood Artist;Grizzly Bears;Grizzly Bears;Grizzly Bears;Mountain"),
            (ai, pol) -> check(pol.decide(ai) == null, "9 life vs the same board -> hold"));
        // 4b. The lethal board again, but the opponent has its own Blood Artist: each of our
        //     sacrifices also gains them 1, so the 8 becomes 4 -- hold.
        scenario("lethal-vs-artist", List.of(
                "humanlife=8", "ailife=20", "turn=5", "activeplayer=ai", "activephase=MAIN2",
                "humanbattlefield=Forest;Blood Artist",
                "aibattlefield=Goblin Bombardment;Blood Artist;Grizzly Bears;Grizzly Bears;Grizzly Bears;Mountain"),
            (ai, pol) -> check(pol.decide(ai) == null, "8 life, but their Blood Artist gains 1 a death -> hold"));
        // 5. The finding: Forge's own choice never casts Viscera Seer; the policy does.
        scenario("cast-outlet", List.of(
                "humanlife=20", "ailife=20", "turn=3", "activeplayer=ai", "activephase=MAIN2",
                "humanbattlefield=Forest",
                "aihand=Viscera Seer",
                "aibattlefield=Swamp|Id:30"),
            (ai, pol) -> {
                final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
                final List<forge.game.spellability.SpellAbility> forge = ctl.getAi().chooseSpellAbilityToPlay();
                check(forge == null || forge.isEmpty(),
                        "Forge's AiController with only Viscera Seer castable chooses nothing (RemAIDeck filter)");
                final OutletPolicy.Choice ch = pol.castOutlet(ai);
                check(ch != null && ch.why == OutletPolicy.Situation.CAST_OUTLET
                        && "Viscera Seer".equals(ch.sa.getHostCard().getName()),
                        "the policy casts it (got " + ch + ")");
            });
        // 5b. The control for 5: the same board with an unflagged one-drop, which Forge does cast.
        scenario("cast-control", List.of(
                "humanlife=20", "ailife=20", "turn=3", "activeplayer=ai", "activephase=MAIN2",
                "humanbattlefield=Forest",
                "aihand=Typhoid Rats",
                "aibattlefield=Swamp|Id:30"),
            (ai, pol) -> {
                final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
                final List<forge.game.spellability.SpellAbility> forge = ctl.getAi().chooseSpellAbilityToPlay();
                check(forge != null && !forge.isEmpty() && "Typhoid Rats".equals(forge.get(0).getHostCard().getName()),
                        "control: the same board with Typhoid Rats instead -> Forge casts it (got " + forge + ")");
                check(pol.castOutlet(ai) == null, "control: the policy leaves an unflagged card to Forge");
            });
        // 6. Nothing to do on a quiet board.
        scenario("quiet", List.of(
                "humanlife=20", "ailife=20", "turn=4", "activeplayer=human", "activephase=MAIN1",
                "humanbattlefield=Forest",
                "aibattlefield=Goblin Bombardment;Grizzly Bears;Mountain"),
            (ai, pol) -> check(pol.decide(ai) == null, "a quiet board -> no sacrifice"));
        searchScenarios();
    }

    // ------------------------------------------------------------------
    // The search's plumbing (D312, D313): determinization never sees the
    // opponent's hidden cards; the copier's sideboard failure and its
    // workaround; a copier error falls back to Forge's answer; and a search
    // that runs end to end inside its budget.
    // ------------------------------------------------------------------

    private static final List<List<String>> DET = new ArrayList<>();

    static List<String> names(final Iterable<Card> cs) {
        final List<String> l = new ArrayList<>();
        for (final Card c : cs) {
            l.add(c.getName());
        }
        return l;
    }

    static void searchScenarios() throws Exception {
        System.out.println("== ai-bench selftest: search plumbing (engine)");
        final SearchConfig quick = SearchConfig.parse("ms=3000,rounds=1,seed=7");
        // 1. Two games whose opponent ("human") holds the same five cards between
        //    hand and library, split and ordered differently.  The same seed must
        //    give the same determinization: it cannot depend on what is hidden.
        final String[][] splits = {
            {"humanhand=Grizzly Bears;Lightning Bolt", "humanlibrary=Forest;Island;Shock"},
            {"humanhand=Shock;Forest", "humanlibrary=Lightning Bolt;Island;Grizzly Bears"},
        };
        DET.clear();
        for (int k = 0; k < 2; k++) {
            final List<String> board = new ArrayList<>(List.of(
                    "humanlife=20", "ailife=20", "turn=3", "activeplayer=ai", "activephase=MAIN1",
                    "humanbattlefield=Forest", "aihand=Typhoid Rats", "ailibrary=Swamp;Mountain;Plains",
                    "aibattlefield=Swamp"));
            board.add(splits[k][0]);
            board.add(splits[k][1]);
            scenario("determinize-" + k, board, PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
                final forge.game.Game g = ai.getGame();
                final List<String> out = new ArrayList<>();
                final java.util.Set<String> hands = new java.util.HashSet<>();
                for (long seed = 1; seed <= 40; seed++) {
                    final LenientGameCopier cp = new LenientGameCopier(g);
                    final forge.game.Game copy = cp.makeCopy(null, ai);
                    final Player aiC = (Player) cp.find(ai);
                    Determinizer.determinize(copy, aiC, new Random(seed));
                    final Player oppC = (Player) cp.find(ai.getWeakestOpponent());
                    final String hand = String.join(",", names(oppC.getCardsIn(ZoneType.Hand)));
                    hands.add(hand);
                    out.add(hand + " | " + String.join(",", names(oppC.getCardsIn(ZoneType.Library)))
                            + " | own hand " + String.join(",", names(aiC.getCardsIn(ZoneType.Hand))));
                }
                DET.add(out);
                check(hands.size() > 3, "determinize-" + hands.size() + " distinct opponent hands over 40 seeds");
            });
        }
        check(DET.size() == 2 && DET.get(0).equals(DET.get(1)),
                "the same seeds give the same determinizations whatever the hidden split and order"
                + (DET.size() == 2 ? " (first: " + DET.get(0).get(0) + ")" : ""));
        check(DET.size() == 2 && DET.get(0).get(0).endsWith("own hand Typhoid Rats"),
                "the AI's own hand is kept");

        // 2. The copier's failure, and the workaround: a characteristic-defining
        //    static (Tarmogoyf's P/T) also affects the copy in the SIDEBOARD, a
        //    zone GameCopier does not copy.
        scenario("copier-sideboard", List.of(
                "humanlife=20", "ailife=20", "turn=3", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Forest", "aibattlefield=Tarmogoyf;Forest",
                "aisideboard=Tarmogoyf;Grist, the Hunger Tide"), PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
                    String plain = "copied";
                    try {
                        new forge.ai.simulation.GameCopier(ai.getGame()).makeCopy();
                    } catch (final RuntimeException e) {
                        plain = String.valueOf(e.getMessage());
                    }
                    check(plain.startsWith("Couldn't map"),
                            "control: Forge's own GameCopier fails on a sideboard card (" + plain + ")");
                    final LenientGameCopier cp = new LenientGameCopier(ai.getGame());
                    final forge.game.Game copy = cp.makeCopy(null, ai);
                    check(copy != null && cp.unmapped() > 0,
                            "LenientGameCopier copies it, " + cp.unmapped() + " stand-in(s): " + cp.unmappedNames());
                    final Player aiC = (Player) cp.find(ai);
                    check(names(aiC.getCardsIn(ZoneType.Battlefield)).contains("Tarmogoyf"),
                            "the copy holds the battlefield Tarmogoyf");
                });

        // 3. A copier error inside the search: Forge's own answer, counted.
        final List<String> castBoard = List.of(
                "humanlife=20", "ailife=20", "turn=3", "activeplayer=ai", "activephase=MAIN2",
                "humanbattlefield=Forest", "humanhand=Lightning Bolt", "humanlibrary=Forest;Forest;Forest",
                "aihand=Typhoid Rats", "ailibrary=Swamp;Swamp;Swamp", "aibattlefield=Swamp|Id:30");
        scenario("search-copy-fails", castBoard, PolicyLobbyPlayerAi.Outlets.OFF, quick, (ai, pol) -> {
            final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
            ctl.search().failCopyForTest(new RuntimeException("Couldn't map test"));
            final List<forge.game.spellability.SpellAbility> pick = ctl.chooseSpellAbilityToPlay();
            check(pick != null && pick.size() == 1 && "Typhoid Rats".equals(pick.get(0).getHostCard().getName()),
                    "a copier error -> Forge's own play, Typhoid Rats (got " + pick + ")");
            check(Integer.valueOf(1).equals(ctl.counts().get("search.fallback.copyError")),
                    "and it is counted (" + ctl.counts() + ")");
        });

        // 4. The same board, searched for real: rollouts run, the budget holds,
        //    and the answer is one of the candidates.
        scenario("search-runs", castBoard, PolicyLobbyPlayerAi.Outlets.OFF, quick, (ai, pol) -> {
            final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
            final long t0 = System.nanoTime();
            final List<forge.game.spellability.SpellAbility> pick = ctl.chooseSpellAbilityToPlay();
            final long ms = (System.nanoTime() - t0) / 1_000_000L;
            final java.util.Map<String, Integer> c = ctl.counts();
            check(c.getOrDefault("search.rollouts", 0) >= 2 && c.getOrDefault("search.rolloutErrors", 0) == 0,
                    "the search ran " + c.getOrDefault("search.rollouts", 0) + " rollout(s), "
                    + c.getOrDefault("search.rounds", 0) + " round(s), no errors (" + c + ")");
            check(ms < quick.budgetMs + 2000, "inside its budget (" + ms + " ms for " + quick.budgetMs + ")");
            check(pick == null || "Typhoid Rats".equals(pick.get(0).getHostCard().getName()),
                    "it answers Typhoid Rats or pass (got " + pick + ")");
            check(ai.getWeakestOpponent().getCardsIn(ZoneType.Hand).size() == 1
                    && "Lightning Bolt".equals(ai.getWeakestOpponent().getCardsIn(ZoneType.Hand).get(0).getName()),
                    "the real game is untouched: the opponent still holds its Lightning Bolt");
        });

        // 5. Attacks: two Bears into an empty board at 4 life -- the search runs
        //    and keeps (or finds) the lethal attack.
        scenario("search-attack", List.of(
                "humanlife=4", "ailife=20", "turn=5", "activeplayer=ai", "activephase=COMBAT_DECLARE_ATTACKERS",
                "humanbattlefield=Forest", "humanlibrary=Forest;Forest;Forest", "ailibrary=Swamp;Swamp;Swamp",
                "aibattlefield=Grizzly Bears;Grizzly Bears;Forest"), PolicyLobbyPlayerAi.Outlets.OFF,
                SearchConfig.parse("ms=3000,rounds=1,seed=7,what=a"), (ai, pol) -> {
                    final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
                    final forge.game.combat.Combat combat = new forge.game.combat.Combat(ai);
                    ai.getGame().getPhaseHandler().setCombat(combat);
                    combat.initConstraints();
                    ctl.declareAttackers(ai, combat);
                    final java.util.Map<String, Integer> c = ctl.counts();
                    check(c.getOrDefault("search.a.considered", 0) == 1 && c.getOrDefault("search.rollouts", 0) >= 2
                            && c.getOrDefault("search.rolloutErrors", 0) == 0,
                            "the attack search ran (" + c + ")");
                    check(combat.getAttackers().size() == 2, "both Bears attack for lethal (got "
                            + combat.getAttackers() + "; " + ctl.events() + ")");
                });

        // 6. D350–D351's switches on the same board: attacks to the end of the next
        //    turn, the noise-aware rule, a heavier untapped term, the bench-only
        //    oracle -- and the search's report carries the numbers.
        scenario("search-d347", List.of(
                "humanlife=4", "ailife=20", "turn=5", "activeplayer=ai", "activephase=COMBAT_DECLARE_ATTACKERS",
                "humanbattlefield=Forest", "humanlibrary=Forest;Forest;Forest", "ailibrary=Swamp;Swamp;Swamp",
                "aibattlefield=Grizzly Bears;Grizzly Bears;Forest"), PolicyLobbyPlayerAi.Outlets.OFF,
                SearchConfig.parse("ms=3000,rounds=1,maxrounds=3,seed=7,what=a,aturns=1,override=lcb,z=1,margin=0,untapped=5,oracle=1"),
                (ai, pol) -> {
                    final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
                    final forge.game.combat.Combat combat = new forge.game.combat.Combat(ai);
                    ai.getGame().getPhaseHandler().setCombat(combat);
                    combat.initConstraints();
                    ctl.declareAttackers(ai, combat);
                    final mtgtable.ai.SearchPolicy.Report rep = ctl.search().peekReport();
                    check(rep != null && "a".equals(rep.kind) && rep.horizon == 1 && "lcb".equals(rep.rule) && rep.rounds >= 1
                            && rep.seLeaf.length == rep.cands.size() && rep.diffLeaf[0] == 0
                            && ctl.counts().getOrDefault("search.oracleRollouts", 0) >= 2,
                            "the report: " + (rep == null ? "none" : rep.summary()) + " (" + ctl.counts() + ")");
                });
        // 7. D388–D390 (search week 3): the anytime search ranking a wide attack
        //    list by its prior, the outlet policy inside the rollouts.  The report
        //    says what was generated, kept and scored, and it reaches a verdict.
        scenario("search-week3-attack", List.of(
                "humanlife=9", "ailife=20", "turn=5", "activeplayer=ai", "activephase=COMBAT_DECLARE_ATTACKERS",
                "humanbattlefield=Forest;Wall of Wood", "humanlibrary=Forest;Forest;Forest", "ailibrary=Swamp;Swamp;Swamp",
                "aibattlefield=Grizzly Bears;Grizzly Bears;Hill Giant;Viscera Seer;Forest"), PolicyLobbyPlayerAi.Outlets.OFF,
                SearchConfig.parse("ms=4000,rounds=2,maxrounds=4,seed=7,what=a,anytime=1,rank=prior,cands=3,gen=12,rollout=both"),
                (ai, pol) -> {
                    final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
                    final forge.game.combat.Combat combat = new forge.game.combat.Combat(ai);
                    ai.getGame().getPhaseHandler().setCombat(combat);
                    combat.initConstraints();
                    ctl.declareAttackers(ai, combat);
                    final mtgtable.ai.SearchPolicy.Report rep = ctl.search().peekReport();
                    final java.util.Map<String, Integer> c = ctl.counts();
                    int scored = 0;
                    for (int i = 0; rep != null && i < rep.prior.length; i++) {
                        scored += Double.isNaN(rep.prior[i]) ? 0 : 1;
                    }
                    check(rep != null && rep.anytime && rep.generated > 3 && rep.cands.size() == 3 && scored >= 1
                            && rep.fallback == null && rep.chosen >= 0 && c.getOrDefault("search.rolloutErrors", 0) == 0
                            && c.getOrDefault("search.prior.playouts", 0) >= 1,
                            "ranked anytime search: " + (rep == null ? "none" : rep.summary()) + " (" + c + ")");
                });
        // 8. The anytime search at a budget no full round fits: it still decides
        //    on what it scored (or, with nothing scored, says "budget").
        scenario("search-week3-tight", castBoard, PolicyLobbyPlayerAi.Outlets.OFF,
                SearchConfig.parse("ms=60,rounds=2,seed=7,anytime=1"), (ai, pol) -> {
                    final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
                    final long t0 = System.nanoTime();
                    ctl.chooseSpellAbilityToPlay();
                    final long ms = (System.nanoTime() - t0) / 1_000_000L;
                    final mtgtable.ai.SearchPolicy.Report rep = ctl.search().peekReport();
                    check(rep != null && rep.anytime && (rep.fallback == null ? rep.chosen >= 0
                            : "budget".equals(rep.fallback) && rep.playouts <= 1) && ms < 60 + 1500,
                            "a tight budget: " + ms + " ms, " + (rep == null ? "none" : rep.summary()));
                });
        // 9. D431: the hand leaf's weights.  On a real board each weight scales
        //    its own term and nothing else (the leaf is linear in the four), all
        //    four at 1 is the plain leaf to the bit, and a search whose weights
        //    are all 0 scores every unfinished rollout 0 -- so the weights reach
        //    the rollouts' leaves.
        final List<String> leafBoard = List.of(
                "humanlife=4", "ailife=20", "turn=5", "activeplayer=ai", "activephase=COMBAT_DECLARE_ATTACKERS",
                "humanbattlefield=Forest;Wall of Wood", "humanhand=Forest;Forest", "aihand=Swamp",
                "humanlibrary=Forest;Forest;Forest", "ailibrary=Swamp;Swamp;Swamp",
                "aibattlefield=Grizzly Bears;Grizzly Bears;Forest;Forest");
        scenario("leaf-weights", leafBoard, PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final Game g = ai.getGame();
            final double plain = mtgtable.ai.SearchPolicy.leaf(g, ai, 1.0);
            check(plain == mtgtable.ai.SearchPolicy.leaf(g, ai, 1.0, null)
                    && plain == mtgtable.ai.SearchPolicy.leaf(g, ai, 1.0, new double[] {1, 1, 1, 1})
                    && plain == mtgtable.ai.SearchPolicy.leaf(g, ai),
                    "weights 1 (or none) are the plain leaf to the bit: " + plain);
            final double[] term = new double[4];
            for (int i = 0; i < 4; i++) {
                final double[] w = {1, 1, 1, 1};
                w[i] = 0;
                term[i] = plain - mtgtable.ai.SearchPolicy.leaf(g, ai, 1.0, w);
            }
            check(term[0] == 200 && term[1] == -40 && term[2] != 0 && term[3] != 0,
                    "each weight has its own term (life 320 - 120 = 200, hand 40 x (1 - 2) = -40, creatures, other): "
                            + java.util.Arrays.toString(term));
            final double[] w = {0.5, 1.5, 2.0, 0.25};
            double expect = plain;
            for (int i = 0; i < 4; i++) {
                expect += (w[i] - 1) * term[i];
            }
            final double got = mtgtable.ai.SearchPolicy.leaf(g, ai, 1.0, w);
            check(Math.abs(got - expect) < 1e-6, "the leaf is linear in the four weights: " + got + " vs " + expect);
        });
        scenario("search-leaf-weights", leafBoard, PolicyLobbyPlayerAi.Outlets.OFF,
                SearchConfig.parse("ms=3000,rounds=1,seed=7,what=a,wlife=0,whand=0,wcreature=0,wother=0"), (ai, pol) -> {
                    final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
                    final forge.game.combat.Combat combat = new forge.game.combat.Combat(ai);
                    ai.getGame().getPhaseHandler().setCombat(combat);
                    combat.initConstraints();
                    ctl.declareAttackers(ai, combat);
                    final mtgtable.ai.SearchPolicy.Report rep = ctl.search().peekReport();
                    int zero = 0;
                    int other = 0;
                    for (int i = 0; rep != null && i < rep.meanLeaf.length; i++) {
                        final double m = rep.meanLeaf[i];
                        if (m == 0) {
                            zero++;
                        } else if (!Double.isNaN(m) && Math.abs(m) < 50_000) {
                            other++;   // an unfinished rollout the weights did not reach
                        }
                    }
                    check(rep != null && zero >= 1 && other == 0 && ctl.counts().getOrDefault("search.rolloutErrors", 0) == 0,
                            "weights 0 score every unfinished rollout 0: " + (rep == null ? "none" : rep.summary()));
                });
        d416Scenarios(castBoard);
    }

    // ------------------------------------------------------------------
    // D417: the opening-hand search (mull=1) and the target search
    // (targets=1) -- each fires on its own decisions and nowhere else, falls
    // back to Forge's answer on a copier error, leaves the real game as it was,
    // and never reads what the AI cannot see.
    // ------------------------------------------------------------------

    /** A pre-game board: no phase yet, seven cards in each hand, the libraries behind them. */
    static List<String> pregame(final String aiHand, final String aiLibrary, final String humanHand, final String humanLibrary) {
        return List.of("humanlife=20", "ailife=20", "turn=0", "activeplayer=ai", "activephase=NONE",
                "aihand=" + aiHand, "ailibrary=" + aiLibrary, "humanhand=" + humanHand, "humanlibrary=" + humanLibrary);
    }

    private static final String LIB20 = "Swamp;Mountain;Typhoid Rats;Grizzly Bears;Swamp;Hill Giant;Mountain;Swamp;"
            + "Lightning Bolt;Mountain;Swamp;Grizzly Bears;Mountain;Swamp;Typhoid Rats;Mountain;Swamp;Hill Giant;Mountain;Swamp";

    static void d416Scenarios(final List<String> castBoard) throws Exception {
        System.out.println("== ai-bench selftest: the opening-hand and target searches (D417, engine)");
        final List<String> flood = pregame("Swamp;Swamp;Swamp;Mountain;Mountain;Mountain;Swamp", LIB20,
                "Forest;Grizzly Bears;Forest;Llanowar Elves;Forest;Grizzly Bears;Forest",
                "Forest;Grizzly Bears;Forest;Forest;Llanowar Elves;Forest;Grizzly Bears;Forest;Forest;Grizzly Bears");
        final SearchConfig mull = SearchConfig.parse("anytime=1,seed=7,mull=1,mullms=3000");

        // 1. It fires at mulliganKeepHand, plays both answers out from the pre-game copy, and leaves the real game alone.
        scenario("search-mull-runs", flood, PolicyLobbyPlayerAi.Outlets.OFF, mull, (ai, pol) -> {
            final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
            final List<String> hand0 = names(ai.getCardsIn(ZoneType.Hand));
            final List<String> lib0 = names(ai.getCardsIn(ZoneType.Library));
            final List<String> opp0 = names(ai.getWeakestOpponent().getCardsIn(ZoneType.Hand));
            final long t0 = System.nanoTime();
            final boolean keep = ctl.mulliganKeepHand(ai, 0);
            final long ms = (System.nanoTime() - t0) / 1_000_000L;
            final java.util.Map<String, Integer> c = ctl.counts();
            check(c.getOrDefault("search.m.considered", 0) == 1 && c.getOrDefault("search.rollouts", 0) >= 2
                    && c.getOrDefault("search.rolloutErrors", 0) == 0 && c.getOrDefault("search.fallback.copyError", 0) == 0
                    && c.getOrDefault("search.fallback.unmappable", 0) == 0,
                    "the mulligan search ran: " + (keep ? "keep" : "mulligan") + ", " + ms + " ms (" + c + ")");
            check(ms < mull.mullMs + 3000, "inside the mulligan budget (" + ms + " ms for " + mull.mullMs + ")");
            check(names(ai.getCardsIn(ZoneType.Hand)).equals(hand0) && names(ai.getCardsIn(ZoneType.Library)).equals(lib0)
                    && names(ai.getWeakestOpponent().getCardsIn(ZoneType.Hand)).equals(opp0)
                    && ai.getGame().getPhaseHandler().getPhase() == null,
                    "the real game is untouched: the same hands, the same library order, still before turn 1");
        });

        // 2. A rollout's turn count: both candidates play past turn 1 (the horizon is game turn 2*mullturns).
        final int[] turns = {0, 0};
        scenario("search-mull-horizon", flood, PolicyLobbyPlayerAi.Outlets.OFF, mull, (ai, pol) -> {
            final mtgtable.ai.SearchPolicy.Limits lim = new mtgtable.ai.SearchPolicy.Limits(
                    System.nanoTime() + 20_000_000_000L, 2 * mull.mullTurns - 1, 20_000);
            final mtgtable.ai.SearchPolicy.Sink quiet = new mtgtable.ai.SearchPolicy.Sink() {
                @Override
                public void add(final String key, final int n) { }

                @Override
                public void event(final String text) { }
            };
            for (int k = 0; k < 2; k++) {
                final mtgtable.ai.SearchPolicy.Playout p = mtgtable.ai.SearchPolicy.playout(ai.getGame(), ai,
                        mtgtable.ai.SearchPolicy.mulliganCandForTest(k == 0, ai, 0), 11, lim, quiet, false, null);
                turns[k] = p == null ? -1 : p.over ? 99 : p.turns;
            }
            check((turns[0] >= 2 * mull.mullTurns - 1 || turns[0] == 99) && (turns[1] >= 2 * mull.mullTurns - 1 || turns[1] == 99),
                    "keep and mulligan rollouts play to game turn " + 2 * mull.mullTurns + " (turns past turn 1: keep "
                    + turns[0] + ", mulligan " + turns[1] + ")");
        });

        // 3. Never peeks: two games that differ only in what the AI cannot see (the opponent's hand/library
        //    split and order, the AI's own library order) give the same copies, seed for seed -- the hand a
        //    mulligan draws comes from the redealt library, and the opponent's hand is redealt too.
        final List<List<String>> seen = new ArrayList<>();
        final String[][] hidden = {
            {"Forest;Grizzly Bears;Forest;Llanowar Elves;Forest;Grizzly Bears;Forest",
             "Forest;Grizzly Bears;Forest;Forest;Llanowar Elves;Forest;Grizzly Bears;Forest;Forest;Grizzly Bears", LIB20},
            {"Grizzly Bears;Grizzly Bears;Grizzly Bears;Llanowar Elves;Llanowar Elves;Forest;Forest",
             "Forest;Forest;Forest;Forest;Forest;Forest;Forest;Forest;Grizzly Bears;Grizzly Bears",   // the same 17 cards as game 0
             String.join(";", reversed(LIB20.split(";")))},
        };
        for (int g = 0; g < 2; g++) {
            final List<String> board = pregame("Swamp;Swamp;Swamp;Mountain;Mountain;Mountain;Swamp", hidden[g][2],
                    hidden[g][0], hidden[g][1]);
            final List<String> out = new ArrayList<>();
            scenario("search-mull-nopeek-" + g, board, PolicyLobbyPlayerAi.Outlets.OFF, mull, (ai, pol) -> {
                final mtgtable.ai.SearchPolicy.Sink quiet = new mtgtable.ai.SearchPolicy.Sink() {
                    @Override
                    public void add(final String key, final int n) { }

                    @Override
                    public void event(final String text) { }
                };
                mtgtable.ai.SearchPolicy.probeForTest((copy, aiC) -> {
                    final Player oppC = aiC.getWeakestOpponent();
                    final List<String> mine = names(aiC.getCardsIn(ZoneType.Hand));
                    final List<String> theirs = names(oppC.getCardsIn(ZoneType.Hand));
                    java.util.Collections.sort(mine);
                    java.util.Collections.sort(theirs);
                    out.add(mine + " | " + theirs);
                });
                try {
                    for (long seed = 1; seed <= 12; seed++) {
                        mtgtable.ai.SearchPolicy.playout(ai.getGame(), ai, mtgtable.ai.SearchPolicy.mulliganCandForTest(false, ai, 0),
                                seed, new mtgtable.ai.SearchPolicy.Limits(System.nanoTime() + 20_000_000_000L, 0, 0), quiet, false, null);
                    }
                } finally {
                    mtgtable.ai.SearchPolicy.probeForTest(null);
                }
            });
            seen.add(out);
        }
        check(seen.size() == 2 && seen.get(0).size() == 12 && seen.get(0).equals(seen.get(1)),
                "a mulligan's copies depend on nothing hidden: the same 12 seeds give the same new hand and the same "
                + "opponent hand in both games" + (seen.get(0).isEmpty() ? "" : " (first: " + seen.get(0).get(0) + ")"));
        check(new java.util.HashSet<>(seen.get(0)).size() > 3, "and the seeds deal different hands ("
                + new java.util.HashSet<>(seen.get(0)).size() + " distinct of 12)");

        // 4. Falls back: a copier error keeps Forge's keep/mulligan, counted.
        final boolean[] forgeKeep = {false, false};
        scenario("search-mull-copy-fails", flood, PolicyLobbyPlayerAi.Outlets.OFF, mull, (ai, pol) -> {
            final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
            ctl.search().failCopyForTest(new RuntimeException("Couldn't map test"));
            forgeKeep[0] = ctl.mulliganKeepHand(ai, 0);
            forgeKeep[1] = !forge.ai.ComputerUtil.wantMulligan(ai, 0);
            check(forgeKeep[0] == forgeKeep[1] && ctl.counts().getOrDefault("search.fallback.copyError", 0) == 1,
                    "a copier error -> Forge's own " + (forgeKeep[1] ? "keep" : "mulligan") + ", counted (" + ctl.counts() + ")");
        });

        // 5. The London bottom: after a mulligan the bottom choice is searched among the hand's cards.
        scenario("search-bottom-runs", flood, PolicyLobbyPlayerAi.Outlets.OFF,
                SearchConfig.parse("anytime=1,seed=7,mull=1,mullms=2500"), (ai, pol) -> {
                    final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
                    ctl.search().failCopyForTest(new RuntimeException("skip the keep search"));
                    ctl.mulliganKeepHand(ai, 0);   // only to learn who starts, as Forge's mulligan service asks it first
                    ctl.search().failCopyForTest(null);
                    final forge.game.card.CardCollection hand = new forge.game.card.CardCollection(ai.getCardsIn(ZoneType.Hand));
                    final forge.game.card.CardCollectionView back = ctl.tuckCardsViaMulligan(hand, 1);
                    final java.util.Map<String, Integer> c = ctl.counts();
                    check(back != null && back.size() == 1 && hand.contains(back.get(0))
                            && c.getOrDefault("search.k.considered", 0) == 1 && c.getOrDefault("search.rolloutErrors", 0) == 0,
                            "the bottom search ran and put one card of the hand on the bottom: " + names(back) + " (" + c + ")");
                    check(ai.getCardsIn(ZoneType.Hand).size() == 7, "the real hand is untouched (the caller moves the card)");
                });

        // 6. Off by default: search-v2's config never searches a mulligan.
        scenario("search-mull-off", flood, PolicyLobbyPlayerAi.Outlets.OFF, SearchConfig.parse("anytime=1,seed=7"),
                (ai, pol) -> {
                    final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
                    ctl.mulliganKeepHand(ai, 0);
                    check(!ctl.counts().containsKey("search.m.considered") && !ctl.counts().containsKey("search.rollouts"),
                            "mull off: no mulligan search (" + ctl.counts() + ")");
                });

        // 7. Targets: Forge's sorcery removal at main 1; the target search rolls its target out against the others.
        final List<String> slash = List.of(
                "humanlife=20", "ailife=20", "turn=3", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Forest;Forest;Grizzly Bears;Hill Giant|Id:41", "humanhand=Lightning Bolt",
                "humanlibrary=Forest;Forest;Forest", "aihand=Flame Slash", "ailibrary=Mountain;Mountain;Mountain",
                "aibattlefield=Mountain;Mountain;Typhoid Rats");
        final SearchConfig tgt = SearchConfig.parse("ms=3000,anytime=1,seed=7,what=a,targets=1");
        scenario("search-targets-runs", slash, PolicyLobbyPlayerAi.Outlets.OFF, tgt, (ai, pol) -> {
            final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
            final List<forge.game.spellability.SpellAbility> pick = ctl.chooseSpellAbilityToPlay();
            final java.util.Map<String, Integer> c = ctl.counts();
            final mtgtable.ai.SearchPolicy.Report rep = ctl.search().takeTargetReport();
            final boolean cast = pick != null && pick.size() == 1 && "Flame Slash".equals(pick.get(0).getHostCard().getName());
            check(cast, "Forge casts Flame Slash (got " + pick + ")");
            if (cast) {
                final forge.game.GameObject t = pick.get(0).getTargets().get(0);
                check(c.getOrDefault("search.t.considered", 0) == 1 && rep != null && "t".equals(rep.kind)
                        && rep.cands.size() >= 2 && c.getOrDefault("search.rolloutErrors", 0) == 0,
                        "the target search ran: " + (rep == null ? "none" : rep.summary()) + " (" + c + ")");
                check(t instanceof Card && ((Card) t).isInZone(ZoneType.Battlefield) && ((Card) t).isCreature()
                        && pick.get(0).canTarget(t), "the play still has one legal target: " + t);
                boolean visible = rep != null;
                for (int i = 0; rep != null && i < rep.cands.size(); i++) {
                    final String tok = mtgtable.ai.SearchPolicy.token(rep.cands.get(i));
                    visible &= tok.matches("target:p?\\d+");
                }
                check(visible, "every candidate is a target the AI can see, by id");
                check(c.getOrDefault("search.p.considered", 0) == 0 && c.getOrDefault("search.a.considered", 0) == 0,
                        "only the target search ran (what=a: no priority search)");
            }
            check(ai.getWeakestOpponent().getCardsIn(ZoneType.Hand).size() == 1, "the real game is untouched");
        });

        // 8. Falls back: a copier error keeps Forge's target.
        scenario("search-targets-copy-fails", slash, PolicyLobbyPlayerAi.Outlets.OFF, tgt, (ai, pol) -> {
            final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
            ctl.search().failCopyForTest(new RuntimeException("Couldn't map test"));
            final List<forge.game.spellability.SpellAbility> pick = ctl.chooseSpellAbilityToPlay();
            check(pick != null && pick.size() == 1 && !pick.get(0).getTargets().isEmpty()
                    && ctl.counts().getOrDefault("search.fallback.copyError", 0) == 1
                    && ctl.counts().getOrDefault("search.t.changed", 0) == 0,
                    "a copier error -> Forge's own target (" + (pick == null ? "none" : pick.get(0).getTargets()) + ", "
                    + ctl.counts() + ")");
        });

        // 9. Only on targeted plays: Typhoid Rats has no target, so the target search never fires.
        scenario("search-targets-untargeted", castBoard, PolicyLobbyPlayerAi.Outlets.OFF, tgt, (ai, pol) -> {
            final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
            ctl.chooseSpellAbilityToPlay();
            check(!ctl.counts().containsKey("search.t.considered") && !ctl.counts().containsKey("search.rollouts"),
                    "no target, no target search (" + ctl.counts() + ")");
        });

        // 10. Off by default: the same Flame Slash with search-v2's config is never target-searched.
        scenario("search-targets-off", slash, PolicyLobbyPlayerAi.Outlets.OFF, SearchConfig.parse("ms=3000,anytime=1,seed=7,what=a"),
                (ai, pol) -> {
                    final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
                    ctl.chooseSpellAbilityToPlay();
                    check(!ctl.counts().containsKey("search.t.considered") && !ctl.counts().containsKey("search.rollouts"),
                            "targets off: no target search (" + ctl.counts() + ")");
                });
    }

    static String[] reversed(final String[] a) {
        final String[] r = new String[a.length];
        for (int i = 0; i < a.length; i++) {
            r[i] = a[a.length - 1 - i];
        }
        return r;

    }

    static boolean targets(final forge.game.spellability.SpellAbility sa, final Player p) {
        for (final Player t : sa.getTargets().getTargetPlayers()) {
            if (t == p) {
                return true;
            }
        }
        return false;
    }

    interface Body {
        void run(Player ai, OutletPolicy policy) throws Exception;
    }

    static void scenario(final String name, final List<String> state, final Body body) throws Exception {
        scenario(name, state, PolicyLobbyPlayerAi.Outlets.ON, body);
    }

    static void scenario(final String name, final List<String> state, final PolicyLobbyPlayerAi.Outlets mode,
                         final Body body) throws Exception {
        scenario(name, state, mode, null, body);
    }

    static void scenario(final String name, final List<String> state, final PolicyLobbyPlayerAi.Outlets mode,
                         final SearchConfig search, final Body body) throws Exception {
        final Deck lands = new Deck("lands");
        final PaperCard swamp = FModel.getMagicDb().getCommonCards().getCard("Swamp");
        final CardPool main = lands.getMain();
        main.add(swamp, 20);
        final RegisteredPlayer r0 = new RegisteredPlayer(lands);
        r0.setPlayer(Bootstrap.createAiSeat("Human", 0, Bootstrap.DEFAULT_AI_PROFILE, null, PolicyLobbyPlayerAi.Outlets.OFF));
        final RegisteredPlayer r1 = new RegisteredPlayer(lands);
        final PolicyLobbyPlayerAi aiLp = Bootstrap.createAiSeat("Ai", 1, Bootstrap.DEFAULT_AI_PROFILE, null, mode,
                search);
        r1.setPlayer(aiLp);
        final GameRules rules = new GameRules(GameType.Constructed);
        rules.setGamesPerMatch(1);
        final Match match = new Match(rules, List.of(r0, r1), "ai-bench-selftest");
        final Game game = match.createGame();
        final CountDownLatch done = new CountDownLatch(1);
        final Throwable[] fail = new Throwable[1];
        // One task on Forge's game pool at a time, and no match running (D309).
        game.getAction().invoke(() -> {
            try {
                final GameState gs = new GameState();
                gs.parse(state);
                gs.applyToGame(game);
                final Player ai = game.getPlayers().get(1);
                body.run(ai, new OutletPolicy(true));
            } catch (final Throwable t) {
                fail[0] = t;
            } finally {
                done.countDown();
            }
        });
        if (!done.await(60, TimeUnit.SECONDS)) {
            check(false, name + ": timed out");
        } else if (fail[0] != null) {
            fail[0].printStackTrace();
            check(false, name + ": threw " + fail[0]);
        }
    }

    /**
     * Recording the bench's games (D347): {@code play --record-all} or
     * {@code --record-every N} (game g of every pair whose g % N == 0) writes
     * each such game, while it is played, as two gzipped frame logs --
     * {@code <dir>/p<pair>-g<game>-seat0.jsonl.gz} and {@code -seat1}, each
     * seat's own redacted view -- through {@link SeatRecorder}, the cube lab's
     * recorder (D315): the same {@code Snap.state}, header and
     * {@code hello_ok.match}, and each seat's decision records in its own log
     * only.  {@code <dir>} is {@code --record-dir}, else {@code games/} beside
     * {@code --out} (the run folder).  The header's {@code bench} block names the
     * run, the pairs file, the pair, game, game seed, both seat configs and the
     * version stamp ({@code ver}, D341's fields for the bench's code paths:
     * {@code bridge/src}, {@code tools/ai-bench}, {@code forge-home}, and the
     * jar).  Off by default: a run without the flags writes what it always did.
     */
    static final class BenchRecording {
        static int every;
        static File dir;
        static String runName;
        static String pairsFile;
        private static String jarSha;
        private static Map<String, Object> version;

        final List<SeatRecorder> recorders = new ArrayList<>();
        final String rel;

        private BenchRecording(final String rel) {
            this.rel = rel;
        }

        /** {@code --record-all} / {@code --record-every N}: the record dir defaults to the run folder's {@code games/}. */
        static void configure(final int n, final String[] argv) {
            if (n < 1) {
                throw new IllegalArgumentException("--record-every wants N >= 1");
            }
            every = n;
            for (int i = 0; i + 1 < argv.length; i++) {
                if ("--out".equals(argv[i])) {
                    final File run = new File(argv[i + 1]).getAbsoluteFile().getParentFile();
                    runName = run.getName();
                    if (dir == null) {
                        dir = new File(run, "games");
                    }
                } else if ("--pairs".equals(argv[i])) {
                    pairsFile = argv[i + 1];
                }
            }
        }

        static BenchRecording start(final Game game, final int pi, final int g, final long gameSeed, final Cfg a,
                                    final Cfg b, final boolean aSeat0, final String aDeckPath, final String bDeckPath,
                                    final Map<String, Deck> decks) throws IOException {
            if (every <= 0 || g % every != 0) {
                return null;
            }
            if (dir == null) {
                throw new IllegalStateException("--record-* needs --out or --record-dir");
            }
            final Config cfg = Config.load();
            final String gameId = "bench-p" + pi + "-g" + g;
            final BenchRecording rec = new BenchRecording(gameId);
            final List<SeatRecorder.Seat> seats = new ArrayList<>();
            final Cfg[] cfgs = aSeat0 ? new Cfg[] {a, b} : new Cfg[] {b, a};
            final String[] paths = aSeat0 ? new String[] {aDeckPath, bDeckPath} : new String[] {bDeckPath, aDeckPath};
            for (int s = 0; s < 2; s++) {
                final File f = new File(paths[s]);
                final Deck d = decks.get(paths[s]);
                seats.add(new SeatRecorder.Seat(Bootstrap.deckName(d, f), f, relPath(cfg, f), d, cfgs[s].profile,
                        policyOf(cfgs[s]), cfgs[s].search == null ? null : cfgs[s].search.toString()));
            }
            final Map<String, Object> bench = new LinkedHashMap<>();
            bench.put("run", runName);
            bench.put("pairs", pairsFile);
            bench.put("pair", (long) pi);
            bench.put("game", (long) g);
            bench.put("gameSeed", gameSeed);
            bench.put("a", a.text);
            bench.put("b", b.text);
            bench.put("aSeat", (long) (aSeat0 ? 0 : 1));
            bench.putAll(version(cfg));
            for (int s = 0; s < 2; s++) {
                rec.recorders.add(SeatRecorder.attach(game, s, new File(dir, "p" + pi + "-g" + g + "-seat" + s + ".jsonl.gz"),
                        gameId, gameSeed, jarSha(cfg), seats, "bench", bench));
            }
            return rec;
        }

        static String policyOf(final Cfg c) {
            if (c.search != null) {
                return "search";
            }
            if (c.outlets == PolicyLobbyPlayerAi.Outlets.ON) {
                return "outlets";
            }
            return c.sim == null ? "forge" : "forge-" + (c.sim == AIOption.USE_FULL_SIMULATION ? "sim" : "hybrid");
        }

        static String relPath(final Config cfg, final File f) {
            final String root = cfg.root().getAbsolutePath() + File.separator;
            final String p = f.getAbsolutePath();
            return p.startsWith(root) ? p.substring(root.length()) : p;
        }

        void finish() {
            for (final SeatRecorder r : recorders) {
                r.finish();
            }
        }

        void crashed() {
            for (final SeatRecorder r : recorders) {
                r.crashed();
            }
        }

        /** Close both logs and say what was written in the game's JSON line. */
        void close(final Json.JsonOut j) {
            long bytes = 0;
            int decisions = 0;
            int errors = 0;
            for (final SeatRecorder r : recorders) {
                try {
                    r.close();
                } catch (final IOException e) {
                    errors++;
                    System.err.println("[ai-bench] recording " + r.file() + " failed: " + e);
                }
                bytes += r.bytes();
                decisions += r.decisions();
                errors += r.errors() + r.decisionErrors();
            }
            j.key("recorded").obj().n("dir", dir.getPath()).n("game", rel).n("bytes", bytes)
                    .n("decisions", decisions).n("errors", errors).end();
        }

        static synchronized String jarSha(final Config cfg) {
            if (jarSha == null) {
                jarSha = sha256File(cfg.forgeJar());
            }
            return jarSha.isEmpty() ? null : jarSha;
        }

        static String sha256File(final File f) {
            try {
                final java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
                try (java.io.InputStream in = Files.newInputStream(f.toPath())) {
                    final byte[] buf = new byte[1 << 16];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        md.update(buf, 0, n);
                    }
                }
                return hex(md.digest());
            } catch (final Exception e) {
                return "";
            }
        }

        static String hex(final byte[] b) {
            final StringBuilder sb = new StringBuilder(b.length * 2);
            for (final byte x : b) {
                sb.append(String.format(Locale.ROOT, "%02x", x));
            }
            return sb.toString();
        }

        static String sha256(final String s) {
            try {
                return hex(java.security.MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));
            } catch (final java.security.NoSuchAlgorithmException e) {
                throw new IllegalStateException(e);
            }
        }

        /** The paths whose code makes a bench game (D341's rule: the tree, not HEAD). */
        static final List<String> CODE_PATHS = List.of("bridge/src", "tools/ai-bench", "forge-home");

        /**
         * The bench's version stamp, D341's fields for its own code paths:
         * {@code gitSha} (recorded), {@code codeTree} (sha256 of {@code git
         * ls-tree -r HEAD} over {@link #CODE_PATHS}), {@code dirty} and
         * {@code diffSha} (uncommitted changes and new files there), the jar's
         * sha256, and {@code ver}, 12 hex of a hash over the compared fields.
         * Computed once per JVM.
         */
        static synchronized Map<String, Object> version(final Config cfg) {
            if (version != null) {
                return version;
            }
            final Map<String, Object> v = new LinkedHashMap<>();
            final File repo = cfg.root();
            String gitSha = null;
            String codeTree = null;
            String diffSha = null;
            boolean dirty = true;
            try {
                gitSha = git(repo, "rev-parse", "HEAD").trim();
                final List<String> ls = new ArrayList<>(List.of("ls-tree", "-r", "HEAD", "--"));
                ls.addAll(CODE_PATHS);
                codeTree = sha256(git(repo, ls.toArray(new String[0])));
                final List<String> st = new ArrayList<>(List.of("status", "--porcelain", "--"));
                st.addAll(CODE_PATHS);
                dirty = !git(repo, st.toArray(new String[0])).trim().isEmpty();
                if (dirty) {
                    final List<String> diff = new ArrayList<>(List.of("diff", "HEAD", "--"));
                    diff.addAll(CODE_PATHS);
                    final List<String> un = new ArrayList<>(List.of("ls-files", "--others", "--exclude-standard", "--"));
                    un.addAll(CODE_PATHS);
                    final StringBuilder sb = new StringBuilder(git(repo, diff.toArray(new String[0])));
                    for (final String f : git(repo, un.toArray(new String[0])).split("\n")) {
                        if (!f.isBlank()) {
                            sb.append('\0').append(f).append('\0').append(sha256File(new File(repo, f)));
                        }
                    }
                    diffSha = sha256(sb.toString()).substring(0, 16);
                }
            } catch (final IOException | RuntimeException e) {
                System.err.println("[ai-bench] no git version stamp: " + e);
            }
            final String jar = jarSha(cfg);
            v.put("gitSha", gitSha);
            v.put("codeTree", codeTree);
            v.put("dirty", dirty ? 1L : 0L);
            v.put("diffSha", diffSha);
            v.put("forgeJarSha256", jar);
            v.put("ver", sha256(String.join("|", String.valueOf(codeTree), String.valueOf(dirty),
                    String.valueOf(diffSha), String.valueOf(jar))).substring(0, 12));
            version = v;
            return v;
        }

        static String git(final File repo, final String... args) throws IOException {
            final List<String> cmd = new ArrayList<>();
            cmd.add("git");
            cmd.add("-C");
            cmd.add(repo.getPath());
            cmd.addAll(Arrays.asList(args));
            final Process p = new ProcessBuilder(cmd).redirectErrorStream(false).start();
            final byte[] out = p.getInputStream().readAllBytes();
            try {
                if (p.waitFor() != 0) {
                    throw new IOException("git " + String.join(" ", args) + " exited " + p.exitValue());
                }
            } catch (final InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IOException(e);
            }
            return new String(out, StandardCharsets.UTF_8);
        }

        /** The JVM's CPU time, every thread (0 where the platform will not say). */
        static long processCpuNanos() {
            final java.lang.management.OperatingSystemMXBean os =
                    java.lang.management.ManagementFactory.getOperatingSystemMXBean();
            return os instanceof com.sun.management.OperatingSystemMXBean
                    ? ((com.sun.management.OperatingSystemMXBean) os).getProcessCpuTime() : 0L;
        }
    }
}
