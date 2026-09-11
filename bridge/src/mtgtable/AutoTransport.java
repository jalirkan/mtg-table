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
 *       on the first blocker, {@code false} for a confirm, {@code ""} for text.
 *       Never {@code null} for {@code order}, {@code choose_list} or
 *       {@code manipulate_list}, whose call sites dereference the result.</li>
 *   <li><b>A progress watchdog</b> -- {@value #STUCK_MS} ms with no frame at all
 *       and it concedes, so a wedged run fails in seconds rather than hanging a
 *       test suite.</li>
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
     * The policy watchdog's thread name.  A constant for the same reason every
     * other thread name in the bridge is one: {@link HeadlessGuiBase} asserts
     * the whole set at class-init and {@code tools/lint-bridge.sh} section 6 greps
     * for it, because {@code ThreadUtil.isGameThread()} is nothing but
     * {@code getName().startsWith("Game")}.
     */
    static final String WATCHDOG_THREAD_NAME = "mtg-table-auto-watchdog";

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
            running = false;
            return true;
        default:
            return true;
        }
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
        if (move.length == 1) {
            act(move[0], Map.of());
        } else {
            act(move[0], Map.of(move[1], Integer.valueOf(move[2])));
        }
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
        myPriority = me != null && priority instanceof Number
                && ((Number) priority).intValue() == me.intValue();
        myTurn = me != null && active instanceof Number
                && ((Number) active).intValue() == me.intValue();
        myMainPhase = "MAIN1".equals(phase) || "MAIN2".equals(phase);
        stackEmpty = size(body.get("stack")) == 0;
        myHand.clear();
        myLands.clear();
        for (final Object po : arr(body.get("players"))) {
            final Map<String, Object> p = map(po);
            if (p == null || me == null || !(p.get("id") instanceof Number)
                    || ((Number) p.get("id")).intValue() != me.intValue()) {
                continue;
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
        answer(askId, answerFor(kind, body));
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

    /** The minimal legal answer for each of the eleven kinds (protocol section 5.2). */
    protected static String answerFor(final String kind, final Map<String, Object> body) {
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
        case "confirm":
            // "No" unless there is no way to say no.  A mulligan confirm answered
            // false keeps the hand, which is exactly what a dumb human does.
            return "false";
        case "text":
            return "\"\"";
        case "choose_list":
        case "choose_entities": {
            final int n = size(body.get("options"));
            final Integer min = intOf(body.get("min"));
            final int want = min == null || min.intValue() < 0 ? 0 : Math.min(min.intValue(), n);
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
        case "sideboard":
            return indices(0, size(body.get("main")));           // the deck, unchanged
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
            final int n = size(body.get("targets"));
            final Integer total = intOf(body.get("total"));
            if (n == 0 || total == null) {
                return "null";
            }
            return "{\"0\":" + total.intValue() + "}";
        }
        default:
            return "null";
        }
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
