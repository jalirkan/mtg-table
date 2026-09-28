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
 * The subscriber-registration pattern in start() follows Forge's own
 * HostedMatch.startGame (Card Forge project, GPL-3.0-or-later), lines ~227-233
 * and ~245-257 of forge-gui/src/main/java/forge/gamemodes/match/HostedMatch.java.
 */
package mtgtable;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import com.google.common.eventbus.Subscribe;

import forge.LobbyPlayer;
import forge.deck.CardPool;
import forge.deck.Deck;
import forge.deck.io.DeckSerializer;
import forge.game.Game;
import forge.game.GameEndReason;
import forge.game.GameEntityView;
import forge.game.GameRules;
import forge.game.GameType;
import forge.game.GameView;
import forge.game.Match;
import forge.game.card.CardView;
import forge.game.event.GameEvent;
import forge.game.event.GameEventCardStatsChanged;
import forge.game.event.GameEventGameOutcome;
import forge.game.event.GameEventPlayerPriority;
import forge.game.event.GameEventPlayerStatsChanged;
import forge.game.event.GameEventTurnBegan;
import forge.game.event.GameEventTurnEnded;
import forge.game.event.GameEventTurnPhase;
import forge.game.phase.PhaseType;
import forge.game.player.DelayedReveal;
import forge.game.player.IHasIcon;
import forge.game.player.PlayerView;
import forge.game.player.RegisteredPlayer;
import forge.game.spellability.SpellAbilityView;
import forge.game.zone.ZoneType;
import forge.gui.control.GameEventForwarder;
import forge.item.PaperCard;
import forge.localinstance.skin.FSkinProp;
import forge.model.FModel;
import forge.player.PlayerZoneUpdate;
import forge.player.PlayerZoneUpdates;
import forge.trackable.TrackableCollection;
import forge.util.BuildInfo;
import forge.util.FSerializableFunction;
import forge.util.ITriggerEvent;
import forge.util.MyRandom;

import mtgtable.Json.JsonOut;

/**
 * M1: record an AI-vs-AI game to a JSONL frame log.
 *
 * <pre>
 *   ./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck \
 *       --seed 42 --out fixtures/games/g1.jsonl
 * </pre>
 *
 * <h2>Spectating (protocol amendment M47, {@code scripts/spectate.sh})</h2>
 *
 * <pre>
 *   ./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck \
 *       --ai-deck decks/doom-legion.dck --profile Default --ai-profile Reckless \
 *       --seed 7 --seat 0 --pace 600 --out var/spectate/pacho-shield-vs-doom-legion-7.jsonl
 * </pre>
 *
 * <ul>
 *   <li>{@code --profile} is seat 0's AI profile (the {@code --deck} seat) and
 *       {@code --ai-profile} (alias {@code --profile2}) seat 1's (the
 *       {@code --deck2} / {@code --ai-deck} seat) -- tied to the DECK, never to
 *       {@code --seat}, so switching the viewpoint of a seed records the same
 *       game from the other side.  Both are validated against the {@code .ai}
 *       files before the engine boots and seated through
 *       {@link Bootstrap#createAiPlayer} (D107); {@code Default} when absent.</li>
 *   <li>{@code --match} writes {@code hello_ok.match} (amendment M44's block,
 *       plus M47's {@code yourProfile}); either profile flag implies it.
 *       Without any of the three the recording is byte-for-byte what it was
 *       before M47, which is what gate step 6's value-level diff against
 *       {@code fixtures/games/g1.jsonl} needs (the M41 precedent: an optional
 *       key omitted when nobody asked keeps a fresh recording comparable).</li>
 *   <li>{@code --pace <ms>} makes the ENGINE play at a watchable pace: an
 *       AI-vs-AI game is over in about 3.5 s of wall time, so a browser
 *       following the file (the replay's follow mode) would have nothing to
 *       follow.  See {@link BoundaryFlusher} for where the dwell goes and why
 *       it cannot change the game.</li>
 * </ul>
 *
 * <p>Two AI seats play a full game; the log is written <b>from seat 0's point of
 * view</b>, i.e. every card in it passed {@code CardView.canBeShownTo(seat 0)}.
 * That makes the file a committed golden fixture the browser can replay with no
 * JVM running, and makes it safe to paste into a bug report.
 *
 * <h2>How the snapshots are timed</h2>
 *
 * Reports 01/02 suggest snapshotting in {@code updateCards} / {@code updateZones}.
 * Those arrive on the <b>EDT</b>, and the Forge view graph may only be walked on
 * the game thread.  {@code HostedMatch} only registers the game-thread-safe
 * {@link GameEventForwarder} when the GUI is a {@code RemoteClientGuiGame}; a
 * plain {@code AbstractGuiGame} gets {@code FControlGameEventHandler}, which
 * hops to the EDT.  So the forwarder is registered by hand here, and
 * {@link SpectatorGui#handleGameEvents} -- which the forwarder calls
 * synchronously, on the game thread -- is the only place a snapshot is built.
 *
 * <p>The forwarder also gives free coalescing: it batches and flushes at 50
 * events, at 500 ms, and whenever an {@code InputQueue} changes.  <b>There is no
 * InputQueue in an AI-vs-AI game</b> (that observer only exists for human
 * seats), which would leave a whole turn collapsed into one frame, so
 * {@link BoundaryFlusher} adds the missing trigger: flush at every phase
 * change, turn start and outcome.  It is registered <em>after</em> the
 * forwarder, and Guava's {@code EventBus} dispatches to subscribers in
 * registration order, so the boundary event is already in the batch it flushes.
 */
public final class RecordMatch {

    private RecordMatch() { }

    /** Give up rather than hang forever if the engine wedges. */
    private static final long GAME_TIMEOUT_SEC = 600L;

    // ==================================================================
    // main
    // ==================================================================

