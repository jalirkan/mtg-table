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

import java.util.Map;

/**
 * The de-risking transport: frames are rendered nowhere and <b>every ask is
 * answered {@code null} immediately</b>, so every value-returning member of
 * {@link WireGuiGame} returns the documented default of
 * {@code docs/protocol.md} section 5.4 and the game plays itself out on those
 * alone.  That is what proves no member throws and no thread wedges -- the real
 * point of report 07's compile-order step 3.
 *
 * <h2>Why it still presses buttons</h2>
 *
 * Report 07's checklist says "all asks -> null -> defaults" and expects a
 * finished game.  Measured, that is not enough, and the reason is the same
 * finding the whole milestone turns on (section 0.8): <b>with
 * {@code isLibgdxPort() == false} a human seat is driven by the INPUT path, not
 * by asks.</b>  The very first decision of the very first game -- "you have won
 * the coin toss, play or draw?" -- arrives as an {@code InputConfirm}: a prompt
 * and two buttons labelled {@code Play} and {@code Draw}, with no
 * {@code IGuiGame.confirm} anywhere in it.  A transport that answers only asks
 * parks there forever, having proved nothing.
 *
 * <p>So this class inherits {@link AutoTransport}'s input policy -- press the
 * enabled button, click the first selectable card when the engine demands a
 * click -- and overrides only the <em>answer</em> half.  The distinction that
 * remains is the one worth testing:
 *
 * <ul>
 *   <li><b>null</b>: every ask resolves to {@code null}, i.e. Forge's own
 *       documented default.</li>
 *   <li><b>auto</b>: every ask is answered with a real, minimal, legal
 *       value.</li>
 * </ul>
 *
 * <h2>A null answer is an answer, and it is written down</h2>
 *
 * <p>This class used to complete the future directly inside {@link #ask},
 * bypassing {@code Inbound.onAnswer} -- so its log held N asks and <b>zero</b>
 * {@code answer} frames, and {@code tools/check-redaction.mjs} reported
 * "answers=0, unanswered asks=8" with a warning per ask reading "either a
 * truncated recording or a wedge".  A null-transport log was, on disk,
 * indistinguishable from a wedged session, which contradicts protocol section
 * 8.3 ("it is the same stream the client consumed") and would have made a real
 * wedge unnoticeable.
 *
 * <p>So the null answer now travels the ordinary inbound path from the io
 * thread -- {@code {"askId":…,"value":null}}, exactly what a browser sending an
 * explicit null would produce.  That is also the point of the transport: it
 * exercises the same code a WebSocket client will.
 */
public final class NullTransport extends AutoTransport {

    /**
     * The one override that matters: the answer is always the literal
     * {@code null}, delivered through {@code Inbound.onAnswer} on the io thread
     * like any other.  {@link AutoTransport#ask} pushes and parks; the worker
     * sees the {@code ask} frame and answers it here.
     */
    @Override
    protected void onAsk(final Map<String, Object> body) {
        answer(String.valueOf(body.get("askId")), null);
    }
}
