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

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * A line protocol good enough to finish a game with, per
 * {@code docs/research/07-wireguigame-spec.md} section 8.
 *
 * <p>Deliberately <b>not</b> JSON: M2 is about the threading model, not the
 * codec, and a human has to be able to read the board and type a number.  The
 * frames are identical to the ones M3's WebSocket will carry -- this class only
 * renders them.
 *
 * <h2>Reading the board</h2>
 *
 * Every card prints as {@code <id> <name>}, so <b>an id is always visible next
 * to the thing you click</b>; a card you may not see prints as {@code <id> ??}.
 * The {@code selectable} line is the authoritative click list, and
 * <b>a disabled {@code [ok]} with a non-empty selectable line means the engine
 * is asking for a card click, not a button press</b> (protocol section 4.2) --
 * the one confusion that makes a client look hung.  A reminder is printed the
 * first three times it happens.
 *
 * <h2>Typing</h2>
 *
 * With no ask outstanding a line is an {@code act}; while an ask is outstanding
 * every line goes to the ask (the game thread is parked inside it and an act
 * would be meaningless) except {@code concede} and {@code ?}.  {@code ?} prints
 * the whole table.
 */
public final class ConsoleTransport implements Transport {

    /**
     * Exit code for "the player quit and the game never reported {@code over}".
     * Distinct from {@code MtgTable}'s own failure exit of 1, so a shell can tell
     * "the bridge threw" from "the session ended with no terminal frame".
     */
    static final int QUIT_NO_OVER_EXIT = 2;

    /**
     * The quit watcher's thread name.  A constant so {@link HeadlessGuiBase}'s
     * class-init assert and {@code tools/lint-bridge.sh} section 6 can both see it:
     * {@code ThreadUtil.isGameThread()} is nothing but
     * {@code getName().startsWith("Game")}, so a thread of ours that drifted
     * into that prefix would be allowed to walk the view graph.
     */
    static final String QUIT_THREAD_NAME = "mtg-table-quit";

    private final Object outLock = new Object();

    private Inbound inbound;
    private ReplyPool pool;
    private Thread reader;
    private volatile boolean running = true;
    private volatile boolean sawOver;
    /** Set by the first frame that means the game exists.  See {@link #readLoop}. */
    private final java.util.concurrent.CountDownLatch boardReady =
            new java.util.concurrent.CountDownLatch(1);

    /** The outstanding ask, or null.  Set before the pool is awaited, cleared after. */
    private volatile Pending current;

    /** The last state / input bodies, for the {@code s} and {@code i} commands. */
    private volatile Map<String, Object> lastState;
    private volatile Map<String, Object> lastInput;
    private int clickHintsLeft = 3;

    /**
     * One outstanding question.  Named {@code Pending} and not {@code Ask}
     * because {@link mtgtable.Ask} is the ask path's answer marshalling, and a
     * nested class of the same name would silently shadow it in this file.
     */
    private static final class Pending {
        private final String askId;
        private final String kind;
        private final int options;

        Pending(final String askId, final String kind, final int options) {
            this.askId = askId;
            this.kind = kind;
            this.options = options;
        }
    }

    @Override
    public void start(final Inbound in, final ReplyPool replyPool) {
        this.inbound = in;
        this.pool = replyPool;
        // R3: never a name starting with "Game".
        reader = new Thread(this::readLoop, Transport.IO_THREAD_NAME);
        reader.setDaemon(true);
        reader.start();
        print("mtg-table console.  Type ? for help.");
    }

