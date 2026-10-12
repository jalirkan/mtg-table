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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

/**
 * A scripted "dumb human": the end-to-end test that needs no person at the
 * keyboard.
 *
 * <h2>The policy, in full</h2>
 *
 * <ul>
 *   <li><b>On an {@code input} frame</b> -- if there are selectable cards, click
 *       one (never more than the selection needs); else if OK is enabled, press
 *       OK; else if Cancel is enabled, press Cancel; else wait.  That order is
 *       protocol section 4.2 read as a policy: <b>a disabled OK means the engine
 *       wants a card click</b>, and a client that only presses buttons hangs at
 *       the discard step with no error.</li>
 *   <li><b>On an {@code ask} frame</b> -- the minimal legal value for the kind:
 *       the first option, the minimum count, the identity order, all the damage
 *       on the first blocker, the engine's own default button for a confirm.
 *       Never {@code null} for {@code order}, {@code choose_list} or
 *       {@code manipulate_list}, whose call sites dereference the result.</li>
 *   <li><b>The M5 probe policy</b> ({@link #setProbe}, off by default) -- the
 *       same policy with four decisions taken the other way, so that
 *       {@code useMana}, {@code clickAbility}, {@code showInputDialog} and a
 *       library search that actually fetches are reachable at all.</li>
 *   <li><b>A progress watchdog</b> -- {@value #STUCK_MS} ms with no frame at all
 *       and it concedes, so a wedged run fails in seconds rather than hanging a
 *       test suite.</li>
 *   <li><b>An ask ceiling</b> -- {@value #ASK_REPEAT_CAP} identical asks with no
 *       turn/phase change in between and it concedes too.  A loop on one ask is
 *       the one wedge the silence watchdog cannot see, because answering it
 *       produces a frame every time.</li>
 * </ul>
 *
 * <p>It plays badly on purpose.  Clicking the first selectable card is not a
 * strategy; it is a way to reach as many engine code paths as a real seat does
 * -- the Teamwork cost, the mulligan, blockers, damage assignment -- without
 * modelling any of them.
 */
public class AutoTransport implements Transport {

    /** No frame for this long and the policy concedes rather than hang. */
    static final long STUCK_MS = 60_000L;
    /** Never sit on one decision longer than this. */
    static final long STEP_CAP_MS = 2_000L;
    /** How long a game thread may stay parked on one ask. */
    static final long ASK_TIMEOUT_MS = 30_000L;
    /** A quiet inbox for this long means the board has settled and we may act. */
    static final long SETTLE_MS = 120L;

    /**
     * How many times one identical ask may arrive <b>with no progress in
     * between</b> before the policy concedes rather than go on answering it.
     *
     * <p>{@link #STUCK_MS} is a <em>silence</em> watchdog and an ask loop is not
     * silent: the engine re-asks the instant we answer, so a policy stuck on one
     * question produces frames as fast as the CPU allows and the silence
     * watchdog never fires.  Measured, M5: a latched {@code confirm} answer
     * produced <b>2,278</b> identical asks and a 35 MB frame log inside one
     * 300 s gate step.  This is the other half of the guard -- the alternating
     * answer below is what usually escapes, and this is what stops any ask, of
     * any kind, from burning a gate step when it does not.
     */
    static final int ASK_REPEAT_CAP = 20;

    /**
     * The policy watchdog's thread name.  A constant for the same reason every
     * other thread name in the bridge is one: {@link HeadlessGuiBase} asserts
     * the whole set at class-init and {@code tools/lint-bridge.sh} section 6 greps
     * for it, because {@code ThreadUtil.isGameThread()} is nothing but
     * {@code getName().startsWith("Game")}.
     */
    static final String WATCHDOG_THREAD_NAME = "mtg-table-auto-watchdog";

    /** The six wire spellings of {@code state.players[].manaPool}, in pool order. */
    private static final String[] POOL_COLORS = {"W", "U", "B", "R", "G", "C"};

    /** The {@code useMana} colour name for each of {@link #POOL_COLORS}. */
    private static final String[] POOL_COLOR_NAMES =
            {"white", "blue", "black", "red", "green", "colorless"};

    private final LinkedBlockingQueue<String> inbox = new LinkedBlockingQueue<>();
    private final AtomicLong frames = new AtomicLong();
    private final AtomicLong acts = new AtomicLong();
    private final AtomicLong answers = new AtomicLong();

    /** The bridge, for acts and answers.  Protected: {@link NullTransport} is a subclass. */
    protected Inbound inbound;
    /** The shared reply pool; a subclass may complete it directly. */
    protected ReplyPool pool;
    private Thread worker;
    private Thread watchdog;
    private volatile boolean running = true;
    private volatile long lastFrameNanos = System.nanoTime();
    private volatile boolean conceded;

    /** The most recent input frame, decided once the board stops changing. */
    private volatile Map<String, Object> pendingInput;
    /** The key of the last input frame seen, so a re-push can be told from a change. */
    private String lastSeenInputKey = "";
    /** How many times we have already acted on one exact input frame. */
    private final Map<String, Integer> tries = new HashMap<>();
    /** Our seat, from hello_ok. */
    private Integer me;
    /** Enough of the last snapshot to know whether we may act, and with what. */
    private final List<Integer> myHand = new ArrayList<>();
    /** The subset of {@link #myHand} whose type line says Land. */
    private final List<Integer> myLands = new ArrayList<>();
    private volatile boolean myPriority;
    private volatile boolean myTurn;
    private volatile boolean myMainPhase;
    private volatile boolean stackEmpty = true;
    /** My six mana-pool counts, in {@link #POOL_COLORS} order, from the last snapshot. */
    private final int[] myPool = new int[POOL_COLORS.length];

