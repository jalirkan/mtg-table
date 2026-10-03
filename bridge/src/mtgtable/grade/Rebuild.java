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
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
package mtgtable.grade;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.TreeMap;

import forge.StaticData;
import forge.card.CardRules;
import forge.card.CardStateName;
import forge.deck.CardPool;
import forge.deck.Deck;
import forge.game.Game;
import forge.game.GameRules;
import forge.game.GameState;
import forge.game.GameType;
import forge.game.Match;
import forge.game.card.Card;
import forge.game.card.CounterEnumType;
import forge.game.player.Player;
import forge.game.player.RegisteredPlayer;
import forge.game.zone.ZoneType;
import forge.item.PaperCard;
import forge.model.FModel;
import mtgtable.Bootstrap;
import mtgtable.ai.PolicyLobbyPlayerAi;

/**
 * A decision position rebuilt as a live Forge game from the viewing seat's
 * redacted view (D332), through Forge's own {@link GameState} loader.
 *
 * <p><b>What it may use</b> -- the search AI's rule (D312, {@code Determinizer}):
 * everything public in the log, the viewer's own hand, the viewer's own deck
 * list, and the opponent's deck list (or, when that is not known, a card pool
 * such as the cube).  <b>Never the real hidden cards</b>: the log does not
 * carry them (hard rule 8), and nothing here asks for them.  The opponent's
 * hand and library are filled from (their deck list, or a plausible deck drawn
 * from the pool) minus every card already seen, with the public hand and
 * library sizes; face-down cards whose identity the viewer does not know are
 * filled from the same hidden cards.  Every rollout then redeals hand and
 * library with its own seed ({@code Determinizer}).
 *
 * <p><b>Fidelity.</b> {@code GameState} rebuilds cards, not history:
 * until-end-of-turn effects, "this turn" memories other than land drops, the
 * opponent's unknown face-down exile, emblems and most stack items are lost.
 * Every loss it can see is written to {@link Base#fidelity}, and the rebuilt
 * battlefield's power and toughness are compared with the log's, card by card,
 * so a grade says how close its position was.
 *
 * <p>Card ids: the spec gives each card {@code Id:<wire id>}, so targeting
 * inside the loader speaks wire ids; the live cards are then matched back to
 * wire ids zone by zone ({@link Base#byWire}).
 */
public final class Rebuild {

    /** What the viewer may know beyond the log. */
    public static final class Knowledge {
        /** The viewer's own deck list (name -> copies), or null when unknown. */
        public Map<String, Integer> ownDeck;
        public String ownSource = "unknown";
        /** The opponent's deck list, or null. */
        public Map<String, Integer> oppDeck;
        /** Else a card pool to draw a plausible deck from (a cube's list), or null. */
        public Map<String, Integer> oppPool;
        public String oppSource = "unknown";
        /** The plausible deck's shape in pool mode. */
        public int deckSize = 40;
        public int lands = 17;
    }

    /** Per-decision changes to the spec. */
    public static final class Tweaks {
        /** Attack decisions: the attacks the player was still choosing are not declared yet. */
        public boolean dropAttacking;
        /** Cards to put in their controller's hand instead of where the log has them (a spell being cast). */
        public final Set<Integer> toHand = new HashSet<>();
        /** Wire stack items rebuilt by {@code putonstack} (bottom first), for the viewer. */
        public final List<String> viewerPutOnStack = new ArrayList<>();
        /** The log's stack is accounted for by the caller (target decisions). */
        public boolean stackHandled;
        /** A spell decision with the land drop still open: this land (wire id) is played first. */
        public int playLand = -1;
        /** Cards the log no longer shows anywhere (a spell between hand and stack while its target is chosen): wire id -> name, back in the viewer's hand. */
        public final Map<Integer, String> extraHand = new LinkedHashMap<>();
    }

    /** The rebuilt game. */
    public static final class Base {
        public Game game;
        public Player viewer;
        public Player opp;
        public final Map<Integer, Card> byWire = new HashMap<>();
        public final Map<Card, Integer> wireOf = new IdentityHashMap<>();
        public final List<String> fidelity = new ArrayList<>();
        public final List<String> spec = new ArrayList<>();
    }

    private final Map<?, ?> state;
    private final WireLog log;
    private final WireLog.Moment moment;
    private final Knowledge know;
    private final Object[] players;
    private final int viewerIdx;

    public Rebuild(final WireLog log, final WireLog.Moment moment, final Knowledge know) {
        this.log = log;
        this.moment = moment;
        this.state = moment.state;
        this.know = know;
        this.players = WireLog.arr(state, "players");
        if (players.length != 2) {
            throw new IllegalArgumentException("only two-player games are graded");
        }
        int v = -1;
        for (int i = 0; i < players.length; i++) {
            if (WireLog.num((Map<?, ?>) players[i], "id", -1) == log.seat) {
                v = i;
            }
        }
        if (v < 0) {
            throw new IllegalArgumentException("the viewing seat " + log.seat + " is not in the state");
        }
        this.viewerIdx = v;
    }

