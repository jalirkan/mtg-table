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

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import forge.game.Game;
import forge.game.player.Player;
import forge.game.spellability.SpellAbility;

/**
 * What each player did this turn and this game -- encode.py's {@code TurnTally}.
 *
 * <p>Two ways to fill it.  {@link #apply} reads a recorded frame's
 * {@code events} exactly as encode.py does (the log path, for parity).
 * {@link #fromGame} reads a live Forge game's own counters: lands played this
 * turn and spells cast this turn, which a game copy carries too.  The other
 * four counters (abilities this turn, this game's spells and lands, mulligans)
 * have no Forge counter that means the same thing, so a live tally leaves them
 * at zero -- and the trained model does not read them (evalnet.py's
 * LIVE_UNSAFE, D316).
 */
public final class Tally {

    final Map<Integer, Integer> landsTurn = new HashMap<>();
    final Map<Integer, Integer> spellsTurn = new HashMap<>();
    final Map<Integer, Integer> abilitiesTurn = new HashMap<>();
    final Map<Integer, Integer> landsGame = new HashMap<>();
    final Map<Integer, Integer> spellsGame = new HashMap<>();
    final Map<Integer, Integer> mulligans = new HashMap<>();

    static int get(final Map<Integer, Integer> m, final Integer pid) {
        final Integer v = m.get(pid);
        return v == null ? 0 : v;
    }

    private static void inc(final Map<Integer, Integer> m, final Integer pid) {
        m.merge(pid, 1, Integer::sum);
    }

    /**
     * One state frame's {@code events} (and its {@code stack}), in order: a
     * {@code cast} is a spell when its card moved to the stack in the same batch
     * or the state's own stack item says it is no ability.
     */
    public void apply(final Object[] events, final Object[] stack) {
        if (events == null) {
            return;
        }
        final Set<Object> toStack = new HashSet<>();
        for (final Object o : events) {
            final Map<?, ?> e = JsonPosition.map(o);
            if ("zone".equals(e.get("kind"))) {
                final Map<?, ?> to = JsonPosition.map(e.get("to"));
                if ("stack".equals(to.get("zone"))) {
                    toStack.add(JsonPosition.intOrNull(e.get("cardId")));
                }
            }
        }
        final Set<Object> spellItems = new HashSet<>();
        if (stack != null) {
            for (final Object o : stack) {
                final Map<?, ?> it = JsonPosition.map(o);
                if (Boolean.FALSE.equals(it.get("isAbility"))) {
                    spellItems.add(JsonPosition.intOrNull(it.get("id")));
                }
            }
        }
        for (final Object o : events) {
            final Map<?, ?> e = JsonPosition.map(o);
            final Object k = e.get("kind");
            if ("turn".equals(k)) {
                landsTurn.clear();
                spellsTurn.clear();
                abilitiesTurn.clear();
            } else if ("land".equals(k)) {
                final Integer p = JsonPosition.intOrNull(e.get("player"));
                inc(landsTurn, p);
                inc(landsGame, p);
            } else if ("cast".equals(k)) {
                final Integer p = JsonPosition.intOrNull(e.get("controller"));
                if (toStack.contains(JsonPosition.intOrNull(e.get("cardId")))
                        || spellItems.contains(JsonPosition.intOrNull(e.get("stackId")))) {
                    inc(spellsTurn, p);
                    inc(spellsGame, p);
                } else {
                    inc(abilitiesTurn, p);
                }
            } else if ("mulligan".equals(k)) {
                inc(mulligans, JsonPosition.intOrNull(e.get("player")));
            }
        }
    }

    /**
     * A live game's tally from Forge's own per-turn counters.  Lands played and
     * spells cast this turn only; see the class javadoc for the rest.
     */
    public static Tally fromGame(final Game game) {
        final Tally t = new Tally();
        for (final Player p : game.getPlayers()) {
            final int n = p.getLandsPlayedThisTurn();
            if (n > 0) {
                t.landsTurn.put(p.getId(), n);
            }
        }
        for (final SpellAbility sa : game.getStack().getSpellsCastThisTurn()) {
            final Player p = sa.getActivatingPlayer();
            if (p != null) {
                inc(t.spellsTurn, p.getId());
            }
        }
        return t;
    }
}
