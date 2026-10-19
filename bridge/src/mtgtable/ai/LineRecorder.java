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
package mtgtable.ai;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import forge.game.Game;
import forge.game.GameEntity;
import forge.game.GameObject;
import forge.game.ability.ApiType;
import forge.game.card.Card;
import forge.game.player.Player;
import forge.game.spellability.SpellAbility;

/**
 * The search hint's line (D454): what Forge's AI answered INSIDE one playout
 * of the recommended move, from the forced first answer until the seat hands
 * priority back -- the targets, X, the cards a cost took, the modes, the
 * choices a resolution asked for, the triggers it aimed, and the plays it
 * went on to make in the same window.  {@link SearchPolicy#playout} fills one
 * when {@link SearchPolicy.Limits#line} is set (a {@link RecordingController}
 * then sits on the searching seat); the search's own rollouts never set it.
 *
 * <p>What it holds is engine-free on purpose: a card is its id and whether it
 * is a token, a player is "you" or "the opponent", a mode is its script
 * description -- never a name.  Names are the caller's business, through the
 * seat's own redacted view of the moment ({@code mtgtable.grade.HintLine}:
 * hidden-information rule 8), so nothing here can name a card the seat cannot
 * see.
 */
public final class LineRecorder {

    /** {@link Ent#player}: not a player, the searching seat, the other seat. */
    public static final int NONE = 0;
    public static final int YOU = 1;
    public static final int OPPONENT = 2;

    /** One thing a step names: a card (by its game id) or a player. */
    public static final class Ent {
        public final int cardId;
        public final boolean token;
        public final int player;

        public Ent(final int cardId, final boolean token, final int player) {
            this.cardId = cardId;
            this.token = token;
            this.player = player;
        }

        @Override
        public String toString() {
            return player == YOU ? "you" : player == OPPONENT ? "opponent" : "#" + cardId + (token ? "t" : "");
        }
    }

    /**
     * One answered sub-decision.  {@code kind}: target, x, sacrifice, discard,
     * exile, return, tap, mode, choose, number, trigger, then-cast,
     * then-activate, then-equip, then-play.
     */
    public static final class Raw {
        public final String kind;
        /** The card whose spell or ability it is (null for a resolution's choice). */
        public final Ent source;
        public final List<Ent> what;
        public final int number;
        /** A mode's script description (kind mode only), else null. */
        public final String text;

        public Raw(final String kind, final Ent source, final List<Ent> what, final int number, final String text) {
            this.kind = kind;
            this.source = source;
            this.what = what == null ? Collections.emptyList() : what;
            this.number = number;
            this.text = text;
        }

        @Override
        public String toString() {
            return kind + (source == null ? "" : " " + source) + (what.isEmpty() ? "" : " " + what)
                    + ("x".equals(kind) || "number".equals(kind) ? " " + number : "") + (text == null ? "" : " '" + text + "'");
        }
    }

    /** The paid lists a cost leaves on its spell, and the step each one is. */
    private static final String[][] PAID = {{"Sacrificed", "sacrifice"}, {"Discarded", "discard"}, {"Exiled", "exile"},
        {"Returned", "return"}, {"Tapped", "tap"}};

    private final int max;
    private final int maxThen;
    private final List<Raw> steps = new ArrayList<>();
    private boolean started;
    private boolean done;
    private char kind;
    private int startTurn;
    private int plays;
    private Player seat;
    private String stop = "not-started";

    /** At most {@code max} steps, of which at most {@code maxThen} later plays. */
    public LineRecorder(final int max, final int maxThen) {
        this.max = max;
        this.maxThen = maxThen;
    }

    public List<Raw> steps() {
        return steps;
    }

    public boolean started() {
        return started;
    }

    public boolean done() {
        return done;
    }

    /**
     * Why the recording ended: {@code passed} (the seat handed priority back
     * on an empty stack), {@code applied} (a forced attack or block was played
     * out), {@code turn} (the turn ended), {@code full} (the step cap),
     * {@code not-started} or {@code cut} (the playout stopped first).
     */
    public String stop() {
        return done ? stop : started ? "cut" : "not-started";
    }

    boolean active() {
        return started && !done;
    }

    void start(final char k, final Game g, final Player ai) {
        if (started) {
            return;
        }
        started = true;
        kind = k;
        seat = ai;
        startTurn = g.getPhaseHandler().getTurn();
    }

    private void finish(final String why) {
        if (!done) {
            done = true;
            stop = why;
        }
    }

    private void add(final Raw r) {
        if (!active()) {
            return;
        }
        if (!steps.isEmpty() && steps.get(steps.size() - 1).toString().equals(r.toString())) {
            return;   // one choice reported twice (a cost's list and its own prompt)
        }
        if ("choose".equals(r.kind) && !steps.isEmpty()) {
            final Raw last = steps.get(steps.size() - 1);
            if ("then-equip".equals(last.kind) && last.what.isEmpty()) {
                // Forge's Equip picks its creature as it resolves: that choice is the equip's own
                steps.set(steps.size() - 1, new Raw(last.kind, last.source, r.what, 0, null));
                return;
            }
        }
        if ("choose".equals(r.kind)) {
            for (final Raw t : steps) {
                if ("target".equals(t.kind) && t.what.toString().equals(r.what.toString())) {
                    return;   // an Aura attaching to the creature it targeted: the target step already says it
                }
            }
        }
        steps.add(r);
        if (steps.size() >= max) {
            finish("full");
        }
    }

