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

/**
 * The Java half of {@code tools/ai-bench.sh} (D300): Forge AI against Forge AI
 * on fixed decks, many games, one JSON line per game; and the report over those
 * lines.  A measuring tool beside the game, like {@code tools/audit-deck/}: it
 * opens no socket, emits no protocol, records no frame log, and boots Forge
 * exactly as every mtg-table process does ({@link Bootstrap}).  Every AI seat is
 * {@link Bootstrap#createAiSeat}.
 *
 * <pre>
 *   play     --pairs FILE --a CFG --b CFG [--games N] [--seed S] [--shard I/K]
 *            [--timeout SEC] --out FILE.jsonl
 *   report   FILE.jsonl ... [--by-pair]
 *   selftest [--no-engine]
 * </pre>
 *
 * <p>A CFG is {@code <Profile>[+sim|+hybrid][+outlets|+shadow]}: an {@code .ai}
 * profile from {@code res/ai/}, Forge's simulation option (a lobby-player option,
 * {@code AIOption}, not a profile key -- docs/research/ai-architecture.md), and
 * the outlet policy's mode (D301; plain = off, {@code +shadow} = counted but not
 * acted on).
 *
 * <p>Game {@code g} of a pair: config A plays the pair's first deck when g is
 * even and its second when odd; A sits in seat 0 when {@code (g/2)} is even.  So
 * every four games of a pair are each deck on each side of each seat, and a
 * profile comparison is never a deck comparison.  The seed of game g is a pure
 * function of {@code --seed}, the pair and g ({@code MyRandom}); Forge's AI also
 * reads the wall clock (its 5 s evaluation timeout), so a rerun is the same deal
 * of the same decks, not always the same game.
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

        Cfg(final String text) {
            this.text = text;
            final String[] parts = text.split("\\+");
            profile = parts[0];
            AIOption s = null;
            PolicyLobbyPlayerAi.Outlets o = PolicyLobbyPlayerAi.Outlets.OFF;
            for (int i = 1; i < parts.length; i++) {
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
                            + " (want +sim, +hybrid, +outlets or +shadow)");
                }
            }
            sim = s;
            outlets = o;
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
        for (int i = 0; i < argv.length; i++) {
            switch (argv[i]) {
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
                    final long gameSeed = seed * 1_000_003L + pi * 10_007L + g;
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
        final PolicyLobbyPlayerAi la = Bootstrap.createAiSeat("A", aSeat0 ? 0 : 1, a.profile, a.sim, a.outlets);
        final PolicyLobbyPlayerAi lb = Bootstrap.createAiSeat("B", aSeat0 ? 1 : 0, b.profile, b.sim, b.outlets);
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
        // at a time in this process, so nothing else runs on that pool (D300).
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
                .n("error", fail[0] == null ? "" : String.valueOf(fail[0]))
                .n("aiEvalTimeouts", count(noiseText, "AI eval thread at timeout"));
        seatStats(j, "aStats", la, game);
        seatStats(j, "bStats", lb, game);
        return j.end().done();
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
            System.out.println("  RemAIDeck cards left in hand at game end: A " + t.aRemHand + ", B " + t.bRemHand);
            System.out.println("  A counters:     " + t.aCounts);
            System.out.println("  B counters:     " + t.bCounts);
            System.out.println("  focus counters: " + t.focusCounts);
        }
        return 0;
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
        final Deck lands = new Deck("lands");
        final PaperCard swamp = FModel.getMagicDb().getCommonCards().getCard("Swamp");
        final CardPool main = lands.getMain();
        main.add(swamp, 20);
        final RegisteredPlayer r0 = new RegisteredPlayer(lands);
        r0.setPlayer(Bootstrap.createAiSeat("Human", 0, Bootstrap.DEFAULT_AI_PROFILE, null, PolicyLobbyPlayerAi.Outlets.OFF));
        final RegisteredPlayer r1 = new RegisteredPlayer(lands);
        final PolicyLobbyPlayerAi aiLp = Bootstrap.createAiSeat("Ai", 1, Bootstrap.DEFAULT_AI_PROFILE, null,
                PolicyLobbyPlayerAi.Outlets.ON);
        r1.setPlayer(aiLp);
        final GameRules rules = new GameRules(GameType.Constructed);
        rules.setGamesPerMatch(1);
        final Match match = new Match(rules, List.of(r0, r1), "ai-bench-selftest");
        final Game game = match.createGame();
        final CountDownLatch done = new CountDownLatch(1);
        final Throwable[] fail = new Throwable[1];
        // One task on Forge's game pool at a time, and no match running (D300).
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
