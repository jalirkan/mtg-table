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

import java.io.File;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

import forge.deck.Deck;
import forge.deck.io.DeckSerializer;
import forge.game.GameRules;
import forge.game.GameType;
import forge.game.player.PlayerView;
import forge.game.player.RegisteredPlayer;
import forge.gamemodes.match.HostedMatch;
import forge.item.PaperCard;
import forge.localinstance.properties.ForgePreferences;
import forge.localinstance.properties.ForgePreferences.FPref;
import forge.model.FModel;
import forge.player.GamePlayerUtil;
import forge.util.BuildInfo;
import forge.util.MyRandom;

import mtgtable.Json.JsonOut;

/**
 * M2: <b>a full game against the Forge AI, from one seat, over a
 * {@link Transport}.</b>
 *
 * <pre>
 *   ./bridge/run.sh mtgtable.MtgTable --transport console --seed 42
 *   ./bridge/run.sh mtgtable.MtgTable --transport auto    --seed 42
 *   ./bridge/run.sh mtgtable.MtgTable --transport null    --seed 42
 * </pre>
 *
 * <p>Three transports, in the order they were built, because each one proves
 * something the next one depends on:
 *
 * <ul>
 *   <li><b>null</b> -- frames go nowhere, every ask answers {@code null}.  The
 *       game plays itself to the end on protocol section 5.4's documented
 *       defaults, which is what proves no member throws and no thread
 *       wedges.</li>
 *   <li><b>auto</b> -- a scripted "dumb human": click the first selectable card,
 *       otherwise press the enabled button, and answer every ask with its
 *       minimal legal value.  It is the end-to-end test that needs no
 *       person.</li>
 *   <li><b>console</b> -- a human at a terminal.  The board, the prompt, the two
 *       button labels verbatim, and asks as numbered menus.</li>
 * </ul>
 *
 * <p>The whole frame stream, both directions, is written to
 * {@code var/games/<gameId>/frames.jsonl} -- the same format
 * {@code RecordMatch} writes and the browser replays, so a game played here is
 * a fixture there.
 */
public final class MtgTable {

    private MtgTable() { }

    /** Give up rather than hang forever if the engine wedges. */
    private static final long GAME_TIMEOUT_SEC = 900L;

    public static void main(final String[] args) {
        final long t0 = System.nanoTime();
        int exit = 0;
        try {
            run(args, t0);
        } catch (final Throwable e) {
            System.out.flush();
            System.err.println("MTGTABLE FAILED: " + e);
            e.printStackTrace();
            exit = 1;
        }
        System.out.flush();
        System.err.flush();
        // Forge leaves daemon pools (and our EDT) behind; do not wait for them.
        System.exit(exit);
    }