    public static void main(final String[] args) {
        final long t0 = System.nanoTime();
        final Watcher outWatch = install(true);
        final Watcher errWatch = install(false);
        int exit = 0;
        try {
            run(args, t0, outWatch, errWatch);
        } catch (final Throwable e) {
            System.out.flush();
            System.err.println("RECORD FAILED: " + e);
            e.printStackTrace();
            exit = 1;
        }
        System.out.flush();
        System.err.flush();
        // Forge leaves daemon pools behind; do not wait for them.
        System.exit(exit);
    }

    private static void run(final String[] args, final long t0,
                            final Watcher outWatch, final Watcher errWatch) throws Exception {
        final Args a = Args.parse(args);
        final Config cfg = Config.load();
        final File deck1File = resolve(cfg, a.deck != null ? a.deck : cfg.deck().getPath());
        final File deck2File = a.deck2 == null ? deck1File : resolve(cfg, a.deck2);
        final File outFile = resolve(cfg, a.out);
        // Amendment M47 (spectating).  Validated against the .ai files BEFORE
        // the engine boots, exactly as MtgTable's --ai-profile is (M44, D107):
        // a typo costs a second, not FModel.initialize.  Never empty -- see
        // Bootstrap.createAiPlayer for the branch that saves prefs.
        final List<String> profiles = List.of(
                Bootstrap.resolveAiProfile(cfg.forgeHomeDir(), a.profile, "--profile"),
                Bootstrap.resolveAiProfile(cfg.forgeHomeDir(), a.profile2, "--ai-profile"));

        System.out.println("== mtg-table M1 recorder ==");
        System.out.println("deck (seat 0) = " + deck1File);
        System.out.println("deck (seat 1) = " + deck2File);
        System.out.println("profiles      = seat 0 " + profiles.get(0) + ", seat 1 " + profiles.get(1)
                + (a.profile == null && a.profile2 == null ? "  (the default; --profile / --ai-profile "
                        + String.join("|", Bootstrap.aiProfiles(cfg.forgeHomeDir())) + ")" : ""));
        System.out.println("seed          = " + a.seed);
        System.out.println("seat          = " + a.seat);
        System.out.println("match block   = " + (a.writeMatch() ? "yes (hello_ok.match, amendment M47)" : "no"));
        System.out.println("pace          = " + (a.paceMs > 0 ? a.paceMs + " ms a frame (" + (a.paceMs / 4)
                + " ms for a frame that only moved the phase strip)" : "none (engine speed)"));
        System.out.println("out           = " + outFile);

        // ------------------------------------------------------------------
        // 1. GuiBase FIRST.  ForgeConstants' static initializer calls
        //    GuiBase.getInterface().getAssetsDir(); anything earlier dies with
        //    ExceptionInInitializerError.  Never forge.GuiDesktop: headless.
        // ------------------------------------------------------------------
        Bootstrap.installGui(cfg.forgeHomeDir());

        // The one shared boot sequence: FModel.initialize plus the preference
        // decisions D13 (UI_SELECT_FROM_CARD_DISPLAYS false) and D14 (the card
        // overlay's prerequisites).  Smoke is where they are proved; a recorder
        // that booted differently would record a different game.
        final long initMs = Bootstrap.initializeModel(false);
        System.out.println("FModel.initialize took " + initMs + " ms");
        System.out.println("custom cards  = " + Bootstrap.customCardCount() + " overlay script(s)");

        // ------------------------------------------------------------------
        // 2. Seed.  After FModel.initialize (which consumes randomness of its
        //    own), before anything shuffles -- the order SimulateMatch uses
        //    (SimulateMatch.java:40 initialize, :89 setRandom).
        //    docs/protocol.md section 8.5: this makes a re-run plausible, NOT
        //    byte-identical.  Thread interleaving is not deterministic.
        // ------------------------------------------------------------------
        MyRandom.setRandom(new Random(a.seed));

        // ------------------------------------------------------------------
        // 3. Decks.  DeckSerializer.fromFile ONLY -- FModel.getDecks() reaches
        //    DeckStorage.adjustFileLocation, which renames and moves the user's
        //    .dck files and deletes unparseable ones.
        // ------------------------------------------------------------------
        final Deck deck1 = deck(deck1File);
        final Deck deck2 = deck(deck2File);
        System.out.println("deck 0 = " + deck1.getName() + " (" + deck1.getMain().countAll() + " cards)");
        System.out.println("deck 1 = " + deck2.getName() + " (" + deck2.getMain().countAll() + " cards)");
        final List<Deck> decks = List.of(deck1, deck2);
        final List<File> deckFiles = List.of(deck1File, deck2File);
        // Both decks for the operator's console; the viewing seat's alone for
        // anything that reaches the log (see helloOk).
        final List<String> unsupported = unsupported(deck1, deck2);
        System.out.println("cards Forge would silently drop = "
                + (unsupported.isEmpty() ? "none" : unsupported.toString()));

        // ------------------------------------------------------------------
        // 4. Two AI seats.
        // ------------------------------------------------------------------
        final GameRules rules = new GameRules(GameType.Constructed);
        rules.setAppliedVariants(EnumSet.of(GameType.Constructed));
        // One game, and there is no `--games` here on purpose (M5).  More than
        // one game per match is what makes Forge call `sideboard` at all, but
        // the call site is `PlayerControllerHuman.sideboard` and both seats here
        // are AI -- `PlayerControllerAi` answers it without the gui.  The probe
        // for that kind is `MtgTable --games 2`, and even there the session ends
        // at the first `over`: docs/evidence/m5-probes.md section 5.
        rules.setGamesPerMatch(1);

        final List<RegisteredPlayer> seats = new ArrayList<>();
        // Each seat's profile belongs to its DECK (seat 0 = --deck, seat 1 =
        // --deck2), never to --seat: the viewpoint is a redaction choice and must
        // not change who plays what (amendment M47).
        final RegisteredPlayer p0 = new RegisteredPlayer(deck1);
        p0.setPlayer(Bootstrap.createAiPlayer("AI-Seat0", 0, profiles.get(0)));
        seats.add(p0);
        final RegisteredPlayer p1 = new RegisteredPlayer(deck2);
        p1.setPlayer(Bootstrap.createAiPlayer("AI-Seat1", 1, profiles.get(1)));
        seats.add(p1);

        final Match match = new Match(rules, seats, "mtg-table");
        final Game game = match.createGame();
        final GameView gameView = game.getView();

        final List<PlayerView> playerViews = new ArrayList<>();
        for (final PlayerView pv : gameView.getPlayers()) {
            playerViews.add(pv);
        }
        if (a.seat < 0 || a.seat >= playerViews.size()) {
            throw new IllegalArgumentException("--seat " + a.seat + " but the game has "
                    + playerViews.size() + " players");
        }
        final PlayerView viewer = playerViews.get(a.seat);
        System.out.println("viewer        = seat " + a.seat + " -> player id " + viewer.getId()
                + " (" + viewer.getName() + ")");

        // ------------------------------------------------------------------
        // 5. Log + header.
        // ------------------------------------------------------------------
        final String gameId = gameId(outFile);
        final GameLog log = new GameLog(outFile);
        log.header(sessionHeader(cfg, gameId, a, viewer, playerViews, decks, deckFiles));

        // ------------------------------------------------------------------
        // 6. The GUI seam.  Nothing in an AI-vs-AI game calls any IGuiGame
        //    method by itself -- only our own forwarder does -- so a single
        //    UNIMPL line in this run is real news.
        // ------------------------------------------------------------------
        final SpectatorGui gui = new SpectatorGui(gameId, gameView, viewer, log, a.paceMs > 0);
        gui.setGameView(null);      // HostedMatch's own two-step: clear, then set
        gui.setGameView(gameView);
        gui.openView(new TrackableCollection<>(viewer));

        log.s2c("hello_ok", helloOk(cfg, gameId, a, viewer, playerViews,
                                    unsupported(decks.get(a.seat)), decks, deckFiles, profiles));

        final GameEventForwarder forwarder = new GameEventForwarder(gui);
        game.subscribeToEvents(forwarder);
        // Registered second, on purpose: see the class javadoc.
        final BoundaryFlusher flusher = new BoundaryFlusher(forwarder, gui, a.paceMs);
        game.subscribeToEvents(flusher);

        // ------------------------------------------------------------------
        // 7. Run the game on a real Forge game thread.
        //    Smoke runs match.startGame on main, which is fine when nothing
        //    snapshots -- but ThreadUtil.isGameThread() is a
        //    getName().startsWith("Game") test, so Snap.state()'s assert would
        //    fire on main.  GameAction.invoke dispatches to Forge's own "Game"
        //    pool, exactly as HostedMatch does.
        // ------------------------------------------------------------------
        final CountDownLatch done = new CountDownLatch(1);
        final Throwable[] gameFailure = new Throwable[1];
        final long tGame = System.nanoTime();
        game.getAction().invoke(() -> {
            try {
                match.startGame(game);
                // Still on the game thread: drain whatever the last flush left
                // behind, then emit a final snapshot and the `over` frame.
                forwarder.flush();
                gui.snapshot(List.of());
                gui.emitOver();
            } catch (final Throwable t) {
                gameFailure[0] = t;
                // D115: the log must not simply stop at `hello_ok`.  Mark it
                // the way MtgTable does -- an error notice in our own words
                // (the engine's names a card) and amendment M11's null `over`
                // -- so the file ends in its terminal frame and says why.
                gui.engineCrashed();
            } finally {
                done.countDown();
            }
        });

        // A paced game is SUPPOSED to take minutes: allow 3,000 dwells on top of
        // the engine's own cap (the longest committed game is 605 frames).
        final long timeoutSec = GAME_TIMEOUT_SEC + (a.paceMs * 3_000L) / 1_000L;
        final boolean finished = done.await(timeoutSec, TimeUnit.SECONDS);
        final long gameMs = ms(tGame);
        if (!finished) {
            game.setGameOver(GameEndReason.Draw);
            throw new IllegalStateException("game did not finish within " + timeoutSec + "s");
        }
        if (gameFailure[0] != null) {
            log.close();                       // flush the notice + `over` before exit(1)
            System.err.println("ENGINE CRASHED: " + EngineCrash.describe(gameFailure[0]));
            throw new IllegalStateException("the game thread threw (D115)", gameFailure[0]);
        }

        log.close();

        // ------------------------------------------------------------------
        // 8. Summary.
        // ------------------------------------------------------------------
        final forge.game.GameOutcome outcome = game.getOutcome();
        final String winner = outcome == null ? "(none)"
                : outcome.isDraw() || outcome.getWinningLobbyPlayer() == null
                    ? "(draw)" : outcome.getWinningLobbyPlayer().getName();
        final int turns = game.getPhaseHandler().getTurn();

        // Stop the line watchers BEFORE printing the summary: the summary names
        // the needles ("UNIMPL", "unsupported") and would otherwise match itself.
        outWatch.stop();
        errWatch.stop();

        System.out.println();
        System.out.println("== summary ==");
        System.out.println("file           = " + outFile);
        System.out.println("frames         = " + gui.frames() + " state + "
                + (log.lines() - 1 - gui.frames()) + " other = " + (log.lines() - 1)
                + " (plus 1 session header line)");
        System.out.println("bytes          = " + log.bytes()
                + " (" + String.format(Locale.ROOT, "%.2f", log.bytes() / 1048576.0) + " MiB)");
        System.out.println("bytes/frame    = "
                + (log.lines() > 1 ? log.bytes() / (log.lines() - 1) : 0));
        System.out.println("player turns   = " + turns + " (round " + ((turns + 1) / 2) + ")");
        System.out.println("winner         = " + winner
                + (outcome == null ? "" : ", reason = " + outcome.getWinCondition()));
        System.out.println("game wall time = " + gameMs + " ms");
        if (a.paceMs > 0) {
            System.out.println("paced dwell    = " + flusher.dwells() + " dwell(s), " + flusher.dwellMs()
                    + " ms asleep (--pace " + a.paceMs + ")");
        }
        System.out.println("total wall     = " + ms(t0) + " ms");
        System.out.println("snapshot errors= " + gui.errors());
        // protocol.md 3.6: an event missing an id the protocol declares non-null
        // is dropped rather than emitted as a null.  Zero is the expected value;
        // a non-zero count means Forge handed us an event with no subject.
        System.out.println("events dropped = " + Snap.incompleteEventsDropped()
                + " (missing a required id)");
        // Report 06 S5: CardView.canBeShownTo is fail-open for a null zone, so
        // a card serialised without one is worth knowing about even though
        // Snap's own zone hint has already made the redaction decision.
        System.out.println("unzoned cards  = " + Snap.unzonedCards()
                + " (a CardView with no ZoneType)");
        System.out.println("UNIMPL members = "
                + (gui.unimplemented().isEmpty() ? "none" : gui.unimplemented().toString()));
        System.out.println("unsupported    = " + (unsupported.isEmpty() ? "none" : unsupported.toString()));

        report(outWatch, errWatch);

        if (gui.errors() > 0) {
            throw new IllegalStateException(gui.errors() + " snapshot(s) failed -- the log is incomplete");
        }
        System.out.println("RECORD OK");
    }

