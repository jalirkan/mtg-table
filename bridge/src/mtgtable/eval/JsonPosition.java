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
package mtgtable.eval;

import java.util.Collections;
import java.util.Map;

import mtgtable.eval.Position.Band;
import mtgtable.eval.Position.CardPos;
import mtgtable.eval.Position.PlayerPos;
import mtgtable.eval.Position.StackItem;

/**
 * A protocol {@code state} body (parsed by {@code mtgtable.Json}: objects as
 * {@code Map}, arrays as {@code Object[]}, integers as {@code Long}) -> a
 * {@link Position} for one viewing seat -- the log path, used by the parity
 * tests and by anything that reads recordings.
 *
 * <p>It is stricter than the log, as encode.py is (D305): the opponent's hand
 * contributes its {@code count} and never a card, even one the log carries face
 * up; both libraries are counts; a stub is {@code hidden}; no engine string but
 * a card's {@code name}, {@code types} and {@code manaCost} is read, and a
 * face-down card's {@code alt} never is.
 */
public final class JsonPosition {

    private JsonPosition() { }

    public static Position of(final Map<?, ?> st, final int seat) {
        final Position pos = new Position();
        pos.turn = intOr0(st.get("turn"));
        pos.round = intOr0(st.get("round"));
        pos.activePlayer = intOrNull(st.get("activePlayer"));
        pos.priority = intOrNull(st.get("priority"));
        pos.phase = st.get("phase") instanceof String s ? s : null;
        pos.gameOver = st.get("gameOver") != null;
        for (final Object po : arr(st.get("players"))) {
            final Map<?, ?> p = map(po);
            final PlayerPos pp = new PlayerPos();
            pp.id = intOr0(p.get("id"));
            pp.life = intOr0(p.get("life"));
            pp.poison = intOr0(p.get("poison"));
            int other = 0;
            for (final Object c : map(p.get("counters")).values()) {
                other += intOr0(c);
            }
            pp.otherCounters = other;
            final Map<?, ?> pool = map(p.get("manaPool"));
            for (int c = 0; c < 6; c++) {
                pp.pool[c] = intOr0(pool.get(FeatureSchema.COLOURS[c]));
            }
            final Map<?, ?> z = map(p.get("zones"));
            pp.handCount = intOr0(map(z.get("hand")).get("count"));
            pp.libraryCount = intOr0(map(z.get("library")).get("count"));
            pp.graveyardCount = intOr0(map(z.get("graveyard")).get("count"));
            pp.exileCount = intOr0(map(z.get("exile")).get("count"));
            pp.commandCount = intOr0(map(z.get("command")).get("count"));
            if (pp.id == seat) {   // the opponent's hand: its count, and nothing else
                for (final Object c : arr(map(z.get("hand")).get("cards"))) {
                    pp.hand.add(card(map(c)));
                }
            }
            for (final Object c : arr(map(z.get("battlefield")).get("cards"))) {
                pp.battlefield.add(card(map(c)));
            }
            for (final Object c : arr(map(z.get("graveyard")).get("cards"))) {
                pp.graveyard.add(card(map(c)));
            }
            for (final Object c : arr(map(z.get("exile")).get("cards"))) {
                pp.exile.add(card(map(c)));
            }
            pos.players.add(pp);
        }
        for (final Object io : arr(st.get("stack"))) {
            final Map<?, ?> it = map(io);
            pos.stack.add(new StackItem(intOrNull(it.get("controller")), truthy(it.get("isAbility"))));
        }
        for (final Object c : arr(st.get("stackCards"))) {
            pos.stackCards.add(card(map(c)));
        }
        final Object combat = st.get("combat");
        if (combat != null) {
            pos.combat = new java.util.ArrayList<>();
            for (final Object bo : arr(map(combat).get("bands"))) {
                final Map<?, ?> b = map(bo);
                final Band band = new Band();
                for (final Object a : arr(b.get("attackerIds"))) {
                    band.attackerIds.add(intOrNull(a));
                }
                for (final Object x : arr(b.get("blockerIds"))) {
                    band.blockerIds.add(intOrNull(x));
                }
                pos.combat.add(band);
            }
        }
        return pos;
    }

    static CardPos card(final Map<?, ?> c) {
        final CardPos cp = new CardPos();
        cp.id = intOr0(c.get("id"));
        cp.controller = intOrNull(c.get("controller"));
        if (truthy(c.get("hidden"))) {
            cp.hidden = true;
            return cp;
        }
        cp.name = c.get("name") instanceof String s ? s : "";
        cp.types = c.get("types") instanceof String s ? s : "";
        cp.manaCost = c.get("manaCost") instanceof String s ? s : null;
        cp.power = str(c.get("power"));
        cp.toughness = str(c.get("toughness"));
        cp.loyalty = str(c.get("loyalty"));
        for (final Object k : arr(c.get("keywords"))) {
            if (k instanceof String s) {
                cp.keywords.add(s);
            }
        }
        cp.damage = intOr0(c.get("damage"));
        for (final Map.Entry<?, ?> e : map(c.get("counters")).entrySet()) {
            cp.counters.put(String.valueOf(e.getKey()), intOr0(e.getValue()));
        }
        cp.tapped = truthy(c.get("tapped"));
        cp.sick = truthy(c.get("sick"));
        cp.attacking = truthy(c.get("attacking"));
        cp.blocking = truthy(c.get("blocking"));
        cp.faceDown = truthy(c.get("faceDown"));
        cp.token = truthy(c.get("token"));
        cp.attached = c.get("attachedToId") != null;
        return cp;
    }

    // ------------------------------------------------------------ JSON helpers

    static Map<?, ?> map(final Object o) {
        return o instanceof Map<?, ?> m ? m : Collections.emptyMap();
    }

    static Object[] arr(final Object o) {
        if (o instanceof Object[] a) {
            return a;
        }
        if (o instanceof java.util.Collection<?> c) {
            return c.toArray();
        }
        return new Object[0];
    }

    static Integer intOrNull(final Object o) {
        return o instanceof Number n ? Integer.valueOf(n.intValue()) : null;
    }

    static int intOr0(final Object o) {
        return o instanceof Number n ? n.intValue() : 0;
    }

    static boolean truthy(final Object o) {
        if (o instanceof Boolean b) {
            return b;
        }
        if (o instanceof Number n) {
            return n.doubleValue() != 0;
        }
        if (o instanceof String s) {
            return !s.isEmpty();
        }
        return o != null;
    }

    private static String str(final Object o) {
        if (o == null) {
            return null;
        }
        if (o instanceof Number n && n.doubleValue() == Math.rint(n.doubleValue())) {
            return Long.toString(n.longValue());
        }
        return String.valueOf(o);
    }
}