    private static void run(final String[] args, final long t0) throws Exception {
        final Args a = Args.parse(args);
        final Config cfg = Config.load();
        final File deck1File = resolve(cfg, a.deck != null ? a.deck : cfg.deck().getPath());
        final File deck2File = a.deck2 == null ? deck1File : resolve(cfg, a.deck2);

        System.out.println("== mtg-table M2 ==");
        System.out.println("transport     = " + a.transport);
        System.out.println("deck (you)    = " + deck1File);
        System.out.println("deck (ai)     = " + deck2File);
        System.out.println("seed          = " + a.seed);
        System.out.println("seat          = " + a.seat);

        // 1. GuiBase FIRST, then FModel.  The one shared boot sequence; the
        //    preference decisions D13/D14 live in Bootstrap, not here, so a game
        //    played here is the same game RecordMatch records.
        Bootstrap.installGui(cfg.forgeHomeDir());
        final long initMs = Bootstrap.initializeModel(false);
        System.out.println("FModel.initialize took " + initMs + " ms");

        // HostedMatch prompts for a player name when FPref.PLAYER_NAME is blank
        // (HostedMatch.java:268-270 -> GamePlayerUtil.setPlayerName), which opens
        // a dialog and calls prefs.save().  Neither belongs in a headless run, so
        // fill it in memory.  NEVER save(): same rule as D13.
        final ForgePreferences prefs = FModel.getPreferences();
        if (isBlank(prefs.getPref(FPref.PLAYER_NAME))) {
            prefs.setPref(FPref.PLAYER_NAME, "Human");
        }

        // 2. Seed: after initialize, before anything shuffles.
        MyRandom.setRandom(new Random(a.seed));

        // 3. Decks.  DeckSerializer.fromFile ONLY (hard rule 4).
        final Deck deck1 = deck(deck1File);
        final Deck deck2 = deck(deck2File);
        System.out.println("deck you      = " + deck1.getName() + " (" + deck1.getMain().countAll() + " cards)");
        System.out.println("deck ai       = " + deck2.getName() + " (" + deck2.getMain().countAll() + " cards)");

        // 4. One human seat plus one AI.  GamePlayerUtil.getGuiPlayer() is what
        //    makes the seat a PlayerControllerHuman, which is what makes an
        //    InputQueue (and therefore a prompt) exist at all.
        final GameRules rules = new GameRules(GameType.Constructed);
        rules.setGamesPerMatch(1);
        final RegisteredPlayer me = new RegisteredPlayer(deck1);
        me.setPlayer(GamePlayerUtil.getGuiPlayer());
        final RegisteredPlayer ai = new RegisteredPlayer(deck2);
        ai.setPlayer(GamePlayerUtil.createAiPlayer(a.aiName, 0));
        final List<RegisteredPlayer> seats = List.of(me, ai);

        // 5. Log, transport, gui.
        final String gameId = a.gameId != null ? a.gameId : "human-" + a.transport + "-" + a.seed;
        final File out = new File(cfg.root(), "var/games/" + gameId + "/frames.jsonl");
        final GameLog log = new GameLog(out);
        System.out.println("log           = " + out);

        final Transport transport = transport(a);
        final WireGuiGame gui = new WireGuiGame(gameId, transport, log);
        transport.start(gui, gui.pool());

        final HostedMatch hosted = new HostedMatch();
        gui.setHostedMatch(hosted);
        gui.setSession(new WireGuiGame.Session() {
            @Override public String header(final PlayerView viewer, final List<PlayerView> players) {
                return sessionHeader(cfg, gameId, a, viewer, players, deck1File, deck2File, deck1, deck2);
            }

            @Override public String helloOk(final PlayerView viewer, final List<PlayerView> players) {
                return helloOkBody(cfg, gameId, a, viewer, players, unsupported(deck1));
            }
        });

        // 6. Go.  startMatch runs openView on THIS thread and only then hands the
        //    match to a Forge game thread, so it returns almost immediately.
        final long tGame = System.nanoTime();
        hosted.startMatch(rules, EnumSet.of(GameType.Constructed), seats, me, gui);

        // 7. Park until `over`.
        final boolean finished = gui.awaitFinish(GAME_TIMEOUT_SEC * 1000L);
        final long gameMs = ms(tGame);
        transport.close();
        gui.close();

        // 8. Summary.
        final int turns = hosted.getGame() == null ? 0 : hosted.getGame().getPhaseHandler().getTurn();
        String winner = "(unknown)";
        String reason = "";
        if (hosted.getGame() != null && hosted.getGame().getOutcome() != null) {
            final forge.game.GameOutcome o = hosted.getGame().getOutcome();
            winner = o.isDraw() || o.getWinningLobbyPlayer() == null
                    ? "(draw)" : o.getWinningLobbyPlayer().getName();
            reason = String.valueOf(o.getWinCondition());
        }
        System.out.println();
        System.out.println("== summary ==");
        System.out.println("finished       = " + finished + (finished ? "" : "  (TIMED OUT after "
                + GAME_TIMEOUT_SEC + "s -- the game thread is wedged)"));
        System.out.println("winner         = " + winner + (reason.isEmpty() ? "" : ", reason = " + reason));
        System.out.println("player turns   = " + turns + " (round " + ((turns + 1) / 2) + ")");
        System.out.println("frames         = " + gui.stateFrames() + " state, " + log.lines()
                + " log line(s) including the session header");
        System.out.println("ask kinds      = "
                + (gui.askKindsSeen().isEmpty() ? "none" : gui.askKindsSeen().toString()));
        System.out.println("UNIMPL members = "
                + (gui.unimplemented().isEmpty() ? "none" : gui.unimplemented().toString()));
        System.out.println("members fired  = " + gui.membersFired().size() + " of 37 "
                + gui.membersFired());
        System.out.println("REVEAL count   = " + Snap.reveals() + " (full card in a hidden zone we do not own)");
        System.out.println("deferred events= " + gui.deferredEvents()
                + " (handleGameEvents off the game thread -- expected, not a bug)");
        // The focus split is evidence, not decoration: `input.focusCard` can only
        // be serialised on the game thread (walking a view anywhere else corrupts
        // the Tracker), and the game-thread pushes are exactly the ones whose
        // card is NOT in the snapshot -- surveil, willPutCardOnTop.  A zero on
        // the left means the feature is specified, legal and never once
        // exercised by the engine for these decks, which is worth printing
        // rather than leaving a reader to infer from an emitter.
        final int[] focus = gui.focusPushes();
        System.out.println("focus pushes   = " + focus[0] + " on the game thread (serialised as "
                + "input.focusCard), " + focus[1] + " elsewhere (focusCardId only)");
        System.out.println("notices swept  = " + gui.noticeStringsSwept()
                + " (an engine string that named a concealed card, blanked)");
        System.out.println("events dropped = " + Snap.incompleteEventsDropped() + " (missing a required id)");
        System.out.println("unzoned cards  = " + Snap.unzonedCards());
        System.out.println("emit errors    = " + gui.errors());
        System.out.println("game wall time = " + gameMs + " ms");
        System.out.println("total wall     = " + ms(t0) + " ms");
        if (!finished) {
            throw new IllegalStateException("the game did not reach `over`");
        }
        System.out.println("MTGTABLE OK");
    }

