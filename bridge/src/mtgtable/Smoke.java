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
 */
package mtgtable;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import forge.deck.Deck;
import forge.deck.io.DeckSerializer;
import forge.game.Game;
import forge.game.GameEndReason;
import forge.game.GameLogEntry;
import forge.game.GameLogEntryType;
import forge.game.GameOutcome;
import forge.game.GameRules;
import forge.game.GameType;
import forge.game.Match;
import forge.game.player.RegisteredPlayer;
import forge.localinstance.properties.ForgeConstants;
import forge.model.FModel;
import forge.player.GamePlayerUtil;

/**
 * M0: prove the engine runs our code.
 *
 * <p>Boots Forge headless through {@link HeadlessGuiBase}, loads the user's
 * 40-card deck, plays one AI-vs-AI game with that deck on both seats, and prints
 * the timings, the card-database size, the deck size, and the result.  No GUI,
 * no socket, no blocking input, no writes anywhere outside {@code var/}.
 *
 * <p>Run it with {@code ./bridge/run.sh mtgtable.Smoke}.  Exits 0 on success and
 * 1 on any failure, so it can gate a build.
 */
public final class Smoke {

    private Smoke() { }

    /**
     * Engine complaints worth counting rather than leaving buried in four
     * thousand lines of boot chatter.  Each entry is
     * {@code {label, needle, severity}}; the needle is matched
     * case-insensitively against whole output lines and the severity says how
     * to read a non-zero count.
     */
    private static final String[][] WATCHED = {
        // forge-game/src/main/java/forge/game/ability/AbilityUtils.java:405-419
        //   System.err.printf("SVar '%s' not found in ability, fallback to Card
        //                      (%s). Ability is (%s)%n", ...)
        //
        // INFORMATIONAL, not a warning (report 08 section 3, decision recorded
        // there).  The "SVar" it cannot find is the literal string "Any", which
        // is not an SVar name at all: CostTeamwork's constructor hard-codes it
        // as its amount sentinel (CostTeamwork.java:23-25) and the real
        // requirement rides in the type string (+withTotalPowerGE2).  All three
        // rules paths -- CostTapType.canPay, HumanCostDecision (which guards
        // `if (!amount.equals("Any"))` explicitly) and AiCostDecision -- return
        // before consulting it.  The only caller that does reach it is an AI
        // affordability heuristic (ComputerUtilCost.checkTapTypeCost), where the
        // fallback 0 makes it over-optimistic and the real payment decision
        // corrects it.  It fires for the deck's two K:Teamwork:2 cards, Quantum
        // Reduction and Helicarrier Strike, 0-3 times a game depending on what
        // the AI considered.  No card behaves wrongly, and no card-script
        // override can silence it.
        {"svar-fallback", "not found in ability", "informational"},
        // Loose backstop for any engine complaint about a card it cannot run.
        // NOTE: this will NOT catch Match.prepareAllZones dropping a card --
        // see auditDeck() for why, and for the check that actually answers it.
        {"unsupported-text", "unsupported", "warning"},
    };

    public static void main(final String[] args) {
        final long t0 = System.nanoTime();

        // Tee stdout/stderr through a line scanner before Forge says anything.
        final Watcher outWatch = install(true);
        final Watcher errWatch = install(false);

        try {
            run(args, t0);
        } catch (final Throwable e) {
            // -Dsentry.uncaught.handler.enabled=false keeps Sentry from eating
            // this, but print it ourselves anyway so the exit code has a reason.
            System.out.flush();
            System.err.println("SMOKE FAILED: " + e);
            e.printStackTrace();
            report(outWatch, errWatch);
            System.exit(1);
        }
        report(outWatch, errWatch);
        // Forge leaves daemon pools and (in a full run) netty threads behind;
        // exit explicitly rather than waiting for them.
        System.exit(0);
    }

