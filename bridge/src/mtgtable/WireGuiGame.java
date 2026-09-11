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
 * The openView wiring follows Forge's own HostedMatch.startGame (Card Forge
 * project, GPL-3.0-or-later): bus registration and the InputQueue observer loop,
 * which Forge performs only for a RemoteClientGuiGame and which we must
 * therefore do by hand.
 */
package mtgtable;

import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;
import java.util.function.Function;

import forge.LobbyPlayer;
import forge.card.MagicColor;
import forge.deck.CardPool;
import forge.game.GameEntityView;
import forge.game.GameView;
import forge.game.card.CardView;
import forge.game.card.IHasCardView;
import com.google.common.eventbus.Subscribe;

import forge.game.event.GameEvent;
import forge.game.event.GameEventGameOutcome;
import forge.game.phase.PhaseType;
import forge.game.player.DelayedReveal;
import forge.game.player.IHasIcon;
import forge.game.player.PlayerView;
import forge.game.spellability.SpellAbilityView;
import forge.game.zone.ZoneType;
import forge.gamemodes.match.AbstractGuiGame;
import forge.gamemodes.match.HostedMatch;
import forge.gamemodes.match.NextGameDecision;
import forge.gui.FThreads;
import forge.gui.control.GameEventForwarder;
import forge.interfaces.IGameController;
import forge.item.PaperCard;
import forge.localinstance.properties.ForgePreferences;
import forge.localinstance.properties.ForgePreferences.FPref;
import forge.localinstance.skin.FSkinProp;
import forge.model.FModel;
import forge.player.PlayerControllerHuman;
import forge.player.PlayerZoneUpdate;
import forge.player.PlayerZoneUpdates;
import forge.trackable.TrackableCollection;
import forge.util.FSerializableFunction;
import forge.util.ITriggerEvent;
import forge.util.ThreadUtil;

import mtgtable.Json.JsonOut;

/**
 * The M2 seam: one human seat's {@code IGuiGame}, rendered as
 * {@code docs/protocol.md} frames over a {@link Transport}.
 *
 * <p>All 37 abstract members are present ({@code docs/research/07-wireguigame-spec.md}
 * section 3 -- 36 from {@code IGuiGame} plus {@code AbstractGuiGame}'s own
 * {@code protected updateCurrentPlayer}, which is not on the interface and
 * without which the class does not compile).  Every one of them either pushes a
 * frame, asks a question, or returns a documented default; <b>none of them
 * throws</b>, because a game that degrades is debuggable and a game that
 * dead-ends is not.
 *
 * <h2>The three rules this file is written to (report 07 section 2.5)</h2>
 *
 * <ol>
 *   <li><b>A push may touch only {@code getId()} on a view.</b>  Pushes arrive
 *       on four different threads -- EDT, game thread, click thread, and our io
 *       thread -- and {@code Tracker} is game-thread-only.  So a push serialises
 *       ids and the scalars Forge handed it, and everything else comes from
 *       {@link Snap#state}.</li>
 *   <li><b>Only the game thread may block.</b>  Every value-returning override
 *       opens with {@code if (!ThreadUtil.isGameThread()) return <default>;}.
 *       That is what stops {@code openZones}-on-the-EDT from parking the thread
 *       that draws every prompt.</li>
 *   <li><b>No thread we create is named {@code Game*}.</b>  See
 *       {@link Transport}.</li>
 * </ol>
 *
 * <h2>Why the input path matters more than the ask path</h2>
 *
 * With {@code IGuiBase.isLibgdxPort() == false}, nearly every yes/no in Forge
 * arrives as an {@code InputConfirm} -- a prompt plus two buttons through
 * {@code showPromptMessage} / {@code updateButtons} -- and not as
 * {@code IGuiGame.confirm}, because every direct {@code getGui().confirm(...)}
 * call site is guarded by {@code if (getGui().isLibgdxPort())}.  A client that
 * implements only the blocking calls sits forever at a prompt it never
 * receives.  Protocol section 4.2 is the same fact from the other end:
 * <b>a disabled OK means the engine wants a card click.</b>
 */
public final class WireGuiGame extends AbstractGuiGame implements Transport.Inbound {

    // ==================================================================
    // Construction and injected wiring
    // ==================================================================

    private final String gameId;
    private final Transport transport;
    private final GameLog log;
    private final ReplyPool pool = new ReplyPool();

    /** Injected by {@link MtgTable} before {@code HostedMatch.startMatch}. */
    private HostedMatch hosted;
    /** Builds line 0 of the log; needs the seat, so it runs in {@link #openView}. */
    private Session session;

    private volatile GameView gameView;
    /** The seat every redaction decision in this stream is made against. */
    private volatile PlayerView viewer;

    /** Our own forwarder -- NOT the one {@code HostedMatch} makes for remote clients. */
    private GameEventForwarder forwarder;

    // ---- counters and worklists the run summary prints -------------------
    private final Set<String> unimpl = new LinkedHashSet<>();
    private final Set<String> membersFired = new LinkedHashSet<>();
    private final Set<String> askKinds = new LinkedHashSet<>();
    private final AtomicInteger stateFrames = new AtomicInteger();
    private final AtomicInteger deferredEvents = new AtomicInteger();
    /** {@code setCard}/{@code setPanelSelection} pushes that carried a card, by thread. */
    private final AtomicInteger focusOnGameThread = new AtomicInteger();
    private final AtomicInteger focusOffGameThread = new AtomicInteger();
    /** Notices whose title or text {@link Snap#sweepText} blanked. */
    private final AtomicInteger noticeStringsSwept = new AtomicInteger();
    private final AtomicLong askSeq = new AtomicLong();
    private final AtomicInteger errors = new AtomicInteger();

    // ---- the ask path ----------------------------------------------------
    /** askId -> the ask-local option array.  The ONE identity map in the ask path. */
    private final Map<String, List<Object>> pendingOpts = new ConcurrentHashMap<>();
    /** abilityId -> view, filled by every {@code ability_menu}, read by {@code clickAbility}. */
    private final Map<Integer, SpellAbilityView> abilityIndex = new ConcurrentHashMap<>();

    // ---- the snapshot index an `act` resolves against (built on the game thread)
    private volatile Map<Integer, CardView> cardIndex = Map.of();
    private volatile Map<Integer, PlayerView> playerIndex = Map.of();
    /**
     * The ids the last frame concealed, cached on the game thread for the same
     * reason {@link #cardIndex} is: {@link #notice} is reached from the EDT, from
     * our io thread and from the game thread, and {@link Snap#sweepText} needs a
     * frame's answer without walking the view graph to get it.
     */
    private volatile Set<Integer> concealedNow = Set.of();

    // ---- handleGameEvents' off-thread buffer (report 07 section 4.2) ------
    private final List<GameEvent> deferred = new ArrayList<>();

    // ---- phase stops: ours, per game, seeded from prefs (report 11 section 3.3)
    private final Map<Integer, EnumSet<PhaseType>> skips = new ConcurrentHashMap<>();

    // ---- the `input` struct, assembled from four threads ------------------
    private final Object inputLock = new Object();
    private final InputState in = new InputState();

    private volatile String overBody;
    /** A {@link #captureOutcome} is queued on Forge's game pool; {@link #emitOver} waits for it. */
    private volatile boolean captureInFlight;
    private volatile boolean overEmitted;
    private volatile boolean closed;
    /**
     * True once {@link #openView} has written the session header and the game
     * exists.  Before that the log rejects frames (correctly: line 0 must be the
     * header) and an act has nothing to act on.
     */
    private volatile boolean ready;
    /**
     * True once the engine has asked this seat for something.  An act before
     * that is not merely useless: a concede delivered while
     * {@code Match.prepareAllZones} is still walking the player list removes a
     * player mid-iteration and Forge throws {@code IndexOutOfBoundsException}
     * inside its own setup.  Measured, with a piped stdin.
     *
     * <p><b>Armed only by {@link #engineInput}</b> -- i.e. only by Forge.  A
     * client frame must never arm it; {@code onResync} used to, through
     * {@code mutateInput}, which handed a reconnecting browser the crash this
     * flag exists to prevent.
     */
    private volatile boolean inputSeen;

    /** Counted down when {@code over} has been emitted, so main can stop parking. */
    private final java.util.concurrent.CountDownLatch finished = new java.util.concurrent.CountDownLatch(1);

    public WireGuiGame(final String gameId, final Transport transport, final GameLog log) {
        this.gameId = gameId;
        this.transport = transport;
        this.log = log;
        // Report 11 section 11.1 / section 3.1: PlayerControllerHuman.isRemoteClient()
        // is `gui instanceof RemoteClientGuiGame`, and it is the switch that
        // decides whether isUiSetToSkipPhase is answered from YieldController or
        // from the GUI.  We answer it from our own map (section 3.3), which is
        // only correct while we are NOT a remote client.  Assert it rather than
        // assume it; Class.isInstance so the check survives a refactor that a
        // bare instanceof would not even compile.
        if (forge.gamemodes.net.server.RemoteClientGuiGame.class.isInstance(this)) {
            throw new IllegalStateException(
                "WireGuiGame must not be a RemoteClientGuiGame: PlayerControllerHuman would then "
                + "read phase stops from YieldController instead of from this class (report 11 section 3.1)");
        }
    }

    /** Injected before {@code startMatch}: {@link #openView} needs the game and the controllers. */
    public void setHostedMatch(final HostedMatch match) {
        this.hosted = match;
    }

    /** Injected before {@code startMatch}: the session header and hello_ok bodies. */
    public void setSession(final Session s) {
        this.session = s;
    }

    /** What {@link MtgTable} knows and this class does not: decks, seed, jar hashes. */
    public interface Session {
        /** Line 0 of the log ({@code docs/protocol.md} section 8.1). */
        String header(PlayerView viewer, List<PlayerView> players);

        /** The {@code hello_ok} body (section 2.1). */
        String helloOk(PlayerView viewer, List<PlayerView> players);
    }

    /** The reply pool, so the transport can complete and await on the same one. */
    public ReplyPool pool() {
        return pool;
    }

    /** Blocks until {@code over} has been emitted. */
    public boolean awaitFinish(final long ms) throws InterruptedException {
        return finished.await(ms, java.util.concurrent.TimeUnit.MILLISECONDS);
    }