    @Override
    public void push(final String frameJson) {
        final Object parsed;
        try {
            parsed = Json.parse(frameJson);
        } catch (final RuntimeException e) {
            print("-- unparseable frame: " + e);
            return;
        }
        if (!(parsed instanceof Map)) {
            return;
        }
        @SuppressWarnings("unchecked")
        final Map<String, Object> f = (Map<String, Object>) parsed;
        final Map<String, Object> body = map(f.get("body"));
        final String type = String.valueOf(f.get("type"));
        if (body == null) {
            return;
        }
        switch (type) {
        case "hello_ok":
            print("-- hello_ok -- game " + body.get("gameId") + ", you are player " + body.get("you")
                    + ", seed " + body.get("seed"));
            break;
        case "state":
            lastState = body;
            printState(body);
            break;
        case "input":
            lastInput = body;
            printInput(body);
            // THE gate for reading stdin.  Not hello_ok: that is pushed from
            // openView, which runs BEFORE Match.startGame has dealt a card.  A
            // concede delivered in that window removes a player while
            // Match.prepareAllZones is iterating them, and Forge dies with an
            // IndexOutOfBounds inside its own setup (measured).  The first
            // `input` is the engine saying "I am waiting for you", which is
            // exactly when a click becomes meaningful.
            boardReady.countDown();
            break;
        case "ask":
            printAsk(body);
            break;
        case "notice":
            print("-- notice(" + body.get("level") + ") " + body.get("title") + ": " + body.get("text"));
            break;
        case "over":
            sawOver = true;
            boardReady.countDown();            // so EOF after the game still unblocks
            print("-- over  winner=" + body.get("winner") + "  reason=" + body.get("reason")
                    + "  matchOver=" + body.get("matchOver"));
            break;
        default:
            break;
        }
    }

    @Override
    public String ask(final String askId, final String askFrameJson, final long timeoutMs) {
        Transport.assertGameThread("Transport.ask");
        final Object parsed = Json.parse(askFrameJson);
        final Map<String, Object> body = parsed instanceof Map ? map(((Map<?, ?>) parsed).get("body")) : null;
        current = new Pending(askId, body == null ? "?" : String.valueOf(body.get("kind")),
                          body == null ? 0 : optionCount(body));
        try {
            push(askFrameJson);
            return pool.await(askId, timeoutMs);
        } finally {
            current = null;
        }
    }

    /**
     * {@code 0} -- infinite.  A human at a terminal is allowed to think, and
     * there is no disconnect to recover from: the only way out is a typed
     * answer, {@code concede}, or EOF.
     */
    @Override
    public long askTimeoutMs(final String kind) {
        return 0L;
    }

    @Override
    public void close() {
        running = false;
        if (pool != null) {
            pool.cancelAll();
        }
    }

    // ==================================================================
    // Output
    // ==================================================================

    private void print(final String s) {
        synchronized (outLock) {
            System.out.println(s);
            System.out.flush();
        }
    }

    /** The board, as {@code <id> <name>} lines (report 07 section 8.1). */
    private void printState(final Map<String, Object> b) {
        final StringBuilder sb = new StringBuilder(512);
        sb.append("\n== state == turn ").append(b.get("turn")).append(" (round ").append(b.get("round"))
          .append(")  ").append(b.get("phase"))
          .append("  active:").append(b.get("activePlayer"))
          .append("  priority:").append(b.get("priority"));
        final Object[] players = arr(b.get("players"));
        for (final Object po : players) {
            final Map<String, Object> p = map(po);
            if (p == null) {
                continue;
            }
            final Map<String, Object> zones = map(p.get("zones"));
            sb.append("\n  p").append(p.get("id")).append(' ').append(p.get("name"))
              .append("  life ").append(p.get("life"))
              .append("   hand ").append(count(zones, "hand"))
              .append("  lib ").append(count(zones, "library"))
              .append("  gy ").append(count(zones, "graveyard"))
              .append("  exile ").append(count(zones, "exile"))
              .append("   mana ").append(manaPool(map(p.get("manaPool"))));
            zoneLines(sb, zones, "hand", "   hand");
            zoneLines(sb, zones, "battlefield", "     bf");
            zoneLines(sb, zones, "graveyard", "     gy");
            zoneLines(sb, zones, "exile", "  exile");
            zoneLines(sb, zones, "library", "    lib");
        }
        final Object[] stack = arr(b.get("stack"));
        if (stack.length > 0) {
            sb.append("\n  stack (top last):");
            for (final Object so : stack) {
                final Map<String, Object> si = map(so);
                if (si == null) {
                    continue;
                }
                final String text = String.valueOf(si.get("text"));
                sb.append("\n    ").append(si.get("id")).append(" <- ").append(si.get("sourceCardId"))
                  .append("  ").append(text.isEmpty() ? "(hidden)" : text);
            }
        }
        final Map<String, Object> combat = map(b.get("combat"));
        if (combat != null) {
            for (final Object bo : arr(combat.get("bands"))) {
                final Map<String, Object> band = map(bo);
                if (band == null) {
                    continue;
                }
                final Map<String, Object> def = map(band.get("defender"));
                sb.append("\n  combat: ").append(list(band.get("attackerIds")))
                  .append(" -> ").append(def == null ? "?" : def.get("kind") + " " + def.get("id"))
                  .append(", blocked by ").append(list(band.get("blockerIds")));
            }
        }
        final Map<String, Object> over = map(b.get("gameOver"));
        if (over != null) {
            sb.append("\n  GAME OVER winner=").append(over.get("winner"))
              .append(" reason=").append(over.get("reason"));
        }
        print(sb.toString());
    }