    private static void run(final String[] args, final long t0) {
        final Config cfg = Config.load();
        final String forgeHome = cfg.forgeHomeDir();
        final File deckFile = args.length > 0 ? new File(args[0]).getAbsoluteFile() : cfg.deck();

        System.out.println("== mtg-table M0 smoke ==");
        System.out.println("config        = " + cfg.file());
        System.out.println("forge jar     = " + cfg.forgeJar());
        System.out.println("forge home    = " + forgeHome);
        System.out.println("deck file     = " + deckFile);
        System.out.println("headless      = " + java.awt.GraphicsEnvironment.isHeadless());
        System.out.println("DISPLAY       = " + System.getenv("DISPLAY"));

        if (!new File(forgeHome, "res").exists()) {
            throw new IllegalStateException(
                "no res/ under " + forgeHome + " -- run ./tools/make-forge-home.sh");
        }
        if (!deckFile.isFile()) {
            throw new IllegalStateException("deck not found: " + deckFile);
        }

        // ------------------------------------------------------------------
        // 1. GuiBase.setInterface FIRST.  ForgeConstants' static initializer
        //    calls GuiBase.getInterface().getAssetsDir(); touching any Forge
        //    constant before this line is an ExceptionInInitializerError.
        // ------------------------------------------------------------------
        Bootstrap.installGui(forgeHome);

        // Reading ForgeConstants now is safe, and it triggers the class
        // initializer that reads forge-home/forge.profile.properties.  These
        // four lines are the proof that nothing will be written to ~/.forge.
        System.out.println("ASSETS_DIR    = " + ForgeConstants.ASSETS_DIR);
        System.out.println("PROFILE_FILE  = " + ForgeConstants.PROFILE_FILE);
        System.out.println("RES_DIR       = " + ForgeConstants.RES_DIR);
        System.out.println("USER_DIR      = " + ForgeConstants.USER_DIR);
        System.out.println("CACHE_DIR     = " + ForgeConstants.CACHE_DIR);
        System.out.println("DECKS_DIR     = " + ForgeConstants.DECK_CONSTRUCTED_DIR);
        System.out.println("LOG_FILE      = " + ForgeConstants.LOG_FILE);
        assertUnderRepo(cfg, "USER_DIR", ForgeConstants.USER_DIR);
        assertUnderRepo(cfg, "CACHE_DIR", ForgeConstants.CACHE_DIR);
        assertUnderRepo(cfg, "DECK_CONSTRUCTED_DIR", ForgeConstants.DECK_CONSTRUCTED_DIR);
        assertUnderRepo(cfg, "LOG_FILE", ForgeConstants.LOG_FILE);

        // ------------------------------------------------------------------
        // 2. Preferences, card database, AI profiles -- through the one shared
        //    bootstrap, so Smoke, RecordMatch and (M2) MtgTable cannot boot
        //    differently.  It also sets FPref.UI_SELECT_FROM_CARD_DISPLAYS to
        //    false (D13) and asserts LOAD_CARD_SCRIPTS_LAZILY is false (D14).
        // ------------------------------------------------------------------
        Bootstrap.initializeModel(true);

        // NOTE: no token count here.  TokenDb.getUniqueTokens() returns null in
        // the 2.0.14 jar and getAllTokens() returns an empty list because the
        // per-edition token map is filled lazily; the "Read cards: 836 files"
        // line above is the real token-script count.
        final int printings = FModel.getMagicDb().getCommonCards().getAllCards().size();
        final int uniqueCards = FModel.getMagicDb().getCommonCards().getUniqueCards().size();
        System.out.println("cards in DB = " + printings + " printings, " + uniqueCards + " unique");

        // ------------------------------------------------------------------
        // 3. Deck.  DeckSerializer.fromFile ONLY.  FModel.getDecks() reaches
        //    DeckStorage.adjustFileLocation, which renames a .dck to its Name=
        //    metadata, moves it up one directory, and deletes unparseable ones
        //    (forge-core/src/main/java/forge/deck/io/DeckStorage.java:94-103).
        //    bridge/build.sh greps for getDecks() and refuses to compile.
        // ------------------------------------------------------------------
        final Deck deck = DeckSerializer.fromFile(deckFile);
        if (deck == null) {
            throw new IllegalStateException("DeckSerializer.fromFile returned null for " + deckFile);
        }
        final int deckSize = deck.getMain().countAll();
        System.out.println("deck from file = " + deck.getName() + " (" + deckSize + " cards, "
                + deck.getMain().countDistinct() + " distinct)");
        if (deckSize != 40) {
            System.out.println("WARNING: expected a 40-card deck, got " + deckSize);
        }
        auditDeck(deck);
        auditCardOverlay(deck);

        // ------------------------------------------------------------------
        // 4. Rules + two AI seats, both playing this same deck.
        //    You never construct a PlayerController: you set a LobbyPlayer on
        //    the RegisteredPlayer and the engine builds the matching controller.
        // ------------------------------------------------------------------
        final GameRules rules = new GameRules(GameType.Constructed);
        rules.setAppliedVariants(EnumSet.of(GameType.Constructed));
        rules.setGamesPerMatch(1);

        final List<RegisteredPlayer> players = new ArrayList<>();
        final RegisteredPlayer p1 = new RegisteredPlayer(deck);
        p1.setPlayer(GamePlayerUtil.createAiPlayer("AI-One", 0));
        players.add(p1);
        final RegisteredPlayer p2 = new RegisteredPlayer(deck);
        p2.setPlayer(GamePlayerUtil.createAiPlayer("AI-Two", 1));
        players.add(p2);

        // ------------------------------------------------------------------
        // 5. One game, on this thread.  Do NOT call game.setNoGUIUser(): it
        //    exists in the 2.0.15 source (SimulateMatch.java:210) but NOT in the
        //    2.0.14 jar we compile against.
        // ------------------------------------------------------------------
        final Match match = new Match(rules, players, "mtg-table");
        final Game game = match.createGame();
        final long tGame = System.nanoTime();
        long gameMs;
        try {
            match.startGame(game);
        } finally {
            gameMs = ms(tGame);
            // No-op if the game already ended normally: Game.setGameOver returns
            // early when isGameOver() (forge-game/.../Game.java:573-577).  This
            // only matters on a crash path.
            game.setGameOver(GameEndReason.Draw);
        }
        System.out.println("game took " + gameMs + " ms");

        // ------------------------------------------------------------------
        // 6. Result.
        // ------------------------------------------------------------------
        final GameOutcome outcome = game.getOutcome();
        final int turns = game.getPhaseHandler().getTurn();
        if (outcome == null) {
            System.out.println("RESULT: no outcome recorded");
        } else {
            final String winner = outcome.isDraw() || outcome.getWinningLobbyPlayer() == null
                    ? "(draw)" : outcome.getWinningLobbyPlayer().getName();
            System.out.println("RESULT: winner = " + winner
                    + ", reason = " + outcome.getWinCondition());
            for (final String s : outcome.getOutcomeStrings()) {
                System.out.println("RESULT: " + s);
            }
        }
        // Forge's log calls this a "Turn N" round; the PhaseHandler counts
        // PLAYER turns, so a 9-round game reports 17 or 18 turns here.
        System.out.println("RESULT: player turns = " + turns
                + " (round " + ((turns + 1) / 2) + ")");
        for (final GameLogEntry e : game.getGameLog().getLogEntries(GameLogEntryType.MATCH_RESULTS)) {
            System.out.println("RESULT: " + e);
        }

        System.out.println("total wall time = " + ms(t0) + " ms");
        System.out.println("SMOKE OK");
    }