    /**
     * <b>The probe policy</b> (M5), off by default.
     *
     * <p>The default policy above is the <em>minimal legal answer</em>, and that
     * is deliberately not the same thing as a policy that reaches every corner
     * of the engine.  Three of the eleven ask kinds and two of the twelve acts
     * are downstream of a decision the minimal policy never takes -- it answers
     * a min-0 {@code choose_entities} with "none", so a library search fetches
     * nothing; it never picks {@code getInteger}'s "Other..." entry, so
     * {@code showInputDialog} is never reached; it presses the engine's own
     * {@code Auto} button rather than spending floating mana, so
     * {@code useMana} is never sent; and it answers an {@code ability_menu} by
     * index rather than by a {@code clickAbility} act.
     *
     * <p>With this on, and <b>only</b> with it on, the policy takes the other
     * branch in those four places.  It is a flag rather than a new default
     * because the default is what ten consecutive games are asserted against
     * (PLAN.md M5) and the committed fixtures were recorded with it; a policy
     * change that reaches further is also a policy change that can lose more
     * games and take longer to do it.
     */
    private volatile boolean probe;

    /**
     * How many games this seat intends to play (<b>M6</b>).  One, unless
     * {@code MtgTable --games N} says otherwise.
     *
     * <p>It lives on the <em>client</em> and not on the bridge on purpose:
     * nothing in {@link WireGuiGame} starts a game, and a session that survives
     * {@code over} survives it because whoever is playing the seat sent
     * {@code act: newGame} (protocol amendment M38).  This class is the seat
     * with nobody at the keyboard, so it sends it too -- which is also what
     * makes the {@code sideboard} ask between games reachable at all.
     */
    private volatile int games = 1;
    /** How many {@code over} frames have arrived. */
    private int gamesSeen;

    /**
     * How many asks carrying each {@code confirm} / numeric {@code text} prompt
     * we have already answered.  Both kinds can be answered <em>legally</em> and
     * still not advance -- {@code AbstractGuiGame.getInteger}'s "Other..." branch
     * re-asks forever unless the string is a number inside its own
     * {@code [min,max]} (bounds the {@code text} body does not carry), and a
     * floating-mana confirm answered "no" simply does not pass priority -- so
     * the second identical prompt is answered differently from the first.
     */
    private final Map<String, Integer> askPromptsSeen = new HashMap<>();

    /**
     * How many asks carrying each {@code kind|prompt|title} have arrived since
     * the game last made visible progress -- see {@link #ASK_REPEAT_CAP} and
     * {@link #progressKey}.  Every kind, not just the two above: the ceiling is
     * a property of "the same question over and over", not of any one kind.
     */
    private final Map<String, Integer> askRepeats = new HashMap<>();

    /**
     * {@code turn|phase|activePlayer} of the last snapshot, so that "the same
     * prompt again" can mean "the same prompt again <em>with nothing having
     * happened</em>".  An honest repeat later in the game starts its count, and
     * therefore its answer, from the engine's own default again.
     */
    private String lastProgressKey = "";

    @Override
    public void start(final Inbound in, final ReplyPool replyPool) {
        this.inbound = in;
        this.pool = replyPool;
        // R3: the name must not start with "Game", or ThreadUtil.isGameThread()
        // would call this thread a game thread and every assert would invert.
        worker = new Thread(this::pump, Transport.IO_THREAD_NAME);
        worker.setDaemon(true);
        worker.start();
        watchdog = new Thread(this::watch, WATCHDOG_THREAD_NAME);
        watchdog.setDaemon(true);
        watchdog.start();
    }

    @Override
    public void push(final String frameJson) {
        frames.incrementAndGet();
        lastFrameNanos = System.nanoTime();
        inbox.add(frameJson);
    }

    @Override
    public String ask(final String askId, final String askFrameJson, final long timeoutMs) {
        Transport.assertGameThread("Transport.ask");
        push(askFrameJson);                    // the worker sees it and answers
        return pool.await(askId, timeoutMs);
    }

    @Override
    public long askTimeoutMs(final String kind) {
        return ASK_TIMEOUT_MS;
    }

    @Override
    public void close() {
        running = false;
        if (pool != null) {
            pool.cancelAll();
        }
    }

    public long frames() {
        return frames.get();
    }

    public long acts() {
        return acts.get();
    }

    public long answers() {
        return answers.get();
    }

    /** Turn the M5 probe policy on; see {@link #probe}.  Call before {@link #start}. */
    public void setProbe(final boolean on) {
        this.probe = on;
    }

    /** How many games to play before letting the session end (M6). */
    public void setGames(final int n) {
        this.games = Math.max(1, n);
    }

    // ==================================================================
    // The worker: one frame at a time, on mtg-table-io
    // ==================================================================