    // ---- summary accessors -----------------------------------------------

    public Collection<String> unimplemented() {
        return unimpl;
    }

    public Collection<String> membersFired() {
        return membersFired;
    }

    public Collection<String> askKindsSeen() {
        return askKinds;
    }

    public int stateFrames() {
        return stateFrames.get();
    }

    public int deferredEvents() {
        return deferredEvents.get();
    }

    /**
     * How many {@code setCard} / {@code setPanelSelection} pushes carried a card
     * <b>on the game thread</b> -- the only ones that can serialise
     * {@code input.focusCard}, and the only ones that need to (report 07 A8: the
     * game-thread pushes are exactly the surveil / {@code willPutCardOnTop} ones
     * whose card is not in the snapshot).
     *
     * @return {@code {game thread, other}}.  Measured over the first 17 human-seat
     *         recordings: {@code {0, 2076}} -- the feature is legal, specified
     *         and has never once been exercised by the engine for these decks,
     *         which is a fact the summary should print rather than leave implicit.
     */
    public int[] focusPushes() {
        return new int[] {focusOnGameThread.get(), focusOffGameThread.get()};
    }

    /** How many notice strings the concealed-id sweep blanked (protocol section 6). */
    public int noticeStringsSwept() {
        return noticeStringsSwept.get();
    }

    public int errors() {
        return errors.get();
    }

    public PlayerView seat() {
        return viewer;
    }

    // ==================================================================
    // Frame emission.  Every frame, both directions, also lands in the log.
    // ==================================================================

    /** Push an s2c frame and append it to {@code var/games/<id>/frames.jsonl}. */
    private void emit(final String type, final String body) {
        if (closed) {
            return;
        }
        try {
            // Line 0 of the log is the session header and it is written in
            // openView, where the seat first exists.  A frame produced before
            // that -- a notice from an act typed ahead of the game, or the
            // `over` of a concede during the pre-game prompts -- is still a
            // frame: GameLog numbers it and holds it until the header arrives
            // (GameLog.header).  It used to go on the wire with `seq: 0`, which
            // protocol section 1 forbids ("monotonic, per direction, starting at
            // 1"; a gap means a dropped frame) and which a client would read as
            // 0 followed by 1.
            final int seq = log.s2c(type, body);
            transport.push(envelope(seq, type, body));
        } catch (final RuntimeException e) {
            errors.incrementAndGet();
            System.err.println("EMIT FAILED " + type + ": " + e);
        }
    }

    /**
     * Append a c2s frame ({@code act} / {@code answer}).  Never pushed anywhere.
     *
     * <p>No {@code ready} guard: like an s2c frame, one produced before the
     * session header is numbered and held by {@link GameLog}, so an act typed
     * ahead of the game is in the log that records what the player did.
     */
    private void logC2s(final String type, final String body) {
        if (closed) {
            return;
        }
        try {
            log.c2s(type, body);
        } catch (final RuntimeException e) {
            errors.incrementAndGet();
            System.err.println("LOG FAILED " + type + ": " + e);
        }
    }

    /** {@code docs/protocol.md} section 1.  The log adds {@code dir}; the wire does not carry it. */
    private static String envelope(final int seq, final String type, final String body) {
        final StringBuilder sb = new StringBuilder(body.length() + 80);
        sb.append("{\"v\":").append(GameLog.PROTOCOL_VERSION)
          .append(",\"seq\":").append(seq)
          .append(",\"t\":").append(System.currentTimeMillis())
          .append(",\"type\":");
        Json.quote(sb, type);
        sb.append(",\"body\":").append(body).append('}');
        return sb.toString();
    }

    /**
     * {@code docs/protocol.md} section 6.  Never blocks; a notice is a toast, not
     * a question.
     *
     * <p><b>Both strings are swept</b> ({@link Snap#sweepText}) against the ids
     * the last frame concealed, because the engine builds them and one of them
     * is routinely a card: {@code PlayerControllerHuman.notifyOfValue} calls
     * {@code message(value, CardView.get(sa.getHostCard()).toString())}, and
     * {@code CardView.toString()} is {@code name (id)}.  Measured before the
     * sweep existed, in five independent recordings:
     * {@code {"level":"info","title":"Thriving Isle (49)","text":"Forge AI picked
     * White"}} emitted one frame before card 49 was legitimately revealed, while
     * the client's model still held 49 as a hidden stub in the opponent's hand.
     * That is structurally the {@code cast.text} leak protocol section 3.6
     * rule 1 exists to close, in the one channel that had no gate at all.
     */
    private void notice(final String level, final String title, final String text) {
        final Set<Integer> concealed = concealedNow;
        final String rawTitle = title == null ? "" : title;
        final String rawText = text == null ? "" : text;
        final String safeTitle = Snap.sweepText(rawTitle, concealed);
        final String safeText = Snap.sweepText(rawText, concealed);
        if (!safeTitle.equals(rawTitle) || !safeText.equals(rawText)) {
            noticeStringsSwept.incrementAndGet();
            System.err.println("NOTICE SWEPT " + level + ": an engine string named a card this "
                    + "frame conceals; blanked (protocol section 6)");
        }
        final JsonOut o = new JsonOut().obj();
        o.n("level", level).n("title", safeTitle).n("text", safeText);
        emit("notice", o.end().done());
    }

    /**
     * Report 07 section 6.4.  One line per member, plus a {@code notice} so the
     * degradation is visible in the client and not only in {@code var/*.log}.
     * {@code grep UNIMPL} is the M5 exit criterion.
     */
    private void unimpl(final String member) {
        if (unimpl.add(member)) {
            System.err.println("UNIMPL " + member);
            notice("error", "Unimplemented", member);
        }
    }

    /** Record that a member of the 37 actually fired, for the evidence table. */
    private void fired(final String member) {
        membersFired.add(member);
    }

    // ==================================================================
    // 1. openView -- the wiring hook (report 07 section 4.1)
    // ==================================================================

    /**
     * Runs on the thread that called {@code HostedMatch.startMatch} -- <b>not</b>
     * the game thread and <b>not</b> the EDT ({@code HostedMatch.java:260-262}
     * calls it before handing the match to {@code game.getAction().invoke}).  So
     * this method registers observers and emits the handshake, and it must not
     * call {@link Snap#state}.
     */
    @Override
    public void openView(final TrackableCollection<PlayerView> myPlayers) {
        fired("openView");
        if (myPlayers == null || myPlayers.isEmpty()) {
            throw new IllegalStateException("openView with no local players -- this client is a seat, "
                    + "not a spectator, and every redaction decision needs one");
        }
        viewer = myPlayers.iterator().next();
        gameView = getGameView();
        if (gameView == null && hosted != null) {
            gameView = hosted.getGameView();
        }

        // Line 0 of the log, then the handshake.  Both need the seat, which is
        // why they live here and not in MtgTable.
        final List<PlayerView> players = new ArrayList<>();
        if (gameView != null && gameView.getPlayers() != null) {
            // PlayerView identity only -- no field is read off these here.
            for (final PlayerView pv : gameView.getPlayers()) {
                players.add(pv);
            }
        }
        if (session != null) {
            log.header(session.header(viewer, players));
        }
        ready = true;                          // the log has its header; frames may flow
        if (session != null) {
            emit("hello_ok", session.helloOk(viewer, players));
        }

        seedPhaseStops(players);

        // 1. Our forwarder on the game's event bus.  Guava's EventBus dispatches
        //    synchronously on the posting thread, i.e. the game thread, so
        //    handleGameEvents lands where Snap may walk the graph.  Forge does
        //    this only for a RemoteClientGuiGame (HostedMatch.java:227-233);
        //    a plain AbstractGuiGame gets FControlGameEventHandler, which hops to
        //    the EDT where a walk would corrupt the Tracker silently.
        forwarder = new GameEventForwarder(this);
        if (hosted != null && hosted.getGame() != null) {
            hosted.getGame().subscribeToEvents(forwarder);

            // 2. Flush-before-block: observe every human InputQueue, so the
            //    pending batch ships in the instant before the game thread parks
            //    for input -- exactly when the client needs the board.
            for (final PlayerControllerHuman hc : hosted.getHumanControllers()) {
                hc.getInputQueue().addObserver(forwarder);
            }

            // 3. The outcome, captured where it is legal to read it.
            hosted.getGame().subscribeToEvents(new OutcomeWatcher());
        }
        pool.startWatchdog();
    }

    /**
     * Report 11 section 3.3.  A per-(turn player, phase) skip set, seeded from
     * {@code FPref.PHASES_HUMAN} / {@code PHASES_AI} once per game, mutated by
     * {@code act: setPhaseStop}, and discarded at the end.  That is not a
     * departure from Forge: {@code CMatchUI.actuateMatchPreferences} seeds its
     * phase-strip labels the same way and only writes them back at teardown.
     *
     * <p>Note the inversion: a pref that is {@code true} means <b>stop here</b>,
     * so the phases we store are the ones whose pref is false.
     */
    private void seedPhaseStops(final List<PlayerView> players) {
        final ForgePreferences prefs = FModel.getPreferences();
        final PhaseType[] phases = PhaseType.values();
        for (final PlayerView pv : players) {
            // Which array applies is chosen by WHOSE TURN it is, not by who is
            // setting the stop: "stop at MAIN1 on my turn" and "stop at MAIN1 on
            // the AI's turn" are separate switches.
            final boolean mine = viewer != null && pv.getId() == viewer.getId();
            final FPref[] keys = mine ? FPref.PHASES_HUMAN : FPref.PHASES_AI;
            final EnumSet<PhaseType> skip = EnumSet.noneOf(PhaseType.class);
            for (int p = 1; p < phases.length && p - 1 < keys.length; p++) {
                if (!prefs.getPrefBoolean(keys[p - 1])) {
                    skip.add(phases[p]);
                }
            }
            // Keyed by player ID, never by PlayerView: a new game replaces every
            // PlayerView and a map keyed by the object would go silently stale.
            skips.put(Integer.valueOf(pv.getId()), skip);
        }
    }

    // ==================================================================
    // 2. handleGameEvents -- THE snapshot hook (report 07 section 4.2)
    // ==================================================================

