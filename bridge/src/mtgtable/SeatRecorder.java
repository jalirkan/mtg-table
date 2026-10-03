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

import forge.deck.Deck;
import forge.game.Game;
import forge.game.GameView;
import forge.game.player.PlayerView;
import forge.gui.control.GameEventForwarder;
import forge.trackable.TrackableCollection;
import forge.util.BuildInfo;

import mtgtable.Json.JsonOut;

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
 */
public final class SeatRecorder implements AutoCloseable {

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

        public Seat(final String deckName, final File deckFile, final String deckPath, final Deck deck,
                    final String profile) {
            this.deckName = deckName;
            this.deckFile = deckFile;
            this.deckPath = deckPath;
            this.deck = deck;
            this.profile = profile;
        }
    }

    private final GameLog log;
    private final RecordMatch.SpectatorGui gui;
    private final GameEventForwarder forwarder;

    private SeatRecorder(final GameLog log, final RecordMatch.SpectatorGui gui, final GameEventForwarder forwarder) {
        this.log = log;
        this.gui = gui;
        this.forwarder = forwarder;
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
        log.header(header(gameId, seed, forgeJarSha, viewer, players, seats, extra));
        final RecordMatch.SpectatorGui gui = new RecordMatch.SpectatorGui(gameId, gameView, viewer, log, false);
        gui.setGameView(null);      // HostedMatch's own two-step, as RecordMatch does
        gui.setGameView(gameView);
        gui.openView(new TrackableCollection<>(viewer));
        log.s2c("hello_ok", helloOk(gameId, seed, forgeJarSha, seat, viewer, players, seats));
        final GameEventForwarder forwarder = new GameEventForwarder(gui);
        game.subscribeToEvents(forwarder);
        // After its own forwarder, on purpose: RecordMatch's class javadoc.
        game.subscribeToEvents(new RecordMatch.BoundaryFlusher(forwarder, gui, 0L));
        return new SeatRecorder(log, gui, forwarder);
    }

    /** The game ended: the last batch, a final snapshot and {@code over}.  Game thread only. */
    public void finish() {
        forwarder.flush();
        gui.snapshot(List.of());
        gui.emitOver();
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
                                 final Map<String, Object> extra) {
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
        if (extra != null && !extra.isEmpty()) {
            o.key("lab").obj();
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