    // ==================================================================
    // The GUI seam
    // ==================================================================

    /**
     * A spectator {@code IGuiGame}.
     *
     * <p>It exists for one reason: {@link GameEventForwarder}'s constructor
     * takes an {@code IGuiGame} and calls {@code handleGameEvents} on it.
     * {@link #handleGameEvents} is the snapshot hook -- and the <b>only</b>
     * method here that does anything.
     *
     * <p>The other 36 members of {@code IGuiGame} that {@code AbstractGuiGame}
     * leaves abstract are safe no-op / null / identity defaults that log
     * {@code UNIMPL <name>} to stderr once per name.  They must never throw: a
     * game that degrades is debuggable, a game that dead-ends is not, and the
     * UNIMPL list is the M2/M5 worklist (the M5 exit criterion is ten games
     * with zero UNIMPL lines).  In an AI-vs-AI recording none of them should
     * fire at all, because no {@code PlayerControllerHuman} exists to call them.
     */
    static final class SpectatorGui extends forge.gamemodes.match.AbstractGuiGame {

        private final String gameId;
        private final GameView gameView;
        private final PlayerView viewer;
        private final GameLog log;
        private final Set<String> unimpl = new LinkedHashSet<>();
        private final AtomicInteger frames = new AtomicInteger();
        private final AtomicInteger errors = new AtomicInteger();
        private boolean overEmitted;
        /**
         * Did the last {@code state} frame only move the phase strip?  Written
         * and read on the game thread alone ({@link #snapshot} and
         * {@link BoundaryFlusher#receive}); {@code true} before the first frame,
         * because the frame before it is {@code hello_ok}.
         */
        private boolean lastFrameQuiet = true;
        /**
         * {@code --pace} is on.  An unpaced run executes exactly the game-thread
         * code the recorder ran before M47 -- not even {@link #quiet}'s
         * {@code instanceof} tests, whose first execution loads classes on the
         * game thread.  A discipline rather than a proof: the one ordering in
         * this file that moves with unrelated code -- the ids inside a
         * {@code stats} event, a hash-set iteration inside Forge over objects
         * with identity hash codes -- moved when this branch added work to the
         * main thread before {@code FModel.initialize} (the new summary lines
         * above: three runs of three; the profile validation alone: one of
         * three), and a build with every other M47 change and neither of those
         * matched the committed fixture three times of three
         * (docs/evidence/spectate.md, section D).  Gate step 6 now compares
         * those ids as a set (decision D121).
         */
        private final boolean paced;