    private static Transport transport(final Args a) {
        switch (a.transport) {
        case "null":    return new NullTransport();
        case "auto":    return new AutoTransport();
        case "console": return new ConsoleTransport();
        default:
            throw new IllegalArgumentException("--transport must be null|auto|console, got " + a.transport);
        }
    }

    // ==================================================================
    // Frame bodies (protocol sections 8.1 and 2.1)
    // ==================================================================

    /**
     * Line 0 of the log.  <b>The opponent's decklist is not in it</b>: a path
     * plus a sha256 identifies a decklist exactly, and section 8.3 promises the
     * log holds only what this seat was allowed to see.  With a human seat that
     * is no longer a hypothetical -- it would be the AI's whole deck, in the file
     * the player reads.
     */
    private static String sessionHeader(final Config cfg, final String gameId, final Args a,
                                        final PlayerView viewer, final List<PlayerView> players,
                                        final File deck1File, final File deck2File,
                                        final Deck deck1, final Deck deck2) {
        final JsonOut o = new JsonOut().obj();
        o.n("v", GameLog.PROTOCOL_VERSION);
        o.n("kind", "session");
        o.n("gameId", gameId);
        o.n("startedAt", Instant.now().toString());
        o.n("seed", a.seed);
        o.n("forgeVersion", BuildInfo.getVersionString());
        o.n("forgeJarSha256", sha256(cfg.forgeJar()));
        o.n("seat", viewer.getId());
        // Protocol section 8.1: WHICH client played this seat.  An AI-vs-AI
        // recording has no transport and RecordMatch writes no such key; a log a
        // seat played always does.  It is not decoration: `--transport null`
        // answers every ask with a literal null on purpose, and
        // tools/check-redaction.mjs's A12 needs to tell that apart from a bridge
        // that completed an `order` future with null, which wedges Forge.
        o.n("transport", a.transport);
        o.key("decks").arr();
        for (final PlayerView p : players) {
            final boolean isViewer = p.getId() == viewer.getId();
            final Deck d = isViewer ? deck1 : deck2;
            final File f = isViewer ? deck1File : deck2File;
            o.obj();
            o.n("player", p.getId());
            o.n("path", isViewer ? rel(cfg, f) : null);
            o.n("sha256", isViewer ? sha256(f) : null);
            o.n("cards", d.getMain().countAll());
            o.end();
        }
        o.end();
        return o.end().done();
    }

    /** {@code unsupportedCards} is the VIEWING seat's deck alone: each entry is a card name. */
    private static String helloOkBody(final Config cfg, final String gameId, final Args a,
                                      final PlayerView viewer, final List<PlayerView> players,
                                      final List<String> unsupported) {
        final JsonOut o = new JsonOut().obj();
        o.n("gameId", gameId);
        o.n("you", viewer.getId());
        o.n("seed", a.seed);
        o.n("forgeVersion", BuildInfo.getVersionString());
        o.n("forgeJarSha256", sha256(cfg.forgeJar()));
        o.key("unsupportedCards").arr();
        for (final String s : unsupported) {
            o.v(s);
        }
        o.end();
        o.key("players").arr();
        for (final PlayerView p : players) {
            o.obj().n("id", p.getId()).n("name", p.getName()).n("isAi", p.isAI()).end();
        }
        o.end();
        return o.end().done();
    }

