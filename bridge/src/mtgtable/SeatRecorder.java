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
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import forge.deck.Deck;
import forge.game.Game;
import forge.game.GameView;
import forge.game.player.Player;
import forge.game.player.PlayerView;
import forge.gui.control.GameEventForwarder;
import forge.trackable.TrackableCollection;
import forge.util.BuildInfo;

import mtgtable.Json.JsonOut;
import mtgtable.ai.Decision;
import mtgtable.ai.DecisionSink;
import mtgtable.ai.PolicyControllerAi;

/**
 * One seat's frame log of a game some OTHER program is running (D315): the
 * cube lab's worker records every game it plays, both chairs, in the JVM that
 * plays it, instead of replaying the decks through a fresh {@link RecordMatch}
 * (a Forge boot, ~30 s, per game).
 *
 * <p>It is {@link RecordMatch}'s recorder, reused, not a second one: the same
 * {@link RecordMatch.SpectatorGui} (whose {@code handleGameEvents} calls
 * {@link Snap#state}, the one serialiser, for this seat's viewer), the same
 * hand-registered {@link GameEventForwarder}, the same
 * {@link RecordMatch.BoundaryFlusher} (unpaced), the same {@link GameLog}, and
 * the same session-header and {@code hello_ok} shapes -- so a lab recording is
 * a RecordMatch recording with {@code --match}, read by the same readers and
 * held by the same {@code tools/check-redaction.mjs}.  Two recorders on one game
 * are two viewers: each forwarder is registered before its own flusher (the
 * ordering {@link RecordMatch}'s class javadoc relies on), and a flusher only
 * flushes its own forwarder.  This class names no {@code CardView}.
 *
 * <h2>Threads</h2>
 *
 * {@link #attach} runs on the caller's thread BEFORE the game starts, and reads
 * only the {@code PlayerView} list, as {@link RecordMatch} does on {@code main}.
 * Every snapshot is built by the forwarder on the game thread.  {@link #finish}
 * and {@link #crashed} must be called on the game thread too -- from inside the
 * {@code GameAction.invoke} body that ran {@code match.startGame}, exactly where
 * {@link RecordMatch} calls them.  No thread is started (beyond each
 * {@link GameLog}'s own appender) and no game-thread hop is made.
 *
 * <h2>Decision records (D347)</h2>
 *
 * When the seat is ours ({@code PolicyControllerAi}, every lab and bench seat),
 * {@link #attach} makes this recorder THAT seat's {@link DecisionSink}: its
 * decisions -- legal options, answer, policy, the search's statistics -- go
 * into this seat's own log as {@code dir:"ai"} lines (amendment M55) and into
 * no other.  Before each one the recorder flushes the events it holds, so the
 * record points at a {@code state} frame that IS the position decided in; the
 * other seat's recorder is never flushed by it (its frame cuts would otherwise
 * show when this seat thought).  {@link #finish} adds a {@code decisions}
 * summary line.  The session header names every seat's profile and policy
 * ({@code seats}), so a dataset can stratify by them.
 */
public final class SeatRecorder implements AutoCloseable, DecisionSink {

    /**
     * What the recordings say about one seat; index {@code i} is the seat
     * registered {@code i}-th, which is the order {@code GameView.getPlayers()}
     * returns.  {@code deckFile} is named only in that seat's own log (the
     * session header's rule: the opponent's path and sha256 are null).
     */
    public static final class Seat {
        final String deckName;
        final File deckFile;
        final String deckPath;
        final Deck deck;
        final String profile;
        /** forge | outlets | search: who answers for the seat (D347's header {@code seats}). */
        final String policy;
        /** The search's knobs ({@code SearchConfig.toString()}), or null. */
        final String search;

        public Seat(final String deckName, final File deckFile, final String deckPath, final Deck deck,
                    final String profile) {
            this(deckName, deckFile, deckPath, deck, profile, "forge", null);
        }

        public Seat(final String deckName, final File deckFile, final String deckPath, final Deck deck,
                    final String profile, final String policy, final String search) {
            this.deckName = deckName;
            this.deckFile = deckFile;
            this.deckPath = deckPath;
            this.deck = deck;
            this.profile = profile;
            this.policy = policy == null ? "forge" : policy;
            this.search = search;
        }
    }

