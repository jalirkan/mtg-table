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
package mtgtable;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Predicate;

import forge.game.GameEntity;
import forge.game.GameObject;
import forge.game.card.Card;
import forge.game.combat.Combat;
import forge.game.player.Player;
import forge.game.spellability.SpellAbility;
import forge.gamemodes.match.input.Input;
import forge.gamemodes.match.input.InputAttack;
import forge.gamemodes.match.input.InputBase;
import forge.gamemodes.match.input.InputBlock;
import forge.gamemodes.match.input.InputChooseStartingHand;
import forge.gamemodes.match.input.InputConfirm;
import forge.gamemodes.match.input.InputConfirmMulligan;
import forge.gamemodes.match.input.InputLondonMulligan;
import forge.gamemodes.match.input.InputPassPriority;
import forge.gamemodes.match.input.InputSelectEntitiesFromList;
import forge.gamemodes.match.input.InputSelectManyBase;
import forge.gamemodes.match.input.InputSelectTargets;

/**
 * <b>Amendments M65 and M66, decisions D422 and D423: what the seat has already
 * chosen in the input that is up, and which players a click would be taken
 * for.</b>  Read off Forge's own input object, never worked out from the
 * prompt: {@code input.selectable.chosen} and {@code input.selectable.playerIds}.
 *
 * <p>Forge keeps a selection inside the input until it ends.  A target chosen
 * by {@code InputSelectTargets}, a card ticked in {@code InputSelectEntitiesFromList},
 * a blocker or an attacker declared in {@code InputBlock} / {@code InputAttack}
 * -- none of them is in the {@code state} until the input stops, because the
 * clicks run on the EDT and the snapshot is taken on the game thread when it
 * moves again (the LLM seat found the blocks the hard way, D418's follow-up and
 * PR #130).  This class reads the selection where Forge keeps it:
 *
 * <ul>
 *   <li>{@code InputSelectManyBase.getSelected()} and
 *       {@code InputSelectEntitiesFromList.getValidChoices()} -- public;</li>
 *   <li>the game's own {@link Combat} for a block or an attack declaration --
 *       public ({@code InputBlock} and {@code InputAttack} write the
 *       declaration straight into it);</li>
 *   <li>{@code InputSelectTargets}' private {@code targets}, {@code sa},
 *       {@code filter} and {@code mustTargetFiltered} -- <b>reflection, the
 *       only place the bridge reads a Forge field by name</b> (lint rule
 *       {@code forge-field-read}, D423): the class has no getter for any of
 *       them in the pinned 2.0.14 jar (javap), and its player rule is
 *       {@code onPlayerSelected}'s, which needs the ability.  The fields are
 *       looked up once; on an engine where one is missing the facts for this
 *       class are {@code null} -- "the bridge cannot say", which is what an
 *       absent field already means on the wire -- and one line says so.</li>
 * </ul>
 *
 * <p><b>Threads.</b>  Called from {@code WireGuiGame.engineInput}, i.e. on the
 * thread Forge pushed the prompt from: the EDT for a click's re-prompt (the
 * thread that just changed the selection, so the read is the click's own view
 * of it) or the game thread.  An input that is on the seat's queue means the
 * game thread is parked in it ({@code WireGuiGame.enginePausedForSeat}), so the
 * game model under these reads is not moving.  Only game MODEL objects are read
 * ({@link Card}, {@link Player}, {@link Combat}, {@link SpellAbility}) -- never a
 * view, so hard rule 3's Tracker is not touched -- and only ids leave this class.
 *
 * <p><b>Hidden information.</b>  Ids only, and every id here is one the seat can
 * already see: a chosen card was offered to it in {@code selectable.cardIds}
 * (targets, a list) or is a creature on the battlefield (a declaration); a
 * player id is public.  {@code tools/check-redaction.mjs} holds both.
 */
final class InputPeek {

    private InputPeek() { }

    /** A blocker the seat has declared, and the attacker it blocks. */
    record Block(int blockerId, int attackerId) { }

    /** An attacker the seat has declared, and what it attacks: {@code "player"} or {@code "card"}. */
    record Attack(int attackerId, String defenderKind, int defenderId) { }

    /** {@code selectable.chosen}: always four lists, ids ascending; blocks / attacks empty outside those declarations. */
    record Chosen(List<Integer> cardIds, List<Integer> playerIds, List<Block> blocks, List<Attack> attacks) { }

