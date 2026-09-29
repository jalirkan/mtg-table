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

/*
 * A MAP OF THIS FILE, section by section.
 *
 * This block mirrors the table in docs/guides/java-for-typescript-people.md,
 * chapter 9.2 ("The file, section by section"); the rest of chapter 9 follows
 * one ask and one act through the threads named here.  THIS HEADER IS THE
 * AUTHORITATIVE COPY, because it moves with the code: a change that moves a
 * section, or a member named below, fixes its line numbers here in the same
 * commit, and the guide's table is brought into line from this one.  Every
 * number below was checked with `grep -n` against this file as it stands.  A
 * section runs from its own `// ====` banner to the line before the next one,
 * and the rows are in the file's order.  Comments only: this block changes no
 * bytecode.
 *
 * Threads (chapter 9.1):
 *   GAME  Forge's game thread, Game-0.  The three hops named below run on a
 *         SECOND Game-n worker of Forge's cached pool, which passes the
 *         game-thread assert too; each is tagged `ALLOW hop:` with the decision
 *         that argues it, and tools/lint-bridge.sh fails a fourth (hard rule 3,
 *         D181).
 *   EDT   mtg-table-EDT, HeadlessGuiBase's single-thread executor: Forge draws
 *         its prompts from it, and every act is applied on it (D17).
 *   IO    the transport's thread, where a client's frame arrives: mtg-table-io
 *         (the console, auto and null transports) or netty's mtg-table-ws.
 *   MAIN  MtgTable's main thread: it wires the seat, starts the match, then
 *         waits for games to start and end.
 *   BG    mtg-table-bg, HeadlessGuiBase.runBackgroundTask's threads.  No member
 *         here is written for one in a game; the build's OverRaceSelfTest
 *         drives emit, logC2s and finishGame from them.
 * Locks:
 *   LOG   the current GameLog's monitor, held across numbering a frame AND
 *         pushing it, so no two threads push seq 6 ahead of seq 5.
 *   LIFE  `lifecycle`, the monitor MtgTable's loop waits on: games started and
 *         games finished.
 *   INPUT `inputLock`: the input struct and its generation change together.
 *
 * sec  lines      what is there, and its members (line)
 *                 thread | lock | governed by
 * ---  ---------  --------------------------------------------------------------
 * -    212-252    the class comment, then the class declaration (251): the three
 *                 rules this file is written to -- a push touches only getId() on a
 *                 view; only the game thread may block; no thread of ours is named Game*
 *                 - | - | report 07 section 2.5, hard rules 2 and 3
 * -    253-794    construction and injected wiring: the constructor (580),
 *                 setHostedMatch (600), setSession (605), setLogFactory (615),
 *                 awaitGameEnd (639) and awaitGameStart (644) with their await
 *                 (671), the run summary's counters from unimplemented (688) to
 *                 refreshesSkipped (787)
 *                 MAIN | LIFE, for the game counters | report 07 section 3; D44
 * -    795-984    frame emission: emit (806), logC2s (889), envelope (925),
 *                 notice (952), unimpl (973), fired (981)
 *                 whichever thread emits: GAME (`state`), EDT (`input`, notices),
 *                 IO, MAIN (game 1's `hello_ok`), and BG in the build | LOG, taken
 *                 at 844 and 909, with `over` re-checked under it at 865 and 910 |
 *                 protocol sections 1 and 8.4: `over` is terminal (OverRaceSelfTest)
 * 1    985-1193   openView, the wiring hook: openView (997), seedPhaseStops (1084),
 *                 resetForGame (1139), the one reset hook between games
 *                 game 1: MAIN, the caller of HostedMatch.startMatch; later games:
 *                 EDT, from an `act: newGame` | LIFE; `deferred` and INPUT inside the
 *                 reset | report 07 section 4.1; D44 and amendment M38; D38
 * 2    1194-1552  handleGameEvents, THE snapshot hook: handleGameEvents (1211),
 *                 flushState (1226), OutcomeWatcher (1314), FinishWatcher (1336),
 *                 engineFinished (1352), the test hooks (1376-1484), captureOutcome
 *                 (1498; its hop is at 1504, tagged D39)
 *                 GAME; a batch that arrives on any other thread is buffered in
 *                 `deferred` (1213-1220); engineFinished runs on the EDT | `deferred`'s
 *                 monitor; LOG through emit | hard rule 3, D5; D114 (FinishWatcher);
 *                 D39 (the hop); amendments M4 and M11
 * 3    1553-1866  the input path: InputState (1558), engineInput (1614),
 *                 mutateInput (1625), inputBody (1641), showPromptMessage (1692),
 *                 updateButtons (1707), setSelectables (1730), setHighlighted (1756),
 *                 setCard (1792) and the rest of the prompt pushes
 *                 Forge pushes from the EDT, from GAME and from the thread of a click
 *                 | INPUT (1630-1637); the push goes out after it is released
 *                 (1638) | D22 (inputGen), amendment M42 (inputSeen), protocol
 *                 section 4
 * 4    1867-2039  the other pushes: updateCurrentPlayer (1877, AbstractGuiGame's
 *                 own abstract member), the overlays, message (1928), showErrorDialog
 *                 (1934), finishGame (1940), engineCrashed (1962), afterGameEnd
 *                 (1975), emitOver (1992)
 *                 mostly the EDT; engineCrashed on the dying Game-n thread; emitOver
 *                 on whichever thread saw the outcome | `this`, so `over` goes out
 *                 once; LIFE, for games finished | amendments M4 and M11; D114; D115
 * 5    2040-2152  openZones / tempShowZones, hints and not questions: tempShowZones
 *                 (2054), openZones (2070), restoreOldZones (2091), hideZones (2097),
 *                 the zone-hint helpers (2102-2151)
 *                 EDT (openZones sometimes GAME) | INPUT, through engineInput |
 *                 protocol section 4.3
 * 6    2153-2170  phase stops: isUiSetToSkipPhase (2163), asked on every step
 *                 GAME | none (a ConcurrentHashMap) | D19, D38
 * 6b   2171-2393  the comfort snapshot, the four M6 answers Snap cannot compute:
 *                 the Snap.Comfort object (2180), stopNames (2235), activeYieldJson
 *                 (2251), undoStateJson (2292), rawYieldKey (2338; lint rule 4b's
 *                 one tagged key read is at 2339), handleFor (2343), standingYield (2368)
 *                 GAME, inside Snap.state | none | D41, D42
 * 7    2394-3299  the ask path: ask (2412), decode (2477), the option writers
 *                 (2500-2596), then the blocking members: getAbilityToPlay (2601)
 *                 and its asynchronous menu (2708-2836; its hop is at 2723, tagged
 *                 D22), confirm (2839), getChoices (2931), order (2974),
 *                 chooseSingleEntityForEffect (3038), assignCombatDamage (3120),
 *                 assignGenericAmount (3182), manipulateCardList (3234), sideboard
 *                 (3274) and the rest
 *                 GAME, which parks until the answer comes; getAbilityToPlay arrives
 *                 on the EDT and hops (D22) | LOG while the ask is numbered
 *                 (2450-2458); none while parked | protocol sections 5 and 5.4 (null
 *                 is always an answer); D15, D24; D20, D22
 * 8    3300-4033  the inbound path, acts: onAct (3305), applyAct (3332), concede
 *                 (3516), setPhaseStop (3598), newGame (3700), yieldTo (3768),
 *                 setYield (3849), refreshState (3941; its hop is at 3950, tagged
 *                 D39), refreshSnapshot (3974), enginePausedForSeat (4022)
 *                 onAct on IO; applyAct and every act on the EDT; refreshSnapshot on
 *                 a second Game-n worker | LOG, for the act's c2s line | D17, D39,
 *                 D41, D42, D114, amendment M8
 * 8b   4034-4282  the acts that write the engine from the EDT, then answers, resync
 *                 and disconnect: notNow (4054), engineFacts (4099), GuardFeeds
 *                 (4108), pressOk (4151), onAnswer (4171), onResync (4206),
 *                 onDisconnect (4261), close (4274)
 *                 notNow and pressOk on the EDT; onAnswer, onResync and onDisconnect
 *                 on IO | none of its own: volatile reads and atomics (a frame written
 *                 here takes LOG in emit or logC2s) | D136, amendment M48; D27,
 *                 amendment M42; D24
 * 9    4283-4339  answer coercion: asInt (4295), asBool (4299), asIntArray (4303),
 *                 asIntMap (4307), indexOfIdentity (4312), actBody (4317); the
 *                 rest of it lives in Ask.java
 *                 any thread (pure functions) | none | protocol section 5.3
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
import forge.game.event.GameEventGameFinished;
import forge.game.event.GameEventGameOutcome;
import forge.game.phase.PhaseType;
import forge.game.player.DelayedReveal;
import forge.game.player.IHasIcon;
import forge.game.player.Player;
import forge.game.player.PlayerView;
import forge.game.spellability.SpellAbilityView;
import forge.game.zone.ZoneType;
import forge.gamemodes.match.AbstractGuiGame;
import forge.gamemodes.match.HostedMatch;
import forge.gamemodes.match.NextGameDecision;
import forge.gamemodes.match.input.Input;
import forge.gamemodes.match.input.InputPassPriority;
import forge.gamemodes.match.input.InputPayMana;
import forge.gamemodes.match.input.InputQueue;
import forge.gui.FThreads;
import forge.gui.control.GameEventForwarder;
import forge.interfaces.IGameController;
import forge.item.PaperCard;
import forge.localinstance.properties.ForgePreferences;
import forge.localinstance.properties.ForgePreferences.FPref;
import forge.localinstance.skin.FSkinProp;
import forge.model.FModel;
import forge.player.AutoYieldStore;
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

    /** Game 1's id, and the stem every later game's id is built from. */
    private final String baseGameId;
    /**
     * The id of the game being played <b>now</b>: {@link #baseGameId} for game 1,
     * {@code <base>-g<n>} after that (protocol amendment M38).  Volatile because
     * the swap happens on the EDT inside {@link #openView} and every emitter
     * thread reads it.
     */
    private volatile String gameId;
    private final Transport transport;
    /**
     * The frame log of the game being played now -- <b>one file per game</b>,
     * because line 0 of a log is its session header and a second header in the
     * middle of a file is not a frame (protocol section 8).
     */
    private volatile GameLog log;
    /** Opens game <i>n</i>'s log; injected by {@link MtgTable}. */
    private LogFactory logs;
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
    /**
     * Bumped by <b>every</b> {@code input} re-emission ({@link #mutateInput}, so
     * {@link #engineInput} and {@code onResync} both count).  It exists for one
     * reader: {@link #emitAbilityMenu}, which builds an ask body on a
     * <em>second</em> {@code Game-n} thread and must not walk the view graph
     * after Forge has left the input that asked for it (decision <b>D22</b>).
     */
    private final AtomicLong inputGen = new AtomicLong();
    private final AtomicInteger errors = new AtomicInteger();
    /** M6 acts the seat actually used, for the run summary and the evidence table. */
    private final AtomicInteger newGamesRequested = new AtomicInteger();
    private final AtomicInteger yieldsSet = new AtomicInteger();
    private final AtomicInteger yieldsTo = new AtomicInteger();
    private final AtomicInteger phaseStopsSet = new AtomicInteger();
    /** {@code undo} acts APPLIED to the engine -- D136: one refused as "Not now" is not an undo. */
    private final AtomicInteger undosApplied = new AtomicInteger();
    /** D39: refresh hops that found the engine running and skipped the walk. */
    private final AtomicInteger refreshesSkipped = new AtomicInteger();

    // ---- D136: the acts that write the engine from the EDT ----------------
    /**
     * {@code undo} and {@code useMana} acts refused with {@code notice {title:"Not
     * now"}} because the engine was not quiet (decision <b>D136</b>, protocol
     * amendment M48): {@code {undo, useMana}}.
     */
    private final AtomicInteger undosNotNow = new AtomicInteger();
    private final AtomicInteger useManaNotNow = new AtomicInteger();
    /**
     * Our own view-walking hops ({@link #refreshState}, {@link #asyncAbilityMenu})
     * between their submission -- on the EDT -- and the end of their runnable.
     * Counted from submission, not from the worker's start, so a hop the pool has
     * accepted but not yet scheduled is already in flight (D136 condition 7).
     */
    private final AtomicInteger hopsInFlight = new AtomicInteger();
    /**
     * Every game thread that has entered the bridge ({@link #flushState},
     * {@link #ask}): the threads whose {@link Thread#getState} D136's last
     * condition reads.  {@code Game-0}, Forge's own workers once they emit or
     * ask, and our hops.  A handful for the life of the process (the cached pool
     * reuses its threads); a terminated one is dropped when it is next seen.
     */
    private final Set<Thread> engineThreads = ConcurrentHashMap.newKeySet();
    /** Asks a game thread has registered with {@link ReplyPool}: the engine answering a press by ASKING. */
    private final AtomicLong engineAsks = new AtomicLong();
    /**
     * D136 condition 6: the last OK / pass this EDT gave an
     * {@code InputPassPriority} that is still up, with the input generation and
     * {@link #engineAsks} as they were before the press.  While all three are
     * unchanged, Forge may be running the pass on a worker (the mana-lost
     * confirm) that has not reached the bridge yet.  Written and read on the EDT.
     * {@link ActGuard.PassMark}, so the guard's pure half judges it.
     */
    private volatile ActGuard.PassMark passPress;

    /**
     * D136: a {@code concede} that arrived while the engine was not quiet.  The
     * seat's outcome is already written (one field); the rest of
     * {@code PlayerControllerHuman.concede()} -- the player-list walk -- waits
     * for the engine to end the game itself or to park on this seat.  While it
     * is set, the seat is asked nothing more: {@link #ask} answers null at once.
     */
    private volatile boolean pendingConcede;
    /** One {@link #retryConcede} on the EDT at a time. */
    private final java.util.concurrent.atomic.AtomicBoolean concedeRetryPosted =
            new java.util.concurrent.atomic.AtomicBoolean();
    /** How many times {@link #retryConcede} has looked since the concede was deferred. */
    private final AtomicInteger concedeRetries = new AtomicInteger();
    /** {@link #retryConcede}'s poll: every 25 ms, for up to 30 s, then it gives up and says so. */
    private static final int CONCEDE_RETRY_MS = 25;
    private static final int CONCEDE_RETRY_LIMIT = 1200;
    /** D136: concedes applied at once, and deferred: {@code {now, deferred}}. */
    private final AtomicInteger concedesNow = new AtomicInteger();
    private final AtomicInteger concedesDeferred = new AtomicInteger();

    /**
     * Frames that passed a fast-path check ({@link #emit}, {@link #logC2s}, the ask
     * path), then lost the race to {@code over} and were dropped by the re-check under
     * the log's monitor.  Not an error -- the drop IS the fix -- but counted,
     * because a race nobody can see is a race nobody can prove closed.
     */
    private final AtomicInteger lateFramesDropped = new AtomicInteger();

    // ---- the ask path ----------------------------------------------------
    /** askId -> the ask-local option array.  The ONE identity map in the ask path. */
    private final Map<String, List<Object>> pendingOpts = new ConcurrentHashMap<>();
    /** abilityId -> view, filled by every {@code ability_menu}, read by {@code clickAbility}. */
    private final Map<Integer, SpellAbilityView> abilityIndex = new ConcurrentHashMap<>();
    /**
     * askId -&gt; the ask-local option array of an ask <b>no game thread is parked
     * on</b>.  Today that is exactly one kind: the asynchronous
     * {@code ability_menu} {@link #asyncAbilityMenu} pushes when the engine asks
     * which of a card's abilities to play from inside a click, i.e. on the EDT,
     * where blocking is forbidden.  Its answer arrives through {@link #onAnswer}
     * like any other and is applied with {@code IGameController.selectAbility};
     * it is never registered with {@link ReplyPool}, because there is nothing to
     * unpark.
     */
    private final Map<String, List<Object>> asyncAsks = new ConcurrentHashMap<>();

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
    /** Every seat's id, in {@code openView} order, so "the other seats" is answerable. */
    private volatile List<Integer> seatIds = List.of();

    // ---- auto-yield: the opaque handle table (report 11 section 5.2) ------
    /**
     * {@code StackItemView.getKey()} -&gt; the handle we ship, and back.
     *
     * <p><b>This pair of maps is the only place a raw Forge yield key exists in
     * this process</b>, and that is the point: the key is
     * {@code CardView.toString() + ": " + the ability's text}, i.e. a card name,
     * its id and its rules text -- the text channel report 06 section 4 opens
     * with.  {@code state.stack[].yieldKey} carries {@code "y7"} instead,
     * interned for the life of one game, and {@code act: setYield} resolves it
     * back here.  {@code tools/lint-bridge.sh} rule 4b fails a build in which
     * {@code getKey()} is called on <b>any</b> identifier declared
     * {@code StackItemView} anywhere under {@code bridge/src} except the single
     * tagged line in {@link #rawYieldKey} -- the rule works from the declared
     * type rather than from the receiver's spelling precisely so that renaming
     * {@code si} to {@code top} does not turn it off -- and
     * {@code tools/check-redaction.mjs} fails a log whose {@code yieldKey}
     * contains a space or a {@code (}.
     */
    private final Map<String, String> keyToHandle = new ConcurrentHashMap<>();
    private final Map<String, String> handleToKey = new ConcurrentHashMap<>();
    private final AtomicInteger handleSeq = new AtomicInteger();

    // ---- the `input` struct, assembled from four threads ------------------
    private final Object inputLock = new Object();
    private final InputState in = new InputState();

    private volatile String overBody;
    /**
     * True once a {@code state} carrying a non-null {@code gameOver} has been
     * emitted.  M2 follow-up 1 / amendment M4: {@code over} is emitted "after
     * the state that carries it", and the committed
     * {@code fixtures/games/human-auto-42.jsonl} was one state short of that,
     * because {@code captureOutcome} reached {@code emitOver} through the
     * forwarder rather than through a flush of its own.  {@link #captureOutcome}
     * now reads this flag and emits the missing snapshot itself.
     */
    private volatile boolean gameOverStateEmitted;
    /** A {@link #captureOutcome} is queued on Forge's game pool; {@link #emitOver} waits for it. */
    private volatile boolean captureInFlight;
    private volatile boolean overEmitted;
    /**
     * <b>Forge has finished the current game</b> -- decision <b>D114</b>,
     * protocol amendment <b>M45</b>.  Set on the EDT by {@link #engineFinished},
     * which {@link FinishWatcher} queues there from the game's own thread once
     * {@code GameEventGameFinished} has been dispatched to every subscriber.
     *
     * <p>Our {@code over} is emitted at the OUTCOME ({@link #captureOutcome}),
     * which is well before Forge has finished with the game: after the outcome
     * the game thread still runs {@code Match.startGame}'s tail (ownership
     * changes, cache clears, {@code GameEventGameFinished}, a {@code System.gc()}),
     * and {@code FControlGameEventHandler} answers {@code GameEventGameFinished}
     * by queueing {@code showPromptMessage}, {@code updateButtons} and
     * {@code finishGame()} on the EDT for this very object.  A client that
     * answers {@code over} with {@code act: newGame} at once could get its act
     * onto the EDT first -- measured once in two gate runs at a load average of
     * 15-32 (PLAN.md slice-4 follow-up 13(c)) and every time with
     * {@link #HOLD_GAME_END_MS} -- and then the restart ran, {@link #openView}
     * re-armed {@link #overEmitted} for game n+1, and game n's late
     * {@code finishGame()} emitted game n+1's {@code over} before it had dealt a
     * card.  {@link #newGame} therefore QUEUES an act that arrives before this
     * is set, and {@link #engineFinished} applies it.
     */
    private volatile boolean engineFinished;
    /** The early {@code act: newGame} {@link #engineFinished} will apply.  Written and run on the EDT. */
    private volatile Runnable queuedNewGame;
    /**
     * <b>A test hook, and nothing else</b> (decision D114): hold the game thread
     * this many ms after it has emitted {@code over}, so the window between the
     * outcome and {@code GameEventGameFinished} is wide open and an immediate
     * {@code act: newGame} lands in it every time.  Read once from the
     * environment variable {@code MTGTABLE_HOLD_GAME_END_MS}; unset (the only
     * value anybody plays with) it is 0 and costs nothing.  Gate step 10g sets
     * it, which is what turns 13(c) from a load-dependent flake into a
     * deterministic regression test.
     */
    static final long HOLD_GAME_END_MS = holdGameEndMs();
    /**
     * <b>A test hook, and nothing else</b> (decision <b>D136</b>): hold the game
     * thread this many ms -- spinning, so it reads RUNNABLE, as a thread doing
     * engine work does -- at the first <em>undo window</em> of a game: a
     * {@code state} this seat can undo from ({@code undo.can}, depth &gt; 0) has
     * just gone out and <b>no input is up</b>.  That is the moment the story
     * branch's gate run crashed in: the mana payment's {@code stop()} has removed
     * the {@code InputPayMana} and is flushing our forwarder, and the next thing
     * the engine does is count the latch down and let {@code Game-0} put the spell
     * on the stack -- {@code MagicStack.add} &rarr; {@code recordUndoableActions}
     * &rarr; {@code clearUndoStack}.  A client that answers that {@code state}
     * with {@code act: undo} lands inside the hold every time, which turns a race
     * the gate hit once into a reproduction that runs the same way every run.
     * Read once from {@code MTGTABLE_HOLD_UNDO_WINDOW_MS}; unset (the only value
     * anybody plays with) it is 0 and costs nothing.  Holds once per game, and
     * stops holding for the session once an undo has arrived during a hold.
     */
    static final long HOLD_UNDO_WINDOW_MS = envMs("MTGTABLE_HOLD_UNDO_WINDOW_MS");
    /**
     * <b>The negative control, and nothing else</b> (D136): with
     * {@code MTGTABLE_TEST_UNGUARDED_ACTS=1} the bridge applies {@code undo} and
     * {@code useMana} whenever they arrive, as it did before D136, so the
     * reproduction above can be shown to go red with the guard off.  Announced on
     * stderr when the class loads; nothing in the repo sets it except the
     * negative-control run in {@code tools/undo-race-repro.sh}.
     */
    static final boolean TEST_UNGUARDED_ACTS = unguardedActs();
    /** The game thread {@link #HOLD_UNDO_WINDOW_MS} is holding right now, or null. */
    private volatile Thread undoWindowHolder;
    /** {@link #HOLD_UNDO_WINDOW_MS}: this game's hold has happened. */
    private volatile boolean undoWindowHeldThisGame;
    /** {@link #HOLD_UNDO_WINDOW_MS}: an undo has arrived during a hold, so no more holds. */
    private volatile boolean undoWindowRaced;
    /** {@link #HOLD_UNDO_WINDOW_MS}: holds, and holds across which the undo stack changed. */
    private final AtomicInteger undoWindowHolds = new AtomicInteger();
    private final AtomicInteger undoWindowMutated = new AtomicInteger();
    /** Acts that arrived while a hold was on, and what became of them: {@code {refused, applied}}. */
    private final AtomicInteger undoWindowRefused = new AtomicInteger();
    private final AtomicInteger undoWindowApplied = new AtomicInteger();
    /** {@link #TEST_UNGUARDED_ACTS}: writes the guard would have refused and did not. */
    private final AtomicInteger unguardedWrites = new AtomicInteger();
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
     *
     * <p><b>It has a second reader, and it is on the wire</b> (amendment
     * <b>M42</b>): {@link #onResync} re-emits an {@code input} only once this is
     * armed, so the client's first {@code input} is a truthful proxy for "the
     * engine has asked this seat something" and a client may treat it as this
     * guard lifting.  Before M42 a connect re-delivered the empty pre-engine
     * struct and a client that acted on it had its act dropped.
     */
    private volatile boolean inputSeen;

    /**
     * The session's own clock, in games (<b>M6</b>).
     *
     * <p>A {@code CountDownLatch} was the right shape while a process played
     * exactly one game; it cannot be reset, and a match now plays several.  These
     * two counters plus one monitor say everything {@link MtgTable}'s loop needs:
     * {@code gamesStarted} is bumped by {@link #openView}, {@code gamesFinished}
     * by {@link #emitOver}, and every waiter parks on {@code lifecycle}.
     */
    private final Object lifecycle = new Object();
    private int gamesStarted;
    private int gamesFinished;
    /** {@code over.matchOver} of the last game that ended -- which mode a `newGame` needs. */
    private volatile boolean matchOver;

    public WireGuiGame(final String gameId, final Transport transport, final GameLog log) {
        this.baseGameId = gameId;
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

    /**
     * Injected before {@code startMatch}: how to open game <i>n</i>'s frame log
     * (<b>M6</b>).  Without one, a session that survives {@code over} keeps
     * writing into game 1's file, which would put a second session header in the
     * middle of it.
     */
    public void setLogFactory(final LogFactory f) {
        this.logs = f;
    }

    /** Opens the frame log for one game.  {@code MtgTable} knows where {@code var/} is. */
    public interface LogFactory {
        GameLog open(String gameId) throws java.io.IOException;
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

    /** Blocks until game {@code n} has emitted its {@code over}. */
    public boolean awaitGameEnd(final int n, final long ms) throws InterruptedException {
        return await(ms, () -> gamesFinished >= n);
    }

    /** Blocks until game {@code n} has run {@code openView}, i.e. has begun. */
    public boolean awaitGameStart(final int n, final long ms) throws InterruptedException {
        return await(ms, () -> gamesStarted >= n);
    }

    /** How many games this session has started / finished. */
    public int gamesStarted() {
        synchronized (lifecycle) {
            return gamesStarted;
        }
    }

    public int gamesFinished() {
        synchronized (lifecycle) {
            return gamesFinished;
        }
    }

    /** {@code over.matchOver} of the game that ended last. */
    public boolean matchOver() {
        return matchOver;
    }

    /** The id of the game being played now (protocol amendment M38). */
    public String gameId() {
        return gameId;
    }

    private boolean await(final long ms, final java.util.function.BooleanSupplier done)
            throws InterruptedException {
        final long deadline = System.nanoTime() + ms * 1_000_000L;
        synchronized (lifecycle) {
            while (!done.getAsBoolean()) {
                final long left = (deadline - System.nanoTime()) / 1_000_000L;
                if (left <= 0) {
                    return false;
                }
                lifecycle.wait(left);
            }
            return true;
        }
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

    /** Frames dropped because they lost the race to {@code over}; see {@link #lateFramesDropped}. */
    public int lateFramesDropped() {
        return lateFramesDropped.get();
    }

    /**
     * The M6 acts this seat used, for the run summary: {@code {newGame, setYield,
     * yieldTo, setPhaseStop, undo}}.  A typed act with no count anywhere is an
     * act nothing proves end to end (CLAUDE.md, M5 convention 6).
     */
    public int[] comfortActs() {
        return new int[] {newGamesRequested.get(), yieldsSet.get(), yieldsTo.get(),
                          phaseStopsSet.get(), undosApplied.get()};
    }

    /**
     * D136: the acts refused with {@code notice {title:"Not now"}} because the
     * engine was not quiet on this seat, {@code {undo, useMana}}.  Not an error --
     * the refusal IS the fix -- but counted, because a guard nobody can see the
     * cost of is a guard nobody checks.
     */
    public int[] actsNotNow() {
        return new int[] {undosNotNow.get(), useManaNotNow.get()};
    }

    /** D136: concedes applied whole at once, and deferred until the engine was quiet or ended the game. */
    public int[] concedes() {
        return new int[] {concedesNow.get(), concedesDeferred.get()};
    }

    /** {@link #TEST_UNGUARDED_ACTS}: writes applied that the guard would have refused, or -1 when it is off. */
    public int unguardedWrites() {
        return TEST_UNGUARDED_ACTS ? unguardedWrites.get() : -1;
    }

    /**
     * {@link #HOLD_UNDO_WINDOW_MS}'s record, or null when the hook is off:
     * {@code {holds, holds across which the undo stack changed, acts refused
     * during a hold, acts applied during a hold}}.
     */
    public int[] undoWindowHook() {
        if (HOLD_UNDO_WINDOW_MS <= 0L) {
            return null;
        }
        return new int[] {undoWindowHolds.get(), undoWindowMutated.get(), undoWindowRefused.get(),
                          undoWindowApplied.get()};
    }

    /**
     * How many M6 refresh hops declined to walk the view graph because the
     * engine was running rather than parked (decision <b>D39</b>).  Not an
     * error: the act was applied and the next engine-driven flush carries its
     * effect.  A number here is the trade being visible instead of silent.
     */
    public int refreshesSkipped() {
        return refreshesSkipped.get();
    }

    public PlayerView seat() {
        return viewer;
    }

    // ==================================================================
    // Frame emission.  Every frame, both directions, also lands in the log.
    // ==================================================================

    /**
     * Push an s2c frame and append it to {@code var/games/<id>/frames.jsonl}.
     *
     * @return whether the frame was numbered and handed to the transport; false
     *         when it was dropped (closed, after {@code over}, or a failure), so
     *         a caller that records "this frame went out" records only the truth
     */
    private boolean emit(final String type, final String body) {
        if (closed) {
            return false;
        }
        if (overEmitted && !"over".equals(type)) {
            // Protocol sections 7 and 8.4: `over` is the TERMINAL frame of a
            // session.  Forge goes on pushing after it -- a concede's wind-down
            // calls afterGameEnd, which calls updateButtons and showPromptMessage,
            // and measured over a WebSocket that put an empty `input` on the wire
            // and on disk AFTER `over` (seq 10 after seq 9).  Nothing downstream
            // wants it: the client has torn the board down and the gate asserts
            // `tail -1` is `over`.  Dropped here rather than raced against
            // close(), so the invariant is structural and not lucky.
            return false;
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
            // The monitor is held across the push, not just across the
            // numbering.  `emit` is reached from four threads, and with the two
            // steps apart two of them can take seq 5 and seq 6 and then push in
            // the order 6, 5 -- which is invisible in the frame log (GameLog
            // writes in seq order) and visible on a socket, where it is a client
            // applying an older snapshot over a newer one.  GameLog.s2c is
            // synchronized on the same object, so this is one reentrant
            // acquisition; every `push` implementation is non-blocking by
            // Transport's own contract, which is what makes it safe to hold.
            // Read the volatile field ONCE: M6 swaps it between games, and
            // synchronizing on one object while writing to another is a lock
            // that protects nothing.
            final GameLog l = log;
            synchronized (l) {
                // THE CHECK AGAIN, under the monitor that numbers the frame.
                // The one above is a fast path and nothing more: a thread that
                // read `overEmitted` false there could be descheduled, the
                // concede's `emitOver` could set the flag, take this monitor and
                // push `over`, and the first thread would then resume, take the
                // monitor and number its `input` one past `over`.  Measured, not
                // imagined: three gate runs at a load average of 20-60 failed
                // 10a / 10b / 10g on "the last frame of the ws session is not
                // `over`", an empty `input` one seq after it.
                //
                // The invariant is: ONCE `overEmitted` IS SET, ONLY `over` IS
                // EMITTED.  It is not "a frame that got here first is numbered
                // ahead of `over`": `emitOver` sets the flag and may then sleep
                // up to a second waiting for the outcome capture before it
                // numbers `over`, so a frame that takes this monitor inside that
                // window -- before `over` has a seq at all -- sees the flag and
                // is dropped too.  Only a frame numbered before the flag was set
                // precedes `over`.  So `over` is the last frame `emit` numbers
                // and the last it pushes, structurally (an ask is pushed outside
                // this method -- see the note in ask()).
                if (overEmitted && !"over".equals(type)) {
                    lateFramesDropped.incrementAndGet();
                    System.err.println("EMIT AFTER OVER dropped: " + type + " lost the race to "
                            + "`over` (protocol section 8.4)");
                    return false;
                }
                final int seq = l.s2c(type, body);
                transport.push(envelope(seq, type, body));
                return true;
            }
        } catch (final RuntimeException e) {
            errors.incrementAndGet();
            System.err.println("EMIT FAILED " + type + ": " + e);
            return false;
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
        if (overEmitted) {
            // The same rule from the other direction: section 8.4's terminal
            // frame is terminal for the FILE, and a click that arrives after the
            // game ended has nothing to act on.  It is still dispatched (the
            // caller does that); it is only not written after the end.
            System.err.println("C2S AFTER OVER not logged: " + type);
            return;
        }
        try {
            // The same race as `emit`'s, and the same answer: a click read
            // `overEmitted` false above, `over` went out, and the click would
            // then be written after it -- the file's terminal frame is no longer
            // `over`.  Re-checked under the log's own monitor (GameLog.c2s is
            // synchronized on it too, so this is one reentrant acquisition), and
            // read the volatile field ONCE for the reason `emit` gives.
            final GameLog l = log;
            synchronized (l) {
                if (overEmitted) {
                    lateFramesDropped.incrementAndGet();
                    System.err.println("C2S AFTER OVER not logged: " + type + " lost the race to "
                            + "`over`");
                    return;
                }
                l.c2s(type, body);
            }
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
        final int n;
        synchronized (lifecycle) {
            n = ++gamesStarted;
        }
        if (n > 1) {
            // M6, protocol amendment M38.  HostedMatch.endCurrentGame() nulled
            // the Game, cleared the human controllers and replaced every
            // PlayerView, so everything we cached is stale -- and openView is
            // the hook Forge gives us for exactly this moment (report 11
            // section 8.3).  It runs BEFORE the handshake below, so the first
            // frame of the new game is a `hello_ok` written into a new file.
            resetForGame(n);
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
        synchronized (lifecycle) {
            lifecycle.notifyAll();             // "game n has begun" -- MtgTable's loop waits on it
        }

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

            // 4. D114: "Forge has finished game n", from game n's own bus.
            //    Subscribed LAST, so FControlGameEventHandler (subscribed by
            //    HostedMatch.startGame before openView) has queued its EDT
            //    wind-down and our forwarder has taken the event before this
            //    sees it.  Keyed by n, so it can never release game n+1.
            hosted.getGame().subscribeToEvents(new FinishWatcher(n));
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
        final List<Integer> ids = new ArrayList<>();
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
            ids.add(Integer.valueOf(pv.getId()));
        }
        seatIds = List.copyOf(ids);
    }

    /**
     * <b>M6.</b>  Everything a new game invalidates, in one place.
     *
     * <p>Runs on the EDT, from {@link #openView}, between
     * {@code HostedMatch.endCurrentGame()} and the first frame of game
     * <i>n</i>.  The reset list is report 11 section 8.3's, and every line of it
     * is a stale cache that would otherwise resolve an {@code act} against a
     * dead object:
     *
     * <ul>
     *   <li>the card / player / ability indexes and the concealed-id set -- every
     *       view object in them belongs to a finished game;</li>
     *   <li>the yield-handle table -- its keys embed card ids from that game;</li>
     *   <li>the phase-stop map -- reseeded from the preferences by
     *       {@link #seedPhaseStops}, so a per-game toggle really is per game
     *       -- report 11 section 13's open question 6, now decision <b>D38</b>
     *       (Forge's desktop seeds once per MATCH; the rejected alternative and
     *       the comfort cost are written down there);</li>
     *   <li>the ask bookkeeping and the {@link ReplyPool}, reopened so the next
     *       ask can park;</li>
     *   <li>the over latch and the {@code input} struct;</li>
     *   <li>and the frame log, which becomes a <b>new file</b> under a new
     *       {@code gameId}.</li>
     * </ul>
     *
     * <p>What is deliberately <b>not</b> reset: {@link #askSeq}, so an askId is
     * unique for the life of the socket and a late answer from the previous game
     * cannot complete this game's ask by collision; the transport; and
     * {@code FModel}.  The whole point of the feature is not paying
     * {@code FModel.initialize} again.
     */
    private void resetForGame(final int n) {
        final GameLog old = log;
        gameId = baseGameId + "-g" + n;
        if (logs != null) {
            try {
                log = logs.open(gameId);
            } catch (final java.io.IOException e) {
                // Keep playing into the old file rather than killing the match:
                // a game that cannot be recorded is still a game, and the
                // summary prints the failure.
                errors.incrementAndGet();
                System.err.println("LOG OPEN FAILED for " + gameId + ": " + e);
            }
        }
        if (log != old) {
            try {
                old.close();
            } catch (final java.io.IOException e) {
                System.err.println("LOG CLOSE FAILED for the previous game: " + e);
            }
        }
        cardIndex = Map.of();
        playerIndex = Map.of();
        concealedNow = Set.of();
        abilityIndex.clear();
        pendingOpts.clear();
        asyncAsks.clear();
        keyToHandle.clear();
        handleToKey.clear();
        handleSeq.set(0);
        skips.clear();
        synchronized (deferred) {
            deferred.clear();
        }
        synchronized (inputLock) {
            in.reset();
        }
        overBody = null;
        gameOverStateEmitted = false;
        captureInFlight = false;
        inputSeen = false;
        forwarder = null;
        engineFinished = false;                // D114: game n has only just begun
        queuedNewGame = null;
        passPress = null;                      // D136: its input belonged to the finished game
        pendingConcede = false;                // D136: a concede belongs to the game it was sent in
        undoWindowHeldThisGame = false;        // D136's test hook holds once per game
        pool.reopen();
        // LAST: `emit` drops every non-`over` frame while this is set, and the
        // handshake below is the first frame of the new game.
        overEmitted = false;
        System.err.println("NEW GAME " + n + " " + gameId + ": caches, phase stops, reply pool and "
                + "frame log rebuilt from openView (protocol amendment M38)");
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
        engineThreads.add(Thread.currentThread());   // D136: a game thread that walks is one the guard watches
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
            final String body = Snap.state(gameId, gameView, viewer, all, comfort);
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
            // D136's reproduction: armed BEFORE the frame goes out, so an act the
            // client sends the instant it reads this state finds the hold on.
            final boolean holdUndoWindow = armUndoWindowHoldForTest();
            final boolean pushed = emit("state", body);
            if (pushed) {
                stateFrames.incrementAndGet();
            }
            if (pushed && gameView.isGameOver()) {
                // Snap.state writes `gameOver` iff GameView.isGameOver(), so
                // this is the same predicate the frame was built from, read on
                // the same thread one line later.  Only when the frame really
                // went out: `emit` drops a `state` that arrives once
                // `overEmitted` is set (another thread's emitOver can be waiting
                // for this very capture), and marking a dropped frame as sent
                // would silence emitOver's "OVER WITHOUT A gameOver STATE" on
                // exactly the run where it is true.
                gameOverStateEmitted = true;
            }
            if (captured) {
                // The RESULT is the trigger, not finishGame(): see emitOver.
                // After the state that carries `gameOver`, so the terminal frame
                // is still `over` (protocol sections 7 and 8.4).
                emitOver();
            }
            if (holdUndoWindow) {
                spinUndoWindowHoldForTest();   // D136's reproduction; never reached unless the env var is set
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
                holdGameEndForTest();
            }
        }
    }

    /**
     * <b>D114.</b>  Game {@code n}'s {@code GameEventGameFinished}, seen on game
     * {@code n}'s own event bus and therefore on game {@code n}'s own thread,
     * after every earlier subscriber.  It walks nothing: it only queues
     * {@link #engineFinished} on the EDT, BEHIND the {@code showPromptMessage} /
     * {@code updateButtons} / {@code finishGame()} that
     * {@code FControlGameEventHandler} queued there a moment ago (our EDT is one
     * FIFO thread), so the queued {@code act: newGame} runs after the last thing
     * Forge does to this object for game {@code n}.  Nothing posts to game
     * {@code n}'s bus after this event ({@code Match.startGame} returns), so our
     * old forwarder never flushes again either.
     */
    private final class FinishWatcher {
        private final int game;

        FinishWatcher(final int game) {
            this.game = game;
        }

        @Subscribe
        public void receive(final GameEvent ev) {
            if (ev instanceof GameEventGameFinished) {
                FThreads.invokeInEdtLater(() -> engineFinished(game));
            }
        }
    }

    /** EDT.  Game {@code game} is finished on Forge's side: a queued {@code newGame} may now run. */
    private void engineFinished(final int game) {
        final int current;
        synchronized (lifecycle) {
            current = gamesStarted;
        }
        if (game != current) {
            // Cannot happen while newGame waits for this -- game n+1 does not
            // start until game n's finish has run -- but the pre-start concede
            // (M11) lets a restart skip the wait, so say so rather than release
            // the wrong game.
            System.err.println("GAME FINISHED for game " + game + " while game " + current
                    + " is being played: ignored (D114)");
            return;
        }
        engineFinished = true;
        final Runnable queued = queuedNewGame;
        queuedNewGame = null;
        if (queued != null) {
            System.err.println("NEW GAME RELEASED: Forge has finished " + gameId
                    + ", so the queued `newGame` runs now (D114, protocol amendment M45)");
            queued.run();
        }
    }

    private static long holdGameEndMs() {
        return envMs("MTGTABLE_HOLD_GAME_END_MS");
    }

    /** A non-negative millisecond count from the environment; unset, empty or garbage is 0. */
    private static long envMs(final String name) {
        final String v = System.getenv(name);
        if (v == null || v.isEmpty()) {
            return 0L;
        }
        try {
            return Math.max(0L, Long.parseLong(v.trim()));
        } catch (final NumberFormatException e) {
            System.err.println(name + "=" + v + " is not a number; ignored");
            return 0L;
        }
    }

    private static boolean unguardedActs() {
        final boolean on = "1".equals(System.getenv("MTGTABLE_TEST_UNGUARDED_ACTS"));
        if (on) {
            System.err.println("TEST HOOK: MTGTABLE_TEST_UNGUARDED_ACTS=1 -- undo and useMana are applied "
                    + "WITHOUT D136's guard, as before it.  A negative control; never play with this set.");
        }
        return on;
    }

    /** {@link #HOLD_UNDO_WINDOW_MS}: the undo depth when the hold was armed. */
    private int undoWindowDepth;

    /**
     * {@link #HOLD_UNDO_WINDOW_MS}, first half: on a game thread, just before a
     * {@code state} goes out, and only in a test.  Arms the hold -- the
     * {@link #undoWindowHolder} mark goes up BEFORE the frame, so an act the
     * client sends the instant it reads the frame is seen to arrive during the
     * hold -- when this is the undo window.  Every read here is a game-thread
     * read of the same kind {@link #undoStateJson} makes for the snapshot.
     */
    private boolean armUndoWindowHoldForTest() {
        if (HOLD_UNDO_WINDOW_MS <= 0L || undoWindowRaced || undoWindowHeldThisGame || overEmitted || closed) {
            return false;
        }
        final PlayerControllerHuman h = humanController();
        if (h == null) {
            return false;
        }
        final InputQueue q = h.getInputQueue();
        if (q == null || q.getInput() != null || !h.canUndoLastAction()) {
            return false;                      // parked (or about to be), or nothing to undo: not the window
        }
        final int depth = undoDepth();
        if (depth <= 0) {
            return false;
        }
        undoWindowHeldThisGame = true;
        undoWindowHolds.incrementAndGet();
        undoWindowDepth = depth;
        undoWindowHolder = Thread.currentThread();
        System.err.println("TEST HOOK: holding " + Thread.currentThread().getName() + " " + HOLD_UNDO_WINDOW_MS
                + " ms in the undo window (MTGTABLE_HOLD_UNDO_WINDOW_MS): the state going out offers undo "
                + "{can:true, depth:" + depth + "} and no input is up -- the engine is between the mana payment "
                + "and the stack");
        return true;
    }

    /** {@link #HOLD_UNDO_WINDOW_MS}, second half: after the frame went out, spin, then say what changed. */
    private void spinUndoWindowHoldForTest() {
        final String me = Thread.currentThread().getName();
        final int before = undoWindowDepth;
        try {
            final long end = System.nanoTime() + HOLD_UNDO_WINDOW_MS * 1_000_000L;
            while (System.nanoTime() < end && !closed) {
                Thread.onSpinWait();           // RUNNABLE, as a thread inside the engine is
            }
        } finally {
            undoWindowHolder = null;
        }
        final int after = undoDepth();
        if (after != before) {
            undoWindowMutated.incrementAndGet();
            System.err.println("TEST HOOK: UNDO STACK MUTATED UNDER A RUNNING ENGINE THREAD: depth " + before
                    + " -> " + after + " while " + me + " was held inside the engine (the D136 race)");
        } else {
            System.err.println("TEST HOOK: undo window released; the undo stack is untouched (depth " + before
                    + ")");
        }
    }

    /** The rules engine's undo stack depth, or 0 with no game.  Game thread (a read the snapshot also makes). */
    private int undoDepth() {
        if (hosted == null || hosted.getGame() == null || hosted.getGame().getStack() == null) {
            return 0;
        }
        return hosted.getGame().getStack().getUndoStackSize();
    }

    /** {@link #HOLD_GAME_END_MS}: on the game thread, after {@code over}, and only in a test. */
    private void holdGameEndForTest() {
        if (HOLD_GAME_END_MS <= 0L || !ThreadUtil.isGameThread() || !overEmitted) {
            return;
        }
        System.err.println("TEST HOOK: holding the game thread " + HOLD_GAME_END_MS + " ms after `over` "
                + "(MTGTABLE_HOLD_GAME_END_MS) so an immediate newGame lands before Forge finishes the game");
        try {
            Thread.sleep(HOLD_GAME_END_MS);
        } catch (final InterruptedException e) {
            Thread.currentThread().interrupt();
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
            ThreadUtil.invokeInGameThread(this::captureOutcome);  // ALLOW hop: D39 captureOutcome -- only at game end (hard rule 3)
            return;
        }
        try {
            overBody = Snap.over(gameView);
            // Which mode a `newGame` needs: `continue` is the next game of this
            // match, `restart` a fresh one.  Read here, on the game thread, with
            // the body it is part of.
            matchOver = gameView.isMatchOver();
            if (forwarder != null) {
                forwarder.flush();             // ship the final state with gameOver set
            }
            if (!gameOverStateEmitted) {
                // M2 follow-up 1.  `forwarder.flush()` ships whatever the
                // forwarder happens to be holding, and on the concede path it is
                // routinely holding nothing -- so the run ended with `over` and
                // no `gameOver` snapshot in front of it, which is exactly what
                // amendment M4 promises does not happen.  Measured before this
                // line existed: fixtures/games/human-auto-42.jsonl had 1,611
                // lines / 227 `state` frames and the same seed re-recorded gave
                // 1,610 / 226.  We are on the game thread here (the method
                // hopped if it had to), so emitting it is legal exactly here and
                // nowhere else.
                flushState(List.of());
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
        /**
         * {@code updateButtons}' sixth argument (protocol amendment M39).  It
         * names <b>button 1</b>, so it is a boolean on Forge's side and
         * {@code "ok"} or null on ours; Space activates the focused button, and
         * that is the whole reason "space = OK" is not a Forge shortcut.
         */
        private boolean okFocused;
        private final Set<Integer> selectable = new LinkedHashSet<>();
        private int selMin;
        private int selMax;
        private final Set<Integer> highlighted = new LinkedHashSet<>();
        private final Set<Integer> weak = new LinkedHashSet<>();
        private final Map<Integer, Set<String>> openZones = new LinkedHashMap<>();

        /** Back to the constructed state, for a new game (M6). */
        private void reset() {
            prompt = "";
            focusCardId = null;
            focusCardJson = null;
            okLabel = "OK";
            cancelLabel = "Cancel";
            okEnabled = false;
            cancelEnabled = false;
            okFocused = false;
            selectable.clear();
            selMin = 0;
            selMax = 0;
            highlighted.clear();
            weak.clear();
            openZones.clear();
        }
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
        if (pendingConcede && concedeRetryPosted.compareAndSet(false, true)) {
            // D136: the engine is showing this seat something, so it is parking
            // (or has parked) here: finish the deferred concede on the EDT.
            FThreads.invokeInEdtLater(this::retryConcede);
        }
    }

    /** Apply an input change and re-emit the frame.  Says nothing about who asked. */
    private void mutateInput(final Consumer<InputState> f) {
        if (closed) {
            return;
        }
        final String frame;
        synchronized (inputLock) {
            f.accept(in);
            // D22: the generation moves BEFORE the frame is built, and inside the
            // lock, so a reader that saw generation N is reading a board no later
            // than the one frame N described.
            inputGen.incrementAndGet();
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
        // Protocol amendment M39.  "cancel" is in the declared type and is not
        // reachable from this emitter: Forge's focus1 is a boolean naming button
        // one.  Writing the string rather than the boolean is what lets a later
        // focus2 land without a v bump.
        o.n("focus", s.okFocused ? "ok" : null);
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
        // section 0.1).  `focus1` is protocol amendment M39 -- M6 stopped
        // dropping it, because "Space presses OK" is not a Forge behaviour:
        // Space presses the FOCUSED button, and this argument is which one.
        engineInput(s -> {
            s.okLabel = label1 == null ? "" : label1;
            s.cancelLabel = label2 == null ? "" : label2;
            s.okEnabled = enable1;
            s.cancelEnabled = enable2;
            s.okFocused = focus1;
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

    /** Set by {@link #engineCrashed}: why Forge's game loop died, or null. */
    private volatile Throwable engineFailure;

    /**
     * <b>Forge's game loop died with an exception</b> (decision <b>D115</b>,
     * {@link EngineCrash}).  Called on the dying {@code Game-n} thread by the
     * default uncaught-exception handler {@link MtgTable} installs, after the
     * trace is on stderr.  No outcome is coming, so this ends the game the only
     * honest way: an error {@code notice} -- our own words, never the engine's,
     * because the engine's names a card, and the card can be the opponent's
     * (hard rule 8) -- and then {@code over}, which carries amendment M11's
     * null body and prints {@code OVER WITHOUT A gameOver STATE}.  The frame log
     * therefore ends in {@code over}, a client stops waiting, and
     * {@link MtgTable} exits non-zero with the cause.  If {@code over} is
     * already out (a death in {@code Match.startGame}'s tail) both frames are
     * dropped by {@link #emit} and only the exit code changes.
     */
    public void engineCrashed(final Throwable e) {
        engineFailure = e;
        notice("error", "Engine error", "The rules engine stopped with an error, so this game cannot "
                + "continue. The server log has the details.");
        emitOver();
    }

    /** Why Forge's game loop died, or null if it did not (D115). */
    public Throwable engineFailure() {
        return engineFailure;
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
        if (!gameOverStateEmitted) {
            // Amendment M4 as softened on 2026-09-11 (amendment M11): `over`
            // follows the `state` that carries `gameOver` on every path that has
            // one, and this is the path that does not.  A concede during the
            // pre-game prompts is answered by applyAct's pre-`inputSeen` guard,
            // which ends the session without ever reaching Forge's own
            // game-over: there is no outcome to snapshot and nowhere legal to
            // build one (we are on the EDT).  Say so on stderr rather than let a
            // reader infer it from a missing frame.
            System.err.println("OVER WITHOUT A gameOver STATE: the game ended before Forge "
                    + "published an outcome (protocol amendment M11)");
        }
        String body = overBody;
        if (body == null) {
            // The engine never published a win condition we could read on the
            // game thread.  Protocol section 7 declares `reason` nullable for
            // exactly this window; "" would misreport it as a known empty one.
            body = new JsonOut().obj().nNull("winner").nNull("reason").n("matchOver", true).end().done();
            matchOver = true;                  // nothing to continue into
        }
        emit("over", body);
        synchronized (lifecycle) {
            gamesFinished++;
            lifecycle.notifyAll();
        }
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

    // ==================================================================
    // 6b. The comfort snapshot -- phase stops, yield, undo, yield handles
    // ==================================================================
    //
    // Snap is a pure serialiser and must not reach for a controller or a
    // HostedMatch, so the four M6 answers it cannot compute are handed to it as
    // this object (protocol amendments M32, M34, M35, M36).  Every method runs
    // on the GAME THREAD, inside Snap.state.

    private final Snap.Comfort comfort = new Snap.Comfort() {
        @Override public List<String> stopsOnTurnOf(final int playerId) {
            return stopNames(skips.get(Integer.valueOf(playerId)));
        }

        @Override public List<String> stopsOffTurnOf(final int playerId) {
            // "while anybody else is the turn player".  With one opponent this
            // is exactly that seat's set; the union is what makes it total for
            // a table that has more, without pretending we support one.
            EnumSet<PhaseType> others = null;
            for (final Integer id : seatIds) {
                if (id.intValue() == playerId) {
                    continue;
                }
                final EnumSet<PhaseType> set = skips.get(id);
                final EnumSet<PhaseType> theirs =
                        set == null ? EnumSet.noneOf(PhaseType.class) : set;
                if (others == null) {
                    others = EnumSet.copyOf(theirs);
                } else {
                    // Skipped only where EVERY other seat skips -- i.e. STOPPED
                    // wherever any of them stops, which is what "opp" means.
                    // `null` rather than isEmpty() as the first-iteration test:
                    // a seat that legitimately skips nothing is an empty set,
                    // and treating that as "no data" would let the next seat
                    // overwrite it.
                    others.retainAll(theirs);
                }
            }
            return others == null ? List.of() : stopNames(others);
        }

        @Override public String yieldJson() {
            return activeYieldJson();
        }

        @Override public String undoJson() {
            return undoStateJson();
        }

        @Override public String yieldHandle(final forge.game.spellability.StackItemView si) {
            return handleFor(si);
        }

        @Override public String yieldMode(final forge.game.spellability.StackItemView si) {
            return standingYield(si);
        }
    };

    /**
     * The complement of a skip set: every phase the game <b>stops</b> at, in
     * {@code PhaseType} order.  {@code UNTAP} is never in it -- it has no
     * preference and no priority pass, so it can be neither stopped at nor
     * skipped (report 11 section 3.2).
     */
    private static List<String> stopNames(final EnumSet<PhaseType> skipped) {
        final PhaseType[] phases = PhaseType.values();
        final List<String> out = new ArrayList<>(phases.length);
        for (int p = 1; p < phases.length; p++) {
            if (skipped == null || !skipped.contains(phases[p])) {
                out.add(phases[p].name());
            }
        }
        return out;
    }

    /**
     * {@code state.yield} (protocol amendment M34).  Forge allows exactly one
     * yield at a time -- each setter clears the other two -- so this reads as a
     * three-way discrimination and not as three flags.
     */
    private String activeYieldJson() {
        final IGameController c = controller();
        if (c == null) {
            return null;
        }
        final forge.gamemodes.match.YieldController y = c.getYieldController();
        if (y == null) {
            return null;
        }
        final PlayerView me = viewer;
        final JsonOut o = new JsonOut().obj();
        if (y.autoPassUntilEndOfTurn()) {
            o.n("kind", "endOfTurn").nInt("playerId", me == null ? null : Integer.valueOf(me.getId()))
             .nNull("phase");
        } else if (y.autoPassUntilStackEmpty()) {
            o.n("kind", "stack").nInt("playerId", me == null ? null : Integer.valueOf(me.getId()))
             .nNull("phase");
        } else {
            final forge.gamemodes.match.YieldMarker m = y.getAutoPassUntilMarker();
            if (m == null) {
                return null;
            }
            final PlayerView owner = m.getPhaseOwner();
            o.n("kind", "marker")
             .nInt("playerId", owner == null ? null : Integer.valueOf(owner.getId()))
             .n("phase", m.getPhase() == null ? null : m.getPhase().name());
        }
        return o.end().done();
    }

    /**
     * {@code state.undo} (protocol amendment M35).  {@code canUndoLastAction()}
     * is on {@code PlayerControllerHuman} and <b>not</b> on
     * {@code IGameController}, and the depth is the rules engine's own undo
     * stack -- both game-thread reads, taken with the rest of the snapshot.
     *
     * <p>It holds <b>mana abilities only</b> and Forge clears it at every phase
     * change and whenever priority leaves this seat, so a client that renders
     * "Undo" as "take back my last move" is promising something the engine does
     * not do.
     */
    private String undoStateJson() {
        boolean can = false;
        int depth = 0;
        final PlayerControllerHuman h = humanController();
        if (h != null) {
            can = h.canUndoLastAction();
        }
        if (hosted != null && hosted.getGame() != null && hosted.getGame().getStack() != null) {
            depth = hosted.getGame().getStack().getUndoStackSize();
        }
        return new JsonOut().obj().n("can", can).n("depth", depth).end().done();
    }

    /** Our seat's controller as the concrete type, for the two members not on the interface. */
    private PlayerControllerHuman humanController() {
        if (hosted == null) {
            return null;
        }
        final PlayerView me = viewer;
        PlayerControllerHuman first = null;
        for (final PlayerControllerHuman h : hosted.getHumanControllers()) {
            if (first == null) {
                first = h;
            }
            if (me != null && h.getPlayer() != null && h.getPlayer().getView() != null
                    && h.getPlayer().getView().getId() == me.getId()) {
                return h;
            }
        }
        // One human seat is the whole configuration (MtgTable rejects --seat 1),
        // so the fallback is the same object; it is a fallback and not the rule
        // because `undo` must never be answered for somebody else's stack.
        return me == null ? first : null;
    }

    /**
     * <b>THE</b> call to {@code StackItemView.getKey()} in this bridge.
     *
     * <p>Its value is {@code CardView.toString() + ": " + the ability's text} --
     * a card name, its id and its rules text (report 11 section 5.2) -- which is
     * the text channel report 06 section 4 opens with.  It never leaves this
     * class: {@link #handleFor} interns it behind an opaque {@code "y<n>"} and
     * that is what {@code state.stack[].yieldKey} carries.
     * {@code tools/lint-bridge.sh} fails a build in which {@code getKey()}
     * appears on a stack item anywhere else.
     */
    private static String rawYieldKey(final forge.game.spellability.StackItemView si) {
        return si == null ? null : si.getKey();   // ALLOW getKey: the yield-handle table
    }

    /** Mint or recall this item's opaque handle.  Interned for the life of one game. */
    private String handleFor(final forge.game.spellability.StackItemView si) {
        final String raw = rawYieldKey(si);
        if (raw == null || raw.isEmpty()) {
            return null;
        }
        final String known = keyToHandle.get(raw);
        if (known != null) {
            return known;
        }
        final String minted = "y" + handleSeq.incrementAndGet();
        final String won = keyToHandle.putIfAbsent(raw, minted);
        if (won != null) {
            return won;
        }
        handleToKey.put(minted, raw);
        return minted;
    }

    /**
     * {@code stack[].yielded}: {@code "yes"}, {@code "no"} or null -- the
     * engine's standing answer for this item.  A trigger decision wins over a
     * plain auto-yield because it is the more specific statement; a plain
     * auto-yield reads as {@code "yes"} because that is what it does (the
     * priority loop passes and the ability resolves).
     */
    private String standingYield(final forge.game.spellability.StackItemView si) {
        final String raw = rawYieldKey(si);
        if (raw == null || raw.isEmpty()) {
            return null;
        }
        final IGameController c = controller();
        if (c == null) {
            return null;
        }
        final AutoYieldStore.TriggerDecision d = c.getTriggerDecision(raw);
        if (d == AutoYieldStore.TriggerDecision.ACCEPT) {
            return "yes";
        }
        if (d == AutoYieldStore.TriggerDecision.DECLINE) {
            return "no";
        }
        return c.shouldAutoYield(raw) ? "yes" : null;
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
        engineThreads.add(Thread.currentThread());   // D136: e.g. the mana-lost confirm's worker
        if (closed || overEmitted) {
            return null;                       // degrade, never wedge
        }
        if (pendingConcede) {
            // D136: this seat has conceded and the engine has not ended the game
            // yet.  It is asked nothing more: the section 5.4 default, at once, so
            // the game thread reaches the state-based check that ends the game.
            System.err.println("ASK AFTER CONCEDE: " + kind + " -> null (D136)");
            return null;
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

            // emit()'s race, on the ask path: the check at the top of this
            // method ran before flushState and the body, and a concede's `over`
            // can be numbered in between.  Re-checked under the log's monitor,
            // where `over` is numbered too, so an ask is either ahead of `over`
            // in the FILE or not in it at all.  Numbered BEFORE the pool
            // registration, which only has to precede the push inside
            // transport.ask, so a dropped ask leaves nothing registered.
            // NOT on the wire: the push happens in transport.ask, after this
            // monitor is released, so a concede's `over` can be numbered after
            // this ask and still reach the socket before it.  Open, and not
            // covered by OverRaceSelfTest (PLAN.md, Tier 2 slice 4's follow-up
            // 13(d)); closing it means restructuring the transport's ask.
            final GameLog l = log;
            final int seq;
            synchronized (l) {
                if (overEmitted) {
                    lateFramesDropped.incrementAndGet();
                    System.err.println("ASK AFTER OVER dropped: " + kind + " lost the race to `over` "
                            + "(protocol section 8.4) -> null");
                    return null;               // the top-of-method answer: degrade, never wedge
                }
                seq = l.s2c("ask", body);
            }
            pool.register(askId, kind);        // register BEFORE push
            engineAsks.incrementAndGet();      // D136 condition 6: the engine answered a press by asking
            if (pool.pending() > 1) {
                System.err.println("ASK OVERLAP " + pool.pending() + " pending -- a second game thread");
            }
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
            // We are on mtg-table-EDT, inside a click: `act: clickCard` ->
            // IGameController.selectCard -> InputPassPriority.onCardSelected ->
            // PlayerControllerHuman.getAbilityToPlay.  R2 forbids blocking here,
            // so this used to return a bare null -- and a card with two or more
            // playable abilities was therefore UNPLAYABLE from any client, as a
            // SILENT no-op: no state, no input, not even a notice, because
            // selectCard still returns true.  Measured in Chrome on A.I.M.
            // Scientists ({3}{U} cast + `K:TypeCycling:Basic:2` landcycling):
            // `act clickCard 2` was the last line of the frame log and zero
            // frames came back.
            //
            // So the menu goes out ASYNCHRONOUSLY instead -- an `ability_menu`
            // ask that no game thread is parked on, applied later by
            // {@link #applyAsyncAbilityMenu} through
            // IGameController.selectAbility.  That is the same path
            // `act: clickAbility` uses, and Forge implements it as
            // InputPassPriority.selectAbility(sa): set chosenSa, stop() -- which
            // is exactly what a non-null return from here would have caused.
            asyncAbilityMenu(host, abilities);
            return null;                       // the caller null-checks (PCH:226)
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

    /**
     * Push an {@code ability_menu} that <b>nobody is parked on</b>, from off the
     * game thread.  Never blocks; returns immediately.
     *
     * <p>Two hops, and both are forced.  The caller is {@code mtg-table-EDT},
     * where R2 forbids blocking <em>and</em> hard rule 3 forbids walking the
     * Forge view graph -- and an ask body carries option <b>labels</b>, which are
     * read off {@code SpellAbilityView} and {@code CardView}.  So the body is
     * built on Forge's own game pool ({@code ThreadUtil.invokeInGameThread},
     * whose threads are named {@code Game-n} and where the walk is legal), which
     * is the identical hop {@link #captureOutcome} makes for the identical
     * reason.
     *
     * <p><b>Which thread that is, and what actually excludes it</b> (decision
     * <b>D22</b>; the earlier wording here claimed more than was true).
     * {@code ThreadUtil.invokeInGameThread} is
     * {@code Executors.newCachedThreadPool(new WorkerThreadFactory("Game"))}, and
     * {@code Game-0} is busy running this match for the whole game, so the body
     * is necessarily built on a <b>second</b> {@code Game-n} thread -- measured:
     * {@code Game-0} and {@code Game-1} are both live for the duration of a
     * {@code --transport auto} game that raises menus.  Both pass
     * {@code ThreadUtil.isGameThread()} (a bare {@code startsWith("Game")}), so
     * hard rule 3's mechanical check cannot tell them apart, and the property the
     * rule protects -- never walk while the game mutates -- is the one that has
     * to be arranged by hand.
     *
     * <p>It is arranged by {@link #inputGen}.  The menu is stamped with the input
     * generation it was raised for and {@link #emitAbilityMenu} returns without
     * touching a view if the generation has moved.  That is sound rather than
     * lucky because of the order inside Forge: the only thing that can free
     * {@code Game-0} is the input being stopped, and
     * {@code InputSyncronizedBase.stop()} runs {@code onStop()} first --
     * {@code InputPassPriority.onStop} &rarr;
     * {@code PlayerControllerHuman.clearActionableCards} &rarr;
     * {@code IGuiGame.clearWeaklySelectable}, i.e. one of our
     * {@link #engineInput} calls -- and only then counts the latch down.  So the
     * generation has already moved by the time the game thread can resume, and a
     * build that sees the old generation is a build the parked thread is still
     * parked for.  A menu dropped this way is stale regardless: Forge has left
     * the input that asked, and the player's click is a no-op they can repeat.
     *
     * <p><b>Not re-delivered by {@code resync}.</b>  The ask never enters
     * {@link ReplyPool}, so {@code WsTransport.resend} does not know about it; a
     * client that reconnects mid-menu simply clicks the card again and gets a
     * fresh one, because Forge's input is still the one that asked.  Answering
     * it with {@code null} is "never mind" and is always legal (protocol
     * section 5.4).
     */
    private void asyncAbilityMenu(final CardView host, final List<SpellAbilityView> abilities) {
        if (host == null) {
            unimpl("getAbilityToPlay(host=null)");
            return;
        }
        if (closed || overEmitted) {
            return;
        }
        final int hostId = host.getId();       // R1: getId() and nothing else, on this thread
        final List<SpellAbilityView> chosen = new ArrayList<>(abilities);
        // D22: the generation is read HERE, on the EDT, inside the click that is
        // asking -- so it is the generation of the input Forge is parked on.
        final long gen = inputGen.get();
        hopsInFlight.incrementAndGet();        // D136: in flight from submission, not from the worker's start
        try {
            ThreadUtil.invokeInGameThread(() -> {  // ALLOW hop: D22 asyncAbilityMenu -- the input-generation stamp (hard rule 3)
                try {
                    emitAbilityMenu(hostId, chosen, gen);
                } finally {
                    hopsInFlight.decrementAndGet();
                }
            });
        } catch (final RuntimeException e) {
            hopsInFlight.decrementAndGet();
            errors.incrementAndGet();
            System.err.println("ASYNC ABILITY MENU NOT SCHEDULED: " + e);
            notice("warn", "Cannot play that yet", "card " + hostId
                    + " has more than one thing it could do, and the menu could not be opened");
        }
    }

    /**
     * <b>A second {@code Game-n} thread from Forge's cached pool, so the view
     * walk passes {@code isGameThread()}.</b>  Build the {@code ability_menu}
     * body and emit it -- unless the input that asked for it is gone.
     *
     * @param gen the {@link #inputGen} the menu was raised at.  If it has moved,
     *            Forge has left that input, the real game thread is free to
     *            mutate the graph, and this method must not read one field off a
     *            view (decision <b>D22</b>).  Checked before the walk and again
     *            before the frame goes out.
     */
    private void emitAbilityMenu(final int hostId, final List<SpellAbilityView> abilities,
                                 final long gen) {
        if (closed || overEmitted) {
            return;
        }
        if (inputGen.get() != gen) {
            // Not an error: the player clicked again (or Forge moved on) inside
            // the millisecond it took to get here.  The click is a no-op they can
            // repeat, and repeating it is much cheaper than a silently corrupted
            // Tracker.
            System.err.println("ABILITY MENU STALE for card " + hostId
                    + ": the input moved on before the body was built (D22)");
            return;
        }
        try {
            final List<Object> opts = new ArrayList<>(abilities);
            for (final SpellAbilityView sav : abilities) {
                abilityIndex.put(Integer.valueOf(sav.getId()), sav);
            }
            final String askId = "a" + askSeq.incrementAndGet();
            // Only the newest menu is live.  A stale one would apply a choice the
            // player has already moved past, and the board is modal while an ask
            // is outstanding, so there is never more than one to lose.
            asyncAsks.clear();
            asyncAsks.put(askId, opts);
            askKinds.add("ability_menu");
            final JsonOut o = new JsonOut().obj();
            o.n("askId", askId).n("kind", "ability_menu")
             .n("timeoutMs", transport.askTimeoutMs("ability_menu"));
            o.n("cardId", hostId);
            options(o, "options", opts, 0, opts.size(), null);
            final String body = o.end().done();
            if (inputGen.get() != gen) {
                // The walk finished, but the input moved while it ran: the menu
                // would open over a board the player has already left, and
                // answering it would call selectAbility on a finished input.
                asyncAsks.remove(askId);
                System.err.println("ABILITY MENU STALE after the build for card " + hostId
                        + ", not emitted (D22)");
                return;
            }
            emit("ask", body);
        } catch (final RuntimeException e) {
            errors.incrementAndGet();
            System.err.println("ASYNC ABILITY MENU FAILED: " + e);
            notice("warn", "Cannot play that yet", "card " + hostId
                    + " has more than one thing it could do, and the menu could not be built");
        }
    }

    /**
     * Apply the answer to an asynchronous {@code ability_menu}.
     *
     * <p>Runs on the inbound thread (never a game thread, never the EDT -- see
     * {@link #onAnswer}), and hops to the EDT for the act itself, exactly as
     * {@link #onAct} does: {@code InputBase.finished} is a plain non-volatile
     * field and desktop Forge is safe only because both ends of it are the EDT.
     */
    private void applyAsyncAbilityMenu(final String askId, final List<Object> opts,
                                       final String valueJson) {
        final Integer i = asInt(decode(valueJson));
        if (i == null || i.intValue() < 0 || i.intValue() >= opts.size()) {
            // Section 5.4: every ask is answerable with null.  Here that means
            // "never mind" -- Forge's input is still the one that asked, so the
            // player just keeps playing.
            return;
        }
        final Object chosen = opts.get(i.intValue());
        if (!(chosen instanceof SpellAbilityView)) {
            notice("warn", "Unknown ability", askId + " option " + i);
            return;
        }
        final SpellAbilityView sav = (SpellAbilityView) chosen;
        FThreads.invokeInEdtNowOrLater(() -> {
            try {
                final IGameController c = controller();
                if (c == null) {
                    notice("warn", "No controller", "the game has no controller for this seat yet");
                    return;
                }
                c.selectAbility(sav);
            } catch (final RuntimeException e) {
                System.err.println("ABILITY MENU APPLY FAILED " + askId + ": " + e);
                notice("warn", "Action failed", "ability_menu: " + e);
            }
        });
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
        // D136 / D22: the input generation this act ARRIVED under.  An act that
        // writes the engine directly (undo, useMana) is applied only if the input
        // is still the one it was sent against when its turn on the EDT comes.
        final long genAtArrival = inputGen.get();
        // Dispatch on the virtual EDT, exactly as desktop Forge does:
        // InputBase.finished is a plain non-volatile field written by stop() via
        // invokeInEdtNowOrLater and read by selectCard/selectButtonOk, and
        // desktop is safe only because both ends are the EDT.  It also serialises
        // clicks against prompt rendering for free.
        FThreads.invokeInEdtNowOrLater(() -> {
            try {
                applyAct(action, body, genAtArrival);
            } catch (final RuntimeException e) {
                // Protocol section 2.2: the server tolerates ANY act at any time,
                // including one that is now meaningless.  Drop it with a notice;
                // never crash, never block.
                System.err.println("ACT FAILED " + action + ": " + e);
                e.printStackTrace();           // the message alone is never enough to fix one
                notice("warn", "Action failed", action + ": " + e);
            }
        });
    }

    private void applyAct(final String action, final Map<String, Object> body, final long genAtArrival) {
        if (!ready || !inputSeen) {
            // Typed ahead of the game: there is no controller and no board yet.
            if ("concede".equals(action)) {
                // The one act that still means something: the player wants out
                // before the game has begun.  End the session rather than
                // conceding into Forge's setup, which crashes it.
                System.err.println("CONCEDE BEFORE START: ending the session");
                // D114: Forge never reaches its own game-over on this path, so
                // no GameEventGameFinished is coming for a newGame to wait on;
                // one after this `over` is applied at once, as it always was.
                engineFinished = true;
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
            pressOk(c, c::selectButtonOk);     // D136 condition 6
            break;
        case "buttonCancel":
            c.selectButtonCancel();
            break;
        case "passPriority":
            pressOk(c, c::passPriority);       // genuinely distinct from buttonOk; D136 condition 6
            break;
        case "useMana": {
            final Object col = body.get("color");
            if (col == null) {
                notice("warn", "useMana", "no colour given");
                return;
            }
            // D136: ManaPool.tryPayCostWithColor, from the EDT, checking neither
            // InputBase.finished nor InputPayMana.locked -- a write, so the engine
            // must be quiet on this seat.
            if (notNow("useMana", c, genAtArrival, useManaNotNow)) {
                return;
            }
            c.useMana(MagicColor.fromName(String.valueOf(col)));
            break;
        }
        case "undo":
            // D136: MagicStack.undo(), from the EDT, consulting no input at all --
            // the write that raced Game-0's clearUndoStack.  Applied only while the
            // engine is parked on this seat and nothing else is running; otherwise
            // `notice {title:"Not now"}` and the engine is not touched.
            if (notNow("undo", c, genAtArrival, undosNotNow)) {
                return;
            }
            c.undoLastAction();                // self-gated on canUndoLastAction (PCH:2698)
            undosApplied.incrementAndGet();
            refreshState();
            break;
        case "alphaStrike":
            c.alphaStrike();
            break;
        case "nextGame":
            // The M3 spelling of newGame {mode:"continue"} (protocol 2.2).
            newGame(c, "continue");
            break;
        case "newGame":
            newGame(c, body.get("mode") == null ? "continue" : String.valueOf(body.get("mode")));
            break;
        case "concede":
            concede(c);                        // D136: at once when quiet, else outcome now and the rest later
            break;
        case "setPhaseStop": {
            final Object phase = body.get("phase");
            final Boolean stop = asBool(body.get("stop"));
            if (phase == null || stop == null) {
                notice("warn", "setPhaseStop", "needs {phase, turn, stop}");
                return;
            }
            // Protocol amendment M33: the act names a TURN, relative to this
            // seat -- a seat may only change its own stops, and "own"/"opp" is
            // the same word state.players[].phaseStops uses.  The M3-era
            // {playerId, ...} spelling is still accepted, because the server
            // tolerates any act and nothing is served by breaking one.
            final Object turn = body.get("turn");
            final Integer pid = asInt(body.get("playerId"));
            if (turn == null && pid == null) {
                notice("warn", "setPhaseStop", "needs a turn (\"own\"|\"opp\") or a playerId");
                return;
            }
            phaseStopsSet.incrementAndGet();
            setPhaseStop(turn == null ? null : String.valueOf(turn), pid,
                    String.valueOf(phase), stop.booleanValue());
            refreshState();
            break;
        }
        case "yieldTo":
            yieldsTo.incrementAndGet();
            yieldTo(c, body);
            refreshState();
            break;
        case "setYield":
            setYield(c, body);
            refreshState();
            break;
        case "resync":
            // reEmitInput, NOT onResync: we are on mtg-table-EDT here (onAct
            // dispatches through FThreads.invokeInEdtNowOrLater) and onResync
            // now asserts it is not.  This act is already in the log as an
            // `act`, so it needs no second c2s line either.
            reEmitInput();
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

    /**
     * <b>Decision D136.</b>  {@code PlayerControllerHuman.concede()} is two
     * things: {@code Player.concede()} -- the outcome, one field
     * ({@code PlayerStatistics.outcome}) -- and then
     * {@code GameAction.checkGameOverCondition()} on the calling thread, which
     * walks the player list and removes the loser.  From the EDT while
     * {@code Game-0} runs, that walk met {@code Game-0}'s own
     * ({@code Game.copyLastState}, {@code checkGameOverCondition}) and threw
     * {@code ConcurrentModificationException} -- an engine crash, measured in
     * D136's natural-timing sweep.
     *
     * <p>So: when the engine is quiet on this seat ({@link ActGuard}, the act's
     * own generation aside -- a concede is not a decision about a board) the
     * concede is applied whole, as before.  Otherwise only the outcome is written,
     * and the game ends where every other game ends: {@code Game-0}'s next
     * state-based check ({@code checkStateEffects} &rarr;
     * {@code checkGameOverCondition} &rarr; {@code Player.checkLoseCondition}),
     * on its own thread.  Any ask it is parked in is answered with its default so
     * it can get there, and it is asked nothing more; if it parks on this seat
     * first, {@link #retryConcede} applies the rest.  A concede is never
     * refused: the player wants out.
     */
    private void concede(final IGameController c) {
        final String why = ActGuard.whyNotNow(engineFacts(c, inputGen.get()));
        if (why == null || TEST_UNGUARDED_ACTS) {
            pendingConcede = false;
            concedesNow.incrementAndGet();
            concedeAll();
            return;
        }
        concedesDeferred.incrementAndGet();
        pendingConcede = true;
        for (final IGameController oc : getOriginalGameControllers()) {
            if (oc instanceof PlayerControllerHuman) {
                final Player p = ((PlayerControllerHuman) oc).getPlayer();
                if (p != null) {
                    p.concede();               // the outcome field and nothing else
                }
            }
        }
        final int answered = pool.resolveAll();
        System.err.println("CONCEDE DEFERRED: the engine is not quiet on this seat -- " + why + "; the outcome "
                + "is written and Game-0's own state-based check ends the game" + (answered > 0 ? " (" + answered
                + " parked ask(s) answered with their default)" : "") + " (D136)");
        concedeRetries.set(0);
        if (concedeRetryPosted.compareAndSet(false, true)) {
            FThreads.delayInEDT(CONCEDE_RETRY_MS, this::retryConcede);
        }
    }

    /**
     * EDT.  Finish a deferred {@link #concede} once the engine is quiet on this
     * seat -- which it is only if {@code Game-0} parked here before its own
     * state-based check ended the game.  Posted by every engine {@code input}
     * while a concede is pending, and polled every {@value #CONCEDE_RETRY_MS} ms
     * through Forge's own delayed-EDT facility ({@code FThreads.delayInEDT}: the
     * {@code Delayed} scheduler posts back to this EDT), so no thread of ours is
     * named and none waits: the poll is what finishes a concede whose last input
     * arrived while {@code Game-0} was still between {@code setInput} and
     * parking.
     */
    private void retryConcede() {
        concedeRetryPosted.set(false);
        if (!pendingConcede || overEmitted || closed) {
            return;
        }
        final IGameController c = controller();
        if (c != null && ActGuard.whyNotNow(engineFacts(c, inputGen.get())) == null) {
            pendingConcede = false;
            System.err.println("CONCEDE COMPLETED: the engine parked on this seat before it ended the game (D136)");
            concedeAll();
            return;
        }
        if (concedeRetries.incrementAndGet() > CONCEDE_RETRY_LIMIT) {
            if (concedeRetries.get() == CONCEDE_RETRY_LIMIT + 1) {
                errors.incrementAndGet();
                System.err.println("CONCEDE STILL PENDING after " + (CONCEDE_RETRY_LIMIT * CONCEDE_RETRY_MS / 1000)
                        + " s: the engine neither ended the game nor parked on this seat; the next engine input "
                        + "tries again (D136)");
            }
            return;
        }
        if (concedeRetryPosted.compareAndSet(false, true)) {
            FThreads.delayInEDT(CONCEDE_RETRY_MS, this::retryConcede);
        }
    }

    /**
     * Flip one bit in our own stop map, and tell the controller (report 11
     * section 3.3).
     *
     * <p>The map is what {@link #isUiSetToSkipPhase} answers from, and that is
     * the whole of the feature for a local seat:
     * {@code PlayerControllerHuman.isUiSetToSkipPhase} consults
     * {@code YieldController} only {@code if (isRemoteClient())} and we are not
     * one (asserted in the constructor).  The {@code SkipPhase} update is sent
     * anyway, because it costs one line and it buys Forge's own
     * {@code applyYieldUpdate -> tryAutoPassNow()}: turning a stop <b>off</b>
     * while the game is parked on an {@code InputPassPriority} presses pass
     * immediately, instead of doing nothing until the next priority pass.
     *
     * @param turn {@code "own"} / {@code "opp"} (amendment M33), or null when
     *             the caller named a {@code playerId} instead
     */
    private void setPhaseStop(final String turn, final Integer playerId, final String phaseName,
                              final boolean stop) {
        final PhaseType phase;
        try {
            phase = PhaseType.valueOf(phaseName);
        } catch (final IllegalArgumentException e) {
            notice("warn", "setPhaseStop", "unknown phase " + phaseName);
            return;
        }
        if (phase == PhaseType.UNTAP) {
            // No preference, no priority pass: neither stoppable nor skippable.
            notice("warn", "setPhaseStop", "UNTAP has no priority pass and cannot be a stop");
            return;
        }
        final List<Integer> targets = new ArrayList<>();
        if (turn != null) {
            final PlayerView me = viewer;
            final int mine = me == null ? -1 : me.getId();
            if ("own".equals(turn)) {
                targets.add(Integer.valueOf(mine));
            } else if ("opp".equals(turn)) {
                for (final Integer id : seatIds) {
                    if (id.intValue() != mine) {
                        targets.add(id);
                    }
                }
                if (targets.isEmpty()) {
                    // openView seeds seatIds, so this is "before the game
                    // exists" and never "a game with one player".  Say it
                    // rather than dropping the act silently.
                    notice("warn", "setPhaseStop", "no opponent seat yet");
                    return;
                }
            } else {
                notice("warn", "setPhaseStop", "turn must be \"own\" or \"opp\", got " + turn);
                return;
            }
        } else {
            targets.add(playerId);
        }
        for (final Integer id : targets) {
            final EnumSet<PhaseType> set = skips.computeIfAbsent(
                    id, k -> EnumSet.noneOf(PhaseType.class));
            // We store SKIPS; a "stop" is the absence of one.
            if (stop) {
                set.remove(phase);
            } else {
                set.add(phase);
            }
            pushSkipPhase(id.intValue(), phase, !stop);
        }
    }

    /**
     * Mirror one stop bit to the controller as Forge's own
     * {@code NetworkGuiGame.pushSkipPhaseToControllers} does.  Harmless when the
     * game is not parked on a priority prompt; the point is that it is <b>not</b>
     * harmless when it is.
     */
    private void pushSkipPhase(final int playerId, final PhaseType phase, final boolean skip) {
        final IGameController c = controller();
        PlayerView pv = playerIndex.get(Integer.valueOf(playerId));
        if (pv == null && viewer != null && viewer.getId() == playerId) {
            // playerIndex is built on the game thread with the first snapshot,
            // and a client may set a stop before one exists -- a browser does,
            // from the hello_ok handler.  The map is already updated either way;
            // this is only the mirror to the controller.
            pv = viewer;
        }
        if (c == null || pv == null) {
            return;
        }
        try {
            c.sendYieldUpdate(new forge.gamemodes.match.YieldUpdate.SkipPhase(pv, phase, skip));
        } catch (final RuntimeException e) {
            System.err.println("SKIPPHASE PUSH FAILED: " + e);
        }
    }

    /**
     * {@code act: newGame {mode}} -- protocol amendment M38, report 11 section
     * 8.2.
     *
     * <p>We are on the EDT, which is where {@code HostedMatch.addNextGameDecision}
     * dispatches {@code continueMatch()} / {@code restartMatch()}, so the whole
     * teardown-and-restart runs inline inside this act: by the time it returns,
     * {@link #openView} has emitted the next game's {@code hello_ok}.
     *
     * <p><b>Unless Forge has not finished the game yet</b> (decision D114,
     * amendment M45): {@code over} goes out at the outcome, and an act that
     * answers it at once can arrive while the game thread is still winding the
     * game down.  Such an act is QUEUED -- one of them; a second is dropped --
     * and {@link #engineFinished} applies it the moment Forge has finished, so the
     * client sees the same thing a little later: the next game's
     * {@code hello_ok}.  There is no refusal to send: {@code emit} drops every
     * non-{@code over} frame between games (protocol section 8.4).
     *
     * <p>It is the one act deliberately <b>absent from the frame log</b>:
     * {@code over} is the terminal frame of a file (protocol section 8.4) and an
     * act written after it would take that place.  The server prints it on
     * stderr instead, and the next game's log opens with its own header.
     */
    private void newGame(final IGameController c, final String mode) {
        if (!overEmitted) {
            notice("warn", "newGame", "the game is still running");
            return;
        }
        NextGameDecision decision;
        if ("restart".equals(mode) || "new".equals(mode)) {
            decision = NextGameDecision.NEW;
        } else if ("continue".equals(mode)) {
            decision = NextGameDecision.CONTINUE;
        } else {
            // A notice would be dropped here -- `emit` refuses every non-`over`
            // frame once `over` has gone out (protocol section 8.4), which is
            // also why the two corrections below are corrections and not
            // refusals: between games there is no channel to say "no" on.
            System.err.println("NEW GAME with an unknown mode " + mode + ", reading it as "
                    + "\"continue\" (protocol section 2.2)");
            decision = NextGameDecision.CONTINUE;
        }
        if (decision == NextGameDecision.CONTINUE && matchOver) {
            // `continueMatch()` on a finished match would start a game the Match
            // does not think exists.  The client asked for another game and a
            // fresh match is the only thing that can be one, so give it that
            // rather than dead-ending on a mode the client could only have got
            // right by reading `over.matchOver` first.
            System.err.println("NEW GAME continue after matchOver: reading it as \"restart\", "
                    + "which is the only mode that can produce another game");
            decision = NextGameDecision.NEW;
        }
        if (!engineFinished) {
            if (queuedNewGame != null) {
                System.err.println("NEW GAME mode=" + mode + " dropped: one is already queued for "
                        + gameId + " (D114)");
                return;
            }
            final NextGameDecision queued = decision;
            System.err.println("NEW GAME QUEUED mode=" + mode + " (" + queued + ") after " + gameId
                    + ": Forge has not finished that game yet (D114, protocol amendment M45)");
            newGamesRequested.incrementAndGet();
            queuedNewGame = () -> applyNewGame(c, mode, queued);
            return;
        }
        newGamesRequested.incrementAndGet();
        applyNewGame(c, mode, decision);
    }

    /** EDT.  Hand Forge the next-game decision; the restart runs inline, ending in {@link #openView}. */
    private void applyNewGame(final IGameController c, final String mode, final NextGameDecision decision) {
        System.err.println("NEW GAME REQUESTED mode=" + mode + " (" + decision + ") after "
                + gameId);
        c.nextGameDecision(decision);
    }

    /** True while an early {@code act: newGame} waits for Forge to finish the game (D114). */
    public boolean newGameQueued() {
        return queuedNewGame != null;
    }

    /**
     * {@code act: yieldTo {kind, phase?, turn?}} -- report 11 section 4.
     *
     * <p>Three different engine mechanisms behind one act, all of them reached
     * through {@code IGameController.sendYieldUpdate} and all of them cancelled
     * by the same {@code buttonCancel}: {@code InputLockUI} labels Cancel while
     * a yield runs and its {@code selectButtonCancel()} is
     * {@code clearActiveYieldAndDispatch()}.  There is no {@code cancelYield}
     * act and there must not be one.
     */
    private void yieldTo(final IGameController c, final Map<String, Object> body) {
        final PlayerView me = viewer;
        if (me == null) {
            return;
        }
        final String kind = body.get("kind") == null ? "" : String.valueOf(body.get("kind"));
        switch (kind) {
        case "endOfTurn":
            // Forge's own two-line helper, copied by call and not by body.
            forge.gamemodes.match.YieldController.endTurn(c, me);
            break;
        case "stack":
            c.sendYieldUpdate(new forge.gamemodes.match.YieldUpdate.StackYield(me, true, true));
            break;
        case "marker": {
            final Object phaseName = body.get("phase");
            if (phaseName == null) {
                notice("warn", "yieldTo", "kind \"marker\" needs a phase");
                return;
            }
            final PhaseType phase;
            try {
                phase = PhaseType.valueOf(String.valueOf(phaseName));
            } catch (final IllegalArgumentException e) {
                notice("warn", "yieldTo", "unknown phase " + phaseName);
                return;
            }
            // Whose phase cell: the viewer's own (pass to MY next upkeep) or the
            // opponent's (pass to their end step).  `turn` mirrors setPhaseStop;
            // a playerId is accepted for the same reason it is there.
            final PlayerView owner = markerOwner(body);
            if (owner == null) {
                notice("warn", "yieldTo", "no such player for the marker");
                return;
            }
            // AbstractGuiGame.handleYieldMarkerToggle is protected final and
            // does the whole dance: same cell twice clears the marker, the
            // at-or-past test is taken BEFORE the cell is un-skipped, and only
            // then is the marker set.  Our runnable is its "make this phase a
            // stop" step -- a marker on a phase we skip could never fire.
            handleYieldMarkerToggle(owner, phase, () -> {
                final EnumSet<PhaseType> set = skips.computeIfAbsent(
                        Integer.valueOf(owner.getId()), k -> EnumSet.noneOf(PhaseType.class));
                set.remove(phase);
                pushSkipPhase(owner.getId(), phase, false);
            });
            break;
        }
        default:
            notice("warn", "yieldTo", "kind must be endOfTurn|marker|stack, got " + kind);
        }
    }

    /** Which phase cell a {@code yieldTo {kind:"marker"}} means; the viewer by default. */
    private PlayerView markerOwner(final Map<String, Object> body) {
        final PlayerView me = viewer;
        final Integer pid = asInt(body.get("playerId"));
        if (pid != null) {
            return playerIndex.get(pid);
        }
        final Object turn = body.get("turn");
        if (turn != null && "opp".equals(String.valueOf(turn))) {
            for (final Integer id : seatIds) {
                if (me == null || id.intValue() != me.getId()) {
                    return playerIndex.get(id);
                }
            }
            return null;
        }
        return me;
    }

    /**
     * {@code act: setYield {yieldKey, mode}} -- report 11 section 5, the
     * desktop's own Y / N recipe.
     *
     * <p>The handle is resolved back to Forge's key <b>here</b> and nowhere
     * else. {@code isAbilityScope()} is read from the controller rather than
     * hardcoded: with the default {@code UI_AUTO_DECISION_MODE} it is true, and
     * passing false would store a key Forge then strips and never matches.
     */
    private void setYield(final IGameController c, final Map<String, Object> body) {
        final Object handle = body.get("yieldKey");
        final String mode = body.get("mode") == null ? "" : String.valueOf(body.get("mode"));
        if (handle == null) {
            notice("warn", "setYield", "needs a yieldKey from state.stack[]");
            return;
        }
        final String raw = handleToKey.get(String.valueOf(handle));
        if (raw == null) {
            // A handle from a previous game, or one this seat never saw.
            notice("warn", "setYield", "unknown yieldKey " + handle);
            return;
        }
        final forge.gamemodes.match.YieldController y = c.getYieldController();
        final boolean abilityScope = y != null && y.isAbilityScope();
        final AutoYieldStore.TriggerDecision decision;
        final boolean yield;
        switch (mode) {
        case "yes":
            decision = AutoYieldStore.TriggerDecision.ACCEPT;
            yield = true;
            break;
        case "no":
            decision = AutoYieldStore.TriggerDecision.DECLINE;
            yield = true;
            break;
        case "clear":
            decision = AutoYieldStore.TriggerDecision.ASK;
            yield = false;
            break;
        default:
            notice("warn", "setYield", "mode must be yes|no|clear, got " + mode);
            return;
        }
        // The trigger decision first: PlayerControllerHuman.setTriggerDecision
        // also presses the button NOW when the current input is the InputConfirm
        // for this same key, so "Always Yes" answers the question in front of
        // you as well as every later one.
        c.setTriggerDecision(raw, decision, abilityScope);
        c.setShouldAutoYield(raw, yield, abilityScope);
        yieldsSet.incrementAndGet();
    }

    /**
     * Push a fresh {@code state} after an act whose effect is <b>only</b> visible
     * in a snapshot (<b>M6</b>).
     *
     * <p>Protocol section 2.2 says an act's effect "arrives as the next
     * {@code state} / {@code input}", and for every M2 act that is automatic:
     * clicking a card makes the engine do something and something makes events.
     * {@code setYield} does not.  It changes {@code stack[].yielded} and nothing
     * else, produces no game event, and the engine is parked waiting for this
     * seat -- so with no push the board would never show the toggle it just
     * asked for, and would show it later only by accident.  The same is true of
     * {@code setPhaseStop} on a turn the map is not consulted on.
     *
     * <p>We are on the EDT here and a snapshot may only be built on a game
     * thread (hard rule 3), so it hops -- the same hop {@code captureOutcome} and
     * {@link #asyncAbilityMenu} make for the same reason.  <b>And like
     * {@code asyncAbilityMenu}, the hop needs an exclusion argument, because the
     * thread it lands on is not the one running the game</b> (decision
     * <b>D39</b>; the first cut of this method had none, which is the defect
     * that entry records).  {@code ThreadUtil.invokeInGameThread} is
     * {@code Executors.newCachedThreadPool(new WorkerThreadFactory("Game"))}, so
     * the runnable lands on a <b>second</b> {@code Game-n} worker while
     * {@code Game-0} runs the match; both pass {@code ThreadUtil.isGameThread()}
     * (a bare {@code startsWith("Game")}), so {@code Snap.assertGameThread}
     * cannot tell them apart and the "never walk while the game mutates"
     * property has to be arranged by hand.
     *
     * <p>Unlike {@code asyncAbilityMenu}, which is only ever reached from a click
     * <em>inside</em> a live input, these four acts can arrive at any time: the
     * board's phase-strip dots, Undo, Pass-To and the yield toggles are enabled
     * whenever there is no open ask and no game over -- i.e. right through the
     * AI's turn.  So the stamp is not enough on its own and there are two
     * conditions, both checked on the worker in {@link #refreshSnapshot}:
     * <ol>
     *   <li><b>The input generation has not moved</b> ({@link #inputGen}, read
     *       here on the EDT inside the act that is asking) -- D22's guard,
     *       verbatim; and</li>
     *   <li><b>the engine is parked waiting for this seat</b>
     *       ({@link #enginePausedForSeat()}), which is what makes "{@code Game-0}
     *       is not mutating the graph" a fact rather than a hope.</li>
     * </ol>
     *
     * <p>When either fails the walk is <b>skipped</b>, not forced: the act has
     * already been applied to the engine, and its effect reaches the board on the
     * next engine-driven flush, which while the engine is running is the next
     * {@code handleGameEvents} batch -- milliseconds, not a turn.  The skips are
     * counted and printed by the run summary so the trade is measurable rather
     * than invisible.
     */
    private void refreshState() {
        if (closed || overEmitted || gameView == null || viewer == null) {
            return;
        }
        // D22/D39: read HERE, on the EDT, inside the act that is asking -- so it
        // is the generation of the input the engine is parked on.
        final long gen = inputGen.get();
        hopsInFlight.incrementAndGet();        // D136: in flight from submission, not from the worker's start
        try {
            ThreadUtil.invokeInGameThread(() -> {  // ALLOW hop: D39 refreshState -- the stamp and the parked engine (hard rule 3)
                try {
                    refreshSnapshot(gen);
                } finally {
                    hopsInFlight.decrementAndGet();
                }
            });
        } catch (final RuntimeException e) {
            hopsInFlight.decrementAndGet();
            errors.incrementAndGet();
            refreshesSkipped.incrementAndGet();
            System.err.println("REFRESH NOT SCHEDULED: " + e);
        }
    }

    /**
     * <b>A second {@code Game-n} worker from Forge's cached pool.</b>  Flush one
     * {@code state} -- but only while {@code Game-0} is demonstrably parked on
     * the input this act arrived under (decision <b>D39</b>).
     *
     * @param gen the {@link #inputGen} the act was applied at.  If it has moved,
     *            the engine has left that input and the real game thread is free
     *            to mutate the graph.
     */
    private void refreshSnapshot(final long gen) {
        if (closed || overEmitted || gameView == null || viewer == null) {
            return;
        }
        if (inputGen.get() != gen) {
            // D22's own words: a build that sees a moved generation is a build
            // the parked thread is no longer parked for.
            refreshesSkipped.incrementAndGet();
            return;
        }
        if (!enginePausedForSeat()) {
            refreshesSkipped.incrementAndGet();
            return;
        }
        flushState(List.of());
    }

    /**
     * Is the game thread parked waiting for <b>this</b> seat?  Asked of the
     * engine, never guessed -- and never by matching a prompt string
     * (CLAUDE.md, M5 convention 4).
     *
     * <p>Two ways it can be, and both are ours to see:</p>
     * <ul>
     *   <li><b>Parked inside our own {@code ask()}</b>: {@link ReplyPool#pending()}
     *       is non-zero from {@code pool.register} -- which {@link #ask} calls
     *       before it hands the frame to the transport -- until the game thread
     *       itself removes the entry on the way out.  Between those two points
     *       the game thread is inside {@code ReplyPool}, not inside the game.</li>
     *   <li><b>Parked inside a Forge input</b>:
     *       {@code InputQueue.getInput()} is a plain
     *       {@code BlockingDeque.peek()} over the input stack (javap-confirmed:
     *       {@code isEmpty} then {@code peek}, no view touched, no lock taken).
     *       {@code InputSyncronizedBase.showAndWait()} is
     *       {@code inputQueue.setInput(this); awaitLatchRelease();} and
     *       {@code stop()} runs {@code onStop()} -> our {@code engineInput}
     *       pushes -> {@code removeInput} -> {@code countDown}, in that order.
     *       So a non-null input means a thread is sitting in
     *       {@code cdlDone.await()} for it, and for a one-human match that
     *       thread is {@code Game-0}.  {@code InputLockUI} -- what Forge shows
     *       while a yield runs -- is an {@code Input} and not an
     *       {@code InputSynchronized}, so it never enters this stack and never
     *       reads as parked, which is the conservative answer we want.</li>
     * </ul>
     *
     * <p>Both are false while the engine is running (the AI's turn, a resolving
     * stack, a yield), which is exactly when the walk must not happen.
     */
    private boolean enginePausedForSeat() {
        if (pool.pending() > 0) {
            return true;
        }
        final IGameController c = controller();
        if (!(c instanceof PlayerControllerHuman)) {
            return false;                      // no controller yet, or not ours
        }
        final InputQueue q = ((PlayerControllerHuman) c).getInputQueue();
        return q != null && q.getInput() != null;
    }

    // ==================================================================
    // 8b. D136 -- the acts that write the engine from the EDT
    // ==================================================================

    /**
     * <b>Decision D136.</b>  Should this {@code undo} / {@code useMana} be
     * refused?  True when it was: the seat has been sent
     * {@code notice {level:"warn", title:"Not now"}} (protocol amendment M48), the
     * reason is on stderr, and the engine has not been touched.
     *
     * <p>EDT only -- the thread that then applies the act -- so nothing the EDT
     * itself would do can happen between the check and the write, and every
     * other waker is one of {@link ActGuard}'s conditions.  The conditions and
     * the jar paths behind each are {@link ActGuard}'s class comment; the facts
     * are read here, immediately before the write.  <b>No hop</b>: the write stays
     * on the EDT, which is where desktop Forge makes it (its Ctrl+Z and its mana
     * pool click), and what was missing was never the thread but the check that
     * the engine is actually parked -- see D136 for why a fourth
     * {@code invokeInGameThread} would not have been one.
     */
    private boolean notNow(final String act, final IGameController c, final long genAtArrival,
                           final AtomicInteger refusedCount) {
        final boolean held = undoWindowHolder != null;   // the test hook is holding a game thread now
        if (held) {
            undoWindowRaced = true;
        }
        final String why = ActGuard.whyNotNow(engineFacts(c, genAtArrival));
        if (why == null || TEST_UNGUARDED_ACTS) {
            if (why != null) {
                // The negative control: say what the guard would have said, so a
                // run with the guard off records WHERE each write landed.
                unguardedWrites.incrementAndGet();
                System.err.println("TEST HOOK: " + act + " applied UNGUARDED (MTGTABLE_TEST_UNGUARDED_ACTS=1); "
                        + "the guard would have refused it -- " + why);
            }
            if (held) {
                undoWindowApplied.incrementAndGet();
                System.err.println("TEST HOOK: " + act + " APPLIED while " + undoWindowThreadName()
                        + " is held inside the engine" + (TEST_UNGUARDED_ACTS
                        ? " (MTGTABLE_TEST_UNGUARDED_ACTS=1: the guard is off)" : " -- THE GUARD MISSED IT"));
            }
            return false;
        }
        refusedCount.incrementAndGet();
        if (held) {
            undoWindowRefused.incrementAndGet();
        }
        System.err.println("NOT NOW: " + act + " refused, the engine is not quiet on this seat -- " + why
                + " (D136, protocol amendment M48)");
        notice("warn", "Not now", act + ": the engine is busy -- nothing was changed; try again when it "
                + "is waiting on you");
        return true;
    }

    private String undoWindowThreadName() {
        final Thread t = undoWindowHolder;
        return t == null ? "a game thread" : t.getName();
    }

    /**
     * {@link ActGuard.Facts}, read on the EDT immediately before a write.  The
     * assembly -- which feed stands for which condition -- is
     * {@link ActGuard#facts}, which {@code ActGuardSelfTest} drives with fakes;
     * this class supplies only the reads ({@link GuardFeeds}).
     */
    private ActGuard.Facts engineFacts(final IGameController c, final long genAtArrival) {
        return ActGuard.facts(new GuardFeeds(c), genAtArrival);
    }

    /**
     * D136's live feeds: one read of one field (or one Forge call) per method,
     * named after what it reads, and nothing that combines two of them -- that
     * is {@link ActGuard#facts}, where the self-test can see it.
     */
    private final class GuardFeeds implements ActGuard.Feeds {
        private final IGameController c;

        GuardFeeds(final IGameController c) {
            this.c = c;
        }

        @Override public boolean ready() { return ready; }
        @Override public boolean inputSeen() { return inputSeen; }
        @Override public boolean closed() { return closed; }
        @Override public boolean overEmitted() { return overEmitted; }
        @Override public int pendingAsks() { return pool.pending(); }
        @Override public Object input() { return currentInput(c); }
        @Override public long inputGen() { return inputGen.get(); }
        @Override public boolean activatingManaAbility(final Object in) {
            return in instanceof InputPayMana && ((InputPayMana) in).isActivatingManaAbility();
        }
        @Override public ActGuard.PassMark passPress() { return passPress; }
        @Override public long engineAsks() { return engineAsks.get(); }
        @Override public int hopsInFlight() { return hopsInFlight.get(); }
        @Override public Collection<Thread> engineThreads() { return engineThreads; }
    }

    /** The input on this seat's stack -- the one {@code Game-0} is parked in -- or null.  A lock-free peek. */
    private static Input currentInput(final IGameController c) {
        if (!(c instanceof PlayerControllerHuman)) {
            return null;
        }
        final InputQueue q = ((PlayerControllerHuman) c).getInputQueue();
        return q == null ? null : q.getInput();
    }

    /**
     * Press OK (or pass) and remember when the press may still be with the
     * engine (D136 condition 6).  {@code InputPassPriority.onOk} either stops the
     * input, re-renders it ({@code showNormalPrompt}), or -- when mana would be
     * lost and the mana-lost prompt is on (D43) -- hands the pass to a
     * {@code Game-n} worker that asks {@code confirm} before it stops anything
     * ({@code InputPassPriority.passPriority(Runnable)}, javap).  Only the third
     * leaves the same input up with the generation unmoved, and it always ends
     * in an ask, which moves {@link #engineAsks}; so the mark is exact for this
     * input class and costs nothing when no hop was made.
     */
    private void pressOk(final IGameController c, final Runnable press) {
        final Input before = currentInput(c);
        final long gen = inputGen.get();
        final long asks = engineAsks.get();
        press.run();
        if (before instanceof InputPassPriority && currentInput(c) == before && inputGen.get() == gen) {
            passPress = new ActGuard.PassMark(before, gen, asks);
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

        // An ask nobody is parked on is not in the reply pool, so it is resolved
        // here instead: see `asyncAsks`.  Checked BEFORE the pool, because a
        // pool miss is what produces the "Late answer" notice.
        final List<Object> async = asyncAsks.remove(askId);
        if (async != null) {
            applyAsyncAbilityMenu(askId, async, value);
            return;
        }

        if (!pool.complete(askId, value)) {
            // Protocol section 2.3: a second answer for a completed askId is
            // dropped with a notice, never applied.
            notice("warn", "Late answer", "ask " + askId + " was already answered");
        }
    }

    @Override
    public void onResync() {
        // Asserted like onAct/onAnswer/onDisconnect.  Transport.Inbound's own
        // contract is "never a game thread and never the EDT", and this was the
        // one method of the four that did not say so mechanically -- while being
        // the one that EMITS a frame.  A future caller on a game thread or on
        // mtg-table-EDT would have violated the model with nothing to catch it.
        Transport.assertNotGameThread("Transport.Inbound.onResync");
        Transport.assertNotEdt("Transport.Inbound.onResync");
        // Section 8.2: a client `resync` is a c2s frame and belongs in the log.
        // Without this line the re-emitted `input` below appeared with no cause
        // and an auditor could not tell a resync-driven re-emission from an
        // engine-driven one.  A (re)connect's implicit resync is written too --
        // it is the same request, made by connecting rather than by asking.
        logC2s("resync", "{}");
        // Amendment M42.  An `input` frame is only ever delivered AFTER the
        // engine has asked this seat for something -- on connect and on resync
        // alike.  Before `inputSeen` is armed the struct reEmitInput() would
        // re-emit is the EMPTY pre-engine one, and putting it on the wire told
        // the client "the engine is asking you something" while `applyAct` was
        // still dropping every act with notice{title:"Not yet"}.  It is not a
        // theoretical inversion: under gate load `tools/ws-auto-play.mjs
        // --comfort` armed its own `pendingInput` from this frame and sent
        // `act: setPhaseStop` 128 ms BEFORE the engine's first real input, the
        // act was dropped, and step 10g failed on the effect that never
        // arrived (var/ws-auto-3g.jsonl and var/check-all-ws-3g.log,
        // 2026-09-12).  So a (re)connect before the first engine push gets
        // `hello_ok` + `state` and nothing else, and a client may treat its
        // first `input` as this guard lifting.  The `resync` line above is
        // still written: the client did ask, and section 8.2 records the ask.
        if (!inputSeen) {
            System.err.println("RESYNC BEFORE THE FIRST INPUT: hello_ok + state only, no `input` "
                    + "(amendment M42 -- the engine has not asked this seat anything yet)");
            return;
        }
        reEmitInput();
    }

    /**
     * Re-push the last {@code input}; the next flush re-pushes {@code state}.
     * ({@code requestResync} is Forge's delta-sync recovery and is a no-op for a
     * snapshot protocol.)
     *
     * <p>{@code mutateInput}, <b>not</b> {@code engineInput}: a resync is a
     * CLIENT frame (protocol section 2.4) and any transport may send one at any
     * time, including before Forge has asked this seat for anything.  Arming
     * {@code inputSeen} here disarmed {@code applyAct}'s pre-input guard, so
     * M3's browser -- which autoconnects, sends {@code resync}, and may then
     * send {@code concede} -- would have conceded into
     * {@code Match.prepareAllZones} and crashed Forge's setup.
     */
    private void reEmitInput() {
        mutateInput(s -> { });
    }

    @Override
    public void onDisconnect() {
        // Asserted like onAct/onAnswer: this unparks game threads, so it must
        // not be running on one, and it must not be the EDT either.  Reached
        // from mtg-table-io (EOF) and from mtg-table-quit (a console quit).
        Transport.assertNotGameThread("Transport.Inbound.onDisconnect");
        Transport.assertNotEdt("Transport.Inbound.onDisconnect");
        // A menu nobody is parked on cannot be cancelled by the reply pool, and
        // the client that could have answered it is gone.
        asyncAsks.clear();
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