    /**
     * Drain, settle, decide.
     *
     * <p>One decision per <em>settled</em> board, not one per frame.  A single
     * engine decision produces several frames -- {@code showPromptMessage} and
     * {@code updateButtons} are two EDT calls and therefore two {@code input}
     * frames, and a {@code state} usually lands between them -- so a policy that
     * acts on every frame fires three clicks for one decision and queues them
     * all on the EDT.  Measured: that is how the first version of this class
     * burned through its whole plan during the mulligan.
     *
     * <p>"Settled" cannot mean "no frames at all", either:
     * {@code AbstractGuiGame.awaitNextInput()} re-pushes the same prompt and the
     * same buttons on a 250 ms timer for as long as the engine is thinking, so
     * the inbox is never quiet and a naive settle detector decides only when its
     * timeout forces it -- one act every {@value #STEP_CAP_MS} ms, which is a
     * ten-minute game.  So an input frame identical to the last one is <b>not
     * activity</b>: only a changed input, a new state, or a notice is.
     */
    private void pump() {
        long lastActivity = System.nanoTime();
        while (running) {
            final String frame;
            try {
                frame = inbox.poll(40, TimeUnit.MILLISECONDS);
            } catch (final InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
            if (frame != null) {
                try {
                    if (react(frame)) {
                        lastActivity = System.nanoTime();
                    }
                } catch (final RuntimeException e) {
                    System.err.println("AUTO FAILED on a frame: " + e);
                    e.printStackTrace();
                }
                continue;
            }
            final Map<String, Object> settled = pendingInput;
            final long quietMs = (System.nanoTime() - lastActivity) / 1_000_000L;
            if (settled != null && quietMs >= SETTLE_MS) {
                lastActivity = System.nanoTime();   // rate-limit: one decision per settle window
                try {
                    decide(settled);
                } catch (final RuntimeException e) {
                    System.err.println("AUTO FAILED on a decision: " + e);
                    e.printStackTrace();
                }
            }
        }
    }

    /** @return true when the frame changed something a decision should wait for. */
    private boolean react(final String frameJson) {
        final Object parsed = Json.parse(frameJson);
        if (!(parsed instanceof Map)) {
            return false;
        }
        @SuppressWarnings("unchecked")
        final Map<String, Object> f = (Map<String, Object>) parsed;
        final String type = String.valueOf(f.get("type"));
        final Object bodyObj = f.get("body");
        if (!(bodyObj instanceof Map)) {
            return false;
        }
        @SuppressWarnings("unchecked")
        final Map<String, Object> body = (Map<String, Object>) bodyObj;

        switch (type) {
        case "hello_ok":
            me = intOf(body.get("you"));
            return true;
        case "state":
            onState(body);
            return true;
        case "input": {
            pendingInput = body;               // decided once the board settles
            final String key = key(body);
            final boolean changed = !key.equals(lastSeenInputKey);
            lastSeenInputKey = key;
            return changed;                    // a re-pushed identical prompt is not activity
        }
        case "ask":
            onAsk(body);
            return true;
        case "over":
            onOver(body);
            return true;
        default:
            return true;
        }
    }

    /**
     * <b>M6.</b>  One game ended; decide whether to ask for another.
     *
     * <p>The mode is read off the frame, not guessed: an {@code over} with
     * {@code matchOver: false} is the middle of a match and
     * {@code "continue"} is the next game of it; {@code matchOver: true} means
     * the {@code Match} is finished and only {@code "restart"} can produce
     * another game (report 11 section 8.2).  Both come back as a new
     * {@code hello_ok} with a new {@code gameId}, which is why every cached id
     * below is cleared here rather than after it arrives.
     */
    private void onOver(final Map<String, Object> body) {
        gamesSeen++;
        if (gamesSeen >= games) {
            running = false;
            return;
        }
        final Object mo = body.get("matchOver");
        final boolean matchOver = mo instanceof Boolean ? ((Boolean) mo).booleanValue() : true;
        final String mode = matchOver ? "restart" : "continue";
        System.err.println("AUTO: game " + gamesSeen + " over (matchOver=" + matchOver
                + "); asking for game " + (gamesSeen + 1) + " with newGame{" + mode + "}");
        // Every id in these came from a game that no longer exists.
        pendingInput = null;
        lastSeenInputKey = "";
        tries.clear();
        askPromptsSeen.clear();
        askRepeats.clear();
        lastProgressKey = "";
        myHand.clear();
        myLands.clear();
        myPriority = false;
        myTurn = false;
        myMainPhase = false;
        stackEmpty = true;
        java.util.Arrays.fill(myPool, 0);
        act("newGame", Map.of("mode", mode));
    }

    // ---- the input path ---------------------------------------------------

    /**
     * One decision per {@code input} frame, from a plan that is rebuilt every
     * time the frame changes.
     *
     * <p>The plan is a list of moves in preference order, and the Nth time this
     * exact frame arrives we play the Nth move.  A repeated frame means the last
     * act changed nothing -- either the engine wants more clicks (the Teamwork
     * tally: OK stays disabled until the tapped creatures total power 2) or it
     * wanted a different card -- so walking down the plan is what stops a dumb
     * policy from clicking one illegal card forever.
     */
    private void decide(final Map<String, Object> body) {
        final Map<String, Object> sel = map(body.get("selectable"));
        final List<Integer> cardIds = ints(sel == null ? null : sel.get("cardIds"));
        final Integer selMin = intOf(sel == null ? null : sel.get("min"));
        final Map<String, Object> buttons = map(body.get("buttons"));
        final Map<String, Object> ok = map(buttons == null ? null : buttons.get("ok"));
        final Map<String, Object> cancel = map(buttons == null ? null : buttons.get("cancel"));
        final boolean okOn = bool(ok == null ? null : ok.get("enabled"));
        final boolean cancelOn = bool(cancel == null ? null : cancel.get("enabled"));
        final String prompt = String.valueOf(body.get("prompt"));

        final String key = key(body);
        final int attempt = tries.merge(key, Integer.valueOf(1), (a, b) -> Integer.valueOf(a + b))
                .intValue() - 1;

        final List<String[]> plan = plan(prompt, cardIds, selMin, okOn, cancelOn);
        if (plan.isEmpty()) {
            // Nothing is clickable and no button is enabled: this input is not
            // for us -- the engine is thinking, or the AI holds priority.  The
            // watchdog is what stops "wait" from being "wait forever".
            return;
        }
        final String[] move;
        if (attempt < plan.size()) {
            move = plan.get(attempt);
        } else if (okOn) {
            // Out of ideas: press OK.  Pressing it again is never wrong -- it
            // confirms or passes priority, and both advance the game.  Note it
            // is OK and not "the plan's last move": Cancel on InputAttack only
            // redraws the same prompt, which is how the first version of this
            // class produced 13,898 input frames in one combat step.
            move = new String[] {"buttonOk"};
        } else if (cancelOn) {
            // OK is disabled and nothing else helped -- an unpayable mana cost,
            // a cost we cannot meet.  Cancel is the way out, and it is safe here
            // precisely because OK is disabled.
            move = new String[] {"buttonCancel"};
        } else {
            // Nothing left that could help.  Stop acting on this frame and let
            // the watchdog concede rather than hammer the engine.
            return;
        }
        play(move);
    }

    /**
     * A planned move is {@code {action}} or {@code {action, bodyKey, bodyValue}}.
     * The value is a number when it looks like one ({@code clickCard}'s
     * {@code cardId}) and a string otherwise ({@code useMana}'s {@code color},
     * which protocol section 2.2 declares as a colour <em>name</em>).
     */
    private void play(final String[] move) {
        if (move.length == 1) {
            act(move[0], Map.of());
            return;
        }
        final Object value = move[2].matches("-?\\d+")
                ? (Object) Integer.valueOf(move[2]) : move[2];
        act(move[0], Map.of(move[1], value));
    }

    /**
     * The dumb human's preference order.
     *
     * <ol>
     *   <li><b>A demanded click first.</b>  Protocol section 4.2: a disabled OK
     *       with selectable cards means the engine wants a card click, and so
     *       does any selection with {@code min > 0}.  Otherwise the button comes
     *       first, which is how "never more than needed for min" is honoured.</li>
     *   <li><b>Attack with everything</b> when the engine is asking us to declare
     *       attackers.  {@code alphaStrike} is Forge's own act and it is the only
     *       way a policy this simple reaches combat at all -- and combat is where
     *       {@code order} (two attacks-alone triggers) and {@code assign_damage}
     *       (two blockers) live.</li>
     *   <li><b>Try to cast something</b> when we hold priority in a main phase
     *       with an empty stack.  Forge does not put priority-time plays in
     *       {@code selectable} -- during {@code InputPassPriority} any card is
     *       clickable -- so the hand from the last snapshot is the candidate
     *       list.  An unaffordable card answers with a notice and the frame
     *       repeats, which moves us to the next one.</li>
     *   <li>Then OK, then Cancel.</li>
     * </ol>
     */
    /** Everything about an input frame that a decision depends on. */
    private static String key(final Map<String, Object> body) {
        final Map<String, Object> sel = map(body.get("selectable"));
        final Map<String, Object> buttons = map(body.get("buttons"));
        final Map<String, Object> ok = map(buttons == null ? null : buttons.get("ok"));
        final Map<String, Object> cancel = map(buttons == null ? null : buttons.get("cancel"));
        return body.get("prompt") + "|" + ints(sel == null ? null : sel.get("cardIds"))
                + "|" + (ok == null ? null : ok.get("label")) + bool(ok == null ? null : ok.get("enabled"))
                + "|" + (cancel == null ? null : cancel.get("label"))
                + bool(cancel == null ? null : cancel.get("enabled"));
    }

    private static boolean wantsAttackers(final String prompt) {
        final String p = prompt.toLowerCase(java.util.Locale.ROOT);
        return p.contains("to attack") || p.contains("declare attackers");
    }

    private List<String[]> plan(final String prompt, final List<Integer> cardIds, final Integer selMin,
                                final boolean okOn, final boolean cancelOn) {
        final List<String[]> out = new ArrayList<>();
        final boolean mustClick = !cardIds.isEmpty() && (!okOn || (selMin != null && selMin.intValue() > 0));
        if (mustClick) {
            for (final Integer id : cardIds) {
                out.add(new String[] {"clickCard", "cardId", String.valueOf(id)});
            }
        }
        if (!mustClick && myTurn && wantsAttackers(prompt)) {
            // InputAttack does NOT phrase its prompt as "declare attackers": it
            // says "Select creatures to attack Forge AI or select player/card
            // you wish to attack".  Matching the engine's actual words is the
            // difference between a policy that attacks and one that cancels its
            // way round the same prompt forever (measured: 13,898 input frames).
            out.add(new String[] {"alphaStrike"});
        }
        // "Pay Mana Cost" / an "Auto" OK button means InputPayMana is up: the
        // engine wants mana, not another spell.  Clicking a hand card there just
        // makes a notice.
        final boolean payingMana = prompt.contains("Pay Mana Cost") || prompt.contains("Pay ");
        if (probe && payingMana) {
            // THE `useMana` PROBE (protocol section 2.2).  Forge only accepts
            // this act while the current input is an InputPayMana
            // (PlayerControllerHuman.java:2738-2742: `if (inputQueue.getInput()
            // instanceof InputPayMana ipm) ipm.useManaFromPool(mana)`), and
            // nothing else in the repo sends it from a client.  Spending the
            // floating mana first is also the only way the act can be SEEN to
            // work: press the engine's own Auto button and ComputerUtilMana
            // drains the pool for us, which proves nothing about the act.
            for (int i = 0; i < myPool.length; i++) {
                if (myPool[i] > 0) {
                    out.add(new String[] {"useMana", "color", POOL_COLOR_NAMES[i]});
                }
            }
        }
        if (!mustClick && !payingMana && myPriority && myMainPhase && stackEmpty) {
            // Lands first: a land drop is the one play that is always legal, and
            // without it this policy never has mana and never reaches a spell,
            // a combat, or any ask at all.
            for (final Integer id : myLands) {
                out.add(new String[] {"clickCard", "cardId", String.valueOf(id)});
            }
            for (final Integer id : myHand) {
                if (!myLands.contains(id)) {
                    out.add(new String[] {"clickCard", "cardId", String.valueOf(id)});
                }
            }
        }
        if (okOn) {
            out.add(new String[] {"buttonOk"});
        }
        if (!mustClick) {
            for (final Integer id : cardIds) {
                out.add(new String[] {"clickCard", "cardId", String.valueOf(id)});
            }
        }
        if (cancelOn) {
            out.add(new String[] {"buttonCancel"});
        }
        return out;
    }

    /**
     * Remember just enough of the board to answer "is it my turn, and what is in
     * my hand".  Ids and scalars only -- this class never sees a Forge view.
     */
    private void onState(final Map<String, Object> body) {
        final Object priority = body.get("priority");
        final Object active = body.get("activePlayer");
        final String phase = String.valueOf(body.get("phase"));
        // PROGRESS.  A repeated prompt only means "stuck" while nothing else has
        // moved; once the turn, the phase or the active player changes, the
        // counters that drive the alternating answer and the repeat ceiling
        // start again, so a confirm the game asks once per turn is answered with
        // the engine's own default every turn.
        final String progress = progressKey(body);
        if (!progress.equals(lastProgressKey)) {
            lastProgressKey = progress;
            askPromptsSeen.clear();
            askRepeats.clear();
        }
        myPriority = me != null && priority instanceof Number
                && ((Number) priority).intValue() == me.intValue();
        myTurn = me != null && active instanceof Number
                && ((Number) active).intValue() == me.intValue();
        myMainPhase = "MAIN1".equals(phase) || "MAIN2".equals(phase);
        stackEmpty = size(body.get("stack")) == 0;
        myHand.clear();
        myLands.clear();
        java.util.Arrays.fill(myPool, 0);
        for (final Object po : arr(body.get("players"))) {
            final Map<String, Object> p = map(po);
            if (p == null || me == null || !(p.get("id") instanceof Number)
                    || ((Number) p.get("id")).intValue() != me.intValue()) {
                continue;
            }
            // protocol section 3.1: manaPool always carries all six keys.
            final Map<String, Object> pool = map(p.get("manaPool"));
            if (pool != null) {
                for (int i = 0; i < POOL_COLORS.length; i++) {
                    final Integer n = intOf(pool.get(POOL_COLORS[i]));
                    myPool[i] = n == null ? 0 : n.intValue();
                }
            }
            final Map<String, Object> zones = map(p.get("zones"));
            final Map<String, Object> hand = map(zones == null ? null : zones.get("hand"));
            for (final Object co : arr(hand == null ? null : hand.get("cards"))) {
                final Map<String, Object> c = map(co);
                if (c != null && c.get("id") instanceof Number && !Boolean.TRUE.equals(c.get("hidden"))) {
                    final Integer id = Integer.valueOf(((Number) c.get("id")).intValue());
                    myHand.add(id);
                    if (String.valueOf(c.get("types")).contains("Land")) {
                        myLands.add(id);
                    }
                }
            }
        }
    }

    private void act(final String action, final Map<String, Object> extra) {
        final Map<String, Object> body = new LinkedHashMap<>(extra);
        acts.incrementAndGet();
        inbound.onAct(action, body);
    }

    // ---- the ask path -----------------------------------------------------

    /** Answer one ask.  Overridden by {@link NullTransport}, which always answers null. */
    protected void onAsk(final Map<String, Object> body) {
        final String askId = String.valueOf(body.get("askId"));
        final String kind = String.valueOf(body.get("kind"));
        if (probe && "ability_menu".equals(kind)) {
            // THE `clickAbility` PROBE (protocol section 2.2, decision D20/D22).
            // Answering the menu by index is the ordinary path and it is already
            // evidenced; the ACT is not.  So the menu is declined with `null`
            // ("never mind" -- section 5.3: Forge's input is still the one that
            // asked, nothing is spent) and the same choice is then made again as
            // an `act`, which resolves through `abilityIndex` to the identical
            // IGameController.selectAbility call the answer would have made.
            answer(askId, null);
            final Map<String, Object> opt = firstPlayableAbility(body);
            final Integer host = intOf(body.get("cardId"));
            if (opt != null && host != null) {
                // BOTH keys, as protocol section 2.2's row declares them: the
                // bridge resolves `abilityId` alone through `abilityIndex`, and a
                // client that sent only that would be relying on an emitter
                // detail rather than on the documented act.
                act("clickAbility", new LinkedHashMap<>(Map.of(
                        "cardId", host, "abilityId", intOf(opt.get("abilityId")))));
            }
            return;
        }
        if (overAskRepeatCap(askRepeats, kind, body)) {
            // Answer FIRST, then concede: the game thread is parked on this ask,
            // and a concede dispatched while it is parked would sit behind it.
            answer(askId, answerFor(kind, body, probe, askPromptsSeen));
            giveUp(kind, body);
            return;
        }
        answer(askId, answerFor(kind, body, probe, askPromptsSeen));
    }

    /** {@code turn|phase|activePlayer} -- what "the game moved" means here. */
    private static String progressKey(final Map<String, Object> body) {
        return body.get("turn") + "|" + body.get("phase") + "|" + body.get("activePlayer");
    }

    /**
     * Bump {@code repeats} for this question and say whether it has now arrived
     * more than {@link #ASK_REPEAT_CAP} times with no progress in between.
     * Counts every kind; see the field {@link #askRepeats}.
     *
     * <p>Static and package-private so {@code AskSelfTest} can walk the cap
     * without a running game -- the whole point of the ceiling is that it fires
     * on a path no green run reaches.
     */
    static boolean overAskRepeatCap(final Map<String, Integer> repeats, final String kind,
                                    final Map<String, Object> body) {
        final String key = kind + "|" + body.get("prompt") + "|" + body.get("title");
        final int seen = repeats.merge(key, Integer.valueOf(1),
                (a, b) -> Integer.valueOf(a + b)).intValue();
        return seen > ASK_REPEAT_CAP;
    }

    /**
     * The ask ceiling's exit: say so on stderr and concede once.  {@link #conceded}
     * is the same flag the silence watchdog sets, so the two can never concede
     * twice, and the run still ends in an ordinary {@code over}.
     */
    private void giveUp(final String kind, final Map<String, Object> body) {
        if (conceded) {
            return;
        }
        conceded = true;
        System.err.println("AUTO ASK LOOP: more than " + ASK_REPEAT_CAP + " identical " + kind
                + " asks with no progress (" + body.get("prompt") + ") -- conceding");
        try {
            inbound.onAct("concede", new HashMap<>());
        } catch (final RuntimeException e) {
            System.err.println("AUTO concede failed: " + e);
        }
    }

    /**
     * The first {@code ability_menu} option Forge says can actually be played,
     * or the first option at all when it says that of none of them.  An option
     * whose {@code canPlay} is false resolves to a {@code selectAbility} Forge
     * will refuse, which is a legal act with no effect -- fine for the wire, no
     * use as a probe.
     */
    private static Map<String, Object> firstPlayableAbility(final Map<String, Object> body) {
        Map<String, Object> first = null;
        for (final Object o : arr(body.get("options"))) {
            final Map<String, Object> opt = map(o);
            if (opt == null || !(opt.get("abilityId") instanceof Number)) {
                continue;
            }
            if (first == null) {
                first = opt;
            }
            if (Boolean.TRUE.equals(opt.get("canPlay"))) {
                return opt;
            }
        }
        return first;
    }

    /**
     * Deliver one {@code answer} through the ordinary inbound path.
     *
     * <p><b>On the io thread, always</b> -- {@code onAnswer} asserts it is
     * neither the game thread nor the EDT, and it is what writes the
     * {@code answer} line into the log.  A transport that completes the reply
     * pool directly instead produces a log with asks and no answers, which is
     * the on-disk shape of a wedge.
     *
     * @param value the raw JSON text of {@code answer.value}; {@code null} for a
     *              literal null answer
     */
    protected final void answer(final String askId, final String value) {
        answers.incrementAndGet();
        inbound.onAnswer(askId, value);
    }

    /**
     * The minimal legal answer for each of the eleven kinds (protocol section
     * 5.2), or -- with {@code probe} on -- the answer that reaches further into
     * the engine.  See {@link #probe} for why that is a flag and not the default.
     *
     * @param askPromptsSeen per-prompt ask counter; see the field of that name
     */
    protected static String answerFor(final String kind, final Map<String, Object> body,
                                      final boolean probe, final Map<String, Integer> askPromptsSeen) {
        switch (kind) {
        case "ability_menu":
        case "options": {
            final int n = size(body.get("options"));
            if (n == 0) {
                return "null";
            }
            final Integer dflt = intOf(body.get("defaultIndex"));
            return String.valueOf(dflt != null && dflt >= 0 && dflt < n ? dflt.intValue() : 0);
        }
        case "confirm": {
            // **The engine's own default button**, which is also protocol section
            // 5.4's null default (`RemoteClientGuiGame.java:451-454`:
            // `result != null ? result : defaultIsYes`) -- and, unlike a flat
            // "false", it makes progress.
            //
            // Measured, M5: the one IGuiGame confirm a human seat reaches is
            // InputPassPriority's floating-mana prompt, whose "no" means DO NOT
            // pass priority.  Answered false it re-asks immediately, and one
            // probe game produced **969 identical confirm asks** before it was
            // killed -- a legal answer that never advances, which is the exact
            // shape of a dead end this milestone exists to remove.
            //
            // From the third identical prompt the answer ALTERNATES, and
            // alternating is the whole point: a backstop that latches on `!dflt`
            // is a backstop that has merely chosen the other non-advancing
            // answer, and this one did.  Measured, M5 verification: the latching
            // version answered prompts 1-2 `true` and prompts 3..infinity
            // `false`, which on InputPassPriority's floating-mana confirm means
            // "do not pass priority" forever -- 2,278 identical asks in one
            // 300 s gate step, reproduced with and without --probe.
            //
            // `seen` counts only asks since the last turn/phase change (the
            // caller clears the map on progress), so an honest once-a-turn
            // confirm is always answered with the engine's own default.
            final boolean dflt = bool(body.get("defaultYes"));
            final String prompt = "confirm|" + body.get("prompt") + "|" + body.get("title");
            final int seen = askPromptsSeen.merge(prompt, Integer.valueOf(1),
                    (a, b) -> Integer.valueOf(a + b)).intValue();
            return String.valueOf(seen <= 2 || seen % 2 == 0 ? dflt : !dflt);
        }
        case "text": {
            // A NUMERIC text ask is AbstractGuiGame.getInteger's "Other..."
            // branch (AbstractGuiGame.java:851-864), and it re-asks in a
            // `while (true)` until the answer is a number inside its own
            // [min,max] -- bounds the `text` body does not carry.  So "" is not
            // a safe answer there: it is an infinite ask loop that looks exactly
            // like a wedge.  `null` is, and it is section 5.4's own default
            // ("that is 'cancel'", AbstractGuiGame.java:857).
            if (!bool(body.get("numeric"))) {
                return "\"\"";
            }
            if (!probe) {
                return "null";
            }
            // The probe answers the FIRST such prompt with a real string, so the
            // string actually travels the wire, and cancels every repeat -- a
            // repeat means the engine rejected it as out of range.
            final String prompt = "text|" + body.get("prompt");
            final int seen = askPromptsSeen.merge(prompt, Integer.valueOf(1),
                    (a, b) -> Integer.valueOf(a + b)).intValue();
            // M68: the body carries getInteger's bounds; the smallest legal
            // number when it says, "0" otherwise.
            final Integer lo = intOf(body.get("min"));
            return seen == 1 ? "\"" + (lo == null ? 0 : Math.max(0, lo.intValue())) + "\"" : "null";
        }
        case "choose_list": {
            final int n = size(body.get("options"));
            final Integer min = intOf(body.get("min"));
            final int want = min == null || min.intValue() < 0 ? 0 : Math.min(min.intValue(), n);
            if (probe) {
                // THE `text` PROBE.  getInteger(message, min, max, cutoff) offers
                // the numbers min..cutoff and then one STRING option, "Other...",
                // and picking that string is the only route to
                // IGuiGame.showInputDialog for a human seat (the only other two
                // call sites in the 2.0.14 jar are the macro systems).  The
                // shape is unmistakable: number options plus exactly one text
                // option, and our emitter labels an Integer `kind:"number"` and
                // a String `kind:"text"` (protocol section 5.1).
                final int other = lastTextOptionAfterNumbers(body);
                if (other >= 0 && want <= 1) {
                    return "[" + other + "]";
                }
            }
            return indices(0, want);
        }
        case "choose_entities": {
            final int n = size(body.get("options"));
            final Integer min = intOf(body.get("min"));
            int want = min == null || min.intValue() < 0 ? 0 : Math.min(min.intValue(), n);
            if (probe && want == 0 && n > 0) {
                // An optional choose_entities is a library search offered as
                // "you may".  Answering "none" is legal and is what the default
                // policy does -- and it means the search fetches nothing, so the
                // answer marshalling (index -> the option array -> a GameEntity)
                // is never actually executed.  Take the first card instead.
                final Integer max = intOf(body.get("max"));
                want = max == null || max.intValue() >= 1 ? 1 : 0;
            }
            return indices(0, want);
        }
        case "order": {
            // NEVER null (protocol 5.4).  Reproduce the bridge's own default
            // (report 07 section 6.7) so the answer is legal without the bridge
            // having to fall back: k items from `dest ++ source`, in that order.
            final int dest = size(body.get("dest"));
            final int source = size(body.get("source"));
            final int total = dest + source;
            final Integer min = intOf(body.get("min"));
            final Integer max = intOf(body.get("max"));
            int lo = max != null && max.intValue() >= 0 ? total - max.intValue() : 0;
            int hi = min != null && min.intValue() >= 0 ? total - min.intValue() : total;
            lo = Math.max(0, Math.min(lo, total));
            hi = Math.max(lo, Math.min(hi, total));
            final int k = Math.max(lo, Math.min(dest, hi));
            return "{\"ordered\":" + indices(0, k) + ",\"remember\":false}";
        }
        case "manipulate_list":
            return indices(0, size(body.get("cards")));          // unchanged order
        case "sideboard": {
            // The answer is the NEW main deck, as indices into `main ++ side`
            // (protocol 5.1).  The default is the identity -- "no sideboarding"
            // -- which PlayerControllerHuman:276 tolerates and which is what a
            // player who clicks straight through produces.
            final int main = size(body.get("main"));
            final int side = size(body.get("side"));
            if (!probe || side == 0 || main == 0) {
                return indices(0, main);                         // the deck, unchanged
            }
            // THE SIDEBOARD PROBE (M6).  The identity answer is legal but it
            // never exercises the marshalling: Ask.sideboardMain maps indices
            // back onto `main ++ side`, and with the identity every index is
            // already where it was.  Swap the LAST main card for the FIRST
            // sideboard card -- same size, so no deck-size rule can reject it,
            // and the resulting decklist is provably different from the one the
            // game before it played.
            final StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < main - 1; i++) {
                sb.append(i).append(',');
            }
            sb.append(main).append(']');                         // main[main-1] -> side[0]
            return sb.toString();
        }
        case "assign_damage": {
            // Index 0 is the DEFENDER; a blocker follows it whenever there is
            // one, and all the damage goes on the first of those.  Piling it on
            // the defending player while a creature is blocking would be the one
            // answer the rules do not allow.
            final int n = size(body.get("targets"));
            final Integer total = intOf(body.get("total"));
            if (n == 0 || total == null) {
                return "null";
            }
            return "{\"" + (n > 1 ? 1 : 0) + "\":" + total.intValue() + "}";
        }
        case "assign_amount": {
            // M68 (D426): the bridge now refuses what VAssignGenericAmount
            // would not allow -- a share over a target's `max`, a target under
            // its `min` (1 with atLeastOne), a total that is not `total` -- so
            // the answer is the dialog's own start (each target's `min`) and
            // the rest in order up to each `max`.  "All on target 0" was legal
            // only while nothing checked it.
            final Object[] ts = arr(body.get("targets"));
            final Integer total = intOf(body.get("total"));
            if (ts.length == 0 || total == null) {
                return "null";
            }
            final boolean atLeastOne = bool(body.get("atLeastOne"));
            final int[] got = new int[ts.length];
            final int[] cap = new int[ts.length];
            int left = total.intValue();
            for (int i = 0; i < ts.length; i++) {
                final Map<String, Object> t = map(ts[i]);
                final Integer lo = t == null ? null : intOf(t.get("min"));
                final Integer hi = t == null ? null : intOf(t.get("max"));
                cap[i] = hi == null ? total.intValue() : hi.intValue();
                got[i] = Math.min(Math.max(0, left), lo == null ? (atLeastOne ? 1 : 0) : lo.intValue());
                left -= got[i];
            }
            for (int i = 0; i < ts.length && left > 0; i++) {
                final int add = Math.min(left, Math.max(0, cap[i] - got[i]));
                got[i] += add;
                left -= add;
            }
            final StringBuilder sb = new StringBuilder("{");
            for (int i = 0; i < ts.length; i++) {
                sb.append(i == 0 ? "" : ",").append('"').append(i).append("\":").append(got[i]);
            }
            return sb.append('}').toString();
        }
        default:
            return "null";
        }
    }

