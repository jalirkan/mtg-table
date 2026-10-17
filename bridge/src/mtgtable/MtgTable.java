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

import forge.LobbyPlayer;
import forge.ai.AiProfileUtil;
import forge.ai.AiProps;
import forge.ai.LobbyPlayerAi;
import forge.deck.Deck;
import forge.deck.io.DeckSerializer;
import forge.game.GameRules;
import forge.game.GameType;
import forge.game.player.Player;
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
import mtgtable.ai.PolicyLobbyPlayerAi;
import mtgtable.ai.SearchConfig;

/**
 * M2: <b>a full game against the Forge AI, from one seat, over a
 * {@link Transport}.</b>
 *
 * <pre>
 *   ./bridge/run.sh mtgtable.MtgTable --transport console --seed 42
 *   ./bridge/run.sh mtgtable.MtgTable --transport auto    --seed 42
 *   ./bridge/run.sh mtgtable.MtgTable --transport null    --seed 42
 *   ./bridge/run.sh mtgtable.MtgTable --transport ws --port 8642 --keep-open
 *   ./bridge/run.sh mtgtable.MtgTable --transport ws --keep-open \
 *       --lan --site-dir var/forgecoach/site        # M51: a phone on the LAN
 *   ./bridge/run.sh mtgtable.MtgTable --transport console --seed 42 \
 *       --ai-deck decks/morph-probe.dck --ai-profile Reckless
 * </pre>
 *
 * <p><b>Match setup</b> (protocol amendment M44): {@code --ai-deck} (an alias
 * of {@code --deck2}) gives the AI a deck of its own -- without it the AI plays
 * a mirror of yours -- and {@code --ai-profile} picks one of Forge's four AI
 * profiles, the {@code .ai} files in {@code forge-home/res/ai/} (report 11
 * section 9: there is no "difficulty" in Forge, only these).  Both land in
 * {@code hello_ok.match}, the AI's deck as a name and a card count only.
 * {@code config.json}'s {@code match} block is read by {@code scripts/play.sh},
 * NOT here: the gate runs this class with no deck flags and must keep playing
 * the same games whatever a player last chose to play against.
 *
 * <p>Four transports, in the order they were built, because each one proves
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
 *   <li><b>ws</b> (M3) -- the same seat on {@code ws://127.0.0.1:<port>/ws}, for
 *       the browser.  {@code GET /health} on the same port answers {@code ok}
 *       once the game is ready, {@code --keep-open} lingers for 30 s after
 *       {@code over} so a client can read the final frames, and the process
 *       plays exactly one game and exits, like every other transport.</li>
 * </ul>
 *
 * <p>The whole frame stream, both directions, is written to
 * {@code var/games/<gameId>/frames.jsonl} -- the same format
 * {@code RecordMatch} writes and the browser replays, so a game played here is
 * a fixture there.
 */
public final class MtgTable {

    private MtgTable() { }

    /**
     * Give up rather than hang forever if the engine wedges: the wall-clock limit
     * on one game for a transport with nobody at the keyboard ({@code null},
     * {@code auto}).  <b>D286:</b> a human seat ({@code ws}, {@code console}) has
     * no such limit unless {@code --game-timeout <sec>} asks for one -- a slow
     * thinker must never lose a game to a timer.  See {@link #gameLimitSec}.
     */
    private static final long GAME_TIMEOUT_SEC = 900L;

    /**
     * <b>D286.</b>  What replaces the wall clock on a {@code ws} seat: how long a
     * game may run with <b>no {@code /ws} client connected</b> before the JVM
     * gives up on it.  The engine parks on the seat's {@code input} with no
     * deadline of any kind (only an {@code ask} has one, and only the no-client
     * 120 s), so without this an abandoned session -- a bridge started by
     * {@code play.sh --engine-only} and never connected to, or a tab closed
     * mid-game -- would hold a JVM for ever.  The clock restarts every time a
     * client leaves, and does not run while one is connected.
     * {@code --idle-timeout <sec>} overrides it; 0 turns it off.
     */
    private static final long NO_CLIENT_GAME_TIMEOUT_SEC = 3600L;

    /** "For ever", as a deadline {@code WireGuiGame.await} can add to {@code nanoTime} without overflow. */
    private static final long ONE_YEAR_MS = 365L * 24 * 3600 * 1000;

    /**
     * {@code --keep-open}: how long the WebSocket server lingers after
     * {@code over} <b>while nobody is connected</b>.
     *
     * <p><b>M6 fix.</b>  This was a flat 30 s wall clock and it fired under a
     * connected client, which dead-ended the milestone's own headline command:
     * the board's New Game row appears at {@code over} and the socket was closed
     * out from under it half a minute later.  The cap now applies only when no
     * client is attached -- see {@link #awaitNextGame}.
     */
    private static final long KEEP_OPEN_MS = 30_000L;

    /**
     * How long a multi-game session waits, after an {@code over}, for somebody
     * to send {@code act: newGame} (<b>M6</b>) <b>while nobody is connected</b>.
     *
     * <p>Same fix, same reason: a person looking at the final board of game 1 of
     * a {@code --games 3} match is not on a clock.  See {@link #awaitNextGame}.
     */
    private static final long NEXT_GAME_GRACE_MS = 30_000L;

    /** How often {@link #awaitNextGame} re-reads "is a client connected?". */
    private static final long CONNECT_POLL_MS = 200L;

    /**
     * How long a session whose client has gone still waits for a {@code newGame}
     * the client sent before it went, while that act is queued behind Forge
     * finishing the previous game (decision D114).  Forge's wind-down is
     * milliseconds; this is a cap, not an expected wait.
     */
    private static final long QUEUED_NEW_GAME_GRACE_MS = 10_000L;

    /**
     * <b>D448.</b>  How long an abandoned game's {@code over} may take once the
     * concede is posted.  A concede applied at once is milliseconds; a deferred
     * one (D136) waits for {@code Game-0}'s next state-based check, and its own
     * poll gives up after 30 s.  A cap, not an expected wait.
     */
    static final long ABANDON_OVER_MS = 60_000L;

    /** <b>D448.</b>  How long the next game may take to begin after an abandoned one: Forge's wind-down, then a restart. */
    static final long NEXT_AFTER_ABANDON_MS = 60_000L;

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
        // config.json decides, the flags override (M6, protocol amendment M40).
        // --mana-lost-prompt and --no-mana-lost-prompt are still both accepted:
        // a recording that says which one it ran under is the whole point of the
        // session header's `prefs` key (M31).
        if (a.manaLostPromptFlag == null) {
            a.manaLostPrompt = cfg.flag("manaLostPrompt", true);
        }
        final File deck1File = resolve(cfg, a.deck != null ? a.deck : cfg.deck().getPath());
        final File deck2File = a.deck2 == null ? deck1File : resolve(cfg, a.deck2);
        // Match setup (M44).  Validated against the .ai files BEFORE the engine
        // boots, so a typo costs a second and not FModel.initialize.  Never
        // empty: see Bootstrap.createAiPlayer for the branch that saves prefs.
        final String aiProfile = Bootstrap.resolveAiProfile(cfg.forgeHomeDir(), a.aiProfile);
        // M51: a --site-dir that is not a built site fails here, in a second,
        // rather than after the engine has booted.
        if (a.siteDir != null && !new File(resolve(cfg, a.siteDir), "index.html").isFile()) {
            throw new IllegalArgumentException("--site-dir " + resolve(cfg, a.siteDir)
                    + " has no index.html at its root -- is it a built ForgeCoach site?");
        }

