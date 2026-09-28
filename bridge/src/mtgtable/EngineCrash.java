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

import java.util.function.Consumer;

/**
 * <b>An exception that escapes Forge's game loop is a failed run</b> -- decision
 * <b>D115</b>.
 *
 * <p>{@code HostedMatch} runs the game on Forge's own {@code Game} pool
 * ({@code ThreadUtil.invokeInGameThread}, i.e. {@code ExecutorService.execute}),
 * and nothing in Forge catches what the game runnable throws: the pool thread
 * dies and prints a trace, and that is all.  Measured with a card script whose
 * {@code ApiType} the 2.0.14 jar lacks ({@code Element Empower not found in
 * ApiType enum}, thrown from {@code Match.prepareAllZones} before turn 1):
 * {@code MtgTable} sat with no frame for 60 s until {@code AutoTransport}'s
 * stuck watchdog conceded, the pre-start concede ended the session through
 * amendment M11's exception path, and the run printed {@code MTGTABLE OK} and
 * exited <b>0</b> with {@code player turns = 0} -- a crash that looked like a
 * clean run (the engine-upgrade lane's note, reproduced by
 * {@code tools/check-engine-crash.sh}).  Over a socket or the console there is
 * no watchdog at all, and the same crash was a session that never ended.
 *
 * <p>So {@link MtgTable} installs {@link #install} before the match starts, and
 * a game-loop death reaches {@link WireGuiGame#engineCrashed} at once: an error
 * {@code notice} and {@code over} close the frame log, and the process exits
 * non-zero with the cause on stderr.  {@code RecordMatch} runs the game
 * runnable itself and already catches it; it closes its log the same way.
 *
 * <p>Pure JDK: it names no Forge type, walks no view, and starts no thread.
 */
final class EngineCrash {

    private EngineCrash() { }

    /**
     * True iff {@code t} escaped Forge's GAME LOOP: a frame of
     * {@code forge.game.Match.startGame} is on its stack.  That method runs zone
     * preparation, the whole game and its tail, so every death of the game
     * runnable carries it -- and nothing else on a {@code Game-n} thread does
     * (our own hops, {@code captureOutcome} and the rest, catch their own).  A
     * class and a method name, not a message: the check survives a
     * translation and an engine upgrade that rewords its exceptions.
     */
    static boolean isGameLoop(final Throwable t) {
        for (Throwable c = t; c != null; c = c.getCause() == c ? null : c.getCause()) {
            for (final StackTraceElement e : c.getStackTrace()) {
                if ("forge.game.Match".equals(e.getClassName()) && "startGame".equals(e.getMethodName())) {
                    return true;
                }
            }
        }
        return false;
    }

    /** The cause chain on one line, outermost first: what a person reads to find the card. */
    static String describe(final Throwable t) {
        final StringBuilder sb = new StringBuilder();
        int depth = 0;
        for (Throwable c = t; c != null && depth < 8; c = c.getCause() == c ? null : c.getCause(), depth++) {
            if (sb.length() > 0) {
                sb.append(" <- ");
            }
            sb.append(c);
        }
        return sb.toString();
    }

    /**
     * Become the JVM's default uncaught-exception handler.  Every uncaught
     * throwable is still printed exactly as before (by the handler that was
     * installed, or the JDK's own words when none was) and FIRST, so the trace
     * is on stderr before the session can end; a death on a {@code Game-n}
     * thread that {@link #isGameLoop} then goes to {@code onGameLoopCrash}.
     * Anything else that dies is printed and left alone, with one line saying
     * it was not the game loop.
     */
    static void install(final Consumer<Throwable> onGameLoopCrash) {
        final Thread.UncaughtExceptionHandler previous = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((thread, e) -> {
            try {
                if (previous != null) {
                    previous.uncaughtException(thread, e);
                } else {
                    System.err.print("Exception in thread \"" + thread.getName() + "\" ");
                    e.printStackTrace();
                }
            } catch (final RuntimeException ignored) {
                // A handler that throws must not stop the crash from being reported.
            }
            final boolean gameThread = thread.getName().startsWith("Game");
            if (gameThread && isGameLoop(e)) {
                System.err.println("ENGINE CRASHED on " + thread.getName() + ": " + describe(e));
                System.err.flush();
                onGameLoopCrash.accept(e);
            } else {
                System.err.println("THREAD DIED (not the game loop) " + thread.getName() + ": " + e);
            }
        });
    }
}
