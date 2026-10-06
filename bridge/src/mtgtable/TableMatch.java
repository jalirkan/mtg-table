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
// SPDX-License-Identifier: GPL-3.0-or-later
package mtgtable;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicIntegerArray;
import java.util.concurrent.atomic.AtomicLongArray;

import forge.LobbyPlayer;
import forge.deck.Deck;
import forge.game.Game;
import forge.game.GameRules;
import forge.game.GameType;
import forge.game.player.Player;
import forge.game.player.PlayerView;
import forge.game.player.RegisteredPlayer;
import forge.gamemodes.match.HostedMatch;
import forge.gui.interfaces.IGuiGame;
import forge.player.LobbyPlayerHuman;
import forge.player.PlayerControllerHuman;
import forge.util.BuildInfo;
import forge.util.GuiDisplayUtil;

import mtgtable.Json.JsonOut;

/**
 * <b>Amendment M59, decisions D402 and D403: one game between two people.</b>
 *
 * <pre>
 *   ./bridge/run.sh mtgtable.MtgTable --humans 2 --transport ws \
 *       --deck var/match/m…/seat0.dck --deck2 var/match/m…/seat1.dck \
 *       --seats-file var/match/m…/seats.json [--table-port 8646] [--lan]
 *   ./bridge/run.sh mtgtable.MtgTable --humans 2 --transport auto --seed 7   # two automated seats (the gate)
 * </pre>
 *
 * <p>Forge already knows how to seat two people: {@code HostedMatch.startMatch}
 * takes a map from each registered player to the {@code IGuiGame} that plays it,
 * makes each a {@code PlayerControllerHuman}, and calls each GUI's
 * {@code openView} with its own player alone.  So a table is two
 * {@link WireGuiGame}s, each the seat it always was -- its own transport, its
 * own frame log, every card through {@code Snap} against its own viewer (hard
 * rule 8) -- and this class, which owns what neither seat can know alone:
 * whether the other person is there, whose decision it is, how long it has
 * taken, and when an absent player's opponent may claim the win (D403).  It
 * tells each seat with a {@code table} frame whenever any of that changes.
 *
 * <p>The seats are HostedMatch's order: {@code --deck} is seat 0 and player 0,
 * {@code --deck2} seat 1.  {@code HostedMatch} sorts human seats first with a
 * stable sort, and both are human, so the order is the one given -- the reason
 * {@code --seat 1} is refused for one human does not apply here.
 *
 * <p>Logs: {@code var/games/<gameId>-seat<N>/frames.jsonl}, one per seat, each
 * redacted for its seat.  The game id is {@code friend-…} (play.sh writes
 * {@code friend-m<13 digits>}).  The human test set (D369) and the automatic
 * review (D385) read a seat's log only when its header says {@code record: true}:
 * that player agreed to it for this game (D407).
 *
 * <p><b>Best of three (D406, amendment M60).</b>  A process still plays ONE
 * game: the draft room runs the match, one engine start per game, with the
 * decks each player handed it for that game (sideboarding is a deck handed in
 * again, checked by the room against that player's picks, D404).  The seats
 * file tells this game where it stands -- {@code match: {bestOf, game, wins}},
 * which the handshake repeats ({@code gameNumber}, {@code gameCount},
 * {@code match.games}, {@code match.score}) -- and {@code chooser}, the seat
 * that lost the previous game: Forge's own rule for a later game of a match is
 * that the loser chooses to play or draw ({@code GameAction}'s
 * {@code determineFirstTurnPlayer}), and a fresh process has no previous game,
 * so {@link TableController} hands the coin-toss winner's
 * {@code chooseStartingPlayer} to the chooser's own "You lost the last game:
 * play or draw?".  When the game ends, {@code result.json} beside the seats
 * file names the winning seat for the room.  D407: {@code record}, each seat's
 * consent to recording this game, goes into that seat's session header, where
 * the human test set's collector and the automatic review read it.
 */
final class TableMatch implements WireGuiGame.Table {

    /** The decision clock's default (D403): three minutes for one decision, then the engine's default. */
    static final long DEFAULT_DECISION_TIMEOUT_SEC = 180L;

    /** How long a player may be away before their opponent may claim the win (D403). */
    static final long DEFAULT_GRACE_SEC = 120L;

    /** The table's heartbeat on the main thread. */
    private static final long TICK_MS = 200L;

    /** The default table port ({@code config.json} {@code tablePort}). */
    static final int DEFAULT_TABLE_PORT = 8646;