        System.out.println("== mtg-table M2 ==");
        System.out.println("transport     = " + a.transport);
        System.out.println("deck (you)    = " + deck1File);
        System.out.println("deck (ai)     = " + deck2File + (a.deck2 == null ? "  (a mirror: no --ai-deck)" : ""));
        System.out.println("ai profile    = " + aiProfile
                + (a.aiProfile == null ? "  (the default; --ai-profile " + String.join("|",
                        Bootstrap.aiProfiles(cfg.forgeHomeDir())) + ")" : ""));
        if (!"plain".equals(a.aiPolicy)) {
            System.out.println("ai policy     = " + a.aiPolicy + ("search".equals(a.aiPolicy)
                    ? "  (" + SearchConfig.parseLive(a.aiSearch) + (a.aiSearch.isBlank()
                            ? "; " + SearchConfig.LIVE_VERSION + ", D412" : "") + ")" : ""));
        }
        System.out.println("seed          = " + a.seed);
        System.out.println("seat          = " + a.seat);
        System.out.println("games/match   = " + a.games);
        System.out.println("probe policy  = " + a.probe
                + (a.probe ? "  (M5: useMana, clickAbility, getInteger's Other..., a real search pick)" : ""));
        System.out.println("mana-lost pref= " + a.manaLostPrompt
                + (a.manaLostPrompt ? "  (FPref.UI_MANA_LOST_PROMPT, in memory only -- the "
                        + "floating-mana confirm; Forge's default is false)" : ""));

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

        // --mana-lost-prompt.  Forge's own option, default "false"
        // (ForgePreferences.java:123).  With it on, InputPassPriority.passPriority
        // hops to a GAME THREAD (ThreadUtil.invokeInGameThread, "must invoke in
        // game thread so dialog can be shown on mobile game") and calls
        // IGuiGame.showConfirmDialog before letting priority pass with mana that
        // would be lost -- which is the ONLY IGuiGame confirm call site a human
        // seat reaches in this configuration (docs/evidence/m5-probes.md).  In
        // memory, never save(): same rule as D13.
        // M6 / protocol amendment M40: the default now comes from config.json
        // ("manaLostPrompt": true) rather than from a flag nobody types, because
        // it is a genuinely useful warning and M5 follow-up 2 left the decision
        // to M6.  Still in memory, still never save(): same rule as D13.
        if (a.manaLostPrompt) {
            prefs.setPref(FPref.UI_MANA_LOST_PROMPT, "true");
        }

        // 2. Seed: after initialize, before anything shuffles.
        MyRandom.setRandom(new Random(a.seed));

        // 3. Decks.  DeckSerializer.fromFile ONLY (hard rule 4).
        final Deck deck1 = deck(deck1File);
        final Deck deck2 = deck(deck2File);
        if (a.humans == 2) {
            // Amendment M59 (D402): two people, no AI -- TableMatch seats both.
            final TableMatch.Setup ts = new TableMatch.Setup();
            ts.transport = a.transport;
            ts.seed = a.seed;
            ts.gameId = a.gameId != null ? a.gameId : "friend-" + a.transport + "-" + a.seed;
            ts.cfg = cfg;
            ts.deckFiles = new File[] {deck1File, deck2File};
            ts.decks = new Deck[] {deck1, deck2};
            if (a.seatsFile != null) {
                final File seatsFile = resolve(cfg, a.seatsFile);
                final TableMatch.SeatsFile sf = TableMatch.readSeatsFile(seatsFile);
                ts.names = sf.names;
                ts.digests = sf.digests;
                // D406 / D407: where this game stands in the room's best of three, who chooses to play
                // or draw, each seat's consent to recording; the result goes back beside the seats file.
                ts.bestOf = sf.bestOf;
                ts.gameNo = sf.gameNo;
                ts.wins = sf.wins;
                ts.chooser = sf.chooser;
                ts.record = sf.record;
                ts.resultFile = new File(seatsFile.getAbsoluteFile().getParentFile(), "result.json");
            } else {
                ts.names = new String[] {"Player 1", "Player 2"};
            }
            ts.tablePort = a.tablePort > 0 ? a.tablePort : cfg.tablePort();
            ts.healthPort = a.port > 0 ? a.port : cfg.wsPort();
            ts.lan = a.lan;
            ts.tableOrigins = TableServer.tableOrigins(a.tableOrigins);
            ts.decisionTimeoutSec = a.decisionTimeoutSec != null ? a.decisionTimeoutSec
                    : "ws".equals(a.transport) ? TableMatch.DEFAULT_DECISION_TIMEOUT_SEC : 0L;
            ts.graceSec = a.graceSec;
            ts.idleTimeoutSec = "ws".equals(a.transport) ? a.idleTimeoutSec : 0L;
            ts.gameTimeoutSec = gameLimitSec(a);
            ts.keepOpen = a.keepOpen;
            ts.manaLostPrompt = a.manaLostPrompt;
            if (!TableMatch.run(ts, t0)) {
                throw new IllegalStateException("the game did not reach `over`");
            }
            System.out.println("MTGTABLE OK");
            return;
        }
        System.out.println("deck you      = " + deck1.getName() + " (" + deck1.getMain().countAll() + " cards)");
        System.out.println("deck ai       = " + deck2.getName() + " (" + deck2.getMain().countAll() + " cards)");

        // 4. One human seat plus one AI.  GamePlayerUtil.getGuiPlayer() is what
        //    makes the seat a PlayerControllerHuman, which is what makes an
        //    InputQueue (and therefore a prompt) exist at all.
        final GameRules rules = new GameRules(GameType.Constructed);
        // One game per match unless --games says otherwise.  More than one is the
        // only way Forge ever calls IGuiGame.sideboard (Match.java:278 ->
        // PlayerControllerHuman.java:275), and it is NOT sufficient on its own:
        // see docs/evidence/m5-probes.md, the `sideboard` row.
        rules.setGamesPerMatch(a.games);
        // Hard rule 8 / M44 (amendment M54): before the first game Forge's
        // Match.prepareAllZones -> GameAction.revealUnplayableByAI reveals the
        // AI deck's AI:RemAIDeck cards to every player ("AI can't play these
        // cards well"), which the seat would receive as a choose_list reveal
        // naming cards of the AI's hidden decklist.  The AI's list never
        // reaches the wire, so the warning is off.
        rules.setWarnAboutAICards(false);
        final RegisteredPlayer me = new RegisteredPlayer(deck1);
        me.setPlayer(GamePlayerUtil.getGuiPlayer());
        final RegisteredPlayer ai = new RegisteredPlayer(deck2);
        // Match setup (M44): ALWAYS an explicit profile.  The two-argument
        // overload this line used to call passes an empty override, and that
        // branch of GamePlayerUtil can save the preferences file.
        // D314: --ai-policy picks the AI seat's controller.  "plain" (the
        // default, and every gate step) is Forge's own AI, exactly as before;
        // "outlets" puts D310's sacrifice-outlet policy in front of it; "search"
        // adds D312's determinized rollout search behind the policy.  Opt-in only.
        // Its defaults are SearchConfig.parseLive's: search-v2, the anytime loop
        // (D388, adopted for the live seat by D412).
        final LobbyPlayer aiLobby = "plain".equals(a.aiPolicy)
                ? Bootstrap.createAiPlayer(a.aiName, 0, aiProfile)
                : Bootstrap.createAiSeat(a.aiName, 0, aiProfile, null, PolicyLobbyPlayerAi.Outlets.ON,
                        "search".equals(a.aiPolicy) ? SearchConfig.parseLive(a.aiSearch) : null);
        ai.setPlayer(aiLobby);
        final List<RegisteredPlayer> seats = List.of(me, ai);

