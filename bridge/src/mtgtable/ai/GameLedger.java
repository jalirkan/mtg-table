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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.google.common.eventbus.Subscribe;

import org.apache.commons.lang3.tuple.Pair;

import forge.game.Game;
import forge.game.GameEntity;
import forge.game.card.Card;
import forge.game.event.GameEventGameOutcome;
import forge.game.event.GameEventTurnPhase;
import forge.game.player.Player;
import forge.game.spellability.SpellAbility;
import forge.game.zone.ZoneType;

import mtgtable.Json.JsonOut;

/**
 * The per-turn ledger of a game (D450): for every turn, for each seat, what
 * anyone at the table could write down -- life, cards in hand and in library
 * (counts), lands / creatures / other permanents it controls, the spells it
 * cast and the lands it played that turn, the mana it spent on them, and the
 * damage its sources dealt.  Public information only: no card is named, no
 * hidden zone is read past its size.
 *
 * <p>How it is read.  It is a subscriber on the game's event bus; at every
 * phase change ({@code GameEventTurnPhase}) and at the outcome it reads the
 * engine's own counters from the {@code Game} objects (never a view: it names
 * no card view and walks no view graph) and overwrites the current turn's
 * entry, so a turn's entry is what was true at its last phase -- the cleanup
 * step, or the moment the game ended.  The counters:
 * <ul>
 *   <li>spells: the stack's {@code getSpellsCastThisTurn()} whose activating
 *       player is the seat; lands: {@code Player.getLandsPlayedThisTurn()};</li>
 *   <li>mana: {@code getTotalManaSpent()} summed over those spells and the
 *       non-mana abilities the seat activated this turn (the stack's
 *       {@code getAbilityActivatedThisTurn()});</li>
 *   <li>damage: every damage instance an entity received this turn
 *       ({@code GameEntity.getDamageReceivedThisTurn()}, players and the cards
 *       on the battlefield and in graveyards), attributed to its source's
 *       controller through Forge's own {@code Game.getDamageLKI} -- Forge keys
 *       that table by (amount, combat), so two equal instances in one turn are
 *       attributed as Forge attributes them, and damage to a card that left for
 *       a zone other than the graveyard is not seen.  {@code damage} is to
 *       anything, {@code damageToPlayers} to players.</li>
 * </ul>
 *
 * <p>Threads: the handlers run on the game thread, inside {@code Game.fireEvent}.
 */
public final class GameLedger {

    /** One seat in one turn. */
    static final class Entry {
        int life;
        int hand;
        int library;
        int lands;
        int creatures;
        int other;
        int spells;
        int landsPlayed;
        int mana;
        int damage;
        int damageToPlayers;
    }

    /** The game read, until {@link #detach}: null after it. */
    private Game game;
    private final List<Player> seats = new ArrayList<>();
    /** The number of seats, which outlives {@link #detach}. */
    private int seatCount;
    /** turn number -> [active seat index, entries per seat]. */
    private final Map<Integer, Object[]> turns = new LinkedHashMap<>();
    private int errors;

    /** Subscribe a ledger to {@code game} (before it starts); seats in the game's player order. */
    public static GameLedger attach(final Game game) {
        final GameLedger l = new GameLedger(game);
        game.subscribeToEvents(l);
        return l;
    }

    private GameLedger(final Game game) {
        this.game = game;
        seats.addAll(game.getPlayers());
        seatCount = seats.size();
    }

    /**
     * Let go of the game and its players, keeping the turns read so far
     * (D465).  A ledger lives on after its game -- the move atlas holds every
     * branch's ledger until its unit ends -- and until this was called each
     * held the whole played-out copy it was attached to: J151's workers held
     * one copy per branch and ran out of a 2 GB heap about 70 branches into a
     * unit.  After it {@link #snapshot} reads nothing; {@link #write} is
     * unchanged.  Game thread, after the game's last event.
     */
    public void detach() {
        game = null;
        seats.clear();
    }

    /** Whether {@link #detach} has let go of the game (the self-test). */
    public boolean detached() {
        return game == null;
    }

    @Subscribe
    public void phase(final GameEventTurnPhase e) {
        snapshot();
    }