    private static void zoneLines(final StringBuilder sb, final Map<String, Object> zones,
                                  final String zone, final String label) {
        if (zones == null) {
            return;
        }
        final Map<String, Object> z = map(zones.get(zone));
        if (z == null) {
            return;
        }
        for (final Object co : arr(z.get("cards"))) {
            final Map<String, Object> c = map(co);
            if (c == null) {
                continue;
            }
            sb.append('\n').append(label).append(' ').append(cardLine(c));
        }
    }

    /** {@code <id> <name>}, and {@code <id> ??} for anything concealed. */
    private static String cardLine(final Map<String, Object> c) {
        final StringBuilder sb = new StringBuilder(48);
        sb.append(c.get("id")).append(' ');
        if (Boolean.TRUE.equals(c.get("hidden"))) {
            return sb.append("??").toString();
        }
        final Object name = c.get("name");
        final String n = name == null || String.valueOf(name).isEmpty() ? "??" : String.valueOf(name);
        sb.append(n);
        if (c.get("power") != null) {
            sb.append(' ').append(c.get("power")).append('/').append(c.get("toughness"));
        }
        if (Boolean.TRUE.equals(c.get("tapped"))) {
            sb.append(" [T]");
        }
        if (Boolean.TRUE.equals(c.get("attacking"))) {
            sb.append(" [atk]");
        }
        if (Boolean.TRUE.equals(c.get("blocking"))) {
            sb.append(" [blk]");
        }
        if (Boolean.TRUE.equals(c.get("faceDown"))) {
            sb.append(" [face-down]");
        }
        return sb.toString();
    }

    /** Prompt, both button labels verbatim with their flags, and the click list. */
    private void printInput(final Map<String, Object> b) {
        final Map<String, Object> buttons = map(b.get("buttons"));
        final Map<String, Object> ok = map(buttons == null ? null : buttons.get("ok"));
        final Map<String, Object> cancel = map(buttons == null ? null : buttons.get("cancel"));
        final Map<String, Object> sel = map(b.get("selectable"));
        final List<Integer> ids = intList(sel == null ? null : sel.get("cardIds"));
        final boolean okOn = ok != null && Boolean.TRUE.equals(ok.get("enabled"));

        final StringBuilder sb = new StringBuilder(256);
        sb.append("\n== input == ").append(quote(String.valueOf(b.get("prompt"))));
        sb.append("\n  focus: ").append(b.get("focusCardId") == null ? "-" : b.get("focusCardId"));
        sb.append("\n  [ok]     ").append(ok == null ? "" : ok.get("label"))
          .append("   (").append(okOn ? "enabled" : "disabled").append(')');
        sb.append("\n  [cancel] ").append(cancel == null ? "" : cancel.get("label"))
          .append("   (").append(cancel != null && Boolean.TRUE.equals(cancel.get("enabled"))
                  ? "enabled" : "disabled").append(')');
        sb.append("\n  selectable ").append(sel == null ? 0 : sel.get("min")).append("..")
          .append(sel == null ? 0 : sel.get("max")).append(" of: ")
          .append(ids.isEmpty() ? "-" : ids.toString());
        if (!ids.isEmpty() && !okOn && clickHintsLeft > 0) {
            clickHintsLeft--;
            sb.append("\n  (OK is disabled and cards are selectable: the engine wants a CARD CLICK. "
                    + "Type one of those ids.)");
        }
        print(sb.toString());
    }