    /**
     * Answer, deterministically, the question M1 will otherwise have to guess at:
     * are all 40 MSH/MSC cards actually supported by the engine?
     *
     * <p>{@code Match.prepareAllZones} calls {@code Deck.getValid()}, which drops
     * every card whose {@code CardRules.isUnsupported()} is true, and then hands
     * the dropped list to {@code GameAction.revealUnsupported}
     * (forge-game/src/main/java/forge/game/Match.java:303,343,355-357).  That
     * ends at {@code PlayerController.revealUnsupported}, and BOTH ends are
     * silent for our purposes: {@code PlayerControllerAi}'s override is an empty
     * method whose whole body is the comment "Ai won't understand that anyway"
     * (forge-ai/src/main/java/forge/ai/PlayerControllerAi.java:1410-1412), and
     * the human one opens a {@code getChoices} dialog
     * (forge-gui/src/main/java/forge/player/PlayerControllerHuman.java:2590-2596)
     * rather than printing anything.  <b>There is no stderr line to grep for</b>;
     * a text search would report a false clean bill of health.  So we apply the
     * same predicate ourselves, without mutating the deck ({@code getValid()}
     * removes the offending cards from the pool in place).
     *
     * <p>Also tallies the set codes each name resolved to, because this deck
     * spans two sets (MSH and MSC) and the art resolver will need to know.
     */
    private static void auditDeck(final Deck deck) {
        final Map<String, Integer> bySet = new LinkedHashMap<>();
        final List<String> unsupported = new ArrayList<>();
        for (final Map.Entry<forge.item.PaperCard, Integer> e : deck.getMain()) {
            final forge.item.PaperCard pc = e.getKey();
            final String set = pc.getEdition() == null ? "(none)" : pc.getEdition();
            bySet.merge(set, e.getValue(), Integer::sum);
            if (pc.getRules() == null || pc.getRules().isUnsupported()) {
                unsupported.add(pc.getName() + " [" + set + "]");
            }
        }
        // The wording here deliberately avoids the literal word the stderr
        // watcher greps for, so the report cannot match its own output.
        System.out.println("deck sets = " + bySet);
        if (unsupported.isEmpty()) {
            System.out.println("deck cards Forge would drop = none (all "
                    + deck.getMain().countDistinct() + " distinct names have a working card script)");
        } else {
            System.out.println("deck cards Forge would drop = " + unsupported.size()
                    + " -- SILENTLY removed from the library by Match.prepareAllZones:");
            for (final String s : unsupported) {
                System.out.println("  ! " + s);
            }
        }
    }

