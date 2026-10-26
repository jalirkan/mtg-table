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
        distillScenarios();
    }

    // ------------------------------------------------------------------
    // J126 (B1): the row exporter on a searching seat, and the distilled
    // policy (fixtures/distill/model.json, a seeded model: covers p and a)
    // deciding with no rollout -- and never exporting rows of its own.
    // ------------------------------------------------------------------

    static void distillScenarios() throws Exception {
        System.out.println("== ai-bench selftest: the distilled policy and its row exporter (J126, engine)");
        final List<String> castBoard = List.of(
                "humanlife=20", "ailife=20", "turn=3", "activeplayer=ai", "activephase=MAIN2",
                "humanbattlefield=Forest", "humanhand=Lightning Bolt", "humanlibrary=Forest;Forest;Forest",
                "aihand=Typhoid Rats", "ailibrary=Swamp;Swamp;Swamp", "aibattlefield=Swamp|Id:30");
        final List<String> attackBoard = List.of(
                "humanlife=4", "ailife=20", "turn=5", "activeplayer=ai", "activephase=COMBAT_DECLARE_ATTACKERS",
                "humanbattlefield=Forest", "humanlibrary=Forest;Forest;Forest", "ailibrary=Swamp;Swamp;Swamp",
                "aibattlefield=Grizzly Bears;Grizzly Bears;Forest");
        final java.nio.file.Path rows = Files.createTempDirectory("ai-bench-distill-rows");
        try {
            // 1. search-v2 (the anytime search) with the exporter on: one row per searched decision.
            mtgtable.ai.DistillRows.enableForTest(rows);
            mtgtable.ai.DistillRows.setGame("selftest:rows");
            scenario("distill-rows-p", castBoard, PolicyLobbyPlayerAi.Outlets.OFF,
                    SearchConfig.parse("ms=3000,rounds=1,seed=7,anytime=1"), (ai, pol) -> {
                        final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
                        ctl.chooseSpellAbilityToPlay();
                        check(ctl.counts().getOrDefault("distill.rows", 0) == 1
                                && ctl.counts().getOrDefault("search.p.us", 0) > 0,
                                "the search's decision is one row, and timed (" + ctl.counts() + ")");
                    });
            scenario("distill-rows-a", attackBoard, PolicyLobbyPlayerAi.Outlets.OFF,
                    SearchConfig.parse("ms=3000,rounds=1,seed=7,anytime=1,what=a"), (ai, pol) -> {
                        final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
                        final forge.game.combat.Combat combat = new forge.game.combat.Combat(ai);
                        ai.getGame().getPhaseHandler().setCombat(combat);
                        combat.initConstraints();
                        ctl.declareAttackers(ai, combat);
                        check(ctl.counts().getOrDefault("distill.rows", 0) == 1, "the attack is one row (" + ctl.counts() + ")");
                    });
            mtgtable.ai.DistillRows.endGame("selftest:rows", null, true);
            mtgtable.ai.DistillRows.close();
            final List<String> lines = Files.readAllLines(mtgtable.ai.DistillRows.file(rows), StandardCharsets.UTF_8);
            check(lines.size() == 4, "header, two rows, end (" + lines.size() + " lines)");
            if (lines.size() == 4) {
                final Map<?, ?> h = (Map<?, ?>) Json.parse(lines.get(0));
                final Map<?, ?> p = (Map<?, ?>) Json.parse(lines.get(1));
                final Map<?, ?> a = (Map<?, ?>) Json.parse(lines.get(2));
                final int size = ((Number) h.get("stateSize")).intValue();
                final Object[] pc = (Object[]) p.get("c");
                check("header".equals(h.get("type")) && size == mtgtable.ai.DistillFeatures.stateSchema().size(),
                        "the header names the layout (" + size + " state features)");
                check("p".equals(p.get("kind")) && "selftest:rows".equals(p.get("game")) && pc.length == 2
                        && ((Object[]) pc[0]).length == mtgtable.ai.DistillFeatures.P_NAMES.size()
                        && ((Number) ((Object[]) pc[0])[0]).intValue() == 1 && ((Number) ((Object[]) pc[1])[1]).intValue() == 1
                        && ((Object[]) p.get("s")).length > 10,
                        "the priority row: Typhoid Rats (Forge's) and pass, the state sparse: " + lines.get(1).substring(0, 120));
                check("a".equals(a.get("kind")) && ((Object[]) a.get("c")).length >= 2
                        && ((Number) a.get("chosen")).intValue() < ((Object[]) a.get("c")).length,
                        "the attack row: " + ((Object[]) a.get("c")).length + " declarations, played " + a.get("chosen"));
            }

            // 2. The distilled policy on the same boards: scored, played, no rollout, no row of its own.
            final String model = "fixtures/distill/model.json";
            scenario("distill-runs-p", castBoard, PolicyLobbyPlayerAi.Outlets.OFF,
                    SearchConfig.parse("seed=7,anytime=1,distill=" + model), (ai, pol) -> {
                        final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
                        final long t0 = System.nanoTime();
                        final List<forge.game.spellability.SpellAbility> pick = ctl.chooseSpellAbilityToPlay();
                        final long us = (System.nanoTime() - t0) / 1000L;
                        final Map<String, Integer> c = ctl.counts();
                        check(c.getOrDefault("search.p.considered", 0) == 1 && c.getOrDefault("distill.p.scored", 0) == 1
                                && !c.containsKey("search.rollouts") && !c.containsKey("distill.rows"),
                                "scored by the model, no rollout, no row (" + c + ")");
                        check(pick == null || "Typhoid Rats".equals(pick.get(0).getHostCard().getName()),
                                "it plays Typhoid Rats or passes (got " + pick + ", " + us + " us)");
                        final mtgtable.ai.SearchPolicy.Report rep = ctl.search().peekReport();
                        check(rep != null && "distill".equals(rep.rule) && rep.prior.length == 2 && rep.chosen >= 0,
                                "its report: rule distill, two scores, a verdict");
                    });
            scenario("distill-runs-a", attackBoard, PolicyLobbyPlayerAi.Outlets.OFF,
                    SearchConfig.parse("seed=7,anytime=1,what=a,distill=" + model), (ai, pol) -> {
                        final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
                        final forge.game.combat.Combat combat = new forge.game.combat.Combat(ai);
                        ai.getGame().getPhaseHandler().setCombat(combat);
                        combat.initConstraints();
                        ctl.declareAttackers(ai, combat);
                        final Map<String, Integer> c = ctl.counts();
                        check(c.getOrDefault("distill.a.scored", 0) == 1 && !c.containsKey("search.rollouts")
                                && forge.game.combat.CombatUtil.validateAttackers(combat),
                                "the attack scored by the model, a legal declaration (" + c + ")");
                    });
            check(Files.readAllLines(mtgtable.ai.DistillRows.file(rows), StandardCharsets.UTF_8).size() == 4,
                    "the distilled seat wrote no row");
        } finally {
            mtgtable.ai.DistillRows.enableForTest(null);
            for (final java.io.File f : rows.toFile().listFiles()) {
                Files.deleteIfExists(f.toPath());
            }
            Files.deleteIfExists(rows);
        }
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
        evalLeafScenarios();
        karnRestartScenarios();
        cappedDrawScenarios();
        unitOptionsScenarios();
        engineDrawScenarios();
        d416Scenarios(castBoard);
        stepClockScenario();
        forcedBlockScenarios();
        altCostScenarios();
        staleEffectScenarios();
        adventureScenarios();
        mayPlayShapeScenarios();
        copierCarryScenarios();
        chooseSourceScenarios();
        staleTargetScenarios();
        modalCastTargetsScenario();
        cardTargetScenarios();
        modalScenarios();
        targetCostScenarios();
    }

    /**
     * D484: a Circle of Protection's source, chosen by our seat when Forge
     * 2.0.14's {@code ChooseSourceAi} would answer forever with null or a divider
     * card.  J167's spine s05 hung every unit on it.  The AI seat (B) controls
     * Circle of Protection: Green and activates it with nothing to prevent;
     * the stack then resolves through {@code PhaseHandler.mainLoopStep}, on the
     * scenario's game thread, which the self-test waits for {@value #D484_WAIT_S}
     * seconds at most: a regression fails here instead of hanging the build.
     * (a) the only green source is the opponent's Lifeforce (Forge: null); (b)
     * the only green sources are B's own creatures (Forge: the divider, the one
     * element left); (c) control, an opposing green creature: Forge's own answer,
     * and the guard never acts.
     */
    static final int D484_WAIT_S = 10;

    static void chooseSourceScenarios() throws Exception {
        System.out.println("== ai-bench selftest: a Circle of Protection's source, never null or a divider (D484, engine)");
        chooseSource("choose-source-null", "humanbattlefield=Lifeforce;Forest", "aibattlefield=Circle of Protection: Green;Plains;Plains",
                "Lifeforce", 1);
        chooseSource("choose-source-divider", "humanbattlefield=Plains",
                "aibattlefield=Circle of Protection: Green;Grizzly Bears;Plains;Plains", "Grizzly Bears", 1);
        chooseSource("choose-source-forge", "humanbattlefield=Grizzly Bears;Forest",
                "aibattlefield=Circle of Protection: Green;Plains;Plains", "Grizzly Bears", 0);
    }

    private static void chooseSource(final String name, final String human, final String aiBoard, final String want,
                                      final int guarded) throws Exception {
        scenario(name, List.of("humanlife=20", "ailife=20", "turn=4", "activeplayer=ai", "activephase=MAIN1", human,
                        aiBoard),
                PolicyLobbyPlayerAi.Outlets.OFF, null, D484_WAIT_S, (ai, pol) -> {
                    final Game g = ai.getGame();
                    final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
                    final Card cop = named(ai.getCardsIn(ZoneType.Battlefield), "Circle of Protection: Green");
                    forge.game.spellability.SpellAbility ab = null;
                    for (final forge.game.spellability.SpellAbility sa : cop.getSpellAbilities()) {
                        if (sa.getApi() == forge.game.ability.ApiType.ChooseSource) {
                            ab = sa;
                        }
                    }
                    check(ab != null, name + ": Circle of Protection: Green has its ChooseSource ability");
                    if (ab == null) {
                        return;
                    }
                    ab.setActivatingPlayer(ai);
                    check(forge.ai.ComputerUtil.handlePlayingSpellAbility(ai, ab, null) && !g.getStack().isEmpty(),
                            name + ": the seat activates the Circle (on the stack)");
                    final forge.game.phase.PhaseHandler ph = g.getPhaseHandler();
                    int steps = 0;
                    while (!g.getStack().isEmpty() && steps < 20) {
                        ph.mainLoopStep();   // both seats pass, the Circle's ability resolves: J167's frame
                        steps++;
                    }
                    check(g.getStack().isEmpty(), name + ": the stack resolved through mainLoopStep (" + steps + " steps)");
                    final int count = ctl.counts().getOrDefault(PolicyControllerAi.CHOOSE_SOURCE_GUARD, 0);
                    String chose = null;
                    for (final String e : ctl.events()) {
                        if (e.contains("ChooseSource:")) {
                            chose = e;
                        }
                    }
                    final Card wanted = named(g.getCardsIn(ZoneType.Battlefield), want);
                    check(count == guarded && (guarded == 0 ? chose == null : chose != null && chose.endsWith("#" + wanted.getId())),
                            name + ": the guard answered " + count + " time(s) (want " + guarded + "), " + want + " #"
                                    + wanted.getId() + " (" + chose + ")");
                    // the Circle's effect exists only when a real source was chosen (ConditionDefined$ ChosenCard)
                    boolean effect = false;
                    for (final Card c : ai.getCardsIn(ZoneType.Command)) {
                        effect |= c.getName().contains("Circle of Protection");
                    }
                    check(effect, name + ": the Circle's prevention effect is in its controller's command zone");
                });
    }

    /**
     * D485: the random seat never hands the engine an illegal targeting.  J168:
     * Forge's {@code FightAi} appends Troll Negotiations' "creature you
     * control" target at every evaluation, so Forge's own answer can carry a
     * dead creature and one target too many; the random seat played that answer
     * as it was, and the engine moved the card to the stack, took the mana and
     * dropped the spell ({@code MagicStack.add}: "Couldn't add to stack, failed
     * to target").  Planted here: the seat's Llanowar Elves and Grizzly Bears
     * both targeted (one more than the part's maximum), the fight aimed at the
     * opponent's Hill Giant, then the Elves put into the graveyard.  (a) The
     * control: Forge's own hand-off strands the card, as J168's 1,346 lines
     * did.  (b) The random seat, given that list as Forge's answer: when it
     * picks the play, the Elves are dropped and the spell is on the stack with
     * the Bears alone, with nothing printed; when it does not, the play gets
     * Forge's list back.  (c) With no creature of its own left, the play
     * cannot be made legal: it is never offered (G5's refused play, once, and
     * left out after), and the card stays in hand.
     */
    static void staleTargetScenarios() throws Exception {
        System.out.println("== ai-bench selftest: stale targets on Forge's answer, never handed to the engine (D485, engine)");
        final List<String> board = List.of("humanlife=20", "ailife=20", "turn=4", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Hill Giant;Mountain", "aihand=Troll Negotiations",
                "aibattlefield=Grizzly Bears;Llanowar Elves;Forest;Forest;Forest;Forest");
        scenario("stale-targets-forge", board, PolicyLobbyPlayerAi.Outlets.OFF, null, 10, (ai, pol) -> {
            final forge.game.spellability.SpellAbility sa = plantStale(ai, false);
            final Card troll = sa.getHostCard();
            final String err = stderrOf(() -> forge.ai.ComputerUtil.handlePlayingSpellAbility(ai, sa, null));
            check(err.contains("failed to target") && strandedOnStack(ai.getGame(), sa),
                    "stale-targets-forge (control): Forge's own hand-off of the stale list strands the card in the stack zone "
                            + "with no stack item (" + troll.getZone() + ")");
        });
        scenario("stale-targets-seat", board, PolicyLobbyPlayerAi.Outlets.OFF, null, 10, (ai, pol) -> {
            final Game g = ai.getGame();
            final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
            final forge.game.spellability.SpellAbility sa = plantStale(ai, false);
            final Card troll = sa.getHostCard();
            final Card bears = named(ai.getCardsIn(ZoneType.Battlefield), "Grizzly Bears");
            final String tok = mtgtable.ai.Decisions.saToken(sa);
            final forge.game.spellability.TargetChoices stale = sa.getTargets().clone();
            List<forge.game.spellability.SpellAbility> pick = null;
            mtgtable.ai.Explorer ex = null;
            boolean restored = true;
            int tries = 0;
            int passes = 0;
            for (long seed = 1; seed <= 60 && pick == null; seed++) {
                ex = new mtgtable.ai.Explorer(new mtgtable.ai.ExploreMath(mtgtable.ai.ExploreMath.Config.randomSeat(), seed));
                ctl.setExplorer(ex);
                final List<forge.game.spellability.SpellAbility> r = ex.priority(ai, ctl.getAi(), new ArrayList<>(List.of(sa)));
                tries++;
                if (r != null && !r.isEmpty() && tok.equals(mtgtable.ai.Decisions.saToken(r.get(0)))) {
                    if (passes == 0) {
                        sa.setTargets(stale.clone());   // picked before any pass: plant it again, so a pass is seen first
                        continue;
                    }
                    pick = r;
                } else {
                    passes++;
                    // not picked: Forge's own list is put back, the same objects in the same order
                    restored &= sa.getTargets().size() == stale.size() && sa.getTargets().get(0) == stale.get(0)
                            && sa.getTargets().get(1) == stale.get(1);
                }
            }
            check(pick != null && pick.get(0) == sa, "stale-targets-seat: the seat picks Forge's answer (" + tries + " seeds)" + (pick == null && ex != null ? " " + ex.math().guardrails() : ""));
            if (pick == null) {
                return;
            }
            check(restored && passes > 0, "stale-targets-seat: each of the " + passes + " listing(s) that did not pick it put Forge's two targets back");
            check(sa.getTargets().size() == 1 && sa.getTargets().get(0) == bears && sa.isTargetNumberValid(),
                    "stale-targets-seat: the dead Elves dropped, the Bears kept: " + sa.getTargets());
            check(ex.takeRetargeted() && ex.math().guardrails().getOrDefault("retargeted", 0) == 1,
                    "stale-targets-seat: the pick is marked for the record (STALE_TARGETS) and counted once: " + ex.math().guardrails());
            final List<forge.game.spellability.SpellAbility> chosen = pick;
            final String err = stderrOf(() -> ctl.playChosenSpellAbility(chosen.get(0)));
            check(!err.contains("failed to target") && g.getStack().getSpellMatchingHost(troll) != null,
                    "stale-targets-seat: Troll Negotiations is on the stack, cast legally, nothing printed" + (err.isEmpty() ? "" : " (" + err.trim() + ")"));
        });
        scenario("stale-targets-refused", board, PolicyLobbyPlayerAi.Outlets.OFF, null, 10, (ai, pol) -> {
            final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
            final forge.game.spellability.SpellAbility sa = plantStale(ai, true);
            final forge.game.spellability.TargetChoices staleList = sa.getTargets().clone();
            final Card troll = sa.getHostCard();
            final String tok = mtgtable.ai.Decisions.saToken(sa);
            final mtgtable.ai.Explorer ex = new mtgtable.ai.Explorer(new mtgtable.ai.ExploreMath(
                    mtgtable.ai.ExploreMath.Config.randomSeat(), 3));
            ctl.setExplorer(ex);
            boolean never = true;
            for (int i = 0; i < 30; i++) {
                final List<forge.game.spellability.SpellAbility> r = ex.priority(ai, ctl.getAi(), new ArrayList<>(List.of(sa)));
                never &= r == null || r.isEmpty() || !tok.equals(mtgtable.ai.Decisions.saToken(r.get(0)));
            }
            final Map<String, Integer> gr = ex.math().guardrails();
            check(never && gr.getOrDefault("staleRefused", 0) == 30 && gr.getOrDefault("refusedCast", 0) == 1
                    && gr.getOrDefault("noRepeatRefused", 0) == 29 && gr.getOrDefault("retargeted", 0) == 0,
                    "stale-targets-refused: with no creature of its own left the play is never offered, refused once in "
                            + "the window and left out after: " + gr);
            check(troll.getZone() != null && troll.getZone().is(ZoneType.Hand) && sa.getTargets().size() == 2
                    && sa.getTargets().get(0) == staleList.get(0) && sa.getTargets().get(1) == staleList.get(1),
                    "stale-targets-refused: the card stays in hand, and Forge's own list is left as Forge left it");
        });
    }



    /**
     * D486: the random seat targets cards.  {@code getAllCandidates(sa, true)}
     * is the players alone (its flag is {@code onlyNonCard}), and the seat's own
     * listing, its target redraw and the target records all passed {@code true}:
     * a play that must target a card was never the seat's own pick.  (a) Murder
     * with the opponent's Grizzly Bears: the seat's own listing offers it with
     * the Bears as its target and casts it; with the old call
     * ({@code Explorer.playersOnlyForTest}) it is never offered.  (b) Beside a
     * hexproof Gladecover Scout and a White Knight (protection from black): the
     * Bears are the only target ever drawn, and the target record lists them
     * alone, complete.
     */
    static void cardTargetScenarios() throws Exception {
        System.out.println("== ai-bench selftest: the random seat targets cards (D486, engine)");
        final List<String> board = List.of("humanlife=20", "ailife=20", "turn=4", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Grizzly Bears;Swamp", "aihand=Murder", "aibattlefield=Swamp;Swamp;Swamp");
        scenario("card-target-offered", board, PolicyLobbyPlayerAi.Outlets.OFF, null, 20, (ai, pol) -> {
            final Game g = ai.getGame();
            final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
            final Card murder = named(ai.getCardsIn(ZoneType.Hand), "Murder");
            final Card bears = named(ai.getWeakestOpponent().getCardsIn(ZoneType.Battlefield), "Grizzly Bears");
            final forge.game.spellability.SpellAbility sa = murder.getFirstSpellAbility();
            sa.setActivatingPlayer(ai);
            final String tok = mtgtable.ai.Decisions.saToken(sa);
            final List<forge.game.GameEntity> old = sa.getTargetRestrictions().getAllCandidates(sa, true);
            final List<forge.game.GameEntity> all = sa.getTargetRestrictions().getAllCandidates(sa, false);
            check(old.isEmpty() && all.contains(bears),
                    "card-target-offered: Forge's getAllCandidates(sa, true) is the players alone (" + old + "), (sa, false) has the Bears (" + all + ")");
            // the old flag: never offered
            mtgtable.ai.Explorer.playersOnlyForTest(true);
            int oldOffers = 0;
            try {
                for (long seed = 1; seed <= 40; seed++) {
                    final mtgtable.ai.Explorer ex = new mtgtable.ai.Explorer(new mtgtable.ai.ExploreMath(
                            mtgtable.ai.ExploreMath.Config.randomSeat(), seed));
                    final List<forge.game.spellability.SpellAbility> r = ex.priority(ai, ctl.getAi(), null);
                    oldOffers += r != null && !r.isEmpty() && tok.equals(mtgtable.ai.Decisions.saToken(r.get(0))) ? 1 : 0;
                    oldOffers += ex.math().guardrails().getOrDefault("cardTargetOffered", 0);
                }
            } finally {
                mtgtable.ai.Explorer.playersOnlyForTest(false);
            }
            check(oldOffers == 0, "card-target-offered (control): with the old players-only call Murder is never picked in 40 listings ("
                    + oldOffers + ")");
            List<forge.game.spellability.SpellAbility> pick = null;
            int listings = 0;
            int counted = 0;
            boolean targetsOk = true;
            for (long seed = 1; seed <= 40 && pick == null; seed++) {
                final mtgtable.ai.Explorer ex = new mtgtable.ai.Explorer(new mtgtable.ai.ExploreMath(
                        mtgtable.ai.ExploreMath.Config.randomSeat(), seed));
                ctl.setExplorer(ex);
                final List<forge.game.spellability.SpellAbility> r = ex.priority(ai, ctl.getAi(), null);
                listings++;
                counted += ex.math().guardrails().getOrDefault("cardTargetOffered", 0);
                if (r != null && !r.isEmpty() && tok.equals(mtgtable.ai.Decisions.saToken(r.get(0)))) {
                    pick = r;
                    targetsOk = sa.getTargets().size() == 1 && sa.getTargets().get(0) == bears;
                }
            }
            check(pick != null && targetsOk, "card-target-offered: the seat's own listing picks Murder aimed at the Bears ("
                    + listings + " listing(s)): " + sa.getTargets());
            check(counted == listings, "card-target-offered: every listing counted a play only a card target makes possible ("
                    + counted + " of " + listings + ")");
            if (pick == null) {
                return;
            }
            final forge.game.spellability.SpellAbility cast = pick.get(0);
            final String err = stderrOf(() -> ctl.playChosenSpellAbility(cast));
            check(!err.contains("failed to target") && g.getStack().getSpellMatchingHost(murder) != null,
                    "card-target-offered: Murder is on the stack aimed at the Bears, nothing printed" + (err.isEmpty() ? "" : " (" + err.trim() + ")"));
        });
        final List<String> guarded = List.of("humanlife=20", "ailife=20", "turn=4", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Grizzly Bears;Gladecover Scout;White Knight;Swamp", "aihand=Murder", "aibattlefield=Swamp;Swamp;Swamp");
        scenario("card-target-hexproof", guarded, PolicyLobbyPlayerAi.Outlets.OFF, null, 20, (ai, pol) -> {
            final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
            final Card murder = named(ai.getCardsIn(ZoneType.Hand), "Murder");
            final Card bears = named(ai.getWeakestOpponent().getCardsIn(ZoneType.Battlefield), "Grizzly Bears");
            final forge.game.spellability.SpellAbility sa = murder.getFirstSpellAbility();
            sa.setActivatingPlayer(ai);
            final String tok = mtgtable.ai.Decisions.saToken(sa);
            int picks = 0;
            final java.util.Set<String> drawn = new java.util.TreeSet<>();
            for (long seed = 1; seed <= 60; seed++) {
                final mtgtable.ai.Explorer ex = new mtgtable.ai.Explorer(new mtgtable.ai.ExploreMath(
                        mtgtable.ai.ExploreMath.Config.randomSeat(), seed));
                ctl.setExplorer(ex);
                final List<forge.game.spellability.SpellAbility> r = ex.priority(ai, ctl.getAi(), null);
                if (r != null && !r.isEmpty() && tok.equals(mtgtable.ai.Decisions.saToken(r.get(0)))) {
                    picks++;
                    for (final forge.game.GameObject o : sa.getTargets()) {
                        drawn.add(o instanceof Card ? ((Card) o).getName() : String.valueOf(o));
                    }
                    ex.played(ai, sa, true);   // as if refused: the listing's targets are put back for the next seed
                }
            }
            check(picks >= 3 && drawn.equals(java.util.Set.of("Grizzly Bears")),
                    "card-target-hexproof: in " + picks + " pick(s) of Murder the only target drawn is the Bears: " + drawn);
            sa.resetTargets();
            sa.getTargets().add(bears);
            final List<mtgtable.ai.Decision> recs = mtgtable.ai.Decisions.targets(sa, ai, "targets");
            check(recs.size() == 1 && recs.get(0).options.equals(List.of("target:" + bears.getId())) && recs.get(0).complete,
                    "card-target-hexproof: the target record lists the Bears alone, complete (no Scout, no Knight): "
                            + (recs.isEmpty() ? "none" : recs.get(0).options + " complete=" + recs.get(0).complete));
        });
    }

    /**
     * D488: the random seat's targets fit the play's cost.  (a) Fireball ("{1}
     * more for each target beyond the first") with three Mountains and five
     * legal targets: every pick the seat makes is payable as drawn
     * ({@code canPayCost}), some picks had their count cut
     * ({@code targetCountTrimmed}), and a pick goes on the stack with nothing
     * printed; the control, the seat with the fit switched off
     * ({@code Explorer.fitOffForTest}), picks a count it cannot pay, and the
     * payment prints "Didn't find what to pay for" and is refused (J171's s09).
     * (b) Bone Shards (sacrifice a creature or discard a card) with the seat's
     * Grizzly Bears its only creature and none of the opponent's: the
     * sacrifice version never targets the Bears; the control targets them and
     * Forge's AI payment, which never sacrifices the spell's own target
     * ({@code paymentChoicesWithoutTargets}), refuses it (J171's s13).  (c) With
     * Llanowar Elves beside the Bears: a sacrifice pick targets one, the cast
     * sacrifices the other and the target is still there.
     */
    static void targetCostScenarios() throws Exception {
        System.out.println("== ai-bench selftest: the random seat's targets fit the play's cost (D488, engine)");
        final List<String> fire = List.of("humanlife=20", "ailife=20", "turn=4", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Grizzly Bears;Hill Giant;Llanowar Elves;Mountain", "aihand=Fireball",
                "aibattlefield=Mountain;Mountain;Mountain");
        scenario("target-cost-fireball-control", fire, PolicyLobbyPlayerAi.Outlets.OFF, null, 20, (ai, pol) -> {
            final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
            final Card fireball = named(ai.getCardsIn(ZoneType.Hand), "Fireball");
            final String tok = mtgtable.ai.Decisions.saToken(fireball.getFirstSpellAbility());
            mtgtable.ai.Explorer.fitOffForTest(true);
            try {
                forge.game.spellability.SpellAbility bad = null;
                mtgtable.ai.Explorer ex = null;
                for (long seed = 1; seed <= 200 && bad == null; seed++) {
                    ex = new mtgtable.ai.Explorer(new mtgtable.ai.ExploreMath(mtgtable.ai.ExploreMath.Config.randomSeat(), seed));
                    ctl.setExplorer(ex);
                    final List<forge.game.spellability.SpellAbility> r = ex.priority(ai, ctl.getAi(), null);
                    if (r != null && !r.isEmpty() && tok.equals(mtgtable.ai.Decisions.saToken(r.get(0)))) {
                        if (!forge.ai.ComputerUtilCost.canPayCost(r.get(0), ai, false)) {
                            bad = r.get(0);
                        } else {
                            ex.played(ai, r.get(0), true);   // put back for the next seed
                        }
                    }
                }
                check(bad != null, "target-cost-fireball-control: with the fit off the seat picks Fireball with a target count it cannot pay");
                if (bad == null) {
                    return;
                }
                final int n = bad.getTargets().size();
                final Integer x = bad.getXManaCostPaid();
                final forge.game.spellability.SpellAbility cast = bad;
                final mtgtable.ai.Explorer seat = ex;
                final String out = outputOf(() -> ctl.playChosenSpellAbility(cast));
                check(out.contains("Didn't find what to pay for") && seat.math().guardrails().getOrDefault("refusedCast", 0) == 1
                                && fireball.getZone() != null && fireball.getZone().is(ZoneType.Hand),
                        "target-cost-fireball-control: its " + n + " target(s) at X=" + x
                                + " are refused at the payment (G5; D466 puts the card back): " + seat.math().guardrails());
            } finally {
                mtgtable.ai.Explorer.fitOffForTest(false);
            }
        });
        scenario("target-cost-fireball", fire, PolicyLobbyPlayerAi.Outlets.OFF, null, 20, (ai, pol) -> {
            final Game g = ai.getGame();
            final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
            final Card fireball = named(ai.getCardsIn(ZoneType.Hand), "Fireball");
            final String tok = mtgtable.ai.Decisions.saToken(fireball.getFirstSpellAbility());
            int picks = 0;
            int trimmed = 0;
            boolean payable = true;
            final java.util.Set<Integer> counts = new java.util.TreeSet<>();
            long castSeed = -1;
            for (long seed = 1; seed <= 200; seed++) {
                final mtgtable.ai.Explorer ex = new mtgtable.ai.Explorer(new mtgtable.ai.ExploreMath(
                        mtgtable.ai.ExploreMath.Config.randomSeat(), seed));
                ctl.setExplorer(ex);
                final List<forge.game.spellability.SpellAbility> r = ex.priority(ai, ctl.getAi(), null);
                if (r != null && !r.isEmpty() && tok.equals(mtgtable.ai.Decisions.saToken(r.get(0)))) {
                    picks++;
                    final int cut = ex.math().guardrails().getOrDefault("targetCountTrimmed", 0);
                    trimmed += cut;
                    counts.add(r.get(0).getTargets().size());
                    payable &= forge.ai.ComputerUtilCost.canPayCost(r.get(0), ai, false);
                    if (cut > 0 && r.get(0).getTargets().size() > 1 && castSeed < 0) {
                        castSeed = seed;   // a cut pick that still holds two targets or more: the one cast below
                    }
                }
                if (r != null && !r.isEmpty()) {
                    ex.played(ai, r.get(0), true);   // as if refused: X and targets put back for the next seed
                }
            }
            check(picks >= 10 && payable && trimmed > 0 && trimmed < picks && castSeed > 0,
                    "target-cost-fireball: every one of " + picks + " picks is payable as drawn; " + trimmed
                            + " had their count cut; counts " + counts);
            if (castSeed < 0) {
                return;
            }
            final mtgtable.ai.Explorer again = new mtgtable.ai.Explorer(new mtgtable.ai.ExploreMath(
                    mtgtable.ai.ExploreMath.Config.randomSeat(), castSeed));
            ctl.setExplorer(again);
            final List<forge.game.spellability.SpellAbility> last = again.priority(ai, ctl.getAi(), null);
            final forge.game.spellability.SpellAbility cast = last.get(0);
            final int n = cast.getTargets().size();
            final String out = outputOf(() -> ctl.playChosenSpellAbility(cast));
            check(!out.contains("Didn't find what to pay for") && g.getStack().getSpellMatchingHost(fireball) != null,
                    "target-cost-fireball: Fireball is on the stack with " + n + " target(s), nothing printed"
                            + (out.isEmpty() ? "" : " (" + out.trim() + ")"));
        });
        final List<String> shards = List.of("humanlife=20", "ailife=20", "turn=4", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Swamp", "aihand=Bone Shards", "aibattlefield=Grizzly Bears;Swamp;Swamp");
        scenario("target-cost-shards-control", shards, PolicyLobbyPlayerAi.Outlets.OFF, null, 20, (ai, pol) -> {
            final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
            final Card shard = named(ai.getCardsIn(ZoneType.Hand), "Bone Shards");
            final Card bears = named(ai.getCardsIn(ZoneType.Battlefield), "Grizzly Bears");
            mtgtable.ai.Explorer.fitOffForTest(true);
            try {
                forge.game.spellability.SpellAbility bad = null;
                mtgtable.ai.Explorer ex = null;
                for (long seed = 1; seed <= 100 && bad == null; seed++) {
                    ex = new mtgtable.ai.Explorer(new mtgtable.ai.ExploreMath(mtgtable.ai.ExploreMath.Config.randomSeat(), seed));
                    ctl.setExplorer(ex);
                    final List<forge.game.spellability.SpellAbility> r = ex.priority(ai, ctl.getAi(), null);
                    if (r != null && !r.isEmpty() && r.get(0).getHostCard() == shard && sacrifices(r.get(0))) {
                        bad = r.get(0);
                    } else if (r != null && !r.isEmpty()) {
                        ex.played(ai, r.get(0), true);
                    }
                }
                check(bad != null && bad.getTargets().size() == 1 && bad.getTargets().get(0) == bears,
                        "target-cost-shards-control: with the fit off the seat picks Bone Shards' sacrifice aimed at its only creature");
                if (bad == null) {
                    return;
                }
                final forge.game.spellability.SpellAbility cast = bad;
                final mtgtable.ai.Explorer seat = ex;
                outputOf(() -> ctl.playChosenSpellAbility(cast));
                check(cast.isSkip() && seat.math().guardrails().getOrDefault("refusedCast", 0) == 1
                                && bears.getZone() != null && bears.getZone().is(ZoneType.Battlefield),
                        "target-cost-shards-control: Forge's AI payment will not sacrifice the spell's own target: refused (G5) "
                                + seat.math().guardrails());
            } finally {
                mtgtable.ai.Explorer.fitOffForTest(false);
            }
        });
        scenario("target-cost-shards", shards, PolicyLobbyPlayerAi.Outlets.OFF, null, 20, (ai, pol) -> {
            final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
            final Card shard = named(ai.getCardsIn(ZoneType.Hand), "Bone Shards");
            final Card bears = named(ai.getCardsIn(ZoneType.Battlefield), "Grizzly Bears");
            int sacPicks = 0;
            int aimedAtBears = 0;
            int listings = 0;
            for (long seed = 1; seed <= 100; seed++) {
                final mtgtable.ai.Explorer ex = new mtgtable.ai.Explorer(new mtgtable.ai.ExploreMath(
                        mtgtable.ai.ExploreMath.Config.randomSeat(), seed));
                ctl.setExplorer(ex);
                final List<forge.game.spellability.SpellAbility> r = ex.priority(ai, ctl.getAi(), null);
                listings++;
                if (r != null && !r.isEmpty() && r.get(0).getHostCard() == shard && sacrifices(r.get(0))) {
                    sacPicks++;
                    aimedAtBears += r.get(0).getTargets().contains(bears) ? 1 : 0;
                }
                if (r != null && !r.isEmpty()) {
                    ex.played(ai, r.get(0), true);
                }
            }
            check(sacPicks == 0 && aimedAtBears == 0,
                    "target-cost-shards: with its only creature the only legal target, Bone Shards' sacrifice is never the seat's pick in "
                            + listings + " listings (" + sacPicks + " picks)");
        });
        final List<String> shardsFoe = List.of("humanlife=20", "ailife=20", "turn=4", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Hill Giant;Swamp", "aihand=Bone Shards", "aibattlefield=Grizzly Bears;Swamp;Swamp");
        scenario("target-cost-shards-avoided", shardsFoe, PolicyLobbyPlayerAi.Outlets.OFF, null, 20, (ai, pol) -> {
            final Game g = ai.getGame();
            final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
            final Card shard = named(ai.getCardsIn(ZoneType.Hand), "Bone Shards");
            final Card bears = named(ai.getCardsIn(ZoneType.Battlefield), "Grizzly Bears");
            final Card giant = named(ai.getWeakestOpponent().getCardsIn(ZoneType.Battlefield), "Hill Giant");
            int sacPicks = 0;
            int atGiant = 0;
            int avoided = 0;
            long castSeed = -1;
            for (long seed = 1; seed <= 100; seed++) {
                final mtgtable.ai.Explorer ex = new mtgtable.ai.Explorer(new mtgtable.ai.ExploreMath(
                        mtgtable.ai.ExploreMath.Config.randomSeat(), seed));
                ctl.setExplorer(ex);
                final List<forge.game.spellability.SpellAbility> r = ex.priority(ai, ctl.getAi(), null);
                if (r != null && !r.isEmpty() && r.get(0).getHostCard() == shard && sacrifices(r.get(0))) {
                    sacPicks++;
                    atGiant += r.get(0).getTargets().size() == 1 && r.get(0).getTargets().get(0) == giant ? 1 : 0;
                    final int a = ex.math().guardrails().getOrDefault("costTargetAvoided", 0);
                    avoided += a;
                    castSeed = castSeed < 0 && a > 0 ? seed : castSeed;
                }
                if (r != null && !r.isEmpty()) {
                    ex.played(ai, r.get(0), true);
                }
            }
            check(sacPicks >= 5 && atGiant == sacPicks && avoided > 0 && avoided < sacPicks && castSeed > 0,
                    "target-cost-shards-avoided: every one of " + sacPicks + " sacrifice picks is aimed at the Hill Giant; " + avoided
                            + " were drawn again away from the Bears (costTargetAvoided)");
            if (castSeed < 0) {
                return;
            }
            final mtgtable.ai.Explorer again = new mtgtable.ai.Explorer(new mtgtable.ai.ExploreMath(
                    mtgtable.ai.ExploreMath.Config.randomSeat(), castSeed));
            ctl.setExplorer(again);
            final forge.game.spellability.SpellAbility cast = again.priority(ai, ctl.getAi(), null).get(0);
            final String out = outputOf(() -> ctl.playChosenSpellAbility(cast));
            check(!cast.isSkip() && g.getStack().getSpellMatchingHost(shard) != null && giant.getZone().is(ZoneType.Battlefield)
                            && bears.getZone() != null && bears.getZone().is(ZoneType.Graveyard),
                    "target-cost-shards-avoided: Bone Shards is on the stack aimed at the Hill Giant, the Bears sacrificed"
                            + (out.isEmpty() ? "" : " (" + out.trim() + ")"));
        });
        // Forge's answer, re-targeted (D485's repair): Bone Shards' sacrifice aimed at a Hill Giant that has since died;
        // the repair's fill must not pick the seat's own Bears, the creature the cost needs
        final List<String> shardsStale = List.of("humanlife=20", "ailife=20", "turn=4", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Hill Giant;Swamp", "aihand=Bone Shards", "aibattlefield=Grizzly Bears;Swamp;Swamp");
        for (final boolean foe : new boolean[] {false, true}) {
            final List<String> board = new ArrayList<>(shardsStale);
            if (foe) {
                board.set(5, "humanbattlefield=Hill Giant;Llanowar Elves;Swamp");
            }
            final String name = foe ? "target-cost-shards-answer-filled" : "target-cost-shards-answer-refused";
            scenario(name, board, PolicyLobbyPlayerAi.Outlets.OFF, null, 20, (ai, pol) -> {
                final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
                final Card shard = named(ai.getCardsIn(ZoneType.Hand), "Bone Shards");
                final Card bears = named(ai.getCardsIn(ZoneType.Battlefield), "Grizzly Bears");
                final Card giant = named(ai.getWeakestOpponent().getCardsIn(ZoneType.Battlefield), "Hill Giant");
                forge.game.spellability.SpellAbility sac = null;
                for (final forge.game.spellability.SpellAbility a : forge.ai.ComputerUtilAbility.getOriginalAndAltCostAbilities(
                        new ArrayList<>(shard.getSpellAbilities()), ai)) {
                    if (sacrifices(a)) {
                        sac = a;
                    }
                }
                final forge.game.spellability.SpellAbility sa = sac;
                sa.setActivatingPlayer(ai);
                sa.resetTargets();
                sa.getTargets().add(giant);
                ai.getGame().getAction().moveToGraveyard(giant, null);
                final String tok = mtgtable.ai.Decisions.saToken(sa);
                int picked = 0;
                boolean aimedOk = true;
                final mtgtable.ai.Explorer ex = new mtgtable.ai.Explorer(new mtgtable.ai.ExploreMath(
                        mtgtable.ai.ExploreMath.Config.randomSeat(), 7));
                ctl.setExplorer(ex);
                for (int i = 0; i < 30; i++) {
                    final List<forge.game.spellability.SpellAbility> r = ex.priority(ai, ctl.getAi(), new ArrayList<>(List.of(sa)));
                    if (r != null && !r.isEmpty() && r.get(0) == sa) {
                        picked++;
                        aimedOk &= sa.getTargets().size() == 1 && sa.getTargets().get(0) != bears;
                        ex.played(ai, sa, false);
                        sa.resetTargets();
                        sa.getTargets().add(giant);   // planted again: the answer Forge would give
                    }
                }
                final Map<String, Integer> gr = ex.math().guardrails();
                if (!foe) {
                    // the control: D485's repair alone fills the dead Giant's place with the Bears
                    mtgtable.ai.Explorer.fitOffForTest(true);
                    try {
                        final mtgtable.ai.Explorer off = new mtgtable.ai.Explorer(new mtgtable.ai.ExploreMath(
                                mtgtable.ai.ExploreMath.Config.randomSeat(), 7));
                        ctl.setExplorer(off);
                        boolean atBears = false;
                        for (int i = 0; i < 30 && !atBears; i++) {
                            final List<forge.game.spellability.SpellAbility> r = off.priority(ai, ctl.getAi(), new ArrayList<>(List.of(sa)));
                            atBears = r != null && !r.isEmpty() && r.get(0) == sa && sa.getTargets().size() == 1
                                    && sa.getTargets().get(0) == bears;
                            if (r != null && !r.isEmpty() && r.get(0) == sa) {
                                off.played(ai, sa, false);
                                sa.resetTargets();
                                sa.getTargets().add(giant);
                            }
                        }
                        check(atBears, name + " (control): with the fit off D485's repair aims Forge's answer at the Bears, its own payment");
                    } finally {
                        mtgtable.ai.Explorer.fitOffForTest(false);
                    }
                }
                if (foe) {
                    final int avoided = gr.getOrDefault("costTargetAvoided", 0);
                    check(picked > 0 && aimedOk && avoided > 0 && avoided < picked,
                            name + ": Forge's answer re-targeted at the Elves, never the Bears its cost sacrifices (" + picked
                                    + " picks, " + avoided + " filled again away from the Bears): " + gr);
                } else {
                    check(picked == 0 && gr.getOrDefault("staleRefused", 0) == 30 && bears.getZone().is(ZoneType.Battlefield),
                            name + ": with only the Bears to fill it, Forge's answer is never offered (D485's refusal): " + gr);
                }
            });
        }
        // the single-target redraw after the pick (D358's Explorer.targets, which the random seat runs too): Bone Shards'
        // sacrifice aimed at the Hill Giant, redrawn half the time among every candidate -- the Bears among them
        scenario("target-cost-shards-redraw", shardsFoe, PolicyLobbyPlayerAi.Outlets.OFF, null, 20, (ai, pol) -> {
            final Card shard = named(ai.getCardsIn(ZoneType.Hand), "Bone Shards");
            final Card bears = named(ai.getCardsIn(ZoneType.Battlefield), "Grizzly Bears");
            final Card giant = named(ai.getWeakestOpponent().getCardsIn(ZoneType.Battlefield), "Hill Giant");
            forge.game.spellability.SpellAbility sac = null;
            for (final forge.game.spellability.SpellAbility a : forge.ai.ComputerUtilAbility.getOriginalAndAltCostAbilities(
                    new ArrayList<>(shard.getSpellAbilities()), ai)) {
                if (sacrifices(a)) {
                    sac = a;
                }
            }
            final forge.game.spellability.SpellAbility sa = sac;
            sa.setActivatingPlayer(ai);
            for (final boolean off : new boolean[] {true, false}) {
                mtgtable.ai.Explorer.fitOffForTest(off);
                int atBears = 0;
                int moved = 0;
                int avoided = 0;
                try {
                    for (long seed = 1; seed <= 60; seed++) {
                        final mtgtable.ai.Explorer ex = new mtgtable.ai.Explorer(new mtgtable.ai.ExploreMath(
                                mtgtable.ai.ExploreMath.Config.randomSeat(), seed));
                        sa.resetTargets();
                        sa.getTargets().add(giant);
                        ex.targets(sa, ai, new java.util.HashMap<>());
                        atBears += sa.getTargets().get(0) == bears ? 1 : 0;
                        moved += sa.getTargets().get(0) != giant ? 1 : 0;
                        avoided += ex.math().guardrails().getOrDefault("costTargetAvoided", 0);
                    }
                } finally {
                    mtgtable.ai.Explorer.fitOffForTest(false);
                }
                if (off) {
                    check(atBears > 0, "target-cost-shards-redraw (control): with the fit off the redraw moves the target to the Bears "
                            + atBears + " time(s) in 60");
                } else {
                    check(atBears == 0 && avoided > 0,
                            "target-cost-shards-redraw: the redraw never lands on the Bears its cost sacrifices (" + avoided
                                    + " redrawn away from them, " + moved + " moved)");
                }
            }
            sa.resetTargets();
        });
        final List<String> shardsTwo = List.of("humanlife=20", "ailife=20", "turn=4", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Swamp", "aihand=Bone Shards", "aibattlefield=Grizzly Bears;Llanowar Elves;Swamp;Swamp");
        scenario("target-cost-shards-two", shardsTwo, PolicyLobbyPlayerAi.Outlets.OFF, null, 20, (ai, pol) -> {
            final Game g = ai.getGame();
            final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
            final Card shard = named(ai.getCardsIn(ZoneType.Hand), "Bone Shards");
            List<forge.game.spellability.SpellAbility> pick = null;
            mtgtable.ai.Explorer ex = null;
            for (long seed = 1; seed <= 100 && pick == null; seed++) {
                ex = new mtgtable.ai.Explorer(new mtgtable.ai.ExploreMath(mtgtable.ai.ExploreMath.Config.randomSeat(), seed));
                ctl.setExplorer(ex);
                final List<forge.game.spellability.SpellAbility> r = ex.priority(ai, ctl.getAi(), null);
                if (r != null && !r.isEmpty() && r.get(0).getHostCard() == shard && sacrifices(r.get(0))) {
                    pick = r;
                } else if (r != null && !r.isEmpty()) {
                    ex.played(ai, r.get(0), true);
                }
            }
            check(pick != null && pick.get(0).getTargets().size() == 1,
                    "target-cost-shards-two: with two creatures the seat picks Bone Shards' sacrifice aimed at one of them");
            if (pick == null) {
                return;
            }
            final forge.game.spellability.SpellAbility cast = pick.get(0);
            final Card target = (Card) cast.getTargets().get(0);
            final Card other = named(ai.getCardsIn(ZoneType.Battlefield),
                    "Grizzly Bears".equals(target.getName()) ? "Llanowar Elves" : "Grizzly Bears");
            final String out = outputOf(() -> ctl.playChosenSpellAbility(cast));
            check(!cast.isSkip() && g.getStack().getSpellMatchingHost(shard) != null && target.getZone().is(ZoneType.Battlefield)
                            && other.getZone() != null && other.getZone().is(ZoneType.Graveyard),
                    "target-cost-shards-two: Bone Shards is on the stack aimed at the " + target.getName() + ", the "
                            + other.getName() + " sacrificed" + (out.isEmpty() ? "" : " (" + out.trim() + ")"));
        });
    }

    /** D488: the play's cost holds a sacrifice (Bone Shards' one alternative of two). */
    private static boolean sacrifices(final forge.game.spellability.SpellAbility sa) {
        for (final forge.game.cost.CostPart p : sa.getPayCosts().getCostParts()) {
            if (p instanceof forge.game.cost.CostSacrifice) {
                return true;
            }
        }
        return false;
    }

    /** D488: what {@code r} prints on stdout and stderr (Forge's payment prints "Didn't find what to pay for" on stdout), printed through. */
    private static String outputOf(final Runnable r) {
        final java.io.PrintStream oldOut = System.out;
        final java.io.ByteArrayOutputStream buf = new java.io.ByteArrayOutputStream();
        System.setOut(new java.io.PrintStream(buf, true, java.nio.charset.StandardCharsets.UTF_8));
        String err;
        try {
            err = stderrOf(r);
        } finally {
            System.setOut(oldOut);
        }
        final String s = buf.toString(java.nio.charset.StandardCharsets.UTF_8);
        oldOut.print(s);
        return s + err;
    }

    /**
     * D486: a modal spell is never stranded.  Suplex ("choose one": 3 damage to
     * target creature, or exile target artifact), the opponent's Grizzly Bears
     * and Expedition Map on the battlefield.  The cast copies the chosen modes
     * onto the spell with their targets (CharmEffect.makeChoices, after the card
     * is on the stack), and {@code MagicStack.add} drops a paid spell whose part
     * has no target.  (a) Control: the exile mode chosen with no target -- what
     * the atlas's forced option carried into its copy before D486
     * ({@code SearchPolicy.mapSa} mapped the modes but not their targets) -- and
     * Forge's own hand-off prints "failed to target" and strands the card.
     * (b) The random seat given that as Forge's answer fills the target (the
     * Map) and casts it.  (c) Forge chose the damage mode aimed at the Bears,
     * and the Bears died: the seat cannot re-target the mode, draws the modes
     * afresh (exile the Map) and casts it.  (d) No modes chosen at all (the
     * atlas's declined option): the seat chooses them inside the cast.  (e) The
     * mapped option carries the mode's target into the copy.  (f) With no
     * creature or artifact, Suplex has no legal mode: Forge's hand-off strands it
     * silently, and no listing offers it.
     */
    static void modalScenarios() throws Exception {
        System.out.println("== ai-bench selftest: a modal spell, never stranded (D486, engine)");
        final List<String> board = List.of("humanlife=20", "ailife=20", "turn=4", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Grizzly Bears;Expedition Map;Mountain", "aihand=Suplex", "aibattlefield=Mountain;Mountain");
        scenario("modal-empty-mode-forge", board, PolicyLobbyPlayerAi.Outlets.OFF, null, 10, (ai, pol) -> {
            final forge.game.spellability.SpellAbility sa = plantModes(ai, "Exile target artifact", null);
            final String err = stderrOf(() -> forge.ai.ComputerUtil.handlePlayingSpellAbility(ai, sa, null));
            check(err.contains("failed to target") && strandedOnStack(ai.getGame(), sa),
                    "modal-empty-mode-forge (control): Forge's hand-off of a mode with no target prints \"failed to target\" "
                            + "and strands Suplex in the stack zone");
        });
        scenario("modal-empty-mode-seat", board, PolicyLobbyPlayerAi.Outlets.OFF, null, 20, (ai, pol) -> {
            final forge.game.spellability.SpellAbility sa = plantModes(ai, "Exile target artifact", null);
            modalSeatCasts("modal-empty-mode-seat", ai, sa, "Expedition Map", "retargeted");   // a part under its minimum: D485's stale list
        });
        scenario("modal-target-died-seat", board, PolicyLobbyPlayerAi.Outlets.OFF, null, 20, (ai, pol) -> {
            final Card bears = named(ai.getWeakestOpponent().getCardsIn(ZoneType.Battlefield), "Grizzly Bears");
            final forge.game.spellability.SpellAbility sa = plantModes(ai, "deals 3 damage", bears);
            ai.getGame().getAction().moveToGraveyard(bears, null);
            modalSeatCasts("modal-target-died-seat", ai, sa, "Expedition Map", "modesDrawn");   // the mode cannot be re-targeted: modes drawn
        });
        scenario("modal-no-modes-at-cast", board, PolicyLobbyPlayerAi.Outlets.OFF, null, 20, (ai, pol) -> {
            final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
            final Card sup = named(ai.getCardsIn(ZoneType.Hand), "Suplex");
            final forge.game.spellability.SpellAbility sa = sup.getFirstSpellAbility();
            sa.setActivatingPlayer(ai);
            sa.setChosenList(null);
            sa.setSubAbility(null);
            final mtgtable.ai.Explorer ex = new mtgtable.ai.Explorer(new mtgtable.ai.ExploreMath(
                    mtgtable.ai.ExploreMath.Config.randomSeat(), 7));
            ctl.setExplorer(ex);
            final String err = stderrOf(() -> ctl.playChosenSpellAbility(sa));
            final forge.game.spellability.SpellAbility onStack = ai.getGame().getStack().getSpellMatchingHost(sup);
            check(!err.contains("failed to target") && onStack != null && onStack.getSubAbility() != null
                            && onStack.getSubAbility().getTargets().size() == 1
                            && ex.math().guardrails().getOrDefault("modesDrawn", 0) == 1
                            && ex.math().guardrails().getOrDefault("retargeted", 0) == 0,
                    "modal-no-modes-at-cast: with no modes chosen the seat chooses them inside the cast: Suplex on the stack with "
                            + (onStack == null || onStack.getSubAbility() == null ? "none" : onStack.getSubAbility().getTargets())
                            + ", counted " + ex.math().guardrails() + (err.isEmpty() ? "" : " (" + err.trim() + ")"));
        });
        scenario("modal-mapped-targets", board, PolicyLobbyPlayerAi.Outlets.OFF, null, 20, (ai, pol) -> {
            final Card map = named(ai.getWeakestOpponent().getCardsIn(ZoneType.Battlefield), "Expedition Map");
            final forge.game.spellability.SpellAbility sa = plantModes(ai, "Exile target artifact", map);
            final forge.game.spellability.SpellAbility mapped = mtgtable.ai.SearchPolicy.mapForTest(ai, sa);
            final List<forge.game.spellability.AbilitySub> modes = mapped.getChosenList();
            final forge.game.GameObject t = modes == null || modes.size() != 1 || modes.get(0).getTargets().size() != 1 ? null
                    : modes.get(0).getTargets().get(0);
            check(t instanceof Card && ((Card) t).getId() == map.getId() && ((Card) t).getGame() != ai.getGame(),
                    "modal-mapped-targets: the atlas's option mapped into a copy carries its mode's target, the copy's Map ("
                            + t + ")");
        });
        final List<String> bare = List.of("humanlife=20", "ailife=20", "turn=4", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Mountain", "aihand=Suplex", "aibattlefield=Mountain;Mountain");
        scenario("modal-no-legal-mode", bare, PolicyLobbyPlayerAi.Outlets.OFF, null, 20, (ai, pol) -> {
            final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
            final Card sup = named(ai.getCardsIn(ZoneType.Hand), "Suplex");
            final forge.game.spellability.SpellAbility sa = sup.getFirstSpellAbility();
            sa.setActivatingPlayer(ai);
            final String tok = mtgtable.ai.Decisions.saToken(sa);
            check(!mtgtable.ai.Explorer.modesCastable(sa), "modal-no-legal-mode: Suplex has no legal mode");
            boolean listed = false;
            for (final forge.game.spellability.SpellAbility a : mtgtable.ai.SearchPolicy.alternativesForTest(ai, null)) {
                listed |= tok.equals(mtgtable.ai.Decisions.saToken(a));
            }
            final mtgtable.ai.Decision rec = mtgtable.ai.Decisions.priority(ai);
            int offered = 0;
            for (long seed = 1; seed <= 30; seed++) {
                final mtgtable.ai.Explorer ex = new mtgtable.ai.Explorer(new mtgtable.ai.ExploreMath(
                        mtgtable.ai.ExploreMath.Config.randomSeat(), seed));
                final List<forge.game.spellability.SpellAbility> r = ex.priority(ai, ctl.getAi(), null);
                offered += r != null && !r.isEmpty() && tok.equals(mtgtable.ai.Decisions.saToken(r.get(0))) ? 1 : 0;
            }
            check(!listed && !rec.options.contains(tok) && offered == 0,
                    "modal-no-legal-mode: not a search or atlas candidate (" + listed + "), not in the record's options ("
                            + rec.options + "), never the random seat's pick in 30 listings (" + offered + ")");
            sa.setChosenList(null);
            sa.setSubAbility(null);
            final boolean handled = forge.ai.ComputerUtil.handlePlayingSpellAbility(ai, sa, null);
            check(!handled && strandedOnStack(ai.getGame(), sa),
                    "modal-no-legal-mode (control): Forge's own hand-off strands it in the stack zone, silently");
        });
    }

    /** D486: Suplex with Forge's chosen mode (the one whose description contains {@code mode}) aimed at {@code target}, or at nothing. */
    private static forge.game.spellability.SpellAbility plantModes(final Player ai, final String mode, final Card target) {
        final Card sup = named(ai.getCardsIn(ZoneType.Hand), "Suplex");
        final forge.game.spellability.SpellAbility sa = sup.getFirstSpellAbility();
        sa.setActivatingPlayer(ai);
        forge.game.spellability.AbilitySub m = null;
        for (final forge.game.spellability.AbilitySub c : sa.getAdditionalAbilityList("Choices")) {
            if (c.getParamOrDefault("SpellDescription", "").contains(mode)) {
                m = c;
            }
        }
        check(m != null, "D486 planted: Suplex has the mode \"" + mode + "\"");
        m.setActivatingPlayer(ai);
        m.resetTargets();
        if (target != null) {
            m.getTargets().add(target);
        }
        final List<forge.game.spellability.AbilitySub> chosen = new ArrayList<>();
        chosen.add(m);
        sa.setChosenList(chosen);
        sa.setSubAbility(null);
        return sa;
    }

    /** D486: the random seat, given {@code sa} as Forge's answer, picks it (some seed), with the mode aimed at {@code want}, and casts it legally. */
    private static void modalSeatCasts(final String name, final Player ai, final forge.game.spellability.SpellAbility sa,
                                       final String want, final String counter) {
        final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
        final Card sup = sa.getHostCard();
        final String tok = mtgtable.ai.Decisions.saToken(sa);
        final List<forge.game.spellability.AbilitySub> planted = sa.getChosenList();
        List<forge.game.spellability.SpellAbility> pick = null;
        mtgtable.ai.Explorer ex = null;
        boolean restored = true;
        int passes = 0;
        for (long seed = 1; seed <= 60 && pick == null; seed++) {
            ex = new mtgtable.ai.Explorer(new mtgtable.ai.ExploreMath(mtgtable.ai.ExploreMath.Config.randomSeat(), seed));
            ctl.setExplorer(ex);
            final List<forge.game.spellability.SpellAbility> r = ex.priority(ai, ctl.getAi(), new ArrayList<>(List.of(sa)));
            if (r != null && !r.isEmpty() && tok.equals(mtgtable.ai.Decisions.saToken(r.get(0)))) {
                pick = r;
            } else {
                passes++;
                restored &= sa.getChosenList() == planted;   // not picked: Forge's own modes are put back
            }
        }
        check(pick != null && restored, name + ": the seat picks Forge's answer after " + passes
                + " listing(s) that each put Forge's modes back");
        if (pick == null) {
            return;
        }
        final List<forge.game.spellability.AbilitySub> modes = sa.getChosenList();
        check(modes != null && modes.size() == 1 && modes.get(0).getTargets().size() == 1
                        && modes.get(0).getTargets().get(0) instanceof Card
                        && want.equals(((Card) modes.get(0).getTargets().get(0)).getName())
                        && ("retargeted".equals(counter) ? ex.takeRetargeted() && !ex.takeModesDrawn()
                            : ex.takeModesDrawn() && !ex.takeRetargeted())
                        && ex.math().guardrails().getOrDefault(counter, 0) == 1
                        && ex.math().guardrails().getOrDefault("retargeted".equals(counter) ? "modesDrawn" : "retargeted", 0) == 0,
                name + ": the pick's mode is aimed at the " + want + ", marked " + counter + " and counted once: "
                        + (modes == null ? "none" : modes.get(0).getTargets()) + " " + ex.math().guardrails());
        final forge.game.spellability.SpellAbility cast = pick.get(0);
        final String err = stderrOf(() -> ctl.playChosenSpellAbility(cast));
        final forge.game.spellability.SpellAbility onStack = ai.getGame().getStack().getSpellMatchingHost(sup);
        check(!err.contains("failed to target") && onStack != null && ai.getGame().getStack().size() == 1,
                name + ": Suplex is on the stack, cast legally, nothing printed" + (err.isEmpty() ? "" : " (" + err.trim() + ")"));
    }

    /**
     * D485 (the skeptic review): a modal spell's target records show what is
     * cast.  Izzet Charm with its damage mode chosen at the Hill Giant
     * ({@code setChosenList}), and the chain of copies {@code CharmAi} builds
     * planted aimed at the Grizzly Bears instead (as the seat's
     * {@code randomTargets} leaves it): the cast's {@code CharmEffect.makeChoices}
     * rebuilds the chain from the chosen mode (the Giant), and
     * {@code Decisions.castTargets} records the Giant, where the chain read
     * records the Bears.
     */
    static void modalCastTargetsScenario() throws Exception {
        scenario("stale-targets-modal-record", List.of("humanlife=20", "ailife=20", "turn=4", "activeplayer=ai",
                "activephase=MAIN1", "humanbattlefield=Hill Giant;Grizzly Bears", "aihand=Izzet Charm",
                "aibattlefield=Island;Mountain"), PolicyLobbyPlayerAi.Outlets.OFF, null, 10, (ai, pol) -> {
            final Card charm = named(ai.getCardsIn(ZoneType.Hand), "Izzet Charm");
            final forge.game.spellability.SpellAbility sa = charm.getFirstSpellAbility();
            sa.setActivatingPlayer(ai);
            final Card giant = named(ai.getWeakestOpponent().getCardsIn(ZoneType.Battlefield), "Hill Giant");
            final Card bears = named(ai.getWeakestOpponent().getCardsIn(ZoneType.Battlefield), "Grizzly Bears");
            forge.game.spellability.AbilitySub dmg = null;
            for (final forge.game.spellability.AbilitySub sub : forge.game.ability.effects.CharmEffect.makePossibleOptions(sa)) {
                if (sub.getApi() == forge.game.ability.ApiType.DealDamage) {
                    dmg = sub;
                }
            }
            dmg.setActivatingPlayer(ai);
            dmg.resetTargets();
            dmg.getTargets().add(giant);
            sa.setChosenList(new ArrayList<>(List.of(dmg)));
            sa.setSubAbility(null);
            forge.game.ability.effects.CharmEffect.chainAbilities(sa, sa.getChosenList());
            final forge.game.spellability.SpellAbility copy = sa.getSubAbility();
            copy.resetTargets();
            copy.getTargets().add(bears);   // the discarded chain, aimed elsewhere
            final List<mtgtable.ai.Decision> chainRead = mtgtable.ai.Decisions.targets(sa, ai, "targets");
            final List<mtgtable.ai.Decision> castRead = mtgtable.ai.Decisions.castTargets(sa, ai, null);
            check(chainRead.size() == 1 && ("target:" + bears.getId()).equals(chainRead.get(0).chosen),
                    "stale-targets-modal-record: the chain of copies is aimed at the Bears (" + (chainRead.isEmpty() ? "none" : chainRead.get(0).chosen) + ")");
            check(castRead.size() == 1 && ("target:" + giant.getId()).equals(castRead.get(0).chosen),
                    "stale-targets-modal-record: the record reads the chosen mode, the Giant (" + (castRead.isEmpty() ? "none" : castRead.get(0).chosen) + ")");
            check(forge.game.ability.effects.CharmEffect.makeChoices(sa) && sa.getSubAbility() != null
                    && sa.getSubAbility().getTargets().size() == 1 && sa.getSubAbility().getTargets().get(0) == giant,
                    "stale-targets-modal-record: the cast's makeChoices rebuilds the chain from the chosen mode -- the Giant, as recorded");
        });
    }

    /**
     * D485: Troll Negotiations' spell with J168's stale list planted: both of the
     * seat's creatures in its first part, the opponent's Hill Giant in the fight,
     * then the Elves put into the graveyard (and the Bears too, {@code both}).
     */
    private static forge.game.spellability.SpellAbility plantStale(final Player ai, final boolean both) {
        final Game g = ai.getGame();
        final Card troll = named(ai.getCardsIn(ZoneType.Hand), "Troll Negotiations");
        final forge.game.spellability.SpellAbility sa = troll.getFirstSpellAbility();
        sa.setActivatingPlayer(ai);
        final Card elves = named(ai.getCardsIn(ZoneType.Battlefield), "Llanowar Elves");
        final Card bears = named(ai.getCardsIn(ZoneType.Battlefield), "Grizzly Bears");
        sa.resetTargets();
        sa.getTargets().add(elves);
        sa.getTargets().add(bears);
        final forge.game.spellability.SpellAbility fight = sa.getSubAbility();
        fight.setActivatingPlayer(ai);
        fight.resetTargets();
        fight.getTargets().add(named(ai.getWeakestOpponent().getCardsIn(ZoneType.Battlefield), "Hill Giant"));
        g.getAction().moveToGraveyard(elves, null);
        if (both) {
            g.getAction().moveToGraveyard(bears, null);
        }
        check(sa.getTargets().size() == 2 && !sa.isTargetNumberValid(),
                "D485 planted: Troll Negotiations' first part holds 2 targets for a maximum of 1, one of them in the graveyard");
        return sa;
    }

    /** D485: the spell's card is in the stack zone with no stack item: the engine took it and dropped the spell. */
    private static boolean strandedOnStack(final Game g, final forge.game.spellability.SpellAbility sa) {
        final Card c = sa.getHostCard();
        return c != null && c.getZone() != null && c.getZone().is(ZoneType.Stack) && g.getStack().getSpellMatchingHost(c) == null;
    }

    /** D485: what {@code r} prints on stderr (MagicStack's "failed to target" goes there), printed through too. */
    private static String stderrOf(final Runnable r) {
        final java.io.PrintStream old = System.err;
        final java.io.ByteArrayOutputStream buf = new java.io.ByteArrayOutputStream();
        System.setErr(new java.io.PrintStream(buf, true, java.nio.charset.StandardCharsets.UTF_8));
        try {
            r.run();
        } finally {
            System.setErr(old);
        }
        final String s = buf.toString(java.nio.charset.StandardCharsets.UTF_8);
        old.print(s);
        return s;
    }

    /**
     * D476 (amending D472): an Adventure card's two plays, and a play an effect
     * card permits, map onto the fork's copy.  J162's spine ff5-462 had Murderous
     * Rider on an adventure in exile at d11, d16, d19, d22 and d24, and both of
     * Forge's plays of it (the creature cast "by Swift End (25)", and the same with
     * the suffix twice) failed in 240 of 240 branches each: the copy's effect card
     * has no effect source, so the copy's description read "by Swift End (25)'s
     * Adventure (136)".  Planted here by casting Swift End and Reckless Impulse in
     * the real game and resolving them: the creature from exile, both of Forge's
     * listings of it, and a Lightning Bolt exiled by the impulse; the creature and
     * the adventure cast from hand first, as controls.
     */
    static void adventureScenarios() throws Exception {
        System.out.println("== ai-bench selftest: an adventure and an effect's may-play on a fork (D476, engine)");
        final List<String> board = List.of("humanlife=20", "ailife=20", "turn=5", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Grizzly Bears;Hill Giant;Forest", "humanlibrary=Forest;Forest;Forest;Forest",
                "ailibrary=Lightning Bolt;Lightning Bolt;Lightning Bolt;Lightning Bolt", "aihand=Murderous Rider;Reckless Impulse",
                "aibattlefield=Swamp;Swamp;Swamp;Swamp;Swamp;Swamp;Swamp;Swamp;Mountain;Mountain;Mountain");
        scenario("adventure-map", board, PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final Game g = ai.getGame();
            final Card bears = named(ai.getWeakestOpponent().getCardsIn(ZoneType.Battlefield), "Grizzly Bears");
            // from the hand: the creature (its Original face) and the adventure (its Secondary face)
            final forge.game.spellability.SpellAbility creature = playOf(ai, "Murderous Rider",
                    (sa) -> !sa.isAdventure() && sa.getMayPlay() == null);
            final forge.game.spellability.SpellAbility swift = playOf(ai, "Murderous Rider", (sa) -> sa.isAdventure());
            // D483: from the hand the creature and Swift End are two plays (one token, cast:<id>, two identities):
            // every play Forge lists of the Rider in the hand is one of the two, and the search's alternatives,
            // listed before the targets are set (canPlaySa sets its own on the card's own Swift End), keep them apart
            check(!mtgtable.ai.SearchPolicy.playIdentity(creature).equals(mtgtable.ai.SearchPolicy.playIdentity(swift)),
                    "D483: the creature and Swift End from the hand are two play identities ("
                            + mtgtable.ai.SearchPolicy.playIdentity(creature) + " / " + mtgtable.ai.SearchPolicy.playIdentity(swift) + ")");
            final Card riderCard = creature.getHostCard();
            final List<forge.game.spellability.SpellAbility> handRaw = new ArrayList<>();
            for (final forge.game.spellability.SpellAbility sa : forge.ai.ComputerUtilAbility.getOriginalAndAltCostAbilities(
                    new ArrayList<>(riderCard.getAllPossibleAbilities(ai, false)), ai)) {
                if (sa.isSpell()) {
                    handRaw.add(sa);
                }
            }
            final java.util.Set<forge.card.CardStateName> handFaces = new java.util.HashSet<>();
            for (final forge.game.spellability.SpellAbility sa : handRaw) {
                handFaces.add(sa.getCardStateName());
            }
            check(distinctIdentities(handRaw) == 2 && handFaces.size() == 2,
                    "D483: Forge's " + handRaw.size() + " plays of the Rider in the hand are two identities, Original and Secondary: "
                            + labelsOf(handRaw));
            final List<forge.game.spellability.SpellAbility> handAlts = riderPlays(
                    mtgtable.ai.SearchPolicy.alternativesForTest(ai, null), riderCard);
            boolean creatureListed = false;
            for (final forge.game.spellability.SpellAbility sa : handAlts) {
                creatureListed |= mtgtable.ai.SearchPolicy.playIdentity(sa).equals(mtgtable.ai.SearchPolicy.playIdentity(creature));
            }
            // Swift End is listed only when Forge's per-card judgment (canPlaySa) says
            // WillPlay, which varies from run to run; the identities above are the deterministic half
            check(creatureListed && distinctIdentities(handAlts) == handAlts.size(),
                    "D483: the search lists the creature from the hand, each Rider play once (" + handAlts.size()
                            + " listed): " + labelsOf(handAlts));
            swift.resetTargets();
            swift.getTargets().add(bears);
            final forge.game.spellability.SpellAbility mc = mtgtable.ai.SearchPolicy.mapForTest(ai, creature);
            final forge.game.spellability.SpellAbility ms = mtgtable.ai.SearchPolicy.mapForTest(ai, swift);
            check(mc != null && !mc.isAdventure() && mc.getCardStateName() == creature.getCardStateName()
                            && mc.getHostCard().getGame() != g && mc.getDescription().equals(creature.getDescription()),
                    "Murderous Rider cast as the creature from the hand maps to the copy's creature cast (got "
                            + (mc == null ? null : mc.getCardStateName() + ": " + mc.getDescription()) + ")");
            check(ms != null && ms.isAdventure() && ms.getHostCard().getGame() != g && ms.getTargets().size() == 1
                            && ms.getTargets().getFirstTargetedCard() != bears
                            && "Grizzly Bears".equals(ms.getTargets().getFirstTargetedCard().getName()),
                    "Murderous Rider cast as Swift End from the hand maps to the copy's adventure, its target the copy's Bears (got "
                            + (ms == null ? null : ms.getCardStateName() + ", " + ms.getTargets()) + ")");
            // play the impulse, then the adventure, in the real game: the Bolts and the Rider go to exile, each
            // castable by an effect card's may-play permission
            final forge.game.spellability.SpellAbility impulse = playOf(ai, "Reckless Impulse", (sa) -> true);
            check(forge.ai.ComputerUtil.handlePlayingSpellAbility(ai, impulse, null), "the real game casts Reckless Impulse");
            g.getStack().resolveStack();
            check(forge.ai.ComputerUtil.handlePlayingSpellAbility(ai, swift, null), "the real game casts Swift End on the Bears");
            g.getStack().resolveStack();
            final Card rider = named(ai.getCardsIn(ZoneType.Exile), "Murderous Rider");
            check(rider.isOnAdventure() && !ai.getWeakestOpponent().getCardsIn(ZoneType.Battlefield).contains(bears),
                    "Swift End resolved: the Bears destroyed, the Rider on an adventure in exile");
            final List<forge.game.spellability.SpellAbility> fromExile = new ArrayList<>();
            for (final forge.game.spellability.SpellAbility sa : forge.ai.ComputerUtilAbility.getOriginalAndAltCostAbilities(
                    new ArrayList<>(rider.getAllPossibleAbilities(ai, false)), ai)) {
                if (sa.isSpell() && sa.getMayPlay() != null && !sa.isAdventure()) {
                    sa.setActivatingPlayer(ai);
                    fromExile.add(sa);
                }
            }
            boolean nested = false;
            for (final forge.game.spellability.SpellAbility sa : fromExile) {
                nested |= sa.getDescription().indexOf(" by ") != sa.getDescription().lastIndexOf(" by ");
            }
            check(fromExile.size() >= 2 && nested,
                    "Forge lists the creature from exile by the adventure's permission, once with the suffix twice (J162's pair): "
                            + fromExile.size() + " plays");
            for (final forge.game.spellability.SpellAbility sa : fromExile) {
                final forge.game.spellability.SpellAbility m = mtgtable.ai.SearchPolicy.mapForTest(ai, sa);
                check(m != null && m != sa && m.getHostCard().getGame() != g && m.getMayPlay() != null && !m.isAdventure()
                                && m.getCardStateName() == sa.getCardStateName()
                                && mtgtable.ai.SearchPolicy.matchKey(m).equals(mtgtable.ai.SearchPolicy.matchKey(sa)),
                        "the creature from exile [" + sa.getDescription() + "] maps to the copy's may-play cast (got "
                                + (m == null ? null : m.getDescription()) + ")");
            }
            // D483: Forge's two creature plays from exile are one play identity, and the search lists the Rider once
            check(distinctIdentities(fromExile) == 1,
                    "D483: Forge's " + fromExile.size() + " creature plays from exile are one play identity ("
                            + mtgtable.ai.SearchPolicy.playIdentity(fromExile.get(0)) + ")");
            final List<forge.game.spellability.SpellAbility> exileAlts = riderPlays(
                    mtgtable.ai.SearchPolicy.alternativesForTest(ai, null), rider);
            check(exileAlts.size() == 1 && exileAlts.get(0).getMayPlay() != null,
                    "D483: the search lists the Rider from exile once, though Forge lists it " + fromExile.size()
                            + " times: " + labelsOf(exileAlts));
            for (final forge.game.spellability.SpellAbility f : fromExile) {
                final List<forge.game.spellability.SpellAbility> again = riderPlays(
                        mtgtable.ai.SearchPolicy.alternativesForTest(ai, f), rider);
                check(again.isEmpty(), "D483: with Forge's pick the Rider from exile [" + f.getDescription()
                        + "], its twin is not listed again: " + labelsOf(again));
            }
            check(exileAlts.size() == 1 && exileAlts.get(0).getDescription().equals(fromExile.get(0).getDescription()),
                    "D483: the play kept is the first in Forge's order, the single suffix (" + labelsOf(exileAlts) + ")");
            Card bolt = null;
            for (final Card c : ai.getCardsIn(ZoneType.Exile)) {
                bolt = "Lightning Bolt".equals(c.getName()) ? c : bolt;
            }
            check(bolt != null, "Reckless Impulse exiled a Lightning Bolt");
            forge.game.spellability.SpellAbility boltPlay = null;
            for (final forge.game.spellability.SpellAbility sa : forge.ai.ComputerUtilAbility.getOriginalAndAltCostAbilities(
                    new ArrayList<>(bolt.getAllPossibleAbilities(ai, false)), ai)) {
                boltPlay = boltPlay == null && sa.isSpell() && sa.getMayPlay() != null ? sa : boltPlay;
            }
            check(boltPlay != null, "Forge lists the exiled Bolt by the impulse's permission");
            boltPlay.setActivatingPlayer(ai);
            boltPlay.resetTargets();
            boltPlay.getTargets().add(ai.getWeakestOpponent());
            // D483: one Bolt play by the impulse's permission (two Bolts exiled by one effect are one play)
            final List<forge.game.spellability.SpellAbility> boltAlts = new ArrayList<>();
            for (final forge.game.spellability.SpellAbility sa : mtgtable.ai.SearchPolicy.alternativesForTest(ai, null)) {
                if ("Lightning Bolt".equals(sa.getHostCard().getName())) {
                    boltAlts.add(sa);
                }
            }
            int boltsExiled = 0;
            for (final Card c : ai.getCardsIn(ZoneType.Exile)) {
                boltsExiled += "Lightning Bolt".equals(c.getName()) ? 1 : 0;
            }
            check(boltsExiled == 2 && boltAlts.size() == 1 && boltAlts.get(0).getMayPlay() != null,
                    "D483: the search lists one Bolt play by Reckless Impulse (" + boltsExiled + " Bolts exiled): " + labelsOf(boltAlts));
            final forge.game.spellability.SpellAbility mb = mtgtable.ai.SearchPolicy.mapForTest(ai, boltPlay);
            check(mb != null && mb.getMayPlay() != null && mb.getHostCard().getGame() != g
                            && mtgtable.ai.SearchPolicy.matchKey(mb).equals(mtgtable.ai.SearchPolicy.matchKey(boltPlay)),
                    "the exiled Bolt [" + boltPlay.getDescription() + "] maps to the copy's may-play cast (got "
                            + (mb == null ? null : mb.getDescription()) + ")");
            // the production path that failed 240 of 240: one atlas branch forcing the creature from exile
            final forge.game.spellability.SpellAbility cast = fromExile.get(0);
            final mtgtable.ai.Atlas.Unit u = new mtgtable.ai.Atlas.Unit();
            u.continuation = "forge";
            u.turnCap = g.getPhaseHandler().getTurn();
            u.branchTimeoutMs = 60_000;
            u.observe = null;
            final mtgtable.ai.Atlas.Branch b = mtgtable.ai.Atlas.play(ai, mtgtable.ai.SearchPolicy.priorityCand(cast), 0, 0, 7, u,
                    "d476", new LinkedHashMap<>(), null, "d476", false);
            check(b.error == null && b.unavailable == null && !b.engineError && b.steps > 0,
                    "an atlas branch forcing the Rider from exile plays (" + b.steps + " steps, error " + b.error + ")");
            final boolean[] onField = {false};
            mtgtable.ai.SearchPolicy.leafProbeForTest((copy, aiC) -> {
                for (final Card c : aiC.getCardsIn(ZoneType.Battlefield)) {
                    onField[0] |= "Murderous Rider".equals(c.getName());
                }
            });
            final CountSink sink = new CountSink();
            try {
                mtgtable.ai.SearchPolicy.playout(g, ai, mtgtable.ai.SearchPolicy.priorityCand(cast), 7,
                        new mtgtable.ai.SearchPolicy.Limits(System.nanoTime() + 20_000_000_000L, 0, 20_000), sink, false, null);
            } finally {
                mtgtable.ai.SearchPolicy.leafProbeForTest(null);
            }
            check(onField[0], "the fork cast the Rider from exile onto its battlefield (" + sink.counts + ")");
            check(rider.isInZone(ZoneType.Exile), "the real game is untouched: the Rider still in exile");
        });
    }

    /**
     * D483: two more may-play shapes the play identity must hold to one play each.  A card's own
     * may-play static (Squee, the Immortal from the graveyard): its permission's host is the card,
     * so two copies are one play ({@code mayPlay#self}, not each copy's id).  And Bolas's Citadel's
     * top card: Forge's suffix is {@code " by <Citadel>"} plus the option's "(by paying ... life
     * instead of paying its mana cost)", and its doubled twin has text between the two hosts.
     */
    static void mayPlayShapeScenarios() throws Exception {
        System.out.println("== ai-bench selftest: a card's own may-play static and Bolas's Citadel, listed once (D483, engine)");
        scenario("own-mayplay-identity", List.of("humanlife=20", "ailife=20", "turn=5", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Forest", "humanlibrary=Forest;Forest;Forest;Forest", "ailibrary=Mountain;Mountain;Mountain;Mountain",
                "aigraveyard=Squee, the Immortal;Squee, the Immortal", "aibattlefield=Mountain;Mountain;Mountain;Mountain"),
                PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final List<forge.game.spellability.SpellAbility> raw = new ArrayList<>();
            for (final Card c : ai.getCardsIn(ZoneType.Graveyard)) {
                for (final forge.game.spellability.SpellAbility sa : forge.ai.ComputerUtilAbility.getOriginalAndAltCostAbilities(
                        new ArrayList<>(c.getAllPossibleAbilities(ai, false)), ai)) {
                    if (sa.isSpell() && sa.getMayPlay() != null) {
                        sa.setActivatingPlayer(ai);
                        raw.add(sa);
                    }
                }
            }
            final java.util.Set<Card> hosts = new java.util.HashSet<>();
            for (final forge.game.spellability.SpellAbility sa : raw) {
                hosts.add(sa.getHostCard());
            }
            check(hosts.size() == 2 && distinctIdentities(raw) == 1
                            && mtgtable.ai.SearchPolicy.playIdentity(raw.get(0)).contains("|mayPlay#self|"),
                    "D483: Forge's " + raw.size() + " plays of the two Squees in the graveyard are one identity, mayPlay#self ("
                            + (raw.isEmpty() ? "none" : mtgtable.ai.SearchPolicy.playIdentity(raw.get(0))) + ")");
            final List<forge.game.spellability.SpellAbility> squees = new ArrayList<>();
            for (final forge.game.spellability.SpellAbility sa : mtgtable.ai.SearchPolicy.alternativesForTest(ai, null)) {
                if ("Squee, the Immortal".equals(sa.getHostCard().getName())) {
                    squees.add(sa);
                }
            }
            check(squees.size() <= 1, "D483: the search lists Squee from the graveyard at most once: " + labelsOf(squees));
        });
        scenario("citadel-identity", List.of("humanlife=20", "ailife=20", "turn=5", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Grizzly Bears", "humanlibrary=Forest;Forest;Forest;Forest",
                "ailibrary=Lightning Bolt;Mountain;Mountain;Mountain", "aibattlefield=Bolas's Citadel;Mountain"),
                PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final Card top = ai.getCardsIn(ZoneType.Library).get(0);
            check("Lightning Bolt".equals(top.getName()), "setup: a Lightning Bolt on top of the seat's library (" + top + ")");
            final List<forge.game.spellability.SpellAbility> raw = new ArrayList<>();
            for (final forge.game.spellability.SpellAbility sa : forge.ai.ComputerUtilAbility.getOriginalAndAltCostAbilities(
                    new ArrayList<>(top.getAllPossibleAbilities(ai, false)), ai)) {
                if (sa.isSpell() && sa.getMayPlay() != null) {
                    sa.setActivatingPlayer(ai);
                    raw.add(sa);
                }
            }
            final List<String> descs = new ArrayList<>();
            for (final forge.game.spellability.SpellAbility sa : raw) {
                descs.add(sa.getDescription());
            }
            check(!raw.isEmpty() && distinctIdentities(raw) == 1,
                    "D483: Forge's " + raw.size() + " Citadel plays of the top Bolt are one identity: " + descs
                            + (raw.isEmpty() ? "" : " -> " + mtgtable.ai.SearchPolicy.playIdentity(raw.get(0))));
            final List<forge.game.spellability.SpellAbility> bolts = new ArrayList<>();
            for (final forge.game.spellability.SpellAbility sa : mtgtable.ai.SearchPolicy.alternativesForTest(ai, null)) {
                if (sa.getHostCard() == top) {
                    bolts.add(sa);
                }
            }
            check(bolts.size() <= 1, "D483: the search lists the Citadel's Bolt at most once: " + labelsOf(bolts));
        });
    }

    /**
     * D479 (amending D313): what the fork's copy now carries that Forge's
     * {@code GameCopier} leaves off -- an effect card's triggers, replacement
     * effects and source, and every "exiled with" link -- each planted in the
     * real game, then played the same way on the copy and in the real game.
     * Forge's own copier is the control in each: it drops what is checked.
     */
    static void copierCarryScenarios() throws Exception {
        System.out.println("== ai-bench selftest: effect sources, effect traits and exile links on a copy (D479, engine)");
        // 1. Gideon, Ally of Zendikar's +1 (the modern-era cube): an effect whose replacement prevents all damage
        //    dealt to Card.EffectSource.  With no replacement, or a null source, the Bolt takes 3 loyalty.
        scenario("copy-effect-source", List.of("humanlife=20", "ailife=20", "turn=5", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Mountain", "humanhand=Lightning Bolt", "humanlibrary=Forest;Forest;Forest;Forest",
                "ailibrary=Plains;Plains;Plains;Plains", "aibattlefield=Gideon, Ally of Zendikar|Counters:LOYALTY=4;Plains"),
                PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final Game g = ai.getGame();
            final Player human = ai.getWeakestOpponent();
            final Card gid = named(ai.getCardsIn(ZoneType.Battlefield), "Gideon, Ally of Zendikar");
            forge.game.spellability.SpellAbility plus = null;
            for (final forge.game.spellability.SpellAbility sa : gid.getSpellAbilities()) {
                plus = plus == null && sa.isPwAbility() && sa.getDescription().contains("+1") ? sa : plus;
            }
            plus.setActivatingPlayer(ai);
            check(forge.ai.ComputerUtil.handlePlayingSpellAbility(ai, plus, null), "setup: the real game activates Gideon's +1");
            g.getStack().resolveStack();
            final Card eff = effectOf(ai, "Gideon, Ally of Zendikar");
            check(eff != null && eff.getReplacementEffects().size() == 1 && eff.getEffectSource() == gid && gid.getCurrentLoyalty() == 5,
                    "setup: Gideon at 5 loyalty, his effect a replacement whose source is Gideon (" + eff + ")");
            final Game plain = new forge.ai.simulation.GameCopier(g).makeCopy();
            final Card pe = effectOf(plain.getPlayer(ai.getId()), "Gideon, Ally of Zendikar");
            check(pe != null && pe.getReplacementEffects().isEmpty() && pe.getEffectSource() == null,
                    "control: Forge's own copy gives the effect no replacement and no source (" + (pe == null ? null
                            : pe.getReplacementEffects().size() + " replacement(s), source " + pe.getEffectSource()) + ")");
            final LenientGameCopier cp = new LenientGameCopier(g);
            final Game copy = cp.makeCopy(null, ai);
            final Player aiC = (Player) cp.find(ai);
            final Player humanC = (Player) cp.find(human);
            final Card gidC = named(aiC.getCardsIn(ZoneType.Battlefield), "Gideon, Ally of Zendikar");
            final Card effC = effectOf(aiC, "Gideon, Ally of Zendikar");
            check(effC != null && effC.getReplacementEffects().size() == 1 && effC.getEffectSource() == gidC
                            && cp.effectSourceNull().isEmpty(),
                    "the copy's effect has its replacement and its source, the copy's Gideon (" + (effC == null ? null
                            : effC.getReplacementEffects().size() + " replacement(s), source " + effC.getEffectSource()
                            + (effC.getEffectSource() == gidC ? " (the copy's)" : "")) + ", null sources " + cp.effectSourceNull() + ")");
            final int inCopy = boltAt(humanC, gidC);
            final int inReal = boltAt(human, gid);
            check(inReal == 5, "the real game: a Bolt at Gideon is prevented, 5 loyalty (" + inReal + ")");
            check(inCopy == inReal, "the copy as the real game: a Bolt at the copy's Gideon leaves " + inCopy + " loyalty (real " + inReal + ")");
        });
        // 1b. the counter: an effect whose source is in no copied zone (Reckless Impulse put in the sideboard after it
        //     resolved) cannot be named on a copy; it is counted, not guessed
        scenario("copy-effect-source-null", List.of("humanlife=20", "ailife=20", "turn=5", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Forest", "humanlibrary=Forest;Forest;Forest;Forest",
                "ailibrary=Lightning Bolt;Lightning Bolt;Lightning Bolt;Lightning Bolt", "aihand=Reckless Impulse",
                "aibattlefield=Mountain;Mountain"), PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final Game g = ai.getGame();
            check(forge.ai.ComputerUtil.handlePlayingSpellAbility(ai, playOf(ai, "Reckless Impulse", (sa) -> true), null),
                    "setup: the real game casts Reckless Impulse");
            g.getStack().resolveStack();
            final Card eff = effectOf(ai, "Reckless Impulse");
            g.getAction().moveTo(ZoneType.Sideboard, named(ai.getCardsIn(ZoneType.Graveyard), "Reckless Impulse"), null, null);
            final LenientGameCopier cp = new LenientGameCopier(g);
            cp.makeCopy(null, ai);
            check(eff != null && eff.getEffectSource() != null
                            && cp.effectSourceNull().equals(List.of(eff.getName() + " <- Reckless Impulse"))
                            && cp.exileLinksLost().size() == 2,
                    "a source in no copied zone is counted, not guessed (" + cp.effectSourceNull() + "; lost links "
                            + cp.exileLinksLost() + ")");
            final mtgtable.ai.Atlas.Unit u = new mtgtable.ai.Atlas.Unit();
            u.continuation = "forge";
            u.turnCap = g.getPhaseHandler().getTurn();
            u.branchTimeoutMs = 60_000;
            u.observe = null;
            final mtgtable.ai.Atlas.Branch b = mtgtable.ai.Atlas.play(ai, mtgtable.ai.SearchPolicy.priorityCand(null), 0, 0, 7, u,
                    "d479", new LinkedHashMap<>(), null, "d479", false);
            check(b.error == null && b.effectSourceNull == 1 && b.exileLinksLost == 2,
                    "an atlas branch's row counts it, and the two Bolts exiled with the same card: effectSourceNull "
                            + b.effectSourceNull + ", exileLinksLost "
                            + b.exileLinksLost + " (error " + b.error + ")");
        });
        // 2. Oblivion Ring exiled the Bears before the fork (its "exiled with" link, planted as Forge's GameState plants it);
        //    the Ring leaves the battlefield and its trigger returns ExiledWith: the host's exiled cards.
        scenario("copy-exiled-with", List.of("humanlife=20", "ailife=20", "turn=5", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Forest", "humanexile=Grizzly Bears|ExiledWith:7001", "humanlibrary=Forest;Forest;Forest;Forest",
                "ailibrary=Plains;Plains;Plains;Plains", "aibattlefield=Oblivion Ring|Id:7001;Plains"),
                PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final Game g = ai.getGame();
            final Player human = ai.getWeakestOpponent();
            // a scenario's game never left BeforeMulligan, where no trigger is active (D478's note); the lab's are in Play
            g.setAge(forge.game.GameStage.Play);
            g.getTriggerHandler().resetActiveTriggers();
            final Card ring = named(ai.getCardsIn(ZoneType.Battlefield), "Oblivion Ring");
            final Card bears = named(human.getCardsIn(ZoneType.Exile), "Grizzly Bears");
            check(bears.getExiledWith() == ring && ring.hasExiledCard(bears), "setup: the Bears exiled with Oblivion Ring");
            final Game plain = new forge.ai.simulation.GameCopier(g).makeCopy();
            final Card pb = named(plain.getPlayer(human.getId()).getCardsIn(ZoneType.Exile), "Grizzly Bears");
            final Card pr = named(plain.getPlayer(ai.getId()).getCardsIn(ZoneType.Battlefield), "Oblivion Ring");
            check(pb.getExiledWith() == null && !pr.hasExiledCard(), "control: Forge's own copy drops the link (TODO ExiledWith)");
            final LenientGameCopier cp = new LenientGameCopier(g);
            final Game copy = cp.makeCopy(null, ai);
            final Player aiC = (Player) cp.find(ai);
            final Player humanC = (Player) cp.find(human);
            final Card ringC = named(aiC.getCardsIn(ZoneType.Battlefield), "Oblivion Ring");
            final Card bearsC = named(humanC.getCardsIn(ZoneType.Exile), "Grizzly Bears");
            check(bearsC.getExiledWith() == ringC && bearsC.getExiledBy() == aiC && ringC.hasExiledCard(bearsC)
                            && cp.exileLinksLost().isEmpty(),
                    "the copy keeps the link both ways (exiled with " + bearsC.getExiledWith() + ", by " + bearsC.getExiledBy()
                            + ", the Ring's " + ringC.getExiledCards() + ", lost " + cp.exileLinksLost() + ")");
            final String inCopy = ringLeaves(copy, ringC, humanC);
            final String inReal = ringLeaves(g, ring, human);
            check(inReal.equals("Grizzly Bears on the battlefield"), "the real game: the Ring leaves and the Bears return (" + inReal + ")");
            check(inCopy.equals(inReal), "the copy as the real game: " + inCopy);
        });
        // 3. Karn Liberated exiled the Hill Giant before the fork; -14 on the copy puts it onto Karn's controller's
        //    battlefield (D477's follow-up: it went to its owner's library).
        final String lib = "Forest;Forest;Forest;Forest;Forest;Forest;Forest;Forest;Forest;Forest";
        scenario("copy-karn-exiled", List.of("humanlife=20", "ailife=20", "turn=5", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Forest", "humanexile=Hill Giant|ExiledWith:7002", "humanlibrary=" + lib, "ailibrary=" + lib,
                "aibattlefield=Karn Liberated|Id:7002|Counters:LOYALTY=14;Mountain"),
                PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final Game g = ai.getGame();
            final LenientGameCopier cp = new LenientGameCopier(g);
            final Game copy = cp.makeCopy(null, ai);
            final String inCopy = karnRestarts((Player) cp.find(ai));
            final String inReal = karnRestarts(ai);
            check(inReal.equals("Hill Giant on Ai's battlefield"), "the real game: -14 returns the Hill Giant under Karn's controller (" + inReal + ")");
            check(inCopy.equals(inReal) && cp.exileLinksLost().isEmpty(), "the copy as the real game: " + inCopy + " (lost " + cp.exileLinksLost() + ")");
            check(copy.getAge() == forge.game.GameStage.RestartedByKarn, "the copy's game restarted (" + copy.getAge() + ")");
        });
        // 4. An adventure's link and source are an older object of the card (Swift End on the stack): a mirror.
        scenario("copy-adventure-link", List.of("humanlife=20", "ailife=20", "turn=5", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Grizzly Bears;Forest", "humanlibrary=Forest;Forest;Forest;Forest", "ailibrary=Swamp;Swamp;Swamp;Swamp",
                "aihand=Murderous Rider", "aibattlefield=Swamp;Swamp;Swamp;Swamp;Swamp;Swamp"),
                PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final Game g = ai.getGame();
            final forge.game.spellability.SpellAbility swift = playOf(ai, "Murderous Rider", (sa) -> sa.isAdventure());
            swift.resetTargets();
            swift.getTargets().add(named(ai.getWeakestOpponent().getCardsIn(ZoneType.Battlefield), "Grizzly Bears"));
            check(forge.ai.ComputerUtil.handlePlayingSpellAbility(ai, swift, null), "setup: the real game casts Swift End");
            g.getStack().resolveStack();
            final Card rider = named(ai.getCardsIn(ZoneType.Exile), "Murderous Rider");
            final LenientGameCopier cp = new LenientGameCopier(g);
            cp.makeCopy(null, ai);
            final Player aiC = (Player) cp.find(ai);
            final Card riderC = named(aiC.getCardsIn(ZoneType.Exile), "Murderous Rider");
            final Card adv = effectOf(aiC, "Swift End");
            check(rider.isOnAdventure() && riderC.isOnAdventure(), "the copy's Rider is on an adventure, as the real one is ("
                    + riderC.isOnAdventure() + ", exiled with " + riderC.getExiledWith() + ")");
            check(adv != null && adv.getEffectSource() != null && adv.getEffectSource().getId() == rider.getId()
                            && "Swift End".equals(adv.getEffectSource().getName()) && adv.getEffectSource() != riderC,
                    "the adventure's effect names Swift End as its source, a mirror of the copy's card (" + (adv == null ? null
                            : adv.getEffectSource()) + ")");
        });
        // 5. The Monarch, copied: its two triggers (draw at the end step, taken by combat damage).
        scenario("copy-monarch-triggers", List.of("humanlife=20", "ailife=20", "turn=5", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Forest", "humanlibrary=Forest;Forest;Forest;Forest", "ailibrary=Swamp;Swamp;Swamp;Swamp",
                "aibattlefield=Swamp"), PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final Game g = ai.getGame();
            g.getAction().becomeMonarch(ai, "CN2");
            final int real = monarchCards(ai).get(0).getTriggers().size();
            final Game plain = new forge.ai.simulation.GameCopier(g).makeCopy();
            final int forge = monarchCards(plain.getPlayer(ai.getId())).get(0).getTriggers().size();
            final LenientGameCopier cp = new LenientGameCopier(g);
            cp.makeCopy(null, ai);
            final List<Card> mc = monarchCards((Player) cp.find(ai));
            check(real == 2 && forge == 0 && mc.size() == 1 && mc.get(0).getTriggers().size() == real && cp.traitsLeft().isEmpty(),
                    "the copied monarch effect has its " + real + " triggers (Forge's own copy: " + forge + "; this copy: "
                            + (mc.isEmpty() ? "none" : mc.get(0).getTriggers().size()) + ")");
        });
        copierFollowUpScenarios();
    }

    /**
     * D479's follow-ups (#205's review).  6. The carry pass sets every copied
     * card's timestamps to its original's, where Forge set them on the
     * battlefield only: on a plain fork (no effect card, no exile link) the
     * branches play the same, seed for seed, with the plain cards' timestamps
     * carried and left as Forge gave them.  7. A mirror names the zone the
     * original's old object names, not the live card's.
     */
    static void copierFollowUpScenarios() throws Exception {
        System.out.println("== ai-bench selftest: a plain fork's timestamps and a mirror's zone (D479's follow-ups, engine)");
        // 6. search-evalleaf-only's board, in the lab's game stage, after a draw and a discard each
        scenario("copy-plain-timestamps", List.of(
                "humanlife=12", "ailife=14", "turn=5", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Forest;Forest;Wall of Wood", "humanhand=Grizzly Bears;Forest",
                "humanlibrary=Forest;Hill Giant;Forest;Forest", "aihand=Typhoid Rats;Swamp",
                "ailibrary=Swamp;Swamp;Hill Giant;Swamp",
                "aibattlefield=Grizzly Bears;Hill Giant;Swamp;Swamp;Swamp;Mountain"),
                PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final Game g = ai.getGame();
            g.setAge(forge.game.GameStage.Play);
            g.getTriggerHandler().resetActiveTriggers();
            // a planted card has no move behind it, and its copy's timestamps are its own already: give the hands and
            // graveyards the moves a real game's have -- each player draws a card and discards a land
            for (final Player p : g.getPlayers()) {
                p.drawCards(1);
                Card land = null;
                for (final Card c : p.getCardsIn(ZoneType.Hand)) {
                    land = land == null && c.isLand() ? c : land;
                }
                g.getAction().moveToGraveyard(land, null);
            }
            int effects = 0;
            for (final Player p : g.getPlayers()) {
                effects += p.getCardsIn(ZoneType.Command).size();
            }
            final LenientGameCopier probe = new LenientGameCopier(g);
            probe.makeCopy(null, ai);
            check(effects == 0 && probe.plainTimestampsMoved() > 0 && probe.traitsCarried() == 0 && probe.linksCarried() == 0,
                    "setup: a plain fork -- no effect card, nothing linked -- whose carry pass moves "
                            + probe.plainTimestampsMoved() + " plain cards' timestamps (" + effects + " command-zone cards, "
                            + probe.traitsCarried() + " traits, " + probe.linksCarried() + " links carried)");
            final int seeds = 6;
            int same = 0;
            int played = 0;
            final StringBuilder diff = new StringBuilder();
            final StringBuilder ends = new StringBuilder();
            for (final String cont : new String[] {"forge", "random"}) {
                for (long seed = 1; seed <= seeds; seed++) {
                    final mtgtable.ai.Atlas.Branch[] b = new mtgtable.ai.Atlas.Branch[2];
                    for (int k = 0; k < 2; k++) {
                        final mtgtable.ai.Atlas.Unit u = new mtgtable.ai.Atlas.Unit();
                        u.continuation = cont;
                        u.branchTimeoutMs = 60_000;
                        u.observe = null;
                        LenientGameCopier.carryPlainTimestampsForTest(k == 0);
                        try {
                            b[k] = mtgtable.ai.Atlas.play(ai, mtgtable.ai.SearchPolicy.forgeCand(), 0, 0, seed, u,
                                    "d479fu", new LinkedHashMap<>(), null, "d479fu", false);
                        } finally {
                            LenientGameCopier.carryPlainTimestampsForTest(true);
                        }
                    }
                    final String on = b[0].result + "/" + b[0].turns + "t/" + b[0].steps + "s" + (b[0].capped ? "/cap" : "")
                            + (b[0].error == null ? "" : "/" + b[0].error);
                    final String off = b[1].result + "/" + b[1].turns + "t/" + b[1].steps + "s" + (b[1].capped ? "/cap" : "")
                            + (b[1].error == null ? "" : "/" + b[1].error);
                    ends.append(' ').append(cont.charAt(0)).append(seed).append('=').append(on);
                    if (on.equals(off)) {
                        same++;
                    } else {
                        diff.append(' ').append(cont).append(" seed ").append(seed).append(": carried ").append(on)
                                .append(", Forge's ").append(off);
                    }
                    played += b[0].error == null && b[0].unavailable == null && !b[0].engineError && b[0].steps > 0 ? 1 : 0;
                }
            }
            check(played == 2 * seeds, "every branch played (" + played + " of " + (2 * seeds) + "):" + ends);
            check(same == 2 * seeds, "a plain fork's branches end the same with the plain timestamps carried and not: "
                    + same + " of " + (2 * seeds) + " (result, turns, steps, cap)" + diff);
        });
        // 7. Reckless Impulse resolved (its effect's source: the spell's object, which then names the graveyard), then
        //    the card moved on to exile: the original's source still names the graveyard, and so does the mirror
        scenario("copy-mirror-zone", List.of("humanlife=20", "ailife=20", "turn=5", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Forest", "humanlibrary=Forest;Forest;Forest;Forest",
                "ailibrary=Lightning Bolt;Lightning Bolt;Lightning Bolt;Lightning Bolt", "aihand=Reckless Impulse",
                "aibattlefield=Mountain;Mountain"), PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final Game g = ai.getGame();
            check(forge.ai.ComputerUtil.handlePlayingSpellAbility(ai, playOf(ai, "Reckless Impulse", (sa) -> true), null),
                    "setup: the real game casts Reckless Impulse");
            g.getStack().resolveStack();
            final Card eff = effectOf(ai, "Reckless Impulse");
            final Card src = eff == null ? null : eff.getEffectSource();
            final String atResolve = src == null || src.getZone() == null ? null : String.valueOf(src.getZone().getZoneType());
            g.getAction().exile(named(ai.getCardsIn(ZoneType.Graveyard), "Reckless Impulse"), null, null);
            final Card live = named(ai.getCardsIn(ZoneType.Exile), "Reckless Impulse");
            check(src != null && src != live && "Graveyard".equals(atResolve) && src.isInZone(ZoneType.Graveyard)
                            && live.isInZone(ZoneType.Exile),
                    "setup: the effect's source names the graveyard (at resolution " + atResolve + "), the card is in exile ("
                            + (src == null ? null : src.getZone()) + "; live " + live.getZone() + ")");
            final LenientGameCopier cp = new LenientGameCopier(g);
            cp.makeCopy(null, ai);
            final Player aiC = (Player) cp.find(ai);
            final Card effC = effectOf(aiC, "Reckless Impulse");
            final Card m = effC == null ? null : effC.getEffectSource();
            final Card liveC = named(aiC.getCardsIn(ZoneType.Exile), "Reckless Impulse");
            check(m != null && m != liveC && m.getId() == live.getId() && m.getZone() == aiC.getZone(ZoneType.Graveyard)
                            && !aiC.getZone(ZoneType.Graveyard).contains(m) && m.isInZone(ZoneType.Graveyard)
                            && !m.isInZone(ZoneType.Exile) && liveC.isInZone(ZoneType.Exile),
                    "the mirror names the copy's graveyard, as the original's source does, and is in none ("
                            + (m == null ? null : m + " @ " + m.getZone()) + "; the copy's card @ " + liveC.getZone() + ")");
        });
    }

    /** D479: the command-zone effect whose name starts with {@code host}'s, or null. */
    private static Card effectOf(final Player p, final String host) {
        for (final Card c : p.getCardsIn(ZoneType.Command)) {
            if (c.getName().startsWith(host) && c.getGamePieceType() == forge.card.GamePieceType.EFFECT) {
                return c;
            }
        }
        return null;
    }

    /** D479: {@code caster} Bolts {@code at} (a planeswalker); its loyalty after. */
    private static int boltAt(final Player caster, final Card at) {
        final Card bolt = named(caster.getCardsIn(ZoneType.Hand), "Lightning Bolt");
        final forge.game.spellability.SpellAbility sa = bolt.getFirstSpellAbility();
        sa.setActivatingPlayer(caster);
        sa.resetTargets();
        sa.getTargets().add(at);
        if (!forge.ai.ComputerUtil.handlePlayingSpellAbility(caster, sa, null)) {
            return -1;
        }
        caster.getGame().getStack().resolveStack();
        return at.getCurrentLoyalty();
    }

    /** D479: Oblivion Ring leaves the battlefield; its trigger resolves; where the Bears are. */
    private static String ringLeaves(final Game game, final Card ring, final Player owner) {
        // as DestroyEffect moves it: a zone table over the last state, whose triggerChangesZoneAll registers the
        // leaves-the-battlefield triggers of the last state's cards; then the waiting triggers are collected and run
        final forge.game.card.CardZoneTable table = new forge.game.card.CardZoneTable(game.copyLastStateBattlefield(),
                game.copyLastStateGraveyard());
        final Map<forge.game.ability.AbilityKey, Object> params = forge.game.ability.AbilityKey.newMap();
        params.put(forge.game.ability.AbilityKey.LastStateBattlefield, table.getLastStateBattlefield());
        params.put(forge.game.ability.AbilityKey.LastStateGraveyard, table.getLastStateGraveyard());
        final Card moved = game.getAction().moveToGraveyard(ring, null, params);
        table.put(ZoneType.Battlefield, ZoneType.Graveyard, moved);
        table.triggerChangesZoneAll(game, null);
        game.getTriggerHandler().collectTriggerForWaiting();
        game.getTriggerHandler().runWaitingTriggers();
        game.getStack().unfreezeStack();
        for (int i = 0; i < 4; i++) {
            game.getStack().addAllTriggeredAbilitiesToStack();
            if (game.getStack().isEmpty()) {
                break;
            }
            game.getStack().resolveStack();
        }
        for (final ZoneType z : new ZoneType[] {ZoneType.Battlefield, ZoneType.Exile, ZoneType.Graveyard, ZoneType.Library}) {
            for (final Card c : owner.getCardsIn(z)) {
                if ("Grizzly Bears".equals(c.getName())) {
                    return "Grizzly Bears on the " + z.name().toLowerCase(Locale.ROOT);
                }
            }
        }
        return "no Grizzly Bears";
    }

    /** D479: {@code p}'s Karn Liberated plays -14; whose zone holds the Hill Giant after. */
    private static String karnRestarts(final Player p) {
        final Game game = p.getGame();
        final Card karn = named(p.getCardsIn(ZoneType.Battlefield), "Karn Liberated");
        forge.game.spellability.SpellAbility restart = null;
        for (final forge.game.spellability.SpellAbility sa : karn.getSpellAbilities()) {
            restart = sa.getApi() == forge.game.ability.ApiType.RestartGame ? sa : restart;
        }
        restart.setActivatingPlayer(p);
        if (!forge.ai.ComputerUtil.handlePlayingSpellAbility(p, restart, null)) {
            return "-14 not played";
        }
        game.getStack().resolveStack();
        for (final Player q : game.getPlayers()) {
            for (final ZoneType z : new ZoneType[] {ZoneType.Battlefield, ZoneType.Exile, ZoneType.Library, ZoneType.Hand}) {
                for (final Card c : q.getCardsIn(z)) {
                    if ("Hill Giant".equals(c.getName())) {
                        return "Hill Giant on " + q.getName() + "'s " + z.name().toLowerCase(Locale.ROOT);
                    }
                }
            }
        }
        return "no Hill Giant";
    }

    /**
     * D474: a player who lost the monarch keeps its effect card in a field,
     * out of the command zone but still naming it.  The fork's copy mapped that
     * card to a stand-in with no owner, made it the copied player's monarch
     * effect, and when that player became the monarch again in the copy
     * {@code createMonarchEffect} put the stand-in in the command zone, where
     * the view's flashback scan threw {@code Cannot invoke Player.getView()
     * because player is null} (J161's pilot, d41, two Forge continuations).
     */
    static void staleEffectScenarios() throws Exception {
        System.out.println("== ai-bench selftest: a stale monarch effect on a copy (D474, engine)");
        final List<String> board = List.of("humanlife=20", "ailife=20", "turn=5", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Forest", "humanlibrary=Forest;Forest;Forest;Forest", "ailibrary=Swamp;Swamp;Swamp;Swamp",
                "aibattlefield=Swamp");
        scenario("copy-stale-monarch", board, PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final forge.game.Game g = ai.getGame();
            final Player human = ai.getWeakestOpponent();
            g.getAction().becomeMonarch(human, "CN2");
            g.getAction().becomeMonarch(ai, "CN2");   // the human's effect leaves the command zone, its field kept
            check(g.getMonarch() == ai && monarchCards(human).isEmpty() && monarchCards(ai).size() == 1,
                    "setup: the AI took the monarch from the human");
            String plain = "copied";
            try {
                new forge.ai.simulation.GameCopier(g).makeCopy();
            } catch (final RuntimeException e) {
                plain = String.valueOf(e.getMessage());
            }
            check(plain.startsWith("Couldn't map The Monarch"),
                    "control: Forge's own GameCopier cannot map the stale effect card (" + plain + ")");
            final LenientGameCopier cp = new LenientGameCopier(g);
            final forge.game.Game copy = cp.makeCopy(null, ai);
            final Player humanC = (Player) cp.find(human);
            final Player aiC = (Player) cp.find(ai);
            check(cp.unmapped() == 0 && cp.staleEffects().equals(List.of("The Monarch@Command")),
                    "the copy maps the stale effect to nothing, not to a stand-in (stand-ins " + cp.unmappedNames()
                            + ", stale " + cp.staleEffects() + ")");
            String err = null;
            try {
                copy.getAction().becomeMonarch(humanC, "CN2");
            } catch (final RuntimeException e) {
                err = e.toString();
            }
            final List<Card> hm = monarchCards(humanC);
            check(err == null && copy.getMonarch() == humanC && hm.size() == 1 && hm.get(0).getOwner() == humanC
                            && hm.get(0).getTriggers().size() == 2 && monarchCards(aiC).isEmpty(),
                    "in the copy the human becomes the monarch again: a fresh effect card it owns, with both triggers (error "
                            + err + ", monarch " + copy.getMonarch() + ", effect " + hm
                            + (hm.isEmpty() ? "" : ", owner " + hm.get(0).getOwner() + ", " + hm.get(0).getTriggers().size()
                            + " trigger(s)") + ")");
            check(g.getMonarch() == ai && monarchCards(human).isEmpty() && monarchCards(ai).size() == 1,
                    "the real game is untouched: the AI is still the monarch");
        });
    }

    private static List<Card> monarchCards(final Player p) {
        final List<Card> out = new ArrayList<>();
        for (final Card c : p.getCardsIn(ZoneType.Command)) {
            if ("The Monarch".equals(c.getName())) {
                out.add(c);
            }
        }
        return out;
    }

    /**
     * D470: a forced block on the copy of a decision taken while the copied
     * combat already held Forge's block.  The seat's one creature, Hill Giant,
     * blocks Grizzly Bears (Forge's block, left on the combat as chooseBlock
     * leaves it); a Wall of Wood stays home.  Before D470 the copied block made
     * {@code CombatUtil.canBlock(Player, Combat)} false, the seat was never
     * asked, "block none" played Forge's block, and the forced answer waited
     * for a later combat, where an attacker no longer attacking threw Forge's
     * {@code No band for attacker} (J158 spine 461's d10 and d14).
     */
    static void forcedBlockScenarios() throws Exception {
        System.out.println("== ai-bench selftest: forced blocks on a copy (D470, engine)");
        final List<String> board = List.of("humanlife=20", "ailife=20", "turn=5", "activeplayer=human",
                "activephase=COMBAT_DECLARE_BLOCKERS", "humanbattlefield=Grizzly Bears;Wall of Wood;Forest",
                "humanlibrary=Forest;Forest;Forest;Forest", "ailibrary=Swamp;Swamp;Swamp;Swamp", "aibattlefield=Hill Giant;Swamp");
        final List<String> tapped = new ArrayList<>(board);
        tapped.set(tapped.size() - 1, "aibattlefield=Hill Giant|Tapped;Swamp");
        // 1. The search's playout (the same BlockCand.install): "block none" plays no block, the block plays the block.
        scenario("forced-block-none", board, PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final Card[] gb = forgeBlock(ai);
            for (final boolean none : new boolean[] {true, false}) {
                final Map<Card, Card> m = new LinkedHashMap<>();
                if (!none) {
                    m.put(gb[1], gb[0]);
                }
                final int[] life = {-1};
                final boolean[] bearsAlive = {false};
                mtgtable.ai.SearchPolicy.leafProbeForTest((copy, aiC) -> {
                    life[0] = aiC.getLife();
                    for (final Card c : copy.getCardsIn(ZoneType.Battlefield)) {
                        bearsAlive[0] |= "Grizzly Bears".equals(c.getName());
                    }
                });
                final CountSink sink = new CountSink();
                try {
                    mtgtable.ai.SearchPolicy.playout(ai.getGame(), ai, mtgtable.ai.SearchPolicy.blockCand(m), 7,
                            new mtgtable.ai.SearchPolicy.Limits(System.nanoTime() + 20_000_000_000L, 0, 20_000), sink, false, null);
                } finally {
                    mtgtable.ai.SearchPolicy.leafProbeForTest(null);
                }
                check(none ? life[0] == 18 && bearsAlive[0] : life[0] == 20 && !bearsAlive[0],
                        (none ? "block none, with Forge's block on the copied combat: the Bears hit (life 18, Bears alive)"
                                : "the block: the Giant kills the Bears (life 20)")
                                + " -- got life " + life[0] + ", Bears " + (bearsAlive[0] ? "alive" : "dead") + " (" + sink.counts + ")");
            }
            check(ai.getGame().getPhaseHandler().getCombat().isBlocking(gb[1], gb[0]),
                    "the real game's combat still holds Forge's block");
        });
        // 2. The atlas: a forced block on a creature that is not attacking is an unavailable option, not Forge's NPE.
        scenario("forced-block-not-attacking", board, PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final Card[] gb = forgeBlock(ai);
            final Card wall = ai.getWeakestOpponent().getCardsIn(ZoneType.Battlefield).stream()
                    .filter((c) -> "Wall of Wood".equals(c.getName())).findFirst().orElseThrow();
            final mtgtable.ai.Atlas.Branch ok = atlasBranch(ai, Map.of(gb[1], gb[0]));
            check(ok.unavailable == null && ok.error == null && !ok.engineError && ok.steps > 0,
                    "control: the forced block on the attacker plays (" + ok.steps + " steps, unavailable " + ok.unavailable
                            + ", error " + ok.error + ")");
            final mtgtable.ai.Atlas.Branch b = atlasBranch(ai, Map.of(gb[1], wall));
            check(b.unavailable != null && b.unavailable.contains("Wall of Wood") && b.unavailable.contains("is not attacking")
                            && b.error == null && !b.engineError,
                    "a forced block on Wall of Wood, which is not attacking, is unavailable, not an error (unavailable "
                            + b.unavailable + ", error " + b.error + ")");
        });
        // 3. The atlas: a seat the copy never asks (its one creature tapped) -- the answer expires, never given later.
        scenario("forced-block-never-asked", tapped, PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final Card[] gb = forgeBlock(ai);
            final mtgtable.ai.Atlas.Branch b = atlasBranch(ai, Map.of(gb[1], gb[0]));
            check(b.unavailable != null && b.unavailable.contains("never asked to declare blockers") && b.error == null
                            && !b.engineError && b.turns == 5,
                    "a seat never asked at the fork's combat: unavailable at turn 5, not a stale block later (unavailable "
                            + b.unavailable + ", turn " + b.turns + ", error " + b.error + ")");
        });
    }

    /**
     * D478: an atlas branch the turn cap ends is a draw, {@code result 0}.
     * {@code Game.setGameOver(GameEndReason.Draw)} gives every player without
     * an outcome a win ({@code Player.onGameOver}), and the branch read the
     * atlas seat's {@code hasWon()} back: every capped lab branch through J162
     * was scored seat A's win.  A quiet board (lands only, both at 20, nothing
     * to cast) played to a cap one turn on must come back capped and 0; the
     * control, a Lightning Bolt forced at a seat on 2 life, ends the game
     * before the cap and must still read as the seat's win.
     */
    static void cappedDrawScenarios() throws Exception {
        System.out.println("== ai-bench selftest: a capped atlas branch is a draw (D478, engine)");
        final String lib = "Forest;Forest;Forest;Forest;Forest;Forest;Forest;Forest;Forest;Forest";
        final List<String> quiet = List.of("humanlife=20", "ailife=20", "turn=5", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Forest;Forest", "humanlibrary=" + lib, "aibattlefield=Forest;Forest", "ailibrary=" + lib);
        scenario("capped-branch-draw", quiet, PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final mtgtable.ai.Atlas.Unit u = new mtgtable.ai.Atlas.Unit();
            u.continuation = "forge";
            u.turnCap = ai.getGame().getPhaseHandler().getTurn() + 1;
            u.branchTimeoutMs = 60_000;
            u.observe = null;
            final mtgtable.ai.Atlas.Branch b = mtgtable.ai.Atlas.play(ai, mtgtable.ai.SearchPolicy.priorityCand(null), 0, 0, 7,
                    u, "d478", new LinkedHashMap<>(), null, "d478", false);
            check(b.error == null && b.unavailable == null && !b.engineError && !b.timedOut && b.capped
                            && b.turns == u.turnCap + 1 && b.result == 0,
                    "a branch the turn cap ends (cap " + u.turnCap + ") is capped and scored a draw (capped " + b.capped
                            + ", turns " + b.turns + ", result " + b.result + ", error " + b.error + ")");
            check(!ai.getGame().isGameOver(), "the real game is untouched: not over");
        });
        final List<String> lethal = List.of("humanlife=2", "ailife=20", "turn=5", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Forest;Forest", "humanlibrary=" + lib, "aibattlefield=Mountain;Forest", "aihand=Lightning Bolt",
                "ailibrary=" + lib);
        scenario("capped-branch-control", lethal, PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final Card bolt = named(ai.getCardsIn(ZoneType.Hand), "Lightning Bolt");
            final forge.game.spellability.SpellAbility sa = bolt.getFirstSpellAbility();
            sa.setActivatingPlayer(ai);
            sa.resetTargets();
            sa.getTargets().add(ai.getWeakestOpponent());
            final mtgtable.ai.Atlas.Unit u = new mtgtable.ai.Atlas.Unit();
            u.continuation = "forge";
            u.turnCap = ai.getGame().getPhaseHandler().getTurn() + 1;
            u.branchTimeoutMs = 60_000;
            u.observe = null;
            final mtgtable.ai.Atlas.Branch b = mtgtable.ai.Atlas.play(ai, mtgtable.ai.SearchPolicy.priorityCand(sa), 0, 0, 7,
                    u, "d478", new LinkedHashMap<>(), null, "d478", false);
            check(b.error == null && b.unavailable == null && !b.engineError && !b.capped && b.turns == 5 && b.result == 1,
                    "control: a branch that ends the game before the cap keeps its result (capped " + b.capped + ", turns "
                            + b.turns + ", result " + b.result + ", error " + b.error + ")");
        });
    }

    /**
     * D480: an atlas unit with an option subset ({@code Atlas.Unit.options}, early stopping's options still running)
     * plays those options only, every branch of each, through the hook itself; the control with no subset plays every
     * option.  The decision: pass, a Lightning Bolt at the opponent, Forge's own answer -- three candidates, two
     * branches each, the subset options 0 and 2.
     */
    static void unitOptionsScenarios() throws Exception {
        System.out.println("== ai-bench selftest: an atlas unit plays its option subset (D480, engine)");
        final String lib = "Forest;Forest;Forest;Forest;Forest;Forest;Forest;Forest;Forest;Forest";
        final List<String> board = List.of("humanlife=20", "ailife=20", "turn=5", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Forest;Forest", "humanlibrary=" + lib, "aibattlefield=Mountain;Forest", "aihand=Lightning Bolt",
                "ailibrary=" + lib);
        for (final boolean subset : new boolean[] {true, false}) {
            scenario(subset ? "atlas-unit-options" : "atlas-unit-options-control", board, PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
                final Card bolt = named(ai.getCardsIn(ZoneType.Hand), "Lightning Bolt");
                final forge.game.spellability.SpellAbility sa = bolt.getFirstSpellAbility();
                sa.setActivatingPlayer(ai);
                sa.resetTargets();
                sa.getTargets().add(ai.getWeakestOpponent());
                final List<mtgtable.ai.SearchPolicy.Cand> cands = List.of(mtgtable.ai.SearchPolicy.priorityCand(null),
                        mtgtable.ai.SearchPolicy.priorityCand(sa), mtgtable.ai.SearchPolicy.forgeCand());
                final mtgtable.ai.Atlas.Unit u = new mtgtable.ai.Atlas.Unit();
                u.seat = ai.getName();
                u.decision = 0;
                u.continuation = "forge";
                u.i0 = 0;
                u.i1 = 2;
                u.seed = 480;
                u.turnCap = ai.getGame().getPhaseHandler().getTurn() + 1;
                u.branchTimeoutMs = 60_000;
                u.observe = null;
                u.options = subset ? new java.util.TreeSet<>(List.of(0, 2)) : null;
                final mtgtable.ai.Atlas.Hook h = new mtgtable.ai.Atlas.Hook(u);
                h.decision(ai, cands, "p");
                final java.util.Set<Integer> played = new java.util.TreeSet<>();
                for (final mtgtable.ai.Atlas.Branch b : h.branches) {
                    played.add(b.option);
                }
                check(h.error == null && h.branches.size() == (subset ? 4 : 6) && played.equals(subset ? java.util.Set.of(0, 2) : java.util.Set.of(0, 1, 2)),
                        (subset ? "the subset {0, 2}" : "control, no subset") + ": " + h.branches.size() + " branch(es) over options " + played
                                + (h.error == null ? "" : " -- " + h.error));
                check(!ai.getGame().isGameOver(), "the real game is untouched: not over");
            });
        }
    }

    /**
     * D478's addendum: a game the ENGINE ends drawn is a draw, {@code result 0}, in the atlas and in the search
     * alike ({@code SearchPolicy.resultOf}, the one place).  Forge draws a game two ways and planted here are both:
     * every player loses at once (a Flame Rift forced with both seats on 2 life: both at -2, {@code
     * checkGameOverCondition} finds no player left, {@code GameEndReason.Draw}, both outcomes losses), and an effect
     * makes it a draw (Divine Intervention's last intervention counter removed at the seat's upkeep: {@code
     * GameDrawEffect}, {@code intentionalDraw()} on both, a {@code lossState} of {@code IntentionalDraw}).  Before
     * the fix both read -1, {@code hasLost} first.  A third, {@code setGameOver(Draw)} on a game with no outcome
     * yet (both {@code win()}, which read +1), is asserted on the scenario's own game at the end.  The control: the
     * same Flame Rift with only the seat on 2 life is still a loss, -1.
     */
    static void engineDrawScenarios() throws Exception {
        System.out.println("== ai-bench selftest: a game the engine ends drawn is a draw (D478 addendum, engine)");
        final String lib = "Forest;Forest;Forest;Forest;Forest;Forest;Forest;Forest;Forest;Forest";
        final java.util.function.BiFunction<Integer, Integer, List<String>> rift = (aiLife, otherLife) -> List.of(
                "humanlife=" + otherLife, "ailife=" + aiLife, "turn=5", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Forest;Forest", "humanlibrary=" + lib, "aibattlefield=Mountain;Mountain",
                "aihand=Flame Rift", "ailibrary=" + lib);
        final java.util.function.Function<Player, forge.game.spellability.SpellAbility> riftSa = (ai) -> {
            final forge.game.spellability.SpellAbility sa = named(ai.getCardsIn(ZoneType.Hand), "Flame Rift").getFirstSpellAbility();
            sa.setActivatingPlayer(ai);
            return sa;
        };
        // 1. both seats lose at once: a draw, from the atlas's branch and from the search's playout
        scenario("engine-draw-both-lose", rift.apply(2, 2), PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final Game g = ai.getGame();
            final forge.game.spellability.SpellAbility sa = riftSa.apply(ai);
            final mtgtable.ai.Atlas.Branch b = mtgtable.ai.Atlas.play(ai, mtgtable.ai.SearchPolicy.priorityCand(sa), 0, 0, 7,
                    drawUnit(g, 1), "d478e", new LinkedHashMap<>(), null, "d478e", false);
            check(b.error == null && b.unavailable == null && !b.engineError && !b.timedOut && !b.capped && b.turns == 5
                            && b.result == 0,
                    "an atlas branch both seats lose at once (Flame Rift, both on 2) is a draw, not the seat's loss (capped "
                            + b.capped + ", turns " + b.turns + ", result " + b.result + ", error " + b.error + ")");
            final mtgtable.ai.SearchPolicy.Playout po = mtgtable.ai.SearchPolicy.playout(g, ai,
                    mtgtable.ai.SearchPolicy.priorityCand(sa), 7,
                    new mtgtable.ai.SearchPolicy.Limits(System.nanoTime() + 60_000_000_000L, 1, 20_000), new CountSink(), false, null);
            check(po != null && po.over && po.result == 0 && mtgtable.ai.SearchPolicy.winOf(po) == 0.5 && po.leaf == 0,
                    "a search playout both seats lose at once is a draw: result 0, win .5, leaf 0 ("
                            + (po == null ? "no playout" : "over " + po.over + ", result " + po.result + ", win "
                            + mtgtable.ai.SearchPolicy.winOf(po) + ", leaf " + po.leaf) + ")");
            check(!g.isGameOver() && ai.getLife() == 2, "the real game is untouched: not over, the seat on 2");
            // 3. setGameOver(Draw) on a game with no outcome yet: Player.onGameOver gives both a win -- still a draw
            g.setGameOver(GameEndReason.Draw);
            check(ai.hasWon() && ai.getWeakestOpponent().hasWon() && mtgtable.ai.SearchPolicy.resultOf(g, ai) == 0,
                    "a game set over as a draw with no outcome (both seats win()) reads 0, not the seat's win (resultOf "
                            + mtgtable.ai.SearchPolicy.resultOf(g, ai) + ")");
        });
        // the control: only the seat on 2 -- the same spell is still the seat's loss
        scenario("engine-draw-control", rift.apply(2, 20), PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final mtgtable.ai.Atlas.Branch b = mtgtable.ai.Atlas.play(ai, mtgtable.ai.SearchPolicy.priorityCand(riftSa.apply(ai)),
                    0, 0, 7, drawUnit(ai.getGame(), 1), "d478e", new LinkedHashMap<>(), null, "d478e", false);
            check(b.error == null && b.unavailable == null && !b.capped && b.turns == 5 && b.result == -1,
                    "control: a Flame Rift only the seat dies to is its loss, -1 (capped " + b.capped + ", turns " + b.turns
                            + ", result " + b.result + ", error " + b.error + ")");
        });
        // 2. an effect makes it a draw: Divine Intervention's last counter, removed at the seat's next upkeep (turn 7)
        final List<String> quiet = List.of("humanlife=20", "ailife=20", "turn=5", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Forest;Forest", "humanlibrary=" + lib,
                "aibattlefield=Divine Intervention|Counters:INTERVENTION=1;Forest;Forest", "ailibrary=" + lib);
        scenario("engine-draw-intentional", quiet, PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final Game g = ai.getGame();
            // a scenario's game never left BeforeMulligan, and checkStateEffects activates triggers only in Play: an
            // upkeep trigger would never fire (the lab's games are in Play)
            g.setAge(forge.game.GameStage.Play);
            g.getTriggerHandler().resetActiveTriggers();
            final mtgtable.ai.Atlas.Branch b = mtgtable.ai.Atlas.play(ai, mtgtable.ai.SearchPolicy.priorityCand(null), 0, 0, 7,
                    drawUnit(g, 4), "d478e", new LinkedHashMap<>(), null, "d478e", false);
            check(b.error == null && b.unavailable == null && !b.engineError && !b.timedOut && !b.capped && b.turns == 7
                            && b.result == 0,
                    "an atlas branch Divine Intervention draws at turn 7 is a draw, not the seat's loss (capped " + b.capped
                            + ", turns " + b.turns + ", result " + b.result + ", error " + b.error + ")");
            final mtgtable.ai.SearchPolicy.Playout po = mtgtable.ai.SearchPolicy.playout(g, ai,
                    mtgtable.ai.SearchPolicy.priorityCand(null), 7,
                    new mtgtable.ai.SearchPolicy.Limits(System.nanoTime() + 60_000_000_000L, 3, 20_000), new CountSink(), false, null);
            check(po != null && po.over && po.result == 0 && mtgtable.ai.SearchPolicy.winOf(po) == 0.5 && po.leaf == 0,
                    "a search playout Divine Intervention draws is a draw: result 0, win .5, leaf 0 ("
                            + (po == null ? "no playout" : "over " + po.over + ", result " + po.result + ", turns " + po.turns
                            + ", leaf " + po.leaf) + ")");
            check(!g.isGameOver(), "the real game is untouched: not over");
        });
    }

    /** An atlas unit for {@link #engineDrawScenarios}: Forge on both seats, the cap {@code turns} past the fork's turn. */
    private static mtgtable.ai.Atlas.Unit drawUnit(final Game g, final int turns) {
        final mtgtable.ai.Atlas.Unit u = new mtgtable.ai.Atlas.Unit();
        u.continuation = "forge";
        u.turnCap = g.getPhaseHandler().getTurn() + turns;
        u.branchTimeoutMs = 60_000;
        u.observe = null;
        return u;
    }

    /**
     * D477: Karn Liberated's -14 restarts a fork's game.  Forge's restart sets
     * the phase to null and leaves the new game to {@code GameAction.startGame}'s
     * loop, which a fork's own step loop is not: the next priority threw
     * {@code NullPointerException} at {@code ComputerUtilAbility.getAvailableLandsToPlay}
     * (J162's modern7 spine, 62 random branches).  Planted here with Karn at 14
     * loyalty on the seat's turn 5, the -14 forced as the seat's answer: an
     * atlas branch and a search playout must start the new game (fresh hands
     * and life, the activator's turn 1) and play it on, its turns counted on
     * from turn 5's, with the real game untouched.
     */
    static void karnRestartScenarios() throws Exception {
        System.out.println("== ai-bench selftest: Karn Liberated restarts a fork's game (D477, engine)");
        final String lib = "Grizzly Bears;Forest;Hill Giant;Forest;Mountain;Grizzly Bears;Forest;Mountain;Hill Giant;Forest;"
                + "Grizzly Bears;Forest;Mountain;Forest;Hill Giant;Forest";
        final List<String> board = List.of("humanlife=11", "ailife=7", "turn=5", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Grizzly Bears;Forest;Forest", "humanhand=Hill Giant", "humanlibrary=" + lib,
                "aibattlefield=Karn Liberated|Counters:LOYALTY=14;Mountain;Mountain", "aihand=Grizzly Bears", "ailibrary=" + lib);
        scenario("karn-restart-fork", board, PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final Game g = ai.getGame();
            final Card karn = named(ai.getCardsIn(ZoneType.Battlefield), "Karn Liberated");
            forge.game.spellability.SpellAbility restart = null;
            for (final forge.game.spellability.SpellAbility sa : karn.getSpellAbilities()) {
                restart = sa.getApi() == forge.game.ability.ApiType.RestartGame ? sa : restart;
            }
            restart.setActivatingPlayer(ai);
            final int loyalty = karn.getCurrentLoyalty();
            final forge.game.GameStage age = g.getAge();
            check(loyalty >= 14, "setup: Karn Liberated at " + loyalty + " loyalty, enough for -14");
            final Map<Player, Integer> cards = new HashMap<>();
            for (final Player p : g.getPlayers()) {
                cards.put(p, cardsOf(p));
            }
            // 1. an atlas branch: the restart is played on, to the cap counted across both games
            final mtgtable.ai.Atlas.Unit u = new mtgtable.ai.Atlas.Unit();
            u.continuation = "forge";
            u.turnCap = 8;
            u.branchTimeoutMs = 60_000;
            u.observe = null;
            final mtgtable.ai.Atlas.Branch b = mtgtable.ai.Atlas.play(ai, mtgtable.ai.SearchPolicy.priorityCand(restart), 0, 0, 7,
                    u, "d477", new LinkedHashMap<>(), null, "d477", false);
            check(b.error == null && b.unavailable == null && !b.engineError && b.restarts == 1 && b.steps > 0
                            && (b.capped ? b.turns == 9 : b.turns > 5 && b.result != 0),
                    "an atlas branch that plays Karn's -14 starts the new game and plays it on (restarts " + b.restarts
                            + ", turns " + b.turns + ", capped " + b.capped + ", result " + b.result + ", steps " + b.steps
                            + ", error " + b.error + ", unavailable " + b.unavailable + ")");
            // 2. a search playout: the same, to a horizon three turns past turn 5's
            final String[] seen = {null};
            mtgtable.ai.SearchPolicy.leafProbeForTest((copy, aiC) -> {
                final forge.game.phase.PhaseHandler ph = copy.getPhaseHandler();
                final StringBuilder sb = new StringBuilder("age " + copy.getAge() + ", turn " + ph.getTurn() + " "
                        + ph.getPhase() + ", first " + (copy.getStartingPlayer() == aiC ? "the seat" : "the other"));
                boolean ok = copy.getAge() == forge.game.GameStage.Play && ph.getPhase() != null && ph.getTurn() >= 1
                        && copy.getStartingPlayer() == aiC;
                for (final Player p : copy.getPlayers()) {
                    final Player real = p == aiC ? ai : ai.getWeakestOpponent();
                    sb.append("; ").append(p == aiC ? "seat" : "other").append(" life ").append(p.getLife())
                            .append(", cards ").append(cardsOf(p)).append(" of ").append(cards.get(real));
                    ok &= cardsOf(p) == cards.get(real) && p.getLife() > 11;   // 20 at the restart (7 and 11 before)
                }
                seen[0] = (ok ? "ok: " : "WRONG: ") + sb;
            });
            final CountSink sink = new CountSink();
            mtgtable.ai.SearchPolicy.Playout po;
            try {
                po = mtgtable.ai.SearchPolicy.playout(g, ai, mtgtable.ai.SearchPolicy.priorityCand(restart), 7,
                        new mtgtable.ai.SearchPolicy.Limits(System.nanoTime() + 60_000_000_000L, 3, 20_000), sink, false, null);
            } finally {
                mtgtable.ai.SearchPolicy.leafProbeForTest(null);
            }
            check(po != null && sink.get("search.restarts") == 1 && seen[0] != null && seen[0].startsWith("ok")
                            && (po.over || po.turns == 4),
                    "a search playout that plays Karn's -14 plays the new game to its horizon (restarts "
                            + sink.get("search.restarts") + ", " + (po == null ? "no playout" : "turns " + po.turns
                            + ", over " + po.over) + "; at the leaf " + seen[0] + ")");
            check(g.getAge() == age && g.getPhaseHandler().getTurn() == 5 && karn.isInPlay()
                            && karn.getCurrentLoyalty() == loyalty && ai.getLife() == 7,
                    "the real game is untouched: turn 5, Karn on the battlefield at " + loyalty + " loyalty, the seat at 7 life ("
                            + g.getAge() + ", turn " + g.getPhaseHandler().getTurn() + ", Karn " + (karn.isInPlay() ? "in play" : "gone")
                            + " at " + karn.getCurrentLoyalty() + ", life " + ai.getLife() + ")");
        });
    }

    /** D477: every card a player owns in the zones a restart gathers (and the battlefield it may return to). */
    private static int cardsOf(final Player p) {
        int n = 0;
        for (final ZoneType z : new ZoneType[] {ZoneType.Library, ZoneType.Hand, ZoneType.Battlefield, ZoneType.Graveyard,
            ZoneType.Exile}) {
            n += p.getCardsIn(z).size();
        }
        return n;
    }

    /**
     * D472 (amending D466 point 1): a play by an alternative cost maps onto the
     * fork's copy as that alternative.  J158's pauper spine 464 had Forge cast
     * Snuff Out by its AlternativeCost static (pay 4 life, with a Swamp) at d12,
     * and all 240 branches of that option failed with "optional cost AltCost is
     * not offered on the copy": the AltCost mark is the alternative's own, which
     * {@code getOptionalCostValues} never offers.  Planted here with one Swamp, so
     * the life payment is the only way to cast it; Think Twice's flashback (the
     * base's description, its kind the only difference) and Mulldrifter's evoke
     * (an alternative the card itself carries) beside it, and the plain casts as
     * controls.  Bone Shards ({@code K:AlternateAdditionalCost}: sacrifice a
     * creature or discard a card) is the alternate-additional-cost case: Forge
     * lists one play per cost ({@code GameActionUtil.getAdditionalCostSpell}), all of
     * one kind and told apart by the description's "(Additional cost: ...)", and
     * each maps to the copy's play with the same additional cost.
     */
    static void altCostScenarios() throws Exception {
        System.out.println("== ai-bench selftest: alternative costs on a fork (D472, engine)");
        final List<String> board = List.of("humanlife=20", "ailife=20", "turn=5", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Grizzly Bears;Forest", "humanlibrary=Forest;Forest;Forest;Forest",
                "ailibrary=Island;Island;Island;Island", "aihand=Snuff Out;Mulldrifter;Bone Shards", "aigraveyard=Think Twice",
                "aibattlefield=Swamp;Island;Island;Island;Island");
        scenario("altcost-map", board, PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final Card bears = named(ai.getWeakestOpponent().getCardsIn(ZoneType.Battlefield), "Grizzly Bears");
            final forge.game.spellability.SpellAbility snuff = playOf(ai, "Snuff Out", (sa) -> sa.isOptionalCostPaid(ALT));
            final forge.game.spellability.SpellAbility snuffBase = playOf(ai, "Snuff Out", (sa) -> !sa.isOptionalCostPaid(ALT)
                    && sa.getAlternativeCost() == null && sa.getMayPlay() == null);
            for (final forge.game.spellability.SpellAbility sa : List.of(snuff, snuffBase)) {
                sa.resetTargets();
                sa.getTargets().add(bears);
            }
            final forge.game.spellability.SpellAbility m = mtgtable.ai.SearchPolicy.mapForTest(ai, snuff);
            check(m != null && m.isOptionalCostPaid(ALT) && m.getHostCard().getGame() != ai.getGame()
                            && m.getPayCosts().toString().contains("4 life") && m.getPayCosts().getTotalMana().getCMC() == 0
                            && m.getTargets().size() == 1 && m.getTargets().getFirstTargetedCard() != bears
                            && "Grizzly Bears".equals(m.getTargets().getFirstTargetedCard().getName()),
                    "Snuff Out by its AltCost (pay 4 life) maps to the copy's AltCost play, its target the copy's Bears (got "
                            + (m == null ? null : m.getPayCosts().toSimpleString() + ", mana value " + m.getPayCosts().getTotalMana().getCMC()
                            + ", " + m.getTargets() + (m.getTargets().getFirstTargetedCard() == bears ? " (the real game's!)" : "")) + ")");
            final forge.game.spellability.SpellAbility mb = mtgtable.ai.SearchPolicy.mapForTest(ai, snuffBase);
            check(mb != null && !mb.isOptionalCostPaid(ALT) && mb.getPayCosts().hasManaCost(),
                    "control: the mana-cost Snuff Out maps to the copy's mana-cost play (got " + (mb == null ? null : mb.getPayCosts().toSimpleString()) + ")");
            final forge.game.spellability.SpellAbility fb = playOf(ai, "Think Twice",
                    (sa) -> sa.isAlternativeCost(forge.game.spellability.AlternativeCost.Flashback));
            final forge.game.spellability.SpellAbility mfb = mtgtable.ai.SearchPolicy.mapForTest(ai, fb);
            check(mfb != null && mfb.isAlternativeCost(forge.game.spellability.AlternativeCost.Flashback)
                            && mfb.getDescription().equals(fb.getDescription()),
                    "Think Twice's flashback (the base's description) maps to the copy's flashback (got "
                            + (mfb == null ? null : mfb.getAlternativeCost()) + ")");
            final forge.game.spellability.SpellAbility ev = playOf(ai, "Mulldrifter",
                    (sa) -> sa.isAlternativeCost(forge.game.spellability.AlternativeCost.Evoke));
            final forge.game.spellability.SpellAbility md = playOf(ai, "Mulldrifter", (sa) -> sa.getAlternativeCost() == null);
            final forge.game.spellability.SpellAbility mev = mtgtable.ai.SearchPolicy.mapForTest(ai, ev);
            final forge.game.spellability.SpellAbility mmd = mtgtable.ai.SearchPolicy.mapForTest(ai, md);
            check(mev != null && mev.isAlternativeCost(forge.game.spellability.AlternativeCost.Evoke)
                            && mmd != null && mmd.getAlternativeCost() == null,
                    "Mulldrifter's evoke maps to the copy's evoke, its plain cast to the plain cast (got "
                            + (mev == null ? null : mev.getAlternativeCost()) + ", " + (mmd == null ? null : mmd.getAlternativeCost()) + ")");
            // the alternate additional cost: every Bone Shards play Forge lists (discard a card; sacrifice a
            // creature, if listed with no creature to sacrifice) maps to the copy's play with that same cost
            final Card shards = named(ai.getCardsIn(ZoneType.Hand), "Bone Shards");
            final List<forge.game.spellability.SpellAbility> shardsPlays = new ArrayList<>();
            for (final forge.game.spellability.SpellAbility sa : forge.ai.ComputerUtilAbility.getOriginalAndAltCostAbilities(
                    new ArrayList<>(shards.getAllPossibleAbilities(ai, false)), ai)) {
                if (sa.isSpell() && sa.getDescription().contains("(Additional cost: ")) {
                    sa.setActivatingPlayer(ai);
                    sa.resetTargets();
                    sa.getTargets().add(bears);
                    shardsPlays.add(sa);
                }
            }
            boolean discardSeen = false;
            for (final forge.game.spellability.SpellAbility sa : shardsPlays) {
                final forge.game.spellability.SpellAbility ms = mtgtable.ai.SearchPolicy.mapForTest(ai, sa);
                discardSeen |= sa.getDescription().contains("Discard");
                check(ms != null && ms != sa && ms.getHostCard().getGame() != ai.getGame()
                                && ms.getDescription().equals(sa.getDescription())
                                && ms.getPayCosts().toSimpleString().equals(sa.getPayCosts().toSimpleString())
                                && ms.getTargets().size() == 1 && ms.getTargets().getFirstTargetedCard() != bears,
                        "Bone Shards by its alternate additional cost (" + sa.getPayCosts().toSimpleString()
                                + ") maps to the copy's play with the same cost (got "
                                + (ms == null ? null : ms.getPayCosts().toSimpleString() + ": " + ms.getDescription()) + ")");
            }
            check(discardSeen, "Bone Shards' discard-a-card play is among Forge's candidates (" + shardsPlays.size() + " listed)");
            // the production path that failed 240 of 240: one atlas branch forcing the AltCost Snuff Out
            final mtgtable.ai.Atlas.Unit u = new mtgtable.ai.Atlas.Unit();
            u.continuation = "forge";
            u.turnCap = ai.getGame().getPhaseHandler().getTurn();
            u.branchTimeoutMs = 60_000;
            u.observe = null;
            final mtgtable.ai.Atlas.Branch b = mtgtable.ai.Atlas.play(ai, mtgtable.ai.SearchPolicy.priorityCand(snuff), 0, 0, 7, u,
                    "d472", new LinkedHashMap<>(), null, "d472", false);
            check(b.error == null && b.unavailable == null && !b.engineError && b.steps > 0,
                    "an atlas branch forcing the AltCost Snuff Out plays (" + b.steps + " steps, error " + b.error + ")");
            // and on the copy it is the life payment: 4 life paid, the Bears destroyed
            final int[] life = {-1};
            final boolean[] bears2 = {true};
            mtgtable.ai.SearchPolicy.leafProbeForTest((copy, aiC) -> {
                life[0] = aiC.getLife();
                bears2[0] = false;
                for (final Card c : copy.getCardsIn(ZoneType.Battlefield)) {
                    bears2[0] |= "Grizzly Bears".equals(c.getName());
                }
            });
            final CountSink sink = new CountSink();
            try {
                mtgtable.ai.SearchPolicy.playout(ai.getGame(), ai, mtgtable.ai.SearchPolicy.priorityCand(snuff), 7,
                        new mtgtable.ai.SearchPolicy.Limits(System.nanoTime() + 20_000_000_000L, 0, 20_000), sink, false, null);
            } finally {
                mtgtable.ai.SearchPolicy.leafProbeForTest(null);
            }
            check(life[0] == 16 && !bears2[0],
                    "the fork's Snuff Out paid 4 life and destroyed the Bears (life " + life[0] + ", Bears "
                            + (bears2[0] ? "alive" : "dead") + ", " + sink.counts + ")");
            check(ai.getLife() == 20 && ai.getWeakestOpponent().getCardsIn(ZoneType.Battlefield).contains(bears),
                    "the real game is untouched: life 20, the Bears alive");
        });
    }

    private static final forge.game.spellability.OptionalCost ALT = forge.game.spellability.OptionalCost.AltCost;

    private static Card named(final Iterable<Card> cards, final String name) {
        for (final Card c : cards) {
            if (name.equals(c.getName())) {
                return c;
            }
        }
        throw new IllegalStateException("no " + name);
    }

    /** D483: the plays in {@code alts} whose host is {@code card}. */
    private static List<forge.game.spellability.SpellAbility> riderPlays(final List<forge.game.spellability.SpellAbility> alts,
                                                                         final Card card) {
        final List<forge.game.spellability.SpellAbility> out = new ArrayList<>();
        for (final forge.game.spellability.SpellAbility sa : alts) {
            if (sa.getHostCard() == card) {
                out.add(sa);
            }
        }
        return out;
    }

    /** D483: how many play identities {@code l} holds. */
    private static int distinctIdentities(final List<forge.game.spellability.SpellAbility> l) {
        final java.util.Set<String> ids = new java.util.HashSet<>();
        for (final forge.game.spellability.SpellAbility sa : l) {
            ids.add(mtgtable.ai.SearchPolicy.playIdentity(sa));
        }
        return ids.size();
    }

    /** D483: each play as its search label and description, for a failure's text. */
    private static List<String> labelsOf(final List<forge.game.spellability.SpellAbility> l) {
        final List<String> out = new ArrayList<>();
        for (final forge.game.spellability.SpellAbility sa : l) {
            out.add(mtgtable.ai.SearchPolicy.labelForTest(sa) + " [" + sa.getDescription() + "]");
        }
        return out;
    }

    /** D472: the seat's play of {@code name} that {@code which} picks, from Forge's own candidate list (originals and alternatives). */
    private static forge.game.spellability.SpellAbility playOf(final Player ai, final String name,
            final java.util.function.Predicate<forge.game.spellability.SpellAbility> which) {
        final Card c = named(ai.getGame().getCardsInGame(), name);
        final List<forge.game.spellability.SpellAbility> all = forge.ai.ComputerUtilAbility.getOriginalAndAltCostAbilities(
                new ArrayList<>(c.getAllPossibleAbilities(ai, false)), ai);
        for (final forge.game.spellability.SpellAbility sa : all) {
            if (sa.isSpell() && which.test(sa)) {
                sa.setActivatingPlayer(ai);
                return sa;
            }
        }
        throw new IllegalStateException("no such play of " + name + " among " + all);
    }

    /** D470: the Bears attack the seat; Forge's block (the Giant on the Bears) is on the combat, untapped or not. {Bears, Giant}. */
    private static Card[] forgeBlock(final Player ai) {
        final Player human = ai.getWeakestOpponent();
        Card bears = null;
        for (final Card c : human.getCardsIn(ZoneType.Battlefield)) {
            bears = "Grizzly Bears".equals(c.getName()) ? c : bears;
        }
        Card giant = null;
        for (final Card c : ai.getCardsIn(ZoneType.Battlefield)) {
            giant = "Hill Giant".equals(c.getName()) ? c : giant;
        }
        final forge.game.combat.Combat combat = new forge.game.combat.Combat(human);
        ai.getGame().getPhaseHandler().setCombat(combat);
        combat.addAttacker(bears, ai);
        if (!giant.isTapped()) {
            combat.addBlocker(bears, giant);
        }
        return new Card[] {bears, giant};
    }

    /** D470: one atlas branch of a forced block on a copy, Forge both seats, to the end of this turn. */
    private static mtgtable.ai.Atlas.Branch atlasBranch(final Player ai, final Map<Card, Card> block) {
        final mtgtable.ai.Atlas.Unit u = new mtgtable.ai.Atlas.Unit();
        u.continuation = "forge";
        u.turnCap = ai.getGame().getPhaseHandler().getTurn();
        u.branchTimeoutMs = 60_000;
        u.observe = null;
        return mtgtable.ai.Atlas.play(ai, mtgtable.ai.SearchPolicy.blockCand(block), 0, 0, 7, u, "d470",
                new LinkedHashMap<>(), null, "d470", false);
    }

    /** D468's engine half: a subscriber on a rollout's copy that counts its events and the longest gap between two. */
    public static final class EventGaps {
        long events;
        long last = System.nanoTime();
        long maxGapNs;

        @com.google.common.eventbus.Subscribe
        public void tick(final Object event) {
            final long now = System.nanoTime();
            events++;
            maxGapNs = Math.max(maxGapNs, now - last);
            last = now;
        }
    }

    /**
     * D468: the real playout, a real copy.  A step that never comes back --
     * planted through the probe, which runs on the copy after the clock is
     * armed, firing the copy's own events forever (bounded at 10 s) -- must end
     * soon after the deadline plus the clock's grace as a null playout, counted once as
     * search.stepTimeouts (search.prior.stepTimeouts for the ranking's
     * until-applied playouts), never thrown, with the real MyRandom put back.
     * Its control: the same board's normal rollouts count no step timeout, and
     * their copies fire events throughout (D467's LOW: the clock only reads a
     * step that fires them), the longest silence between two printed.
     */
    static void stepClockScenario() throws Exception {
        System.out.println("== ai-bench selftest: the search's step clock (D468, engine)");
        final List<String> board = List.of("humanlife=20", "ailife=20", "turn=3", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Forest;Grizzly Bears", "humanhand=Forest", "humanlibrary=Forest;Island;Forest;Forest;Forest",
                "aihand=Typhoid Rats", "ailibrary=Swamp;Mountain;Plains;Swamp;Swamp", "aibattlefield=Swamp;Swamp");
        scenario("search-step-clock", board, PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final Game g = ai.getGame();
            final java.util.Random real = forge.util.MyRandom.getRandom();
            final long grace = mtgtable.ai.SearchPolicy.STEP_GRACE_NS / 1_000_000L;
            for (final boolean prior : new boolean[] {false, true}) {
                final CountSink sink = new CountSink();
                mtgtable.ai.SearchPolicy.probeForTest((copy, aiC) -> {
                    final long end = System.nanoTime() + 10_000_000_000L;
                    while (System.nanoTime() < end) {
                        copy.fireEvent(new forge.game.event.GameEventShuffle(aiC));
                    }
                });
                final long t0 = System.nanoTime();
                mtgtable.ai.SearchPolicy.Playout p = null;
                String thrown = null;
                try {
                    p = mtgtable.ai.SearchPolicy.playout(g, ai, mtgtable.ai.SearchPolicy.forgeCand(), 7,
                            new mtgtable.ai.SearchPolicy.Limits(t0 + 200_000_000L, prior ? 0 : 3, 2_000, 1.0, false, false,
                                    false, prior, null, null), sink, false, null);
                } catch (final RuntimeException | Error e) {
                    thrown = e.getClass().getSimpleName();
                } finally {
                    mtgtable.ai.SearchPolicy.probeForTest(null);
                }
                final long ms = (System.nanoTime() - t0) / 1_000_000L;
                final String key = prior ? "search.prior.stepTimeouts" : "search.stepTimeouts";
                final String other = prior ? "search.stepTimeouts" : "search.prior.stepTimeouts";
                check(p == null && thrown == null && ms >= 200 + grace && ms < 2_000 + grace && sink.get(key) == 1 && sink.get(other) == 0
                                && forge.util.MyRandom.getRandom() == real,
                        "a rollout step that never comes back ends as a null playout, " + grace + " ms past its deadline, "
                                + "counted once as " + key + " ("
                                + ms + " ms, thrown " + thrown + ", " + sink.counts + ")");
            }
            final CountSink sink = new CountSink();
            final List<EventGaps> gaps = new ArrayList<>();
            int done = 0;
            int turns = 0;
            mtgtable.ai.SearchPolicy.probeForTest((copy, aiC) -> {
                final EventGaps e = new EventGaps();
                gaps.add(e);
                copy.subscribeToEvents(e);
            });
            try {
                for (long seed = 1; seed <= 6; seed++) {
                    final mtgtable.ai.SearchPolicy.Playout p = mtgtable.ai.SearchPolicy.playout(g, ai,
                            mtgtable.ai.SearchPolicy.forgeCand(), seed,
                            new mtgtable.ai.SearchPolicy.Limits(System.nanoTime() + 20_000_000_000L, 3, 20_000), sink, false, null);
                    done += p != null ? 1 : 0;
                    turns += p != null ? p.turns : 0;
                }
            } finally {
                mtgtable.ai.SearchPolicy.probeForTest(null);
            }
            long events = Long.MAX_VALUE;
            long maxGap = 0;
            for (final EventGaps e : gaps) {
                events = Math.min(events, e.events);
                maxGap = Math.max(maxGap, e.maxGapNs);
            }
            check(done == 6 && sink.get("search.stepTimeouts") == 0 && gaps.size() == 6 && events > turns / 6,
                    "normal rollouts count no step timeout, and their copies fire events as they play (" + done + " of 6 done, "
                            + turns + " turns, fewest events in one copy " + events + ", longest silence "
                            + maxGap / 1_000_000L + " ms)");
        });
    }

    // ------------------------------------------------------------------
    // J128 (D437): search-v2 with D316's learned evaluator at its leaves
    // (D354's leaf=eval:<model.json>).  The switch changes the score of the
    // position a rollout stops at and nothing that led there; the evaluator
    // reads only the searching seat's knowledge, so two games that differ only
    // in hidden cards score alike; and a search-v2 decision with it stays
    // inside the 1.5 s budget.  The model is the committed fixture
    // (fixtures/eval/model.json), so the bench needs no PC-only file; the job
    // measures the real model's cost in its match (search.leaf.evalNs).
    // ------------------------------------------------------------------

    /** A sink that keeps the counters (the playouts' own). */
    static final class CountSink implements mtgtable.ai.SearchPolicy.Sink {
        final Map<String, Integer> counts = new TreeMap<>();

        @Override
        public void add(final String key, final int n) {
            counts.merge(key, n, Integer::sum);
        }

        @Override
        public void event(final String text) { }

        int get(final String key) {
            return counts.getOrDefault(key, 0);
        }
    }

    static final String EVAL_FIXTURE = "fixtures/eval/model.json";

    static void evalLeafScenarios() throws Exception {
        System.out.println("== ai-bench selftest: the learned evaluator at search-v2's leaves (J128, D437, engine)");
        final mtgtable.eval.PositionEvaluator ev = mtgtable.ai.SearchPolicy.evaluator(EVAL_FIXTURE);
        final long far = 60_000_000_000L;

        // 1. Only the leaf changes.  The same rollout (seed, candidate, horizon) with
        //    the hand leaf and with the evaluator: the same end (over, result, turns,
        //    step cap), the hand run's leaf is the hand leaf of the evaluator run's
        //    final position, the evaluator run's leaf is LEAF_SCALE * logit(P(win))
        //    of that position, a finished game keeps the hand leaf's +-WIN, and the
        //    score differs on unfinished rollouts.  Only evaluator leaves are counted.
        final List<String> board = List.of(
                "humanlife=12", "ailife=14", "turn=5", "activeplayer=ai", "activephase=MAIN1",
                "humanbattlefield=Forest;Forest;Wall of Wood", "humanhand=Grizzly Bears;Forest",
                "humanlibrary=Forest;Hill Giant;Forest;Forest", "aihand=Typhoid Rats;Swamp",
                "ailibrary=Swamp;Swamp;Hill Giant;Swamp",
                "aibattlefield=Grizzly Bears;Hill Giant;Swamp;Swamp;Swamp;Mountain");
        scenario("search-evalleaf-only", board, PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
            final Game g = ai.getGame();
            int sameEnd = 0;
            int handIsHand = 0;
            int evalIsEval = 0;
            int unfinished = 0;
            int differs = 0;
            int finishedSame = 0;
            int finished = 0;
            int handCounted = 0;
            int evalCounted = 0;
            final int seeds = 6;
            for (long seed = 1; seed <= seeds; seed++) {
                final CountSink hs = new CountSink();
                final CountSink es = new CountSink();
                final mtgtable.ai.SearchPolicy.Playout ph = mtgtable.ai.SearchPolicy.playout(g, ai,
                        mtgtable.ai.SearchPolicy.forgeCand(), seed, new mtgtable.ai.SearchPolicy.Limits(System.nanoTime() + far, 1, 20_000),
                        hs, false, null);
                final double[] atEnd = {Double.NaN, Double.NaN};
                mtgtable.ai.SearchPolicy.leafProbeForTest((copy, aiC) -> {
                    atEnd[0] = mtgtable.ai.SearchPolicy.leaf(copy, aiC, 1.0);
                    atEnd[1] = copy.isGameOver() ? Double.NaN : mtgtable.ai.SearchPolicy.evalLeaf(ev, copy, aiC);
                });
                final mtgtable.ai.SearchPolicy.Playout pe;
                try {
                    pe = mtgtable.ai.SearchPolicy.playout(g, ai, mtgtable.ai.SearchPolicy.forgeCand(), seed,
                            new mtgtable.ai.SearchPolicy.Limits(System.nanoTime() + far, 1, 20_000, 1.0, false, ev), es, false, null);
                } finally {
                    mtgtable.ai.SearchPolicy.leafProbeForTest(null);
                }
                if (ph == null || pe == null) {
                    continue;
                }
                sameEnd += ph.over == pe.over && ph.result == pe.result && ph.turns == pe.turns && ph.stepCapped == pe.stepCapped ? 1 : 0;
                handIsHand += ph.leaf == atEnd[0] ? 1 : 0;
                handCounted += hs.get("search.leaf.eval");
                evalCounted += es.get("search.leaf.eval");
                if (pe.over) {
                    finished++;
                    finishedSame += pe.leaf == ph.leaf ? 1 : 0;
                } else {
                    unfinished++;
                    evalIsEval += pe.leaf == atEnd[1] ? 1 : 0;
                    differs += pe.leaf != ph.leaf ? 1 : 0;
                }
            }
            check(sameEnd == seeds && handIsHand == seeds,
                    "the same " + seeds + " rollouts end alike with either leaf (" + sameEnd + "), and the hand run's leaf is the "
                    + "hand leaf of the evaluator run's end position (" + handIsHand + ")");
            check(unfinished >= 1 && evalIsEval == unfinished && finishedSame == finished,
                    "the evaluator scores every unfinished end (" + evalIsEval + " of " + unfinished
                    + ") and a finished game keeps +-WIN (" + finishedSame + " of " + finished + ")");
            check(differs == unfinished, "the switch changed the score of every unfinished rollout (" + differs + " of " + unfinished + ")");
            check(handCounted == 0 && evalCounted == unfinished,
                    "search.leaf.eval counts the evaluator's leaves only (hand " + handCounted + ", eval " + evalCounted + ")");
        });

        // 2. Nothing hidden enters.  Two games that differ only in what the AI cannot
        //    see -- which of the opponent's cards is in hand and which in the library,
        //    the library's order, the AI's own library order -- give the evaluator the
        //    same features on the REAL game (its hidden cards untouched) and the same
        //    eval-leaf rollouts seed for seed.  The control: a card the AI does see
        //    (its own hand) changes the features, so the comparison has teeth.
        final String[][] hidden = {
            {"Lightning Bolt", "Forest;Forest;Forest", "Swamp;Hill Giant;Swamp", "Typhoid Rats"},
            {"Forest", "Forest;Lightning Bolt;Forest", "Hill Giant;Swamp;Swamp", "Typhoid Rats"},
            {"Lightning Bolt", "Forest;Forest;Forest", "Swamp;Hill Giant;Swamp", "Hill Giant"},
        };
        final List<double[]> feats = new ArrayList<>();
        final List<List<Double>> leaves = new ArrayList<>();
        final int[] evalCounts = new int[hidden.length];
        for (int k = 0; k < hidden.length; k++) {
            final int kk = k;
            final List<String> b = List.of(
                    "humanlife=20", "ailife=20", "turn=3", "activeplayer=ai", "activephase=MAIN2",
                    "humanbattlefield=Mountain;Forest", "humanhand=" + hidden[k][0], "humanlibrary=" + hidden[k][1],
                    "aihand=" + hidden[k][3], "ailibrary=" + hidden[k][2], "aibattlefield=Swamp;Swamp;Mountain|Id:30");
            scenario("search-evalleaf-nopeek-" + k, b, PolicyLobbyPlayerAi.Outlets.OFF, (ai, pol) -> {
                feats.add(ev.features(ai.getGame(), ai));
                final List<Double> ls = new ArrayList<>();
                final CountSink cs = new CountSink();
                for (long seed = 1; seed <= 8; seed++) {
                    final mtgtable.ai.SearchPolicy.Playout pl = mtgtable.ai.SearchPolicy.playout(ai.getGame(), ai,
                            mtgtable.ai.SearchPolicy.forgeCand(), seed,
                            new mtgtable.ai.SearchPolicy.Limits(System.nanoTime() + far, 1, 20_000, 1.0, false, ev), cs, false, null);
                    ls.add(pl == null ? Double.NaN : pl.leaf);
                }
                leaves.add(ls);
                evalCounts[kk] = cs.get("search.leaf.eval");
            });
        }
        check(feats.size() == 3 && Arrays.equals(feats.get(0), feats.get(1)),
                "the evaluator's features of the real game are the same whichever hidden cards are where");
        check(leaves.size() == 3 && leaves.get(0).equals(leaves.get(1)) && evalCounts[0] >= 1,
                "and its rollout leaves are the same seed for seed (" + evalCounts[0] + " evaluator leaves; first "
                + (leaves.isEmpty() ? "-" : leaves.get(0).get(0)) + ")");
        check(feats.size() == 3 && !Arrays.equals(feats.get(0), feats.get(2)),
                "control: a card the AI does see (its own hand) changes the features");

        // 3. The budget.  search-v2 (anytime=1, 1.5 s) with the evaluator at its leaves,
        //    on scenario 1's main phase (a creature to cast, a land, attackers to come),
        //    decides within the budget, its leaves are the evaluator's, and one
        //    evaluator leaf costs far less than a rollout (printed; bound 1 ms).
        scenario("search-evalleaf-budget", board, PolicyLobbyPlayerAi.Outlets.OFF,
                SearchConfig.parse("ms=1500,anytime=1,seed=7,leaf=eval:" + EVAL_FIXTURE), (ai, pol) -> {
                    final PolicyControllerAi ctl = (PolicyControllerAi) ai.getController();
                    final long t0 = System.nanoTime();
                    ctl.chooseSpellAbilityToPlay();
                    final long ms = (System.nanoTime() - t0) / 1_000_000L;
                    final mtgtable.ai.SearchPolicy.Report rep = ctl.search().peekReport();
                    final Map<String, Integer> c = ctl.counts();
                    check(rep != null && rep.anytime && c.getOrDefault("search.p.considered", 0) == 1
                            && c.getOrDefault("search.leaf.eval", 0) >= 1 && c.getOrDefault("search.rolloutErrors", 0) == 0,
                            "search-v2 with the evaluator leaf searched: " + c.getOrDefault("search.leaf.eval", 0)
                            + " evaluator leaves (" + (rep == null ? "none" : rep.summary()) + ")");
                    check(ms < 1500 + 1000, "inside the 1.5 s budget: " + ms + " ms");
                    final int n = 2000;
                    final Game g = ai.getGame();
                    double sum = 0;
                    final long te = System.nanoTime();
                    for (int i = 0; i < n; i++) {
                        sum += mtgtable.ai.SearchPolicy.evalLeaf(ev, g, ai);
                    }
                    final double us = (System.nanoTime() - te) / 1000.0 / n;
                    final double evalNs = c.getOrDefault("search.leaf.evalNs", 0) / (double) Math.max(1, c.getOrDefault("search.leaf.eval", 0));
                    check(us < 1000 && evalNs < 1_000_000,
                            String.format(Locale.ROOT, "an evaluator leaf costs %.1f us here (in the search %.1f us; checksum %.1f)",
                                    us, evalNs / 1000.0, sum / n));
                });
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
        scenario(name, state, mode, search, 60, body);
    }

    /** {@code waitS}: how long the self-test waits for the body (D484: a few seconds, so a loop fails instead of hanging). */
    static void scenario(final String name, final List<String> state, final PolicyLobbyPlayerAi.Outlets mode,
                         final SearchConfig search, final int waitS, final Body body) throws Exception {
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
        if (!done.await(waitS, TimeUnit.SECONDS)) {
            check(false, name + ": timed out after " + waitS + " s");
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