    // ==================================================================
    // Odds and ends
    // ==================================================================

    /** CLI arguments. */
    private static final class Args {
        String transport = "console";
        String deck;
        String deck2;
        String aiName = "Forge AI";
        String gameId;
        long seed;
        int seat;

        static Args parse(final String[] argv) {
            final Args a = new Args();
            for (int i = 0; i < argv.length; i++) {
                final String k = argv[i];
                switch (k) {
                case "--transport": a.transport = need(argv, ++i, k); break;
                case "--deck":      a.deck = need(argv, ++i, k); break;
                case "--deck2":     a.deck2 = need(argv, ++i, k); break;
                case "--ai-name":   a.aiName = need(argv, ++i, k); break;
                case "--game-id":   a.gameId = need(argv, ++i, k); break;
                case "--seat":      a.seat = Integer.parseInt(need(argv, ++i, k)); break;
                case "--seed":      a.seed = Long.parseLong(need(argv, ++i, k)); break;
                default:
                    throw new IllegalArgumentException("unknown argument " + k + "\n"
                        + "usage: MtgTable [--transport null|auto|console] [--deck <path>] "
                        + "[--deck2 <path>] [--seed <n>] [--seat 0|1] [--ai-name <name>] "
                        + "[--game-id <id>]");
                }
            }
            if (a.seat != 0) {
                // HostedMatch.startMatch sorts LobbyPlayerHuman seats to the
                // front before it creates the Match (HostedMatch.java:181-187),
                // so the human is player 0 whatever we pass.  Accepting --seat 1
                // would silently produce a seat-0 game and a log whose header
                // lied about which seat it was redacted for.
                throw new IllegalArgumentException("--seat 1 is not supported: HostedMatch sorts "
                        + "human seats first, so the human seat is always player 0");
            }
            return a;
        }

        private static String need(final String[] argv, final int i, final String k) {
            if (i >= argv.length) {
                throw new IllegalArgumentException(k + " needs a value");
            }
            return argv[i];
        }
    }

    private static Deck deck(final File f) {
        if (!f.isFile()) {
            throw new IllegalStateException("deck not found: " + f);
        }
        final Deck d = DeckSerializer.fromFile(f);
        if (d == null) {
            throw new IllegalStateException("DeckSerializer.fromFile returned null for " + f);
        }
        return d;
    }

    /** The cards {@code Match.prepareAllZones} would silently drop from a library. */
    private static List<String> unsupported(final Deck... decks) {
        final Set<String> out = new LinkedHashSet<>();
        for (final Deck d : decks) {
            for (final Map.Entry<PaperCard, Integer> e : d.getMain()) {
                final PaperCard pc = e.getKey();
                if (pc.getRules() == null || pc.getRules().isUnsupported()) {
                    out.add(pc.getName() + " [" + pc.getEdition() + "]");
                }
            }
        }
        return new ArrayList<>(out);
    }

    private static boolean isBlank(final String s) {
        return s == null || s.trim().isEmpty();
    }

    private static File resolve(final Config cfg, final String path) {
        final File f = new File(path);
        return (f.isAbsolute() ? f : new File(cfg.root(), path)).getAbsoluteFile();
    }

    private static String rel(final Config cfg, final File f) {
        final String root = cfg.root().getAbsolutePath() + File.separator;
        final String p = f.getAbsolutePath();
        return p.startsWith(root) ? p.substring(root.length()) : p;
    }

    private static String sha256(final File f) {
        try {
            final MessageDigest md = MessageDigest.getInstance("SHA-256");
            try (java.io.InputStream in = Files.newInputStream(f.toPath())) {
                final byte[] buf = new byte[1 << 16];
                int n;
                while ((n = in.read(buf)) > 0) {
                    md.update(buf, 0, n);
                }
            }
            final StringBuilder sb = new StringBuilder(64);
            for (final byte b : md.digest()) {
                sb.append(Character.forDigit((b >> 4) & 0xf, 16)).append(Character.forDigit(b & 0xf, 16));
            }
            return sb.toString();
        } catch (final Exception e) {
            return null;
        }
    }

    private static long ms(final long sinceNanos) {
        return (System.nanoTime() - sinceNanos) / 1_000_000L;
    }
}