        // 5. Log, transport, gui.
        final String gameId = a.gameId != null ? a.gameId : "human-" + a.transport + "-" + a.seed;
        final File out = new File(cfg.root(), "var/games/" + gameId + "/frames.jsonl");
        final GameLog log = new GameLog(out);
        System.out.println("log           = " + out);

        final Transport transport = transport(a, cfg);
        final WireGuiGame gui = new WireGuiGame(gameId, transport, log);
        // M6 / protocol amendment M38: one frames.jsonl per GAME, not per
        // process.  Line 0 of a log is its session header, so a second game
        // writing into the first game's file would put a header in the middle of
        // it.  Game n is <gameId>-g<n>, which is also its directory.
        gui.setLogFactory(id -> new GameLog(new File(cfg.root(), "var/games/" + id + "/frames.jsonl")));
        transport.start(gui, gui.pool());
        // D115: an exception out of Forge's game loop ends the game (notice +
        // `over`) and, below, the process with a non-zero exit.  Before this, a
        // card the engine could not build crashed zone preparation, and the run
        // printed MTGTABLE OK with player turns = 0.
        EngineCrash.install(gui::engineCrashed);

        final HostedMatch hosted = new HostedMatch();
        gui.setHostedMatch(hosted);
        gui.setSession(new WireGuiGame.Session() {
            // gui.gameId(), not the local `gameId`: game 2 of a match has its own
            // id, its own log and its own hello_ok (protocol amendment M38).
            @Override public String header(final PlayerView viewer, final List<PlayerView> players) {
                return sessionHeader(cfg, gui.gameId(), a, viewer, players,
                        deck1File, deck2File, deck1, deck2);
            }

            @Override public String helloOk(final PlayerView viewer, final List<PlayerView> players) {
                // gui.gamesStarted() is already bumped for THIS game when
                // openView calls us (WireGuiGame.openView), so it is the 1-based
                // number of the game whose handshake this is (amendment M41).
                return helloOkBody(cfg, gui.gameId(), a, viewer, players, unsupported(deck1),
                        gui.gamesStarted(), deck1File, deck1, deck2File, deck2, aiProfile);
            }
        });

        // 6. Go.  startMatch runs openView on THIS thread and only then hands the
        //    match to a Forge game thread, so it returns almost immediately.
        final long tGame = System.nanoTime();
        hosted.startMatch(rules, EnumSet.of(GameType.Constructed), seats, me, gui);

        if (transport instanceof WsTransport) {
            // THE readiness line, and it is printed HERE rather than next to
            // start(): the port is bound ~1.2 s earlier, and a client that got
            // in during that window was handed no `hello_ok` at all.  startMatch
            // runs openView on this thread, so by this line the handshake frame
            // exists, GET /health has flipped from 503 to 200, and "listening"
            // and "ready" are the same statement.  stdout, not stderr, because a
            // script reads it.
            final int p = ((WsTransport) transport).port();
            System.out.println("WS LISTENING ws://127.0.0.1:" + p + "/ws");
            System.out.println("WS OBSERVE   ws://127.0.0.1:" + p + "/observe");
            System.out.println("WS HEALTH    http://127.0.0.1:" + p + "/health");
            printLan((WsTransport) transport, p);
            System.out.flush();
        }