    /**
     * The card whose Forge script we override, and the keyword the override
     * deletes (decision D14, docs/research/08-deck-card-coverage.md section 2).
     */
    private static final String OVERRIDDEN_CARD = "A.I.M. Scientists";
    private static final String OVERRIDDEN_KEYWORD = "Trample";

    /**
     * Prove the card-script overlay took effect, from the card database the
     * engine actually loaded.
     *
     * <p>Forge's stock {@code a/a_i_m_scientists.txt} carries {@code K:Trample},
     * which the printed card does not have -- its own {@code Oracle:} line in
     * the same file contradicts it, and the bug reproduces on Forge master.  A
     * 3/3 trampler in a 40-card deck changes blocks and races, which is exactly
     * the kind of divergence that makes the on-screen game disagree with the
     * cards in the user's hand.  {@code forge-home/custom-cards/} holds the
     * corrected script and {@code tools/make-forge-home.sh} copies it into
     * {@code ForgeConstants.USER_CUSTOM_CARDS_DIR}.
     *
     * <p>Three things are checked, because each can fail independently: that the
     * overlay was <b>loaded</b> ({@code CardRules.isCustom()}), that the loaded
     * card <b>lost the keyword</b>, and that a deck containing it is still
     * <b>legal</b> -- {@code StaticData.loadCustomCards} marks everything it
     * loads custom, and {@code DeckFormat.getDeckConformanceProblem} rejects a
     * deck with a custom card in it unless
     * {@code ALLOW_CUSTOM_CARDS_IN_DECKS_CONFORMANCE} is on, which is why
     * {@link Bootstrap} turns it on before the database is built.
     */
    private static void auditCardOverlay(final Deck deck) {
        System.out.println("== card-script overlay (D14) ==");
        System.out.println("overlay files loadable = " + Bootstrap.customCardCount()
                + " in " + ForgeConstants.USER_CUSTOM_CARDS_DIR);

        final forge.card.CardRules rules =
                FModel.getMagicDb().getCommonCards().getRules(OVERRIDDEN_CARD, false);
        if (rules == null) {
            throw new IllegalStateException(
                OVERRIDDEN_CARD + " is not in the card database at all -- the overlay file is "
                + "malformed and has replaced a working card with nothing");
        }
        final List<String> keywords = new ArrayList<>();
        for (final String k : rules.getMainPart().getKeywords()) {
            keywords.add(k);
        }
        System.out.println(OVERRIDDEN_CARD + ": custom=" + rules.isCustom()
                + ", type=" + rules.getMainPart().getType()
                + ", pt=" + rules.getMainPart().getPower() + "/" + rules.getMainPart().getToughness()
                + ", keywords=" + keywords);
        if (!rules.isCustom()) {
            throw new IllegalStateException(
                OVERRIDDEN_CARD + " loaded from the STOCK cardsfolder, not from "
                + ForgeConstants.USER_CUSTOM_CARDS_DIR + " -- run ./tools/make-forge-home.sh");
        }
        for (final String k : keywords) {
            if (OVERRIDDEN_KEYWORD.equalsIgnoreCase(k.trim())) {
                throw new IllegalStateException(
                    OVERRIDDEN_CARD + " still has " + OVERRIDDEN_KEYWORD
                    + " -- the overlay did not take effect");
            }
        }
        System.out.println(OVERRIDDEN_CARD + " has no " + OVERRIDDEN_KEYWORD + ": OK");

        // Deck legality with a custom card in it.  Limited is the 40-card
        // format, so its size range matches this deck and the answer is about
        // the cards rather than about the deck size.
        final String limited = forge.deck.DeckFormat.Limited.getDeckConformanceProblem(deck);
        System.out.println("deck conformance (Limited, 40 cards) = "
                + (limited == null ? "legal" : limited));
        if (limited != null) {
            throw new IllegalStateException("the deck stopped being legal: " + limited);
        }
    }