    private final GameLog log;
    private final RecordMatch.SpectatorGui gui;
    private final GameEventForwarder forwarder;
    private final int seatId;
    /** Decision records written, by kind and by policy; forced decisions counted; build errors (D347). */
    private int written;
    private final Map<String, Integer> byKind = new TreeMap<>();
    private final Map<String, Integer> byPolicy = new TreeMap<>();
    private final Map<String, Integer> forcedByKind = new TreeMap<>();
    private int searched;
    private int recordErrors;
    private long recordNanos;
    private long buildNanos;
    private boolean decisionsOn;
    /** The seat's own controller when it is ours: its explorer's counts go in the summary (D358). */
    private PolicyControllerAi controller;

    private SeatRecorder(final GameLog log, final RecordMatch.SpectatorGui gui, final GameEventForwarder forwarder,
                         final int seatId) {
        this.log = log;
        this.gui = gui;
        this.forwarder = forwarder;
        this.seatId = seatId;
    }

    /**
     * Open {@code out} (gzipped when it ends in {@code .gz}), write the session
     * header and {@code hello_ok} for {@code seat}'s viewer, and subscribe the
     * recorder to {@code game}'s events.  Call before the game starts.
     *
     * @param seed         the game's seed, the header's and {@code hello_ok}'s {@code seed}
     * @param forgeJarSha  the engine jar's sha256 (computed once per process by the caller)
     * @param extra        a {@code lab} object for the session header -- strings and
     *                     whole numbers only, nothing about the other seat's deck but its name
     */
    public static SeatRecorder attach(final Game game, final int seat, final File out, final String gameId,
                                      final long seed, final String forgeJarSha, final List<Seat> seats,
                                      final Map<String, Object> extra) throws IOException {
        return attach(game, seat, out, gameId, seed, forgeJarSha, seats, "lab", extra, null);
    }

    /** {@link #attach} with the header block's name: {@code lab} (the cube lab) or {@code bench} (ai-bench, D347). */
    public static SeatRecorder attach(final Game game, final int seat, final File out, final String gameId,
                                      final long seed, final String forgeJarSha, final List<Seat> seats,
                                      final String block, final Map<String, Object> extra) throws IOException {
        return attach(game, seat, out, gameId, seed, forgeJarSha, seats, block, extra, null);
    }

    /**
     * {@link #attach} with the header block's name and, for an exploring game
     * (D358), the session header's {@code playExplore} object (numbers, booleans,
     * strings; null = the game does not explore and the header has no such key).
     */
    public static SeatRecorder attach(final Game game, final int seat, final File out, final String gameId,
                                      final long seed, final String forgeJarSha, final List<Seat> seats,
                                      final String block, final Map<String, Object> extra,
                                      final Map<String, Object> playExplore) throws IOException {
        final GameView gameView = game.getView();
        final List<PlayerView> players = new ArrayList<>();
        for (final PlayerView pv : gameView.getPlayers()) {
            players.add(pv);
        }
        if (seat < 0 || seat >= players.size() || players.size() != seats.size()) {
            throw new IllegalArgumentException("seat " + seat + " of " + players.size() + " players, "
                    + seats.size() + " seat descriptions");
        }
        final PlayerView viewer = players.get(seat);
        final GameLog log = new GameLog(out, out.getName().endsWith(".gz"));
        log.header(header(gameId, seed, forgeJarSha, viewer, players, seats, block, extra, playExplore));
        final RecordMatch.SpectatorGui gui = new RecordMatch.SpectatorGui(gameId, game, gameView, viewer, log, false);
        gui.setGameView(null);      // HostedMatch's own two-step, as RecordMatch does
        gui.setGameView(gameView);
        gui.openView(new TrackableCollection<>(viewer));
        log.s2c("hello_ok", helloOk(gameId, seed, forgeJarSha, seat, viewer, players, seats));
        final GameEventForwarder forwarder = new GameEventForwarder(gui);
        game.subscribeToEvents(forwarder);
        // After its own forwarder, on purpose: RecordMatch's class javadoc.
        game.subscribeToEvents(new RecordMatch.BoundaryFlusher(forwarder, gui, 0L));
        final SeatRecorder rec = new SeatRecorder(log, gui, forwarder, viewer.getId());
        // D347: this seat's decisions, into this seat's log only.  MTGTABLE_DECISIONS=off
        // records the game as before D347 (to measure the records' own cost).
        final boolean off = "off".equals(System.getenv("MTGTABLE_DECISIONS"));
        for (final Player p : off ? List.<Player>of() : game.getPlayers()) {
            if (p.getId() == viewer.getId() && p.getController() instanceof PolicyControllerAi) {
                ((PolicyControllerAi) p.getController()).setDecisionSink(rec);
                rec.decisionsOn = true;
                rec.controller = (PolicyControllerAi) p.getController();
            }
        }
        return rec;
    }