    public int viewerIdx() {
        return viewerIdx;
    }

    public Map<?, ?> player(final int idx) {
        return (Map<?, ?>) players[idx];
    }

    public static List<Map<?, ?>> cards(final Map<?, ?> player, final String zone) {
        final List<Map<?, ?>> out = new ArrayList<>();
        final Map<?, ?> z = WireLog.map(WireLog.map(player, "zones"), zone);
        for (final Object o : WireLog.arr(z, "cards")) {
            out.add((Map<?, ?>) o);
        }
        return out;
    }

    public static int count(final Map<?, ?> player, final String zone) {
        return (int) WireLog.num(WireLog.map(WireLog.map(player, "zones"), zone), "count", 0);
    }

    public static boolean hidden(final Map<?, ?> c) {
        return WireLog.bool(c, "hidden") || WireLog.bool(c, "faceDownHidden");
    }

    /** The card's real name as the viewer knows it, or null (hidden, or face down without its face). */
    public static String knownName(final Map<?, ?> c) {
        if (hidden(c)) {
            return null;
        }
        if (WireLog.bool(c, "faceDown")) {
            final Map<?, ?> alt = WireLog.map(c, "alt");
            return alt == null ? null : WireLog.str(alt, "name");
        }
        final String n = WireLog.str(c, "name");
        return n == null || n.isEmpty() ? null : n;
    }

    // ------------------------------------------------------------------
    // Deck lists
    // ------------------------------------------------------------------

    /** A .dck's [Main] (or a plain "N Name" / "Name" list): name -> copies.  No Forge call. */
    public static Map<String, Integer> readList(final File f) throws IOException {
        final Map<String, Integer> out = new LinkedHashMap<>();
        String section = "main";
        for (final String raw : Files.readAllLines(f.toPath(), StandardCharsets.UTF_8)) {
            final String l = raw.trim();
            if (l.isEmpty() || l.startsWith("#") || l.startsWith("//")) {
                continue;
            }
            if (l.startsWith("[")) {
                section = l.substring(1, l.indexOf(']') > 0 ? l.indexOf(']') : l.length()).trim().toLowerCase(Locale.ROOT);
                continue;
            }
            if (!section.equals("main")) {
                continue;
            }
            if (l.contains("=") && !l.matches("^\\d+\\s.*")) {
                continue;   // [metadata] style key=value outside a section header
            }
            final java.util.regex.Matcher m = java.util.regex.Pattern.compile("^(\\d+)\\s*x?\\s+(.+)$").matcher(l);
            int n = 1;
            String name = l;
            if (m.matches()) {
                n = Integer.parseInt(m.group(1));
                name = m.group(2);
            }
            final int bar = name.indexOf('|');
            if (bar >= 0) {
                name = name.substring(0, bar);
            }
            out.merge(name.trim(), n, Integer::sum);
        }
        return out;
    }

    // ------------------------------------------------------------------
    // The build
    // ------------------------------------------------------------------

    private static final String[] BASICS = {"Plains", "Island", "Swamp", "Mountain", "Forest"};