    /** An ask as a numbered menu, plus the line that says how to answer it. */
    private void printAsk(final Map<String, Object> b) {
        final String kind = String.valueOf(b.get("kind"));
        final StringBuilder sb = new StringBuilder(256);
        sb.append("\n== ask ").append(b.get("askId")).append("  ").append(kind).append("  ")
          .append(quote(String.valueOf(b.getOrDefault("prompt", b.getOrDefault("title", "")))));
        switch (kind) {
        case "confirm":
            sb.append("\n  y = ").append(b.get("yesLabel")).append("   n = ").append(b.get("noLabel"))
              .append("   . = default (").append(b.get("defaultYes")).append(')');
            break;
        case "text":
            sb.append("\n  type the text, or . to cancel   (initial: ").append(b.get("initial")).append(')');
            break;
        case "order":
            menu(sb, b.get("dest"), 0);
            menu(sb, b.get("source"), size(b.get("dest")));
            sb.append("\n  answer: <index>,<index>,...  = the new destination order "
                    + "(append ' *' to remember), or . for the default");
            break;
        case "sideboard":
            menu(sb, b.get("main"), 0);
            menu(sb, b.get("side"), size(b.get("main")));
            sb.append("\n  answer: the indices that make up the new main deck, or . for unchanged");
            break;
        case "manipulate_list":
            menu(sb, b.get("cards"), 0);
            sb.append("\n  answer: every index, in the new order, or . for unchanged");
            break;
        case "assign_damage":
        case "assign_amount":
            menu(sb, b.get("targets"), 0);
            sb.append("\n  total ").append(b.get("total"))
              .append("   answer: <index>=<amount>,<index>=<amount>  (index 0 is the defender), or . for null");
            break;
        default:
            menu(sb, b.get("options"), 0);
            sb.append("\n  answer: ");
            if ("choose_list".equals(kind) || "choose_entities".equals(kind)) {
                sb.append("<index>[,<index>...]  (min ").append(b.get("min")).append(", max ")
                  .append(b.get("max")).append("), empty line = none, . = default");
            } else {
                sb.append("<index>, or . for none");
            }
            break;
        }
        final Map<String, Object> reveal = map(b.get("delayedReveal"));
        if (reveal != null) {
            sb.append("\n  revealed (").append(reveal.get("messagePrefix")).append("): ");
            for (final Object co : arr(reveal.get("cards"))) {
                final Map<String, Object> c = map(co);
                if (c != null) {
                    sb.append("\n    ").append(cardLine(c));
                }
            }
        }
        print(sb.toString());
    }

    private static void menu(final StringBuilder sb, final Object options, final int base) {
        final Object[] a = arr(options);
        for (int i = 0; i < a.length; i++) {
            final Map<String, Object> opt = map(a[i]);
            if (opt == null) {
                continue;
            }
            sb.append("\n   ").append(opt.getOrDefault("id", Integer.valueOf(base + i))).append(") ")
              .append(opt.get("label"));
            if (opt.get("cardId") != null) {
                sb.append("   [card ").append(opt.get("cardId")).append(']');
            }
            if (opt.get("lethal") != null) {
                sb.append("   [lethal ").append(opt.get("lethal")).append(']');
            }
        }
    }

    // ==================================================================
    // Input
    // ==================================================================

