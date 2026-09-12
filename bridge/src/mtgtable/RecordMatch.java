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
import forge.game.event.GameEventGameOutcome;
import forge.game.event.GameEventTurnBegan;
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
import forge.player.GamePlayerUtil;
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

        System.out.println("== mtg-table M1 recorder ==");
        System.out.println("deck (seat 0) = " + deck1File);
        System.out.println("deck (seat 1) = " + deck2File);
        System.out.println("seed          = " + a.seed);
        System.out.println("seat          = " + a.seat);
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
        final RegisteredPlayer p0 = new RegisteredPlayer(deck1);
        p0.setPlayer(GamePlayerUtil.createAiPlayer("AI-Seat0", 0));
        seats.add(p0);
        final RegisteredPlayer p1 = new RegisteredPlayer(deck2);
        p1.setPlayer(GamePlayerUtil.createAiPlayer("AI-Seat1", 1));
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
        final SpectatorGui gui = new SpectatorGui(gameId, gameView, viewer, log);
        gui.setGameView(null);      // HostedMatch's own two-step: clear, then set
        gui.setGameView(gameView);
        gui.openView(new TrackableCollection<>(viewer));

        log.s2c("hello_ok", helloOk(cfg, gameId, a, viewer, playerViews,
                                    unsupported(decks.get(a.seat))));

        final GameEventForwarder forwarder = new GameEventForwarder(gui);
        game.subscribeToEvents(forwarder);
        // Registered second, on purpose: see the class javadoc.
        game.subscribeToEvents(new BoundaryFlusher(forwarder));

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
            } finally {
                done.countDown();
            }
        });

        final boolean finished = done.await(GAME_TIMEOUT_SEC, TimeUnit.SECONDS);
        final long gameMs = ms(tGame);
        if (!finished) {
            game.setGameOver(GameEndReason.Draw);
            throw new IllegalStateException("game did not finish within " + GAME_TIMEOUT_SEC + "s");
        }
        if (gameFailure[0] != null) {
            throw new IllegalStateException("the game thread threw", gameFailure[0]);
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

        SpectatorGui(final String gameId, final GameView gameView,
                     final PlayerView viewer, final GameLog log) {
            this.gameId = gameId;
            this.gameView = gameView;
            this.viewer = viewer;
            this.log = log;
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

        BoundaryFlusher(final GameEventForwarder forwarder) {
            this.forwarder = forwarder;
        }

        @Subscribe
        public void receive(final GameEvent ev) {
            if (ev instanceof GameEventTurnPhase
                    || ev instanceof GameEventTurnBegan
                    || ev instanceof GameEventGameOutcome) {
                forwarder.flush();
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
        String deck;
        String deck2;
        String out;
        long seed;
        int seat;
        boolean seedGiven;

        static Args parse(final String[] argv) {
            final Args a = new Args();
            for (int i = 0; i < argv.length; i++) {
                final String k = argv[i];
                switch (k) {
                case "--deck":  a.deck = need(argv, ++i, k); break;
                case "--deck2": a.deck2 = need(argv, ++i, k); break;
                case "--out":   a.out = need(argv, ++i, k); break;
                case "--seat":  a.seat = Integer.parseInt(need(argv, ++i, k)); break;
                case "--seed":
                    a.seed = Long.parseLong(need(argv, ++i, k));
                    a.seedGiven = true;
                    break;
                default:
                    throw new IllegalArgumentException("unknown argument " + k + "\n"
                        + "usage: RecordMatch --deck <path> [--deck2 <path>] --seed <n> "
                        + "--out <file> [--seat 0|1]");
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