    /** Build the position, its hidden cards drawn with {@code seed}.  Call on a Forge game thread. */
    public Base build(final long seed, final Tweaks tw) {
        final Base b = new Base();
        final Random rnd = new Random(seed);
        final List<String> lines = new ArrayList<>();
        final String phase = WireLog.str(state, "phase");
        if (phase == null) {
            throw new IllegalArgumentException("a pre-game state cannot be graded");
        }
        lines.add("turn=" + Math.max(1, WireLog.num(state, "turn", 1)));
        final int active = idxOf(WireLog.num(state, "activePlayer", -1));
        lines.add("activeplayer=p" + active);
        lines.add("activephase=" + phase);

        // Who has been seen, by owner (tokens are never in a deck).
        final List<List<String>> seen = new ArrayList<>();
        final Set<String> seenAll = new HashSet<>();
        for (int i = 0; i < 2; i++) {
            seen.add(new ArrayList<>());
        }
        final List<Map<?, ?>> all = new ArrayList<>();
        for (int i = 0; i < 2; i++) {
            for (final String z : new String[] {"hand", "battlefield", "graveyard", "exile", "command", "library"}) {
                all.addAll(cards(player(i), z));
            }
        }
        for (final Object o : WireLog.arr(state, "stackCards")) {
            all.add((Map<?, ?>) o);
        }
        final Set<Long> counted = new HashSet<>();
        for (final Map<?, ?> c : all) {
            final String n = knownName(c);
            if (n == null || WireLog.bool(c, "token") || !counted.add(WireLog.num(c, "id", -1))) {
                continue;
            }
            final int owner = idxOf(WireLog.num(c, "owner", WireLog.num(c, "controller", -1)));
            if (owner >= 0) {
                seen.get(owner).add(n);
            }
            seenAll.add(n);
        }

        for (final String n : tw.extraHand.values()) {
            seen.get(viewerIdx).add(n);
            seenAll.add(n);
        }
        // The hidden cards of each side.
        final int opp = 1 - viewerIdx;
        final List<String> ownLibrary = ownHidden(seen.get(viewerIdx), b);
        final List<String> oppHidden = oppHidden(seen.get(opp), seenAll, rnd, b);
        Collections.shuffle(ownLibrary, rnd);
        Collections.shuffle(oppHidden, rnd);

        // Per player: life, counters, mana, zones.
        final Map<Integer, Integer> specIds = new HashMap<>();
        final List<List<Integer>> battleOrder = new ArrayList<>();
        final List<Map<String, List<Integer>>> zoneOrder = new ArrayList<>();
        for (int i = 0; i < 2; i++) {
            final Map<?, ?> p = player(i);
            final String k = "p" + i;
            lines.add(k + "life=" + WireLog.num(p, "life", 20));
            final List<String> ctr = new ArrayList<>();
            if (WireLog.num(p, "poison", 0) > 0) {
                ctr.add("POISON=" + WireLog.num(p, "poison", 0));
            }
            final Map<?, ?> pc = WireLog.map(p, "counters");
            if (pc != null) {
                for (final Map.Entry<?, ?> e : pc.entrySet()) {
                    final String ct = counterName(String.valueOf(e.getKey()));
                    if (ct != null && !ct.equals("POISON") && e.getValue() instanceof Number && ((Number) e.getValue()).intValue() > 0) {
                        ctr.add(ct + "=" + ((Number) e.getValue()).intValue());
                    }
                }
            }
            if (!ctr.isEmpty()) {
                lines.add(k + "counters=" + String.join(",", ctr));
            }
            final Map<?, ?> pool = WireLog.map(p, "manaPool");
            final StringBuilder mana = new StringBuilder();
            if (pool != null) {
                for (final String col : new String[] {"W", "U", "B", "R", "G", "C"}) {
                    for (int n = 0; n < WireLog.num(pool, col, 0); n++) {
                        mana.append(mana.length() == 0 ? "" : " ").append(col);
                    }
                }
            }
            if (mana.length() > 0) {
                lines.add(k + "manapool=" + mana);
            }
            String movedLand = null;
            for (final Map<?, ?> c : cards(p, "hand")) {
                if (WireLog.num(c, "id", -1) == tw.playLand && knownName(c) != null) {
                    movedLand = knownName(c) + "|Id:" + tw.playLand;
                    specIds.put(tw.playLand, tw.playLand);
                }
            }
            lines.add(k + "landsplayed=" + (log.landsPlayedThisTurn(moment, (int) WireLog.num(p, "id", -1))
                    + (movedLand != null ? 1 : 0)));
            final Map<String, List<Integer>> zo = new LinkedHashMap<>();
            zoneOrder.add(zo);
            // hand
            final List<String> hand = new ArrayList<>();
            final List<Integer> handIds = new ArrayList<>();
            int hiddenHand = 0;
            for (final Map<?, ?> c : cards(p, "hand")) {
                final String n = knownName(c);
                if (n == null) {
                    hiddenHand++;
                    continue;
                }
                if (WireLog.num(c, "id", -1) == tw.playLand) {
                    continue;   // played first: on the battlefield below
                }
                hand.add(spec(c, n, false, tw, b, specIds));
                handIds.add((int) WireLog.num(c, "id", -1));
            }
            if (i == viewerIdx && hiddenHand > 0) {
                b.fidelity.add(hiddenHand + " of your own hand cards are hidden in the log (filled from your library)");
            }
            final int handSize = Math.max(count(p, "hand") - (movedLand != null ? 1 : 0), hand.size() + hiddenHand);
            final int toDeal = handSize - hand.size();
            final List<String> source = i == viewerIdx ? ownLibrary : oppHidden;
            // Cards being cast go back to the hand (target decisions).
            for (final Object o : WireLog.arr(state, "stackCards")) {
                final Map<?, ?> c = (Map<?, ?>) o;
                final long id = WireLog.num(c, "id", -1);
                if (tw.toHand.contains((int) id) && idxOf(WireLog.num(c, "controller", -1)) == i) {
                    hand.add(spec(c, knownName(c), false, tw, b, specIds));
                    handIds.add((int) id);
                }
            }
            if (i == viewerIdx) {
                for (final Map.Entry<Integer, String> e : tw.extraHand.entrySet()) {
                    hand.add(e.getValue() + "|Id:" + e.getKey());
                    handIds.add(e.getKey());
                    specIds.put(e.getKey(), e.getKey());
                }
            }
            for (int n = 0; n < toDeal && !source.isEmpty(); n++) {
                hand.add(source.remove(source.size() - 1));
                handIds.add(null);
            }
            zo.put("hand", handIds);
            if (!hand.isEmpty()) {
                lines.add(k + "hand=" + String.join(";", hand));
            }
            // battlefield, graveyard, exile
            final List<Integer> bo = new ArrayList<>();
            battleOrder.add(bo);
            final List<String> bf = new ArrayList<>();
            final List<String> bfTokens = new ArrayList<>();
            final List<Integer> bfTokenIds = new ArrayList<>();
            final List<Integer> bfIds = new ArrayList<>();
            for (final Map<?, ?> c : cards(p, "battlefield")) {
                String n = knownName(c);
                boolean faceDownGuess = false;
                if (n == null) {
                    // A face-down permanent the viewer cannot see: one of the owner's hidden cards.
                    final List<String> from = idxOf(WireLog.num(c, "owner", -1)) == viewerIdx ? ownLibrary : oppHidden;
                    n = takeCreature(from);
                    faceDownGuess = true;
                    if (n == null) {
                        b.fidelity.add("face-down #" + WireLog.num(c, "id", -1) + " dropped (no hidden card left to be it)");
                        continue;
                    }
                    b.fidelity.add("face-down #" + WireLog.num(c, "id", -1) + " is a guess from the hidden cards");
                }
                final String s = spec(c, n, faceDownGuess || WireLog.bool(c, "faceDown"), tw, b, specIds);
                if (s == null) {
                    continue;
                }
                if (s.startsWith("T:")) {
                    bfTokens.add(s);
                    bfTokenIds.add((int) WireLog.num(c, "id", -1));
                } else {
                    bf.add(s);
                    bfIds.add((int) WireLog.num(c, "id", -1));
                }
            }
            if (movedLand != null) {
                bf.add(movedLand);
                bfIds.add(tw.playLand);
            }
            bo.addAll(bfTokenIds);
            bo.addAll(bfIds);
            final List<String> bfAll = new ArrayList<>(bfTokens);
            bfAll.addAll(bf);
            if (!bfAll.isEmpty()) {
                lines.add(k + "battlefield=" + String.join(";", bfAll));
            }
            for (final String z : new String[] {"graveyard", "exile"}) {
                final List<String> zs = new ArrayList<>();
                final List<Integer> ids = new ArrayList<>();
                for (final Map<?, ?> c : cards(p, z)) {
                    final String n = knownName(c);
                    if (n == null) {
                        b.fidelity.add("a hidden card in " + z + " (#" + WireLog.num(c, "id", -1) + ") is left out");
                        continue;
                    }
                    final String s = spec(c, n, WireLog.bool(c, "faceDown"), tw, b, specIds);
                    if (s != null) {
                        zs.add(s);
                        ids.add((int) WireLog.num(c, "id", -1));
                    }
                }
                zo.put(z, ids);
                if (!zs.isEmpty()) {
                    lines.add(k + z + "=" + String.join(";", zs));
                }
            }
            if (!cards(p, "command").isEmpty()) {
                b.fidelity.add(cards(p, "command").size() + " command-zone object(s) of p" + i + " left out");
            }
            // library: the visible ones on top, then the hidden ones
            final List<String> lib = new ArrayList<>();
            final List<Integer> libIds = new ArrayList<>();
            for (final Map<?, ?> c : cards(p, "library")) {
                final String n = knownName(c);
                if (n != null) {
                    lib.add(spec(c, n, false, tw, b, specIds));
                    libIds.add((int) WireLog.num(c, "id", -1));
                }
            }
            final int libCount = count(p, "library");
            while (lib.size() < libCount && !source.isEmpty()) {
                lib.add(source.remove(source.size() - 1));
                libIds.add(null);
            }
            if (lib.size() < libCount) {
                b.fidelity.add("p" + i + "'s library rebuilt with " + lib.size() + " of " + libCount + " cards");
            }
            zo.put("library", libIds);
            if (!lib.isEmpty()) {
                lines.add(k + "library=" + String.join(";", lib));
            }
        }
        if (!oppHidden.isEmpty() && know.oppDeck != null) {
            b.fidelity.add(oppHidden.size() + " card(s) of the opponent's deck list had no place in the log's hidden zones");
        }
        if (!tw.viewerPutOnStack.isEmpty()) {
            lines.add("p" + viewerIdx + "putonstack=" + String.join(";", tw.viewerPutOnStack));
        }
        final boolean wireStack = WireLog.arr(state, "stack").length > 0;
        if (wireStack && !tw.stackHandled) {
            throw new IllegalArgumentException("the stack is not empty: this decision's stack is not rebuilt");
        }
        b.spec.addAll(lines);

        // The game: Forge's Default AI on both seats, no deck (the spec sets every zone).
        final Deck dummy = new Deck("grade");
        final PaperCard swamp = FModel.getMagicDb().getCommonCards().getCard("Swamp");
        final CardPool main = dummy.getMain();
        main.add(swamp, 20);
        final List<RegisteredPlayer> regs = new ArrayList<>();
        for (int i = 0; i < 2; i++) {
            final RegisteredPlayer rp = new RegisteredPlayer(dummy);
            rp.setPlayer(Bootstrap.createAiSeat(i == viewerIdx ? "Viewer" : "Opponent", i, Bootstrap.DEFAULT_AI_PROFILE,
                    null, PolicyLobbyPlayerAi.Outlets.OFF));
            regs.add(rp);
        }
        final GameRules rules = new GameRules(GameType.Constructed);
        rules.setAppliedVariants(EnumSet.of(GameType.Constructed));
        rules.setGamesPerMatch(1);
        final Match match = new Match(rules, regs, "coach-grade");
        final Game game = match.createGame();
        final GameState gs = new GameState();
        gs.parse(lines);
        gs.applyToGame(game);   // on this (game) thread: GameAction.invoke runs it inline
        b.game = game;
        b.viewer = game.getPlayers().get(viewerIdx);
        b.opp = game.getPlayers().get(opp);
        if (!wireStack && tw.viewerPutOnStack.isEmpty() && !game.getStack().isEmpty()) {
            b.fidelity.add(game.getStack().size() + " trigger(s) the loader fired again were removed (the log's stack is empty)");
            game.getStack().clear();
        }
        mapIds(b, battleOrder, zoneOrder, tw);
        compare(b);
        return b;
    }

