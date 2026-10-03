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
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumSet;
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
 * opens no socket, emits no protocol, records no frame log, and boots Forge
 * exactly as every mtg-table process does ({@link Bootstrap}).  Every AI seat is
 * {@link Bootstrap#createAiSeat}.
 *
 * <pre>
 *   play     --pairs FILE --a CFG --b CFG [--games N] [--seed S] [--shard I/K]
 *            [--timeout SEC] [--mirror] --out FILE.jsonl
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
 */
public final class AiBench {

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
        for (int i = 0; i < argv.length; i++) {
            switch (argv[i]) {
            case "--mirror": mirror = true; break;
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
            default: throw new IllegalArgumentException("unknown flag " + argv[i]);
            }
        }
        if (pairsFile == null || out == null || a == null || b == null) {
            throw new IllegalArgumentException("play needs --pairs, --out, --a and --b");
        }
        final List<String[]> pairs = readPairs(pairsFile);

        final Config cfg = Config.load();
        Bootstrap.installGui(cfg.forgeHomeDir());           // hard rule 1: the FIRST Forge call
        final long initMs = Bootstrap.initializeModel(false);
        System.out.println("[ai-bench] FModel.initialize " + initMs + " ms; shard " + shard + "/" + shards
                + "; " + pairs.size() + " pair(s) x " + games + " game(s); A=" + a.text + " B=" + b.text);
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
        return 0;
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
        final CountDownLatch done = new CountDownLatch(1);
        final Throwable[] fail = new Throwable[1];
        final long t0 = System.nanoTime();
        // Forge's own "Game" pool, exactly as RecordMatch starts a game; one game
        // at a time in this process, so nothing else runs on that pool (D309).
        game.getAction().invoke(() -> {
            try {
                match.startGame(game);
            } catch (final Throwable t) {
                fail[0] = t;
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
        if (engine) {
            scenarios();
        }
        System.out.println("ai-bench selftest: " + checks + " check(s), " + failures + " failure(s)");
        return failures == 0 ? 0 : 1;
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
}