    /**
     * What one input says.  {@code playerIds} or {@code chosen} null: the bridge
     * cannot say for this input.  {@code needsSelectables}: the facts hold only
     * while Forge's {@code setSelectables} for this input is still in force --
     * the targeting and list inputs call {@code clearSelectables} in their own
     * {@code onStop}, while the input is still on the queue, and from then on
     * the selection is over even though the object is still there to read.
     */
    record Facts(List<Integer> playerIds, Chosen chosen, boolean needsSelectables) {
        static final Facts NONE = new Facts(null, null, false);
    }

    private static final List<Integer> NO_IDS = List.of();

    // ---------------------------------------------------------------
    // InputSelectTargets' private state (D423)
    // ---------------------------------------------------------------

    private static final Field TARGETS = field("targets");
    private static final Field SA = field("sa");
    private static final Field FILTER = field("filter");
    private static final Field MUST_TARGET_FILTERED = field("mustTargetFiltered");

    private static Field field(final String name) {
        try {
            final Field f = InputSelectTargets.class.getDeclaredField(name);
            f.setAccessible(true);
            return f;
        } catch (final ReflectiveOperationException | RuntimeException e) {
            System.err.println("INPUT PEEK: InputSelectTargets." + name + " is not readable on this engine (" + e
                    + "); a targeting input's chosen / playerIds go out as null (D423)");
            return null;
        }
    }

    /** True when every field the targeting input needs was found (the self-test asserts it). */
    static boolean targetsReadable() {
        return TARGETS != null && SA != null && FILTER != null && MUST_TARGET_FILTERED != null;
    }

    // ---------------------------------------------------------------
    // The one entry point
    // ---------------------------------------------------------------

    /**
     * The facts for the seat's current input, or {@link Facts#NONE} when there
     * is none or it is one this class does not read.  {@code me} is the seat.
     */
    static Facts of(final Input in, final Player me) {
        if (in == null || me == null) {
            return Facts.NONE;
        }
        if (in instanceof InputSelectTargets t) {
            return targets(t);
        }
        if (in instanceof InputSelectManyBase<?> m) {
            final List<Integer> cards = new ArrayList<>();
            final List<Integer> players = new ArrayList<>();
            split(m.getSelected(), cards, players);
            final List<Integer> clickable;
            if (m instanceof InputSelectEntitiesFromList<?> l) {
                // onPlayerSelected -> selectEntity: a player in the valid choices
                // is ticked or unticked; any other player is refused.
                clickable = new ArrayList<>();
                split(l.getValidChoices(), new ArrayList<>(), clickable);
            } else {
                clickable = NO_IDS;               // convoke / improvise: InputBase's no-op
            }
            return new Facts(sorted(clickable), new Chosen(sorted(cards), sorted(players), List.of(), List.of()),
                    m instanceof InputSelectEntitiesFromList<?>);
        }
        if (in instanceof InputBlock b) {
            return new Facts(NO_IDS, blocks(combatOf(b), me), false);
        }
        if (in instanceof InputAttack a) {
            final Combat combat = combatOf(a);
            return new Facts(defenderPlayers(combat), attacks(combat, me), false);
        }
        if (in instanceof InputPassPriority || in instanceof InputConfirm || in instanceof InputConfirmMulligan
                || in instanceof InputChooseStartingHand || in instanceof InputLondonMulligan) {
            // These inherit InputBase.onPlayerSelected, an empty method (javap):
            // a player click does nothing, which is a fact and not an unknown.
            return new Facts(NO_IDS, null, false);
        }
        // InputPayMana and its subclasses (InputPayManaOfCostPayment takes a
        // click on yourself as Phyrexian life), and any class this list does not
        // know: the bridge cannot say.
        return Facts.NONE;
    }

    private static Combat combatOf(final InputBase in) {
        return in.getController().getGame().getCombat();
    }

    // ---------------------------------------------------------------
    // Targets
    // ---------------------------------------------------------------

    private static Facts targets(final InputSelectTargets t) {
        if (!targetsReadable()) {
            return Facts.NONE;
        }
        final Set<?> targets;
        final SpellAbility sa;
        final Predicate<GameObject> filter;
        final boolean mustTargetFiltered;
        try {
            targets = (Set<?>) TARGETS.get(t);
            sa = (SpellAbility) SA.get(t);
            @SuppressWarnings("unchecked")
            final Predicate<GameObject> f = (Predicate<GameObject>) FILTER.get(t);
            filter = f;
            mustTargetFiltered = MUST_TARGET_FILTERED.getBoolean(t);
        } catch (final ReflectiveOperationException | ClassCastException e) {
            return Facts.NONE;
        }
        if (targets == null || sa == null) {
            return Facts.NONE;
        }
        final List<Integer> cards = new ArrayList<>();
        final List<Integer> players = new ArrayList<>();
        split(new ArrayList<>(targets), cards, players);
        final List<Integer> clickable = targetablePlayers(sa, sa.getHostCard().getGame().getPlayers(),
                targets, filter, mustTargetFiltered);
        return new Facts(clickable, new Chosen(sorted(cards), sorted(players), List.of(), List.of()), true);
    }