    private int idxOf(final long playerId) {
        for (int i = 0; i < players.length; i++) {
            if (WireLog.num((Map<?, ?>) players[i], "id", -2) == playerId) {
                return i;
            }
        }
        return -1;
    }

    // ------------------------------------------------------------------
    // Hidden cards
    // ------------------------------------------------------------------

    /** The viewer's library: own deck list minus own public cards and hand. */
    private List<String> ownHidden(final List<String> ownSeen, final Base b) {
        final List<String> out = new ArrayList<>();
        if (know.ownDeck == null) {
            b.fidelity.add("your own deck list is unknown: your library is basic lands");
            out.addAll(basicsFor(colorsOf(ownSeen), 60));
            return out;
        }
        final Map<String, Integer> left = new TreeMap<>(know.ownDeck);
        for (final String n : ownSeen) {
            if (!take(left, n)) {
                b.fidelity.add("your " + n + " is not in your deck list");
            }
        }
        for (final Map.Entry<String, Integer> e : left.entrySet()) {
            for (int i = 0; i < e.getValue(); i++) {
                out.add(e.getKey());
            }
        }
        return out;
    }

    /** The opponent's hand + library (+ unknown face-down cards): deck minus seen, or a plausible deck from the pool. */
    private List<String> oppHidden(final List<String> oppSeen, final Set<String> seenAll, final Random rnd, final Base b) {
        final Map<?, ?> p = player(1 - viewerIdx);
        int need = 0;
        need += count(p, "hand");
        for (final Map<?, ?> c : cards(p, "hand")) {
            need -= knownName(c) != null ? 1 : 0;
        }
        need += count(p, "library");
        for (final Map<?, ?> c : cards(p, "library")) {
            need -= knownName(c) != null ? 1 : 0;
        }
        for (final Map<?, ?> c : cards(p, "battlefield")) {
            need += knownName(c) == null ? 1 : 0;
        }
        final List<String> out = new ArrayList<>();
        if (know.oppDeck != null) {
            final Map<String, Integer> left = new TreeMap<>(know.oppDeck);
            int missing = 0;
            for (final String n : oppSeen) {
                missing += take(left, n) ? 0 : 1;
            }
            if (missing > 0) {
                b.fidelity.add(missing + " public card(s) of the opponent are not in their deck list");
            }
            for (final Map.Entry<String, Integer> e : left.entrySet()) {
                for (int i = 0; i < e.getValue(); i++) {
                    out.add(e.getKey());
                }
            }
            if (out.size() > need) {
                Collections.shuffle(out, rnd);
                b.fidelity.add("the opponent's deck list has " + (out.size() - need)
                        + " more unseen card(s) than the log's hidden zones; a random subset is used each round");
                return new ArrayList<>(out.subList(0, need));
            }
            if (out.size() < need) {
                b.fidelity.add("the opponent's hidden zones hold " + (need - out.size())
                        + " more card(s) than their deck list leaves; padded with basic lands");
                out.addAll(basicsFor(colorsOf(oppSeen), need - out.size()));
            }
            return out;
        }
        if (know.oppPool == null) {
            b.fidelity.add("the opponent's deck and pool are unknown: their hidden cards are basic lands");
            out.addAll(basicsFor(colorsOf(oppSeen), need));
            return out;
        }
        // A plausible deck from the pool: spells of the opponent's seen colours, basics for the rest.
        final Set<Character> colors = colorsOf(oppSeen);
        int publicLands = 0;
        for (final String n : oppSeen) {
            final CardRules r = rules(n);
            publicLands += r != null && r.getType().isLand() ? 1 : 0;
        }
        final int landsLeft = Math.max(0, know.lands - publicLands);
        final int left = Math.max(1, know.deckSize - oppSeen.size());
        final int lands = Math.min(need, (int) Math.round((double) need * landsLeft / left));
        final List<String> spells = new ArrayList<>();
        for (final Map.Entry<String, Integer> e : new TreeMap<>(know.oppPool).entrySet()) {
            if (seenAll.contains(e.getKey())) {
                continue;
            }
            final CardRules r = rules(e.getKey());
            if (r == null || r.getType().isLand() || !within(r, colors)) {
                continue;
            }
            for (int i = 0; i < e.getValue(); i++) {
                spells.add(e.getKey());
            }
        }
        Collections.shuffle(spells, rnd);
        out.addAll(spells.subList(0, Math.min(need - lands, spells.size())));
        out.addAll(basicsFor(colors, need - out.size()));
        return out;
    }

