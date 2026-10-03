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

/**
 * A cube-lab seat: {@code <Profile>[+outlets|+shadow][+search[:k=v,...]]} (D347;
 * ai-bench's seat config without Forge's simulation options, which D311 found
 * ends cube games).  The profile is an {@code .ai} file name, checked by
 * {@code Bootstrap.createAiSeat}; {@code +search} takes {@link SearchConfig}'s keys.
 */
public final class SeatSpec {

    public final String text;
    public final String profile;
    public final PolicyLobbyPlayerAi.Outlets outlets;
    public final SearchConfig search;

    private SeatSpec(final String text, final String profile, final PolicyLobbyPlayerAi.Outlets outlets,
                     final SearchConfig search) {
        this.text = text;
        this.profile = profile;
        this.outlets = outlets;
        this.search = search;
    }

    public static SeatSpec parse(final String text) {
        if (text == null || text.isEmpty()) {
            throw new IllegalArgumentException("an empty seat spec");
        }
        final String[] parts = text.split("\\+");
        PolicyLobbyPlayerAi.Outlets o = PolicyLobbyPlayerAi.Outlets.OFF;
        SearchConfig sc = null;
        for (int i = 1; i < parts.length; i++) {
            final String p = parts[i];
            if (p.equals("search") || p.startsWith("search:")) {
                sc = SearchConfig.parse(p.length() > 7 ? p.substring(7) : "");
            } else if (p.equals("outlets")) {
                o = PolicyLobbyPlayerAi.Outlets.ON;
            } else if (p.equals("shadow")) {
                o = PolicyLobbyPlayerAi.Outlets.SHADOW;
            } else {
                throw new IllegalArgumentException("unknown seat option +" + p + " in " + text
                        + " (want +outlets, +shadow or +search[:k=v,...])");
            }
        }
        return new SeatSpec(text, parts[0], o, sc);
    }

    /** Plain Forge: no policy of ours acts (the seat may still be ours, to record decisions). */
    public boolean plain() {
        return search == null && outlets == PolicyLobbyPlayerAi.Outlets.OFF;
    }

    /** forge | outlets | search: whose answers the seat plays, for the recording's header. */
    public String policy() {
        return search != null ? "search" : outlets == PolicyLobbyPlayerAi.Outlets.ON ? "outlets" : "forge";
    }

    /** The search's knobs, or null. */
    public String searchText() {
        return search == null ? null : search.toString();
    }
}