    @Subscribe
    public void outcome(final GameEventGameOutcome e) {
        snapshot();
    }

    /** Read the current turn's entry now (the copies of the move atlas call it at their end). */
    public void snapshot() {
        if (game == null) {
            return;
        }
        try {
            final int turn = game.getPhaseHandler().getTurn();
            if (turn <= 0) {
                return;
            }
            final Player active = game.getPhaseHandler().getPlayerTurn();
            final Entry[] es = new Entry[seats.size()];
            for (int i = 0; i < seats.size(); i++) {
                es[i] = entry(seats.get(i));
            }
            damage(es);
            turns.put(turn, new Object[] {seats.indexOf(active), es});
        } catch (final RuntimeException ex) {
            errors++;
        }
    }

    private Entry entry(final Player p) {
        final Entry e = new Entry();
        e.life = p.getLife();
        e.hand = p.getZone(ZoneType.Hand).size();
        e.library = p.getZone(ZoneType.Library).size();
        for (final Card c : p.getCardsIn(ZoneType.Battlefield)) {
            if (c.isLand()) {
                e.lands++;
            } else if (c.isCreature()) {
                e.creatures++;
            } else {
                e.other++;
            }
        }
        e.landsPlayed = p.getLandsPlayedThisTurn();
        for (final SpellAbility sa : game.getStack().getSpellsCastThisTurn()) {
            if (sa.getActivatingPlayer() == p) {
                e.spells++;
                e.mana += Math.max(0, sa.getTotalManaSpent());
            }
        }
        for (final SpellAbility sa : game.getStack().getAbilityActivatedThisTurn()) {
            if (sa.getActivatingPlayer() == p && !sa.isManaAbility()) {
                e.mana += Math.max(0, sa.getTotalManaSpent());
            }
        }
        return e;
    }

    private void damage(final Entry[] es) {
        final List<GameEntity> hit = new ArrayList<>(game.getPlayers());
        hit.addAll(game.getCardsIn(ZoneType.Battlefield));
        hit.addAll(game.getCardsIn(ZoneType.Graveyard));
        for (final GameEntity t : hit) {
            for (final Pair<Integer, Boolean> d : t.getDamageReceivedThisTurn()) {
                final Pair<Card, GameEntity> lki = game.getDamageLKI(d);
                if (lki == null || lki.getLeft() == null) {
                    continue;
                }
                final int k = seats.indexOf(lki.getLeft().getController());
                if (k < 0) {
                    continue;
                }
                es[k].damage += d.getLeft();
                if (t instanceof Player) {
                    es[k].damageToPlayers += d.getLeft();
                }
            }
        }
    }

    /** Turns recorded. */
    public int turns() {
        return turns.size();
    }

    /**
     * The ledger as JSON: {@code {"v":1,"seats":2,"errors":0,"turns":[{"t":1,"active":0,
     * "s":[[life,hand,library,lands,creatures,other,spells,landsPlayed,mana,damage,damageToPlayers],[...]]}]}}
     * -- each seat's numbers in {@link #FIELDS} order, seats in the game's player order.
     */
    public void write(final JsonOut j) {
        j.obj().n("v", 1L).n("seats", (long) seatCount).n("errors", (long) errors);
        j.key("fields").arr();
        for (final String f : FIELDS) {
            j.v(f);
        }
        j.end();
        j.key("turns").arr();
        for (final Map.Entry<Integer, Object[]> t : turns.entrySet()) {
            j.obj().n("t", (long) t.getKey()).n("active", (long) (Integer) t.getValue()[0]);
            j.key("s").arr();
            for (final Entry e : (Entry[]) t.getValue()[1]) {
                j.arr().v((long) e.life).v((long) e.hand).v((long) e.library).v((long) e.lands).v((long) e.creatures)
                        .v((long) e.other).v((long) e.spells).v((long) e.landsPlayed).v((long) e.mana)
                        .v((long) e.damage).v((long) e.damageToPlayers).end();
            }
            j.end().end();
        }
        j.end().end();
    }

    /** The order of each seat's numbers in a turn. */
    public static final String[] FIELDS = {"life", "hand", "library", "lands", "creatures", "other", "spells",
        "landsPlayed", "mana", "damage", "damageToPlayers"};
}