    /**
     * The players a click in {@code InputSelectTargets} would be taken for:
     * {@code onPlayerSelected}'s rule, in its order (2.0.14 source, javap'd
     * against the jar).  A player already targeted is listed -- the click takes
     * it back -- and so is one the ability may target now: not out of the game,
     * attachable for an Aura spell, {@code sa.canTarget(player)}, not under a
     * must-target filter that already narrowed the choice to cards, and through
     * the caller's filter when there is one.  Public for the self-test.
     */
    static List<Integer> targetablePlayers(final SpellAbility sa, final Iterable<Player> players,
                                           final Collection<?> targets, final Predicate<GameObject> filter,
                                           final boolean mustTargetFiltered) {
        final List<Integer> out = new ArrayList<>();
        for (final Player p : players) {
            if (targets != null && targets.contains(p)) {
                out.add(Integer.valueOf(p.getId()));
                continue;
            }
            if (p.hasLost()) {
                continue;
            }
            if (sa.isSpell() && sa.getHostCard().isAura() && !p.canBeAttached(sa.getHostCard(), sa)) {
                continue;
            }
            if (!sa.canTarget(p) || mustTargetFiltered) {
                continue;
            }
            if (filter != null && !filter.test(p)) {
                continue;
            }
            out.add(Integer.valueOf(p.getId()));
        }
        return sorted(out);
    }

    // ---------------------------------------------------------------
    // Declarations
    // ---------------------------------------------------------------

    /**
     * The blocks declared so far: every blocker the defending seat controls,
     * with each attacker it blocks (one row per pair, so a creature that may
     * block two attackers is two rows).  Public for the self-test.
     */
    static Chosen blocks(final Combat combat, final Player defender) {
        final List<Block> rows = new ArrayList<>();
        final Set<Integer> blockers = new TreeSet<>();
        if (combat != null) {
            for (final Card attacker : combat.getAttackers()) {
                for (final Card blocker : combat.getBlockers(attacker)) {
                    if (blocker.getController() == defender) {
                        rows.add(new Block(blocker.getId(), attacker.getId()));
                        blockers.add(Integer.valueOf(blocker.getId()));
                    }
                }
            }
        }
        rows.sort((x, y) -> x.blockerId() != y.blockerId() ? Integer.compare(x.blockerId(), y.blockerId())
                : Integer.compare(x.attackerId(), y.attackerId()));
        return new Chosen(List.copyOf(blockers), NO_IDS, List.copyOf(rows), List.of());
    }

    /** The attackers the seat has declared so far, and what each attacks.  Public for the self-test. */
    static Chosen attacks(final Combat combat, final Player attacker) {
        final List<Attack> rows = new ArrayList<>();
        final Set<Integer> ids = new TreeSet<>();
        if (combat != null) {
            for (final Card c : combat.getAttackers()) {
                if (c.getController() != attacker) {
                    continue;
                }
                final GameEntity d = combat.getDefenderByAttacker(c);
                if (d instanceof Player p) {
                    rows.add(new Attack(c.getId(), "player", p.getId()));
                } else if (d instanceof Card pw) {
                    rows.add(new Attack(c.getId(), "card", pw.getId()));
                } else {
                    continue;
                }
                ids.add(Integer.valueOf(c.getId()));
            }
        }
        rows.sort((x, y) -> Integer.compare(x.attackerId(), y.attackerId()));
        return new Chosen(List.copyOf(ids), NO_IDS, List.of(), List.copyOf(rows));
    }

    /** {@code InputAttack.onPlayerSelected}: a defending player becomes the one the next attacker attacks. */
    static List<Integer> defenderPlayers(final Combat combat) {
        final List<Integer> out = new ArrayList<>();
        if (combat != null) {
            for (final GameEntity d : combat.getDefenders()) {
                if (d instanceof Player p) {
                    out.add(Integer.valueOf(p.getId()));
                }
            }
        }
        return sorted(out);
    }

    // ---------------------------------------------------------------

    private static void split(final Iterable<?> entities, final List<Integer> cards, final List<Integer> players) {
        if (entities == null) {
            return;
        }
        for (final Object e : entities) {
            if (e instanceof Card c) {
                cards.add(Integer.valueOf(c.getId()));
            } else if (e instanceof Player p) {
                players.add(Integer.valueOf(p.getId()));
            }
        }
    }

    private static List<Integer> sorted(final List<Integer> ids) {
        return List.copyOf(new TreeSet<>(ids));
    }
}