    private void readLoop() {
        try (BufferedReader in = new BufferedReader(
                new InputStreamReader(System.in, StandardCharsets.UTF_8))) {
            // Wait for the game to exist before reading a single line.  A pipe
            // ("printf '\n\n\nq\n' | ...") delivers every line the instant the
            // reader starts -- long before HostedMatch has built a board -- and
            // those acts would be dropped, the concede would concede nothing,
            // and the run would look like a hang.  A human cannot click before
            // the board is drawn either.
            boardReady.await();
            String line;
            while (running && (line = in.readLine()) != null) {
                try {
                    handle(line.trim());
                } catch (final RuntimeException e) {
                    print("-- input failed: " + e);
                }
            }
        } catch (final java.io.IOException e) {
            print("-- stdin failed: " + e);
        } catch (final InterruptedException e) {
            Thread.currentThread().interrupt();
            return;
        }
        if (running) {
            // EOF: concede gracefully rather than leaving the game thread parked
            // on an ask nobody will ever answer.
            print("-- stdin closed; conceding");
            quit();
        }
    }

    private void handle(final String line) {
        if ("?".equals(line)) {
            help();
            return;
        }
        if ("concede".equals(line) || "q".equals(line)) {
            print("-- conceding");
            quit();
            return;
        }
        final Pending ask = current;
        if (ask != null) {
            answer(ask, line);
            return;
        }
        act(line);
    }

    /** No ask outstanding: the line is an act (report 07 section 8.2). */
    private void act(final String line) {
        if (line.isEmpty()) {
            // Enter presses the FOCUSED button when the engine named one
            // (M6, protocol amendment M39: `buttons.focus`), and otherwise OK
            // when OK is enabled and Cancel when it is not.  That is what a
            // desktop player's space bar does -- Swing activates the focused
            // button, which is why "space = OK" is not a Forge shortcut and
            // never was.
            final Map<String, Object> buttons = map(lastInput == null ? null : lastInput.get("buttons"));
            final Object focus = buttons == null ? null : buttons.get("focus");
            if ("ok".equals(focus)) {
                send("buttonOk", Map.of());
                return;
            }
            if ("cancel".equals(focus)) {
                send("buttonCancel", Map.of());
                return;
            }
            final Map<String, Object> ok = map(buttons == null ? null : buttons.get("ok"));
            send(ok != null && Boolean.TRUE.equals(ok.get("enabled")) ? "buttonOk" : "buttonCancel",
                 Map.of());
            return;
        }
        final String[] w = line.split("\\s+");
        switch (w[0]) {
        case "ok":
            send("buttonOk", Map.of());
            break;
        case "no":
        case "x":
        case "cancel":
            send("buttonCancel", Map.of());
            break;
        case "u":
        case "undo":
            send("undo", Map.of());
            break;
        case "!":
            send("alphaStrike", Map.of());
            break;
        case "pass":
            send("passPriority", Map.of());
            break;
        case "next":
        case "new": {
            // M6.  A session outlives `over` now, and this is the console's way
            // of saying so: `next` continues the match, `new` restarts it.  The
            // engine decides which is legal -- a `continue` after `matchOver`
            // comes back as a notice -- so the seat does not guess.
            final String mode = "new".equals(w[0]) ? "restart" : "continue";
            final Map<String, Object> body = new LinkedHashMap<>();
            body.put("mode", mode);
            send("newGame", body);
            break;
        }
        case "s":
            if (lastState != null) {
                printState(lastState);
            }
            break;
        case "i":
            if (lastInput != null) {
                printInput(lastInput);
            }
            break;
        case "p":
            send("clickPlayer", Map.of("playerId", Integer.valueOf(w[1])));
            break;
        case "a":
            send("clickAbility", Map.of("cardId", Integer.valueOf(w[1]),
                                        "abilityId", Integer.valueOf(w[2])));
            break;
        case "m":
            send("useMana", Map.of("color", colorName(w[1])));
            break;
        case "c":
            send("clickCard", Map.of("cardId", Integer.valueOf(w[1])));
            break;
        default:
            if (w[0].matches("-?\\d+")) {
                send("clickCard", Map.of("cardId", Integer.valueOf(w[0])));
            } else {
                print("-- unknown command " + quote(line) + "; type ? for help");
            }
            break;
        }
    }

    private void send(final String action, final Map<String, Object> body) {
        inbound.onAct(action, new LinkedHashMap<>(body));
    }