    /**
     * Called by our {@link GameEventForwarder} once per flush.
     *
     * <p><b>It can fire off the game thread.</b>  The forwarder is an
     * {@code InputQueue} observer, and {@code InputQueue.updateObservers()} is
     * reached from {@code removeInput}/{@code clearInputs} via
     * {@code InputSyncronizedBase.stop()}, which runs on whatever thread
     * delivered the click.  Walking a {@code CardView} there corrupts the
     * {@code Tracker} <em>silently</em>, so the batch is buffered instead and
     * the next game-thread flush ships it.  The deferred count is reported: a
     * non-zero value confirms the finding and is expected, not a bug.
     */
    @Override
    public void handleGameEvents(final List<GameEvent> batch) {
        fired("handleGameEvents");
        if (!ThreadUtil.isGameThread()) {
            synchronized (deferred) {
                if (batch != null) {
                    deferred.addAll(batch);
                    deferredEvents.addAndGet(batch.size());
                }
            }
            return;
        }
        flushState(batch);
    }

    /** Build and emit one {@code state}, prepending anything deferred.  Game thread only. */
    private void flushState(final List<GameEvent> batch) {
        if (viewer == null || gameView == null || closed) {
            return;
        }
        Snap.assertGameThread("WireGuiGame.flushState");
        final List<GameEvent> all;
        synchronized (deferred) {
            if (deferred.isEmpty()) {
                all = batch == null ? List.of() : batch;
            } else {
                all = new ArrayList<>(deferred);
                if (batch != null) {
                    all.addAll(batch);
                }
                deferred.clear();
            }
        }
        try {
            // The outcome must be captured HERE, on the game thread: finishGame()
            // arrives on the EDT where GameView may not be walked (report 07
            // section 4.3).
            boolean captured = false;
            if (overBody == null && (containsOutcome(all) || gameView.isGameOver())) {
                overBody = Snap.over(gameView);
                captured = true;
            }
            final String body = Snap.state(gameId, gameView, viewer, all);
            // The id -> view maps an `act` resolves against, and the ids this
            // frame conceals.  All three are built on the game thread and read
            // from the EDT and the io thread: the click path and the notice path
            // never walk the graph.
            cardIndex = Snap.cardIndex(gameView);
            final Map<Integer, PlayerView> pix = new HashMap<>();
            for (final PlayerView pv : Snap.playerList(gameView)) {
                pix.put(Integer.valueOf(pv.getId()), pv);
            }
            playerIndex = pix;
            concealedNow = Snap.concealedIds(gameView, viewer);
            emit("state", body);
            stateFrames.incrementAndGet();
            if (captured) {
                // The RESULT is the trigger, not finishGame(): see emitOver.
                // After the state that carries `gameOver`, so the terminal frame
                // is still `over` (protocol sections 7 and 8.4).
                emitOver();
            }
        } catch (final RuntimeException e) {
            // Guava's EventBus swallows subscriber exceptions into java.util.logging,
            // so a broken snapshot would silently produce an empty stream.
            errors.incrementAndGet();
            System.err.println("SNAPSHOT FAILED: " + e);
            e.printStackTrace();
        }
    }

    /**
     * Captures the game's result the moment Forge publishes it.
     *
     * <p>{@code finishGame()} arrives on the EDT, where {@code GameView} may not
     * be walked (R1), so the {@code over} body cannot be built there.  Waiting
     * for the forwarder's next flush does not work either: it batches at 50
     * events / 500 ms and {@code finishGame} routinely wins that race -- measured,
     * every {@code over} frame came out as the "no win condition yet" fallback.
     *
     * <p>Guava's {@code EventBus} dispatches synchronously on the posting
     * thread, which for a game event is the game thread, so this is the earliest
     * legal moment and also the correct one.
     */
    private final class OutcomeWatcher {
        @Subscribe
        public void receive(final GameEvent ev) {
            if (ev instanceof GameEventGameOutcome) {
                captureOutcome();
            }
        }
    }

    /**
     * Read the result, on a thread that is allowed to.
     *
     * <p>The outcome event is <b>not always posted from the game thread</b>: an
     * {@code act: concede} is dispatched on our virtual EDT (report 07 section
     * 2.4), it runs {@code PlayerControllerHuman.concede} ->
     * {@code checkGameOverCondition}, and Guava then delivers the resulting
     * event synchronously on that same EDT.  {@code Snap.over}'s thread assert
     * caught exactly that, which is what the assert is for.  Hop onto Forge's
     * own game pool -- whose threads are named {@code Game-n}, so the walk is
     * legal there -- and let {@link #emitOver} wait a moment for the answer.
     */
    private void captureOutcome() {
        if (overBody != null || gameView == null) {
            return;
        }
        if (!ThreadUtil.isGameThread()) {
            captureInFlight = true;            // emitOver waits for exactly this
            ThreadUtil.invokeInGameThread(this::captureOutcome);
            return;
        }
        try {
            overBody = Snap.over(gameView);
            if (forwarder != null) {
                forwarder.flush();             // ship the final state with gameOver set
            }
        } catch (final RuntimeException e) {
            System.err.println("OUTCOME CAPTURE FAILED: " + e);
        }
        // THE OUTCOME IS THE TRIGGER.  finishGame()/afterGameEnd() are late
        // triggers and Forge does not reliably call either -- measured: four
        // identical console runs (four buttonOk presses, then a concede), two of
        // which emitted `over` and two of which ended with a final `state`
        // carrying gameOver {winner:1, reason:AllOpponentsLost} and no `over`
        // frame at all, because the engine went on pushing `input` instead of
        // finishing the game.  A session that never terminates is exactly what
        // M3's WebSocket client cannot recover from, so the frame is emitted the
        // moment the result exists.  emitOver is idempotent behind `overEmitted`.
        emitOver();
    }

    private static boolean containsOutcome(final List<GameEvent> events) {
        for (final GameEvent e : events) {
            if (e instanceof GameEventGameOutcome) {
                return true;
            }
        }
        return false;
    }

    // ==================================================================
    // 3. The input path -- prompt, buttons, selectables (protocol section 4)
    // ==================================================================

    /** Ids and scalars only (R1): every field here came from Forge as an argument. */
    private static final class InputState {
        private String prompt = "";
        private Integer focusCardId;
        private String focusCardJson;          // serialised on the game thread, or null
        private String okLabel = "OK";
        private String cancelLabel = "Cancel";
        private boolean okEnabled;
        private boolean cancelEnabled;
        private final Set<Integer> selectable = new LinkedHashSet<>();
        private int selMin;
        private int selMax;
        private final Set<Integer> highlighted = new LinkedHashSet<>();
        private final Set<Integer> weak = new LinkedHashSet<>();
        private final Map<Integer, Set<String>> openZones = new LinkedHashMap<>();
    }

    /**
     * Apply an <b>engine-driven</b> input change and re-emit the frame.
     *
     * <p>This is the only thing that arms {@link #inputSeen}, and that is the
     * whole difference between it and {@link #mutateInput}: every caller here is
     * Forge telling this seat something ({@code showPromptMessage},
     * {@code updateButtons}, {@code setSelectables}, {@code setHighlighted},
     * {@code setWeaklySelectable}, {@code setCard}, the zone hints), so an act
     * arriving after one of them has a board to act on.  {@code onResync} is
     * <em>not</em> one of those -- it is a client frame (protocol section 2.4),
     * callable by any transport at any time -- and when it went through here it
     * disarmed the guard in {@link #applyAct} that keeps a concede out of
     * {@code Match.prepareAllZones}, where removing a player mid-iteration
     * throws {@code IndexOutOfBoundsException} inside Forge's own setup.
     */
    private void engineInput(final Consumer<InputState> f) {
        inputSeen = true;
        mutateInput(f);
    }

    /** Apply an input change and re-emit the frame.  Says nothing about who asked. */
    private void mutateInput(final Consumer<InputState> f) {
        if (closed) {
            return;
        }
        final String frame;
        synchronized (inputLock) {
            f.accept(in);
            frame = inputBody(in);
        }
        emit("input", frame);                  // pushed outside the lock
    }

    private static String inputBody(final InputState s) {
        final JsonOut o = new JsonOut().obj();
        o.n("prompt", s.prompt == null ? "" : s.prompt);
        o.nInt("focusCardId", s.focusCardId);
        o.key("focusCard");
        if (s.focusCardJson == null) {
            o.vNull();
        } else {
            o.raw(s.focusCardJson);
        }
        o.key("buttons").obj();
        o.key("ok").obj().n("label", s.okLabel).n("enabled", s.okEnabled).end();
        o.key("cancel").obj().n("label", s.cancelLabel).n("enabled", s.cancelEnabled).end();
        o.end();
        o.key("selectable").obj();
        o.key("cardIds").arr();
        for (final Integer id : s.selectable) {
            o.v(id.intValue());
        }
        o.end();
        o.n("min", s.selMin).n("max", s.selMax);
        o.n("mode", s.selectable.isEmpty() ? "none" : "cards");
        o.end();
        o.key("highlighted").arr();
        for (final Integer id : s.highlighted) {
            o.v(id.intValue());
        }
        o.end();
        o.key("weak").arr();
        for (final Integer id : s.weak) {
            o.v(id.intValue());
        }
        o.end();
        o.key("openZones").arr();
        for (final Map.Entry<Integer, Set<String>> e : s.openZones.entrySet()) {
            o.obj().n("playerId", e.getKey().intValue()).key("zones").arr();
            for (final String z : e.getValue()) {
                o.v(z);
            }
            o.end().end();
        }
        o.end();
        return o.end().done();
    }

    @Override
    public void showPromptMessage(final PlayerView owner, final String message, final CardView card) {
        fired("showPromptMessage");
        if (!forThisSeat(owner)) {
            return;
        }
        final Integer id = card == null ? null : Integer.valueOf(card.getId());
        final String json = cardJsonIfOnGameThread(card);
        engineInput(s -> {
            s.prompt = message == null ? "" : message;
            s.focusCardId = id;
            s.focusCardJson = json;
        });
    }