    private static boolean take(final Map<String, Integer> m, final String n) {
        final Integer v = m.get(n);
        if (v == null || v <= 0) {
            return false;
        }
        if (v == 1) {
            m.remove(n);
        } else {
            m.put(n, v - 1);
        }
        return true;
    }

    /** Remove and return a creature from {@code from} (any card if none), or null when empty. */
    private static String takeCreature(final List<String> from) {
        for (int i = from.size() - 1; i >= 0; i--) {
            final CardRules r = rules(from.get(i));
            if (r != null && r.getType().isCreature()) {
                return from.remove(i);
            }
        }
        return from.isEmpty() ? null : from.remove(from.size() - 1);
    }

    static CardRules rules(final String name) {
        final PaperCard pc = StaticData.instance().getCommonCards().getCard(name);
        return pc == null ? null : pc.getRules();
    }

    private static Set<Character> colorsOf(final List<String> names) {
        final Set<Character> out = new HashSet<>();
        for (final String n : names) {
            final CardRules r = rules(n);
            if (r == null) {
                continue;
            }
            final forge.card.ColorSet c = r.getColor();
            if (c.hasWhite()) {
                out.add('W');
            }
            if (c.hasBlue()) {
                out.add('U');
            }
            if (c.hasBlack()) {
                out.add('B');
            }
            if (c.hasRed()) {
                out.add('R');
            }
            if (c.hasGreen()) {
                out.add('G');
            }
        }
        return out;
    }