    /** An ask is outstanding: every line answers it (report 07 section 8.2). */
    private void answer(final Pending ask, final String line) {
        final String value = encode(ask, line);
        if (value == null) {
            print("-- that is not a legal answer for " + ask.kind + " (" + ask.options
                    + " option(s)); type ? for help");
            return;
        }
        inbound.onAnswer(ask.askId, value);
    }

    /** Typed line -> the raw JSON of one {@code answer.value}, or null if unparseable. */
    private String encode(final Pending ask, final String line) {
        final String s = line.trim();
        if (".".equals(s)) {
            // `.` is always legal: a null answer means the bridge substitutes
            // Forge's own documented default for that method (protocol 5.4),
            // including for the three kinds whose result is dereferenced.
            return "null";
        }
        switch (ask.kind) {
        case "confirm":
            if (s.equalsIgnoreCase("y") || s.equalsIgnoreCase("yes")) {
                return "true";
            }
            if (s.equalsIgnoreCase("n") || s.equalsIgnoreCase("no")) {
                return "false";
            }
            return null;
        case "text":
            return jsonString(s);
        case "ability_menu":
        case "options": {
            if (!s.matches("\\d+")) {
                return null;
            }
            return s;
        }
        case "choose_list":
        case "choose_entities":
        case "sideboard":
        case "manipulate_list": {
            if (s.isEmpty()) {
                return "[]";
            }
            final List<Integer> ix = parseIndices(s);
            return ix == null ? null : ix.toString();
        }
        case "order": {
            final boolean remember = s.endsWith("*");
            final String body = remember ? s.substring(0, s.length() - 1).trim() : s;
            final List<Integer> ix = body.isEmpty() ? new ArrayList<>() : parseIndices(body);
            if (ix == null) {
                return null;
            }
            return "{\"ordered\":" + ix + ",\"remember\":" + remember + "}";
        }
        case "assign_damage":
        case "assign_amount": {
            final StringBuilder sb = new StringBuilder("{");
            for (final String pair : s.split(",")) {
                final String[] kv = pair.split("=");
                if (kv.length != 2 || !kv[0].trim().matches("\\d+") || !kv[1].trim().matches("-?\\d+")) {
                    return null;
                }
                if (sb.length() > 1) {
                    sb.append(',');
                }
                sb.append('"').append(kv[0].trim()).append("\":").append(kv[1].trim());
            }
            return sb.append('}').toString();
        }
        default:
            return "null";
        }
    }

    private static List<Integer> parseIndices(final String s) {
        final List<Integer> out = new ArrayList<>();
        for (final String part : s.split("[,\\s]+")) {
            if (part.isEmpty()) {
                continue;
            }
            if (!part.matches("\\d+")) {
                return null;
            }
            out.add(Integer.valueOf(part));
        }
        return out;
    }

    /** Concede, then let go of every parked ask, then leave. */
    private void quit() {
        running = false;
        try {
            inbound.onAct("concede", new LinkedHashMap<>());
        } catch (final RuntimeException e) {
            print("-- concede failed: " + e);
        }
        // A named method, not an inline lambda, so the thread's name is on the
        // `new Thread(` line where tools/lint-bridge.sh section 6 can read it.
        final Thread t = new Thread(this::quitWatch, QUIT_THREAD_NAME);
        t.setDaemon(true);
        t.start();
    }