    @Override
    public void updateButtons(final PlayerView owner, final String label1, final String label2,
                              final boolean enable1, final boolean enable2, final boolean focus1) {
        fired("updateButtons");
        if (!forThisSeat(owner)) {
            return;
        }
        // The labels are the ENGINE's: "Undo (2)", "End Turn" and "Auto" are
        // what InputPassPriority and InputPayMana put on these two buttons.  They
        // are rendered verbatim and answered with buttonOk / buttonCancel; there
        // is no autoPay act and no endTurn act (protocol section 2.2, report 11
        // section 0.1).  `focus1` is protocol section 10.2 and not emitted yet.
        engineInput(s -> {
            s.okLabel = label1 == null ? "" : label1;
            s.cancelLabel = label2 == null ? "" : label2;
            s.okEnabled = enable1;
            s.cancelEnabled = enable2;
        });
    }

    @Override
    public void setSelectables(final Iterable<CardView> cards, final int min, final int max) {
        fired("setSelectables");
        super.setSelectables(cards, min, max);     // it maintains its own accumulated set
        final List<Integer> ids = ids(cards);
        engineInput(s -> {
            // AbstractGuiGame ACCUMULATES selectables and only clearSelectables()
            // resets them (AbstractGuiGame.java:347-359), so one call is not one
            // selection.  Mirror that here rather than replacing the set.
            s.selectable.addAll(ids);
            s.selMin = min;
            s.selMax = max;
        });
    }

    @Override
    public void clearSelectables() {
        fired("clearSelectables");
        super.clearSelectables();
        engineInput(s -> {
            s.selectable.clear();
            s.selMin = 0;
            s.selMax = 0;
        });
    }

    @Override
    public void setHighlighted(final Iterable<GameEntityView> entities, final boolean value) {
        fired("setHighlighted");
        super.setHighlighted(entities, value);
        final List<Integer> ids = new ArrayList<>();
        if (entities != null) {
            for (final GameEntityView e : entities) {
                if (e != null) {
                    ids.add(Integer.valueOf(e.getId()));
                }
            }
        }
        engineInput(s -> {
            if (value) {
                s.highlighted.addAll(ids);
            } else {
                s.highlighted.removeAll(ids);
            }
        });
    }

    @Override
    public void setWeaklySelectable(final Iterable<CardView> cards) {
        fired("setWeaklySelectable");
        super.setWeaklySelectable(cards);
        final List<Integer> ids = ids(cards);
        engineInput(s -> s.weak.addAll(ids));
    }

    @Override
    public void clearWeaklySelectable() {
        fired("clearWeaklySelectable");
        super.clearWeaklySelectable();
        engineInput(s -> s.weak.clear());
    }

    @Override
    public void setCard(final CardView card) {
        fired("setCard");
        focus(card);
    }

    @Override
    public void setPanelSelection(final CardView card) {
        fired("setPanelSelection");
        focus(card);                           // same channel as setCard (report 07 row 15)
    }

    private void focus(final CardView card) {
        final Integer id = card == null ? null : Integer.valueOf(card.getId());
        final String json = cardJsonIfOnGameThread(card);
        engineInput(s -> {
            s.focusCardId = id;
            s.focusCardJson = json;
        });
    }

    /**
     * {@code input.focusCard} is a serialised card, and serialising means
     * walking the view graph -- which R1 forbids off the game thread.
     *
     * <p>Both callers are mixed-thread: {@code setCard} arrives on the game
     * thread from {@code PlayerControllerHuman} (surveil, {@code willPutCardOnTop},
     * {@code chooseSingleSpellAbility}) and on the EDT from
     * {@code InputSelectTargets}.  The game-thread calls are exactly the ones
     * that push a card which is <b>not in the snapshot</b>, i.e. the ones
     * {@code focusCard} exists for, so serialising only there loses nothing: an
     * EDT focus is always a card the client already has, addressed by
     * {@code focusCardId}.
     */
    private String cardJsonIfOnGameThread(final CardView card) {
        if (card == null) {
            return null;
        }
        // Counted because the split is the evidence: `focusCard` exists for the
        // game-thread pushes (a card that is NOT in the snapshot), and if that
        // number stays 0 over a corpus then the feature is specified, legal and
        // unexercised -- which the run summary should say out loud rather than
        // leave to a reader of the emitter.
        if (!ThreadUtil.isGameThread()) {
            focusOffGameThread.incrementAndGet();
            return null;
        }
        focusOnGameThread.incrementAndGet();
        try {
            final JsonOut o = new JsonOut();
            Snap.card(o, card, viewer);
            return o.done();
        } catch (final RuntimeException e) {
            errors.incrementAndGet();
            System.err.println("FOCUS CARD FAILED: " + e);
            return null;
        }
    }

    private static List<Integer> ids(final Iterable<CardView> cards) {
        final List<Integer> out = new ArrayList<>();
        if (cards != null) {
            for (final CardView cv : cards) {
                if (cv != null) {
                    out.add(Integer.valueOf(cv.getId()));   // R1: getId() and nothing else
                }
            }
        }
        return out;
    }

    /** Ignore prompts and buttons aimed at a seat that is not ours. */
    private boolean forThisSeat(final PlayerView owner) {
        return owner == null || !hasLocalPlayers() || isLocalPlayer(owner);
    }

    // ==================================================================
    // 4. The other pushes
    // ==================================================================

    @Override
    public void showCombat() {
        fired("showCombat");                   // no-op: combat lives in state.combat
    }

    @Override
    protected void updateCurrentPlayer(final PlayerView player) {
        fired("updateCurrentPlayer");          // the 37th member; no-op, state carries priority
    }

    @Override
    public void updateShards(final Iterable<PlayerView> shards) {
        fired("updateShards");
        unimpl("updateShards");                // mobile adventure only; fires with an empty set
    }

    @Override
    public void enableOverlay() {
        fired("enableOverlay");
        unimpl("enableOverlay");               // quest draft only
    }

    @Override
    public void disableOverlay() {
        fired("disableOverlay");
        unimpl("disableOverlay");
    }

    @Override
    public void setPlayerAvatar(final LobbyPlayer player, final IHasIcon ihi) {
        fired("setPlayerAvatar");
        unimpl("setPlayerAvatar");             // an empty TODO in Forge's own remote client
    }

    @Override
    public void showManaPool(final PlayerView player) {
        fired("showManaPool");                 // no-op: state.players[].manaPool carries it
    }

    @Override
    public void hideManaPool(final PlayerView player) {
        fired("hideManaPool");
    }

    @Override
    public void alertUser() {
        fired("alertUser");
        notice("info", "Your turn", "");
    }

    @Override
    public void flashIncorrectAction() {
        fired("flashIncorrectAction");
        notice("warn", "Illegal action", "That action is not legal right now.");
    }

    @Override
    public void message(final String message, final String title) {
        fired("message");
        notice("info", title == null ? "" : title, message);
    }

    @Override
    public void showErrorDialog(final String message, final String title) {
        fired("showErrorDialog");
        notice("error", title == null ? "" : title, message);
    }

    @Override
    public void finishGame() {
        fired("finishGame");
        emitOver();
    }

    @Override
    public void afterGameEnd() {
        fired("afterGameEnd");
        super.afterGameEnd();                  // cancels the await-next-input timer
        emitOver();
    }