    /**
     * The index of the one {@code kind:"text"} option in a list that is
     * otherwise all {@code kind:"number"}, or {@code -1}.  That is exactly
     * {@code getInteger}'s "Other..." entry and nothing else in the corpus has
     * the shape.
     */
    private static int lastTextOptionAfterNumbers(final Map<String, Object> body) {
        final Object[] opts = arr(body.get("options"));
        int text = -1;
        int numbers = 0;
        for (int i = 0; i < opts.length; i++) {
            final Map<String, Object> o = map(opts[i]);
            if (o == null) {
                return -1;
            }
            final String k = String.valueOf(o.get("kind"));
            if ("number".equals(k)) {
                numbers++;
            } else if ("text".equals(k) && text < 0) {
                text = i;
            } else {
                return -1;                     // not a getInteger list
            }
        }
        return numbers > 0 ? text : -1;
    }

    private static String indices(final int from, final int to) {
        final StringBuilder sb = new StringBuilder("[");
        for (int i = from; i < to; i++) {
            if (i > from) {
                sb.append(',');
            }
            sb.append(i);
        }
        return sb.append(']').toString();
    }

    // ---- the watchdog -----------------------------------------------------

    private void watch() {
        while (running) {
            try {
                Thread.sleep(Math.min(STEP_CAP_MS, 1000L));
            } catch (final InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
            final long idleMs = (System.nanoTime() - lastFrameNanos) / 1_000_000L;
            if (idleMs > STUCK_MS && !conceded) {
                conceded = true;
                System.err.println("AUTO STUCK: no frame for " + idleMs + "ms -- conceding");
                try {
                    inbound.onAct("concede", new HashMap<>());
                } catch (final RuntimeException e) {
                    System.err.println("AUTO concede failed: " + e);
                }
            }
        }
    }

    // ---- tiny JSON coercions (Jetty gives Long, Object[], Map, Boolean) ----

    @SuppressWarnings("unchecked")
    static Map<String, Object> map(final Object o) {
        return o instanceof Map ? (Map<String, Object>) o : null;
    }

    private static List<Integer> ints(final Object o) {
        final List<Integer> out = new ArrayList<>();
        if (o instanceof Object[]) {
            for (final Object x : (Object[]) o) {
                if (x instanceof Number) {
                    out.add(Integer.valueOf(((Number) x).intValue()));
                }
            }
        }
        return out;
    }

    private static int size(final Object o) {
        return arr(o).length;
    }

    private static Object[] arr(final Object o) {
        return o instanceof Object[] ? (Object[]) o : new Object[0];
    }

    private static Integer intOf(final Object o) {
        return o instanceof Number ? Integer.valueOf(((Number) o).intValue()) : null;
    }

    private static boolean bool(final Object o) {
        return o instanceof Boolean && ((Boolean) o).booleanValue();
    }
}