    /** Fail loudly if Forge decided to write anywhere but our own var/. */
    private static void assertUnderRepo(final Config cfg, final String what, final String path) {
        final String root = cfg.root().getAbsolutePath() + File.separator;
        if (path == null || !path.startsWith(root)) {
            throw new IllegalStateException(
                "Forge " + what + " escaped the repo: " + path + " (expected under " + root + ").\n"
                + "  forge-home/forge.profile.properties is missing or not being read; "
                + "run ./tools/make-forge-home.sh");
        }
    }

    private static long ms(final long sinceNanos) {
        return (System.nanoTime() - sinceNanos) / 1_000_000L;
    }

    // ------------------------------------------------------------------
    // stdout/stderr line watcher
    // ------------------------------------------------------------------

    private static void report(final Watcher out, final Watcher err) {
        System.out.flush();
        System.err.flush();
        // Stop watching before printing the report: the report itself names the
        // needles, and a self-match would show up as a phantom hit.
        out.stop();
        err.stop();
        System.out.println("== watched engine output ==");
        for (final String[] w : WATCHED) {
            final String label = w[0];
            final int n = out.count(label) + err.count(label);
            System.out.println(label + " [" + w[2] + "]: " + n + " line(s)");
            final List<String> samples = new ArrayList<>(out.samples(label));
            samples.addAll(err.samples(label));
            for (int i = 0; i < samples.size() && i < 5; i++) {
                System.out.println("  | " + samples.get(i));
            }
        }
        System.out.flush();
    }

    private static Watcher install(final boolean stdout) {
        final PrintStream original = stdout ? System.out : System.err;
        final Watcher w = new Watcher(original);
        final PrintStream wrapped = new PrintStream(w, true, StandardCharsets.UTF_8);
        if (stdout) {
            System.setOut(wrapped);
        } else {
            System.setErr(wrapped);
        }
        return w;
    }

    /**
     * Passes every byte through untouched and, in parallel, splits the stream
     * into lines and records the ones matching {@link #WATCHED}.  Cheaper and
     * more reliable than grepping the tee'd log afterwards, because it survives
     * interleaving between stdout and stderr.
     */
    private static final class Watcher extends OutputStream {
        private final OutputStream out;
        private final ByteArrayOutputStream line = new ByteArrayOutputStream(256);
        private final Map<String, List<String>> hits = new LinkedHashMap<>();
        private final Map<String, Integer> counts = new LinkedHashMap<>();
        private boolean stopped;

        Watcher(final OutputStream out) {
            this.out = out;
            for (final String[] w : WATCHED) {
                hits.put(w[0], new ArrayList<>());
                counts.put(w[0], 0);
            }
        }

        /** Keep passing bytes through, but stop recording matches. */
        synchronized void stop() {
            stopped = true;
        }

        synchronized int count(final String label) {
            final Integer n = counts.get(label);
            return n == null ? 0 : n;
        }

        synchronized List<String> samples(final String label) {
            final List<String> l = hits.get(label);
            return l == null ? List.of() : new ArrayList<>(l);
        }

        @Override public synchronized void write(final int b) throws IOException {
            out.write(b);
            consume((byte) b);
        }

        @Override public synchronized void write(final byte[] b, final int off, final int len) throws IOException {
            out.write(b, off, len);
            for (int i = off; i < off + len; i++) {
                consume(b[i]);
            }
        }

        @Override public synchronized void flush() throws IOException {
            out.flush();
        }

        private void consume(final byte b) {
            if (stopped) {
                return;
            }
            if (b == '\n') {
                endLine();
            } else if (b != '\r') {
                if (line.size() < 8192) {
                    line.write(b);
                }
            }
        }

        private void endLine() {
            if (line.size() == 0) {
                return;
            }
            final String s = line.toString(StandardCharsets.UTF_8);
            line.reset();
            for (final String[] w : WATCHED) {
                if (s.toLowerCase(java.util.Locale.ROOT).contains(w[1].toLowerCase(java.util.Locale.ROOT))) {
                    counts.merge(w[0], 1, Integer::sum);
                    final List<String> l = hits.get(w[0]);
                    if (l.size() < 20) {
                        l.add(s);
                    }
                }
            }
        }
    }
}