    /** The game ended: the last batch, a final snapshot, the decision summary and {@code over}.  Game thread only. */
    public void finish() {
        forwarder.flush();
        gui.snapshot(List.of());
        summary();
        gui.emitOver();
    }

    // ------------------------------------------------------------------
    // DecisionSink (D347) -- all on the game thread
    // ------------------------------------------------------------------

    @Override
    public int[] mark() {
        final long t = System.nanoTime();
        if (forwarder.hasPendingEvents()) {
            forwarder.flush();
        }
        int[] st = log.lastState();
        if (st[0] < 0) {
            gui.snapshot(List.of());   // a decision before the first frame (the mulligan): the hand it is taken on
            st = log.lastState();
        }
        recordNanos += System.nanoTime() - t;
        return st;
    }

    @Override
    public int write(final Decision d, final int[] mark) {
        final long t = System.nanoTime();
        final int n = written;
        log.ai("decision", d.toJson(seatId, n, mark[0], mark[1]));
        written++;
        byKind.merge(d.kind, 1, Integer::sum);
        byPolicy.merge(d.by, 1, Integer::sum);
        if (d.search != null) {
            searched++;
        }
        recordNanos += System.nanoTime() - t;
        return n;
    }

    @Override
    public void cost(final long nanos) {
        buildNanos += nanos;
    }

    @Override
    public void forced(final String kind) {
        forcedByKind.merge(kind, 1, Integer::sum);
    }

    @Override
    public void error(final String where, final RuntimeException e) {
        recordErrors++;
        if (recordErrors <= 5) {
            System.err.println("[decisions] seat " + seatId + " " + where + ": " + e);
        }
    }

    /** Decision records written (D347). */
    public int decisions() {
        return written;
    }

    /** Decision records that could not be built. */
    public int decisionErrors() {
        return recordErrors;
    }

    /** The {@code decisions} summary line: counts by kind and policy, forced decisions, errors. */
    private void summary() {
        if (!decisionsOn) {
            return;
        }
        final JsonOut o = new JsonOut().obj().n("seat", seatId).n("written", written).n("searched", searched)
                .n("errors", recordErrors).n("recordMs", recordNanos / 1_000_000L)
                .n("buildMs", buildNanos / 1_000_000L);
        for (final Object[] kv : new Object[][] {{"byKind", byKind}, {"byPolicy", byPolicy}, {"forced", forcedByKind}}) {
            o.key((String) kv[0]).obj();
            @SuppressWarnings("unchecked")
            final Map<String, Integer> m = (Map<String, Integer>) kv[1];
            for (final Map.Entry<String, Integer> e : m.entrySet()) {
                o.n(e.getKey(), (long) e.getValue());
            }
            o.end();
        }
        // D358: what play exploration did to this seat's decisions (absent when the game did not explore)
        final mtgtable.ai.Explorer ex = controller == null ? null : controller.explorer();
        if (ex != null) {
            final mtgtable.ai.ExploreMath m = ex.math();
            o.key("explore").obj().n("decisionsRandomised", (long) m.randomised()).n("changed", (long) m.changed())
                    .n("closeCalls", (long) m.closeCalls()).n("closeCallsChanged", (long) m.closeCallsChanged())
                    .n("coins", (long) m.coins()).n("failures", (long) m.failures());
            o.key("byKind").obj();
            for (final Map.Entry<String, int[]> e : m.byKind().entrySet()) {
                o.n(e.getKey(), (long) e.getValue()[0]);
            }
            o.end();
            if (m.config().random) {
                // D458 (protocol M71): the random seat's guardrail counts, so the atlas reads them back from the log
                o.key("guardrails").obj();
                for (final Map.Entry<String, Integer> e : m.guardrails().entrySet()) {
                    o.n(e.getKey(), (long) e.getValue());
                }
                o.end();
            }
            o.end();
        }
        log.ai("decisions", o.end().done());
    }

    /** The game thread threw: D115's error notice and M11's null {@code over}.  Game thread only. */
    public void crashed() {
        gui.engineCrashed();
    }

    /** {@code state} frames written. */
    public int frames() {
        return gui.frames();
    }

    /** Snapshots that threw (each printed to stderr); non-zero means the log is incomplete. */
    public int errors() {
        return gui.errors();
    }

    /** Event batches that reached this recorder off the game thread and were held for it (D355). */
    public int offThreadBatches() {
        return gui.offThreadBatches();
    }

    /** Bytes on disk; accurate after {@link #close}. */
    public long bytes() {
        return log.bytes();
    }

    public File file() {
        return log.file();
    }

    @Override
    public void close() throws IOException {
        log.close();
    }