    /** {@value #QUIT_THREAD_NAME}: wait for {@code over}, then decide the exit code. */
    private void quitWatch() {
        try {
            // Give the concede time to reach the engine and produce `over`.
            for (int i = 0; i < 100 && !sawOver; i++) {
                Thread.sleep(100L);
            }
        } catch (final InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        inbound.onDisconnect();                // unblock anything still parked
        try {
            for (int i = 0; i < 100 && !sawOver; i++) {
                Thread.sleep(100L);
            }
        } catch (final InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        if (!sawOver) {
            // NON-ZERO, deliberately.  This used to halt(0): a session that
            // ended with no `over` frame -- a frames.jsonl the client can
            // never see terminate, and no summary from MtgTable -- looked
            // exactly like a clean quit to every caller, including a shell
            // script and CI.  Measured at 2 runs in 4 before `over` moved to
            // the outcome capture (WireGuiGame.emitOver); if it ever happens
            // again, the exit code is the finding.
            print("-- the game never reported `over` after a concede; exiting " + QUIT_NO_OVER_EXIT
                + " (protocol section 7: a session ends with exactly one `over`)");
            System.out.flush();
            System.err.flush();
            Runtime.getRuntime().halt(QUIT_NO_OVER_EXIT);
        }
    }

    private void help() {
        print("\n-- help --------------------------------------------------------\n"
            + "  With no question outstanding, a line is an action:\n"
            + "    <id> | c <id>   click that card (the `selectable` line lists the legal ids)\n"
            + "    p <id>          click that player\n"
            + "    a <card> <ab>   activate an ability by id\n"
            + "    ok              press the OK button    (its label is the engine's)\n"
            + "    no | x | cancel press the Cancel button\n"
            + "    <empty line>    OK when OK is enabled, Cancel otherwise\n"
            + "    m W|U|B|R|G|C   spend one floating mana\n"
            + "    u | undo        undo the last mana ability\n"
            + "    pass            pass priority\n"
            + "    !               alpha strike (attack with everything)\n"
            + "    next | new      after `over`: the next game of the match / a new match\n"
            + "    s | i           reprint the last state / input\n"
            + "    q | concede     concede and exit        ?   this help\n"
            + "  While a question is outstanding every line answers it; the ask\n"
            + "  itself prints the accepted spellings.  `.` answers null, which is\n"
            + "  always legal: the bridge substitutes Forge's documented default.\n"
            + "----------------------------------------------------------------");
    }

    // ==================================================================
    // Small helpers
    // ==================================================================

    private static String colorName(final String s) {
        switch (s.toUpperCase(Locale.ROOT)) {
        case "W": return "white";
        case "U": return "blue";
        case "B": return "black";
        case "R": return "red";
        case "G": return "green";
        case "C": return "colorless";
        default:  return s.toLowerCase(Locale.ROOT);
        }
    }

    private static String manaPool(final Map<String, Object> pool) {
        if (pool == null) {
            return "-";
        }
        final StringBuilder sb = new StringBuilder();
        for (final String k : new String[] {"W", "U", "B", "R", "G", "C"}) {
            final Object v = pool.get(k);
            if (v instanceof Number && ((Number) v).intValue() > 0) {
                sb.append(k).append(((Number) v).intValue()).append(' ');
            }
        }
        return sb.length() == 0 ? "-" : sb.toString().trim();
    }

    private static Object count(final Map<String, Object> zones, final String zone) {
        final Map<String, Object> z = map(zones == null ? null : zones.get(zone));
        return z == null ? "?" : z.get("count");
    }

    private static int optionCount(final Map<String, Object> body) {
        final String kind = String.valueOf(body.get("kind"));
        switch (kind) {
        case "assign_damage":
        case "assign_amount":  return size(body.get("targets"));
        case "manipulate_list": return size(body.get("cards"));
        case "order":          return size(body.get("dest")) + size(body.get("source"));
        case "sideboard":      return size(body.get("main")) + size(body.get("side"));
        default:               return size(body.get("options"));
        }
    }

    private static String quote(final String s) {
        return "\"" + s.replace("\n", "\\n") + "\"";
    }

    private static String jsonString(final String s) {
        final StringBuilder sb = new StringBuilder();
        Json.quote(sb, s);
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(final Object o) {
        return o instanceof Map ? (Map<String, Object>) o : null;
    }

    private static Object[] arr(final Object o) {
        return o instanceof Object[] ? (Object[]) o : new Object[0];
    }

    private static int size(final Object o) {
        return arr(o).length;
    }

    private static List<Integer> intList(final Object o) {
        final List<Integer> out = new ArrayList<>();
        for (final Object x : arr(o)) {
            if (x instanceof Number) {
                out.add(Integer.valueOf(((Number) x).intValue()));
            }
        }
        return out;
    }

    private static String list(final Object o) {
        final List<Integer> l = intList(o);
        return l.isEmpty() ? "-" : l.toString();
    }
}