        SpectatorGui(final String gameId, final GameView gameView,
                     final PlayerView viewer, final GameLog log, final boolean paced) {
            this.gameId = gameId;
            this.gameView = gameView;
            this.viewer = viewer;
            this.log = log;
            this.paced = paced;
        }

        int frames() {
            return frames.get();
        }

        int errors() {
            return errors.get();
        }

        Collection<String> unimplemented() {
            return unimpl;
        }

        /**
         * THE snapshot hook.  Called by {@link GameEventForwarder} on the
         * <b>game thread</b>, once per flush, with the batch of events the
         * snapshot already reflects.
         */
        @Override
        public void handleGameEvents(final List<GameEvent> events) {
            snapshot(events);
        }

        /** Build and log one {@code state} frame.  Game thread only. */
        void snapshot(final List<GameEvent> events) {
            if (paced) {
                lastFrameQuiet = quiet(events);
            }
            try {
                log.s2c("state", Snap.state(gameId, gameView, viewer, events));
                frames.incrementAndGet();
            } catch (final RuntimeException e) {
                // Guava's EventBus swallows subscriber exceptions into
                // java.util.logging, so a broken Snap would silently produce an
                // empty file.  Count it and shout.
                errors.incrementAndGet();
                System.err.println("SNAPSHOT FAILED: " + e);
                e.printStackTrace();
            }
        }

        /**
         * D115: the game thread threw.  An error notice and a null {@code over}
         * (amendment M11's shape), unless {@code over} is already out.
         */
        void engineCrashed() {
            if (overEmitted) {
                return;
            }
            overEmitted = true;
            try {
                log.s2c("notice", new JsonOut().obj().n("level", "error").n("title", "Engine error")
                        .n("text", "The rules engine stopped with an error, so this game cannot continue. "
                                + "The recorder's log has the details.").end().done());
                log.s2c("over", new JsonOut().obj().nNull("winner").nNull("reason").n("matchOver", true)
                        .end().done());
            } catch (final RuntimeException e) {
                errors.incrementAndGet();
                System.err.println("CRASH FRAMES FAILED: " + e);
            }
        }

        boolean lastFrameQuiet() {
            return lastFrameQuiet;
        }