    /** {@link RecordMatch}'s session header (protocol section 8.1), plus the caller's {@code lab} block. */
    private static String header(final String gameId, final long seed, final String forgeJarSha,
                                 final PlayerView viewer, final List<PlayerView> players, final List<Seat> seats,
                                 final String block, final Map<String, Object> extra,
                                 final Map<String, Object> playExplore) {
        final JsonOut o = new JsonOut().obj();
        o.n("v", GameLog.PROTOCOL_VERSION);
        o.n("kind", "session");
        o.n("gameId", gameId);
        o.n("startedAt", Instant.now().toString());
        o.n("seed", seed);
        o.n("forgeVersion", BuildInfo.getVersionString());
        o.n("forgeJarSha256", forgeJarSha);
        o.n("seat", viewer.getId());
        o.key("decks").arr();
        for (int i = 0; i < players.size(); i++) {
            final boolean isViewer = players.get(i).getId() == viewer.getId();
            final Seat s = seats.get(i);
            o.obj();
            o.n("player", players.get(i).getId());
            o.n("path", isViewer ? s.deckPath : null);
            o.n("sha256", isViewer && s.deckFile != null ? RecordMatch.sha256(s.deckFile) : null);
            o.n("cards", s.deck.getMain().countAll());
            o.end();
        }
        o.end();
        // D347: who played each seat -- the profile and the policy -- so datasets can stratify by style.
        o.key("seats").arr();
        for (int i = 0; i < players.size(); i++) {
            final Seat s = seats.get(i);
            o.obj().n("player", players.get(i).getId()).n("kind", "ai").n("profile", s.profile)
                    .n("policy", s.policy);
            if (s.search != null) {
                o.n("search", s.search);
            }
            o.end();
        }
        o.end();
        if (extra != null && !extra.isEmpty()) {
            o.key(block).obj();
            for (final Map.Entry<String, Object> e : extra.entrySet()) {
                final Object v = e.getValue();
                if (v == null) {
                    o.nNull(e.getKey());
                } else if (v instanceof Number) {
                    o.n(e.getKey(), ((Number) v).longValue());
                } else {
                    o.n(e.getKey(), v.toString());
                }
            }
            o.end();
        }
        if (playExplore != null) {
            // D358: this game explored -- its settings and seed; the counts are in each seat's `decisions` line
            o.key("playExplore").obj();
            for (final Map.Entry<String, Object> e : playExplore.entrySet()) {
                final Object v = e.getValue();
                if (v instanceof Double || v instanceof Float) {
                    o.n(e.getKey(), ((Number) v).doubleValue());
                } else if (v instanceof Number) {
                    o.n(e.getKey(), ((Number) v).longValue());
                } else if (v instanceof Boolean) {
                    o.n(e.getKey(), (boolean) (Boolean) v);
                } else if (v == null) {
                    o.nNull(e.getKey());
                } else {
                    o.n(e.getKey(), v.toString());
                }
            }
            o.end();
        }
        return o.end().done();
    }

    /** {@link RecordMatch}'s {@code hello_ok} with its match block (amendments M44, M47). */
    private static String helloOk(final String gameId, final long seed, final String forgeJarSha, final int seat,
                                  final PlayerView viewer, final List<PlayerView> players, final List<Seat> seats) {
        final int other = seat == 0 ? 1 : 0;
        final Seat me = seats.get(seat);
        final Seat them = seats.get(other);
        final JsonOut o = new JsonOut().obj();
        o.n("gameId", gameId);
        o.n("you", viewer.getId());
        o.n("seed", seed);
        o.n("forgeVersion", BuildInfo.getVersionString());
        o.n("forgeJarSha256", forgeJarSha);
        o.key("unsupportedCards").arr();
        for (final String s : RecordMatch.unsupported(me.deck)) {   // the viewer's own deck only
            o.v(s);
        }
        o.end();
        o.key("players").arr();
        for (final PlayerView p : players) {
            o.obj().n("id", p.getId()).n("name", p.getName()).n("isAi", p.isAI()).end();
        }
        o.end();
        o.key("match").obj();
        o.key("yourDeck").obj().n("name", me.deckName).n("path", me.deckPath)
                .n("cards", me.deck.getMain().countAll()).end();
        // NAME AND COUNT ONLY, as RecordMatch's: tools/check-redaction.mjs fails any other key.
        o.key("aiDeck").obj().n("name", them.deckName).n("cards", them.deck.getMain().countAll()).end();
        o.n("aiProfile", them.profile);
        o.n("games", 1);
        o.n("yourProfile", me.profile);
        o.end();
        return o.end().done();
    }
}