    /** What MtgTable parsed and loaded, handed over whole. */
    static final class Setup {
        String transport;
        long seed;
        String gameId;
        Config cfg;
        File[] deckFiles;
        Deck[] decks;
        String[] names;
        byte[][] digests;
        int tablePort;
        int healthPort;
        boolean lan;
        List<String> tableOrigins = List.of();
        long decisionTimeoutSec;
        long graceSec;
        long idleTimeoutSec;
        long gameTimeoutSec;
        boolean keepOpen;
        boolean manaLostPrompt;
        /** D406: best of how many (1 or 3), which game of it this is, and the games each seat has won before it. */
        int bestOf = 1;
        int gameNo = 1;
        int[] wins = {0, 0};
        /** D406: the seat that chooses to play or draw (the previous game's loser), or -1: Forge's coin toss. */
        int chooser = -1;
        /** D407: each seat's consent to recording this game, or null (the seats file did not say). */
        boolean[] record;
        /** D406: where the result goes ({@code result.json} beside the seats file), or null. */
        File resultFile;
    }

    /**
     * The seats file (D404): {@code {"names": [a, b], "tokenSha256": [hex, hex]}}, and since D406/D407
     * optionally {@code "match": {"bestOf": 1|3, "game": n, "wins": [a, b]}}, {@code "chooser": 0|1} and
     * {@code "record": [bool, bool]}.  Nothing else.
     */
    static final class SeatsFile {
        final String[] names;
        final byte[][] digests;
        int bestOf = 1;
        int gameNo = 1;
        int[] wins = {0, 0};
        int chooser = -1;
        boolean[] record;

        SeatsFile(final String[] names, final byte[][] digests) {
            this.names = names;
            this.digests = digests;
        }
    }

    private static int intIn(final Object v, final int lo, final int hi, final String what) {
        if (!(v instanceof Long) || (Long) v < lo || (Long) v > hi) {
            throw new IllegalArgumentException("--seats-file: " + what + " must be a whole number " + lo + "-" + hi);
        }
        return ((Long) v).intValue();
    }

    /** A player's name: 1-24 characters, no control characters (the draft room's rule, D400). */
    static String checkName(final Object v) {
        if (!(v instanceof String)) {
            throw new IllegalArgumentException("a seat's name is a string");
        }
        final String s = ((String) v).trim();
        if (s.isEmpty() || s.length() > 24 || s.chars().anyMatch(ch -> ch < 0x20 || ch == 0x7f)) {
            throw new IllegalArgumentException("a seat's name is 1-24 characters with no control characters");
        }
        return s;
    }