        // 7. Park until `over` -- once per game; playGames says what follows
        //    each one (M6), and what a game nobody is connected to becomes (D448).
        final long limitSec = gameLimitSec(a);
        final long idleSec = transport instanceof WsTransport ? a.idleTimeoutSec : 0L;
        System.out.println("game limit    = " + (limitSec == 0 ? "none" : limitSec + " s")
                + (a.gameTimeoutSec == null ? "  (the default for --transport " + a.transport + ")"
                        : "  (--game-timeout)")
                + (idleSec == 0 ? "" : (abandonsStalled(transport instanceof WsTransport, a.games)
                        ? "; a game is abandoned with no result after " + idleSec
                                + " s with no client connected, and the session goes on (D448)"
                        : "; ends after " + idleSec + " s with no client connected")
                        + (a.idleTimeoutFlag ? "  (--idle-timeout)" : "")));
        final Played run = playGames(loopOf(gui, transport), a.games, a.keepOpen, limitSec, idleSec, System.out);
        final boolean finished = run.finished;
        final long gameMs = ms(tGame);
        // `--keep-open`'s linger is INSIDE the loop above (M6), because it is
        // also the window in which a client may ask for another game.  Every
        // path that leaves the loop has already waited in awaitNextGame(), and
        // that wait is unbounded while a client is connected: nothing below here
        // runs while somebody could still press New Game.
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
        System.out.println("finished       = " + finished + (finished ? "" : run.abandoned != null
                ? "  (" + run.abandoned + ")"
                : "  (TIMED OUT after " + limitSec + "s -- the game thread is wedged)"));
        System.out.println("games          = " + gui.gamesFinished() + " played of " + a.games
                + " asked for, last game id " + gui.gameId()
                + ", matchOver = " + gui.matchOver());
        final int[] acts = gui.comfortActs();
        System.out.println("M6 acts        = newGame " + acts[0] + ", setYield " + acts[1]
                + ", yieldTo " + acts[2] + ", setPhaseStop " + acts[3] + ", undo " + acts[4]);
        // D39.  An M6 act whose only effect is a snapshot asks for a flush, and
        // the flush is skipped rather than raced when the engine is running: the
        // effect then arrives with the next engine-driven `state`.  Printed
        // because a guard nobody can see the cost of is a guard nobody checks.
        System.out.println("refresh skips  = " + gui.refreshesSkipped()
                + " (M6 refresh hops that found the engine running, not parked -- D39)");
        // D136.  `undo` and `useMana` write the engine from the EDT, so they are
        // applied only while the engine is quiet on this seat; the rest are
        // refused with `notice {title:"Not now"}` and never reach Forge.  The
        // `undo` count on the M6 line above is the APPLIED ones.
        final int[] notNow = gui.actsNotNow();
        System.out.println("acts not now   = undo " + notNow[0] + ", useMana " + notNow[1]
                + " (refused: the engine was not quiet on this seat -- D136, protocol amendment M48)");
        final int[] concedes = gui.concedes();
        System.out.println("concedes       = " + concedes[0] + " at once, " + concedes[1] + " deferred (deferred: the "
                + "engine was running, so only the outcome was written and its own check ended the game -- D136)");
        if (gui.unguardedWrites() >= 0) {
            System.out.println("unguarded     = " + gui.unguardedWrites() + " write(s) the guard would have refused "
                    + "(MTGTABLE_TEST_UNGUARDED_ACTS=1, the negative control -- D136)");
        }
        final int[] hook = gui.undoWindowHook();
        if (hook != null) {
            System.out.println("undo window    = " + hook[0] + " hold(s), the undo stack mutated under a held "
                    + "engine thread " + hook[1] + " time(s); acts during a hold: " + hook[2] + " refused, "
                    + hook[3] + " applied (MTGTABLE_HOLD_UNDO_WINDOW_MS, a test hook -- D136)");
        }
        System.out.println("winner         = " + winner + (reason.isEmpty() ? "" : ", reason = " + reason));
        System.out.println("ai profile     = " + aiProfileEvidence(hosted, aiLobby, aiProfile));
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
        System.out.println("input peeks    = " + gui.peekErrors() + " failed (input.selectable.chosen / playerIds "
                + "sent as null; M65, M66)");
        System.out.println("end-step yields= " + gui.endStepYieldsEnded() + " ended by an opponent's action, "
                + "the end step or the turn's end (M64)");
        System.out.println("late frames    = " + gui.lateFramesDropped()
                + " (passed the fast check, lost the race to `over`, dropped -- section 8.4)");
        if (transport instanceof WsTransport) {
            final WsTransport ws = (WsTransport) transport;
            System.out.println("ws connections = " + ws.connects() + " accepted, "
                    + ws.refusals() + " refused (one client at a time)");
            System.out.println("ws frames      = " + ws.framesOut() + " written, "
                    + ws.framesDropped() + " emitted with nobody connected, "
                    + ws.framesIn() + " read, "
                    + ws.preSessionDrops() + " read before the session existed (amendment M20)");
            System.out.println("ws observers   = " + ws.observerConnects() + " accepted, "
                    + ws.observerOverflows() + " dropped as too far behind, "
                    + ws.observerFramesIn() + " messages from them released unread, "
                    + ws.originRefusals() + " upgrades refused by Origin (amendment M50)");
            if (ws.lan() || ws.siteRoot() != null) {
                System.out.println("ws lan / site  = " + ws.tokenRefusals() + " requests refused for want of the token, "
                        + ws.siteServed() + " site files served, " + ws.siteMissing() + " not found, "
                        + ws.siteRefused() + " refused (amendment M51)");
            }
        }
        if (transport instanceof WsTransport) {
            System.out.println("stalled games  = " + run.stalled + " (abandoned with no result for want of a "
                    + "client, and the session went on -- D448)");
        }
        System.out.println("engine crash   = " + (gui.engineFailure() == null ? "none"
                : EngineCrash.describe(gui.engineFailure())));
        System.out.println("game wall time = " + gameMs + " ms");
        System.out.println("total wall     = " + ms(t0) + " ms");
        if (!finished) {
            throw new IllegalStateException("the game did not reach `over`");
        }
        if (run.failure != null) {
            throw new IllegalStateException(run.failure);
        }
        if (gui.engineFailure() != null) {
            throw new IllegalStateException("the engine crashed (D115): "
                    + EngineCrash.describe(gui.engineFailure()), gui.engineFailure());
        }
        System.out.println("MTGTABLE OK");
    }

    /**
     * <b>D286.</b>  The wall-clock limit on one game, in seconds; 0 is none.
     * {@code --game-timeout} wins; otherwise a human seat ({@code ws},
     * {@code console}) has none and {@code null} / {@code auto} keep 900 s.
     */
    private static long gameLimitSec(final Args a) {
        if (a.gameTimeoutSec != null) {
            return a.gameTimeoutSec;
        }
        return "ws".equals(a.transport) || "console".equals(a.transport) ? 0L : GAME_TIMEOUT_SEC;
    }

    /**
     * <b>D448.</b>  What the game loop needs from the seat and its socket.
     * {@link #loopOf} is the real one, a {@link WireGuiGame} and its
     * {@link Transport}; {@code StalledGameSelfTest}'s is a fake whose clock it
     * advances itself, so an hour with nobody connected costs the build nothing.
     * Every method is called on MAIN.
     */
    interface Loop {
        /** {@link WireGuiGame#awaitGameEnd}. */
        boolean awaitGameEnd(int n, long ms) throws InterruptedException;

        /** {@link WireGuiGame#awaitGameStart}. */
        boolean awaitGameStart(int n, long ms) throws InterruptedException;

        /** D115: Forge's game loop died. */
        boolean engineFailed();

        /** D114: an early {@code newGame} waits for Forge to finish the last game. */
        boolean newGameQueued();

        String gameId();

        /** Whether the transport has connections at all ({@code ws}); the others keep flat waits. */
        boolean hasSocket();

        /** A {@code /ws} client holds the seat -- never an observer ({@link WsTransport#connected()}). */
        boolean connected();

        /** {@link System#nanoTime()}, or the fake's clock. */
        long nanoTime();

        /**
         * D448: {@link WireGuiGame#abandonForAbsentSeat} -- null when the concede
         * was posted, else why the game cannot be abandoned.
         */
        String abandon(String noticeText);

        /** D448: {@link WireGuiGame#newGameAfterAbandon}. */
        void startNextGame();

        /** D448: {@link WsTransport#clientLine()}. */
        String clientLine();

        /** D448: the session's count of abandoned games, for {@code /health}. */
        void stalledGames(int count);
    }

    /** What {@link #playGames} reports; MAIN thread only. */
    static final class Played {
        /** False when the session gave up on a game that had not ended (the run fails). */
        boolean finished = true;
        /** Games that reached {@code over}, abandoned ones included. */
        int played;
        /** D448: games abandoned for want of a client. */
        int stalled;
        /** Why the session gave up for want of a client, or null; the summary prints it. */
        String abandoned;
        /** D448: the next game did not begin after an abandoned one -- the run fails with this. */
        String failure;
    }

    /** {@code MtgTable}'s own {@link Loop}: the seat and its transport. */
    private static Loop loopOf(final WireGuiGame gui, final Transport transport) {
        final WsTransport ws = transport instanceof WsTransport ? (WsTransport) transport : null;
        return new Loop() {
            @Override public boolean awaitGameEnd(final int n, final long ms) throws InterruptedException {
                return gui.awaitGameEnd(n, ms);
            }
            @Override public boolean awaitGameStart(final int n, final long ms) throws InterruptedException {
                return gui.awaitGameStart(n, ms);
            }
            @Override public boolean engineFailed() { return gui.engineFailure() != null; }
            @Override public boolean newGameQueued() { return gui.newGameQueued(); }
            @Override public String gameId() { return gui.gameId(); }
            @Override public boolean hasSocket() { return ws != null; }
            @Override public boolean connected() { return ws != null && ws.connected(); }
            @Override public long nanoTime() { return System.nanoTime(); }
            @Override public String abandon(final String text) { return gui.abandonForAbsentSeat(text); }
            @Override public void startNextGame() { gui.newGameAfterAbandon(); }
            @Override public String clientLine() { return ws == null ? "no socket" : ws.clientLine(); }
            @Override public void stalledGames(final int count) {
                if (ws != null) {
                    ws.stalledGames(count);
                }
            }
        };
    }

    /**
     * <b>D448.</b>  Whether a game nobody is connected to is abandoned rather
     * than fatal: on a {@code ws} seat of a {@code --games N} session, N &gt; 1.
     * A single game -- and the console and the recorders, which have no idle
     * limit at all -- keeps D286's rule: a stalled single game is a failure.
     */
    static boolean abandonsStalled(final boolean ws, final int games) {
        return ws && games > 1;
    }

    /**
     * Step 7: park until {@code over}, once per game, and decide what follows
     * it.  MAIN thread.
     *
     * <p>M6: the session outlives a game.  Nothing here starts the next one --
     * that is {@code act: newGame {mode}} from whoever plays the seat (the
     * browser, {@code tools/ws-auto-play.mjs}, {@code AutoTransport}), which
     * reaches {@code HostedMatch.continueMatch} / {@code restartMatch} and comes
     * back as a new {@code hello_ok} from {@code openView}.  This loop only
     * watches: after each {@code over} it waits a bounded moment for the next
     * game to BEGIN, and returns when none does.  A transport with nobody at the
     * keyboard ({@code --transport null}) therefore still plays exactly one game.
     *
     * <p><b>D448 is the one exception.</b>  On a {@code --games N} server a game
     * whose seat nobody has held for {@code idleSec} is abandoned -- ended with
     * no result through the concede path ({@link #abandonStalled}) -- and then,
     * as after any {@code over}: the next game, which the server starts itself
     * because nobody is there to ask for it ({@link #startAfterAbandon}), or, if
     * that was the match's last game, {@code --keep-open}'s linger.
     */
    static Played playGames(final Loop l, final int games, final boolean keepOpen, final long limitSec,
                            final long idleSec, final java.io.PrintStream out) throws InterruptedException {
        final Played r = new Played();
        final boolean abandonStalled = abandonsStalled(l.hasSocket(), games);
        while (true) {
            final int n = r.played + 1;
            final boolean[] idle = new boolean[1];
            boolean wasAbandoned = false;
            if (!awaitGameEnd(l, n, limitSec, idleSec, idle)) {
                if (!idle[0]) {
                    r.finished = false;        // the wall clock: the game thread is wedged
                    break;
                }
                if (!abandonStalled) {
                    r.abandoned = "ABANDONED: no client connected for " + idleSec
                            + " s, so the session ends; --idle-timeout 0 turns this off";
                    out.println(r.abandoned);
                    r.finished = false;
                    break;
                }
                if (!abandonStalled(l, n, idleSec, out)) {
                    r.abandoned = "ABANDONED: game " + n + " had no client for " + idleSec
                            + " s and could not be ended with no result, so the session ends (D448)";
                    out.println(r.abandoned);
                    r.finished = false;
                    break;
                }
                r.stalled++;
                l.stalledGames(r.stalled);
                wasAbandoned = true;
            }
            r.played = n;
            if (l.engineFailed()) {
                // D115: no next game after a crash -- the same deck crashes the
                // same way, and the run has already failed.
                break;
            }
            if (r.played >= games) {
                // The match we were asked for is done.  `--keep-open` is the
                // flag that says somebody is watching, and it is also the window
                // in which a browser's New Game button can still be pressed: if
                // one is, keep playing rather than tearing the session down
                // under the game the client just started.  awaitNextGame()
                // returns the instant a client that WAS connected leaves, so a
                // scripted client pays nothing for this.  D448: after an
                // abandoned last game too, exactly as after a played one.
                if (!(keepOpen && l.hasSocket())) {
                    break;
                }
                if (!awaitNextGame(l, r.played + 1, KEEP_OPEN_MS, "--keep-open", out)) {
                    break;
                }
                out.println("game " + (r.played + 1) + " began during --keep-open: " + l.gameId());
                continue;
            }
            if (wasAbandoned) {
                if (!startAfterAbandon(l, r.played + 1, out)) {
                    r.failure = "game " + (r.played + 1) + " did not begin after the abandoned game "
                            + r.played + " (D448)";
                    break;
                }
                continue;
            }
            if (!awaitNextGame(l, r.played + 1, NEXT_GAME_GRACE_MS,
                    "between games " + r.played + " and " + (r.played + 1), out)) {
                out.println("no `newGame` after game " + r.played + " -- the session ends here");
                break;
            }
            out.println("game " + (r.played + 1) + " began: " + l.gameId());
        }
        return r;
    }

    /**
     * <b>D448.</b>  Game {@code n} has had no client for {@code idleSec}: say who
     * began it and when it last spoke, end it with no result, and wait for its
     * {@code over}.  False when it cannot be ended that way -- the seat says why
     * before anything is posted ({@link WireGuiGame#abandonRefusal}), and the
     * {@code STALLED GAME n: not abandoned -- <reason>} line prints it -- or no
     * {@code over} came within {@link #ABANDON_OVER_MS}; the session then fails
     * as before.
     */
    static boolean abandonStalled(final Loop l, final int n, final long idleSec, final java.io.PrintStream out)
            throws InterruptedException {
        out.println("STALLED GAME " + n + " (" + l.gameId() + "): no client connected for " + idleSec + " s -- "
                + l.clientLine() + "; ending it with no result (D448)");
        final long mins = idleSec / 60;
        final String text = "Nobody was connected to this game for "
                + (mins > 0 ? mins + " min" : idleSec + " s") + ", so the server ended it with no result.";
        final String refusal = l.abandon(text);
        if (refusal != null) {
            out.println("STALLED GAME " + n + ": not abandoned -- " + refusal);
            return false;
        }
        if (!l.awaitGameEnd(n, ABANDON_OVER_MS)) {
            out.println("STALLED GAME " + n + ": no `over` within " + ABANDON_OVER_MS + " ms of conceding it");
            return false;
        }
        out.println("STALLED GAME " + n + " over: no result (amendment M70)");
        return true;
    }

    /**
     * <b>D448.</b>  After an abandoned game that was not the match's last: start
     * game {@code next} as {@code act: newGame {mode:"restart"}} would, and wait
     * for it to begin.  Nobody is connected to ask for it, and a server that
     * waited for a {@code newGame} here would end the session 30 s later, which
     * is the outage D448 exists to prevent.
     */
    static boolean startAfterAbandon(final Loop l, final int next, final java.io.PrintStream out)
            throws InterruptedException {
        l.startNextGame();
        if (!l.awaitGameStart(next, NEXT_AFTER_ABANDON_MS)) {
            out.println("STALLED GAME: game " + next + " did not begin within " + NEXT_AFTER_ABANDON_MS + " ms");
            return false;
        }
        out.println("game " + next + " began after the abandoned game, as a fresh match: " + l.gameId());
        return true;
    }

    /**
     * Wait for game {@code n} to end.  With a limit, exactly the old
     * {@code awaitGameEnd(n, limit)}.  Without one, wait for ever -- except that
     * on a {@code ws} seat the wait ends once no client has been connected for
     * {@code idleSec} (0: never), because nothing else would (see
     * {@link #NO_CLIENT_GAME_TIMEOUT_SEC}); {@code idle[0]} then says so.  Only
     * {@code /ws} counts, never an observer ({@link WsTransport#connected()}).
     */
    private static boolean awaitGameEnd(final Loop l, final int n, final long limitSec, final long idleSec,
                                        final boolean[] idle)
            throws InterruptedException {
        if (limitSec > 0) {
            return l.awaitGameEnd(n, limitSec * 1000L);
        }
        if (!l.hasSocket() || idleSec <= 0) {
            return l.awaitGameEnd(n, ONE_YEAR_MS);
        }
        long since = l.nanoTime();
        while (true) {
            if (l.awaitGameEnd(n, CONNECT_POLL_MS)) {
                return true;
            }
            final long now = l.nanoTime();
            if (l.connected()) {
                since = now;
            } else if ((now - since) / 1_000_000_000L >= idleSec) {
                idle[0] = true;
                return false;
            }
        }
    }

    /**
     * Wait for game {@code n} to <b>begin</b> -- i.e. for somebody to send
     * {@code act: newGame} -- applying the socket's own timeout rule.
     *
     * <p><b>This is the M6 verification fix.</b>  Both of the windows that
     * follow an {@code over} used to be a flat 30 s wall clock that ran whether
     * or not anybody was there, so the board's New Game row -- which appears at
     * exactly that moment -- was offering an act whose socket was about to be
     * closed underneath it.  The rule now is the one
     * {@link WsTransport#askTimeoutMs} has always used and CLAUDE.md calls "the
     * socket's own two rules": <b>while a client is connected the wait is
     * unbounded</b>, because a person reading the final board is allowed to
     * think, and {@code graceMs} applies only while nobody is attached.
     *
     * <p>Three exits, and the middle one is what keeps the gate fast:
     * <ul>
     *   <li>game {@code n} started -- {@code true};</li>
     *   <li>a client that <i>was</i> connected has gone -- {@code false}
     *       immediately, which is the old {@code keepOpen()} behaviour and why a
     *       scripted client still costs this loop nothing;</li>
     *   <li>{@code graceMs} elapsed with nobody ever attached -- {@code false}.</li>
     * </ul>
     *
     * <p>A non-{@code ws} transport has no notion of a connection, so it keeps
     * the flat {@code graceMs} it always had: {@code --transport auto} drives
     * itself and {@code --transport null} answers nothing.
     *
     * @param graceMs the cap that applies only while no client is connected
     * @param why     what this wait is, for the one line it prints
     */
    private static boolean awaitNextGame(final Loop l, final int n, final long graceMs, final String why,
                                         final java.io.PrintStream out)
            throws InterruptedException {
        if (!l.hasSocket()) {
            return l.awaitGameStart(n, graceMs);
        }
        boolean sawClient = false;
        boolean announced = false;
        long left = graceMs;
        while (true) {
            if (l.connected()) {
                sawClient = true;
                if (!announced) {
                    announced = true;
                    out.println("WAITING for `act: newGame` (" + why + ") -- a client is "
                            + "connected, so there is no deadline; it ends when the client does");
                    out.flush();
                }
                if (l.awaitGameStart(n, CONNECT_POLL_MS)) {
                    return true;
                }
                continue;
            }
            if (sawClient) {
                // It read the final frames and left.  Check the clock BEFORE
                // saying so: a client that sends `newGame` and closes the socket
                // in the same breath is not a session that ended.
                if (l.awaitGameStart(n, 0L)) {
                    return true;
                }
                // D114: a `newGame` that arrived before Forge finished the last
                // game is queued, not lost, and it runs the moment Forge has --
                // which is a moment, not a wait on a person.
                if (l.newGameQueued() && l.awaitGameStart(n, QUEUED_NEW_GAME_GRACE_MS)) {
                    return true;
                }
                // Nothing is going to press New Game, and holding the JVM open
                // for 30 s more would only slow every scripted run in
                // tools/check-all.sh down.
                out.println("the client disconnected (" + why + ") -- the session ends here");
                return false;
            }
            final long slice = Math.min(CONNECT_POLL_MS, left);
            if (l.awaitGameStart(n, slice)) {
                return true;
            }
            left -= slice;
            if (left <= 0) {
                out.println("no `newGame` within " + graceMs + " ms (" + why
                        + ") and no client is connected");
                return false;
            }
        }
    }

    /**
     * Amendment M51: what a LAN server or a served site adds to the readiness
     * lines.  {@code scripts/play.sh --lan} reprints the {@code WS LAN PAGE}
     * lines (and a QR code of the first); the token appears nowhere else.
     */
    private static void printLan(final WsTransport ws, final int p) {
        if (ws.siteRoot() != null) {
            System.out.println("WS SITE      http://127.0.0.1:" + p + "/  (" + ws.siteRoot() + ")");
        }
        if (!ws.lan()) {
            return;
        }
        System.out.println("WS LAN       bound " + WsTransport.LAN_BIND + ":" + p
                + " -- every non-loopback request must carry the pairing token (amendment M51)");
        final List<String> ips = WsTransport.lanAddresses();
        if (ips.isEmpty()) {
            System.out.println("WS LAN       no non-loopback IPv4 address found on this machine");
        }
        for (final String ip : ips) {
            if (ws.siteRoot() != null) {
                System.out.println("WS LAN PAGE  http://" + ip + ":" + p + "/?token=" + ws.lanToken());
            } else {
                System.out.println("WS LAN SEAT  ws://" + ip + ":" + p + "/ws?token=" + ws.lanToken());
            }
        }
    }

    /** D303: the environment variable a restarted {@code --lan} bridge takes its token from. */
    static final String LAN_TOKEN_ENV = "MTGTABLE_LAN_TOKEN";

    /**
     * Amendment M51's pairing token, or (D303) the one {@code scripts/play.sh}
     * hands a RESTARTED bridge in {@link #LAN_TOKEN_ENV}: the match launcher
     * restarts the engine on new decks, and a fresh token would break the
     * phone's link and the coach helper's copy of it.  Unset or empty is a
     * fresh token, as before.  A value that is not a token (16+ characters of
     * {@code [A-Za-z0-9_-]}) is refused -- without echoing it.
     */
    static String lanToken(final String given) {
        if (given == null || given.isEmpty()) {
            return WsTransport.newToken();
        }
        if (!given.matches("^[A-Za-z0-9_-]{16,}$")) {
            throw new IllegalArgumentException(LAN_TOKEN_ENV
                    + " is set but is not a pairing token (16 or more of A-Z a-z 0-9 _ -)");
        }
        return given;
    }

    private static Transport transport(final Args a, final Config cfg) {
        switch (a.transport) {
        case "null":    return new NullTransport();
        case "auto": {
            final AutoTransport t = new AutoTransport();
            t.setProbe(a.probe);
            t.setGames(a.games);               // M6: it sends `newGame` after each `over`
            return t;
        }
        case "console": return new ConsoleTransport();
        case "ws":
            // Amendment M51 (D287, D288): --lan binds every interface behind a
            // fresh pairing token, --site-dir serves a built ForgeCoach at `/`.
            // Neither given is the loopback server M50 left.
            return new WsTransport(a.port > 0 ? a.port : cfg.wsPort(), cfg.wsAllowedOrigins(),
                    a.lan ? lanToken(System.getenv(LAN_TOKEN_ENV)) : null,
                    a.siteDir == null ? null : resolve(cfg, a.siteDir).toPath());
        default:
            throw new IllegalArgumentException("--transport must be null|auto|console|ws, got "
                    + a.transport);
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
        // Protocol section 8.1 / amendment M31: the two flags that change what
        // the ENGINE is asked, recorded so a fixture says why it is shaped the
        // way it is.  Both optional and OMITTED when unset, so no recording made
        // before this existed changes; check-redaction tolerates them and
        // requires neither.
        //
        // Without them, fixtures/games/human-amount-7.jsonl carries two
        // `confirm` asks that cannot occur on stock Forge preferences with
        // nothing in the file saying why, and a reader who re-records it on
        // defaults concludes the emitter changed.
        if (a.probe) {
            o.n("policy", "probe");
        }
        if (a.manaLostPrompt) {
            o.key("prefs").arr().v("UI_MANA_LOST_PROMPT").end();
        }
        // Amendment M62 (D414): who answered for the AI seat, for the human test
        // set's labels (tools/ml/human_collect.py) -- hello_ok.match.aiPolicy
        // names the policy, and only this says a search seat's version and
        // budget.  Omitted for plain Forge, so no plain recording changes.  The
        // search's config is its own knobs (no card, no deck).  `version` is the
        // live default's name (search-v2, D412) when the seat runs it, at any
        // budget; null when other knobs were changed.
        if (!"plain".equals(a.aiPolicy)) {
            o.key("ai").obj().n("policy", a.aiPolicy);
            if ("search".equals(a.aiPolicy)) {
                final SearchConfig sc = SearchConfig.parseLive(a.aiSearch);
                final boolean live = sc.toString().equals(
                        SearchConfig.parseLive("ms=" + sc.budgetMs).toString());
                o.n("version", live ? SearchConfig.LIVE_VERSION : null);
                o.n("budgetMs", sc.budgetMs);
                o.n("config", sc.toString());
            }
            o.end();
        }
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

    /**
     * {@code unsupportedCards} is the VIEWING seat's deck alone: each entry is a
     * card name.
     *
     * <p>{@code gameNumber} / {@code gameCount} are amendment <b>M41</b>: which
     * game of the match this handshake opens, and how many the match is played
     * to ({@code --games N}).  The client counted {@code hello_ok}s itself
     * before this existed, which restarted at 1 on a page reload and could never
     * say "of 3"; both numbers are known here and neither is derivable there.
     * <b>Both are omitted for a {@code --games 1} session</b> -- see below.
     *
     * <p>{@code match} is amendment <b>M44</b>: each seat's deck by NAME, the
     * AI's profile and the match length; amendment <b>M56</b> adds the AI
     * seat's policy ({@code aiPolicy}), so the board can name the AI the
     * player chose.  The AI's deck is {@code {name, cards}}
     * and nothing else -- a path or a hash identifies a decklist exactly, which
     * is why {@link #sessionHeader} nulls both for that seat, and hard rule 8
     * says the opponent's library is hidden.  The name is the {@code .dck}'s own
     * {@code Name=}, the thing a player says across a real table.
     */
    private static String helloOkBody(final Config cfg, final String gameId, final Args a,
                                      final PlayerView viewer, final List<PlayerView> players,
                                      final List<String> unsupported, final int gameNumber,
                                      final File deck1File, final Deck deck1,
                                      final File deck2File, final Deck deck2,
                                      final String aiProfile) {
        final JsonOut o = new JsonOut().obj();
        o.n("gameId", gameId);
        o.n("you", viewer.getId());
        o.n("seed", a.seed);
        // Omitted ENTIRELY for a one-game match: "where in the match are we"
        // has no answer when there is one game, `gameLabel()` in reduce.ts
        // prints nothing for that case either, and the session header's own
        // optional keys (`policy`, `prefs` -- M31) set the precedent.  It also
        // keeps every single-game recording byte-comparable against a fresh one,
        // which is what gate step 9b reads.
        if (a.games > 1) {
            o.n("gameNumber", gameNumber);
            o.n("gameCount", a.games);
        }
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
        // M44.  The viewer is always seat 0 with deck1 (HostedMatch sorts the
        // human first -- see Args.parse's --seat check), exactly the mapping
        // sessionHeader() uses for `decks`.  Last, so every key a pre-M44
        // reader knows keeps its position.
        o.key("match").obj();
        o.key("yourDeck").obj()
                .n("name", deckName(deck1, deck1File))
                .n("path", rel(cfg, deck1File))
                .n("cards", deck1.getMain().countAll())
                .end();
        // NAME AND COUNT ONLY.  tools/check-redaction.mjs fails any other key.
        o.key("aiDeck").obj()
                .n("name", deckName(deck2, deck2File))
                .n("cards", deck2.getMain().countAll())
                .end();
        o.n("aiProfile", aiProfile);
        o.n("games", a.games);
        // Amendment M56: who answers for the AI seat -- `--ai-policy`, plain |
        // outlets | search (D314, D333).  Last, so M44's keys keep their
        // positions.  A word from a fixed set, never a knob or a path.
        o.n("aiPolicy", a.aiPolicy);
        o.end();
        return o.end().done();
    }

    /** A deck's public name -- {@link Bootstrap#deckName}, shared with RecordMatch (M47). */
    private static String deckName(final Deck d, final File f) {
        return Bootstrap.deckName(d, f);
    }

    /**
     * The summary's proof that the AI played the profile it was given -- read
     * from the ENGINE, not from our own argument.
     *
     * <p>Two reads.  {@code LobbyPlayerAi.getAiProfile()} is what
     * {@code createAiPlayer} stored.  Then, for the in-game {@link Player} whose
     * lobby player is ours, {@code AiProfileUtil.getProperty(Player, AiProps)}
     * -- the exact call {@code AiController.getProperty} makes whenever the AI
     * consults its profile -- for two keys: {@code PLAY_AGGRO} (Reckless's
     * headline, {@code true} only there) and
     * {@code CHANCE_TO_CHAIN_TWO_DAMAGE_SPELLS}, which is different in each of
     * the four 2.0.14 files (90 / 25 / 75 / 100), so {@code tools/ten-games.sh}
     * can compare it with the profile file itself.  {@code getAIProp} falls
     * back to a property's built-in default for a profile it has no map for, so
     * "the name went in" and "the numbers came out" are different claims.
     *
     * <p>{@code Player} is the game model, not the view graph (hard rule 3), and
     * this runs after the last game ended; {@code getLobbyPlayer()} is a field
     * read.
     */
    private static String aiProfileEvidence(final HostedMatch hosted, final LobbyPlayer aiLobby,
                                            final String asked) {
        final StringBuilder sb = new StringBuilder(asked);
        if (aiLobby instanceof LobbyPlayerAi) {
            sb.append("  (LobbyPlayerAi.getAiProfile()=")
              .append(((LobbyPlayerAi) aiLobby).getAiProfile()).append(')');
        }
        Player inGame = null;
        if (hosted.getGame() != null) {
            for (final Player p : hosted.getGame().getPlayers()) {
                if (p.getLobbyPlayer() == aiLobby) {
                    inGame = p;
                }
            }
        }
        if (inGame == null) {
            return sb.append("  (in game: no AI player found -- nothing to read)").toString();
        }
        return sb.append("  (in game: PLAY_AGGRO=")
                .append(AiProfileUtil.getProperty(inGame, AiProps.PLAY_AGGRO))
                .append(" CHANCE_TO_CHAIN_TWO_DAMAGE_SPELLS=")
                .append(AiProfileUtil.getProperty(inGame, AiProps.CHANCE_TO_CHAIN_TWO_DAMAGE_SPELLS))
                .append(", read through AiProfileUtil.getProperty(Player, AiProps) -- the call "
                        + "AiController.getProperty makes)")
                .toString();
    }

    // ==================================================================
    // Odds and ends
    // ==================================================================

    /** CLI arguments. */
    private static final class Args {
        String transport = "console";
        String deck;
        String deck2;
        /** {@code --ai-profile}; null means {@link Bootstrap#DEFAULT_AI_PROFILE}. */
        String aiProfile;
        /** {@code --ai-policy plain|outlets|search} (D314); plain = Forge's own AI. */
        String aiPolicy = "plain";
        /** {@code --ai-search <k=v,...>} (D312's SearchConfig keys); implies {@code --ai-policy search}. */
        String aiSearch = "";
        String aiName = "Forge AI";
        String gameId;
        long seed;
        int seat;
        /** {@code --transport ws} only; 0 means "whatever config.json's wsPort says". */
        int port;
        boolean keepOpen;
        /** {@code --lan} (M51, D287): bind every interface behind a fresh pairing token; {@code ws} only. */
        boolean lan;
        /** {@code --site-dir <path>} (M51, D288): serve this built ForgeCoach at {@code /}; {@code ws} only. */
        String siteDir;
        /**
         * {@code --game-timeout <sec>} (D286): the wall-clock limit on one game; 0 is none;
         * null is the transport's default ({@link #gameLimitSec}).
         */
        Long gameTimeoutSec;
        /** {@code --idle-timeout <sec>} (D286): {@code ws} only; 0 is off. */
        long idleTimeoutSec = NO_CLIENT_GAME_TIMEOUT_SEC;
        boolean idleTimeoutFlag;
        /** {@code --games}: {@code GameRules.setGamesPerMatch}. */
        int games = 1;
        /** {@code --probe}: {@code AutoTransport}'s M5 probe policy. */
        boolean probe;
        /**
         * {@code FPref.UI_MANA_LOST_PROMPT}, in memory.  The value that is used;
         * {@code config.json}'s {@code "manaLostPrompt"} fills it in when neither
         * flag was typed.
         */
        boolean manaLostPrompt;
        /** Null when neither {@code --mana-lost-prompt} nor {@code --no-…} was given. */
        Boolean manaLostPromptFlag;
        /** {@code --humans 1|2} (amendment M59, D402): 2 seats two people and no AI. */
        int humans = 1;
        /** {@code --seats-file <path>} (M59, D404): the two names and token digests. */
        String seatsFile;
        /** {@code --table-port <n>} (M59): the two seats' listener; 0 = config.json's tablePort. */
        int tablePort;
        /** {@code --table-origin <origin>} (M59), repeatable: an extra page origin, e.g. a tunnel's. */
        final List<String> tableOrigins = new ArrayList<>();
        /** {@code --decision-timeout <sec>} (M59, D403); null = the default, 0 = off. */
        Long decisionTimeoutSec;
        /** {@code --seat-grace <sec>} (M59, D403): away this long, and the opponent may claim the win. */
        long graceSec = TableMatch.DEFAULT_GRACE_SEC;

        static Args parse(final String[] argv) {
            final Args a = new Args();
            for (int i = 0; i < argv.length; i++) {
                final String k = argv[i];
                switch (k) {
                case "--transport": a.transport = need(argv, ++i, k); break;
                case "--deck":      a.deck = need(argv, ++i, k); break;
                case "--deck2":
                case "--ai-deck": {
                    // Match setup (M44): `--ai-deck` is the name a player
                    // reads; `--deck2` is the one fourteen recordings and
                    // every gate step already type.  Same flag.
                    final String v = need(argv, ++i, k);
                    if (a.deck2 != null && !a.deck2.equals(v)) {
                        throw new IllegalArgumentException("--deck2 and --ai-deck are the same flag "
                                + "and were given two different decks: " + a.deck2 + " and " + v);
                    }
                    a.deck2 = v;
                    break;
                }
                case "--ai-profile": a.aiProfile = need(argv, ++i, k); break;
                case "--ai-name":   a.aiName = need(argv, ++i, k); break;
                case "--ai-policy":
                    a.aiPolicy = need(argv, ++i, k);
                    if (!a.aiPolicy.matches("plain|outlets|search")) {
                        throw new IllegalArgumentException("--ai-policy is plain, outlets or search");
                    }
                    break;
                case "--ai-search":
                    a.aiSearch = need(argv, ++i, k);
                    a.aiPolicy = "search";
                    SearchConfig.parseLive(a.aiSearch);   // fail now, not after the engine boots
                    break;
                case "--game-id":   a.gameId = need(argv, ++i, k); break;
                case "--seat":      a.seat = Integer.parseInt(need(argv, ++i, k)); break;
                case "--seed":      a.seed = Long.parseLong(need(argv, ++i, k)); break;
                case "--port":      a.port = Integer.parseInt(need(argv, ++i, k)); break;
                case "--keep-open": a.keepOpen = true; break;
                case "--lan":       a.lan = true; break;
                case "--site-dir":  a.siteDir = need(argv, ++i, k); break;
                case "--game-timeout":
                    a.gameTimeoutSec = Long.parseLong(need(argv, ++i, k));
                    if (a.gameTimeoutSec < 0) {
                        throw new IllegalArgumentException("--game-timeout is seconds, 0 for none");
                    }
                    break;
                case "--idle-timeout":
                    a.idleTimeoutSec = Long.parseLong(need(argv, ++i, k));
                    a.idleTimeoutFlag = true;
                    if (a.idleTimeoutSec < 0) {
                        throw new IllegalArgumentException("--idle-timeout is seconds, 0 for off");
                    }
                    break;
                case "--games":     a.games = Integer.parseInt(need(argv, ++i, k)); break;
                case "--humans":
                    a.humans = Integer.parseInt(need(argv, ++i, k));
                    if (a.humans != 1 && a.humans != 2) {
                        throw new IllegalArgumentException("--humans is 1 (you against the AI) or 2 (two people)");
                    }
                    break;
                case "--seats-file":   a.seatsFile = need(argv, ++i, k); break;
                case "--table-port":   a.tablePort = Integer.parseInt(need(argv, ++i, k)); break;
                case "--table-origin": a.tableOrigins.add(need(argv, ++i, k)); break;
                case "--decision-timeout":
                    a.decisionTimeoutSec = Long.parseLong(need(argv, ++i, k));
                    if (a.decisionTimeoutSec < 0) {
                        throw new IllegalArgumentException("--decision-timeout is seconds, 0 for off");
                    }
                    break;
                case "--seat-grace":
                    a.graceSec = Long.parseLong(need(argv, ++i, k));
                    if (a.graceSec < 0) {
                        throw new IllegalArgumentException("--seat-grace is seconds");
                    }
                    break;
                case "--probe":     a.probe = true; break;
                case "--mana-lost-prompt":
                    a.manaLostPrompt = true;
                    a.manaLostPromptFlag = Boolean.TRUE;
                    break;
                case "--no-mana-lost-prompt":
                    a.manaLostPrompt = false;
                    a.manaLostPromptFlag = Boolean.FALSE;
                    break;
                default:
                    throw new IllegalArgumentException("unknown argument " + k + "\n"
                        + "usage: MtgTable [--transport null|auto|console|ws] [--deck <path>] "
                        + "[--deck2|--ai-deck <path>] [--ai-profile Default|Cautious|Reckless|Experimental] "
                        + "[--ai-policy plain|outlets|search] [--ai-search ms=1500,turns=0,...] "
                        + "[--seed <n>] [--seat 0|1] [--ai-name <name>] "
                        + "[--game-id <id>] [--port <n>] [--keep-open] [--lan] [--site-dir <path>] [--games <n>] "
                        + "[--game-timeout <sec>] [--idle-timeout <sec>] "
                        + "[--probe] [--mana-lost-prompt] [--no-mana-lost-prompt] "
                        + "[--humans 1|2] [--seats-file <path>] [--table-port <n>] [--table-origin <origin>] "
                        + "[--decision-timeout <sec>] [--seat-grace <sec>]");
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
            if (a.humans == 2) {
                // Amendment M59 (D402).  One game, two people, nobody else.
                if (!a.transport.matches("ws|auto|null")) {
                    throw new IllegalArgumentException("--humans 2 needs --transport ws (or auto / null, the "
                            + "automated seats the gate plays)");
                }
                if (a.games != 1) {
                    throw new IllegalArgumentException("--humans 2 plays one game per engine start: the draft "
                            + "room runs a best of three, one start per game, with --seats-file's match (D406)");
                }
                if ("ws".equals(a.transport) && a.seatsFile == null) {
                    throw new IllegalArgumentException("--humans 2 --transport ws needs --seats-file: each seat's "
                            + "token is what opens it, and nothing else does");
                }
                if (a.siteDir != null) {
                    throw new IllegalArgumentException("--humans 2 serves no site: the draft room's listener does");
                }
            } else if (a.seatsFile != null || !a.tableOrigins.isEmpty() || a.tablePort != 0
                    || a.decisionTimeoutSec != null) {
                throw new IllegalArgumentException("--seats-file, --table-port, --table-origin and "
                        + "--decision-timeout are for --humans 2");
            }
            if ((a.lan || a.siteDir != null) && !"ws".equals(a.transport)) {
                throw new IllegalArgumentException("--lan and --site-dir need --transport ws");
            }
            if (a.games < 1) {
                throw new IllegalArgumentException("--games must be at least 1, got " + a.games);
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
    static List<String> unsupported(final Deck... decks) {
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

    static String rel(final Config cfg, final File f) {
        final String root = cfg.root().getAbsolutePath() + File.separator;
        final String p = f.getAbsolutePath();
        return p.startsWith(root) ? p.substring(root.length()) : p;
    }

    static String sha256(final File f) {
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