        /**
         * A batch that only moves the phase strip: every event in it is a phase,
         * a turn boundary, a priority pass or a recomputed stat -- the frame shows
         * a new phase and nothing else happened.  Anything else (a cast, a land,
         * a tap, an attack, damage, a zone change) is something to watch.  Used
         * only to choose how long {@link BoundaryFlusher} dwells after the frame,
         * never to decide what is written.
         */
        static boolean quiet(final List<GameEvent> events) {
            for (final GameEvent e : events) {
                if (!(e instanceof GameEventTurnPhase || e instanceof GameEventTurnBegan
                        || e instanceof GameEventTurnEnded || e instanceof GameEventCardStatsChanged
                        || e instanceof GameEventPlayerPriority || e instanceof GameEventPlayerStatsChanged)) {
                    return false;
                }
            }
            return true;
        }

        /** Emit the final {@code over} frame.  Game thread only, once. */
        void emitOver() {
            if (overEmitted) {
                return;
            }
            overEmitted = true;
            try {
                log.s2c("over", Snap.over(gameView));
            } catch (final RuntimeException e) {
                errors.incrementAndGet();
                System.err.println("OVER FRAME FAILED: " + e);
                e.printStackTrace();
            }
        }

        private void unimpl(final String name) {
            if (unimpl.add(name)) {
                System.err.println("UNIMPL " + name);
            }
        }

        // -------- the 36, plus AbstractGuiGame's own updateCurrentPlayer --------

        @Override protected void updateCurrentPlayer(final PlayerView player) { }

        @Override public void openView(final TrackableCollection<PlayerView> myPlayers) { }

        @Override public void showCombat() { unimpl("showCombat"); }

        @Override public void showPromptMessage(final PlayerView p, final String message, final CardView card) {
            unimpl("showPromptMessage");
        }

        @Override public void updateButtons(final PlayerView owner, final String label1, final String label2,
                                            final boolean enable1, final boolean enable2, final boolean focus1) {
            unimpl("updateButtons");
        }

        @Override public void flashIncorrectAction() { unimpl("flashIncorrectAction"); }

        @Override public void alertUser() { unimpl("alertUser"); }

        @Override public void enableOverlay() { unimpl("enableOverlay"); }

        @Override public void disableOverlay() { unimpl("disableOverlay"); }

        @Override public void finishGame() { unimpl("finishGame"); }

        @Override public void showManaPool(final PlayerView player) { unimpl("showManaPool"); }

        @Override public void hideManaPool(final PlayerView player) { unimpl("hideManaPool"); }

        @Override public void updateShards(final Iterable<PlayerView> shards) { unimpl("updateShards"); }

        @Override public void setPanelSelection(final CardView hostCard) { unimpl("setPanelSelection"); }

        @Override public void setCard(final CardView card) { unimpl("setCard"); }

        @Override public void setPlayerAvatar(final LobbyPlayer player, final IHasIcon ihi) {
            unimpl("setPlayerAvatar");
        }

        @Override public void message(final String message, final String title) {
            unimpl("message");
            System.err.println("  notice: " + title + ": " + message);
        }

        @Override public void showErrorDialog(final String message, final String title) {
            unimpl("showErrorDialog");
            System.err.println("  error: " + title + ": " + message);
        }

        @Override public forge.game.GameState getGamestate() {
            unimpl("getGamestate");
            return null;
        }

        @Override public boolean isUiSetToSkipPhase(final PlayerView player, final PhaseType phase) {
            // Never skip: a recording wants every phase.
            return false;
        }

        // ---- blocking questions.  Every one returns a documented safe default
        // ---- (docs/protocol.md section 5.2) rather than throwing.

        @Override public SpellAbilityView getAbilityToPlay(final CardView host,
                                                           final List<SpellAbilityView> abilities,
                                                           final ITriggerEvent triggerEvent) {
            unimpl("getAbilityToPlay");
            return null;                       // "no ability chosen"
        }

        @Override public Map<CardView, Integer> assignCombatDamage(final CardView attacker,
                final List<CardView> blockers, final int damage, final GameEntityView defender,
                final boolean overrideOrder, final boolean maySkip) {
            unimpl("assignCombatDamage");
            return null;                       // PlayerControllerHuman.java:302 handles null
        }

        @Override public Map<Object, Integer> assignGenericAmount(final CardView effectSource,
                final Map<Object, Integer> targets, final int amount,
                final boolean atLeastOne, final String amountLabel) {
            unimpl("assignGenericAmount");
            return null;
        }

        @Override public boolean confirm(final CardView c, final String question,
                                         final boolean defaultIsYes, final List<String> options) {
            unimpl("confirm");
            return defaultIsYes;
        }

        @Override public boolean showConfirmDialog(final String message, final String title,
                final String yesButtonText, final String noButtonText, final boolean defaultYes) {
            unimpl("showConfirmDialog");
            return defaultYes;
        }

        @Override public int showOptionDialog(final String message, final String title, final FSkinProp icon,
                                              final List<String> options, final int defaultOption) {
            unimpl("showOptionDialog");
            return defaultOption;
        }

        @Override public String showInputDialog(final String message, final String title, final FSkinProp icon,
                final String initialInput, final List<String> inputOptions, final boolean isNumeric) {
            unimpl("showInputDialog");
            return initialInput;
        }

        @Override public <T> List<T> getChoices(final String message, final int min, final int max,
                final List<T> choices, final List<T> selected, final FSerializableFunction<T, String> display) {
            unimpl("getChoices");
            // Identity: accept whatever the engine pre-selected, topped up from
            // the head of the list if it insisted on a minimum.
            final List<T> out = new ArrayList<>(selected == null ? List.<T>of() : selected);
            if (choices != null) {
                for (int i = 0; out.size() < min && i < choices.size(); i++) {
                    if (!out.contains(choices.get(i))) {
                        out.add(choices.get(i));
                    }
                }
            }
            return out;
        }

