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
 * Where a {@link PolicyControllerAi} sends its decisions (D347): the recorder of
 * THAT seat's own view, {@code mtgtable.SeatRecorder}, and nothing else -- a
 * seat's decisions and its legal options are its private information (they
 * name its hand), so no other seat's recording may hold them.  Every call is on
 * the game thread, inside the controller's callback.
 */
public interface DecisionSink {

    /**
     * Make the seat's log current -- flush the events the recorder holds, so
     * its latest {@code state} frame is the position the decision is taken in
     * -- and return {@code {frame index, state seq}} of that frame, or
     * {@code {-1, -1}} when the log has none yet.
     */
    int[] mark();

    /** Write one decision taken at {@code mark}; returns its {@code n} (0, 1, ... per seat and game). */
    int write(Decision d, int[] mark);

    /** A decision with one legal answer (a forced pass): counted, not written. */
    void forced(String kind);

    /** Time spent building records (enumerating options), for the summary's {@code buildMs}. */
    void cost(long nanos);

    /** Building a record threw (the game goes on; the count is reported). */
    void error(String where, RuntimeException e);
}