    private static boolean within(final CardRules r, final Set<Character> colors) {
        if (colors.isEmpty()) {
            return true;
        }
        final forge.card.ColorSet c = r.getColor();
        return (!c.hasWhite() || colors.contains('W')) && (!c.hasBlue() || colors.contains('U'))
                && (!c.hasBlack() || colors.contains('B')) && (!c.hasRed() || colors.contains('R'))
                && (!c.hasGreen() || colors.contains('G'));
    }

    private static List<String> basicsFor(final Set<Character> colors, final int n) {
        final List<String> names = new ArrayList<>();
        final String wubrg = "WUBRG";
        for (int i = 0; i < 5; i++) {
            if (colors.contains(wubrg.charAt(i))) {
                names.add(BASICS[i]);
            }
        }
        if (names.isEmpty()) {
            names.add("Plains");
        }
        final List<String> out = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            out.add(names.get(i % names.size()));
        }
        return out;
    }

    // ------------------------------------------------------------------
    // One card's spec
    // ------------------------------------------------------------------

    private static final Map<String, String> COUNTERS = new HashMap<>();
    private static final Map<String, String> TOKEN_SCRIPTS = new HashMap<>();

    /** A wire counter name (Forge's display name, "+1/+1") as a GameState counter key ("P1P1"). */
    static synchronized String counterName(final String display) {
        if (COUNTERS.isEmpty()) {
            for (final CounterEnumType t : CounterEnumType.values()) {
                COUNTERS.put(t.getName(), t.name());
                COUNTERS.put(t.name(), t.name());
            }
        }
        return COUNTERS.get(display);
    }

    /** A token script whose card has this name, power and toughness, or null. */
    static synchronized String tokenScript(final String name, final String power, final String toughness) {
        final String key = name + "|" + power + "|" + toughness;
        if (TOKEN_SCRIPTS.containsKey(key)) {
            return TOKEN_SCRIPTS.get(key);
        }
        String found = null;
        for (final Map.Entry<String, CardRules> e : new TreeMap<>(StaticData.instance().getAllTokens().getRules()).entrySet()) {
            final CardRules r = e.getValue();
            if (r == null || !name.equalsIgnoreCase(r.getName())) {
                continue;
            }
            final String p = r.getMainPart().getPower();
            final String t = r.getMainPart().getToughness();
            if (power == null || (String.valueOf(power).equals(p) && String.valueOf(toughness).equals(t))) {
                found = e.getKey();
                break;
            }
            if (found == null) {
                found = e.getKey();
            }
        }
        if (found != null) {
            // GameState's "T:" form: the script and an edition that prints it.
            final forge.item.PaperToken pt = StaticData.instance().getAllTokens().getToken(found);
            found = pt == null ? null : found + "|Set:" + pt.getEdition();
        }
        TOKEN_SCRIPTS.put(key, found);
        return found;
    }

    private String spec(final Map<?, ?> c, final String name, final boolean faceDown, final Tweaks tw, final Base b,
                        final Map<Integer, Integer> specIds) {
        final int id = (int) WireLog.num(c, "id", -1);
        final StringBuilder sb = new StringBuilder();
        if (WireLog.bool(c, "token")) {
            if (StaticData.instance().getCommonCards().getCard(name) != null) {
                sb.append(name).append("|IsToken");
            } else {
                final String script = tokenScript(name, WireLog.str(c, "power"), WireLog.str(c, "toughness"));
                if (script == null) {
                    b.fidelity.add("token " + name + " #" + id + " has no Forge token script: left out");
                    return null;
                }
                sb.append("T:").append(script);
            }
        } else {
            if (StaticData.instance().getCommonCards().getCard(name) == null) {
                b.fidelity.add(name + " #" + id + " is not a card this engine knows: left out");
                return null;
            }
            sb.append(name);
        }
        sb.append("|Id:").append(id);
        final String zone = WireLog.str(c, "zone");
        if ("battlefield".equals(zone)) {
            if (WireLog.bool(c, "tapped")) {
                sb.append("|Tapped");
            }
            if (WireLog.bool(c, "sick")) {
                sb.append("|SummonSick");
            }
            if (faceDown) {
                sb.append("|FaceDown");
            }
            final long dmg = WireLog.num(c, "damage", 0);
            if (dmg > 0) {
                sb.append("|Damage:").append(dmg);
            }
            final long att = WireLog.num(c, "attachedToId", -1);
            if (att >= 0) {
                sb.append("|AttachedTo:").append(att);
            }
            final long owner = WireLog.num(c, "owner", -1);
            final long ctl = WireLog.num(c, "controller", -1);
            if (owner >= 0 && ctl >= 0 && owner != ctl) {
                sb.append("|Owner:P").append(idxOf(owner));
            }
            if (WireLog.bool(c, "attacking") && !tw.dropAttacking) {
                sb.append("|Attacking").append(attackTarget(id));
            }
        } else if (faceDown && "exile".equals(zone)) {
            sb.append("|FaceDown");
        }
        final Map<?, ?> ctr = WireLog.map(c, "counters");
        if (ctr != null && !ctr.isEmpty()) {
            final List<String> cs = new ArrayList<>();
            for (final Map.Entry<?, ?> e : ctr.entrySet()) {
                final String ct = counterName(String.valueOf(e.getKey()));
                final int n = e.getValue() instanceof Number ? ((Number) e.getValue()).intValue() : 0;
                if (ct == null) {
                    b.fidelity.add("counter " + e.getKey() + " on #" + id + " unknown: left out");
                } else if (n > 0) {
                    cs.add(ct + "=" + n);
                }
            }
            if (!cs.isEmpty()) {
                sb.append("|Counters:").append(String.join(",", cs));
            }
        }
        specIds.put(id, id);
        return sb.toString();
    }

    /** ":<id>" when this attacker attacks a planeswalker or battle, "" when it attacks a player. */
    private String attackTarget(final int attackerId) {
        final Map<?, ?> combat = WireLog.map(state, "combat");
        for (final Object o : WireLog.arr(combat, "bands")) {
            final Map<?, ?> band = (Map<?, ?>) o;
            for (final Object a : WireLog.arr(band, "attackerIds")) {
                if (((Number) a).intValue() == attackerId) {
                    final Map<?, ?> d = WireLog.map(band, "defender");
                    if (d != null && "card".equals(WireLog.str(d, "kind"))) {
                        return ":" + WireLog.num(d, "id", -1);
                    }
                }
            }
        }
        return "";
    }

    // ------------------------------------------------------------------
    // Back from the live game to wire ids, and how close it came
    // ------------------------------------------------------------------

    static String realName(final Card c) {
        if (c.isFaceDown()) {
            return c.getState(CardStateName.Original).getName();
        }
        return c.getName();
    }

    private void mapIds(final Base b, final List<List<Integer>> battleOrder, final List<Map<String, List<Integer>>> zoneOrder,
                        final Tweaks tw) {
        final Map<Integer, String> wireName = new HashMap<>();
        for (int i = 0; i < 2; i++) {
            for (final String z : new String[] {"hand", "battlefield", "graveyard", "exile", "library"}) {
                for (final Map<?, ?> c : cards(player(i), z)) {
                    final String n = knownName(c);
                    wireName.put((int) WireLog.num(c, "id", -1), n == null ? "" : n);
                }
            }
        }
        for (final Object o : WireLog.arr(state, "stackCards")) {
            final Map<?, ?> c = (Map<?, ?>) o;
            final String n = knownName(c);
            wireName.put((int) WireLog.num(c, "id", -1), n == null ? "" : n);
        }
        wireName.putAll(tw.extraHand);
        for (int i = 0; i < 2; i++) {
            final Player p = b.game.getPlayers().get(i);
            matchZone(b, new ArrayList<>(p.getCardsIn(ZoneType.Battlefield)), battleOrder.get(i), wireName, "battlefield");
            for (final Map.Entry<String, List<Integer>> e : zoneOrder.get(i).entrySet()) {
                final ZoneType zt = e.getKey().equals("hand") ? ZoneType.Hand : e.getKey().equals("graveyard") ? ZoneType.Graveyard
                        : e.getKey().equals("exile") ? ZoneType.Exile : ZoneType.Library;
                final List<Integer> ids = new ArrayList<>(e.getValue());
                if (zt == ZoneType.Hand) {
                    ids.removeIf(tw.toHand::contains);   // put on the stack by the loader: matched there
                }
                matchZone(b, new ArrayList<>(p.getCardsIn(zt)), ids, wireName, e.getKey());
            }
        }
        if (!tw.toHand.isEmpty()) {
            final List<Integer> ids = new ArrayList<>(tw.toHand);
            final List<Card> live = new ArrayList<>(b.game.getCardsIn(ZoneType.Stack));
            for (int i = 0; i < 2; i++) {
                live.addAll(b.game.getPlayers().get(i).getCardsIn(ZoneType.Hand));
            }
            matchZone(b, live, ids, wireName, "stack or hand");
        }
    }

    private static void matchZone(final Base b, final List<Card> live, final List<Integer> ids, final Map<Integer, String> wireName,
                                  final String zone) {
        final Set<Card> used = Collections.newSetFromMap(new IdentityHashMap<>());
        boolean inOrder = live.size() == ids.size();
        for (int k = 0; inOrder && k < ids.size(); k++) {
            final Integer id = ids.get(k);
            if (id != null && wireName.containsKey(id) && !wireName.get(id).isEmpty()
                    && !wireName.get(id).equals(realName(live.get(k))) && !live.get(k).isToken()) {
                inOrder = false;
            }
        }
        for (int k = 0; k < ids.size(); k++) {
            final Integer id = ids.get(k);
            if (id == null) {
                continue;
            }
            Card hit = null;
            if (inOrder) {
                hit = live.get(k);
            } else {
                final String n = wireName.get(id);
                for (final Card c : live) {
                    if (!used.contains(c) && (n == null || n.isEmpty() || n.equals(realName(c)) || c.isToken())) {
                        hit = c;
                        break;
                    }
                }
            }
            if (hit == null) {
                b.fidelity.add("#" + id + " (" + wireName.get(id) + ") not found in the rebuilt " + zone);
                continue;
            }
            used.add(hit);
            b.byWire.put(id, hit);
            b.wireOf.put(hit, id);
        }
    }

    private void compare(final Base b) {
        for (int i = 0; i < 2; i++) {
            final Player p = b.game.getPlayers().get(i);
            final long life = WireLog.num(player(i), "life", 20);
            if (p.getLife() != life) {
                b.fidelity.add("p" + i + " life " + p.getLife() + ", the log says " + life);
            }
            for (final Map<?, ?> c : cards(player(i), "battlefield")) {
                final Card live = b.byWire.get((int) WireLog.num(c, "id", -1));
                if (live == null || WireLog.bool(c, "faceDown")) {
                    continue;
                }
                final String pw = WireLog.str(c, "power");
                final String tg = WireLog.str(c, "toughness");
                if (pw == null || tg == null || !live.isCreature()) {
                    continue;
                }
                try {
                    if (Integer.parseInt(pw) != live.getNetPower() || Integer.parseInt(tg) != live.getNetToughness()) {
                        b.fidelity.add("P/T of " + knownName(c) + " #" + WireLog.num(c, "id", -1) + ": log " + pw + "/" + tg
                                + ", rebuilt " + live.getNetPower() + "/" + live.getNetToughness());
                    }
                } catch (final NumberFormatException e) {
                    // "*" and friends: nothing to compare
                }
            }
        }
    }
}