        @Override public <T> OrderResult<T> order(final String title, final String top,
                final int remainingObjectsMin, final int remainingObjectsMax,
                final List<T> sourceChoices, final List<T> destChoices,
                final CardView referenceCard, final boolean sideboardingMode, final boolean rememberOption) {
            unimpl("order");
            // Keep the engine's proposed order.
            return new OrderResult<>(destChoices == null ? new ArrayList<>() : new ArrayList<>(destChoices),
                                     false);
        }

        @Override public GameEntityView chooseSingleEntityForEffect(final String title,
                final List<? extends GameEntityView> optionList, final DelayedReveal delayedReveal,
                final boolean isOptional) {
            unimpl("chooseSingleEntityForEffect");
            return optionList == null || optionList.isEmpty() ? null : optionList.get(0);
        }

        @Override public List<GameEntityView> chooseEntitiesForEffect(final String title,
                final List<? extends GameEntityView> optionList, final int min, final int max,
                final DelayedReveal delayedReveal) {
            unimpl("chooseEntitiesForEffect");
            final List<GameEntityView> out = new ArrayList<>();
            if (optionList != null) {
                for (int i = 0; i < min && i < optionList.size(); i++) {
                    out.add(optionList.get(i));
                }
            }
            return out;
        }

        @Override public List<CardView> manipulateCardList(final String title, final Iterable<CardView> cards,
                final Iterable<CardView> manipulable, final boolean toTop, final boolean toBottom,
                final boolean toAnywhere) {
            unimpl("manipulateCardList");
            final List<CardView> out = new ArrayList<>();
            if (cards != null) {
                for (final CardView c : cards) {
                    out.add(c);
                }
            }
            return out;                        // unchanged order
        }

        @Override public List<PaperCard> sideboard(final CardPool sideboard, final CardPool main,
                                                   final String message) {
            unimpl("sideboard");
            return null;                       // "no sideboarding"
        }

        @Override public PlayerZoneUpdates openZones(final PlayerView controller,
                final Collection<ZoneType> zones, final Map<PlayerView, Object> players,
                final boolean backupLastZones) {
            unimpl("openZones");
            return new PlayerZoneUpdates();
        }

        @Override public void restoreOldZones(final PlayerView playerView, final PlayerZoneUpdates zonesToRestore) {
            unimpl("restoreOldZones");
        }

        @Override public Iterable<PlayerZoneUpdate> tempShowZones(final PlayerView controller,
                final Iterable<PlayerZoneUpdate> zonesToUpdate) {
            unimpl("tempShowZones");
            return zonesToUpdate == null ? new PlayerZoneUpdates() : zonesToUpdate;
        }

        @Override public void hideZones(final PlayerView controller, final Iterable<PlayerZoneUpdate> zones) {
            unimpl("hideZones");
        }
    }

    /**
     * The flush trigger an AI-vs-AI game is missing.
     *
     * <p>{@link GameEventForwarder} flushes at 50 events, at 500 ms, and on an
     * {@code InputQueue} change.  The third is the one that matters -- it is
     * what puts a frame boundary exactly where the game pauses -- and it only
     * exists when a {@code PlayerControllerHuman} is in the game.  With two AI
     * seats only the size and time thresholds remain, which collapses whole
     * turns into single frames and makes the recorded phase strip useless.
     *
     * <p>So: flush on the same boundaries a human would have created.  This is
     * a {@code @Subscribe} on the game's own {@code EventBus}, therefore on the
     * game thread, and registered after the forwarder so the triggering event
     * is already in the batch being flushed.
     */
    static final class BoundaryFlusher {
        private final GameEventForwarder forwarder;
        private final SpectatorGui gui;
        private final long paceMs;
        private int dwells;
        private long dwellMs;

        BoundaryFlusher(final GameEventForwarder forwarder, final SpectatorGui gui, final long paceMs) {
            this.forwarder = forwarder;
            this.gui = gui;
            this.paceMs = paceMs;
        }

        int dwells() {
            return dwells;
        }

        long dwellMs() {
            return dwellMs;
        }

        /**
         * <b>{@code --pace}: the dwell goes BEFORE the flush, and that is the
         * whole of why it cannot change the recording.</b>  The forwarder's third
         * trigger is a clock: {@code receiveGameEvent} flushes when 500 ms have
         * passed since {@code lastFlushTime}, and {@code flush()} stamps that
         * field <em>before</em> it calls {@code handleGameEvents} (javap,
         * 2.0.14).  A sleep after the flush -- in {@code snapshot}, say -- would
         * leave the stamp one dwell old, and the very next event would flush a
         * batch of one: every frame boundary after it moves.  Asleep here, the
         * boundary event is already in the batch, nothing else can arrive (an
         * AI-vs-AI game posts every event from this one game thread), and the
         * flush that follows re-stamps the clock after the dwell -- so the next
         * batch sees exactly the gap it would have seen unpaced.  Measured, not
         * argued: a paced and an unpaced recording of one seed compare equal as
         * multisets (docs/evidence/spectate.md).
         *
         * <p>The dwell follows the frame on screen: a frame that only moved the
         * phase strip ({@link SpectatorGui#quiet}) is shown for a quarter of the
         * pace, anything else for the whole of it, so a cast or an attack has
         * time for its cues and an empty upkeep does not.  Skipped when nothing
         * is pending (the forwarder has just flushed on its own size or clock
         * trigger), because then no frame follows the dwell.
         */
        @Subscribe
        public void receive(final GameEvent ev) {
            if (ev instanceof GameEventTurnPhase
                    || ev instanceof GameEventTurnBegan
                    || ev instanceof GameEventGameOutcome) {
                if (paceMs > 0 && forwarder.hasPendingEvents()) {
                    dwell(gui.lastFrameQuiet() ? paceMs / 4 : paceMs);
                }
                forwarder.flush();
            }
        }

        private void dwell(final long ms) {
            if (ms <= 0) {
                return;
            }
            try {
                Thread.sleep(ms);
                dwells++;
                dwellMs += ms;
            } catch (final InterruptedException e) {
                // Keep the flag for whoever asked; a shorter dwell is harmless.
                Thread.currentThread().interrupt();
            }
        }
    }

