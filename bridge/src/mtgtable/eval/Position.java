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

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * One position as ONE player sees it: the subset of a protocol {@code state}
 * body (docs/protocol.md section 3) that {@code tools/ml/encode.py} reads, and
 * nothing more.  Two builders fill it -- {@link JsonPosition} from a recorded
 * frame, {@link GamePosition} from a live Forge {@code Game} -- and one encoder
 * reads it ({@link FeatureEncoder}), so the two sources cannot disagree about
 * what a feature means, only about what the board is, and {@code EvalLiveCheck}
 * measures that.
 *
 * <p>What is NOT here is the point (hard rule 8, D305): the opponent's hand is a
 * count with no cards, both libraries are counts, a concealed card is
 * {@code hidden} with no face, and a face-down card's face is never carried.
 */
public final class Position {

    public int turn;
    public int round;
    public Integer activePlayer;
    public Integer priority;
    /** Forge's phase name ({@code MAIN1}, ...), or null. */
    public String phase;
    public boolean gameOver;
    public final List<PlayerPos> players = new ArrayList<>(2);
    public final List<StackItem> stack = new ArrayList<>();
    /** The distinct source cards of the stack items (protocol {@code stackCards}). */
    public final List<CardPos> stackCards = new ArrayList<>();
    /** Null when there is no combat; otherwise its bands (possibly none). */
    public List<Band> combat;

    /** One player: public numbers, and the cards of the zones the encoder walks. */
    public static final class PlayerPos {
        public int id;
        public int life;
        public int poison;
        /** Every other player counter (energy, experience, ...), summed. */
        public int otherCounters;
        public int handCount;
        public int libraryCount;
        public int graveyardCount;
        public int exileCount;
        public int commandCount;
        /** Floating mana W, U, B, R, G, C. */
        public final int[] pool = new int[6];
        /** The viewer's own hand only; empty for every other player. */
        public final List<CardPos> hand = new ArrayList<>();
        public final List<CardPos> battlefield = new ArrayList<>();
        public final List<CardPos> graveyard = new ArrayList<>();
        public final List<CardPos> exile = new ArrayList<>();
    }

    /** A card with its public face, or a concealed one ({@code hidden}: nothing else is read). */
    public static final class CardPos {
        public int id;
        public boolean hidden;
        public String name = "";
        /** Forge's type line, "Legendary Creature - Human Wizard"; "" when not public. */
        public String types = "";
        /** e.g. "{2}{W}"; null for no cost (lands, tokens, face-down). */
        public String manaCost;
        /** As the wire spells them: strings, null when absent. */
        public String power;
        public String toughness;
        public String loyalty;
        public final List<String> keywords = new ArrayList<>(2);
        public int damage;
        /** Counter display name ("+1/+1", "-1/-1", "Loyalty", ...) to count. */
        public final Map<String, Integer> counters = new LinkedHashMap<>();
        public boolean tapped;
        public boolean sick;
        public boolean attacking;
        public boolean blocking;
        public boolean faceDown;
        public boolean token;
        public boolean attached;
        public Integer controller;
    }

    public static final class StackItem {
        public Integer controller;
        public boolean isAbility;

        public StackItem(final Integer controller, final boolean isAbility) {
            this.controller = controller;
            this.isAbility = isAbility;
        }
    }

    public static final class Band {
        public final List<Integer> attackerIds = new ArrayList<>();
        public final List<Integer> blockerIds = new ArrayList<>();
    }
}