    /** Read and check the seats file.  Any other key, a missing one or a bad value fails the run. */
    static SeatsFile readSeatsFile(final File f) throws java.io.IOException {
        final Object parsed = Json.parse(new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8));
        if (!(parsed instanceof Map)) {
            throw new IllegalArgumentException("--seats-file is not a JSON object");
        }
        final Map<?, ?> m = (Map<?, ?>) parsed;
        for (final Object k : m.keySet()) {
            if (!List.of("names", "tokenSha256", "match", "chooser", "record").contains(k)) {
                throw new IllegalArgumentException("--seats-file has an unknown key " + k);
            }
        }
        final Object names = m.get("names");
        final Object digests = m.get("tokenSha256");
        if (!(names instanceof Object[]) || ((Object[]) names).length != 2
                || !(digests instanceof Object[]) || ((Object[]) digests).length != 2) {
            throw new IllegalArgumentException("--seats-file wants names: [2] and tokenSha256: [2]");
        }
        final String[] n = {checkName(((Object[]) names)[0]), checkName(((Object[]) names)[1])};
        final byte[][] d = {TableServer.hexDigest(String.valueOf(((Object[]) digests)[0])),
                            TableServer.hexDigest(String.valueOf(((Object[]) digests)[1]))};
        final SeatsFile sf = new SeatsFile(n, d);
        // D406: where this game stands in a best of three.
        if (m.containsKey("match")) {
            if (!(m.get("match") instanceof Map)) {
                throw new IllegalArgumentException("--seats-file: match must be {bestOf, game, wins}");
            }
            final Map<?, ?> mm = (Map<?, ?>) m.get("match");
            for (final Object k : mm.keySet()) {
                if (!List.of("bestOf", "game", "wins").contains(k)) {
                    throw new IllegalArgumentException("--seats-file: match has an unknown key " + k);
                }
            }
            sf.bestOf = intIn(mm.get("bestOf"), 1, 3, "match.bestOf");
            if (sf.bestOf != 1 && sf.bestOf != 3) {
                throw new IllegalArgumentException("--seats-file: match.bestOf is 1 or 3");
            }
            sf.gameNo = intIn(mm.get("game"), 1, sf.bestOf, "match.game");
            final Object w = mm.get("wins");
            if (!(w instanceof Object[]) || ((Object[]) w).length != 2) {
                throw new IllegalArgumentException("--seats-file: match.wins is [a, b]");
            }
            final int need = sf.bestOf / 2 + 1;
            sf.wins = new int[] {intIn(((Object[]) w)[0], 0, need - 1, "match.wins[0]"),
                                 intIn(((Object[]) w)[1], 0, need - 1, "match.wins[1]")};
            if (sf.wins[0] + sf.wins[1] > sf.gameNo - 1) {
                throw new IllegalArgumentException("--seats-file: match.wins add up to more games than came before game " + sf.gameNo);
            }
        }
        if (m.containsKey("chooser")) {
            sf.chooser = intIn(m.get("chooser"), 0, 1, "chooser");
            if (sf.gameNo < 2) {
                throw new IllegalArgumentException("--seats-file: chooser is the previous game's loser -- game 1 has none");
            }
        }
        if (m.containsKey("record")) {
            final Object r = m.get("record");
            if (!(r instanceof Object[]) || ((Object[]) r).length != 2
                    || !(((Object[]) r)[0] instanceof Boolean) || !(((Object[]) r)[1] instanceof Boolean)) {
                throw new IllegalArgumentException("--seats-file: record is [bool, bool]");
            }
            sf.record = new boolean[] {(Boolean) ((Object[]) r)[0], (Boolean) ((Object[]) r)[1]};
        }
        return sf;
    }

    /** Two distinct names: Forge names a player in its own strings, and two Sams read as one. */
    static String[] distinctNames(final String a, final String b) {
        final String b2 = a.toLowerCase(Locale.ROOT).equals(b.toLowerCase(Locale.ROOT)) ? b + " (2)" : b;
        return new String[] {a, b2};
    }

    // ------------------------------------------------------------------

    private final Setup s;
    private final WireGuiGame[] gui = new WireGuiGame[2];
    private final Transport[] transports = new Transport[2];
    private final WsTransport[] ws = new WsTransport[2];
    private TableServer server;
    private final GameLog[] logs = new GameLog[2];

    /** Epoch ms each seat's person left (0 = here), read by {@link #claimWin} on the EDT. */
    private final AtomicLongArray awaySince = new AtomicLongArray(2);
    private final long[] waitStart = new long[2];
    private final long[] deadline = new long[2];
    private final long[] lastKey = {-1L, -1L};
    private final int[] expiries = new int[2];
    private final String[] lastTable = new String[2];
    private volatile boolean claimed;
    /** D406: the seat that claimed the win, or -1. */
    private volatile int claimedBy = -1;
    /** D406: which seats sent {@code act: concede} (1), for a result the engine never published. */
    private final AtomicIntegerArray conceded = new AtomicIntegerArray(2);
    /** D406: each seat's controller, made by its {@link TableLobbyPlayer} on the game thread. */
    private final TableController[] controllers = new TableController[2];
    private final RegisteredPlayer[] registered = new RegisteredPlayer[2];
    private int tableFrames;

    private TableMatch(final Setup s) {
        this.s = s;
    }

    /** Play the game.  Returns true when it reached {@code over}. */
    static boolean run(final Setup s, final long t0) throws Exception {
        return new TableMatch(s).play(t0);
    }

    private boolean connected(final int i) {
        return ws[i] == null || ws[i].connected();
    }

    private int index(final WireGuiGame g) {
        return g == gui[0] ? 0 : g == gui[1] ? 1 : -1;
    }

    @Override
    public void conceded(final WireGuiGame seat) {
        final int i = index(seat);
        if (i >= 0) {
            conceded.set(i, 1);
        }
    }

    // ------------------------------------------------------------------
    // D406: the loser of the previous game chooses to play or draw
    // ------------------------------------------------------------------

    /**
     * Each seat's lobby player: Forge's own {@code LobbyPlayerHuman}, whose
     * in-game player is driven by a {@link TableController} instead of a plain
     * {@code PlayerControllerHuman} -- the same body as
     * {@code LobbyPlayerHuman.createIngamePlayer} in the pinned 2.0.14 jar
     * (javap), one class swapped.
     */
    private static final class TableLobbyPlayer extends LobbyPlayerHuman {
        private final TableMatch table;
        private final int seat;

        TableLobbyPlayer(final String name, final TableMatch table, final int seat) {
            super(name);
            this.table = table;
            this.seat = seat;
        }

        @Override
        public Player createIngamePlayer(final Game game, final int id) {
            final Player p = new Player(GuiDisplayUtil.personalizeHuman(getName()), game, id);
            final TableController c = new TableController(game, p, this, table);
            table.controllers[seat] = c;
            p.setFirstController(c);
            return p;
        }
    }

    /**
     * A seat's controller at a table: {@code PlayerControllerHuman} with one
     * method changed.  Forge decides who goes first in
     * {@code GameAction.determineFirstTurnPlayer}: game 1 of a match by a coin
     * toss whose winner is asked "play or draw?", a later game by asking the
     * loser of the game before, "You lost the last game: play or draw?".  A
     * table's process plays one game, so Forge always sees a game 1; when the
     * seats file names a {@code chooser} (the room's previous game's loser,
     * D406) the coin-toss winner's question is handed to that seat's
     * controller with Forge's later-game wording.  Game thread only (it is
     * where Forge calls it), and the chooser's input goes up on its own queue
     * exactly as Forge's own later-game question would.
     */
    static final class TableController extends PlayerControllerHuman {
        private final TableMatch table;

        TableController(final Game game, final Player p, final LobbyPlayer lp, final TableMatch table) {
            super(game, p, lp);
            this.table = table;
        }

        @Override
        public Player chooseStartingPlayer(final boolean isFirstGame) {
            final int who = table.s.chooser;
            final TableController chooser = who < 0 ? null : table.controllers[who];
            if (chooser == null) {
                return super.chooseStartingPlayer(isFirstGame);
            }
            if (chooser != this) {
                System.err.println("TABLE PLAY OR DRAW: seat " + who + " lost the previous game, so it chooses (D406)");
                awaitNextInput();
                return chooser.chooseStartingPlayer(isFirstGame);
            }
            return super.chooseStartingPlayer(false);
        }
    }

    @Override
    public WireGuiGame peer(final WireGuiGame seat) {
        final int i = index(seat);
        return i < 0 ? null : gui[1 - i];
    }

    /** EDT (an act).  D403: allowed once the opponent has been away for the grace period. */
    @Override
    public void claimWin(final WireGuiGame seat) {
        final int me = index(seat);
        if (me < 0) {
            return;
        }
        final int opp = 1 - me;
        final long away = awaySince.get(opp);
        final long graceMs = s.graceSec * 1000L;
        if (away == 0L || System.currentTimeMillis() - away < graceMs || claimed) {
            seat.tableNotice("warn", "Not yet", away == 0L ? s.names[opp] + " is here"
                    : "you can claim the win once " + s.names[opp] + " has been away for "
                    + (s.graceSec / 60 > 0 ? s.graceSec / 60 + " min" : s.graceSec + " s"));
            return;
        }
        claimed = true;
        claimedBy = me;
        final long mins = (System.currentTimeMillis() - away) / 60_000L;
        System.err.println("TABLE CLAIM: seat " + me + " claimed the win; seat " + opp + " away " + mins
                + " min (D403)");
        gui[me].tableNotice("info", "Win claimed", s.names[opp] + " was away, so the game is yours");
        gui[opp].tableNotice("warn", "Game lost", s.names[me] + " claimed the win while you were away");
        gui[opp].concedeForAbsentSeat();
    }

    private boolean play(final long t0) throws Exception {
        final String[] names = distinctNames(s.names[0], s.names[1]);
        s.names = names;
        System.out.println("table         = two people (amendment M59): seat 0 " + names[0] + ", seat 1 " + names[1]);
        System.out.println("deck seat 0   = " + s.decks[0].getName() + " (" + s.decks[0].getMain().countAll() + " cards)");
        System.out.println("deck seat 1   = " + s.decks[1].getName() + " (" + s.decks[1].getMain().countAll() + " cards)");
        System.out.println("decision clock= " + (s.decisionTimeoutSec == 0 ? "off" : s.decisionTimeoutSec + " s")
                + "; away grace " + s.graceSec + " s (D403)");

        final GameRules rules = new GameRules(GameType.Constructed);
        rules.setGamesPerMatch(1);           // one game per process: the room runs a best of three (D406)
        rules.setWarnAboutAICards(false);    // M54: no AI here, and nothing of a deck is revealed before the game
        final RegisteredPlayer[] rp = new RegisteredPlayer[2];
        for (int i = 0; i < 2; i++) {
            rp[i] = new RegisteredPlayer(s.decks[i]);
            rp[i].setPlayer(new TableLobbyPlayer(names[i], this, i));
            registered[i] = rp[i];
        }
        if (s.bestOf > 1) {
            System.out.println("match         = game " + s.gameNo + " of a best of " + s.bestOf + ", "
                    + names[0] + " " + s.wins[0] + " - " + s.wins[1] + " " + names[1] + " (D406)");
        }
        System.out.println("play or draw  = " + (s.chooser < 0 ? "a coin toss, its winner chooses (Forge's game 1)"
                : names[s.chooser] + " chooses: they lost the previous game (D406)"));
        if (s.record != null) {
            System.out.println("recording     = seat 0 " + (s.record[0] ? "yes" : "no") + ", seat 1 "
                    + (s.record[1] ? "yes" : "no") + " (each player's consent, D407)");
        }

        final HostedMatch hosted = new HostedMatch();
        final Map<RegisteredPlayer, IGuiGame> guis = new LinkedHashMap<>();
        for (int i = 0; i < 2; i++) {
            final int seat = i;
            final File out = new File(s.cfg.root(), "var/games/" + s.gameId + "-seat" + i + "/frames.jsonl");
            logs[i] = new GameLog(out);
            System.out.println("log seat " + i + "    = " + out);
            switch (s.transport) {
            case "ws":
                ws[i] = WsTransport.tableSeat(i);
                transports[i] = ws[i];
                break;
            case "auto": {
                final AutoTransport t = new AutoTransport();
                t.setGames(1);
                transports[i] = t;
                break;
            }
            case "null":
                transports[i] = new NullTransport();
                break;
            default:
                throw new IllegalArgumentException("--humans 2 needs --transport ws, auto or null, got " + s.transport);
            }
            gui[i] = new WireGuiGame(s.gameId, transports[i], logs[i]);
            gui[i].setHostedMatch(hosted);
            gui[i].setTable(this);
            gui[i].setSession(new WireGuiGame.Session() {
                @Override public String header(final PlayerView viewer, final List<PlayerView> players) {
                    return TableMatch.this.sessionHeader(seat, viewer, players);
                }

                @Override public String helloOk(final PlayerView viewer, final List<PlayerView> players) {
                    return TableMatch.this.helloOk(seat, viewer, players);
                }
            });
            guis.put(rp[i], gui[i]);
        }
        if ("ws".equals(s.transport)) {
            server = new TableServer(s.tablePort, s.healthPort, s.lan, s.cfg.wsAllowedOrigins(), s.tableOrigins,
                    s.digests, ws);
            server.start();
            // Printed at the bind, before the game exists: /health turns 200 only once both seats have
            // their hello_ok, so a reader that waits for /health (play.sh) always finds these lines.
            final String bind = server.lan() ? WsTransport.LAN_BIND : WsTransport.LOOPBACK_BIND;
            System.out.println("TABLE LISTENING ws://" + bind + ":" + server.port()
                    + "/ws?seat=<the seat's token> -- two seats, a token each, no loopback exemption (M59)");
            System.out.println("WS HEALTH    http://127.0.0.1:" + server.healthPort() + "/health  (loopback, /health only)");
            if (server.lan()) {
                for (final String ip : WsTransport.lanAddresses()) {
                    System.out.println("TABLE LAN    ws://" + ip + ":" + server.port() + "/ws");
                }
            }
            System.out.flush();
        }
        for (int i = 0; i < 2; i++) {
            transports[i].start(gui[i], gui[i].pool());
        }
        EngineCrash.install(e -> {
            gui[0].engineCrashed(e);
            gui[1].engineCrashed(e);
        });

        final long tGame = System.nanoTime();
        hosted.startMatch(rules, EnumSet.of(GameType.Constructed), List.of(rp[0], rp[1]), guis, null);

        final boolean finished = awaitOver();
        final long gameMs = (System.nanoTime() - tGame) / 1_000_000L;
        writeResult(hosted, finished);
        if (finished && s.keepOpen && server != null) {
            linger();
        }
        for (int i = 0; i < 2; i++) {
            transports[i].close();
        }
        if (server != null) {
            server.close();
        }
        for (int i = 0; i < 2; i++) {
            gui[i].close();
        }
        summary(hosted, finished, gameMs, t0);
        return finished;
    }

    /** MAIN: tick the table until both seats have their {@code over}, or the session is abandoned. */
    private boolean awaitOver() throws InterruptedException {
        final long limitMs = s.gameTimeoutSec * 1000L;
        final long start = System.nanoTime();
        long noneSince = System.nanoTime();
        while (true) {
            if (gui[0].awaitGameEnd(1, TICK_MS)) {
                // Each seat captures the outcome on its own subscriber; the second is a moment behind.
                return gui[1].awaitGameEnd(1, 10_000L) || true;
            }
            tick();
            final long now = System.nanoTime();
            if (limitMs > 0 && (now - start) / 1_000_000L >= limitMs) {
                System.out.println("TIMED OUT after " + s.gameTimeoutSec + " s (--game-timeout)");
                return false;
            }
            if (server != null && s.idleTimeoutSec > 0) {
                if (connected(0) || connected(1)) {
                    noneSince = now;
                } else if ((now - noneSince) / 1_000_000_000L >= s.idleTimeoutSec) {
                    System.out.println("ABANDONED: nobody at the table for " + s.idleTimeoutSec
                            + " s, so the session ends; --idle-timeout 0 turns this off");
                    return false;
                }
            }
        }
    }

    /** MAIN: after {@code over}, stay up while anybody is still reading the final board (M6's rule). */
    private void linger() throws InterruptedException {
        long left = 30_000L;
        boolean saw = false;
        while (true) {
            if (connected(0) || connected(1)) {
                saw = true;
                Thread.sleep(TICK_MS);
                continue;
            }
            if (saw) {
                System.out.println("both players have left the final board -- the session ends here");
                return;
            }
            Thread.sleep(TICK_MS);
            left -= TICK_MS;
            if (left <= 0) {
                return;
            }
        }
    }

    /** MAIN, every {@value #TICK_MS} ms: presence, the decision clock, and the frames that say so. */
    private void tick() {
        final long nowNanos = System.nanoTime();
        final long nowMs = System.currentTimeMillis();
        final long timeoutMs = s.decisionTimeoutSec * 1000L;
        for (int i = 0; i < 2; i++) {
            final boolean conn = connected(i);
            final boolean waiting = gui[i].waitingOnSeat();
            final long key = gui[i].decisionKey();
            if (!conn) {
                if (awaySince.get(i) == 0L) {
                    awaySince.set(i, nowMs);
                    System.err.println("TABLE: seat " + i + " is away (the game waits for them, D403)");
                }
                waitStart[i] = 0L;           // the clock does not run for an absent player
                deadline[i] = 0L;
            } else {
                if (awaySince.get(i) != 0L) {
                    System.err.println("TABLE: seat " + i + " is back");
                }
                awaySince.set(i, 0L);
                if (waiting) {
                    if (waitStart[i] == 0L || key != lastKey[i]) {
                        waitStart[i] = nowNanos;
                        deadline[i] = timeoutMs > 0 ? nowMs + timeoutMs : 0L;
                    }
                } else {
                    waitStart[i] = 0L;
                    deadline[i] = 0L;
                }
            }
            lastKey[i] = key;
            if (timeoutMs > 0 && conn && waiting && waitStart[i] != 0L
                    && (nowNanos - waitStart[i]) / 1_000_000L >= timeoutMs) {
                expiries[i]++;
                System.err.println("TABLE CLOCK: seat " + i + " ran out of time (" + s.decisionTimeoutSec
                        + " s) -- the decision gets its default (D403)");
                gui[i].tableNotice("warn", "Time's up", "you took over " + clockWords()
                        + ", so the engine took its default for that decision");
                gui[1 - i].tableNotice("info", "Time's up", s.names[i] + " took over " + clockWords()
                        + ": the engine took its default for them");
                gui[i].clockExpired();
                waitStart[i] = nowNanos;
                deadline[i] = nowMs + timeoutMs;
            }
        }
        for (int v = 0; v < 2; v++) {
            final String body = tableBody(v, nowMs);
            if (!body.equals(lastTable[v]) && gui[v].emitTable(body)) {
                lastTable[v] = body;
                tableFrames++;
            }
        }
    }

    private String clockWords() {
        return s.decisionTimeoutSec % 60 == 0 ? s.decisionTimeoutSec / 60 + " min" : s.decisionTimeoutSec + " s";
    }

    /**
     * The {@code table} body for seat {@code v} (amendment M59).  Times are this
     * machine's epoch milliseconds, which the envelope's {@code t} is too, so a
     * client counts down with {@code deadline - t} and its own clock's offset
     * never matters.
     */
    String tableBody(final int v, final long nowMs) {
        final JsonOut o = new JsonOut().obj();
        o.n("you", v);
        o.key("seats").arr();
        for (int i = 0; i < 2; i++) {
            final PlayerView pv = gui[i].seat();
            final long away = awaySince.get(i);
            o.obj().n("seat", i);
            o.nInt("playerId", pv == null ? null : Integer.valueOf(pv.getId()));
            o.n("name", s.names[i]);
            o.n("connected", away == 0L);
            o.n("deciding", gui[i].waitingOnSeat());
            o.key("decisionDeadline");
            if (deadline[i] > 0L) {
                o.v(deadline[i]);
            } else {
                o.vNull();
            }
            o.key("awaySince");
            if (away > 0L) {
                o.v(away);
            } else {
                o.vNull();
            }
            o.end();
        }
        o.end();
        o.n("decisionTimeoutMs", s.decisionTimeoutSec * 1000L);
        o.n("graceMs", s.graceSec * 1000L);
        final long oppAway = awaySince.get(1 - v);
        o.key("claimWinAt");
        if (oppAway > 0L && !claimed) {
            o.v(oppAway + s.graceSec * 1000L);
        } else {
            o.vNull();
        }
        o.n("canClaimWin", oppAway > 0L && !claimed && nowMs - oppAway >= s.graceSec * 1000L);
        return o.end().done();
    }

    // ------------------------------------------------------------------
    // The handshake and the session header, per seat
    // ------------------------------------------------------------------

    /** Section 8.1's header for seat {@code seat}'s log: its own deck by path and hash, the other's by count. */
    private String sessionHeader(final int seat, final PlayerView viewer, final List<PlayerView> players) {
        final JsonOut o = new JsonOut().obj();
        o.n("v", GameLog.PROTOCOL_VERSION);
        o.n("kind", "session");
        o.n("gameId", s.gameId);
        o.n("startedAt", Instant.now().toString());
        o.n("seed", s.seed);
        o.n("forgeVersion", BuildInfo.getVersionString());
        o.n("forgeJarSha256", MtgTable.sha256(s.cfg.forgeJar()));
        o.n("seat", viewer.getId());
        o.n("transport", s.transport);
        if (s.manaLostPrompt) {
            o.key("prefs").arr().v("UI_MANA_LOST_PROMPT").end();
        }
        o.key("decks").arr();
        for (final PlayerView p : players) {
            final boolean mine = p.getId() == viewer.getId();
            final int i = mine ? seat : 1 - seat;
            o.obj();
            o.n("player", p.getId());
            o.n("path", mine ? MtgTable.rel(s.cfg, s.deckFiles[i]) : null);
            o.n("sha256", mine ? MtgTable.sha256(s.deckFiles[i]) : null);
            o.n("cards", s.decks[i].getMain().countAll());
            o.end();
        }
        o.end();
        o.n("humans", 2);                    // M59: the other seat is a person, not the AI
        if (s.record != null) {
            o.n("record", s.record[seat]);   // D407: this seat's consent to the human test set and the review
        }
        return o.end().done();
    }

    /**
     * {@code hello_ok} for seat {@code seat}: M44's {@code match} in its two-person
     * form -- the viewer's deck as ever, the opponent's by name and count only,
     * {@code opponent: "human"} and no AI profile or policy.
     */
    private String helloOk(final int seat, final PlayerView viewer, final List<PlayerView> players) {
        final JsonOut o = new JsonOut().obj();
        o.n("gameId", s.gameId);
        o.n("you", viewer.getId());
        o.n("seed", s.seed);
        if (s.bestOf > 1) {
            // M41's keys, from the room's match rather than this process's count (D406, M60).
            o.n("gameNumber", s.gameNo);
            o.n("gameCount", s.bestOf);
        }
        o.n("forgeVersion", BuildInfo.getVersionString());
        o.n("forgeJarSha256", MtgTable.sha256(s.cfg.forgeJar()));
        o.key("unsupportedCards").arr();
        for (final String u : MtgTable.unsupported(s.decks[seat])) {
            o.v(u);
        }
        o.end();
        o.key("players").arr();
        for (final PlayerView p : players) {
            o.obj().n("id", p.getId()).n("name", p.getName()).n("isAi", p.isAI()).end();
        }
        o.end();
        o.key("match").obj();
        o.key("yourDeck").obj()
                .n("name", Bootstrap.deckName(s.decks[seat], s.deckFiles[seat]))
                .n("path", MtgTable.rel(s.cfg, s.deckFiles[seat]))
                .n("cards", s.decks[seat].getMain().countAll())
                .end();
        o.key("opponentDeck").obj()
                .n("name", Bootstrap.deckName(s.decks[1 - seat], s.deckFiles[1 - seat]))
                .n("cards", s.decks[1 - seat].getMain().countAll())
                .end();
        o.n("opponent", "human");
        o.n("games", s.bestOf);
        if (s.bestOf > 1) {
            // M60: the games each of you won before this one, from your side of the table.
            o.key("score").obj().n("you", s.wins[seat]).n("opponent", s.wins[1 - seat]).end();
        }
        o.end();
        return o.end().done();
    }

    /**
     * D406: {@code result.json} beside the seats file -- which seat won, for the
     * room's score.  Forge's outcome when it published one; else a claimed win
     * (D403) or a lone concede, which M11 can end before any outcome exists;
     * else no winner.  Names no card and nothing either seat did not see.
     * Written whole to a temporary file and renamed into place.
     */
    private void writeResult(final HostedMatch hosted, final boolean finished) {
        if (s.resultFile == null) {
            return;
        }
        int winner = -1;
        String reason = null;
        String how = "none";
        boolean draw = false;
        final Game g = hosted.getGame();
        final forge.game.GameOutcome o = g == null ? null : g.getOutcome();
        if (o != null) {
            how = "outcome";
            reason = o.getWinCondition() == null ? null : String.valueOf(o.getWinCondition());
            draw = o.isDraw();
            final LobbyPlayer w = o.isDraw() ? null : o.getWinningLobbyPlayer();
            for (int i = 0; i < 2 && w != null; i++) {
                if (w == registered[i].getPlayer() || w.getName().equals(registered[i].getPlayer().getName())) {
                    winner = i;
                }
            }
        } else if (claimedBy >= 0) {
            how = "claimWin";
            winner = claimedBy;
            reason = "Conceded";
        } else if (conceded.get(0) != conceded.get(1)) {
            how = "concede";
            winner = conceded.get(0) == 1 ? 1 : 0;
            reason = "Conceded";
        }
        final JsonOut j = new JsonOut().obj();
        j.n("v", 1L);
        j.n("gameId", s.gameId);
        j.n("finished", finished);
        j.key("winnerSeat");
        if (winner >= 0) {
            j.v((long) winner);
        } else {
            j.vNull();
        }
        j.n("draw", draw);
        j.key("reason");
        if (reason != null) {
            j.v(reason);
        } else {
            j.vNull();
        }
        j.n("from", how);
        j.n("turns", (long) (g == null ? 0 : g.getPhaseHandler().getTurn()));
        final String text = j.end().done() + "\n";
        try {
            final File tmp = new File(s.resultFile.getPath() + ".tmp");
            Files.write(tmp.toPath(), text.getBytes(StandardCharsets.UTF_8));
            Files.move(tmp.toPath(), s.resultFile.toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING,
                    java.nio.file.StandardCopyOption.ATOMIC_MOVE);
            System.out.println("result        = " + (winner >= 0 ? "seat " + winner + " won" : draw ? "a draw" : "no winner")
                    + " (" + how + ") -> " + MtgTable.rel(s.cfg, s.resultFile));
        } catch (final java.io.IOException e) {
            System.err.println("TABLE RESULT not written: " + e);
        }
    }

    private void summary(final HostedMatch hosted, final boolean finished, final long gameMs, final long t0) {
        System.out.println();
        System.out.println("== summary (two people, amendment M59) ==");
        System.out.println("finished       = " + finished);
        String winner = "(unknown)";
        String reason = "";
        if (hosted.getGame() != null && hosted.getGame().getOutcome() != null) {
            final forge.game.GameOutcome o = hosted.getGame().getOutcome();
            winner = o.isDraw() || o.getWinningLobbyPlayer() == null ? "(draw)" : o.getWinningLobbyPlayer().getName();
            reason = String.valueOf(o.getWinCondition());
        }
        System.out.println("winner         = " + winner + (reason.isEmpty() ? "" : ", reason = " + reason));
        System.out.println("player turns   = " + (hosted.getGame() == null ? 0
                : hosted.getGame().getPhaseHandler().getTurn()));
        System.out.println("table frames   = " + tableFrames + "; clock ran out " + expiries[0] + " / " + expiries[1]
                + " time(s); win claimed = " + claimed);
        for (int i = 0; i < 2; i++) {
            final WireGuiGame g = gui[i];
            System.out.println("seat " + i + "         = " + s.names[i] + ": " + g.stateFrames() + " state, "
                    + logs[i].lines() + " log line(s), games finished " + g.gamesFinished()
                    + ", ask kinds " + g.askKindsSeen() + ", UNIMPL " + (g.unimplemented().isEmpty() ? "none"
                    : g.unimplemented().toString()) + ", emit errors " + g.errors() + ", late frames "
                    + g.lateFramesDropped() + ", concedes " + g.concedes()[0] + "+" + g.concedes()[1]);
            if (ws[i] != null) {
                System.out.println("seat " + i + " ws      = " + ws[i].connects() + " connection(s), "
                        + ws[i].takeovers() + " replaced, " + ws[i].framesOut() + " written, "
                        + ws[i].framesIn() + " read");
            }
        }
        if (server != null) {
            System.out.println("table door     = " + server.admitted() + " admitted, " + server.tokenRefusals()
                    + " refused for want of a seat token, " + server.originRefusals() + " by Origin, "
                    + server.limited() + " rate-limited, " + server.observeRefusals() + " observers refused");
        }
        System.out.println("REVEAL count   = " + Snap.reveals() + " (full card in a hidden zone we do not own)");
        System.out.println("game wall time = " + gameMs + " ms");
        System.out.println("total wall     = " + (System.nanoTime() - t0) / 1_000_000L + " ms");
    }

    /** For the summary of a run that never got this far. */
    static List<String> describe(final Setup s) {
        final List<String> out = new ArrayList<>();
        out.add(s.names[0] + " vs " + s.names[1]);
        return out;
    }
}