    // ==================================================================
    // Frame bodies
    // ==================================================================

    /**
     * {@code docs/protocol.md} section 8.1 -- line 0 of the log.
     *
     * <p><b>The opponent's decklist is not in it.</b>  Section 8.3 promises the
     * log "contains exactly what this player was allowed to see", and a deck
     * path plus its sha256 identifies a decklist exactly.  With two AI seats
     * that is harmless; the moment a human sits down in M2/M3 it is the
     * opponent's whole deck, handed to the player in the file the client reads.
     * So every seat gets an entry -- the client still learns how many cards each
     * player started with -- but {@code path} and {@code sha256} are the viewing
     * seat's alone and are {@code null} for everyone else.
     */
    private static String sessionHeader(final Config cfg, final String gameId, final Args a,
                                        final PlayerView viewer, final List<PlayerView> players,
                                        final List<Deck> decks, final List<File> deckFiles) {
        final JsonOut o = new JsonOut().obj();
        o.n("v", GameLog.PROTOCOL_VERSION);
        o.n("kind", "session");
        o.n("gameId", gameId);
        o.n("startedAt", Instant.now().toString());
        o.n("seed", a.seed);
        o.n("forgeVersion", BuildInfo.getVersionString());
        o.n("forgeJarSha256", sha256(cfg.forgeJar()));
        // Protocol 8.1: the player id this log was redacted for.
        o.n("seat", viewer.getId());
        // Amendment M47: OPTIONAL, and only on a paced recording.  Every `t` in
        // this file is then the engine's wall clock stretched by the dwells, so
        // a reader measuring "how long did the AI think" is told the clock is
        // not the engine's.  Absent means engine speed -- and keeps an unpaced
        // recording byte-comparable to the committed fixtures (gate step 6).
        if (a.paceMs > 0) {
            o.n("paceMs", a.paceMs);
        }
        o.key("decks").arr();
        for (int i = 0; i < players.size() && i < decks.size(); i++) {
            final boolean isViewer = players.get(i).getId() == viewer.getId();
            o.obj();
            o.n("player", players.get(i).getId());
            o.n("path", isViewer ? rel(cfg, deckFiles.get(i)) : null);
            o.n("sha256", isViewer ? sha256(deckFiles.get(i)) : null);
            o.n("cards", decks.get(i).getMain().countAll());
            o.end();
        }
        o.end();
        return o.end().done();
    }

    /**
     * {@code docs/protocol.md} section 2.1.
     *
     * <p>{@code unsupportedCards} is computed from the <b>viewing seat's deck
     * only</b>, for the same reason the session header does not name the
     * opponent's deck: an entry is a literal card name, and the union of both
     * decks' unsupported cards puts names from a decklist the viewer has not
     * seen into the first frame the client reads.
     */
    private static String helloOk(final Config cfg, final String gameId, final Args a,
                                  final PlayerView viewer, final List<PlayerView> players,
                                  final List<String> unsupported, final List<Deck> decks,
                                  final List<File> deckFiles, final List<String> profiles) {
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
        if (a.writeMatch()) {
            match(o, cfg, a.seat, decks, deckFiles, profiles);
        }
        return o.end().done();
    }

    /**
     * Amendments <b>M44</b> and <b>M47</b> -- {@code hello_ok.match}, written by
     * the recorder only when it was given a match setup ({@link Args#writeMatch}).
     *
     * <p>M44's exact shape, read from the VIEWING seat: {@code yourDeck} is the
     * {@code --seat} seat's deck with the path the session header already
     * carries for it, {@code aiDeck} the other seat's -- {@code {name, cards}}
     * and NOTHING else, the same hard-rule-8 line as MtgTable's -- and
     * {@code aiProfile} the other seat's profile.  {@code games} is 1: a
     * recording is one game.
     *
     * <p>M47 adds one key, last so every M44 key keeps its position:
     * {@code yourProfile}, the viewing seat's own profile.  It exists only here,
     * because only here is the viewing seat an AI -- a profile is a fact about an
     * AI, and {@code tools/check-redaction.mjs} fails it on a stream whose
     * {@code players[]} marks the viewer human.  A profile is a file's base name,
     * never a list, so the other seat's profile is as public as its deck name.
     *
     * <p>Index {@code i} of {@code decks}, {@code deckFiles} and
     * {@code profiles} is seat {@code i} -- the registration order, which is the
     * order {@code GameView.getPlayers()} returns and the one
     * {@link #sessionHeader} already relies on for {@code decks}.
     */
    private static void match(final JsonOut o, final Config cfg, final int seat, final List<Deck> decks,
                              final List<File> deckFiles, final List<String> profiles) {
        final int other = seat == 0 ? 1 : 0;
        o.key("match").obj();
        o.key("yourDeck").obj()
                .n("name", Bootstrap.deckName(decks.get(seat), deckFiles.get(seat)))
                .n("path", rel(cfg, deckFiles.get(seat)))
                .n("cards", decks.get(seat).getMain().countAll())
                .end();
        // NAME AND COUNT ONLY.  tools/check-redaction.mjs fails any other key.
        o.key("aiDeck").obj()
                .n("name", Bootstrap.deckName(decks.get(other), deckFiles.get(other)))
                .n("cards", decks.get(other).getMain().countAll())
                .end();
        o.n("aiProfile", profiles.get(other));
        o.n("games", 1);
        o.n("yourProfile", profiles.get(seat));
        o.end();
    }

    // ==================================================================
    // Odds and ends
    // ==================================================================

    /** CLI arguments. */
    private static final class Args {
        String deck;
        String deck2;
        String out;
        long seed;
        int seat;
        boolean seedGiven;
        /** M47: seat 0's AI profile (the {@code --deck} seat); null = Default. */
        String profile;
        /** M47: seat 1's AI profile (the {@code --deck2} seat); null = Default. */
        String profile2;
        /** M47: write {@code hello_ok.match} even with no profile flag. */
        boolean match;
        /** M47: dwell this long at each frame boundary; 0 = engine speed. */
        long paceMs;