    Ent ent(final Object o) {
        if (o instanceof Player) {
            return new Ent(-1, false, o == seat ? YOU : OPPONENT);
        }
        if (o instanceof Card) {
            final Card c = (Card) o;
            return new Ent(c.getId(), c.isToken(), NONE);
        }
        if (o instanceof SpellAbility && ((SpellAbility) o).getHostCard() != null) {
            return ent(((SpellAbility) o).getHostCard());   // a spell targeted on the stack: its card
        }
        return null;
    }

    private List<Ent> ents(final Iterable<?> xs, final Card except) {
        final List<Ent> out = new ArrayList<>();
        if (xs == null) {
            return out;
        }
        for (final Object o : xs) {
            if (o == null || o == except) {
                continue;
            }
            final Ent e = ent(o);
            if (e != null) {
                out.add(e);
            }
        }
        return out;
    }

    /** A spell or ability the seat just played ({@code playChosenSpellAbility} returned): its answers. */
    void played(final SpellAbility sa, final Game g) {
        if (!active() || sa == null) {
            return;
        }
        final boolean forced = plays == 0;
        plays++;
        if (!forced && plays - 1 > maxThen) {
            return;
        }
        final Card host = sa.getHostCard();
        final Ent src = host == null ? null : ent(host);
        if (!forced) {
            final String k = sa.isLandAbility() ? "then-play" : sa.isEquip() ? "then-equip" : sa.isSpell() ? "then-cast" : "then-activate";
            add(new Raw(k, src, targets(sa), 0, null));
        }
        if (sa.getApi() == ApiType.Charm) {
            for (SpellAbility s = sa.getSubAbility(); s != null; s = s.getSubAbility()) {
                final String d = s.getDescription();
                if (d != null && !d.isBlank()) {
                    add(new Raw("mode", src, null, 0, d));
                }
            }
        }
        if (forced) {
            for (SpellAbility s = sa; s != null; s = s.getSubAbility()) {
                if (s.usesTargeting() && s.getTargets() != null && !s.getTargets().isEmpty()) {
                    add(new Raw("target", src, ents(s.getTargets(), null), 0, null));
                }
            }
        }
        final Integer x = sa.getXManaCostPaid();
        if (x != null && sa.getPayCosts() != null && sa.getPayCosts().hasXInAnyCostPart()) {
            add(new Raw("x", src, null, x, null));
        }
        for (final String[] p : PAID) {
            final List<Ent> paid = ents(sa.getPaidList(p[0]), host);
            if (!paid.isEmpty()) {
                add(new Raw(p[1], src, paid, 0, null));
            }
        }
    }

    private List<Ent> targets(final SpellAbility sa) {
        final List<Ent> out = new ArrayList<>();
        for (SpellAbility s = sa; s != null; s = s.getSubAbility()) {
            if (s.usesTargeting() && s.getTargets() != null) {
                out.addAll(ents(s.getTargets(), null));
            }
        }
        return out;
    }

    /** Triggered abilities the seat put on the stack ({@code orderAndPlaySimultaneousSa} returned): their targets. */
    void triggers(final List<SpellAbility> sas) {
        if (!active() || sas == null) {
            return;
        }
        for (final SpellAbility sa : sas) {
            final List<Ent> t = targets(sa);
            if (!t.isEmpty()) {
                add(new Raw("trigger", sa.getHostCard() == null ? null : ent(sa.getHostCard()), t, 0, null));
            }
        }
    }

    /** A choice a resolution asked the seat for (only while the stack resolves: never the AI's own look-ahead). */
    void chose(final String k, final Iterable<?> what, final Game g) {
        if (!active() || !g.getStack().isResolving()) {
            return;
        }
        final List<Ent> e = ents(what, null);
        if (!e.isEmpty()) {
            add(new Raw(k, null, e, 0, null));
        }
    }

    void chose(final String k, final GameEntity one, final Game g) {
        if (one != null) {
            chose(k, Collections.singletonList((GameObject) one), g);
        }
    }

    void number(final int n, final Game g) {
        if (active() && g.getStack().isResolving()) {
            add(new Raw("number", null, null, n, null));
        }
    }

    /** The seat answered a priority prompt with nothing: the line ends when its forced answer is played out. */
    void passed(final Game g, final RolloutForcing rc) {
        if (active() && g.getStack().isEmpty() && rc.applied(g)) {
            finish("passed");
        }
    }

    /** After every engine step: the turn is over, or a forced combat answer has been played out. */
    void afterStep(final Game g, final RolloutForcing rc) {
        if (!active()) {
            return;
        }
        if (g.isGameOver() || g.getPhaseHandler().getTurn() != startTurn) {
            finish("turn");
        } else if (kind != 'p' && rc.applied(g)) {
            finish("applied");
        }
    }
}