    /**
     * The {@code over} frame, once, from the outcome captured on the game thread.
     *
     * <p><b>Its trigger is {@link #captureOutcome}</b>, not {@code finishGame()}:
     * Forge calls neither {@code finishGame} nor {@code afterGameEnd} reliably
     * after a concede during the pre-game prompts, and a run that ends with a
     * final {@code state} carrying {@code gameOver} and no {@code over} frame is
     * a session that never terminates.  {@code finishGame} / {@code afterGameEnd}
     * remain as late triggers, and this method is idempotent, so whichever comes
     * first wins and the other is a no-op.
     */
    private void emitOver() {
        synchronized (this) {
            if (overEmitted) {
                return;
            }
            overEmitted = true;
        }
        // The capture may still be in flight on a game-pool thread (concede
        // posts the outcome event on our EDT, and captureOutcome hops).  Wait
        // for exactly that case rather than shipping an empty result: this runs
        // at the very end of the game with nothing queued behind it.  When the
        // capture already landed -- the normal path now -- the loop does not
        // run at all.
        for (int i = 0; overBody == null && captureInFlight && gameView != null && i < 50; i++) {
            try {
                Thread.sleep(20L);
            } catch (final InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        String body = overBody;
        if (body == null) {
            // The engine never published a win condition we could read on the
            // game thread.  Protocol section 7 declares `reason` nullable for
            // exactly this window; "" would misreport it as a known empty one.
            body = new JsonOut().obj().nNull("winner").nNull("reason").n("matchOver", true).end().done();
        }
        emit("over", body);
        finished.countDown();
    }

    // ==================================================================
    // 5. openZones / tempShowZones -- hints, not questions (protocol 4.3)
    // ==================================================================

    /**
     * Called on the <b>EDT</b> ({@code InputSelectEntitiesFromList.java:65-68},
     * {@code PlayerControllerHuman.java:956-959}).  A value-returning method that
     * blocks there stalls every prompt in the game with no error, so this pushes
     * the hint and echoes its argument -- which is only the token
     * {@code hideZones} will be handed back.  {@code PlayerZoneUpdate} is
     * {@code (PlayerView, Set<ZoneType>)} and has no card accessor at all, so
     * nothing is revealed either way.
     */
    @Override
    public Iterable<PlayerZoneUpdate> tempShowZones(final PlayerView controller,
                                                    final Iterable<PlayerZoneUpdate> zonesToUpdate) {
        fired("tempShowZones");
        addZoneHints(zonesToUpdate);
        return zonesToUpdate == null ? new PlayerZoneUpdates() : zonesToUpdate;
    }

    /**
     * Also the EDT ({@code FControlGameEventHandler.java:127}) and sometimes the
     * game thread ({@code TargetSelection.java:184}).  Builds the same list
     * {@code CMatchUI.java:1362-1381} builds -- <b>skipping Battlefield, Hand and
     * Stack</b> -- so that {@code restoreOldZones} closes exactly what we opened.
     * Never {@code null}: Forge hands the result straight back to
     * {@code restoreOldZones}.
     */
    @Override
    public PlayerZoneUpdates openZones(final PlayerView controller, final Collection<ZoneType> zones,
                                       final Map<PlayerView, Object> playersWithValidTargets,
                                       final boolean backupLastZones) {
        fired("openZones");
        final PlayerZoneUpdates out = new PlayerZoneUpdates();
        if (zones == null || playersWithValidTargets == null) {
            return out;
        }
        for (final PlayerView p : playersWithValidTargets.keySet()) {
            for (final ZoneType zt : zones) {
                if (zt == ZoneType.Battlefield || zt == ZoneType.Hand || zt == ZoneType.Stack) {
                    continue;                  // already on the board; CMatchUI skips them too
                }
                out.add(new PlayerZoneUpdate(p, zt));
            }
        }
        addZoneHints(out);
        return out;
    }

    @Override
    public void restoreOldZones(final PlayerView playerView, final PlayerZoneUpdates zonesToRestore) {
        fired("restoreOldZones");
        removeZoneHints(zonesToRestore);       // tolerate a null argument
    }

    @Override
    public void hideZones(final PlayerView controller, final Iterable<PlayerZoneUpdate> zones) {
        fired("hideZones");
        removeZoneHints(zones);
    }

    private void addZoneHints(final Iterable<PlayerZoneUpdate> updates) {
        if (updates == null) {
            return;
        }
        final Map<Integer, Set<String>> add = zoneHints(updates);
        if (add.isEmpty()) {
            return;
        }
        engineInput(s -> {
            for (final Map.Entry<Integer, Set<String>> e : add.entrySet()) {
                s.openZones.computeIfAbsent(e.getKey(), k -> new LinkedHashSet<>()).addAll(e.getValue());
            }
        });
    }

    private void removeZoneHints(final Iterable<PlayerZoneUpdate> updates) {
        if (updates == null) {
            // hideZones(player, null) is a real call: "close everything".
            engineInput(s -> s.openZones.clear());
            return;
        }
        final Map<Integer, Set<String>> drop = zoneHints(updates);
        engineInput(s -> {
            for (final Map.Entry<Integer, Set<String>> e : drop.entrySet()) {
                final Set<String> have = s.openZones.get(e.getKey());
                if (have != null) {
                    have.removeAll(e.getValue());
                    if (have.isEmpty()) {
                        s.openZones.remove(e.getKey());
                    }
                }
            }
        });
    }

    /** {@code PlayerZoneUpdate} -> {playerId: [zone names]}.  Ids and enum names only. */
    private static Map<Integer, Set<String>> zoneHints(final Iterable<PlayerZoneUpdate> updates) {
        final Map<Integer, Set<String>> out = new LinkedHashMap<>();
        for (final PlayerZoneUpdate u : updates) {
            if (u == null || u.getPlayer() == null || u.getZones() == null) {
                continue;
            }
            final Set<String> zs = out.computeIfAbsent(
                    Integer.valueOf(u.getPlayer().getId()), k -> new LinkedHashSet<>());
            for (final ZoneType zt : u.getZones()) {
                zs.add(zt.name().toLowerCase(java.util.Locale.ROOT));
            }
        }
        return out;
    }

    // ==================================================================
    // 6. Phase stops and the two remaining local answers
    // ==================================================================

    /**
     * <b>Very hot</b> -- the priority loop asks this on every step, on the game
     * thread ({@code PlayerControllerHuman.java:3862-3867}).  No allocation, no
     * logging, no frame.
     */
    @Override
    public boolean isUiSetToSkipPhase(final PlayerView turnPlayer, final PhaseType phase) {
        if (turnPlayer == null) {
            return false;
        }
        final EnumSet<PhaseType> set = skips.get(Integer.valueOf(turnPlayer.getId()));
        return set != null && set.contains(phase);
    }

    @Override
    public forge.game.GameState getGamestate() {
        fired("getGamestate");
        unimpl("getGamestate");                // dev-mode "restore game state" only
        return null;
    }

    // ==================================================================
    // 7. The ask path
    // ==================================================================

    /** What one ask needs to write its body, after the envelope fields. */
    private interface BodyWriter {
        void write(JsonOut o);
    }

    /**
     * Game thread only.  Emit a fresh {@code state} (report 06 W4: that is the
     * snapshot in which a temporarily revealed card is visible), then the
     * {@code ask}, then park.
     *
     * @param opts the ask-local option array; an answered index resolves against
     *             it and nothing else (protocol section 5.1, amendment A3)
     * @return the decoded {@code answer.value}, or null for "no answer"
     */
    private Object ask(final String kind, final List<Object> opts, final BodyWriter extra) {
        Transport.assertGameThread("ask/" + kind);
        if (closed || overEmitted) {
            return null;                       // degrade, never wedge
        }
        flushState(List.of());
        final String askId = "a" + askSeq.incrementAndGet();
        final long timeoutMs = transport.askTimeoutMs(kind);
        askKinds.add(kind);
        pendingOpts.put(askId, opts == null ? List.of() : opts);
        try {
            final JsonOut o = new JsonOut().obj();
            o.n("askId", askId).n("kind", kind).n("timeoutMs", timeoutMs);
            extra.write(o);
            final String body = o.end().done();

            pool.register(askId, kind);        // register BEFORE push
            if (pool.pending() > 1) {
                System.err.println("ASK OVERLAP " + pool.pending() + " pending -- a second game thread");
            }
            final int seq = log.s2c("ask", body);
            final String valueJson = transport.ask(askId, envelope(seq, "ask", body), timeoutMs);
            return decode(valueJson);
        } catch (final RuntimeException e) {
            errors.incrementAndGet();
            System.err.println("ASK FAILED " + kind + ": " + e);
            e.printStackTrace();
            return null;                       // a malformed ask must never throw on the game thread
        } finally {
            pendingOpts.remove(askId);
        }
    }

    /** A malformed answer is a null answer; it never throws on the game thread. */
    private static Object decode(final String valueJson) {
        if (valueJson == null) {
            return null;
        }
        try {
            return Json.parse(valueJson);
        } catch (final RuntimeException e) {
            System.err.println("ANSWER UNPARSEABLE, treated as null: " + valueJson);
            return null;
        }
    }

    // ---- option writing --------------------------------------------------

    /**
     * One ask option (protocol section 5.1).
     *
     * <p>Every label goes through {@link Snap#label} when the option is a card,
     * and through the concealment gate when it merely <em>mentions</em> one.
     * Forge's own dialogs would call {@code String.valueOf(t)}, and
     * {@code CardView.toString()} is {@code "<zone> <name> (<id>)"} for a card in
     * any zone at all -- which is the leak that would actually happen.
     */
    private void option(final JsonOut o, final int index, final Object t,
                        final Function<Object, String> display) {
        o.obj();
        o.n("id", index);
        if (t instanceof CardView) {
            final CardView cv = (CardView) t;
            o.n("label", Snap.label(cv, viewer));
            o.n("kind", "card");
            o.n("cardId", cv.getId());
            o.key("card");
            Snap.card(o, cv, viewer);
        } else if (t instanceof PlayerView) {
            final PlayerView pv = (PlayerView) t;
            o.n("label", pv.getName() == null ? "" : pv.getName());
            o.n("kind", "player");
            o.n("playerId", pv.getId());
        } else if (t instanceof SpellAbilityView) {
            final SpellAbilityView sav = (SpellAbilityView) t;
            o.n("label", abilityLabel(sav));
            o.n("kind", "ability");
            o.n("abilityId", sav.getId());
            final CardView host = sav.getCardView();
            if (host != null) {
                o.n("cardId", host.getId());
            }
            o.n("canPlay", sav.canPlay());
            o.n("isSpell", sav.isSpell());
        } else if (t instanceof MagicColor.Color) {
            o.n("label", ((MagicColor.Color) t).getName());
            o.n("kind", "color");
        } else if (t instanceof Integer) {
            o.n("label", String.valueOf(t));
            o.n("kind", "number");
        } else if (t instanceof String) {
            o.n("label", (String) t);
            o.n("kind", "text");
        } else if (t instanceof PaperCard) {
            // Your own pool (sideboard).  No CardView and no redaction question:
            // Forge never hands us the opponent's.
            final PaperCard pc = (PaperCard) t;
            o.n("label", pc.getName() + " (" + pc.getEdition() + ")");
            o.n("kind", "other");
        } else {
            o.n("label", genericLabel(t, display));
            o.n("kind", "other");
        }
        o.end();
    }

    /**
     * The label for a {@code T} that is not a view we recognise:
     * {@code CostPart}, {@code CardRules}, {@code ReplacementEffectView},
     * {@code CardStateView}...  Anything carrying a {@code CardView}
     * ({@code IHasCardView}) is gated on that card, because its
     * {@code toString()} is built from the card's name.
     */
    private String genericLabel(final Object t, final Function<Object, String> display) {
        if (t == null) {
            return "";
        }
        if (t instanceof IHasCardView) {
            final CardView cv = ((IHasCardView) t).getCardView();
            if (cv != null && Snap.concealed(cv, viewer)) {
                return "???";
            }
        }
        if (display != null) {
            try {
                final String s = display.apply(t);
                return s == null ? "" : s;
            } catch (final RuntimeException e) {
                // Forge's display function is arbitrary code; a broken one must
                // not take the game thread down.
                System.err.println("OPTION LABEL FAILED: " + e);
            }
        }
        return String.valueOf(t);
    }

    /** {@code SpellAbilityView.getDescription()} is built from the host card's name. */
    private String abilityLabel(final SpellAbilityView sav) {
        final CardView host = sav.getCardView();
        if (host != null && Snap.concealed(host, viewer)) {
            return "???";
        }
        final String d = sav.getDescription();
        return d == null ? "" : d;
    }

    private void options(final JsonOut o, final String key, final List<Object> opts,
                         final int from, final int to, final Function<Object, String> display) {
        o.key(key).arr();
        for (int i = from; i < to; i++) {
            option(o, i, opts.get(i), display);
        }
        o.end();
    }

    // ---- the thirteen blocking members -----------------------------------

    @Override
    public SpellAbilityView getAbilityToPlay(final CardView host, final List<SpellAbilityView> abilities,
                                             final ITriggerEvent triggerEvent) {
        fired("getAbilityToPlay");
        if (abilities == null || abilities.isEmpty()) {
            return null;
        }
        // Forge's desktop client answers this one locally when there is nothing
        // to choose (CMatchUI.java:1016-1035); so do we, or every land drop
        // becomes a one-option menu.
        if (abilities.size() == 1) {
            final SpellAbilityView only = abilities.get(0);
            if (triggerEvent == null || !only.promptIfOnlyPossibleAbility()) {
                return triggerEvent == null || only.canPlay() ? only : null;
            }
        }
        if (!ThreadUtil.isGameThread()) {
            return null;                       // R2; the caller null-checks (PCH:226)
        }
        if (host == null) {
            // Protocol section 5.2 declares `ability_menu.cardId` a number and
            // protocol.ts types it as one.  The emitter could write null here
            // (Forge's signature allows a null host), so the two ends disagreed
            // on a shape that has never been observed.  There is nothing to
            // attach a menu to without a host card, and the caller null-checks
            // the result, so the ask is skipped rather than emitted malformed.
            unimpl("getAbilityToPlay(host=null)");
            return null;
        }
        final List<Object> opts = new ArrayList<>(abilities);
        for (final SpellAbilityView sav : abilities) {
            abilityIndex.put(Integer.valueOf(sav.getId()), sav);
        }
        final Object v = ask("ability_menu", opts, o -> {
            o.n("cardId", host.getId());
            options(o, "options", opts, 0, opts.size(), null);
        });
        final Integer i = asInt(v);
        return i == null || i < 0 || i >= abilities.size() ? null : abilities.get(i);
    }

    @Override
    public boolean confirm(final CardView c, final String question, final boolean defaultIsYes,
                           final List<String> options) {
        fired("confirm");
        if (!ThreadUtil.isGameThread()) {
            return defaultIsYes;
        }
        final String yes = options != null && options.size() > 0 ? options.get(0) : "Yes";
        final String no = options != null && options.size() > 1 ? options.get(1) : "No";
        final Object v = ask("confirm", List.of(), o -> {
            o.n("prompt", question == null ? "" : question);
            o.n("title", "Confirm");
            o.n("yesLabel", yes).n("noLabel", no).n("defaultYes", defaultIsYes);
            // The card the question is about is frequently a library card that
            // is not in the snapshot (protocol 5.2, report 06 W2).
            o.key("card");
            if (c == null) {
                o.vNull();
            } else {
                Snap.card(o, c, viewer);
            }
        });
        final Boolean b = asBool(v);
        return b == null ? defaultIsYes : b.booleanValue();
    }

    @Override
    public boolean showConfirmDialog(final String message, final String title, final String yesButtonText,
                                     final String noButtonText, final boolean defaultYes) {
        fired("showConfirmDialog");
        if (!ThreadUtil.isGameThread()) {
            return defaultYes;
        }
        final Object v = ask("confirm", List.of(), o -> {
            o.n("prompt", message == null ? "" : message);
            o.n("title", title == null ? "" : title);
            o.n("yesLabel", yesButtonText == null ? "Yes" : yesButtonText);
            o.n("noLabel", noButtonText == null ? "No" : noButtonText);
            o.n("defaultYes", defaultYes);
            o.nNull("card");
        });
        final Boolean b = asBool(v);
        return b == null ? defaultYes : b.booleanValue();
    }

    @Override
    public int showOptionDialog(final String message, final String title, final FSkinProp icon,
                                final List<String> options, final int defaultOption) {
        fired("showOptionDialog");
        if (!ThreadUtil.isGameThread()) {
            return defaultOption;
        }
        final List<Object> opts = options == null ? List.of() : new ArrayList<>(options);
        final Object v = ask("options", opts, o -> {
            o.n("prompt", message == null ? "" : message);
            o.n("title", title == null ? "" : title);
            options(o, "options", opts, 0, opts.size(), null);
            o.n("defaultIndex", defaultOption);
            o.nNull("card");                   // FSkinProp is a desktop icon enum: ignored
        });
        final Integer i = asInt(v);
        return i == null || i < 0 || i >= opts.size() ? defaultOption : i.intValue();
    }

    @Override
    public String showInputDialog(final String message, final String title, final FSkinProp icon,
                                  final String initialInput, final List<String> inputOptions,
                                  final boolean isNumeric) {
        fired("showInputDialog");
        if (!ThreadUtil.isGameThread()) {
            return null;                       // null is "cancel"; AbstractGuiGame:854 handles it
        }
        final Object v = ask("text", List.of(), o -> {
            o.n("prompt", message == null ? "" : message);
            o.n("title", title == null ? "" : title);
            // `initial` is a string in protocol section 5.2 and in protocol.ts,
            // and JsonOut.n(String,String) writes a JSON null for a null
            // argument -- so it defaults here the way every other string field
            // already does, rather than emitting a shape neither end declares.
            o.n("initial", initialInput == null ? "" : initialInput);
            o.key("suggestions").arr();
            if (inputOptions != null) {
                for (final String s : inputOptions) {
                    o.v(s);
                }
            }
            o.end();
            o.n("numeric", isNumeric);
        });
        return v instanceof String ? (String) v : null;
    }

    @Override
    public <T> List<T> getChoices(final String message, final int min, final int max, final List<T> choices,
                                  final List<T> selected, final FSerializableFunction<T, String> display) {
        fired("getChoices");
        final List<T> source = choices == null ? List.<T>of() : choices;
        if (!ThreadUtil.isGameThread()) {
            return choicesDefault(min, source);
        }
        final List<Object> opts = new ArrayList<>(source);
        @SuppressWarnings("unchecked")
        final Function<Object, String> disp = display == null ? null : x -> display.apply((T) x);
        final Object v = ask("choose_list", opts, o -> {
            o.n("prompt", message == null ? "" : message);
            options(o, "options", opts, 0, opts.size(), disp);
            o.key("preselected").arr();
            if (selected != null) {
                for (final T t : selected) {
                    final int i = indexOfIdentity(opts, t);
                    if (i >= 0) {
                        o.v(i);
                    }
                }
            }
            o.end();
            o.n("min", min).n("max", max);
            // Amendment A7: AbstractGuiGame.reveal is getChoices(msg, -1, -1, items).
            // A negative min means "show these, select nothing"; without the flag
            // a reveal renders as an impossible "pick -1 cards".
            o.n("reveal", min < 0);
        });
        final int[] picks = asIntArray(v);
        return picks == null ? choicesDefault(min, source) : Ask.pick(source, picks);
    }

    /**
     * Report 07 row 26.  {@code getChoices} must <b>never</b> return null:
     * {@code AbstractGuiGame.java:767} calls {@code isEmpty()} on it and
     * {@code :780-781} does {@code assert size()==1; get(0)}.
     */
    private static <T> List<T> choicesDefault(final int min, final List<T> choices) {
        return Ask.choicesDefault(min, choices);
    }

    @Override
    public <T> OrderResult<T> order(final String title, final String top, final int remainingObjectsMin,
                                    final int remainingObjectsMax, final List<T> sourceChoices,
                                    final List<T> destChoices, final CardView referenceCard,
                                    final boolean sideboardingMode, final boolean rememberOption) {
        fired("order");
        if (!ThreadUtil.isGameThread()) {
            return orderDefault(remainingObjectsMin, remainingObjectsMax, sourceChoices, destChoices);
        }
        // ONE option array in two halves: indices address `dest ++ source`, in
        // that order (protocol section 5.1).
        final List<Object> opts = new ArrayList<>();
        if (destChoices != null) {
            opts.addAll(destChoices);
        }
        final int destCount = opts.size();
        if (sourceChoices != null) {
            opts.addAll(sourceChoices);
        }
        final int total = opts.size();
        final Object v = ask("order", opts, o -> {
            o.n("prompt", title == null ? "" : title);
            o.n("destLabel", top == null ? "" : top);
            options(o, "dest", opts, 0, destCount, null);
            options(o, "source", opts, destCount, total, null);
            // Forge's remainingMin/remainingMax: how many objects may be LEFT in
            // the source box.  -1 means unconstrained.
            o.n("min", remainingObjectsMin).n("max", remainingObjectsMax);
            o.nInt("referenceCardId", referenceCard == null ? null : Integer.valueOf(referenceCard.getId()));
            o.n("sideboardMode", sideboardingMode).n("showRemember", rememberOption);
        });
        if (!(v instanceof Map)) {
            return orderDefault(remainingObjectsMin, remainingObjectsMax, sourceChoices, destChoices);
        }
        final Map<?, ?> m = (Map<?, ?>) v;
        final int[] picks = asIntArray(m.get("ordered"));
        if (picks == null) {
            return orderDefault(remainingObjectsMin, remainingObjectsMax, sourceChoices, destChoices);
        }
        @SuppressWarnings("unchecked")
        final List<T> all = (List<T>) (List<?>) opts;   // dest ++ source, as ONE array
        final List<T> ordered = Ask.ordered(all, picks);
        final Boolean remember = asBool(m.get("remember"));
        return new OrderResult<>(ordered, remember != null && remember.booleanValue());
    }

    /**
     * Report 07 section 6.7.  {@code order} must <b>never</b> return null --
     * {@code IGuiGame.java:229,232} and {@code PlayerControllerHuman.java:2317}
     * all call {@code .ordered()} unguarded -- and the naive
     * "return sourceChoices" default silently DROPS every simultaneous trigger
     * at {@code PCH:2309}, where the source list is empty and the saved order is
     * in {@code dest}.
     *
     * <p>The list half is {@link Ask#orderedDefault}, where
     * {@link AskSelfTest} can drive it; this wraps it in the
     * {@code OrderResult} Forge wants.  {@code remember} is false: the engine
     * asked and nobody answered, so nothing is remembered.
     */
    static <T> OrderResult<T> orderDefault(final int remainingMin, final int remainingMax,
                                           final List<T> source, final List<T> dest) {
        return new OrderResult<>(Ask.orderedDefault(remainingMin, remainingMax, source, dest), false);
    }

    @Override
    public GameEntityView chooseSingleEntityForEffect(final String title,
                                                      final List<? extends GameEntityView> optionList,
                                                      final DelayedReveal delayedReveal,
                                                      final boolean isOptional) {
        fired("chooseSingleEntityForEffect");
        if (!ThreadUtil.isGameThread() || optionList == null || optionList.isEmpty()) {
            return null;                       // guarded at PCH:616-618
        }
        final List<Object> opts = new ArrayList<>(optionList);
        final Object v = ask("choose_entities", opts, o -> {
            o.n("prompt", title == null ? "" : title);
            options(o, "options", opts, 0, opts.size(), null);
            o.n("min", isOptional ? 0 : 1).n("max", 1);
            delayedReveal(o, delayedReveal);
        });
        final int[] picks = asIntArray(v);
        if (picks == null || picks.length == 0 || picks[0] < 0 || picks[0] >= optionList.size()) {
            return null;
        }
        return optionList.get(picks[0]);
    }

    @Override
    public List<GameEntityView> chooseEntitiesForEffect(final String title,
                                                        final List<? extends GameEntityView> optionList,
                                                        final int min, final int max,
                                                        final DelayedReveal delayedReveal) {
        fired("chooseEntitiesForEffect");
        final List<GameEntityView> fallback = new ArrayList<>();
        if (optionList != null) {
            for (int i = 0; i < min && i < optionList.size(); i++) {
                fallback.add(optionList.get(i));
            }
        }
        if (!ThreadUtil.isGameThread() || optionList == null || optionList.isEmpty()) {
            return new ArrayList<>();
        }
        final List<Object> opts = new ArrayList<>(optionList);
        final Object v = ask("choose_entities", opts, o -> {
            o.n("prompt", title == null ? "" : title);
            options(o, "options", opts, 0, opts.size(), null);
            o.n("min", min).n("max", max);
            delayedReveal(o, delayedReveal);
        });
        final int[] picks = asIntArray(v);
        return picks == null ? fallback : new ArrayList<GameEntityView>(Ask.pick(optionList, picks));
    }

    /**
     * The single largest legitimate reveal on the wire: all three construction
     * sites of {@code DelayedReveal} are library or opponent-hand searches.
     * Every card in it goes through the one gated function.
     */
    private void delayedReveal(final JsonOut o, final DelayedReveal dr) {
        o.key("delayedReveal");
        if (dr == null) {
            o.vNull();
            return;
        }
        o.obj();
        o.nInt("owner", dr.getOwner() == null ? null : Integer.valueOf(dr.getOwner().getId()));
        o.key("zones").arr();
        if (dr.getZone() != null) {
            for (final ZoneType zt : dr.getZone()) {
                o.v(zt.name().toLowerCase(java.util.Locale.ROOT));
            }
        }
        o.end();
        o.n("messagePrefix", dr.getMessagePrefix() == null ? "" : dr.getMessagePrefix());
        o.key("cards").arr();
        if (dr.getCards() != null) {
            for (final CardView cv : dr.getCards()) {
                if (cv != null) {
                    Snap.card(o, cv, viewer);
                }
            }
        }
        o.end();
        o.end();
    }

    @Override
    public Map<CardView, Integer> assignCombatDamage(final CardView attacker, final List<CardView> blockers,
                                                     final int damage, final GameEntityView defender,
                                                     final boolean overrideOrder, final boolean maySkip) {
        fired("assignCombatDamage");
        if (!ThreadUtil.isGameThread()) {
            return null;                       // PCH:302-304 handles null: "let Forge assign"
        }
        // Index 0 is always the DEFENDER, carrying "defender": true; the blockers
        // follow.  Index 0 marshals back to the map key null, which is what
        // PCH:305-311 accepts for the defending player.
        final List<Object> opts = new ArrayList<>();
        opts.add(defender);
        if (blockers != null) {
            opts.addAll(blockers);
        }
        final Object v = ask("assign_damage", opts, o -> {
            // Nullable ON PURPOSE, and declared so at both ends (protocol
            // section 5.2, protocol.ts `attackerId: number | null`): Forge's
            // signature allows a null attacker and this emitter cannot prove it
            // never happens, so the type says what the code can do rather than
            // what a run happened to produce.
            o.nInt("attackerId", attacker == null ? null : Integer.valueOf(attacker.getId()));
            o.n("total", damage).n("overrideOrder", overrideOrder).n("maySkip", maySkip);
            o.key("targets").arr();
            for (int i = 0; i < opts.size(); i++) {
                final Object t = opts.get(i);
                o.obj();
                o.n("id", i);
                o.n("defender", i == 0);
                if (t instanceof CardView) {
                    final CardView cv = (CardView) t;
                    o.n("label", Snap.label(cv, viewer));
                    o.n("kind", "card");
                    o.n("cardId", cv.getId());
                    o.nInt("lethal", Snap.lethal(cv));
                    o.key("card");
                    Snap.card(o, cv, viewer);
                } else if (t instanceof PlayerView) {
                    final PlayerView pv = (PlayerView) t;
                    o.n("label", pv.getName() == null ? "" : pv.getName());
                    o.n("kind", "player");
                    o.n("playerId", pv.getId());
                    o.nNull("lethal");
                } else {
                    o.n("label", t == null ? "" : t.getClass().getSimpleName());
                    o.n("kind", "other");
                    o.nNull("lethal");
                }
                o.end();
            }
            o.end();
        });
        final Map<Integer, Integer> m = asIntMap(v);
        // Index 0 -> the null key -> the defending player, indices 1..n ->
        // blockers.get(i - 1).  In Ask.damageAssignment, where AskSelfTest
        // drives it with a defender plus two blockers: section 5.3's documented
        // trap is invisible on the wire, because a one-off error produces a
        // perfectly well-formed answer object.
        return m == null ? null : Ask.damageAssignment(blockers, m);
    }

    @Override
    public Map<Object, Integer> assignGenericAmount(final CardView effectSource,
                                                    final Map<Object, Integer> targets, final int amount,
                                                    final boolean atLeastOne, final String amountLabel) {
        fired("assignGenericAmount");
        if (!ThreadUtil.isGameThread() || targets == null) {
            return null;                       // PCH:329,358 guard with if (vResult != null)
        }
        final List<Object> opts = new ArrayList<>(targets.keySet());
        final Object v = ask("assign_amount", opts, o -> {
            o.nInt("sourceCardId", effectSource == null ? null : Integer.valueOf(effectSource.getId()));
            o.n("total", amount).n("atLeastOne", atLeastOne);
            o.n("label", amountLabel == null ? "" : amountLabel);
            o.key("targets").arr();
            for (int i = 0; i < opts.size(); i++) {
                final Object t = opts.get(i);
                o.obj();
                o.n("id", i);
                // A key may be a GameEntityView OR a MagicColor.Color
                // ("mana of any combination of colours", IGuiGame.java:151-152).
                if (t instanceof MagicColor.Color) {
                    o.n("label", ((MagicColor.Color) t).getName()).n("kind", "color");
                } else if (t instanceof CardView) {
                    final CardView cv = (CardView) t;
                    o.n("label", Snap.label(cv, viewer)).n("kind", "entity").n("cardId", cv.getId());
                    o.key("card");
                    Snap.card(o, cv, viewer);
                } else if (t instanceof PlayerView) {
                    final PlayerView pv = (PlayerView) t;
                    o.n("label", pv.getName() == null ? "" : pv.getName())
                     .n("kind", "entity").n("playerId", pv.getId());
                } else {
                    // NOT String.valueOf(t).  A GameEntityView has only CardView
                    // and PlayerView subtypes today, so this arm is unreachable
                    // -- but it is the exact shape of the leak amendment M1
                    // closed (an engine object stringified straight onto the
                    // wire; CardView.toString() is "<zone> <name> (<id>)"), and
                    // its sibling in assignCombatDamage already writes the class
                    // name.  No String.valueOf of an engine object may reach a
                    // label; the type name is enough to render "something else".
                    o.n("label", t == null ? "" : t.getClass().getSimpleName()).n("kind", "entity");
                }
                final Integer cap = targets.get(t);
                o.nInt("max", cap);
                o.end();
            }
            o.end();
        });
        final Map<Integer, Integer> m = asIntMap(v);
        return m == null ? null : Ask.indexedAmounts(opts, m);
    }

    @Override
    public List<CardView> manipulateCardList(final String title, final Iterable<CardView> cards,
                                             final Iterable<CardView> manipulable, final boolean toTop,
                                             final boolean toBottom, final boolean toAnywhere) {
        fired("manipulateCardList");
        final List<CardView> all = new ArrayList<>();
        if (cards != null) {
            for (final CardView cv : cards) {
                all.add(cv);
            }
        }
        if (!ThreadUtil.isGameThread()) {
            return all;                        // PCH:986 indexes the result: NEVER null
        }
        final List<Object> opts = new ArrayList<>(all);
        final Set<Integer> canMove = new LinkedHashSet<>();
        if (manipulable != null) {
            for (final CardView cv : manipulable) {
                final int i = indexOfIdentity(opts, cv);
                if (i >= 0) {
                    canMove.add(Integer.valueOf(i));
                }
            }
        }
        final Object v = ask("manipulate_list", opts, o -> {
            o.n("prompt", title == null ? "" : title);
            options(o, "cards", opts, 0, opts.size(), null);
            o.key("manipulable").arr();
            for (final Integer i : canMove) {
                o.v(i.intValue());
            }
            o.end();
            o.n("toTop", toTop).n("toBottom", toBottom).n("toAnywhere", toAnywhere);
        });
        // A wrong length, a duplicate or an out-of-range index is the input
        // list unchanged -- PCH:986 indexes the result, so this one is never
        // null and never short (Ask.reorder, driven by AskSelfTest).
        return Ask.reorder(all, asIntArray(v));
    }

    @Override
    public List<PaperCard> sideboard(final CardPool sideboard, final CardPool main, final String message) {
        fired("sideboard");
        if (!ThreadUtil.isGameThread()) {
            return new ArrayList<>();
        }
        final List<PaperCard> mainList = main == null ? List.of() : main.toFlatList();
        final List<PaperCard> sideList = sideboard == null ? List.of() : sideboard.toFlatList();
        final List<Object> opts = new ArrayList<>(mainList);
        final int mainCount = opts.size();
        opts.addAll(sideList);
        final Object v = ask("sideboard", opts, o -> {
            o.n("prompt", message == null ? "" : message);
            options(o, "main", opts, 0, mainCount, null);
            options(o, "side", opts, mainCount, opts.size(), null);
        });
        // The new main deck, as indices into `main ++ side` (section 5.1); null
        // is "no sideboarding", which PCH:276 tolerates.
        final List<PaperCard> out = new ArrayList<>();
        for (final Object o : Ask.sideboardMain(opts, asIntArray(v))) {
            if (o instanceof PaperCard) {
                out.add((PaperCard) o);
            }
        }
        return out;
    }

    // ==================================================================
    // 8. The inbound path -- acts and answers (report 07 section 9)
    // ==================================================================

    @Override
    public void onAct(final String action, final Map<String, Object> body) {
        Transport.assertNotGameThread("Transport.Inbound.onAct");
        Transport.assertNotEdt("Transport.Inbound.onAct");
        logC2s("act", actBody(action, body));
        // Dispatch on the virtual EDT, exactly as desktop Forge does:
        // InputBase.finished is a plain non-volatile field written by stop() via
        // invokeInEdtNowOrLater and read by selectCard/selectButtonOk, and
        // desktop is safe only because both ends are the EDT.  It also serialises
        // clicks against prompt rendering for free.
        FThreads.invokeInEdtNowOrLater(() -> {
            try {
                applyAct(action, body);
            } catch (final RuntimeException e) {
                // Protocol section 2.2: the server tolerates ANY act at any time,
                // including one that is now meaningless.  Drop it with a notice;
                // never crash, never block.
                System.err.println("ACT FAILED " + action + ": " + e);
                notice("warn", "Action failed", action + ": " + e);
            }
        });
    }

    private void applyAct(final String action, final Map<String, Object> body) {
        if (!ready || !inputSeen) {
            // Typed ahead of the game: there is no controller and no board yet.
            if ("concede".equals(action)) {
                // The one act that still means something: the player wants out
                // before the game has begun.  End the session rather than
                // conceding into Forge's setup, which crashes it.
                System.err.println("CONCEDE BEFORE START: ending the session");
                emitOver();
                return;
            }
            System.err.println("ACT BEFORE START dropped: " + action);
            notice("warn", "Not yet", "the game has not asked for anything yet");
            return;
        }
        final IGameController c = controller();
        if (c == null) {
            notice("warn", "No controller", "the game has no controller for this seat yet");
            return;
        }
        switch (action) {
        case "clickCard": {
            final CardView cv = cardIndex.get(asInt(body.get("cardId")));
            if (cv == null) {
                notice("warn", "Unknown card", "card " + body.get("cardId") + " is not in the last snapshot");
                return;
            }
            if (!c.selectCard(cv, null, null)) {
                // Forge's own answer for "that click did nothing".  The
                // ITriggerEvent argument is a desktop mouse event; null is what
                // Forge's remote client sends for exactly this reason.
                notice("warn", "Not selectable", "card " + cv.getId() + " cannot be selected now");
            }
            break;
        }
        case "clickPlayer": {
            final PlayerView pv = playerIndex.get(asInt(body.get("playerId")));
            if (pv == null) {
                notice("warn", "Unknown player", String.valueOf(body.get("playerId")));
                return;
            }
            c.selectPlayer(pv, null);
            break;
        }
        case "clickAbility": {
            final SpellAbilityView sav = abilityIndex.get(asInt(body.get("abilityId")));
            if (sav == null) {
                notice("warn", "Unknown ability", String.valueOf(body.get("abilityId")));
                return;
            }
            c.selectAbility(sav);
            break;
        }
        case "buttonOk":
            c.selectButtonOk();
            break;
        case "buttonCancel":
            c.selectButtonCancel();
            break;
        case "passPriority":
            c.passPriority();                  // genuinely distinct from buttonOk
            break;
        case "useMana": {
            final Object col = body.get("color");
            if (col == null) {
                notice("warn", "useMana", "no colour given");
                return;
            }
            c.useMana(MagicColor.fromName(String.valueOf(col)));
            break;
        }
        case "undo":
            c.undoLastAction();                // self-gated on canUndoLastAction (PCH:2698)
            break;
        case "alphaStrike":
            c.alphaStrike();
            break;
        case "nextGame":
            c.nextGameDecision(NextGameDecision.CONTINUE);
            break;
        case "concede":
            concedeAll();
            break;
        case "setPhaseStop": {
            final Integer pid = asInt(body.get("playerId"));
            final Object phase = body.get("phase");
            final Boolean stop = asBool(body.get("stop"));
            if (pid == null || phase == null || stop == null) {
                notice("warn", "setPhaseStop", "needs {playerId, phase, stop}");
                return;
            }
            setPhaseStop(pid.intValue(), String.valueOf(phase), stop.booleanValue());
            break;
        }
        case "resync":
            onResync();
            break;
        default:
            notice("warn", "Unknown act", action);
        }
    }

    /**
     * <b>Never {@code AbstractGuiGame.concede()}</b> -- that runs a nested
     * {@code showConfirmDialog} (AbstractGuiGame.java:460) from the click thread,
     * where R2 forbids blocking.  Forge's own answer is the original controllers.
     */
    private void concedeAll() {
        for (final IGameController c : getOriginalGameControllers()) {
            c.concede();
        }
    }

    /** Flip one bit in our own stop map; the next priority pass reads it. */
    private void setPhaseStop(final int playerId, final String phaseName, final boolean stop) {
        final PhaseType phase;
        try {
            phase = PhaseType.valueOf(phaseName);
        } catch (final IllegalArgumentException e) {
            notice("warn", "setPhaseStop", "unknown phase " + phaseName);
            return;
        }
        final EnumSet<PhaseType> set = skips.computeIfAbsent(
                Integer.valueOf(playerId), k -> EnumSet.noneOf(PhaseType.class));
        // We store SKIPS; a "stop" is the absence of one.
        if (stop) {
            set.remove(phase);
        } else {
            set.add(phase);
        }
    }

    private IGameController controller() {
        final PlayerView seat = viewer;
        IGameController c = seat == null ? null : getGameController(seat);
        if (c == null) {
            c = getGameController();
        }
        return c;
    }

    @Override
    public void onAnswer(final String askId, final String valueJson) {
        Transport.assertNotGameThread("Transport.Inbound.onAnswer");
        Transport.assertNotEdt("Transport.Inbound.onAnswer");
        String value = valueJson;
        if (value != null) {
            try {
                Json.parse(value);             // validate before it reaches the log
            } catch (final RuntimeException e) {
                notice("warn", "Malformed answer", askId + ": " + value);
                value = null;                  // a malformed answer is a null answer
            }
        }
        final StringBuilder sb = new StringBuilder(64);
        sb.append("{\"askId\":");
        Json.quote(sb, askId);
        sb.append(",\"value\":").append(value == null ? "null" : value).append('}');
        logC2s("answer", sb.toString());

        if (!pool.complete(askId, value)) {
            // Protocol section 2.3: a second answer for a completed askId is
            // dropped with a notice, never applied.
            notice("warn", "Late answer", "ask " + askId + " was already answered");
        }
    }

    @Override
    public void onResync() {
        // Re-push the last input; the next flush re-pushes state.  requestResync
        // is Forge's delta-sync recovery and is a no-op for a snapshot protocol.
        //
        // mutateInput, NOT engineInput: a resync is a CLIENT frame (protocol
        // section 2.4) and any transport may send one at any time, including
        // before Forge has asked this seat for anything.  Arming `inputSeen`
        // here disarmed applyAct's pre-input guard, so M3's browser -- which
        // autoconnects, sends `resync`, and may then send `concede` -- would
        // have conceded into Match.prepareAllZones and crashed Forge's setup.
        mutateInput(s -> { });
    }

    @Override
    public void onDisconnect() {
        // Asserted like onAct/onAnswer: this unparks game threads, so it must
        // not be running on one, and it must not be the EDT either.  Reached
        // from mtg-table-io (EOF) and from mtg-table-quit (a console quit).
        Transport.assertNotGameThread("Transport.Inbound.onDisconnect");
        Transport.assertNotEdt("Transport.Inbound.onDisconnect");
        pool.cancelAll();                      // every parked game thread degrades to its default
    }

    /** Close the log.  Idempotent; the transport closes itself. */
    public void close() {
        closed = true;
        try {
            log.close();
        } catch (final java.io.IOException e) {
            System.err.println("LOG CLOSE FAILED: " + e);
        }
    }

    // ==================================================================
    // 9. Answer coercion and marshalling -- all of it in mtgtable.Ask
    // ==================================================================
    //
    // Jetty's parser gives Long, Object[], Map, Boolean and String, and turning
    // those into the objects Forge asked for is pure list-and-map work that
    // needs no view, no game thread and no engine.  It lives in Ask.java for
    // exactly that reason: mtgtable.AskSelfTest drives every kind of it with
    // synthetic inputs in bridge/build.sh, which is the only check that ever
    // runs over the nine ask kinds Forge has not yet dispatched in a recorded
    // game.  These three-line bridges keep the call sites below readable.

    static Integer asInt(final Object o) {
        return Ask.asInt(o);
    }

    static Boolean asBool(final Object o) {
        return Ask.asBool(o);
    }

    static int[] asIntArray(final Object o) {
        return Ask.asIntArray(o);
    }

    static Map<Integer, Integer> asIntMap(final Object o) {
        return Ask.asIntMap(o);
    }

    /** Identity-first index lookup: a {@code CardView}'s equals is by id, which is enough. */
    private static int indexOfIdentity(final List<Object> opts, final Object t) {
        return Ask.indexOfIdentity(opts, t);
    }

    /** A flat {@code act} body, re-serialised for the log. */
    private static String actBody(final String action, final Map<String, Object> body) {
        final JsonOut o = new JsonOut().obj();
        o.n("action", action);
        if (body != null) {
            for (final Map.Entry<String, Object> e : body.entrySet()) {
                if ("action".equals(e.getKey())) {
                    continue;
                }
                final Object v = e.getValue();
                if (v == null) {
                    o.nNull(e.getKey());
                } else if (v instanceof Number) {
                    o.n(e.getKey(), ((Number) v).longValue());
                } else if (v instanceof Boolean) {
                    o.n(e.getKey(), ((Boolean) v).booleanValue());
                } else {
                    o.n(e.getKey(), String.valueOf(v));
                }
            }
        }
        return o.end().done();
    }
}