        /** A match setup was given, so the handshake says what it is (M47). */
        boolean writeMatch() {
            return match || profile != null || profile2 != null;
        }

        static Args parse(final String[] argv) {
            final Args a = new Args();
            String deck2Flag = null;
            String profile2Flag = null;
            for (int i = 0; i < argv.length; i++) {
                final String k = argv[i];
                switch (k) {
                case "--deck":  a.deck = need(argv, ++i, k); break;
                case "--deck2":
                case "--ai-deck": {
                    // The same flag under MtgTable's two spellings (M44).
                    final String v = need(argv, ++i, k);
                    if (deck2Flag != null && !deck2Flag.equals(k)) {
                        throw new IllegalArgumentException("--deck2 and --ai-deck are the same flag "
                                + "(seat 1's deck); give one");
                    }
                    deck2Flag = k;
                    a.deck2 = v;
                    break;
                }
                case "--profile": a.profile = need(argv, ++i, k); break;
                case "--profile2":
                case "--ai-profile": {
                    final String v = need(argv, ++i, k);
                    if (profile2Flag != null && !profile2Flag.equals(k)) {
                        throw new IllegalArgumentException("--profile2 and --ai-profile are the same flag "
                                + "(seat 1's AI profile); give one");
                    }
                    profile2Flag = k;
                    a.profile2 = v;
                    break;
                }
                case "--match": a.match = true; break;
                case "--pace": {
                    final String v = need(argv, ++i, k);
                    try {
                        a.paceMs = Long.parseLong(v);
                    } catch (final NumberFormatException e) {
                        throw new IllegalArgumentException("--pace needs milliseconds, got \"" + v + "\"");
                    }
                    if (a.paceMs < 0 || a.paceMs > 60_000L) {
                        throw new IllegalArgumentException("--pace must be 0..60000 ms, got " + a.paceMs);
                    }
                    break;
                }
                case "--out":   a.out = need(argv, ++i, k); break;
                case "--seat":  a.seat = Integer.parseInt(need(argv, ++i, k)); break;
                case "--seed":
                    a.seed = Long.parseLong(need(argv, ++i, k));
                    a.seedGiven = true;
                    break;
                default:
                    throw new IllegalArgumentException("unknown argument " + k + "\n"
                        + "usage: RecordMatch --deck <path> [--deck2|--ai-deck <path>] --seed <n> "
                        + "--out <file> [--seat 0|1] [--profile <p>] [--ai-profile|--profile2 <p>] "
                        + "[--match] [--pace <ms>]");
                }
            }
            if (a.out == null) {
                throw new IllegalArgumentException("--out is required");
            }
            if (!a.seedGiven) {
                throw new IllegalArgumentException("--seed is required (it goes in the session header)");
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

    /**
     * The cards {@code Match.prepareAllZones} would drop from the library
     * without printing anything: {@code Deck.getValid()} removes every card
     * whose {@code CardRules.isUnsupported()} is true and hands the list to
     * {@code PlayerController.revealUnsupported}, whose AI override is an empty
     * method.  Applying the same predicate here is the only way to know.
     */
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

    private static File resolve(final Config cfg, final String path) {
        final File f = new File(path);
        return (f.isAbsolute() ? f : new File(cfg.root(), path)).getAbsoluteFile();
    }

    private static String rel(final Config cfg, final File f) {
        final String root = cfg.root().getAbsolutePath() + File.separator;
        final String p = f.getAbsolutePath();
        return p.startsWith(root) ? p.substring(root.length()) : p;
    }

    /** {@code fixtures/games/g1.jsonl} -> {@code g1}. */
    private static String gameId(final File out) {
        String n = out.getName();
        final int dot = n.lastIndexOf('.');
        if (dot > 0) {
            n = n.substring(0, dot);
        }
        return n;
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

    // ==================================================================
    // stdout/stderr line watcher -- the same shape as Smoke's
    // ==================================================================

    /**
     * Engine complaints worth counting rather than leaving buried in the boot
     * chatter.  {@code {label, needle}}, needle matched case-insensitively.
     */
    private static final String[][] WATCHED = {
        // INFORMATIONAL, not a warning (report 08 section 3): the missing
        // "SVar" is CostTeamwork's hard-coded "Any" sentinel
        // (CostTeamwork.java:23-25), not an SVar name, and every rules path
        // returns before consulting it.  It fires for the deck's two
        // K:Teamwork:2 cards -- Quantum Reduction and Helicarrier Strike -- and
        // no card behaves wrongly.  Counted so a CHANGE in it is visible; a
        // non-zero count is not a problem.
        {"svar-fallback", "not found in ability", "informational"},
        {"unsupported-text", "unsupported", "warning"},
        {"unimpl", "UNIMPL ", "warning"},
        // Report 06 S5: a CardView we serialised had no ZoneType.  Expected 0.
        {"unzoned", "UNZONED ", "warning"},
    };

    private static void report(final Watcher out, final Watcher err) {
        System.out.flush();
        System.err.flush();
        out.stop();   // idempotent; run() already stopped them before the summary
        err.stop();
        System.out.println("== watched engine output ==");
        for (final String[] w : WATCHED) {
            final int n = out.count(w[0]) + err.count(w[0]);
            System.out.println(w[0] + " [" + w[2] + "]: " + n + " line(s)");
            final List<String> samples = new ArrayList<>(out.samples(w[0]));
            samples.addAll(err.samples(w[0]));
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

    /** Passes bytes through untouched and records lines matching {@link #WATCHED}. */
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
            } else if (b != '\r' && line.size() < 8192) {
                line.write(b);
            }
        }

        private void endLine() {
            if (line.size() == 0) {
                return;
            }
            final String s = line.toString(StandardCharsets.UTF_8);
            line.reset();
            final String lower = s.toLowerCase(Locale.ROOT);
            for (final String[] w : WATCHED) {
                if (lower.contains(w[1].toLowerCase(Locale.ROOT))) {
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
